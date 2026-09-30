// R6 PG-06 (dnd5e Compendium Browser locked to the choice, Roll20 inline custom content)
// and BI-22 (Roll20 Charactermancer custom subclass): a class, species or background
// variant made from the builder comes back selected; a homebrew subclass of an SRD class
// joins the subclass choice at level 3 and its advancement is applied on level up.
// Synthetic demo data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import {
  createHomebrewDraft,
  saveHomebrewDraft,
  previewHomebrewDraft,
  applyHomebrewDraft,
} from "../homebrew.mjs";
import {
  createCharacterDraft,
  saveCharacterDraft,
  previewCharacterDraft,
  applyCharacterDraft,
  getDraftCatalog,
  getCharacterDraft,
} from "../character-build.mjs";
import { addHomebrewToCharacterDraft, parseLibraryReturn } from "../homebrew-integration.mjs";
import * as D from "../homebrew-editor-domain.mjs";
import * as UI from "../homebrew-editor.mjs";
import { createVariant, resetCharacterBuilderView } from "../character-builder.mjs";
import { harness } from "./p8-harness.mjs";

afterEach(() => resetCharacterBuilderView());

// Saves a structured homebrew content (optionally with a builder return) and applies it.
function publish(state, { id, type, template = "scratch", edit = () => {}, returnTo = null }) {
  const d = createHomebrewDraft(state, { id, type, returnTo }, "player");
  const data = D.buildFromTemplate(type, template, "it");
  data.source.label = data.source.label || "Original synthetic homebrew";
  // Templates leave the granted features for the author to name.
  data.structured.advancement.forEach((a, i) =>
    (a.features ?? []).forEach((f, j) => {
      if (!f.name.it && !f.name.en)
        f.name = { it: `Privilegio ${i}.${j}`, en: `Feature ${i}.${j}` };
    }),
  );
  edit(data);
  assert.deepEqual(D.validateStructured(type, data.structured), []);
  saveHomebrewDraft(state, d.id, { expectedRevision: d.revision, data }, "player");
  const p = previewHomebrewDraft(state, d.id, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return applyHomebrewDraft(state, d.id, { reviewKey: p.reviewKey }, "player");
}
const baseData = (d, patch = {}) => ({
  identity: { ...d.data.identity, name: "Bruna" },
  classes: [{ classId: "fighter", level: 1, subclassId: null }],
  origin: {
    backgroundId: "criminal",
    speciesId: "halfling",
    backgroundBonuses: { dex: 2, con: 1 },
    choices: {},
  },
  abilities: {
    method: "manual",
    scores: { str: 15, dex: 13, con: 15, int: 8, wis: 12, cha: 10 },
    assignment: {},
    manualTotals: {},
    source: "Synthetic ability scores",
  },
  skills: {
    selected: ["acrobatics", "perception"],
    languages: ["elvish", "dwarvish"],
    tools: [],
    confirmed: true,
  },
  features: {
    selected: [
      { id: "defense", grantId: "class:fighter:fighting-style" },
      { id: "quarterstaff", grantId: "class:fighter:mastery" },
      { id: "dagger", grantId: "class:fighter:mastery" },
      { id: "longsword", grantId: "class:fighter:mastery" },
    ],
    custom: [],
    featOverride: false,
    confirmed: true,
  },
  spells: { selected: [], prepared: [], custom: [], confirmed: true },
  equipment: { mode: "manual", items: [], currency: { gp: 0 }, confirmed: true },
  hp: { mode: "calculated", perLevel: {}, currentKnown: false },
  ...patch,
});

test("PG-06: a class variant saved from the builder comes back selected in its class row", () => {
  const state = createInitialState();
  const draft = createCharacterDraft(state, { id: "c" }, "player");
  saveCharacterDraft(
    state,
    "c",
    { expectedRevision: draft.revision, data: baseData(draft) },
    "player",
  );
  const returnTo = { page: "builder", draftId: "c", section: "class", targetKind: "class", row: 0 };
  assert.deepEqual(parseLibraryReturn(JSON.stringify(returnTo)), returnTo);
  // A species return cannot point at the class section, nor carry a class row.
  assert.equal(parseLibraryReturn({ ...returnTo, targetKind: "species" }), null);
  assert.equal(
    parseLibraryReturn({ ...returnTo, section: "origin", targetKind: "species", row: 0 }),
    null,
  );
  const saved = publish(state, {
    id: "hb-wizard",
    type: "class",
    template: "class-levels:wizard",
    returnTo,
  });
  assert.deepEqual(saved.returnTo, returnTo);
  const result = addHomebrewToCharacterDraft(
    state,
    saved.ref,
    parseLibraryReturn(returnTo),
    "player",
  );
  const id = `hb-class:${saved.ref.contentId}`;
  assert.equal(result.choiceId, id);
  const after = getCharacterDraft(state, "c", "player");
  assert.equal(after.data.classes[0].classId, id);
  assert.equal(after.data.classes[0].level, 1);
  assert.equal(after.section, "class");
  assert.ok(getDraftCatalog(state, "c", "player").classes.some((c) => c.id === id));
  // Choosing it again changes nothing (no second save).
  const revision = after.revision;
  addHomebrewToCharacterDraft(state, saved.ref, returnTo, "player");
  assert.equal(getCharacterDraft(state, "c", "player").revision, revision);
});

test("PG-06: species and background variants come back selected and feed the preview", () => {
  const state = createInitialState();
  const draft = createCharacterDraft(state, { id: "c" }, "player");
  saveCharacterDraft(
    state,
    "c",
    { expectedRevision: draft.revision, data: baseData(draft) },
    "player",
  );
  const species = publish(state, {
    id: "hb-dwarf",
    type: "species",
    template: "srd-species:dwarf",
    edit: (data) => (data.structured.species.speed = 7.5),
    returnTo: { page: "builder", draftId: "c", section: "origin", targetKind: "species" },
  });
  const background = publish(state, {
    id: "hb-sage",
    type: "background",
    template: "srd-background:soldier",
    edit: (data) => {
      data.structured.background.abilities = ["str", "dex", "wis"];
      data.structured.background.skills = ["athletics", "survival"];
      data.structured.background.featId = "alert";
    },
    returnTo: { page: "builder", draftId: "c", section: "origin", targetKind: "background" },
  });
  addHomebrewToCharacterDraft(state, species.ref, species.returnTo, "player");
  addHomebrewToCharacterDraft(state, background.ref, background.returnTo, "player");
  const d = state.characterDrafts.find((row) => row.id === "c");
  assert.equal(d.data.origin.speciesId, `hb-species:${species.ref.contentId}`);
  assert.equal(d.data.origin.backgroundId, `hb-background:${background.ref.contentId}`);
  // Choosing a background clears the increases of the previous one.
  assert.deepEqual(d.data.origin.backgroundBonuses, {});
  let p = previewCharacterDraft(state, "c", "player");
  assert.ok(p.errors.some((e) => e.code === "background-increases"));
  d.data.origin.backgroundBonuses = { con: 2, dex: 1 };
  p = previewCharacterDraft(state, "c", "player");
  assert.ok(
    p.errors.some((e) => e.code === "background-bonus"),
    "CON is not on the variant",
  );
  d.data.origin.backgroundBonuses = { str: 2, wis: 1 };
  d.data.skills.selected = ["acrobatics", "perception"];
  p = previewCharacterDraft(state, "c", "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.equal(p.proposed.speed, 7.5);
  const names = p.proposed.features.map((f) => f.name.en);
  assert.ok(names.includes("Stonecunning"), "the species traits (names only) reach the sheet");
  assert.ok(names.includes("Alert"), "the variant's origin feat");
  assert.ok(p.proposed.skills.includes("survival"));
  // The template copies names and numbers, never the SRD text.
  assert.ok(p.proposed.features.filter((f) => f.homebrewRef).every((f) => !f.description.en));
});

test("PG-06: an incomplete homebrew background says what to complete", () => {
  const state = createInitialState();
  const draft = createCharacterDraft(state, { id: "c" }, "player");
  saveCharacterDraft(
    state,
    "c",
    { expectedRevision: draft.revision, data: baseData(draft) },
    "player",
  );
  assert.ok(
    D.validateStructured("background", D.emptyStructured("background")).some(
      (e) => e.path === "background.abilities",
    ),
  );
  // An older background revision without the block is still offered, with the reason.
  const d = createHomebrewDraft(state, { id: "old-bg", type: "background" }, "player");
  const data = D.emptyDefinition("background");
  data.name = { it: "Vecchio", en: "Old" };
  data.source.label = "Original synthetic homebrew";
  data.structured.background = null;
  saveHomebrewDraft(state, d.id, { expectedRevision: d.revision, data }, "player");
  const p0 = previewHomebrewDraft(state, d.id, "player");
  const ref = applyHomebrewDraft(state, d.id, { reviewKey: p0.reviewKey }, "player").ref;
  addHomebrewToCharacterDraft(
    state,
    ref,
    { page: "builder", draftId: "c", section: "origin", targetKind: "background" },
    "player",
  );
  const p = previewCharacterDraft(state, "c", "player");
  assert.ok(p.errors.some((e) => e.code === "homebrew-background" && /Avanzamento/.test(e.it)));
});

test("PG-06: the editor save returns straight to the builder choice; the picker locks the kind", () => {
  const h = harness({ role: "player" });
  const chosen = [];
  h.ctx.chooseLibraryContent = (ref, returnTo) => chosen.push({ ref, returnTo });
  const returnTo = { page: "builder", draftId: "c", section: "class", targetKind: "class", row: 1 };
  // «Crea variante…» opens the one create dialog on the class kind only, from the Wizard.
  UI.createDialog(h.ctx, { kind: "class", lock: true, template: "class-levels:wizard", returnTo });
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /<option value="class" selected>/);
  assert.doesNotMatch(dialog.body, /value="spell"/);
  assert.match(dialog.body, /<option value="class-levels:wizard" selected>/);
  const form = new FormData();
  form.append("kind", "class");
  form.append("template-class", "class-levels:wizard");
  dialog.options.onSubmit(form);
  const draftId = h.ctx.view.id;
  assert.equal(h.ctx.view.page, "homebrew-editor");
  h.edit(draftId);
  UI.setField("name.it", "Mago delle lanterne");
  UI.setField("source.label", "Original synthetic homebrew");
  UI.setField("structured.advancement.0.features.0.name.it", "Lanterna arcana");
  UI.handleAction(h.ctx, "save-content");
  assert.equal(chosen.length, 1, JSON.stringify(h.toasts));
  assert.deepEqual(chosen[0].returnTo, returnTo);
  assert.notEqual(h.ctx.view.page, "library", "no stop on the Library page");
  assert.ok(chosen[0].ref.contentId && draftId);
});

test("PG-06: «Crea variante…» in the builder picker runs the create command locked to the choice", async () => {
  const state = createInitialState();
  const { startCharacterBuilder } = await import("../character-builder.mjs");
  const calls = [];
  const command = { id: "homebrew-editor.create" };
  const ctx = {
    state,
    role: "player",
    lang: "it",
    view: { page: "builder", id: "", tab: "class" },
    t: (it) => it,
    label: (v) => (typeof v === "object" ? v?.it : v),
    esc: (v) => String(v),
    storageError: null,
    commit(title, mutate) {
      mutate(this.state);
    },
    navigate(page, params = {}) {
      this.view = { page, ...params };
    },
    render() {},
    toast() {},
    registry: {
      get: (point, id) => (point === "command" && id === command.id ? command : null),
      run: (entry, _ctx, options) => calls.push({ entry, options }),
    },
  };
  const id = startCharacterBuilder(ctx, { kind: "create" });
  ctx.view = { page: "builder", id, tab: "class" };
  const { renderCharacterBuilder } = await import("../character-builder.mjs");
  renderCharacterBuilder(ctx);
  assert.equal(createVariant(ctx, "classes", "classes.0.classId", "wizard"), true);
  assert.deepEqual(calls[0].options, {
    kind: "class",
    lock: true,
    template: "class-levels:wizard",
    returnTo: { page: "builder", draftId: id, section: "class", targetKind: "class", row: 0 },
  });
  renderCharacterBuilder(ctx);
  createVariant(ctx, "species", "origin.speciesId", "elf");
  assert.equal(calls[1].options.template, "srd-species:elf");
  assert.equal(calls[1].options.returnTo.section, "origin");
  renderCharacterBuilder(ctx);
  createVariant(ctx, "backgrounds", "origin.backgroundId", "hb-background:x");
  assert.equal(calls[2].options.template, null, "a homebrew entry is not an SRD template");
});

test("BI-22: a homebrew subclass of an SRD class is offered at level 3 and applied on level up", () => {
  const state = createInitialState();
  const sub = publish(state, {
    id: "hb-sub",
    type: "subclass",
    template: "class-levels:fighter",
    edit: (data) => {
      data.name = { it: "Custode del faro", en: "Lighthouse Keeper" };
      const [l3, , l10] = data.structured.advancement;
      l3.features[0].name = { it: "Lanterna di guardia", en: "Watch lantern" };
      l10.features[0].name = { it: "Faro vivente", en: "Living beacon" };
    },
  });
  const id = `hb-subclass:${sub.ref.contentId}`;
  const draft = createCharacterDraft(state, { id: "f1" }, "player");
  saveCharacterDraft(
    state,
    "f1",
    { expectedRevision: draft.revision, data: baseData(draft) },
    "player",
  );
  const fighter = getDraftCatalog(state, "f1", "player").classes.find((c) => c.id === "fighter");
  assert.ok(
    fighter.subclasses.some((s) => s.id === "champion"),
    "the SRD subclass stays",
  );
  assert.ok(
    fighter.subclasses.some((s) => s.id === id && s.homebrew),
    "the homebrew one joins",
  );
  assert.ok(
    !getDraftCatalog(state, "f1", "player")
      .classes.find((c) => c.id === "wizard")
      .subclasses.some((s) => s.homebrew),
    "only for its own class",
  );
  let p = previewCharacterDraft(state, "f1", "player");
  const actorId = applyCharacterDraft(
    state,
    "f1",
    { operationId: "op-f1", reviewKey: p.reviewKey, allowIncomplete: p.incomplete },
    "player",
  ).actorId;
  const up = createCharacterDraft(state, { id: "up", kind: "advance", actorId }, "player");
  up.data.classes[0].level = 3;
  for (const level of [2, 3]) up.data.hp.perLevel[level] = { method: "fixed" };
  p = previewCharacterDraft(state, "up", "player");
  assert.ok(
    p.errors.some((e) => e.code === "subclass"),
    "level 3 asks for the subclass",
  );
  up.data.classes[0].subclassId = id;
  p = previewCharacterDraft(state, "up", "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.ok(!p.warnings.some((w) => w.code === "catalogue-partial" && w.section === "features"));
  applyCharacterDraft(state, "up", { operationId: "op-up", reviewKey: p.reviewKey }, "player");
  const actor = state.actors[actorId];
  const watch = actor.features.find((f) => f.name.en === "Watch lantern");
  assert.ok(watch, "the level 3 subclass feature is on the sheet");
  assert.equal(watch.homebrewRef.contentId, sub.ref.contentId);
  assert.ok(!actor.features.some((f) => f.name.en === "Living beacon"));
  // Level 10 through the same advancement path.
  const ten = createCharacterDraft(state, { id: "ten", kind: "advance", actorId }, "player");
  ten.data.classes[0].level = 10;
  for (let level = 4; level <= 10; level++) ten.data.hp.perLevel[level] = { method: "fixed" };
  p = previewCharacterDraft(state, "ten", "player");
  assert.ok(p.proposed.features.some((f) => f.name.en === "Living beacon"));
  // The DM cannot read the private subclass: it is not offered to them.
  const dmDraft = createCharacterDraft(state, { id: "dm-c" }, "dm");
  assert.ok(
    !getDraftCatalog(state, dmDraft.id, "dm")
      .classes.find((c) => c.id === "fighter")
      .subclasses.some((s) => s.homebrew),
  );
});
