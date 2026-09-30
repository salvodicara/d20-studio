// R2 SV-37 — every disabled control of the R2 areas (conditions, dice tray, chat, 3D dice,
// knowledge, notifications) names its cause and remedy next to it, linked by
// aria-describedby (Roll20 errors that name cause and fix). Renders the disabled states and
// checks each one. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as tray from "../dice-tray.mjs";
import * as dice3d from "../dice-3d.mjs";
import * as conditionsUI from "../conditions-ui.mjs";
import * as chat from "../chat.mjs";
import * as notifications from "../notifications.mjs";
import * as K from "../knowledge.mjs";
import * as FVUI from "../fog-vision.mjs";
import { trayHarness, scripted, fakeRoot, click, decode } from "./r2-harness.mjs";

afterEach(() => {
  tray.resetTrayUI();
  dice3d.clearDice();
  dice3d.resetDiceUI();
  conditionsUI.resetConditionsUI();
  K.resetKnowledgeView();
});

/** Every disabled control in `html` points to an element that says why (non-empty text). */
function explained(html, where) {
  const controls = [...html.matchAll(/<(button|input|select|textarea)\b([^>]*)>/g)].filter(
    ([, , attrs]) => /\sdisabled(\s|=|$)/.test(attrs),
  );
  for (const [whole, , attrs] of controls) {
    const id = /aria-describedby="([^"]+)"/.exec(attrs)?.[1];
    assert.ok(id, `${where}: disabled control without a reason: ${whole.slice(0, 160)}`);
    for (const one of id.split(/\s+/)) {
      const target = new RegExp(
        `id="${one.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}"[^>]*>([\\s\\S]*?)</`,
      ).exec(html);
      assert.ok(target, `${where}: reason #${one} is not in the page`);
      assert.ok(
        decode(target[1].replace(/<[^>]+>/g, "")).trim().length > 5,
        `${where}: reason #${one} is empty`,
      );
    }
  }
  return controls.length;
}

test("dice tray: roll modes a formula cannot use, a blocked connected die, a locked inspiration", () => {
  const h = trayHarness({ die: scripted(5) });
  h.ctx.root.querySelector("[data-dtray-formula]").value = "2d6";
  click(h.ctx.root, "[data-dtray-clear]");
  // «2d6»: advantage and disadvantage are off, with the sentence that says why.
  h.section("roll");
  const input = h.ctx.root.querySelector("[data-dtray-formula]");
  input.value = "2d6";
  input.events.input({ target: input });
  h.ctx.render();
  let count = explained(h.ctx.html, "tray 2d6");
  assert.ok(count >= 2, "advantage and disadvantage are disabled for 2d6");
  assert.match(
    h.ctx.html,
    /id="dtray-mode-why"[^>]*>Vantaggio e svantaggio valgono per un solo d20/,
  );
  // A disconnected die: its throw and blink say why.
  h.section("look");
  click(h.ctx.root, "[data-dtray-scan]");
  click(h.ctx.root, '[data-dtray-connect="px-d20-onyx"]');
  const id = h.slice().devices.player[0].id;
  click(h.ctx.root, `[data-dtray-device-state="${id}"]`);
  count = explained(h.ctx.html, "tray devices");
  assert.ok(count >= 2, "throw and blink are disabled for a disconnected die");
  // Its waiting roll: the throw is off, the reason says reconnect or type.
  h.section("roll");
  click(h.ctx.root, '[data-dtray-roll][data-kind="save"][data-ability="dex"]');
  assert.ok(explained(h.ctx.html, "tray waiting") >= 1);
  // The DM's character sheet seen by the player: inspiration is locked, with the reason.
  const section = h.registry.get(
    "sheet-section",
    "dice-tray-sheet",
    h.ctx,
    h.store.state.actors.doran,
  );
  const sheet = section.render(h.ctx, h.store.state.actors.doran);
  assert.ok(explained(sheet, "tray sheet") >= 1);
  assert.match(sheet, /La cambia chi gioca il personaggio o il DM\./);
});

test("3D dice: a full pool says why no die can be added", () => {
  const h = trayHarness();
  const view = { scene: h.store.state.scenes[0] };
  let html = dice3d.renderDrawer(h.ctx, view);
  for (let i = 0; i < 10; i++) {
    const root = fakeRoot(html);
    dice3d.bindDrawer(root, h.ctx);
    click(root, '[data-dice3d-add="6"]');
    html = dice3d.renderDrawer(h.ctx, view);
  }
  assert.ok(explained(html, "3D drawer") >= 7, "every add button is disabled when full");
  assert.match(html, /Al massimo 10 dadi per lancio/);
});

test("conditions: a dying creature offline, Undo with nothing to undo, exhaustion at 0", () => {
  let store = createStore();
  Object.assign(store.state.actors.livia, { hp: 0, dead: false, exhaustion: 0 });
  store.state.actors.livia.vitalityPolicy = {
    zeroHp: "death-saves",
    source: { kind: "authored", edition: "2024", revision: "r2-reasons" },
  };
  store.state.actors.livia.deathSaves = {
    successes: 0,
    failures: 0,
    stable: false,
    recovery: null,
  };
  const ctx = {
    get state() {
      return store.state;
    },
    role: "player",
    lang: "it",
    offline: true,
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    conditionActor: (id, state = ctx.state) => structuredClone(state.actors[id]),
    conditionRolls: () => [],
    beginConditionRoll: () => ({ descriptorId: "r0" }),
    openConditionRoll() {},
    applyConditionFollowUps() {},
    dialog() {},
    toast() {},
    canUndo: () => false,
    undo() {},
    commit() {
      throw Error("offline");
    },
    render() {
      this.html = conditionsUI.renderConditionsPanel(this);
    },
  };
  conditionsUI.openConditions(ctx, { actorId: "livia" });
  ctx.render();
  assert.ok(explained(ctx.html, "conditions offline dying") >= 1, "the death save is off offline");
  assert.match(ctx.html, /Senza rete: riconnettiti per registrare questo tiro condiviso\./);
  // Exhaustion at level 0: «−» is off and says so.
  ctx.offline = false;
  ctx.render();
  const root = { ...fakeRoot(ctx.html) };
  conditionsUI.bindConditionsPanel(root, ctx);
  root.querySelector('[data-conditions-command="exhaustion"]').events.click({
    target: {},
    preventDefault() {},
  });
  ctx.render();
  assert.match(ctx.html, /id="conditions-step-down-why"[^>]*>Livello 0: nessun Indebolimento/);
  explained(ctx.html, "conditions exhaustion");
});

test("chat and notifications: a closed vote, no one to share as, nothing to mark as read", () => {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ document: null, logger: null, deviceStorage: storage });
  registry.use("chat", chat.register);
  registry.use("notifications", notifications.register);
  const store = createStore({ storage });
  registry.initState(store.state);
  const ctx = {
    get state() {
      return store.state;
    },
    role: "dm",
    lang: "it",
    offline: false,
    view: { page: "table", id: "", tab: "" },
    registry,
    esc,
    icon: () => "",
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    toast() {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
  };
  registry.attach(ctx);
  // The DM speaking as nobody of theirs: «Condividi» is off and says why.
  const panel = registry.get("table-panel", "log", ctx).render(ctx, {});
  explained(panel, "chat panel");
  // A closed vote.
  const vote = chat.itemHTML(ctx, {
    type: "message",
    id: "v1",
    kind: "vote",
    at: new Date().toISOString(),
    speakerName: "DM",
    speakerType: "user",
    author: "dm",
    text: "",
    vote: {
      question: "Riposiamo?",
      yes: 1,
      no: 0,
      ballots: [],
      mine: null,
      closed: true,
      outcome: "yes",
      canVote: false,
      canClose: false,
    },
  });
  assert.ok(explained(vote, "chat vote") >= 2);
  // Nothing unread: «Segna tutte come lette» is off and says so.
  const centre = notifications.renderCentre(ctx);
  if (/data-notifications-read-all[^>]*disabled/.test(centre)) {
    explained(centre, "notifications");
    assert.match(centre, /Nessuna notifica da leggere\./);
  }
});

test("knowledge: «Gli infilo un mio oggetto» without items says what to do", () => {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  registry.use("fog-vision", FVUI.register);
  registry.use("knowledge", K.register);
  const store = createStore({ storage });
  registry.initState(store.state);
  store.state.actors.livia.inventory = [];
  let opened = null;
  const ctx = {
    role: "player",
    lang: "it",
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon: () => "",
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    toast() {},
    dialog: (title, body) => (opened = body),
    closeDialog() {},
    render() {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    registry,
  };
  registry.attach(ctx);
  if (typeof K.openPickpocket === "function") {
    K.openPickpocket(ctx, "goblin-1", "livia");
    if (opened) explained(opened, "knowledge pickpocket");
  }
  // The Hide button a player cannot use says why (existing reasons list).
  const scene = store.state.scenes.find((s) => s.id === store.state.activeSceneId);
  const panel = registry.get("table-panel", "knowledge", ctx, { scene });
  const html = panel.render(ctx, { scene, selectedActorId: "livia" });
  assert.ok(explained(html, "knowledge stealth") >= 1, "Hide is off in the open courtyard");
});
