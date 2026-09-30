// B54 — crafting with tools (SRD 5.2.1 EN 103 / IT 117): recipes, verified requirements,
// materials consumed and returned, the item delivered to the existing inventory. Real
// store and registry, the same handlers the bound controls call; synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { advanceGameTime } from "../rest-time.mjs";
import { coinsValue, purseOf } from "../party-stash.mjs";
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
function harness({ role = "player", lang = "it" } = {}) {
  const storage = memory();
  const boot = () => {
    const registry = createRegistry();
    registry.use("projects", projects.register);
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
    render() {},
    navigate() {},
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
      options.afterCommit?.(store.state);
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
    get store() {
      return store;
    },
    get slice() {
      return store.state.ext.projects;
    },
    actor: (id) => store.state.actors[id],
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
const herbs = (h) =>
  h.actor("mira").inventory.find((row) => row.id === "projects-mira-herbs")?.quantity ?? 0;
const potions = (h) =>
  h
    .actor("mira")
    .inventory.filter((row) => row.srdId === "srd2024:item:potion-of-healing")
    .reduce((sum, row) => sum + row.quantity, 0);
function advance(h, hours) {
  const role = h.ctx.role;
  h.ctx.role = "dm";
  h.ctx.commit("Tempo narrativo", (s) =>
    advanceGameTime(
      s,
      {
        id: "adv-" + Math.random().toString(36).slice(2),
        campaignId: "lanterns",
        seconds: hours * 3600,
      },
      "dm",
    ),
  );
  h.ctx.role = role;
}

test("SRD 2024 formulas: half cost, one 8-hour day per 10 GP, the potion's own brewing rule", () => {
  // Plate Armor 1,500 GP → 750 GP of raw materials; Heavy Crossbow 50 GP → 5 days (SRD examples).
  assert.equal(crafting.materialsCpFor(150000), 75000);
  assert.equal(crafting.hoursFor(5000), 40);
  assert.equal(crafting.hoursFor(500), 8);
  const recipes = Object.fromEntries(crafting.srdRecipes().map((row) => [row.id, row]));
  assert.deepEqual(
    [recipes["srd:potion-of-healing"].materialsCp, recipes["srd:potion-of-healing"].hours],
    [2500, 8],
  );
  assert.deepEqual(
    [recipes["srd:antitoxin"].materialsCp, recipes["srd:antitoxin"].hours],
    [2500, 40],
  );
  assert.deepEqual(
    [recipes["srd:healers-kit"].materialsCp, recipes["srd:healers-kit"].hours],
    [250, 8],
  );
  assert.deepEqual(recipes["srd:potion-of-healing"].source.pages, { en: [103], it: [117] });
  assert.ok(Object.values(recipes).every((row) => row.tool === "herbalism-kit"));
});

test("requirements are verified on the sheet: Mira (Druid) can brew, Livia cannot", () => {
  const h = harness();
  const potion = crafting.recipeById(h.slice, "srd:potion-of-healing");
  const mira = crafting.checkRecipe(h.actor("mira"), potion);
  assert.equal(mira.canStart, true);
  assert.match(
    mira.checks.find((row) => row.id === "proficiency").text.it,
    /tratti del druido, SRD EN 41 \/ IT 46/,
  );
  assert.match(
    mira.checks.find((row) => row.id === "materials").text.it,
    /Erbe medicinali ×6 \(30 mo\)/,
  );
  const livia = crafting.checkRecipe(h.actor("livia"), potion);
  assert.equal(livia.canStart, false);
  assert.deepEqual(
    livia.checks.filter((row) => !row.ok).map((row) => row.id),
    ["tool", "proficiency", "materials"],
  );
  assert.throws(
    () =>
      crafting.startCrafting(structuredClone(h.store.state), "player", {
        actorId: "livia",
        recipe: potion,
        source: "inventory",
      }),
    /Missing requirements: Tool: Herbalism Kit not in the inventory; Proficiency with Herbalism Kit: missing/,
  );
  // The recipe card shows the blocked craft button with its reasons (Mastercrafted ✓/✗),
  // in the recipe book's own page (PG-84); the Downtime page links it with a button.
  h.ctx.view = { page: "characters", id: "livia" };
  assert.match(
    projects.renderDowntime(h.ctx, h.actor("livia")),
    /data-projects-open-recipes="livia">Apri il Ricettario</,
  );
  const html = projects.renderRecipeBook(h.ctx, h.actor("livia"));
  assert.match(
    html,
    /data-projects-action="craft"[^>]*data-recipe="srd:potion-of-healing"[^>]* disabled/,
  );
  assert.match(html, /Competenza con Borsa da erborista: mancante/);
});

test("acceptance 2: Potion of Healing — tool, time and 2024 cost; item on completion; Undo and cancel return the materials", () => {
  const h = harness();
  h.run("craft", { actor: "mira", recipe: "srd:potion-of-healing" });
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.title, "Fabbrica: Pozione di guarigione");
  assert.match(dialog.body, /Fabbrica come.*Mira/);
  assert.match(dialog.body, /value="inventory" checked/);
  assert.match(dialog.body, /value="purse"[^>]* disabled/);
  assert.match(dialog.body, /25 mo di materie prime in 1 giorno \(8 ore di lavoro\)/);
  h.submit({ source: "inventory" });
  let project = h.slice.projects.at(-1);
  assert.equal(project.kind, "craft");
  assert.equal(project.steps[0].targetHours, 8);
  assert.equal(herbs(h), 1);
  assert.deepEqual(
    project.craft.materials.items.map((row) => [row.rowId, row.quantity, row.unitCp]),
    [["projects-mira-herbs", 5, 500]],
  );
  // Undo right after the start returns the five herbs and removes the project.
  h.ctx.undo();
  assert.equal(herbs(h), 6);
  assert.ok(!h.slice.projects.some((row) => row.kind === "craft"));
  // Start again, the DM lets 8 hours pass, Mira works them: the potion lands in her inventory.
  h.run("craft", { actor: "mira", recipe: "srd:potion-of-healing" });
  h.submit({ source: "inventory" });
  project = h.slice.projects.at(-1);
  advance(h, 8);
  assert.equal(projects.timeBudget(h.store.state, h.slice, "mira").available, 8);
  h.run("time", { project: project.id });
  h.submit({ hours: 8 });
  project = h.slice.projects.at(-1);
  assert.equal(project.status, "completed");
  assert.equal(potions(h), 1);
  const row = h
    .actor("mira")
    .inventory.find((item) => item.srdId === "srd2024:item:potion-of-healing");
  assert.equal(row.crafted.projectId, project.id);
  assert.equal(row.kind, "consumable");
  assert.equal(row.healing, 7);
  assert.match(h.toasts.at(-1).text, /Pozione di guarigione aggiunta all'inventario di Mira/);
  // Reload keeps the potion and the completed project.
  h.reload();
  assert.equal(potions(h), 1);
  assert.equal(h.slice.projects.at(-1).status, "completed");
  // Cancel crafting after completion: the potion leaves, the herbs return (reason required).
  h.run("abandon", { project: project.id });
  assert.equal(h.dialogs.at(-1).title, "Annulla fabbricazione");
  h.submit({ reason: "Il DM rivede la scena", refund: "on" });
  assert.equal(potions(h), 0);
  assert.equal(herbs(h), 6);
  project = h.slice.projects.at(-1);
  assert.equal(project.status, "abandoned");
  assert.equal(project.craft.refunded, true);
  // The dedicated hours stay spent.
  assert.equal(projects.timeBudget(h.store.state, h.slice, "mira").available, 0);
});

test("a potion already drunk cannot be taken back; Undo of the completion removes it", () => {
  const h = harness();
  h.run("craft", { actor: "mira", recipe: "srd:potion-of-healing" });
  h.submit({ source: "inventory" });
  const id = h.slice.projects.at(-1).id;
  advance(h, 8);
  h.run("time", { project: id });
  h.submit({ hours: 8 });
  assert.equal(potions(h), 1);
  h.ctx.undo();
  assert.equal(potions(h), 0);
  assert.equal(h.slice.projects.at(-1).status, "active");
  assert.equal(herbs(h), 1);
  h.run("time", { project: id });
  h.submit({ hours: 8 });
  const row = h
    .actor("mira")
    .inventory.find((item) => item.srdId === "srd2024:item:potion-of-healing");
  h.ctx.commit("Pozione bevuta", (s) => {
    s.actors.mira.inventory.find((item) => item.id === row.id).quantity = 0;
  });
  h.run("abandon", { project: id });
  assert.throws(
    () => h.submit({ reason: "Correzione", refund: "on" }),
    /no longer in the inventory/,
  );
});

test("coins and mixed materials: the purse pays what the herbs do not; cancel returns the value", () => {
  const h = harness();
  h.ctx.commit("Monete di Mira", (s) => {
    s.actors.mira.currency = { pp: 0, gp: 30, ep: 0, sp: 0, cp: 0 };
    s.actors.mira.inventory.find((row) => row.id === "projects-mira-herbs").quantity = 2;
  });
  const potion = crafting.recipeById(h.slice, "srd:potion-of-healing");
  const plans = Object.fromEntries(
    crafting.MATERIAL_SOURCES.map((source) => [
      source,
      crafting.materialsPlan(h.actor("mira"), potion, source),
    ]),
  );
  assert.equal(plans.inventory.ok, false);
  assert.equal(plans.purse.ok, true);
  assert.deepEqual([plans.mixed.ok, plans.mixed.itemsCp, plans.mixed.coinsCp], [true, 1000, 1500]);
  h.run("craft", { actor: "mira", recipe: "srd:potion-of-healing" });
  h.submit({ source: "mixed" });
  assert.equal(herbs(h), 0);
  assert.equal(coinsValue(purseOf(h.actor("mira"))), 1500);
  const id = h.slice.projects.at(-1).id;
  h.run("abandon", { project: id });
  h.submit({ reason: "Cambio di programma", refund: "on" });
  assert.equal(herbs(h), 2);
  assert.equal(coinsValue(purseOf(h.actor("mira"))), 3000);
  // Keeping the materials spent is a choice too.
  h.run("craft", { actor: "mira", recipe: "srd:potion-of-healing" });
  h.submit({ source: "purse" });
  const second = h.slice.projects.at(-1).id;
  h.run("abandon", { project: second });
  h.submit({ reason: "Le erbe sono marcite" });
  assert.equal(coinsValue(purseOf(h.actor("mira"))), 500);
  assert.equal(h.slice.projects.at(-1).craft.refunded, false);
});

test("DM campaign recipe: SRD formula, Solasta manual requirement matched by name", () => {
  const h = harness({ role: "dm" });
  assert.throws(
    () =>
      crafting.createCampaignRecipe(h.slice, "player", {
        name: "x",
        tool: "herbalism-kit",
        valueGp: 5,
      }),
    /Only the DM writes campaign recipes/,
  );
  h.run("new-recipe");
  assert.throws(
    () => h.submit({ name: "Tintura di Bruma", tool: "nope", valueGp: 30 }),
    /Choose the required tool/,
  );
  h.submit({
    name: "Tintura di Bruma",
    tool: "herbalism-kit",
    valueGp: 30,
    weightKg: "0.5",
    manual: "",
  });
  const recipe = crafting.allRecipes(h.slice).find((row) => row.output.name === "Tintura di Bruma");
  assert.deepEqual([recipe.materialsCp, recipe.hours, recipe.book], [1500, 24, "campaign"]);
  assert.equal(recipe.source.kind, "campaign-rule");
  assert.match(h.toasts.at(-1).text, /materie prime 15 mo, 24 h/);
  // The seeded salve needs Syl's herb notebook (a manual, as in Solasta).
  const salve = crafting.recipeById(h.slice, "recipe-bruma-salve");
  let check = crafting.checkRecipe(h.actor("mira"), salve);
  assert.equal(check.checks.find((row) => row.id === "manual").ok, false);
  h.ctx.commit("Quaderno a Mira", (s) => {
    s.actors.mira.inventory.push({
      id: "gift-notebook",
      name: "Quaderno delle erbe di Syl",
      quantity: 1,
      kind: "gear",
    });
  });
  check = crafting.checkRecipe(h.actor("mira"), salve);
  assert.equal(check.canStart, true);
  h.as("player").run("craft", { actor: "mira", recipe: "recipe-bruma-salve" });
  h.submit({ source: "inventory" });
  const project = h.slice.projects.at(-1);
  h.as("dm");
  projects.grantTime(h.store.state, h.slice, "dm", {
    actorIds: ["mira"],
    hours: 8,
    reason: "Una giornata al mulino",
  });
  h.as("player").run("time", { project: project.id });
  h.submit({ hours: 8 });
  const salveRow = h.actor("mira").inventory.find((row) => row.crafted?.projectId === project.id);
  assert.equal(salveRow.name.it, "Unguento di Bruma");
  assert.equal(salveRow.value, 1000);
});

test("tool training completes into a proficiency the recipe book then accepts", () => {
  const h = harness();
  const training = projects.createProject(h.store.state, h.slice, "player", {
    actorId: "livia",
    activityId: "tool-training",
    param: "herbalism-kit",
  });
  projects.markMilestone(h.store.state, h.slice, "player", { projectId: training.id });
  projects.grantTime(h.store.state, h.slice, "dm", {
    actorIds: ["livia"],
    hours: 80,
    reason: "Apprendistato",
  });
  projects.dedicateTime(h.store.state, h.slice, "player", { projectId: training.id, hours: 80 });
  const result = projects.recordCheck(
    h.store.state,
    h.slice,
    h.store.state.ext["projects-records"],
    "player",
    {
      projectId: training.id,
      mode: "physical",
      face: 9,
    },
  );
  assert.equal(result.record.total, 12);
  assert.equal(training.status, "completed");
  const livia = h.actor("livia");
  assert.ok(crafting.toolProficiencies(livia).has("herbalism-kit"));
  const potion = crafting.recipeById(h.slice, "srd:potion-of-healing");
  const check = crafting.checkRecipe(livia, potion);
  assert.equal(check.checks.find((row) => row.id === "proficiency").ok, true);
  assert.match(
    check.checks.find((row) => row.id === "proficiency").text.en,
    /recorded on the sheet/,
  );
  assert.ok(livia.features.some((row) => row.name.it === "Competenza: Borsa da erborista"));
});

// ---------------------------------------------------------------- B54 review fixes

test("review 5: the DM retires a campaign recipe (Mastercrafted recipe management); started crafts keep it", () => {
  const h = harness({ role: "dm" });
  h.run("new-recipe");
  h.submit({ name: "Tintura di Bruma", tool: "herbalism-kit", valueGp: 10 });
  const id = h.slice.recipes.at(-1).id;
  h.as("player").run("craft", { actor: "mira", recipe: id });
  h.submit({ source: "inventory" });
  const craft = h.slice.projects.at(-1);
  // Only the DM sees Retire, on campaign recipes only.
  assert.doesNotMatch(projects.renderRecipeBook(h.ctx, h.actor("mira")), /retire-recipe/);
  h.as("dm");
  const html = projects.renderRecipeBook(h.ctx, h.actor("mira"));
  assert.match(html, new RegExp(`data-projects-action="retire-recipe" data-recipe="${id}"`));
  assert.doesNotMatch(html, /data-projects-action="retire-recipe" data-recipe="srd:/);
  h.run("retire-recipe", { recipe: id });
  assert.ok(!crafting.allRecipes(h.slice).some((row) => row.id === id));
  assert.ok(h.slice.recipes.find((row) => row.id === id).retired);
  assert.match(h.slice.log.at(-1).text.it, /Ricetta ritirata: Tintura di Bruma/);
  assert.throws(
    () => crafting.retireCampaignRecipe(h.slice, "player", id),
    /Only the DM retires campaign recipes/,
  );
  assert.throws(
    () => crafting.retireCampaignRecipe(h.slice, "dm", "srd:potion-of-healing"),
    /campaign recipe/,
  );
  // The craft already started keeps its recipe and delivers the item.
  advance(h, 8);
  h.as("player").run("time", { project: craft.id });
  h.submit({ hours: 8 });
  assert.ok(h.actor("mira").inventory.some((row) => row.name?.it === "Tintura di Bruma"));
  // Undo of the retirement brings the recipe back.
  h.as("dm");
  const again = harness({ role: "dm" });
  again.run("new-recipe");
  again.submit({ name: "Tintura di Bruma", tool: "herbalism-kit", valueGp: 10 });
  const other = again.slice.recipes.at(-1).id;
  again.run("retire-recipe", { recipe: other });
  again.ctx.undo();
  assert.ok(crafting.allRecipes(again.slice).some((row) => row.id === other));
});

test("review 6: work on a craft needs the tool in the inventory (SRD: you must use the required tool)", () => {
  const h = harness();
  h.run("craft", { actor: "mira", recipe: "srd:potion-of-healing" });
  h.submit({ source: "inventory" });
  const id = h.slice.projects.at(-1).id;
  h.ctx.commit("Mira presta la borsa", (s) => {
    s.actors.mira.inventory = s.actors.mira.inventory.filter(
      (row) => row.id !== "projects-mira-herbalism-kit",
    );
  });
  advance(h, 8);
  h.run("time", { project: id });
  assert.equal(h.dialogs.at(-1)?.options?.submitLabel === "Dedica", false);
  assert.match(
    h.toasts.filter((row) => row.error).at(-1).text,
    /Serve lo strumento: Borsa da erborista non è nell'inventario di Mira/,
  );
  assert.throws(
    () => projects.dedicateTime(h.store.state, h.slice, "player", { projectId: id, hours: 8 }),
    /Herbalism Kit is not in Mira's inventory/,
  );
});
