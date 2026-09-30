// B19 — 2024 encounter builder: domain (difficulty, picker, counter, groups, hand-off,
// initiative, staged activation, board/import, library, parser, treasure) and the UI
// handlers the bound controls call. Uses the real store and registry (commit, undo,
// reload) with the token menu, loot and compendium areas it cooperates with.
// Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { isValidMeleeProfile } from "../combat.mjs";
import { getPreparedEncounter, startPreparedEncounter, saveSceneDraft } from "../preparation.mjs";
import * as tokenMenu from "../token-menu.mjs";
import * as loot from "../loot.mjs";
import * as compendium from "../compendium.mjs";
import * as D from "../encounter-builder-domain.mjs";
import * as UI from "../encounter-builder.mjs";

const GOBLIN = { creatureId: "srd2024:creature:goblin-warrior" };
const BANDIT = { creatureId: "srd2024:creature:bandit" };

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
function harness({ role = "dm", lang = "it" } = {}) {
  const storage = memory();
  const boot = () => {
    const registry = createRegistry();
    registry.use("token-menu", tokenMenu.register);
    registry.use("loot", loot.register);
    registry.use("compendium", compendium.register);
    registry.use("encounter-builder", UI.register);
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
    view: { page: "preparation", tab: "encounter-builder", id: "" },
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
    navigate(page, params = {}) {
      ctx.view = { id: "", tab: "", ...params, page };
    },
    startEncounter(sceneId) {
      ctx.started = sceneId;
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
  return {
    ctx,
    toasts,
    dialogs,
    get store() {
      return store;
    },
    get slice() {
      return store.state.ext["encounter-builder"];
    },
    reload() {
      ({ registry, store } = boot());
      registry.attach(ctx);
    },
    submit(fields) {
      const dialog = dialogs.at(-1);
      assert.ok(dialog, "no dialog open");
      return dialog.options.onSubmit(form(fields));
    },
  };
}
const errorsOf = (h) => h.toasts.filter((t) => t.error).map((t) => t.text);
// Builds the acceptance encounter through domain commands inside real commits.
function buildGoblins(h, { staged = true } = {}) {
  let encounter;
  h.ctx.commit("new", (draft) => {
    const slice = draft.ext["encounter-builder"];
    encounter = D.createEncounter(slice, "dm", { name: "Agguato al cortile" });
    const { row } = D.addCreature(slice, "dm", encounter.id, GOBLIN);
    D.changeCount(slice, "dm", encounter.id, row.id, 3);
    if (staged) {
      const group = D.addGroup(slice, "dm", encounter.id, { name: "Rinforzi", staged: true });
      D.addCreature(slice, "dm", encounter.id, BANDIT, { groupId: group.id });
    }
  });
  return h.slice.encounters.find((e) => e.id === encounter.id);
}
function handOff(h, encounterId, options = {}) {
  let result;
  h.ctx.commit("handoff", (draft) => {
    result = D.handOff(
      draft,
      draft.ext["encounter-builder"],
      encounterId,
      { sceneId: "old-watch", hideNames: true, hpMode: "average", ...options },
      "dm",
      { tokenMenuSlice: draft.ext["token-menu"] },
    );
  });
  return result;
}

// ---------------------------------------------------------------- minimal DOM stand-in

function parseNodes(html) {
  const nodes = [];
  for (const match of html.matchAll(/<(button|input|select|form|textarea|details)\b([^>]*)>/g)) {
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
    const node = {
      tagName: tag.toUpperCase(),
      attrs,
      dataset,
      type: attrs.type ?? "",
      value: attrs.value ?? "",
      checked: "checked" in attrs,
      disabled: "disabled" in attrs,
      matches: (selector) => matches(node, selector),
      closest: (selector) =>
        matches(node, selector) ? node : selector === "form" ? node.form : null,
      focus() {},
      setSelectionRange() {},
      querySelector: () => null,
    };
    nodes.push(node);
  }
  return nodes;
}
function matches(node, selector) {
  return selector.split(",").some((one) => {
    const parts = [...one.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];
    return (
      parts.length > 0 &&
      parts.every(
        ([, name, value]) =>
          name in node.attrs && (value === undefined || node.attrs[name] === value),
      )
    );
  });
}
// Renders the builder and binds it on a root that records listeners; fire() dispatches.
function mount(h, render = UI.renderBuilder) {
  const html = render(h.ctx);
  const listeners = {};
  const root = {
    addEventListener: (type, fn) => (listeners[type] ??= []).push(fn),
    contains: () => true,
  };
  const point = h.ctx.registry.get("preparation-section", "encounter-builder", h.ctx);
  point.bind(root, h.ctx);
  const nodes = parseNodes(html);
  return {
    html,
    nodes,
    find(selector) {
      const node = nodes.find((n) => matches(n, selector));
      assert.ok(node, `no node ${selector}`);
      return node;
    },
    fire(type, target, extra = {}) {
      for (const fn of listeners[type] ?? [])
        fn({ target, preventDefault() {}, key: extra.key, ...extra });
    },
  };
}

// ---------------------------------------------------------------- domain

test("slice seeds a coherent sample encounter and normalizes idempotently", () => {
  const h = harness();
  const seed = h.slice.encounters[0];
  assert.equal(seed.name, "Chi ha riacceso la lanterna");
  assert.equal(seed.groups.find((g) => g.staged).name, "Dalla scala");
  assert.deepEqual(D.normalizeSlice(D.normalizeSlice(h.slice)), D.normalizeSlice(h.slice));
  assert.throws(() => D.normalizeSlice({}, 2));
  const cleaned = D.normalizeSlice({
    encounters: [{ id: "x", rows: [{ id: "r", kind: "creature" }] }],
  });
  assert.equal(cleaned.encounters[0].rows.length, 0, "a row without a creature is dropped");
  assert.equal(cleaned.encounters[0].groups[0].id, "main");
});

test("picker: CR ≤ 1 and Humanoid lists humanoids; 2024 goblins are Fey (SRD EN 290 / IT 340)", () => {
  const h = harness();
  const humanoids = D.pickerResults(h.slice, { ...D.emptyFilters(), crMax: "1", type: "humanoid" });
  assert.deepEqual(humanoids.map((r) => r.block.name.it).sort(), [
    "Bandito",
    "Cultista",
    "Esploratore",
    "Guardia",
    "Popolano",
  ]);
  assert.ok(humanoids.every((r) => r.block.crValue <= 1 && r.block.type === "humanoid"));
  const fey = D.pickerResults(h.slice, {
    ...D.emptyFilters(),
    crMax: "1",
    type: "fey",
    q: "goblin",
  });
  assert.deepEqual(
    fey.map((r) => r.block.name.it),
    ["Goblin tirapiedi", "Goblin guerriero", "Hobgoblin guerriero", "Goblin capo"],
  );
  assert.deepEqual(
    D.filterChips({ ...D.emptyFilters(), crMax: "1", type: "humanoid" }, "it").map((c) => c.text),
    ["GS ≤ 1", "Umanoide"],
  );
});

test("difficulty: four goblin warriors against Livia, Doran and Mira (2024 budget)", () => {
  const h = harness();
  const encounter = buildGoblins(h, { staged: false });
  const rating = D.rateEncounter(h.ctx.state, h.slice, encounter);
  assert.deepEqual(
    rating.party.members.map((m) => [m.name, m.level]),
    [
      ["Livia", 3],
      ["Doran", 3],
      ["Mira", 3],
    ],
  );
  assert.equal(rating.xp, 200);
  assert.deepEqual(rating.budget, { low: 450, moderate: 675, high: 1200 });
  // Kobold+ 2024 strategy (CMP-106): below the Low budget the encounter is Trivial.
  assert.equal(rating.band, "trivial");
  assert.equal(rating.bandSource.id, "CMP-106");
  assert.deepEqual(rating.source.en.pages, [202]);
  assert.deepEqual(rating.source.it.pages, [230, 231]);
  // Typical party (Kobold+): four level-1 characters, low 200 → exactly on budget.
  h.ctx.commit("party", (draft) =>
    D.setParty(draft.ext["encounter-builder"], "dm", encounter.id, {
      mode: "custom",
      levels: [1, 1, 1, 1],
    }),
  );
  const typical = D.rateEncounter(h.ctx.state, h.slice, h.slice.encounters.at(-1));
  assert.deepEqual(typical.budget, { low: 200, moderate: 300, high: 400 });
  assert.equal(typical.band, "low", "exactly the Low budget starts Low");
  assert.throws(() => D.setParty(h.slice, "dm", encounter.id, { mode: "custom", levels: [21] }));
  // Kobold+ getDifficultyFromCr thresholds: < low Trivial, < moderate Low, < high Moderate,
  // < 1.5 × high High, else Deadly.
  const budget = { low: 450, moderate: 675, high: 1200 };
  assert.deepEqual(
    [0, 449, 450, 525, 674, 675, 1199, 1200, 1799, 1800].map((xp) => D.bandFor(xp, budget)),
    ["empty", "trivial", "low", "low", "low", "moderate", "moderate", "high", "high", "deadly"],
  );
  const seed = h.slice.encounters.find((e) => e.id === "enc-lantern");
  assert.equal(
    D.rateEncounter(h.ctx.state, h.slice, seed).band,
    "low",
    "the seed's 525 XP against Livia, Doran and Mira is Low, not Moderate",
  );
  const cat = D.blockOf(h.slice, { creatureId: "srd2024:creature:cat" });
  assert.equal(D.rateAlone(h.ctx.state, h.slice, seed, cat), "trivial", "a CR-0 cat alone");
});

test("counter shares initiative, Add again separates it (DDB-093)", () => {
  const h = harness();
  const encounter = buildGoblins(h, { staged: false });
  assert.equal(encounter.rows.length, 1);
  assert.equal(encounter.rows[0].count, 4);
  h.ctx.commit("again", (draft) =>
    D.addCreature(draft.ext["encounter-builder"], "dm", encounter.id, GOBLIN, { again: true }),
  );
  const rows = h.slice.encounters.at(-1).rows;
  assert.equal(rows.length, 2, "Add again creates its own row");
  assert.equal(D.rateEncounter(h.ctx.state, h.slice, h.slice.encounters.at(-1)).xp, 250);
  assert.throws(() => D.changeCount(h.slice, "dm", encounter.id, rows[1].id, -1), /last copy/);
  assert.throws(() => D.changeCount(h.slice, "dm", encounter.id, rows[0].id, 17), /20/);
  assert.throws(() => D.addCreature(h.slice, "player", encounter.id, GOBLIN), /Only the DM/);
});

test("groups: staged reinforcements count toward XP; main group cannot be staged", () => {
  const h = harness();
  const encounter = buildGoblins(h);
  const staged = encounter.groups.find((g) => g.name === "Rinforzi");
  assert.equal(staged.staged, true);
  assert.equal(D.rateEncounter(h.ctx.state, h.slice, encounter).xp, 225);
  assert.throws(() => D.setGroupStaged(h.slice, "dm", encounter.id, "main", true), /main group/);
  assert.throws(() => D.addGroup(h.slice, "dm", encounter.id, { name: "rinforzi" }), /already/);
  h.ctx.commit("rm", (draft) =>
    D.removeGroup(draft.ext["encounter-builder"], "dm", encounter.id, staged.id),
  );
  const after = h.slice.encounters.at(-1);
  assert.ok(
    after.rows.every((r) => r.groupId === "main"),
    "rows fall back to the main group",
  );
});

test("hand-off: numbered tokens, hidden names, average HP, staged group hidden, prepared participants", () => {
  const h = harness();
  const encounter = buildGoblins(h);
  const result = handOff(h, encounter.id);
  const state = h.ctx.state;
  assert.equal(result.created.length, 5);
  const names = state.ext["token-menu"].names;
  const goblins = result.created.filter((c) => c.rowId === encounter.rows[0].id);
  assert.deepEqual(
    goblins.map((c) => names[c.actorId].trueName),
    ["Goblin guerriero 1", "Goblin guerriero 2", "Goblin guerriero 3", "Goblin guerriero 4"],
  );
  assert.ok(goblins.every((c) => /^Creatura sconosciuta \d+$/.test(state.actors[c.actorId].name)));
  const actor = state.actors[goblins[0].actorId];
  assert.equal(actor.hp, 10);
  assert.equal(actor.maxHp, 10);
  assert.equal(actor.ac, 15);
  assert.equal(actor.speed, 9);
  assert.equal(actor.combatProfile.team, "watch");
  assert.equal(actor.vitalityPolicy.zeroHp, "death");
  assert.deepEqual(actor.vitalityPolicy.source.en.pages, [17]);
  assert.ok(
    isValidMeleeProfile(actor.combatProfile.meleeAttack),
    "SRD scimitar reaches the combat engine",
  );
  assert.equal(actor.combatProfile.meleeAttack.attackBonus, 4);
  const scene = state.scenes.find((s) => s.id === "old-watch");
  const bandit = result.created.find((c) => c.rowId !== encounter.rows[0].id);
  assert.equal(scene.tokens.find((t) => t.actorId === bandit.actorId).hidden, true);
  const participants = scene.encounter.participants.map((p) => p.actorId);
  assert.ok(goblins.every((c) => participants.includes(c.actorId)));
  assert.ok(
    !participants.includes(bandit.actorId),
    "staged creatures are not in the prepared order",
  );
  assert.ok(["livia", "doran", "mira"].every((id) => participants.includes(id)));
  assert.equal(scene.encounter.participants.find((p) => p.actorId === goblins[0].actorId).bonus, 2);
  const positions = scene.tokens.map((t) => `${t.x},${t.y}`);
  assert.equal(new Set(positions).size, positions.length, "no two tokens share a cell");
  assert.equal(D.encounterStatus(state, h.slice.encounters.at(-1)), "prepared");
  // Updating the scene adds only what is missing.
  h.ctx.commit("more", (draft) =>
    D.changeCount(draft.ext["encounter-builder"], "dm", encounter.id, encounter.rows[0].id, 1),
  );
  const again = handOff(h, encounter.id);
  assert.equal(again.created.length, 1);
  assert.equal(
    h.ctx.state.ext["token-menu"].names[again.created[0].actorId].trueName,
    "Goblin guerriero 5",
  );
});

test("hand-off HP: rolled digital within the formula, physical faces validated, adjectives", () => {
  const h = harness();
  const encounter = buildGoblins(h, { staged: false });
  const digital = handOff(h, encounter.id, {
    hpMode: "digital",
    hideNames: false,
    numbering: "adjectives",
  });
  for (const c of digital.created) {
    assert.equal(c.hpRoll.faces.length, 3);
    assert.ok(c.hpRoll.faces.every((f) => f >= 1 && f <= 6));
    assert.equal(
      c.hp,
      c.hpRoll.faces.reduce((a, b) => a + b, 0),
    );
    assert.equal(h.ctx.state.actors[c.actorId].maxHp, c.hp);
    assert.deepEqual(c.hpRoll.source.en.pages, [255]);
  }
  assert.deepEqual(
    digital.created.map((c) => h.ctx.state.actors[c.actorId].name),
    [
      "Goblin guerriero audace",
      "Goblin guerriero furtivo",
      "Goblin guerriero rabbioso",
      "Goblin guerriero astuto",
    ],
  );
  const h2 = harness();
  const other = buildGoblins(h2, { staged: false });
  const plan = D.planHandOff(h2.ctx.state, h2.slice, other.id, "old-watch");
  assert.equal(plan.create.length, 4);
  const faces = Object.fromEntries(plan.create.map((item, i) => [item.key, [1, 2, i + 1]]));
  assert.throws(
    () =>
      handOff(h2, other.id, {
        hpMode: "physical",
        hpFaces: { ...faces, [plan.create[0].key]: [7, 1, 1] },
      }),
    /d6/,
  );
  const physical = handOff(h2, other.id, { hpMode: "physical", hpFaces: faces, hideNames: false });
  assert.deepEqual(
    physical.created.map((c) => c.hp),
    [4, 5, 6, 7],
  );
  assert.ok(physical.created.every((c) => c.hpRoll.mode === "physical"));
});

test("group initiative: one d20 for identical creatures, one ledger entry each; correction needs a reason", () => {
  const h = harness();
  const encounter = buildGoblins(h);
  handOff(h, encounter.id);
  const current = () => h.slice.encounters.at(-1);
  const groups = D.initiativeGroups(h.ctx.state, h.slice, current());
  const goblinGroup = groups.find((g) => g.rowId === encounter.rows[0].id);
  assert.equal(goblinGroup.actorIds.length, 4);
  let result;
  h.ctx.commit("roll", (draft) => {
    result = D.recordGroupInitiative(
      draft,
      draft.ext["encounter-builder"],
      encounter.id,
      goblinGroup.key,
      { mode: "digital", bonus: 2 },
      "dm",
    );
  });
  assert.equal(result.entries.length, 4);
  assert.equal(new Set(result.entries.map((e) => e.sharedGroup)).size, 1);
  const ledger = h.ctx.state.initiativeRolls.filter((r) =>
    goblinGroup.actorIds.includes(r.actorId),
  );
  assert.equal(ledger.length, 4);
  assert.ok(ledger.every((r) => r.natural === result.natural && r.mode === "digital"));
  assert.throws(
    () =>
      D.recordGroupInitiative(
        h.ctx.state,
        h.slice,
        encounter.id,
        goblinGroup.key,
        { mode: "physical", natural: 15, bonus: 2 },
        "dm",
      ),
    /reason/,
  );
  h.ctx.commit("fix", (draft) =>
    D.recordGroupInitiative(
      draft,
      draft.ext["encounter-builder"],
      encounter.id,
      goblinGroup.key,
      { mode: "physical", natural: 15, bonus: 2, reason: "Dado caduto dal tavolo" },
      "dm",
    ),
  );
  const corrected = h.ctx.state.initiativeRolls.filter((r) => r.kind === "correction");
  assert.equal(corrected.length, 4);
  assert.ok(corrected.every((r) => r.reason === "Dado caduto dal tavolo" && r.replacesId));
  // The characters roll too (bonus declared), then the existing Preparation start works.
  for (const group of D.initiativeGroups(h.ctx.state, h.slice, current()).filter((g) => !g.rowId))
    h.ctx.commit("pc", (draft) =>
      D.recordGroupInitiative(
        draft,
        draft.ext["encounter-builder"],
        encounter.id,
        group.key,
        { mode: "physical", natural: 10, bonus: 1 },
        "dm",
      ),
    );
  const prepared = getPreparedEncounter(h.ctx.state, "old-watch", "dm");
  assert.equal(prepared.ready, true);
  h.ctx.commit("start", (draft) => startPreparedEncounter(draft, "old-watch", "dm"));
  assert.equal(h.ctx.state.combat.active, true);
  assert.equal(D.encounterStatus(h.ctx.state, current()), "running");
  // The Preparation editor accepts the builder's rows as already recorded.
  const scene = h.ctx.state.scenes.find((s) => s.id === "old-watch");
  assert.doesNotThrow(() =>
    saveSceneDraft(
      structuredClone(h.ctx.state),
      structuredClone(scene),
      "dm",
      structuredClone(scene),
    ),
  );
});

test("staged reinforcements activated mid-combat join the order by initiative, turn kept", () => {
  const h = harness();
  const encounter = buildGoblins(h);
  handOff(h, encounter.id);
  for (const group of D.initiativeGroups(h.ctx.state, h.slice, h.slice.encounters.at(-1)))
    h.ctx.commit("r", (draft) =>
      D.recordGroupInitiative(
        draft,
        draft.ext["encounter-builder"],
        encounter.id,
        group.key,
        { mode: "physical", natural: group.rowId ? 5 : 12, bonus: 0 },
        "dm",
      ),
    );
  h.ctx.commit("start", (draft) => startPreparedEncounter(draft, "old-watch", "dm"));
  h.ctx.commit("advance", (draft) => {
    draft.combat.turn = 1;
  });
  const before = h.ctx.state.combat.order[h.ctx.state.combat.turn];
  const stagedId = encounter.groups.find((g) => g.staged).id;
  const banditRow = encounter.rows.find((r) => r.groupId === stagedId);
  let result;
  h.ctx.commit("activate", (draft) => {
    result = D.activateGroup(
      draft,
      draft.ext["encounter-builder"],
      encounter.id,
      stagedId,
      { rolls: { [banditRow.id]: { mode: "physical", natural: 20 } } },
      "dm",
    );
  });
  const combat = h.ctx.state.combat;
  assert.equal(result.running, true);
  const bandit = result.joined[0].actorId;
  assert.equal(combat.order[0], bandit, "21 beats every 12 and 5");
  assert.equal(combat.order[combat.turn], before, "the current turn does not change");
  const scene = h.ctx.state.scenes.find((s) => s.id === "old-watch");
  assert.equal(scene.tokens.find((t) => t.actorId === bandit).hidden, false);
  const group = h.slice.encounters.at(-1).groups.find((g) => g.id === stagedId);
  assert.equal(group.staged, false);
  assert.ok(group.activatedAt);
  assert.ok(h.ctx.state.initiativeRolls.some((r) => r.actorId === bandit && r.natural === 20));
  assert.throws(
    () => D.activateGroup(h.ctx.state, h.slice, encounter.id, stagedId, {}, "dm"),
    /not staged/,
  );
});

test("Add All Tokens: sides, name auto-load, prepared initiative, rolls and start (DDB-134)", () => {
  const h = harness();
  let result;
  h.ctx.commit("tokens", (draft) => {
    result = D.encounterFromTokens(draft, draft.ext["encounter-builder"], "old-watch", "dm", "it");
  });
  const encounter = h.slice.encounters.find((e) => e.id === result.encounter.id);
  assert.equal(result.created, true);
  const rows = encounter.rows;
  const side = (id) => rows.find((r) => r.actorId === id)?.side;
  assert.equal(side("livia"), "party");
  assert.equal(side("mira"), "party");
  assert.equal(side("goblin-1"), "enemies");
  const scout = rows.find((r) => r.actorId === "goblin-2");
  assert.equal(
    scout.creatureId,
    "srd2024:creature:scout",
    "“Esploratore” loads the Scout block by name",
  );
  assert.equal(scout.autoLoaded, true);
  const rating = D.rateEncounter(h.ctx.state, h.slice, encounter);
  assert.deepEqual(rating.unknown, ["Sentinella"], "no block for Sentinella: left out of XP");
  assert.equal(rating.xp, 100);
  assert.equal(rating.party.mode, "rows");
  assert.equal(D.baseName("Goblin guerriero 3"), "goblin guerriero");
  assert.deepEqual(D.matchBlockByName(h.slice, "Daring Goblin Warrior"), GOBLIN);
  assert.equal(D.matchBlockByName(h.slice, "Sentinella"), null);
  // The rows are the scene's prepared participants: the encounter can be run.
  const scene = () => h.ctx.state.scenes.find((s) => s.id === "old-watch");
  const onBoard = rows.map((r) => r.actorId).sort();
  assert.deepEqual(
    scene()
      .encounter.participants.map((p) => p.actorId)
      .sort(),
    onBoard,
  );
  assert.equal(D.encounterStatus(h.ctx.state, encounter), "prepared");
  const groups = D.initiativeGroups(h.ctx.state, h.slice, encounter);
  assert.deepEqual(groups.map((g) => g.actorIds[0]).sort(), onBoard, "its own creatures");
  assert.ok(groups.every((g) => g.mine));
  const naturals = { livia: 4, doran: 17, mira: 11, "goblin-1": 9, "goblin-2": 14 };
  for (const group of groups)
    h.ctx.commit("roll", (draft) =>
      D.recordGroupInitiative(
        draft,
        draft.ext["encounter-builder"],
        encounter.id,
        group.key,
        { mode: "physical", natural: naturals[group.actorIds[0]], bonus: 0 },
        "dm",
      ),
    );
  assert.equal(getPreparedEncounter(h.ctx.state, "old-watch", "dm").ready, true);
  h.ctx.commit("start", (draft) => startPreparedEncounter(draft, "old-watch", "dm"));
  assert.deepEqual(h.ctx.state.combat.order, ["doran", "goblin-2", "mira", "goblin-1", "livia"]);
  // A second click with nothing new is refused; it never makes a second encounter.
  assert.throws(
    () => D.encounterFromTokens(h.ctx.state, h.slice, "old-watch", "dm", "it"),
    /already in the encounter/,
  );
  assert.equal(h.slice.encounters.filter((e) => e.handoff?.fromTokens).length, 1);
});
test("Add All Tokens updates the scene's one encounter; hidden tokens wait; no combat change", () => {
  const h = harness();
  h.ctx.commit("tokens", (draft) =>
    D.encounterFromTokens(draft, draft.ext["encounter-builder"], "old-watch", "dm", "it"),
  );
  const goblins = buildGoblins(h);
  const made = handOff(h, goblins.id).created;
  let second;
  h.ctx.commit("tokens again", (draft) => {
    second = D.encounterFromTokens(draft, draft.ext["encounter-builder"], "old-watch", "dm", "it");
  });
  assert.equal(second.created, false, "the same encounter is updated");
  assert.equal(second.added.length, 4, "four visible goblins; the staged bandit is hidden");
  assert.equal(second.hidden.length, 1);
  const fromTokens = h.slice.encounters.filter((e) => e.handoff?.fromTokens);
  assert.equal(fromTokens.length, 1);
  const goblinRows = fromTokens[0].rows.filter((r) => made.some((c) => c.actorId === r.actorId));
  assert.ok(goblinRows.every((r) => r.creatureId === GOBLIN.creatureId && !r.autoLoaded));
  // The goblins keep one shared initiative group (their builder row), in either encounter.
  const groups = D.initiativeGroups(h.ctx.state, h.slice, fromTokens[0]);
  assert.equal(groups.find((g) => g.rowId === goblins.rows[0].id).actorIds.length, 4);
  // During a running combat on the scene only the list changes.
  h.ctx.commit("start", (draft) => {
    for (const p of draft.scenes[0].encounter.participants) {
      p.natural = 10;
      p.mode = "physical";
    }
    startPreparedEncounter(draft, "old-watch", "dm");
  });
  const order = [...h.ctx.state.combat.order];
  h.ctx.commit("reveal", (draft) => {
    for (const t of draft.scenes[0].tokens) delete t.hidden;
  });
  let third;
  h.ctx.commit("tokens during combat", (draft) => {
    third = D.encounterFromTokens(draft, draft.ext["encounter-builder"], "old-watch", "dm", "it");
  });
  assert.equal(third.running, true);
  assert.equal(third.added.length, 1);
  assert.deepEqual(h.ctx.state.combat.order, order, "the running order is untouched");
});

test("an increment-2 prepared encounter reopens in the builder without losing its rolls", () => {
  const h = harness();
  // Preparation's own flow: participants with a recorded roll saved on the scene.
  h.ctx.commit("prep", (draft) => {
    const scene = draft.scenes.find((s) => s.id === "old-watch");
    const input = structuredClone(scene);
    input.encounter = {
      name: "Ronda al cortile",
      participants: [
        { actorId: "livia", natural: 14, bonus: 2, mode: "physical" },
        { actorId: "goblin-1", natural: 9, bonus: 2, mode: "physical" },
      ],
    };
    saveSceneDraft(draft, input, "dm", structuredClone(scene));
  });
  const recorded = structuredClone(h.ctx.state.scenes[0].encounter.participants);
  assert.ok(recorded.every((p) => p.rollId));
  assert.equal(D.unlinkedSceneEncounters(h.ctx.state, h.slice).length, 1);
  let encounter;
  h.ctx.commit("import", (draft) => {
    encounter = D.importSceneEncounter(draft, draft.ext["encounter-builder"], "old-watch", "dm");
  });
  assert.equal(encounter.name, "Ronda al cortile");
  assert.equal(D.unlinkedSceneEncounters(h.ctx.state, h.slice).length, 0);
  h.ctx.commit("add", (draft) => {
    const slice = draft.ext["encounter-builder"];
    const { row } = D.addCreature(slice, "dm", encounter.id, GOBLIN);
    D.changeCount(slice, "dm", encounter.id, row.id, 3);
  });
  handOff(h, encounter.id, { hideNames: false });
  const participants = h.ctx.state.scenes[0].encounter.participants;
  for (const before of recorded) {
    const after = participants.find((p) => p.actorId === before.actorId);
    assert.deepEqual(
      [after.natural, after.bonus, after.mode, after.rollId],
      [before.natural, before.bonus, before.mode, before.rollId],
    );
  }
  assert.equal(participants.length, 2 + 4 + 2, "four goblins plus Doran and Mira joined");
  assert.equal(h.ctx.state.scenes[0].encounter.name, "Ronda al cortile");
});

test("library: duplicate, delete to history, restore, restart keeps the ledger", () => {
  const h = harness();
  const encounter = buildGoblins(h);
  let copy;
  h.ctx.commit("dup", (draft) => {
    copy = D.duplicateEncounter(draft.ext["encounter-builder"], "dm", encounter.id, "it");
  });
  assert.equal(copy.name, "Agguato al cortile (copia)");
  assert.equal(copy.rows.length, 2);
  assert.equal(copy.handoff, null);
  assert.ok(copy.groups.find((g) => g.name === "Rinforzi").staged);
  handOff(h, encounter.id);
  const current = () => h.slice.encounters.find((e) => e.id === encounter.id);
  const groups = D.initiativeGroups(h.ctx.state, h.slice, current());
  for (const group of groups)
    h.ctx.commit("roll", (draft) =>
      D.recordGroupInitiative(
        draft,
        draft.ext["encounter-builder"],
        encounter.id,
        group.key,
        { mode: "physical", natural: 12, bonus: 1 },
        "dm",
      ),
    );
  // Wear the goblins down, activate the reinforcements and build a board encounter on them.
  const before = D.copiesOf(current()).map((c) => c.actorId);
  const aliases = before.map((id) => h.ctx.state.actors[id].name);
  const stagedId = encounter.groups.find((g) => g.staged).id;
  h.ctx.commit("hurt", (draft) => {
    draft.actors[before[0]].hp = 0;
    draft.actors[before[1]].conditions = [{ id: "prone", instanceId: "t-prone" }];
    D.activateGroup(draft, draft.ext["encounter-builder"], encounter.id, stagedId, {}, "dm");
    D.encounterFromTokens(draft, draft.ext["encounter-builder"], "old-watch", "dm", "it");
  });
  const ledger = h.ctx.state.initiativeRolls.length;
  let result;
  h.ctx.commit("restart", (draft) => {
    result = D.restartEncounter(
      draft,
      draft.ext["encounter-builder"],
      encounter.id,
      { lang: "it" },
      "dm",
      { tokenMenuSlice: draft.ext["token-menu"] },
    );
  });
  const state = h.ctx.state;
  const scene = state.scenes[0];
  // DDB Restart: the same NPCs come back to full where they stand, names and aliases kept.
  assert.deepEqual(
    D.copiesOf(current())
      .map((c) => c.actorId)
      .sort(),
    [...before].sort(),
  );
  assert.equal(result.reset.length, 5);
  assert.deepEqual(
    before.map((id) => state.actors[id].name),
    aliases,
    "aliases do not climb",
  );
  assert.equal(state.actors[before[0]].hp, 10);
  assert.deepEqual(state.actors[before[1]].conditions ?? [], []);
  assert.ok(before.every((id) => scene.tokens.some((t) => t.actorId === id)));
  const bandit = D.copiesOf(current()).find((c) => c.groupId === stagedId).actorId;
  assert.equal(scene.tokens.find((t) => t.actorId === bandit).hidden, true, "staged again");
  assert.ok(current().groups.find((g) => g.id === stagedId).staged);
  const participant = (id) => scene.encounter.participants.find((p) => p.actorId === id);
  assert.equal(participant(bandit), undefined, "a staged creature leaves the prepared order");
  assert.ok(before.filter((id) => id !== bandit).every((id) => participant(id).natural === null));
  assert.ok(
    ["livia", "doran", "mira"].every((id) => participant(id).natural === 12),
    "the characters keep their prepared roll",
  );
  assert.equal(state.initiativeRolls.length, ledger, "recorded rolls stay in the ledger");
  const board = h.slice.encounters.find((e) => e.handoff?.fromTokens);
  assert.deepEqual(D.rateEncounter(state, h.slice, board).gone, [], "no board row dangles");
  assert.equal(h.slice.history.at(-1).reason, "restarted");
  // Physical HP on restart, and the DM may clear the characters' rolls too.
  const plan = D.planRestart(state, h.slice, encounter.id);
  assert.equal(plan.reset.length, 5);
  const hpFaces = Object.fromEntries(
    plan.reset.map((item) => [item.key, Array(item.dice.count).fill(2)]),
  );
  h.ctx.commit("restart physical", (draft) =>
    D.restartEncounter(
      draft,
      draft.ext["encounter-builder"],
      encounter.id,
      { hpMode: "physical", hpFaces, clearPartyRolls: true },
      "dm",
      { tokenMenuSlice: draft.ext["token-menu"] },
    ),
  );
  assert.equal(h.ctx.state.actors[before[0]].hp, 6, "3d6 faces 2+2+2");
  assert.equal(h.ctx.state.actors[before[0]].hpRoll.mode, "physical");
  assert.ok(
    ["livia", "doran"].every(
      (id) =>
        h.ctx.state.scenes[0].encounter.participants.find((p) => p.actorId === id).natural === null,
    ),
  );
  h.ctx.commit("del", (draft) => D.deleteEncounter(draft.ext["encounter-builder"], "dm", copy.id));
  assert.ok(!h.slice.encounters.some((e) => e.id === copy.id));
  const entry = h.slice.history.at(-1);
  h.ctx.commit("restore", (draft) =>
    D.restoreFromHistory(draft.ext["encounter-builder"], "dm", entry.id, "it"),
  );
  assert.equal(h.slice.encounters.at(-1).name, "Agguato al cortile (copia)");
});

test("parser: SRD and app wording into a proposal; confirmation makes it rollable and a combat attack", () => {
  assert.deepEqual(
    D.parseActionText(
      "Scimitarra. Tiro per colpire in mischia: +4, portata 1,5 m Colpito: 5 (1d6 + 2) danni taglienti, più 2 (1d4) danni taglienti se il tiro per colpire è stato effettuato con vantaggio.",
    ).attack,
    { type: "melee", bonus: 4, reach: 5, range: null },
  );
  const en = D.parseActionText(
    "Shortbow. Ranged Attack Roll: +4, range 80/320 ft. Hit: 5 (1d6 + 2) Piercing damage.",
  );
  assert.deepEqual(en.attack.range, { normal: 80, long: 320 });
  assert.equal(en.damage[0].type, "piercing");
  assert.equal(D.parseActionText("Il goblin si nasconde dietro una cassa."), null);
  const h = harness();
  let block;
  h.ctx.commit("edit", (draft) => {
    const slice = draft.ext["encounter-builder"];
    const base = D.blockOf(slice, GOBLIN);
    const draftBlock = UI.domainDraft(
      {
        name: "Goblin della lanterna",
        ac: "16",
        initiative: "+3",
        hpAverage: "14",
        hpFormula: "4d6",
        speed: "9",
        cr: "1/2",
        abilities: { str: "8", dex: "16", con: "10", int: "10", wis: "8", cha: "8" },
        actions: {
          scimitar: {
            name: "Falcetto",
            text: "Tiro per colpire in mischia: +5, portata 1,5 m. Colpito: 6 (1d8 + 2) danni taglienti.",
          },
          shortbow: { name: base.actions[1].name.it, text: base.actions[1].summary.it },
        },
        newActionText:
          "Lanterna. Tiro per colpire a distanza: +5, gittata 6/18 m. Colpito: 3 (1d6) danni da fuoco.",
      },
      "it",
    );
    block = D.saveBlockEdit(slice, "dm", GOBLIN, draftBlock, { lang: "it" });
  });
  assert.equal(block.custom, true);
  assert.equal(block.speed.walk, 30, "9 m become 30 ft");
  assert.equal(block.xp, 100);
  assert.equal(block.initiative.bonus, 3);
  const falcetto = block.actions.find((a) => a.id === "scimitar");
  assert.equal(falcetto.textEdited, true);
  assert.equal(falcetto.proposal.attack.bonus, 5);
  assert.equal(
    block.actions.find((a) => a.id === "shortbow").textEdited,
    undefined,
    "unchanged text keeps its structure",
  );
  assert.equal(block.actions.at(-1).name.it, "Lanterna");
  assert.throws(
    () => D.blockRollRequest(block, { kind: "attack", action: "scimitar" }),
    /not available/,
  );
  assert.equal(D.meleeProfileOf(block), null, "no melee attack before confirmation");
  h.ctx.commit("confirm", (draft) =>
    D.confirmAction(draft.ext["encounter-builder"], "dm", block.id, "scimitar"),
  );
  const saved = h.slice.blocks[0];
  assert.equal(saved.revision, 2);
  assert.equal(D.blockRollRequest(saved, { kind: "attack", action: "scimitar" }).bonus, 5);
  const profile = D.meleeProfileOf(saved);
  assert.ok(isValidMeleeProfile(profile));
  assert.deepEqual(
    [profile.attackBonus, profile.damageDice[0].sides, profile.damageModifier],
    [5, 8, 2],
  );
  assert.equal(profile.source.kind, "authored-demo");
  assert.throws(
    () =>
      D.saveBlockEdit(h.slice, "dm", GOBLIN, {
        ...UI.domainDraft(
          {
            name: "x",
            ac: "40",
            initiative: "0",
            hpAverage: "1",
            hpFormula: "1d6",
            speed: "9",
            cr: "1",
            abilities: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
            actions: {},
          },
          "it",
        ),
      }),
    /AC/,
  );
});

test("treasure: one hidden loot parcel per creature with gear, tied to its token (B26)", () => {
  const h = harness();
  const encounter = buildGoblins(h, { staged: false });
  h.ctx.commit("notes", (draft) =>
    D.setNotes(draft.ext["encounter-builder"], "dm", encounter.id, {
      treasure: "Monete nella scarsella",
    }),
  );
  handOff(h, encounter.id, { hideNames: false });
  let parcels;
  h.ctx.commit("loot", (draft) => {
    parcels = D.prepareTreasure(
      draft,
      draft.ext["encounter-builder"],
      encounter.id,
      "dm",
      draft.ext.loot,
    );
  });
  assert.equal(parcels.length, 4);
  const stored = h.ctx.state.ext.loot.parcels.filter((p) => parcels.some((x) => x.id === p.id));
  assert.ok(stored.every((p) => p.sceneId === "old-watch" && !p.revealed && p.sourceActorId));
  assert.ok(stored.every((p) => p.items.length === 4 && p.note === "Monete nella scarsella"));
  assert.throws(
    () => D.prepareTreasure(h.ctx.state, h.slice, encounter.id, "dm", h.ctx.state.ext.loot),
    /already/,
  );
});

test("Undo reverses a hand-off atomically; reload keeps the builder; offline refuses the scene", () => {
  const h = harness();
  const encounter = buildGoblins(h);
  const tokens = h.ctx.state.scenes[0].tokens.length;
  handOff(h, encounter.id);
  assert.equal(h.ctx.state.scenes[0].tokens.length, tokens + 5);
  h.ctx.undo();
  assert.equal(h.ctx.state.scenes[0].tokens.length, tokens);
  assert.equal(h.slice.encounters.find((e) => e.id === encounter.id).handoff, null);
  h.reload();
  assert.ok(
    h.slice.encounters.some((e) => e.id === encounter.id),
    "the draft survives a reload",
  );
  h.ctx.offline = true;
  UI.resetUi();
  const view = mount(h);
  UI.uiState(h.ctx).openId = encounter.id;
  const editor = mount(h);
  editor.fire("click", editor.find('[data-eb="handoff"]'));
  assert.match(errorsOf(h).at(-1), /senza rete/);
  // Draft edits are private to the DM and still work offline.
  editor.fire("click", editor.find('[data-eb="count"][data-delta="1"]'));
  assert.equal(h.slice.encounters.find((e) => e.id === encounter.id).rows[0].count, 5);
  assert.ok(view.html.includes("I miei incontri"));
});

// ---------------------------------------------------------------- UI handlers

test("UI: library → new encounter → filters → add, add again, +/−, group, hand-off (IT)", () => {
  const h = harness();
  UI.resetUi();
  let view = mount(h);
  assert.match(view.html, /Chi ha riacceso la lanterna/);
  assert.match(view.html, /Facile · 525 PE/);
  view.fire("click", view.find('[data-eb="new"]'));
  const ui = UI.uiState(h.ctx);
  assert.ok(ui.openId);
  view = mount(h);
  assert.match(view.html, /Difficoltà 2024/);
  const crMax = view.find('[data-eb-filter="crMax"]');
  crMax.value = "1";
  view.fire("change", crMax);
  const type = view.find('[data-eb-filter="type"]');
  type.value = "humanoid";
  view.fire("change", type);
  view = mount(h);
  assert.match(view.html, /5 risultati/);
  assert.match(view.html, /GS ≤ 1/);
  assert.ok(
    !/data-eb-result="srd:srd2024:creature:goblin/.test(view.html),
    "goblins are not humanoids in 2024",
  );
  const typeAgain = view.find('[data-eb-filter="type"]');
  typeAgain.value = "fey";
  view.fire("change", typeAgain);
  view = mount(h);
  view.fire("click", view.find('[data-eb="add"][aria-label="Aggiungi Goblin guerriero"]'));
  view = mount(h);
  for (let i = 0; i < 3; i++) {
    view.fire("click", view.find('[data-eb="count"][data-delta="1"]'));
    view = mount(h);
  }
  assert.match(view.html, /Iniziativa condivisa/);
  assert.match(view.html, /<output aria-live="polite" data-eb-count-of="[^"]+">4<\/output>/);
  assert.match(view.html, /data-eb-difficulty="trivial"/);
  assert.match(view.html, /Banale/);
  assert.match(view.html, /data-eb-xp>200</);
  view.fire("click", view.find('[data-eb="add"][aria-label="Aggiungi di nuovo Goblin guerriero"]'));
  view = mount(h);
  assert.match(view.html, /Iniziativa separata/);
  const rowIds = [...view.html.matchAll(/data-eb="remove-row" data-row="([^"]+)"/g)].map(
    (m) => m[1],
  );
  view.fire("click", view.find(`[data-eb="remove-row"][data-row="${rowIds.at(-1)}"]`));
  view = mount(h);
  view.fire("click", view.find('[data-eb="group-add"]'));
  h.submit({ name: "Rinforzi", staged: "on" });
  assert.equal(ui.targetGroup, h.slice.encounters.at(-1).groups.at(-1).id);
  view = mount(h);
  view.fire("click", view.find('[data-eb="add"][aria-label="Aggiungi Goblin tirapiedi"]'));
  view = mount(h);
  assert.match(view.html, /In attesa/);
  view.fire("click", view.find('[data-eb="handoff"]'));
  const encounter = h.slice.encounters.at(-1);
  assert.equal(encounter.handoff.sceneId, "old-watch");
  assert.equal(D.copiesOf(encounter).length, 5);
  assert.match(h.toasts.at(-1).text, /5 creature sulla scena/);
  view = mount(h);
  assert.match(view.html, /Iniziativa/);
  assert.match(view.html, /Goblin guerriero ×4/);
  const roll = view.find('[data-eb="init-roll"]');
  roll.form = { querySelector: () => ({ value: "2" }) };
  view.fire("click", roll);
  assert.match(h.toasts.at(-1).text, /\+ \(2\) = \d+ · dado digitale/);
  view = mount(h);
  const initForm = view.nodes.find(
    (n) => n.tagName === "FORM" && n.attrs["data-eb-init-form"]?.startsWith("actor:"),
  );
  initForm.formData = form({ bonus: "1", natural: "13" });
  view.fire("submit", initForm);
  assert.match(h.toasts.at(-1).text, /13 \+ \(1\) = 14 · dado fisico/);
  view.fire("click", view.find('[data-eb="start"]'));
  assert.equal(h.ctx.started, "old-watch", "Avvia uses the existing startEncounter flow");
  assert.deepEqual(errorsOf(h), []);
});

test("UI: stat block edit in place, parsed action confirmed, roll recorded physically (EN)", () => {
  const h = harness({ lang: "en" });
  UI.resetUi();
  const encounter = buildGoblins(h, { staged: false });
  const ui = UI.uiState(h.ctx);
  ui.openId = encounter.id;
  let view = mount(h);
  view.fire("click", view.find('[data-eb="block"]'));
  view = mount(h);
  assert.match(view.html, /Stat block/);
  assert.match(view.html, /SRD 5\.2\.1 · EN p\. 290/);
  view.fire("click", view.find('[data-eb="block-edit"]'));
  view = mount(h);
  const blockForm = view.nodes.find((n) => n.tagName === "FORM" && n.attrs["data-eb-block-form"]);
  assert.ok(blockForm, "edit form rendered in place");
  blockForm.formData = form({
    name: "Lantern Goblin",
    ac: "15",
    initiative: "+2",
    hpAverage: "10",
    hpFormula: "3d6",
    speed: "30",
    cr: "1/4",
    "ability-str": "8",
    "ability-dex": "15",
    "ability-con": "10",
    "ability-int": "10",
    "ability-wis": "8",
    "ability-cha": "8",
    "action-name-scimitar": "Scimitar",
    "action-text-scimitar": "Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Slashing damage.",
    "action-name-shortbow": "Shortbow",
    "action-text-shortbow": D.blockOf(h.slice, GOBLIN).actions[1].summary.en,
    newActionText: "",
  });
  view.fire("submit", blockForm);
  assert.match(h.toasts.at(-1).text, /1 actions recognised from the text to confirm/);
  const current = h.slice.encounters.find((e) => e.id === encounter.id);
  assert.ok(current.rows[0].blockId, "the row now uses the custom copy");
  view = mount(h);
  assert.match(view.html, /Recognised from the text/);
  view.fire("click", view.find('[data-eb="action-confirm"]'));
  view = mount(h);
  const rollButton = view.nodes.find(
    (n) => n.attrs["data-eb-roll"] === JSON.stringify({ kind: "attack", action: "scimitar" }),
  );
  assert.ok(rollButton, "confirmed action is clickable");
  view.fire("click", rollButton);
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /Physical die: I enter the faces/);
  dialog.options.onSubmit(
    form({ advantage: "normal", dieMode: "physical", "face-0": "17", visibility: "shared" }),
  );
  const rolls = h.ctx.state.ext["compendium-rolls"].rolls;
  assert.equal(rolls.at(-1).total, 22);
  assert.equal(rolls.at(-1).mode, "physical");
  assert.match(
    h.toasts.at(-1).text,
    /Lantern Goblin · Scimitar · attack roll: 1d20 \+ 5 → \[17\] = 22 · physical die/,
  );
  assert.throws(
    () => dialog.options.onSubmit(form({ dieMode: "physical", "face-0": "25" })),
    (error) => /Enter every physical die face/.test(error.en),
  );
});

test("UI: Table drawer shows read-aloud, activates the staged group and adds all tokens", () => {
  const h = harness();
  UI.resetUi();
  const encounter = buildGoblins(h);
  h.ctx.commit("notes", (draft) =>
    D.setNotes(draft.ext["encounter-builder"], "dm", encounter.id, {
      readAloud: "Frecce dal buio!",
    }),
  );
  handOff(h, encounter.id);
  const panel = h.ctx.registry.get("table-panel", "encounter-builder", h.ctx);
  assert.ok(panel, "DM drawer registered");
  const html = panel.render(h.ctx, { scene: h.ctx.state.scenes[0] });
  assert.match(html, /Frecce dal buio!/);
  assert.match(html, /Rinforzi/);
  assert.match(html, /Attiva gruppo…/);
  const stagedId = encounter.groups.find((g) => g.staged).id;
  UI.activateDialog(h.ctx, encounter.id, stagedId);
  const banditRow = encounter.rows.find((r) => r.groupId === stagedId);
  h.submit({ [`mode-${banditRow.id}`]: "physical", [`natural-${banditRow.id}`]: "11" });
  const scene = h.ctx.state.scenes[0];
  const bandit = D.copiesOf(h.slice.encounters.at(-1)).find((c) => c.groupId === stagedId).actorId;
  assert.equal(scene.tokens.find((t) => t.actorId === bandit).hidden, false);
  assert.equal(scene.encounter.participants.find((p) => p.actorId === bandit).natural, 11);
  const player = harness({ role: "player" });
  assert.equal(
    player.ctx.registry.get("table-panel", "encounter-builder", player.ctx),
    null,
    "players have no drawer",
  );
  const made = UI.createFromTokens(h.ctx, "old-watch");
  assert.ok(made.handoff.fromTokens);
  assert.equal(h.ctx.view.page, "preparation");
});

test("unique linked creature reuses the same NPC across a restart (Roll20 default token, R20-101)", () => {
  const h = harness();
  let encounter;
  h.ctx.commit("new", (draft) => {
    const slice = draft.ext["encounter-builder"];
    encounter = D.createEncounter(slice, "dm", { name: "Il capo" });
    const { row } = D.addCreature(slice, "dm", encounter.id, {
      creatureId: "srd2024:creature:bandit-captain",
    });
    D.updateRow(slice, "dm", encounter.id, row.id, { unique: true });
  });
  assert.throws(
    () => D.changeCount(h.slice, "dm", encounter.id, h.slice.encounters.at(-1).rows[0].id, 1),
    /unique/,
  );
  const first = handOff(h, encounter.id, { hideNames: false }).created[0];
  assert.equal(
    h.ctx.state.actors[first.actorId].name,
    "Capo dei banditi",
    "a unique creature has no number",
  );
  h.ctx.commit("hurt", (draft) => {
    draft.actors[first.actorId].notes = "Ferito dal gruppo";
  });
  h.ctx.commit("restart", (draft) =>
    D.restartEncounter(draft, draft.ext["encounter-builder"], encounter.id, { lang: "it" }, "dm", {
      tokenMenuSlice: draft.ext["token-menu"],
    }),
  );
  const again = D.copiesOf(h.slice.encounters.at(-1))[0];
  assert.equal(again.actorId, first.actorId, "the same linked NPC returns");
  assert.equal(h.ctx.state.actors[again.actorId].notes, "Ferito dal gruppo");
});

// ---------------------------------------------------------------- review fixes (B19)

test("builder rolls sort the prepared order; Start uses it; reinforcements join a sorted order", () => {
  const h = harness();
  const encounter = buildGoblins(h);
  handOff(h, encounter.id);
  const current = () => h.slice.encounters.find((e) => e.id === encounter.id);
  const roll = (key, natural, bonus = 0) =>
    h.ctx.commit("roll", (draft) =>
      D.recordGroupInitiative(
        draft,
        draft.ext["encounter-builder"],
        encounter.id,
        key,
        { mode: "physical", natural, bonus },
        "dm",
      ),
    );
  // The review's reproduction: goblins 3+2, Livia 3, Doran 20, Mira 12.
  roll(encounter.rows[0].id, 3, 2);
  roll("actor:livia", 3);
  roll("actor:doran", 20);
  roll("actor:mira", 12);
  const goblins = D.copiesOf(current())
    .filter((c) => c.rowId === encounter.rows[0].id)
    .map((c) => c.actorId);
  const expected = ["doran", "mira", ...goblins, "livia"];
  const scene = () => h.ctx.state.scenes.find((s) => s.id === "old-watch");
  assert.deepEqual(
    scene().encounter.participants.map((p) => p.actorId),
    expected,
  );
  const groups = D.initiativeGroups(h.ctx.state, h.slice, current());
  assert.deepEqual(
    groups.map((g) => g.total),
    [20, 12, 5, 3],
    "the builder list shows the order with totals",
  );
  assert.equal(getPreparedEncounter(h.ctx.state, "old-watch", "dm").order[0], "doran");
  h.ctx.commit("start", (draft) => startPreparedEncounter(draft, "old-watch", "dm"));
  assert.deepEqual(h.ctx.state.combat.order, expected);
  assert.equal(h.ctx.state.combat.order[h.ctx.state.combat.turn], "doran");
  // "Attiva gruppo…" with a physical 18 (+1): the bandit (19) goes after Doran (20).
  const stagedId = encounter.groups.find((g) => g.staged).id;
  const banditRow = encounter.rows.find((r) => r.groupId === stagedId);
  h.ctx.commit("activate", (draft) =>
    D.activateGroup(
      draft,
      draft.ext["encounter-builder"],
      encounter.id,
      stagedId,
      { rolls: { [banditRow.id]: { mode: "physical", natural: 18 } } },
      "dm",
    ),
  );
  const order = h.ctx.state.combat.order;
  const bandit = D.copiesOf(current()).find((c) => c.groupId === stagedId).actorId;
  assert.equal(order.indexOf(bandit), 1);
  assert.equal(order[0], "doran");
  assert.equal(order[h.ctx.state.combat.turn], "doran", "the current turn is kept");
});

test("ties: Earlier/Later only between equal totals; advantage keeps the higher d20 in the ledger", () => {
  const h = harness();
  const encounter = buildGoblins(h, { staged: false });
  handOff(h, encounter.id);
  const key = encounter.rows[0].id;
  for (const [k, natural] of [
    [key, 10],
    ["actor:mira", 12],
    ["actor:livia", 7],
    ["actor:doran", 4],
  ])
    h.ctx.commit("roll", (draft) =>
      D.recordGroupInitiative(
        draft,
        draft.ext["encounter-builder"],
        encounter.id,
        k,
        { mode: "physical", natural, bonus: k === key ? 2 : 0 },
        "dm",
      ),
    );
  const groups = () =>
    D.initiativeGroups(
      h.ctx.state,
      h.slice,
      h.slice.encounters.find((e) => e.id === encounter.id),
    );
  // Goblins rolled first (12) and tie with Mira (12): the stable sort keeps them first.
  assert.deepEqual(
    groups().map((g) => g.key),
    [key, "actor:mira", "actor:livia", "actor:doran"],
  );
  h.ctx.commit("tie", (draft) =>
    D.moveTiedGroup(draft, draft.ext["encounter-builder"], encounter.id, "actor:mira", -1, "dm"),
  );
  assert.deepEqual(
    groups()
      .map((g) => g.key)
      .slice(0, 2),
    ["actor:mira", key],
  );
  assert.throws(
    () => D.moveTiedGroup(h.ctx.state, h.slice, encounter.id, "actor:livia", -1, "dm"),
    /Only a tie/,
  );
  // A later roll re-sorts but keeps the DM's tie order.
  h.ctx.commit("roll", (draft) =>
    D.recordGroupInitiative(
      draft,
      draft.ext["encounter-builder"],
      encounter.id,
      "actor:doran",
      { mode: "physical", natural: 5, bonus: 0, reason: "Letto male" },
      "dm",
    ),
  );
  assert.deepEqual(
    groups()
      .map((g) => g.key)
      .slice(0, 2),
    ["actor:mira", key],
  );
  let result;
  h.ctx.commit("adv", (draft) => {
    result = D.recordGroupInitiative(
      draft,
      draft.ext["encounter-builder"],
      encounter.id,
      "actor:livia",
      { mode: "digital", bonus: 0, advantage: "advantage" },
      "dm",
    );
  });
  assert.equal(result.faces.length, 2);
  assert.equal(result.natural, Math.max(...result.faces));
  const entry = h.ctx.state.initiativeRolls.at(-1);
  assert.equal(entry.rollMode, "advantage");
  assert.deepEqual(entry.faces, result.faces);
  // The sort helper matches Preparation's rule and is exposed for other callers.
  const shuffled = structuredClone(h.ctx.state.scenes[0].encounter.participants).reverse();
  assert.equal(D.orderIsSorted(h.ctx.state, shuffled), false);
  h.ctx.commit("scramble", (draft) => draft.scenes[0].encounter.participants.reverse());
  h.ctx.commit("sort", (draft) =>
    D.sortPreparedOrder(draft, draft.ext["encounter-builder"], encounter.id, "dm"),
  );
  assert.equal(D.orderIsSorted(h.ctx.state, h.ctx.state.scenes[0].encounter.participants), true);
});

test("UI initiative list: condition hints, Advantage choice, totals in order, Sort when changed elsewhere", () => {
  const h = harness();
  UI.resetUi();
  const encounter = buildGoblins(h, { staged: false });
  handOff(h, encounter.id);
  h.ctx.commit("invisible", (draft) => {
    draft.actors.livia.conditions = [{ id: "invisible", instanceId: "t-inv" }];
  });
  UI.uiState(h.ctx).openId = encounter.id;
  let view = mount(h);
  assert.match(view.html, /Ordine d’iniziativa della scena/);
  assert.match(
    view.html,
    /data-prep-initiative-conditions>Da includere nel tiro: Invisibile: vantaggio/,
  );
  assert.match(view.html, /<option value="advantage">Vantaggio<\/option>/);
  const button = view.find('[data-eb="init-roll"][data-key="actor:livia"]');
  button.form = {
    querySelector: (selector) => ({ value: selector.includes("advantage") ? "advantage" : "3" }),
  };
  view.fire("click", button);
  assert.match(
    h.toasts.at(-1).text,
    /^\d+ \/ \d+ → \d+ \+ \(3\) = \d+ · vantaggio · dado digitale$/,
  );
  h.ctx.commit("scramble", (draft) => draft.scenes[0].encounter.participants.reverse());
  view = mount(h);
  assert.match(view.html, /L’ordine non segue i totali/);
  view.fire("click", view.find('[data-eb="init-sort"]'));
  assert.equal(D.orderIsSorted(h.ctx.state, h.ctx.state.scenes[0].encounter.participants), true);
  assert.deepEqual(errorsOf(h), []);
});

test("stat block: 2024 defenses, condition immunities and gear; full damage label; no card note", () => {
  const h = harness();
  const skeleton = D.blockOf(h.slice, { creatureId: "srd2024:creature:skeleton" });
  const html = UI.blockHTML(h.ctx, skeleton, { creatureId: skeleton.id });
  assert.match(html, /<dt>Vulnerabilità<\/dt><dd>Contundente<\/dd>/);
  assert.match(html, /<dt>Immunità<\/dt><dd>Veleno; Indebolimento, Avvelenato<\/dd>/);
  assert.match(html, /<dt>Equipaggiamento<\/dt><dd>Arco corto, Spada corta<\/dd>/);
  const priest = D.blockOf(h.slice, { creatureId: "srd2024:creature:priest" });
  const priestHtml = UI.blockHTML(h.ctx, priest, { creatureId: priest.id });
  assert.match(priestHtml, /Danni 1d6\+3 \+ 2d4/, "every damage term the roll includes");
  // The NPC carries the defenses of its block.
  let encounter;
  h.ctx.commit("new", (draft) => {
    const slice = draft.ext["encounter-builder"];
    encounter = D.createEncounter(slice, "dm", { name: "Ossa" });
    D.addCreature(slice, "dm", encounter.id, { creatureId: skeleton.id });
  });
  const copy = handOff(h, encounter.id, { hideNames: false }).created[0];
  assert.deepEqual(h.ctx.state.actors[copy.actorId].damageDefenses, {
    vulnerabilities: ["bludgeoning"],
    resistances: [],
    immunities: ["poison"],
  });
  UI.resetUi();
  UI.uiState(h.ctx).openId = encounter.id;
  const view = mount(h);
  assert.ok(!/goblin sono Folletti/.test(view.html), "the card's note is not product text");
  // The Table drawer shows the encounter's blocks with their rollable actions.
  const panel = h.ctx.registry.get("table-panel", "encounter-builder", h.ctx);
  const drawer = panel.render(h.ctx, { scene: h.ctx.state.scenes[0] });
  assert.match(drawer, /Blocchi statistiche \(1\)/);
  assert.match(drawer, /Vulnerabilità/);
  assert.match(drawer, /data-eb-roll=/);
  assert.ok(!/data-eb="block-edit"/.test(drawer), "read-only at the Table");
});

test("edit in place: every 2024 section, defenses, gear and one language at a time", () => {
  const h = harness();
  const ref = { creatureId: "srd2024:creature:goblin-warrior" };
  const base = D.blockOf(h.slice, ref);
  const draft = UI.domainDraft(
    {
      name: "Goblin guardiano",
      ac: "15",
      initiative: "+2",
      hpAverage: "10",
      hpFormula: "3d6",
      speed: "9",
      cr: "1/4",
      abilities: { str: "8", dex: "15", con: "10", int: "10", wis: "8", cha: "8" },
      saves: { str: "", dex: "+4", con: "", int: "", wis: "", cha: "" },
      skillsText: "Furtività +6, Percezione +1",
      senses: {
        darkvision: "18",
        blindsight: "",
        truesight: "",
        tremorsense: "3",
        passivePerception: "11",
      },
      languages: "Comune, Goblin, Draconico",
      vulnerabilities: [],
      resistances: ["fire"],
      immunities: ["poison"],
      conditionImmunities: ["poisoned"],
      gear: ["srd2024:item:scimitar", "srd2024:item:shortbow"],
      actions: {
        scimitar: {
          name: "Scimitarra",
          text: "Tiro per colpire in mischia: +6, portata 1,5 m. Colpito: 7 (1d8 + 3) danni taglienti.",
        },
      },
      bonusActions: {
        "nimble-escape": { name: "Fuga agile", text: "Effettua l’azione di Disimpegno." },
      },
      traits: {},
      reactions: {},
      newActionText: "Parata. Aggiunge 2 alla CA contro un attacco in mischia che lo colpirebbe.",
      newActionSection: "reactions",
    },
    "it",
  );
  let block;
  h.ctx.commit("edit", (state) => {
    block = D.saveBlockEdit(state.ext["encounter-builder"], "dm", ref, draft, { lang: "it" });
  });
  assert.deepEqual(block.saves, { dex: 4 });
  assert.deepEqual(block.skills, { stealth: 6, perception: 1 });
  assert.deepEqual(block.senses, { darkvision: 60, tremorsense: 10, passivePerception: 11 });
  assert.deepEqual(block.languages, {
    it: "Comune, Goblin, Draconico",
    en: "Comune, Goblin, Draconico",
  });
  assert.deepEqual(
    [block.resistances, block.immunities, block.conditionImmunities],
    [["fire"], ["poison"], ["poisoned"]],
  );
  assert.deepEqual(
    block.gear.map((g) => g.itemId),
    ["srd2024:item:scimitar", "srd2024:item:shortbow"],
  );
  assert.equal(block.bonusActions[0].summary.en, "Effettua l’azione di Disimpegno.");
  assert.equal(block.reactions.at(-1).name.it, "Parata");
  // One wording for both languages: the English view marks it instead of showing stale text.
  const scimitar = block.actions.find((a) => a.id === "scimitar");
  assert.equal(scimitar.summary.en, scimitar.summary.it);
  assert.equal(scimitar.textLang, "it");
  assert.equal(block.name.en, "Goblin guardiano");
  const en = harness({ lang: "en" });
  const html = UI.blockHTML(en.ctx, block, { blockId: block.id });
  assert.match(html, /data-eb-text-lang="it">text in Italian/);
  assert.ok(!/Hit: 5 \(1d6 \+ 2\)/.test(html), "no stale English numbers");
  assert.ok(!base.custom && base.actions[0].summary.en.includes("+4"), "the SRD block is intact");
  assert.throws(
    () =>
      D.saveBlockEdit(h.slice, "dm", ref, { ...draft, skillsText: "Volare +3" }, { lang: "it" }),
    /Unknown skill/,
  );
  assert.throws(
    () => D.saveBlockEdit(h.slice, "dm", ref, { ...draft, resistances: ["wood"] }, { lang: "it" }),
    /Invalid damage type/,
  );
  // Gear the DM removed does not reach the loot parcels.
  let encounter;
  h.ctx.commit("new", (state) => {
    const slice = state.ext["encounter-builder"];
    encounter = D.createEncounter(slice, "dm", { name: "Guardiani" });
    D.addCreature(slice, "dm", encounter.id, { blockId: block.id });
  });
  handOff(h, encounter.id, { hideNames: false });
  let parcels;
  h.ctx.commit("loot", (state) => {
    parcels = D.prepareTreasure(
      state,
      state.ext["encounter-builder"],
      encounter.id,
      "dm",
      state.ext.loot,
    );
  });
  const items = h.ctx.state.ext.loot.parcels.find((p) => p.id === parcels[0].id).items;
  assert.equal(items.length, 2, "armor and shield were removed from the block");
});

test("UI edit form renders every section and saves it; restart dialog offers physical dice", () => {
  const h = harness();
  UI.resetUi();
  const encounter = buildGoblins(h, { staged: false });
  const ui = UI.uiState(h.ctx);
  ui.openId = encounter.id;
  let view = mount(h);
  view.fire("click", view.find('[data-eb="block"]'));
  view = mount(h);
  view.fire("click", view.find('[data-eb="block-edit"]'));
  view = mount(h);
  for (const name of [
    "save-dex",
    "skills",
    "sense-darkvision",
    "passivePerception",
    "languages",
    "bonusActions-name-nimble-escape",
    "newActionSection",
  ])
    assert.ok(
      view.nodes.some((n) => n.attrs.name === name),
      `field ${name}`,
    );
  assert.ok(view.nodes.some((n) => n.attrs.name === "resistances" && n.attrs.value === "fire"));
  assert.ok(
    view.nodes.some((n) => n.attrs.name === "gear" && n.attrs.value === "srd2024:item:shield"),
  );
  const blockForm = view.nodes.find((n) => n.tagName === "FORM" && n.attrs["data-eb-block-form"]);
  const block = D.blockOf(h.slice, GOBLIN);
  blockForm.formData = form({
    name: "Goblin guerriero",
    ac: "15",
    initiative: "+2",
    hpAverage: "10",
    hpFormula: "3d6",
    speed: "9",
    cr: "1/4",
    "ability-str": "8",
    "ability-dex": "15",
    "ability-con": "10",
    "ability-int": "10",
    "ability-wis": "8",
    "ability-cha": "8",
    "save-str": "",
    "save-dex": "",
    "save-con": "",
    "save-int": "",
    "save-wis": "",
    "save-cha": "",
    skills: "Furtività +6",
    "defenses-present": "1",
    resistances: ["fire", "cold"],
    "sense-darkvision": "18",
    "sense-blindsight": "",
    "sense-truesight": "",
    "sense-tremorsense": "",
    passivePerception: "9",
    languages: "Comune, Goblin",
    "gear-present": "1",
    gear: ["srd2024:item:scimitar"],
    "action-name-scimitar": "Scimitarra",
    "action-text-scimitar": block.actions[0].summary.it,
    "action-name-shortbow": "Arco corto",
    "action-text-shortbow": block.actions[1].summary.it,
    "bonusActions-name-nimble-escape": "Fuga agile",
    "bonusActions-text-nimble-escape": block.bonusActions[0].summary.it,
    newActionSection: "actions",
    newActionText: "",
  });
  view.fire("submit", blockForm);
  const saved = h.slice.blocks.at(-1);
  assert.deepEqual(saved.resistances, ["fire", "cold"]);
  assert.deepEqual(
    saved.gear.map((g) => g.itemId),
    ["srd2024:item:scimitar"],
  );
  assert.equal(saved.senses.darkvision, 60);
  // Restart offers average, digital and physical HP; physical opens the dice dialog.
  handOff(h, encounter.id, { hideNames: false });
  view = mount(h);
  view.fire("click", view.find('[data-eb="restart"]'));
  const restart = h.dialogs.at(-1);
  for (const mode of ["average", "digital", "physical"])
    assert.match(restart.body, new RegExp(`name="hpMode" value="${mode}"`));
  assert.match(restart.body, /Azzera anche l’iniziativa dei personaggi/);
  h.submit({ hpMode: "physical" });
  const dice = h.dialogs.at(-1);
  assert.match(dice.title, /dadi fisici/);
  const inputs = [...dice.body.matchAll(/name="(hp-[^"]+)"/g)].map((m) => m[1]);
  assert.equal(inputs.length, 4 * 3, "four goblins × 3d6");
  h.submit(Object.fromEntries(inputs.map((name) => [name, "3"])));
  const copies = D.copiesOf(h.slice.encounters.find((e) => e.id === encounter.id));
  assert.ok(copies.every((c) => c.hp === 9 && c.hpRoll.mode === "physical"));
  assert.deepEqual(errorsOf(h), []);
});

test("Table drawer: Add all tokens stays on the Table, updates one encounter, disabled with no tokens", () => {
  const h = harness();
  UI.resetUi();
  h.ctx.view = { page: "table", id: "", tab: "" };
  const panel = h.ctx.registry.get("table-panel", "encounter-builder", h.ctx);
  const listeners = {};
  panel.bind({ addEventListener: (type, fn) => (listeners[type] ??= []).push(fn) }, h.ctx);
  const click = (attr, value) => {
    const target = {
      dataset: { ebAllTokens: value },
      disabled: false,
      closest: (selector) => (selector === `[${attr}]` ? target : null),
    };
    for (const fn of listeners.click) fn({ target });
  };
  let html = panel.render(h.ctx, { scene: h.ctx.state.scenes[0] });
  assert.match(html, /data-eb-all-tokens="old-watch" >/);
  click("data-eb-all-tokens", "old-watch");
  assert.equal(h.ctx.view.page, "table", "the DM stays on the map");
  assert.match(h.toasts.at(-1).text, /creato da \d+ pedine/);
  html = panel.render(h.ctx, { scene: h.ctx.state.scenes[0] });
  assert.match(html, /Incontro: Il cortile dell’osservatorio/);
  assert.match(html, /Apri nel costruttore/);
  click("data-eb-all-tokens", "old-watch");
  assert.match(h.toasts.at(-1).text, /già nell’incontro/);
  assert.equal(h.slice.encounters.filter((e) => e.handoff?.fromTokens).length, 1);
  h.ctx.commit("empty", (draft) => {
    draft.scenes[0].tokens = [];
  });
  html = panel.render(h.ctx, { scene: h.ctx.state.scenes[0] });
  assert.match(html, /data-eb-all-tokens="old-watch" disabled/);
  assert.match(html, /Nessuna pedina visibile/);
});

test("placement: labels of new tokens do not touch and tokens stay off the courtyard walls", () => {
  const h = harness();
  const encounter = buildGoblins(h);
  handOff(h, encounter.id);
  const scene = h.ctx.state.scenes[0];
  const walls = D.wallSegments(scene);
  assert.ok(walls.length >= 8, "the courtyard drawing's walls");
  const dist = (p, [a, b]) => {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };
  const created = D.copiesOf(h.slice.encounters.find((e) => e.id === encounter.id)).map((c) =>
    scene.tokens.find((t) => t.actorId === c.actorId),
  );
  for (const token of created)
    assert.ok(
      walls.every((w) => dist(token, w) >= 37.5),
      `token ${token.x},${token.y} on a wall`,
    );
  // Inside the courtyard's outer wall (90–910 × 70–580), in the anchor's room.
  for (const token of created)
    assert.ok(
      token.x > 90 && token.x < 910 && token.y > 70 && token.y < 580,
      `token ${token.x},${token.y} outside the courtyard`,
    );
  const width = D.labelWidth("Creatura sconosciuta 00");
  for (const a of created)
    for (const b of created)
      if (a !== b && Math.abs(a.y - b.y) < 95)
        assert.ok(
          Math.abs(a.x - b.x) >= width + 8,
          `labels of ${a.x},${a.y} and ${b.x},${b.y} touch`,
        );
});

test("focus: a control is found again by its data attributes after a re-render", () => {
  const element = (attrs, { form = null, type = "" } = {}) => ({
    type,
    getAttribute: (k) => attrs[k],
    hasAttribute: (k) => k in attrs,
    dataset: {},
    closest: (selector) => (selector === "[data-eb-init-form]" ? form : null),
  });
  assert.equal(
    UI.focusSelector(element({ "data-eb": "add", "data-ref": '{"creatureId":"x"}' })),
    '[data-eb="add"][data-ref="{\\"creatureId\\":\\"x\\"}"]',
  );
  assert.equal(
    UI.focusSelector(element({ "data-eb-row-side": "row-1" })),
    '[data-eb-row-side="row-1"]',
  );
  const form = { dataset: { ebInitForm: "actor:livia" } };
  assert.equal(
    UI.focusSelector(element({ name: "bonus" }, { form })),
    '[data-eb-init-form="actor:livia"] [name="bonus"]',
  );
  assert.equal(
    UI.focusSelector(
      element({ name: "eb-hp", "data-eb-ho": "hpMode", value: "digital" }, { type: "radio" }),
    ),
    '[data-eb-ho="hpMode"][name="eb-hp"][value="digital"]',
  );
  assert.equal(UI.focusSelector(null), null);
});
