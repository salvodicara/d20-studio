// B48 — Deep homebrew editor. Real store and registry (seed, commit, Undo, reload) with
// the compendium roll service it records through; the handlers are the ones the bound
// controls call. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { advanceTurn } from "../combat.mjs";
import * as compendium from "../compendium.mjs";
import * as hb from "../homebrew.mjs";
import * as D from "../homebrew-editor-domain.mjs";
import * as UI from "../homebrew-editor.mjs";

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
function harness({ role = "player", lang = "it" } = {}) {
  const storage = memory();
  const boot = () => {
    const registry = createRegistry();
    registry.use("compendium", compendium.register);
    registry.use("homebrew-editor", UI.register);
    const store = createStore({ storage });
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
    view: { page: "library", tab: "homebrew-editor", id: "", revision: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? value[ctx.lang] || value.it || value.en || ""
        : String(value ?? ""),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    navigate(page, params = {}) {
      ctx.view = { id: "", tab: "", revision: "", ...params, page };
    },
    openSheet(id, tab) {
      ctx.opened = { id, tab };
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("You are offline"), {
          it: "Sei senza rete.",
          en: "You are offline.",
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
  registry.attach(ctx);
  const h = {
    ctx,
    toasts,
    dialogs,
    get store() {
      return store;
    },
    get slice() {
      return store.state.ext["homebrew-editor"];
    },
    reload() {
      ({ registry, store } = boot());
      registry.attach(ctx);
      UI.resetView();
    },
    as(value) {
      ctx.role = value;
      UI.resetView();
    },
    run: (action, data = {}, fields = null) =>
      UI.handleAction(ctx, action, data, fields ? form(fields) : null),
    submit(fields = {}) {
      const dialog = dialogs.at(-1);
      assert.ok(dialog, "no dialog open");
      return dialog.options.onSubmit(form(fields));
    },
    // Opens the editor page for a draft, as the route does, so its working copy exists.
    edit(id, tab = "identity") {
      ctx.navigate("homebrew-editor", { id, tab });
      return UI.renderRoute(ctx);
    },
    errors: () => toasts.filter((x) => x.error).map((x) => x.text),
  };
  return h;
}
const latest = (h, contentId) =>
  hb.listHomebrew(h.store.state, h.ctx.role).find((e) => e.id === contentId).latestRef;

// Player builds the acceptance feat: Grappler template, level rule removed, Str/Dex 13
// OR group, choose 1 of 2 (+1 Str / +1 Dex), +1 AC, and a Wisdom save activity.
function buildFeat(h) {
  h.as("player");
  UI.startDraft(h.ctx, "feat", "srd-feat:grappler");
  const draftId = h.ctx.view.id;
  h.edit(draftId);
  UI.setField("name.it", "Guardia delle lanterne");
  UI.setField("name.en", "Lantern Warden");
  UI.setField("description.it", "Il tuo addestramento alla torre ti rende saldo.");
  UI.setField("source.label", "Tavolo di Bruma");
  h.run("save-draft");
  h.edit(draftId, "prerequisites");
  const groups = UI.editorData().structured.prerequisites;
  assert.deepEqual(
    groups.map((g) => g.mode),
    ["all", "any"],
    "Grappler: level AND (Str OR Dex)",
  );
  h.run("remove-group", { group: 0 });
  h.edit(draftId, "modifiers");
  h.run("add-modifier");
  h.edit(draftId, "activities");
  h.run("add-activity", { type: "save" });
  const act = "structured.activities.0";
  UI.setField(`${act}.name.it`, "Bagliore della lanterna");
  UI.setField(`${act}.name.en`, "Lantern glare");
  UI.setField(`${act}.save.ability`, "wis");
  UI.setField(`${act}.save.dc.ability`, "int");
  UI.setField(`${act}.effect.conditionId`, "frightened");
  UI.setField(`${act}.effect.duration`, "start-next-self");
  h.run("save-content");
  const contentId = h.ctx.view.id;
  assert.ok(contentId && !h.errors().length, h.errors().join());
  return { contentId, ref: latest(h, contentId) };
}
function shareAndEnable(h, contentId) {
  h.as("player");
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: latest(h, contentId).revisionId });
  h.run("share", { shared: "true" });
  h.as("dm");
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: latest(h, contentId).revisionId });
  h.run("enable", { enabled: "true" });
  assert.ok(h.store.state.campaign.enabledContent.some((r) => r.contentId === contentId));
}

test("feat from an SRD template: prerequisites, choose 1 of 2, +1 AC stacking, test sheet, enable, apply, undo, reload", () => {
  const h = harness();
  const { contentId, ref } = buildFeat(h);
  const rev = hb.getHomebrewRevision(h.store.state, ref, "player");
  const s = rev.data.structured;
  assert.equal(s.prerequisites.length, 1);
  assert.equal(s.prerequisites[0].mode, "any");
  assert.deepEqual(
    D.describePrerequisites(s).map((x) => x.it),
    ["For 13+ o Des 13+"],
  );
  assert.equal(s.options[0].choose, 1);
  assert.equal(s.options[0].from.length, 2);
  assert.deepEqual(
    s.modifiers.map((m) => [m.target, m.mode, m.value]),
    [["ac", "add", 1]],
  );
  assert.equal(s.automation.level, "full", "declared automation stored in the revision");
  assert.equal(s.template.id, "feat:grappler");
  // Isolated test on a fictitious sheet: no commit, no log.
  const logBefore = h.store.state.log.length;
  const weak = D.testOnSheet(
    "feat",
    s,
    {
      level: 1,
      classIds: ["wizard"],
      abilities: { str: 10, dex: 12 },
      ac: 12,
      speed: 9,
      proficiencyBonus: 2,
    },
    {},
    rev.data.name,
  );
  assert.equal(weak.prerequisites.ok, false);
  const dexOpt = s.options[0].from.find((c) => c.modifiers[0].target === "dex");
  const ok = D.testOnSheet(
    "feat",
    s,
    {
      level: 3,
      classIds: ["wizard"],
      abilities: { str: 10, dex: 14 },
      ac: 12,
      speed: 9,
      proficiencyBonus: 2,
    },
    { [s.options[0].id]: [dexOpt.id] },
    rev.data.name,
  );
  assert.equal(ok.eligible, true);
  assert.deepEqual(ok.values.map((v) => [v.target, v.value]).sort(), [
    ["ac", 13],
    ["dex", 15],
  ]);
  assert.equal(
    ok.activities[0].dc.value,
    10,
    "DC 8 + PB 2 + Int 10 (no score on the test sheet counts as 10)",
  );
  assert.equal(h.store.state.log.length, logBefore, "the test writes nothing");
  // Enabling: shared with the DM, enabled by the DM (the player cannot enable).
  assert.throws(() => hb.enableHomebrewRevision(h.store.state, ref, { enabled: true }, "player"));
  shareAndEnable(h, contentId);
  // Apply to Livia with the Dex choice.
  h.as("player");
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: ref.revisionId });
  h.run("apply-sheet");
  h.submit({ actorId: "livia", [`opt-${s.options[0].id}`]: dexOpt.id });
  const livia = () => h.store.state.actors.livia;
  assert.equal(livia().ac, 13);
  assert.equal(livia().abilities.dex, 15);
  assert.ok(
    livia().features.some((f) => f.homebrewRef?.contentId === contentId),
    "the Library copy is on the sheet",
  );
  const report = D.stackReport(h.store.state, h.slice, "livia").find((r) => r.target === "ac");
  assert.deepEqual(
    report.steps.map((x) => [x.mode, x.value]),
    [
      ["base", 12],
      ["add", 13],
    ],
  );
  // Undo removes copy and effects together.
  h.ctx.undo();
  assert.equal(livia().ac, 12);
  assert.equal(livia().abilities.dex, 14);
  assert.ok(!livia().features.some((f) => f.homebrewRef?.contentId === contentId));
  // Prerequisites refuse a sheet that does not meet them unless the DM overrides with a reason.
  h.store.commit(
    "fixture: weaker Livia",
    (st) => Object.assign(st.actors.livia.abilities, { str: 10, dex: 12 }),
    "player",
  );
  h.run("apply-sheet");
  assert.throws(
    () => h.submit({ actorId: "livia", [`opt-${s.options[0].id}`]: dexOpt.id }),
    /prerequisiti|prerequisites/i,
  );
  // The DM may override with a reason, recorded on the entry.
  h.as("dm");
  h.run("apply-sheet");
  h.submit({
    actorId: "livia",
    [`opt-${s.options[0].id}`]: dexOpt.id,
    override: "Allenamento con Doran",
  });
  assert.equal(D.sheetRecord(h.slice, "livia").entries[0].override.reason, "Allenamento con Doran");
  h.ctx.undo();
  h.as("player");
  h.store.commit(
    "fixture: Livia back",
    (st) => Object.assign(st.actors.livia.abilities, { dex: 14 }),
    "player",
  );
  // Choice count enforced.
  h.run("apply-sheet");
  assert.throws(() => h.submit({ actorId: "livia" }), /Scegli 1/);
  h.submit({ actorId: "livia", [`opt-${s.options[0].id}`]: dexOpt.id });
  assert.equal(livia().ac, 13);
  // A manual AC correction moves the base; the modifier stays on top.
  h.store.commit("fixture: shield donned", (st) => (st.actors.livia.ac = 15), "player");
  h.as("dm");
  h.run("safe-mode", { disabled: "true" });
  assert.equal(livia().ac, 14, "safe mode removes the +1 from the corrected value 15");
  h.run("safe-mode", { disabled: "false" });
  assert.equal(livia().ac, 15);
  // Reload keeps sheet effects and the ledger.
  h.reload();
  assert.equal(h.store.state.actors.livia.ac, 15);
  assert.ok(D.sheetRecord(h.slice, "livia").entries.length === 1);
});

test("save activity with a condition until the start of your next turn expires at the right moment; undo reuses the roll", () => {
  const h = harness();
  const { contentId, ref } = buildFeat(h);
  shareAndEnable(h, contentId);
  h.as("player");
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: ref.revisionId });
  const s = hb.getHomebrewRevision(h.store.state, ref, "player").data.structured;
  h.run("apply-sheet");
  h.submit({ actorId: "livia", [`opt-${s.options[0].id}`]: s.options[0].from[1].id });
  // Combat with Livia first: order livia, goblin-1, doran, goblin-2; goblin-1 within 9 m.
  h.store.commit(
    "fixture: combat",
    (st) => {
      Object.assign(st.combat, { active: true, round: 1, turn: 0 });
      st.scenes[0].tokens.find((t) => t.actorId === "goblin-1").x = 400;
    },
    "dm",
  );
  const activity = D.actorActivities(h.store.state, h.slice, "livia")[0];
  assert.equal(activity.active, true);
  // Out-of-range target refused, then the goblin in range.
  h.run("use", { actor: "livia", content: contentId, activity: activity.activity.id });
  assert.throws(() => h.submit({ target: "goblin-2" }), /fuori portata|out of range/);
  h.submit({ target: "goblin-1" });
  const use = h.slice.uses.at(-1);
  assert.equal(use.dc, 13, "8 + PB 2 + Int 16 (+3)");
  assert.equal(h.store.state.actors.livia.action, false, "the action is spent on use");
  // The player cannot roll the goblin's save; the DM is notified and rolls.
  assert.equal(D.pendingSavesFor(h.store.state, h.slice, "player")[0].canRoll, false);
  h.as("dm");
  const notes = h.ctx.registry.notifications(h.ctx);
  assert.ok(
    notes.some((n) => n.title.it.includes("Tiro salvezza: Sentinella")),
    JSON.stringify(notes.map((n) => n.title)),
  );
  h.run("roll-save", { use: use.id, target: "goblin-1" });
  h.submit({ advantage: "normal", dieMode: "physical", "face-0": 5, visibility: "shared" });
  const goblin = () => h.store.state.actors["goblin-1"];
  const frightened = () => (goblin().conditions ?? []).filter((c) => c.id === "frightened");
  assert.equal(frightened().length, 1);
  assert.deepEqual(frightened()[0].term, {
    kind: "turn",
    actorId: "livia",
    phase: "start",
    when: "next",
    excludeTurnKey: frightened()[0].term.excludeTurnKey,
  });
  assert.equal(h.slice.uses.at(-1).targets[0].status, "failed");
  const roll = h.store.state.ext["compendium-rolls"].rolls.at(-1);
  assert.equal(roll.mode, "physical");
  assert.equal(roll.total, 6, "5 + Wis 12 (+1)");
  // Undo withdraws the outcome; the recorded roll is reused, never rolled again.
  h.ctx.undo();
  assert.equal(frightened().length, 0);
  assert.equal(h.slice.uses.at(-1).targets[0].status, "pending");
  const dialogs = h.dialogs.length;
  h.run("roll-save", { use: use.id, target: "goblin-1" });
  assert.equal(h.dialogs.length, dialogs, "no new roll dialog: the evidence is reused");
  assert.equal(frightened().length, 1);
  assert.equal(h.slice.uses.at(-1).targets[0].reused, true);
  // End of Livia's turn and the goblin's, Doran's and goblin-2's: still frightened.
  const next = () => h.store.commit("End turn", (st) => advanceTurn(st), "dm");
  for (let i = 0; i < 3; i++) {
    next();
    assert.equal(frightened().length, 1, `still frightened after ${i + 1} turn(s)`);
  }
  next(); // Livia's next turn starts: the condition ends now.
  assert.equal(h.store.state.combat.order[h.store.state.combat.turn], "livia");
  assert.equal(frightened().length, 0, "ended at the start of Livia's next turn");
  // Safe mode suspends the activity.
  h.run("safe-mode", { disabled: "true" });
  assert.equal(D.actorActivities(h.store.state, h.slice, "livia")[0].active, false);
  h.as("player");
  h.run("use", { actor: "livia", content: contentId, activity: activity.activity.id });
  assert.throws(() => h.submit({ target: "goblin-1" }), /disattivato|disabled/);
});

test("subclass with features at 3/6/10 applied through Mira's advancement", () => {
  const h = harness();
  h.as("player");
  UI.startDraft(h.ctx, "subclass", "class-levels:druid");
  const draftId = h.ctx.view.id;
  h.edit(draftId);
  UI.setField("name.it", "Circolo delle Lanterne");
  UI.setField("name.en", "Circle of Lanterns");
  UI.setField("source.label", "Tavolo di Bruma");
  h.run("save-draft");
  h.edit(draftId, "advancement");
  const levels = UI.editorData().structured.advancement.map((a) => a.level);
  assert.deepEqual(levels, [3, 6, 10, 14], "template uses the Druid subclass levels");
  const names = {
    3: ["Luce del guardiano", "Warden's light"],
    6: ["Fiamma custode", "Keeper flame"],
    10: ["Faro vivente", "Living beacon"],
  };
  UI.editorData().structured.advancement.forEach((a, i) => {
    if (names[a.level]) {
      UI.setField(`structured.advancement.${i}.features.0.name.it`, names[a.level][0]);
      UI.setField(`structured.advancement.${i}.features.0.name.en`, names[a.level][1]);
    }
  });
  h.run("remove-advancement", { adv: 3 });
  h.run("add-advancement", { type: "scale", level: 3 });
  UI.setField("structured.advancement.3.scale.name.it", "Dado della lanterna");
  UI.setField("structured.advancement.3.scale.name.en", "Lantern die");
  UI.setField("structured.advancement.3.scale.values.3", "1d6");
  h.run("add-scale-level", { adv: 3, level: 6 });
  UI.setField("structured.advancement.3.scale.values.6", "1d8");
  h.run("save-content");
  const contentId = h.ctx.view.id;
  assert.ok(contentId, h.errors().join());
  // Not usable before sharing and enabling.
  assert.equal(D.subclassCandidates(h.store.state, "mira", "player")[0].canUse, false);
  shareAndEnable(h, contentId);
  h.as("player");
  h.run("choose-subclass", { actor: "mira" });
  h.submit({ pick: 0 });
  assert.deepEqual(
    D.pendingAdvancement(h.store.state, h.slice, "mira").map((a) => a.level),
    [3, 3],
  );
  h.run("apply-advancement", { actor: "mira" });
  const mira = () => h.store.state.actors.mira;
  const hbFeatures = () =>
    mira()
      .features.filter((f) => f.grantId === `homebrew-advancement:${contentId}`)
      .map((f) => f.name.en);
  assert.deepEqual(hbFeatures(), ["Warden's light"]);
  const entry = D.subclassOf(h.slice, "mira");
  assert.deepEqual(
    D.scaleValues(entry, mira().level).map((x) => x.value),
    ["1d6"],
  );
  assert.deepEqual(
    D.futureAdvancement(h.store.state, h.slice, "mira").map((a) => a.level),
    [6, 10],
  );
  // Mira reaches level 6 (any flow raising her level): advancement becomes due.
  h.store.commit("fixture: Mira level 6", (st) => (st.actors.mira.level = 6), "player");
  assert.deepEqual(
    D.pendingAdvancement(h.store.state, h.slice, "mira").map((a) => a.level),
    [6],
  );
  h.run("apply-advancement", { actor: "mira" });
  assert.deepEqual(hbFeatures(), ["Warden's light", "Keeper flame"]);
  assert.deepEqual(
    D.scaleValues(D.subclassOf(h.slice, "mira"), 6).map((x) => x.value),
    ["1d8"],
  );
  assert.deepEqual(
    D.futureAdvancement(h.store.state, h.slice, "mira").map((a) => a.level),
    [10],
  );
  assert.throws(() => h.run("apply-advancement", { actor: "mira" }), /Nessun avanzamento/);
  // The sheet box renders the granted and future levels.
  const html = UI.renderSheetFeatures(h.ctx, h.store.state.actors.mira);
  assert.match(html, /data-hbe-granted="6"/);
  assert.match(html, /data-hbe-future="10"/);
  // Publishing checks the class's subclass levels (a level-5 feature fails).
  const pubChecks = D.publicationChecks(h.store.state, latest(h, contentId), "human", "player");
  assert.equal(pubChecks.find((c) => c.id === "subclass-levels").ok, true);
});

test("monster creator: preset, legendary and lair sections, rollable blocks, scene, rolls; CSV import with row errors", () => {
  const h = harness({ role: "dm" });
  h.as("dm");
  UI.startDraft(h.ctx, "creature", "srd-creature:goblin-boss");
  const draftId = h.ctx.view.id;
  h.edit(draftId);
  UI.setField("name.it", "Capo delle lanterne");
  UI.setField("name.en", "Lantern chief");
  UI.setField("source.label", "DM");
  h.run("save-draft");
  h.edit(draftId, "statblock");
  UI.setField("structured.creature.sections.legendary.enabled", true);
  h.run("add-block", { section: "legendary.actions" });
  UI.setField("structured.creature.sections.legendary.actions.0.name.it", "Colpo rapido");
  UI.setField(
    "structured.creature.sections.legendary.actions.0.text.it",
    "Attacco in mischia +4, portata 1,5 m. Colpito: 5 (1d6 + 2) danni taglienti.",
  );
  h.run("auto-rollables", { path: "structured.creature.sections.legendary.actions.0" });
  UI.setField("structured.creature.sections.lair.enabled", true);
  h.run("add-block", { section: "lair.actions" });
  UI.setField("structured.creature.sections.lair.actions.0.name.it", "Lanterne tremolanti");
  UI.setField(
    "structured.creature.sections.lair.actions.0.text.it",
    "Ogni creatura entro 6 m: 2d6 danni da fuoco.",
  );
  h.run("auto-rollables", { path: "structured.creature.sections.lair.actions.0" });
  const c = UI.editorData().structured.creature;
  assert.match(
    c.sections.legendary.actions[0].text.it,
    /\[rollable\]\+4\|1d20\+4\|attack\[\/rollable\]/,
  );
  assert.match(
    c.sections.lair.actions[0].text.it,
    /\[rollable\]2d6\|2d6\|damage\|fire\[\/rollable\]/,
  );
  h.run("save-content");
  const contentId = h.ctx.view.id;
  const ref = latest(h, contentId);
  const s = hb.getHomebrewRevision(h.store.state, ref, "dm").data.structured;
  assert.equal(s.creature.sections.legendary.enabled, true);
  assert.equal(s.automation.level, "partial");
  // The live stat block renders roll buttons; the player cannot read the DM's monster.
  const html = UI.statblockHtml(h.ctx, { it: "x" }, s.creature, { mode: "live", ref });
  assert.match(html, /data-hbe="roll-block"/);
  assert.throws(() => hb.getHomebrewRevision(h.store.state, ref, "player"));
  // Add to the active scene: NPC with block values and a melee profile.
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: ref.revisionId });
  h.run("place");
  h.submit({ name: "Capo delle lanterne" });
  const npc = Object.values(h.store.state.actors).find(
    (a) => a.homebrewCreature?.contentId === contentId,
  );
  assert.ok(npc && npc.ac === 17 && npc.hp === 21, "AC and HP from the Goblin Boss preset");
  assert.equal(npc.combatProfile.meleeAttack.attackBonus, 4);
  assert.ok(h.store.state.scenes[0].tokens.some((t) => t.actorId === npc.id));
  // Rolling a block records through the compendium roll service.
  const actionIndex = s.creature.sections.actions.findIndex((b) => /\[rollable\]/.test(b.text.it));
  const segs = D.parseRollables(s.creature.sections.actions[actionIndex].text.it);
  h.run("roll-block", {
    content: contentId,
    revision: ref.revisionId,
    section: "actions",
    block: actionIndex,
    seg: segs.findIndex((x) => x.rollable?.kind === "attack"),
    lang: "it",
  });
  h.submit({
    advantage: "advantage",
    dieMode: "physical",
    "face-0": 3,
    "face-1": 17,
    visibility: "private",
  });
  const roll = h.store.state.ext["compendium-rolls"].rolls.at(-1);
  assert.equal(roll.total, 21);
  assert.equal(roll.visibility, "private");
  // The Table inspector shows the block to the DM only.
  assert.match(UI.renderTablePanel(h.ctx, { selectedActorId: npc.id }), /hbe-statblock/);
  h.as("player");
  assert.doesNotMatch(UI.renderTablePanel(h.ctx, { selectedActorId: npc.id }), /hbe-statblock/);
  assert.throws(() => h.run("place"), /Contenuto non disponibile|Only the DM|Solo il DM/);
  // CSV import: the example is valid; two broken cells produce per-row errors.
  h.as("dm");
  const broken = D.EXAMPLE_CSV.replace(
    "Falena di brace,tiny,beast,12",
    "Falena di brace,minuscola,beast,dodici",
  );
  h.ctx.navigate("homebrew-editor", { tab: "import" });
  h.run("import-check", {}, { text: broken });
  const html2 = UI.renderRoute(h.ctx);
  assert.match(html2, /data-hbe-import-row="3" class="hbe-row-error"/);
  assert.match(html2, /Taglia sconosciuta «minuscola»/);
  assert.match(html2, /CA non valida «dodici»/);
  const before = hb.listHomebrew(h.store.state, "dm").length;
  h.run("import-apply");
  assert.equal(
    hb.listHomebrew(h.store.state, "dm").length,
    before + 2,
    "valid rows imported, the broken one kept",
  );
  assert.match(UI.renderRoute(h.ctx), /data-hbe-import-row="3"/);
  h.run(
    "import-check",
    {},
    {
      text: D.EXAMPLE_CSV.split("\n")
        .filter((line, i) => i === 0 || i === 2)
        .join("\n"),
    },
  );
  h.run("import-apply");
  assert.equal(hb.listHomebrew(h.store.state, "dm").length, before + 3);
  const imported = hb.listHomebrew(h.store.state, "dm").map((e) => e.name.it);
  assert.ok(
    ["Lanterniere spettrale", "Falena di brace", "Guardiano del faro"].every((n) =>
      imported.includes(n),
    ),
  );
  // JSON import works too; malformed JSON is refused.
  assert.equal(
    D.checkMonsterRows(
      D.monsterRowsFrom(
        JSON.stringify([
          { name: "Ombra", size: "medium", type: "undead", ac: 12, hp: 16, cr: "1/2" },
        ]),
      ),
    )[0].errors.length,
    0,
  );
  assert.throws(() => D.monsterRowsFrom("[{broken"), /JSON/);
});

test("forge Longsword + weapon +1, edit, revert to source as a new revision; apply to Doran's inventory", () => {
  const h = harness();
  h.as("player");
  h.ctx.navigate("homebrew-editor", { tab: "forge" });
  assert.match(UI.renderRoute(h.ctx), /Spada lunga \+1/);
  h.run("forge");
  const draftId = h.ctx.view.id;
  h.edit(draftId);
  assert.equal(UI.editorData().name.it, "Spada lunga +1");
  assert.equal(UI.editorData().structured.item.weapon.attackBonus, 1);
  UI.setField("name.it", "Lama del faro");
  UI.setField("structured.item.weapon.damage.dice", "1d10");
  UI.setField("source.label", "Tavolo di Bruma");
  h.edit(draftId, "item");
  assert.deepEqual(D.modifiedFields(UI.editorData()).sort(), ["name", "structured.item"]);
  h.run("save-content");
  const contentId = h.ctx.view.id;
  let ref = latest(h, contentId);
  let data = hb.getHomebrewRevision(h.store.state, ref, "player").data;
  assert.equal(data.name.it, "Lama del faro");
  h.run("revert-source");
  h.submit({});
  ref = latest(h, contentId);
  data = hb.getHomebrewRevision(h.store.state, ref, "player").data;
  assert.equal(data.name.it, "Spada lunga +1");
  assert.equal(data.structured.item.weapon.damage.dice, "1d8");
  assert.equal(D.modifiedFields(data).length, 0);
  assert.equal(
    hb.listHomebrew(h.store.state, "player").find((e) => e.id === contentId).revisions.length,
    2,
    "the edited revision stays in the history",
  );
  assert.throws(() => D.revertToSource(data), /Nessun campo/);
  // Forge compatibility: an armor template on a weapon is refused.
  assert.throws(() => D.forgeItem("srd2024:item:longsword", ["armor-plus-1"]), /compatibile/);
  // DM applies the forged sword to Doran (DM-owned) after the player shares it.
  h.run("share", { shared: "true" });
  h.as("dm");
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: ref.revisionId });
  h.run("enable", { enabled: "true" });
  h.run("apply-sheet");
  h.submit({ actorId: "doran" });
  assert.ok(
    h.store.state.actors.doran.inventory.some(
      (i) => i.homebrewRef?.contentId === contentId && i.name.it === "Spada lunga +1",
    ),
  );
});

test("campaign homebrew: safe mode round trip, per-entry switch and Find the Culprit", () => {
  const h = harness();
  const { contentId } = buildFeat(h);
  shareAndEnable(h, contentId);
  h.as("player");
  UI.startDraft(h.ctx, "feat", "scratch");
  const d2 = h.ctx.view.id;
  h.edit(d2);
  UI.setField("name.it", "Passo lungo");
  UI.setField("source.label", "Tavolo di Bruma");
  h.run("save-draft");
  h.edit(d2, "modifiers");
  h.run("add-modifier");
  UI.setField("structured.modifiers.0.target", "speed");
  UI.setField("structured.modifiers.0.value", 1.5);
  h.run("save-content");
  const second = h.ctx.view.id;
  shareAndEnable(h, second);
  h.as("player");
  const s1 = hb.getHomebrewRevision(h.store.state, latest(h, contentId), "player").data.structured;
  h.ctx.navigate("homebrew-editor", { id: contentId });
  h.run("apply-sheet");
  h.submit({ actorId: "livia", [`opt-${s1.options[0].id}`]: s1.options[0].from[0].id });
  h.ctx.navigate("homebrew-editor", { id: second });
  h.run("apply-sheet");
  h.submit({ actorId: "livia" });
  const livia = () => h.store.state.actors.livia;
  assert.deepEqual([livia().ac, livia().speed, livia().abilities.str], [13, 10.5, 11]);
  // Only the DM changes campaign homebrew.
  assert.throws(() => h.run("safe-mode", { disabled: "true" }), /Solo il DM/);
  h.as("dm");
  h.run("safe-mode", { disabled: "true" });
  assert.deepEqual([livia().ac, livia().speed, livia().abilities.str], [12, 9, 10]);
  assert.equal(
    h.store.state.campaign.enabledContent.length,
    0,
    "no homebrew available as a campaign option",
  );
  assert.match(UI.renderCampaignSection(h.ctx), /Modalità sicura/);
  h.run("safe-mode", { disabled: "false" });
  assert.deepEqual([livia().ac, livia().speed, livia().abilities.str], [13, 10.5, 11]);
  assert.equal(
    h.store.state.campaign.enabledContent.length,
    2,
    "the same revisions are enabled again",
  );
  // Per-entry switch.
  h.run("toggle-content", { content: second, disabled: "true" });
  assert.equal(livia().speed, 9);
  h.run("toggle-content", { content: second, disabled: "false" });
  assert.equal(livia().speed, 10.5);
  // Find the Culprit: half disabled, answer, one left.
  h.run("culprit-start");
  let c = D.campaignRecord(h.slice, "lanterns").culprit;
  assert.equal(c.testing.length, 1);
  const firstTested = c.testing[0];
  assert.equal(D.contentActive(h.store.state, h.slice, firstTested, livia()), false);
  h.run("culprit-answer", { persists: "true" });
  c = D.campaignRecord(h.slice, "lanterns").culprit;
  assert.ok(
    c.found && c.found !== firstTested,
    "problem persisted: the culprit is the one left active",
  );
  h.run("culprit-end", { keep: "true" });
  assert.equal(D.campaignRecord(h.slice, "lanterns").culprit, null);
  assert.equal(D.contentActive(h.store.state, h.slice, c.found, livia()), false);
  assert.equal(D.contentActive(h.store.state, h.slice, firstTested, livia()), true);
});

test("simulated publishing: checks, moderation, immutable v1, v2 chosen by the follower, rating and report", () => {
  const h = harness({ role: "dm" });
  h.as("dm");
  UI.startDraft(h.ctx, "creature", "srd-creature:ghoul");
  const draftId = h.ctx.view.id;
  h.edit(draftId);
  UI.setField("name.it", "Ghoul delle lanterne");
  UI.setField("name.en", "Lantern ghoul");
  UI.setField("source.label", "DM");
  h.run("save-content");
  const contentId = h.ctx.view.id;
  let ref = latest(h, contentId);
  // Mostly AI-generated content is refused; so are hyperlinks and protected names.
  h.run("publish");
  assert.throws(() => h.submit({ aiMethod: "generated" }), /IA|AI/);
  assert.throws(
    () => D.publicationChecks(h.store.state, ref, "human", "player"),
    /non disponibile/,
  );
  h.submit({ aiMethod: "human" });
  assert.equal(D.publicationOf(h.slice, contentId).versions[0].status, "queued");
  assert.throws(
    () => hb.getHomebrewRevision(h.store.state, ref, "player"),
    "not public before approval",
  );
  h.run("moderate", { content: contentId, decision: "approve" });
  assert.equal(D.publishedVersions(h.slice, contentId)[0].number, 1);
  // The player finds it in the catalogue and follows v1.
  h.as("player");
  let entry = D.catalogEntries(h.store.state, h.slice, "player")[0];
  assert.equal(entry.latest.number, 1);
  h.run("follow", { content: contentId, revision: ref.revisionId });
  assert.ok(h.store.state.libraryCollections.player.some((r) => r.revisionId === ref.revisionId));
  h.run("rate", { content: contentId, stars: 4 });
  // New version: a new revision, published as v2; v1 stays readable and unchanged.
  h.as("dm");
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: ref.revisionId });
  h.run("revise");
  const d2 = h.ctx.view.id;
  h.edit(d2);
  UI.setField("description.it", "Ora porta una lanterna spenta.");
  h.run("save-content");
  const ref2 = latest(h, contentId);
  assert.notEqual(ref2.revisionId, ref.revisionId);
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: ref2.revisionId });
  h.run("publish");
  h.submit({ aiMethod: "assisted" });
  h.run("moderate", { content: contentId, decision: "approve" });
  h.as("player");
  entry = D.catalogEntries(h.store.state, h.slice, "player")[0];
  assert.equal(entry.latest.number, 2);
  assert.equal(entry.updateAvailable, true);
  assert.ok(
    h.ctx.registry.notifications(h.ctx).some((n) => n.title.it.startsWith("Nuova versione v2")),
  );
  h.run("stay", { content: contentId });
  assert.equal(
    D.catalogEntries(h.store.state, h.slice, "player")[0].updateAvailable,
    false,
    "staying on v1 dismisses the notice",
  );
  h.run("follow", { content: contentId, revision: ref2.revisionId });
  const collection = h.store.state.libraryCollections.player;
  assert.ok(
    collection.some((r) => r.revisionId === ref2.revisionId) &&
      !collection.some((r) => r.revisionId === ref.revisionId),
  );
  // Report upheld: published versions go back to private.
  h.run("report", { content: contentId }, { reason: "Testo copiato" });
  const report = D.publicationOf(h.slice, contentId).reports[0];
  h.as("dm");
  h.run("resolve-report", { content: contentId, report: report.id, upheld: "true" });
  assert.throws(() => hb.getHomebrewRevision(h.store.state, ref2, "player"));
  assert.equal(D.catalogEntries(h.store.state, h.slice, "player").length, 0);
});

test("automation level declared per entry, templates, validation and English rendering", () => {
  assert.equal(D.automationOf("feat", D.emptyStructured("feat")).level, "text");
  const feat = D.buildFromTemplate("feat", "srd-feat:defense").structured;
  assert.equal(
    D.automationOf("feat", feat).level,
    "text",
    "a conditional +1 AC runs nothing: text only",
  );
  feat.modifiers[0].condition = { it: "", en: "" };
  assert.equal(
    D.automationOf("feat", feat).level,
    "partial",
    "unconditional +1 AC runs; the text prerequisite stays manual",
  );
  const spell = D.buildFromTemplate("spell", "srd-spell:hold-person");
  assert.equal(spell.structured.activities[0].type, "save");
  assert.equal(spell.structured.activities[0].effect.conditionId, "paralyzed");
  const bad = D.emptyStructured("feat");
  bad.prerequisites.push({
    id: "g",
    mode: "any",
    rules: [{ id: "r", kind: "ability", ability: "str", min: 40 }],
  });
  bad.activities.push({
    ...D.newActivity("save"),
    name: { it: "X", en: "" },
    effect: { conditionId: "frightened", duration: "yesterday" },
  });
  const errors = D.validateStructured("feat", bad).map((e) => e.code);
  assert.ok(errors.includes("prerequisite") && errors.includes("activity"), errors.join());
  // Stacking order: set base, capped add, max, multiply, override.
  assert.equal(
    D.computeStack(12, [
      { mode: "set-base", value: 13 },
      { mode: "add", value: 2 },
    ]).value,
    15,
  );
  assert.equal(D.computeStack(19, [{ mode: "add", value: 2, limit: 20 }]).value, 20);
  assert.equal(
    D.computeStack(21, [{ mode: "add", value: 1, limit: 20 }]).value,
    21,
    "a capped add never lowers",
  );
  assert.equal(
    D.computeStack(10, [
      { mode: "multiply", value: 1.5 },
      { mode: "override", value: 7 },
    ]).value,
    7,
  );
  // EN rendering of the hub and editor.
  const h = harness({ lang: "en" });
  h.as("player");
  h.ctx.lang = "en";
  UI.startDraft(h.ctx, "feat", "srd-feat:grappler");
  const html = h.edit(h.ctx.view.id, "prerequisites");
  assert.match(html, /Prerequisites/);
  assert.match(html, /Try on a test sheet/);
  assert.doesNotMatch(html, /Prerequisiti|Prova su una scheda/);
  const hub = UI.renderHub(h.ctx);
  assert.match(hub, /My creations/);
  assert.match(hub, /Private drafts/);
  // The DM never sees the player's private draft.
  h.as("dm");
  assert.doesNotMatch(UI.renderHub(h.ctx), /Private drafts/);
  assert.match(
    UI.renderRoute({
      ...h.ctx,
      view: {
        page: "homebrew-editor",
        id: h.store.state.libraryDrafts[0].id,
        tab: "",
        revision: "",
      },
    }),
    /unavailable/,
  );
});

test("an entry added through the Library's generic flow completes its choices on the sheet; a row removed elsewhere leaves visible effects to clear", () => {
  const h = harness();
  const { contentId, ref } = buildFeat(h);
  shareAndEnable(h, contentId);
  h.as("player");
  // Core Library "add to sheet": the copy arrives without choices or effects.
  h.store.commit(
    "Library copy",
    (st) => {
      const built = hb.materializeHomebrewCopy(st, ref, "player", {
        id: "row-generic",
        actorId: "livia",
      });
      st.actors.livia.features.push(built.row);
    },
    "player",
  );
  const pending = D.unconnectedRows(h.store.state, h.slice, "livia", "player");
  assert.equal(pending.length, 1);
  assert.match(UI.renderSheetFeatures(h.ctx, h.store.state.actors.livia), /Completa le scelte/);
  const s = hb.getHomebrewRevision(h.store.state, ref, "player").data.structured;
  h.run("complete-choices", { actor: "livia", row: "row-generic" });
  h.submit({ [`opt-${s.options[0].id}`]: s.options[0].from[0].id });
  assert.equal(h.store.state.actors.livia.ac, 13);
  assert.equal(h.store.state.actors.livia.abilities.str, 11);
  assert.equal(D.unconnectedRows(h.store.state, h.slice, "livia", "player").length, 0);
  // The feature is deleted from the core sheet: the effects stay until cleared here.
  h.store.commit(
    "Feature removed",
    (st) =>
      (st.actors.livia.features = st.actors.livia.features.filter((f) => f.id !== "row-generic")),
    "player",
  );
  assert.equal(D.orphanEntries(h.store.state, h.slice, "livia").length, 1);
  assert.match(
    UI.renderSheetFeatures(h.ctx, h.store.state.actors.livia),
    /effetti sono ancora applicati/,
  );
  h.run("remove-entry", { actor: "livia", row: "row-generic" });
  assert.equal(h.store.state.actors.livia.ac, 12);
  assert.equal(h.store.state.actors.livia.abilities.str, 10);
  // Read-only views: the player sees the campaign table without DM controls; search finds entries.
  const campaign = UI.renderCampaignSection(h.ctx);
  assert.match(campaign, /Solo il DM cambia queste impostazioni/);
  assert.doesNotMatch(campaign, /data-hbe="safe-mode"/);
  const found = h.ctx.registry.search(h.ctx, "lanterne");
  assert.ok(
    found.some((r) => r.page === "homebrew-editor" && r.params.id === contentId),
    JSON.stringify(found),
  );
  // Offline: private drafts still save, shared campaign changes are refused.
  h.ctx.offline = true;
  UI.startDraft(h.ctx, "background", "scratch");
  assert.ok(h.ctx.view.id);
  h.as("dm");
  h.ctx.offline = true;
  assert.throws(() => h.run("safe-mode", { disabled: "true" }), /offline/i);
});

// ---------------------------------------------------------------- independent review fixes

// A player feat with an attack activity (to hit +5, 1d8+3 slashing) and a save activity
// with damage (Dex save, 2d6 fire), shared, enabled and applied to Livia.
function buildStrikeFeat(h) {
  h.as("player");
  UI.startDraft(h.ctx, "feat", "scratch");
  const draftId = h.ctx.view.id;
  h.edit(draftId);
  UI.setField("name.it", "Colpo del faro");
  UI.setField("name.en", "Beacon strike");
  UI.setField("source.label", "Tavolo di Bruma");
  h.run("save-draft");
  h.edit(draftId, "activities");
  h.run("add-activity", { type: "attack" });
  UI.setField("structured.activities.0.name.it", "Fendente del faro");
  UI.setField("structured.activities.0.name.en", "Beacon slash");
  UI.setField("structured.activities.0.attack.bonus", 5);
  UI.setField("structured.activities.0.damage.dice", "1d8+3");
  UI.setField("structured.activities.0.damage.type", "slashing");
  h.run("add-activity", { type: "save" });
  UI.setField("structured.activities.1.name.it", "Vampa del faro");
  UI.setField("structured.activities.1.name.en", "Beacon flare");
  UI.setField("structured.activities.1.activation.type", "bonus");
  UI.setField("structured.activities.1.save.ability", "dex");
  UI.setField("structured.activities.1.damage.dice", "2d6");
  UI.setField("structured.activities.1.damage.type", "fire");
  h.run("save-content");
  const contentId = h.ctx.view.id;
  assert.ok(contentId && !h.errors().length, h.errors().join());
  shareAndEnable(h, contentId);
  h.as("player");
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: latest(h, contentId).revisionId });
  h.run("apply-sheet");
  h.submit({ actorId: "livia" });
  return contentId;
}

test("review fix: an activity's other rolls (attack then damage, a save's damage) are rolled from its use without paying the cost again", () => {
  const h = harness();
  const contentId = buildStrikeFeat(h);
  h.store.commit(
    "fixture: combat, Livia's turn, goblin in reach",
    (st) => {
      Object.assign(st.combat, { active: true, round: 1, turn: 0 });
      st.scenes[0].tokens.find((t) => t.actorId === "goblin-1").x = 300;
    },
    "dm",
  );
  const [attack, save] = D.actorActivities(h.store.state, h.slice, "livia");
  // Use the attack: the action is spent once and the attack roll is recorded.
  h.run("use", { actor: "livia", content: contentId, activity: attack.activity.id });
  h.submit({ roll: "attack" });
  h.submit({ advantage: "normal", dieMode: "physical", "face-0": 14 });
  const rolls = () => h.store.state.ext["compendium-rolls"].rolls;
  assert.equal(rolls().at(-1).total, 19, "14 + 5");
  assert.equal(h.store.state.actors.livia.action, false);
  const use = h.slice.uses.at(-1);
  assert.equal(use.type, "attack");
  assert.deepEqual(
    use.rolls.map((r) => [r.kind, r.dice]),
    [
      ["attack", "1d20+5"],
      ["damage", "1d8+3"],
    ],
  );
  // The use card offers the damage: rolled with a physical die, no second action spent.
  const html = UI.renderSheetActions(h.ctx, h.store.state.actors.livia);
  assert.match(html, new RegExp(`data-hbe="roll-use"[^>]*data-use="${use.id}"[^>]*data-roll="1"`));
  h.run("roll-use", { use: use.id, roll: "1" });
  h.submit({ dieMode: "physical", "face-0": 6 });
  assert.equal(rolls().at(-1).total, 9, "6 + 3 slashing");
  assert.equal(rolls().at(-1).mode, "physical");
  assert.equal(h.errors().length, 0, h.errors().join());
  // Using the attack again this turn is refused (the action is spent); the card still rolls.
  h.run("use", { actor: "livia", content: contentId, activity: attack.activity.id });
  assert.throws(() => h.submit({ roll: "attack" }), /già usata|already used/);
  h.run("roll-use", { use: use.id, roll: "1" });
  h.submit({ dieMode: "digital" });
  assert.equal(h.store.state.actors.livia.action, false);
  // Only the actor's controller rolls from its card.
  h.as("dm");
  h.store.commit(
    "fixture: Livia is private again",
    (st) => (st.actors.livia.visibility = "private"),
    "player",
  );
  assert.throws(() => h.run("roll-use", { use: use.id, roll: "1" }), /controlli|control/);
  h.as("player");
  h.store.commit("fixture: Livia shared", (st) => delete st.actors.livia.visibility, "player");
  // The save activity (bonus action) records its damage on the use: rolled by the caster.
  h.run("use", { actor: "livia", content: contentId, activity: save.activity.id });
  h.submit({ target: "goblin-1" });
  const saveUse = h.slice.uses.at(-1);
  assert.deepEqual(
    saveUse.rolls.map((r) => [r.kind, r.dice, r.type]),
    [["damage", "2d6", "fire"]],
  );
  h.run("roll-use", { use: saveUse.id, roll: "0" });
  h.submit({ dieMode: "physical", "face-0": 3, "face-1": 4 });
  assert.equal(rolls().at(-1).total, 7);
  assert.equal(h.store.state.actors.livia.bonus, false);
  // Undo of the use gives the cost back and removes the card; accepted rolls stay recorded.
  const before = rolls().length;
  h.ctx.undo();
  assert.equal(h.store.state.actors.livia.bonus, true);
  assert.ok(!h.slice.uses.some((u) => u.id === saveUse.id));
  assert.equal(rolls().length, before);
  // Out of turn: another creature's turn refuses a cost-paying use, as the save does.
  h.store.commit("fixture: goblin's turn", (st) => (st.combat.turn = 1), "dm");
  h.run("use", { actor: "livia", content: contentId, activity: save.activity.id });
  assert.throws(() => h.submit({ target: "goblin-1" }), /turno|turn/);
  // The automation panel says where the save's damage is rolled.
  const rev = hb.getHomebrewRevision(h.store.state, latest(h, contentId), "player");
  assert.ok(
    D.automationOf("feat", rev.data.structured).manual.some((m) => /riga dell’uso/.test(m.it)),
  );
});

test("review fix: changing identity with unsaved editor changes asks through the draft guard", () => {
  const h = harness();
  h.as("player");
  UI.startDraft(h.ctx, "spell", "scratch");
  h.edit(h.ctx.view.id);
  UI.setField("name.it", "Scintilla");
  const view = { ...h.ctx.view };
  assert.ok(
    h.ctx.registry.pendingDraft(h.ctx, { ...view, role: "dm" }),
    "a role change is a departure from the unsaved draft",
  );
  assert.equal(
    h.ctx.registry.pendingDraft(h.ctx, { ...view, tab: "prerequisites" }),
    null,
    "moving between the draft's own sections is not",
  );
});

test("review fix: a Library update of the sheet copy to a newer revision is flagged and the effects follow it", () => {
  const h = harness();
  const { contentId, ref } = buildFeat(h);
  shareAndEnable(h, contentId);
  h.as("player");
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: ref.revisionId });
  const s = hb.getHomebrewRevision(h.store.state, ref, "player").data.structured;
  h.run("apply-sheet");
  h.submit({ actorId: "livia", [`opt-${s.options[0].id}`]: s.options[0].from[1].id });
  const livia = () => h.store.state.actors.livia;
  assert.equal(livia().ac, 13);
  // v2: +2 AC, shared and enabled next to v1.
  h.run("revise");
  const draftId = h.ctx.view.id;
  h.edit(draftId, "modifiers");
  UI.setField("structured.modifiers.0.value", 2);
  h.run("save-content");
  const ref2 = latest(h, contentId);
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: ref2.revisionId });
  h.run("share", { shared: "true" });
  h.as("dm");
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: ref2.revisionId });
  h.run("enable", { enabled: "true" });
  h.as("player");
  // A new application picks the newest enabled revision.
  h.run("add-structured", { actor: "livia" });
  assert.match(h.dialogs.at(-1).body, /Guardia delle lanterne/);
  // The Library's own update flow moves the sheet copy to v2.
  const row = livia().features.find((f) => f.homebrewRef?.contentId === contentId);
  h.store.commit(
    "Library update draft",
    (st) =>
      hb.createHomebrewDraft(
        st,
        { id: "upd-1", kind: "update", ref: ref2, actorId: "livia", instanceId: row.id },
        "player",
      ),
    "player",
  );
  const preview = hb.previewHomebrewDraft(h.store.state, "upd-1", "player");
  h.store.commit(
    "Library update",
    (st) => hb.applyHomebrewDraft(st, "upd-1", { reviewKey: preview.reviewKey }, "player"),
    "player",
  );
  assert.equal(livia().ac, 13, "effects are still those of v1");
  const stale = D.staleEntries(h.store.state, h.slice, "livia");
  assert.equal(stale.length, 1);
  assert.equal(stale[0].toRef.revisionId, ref2.revisionId);
  assert.match(UI.renderSheetFeatures(h.ctx, livia()), /data-hbe="refresh-entry"/);
  // One click: the same choice (Dex +1) is kept, the modifiers follow v2.
  h.run("refresh-entry", { actor: "livia", row: row.id });
  assert.equal(livia().ac, 14);
  assert.equal(livia().abilities.dex, 15);
  const entry = D.sheetRecord(h.slice, "livia").entries[0];
  assert.equal(entry.revisionId, ref2.revisionId);
  assert.equal(D.staleEntries(h.store.state, h.slice, "livia").length, 0);
  h.ctx.undo();
  assert.equal(livia().ac, 13);
  assert.equal(D.staleEntries(h.store.state, h.slice, "livia").length, 1);
});

test("review fix: due subclass advancement reaches the bell; a homebrew subclass can be removed; saves use the effective (Wild Shape) actor", () => {
  const h = harness();
  h.as("player");
  UI.startDraft(h.ctx, "subclass", "class-levels:druid");
  const draftId = h.ctx.view.id;
  h.edit(draftId);
  UI.setField("name.it", "Circolo delle Lanterne");
  UI.setField("name.en", "Circle of Lanterns");
  UI.setField("source.label", "Tavolo di Bruma");
  h.run("save-draft");
  h.edit(draftId, "advancement");
  UI.editorData().structured.advancement.forEach((a, i) => {
    UI.setField(`structured.advancement.${i}.features.0.name.it`, `Dono ${a.level}`);
    UI.setField(`structured.advancement.${i}.features.0.name.en`, `Gift ${a.level}`);
  });
  h.run("save-content");
  const contentId = h.ctx.view.id;
  assert.ok(contentId && !h.errors().length, h.errors().join());
  shareAndEnable(h, contentId);
  h.as("player");
  h.run("choose-subclass", { actor: "mira" });
  h.submit({ pick: 0 });
  const bell = () =>
    h.ctx.registry
      .notifications(h.ctx)
      .filter((n) => n.id.startsWith("homebrew-editor-advancement-mira"));
  assert.equal(bell().length, 1, "level 3 due right after choosing");
  assert.equal(bell()[0].target.page, "characters");
  assert.equal(bell()[0].category, "reminders", "a reminder, not a roll request");
  h.as("dm");
  assert.equal(bell().length, 0, "the owner is reminded, not the DM");
  h.as("player");
  h.run("apply-advancement", { actor: "mira" });
  assert.equal(bell().length, 0);
  h.store.commit("fixture: Mira level 6", (st) => (st.actors.mira.level = 6), "player");
  assert.equal(bell().length, 1, "level 6 due after the level rises");
  // Removing the subclass removes its granted features; it can be chosen again.
  const granted = () =>
    h.store.state.actors.mira.features.filter(
      (f) => f.grantId === `homebrew-advancement:${contentId}`,
    ).length;
  assert.equal(granted(), 1);
  assert.match(
    UI.renderSheetFeatures(h.ctx, h.store.state.actors.mira),
    /data-hbe="remove-entry"[^>]*data-row="subclass"/,
  );
  h.run("remove-entry", { actor: "mira", row: "subclass" });
  assert.equal(granted(), 0);
  assert.equal(D.subclassOf(h.slice, "mira"), undefined);
  assert.equal(D.subclassCandidates(h.store.state, "mira", "player").length, 1);
  assert.equal(bell().length, 0);
  // Wild Shape: a Dexterity save uses the form's Dexterity, as the combat engine does.
  h.store.commit(
    "fixture: Mira in Wild Shape and a pending Dex save",
    (st) => {
      st.actors.mira.activeForm = {
        profile: {
          abilities: { str: 14, dex: 16, con: 12, int: 2, wis: 12, cha: 6 },
          savingThrows: { str: 2, dex: 3, con: 1, int: -4, wis: 1, cha: -2 },
          skillModifiers: {},
          ac: 13,
          speeds: { walk: 12 },
          size: "medium",
          senses: {},
          melee: null,
          traits: [],
        },
        equipment: [],
        overrides: {},
      };
      st.ext["homebrew-editor"].uses.push({
        id: "use-fixture",
        contentId,
        revisionId: "r",
        activityId: "a",
        name: { it: "Prova", en: "Test" },
        actorId: "livia",
        by: "player",
        ability: "dex",
        dc: 13,
        effect: null,
        targets: [{ actorId: "mira", status: "pending" }],
      });
    },
    "player",
  );
  assert.equal(D.saveProfile(h.store.state, h.slice, "use-fixture", "mira").bonus, 3);
});
