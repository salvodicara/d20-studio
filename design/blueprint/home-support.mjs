// B30 — Support: service status, diagnostics, problem report, install on the phone and
// optional feature previews.
//
// Patterns (IDs from docs/interview/CAPABILITY_CENSUS.md and market-census rows):
// - DDB status page with per-system status and incident history (DDB-191, SVC-152).
// - Roll20 "Report a Bug" and FG launcher logs/troubleshooting (R20-199, R20-204); DDB
//   self-help and "Submit a request" (DDB-212): the report is prepared, never sent here.
// - Roll20 Characters "Add to Home Screen" steps for iOS Share and the Android menu
//   (SVC-178).
// - Quest Portal Feature Previews: opt-in per user, may change or lose data (VTL-215).
//
// Everything is local and simulated: no network request, upload or real service. Prepared
// reports are personal bookkeeping on this device (help.mjs book): no game log entry.

import {
  addReport,
  deleteReport,
  diagnosticsSummary,
  browserFamily,
  installPlatform,
} from "./home-domain.mjs";
import {
  errorText,
  previewOn,
  PREVIEW_SETTINGS,
  bookFor,
  writeBook,
  helpContent,
} from "./help.mjs";
import { installState, promptInstall } from "./offline.mjs";

const STORAGE_KEY = "d20-studio-blueprint-v1";
export const BUILD = "2026-09-24";
const doc = () => globalThis.document ?? null;

// Local device facts only; never the identity, names or campaign content.
export function collectDiagnostics(ctx) {
  let bytes = null;
  try {
    bytes = globalThis.localStorage?.getItem(STORAGE_KEY)?.length ?? null;
  } catch {
    bytes = null;
  }
  let report = { built: [], failed: [], warnings: [] };
  try {
    report = ctx.registry?.report?.() ?? report;
  } catch {}
  const width = globalThis.innerWidth;
  const height = globalThis.innerHeight;
  return {
    build: BUILD,
    page: ctx.view.page,
    tab: ctx.view.tab || "",
    hasId: Boolean(ctx.view.id),
    lang: ctx.lang,
    dataVersion: ctx.state.version,
    sliceCount: Object.keys(ctx.state.extVersions ?? {}).length,
    offline: Boolean(ctx.offline),
    storage: ctx.storageError ? `unavailable (${ctx.storageError})` : "ok",
    bytes,
    built: report.built.length,
    failed: report.failed.length,
    warnings: report.warnings.length,
    failedAreas: report.failed.map((row) => row.id),
    warningList: report.warnings.map(
      (w) => `${w.extension} ${w.point} ${w.id} ${w.phase}: ${w.message}`,
    ),
    viewport: width && height ? `${width}×${height}` : "?",
    browser: browserFamily(globalThis.navigator?.userAgent ?? ""),
  };
}
// DDB status page: one row per service, then the incident history.
export function serviceStatus(ctx) {
  const facts = collectDiagnostics(ctx);
  const rows = [
    {
      id: "sync",
      name: ctx.t("Sincronizzazione con il gruppo (simulata)", "Sync with the party (simulated)"),
      ok: !facts.offline,
      text: facts.offline
        ? ctx.t(
            "Senza rete: le modifiche condivise attendono la connessione.",
            "Offline: shared changes wait for the connection.",
          )
        : ctx.t("In linea nella simulazione.", "Online in the simulation."),
    },
    {
      id: "storage",
      name: ctx.t("Salvataggio su questo dispositivo", "Saving on this device"),
      ok: facts.storage === "ok",
      text:
        facts.storage === "ok"
          ? ctx.t("Funziona.", "Working.")
          : ctx.t(
              "Non disponibile: le modifiche restano solo in questa scheda.",
              "Unavailable: changes stay in this tab only.",
            ),
    },
    {
      id: "areas",
      name: ctx.t("Aree dell’app", "App areas"),
      ok: facts.failed === 0,
      text:
        facts.failed === 0
          ? ctx.t(
              `${facts.built} pronte, nessuna con errori.`,
              `${facts.built} ready, none with errors.`,
            )
          : ctx.t(
              `${facts.failed} con errori: il resto funziona.`,
              `${facts.failed} with errors: the rest works.`,
            ),
    },
  ];
  let warnings = [];
  try {
    warnings = ctx.registry?.report?.().warnings ?? [];
  } catch {}
  // DDB status page: the history lists every incident of this visit, newest first — area
  // warnings plus the periods without network or without saving (review P3).
  const incidents = [
    ...warnings.map((w) => ({
      kind: "area",
      time: w.time,
      end: null,
      text: {
        it: `${w.extension} · ${w.point} «${w.id}»`,
        en: `${w.extension} · ${w.point} “${w.id}”`,
      },
    })),
    ...visit.incidents.map((row) => ({ ...row, text: INCIDENT_TEXT[row.kind] })),
  ]
    .sort((a, b) => String(b.time ?? "").localeCompare(String(a.time ?? "")))
    .slice(0, 5);
  return {
    rows,
    allOk: rows.every((row) => row.ok),
    incidents,
    facts,
  };
}
// This visit's connectivity and storage periods (device facts, never identity data).
const visit = { incidents: [] };
const INCIDENT_TEXT = {
  offline: {
    it: "Senza rete (simulata): modifiche condivise sospese",
    en: "Offline (simulated): shared changes on hold",
  },
  storage: {
    it: "Salvataggio non disponibile su questo dispositivo",
    en: "Saving unavailable on this device",
  },
};
// Opens an incident when the network (simulated) or saving stops, closes it when it returns.
export function noteConnectivity(ctx, now = Date.now()) {
  const track = (kind, down) => {
    const open = visit.incidents.find((row) => row.kind === kind && !row.end);
    if (down && !open) visit.incidents.push({ kind, time: new Date(now).toISOString(), end: null });
    else if (!down && open) open.end = new Date(now).toISOString();
  };
  track("offline", Boolean(ctx.offline));
  track("storage", Boolean(ctx.storageError));
  visit.incidents = visit.incidents.slice(-20);
}
export function clearIncidents() {
  visit.incidents = [];
}
const when = (ctx, value) =>
  value ? new Date(value).toLocaleString(ctx.lang === "en" ? "en-GB" : "it-IT") : "";
function statusHTML(ctx) {
  const status = serviceStatus(ctx);
  return `<section class="home-card" aria-labelledby="home-status-title"><h3 id="home-status-title">${ctx.t("Stato del servizio", "Service status")}</h3><p class="home-status-summary ${status.allOk ? "is-ok" : "is-warn"}" data-home-status="${status.allOk ? "ok" : "warn"}"><span class="home-dot" aria-hidden="true"></span>${status.allOk ? ctx.t("Tutto funziona.", "Everything is working.") : ctx.t("Qualcosa non funziona: dettagli sotto.", "Something is not working: details below.")}</p><ul class="home-status-list">${status.rows.map((row) => `<li data-home-status-row="${row.id}"><span class="home-dot ${row.ok ? "is-ok" : "is-warn"}" aria-hidden="true"></span><span><strong>${ctx.esc(row.name)}</strong><small>${ctx.esc(row.text)}</small></span></li>`).join("")}</ul><details class="home-details"><summary>${ctx.t("Cronologia degli incidenti", "Incident history")}</summary>${status.incidents.length ? `<ul data-home-incidents>${status.incidents.map((row) => `<li data-home-incident="${ctx.esc(row.kind)}"><small>${ctx.esc(when(ctx, row.time))}${row.kind === "area" ? "" : row.end ? ` – ${ctx.esc(when(ctx, row.end))}` : ` · ${ctx.t("in corso", "ongoing")}`}</small> ${ctx.esc(ctx.label(row.text))}</li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessun incidente in questa visita.", "No incidents in this visit.")}</p>`}</details><div class="toolbar"><button type="button" class="button" data-home-support="diagnostics">${ctx.t("Diagnostica", "Diagnostics")}</button><button type="button" class="button" data-home-support="report">${ctx.t("Segnala un problema", "Report a problem")}</button></div></section>`;
}
function reportsHTML(ctx) {
  const reports = bookFor(ctx.role).reports;
  if (!reports.length) return "";
  const when = (value) =>
    new Date(value).toLocaleString(ctx.lang === "en" ? "en-GB" : "it-IT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  return `<section class="home-card" aria-labelledby="home-reports-title"><h3 id="home-reports-title">${ctx.t("Segnalazioni preparate", "Prepared reports")}</h3><p class="muted">${ctx.t("Solo tue, in questo dispositivo. In questa dimostrazione nessuna segnalazione viene inviata.", "Yours only, on this device. In this demonstration no report is sent.")}</p><ul class="home-list">${[
    ...reports,
  ]
    .reverse()
    .map(
      (row) =>
        `<li class="home-row" data-home-report="${ctx.esc(row.id)}"><div><strong>${ctx.esc(when(row.createdAt))}</strong><small>${ctx.esc(row.summary.split("\n")[0].slice(0, 120))}</small></div><div class="toolbar"><button type="button" class="button quiet" data-home-report-copy="${ctx.esc(row.id)}" aria-label="${ctx.esc(ctx.t(`Copia la segnalazione del ${when(row.createdAt)}`, `Copy the report of ${when(row.createdAt)}`))}">${ctx.t("Copia", "Copy")}</button><button type="button" class="button quiet" data-home-report-delete="${ctx.esc(row.id)}" aria-label="${ctx.esc(ctx.t(`Elimina la segnalazione del ${when(row.createdAt)}`, `Delete the report of ${when(row.createdAt)}`))}">${ctx.t("Elimina", "Delete")}</button></div></li>`,
    )
    .join("")}</ul></section>`;
}

// ---------------------------------------------------------------- install (SVC-178)

const INSTALL = {
  ios: {
    name: { it: "iPhone e iPad", en: "iPhone and iPad" },
    steps: [
      { it: "Apri d20 Studio in Safari.", en: "Open d20 Studio in Safari." },
      {
        it: "Tocca Condividi (il quadrato con la freccia in su).",
        en: "Tap Share (the square with the up arrow).",
      },
      {
        it: "Scorri e scegli «Aggiungi alla schermata Home».",
        en: "Scroll and choose “Add to Home Screen”.",
      },
      { it: "Conferma il nome e tocca «Aggiungi».", en: "Confirm the name and tap “Add”." },
    ],
  },
  android: {
    name: { it: "Android", en: "Android" },
    steps: [
      { it: "Apri d20 Studio in Chrome.", en: "Open d20 Studio in Chrome." },
      {
        it: "Tocca «Installa l’app» qui sopra, oppure il menu ⋮ › «Installa app».",
        en: "Tap “Install the app” above, or the ⋮ menu › “Install app”.",
      },
      {
        it: "Conferma: l’icona di d20 Studio compare nella schermata Home.",
        en: "Confirm: the d20 Studio icon appears on your home screen.",
      },
    ],
  },
  desktop: {
    name: { it: "Computer", en: "Computer" },
    steps: [
      {
        it: "In Chrome o Edge: «Installa l’app» qui sopra, oppure l’icona di installazione nella barra degli indirizzi.",
        en: "In Chrome or Edge: “Install the app” above, or the install icon in the address bar.",
      },
      {
        it: "In Safari su Mac: File › «Aggiungi al Dock».",
        en: "In Safari on Mac: File › “Add to Dock”.",
      },
    ],
  },
};
const installUI = { platform: null };
export function resetSupportView() {
  installUI.platform = null;
}
function standalone() {
  try {
    return Boolean(globalThis.matchMedia?.("(display-mode: standalone)")?.matches);
  } catch {
    return false;
  }
}
function installHTML(ctx) {
  const platform = installUI.platform ?? installPlatform(globalThis.navigator?.userAgent ?? "");
  const current = INSTALL[platform];
  const state = installState();
  return `<section class="home-card" aria-labelledby="home-install-title" data-home-install="${platform}"><h3 id="home-install-title">${ctx.t("Installa l’app sul telefono", "Install the app on your phone")}</h3>${standalone() || state.installed ? `<p class="home-status-summary is-ok"><span class="home-dot" aria-hidden="true"></span>${ctx.t("Stai già usando l’app installata.", "You are already using the installed app.")}</p>` : state.canPrompt ? `<button type="button" class="button primary" data-home-install-now>${ctx.t("Installa l’app", "Install the app")}</button>` : ""}<div class="home-segmented" role="group" aria-label="${ctx.t("Dispositivo", "Device")}">${Object.entries(
    INSTALL,
  )
    .map(
      ([id, row]) =>
        `<button type="button" class="button ${id === platform ? "active" : "quiet"}" aria-pressed="${id === platform}" data-home-install-platform="${id}">${ctx.esc(ctx.label(row.name))}</button>`,
    )
    .join(
      "",
    )}</div><ol class="home-steps">${current.steps.map((step) => `<li>${ctx.esc(ctx.label(step))}</li>`).join("")}</ol><p class="muted" data-home-install-note>${ctx.t("d20 Studio si installa come un’app: si apre a schermo intero dalla schermata Home o dal Dock, con i personaggi recenti in Inizio › Accesso rapido. Senza rete restano leggibili le schede rese «Disponibili offline».", "d20 Studio installs like an app: it opens full screen from the home screen or the Dock, with recent characters in Home › Quick access. Without a network, sheets made “Available offline” stay readable.")}</p></section>`;
}

// ---------------------------------------------------------------- previews (VTL-215)

const PREVIEWS = [
  {
    id: "news-bell",
    name: {
      it: "Novità anche nel centro notifiche",
      en: "What’s new in the notification centre too",
    },
    text: {
      it: "Le novità non lette compaiono anche nella campanella, oltre che qui.",
      en: "Unread news also appears in the bell, besides here.",
    },
  },
  {
    id: "compact",
    name: { it: "Inizio compatto", en: "Compact Home" },
    text: {
      it: "Meno spazio e descrizioni più brevi nella pagina Inizio.",
      en: "Less spacing and shorter descriptions on the Home page.",
    },
  },
];
function previewsHTML(ctx) {
  return `<section class="home-card" aria-labelledby="home-previews-title"><h3 id="home-previews-title">${ctx.t("Anteprime delle funzioni", "Feature previews")}</h3><p class="muted">${ctx.t("Funzioni sperimentali, solo per te: possono cambiare o sparire. Le ritrovi anche in Preferenze.", "Experimental features, for you only: they may change or disappear. You also find them in Preferences.")}</p>${PREVIEWS.map(
    (row) =>
      `<label class="check-field home-check"><input type="checkbox" data-home-preview="${row.id}" ${previewOn(ctx, row.id) ? "checked" : ""}> <span><strong>${ctx.esc(ctx.label(row.name))}</strong><small>${ctx.esc(ctx.label(row.text))}</small></span></label>`,
  ).join("")}</section>`;
}

export function renderSupport(ctx) {
  return `${statusHTML(ctx)}${reportsHTML(ctx)}${installHTML(ctx)}${previewsHTML(ctx)}`;
}
// The platform switch redraws only the install card (keeps focus on the chosen button).
// «Installa l’app»: the browser's own install prompt where it exists; the steps otherwise.
export async function installApp(ctx) {
  const state = installState();
  if (state.installed)
    return ctx.toast(ctx.t("L’app è già installata.", "The app is already installed."));
  if (state.canPrompt) {
    const outcome = await promptInstall();
    if (outcome === "accepted")
      ctx.toast(ctx.t("d20 Studio è installata.", "d20 Studio is installed."));
    ctx.render();
    return outcome;
  }
  const platform = installPlatform(globalThis.navigator?.userAgent ?? "");
  ctx.dialog(
    state.ios
      ? ctx.t("Aggiungi a Home", "Add to Home Screen")
      : ctx.t("Installa l’app", "Install the app"),
    `<ol class="home-steps">${INSTALL[platform].steps.map((step) => `<li>${ctx.esc(ctx.label(step))}</li>`).join("")}</ol>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  return "steps";
}
// Home block: shown only where one tap installs (the browser offers it) or on iPhone/iPad,
// whose Safari needs the «Aggiungi a Home» steps. Never once the app is installed.
export function installCardVisible() {
  const state = installState();
  return !state.installed && (state.canPrompt || state.ios);
}
export function renderInstallCard(ctx) {
  const state = installState();
  return `<section class="home-card home-install" data-home-install-card aria-labelledby="home-install-card-title"><div class="section-heading"><h2 id="home-install-card-title">${ctx.t("Installa l’app", "Install the app")}</h2></div><p class="muted">${ctx.t("d20 Studio a schermo intero, dalla schermata Home, con i personaggi recenti a portata di dito.", "d20 Studio full screen, from your home screen, with recent characters one tap away.")}</p><button type="button" class="button primary" data-home-install-now>${state.canPrompt ? ctx.t("Installa l’app", "Install the app") : ctx.t("Aggiungi a Home", "Add to Home Screen")}</button></section>`;
}
export function bindInstallCard(el, ctx) {
  el.querySelector("[data-home-install-now]")?.addEventListener("click", () => installApp(ctx));
}
function bindInstall(box, ctx) {
  box?.querySelector("[data-home-install-now]")?.addEventListener("click", () => installApp(ctx));
  box?.querySelectorAll("[data-home-install-platform]").forEach((button) =>
    button.addEventListener("click", () => {
      installUI.platform = button.dataset.homeInstallPlatform;
      const holder = globalThis.document?.createElement("div");
      if (!holder) return;
      holder.innerHTML = installHTML(ctx);
      const next = holder.firstElementChild;
      box.replaceWith(next);
      bindInstall(next, ctx);
      next.querySelector(`[data-home-install-platform="${installUI.platform}"]`)?.focus();
    }),
  );
}
export function bindSupport(root, ctx) {
  root
    .querySelectorAll("[data-home-support]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        button.dataset.homeSupport === "report" ? openReport(ctx) : openDiagnostics(ctx),
      ),
    );
  bindInstall(root.querySelector("[data-home-install]"), ctx);
  root.querySelectorAll("[data-home-preview]").forEach((input) =>
    input.addEventListener("change", () => {
      try {
        ctx.registry.setSetting(ctx, PREVIEW_SETTINGS[input.dataset.homePreview], input.checked);
      } catch (error) {
        input.checked = !input.checked;
        ctx.toast(errorText(ctx, error), true);
      }
    }),
  );
  root.querySelectorAll("[data-home-report-delete]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.homeReportDelete;
      if (writeBook(ctx, (book) => deleteReport(book, ctx.role, id)))
        ctx.toast(ctx.t("Segnalazione eliminata.", "Report deleted."));
    }),
  );
  root.querySelectorAll("[data-home-report-copy]").forEach((button) =>
    button.addEventListener("click", () => {
      const row = bookFor(ctx.role).reports.find((r) => r.id === button.dataset.homeReportCopy);
      if (row) copyText(ctx, row.summary);
    }),
  );
}
async function copyText(ctx, text) {
  try {
    await globalThis.navigator.clipboard.writeText(text);
    ctx.toast(ctx.t("Copiato negli appunti del dispositivo.", "Copied to the device clipboard."));
  } catch {
    ctx.toast(
      ctx.t(
        "Copia non consentita dal browser: seleziona il testo e copialo a mano.",
        "The browser does not allow copying: select the text and copy it by hand.",
      ),
      true,
    );
  }
}
// Role labels are not personal names ("il DM ha chiesto…" stays readable).
const ROLE_LABELS = new Set(["dm", "master", "giocatore", "player", "giocatore / player"]);
// Names that must never enter a report (review P3): account display names, current and
// earlier (B29), linked service handles such as Discord, sign-in labels, and the member
// names of this identity's campaigns (core and B13). E-mails and phone numbers are removed
// by pattern. Other names typed by hand cannot be recognised: the form says so.
export function knownNames(state) {
  const profiles = Object.values(state?.ext?.account?.profiles ?? {});
  const members = [
    ...(state?.campaign?.members ?? []),
    ...Object.values(state?.ext?.["campaign-members"]?.parked ?? {}).flatMap(
      (row) => row?.campaign?.members ?? [],
    ),
  ];
  const names = [
    ...profiles.flatMap((row) => [
      row?.displayName,
      row?.guestName,
      ...(row?.nameHistory ?? []).map((h) => h?.displayName),
      ...(row?.linked ?? []).map((l) => l?.handle),
      ...(row?.signIn ?? []).map((m) => m?.label),
    ]),
    ...members.map((m) => (typeof m?.name === "string" ? m.name : null)),
  ];
  return [
    ...new Set(
      names
        .filter((name) => typeof name === "string" && name.trim().length >= 2)
        .map((name) => name.trim())
        .filter((name) => !ROLE_LABELS.has(name.toLocaleLowerCase())),
    ),
  ].sort((a, b) => b.length - a.length);
}
export function reportPreview(ctx, { what = "", expected = "", attach = true } = {}) {
  const facts = collectDiagnostics(ctx);
  const diagnostics = attach ? diagnosticsSummary(facts) : "";
  return { diagnostics, names: knownNames(ctx.state), what, expected, lang: ctx.lang };
}
export function openDiagnostics(ctx) {
  const facts = collectDiagnostics(ctx);
  const text = diagnosticsSummary(facts);
  ctx.dialog(
    ctx.t("Diagnostica di questo dispositivo", "Diagnostics for this device"),
    `<div class="home-diagnostics" data-home-diagnostics><dl class="home-facts"><div><dt>${ctx.t("Archiviazione", "Storage")}</dt><dd data-home-fact="storage">${facts.storage === "ok" ? ctx.t("Funziona", "Working") : ctx.t("Non disponibile", "Unavailable")}${Number.isFinite(facts.bytes) ? ` · ${ctx.esc(new Intl.NumberFormat(ctx.lang === "en" ? "en-GB" : "it-IT").format(facts.bytes))} ${ctx.t("byte usati", "bytes used")}` : ""} <span data-home-quota></span></dd></div><div><dt>${ctx.t("Rete (simulata)", "Network (simulated)")}</dt><dd data-home-fact="network">${facts.offline ? ctx.t("Senza rete", "Offline") : ctx.t("In linea", "Online")}</dd></div><div><dt>${ctx.t("Versione dei dati", "Data version")}</dt><dd data-home-fact="data">${ctx.esc(facts.dataVersion)} · ${ctx.esc(facts.sliceCount)} ${ctx.t("sezioni delle aree", "area sections")}</dd></div><div><dt>${ctx.t("Versione dell’app", "App version")}</dt><dd>Blueprint ${ctx.esc(facts.build)}</dd></div><div><dt>${ctx.t("Aree", "Areas")}</dt><dd>${ctx.t(`${facts.built} pronte · ${facts.failed} con errori · ${facts.warnings} avvisi`, `${facts.built} ready · ${facts.failed} failed · ${facts.warnings} warnings`)}</dd></div><div><dt>${ctx.t("Browser e schermo", "Browser and screen")}</dt><dd>${ctx.esc(facts.browser)} · ${ctx.esc(facts.viewport)}</dd></div></dl><label class="field">${ctx.t("Riepilogo tecnico (senza dati personali)", "Technical summary (no personal data)")}<textarea readonly rows="9" data-home-diagnostics-text>${ctx.esc(text)}</textarea></label><div class="toolbar"><button type="button" class="button" data-home-diagnostics-copy>${ctx.t("Copia la diagnostica", "Copy diagnostics")}</button><button type="button" class="button" data-home-diagnostics-report>${ctx.t("Segnala un problema", "Report a problem")}</button></div></div>`,
    { cancelLabel: ctx.t("Chiudi la diagnostica", "Close diagnostics") },
  );
  const box = doc()?.querySelector("#dialog [data-home-diagnostics]");
  if (!box) return;
  box
    .querySelector("[data-home-diagnostics-copy]")
    ?.addEventListener("click", () => copyText(ctx, text));
  box
    .querySelector("[data-home-diagnostics-report]")
    ?.addEventListener("click", () => openReport(ctx));
  globalThis.navigator?.storage
    ?.estimate?.()
    .then((estimate) => {
      const out = box.querySelector("[data-home-quota]");
      if (out && estimate?.quota)
        out.textContent = ctx.t(
          `(spazio disponibile circa ${Math.round(estimate.quota / 1048576)} MB)`,
          `(about ${Math.round(estimate.quota / 1048576)} MB available)`,
        );
    })
    .catch(() => {});
}
// Roll20 "Report a Bug": what happened, what was expected, optional technical summary.
// The preview shows exactly what would be sent; personal data is removed before saving.
export function openReport(ctx) {
  // The page by its name (as its help calls it), never its internal id.
  const page = ctx.esc(ctx.label(helpContent(ctx).title));
  ctx.dialog(
    ctx.t("Segnala un problema", "Report a problem"),
    `<div class="home-report" data-home-report-form><p class="muted">${ctx.t(`Pagina: ${page}. Dal riepilogo vengono tolti indirizzi email, numeri di telefono, i nomi degli account e dei membri delle tue campagne e gli account collegati (come Discord). Altri nomi scritti a mano restano: non scriverli.`, `Page: ${page}. E-mail addresses, phone numbers, account and campaign member names and linked accounts (such as Discord) are removed from the summary. Other names typed by hand stay: do not write them.`)}</p><label class="field">${ctx.t("Che cosa è successo?", "What happened?")}<textarea name="what" required maxlength="1000" rows="4"></textarea></label><label class="field">${ctx.t("Che cosa ti aspettavi? (facoltativo)", "What did you expect? (optional)")}<textarea name="expected" maxlength="1000" rows="2"></textarea></label><label class="check-field"><input type="checkbox" name="attach" checked> ${ctx.t("Allega la diagnostica tecnica (senza dati personali)", "Attach the technical diagnostics (no personal data)")}</label><h3>${ctx.t("Anteprima di ciò che verrebbe inviato", "Preview of what would be sent")}</h3><pre class="home-report-preview" data-home-report-preview aria-live="polite"></pre></div>`,
    {
      submitLabel: ctx.t("Prepara la segnalazione", "Prepare the report"),
      cancelLabel: ctx.t("Non segnalare", "Do not report"),
      onSubmit(data) {
        const input = reportPreview(ctx, {
          what: String(data.get("what") ?? ""),
          expected: String(data.get("expected") ?? ""),
          attach: data.has("attach"),
        });
        // Checked first, so an empty description keeps the dialog open with its message.
        addReport({ identities: {} }, ctx.role, input);
        const row = writeBook(ctx, (book) => addReport(book, ctx.role, input));
        if (!row) return false;
        ctx.toast(
          ctx.t(
            "Segnalazione pronta in Inizio › Supporto. In questa dimostrazione non viene inviata.",
            "Report ready in Home › Support. In this demonstration it is not sent.",
          ),
        );
      },
    },
  );
  const form = doc()?.querySelector("#dialog form");
  const out = form?.querySelector("[data-home-report-preview]");
  if (!form || !out) return;
  const draw = () => {
    const data = new FormData(form);
    const input = reportPreview(ctx, {
      what: String(data.get("what") ?? ""),
      expected: String(data.get("expected") ?? ""),
      attach: data.has("attach"),
    });
    try {
      out.textContent = addReport({ identities: {} }, ctx.role, input).summary;
    } catch (error) {
      out.textContent = errorText(ctx, error);
    }
  };
  form.addEventListener("input", draw);
  form.addEventListener("change", draw);
  draw();
}
