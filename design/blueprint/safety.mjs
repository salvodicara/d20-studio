// Area B27 — Table safety. Entry module loaded by extensions.mjs through the B11
// registry: it adds a campaign section (Agreements / During play / Stars and wishes), a
// personal profile page, a Table drawer, a map veil for filtered content, a global signal
// overlay, notifications, search results and palette commands. Domain rules:
// safety-domain.mjs; rendering and handlers: safety-ui.mjs. Synthetic data only.

import * as D from "./safety-domain.mjs";
import * as UI from "./safety-ui.mjs";

const L = (it, en) => ({ it, en });
const KEYWORDS = [
  "sicurezza",
  "safety",
  "linee",
  "lines",
  "veli",
  "veils",
  "carta x",
  "x-card",
  "stop",
  "mano",
  "hand",
  "stelle",
  "stars",
  "desideri",
  "wishes",
  "aspettative",
  "expectations",
  "sessione zero",
  "session zero",
  "filtro",
  "filter",
];

export function register(registry) {
  const api = {
    slice: (state) => registry.slice(state),
    ctx: () => registry.ctx,
  };
  const member = (ctx) =>
    Boolean(ctx?.state?.campaign?.id) &&
    Boolean(D.memberOf(ctx.state, ctx.state.campaign.id, ctx.role));
  // P10 CA-66: the Table's map bar acts with the same api (safety-ui safetyHud).
  UI.setSafetyApi(api);

  registry.registerStateSlice(D.SAFETY_SLICE, {
    version: D.SAFETY_VERSION,
    // Agreements and signals are communication, not gameplay: Undo never touches them.
    undo: "preserve",
    seed: D.seedSafety,
    normalize: D.normalizeSafety,
  });
  registry.registerStyles(new URL("./safety.css", import.meta.url));

  registry.add("campaign-section", {
    id: "safety",
    group: "play",
    label: L("Sicurezza", "Safety"),
    order: 55,
    render: (ctx) => UI.renderCampaignSafety(ctx, api),
    bind: (el, ctx) => UI.bindSafety(el, ctx, api),
  });
  registry.add("route", {
    id: "safety-profile",
    label: L("Il mio profilo · Sicurezza", "My profile · Safety"),
    render: (ctx) => UI.renderProfilePage(ctx, api),
    bind: (el, ctx) => UI.bindSafety(el, ctx, api),
  });
  registry.add("table-panel", {
    id: "safety",
    section: "chat",
    label: L("Sicurezza", "Safety"),
    placement: "sidebar-tab",
    icon: "flag",
    order: 110,
    when: member,
    render: (ctx, tableView) => UI.renderTableDrawer(ctx, api, tableView),
    bind: (el, ctx) => UI.bindTableDrawer(el, ctx, api),
  });
  registry.add("map-layer", {
    id: "safety-veil",
    label: L("Contenuti sfumati", "Blurred content"),
    order: 90,
    interactive: true,
    svg: (ctx, tableView) => UI.renderVeil(ctx, api, tableView),
    bind: (el, ctx, table) => UI.bindVeil(el, ctx, table),
  });

  // The one notification surface for safety events (B24 centre and pop-ups, category
  // "Sicurezza del tavolo", each person's delivery, position and duration). The DM's
  // pending Stop is left to the X-card overlay (safety-ui.mjs), so it never shows twice.
  const BODIES = {
    stop: L(
      "Qualcuno ha usato Stop. Il DM è stato avvisato; nessun nome viene mostrato.",
      "Someone used Stop. The DM has been told; no name is shown.",
    ),
    pace: L(
      "Qualcuno chiede meno intensità. Nessun nome viene mostrato.",
      "Someone asks for less intensity. No name is shown.",
    ),
    go: L(
      "Qualcuno dice che va tutto bene così. Nessun nome viene mostrato.",
      "Someone says all is well, go on. No name is shown.",
    ),
  };
  registry.add("notifications", {
    id: "safety-alerts",
    label: L("Sicurezza del tavolo", "Table safety"),
    when: member,
    collect(ctx) {
      const campaignId = ctx.state.campaign.id;
      const slice = registry.slice(ctx.state);
      const dm = D.isSafetyDm(ctx.state, campaignId, ctx.role);
      // Anonymous signals declare `by: null`, so the centre never attributes them to the
      // identity whose change made them appear; the sender's own device gets no echo.
      const own = new Set(UI.deviceIds("sent", ctx.role));
      const signals = D.activeSignals(ctx.state, slice, campaignId, ctx.role)
        .filter((signal) => !own.has(signal.id) && !(dm && signal.kind === "stop"))
        .map((signal) => ({
          id: "safety-signal-" + signal.id,
          title: {
            it: `${D.SIGNAL_KINDS[signal.kind].label.it} · anonimo`,
            en: `${D.SIGNAL_KINDS[signal.kind].label.en} · anonymous`,
          },
          body: BODIES[signal.kind],
          time: signal.at,
          by: null,
          category: "safety",
          target: { page: "campaign", params: { tab: "safety", id: "play" } },
        }));
      const hands = dm
        ? D.handQueue(ctx.state, slice, campaignId, ctx.role).map((hand) => {
            const name = UI.memberDisplay(ctx, hand.memberId);
            return {
              id: "safety-hand-" + hand.id,
              title: { it: `${name} ha alzato la mano`, en: `${name} raised a hand` },
              body: L("Chiede la parola.", "Asks to speak."),
              time: hand.at,
              category: "safety",
              target: { page: "campaign", params: { tab: "safety", id: "play" } },
            };
          })
        : [];
      const round = D.openRoundOf(slice, campaignId);
      const answered = round?.entries.some((entry) =>
        UI.deviceIds("stars", ctx.role).includes(entry.id),
      );
      const stars =
        round && !dm && !answered
          ? [
              {
                id: "safety-round-" + round.id,
                title: L("Il DM chiede stelle e desideri", "The DM asks for stars and wishes"),
                body: L("Rispondere è facoltativo.", "Answering is optional."),
                time: round.openedAt,
                category: "safety",
                target: { page: "campaign", params: { tab: "safety", id: "after" } },
              },
            ]
          : [];
      return [...signals, ...hands, ...stars];
    },
  });

  registry.add("search", {
    id: "safety-search",
    label: L("Sicurezza", "Safety"),
    search(ctx, query) {
      const q = String(query ?? "")
        .trim()
        .toLocaleLowerCase(ctx.lang);
      if (q.length < 3 || !KEYWORDS.some((word) => word.includes(q) || q.includes(word))) return [];
      const results = [
        {
          title: L(
            "Il mio profilo · Sicurezza (linee, veli, filtri)",
            "My profile · Safety (lines, veils, filters)",
          ),
          page: "safety-profile",
        },
      ];
      if (member(ctx))
        results.push(
          {
            title: L("Sicurezza del tavolo · Accordi", "Table safety · Agreements"),
            page: "campaign",
            params: { tab: "safety" },
          },
          {
            title: L("Sicurezza del tavolo · Durante il gioco", "Table safety · During play"),
            page: "campaign",
            params: { tab: "safety", id: "play" },
          },
          {
            title: L("Stelle e desideri", "Stars and wishes"),
            page: "campaign",
            params: { tab: "safety", id: "after" },
          },
        );
      return results;
    },
  });

  // Palette commands (B23) and a hotkey for the named raise-hand, like Foundry's
  // "Raise My Hand" (FVT-069). Stop has no hotkey, so it is never sent by accident.
  registry.add("command", {
    id: "safety.stop",
    label: L("Invia Stop anonimo (carta X)", "Send anonymous Stop (X-card)"),
    description: L(
      "Ferma la scena senza dire chi sei; è anche il pulsante X in alto sulla mappa",
      "Stops the scene without saying who you are; it is also the X button at the top of the map",
    ),
    keywords: [L("carta x", "x-card"), L("ferma la scena", "stop the scene")],
    group: "safety",
    when: member,
    run(ctx) {
      UI.perform(ctx, api, "signal", { kind: "stop" });
      ctx.toast(
        ctx.t(
          "Stop inviato in forma anonima. Il DM lo vede al centro dello schermo.",
          "Stop sent anonymously. The DM sees it in the middle of the screen.",
        ),
      );
    },
  });
  registry.add("command", {
    id: "safety.pace",
    label: L("Chiedi di rallentare (anonimo)", "Ask to slow down (anonymous)"),
    keywords: [L("rallenta", "slow down"), L("meno intensità", "less intensity")],
    group: "safety",
    when: (ctx) =>
      member(ctx) &&
      D.enabledTools(registry.slice(ctx.state), ctx.state.campaign.id).includes("pace"),
    run(ctx) {
      UI.perform(ctx, api, "signal", { kind: "pace" });
      ctx.toast(
        ctx.t(
          "Richiesta di rallentare inviata in forma anonima.",
          "Slow-down request sent anonymously.",
        ),
      );
    },
  });
  registry.add("command", {
    id: "safety.filter",
    label: L("Filtro dei contenuti e delle parolacce", "Content and swear-word filter"),
    description: L(
      "Sfuma mappe, dispense e immagini con i tuoi argomenti; maschera le parolacce",
      "Blurs maps, handouts and pictures with your topics; masks swear words",
    ),
    keywords: [
      L("filtro", "filter"),
      L("volgarità", "profanity"),
      L("contenuti sensibili", "sensitive content"),
    ],
    group: "safety",
    run: (ctx) => ctx.navigate("safety-profile", { returnTo: "campaign-safety" }),
  });
  registry.add("command", {
    id: "safety.hand",
    label: L("Alza o abbassa la mano", "Raise or lower your hand"),
    group: "safety",
    shortcut: "Mod+Shift+U",
    roles: ["player"],
    when: member,
    run(ctx) {
      const campaignId = ctx.state.campaign.id;
      const raised = D.handQueue(ctx.state, registry.slice(ctx.state), campaignId, ctx.role).some(
        (hand) => hand.memberId === ctx.role,
      );
      UI.perform(ctx, api, raised ? "lower-hand" : "raise-hand");
      ctx.toast(
        raised
          ? ctx.t("Mano abbassata.", "Hand lowered.")
          : ctx.t(
              "Mano alzata: sei in coda con il tuo nome.",
              "Hand raised: you are queued by name.",
            ),
      );
    },
  });
  registry.add("command", {
    id: "safety.profile",
    label: L("Apri il mio profilo di sicurezza", "Open my safety profile"),
    group: "safety",
    run: (ctx) => ctx.navigate("safety-profile", { returnTo: "campaign-safety" }),
  });

  // Global overlay: refreshed after every accepted change, view, identity or language
  // change. The pre-session reminder opens when someone joins the Table. A profile edited
  // offline reaches the group once its device (identity) is online and in use again.
  const refresh = (payload, { ctx }) => UI.refreshOverlay(ctx, api);
  const sync = () => setTimeout(() => api.ctx() && UI.syncProfile(api.ctx(), api), 0);
  for (const event of ["commit", "role-changed", "language-changed", "offline-changed"])
    registry.on(event, refresh);
  registry.on("navigate", (payload, { ctx }) => {
    UI.refreshOverlay(ctx, api);
    sync();
    if (payload.page === "table") setTimeout(() => UI.maybeRemind(api.ctx(), api), 0);
  });
  registry.on("role-changed", (payload, { ctx }) => {
    sync();
    if (ctx?.view?.page === "table") setTimeout(() => UI.maybeRemind(api.ctx(), api), 0);
  });
  registry.on("offline-changed", (payload) => {
    if (!payload?.offline) sync();
  });
  registry.on("reset", (payload, { ctx }) => {
    UI.resetSafetyView();
    UI.clearSafetyDevice();
    UI.refreshOverlay(ctx, api);
  });
}
