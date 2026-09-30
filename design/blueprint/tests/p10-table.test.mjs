// P10 — Table safety and session tools: filterFor on chat and handouts (CA-68), Stop / Slow
// down / Raise hand on the map bar and the DM's hand counter (CA-66), the GM hand-off runner
// (CA-57), pause tips (SV-50), party ribbons (TV-115), spectator area and calibration
// (TV-117), countdown and clocks findable (TV-130/131), "play for" (TV-112), the Kanka
// dashboard widgets (CA-03), the invite dialog and "view as" on the member row (CA-49/60).
// Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import * as D from "../safety-domain.mjs";
import * as UI from "../safety-ui.mjs";
import { register as registerSafety } from "../safety.mjs";
import * as SV from "../session-view.mjs";
import * as P from "../party.mjs";
import * as cm from "../campaign-members.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (k) => (values.has(k) ? values.get(k) : null),
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k),
  };
};
function harness(areas = []) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  for (const [id, reg] of areas) assert.equal(registry.use(id, reg).status, "built", id);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const toasts = [];
  const dialogs = [];
  const ctx = {
    role: "player",
    lang: "it",
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (v && typeof v === "object" ? v[ctx.lang] || v.it || "" : String(v ?? "")),
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate(page, params = {}) {
      ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" };
    },
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    commit(label, mutator, options = {}) {
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    registry,
  };
  registry.attach(ctx);
  return { ctx, registry, toasts, dialogs, store: () => store };
}

test("CA-68 filterFor: masks swear words in chat and handouts, veils a marked handout", () => {
  const h = harness([["safety", registerSafety]]);
  const slice = () => h.ctx.state.ext.safety;
  const chatItem = `<li class="chat-item" data-chat-message="m1"><div class="chat-text">Che cazzo di trappola, stronzo!</div><img src="data:image/png;base64,AA" alt="x"></li>`;
  // Filter off: nothing changes.
  assert.equal(UI.filterChatMarkup(h.ctx, chatItem, { id: "m1" }), chatItem);
  assert.equal(D.filterFor(h.ctx.state, "player").text("merda"), "merda");
  // The player turns the filter on with the swear-word filter and blurred pictures.
  h.ctx.commit(
    "f",
    (s) =>
      D.setContentFilter(s.ext.safety, "player", { enabled: true, profanity: true, images: true }),
    { local: true },
  );
  const filter = D.filterFor(h.ctx.state, "player");
  assert.equal(filter.text("Che cazzo!"), "Che c••••!");
  assert.equal(filter.text("cazzotto"), "cazzotto", "whole words only");
  const chat = UI.filterChatMarkup(h.ctx, chatItem, { id: "m1" });
  assert.match(chat, /c•••• di trappola, s••••••!/);
  assert.match(chat, /<img data-safety-blurred/);
  assert.match(chat, /data-safety-content-show/);
  assert.doesNotMatch(chat, /data-chat-message="m•/, "markup attributes are never masked");
  // Another viewer (the DM) sees the original text.
  assert.equal(D.filterFor(h.ctx.state, "dm").text("cazzo"), "cazzo");
  // Handouts: the DM marks one with Spiders; the player's line «Ragni» veils it for them.
  h.ctx.role = "dm";
  h.ctx.commit("m", (s) =>
    D.markContent(s, s.ext.safety, "lanterns", "dm", "handout", "material-crypt", [
      { topic: "spiders" },
    ]),
  );
  h.ctx.role = "player";
  const article = `<article class="handouts-viewer" data-hs-viewer="material-crypt"><p>Una stronza tela di ragno.</p></article>`;
  assert.doesNotMatch(
    UI.filterHandoutMarkup(h.ctx, "material-crypt", article),
    /is-veiled/,
    "no line yet",
  );
  h.ctx.commit("l", (s) => D.addLimit(s.ext.safety, "player", "lines", "Ragni"), { local: true });
  const veiled = UI.filterHandoutMarkup(h.ctx, "material-crypt", article);
  assert.match(veiled, /safety-content is-veiled/);
  assert.match(veiled, /Sfumata dal tuo filtro<\/strong> · Ragni/);
  assert.match(veiled, /inert/);
  assert.match(veiled, /s••••••/, "masked inside the veil too");
  assert.equal(
    D.filterFor(h.ctx.state, "player").topicsFor("handout", "material-crypt").topics[0].topic,
    "spiders",
  );
  // The player's own lines are shown as included in the profile filter, checked and locked.
  const page = UI.renderProfilePage(h.ctx, { slice: (s) => s.ext.safety, ctx: () => h.ctx });
  assert.match(page, /value="spiders" checked disabled data-safety-own-topic/);
  assert.match(page, /data-safety-filter="profanity" checked/);
  // Normalization keeps content marks and the new filter switches.
  const again = D.normalizeSafety(structuredClone(slice()), 1);
  assert.deepEqual(again, D.normalizeSafety(again, 1));
  assert.equal(again.campaigns.lanterns.contentMarks.length, 1);
  assert.equal(again.profiles.player.filter.profanity, true);
});

test("CA-66 the map bar: Stop, Slow down and Raise hand in one tap; the DM's hand counter", () => {
  const h = harness([["safety", registerSafety]]);
  const api = { slice: (s) => s.ext.safety, ctx: () => h.ctx };
  // The DM agrees Slow down and Raise hand for this table.
  h.ctx.role = "dm";
  UI.perform(h.ctx, api, "expectations", { tools: ["stop", "pace", "hand", "lines"] });
  h.ctx.role = "player";
  const bar = UI.safetyHud(h.ctx);
  assert.match(bar, /data-safety-hud="stop"/);
  assert.match(bar, /data-safety-hud="pace"/);
  assert.match(
    bar,
    /data-safety-hud="raise-hand"[\s\S]*Ctrl\+Maiusc\+U/,
    "the shortcut is visible",
  );
  // One tap sends an anonymous Stop.
  const handlers = {};
  const buttons = [...bar.matchAll(/data-safety-hud="([^"]+)"/g)].map(([, kind]) => ({
    dataset: { safetyHud: kind },
    addEventListener() {},
    set onclick(fn) {
      handlers[kind] = fn;
    },
  }));
  UI.bindSafetyHud({ querySelectorAll: () => buttons }, h.ctx);
  handlers.stop({ preventDefault() {}, stopPropagation() {} });
  assert.equal(D.activeSignals(h.ctx.state, h.ctx.state.ext.safety, "lanterns", "dm").length, 1);
  handlers["raise-hand"]({ preventDefault() {}, stopPropagation() {} });
  // The DM sees the raised-hand counter on the map bar, without opening the bell.
  h.ctx.role = "dm";
  const dmBar = UI.safetyHud(h.ctx);
  assert.match(dmBar, /data-table-drawer="safety"[^>]*data-safety-hud-queue/);
  assert.match(dmBar, /Mani alzate: 1/);
  // The pre-game reminder names the right place.
  const body = UI.reminderBody(h.ctx, {
    tools: ["stop", "hand"],
    lines: [],
    veils: [],
    warnings: [],
  });
  assert.match(body, /in alto sulla mappa del Tavolo/);
  assert.doesNotMatch(body, /“Sicurezza” in alto al Tavolo/);
});

test("CA-57 the member the owner hands the DM role to runs the session tools", () => {
  const state = createInitialState();
  const reg = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  reg.use("campaign-members", cm.register);
  reg.use("session-view", SV.register);
  reg.initState(state);
  assert.throws(() => SV.setPause(state, "player", true, Date.now()), /Only the DM/);
  cm.startHandover(state, "lanterns", "player", "dm", Date.now());
  assert.equal(SV.sessionRunner(state), "player");
  SV.setPause(state, "player", true, Date.now());
  assert.equal(SV.readSession(state).pause.active, true);
  SV.addClock(state, "player", { label: "Il rituale", segments: 6 });
  assert.equal(SV.movementLocked(state, "player"), false, "the runner is not paused");
  // C3 (R7, CA-57): the runner guides the whole session, scene activation included.
  SV.switchScene(state, "player", "road-ambush", Date.now());
  assert.equal(state.activeSceneId, "road-ambush");
  cm.endHandover(state, "lanterns", "dm", Date.now());
  assert.throws(() => SV.setPause(state, "player", false, Date.now()), /Only the DM/);
});

test("TV-117 spectator area: whole scene, around the characters, or a fixed area", () => {
  const state = createInitialState();
  const reg = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  reg.use("session-view", SV.register);
  reg.initState(state);
  const scene = state.scenes[0];
  const whole = SV.displayRegion(state, scene, SV.readSession(state).display);
  assert.deepEqual(whole, { x: 0, y: 0, w: scene.width, h: scene.height });
  SV.setDisplayRegion(state, "dm", { mode: "view", rect: { x: 100, y: 50, w: 400, h: 300 } });
  assert.deepEqual(SV.displayRegion(state, scene, SV.readSession(state).display), {
    x: 100,
    y: 50,
    w: 400,
    h: 300,
  });
  SV.setDisplayRegion(state, "dm", { mode: "party" });
  const party = SV.displayRegion(state, scene, SV.readSession(state).display);
  assert.ok(party.w < scene.width || party.h < scene.height || party.x >= 0);
  // Calibration keeps the area; normalization keeps it too.
  SV.setDisplayScale(state, "dm", { cellMm: 25, ppi: 92, ruler: true });
  assert.equal(SV.readSession(state).display.region.mode, "party");
  assert.equal(
    SV.normalizeSession(structuredClone(SV.readSession(state))).display.region.mode,
    "party",
  );
  assert.throws(() => SV.setDisplayRegion(state, "player", { mode: "scene" }), /Only the DM/);
});

test("TV-130/131, TV-112, SV-50: palette finds countdown and clocks; play for; pause tips", () => {
  const h = harness([["session-view", SV.register]]);
  h.ctx.role = "dm";
  const commands = h.registry.list("command", h.ctx);
  const timer = commands.find((c) => c.id === "session-view.timer");
  const words = (c) =>
    (c.keywords ?? []).map((k) => (typeof k === "string" ? k : `${k.it} ${k.en}`)).join(" ");
  assert.match(`${timer.label.it} ${words(timer)}`, /timer[\s\S]*conto alla rovescia/);
  assert.match(words(commands.find((c) => c.id === "session-view.clocks")), /orologio[\s\S]*clock/);
  assert.ok(commands.find((c) => c.id === "session-view.play-as"));
  h.ctx.role = "player";
  assert.equal(
    h.registry.list("command", h.ctx).some((c) => c.id === "session-view.timer"),
    false,
  );
  // A paused game shows players a tip or a rule of the day.
  h.ctx.role = "dm";
  SV.actions.pause(h.ctx);
  h.ctx.role = "player";
  const hud = h.registry.get("map-layer", "session-view-hud", h.ctx).svg(h.ctx, {
    scene: h.ctx.state.scenes[0],
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  assert.match(hud, /session-view-pause-tip/);
  assert.match(hud, /data-sv="tip"/);
  // The DM's map bar reaches the countdown and the clocks in one tap.
  h.ctx.role = "dm";
  const dmHud = h.registry.get("map-layer", "session-view-hud", h.ctx).svg(h.ctx, {
    scene: h.ctx.state.scenes[0],
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  assert.match(dmHud, /data-sv="focus-timer"/);
  assert.match(dmHud, /data-sv="focus-clocks"/);
  // "Play for" selects the player's character and shows the banner.
  assert.equal(SV.playAs(h.ctx, "player"), true);
  const banner = h.registry.get("map-layer", "session-view-hud", h.ctx).svg(h.ctx, {
    scene: h.ctx.state.scenes[0],
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  assert.match(banner, /Giochi per/);
  SV.resetUI();
});

test("CA-03 Kanka widgets: filtered list, session calendar, entry preview, per role", () => {
  const state = createInitialState();
  const slice = P.seedParty();
  state.ext = { ...(state.ext ?? {}), party: slice };
  const listId = P.addTile(state, slice, "dm", {
    target: "player",
    id: "list",
    config: { filter: "recap", tag: "" },
  });
  assert.equal(listId, "list:1");
  const second = P.addTile(state, slice, "dm", {
    target: "player",
    id: "list",
    config: { filter: "quest" },
  });
  assert.equal(second, "list:2", "several list widgets");
  P.addTile(state, slice, "dm", { target: "dm", id: "calendar" });
  assert.throws(
    () => P.addTile(state, slice, "dm", { target: "dm", id: "preview", config: {} }),
    /Scegli la voce/,
  );
  P.addTile(state, slice, "dm", {
    target: "dm",
    id: "preview",
    config: { entryId: "legacy-recap-summary" },
  });
  assert.throws(
    () => P.addTile(state, slice, "player", { target: "dm", id: "calendar" }),
    /Solo il DM/,
  );
  const normalized = P.normalizeParty(structuredClone(slice));
  assert.deepEqual(
    normalized.dashboards.player
      .filter((row) => row.id.startsWith("list:"))
      .map((row) => row.config.filter),
    ["recap", "quest"],
  );
  assert.ok(
    normalized.dashboards.dm.some(
      (row) => row.id === "preview:1" && row.config.entryId === "legacy-recap-summary",
    ),
  );
  assert.equal(P.tileType("calendar:1"), "calendar");
});

test("CA-49 / CA-60: invite dialog in three steps; «Vedi come» on the member row", () => {
  const h = harness([["campaign-members", cm.register]]);
  h.ctx.role = "dm";
  assert.match(cm.inviteButton(h.ctx), /data-campaign-invite[^>]*>.*Invita giocatori/);
  h.ctx.role = "player";
  assert.equal(cm.inviteButton(h.ctx), "", "players do not invite");
  h.ctx.role = "dm";
  assert.equal(cm.openInvite(h.ctx), true);
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.title, "Invita giocatori");
  assert.match(dialog.body, /name="role"[\s\S]*name="hours"[\s\S]*name="uses"/);
  dialog.options.onSubmit(
    new Map([
      ["role", "player"],
      ["hours", "168"],
      ["uses", "5"],
    ]),
  );
  const ready = h.dialogs.at(-1);
  assert.equal(ready.title, "Link d’invito pronto");
  assert.match(ready.body, /#campaigns\?tab=join&amp;id=|#campaigns\?tab=join&id=/);
  assert.match(ready.body, /data-cm-dialog-copy/);
  const links = cm.metaOf(h.ctx.state, "lanterns").links;
  assert.equal(links.at(-1).maxUses, 5);
  // Palette: «invito» / «invita giocatori» find the command.
  const invite = h.registry.list("command", h.ctx).find((c) => c.id === "campaign-members.invite");
  assert.equal(invite.label.it, "Invita giocatori");
  // The Members tab row of the player offers «Vedi come» and «Cedi il ruolo di DM».
  h.ctx.view = { page: "campaign", tab: "campaign-members", id: "members" };
  const html = cm.renderMembersSection(h.ctx);
  assert.match(
    html,
    /data-cm="view-as"[^>]*data-target="player"|data-cm="view-as" data-id="lanterns" data-target="player"/,
  );
  assert.match(html, /Cedi il ruolo di DM…/);
  cm.handleAction(h.ctx, "view-as", { id: "lanterns", target: "player" });
  assert.deepEqual(h.ctx.view, { page: "campaign", id: "player", tab: "campaign-settings-view" });
});
