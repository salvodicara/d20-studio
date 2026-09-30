// P8 fixes — text embeds: damage and rewards (CA-26), the picker's markers, and a random
// table rolled inside the note (BI-10). Real store and registry; synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as compendium from "../compendium.mjs";
import {
  embedMarker,
  parseDamageRef,
  parseRewardRef,
  renderTextWithEmbeds,
  embedRefs,
  openEmbedPicker,
} from "../text-embeds.mjs";

function harness(role = "dm", lang = "it") {
  const registry = createRegistry();
  registry.use("compendium", compendium.register);
  const store = createStore({ storage: null });
  registry.initState(store.state);
  const toasts = [],
    dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    view: { page: "campaign", tab: "journal" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (v && typeof v === "object" ? v[ctx.lang] || v.it || v.en || "" : String(v ?? "")),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    navigate() {},
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      if (options.afterCommit) options.afterCommit(store.state);
      return { applied: true, persisted: true };
    },
  };
  Object.defineProperty(ctx, "registry", { get: () => registry });
  registry.attach(ctx);
  return { ctx, store, toasts, dialogs };
}

test("CA-26: damage and reward markers parse, and the picker builds them (IT and EN)", () => {
  assert.deepEqual(parseDamageRef("damage:2d6:fire"), { dice: "2d6", type: "fire" });
  assert.deepEqual(parseDamageRef("damage:2d6+3"), { dice: "2d6+3", type: null });
  assert.equal(parseDamageRef("damage:2d7:fire"), null);
  assert.equal(parseDamageRef("damage:2d6:banana"), null);
  assert.deepEqual(parseRewardRef("reward:xp:100"), { kind: "xp", amount: 100 });
  assert.equal(parseRewardRef("reward:xp:0"), null);
  assert.equal(embedMarker({ kind: "damage", dice: "2d6 + 3", type: "fire" }), "@Embed[damage:2d6+3:fire]");
  assert.equal(embedMarker({ kind: "save", ability: "dex", dc: "13" }), "@Embed[save:dex:13]");
  assert.equal(embedMarker({ kind: "skill", skill: "athletics", dc: "12" }), "@Embed[skill:athletics:12]");
  assert.equal(embedMarker({ kind: "reward", reward: "gp", amount: "50" }), "@Embed[reward:gp:50]");
  assert.equal(embedMarker({ kind: "damage", dice: "lots" }), null);
  assert.deepEqual(embedRefs("Trappola: @Embed[damage:2d6+3:fire] fine"), ["damage:2d6+3:fire"]);
  for (const lang of ["it", "en"]) {
    const { ctx, dialogs } = harness("dm", lang);
    let inserted = null;
    openEmbedPicker(ctx, (marker) => (inserted = marker));
    assert.match(dialogs.at(-1).body, lang === "it" ? /Danni \(es\. 2d6 fuoco\)/ : /Damage \(e\.g\. 2d6 fire\)/);
    const form = new FormData();
    for (const [k, v] of Object.entries({ kind: "damage", dice: "2d6", type: "fire" }))
      form.append(k, v);
    dialogs.at(-1).options.onSubmit(form);
    assert.equal(inserted, "@Embed[damage:2d6:fire]");
  }
});

test("CA-26: a damage embed renders a roll button that rolls in place; a reward is awarded by the DM", () => {
  const { ctx, store } = harness("dm");
  const html = renderTextWithEmbeds(ctx, "La trappola esplode. @Embed[damage:2d6:fire] @Embed[reward:xp:100]");
  assert.match(html, /data-text-embed="compendium-damage"/);
  assert.match(html, /data-compendium-roll="\{&quot;embed&quot;:&quot;damage:2d6:fire&quot;\}"/);
  assert.match(html, /Danni 2d6 fuoco/);
  assert.match(html, /Ricompensa: <strong>100 PE<\/strong>/);
  assert.match(html, /Assegna al gruppo/);
  // The roll the button opens: a damage request from the marker, recorded in the log.
  const request = compendium.rollRequest({ embed: "damage:2d6:fire" }, "it");
  const { record } = compendium.recordRoll(ctx, request, { mode: "physical", faces: [3, 5] });
  assert.equal(record.total, 8);
  assert.match(store.state.log.at(-1).label, /Danni 2d6 da fuoco/);
  assert.match(renderTextWithEmbeds(ctx, "@Embed[damage:2d6:fire]"), /Ultimo tiro/);
  // A player sees the reward but cannot award it.
  ctx.role = "player";
  assert.doesNotMatch(renderTextWithEmbeds(ctx, "@Embed[reward:xp:100]"), /Assegna al gruppo/);
});

test("BI-10: an embedded random table rolls inside the note (result inline and in the log)", () => {
  const { ctx, store } = harness("player");
  store.state.ext["random-tables"] = {
    tables: [
      {
        id: "road",
        name: { it: "Incontri sulla strada", en: "Road encounters" },
        sides: 4,
        replacement: true,
        playersCanUse: true,
        variables: [],
        results: [
          { id: "a", weight: 2, text: { it: "Lupi affamati", en: "Hungry wolves" } },
          { id: "b", weight: 2, text: { it: "Un mercante", en: "A merchant" }, subtableId: "goods" },
        ],
      },
      {
        id: "goods",
        name: { it: "Merci", en: "Goods" },
        sides: 6,
        replacement: true,
        playersCanUse: true,
        variables: [],
        results: [{ id: "x", weight: 6, text: { it: "Spezie", en: "Spices" } }],
      },
    ],
  };
  const before = store.state.log.length;
  const { label } = compendium.drawTableInPlace(ctx, "road", { faces: [3, 2] });
  assert.match(label, /Tabella «Incontri sulla strada» → Un mercante → Spezie/);
  assert.equal(store.state.log.length, before + 1, "one line in the log");
  const html = renderTextWithEmbeds(ctx, "@Embed[table:road]");
  assert.match(html, /data-embed-draw="road"/);
  assert.match(html, /Ultimo tiro[\s\S]*Un mercante → Spezie/, "the result shows under the table");
  assert.match(html, /il tiro avviene qui/);
});
