// B34 DM roll requests on the existing request queue (combat.mjs): creation from the sheet
// modifiers, projection per role with summary and opposed verdict, answers with physical
// and digital faces through resolveRoll, Undo and reapply with the real store, Heroic
// Inspiration rerolls, journal refs, the log roll and its B56 presentation, and the
// request tab's handlers through a small fake DOM. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { hasBlockingConsequences, projectAttempts } from "../combat.mjs";
import * as requests from "../roll-requests.mjs";
import * as domain from "../dice-tray-domain.mjs";
import * as tray from "../dice-tray.mjs";
import { describeRoll } from "../dice-3d-domain.mjs";

afterEach(() => tray.resetTrayUI());

const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => {
    assert.match(error.it ?? error.message, pattern);
    return true;
  });
const saveDex13 = { kind: "save", ability: "dex", dc: 13, actorIds: ["livia", "doran"] };

test("the DM's request queues one attempt per creature with the sheet's modifier and DC", () => {
  const s = createInitialState();
  refusal(() => requests.createRequest(s, saveDex13, "player"), /Solo il DM/);
  const { groupId, attemptIds } = requests.createRequest(s, saveDex13, "dm", {
    id: "g1",
    now: "t0",
  });
  assert.equal(groupId, "g1");
  assert.deepEqual(attemptIds, ["roll-request:g1:livia", "roll-request:g1:doran"]);
  const livia = s.combatAttempts.find((a) => a.actorId === "livia");
  const request = livia.requests[0];
  assert.deepEqual(
    [livia.kind, request.kind, request.dc, request.modifier, request.dice, request.status],
    ["roll-request", "save", 13, 2, [{ count: 1, sides: 20 }], "pending"],
  );
  assert.deepEqual(livia.rollRequest.title, {
    it: "Tiro salvezza su Destrezza · CD 13",
    en: "Dexterity saving throw · DC 13",
  });
  assert.equal(livia.source.en.pages[0], 7, "SRD 5.2.1 Saving Throws");
  // No automatic consequence: a pending request never gates a turn.
  assert.equal(hasBlockingConsequences(s, "livia"), false);
  // The same id is not queued twice.
  requests.createRequest(s, saveDex13, "dm", { id: "g1" });
  assert.equal(s.combatAttempts.length, 2);
  // Skill checks use the skill's ability and proficiency; advantage rolls two d20s.
  requests.createRequest(
    s,
    { kind: "skill", skill: "perception", dc: 12, rollMode: "advantage", actorIds: ["mira"] },
    "dm",
    { id: "g2" },
  );
  const mira = s.combatAttempts.at(-1).requests[0];
  assert.deepEqual(
    [mira.kind, mira.modifier, mira.rollMode, mira.dice[0].count],
    ["check", 5, "advantage", 2],
  );
  refusal(
    () => requests.createRequest(s, { ...saveDex13, actorIds: [] }, "dm"),
    /almeno una creatura/,
  );
  refusal(
    () => requests.createRequest(s, { ...saveDex13, dc: "41" }, "dm"),
    /La CD è un numero intero tra 1 e 40/,
  );
  refusal(
    () => requests.createRequest(s, { ...saveDex13, actorIds: ["nobody"] }, "dm"),
    /non può ricevere/,
  );
  s.actors.iria = { ...structuredClone(s.actors.livia), id: "iria", visibility: "private" };
  refusal(
    () => requests.createRequest(s, { ...saveDex13, actorIds: ["iria"] }, "dm"),
    /non può ricevere/,
  );
});

test("answers go through resolveRoll: physical and digital faces, stack added, summary per role", () => {
  const s = createInitialState();
  requests.createRequest(s, saveDex13, "dm", { id: "g1" });
  const [liv, dor] = ["livia", "doran"].map((id) => s.combatAttempts.find((a) => a.actorId === id));
  refusal(
    () => requests.answerRequest(s, dor.id, dor.requests[0].id, [10], "player"),
    /Non puoi rispondere/,
  );
  const stack = [{ label: { it: "Mezza copertura", en: "Half Cover" }, value: 2 }];
  requests.answerRequest(s, liv.id, liv.requests[0].id, [9], "player", { mode: "physical", stack });
  assert.deepEqual(
    [liv.requests[0].status, liv.requests[0].natural, liv.requests[0].total, liv.requests[0].mode],
    ["resolved", 9, 13, "physical"],
  );
  assert.equal(liv.requests[0].modifierSources.at(-1).stack, true);
  assert.equal(liv.status, "resolved");
  requests.answerRequest(
    s,
    dor.id,
    dor.requests[0].id,
    requests.requestDigitalFaces(dor.requests[0], () => 5),
    "dm",
    {
      mode: "digital",
    },
  );
  const slice = domain.seedSlice();
  const dm = requests.requestGroups(s, slice, "dm")[0];
  assert.deepEqual(dm.summary, {
    success: 1,
    failure: 1,
    pending: 0,
    resolved: 2,
    total: 2,
    hidden: 0,
  });
  const player = requests.requestGroups(s, slice, "player")[0];
  const dorRow = player.rows.find((r) => r.actorId === "doran");
  assert.deepEqual(
    [dorRow.readable, dorRow.total, dorRow.canRoll],
    [false, null, false],
    "the DM creature's result stays hidden",
  );
  assert.equal(player.summary.hidden, 1);
  assert.equal(player.rows.find((r) => r.actorId === "livia").success, true);
  // The core requests dialog and the bell see the same attempts.
  assert.ok(projectAttempts(s, "player").some((a) => a.id === liv.id));
});

test("with the real store: accepted rolls reach the log (kind save/check), Undo keeps the faces, reapply", () => {
  const store = createStore({ storage: { getItem: () => null, setItem() {} } });
  store.commit("request", (d) => requests.createRequest(d, saveDex13, "dm", { id: "g1" }), "dm");
  const liv = store.state.combatAttempts.find((a) => a.actorId === "livia");
  store.commit(
    "answer",
    (d) =>
      requests.answerRequest(d, liv.id, liv.requests[0].id, [9], "player", { mode: "physical" }),
    "player",
  );
  const roll = store.state.log.at(-1).rolls[0];
  assert.deepEqual(
    [roll.source, roll.kind, roll.values, roll.total, roll.mode, roll.visibility],
    ["combat", "save", [9], 11, "physical", "shared"],
  );
  // B56 presents it with the request's title, DC and verdict (additive describeCombat branch).
  const view = describeRoll(store.state, roll, "player");
  assert.deepEqual(
    [view.title.it, view.dc, view.verdict.it],
    ["Tiro salvezza su Destrezza · CD 13", 13, "Fallimento"],
  );
  store.undo("player");
  const pending = store.state.combatAttempts.find((a) => a.id === liv.id).requests[0];
  assert.deepEqual(
    [pending.status, pending.acceptedValues, pending.withdrawn],
    ["pending", [9], true],
  );
  refusal(
    () => requests.answerRequest(structuredClone(store.state), liv.id, pending.id, [15], "player"),
    /già registrate/,
  );
  store.commit(
    "reapply",
    (d) => requests.answerRequest(d, liv.id, pending.id, [9], "player"),
    "player",
  );
  assert.equal(store.state.combatAttempts.find((a) => a.id === liv.id).requests[0].total, 11);
  // A check request logs as kind "check" with its natural face.
  store.commit(
    "check",
    (d) =>
      requests.createRequest(d, { kind: "check", ability: "str", actorIds: ["livia"] }, "dm", {
        id: "g2",
      }),
    "dm",
  );
  const check = store.state.combatAttempts.at(-1);
  store.commit(
    "answer",
    (d) => requests.answerRequest(d, check.id, check.requests[0].id, [14], "player"),
    "player",
  );
  const logged = store.state.log.at(-1).rolls[0];
  assert.deepEqual([logged.kind, logged.natural, logged.total], ["check", 14, 14]);
});

test("opposed rolls name the higher total or a tie, and hide what the viewer cannot read", () => {
  const s = createInitialState();
  refusal(
    () =>
      requests.createRequest(
        s,
        {
          kind: "contest",
          sides: [
            { actorId: "livia", kind: "save", ability: "dex" },
            { actorId: "goblin-1", kind: "skill", skill: "acrobatics" },
          ],
        },
        "dm",
      ),
    /tra prove, non tiri salvezza/,
  );
  refusal(
    () =>
      requests.createRequest(
        s,
        {
          kind: "contest",
          sides: [
            { actorId: "livia", kind: "skill", skill: "athletics" },
            { actorId: "livia", kind: "skill", skill: "athletics" },
          ],
        },
        "dm",
      ),
    /due creature diverse/,
  );
  const input = {
    kind: "contest",
    sides: [
      { actorId: "livia", kind: "skill", skill: "athletics" },
      { actorId: "goblin-1", kind: "skill", skill: "acrobatics" },
    ],
  };
  requests.createRequest(s, input, "dm", { id: "c1" });
  const [a, b] = s.combatAttempts;
  assert.equal(a.source.kind, "authored", "no SRD citation for a rule SRD 5.2.1 does not have");
  let group = requests.requestGroups(s, domain.seedSlice(), "dm")[0];
  assert.deepEqual(group.verdict, { state: "pending" });
  requests.answerRequest(s, a.id, a.requests[0].id, [12], "player");
  requests.answerRequest(s, b.id, b.requests[0].id, [8], "dm");
  group = requests.requestGroups(s, domain.seedSlice(), "dm")[0];
  assert.deepEqual(
    [
      group.verdict.state,
      group.verdict.actorId,
      group.verdict.winnerTotal,
      group.verdict.loserTotal,
    ],
    ["higher", "livia", 12, 10],
  );
  assert.equal(requests.requestGroups(s, domain.seedSlice(), "player")[0].verdict.state, "hidden");
  assert.deepEqual(
    requests.contestVerdict([
      { side: "a", status: "resolved", readable: true, total: 9, actorId: "x", name: "X" },
      { side: "b", status: "resolved", readable: true, total: 9, actorId: "y", name: "Y" },
    ]),
    { state: "tie", total: 9 },
  );
});

test("Heroic Inspiration rerolls one d20 of an answered request once and spends it", () => {
  const s = createInitialState();
  const slice = domain.seedSlice();
  requests.createRequest(s, { ...saveDex13, rollMode: "disadvantage", actorIds: ["livia"] }, "dm", {
    id: "g1",
  });
  const liv = s.combatAttempts[0];
  refusal(
    () =>
      requests.rerollRequest(slice, s, liv.id, liv.requests[0].id, 0, "player", { draw: () => 20 }),
    /Prima tira/,
  );
  requests.answerRequest(s, liv.id, liv.requests[0].id, [4, 17], "player");
  assert.equal(liv.requests[0].total, 6);
  refusal(
    () =>
      requests.rerollRequest(slice, s, liv.id, liv.requests[0].id, 0, "player", { draw: () => 20 }),
    /non ha l'Ispirazione eroica/,
  );
  domain.setInspiration(slice, s, "livia", true, "player", "t");
  const reroll = requests.rerollRequest(slice, s, liv.id, liv.requests[0].id, 0, "player", {
    face: 19,
    now: "t2",
  });
  assert.deepEqual(
    [reroll.values, reroll.natural, reroll.total, reroll.success, reroll.mode],
    [[19, 17], 17, 19, true, "physical"],
  );
  assert.equal(domain.hasInspiration(slice, "livia"), false);
  assert.deepEqual(liv.requests[0].values, [4, 17], "the accepted request stays as evidence");
  const row = requests.requestGroups(s, slice, "player")[0].rows[0];
  assert.deepEqual([row.total, row.success, row.reroll.from, row.reroll.to], [19, true, 4, 19]);
  domain.setInspiration(slice, s, "livia", true, "player", "t");
  refusal(
    () => requests.rerollRequest(slice, s, liv.id, liv.requests[0].id, 1, "player", { face: 3 }),
    /già stato ripetuto/,
  );
  requests.closeRequest(slice, "g1", "dm");
  assert.ok(requests.requestGroups(s, slice, "dm")[0].closed);
  refusal(() => requests.closeRequest(slice, "g1", "player"), /Solo il DM/);
  requests.reopenRequest(slice, "g1", "dm");
  assert.equal(requests.requestGroups(s, slice, "dm")[0].closed, false);
});

test("journal refs: save/check/skill with an optional DC, round trip, anything else stays text", () => {
  assert.deepEqual(requests.parseRollRef("save:dex:13"), {
    kind: "save",
    ability: "dex",
    skill: null,
    dc: 13,
  });
  assert.deepEqual(requests.parseRollRef("check:str"), {
    kind: "check",
    ability: "str",
    skill: null,
    dc: null,
  });
  assert.deepEqual(requests.parseRollRef("check:athletics:15"), {
    kind: "skill",
    ability: null,
    skill: "athletics",
    dc: 15,
  });
  for (const bad of ["save:athletics:13", "save:dex:0", "check:luck", "table:x", "save:dex:99", ""])
    assert.equal(requests.parseRollRef(bad), null, bad);
  for (const ref of ["save:wis:12", "check:int", "check:stealth:14"])
    assert.equal(requests.rollRef(requests.parseRollRef(ref)), ref);
});

// ---------------------------------------------------------------- request tab (fake DOM)

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
    ...[...html.matchAll(/<(form)\b([^>]*)>/g)].map((m) => [m[0], m[1], m[2], ""]),
  ].map(([, tag, attrsText, inner]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
    );
    const events = {};
    return {
      attrs,
      events,
      inner,
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      value: attrs.value ?? "",
      checked: "checked" in attrs,
      addEventListener(type, fn) {
        events[type] = fn;
      },
      setAttribute() {},
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
  // The request form's own querySelectorAll searches the whole fake document.
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
const click = (root, selector) => {
  const n = node(root, selector);
  (n.onclick ?? n.events.click)({ target: n, preventDefault() {} });
};

function harness({ role = "dm", die = null } = {}) {
  const store = createStore({ storage: { getItem: () => null, setItem() {} } });
  const registry = createRegistry({
    document: undefined,
    logger: null,
    deviceStorage: { getItem: () => null, setItem() {} },
  });
  assert.equal(registry.use("dice-tray", tray.register).status, "built");
  registry.initState(store.state);
  const toasts = [];
  const panel = () => registry.get("table-panel", "dice-tray", ctx);
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang: "it",
    offline: false,
    registry,
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    icon: () => "",
    rollDie: die,
    toast: (text) => toasts.push(text),
    dialog(title, body, options) {
      this.dialogState = { title, body, options };
    },
    closeDialog() {},
    commit(label, mutate, options = {}) {
      const before = store.state;
      store.commit(label, mutate, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      this.render();
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      this.render();
    },
    render() {
      const scene = store.state.scenes.find((s) => s.id === store.state.activeSceneId);
      this.html = panel().render(this, { scene, selectedActorId: "livia" });
      this.root = fakeRoot(this.html);
      panel().bind(this.root, this, {});
    },
  };
  registry.attach(ctx);
  ctx.render();
  click(ctx.root, '[data-dtray-section="requests"]');
  return { ctx, store, toasts };
}

test("request tab: the DM sends a Dex save DC 13, the player answers physically, Undo, reapply", () => {
  const h = harness({ role: "dm", die: () => 16 });
  const { ctx, store } = h;
  assert.match(ctx.html, /Chiedi un tiro/);
  const dc = node(ctx.root, '[data-dtray-rq="dc"]');
  dc.value = "13";
  dc.events.input({ target: dc });
  const mira = node(ctx.root, '[data-dtray-rq-target][value="mira"]');
  mira.checked = false;
  mira.events.change({ target: mira });
  node(ctx.root, "[data-dtray-request-form]").onsubmit({ preventDefault() {} });
  const attempts = store.state.combatAttempts.filter((a) => a.kind === "roll-request");
  assert.deepEqual(attempts.map((a) => a.actorId).sort(), ["doran", "livia"]);
  assert.match(
    store.state.log.at(-1).label,
    /^Richiesta del DM: Tiro salvezza su Destrezza · CD 13 → /,
  );
  assert.match(ctx.html, /Tiro salvezza su Destrezza · CD 13/);
  // The DM rolls Doran digitally; the result is private in the log.
  const dor = attempts.find((a) => a.actorId === "doran");
  click(ctx.root, `[data-dtray-answer="${dor.requests[0].id}"]`);
  assert.equal(store.state.log.at(-1).visibility, "private");
  assert.match(ctx.html, /16 · Successo|18 · Successo/);
  // The player: pending badge, physical face 9, Undo keeps it, reapply.
  ctx.role = "player";
  ctx.render();
  assert.match(ctx.html, /data-dtray-pending>1</);
  click(ctx.root, '[data-dtray-section="requests"]');
  const liv = attempts.find((a) => a.actorId === "livia");
  const id = liv.requests[0].id;
  click(ctx.root, `[data-dtray-answer-physical="${id}"]`);
  const face = node(ctx.root, `[data-dtray-request-face="${id}"]`);
  face.value = "9";
  face.events.input({ target: face });
  click(ctx.root, `[data-dtray-answer-record="${id}"]`);
  let request = store.state.combatAttempts.find((a) => a.id === liv.id).requests[0];
  assert.deepEqual([request.status, request.total, request.mode], ["resolved", 11, "physical"]);
  assert.match(ctx.html, /11 · Fallimento/);
  assert.match(
    store.state.log.at(-1).label,
    /^Livia · Tiro salvezza su Destrezza · CD 13: \[9\] \+2 = 11 · fallimento · dado fisico$/,
  );
  ctx.undo();
  assert.match(ctx.html, /Annullato: facce note 9/);
  click(ctx.root, `[data-dtray-reapply="${id}"]`);
  request = store.state.combatAttempts.find((a) => a.id === liv.id).requests[0];
  assert.deepEqual([request.status, request.total], ["resolved", 11]);
  assert.match(ctx.html, /Nessuna conseguenza automatica/);
  // The DM closes the card; it moves to the closed list.
  ctx.role = "dm";
  ctx.render();
  click(ctx.root, '[data-dtray-section="requests"]');
  click(ctx.root, '[data-dtray-request-close="' + liv.rollRequest.groupId + '"]');
  assert.match(ctx.html, /Richieste concluse \(1\)/);
});
