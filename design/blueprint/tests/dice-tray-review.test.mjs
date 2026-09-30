// B34 dice tray — independent review fixes (reviewer-fixer, 25/09/2026). Each test names
// the finding it covers (changes/interview-01/blueprint-dice-tray-evidence.md, «Review and
// fixes»). Real store, real registry, a small fake DOM; synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { projectAttempts, resolveRoll } from "../combat.mjs";
import * as domain from "../dice-tray-domain.mjs";
import * as requests from "../roll-requests.mjs";
import * as tray from "../dice-tray.mjs";

afterEach(() => tray.resetTrayUI());

const scripted = (...values) => {
  const queue = [...values];
  return (sides) => {
    const value = queue.shift();
    assert.ok(Number.isInteger(value), `No scripted face left for a d${sides}`);
    assert.ok(value >= 1 && value <= sides, `Scripted face ${value} outside d${sides}`);
    return value;
  };
};
const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => {
    assert.match(error.it ?? error.message, pattern);
    return true;
  });
/** Iria: a player's personal sheet (visibility "private"), as the character library seeds it. */
function withIria(state) {
  state.actors.iria = {
    ...structuredClone(state.actors.livia),
    id: "iria",
    name: "Iria",
    visibility: "private",
    owner: "player",
  };
  return state;
}
const form = (values) => ({ get: (name) => values[name] ?? null, getAll: () => [] });

// ---------------------------------------------------------------- fake DOM + harness

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
function fakeRoot(html) {
  const nodes = [
    ...html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
    ...[...html.matchAll(/<(form|p)\b([^>]*)>/g)].map((m) => [m[0], m[1], m[2], ""]),
  ].map(([, tag, attrsText, inner]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
    );
    const events = {};
    return {
      attrs,
      events,
      inner,
      tagName: tag.toUpperCase(),
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      value: attrs.value ?? "",
      checked: "checked" in attrs,
      disabled: "disabled" in attrs,
      addEventListener(type, fn) {
        events[type] = fn;
      },
      setAttribute(k, v) {
        attrs[k] = v;
      },
      removeAttribute(k) {
        delete attrs[k];
      },
      closest: () => null,
      focus() {},
    };
  });
  const root = {
    html,
    nodes,
    querySelectorAll(selector) {
      const checked = selector.endsWith(":checked");
      const clean = checked ? selector.slice(0, -8) : selector;
      if (!/^(\[[^\]]+\])+$/.test(clean)) return [];
      const parts = [...clean.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].map((m) => [m[1], m[2]]);
      return nodes.filter(
        (n) =>
          (!checked || n.checked) &&
          parts.every(([k, v]) => k in n.attrs && (v === undefined || n.attrs[k] === v)),
      );
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
  };
  for (const n of nodes)
    if (n.attrs["data-dtray-request-form"] !== undefined)
      Object.assign(n, {
        querySelectorAll: root.querySelectorAll.bind(root),
        querySelector: root.querySelector.bind(root),
      });
  return root;
}
const node = (root, selector) => {
  const found = root.querySelector(selector);
  assert.ok(found, `No ${selector}`);
  return found;
};
const click = (root, selector, extra = {}) => {
  const n = node(root, selector);
  (n.onclick ?? n.events.click)({
    target: n,
    currentTarget: n,
    preventDefault() {},
    ...extra,
  });
};
const change = (root, selector, value) => {
  const n = node(root, selector);
  if (n.attrs.type === "checkbox") n.checked = value !== false;
  else if (n.attrs.type === "radio") n.checked = true;
  else n.value = value;
  (n.events.change ?? n.events.input)({ target: n });
};

function harness({ role = "player", die = null, iria = false } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const store = createStore({ storage });
  if (iria) withIria(store.state);
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  assert.equal(registry.use("dice-tray", tray.register).status, "built");
  registry.initState(store.state);
  const emitted = [];
  const errors = [];
  const toasts = [];
  registry.on("roll-accepted", (payload) => emitted.push(payload));
  const panel = () => registry.get("table-panel", "dice-tray", ctx);
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang: "it",
    offline: false,
    view: { page: "table", id: "", tab: "" },
    registry,
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    icon: () => "",
    rollDie: die,
    toast(text, error) {
      (error ? errors : toasts).push(text);
    },
    dialog(title, body, options = {}) {
      this.dialogState = { title, body, options };
    },
    closeDialog() {
      this.dialogState = null;
    },
    canControl: () => true,
    commit(label, mutate, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), { it, en: "You are offline." });
      }
      const before = store.state;
      store.commit(label, mutate, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      this.render();
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      this.render();
    },
    render() {
      const scene = store.state.scenes.find((s) => s.id === store.state.activeSceneId);
      this.html = panel().render(this, { scene, selectedActorId: this.selected ?? "livia" });
      this.root = fakeRoot(this.html);
      panel().bind(this.root, this, {});
    },
  };
  registry.attach(ctx);
  ctx.render();
  return {
    ctx,
    store,
    registry,
    emitted,
    errors,
    toasts,
    slice: () => store.state.ext["dice-tray"],
    log: () => store.state.log.at(-1),
  };
}
/** Submits the open dialog like the shell: a thrown refusal keeps it open. */
function submitDialog(ctx, values) {
  const { options } = ctx.dialogState;
  const result = options.onSubmit(form(values));
  if (result !== false) ctx.dialogState = null;
}

// ---------------------------------------------------------------- P1 privacy

test("review P1-1: a personal sheet's roll is never announced to the DM, not even its name", () => {
  const s = withIria(createInitialState());
  const slice = domain.seedSlice();
  const r = domain.recordRoll(
    slice,
    s,
    { formula: "1d20", actorId: "iria", audience: "public" },
    "player",
    { draw: scripted(9), announce: true, online: true },
  );
  assert.deepEqual([r.audience, r.forced, r.announced], ["self", true, false]);
  assert.equal(domain.projectRoll(r, "dm", s), null, "the DM sees no trace");
  assert.deepEqual(domain.recentRolls(slice, s, "dm"), []);
  // Through the Dice tab: the log line is the player's private line, never "Iria · …" shared.
  const h = harness({ die: scripted(9), iria: true });
  change(h.ctx.root, "[data-dtray-actor]", "iria");
  node(h.ctx.root, "[data-dtray-form]").onsubmit({ preventDefault() {} });
  assert.equal(h.slice().rolls.at(-1).announced, false);
  assert.equal(h.log().visibility, "private");
  h.ctx.role = "dm";
  h.ctx.render();
  assert.doesNotMatch(h.ctx.html, /Iria/, "the DM's tray never names the personal sheet");
});

test("review P1-2: reveals go to characters a player plays; never a personal sheet or the DM's own", () => {
  const s = withIria(createInitialState());
  assert.deepEqual(
    domain
      .revealTargets(s)
      .map((a) => a.id)
      .sort(),
    ["livia", "mira"],
  );
  const slice = domain.seedSlice();
  const r = domain.recordRoll(slice, s, { formula: "1d20", audience: "self" }, "dm", {
    draw: scripted(13),
    announce: true,
    online: true,
  });
  refusal(
    () => domain.revealRoll(slice, s, r.id, "iria", "dm", "t"),
    /personaggio di un giocatore/,
  );
  refusal(
    () => domain.revealRoll(slice, s, r.id, "doran", "dm", "t"),
    /personaggio di un giocatore/,
  );
  domain.revealRoll(slice, s, r.id, "livia", "dm", "t");
  assert.equal(domain.canSeeResult(r, "player", s), true, "Livia's player now reads it");
  // The DM's reveal list in the tab names only those characters.
  const h = harness({ role: "dm", die: scripted(13), iria: true });
  change(h.ctx.root, '[data-dtray-audience][value="self"]', "self");
  node(h.ctx.root, "[data-dtray-form]").onsubmit({ preventDefault() {} });
  const id = h.slice().rolls.at(-1).id;
  const options = node(h.ctx.root, `[data-dtray-reveal-target="${id}"]`).inner;
  assert.match(options, /value="livia"/);
  assert.match(options, /value="mira"/);
  assert.doesNotMatch(options, /value="iria"|value="doran"/);
});

// ---------------------------------------------------------------- P2 rules and coherence

test("review P2-3: saves add the first class's proficiency and skills use the recorded value (as the sheet)", () => {
  const s = createInitialState();
  // Livia is a Wizard (INT, WIS saves), Doran a Fighter (STR, CON): SRD 5.2.1 class tables.
  const int = domain.testModifier(s, "livia", { kind: "save", ability: "int" });
  assert.equal(int.modifier, 5);
  assert.deepEqual(
    int.sources.map((m) => [m.label.it, m.value]),
    [
      ["Intelligenza", 3],
      ["Competenza (Mago)", 2],
    ],
  );
  assert.equal(domain.testModifier(s, "livia", { kind: "save", ability: "wis" }).modifier, 3);
  assert.equal(domain.testModifier(s, "livia", { kind: "save", ability: "dex" }).modifier, 2);
  assert.equal(domain.testModifier(s, "doran", { kind: "save", ability: "str" }).modifier, 2);
  assert.equal(domain.testModifier(s, "doran", { kind: "save", ability: "con" }).modifier, 4);
  // A recorded save still wins (Mira's sheet), and so does a recorded skill modifier.
  assert.equal(domain.testModifier(s, "mira", { kind: "save", ability: "wis" }).modifier, 5);
  s.actors.livia.skillModifiers = { stealth: 7 };
  const stealth = domain.testModifier(s, "livia", { kind: "skill", skill: "stealth" });
  assert.equal(stealth.modifier, 7);
  assert.match(stealth.sources[0].label.it, /scheda/);
  // Requests read the same numbers.
  requests.createRequest(s, { kind: "save", ability: "con", actorIds: ["doran"] }, "dm", {
    id: "g1",
  });
  assert.equal(s.combatAttempts.at(-1).requests[0].modifier, 4);
});

test("review P2-4: a Heroic Inspiration reroll of a DM creature's request stays private", () => {
  const h = harness({ role: "dm", die: scripted(5, 17) });
  const { ctx } = h;
  click(ctx.root, '[data-dtray-section="requests"]');
  for (const box of ctx.root.querySelectorAll("[data-dtray-rq-target]")) box.checked = false;
  change(ctx.root, '[data-dtray-rq-target][value="doran"]', true);
  node(ctx.root, "[data-dtray-request-form]").onsubmit({ preventDefault() {} });
  const attempt = h.store.state.combatAttempts.find((a) => a.kind === "roll-request");
  click(ctx.root, `[data-dtray-answer="${attempt.requests[0].id}"]`);
  assert.equal(h.log().visibility, "private", "the answer is private (core rule)");
  change(ctx.root, '[data-dtray-inspiration="doran"]', true);
  click(ctx.root, `[data-dtray-request-reroll="${attempt.requests[0].id}"]`);
  submitDialog(ctx, { index: "0", mode: "digital" });
  assert.match(h.log().label, /Ispirazione eroica spesa/);
  assert.equal(h.log().visibility, "private", "the reroll does not reveal Doran's result");
  const event = h.emitted.at(-1).roll;
  assert.deepEqual([event.kind, event.visibility, event.owner], ["reroll", "private", "dm"]);
});

test("review P2-5: rolling from the journal text answers the open journal request", () => {
  const h = harness({ role: "dm", die: scripted(11, 4) });
  const { ctx, store } = h;
  const ref = "save:dex:13";
  ctx.commit("request", (draft) =>
    requests.createRequest(draft, { ...requests.parseRollRef(ref), actorIds: ["livia"] }, "dm", {
      id: "j1",
      now: "t0",
      origin: { kind: "journal", ref },
    }),
  );
  ctx.role = "player";
  ctx.render();
  tray.rollFromEmbed(ctx, ref, "livia");
  const request = store.state.combatAttempts.find((a) => a.id === "roll-request:j1:livia")
    .requests[0];
  assert.deepEqual([request.status, request.total, request.mode], ["resolved", 13, "digital"]);
  assert.equal(h.slice().rolls.length, 0, "no second, unrelated roll");
  // Without an open request the text still rolls in place, remembering where it came from.
  tray.rollFromEmbed(ctx, ref, "mira");
  const roll = h.slice().rolls.at(-1);
  assert.deepEqual([roll.actorId, roll.kind, roll.dc, roll.origin.ref], ["mira", "save", 13, ref]);
});

test("review P2-6: rolls in place ask the physical faces when the dice are physical", () => {
  const h = harness({ die: scripted(3) });
  const { ctx, registry } = h;
  change(ctx.root, '[data-dtray-mode][value="physical"]', "physical");
  assert.equal(registry.getSetting(ctx, "dice-tray.dice"), "physical", "the choice is remembered");
  const before = h.slice().rolls.length;
  click(ctx.root, '[data-dtray-roll][data-kind="save"][data-ability="dex"]');
  assert.equal(h.slice().rolls.length, before, "nothing rolled before the faces");
  assert.match(ctx.dialogState.title, /Facce del dado fisico/);
  assert.match(ctx.dialogState.body, /name="face-0"[^>]*max="20"/);
  assert.doesNotMatch(ctx.dialogState.body, /name="face-1"/);
  assert.throws(() => ctx.dialogState.options.onSubmit(form({ "face-0": "21" })));
  assert.equal(h.slice().rolls.length, before, "a wrong face records nothing");
  submitDialog(ctx, { "face-0": "12" });
  const r = h.slice().rolls.at(-1);
  assert.deepEqual([r.mode, r.values, r.total, r.kind], ["physical", [12], 14, "save"]);
  // Advantage asks both d20s.
  tray.rollNumber(
    ctx,
    { kind: "skill", skill: "stealth", actorId: "livia" },
    { rollMode: "advantage" },
  );
  assert.match(ctx.dialogState.body, /name="face-1"/);
  submitDialog(ctx, { "face-0": "4", "face-1": "15" });
  assert.deepEqual(h.slice().rolls.at(-1).values, [4, 15]);
  assert.equal(h.slice().rolls.at(-1).natural, 15);
  // PG-23: the sheet's «Tiri» section no longer repeats the saves and skills (the sheet's
  // own list rolls them through the one engine); it keeps inspiration and a free formula.
  const section = registry.get("sheet-section", "dice-tray-sheet", ctx, ctx.state.actors.livia);
  const html = section.render(ctx, ctx.state.actors.livia);
  assert.doesNotMatch(html, /data-dtray-roll/);
  assert.match(html, /data-dtray-sheet-formula/);
  assert.match(html, /data-dtray-inspiration/);
  // Digital again: numbers roll at once.
  change(ctx.root, '[data-dtray-mode][value="digital"]', "digital");
  assert.equal(registry.getSetting(ctx, "dice-tray.dice"), "digital");
  ctx.dialogState = null;
  click(ctx.root, '[data-dtray-roll][data-kind="check"][data-ability="str"]');
  assert.equal(ctx.dialogState, null);
  assert.deepEqual([h.slice().rolls.at(-1).mode, h.slice().rolls.at(-1).values], ["digital", [3]]);
});

test("review P2-7: closing a request withdraws its pending rolls from the queue; reopening restores them", () => {
  const s = createInitialState();
  const slice = domain.seedSlice();
  requests.createRequest(
    s,
    { kind: "save", ability: "dex", dc: 13, actorIds: ["livia", "doran"] },
    "dm",
    {
      id: "g1",
    },
  );
  const [liv, dor] = ["livia", "doran"].map((id) => s.combatAttempts.find((a) => a.actorId === id));
  requests.answerRequest(s, dor.id, dor.requests[0].id, [15], "dm");
  requests.closeRequest(slice, "g1", "dm", s);
  assert.deepEqual(
    [liv.requests[0].status, liv.status, dor.requests[0].status],
    ["expired", "resolved", "resolved"],
  );
  const pending = (role) =>
    projectAttempts(s, role).filter((a) => (a.requests ?? []).some((r) => r.status === "pending"))
      .length;
  assert.equal(pending("player"), 0, "the bell and «Tiri e risultati» stop asking");
  refusal(() => resolveRoll(s, liv.id, liv.requests[0].id, [10], "player"), /non è più/);
  const row = requests.requestGroups(s, slice, "player")[0].rows.find((r) => r.actorId === "livia");
  assert.deepEqual([row.status, row.canRoll], ["expired", false]);
  requests.reopenRequest(slice, "g1", "dm", s);
  assert.deepEqual([liv.requests[0].status, liv.status], ["pending", "pending"]);
  assert.equal(dor.requests[0].status, "resolved", "an answered roll stays answered");
  requests.answerRequest(s, liv.id, liv.requests[0].id, [10], "player");
  assert.equal(liv.requests[0].total, 12);
});

// ---------------------------------------------------------------- P3

test("review P3-8: roll policy «always advantage/disadvantage» (Beyond20, Roll20 Always); an explicit choice wins", () => {
  const h = harness({ die: scripted(6, 14, 9, 2, 11, 3) });
  const { ctx, registry } = h;
  registry.setSetting(ctx, "dice-tray.advantage", "advantage");
  click(ctx.root, '[data-dtray-roll][data-kind="save"][data-ability="dex"]');
  assert.deepEqual(
    [h.slice().rolls.at(-1).rollMode, h.slice().rolls.at(-1).natural],
    ["advantage", 14],
  );
  registry.setSetting(ctx, "dice-tray.advantage", "disadvantage");
  click(ctx.root, '[data-dtray-roll][data-kind="save"][data-ability="dex"]');
  assert.deepEqual(
    [h.slice().rolls.at(-1).rollMode, h.slice().rolls.at(-1).natural],
    ["disadvantage", 2],
  );
  click(ctx.root, '[data-dtray-roll][data-kind="save"][data-ability="dex"]', { shiftKey: true });
  assert.equal(h.slice().rolls.at(-1).rollMode, "advantage", "Shift+click overrides the policy");
});

test("review P3-11: a request reroll no longer counts once the original faces are corrected", () => {
  const store = createStore({ storage: { getItem: () => null, setItem() {} } });
  const slice = domain.seedSlice();
  const save = { kind: "save", ability: "dex", dc: 13, actorIds: ["livia"] };
  store.commit("request", (d) => requests.createRequest(d, save, "dm", { id: "g1" }), "dm");
  const id = store.state.combatAttempts[0].id;
  const requestId = store.state.combatAttempts[0].requests[0].id;
  store.commit(
    "answer",
    (d) => requests.answerRequest(d, id, requestId, [9], "player", { mode: "physical" }),
    "player",
  );
  domain.setInspiration(slice, store.state, "livia", true, "player", "t");
  requests.rerollRequest(slice, store.state, id, requestId, 0, "player", { face: 15 });
  let row = requests.requestGroups(store.state, slice, "player")[0].rows[0];
  assert.deepEqual([row.total, row.reroll?.to], [17, 15]);
  // The die was read wrong: Undo, then the core correction records 19 with a reason.
  store.undo("player");
  store.commit(
    "correct",
    (d) => resolveRoll(d, id, requestId, [19], "player", { correctionReason: "letto male" }),
    "player",
  );
  row = requests.requestGroups(store.state, slice, "player")[0].rows[0];
  assert.deepEqual(
    [row.total, row.reroll, row.success],
    [21, null, true],
    "the corrected faces decide, not the reroll of the old 9",
  );
  assert.equal(row.rerolled, true, "no second reroll is offered for the same request");
  // Reapplying the same faces keeps the reroll valid (it rerolled exactly those faces).
  const other = createInitialState();
  requests.createRequest(other, save, "dm", { id: "g2" });
  const a = other.combatAttempts[0];
  requests.answerRequest(other, a.id, a.requests[0].id, [9], "player");
  const s2 = domain.seedSlice();
  domain.setInspiration(s2, other, "livia", true, "player", "t");
  requests.rerollRequest(s2, other, a.id, a.requests[0].id, 0, "player", { face: 15 });
  assert.equal(requests.requestGroups(other, s2, "player")[0].rows[0].total, 17);
});

test("review P2-12: conditions shape the D20 Test like the core's saves (Exhaustion, Restrained, Poisoned, automatic failure)", () => {
  const s = createInitialState();
  const slice = domain.seedSlice();
  // Exhaustion 1: −2 on every D20 Test, named among the modifier's sources.
  s.actors.livia.exhaustion = 1;
  const dex = domain.testModifier(s, "livia", { kind: "save", ability: "dex" });
  assert.equal(dex.modifier, 0);
  assert.deepEqual(dex.sources.at(-1).value, -2);
  assert.equal(domain.testModifier(s, "livia", { kind: "skill", skill: "stealth" }).modifier, 0);
  delete s.actors.livia.exhaustion;
  // Restrained: Disadvantage on Dexterity saves; an Advantage cancels it (SRD).
  s.actors.livia.conditions = ["restrained"];
  const roll = (raw) =>
    domain.recordRoll(slice, s, { actorId: "livia", ...raw }, "player", {
      draw: scripted(15, 4),
    });
  let r = roll({ kind: "save", ability: "dex" });
  assert.deepEqual([r.rollMode, r.natural], ["disadvantage", 4]);
  assert.equal(r.conditionReasons.disadvantage[0].conditionId, "restrained");
  r = roll({ kind: "save", ability: "dex", rollMode: "advantage" });
  assert.deepEqual([r.rollMode, r.values], ["normal", [15]]);
  r = roll({ kind: "save", ability: "wis" });
  assert.equal(r.rollMode, "normal", "Restrained touches Dexterity saves only");
  // Poisoned: Disadvantage on ability checks, not on saves.
  s.actors.livia.conditions = ["poisoned"];
  assert.equal(roll({ kind: "skill", skill: "athletics" }).rollMode, "disadvantage");
  assert.equal(roll({ kind: "save", ability: "con" }).rollMode, "normal");
  // Paralyzed: Strength and Dexterity saves fail automatically; nothing is rolled.
  s.actors.livia.conditions = ["paralyzed"];
  refusal(() => roll({ kind: "save", ability: "str" }), /fallisce automaticamente/);
  assert.equal(roll({ kind: "save", ability: "int" }).rollMode, "normal");
  // DM requests follow the same rules, per creature.
  s.actors.livia.conditions = ["restrained"];
  requests.createRequest(
    s,
    { kind: "save", ability: "dex", dc: 13, actorIds: ["livia", "doran"] },
    "dm",
    { id: "g1" },
  );
  const [liv, dor] = ["livia", "doran"].map((id) =>
    s.combatAttempts.find((a) => a.id === `roll-request:g1:${id}`),
  );
  assert.deepEqual(
    [liv.requests[0].rollMode, liv.requests[0].dice[0].count, dor.requests[0].rollMode],
    ["disadvantage", 2, "normal"],
  );
  assert.equal(liv.requests[0].conditionReasons.disadvantage[0].conditionId, "restrained");
  s.actors.livia.conditions = ["paralyzed"];
  requests.createRequest(s, { kind: "save", ability: "dex", dc: 13, actorIds: ["livia"] }, "dm", {
    id: "g2",
  });
  const auto = s.combatAttempts.find((a) => a.id === "roll-request:g2:livia");
  assert.deepEqual([auto.requests[0].status, auto.requests[0].reason], ["expired", "auto-fail"]);
  const group = requests.requestGroups(s, slice, "player").find((g) => g.groupId === "g2");
  assert.deepEqual(
    [group.rows[0].autoFail?.[0]?.conditionId, group.rows[0].success],
    ["paralyzed", false],
  );
  assert.deepEqual([group.summary.failure, group.summary.pending], [1, 0]);
  // Reopening a closed card never turns an automatic failure into a roll.
  requests.closeRequest(slice, "g2", "dm", s);
  requests.reopenRequest(slice, "g2", "dm", s);
  assert.equal(auto.requests[0].status, "expired");
  // The tab names the reason with the result.
  const h = harness({ die: scripted(15, 4) });
  h.store.state.actors.livia.conditions = ["restrained"];
  h.ctx.render();
  click(h.ctx.root, '[data-dtray-roll][data-kind="save"][data-ability="dex"]');
  assert.equal(h.slice().rolls.at(-1).natural, 4);
  assert.match(h.ctx.html, /svantaggio \(Trattenuto\)/);
});

test("review P2-7b: a closed card and its withdrawn rolls stay together across an Undo", () => {
  const h = harness({ role: "dm" });
  const { ctx } = h;
  const save = { kind: "save", ability: "dex", dc: 13, actorIds: ["livia"] };
  ctx.commit("g1", (d) => requests.createRequest(d, save, "dm", { id: "g1", now: "t1" }));
  ctx.commit("g2", (d) => requests.createRequest(d, save, "dm", { id: "g2", now: "t2" }));
  ctx.role = "player";
  ctx.commit("answer g2", (d) =>
    requests.answerRequest(
      d,
      "roll-request:g2:livia",
      d.combatAttempts[1].requests[0].id,
      [11],
      "player",
    ),
  );
  ctx.role = "dm";
  ctx.render();
  click(ctx.root, '[data-dtray-section="requests"]');
  click(ctx.root, '[data-dtray-request-close="g1"]');
  let g1 = requests.requestGroups(ctx.state, h.slice(), "player").find((g) => g.groupId === "g1");
  assert.deepEqual([g1.closed, g1.rows[0].status], [true, "expired"]);
  // The player undoes their own earlier answer: the snapshot predates the closing.
  ctx.role = "player";
  ctx.undo();
  g1 = requests.requestGroups(ctx.state, h.slice(), "player").find((g) => g.groupId === "g1");
  assert.deepEqual(
    [g1.closed, g1.rows[0].status, g1.rows[0].canRoll],
    [false, "pending", true],
    "never a closed card whose roll the bell still asks for",
  );
});
