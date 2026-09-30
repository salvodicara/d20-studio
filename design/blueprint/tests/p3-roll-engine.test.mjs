// P3 fix package (PG-23, PG-47, PG-48): one D20 Test engine behind every clickable number.
// The same check rolled from the sheet list (sheet-plus-domain recordRoll), the dice tray
// and the Table tray (dice-tray rollNumber, the same handler both panels bind) and read by
// the quick bar gives the same modifier, mode, conditions and riders. Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as D from "../sheet-plus-domain.mjs";
import * as trayDomain from "../dice-tray-domain.mjs";
import * as tray from "../dice-tray.mjs";
import { checkBonus } from "../quickbar-domain.mjs";

const scripted = (...values) => {
  const queue = [...values];
  return (sides) => {
    const value = queue.shift();
    assert.ok(Number.isInteger(value), `No scripted face left for a d${sides}`);
    assert.ok(value >= 1 && value <= sides, `Scripted face ${value} outside d${sides}`);
    return value;
  };
};
function withSheet(state) {
  state.ext ??= {};
  state.ext[D.ID] = D.seedSlice(state);
  state.ext[D.ROLLS] = D.emptyRolls();
  state.ext["dice-tray"] = trayDomain.seedSlice();
  return state;
}
function sheetRoll(state, input, die) {
  return D.recordRoll(state, "livia", { mode: "digital", die, ...input }, "player");
}
function trayHarness(setup, die) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const store = createStore({ storage });
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  registry.use("dice-tray", tray.register);
  registry.initState(store.state);
  setup?.(store.state);
  const ctx = {
    get state() {
      return store.state;
    },
    role: "player",
    lang: "it",
    offline: false,
    view: { page: "table", id: "", tab: "" },
    registry,
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    icon: () => "",
    rollDie: die,
    toast() {},
    dialog() {},
    closeDialog() {},
    canControl: () => true,
    commit(label, mutate, options = {}) {
      store.commit(label, mutate, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      return { applied: true, persisted: true };
    },
    render() {},
  };
  registry.attach(ctx);
  return { ctx, store, last: () => store.state.ext["dice-tray"].rolls.at(-1) };
}

test("PG-23: Poisoned Athletics rolls 2d20 keep-lowest from the sheet list, the dice tray and the Table tray", () => {
  const poison = (s) => {
    s.actors.livia.conditions = ["poisoned"];
  };
  // Sheet list: the player leaves «Normale»; the engine adds the condition's Disadvantage.
  const s = withSheet(createInitialState());
  poison(s);
  const sheet = sheetRoll(s, { kind: "skill", subject: "athletics" }, scripted(16, 7));
  assert.equal(sheet.rollMode, "disadvantage");
  assert.equal(sheet.chosenMode, "normal");
  assert.equal(sheet.natural, 7);
  assert.equal(sheet.conditionReasons.disadvantage[0].conditionId, "poisoned");
  // The log card strikes the dropped d20 and names the reason.
  const log = D.logRollOf(sheet);
  assert.deepEqual(log.kept, [false, true]);
  assert.match(log.formula, /^2d20kl1/);
  assert.ok(log.notes.some((n) => /Avvelenato/.test(n.it) && /Poisoned/.test(n.en)));
  // Dice tray and Table tray: the same handler (rollNumber) behind both lists.
  for (const where of ["sheet section", "Table tray"]) {
    const h = trayHarness(poison, scripted(16, 7));
    tray.rollNumber(h.ctx, { kind: "skill", skill: "athletics", actorId: "livia" });
    const r = h.last();
    assert.equal(r.rollMode, "disadvantage", where);
    assert.equal(r.natural, 7, where);
    assert.deepEqual(
      r.groups[0].faces.map((f) => f.kept),
      [false, true],
      where,
    );
    assert.equal(r.total, sheet.total, `${where}: same total as the sheet list`);
    const event = trayDomain.rollEvent(r);
    assert.match(event.formula, /^2d20kl/);
    assert.deepEqual(event.kept, [false, true]);
  }
});

test("PG-23: Exhaustion 2 shows and rolls the INT save at +1 everywhere", () => {
  const s = withSheet(createInitialState());
  s.actors.livia.exhaustion = 2;
  // Shown: the sheet list, the favourites strip and the quick bar read the same total.
  const stat = D.statValue(s, "livia", "save:int");
  assert.equal(stat.total, 1);
  assert.deepEqual(
    stat.conditionParts.map((p) => [p.label.it, p.value]),
    [["Indebolimento 2", -4]],
  );
  assert.equal(checkBonus(s, "livia", "int", "save"), 1);
  D.toggleFavorite(s, "livia", { kind: "save", id: "int" }, "player");
  assert.equal(D.resolveFavorites(s, "livia").find((f) => f.ref.id === "int")?.value, 1);
  // The written sheet field keeps the base: the combat engine adds Exhaustion itself.
  assert.notEqual(s.actors.livia.savingThrows?.int, 1);
  // Rolled: sheet list, dice tray and requests use the same +1 with the part named.
  const profile = D.rollProfile(s, "livia", "save", "int");
  assert.equal(profile.modifier, 1);
  assert.ok(profile.parts.some((p) => p.label.it === "Indebolimento 2" && p.value === -4));
  const rolled = sheetRoll(s, { kind: "save", subject: "int" }, scripted(10));
  assert.equal(rolled.total, 11);
  assert.equal(trayDomain.testModifier(s, "livia", { kind: "save", ability: "int" }).modifier, 1);
  const h = trayHarness((st) => {
    st.actors.livia.exhaustion = 2;
  }, scripted(10));
  tray.rollNumber(h.ctx, { kind: "save", ability: "int", actorId: "livia" });
  assert.equal(h.last().total, 11);
  assert.match(
    trayDomain.breakdown({ ...h.last(), readable: true }, "it"),
    /− 4 \(Indebolimento 2\)/,
  );
  // Plain ability checks and Initiative are D20 Tests too.
  assert.equal(
    D.rollProfile(s, "livia", "check", "int").modifier,
    D.abilityMod(s.actors.livia.abilities.int) - 4,
  );
});

test("PG-47: Bless adds 1d4 on the sheet list, the dice tray and the Table tray, named in the result", () => {
  const bless = (s) => D.toggleEffect(s, "livia", "bless", true, "player");
  const s = withSheet(createInitialState());
  bless(s);
  const sheet = sheetRoll(s, { kind: "save", subject: "int" }, scripted(12, 3));
  assert.equal(sheet.riderTotal, 3);
  assert.equal(sheet.total, 12 + 5 + 3);
  const log = D.logRollOf(sheet);
  assert.equal(log.faces[1].label.it, "Benedizione");
  // Tray: the d4 is rolled with the save and the breakdown names it.
  const h = trayHarness((st) => {
    st.ext[D.ID] = D.seedSlice(st);
    bless(st);
  }, scripted(12, 3));
  tray.rollNumber(h.ctx, { kind: "save", ability: "int", actorId: "livia" });
  const r = h.last();
  assert.equal(r.total, sheet.total);
  assert.equal(r.riders[0].id, "bless");
  assert.match(trayDomain.breakdown({ ...r, readable: true }, "it"), /\+ \[3\] \(Benedizione\)/);
  assert.match(trayDomain.breakdown({ ...r, readable: true }, "en"), /\+ \[3\] \(Bless\)/);
  const event = trayDomain.rollEvent(r);
  assert.equal(event.faces[1].label.en, "Bless");
  // Bless does not touch ability checks (SRD: attack rolls and saving throws).
  const check = trayHarness((st) => {
    st.ext[D.ID] = D.seedSlice(st);
    bless(st);
  }, scripted(9));
  tray.rollNumber(check.ctx, { kind: "skill", skill: "arcana", actorId: "livia" });
  assert.equal(check.last().riders, undefined);
  // Bane subtracts its die.
  const bane = trayHarness((st) => {
    st.ext[D.ID] = D.seedSlice(st);
    D.toggleEffect(st, "livia", "bane", true, "player");
  }, scripted(12, 4));
  tray.rollNumber(bane.ctx, { kind: "save", ability: "int", actorId: "livia" });
  assert.equal(bane.last().total, 12 + 5 - 4);
});

test("PG-23: conditions cancel a chosen Advantage and physical faces must match the real mode", () => {
  const s = withSheet(createInitialState());
  s.actors.livia.conditions = ["poisoned"];
  const cancelled = sheetRoll(
    s,
    { kind: "skill", subject: "athletics", rollMode: "advantage" },
    scripted(18),
  );
  assert.equal(cancelled.rollMode, "normal");
  // A physical roll with one d20 where Poisoned asks two is refused with the way out.
  assert.throws(
    () =>
      D.recordRoll(
        s,
        "livia",
        { kind: "skill", subject: "athletics", mode: "physical", faces: [14] },
        "player",
      ),
    (error) => /Svantaggio/.test(error.it) && /Disadvantage/.test(error.en),
  );
  const physical = D.recordRoll(
    s,
    "livia",
    {
      kind: "skill",
      subject: "athletics",
      mode: "physical",
      rollMode: "disadvantage",
      faces: [14, 6],
    },
    "player",
  );
  assert.equal(physical.natural, 6);
  // Paralyzed fails Strength saves: no roll, the reason is named (as the tray does).
  s.actors.livia.conditions = ["paralyzed"];
  assert.throws(
    () => sheetRoll(s, { kind: "save", subject: "str" }, scripted(10)),
    (error) => /Paralizzato/.test(error.it),
  );
});

test("PG-48: the character's roll policy applies on the sheet and in the tray", () => {
  const s = withSheet(createInitialState());
  s.ext["dice-tray"].policies = { livia: { d20: "advantage", audience: "gm" } };
  const r = sheetRoll(s, { kind: "skill", subject: "arcana" }, scripted(4, 15));
  assert.equal(r.rollMode, "advantage");
  assert.equal(r.natural, 15);
  assert.equal(r.audience, "gm");
  const log = D.logRollOf(r);
  assert.equal(log.visibility, "private");
  assert.deepEqual([log.owner, log.controller], ["player", "dm"]);
  assert.equal(D.canReadRoll(r, "dm"), true);
  // An explicit choice wins over the policy.
  const explicit = sheetRoll(
    s,
    { kind: "skill", subject: "arcana", rollMode: "disadvantage" },
    scripted(4, 15),
  );
  assert.equal(explicit.rollMode, "disadvantage");
  // The tray reads the same policy for the character.
  const h = trayHarness((st) => {
    st.ext["dice-tray"].policies = { livia: { d20: "disadvantage", audience: "self" } };
  }, scripted(17, 3));
  tray.rollNumber(h.ctx, { kind: "skill", skill: "arcana", actorId: "livia" });
  assert.equal(h.last().rollMode, "disadvantage");
  assert.equal(h.last().audience, "self");
  // Policy commands: set and read back, per character.
  const slice = trayDomain.seedSlice();
  const st = createInitialState();
  trayDomain.setPolicy(slice, st, "livia", { d20: "ask", audience: "blind" }, "player");
  assert.deepEqual(slice.policies.livia, { d20: "ask", audience: "blind", autoDamage: false });
  assert.throws(() => trayDomain.setPolicy(slice, st, "goblin-1", { d20: "ask" }, "player"));
});

test("PG-48: «critico automatico» rolls a sheet attack's damage, dice doubled on a natural 20", () => {
  const s = withSheet(createInitialState());
  s.ext["dice-tray"].policies = { livia: { d20: "normal", audience: "public", autoDamage: true } };
  const hit = sheetRoll(s, { kind: "attack", subject: "fire-bolt" }, scripted(20, 7, 4));
  assert.equal(hit.natural, 20);
  assert.deepEqual(hit.damage.values, [7, 4]);
  assert.equal(hit.damage.critical, true);
  assert.equal(hit.damage.total, 11);
  const staff = sheetRoll(s, { kind: "attack", subject: "quarterstaff" }, scripted(9, 5));
  assert.equal(staff.damage.critical, false);
  assert.equal(staff.damage.total, 5 + D.abilityMod(s.actors.livia.abilities.str));
  assert.ok(D.logRollOf(staff).damage);
  // Without the policy the sheet rolls only the attack.
  s.ext["dice-tray"].policies = {};
  assert.equal(
    sheetRoll(s, { kind: "attack", subject: "fire-bolt" }, scripted(20)).damage,
    undefined,
  );
});
