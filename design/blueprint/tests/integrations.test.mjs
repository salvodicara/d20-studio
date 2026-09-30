// B55 — simulated external integrations: domain rules and the same handlers the bound
// controls call, with the real store and registry (seed, commit, Undo, reload). Synthetic
// demo data only; no network (globalThis.fetch is replaced by a trap for the whole suite).
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as sessions from "../campaign-sessions.mjs";
import * as content from "../campaign-content.mjs";
import * as clib from "../character-library.mjs";
import * as N from "../notifications.mjs";
import * as D from "../integrations-domain.mjs";
import * as I from "../integrations.mjs";
import { useSampleClock } from "../sample-clock.mjs";

// The example's real-time stamps as authored (the week of Thursday 17 September 2026,
// sample-clock.mjs): pinned, so the relay's fixed log times never depend on the real date.
useSampleClock(() => Date.parse("2026-09-21T12:00:00Z"));

process.env.TZ = "Europe/Rome";
const HOUR = 3600e3;
let fetched = 0;
globalThis.fetch = async () => {
  fetched += 1;
  throw Error("network is not allowed in B55");
};

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
function form(fields = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields))
    for (const entry of [].concat(value)) data.append(key, String(entry));
  return data;
}
function harness({ role = "dm", lang = "it" } = {}) {
  const storage = memory();
  const boot = () => {
    const registry = createRegistry({ deviceStorage: memory() });
    registry.use("character-library", clib.register);
    registry.use("notifications", N.register);
    registry.use("integrations", I.register);
    const store = createStore({ storage });
    if (registry.initState(store.state).changed) store.persist();
    return { registry, store };
  };
  let { registry, store } = boot();
  const toasts = [],
    dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "campaign", tab: "integrations", id: null },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? (value[ctx.lang] ?? value.it ?? value.en ?? "")
        : String(value ?? ""),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {
      ctx.rendered = (ctx.rendered ?? 0) + 1;
    },
    navigate(page, params) {
      ctx.navigated = { page, params };
    },
    openSheet(id) {
      ctx.navigated = { page: "characters", params: { id } };
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("You are offline"), {
          it: "Sei senza rete: questa modifica condivisa non può essere applicata.",
          en: "You are offline: this shared change cannot be applied.",
        });
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      ctx.render();
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
  };
  Object.defineProperty(ctx, "registry", { get: () => registry });
  registry.attach?.(ctx);
  return {
    ctx,
    toasts,
    dialogs,
    get store() {
      return store;
    },
    get registry() {
      return registry;
    },
    get slice() {
      return store.state.ext.integrations;
    },
    get rec() {
      return store.state.ext.integrations.campaigns.lanterns;
    },
    reload() {
      ({ registry, store } = boot());
      registry.attach?.(ctx);
    },
    submit(fields) {
      const dialog = dialogs.at(-1);
      assert.ok(dialog, "no dialog open");
      return dialog.options.onSubmit(form(fields));
    },
    as(value) {
      ctx.role = value;
      return this;
    },
  };
}
const errors = (h) => h.toasts.filter((row) => row.error).map((row) => row.text);
let sequence = 0;
function scheduleSession(h, { title, localTime, timeZone = "Europe/Rome" }) {
  const id = `draft-session-${++sequence}`;
  let sessionId;
  const role = h.ctx.role;
  h.ctx.role = "dm";
  h.ctx.commit("Sessione", (draft) => {
    sessions.createSessionDraft(draft, { id, kind: "direct" }, "dm");
    sessions.saveSessionDraft(
      draft,
      id,
      { data: { title, localTime, timeZone, selectedInstant: null }, expectedDraftRevision: 0 },
      "dm",
    );
    const preview = sessions.previewSessionDraft(draft, id, "dm");
    sessionId = sessions.applySessionDraft(
      draft,
      id,
      { reviewKey: preview.reviewKey },
      "dm",
    ).sessionId;
  });
  h.ctx.role = role;
  return sessionId;
}
function writeEntry(h, { title, access }) {
  const id = `draft-entry-${++sequence}`;
  const role = h.ctx.role;
  h.ctx.role = "dm";
  h.ctx.commit(
    "Voce",
    (draft) => {
      const d = content.createCampaignDraft(
        draft,
        { id, kind: "world", campaignId: "lanterns" },
        "dm",
      );
      content.saveCampaignDraft(
        draft,
        id,
        {
          data: { ...d.data, title, body: "Testo di prova." },
          access,
          expectedDraftRevision: d.revision,
        },
        "dm",
      );
      const preview = content.previewCampaignDraft(draft, id, "dm");
      assert.ok(preview.canApply, JSON.stringify(preview.errors));
      content.applyCampaignDraft(draft, id, { reviewKey: preview.reviewKey }, "dm");
    },
    access.mode === "private" ? { local: true, visibility: "private" } : {},
  );
  h.ctx.role = role;
}
const inDays = (days, time = "21:00") => {
  const d = new Date(Date.now() + days * 24 * HOUR);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
};
beforeEach(() => {
  I.resetIntegrationsView();
  fetched = 0;
});

// ---------------------------------------------------------------- seed and modules

test("seed: Le lanterne di Bruma relays to #tavolo-lanterne; API off; normalize is idempotent", () => {
  const h = harness();
  assert.equal(h.rec.relay.channel, "tavolo-lanterne");
  assert.deepEqual(h.rec.modules, {
    relay: true,
    avrae: true,
    calendar: true,
    sheets: true,
    import: true,
    api: false,
  });
  assert.equal(
    D.maskWebhook(h.rec.relay.webhook),
    "discord.com/api/webhooks/1187400000000000001/••••0001",
  );
  const again = D.normalizeSlice(structuredClone(h.slice));
  assert.deepEqual(again, h.slice);
  assert.throws(() => D.normalizeSlice({}, D.VERSION + 1));
  // A campaign this area has never seen reads the defaults and writes nothing.
  assert.equal(D.campaignOf(h.slice, "other").relay.webhook, "");
  h.reload();
  assert.equal(h.rec.relay.channel, "tavolo-lanterne");
});

test("modules: Foundry dependency prompt, save with history, tabs follow, Undo restores", () => {
  const h = harness();
  assert.deepEqual(D.dependencyChanges({ relay: false, avrae: false }, "avrae", true), ["relay"]);
  assert.deepEqual(D.dependencyChanges({ relay: true, avrae: true }, "relay", false), ["avrae"]);
  // Switching relay off prompts to switch Avrae off too; nothing changes until confirmed.
  const input = { dataset: { intModule: "relay" }, checked: false };
  I.integrationsActions.changeModule(h.ctx, input);
  assert.equal(input.checked, true, "checkbox reverted while the prompt is open");
  assert.match(h.dialogs.at(-1).body, /Collegamento Avrae/);
  h.submit({});
  I.integrationsActions.changeModule(h.ctx, { dataset: { intModule: "api" }, checked: true });
  let html = I.renderSection(h.ctx);
  assert.match(html, /3 modifiche non salvate/);
  assert.equal(h.rec.modules.relay, true, "pending changes are not saved yet");
  I.integrationsActions.saveModules(h.ctx);
  assert.deepEqual(
    [h.rec.modules.relay, h.rec.modules.avrae, h.rec.modules.api],
    [false, false, true],
  );
  assert.deepEqual(
    h.rec.history.map((row) => row.it),
    [
      "Modulo spento: Inoltro a Discord",
      "Modulo spento: Collegamento Avrae",
      "Modulo attivato: API e webhook",
    ],
  );
  html = I.renderSection(h.ctx);
  assert.doesNotMatch(html, /data-int-tab="discord"/, "Discord tab hidden when the relay is off");
  assert.match(html, /data-int-tab="api"/);
  // The player sees the state read-only: no form, no history.
  h.as("player");
  html = I.renderSection(h.ctx);
  assert.doesNotMatch(html, /data-int-modules-form|data-int-history/);
  assert.match(html, /data-int-module-row="relay"[\s\S]*?Spento/);
  assert.throws(
    () => D.saveModules(structuredClone(h.slice), "lanterns", {}, "player"),
    /Only the DM/,
  );
  // Undo (the DM's last change) restores every switch in one step.
  h.as("dm");
  h.ctx.undo();
  assert.deepEqual(
    [h.rec.modules.relay, h.rec.modules.avrae, h.rec.modules.api],
    [true, true, false],
  );
  // Inconsistent saves are refused: Avrae without the relay.
  assert.throws(
    () =>
      D.saveModules(structuredClone(h.slice), "lanterns", { ...h.rec.modules, relay: false }, "dm"),
    /requires/,
  );
});

// ---------------------------------------------------------------- Discord relay

test("relay preview: public rolls and events only; private rolls and labels withheld", () => {
  const state = {
    campaign: { id: "lanterns", sessions: [] },
    log: [
      {
        id: "a",
        time: "2026-09-10T20:00:00.000Z",
        label: "Livia · d20: 14 + 3 = 17 (fisico)",
        visibility: "shared",
        rolls: [],
      },
      {
        id: "b",
        time: "2026-09-10T20:01:00.000Z",
        label: "Attacco",
        visibility: "shared",
        controller: "dm",
        rolls: [
          {
            kind: "attack",
            actorName: "Doran",
            visibility: "shared",
            dice: [{ count: 1, sides: 20 }],
            values: [15],
            modifier: 5,
            total: 20,
            mode: "digital",
          },
          {
            kind: "attack",
            actorName: "Sentinella",
            visibility: "private",
            controller: "dm",
            dice: [{ count: 1, sides: 20 }],
            values: [2],
            modifier: 4,
            total: 6,
            mode: "digital",
          },
        ],
      },
      {
        id: "c",
        time: "2026-09-10T20:02:00.000Z",
        label: "Segreto del DM: la porta è falsa",
        visibility: "private",
        controller: "dm",
        rolls: [],
      },
      {
        id: "d",
        time: "2026-09-10T20:03:00.000Z",
        label: "Turno concluso",
        visibility: "shared",
        rolls: [],
      },
      {
        id: "e",
        time: "2026-09-10T20:04:00.000Z",
        label: "Chat · messaggio",
        visibility: "shared",
        rolls: [],
      },
      {
        id: "f",
        time: "2026-09-10T20:05:00.000Z",
        label: "Turno concluso",
        kind: "correction",
        revertsId: "d",
        visibility: "shared",
        rolls: [],
      },
      {
        id: "old",
        time: "2026-08-01T20:00:00.000Z",
        label: "Prima dell’inoltro",
        visibility: "shared",
        rolls: [],
      },
      {
        id: "own",
        time: "2026-09-10T20:06:00.000Z",
        label: "Integrazioni · Inoltro a Discord salvato",
        visibility: "shared",
        rolls: [],
      },
      {
        id: "secret-roll",
        time: "2026-09-10T20:07:00.000Z",
        label: "Sentinella · d20: 9 + 1 = 10 (digitale)",
        visibility: "private",
        controller: "dm",
        rolls: [],
      },
    ],
  };
  const slice = D.seedSlice();
  const preview = D.relayPreview(state, slice, "lanterns", { viewer: "dm" });
  const texts = preview.messages.map((m) => m.text);
  assert.deepEqual(texts, [
    "Livia · Tiro libero: 1d20 [14] + 3 = 17 · dadi fisici",
    "Doran · Attacco: 1d20 [15] + 5 = 20 · dadi digitali",
    "Turno concluso",
    "Correzione: Turno concluso",
  ]);
  assert.equal(preview.messages[2].reversed, true, "the reverted entry is marked");
  // The hidden attack and a private free-roll label count as rolls; the area's own
  // configuration commit is never mirrored.
  assert.equal(preview.privateRolls, 2);
  assert.equal(preview.privateEvents, 1);
  assert.ok(!texts.join(" ").includes("Sentinella") && !texts.join(" ").includes("porta"));
  assert.ok(!texts.some((t) => t.startsWith("Integrazioni")));
  // Categories switch parts off; the relay module off sends nothing.
  slice.campaigns.lanterns.relay.events.rolls = false;
  assert.deepEqual(
    D.relayPreview(state, slice, "lanterns").messages.map((m) => m.kind),
    ["event", "event"],
  );
  slice.campaigns.lanterns.modules.relay = false;
  assert.equal(D.relayPreview(state, slice, "lanterns").messages.length, 0);
});

test("relay: DM saves, sends a /dnote, withdraws it with a reason; player refused; offline blocked", () => {
  const h = harness();
  assert.throws(
    () =>
      D.saveRelay(
        structuredClone(h.slice),
        "lanterns",
        { webhook: "https://evil.example/hook", channel: "x" },
        "dm",
      ),
    /Invalid webhook address/,
  );
  h.ctx.commit("relay", (draft) =>
    D.saveRelay(
      draft.ext.integrations,
      "lanterns",
      {
        keepWebhook: true,
        channel: "#Tavolo Lanterne",
        events: { rolls: true, log: false, sessions: true, journal: true },
      },
      "dm",
    ),
  );
  assert.equal(h.rec.relay.channel, "tavolo-lanterne");
  assert.ok(h.rec.relay.webhook.endsWith("0001"), "empty field keeps the webhook");
  h.ctx.commit("note", (draft) =>
    D.addRelayNote(
      draft.ext.integrations,
      "lanterns",
      "Portate le mappe della torre.",
      "dm",
      Date.now(),
      "note-1",
    ),
  );
  let preview = D.relayPreview(h.ctx.state, h.slice, "lanterns");
  assert.equal(preview.messages.at(-1).text, "Portate le mappe della torre.");
  I.integrationsActions.retractNote(h.ctx, "note-1");
  assert.throws(() => h.submit({ reason: "x" }), /at least 3/);
  h.submit({ reason: "Data sbagliata" });
  preview = D.relayPreview(h.ctx.state, h.slice, "lanterns");
  assert.ok(!preview.messages.some((m) => m.kind === "note"), "withdrawn note left the channel");
  assert.match(h.rec.history.at(-1).it, /Nota ritirata dal canale: Data sbagliata/);
  assert.throws(
    () => D.addRelayNote(structuredClone(h.slice), "lanterns", "ciao", "player"),
    /Only the DM/,
  );
  h.ctx.offline = true;
  assert.throws(
    () =>
      h.ctx.commit("note", (draft) =>
        D.addRelayNote(draft.ext.integrations, "lanterns", "x", "dm"),
      ),
    /offline/,
  );
  assert.equal(fetched, 0, "no network call");
});

test("Avrae: !campaign command, link listed and removed, only public rolls since the link", () => {
  const h = harness();
  assert.equal(
    D.avraeCommand("lanterns"),
    "!campaign https://d20-studio.example/campaigns/lanterns",
  );
  let linkId;
  h.ctx.commit("link", (draft) => {
    linkId = D.linkAvrae(
      draft.ext.integrations,
      "lanterns",
      { server: "Le lanterne di Bruma", channel: "tiri" },
      "dm",
    );
  });
  assert.throws(
    () =>
      D.linkAvrae(
        structuredClone(h.slice),
        "lanterns",
        { server: "Le lanterne di Bruma", channel: "tiri" },
        "dm",
      ),
    /already linked/,
  );
  h.ctx.commit("Livia · d20: 11 + 5 = 16 (digitale)", () => {});
  h.ctx.commit("Movimento confermato", () => {});
  const preview = D.relayPreview(h.ctx.state, h.slice, "lanterns", { destination: linkId });
  assert.deepEqual(
    preview.messages.map((m) => m.text),
    ["Livia · Tiro libero: 1d20 [11] + 5 = 16 · dadi digitali"],
  );
  h.ctx.commit("unlink", (draft) =>
    D.unlinkAvrae(draft.ext.integrations, "lanterns", linkId, "dm"),
  );
  assert.equal(h.rec.avrae.links.length, 0);
  assert.equal(
    D.relayPreview(h.ctx.state, h.slice, "lanterns", { destination: linkId }).messages.length,
    0,
  );
});

test("relay: session notices and journal entries shared with everyone; private entries never", () => {
  const h = harness();
  h.ctx.commit("since", (draft) => {
    draft.ext.integrations.campaigns.lanterns.relay.since = new Date(
      Date.now() - HOUR,
    ).toISOString();
    draft.ext.integrations.campaigns.lanterns.relay.events.journal = true;
  });
  scheduleSession(h, { title: "La torre", localTime: inDays(7) });
  writeEntry(h, { title: "La mappa del faro", access: { mode: "campaign", grants: [] } });
  writeEntry(h, { title: "Il tradimento di Syl", access: { mode: "private", grants: [] } });
  const texts = D.relayPreview(h.ctx.state, h.slice, "lanterns").messages.map((m) => m.text);
  assert.ok(
    texts.some((t) => /^Sessione programmata: La torre — .* \(Europe\/Rome\)$/.test(t)),
    texts.join("\n"),
  );
  assert.ok(texts.includes("Nuova voce · Voce del mondo: La mappa del faro"));
  assert.ok(!texts.join(" ").includes("Syl"), "a private entry never reaches the channel");
});

// ---------------------------------------------------------------- calendar

test("calendar: .ics of the next session with the correct UTC instant, escaping and folding", () => {
  const h = harness({ role: "player" });
  // This check starts from a calendar without the example's «Il sigillo della torre», on a fixed clock.
  const at = Date.parse("2027-09-01T10:00:00Z");
  h.as("dm");
  h.ctx.commit("Nessuna sessione", (draft) => {
    draft.campaign.sessions = [];
  });
  h.as("player");
  assert.equal(D.nextSession(h.ctx.state, "player", at), null);
  const sessionId = scheduleSession(h, {
    title: "La torre, piano; secondo",
    localTime: "2027-10-02T21:00",
  });
  scheduleSession(h, { title: "Dopo", localTime: "2027-10-09T21:00" });
  const next = D.nextSession(h.ctx.state, "player", at);
  assert.equal(next.id, sessionId);
  assert.equal(next.startsAt, "2027-10-02T19:00:00.000Z", "21:00 Rome in October is 19:00 UTC");
  const ics = D.buildIcs(h.ctx.state, [next], {
    durationHours: 3,
    now: Date.parse("2027-09-01T10:00:00Z"),
  });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.match(ics, /\r\nDTSTART:20271002T190000Z\r\n/);
  assert.match(ics, /\r\nDTEND:20271002T220000Z\r\n/);
  assert.match(ics, /\r\nDTSTAMP:20270901T100000Z\r\n/);
  assert.match(ics, /SUMMARY:Le lanterne di Bruma: La torre\\, piano\\; secondo/);
  assert.ok(
    ics.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75),
    "folded at 75 octets",
  );
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.equal(D.icsFileName(h.ctx.state, next), "le-lanterne-di-bruma-2027-10-02.ics");
  // The handler downloads nothing in Node but answers; no session → an error toast. It reads
  // the real clock, so it gets a session three days from now.
  const soon = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(Date.now() + 3 * 86400000);
  scheduleSession(h, { title: "Presto", localTime: `${soon}T21:00` });
  assert.equal(I.integrationsActions.downloadNext(h.ctx), true);
  // Duration: DM only, shared.
  assert.throws(
    () => D.setDuration(structuredClone(h.slice), "lanterns", 4, "player"),
    /Only the DM/,
  );
  h.as("dm");
  h.ctx.commit("durata", (draft) => D.setDuration(draft.ext.integrations, "lanterns", 4, "dm"));
  assert.match(
    D.buildIcs(h.ctx.state, [next], { durationHours: h.rec.calendar.durationHours }),
    /DTEND:20271002T230000Z/,
  );
});

test("calendar: personal feed link per identity, rotated privately; reminders are B24 settings", () => {
  const h = harness({ role: "player" });
  h.ctx.commit(
    "feed",
    (draft) => D.rotateFeed(draft.ext.integrations, "player", Date.now(), "tok-aaaa"),
    { local: true, visibility: "private" },
  );
  assert.equal(
    D.feedUrl("lanterns", "tok-aaaa"),
    "webcal://d20-studio.example/feeds/lanterns/tok-aaaa.ics",
  );
  h.ctx.commit(
    "feed",
    (draft) => D.rotateFeed(draft.ext.integrations, "player", Date.now(), "tok-bbbb"),
    { local: true, visibility: "private" },
  );
  assert.deepEqual(D.feedOf(h.slice, "player").retired, ["aaaa"]);
  assert.equal(D.feedOf(h.slice, "dm"), null, "the DM has no access to the player's feed");
  assert.equal(h.store.state.log.at(-1).visibility, "private");
  // The in-app reminders are the notification centre's own personal settings.
  assert.equal(h.registry.getSetting(h.ctx, "notifications.remind-1h"), false);
  h.registry.setSetting(h.ctx, "notifications.remind-1h", true);
  assert.match(
    I.renderSection({
      ...h.ctx,
      view: { page: "campaign", tab: "integrations", id: "calendar" },
      get state() {
        return h.ctx.state;
      },
    }),
    /data-int-reminder="remind-1h" checked/,
  );
  h.as("dm");
  assert.equal(
    h.registry.getSetting(h.ctx, "notifications.remind-1h"),
    false,
    "personal to the player",
  );
});

// ---------------------------------------------------------------- external sheet

test("external sheet: https only, controller sets it, sharing decides who opens it, nothing imported", () => {
  const h = harness({ role: "player" });
  const s = () => structuredClone(h.slice);
  for (const bad of [
    "http://x.example/a",
    "javascript:alert(1)",
    "https://user:pw@x.example/",
    "nope",
  ])
    assert.throws(() => D.setSheetLink(h.ctx.state, s(), "livia", { url: bad }, "player"));
  assert.throws(
    () => D.setSheetLink(h.ctx.state, s(), "goblin-1", { url: "https://x.example/g" }, "player"),
    /Only whoever controls/,
  );
  const before = structuredClone(h.ctx.state.actors.livia);
  h.ctx.commit(
    "link",
    (draft) =>
      D.setSheetLink(
        draft,
        draft.ext.integrations,
        "livia",
        { url: "https://www.dndbeyond.com/characters/12345", shared: false },
        "player",
      ),
    { visibility: "private" },
  );
  assert.deepEqual(h.ctx.state.actors.livia, before, "the sheet itself is untouched");
  // Controllers only: the DM controls Livia at the Table, so the DM reads it; not shared.
  assert.ok(D.sheetLinkFor(h.ctx.state, h.slice, "livia", "dm"));
  // The DM's goblin link, unshared, is never readable by the player.
  h.as("dm");
  h.ctx.commit(
    "link",
    (draft) =>
      D.setSheetLink(
        draft,
        draft.ext.integrations,
        "goblin-1",
        { url: "https://www.dndbeyond.com/monsters/goblin" },
        "dm",
      ),
    { visibility: "private" },
  );
  assert.equal(D.sheetLinkFor(h.ctx.state, h.slice, "goblin-1", "player"), null);
  // Token menu: open for readers, edit for controllers, both gone when the module is off.
  const open = h.registry.get("token-menu", "integrations-sheet-open");
  const edit = h.registry.get("token-menu", "integrations-sheet-edit");
  h.as("player");
  assert.equal(open.when(h.ctx, { actorId: "goblin-1" }), false);
  assert.equal(edit.when(h.ctx, { actorId: "goblin-1" }), false);
  assert.equal(open.when(h.ctx, { actorId: "livia" }), true);
  const opened = [];
  globalThis.open = (...args) => opened.push(args);
  open.run(h.ctx, { actorId: "livia" });
  assert.deepEqual(opened, [
    ["https://www.dndbeyond.com/characters/12345", "_blank", "noopener,noreferrer"],
  ]);
  assert.deepEqual(h.ctx.state.actors.livia, before, "opening imports nothing");
  const panel = h.registry.get("table-panel", "integrations-sheet");
  assert.match(panel.render(h.ctx, { selectedActorId: "livia" }), /dndbeyond\.com/);
  h.as("dm");
  h.ctx.commit("off", (draft) => {
    draft.ext.integrations.campaigns.lanterns.modules.sheets = false;
  });
  assert.equal(open.when(h.ctx, { actorId: "livia" }), false);
  assert.equal(panel.when(h.ctx, { selectedActorId: "livia" }), false);
  // The edit dialog removes the link (the link survives the module switch as data).
  h.ctx.commit("on", (draft) => {
    draft.ext.integrations.campaigns.lanterns.modules.sheets = true;
  });
  I.integrationsActions.sheetDialog(h.ctx, "goblin-1");
  assert.match(h.dialogs.at(-1).body, /data-int-sheet-remove/);
  h.submit({ url: "https://www.dndbeyond.com/monsters/goblin-boss", shared: "on" });
  assert.equal(h.slice.sheets["goblin-1"].url, "https://www.dndbeyond.com/monsters/goblin-boss");
  assert.ok(D.sheetLinkFor(h.ctx.state, h.slice, "goblin-1", "dm"));
  delete globalThis.open;
});

// ---------------------------------------------------------------- documented import

test("import: parser reports lines, ignores unknown fields, keeps quoted commas", () => {
  const ok = D.parseSheetCsv(D.EXAMPLE_CSV);
  assert.equal(ok.ok, true);
  assert.equal(ok.sheet.name, "Tessa Pietralieve");
  assert.deepEqual(ok.sheet.items, [
    { name: "Pugnale", quantity: 2 },
    { name: "Arnesi da scasso", quantity: 1 },
  ]);
  assert.equal(ok.sheet.notes, "Esploratrice di Bruma, arrivata con la carovana del sale.");
  const bad = D.parseSheetCsv(
    [
      "format,d20-sheet-csv",
      "version,1",
      "source_id,x",
      "name,X",
      "level,25",
      "str,8",
      "colore,blu",
      "dex,alto",
    ].join("\n"),
  );
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.ignored, [{ line: 7, key: "colore" }]);
  assert.ok(bad.errors.some((e) => e.line === 5 && /Level/.test(e.en)));
  assert.ok(bad.errors.some((e) => e.line === 8 && /DEX/.test(e.en)));
  assert.ok(bad.errors.some((e) => /“con”/.test(e.en)));
  assert.equal(D.parseSheetCsv('name,"open').ok, false);
  assert.equal(
    D.parseSheetCsv("x", { bytes: D.MAX_IMPORT_BYTES + 1 }).errors[0].en,
    "The file is larger than 64 KB.",
  );
  assert.match(
    D.parseSheetCsv("format,foundry\nversion,1")
      .errors.map((e) => e.en)
      .join(" "),
    /Unknown format/,
  );
});

test("import: new private character in the B21 library, then an Avrae-style update keeps app data", () => {
  const h = harness({ role: "player" });
  I.integrationsActions.runPreview(h.ctx, D.EXAMPLE_CSV, "tessa.csv");
  let html = I.renderSection({
    ...h.ctx,
    view: { page: "campaign", tab: "integrations", id: "import" },
    get state() {
      return h.ctx.state;
    },
  });
  assert.match(html, /data-int-import-preview="new"/);
  I.integrationsActions.importNew(h.ctx, "Tessa");
  const id = Object.keys(h.slice.imports)[0];
  const actor = h.ctx.state.actors[id];
  assert.equal(actor.name, "Tessa");
  assert.equal(actor.owner, "player");
  assert.equal(actor.visibility, "private");
  assert.deepEqual(actor.campaignIds, []);
  assert.equal(actor.imported.format, "d20-sheet-csv");
  assert.equal(actor.inventory.length, 2);
  assert.ok(h.ctx.state.ext["character-library"].entries[id], "listed in the B21 library");
  assert.equal(h.store.state.log.at(-1).visibility, "private");
  assert.equal(
    D.importedFrom(h.ctx.state, h.slice, "tessa-001", "dm"),
    null,
    "the DM cannot update it",
  );
  // In-app changes the file does not own: inventory and notes.
  h.ctx.commit(
    "inv",
    (draft) => {
      draft.actors[id].inventory.push({
        id: "rope",
        name: "Corda",
        quantity: 1,
        weight: 0,
        equipped: false,
        description: "",
        kind: "gear",
      });
      draft.actors[id].hp = 20;
    },
    { local: true, visibility: "private" },
  );
  const updated = D.EXAMPLE_CSV.replace("level,3", "level,4")
    .replace("max_hp,24", "max_hp,18")
    .replace("\nhp,24", "\nhp,18")
    .replace("dex,16", "dex,17");
  I.integrationsActions.runPreview(h.ctx, updated, "tessa.csv");
  const plan = D.importPlan(h.ctx.state, h.slice, D.parseSheetCsv(updated), "player");
  assert.deepEqual(
    plan.changes.map((c) => [c.path, c.from, c.to]),
    [
      ["level", 3, 4],
      ["maxHp", 24, 18],
      ["abilities.dex", 16, 17],
    ],
  );
  I.integrationsActions.importUpdate(h.ctx);
  const after = h.ctx.state.actors[id];
  assert.equal(after.level, 4);
  assert.equal(after.maxHp, 18);
  assert.equal(after.hp, 18, "current HP never above the new maximum");
  assert.equal(after.inventory.length, 3, "inventory kept");
  assert.ok(h.slice.imports[id].updatedAt);
  // Undo reverses the update, then the import itself.
  h.ctx.undo();
  assert.equal(h.ctx.state.actors[id].level, 3);
  h.ctx.undo();
  h.ctx.undo();
  assert.equal(h.ctx.state.actors[id], undefined);
  assert.deepEqual(h.slice.imports, {});
});

// ---------------------------------------------------------------- API and webhooks

test("API tokens: shown once, stored as last four + fingerprint, answers with the caller's own view", () => {
  const h = harness({ role: "player" });
  h.as("dm");
  h.ctx.commit("api on", (draft) => {
    draft.ext.integrations.campaigns.lanterns.modules.api = true;
  });
  h.as("player");
  I.integrationsActions.createToken(h.ctx, "Bot del gruppo");
  const [token] = D.tokensOf(h.slice, "player");
  const shown = h.dialogs.at(-1).body.match(/value="(d20_pat_[A-Za-z0-9]+)"/)[1];
  assert.equal(shown.length, 40);
  assert.ok(!JSON.stringify(h.ctx.state).includes(shown), "the full secret is not stored");
  assert.equal(token.last4, shown.slice(-4));
  assert.equal(D.tokensOf(h.slice, "dm").length, 0);
  // A private DM character must not appear in the player's campaign listing.
  h.ctx.commit("private dm pc", (draft) => {
    draft.actors.secret = {
      ...structuredClone(draft.actors.doran),
      id: "secret",
      name: "Segreta",
      visibility: "private",
    };
  });
  const list = D.apiRequest(h.ctx.state, h.slice, "player", {
    tokenValue: shown,
    endpoint: "characters",
  });
  assert.equal(list.status, 200);
  const names = list.body.data.map((row) => row.name);
  assert.ok(names.includes("Livia") && names.includes("Mira") && !names.includes("Segreta"));
  assert.equal(D.apiRequest(h.ctx.state, h.slice, "player", { tokenValue: "wrong" }).status, 401);
  h.ctx.commit("revoke", (draft) => D.revokeToken(draft.ext.integrations, "player", token.id), {
    local: true,
    visibility: "private",
  });
  assert.equal(D.apiRequest(h.ctx.state, h.slice, "player", { tokenValue: shown }).status, 401);
  h.as("dm");
  h.ctx.commit("api off", (draft) => {
    draft.ext.integrations.campaigns.lanterns.modules.api = false;
  });
  assert.equal(D.apiRequest(h.ctx.state, h.slice, "player", { tokenValue: shown }).status, 404);
  assert.equal(fetched, 0);
});

test("webhooks: DM only, simulated deliveries for shared events after creation, tests, delete + Undo", () => {
  const h = harness();
  h.ctx.commit("api on", (draft) => {
    draft.ext.integrations.campaigns.lanterns.modules.api = true;
  });
  assert.throws(
    () =>
      D.saveWebhook(
        structuredClone(h.slice),
        "lanterns",
        { name: "x", url: "https://h.example", event: "sessions" },
        "player",
      ),
    /Only the DM/,
  );
  I.integrationsActions.webhookDialog(h.ctx);
  assert.throws(
    () =>
      h.submit({ name: "Annunci", url: "http://h.example", event: "sessions", format: "discord" }),
    /https/,
  );
  h.submit({
    name: "Annunci",
    url: "https://hooks.example/lanterne",
    event: "sessions",
    format: "discord",
    template: "{event}: {name}",
    active: "on",
  });
  const hook = h.rec.webhooks[0];
  scheduleSession(h, { title: "La torre", localTime: inDays(5) });
  h.ctx.commit("test", (draft) => D.testWebhook(draft.ext.integrations, "lanterns", hook.id, "dm"));
  const deliveries = D.webhookDeliveries(h.ctx.state, h.rec.webhooks[0], "it");
  assert.equal(deliveries.length, 2);
  assert.deepEqual(
    deliveries.map((d) => d.payload.content).sort(),
    ["Prova: Consegna di prova", "Sessione programmata o cambiata: La torre"].sort(),
  );
  h.ctx.commit("pause", (draft) =>
    D.setWebhookActive(draft.ext.integrations, "lanterns", hook.id, false, "dm"),
  );
  assert.equal(
    D.webhookDeliveries(h.ctx.state, h.rec.webhooks[0], "it").filter((d) => !d.test).length,
    0,
  );
  h.ctx.commit("delete", (draft) =>
    D.deleteWebhook(draft.ext.integrations, "lanterns", hook.id, "dm"),
  );
  assert.equal(h.rec.webhooks.length, 0);
  h.ctx.undo();
  assert.equal(h.rec.webhooks.length, 1, "Undo brings the webhook back");
  // The player sees tokens and the tester, never the webhooks.
  h.as("player");
  const html = I.renderSection({
    ...h.ctx,
    view: { page: "campaign", tab: "integrations", id: "api" },
    get state() {
      return h.ctx.state;
    },
  });
  assert.match(html, /data-int-token-form/);
  assert.doesNotMatch(html, /Webhook della campagna|hooks\.example/);
});

// ---------------------------------------------------------------- rendering

test("rendering: EN labels, simulation note, player never sees the webhook address", () => {
  const h = harness({ role: "player", lang: "en" });
  // A hidden DM roll recorded as a private label (Table free-roll format).
  h.as("dm");
  h.ctx.commit("Sentinella · d20: 9 + 1 = 10 (digital)", () => {}, { visibility: "private" });
  h.as("player");
  const view = (id) => ({
    ...h.ctx,
    view: { page: "campaign", tab: "integrations", id },
    get state() {
      return h.ctx.state;
    },
  });
  let html = I.renderSection(view("discord"));
  assert.match(html, /<h1[^>]*>Integrations<\/h1>/);
  assert.match(html, /No data leaves this browser/);
  assert.match(html, /The DM relays to #tavolo-lanterne/);
  assert.doesNotMatch(html, /Not relayed: \d/, "a player is not told about hidden rolls");
  assert.match(html, /Pattern: Foundry to Discord and relay modules/);
  assert.doesNotMatch(html, /api\/webhooks|lanterne-demo-token/);
  h.as("dm");
  html = I.renderSection(view("discord"));
  assert.match(html, /••••0001/);
  assert.match(html, /Not relayed: 1 private roll\./);
  assert.doesNotMatch(html, /Sentinella/);
  assert.doesNotMatch(html, /lanterne-demo-token-0001/, "even the DM sees it masked");
  assert.match(html, /!campaign https:\/\/d20-studio\.example\/campaigns\/lanterns/);
  html = I.renderSection(view("import"));
  assert.match(html, /Documented format: d20-sheet-csv v1/);
  // An unknown sub-tab falls back to Modules; the API tab stays reachable while its module
  // is off (P9 SV-41: the first token switches it on after a confirmation).
  assert.match(I.renderSection(view("nowhere")), /data-int-page="modules"/);
  assert.match(I.renderSection(view("api")), /data-int-api-off/);
});

// ---------------------------------------------------------------- independent review (B55-rf)

const at = (iso) => Date.parse(iso);
const logEntry = (
  id,
  time,
  label,
  { visibility = "shared", controller = "dm", rolls = [] } = {},
) => ({
  id,
  time,
  label,
  visibility,
  controller,
  kind: "change",
  rolls,
});

test("review: the withheld count covers only what the viewer could read, never another identity's private activity", () => {
  const privateRoll = (owner) => ({
    kind: "attack",
    actorName: owner === "dm" ? "Sentinella" : "Livia",
    visibility: "private",
    owner,
    controller: owner,
    dice: [{ count: 1, sides: 20 }],
    values: [7],
    modifier: 2,
    total: 9,
    mode: "digital",
  });
  const state = {
    campaign: { id: "lanterns", sessions: [] },
    log: [
      // The player's "Solo io" work: a private draft and a private roll of their own.
      logEntry("p1", "2026-09-10T20:00:00.000Z", "Bozza privata salvata", {
        visibility: "private",
        controller: "player",
      }),
      logEntry("p2", "2026-09-10T20:01:00.000Z", "Livia · d20: 12 + 2 = 14 (digitale)", {
        visibility: "private",
        controller: "player",
      }),
      logEntry("p3", "2026-09-10T20:02:00.000Z", "Attacco", {
        controller: "player",
        rolls: [privateRoll("player")],
      }),
      // The DM's hidden roll and hidden label.
      logEntry("d1", "2026-09-10T20:03:00.000Z", "Attacco", { rolls: [privateRoll("dm")] }),
      logEntry("d2", "2026-09-10T20:04:00.000Z", "Segreto del DM", { visibility: "private" }),
    ],
  };
  const slice = D.seedSlice();
  const dm = D.relayPreview(state, slice, "lanterns", { viewer: "dm" });
  assert.deepEqual([dm.privateRolls, dm.privateEvents], [1, 1], "only the DM's own items");
  const player = D.relayPreview(state, slice, "lanterns", { viewer: "player" });
  assert.deepEqual([player.privateRolls, player.privateEvents], [2, 1]);
  const nobody = D.relayPreview(state, slice, "lanterns");
  assert.deepEqual([nobody.privateRolls, nobody.privateEvents], [0, 0], "no viewer, no count");
  assert.equal(dm.messages.length, 0, "nothing private is relayed");
  // In the app: the player's private note never changes what the DM is told.
  const h = harness();
  h.as("player");
  h.ctx.commit("Bozza privata salvata", () => {}, { local: true, visibility: "private" });
  h.as("dm");
  const html = I.renderSection({
    ...h.ctx,
    view: { page: "campaign", tab: "integrations", id: "discord" },
    get state() {
      return h.ctx.state;
    },
  });
  assert.doesNotMatch(html, /Non inoltrati/);
});

test("review: confirmations show a refused change inside the dialog (webhook, token, feed, sheet link)", () => {
  const h = harness();
  h.ctx.commit("api on", (draft) => {
    draft.ext.integrations.campaigns.lanterns.modules.api = true;
  });
  I.integrationsActions.webhookDialog(h.ctx);
  h.submit({ name: "Annunci", url: "https://hooks.example/a", event: "sessions", active: "on" });
  const hookId = h.rec.webhooks[0].id;
  h.ctx.offline = true;
  I.integrationsActions.confirmDeleteWebhook(h.ctx, hookId);
  // The shell writes a thrown refusal into the open dialog (never a toast behind it).
  assert.throws(() => h.submit({}), /offline/);
  assert.equal(errors(h).length, 0, "no toast hidden behind the modal");
  assert.equal(h.rec.webhooks.length, 1);
  h.ctx.offline = false;
  I.integrationsActions.confirmDeleteWebhook(h.ctx, hookId);
  h.submit({});
  assert.equal(h.rec.webhooks.length, 0);
  // Personal changes stay possible offline and close their confirmation.
  h.as("player");
  h.ctx.offline = true;
  I.integrationsActions.confirmRotateFeed(h.ctx);
  assert.notEqual(h.submit({}), false);
  assert.ok(D.feedOf(h.slice, "player"));
  I.integrationsActions.createToken(h.ctx, "Bot");
  const tokenId = D.tokensOf(h.slice, "player")[0].id;
  I.integrationsActions.confirmRevokeToken(h.ctx, tokenId);
  h.submit({});
  assert.ok(D.tokensOf(h.slice, "player")[0].revokedAt);
  // Removing a shared creature's link offline is refused where the dialog shows it.
  h.ctx.offline = false;
  h.ctx.commit("link", (draft) =>
    D.setSheetLink(
      draft,
      draft.ext.integrations,
      "livia",
      { url: "https://www.dndbeyond.com/characters/1", shared: true },
      "player",
    ),
  );
  h.ctx.offline = true;
  assert.throws(() => I.integrationsActions.removeSheet(h.ctx, "livia"), /offline/);
  assert.ok(h.slice.sheets.livia, "the link stays");
  h.ctx.offline = false;
  I.integrationsActions.removeSheet(h.ctx, "livia");
  assert.equal(h.slice.sheets.livia, undefined);
});

test("review: a paused webhook never delivers afterwards what happened while it was paused", () => {
  const slice = D.seedSlice();
  slice.campaigns.lanterns.modules.api = true;
  const t0 = at("2026-10-01T10:00:00.000Z");
  const id = D.saveWebhook(
    slice,
    "lanterns",
    { name: "Bot", url: "https://hooks.example/x", event: "sessions", active: true },
    "dm",
    t0,
  );
  const session = (sid, minutes) => ({
    id: sid,
    title: sid,
    history: [
      {
        createdAt: new Date(t0 + minutes * 60e3).toISOString(),
        revision: 1,
        status: "scheduled",
        startsAt: "2026-10-10T19:00:00.000Z",
        timeZone: "Europe/Rome",
      },
    ],
  });
  const state = {
    campaign: {
      id: "lanterns",
      name: "L",
      sessions: [session("before", 1), session("paused", 3), session("after", 5)],
    },
    actors: {},
  };
  D.setWebhookActive(slice, "lanterns", id, false, "dm", t0 + 2 * 60e3);
  D.setWebhookActive(slice, "lanterns", id, true, "dm", t0 + 4 * 60e3);
  const hook = slice.campaigns.lanterns.webhooks[0];
  assert.deepEqual(
    D.webhookDeliveries(state, hook)
      .map((d) => d.title)
      .sort(),
    ["after", "before"],
  );
  // The same through the edit dialog's "Active" box, and for a webhook created paused.
  D.saveWebhook(
    slice,
    "lanterns",
    { id, name: "Bot", url: "https://hooks.example/x", event: "sessions", active: false },
    "dm",
    t0 + 6 * 60e3,
  );
  state.campaign.sessions.push(session("edited-off", 7));
  D.saveWebhook(
    slice,
    "lanterns",
    { id, name: "Bot", url: "https://hooks.example/x", event: "sessions", active: true },
    "dm",
    t0 + 8 * 60e3,
  );
  assert.ok(!D.webhookDeliveries(state, hook).some((d) => d.title === "edited-off"));
  const late = D.saveWebhook(
    slice,
    "lanterns",
    { name: "Off", url: "https://hooks.example/y", event: "sessions", active: false },
    "dm",
    t0,
  );
  const off = slice.campaigns.lanterns.webhooks.find((w) => w.id === late);
  D.setWebhookActive(slice, "lanterns", late, true, "dm", t0 + 6 * 60e3);
  assert.deepEqual(
    D.webhookDeliveries(state, off).map((d) => d.title),
    ["edited-off"],
  );
  // Normalization keeps the pauses.
  assert.deepEqual(
    D.normalizeSlice(structuredClone(slice)).campaigns.lanterns.webhooks[0].pauses,
    hook.pauses,
  );
});

test("review: the relay never back-fills: a category switched back on, or a new webhook, starts then", () => {
  const slice = D.seedSlice();
  const rec = slice.campaigns.lanterns;
  const t0 = at("2026-09-10T20:00:00.000Z");
  const time = (minutes) => new Date(t0 + minutes * 60e3).toISOString();
  const roll = (id, minutes, n) =>
    logEntry(id, time(minutes), `Livia · d20: ${n} + 1 = ${n + 1} (digitale)`, {
      controller: "player",
    });
  const state = {
    campaign: { id: "lanterns", sessions: [] },
    log: [roll("r1", 1, 3), roll("r2", 3, 5), roll("r3", 5, 7)],
  };
  const events = { rolls: true, log: true, sessions: true, journal: false };
  const save = (input, minutes) =>
    D.saveRelay(
      slice,
      "lanterns",
      { keepWebhook: true, channel: "tavolo-lanterne", events, ...input },
      "dm",
      t0 + minutes * 60e3,
    );
  save({ events: { ...events, rolls: false } }, 2);
  save({ events }, 4);
  const texts = () =>
    D.relayPreview(state, slice, "lanterns", { viewer: "dm" }).messages.map((m) => m.text);
  assert.deepEqual(texts(), [
    "Livia · Tiro libero: 1d20 [3] + 1 = 4 · dadi digitali",
    "Livia · Tiro libero: 1d20 [7] + 1 = 8 · dadi digitali",
  ]);
  // A note posted to the old channel, then a new webhook: the new channel starts empty.
  D.addRelayNote(slice, "lanterns", "Vecchio canale", "dm", t0 + 6 * 60e3, "n-old");
  save(
    {
      keepWebhook: false,
      webhook: "https://discord.com/api/webhooks/1187400000000000002/nuovo-canale-0002",
    },
    7,
  );
  assert.deepEqual(texts(), []);
  assert.equal(rec.relay.since, time(7));
  // Saving again with the same address (field left empty) keeps the channel history.
  state.log.push(roll("r4", 8, 9));
  save({}, 9);
  assert.deepEqual(texts(), ["Livia · Tiro libero: 1d20 [9] + 1 = 10 · dadi digitali"]);
  assert.deepEqual(
    D.normalizeSlice(structuredClone(slice)).campaigns.lanterns.relay.gaps,
    rec.relay.gaps,
  );
});

test("review: the DM removes the Discord webhook (its secret leaves the app) and can undo it", () => {
  const h = harness();
  assert.throws(
    () => D.removeRelayWebhook(structuredClone(h.slice), "lanterns", "player"),
    /Only the DM/,
  );
  const view = () => ({
    ...h.ctx,
    view: { page: "campaign", tab: "integrations", id: "discord" },
    get state() {
      return h.ctx.state;
    },
  });
  assert.match(I.renderSection(view()), /data-int-relay-remove/);
  I.integrationsActions.confirmRemoveWebhook(h.ctx);
  assert.match(h.dialogs.at(-1).body, /••••0001/);
  h.submit({});
  assert.equal(h.rec.relay.webhook, "");
  assert.equal(h.rec.relay.channel, "tavolo-lanterne", "channel and categories stay");
  assert.match(h.rec.history.at(-1).it, /Webhook Discord rimosso/);
  assert.equal(D.relayPreview(h.ctx.state, h.slice, "lanterns").configured, false);
  let html = I.renderSection(view());
  assert.doesNotMatch(html, /data-int-relay-remove|••••0001/);
  assert.match(html, /data-int-preview-empty/);
  assert.throws(
    () => D.removeRelayWebhook(structuredClone(h.slice), "lanterns", "dm"),
    /No webhook/,
  );
  h.ctx.undo();
  assert.ok(h.rec.relay.webhook.endsWith("0001"), "Undo restores it");
});

test("review: the external-sheet dialog says who reads a link that is not shared", () => {
  const h = harness({ role: "player" });
  I.integrationsActions.sheetDialog(h.ctx, "livia");
  assert.match(h.dialogs.at(-1).body, /chi la gioca e il DM/);
  const en = harness({ role: "player", lang: "en" });
  I.integrationsActions.sheetDialog(en.ctx, "livia");
  assert.match(en.dialogs.at(-1).body, /its player and the DM/);
});

test("review: every dark surface of the area has a light-theme counterpart", async () => {
  const { readFile } = await import("node:fs/promises");
  const css = (await readFile(new URL("../integrations.css", import.meta.url), "utf8")).replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
    selectors: sel
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    body,
  }));
  const dark = (hex) => {
    const n = parseInt(hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex, 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 80;
  };
  const light = new Set(
    rules
      .flatMap((r) => r.selectors)
      .filter((s) => s.startsWith(':root[data-pref-theme="light"] '))
      .map((s) => s.slice(':root[data-pref-theme="light"] '.length)),
  );
  const missing = rules
    .filter((r) => !r.selectors.some((s) => s.startsWith(":root")))
    .filter((r) => {
      const bg = /background:\s*#([0-9a-f]{3,6})\b/i.exec(r.body);
      return bg && dark(bg[1]) && !/(^|;)\s*color:\s*#fff/i.test(r.body);
    })
    .flatMap((r) => r.selectors)
    .filter((s) => !light.has(s));
  assert.deepEqual(missing, []);
});
