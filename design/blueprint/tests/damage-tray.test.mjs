// B33 — damage tray, HP widget, HP log, proposals and token health visuals: domain rules
// with the real store, combat engine, conditions domain and registry, plus the interface
// handlers (render + bind on a small DOM double). Synthetic data only: the lantern campaign,
// Livia, Doran, the Sentinella and the Esploratore, and an SRD Ghost (fire resistant,
// poison immune: SRD 5.2.1 EN 287–288 / IT 334).
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { beginAttempt, resolveRoll } from "../combat.mjs";
import { createSceneNPC, placeSceneToken } from "../preparation.mjs";
import { canControlActor } from "../character-access.mjs";
import { hasCondition } from "../conditions.mjs";
import * as data from "../srd-compendium.mjs";
import * as D from "../damage-domain.mjs";
import * as UI from "../damage-tray.mjs";
import * as W from "../hp-widget.mjs";
import { register as registerTokenMenu } from "../token-menu.mjs";
import { register as registerSettings } from "../campaign-settings.mjs";
import {
  register as registerTracker,
  renderTracker,
  resetTrackerView,
} from "../combat-tracker.mjs";

afterEach(() => {
  UI.resetDamageView();
  resetTrackerView();
});

// ---------------------------------------------------------------- harness

function harness({ lang = "it", tracker = false } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null });
  const areas = [
    ["token-menu", registerTokenMenu],
    ["campaign-settings", registerSettings],
    ...(tracker ? [["combat-tracker", registerTracker]] : []),
    ["damage-tray", UI.register],
  ];
  for (const [name, fn] of areas) assert.equal(registry.use(name, fn).status, "built", name);
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const dialogs = [];
  let renders = 0;
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
      return canControlActor(actor, this.role, store.state);
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {
      renders += 1;
    },
    navigate() {},
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete", en: "You are offline" });
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
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    toasts,
    dialogs,
    renders: () => renders,
    lastLabel: () => store.history.at(-1)?.label,
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
  };
}
const ghostEntry = () => data.getEntry("srd2024:creature:ghost");
function addGhost(h, point = { x: 160, y: 80 }) {
  h.ctx.role = "dm";
  h.ctx.commit("ghost", (s) => {
    const { input, patch } = data.npcFromCreature(ghostEntry(), {
      id: "ghost",
      name: "Fantasma",
      team: "watch",
    });
    const actor = createSceneNPC(s, input, "dm");
    Object.assign(actor, patch);
    placeSceneToken(s, "old-watch", "ghost", point, "token-ghost", "dm");
  });
}
// Livia (100,100); the Sentinella (140,100), the Esploratore (175,125) and the Ghost
// (160,80) in her cone toward (250,100); Doran far away. Combat on, Livia's turn.
function coneFixture(h) {
  addGhost(h);
  h.ctx.commit("positions", (s) => {
    s.combat.active = true;
    s.combat.turn = s.combat.order.indexOf("livia");
    const place = (id, x, y) =>
      Object.assign(
        s.scenes[0].tokens.find((t) => t.actorId === id),
        { x, y },
      );
    place("livia", 100, 100);
    place("goblin-1", 140, 100);
    place("goblin-2", 175, 125);
    place("doran", 100, 450);
  });
}
function castBurningHands(h, { applyMode = "assisted", damage = [2, 2, 1] } = {}) {
  h.ctx.role = "player";
  let attempt;
  h.ctx.commit("cast", (s) => {
    attempt = beginAttempt(
      s,
      {
        id: "bh-1",
        actorId: "livia",
        actionId: "burning-hands",
        selection: { point: { x: 250, y: 100 } },
        mode: "physical",
        ...(applyMode === "assisted" ? { applyMode } : {}),
      },
      "player",
    );
  });
  const live = () => h.ctx.state.combatAttempts.find((a) => a.id === "bh-1");
  h.ctx.commit("damage", (s) =>
    resolveRoll(s, "bh-1", live().requests.find((r) => r.kind === "damage").id, damage, "player"),
  );
  h.ctx.role = "dm";
  for (const [id, face] of [
    ["goblin-1", 3],
    ["goblin-2", 18],
    ["ghost", 2],
  ])
    h.ctx.commit("save", (s) =>
      resolveRoll(
        s,
        "bh-1",
        live().requests.find((r) => r.kind === "save" && r.actorId === id).id,
        [face],
        "dm",
      ),
    );
  return { attempt, live };
}
const hp = (h, id) => h.ctx.state.actors[id].hp;

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
// Descendant selectors ("a b") match the last part and check an ancestor for the rest.
function matches(node, selector) {
  return selector.split(",").some((alt) => {
    const parts = alt.trim().split(/\s+/);
    if (!simpleMatch(node, parts.at(-1))) return false;
    let n = node.parent;
    for (let i = parts.length - 2; i >= 0; i--) {
      while (n && n.tagName !== "ROOT" && !simpleMatch(n, parts[i])) n = n.parent;
      if (!n || n.tagName === "ROOT") return false;
      n = n.parent;
    }
    return true;
  });
}
function element(tag, attrs, parent) {
  const node = {
    tagName: tag.toUpperCase(),
    attrs,
    parent,
    children: [],
    events: {},
    value: attrs.value ?? "",
    checked: "checked" in attrs,
    open: "open" in attrs,
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
    fire(type) {
      const event = { type, target: node, preventDefault() {}, stopPropagation() {} };
      for (const fn of node.events[type] ?? []) fn(event);
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
    find(selector) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      return node;
    },
    click(selector) {
      this.find(selector).fire("click");
    },
  };
}

// ---------------------------------------------------------------- tests

test("seed and normalize: idempotent, strict on future versions, bad data dropped", () => {
  const seed = D.seedSlice();
  assert.deepEqual(D.normalizeSlice(D.normalizeSlice(seed)), D.normalizeSlice(seed));
  assert.throws(() => D.normalizeSlice(seed, 2), /Future/);
  const dirty = D.normalizeSlice({
    defenses: { a: { resistances: ["fire", "nonsense"] }, b: 3 },
    proposals: [{ id: "p", actorId: "livia" }, { nope: true }],
    maxMods: {
      livia: [
        { id: "m", delta: 2 },
        { id: "x", delta: "2" },
      ],
    },
  });
  assert.deepEqual(dirty.defenses.a.resistances, ["fire"]);
  assert.equal(Object.keys(dirty.defenses).length, 1);
  assert.equal(dirty.proposals.length, 1);
  assert.equal(dirty.maxMods.livia.length, 1);
});

test("defenses: SRD block via the compendium, DM record, Petrified; order of application", () => {
  const h = harness();
  addGhost(h);
  const d = D.defensesOf(h.ctx.state, "ghost");
  assert.equal(d.origin, "block");
  assert.ok(d.resistances.includes("fire") && d.immunities.includes("poison"));
  assert.equal(d.source.pages[0], 287);
  assert.equal(D.defensesOf(h.ctx.state, "goblin-1").origin, "none");
  // SRD EN 17 example (without the aura): Resistance to all damage and Vulnerability to
  // Fire, 23 Fire damage → halved 11 → doubled 22.
  const chips = [
    { kind: "resistance", type: "fire" },
    { kind: "vulnerability", type: "fire" },
  ];
  assert.equal(D.adjustDamage(23, chips).amount, 22);
  // Multipliers come first, then Resistance: 10 ×¼ = 2 → 1.
  assert.equal(D.adjustDamage(10, [chips[0]], { multiplier: 0.25 }).amount, 1);
  // Immunity 0; turned off: full; downgraded: half.
  const imm = [{ kind: "immunity", type: "poison" }];
  assert.equal(D.adjustDamage(9, imm).amount, 0);
  assert.equal(D.adjustDamage(9, imm, { off: ["immunity"] }).amount, 9);
  assert.equal(D.adjustDamage(9, imm, { downgrade: { reason: "x" } }).amount, 4);
  assert.throws(() => D.checkDecision({ downgrade: { reason: " " } }, imm), /downgrade/);
  // Magic Missile darts are separate instances: 3 + 3 with resistance → 1 + 1.
  const darts = D.adjustDamage(6, chips.slice(0, 1), {}, { darts: [{ total: 3 }, { total: 3 }] });
  assert.equal(darts.amount, 2);
  // Petrified: Resistance to all damage, one instance only (no stacking).
  h.ctx.commit("petrify", (s) => (s.actors["goblin-1"].conditions ??= []).push("petrified"));
  const p = D.defensesOf(h.ctx.state, "goblin-1");
  assert.ok(p.allResistance);
  assert.equal(D.chipsFor(p, "cold").length, 1);
  // DM record replaces the block; clash refused; clear goes back to the block.
  h.ctx.commit("record", (s) =>
    D.recordDefenses(s, "ghost", { resistances: ["cold"], immunities: [], note: "gelo" }, "dm"),
  );
  assert.equal(D.defensesOf(h.ctx.state, "ghost").origin, "recorded");
  assert.throws(
    () =>
      h.ctx.commit("clash", (s) =>
        D.recordDefenses(s, "ghost", { resistances: ["fire"], immunities: ["fire"] }, "dm"),
      ),
    /immunity excludes/,
  );
  assert.throws(() => D.recordDefenses(h.ctx.state, "ghost", {}, "player"), /Only the DM/);
  h.ctx.commit("clear", (s) => D.recordDefenses(s, "ghost", { clear: true }, "dm"));
  assert.equal(D.defensesOf(h.ctx.state, "ghost").origin, "block");
});

test("(1) Burning Hands on two goblins and a fire-resistant Ghost: tray per target, half on a save, resistance chip, nothing before Apply", () => {
  const h = harness();
  coneFixture(h);
  const { live } = castBurningHands(h);
  // Nothing changed: every outcome waits for Apply.
  assert.deepEqual([hp(h, "goblin-1"), hp(h, "goblin-2"), hp(h, "ghost")], [7, 9, 45]);
  assert.ok(live().outcomes.every((o) => o.status === "ready"));
  const rows = D.trayRows(h.ctx.state, "dm");
  assert.deepEqual(
    rows.map((r) => [r.actorId, r.base, r.saveSuccess]),
    [
      ["goblin-1", 5, false],
      ["goblin-2", 2, true],
      ["ghost", 5, false],
    ],
  );
  const ghostRow = rows.find((r) => r.actorId === "ghost");
  const preview = D.previewRow(h.ctx.state, ghostRow, {}, "dm");
  assert.deepEqual(
    preview.chips.map((c) => c.kind),
    ["resistance"],
  );
  assert.equal(preview.adjusted.amount, 2);
  assert.equal(preview.breakdown.hpAfter, 43);
  const sentinella = D.previewRow(h.ctx.state, rows[0], {}, "dm");
  assert.equal(sentinella.after, "bloodied", "7 → 2 is half or fewer");
  // The player sees no row: the DM controls these creatures.
  assert.equal(D.trayRows(h.ctx.state, "player").length, 0);
  // Tray markup: one card, three rows, chips, multipliers and one Apply each.
  const html = UI.renderTray(h.ctx);
  assert.match(html, /data-dt-card="bh-1"/);
  assert.equal(html.match(/data-dt-apply="/g).length, 3);
  assert.match(html, /data-dt-chip="resistance"/);
  assert.match(html, /TS riuscito: metà/);
  assert.equal(hp(h, "ghost"), 45, "rendering changes nothing");
  // B20's plain list steps aside for the tray; the map pill shows the amount after defenses.
  const tableView = { scene: h.ctx.state.scenes[0], selectedActorId: "livia" };
  const panels = h.registry.list("table-panel", h.ctx, tableView).map((c) => c.id);
  assert.ok(panels.includes("damage-tray") && !panels.includes("campaign-settings-ready"));
  assert.match(
    UI.readyPillsLayer(h.ctx, tableView),
    /data-dt-ready-pill="ghost"[^]*?2 da applicare/,
  );
  // Apply the Ghost's row: the resistance halves 5 to 2 through the vitality domain.
  h.ctx.commit("apply", (s) => D.applyTrayRow(s, ghostRow.key, {}, "dm"));
  assert.equal(hp(h, "ghost"), 43);
  const outcome = live().outcomes.find((o) => o.actorId === "ghost");
  assert.equal(outcome.status, "applied");
  assert.deepEqual(outcome.adjustment.applied, ["resistance"]);
  assert.ok(
    h.ctx.state.conditionEvents.some((e) => e.id === "bh-1:vitality:ghost" && e.kind === "damage"),
    "the vitality domain recorded the event",
  );
  // A chip turned off applies the full damage; a multiplier applies first.
  h.ctx.commit("apply", (s) => D.applyTrayRow(s, rows[1].key, { multiplier: 2 }, "dm"));
  assert.equal(hp(h, "goblin-2"), 5, "2 ×2 = 4");
  // Undo of the whole commit restores HP and the ready outcome.
  h.ctx.undo();
  assert.equal(hp(h, "goblin-2"), 9);
  assert.equal(live().outcomes.find((o) => o.actorId === "goblin-2").status, "ready");
});

test("automatic campaigns: the combat seam applies the target's defenses without a tray", () => {
  const h = harness();
  coneFixture(h);
  castBurningHands(h, { applyMode: "automatic" });
  assert.equal(hp(h, "ghost"), 43, "5 fire halved by the Ghost's resistance");
  assert.equal(hp(h, "goblin-1"), 2);
  const outcome = h.ctx.state.combatAttempts[0].outcomes.find((o) => o.actorId === "ghost");
  assert.equal(outcome.adjustment.automatic, true);
  const log = D.hpLog(h.ctx.state, "ghost", "dm");
  assert.equal(log[0].combat.actionName.it, "Mani brucianti");
  assert.match(D.adjustmentText(log[0].adjustment, "it"), /Fuoco 5 → 2 \(resistenza\)/);
});

test("(2) the DM downgrades an immunity to resistance with a recorded reason", () => {
  const h = harness();
  addGhost(h);
  const chips = D.chipsFor(D.defensesOf(h.ctx.state, "ghost"), "poison");
  assert.deepEqual(
    chips.map((c) => c.kind),
    ["immunity"],
  );
  assert.throws(
    () =>
      h.ctx.commit("no reason", (s) =>
        D.manualChange(
          s,
          "ghost",
          { kind: "damage", amount: 10, type: "poison", decision: { downgrade: { reason: "" } } },
          "dm",
        ),
      ),
    /downgrade/,
  );
  assert.equal(hp(h, "ghost"), 45);
  let out;
  h.ctx.commit("typed", (s) => {
    out = D.manualChange(
      s,
      "ghost",
      {
        kind: "damage",
        amount: 10,
        type: "poison",
        decision: { downgrade: { reason: "Veleno magico del drago" } },
        surface: "token",
      },
      "dm",
      { lang: "it" },
    );
  });
  assert.equal(hp(h, "ghost"), 40);
  assert.equal(out.adjustment.downgrade.reason, "Veleno magico del drago");
  const event = h.ctx.state.conditionEvents.find((e) => e.id === out.eventId);
  assert.match(event.reason, /immunità declassata a resistenza: Veleno magico del drago/);
  const log = D.hpLog(h.ctx.state, "ghost", "dm");
  assert.equal(log[0].adjustment.downgrade.reason, "Veleno magico del drago");
  // Without the downgrade the immunity holds: 0 damage, still logged.
  h.ctx.commit("immune", (s) =>
    D.manualChange(s, "ghost", { kind: "damage", amount: 6, type: "poison" }, "dm"),
  );
  assert.equal(hp(h, "ghost"), 40);
  assert.equal(D.hpLog(h.ctx.state, "ghost", "dm")[0].manual.amount, 0);
});

test("(3) widget: 8 damage with 5 temporary HP consumes them first; healing adds none; maximum with a note", () => {
  const h = harness();
  h.ctx.role = "player";
  const opts = { online: true, lang: "it" };
  h.ctx.commit("temp", (s) => D.setTempHp(s, "livia", { amount: 5 }, "player", opts));
  assert.equal(h.ctx.state.actors.livia.tempHp, 5);
  let out;
  h.ctx.commit("dmg", (s) => {
    out = D.manualChange(
      s,
      "livia",
      { kind: "damage", amount: 8, surface: "sheet" },
      "player",
      opts,
    );
  });
  assert.equal(h.ctx.state.actors.livia.tempHp, 0);
  assert.equal(hp(h, "livia"), 15, "18 − (8 − 5)");
  assert.equal(out.result.breakdown.tempHpAbsorbed, 5);
  h.ctx.commit("heal", (s) =>
    D.manualChange(s, "livia", { kind: "heal", amount: 4 }, "player", opts),
  );
  assert.equal(hp(h, "livia"), 19);
  assert.equal(h.ctx.state.actors.livia.tempHp, 0, "healing never adds temporary HP");
  // Temporary HP do not stack: with some already, the domain asks keep or replace.
  h.ctx.commit("temp", (s) => D.setTempHp(s, "livia", { amount: 3 }, "player", opts));
  assert.throws(
    () => h.ctx.commit("temp2", (s) => D.setTempHp(s, "livia", { amount: 6 }, "player", opts)),
    /do not stack/,
  );
  h.ctx.commit("temp3", (s) =>
    D.setTempHp(s, "livia", { amount: 6, choice: "replace" }, "player", opts),
  );
  assert.equal(h.ctx.state.actors.livia.tempHp, 6);
  // Maximum modified with a required note; removal restores it and caps current HP.
  assert.throws(
    () =>
      h.ctx.commit("max", (s) =>
        D.changeMaxHp(s, "livia", { delta: 5, note: " " }, "player", opts),
      ),
    /note/,
  );
  h.ctx.commit("max", (s) =>
    D.changeMaxHp(s, "livia", { delta: 5, note: "Aiuto" }, "player", opts),
  );
  assert.equal(h.ctx.state.actors.livia.maxHp, 27);
  const [mod] = D.activeMaxMods(h.ctx.state, "livia");
  assert.equal(mod.note, "Aiuto");
  h.ctx.commit("heal", (s) =>
    D.manualChange(s, "livia", { kind: "heal", amount: 8 }, "player", opts),
  );
  assert.equal(hp(h, "livia"), 27);
  h.ctx.commit("unmax", (s) => D.removeMaxMod(s, "livia", mod.id, "player", opts));
  assert.equal(h.ctx.state.actors.livia.maxHp, 22);
  assert.equal(hp(h, "livia"), 22, "current HP capped at the restored maximum");
  assert.equal(D.activeMaxMods(h.ctx.state, "livia").length, 0);
  // Full HP: healing is refused instead of logging a no-op.
  assert.throws(
    () => D.manualChange(h.ctx.state, "livia", { kind: "heal", amount: 1 }, "player"),
    /maximum/,
  );
  // A player cannot change a DM creature's HP.
  assert.throws(
    () => D.manualChange(h.ctx.state, "goblin-1", { kind: "damage", amount: 1 }, "player"),
    /cannot change/,
  );
  // The same widget on every surface: the sheet's HP card holds DDB's box (Heal, amount,
  // Damage) and opens the full widget, identical to the token's, as its sidebar dialog.
  h.ctx.role = "player";
  const token = W.hpWidgetHTML(h.ctx, "livia", { surface: "token" });
  const tracker = W.hpWidgetHTML(h.ctx, "livia", { surface: "tracker" });
  const box = W.hpWidgetHTML(h.ctx, "livia", { surface: "sheet", compact: true });
  const controls = (html) =>
    [...html.matchAll(/data-dt-(heal|damage|amount|type|temp-set|max-apply|manage)\b/g)].map(
      (m) => m[1],
    );
  assert.deepEqual(controls(token), controls(tracker));
  // Final review C2-3 (D&D Beyond: the HP number opens HP management): the sheet's box keeps
  // Heal, the amount and Damage; temporary HP, maximum and log open from the HP number
  // (characters.mjs «hp-correct»), the same dialog as the token menu.
  assert.deepEqual(controls(box), ["heal", "amount", "damage"]);
  assert.match(token, /data-dt-hp-value>22</);
});

test("(4) HP log: undo one entry alone, reapply it, dependent consequences flagged", () => {
  const h = harness();
  const opts = { online: true, lang: "it" };
  h.ctx.role = "dm";
  let first, second;
  h.ctx.commit(
    "a",
    (s) => (first = D.manualChange(s, "goblin-2", { kind: "damage", amount: 3 }, "dm", opts)),
  );
  h.ctx.commit(
    "b",
    (s) => (second = D.manualChange(s, "goblin-2", { kind: "damage", amount: 2 }, "dm", opts)),
  );
  assert.equal(hp(h, "goblin-2"), 4);
  let log = D.hpLog(h.ctx.state, "goblin-2", "dm");
  assert.deepEqual(
    log.map((e) => e.id),
    [second.eventId, first.eventId],
  );
  // Undo only the FIRST entry (not the latest change): +3 on current values.
  const plan = D.planRevert(h.ctx.state, "goblin-2", first.eventId, "dm");
  assert.deepEqual(plan.patch, { hp: 7 });
  assert.ok(
    plan.consequences.some((c) => c.code === "later"),
    "later entries flagged",
  );
  assert.throws(
    () =>
      h.ctx.commit("u", (s) =>
        D.revertEntry(s, "goblin-2", first.eventId, "dm", { reason: "" }, opts),
      ),
    /why/,
  );
  h.ctx.commit("u", (s) =>
    D.revertEntry(s, "goblin-2", first.eventId, "dm", { reason: "Colpo mancato in realtà" }, opts),
  );
  assert.equal(hp(h, "goblin-2"), 7);
  log = D.hpLog(h.ctx.state, "goblin-2", "dm");
  const reverted = log.find((e) => e.id === first.eventId);
  assert.equal(reverted.revert.reason, "Colpo mancato in realtà");
  assert.equal(reverted.canRevert, false);
  assert.equal(reverted.canReapply, true);
  assert.ok(
    log.find((e) => e.revertOf === first.eventId),
    "the correction is its own entry",
  );
  assert.ok(log.find((e) => e.id === second.eventId).canRevert, "the other entry is untouched");
  // Reapply: the same change again, on current values, through the vitality domain.
  h.ctx.commit("r", (s) => D.reapplyEntry(s, "goblin-2", first.eventId, "dm", opts));
  assert.equal(hp(h, "goblin-2"), 4);
  assert.equal(
    D.hpLog(h.ctx.state, "goblin-2", "dm").find((e) => e.id === first.eventId).canReapply,
    false,
  );
  // A killing blow: undoing it offers to remove Dead (checked) and flags what remains.
  let kill;
  h.ctx.commit(
    "k",
    (s) => (kill = D.manualChange(s, "goblin-1", { kind: "damage", amount: 9 }, "dm", opts)),
  );
  assert.equal(h.ctx.state.actors["goblin-1"].dead, true);
  const killPlan = D.planRevert(h.ctx.state, "goblin-1", kill.eventId, "dm");
  assert.deepEqual(killPlan.patch, { hp: 7 });
  assert.equal(killPlan.options[0].id, "dead");
  h.ctx.commit("u2", (s) =>
    D.revertEntry(s, "goblin-1", kill.eventId, "dm", { reason: "Errore" }, opts),
  );
  assert.equal(hp(h, "goblin-1"), 7);
  assert.equal(h.ctx.state.actors["goblin-1"].dead, false);
  // Undoing a healing that would drop to 0 HP is refused: record Damage instead.
  h.ctx.commit("d", (s) =>
    D.manualChange(s, "goblin-2", { kind: "damage", amount: 4 }, "dm", opts),
  );
  assert.equal(hp(h, "goblin-2"), 0);
  // goblin-2 died at 0 (monster policy): healing a dead creature is refused, nothing logged.
  const before = D.hpLog(h.ctx.state, "goblin-2", "dm").length;
  assert.throws(
    () =>
      h.ctx.commit("h", (s) =>
        D.manualChange(s, "goblin-2", { kind: "heal", amount: 3 }, "dm", opts),
      ),
    /dead creature/,
  );
  assert.equal(D.hpLog(h.ctx.state, "goblin-2", "dm").length, before);
});

test("(4b) a healing entry whose undo would drop to 0 HP is refused with the reason", () => {
  const h = harness();
  const opts = { online: true, lang: "it" };
  h.ctx.role = "player";
  h.ctx.commit("d", (s) =>
    D.manualChange(s, "livia", { kind: "damage", amount: 10 }, "player", opts),
  );
  let heal;
  h.ctx.commit(
    "h",
    (s) => (heal = D.manualChange(s, "livia", { kind: "heal", amount: 4 }, "player", opts)),
  );
  h.ctx.commit("d2", (s) =>
    D.manualChange(s, "livia", { kind: "damage", amount: 12 }, "player", opts),
  );
  assert.equal(hp(h, "livia"), 0);
  const plan = D.planRevert(h.ctx.state, "livia", heal.eventId, "player");
  assert.equal(plan.errors.length, 0, "already at 0: no HP change, nothing to refuse");
  // Death save failures added by damage at 0 HP are an explicit option.
  let hit;
  h.ctx.commit(
    "d3",
    (s) => (hit = D.manualChange(s, "livia", { kind: "damage", amount: 1 }, "player", opts)),
  );
  assert.equal(h.ctx.state.actors.livia.deathSaves.failures, 1);
  const failPlan = D.planRevert(h.ctx.state, "livia", hit.eventId, "player");
  assert.equal(failPlan.options[0].id, "failures");
  h.ctx.commit("u", (s) =>
    D.revertEntry(s, "livia", hit.eventId, "player", { reason: "Non era a portata" }, opts),
  );
  assert.equal(h.ctx.state.actors.livia.deathSaves.failures, 0);
  // At 5 HP, undoing the earlier +4 healing would reach... 1: allowed; 0 is not.
  h.ctx.commit("heal", (s) =>
    D.manualChange(s, "livia", { kind: "heal", amount: 4 }, "player", opts),
  );
  const zero = D.planRevert(
    h.ctx.state,
    "livia",
    D.hpLog(h.ctx.state, "livia", "player")[0].id,
    "player",
  );
  assert.match(zero.errors[0].it, /0 PF/);
});

test("(5) Livia proposes “ho preso 6 danni”; the DM accepts or declines; setting off refuses", () => {
  const h = harness();
  h.ctx.role = "player";
  let proposal;
  h.ctx.commit("p", (s) => {
    proposal = D.propose(
      s,
      { actorId: "livia", kind: "damage", amount: 6, note: "ho preso 6 danni" },
      "player",
    );
  });
  assert.equal(hp(h, "livia"), 18, "a proposal changes nothing");
  assert.equal(D.pendingProposals(h.ctx.state).length, 1);
  assert.throws(
    () => D.answerProposal(h.ctx.state, proposal.id, { accept: true }, "player"),
    /Only the DM/,
  );
  // The DM sees it in the tray and in the bell.
  h.ctx.role = "dm";
  assert.match(UI.renderTray(h.ctx), /ho preso 6 danni/);
  const notes = h.registry.notifications(h.ctx);
  assert.ok(notes.some((n) => /Proposta: danno 6 a Livia/.test(h.ctx.label(n.title))));
  h.ctx.commit("accept", (s) =>
    D.answerProposal(s, proposal.id, { accept: true }, "dm", { lang: "it" }),
  );
  assert.equal(hp(h, "livia"), 12);
  const accepted = D.proposalsFor(h.ctx.state, "player")[0];
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.answer.amount, 6);
  // Decline with a reason: the player reads it; nothing changes.
  h.ctx.role = "player";
  let second;
  h.ctx.commit(
    "p2",
    (s) => (second = D.propose(s, { actorId: "livia", kind: "damage", amount: 6 }, "player")),
  );
  h.ctx.role = "dm";
  h.ctx.commit("decline", (s) =>
    D.answerProposal(s, second.id, { accept: false, reason: "Hai superato il TS" }, "dm"),
  );
  assert.equal(hp(h, "livia"), 12);
  h.ctx.role = "player";
  const answers = h.registry.notifications(h.ctx).map((n) => h.ctx.label(n.title));
  assert.ok(answers.some((t) => /ha rifiutato/.test(t)));
  assert.match(W.hpWidgetHTML(h.ctx, "livia"), /rifiutata: Hai superato il TS/);
  // Improved Initiative: a player can suggest damage to a visible enemy, not a hidden one.
  h.ctx.commit("p3", (s) =>
    D.propose(s, { actorId: "goblin-1", kind: "damage", amount: 4, type: "fire" }, "player"),
  );
  h.ctx.role = "dm";
  h.ctx.commit(
    "hide",
    (s) => (s.scenes[0].tokens.find((t) => t.actorId === "goblin-2").hidden = true),
  );
  h.ctx.role = "player";
  assert.throws(
    () => D.propose(h.ctx.state, { actorId: "goblin-2", kind: "damage", amount: 1 }, "player"),
    /cannot see/,
  );
  // The DM turns suggestions off (campaign scope): refused.
  h.ctx.role = "dm";
  h.registry.setSetting(h.ctx, D.SETTING_KEYS.suggestions, false);
  h.ctx.role = "player";
  assert.equal(W.canPropose(h.ctx, h.ctx.state.actors["goblin-1"]), false);
  assert.throws(
    () =>
      D.propose(h.ctx.state, { actorId: "livia", kind: "damage", amount: 1 }, "player", {
        allowed: false,
      }),
    /turned off/,
  );
  // Reload keeps proposals and answers.
  h.reload();
  assert.equal(D.proposalsFor(h.ctx.state, "player").length, 3);
});

test("(5b) a player proposes a condition (Improved Initiative tag); the DM's Accept applies it through the conditions domain", () => {
  const h = harness();
  h.ctx.role = "player";
  assert.throws(
    () =>
      D.propose(
        h.ctx.state,
        { actorId: "goblin-2", kind: "condition", conditionId: "exhaustion" },
        "player",
      ),
    /SRD condition/,
  );
  let proposal;
  h.ctx.commit("p", (s) => {
    proposal = D.propose(
      s,
      { actorId: "goblin-2", kind: "condition", conditionId: "prone", note: "l’ho spinto giù" },
      "player",
    );
  });
  assert.equal(proposal.amount, null);
  assert.match(W.hpWidgetHTML(h.ctx, "goblin-2"), /Condizione: Prono/);
  h.ctx.role = "dm";
  const tray = UI.renderTray(h.ctx);
  assert.match(tray, /Accetta e applica Prono/);
  const view = mount(tray, (root) => UI.bindTray(root, h.ctx));
  view.click(`[data-dt-accept="${proposal.id}"]`);
  const goblin = h.ctx.state.actors["goblin-2"];
  const prone = goblin.conditions.find((c) => c.id === "prone");
  assert.ok(prone, "Prone applied");
  assert.equal(prone.origin.label, "Proposta del giocatore: l’ho spinto giù");
  assert.equal(prone.term.kind, "manual");
  assert.ok(
    h.ctx.state.conditionEvents.some((e) => e.kind === "apply" && e.actorId === "goblin-2"),
  );
  h.ctx.role = "player";
  assert.match(W.hpWidgetHTML(h.ctx, "goblin-2"), /accettata: Prono applicato/);
  assert.ok(
    h.registry
      .notifications(h.ctx)
      .some((n) => /Il DM ha accettato: Prono/.test(h.ctx.label(n.title))),
  );
});

test("(6) Bloodied/Dead token visuals follow the campaign setting and the enemy-health rule", () => {
  const h = harness();
  const opts = { online: true, lang: "it" };
  h.ctx.role = "dm";
  h.ctx.commit("d", (s) =>
    D.manualChange(s, "goblin-2", { kind: "damage", amount: 5 }, "dm", opts),
  );
  h.ctx.commit("k", (s) =>
    D.manualChange(s, "goblin-1", { kind: "damage", amount: 7 }, "dm", opts),
  );
  assert.equal(D.healthState(h.ctx.state.actors["goblin-2"]), "bloodied");
  assert.equal(D.healthState(h.ctx.state.actors["goblin-1"]), "dead");
  const scene = h.ctx.state.scenes[0];
  const layer = () => UI.statesLayer(h.ctx, { scene });
  assert.match(layer(), /data-dt-token-state="goblin-2" data-state="bloodied"/);
  assert.match(layer(), /data-dt-token-state="goblin-1" data-state="dead"/);
  h.ctx.role = "player";
  assert.match(layer(), /data-state="bloodied"/, "players see it by default (words rule)");
  // DM hides the visuals from players (DDB-143 Settings).
  h.ctx.role = "dm";
  h.registry.setSetting(h.ctx, D.SETTING_KEYS.tokenStates, false);
  assert.match(layer(), /data-state="bloodied"/, "the DM always sees them");
  h.ctx.role = "player";
  assert.doesNotMatch(layer(), /data-dt-token-state="goblin/);
  // Party characters stay visible to players (they read the sheet).
  h.ctx.commit("livia", (s) =>
    D.manualChange(s, "livia", { kind: "damage", amount: 10 }, "player", opts),
  );
  assert.match(layer(), /data-dt-token-state="livia" data-state="bloodied"/);
  // Setting back on, but the enemy-health rule "hidden" still hides enemies.
  h.ctx.role = "dm";
  h.registry.setSetting(h.ctx, D.SETTING_KEYS.tokenStates, true);
  h.ctx.commit(
    "rule",
    (s) => (s.ext["campaign-settings"].campaigns.lanterns.policy.enemyHp = "hidden"),
  );
  h.ctx.role = "player";
  assert.doesNotMatch(layer(), /data-dt-token-state="goblin/);
  assert.equal(
    D.showsHealthState(h.ctx.state, h.ctx.state.actors["goblin-2"], "player", {
      tokenStates: true,
      enemyHp: "words",
    }),
    true,
  );
});

test("UI: tray chips, multipliers and Apply through real handlers; offline refusal keeps HP", () => {
  const h = harness();
  coneFixture(h);
  castBurningHands(h);
  h.ctx.role = "dm";
  const ghostKey = "attempt:bh-1:ghost";
  let view = mount(UI.renderTray(h.ctx), (root) => UI.bindTray(root, h.ctx));
  // Turn the Ghost's resistance off: the Apply button now says 5.
  view.click(`[data-dt-chip="resistance"][data-dt-key="${ghostKey}"]`);
  view = mount(UI.renderTray(h.ctx), (root) => UI.bindTray(root, h.ctx));
  assert.equal(
    view
      .find(`[data-dt-chip="resistance"][data-dt-key="${ghostKey}"]`)
      .getAttribute("aria-pressed"),
    "false",
  );
  assert.match(UI.renderTray(h.ctx), /Applica 5/);
  // ×½ on the Sentinella: 5 → 2.
  view.click(`[data-dt-mult="0.5"][data-dt-key="attempt:bh-1:goblin-1"]`);
  view = mount(UI.renderTray(h.ctx), (root) => UI.bindTray(root, h.ctx));
  // Offline: the shared change is refused and nothing moves.
  h.ctx.offline = true;
  view.click(`[data-dt-apply="${ghostKey}"]`);
  assert.equal(hp(h, "ghost"), 45);
  assert.ok(h.toasts.at(-1).error);
  h.ctx.offline = false;
  view.click("[data-dt-apply-all]");
  assert.deepEqual([hp(h, "goblin-1"), hp(h, "goblin-2"), hp(h, "ghost")], [5, 7, 40]);
  assert.equal(D.trayRows(h.ctx.state, "dm").length, 0);
  assert.match(h.toasts.at(-1).text, /Danni applicati/);
  // The Undo of the whole Apply-to-all is one step.
  h.ctx.undo();
  assert.equal(D.trayRows(h.ctx.state, "dm").length, 3);
});

test("UI: widget handlers (damage, type chips with downgrade, temp, max, log undo) and the tracker opens the same widget", () => {
  const h = harness({ tracker: true });
  addGhost(h);
  h.ctx.role = "dm";
  let view = mount(W.hpWidgetHTML(h.ctx, "ghost"), (root) => W.bindHpWidget(root, h.ctx));
  view.find("[data-dt-type]").value = "poison";
  view.find("[data-dt-type]").fire("change");
  view = mount(W.hpWidgetHTML(h.ctx, "ghost"), (root) => W.bindHpWidget(root, h.ctx));
  assert.ok(view.find('[data-dt-chip="immunity"]'));
  view.click("[data-dt-downgrade]");
  view = mount(W.hpWidgetHTML(h.ctx, "ghost"), (root) => W.bindHpWidget(root, h.ctx));
  const reason = view.find("[data-dt-downgrade-reason]");
  reason.value = "Arma d’argento consacrata";
  reason.fire("input");
  view.find("[data-dt-amount]").value = "12";
  view.click("[data-dt-damage]");
  assert.equal(hp(h, "ghost"), 39, "12 poison downgraded to resistance: 6");
  assert.match(
    W.ui.status.get("ghost").text,
    /immunità declassata a resistenza: Arma d’argento consacrata/,
  );
  // The log lists it with Undo; the Undo dialog lists the changes and the reason field.
  view = mount(W.hpWidgetHTML(h.ctx, "ghost"), (root) => W.bindHpWidget(root, h.ctx));
  view.click("[data-dt-revert]");
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /PF: 39 → <strong>45<\/strong>/);
  dialog.options.onSubmit(new Map([["reason", "Prova"]]));
  assert.equal(hp(h, "ghost"), 45);
  view = mount(W.hpWidgetHTML(h.ctx, "ghost"), (root) => W.bindHpWidget(root, h.ctx));
  view.click("[data-dt-reapply]");
  assert.equal(hp(h, "ghost"), 39);
  // Temporary HP and maximum through the widget.
  view = mount(W.hpWidgetHTML(h.ctx, "ghost"), (root) => W.bindHpWidget(root, h.ctx));
  view.find("[data-dt-temp]").value = "5";
  view.click("[data-dt-temp-set]");
  assert.equal(h.ctx.state.actors.ghost.tempHp, 5);
  view = mount(W.hpWidgetHTML(h.ctx, "ghost"), (root) => W.bindHpWidget(root, h.ctx));
  view.find("[data-dt-max-delta]").value = "-5";
  view.find("[data-dt-max-note]").value = "Tocco necrotico";
  view.click("[data-dt-max-apply]");
  assert.equal(h.ctx.state.actors.ghost.maxHp, 40);
  assert.match(W.hpWidgetHTML(h.ctx, "ghost"), /Tocco necrotico/);
  // The combat tracker's HP value is a button that opens this widget in a dialog.
  h.ctx.commit("combat", (s) => {
    s.combat.active = true;
    s.combat.order = ["livia", "ghost", "goblin-1"];
    s.combat.turn = 0;
  });
  const tracker = renderTracker(h.ctx, { scene: h.ctx.state.scenes[0] });
  assert.match(tracker, /data-ct-hp="ghost"/);
  const entry = h.registry.get("token-menu", "damage-tray-hp", h.ctx, { actorId: "ghost" });
  h.registry.run(entry, h.ctx, { actorId: "ghost", surface: "tracker" });
  assert.match(h.dialogs.at(-1).title, /Punti ferita · Fantasma/);
  assert.match(h.dialogs.at(-1).body, /data-dt-surface="tracker"/);
});

test("EN labels and a player's propose-only widget for an enemy", () => {
  const h = harness({ lang: "en" });
  h.ctx.role = "player";
  const html = W.hpWidgetHTML(h.ctx, "goblin-1");
  assert.match(html, /Propose to the DM/);
  assert.doesNotMatch(html, /data-dt-damage/, "no direct damage on a DM creature");
  const own = W.hpWidgetHTML(h.ctx, "livia");
  assert.match(own, />Heal</);
  assert.match(own, />Damage</);
  assert.match(own, /HP log/);
});

// ---------------------------------------------------------------- review (B33-rf)

test("review: the tray's Apply keeps B20's commit label, so the attack card still offers its Undo", () => {
  const h = harness();
  coneFixture(h);
  castBurningHands(h);
  h.ctx.role = "dm";
  let view = mount(UI.renderTray(h.ctx), (root) => UI.bindTray(root, h.ctx));
  view.click('[data-dt-apply="attempt:bh-1:goblin-1"]');
  assert.equal(hp(h, "goblin-1"), 2);
  // combat-ui.mjs `undoControl` offers the card's Undo only after this exact label.
  assert.equal(h.lastLabel(), "Danni applicati");
  view = mount(UI.renderTray(h.ctx), (root) => UI.bindTray(root, h.ctx));
  view.click("[data-dt-apply-all]");
  assert.equal(h.lastLabel(), "Danni applicati");
  assert.match(h.toasts.at(-1).text, /Esploratore 2, Fantasma 2/);
});

test("review: undoing the entry that dropped a creature to 0 HP also ends the conditions it caused (checked option)", () => {
  const h = harness();
  const opts = { online: true, lang: "it" };
  const livia = () => h.ctx.state.actors.livia;
  h.ctx.role = "player";
  let fall;
  h.ctx.commit(
    "d",
    (s) => (fall = D.manualChange(s, "livia", { kind: "damage", amount: 20 }, "player", opts)),
  );
  assert.equal(livia().hp, 0);
  assert.ok(hasCondition(livia(), "unconscious") && hasCondition(livia(), "prone"));
  const plan = D.planRevert(h.ctx.state, "livia", fall.eventId, "player");
  const option = plan.options.find((o) => o.id === "conditions");
  assert.ok(option?.checked, "offered and checked");
  assert.match(option.text.it, /Privo di sensi/);
  assert.match(option.text.it, /Prono/);
  h.ctx.commit("u", (s) =>
    D.revertEntry(s, "livia", fall.eventId, "player", { reason: "Il colpo era mancato" }, opts),
  );
  assert.equal(livia().hp, 18);
  assert.equal(hasCondition(livia(), "unconscious"), false);
  assert.equal(hasCondition(livia(), "prone"), false);
  // Unchecked: HP come back, the conditions stay for the Conditions and status panel.
  let again;
  h.ctx.commit(
    "d2",
    (s) => (again = D.manualChange(s, "livia", { kind: "damage", amount: 20 }, "player", opts)),
  );
  h.ctx.commit("u2", (s) =>
    D.revertEntry(
      s,
      "livia",
      again.eventId,
      "player",
      { reason: "Errore", include: { conditions: false } },
      opts,
    ),
  );
  assert.equal(livia().hp, 18);
  assert.ok(hasCondition(livia(), "unconscious"));
  // The core Undo takes the whole correction back in one step.
  h.ctx.role = "player";
  h.ctx.undo();
  assert.equal(livia().hp, 0);
});

test("review: undoing or reapplying a maximum entry keeps the modifier list in step", () => {
  const h = harness();
  const opts = { online: true, lang: "it" };
  const livia = () => h.ctx.state.actors.livia;
  h.ctx.role = "player";
  let aid;
  h.ctx.commit(
    "m",
    (s) => (aid = D.changeMaxHp(s, "livia", { delta: 5, note: "Aiuto" }, "player", opts)),
  );
  assert.equal(livia().maxHp, 27);
  h.ctx.commit("u", (s) =>
    D.revertEntry(s, "livia", aid.eventId, "player", { reason: "Aiuto finito prima" }, opts),
  );
  assert.equal(livia().maxHp, 22);
  assert.deepEqual(D.activeMaxMods(h.ctx.state, "livia"), []);
  assert.doesNotMatch(W.hpWidgetHTML(h.ctx, "livia"), /data-dt-mod-remove/);
  h.ctx.commit("r", (s) => D.reapplyEntry(s, "livia", aid.eventId, "player", opts));
  assert.equal(livia().maxHp, 27);
  assert.deepEqual(
    D.activeMaxMods(h.ctx.state, "livia").map((m) => m.delta),
    [5],
  );
  // Removing it, then undoing the removal from the log, brings the modifier back.
  let removal;
  h.ctx.commit("x", (s) => (removal = D.removeMaxMod(s, "livia", aid.eventId, "player", opts)));
  assert.equal(livia().maxHp, 22);
  assert.deepEqual(D.activeMaxMods(h.ctx.state, "livia"), []);
  h.ctx.commit("u2", (s) =>
    D.revertEntry(s, "livia", removal.eventId, "player", { reason: "Tolto per errore" }, opts),
  );
  assert.equal(livia().maxHp, 27);
  assert.deepEqual(
    D.activeMaxMods(h.ctx.state, "livia").map((m) => m.delta),
    [5],
  );
  h.ctx.commit("r2", (s) => D.reapplyEntry(s, "livia", removal.eventId, "player", opts));
  assert.equal(livia().maxHp, 22);
  assert.deepEqual(D.activeMaxMods(h.ctx.state, "livia"), []);
});

test("review: an accepted proposal on a DM creature does not tell the player the damage after its defenses", () => {
  const h = harness();
  addGhost(h);
  h.ctx.role = "player";
  let onGhost, onLivia;
  h.ctx.commit(
    "p",
    (s) =>
      (onGhost = D.propose(
        s,
        { actorId: "ghost", kind: "damage", amount: 6, type: "fire" },
        "player",
      )),
  );
  h.ctx.commit(
    "p2",
    (s) => (onLivia = D.propose(s, { actorId: "livia", kind: "damage", amount: 6 }, "player")),
  );
  h.ctx.role = "dm";
  h.ctx.commit("a", (s) => D.answerProposal(s, onGhost.id, { accept: true }, "dm", { lang: "it" }));
  h.ctx.commit("a2", (s) =>
    D.answerProposal(s, onLivia.id, { accept: true }, "dm", { lang: "it" }),
  );
  assert.equal(hp(h, "ghost"), 42, "fire resistance: 6 → 3");
  h.ctx.role = "player";
  const html = W.hpWidgetHTML(h.ctx, "ghost");
  assert.match(html, /accettata/);
  assert.doesNotMatch(html, /3 applicati/);
  const titles = h.registry.notifications(h.ctx).map((n) => h.ctx.label(n.title));
  assert.ok(titles.includes("Il DM ha accettato la proposta per Fantasma"), titles.join(" | "));
  assert.ok(titles.includes("Il DM ha accettato: 6 a Livia"), "own character: the amount");
  assert.match(W.hpWidgetHTML(h.ctx, "livia"), /accettata: 6 applicati/);
});

test("review: overkill is reported and per-dart defenses add up in the explanation", () => {
  const h = harness();
  h.ctx.role = "player";
  const view = mount(W.hpWidgetHTML(h.ctx, "livia"), (root) => W.bindHpWidget(root, h.ctx));
  view.find("[data-dt-amount]").value = "25";
  view.click("[data-dt-damage]");
  assert.equal(hp(h, "livia"), 0);
  assert.match(W.ui.status.get("livia").text, /7 oltre lo 0/);
  const darts = [1, 2, 3].map((index) => ({ index, total: 3 }));
  const adjusted = D.adjustDamage(9, [{ kind: "resistance", type: "force" }], {}, { darts });
  assert.equal(adjusted.amount, 3);
  assert.equal(W.stepsText(h.ctx, adjusted), "9 → resistenza per dardo 1 + 1 + 1 = 3");
  assert.equal(W.stepsText(h.ctx, D.adjustDamage(9, [], {}, { darts })), "9");
});

test("review: the typed amount survives a redraw and a refusal, and the type preview uses it", () => {
  const h = harness();
  addGhost(h);
  h.ctx.role = "dm";
  let view = mount(W.hpWidgetHTML(h.ctx, "ghost"), (root) => W.bindHpWidget(root, h.ctx));
  const amount = view.find("[data-dt-amount]");
  amount.value = "10";
  amount.fire("input");
  view.find("[data-dt-type]").value = "poison";
  view.find("[data-dt-type]").fire("change");
  let html = W.hpWidgetHTML(h.ctx, "ghost");
  assert.match(html, /data-dt-amount="ghost"[^>]*value="10"/);
  assert.match(html, /10 → immunità 0/);
  view = mount(html, (root) => W.bindHpWidget(root, h.ctx));
  view.click("[data-dt-downgrade]");
  // Damage without the downgrade's reason: refused, the amount stays in the field.
  view = mount(W.hpWidgetHTML(h.ctx, "ghost"), (root) => W.bindHpWidget(root, h.ctx));
  view.click("[data-dt-damage]");
  assert.equal(hp(h, "ghost"), 45);
  html = W.hpWidgetHTML(h.ctx, "ghost");
  assert.match(html, /data-dt-amount="ghost"[^>]*value="10"/);
  assert.match(html, /10 → immunità declassata 5/);
  // A change that goes through clears the field (D&D Beyond) and the one-hit downgrade,
  // already in the redraw that follows it (what the page shows, not a later render).
  view = mount(html, (root) => W.bindHpWidget(root, h.ctx));
  const reason = view.find("[data-dt-downgrade-reason]");
  reason.value = "Argento consacrato";
  reason.fire("input");
  let drawn = "";
  h.ctx.render = () => (drawn = W.hpWidgetHTML(h.ctx, "ghost"));
  view.click("[data-dt-damage]");
  assert.equal(hp(h, "ghost"), 40);
  assert.doesNotMatch(drawn, /data-dt-amount="ghost"[^>]*value="10"/);
  assert.doesNotMatch(drawn, /data-dt-downgrade-reason/);
  assert.match(drawn, /Scrivi l’importo/);
});

test("review: the HP log shows its latest 12 entries and can show them all", () => {
  const h = harness();
  h.ctx.role = "dm";
  for (let i = 0; i < 13; i++)
    h.ctx.commit("d", (s) =>
      D.manualChange(s, "goblin-2", { kind: i % 2 ? "heal" : "damage", amount: 1 }, "dm"),
    );
  const bind = (root) => W.bindHpWidget(root, h.ctx);
  let view = mount(W.hpWidgetHTML(h.ctx, "goblin-2"), bind);
  assert.equal(view.root.querySelectorAll("[data-dt-entry]").length, 12);
  view.click("[data-dt-log-all]");
  view = mount(W.hpWidgetHTML(h.ctx, "goblin-2"), bind);
  assert.equal(view.root.querySelectorAll("[data-dt-entry]").length, 13);
});

test("review: the widget offers Propose only where the domain accepts the proposal", () => {
  const h = harness();
  h.ctx.role = "dm";
  h.ctx.commit("away", (s) => (s.actors["goblin-2"].campaignIds = ["another-campaign"]));
  h.ctx.role = "player";
  assert.equal(W.canPropose(h.ctx, h.ctx.state.actors["goblin-2"]), false);
  assert.equal(W.hpWidgetHTML(h.ctx, "goblin-2"), "");
  assert.equal(W.canPropose(h.ctx, h.ctx.state.actors["goblin-1"]), true);
});
