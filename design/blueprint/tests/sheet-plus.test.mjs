// B37 — sheet: derived values, reasoned overrides and conveniences. Real store and
// registry (seed, commit, Undo, reload), the same domain calls the bound controls make,
// synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { renderCharacters, patchCharacter } from "../characters.mjs";
import { getEffectiveActor, getEffectiveSpeed } from "../forms-companions.mjs";
import * as forms from "../forms-companions.mjs";
import * as tracker from "../combat-tracker-domain.mjs";
import { previewAction } from "../combat.mjs";
import * as damage from "../damage-domain.mjs";
import * as D from "../sheet-plus-domain.mjs";
import * as area from "../sheet-plus.mjs";

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
function harness({ role = "player", lang = "it", setup = null } = {}) {
  const storage = memory();
  const device = memory();
  const emitted = [];
  const boot = () => {
    const registry = createRegistry({ deviceStorage: device });
    registry.use("sheet-plus", area.register);
    registry.on("roll-accepted", (payload) => emitted.push(payload));
    const store = createStore({ storage });
    setup?.(store.state);
    if (registry.initState(store.state).changed) store.persist();
    return { registry, store };
  };
  let { registry, store } = boot();
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "characters", id: "livia", tab: "actions" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? (value[ctx.lang] ?? value.it ?? value.en ?? "")
        : String(value ?? ""),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog() {},
    closeDialog() {},
    render() {},
    navigate(page, params) {
      ctx.navigated = { page, params };
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("You are offline"), { it: "Senza rete", en: "Offline" });
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
  return {
    ctx,
    toasts,
    emitted,
    get store() {
      return store;
    },
    get state() {
      return store.state;
    },
    get slice() {
      return store.state.ext["sheet-plus"];
    },
    reload() {
      ({ registry, store } = boot());
      registry.attach(ctx);
    },
    /** One commit of a domain call, as the bound controls do. */
    run(label, fn, options = {}) {
      let result;
      ctx.commit(
        label,
        (draft) => {
          result = fn(draft);
        },
        options,
      );
      return result;
    },
    as(next) {
      ctx.role = next;
      return this;
    },
  };
}
// A private sheet (as the Library's Iria): only its owner reads or controls it.
const withIria = (state) => {
  state.actors.iria ??= {
    ...structuredClone(state.actors.mira),
    id: "iria",
    name: "Iria",
    visibility: "private",
    campaignIds: [],
    owner: "player",
    skills: ["arcana"],
    skillModifiers: { arcana: 7 },
  };
};
const completeLongRest = (state, actorId, id) => {
  state.restTime ??= {};
  state.restTime.rests ??= [];
  state.restTime.rests.push({
    id: "rest-" + id,
    participants: [{ actorId, benefits: [{ id: "benefit-" + id, kind: "long", applied: true }] }],
  });
};

// ------------------------------------------------------------------------------ seed

test("seed: Doran's Weapon Mastery can change one choice after a Long Rest; normalize is idempotent", () => {
  const h = harness();
  const entry = h.slice.actors.doran;
  const mastery = entry.reselect.find((row) => row.id === "doran-weapon-mastery");
  assert.deepEqual(mastery.chosen, ["longsword", "handaxe", "javelin"]);
  assert.equal(mastery.count, 3);
  assert.equal(mastery.changeLimit, 1);
  assert.deepEqual(mastery.source.en.pages, [48]);
  assert.deepEqual(mastery.source.it.pages, [54]);
  assert.equal(D.pendingReselect(h.state, "doran").length, 0, "no rest yet: nothing pending");
  const again = D.normalizeSlice(structuredClone(h.slice), 1);
  assert.deepEqual(again, D.normalizeSlice(structuredClone(again), 1));
  assert.throws(() => D.normalizeSlice({}, 2), /newer version/);
  // Livia starts with no sheet-plus data and the rolls slice is empty.
  assert.equal(h.slice.actors.livia, undefined);
  assert.deepEqual(h.state.ext["sheet-plus-rolls"].rolls, []);
});

// ------------------------------------------------------------------------------ stacking

test("stacking order (R20-023): best base → add → at least → at most → multiply → latest override", () => {
  const row = (op, value, note = op) => ({ id: op + value, op, value, note });
  const chain = D.applyChain(12, [
    row("override", 20, "first override"),
    row("add", 1),
    row("set-base", 13, "mage armor"),
    row("set-base", 15, "better formula"),
    row("min", 10),
    row("max", 30),
    row("multiply", 2),
    row("override", 18, "latest override"),
  ]);
  assert.equal(chain.total, 18);
  assert.deepEqual(
    chain.steps.map((s) => [s.op, s.applied]),
    [
      ["set-base", false],
      ["set-base", true],
      ["add", true],
      ["min", false],
      ["max", false],
      ["multiply", true],
      ["override", false],
      ["override", true],
    ],
  );
  assert.equal(D.applyChain(12, [row("add", 1), row("multiply", 1.5)]).total, 19);
  assert.equal(D.applyChain(12, [row("add", -5), row("min", 10)]).total, 10);
  assert.equal(D.applyChain(12, [row("add", 5), row("max", 15)]).total, 15);
});

// ------------------------------------------------------------------------------ AC override

test("acceptance 2: AC «bonus magico +1» with a note shows the chain in order; removal, Undo, reload", () => {
  const h = harness();
  const before = D.statValue(h.state, "livia", "ac");
  assert.equal(before.total, 12);
  assert.deepEqual(
    before.baseParts.map((p) => [p.label.it, p.value]),
    [
      ["Senza armatura", 10],
      ["Destrezza", 2],
    ],
  );
  assert.throws(
    () =>
      h.run("x", (d) =>
        D.addModifier(d, "livia", "ac", { op: "add", value: 1, note: " " }, "player"),
      ),
    /reason/,
  );
  const mod = h.run("CA +1", (d) =>
    D.addModifier(
      d,
      "livia",
      "ac",
      { op: "add", value: 1, note: "Bonus magico: anello" },
      "player",
    ),
  );
  assert.equal(h.state.actors.livia.ac, 13, "combat reads actor.ac: the total is written through");
  const stat = D.statValue(h.state, "livia", "ac");
  assert.equal(stat.total, 13);
  assert.equal(stat.base, 12);
  assert.deepEqual(
    stat.steps.map((s) => [s.op, s.value, s.note, s.before, s.after]),
    [["add", 1, "Bonus magico: anello", 12, 13]],
  );
  // The bar's tooltip carries the chain in the declared order (FVT-010).
  const bar = area._test.renderBar(h.ctx, getEffectiveActor(h.state.actors.livia));
  assert.match(bar, /id="shp-tip-ac"/);
  assert.match(bar, /Senza armatura<\/span><strong>10<\/strong>/);
  assert.match(bar, /Aggiungi o togli: Bonus magico: anello<\/span><strong>\+1 → 13/);
  h.reload();
  assert.equal(h.state.actors.livia.ac, 13, "reload keeps the total");
  assert.equal(h.slice.actors.livia.mods.ac.length, 1, "reload keeps the note");
  h.run("tolta", (d) => D.removeModifier(d, "livia", "ac", mod.id, "player"));
  assert.equal(h.state.actors.livia.ac, 12, "removal restores the base");
  assert.equal(h.slice.actors.livia.applied.ac, undefined);
  h.ctx.undo();
  assert.equal(h.state.actors.livia.ac, 13, "Undo brings the change back atomically");
  assert.equal(h.slice.actors.livia.mods.ac.length, 1);
});

test("drift: «Correggi valori» changes the AC after the modifiers; realign adopts the new base", () => {
  const h = harness();
  h.run("CA +1", (d) =>
    D.addModifier(d, "livia", "ac", { op: "add", value: 1, note: "Anello" }, "player"),
  );
  const actor = h.state.actors.livia;
  h.run("Scheda modificata", (d) =>
    patchCharacter(d.actors.livia, {
      name: actor.name,
      className: actor.className,
      level: actor.level,
      maxHp: actor.maxHp,
      ac: 14,
      speed: actor.speed,
      abilities: actor.abilities,
    }),
  );
  const drift = D.statValue(h.state, "livia", "ac");
  assert.equal(drift.drift, true);
  assert.equal(drift.total, 14, "the value in use is the sheet's");
  assert.equal(drift.chainTotal, 13);
  assert.match(
    area._test.renderBar(h.ctx, getEffectiveActor(h.state.actors.livia)),
    /Apri e riallinea/,
  );
  h.run("riallinea", (d) => D.realignStat(d, "livia", "ac", "player"));
  const after = D.statValue(h.state, "livia", "ac");
  assert.equal(after.base, 14);
  assert.equal(after.total, 15);
  assert.equal(h.state.actors.livia.ac, 15);
  assert.equal(after.drift, false);
});

test("saving throws and skills: overrides reach the fields other modules read, then leave no trace", () => {
  const h = harness({ setup: withIria });
  assert.equal(h.state.actors.livia.savingThrows, undefined);
  assert.equal(D.statValue(h.state, "livia", "save:int").total, 5, "Wizard: INT +3 and PB +2");
  assert.equal(D.statValue(h.state, "livia", "save:dex").total, 2);
  const mod = h.run("TS", (d) =>
    D.addModifier(
      d,
      "livia",
      "save:dex",
      { op: "add", value: 1, note: "Mantello di protezione" },
      "player",
    ),
  );
  assert.equal(h.state.actors.livia.savingThrows.dex, 3, "combat's DEX save reads it");
  h.run("x", (d) => D.removeModifier(d, "livia", "save:dex", mod.id, "player"));
  assert.equal(h.state.actors.livia.savingThrows, undefined, "the field is removed again");
  // A recorded skill value is the base (Iria's Arcana +7, not INT + PB).
  const arcana = D.statValue(h.state, "iria", "skill:arcana");
  assert.equal(arcana.total, 7);
  assert.equal(arcana.baseParts[0].label.it, "Valore registrato sulla scheda");
  assert.equal(D.statValue(h.state, "mira", "skill:perception").total, 5);
  const skill = D.statValue(h.state, "livia", "skill:stealth");
  assert.equal(skill.total, 2);
  // Initiative and passive Perception are sheet-level (no field written).
  h.run("iniziativa", (d) =>
    D.addModifier(
      d,
      "livia",
      "initiative",
      { op: "add", value: 5, note: "Talento Allerta (PB)" },
      "player",
    ),
  );
  assert.equal(D.statValue(h.state, "livia", "initiative").total, 7);
  assert.equal(D.statValue(h.state, "livia", "passive-perception").total, 11);
  // In a form the form's values apply and sheet overrides are refused with the reason.
  assert.throws(
    () =>
      h.run("x", (d) => {
        d.actors.mira.activeForm = {
          profile: {
            abilities: {},
            speeds: { walk: 12 },
            savingThrows: {},
            skillModifiers: {},
            senses: {},
          },
          equipment: [],
        };
        D.addModifier(d, "mira", "ac", { op: "add", value: 1, note: "x" }, "player");
      }),
    /form/,
  );
});

// ------------------------------------------------------------------------------ defenses

test("acceptance 3: fire resistance with a source plus a custom one with an asterisk; duplicates merge", () => {
  const h = harness();
  assert.throws(
    () =>
      h.run("x", (d) =>
        D.addDefense(
          d,
          "livia",
          { kind: "resistance", target: "fire", sourceKind: "spell", sourceName: "" },
          "player",
        ),
      ),
    /source/,
  );
  h.run("fuoco", (d) =>
    D.addDefense(
      d,
      "livia",
      {
        kind: "resistance",
        target: "fire",
        sourceKind: "spell",
        sourceName: "Protezione dall’energia",
      },
      "player",
    ),
  );
  h.run("freddo", (d) =>
    D.addDefense(
      d,
      "livia",
      {
        kind: "resistance",
        target: "cold",
        sourceKind: "custom",
        note: "Dono del faro, accordo col DM",
      },
      "player",
    ),
  );
  const dup = h.run("fuoco 2", (d) =>
    D.addDefense(
      d,
      "livia",
      {
        kind: "resistance",
        target: "fire",
        sourceKind: "item",
        sourceName: "Anello di resistenza",
      },
      "player",
    ),
  );
  const rows = D.collapsedDefenses(h.state, "livia");
  const fire = rows.find((r) => r.target === "fire");
  const cold = rows.find((r) => r.target === "cold");
  assert.equal(rows.filter((r) => r.target === "fire").length, 1, "duplicates collapse");
  assert.equal(fire.sources.length, 2);
  assert.equal(fire.marker, "");
  assert.equal(cold.marker, "*", "custom entry with no rule source");
  assert.deepEqual(h.state.actors.livia.damageDefenses.resistances, ["fire", "cold"]);
  // A condition immunity reaches the conditions domain's field.
  h.run("imm", (d) =>
    D.addDefense(
      d,
      "livia",
      {
        kind: "immunity",
        target: "condition:charmed",
        sourceKind: "species",
        sourceName: "Sangue fatato",
      },
      "player",
    ),
  );
  assert.deepEqual(h.state.actors.livia.conditionImmunities, ["charmed"]);
  assert.throws(
    () =>
      h.run("x", (d) =>
        D.addDefense(
          d,
          "livia",
          { kind: "resistance", target: "condition:charmed", sourceKind: "custom", note: "x" },
          "player",
        ),
      ),
    /immunity only/,
  );
  // Removing one fire source keeps the resistance (the other source stays).
  h.run("togli", (d) => D.removeDefense(d, "livia", dup.id, "player"));
  assert.deepEqual(h.state.actors.livia.damageDefenses.resistances, ["fire", "cold"]);
  // An NPC's own defenses are listed as sheet entries and kept when ours are removed.
  h.as("dm").run("npc", (d) => {
    d.actors["goblin-1"].damageDefenses = {
      resistances: ["poison"],
      immunities: [],
      vulnerabilities: [],
    };
    D.addDefense(
      d,
      "goblin-1",
      { kind: "resistance", target: "poison", sourceKind: "custom", note: "doppione" },
      "dm",
    );
  });
  assert.deepEqual(h.state.actors["goblin-1"].damageDefenses.resistances, ["poison"]);
  const id = h.slice.actors["goblin-1"].defenses[0].id;
  h.run("togli", (d) => D.removeDefense(d, "goblin-1", id, "dm"));
  assert.deepEqual(
    h.state.actors["goblin-1"].damageDefenses.resistances,
    ["poison"],
    "external kept",
  );
});

// ------------------------------------------------------------------------------ speeds

test("acceptance 4: Fly 9 m added and used by movement at the Table; switching subtracts distance moved", () => {
  const h = harness();
  h.run("velocità", (d) => D.setSpeeds(d, "livia", { fly: "9", display: "fly" }, "player"));
  assert.deepEqual(h.state.actors.livia.speeds, { fly: 9 });
  assert.equal(h.slice.actors.livia.speedDisplay, "fly");
  // A different fly speed proves which one the Table uses.
  h.run("velocità", (d) => D.setSpeeds(d, "livia", { fly: "12" }, "player"));
  assert.equal(getEffectiveSpeed(h.state.actors.livia), 9, "walking by default");
  h.run("vola", (d) => D.setMovementMode(d, "livia", "fly", "player"));
  assert.equal(getEffectiveSpeed(h.state.actors.livia), 12, "the Table moves with the fly speed");
  assert.equal(h.state.actors.livia.speed, 9, "the walking speed stays on the sheet");
  // In combat: 6 m walked, then flying 12 → 12 − 6 = 6 m left (SRD EN 188 / IT 218).
  h.run("walk", (d) => D.setMovementMode(d, "livia", "walk", "player"));
  h.run("combat", (d) => {
    d.combat.active = true;
    Object.assign(d.actors.livia, { movement: 3, movementSpent: 6, dashCount: 0 });
  });
  h.run("vola", (d) => D.setMovementMode(d, "livia", "fly", "player"));
  assert.equal(h.state.actors.livia.movement, 6);
  h.run("fly 5", (d) => D.setSpeeds(d, "livia", { fly: "5" }, "player"));
  h.run("walk", (d) => D.setMovementMode(d, "livia", "walk", "player"));
  assert.throws(
    () => h.run("vola", (d) => D.setMovementMode(d, "livia", "fly", "player")),
    /no movement/,
  );
  assert.equal(h.state.actors.livia.movementMode, undefined, "refused switch changes nothing");
  // Removing the fly speed while flying returns to walking.
  h.run("fly 9", (d) => D.setSpeeds(d, "livia", { fly: "9" }, "player"));
  h.run("vola", (d) => D.setMovementMode(d, "livia", "fly", "player"));
  h.run("no fly", (d) => D.setSpeeds(d, "livia", { fly: "" }, "player"));
  assert.equal(h.state.actors.livia.movementMode, undefined);
  assert.equal(h.state.actors.livia.speeds, undefined);
  assert.throws(() => h.run("x", (d) => D.setSpeeds(d, "livia", { swim: "-3" }, "player")), /300/);
  // The Table panel offers the switch only to whoever controls the creature.
  h.run("fly 9", (d) => D.setSpeeds(d, "livia", { fly: "9" }, "player"));
  const panel = area._test.renderTablePanel(h.ctx, { selectedActorId: "livia" });
  assert.match(panel, /data-shp="move-mode" data-mode="fly"/);
  assert.equal(area._test.renderTablePanel(h.ctx, { selectedActorId: "goblin-1" }), "");
});

// ------------------------------------------------------------------------------ actions

test("acceptance 5: Bonus filter and the 2024 generic actions with their description and source", () => {
  const h = harness();
  const rows = D.actionList(h.state, "livia");
  const bonus = D.filterActions(rows, "bonus");
  assert.deepEqual(
    bonus.map((r) => r.ref.kind + ":" + r.ref.id),
    ["item:potion"],
    "Livia's Bonus Actions: the potion (2024: drinking is a Bonus Action)",
  );
  const generic = rows.filter((r) => r.generic && r.economy === "action");
  assert.deepEqual(
    generic.map((r) => r.ref.id),
    [
      "attack",
      "dash",
      "disengage",
      "dodge",
      "help",
      "hide",
      "influence",
      "magic",
      "ready",
      "search",
      "study",
      "utilize",
    ],
  );
  for (const row of generic) {
    assert.ok(row.summary.it && row.summary.en, row.ref.id + " has a description");
    assert.ok(
      row.source?.en?.pages?.length && row.source?.it?.pages?.length,
      row.ref.id + " has pages",
    );
  }
  const reactions = D.filterActions(rows, "reaction").map((r) => r.ref.id);
  assert.ok(reactions.includes("sample-shield") && reactions.includes("opportunity-attack"));
  const attacks = D.filterActions(rows, "attack").map((r) => r.ref.id);
  assert.ok(attacks.includes("fire-bolt") && attacks.includes("quarterstaff"));
  assert.equal(
    D.filterActions(D.actionList(h.state, "doran"), "bonus")
      .map((r) => r.ref.id)
      .join(),
    "sample-second-wind",
    "Doran's Second Wind is a Bonus Action with limited uses",
  );
  const html = area._test.renderActions(h.ctx, getEffectiveActor(h.state.actors.livia));
  for (const chip of [
    "Tutte",
    "Attacco",
    "Azione",
    "Azione bonus",
    "Reazione",
    "Altro",
    "Usi limitati",
  ])
    assert.match(html, new RegExp(`data-filter="[a-z]+" aria-pressed="(true|false)">${chip} `));
  area._test.ui.filter = "bonus";
  const filtered = area._test.renderActions(h.ctx, getEffectiveActor(h.state.actors.livia));
  assert.match(filtered, /Pozione di guarigione/);
  assert.doesNotMatch(filtered, /Dardo di fuoco/);
  area._test.ui.filter = "all";
  // A limited feature spends a use from the list (the same counter the sheet corrects);
  // Doran's are all spent in the sample, so the list refuses with the reason first.
  assert.throws(
    () => h.as("dm").run("uso", (d) => D.spendFeatureUse(d, "doran", "sample-second-wind", "dm")),
    /No uses left/,
  );
  h.run("riposo", (d) => {
    d.actors.doran.features.find((f) => f.id === "sample-second-wind").used = 0;
  });
  h.run("uso", (d) => D.spendFeatureUse(d, "doran", "sample-second-wind", "dm"));
  assert.equal(h.state.actors.doran.features.find((f) => f.id === "sample-second-wind").used, 1);
  h.as("player");
});

// ------------------------------------------------------------------------------ favourites

test("acceptance 6 and 10: starred favourites, strip use, order; custom skill and favourite skills on top", () => {
  const h = harness();
  h.run("fav", (d) => D.toggleFavorite(d, "livia", { kind: "skill", id: "stealth" }, "player"));
  h.run("fav", (d) => D.toggleFavorite(d, "livia", { kind: "attack", id: "fire-bolt" }, "player"));
  h.run("fav", (d) => D.toggleFavorite(d, "livia", { kind: "item", id: "potion" }, "player"));
  let favs = D.resolveFavorites(h.state, "livia");
  assert.deepEqual(
    favs.map((f) => [f.ref.kind, f.name.it, f.available]),
    [
      ["skill", "Furtività", true],
      ["attack", "Dardo di fuoco", true],
      ["item", "Pozione di guarigione", true],
    ],
  );
  assert.equal(favs[1].value, 5, "Fire Bolt to hit: INT +3, PB +2");
  h.run("move", (d) => D.moveFavorite(d, "livia", { kind: "item", id: "potion" }, -1, "player"));
  favs = D.resolveFavorites(h.state, "livia");
  assert.equal(favs[1].ref.id, "potion");
  const bar = area._test.renderBar(h.ctx, getEffectiveActor(h.state.actors.livia));
  assert.match(bar, /data-shp="use" data-kind="skill" data-id="stealth"/);
  // Using a feature favourite spends a use (Doran, DM).
  h.as("dm").run("fav", (d) =>
    D.toggleFavorite(d, "doran", { kind: "feature", id: "sample-action-surge" }, "dm"),
  );
  // Favourites of a removed item stay listed as unavailable (FVT-009).
  h.as("player").run("x", (d) => {
    d.actors.livia.inventory = d.actors.livia.inventory.filter((i) => i.id !== "potion");
  });
  assert.equal(
    D.resolveFavorites(h.state, "livia").find((f) => f.ref.id === "potion").available,
    false,
  );
  // Custom skill (I-161 example) and pins.
  const skill = h.run("skill", (d) =>
    D.addCustomSkill(
      d,
      "livia",
      { name: "Tecnologia antica", ability: "int", proficiency: "proficient", bonus: "0" },
      "player",
    ),
  );
  assert.equal(D.statValue(h.state, "livia", "skill:custom:" + skill.id).total, 5);
  assert.throws(
    () =>
      h.run("x", (d) =>
        D.addCustomSkill(d, "livia", { name: "Furtività", ability: "dex" }, "player"),
      ),
    /already exists/,
  );
  h.run("fav", (d) =>
    D.toggleFavorite(d, "livia", { kind: "skill", id: "custom:" + skill.id }, "player"),
  );
  const rows = D.skillRows(h.state, "livia");
  assert.deepEqual(
    rows.pinned.map((r) => r.id),
    ["stealth", "custom:" + skill.id],
    "favourite skills on top, in favourite order",
  );
  assert.ok(!rows.standard.some((r) => r.id === "stealth"));
  const html = area._test.renderDerived(h.ctx, getEffectiveActor(h.state.actors.livia));
  assert.match(html, /Preferite in alto/);
  assert.match(html, /Tecnologia antica/);
  h.run("rm", (d) => D.removeCustomSkill(d, "livia", skill.id, "player"));
  assert.ok(!D.resolveFavorites(h.state, "livia").some((f) => f.ref.id === "custom:" + skill.id));
});

// ------------------------------------------------------------------------------ bless and rolls

test("acceptance 7: Bless adds +1d4 to attack and save details and rolls, then is turned off", () => {
  const h = harness();
  h.run("bless", (d) => D.toggleEffect(d, "livia", "bless", true, "player"));
  assert.deepEqual(
    D.activeRiders(h.state, "livia", "save").map((r) => [r.name.it, r.sign, r.dice.sides]),
    [["Benedizione", 1, 4]],
  );
  assert.equal(D.activeRiders(h.state, "livia", "check").length, 0, "Bless is not on checks");
  const derived = area._test.renderDerived(h.ctx, getEffectiveActor(h.state.actors.livia));
  assert.match(derived, /Effetti attivi sui TS: \+1d4 Benedizione/);
  const actions = area._test.renderActions(h.ctx, getEffectiveActor(h.state.actors.livia));
  assert.match(actions, /Effetti attivi sui tiri per colpire: \+1d4 Benedizione/);
  const profile = D.rollProfile(h.state, "livia", "attack", "fire-bolt");
  assert.equal(profile.modifier, 5);
  assert.deepEqual(
    D.rollDice(profile).map((d) => d.sides),
    [20, 4],
  );
  // Digital save through the core dice service, with the d4 rider.
  const faces = [14, 3];
  h.ctx.rollDie = () => faces.shift();
  const record = area._test.rollNow(h.ctx, "livia", {
    kind: "save",
    subject: "dex",
    mode: "digital",
  });
  assert.deepEqual(record.values, [14, 3]);
  assert.equal(record.total, 14 + 2 + 3);
  assert.equal(h.emitted.at(-1).roll.source, "sheet-plus");
  assert.deepEqual(h.state.log.at(-1).rolls[0].values, [14, 3], "the log entry carries the roll");
  // Physical faces are validated per die.
  assert.throws(
    () =>
      area._test.rollNow(h.ctx, "livia", {
        kind: "save",
        subject: "dex",
        mode: "physical",
        faces: [14, 5],
      }),
    /natural face/,
  );
  const physical = area._test.rollNow(h.ctx, "livia", {
    kind: "attack",
    subject: "fire-bolt",
    mode: "physical",
    rollMode: "advantage",
    faces: [4, 17, 2],
  });
  assert.equal(physical.natural, 17);
  assert.equal(physical.total, 17 + 5 + 2);
  // Undo withdraws the result; the identical digital retry reuses the faces once (I-229).
  h.ctx.rollDie = () => 1;
  const first = area._test.rollNow(h.ctx, "livia", {
    kind: "save",
    subject: "wis",
    mode: "digital",
  });
  h.ctx.undo();
  const withdrawn = D.visibleRolls(h.state, "livia", "player").find((r) => r.id === first.id);
  assert.equal(withdrawn.live, false, "kept and marked withdrawn");
  h.ctx.rollDie = (sides) => sides;
  const retry = area._test.rollNow(h.ctx, "livia", {
    kind: "save",
    subject: "wis",
    mode: "digital",
  });
  assert.equal(retry.status, "reused");
  assert.deepEqual(retry.values, first.values);
  const next = area._test.rollNow(h.ctx, "livia", {
    kind: "save",
    subject: "wis",
    mode: "digital",
  });
  assert.deepEqual(next.values, [20, 4], "only once");
  // The Table's rider roll: the effect die alone.
  h.ctx.rollDie = () => 2;
  const rider = area._test.rollNow(h.ctx, "livia", {
    kind: "rider",
    subject: "bless",
    mode: "digital",
  });
  assert.equal(rider.natural, null);
  assert.equal(rider.total, 2);
  // Turned off: no rider anywhere.
  h.run("off", (d) => D.toggleEffect(d, "livia", "bless", false, "player"));
  assert.equal(D.activeRiders(h.state, "livia", "save").length, 0);
  const off = area._test.renderDerived(h.ctx, getEffectiveActor(h.state.actors.livia));
  assert.doesNotMatch(off, /Effetti attivi sui TS/);
  assert.doesNotMatch(off, /class="shp-rider"/);
  // Custom rider (AboveVTT-style): −2 flat on checks.
  h.run("custom", (d) =>
    D.addCustomEffect(
      d,
      "livia",
      { name: "Stanchezza del viaggio", sign: -1, flat: 2, appliesTo: ["check"] },
      "player",
    ),
  );
  assert.equal(D.rollProfile(h.state, "livia", "skill", "stealth").riders[0].flat, 2);
});

// ------------------------------------------------------------------------------ experience

test("acceptance 8: +300 XP proposes the level; milestone mode with the DM's proposal", () => {
  const h = harness();
  assert.equal(
    D.xpView(h.state, "livia").xp,
    900,
    "no record: level 3 minimum (SRD EN 23 / IT 25)",
  );
  assert.throws(() => h.run("x", (d) => D.setXp(d, "livia", 2400, "", "player")), /reason/);
  h.run("PE", (d) => D.setXp(d, "livia", 2400, "Ripresa dalla scheda cartacea", "player"));
  assert.equal(D.xpView(h.state, "livia").ready, false);
  h.run("+300", (d) => D.addXp(d, "livia", 300, "player"));
  const view = D.xpView(h.state, "livia");
  assert.equal(h.state.actors.livia.xp, 2700);
  assert.equal(view.ready, true);
  assert.match(
    area._test.renderBar(h.ctx, getEffectiveActor(h.state.actors.livia)),
    /Avanza al livello 4/,
  );
  assert.throws(() => h.run("x", (d) => D.addXp(d, "livia", -5000, "player")), /below 0/);
  h.ctx.undo();
  assert.equal(h.state.actors.livia.xp, 2400);
  // Milestones: no XP counting; only the DM records milestones and proposes the level.
  h.run("mode", (d) => D.setAdvancementMode(d, "livia", "milestone", "player"));
  assert.throws(
    () =>
      h.run("x", (d) =>
        D.recordMilestone(d, "livia", { title: "Il faro", propose: true }, "player"),
      ),
    /DM records/,
  );
  h.as("dm").run("traguardo", (d) =>
    D.recordMilestone(
      d,
      "livia",
      { title: "Riaccesa la lanterna della torre", propose: true },
      "dm",
    ),
  );
  h.as("player");
  const milestone = D.xpView(h.state, "livia");
  assert.equal(milestone.mode, "milestone");
  assert.equal(milestone.ready, false, "XP no longer proposes");
  assert.equal(milestone.proposedLevel, 4);
  assert.match(
    area._test.renderBar(h.ctx, getEffectiveActor(h.state.actors.livia)),
    /Il DM propone il livello 4/,
  );
});

// ------------------------------------------------------------------------------ tooltips and mode

test("acceptance 1 and 9: Play and Edit show the same effective values, Edit adds cogs and the base; rich AC and Initiative tooltips", () => {
  const h = harness();
  h.run("CA +1", (d) =>
    D.addModifier(d, "livia", "ac", { op: "add", value: 1, note: "Bonus magico" }, "player"),
  );
  const actor = () => getEffectiveActor(h.state.actors.livia);
  assert.equal(area._test.modeOf(h.ctx), "play", "default");
  let bar = area._test.renderBar(h.ctx, actor());
  assert.match(
    bar,
    /data-key="ac"[^>]*><span class="shp-pill-label">CA<\/span><strong>13<\/strong>/,
  );
  assert.match(
    bar,
    /id="shp-tip-initiative"[^>]*><strong class="shp-tip-title">Iniziativa \+2<\/strong>/,
  );
  assert.match(bar, /Punteggio d’iniziativa: 12/);
  assert.match(bar, /EN 184 \/ IT 208/);
  area._test.setMode(h.ctx, "edit");
  assert.equal(area._test.modeOf(h.ctx), "edit");
  bar = area._test.renderBar(h.ctx, actor());
  // PG-25: the same total in Play and Edit (13); Edit adds the cog and the base as a note.
  assert.match(
    bar,
    /shp-pill shp-pill-edit" data-shp="stat" data-key="ac"[^>]*><span class="shp-pill-label">CA<\/span><strong>13<\/strong>/,
  );
  assert.match(bar, /class="shp-base-note">base 12</);
  const derived = area._test.renderDerived(h.ctx, actor());
  assert.match(derived, /Modifica · ingranaggi per le modifiche/);
  assert.match(derived, /data-shp="skill-add"/);
  // The app's Undo is offered in the bar, naming the change it reverts.
  h.ctx.canUndo = () => true;
  h.ctx.undoLabel = () => "CA +1";
  assert.match(area._test.renderBar(h.ctx, actor()), /data-shp="undo" title="CA \+1"/);
  delete h.ctx.canUndo;
  // The choice stays on this device: a reload keeps it (device storage, not game state).
  h.reload();
  assert.equal(area._test.modeOf(h.ctx), "edit");
  // Someone who cannot edit sees Play values and no toggle.
  h.as("dm");
  h.ctx.view = { page: "characters", id: "livia", tab: "actions" };
  area._test.setMode(h.ctx, "play");
});

// ------------------------------------------------------------------------------ notes and privacy

test("acceptance 11: Allies and Enemies notes; «Only me» notes never readable by the other identity", () => {
  const h = harness({ setup: withIria });
  h.run("alleati", (d) =>
    D.addNote(
      d,
      "livia",
      { section: "allies", title: "Syl l’erborista", text: "Ci ospita a Bruma." },
      "player",
    ),
  );
  h.run("nemici", (d) =>
    D.addNote(
      d,
      "livia",
      { section: "enemies", title: "Chi ha spento la lanterna", text: "Ombra incappucciata." },
      "player",
    ),
  );
  h.run(
    "mia",
    (d) =>
      D.addNote(
        d,
        "livia",
        { section: "other", title: "Sospetto su Doran", text: "Solo mio.", audience: "me" },
        "player",
      ),
    { local: true, visibility: "private" },
  );
  assert.deepEqual(
    D.readableNotes(h.state, "livia", "player").map((n) => n.title),
    ["Syl l’erborista", "Chi ha spento la lanterna", "Sospetto su Doran"],
  );
  assert.deepEqual(
    D.readableNotes(h.state, "livia", "dm").map((n) => n.title),
    ["Syl l’erborista", "Chi ha spento la lanterna"],
    "the DM never reads the player's «Only me» note",
  );
  h.ctx.role = "dm";
  const html = area._test.renderNotes(h.ctx, getEffectiveActor(h.state.actors.livia));
  assert.doesNotMatch(html, /Sospetto su Doran/);
  assert.match(html, /Alleati/);
  h.ctx.role = "player";
  // Iria is a private sheet: the DM reads nothing at all.
  h.run(
    "iria",
    (d) =>
      D.addNote(d, "iria", { section: "allies", title: "Custode del faro", text: "" }, "player"),
    { local: true, visibility: "private" },
  );
  assert.equal(D.readableNotes(h.state, "iria", "dm").length, 0);
  assert.throws(() => D.readable(h.state, "iria", "dm"), /unavailable/);
  // The player cannot write a sheet note on Doran (DM's sheet), only an «Only me» one.
  assert.throws(
    () => h.run("x", (d) => D.addNote(d, "doran", { section: "allies", title: "x" }, "player")),
    /Only me/,
  );
  // Edit and remove.
  const note = h.slice.actors.livia.notes[0];
  h.run("edit", (d) =>
    D.updateNote(d, "livia", note.id, { title: "Syl, erborista di Bruma" }, "player"),
  );
  assert.equal(h.slice.actors.livia.notes[0].title, "Syl, erborista di Bruma");
  h.run("rm", (d) => D.removeNote(d, "livia", note.id, "player"));
  assert.equal(h.slice.actors.livia.notes.length, 2);
});

// ------------------------------------------------------------------------------ reselect

test("acceptance 12: a choice to revise after a Long Rest (Shard); one change allowed; notification", () => {
  const h = harness({ role: "dm" });
  h.ctx.view = { page: "characters", id: "doran", tab: "features" };
  h.run("rest", (d) => completeLongRest(d, "doran", "1"));
  const pending = D.pendingReselect(h.state, "doran");
  assert.equal(pending.length, 1);
  const notices = h.ctx.registry.notifications(h.ctx);
  assert.ok(notices.some((n) => /Padronanza delle armi/.test(n.title?.it ?? n.title)));
  assert.throws(
    () =>
      h.run("x", (d) =>
        D.resolveReselect(
          d,
          "doran",
          "doran-weapon-mastery",
          { chosen: ["greatsword", "greataxe", "javelin"] },
          "dm",
        ),
      ),
    /only one choice/,
  );
  h.run("rivedi", (d) =>
    D.resolveReselect(
      d,
      "doran",
      "doran-weapon-mastery",
      { chosen: ["greatsword", "handaxe", "javelin"] },
      "dm",
    ),
  );
  const row = h.slice.actors.doran.reselect[0];
  assert.deepEqual(row.chosen, ["greatsword", "handaxe", "javelin"]);
  assert.equal(D.pendingReselect(h.state, "doran").length, 0);
  assert.throws(
    () =>
      h.run("x", (d) =>
        D.resolveReselect(d, "doran", "doran-weapon-mastery", { keep: true }, "dm"),
      ),
    /Long Rest completed/,
  );
  h.run("rest", (d) => completeLongRest(d, "doran", "2"));
  h.run("tieni", (d) =>
    D.resolveReselect(d, "doran", "doran-weapon-mastery", { keep: true }, "dm"),
  );
  assert.equal(h.slice.actors.doran.reselect[0].history.length, 2);
  // A player-defined reselectable choice on Livia (short or long rest).
  h.as("player");
  const own = h.run("add", (d) =>
    D.addReselect(
      d,
      "livia",
      {
        name: "Trucchetto del giorno",
        trigger: "short",
        options: "Luce, Mano magica, Prestidigitazione",
        chosen: "Luce",
      },
      "player",
    ),
  );
  assert.equal(own.count, 1);
  h.run("rest", (d) => completeLongRest(d, "livia", "3"));
  assert.equal(
    D.pendingReselect(h.state, "livia").length,
    1,
    "a Long Rest also counts for short triggers",
  );
  // Mira's known-form replacement from the forms domain shows in the same list.
  h.run("forms", (d) => {
    d.actors.mira.formsProfile.knownFormReplacement = { restId: "r", used: false };
  });
  assert.ok(D.pendingReselect(h.state, "mira").some((r) => r.external === "forms"));
});

// ------------------------------------------------------------------------------ hooks and privacy

test("shell hooks: the summary slot renders under the vitals; movement mode only changes a set speed", () => {
  const h = harness();
  const html = renderCharacters(h.ctx);
  const bar = html.indexOf('class="shp-bar');
  assert.ok(bar > html.indexOf("character-vitals"), "under the vitals");
  assert.ok(bar < html.indexOf("character-tabs-bar"), "above the tabs");
  h.ctx.view = { page: "characters", id: "livia", tab: "story" };
  assert.match(renderCharacters(h.ctx), /shp-bar/, "on every tab");
  // Without movementMode the effective actor is unchanged.
  const plain = getEffectiveActor({ id: "x", speed: 9, speeds: { fly: 12 } });
  assert.equal(plain.speed, 9);
  const flying = getEffectiveActor({ id: "x", speed: 9, speeds: { fly: 12 }, movementMode: "fly" });
  assert.equal(flying.speed, 12);
  const missing = getEffectiveActor({ id: "x", speed: 9, movementMode: "swim" });
  assert.equal(missing.speed, 9);
});

test("permissions and offline: view-only sheets refuse writes; a private sheet commits locally", () => {
  const h = harness({ setup: withIria });
  assert.throws(
    () =>
      h.run("x", (d) =>
        D.addModifier(d, "doran", "ac", { op: "add", value: 1, note: "x" }, "player"),
      ),
    /cannot edit/,
  );
  h.ctx.offline = true;
  assert.throws(
    () =>
      h.ctx.commit("x", (d) =>
        D.addModifier(d, "livia", "ac", { op: "add", value: 1, note: "x" }, "player"),
      ),
    /offline/i,
  );
  // Iria (private) works offline: her changes are local.
  h.ctx.view = { page: "characters", id: "iria", tab: "actions" };
  h.run("iria", (d) => D.toggleEffect(d, "iria", "bless", true, "player"), {
    local: true,
    visibility: "private",
  });
  assert.equal(D.activeRiders(h.state, "iria", "save").length, 1);
  h.ctx.offline = false;
  // Roll records of a private sheet are private.
  h.ctx.rollDie = (sides) => Math.min(10, sides);
  const record = area._test.rollNow(h.ctx, "iria", {
    kind: "save",
    subject: "int",
    mode: "digital",
  });
  assert.equal(record.visibility, "private");
  assert.equal(D.visibleRolls(h.state, "iria", "dm").length, 0);
});

// ------------------------------------------------------------------------------ review (B37-rf)

test("review: saving the speeds during Wild Shape keeps the sheet's own special speeds", () => {
  const h = harness();
  h.ctx.view = { page: "characters", id: "mira", tab: "actions" };
  h.run("swim", (d) => D.setSpeeds(d, "mira", { swim: "9" }, "player"));
  const selection = {
    profileId: "srd2024:wolf",
    tempHpChoice: "replace",
    equipment: [{ itemId: "mira-staff", disposition: "merge" }],
  };
  const preview = forms.previewWildShape(h.state, "mira", selection, "player");
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  h.run("wolf", (d) =>
    forms.applyWildShape(d, "mira", selection, "player", {
      operationId: "wolf",
      reviewKey: preview.reviewKey,
    }),
  );
  assert.ok(h.state.actors.mira.activeForm, "Mira is a wolf");
  // The dialog's speed fields are disabled in a form: only the display reaches the domain.
  h.run("speeds", (d) => D.setSpeeds(d, "mira", { display: "walk" }, "player"));
  assert.deepEqual(h.state.actors.mira.speeds, { swim: 9 }, "the canonical swim speed survives");
  assert.throws(
    () => h.run("x", (d) => D.setSpeeds(d, "mira", { fly: "18" }, "player")),
    /form/,
    "a speed change during a form is refused, not silently applied",
  );
  let body = "";
  h.ctx.dialog = (_title, html) => (body = html);
  area._test.speedsDialog(h.ctx, "mira");
  assert.match(body, /Forma attiva/, "the dialog says why the fields are locked");
});

test("review: an accepted roll that leaves the recent list is never reused nor shown as undone", () => {
  const h = harness();
  let n = 0;
  h.ctx.rollDie = () => (n++ % 20) + 1;
  const roll = () =>
    area._test.rollNow(h.ctx, "livia", { kind: "skill", subject: "stealth", mode: "digital" });
  const records = Array.from({ length: 22 }, roll);
  assert.deepEqual(
    records.map((r) => r.status),
    Array(22).fill("accepted"),
    "no roll reuses the faces of an accepted roll",
  );
  assert.deepEqual(records[21].values, [2]);
  assert.ok(
    D.visibleRolls(h.state, "livia", "player", 30).every((r) => r.live),
    "nothing was undone",
  );
  // Undo still withdraws the latest one, and the identical retry reuses its faces once.
  h.ctx.undo();
  const retry = roll();
  assert.equal(retry.status, "reused");
  assert.deepEqual(retry.values, records[21].values);
  assert.equal(roll().status, "accepted");
});

test("review: an Initiative change reaches the combat tracker's initiative roll", () => {
  const h = harness();
  assert.equal(tracker.initiativeBonus(h.state, "livia"), 2, "Dexterity +2");
  h.run("alert", (d) =>
    D.addModifier(
      d,
      "livia",
      "initiative",
      { op: "add", value: 2, note: "Allerta: competenza all'Iniziativa" },
      "player",
    ),
  );
  assert.equal(D.statValue(h.state, "livia", "initiative").total, 4);
  assert.equal(h.state.actors.livia.initiativeBonus, 4, "written where the Table reads it");
  assert.equal(tracker.initiativeBonus(h.state, "livia"), 4);
  const mod = h.slice.actors.livia.mods.initiative[0];
  h.run("remove", (d) => D.removeModifier(d, "livia", "initiative", mod.id, "player"));
  assert.equal(h.state.actors.livia.initiativeBonus, undefined, "removal leaves no trace");
  assert.equal(tracker.initiativeBonus(h.state, "livia"), 2);
});

test("review: a view-only sheet offers no favourite stars that would only refuse", () => {
  const h = harness();
  h.ctx.view = { page: "characters", id: "doran", tab: "actions" };
  assert.equal(h.ctx.canControl(h.state.actors.doran), false, "the player only views Doran");
  const doran = getEffectiveActor(h.state.actors.doran);
  const derived = area._test.renderDerived(h.ctx, doran);
  assert.doesNotMatch(derived, /data-shp="fav"/);
  assert.doesNotMatch(area._test.renderBar(h.ctx, doran), /Tocca ☆/);
  // Values read as values, not as inert buttons (D&D Beyond's read-only sheet).
  assert.doesNotMatch(derived, /data-shp="roll"/);
  assert.match(derived, /class="shp-value is-static"/);
  const actions = area._test.renderActions(h.ctx, doran);
  assert.doesNotMatch(actions, /<button[^>]* disabled/, "no disabled use or roll buttons");
  // Doran's own favourites (set by the DM) read as a list for the viewing player.
  h.as("dm").run("fav", (d) =>
    D.toggleFavorite(d, "doran", { kind: "skill", id: "athletics" }, "dm"),
  );
  h.as("player");
  const bar = area._test.renderBar(h.ctx, getEffectiveActor(h.state.actors.doran));
  assert.match(bar, /shp-fav-use is-static/);
  assert.doesNotMatch(bar, /data-shp="use"/);
  h.ctx.view = { page: "characters", id: "livia", tab: "actions" };
  const livia = getEffectiveActor(h.state.actors.livia);
  assert.match(area._test.renderDerived(h.ctx, livia), /data-shp="fav"/);
});

test("review: a custom reselectable choice keeps distinct option ids for any name", () => {
  const h = harness();
  const row = h.run("add", (d) =>
    D.addReselect(
      d,
      "livia",
      { name: "Glifo", options: "Città, Citt, ✦, ☾", chosen: "✦, Città" },
      "player",
    ),
  );
  assert.equal(new Set(row.options.map((o) => o.id)).size, 4, "no two options share an id");
  assert.deepEqual(
    row.chosen.map((id) => row.options.find((o) => o.id === id)?.name.it),
    ["✦", "Città"],
  );
});

test("review: the rest reminder names the rest and how many choices can change", () => {
  const h = harness();
  h.run("add", (d) =>
    D.addReselect(
      d,
      "livia",
      { name: "Trucchetti", trigger: "short", changeLimit: 2, options: "A, B, C", chosen: "A, B" },
      "player",
    ),
  );
  h.run("short rest", (d) => {
    d.restTime ??= {};
    d.restTime.rests ??= [];
    d.restTime.rests.push({
      id: "rest-short",
      participants: [
        { actorId: "livia", benefits: [{ id: "benefit-short", kind: "short", applied: true }] },
      ],
    });
  });
  const note = h.ctx.registry.notifications(h.ctx).find((n) => /Trucchetti/.test(n.title?.it));
  assert.ok(note, "the player gets the reminder");
  assert.match(note.body.it, /riposo breve o lungo/);
  assert.match(note.body.it, /2 scelte/);
  assert.match(note.body.en, /Short or Long Rest/);
  assert.match(note.body.en, /2 choices/);
});

test("review: an active attack effect is named in the Table's attack detail", () => {
  const h = harness();
  h.run("combat", (d) => {
    d.combat.active = true;
    d.combat.turn = 0;
  });
  const reasons = () =>
    previewAction(h.state, "livia", "fire-bolt", { targetIds: ["goblin-2"] }, "player").rollReasons;
  assert.equal(
    reasons().some((r) => r.code?.startsWith("sheet-plus")),
    false,
  );
  h.run("bless", (d) => D.toggleEffect(d, "livia", "bless", true, "player"));
  const row = reasons().find((r) => r.code === "sheet-plus-rider-bless");
  assert.equal(row?.mode, "info");
  assert.match(row.name.it, /Benedizione \+1d4/);
  assert.match(row.name.en, /Bless \+1d4/);
  h.run("off", (d) => D.toggleEffect(d, "livia", "bless", false, "player"));
  assert.equal(
    reasons().some((r) => r.code?.startsWith("sheet-plus")),
    false,
  );
});

test("review: a defense added to a compendium creature keeps its stat block's defenses at the Table", () => {
  const withSkeleton = (state) => {
    state.actors.skel = {
      ...structuredClone(state.actors["goblin-1"]),
      id: "skel",
      name: "Scheletro",
      compendiumRef: { id: "srd2024:creature:skeleton" },
    };
  };
  const h = harness({ role: "dm", setup: withSkeleton });
  h.ctx.view = { page: "characters", id: "skel", tab: "actions" };
  assert.equal(damage.defensesOf(h.state, "skel").origin, "block");
  // The sheet lists what the Table applies: the SRD block's immunity and vulnerability.
  const listed = D.collapsedDefenses(h.state, "skel").map((d) => `${d.kind}:${d.target}`);
  assert.ok(listed.includes("immunity:poison"), listed.join());
  assert.ok(listed.includes("vulnerability:bludgeoning"), listed.join());
  const row = h.run("fire", (d) =>
    D.addDefense(
      d,
      "skel",
      { kind: "resistance", target: "fire", sourceKind: "spell", sourceName: "Protezione" },
      "dm",
    ),
  );
  const poison = D.collapsedDefenses(h.state, "skel").find((d) => d.target === "poison");
  assert.equal(poison.sources[0].kind, "block", "still labelled as the stat block's");
  assert.equal(poison.sources[0].block?.it, "Scheletro");
  const atTable = damage.defensesOf(h.state, "skel");
  assert.deepEqual(
    [atTable.resistances, atTable.immunities, atTable.vulnerabilities],
    [["fire"], ["poison"], ["bludgeoning"]],
    "the block's defenses survive the sheet's addition",
  );
  h.run("remove", (d) => D.removeDefense(d, "skel", row.id, "dm"));
  assert.equal(h.state.actors.skel.damageDefenses, undefined, "no trace left on the actor");
  assert.equal(damage.defensesOf(h.state, "skel").origin, "block", "the stat block applies again");
  // With the DM's own record (damage tray, B33) that record applies: the sheet says so.
  h.run("record", (d) => damage.recordDefenses(d, "skel", { resistances: ["cold"] }, "dm"));
  const cold = D.collapsedDefenses(h.state, "skel").find((d) => d.target === "cold");
  assert.equal(cold.sources[0].kind, "dm-record");
  let body = "";
  h.ctx.dialog = (_title, html) => (body = html);
  area._test.defensesDialog(h.ctx, "skel");
  assert.match(body, /registrate dal DM nel vassoio dei danni/);
});
