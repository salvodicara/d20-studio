// P3 fix package: the game log (TV-87, TV-97, TV-92, TV-141, X-02), the one HP control
// (PG-21, PG-22), the death-save box (PG-27), quick conditions (PG-28), Concentration
// (TV-79), bell answers (TV-69), the damage card's tray (TV-68) and spell effects (TV-125).
// Pure projections, render functions and commands on the real store; synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as chat from "../chat-domain.mjs";
import * as chatUI from "../chat.mjs";
import * as trayDomain from "../dice-tray-domain.mjs";
import * as tray from "../dice-tray.mjs";
import * as requests from "../roll-requests.mjs";
import * as damage from "../damage-domain.mjs";
import * as damageTray from "../damage-tray.mjs";
import * as conditionsUI from "../conditions-ui.mjs";
import * as conditions from "../conditions.mjs";
import { hpWidgetHTML } from "../hp-widget.mjs";

const scripted = (...values) => {
  const queue = [...values];
  return (sides) => {
    const value = queue.shift();
    assert.ok(Number.isInteger(value) && value >= 1 && value <= sides, `bad face for d${sides}`);
    return value;
  };
};
const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
// Minimal DOM stand-in: buttons and inputs with attributes, dataset and listeners.
function parse(html) {
  const nodes = [...html.matchAll(/<(input|button|select)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g)].map(
    ([, tag, raw, inner]) => {
      const attrs = Object.fromEntries(
        [...raw.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
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
        addEventListener(name, fn) {
          events[name] = fn;
        },
      };
    },
  );
  return {
    querySelectorAll(selector) {
      const m = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
      return m
        ? nodes.filter((n) => m[1] in n.attrs && (m[2] === undefined || n.attrs[m[1]] === m[2]))
        : [];
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
  };
}
const click = (root, selector) => {
  const node = root.querySelector(selector);
  assert.ok(node, "missing " + selector);
  node.events.click({ preventDefault() {} });
};
function context({ role = "player", lang = "it", registry = null } = {}) {
  const store = createStore();
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    esc,
    registry,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    icon: () => "",
    toast: (text, error) => toasts.push({ text, error }),
    dialog() {},
    closeDialog() {},
    render() {},
    canControl: () => true,
    conditionActor: (id, s = store.state) => structuredClone(s.actors[id]),
    conditionRolls: () => [],
    applyConditionFollowUps: (s, r) => r,
    commit(label, mutate, options = {}) {
      store.commit(label, mutate, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      return { applied: true, persisted: true };
    },
  };
  return { ctx, store, toasts };
}

// ---------------------------------------------------------------- the log (X-02, TV-141)

test("X-02: the DM's service lines stay out of the players' log; table events stay", () => {
  const s = createInitialState();
  const entry = (id, label, controller, extra = {}) => ({
    id,
    time: `2026-09-26T10:0${id}:00.000Z`,
    label,
    controller,
    ...extra,
  });
  s.log = [
    entry("1", "Conto alla rovescia impostato", "dm"),
    entry("2", "Riposo aggiornato", "dm"),
    entry("3", "Modificatore preparato: Nebbia fitta -2", "dm"),
    entry("4", "Riposo aggiornato", "player"),
    entry("5", "Danno: Sentinella 3", "dm"),
  ];
  const player = chat.projectLog(s, "player").map((i) => i.label);
  assert.deepEqual(player, ["Riposo aggiornato", "Danno: Sentinella 3"]);
  assert.equal(chat.projectLog(s, "dm").length, 5, "the DM keeps every line");
});

test("TV-141: a hidden identity leaves no trace: old lines and rolls read the disguise", () => {
  const s = createInitialState();
  s.log = [
    {
      id: "a",
      time: "2026-09-26T10:00:00.000Z",
      label: "Sentinella · Furtività 11",
      controller: "dm",
      rolls: [{ actorName: "Sentinella", kind: "check", values: [9], modifier: 2, total: 11 }],
    },
  ];
  // The knowledge area's record while the Sentinel wears the alias.
  s.ext = { ...(s.ext ?? {}), knowledge: { identities: { "goblin-1": { alias: "Figura", trueName: "Sentinella" } } } };
  s.actors["goblin-1"].name = "Figura";
  const [item] = chat.projectLog(s, "player");
  assert.equal(item.label, "Figura · Furtività 11");
  assert.equal(item.rolls[0].actorName, "Figura");
  assert.equal(chat.projectLog(s, "dm")[0].label, "Sentinella · Furtività 11");
  assert.equal(conditions.maskNames("La Sentinellaria", conditions.disguises(s)), "La Sentinellaria");
});

// ---------------------------------------------------------------- roll cards (TV-87, TV-97)

test("TV-87/97: the log card keeps the rule, strikes dropped dice, counts successes and names privacy", () => {
  const s = createInitialState();
  const slice = trayDomain.seedSlice();
  const kh = trayDomain.recordRoll(slice, s, { formula: "4d6kh3", audience: "public" }, "player", {
    draw: scripted(4, 1, 6, 2),
  });
  const kept = trayDomain.rollEvent(kh);
  assert.equal(kept.formula, "4d6kh3");
  assert.deepEqual(
    kept.faces.map((f) => [f.value, f.kept]),
    [
      [4, true],
      [1, false],
      [6, true],
      [2, true],
    ],
  );
  const cs = trayDomain.recordRoll(slice, s, { formula: "10d6cs>=5" }, "player", {
    draw: scripted(5, 6, 1, 2, 3, 5, 4, 1, 6, 2),
  });
  assert.equal(trayDomain.rollEvent(cs).successes, 4);
  const gm = trayDomain.recordRoll(slice, s, { formula: "1d20", audience: "gm" }, "player", {
    draw: scripted(12),
  });
  const { ctx } = context({ role: "dm" });
  // The chat reads a tray roll through its log line (W2b1 `rollFor`, the tray's audience).
  const records = [kh, cs, gm];
  const log = records.map((record, i) => ({
    id: "e" + i,
    time: `2026-09-26T10:0${i}:00.000Z`,
    label: "tray roll " + i,
    controller: "player",
  }));
  const rollFor = (entry) => trayDomain.rollEvent(records[Number(entry.id.slice(1))]);
  const html = chat
    .projectLog({ ...s, log }, "dm", { rollFor })
    .map((item) => chatUI.itemHTML(ctx, item))
    .join("");
  assert.match(html, /<s class="chat-die is-dropped"[^>]*>1<\/s>/);
  assert.match(html, /data-chat-roll-rule>4d6kh3/);
  assert.match(html, /→ 4 successi/);
  assert.match(html, /data-chat-privacy>Io e il DM/);
  assert.match(html, /<details class="chat-roll-more"/);
});

test("TV-87: a tray correction is folded into its card, not a separate line", () => {
  const s = createInitialState();
  s.log = [
    { id: "r", time: "2026-09-26T10:00:00.000Z", label: "Livia · 1d20: …", controller: "player" },
    {
      id: "c",
      time: "2026-09-26T10:01:00.000Z",
      label: "Correzione del tiro: Livia 1d20 · avevo letto male",
      controller: "player",
    },
  ];
  const rollFor = (entry) => (entry.id === "r" ? { kind: "free", values: [4], total: 4 } : null);
  const items = chat.projectLog(s, "player", { rollFor });
  assert.deepEqual(
    items.map((i) => i.type),
    ["rolls"],
  );
});

// ---------------------------------------------------------------- requests (TV-92)

test("TV-92: the DM's request line is a card with «Tira» for the player it asks", () => {
  const s = createInitialState();
  const label = "Richiesta del DM: TS Destrezza CD 13 → Livia";
  requests.createRequest(
    s,
    { kind: "save", ability: "dex", dc: 13, actorIds: ["livia"] },
    "dm",
    { id: "g1", logLabel: label },
  );
  s.log = [{ id: "q", time: "2026-09-26T10:00:00.000Z", label, controller: "dm" }];
  const groups = requests.requestGroups(s, trayDomain.seedSlice(), "player");
  assert.equal(groups[0].logLabel, label);
  const requestFor = (entry) => {
    const g = groups.find((group) => group.logLabel === entry.label);
    return g
      ? {
          title: "TS Destrezza CD 13",
          summary: g.summary,
          rows: g.rows.map((r) => ({ ...r, name: r.name, canRoll: r.canRoll })),
        }
      : null;
  };
  const [item] = chat.projectLog(s, "player", { requestFor });
  assert.equal(item.type, "request");
  const { ctx } = context();
  const html = chatUI.itemHTML(ctx, item);
  assert.match(html, /data-chat-roll-action="request"/);
  assert.match(html, />Tira</);
});

// ---------------------------------------------------------------- one HP control

function hpState() {
  const s = createInitialState();
  s.ext = { ...(s.ext ?? {}), [damage.ID]: damage.seedSlice() };
  return s;
}

test("PG-21: «Correggi» corrects current, maximum and temporary HP with a reason, one log with Undo", () => {
  const s = hpState();
  assert.throws(() => damage.correctVitals(s, "livia", { hp: 17 }, "player"), /reason/i);
  assert.throws(
    () => damage.correctVitals(s, "livia", { hp: 0, reason: "x" }, "player"),
    (e) => /Danno|Damage/.test(e.it + e.en),
  );
  damage.correctVitals(s, "livia", { hp: "17", tempHp: "3", reason: "Contato male" }, "player");
  assert.deepEqual([s.actors.livia.hp, s.actors.livia.tempHp], [17, 3]);
  const [entry] = damage.hpLog(s, "livia", "player");
  assert.equal(entry.kind, "vitality-correct");
  assert.equal(entry.reason, "Contato male");
  assert.equal(entry.canRevert, true);
});

test("PG-22: the widget carries cause and Critical Hit; at 0 HP a critical counts two failures", () => {
  const s = hpState();
  Object.assign(s.actors.livia, { hp: 1 });
  conditions.applyVitalityEvent(s, {
    eventId: "drop",
    actorId: "livia",
    kind: "damage",
    amount: 1,
    source: { kind: "authored", edition: "2024", revision: "t" },
  });
  damage.manualChange(
    s,
    "livia",
    { kind: "damage", amount: 2, note: "Pugnale", critical: true, surface: "sheet" },
    "player",
  );
  assert.equal(s.actors.livia.deathSaves.failures, 2);
  assert.match(damage.hpLog(s, "livia", "player")[0].reason, /Pugnale/);
  const { ctx } = context();
  ctx.state.actors.livia.hp = 10;
  const html = hpWidgetHTML(ctx, "livia", { surface: "token" });
  assert.match(html, /data-dt-note="livia"/);
  assert.match(html, /data-dt-critical="livia"/);
  assert.match(html, /data-dt-details="correct"/);
  // SV-24: every field of the widget sits inside its label (an accessible name).
  for (const input of html.match(/<input[^>]*>/g)) {
    const before = html.slice(0, html.indexOf(input));
    const open = before.lastIndexOf("<label");
    const closed = before.lastIndexOf("</label>");
    assert.ok(open > closed || /aria-label=/.test(input), "unlabelled input: " + input);
  }
});

// ---------------------------------------------------------------- death saves and conditions

test("PG-27: at 0 HP the box offers the roll, Stabilize and «Riporta a 1 PF»; Dead is explicit", () => {
  const { ctx, store } = context();
  const livia = store.state.actors.livia;
  conditions.applyVitalityEvent(store.state, {
    eventId: "drop",
    actorId: "livia",
    kind: "damage",
    amount: livia.hp,
    source: { kind: "authored", edition: "2024", revision: "t" },
  });
  const opened = [];
  ctx.beginConditionRoll = (input) => (opened.push(input), { descriptorId: "d1" });
  ctx.openConditionRoll = (id) => opened.push(id);
  let html = conditionsUI.renderConditionsSummary(ctx, "livia", { embedded: true });
  assert.match(html, /data-conditions-death-roll="livia"/);
  assert.match(html, /class="button primary" data-conditions-death-roll/);
  assert.match(html, /data-conditions-stabilize="livia"/);
  let root = parse(html);
  conditionsUI.bindConditionsSummary(root, ctx);
  click(root, "[data-conditions-death-roll]");
  assert.deepEqual(opened, [{ kind: "death-save", actorId: "livia" }, "d1"]);
  click(root, "[data-conditions-restore]");
  assert.equal(store.state.actors.livia.hp, 1, "«Riporta a 1 PF»");
  store.state.actors.livia.dead = true;
  html = conditionsUI.renderConditionsSummary(ctx, "livia", { embedded: true });
  assert.match(html, /data-conditions-deathbox="dead"/);
  assert.match(html, /Riporta in vita/);
});

test("PG-28: Exhaustion from the 1–6 segments (the current one lowers it) through the one engine", () => {
  const { ctx, store } = context();
  const html = conditionsUI.renderConditionsSummary(ctx, "livia", { embedded: true });
  assert.match(html, /data-conditions-quick-add="livia"/);
  let root = parse(html);
  conditionsUI.bindConditionsSummary(root, ctx);
  click(root, '[data-conditions-exhaustion-level="2"]');
  assert.equal(store.state.actors.livia.exhaustion, 2);
  root = parse(conditionsUI.renderConditionsSummary(ctx, "livia", { embedded: true }));
  conditionsUI.bindConditionsSummary(root, ctx);
  assert.equal(root.querySelector('[data-conditions-exhaustion-level="2"]').attrs["aria-pressed"], "true");
  click(root, '[data-conditions-exhaustion-level="2"]');
  assert.equal(store.state.actors.livia.exhaustion, 1, "the current level lowers by one");
});

test("TV-79: Concentration shows as (C) and damage asks the CON save with DC max(10, half)", () => {
  const s = hpState();
  s.actors.livia.concentration = {
    id: "conc-1",
    name: { it: "Benedizione", en: "Bless" },
    active: true,
    source: { kind: "manual", label: "t", revision: "t" },
  };
  damage.manualChange(s, "livia", { kind: "damage", amount: 4, surface: "sheet" }, "player");
  let request = s.combatAttempts.flatMap((a) => a.requests).find((r) => r.kind === "concentration");
  assert.equal(request.dc, 10);
  // 24 damage, 20 absorbed by Temporary HP: the save still uses the damage taken (DC 12).
  Object.assign(s.actors.livia, { hp: 22, tempHp: 20 });
  s.combatAttempts = [];
  damage.manualChange(s, "livia", { kind: "damage", amount: 24, surface: "sheet" }, "player");
  request = s.combatAttempts.flatMap((a) => a.requests).find((r) => r.kind === "concentration");
  assert.equal(request.dc, 12);
  const { ctx, store } = context();
  store.state.actors.livia.concentration = {
    id: "conc-2",
    name: { it: "Benedizione", en: "Bless" },
    active: true,
    source: { kind: "manual", label: "t", revision: "t" },
  };
  assert.match(
    conditionsUI.renderConditionsSummary(ctx, "livia", { embedded: true }),
    /\(C\) Benedizione/,
  );
});

// ---------------------------------------------------------------- bell and tray (TV-69, TV-68)

test("TV-69: the bell's proposal carries Accept, Decline and the tray; Accept applies in one click", () => {
  const registry = createRegistry({ document: undefined, logger: null });
  registry.use("damage-tray", damageTray.register);
  const { ctx, store } = context({ role: "dm", registry });
  registry.initState(store.state);
  registry.attach(ctx);
  store.commit("proposal", (d) =>
    damage.propose(d, { actorId: "goblin-1", kind: "damage", amount: 3, type: "fire" }, "player"),
    "player",
    { shared: true },
  );
  const [notice] = registry.notifications(ctx).filter((n) => n.id.startsWith("dt-prop-"));
  assert.deepEqual(
    notice.actions.map((a) => a.id),
    ["accept", "decline", "tray"],
  );
  const before = store.state.actors["goblin-1"].hp;
  notice.actions[0].run(ctx);
  assert.equal(store.state.actors["goblin-1"].hp, before - 3);
  assert.ok(registry.get("command", "damage-tray.global", ctx), "global DM tray command");
});

test("TV-68: a damage card in the log reaches the DM's tray", () => {
  const { ctx } = context({ role: "dm" });
  const html = chatUI.itemHTML(ctx, {
    type: "rolls",
    id: "log:x",
    at: "2026-09-26T10:00:00.000Z",
    rolls: [
      {
        ...chat
          .projectLog(
            {
              ...createInitialState(),
              log: [
                {
                  id: "x",
                  time: "2026-09-26T10:00:00.000Z",
                  label: "x",
                  controller: "dm",
                  rolls: [{ kind: "damage", attemptId: "att-1", values: [4], total: 4 }],
                },
              ],
            },
            "dm",
          )[0].rolls[0],
      },
    ],
  });
  assert.match(html, /data-chat-roll-action="damage-tray" data-chat-roll="att-1"/);
});

// ---------------------------------------------------------------- spell effects (TV-125)

test("TV-125: an area spell bursts, a cone fans and a sheet cast outside combat glows on the caster", () => {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const store = createStore({ storage });
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  registry.use("dice-tray", tray.register);
  registry.initState(store.state);
  const { ctx } = context({ registry });
  Object.defineProperty(ctx, "state", { get: () => store.state });
  registry.attach(ctx);
  const s = store.state;
  const scene = s.scenes.find((x) => x.id === s.activeSceneId);
  s.combatAttempts = [
    {
      id: "a1",
      actionId: "burning-hands",
      actorId: "livia",
      selection: { point: { x: 300, y: 300 } },
      geometry: { shape: "cone" },
      targets: [],
    },
    {
      id: "a2",
      actionId: "fireball",
      actorId: "livia",
      selection: { point: { x: 400, y: 300 } },
      geometry: { shape: "sphere" },
      targets: [],
    },
  ];
  registry.emit("roll-accepted", { roll: { source: "combat", attemptId: "a1" } });
  registry.emit("roll-accepted", { roll: { source: "combat", attemptId: "a2" } });
  const layer = registry.get("map-layer", "dice-tray-fx", ctx);
  let svg = layer.svg(ctx, { scene });
  assert.match(svg, /dtray-fx-cone dtray-fx-type-fire/);
  assert.match(svg, /dtray-fx-burst dtray-fx-type-fire/);
  s.ext["spells-plus"] = {
    casts: [{ id: "c1", actorId: "livia", entryId: "srd2024:spell:bless", at: new Date().toISOString() }],
  };
  registry.emit("commit", { id: "log-x", label: "cast" });
  svg = layer.svg(ctx, { scene });
  assert.match(svg, /dtray-fx-glow/);
});
