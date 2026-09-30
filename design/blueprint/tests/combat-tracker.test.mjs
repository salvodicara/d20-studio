// B32 — complete combat tracker: domain rules with the real store, combat engine and
// registry, plus the interface handlers (render + bind on a small DOM double).
// Synthetic data only: the lantern campaign, Livia, Doran, Mira and SRD goblin warriors.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore, rollDie } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import {
  beginAttempt,
  resolveRoll,
  expireTurnEffects,
  advanceTurn,
  beginMovement,
  projectReactions,
  visibleTurnActor,
  succeedFailedSave,
  resolveAutomaticRolls,
  previewAction,
} from "../combat.mjs";
import { createSceneNPC, placeSceneToken, startPreparedEncounter } from "../preparation.mjs";
import * as data from "../srd-compendium.mjs";
import * as D from "../combat-tracker-domain.mjs";
import * as UI from "../combat-tracker.mjs";
import { register as registerTokenMenu, removeTokens } from "../token-menu.mjs";
import { register as registerSettings } from "../campaign-settings.mjs";
import { register as registerLoot, parcelTitle } from "../loot.mjs";

afterEach(() => UI.resetTrackerView());

// ---------------------------------------------------------------- harness

function harness({ lang = "it" } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null });
  for (const [name, fn] of [
    ["token-menu", registerTokenMenu],
    ["campaign-settings", registerSettings],
    ["loot", registerLoot],
    ["combat-tracker", UI.register],
  ])
    assert.equal(registry.use(name, fn).status, "built", name);
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const dialogs = [];
  const ctx = {
    role: "dm",
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    canControl(actor) {
      return (
        !!actor &&
        actor.visibility !== "private" &&
        (this.role === "dm" || actor.owner === this.role)
      );
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    navigate() {},
    openSheet() {},
    startEncounter() {},
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
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      store.persist();
      registry.emitStateEvents(current, store.state, { kind: "correction" });
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    toasts,
    dialogs,
    slice: () => D.sliceOf(store.state),
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
  };
}
const goblinEntry = () => data.getEntry("srd2024:creature:goblin-warrior");
function addGoblin(s, id, name, point, { hidden = false } = {}) {
  const entry = goblinEntry();
  const { input, patch } = data.npcFromCreature(entry, { id, name, team: "watch" });
  const actor = createSceneNPC(s, input, "dm");
  Object.assign(actor, patch);
  const melee = data.srdMeleeProfile(entry);
  actor.combatProfile = { ...actor.combatProfile, meleeAttack: melee };
  placeSceneToken(s, "old-watch", id, point, "token-" + id, "dm");
  if (hidden) s.scenes[0].tokens.find((t) => t.actorId === id).hidden = true;
  return actor;
}
const row = (actorId, natural, bonus = 0) => ({ actorId, natural, bonus, mode: "physical" });
// Livia 17, four goblins sharing one roll (SRD: one roll for identical creatures, the 4th
// hidden in ambush), Doran 11, the Sentinella 9, Mira 8.
function prepare(h, { goblins = 4, hiddenLast = true, extra = [] } = {}) {
  h.ctx.role = "dm";
  h.ctx.commit("setup", (s) => {
    const spots = [
      { x: 300, y: 380 },
      { x: 250, y: 330 },
      { x: 200, y: 380 },
      { x: 250, y: 430 },
    ];
    for (let i = 1; i <= goblins; i++)
      addGoblin(s, "gob-" + i, "Goblin", spots[i - 1], { hidden: hiddenLast && i === goblins });
    s.scenes[0].encounter = {
      name: "Agguato",
      participants: [
        row("livia", 15, 2),
        ...Array.from({ length: goblins }, (_, i) => row("gob-" + (i + 1), 12, 1)),
        row("doran", 10, 1),
        row("goblin-1", 7, 2),
        row("mira", 6, 2),
        ...extra,
      ],
    };
  });
}
function start(h) {
  h.ctx.role = "dm";
  h.ctx.commit("Combattimento avviato", (s) => {
    startPreparedEncounter(s, "old-watch", "dm");
    expireTurnEffects(s, s.combat.order[0], "start");
  });
}
const endTurn = (h, role = "dm") => {
  h.ctx.role = role;
  h.ctx.commit("Turno concluso", (s) => advanceTurn(s));
};
const current = (h) => h.ctx.state.combat.order[h.ctx.state.combat.turn];
const names = (h, ids) => ids.map((id) => h.ctx.state.actors[id].name);
const cmd = (h, label, fn, options) => h.ctx.commit(label, (s) => fn(s, D.sliceOf(s)), options);

// ---------------------------------------------------------------- DOM double

function parseAttrs(text) {
  const attrs = {};
  for (const [, key, dq, sq, bare] of text.matchAll(
    /([\w:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g,
  ))
    attrs[key] = (dq ?? sq ?? bare ?? "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  return attrs;
}
function simpleMatch(node, selector) {
  const parts = selector.trim().match(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|^[a-zA-Z][\w-]*/g) ?? [];
  return parts.every((part) => {
    if (part[0] === "#") return node.attrs.id === part.slice(1);
    if (part[0] === ".") return (node.attrs.class ?? "").split(/\s+/).includes(part.slice(1));
    if (part[0] === "[") {
      const [, key, value] = /^\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]$/.exec(part) ?? [];
      return key in node.attrs && (value === undefined || node.attrs[key] === value);
    }
    return node.tagName === part.toUpperCase();
  });
}
const matches = (node, selector) => selector.split(",").some((part) => simpleMatch(node, part));
function element(tag, attrs, parent) {
  const node = {
    tagName: tag.toUpperCase(),
    attrs,
    parent,
    children: [],
    events: {},
    value: attrs.value ?? "",
    checked: "checked" in attrs,
    isConnected: true,
    get id() {
      return attrs.id ?? "";
    },
    get dataset() {
      return Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      );
    },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    setAttribute: (k, v) => (attrs[k] = String(v)),
    addEventListener(type, fn) {
      (node.events[type] ||= []).push(fn);
    },
    focus() {},
    closest(selector) {
      for (let n = node; n && n.tagName !== "ROOT"; n = n.parent)
        if (matches(n, selector)) return n;
      return null;
    },
    descendants() {
      return node.children.flatMap((child) => [child, ...child.descendants()]);
    },
    querySelectorAll: (selector) => node.descendants().filter((n) => matches(n, selector)),
    querySelector: (selector) => node.descendants().find((n) => matches(n, selector)) ?? null,
    fire(type, extra = {}) {
      const event = { type, target: node, preventDefault() {}, stopPropagation() {}, ...extra };
      for (let n = node; n; n = n.parent) for (const fn of n.events[type] ?? []) fn(event);
    },
  };
  return node;
}
const VOID = new Set(["input", "br", "img", "circle", "path", "rect"]);
function mount(html, bind) {
  const root = element("root", {}, null);
  const stack = [root];
  for (const [full, tag, attrText] of html.matchAll(/<\/?([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
    if (full.startsWith("</")) {
      for (let i = stack.length - 1; i > 0; i--)
        if (stack[i].tagName === tag.toUpperCase()) {
          stack.length = i;
          break;
        }
      continue;
    }
    const node = element(tag, parseAttrs(attrText), stack.at(-1));
    stack.at(-1).children.push(node);
    if (!VOID.has(tag.toLowerCase()) && !full.endsWith("/>")) stack.push(node);
  }
  bind(root);
  return {
    root,
    click(selector) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      node.fire("click");
    },
  };
}
const form = (entries) => {
  const map = new Map();
  for (const [k, v] of entries) map.set(k, [...(map.get(k) ?? []), v]);
  return { get: (k) => map.get(k)?.[0] ?? null, getAll: (k) => map.get(k) ?? [] };
};
const table = (h) => ({
  selected: null,
  selectedActorId: null,
  select(id) {
    this.selected = id;
  },
  setMode() {},
});

// ---------------------------------------------------------------- tests

test("seed and normalize: default 2024 individual turns, idempotent, strict on versions", () => {
  const seed = D.seedSlice();
  assert.equal(seed.settings.groupTurns, null, "no house rule by default");
  assert.equal(seed.settings.turnAlerts, true);
  assert.deepEqual(D.normalizeSlice(D.normalizeSlice(seed)), D.normalizeSlice(seed));
  assert.throws(() => D.normalizeSlice(seed, 2), /Unknown combat-tracker version/);
  assert.deepEqual(D.normalizeRolls(null, 0), { rolls: [] });
  assert.equal(
    D.normalizeSlice({ entries: [{ id: "e", name: "X", rounds: 3 }] }).entries[0].remaining,
    3,
  );
});

test("DDB letters: A/B/C at start, hidden ignored; hidden never leaks; revealed gets its letter", () => {
  const h = harness();
  prepare(h);
  start(h);
  const s = h.ctx.state;
  assert.deepEqual(names(h, ["gob-1", "gob-2", "gob-3", "gob-4"]), [
    "Goblin A",
    "Goblin B",
    "Goblin C",
    "Goblin",
  ]);
  // Player view: the hidden goblin is absent from rows, order strip and alerts.
  const playerRows = D.trackerRows(s, h.slice(), "player").filter((r) => r.kind === "combatant");
  assert.ok(!playerRows.some((r) => r.id === "gob-4"));
  assert.ok(D.trackerRows(s, h.slice(), "dm").some((r) => r.id === "gob-4" && r.hidden));
  // Advance to the hidden goblin's turn: the player's view stays on Goblin C.
  for (let i = 0; i < 4; i++) endTurn(h);
  assert.equal(current(h), "gob-4");
  assert.equal(D.shownCurrentId(h.ctx.state, "player"), "gob-3");
  assert.equal(D.shownCurrentId(h.ctx.state, "dm"), "gob-4");
  assert.equal(
    visibleTurnActor(h.ctx.state, (id) => D.viewerSees(h.ctx.state, id, "player")),
    "gob-3",
  );
  // Reveal from the tracker: the next free letter.
  cmd(h, "reveal", (st, sl) => D.setHidden(st, sl, "gob-4", false, "dm"));
  assert.equal(h.ctx.state.actors["gob-4"].name, "Goblin D");
  assert.equal(D.shownCurrentId(h.ctx.state, "player"), "gob-4");
});

test("pending lane: add, Advantage, digital/physical/shared rolls in the initiative ledger, Add keeps the turn", () => {
  const h = harness();
  prepare(h, { goblins: 3, hiddenLast: false });
  start(h);
  endTurn(h); // Goblin A's turn
  h.ctx.commit("arrive", (s) => addGoblin(s, "gob-9", "Goblin", { x: 700, y: 300 }));
  cmd(h, "join", (s, sl) => {
    D.addPending(s, sl, ["gob-9"], "dm");
    D.assignLetters(s, sl);
  });
  assert.equal(
    h.ctx.state.actors["gob-9"].name,
    "Goblin D",
    "later additions continue the letters",
  );
  assert.throws(() => cmd(h, "again", (s, sl) => D.addPending(s, sl, ["gob-9"], "dm")), /already/);
  cmd(h, "adv", (s, sl) => D.setPendingAdvantage(s, sl, "gob-9", "advantage", "dm"));
  const before = (h.ctx.state.initiativeRolls ?? []).length;
  cmd(h, "roll", (s, sl) => D.rollPending(s, sl, "gob-9", { mode: "digital" }, "dm"));
  const pending = h.slice().combat.pending[0];
  assert.equal(pending.roll.faces.length, 2, "Advantage rolls two d20");
  assert.equal(pending.roll.natural, Math.max(...pending.roll.faces));
  const ledger = h.ctx.state.initiativeRolls.slice(before);
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].rollMode, "advantage");
  // A second result needs the physical die and a reason.
  assert.throws(
    () => cmd(h, "re", (s, sl) => D.rollPending(s, sl, "gob-9", { mode: "digital" }, "dm")),
    /reason/,
  );
  cmd(h, "fix", (s, sl) =>
    D.rollPending(s, sl, "gob-9", { mode: "physical", natural: 20, reason: "dado caduto" }, "dm"),
  );
  assert.equal(h.ctx.state.initiativeRolls.at(-1).kind, "correction");
  const turnBefore = current(h);
  cmd(h, "add", (s, sl) => D.addPendingToCombat(s, sl, "dm"));
  assert.equal(current(h), turnBefore, "the current turn is kept");
  assert.ok(h.ctx.state.combat.order.indexOf("gob-9") < h.ctx.state.combat.order.indexOf("livia"));
  assert.equal(h.slice().combat.pending.length, 0);
  // Shared initiative with an identical creature (SRD: one roll for identical creatures).
  h.ctx.commit("arrive2", (s) => addGoblin(s, "gob-8", "Goblin", { x: 720, y: 360 }));
  cmd(h, "join2", (s, sl) => D.addPending(s, sl, ["gob-8"], "dm"));
  cmd(h, "share", (s, sl) => D.rollPending(s, sl, "gob-8", { shareWith: "gob-1" }, "dm"));
  assert.equal(h.slice().combat.pending[0].roll.total, 13);
});

test("remove from combat keeps the token with a marker; delete removes the token and keeps the sheet", () => {
  const h = harness();
  prepare(h, { goblins: 3, hiddenLast: false });
  start(h);
  endTurn(h); // Goblin A current
  cmd(h, "remove", (s, sl) => D.removeFromCombat(s, sl, "gob-1", "dm"));
  const s = h.ctx.state;
  assert.ok(!s.combat.order.includes("gob-1"));
  assert.ok(
    s.scenes[0].tokens.some((t) => t.actorId === "gob-1"),
    "token stays on the map",
  );
  assert.equal(current(h), "gob-2", "removing the current creature starts the next turn");
  assert.equal(s.actors["gob-2"].action, true);
  assert.deepEqual(
    h.slice().combat.removed.map((r) => r.actorId),
    ["gob-1"],
  );
  assert.ok(D.joinableActors(s, h.slice()).includes("gob-1"), "it can join again");
  cmd(h, "delete", (st, sl) =>
    D.deleteToken(st, sl, "gob-3", "dm", { slice: st.ext["token-menu"], removeTokens }),
  );
  assert.ok(!h.ctx.state.combat.order.includes("gob-3"));
  assert.ok(!h.ctx.state.scenes[0].tokens.some((t) => t.actorId === "gob-3"));
  assert.ok(h.ctx.state.actors["gob-3"], "the sheet stays");
  // Undo restores the token and the order.
  h.ctx.undo();
  assert.ok(h.ctx.state.combat.order.includes("gob-3"));
});

test("group turn is a house rule with its source: members pass together, resources refreshed, retire needs a reason", () => {
  const h = harness();
  prepare(h, { goblins: 3, hiddenLast: false });
  start(h);
  const rules = (st) => ({
    add: (state, input) => {
      state.ext["campaign-settings"].campaigns.lanterns ??= { houseRules: [], history: [] };
      return "house-1";
    },
    retire: () => {},
    source: () => ({ kind: "house-rule", decisionId: "d1" }),
  });
  assert.throws(
    () => cmd(h, "on", (s, sl) => D.setGroupTurns(s, sl, true, { text: "" }, "dm")),
    /Describe/,
  );
  cmd(h, "on", (s, sl) =>
    D.setGroupTurns(
      s,
      sl,
      true,
      { title: "Turno di gruppo", text: D.GROUP_RULE_TEXT.it },
      "dm",
      rules(s),
    ),
  );
  assert.equal(h.slice().settings.groupTurns.houseRuleId, "house-1");
  assert.equal(h.slice().settings.groupTurns.source.kind, "house-rule");
  endTurn(h); // Livia ends: the goblins' group turn begins with Goblin A
  assert.equal(current(h), "gob-1");
  assert.deepEqual(h.slice().combat.groupTurn.memberIds, ["gob-1", "gob-2", "gob-3"]);
  h.ctx.state.actors["gob-2"].action = false; // B acted inside the group turn
  endTurn(h);
  assert.equal(current(h), "doran", "one End turn passes the whole group");
  assert.throws(() => cmd(h, "off", (s, sl) => D.setGroupTurns(s, sl, false, {}, "dm")), /reason/);
  cmd(h, "off", (s, sl) =>
    D.setGroupTurns(s, sl, false, { reason: "prova finita" }, "dm", rules(s)),
  );
  assert.equal(h.slice().settings.groupTurns, null);
});

test("group turn: members move and act through the engine while the leader holds the turn, never outside it", () => {
  const h = harness();
  prepare(h, { goblins: 3, hiddenLast: false });
  start(h);
  assert.throws(
    () =>
      beginMovement(h.ctx.state, { id: "m0", actorId: "gob-2", point: { x: 250, y: 280 } }, "dm"),
    /turn/,
  );
  cmd(h, "on", (s, sl) =>
    D.setGroupTurns(s, sl, true, { title: "Turno di gruppo", text: "x" }, "dm"),
  );
  endTurn(h);
  assert.equal(current(h), "gob-1");
  assert.equal(D.sharesGroupTurn(h.ctx.state, "gob-2"), true);
  assert.equal(D.sharesGroupTurn(h.ctx.state, "doran"), false);
  h.ctx.commit("B moves", (s) =>
    beginMovement(s, { id: "m1", actorId: "gob-2", point: { x: 250, y: 280 } }, "dm"),
  );
  assert.ok(h.ctx.state.movements.some((m) => m.id === "m1" && m.actorId === "gob-2"));
  // Leaving Livia's reach offers her an Opportunity Attack (her policy: Ask by default).
  assert.ok(
    projectReactions(h.ctx.state, "player").some(
      (r) => r.type === "opportunity" && r.status === "pending",
    ),
  );
  endTurn(h);
  assert.equal(D.sharesGroupTurn(h.ctx.state, "gob-2"), false, "the group turn is over");
});

test("group turn house rule is recorded in the campaign settings when that area is present", () => {
  const h = harness();
  prepare(h, { goblins: 2, hiddenLast: false });
  start(h);
  h.dialogs.length = 0;
  // Settings dialog through the tracker footer.
  const view = mount(UI.renderTracker(h.ctx, {}), (el) => UI.bindTracker(el, h.ctx, table(h)));
  view.click("[data-ct-settings]");
  const dialog = h.dialogs.at(-1);
  dialog.options.onSubmit(
    form([
      ["groupTurns", "on"],
      ["ruleText", D.GROUP_RULE_TEXT.it],
      ["timer", "on"],
    ]),
  );
  const settings = h.slice().settings;
  assert.equal(settings.timer, true);
  assert.ok(settings.groupTurns.houseRuleId, "an authored house rule exists");
  const record = h.ctx.state.ext["campaign-settings"].campaigns.lanterns;
  assert.ok(
    record.houseRules.some((r) => r.id === settings.groupTurns.houseRuleId && !r.retiredAt),
  );
  assert.equal(settings.groupTurns.source.kind, "house-rule");
  assert.ok(settings.groupTurns.source.decisionId);
});

test("turn alerts: Livia gets 'next' then 'your turn'; hidden creatures are skipped for 'next'", () => {
  const h = harness();
  prepare(h, { goblins: 1, hiddenLast: true });
  start(h); // Livia first
  const alert = () => D.turnAlertFor(h.ctx.state, h.slice(), "player");
  assert.equal(alert().kind, "turn");
  assert.equal(alert().actorId, "livia");
  // Order: livia, gob-1 (hidden), doran, goblin-1, mira. At the Sentinella's turn Mira is next.
  endTurn(h);
  endTurn(h);
  endTurn(h);
  assert.equal(current(h), "goblin-1");
  assert.deepEqual(alert(), { kind: "next", actorId: "mira", key: alert().key });
  endTurn(h);
  assert.equal(alert().kind, "turn");
  // At Mira's turn, the next seen creature is Livia (new round).
  assert.equal(D.turnAlertFor(h.ctx.state, h.slice(), "dm"), null, "the DM gets no turn alert");
  h.ctx.role = "player";
  const alertBox = UI.currentAlert(h.ctx);
  assert.match(alertBox.text, /Tocca a te, Mira!/);
  cmd(h, "no-alerts", (s, sl) => D.setSetting(s, sl, "turnAlerts", false, "dm"));
  assert.equal(alert(), null);
});

test("legendary actions only after another creature's turn, refill at its own; resistance turns a failed save into a success", () => {
  const h = harness();
  prepare(h, { goblins: 2, hiddenLast: false });
  start(h);
  cmd(h, "config", (s, sl) =>
    D.configureMonster(
      s,
      sl,
      "gob-1",
      { legendary: 2, resistance: 1, recharge: [{ name: "Grido", min: 5 }], diceMode: "digital" },
      "dm",
    ),
  );
  assert.equal(h.slice().monsters["gob-1"].source.kind, "authored");
  assert.equal(
    D.legendaryState(h.ctx.state, h.slice(), "gob-1").can,
    false,
    "no turn has ended yet",
  );
  endTurn(h); // Livia's turn ended; Goblin A's own turn now
  assert.equal(D.legendaryState(h.ctx.state, h.slice(), "gob-1").can, false, "not on its own turn");
  endTurn(h); // Goblin A ended; Goblin B current
  // Review B32-rf: right after its OWN turn is not "after another creature's turn".
  assert.equal(D.legendaryState(h.ctx.state, h.slice(), "gob-1").can, false, "after its own turn");
  assert.throws(
    () => cmd(h, "leg0", (s, sl) => D.useLegendaryAction(s, sl, "gob-1", "", "dm")),
    /its own turn/,
  );
  endTurn(h); // Goblin B ended; Doran current
  cmd(h, "leg", (s, sl) => D.useLegendaryAction(s, sl, "gob-1", "", "dm"));
  cmd(h, "leg2", (s, sl) => D.useLegendaryAction(s, sl, "gob-1", "", "dm"));
  assert.throws(
    () => cmd(h, "leg3", (s, sl) => D.useLegendaryAction(s, sl, "gob-1", "", "dm")),
    /uses left/,
  );
  assert.equal(h.slice().combat.legendaryLog[0].afterActorId, "gob-2");
  // Round wraps: at Goblin A's next turn start the uses refill.
  while (current(h) !== "gob-1") endTurn(h);
  assert.equal(h.slice().monsters["gob-1"].legendary.used, 0);
  // Burning Hands on the goblins, assisted automation: the failed save waits for Apply.
  h.ctx.commit("move livia", (s) => {
    s.combat.turn = s.combat.order.indexOf("livia");
    const token = s.scenes[0].tokens.find((t) => t.actorId === "livia");
    Object.assign(token, { x: 250, y: 380 });
    s.actors.livia.action = true;
  });
  let attempt;
  h.ctx.role = "player";
  h.ctx.commit("cast", (s) => {
    attempt = beginAttempt(
      s,
      {
        id: "bh-1",
        actorId: "livia",
        actionId: "burning-hands",
        selection: { point: { x: 330, y: 380 } },
        mode: "physical",
        applyMode: "assisted",
      },
      "player",
    );
  });
  const live = () => h.ctx.state.combatAttempts.find((a) => a.id === "bh-1");
  assert.ok(
    live().outcomes.some((o) => o.actorId === "gob-1"),
    "Goblin A in the cone",
  );
  h.ctx.commit("damage", (s) =>
    resolveRoll(
      s,
      "bh-1",
      live().requests.find((r) => r.kind === "damage").id,
      [6, 6, 6],
      "player",
    ),
  );
  h.ctx.role = "dm";
  h.ctx.commit("save", (s) =>
    resolveRoll(
      s,
      "bh-1",
      live().requests.find((r) => r.kind === "save" && r.actorId === "gob-1").id,
      [2],
      "dm",
    ),
  );
  const failed = D.failedSaves(h.ctx.state, "gob-1");
  assert.equal(failed.length, 1);
  assert.equal(failed[0].ready, true);
  cmd(h, "lr", (s, sl) => D.useLegendaryResistance(s, sl, "gob-1", "bh-1", "dm"));
  const outcome = live().outcomes.find((o) => o.actorId === "gob-1");
  assert.equal(outcome.saveSuccess, true);
  assert.equal(outcome.damage, 9, "Burning Hands: half of 18 on a success");
  assert.equal(h.slice().monsters["gob-1"].resistance.used, 1);
  assert.throws(
    () => cmd(h, "lr2", (s, sl) => D.useLegendaryResistance(s, sl, "gob-1", "bh-1", "dm")),
    /Legendary Resistance/,
  );
  // An applied outcome can no longer change (combat.mjs refuses).
  assert.throws(() => succeedFailedSave(h.ctx.state, "bh-1", "gob-2", "dm"));
});

test("recharge rolls at turn start: digital automatic in the ledger, kept after Undo and reused once; physical waits for the face", () => {
  const h = harness();
  prepare(h, { goblins: 2, hiddenLast: false });
  start(h);
  cmd(h, "config", (s, sl) =>
    D.configureMonster(
      s,
      sl,
      "gob-1",
      { recharge: [{ name: "Soffio", min: 5 }], diceMode: "digital" },
      "dm",
    ),
  );
  cmd(h, "spend", (s, sl) => D.markRechargeUsed(s, sl, "gob-1", "recharge-1", "dm"));
  endTurn(h); // Goblin A's turn starts: automatic digital recharge
  const rolls = () => D.rechargeHistory(h.ctx.state, h.slice());
  assert.equal(rolls().length, 1);
  const first = rolls()[0];
  assert.equal(first.status, "applied");
  assert.equal(h.slice().monsters["gob-1"].recharge[0].available, first.face >= 5);
  h.ctx.undo();
  assert.equal(rolls()[0].status, "reversed", "the roll stays, marked reversed");
  endTurn(h);
  assert.equal(rolls().length, 2);
  assert.equal(rolls()[1].face, first.face, "Undo never grants a free reroll");
  assert.equal(rolls()[1].reusedFrom, first.id);
  // Physical dice: the recharge becomes due and waits for the DM's face.
  cmd(h, "physical", (s, sl) =>
    D.configureMonster(
      s,
      sl,
      "gob-2",
      { recharge: [{ name: "Rete", min: 6 }], diceMode: "physical" },
      "dm",
    ),
  );
  cmd(h, "spend2", (s, sl) => D.markRechargeUsed(s, sl, "gob-2", "recharge-1", "dm"));
  endTurn(h); // Goblin B
  assert.equal(current(h), "gob-2");
  assert.ok(h.slice().monsters["gob-2"].recharge[0].due);
  assert.throws(
    () =>
      cmd(h, "bad", (s, sl) =>
        D.rollRecharge(s, sl, "gob-2", "recharge-1", { mode: "physical", face: 7 }, "dm"),
      ),
    /d6/,
  );
  cmd(h, "face", (s, sl) =>
    D.rollRecharge(s, sl, "gob-2", "recharge-1", { mode: "physical", face: 6 }, "dm"),
  );
  assert.equal(h.slice().monsters["gob-2"].recharge[0].available, true);
  assert.equal(rolls().at(-1).mode, "physical");
});

test("custom entries: a 3-round countdown fires at round 4 with an event and a notification", () => {
  const h = harness();
  prepare(h, { goblins: 1, hiddenLast: false });
  cmd(h, "entry", (s, sl) =>
    D.saveEntry(
      s,
      sl,
      { name: "Il soffitto crolla", init: 20, kind: "countdown", rounds: 3, visibility: "all" },
      "dm",
    ),
  );
  start(h);
  const entry = () => h.slice().entries[0];
  assert.equal(entry().remaining, 3);
  const rowsDm = D.trackerRows(h.ctx.state, h.slice(), "dm");
  assert.equal(rowsDm[0].kind, "entry", "count 20 sorts before Livia (17)");
  const order = h.ctx.state.combat.order.length;
  for (let i = 0; i < order * 3; i++) endTurn(h);
  assert.equal(h.ctx.state.combat.round, 4);
  assert.equal(entry().remaining, 0);
  assert.equal(entry().firedRound, 4);
  assert.ok(h.slice().combat.events.some((e) => e.kind === "countdown"));
  h.ctx.role = "player";
  const notices = h.registry.notifications(h.ctx);
  assert.ok(notices.some((n) => /soffitto/.test(n.title?.it ?? n.title)));
  assert.throws(() =>
    cmd(h, "bad", (s, sl) => D.saveEntry(s, sl, { name: "", init: 20, rounds: 2 }, "dm")),
  );
});

test("mob attack: four goblins attack Livia with one command in their group turn, distinct results", () => {
  const h = harness();
  prepare(h, { goblins: 4, hiddenLast: false });
  start(h);
  cmd(h, "rule", (s, sl) =>
    D.setGroupTurns(s, sl, true, { title: "Turno di gruppo", text: "x" }, "dm"),
  );
  endTurn(h); // group turn
  const { attackers, targets } = D.mobCandidates(h.ctx.state, h.slice(), "dm");
  assert.equal(attackers.length, 4);
  assert.ok(attackers.every((a) => a.actionId === "melee-attack" && !a.reason));
  assert.ok(targets.includes("livia"));
  let results;
  cmd(h, "mob", (s, sl) => {
    results = D.beginMobAttack(
      s,
      sl,
      { attackerIds: attackers.map((a) => a.actorId), targetId: "livia", mode: "digital" },
      "dm",
    );
  });
  assert.equal(results.length, 4);
  assert.equal(new Set(results.map((r) => r.attemptId)).size, 4);
  assert.equal(current(h), "gob-1", "the real turn is kept");
  assert.ok(
    h.ctx.state.combatAttempts.every(
      (a) => !results.some((r) => r.attemptId === a.id) || a.turnKey.endsWith(":gob-1"),
    ),
    "one shared group turn",
  );
  // Digital dice in their own commit, as the combat bar does; Shield offers stay "Ask".
  h.ctx.commit("dice", (s) => resolveAutomaticRolls(s, rollDie));
  const attempts = h.ctx.state.combatAttempts.filter((a) =>
    results.some((r) => r.attemptId === a.id),
  );
  assert.equal(attempts.length, 4);
  assert.deepEqual(
    new Set(attempts.map((a) => a.actorId)),
    new Set(["gob-1", "gob-2", "gob-3", "gob-4"]),
  );
  assert.ok(
    attempts.every((a) => a.requests[0].kind === "attack" && a.requests[0].status === "resolved"),
  );
  assert.equal(new Set(attempts.map((a) => a.requests[0].id)).size, 4, "one roll per attacker");
  for (const id of ["gob-1", "gob-2", "gob-3", "gob-4"])
    assert.equal(h.ctx.state.actors[id].action, false);
  // Without the house rule only the current creature attacks.
  const h2 = harness();
  prepare(h2, { goblins: 2, hiddenLast: false });
  start(h2);
  endTurn(h2);
  assert.equal(D.mobCandidates(h2.ctx.state, h2.slice(), "dm").attackers.length, 1);
});

test("reaction policy: Livia's Opportunity Attack 'Automatic' is taken with digital dice; Shield 'Ask' stays an offer; 'Off' declines", () => {
  const h = harness();
  prepare(h, { goblins: 1, hiddenLast: false });
  start(h);
  h.ctx.role = "player";
  cmd(h, "policy", (s, sl) => D.setPolicy(s, sl, "livia", "opportunity", "auto", "player"));
  assert.equal(D.policyOf(h.ctx.state, "livia", "opportunity"), "auto");
  assert.equal(D.policyOf(h.ctx.state, "livia", "shield"), "ask");
  assert.throws(
    () =>
      cmd(h, "not mine", (s, sl) => D.setPolicy(s, sl, "doran", "opportunity", "auto", "player")),
    /controls/,
  );
  endTurn(h, "player"); // Goblin A's turn; it stands next to Livia
  assert.equal(current(h), "gob-1");
  h.ctx.role = "dm";
  const rollsBefore = h.ctx.state.log.length;
  h.ctx.commit("goblin moves away", (s) =>
    beginMovement(s, { id: "mv-1", actorId: "gob-1", point: { x: 600, y: 380 } }, "dm"),
  );
  const reaction = (h.ctx.state.combatReactions ?? []).find(
    (r) => r.type === "opportunity" && r.actorId === "livia",
  );
  assert.ok(reaction, "an opportunity was offered to Livia");
  assert.equal(reaction.status, "used", "the policy answered it");
  assert.equal(reaction.resolvedBy, "player");
  assert.equal(h.ctx.state.actors.livia.reaction, false);
  const oa = h.ctx.state.combatAttempts.find((a) => a.reactionId === reaction.id);
  assert.equal(oa.mode, "digital");
  assert.ok(oa.requests[0].status === "resolved", "digital attack rolled");
  assert.ok(h.ctx.state.log.slice(rollsBefore).some((l) => /politica|policy/i.test(l.label)));
  // Off: a Shield offer is declined without spending the reaction.
  const h2 = harness();
  prepare(h2, { goblins: 1, hiddenLast: false });
  start(h2);
  h2.ctx.role = "player";
  cmd(h2, "off", (s, sl) => D.setPolicy(s, sl, "livia", "shield", "off", "player"));
  endTurn(h2, "player");
  h2.ctx.role = "dm";
  let attempt;
  h2.ctx.commit("attack", (s) => {
    attempt = beginAttempt(
      s,
      {
        id: "g-atk",
        actorId: "gob-1",
        actionId: "melee-attack",
        selection: { targetIds: ["livia"] },
        mode: "physical",
      },
      "dm",
    );
  });
  h2.ctx.commit("roll", (s) => resolveRoll(s, "g-atk", attempt.requests[0].id, [19], "dm"));
  const shield = h2.ctx.state.combatReactions.find((r) => r.type === "shield");
  assert.equal(shield.status, "declined");
  assert.equal(h2.ctx.state.actors.livia.reaction, true, "declining does not spend the reaction");
  assert.equal(
    projectReactions(h2.ctx.state, "player").filter((r) => r.status === "pending").length,
    0,
  );
});

test("Ready: the action is spent now with a declared trigger; the reaction takes the readied attack; expiry at the next turn", () => {
  const h = harness();
  prepare(h, { goblins: 1, hiddenLast: false });
  start(h);
  h.ctx.role = "player";
  assert.throws(
    () =>
      cmd(h, "no trigger", (s, sl) =>
        D.readyAction(
          s,
          sl,
          "livia",
          { response: "quarterstaff", trigger: "custom", text: "" },
          "player",
        ),
      ),
    /perceivable/,
  );
  cmd(h, "ready", (s, sl) =>
    D.readyAction(s, sl, "livia", { response: "quarterstaff", trigger: "enters-reach" }, "player"),
  );
  assert.equal(h.ctx.state.actors.livia.action, false);
  assert.equal(h.slice().readied.livia.status, "held");
  endTurn(h, "player"); // Goblin A's turn
  let result;
  cmd(h, "fire", (s, sl) => {
    result = D.resolveReady(
      s,
      sl,
      "livia",
      { decision: "use", targetId: "gob-1", mode: "physical" },
      "player",
    );
  });
  const attempt = h.ctx.state.combatAttempts.find((a) => a.id === result.attemptId);
  assert.equal(attempt.actorId, "livia");
  assert.equal(attempt.actionId, "quarterstaff");
  assert.equal(h.ctx.state.actors.livia.reaction, false);
  assert.equal(h.ctx.state.actors.livia.action, false);
  assert.equal(current(h), "gob-1", "the turn is unchanged");
  assert.equal(h.slice().readied.livia.status, "used");
  // A second readied action expires at the start of Livia's next turn.
  const h2 = harness();
  prepare(h2, { goblins: 1, hiddenLast: false });
  start(h2);
  h2.ctx.role = "player";
  cmd(h2, "ready", (s, sl) =>
    D.readyAction(
      s,
      sl,
      "livia",
      { response: "move", trigger: "custom", text: "Se il goblin apre la porta" },
      "player",
    ),
  );
  const turns = h2.ctx.state.combat.order.length;
  for (let i = 0; i < turns; i++) endTurn(h2);
  assert.equal(current(h2), "livia");
  assert.equal(h2.slice().readied.livia.status, "expired");
  assert.ok(h2.slice().combat.events.some((e) => e.kind === "ready-expired"));
});

test("finish encounter: XP of the defeated through the Loot area, loot parcels, log; Reset and Clear", () => {
  const h = harness();
  prepare(h, { goblins: 2, hiddenLast: false });
  start(h);
  cmd(h, "defeat", (s, sl) => D.setDefeated(s, sl, "gob-1", true, "dm"));
  cmd(h, "defeat2", (s, sl) => D.setDefeated(s, sl, "gob-2", true, "dm"));
  const summary = D.encounterSummary(h.ctx.state, h.slice(), {
    lootSlice: h.ctx.state.ext.loot,
    party: [],
  });
  assert.equal(summary.defeated.length, 2);
  assert.equal(summary.xpTotal, 100, "Goblin Warrior CR 1/4: 50 XP each");
  // Reset first: back to round 1, HP restored, a new encounter identity.
  h.ctx.commit("hurt", (s) => {
    s.actors["gob-1"].hp = 3;
  });
  endTurn(h);
  const encounterId = h.ctx.state.combat.encounterId;
  cmd(h, "reset", (s, sl) => D.resetEncounter(s, sl, "dm"));
  assert.equal(h.ctx.state.combat.round, 1);
  assert.equal(current(h), "livia");
  assert.notEqual(h.ctx.state.combat.encounterId, encounterId);
  assert.equal(h.ctx.state.actors["gob-1"].hp, h.ctx.state.actors["gob-1"].maxHp);
  cmd(h, "defeat again", (s, sl) => {
    D.setDefeated(s, sl, "gob-1", true, "dm");
    D.setDefeated(s, sl, "gob-2", true, "dm");
  });
  // Finish through the dialog (DM): XP split among the present party, parcels prepared.
  const view = mount(UI.renderTracker(h.ctx, {}), (el) => UI.bindTracker(el, h.ctx, table(h)));
  view.click("[data-ct-finish]");
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /100/);
  const xpBefore = h.ctx.state.actors.livia.xp;
  dialog.options.onSubmit(
    form([
      ["awardXp", "on"],
      ["recipient", "livia"],
      ["recipient", "doran"],
      ["recipient", "mira"],
      ["prepareLoot", "on"],
    ]),
  );
  const s = h.ctx.state;
  assert.equal(s.combat.active, false);
  const record = h.slice().history.at(-1);
  assert.equal(record.xpAwarded, 100);
  assert.ok(
    Number.isInteger(s.actors.livia.xp) && s.actors.livia.xp > (xpBefore ?? 0),
    "XP on the sheet",
  );
  assert.equal(record.parcels.length, 2);
  assert.ok(s.ext.loot.parcels.some((p) => p.sourceActorId === "gob-1" && p.items.length));
  assert.ok(s.log.some((l) => /Incontro concluso/.test(l.label)));
  // Clear: nobody stays in the order and the prepared encounter is emptied.
  prepare(h, { goblins: 0, hiddenLast: false });
  start(h);
  cmd(h, "clear", (st, sl) => D.clearEncounter(st, sl, "dm"));
  assert.equal(h.ctx.state.combat.active, false);
  assert.deepEqual(h.ctx.state.combat.order, []);
  assert.deepEqual(h.ctx.state.scenes[0].encounter.participants, []);
});

test("automation: skip defeated and hidden, reveal at the first turn, stop at round start, turn timer", () => {
  const h = harness();
  prepare(h, { goblins: 3, hiddenLast: true });
  start(h);
  cmd(h, "settings", (s, sl) => {
    D.setSetting(s, sl, "skipDefeated", true, "dm");
    D.setSetting(s, sl, "skipHidden", true, "dm");
    D.setSetting(s, sl, "stopAtRoundStart", true, "dm");
    D.setSetting(s, sl, "timer", true, "dm");
    D.setDefeated(s, sl, "gob-2", true, "dm");
  });
  endTurn(h); // Goblin A
  assert.equal(current(h), "gob-1");
  assert.ok(h.slice().combat.turnStartedAt);
  endTurn(h); // B defeated and C hidden are skipped
  assert.equal(current(h), "doran");
  while (h.ctx.state.combat.round === 1) endTurn(h);
  assert.equal(h.slice().combat.roundHold, 2, "the DM's round-start checkpoint");
  h.ctx.role = "player";
  assert.equal(D.turnAlertFor(h.ctx.state, h.slice(), "player").kind, "hold");
  assert.throws(() => cmd(h, "p", (s, sl) => D.startHeldRound(s, sl, "player")), /DM/);
  h.ctx.role = "dm";
  cmd(h, "go", (s, sl) => D.startHeldRound(s, sl, "dm"));
  assert.equal(h.slice().combat.roundHold, null);
  // Monk's: a hidden enemy is revealed at its first turn.
  const h2 = harness();
  prepare(h2, { goblins: 2, hiddenLast: true });
  cmd(h2, "reveal opt", (s, sl) => D.setSetting(s, sl, "revealAtFirstTurn", true, "dm"));
  start(h2);
  endTurn(h2);
  endTurn(h2);
  assert.equal(current(h2), "gob-2");
  assert.equal(h2.ctx.state.scenes[0].tokens.find((t) => t.actorId === "gob-2").hidden, false);
  assert.equal(h2.ctx.state.actors["gob-2"].name, "Goblin B");
});

test("interface: DM and player tracker markup, menu, pending lane and next turn through bind", () => {
  const h = harness();
  prepare(h, { goblins: 3, hiddenLast: true });
  start(h);
  const dmHtml = UI.renderTracker(h.ctx, {});
  assert.match(dmHtml, /Goblin A/);
  assert.match(dmHtml, /data-ct-row="gob-3"/, "the DM sees the hidden goblin");
  assert.match(dmHtml, /Nascosta/);
  h.ctx.role = "player";
  const playerHtml = UI.renderTracker(h.ctx, {});
  assert.doesNotMatch(playerHtml, /data-ct-row="gob-3"/, "hidden never leaks to the player");
  assert.doesNotMatch(playerHtml, /data-ct-finish/);
  assert.match(playerHtml, /Le tue reazioni/);
  // The player prepares an action from the current row.
  const pv = mount(playerHtml, (el) => UI.bindTracker(el, h.ctx, table(h)));
  pv.click('[data-ct-ready="livia"]');
  h.dialogs.at(-1).options.onSubmit(
    form([
      ["response", "fire-bolt"],
      ["trigger", "enters-reach"],
    ]),
  );
  assert.equal(h.slice().readied.livia.response.actionId, "fire-bolt");
  // Next turn from the tracker (the current creature's controller).
  const pv2 = mount(UI.renderTracker(h.ctx, {}), (el) => UI.bindTracker(el, h.ctx, table(h)));
  pv2.click("[data-ct-next]");
  assert.equal(current(h), "gob-1");
  // DM: the row menu (Foundry), right-click opens it, "Remove from combat" works.
  h.ctx.role = "dm";
  let dv = mount(UI.renderTracker(h.ctx, {}), (el) => UI.bindTracker(el, h.ctx, table(h)));
  dv.root.querySelector('[data-ct-row="gob-2"]').fire("contextmenu");
  dv = mount(UI.renderTracker(h.ctx, {}), (el) => UI.bindTracker(el, h.ctx, table(h)));
  assert.ok(dv.root.querySelector('[data-ct-cmd="remove"][data-actor="gob-2"]'));
  dv.click('[data-ct-cmd="remove"][data-actor="gob-2"]');
  assert.ok(!h.ctx.state.combat.order.includes("gob-2"));
  // Pending lane: the removed goblin rejoins through the + button, a digital roll, Add.
  dv = mount(UI.renderTracker(h.ctx, {}), (el) => UI.bindTracker(el, h.ctx, table(h)));
  dv.click('[data-ct-join="gob-2"]');
  dv = mount(UI.renderTracker(h.ctx, {}), (el) => UI.bindTracker(el, h.ctx, table(h)));
  assert.match(UI.renderTracker(h.ctx, {}), /In attesa di entrare/);
  dv.click('[data-ct-pending-roll="gob-2"]');
  dv = mount(UI.renderTracker(h.ctx, {}), (el) => UI.bindTracker(el, h.ctx, table(h)));
  dv.click("[data-ct-pending-add]");
  assert.ok(h.ctx.state.combat.order.includes("gob-2"));
  // English labels.
  h.ctx.lang = "en";
  assert.match(UI.renderTracker(h.ctx, {}), /Finish encounter/);
});

test("reaction policy box on the sheet follows BG3: Active + Ask every time", () => {
  const h = harness();
  h.ctx.role = "player";
  const actor = h.ctx.state.actors.livia;
  const section = h.registry
    .list("sheet-section", h.ctx, actor)
    .find((c) => c.id === "combat-tracker-reactions");
  assert.ok(section);
  assert.equal(
    h.registry
      .list("sheet-section", h.ctx, h.ctx.state.actors.doran)
      .some((c) => c.id === "combat-tracker-reactions"),
    false,
  );
  const html = section.render(h.ctx, actor);
  assert.match(html, /Scudo/);
  assert.match(html, /Attacco di opportunità/);
  const view = mount(html, (el) => section.bind(el, h.ctx, actor));
  const ask = view.root.querySelector('[data-ct-policy-ask="opportunity"]');
  ask.checked = false;
  ask.fire("change");
  assert.equal(D.policyOf(h.ctx.state, "livia", "opportunity"), "auto");
  const on = view.root.querySelector('[data-ct-policy-on="shield"]');
  on.checked = false;
  on.fire("change");
  assert.equal(D.policyOf(h.ctx.state, "livia", "shield"), "off");
  h.reload();
  assert.equal(D.policyOf(h.ctx.state, "livia", "opportunity"), "auto", "persists after reload");
});

test("map layers: turn marker under the shown current token, out-of-combat marker; mob tool only in combat", () => {
  const h = harness();
  prepare(h, { goblins: 2, hiddenLast: true });
  const tool = () =>
    h.registry.list("table-tool", h.ctx, {}).some((c) => c.id === "combat-tracker-mob");
  assert.equal(tool(), false);
  start(h);
  assert.equal(tool(), true);
  const scene = h.ctx.state.scenes[0];
  const marker = h.registry.get("map-layer", "combat-tracker-marker");
  assert.match(marker.svg(h.ctx, { scene }), /data-ct-marker="livia"/);
  endTurn(h);
  endTurn(h); // hidden Goblin (gob-2) current
  assert.match(marker.svg(h.ctx, { scene }), /data-ct-marker="gob-2"/);
  h.ctx.role = "player";
  assert.match(
    marker.svg(h.ctx, { scene }),
    /data-ct-marker="gob-1"/,
    "the player's marker stays on the previous one",
  );
  h.ctx.role = "dm";
  cmd(h, "remove", (s, sl) => D.removeFromCombat(s, sl, "gob-1", "dm"));
  const out = h.registry.get("map-layer", "combat-tracker-out");
  assert.match(out.svg(h.ctx, { scene: h.ctx.state.scenes[0] }), /data-ct-out="gob-1"/);
});

test("reload keeps the tracker state; offline refuses shared tracker changes", () => {
  const h = harness();
  prepare(h, { goblins: 2, hiddenLast: false });
  start(h);
  cmd(h, "entry", (s, sl) =>
    D.saveEntry(s, sl, { name: "Azione di tana", init: 20, kind: "reminder" }, "dm"),
  );
  h.reload();
  assert.equal(h.slice().entries[0].name, "Azione di tana");
  assert.equal(h.ctx.state.actors["gob-1"].name, "Goblin A");
  h.ctx.offline = true;
  const view = mount(UI.renderTracker(h.ctx, {}), (el) => UI.bindTracker(el, h.ctx, table(h)));
  view.click("[data-ct-next]");
  assert.ok(h.toasts.at(-1).error);
  assert.equal(current(h), "livia");
});

test("recharge prefill from an SRD block ('Recharge 5–6') and DM notifications for due recharges", () => {
  const h = harness();
  prepare(h, { goblins: 1, hiddenLast: false });
  h.ctx.commit("dragon", (s) => {
    const entry = data.getEntry("srd2024:creature:young-green-dragon");
    const { input, patch } = data.npcFromCreature(entry, {
      id: "drake",
      name: "Drago verde giovane",
      team: "watch",
    });
    Object.assign(createSceneNPC(s, input, "dm"), patch);
    placeSceneToken(s, "old-watch", "drake", { x: 700, y: 500 }, "token-drake", "dm");
    s.scenes[0].encounter.participants.push(row("drake", 5, 1));
  });
  const fromBlock = D.blockRecharges(h.ctx.state, "drake");
  assert.deepEqual(
    fromBlock.map((r) => [r.id, r.min, r.max]),
    [["poison-breath", 5, 6]],
  );
  start(h);
  cmd(h, "config", (s, sl) =>
    D.configureMonster(
      s,
      sl,
      "drake",
      { recharge: fromBlock.map((r) => ({ ...r, name: r.name.it })), diceMode: "physical" },
      "dm",
    ),
  );
  assert.equal(h.slice().monsters.drake.source.kind, "srd", "an SRD recharge keeps its source");
  cmd(h, "used", (s, sl) => D.markRechargeUsed(s, sl, "drake", "poison-breath", "dm"));
  while (current(h) !== "drake") endTurn(h);
  const notices = h.registry.notifications(h.ctx).map((n) => n.title.it);
  assert.ok(notices.some((t) => /tira la ricarica/.test(t)));
  assert.match(UI.currentAlert(h.ctx).text, /tira la ricarica di Soffio di veleno/);
});

// ---------------------------------------------------------------- review B32-rf

test("review: a readied move lets the creature move once as its Reaction, never act out of turn", () => {
  const h = harness();
  prepare(h, { goblins: 1, hiddenLast: false });
  start(h);
  h.ctx.role = "player";
  assert.match(
    UI.renderTracker(h.ctx, {}),
    /data-ct-next>Termina turno</,
    "players end their own turn (Foundry)",
  );
  cmd(h, "ready", (s, sl) =>
    D.readyAction(
      s,
      sl,
      "livia",
      { response: "move", trigger: "custom", text: "Se il goblin apre la porta" },
      "player",
    ),
  );
  endTurn(h, "player"); // Goblin A's turn
  const move = (id, x) => (s) =>
    beginMovement(s, { id, actorId: "livia", point: { x, y: 380 } }, "player");
  assert.throws(() => move("m-early", 200)(structuredClone(h.ctx.state)), /turn/);
  cmd(h, "fire", (s, sl) => D.resolveReady(s, sl, "livia", { decision: "use" }, "player"));
  assert.equal(h.slice().readied.livia.status, "moving");
  assert.equal(h.ctx.state.actors.livia.reaction, false, "the Reaction is spent");
  assert.equal(D.readiedMoveOpen(h.ctx.state, "livia"), true);
  // Only movement is shared: an action or a Dash stays "not your turn".
  const dodge = previewAction(h.ctx.state, "livia", "dodge", {}, "player");
  assert.ok(dodge.reasons.some((r) => r.code === "not-your-turn"));
  h.ctx.commit("move", move("m-ready", 200));
  assert.ok(h.ctx.state.movements.some((m) => m.id === "m-ready" && m.actorId === "livia"));
  assert.equal(D.readiedMoveOpen(h.ctx.state, "livia"), false, "one move per Reaction");
  assert.throws(() => move("m-again", 150)(structuredClone(h.ctx.state)), /turn/);
  // The tracker row says what happens now.
  h.ctx.commit("undo-like", (s) => {
    s.movements = s.movements.filter((m) => m.id !== "m-ready");
  });
  assert.match(UI.renderTracker(h.ctx, {}), /data-ct-ready-moving="livia"/);
  endTurn(h);
  assert.equal(h.slice().readied.livia.status, "used", "the window closes with the turn");
  assert.equal(D.readiedMoveOpen(h.ctx.state, "livia"), false);
});

test("review: a hidden creature's turn changes neither the player's alert key, timer nor round", () => {
  const h = harness();
  // An ambusher with the highest initiative, hidden: it opens every round.
  prepare(h, { goblins: 1, hiddenLast: false });
  h.ctx.commit("ambusher", (s) => {
    addGoblin(s, "gob-9", "Imboscato", { x: 700, y: 300 }, { hidden: true });
    const parts = s.scenes[0].encounter.participants;
    // Order: the ambusher, Livia, Goblin, Doran, Mira, then the Sentinella closes the round.
    parts.unshift(row("gob-9", 19, 1));
    parts.push(
      ...parts.splice(
        parts.findIndex((p) => p.actorId === "goblin-1"),
        1,
      ),
    );
  });
  start(h);
  cmd(h, "timer", (s, sl) => D.setSetting(s, sl, "timer", true, "dm"));
  assert.equal(current(h), "gob-9");
  while (current(h) !== "goblin-1") endTurn(h);
  const before = D.turnAlertFor(h.ctx.state, h.slice(), "player");
  assert.equal(before.kind, "next");
  const shownBefore = D.shownTurn(h.ctx.state, "player");
  const startedBefore = D.turnStartedFor(h.ctx.state, h.slice(), "player");
  assert.ok(startedBefore, "the player's timer runs from the Sentinella's turn");
  const noticesFor = (role) => {
    h.ctx.role = role;
    const ids = h.registry.notifications(h.ctx).map((n) => n.id);
    h.ctx.role = "dm";
    return ids;
  };
  const noticesBefore = noticesFor("player");
  assert.ok(noticesBefore.some((id) => /ct-next/.test(id)));
  endTurn(h); // round 2 opens with the hidden ambusher
  assert.equal(current(h), "gob-9");
  assert.equal(h.ctx.state.combat.round, 2);
  const after = D.turnAlertFor(h.ctx.state, h.slice(), "player");
  assert.equal(after.key, before.key, "no second 'you're next' alert");
  assert.deepEqual(D.shownTurn(h.ctx.state, "player"), shownBefore);
  assert.equal(D.shownTurn(h.ctx.state, "player").round, 1, "the player's round stays 1");
  assert.equal(D.turnStartedFor(h.ctx.state, h.slice(), "player"), startedBefore);
  h.ctx.role = "player";
  const html = UI.renderTracker(h.ctx, {});
  assert.match(html, /Turno di <span data-ct-turn>Sentinella</);
  assert.doesNotMatch(html, /data-ct-next/, "not the player's turn: no button hints at it");
  h.ctx.role = "dm";
  assert.deepEqual(noticesFor("player"), noticesBefore, "the bell gets no new notice");
  assert.match(UI.renderTracker(h.ctx, {}), /Turno di <span data-ct-turn>Imboscato</);
});

test("review: hidden creatures stay out of a group turn (they act on their own hidden turn)", () => {
  const h = harness();
  prepare(h, { goblins: 3, hiddenLast: true });
  start(h);
  cmd(h, "on", (s, sl) =>
    D.setGroupTurns(s, sl, true, { title: "Turno di gruppo", text: "x" }, "dm"),
  );
  const s = h.ctx.state;
  assert.deepEqual(D.groupMembers(s, h.slice(), "gob-1"), ["gob-1", "gob-2"]);
  assert.deepEqual(D.groupMembers(s, h.slice(), "gob-3"), []);
  endTurn(h);
  assert.deepEqual(h.slice().combat.groupTurn.memberIds, ["gob-1", "gob-2"]);
  endTurn(h);
  assert.equal(current(h), "gob-3", "the hidden goblin keeps its own turn");
});

test("review (non-defect): letters stay after Finish so loot parcels named after the creatures stay distinct", () => {
  // DDB End Combat clears the suffixes (DDB-137); here the Loot area (B26) titles a parcel
  // with its creature's current name, so clearing them would show "Bottino: Goblin" twice.
  const h = harness();
  prepare(h, { goblins: 2, hiddenLast: false });
  start(h);
  cmd(h, "defeat", (s, sl) => {
    D.setDefeated(s, sl, "gob-1", true, "dm");
    D.setDefeated(s, sl, "gob-2", true, "dm");
  });
  const view = mount(UI.renderTracker(h.ctx, {}), (el) => UI.bindTracker(el, h.ctx, table(h)));
  view.click("[data-ct-finish]");
  h.dialogs.at(-1).options.onSubmit(form([["prepareLoot", "on"]]));
  const s = h.ctx.state;
  assert.equal(s.combat.active, false);
  assert.deepEqual(names(h, ["gob-1", "gob-2"]), ["Goblin A", "Goblin B"]);
  const titles = s.ext.loot.parcels
    .filter((p) => ["gob-1", "gob-2"].includes(p.sourceActorId))
    .map((p) => parcelTitle(s, p, "it", "dm"));
  assert.equal(new Set(titles).size, 2, titles.join(" / "));
});

test("review: editing a countdown's text keeps the rounds already elapsed", () => {
  const h = harness();
  prepare(h, { goblins: 1, hiddenLast: false });
  cmd(h, "entry", (s, sl) =>
    D.saveEntry(s, sl, { name: "Il soffitto crolla", init: 20, rounds: 3 }, "dm"),
  );
  start(h);
  while (h.ctx.state.combat.round < 2) endTurn(h);
  const entry = h.slice().entries[0];
  assert.equal(entry.remaining, 2);
  cmd(h, "edit", (s, sl) =>
    D.saveEntry(
      s,
      sl,
      { id: entry.id, name: "Il soffitto crolla!", init: 20, rounds: 3, note: "polvere" },
      "dm",
    ),
  );
  assert.equal(h.slice().entries[0].remaining, 2, "text edits keep the count");
  cmd(h, "edit rounds", (s, sl) =>
    D.saveEntry(s, sl, { id: entry.id, name: "Il soffitto crolla!", init: 20, rounds: 5 }, "dm"),
  );
  assert.equal(h.slice().entries[0].remaining, 5, "a new length restarts it");
});

test("review: the BG3 Reactions box lists what each reaction costs (CRP-138)", () => {
  const h = harness();
  h.ctx.role = "player";
  const actor = h.ctx.state.actors.livia;
  const section = h.registry
    .list("sheet-section", h.ctx, actor)
    .find((c) => c.id === "combat-tracker-reactions");
  assert.match(section.render(h.ctx, actor), /Reazione \+ slot di 1° livello o superiore/);
  h.ctx.lang = "en";
  const html = section.render(h.ctx, actor);
  assert.match(html, /Reaction \+ a level 1\+ spell slot/);
  assert.equal((html.match(/data-ct-policy-cost/g) ?? []).length, 2);
});
