// B24 — notification and request centre: domain sources, read state, preferences,
// announcements and the centre's handlers, with the real store and registry.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { applyVitalityEvent } from "../conditions.mjs";
import { applyConditionFollowUps, resolveRoll } from "../combat.mjs";
import * as sessions from "../campaign-sessions.mjs";
import * as content from "../campaign-content.mjs";
import * as N from "../notifications.mjs";

// Session notices show the viewer's own time first: the suite runs in one fixed zone.
process.env.TZ = "Europe/Rome";
const HOUR = 3600e3;
const pause = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
// Minimal DOM stand-in for the common dialog: elements with attributes, dataset, onclick.
function parseNodes(html) {
  return [...html.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)].map(([, tag, raw]) => {
    const attrs = Object.fromEntries(
      [...raw.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v ?? "")]),
    );
    const node = {
      tagName: tag.toUpperCase(),
      attrs,
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      disabled: "disabled" in attrs,
      onclick: null,
      textContent: "",
      focus() {
        dom.focused = node;
      },
      getAttribute: (k) => attrs[k] ?? null,
      click() {
        assert.ok(!node.disabled, "clicked a disabled control");
        node.onclick?.();
      },
    };
    return node;
  });
}
const matches = (node, selector) => {
  const parts = [...selector.matchAll(/\[([\w-]+)(?:=("?)([^"\]]*)\2)?\]/g)];
  return (
    parts.length > 0 &&
    parts.every(
      ([, name, , value]) =>
        name in node.attrs && (value === undefined || node.attrs[name] === decode(value)),
    )
  );
};
function fakeRoot(html) {
  return {
    centre: html.includes("data-notifications-centre"),
    html,
    nodes: parseNodes(html),
    set innerHTML(value) {
      this.html = value;
      this.nodes = parseNodes(value);
    },
    get innerHTML() {
      return this.html;
    },
    querySelectorAll(selector) {
      return this.nodes.filter((node) => matches(node, selector));
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] ?? null;
    },
  };
}
// The centre's live region is a sibling of the redrawn part: it survives every refresh.
const dom = { root: null, live: null, focused: null };
function openFakeDialog(body) {
  const centre = body.match(
    /^<div class="notifications-centre" data-notifications-centre>([\s\S]*)<\/div>(<p [^>]*data-notifications-live[^>]*><\/p>)$/,
  );
  if (centre) {
    dom.root = fakeRoot(centre[1]);
    dom.root.centre = true;
    dom.live = parseNodes(centre[2])[0];
  } else {
    dom.root = fakeRoot(body);
    dom.live = null;
  }
}
globalThis.document = {
  querySelector(selector) {
    if (!dom.root) return null;
    if (selector === "#dialog [data-notifications-live]") return dom.live;
    if (selector === "#dialog") return dom.root;
    const inner = selector.replace(/^#dialog\s+/, "");
    if (inner === "[data-notifications-centre]") return dom.root.centre ? dom.root : null;
    return dom.root.querySelector(inner);
  },
  querySelectorAll(selector) {
    return dom.root ? dom.root.querySelectorAll(selector.replace(/^#dialog\s+/, "")) : [];
  },
};
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
const form = (values) => ({
  get: (key) => (key in values ? values[key] : null),
  has: (key) => key in values,
});

// The app's commit/undo/role/offline plumbing around the real store and registry.
function makeApp({ storage = memory(), areas = [] } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("notifications", N.register);
  for (const [id, register] of areas) registry.use(id, register);
  const store = createStore({ storage });
  registry.initState(store.state);
  let role = "player",
    lang = "it",
    offline = false;
  const dialogs = [],
    toasts = [],
    navigations = [];
  const ctx = {
    get state() {
      return store.state;
    },
    get role() {
      return role;
    },
    get lang() {
      return lang;
    },
    get offline() {
      return offline;
    },
    view: { page: "home", id: "", tab: "" },
    t: (it, en) => (lang === "it" ? it : en),
    label: (value) =>
      typeof value === "object" && value ? value[lang] || value.it : String(value ?? ""),
    esc,
    icon,
    canControl: (actor) => canControlActor(actor, role, store.state),
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate(page, params = {}) {
      navigations.push({ page, params });
      ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" };
      dom.root = null;
      registry.emit("navigate", { page, id: ctx.view.id, tab: ctx.view.tab, from: null });
    },
    openSheet: (id, tab) => ctx.navigate("characters", { id, tab: tab || "actions" }),
    dialog(title, body, options = {}) {
      dialogs.push({ title, body, options });
      openFakeDialog(body);
    },
    closeDialog: () => (dom.root = null),
    commit(label, mutator, options = {}) {
      if (offline && !options.local)
        throw Object.assign(Error("offline"), {
          it: "Sei senza rete: questa modifica condivisa non può essere applicata.",
          en: "You are offline: this shared change cannot be applied.",
          refusal: true,
        });
      const before = store.state;
      store.commit(label, mutator, role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(role);
      registry.afterUndo(current, store.state);
      store.persist();
      registry.emitStateEvents(current, store.state, { kind: "correction" });
    },
    registry,
  };
  registry.attach(ctx);
  // The shell's first render announces the page: the centre takes its baseline there.
  registry.emit("navigate", { page: "home", id: "", tab: "", from: null });
  return {
    ctx,
    store,
    registry,
    dialogs,
    toasts,
    navigations,
    as(next) {
      role = next;
      dom.root = null;
      registry.emit("role-changed", { role });
    },
    lang(next) {
      lang = next;
      registry.emit("language-changed", { lang });
    },
    offline(next) {
      offline = next;
      registry.emit("offline-changed", { offline });
    },
  };
}

// Real campaign commands, applied as the current identity.
let sequence = 0;
function scheduleSession(app, { title, localTime, timeZone = "Europe/Rome" }) {
  const id = `draft-session-${++sequence}`;
  let sessionId;
  app.ctx.commit("Sessione", (draft) => {
    sessions.createSessionDraft(draft, { id, kind: "direct" }, app.ctx.role);
    sessions.saveSessionDraft(
      draft,
      id,
      { data: { title, localTime, timeZone, selectedInstant: null }, expectedDraftRevision: 0 },
      app.ctx.role,
    );
    const preview = sessions.previewSessionDraft(draft, id, app.ctx.role);
    sessionId = sessions.applySessionDraft(
      draft,
      id,
      { reviewKey: preview.reviewKey },
      app.ctx.role,
    ).sessionId;
  });
  return sessionId;
}
function changeSession(app, sessionId, kind, data) {
  const id = `draft-session-${++sequence}`;
  app.ctx.commit("Sessione", (draft) => {
    const d = sessions.createSessionDraft(draft, { id, kind, sessionId }, app.ctx.role);
    sessions.saveSessionDraft(
      draft,
      id,
      { data: { ...d.data, selectedInstant: null, ...data }, expectedDraftRevision: 0 },
      app.ctx.role,
    );
    const preview = sessions.previewSessionDraft(draft, id, app.ctx.role);
    sessions.applySessionDraft(draft, id, { reviewKey: preview.reviewKey }, app.ctx.role);
  });
}
function writeEntry(app, { entryId, kind = "world", title, body, access, sections = [] }) {
  const id = `draft-entry-${++sequence}`;
  let result;
  app.ctx.commit(
    "Voce",
    (draft) => {
      const d = content.createCampaignDraft(
        draft,
        { id, kind, campaignId: "lanterns", entryId },
        app.ctx.role,
      );
      content.saveCampaignDraft(
        draft,
        id,
        {
          data: { ...d.data, title, body, sections },
          ...(access && !entryId ? { access } : {}),
          expectedDraftRevision: d.revision,
          ...(entryId ? { baseRevisionId: d.baseRevisionId } : {}),
        },
        app.ctx.role,
      );
      const preview = content.previewCampaignDraft(draft, id, app.ctx.role);
      assert.ok(preview.canApply, JSON.stringify(preview.errors));
      result = content.applyCampaignDraft(
        draft,
        id,
        { reviewKey: preview.reviewKey },
        app.ctx.role,
      );
    },
    access?.mode === "private" ? { local: true, visibility: "private" } : {},
  );
  return result.entryId;
}
const campaignAccess = { mode: "campaign", grants: [] };
const privateAccess = { mode: "private", grants: [] };
const titles = (app) => N.centreModel(app.ctx).items.map((item) => app.ctx.label(item.title));
const find = (app, pattern) =>
  N.centreModel(app.ctx).items.find((item) => pattern.test(app.ctx.label(item.title)));
const surface = () => N.notificationSurfaceLog();

beforeEach(() => {
  N.resetNotificationsMemory();
  N.setNotificationsStorage(memory());
  dom.root = null;
  dom.live = null;
});

test("registers the bell with a badge, device read markers and personal opt-in settings", () => {
  const app = makeApp();
  const service = app.registry.get("service", "requests", app.ctx);
  assert.equal(service.extension, "notifications");
  assert.equal(typeof service.badge, "function");
  assert.equal(service.badge(app.ctx), 0);
  // Read markers are device bookkeeping (like the chat's), not shared game state.
  assert.equal(app.store.state.ext.notifications, undefined);
  assert.ok(!app.registry.slices().some((s) => s.name === "notifications"));
  // Nothing pops up and no reminder arrives without a choice.
  for (const c of N.CATEGORIES)
    assert.equal(app.registry.getSetting(app.ctx, `notifications.cat-${c.id}`), "tray");
  for (const lead of N.REMINDER_LEADS)
    assert.equal(app.registry.getSetting(app.ctx, `notifications.${lead.id}`), false);
  assert.equal(app.registry.getSetting(app.ctx, "notifications.position"), "top-right");
  const requests = app.registry
    .list("settings", app.ctx)
    .find((s) => s.id === "notifications")
    .fields.find((f) => f.id === "cat-requests");
  assert.ok(!requests.options.some((o) => o.value === "off"), "roll requests cannot be muted");
  // The service opens the centre, which keeps pending requests reachable.
  assert.equal(app.registry.run(service, app.ctx), true);
  assert.equal(app.dialogs.at(-1).title, "Notifiche e richieste");
  assert.match(app.dialogs.at(-1).body, /Richieste in attesa/);
  assert.match(app.dialogs.at(-1).body, /Nessuna notifica\./);
});

test("sessions: scheduled, moved and cancelled reach the other members, never the organizer", () => {
  const app = makeApp();
  app.as("dm");
  const id = scheduleSession(app, { title: "Partita di ottobre", localTime: "2026-10-09T21:00" });
  assert.deepEqual(titles(app), [], "the organizer is not notified of their own change");
  app.as("player");
  assert.deepEqual(titles(app), ["Nuova sessione: «Partita di ottobre»"]);
  assert.equal(
    app.ctx.label(find(app, /Nuova sessione/).body),
    "ven 9 ott, 21:00 · nel tuo fuso (Europe/Rome)",
  );
  assert.equal(N.unreadCount(app.ctx), 1);
  app.as("dm");
  changeSession(app, id, "change", { localTime: "2026-10-10T21:30" });
  app.as("player");
  const moved = find(app, /Sessione spostata/);
  assert.ok(moved, titles(app).join());
  assert.match(app.ctx.label(moved.body), /21:00 → .*21:30 · nel tuo fuso/);
  assert.equal(moved.category, "sessions");
  app.as("dm");
  changeSession(app, id, "cancel", { reason: "Rinviata dal gruppo" });
  app.as("player");
  const cancelled = find(app, /Sessione annullata/);
  assert.equal(app.ctx.label(cancelled.body), "Motivo: Rinviata dal gruppo");
  assert.equal(N.unreadCount(app.ctx), 1, "one notice per appointment, its latest revision");
  app.lang("en");
  assert.equal(app.ctx.label(cancelled.title), "Session cancelled: “Partita di ottobre”");
});

test("availability polls ask the other participants, not the organizer", () => {
  const app = makeApp();
  app.as("dm");
  const id = "draft-poll";
  app.ctx.commit("Sondaggio", (draft) => {
    sessions.createSessionDraft(draft, { id, kind: "poll" }, "dm");
    sessions.saveSessionDraft(
      draft,
      id,
      {
        data: {
          title: "Scegliamo la serata",
          participants: ["player", "dm"],
          slots: [
            { id: "a", localTime: "2026-10-16T21:00", timeZone: "Europe/Rome" },
            { id: "b", localTime: "2026-10-17T21:00", timeZone: "Europe/Rome" },
          ],
        },
        expectedDraftRevision: 0,
      },
      "dm",
    );
    const preview = sessions.previewSessionDraft(draft, id, "dm");
    sessions.applySessionDraft(draft, id, { reviewKey: preview.reviewKey }, "dm");
  });
  assert.deepEqual(titles(app), []);
  app.as("player");
  const poll = find(app, /Disponibilità richiesta/);
  assert.equal(app.ctx.label(poll.body), "2 date proposte · attende la tua risposta");
});

test("opt-in reminders: nothing without a choice, the latest due reminder, then it expires", () => {
  const app = makeApp();
  app.as("dm");
  const start = new Date(Date.now() + 20 * HOUR);
  start.setUTCSeconds(0, 0);
  scheduleSession(app, {
    title: "Serata alla torre",
    localTime: start.toISOString().slice(0, 16),
    timeZone: "UTC",
  });
  const at = (now, reminders) =>
    N.deriveCoreNotifications(app.store.state, "player", { now, reminders }).filter(
      (n) => n.category === "reminders",
    );
  assert.equal(at(Date.now(), {}).length, 0, "no reminder without opting in");
  assert.equal(at(Date.now(), { "remind-1h": true }).length, 0, "1 h reminder not due yet");
  const due = at(Date.now(), { "remind-24h": true, "remind-1h": true });
  assert.equal(due.length, 1);
  assert.match(due[0].id, /:remind-24h$/);
  assert.equal(due[0].time, new Date(start.getTime() - 24 * HOUR).toISOString());
  const later = at(start.getTime() - 30 * 60e3, { "remind-24h": true, "remind-1h": true });
  assert.match(later[0].id, /:remind-1h$/, "only the latest due reminder is listed");
  assert.equal(at(start.getTime() + 4 * HOUR, { "remind-24h": true }).length, 0, "expired");
  // Through the person's own preference, in the centre.
  app.as("player");
  app.registry.setSetting(app.ctx, "notifications.remind-24h", true);
  const reminder = find(app, /^Promemoria/);
  assert.equal(reminder.category, "reminders");
  assert.match(app.ctx.label(reminder.body), /^Inizia tra \d+ ore/);
  app.as("dm");
  assert.ok(!find(app, /^Promemoria/), "the DM did not opt in");
});

test("materials, invitations, mentions and updates follow access; Solo io never reaches the DM", () => {
  const app = makeApp();
  app.as("dm");
  const letter = writeEntry(app, {
    title: "Lettera del sindaco",
    body: "Il sigillo è per @Livia, che lo riconoscerà.",
    access: campaignAccess,
  });
  const secret = writeEntry(app, {
    title: "Appunti della torre",
    body: "Nulla di speciale in vista.",
    access: campaignAccess,
    sections: [
      { id: "hidden", title: "Segreto", body: "@Livia tradirà il gruppo", access: privateAccess },
    ],
  });
  assert.deepEqual(titles(app), [], "the author is not notified");
  app.as("player");
  // One notice per material: the mention marks the share, which keeps its category and is
  // also listed under Mentions.
  const letterRows = N.centreModel(app.ctx).items.filter((item) => item.key.includes(letter));
  assert.equal(letterRows.length, 1);
  const shared = find(app, /Nuovo materiale condiviso: «Lettera del sindaco»/);
  assert.equal(shared.category, "handouts");
  assert.deepEqual(shared.categories, ["handouts", "mentions"]);
  assert.match(app.ctx.label(shared.body), /^Menzione di DM: @Livia · .*@Livia, che lo/);
  assert.deepEqual(shared.target, {
    page: "campaign",
    params: { id: letter, tab: "entry" },
  });
  const tower = N.centreModel(app.ctx).items.filter((item) => item.key.includes(secret));
  assert.equal(tower.length, 1, "a hidden section never produces a mention");
  assert.equal(tower[0].category, "handouts");
  assert.doesNotMatch(JSON.stringify(tower), /tradirà/);
  // A personal note mentioning the DM stays with its owner.
  const note = writeEntry(app, {
    kind: "note",
    title: "Sospetti",
    body: "Chiedere al @DM della lanterna.",
    access: privateAccess,
  });
  app.as("dm");
  assert.deepEqual(titles(app), [], "Solo io notes never notify the DM");
  // Sharing it with the DM personally is an invitation, and a mention.
  app.as("player");
  app.ctx.commit("Condivisione", (draft) =>
    content.setCampaignEntryAccess(
      draft,
      note,
      {
        access: {
          mode: "selected",
          grants: [{ id: "dm", read: true, edit: false, invite: false }],
        },
        expectedAccessRevision: 0,
      },
      "player",
    ),
  );
  app.as("dm");
  const invite = find(app, /Invito a leggere: «Sospetti»/);
  assert.equal(invite.category, "invites", "the invitation stays an invitation");
  assert.deepEqual(invite.categories, ["invites", "mentions"], "and carries the mention");
  assert.match(app.ctx.label(invite.body), /^Menzione di Giocatore: @DM/);
  assert.equal(N.unreadCount(app.ctx), 1, "one notice, not invitation + mention");
  // A later revision by the DM of material the player could already read is an update.
  writeEntry(app, { entryId: letter, title: "Lettera del sindaco", body: "Il sigillo è rotto." });
  app.as("player");
  const update = find(app, /Aggiornato: «Lettera del sindaco»/);
  assert.ok(update, titles(app).join(" | "));
  assert.equal(update.category, "handouts", "no new mention in this version");
  assert.equal(app.ctx.label(update.body), "DM · Mondo · Il sigillo è rotto.");
});

test("a DM's damage on a concentrating character asks its owner for the roll; resolving removes it", () => {
  const app = makeApp();
  app.ctx.commit("Concentrazione", (draft) => {
    draft.actors.livia.concentration = {
      id: "conc-test",
      name: "Benedizione",
      active: true,
      source: { kind: "manual", label: "prova", revision: "r1" },
    };
  });
  app.as("dm");
  app.ctx.commit("Danni", (draft) => {
    const result = applyVitalityEvent(draft, {
      eventId: "hit-1",
      kind: "damage",
      actorId: "livia",
      amount: 4,
      source: { kind: "authored", edition: "2024", revision: "notifications-test-1" },
    });
    applyConditionFollowUps(draft, result, { manual: true });
  });
  assert.equal(
    N.centreModel(app.ctx).items.filter((i) => i.category === "requests").length,
    0,
    "the DM is not asked to roll for the player's character",
  );
  app.as("player");
  const request = find(app, /Tiro richiesto: Livia/);
  assert.equal(app.ctx.label(request.body), "Concentrazione · CD 10 · Danno registrato");
  assert.equal(request.target.kind, "requests");
  assert.ok(request.time, "arrival time recorded for a request without a data timestamp");
  // Opening it at the Table opens the existing roll dialog and marks it read.
  app.ctx.view = { page: "table", id: "", tab: "" };
  assert.equal(N.openNotification(app.ctx, request.key), true);
  assert.equal(app.dialogs.at(-1).title, "Tiri e risultati");
  assert.match(app.dialogs.at(-1).body, /data-request-open/);
  assert.ok(N.centreModel(app.ctx).items.find((item) => item.key === request.key).read);
  const attempt = app.store.state.combatAttempts.find((a) => a.id === "damage-record:hit-1");
  app.ctx.commit("Tiro", (draft) =>
    resolveRoll(draft, attempt.id, attempt.requests[0].id, [15], "player"),
  );
  assert.ok(!find(app, /Tiro richiesto/), "a resolved request leaves the list");
  // The same damage recorded by the owner is their own request: no notification.
  app.ctx.commit("Concentrazione", (draft) => {
    draft.actors.livia.concentration = {
      id: "conc-test-2",
      name: "Benedizione",
      active: true,
      source: { kind: "manual", label: "prova", revision: "r2" },
    };
  });
  app.ctx.commit("Danni", (draft) => {
    const result = applyVitalityEvent(draft, {
      eventId: "hit-2",
      kind: "damage",
      actorId: "livia",
      amount: 1,
      source: { kind: "authored", edition: "2024", revision: "notifications-test-1" },
    });
    applyConditionFollowUps(draft, result, { manual: true });
  });
  assert.ok(!find(app, /Tiro richiesto/), "self-caused request is not a notification");
  assert.ok(N.renderCentre(app.ctx).includes("1 richiesta attende una risposta al Tavolo"));
});

test("party activity: a character advanced by someone else, only when visible", () => {
  const app = makeApp();
  app.as("dm");
  app.ctx.commit("Avanzamento", (draft) => {
    draft.actors.doran.level = 4;
    draft.actors.doran.characterBuild = { revision: "op-doran" };
    (draft.characterBuildOperations ||= []).push({
      actorId: "doran",
      draftId: "d1",
      operationId: "op-doran",
      kind: "advance",
      owner: "dm",
      appliedAt: new Date().toISOString(),
    });
  });
  app.as("player");
  const party = find(app, /Avanzamento di livello: Doran/);
  assert.equal(party.category, "party");
  assert.equal(app.ctx.label(party.body), "DM · ora al livello 4");
  assert.equal(N.openNotification(app.ctx, party.key), true);
  assert.deepEqual(app.navigations.at(-1), {
    page: "characters",
    params: { id: "doran", tab: "actions" },
  });
  // A private sheet's advancement stays private.
  app.as("dm");
  app.ctx.commit("Privato", (draft) => {
    draft.actors.doran.visibility = "private";
    draft.characterBuildOperations.push({
      actorId: "doran",
      draftId: "d2",
      operationId: "op-doran-2",
      kind: "advance",
      owner: "dm",
      appliedAt: new Date().toISOString(),
    });
  });
  app.as("player");
  assert.ok(!find(app, /Doran/), "a private character is invisible, and so is its activity");
});

test("read state: open marks read, toggle corrects, mark all has Undo, badge follows", async () => {
  const storage = memory();
  N.setNotificationsStorage(storage);
  const app = makeApp({ storage });
  app.as("dm");
  scheduleSession(app, { title: "Uno", localTime: "2026-10-09T21:00" });
  scheduleSession(app, { title: "Due", localTime: "2026-10-12T21:00" });
  app.as("player");
  const logLength = app.store.state.log.length;
  assert.equal(N.unreadCount(app.ctx), 2);
  app.registry.run(app.registry.get("service", "requests", app.ctx), app.ctx);
  let root = dom.root;
  const live = dom.live;
  assert.equal(root.querySelectorAll("[data-notifications-open]").length, 2);
  // Toggle one as read, then correct it back to unread.
  const key = root.querySelectorAll("[data-notifications-toggle]")[0].dataset.notificationsToggle;
  root.querySelectorAll("[data-notifications-toggle]")[0].click();
  assert.equal(N.unreadCount(app.ctx), 1);
  await pause();
  assert.equal(dom.live, live, "the live region is not redrawn with the list");
  assert.equal(live.textContent, "Segnata come letta.");
  assert.equal(dom.focused?.dataset.notificationsToggle, key, "focus stays on the same row");
  root.querySelector(`[data-notifications-toggle="${key}"]`).click();
  assert.equal(N.unreadCount(app.ctx), 2);
  // Mark all, then Undo restores exactly the previous state.
  root.querySelector("[data-notifications-read-all]").click();
  assert.equal(N.unreadCount(app.ctx), 0);
  assert.match(root.innerHTML, /2 notifiche segnate come lette\./);
  assert.ok(root.querySelector("[data-notifications-read-all]").disabled);
  assert.equal(dom.focused, root.querySelector("[data-notifications-undo]"));
  root.querySelector("[data-notifications-undo]").click();
  assert.equal(N.unreadCount(app.ctx), 2);
  await pause();
  assert.equal(live.textContent, "Letture ripristinate.");
  // Filters.
  root.querySelector('[data-notifications-filter="sessions"]').click();
  assert.match(
    root.querySelector('[data-notifications-filter="sessions"]').attrs["aria-pressed"],
    /true/,
  );
  // Opening a session goes to the sessions page and reads it.
  root.querySelectorAll("[data-notifications-open]")[0].click();
  assert.deepEqual(app.navigations.at(-1), { page: "campaign", params: { tab: "sessions" } });
  assert.equal(N.unreadCount(app.ctx), 1);
  // Reading is personal bookkeeping: no line in the shared game log; the DM's reading is
  // untouched; gameplay Undo keeps it; reload keeps it.
  assert.equal(app.store.state.log.length, logLength);
  app.as("dm");
  assert.equal(N.unreadCount(app.ctx), 0, "the DM organized both: nothing for the DM");
  app.as("player");
  app.ctx.commit("Gioco", (draft) => (draft.actors.livia.hp -= 1));
  app.ctx.undo();
  assert.equal(N.unreadCount(app.ctx), 1, "gameplay Undo does not touch reading");
  N.resetNotificationsMemory();
  N.setNotificationsStorage(storage);
  const reloaded = makeApp({ storage });
  reloaded.as("player");
  assert.equal(N.unreadCount(reloaded.ctx), 1);
  assert.deepEqual(Object.keys(JSON.parse(storage.getItem("d20-studio-notifications:read:v1"))), [
    "player",
    "dm",
  ]);
});

test("categories: off hides and uncounts, requests stay; preferences validate before saving", async () => {
  const app = makeApp();
  app.as("dm");
  scheduleSession(app, { title: "Tre", localTime: "2026-10-09T21:00" });
  app.as("player");
  N.openNotificationPreferences(app.ctx);
  const prefs = app.dialogs.at(-1);
  assert.equal(prefs.title, "Preferenze notifiche");
  assert.match(prefs.body, /name="cat-requests"/);
  assert.doesNotMatch(
    prefs.body.match(/name="cat-requests">([\s\S]*?)<\/select>/)[1],
    /value="off"/,
  );
  const values = {
    ...Object.fromEntries(N.CATEGORIES.map((c) => [`cat-${c.id}`, "tray"])),
    "cat-sessions": "off",
    position: "bottom-left",
    duration: "40",
  };
  assert.throws(
    () => prefs.options.onSubmit(form(values)),
    (error) => error.en === "The duration must be a whole number from 3 to 30 seconds.",
  );
  assert.equal(app.registry.getSetting(app.ctx, "notifications.cat-sessions"), "tray");
  assert.throws(
    () => prefs.options.onSubmit(form({ ...values, duration: "8", "cat-requests": "off" })),
    (error) => /Richieste di tiro/.test(error.it),
  );
  prefs.options.onSubmit(form({ ...values, duration: "8", "remind-1h": "on" }));
  assert.equal(app.registry.getSetting(app.ctx, "notifications.cat-sessions"), "off");
  assert.equal(app.registry.getSetting(app.ctx, "notifications.position"), "bottom-left");
  assert.equal(app.registry.getSetting(app.ctx, "notifications.duration"), 8);
  assert.equal(app.registry.getSetting(app.ctx, "notifications.remind-1h"), true);
  assert.equal(N.unreadCount(app.ctx), 0, "a category turned off is neither listed nor counted");
  assert.equal(app.dialogs.at(-1).title, "Notifiche e richieste", "saving returns to the centre");
  // The region was just inserted: it is filled after a pause, so it is announced.
  assert.equal(dom.live.textContent, "");
  await pause();
  assert.equal(dom.live.textContent, "Preferenze delle notifiche salvate.");
  app.as("dm");
  assert.equal(
    app.registry.getSetting(app.ctx, "notifications.cat-sessions"),
    "tray",
    "preferences are personal",
  );
});

test("pop-ups and aria-live announcements only for chosen categories, in IT and EN", () => {
  const app = makeApp();
  app.as("dm");
  const id = scheduleSession(app, { title: "Quattro", localTime: "2026-10-09T21:00" });
  app.as("player");
  assert.ok(!surface().some((entry) => entry.kind === "toast"), "nothing pops up without a choice");
  assert.equal(N.unreadCount(app.ctx), 1, "the centre still lists it");
  app.registry.setSetting(app.ctx, "notifications.cat-sessions", "toast");
  app.as("dm");
  changeSession(app, id, "change", { localTime: "2026-10-11T21:00" });
  app.as("player");
  const toast = surface().filter((entry) => entry.kind === "toast");
  assert.equal(toast.length, 1);
  assert.equal(toast[0].role, "player");
  assert.equal(
    surface()
      .filter((entry) => entry.kind === "announce")
      .at(-1).message,
    "Nuova notifica. Sessioni: Sessione spostata: «Quattro».",
  );
  app.lang("en");
  app.as("dm");
  changeSession(app, id, "cancel", { reason: "Storm" });
  app.as("player");
  assert.equal(
    surface()
      .filter((entry) => entry.kind === "announce")
      .at(-1).message,
    "New notification. Sessions: Session cancelled: “Quattro”.",
  );
  // Switching identity clears the previous identity's pop-ups first.
  const log = surface();
  const clearIndex = log.findLastIndex((entry) => entry.kind === "clear");
  assert.ok(clearIndex < log.findLastIndex((entry) => entry.kind === "toast"));
});

test("offline: shared notices on hold are declared; reading still works locally", () => {
  const app = makeApp();
  app.as("dm");
  scheduleSession(app, { title: "Cinque", localTime: "2026-10-09T21:00" });
  app.as("player");
  app.offline(true);
  const html = N.renderCentre(app.ctx);
  assert.match(html, /Senza rete/);
  assert.match(html, /Le notifiche condivise sono in attesa/);
  assert.match(html, /Letture, preferenze e promemoria restano su questo dispositivo/);
  const item = N.centreModel(app.ctx).items[0];
  N.setNotificationRead(app.ctx, item.key, true);
  assert.equal(N.unreadCount(app.ctx), 0, "a personal read marker is saved offline");
  assert.throws(() => scheduleSession(app, { title: "No", localTime: "2026-10-09T21:00" }));
  app.lang("en");
  assert.match(N.renderCentre(app.ctx), /Shared notifications are on hold/);
  app.offline(false);
  assert.equal(
    surface()
      .filter((entry) => entry.kind === "announce")
      .at(-1).message,
    "Back online: shared notifications are up to date.",
  );
  assert.doesNotMatch(N.renderCentre(app.ctx), /on hold/);
});

test("other areas' notices join the centre with categories, read state and the badge", () => {
  const chat = (registry) =>
    registry.add("notifications", {
      id: "chat",
      label: { it: "Chat", en: "Chat" },
      collect: (ctx) =>
        ctx.role === "player"
          ? [
              {
                id: "m1",
                title: { it: "Il DM ti ha scritto", en: "The DM wrote to you" },
                category: "mention",
                time: "2026-09-24T10:00:00.000Z",
                target: { page: "table" },
              },
              { id: "m2", title: "Senza categoria", time: "2026-09-24T09:00:00.000Z" },
            ]
          : [],
    });
  const app = makeApp({ areas: [["chat", chat]] });
  const items = N.centreModel(app.ctx).items;
  assert.deepEqual(
    items.map((i) => [i.key, i.category]),
    [
      ["chat:m1", "mentions"],
      ["chat:m2", "other"],
    ],
  );
  assert.equal(N.unreadCount(app.ctx), 2);
  N.openNotification(app.ctx, "chat:m1");
  assert.deepEqual(app.navigations.at(-1), { page: "table", params: {} });
  assert.equal(N.unreadCount(app.ctx), 1);
  assert.equal(
    app.registry.get("service", "requests", app.ctx).badge(app.ctx),
    1,
    "the header badge counts another area's unread notices too",
  );
  assert.match(N.renderCentre(app.ctx), /Chat/);
  app.as("dm");
  assert.equal(N.unreadCount(app.ctx), 0);
  // A notice that disappeared cannot be opened: the person is told why.
  app.as("player");
  assert.equal(N.openNotification(app.ctx, "chat:gone"), false);
  assert.match(app.toasts.at(-1).text, /non è più disponibile/);
});

test("areas that collect without a category get one from their contribution", () => {
  const area = (id, contribution, entry) => [
    id,
    (registry) =>
      registry.add("notifications", {
        id: contribution,
        label: { it: id, en: id },
        collect: () => [entry],
      }),
  ];
  const app = makeApp({
    areas: [
      area("campaign-members", "campaign-members-inbox", { id: "i1", title: "Invito · Il faro" }),
      area("chat", "chat-unread", { id: "c1", title: "Tiro", category: "table-log" }),
      area("loot", "loot-available", { id: "l1", title: "Bottino da dividere" }),
      area("safety", "safety-alerts", { id: "s1", title: "Pausa", category: "safety" }),
    ],
  });
  const categories = Object.fromEntries(
    N.centreModel(app.ctx).items.map((item) => [item.key, item.category]),
  );
  assert.deepEqual(categories, {
    "campaign-members-inbox:i1": "invites",
    "chat-unread:c1": "chat",
    "loot-available:l1": "party",
    "safety-alerts:s1": "safety",
  });
  // Each of them can be muted or made a pop-up like the core categories.
  app.registry.setSetting(app.ctx, "notifications.cat-chat", "off");
  assert.equal(N.unreadCount(app.ctx), 3);
});

test("the pending-requests button opens the core roll dialog from anywhere", () => {
  const app = makeApp();
  N.openCentre(app.ctx);
  dom.root.querySelector("[data-notifications-requests]").click();
  assert.deepEqual(app.navigations.at(-1), { page: "table", params: {} });
  return new Promise((resolve) =>
    queueMicrotask(() => {
      assert.equal(app.dialogs.at(-1).title, "Tiri e risultati");
      resolve();
    }),
  );
});

test("device read markers: only valid ones load; unreadable storage means nothing read", () => {
  const storage = memory();
  N.setNotificationsStorage(storage);
  const app = makeApp({ storage });
  app.as("dm");
  scheduleSession(app, { title: "Sette", localTime: "2026-10-09T21:00" });
  app.as("player");
  const [item] = N.centreModel(app.ctx).items;
  storage.setItem(
    "d20-studio-notifications:read:v1",
    JSON.stringify({ player: { [item.key]: "2026-09-24T10:00:00.000Z", b: 3 }, dm: "x" }),
  );
  N.setNotificationsStorage(storage);
  assert.equal(N.unreadCount(app.ctx), 0, "the valid marker is kept");
  storage.setItem("d20-studio-notifications:read:v1", "{not json");
  N.setNotificationsStorage(storage);
  assert.equal(N.unreadCount(app.ctx), 1);
  N.setNotificationsStorage({
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("blocked");
    },
  });
  N.setNotificationRead(app.ctx, item.key, true);
  assert.equal(N.unreadCount(app.ctx), 0, "storage off: kept in memory for this visit");
  assert.equal(N.relativeTime("it", new Date(Date.now() - 5 * 60e3).toISOString()), "5 minuti fa");
  assert.equal(N.relativeTime("en", new Date(Date.now() + 2 * HOUR).toISOString()), "in 2 hours");
});

// ---------------------------------------------------------------------------------------
// Review fixes (B24 review): reproductions first.
import * as accountArea from "../account.mjs";

test("review P1: another area's notice for the person who caused it is shown and counted", () => {
  const app = makeApp({ areas: [["account", accountArea.register]] });
  assert.equal(N.unreadCount(app.ctx), 0);
  app.ctx.commit("Eliminazione", (draft) =>
    accountArea.requestDeletion(draft, "player", {
      typed: "ELIMINA ACCOUNT",
      acknowledged: true,
      confirmWith: "email",
    }),
  );
  assert.deepEqual(
    app.registry.notifications(app.ctx).map((entry) => entry.id),
    ["account-deletion-player"],
  );
  const item = N.centreModel(app.ctx).items.find((entry) => entry.source === "account-deletion");
  assert.ok(item, "the requester's own deletion notice is listed");
  assert.equal(N.unreadCount(app.ctx), 1);
});

test("review P2: reading notifications writes nothing to the shared game log", () => {
  const app = makeApp();
  app.as("dm");
  scheduleSession(app, { title: "Sei", localTime: "2026-10-09T21:00" });
  app.as("player");
  const before = app.store.state.log.length;
  const item = N.centreModel(app.ctx).items[0];
  N.setNotificationRead(app.ctx, item.key, true);
  N.setNotificationRead(app.ctx, item.key, false);
  N.markAllNotificationsRead(app.ctx);
  N.undoMarkAllRead(app.ctx);
  N.openNotification(app.ctx, item.key);
  assert.equal(app.store.state.log.length, before, "no audit line for personal reading");
  assert.equal(N.unreadCount(app.ctx), 0);
});

test("review P2: a DM edit of a hidden section only does not tell the player", () => {
  const app = makeApp();
  app.as("dm");
  const tower = writeEntry(app, {
    title: "Torre",
    body: "Testo pubblico.",
    access: campaignAccess,
    sections: [{ id: "dm-only", title: "Segreto", body: "v1", access: privateAccess }],
  });
  app.as("player");
  N.markAllNotificationsRead(app.ctx);
  assert.equal(N.unreadCount(app.ctx), 0);
  app.as("dm");
  writeEntry(app, {
    entryId: tower,
    title: "Torre",
    body: "Testo pubblico.",
    sections: [
      { id: "dm-only", title: "Segreto", body: "v2 changed secret", access: privateAccess },
    ],
  });
  app.as("player");
  assert.deepEqual(
    N.centreModel(app.ctx)
      .items.filter((item) => !item.read)
      .map((i) => app.ctx.label(i.title)),
    [],
    "nothing the player can read changed",
  );
  app.as("dm");
  writeEntry(app, {
    entryId: tower,
    title: "Torre",
    body: "Testo pubblico, corretto.",
    sections: [
      { id: "dm-only", title: "Segreto", body: "v2 changed secret", access: privateAccess },
    ],
  });
  app.as("player");
  const update = find(app, /Aggiornato: «Torre»/);
  assert.ok(update && !update.read, "a readable change is an update");
  assert.doesNotMatch(JSON.stringify(update), /secret/);
});

test("review P3: one mention of the reader in new material is one notice, not two", () => {
  const app = makeApp();
  app.as("dm");
  writeEntry(app, { title: "Lettera", body: "Per @Livia", access: campaignAccess });
  app.as("player");
  const rows = N.centreModel(app.ctx).items.filter((item) =>
    /Lettera/.test(app.ctx.label(item.title)),
  );
  assert.equal(rows.length, 1, rows.map((r) => app.ctx.label(r.title)).join(" | "));
  assert.deepEqual(rows[0].categories, ["handouts", "mentions"]);
  assert.equal(N.unreadCount(app.ctx), 1);
});

test("review P3: session notices show the viewer's time first, then the agreed time", () => {
  const zone = process.env.TZ;
  process.env.TZ = "Europe/London";
  try {
    const app = makeApp();
    app.as("dm");
    const id = scheduleSession(app, { title: "Serata di prova", localTime: "2026-10-20T21:00" });
    changeSession(app, id, "change", { localTime: "2026-10-22T20:30" });
    app.as("player");
    const moved = app.ctx.label(find(app, /Sessione spostata/).body);
    assert.match(moved, /20 ott, 20:00 → gio 22 ott, 19:30 · nel tuo fuso \(Europe\/London\)/);
    assert.match(moved, /ora concordata gio 22 ott, 20:30 \(Europe\/Rome\)$/);
  } finally {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  }
});

test("review P1: an explicit author still hides one's own notice; other areas are never attributed", () => {
  const storage = memory();
  N.setNotificationsStorage(storage);
  let flag = false;
  const area = (registry) =>
    registry.add("notifications", {
      id: "echo",
      label: { it: "Eco", en: "Echo" },
      collect: (ctx) =>
        flag
          ? [
              { id: "mine", title: "Mia azione", by: ctx.role },
              { id: "for-me", title: "Per me" },
            ]
          : [],
    });
  const app = makeApp({ storage, areas: [["echo", area]] });
  app.ctx.commit("Attiva", (draft) => {
    flag = true;
    draft.actors.livia.notes = "attiva";
  });
  assert.deepEqual(
    N.centreModel(app.ctx).items.map((item) => item.key),
    ["echo:for-me"],
    "a declared own action stays hidden; an undeclared one is shown",
  );
  const arrivals = JSON.parse(storage.getItem("d20-studio-notifications:arrivals:v1"));
  assert.equal(arrivals["echo:for-me"].by, null, "the device cache names nobody for it");
  assert.equal(arrivals["echo:mine"].by, "player", "the declared value is kept");
});

test("review P3: a new mention in an update is that update's one notice", () => {
  const app = makeApp();
  app.as("dm");
  const letter = writeEntry(app, { title: "Diario", body: "Pagina uno.", access: campaignAccess });
  app.as("player");
  N.markAllNotificationsRead(app.ctx);
  app.as("dm");
  writeEntry(app, { entryId: letter, title: "Diario", body: "Pagina due, per @Livia." });
  app.as("player");
  const unread = N.centreModel(app.ctx).items.filter((item) => !item.read);
  assert.equal(unread.length, 1);
  assert.equal(app.ctx.label(unread[0].title), "Aggiornato: «Diario»");
  assert.deepEqual(unread[0].categories, ["handouts", "mentions"]);
  assert.deepEqual(
    find(app, /Nuovo materiale condiviso: «Diario»/).categories,
    ["handouts"],
    "the share is not marked: the update introduced the mention",
  );
});

test("review P3: a language change redraws visible pop-ups instead of removing them", () => {
  const app = makeApp();
  app.as("player");
  app.registry.setSetting(app.ctx, "notifications.cat-sessions", "toast");
  app.as("dm");
  scheduleSession(app, { title: "Otto", localTime: "2026-10-09T21:00" });
  app.as("player");
  const shown = surface().filter((entry) => entry.kind === "toast");
  assert.equal(shown.at(-1).lang, "it");
  app.lang("en");
  const log = surface();
  const last = log.at(-1);
  assert.deepEqual(
    [log.at(-2).kind, last.kind, last.key, last.lang],
    ["clear", "toast", shown.at(-1).key, "en"],
  );
});

test("review P3: a reminder falling due on the clock redraws the header badge", () => {
  const app = makeApp();
  const renders = [];
  app.ctx.render = () => renders.push(N.unreadCount(app.ctx));
  app.as("dm");
  const start = new Date(Date.now() + 61 * 60e3);
  start.setUTCSeconds(0, 0);
  scheduleSession(app, {
    title: "Nove",
    localTime: start.toISOString().slice(0, 16),
    timeZone: "UTC",
  });
  app.as("player");
  app.registry.setSetting(app.ctx, "notifications.remind-1h", true);
  N.markAllNotificationsRead(app.ctx);
  renders.length = 0;
  assert.equal(N.checkDueNotifications(app.ctx), false, "nothing due yet: no redraw");
  const realNow = Date.now;
  Date.now = () => realNow() + 2 * 60e3;
  try {
    assert.equal(N.checkDueNotifications(app.ctx), true);
  } finally {
    Date.now = realNow;
  }
  assert.deepEqual(renders, [1], "the badge was redrawn with the reminder counted");
});

test("review P3: the palette's mark-all command opens the centre on its Undo", async () => {
  const app = makeApp();
  app.as("dm");
  scheduleSession(app, { title: "Dieci", localTime: "2026-10-09T21:00" });
  app.as("player");
  const command = app.registry.get("command", "notifications.read-all", app.ctx);
  app.registry.run(command, app.ctx);
  assert.equal(N.unreadCount(app.ctx), 0);
  assert.equal(app.dialogs.at(-1).title, "Notifiche e richieste");
  assert.equal(dom.focused, dom.root.querySelector("[data-notifications-undo]"));
  await pause();
  assert.equal(dom.live.textContent, "1 notifica segnata come letta. Puoi annullare.");
  assert.match(dom.root.innerHTML, /1 notifica segnata come letta\./);
  dom.root.querySelector("[data-notifications-undo]").click();
  assert.equal(N.unreadCount(app.ctx), 1);
  app.registry.run(command, app.ctx);
  app.registry.run(command, app.ctx);
  assert.equal(app.toasts.at(-1).text, "Nessuna notifica da leggere.");
});

// ---------------------------------------------------------------------------------------
// Second review (B24 review 2): each finding's reproduction, then the corrected behaviour.
import * as lootArea from "../loot.mjs";
import * as stash from "../party-stash.mjs";
import { advanceTurn } from "../combat.mjs";

const setCategories = (app, values) => {
  for (const [id, value] of Object.entries(values))
    app.registry.setSetting(app.ctx, `notifications.cat-${id}`, value);
};
function inviteToNote(app, { title, body, to = "player" }) {
  const note = writeEntry(app, { kind: "note", title, body, access: privateAccess });
  app.ctx.commit("Condivisione", (draft) =>
    content.setCampaignEntryAccess(
      draft,
      note,
      {
        access: { mode: "selected", grants: [{ id: to, read: true, edit: false, invite: false }] },
        expectedAccessRevision: 0,
      },
      app.ctx.role,
    ),
  );
  return note;
}

test("review 2 P2: a mention never hides an invitation when Mentions is off", () => {
  const app = makeApp();
  setCategories(app, { mentions: "off" });
  app.as("dm");
  inviteToNote(app, { title: "Mappa del faro", body: "Appunti per @tutti prima della partita." });
  app.as("player");
  // Reproduction: the invitation used to be filed under Mentions only, and vanished.
  const invite = find(app, /Invito a leggere: «Mappa del faro»/);
  assert.ok(invite, "the invitation is listed while Invitations is on");
  assert.equal(invite.category, "invites");
  assert.equal(invite.mention, true);
  assert.deepEqual(invite.categories, ["invites"], "Mentions off: listed under Invitations");
  assert.equal(N.unreadCount(app.ctx), 1);
  // Mentions on, Invitations off: still listed, now under Mentions only.
  setCategories(app, { mentions: "tray", invites: "off" });
  assert.deepEqual(find(app, /Mappa del faro/).categories, ["mentions"]);
  N.openCentre(app.ctx);
  dom.root.querySelector('[data-notifications-filter="mentions"]').click();
  assert.equal(dom.root.querySelectorAll("[data-notifications-open]").length, 1);
  assert.match(dom.root.innerHTML, /Menzioni<\/span>/);
  // Both off: hidden and not counted.
  setCategories(app, { mentions: "off" });
  assert.equal(find(app, /Mappa del faro/), undefined);
  assert.equal(N.unreadCount(app.ctx), 0);
  // Pop-up when either category asks for it: Invitations in the centre, Mentions pop-up.
  setCategories(app, { invites: "tray", mentions: "toast" });
  app.as("dm");
  inviteToNote(app, { title: "Seconda mappa", body: "Per @Livia." });
  app.as("player");
  const toast = surface().filter((entry) => entry.kind === "toast");
  assert.equal(toast.length, 1, "the mention's pop-up choice is honoured");
  assert.match(toast[0].key, /share:/);
  const row = N.centreModel(app.ctx).items.find((item) => item.key === toast[0].key);
  assert.deepEqual(row.categories, ["invites", "mentions"]);
  const html = N.renderCentre(app.ctx);
  assert.match(html, /Inviti · Menzioni/, "the row names both of its categories");
  assert.match(html, /data-mention/);
});

test("review 2 P2: party rewards and trades from the loot ledger reach the other members", () => {
  const app = makeApp({ areas: [["loot", lootArea.register]] });
  const slice = (draft) => draft.ext.loot;
  app.as("dm");
  const recipients = stash.partyMembers(app.store.state).map((actor) => actor.id);
  assert.deepEqual(recipients, ["livia", "doran", "mira"]);
  app.ctx.commit("Assegna", (draft) =>
    lootArea.awardParty(draft, slice(draft), "dm", {
      xp: 300,
      mode: "split",
      recipients,
      reason: "Hanno salvato il faro",
    }),
  );
  assert.equal(N.unreadCount(app.ctx), 0, "the DM is not told of their own award");
  app.as("player");
  // Reproduction: nothing read the ledger, so the player's bell did not change.
  const award = find(app, /^Ricompensa: Livia, Doran, Mira$/);
  assert.ok(award, titles(app).join(" | "));
  assert.equal(award.category, "party");
  assert.equal(
    app.ctx.label(award.body),
    "Assegnazione divisa: 100 PE a testa a Livia, Doran, Mira · Motivo: Hanno salvato il faro",
  );
  assert.deepEqual(award.target, { kind: "sheet", actorId: "livia", tab: "features" });
  N.openNotification(app.ctx, award.key);
  assert.deepEqual(app.navigations.at(-1), {
    page: "characters",
    params: { id: "livia", tab: "features" },
  });
  app.lang("en");
  assert.equal(app.ctx.label(award.title), "Reward: Livia, Doran, Mira");
  app.lang("it");
  // An item from a parcel to Doran: the inventory of Doran's sheet.
  app.as("dm");
  app.ctx.commit("Pacchetto", (draft) => {
    const parcel = lootArea.createParcel(draft, slice(draft), "dm", { name: "Forziere" });
    const item = stash.customItem({ name: "Pozione di guarigione", quantity: 2 });
    lootArea.addParcelItem(draft, slice(draft), "dm", parcel.id, item);
    lootArea.assignParcelItem(draft, slice(draft), "dm", parcel.id, item.id, "doran", 1);
  });
  assert.equal(app.store.state.actors.doran.inventory.at(-1).quantity, 1);
  app.as("player");
  const given = find(app, /^Bottino ricevuto: Doran$/);
  assert.match(app.ctx.label(given.body), /Pozione di guarigione ×1 → Doran/);
  assert.deepEqual(given.target, { kind: "sheet", actorId: "doran", tab: "inventory" });
  // The player's own action is the DM's news, never the player's.
  const row = app.store.state.actors.livia.inventory.find(
    (entry) => entry.quantity > 0 && !entry.equipped,
  );
  app.ctx.commit("Deposita", (draft) =>
    stash.depositItem(draft, slice(draft), "player", "livia", row.id, 1),
  );
  assert.equal(find(app, /Messo nella scorta/), undefined);
  app.as("dm");
  assert.ok(find(app, /^Messo nella scorta del gruppo: Livia$/));
  // A character the reader cannot see: the whole entry stays hidden.
  app.ctx.commit("Privato", (draft) => (draft.actors.doran.visibility = "private"));
  app.as("player");
  assert.equal(find(app, /Doran/), undefined);
  // Undo of the award removes its notice with it.
  app.as("dm");
  app.ctx.commit("Pubblico", (draft) => (draft.actors.doran.visibility = "shared"));
  app.ctx.commit("Assegna", (draft) =>
    lootArea.awardParty(draft, slice(draft), "dm", { xp: 30, mode: "each", recipients }),
  );
  app.as("player");
  const count = N.centreModel(app.ctx).items.filter((i) =>
    /Ricompensa/.test(app.ctx.label(i.title)),
  ).length;
  assert.equal(count, 2);
  app.as("dm");
  app.ctx.undo();
  app.as("player");
  assert.equal(
    N.centreModel(app.ctx).items.filter((i) => /Ricompensa/.test(app.ctx.label(i.title))).length,
    count - 1,
  );
});

test("review 2 P3: pop-up announcement grammar and the newest pop-up nearest the edge", () => {
  const app = makeApp();
  setCategories(app, { handouts: "toast" });
  app.as("dm");
  for (const n of [1, 2, 3, 4])
    writeEntry(app, { title: `Voce ${n}`, body: `Testo ${n}`, access: campaignAccess });
  app.as("player");
  const announce = () =>
    surface()
      .filter((entry) => entry.kind === "announce")
      .at(-1).message;
  assert.match(
    announce(),
    /^4 nuove notifiche\. (Materiali condivisi: [^.]+»\. ){3}E un’altra nel centro notifiche\.$/,
  );
  // Placed oldest first: the last pop-up placed is the newest notice.
  const toasts = surface().filter((entry) => entry.kind === "toast");
  assert.equal(toasts.length, 3);
  assert.equal(toasts.at(-1).key, N.centreModel(app.ctx).items[0].key);
  app.lang("en");
  app.as("dm");
  for (const n of [5, 6, 7, 8, 9])
    writeEntry(app, { title: `Voce ${n}`, body: `Testo ${n}`, access: campaignAccess });
  app.as("player");
  assert.match(announce(), /”\. And 2 more in the notification centre\.$/);
});

test("review 2 P3: a fractional duration from the shell Preferences reads as whole seconds", () => {
  const app = makeApp();
  app.registry.setSetting(app.ctx, "notifications.duration", 4.5);
  assert.equal(N.notificationPreferences(app.ctx).duration, 5);
  N.openNotificationPreferences(app.ctx);
  const prefs = app.dialogs.at(-1);
  assert.match(
    prefs.body,
    /name="duration" min="3" max="30" step="1" inputmode="numeric" value="5"/,
  );
  // The centre's form now saves a category change without tripping over the duration.
  const values = {
    ...Object.fromEntries(N.CATEGORIES.map((c) => [`cat-${c.id}`, "tray"])),
    "cat-party": "toast",
    position: "top-right",
    duration: "5",
  };
  prefs.options.onSubmit(form(values));
  assert.equal(app.registry.getSetting(app.ctx, "notifications.cat-party"), "toast");
});

test("review 2 P3: a personal mention is cited before a group mention", () => {
  const app = makeApp();
  app.as("dm");
  inviteToNote(app, { title: "Consegna", body: "Per @Livia e per @tutti: la chiave." });
  app.as("player");
  assert.match(app.ctx.label(find(app, /Consegna/).body), /^Menzione di DM: @Livia · /);
});

test("review 2 P3: a DM-owned creature assigned to a player asks that player to roll", () => {
  const app = makeApp();
  app.as("dm");
  app.ctx.commit("Assegna", (draft) => {
    draft.actors["goblin-1"].controllers = ["player"];
    draft.actors["goblin-1"].concentration = {
      id: "conc-g",
      name: "Benedizione",
      active: true,
      source: { kind: "manual", label: "prova", revision: "r1" },
    };
  });
  app.ctx.commit("Danni", (draft) => {
    const result = applyVitalityEvent(draft, {
      eventId: "hit-g",
      kind: "damage",
      actorId: "goblin-1",
      amount: 2,
      source: { kind: "authored", edition: "2024", revision: "notifications-test-2" },
    });
    applyConditionFollowUps(draft, result, { manual: true });
  });
  app.as("player");
  const request = find(app, /Tiro richiesto: Sentinella/);
  assert.ok(request, "the assigned player is asked, as the one who rolls for it");
  assert.equal(app.ctx.label(request.body), "Concentrazione · CD 10 · Danno registrato");
});

test("review 2 P3: a turn-start death save and the turn itself reach whoever ended the turn", () => {
  const app = makeApp();
  app.as("dm");
  app.ctx.commit("Incontro", (draft) => {
    draft.combat = {
      active: true,
      round: 1,
      turn: 0,
      order: ["goblin-1", "livia"],
      encounterId: "enc-n",
    };
    const result = applyVitalityEvent(draft, {
      eventId: "drop-livia",
      kind: "damage",
      actorId: "livia",
      amount: draft.actors.livia.hp,
      source: { kind: "authored", edition: "2024", revision: "notifications-test-2" },
    });
    applyConditionFollowUps(draft, result, { manual: true });
  });
  assert.equal(app.store.state.actors.livia.hp, 0);
  app.as("player");
  N.markAllNotificationsRead(app.ctx);
  // The player presses "End turn": the rules, not the player, ask for Livia's death save.
  app.ctx.commit("Termina turno", (draft) => advanceTurn(draft));
  const save = find(app, /Tiro richiesto: Livia/);
  assert.ok(save, titles(app).join(" | "));
  assert.equal(
    app.ctx.label(save.body),
    "Tiro salvezza contro la morte · CD 10 · Tiro salvezza contro la morte",
  );
  assert.equal(save.by, null);
  const turn = find(app, /È il tuo turno: Livia/);
  assert.ok(turn && turn.by === null && turn.category === "turns");
  assert.equal(app.ctx.label(turn.body), "Round 1");
  assert.deepEqual(turn.target, { page: "table", params: {} });
  // The DM runs the monsters: no "your turn" for them; the turn notice lasts one turn.
  app.as("dm");
  app.ctx.commit("Termina turno", (draft) => advanceTurn(draft));
  assert.equal(app.store.state.combat.order[app.store.state.combat.turn], "goblin-1");
  assert.equal(find(app, /È il tuo turno/), undefined);
  app.as("player");
  assert.equal(find(app, /È il tuo turno/), undefined, "the next turn replaces it");
});
