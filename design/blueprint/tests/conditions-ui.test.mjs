import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { esc } from "../ui.mjs";
const ui = await import("../conditions-ui.mjs").catch(() => ({}));
const domain = await import("../conditions.mjs").catch(() => ({}));
afterEach(() => ui.resetConditionsUI?.());
const source = { kind: "authored", edition: "2024", revision: "conditions-ui-test-1" };
const ready = () => assert.equal(typeof ui.openConditions, "function", "conditions panel exists");
const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
// Minimal DOM stand-in: native controls with attributes, dataset and listeners.
function parse(html) {
  const nodes = [
    ...html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
  ].map(([, tag, raw, inner]) => {
    const attrs = Object.fromEntries(
      [...raw.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
    );
    const events = {};
    return {
      attrs,
      events,
      tagName: tag.toUpperCase(),
      type: attrs.type,
      inner,
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      value:
        tag === "select"
          ? decode(inner?.match(/<option value="([^"]*)" selected/)?.[1])
          : tag === "textarea"
            ? decode(inner)
            : attrs.value || "",
      checked: "checked" in attrs,
      disabled: "disabled" in attrs,
      addEventListener(name, fn) {
        events[name] = fn;
      },
      focus() {},
      scrollIntoView() {},
    };
  });
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
function harness() {
  ready();
  let store = createStore(),
    dialog;
  Object.assign(store.state.actors.livia, {
    hp: 10,
    maxHp: 22,
    tempHp: 0,
    conditions: [],
    exhaustion: 0,
    dead: false,
    conditionImmunities: [],
    conditionImmunitiesSource: source,
    heldItemIds: [],
    vitalityPolicy: { zeroHp: "death-saves", source },
    deathSaves: { successes: 0, failures: 0, stable: false, recovery: null },
  });
  store.state.combat.active = false;
  const commits = [],
    errors = [],
    requests = [],
    opened = [],
    followUps = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role: "player",
    lang: "en",
    offline: false,
    esc,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(v) {
      return typeof v === "object" && v ? v[this.lang] || v.en || v.it || "" : String(v ?? "");
    },
    conditionActor(id, state = this.state) {
      return structuredClone(state.actors[id]);
    },
    conditionRolls() {
      return requests.map((r, index) => ({
        descriptorId: "request-" + index,
        kind: r.kind,
        status: "pending",
      }));
    },
    beginConditionRoll(input) {
      requests.push(structuredClone(input));
      return { descriptorId: "request-" + (requests.length - 1) };
    },
    openConditionRoll(id, options) {
      opened.push(id);
      this.rollOptions = options;
    },
    applyConditionFollowUps(state, result) {
      followUps.push(result);
    },
    dialog(title, body, options) {
      dialog = { title, body, options };
      this.render();
    },
    toast(message, error) {
      if (error) errors.push(message);
    },
    canUndo() {
      return store.history.at(-1)?.controller === this.role;
    },
    undo() {
      store.undo(this.role);
      this.render();
    },
    commit(label, fn, options = {}) {
      if (this.offline && !options.local) throw Error("Reconnect before shared changes");
      store.commit(label, fn, this.role, {
        shared: !options.local,
        visibility: options.visibility,
      });
      commits.push({ label, options });
      this.render();
      return { applied: true };
    },
    render() {
      this.html = ui.renderConditionsPanel(this);
      this.root = parse(this.html);
      ui.bindConditionsPanel(this.root, this);
    },
  };
  const node = (selector) => {
    const n = ctx.root.querySelector(selector);
    assert.ok(n, "Missing " + selector);
    return n;
  };
  return {
    ctx,
    commits,
    errors,
    requests,
    opened,
    followUps,
    node,
    open() {
      ui.openConditions(ctx, { actorId: "livia" });
    },
    click(selector) {
      const n = node(selector);
      assert.equal(n.disabled, false, selector + " disabled");
      return n.events.click?.({ target: n, preventDefault() {} });
    },
    input(key, value) {
      const n = node('[data-conditions-field="' + key + '"]');
      n.value = value;
      n.events.input?.({ target: n });
    },
    change(key, value) {
      const n = node('[data-conditions-field="' + key + '"]');
      if (n.type === "checkbox") n.checked = value;
      else n.value = value;
      n.events.change?.({ target: n });
    },
    reload() {
      const saved = JSON.stringify(store.state);
      store = createStore({ storage: { getItem: () => saved, setItem() {} } });
      ui.resetConditionsUI();
    },
    get dialog() {
      return dialog;
    },
  };
}
test("condition panel opens a pure overview and a source-aware preview before applying once", () => {
  const h = harness();
  const before = structuredClone(h.ctx.state);
  h.open();
  assert.deepEqual(h.ctx.state, before);
  h.click("[data-conditions-add]");
  h.click('[data-conditions-definition="poisoned"]');
  h.input("originLabel", "Synthetic toxin");
  h.click("[data-conditions-preview]");
  assert.equal(h.commits.length, 0);
  assert.match(h.ctx.html, /Synthetic toxin/);
  h.click("[data-conditions-apply]");
  assert.equal(h.ctx.state.actors.livia.conditions.filter((c) => c.id === "poisoned").length, 1);
  assert.equal(h.commits.length, 1);
  assert.equal(h.followUps.length, 1);
  h.reload();
  h.open();
  assert.match(h.ctx.html, /Poisoned/);
});
test("ending one of two origins preserves the other and preview cancellation preserves both", () => {
  const h = harness();
  h.ctx.state.actors.livia.conditions = [
    "poisoned",
    {
      id: "poisoned",
      instanceId: "second",
      origin: { label: "Second origin" },
      source,
      term: { kind: "manual" },
      owner: "player",
      visibility: "shared",
    },
  ];
  h.open();
  const instance = domain
    .getConditionOverview(h.ctx.state, "livia", "player")
    .instances.find((c) => c.instanceId === "second");
  assert.ok(instance);
  h.click('[data-conditions-end="second"]');
  h.input("reason", "Cause ended");
  h.click("[data-conditions-preview]");
  h.click("[data-conditions-cancel]");
  assert.equal(h.ctx.state.actors.livia.conditions.length, 2);
  h.click('[data-conditions-end="second"]');
  h.input("reason", "Cause ended");
  h.click("[data-conditions-preview]");
  h.click("[data-conditions-apply]");
  assert.equal(h.ctx.state.actors.livia.conditions.length, 1);
  assert.match(h.ctx.html, /Poisoned/);
});
test("invalid values survive render and a text blur does not replace the next click target", () => {
  const h = harness();
  h.open();
  h.click('[data-conditions-command="damage"]');
  h.input("amount", "");
  h.input("reason", "Visible input remains");
  const old = h.node("[data-conditions-preview]");
  h.change("reason", "Visible input remains");
  assert.equal(h.node("[data-conditions-preview]"), old);
  h.click("[data-conditions-preview]");
  assert.equal(h.node('[data-conditions-field="reason"]').value, "Visible input remains");
  assert.equal(h.node('[data-conditions-field="amount"]').value, "");
  assert.equal(h.node("[data-conditions-apply]").disabled, true);
  assert.equal(h.commits.length, 0);
});
test("shared offline apply preserves review input and personal apply is private", () => {
  const h = harness();
  h.open();
  h.click('[data-conditions-command="heal"]');
  h.input("amount", "2");
  h.input("reason", "Known healing");
  h.click("[data-conditions-preview]");
  h.ctx.offline = true;
  h.click("[data-conditions-apply]");
  assert.equal(h.ctx.state.actors.livia.hp, 10);
  assert.equal(h.node('[data-conditions-field="reason"]').value, "Known healing");
  h.ctx.state.actors.livia.visibility = "private";
  h.ctx.state.actors.livia.campaignIds = [];
  h.click("[data-conditions-preview]");
  h.click("[data-conditions-apply]");
  assert.equal(h.ctx.state.actors.livia.hp, 12);
  assert.equal(h.commits.at(-1).options.local, true);
  assert.equal(h.commits.at(-1).options.visibility, "private");
});
test("death save uses a typed queue callback and refresh never opens a competing request", () => {
  const h = harness();
  Object.assign(h.ctx.state.actors.livia, { hp: 0, conditions: ["unconscious"] });
  h.open();
  h.click("[data-conditions-death-save]");
  assert.deepEqual(h.requests, [{ kind: "death-save", actorId: "livia" }]);
  assert.deepEqual(h.opened, ["request-0"]);
  h.ctx.render();
  assert.equal(h.opened.length, 1);
});
test("role change drops the personal panel instead of reusing its private cached preview", () => {
  const h = harness();
  h.ctx.state.actors.livia.visibility = "private";
  h.ctx.state.actors.livia.name = "PRIVATE-SUBJECT";
  h.open();
  h.click('[data-conditions-command="heal"]');
  h.input("amount", "2");
  h.input("reason", "PRIVATE-REASON");
  h.click("[data-conditions-preview]");
  h.ctx.role = "dm";
  h.ctx.render();
  assert.ok(!h.ctx.html.includes("PRIVATE-SUBJECT"));
  assert.ok(!h.ctx.html.includes("PRIVATE-REASON"));
  assert.ok(!h.ctx.root.querySelector("[data-conditions-apply]"));
});

// ---------------------------------------------------------------- added with the UI module

const second = () => ({
  id: "poisoned",
  instanceId: "second",
  origin: { label: "Second origin" },
  source,
  term: { kind: "manual" },
  owner: "player",
  visibility: "shared",
});
const fire = (node, name, patch = {}) => {
  Object.assign(node, patch);
  return node.events[name]?.({ target: node, preventDefault() {} });
};

test("summary next to HP shows vital state, HP and grouped chips and opens the single dialog", () => {
  const h = harness();
  Object.assign(h.ctx.state.actors.livia, {
    tempHp: 3,
    exhaustion: 2,
    conditions: ["poisoned", second()],
  });
  const html = ui.renderConditionsSummary(h.ctx, "livia");
  assert.match(html, /data-conditions-summary="livia"/);
  assert.match(html, /Livia/);
  assert.match(html, />10</);
  assert.match(html, />22</);
  assert.match(html, /Temporary HP[^<]*<[^>]*>3</);
  assert.match(html, /Conscious/);
  assert.match(html, /data-conditions-chip="poisoned">Poisoned<span[^>]*> ×2</);
  assert.match(html, /data-conditions-chip="exhaustion">Exhaustion<span[^>]*> 2</);
  const root = parse(html);
  assert.equal(root.querySelectorAll("[data-conditions-entry]").length, 1, "one entry point");
  ui.bindConditionsSummary(root, h.ctx);
  fire(root.querySelector('[data-conditions-entry="livia"]'), "click");
  assert.ok(h.dialog, "dialog opened");
  assert.match(h.ctx.html, /data-conditions-group="poisoned"/);
  assert.equal(
    h.ctx.root.querySelectorAll("[data-conditions-end]").length,
    2,
    "each origin has its own End",
  );
  assert.match(h.ctx.html, /remains active/i);
  Object.assign(h.ctx.state.actors.livia, { visibility: "private", owner: "dm" });
  assert.equal(ui.renderConditionsSummary(h.ctx, "livia"), "", "unreadable actor renders nothing");
});

test("manual label applies no rules whatever its name", () => {
  const h = harness();
  h.open();
  h.click("[data-conditions-add]");
  h.click("[data-conditions-custom]");
  assert.match(h.ctx.html, /applies no rules/);
  h.input("customLabel", "Poisoned");
  h.input("reason", "Oracle mark");
  h.click("[data-conditions-preview]");
  assert.equal(h.commits.length, 0);
  h.click("[data-conditions-apply]");
  const livia = h.ctx.state.actors.livia;
  assert.equal(livia.conditions.length, 1);
  assert.equal(livia.conditions[0].custom, true);
  assert.equal(livia.conditions[0].label, "Poisoned");
  assert.equal(domain.hasCondition(livia, "poisoned"), false);
  assert.match(h.ctx.html, /data-conditions-group="custom"/);
});

test("exhaustion from the catalog opens a stepper on the canonical level", () => {
  const h = harness();
  h.open();
  h.click("[data-conditions-add]");
  h.click('[data-conditions-definition="exhaustion"]');
  assert.equal(h.node('[data-conditions-step="-1"]').disabled, true, "cannot go below 0");
  h.click('[data-conditions-step="1"]');
  h.click('[data-conditions-step="1"]');
  assert.equal(h.node('[data-conditions-field="level"]').value, "2");
  assert.match(h.ctx.html, /−4/, "shows the d20 penalty of the chosen level");
  h.input("reason", "Forced march");
  h.click("[data-conditions-preview]");
  h.click("[data-conditions-apply]");
  const livia = h.ctx.state.actors.livia;
  assert.equal(livia.exhaustion, 2);
  assert.equal(
    livia.conditions.some((c) => (c.id ?? c) === "exhaustion"),
    false,
  );
  assert.match(h.ctx.html, /data-conditions-group="exhaustion"/);
});

test("term fields build clock and rest terms and list only authorized subjects", () => {
  const h = harness();
  h.ctx.state.actors.secret = {
    ...structuredClone(h.ctx.state.actors.livia),
    id: "secret",
    name: "SECRET-DM",
    owner: "dm",
    visibility: "private",
    campaignIds: [],
  };
  h.open();
  h.click("[data-conditions-add]");
  h.click('[data-conditions-definition="poisoned"]');
  h.change("termKind", "turn");
  assert.ok(h.node('[data-conditions-field="termActor"]').inner.includes('value="livia"'));
  assert.ok(
    !h.ctx.html.includes("SECRET-DM"),
    "private actor of another identity is not selectable",
  );
  h.change("termKind", "clock");
  h.input("termAmount", "1");
  h.change("termUnit", "minutes");
  h.click("[data-conditions-preview]");
  h.click("[data-conditions-apply]");
  const clock = h.ctx.state.actors.livia.conditions.find((c) => c.id === "poisoned");
  assert.deepEqual(clock.term, { kind: "clock", clockId: "lanterns", expiresAt: 60 });
  h.click("[data-conditions-add]");
  h.click('[data-conditions-definition="blinded"]');
  h.change("termKind", "rest");
  h.change("termRest", "long");
  h.click("[data-conditions-preview]");
  h.click("[data-conditions-apply]");
  const rest = h.ctx.state.actors.livia.conditions.find((c) => c.id === "blinded");
  assert.deepEqual(rest.term, { kind: "rest", actorId: "livia", restKind: "long" });
  assert.match(h.ctx.html, /Long Rest/);
});

test("cause-bound and rest-bound unconsciousness explain how they end instead of offering End", () => {
  const h = harness();
  Object.assign(h.ctx.state.actors.livia, {
    hp: 0,
    conditions: [
      {
        id: "unconscious",
        instanceId: "zero",
        cause: "zero-hp",
        source,
        owner: "player",
        visibility: "shared",
      },
      {
        id: "unconscious",
        instanceId: "nap",
        restId: "rest-1",
        cause: "sleep",
        source,
        owner: "player",
        visibility: "shared",
      },
    ],
  });
  h.open();
  assert.equal(h.ctx.root.querySelector('[data-conditions-end="zero"]'), null);
  assert.equal(h.ctx.root.querySelector('[data-conditions-end="nap"]'), null);
  assert.match(h.ctx.html, /regains Hit Points/);
  assert.match(h.ctx.html, /Rest panel/);
});

test("stand up previews half-speed cost and spends only movement", () => {
  const h = harness();
  Object.assign(h.ctx.state.combat, { active: true, turn: 0, order: ["livia", "goblin-1"] });
  Object.assign(h.ctx.state.actors.livia, {
    conditions: ["prone"],
    speed: 9,
    movement: 9,
    movementSpent: 0,
    dashCount: 0,
    action: true,
  });
  h.open();
  h.click('[data-conditions-command="stand"]');
  assert.equal(h.commits.length, 0);
  assert.match(h.ctx.html, /4\.5 m/);
  assert.match(h.ctx.html, /no action or Dash/i);
  h.click("[data-conditions-apply]");
  const livia = h.ctx.state.actors.livia;
  assert.equal(livia.movement, 4.5);
  assert.equal(livia.action, true);
  assert.equal(livia.dashCount, 0);
  assert.equal(domain.hasCondition(livia, "prone"), false);
  assert.equal(h.followUps.length, 1);
});

test("stabilize names helper and target and starts one typed Medicine request through the queue", () => {
  const h = harness();
  Object.assign(h.ctx.state.actors.livia, { hp: 0, conditions: ["unconscious"] });
  h.open();
  h.click('[data-conditions-command="aid"]');
  assert.equal(h.node('[data-conditions-field="target"]').value, "livia");
  assert.equal(h.node('[data-conditions-field="helper"]').value, "mira");
  assert.ok(
    !h.node('[data-conditions-field="helper"]').inner.includes('value="livia"'),
    "a dying creature cannot help",
  );
  assert.ok(
    !h.node('[data-conditions-field="helper"]').inner.includes('value="doran"'),
    "only controlled helpers",
  );
  h.click("[data-conditions-preview]");
  assert.match(h.ctx.html, /DC 10/);
  assert.match(h.ctx.html, /\+3/);
  h.click("[data-conditions-apply]");
  assert.equal(h.commits.length, 0, "the root commits the attempt");
  const { reviewKey, ...request } = h.requests[0];
  assert.deepEqual(request, {
    kind: "medicine",
    actorId: "mira",
    targetId: "livia",
    aidKind: "stabilize",
  });
  assert.equal(typeof reviewKey, "string");
  assert.deepEqual(h.opened, ["request-0"]);
  h.click('[data-conditions-command="aid"]');
  h.click("[data-conditions-preview]");
  h.click("[data-conditions-apply]");
  assert.equal(h.requests.length, 1, "pending Medicine request is reopened, not duplicated");
  assert.deepEqual(h.opened, ["request-0", "request-0"]);
});

test("a dead creature cannot be healed and a correction is not a resurrection", () => {
  const h = harness();
  Object.assign(h.ctx.state.actors.livia, { hp: 0, dead: true });
  h.open();
  assert.equal(h.node('[data-conditions-command="heal"]').disabled, true);
  assert.match(h.ctx.html, /regains no HP until magic/);
  h.click('[data-conditions-command="correct"]');
  h.input("hp", "5");
  h.change("dead", false);
  h.input("reason", "Wrong record");
  h.click("[data-conditions-preview]");
  assert.match(h.ctx.html, /not a performed resurrection/);
  h.click("[data-conditions-apply]");
  const livia = h.ctx.state.actors.livia;
  assert.equal(livia.hp, 5);
  assert.equal(livia.dead, false);
  assert.equal(h.ctx.state.conditionEvents.at(-1).kind, "vitality-correct");
});

test("death-save pips show counts and an existing request is reopened instead of a second one", () => {
  const h = harness();
  Object.assign(h.ctx.state.actors.livia, {
    hp: 0,
    conditions: ["unconscious"],
    deathSaves: { successes: 1, failures: 2, stable: false, recovery: null },
  });
  h.ctx.conditionRolls = () => [
    { descriptorId: "existing", kind: "death-save", status: "pending" },
  ];
  h.open();
  assert.match(h.ctx.html, /Successes 1\/3/);
  assert.match(h.ctx.html, /Failures 2\/3/);
  assert.match(h.ctx.html, /Dying/);
  h.click("[data-conditions-death-save]");
  assert.deepEqual(h.requests, []);
  assert.deepEqual(h.opened, ["existing"]);
  h.ctx.conditionRolls = () => [];
  Object.assign(h.ctx.state.combat, { active: true, turn: 1 });
  h.ctx.render();
  assert.equal(h.ctx.root.querySelector("[data-conditions-death-save]"), null);
  assert.match(h.ctx.html, /start of its turn/);
});

test("edits after a preview make it stale and history renders only when expanded", () => {
  const h = harness();
  h.open();
  h.click('[data-conditions-command="damage"]');
  h.input("amount", "3");
  h.input("reason", "Trap");
  h.click("[data-conditions-preview]");
  h.input("amount", "4");
  assert.equal(h.node("[data-conditions-apply]").disabled, true, "stale preview cannot apply");
  h.click("[data-conditions-preview]");
  h.click("[data-conditions-apply]");
  assert.equal(h.ctx.state.actors.livia.hp, 6);
  assert.ok(!h.ctx.html.includes("Trap"), "collapsed history is not rendered");
  h.click("[data-conditions-history]");
  assert.match(h.ctx.html, /Trap/);
  assert.match(h.ctx.html, /Damage/);
  assert.equal(h.node("[data-conditions-history]").attrs["aria-expanded"], "true");
});

test("unknown held items stay a reconciliation until the dropped items are recorded", () => {
  const h = harness();
  h.ctx.state.actors.livia.heldItemIds = null;
  h.open();
  h.click("[data-conditions-add]");
  h.click('[data-conditions-definition="unconscious"]');
  h.click("[data-conditions-preview]");
  assert.match(h.ctx.html, /Held items unknown/);
  h.click("[data-conditions-apply]");
  const instance = h.ctx.state.actors.livia.conditions.find((c) => c.id === "unconscious");
  assert.deepEqual(instance.reconciliation, ["held-items"]);
  h.click(`[data-conditions-held-items="${instance.instanceId}"]`);
  fire(h.node('[data-conditions-held="staff"]'), "change", { checked: true });
  h.input("reason", "Dropped the staff");
  h.click("[data-conditions-preview]");
  h.click("[data-conditions-apply]");
  const after = h.ctx.state.actors.livia.conditions.find((c) => c.id === "unconscious");
  assert.deepEqual(after.droppedItemIds, ["staff"]);
  assert.deepEqual(after.reconciliation, []);
  assert.equal(
    domain.hasCondition(h.ctx.state.actors.livia, "prone"),
    true,
    "Unconscious keeps its distinct Prone",
  );
});

test("Italian is the default language of labels", () => {
  const h = harness();
  h.ctx.lang = "it";
  Object.assign(h.ctx.state.actors.livia, { conditions: ["poisoned"] });
  h.open();
  assert.match(h.ctx.html, /Avvelenato/);
  assert.match(h.ctx.html, /Aggiungi condizione/);
  assert.match(ui.renderConditionsSummary(h.ctx, "livia"), /Condizioni e stato/);
});

test("a role switch on a shared creature drops the other identity's unsent inputs", () => {
  const h = harness();
  h.open();
  h.click('[data-conditions-command="heal"]');
  h.input("amount", "2");
  h.input("reason", "PLAYER-DRAFT");
  h.click("[data-conditions-preview]");
  h.ctx.role = "dm";
  h.ctx.render();
  assert.ok(!h.ctx.html.includes("PLAYER-DRAFT"));
  assert.equal(h.ctx.root.querySelector("[data-conditions-apply]"), null);
  assert.equal(ui.refreshConditionsUI(h.ctx), false);
  h.ctx.role = "player";
  h.ctx.render();
  assert.equal(h.ctx.html, "", "the dropped panel does not come back for the original identity");
});

// ---------------------------------------------------------------- review 10 (UI findings)

const isPrimary = (h, selector) => /\bprimary\b/.test(h.node(selector).attrs.class);

test("review 10: temporary HP have their own command with keep-or-replace, never a correction", () => {
  const h = harness();
  h.open();
  h.click('[data-conditions-command="temp-hp"]');
  assert.match(h.ctx.html, /Receive Temporary HP/);
  h.input("amount", "5");
  h.input("reason", "False Life");
  h.click("[data-conditions-preview]");
  assert.match(h.ctx.html, /Temporary HP 0 → 5/);
  h.click("[data-conditions-apply]");
  assert.equal(h.ctx.state.actors.livia.tempHp, 5);
  assert.equal(h.commits.at(-1).label, "Temporary HP recorded");
  h.click('[data-conditions-command="temp-hp"]');
  h.input("amount", "8");
  h.input("reason", "Heroism");
  h.click("[data-conditions-preview]");
  assert.match(h.ctx.html, /do not stack/);
  assert.equal(h.node("[data-conditions-apply]").disabled, true);
  h.change("choice", "replace");
  h.click("[data-conditions-preview]");
  h.click("[data-conditions-apply]");
  assert.equal(h.ctx.state.actors.livia.tempHp, 8, "8, not 13");
});

test("review 10: an invalid preview marks its field and still shows the before/after rows", () => {
  const h = harness();
  h.open();
  h.click('[data-conditions-command="damage"]');
  h.input("amount", "30");
  h.click("[data-conditions-preview]");
  const reason = h.node('[data-conditions-field="reason"]');
  assert.equal(reason.attrs["aria-invalid"], "true");
  assert.match(reason.attrs["aria-describedby"], /conditions-error-reason/);
  assert.match(h.ctx.html, /id="conditions-error-reason">Provide a reason\./);
  assert.match(h.ctx.html, /HP<\/dt><dd class="conditions-values">10 → 0/);
  assert.equal(h.node("[data-conditions-apply]").disabled, true);
});

test("review 10: the Exhaustion level updates its effect and limits as it is typed", () => {
  const h = harness();
  h.open();
  h.click('[data-conditions-command="exhaustion"]');
  h.input("level", "4");
  assert.match(h.ctx.html, /Level 4: −8 to d20 Tests/);
  h.input("level", "6");
  assert.equal(h.node('[data-conditions-step="1"]').disabled, true);
  assert.match(h.ctx.html, /Level 6: the creature dies/);
});

test("review 10: one primary per view; an open command is selected and Apply is the primary", () => {
  const h = harness();
  h.open();
  assert.ok(isPrimary(h, '[data-conditions-command="add"]'));
  h.click('[data-conditions-command="heal"]');
  assert.equal(h.node('[data-conditions-command="heal"]').attrs["aria-pressed"], "true");
  assert.ok(!isPrimary(h, '[data-conditions-command="add"]'));
  h.input("amount", "2");
  h.input("reason", "Potion from Mira");
  h.click("[data-conditions-preview]");
  assert.equal([...h.ctx.html.matchAll(/class="button primary"/g)].length, 1);
  assert.ok(isPrimary(h, "[data-conditions-apply]"));
  const dying = harness();
  Object.assign(dying.ctx.state.actors.livia, { hp: 0, conditions: ["unconscious"] });
  dying.open();
  assert.ok(isPrimary(dying, "[data-conditions-death-save]"));
  const primaries = [...dying.ctx.html.matchAll(/class="button primary"/g)].length;
  assert.equal(primaries, 1, "Roll death save is the only primary");
});

test("review 10: Stand up at Speed 0 is disabled with a visible reason and no crawl line", () => {
  const h = harness();
  domain.applyVitalityEvent(h.ctx.state, {
    eventId: "drop-livia",
    actorId: "livia",
    kind: "damage",
    amount: 10,
    source,
  });
  assert.ok(h.ctx.state.actors.livia.conditions.some((c) => c.id === "prone"));
  h.open();
  const stand = h.node('[data-conditions-command="stand"]');
  assert.equal(stand.disabled, true);
  assert.equal(stand.attrs["aria-describedby"], "conditions-stand-why");
  assert.match(h.ctx.html, /id="conditions-stand-why">Speed 0: it cannot stand up\./);
  assert.doesNotMatch(h.ctx.html, /Can crawl/);
  assert.match(h.ctx.html, /Prone with Speed 0/);
});

test("review 10: offline, shared rolls are disabled with a reason and nothing claims to queue", () => {
  const h = harness();
  Object.assign(h.ctx.state.actors.livia, { hp: 0, conditions: ["unconscious"] });
  h.ctx.offline = true;
  h.open();
  assert.equal(h.node("[data-conditions-death-save]").disabled, true);
  assert.match(h.ctx.html, /Offline: reconnect to record this shared roll\./);
  assert.match(h.ctx.html, /nothing is queued/);
  assert.doesNotMatch(h.ctx.html, /waits for reconnection/);
});

test("review 10: the apply preview shows the end term; a declared origin cites no SRD page", () => {
  const h = harness();
  h.open();
  h.click('[data-conditions-command="add"]');
  h.click('[data-conditions-definition="poisoned"]');
  h.input("originLabel", "Poisoned blade");
  h.change("termKind", "turn");
  h.click("[data-conditions-preview]");
  assert.match(
    h.ctx.html,
    /<dt>End<\/dt><dd class="conditions-values">Not recorded → End of Livia&#39;s next turn/,
  );
  assert.match(
    h.ctx.html,
    /<dt>Origin<\/dt><dd class="conditions-values">Not recorded → Poisoned blade<\/dd><\/div>/,
  );
});

test("review 10: a visible hostile token can be the cause or the turn, not the resting creature", () => {
  const h = harness();
  h.open();
  h.click('[data-conditions-command="add"]');
  h.click('[data-conditions-definition="frightened"]');
  const origin = h.node('[data-conditions-field="originActor"]').inner;
  assert.match(origin, /Sentinella/);
  h.change("termKind", "turn");
  assert.match(h.node('[data-conditions-field="termActor"]').inner, /Sentinella/);
  h.change("termKind", "rest");
  assert.doesNotMatch(h.node('[data-conditions-field="termActor"]').inner, /Sentinella/);
});

test("review 10: a vital roll started from the panel offers the way back to it", () => {
  const h = harness();
  Object.assign(h.ctx.state.actors.livia, { hp: 0, conditions: ["unconscious"] });
  h.open();
  h.click("[data-conditions-death-save]");
  assert.equal(typeof h.ctx.rollOptions?.returnTo, "function");
  h.ctx.rollOptions.returnTo();
  assert.match(h.dialog.title, /Conditions and status/);
});

test("review 10: a vitality reconciliation offers the command that resolves it", () => {
  const h = harness();
  Object.assign(h.ctx.state.actors.livia, { hp: 0, conditions: [] });
  h.open();
  assert.match(h.ctx.html, /0 HP without recorded unconsciousness/);
  h.click('[data-conditions-reconcile="add"]');
  assert.match(h.ctx.html, /data-conditions-change-definition/);
  assert.match(h.ctx.html, /Unconscious/);
});

test("review 10: the sheet HP card embeds the single entry without repeating name and HP", () => {
  const h = harness();
  const html = ui.renderConditionsSummary(h.ctx, "livia", { embedded: true });
  assert.doesNotMatch(html, /conditions-summary-hp/);
  assert.doesNotMatch(html, /<strong>Livia<\/strong>/);
  assert.match(html, /data-conditions-entry="livia"/);
  assert.match(html, /Damage, healing and conditions/);
});
