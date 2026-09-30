// B54 — downtime projects and non-class tracks. Real store and registry (seed, commit,
// Undo, reload), the same handlers the bound controls call, synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { advanceGameTime } from "../rest-time.mjs";
import { renderCharacters } from "../characters.mjs";
import { knownLanguages } from "../chat-domain.mjs";
import { describeRoll } from "../dice-3d-domain.mjs";
import * as crafting from "../crafting.mjs";
import * as projects from "../projects.mjs";

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
function form(fields = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields))
    for (const entry of [].concat(value)) data.append(key, String(entry));
  return data;
}
function harness({ role = "player", lang = "it", setup = null } = {}) {
  const storage = memory();
  const emitted = [];
  const boot = () => {
    const registry = createRegistry();
    registry.use("projects", projects.register);
    registry.on("roll-accepted", (payload) => emitted.push(payload));
    const store = createStore({ storage });
    setup?.(store.state);
    if (registry.initState(store.state).changed) store.persist();
    return { registry, store };
  };
  let { registry, store } = boot();
  const toasts = [],
    dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "characters", id: "livia", tab: "projects" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? (value[ctx.lang] ?? value.it ?? value.en ?? "")
        : String(value ?? ""),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {
      ctx.rendered = (ctx.rendered ?? 0) + 1;
    },
    navigate(page, params) {
      ctx.navigated = { page, params };
    },
    openGameTime() {
      ctx.openedTime = true;
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("You are offline"), {
          it: "Sei senza rete: questa modifica condivisa non può essere applicata.",
          en: "You are offline: this shared change cannot be applied.",
        });
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      if (options.afterCommit) {
        options.afterCommit(store.state);
        store.persist();
      }
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
  };
  Object.defineProperty(ctx, "registry", { get: () => registry });
  return {
    ctx,
    toasts,
    dialogs,
    emitted,
    get store() {
      return store;
    },
    get slice() {
      return store.state.ext.projects;
    },
    get records() {
      return store.state.ext["projects-records"];
    },
    reload() {
      ({ registry, store } = boot());
    },
    submit(fields) {
      const dialog = dialogs.at(-1);
      assert.ok(dialog, "no dialog open");
      return dialog.options.onSubmit(form(fields));
    },
    run: (action, data = {}, fields = null) =>
      projects.handleProjectsAction(ctx, action, data, fields ? form(fields) : null),
    as(role) {
      ctx.role = role;
      return this;
    },
  };
}
// Livia already speaks Elvish in the Chat (B17 Polyglot fixture) and in the Party sheet:
// the seeded "Learn Elvish" project belongs to Mira, who does not (B54 review, finding 1).
const ELVISH = "project-mira-elvish";
const elvish = (h) => h.slice.projects.find((row) => row.id === ELVISH);
const errors = (h) => h.toasts.filter((row) => row.error).map((row) => row.text);
function advance(h, hours, id = "adv-" + hours + "-" + Math.random().toString(36).slice(2)) {
  const role = h.ctx.role;
  h.ctx.role = "dm";
  h.ctx.commit("Tempo narrativo", (s) =>
    advanceGameTime(s, { id, campaignId: "lanterns", seconds: hours * 3600 }, "dm"),
  );
  h.ctx.role = role;
}

test("seed: Mira studies Elvish with session 12 downtime; Livia's sparks and Mira's herbalism kit", () => {
  const h = harness();
  const project = elvish(h);
  assert.equal(project.title.it, "Imparare l'Elfico");
  assert.equal(project.actorId, "mira");
  // Coherent with Chat and Party: the learner does not already know the language.
  assert.ok(!knownLanguages(h.store.state, "mira").includes("elvish"));
  assert.ok(knownLanguages(h.store.state, "livia").includes("elvish"));
  assert.deepEqual(
    project.steps.map((step) => step.kind),
    ["milestone", "time", "check"],
  );
  assert.equal(projects.currentStep(project).id, "s2");
  assert.equal(projects.stepProgress(project, project.steps[1]).value, 16);
  const budget = projects.timeBudget(h.store.state, h.slice, "mira");
  assert.deepEqual(
    [
      budget.campaign,
      budget.clock,
      budget.fromClock,
      budget.granted,
      budget.used,
      budget.available,
    ],
    [true, 0, 0, 16, 16, 0],
  );
  const livia = h.store.state.actors.livia;
  assert.equal(livia.inventory.find((row) => row.id === "projects-livia-sparks").quantity, 2);
  const mira = h.store.state.actors.mira;
  assert.ok(mira.inventory.some((row) => row.srdId === "srd2024:item:herbalism-kit"));
  assert.equal(mira.inventory.find((row) => row.id === "projects-mira-herbs").quantity, 6);
  // Seeding again never duplicates rows (the seed only adds absent records).
  const again = projects.seedProjects(h.store.state);
  assert.equal(livia.inventory.filter((row) => row.id === "projects-livia-sparks").length, 1);
  assert.equal(again.projects.length, 1);
});

test("working hours from the clock: 8 per day, up to 8 in the current day", () => {
  assert.equal(projects.workableHours(0), 0);
  assert.equal(projects.workableHours(3 * 3600), 3);
  assert.equal(projects.workableHours(8 * 3600), 8);
  assert.equal(projects.workableHours(20 * 3600), 8);
  assert.equal(projects.workableHours(24 * 3600), 8);
  assert.equal(projects.workableHours(32 * 3600), 16);
  assert.equal(projects.workableHours(72 * 3600), 24);
});

test("acceptance 1: Learn Elvish — steps, bar and time spent from the clock, reload, Undo", () => {
  const h = harness();
  // No hours yet: the command refuses with the reason (the button is disabled with it).
  h.run("time", { project: ELVISH });
  assert.match(errors(h).at(-1), /Nessuna ora disponibile/);
  assert.equal(h.dialogs.length, 0);
  h.toasts.length = 0;
  h.ctx.role = "player";
  let html = projects.renderDowntime(h.ctx, h.store.state.actors.mira);
  assert.match(html, /Nessuna ora disponibile/);
  assert.match(html, /data-projects-action="time"[^>]* disabled/);
  // The DM advances the campaign clock by one day: 8 working hours become available.
  advance(h, 24);
  const budget = projects.timeBudget(h.store.state, h.slice, "mira");
  assert.equal(budget.fromClock, 8);
  assert.equal(budget.available, 8);
  h.run("time", { project: ELVISH });
  assert.equal(h.dialogs.at(-1).title, "Dedica tempo");
  assert.match(h.dialogs.at(-1).body, /value="8"/);
  h.submit({ hours: 8, note: "Lezione con Syl" });
  let project = elvish(h);
  assert.equal(projects.stepProgress(project, project.steps[1]).value, 24);
  assert.equal(project.work.at(-1).clockAt, 86400);
  assert.equal(projects.projectSpentHours(project), 24);
  assert.equal(projects.timeBudget(h.store.state, h.slice, "mira").available, 0);
  html = projects.renderDowntime(h.ctx, h.store.state.actors.mira);
  assert.match(html, /24 \/ 80 h/);
  assert.match(html, /Tempo speso: 24 h · ultimo lavoro: orologio giorno 2, 00:00/);
  assert.match(html, /aria-label="Passi completati: 1 di 3"/);
  assert.ok(h.slice.log.some((row) => /16 → 24 \/ 80 h/.test(row.text.it)));
  // More than available is refused and changes nothing.
  assert.throws(
    () =>
      projects.dedicateTime(structuredClone(h.store.state), structuredClone(h.slice), "player", {
        projectId: ELVISH,
        hours: 1,
      }),
    /Working hours available: 0/,
  );
  // Undo removes the 8 hours (the clock advance was the DM's own change).
  h.ctx.undo();
  project = elvish(h);
  assert.equal(projects.stepProgress(project, project.steps[1]).value, 16);
  assert.equal(projects.timeBudget(h.store.state, h.slice, "mira").available, 8);
  assert.equal(h.store.state.log.at(-1).kind, "correction");
  // Dedicated again, a reload keeps everything (the Undo stack is per visit).
  h.run("time", { project: ELVISH });
  h.submit({ hours: 8 });
  h.reload();
  project = elvish(h);
  assert.equal(projects.stepProgress(project, project.steps[1]).value, 24);
  assert.equal(project.work.at(-1).clockAt, 86400);
});

test("completion: DM grant, study, physical check; the language lands in Features; roll evidence and reuse after Undo", () => {
  const h = harness({ role: "dm" });
  h.run("grant", { actor: "mira" });
  assert.equal(h.dialogs.at(-1).title, "Concedi o togli tempo libero");
  assert.throws(() => h.submit({ hours: 64, reason: "" }), /reason/);
  h.submit({ hours: 64, reason: "Una settimana a Bruma tra le sessioni" });
  assert.equal(projects.timeBudget(h.store.state, h.slice, "mira").available, 64);
  h.as("player");
  // The player cannot grant campaign downtime.
  assert.throws(
    () =>
      projects.grantTime(h.store.state, h.slice, "player", {
        actorIds: ["mira"],
        hours: 8,
        reason: "x",
      }),
    /Only the DM grants downtime/,
  );
  h.run("time", { project: ELVISH });
  h.submit({ hours: 64 });
  let project = elvish(h);
  assert.equal(projects.currentStep(project).kind, "check");
  // Physical d20: 12 + 1 (Mira's Intelligence 12) = 13 vs DC 10 → success → completed.
  h.run("check", { project: ELVISH });
  assert.match(h.dialogs.at(-1).body, /d20 \+ 1/);
  h.submit({ mode: "physical", face: 12 });
  project = elvish(h);
  assert.equal(project.status, "completed");
  const mira = h.store.state.actors.mira;
  // The learned language joins the languages Chat and Party already know (B17 fixture):
  // Common, Gnomish and Halfling stay (B54 review, finding 1).
  assert.deepEqual(mira.languages, ["common", "gnomish", "halfling", "elvish"]);
  assert.deepEqual(knownLanguages(h.store.state, "mira"), [
    "common",
    "gnomish",
    "halfling",
    "elvish",
  ]);
  const feature = mira.features.find((row) => row.projectId === project.id);
  assert.equal(feature.name.it, "Lingua: Elfico");
  const record = h.records.rolls.at(-1);
  assert.deepEqual(
    [record.mode, record.values[0], record.total, record.success],
    ["physical", 12, 13, true],
  );
  const entry = h.store.state.log.find((row) => row.id === record.logId);
  assert.equal(entry.rolls[0].source, "projects");
  assert.equal(entry.rolls[0].dc, 10);
  assert.equal(h.emitted.at(-1).roll.total, 13);
  // Undo: the project reopens, the roll stays as evidence; the language leaves the sheet.
  h.ctx.undo();
  project = elvish(h);
  assert.equal(project.status, "active");
  assert.equal(h.store.state.actors.mira.languages, undefined);
  assert.deepEqual(knownLanguages(h.store.state, "mira"), ["common", "gnomish", "halfling"]);
  assert.ok(h.records.rolls.some((row) => row.id === record.id));
  // A digital retry of the same attempt after a physical roll rolls a new face.
  const digital = projects.rollCheck(h.ctx, ELVISH, { mode: "digital" });
  assert.equal(digital.record.status, "accepted");
  const faces = digital.record.values;
  h.ctx.undo();
  // After Undo the identical digital retry reuses the withdrawn faces once.
  h.ctx.rollDie = () => (faces[0] === 20 ? 1 : 20);
  const retry = projects.rollCheck(h.ctx, ELVISH, { mode: "digital" });
  assert.equal(retry.record.status, "reused");
  assert.deepEqual(retry.record.values, faces);
  assert.equal(retry.record.reusedFrom, digital.record.id);
  const html = projects.renderDowntime(h.ctx, h.store.state.actors.mira);
  assert.match(html, /is-withdrawn/);
});

test("custom project: Crash's fixed value, milestone step, pause, DM correction and abandon", () => {
  const h = harness();
  h.run("new-project", { actor: "livia" });
  assert.match(h.dialogs.at(-1).body, /Imparare una lingua/);
  h.submit({
    type: "custom",
    title: "Mappa della torre",
    stepKind: "fixed",
    stepLabel: "Stanze disegnate",
    increase: 2,
    target: 6,
  });
  let project = h.slice.projects.at(-1);
  assert.equal(project.kind, "custom");
  assert.deepEqual([project.steps[0].increase, project.steps[0].target], [2, 6]);
  h.run("fixed", { project: project.id });
  h.run("fixed", { project: project.id });
  project = h.slice.projects.at(-1);
  assert.equal(project.steps[0].value, 4);
  h.run("add-step", { project: project.id });
  h.submit({ stepKind: "milestone", stepLabel: "Mostrare la mappa a Doran" });
  h.run("pause", { project: project.id });
  h.run("fixed", { project: project.id });
  assert.match(errors(h).at(-1), /in pausa/);
  h.run("resume", { project: project.id });
  h.run("fixed", { project: project.id });
  project = h.slice.projects.at(-1);
  assert.equal(projects.currentStep(project).kind, "milestone");
  // The player cannot correct; the DM corrects with a reason, without spending time.
  assert.throws(
    () =>
      projects.correctStep(h.store.state, h.slice, "player", {
        projectId: project.id,
        stepId: "s1",
        value: 2,
        reason: "x",
      }),
    /Only the DM corrects/,
  );
  h.as("dm").run("correct", { project: project.id });
  h.submit({ step: "s1", value: 2, reason: "Due stanze erano solo abbozzate" });
  project = h.slice.projects.at(-1);
  assert.equal(project.steps[0].value, 2);
  assert.equal(project.corrections.at(-1).reason, "Due stanze erano solo abbozzate");
  h.as("player").run("abandon", { project: project.id });
  assert.throws(() => h.submit({ reason: " " }), /reason/);
  h.submit({ reason: "La torre è crollata" });
  project = h.slice.projects.at(-1);
  assert.equal(project.status, "abandoned");
  assert.equal(project.abandoned.reason, "La torre è crollata");
  const html = projects.renderDowntime(h.ctx, h.store.state.actors.livia);
  assert.match(html, /Conclusi \(1\)/);
  // A milestone project completes when marked.
  const quick = projects.createProject(h.store.state, h.slice, "player", {
    actorId: "livia",
    title: "Lettera",
    step: { kind: "milestone", label: "Spedirla" },
  });
  assert.equal(quick.steps[0].kind, "milestone");
});

test("activities: language and tool training titles, duplicates refused, controllers only", () => {
  const h = harness();
  h.run("new-project", { actor: "mira" });
  assert.throws(
    () => h.submit({ type: "learn-language", language: "elvish" }),
    /already under way/,
  );
  // Livia already speaks Elvish (Chat and Party, B17 fixture): not offered, and refused.
  h.run("new-project", { actor: "livia" });
  assert.doesNotMatch(h.dialogs.at(-1).body, /value="elvish"/);
  assert.doesNotMatch(h.dialogs.at(-1).body, /value="draconic"/);
  assert.match(h.dialogs.at(-1).body, /value="dwarvish"/);
  assert.throws(
    () => h.submit({ type: "learn-language", language: "elvish" }),
    /already knows this language/,
  );
  h.run("new-project", { actor: "livia" });
  h.submit({ type: "tool-training", tool: "herbalism-kit" });
  const training = h.slice.projects.at(-1);
  assert.equal(training.title.it, "Addestramento: Borsa da erborista");
  assert.equal(training.steps[2].ability, "int");
  // Doran is the DM's character: the player cannot start his projects.
  assert.throws(
    () =>
      projects.createProject(h.store.state, h.slice, "player", {
        actorId: "doran",
        activityId: "learn-language",
        param: "dwarvish",
      }),
    /You do not control this character/,
  );
  const dwarvish = projects.projectFromActivity(projects.ACTIVITIES[0], {
    actorId: "doran",
    param: "dwarvish",
  });
  assert.equal(dwarvish.title.it, "Imparare il Nanico");
  assert.equal(dwarvish.title.en, "Learn Dwarvish");
});

test("offline: shared downtime is refused; personal notes save and survive Undo; notes are private", () => {
  const h = harness();
  advance(h, 8);
  h.ctx.offline = true;
  h.run("time", { project: ELVISH });
  assert.throws(() => h.submit({ hours: 8 }), /offline/);
  assert.equal(projects.projectSpentHours(elvish(h)), 16);
  h.run("note", { project: ELVISH }, { note: "Chiedere a Syl dei verbi" });
  assert.equal(h.records.notes.player[ELVISH], "Chiedere a Syl dei verbi");
  h.ctx.offline = false;
  h.run("time", { project: ELVISH });
  h.submit({ hours: 8 });
  h.ctx.undo();
  assert.equal(h.records.notes.player[ELVISH], "Chiedere a Syl dei verbi");
  const mine = projects.renderDowntime(h.ctx, h.store.state.actors.mira);
  assert.match(mine, /Chiedere a Syl dei verbi/);
  h.as("dm");
  const dm = projects.renderDowntime(h.ctx, h.store.state.actors.mira);
  assert.doesNotMatch(dm, /Chiedere a Syl dei verbi/);
  assert.match(dm, /Concedi o togli tempo/);
  assert.match(dm, /Fai passare il tempo/);
  assert.match(dm, /data-projects-action="correct"/);
  h.run("advance-clock");
  assert.equal(h.ctx.openedTime, true);
});

test("private sheet: personal time recorded by its owner, local and offline, invisible to the DM", () => {
  const h = harness({
    setup: (state) => {
      state.actors.zara = {
        ...structuredClone(state.actors.livia),
        id: "zara",
        name: "Zara",
        visibility: "private",
        campaignIds: [],
        inventory: [],
        features: [],
      };
    },
  });
  h.ctx.offline = true;
  h.run("new-project", { actor: "zara" });
  h.submit({
    type: "custom",
    title: "Diario di viaggio",
    stepKind: "time",
    stepLabel: "Scrittura",
    hours: 10,
  });
  const project = h.slice.projects.at(-1);
  assert.equal(h.store.state.log.at(-1).visibility, "private");
  const before = projects.timeBudget(h.store.state, h.slice, "zara");
  assert.equal(before.campaign, false);
  h.run("grant", { actor: "zara" });
  assert.equal(h.dialogs.at(-1).title, "Registra tempo personale");
  h.submit({ hours: 6, reason: "Tre sere in locanda" });
  h.run("time", { project: project.id });
  h.submit({ hours: 6 });
  assert.equal(projects.projectSpentHours(h.slice.projects.at(-1)), 6);
  assert.equal(h.slice.projects.at(-1).work[0].clockAt, null);
  h.ctx.offline = false;
  // The DM cannot record personal time or read the private sheet.
  assert.throws(
    () =>
      projects.grantTime(h.store.state, h.slice, "dm", {
        actorIds: ["zara"],
        hours: 1,
        reason: "x",
      }),
    /Character unavailable/,
  );
});

test("acceptance 3: non-class track with prerequisites — unlock, story gate, refund, Undo", () => {
  const h = harness();
  let view = projects.trackView(h.store.state, h.slice, "livia");
  const state = (id) => view.nodes.find((row) => row.id === id);
  assert.equal(view.count, 2);
  assert.equal(state("steady-flame").available, true);
  assert.equal(state("guiding-beam").available, false);
  assert.match(state("guiding-beam").missing[0].it, /Richiede «Fiamma salda»/);
  const heart = state("lantern-heart")
    .missing.map((row) => row.en)
    .join(" | ");
  assert.match(heart, /Requires “Guiding beam”/);
  assert.match(heart, /Level 5 \(now 3\)/);
  assert.match(heart, /Opens with the story/);
  // Unlocking a locked node is refused with its prerequisites.
  h.run("unlock", { actor: "livia", node: "guiding-beam" });
  assert.match(errors(h).at(-1), /Prerequisiti mancanti/);
  h.run("unlock", { actor: "livia", node: "steady-flame" });
  view = projects.trackView(h.store.state, h.slice, "livia");
  assert.equal(view.count, 1);
  assert.equal(state("guiding-beam").available, true);
  const livia = () => h.store.state.actors.livia;
  assert.ok(livia().features.some((row) => row.id === "projects-track-lantern-favor-steady-flame"));
  h.run("unlock", { actor: "livia", node: "guiding-beam" });
  view = projects.trackView(h.store.state, h.slice, "livia");
  assert.equal(view.count, 0);
  assert.ok(!livia().inventory.some((row) => row.id === "projects-livia-sparks"));
  assert.match(state("warm-glow").missing[0].it, /Servono 1 × Scintilla di lanterna \(ne hai 0\)/);
  // Story gate: DM only.
  assert.throws(
    () => projects.setStoryGate(h.store.state, h.slice, "player", { actorId: "livia", open: true }),
    /Only the DM opens/,
  );
  h.as("dm").run("story-gate", { actor: "livia", open: "1" });
  view = projects.trackView(h.store.state, h.slice, "livia");
  assert.ok(!state("lantern-heart").missing.some((row) => /story/.test(row.en)));
  // Refund needs no dependent boon and a reason; the spark comes back with its row id.
  h.run("refund-node", { actor: "livia", node: "steady-flame" });
  assert.throws(() => h.submit({ reason: "Errore" }), /Refund “Guiding beam” first/);
  h.run("refund-node", { actor: "livia", node: "guiding-beam" });
  h.submit({ reason: "Scintilla usata per sbaglio" });
  assert.equal(livia().inventory.find((row) => row.id === "projects-livia-sparks").quantity, 1);
  assert.ok(
    !livia().features.some((row) => row.id === "projects-track-lantern-favor-guiding-beam"),
  );
  h.ctx.undo();
  assert.ok(livia().features.some((row) => row.id === "projects-track-lantern-favor-guiding-beam"));
  // The player's unlock is undone by the player: the spark returns.
  h.as("player");
  h.reload();
  view = projects.trackView(h.store.state, h.slice, "livia");
  assert.equal(view.assignment.unlocked.length, 2);
  assert.equal(view.assignment.storyGate, true);
});

test("tracks: DM assigns and removes; the Boons tab follows role and assignment", () => {
  const h = harness({ role: "dm" });
  const mira = h.store.state.actors.mira;
  const tab = h.ctx.registry.get("sheet-tab", projects.TRACK_TAB);
  assert.equal(tab.when(h.ctx, mira), true);
  h.as("player");
  assert.equal(tab.when(h.ctx, mira), false);
  assert.equal(tab.when(h.ctx, h.store.state.actors.livia), true);
  h.as("dm").run("assign-track", { actor: "mira" }, { track: "lantern-favor" });
  assert.equal(h.slice.assignments.mira.trackId, "lantern-favor");
  h.as("player");
  assert.equal(tab.when(h.ctx, h.store.state.actors.mira), true);
  assert.throws(
    () => projects.unassignTrack(h.store.state, h.slice, "player", { actorId: "mira" }),
    /Only the DM removes/,
  );
  h.as("dm").run("unassign-track", { actor: "mira" });
  assert.equal(h.slice.assignments.mira, undefined);
  const html = projects.renderTrack(h.ctx, h.store.state.actors.mira);
  assert.match(html, /Assegna traccia/);
});

test("UI: sheet tabs in the character page, EN labels, campaign overview and command", () => {
  const h = harness({ lang: "en" });
  const page = renderCharacters(h.ctx);
  assert.match(page, /data-character-tab="projects"/);
  assert.match(page, /Downtime/);
  assert.match(page, /Working hours available/);
  // B62: Downtime is a sub-section of Extras, the tracked gifts one of Features & Traits
  // (D&D Beyond's sheet sections); each keeps its own data-character-tab handle.
  assert.match(page, /data-character-tab="extras"[^>]*aria-current="page"/);
  const view = h.ctx.view;
  h.ctx.view = { ...view, tab: "features" };
  assert.match(renderCharacters(h.ctx), /data-character-tab="projects-track"/);
  h.ctx.view = view;
  h.ctx.view = { page: "characters", id: "mira", tab: "projects" };
  assert.match(renderCharacters(h.ctx), /Learn Elvish/);
  h.ctx.view = { page: "characters", id: "livia", tab: "projects" };
  const track = projects.renderTrack(h.ctx, h.store.state.actors.livia);
  assert.match(track, /Lantern&#39;s Favour|Lantern's Favour/);
  assert.match(track, /Unlock \(spend 1 × Lantern spark\)/);
  const overview = projects.renderCampaignDowntime(h.ctx);
  assert.match(overview, /Party downtime/);
  assert.match(overview, /Livia/);
  assert.match(overview, /Mira/);
  assert.doesNotMatch(overview, /Grant or withhold party time/);
  h.as("dm");
  assert.match(projects.renderCampaignDowntime(h.ctx), /Grant or withhold party time/);
  h.run("grant-party");
  h.submit({ actor: ["livia", "mira"], hours: 8, reason: "Festa delle lanterne" });
  assert.equal(projects.timeBudget(h.store.state, h.slice, "mira").granted, 24);
  assert.equal(projects.timeBudget(h.store.state, h.slice, "livia").granted, 8);
  h.run("open-sheet", { actor: "mira" });
  assert.deepEqual(h.ctx.navigated, {
    page: "characters",
    params: { id: "mira", tab: "projects" },
  });
  h.ctx.registry.get("command", "projects.open").run(h.ctx);
  assert.deepEqual(h.ctx.navigated, {
    page: "characters",
    params: { id: "livia", tab: "projects" },
  });
  // The DM dismisses a change-log entry (Crash's Change Log).
  const entry = h.slice.log.at(-1);
  h.run("dismiss", { entry: entry.id });
  assert.equal(h.slice.log.at(-1).dismissed, true);
  h.as("player");
  assert.throws(() => projects.dismissLog(h.slice, "player", entry.id), /Only the DM hides/);
});

test("notification: the owner is told when hours wait for a project (B24 bell)", () => {
  const h = harness();
  assert.deepEqual(projects.collectDowntimeNotices(h.ctx), []);
  advance(h, 24);
  const notices = projects.collectDowntimeNotices(h.ctx);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].title.it, "Mira: 8 h di tempo libero");
  assert.equal(notices[0].body.it, "Da dedicare a «Imparare l'Elfico»");
  assert.deepEqual(notices[0].target, { kind: "sheet", actorId: "mira", tab: "projects" });
  // The DM does not own Mira: no notice for the DM about her.
  h.as("dm");
  assert.ok(!projects.collectDowntimeNotices(h.ctx).some((row) => row.id.includes("mira")));
  // Once the hours are dedicated the notice is gone.
  h.as("player").run("time", { project: ELVISH });
  h.submit({ hours: 8 });
  assert.deepEqual(projects.collectDowntimeNotices(h.ctx), []);
});

// ---------------------------------------------------------------- B54 review fixes

function completeElvish(h, face = 12) {
  const role = h.ctx.role;
  h.as("dm").run("grant", { actor: "mira" });
  h.submit({ hours: 64, reason: "Una settimana a Bruma tra le sessioni" });
  h.as("player").run("time", { project: ELVISH });
  h.submit({ hours: 64 });
  const result = projects.rollCheck(h.ctx, ELVISH, { mode: "physical", face });
  h.ctx.role = role;
  return result;
}

test("review 1: languages stay coherent with Chat and Party; completion never drops a known one", () => {
  const h = harness();
  // Livia's languages come from the Chat fixture (Common, Elvish, Draconic): a project for
  // a language she knows is refused, a new one keeps the others when completed.
  assert.throws(
    () =>
      projects.createProject(h.store.state, h.slice, "player", {
        actorId: "livia",
        activityId: "learn-language",
        param: "draconic",
      }),
    /already knows this language/,
  );
  h.run("new-project", { actor: "livia" });
  h.submit({ type: "learn-language", language: "dwarvish" });
  const dwarvish = h.slice.projects.at(-1);
  assert.equal(dwarvish.title.it, "Imparare il Nanico");
  h.as("dm").run("grant", { actor: "livia" });
  h.submit({ hours: 80, reason: "Inverno a Bruma" });
  h.as("player").run("milestone", { project: dwarvish.id });
  h.run("time", { project: dwarvish.id });
  h.submit({ hours: 80 });
  projects.rollCheck(h.ctx, dwarvish.id, { mode: "physical", face: 10 });
  assert.equal(h.slice.projects.at(-1).status, "completed");
  assert.deepEqual(knownLanguages(h.store.state, "livia"), [
    "common",
    "elvish",
    "draconic",
    "dwarvish",
  ]);
});

test("review 2: the project check is presented as a check with its DC (B56 BG3 screen, CRP-131)", () => {
  const h = harness();
  completeElvish(h);
  const roll = h.emitted.at(-1).roll;
  const mine = describeRoll(h.store.state, roll, "player");
  assert.equal(mine.layout, "check");
  assert.equal(mine.dc, 10);
  assert.equal(mine.success, true);
  assert.equal(mine.verdict.it, "Successo");
  assert.equal(mine.title.it, "Imparare l'Elfico · Conversazione di prova");
  assert.ok(mine.lines.some((line) => line.it === "Intelligenza +1"));
  // Anyone else's roll tumbles on the table without holding clicks (B61).
  assert.equal(describeRoll(h.store.state, roll, "dm").layout, "tumble");
});

test("review 3: the DM withholds clock downtime with a reason (DM discretion), never below zero", () => {
  const h = harness();
  // Three days of forced march: the clock alone would give Livia 24 working hours.
  advance(h, 72);
  assert.equal(projects.timeBudget(h.store.state, h.slice, "livia").available, 24);
  h.as("dm").run("grant", { actor: "livia" });
  assert.equal(h.dialogs.at(-1).title, "Concedi o togli tempo libero");
  assert.match(h.dialogs.at(-1).body, /name="mode" value="withhold"/);
  h.submit({ mode: "withhold", hours: 24, reason: "Tre giorni di marcia: nessun tempo libero" });
  let budget = projects.timeBudget(h.store.state, h.slice, "livia");
  assert.deepEqual([budget.granted, budget.available], [-24, 0]);
  assert.match(
    h.slice.log.at(-1).text.it,
    /Tempo libero tolto dal DM: 24 h · Tre giorni di marcia/,
  );
  assert.match(projects.renderDowntime(h.ctx, h.store.state.actors.livia), /−24 h · Tre giorni/);
  // Never more than the hours still available (Mira: 24 from the clock).
  h.run("grant", { actor: "mira" });
  assert.throws(
    () => h.submit({ mode: "withhold", hours: 30, reason: "Marcia" }),
    /Mira: at most 24 h can be withheld/,
  );
  // The whole party at once, from the campaign section.
  h.run("grant-party");
  h.submit({ actor: ["mira"], mode: "withhold", hours: 8, reason: "Guardia notturna" });
  assert.equal(projects.timeBudget(h.store.state, h.slice, "mira").available, 16);
  // The player never withholds campaign time.
  assert.throws(
    () =>
      projects.grantTime(h.store.state, h.slice, "player", {
        actorIds: ["mira"],
        hours: -1,
        reason: "x",
      }),
    /Only the DM grants downtime/,
  );
  // Undo gives the hours back.
  h.ctx.undo();
  h.ctx.undo();
  budget = projects.timeBudget(h.store.state, h.slice, "livia");
  assert.equal(budget.available, 24);
});

test("review 4: a DM correction reopens a completed study and withdraws its benefit", () => {
  const h = harness();
  completeElvish(h);
  assert.equal(elvish(h).status, "completed");
  // The player cannot correct; the DM sees Correct on the closed project.
  assert.doesNotMatch(
    projects.renderDowntime(h.ctx, h.store.state.actors.mira),
    /data-projects-action="correct"/,
  );
  h.as("dm");
  assert.match(
    projects.renderDowntime(h.ctx, h.store.state.actors.mira),
    /data-projects-action="correct" data-project="project-mira-elvish"/,
  );
  h.run("correct", { project: ELVISH });
  h.submit({ step: "s3", value: 0, reason: "Faccia del dado fisico inserita male" });
  const project = elvish(h);
  assert.equal(project.status, "active");
  assert.equal(project.benefit, null);
  const mira = h.store.state.actors.mira;
  assert.ok(!mira.features.some((row) => row.projectId === ELVISH));
  assert.deepEqual(knownLanguages(h.store.state, "mira"), ["common", "gnomish", "halfling"]);
  assert.match(h.slice.log.at(-1).text.it, /riaperto, beneficio tolto/);
  assert.equal(projects.currentStep(project).id, "s3");
  // The player tries again and completes it: the language comes back once.
  h.as("player");
  projects.rollCheck(h.ctx, ELVISH, { mode: "physical", face: 15 });
  assert.equal(elvish(h).status, "completed");
  assert.deepEqual(knownLanguages(h.store.state, "mira"), [
    "common",
    "gnomish",
    "halfling",
    "elvish",
  ]);
  // Tool training: the proficiency leaves the sheet and the recipe book refuses it again.
  h.as("dm").run("grant", { actor: "livia" });
  h.submit({ hours: 80, reason: "Apprendistato" });
  h.as("player").run("new-project", { actor: "livia" });
  h.submit({ type: "tool-training", tool: "herbalism-kit" });
  const training = h.slice.projects.at(-1);
  h.run("milestone", { project: training.id });
  h.run("time", { project: training.id });
  h.submit({ hours: 80 });
  projects.rollCheck(h.ctx, training.id, { mode: "physical", face: 18 });
  assert.ok(crafting.toolProficiencies(h.store.state.actors.livia).has("herbalism-kit"));
  h.as("dm").run("correct", { project: training.id });
  h.submit({ step: "s2", value: 40, reason: "Metà delle ore erano viaggio" });
  assert.equal(h.slice.projects.at(-1).status, "active");
  assert.ok(!crafting.toolProficiencies(h.store.state.actors.livia).has("herbalism-kit"));
});

test("review 7: sparks the DM hands out as loot count in either language (B26 custom item)", async () => {
  const { customItem, giveItemToActor } = await import("../party-stash.mjs");
  const h = harness();
  const track = projects.trackById("lantern-favor");
  h.ctx.commit("Bottino", (s) => {
    // The DM writes the loot in Italian (the default language): the name is the same text
    // in both languages, like every custom loot row.
    giveItemToActor(s.actors.livia, customItem({ name: "Scintilla di lanterna", quantity: 2 }));
    giveItemToActor(s.actors.livia, customItem({ name: " lantern spark ", quantity: 1 }));
  });
  assert.equal(projects.currencyCount(h.store.state.actors.livia, track), 5);
  // Spent sparks come from those rows too.
  h.run("unlock", { actor: "livia", node: "steady-flame" });
  h.run("unlock", { actor: "livia", node: "warm-glow" });
  h.run("unlock", { actor: "livia", node: "guiding-beam" });
  h.run("unlock", { actor: "livia", node: "shared-warmth" });
  assert.equal(projects.currencyCount(h.store.state.actors.livia, track), 1);
});

test("review 1b: a recorded language outside the catalog is kept when a study completes or reopens", () => {
  const h = harness();
  h.ctx.commit("Lingue di Mira", (s) => {
    s.actors.mira.languages = ["common", "druidic"];
  });
  completeElvish(h);
  assert.deepEqual(h.store.state.actors.mira.languages, ["common", "druidic", "elvish"]);
  h.as("dm").run("correct", { project: ELVISH });
  h.submit({ step: "s3", value: 0, reason: "Tiro da ripetere" });
  assert.deepEqual(h.store.state.actors.mira.languages, ["common", "druidic"]);
});
