// P4 rest fixes: PG-81 (one Short Rest dialog with clickable Hit Dice: D&D Beyond Short Rest,
// Solasta, Foundry Rest Recovery summary), CA-77 (the DM's group rest: the whole party
// preselected, «Completa per tutti», each player asked for their Hit Dice, the running rest
// in view: dnd5e rest request, Rest Recovery), PG-80 (after a Long Rest, the choices the
// rules let you change: Shard reselect dialog, BG3 prepared spells) and PG-35 (a feature
// that recovers at dawn: dnd5e dawn recovery from the calendar). Real store and registry,
// the rest dialog's own controls (rendered and bound on a minimal DOM stand-in).
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as rest from "../rest-time.mjs";
import * as sheetPlus from "../sheet-plus.mjs";
import * as spellsPlus from "../spells-plus.mjs";
import * as travel from "../travel.mjs";
import {
  openRest,
  openGameTime,
  renderRestPanel,
  bindRestPanel,
  resetRestUI,
  restNotifications,
} from "../rest-ui.mjs";

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
afterEach(resetRestUI);

function harness({ role = "player", lang = "it", areas = [] } = {}) {
  const values = new Map();
  const storage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
  const registry = createRegistry();
  for (const [id, register] of areas) registry.use(id, register);
  const store = createStore({ storage });
  registry.initState(store.state);
  store.state.combat.active = false;
  const errors = [];
  const ctx = {
    get state() {
      return store.state;
    },
    registry,
    role,
    lang,
    offline: false,
    view: { page: "table" },
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) =>
      typeof v === "object" && v ? v[ctx.lang] || v.it || v.en || "" : String(v ?? ""),
    icon: () => "",
    rollDie: () => 3,
    toast(text, error) {
      if (error) errors.push(text);
    },
    dialog() {
      this.dialogOpen = true;
      this.render();
    },
    closeDialog() {
      this.dialogOpen = false;
    },
    navigate(page, params) {
      this.navigated = { page, params };
    },
    canControl: () => true,
    commit(label, mutate, options = {}) {
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
    canUndo: () => false,
    undo() {},
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
  return {
    ctx,
    store,
    errors,
    node,
    click(selector) {
      const n = node(selector);
      assert.equal(n.disabled, false, `${selector} disabled`);
      return n.events.click?.({ preventDefault() {}, target: n });
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
}
const personal = (h, id = "livia") => {
  const actor = h.store.state.actors[id];
  actor.visibility = "private";
  actor.campaignIds = [];
};

test("PG-81 Hit Dice summary: a personal Short Rest is one dialog, Hit Dice one by one, HP in the summary", () => {
  const h = harness();
  personal(h);
  openRest(h.ctx, { actorId: "livia" });
  // The Hit Dice are visible from the start (D&D Beyond Short Rest).
  assert.match(h.ctx.html, /data-rest-hit-dice-line="livia"[^>]*>[^<]*Dadi Vita[^<]*d6[^<]*2\/3/);
  h.click("[data-rest-quick-short]");
  assert.deepEqual(h.errors, []);
  const r = rest.listRests(h.ctx.state, "player", { actorId: "livia" }).at(-1);
  assert.equal(r.participants[0].status, "completed", "an hour of personal time, completed");
  // The Hit Dice step is on screen at once; each click spends one die.
  const hp = h.store.state.actors.livia.hp;
  h.click('[data-rest-hit-die="livia"]');
  const healed = h.store.state.actors.livia.hp - hp;
  assert.ok(healed > 0, "the die healed");
  assert.equal(h.store.state.actors.livia.hitDice.d6.used, 2);
  // Foundry Rest Recovery: the summary names the HP regained with the Hit Dice.
  assert.match(
    h.ctx.html,
    new RegExp(`data-rest-hd-summary="livia"[^>]*>[^<]*PF dai Dadi Vita[^<]*\\+${healed}`),
  );
  assert.match(h.ctx.html, new RegExp(`${hp} → ${hp + healed}`));
});

test("CA-77: the DM's group rest preselects the whole party and «Tutto il gruppo» toggles it", () => {
  const h = harness({ role: "dm" });
  openRest(h.ctx);
  const party = ["livia", "doran", "mira"].filter((id) =>
    h.ctx.root.querySelector(`[data-rest-participant="${id}"]`),
  );
  assert.ok(party.length >= 2, "the campaign party is listed");
  for (const id of party) assert.equal(h.node(`[data-rest-participant="${id}"]`).checked, true, id);
  assert.match(h.ctx.html, /data-rest-all-party[^>]*aria-pressed="true"/);
  h.click("[data-rest-all-party]");
  for (const id of party) assert.equal(h.node(`[data-rest-participant="${id}"]`).checked, false);
  assert.match(h.ctx.html, /Scegli almeno un partecipante/);
  h.click("[data-rest-all-party]");
  for (const id of party) assert.equal(h.node(`[data-rest-participant="${id}"]`).checked, true);
  // A Long Rest starts in sleep for everyone (the ordinary Long Rest).
  h.change("[data-rest-kind]", "long");
  assert.equal(h.node(`[data-rest-start-activity="${party[0]}"]`).value, "sleep");
});

test("CA-77 and PG-81: the DM completes the group rest for all; each player spends Hit Dice", () => {
  const h = harness({ role: "player", areas: [["travel", travel.register]] });
  // The player asks for a Short Rest in the campaign.
  openRest(h.ctx, { actorId: "livia" });
  h.click("[data-rest-preview-start]");
  h.click("[data-rest-start]");
  assert.match(h.ctx.html, /In attesa che il DM faccia passare il tempo/);
  const id = rest.listRests(h.ctx.state, "player", { actorId: "livia" }).at(-1).id;
  // The DM is told and opens the running rest straight away (not under «Riposi registrati»).
  h.ctx.role = "dm";
  assert.ok(
    restNotifications(h.ctx).some(
      (n) => /Riposo breve/.test(n.title.it) && /Livia/.test(n.title.it),
    ),
    "DM notification",
  );
  assert.ok(
    h.ctx.registry.notifications(h.ctx).some((n) => n.source === "travel-rests"),
    "the bell collects it (travel area)",
  );
  resetRestUI();
  openRest(h.ctx);
  assert.match(h.ctx.html, /data-rest-complete-all/);
  h.click("[data-rest-complete-all]");
  assert.deepEqual(h.errors, []);
  assert.equal(rest.getGameTime(h.ctx.state, h.ctx.state.campaign.id, "dm").seconds, 3600);
  const part = rest.getRest(h.ctx.state, id, "dm").participants[0];
  assert.equal(part.status, "completed");
  // The player gets the Hit Dice request and spends one.
  h.ctx.role = "player";
  const notes = restNotifications(h.ctx);
  const ask = notes.find((n) => /Dadi Vita/.test(n.title.it));
  assert.ok(ask, "player request for the Hit Dice step");
  assert.equal(ask.target.params.tab, "rest:" + id);
  resetRestUI();
  openRest(h.ctx, { restId: id });
  const hp = h.store.state.actors.livia.hp;
  h.click('[data-rest-hit-die="livia"]');
  assert.ok(h.store.state.actors.livia.hp > hp);
  assert.match(h.ctx.html, /data-rest-hd-summary="livia"/);
  // EN
  h.ctx.lang = "en";
  h.ctx.render();
  assert.match(h.ctx.html, /HP from Hit Dice/);
});

test("PG-80: after a Long Rest the rest offers the choices to change (spells, Weapon Mastery)", () => {
  const h = harness({
    role: "dm",
    areas: [
      ["sheet-plus", sheetPlus.register],
      ["spells-plus", spellsPlus.register],
    ],
  });
  openRest(h.ctx);
  h.change("[data-rest-kind]", "long");
  h.click("[data-rest-preview-start]");
  h.click("[data-rest-start]");
  h.click("[data-rest-complete-all]");
  assert.deepEqual(h.errors, []);
  const html = h.ctx.html;
  assert.match(html, /Dopo il riposo lungo/);
  // Livia (Wizard) may change prepared spells; Doran (Fighter) one Weapon Mastery.
  assert.match(html, /data-rest-prepare="livia"/);
  assert.match(html, /data-rest-reselect="doran-weapon-mastery"/);
  h.click('[data-rest-prepare="livia"]');
  assert.deepEqual(h.ctx.navigated, {
    page: "characters",
    params: { id: "livia", tab: "spells" },
  });
  // Keep the masteries as they are: the prompt is answered.
  h.ctx.navigated = null;
  openRest(h.ctx, {
    restId: rest.listRests(h.ctx.state, "dm", { actorId: "doran" }).at(-1).id,
  });
  h.click('[data-rest-reselect-keep="doran-weapon-mastery"]');
  assert.deepEqual(h.errors, []);
  assert.doesNotMatch(h.ctx.html, /data-rest-reselect="doran-weapon-mastery"/);
});

test("PG-35 dawn recovery for a feature: time passing a dawn restores it (dnd5e calendar)", () => {
  const h = harness({ role: "dm" });
  const doran = h.store.state.actors.doran;
  doran.features.push({
    id: "dawn-feature",
    name: { it: "Benedizione dell’alba", en: "Dawn blessing" },
    max: 2,
    used: 2,
    recovery: "dawn",
  });
  const campaignId = h.store.state.campaign.id;
  // 08:00 → 20:00: no dawn yet.
  let preview = rest.previewTimeAdvance(h.store.state, { campaignId, seconds: 12 * 3600 }, "dm");
  assert.ok(!preview.rows.some((row) => row.path === "features.dawn-feature.used"));
  h.store.commit(
    "12 h",
    (s) => rest.advanceGameTime(s, { id: "t1", campaignId, seconds: 12 * 3600 }, "dm"),
    "dm",
    { shared: true },
  );
  assert.equal(h.store.state.actors.doran.features.at(-1).used, 2);
  // 20:00 → 08:00 next day crosses the 06:00 dawn.
  preview = rest.previewTimeAdvance(h.store.state, { campaignId, seconds: 12 * 3600 }, "dm");
  const row = preview.rows.find((r) => r.path === "features.dawn-feature.used");
  assert.ok(row, "the preview lists the dawn recovery");
  assert.equal(row.reason, "dawn-recovery");
  h.store.commit(
    "12 h",
    (s) => rest.advanceGameTime(s, { id: "t2", campaignId, seconds: 12 * 3600 }, "dm"),
    "dm",
    { shared: true },
  );
  assert.equal(h.store.state.actors.doran.features.at(-1).used, 0, "recovered at dawn");
  // A rest profile rule with the «dawn» trigger works the same way.
  assert.ok(rest.RECOVERY_TRIGGERS.includes("dawn"));
  // The game-time dialog shows it before applying.
  h.store.commit(
    "spend",
    (s) => {
      s.actors.doran.features.at(-1).used = 1;
    },
    "dm",
    { shared: true },
  );
  openGameTime(h.ctx);
  h.input("[data-rest-time-value]", "24");
  h.change("[data-rest-time-unit]", "3600");
  h.click("[data-rest-preview-time]");
  assert.match(h.ctx.html, /Benedizione dell’alba · usi spesi/);
  assert.match(h.ctx.html, /all’alba/);
});
