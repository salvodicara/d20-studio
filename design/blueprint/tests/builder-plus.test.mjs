// B39 — Creation: quick paths, ready-made characters and checks. Domain rules against the
// real builder (character-build.mjs) and the real store, plus the UI handlers (render and
// bind with a minimal element double). Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import {
  createCharacterDraft,
  saveCharacterDraft,
  previewCharacterDraft,
  applyCharacterDraft,
} from "../character-build.mjs";
import { classes, backgrounds, species } from "../character-rules.mjs";
import {
  renderCharacterBuilder,
  bindCharacterBuilder,
  resetCharacterBuilderView,
} from "../character-builder.mjs";
import * as D from "../builder-plus-domain.mjs";
import { register, resetView, rollStartingGold, saveTiming } from "../builder-plus.mjs";

afterEach(() => {
  resetView();
  resetCharacterBuilderView();
});

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const text = (html) => decode(String(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

function claim(state, id, role = "player", extra = {}) {
  return D.claimPremade(state, id, role, {
    operationId: "op-" + id + (extra.suffix ?? ""),
    allowIncomplete: true,
    ...extra,
  });
}

// ---------------------------------------------------------------- composing builds

test("every quick class × background × species build passes the real builder with no error", () => {
  let incomplete = 0;
  for (const cls of classes)
    for (const bg of backgrounds)
      for (const race of species) {
        const { data } = D.composeBuild({
          name: "X",
          classes: [{ classId: cls.id, level: 1 }],
          backgroundId: bg.id,
          speciesId: race.id,
        });
        const preview = D.scratchPreview(data);
        assert.deepEqual(preview.errors, [], `${cls.id}/${bg.id}/${race.id}`);
        assert.equal(preview.canApply, true);
        if (preview.incomplete) incomplete++;
        // Starting equipment: each origin gives a package or its gold, never both.
        const start = data.equipment.starting;
        assert.equal(data.equipment.currency.gp, start.gold.class + start.gold.background);
        // No background duplicate among the class skills.
        for (const id of data.skills.selected)
          assert.ok(!bg.skills.includes(id), `${cls.id}/${bg.id} dup ${id}`);
      }
  assert.ok(incomplete > 0, "partial catalogue warnings stay visible (confirmation needed)");
});

test("the quick path follows the SRD's printed recommendations and marks the app's own picks", () => {
  const wizard = D.composeBuild({
    name: "W",
    classes: [{ classId: "wizard", level: 1 }],
    backgroundId: "sage",
    speciesId: "dwarf",
  });
  const cantrips = wizard.data.spells.selected
    .filter((s) => s.grantId === "class:wizard")
    .map((s) => s.id);
  assert.deepEqual(cantrips.slice(0, 3), ["light", "mage-hand", "ray-of-frost"]);
  assert.ok(
    ["detect-magic", "feather-fall", "mage-armor", "magic-missile", "sleep", "thunderwave"].every(
      (id) => wizard.data.spells.selected.some((s) => s.id === id),
    ),
  );
  // SRD 5.2.1 Standard Array by Class (EN 21 / IT 23): wizard Int 15, Wis 14, Con 13.
  const preview = D.scratchPreview(wizard.data);
  assert.equal(preview.proposed.abilities.int, 15 + 2);
  const fighter = D.composeBuild({
    name: "F",
    classes: [{ classId: "fighter", level: 1 }],
    backgroundId: "soldier",
    speciesId: "human",
  });
  assert.ok(
    fighter.data.features.selected.some(
      (s) => s.id === "defense" && s.grantId.endsWith(":fighting-style"),
    ),
  );
  assert.ok(
    fighter.data.features.selected.some((s) => s.id === "skilled"),
    "human: Skilled is recommended",
  );
  assert.ok(fighter.picks.some((p) => p.kind === "fighting-style" && p.from === "srd"));
  assert.ok(fighter.picks.some((p) => p.kind === "skills" && p.from === "app"));
  // Magic Initiate prefers spells the class did not already give.
  const cleric = D.composeBuild({
    name: "C",
    classes: [{ classId: "cleric", level: 1 }],
    backgroundId: "acolyte",
    speciesId: "dwarf",
  });
  const mi = cleric.data.spells.selected
    .filter((s) => s.grantId === "background:magic-initiate")
    .map((s) => s.id);
  assert.ok(mi.includes("spare-the-dying"));
});

test("name suggestions are stable per page and 'suggest more' moves to the next page", () => {
  assert.deepEqual(D.nameSuggestions("dwarf", 0), D.nameSuggestions("dwarf", 0));
  assert.notDeepEqual(D.nameSuggestions("dwarf", 0), D.nameSuggestions("dwarf", 1));
  assert.equal(D.nameSuggestions("unknown", 0).length, D.NAMES_PER_PAGE);
});

// ---------------------------------------------------------------- quick path

test("quick path: saved choices, step order, creation on a normal build, still editable", () => {
  const state = createInitialState();
  createCharacterDraft(state, { id: "d1", kind: "create" }, "player");
  D.startQuick(state, "d1", "player");
  assert.throws(() => D.updateQuick(state, "d1", "player", { step: "species" }), /previous step/);
  assert.throws(() => D.updateQuick(state, "d1", "player", { classId: "bogus" }), /Unknown class/);
  assert.throws(() => D.updateQuick(state, "d1", "dm", { classId: "fighter" }), /not yours/);
  D.updateQuick(state, "d1", "player", { classId: "fighter", step: "background" });
  D.updateQuick(state, "d1", "player", { backgroundId: "soldier", step: "species" });
  D.updateQuick(state, "d1", "player", { speciesId: "dwarf", step: "identity" });
  D.updateQuick(state, "d1", "player", {
    name: "Brann",
    portrait: { kind: "emblem", id: "emblem-steel" },
    step: "review",
  });
  D.updateQuick(state, "d1", "player", { equipment: { classOption: "C", backgroundOption: "A" } });
  assert.throws(
    () =>
      D.updateQuick(state, "d1", "player", {
        equipment: { classOption: "Z", backgroundOption: "A" },
      }),
    /valid alternative/,
  );
  const actorId = D.finishQuick(state, "d1", "player", { operationId: "q1" });
  const actor = state.actors[actorId];
  assert.equal(actor.name, "Brann");
  assert.equal(actor.visibility, "private");
  assert.equal(actor.level, 1);
  assert.equal(actor.characterBuild.data.origin.speciesId, "dwarf");
  assert.equal(actor.currency.gp, 155 + 14, "fighter gold (C) + soldier package (A)");
  assert.ok(actor.inventory.some((item) => item.id.startsWith("bp-start:background-A:")));
  assert.ok(
    actor.inventory.every((item) => item.equipped === false),
    "nothing is auto-equipped",
  );
  assert.equal(D.sliceOf(state).origins[actorId].kind, "quick");
  assert.equal(state.characterDrafts.find((d) => d.id === "d1").status, "applied");
  // Still editable: a revise draft of the created sheet validates.
  createCharacterDraft(state, { id: "rev", kind: "revise", actorId }, "player");
  assert.equal(previewCharacterDraft(state, "rev", "player").canApply, true);
});

test("quick path can hand its choices to the full builder instead of creating", () => {
  const state = createInitialState();
  createCharacterDraft(state, { id: "d2", kind: "create" }, "player");
  D.startQuick(state, "d2", "player");
  D.updateQuick(state, "d2", "player", {
    classId: "wizard",
    backgroundId: "sage",
    speciesId: "gnome",
    step: "review",
  });
  D.moveQuickToBuilder(state, "d2", "player");
  const draft = state.characterDrafts.find((d) => d.id === "d2");
  assert.equal(draft.section, "review");
  assert.equal(draft.data.classes[0].classId, "wizard");
  assert.equal(D.quickOf(state, "d2", "player").status, "moved");
});

// ---------------------------------------------------------------- ready-made characters

test("ready-made characters: valid builds, claim is a private copy with provenance, repeatable", () => {
  for (const premade of D.PREMADES) {
    const { preview } = D.premadeBuild(premade.id);
    assert.deepEqual(preview.errors, [], premade.id);
  }
  const state = createInitialState();
  createCharacterDraft(state, { id: "empty", kind: "create" }, "player");
  // Oren (Druid 5, Circle of the Land) has subclass features the catalogue lists by name
  // only; Kessa (Fighter 2 / Wizard 1) is fully covered by the class tables.
  assert.throws(
    () => D.claimPremade(state, "oren", "player", { operationId: "o0" }),
    /aspects to verify/,
  );
  const a = claim(state, "kessa", "player", { discardDraftId: "empty" });
  const b = claim(state, "kessa", "player", { suffix: "-2" });
  assert.notEqual(a, b);
  assert.equal(state.actors[a].visibility, "private");
  assert.deepEqual(state.actors[a].campaignIds, []);
  assert.equal(state.actors[a].premade.id, "kessa");
  assert.equal(state.actors[a].level, 3);
  assert.equal(state.characterDrafts.find((d) => d.id === "empty").status, "discarded");
  // Multiclass prerequisites (SRD EN 24 / IT 27) are all met by Kessa.
  const rows = D.multiclassRows(
    state.actors[a].abilities,
    state.actors[a].characterBuild.data.classes,
  );
  assert.deepEqual(
    rows.map((r) => [r.classId, r.ok]),
    [
      ["fighter", true],
      ["wizard", true],
    ],
  );
  // A level-1 premade needs no confirmation.
  const brann = D.claimPremade(state, "brann", "dm", { operationId: "b1" });
  assert.equal(state.actors[brann].owner, "dm");
});

test("multiclass prerequisites: a fighter with Int 8 is blocked from wizard, the reason names the value", () => {
  const rows = D.multiclassRows({ str: 17, dex: 15, int: 8 }, [
    { classId: "fighter", level: 1 },
    { classId: "wizard", level: 1 },
  ]);
  assert.equal(rows[0].ok, true);
  assert.equal(rows[1].ok, false);
  assert.deepEqual(rows[1].values, [["int", 8]]);
  assert.equal(rows[1].requirement.en, "Intelligence 13");
});

// ---------------------------------------------------------------- prerequisites and exceptions

test("a feat with an unmet prerequisite needs an explicit exception that stays on the sheet", () => {
  const state = createInitialState();
  const id = claim(state, "oren");
  const actor = state.actors[id];
  assert.deepEqual(
    D.ruleExceptions(actor.characterBuild.data, { level: actor.level, abilities: actor.abilities }),
    [],
  );
  createCharacterDraft(state, { id: "r1", kind: "revise", actorId: id }, "player");
  const draft = state.characterDrafts.find((d) => d.id === "r1");
  const data = structuredClone(draft.data);
  assert.throws(
    () =>
      D.allowException(structuredClone(data), {
        grantId: "class:druid:feat:4",
        featId: "grappler",
        reason: " ",
      }),
    /reason/,
  );
  D.allowException(data, {
    grantId: "class:druid:feat:4",
    featId: "grappler",
    reason: "Accordo con il DM",
    by: "player",
    abilities: actor.abilities,
  });
  assert.equal(data.features.featOverride, true);
  saveCharacterDraft(state, "r1", { data }, "player");
  const preview = previewCharacterDraft(state, "r1", "player");
  assert.deepEqual(preview.errors, []);
  // Note: the builder counts the feat's own +1 Dex (12 → 13) toward its prerequisite, so its
  // own "override recorded" warning may not appear; the sheet projection below does not.
  applyCharacterDraft(
    state,
    "r1",
    { operationId: "r1", reviewKey: preview.reviewKey, allowIncomplete: true },
    "player",
  );
  const after = state.actors[id];
  const exceptions = D.ruleExceptions(after.characterBuild.data, {
    level: after.level,
    abilities: after.abilities,
  });
  assert.equal(exceptions.length, 1);
  assert.equal(exceptions[0].featId, "grappler");
  assert.equal(exceptions[0].reason, "Accordo con il DM");
  // The feat's own +1 does not satisfy its own prerequisite (checked before taking it).
  assert.deepEqual(exceptions[0].requirement.values, [
    ["str", 8],
    ["dex", 12],
  ]);
  // Without the override the builder blocks the same choice.
  const blocked = structuredClone(data);
  blocked.features.featOverride = false;
  // (+1 Str keeps both scores under 13 even for the builder, which counts the feat's own +1.)
  blocked.features.selected.find((s) => s.id === "grappler").bonuses = { str: 1 };
  createCharacterDraft(state, { id: "r2", kind: "revise", actorId: id }, "player");
  saveCharacterDraft(state, "r2", { data: blocked }, "player");
  assert.ok(
    previewCharacterDraft(state, "r2", "player").errors.some((e) => e.code === "feat-prerequisite"),
  );
  D.removeException(blocked, { grantId: "class:druid:feat:4", featId: "grappler" });
  assert.equal(blocked.features.featOverride, false);
});

test("duplicate proficiencies are released with a notice (class choice and species choice)", () => {
  const data = {
    classes: [{ classId: "fighter", level: 1 }],
    origin: { backgroundId: "soldier", speciesId: "human", choices: { skill: "intimidation" } },
    skills: { selected: ["athletics", "perception"], confirmed: true },
  };
  const found = D.duplicateSkills(data);
  assert.deepEqual(
    found.map((r) => [r.skillId, r.from]),
    [
      ["athletics", "class"],
      ["intimidation", "species"],
    ],
  );
  D.releaseDuplicates(data, { now: Date.UTC(2026, 8, 25), by: "player" });
  assert.deepEqual(data.skills.selected, ["perception"]);
  assert.equal(data.skills.confirmed, false);
  assert.equal(data.origin.choices.skill, undefined);
  assert.equal(data.skills.released.length, 2);
  assert.equal(data.skills.released[0].grantedBy.id, "soldier");
  assert.deepEqual(D.duplicateSkills(data), []);
});

// ---------------------------------------------------------------- sources

test("disabled legacy sources hide three options; campaigns that block legacy win", () => {
  assert.equal(D.hiddenOptions({ sources: {} }).length, 3);
  assert.equal(D.hiddenOptions({ sources: {} }, "origin").length, 2);
  assert.equal(D.hiddenOptions({ sources: {} }, "features").length, 1);
  assert.equal(D.hiddenOptions({ sources: { legacy2014: true } }).length, 0);
  const record = D.legacyRecord("legacy-2014:half-elf", 1);
  assert.equal(record.source.edition, "2014");
  assert.equal(record.source.revision, "5.1");
  assert.equal(record.automation, "manual");
  const state = createInitialState();
  state.ext = {
    "campaign-settings": { campaigns: { lanterns: { policy: { legacySources: "blocked" } } } },
  };
  assert.equal(D.legacyAccess(state, { actorId: "livia" }).allowed, false, "campaign sheet");
  const personal = D.legacyAccess(state, { actorId: null });
  assert.equal(personal.allowed, true);
  assert.match(personal.reason.en, /blocks legacy/);
});

// ---------------------------------------------------------------- starting equipment

test("starting equipment reopens: packages or gold, kept rows stay, spent gold is refused", () => {
  const state = createInitialState();
  const id = claim(state, "brann");
  const actor = state.actors[id];
  assert.equal(actor.currency.gp, 4 + 14);
  const same = D.previewStarting(state, id, { classOption: "A", backgroundOption: "A" });
  assert.equal(same.removed.length, 0);
  assert.equal(same.added.length, 0);
  assert.equal(same.delta, 0);
  actor.inventory.find((item) => item.id.includes(":greatsword")).equipped = true;
  const gold = D.previewStarting(state, id, { classOption: "C", backgroundOption: "A" });
  assert.equal(gold.delta, 151);
  assert.ok(gold.removed.some((item) => item.id.includes(":greatsword") && item.equipped));
  assert.throws(
    () =>
      D.applyStarting(state, id, { classOption: "C", backgroundOption: "A" }, "player", {
        key: "stale",
      }),
    /changed/,
  );
  D.applyStarting(state, id, { classOption: "C", backgroundOption: "A" }, "player", {
    key: gold.key,
  });
  assert.equal(state.actors[id].currency.gp, 169);
  assert.ok(!state.actors[id].inventory.some((item) => item.id.includes("class-A")));
  assert.equal(D.startingRecord(state, id).classOption, "C");
  // Spending the gold, then asking for the package back, would need gold the sheet no longer has.
  state.actors[id].currency.gp = 10;
  const back = D.previewStarting(state, id, { classOption: "A", backgroundOption: "A" });
  assert.equal(back.errors.length, 1);
  assert.throws(
    () => D.applyStarting(state, id, { classOption: "A", backgroundOption: "A" }, "player"),
    /already spent/,
  );
  assert.throws(
    () => D.applyStarting(state, id, { classOption: "A", backgroundOption: "A" }, "dm"),
    /controls the sheet/,
  );
  // A sheet without a recorded build has no starting equipment to reopen.
  assert.equal(D.startingContext(state, "livia").available, false);
});

test("starting at level 5: 500 gp + 1d10 × 25 gp, physical or digital, corrections keep a reason", () => {
  const state = createInitialState();
  const id = claim(state, "oren");
  assert.equal(D.startingContext(state, id).band.multiplier, 25);
  assert.throws(
    () => D.recordStartingRoll(state, id, "player", { id: "x", mode: "physical", value: 11 }),
    /1 to 10/,
  );
  const roll = D.recordStartingRoll(state, id, "player", { id: "g1", mode: "physical", value: 7 });
  assert.equal(roll.total, 675);
  assert.throws(
    () => D.recordStartingRoll(state, id, "player", { id: "g2", mode: "digital", value: 3 }),
    /already recorded/,
  );
  assert.throws(
    () =>
      D.recordStartingRoll(state, id, "player", {
        id: "g2",
        mode: "physical",
        value: 3,
        correctionOf: "g1",
      }),
    /reason/,
  );
  const fixed = D.recordStartingRoll(state, id, "player", {
    id: "g2",
    mode: "physical",
    value: 3,
    correctionOf: "g1",
    reason: "Letto male il dado",
  });
  assert.equal(fixed.total, 575);
  assert.equal(D.sliceOf(state).rolls.find((r) => r.id === "g1").status, "corrected");
  const preview = D.previewStarting(state, id, {
    classOption: "A",
    backgroundOption: "A",
    useBonus: true,
  });
  assert.equal(preview.delta, 575);
  D.applyStarting(state, id, { classOption: "A", backgroundOption: "A", useBonus: true }, "player");
  assert.equal(state.actors[id].currency.gp, 17 + 575);
  // Level 1 sheets have no roll.
  const brann = claim(state, "brann");
  assert.throws(
    () => D.recordStartingRoll(state, brann, "player", { id: "g3", mode: "digital", value: 5 }),
    /level 5/,
  );
});

test("a digital retry after Undo reuses the withdrawn face once (evidence stays in the log)", () => {
  const state = createInitialState();
  const id = claim(state, "oren");
  const roll = D.recordStartingRoll(state, id, "player", { id: "g1", mode: "digital", value: 9 });
  state.log.push({ id: "log-1", rolls: [D.logRoll(roll, state.actors[id])] });
  // Snapshot Undo removes the slice record; the log keeps the accepted face.
  D.sliceOf(state).rolls = [];
  assert.deepEqual(D.withdrawnFace(state, id), { value: 9, rollId: "g1" });
  D.recordStartingRoll(state, id, "player", {
    id: "g2",
    mode: "digital",
    value: 9,
    reusedFrom: "g1",
  });
  D.sliceOf(state).rolls = D.sliceOf(state).rolls.map((r) => ({ ...r, status: "accepted" }));
  // Once reused, the face is not offered again.
  D.sliceOf(state).rolls = [{ id: "g2", reusedFrom: "g1", actorId: id, status: "withdrawn" }];
  assert.equal(D.withdrawnFace(state, id), null);
});

// ---------------------------------------------------------------- level down and rebuild

test("level down previews the removed grants and applies through a revise draft", () => {
  const state = createInitialState();
  const id = claim(state, "kessa");
  const plan = D.levelDownPlan(state, id, "wizard", "player");
  assert.equal(plan.fromLevel, 3);
  assert.equal(plan.toLevel, 2);
  assert.deepEqual(plan.removed.features.map((n) => n.en).sort(), [
    "Arcane Recovery",
    "Ritual Adept",
    "Spellcasting",
  ]);
  assert.equal(plan.removed.spells.length, 9);
  assert.deepEqual(plan.removed.slots, [{ level: 1, from: 2, to: 0 }]);
  assert.deepEqual(plan.removed.hitDice, [{ die: "d6", from: 1, to: 0 }]);
  assert.equal(plan.before.maxHp, 26);
  assert.equal(plan.after.maxHp, 20);
  assert.throws(
    () => D.applyLevelDown(state, id, "wizard", "player", { key: "old", operationId: "x" }),
    /changed/,
  );
  D.applyLevelDown(state, id, "wizard", "player", {
    key: plan.key,
    operationId: "ld1",
    allowIncomplete: true,
  });
  const actor = state.actors[id];
  assert.equal(actor.level, 2);
  assert.equal(actor.className.en, "Fighter 2");
  assert.equal(actor.maxHp, 20);
  assert.equal(actor.hp, 20);
  assert.equal(actor.hitDice.d6?.max ?? 0, 0);
  assert.ok(!(actor.spells ?? []).some((s) => s.buildManaged));
  assert.equal(D.sliceOf(state).levelDowns.at(-1).classId, "wizard");
  // Down again, then level 1 is the minimum.
  D.applyLevelDown(state, id, "fighter", "player", { operationId: "ld2", allowIncomplete: true });
  assert.equal(state.actors[id].level, 1);
  assert.throws(() => D.levelDownPlan(state, id, "fighter", "player"), /minimum/);
  // The starting class stays while another class has levels.
  const other = claim(state, "kessa", "player", { suffix: "-b" });
  D.applyLevelDown(state, other, "fighter", "player", {
    operationId: "ld3",
    allowIncomplete: true,
  });
  assert.equal(state.actors[other].className.en, "Fighter 1 / Wizard 1");
  assert.throws(() => D.levelDownPlan(state, other, "fighter", "player"), /starting class stays/);
  assert.throws(() => D.levelDownPlan(state, "livia", "wizard", "player"), /no recorded build/);
});

test("full rebuild keeps species, background, name and story, and re-asks the rest", () => {
  const state = createInitialState();
  const id = claim(state, "kessa");
  const before = structuredClone(state.actors[id]);
  D.startRespec(state, id, "player", { draftId: "rs" });
  const draft = state.characterDrafts.find((d) => d.id === "rs");
  assert.equal(draft.kind, "revise");
  assert.equal(draft.section, "class");
  assert.deepEqual(draft.data.classes, []);
  assert.equal(draft.data.origin.speciesId, "orc");
  assert.equal(draft.data.origin.backgroundId, "soldier");
  assert.equal(draft.data.story.backstory, before.backstory);
  assert.equal(D.respecOf(state, "rs").targetLevel, 3);
  assert.equal(state.actors[id].level, 3, "the sheet is unchanged until the review is applied");
  // A complete rebuild into a single class: fighter 3.
  const { data } = D.composeBuild({
    name: "Kessa",
    classes: [{ classId: "fighter", level: 3 }],
    backgroundId: "soldier",
    speciesId: "orc",
  });
  saveCharacterDraft(
    state,
    "rs",
    { data: { ...data, story: draft.data.story, equipment: draft.data.equipment } },
    "player",
  );
  const preview = previewCharacterDraft(state, "rs", "player");
  assert.deepEqual(preview.errors, []);
  applyCharacterDraft(
    state,
    "rs",
    { operationId: "rs", reviewKey: preview.reviewKey, allowIncomplete: true },
    "player",
  );
  const after = state.actors[id];
  assert.equal(after.className.en, "Fighter 3");
  assert.equal(after.level, 3);
  assert.equal(after.backstory, before.backstory);
  assert.deepEqual(
    after.inventory.map((i) => i.id),
    before.inventory.map((i) => i.id),
    "items stay",
  );
  assert.throws(() => D.startRespec(state, id, "dm", { draftId: "x" }), /Only whoever controls/);
  assert.throws(
    () => D.startRespec(state, "livia", "player", { draftId: "y" }),
    /no recorded build/,
  );
});

// ---------------------------------------------------------------- co-building

test("co-building: presence without content, publish, explicit conflicts, restore as a new revision", () => {
  const state = createInitialState();
  createCharacterDraft(state, { id: "cd", kind: "create" }, "player");
  D.startCobuild(state, "player", { id: "cb", draftId: "cd", now: 1 });
  D.editLocal(state, "cb", "player", "name", "Brann", 2);
  const dmView = D.cobuildView(state, "cb", "dm");
  const name = dmView.fields.find((f) => f.id === "name");
  assert.deepEqual(name.presence, { role: "player", at: new Date(2).toISOString() });
  assert.equal(name.value, "", "the DM never sees the player's unpublished text");
  assert.equal(dmView.opened, false);
  D.editLocal(state, "cb", "dm", "name", "Brannoc", 3);
  assert.deepEqual(D.publish(state, "cb", "dm", 4), { published: ["name"], conflicts: [] });
  const result = D.publish(state, "cb", "player", 5);
  assert.deepEqual(result, { published: [], conflicts: ["name"] });
  const view = D.cobuildView(state, "cb", "player");
  assert.equal(view.conflicts[0].theirs, "Brannoc");
  assert.equal(view.conflicts[0].mine, "Brann");
  D.resolveConflict(state, "cb", "player", "name", "mine", 6);
  assert.equal(D.cobuildView(state, "cb", "dm").fields.find((f) => f.id === "name").value, "Brann");
  assert.equal(D.cobuildView(state, "cb", "dm").unseen, 1);
  const entry = D.cobuildView(state, "cb", "dm").history.find((h) => h.value === "Brann");
  D.restoreValue(state, "cb", "dm", entry.id, 7);
  assert.equal(D.cobuildOf(state).sessions.cb.fields.name.value, "Brannoc");
  assert.equal(D.cobuildOf(state).sessions.cb.fields.name.rev, 3);
  assert.throws(() => D.publish(state, "cb", "player", 8), /No change/);
  assert.throws(() => D.editLocal(state, "cb", "player", "classId", "bogus"), /not available/);
  // Only the owner brings the fields into their own private builder draft.
  D.editLocal(state, "cb", "dm", "classId", "fighter", 9);
  D.publish(state, "cb", "dm", 10);
  assert.throws(
    () => D.transferToDraft(state, "cb", "dm", { draftId: "x" }),
    /Only whoever started/,
  );
  const target = D.transferToDraft(state, "cb", "player", { draftId: "x" });
  assert.equal(target, "cd");
  const draft = state.characterDrafts.find((d) => d.id === "cd");
  assert.equal(draft.data.identity.name, "Brannoc");
  assert.equal(draft.data.classes[0].classId, "fighter");
  D.markSeen(state, "cb", "dm");
  assert.equal(D.cobuildView(state, "cb", "dm").opened, true);
  D.closeCobuild(state, "cb", "player");
  assert.throws(() => D.editLocal(state, "cb", "player", "name", "Z"), /closed/);
});

test("ready-made stories follow the language: preview and claimed copy in English or Italian", () => {
  assert.match(D.premadeBuild("brann").data.story.backstory, /guardia di confine/);
  assert.match(D.premadeBuild("brann", "en").data.story.backstory, /border guard/);
  assert.match(D.premadeBuild("kessa", "en").data.story.description, /grimoire/);
  const state = createInitialState();
  const en = D.claimPremade(state, "brann", "player", { operationId: "en", lang: "en" });
  const it = D.claimPremade(state, "brann", "player", { operationId: "it" });
  assert.match(state.actors[en].backstory, /border guard/);
  assert.match(state.actors[it].backstory, /guardia di confine/);
});

test("a closed shared draft stays listed and readable, read-only; open ones alone notify", () => {
  const state = createInitialState();
  createCharacterDraft(state, { id: "cd", kind: "create" }, "player");
  D.startCobuild(state, "player", { id: "cb", draftId: "cd", now: 1 });
  D.editLocal(state, "cb", "player", "hooks", "Debito con la gilda", 2);
  D.publish(state, "cb", "player", 3);
  D.closeCobuild(state, "cb", "player", 4);
  assert.equal(D.cobuildSessions(state, "player").length, 0, "open drafts only by default");
  const all = D.cobuildSessions(state, "dm", { includeClosed: true });
  assert.deepEqual(
    all.map((row) => [row.id, row.status]),
    [["cb", "closed"]],
  );
  assert.equal(D.cobuildView(state, "cb", "dm").status, "closed");
  assert.throws(() => D.editLocal(state, "cb", "dm", "hooks", "x"), /closed/);
});

test("slices normalize safely and refuse future versions", () => {
  assert.deepEqual(D.normalizeSlice(null), D.seedSlice());
  assert.throws(() => D.normalizeSlice({}, 99), /Future/);
  assert.deepEqual(D.normalizeCobuild({ sessions: [] }), { sessions: {} });
});

// ---------------------------------------------------------------- UI through the real registry and store

function harness({ lang = "it" } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  assert.equal(registry.use("builder-plus", register).status, "built");
  const store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [],
    navigations = [],
    dialogs = [];
  const ctx = {
    role: "player",
    lang,
    offline: false,
    view: { page: "characters", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      typeof value === "object" && value
        ? value[ctx.lang] || value.it || value.en || ""
        : String(value ?? ""),
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate(page, params = {}) {
      this.view = { page, id: params.id ?? "", tab: params.tab ?? "" };
      navigations.push({ page, ...params });
    },
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    canControl: (actor) => actor?.owner === ctx.role || ctx.role === "dm",
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
    rollDie: () => 4,
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "offline", en: "offline" });
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      if (options.afterCommit) options.afterCommit(store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
    },
    registry,
  };
  registry.attach(ctx);
  return { ctx, registry, store, toasts, navigations, dialogs };
}
// Minimal element double: attribute selectors over the rendered markup.
function mount(html) {
  const nodes = [
    ...html.matchAll(/<(input|button|select|textarea|form|details|div|section)\b([^>]*)>/g),
  ].map(([, tag, attrsText]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v ?? "")]),
    );
    const node = {
      tagName: tag.toUpperCase(),
      attrs,
      value: attrs.value ?? "",
      checked: "checked" in attrs,
      disabled: "disabled" in attrs,
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      events: {},
      addEventListener(type, fn) {
        this.events[type] = fn;
      },
      focus() {},
      // An approximation: a container searches the whole mounted markup.
      querySelector: (selector) => root.querySelector(selector),
      querySelectorAll: (selector) => root.querySelectorAll(selector),
    };
    return node;
  });
  const matches = (node, selector) =>
    // Nothing has the focus here: in the browser a pressed button holds it, not a field.
    !selector.includes(":focus") &&
    selector.split(",").some((part) => {
      const tag = part.trim().match(/^([a-z]+)/)?.[1];
      if (tag && node.tagName !== tag.toUpperCase()) return false;
      return [...part.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)].every(
        ([, k, v]) => k in node.attrs && (v === undefined || node.attrs[k] === v),
      );
    });
  const root = {
    nodes,
    querySelector: (selector) => nodes.find((n) => matches(n, selector)) ?? null,
    querySelectorAll: (selector) => nodes.filter((n) => matches(n, selector)),
  };
  return root;
}
const click = async (node) => {
  if (node.onclick) await node.onclick({ currentTarget: node, target: node });
  else await node.events.click?.({ currentTarget: node, target: node, preventDefault() {} });
};

test("registration: route, sheet sections, notifications, commands, guard and builder panels", () => {
  const { registry, ctx } = harness();
  assert.ok(registry.get("route", "builder-plus"));
  assert.ok(registry.get("sheet-section", "builder-plus-build"));
  assert.ok(registry.get("sheet-section", "builder-plus-start"));
  assert.ok(registry.get("notifications", "builder-plus-cobuild"));
  assert.equal(
    registry.list("command", ctx).filter((c) => c.id.startsWith("builder-plus.")).length,
    3,
  );
  assert.ok(registry.get("draft-guard", "builder-plus-guard"));
  assert.ok(ctx.state.ext["builder-plus"]);
  assert.ok(ctx.state.ext["builder-plus-cobuild"]);
});

test("builder identity shows the three creation methods for a new draft, not for a revision", async () => {
  const h = harness();
  const { ctx } = h;
  ctx.commit("draft", (s) => createCharacterDraft(s, { id: "d", kind: "create" }, "player"), {
    local: true,
  });
  ctx.view = { page: "builder", id: "d", tab: "identity" };
  const html = renderCharacterBuilder(ctx);
  assert.match(text(html), /Come vuoi creare il personaggio\?/);
  assert.match(text(html), /Percorso rapido/);
  assert.match(text(html), /Personaggio pronto/);
  assert.match(text(html), /Nomi suggeriti/);
  // Clicking the quick path starts it on this very draft.
  const root = mount(html);
  bindCharacterBuilder(root, ctx);
  await click(root.querySelector('[data-bp-go="quick"]'));
  assert.equal(D.quickOf(ctx.state, "d", "player").step, "class");
  assert.deepEqual(h.navigations.at(-1), { page: "builder-plus", tab: "quick", id: "d" });
  // A suggested name is applied only when clicked.
  ctx.view = { page: "builder", id: "d", tab: "identity" };
  const again = mount(renderCharacterBuilder(ctx));
  bindCharacterBuilder(again, ctx);
  const pick = again.querySelector("[data-bp-builder-name]");
  await click(pick);
  assert.equal(
    ctx.state.characterDrafts.find((d) => d.id === "d").data.identity.name,
    pick.dataset.bpBuilderName,
  );
  // A revision of an existing sheet has no method chooser.
  const actorId = D.claimPremade(ctx.state, "brann", "player", { operationId: "p" });
  ctx.commit(
    "rev",
    (s) => createCharacterDraft(s, { id: "r", kind: "revise", actorId }, "player"),
    { local: true },
  );
  resetCharacterBuilderView();
  ctx.view = { page: "builder", id: "r", tab: "identity" };
  assert.doesNotMatch(text(renderCharacterBuilder(ctx)), /Come vuoi creare/);
});

test("quick path page: choose from a detail page, then create and land on the sheet", async () => {
  const h = harness();
  const { ctx } = h;
  ctx.commit(
    "draft",
    (s) => {
      createCharacterDraft(s, { id: "q", kind: "create" }, "player");
      D.startQuick(s, "q", "player");
    },
    { local: true },
  );
  ctx.view = { page: "builder-plus", id: "q", tab: "quick" };
  const route = h.registry.get("route", "builder-plus", ctx);
  let root = mount(route.render(ctx));
  route.bind(root, ctx);
  await click(root.querySelector('[data-bp-detail="class:cleric"]'));
  root = mount(route.render(ctx));
  assert.match(text(route.render(ctx)), /Serie standard consigliata/);
  assert.match(text(route.render(ctx)), /Consigliati dalla SRD/);
  route.bind(root, ctx);
  await click(root.querySelector("[data-bp-choose]"));
  assert.equal(D.quickOf(ctx.state, "q", "player").classId, "cleric");
  ctx.commit(
    "x",
    (s) =>
      D.updateQuick(s, "q", "player", {
        backgroundId: "acolyte",
        speciesId: "dwarf",
        name: "Sefa",
        step: "review",
      }),
    { local: true },
  );
  const review = route.render(ctx);
  assert.match(text(review), /Riepilogo/);
  assert.match(text(review), /Nessun oggetto viene equipaggiato/);
  root = mount(review);
  route.bind(root, ctx);
  const form = root.querySelector("[data-bp-create]");
  form.querySelector = () => null;
  await form.events.submit({ preventDefault() {}, currentTarget: form });
  const last = h.navigations.at(-1);
  assert.equal(last.page, "characters");
  assert.equal(ctx.state.actors[last.id].name, "Sefa");
});

test("sheet: level down through the dialog, with an Undo in the notice", async () => {
  const h = harness();
  const { ctx } = h;
  let actorId;
  ctx.commit(
    "claim",
    (s) =>
      (actorId = D.claimPremade(s, "kessa", "player", { operationId: "k", allowIncomplete: true })),
    { local: true },
  );
  const section = h.registry.get(
    "sheet-section",
    "builder-plus-build",
    ctx,
    ctx.state.actors[actorId],
  );
  const html = section.render(ctx, ctx.state.actors[actorId]);
  assert.match(text(html), /Requisiti del multiclasse/);
  const root = mount(html);
  section.bind(root, ctx, ctx.state.actors[actorId]);
  await click(root.querySelector('[data-bp-level-down="wizard"]'));
  const dialog = h.dialogs.at(-1);
  // Residuals (29/09/2026, X-A2): the Italian page names the features as the Italian SRD does.
  assert.match(text(dialog.body), /Privilegi rimossi.*Incantesimi.*Adepto dei rituali/);
  assert.match(text(dialog.body), /PF massimi: 26 → 20/);
  const form = new Map([["confirm", "on"]]);
  dialog.options.onSubmit(form);
  assert.equal(ctx.state.actors[actorId].level, 2);
  const after = section.render(ctx, ctx.state.actors[actorId]);
  assert.match(text(after), /Sceso di livello: Mago/);
  const undoRoot = mount(after);
  section.bind(undoRoot, ctx, ctx.state.actors[actorId]);
  await click(undoRoot.querySelector("[data-bp-undo]"));
  assert.equal(ctx.state.actors[actorId].level, 3);
});

test("sheet: the starting gold roll is recorded in the log with its dice and announced", () => {
  const h = harness();
  const { ctx } = h;
  const seen = [];
  h.registry.on("roll-accepted", (payload) => seen.push(payload));
  let actorId;
  ctx.commit(
    "claim",
    (s) =>
      (actorId = D.claimPremade(s, "oren", "player", { operationId: "o", allowIncomplete: true })),
    { local: true },
  );
  const section = h.registry.get(
    "sheet-section",
    "builder-plus-start",
    ctx,
    ctx.state.actors[actorId],
  );
  const root = mount(section.render(ctx, ctx.state.actors[actorId]));
  section.bind(root, ctx, ctx.state.actors[actorId]);
  root.querySelector("[data-bp-reopen]").events.click();
  const dialog = h.dialogs.at(-1);
  assert.match(text(dialog.body), /500 mo più 1d10 × 25 mo/);
  assert.match(text(dialog.body), /Tira 1d10 digitale/);
  // Digital roll through the app's dice service (ctx.rollDie → 4): evidence in the log.
  const roll = rollStartingGold(ctx, actorId, { mode: "digital" });
  assert.equal(roll.total, 600);
  const entry = ctx.state.log.at(-1);
  assert.equal(entry.rolls[0].source, "builder-plus");
  assert.deepEqual(entry.rolls[0].values, [4]);
  assert.equal(seen.at(-1).roll.startingRollId, roll.id);
  // Undo removes the record; the next digital roll reuses the withdrawn face, not a new one.
  ctx.undo();
  assert.equal(D.startingBonusRoll(ctx.state, actorId), null);
  ctx.rollDie = () => 10;
  const retry = rollStartingGold(ctx, actorId, { mode: "digital" });
  assert.equal(retry.values[0], 4);
  assert.equal(retry.reusedFrom, roll.id);
});

test("co-building page: the DM is invited through the notification centre and sees presence only", () => {
  const h = harness();
  const { ctx } = h;
  ctx.commit("draft", (s) => createCharacterDraft(s, { id: "cd", kind: "create" }, "player"), {
    local: true,
  });
  ctx.commit("cb", (s) => D.startCobuild(s, "player", { id: "cb", draftId: "cd" }), {
    undoable: false,
  });
  ctx.commit("edit", (s) => D.editLocal(s, "cb", "player", "name", "Segreto"), {
    local: true,
    undoable: false,
  });
  ctx.role = "dm";
  const notices = h.registry.list("notifications", ctx)[0].collect(ctx);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].category, "invites");
  assert.deepEqual(notices[0].target, {
    page: "builder-plus",
    params: { tab: "cobuild", id: "cb" },
  });
  ctx.view = { page: "builder-plus", id: "cb", tab: "cobuild" };
  const html = h.registry.get("route", "builder-plus", ctx).render(ctx);
  assert.match(text(html), /Il giocatore sta modificando qui/);
  assert.doesNotMatch(html, /Segreto/);
  ctx.role = "player";
  assert.equal(h.registry.list("notifications", ctx)[0].collect(ctx).length, 0);
});

test("English labels and the ready-made list render for the phone path", () => {
  const h = harness({ lang: "en" });
  const { ctx } = h;
  ctx.view = { page: "builder-plus", id: "", tab: "premade" };
  const html = h.registry.get("route", "builder-plus", ctx).render(ctx);
  assert.match(text(html), /Ready-made characters/);
  assert.equal((html.match(/data-bp-claim=/g) ?? []).length, 4);
  ctx.view = { page: "builder-plus", id: "kessa", tab: "premade" };
  assert.match(
    text(h.registry.get("route", "builder-plus", ctx).render(ctx)),
    /Multiclass prerequisites/,
  );
});

test("builder features: a blocked feat shows its reason and values; the exception needs a reason", async () => {
  const h = harness();
  const { ctx } = h;
  let actorId;
  ctx.commit(
    "claim",
    (s) =>
      (actorId = D.claimPremade(s, "oren", "player", { operationId: "o", allowIncomplete: true })),
    { local: true },
  );
  ctx.commit(
    "rev",
    (s) => createCharacterDraft(s, { id: "rv", kind: "revise", actorId }, "player"),
    { local: true },
  );
  ctx.view = { page: "builder", id: "rv", tab: "features" };
  const html = renderCharacterBuilder(ctx);
  assert.match(text(html), /Talenti bloccati dai requisiti/);
  assert.match(text(html), /Lottatore.*Forza 8 · Destrezza 12/);
  const root = mount(html);
  bindCharacterBuilder(root, ctx);
  await click(root.querySelector('[data-bp-exc-allow="grappler"]'));
  const dialog = h.dialogs.at(-1);
  assert.throws(() => dialog.options.onSubmit(new Map([["reason", "  "]])), /motivo/);
  dialog.options.onSubmit(new Map([["reason", "Accordo con il DM"]]));
  const data = ctx.state.characterDrafts.find((d) => d.id === "rv").data;
  const pick = data.features.selected.find((s) => s.grantId === "class:druid:feat:4");
  assert.equal(pick.id, "grappler");
  assert.equal(pick.exception.reason, "Accordo con il DM");
  assert.equal(data.features.featOverride, true);
  assert.match(text(renderCharacterBuilder(ctx)), /Eccezione consentita/);
});

test("builder origin: choosing a background that grants a chosen skill releases it with a notice", async () => {
  const h = harness();
  const { ctx } = h;
  ctx.commit(
    "draft",
    (s) => {
      createCharacterDraft(s, { id: "dd", kind: "create" }, "player");
      const draft = s.characterDrafts.find((d) => d.id === "dd");
      draft.data.classes = [{ classId: "fighter", level: 1, subclassId: null }];
      draft.data.skills.selected = ["athletics", "perception"];
      draft.data.origin.backgroundId = "soldier";
    },
    { local: true },
  );
  ctx.view = { page: "builder", id: "dd", tab: "origin" };
  const root = mount(renderCharacterBuilder(ctx));
  bindCharacterBuilder(root, ctx);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const data = ctx.state.characterDrafts.find((d) => d.id === "dd").data;
  assert.deepEqual(data.skills.selected, ["perception"]);
  assert.equal(data.skills.released[0].skillId, "athletics");
  assert.match(text(renderCharacterBuilder(ctx)), /Atletica ora è concessa da Soldato/);
});

test("level down asks for the maximum HP when the removed level's value was never recorded", () => {
  const state = createInitialState();
  const id = claim(state, "kessa");
  state.actors[id].characterBuild.data.hp.perLevel = {};
  const plan = D.levelDownPlan(state, id, "wizard", "player");
  assert.equal(plan.needsHp, true);
  assert.throws(
    () =>
      D.applyLevelDown(state, id, "wizard", "player", { operationId: "m1", allowIncomplete: true }),
    /maximum HP/,
  );
  D.applyLevelDown(state, id, "wizard", "player", {
    operationId: "m2",
    allowIncomplete: true,
    manualMaxHp: 21,
  });
  assert.equal(state.actors[id].maxHp, 21);
  assert.equal(state.actors[id].hp, 21);
});

// ---------------------------------------------------------------- review fixes (B39-rf)

test("co-building page: Publish includes the text still in the field (the press held its save)", async () => {
  const h = harness();
  const { ctx } = h;
  ctx.commit("draft", (s) => createCharacterDraft(s, { id: "cd", kind: "create" }, "player"), {
    local: true,
  });
  ctx.commit("cb", (s) => D.startCobuild(s, "player", { id: "cb", draftId: "cd" }), {
    undoable: false,
  });
  ctx.view = { page: "builder-plus", id: "cb", tab: "cobuild" };
  const route = h.registry.get("route", "builder-plus", ctx);
  const root = mount(route.render(ctx));
  route.bind(root, ctx);
  const input = root.querySelector('[data-bp-field="name"]');
  input.value = "Brann";
  input.events.input();
  // No "change" reached the page: the pointer press on Publish waited for its click.
  const form = root.querySelector("[data-bp-coform]");
  await form.events.submit({ preventDefault() {}, currentTarget: form });
  const name = D.cobuildOf(ctx.state).sessions.cb.fields.name;
  assert.deepEqual([name.value, name.rev], ["Brann", 1]);
  assert.equal(h.registry.get("draft-guard", "builder-plus-guard").hasDraft(ctx), false);
});

test("co-building page: a closed draft is still listed and opens read-only with its history", () => {
  const h = harness();
  const { ctx } = h;
  ctx.commit("draft", (s) => createCharacterDraft(s, { id: "cd", kind: "create" }, "player"), {
    local: true,
  });
  ctx.commit(
    "cb",
    (s) => {
      D.startCobuild(s, "player", { id: "cb", draftId: "cd" });
      D.editLocal(s, "cb", "player", "hooks", "Debito con la gilda");
      D.publish(s, "cb", "player");
      D.closeCobuild(s, "cb", "player");
    },
    { undoable: false },
  );
  const route = h.registry.get("route", "builder-plus", ctx);
  ctx.view = { page: "builder-plus", id: "", tab: "cobuild" };
  const list = route.render(ctx);
  assert.match(text(list), /Chiusa/);
  assert.match(list, /data-bp-cobuild-open="cb"/);
  ctx.view = { page: "builder-plus", id: "cb", tab: "cobuild" };
  const page = route.render(ctx);
  assert.match(text(page), /Bozza condivisa chiusa: solo lettura/);
  assert.match(page, /Debito con la gilda/);
  assert.doesNotMatch(page, /data-bp-publish|data-bp-restore|data-bp-transfer/);
  const fields = [...page.matchAll(/<(?:input|select|textarea)\b[^>]*data-bp-field=[^>]*>/g)];
  assert.equal(fields.length, D.COBUILD_FIELDS.length);
  assert.ok(
    fields.every(([tag]) => /\sdisabled\b/.test(tag)),
    "closed fields are read-only",
  );
  ctx.role = "dm";
  assert.equal(h.registry.list("notifications", ctx)[0].collect(ctx).length, 0);
});

test("a text field waits for the click of a pressed control before saving (no lost click)", () => {
  const node = (tag, type = "", selector = tag) => ({
    tagName: tag.toUpperCase(),
    type,
    matches: (s) => s.split(",").some((part) => part.trim() === selector),
  });
  const input = node("input", "text");
  assert.equal(saveTiming(null, input), "after-focus", "Tab or a press on another field");
  assert.equal(saveTiming(input, input), "after-focus");
  assert.equal(saveTiming(node("button"), input), "click");
  assert.equal(saveTiming(node("input", "radio", "input[type=radio]"), input), "click");
  assert.equal(saveTiming(node("label"), input), "click");
  assert.equal(saveTiming(node("select"), input), "now", "a select opens on the press itself");
  assert.equal(saveTiming(node("textarea"), input), "after-focus");
});

test("claiming in English keeps an English story; the quick path keeps no copy of its portrait image", async () => {
  const h = harness({ lang: "en" });
  const { ctx } = h;
  ctx.view = { page: "builder-plus", id: "", tab: "premade" };
  const route = h.registry.get("route", "builder-plus", ctx);
  const root = mount(route.render(ctx));
  route.bind(root, ctx);
  await click(root.querySelector('[data-bp-claim="brann"]'));
  h.dialogs.at(-1).options.onSubmit(new Map());
  const brann = ctx.state.actors[h.navigations.at(-1).id];
  assert.match(brann.backstory, /border guard/);
  ctx.commit(
    "quick",
    (s) => {
      createCharacterDraft(s, { id: "q", kind: "create" }, "player");
      D.startQuick(s, "q", "player");
      D.updateQuick(s, "q", "player", {
        classId: "fighter",
        backgroundId: "soldier",
        speciesId: "dwarf",
        name: "Sigra",
        portrait: { kind: "emblem", id: "emblem-steel", dataUrl: "data:image/png;base64,AAAA" },
        step: "review",
      });
    },
    { local: true },
  );
  ctx.view = { page: "builder-plus", id: "q", tab: "quick" };
  const review = mount(route.render(ctx));
  route.bind(review, ctx);
  const form = review.querySelector("[data-bp-create]");
  form.querySelector = () => null;
  await form.events.submit({ preventDefault() {}, currentTarget: form });
  const row = D.quickOf(ctx.state, "q", "player");
  assert.equal(row.status, "done");
  assert.deepEqual(row.portrait, { kind: "emblem", id: "emblem-steel" });
  assert.equal(D.sliceOf(ctx.state).origins[row.actorId].emblem, "emblem-steel");
});

test("switching to step by step mid-path carries the choices made so far into the builder", async () => {
  const h = harness();
  const { ctx } = h;
  ctx.commit(
    "quick",
    (s) => {
      createCharacterDraft(s, { id: "p", kind: "create" }, "player");
      D.startQuick(s, "p", "player");
      D.updateQuick(s, "p", "player", { classId: "wizard", name: "Ada", step: "background" });
    },
    { local: true },
  );
  ctx.view = { page: "builder-plus", id: "p", tab: "quick" };
  const route = h.registry.get("route", "builder-plus", ctx);
  const root = mount(route.render(ctx));
  route.bind(root, ctx);
  await click(root.querySelector("[data-bp-to-builder]"));
  const draft = ctx.state.characterDrafts.find((d) => d.id === "p");
  assert.equal(draft.data.classes[0].classId, "wizard");
  assert.equal(draft.data.identity.name, "Ada");
  assert.equal(draft.section, "origin", "the builder continues where the quick path stopped");
  assert.equal(D.quickOf(ctx.state, "p", "player").status, "moved");
  assert.deepEqual(h.navigations.at(-1), { page: "builder", id: "p", tab: "origin" });
});

test("co-building offline: Publish is refused with a message, the typed text is kept as a local edit", async () => {
  const h = harness();
  const { ctx } = h;
  ctx.commit("draft", (s) => createCharacterDraft(s, { id: "cd", kind: "create" }, "player"), {
    local: true,
  });
  ctx.commit("cb", (s) => D.startCobuild(s, "player", { id: "cb", draftId: "cd" }), {
    undoable: false,
  });
  ctx.view = { page: "builder-plus", id: "cb", tab: "cobuild" };
  const route = h.registry.get("route", "builder-plus", ctx);
  let root = mount(route.render(ctx));
  route.bind(root, ctx);
  const input = root.querySelector('[data-bp-field="backstory"]');
  input.value = "Cresciuta al faro";
  input.events.input();
  ctx.offline = true;
  let form = root.querySelector("[data-bp-coform]");
  await form.events.submit({ preventDefault() {}, currentTarget: form });
  const row = D.cobuildOf(ctx.state).sessions.cb;
  assert.equal(row.fields.backstory.rev, 0, "nothing shared while offline");
  assert.equal(row.local.player.backstory.value, "Cresciuta al faro", "kept as a local edit");
  assert.equal(h.toasts.at(-1).error, true);
  ctx.offline = false;
  root = mount(route.render(ctx));
  route.bind(root, ctx);
  form = root.querySelector("[data-bp-coform]");
  await form.events.submit({ preventDefault() {}, currentTarget: form });
  assert.equal(D.cobuildOf(ctx.state).sessions.cb.fields.backstory.value, "Cresciuta al faro");
});
