// R1 (round 2) — the Table's attack card, roll dialog, detail and right-click menu: the rider
// die named in the total («+ [3] (Benedizione)», PG-47), plain bonuses titled «Bonus»
// (TV-92), the Heroic Inspiration hold (TV-83), «Danno critico» and «Chi vede» (TV-89),
// «CD nascosta» (C1) and a forged weapon's bonus in the formula (BI-24). Synthetic data only.
import test, { afterEach, before } from "node:test";
import assert from "node:assert/strict";
import { neighboursReady, beginAttempt, resolveRoll } from "../combat.mjs";
import {
  neighboursReady as uiReady,
  bindCombatUI,
  openCombatRequests,
  openRoll,
  renderCombatInspector,
  resetCombatUI,
} from "../combat-ui.mjs";
import * as SP from "../sheet-plus-domain.mjs";
import * as TD from "../dice-tray-domain.mjs";
import { harness } from "./p5-harness.mjs";

before(async () => {
  await neighboursReady;
  await uiReady;
});
afterEach(() => resetCombatUI());

const element = { querySelectorAll: () => [], querySelector: () => element };
function withDocument(run) {
  const previous = globalThis.document;
  globalThis.document = { querySelector: () => element, querySelectorAll: () => [] };
  try {
    return run();
  } finally {
    globalThis.document = previous;
  }
}
function setup({ role = "player", bless = false, inspiration = false } = {}) {
  const h = harness({ role });
  h.ctx.commit("setup", (s) => {
    s.ext[SP.ID] ??= SP.seedSlice(s);
    s.ext[TD.ID] ??= TD.seedSlice();
    if (bless) SP.toggleEffect(s, "livia", "bless", true, "player");
    if (inspiration) s.ext[TD.ID].inspiration.livia = { active: true };
    Object.assign(
      s.scenes[0].tokens.find((t) => t.actorId === "livia"),
      { x: 100, y: 100 },
    );
    Object.assign(
      s.scenes[0].tokens.find((t) => t.actorId === "goblin-1"),
      { x: 150, y: 100 },
    );
    s.actors["goblin-1"].ac = 12;
  });
  return h;
}
const attack = (h, selection = {}) => {
  let attempt;
  h.ctx.commit("attempt", (s) => {
    attempt = beginAttempt(
      s,
      {
        id: "ui-1",
        actorId: "livia",
        actionId: "quarterstaff",
        selection: { targetIds: ["goblin-1"], ...selection },
        mode: "physical",
      },
      "player",
    );
  });
  return h.ctx.state.combatAttempts.find((a) => a.id === attempt.id);
};

test("PG-47: the attack card names the Bless die in the total, the roll dialog asks for it", () => {
  const h = setup({ bless: true });
  const attempt = attack(h);
  const request = attempt.requests[0];
  withDocument(() => openRoll(h.ctx, attempt.id, request.id));
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /Dado 2 · d4 \(Benedizione\)/);
  assert.match(dialog.body, /d20 \+ d4 \(Benedizione\)/);
  h.ctx.commit("roll", (s) => resolveRoll(s, attempt.id, request.id, [11, 3], "player"));
  withDocument(() => openCombatRequests(h.ctx, attempt.id));
  const card = h.dialogs.at(-1).body;
  assert.match(card, /11 \+ \[3\] \(Benedizione\) [+−] \d+ = \d+/);
  const total = h.ctx.state.combatAttempts[0].requests[0].total;
  assert.equal(total, 11 + 3 + request.modifier);
});

test("TV-92: a plain bonus is titled «Bonus» with its source, never «Effetti delle condizioni»", () => {
  const h = setup();
  const attempt = attack(h, { situationalBonus: 2 });
  withDocument(() => openRoll(h.ctx, attempt.id, attempt.requests[0].id));
  const body = h.dialogs.at(-1).body;
  assert.match(body, /aria-label="Bonus"><li>Bonus: Bonus aggiunto \+ 2<\/li>/);
  assert.doesNotMatch(body, /Effetti delle condizioni/);
});

test("TV-83: a held d20 offers «Usa Ispirazione eroica: ritira il d20» and «Continua»", () => {
  const h = setup({ inspiration: true });
  const attempt = attack(h);
  h.ctx.commit("roll", (s) => resolveRoll(s, attempt.id, attempt.requests[0].id, [3], "player"));
  withDocument(() => openCombatRequests(h.ctx, attempt.id));
  const card = h.dialogs.at(-1).body;
  assert.match(card, /data-inspiration-reroll="[^"]+"[^>]*>Usa Ispirazione eroica: ritira il d20</);
  assert.match(card, /data-inspiration-keep="[^"]+"[^>]*>Continua</);
  assert.match(card, /Scegli: ritira o continua/);
});

test("TV-89: right-click on an attack offers «Danno critico» and «Chi vede»; the choice reaches the detail", () => {
  const h = setup();
  let menuHTML = "";
  let click = null;
  const menu = {
    setAttribute() {},
    set innerHTML(value) {
      menuHTML = value;
    },
    get innerHTML() {
      return menuHTML;
    },
    querySelectorAll: () => [],
    addEventListener: (type, fn) => type === "click" && (click = fn),
    style: {},
    offsetWidth: 240,
    offsetHeight: 300,
    remove() {},
    contains: () => false,
  };
  const doc = {
    createElement: () => menu,
    body: { append() {} },
    defaultView: { innerWidth: 1440, innerHeight: 900 },
    addEventListener() {},
    removeEventListener() {},
  };
  const button = {
    dataset: { combatAction: "quarterstaff", combatKind: "attack" },
    ownerDocument: doc,
    getBoundingClientRect: () => ({ left: 10, top: 10 }),
    focus() {},
  };
  bindCombatUI(
    {
      querySelectorAll: (selector) => (selector === "[data-combat-action]" ? [button] : []),
      querySelector: () => null,
    },
    { ...h.ctx, render() {} },
    "livia",
  );
  button.oncontextmenu({ preventDefault() {}, clientX: 40, clientY: 40 });
  assert.match(menuHTML, /data-combat-menu-critical>Danno critico/);
  assert.match(menuHTML, /Chi vede/);
  for (const audience of ["public", "gm", "blind", "self"])
    assert.match(menuHTML, new RegExp(`data-combat-menu-audience="${audience}"`));
  const item = (attrs) => ({
    target: {
      closest: () => ({
        dataset: attrs,
        hasAttribute: (name) => name === "data-combat-menu-critical" && attrs.critical,
      }),
    },
  });
  click(item({ critical: true }));
  button.oncontextmenu({ preventDefault() {}, clientX: 40, clientY: 40 });
  click(item({ combatMenuAudience: "blind" }));
  const detail = renderCombatInspector(h.ctx, "livia");
  assert.match(detail, /data-combat-flag="forceCritical" checked/);
  assert.match(detail, /Motivo del critico \(lo legge il DM\)/);
  assert.match(detail, /<option value="blind" selected>Solo il DM<\/option>/);
});

test("TV-89: «Solo il DM» (blind) keeps the roller's own values out of the player's card", () => {
  const h = setup({ role: "dm" });
  const attempt = attack(h, { audience: "blind" });
  h.ctx.commit("roll", (s) => resolveRoll(s, attempt.id, attempt.requests[0].id, [17], "player"));
  h.ctx.role = "player";
  withDocument(() => openCombatRequests(h.ctx, attempt.id));
  const card = h.dialogs.at(-1).body;
  assert.match(card, /Risultato riservato al DM/);
  assert.doesNotMatch(card, /17/);
  assert.match(card, /Chi vede: Solo il DM/);
});

test("TV-92: the player's Tiri e risultati lists no request the DM made to a DM creature", async () => {
  const { enqueueRollRequest } = await import("../combat.mjs");
  const h = setup({ role: "dm" });
  const label = { it: "Richiesta del DM · TS su Destrezza", en: "DM request · Dex save" };
  h.ctx.commit("ask", (s) => {
    enqueueRollRequest(
      s,
      { id: "g", actorId: "goblin-1", kind: "save", ability: "dex", modifier: 1, dc: 12, label },
      "dm",
    );
    enqueueRollRequest(
      s,
      { id: "l", actorId: "livia", kind: "save", ability: "dex", modifier: 2, dc: 12, label },
      "dm",
    );
  });
  withDocument(() => openCombatRequests(h.ctx));
  assert.equal((h.dialogs.at(-1).body.match(/class="attempt-result"/g) ?? []).length, 2);
  h.ctx.role = "player";
  withDocument(() => openCombatRequests(h.ctx));
  const card = h.dialogs.at(-1).body;
  assert.equal((card.match(/class="attempt-result"/g) ?? []).length, 1);
  assert.doesNotMatch(card, /Sentinella/);
  assert.match(card, /Livia · Tiro salvezza · CD 12/);
});

test("C1: a DC kept from the player reads «CD nascosta» on the card and in the roll dialog", async () => {
  const { enqueueRollRequest } = await import("../combat.mjs");
  const h = setup({ role: "dm" });
  const label = { it: "Richiesta del DM · Salto", en: "DM request · Jump" };
  h.ctx.commit("ask", (s) => {
    const attempt = enqueueRollRequest(
      s,
      { id: "l", actorId: "livia", kind: "save", ability: "dex", modifier: 2, dc: 15, label },
      "dm",
    );
    attempt.requests[0].dcHidden = true;
  });
  h.ctx.role = "player";
  const attempt = h.ctx.state.combatAttempts.at(-1);
  withDocument(() => openCombatRequests(h.ctx, attempt.id));
  assert.match(h.dialogs.at(-1).body, /Tiro salvezza · CD nascosta/);
  withDocument(() => openRoll(h.ctx, attempt.id, attempt.requests[0].id));
  const dialog = h.dialogs.at(-1).body;
  assert.match(dialog, /Salto<\/strong> · CD nascosta/);
  assert.doesNotMatch(dialog, /CD 15/);
  h.ctx.role = "dm";
  withDocument(() => openRoll(h.ctx, attempt.id, attempt.requests[0].id));
  assert.match(h.dialogs.at(-1).body, /Salto<\/strong> · CD 15/);
});

test("BI-24: the attack detail of a forged +1 sword names the bonus in its damage", async () => {
  const HE = await import("../homebrew-editor-domain.mjs");
  const { prepareCombatAction } = await import("../combat-ui.mjs");
  const h = setup({ role: "dm" });
  const { data } = HE.forgeItem("srd2024:item:longsword", ["weapon-plus-1"]);
  h.ctx.commit("forge", (s) => {
    s.library = [...(s.library ?? []), { id: "hb-sword", revisions: [{ id: "rev-1", data }] }];
    s.actors.doran.inventory = [
      {
        id: "sword-1",
        name: data.name,
        kind: "weapon",
        quantity: 1,
        equipped: true,
        homebrewRef: { contentId: "hb-sword", revisionId: "rev-1" },
      },
    ];
  });
  prepareCombatAction(h.ctx, "doran", "item-attack.sword-1", { targetIds: [] });
  const detail = renderCombatInspector(h.ctx, "doran");
  assert.match(detail, /Spada lunga \+1/);
  assert.match(detail, /1d8 \+ 1 \(Spada lunga \+1\)/);
  assert.match(detail, /Una mano · d8<\/option><option value="2" >Due mani · d10/);
});

test("EN: the hold, the menu choices and the card read in English", () => {
  const h = setup({ inspiration: true, bless: true });
  h.ctx.lang = "en";
  const attempt = attack(h, { forceCritical: true, criticalReason: "Sneak", audience: "gm" });
  h.ctx.commit("roll", (s) => resolveRoll(s, attempt.id, attempt.requests[0].id, [3, 2], "player"));
  withDocument(() => openCombatRequests(h.ctx, attempt.id));
  const card = h.dialogs.at(-1).body;
  assert.match(card, />Use Heroic Inspiration: reroll the d20</);
  assert.match(card, />Continue</);
  assert.match(card, /3 \+ \[2\] \(Bless\)/);
  assert.match(card, /Declared critical damage: Sneak/);
  assert.match(card, /Who sees: Me and the DM/);
});
