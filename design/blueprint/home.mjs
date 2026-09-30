// B30 — Complete Home, first steps, help and what's new (entry module).
//
// Replaces the core Home page (registry `replaces: true`) keeping its blocks and controls,
// and adds: first steps with three paths and the private "Start here" example, work to
// resume, the level-up queue, the next session across campaigns with a countdown, recent
// characters, What's new / Guides / Support, the "?" help service, first-occurrence tips
// on the Table and the sheet, guided tours, diagnostics, problem reports and opt-in
// feature previews. Pattern sources are listed in each module and in
// changes/interview-01/blueprint-home-evidence.md.

import {
  HOME_ID,
  SLICE_VERSION,
  seedHome,
  normalizeHome,
  reconcileAfterUndo,
  levelUpQueue,
  incompleteWork,
  recentCharacters,
} from "./home-domain.mjs";
import {
  NEWS,
  TOURS,
  openHelp,
  unreadNews,
  newsOpened,
  previewOn,
  tourNavigated,
  dropTour,
  activeTour,
  startTour,
  scheduleTips,
  resetTipVisit,
  refreshTipPop,
  clearBook,
  closePop,
} from "./help.mjs";
import {
  renderHome,
  bindHome,
  renderAppointment,
  bindAppointment,
  renderLevelUp,
  bindLevelUp,
  renderLevelTab,
  levelTabVisible,
  startLevelWalk,
  resetLevelWalk,
  walkNavigated,
  renderWork,
  bindWork,
  renderRecent,
  readRecents,
  noteRecent,
  clearRecents,
  resetHomeView,
  arrivedHome,
} from "./home-ui.mjs";
import { campaignSummary } from "./campaign-members.mjs";
import {
  openReport,
  openDiagnostics,
  resetSupportView,
  noteConnectivity,
  clearIncidents,
  installApp,
  installCardVisible,
  renderInstallCard,
  bindInstallCard,
} from "./home-support.mjs";

const L = (it, en) => ({ it, en });
const help = (ctx) => openHelp(ctx, { openReport });
// Visual pass 2 (30/09/2026): Home as Roll20's dashboard and D&D Beyond's signed-in home —
// «continue playing» with the campaign's art (the image of the campaign profile, as Roll20's
// game tile and Foundry's join page show the world image), the next session beside it, the
// characters, then the rest; the news are a compact panel on the right (Roll20's
// Announcements tab). The markup stays home-ui's: this wrapper only carries the art.
const IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
function campaignArt(ctx) {
  const id = ctx.state.campaign?.id;
  if (!id) return null;
  try {
    const image = campaignSummary(ctx.state, id, ctx.role)?.image;
    return typeof image === "string" && IMAGE.test(image) ? image : null;
  } catch {
    return null;
  }
}
function renderHomeDashboard(ctx) {
  const art = campaignArt(ctx);
  return `<div class="home-dashboard"${art ? ` data-home-art style="--home-art:url('${art}')"` : ""}>${renderHome(ctx)}</div>`;
}
// Search results only navigate: "aiuto" leads to Home › Guides under that name. The help of
// the current page is the command "Open help for this page" listed with the results (a
// result called "Help for this page" that opened Guides was a false promise, review P3).
const SEARCH = [
  {
    words: ["novità", "novita", "news", "what's new", "annunci"],
    title: L("Novità", "What’s new"),
    tab: "news",
  },
  {
    words: ["tour", "guida", "guide", "suggerimenti", "tips", "aiuto", "help", "?"],
    title: L("Tour e suggerimenti", "Tours and tips"),
    tab: "guides",
  },
  {
    words: [
      "segnala",
      "problema",
      "bug",
      "report",
      "diagnostica",
      "diagnostics",
      "stato",
      "status",
    ],
    title: L("Supporto: stato, diagnostica, segnalazioni", "Support: status, diagnostics, reports"),
    tab: "support",
  },
  {
    words: ["installa", "install", "telefono", "phone", "home screen", "schermata"],
    title: L("Installa l’app sul telefono", "Install the app on your phone"),
    tab: "support",
  },
  {
    words: ["anteprime", "previews", "sperimentali", "experimental"],
    title: L("Anteprime delle funzioni", "Feature previews"),
    tab: "support",
  },
];

export function register(registry) {
  registry.registerStateSlice(HOME_ID, {
    version: SLICE_VERSION,
    // The "Start here" example has its own correction ("Remove the example"): gameplay Undo
    // keeps its record and re-applies its creation or removal to the restored snapshot.
    // Personal bookkeeping (reads, tips, tours, reports) is not in the game state at all:
    // it is a per-device book (help.mjs), so it never enters the shared game log.
    undo: "preserve",
    seed: seedHome,
    normalize: normalizeHome,
    afterUndo: reconcileAfterUndo,
  });
  registry.registerStyles(new URL("./home.css", import.meta.url));

  registry.add("route", {
    id: "home",
    replaces: true,
    label: L("Inizio", "Home"),
    icon: "home",
    render: renderHomeDashboard,
    bind: bindHome,
  });
  // Home blocks: the appointment takes over the core block; the others appear only when
  // they have something to say (no empty boxes).
  registry.add("home-widget", {
    id: "appointment",
    replaces: true,
    // Right after «continue playing» (order 10): the next session sits beside it, as the
    // next game on Roll20's game tile and Foundry's join page (visual pass 2).
    order: 11,
    label: L("Prossimo appuntamento", "Next appointment"),
    render: renderAppointment,
    bind: bindAppointment,
  });
  registry.add("home-widget", {
    id: "home-levelup",
    label: L("Pronti a salire di livello", "Ready to level up"),
    order: 12,
    when: (ctx) => levelUpQueue(ctx.state, ctx.role).length > 0,
    render: renderLevelUp,
    bind: bindLevelUp,
  });
  registry.add("home-widget", {
    id: "home-work",
    label: L("Da riprendere", "Pick up where you left off"),
    order: 15,
    when: (ctx) => incompleteWork(ctx.state, ctx.role).length > 0,
    render: renderWork,
    bind: bindWork,
  });
  // IN-11: Roll20 «Aggiungi a Home» / the PWA install prompt, one tap from Home.
  registry.add("home-widget", {
    id: "home-install",
    label: L("Installa l’app", "Install the app"),
    order: 27,
    when: () => installCardVisible(),
    render: renderInstallCard,
    bind: bindInstallCard,
  });
  registry.add("command", {
    id: "home.install",
    label: L("Installa l’app", "Install the app"),
    description: L(
      "Aggiungi a Home, schermata Home, installa, PWA, app sul telefono",
      "Add to Home Screen, install, PWA, phone app",
    ),
    group: "help",
    run: (ctx) => installApp(ctx),
  });
  registry.add("home-widget", {
    id: "home-recent",
    label: L("Accesso rapido", "Quick access"),
    order: 25,
    when: (ctx) => recentCharacters(ctx.state, ctx.role, readRecents(ctx.role)).length > 0,
    render: renderRecent,
  });

  // FG "?" (R20-012): help for the current page, from every page including the Table.
  registry.add("service", {
    id: "home-help",
    label: L("Aiuto", "Help"),
    icon: "help",
    header: true,
    order: 45,
    run: help,
  });

  // BG3 first-occurrence tips (CRP-001) are a non-modal pop-up beside the Table's map tools
  // or the sheet's header, shown after the page is drawn (see the events below).

  // BG3 level-up signal (CRP-005) on the sheet: a "Level up" tab while the character has
  // the XP of the next level. Persistent state, not a tip.
  registry.add("sheet-tab", {
    id: "home-levelup",
    category: "features",
    label: L("Sali di livello", "Level up"),
    order: 15,
    when: (ctx, actor) => levelTabVisible(ctx, actor),
    render: renderLevelTab,
    bind: (el, ctx) => bindLevelUp(el, ctx),
  });

  registry.add("settings", {
    id: "home-tips",
    label: L("Suggerimenti", "Tips"),
    scope: "personal",
    fields: [
      {
        id: "enabled",
        label: L(
          "Mostra un suggerimento la prima volta che incontri una meccanica",
          "Show a tip the first time you meet a mechanic",
        ),
        type: "boolean",
        // Owner decision I-236 (3): off by default, help on request. SV-48 keeps them easy
        // to turn on: help «?» of every page (Suggerimenti), with «Non mostrare più», an
        // archive and a reset; once on, each tip shows once, beside the mechanic.
        default: false,
      },
    ],
  });
  // Quest Portal Feature Previews (VTL-215): opt-in, per person.
  registry.add("settings", {
    id: "home-previews",
    label: L("Anteprime delle funzioni", "Feature previews"),
    scope: "personal",
    fields: [
      {
        id: "news-bell",
        label: L(
          "Anteprima: novità anche nel centro notifiche",
          "Preview: what’s new in the notification centre too",
        ),
        type: "boolean",
        default: false,
      },
      {
        id: "compact",
        label: L("Anteprima: Inizio compatto", "Preview: compact Home"),
        type: "boolean",
        default: false,
      },
    ],
  });
  registry.add("notifications", {
    id: "home-news",
    label: L("Novità", "What’s new"),
    when: (ctx) => previewOn(ctx, "news-bell"),
    collect: (ctx) =>
      unreadNews(ctx).map((item) => ({
        id: `news:${item.id}`,
        title: item.title,
        body: item.body,
        time: `${item.date}T09:00:00.000Z`,
        category: "other",
        // A system notice (B24): nobody's own action, so it counts for everyone who opted in.
        by: null,
        target: { page: "home", params: { tab: "news", id: item.id } },
      })),
  });

  // Commands for the palette and keyboard. F1 is the conventional help key; "?" already
  // belongs to the shortcut guide of the command palette (B23).
  registry.add("command", {
    id: "home.help",
    label: L("Apri l’aiuto di questa pagina", "Open help for this page"),
    shortcut: "F1",
    context: "global",
    group: "help",
    run: help,
  });
  registry.add("command", {
    id: "home.news",
    label: L("Apri le novità", "Open what’s new"),
    group: "help",
    run: (ctx) => ctx.navigate("home", { tab: "news" }),
  });
  registry.add("command", {
    id: "home.guides",
    label: L("Tour e suggerimenti", "Tours and tips"),
    group: "help",
    run: (ctx) => ctx.navigate("home", { tab: "guides" }),
  });
  registry.add("command", {
    id: "home.level-all",
    label: L("Avanza tutti i personaggi pronti", "Level up every ready character"),
    group: "help",
    when: (ctx) => levelUpQueue(ctx.state, ctx.role).length > 0,
    run: (ctx) => startLevelWalk(ctx),
  });
  registry.add("command", {
    id: "home.report",
    label: L("Segnala un problema", "Report a problem"),
    group: "help",
    run: (ctx) => openReport(ctx),
  });
  registry.add("command", {
    id: "home.diagnostics",
    label: L("Diagnostica di questo dispositivo", "Diagnostics for this device"),
    group: "help",
    run: (ctx) => openDiagnostics(ctx),
  });
  for (const tour of TOURS)
    registry.add("command", {
      id: `home.tour-${tour.id}`,
      label: L(`Tour: ${tour.title.it}`, `Tour: ${tour.title.en}`),
      group: "help",
      run: (ctx) => startTour(ctx, tour.id, { restart: true }),
    });

  registry.add("search", {
    id: "home-search",
    label: L("Aiuto e novità", "Help and news"),
    search(ctx, query) {
      const q = String(query ?? "")
        .trim()
        .toLocaleLowerCase();
      if (q.length < 2) return [];
      const topics = SEARCH.filter((row) =>
        row.words.some((word) => word.includes(q) || q.includes(word)),
      ).map((row) => ({ title: row.title, page: "home", params: { tab: row.tab } }));
      const news = NEWS.filter((item) =>
        [item.title.it, item.title.en].some((text) => text.toLocaleLowerCase().includes(q)),
      ).map((item) => ({
        title: item.title,
        excerpt: L("Novità", "What’s new"),
        page: "home",
        // The entry itself, like a bell row: opened (and read) even among the older news.
        params: { tab: "news", id: item.id },
      }));
      return [...topics, ...news];
    },
  });

  registry.on("navigate", (payload, { ctx }) => {
    if (!ctx) return;
    // DDB recents widget: sheets opened on this device, per identity.
    if (payload.page === "characters" && payload.id) noteRecent(ctx.role, payload.id);
    // A route that names a panel (help › Tours and tips, a command, a bell row) selects it
    // even from Home itself: it wins over a panel clicked earlier (review P2).
    if (payload.page === "home" && (payload.from !== "home" || payload.tab)) arrivedHome(payload);
    // A news item opened from the notification centre is read on Home too.
    if (payload.page === "home" && payload.tab === "news" && payload.id)
      newsOpened(ctx, payload.id);
    tourNavigated(ctx, payload);
    // Order matters: a level-up offer (after an applied advance) wins over a tip.
    walkNavigated(ctx, payload);
    scheduleTips(ctx);
  });
  // A mechanic can start without a page change (combat, a requested roll, a condition).
  // A commit also shows whether saving on this device still works (Support › incidents).
  registry.on("commit", (payload, { ctx }) => {
    if (!ctx) return;
    noteConnectivity(ctx);
    scheduleTips(ctx);
  });
  // DDB status page: a period without network (simulated) enters the incident history.
  registry.on("offline-changed", (payload, { ctx }) => {
    if (ctx)
      noteConnectivity({ offline: Boolean(payload?.offline), storageError: ctx.storageError });
  });
  // The previous identity's tour, pop-up, walk and panel choices never carry over.
  registry.on("role-changed", (payload, { ctx }) => {
    dropTour();
    resetTipVisit();
    resetLevelWalk();
    resetHomeView();
    resetSupportView();
    if (ctx) scheduleTips(ctx);
  });
  registry.on("reset", () => {
    clearIncidents();
    dropTour();
    closePop();
    resetTipVisit();
    resetLevelWalk();
    clearRecents();
    clearBook();
    resetHomeView();
    resetSupportView();
  });
  registry.on("language-changed", (payload, { ctx }) => {
    const active = activeTour();
    if (ctx && active) {
      dropTour();
      queueMicrotask(() => startTour(ctx, active.id, { at: active.step }));
    }
    if (ctx) setTimeout(() => refreshTipPop(ctx), 0);
  });
}
