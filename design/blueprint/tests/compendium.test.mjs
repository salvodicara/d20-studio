// B16 compendium: domain (filters, glossary terms, reader, class pages, dice, conversions)
// and UI handlers (browser filters, entry page, sheet/scene flows, rolls, bookmarks,
// DM screen, journal embeds) against the real registry and a minimal DOM stand-in.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { isValidMeleeProfile } from "../combat.mjs";
import * as content from "../campaign-content.mjs";
import * as data from "../srd-compendium.mjs";
import * as srd from "../srd-sample.mjs";
import {
  register,
  renderCompendium,
  bindCompendium,
  renderScreen,
  parseView,
  addToSheet,
  addCreatureToScene,
  recordRoll,
  rollRequest,
  startEmbedDraft,
  pinToScreen,
  resetUiState,
  uiState,
  sheetTarget,
  startLibraryCopy,
  libraryCopyType,
  correctRoll,
  withdrawRoll,
  embeddableTables,
  copyText,
} from "../compendium.mjs";
import { projectLog } from "../chat-domain.mjs";
import { observesToken, seedSlice as tokenMenuSeed } from "../token-menu.mjs";
import * as hb from "../homebrew.mjs";
import { renderTextWithEmbeds, embedRefs } from "../text-embeds.mjs";

// ---------------------------------------------------------------- minimal DOM stand-in

function parseNodes(html) {
  const nodes = [];
  for (const match of html.matchAll(
    /<(button|input|select|form|details|section|a|textarea)\b([^>]*)>/g,
  )) {
    const [, tag, source] = match;
    const attrs = Object.fromEntries(
      [...source.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [
        k,
        (v ?? "")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&#39;/g, "'"),
      ]),
    );
    const dataset = Object.fromEntries(
      Object.entries(attrs)
        .filter(([k]) => k.startsWith("data-"))
        .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
    );
    const events = {};
    nodes.push({
      tagName: tag.toUpperCase(),
      attrs,
      dataset,
      events,
      type: attrs.type ?? "",
      value: attrs.value ?? "",
      checked: "checked" in attrs,
      open: "open" in attrs,
      addEventListener(type, fn) {
        events[type] = fn;
      },
      setAttribute(k, v) {
        attrs[k] = String(v);
      },
      removeAttribute(k) {
        delete attrs[k];
      },
      getAttribute: (k) => attrs[k] ?? null,
      focus() {},
      setSelectionRange() {},
      scrollIntoView() {},
      classList: { toggle() {}, add() {}, remove() {} },
      fire(type, event = {}) {
        const handler = this["on" + type] ?? events[type];
        assert.ok(handler, `no ${type} handler on <${tag} ${source.trim().slice(0, 60)}>`);
        return handler({
          preventDefault() {},
          stopPropagation() {},
          detail: 1,
          target: this,
          ...event,
        });
      },
    });
  }
  return nodes;
}
function matches(node, selector) {
  const parts = [...selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];
  return (
    parts.length > 0 &&
    parts.every(([, name, value]) =>
      name === "value"
        ? node.value === value
        : name in node.attrs && (value === undefined || node.attrs[name] === value),
    )
  );
}
function fakeRoot() {
  return {
    nodes: [],
    html: "",
    isConnected: true,
    set innerHTML(value) {
      this.html = value;
      this.nodes = parseNodes(value);
    },
    get innerHTML() {
      return this.html;
    },
    querySelectorAll(selector) {
      return this.nodes.filter((node) => selector.split(",").some((s) => matches(node, s.trim())));
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] ?? null;
    },
    contains: () => true,
    append() {},
  };
}

// ---------------------------------------------------------------- harness

let registry;
function harness({
  role = "player",
  lang = "it",
  view = { page: "library", tab: "compendium" },
} = {}) {
  const state = createInitialState();
  registry.initState(state);
  const log = [],
    toasts = [],
    history = [];
  let seq = 0;
  const ctx = {
    state,
    role,
    lang,
    view: { id: "", tab: "", revision: "", returnTo: "", ...view },
    offline: false,
    registry,
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) =>
      typeof v === "object" && v ? v[ctx.lang] || v.it || v.en || "" : String(v ?? ""),
    icon: (name) => `<svg data-icon="${name}"></svg>`,
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate(page, params = {}) {
      ctx.view = { id: "", tab: "", revision: "", returnTo: "", page, ...params };
    },
    render() {},
    // Mirrors the store: one log entry per commit (private when local or private), undo
    // appends a correction with the same visibility, afterCommit runs on the new state.
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(new Error("offline"), { it: "offline", en: "offline" });
      const draft = structuredClone(ctx.state);
      mutator(draft);
      const id = `log-${++seq}`;
      const visibility = options.visibility === "private" || options.local ? "private" : "shared";
      draft.log = [
        ...(draft.log ?? []),
        {
          id,
          time: new Date().toISOString(),
          label,
          controller: ctx.role,
          kind: "change",
          visibility,
          rolls: [],
        },
      ];
      if (options.undoable !== false) history.push({ state: ctx.state, id, label, visibility });
      ctx.state = draft;
      const { afterCommit, ...recorded } = options;
      log.push({ label, options: recorded });
      afterCommit?.(ctx.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const last = history.pop();
      ctx.state = {
        ...last.state,
        log: [
          ...ctx.state.log,
          {
            id: `log-${++seq}`,
            label: last.label,
            controller: ctx.role,
            kind: "correction",
            revertsId: last.id,
            visibility: last.visibility,
            rolls: [],
          },
        ],
      };
    },
    canUndo: () => history.length > 0,
    undoLabel: () => log.at(-1)?.label ?? "",
    dialog(title, body, options) {
      ctx.modal = { title, body, options };
    },
    closeDialog() {},
    canControl: (actor) =>
      !!actor &&
      (actor.owner === ctx.role || ctx.role === "dm") &&
      (actor.visibility !== "private" || actor.owner === ctx.role),
    openConditions(actorId, tab) {
      ctx.conditions = { actorId, tab };
    },
  };
  registry.attach(ctx);
  return { ctx, log, toasts };
}
const form = (values) => ({
  get: (key) => (key in values ? values[key] : null),
  has: (key) => key in values,
});
function mount(ctx) {
  const el = fakeRoot();
  el.innerHTML = renderCompendium(ctx);
  bindCompendium(el, ctx);
  return el;
}

beforeEach(() => {
  resetUiState();
  registry = createRegistry({ document: null });
  assert.equal(registry.use("compendium", register).status, "built");
});

// ---------------------------------------------------------------- domain

test("spell facets narrow the list with removable chips and live counts (acceptance 1)", () => {
  let f = data.emptyFilter();
  assert.equal(data.filterEntries("spells", f).length, srd.SPELLS.length);
  f = data.toggleFacetValue(f, "level", "1");
  assert.equal(data.filterEntries("spells", f).length, 26);
  f = data.toggleFacetValue(f, "concentration", "yes");
  f = data.toggleFacetValue(f, "class", "wizard");
  const names = data.filterEntries("spells", f, "it").map((e) => e.name.it);
  assert.deepEqual(names, ["Individuazione del magico", "Sonno"]);
  assert.equal(data.countLabel("spells", names.length, "it"), "2 incantesimi");
  assert.equal(data.countLabel("spells", 1, "en"), "1 spell");
  const chips = data.activeChips("spells", f);
  assert.deepEqual(
    chips.map((c) => c.label.it),
    ["Livello 1", "Mago", "Concentrazione"],
  );
  // Counts apply the other facets: the class facet still offers alternatives.
  const classFacet = data.facetOptions("spells", f).find((x) => x.id === "class");
  assert.equal(classFacet.options.find((o) => o.value === "wizard").count, 2);
  assert.ok(classFacet.options.find((o) => o.value === "bard").count > 0);
  f = data.removeChip("spells", f, "class", "wizard");
  assert.equal(data.filterEntries("spells", f).length, 9);
  // Text search matches Italian and English names.
  assert.deepEqual(
    data.filterEntries("spells", { q: "fireball" }).map((e) => e.slug),
    ["fireball"],
  );
  assert.deepEqual(
    data.filterEntries("spells", { q: "palla di" }).map((e) => e.slug),
    ["fireball"],
  );
});

test("creature challenge range and item facets", () => {
  let f = data.setRange(data.emptyFilter(), "cr", "min", "1/4");
  f = data.setRange(f, "cr", "max", "1");
  const crs = data.filterEntries("creatures", f).map((e) => e.crValue);
  assert.ok(crs.length > 5 && crs.every((cr) => cr >= 0.25 && cr <= 1));
  assert.deepEqual(
    data.activeChips("creatures", f).map((c) => c.label.en),
    ["CR ≥ 1/4", "CR ≤ 1"],
  );
  assert.deepEqual(
    data.activeChips("creatures", data.removeChip("creatures", f, "cr", "min")).map((c) => c.value),
    ["max"],
  );
  const potions = data.filterEntries(
    "items",
    data.toggleFacetValue(data.emptyFilter(), "rarity", "common"),
  );
  assert.ok(potions.some((e) => e.slug === "potion-of-healing"));
  assert.equal(data.setRange(f, "cr", "min", "banana").facets.cr.min, undefined);
});

test("glossary terms link once, respect exclusions, inflections and capitalised actions", () => {
  const wolf = data.getEntry("srd2024:creature:wolf");
  const bite = wolf.actions.find((a) => a.id === "bite");
  const it = data.linkTerms(bite.summary.it, "it").filter((s) => s.term);
  assert.deepEqual(
    it.map((s) => [s.text, s.term]),
    [["prono", "srd2024:condition:prone"]],
  );
  const en = data.linkTerms(bite.summary.en, "en").filter((s) => s.term);
  assert.deepEqual(
    en.map((s) => s.term),
    ["srd2024:condition:prone"],
  );
  const prone = data.getEntry("srd2024:condition:prone");
  const nested = data
    .linkTerms(prone.summary.it, "it", { exclude: [prone.id] })
    .filter((s) => s.term);
  assert.deepEqual(
    nested.map((s) => s.term),
    ["srd2024:rule:disadvantage", "srd2024:rule:advantage"],
  );
  // "svantaggio" never matches "vantaggio"; a term links only its first occurrence.
  const twice = data.linkTerms("vantaggio e ancora vantaggio", "it").filter((s) => s.term);
  assert.equal(twice.length, 1);
  assert.equal(data.linkTerms("Coprono il bersaglio", "it").filter((s) => s.term).length, 0);
  assert.deepEqual(
    data
      .linkTerms("Effettua l'azione di Disimpegno; disimpegno minuscolo", "it")
      .filter((s) => s.term)
      .map((s) => s.text),
    ["Disimpegno"],
  );
  // Segments rebuild the original text exactly.
  assert.equal(
    data
      .linkTerms(bite.summary.it, "it")
      .map((s) => s.text)
      .join(""),
    bite.summary.it,
  );
  for (const t of data.TERMS) assert.ok(data.getEntry(t.id), t.id);
});

test("sources, edition, revision and EN/IT attribution (acceptance 2, 4)", () => {
  const sleep = data.getEntry("srd2024:spell:sleep");
  const it = data.sourceFor(sleep, "it"),
    en = data.sourceFor(sleep, "en");
  assert.deepEqual([it.pages, en.pages], [[191], [163]]);
  assert.match(it.url, /IT_SRD_CC_v5\.2\.1\.pdf$/);
  assert.equal(en.sha256, srd.SRD_DOCUMENTS.en.sha256);
  assert.deepEqual([it.edition, it.revision], ["2024", "5.2.1"]);
  assert.match(
    data.SRD_ATTRIBUTION.it,
    /^Quest'opera include materiale tratto dal System Reference Document 5\.2\.1/,
  );
  assert.match(
    data.SRD_ATTRIBUTION.en,
    /^This work includes material from the System Reference Document 5\.2\.1/,
  );
  assert.equal(data.CATALOG_REVISIONS[0].revision, "5.2.1");
});

test("reader chapters cover every glossary and condition entry once, in order", () => {
  const ids = data.READER_CHAPTERS.flatMap((c) => c.entries);
  assert.equal(ids.length, srd.RULES_GLOSSARY.length + srd.CONDITION_INDEX.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(data.readerNeighbors("actions").previous, null);
  assert.equal(data.readerNeighbors("actions").next.id, "d20");
  assert.equal(data.readerNeighbors("conditions").next, null);
  assert.equal(data.chapterOfEntry("srd2024:condition:prone").id, "conditions");
});

test("class summary and spell list pages come from the verified class catalogue", () => {
  const wizard = data.classSummary("wizard");
  assert.equal(wizard.hitDie, 6);
  assert.deepEqual(wizard.levels[4].spellSlots, { 1: 4, 2: 3, 3: 2 });
  assert.equal(wizard.levels[4].proficiencyBonus, 3);
  assert.equal(wizard.levels[16].proficiencyBonus, 6);
  assert.equal(wizard.maxSlotLevel, 9);
  assert.deepEqual(data.classSummary("warlock").levels[2].pactSlots, { level: 2, max: 2 });
  assert.equal(data.classSummary("fighter").levels[0].spellSlots, null);
  assert.equal(data.classSummary("nope"), null);
  const byLevel = data.classSpellList("wizard", "level", "it");
  const bySchool = data.classSpellList("wizard", "school", "it");
  const count = (groups) => groups.reduce((n, g) => n + g.entries.length, 0);
  assert.equal(count(byLevel), srd.SPELLS.filter((s) => s.classes.includes("wizard")).length);
  assert.equal(count(bySchool), count(byLevel));
  assert.equal(byLevel[0].label.it, "Trucchetti");
});

test("dice plans: advantage, disadvantage, criticals and physical face validation", () => {
  const adv = data.rollPlan({ kind: "d20", bonus: 4, mode: "advantage" });
  assert.deepEqual(data.resolvePlan(adv, [3, 17]), {
    faces: [3, 17],
    kept: 17,
    natural: 17,
    total: 21,
  });
  const dis = data.rollPlan({ kind: "d20", bonus: -1, mode: "disadvantage" });
  assert.equal(data.resolvePlan(dis, [3, 17]).total, 2);
  const crit = data.rollPlan({
    kind: "damage",
    terms: [{ dice: "1d6+2", type: "piercing" }],
    critical: true,
  });
  assert.equal(crit.dice.length, 2);
  assert.equal(data.resolvePlan(crit, [6, 6]).total, 14);
  assert.equal(data.formulaText(crit, "en"), "2d6 + 2 (critical)");
  assert.throws(() => data.resolvePlan(crit, [7, 1]), /Invalid face/);
  assert.throws(() => data.resolvePlan(crit, [1]), /Every die/);
  assert.equal(data.parseDice("2d6 − 1").modifier, -1);
  assert.equal(data.parseDice("2d7"), null);
});

test("conversions for sheets and scenes keep SRD provenance and valid combat data", () => {
  const sleep = data.getEntry("srd2024:spell:sleep");
  const row = data.sheetSpellRow(sleep, { id: "x", grantName: "Classe: Mago" });
  assert.deepEqual(
    [row.level, row.prepared, row.compendiumRef.id, row.source.revision],
    [1, false, sleep.id, "5.2.1"],
  );
  const potion = data.sheetItemRow(data.getEntry("srd2024:item:potion-of-healing"), {
    id: "p",
    quantity: 2,
  });
  assert.deepEqual(
    [potion.kind, potion.weight, potion.healing, potion.quantity],
    ["consumable", 0.25, 2, 2],
  );
  assert.equal(data.sheetItemRow(data.getEntry("srd2024:item:rope"), { id: "r" }).weight, 2.5);
  const wolf = data.getEntry("srd2024:creature:wolf");
  const melee = data.srdMeleeProfile(wolf);
  assert.ok(isValidMeleeProfile(melee), "the SRD bite is a valid structured melee profile");
  assert.deepEqual(
    [melee.attackBonus, melee.damageDice[0], melee.damageModifier, melee.reachMeters],
    [4, { count: 1, sides: 6 }, 2, 1.5],
  );
  // Two damage terms (Rend) cannot become one structured attack: nothing is inferred.
  assert.equal(data.srdMeleeProfile(data.getEntry("srd2024:creature:young-green-dragon")), null);
  const npc = data.npcFromCreature(wolf, { id: "n", name: "Lupo" });
  assert.deepEqual([npc.input.hp, npc.input.ac, npc.input.speed], [11, 12, 12]);
  assert.deepEqual(
    data
      .searchEntries("wolf")
      .map((e) => e.slug)
      .sort(),
    ["dire-wolf", "wolf"],
  );
  assert.equal(data.embedEntry("srd2024:class:wizard"), null);
});

// ---------------------------------------------------------------- UI and flows

test("registration: library section, DM-only screen drawer, search and seeded slices", () => {
  const { ctx } = harness();
  assert.ok(registry.get("library-section", "compendium", ctx));
  assert.equal(
    registry.list("table-panel", ctx).some((c) => c.id === "compendium-screen"),
    false,
  );
  ctx.role = "dm";
  assert.ok(registry.list("table-panel", ctx).some((c) => c.id === "compendium-screen"));
  const results = registry.search(ctx, "lupo");
  assert.ok(results.some((r) => r.params?.revision === "srd2024:creature:wolf"));
  assert.deepEqual(
    ctx.state.ext.compendium.screens.dm.cells.map((c) => c.kind),
    ["conditions", "actions", "combat"],
  );
  assert.deepEqual(ctx.state.ext["compendium-rolls"].rolls, []);
  assert.deepEqual(parseView("print:srd2024:spell:sleep"), {
    page: "print",
    id: "srd2024:spell:sleep",
  });
  assert.deepEqual(parseView("reader:nope"), { page: "missing" });
  assert.deepEqual(parseView("class:wizard"), { page: "class", classId: "wizard" });
});

test("browser handlers: facets, chips, clear and category tabs re-render the list", () => {
  const { ctx } = harness();
  const el = mount(ctx);
  assert.match(el.html, /68 incantesimi/);
  el.querySelector('[data-facet="level"][value="1"]').fire("change");
  el.querySelector('[data-facet="concentration"][value="yes"]').fire("change");
  el.querySelector('[data-facet="class"][value="wizard"]').fire("change");
  assert.match(el.html, /2 incantesimi/);
  assert.equal(el.querySelectorAll("[data-chip-facet]").length, 3);
  assert.match(el.html, /Individuazione del magico/);
  el.querySelector('[data-chip-facet="class"]').fire("click");
  assert.match(el.html, /9 incantesimi/);
  el.querySelector("[data-chips-clear]").fire("click");
  assert.match(el.html, /68 incantesimi/);
  el.querySelector('[data-category="creatures"]').fire("click");
  assert.match(el.html, /32 creature/);
  el.querySelector('[data-facet-range="min"]').value = "5";
  el.querySelector('[data-facet-range="min"]').fire("change");
  assert.match(el.html, /GS ≥ 5/);
  // The expanded row shows the stat block inline (DDB listing rows).
  el.querySelector('[data-row-toggle="srd2024:creature:troll"]').fire("click");
  assert.match(el.html, /compendium-statblock/);
  // Filters are per identity: the DM starts from a clean browser.
  const dm = harness({ role: "dm" });
  assert.match(mount(dm.ctx).html, /68 incantesimi/);
});

test("entry page: source, edition, attribution, nested terms and content language", () => {
  const { ctx } = harness({
    view: { page: "library", tab: "compendium", revision: "srd2024:creature:wolf" },
  });
  let html = renderCompendium(ctx);
  assert.match(html, /Regole 2024/);
  assert.match(html, /SRD 5\.2\.1/);
  assert.match(html, /data-compendium-term="srd2024:condition:prone"/);
  assert.match(html, /pagina 394/);
  assert.match(html, /Quest&#39;opera include materiale/);
  const el = mount(ctx);
  el.querySelector('[data-content-lang-set="en"]').fire("click");
  html = el.html;
  assert.match(html, /<h2>Wolf<\/h2>/);
  assert.match(html, /English · pagina 364/);
  assert.match(html, /This work includes material/);
  assert.equal(uiState(ctx).contentLang, "en");
  // DM sees scene and screen commands; the player does not.
  assert.doesNotMatch(renderCompendium(ctx), /data-cmd="scene"/);
  const dm = harness({ role: "dm", view: ctx.view });
  assert.match(renderCompendium(dm.ctx), /data-cmd="scene"/);
  assert.match(renderCompendium(dm.ctx), /data-cmd="pin"/);
});

test("adding to a sheet reuses the sheet rows, refuses duplicates and keeps privacy", () => {
  const { ctx, log } = harness();
  const sleep = data.getEntry("srd2024:spell:sleep");
  assert.throws(
    () => addToSheet(ctx, sleep, "livia", { grantName: " " }),
    (e) => /concede/.test(e.it),
  );
  addToSheet(ctx, sleep, "livia", { grantName: "Classe: Mago" });
  const row = ctx.state.actors.livia.spells.at(-1);
  assert.deepEqual([row.name.it, row.prepared, row.grantName.it], ["Sonno", false, "Classe: Mago"]);
  assert.throws(
    () => addToSheet(ctx, sleep, "livia", { grantName: "x" }),
    (e) => /già/.test(e.it),
  );
  const rope = data.getEntry("srd2024:item:rope");
  addToSheet(ctx, rope, "livia", { quantity: 1 });
  addToSheet(ctx, rope, "livia", { quantity: 2 });
  const ropes = ctx.state.actors.livia.inventory.filter((i) => i.compendiumRef?.id === rope.id);
  assert.equal(ropes.length, 1);
  assert.equal(ropes[0].quantity, 3);
  assert.deepEqual(ropes[0].name, { it: "Corda", en: "Rope" });
  assert.throws(
    () => addToSheet(ctx, rope, "doran", { quantity: 1 }),
    (e) => /non disponibile/.test(e.it),
  );
  assert.deepEqual(log.at(-1).options, {});
  // A private sheet is a local, private change.
  ctx.state.actors.livia.visibility = "private";
  addToSheet(ctx, data.getEntry("srd2024:spell:shield"), "livia", { grantName: "Classe: Mago" });
  assert.deepEqual(log.at(-1).options, { local: true, visibility: "private" });
  // Sheet context from the Library button chooses the target and the category once.
  ctx.view = {
    page: "library",
    tab: "compendium",
    returnTo: JSON.stringify({ page: "characters", actorId: "livia", tab: "inventory" }),
  };
  assert.equal(sheetTarget(ctx).actor.id, "livia");
  assert.match(renderCompendium(ctx), /Scegli per <strong>Livia<\/strong>/);
  assert.equal(uiState(ctx).category, "items");
});

test("adding a creature to a scene uses preparation's NPC flow; players are refused", () => {
  const player = harness();
  const wolf = data.getEntry("srd2024:creature:wolf");
  assert.throws(
    () =>
      addCreatureToScene(player.ctx, wolf, { sceneId: "old-watch", name: "Lupo", team: "watch" }),
    (e) => /Solo il DM/.test(e.it),
  );
  const { ctx } = harness({ role: "dm" });
  const { actorId } = addCreatureToScene(ctx, wolf, {
    sceneId: "old-watch",
    name: "Lupo grigio",
    team: "watch",
  });
  const actor = ctx.state.actors[actorId];
  assert.deepEqual(
    [actor.name, actor.kind, actor.owner, actor.hp, actor.ac, actor.speed],
    ["Lupo grigio", "npc", "dm", 11, 12, 12],
  );
  assert.deepEqual(actor.abilities, wolf.abilities);
  assert.equal(actor.combatProfile.team, "watch");
  assert.ok(isValidMeleeProfile(actor.combatProfile.meleeAttack));
  assert.equal(actor.provenance.kind, "srd");
  const token = ctx.state.scenes[0].tokens.find((t) => t.actorId === actorId);
  assert.ok(token);
  for (const other of ctx.state.scenes[0].tokens.filter((t) => t !== token))
    assert.ok(Math.hypot(other.x - token.x, other.y - token.y) >= 50, "placed on a free spot");
  // It does not join initiative.
  assert.ok(!ctx.state.combat.order.includes(actorId));
});

test("rolls: physical and digital faces, DM-only visibility, immutable evidence", () => {
  const { ctx, log } = harness({ role: "dm" });
  const bite = rollRequest({ entry: "srd2024:creature:wolf", action: "bite", kind: "attack" });
  assert.equal(bite.bonus, 4);
  const result = recordRoll(ctx, bite, {
    mode: "physical",
    faces: [7, 15],
    visibility: "private",
    options: { mode: "advantage" },
  });
  assert.equal(result.record.total, 19);
  assert.deepEqual(log.at(-1).options, { undoable: false, visibility: "private" });
  assert.match(log.at(-1).label, /\[7, 15\] = 19 · dado fisico/);
  assert.throws(
    () => recordRoll(ctx, bite, { mode: "physical", faces: [21], options: {} }),
    /Invalid face/,
  );
  const damage = rollRequest({ entry: "srd2024:creature:wolf", action: "bite", kind: "damage" });
  recordRoll(ctx, damage, { mode: "digital", faces: [3, 5], options: { critical: true } });
  assert.equal(ctx.state.ext["compendium-rolls"].rolls.at(-1).total, 10);
  // The player never sees the DM-only roll; the shared one is visible.
  const html = (role) => {
    ctx.role = role;
    ctx.view = { page: "library", tab: "compendium", revision: "srd2024:creature:wolf" };
    return renderCompendium(ctx);
  };
  assert.match(html("player"), /\[3, 5\] = <strong>10<\/strong>/);
  ctx.state.ext["compendium-rolls"].rolls.pop();
  assert.doesNotMatch(html("player"), /Ultimo tiro/);
  assert.match(html("dm"), /solo DM/);
  // A player's request for a DM-only roll stays shared.
  ctx.role = "player";
  assert.equal(
    recordRoll(ctx, bite, { mode: "digital", faces: [2], visibility: "private", options: {} })
      .record.visibility,
    "shared",
  );
  assert.equal(
    rollRequest({ entry: "srd2024:spell:fireball", kind: "damage" }).terms[0].dice,
    "8d6",
  );
  assert.equal(
    rollRequest({ entry: "srd2024:item:potion-of-healing", kind: "healing" }).healing,
    true,
  );
  assert.throws(() =>
    rollRequest({ entry: "srd2024:creature:wolf", action: "nope", kind: "attack" }),
  );
  ctx.offline = true;
  assert.throws(
    () => recordRoll(ctx, bite, { mode: "digital", faces: [2], options: {} }),
    /offline/,
  );
});

test("journal embed: a private campaign draft with the marker; the entry renders the block", () => {
  const { ctx, log } = harness({ role: "dm" });
  const wolf = data.getEntry("srd2024:creature:wolf");
  const { draftId, page } = startEmbedDraft(ctx, wolf, { entryId: "legacy-recap-summary" });
  assert.equal(page, "campaign");
  assert.deepEqual(log.at(-1).options, { local: true, visibility: "private", undoable: false });
  const draft = content.getCampaignDraft(ctx.state, draftId, "dm");
  assert.ok(draft.data.body.endsWith("\n\n@Embed[srd2024:creature:wolf]"));
  assert.deepEqual(embedRefs(draft.data.body), ["srd2024:creature:wolf"]);
  const html = renderTextWithEmbeds(
    ctx,
    "Prima <b>riga</b>\n@Embed[srd2024:creature:wolf] e @Embed[srd2024:nope]",
  );
  assert.match(html, /Prima &lt;b&gt;riga&lt;\/b&gt;/);
  assert.match(html, /data-text-embed="compendium"/);
  assert.match(html, /compendium-statblock/);
  assert.match(html, /@Embed\[srd2024:nope\]/, "unknown refs stay as text");
  // A new personal note has no campaign.
  const note = startEmbedDraft(ctx, data.getEntry("srd2024:spell:sleep"), { kind: "note" });
  assert.equal(note.page, "notes");
  assert.equal(content.getCampaignDraft(ctx.state, note.draftId, "dm").campaignId, null);
});

test("bookmarks are personal: reader toggle, rename and removal never reach the DM", () => {
  const { ctx, log } = harness({
    view: { page: "library", tab: "compendium", revision: "reader:conditions" },
  });
  const el = mount(ctx);
  el.querySelector('[data-reader-bookmark="srd2024:condition:prone"]').fire("click");
  assert.deepEqual(log.at(-1).options, { local: true, visibility: "private" });
  const list = ctx.state.ext.compendium.bookmarks.player;
  assert.deepEqual(list[0].target, {
    kind: "reader",
    chapterId: "conditions",
    entryId: "srd2024:condition:prone",
  });
  const again = mount(ctx);
  assert.match(again.html, /Prono · Condizioni/);
  again.querySelector("[data-bookmark-rename]").fire("click");
  ctx.modal.options.onSubmit(form({ name: "Da rileggere" }));
  assert.equal(ctx.state.ext.compendium.bookmarks.player[0].name, "Da rileggere");
  const dm = harness({ role: "dm", view: ctx.view });
  dm.ctx.state = ctx.state;
  assert.doesNotMatch(renderCompendium(dm.ctx), /Da rileggere/);
  mount(ctx).querySelector("[data-bookmark-remove]").fire("click");
  assert.equal(ctx.state.ext.compendium.bookmarks.player.length, 0);
});

test("DM screen: default panels, pin, move, widen, remove and undo", () => {
  const { ctx } = harness({ role: "dm" });
  pinToScreen(ctx, "srd2024:creature:wolf");
  assert.throws(
    () => pinToScreen(ctx, "srd2024:creature:wolf"),
    (e) => /già/.test(e.it),
  );
  const el = fakeRoot();
  el.innerHTML = renderScreen(ctx);
  registry.get("table-panel", "compendium-screen").bind(el, ctx, { selectedActorId: "goblin-1" });
  assert.match(el.html, /compendium-statblock/);
  const cells = () => ctx.state.ext.compendium.screens.dm.cells;
  const wolfCell = cells().at(-1).id;
  el.querySelector(`[data-cell-move="-1"][data-cell="${wolfCell}"]`).fire("click");
  assert.equal(cells()[2].id, wolfCell);
  el.innerHTML = renderScreen(ctx);
  registry.get("table-panel", "compendium-screen").bind(el, ctx, { selectedActorId: "goblin-1" });
  el.querySelector(`[data-cell-wide][data-cell="${wolfCell}"]`).fire("click");
  assert.equal(cells().find((c) => c.id === wolfCell).wide, true);
  el.innerHTML = renderScreen(ctx);
  registry.get("table-panel", "compendium-screen").bind(el, ctx, { selectedActorId: "goblin-1" });
  el.querySelector(`[data-cell-remove][data-cell="${wolfCell}"]`).fire("click");
  assert.equal(
    cells().some((c) => c.id === wolfCell),
    false,
  );
  ctx.undo();
  assert.equal(
    cells().some((c) => c.id === wolfCell),
    true,
  );
  const player = harness();
  assert.throws(
    () => pinToScreen(player.ctx, "srd2024:creature:wolf"),
    (e) => /DM/.test(e.it),
  );
});

test("saved slices normalize invalid data and refuse future versions", () => {
  const { ctx } = harness();
  const state = structuredClone(ctx.state);
  state.ext.compendium = {
    bookmarks: { player: [{ id: "b", target: { kind: "entry", entryId: "x" } }, null] },
    screens: {
      dm: {
        cells: [
          { id: "c", kind: "entry", entryId: "nope" },
          { id: "d", kind: "coins" },
        ],
      },
    },
  };
  state.extVersions.compendium = 1;
  const fresh = createRegistry({ document: null });
  fresh.use("compendium", register);
  fresh.initState(state);
  assert.deepEqual(
    state.ext.compendium.screens.dm.cells.map((c) => c.kind),
    ["coins"],
  );
  assert.equal(state.ext.compendium.bookmarks.player.length, 1);
  assert.deepEqual(state.ext.compendium.bookmarks.dm, []);
});

test("library copy: a private Library draft prefilled from the entry that validates", () => {
  const { ctx, log } = harness();
  assert.equal(libraryCopyType(data.getEntry("srd2024:rule:attack")), null);
  assert.equal(libraryCopyType(data.getEntry("srd2024:item:potion-of-healing")), "consumable");
  assert.equal(libraryCopyType(data.getEntry("srd2024:item:longsword")), "weapon");
  const id = startLibraryCopy(ctx, data.getEntry("srd2024:spell:shield"));
  assert.deepEqual(log.at(-1).options, { local: true, visibility: "private" });
  const draft = hb.getHomebrewDraft(ctx.state, id, "player");
  assert.deepEqual(
    [draft.type, draft.data.name.en, draft.data.fields.level],
    ["spell", "Shield", 1],
  );
  assert.equal(draft.data.source.kind, "reconstruction");
  assert.match(draft.data.source.reference, /srd2024:spell:shield · CC BY 4\.0/);
  assert.deepEqual(hb.previewHomebrewDraft(ctx.state, id, "player").errors, []);
  const ropeId = startLibraryCopy(ctx, data.getEntry("srd2024:item:rope"));
  const rope = hb.getHomebrewDraft(ctx.state, ropeId, "player");
  assert.deepEqual([rope.data.fields.weight, rope.data.fields.value], [2.5, 1]);
  assert.throws(() => hb.getHomebrewDraft(ctx.state, id, "dm"), /unavailable/);
});

// ---------------------------------------------------------------- review fixes (B16)

const playerLabels = (state) =>
  projectLog(state, "player", { lang: "it" })
    .map((item) => item.label)
    .join(" | ");

test("review P1: a creature added to a scene writes a DM-only log line; Undo stays DM-only", () => {
  const { ctx, log } = harness({ role: "dm" });
  const wolf = data.getEntry("srd2024:creature:wolf");
  addCreatureToScene(ctx, wolf, { sceneId: "old-watch", name: "Figura nell'ombra", team: "watch" });
  assert.deepEqual(log.at(-1).options, { visibility: "private" });
  const entry = ctx.state.log.at(-1);
  assert.equal(entry.visibility, "private");
  assert.match(entry.label, /Figura nell'ombra \(Lupo\)/, "the DM keeps an informative line");
  // The players' log (chat projection, Table log filter) never reads it.
  assert.doesNotMatch(playerLabels(ctx.state), /Lupo|Figura nell'ombra|cortile/);
  assert.equal(
    ctx.state.log.filter((l) => l.visibility !== "private" || l.controller === "player").at(-1)
      ?.label === entry.label,
    false,
  );
  ctx.undo();
  assert.equal(ctx.state.log.at(-1).kind, "correction");
  assert.equal(ctx.state.log.at(-1).visibility, "private");
  assert.doesNotMatch(playerLabels(ctx.state), /Lupo|Figura nell'ombra/);
  // A scene not yet revealed: its name never reaches the players either.
  ctx.state.scenes.push({
    ...structuredClone(ctx.state.scenes[0]),
    id: "secret-crypt",
    name: "Cripta segreta",
    revealed: false,
    revealedTo: [],
    tokens: [],
  });
  addCreatureToScene(ctx, wolf, { sceneId: "secret-crypt", name: "Guardiano", team: "watch" });
  assert.doesNotMatch(playerLabels(ctx.state), /Cripta segreta|Guardiano/);
});

test("review P2: hidden arrival, hidden name and drop at the clicked point", () => {
  const { ctx } = harness({ role: "dm" });
  ctx.state.ext["token-menu"] = tokenMenuSeed();
  const wolf = data.getEntry("srd2024:creature:wolf");
  const { actorId, tokenId } = addCreatureToScene(ctx, wolf, {
    sceneId: "old-watch",
    name: "Figura nell'ombra",
    team: "watch",
    hidden: true,
    hideName: true,
    point: { x: 310, y: 205 },
  });
  const scene = ctx.state.scenes.find((s) => s.id === "old-watch");
  const token = scene.tokens.find((t) => t.id === tokenId);
  assert.equal(token.hidden, true);
  assert.deepEqual([token.x, token.y], [310, 205]);
  assert.equal(observesToken(ctx.state, token, "player"), false, "players do not see it");
  assert.equal(observesToken(ctx.state, token, "dm"), true);
  assert.match(ctx.state.actors[actorId].name, /^Creatura sconosciuta \d+$/);
  assert.equal(ctx.state.ext["token-menu"].names[actorId].trueName, "Figura nell'ombra");
  // Without the token menu a hidden name is refused rather than faked.
  delete ctx.state.ext["token-menu"];
  assert.throws(
    () =>
      addCreatureToScene(ctx, wolf, {
        sceneId: "old-watch",
        name: "X",
        team: "watch",
        hideName: true,
      }),
    (e) => /menu della pedina/.test(e.it),
  );

  // The entry page dialog: hidden by default on a scene not revealed, map placement for
  // the active scene, then the Table tool drops the creature where the DM clicks.
  ctx.view = { page: "library", tab: "compendium", revision: wolf.id };
  const el = mount(ctx);
  el.querySelector('[data-cmd="scene"]').fire("click");
  assert.match(
    ctx.modal.body,
    /name="hidden" data-scene-hidden >/,
    "revealed scene: visible by default",
  );
  assert.match(ctx.modal.body, /value="map" checked/);
  const before = Object.keys(ctx.state.actors).length;
  ctx.modal.options.onSubmit(
    form({ scene: "old-watch", name: "Ombra", team: "watch", hidden: "on", where: "map" }),
  );
  assert.equal(Object.keys(ctx.state.actors).length, before, "nothing created before the click");
  assert.equal(ctx.view.page, "table");
  const tool = registry.get("table-tool", "compendium-place", ctx);
  assert.ok(tool, "the placement tool is offered while a creature waits");
  const panel = registry.get("table-panel", "compendium-place", ctx);
  assert.ok(panel && /Ombra/.test(panel.render(ctx, { mode: "move" })));
  const scene0 = ctx.state.scenes.find((s) => s.id === "old-watch");
  const table = {
    scene: scene0,
    mode: "compendium-place",
    point: () => ({ x: 420, y: 260 }),
    setMode(mode) {
      this.mode = mode;
    },
    select(id) {
      this.selected = id;
    },
    message() {},
  };
  tool.onClick(ctx, {}, table);
  const placed = ctx.state.actors[table.selected];
  assert.equal(placed.name, "Ombra");
  const placedToken = ctx.state.scenes[0].tokens.find((t) => t.actorId === placed.id);
  assert.deepEqual([placedToken.x, placedToken.y, placedToken.hidden], [420, 260, true]);
  assert.equal(table.mode, "move");
  assert.equal(registry.get("table-tool", "compendium-place", ctx), null, "tool gone once placed");
  // A scene that is not revealed defaults to a hidden arrival and a free spot.
  ctx.state.scenes.push({
    ...structuredClone(scene0),
    id: "crypt",
    name: "Cripta",
    revealed: false,
    tokens: [],
  });
  ctx.view = { page: "library", tab: "compendium", revision: wolf.id };
  const again = mount(ctx);
  again.querySelector('[data-cmd="scene"]').fire("click");
  assert.match(ctx.modal.body, /· non rivelata/);
  // The DM screen offers the same dialog on a pinned creature, fixed to the Table's scene.
  pinToScreen(ctx, wolf.id);
  const screen = fakeRoot();
  screen.innerHTML = renderScreen(ctx);
  registry.get("table-panel", "compendium-screen").bind(screen, ctx, table);
  screen.querySelector(`[data-cell-place="${wolf.id}"]`).fire("click");
  assert.match(ctx.modal.body, /type="hidden" name="scene" value="old-watch"/);
});

test("review P2: compendium rolls are log rolls with roll-accepted, reasoned correction and withdrawal", () => {
  const { ctx } = harness({ role: "dm" });
  const accepted = [];
  registry.on("roll-accepted", (payload) => accepted.push(payload));
  const bite = rollRequest({ entry: "srd2024:creature:wolf", action: "bite", kind: "attack" });
  const { record } = recordRoll(ctx, bite, {
    mode: "physical",
    faces: [5, 11],
    visibility: "shared",
    options: { mode: "advantage" },
  });
  assert.deepEqual(record.faces, [5, 11], "callers still read faces");
  const entry = ctx.state.log.at(-1);
  assert.equal(entry.rolls.length, 1);
  const roll = entry.rolls[0];
  assert.deepEqual(
    [roll.source, roll.kind, roll.owner, roll.visibility, roll.mode, roll.rollMode],
    ["compendium", "attack", "dm", "shared", "physical", "advantage"],
  );
  assert.deepEqual(roll.dice, [{ count: 2, sides: 20 }]);
  assert.deepEqual([roll.values, roll.natural, roll.modifier, roll.total], [[5, 11], 11, 4, 15]);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].logId, entry.id);
  assert.equal(accepted[0].roll.id, roll.id);
  // The chat projection shows a roll card to the players for a shared roll.
  const card = projectLog(ctx.state, "player").find((item) => item.id === "log:" + entry.id);
  assert.equal(card.type, "rolls");
  assert.deepEqual(card.rolls[0].values, [5, 11]);
  // Correction of a mistyped physical face, with a reason; the earlier faces stay.
  assert.throws(
    () => correctRoll(ctx, record.id, [5, 11], "x"),
    (e) => /uguali/.test(e.it),
  );
  assert.throws(
    () => correctRoll(ctx, record.id, [5, 12], " "),
    (e) => /motivo/.test(e.it),
  );
  assert.throws(
    () => correctRoll(ctx, record.id, [5, 21], "x"),
    (e) => /faccia/.test(e.it),
  );
  const player = { ...ctx, role: "player" };
  assert.throws(
    () => correctRoll(player, record.id, [5, 12], "x"),
    (e) => /Solo chi ha tirato/.test(e.it),
  );
  const corrected = correctRoll(ctx, record.id, [5, 16], "Avevo letto 11, era 16");
  assert.deepEqual(
    [corrected.values, corrected.total, corrected.status],
    [[5, 16], 20, "corrected"],
  );
  assert.deepEqual(corrected.corrections[0].values, [5, 11]);
  const fix = ctx.state.log.at(-1);
  assert.match(
    fix.label,
    /Correzione del tiro.*\[5, 11\] → \[5, 16\] = 20 · Motivo: Avevo letto 11/,
  );
  assert.deepEqual(
    [fix.rolls[0].correctionReason, fix.rolls[0].previousValues, fix.rolls[0].corrects],
    ["Avevo letto 11, era 16", [5, 11], record.id],
  );
  assert.equal(accepted.length, 2);
  assert.equal(entry.rolls[0].values.join(), "5,11", "the first log roll is unchanged");
  const html = (role) => {
    ctx.role = role;
    ctx.view = { page: "library", tab: "compendium", revision: "srd2024:creature:wolf" };
    return renderCompendium(ctx);
  };
  assert.match(html("dm"), /Corretto: Avevo letto 11, era 16 \(prima 5, 11\)/);
  assert.match(html("dm"), /data-roll-withdraw=/);
  assert.doesNotMatch(html("player"), /data-roll-correct=|data-roll-withdraw=/);
  ctx.role = "dm";
  // Digital faces are never edited: they are withdrawn, and an identical retry reuses them.
  const damage = rollRequest({ entry: "srd2024:creature:wolf", action: "bite", kind: "damage" });
  const digital = recordRoll(ctx, damage, { mode: "digital", faces: [1], options: {} }).record;
  assert.throws(
    () => correctRoll(ctx, digital.id, [4], "x"),
    (e) => /digitali/.test(e.it),
  );
  withdrawRoll(ctx, digital.id, "Tirato per sbaglio");
  assert.equal(
    ctx.state.ext["compendium-rolls"].rolls.find((r) => r.id === digital.id).status,
    "withdrawn",
  );
  assert.match(ctx.state.log.at(-1).label, /Tiro ritirato.*Motivo: Tirato per sbaglio/);
  assert.equal(ctx.state.log.at(-1).rolls.length, 0, "a withdrawal is not a new roll");
  assert.throws(
    () => withdrawRoll(ctx, digital.id, "x"),
    (e) => /già ritirato/.test(e.it),
  );
  const retry = recordRoll(ctx, damage, { mode: "digital", faces: [6], options: {} }).record;
  assert.deepEqual([retry.faces, retry.status, retry.reusedFrom], [[1], "reused", digital.id]);
  assert.equal(ctx.state.log.at(-1).rolls[0].status, "reused");
  const fresh = recordRoll(ctx, damage, { mode: "digital", faces: [6], options: {} }).record;
  assert.deepEqual([fresh.faces, fresh.status], [[6], "accepted"]);
  // A DM-only roll stays out of the players' log and chat.
  recordRoll(ctx, bite, { mode: "digital", faces: [9], visibility: "private", options: {} });
  assert.equal(ctx.state.log.at(-1).rolls[0].visibility, "private");
  assert.ok(
    !projectLog(ctx.state, "player").some((i) => i.id === "log:" + ctx.state.log.at(-1).id),
  );
});

test("review P2: tables embed in journal text (SRD reference tables and random tables)", () => {
  const { ctx } = harness({ role: "dm" });
  ctx.state.ext["random-tables"] = {
    tables: [
      {
        id: "rumours",
        name: { it: "Voci alla Lanterna", en: "Rumours at the Lantern" },
        sides: 4,
        playersCanUse: true,
        variables: [],
        results: [
          { id: "a", weight: 3, text: { it: "Il guardiano è sparito", en: "The keeper is gone" } },
          { id: "b", weight: 1, text: { it: "Luci sul lago", en: "Lights on the lake" } },
        ],
      },
      {
        id: "secret",
        name: { it: "Incontri segreti", en: "Secret encounters" },
        sides: 2,
        playersCanUse: false,
        variables: [],
        results: [{ id: "c", weight: 2, text: { it: "Imboscata", en: "Ambush" } }],
      },
    ],
  };
  const xp = renderTextWithEmbeds(ctx, "@Embed[srd2024:table:xp-by-cr]");
  assert.match(xp, /data-text-embed="compendium-tables"/);
  assert.match(xp, /155\.000/, "the full XP table, CR 30 included");
  const coins = renderTextWithEmbeds(ctx, "@Embed[srd2024:table:coins]");
  assert.match(coins, /Moneta d'oro|Moneta d&#39;oro/);
  const rumours = renderTextWithEmbeds(ctx, "@Embed[table:rumours]");
  assert.match(rumours, /1–3<\/td><td>Il guardiano è sparito/);
  assert.match(rumours, /<td>4<\/td><td>Luci sul lago/);
  assert.match(renderTextWithEmbeds(ctx, "@Embed[table:secret]"), /Imboscata/);
  ctx.role = "player";
  const hidden = renderTextWithEmbeds(ctx, "@Embed[table:secret]");
  assert.doesNotMatch(hidden, /Imboscata|Incontri segreti/);
  assert.match(hidden, /riservata al DM/);
  assert.match(renderTextWithEmbeds(ctx, "@Embed[table:nope]"), /@Embed\[table:nope\]/);
  assert.deepEqual(
    embeddableTables(ctx).map((t) => t.id),
    ["srd2024:table:xp-by-cr", "srd2024:table:coins", "table:rumours"],
  );
  ctx.role = "dm";
  const { draftId } = startEmbedDraft(
    ctx,
    embeddableTables(ctx).find((t) => t.id === "table:secret"),
    { entryId: "legacy-recap-summary", returnTo: { page: "table" } },
  );
  assert.ok(
    content.getCampaignDraft(ctx.state, draftId, "dm").data.body.endsWith("@Embed[table:secret]"),
  );
});

test("review P2: an editable copy carries the game data of creatures, spells and items", () => {
  const { ctx } = harness({ role: "dm" });
  const wolf = data.getEntry("srd2024:creature:wolf");
  const id = startLibraryCopy(ctx, wolf);
  const draft = hb.getHomebrewDraft(ctx.state, id, "dm");
  const it = draft.data.description.it;
  for (const needle of [
    "CA 12",
    "PF 11 (2d8",
    "Velocità 12 m",
    "DES 15 (+2",
    "Morso.",
    "Colpire +4",
    "GS 1/4",
  ])
    assert.ok(it.includes(needle), `creature copy lacks ${needle}: ${it}`);
  assert.match(draft.data.description.en, /AC 12 · Initiative/);
  assert.deepEqual(hb.previewHomebrewDraft(ctx.state, id, "dm").errors, []);
  const fire = copyText(data.getEntry("srd2024:spell:fireball"), "it");
  for (const needle of [
    "Tempo di lancio: 1 azione",
    "Gittata:",
    "Componenti: V, S, M",
    "Durata: Istantanea",
    "Tiro salvezza: Destrezza",
    "Danni: 8d6",
  ])
    assert.ok(fire.includes(needle), `spell copy lacks ${needle}: ${fire}`);
  assert.match(copyText(data.getEntry("srd2024:item:longsword"), "it"), /Danni: 1d8/);
  ctx.view = { page: "library", tab: "compendium", revision: wolf.id };
  assert.match(
    renderCompendium(ctx),
    // BI-26: the copy opens in the structured monster creator, with revert to source.
    /creatore di mostri: CA, PF, caratteristiche e azioni sono campi\. «Ripristina alla fonte»/,
  );
});

test("review P3: class pages, translation badge, sheet wording, screen picker and tabs", () => {
  const wizard = data.classSummary("wizard");
  assert.deepEqual(
    wizard.levels[0].features.map((f) => f.it),
    ["Incantesimi", "Adepto dei rituali", "Recupero arcano"],
  );
  assert.ok(
    [
      "fighter",
      "barbarian",
      "rogue",
      "paladin",
      "ranger",
      "warlock",
      "monk",
      "sorcerer",
      "bard",
      "cleric",
      "druid",
    ].every((id) => data.classSummary(id).levels[0].features.every((f) => f.itVerified)),
  );
  assert.equal(data.classSummary("paladin").hasCantrips, false);
  assert.equal(data.classSummary("wizard").hasCantrips, true);
  const { ctx } = harness({
    view: { page: "library", tab: "compendium", revision: "class:paladin" },
  });
  const paladin = renderCompendium(ctx);
  assert.doesNotMatch(paladin, /Trucchetti<\/th>/);
  assert.match(paladin, /Imposizione delle mani, Incantesimi, Padronanza d’armi/);
  ctx.view = { page: "library", tab: "compendium", revision: "class:fighter" };
  assert.match(renderCompendium(ctx), /Stile di combattimento, Recuperare energie/);
  // The translation badge follows the content language.
  ctx.view = { page: "library", tab: "compendium", revision: "srd2024:creature:wolf" };
  uiState(ctx).contentLang = "en";
  assert.match(renderCompendium(ctx), /Disponibile anche in italiano \(SRD IT\)/);
  assert.doesNotMatch(renderCompendium(ctx), /Traduzione italiana ufficiale/);
  uiState(ctx).contentLang = "it";
  assert.match(renderCompendium(ctx), /Traduzione italiana ufficiale \(SRD IT\)/);
  // Gender-neutral confirmation when adding to a sheet.
  ctx.view = { page: "library", tab: "compendium", revision: "srd2024:item:potion-of-healing" };
  const el = mount(ctx);
  el.querySelector('[data-cmd="sheet"]').fire("click");
  ctx.modal.options.onSubmit(form({ actor: "livia", quantity: "1" }));
  assert.match(renderCompendium(ctx), /Aggiunto a Livia: Pozione di guarigione\./);
  // ARIA tabs: tabpanel, roving tabindex, arrows select the next category.
  ctx.view = { page: "library", tab: "compendium" };
  const browse = mount(ctx);
  assert.match(browse.html, /role="tabpanel" id="compendium-tabpanel"/);
  assert.match(
    browse.html,
    /id="compendium-tab-spells" aria-controls="compendium-tabpanel" tabindex="0"/,
  );
  assert.match(
    browse.html,
    /id="compendium-tab-creatures" aria-controls="compendium-tabpanel" tabindex="-1"/,
  );
  assert.match(browse.html, /tabindex="-1" data-result-count/);
  browse.querySelector('[data-category="spells"]').fire("keydown", { key: "ArrowRight" });
  assert.equal(uiState(ctx).category, "creatures");
  browse.querySelector('[data-category="creatures"]').fire("keydown", { key: "End" });
  assert.equal(uiState(ctx).category, data.CATEGORIES.at(-1).id);
  browse
    .querySelector(`[data-category="${data.CATEGORIES.at(-1).id}"]`)
    .fire("keydown", { key: "Home" });
  assert.equal(uiState(ctx).category, "spells");
  // DM screen: the entry picker covers every category; the XP table is complete.
  const dm = harness({ role: "dm" });
  const screen = fakeRoot();
  screen.innerHTML = renderScreen(dm.ctx);
  registry.get("table-panel", "compendium-screen").bind(screen, dm.ctx, { selectedActorId: null });
  screen.querySelector("[data-screen-add]").fire("click");
  assert.match(dm.ctx.modal.body, /<div data-cell-entry hidden>/);
  for (const group of ["Creature", "Incantesimi", "Oggetti", "Regole", "Condizioni"])
    assert.match(dm.ctx.modal.body, new RegExp(`<optgroup label="${group}"`));
  dm.ctx.modal.options.onSubmit(form({ kind: "xp" }));
  assert.match(renderScreen(dm.ctx), /<td>30<\/td><td>155\.000<\/td>/);
  // Reader: the contents fold into a disclosure with a sticky chapter · section bar.
  ctx.view = { page: "library", tab: "compendium", revision: "reader:conditions" };
  const reader = renderCompendium(ctx);
  assert.match(reader, /<details class="compendium-toc-box" data-toc-box/);
  assert.match(reader, /class="compendium-position-bar"/);
  assert.match(reader, /data-reader-toc/);
});
