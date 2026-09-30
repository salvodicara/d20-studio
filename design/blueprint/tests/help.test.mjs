// B30 — Help: page help ("?"), first-occurrence tips with archive and reset, guided tours
// with progress, what's new, and the area registration (service, commands, settings,
// notifications, search). Real store and registry; synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as H from "../help.mjs";
import * as D from "../home-domain.mjs";
import { normalizeShortcut } from "../registry.mjs";
import { harness, mount, slotHTML } from "./home-harness.mjs";

test("registration: route replacement, header help service, tips, settings, commands and search", async () => {
  const h = await harness();
  const { registry, ctx } = h;
  assert.equal(registry.get("route", "home", ctx).replaces, true);
  const service = registry.get("service", "home-help", ctx);
  assert.equal(service.header, true);
  assert.equal(service.icon, "help");
  assert.equal(registry.get("home-widget", "appointment", ctx).replaces, true);
  // Tips are a pop-up, not an inspector panel or a sheet box; the level-up signal is a tab.
  assert.equal(registry.get("table-panel", "home-tip"), null);
  assert.equal(registry.get("sheet-section", "home-tip-sheet"), null);
  assert.ok(registry.get("sheet-tab", "home-levelup"));
  const help = registry.list("command", ctx).find((c) => c.id === "home.help");
  assert.equal(help.shortcut, "F1");
  assert.equal(registry.commandForKey({ key: "F1" }, ctx)?.id, "home.help");
  assert.equal(normalizeShortcut("f1"), "F1");
  assert.equal(registry.conflicts().length, 0);
  // Owner decision I-236 (3): first-occurrence tips stay off by default, help on request;
  // SV-48 keeps them findable (help «?» › Suggerimenti: on/off, reset, archive).
  assert.equal(registry.getSetting(ctx, H.TIPS_SETTING), false);
  assert.equal(registry.getSetting(ctx, "home-previews.news-bell"), false);
  assert.deepEqual(
    registry.search(ctx, "novit").map((r) => r.page),
    registry.search(ctx, "novit").map(() => "home"),
  );
  assert.ok(registry.search(ctx, "segnala").some((r) => r.params.tab === "support"));
  assert.equal(registry.search(ctx, "x").length, 0);
  // Running the service opens the page help in the common dialog.
  ctx.view = { page: "table", id: "", tab: "" };
  registry.run(service, ctx);
  assert.equal(h.dialogs.at(-1).title, "Aiuto · Tavolo");
  assert.equal(h.dialogs.at(-1).options.cancelLabel, "Torna alla pagina");
  assert.equal(h.navigations.length, 0, "help never leaves the page");
});

test("page help (FG '?'): content per page, sheet vs list; area pages built from what the area registers", async () => {
  const h = await harness({ lang: "en" });
  const key = (view) => {
    h.ctx.view = { page: "home", id: "", tab: "", ...view };
    return H.helpKey(h.ctx);
  };
  assert.equal(key({ page: "characters" }), "characters");
  assert.equal(key({ page: "characters", id: "livia" }), "sheet");
  assert.equal(key({ page: "preparation" }), "preparation");
  assert.equal(key({ page: "account" }), "area");
  h.ctx.view = { page: "table", id: "", tab: "" };
  const body = H.helpBody(h.ctx);
  assert.match(body, /What you can do here/);
  assert.match(body, /data-home-help-tour="table"/);
  assert.match(body, /Report a problem/);
  // An area page: its description, its commands with shortcuts, where else it appears.
  assert.equal(
    h.registry.use("fixture-area", (api) => {
      api.add("route", {
        id: "fixture-area",
        label: { it: "Area di prova", en: "Test area" },
        description: { it: "Tavoli di prova e inviti.", en: "Test tables and invitations." },
        render: () => "<p>x</p>",
      });
      api.add("command", {
        id: "fixture-area.open",
        label: { it: "Apri un tavolo di prova", en: "Open a test table" },
        shortcut: "Mod+Shift+J",
        context: "fixture-area",
        run() {},
      });
      api.add("campaign-section", {
        id: "fixture-area",
        label: { it: "Inviti di prova", en: "Test invitations" },
        render: () => "",
      });
    }).status,
    "built",
  );
  h.ctx.view = { page: "fixture-area", id: "", tab: "" };
  const area = H.helpContent(h.ctx);
  assert.equal(area.key, "area");
  assert.deepEqual(area.title, { it: "Test area", en: "Test area" });
  const html = H.helpBody(h.ctx);
  assert.match(html, /Test tables and invitations\./);
  assert.match(html, /Commands of this area/);
  assert.match(html, /Open a test table — (Ctrl\+Shift\+J|⌘⇧J)/);
  assert.match(html, /Also found in/);
  assert.match(html, /Campaign › Test invitations/);
  assert.doesNotMatch(html, /described on the buttons themselves/);
  h.ctx.view = { page: "home-unknown", id: "", tab: "" };
  assert.equal(H.helpContent(h.ctx).key, "area");
  assert.match(H.helpBody(h.ctx), /adds no keyboard commands/);
});

test("tips (BG3): a pop-up at the first occurrence, archived when shown, most specific first; off switch; per identity", async () => {
  const h = await harness();
  const { ctx } = h;
  // I-236 (3): off by default; while off nothing pops up until it is turned on.
  assert.equal(H.tipsEnabled(ctx), false);
  assert.equal(H.pendingTip(ctx, "table"), null);
  ctx.registry.setSetting(ctx, H.TIPS_SETTING, false);
  assert.equal(H.pendingTip(ctx, "table"), null);
  ctx.view = { page: "table", id: "", tab: "" };
  assert.equal(H.syncTips(ctx), null);
  assert.equal(H.currentPop(), null);
  ctx.view = { page: "home", id: "", tab: "" };
  ctx.registry.setSetting(ctx, H.TIPS_SETTING, true);
  const log = ctx.state.log.length;
  assert.equal(H.pendingTip(ctx, "table").id, "table");
  // Arriving at the Table: the tip pops up and enters the archive at once.
  ctx.view = { page: "table", id: "", tab: "" };
  assert.equal(H.syncTips(ctx).id, "table");
  assert.deepEqual(H.currentPop(), { kind: "tip", id: "table" });
  assert.ok(h.book().identities.player.tips.table.archivedAt, "archived when shown");
  assert.equal(ctx.state.log.length, log, "no game log entry");
  // Re-renders in the same visit keep it; nothing else pops over it.
  assert.equal(H.syncTips(ctx), null);
  assert.deepEqual(H.currentPop(), { kind: "tip", id: "table" });
  // A more specific mechanic in the same visit (combat) follows.
  ctx.commit("Combattimento", (s) => (s.combat.active = true));
  assert.equal(H.syncTips(ctx).id, "combat");
  assert.deepEqual(H.currentPop(), { kind: "tip", id: "combat" });
  // Leaving the Table closes it; nothing comes back on return (both archived).
  ctx.view = { page: "home", id: "", tab: "" };
  H.syncTips(ctx);
  assert.equal(H.currentPop(), null);
  ctx.view = { page: "table", id: "", tab: "" };
  assert.equal(H.syncTips(ctx), null);
  // Each identity has its own archive.
  ctx.role = "dm";
  ctx.registry.setSetting(ctx, H.TIPS_SETTING, true); // B62: the switch is personal too
  assert.equal(H.pendingTip(ctx, "table").id, "combat", "the DM has its own archive");
  ctx.role = "player";
  // Reset brings them back at the next occasion (Guides › Ripristina suggerimenti).
  h.ctx.view = { page: "home", id: "", tab: "" };
  H.syncTips(ctx);
  H.writeBook(ctx, (book) => D.resetTips(book, "player"));
  assert.equal(H.pendingTip(ctx, "table").id, "combat");
  // Sheet: only on a sheet this identity controls; conditions beat the general tip.
  ctx.view = { page: "characters", id: "goblin-1", tab: "actions" };
  assert.equal(H.syncTips(ctx), null, "never on a sheet the player cannot control");
  ctx.view = { page: "characters", id: "mira", tab: "actions" };
  assert.equal(H.syncTips(ctx).id, "sheet");
  ctx.commit("Prono", (s) => s.actors.mira.conditions.push({ id: "prone", key: "prone" }));
  assert.equal(H.syncTips(ctx).id, "conditions");
  // The level-up signal is not a tip any more (never archived or switched off).
  assert.ok(!H.TIPS.some((tip) => tip.id === "levelup"));
  // Off switch (Preferences / Guides): nothing shows, archive untouched.
  ctx.registry.setSetting(ctx, H.TIPS_SETTING, false);
  assert.equal(H.tipsEnabled(ctx), false);
  assert.equal(H.pendingTip(ctx, "table"), null);
  assert.equal(H.syncTips(ctx), null);
  assert.equal(H.currentPop(), null);
  H.resetTipVisit();
});

test("roll tip appears only with a pending roll the identity can make", async () => {
  const h = await harness();
  h.ctx.registry.setSetting(h.ctx, H.TIPS_SETTING, true); // B62: tips are opt-in
  h.mutate((s) => {
    // Explicit fixture: a pending request for Livia (player) as combat attempts store it.
    s.combatAttempts = [
      { id: "a1", requests: [{ id: "r1", actorId: "livia", status: "pending" }] },
    ];
  });
  h.reload();
  assert.equal(H.pendingTip(h.ctx, "table").id, "rolls");
  h.ctx.role = "dm";
  h.ctx.registry.setSetting(h.ctx, H.TIPS_SETTING, true);
  assert.equal(H.pendingTip(h.ctx, "table").id, "rolls", "the DM controls campaign sheets too");
  h.mutate((s) => (s.combatAttempts[0].requests[0].actorId = "goblin-1"));
  h.ctx.role = "player";
  assert.equal(H.pendingTip(h.ctx, "table").id, "table");
});

test("tours (Foundry): start navigates to the step page, close keeps progress, done, reset one or all", async () => {
  const h = await harness();
  const { ctx } = h;
  assert.deepEqual(H.tourProgress(ctx, "table"), { status: "new", step: 0, total: 6 });
  ctx.view = { page: "home", id: "", tab: "" };
  assert.equal(H.startTour(ctx, "table"), true);
  assert.deepEqual(h.navigations.at(-1), { page: "table" });
  assert.deepEqual(H.activeTour(), { id: "table", step: 0, role: "player" });
  const log = ctx.state.log.length;
  H.closeTour(ctx, { save: true });
  assert.deepEqual(h.book().identities.player.tours.table, { step: 0, status: "paused" });
  assert.equal(ctx.state.log.length, log, "tour progress is not a game event");
  // Resume from a saved step; restart starts again.
  H.writeBook(ctx, (book) => D.saveTourProgress(book, "player", "table", 3, "paused", 6));
  H.startTour(ctx, "table");
  assert.equal(H.activeTour().step, 3);
  H.closeTour(ctx, { save: true, done: true });
  assert.deepEqual(H.tourProgress(ctx, "table"), { status: "done", step: 5, total: 6 });
  H.startTour(ctx, "table");
  assert.equal(H.activeTour().step, 0, "a completed tour replays from the start");
  H.dropTour();
  assert.equal(H.activeTour(), null);
  assert.throws(
    () => D.saveTourProgress({ identities: {} }, "player", "table", 9, "paused", 6),
    /Invalid tour step/,
  );
  H.writeBook(ctx, (book) => D.saveTourProgress(book, "player", "home", 1, "paused", 5));
  H.writeBook(ctx, (book) => D.resetTours(book, "player", "home"));
  assert.equal(h.book().identities.player.tours.home, undefined);
  assert.ok(h.book().identities.player.tours.table);
  H.writeBook(ctx, (book) => D.resetTours(book, "player"));
  assert.deepEqual(h.book().identities.player.tours, {});
  // The sheet tour needs a sheet of one's own; the DM has Doran.
  assert.equal(
    H.tourAvailable(
      ctx,
      H.TOURS.find((t) => t.id === "sheet"),
    ),
    true,
  );
  ctx.view = { page: "home", id: "", tab: "" };
  H.startTour(ctx, "sheet");
  assert.deepEqual(h.navigations.at(-1), { page: "characters", id: "livia", tab: "actions" });
  H.dropTour();
});

test("a page change the tour did not ask for pauses it and saves progress", async () => {
  const h = await harness();
  const { ctx } = h;
  ctx.view = { page: "table", id: "", tab: "" };
  H.startTour(ctx, "table");
  H.tourNavigated(ctx, { page: "table", from: "home" });
  assert.ok(H.activeTour(), "the tour's own page change is expected");
  ctx.view = { page: "library", id: "", tab: "" };
  H.tourNavigated(ctx, { page: "library", from: "table" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(H.activeTour(), null);
  assert.deepEqual(h.book().identities.player.tours.table, { step: 0, status: "paused" });
  assert.match(h.toasts.at(-1).text, /Tour in pausa al passo 1/);
});

test("what's new: entries of areas that are not built are hidden; read state per identity", async () => {
  const h = await harness();
  const ids = H.newsFor(h.ctx).map((item) => item.id);
  assert.ok(ids.includes("2026-09-24-home"));
  assert.ok(!ids.includes("2026-09-23-campaigns"), "B13 is not loaded in this harness");
  const withCampaigns = await harness({ campaigns: true });
  assert.ok(H.newsFor(withCampaigns.ctx).some((item) => item.id === "2026-09-23-campaigns"));
  H.writeBook(h.ctx, (book) => D.markNews(book, "player", "2026-09-24-home", true));
  assert.equal(H.unreadNews(h.ctx).length, ids.length - 1);
  h.ctx.role = "dm";
  assert.equal(H.unreadNews(h.ctx).length, ids.length);
});

test("feature previews (Quest Portal): opt-in news in the notification centre and compact Home", async () => {
  const h = await harness();
  const { ctx, registry } = h;
  assert.deepEqual(registry.notifications(ctx), []);
  registry.setSetting(ctx, "home-previews.news-bell", true);
  const notes = registry.notifications(ctx);
  assert.ok(notes.length >= 5);
  assert.deepEqual(notes[0].target, {
    page: "home",
    params: { tab: "news", id: notes[0].id.slice(5) },
  });
  H.writeBook(ctx, (book) =>
    D.markAllNews(
      book,
      "player",
      H.newsFor(ctx).map((n) => n.id),
    ),
  );
  assert.deepEqual(registry.notifications(ctx), [], "read news leave the bell");
  ctx.role = "dm";
  assert.deepEqual(registry.notifications(ctx), [], "a preview is personal: the DM did not opt in");
  ctx.role = "player";
  assert.doesNotMatch(slotHTML(registry, "route", "home", ctx), /home-compact/);
  registry.setSetting(ctx, "home-previews.compact", true);
  assert.match(slotHTML(registry, "route", "home", ctx), /home-page home-compact/);
});

test("Guides panel: tour rows with progress, tips archive toggle and reset, reopen first steps", async () => {
  const h = await harness();
  const { ctx, registry } = h;
  H.writeBook(ctx, (book) => D.saveTourProgress(book, "player", "table", 2, "paused", 6));
  H.writeBook(ctx, (book) => D.archiveTip(book, "player", "table"));
  H.writeBook(ctx, (book) => D.setWelcome(book, "player", "hidden"));
  const log = ctx.state.log.length;
  ctx.view = { page: "home", id: "", tab: "guides" };
  const { arrivedHome, bindHome } = await import("../home-ui.mjs");
  arrivedHome();
  const html = slotHTML(registry, "route", "home", ctx);
  assert.match(html, /In pausa al passo 3 di 6/);
  assert.match(html, /aria-label="Riprendi il tour Il Tavolo"/);
  assert.match(html, /data-home-tip-row="table"/);
  assert.doesNotMatch(html, /data-home-tip-row="combat"/);
  const page = mount(html, (root, c) => bindHome(root, c), ctx);
  page.click('[data-home-tour-restart="table"]');
  assert.equal(H.activeTour().step, 0);
  H.dropTour();
  page.click("[data-home-tips-reset]");
  assert.deepEqual(h.book().identities.player.tips, {});
  page.click("[data-home-tours-reset]");
  assert.deepEqual(h.book().identities.player.tours, {});
  page.click('[data-home-welcome="show"]');
  assert.equal(h.book().identities.player.welcome, "open");
  assert.equal(ctx.state.log.length, log, "Guides bookkeeping never enters the game log");
  page.change("[data-home-tips-enabled]", { checked: false });
  assert.equal(H.tipsEnabled(ctx), false);
});

test("Home tour step 1 names the header as drawn, never a fixed list (review P3)", async () => {
  const h = await harness();
  const step = H.TOURS.find((tour) => tour.id === "home").steps[0];
  assert.equal(typeof step.body, "function");
  // Without a drawn header (no DOM) the sentence stays true and names no service.
  const text = step.body(h.ctx);
  assert.doesNotMatch(text.it, /Richieste|Cerca, Appunti/);
  assert.match(text.it, /A destra ci sono i servizi\.$/);
  assert.match(text.en, /On the right are the services\.$/);
  // With a header: the names in the title attributes, quoted, in the viewer's language.
  const header = [
    { title: "Cerca" },
    { title: "Notifiche e richieste" },
    { title: "Account e profilo" },
  ].map((row) => ({ getClientRects: () => [1], getAttribute: () => row.title }));
  const nav = ["Inizio", "Personaggi"].map((name) => ({
    getClientRects: () => [1],
    textContent: name,
  }));
  globalThis.document = {
    querySelectorAll: (selector) => (selector.includes("service") ? header : nav),
  };
  try {
    const drawn = step.body(h.ctx);
    assert.equal(
      drawn.it,
      "Inizio e Personaggi restano sempre in alto. A destra ci sono i servizi: «Cerca», «Notifiche e richieste» e «Account e profilo».",
    );
  } finally {
    delete globalThis.document;
  }
});
