import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { esc } from "../ui.mjs";
import * as domain from "../forms-companions.mjs";
import { previewTokenPlacement } from "../spatial.mjs";
import {
  openForms,
  openCompanion,
  renderFormsPanel,
  bindFormsPanel,
  resetFormsUI,
} from "../forms-ui.mjs";

const source = {
  kind: "authored",
  edition: "2024",
  revision: "forms-ui-fixture-1",
  title: "Synthetic forms fixture",
};
const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
afterEach(resetFormsUI);
function harness() {
  const memory = new Map(),
    errors = [],
    commits = [];
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  };
  let store = createStore({ storage });
  const campaignId = store.state.campaign.id;
  store.state.actors.hero = {
    id: "hero",
    name: "Synthetic Druid",
    kind: "character",
    owner: "player",
    controllers: [],
    visibility: "shared",
    campaignIds: [campaignId],
    level: 3,
    hp: 12,
    maxHp: 24,
    tempHp: 0,
    ac: 12,
    speed: 9,
    movement: 9,
    movementSpent: 0,
    dashCount: 0,
    proficiencyBonus: 2,
    action: true,
    bonus: true,
    reaction: true,
    abilities: { str: 10, dex: 14, con: 14, int: 12, wis: 16, cha: 10 },
    hitDice: { d8: { max: 3, used: 1 } },
    spellSlots: { 1: { max: 4, used: 1 } },
    conditions: [],
    combatEffects: [],
    features: [
      { id: "shape", name: "Wild Shape", resourceId: "shape-pool", max: 2, used: 1, source },
    ],
    inventory: [
      {
        id: "incense",
        name: "Synthetic incense",
        kind: "consumable",
        quantity: 2,
        equipped: false,
        source,
      },
      {
        id: "cloak",
        name: "Synthetic cloak",
        kind: "gear",
        quantity: 1,
        equipped: true,
        attuned: true,
        source,
      },
    ],
    formsProfile: {
      druidLevel: 3,
      wildShapeFeatureId: "shape",
      knownForms: ["srd2024:cat", "srd2024:rat", "srd2024:wolf"],
      knownFormsInitialized: true,
      savingThrowProficiencies: ["int", "wis"],
      skillProficiencies: [],
      familiarCasting: { spellId: "find-familiar", prepared: true, ritualFromBook: false, source },
      source,
    },
  };
  store.state.combat.active = false;
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
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.en || value.it || ""
        : String(value ?? "");
    },
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
    openSheet(actorId) {
      this.sheet = actorId;
    },
    beginCompanionPlacement(actorId) {
      this.placement = actorId;
    },
    openGameTime() {
      this.openedTime = true;
    },
    confirmCompanionAppearance(input, done) {
      this.appearanceCallback = done;
      this.appearanceRequest = input;
    },
    commit(label, mutate, options = {}) {
      if (this.offline && !options.local) throw Error("Shared change requires connection");
      store.commit(label, mutate, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      commits.push({ label, options });
      this.render();
      return { applied: true, persisted: true };
    },
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undo() {
      store.undo(this.role);
      this.render();
    },
    render() {
      this.html = renderFormsPanel(this);
      const nodes = [
        ...this.html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
      ].map(([, tag, raw, inner]) => {
        const attrs = Object.fromEntries(
          [...raw.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, key, value]) => [
            key,
            decode(value),
          ]),
        );
        const events = {};
        return {
          attrs,
          events,
          inner,
          tagName: tag.toUpperCase(),
          dataset: Object.fromEntries(
            Object.entries(attrs)
              .filter(([key]) => key.startsWith("data-"))
              .map(([key, value]) => [
                key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
                value,
              ]),
          ),
          value:
            tag === "select"
              ? decode(inner?.match(/<option value="([^"]*)" selected/)?.[1])
              : tag === "textarea"
                ? decode(inner)
                : attrs.value || "",
          type: attrs.type,
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
          const match = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
          return match
            ? nodes.filter(
                (n) =>
                  match[1] in n.attrs && (match[2] === undefined || n.attrs[match[1]] === match[2]),
              )
            : [];
        },
        querySelector(selector) {
          return this.querySelectorAll(selector)[0] || null;
        },
      };
      bindFormsPanel(this.root, this);
    },
  };
  const node = (selector) => {
    const n = ctx.root.querySelector(selector);
    assert.ok(n, `Missing ${selector}`);
    return n;
  };
  return {
    ctx,
    errors,
    commits,
    node,
    reload() {
      store = createStore({ storage });
      resetFormsUI();
    },
    click(selector) {
      const n = node(selector);
      assert.equal(n.disabled, false, `${selector} disabled`);
      return n.events.click?.({ target: n, preventDefault() {} });
    },
    change(selector, value) {
      const n = node(selector);
      if (n.type === "checkbox" || n.type === "radio") n.checked = value;
      else n.value = value;
      return n.events.change?.({ target: n });
    },
    input(selector, value) {
      const n = node(selector);
      n.value = value;
      return n.events.input?.({ target: n });
    },
  };
}

test("form selection and cancelled preview do not spend resources; applying and returning keep lived damage", () => {
  const h = harness();
  openForms(h.ctx, { actorId: "hero", tab: "forms" });
  h.click('[data-forms-profile="srd2024:wolf"]');
  h.click("[data-forms-preview]");
  assert.match(h.ctx.html, /Climbing, jumping and special anatomy/);
  assert.equal(h.ctx.state.actors.hero.features[0].used, 1);
  assert.equal(h.ctx.state.actors.hero.activeForm, undefined);
  h.click("[data-forms-cancel-preview]");
  assert.equal(h.ctx.state.actors.hero.hp, 12);
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  assert.equal(h.ctx.state.actors.hero.features[0].used, 2);
  assert.equal(h.ctx.state.actors.hero.hp, 12);
  assert.equal(h.ctx.state.actors.hero.tempHp, 3);
  assert.match(h.ctx.html, /Climbing, jumping and special anatomy/);
  h.ctx.state.actors.hero.tempHp = 0;
  h.ctx.state.actors.hero.hp = 10;
  h.click("[data-forms-return]");
  h.click("[data-forms-apply]");
  assert.equal(h.ctx.state.actors.hero.activeForm, null);
  assert.equal(h.ctx.state.actors.hero.hp, 10);
  assert.equal(h.ctx.state.actors.hero.features[0].used, 2);
  assert.deepEqual(h.errors, []);
});

test("existing temporary HP requires an explicit choice and invalid preview keeps current inputs", () => {
  const h = harness();
  h.ctx.state.actors.hero.tempHp = 7;
  openForms(h.ctx, { actorId: "hero" });
  h.click('[data-forms-profile="srd2024:cat"]');
  h.click("[data-forms-preview]");
  assert.equal(h.node("[data-forms-apply]").disabled, true);
  h.change("[data-forms-temp-hp]", "keep");
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  assert.equal(h.ctx.state.actors.hero.tempHp, 7);
  assert.deepEqual(h.errors, []);
});

test("manual companion is a persistent separate actor and placement does not create or pay again", () => {
  const h = harness();
  openForms(h.ctx, { actorId: "hero", tab: "companions" });
  h.click("[data-forms-add-manual]");
  h.input('[data-forms-field="name"]', "Synthetic companion");
  h.click('[data-forms-profile="srd2024:cat"]');
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  const companion = domain.listCompanions(h.ctx.state, "hero", "player")[0];
  assert.notEqual(companion.actorId, "hero");
  assert.equal(h.ctx.state.actors.hero.features[0].used, 1);
  h.reload();
  openCompanion(h.ctx, { actorId: companion.actorId });
  h.click("[data-forms-place]");
  assert.equal(h.ctx.placement, companion.actorId);
  assert.equal(domain.listCompanions(h.ctx.state, "hero", "player").length, 1);
  assert.deepEqual(h.errors, []);
});

test("a private sheet never leaks names or catalog data to a DM non-owner", () => {
  const h = harness();
  h.ctx.state.actors.hero.visibility = "private";
  h.ctx.state.actors.hero.campaignIds = [];
  h.ctx.role = "dm";
  openForms(h.ctx, { actorId: "hero" });
  assert.doesNotMatch(h.ctx.html, /Synthetic Druid|Synthetic cloak|srd2024:wolf/);
  assert.equal(h.ctx.root.querySelector("[data-forms-apply]"), null);
});

function enterCasting(h) {
  openForms(h.ctx, { actorId: "hero", tab: "familiar" });
  h.input('[data-forms-field="name"]', "Synthetic familiar");
  h.click('[data-forms-profile="srd2024:cat"]');
  h.change('[data-forms-field="materialId"]', "incense");
  h.change('[data-forms-field="incenseConfirmed"]', true);
}
test("ordinary casting survives reload without spending before completion; personal elapsed time and explicit appearance complete once", () => {
  const h = harness();
  h.ctx.state.actors.hero.visibility = "private";
  h.ctx.state.actors.hero.campaignIds = [];
  enterCasting(h);
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  assert.equal(h.ctx.state.actors.hero.spellSlots[1].used, 1);
  assert.equal(h.ctx.state.actors.hero.inventory[0].quantity, 2);
  assert.equal(h.ctx.state.actors.hero.concentration.active, true);
  const id = domain.getFormsOverview(h.ctx.state, "hero", "player").castings[0].id;
  h.reload();
  openForms(h.ctx, { actorId: "hero", tab: "familiar" });
  h.click(`[data-forms-casting="${id}"]`);
  h.input('[data-forms-field="timeMinutes"]', "60");
  h.click("[data-forms-personal-time]");
  h.change('[data-forms-field="appearanceAttested"]', true);
  h.click("[data-forms-completion]");
  h.click("[data-forms-apply]");
  assert.equal(h.ctx.state.actors.hero.spellSlots[1].used, 2);
  assert.equal(h.ctx.state.actors.hero.inventory[0].quantity, 1);
  assert.equal(domain.listCompanions(h.ctx.state, "hero", "player").length, 1);
  h.reload();
  openForms(h.ctx, { actorId: "hero", tab: "familiar" });
  h.click(`[data-forms-casting="${id}"]`);
  assert.equal(h.ctx.root.querySelector("[data-forms-completion]"), null);
  assert.equal(
    h.commits.every((c) => c.options.local && c.options.visibility === "private"),
    true,
  );
  assert.deepEqual(h.errors, []);
});
test("invalid material preview preserves entered fields in fresh rendered controls", () => {
  const h = harness();
  enterCasting(h);
  h.input('[data-forms-field="materialValue"]', "");
  h.click("[data-forms-preview]");
  assert.equal(h.node("[data-forms-apply]").disabled, true);
  assert.equal(h.node('[data-forms-field="name"]').value, "Synthetic familiar");
  assert.equal(h.node('[data-forms-field="materialValue"]').value, "");
  h.input('[data-forms-field="materialValue"]', "10");
  h.click("[data-forms-preview]");
  assert.equal(h.node("[data-forms-apply]").disabled, false);
});
test("Wild Companion uses the selected slot alone; dismiss/reappear retains identity and later placement is distinct", () => {
  const h = harness();
  openForms(h.ctx, { actorId: "hero", tab: "wild-companion" });
  h.input('[data-forms-field="name"]', "Synthetic wild familiar");
  h.click('[data-forms-profile="srd2024:rat"]');
  h.change('[data-forms-field="cost"]', "slot:1");
  h.change('[data-forms-field="appearanceAttested"]', true);
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  const id = domain.listCompanions(h.ctx.state, "hero", "player")[0].actorId;
  assert.equal(h.ctx.state.actors.hero.features[0].used, 1);
  assert.equal(h.ctx.state.actors.hero.spellSlots[1].used, 2);
  h.click(`[data-forms-companion="${id}"]`);
  h.click('[data-forms-command="dismiss"]');
  h.click("[data-forms-apply]");
  assert.equal(domain.getCompanion(h.ctx.state, id, "player").lifecycle, "dismissed");
  h.change('[data-forms-field="appearanceAttested"]', true);
  h.click('[data-forms-command="reappear"]');
  h.click("[data-forms-apply]");
  assert.equal(domain.getCompanion(h.ctx.state, id, "player").lifecycle, "available");
  assert.equal(domain.listCompanions(h.ctx.state, "hero", "player").length, 1);
  h.click("[data-forms-place]");
  assert.equal(h.ctx.placement, id);
  assert.equal(h.ctx.state.actors.hero.spellSlots[1].used, 2);
  assert.deepEqual(h.errors, []);
});
test("cancelling casting requires a reason, keeps input on failure, and never spends completion costs", () => {
  const h = harness();
  enterCasting(h);
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  h.click("[data-forms-cancel-casting]");
  assert.match(h.ctx.html, /reason for stopping/);
  h.input('[data-forms-field="cancelReason"]', "The party leaves");
  h.click("[data-forms-cancel-casting]");
  assert.equal(
    domain.getFormsOverview(h.ctx.state, "hero", "player").castings[0].status,
    "cancelled",
  );
  assert.equal(h.ctx.state.actors.hero.spellSlots[1].used, 1);
  assert.equal(h.ctx.state.actors.hero.inventory[0].quantity, 2);
});

function manualCompanion(h) {
  openForms(h.ctx, { actorId: "hero", tab: "manual" });
  h.input('[data-forms-field="name"]', "Synthetic companion");
  h.click('[data-forms-profile="srd2024:cat"]');
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  const id = domain.listCompanions(h.ctx.state, "hero", "player")[0].actorId;
  openCompanion(h.ctx, { actorId: id });
  return id;
}
test("companion controls, corrections and archive use separate previewed commands", () => {
  const h = harness(),
    id = manualCompanion(h);
  h.change('[data-forms-controller="dm"]', true);
  h.click("[data-forms-controllers]");
  h.click("[data-forms-apply]");
  assert.deepEqual(h.ctx.state.actors[id].controllers, ["dm"]);
  h.input('[data-forms-field="correctValue"]', "1");
  h.click("[data-forms-correct]");
  assert.equal(h.node("[data-forms-apply]").disabled, true);
  assert.equal(h.node('[data-forms-field="correctValue"]').value, "1");
  h.input('[data-forms-field="correctReason"]', "Recorded injury");
  h.click("[data-forms-correct]");
  h.click("[data-forms-apply]");
  assert.equal(h.ctx.state.actors[id].hp, 1);
  h.input('[data-forms-field="archiveReason"]', "No longer travelling");
  h.click("[data-forms-archive]");
  h.click("[data-forms-apply]");
  assert.equal(domain.getCompanion(h.ctx.state, id, "player").lifecycle, "archived");
  assert.equal(h.node("[data-forms-place]").disabled, true);
  assert.deepEqual(h.errors, []);
});
test("a private shape can expire through its explicit personal clock; close and reopen does not cancel it", () => {
  const h = harness();
  h.ctx.state.actors.hero.visibility = "private";
  h.ctx.state.actors.hero.campaignIds = [];
  h.ctx.offline = true;
  openForms(h.ctx, { actorId: "hero" });
  h.click('[data-forms-profile="srd2024:cat"]');
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  h.ctx.closeDialog();
  openForms(h.ctx, { actorId: "hero" });
  h.input('[data-forms-field="timeMinutes"]', "60");
  h.input('[data-forms-field="timeReason"]', "An hour travelling");
  h.click("[data-forms-personal-time]");
  assert.equal(h.ctx.state.actors.hero.activeForm, null);
  assert.equal(h.ctx.state.actors.hero.tempHp, 3);
  assert.ok(h.commits.every((c) => c.options.local && c.options.visibility === "private"));
});
test("wearing equipment requires only the relevant recorded decision and dropping survives normal return", () => {
  const h = harness();
  openForms(h.ctx, { actorId: "hero" });
  h.click('[data-forms-profile="srd2024:cat"]');
  h.change('[data-forms-equipment="cloak"]', "wear");
  h.click("[data-forms-preview]");
  assert.equal(h.node("[data-forms-apply]").disabled, true);
  h.change('[data-forms-wear="cloak"]', true);
  h.change('[data-forms-equipment="incense"]', "drop");
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  h.click("[data-forms-return]");
  h.click("[data-forms-apply]");
  assert.equal(h.ctx.state.actors.hero.inventory[0].location, "ground");
  assert.equal(h.ctx.state.actors.hero.inventory[1].attuned, true);
});
test("stale preview requires review and revoked access discards visible private form data", () => {
  const h = harness();
  openForms(h.ctx, { actorId: "hero" });
  h.click('[data-forms-profile="srd2024:cat"]');
  h.click("[data-forms-preview]");
  h.ctx.state.actors.hero.features[0].used = 2;
  h.ctx.render();
  assert.equal(h.node("[data-forms-apply]").disabled, true);
  h.ctx.state.campaign.members.find((m) => m.id === "player").active = false;
  h.ctx.render();
  assert.doesNotMatch(h.ctx.html, /Synthetic Druid|Synthetic cloak|srd2024:cat/);
  assert.equal(h.ctx.root.querySelector("[data-forms-apply]"), null);
});
test("form correction is source-labelled and changes only active override; return keeps base and damage", () => {
  const h = harness();
  openForms(h.ctx, { actorId: "hero" });
  h.click('[data-forms-profile="srd2024:cat"]');
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  h.input('[data-forms-field="formCorrectValue"]', "17");
  h.click("[data-forms-form-correct]");
  assert.equal(h.node("[data-forms-apply]").disabled, true);
  h.input('[data-forms-field="formCorrectReason"]', "Table ruling");
  h.click("[data-forms-form-correct]");
  h.click("[data-forms-apply]");
  assert.equal(domain.getFormsOverview(h.ctx.state, "hero", "player").effective.ac, 17);
  assert.equal(h.ctx.state.actors.hero.ac, 12);
  h.click("[data-forms-return]");
  h.click("[data-forms-apply]");
  assert.equal(domain.getFormsOverview(h.ctx.state, "hero", "player").effective.ac, 12);
  assert.deepEqual(h.errors, []);
});
test("known form correction requires reason and persists selected list with no use cost", () => {
  const h = harness();
  openForms(h.ctx, { actorId: "hero", tab: "known" });
  h.change('[data-forms-known="srd2024:wolf"]', false);
  h.click("[data-forms-preview]");
  assert.equal(h.node("[data-forms-apply]").disabled, true);
  h.input('[data-forms-field="knownReason"]', "Record reconciled");
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  assert.deepEqual(h.ctx.state.actors.hero.formsProfile.knownForms, ["srd2024:cat", "srd2024:rat"]);
  assert.equal(h.ctx.state.actors.hero.features[0].used, 1);
});
test("late map callback cannot overwrite a new panel, while cancelled point selection retains typed name", () => {
  const h = harness(),
    scene = h.ctx.state.scenes.find((s) => s.id === h.ctx.state.activeSceneId);
  scene.revealed = true;
  scene.tokens.push({ id: "hero-token", actorId: "hero", x: 250, y: 250, hidden: false });
  openForms(h.ctx, { actorId: "hero", tab: "wild-companion" });
  h.input('[data-forms-field="name"]', "Pending map creature");
  h.click("[data-forms-appearance-map]");
  const old = h.ctx.appearanceCallback;
  old(null);
  assert.equal(h.node('[data-forms-field="name"]').value, "Pending map creature");
  h.click("[data-forms-appearance-map]");
  const stale = h.ctx.appearanceCallback;
  openForms(h.ctx, { actorId: "hero", tab: "manual" });
  h.input('[data-forms-field="name"]', "New record");
  stale({ kind: "map", sceneId: scene.id, point: { x: 300, y: 250 } });
  assert.equal(h.node('[data-forms-field="name"]').value, "New record");
  assert.doesNotMatch(h.ctx.html, /Appearance point selected/);
});
test("shared changes are disabled offline; retry after connection uses same inputs and one cost", () => {
  const h = harness();
  h.ctx.offline = true;
  openForms(h.ctx, { actorId: "hero" });
  h.click('[data-forms-profile="srd2024:cat"]');
  h.click("[data-forms-preview]");
  assert.equal(h.node("[data-forms-apply]").disabled, true);
  h.ctx.offline = false;
  h.ctx.render();
  h.click("[data-forms-apply]");
  assert.equal(h.ctx.state.actors.hero.features[0].used, 2);
  assert.equal(h.commits.length, 1);
});
test("replacing concentration is explicit and continuing in initiative spends exactly the new turn action", () => {
  const h = harness();
  h.ctx.state.actors.hero.concentration = { id: "prior", active: true, name: "Prior focus" };
  h.ctx.state.combat = { ...h.ctx.state.combat, active: true, order: ["hero"], turn: 0, round: 1 };
  enterCasting(h);
  h.click("[data-forms-preview]");
  assert.equal(h.node("[data-forms-apply]").disabled, true);
  h.change('[data-forms-field="replaceConcentration"]', true);
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  assert.equal(h.ctx.state.actors.hero.action, false);
  assert.notEqual(h.ctx.state.actors.hero.concentration.id, "prior");
  h.ctx.state.combat.round++;
  h.ctx.state.actors.hero.action = true;
  h.ctx.render();
  h.click("[data-forms-continue]");
  assert.equal(h.ctx.state.actors.hero.action, false);
  assert.equal(h.ctx.state.actors.hero.spellSlots[1].used, 1);
  assert.deepEqual(h.errors, []);
});
test("ritual preview explains delayed cost in Italian and never emits localized objects as JSON", () => {
  const h = harness();
  h.ctx.lang = "it";
  enterCasting(h);
  h.change('[data-forms-field="spellMode"]', "ritual");
  h.click("[data-forms-preview]");
  assert.match(h.ctx.html, /70 min/);
  assert.match(h.ctx.html, /Al completamento/);
  assert.doesNotMatch(h.ctx.html, /&quot;it&quot;|&quot;en&quot;/);
  h.click("[data-forms-apply]");
  assert.equal(h.ctx.state.actors.hero.spellSlots[1].used, 1);
});
test("unavailable known profiles can be removed without exposing raw identifiers in ordinary text", () => {
  const h = harness();
  h.ctx.state.actors.hero.formsProfile.knownForms.push("unsupported:profile");
  openForms(h.ctx, { actorId: "hero", tab: "known" });
  h.change('[data-forms-known="unsupported:profile"]', false);
  h.input('[data-forms-field="knownReason"]', "Reconciled unavailable form");
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  assert.equal(
    h.ctx.state.actors.hero.formsProfile.knownForms.includes("unsupported:profile"),
    false,
  );
});
test("personal casting in initiative cannot replace turn actions with an arbitrary elapsed interval", () => {
  const h = harness();
  h.ctx.state.actors.hero.visibility = "private";
  h.ctx.state.actors.hero.campaignIds = [];
  h.ctx.state.combat = { ...h.ctx.state.combat, active: true, order: ["hero"], turn: 0, round: 1 };
  enterCasting(h);
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  assert.equal(h.node("[data-forms-personal-time]").disabled, true);
  assert.match(h.ctx.html, /initiative|turn/);
});
test("blur after typing a name or number preserves the pending click target, while structural selectors rerender", () => {
  const h = harness();
  openForms(h.ctx, { actorId: "hero", tab: "manual" });
  h.input('[data-forms-field="name"]', "Muschio");
  const catBeforeBlur = h.node('[data-forms-profile="srd2024:cat"]');
  h.change('[data-forms-field="name"]', "Muschio");
  assert.equal(
    h.node('[data-forms-profile="srd2024:cat"]'),
    catBeforeBlur,
    "name blur must not detach the pointer target",
  );
  h.click('[data-forms-profile="srd2024:cat"]');
  h.input('[data-forms-field="hp"]', "2");
  const previewBeforeBlur = h.node("[data-forms-preview]");
  h.change('[data-forms-field="hp"]', "2");
  assert.equal(
    h.node("[data-forms-preview]"),
    previewBeforeBlur,
    "number blur must not detach the preview target",
  );
  h.click("[data-forms-preview]");
  assert.equal(h.node("[data-forms-apply]").disabled, false);
  assert.equal(h.node('[data-forms-field="name"]').value, "Muschio");
  openForms(h.ctx, { actorId: "hero" });
  h.change('[data-forms-equipment="cloak"]', "wear");
  assert.ok(h.node('[data-forms-wear="cloak"]'));
});
test("a later transformation excludes dropped and empty items from disposition choices without restoring inventory", () => {
  const h = harness();
  h.ctx.state.actors.hero.features[0].used = 0;
  h.ctx.state.actors.hero.inventory.push({
    id: "empty",
    name: "Empty supply",
    quantity: 0,
    equipped: false,
    source,
  });
  openForms(h.ctx, { actorId: "hero" });
  h.click('[data-forms-profile="srd2024:cat"]');
  h.change('[data-forms-equipment="cloak"]', "drop");
  h.click("[data-forms-preview]");
  h.click("[data-forms-apply]");
  h.click("[data-forms-return]");
  h.click("[data-forms-apply]");
  h.click('[data-forms-profile="srd2024:rat"]');
  h.change("[data-forms-temp-hp]", "keep");
  h.click("[data-forms-preview]");
  assert.equal(h.ctx.root.querySelector('[data-forms-equipment="cloak"]'), null);
  assert.equal(h.ctx.root.querySelector('[data-forms-equipment="empty"]'), null);
  assert.equal(h.node("[data-forms-apply]").disabled, false);
  h.click("[data-forms-apply]");
  assert.equal(h.ctx.state.actors.hero.inventory.find((i) => i.id === "cloak").location, "ground");
  assert.equal(h.ctx.state.actors.hero.inventory.find((i) => i.id === "empty").quantity, 0);
  assert.deepEqual(h.errors, []);
});
test("new creature appearance never excludes a previously managed companion from map collisions", () => {
  const h = harness(),
    id = manualCompanion(h),
    scene = h.ctx.state.scenes.find((s) => s.id === h.ctx.state.activeSceneId);
  scene.revealed = true;
  scene.walls = [];
  scene.terrain = [];
  const origin = { id: "hero-token", actorId: "hero", x: 250, y: 250 };
  scene.tokens = [origin, { id: "old-companion-token", actorId: id, x: 350, y: 250 }];
  h.click('[data-forms-tab="companions"]');
  h.click('[data-forms-tab="wild-companion"]');
  h.input('[data-forms-field="name"]', "New familiar");
  h.click('[data-forms-profile="srd2024:cat"]');
  h.click("[data-forms-appearance-map]");
  assert.equal(h.ctx.appearanceRequest.companionActorId, undefined);
  assert.equal(
    previewTokenPlacement(
      scene,
      { x: 350, y: 250 },
      {
        origin,
        maxDistanceMeters: h.ctx.appearanceRequest.rangeMeters,
        excludeActorId: h.ctx.appearanceRequest.companionActorId,
      },
    ).available,
    false,
  );
  h.ctx.appearanceCallback({ kind: "map", sceneId: scene.id, point: { x: 200, y: 300 } });
  h.click("[data-forms-preview]");
  assert.equal(h.node("[data-forms-apply]").disabled, false);
  assert.equal(h.ctx.state.actors[id].companion.kind, "manual");
});
