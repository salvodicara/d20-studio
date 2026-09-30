import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { esc } from "../ui.mjs";
import * as rest from "../rest-time.mjs";
import {
  openRest,
  openGameTime,
  renderRestPanel,
  bindRestPanel,
  resetRestUI,
} from "../rest-ui.mjs";

const source = {
  kind: "authored",
  revision: "rest-ui-fixture-1",
  title: "Synthetic recovery profile",
};
const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
afterEach(resetRestUI);
function harness() {
  const values = new Map(),
    errors = [],
    commits = [];
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  let store = createStore({ storage });
  const campaignId = store.state.campaign.id;
  store.state.actors.hero = {
    id: "hero",
    name: "Synthetic Hero",
    kind: "character",
    owner: "player",
    visibility: "shared",
    campaignIds: [campaignId],
    hp: 5,
    maxHp: 20,
    tempHp: 3,
    exhaustion: 1,
    abilities: { con: 14 },
    hitDice: { d8: { max: 3, used: 0 } },
    spellSlots: { 1: { max: 4, used: 2 } },
    pactSlots: { level: 2, max: 2, used: 1 },
    features: [{ id: "wind", name: "Synthetic Wind", resourceId: "wind-pool", max: 3, used: 2 }],
    inventory: [],
    restProfile: {
      source,
      recoveries: [
        {
          id: "wind-short",
          target: { kind: "feature", id: "wind", resourceId: "wind-pool" },
          trigger: "short",
          operation: "reduce-used",
          amount: 1,
          source,
        },
        {
          id: "slots-long",
          target: { kind: "spellSlots" },
          trigger: "long",
          operation: "all",
          source,
        },
      ],
      arcaneRecovery: { wizardLevel: 3, used: 0, source },
    },
  };
  store.state.combat.active = false;
  const ctx = {
    get state() {
      return store.state;
    },
    get storageError() {
      return store.storageError;
    },
    role: "player",
    lang: "en",
    offline: false,
    esc,
    t: (it, en) => en,
    label: (v) => (typeof v === "object" && v ? v.en || v.it || "" : String(v ?? "")),
    rollDie: () => 3,
    toast(text, error) {
      if (error) errors.push(text);
    },
    dialog(title, body, options) {
      this.dialogOpen = true;
      this.dialogOptions = options;
      this.render();
    },
    closeDialog() {
      this.dialogOpen = false;
    },
    commit(label, mutate, options = {}) {
      if (this.offline && !options.local) throw Error("Shared change requires connection.");
      store.commit(label, mutate, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      commits.push({ label, options });
      this.render();
      return { applied: true, persisted: true };
    },
    canUndo: () =>
      store.history.at(-1)?.controller === ctx.role &&
      !(ctx.offline && store.history.at(-1)?.shared),
    undo() {
      store.undo(this.role);
      this.render();
    },
    render() {
      this.html = renderRestPanel(this);
      const nodes = [
        ...this.html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
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
          type: attrs.type || "",
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
          addEventListener(type, fn) {
            events[type] = fn;
          },
          focus() {},
          scrollIntoView() {},
        };
      });
      this.root = {
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
      bindRestPanel(this.root, this);
    },
  };
  const node = (selector) => {
    const n = ctx.root.querySelector(selector);
    assert.ok(n, `Missing ${selector}`);
    return n;
  };
  const h = {
    ctx,
    errors,
    commits,
    node,
    reload() {
      store = createStore({ storage });
      resetRestUI();
    },
    click(selector) {
      const n = node(selector);
      assert.equal(n.disabled, false, `${selector} disabled`);
      return (n.onclick || n.events.click)?.({ preventDefault() {}, target: n });
    },
    change(selector, value) {
      const n = node(selector);
      if (n.type === "checkbox") n.checked = value;
      else n.value = value;
      return n.events.change?.({ target: n });
    },
    input(selector, value) {
      const n = node(selector);
      n.value = value;
      return n.events.input?.({ target: n });
    },
  };
  return h;
}
function begin(h, kind = "short") {
  openRest(h.ctx, { actorId: "hero" });
  if (kind !== "short") h.change("[data-rest-kind]", kind);
  h.click("[data-rest-preview-start]");
  h.click("[data-rest-start]");
  return rest.listRests(h.ctx.state, h.ctx.role, { actorId: "hero" }).at(-1).id;
}
function elapsed(h, seconds) {
  h.ctx.role = "dm";
  openGameTime(h.ctx);
  h.input("[data-rest-time-value]", String(seconds));
  h.change("[data-rest-time-unit]", "1");
  h.click("[data-rest-preview-time]");
  h.click("[data-rest-apply]");
  h.ctx.role = "player";
  resetRestUI();
  openRest(h.ctx, { actorId: "hero" });
}
function completedShort(h) {
  const id = begin(h);
  elapsed(h, 3600);
  h.click('[data-rest-complete="hero"]');
  h.click("[data-rest-apply]");
  return id;
}

test("a rest preview and confirmed start do not heal or advance time", () => {
  const h = harness();
  openRest(h.ctx, { actorId: "hero" });
  h.click("[data-rest-preview-start]");
  assert.equal(rest.listRests(h.ctx.state, "player").length, 0);
  assert.equal(h.ctx.state.actors.hero.hp, 5);
  h.click("[data-rest-start]");
  assert.equal(h.ctx.state.actors.hero.hp, 5);
  assert.equal(rest.getGameTime(h.ctx.state, h.ctx.state.campaign.id, "player").seconds, 0);
  assert.ok(h.commits.every(({ options }) => options.undoable !== false));
  assert.deepEqual(h.errors, []);
});

test("DM advances one shared clock and recovery requires its own completion preview", () => {
  const h = harness();
  begin(h);
  elapsed(h, 3600);
  assert.equal(h.ctx.state.actors.hero.features[0].used, 2);
  h.click('[data-rest-complete="hero"]');
  assert.equal(h.ctx.state.actors.hero.features[0].used, 2);
  h.click("[data-rest-apply]");
  assert.equal(h.ctx.state.actors.hero.features[0].used, 1);
  assert.equal(h.ctx.state.actors.hero.hp, 5);
  assert.equal(rest.getGameTime(h.ctx.state, h.ctx.state.campaign.id, "player").seconds, 3600);
  assert.deepEqual(h.errors, []);
});

test("physical Hit Die remains pending across close and reload and invalid input survives rerender", () => {
  const h = harness();
  completedShort(h);
  h.change('[data-rest-dice-mode="hero"]', "physical");
  h.click('[data-rest-hit-die="hero"]');
  const roll = rest.getRestRolls(h.ctx.state, "player").at(-1);
  assert.equal(h.ctx.state.actors.hero.hitDice.d8.used, 1);
  h.input(`[data-rest-face="${roll.id}"]`, "9");
  h.click(`[data-rest-resolve="${roll.id}"]`);
  assert.equal(h.node(`[data-rest-face="${roll.id}"]`).value, "9");
  assert.equal(h.ctx.state.actors.hero.hp, 5);
  h.ctx.closeDialog();
  h.reload();
  openRest(h.ctx, { actorId: "hero" });
  assert.equal(rest.getRestRolls(h.ctx.state, "player").at(-1).mode, "physical");
  h.input(`[data-rest-face="${roll.id}"]`, "3");
  h.click(`[data-rest-resolve="${roll.id}"]`);
  assert.equal(h.ctx.state.actors.hero.hp, 10);
  assert.equal(h.ctx.state.actors.hero.hitDice.d8.used, 1);
  assert.match(h.ctx.html, /3.*2.*5/s);
});

test("personal actor and resting data are not exposed to a DM non-owner", () => {
  const h = harness();
  h.ctx.state.actors.hero.visibility = "private";
  h.ctx.state.actors.hero.campaignIds = [];
  begin(h);
  h.ctx.role = "dm";
  resetRestUI();
  openRest(h.ctx, { actorId: "hero" });
  assert.doesNotMatch(h.ctx.html, /Synthetic Hero|wind-pool/);
  assert.equal(rest.listRests(h.ctx.state, "dm", { actorId: "hero" }).length, 0);
});

test("Undo of physical resolution reuses the accepted face and Undo of expenditure retains evidence", () => {
  const h = harness();
  completedShort(h);
  h.change('[data-rest-dice-mode="hero"]', "physical");
  h.click('[data-rest-hit-die="hero"]');
  const id = rest.getRestRolls(h.ctx.state, "player").at(-1).id;
  h.input(`[data-rest-face="${id}"]`, "3");
  h.click(`[data-rest-resolve="${id}"]`);
  assert.equal(h.ctx.state.actors.hero.hp, 10);
  h.click("[data-rest-undo]");
  assert.equal(h.ctx.state.actors.hero.hp, 5);
  assert.equal(h.ctx.state.actors.hero.hitDice.d8.used, 1);
  assert.equal(h.ctx.root.querySelector(`[data-rest-face="${id}"]`), null);
  assert.match(h.ctx.html, /Reapply known result/);
  h.click(`[data-rest-resolve="${id}"]`);
  assert.equal(h.ctx.state.actors.hero.hp, 10);
  assert.equal(h.ctx.state.actors.hero.hitDice.d8.used, 1);
  h.click("[data-rest-undo]");
  h.click("[data-rest-undo]");
  assert.equal(h.ctx.state.actors.hero.hitDice.d8.used, 0);
  const record = rest.getRestRolls(h.ctx.state, "player").find((r) => r.id === id);
  assert.equal(record.status, "reversed");
  assert.equal(record.acceptedFace, 3);
  assert.equal(h.ctx.root.querySelector(`[data-rest-resolve="${id}"]`), null);
  assert.deepEqual(h.errors, []);
});

test("quick digital recovery honors the total cap and requires a fresh preview when edited", () => {
  const h = harness();
  completedShort(h);
  h.click('[data-rest-hit-die="hero"]'); // already spent one in this benefit
  h.input('[data-rest-quick-cap="hero"]', "2");
  h.click('[data-rest-quick-preview="hero"]');
  h.click('[data-rest-quick-run="hero"]');
  assert.equal(h.ctx.state.actors.hero.hitDice.d8.used, 2);
  assert.equal(h.ctx.state.actors.hero.hp, 15);
  assert.match(h.ctx.html, /Total maximum reached/);
  h.input('[data-rest-quick-cap="hero"]', "3");
  assert.equal(h.node('[data-rest-quick-run="hero"]').disabled, true);
  h.click('[data-rest-quick-preview="hero"]');
  assert.match(h.ctx.html, /below the next die/);
  assert.equal(h.node('[data-rest-quick-run="hero"]').disabled, true);
  assert.deepEqual(h.errors, []);
});

test("quick physical recovery requests exactly one face before continuing", () => {
  const h = harness();
  completedShort(h);
  h.change('[data-rest-dice-mode="hero"]', "physical");
  h.input('[data-rest-quick-cap="hero"]', "3");
  h.click('[data-rest-quick-preview="hero"]');
  h.click('[data-rest-quick-run="hero"]');
  const roll = rest.getRestRolls(h.ctx.state, "player").at(-1);
  assert.equal(roll.status, "pending");
  assert.equal(h.ctx.state.actors.hero.hitDice.d8.used, 1);
  h.input(`[data-rest-face="${roll.id}"]`, "3");
  h.click(`[data-rest-resolve="${roll.id}"]`);
  assert.equal(h.ctx.state.actors.hero.hitDice.d8.used, 1);
  assert.equal(h.ctx.state.actors.hero.hp, 10);
  h.click('[data-rest-quick-run="hero"]');
  assert.equal(h.ctx.state.actors.hero.hitDice.d8.used, 2);
  assert.equal(
    rest.getRestRolls(h.ctx.state, "player").filter((r) => r.status === "pending").length,
    1,
  );
  assert.deepEqual(h.errors, []);
});

test("an interrupted long shows earned short recovery, keeps remaining time, and resumes", () => {
  const h = harness();
  begin(h, "long");
  elapsed(h, 3600);
  h.click('[data-rest-interrupt="hero"]');
  const part = rest.listRests(h.ctx.state, "player").at(-1).participants[0];
  assert.equal(part.status, "interrupted");
  assert.equal(part.requiredSeconds, 32400);
  assert.equal(part.benefits[0].applied, true);
  assert.equal(h.ctx.state.actors.hero.features[0].used, 1);
  assert.ok(h.node('[data-rest-hit-die="hero"]'));
  h.click('[data-rest-resume="hero"]');
  assert.equal(rest.listRests(h.ctx.state, "player").at(-1).participants[0].status, "resting");
  assert.equal(h.ctx.state.actors.hero.hp, 5);
  assert.deepEqual(h.errors, []);
});

test("sleep is an explicit start consequence and long completion previews each recovery", () => {
  const h = harness();
  h.ctx.state.actors.hero.concentration = { id: "focus", active: true };
  openRest(h.ctx, { actorId: "hero" });
  h.change("[data-rest-kind]", "long");
  h.change('[data-rest-start-activity="hero"]', "sleep");
  h.click("[data-rest-preview-start]");
  assert.equal(h.ctx.state.actors.hero.concentration.active, true);
  assert.match(h.ctx.html, /Sleep adds Unconscious/);
  assert.match(h.ctx.html, /Concentration · sleep ends it/);
  assert.match(h.ctx.html, /Active → Ended/);
  h.click("[data-rest-start]");
  assert.equal(h.ctx.state.actors.hero.concentration.active, false);
  elapsed(h, 28800);
  h.click('[data-rest-complete="hero"]');
  assert.equal(h.ctx.state.actors.hero.hp, 5);
  assert.match(h.ctx.html, /5 → 20/);
  h.click("[data-rest-apply]");
  assert.equal(h.ctx.state.actors.hero.hp, 20);
  assert.equal(h.ctx.state.actors.hero.tempHp, 0);
  assert.equal(h.ctx.state.actors.hero.exhaustion, 0);
  assert.equal(h.ctx.state.actors.hero.spellSlots[1].used, 0);
  assert.deepEqual(h.errors, []);
});

test("Arcane Recovery remains a distinct reviewed choice with missing counts visible", () => {
  const h = harness();
  completedShort(h);
  assert.equal(h.ctx.state.actors.hero.spellSlots[1].used, 2);
  h.input('[data-rest-arcane="hero"]', "2");
  h.click('[data-rest-preview-arcane="hero"]');
  assert.equal(h.ctx.state.actors.hero.spellSlots[1].used, 2);
  h.click("[data-rest-apply]");
  assert.equal(h.ctx.state.actors.hero.spellSlots[1].used, 0);
  assert.equal(h.ctx.state.actors.hero.restProfile.arcaneRecovery.used, 1);
  assert.deepEqual(h.errors, []);
});

test("a correction needs a reason, preserves fields after failed preview, and is undoable", () => {
  const h = harness();
  completedShort(h);
  h.click('[data-rest-correct="hero"]');
  h.input("[data-rest-correction-value]", "12");
  h.click("[data-rest-preview-correction]");
  assert.equal(h.node("[data-rest-apply]").disabled, true);
  assert.equal(h.node("[data-rest-correction-value]").value, "12");
  h.input("[data-rest-correction-reason]", "Recorded previous healing incorrectly");
  h.click("[data-rest-preview-correction]");
  h.click("[data-rest-apply]");
  assert.equal(h.ctx.state.actors.hero.hp, 12);
  h.click("[data-rest-undo]");
  assert.equal(h.ctx.state.actors.hero.hp, 5);
  assert.deepEqual(h.errors, []);
});

test("offline personal rest uses private commits while shared preview cannot apply", () => {
  const h = harness();
  h.ctx.offline = true;
  openRest(h.ctx, { actorId: "hero" });
  h.click("[data-rest-preview-start]");
  assert.equal(h.node("[data-rest-start]").disabled, true);
  h.ctx.state.actors.hero.visibility = "private";
  h.ctx.state.actors.hero.campaignIds = [];
  resetRestUI();
  begin(h);
  h.click('[data-rest-record-time="hero"]');
  h.click('[data-rest-complete="hero"]');
  h.click("[data-rest-apply]");
  assert.equal(h.ctx.state.actors.hero.features[0].used, 1);
  assert.ok(
    h.commits.every(({ options }) => options.local === true && options.visibility === "private"),
  );
  assert.deepEqual(h.errors, []);
});

test("preview keys reject stale resources and changing a reviewed input disables apply", () => {
  const h = harness();
  begin(h);
  elapsed(h, 3600);
  h.click('[data-rest-complete="hero"]');
  h.ctx.state.actors.hero.features[0].used = 3;
  h.ctx.render();
  assert.equal(h.node("[data-rest-apply]").disabled, true);
  h.click('[data-rest-complete="hero"]');
  h.click("[data-rest-apply]");
  assert.equal(h.ctx.state.actors.hero.features[0].used, 2);
  h.ctx.role = "dm";
  openGameTime(h.ctx);
  h.click("[data-rest-preview-time]");
  h.input("[data-rest-time-value]", "20");
  assert.equal(h.node("[data-rest-apply]").disabled, true);
  assert.equal(
    h.ctx.dialogOptions.onSubmit(),
    false,
    "Enter in an input must not dismiss pending work",
  );
});

test("unrecorded partial usage stays visible and is not reset by Short Rest", () => {
  const h = harness();
  h.ctx.state.actors.hero.features[0].used = null;
  begin(h);
  elapsed(h, 3600);
  h.click('[data-rest-complete="hero"]');
  assert.match(h.ctx.html, /spent uses are unrecorded/);
  h.click("[data-rest-apply]");
  assert.equal(h.ctx.state.actors.hero.features[0].used, null);
  assert.deepEqual(h.errors, []);
});

test("participant selection excludes visible unowned and hidden sheets and can cancel its preview", () => {
  const h = harness();
  h.ctx.state.actors.other = {
    ...structuredClone(h.ctx.state.actors.hero),
    id: "other",
    owner: "dm",
    name: "Visible unowned fixture",
  };
  h.ctx.state.actors.secret = {
    ...structuredClone(h.ctx.state.actors.hero),
    id: "secret",
    owner: "dm",
    visibility: "private",
    campaignIds: [],
    name: "PRIVATE-NAME-MARKER",
  };
  h.ctx.state.actors.hero.name = '<script>alert("x")</script>';
  openRest(h.ctx, { actorId: "hero" });
  assert.equal(h.ctx.root.querySelector('[data-rest-participant="other"]'), null);
  assert.doesNotMatch(h.ctx.html, /PRIVATE-NAME-MARKER|<script>/);
  assert.match(h.ctx.html, /&lt;script&gt;/);
  h.change('[data-rest-participant="hero"]', false);
  h.click("[data-rest-preview-start]");
  assert.equal(h.node("[data-rest-start]").disabled, true);
  h.change('[data-rest-participant="hero"]', true);
  h.click("[data-rest-preview-start]");
  h.click("[data-rest-clear-preview]");
  assert.equal(rest.listRests(h.ctx.state, "player").length, 0);
  assert.equal(h.commits.length, 0);
  assert.deepEqual(h.errors, []);
});

test("a second personal Long Rest requires explicitly recorded elapsed hours", () => {
  const h = harness();
  h.ctx.state.actors.hero.visibility = "private";
  h.ctx.state.actors.hero.campaignIds = [];
  openRest(h.ctx, { actorId: "hero" });
  h.change("[data-rest-kind]", "long");
  h.change('[data-rest-start-activity="hero"]', "sleep");
  h.click("[data-rest-preview-start]");
  h.click("[data-rest-start]");
  h.input('[data-rest-elapsed="hero"]', "480");
  h.click('[data-rest-record-time="hero"]');
  h.click('[data-rest-complete="hero"]');
  h.click("[data-rest-apply]");
  h.click("[data-rest-new]");
  h.change("[data-rest-kind]", "long");
  h.click("[data-rest-preview-start]");
  assert.equal(h.node("[data-rest-start]").disabled, true);
  h.input("[data-rest-last-long]", "16");
  h.click("[data-rest-preview-start]");
  h.click("[data-rest-start]");
  assert.equal(rest.listRests(h.ctx.state, "player").length, 2);
  assert.equal(rest.listRests(h.ctx.state, "player").at(-1).participants[0].elapsedSeconds, 0);
  assert.deepEqual(h.errors, []);
});

test("a start preview discards cached participant labels after access is revoked", () => {
  const h = harness();
  h.ctx.state.actors.hero.name = "REVOKED-REST-PARTICIPANT";
  openRest(h.ctx, { actorId: "hero" });
  h.click("[data-rest-preview-start]");
  assert.match(h.ctx.html, /REVOKED-REST-PARTICIPANT/);
  h.ctx.state.actors.hero.owner = "dm";
  h.ctx.state.actors.hero.visibility = "private";
  h.ctx.state.actors.hero.campaignIds = [];
  h.ctx.render();
  assert.doesNotMatch(h.ctx.html, /REVOKED-REST-PARTICIPANT/);
  assert.equal(h.node("[data-rest-start]").disabled, true);
});

test("reversed accepted dice remain readable after Undo also removes their rest", () => {
  const h = harness();
  completedShort(h);
  h.change('[data-rest-dice-mode="hero"]', "physical");
  h.click('[data-rest-hit-die="hero"]');
  const rollId = rest.getRestRolls(h.ctx.state, "player").at(-1).id;
  h.input(`[data-rest-face="${rollId}"]`, "3");
  h.click(`[data-rest-resolve="${rollId}"]`);
  h.click("[data-rest-undo]");
  h.click("[data-rest-undo]");
  h.click("[data-rest-undo]");
  h.ctx.role = "dm";
  openGameTime(h.ctx);
  h.click("[data-rest-undo]");
  h.ctx.role = "player";
  openRest(h.ctx, { actorId: "hero" });
  h.click("[data-rest-undo]");
  assert.equal(rest.listRests(h.ctx.state, "player").length, 0);
  resetRestUI();
  openRest(h.ctx, { actorId: "hero" });
  assert.match(h.ctx.html, /Recorded Hit Dice/);
  assert.match(h.ctx.html, /Expenditure reversed; result retained in the record. 3/);
  assert.equal(h.ctx.root.querySelector(`[data-rest-resolve="${rollId}"]`), null);
  assert.deepEqual(h.errors, []);
});

test("authorized personal die evidence does not require live campaign access after joining", () => {
  const h = harness();
  h.ctx.state.actors.hero.visibility = "private";
  h.ctx.state.actors.hero.campaignIds = [];
  begin(h);
  h.click('[data-rest-record-time="hero"]');
  h.click('[data-rest-complete="hero"]');
  h.click("[data-rest-apply]");
  h.change('[data-rest-dice-mode="hero"]', "physical");
  h.click('[data-rest-hit-die="hero"]');
  const id = rest.getRestRolls(h.ctx.state, "player").at(-1).id;
  h.input(`[data-rest-face="${id}"]`, "3");
  h.click(`[data-rest-resolve="${id}"]`);
  for (let i = 0; i < 5; i++) h.click("[data-rest-undo]");
  h.ctx.state.actors.hero.visibility = "shared";
  h.ctx.state.actors.hero.campaignIds = [h.ctx.state.campaign.id];
  h.ctx.state.campaign.members.find((m) => m.id === "player").active = false;
  assert.equal(rest.getRestRolls(h.ctx.state, "player").at(-1).acceptedFace, 3);
  assert.throws(() => rest.getRestRecoveryProfile(h.ctx.state, "hero", "player"));
  resetRestUI();
  openRest(h.ctx, { actorId: "hero" });
  assert.match(h.ctx.html, /Expenditure reversed; result retained in the record. 3/);
  assert.equal(h.ctx.root.querySelector(`[data-rest-resolve="${id}"]`), null);
  assert.match(h.ctx.html, /3 \+ 2 = 5.*result reversed, not applied/);
});

test("the shared setup reconciles elapsed hours after a personal Long Rest without advancing its clock", () => {
  const h = harness();
  h.ctx.state.actors.hero.visibility = "private";
  h.ctx.state.actors.hero.campaignIds = [];
  openRest(h.ctx, { actorId: "hero" });
  h.change("[data-rest-kind]", "long");
  h.change('[data-rest-start-activity="hero"]', "sleep");
  h.click("[data-rest-preview-start]");
  h.click("[data-rest-start]");
  h.input('[data-rest-elapsed="hero"]', "480");
  h.click('[data-rest-record-time="hero"]');
  h.click('[data-rest-complete="hero"]');
  h.click("[data-rest-apply]");
  h.ctx.state.actors.hero.visibility = "shared";
  h.ctx.state.actors.hero.campaignIds = [h.ctx.state.campaign.id];
  openRest(h.ctx, { actorId: "hero" });
  h.click("[data-rest-new]");
  h.change("[data-rest-context]", h.ctx.state.campaign.id);
  h.change('[data-rest-participant="hero"]', true);
  h.change("[data-rest-kind]", "long");
  h.click("[data-rest-preview-start]");
  assert.equal(h.node("[data-rest-start]").disabled, true);
  h.input("[data-rest-last-long]", "16");
  h.click("[data-rest-preview-start]");
  h.click("[data-rest-start]");
  assert.equal(rest.getGameTime(h.ctx.state, h.ctx.state.campaign.id, "player").seconds, 0);
  assert.equal(rest.listRests(h.ctx.state, "player").at(-1).campaignId, h.ctx.state.campaign.id);
  assert.deepEqual(h.errors, []);
});

test("Trance progress tracks actual meditation, while a partial Trance cannot complete the long", () => {
  const h = harness();
  Object.assign(h.ctx.state.actors.hero.restProfile, {
    trance: true,
    longRestSeconds: 14400,
    sleepRequiredSeconds: 0,
  });
  openRest(h.ctx, { actorId: "hero" });
  h.change("[data-rest-kind]", "long");
  h.change('[data-rest-start-activity="hero"]', "trance");
  h.click("[data-rest-preview-start]");
  h.click("[data-rest-start]");
  elapsed(h, 7200);
  h.change('[data-rest-activity="hero"]', "light");
  h.click('[data-rest-save-activity="hero"]');
  elapsed(h, 7200);
  assert.match(h.ctx.html, /Trance: 2 h/);
  h.click('[data-rest-complete="hero"]');
  assert.equal(h.node("[data-rest-apply]").disabled, true);
  h.change('[data-rest-activity="hero"]', "trance");
  h.click('[data-rest-save-activity="hero"]');
  elapsed(h, 7200);
  assert.match(h.ctx.html, /Trance: 4 h/);
  h.click('[data-rest-complete="hero"]');
  h.click("[data-rest-apply]");
  assert.equal(h.ctx.state.actors.hero.hp, 20);
  assert.deepEqual(h.errors, []);
});

test("a personal rest's history keeps private audit after the sheet joins a campaign", () => {
  const h = harness();
  h.ctx.state.actors.hero.visibility = "private";
  h.ctx.state.actors.hero.campaignIds = [];
  begin(h);
  h.click('[data-rest-record-time="hero"]');
  h.click('[data-rest-complete="hero"]');
  h.click("[data-rest-apply]");
  h.ctx.state.actors.hero.visibility = "shared";
  h.ctx.state.actors.hero.campaignIds = [h.ctx.state.campaign.id];
  h.click('[data-rest-hit-die="hero"]');
  assert.equal(h.commits.at(-1).options.local, false);
  assert.equal(h.commits.at(-1).options.visibility, "private");
  h.click('[data-rest-correct="hero"]');
  h.input("[data-rest-correction-value]", "12");
  h.input("[data-rest-correction-reason]", "Correct personal recovery");
  h.click("[data-rest-preview-correction]");
  h.click("[data-rest-apply]");
  assert.equal(h.commits.at(-1).options.local, false);
  assert.equal(h.commits.at(-1).options.visibility, "private");
  assert.deepEqual(h.errors, []);
});
