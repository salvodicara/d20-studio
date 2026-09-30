// P5 fix package — encounter builder: shared/individual initiative (PR-35), the unique
// linked creature across encounters (PR-45), statistics loaded from a matching block
// (PR-46), a pasted stat-block line (PR-43) and note fields that keep their text across
// the save on leaving a field (PR-38). Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { isValidMeleeProfile } from "../combat.mjs";
import { createSceneNPC, placeSceneToken } from "../preparation.mjs";
import * as tokenMenu from "../token-menu.mjs";
import * as loot from "../loot.mjs";
import * as compendium from "../compendium.mjs";
import * as D from "../encounter-builder-domain.mjs";
import * as UI from "../encounter-builder.mjs";

const GOBLIN = { creatureId: "srd2024:creature:goblin-warrior" };
const OGRE = { creatureId: "srd2024:creature:ogre" };

function harness() {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null });
  registry.use("token-menu", tokenMenu.register);
  registry.use("loot", loot.register);
  registry.use("compendium", compendium.register);
  registry.use("encounter-builder", UI.register);
  const store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role: "dm",
    lang: "it",
    offline: false,
    view: { page: "table", tab: "", id: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? (value[ctx.lang] ?? value.it ?? value.en ?? "")
        : String(value ?? ""),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog() {},
    closeDialog() {},
    render() {},
    navigate() {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      return { applied: true, persisted: true };
    },
  };
  Object.defineProperty(ctx, "registry", { get: () => registry });
  registry.attach(ctx);
  return {
    ctx,
    toasts,
    registry,
    get slice() {
      return store.state.ext["encounter-builder"];
    },
  };
}
const handOff = (h, encounterId) =>
  h.ctx.commit("handoff", (draft) =>
    D.handOff(
      draft,
      draft.ext["encounter-builder"],
      encounterId,
      { sceneId: "old-watch", hpMode: "average" },
      "dm",
      { tokenMenuSlice: draft.ext["token-menu"] },
    ),
  );

test("PR-35: a creature row switches between shared and individual initiative (DDB counter)", () => {
  const h = harness();
  let encounterId, rowId;
  h.ctx.commit("new", (draft) => {
    const slice = draft.ext["encounter-builder"];
    encounterId = D.createEncounter(slice, "dm", { name: "Pattuglia" }).id;
    rowId = D.addCreature(slice, "dm", encounterId, GOBLIN).row.id;
    D.changeCount(slice, "dm", encounterId, rowId, 2);
  });
  handOff(h, encounterId);
  const copies = D.copiesOf(h.slice.encounters.find((e) => e.id === encounterId));
  assert.equal(copies.length, 3);
  const keys = () => new Set(copies.map((c) => D.initiativeKeyOf(h.ctx.state, c.actorId)));
  assert.equal(keys().size, 1, "copies share one roll by default (SRD)");
  h.ctx.commit("individual", (draft) =>
    D.updateRow(draft.ext["encounter-builder"], "dm", encounterId, rowId, {
      individualInitiative: true,
    }),
  );
  assert.equal(keys().size, 3, "each copy rolls its own d20");
  const encounter = h.slice.encounters.find((e) => e.id === encounterId);
  const ids = new Set(copies.map((c) => c.actorId));
  assert.equal(
    D.initiativeGroups(h.ctx.state, h.slice, encounter).filter((g) =>
      g.actorIds.some((id) => ids.has(id)),
    ).length,
    3,
    "three initiative groups, one per copy",
  );
  // The switch survives a reload (normalization keeps it).
  const normalized = D.normalizeSlice(structuredClone(h.slice));
  assert.equal(
    normalized.encounters.find((e) => e.id === encounterId).rows.find((r) => r.id === rowId)
      .individualInitiative,
    true,
  );
});

test("PR-45: a unique linked creature is the same NPC in two encounters on one scene", () => {
  const h = harness();
  let firstId;
  h.ctx.commit("new", (draft) => {
    const slice = draft.ext["encounter-builder"];
    const encounter = D.createEncounter(slice, "dm", { name: "Il capo" });
    firstId = encounter.id;
    const { row } = D.addCreature(slice, "dm", encounter.id, GOBLIN);
    D.updateRow(slice, "dm", encounter.id, row.id, { unique: true });
  });
  handOff(h, firstId);
  let secondId;
  h.ctx.commit("dup", (draft) => {
    secondId = D.duplicateEncounter(draft.ext["encounter-builder"], "dm", firstId).id;
  });
  handOff(h, secondId);
  const bosses = Object.values(h.ctx.state.actors).filter(
    (a) => a.encounterBlock?.unique && a.encounterBlock.creatureId === GOBLIN.creatureId,
  );
  assert.equal(bosses.length, 1, "no second copy of the linked NPC");
  const tokens = h.ctx.state.scenes[0].tokens.filter((t) => t.actorId === bosses[0].id);
  assert.equal(tokens.length, 1, "one token on the scene");
  const second = h.slice.encounters.find((e) => e.id === secondId);
  assert.equal(D.copiesOf(second)[0].actorId, bosses[0].id);
});

test("PR-46: a token named after an SRD block offers «Carica statistiche» and gets HP, AC and the attack", () => {
  const h = harness();
  h.ctx.commit("npc", (s) => {
    createSceneNPC(
      s,
      { id: "ogre-1", name: "Ogre", hp: 10, ac: 12, speed: 9, team: "watch" },
      "dm",
    );
    placeSceneToken(s, "old-watch", "ogre-1", { x: 500, y: 500 }, "token-ogre-1", "dm");
  });
  const offer = D.blockOffer(h.ctx.state, h.slice, "ogre-1");
  assert.deepEqual(offer.ref, OGRE);
  h.ctx.commit("load", (s) =>
    D.loadBlockStats(s, s.ext["encounter-builder"], "ogre-1", offer.ref, "dm"),
  );
  const ogre = h.ctx.state.actors["ogre-1"];
  const block = D.blockOf(h.slice, OGRE);
  assert.equal(ogre.maxHp, block.hp.average);
  assert.equal(ogre.hp, block.hp.average, "a creature at full HP stays at full HP");
  assert.equal(ogre.ac, block.ac);
  assert.ok(isValidMeleeProfile(ogre.combatProfile.meleeAttack), "the block's attack");
  assert.equal(ogre.compendiumRef.id, OGRE.creatureId);
  assert.equal(D.blockOffer(h.ctx.state, h.slice, "ogre-1"), null, "offered once");
  // The Table's creature panel and the NPC sheet show the offer to the DM only.
  h.ctx.commit("npc2", (s) =>
    createSceneNPC(s, { id: "ogre-2", name: "Ogre 2", hp: 10, ac: 12, speed: 9 }, "dm"),
  );
  const panel = h.registry.get("table-panel", "encounter-builder-npc", h.ctx, {
    selectedActorId: "ogre-2",
  });
  assert.ok(panel, "the creature panel section is there for the DM");
  const html = h.registry.slot("table-panel", panel, h.ctx, { selectedActorId: "ogre-2" });
  assert.match(html, /Carica statistiche/);
  assert.match(html, /Incolla riga del blocco/);
  h.ctx.role = "player";
  assert.equal(
    h.registry.get("table-panel", "encounter-builder-npc", h.ctx, { selectedActorId: "ogre-2" }),
    null,
  );
});

test("PR-43: a pasted stat-block line becomes the NPC's attack after confirmation; a ranged line is refused", () => {
  const h = harness();
  const line = "Scimitarra. Attacco in mischia: +4, portata 1,5 m. 5 (1d6 + 2) danni taglienti.";
  const preview = D.attackFromLine(line);
  assert.equal(preview.profile.attackBonus, 4);
  assert.equal(h.ctx.state.actors["goblin-2"].combatProfile?.meleeAttack, undefined);
  h.ctx.commit("line", (s) => D.setAttackFromLine(s, "goblin-2", line, "dm"));
  const melee = h.ctx.state.actors["goblin-2"].combatProfile.meleeAttack;
  assert.ok(isValidMeleeProfile(melee));
  assert.equal(melee.name.it, "Scimitarra");
  assert.deepEqual(melee.damageDice, [{ count: 1, sides: 6 }]);
  assert.throws(
    () =>
      h.ctx.commit("ranged", (s) =>
        D.setAttackFromLine(
          s,
          "goblin-2",
          "Arco corto. Attacco a distanza: +4, gittata 24/96 m. 5 (1d6 + 2) danni perforanti.",
          "dm",
        ),
      ),
    /ranged attack line/,
  );
  assert.throws(() => h.ctx.commit("x", (s) => D.setAttackFromLine(s, "livia", line, "dm")));
});

// ---------------------------------------------------------------- PR-38: live text

function field(attrs, value, saved = value) {
  const el = {
    attrs,
    value,
    defaultValue: saved,
    selectionStart: value.length,
    selectionEnd: value.length,
    listeners: {},
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    hasAttribute: (k) => k in attrs,
    closest: () => null,
    focus() {
      doc.activeElement = el;
    },
    setSelectionRange(start, end) {
      el.selectionStart = start;
      el.selectionEnd = end;
    },
    addEventListener(type, fn) {
      (el.listeners[type] ||= []).push(fn);
    },
    dispatchEvent(event) {
      for (const fn of el.listeners[event.type] ?? []) fn(event);
    },
  };
  return el;
}
let doc;
function page(fields) {
  doc = {
    fields,
    activeElement: null,
    querySelectorAll: () => doc.fields,
    querySelector: (selector) =>
      doc.fields.find((f) => selector === `[data-eb-note="${f.attrs["data-eb-note"]}"]`) ?? null,
  };
  return doc;
}

test("PR-38: typing in Riassunto, then Tesoro at once loses no character and keeps the caret (3 times)", () => {
  for (const [typed, more] of [
    ["Tre cultisti", " + pozione"],
    ["Lanterna verde", " ARGENTO"],
    ["Chiave", " di ottone"],
  ]) {
    const summary = field({ "data-eb-note": "summary" }, typed, "");
    const treasure = field({ "data-eb-note": "treasure" }, "12 mo" + more, "12 mo");
    treasure.selectionStart = treasure.selectionEnd = treasure.value.length;
    page([summary, treasure]).activeElement = treasure;
    // The save re-renders: new fields with the saved values, focus lost.
    UI.keepLiveText(() => {
      doc.fields = [
        field({ "data-eb-note": "summary" }, typed),
        field({ "data-eb-note": "treasure" }, "12 mo"),
      ];
      doc.activeElement = null;
    }, doc);
    const [newSummary, newTreasure] = doc.fields;
    assert.equal(newSummary.value, typed, "the saved field keeps its text");
    assert.equal(newTreasure.value, "12 mo" + more, "what was typed meanwhile stays");
    assert.equal(doc.activeElement, newTreasure, "focus stays in Tesoro");
    assert.equal(newTreasure.selectionStart, newTreasure.value.length, "caret at the end");
    // Leaving the restored field still saves it (a restored value is not a user edit).
    const changes = [];
    newTreasure.addEventListener("change", () => changes.push(newTreasure.value));
    newTreasure.dispatchEvent({ type: "blur" });
    assert.deepEqual(changes, ["12 mo" + more]);
  }
});
