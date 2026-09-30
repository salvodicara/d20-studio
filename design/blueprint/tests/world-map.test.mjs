// B42 — World map, calendar and chronicle: domain rules, registry integration with the
// real store, and the UI handlers (render + actions + dialog submissions without a DOM).
// Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { advanceGameTime, previewTimeAdvance } from "../rest-time.mjs";
import { getCampaignEntry, listCampaignEntries } from "../campaign-content.mjs";
import * as C from "../world-calendar.mjs";
import * as D from "../world-map-domain.mjs";
import * as W from "../world-map.mjs";

afterEach(() => W.resetWorldView());

const decode = (s) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
const form = (values) => ({
  get: (k) => (k in values ? (Array.isArray(values[k]) ? values[k][0] : values[k]) : null),
  getAll: (k) => (k in values ? [].concat(values[k]) : []),
});

// Real store + registry + this area, with a ctx shaped like the shell's (app.mjs).
function harness({ lang = "it", role = "dm" } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  assert.equal(registry.use("world-map", W.register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const navigations = [];
  const dialogs = [];
  let opened = 0;
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "campaign", id: "", tab: "world-map", returnTo: "" },
    get state() {
      return store.state;
    },
    esc,
    icon: (name) => `<i data-icon="${name}"></i>`,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate(page, params = {}) {
      navigations.push({ page, ...params });
      this.view = {
        page,
        id: params.id ?? "",
        tab: params.tab ?? "",
        returnTo: params.returnTo ?? "",
      };
    },
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    openGameTime: () => opened++,
    canUndo() {
      const last = store.history.at(-1);
      return !!last && last.controller === this.role && !(this.offline && last.shared);
    },
    undoLabel() {
      const last = store.history.at(-1);
      return last && last.controller === this.role ? last.label : "";
    },
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), { it, en: "You are offline." });
      }
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    toasts,
    navigations,
    dialogs,
    opened: () => opened,
    world: () => registry.slice(store.state, "world-map").campaigns.lanterns,
    store: () => store,
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    section() {
      const c = registry.get("campaign-section", "world-map", ctx);
      assert.ok(c, "section visible to members");
      return c.render(ctx);
    },
    advance(seconds) {
      const role = ctx.role;
      ctx.role = "dm";
      const input = { campaignId: "lanterns", seconds };
      const preview = previewTimeAdvance(store.state, input, "dm");
      ctx.commit("Tempo", (draft) =>
        advanceGameTime(draft, { ...input, id: `t-${Math.random()}` }, "dm", {
          reviewKey: preview.reviewKey,
        }),
      );
      ctx.role = role;
    },
  };
}

test("the slice seeds the Lanterns world; normalize is idempotent and refuses a future version", () => {
  const h = harness();
  const w = h.world();
  assert.equal(w.rootMapId, "valle-di-bruma");
  assert.ok(w.pins.some((p) => p.name === "Porto Grigio" && p.groupId === "citta"));
  assert.equal(w.calendar.moons.length, 2);
  const again = D.normalizeWorld(
    structuredClone(h.registry.slice(h.store().state, "world-map")),
    1,
  );
  assert.deepEqual(again, D.normalizeWorld(again, 1));
  assert.throws(() => D.normalizeWorld({ campaigns: {} }, 2));
  h.reload();
  assert.equal(h.world().pins.length, w.pins.length, "survives a reload");
});

test("regional map: Porto Grigio pin in the Città group, DM-only pin, legend with search", () => {
  const h = harness({ role: "player" });
  const player = decode(h.section());
  assert.match(player, /Mappa del mondo/);
  assert.match(player, /Porto Grigio/);
  assert.match(player, /Città \(2\)/, "legend group lists Bruma and Porto Grigio");
  assert.doesNotMatch(player, /Tana dei goblin/, "DM-only pin never reaches the player");
  assert.match(player, /Cerca un luogo/);
  W.resetWorldView();
  h.ctx.role = "dm";
  const dm = decode(h.section());
  assert.match(dm, /Tana dei goblin/);
  assert.match(dm, /solo DM/);
  // The legend toggles, a group can be hidden and a legend click selects and centres.
  W.runAction(h.ctx, "legend");
  assert.equal(W.worldView().legend, true);
  W.runAction(h.ctx, "group-toggle", { group: "citta" });
  h.section();
  assert.doesNotMatch(decode(h.section()).split("Legenda")[0], /aria-label="Porto Grigio/);
  W.runAction(h.ctx, "legend-pin", { pin: "porto-grigio" });
  assert.equal(W.worldView().selected, "porto-grigio");
  assert.deepEqual(W.worldView().hidden["valle-di-bruma"], [], "selecting shows its group again");
  const panel = decode(h.section());
  assert.match(panel, /Apri la mappa «Porto Grigio»/);
  assert.match(panel, /Storia del luogo \(3\)/);
  assert.match(panel, /Fondazione di Porto Grigio/);
});

test("a pin opens the city map and the breadcrumb returns; DM-only maps stay hidden", () => {
  const h = harness({ role: "player" });
  W.runAction(h.ctx, "open-map", { map: "porto-grigio-citta" });
  assert.deepEqual(h.navigations.at(-1), {
    page: "campaign",
    tab: "world-map",
    id: "map.porto-grigio-citta",
  });
  const city = h.section();
  assert.match(decode(city), /Valle di Bruma/);
  assert.match(city, /data-wm-act="open-map" data-map="valle-di-bruma"/, "breadcrumb back");
  assert.match(decode(city), /Mercato coperto/);
  assert.doesNotMatch(decode(city), /Ingresso delle cripte/);
  h.ctx.navigate("campaign", { tab: "world-map", id: "map.cripte-del-faro" });
  assert.match(decode(h.section()), /Mappa non disponibile/);
  h.ctx.role = "dm";
  W.resetWorldView();
  assert.match(decode(h.section()), /Sala della lanterna nera/);
  const trail = D.mapTrail(h.world(), "cripte-del-faro", "dm").map((s) => s.map.name);
  assert.deepEqual(trail, ["Valle di Bruma", "Porto Grigio", "Cripte del faro"]);
});

test("DM pins: create (rapid), edit, move with undo, duplicate, reveal, delete; players cannot", () => {
  const h = harness();
  W.runAction(h.ctx, "tool", { tool: "pin" });
  W.runAction(h.ctx, "rapid");
  W.submitPin(
    h.ctx,
    form({
      name: "Mulino",
      groupId: "luoghi",
      visibility: "dm",
      description: "",
      entryId: "",
      childMapId: "",
      sceneId: "",
    }),
    { mapId: "valle-di-bruma", x: 500, y: 600 },
  );
  const mill = h.world().pins.find((p) => p.name === "Mulino");
  assert.equal(mill.visibility, "dm");
  assert.equal(W.worldView().tool, "pin", "Rapid keeps the tool on (Kanka CMP-42)");
  assert.equal(
    h.store().state.log.at(-1).visibility,
    "private",
    "a secret pin leaves no shared label",
  );
  assert.throws(
    () =>
      W.submitPin(h.ctx, form({ name: " ", groupId: "luoghi", visibility: "all" }), {
        mapId: "valle-di-bruma",
      }),
    /Dai un nome/,
  );
  assert.throws(
    () =>
      W.submitPin(
        h.ctx,
        form({ name: "Loop", groupId: "luoghi", visibility: "all", childMapId: "valle-di-bruma" }),
        { mapId: "valle-di-bruma" },
      ),
    /non può aprire la sua mappa/,
  );
  // Move (drag autosave) and Undo.
  const before = { x: mill.x, y: mill.y };
  h.ctx.commit("Spillo spostato", (draft) =>
    D.movePin(h.registry.slice(draft, "world-map").campaigns.lanterns, "dm", mill.id, 5000, -20),
  );
  const moved = h.world().pins.find((p) => p.id === mill.id);
  assert.deepEqual([moved.x, moved.y], [1200, 0], "clamped inside the map");
  h.ctx.undo();
  const back = h.world().pins.find((p) => p.id === mill.id);
  assert.deepEqual({ x: back.x, y: back.y }, before);
  // Duplicate, reveal, delete (confirmed) and the player refusal.
  W.runAction(h.ctx, "pin-duplicate", { pin: mill.id });
  assert.ok(h.world().pins.some((p) => p.name === "Mulino (copia)"));
  W.runAction(h.ctx, "pin-visibility", { pin: mill.id, to: "all" });
  assert.equal(h.world().pins.find((p) => p.id === mill.id).visibility, "all");
  W.runAction(h.ctx, "pin-delete", { pin: mill.id });
  h.dialogs.at(-1).options.onSubmit();
  assert.ok(!h.world().pins.some((p) => p.id === mill.id));
  h.ctx.role = "player";
  W.runAction(h.ctx, "pin-duplicate", { pin: "bruma" });
  assert.match(h.toasts.at(-1).text, /Solo il DM/);
});

test("creating the place entry from the pin links it; the entry shows the map and history", () => {
  const h = harness();
  W.runAction(h.ctx, "select-pin", { pin: "porto-grigio" });
  assert.match(decode(h.section()), /Crea la voce del luogo/);
  W.submitEntryCreate(
    h.ctx,
    "porto-grigio",
    form({ title: "Porto Grigio", body: "Città del sale.", access: "campaign" }),
  );
  const pin = h.world().pins.find((p) => p.id === "porto-grigio");
  assert.ok(pin.entryId);
  const entry = getCampaignEntry(h.store().state, pin.entryId, "player");
  assert.equal(entry.data.worldType, "place");
  assert.equal(entry.data.title, "Porto Grigio");
  h.ctx.role = "player";
  const box = h.registry
    .list("campaign-section", h.ctx, entry)
    .find((c) => c.id === "world-map.entry");
  assert.ok(box, "world entry box appears for the linked entry");
  const html = decode(box.render(h.ctx, entry));
  assert.match(html, /Sulla mappa/);
  assert.match(html, /Il grande incendio del porto/);
  W.runAction(h.ctx, "select-pin", { pin: "porto-grigio" }); // a role change clears selection
  assert.match(decode(h.section()), /Apri la voce/);
  W.runAction(h.ctx, "open-entry", { entry: entry.id, pin: pin.id });
  const nav = h.navigations.at(-1);
  assert.equal(nav.tab, "entry");
  assert.deepEqual(JSON.parse(nav.returnTo), {
    page: "campaign",
    tab: "world-map",
    id: "map.valle-di-bruma.porto-grigio",
  });
  // A DM-only entry linked to a visible pin stays unreadable to the player.
  h.ctx.role = "dm";
  W.submitEntryCreate(h.ctx, "bruma", form({ title: "Bruma (appunti)", body: "", access: "dms" }));
  const bruma = h.world().pins.find((p) => p.id === "bruma");
  assert.throws(() => getCampaignEntry(h.store().state, bruma.entryId, "player"));
  h.ctx.role = "player";
  W.runAction(h.ctx, "select-pin", { pin: "bruma" });
  // The link alone reveals nothing (F-039): the player reads "no linked entry".
  assert.match(decode(h.section()), /Voce collegata Nessuna voce collegata\./);
});

test("measure with waypoints: legs, total and days per 2024 travel pace, terrain and roads", () => {
  const h = harness({ role: "player" });
  h.section();
  W.runAction(h.ctx, "tool", { tool: "measure" });
  for (const pin of ["bruma", "ponte-di-pietra", "porto-grigio"])
    W.runAction(h.ctx, "measure-add", { pin });
  let html = decode(h.section());
  assert.match(html, /Bruma → Ponte di pietra/);
  assert.match(html, /48 km/);
  assert.match(html, /Totale: 112 km/);
  assert.match(
    html,
    /Normale 36 km 3 giorni e 1 h Svantaggio alle prove di Destrezza \(Furtività\)\./,
  );
  assert.match(html, /SRD 5\.2\.1 · p\. 13/);
  W.runAction(h.ctx, "terrain", { value: "hill" });
  html = decode(h.section());
  assert.match(html, /Veloce 45 km Non consentito su questo terreno/);
  W.runAction(h.ctx, "road", { value: true });
  assert.doesNotMatch(decode(h.section()), /Non consentito/, "a good road raises the maximum pace");
  W.runAction(h.ctx, "measure-back");
  assert.match(decode(h.section()), /Totale: 48 km · in corso/);
  W.runAction(h.ctx, "measure-finish");
  assert.equal(W.worldView().measure.done, true);
  // English readers get miles from the English SRD table.
  h.ctx.lang = "en";
  assert.match(decode(h.section()), /Total: 32 miles/);
  assert.match(decode(h.section()), /Normal 24 miles 1 day and 2\.5 h Disadvantage on Dexterity/);
  // The estimate never moved the shared clock.
  assert.equal(D.clockSeconds(h.store().state, "lanterns"), 0);
  const estimate = D.travelEstimate(24, {});
  assert.equal(estimate.find((r) => r.id === "normal").hours, 24 / 4.5);
});

test("the calendar date is the Table clock: eight hours at the Table update it", () => {
  const h = harness({ role: "player" });
  h.ctx.navigate("campaign", { tab: "world-map", id: "calendar" });
  let html = decode(h.section());
  assert.match(html, /Alba 14 Nebbie 1287 E\.L\./);
  assert.match(html, /08:00/);
  assert.match(html, /Vela: Primo quarto/);
  assert.match(html, /Cinerea: Luna calante/);
  assert.match(html, /Autunno/);
  h.advance(8 * 3600);
  html = decode(h.section());
  assert.match(html, /16:00/);
  h.advance(8 * 3600);
  assert.match(decode(h.section()), /Remo 15 Nebbie 1287/);
  // The Table tab shows the same date; the DM's button opens the shared time dialog.
  h.ctx.role = "dm";
  const tab = h.registry.list("table-panel", h.ctx, {}).find((c) => c.id === "world-map-calendar");
  assert.equal(tab.placement, "sidebar-tab");
  assert.match(decode(tab.render(h.ctx, {})), /Remo 15 Nebbie 1287/);
  W.runAction(h.ctx, "advance");
  assert.equal(h.opened(), 1);
  h.ctx.role = "player";
  assert.doesNotMatch(
    tab.render(h.ctx, {}),
    /data-wm-act="advance"/,
    "players cannot advance time",
  );
});

test("DM-only 'Eclissi' with a reminder: reached by game time, then revealed to the player", () => {
  const h = harness();
  W.submitEvent(
    h.ctx,
    form({
      title: "Eclissi",
      year: "1287",
      month: "nebbie",
      day: "14",
      time: "15:00",
      recurrence: "none",
      visibility: "dm",
      pinId: "osservatorio",
      lead: "0",
      audience: "viewers",
      description: "Vela copre Cinerea.",
    }),
  );
  const eclipse = h.world().events.find((e) => e.title === "Eclissi");
  assert.equal(eclipse.visibility, "dm");
  assert.equal(h.store().state.log.at(-1).visibility, "private");
  assert.deepEqual(W.pendingReminders(h.ctx), [], "not reached yet");
  h.advance(8 * 3600);
  const due = W.pendingReminders(h.ctx);
  assert.deepEqual(
    due.map((r) => r.event.title),
    ["Eclissi"],
  );
  const notices = h.registry.notifications(h.ctx).filter((n) => n.id.startsWith("world-map-"));
  assert.equal(notices.length, 1);
  assert.equal(notices[0].category, "reminders");
  assert.match(notices[0].title.it, /Promemoria: Eclissi/);
  h.ctx.navigate("campaign", { tab: "world-map", id: "calendar" });
  assert.match(decode(h.section()), /Promemoria arrivati Eclissi/);
  // Player: nothing about it.
  h.ctx.role = "player";
  assert.doesNotMatch(decode(h.section()), /Eclissi/);
  assert.deepEqual(W.pendingReminders(h.ctx), []);
  // Reveal: the player sees the event, without a retroactive reminder.
  h.ctx.role = "dm";
  W.runAction(h.ctx, "event-reveal", { event: eclipse.id });
  h.ctx.role = "player";
  W.runAction(h.ctx, "cal-today");
  assert.match(decode(h.section()), /Eclissi/);
  assert.deepEqual(W.pendingReminders(h.ctx), []);
  // The DM marks it seen: gone from the calendar and the notification centre.
  h.ctx.role = "dm";
  W.runAction(h.ctx, "ack", { key: due[0].key });
  assert.deepEqual(W.pendingReminders(h.ctx), []);
  assert.equal(
    h.registry.notifications(h.ctx).filter((n) => n.id.startsWith("world-map-")).length,
    0,
  );
  // The chronicle and the observatory's history show it.
  const history = D.eventsForPin(h.world(), "osservatorio", "player").map((e) => e.title);
  assert.ok(history.includes("Eclissi"));
});

test("a player's private event is never readable by the DM and works offline", () => {
  const h = harness({ role: "player" });
  h.ctx.offline = true;
  W.submitEvent(
    h.ctx,
    form({
      title: "Comprare corda",
      year: "1287",
      month: "nebbie",
      day: "15",
      time: "",
      recurrence: "none",
      visibility: "private",
      pinId: "mercato-coperto",
      lead: "",
      audience: "viewers",
      description: "Solo io lo so.",
    }),
  );
  assert.ok(h.world().events.some((e) => e.title === "Comprare corda"));
  assert.throws(
    () =>
      W.submitEvent(
        h.ctx,
        form({
          title: "Per tutti",
          year: "1287",
          month: "nebbie",
          day: "15",
          visibility: "all",
          lead: "",
        }),
      ),
    /senza rete/,
  );
  h.ctx.offline = false;
  h.ctx.navigate("campaign", { tab: "world-map", id: "calendar" });
  W.runAction(h.ctx, "cal-day", {
    day: C.absDay(h.world().calendar, { year: 1287, month: "nebbie", day: 15 }),
  });
  assert.match(decode(h.section()), /Comprare corda/);
  assert.match(decode(h.section()), /Solo io/);
  h.ctx.role = "dm";
  const dm = decode(h.section());
  assert.doesNotMatch(dm, /Comprare corda|Incontro con la capitana/);
  assert.equal(
    D.visibleEvents(h.world(), "dm").some((e) => e.visibility === "private"),
    false,
  );
  assert.equal(D.searchWorld(h.world(), "dm", "corda").length, 0);
  // The seeded private reminder reaches its owner only.
  h.ctx.role = "player";
  h.advance(2 * 86400 + 3 * 3600);
  assert.ok(
    W.pendingReminders(h.ctx).some((r) => r.event.title === "Incontro con la capitana del porto"),
  );
  h.ctx.role = "dm";
  assert.ok(!W.pendingReminders(h.ctx).some((r) => r.event.owner === "player"));
});

test("editing a date readers already see needs a reason; recurrence and deletion with undo", () => {
  const h = harness();
  const fair = h.world().events.find((e) => e.id === "fiera-lanterne");
  const base = {
    title: fair.title,
    year: "1287",
    month: "nebbie",
    day: "18",
    time: "",
    recurrence: "yearly",
    visibility: "all",
    pinId: "porto-grigio",
    lead: "1",
    audience: "viewers",
    description: fair.description,
  };
  assert.throws(
    () => W.submitEvent(h.ctx, form({ ...base, reason: "" }), { eventId: fair.id }),
    /motivo/,
  );
  W.submitEvent(h.ctx, form({ ...base, reason: "Pioggia: rinviata di due giorni" }), {
    eventId: fair.id,
  });
  const moved = h.world().events.find((e) => e.id === fair.id);
  assert.equal(moved.date.day, 18);
  assert.equal(moved.corrections.at(-1).reason, "Pioggia: rinviata di due giorni");
  h.ctx.role = "player";
  h.ctx.navigate("campaign", { tab: "world-map", id: `calendar.${fair.id}` });
  assert.match(decode(h.section()), /Data corretta: Pioggia/);
  // Players cannot edit the DM's events.
  assert.throws(
    () =>
      W.submitEvent(h.ctx, form({ ...base, visibility: "all", reason: "x" }), { eventId: fair.id }),
    /Solo chi ha creato/,
  );
  h.ctx.role = "dm";
  W.runAction(h.ctx, "event-delete", { event: fair.id });
  h.dialogs.at(-1).options.onSubmit();
  assert.ok(!h.world().events.some((e) => e.id === fair.id));
  W.runAction(h.ctx, "undo");
  assert.ok(
    h.world().events.some((e) => e.id === fair.id),
    "Undo restores the deleted event",
  );
});

test("calendar settings: months, moons and start date; corrections need a reason", () => {
  const h = harness();
  const cal = h.world().calendar;
  const base = {
    name: cal.name,
    "month-id": cal.months.map((m) => m.id),
    "month-name": cal.months.map((m) => m.name),
    "month-days": cal.months.map((m) => String(m.days)),
    "weekday-id": cal.weekdays.map((d) => d.id),
    "weekday-name": cal.weekdays.map((d) => d.name),
    "moon-id": cal.moons.map((m) => m.id),
    "moon-name": cal.moons.map((m) => m.name),
    "moon-cycle": cal.moons.map((m) => String(m.cycle)),
    "moon-offset": cal.moons.map((m) => String(m.offset)),
    "moon-color": cal.moons.map((m) => m.color),
    "season-id": cal.seasons.map((s) => s.id),
    "season-name": cal.seasons.map((s) => s.name),
    "season-startMonth": cal.seasons.map((s) => s.startMonth),
    epochDay: "14",
    epochMonth: "nebbie",
    epochYear: "1287",
    epochTime: "08:00",
    reason: "",
  };
  // A third moon is added; nothing else changes.
  W.submitCalendar(
    h.ctx,
    form({
      ...base,
      "moon-id": [...base["moon-id"], ""],
      "moon-name": [...base["moon-name"], "Spina"],
      "moon-cycle": [...base["moon-cycle"], "40"],
      "moon-offset": [...base["moon-offset"], "5"],
      "moon-color": [...base["moon-color"], "#99ccff"],
    }),
  );
  assert.equal(h.world().calendar.moons.length, 3);
  // Removing a month still used by an event is refused, naming the event.
  const i = base["month-id"].indexOf("solleone");
  const without = (key) => base[key].filter((_, j) => j !== i);
  assert.throws(
    () =>
      W.submitCalendar(
        h.ctx,
        form({
          ...base,
          "month-id": without("month-id"),
          "month-name": without("month-name"),
          "month-days": without("month-days"),
          "season-startMonth": base["season-startMonth"].map((m) =>
            m === "solleone" ? "messi" : m,
          ),
        }),
      ),
    /Il grande incendio del porto/,
  );
  // Moving the start date moves today and needs a reason.
  assert.throws(() => W.submitCalendar(h.ctx, form({ ...base, epochDay: "20" })), /motivo/);
  W.submitCalendar(
    h.ctx,
    form({ ...base, epochDay: "20", reason: "Il viaggio è durato sei giorni" }),
  );
  const now = D.worldNow(h.store().state, h.world());
  assert.equal(now.date.day, 20);
  assert.equal(h.world().calendar.corrections.at(-1).reason, "Il viaggio è durato sei giorni");
  h.ctx.role = "player";
  assert.throws(() => W.submitCalendar(h.ctx, form({ ...base })), /Solo il DM/);
});

test("chronicle with eras shows history by era, place filter and the present marker", () => {
  const h = harness({ role: "player" });
  h.ctx.navigate("campaign", { tab: "world-map", id: "timeline" });
  let html = decode(h.section());
  assert.match(html, /Età del Silenzio/);
  assert.match(html, /La caduta delle antiche torri/);
  assert.match(html, /Età delle Lanterne/);
  assert.match(html, /Adesso/);
  assert.doesNotMatch(html, /Il patto delle sentinelle/, "DM-only history stays hidden");
  // The pin's history opens the chronicle filtered by place (World Anvil CMP-79).
  W.runAction(h.ctx, "pin-history", { pin: "porto-grigio" });
  html = decode(h.section());
  assert.match(html, /Storia di «Porto Grigio»/);
  assert.doesNotMatch(html, /La caduta delle antiche torri/);
  // DM: eras editor refuses two eras starting in the same year, accepts a new one.
  h.ctx.role = "dm";
  const eras = h.world().calendar.eras;
  const rows = (extra) =>
    form({
      "era-id": [...eras.map((e) => e.id), ""],
      "era-name": [...eras.map((e) => e.name), extra.name],
      "era-abbr": [...eras.map((e) => e.abbr), extra.abbr],
      "era-startYear": [...eras.map((e) => String(e.startYear)), extra.year],
    });
  assert.throws(
    () => W.submitEras(h.ctx, rows({ name: "Doppia", abbr: "D", year: "1001" })),
    /stesso anno/,
  );
  W.submitEras(h.ctx, rows({ name: "Età del Sale", abbr: "E.Sa.", year: "1034" }));
  assert.equal(C.formatYear(h.world().calendar, 1100), "1100 E.Sa.");
});

test("groups, maps and search: used groups are kept, a map deletes with undo", () => {
  const h = harness();
  assert.throws(
    () =>
      W.submitGroups(
        h.ctx,
        form({ "group-id": ["citta"], "group-name": ["Città"], "group-color": ["#dfbd78"] }),
      ),
    /ancora in uso/,
  );
  W.submitGroups(
    h.ctx,
    form({
      "group-id": [...h.world().groups.map((g) => g.id), ""],
      "group-name": [...h.world().groups.map((g) => g.name), "Rovine"],
      "group-color": [...h.world().groups.map((g) => g.color), "#aa88cc"],
    }),
  );
  assert.ok(h.world().groups.some((g) => g.name === "Rovine"));
  // A new map from a pin becomes that pin's map (LegendKeeper nesting).
  W.submitMap(
    h.ctx,
    form({
      name: "Ponte (pianta)",
      widthKm: "0.2",
      art: "parchment",
      background: "",
      visibility: "all",
    }),
    { fromPinId: "ponte-di-pietra" },
  );
  const bridge = h.world().pins.find((p) => p.id === "ponte-di-pietra");
  assert.ok(bridge.childMapId);
  assert.match(h.navigations.at(-1).id, /^map\./);
  assert.throws(
    () => W.submitMap(h.ctx, form({ name: "X", widthKm: "0", art: "valley", visibility: "all" })),
    /larghezza reale/,
  );
  assert.throws(
    () =>
      W.submitMap(
        h.ctx,
        form({
          name: "X",
          widthKm: "5",
          art: "valley",
          background: "data:text/plain;base64,AAAA",
          visibility: "all",
        }),
      ),
    /PNG, JPEG o WebP/,
  );
  // Deleting the root map is refused; deleting the city removes its pins, undo restores.
  W.runAction(h.ctx, "map-delete", { map: "valle-di-bruma" });
  assert.throws(() => h.dialogs.at(-1).options.onSubmit(), /mappa principale/);
  W.runAction(h.ctx, "map-delete", { map: "porto-grigio-citta" });
  h.dialogs.at(-1).options.onSubmit();
  assert.ok(!h.world().pins.some((p) => p.mapId === "porto-grigio-citta"));
  assert.equal(h.world().pins.find((p) => p.id === "porto-grigio").childMapId, null);
  h.ctx.undo();
  assert.equal(
    h.world().pins.find((p) => p.id === "porto-grigio").childMapId,
    "porto-grigio-citta",
  );
  // Search: players find visible places and events, never DM-only ones.
  h.ctx.role = "player";
  const found = h.registry.search(h.ctx, "porto").map((r) => h.ctx.label(r.title));
  assert.ok(found.includes("Porto Grigio"));
  assert.ok(found.includes("Il grande incendio del porto"));
  assert.equal(h.registry.search(h.ctx, "goblin").length, 0);
  h.ctx.role = "dm";
  assert.ok(h.registry.search(h.ctx, "goblin").some((r) => r.title === "Tana dei goblin"));
});

test("EN phone reader: labels translate, authored names stay, commands are registered", () => {
  const h = harness({ role: "player", lang: "en" });
  const html = decode(h.section());
  assert.match(html, /Map and calendar/);
  assert.match(html, /World map/);
  assert.match(html, /Legend/);
  assert.match(html, /Porto Grigio/);
  assert.ok(h.registry.get("command", "world-map.open-calendar", h.ctx));
  h.registry.get("command", "world-map.open-calendar", h.ctx).run(h.ctx);
  assert.deepEqual(h.navigations.at(-1), { page: "campaign", tab: "world-map", id: "calendar" });
  assert.equal(W.distanceText(h.ctx, 0.15), "500 ft");
  assert.equal(W.distanceText(h.ctx, 30), "20 miles");
  h.ctx.lang = "it";
  assert.equal(W.distanceText(h.ctx, 0.15), "150 m");
  assert.equal(W.travelText(h.ctx, { hours: 0.5, days: 0, restHours: 0.5 }), "30 min");
});

// ------------------------------------------------------------------ review fixes (B42 review)
const calendarForm = (cal, extra = {}) => ({
  name: cal.name,
  "month-id": cal.months.map((m) => m.id),
  "month-name": cal.months.map((m) => m.name),
  "month-days": cal.months.map((m) => String(m.days)),
  "weekday-id": cal.weekdays.map((d) => d.id),
  "weekday-name": cal.weekdays.map((d) => d.name),
  "moon-id": cal.moons.map((m) => m.id),
  "moon-name": cal.moons.map((m) => m.name),
  "moon-cycle": cal.moons.map((m) => String(m.cycle)),
  "moon-offset": cal.moons.map((m) => String(m.offset)),
  "moon-color": cal.moons.map((m) => m.color),
  "season-id": cal.seasons.map((s) => s.id),
  "season-name": cal.seasons.map((s) => s.name),
  "season-startMonth": cal.seasons.map((s) => s.startMonth),
  epochDay: String(cal.epoch.day),
  epochMonth: cal.epoch.month,
  epochYear: String(cal.epoch.year),
  epochTime: C.formatTime(cal.epoch),
  reason: "",
  ...extra,
});

test("review: refusing a calendar change never names a player's private event to the DM", () => {
  const h = harness();
  const cal = h.world().calendar;
  const base = calendarForm(cal);
  const nebbie = base["month-id"].indexOf("nebbie");
  // Nebbie shortened to 15 days: the DM's "Fiera delle lanterne" (16) and Livia's private
  // "Incontro con la capitana del porto" (17) would no longer exist.
  const days = base["month-days"].map((d, i) => (i === nebbie ? "15" : d));
  let message = "";
  try {
    W.submitCalendar(h.ctx, form({ ...base, "month-days": days }));
  } catch (error) {
    message = `${error.it} | ${error.en}`;
  }
  assert.match(message, /Fiera delle lanterne/, "the DM's own event is named");
  assert.doesNotMatch(message, /capitana/, "the private title is never shown to the DM");
  assert.match(message, /1 evento privato di un giocatore/);
  assert.match(message, /1 private event of a player/);
  assert.equal(h.world().calendar.months[nebbie].days, 30, "nothing changed");
});

test("review: a timeline route naming a DM-only place shows nothing of it to the player", () => {
  const h = harness();
  h.ctx.navigate("campaign", { tab: "world-map", id: "timeline.tana-goblin" });
  assert.match(decode(h.section()), /Storia di «Tana dei goblin»/, "the DM reads it");
  h.ctx.role = "player"; // same route after a role change (or a shared link)
  const html = decode(h.section());
  assert.doesNotMatch(html, /Tana dei goblin/);
  assert.doesNotMatch(html, /Storia di/);
  assert.equal(W.worldView().place, "", "the filter falls back to every place");
  // Even an event everyone reads, tied to the DM-only place, is not listed as its history.
  h.ctx.role = "dm";
  W.submitEvent(
    h.ctx,
    form({
      title: "Fumo sulle montagne",
      year: "1287",
      month: "nebbie",
      day: "10",
      time: "",
      recurrence: "none",
      visibility: "all",
      pinId: "tana-goblin",
      lead: "",
      audience: "viewers",
      description: "",
    }),
  );
  h.ctx.role = "player";
  h.ctx.navigate("campaign", { tab: "world-map", id: "timeline.tana-goblin" });
  const again = decode(h.section());
  assert.match(again, /Fumo sulle montagne/, "the public event stays in the full chronicle");
  assert.doesNotMatch(again, /Tana dei goblin/);
});

test("review: a pin linked to an entry the player cannot read does not reveal the link", () => {
  const h = harness();
  W.submitEntryCreate(h.ctx, "bruma", form({ title: "Bruma (appunti)", body: "", access: "dms" }));
  h.ctx.role = "player";
  W.runAction(h.ctx, "select-pin", { pin: "bruma" });
  const html = decode(h.section());
  assert.doesNotMatch(html, /non è condivisa/);
  assert.match(html, /Voce collegata Nessuna voce collegata\./);
  h.ctx.lang = "en";
  assert.doesNotMatch(decode(h.section()), /not shared with you/);
});

test("review: whole travel days follow the SRD Day column, the rest of the way its Hour column", () => {
  const row = (km, id, opts) => D.travelEstimate(km, opts).find((r) => r.id === id);
  // 112 km: Fast 45 km/day → 2 days + 22 km at 6 km/h; Slow 27 km/day → 4 days + 4 km at 3 km/h.
  const fast = row(112, "fast");
  assert.equal(fast.days, 2);
  assert.ok(Math.abs(fast.restHours - 22 / 6) < 1e-9);
  const slow = row(112, "slow");
  assert.equal(slow.days, 4);
  assert.ok(Math.abs(slow.restHours - 4 / 3) < 1e-9);
  const normal = row(112, "normal");
  assert.equal(normal.days, 3);
  assert.ok(Math.abs(normal.restHours - 4 / 4.5) < 1e-9);
  // Exactly one day's distance is one day; a Slow remainder that the Hour column would
  // stretch past 8 hours still fits inside the next day (27 km a day).
  assert.deepEqual([row(45, "fast").days, row(45, "fast").restHours], [1, 0]);
  assert.deepEqual([row(26, "slow").days, row(26, "slow").restHours], [1, 0]);
  const h = harness({ role: "player" });
  h.section();
  W.runAction(h.ctx, "tool", { tool: "measure" });
  for (const pin of ["bruma", "ponte-di-pietra", "porto-grigio"])
    W.runAction(h.ctx, "measure-add", { pin });
  const html = decode(h.section());
  assert.match(html, /Veloce 45 km 2 giorni e 3,5 h/);
  assert.match(html, /Normale 36 km 3 giorni e 1 h/);
  // The route is 111.6 km: Slow = 4 days + 3.6 km at 3 km/h ≈ 1 h.
  assert.match(html, /Lento 27 km 4 giorni e 1 h/);
});

test("review: editing the months keeps reminders on game time (stored instants are rebased)", () => {
  const h = harness();
  W.submitEvent(
    h.ctx,
    form({
      title: "Eclissi",
      year: "1287",
      month: "nebbie",
      day: "14",
      time: "15:00",
      recurrence: "none",
      visibility: "dm",
      pinId: "",
      lead: "0",
      audience: "viewers",
      description: "",
    }),
  );
  // Lunganotte loses a day: every absolute instant of the calendar moves.
  const base = calendarForm(h.world().calendar);
  const last = base["month-id"].indexOf("lunganotte");
  W.submitCalendar(
    h.ctx,
    form({ ...base, "month-days": base["month-days"].map((d, i) => (i === last ? "30" : d)) }),
  );
  assert.equal(D.worldNow(h.store().state, h.world()).date.day, 14, "today is unchanged");
  assert.deepEqual(W.pendingReminders(h.ctx), [], "nothing fires by editing");
  h.advance(8 * 3600);
  assert.deepEqual(
    W.pendingReminders(h.ctx).map((r) => r.event.title),
    ["Eclissi"],
    "the reminder still fires when game time reaches it",
  );
  // Moving the start date is a correction, not time passing: an event it jumps over does
  // not fire a reminder, and the correction instant is recorded on the same clock.
  W.runAction(h.ctx, "ack", { key: W.pendingReminders(h.ctx)[0].key });
  W.submitEvent(
    h.ctx,
    form({
      title: "Marea alta",
      year: "1287",
      month: "nebbie",
      day: "15",
      time: "09:00",
      recurrence: "none",
      visibility: "dm",
      pinId: "",
      lead: "0",
      audience: "viewers",
      description: "",
    }),
  );
  const moved = calendarForm(h.world().calendar, { epochDay: "16", reason: "Date sbagliate" });
  W.submitCalendar(h.ctx, form(moved));
  assert.deepEqual(W.pendingReminders(h.ctx), []);
  const correction = h.world().calendar.corrections.at(-1);
  assert.equal(correction.at, D.worldNow(h.store().state, h.world()).abs);
});

test("review: the map width is asked in the reader's unit", () => {
  const h = harness({ lang: "en" });
  h.section();
  W.runAction(h.ctx, "map-settings", { map: "valle-di-bruma" });
  const body = decode(h.dialogs.at(-1).body);
  assert.match(body, /Real width of the map \(miles\)/);
  assert.match(h.dialogs.at(-1).body, /name="width" [^>]*value="160"/);
  W.submitMap(
    h.ctx,
    form({ name: "Valle di Bruma", width: "100", art: "valley", visibility: "all" }),
    { mapId: "valle-di-bruma" },
  );
  const map = h.world().maps.find((m) => m.id === "valle-di-bruma");
  assert.ok(Math.abs(map.width * map.kmPerUnit - 150) < 1e-9, "100 miles = 150 km");
  h.ctx.lang = "it";
  W.runAction(h.ctx, "map-settings", { map: "valle-di-bruma" });
  assert.match(decode(h.dialogs.at(-1).body), /Larghezza reale della mappa \(km\)/);
  assert.match(h.dialogs.at(-1).body, /name="width" [^>]*value="150"/);
});

test("review: on a touch screen the pin hint does not ask for a right-click", () => {
  const saved = globalThis.matchMedia;
  globalThis.matchMedia = (q) => ({ matches: q.includes("coarse") });
  try {
    const h = harness();
    h.section();
    W.runAction(h.ctx, "tool", { tool: "pin" });
    const html = decode(h.section());
    assert.doesNotMatch(html, /Clic destro/);
    assert.match(html, /Tocca la mappa per posare uno spillo/);
  } finally {
    if (saved) globalThis.matchMedia = saved;
    else delete globalThis.matchMedia;
  }
});
