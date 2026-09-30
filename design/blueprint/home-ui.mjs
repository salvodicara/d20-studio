// B30 — Home page: the core blocks kept as they were (resume, character and recap), the
// next session across campaigns with a countdown, first steps with three paths, the
// "Start here" example, work to resume, level-up queue, recent characters, and a side
// panel with What's new, Guides and Support (Roll20 dashboard + Announcements tab).
//
// Patterns: Roll20 Quick Start three paths with explicit close (R20-002) and
// Announcements tab (R20-003); Owlbear "Start Here" (VTL-003); Alchemy demo per role
// (VTL-004); Foundry join page / Roll20 Next Game in local time (FVT-002, R20-049,
// SVC-047); DDB/Roll20 draft resume (DDB-011, DDB-217, R20-036); BG3 level-up signal
// and queue, "Level Up" walking every character that can level (CRP-005); DDB
// recent-characters widget (DDB-068). Source IDs are in docs/interview/CAPABILITY_CENSUS.md
// and changes/interview-01/market-census/*.md.

import { getCampaignHub } from "./campaign-content.mjs";
import { canViewActor } from "./character-access.mjs";
import { startCharacterBuilder, resetCharacterBuilderView } from "./character-builder.mjs";
import { resetView as resetBuilderPlusView } from "./builder-plus.mjs";
import { openSceneDraft } from "./preparation.mjs";
import { resetLibraryView } from "./library.mjs";
import { resetCampaignView } from "./campaign.mjs";
import {
  isNewIdentity,
  needsFirstSteps,
  upcomingSessions,
  countdownText,
  sessionTimes,
  viewerZone,
  levelUpQueue,
  incompleteWork,
  recentCharacters,
  rememberRecent,
  createStarter,
  starterStatus,
  removeStarter,
  setWelcome,
  markNews,
  markAllNews,
  resetTips,
  resetTours,
  xpStatus,
  canAdvance,
} from "./home-domain.mjs";
import {
  PRIVATE,
  personalCommit,
  errorText,
  newsFor,
  TIPS,
  TOURS,
  TIPS_SETTING,
  tipsEnabled,
  previewOn,
  tourAvailable,
  tourProgress,
  startTour,
  openHelp,
  bookFor,
  writeBook,
  showPop,
  closePop,
  currentPop,
} from "./help.mjs";
import { renderSupport, bindSupport, openReport } from "./home-support.mjs";

const L = (it, en) => ({ it, en });
const TABS = ["news", "guides", "support"];
const NEWS_SHOWN = 3;
const ui = {
  tab: null,
  undiscovered: false,
  focus: null,
  routeFocus: null,
  older: false,
  newsTarget: null,
  startOpen: false,
};
export function resetHomeView() {
  ui.tab = null;
  ui.undiscovered = false;
  ui.focus = null;
  ui.routeFocus = null;
  ui.older = false;
  ui.newsTarget = null;
  ui.startOpen = false;
}
// A route with ?tab=… selects that panel; a click inside the page then wins until the
// next route that names a panel. `?tab=news&id=…` (a bell row, DDB/Roll20: the notification
// opens the entry it points to) also opens the older news and brings that item into view.
export function arrivedHome({ tab = "", id = "" } = {}) {
  ui.tab = null;
  ui.routeFocus = null;
  ui.newsTarget = tab === "news" && id ? id : null;
}
const locale = (ctx) => (ctx.lang === "en" ? "en-GB" : "it-IT");
const number = (ctx, value) => new Intl.NumberFormat(locale(ctx)).format(value);
function ago(ctx, value) {
  if (!value) return "";
  const seconds = Math.round((Date.parse(value) - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale(ctx), { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(0, "minute");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}
// Personal bookkeeping on this device (no game log entry); the page redraws after it.
function personal(ctx, mutator, focus = null) {
  ui.focus = focus;
  return writeBook(ctx, mutator);
}

// ---------------------------------------------------------------- recent characters (device)

const RECENT_KEY = "d20-studio-home-recent";
let memoryRecents = {};
function readAll() {
  try {
    const raw = globalThis.localStorage?.getItem(RECENT_KEY);
    if (raw === undefined || raw === null) return memoryRecents;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return memoryRecents;
  }
}
export const readRecents = (role) => (Array.isArray(readAll()[role]) ? readAll()[role] : []);
export function noteRecent(role, id, now = Date.now()) {
  const all = { ...readAll(), [role]: rememberRecent(readRecents(role), id, now) };
  memoryRecents = all;
  try {
    globalThis.localStorage?.setItem(RECENT_KEY, JSON.stringify(all));
  } catch {}
}
export function clearRecents() {
  memoryRecents = {};
  try {
    globalThis.localStorage?.removeItem(RECENT_KEY);
  } catch {}
}

// ---------------------------------------------------------------- core blocks (kept)

// "Mago · Livello 3", but a builder class label already carries the level ("Mago 4",
// "Guerriero 3 / Mago 1"): then the level is not repeated (review P3).
function classAndLevel(ctx, className, level) {
  const label = className ? ctx.label(className) : "";
  const withLevel = /\d/.test(label) || !level ? "" : ctx.t(`Livello ${level}`, `Level ${level}`);
  return [label, withLevel].filter(Boolean).join(" · ");
}
// "Your character": the identity's own sheet (Livia for the player as in the core, the DM's
// own sheet for the DM), never another identity's character (review P3).
function ownSheet(ctx) {
  const mine = (actor) =>
    actor?.kind === "character" &&
    !actor.companion &&
    actor.owner === ctx.role &&
    canViewActor(actor, ctx.role, ctx.state);
  const livia = ctx.state.actors.livia;
  if (mine(livia)) return livia;
  return (
    Object.values(ctx.state.actors ?? {})
      .filter((actor) => mine(actor) && !actor.example)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))[0] ?? null
  );
}
// The three blocks of the core home, with the same markup and controls, so existing
// journeys and habits keep working (resume, character + recap). The appointment block is
// replaced by renderAppointment through the registry.
function coreBlocks(ctx, hub) {
  const t = (it, en) => ctx.t(it, en);
  const a = ownSheet(ctx);
  const recap = hub.latestRecap;
  const scene = ctx.state.scenes.find((entry) => entry.id === ctx.state.activeSceneId);
  const sceneName =
    scene && (ctx.role === "dm" || scene.revealed) ? scene.name : t("La partita", "Your game");
  return [
    {
      id: "resume",
      html: `<section class="resume-scene"><div class="scene-emblem" aria-hidden="true">${ctx.icon("map")}</div><div><h2>${ctx.esc(ctx.state.campaign.name)}</h2><p>${ctx.esc(sceneName)}</p><p class="muted">${t("Puoi entrare anche senza avviare un combattimento.", "You can enter without starting combat.")}</p><div class="toolbar"><button class="button primary" data-nav="table">${ctx.icon("play")} ${t("Entra al Tavolo", "Enter table")}</button><button class="button" data-nav="campaign">${t("Apri campagna", "Open campaign")}</button>${ctx.role === "dm" ? `<button class="button" data-nav="preparation">${t("Prepara la sessione", "Prepare the session")}</button>` : ""}</div></div></section>`,
    },
    {
      id: "summary",
      html: `<div class="home-bottom"><section><div class="section-heading"><h2>${t("Il tuo personaggio", "Your character")}</h2></div>${a ? `<button class="character-resume" data-open-sheet="${ctx.esc(a.id)}"><span class="portrait">${ctx.esc(String(a.name).slice(0, 1))}</span><span><strong>${ctx.esc(a.name)}</strong><small>${ctx.esc(classAndLevel(ctx, a.className, a.level))}</small></span><span class="hp-small">${a.hp} / ${a.maxHp}<small>${t("Punti ferita", "Hit points")}</small></span>${ctx.icon("book")}</button>` : `<p>${t("Apri Personaggi per scegliere una scheda accessibile.", "Open Characters to choose an accessible sheet.")}</p>`}</section>
  <section><div class="section-heading"><h2>${t("Dove eravamo rimasti", "Previously")}</h2></div>${recap ? `<h3>${ctx.esc(recap.data.title || t("Resoconto senza titolo", "Untitled recap"))}</h3><p>${ctx.esc(recap.data.body.slice(0, 240))}</p><button class="text-button" data-home-recap="${ctx.esc(recap.id)}">${t("Leggi il resoconto", "Read recap")}</button>` : `<p>${t("Nessun resoconto disponibile. Puoi comunque giocare.", "No recap available. You can still play.")}</p><button class="text-button" data-campaign-tab="journal">${t("Apri il diario", "Open the journal")}</button>`}</section></div>`,
    },
    {
      id: "appointment",
      html: `<section class="campaign-entry"><div><h2>${t("Prossimo appuntamento", "Next appointment")}</h2><p>${t("Nessun incontro programmato", "No session scheduled")}</p></div><button class="button" data-campaign-tab="sessions">${t("Apri sessioni", "Open sessions")}</button></section>`,
    },
  ];
}

// ---------------------------------------------------------------- next session (IN-04)

function countdownHTML(ctx, startsAt) {
  const ms = Date.parse(startsAt) - Date.now();
  return `<span class="home-countdown" data-home-countdown="${ctx.esc(startsAt)}">${ctx.esc(countdownText(ms, ctx.lang))}</span>`;
}
export function renderAppointment(ctx) {
  const t = (it, en) => ctx.t(it, en);
  const sessions = upcomingSessions(ctx.state, ctx.role);
  const next = sessions[0];
  const openSessions = `<button class="button" data-campaign-tab="sessions">${t("Apri sessioni", "Open sessions")}</button>`;
  if (!next)
    return `<section class="campaign-entry home-appointment" data-home-appointment><div><h2>${t("Prossimo appuntamento", "Next appointment")}</h2><p>${t("Nessun incontro programmato", "No session scheduled")}</p></div>${openSessions}</section>`;
  const zone = viewerZone();
  const times = sessionTimes(next.session, ctx.lang, zone);
  const others = sessions.slice(1);
  return `<section class="campaign-entry home-appointment" data-home-appointment data-campaign="${ctx.esc(next.campaignId)}"><div class="home-appointment-main"><h2>${t("Prossimo appuntamento", "Next appointment")}</h2><p class="home-appointment-campaign"><strong>${ctx.esc(next.campaignName)}</strong>${next.session.title ? ` · ${ctx.esc(next.session.title)}` : ""}</p><p class="home-appointment-when">${countdownHTML(ctx, next.session.startsAt)}</p><p><time datetime="${ctx.esc(next.session.startsAt)}">${ctx.esc(times.local)}</time> · ${ctx.esc(times.localZone)} <small class="muted">${t("(la tua ora)", "(your time)")}</small></p><p class="muted home-agreed">${times.sameZone ? t(`Ora concordata nel tuo stesso fuso orario (${times.agreedZone}).`, `Agreed time in your own time zone (${times.agreedZone}).`) : `${t("Ora concordata", "Agreed time")}: ${ctx.esc(times.agreed)} · ${ctx.esc(times.agreedZone)}`}</p>${
    others.length
      ? `<ul class="home-other-sessions" aria-label="${t("Altre campagne", "Other campaigns")}">${others
          .map((row) => {
            const other = sessionTimes(row.session, ctx.lang, zone);
            return `<li data-campaign="${ctx.esc(row.campaignId)}"><strong>${ctx.esc(row.campaignName)}</strong> · ${countdownHTML(ctx, row.session.startsAt)}<small>${ctx.esc(other.local)} · ${ctx.esc(other.localZone)}${other.sameZone ? "" : ` · ${t("concordata", "agreed")} ${ctx.esc(other.agreed)} ${ctx.esc(other.agreedZone)}`}</small></li>`;
          })
          .join("")}</ul>`
      : ""
  }</div><div class="toolbar home-appointment-actions">${next.current ? "" : `<button class="button" data-home-campaign="${ctx.esc(next.campaignId)}">${t("Dettagli della campagna", "Campaign details")}</button>`}${
    // P9 SV-39, owner request 01/10/2026: «Aggiungi al calendario» is the session's own menu
    // from the integrations area (Google, Outlook, Microsoft 365, Yahoo, .ics), the same block
    // as each session in Campaign › Sessions, without its reminder bell; absent when that
    // area is not built or its calendar is switched off.
    next.current
      ? (ctx.registry?.slot?.("campaign-section", "integrations.session", ctx, next.session, {
          bell: false,
        }) ?? "")
      : ""
  }${openSessions}</div></section>`;
}
export function bindAppointment(el, ctx) {
  ctx.registry?.bindSlots(el, ctx, { points: ["campaign-section"] });
  el.querySelectorAll("[data-home-campaign]").forEach((button) =>
    button.addEventListener("click", () =>
      ctx.navigate("campaigns", { id: button.dataset.homeCampaign }),
    ),
  );
}
// The countdown follows the clock while the page is open (checked every 30 s).
function startClock(root, ctx) {
  if (!root.querySelector("[data-home-countdown]") || !globalThis.setInterval) return;
  const timer = setInterval(() => {
    if (!root.isConnected) return clearInterval(timer);
    root.querySelectorAll("[data-home-countdown]").forEach((node) => {
      node.textContent = countdownText(
        Date.parse(node.dataset.homeCountdown) - Date.now(),
        ctx.lang,
      );
    });
  }, 30000);
  // A test runtime (Node) must not stay alive for the countdown.
  timer?.unref?.();
}

// ---------------------------------------------------------------- level-up queue (IN-12)

// BG3 "Level Up" walks every character that can level: one advance after another. The walk
// is this visit's plan (module memory); each advance keeps its own private draft and review.
const walk = { role: null, ids: [], current: null, levels: {} };
export const levelWalk = () => (walk.current ? { ...walk, ids: [...walk.ids] } : null);
export function resetLevelWalk() {
  Object.assign(walk, { role: null, ids: [], current: null, levels: {} });
  closePop();
}
// Opens the advance of one character: its existing draft, or a new private one.
function openAdvance(ctx, actorId) {
  const row = levelUpQueue(ctx.state, ctx.role).find((entry) => entry.actorId === actorId);
  if (!row) return false;
  if (row.draftId) {
    const work = incompleteWork(ctx.state, ctx.role).find((entry) => entry.id === row.draftId);
    resetCharacterBuilderView();
    ctx.navigate("builder", work?.route.params ?? { id: row.draftId });
  } else startCharacterBuilder(ctx, { kind: "advance", actorId: row.actorId });
  return true;
}
export function startLevelWalk(ctx) {
  const queue = levelUpQueue(ctx.state, ctx.role);
  if (!queue.length) return false;
  Object.assign(walk, {
    role: ctx.role,
    ids: queue.map((row) => row.actorId),
    current: queue[0].actorId,
    levels: Object.fromEntries(queue.map((row) => [row.actorId, row.level])),
  });
  return openAdvance(ctx, walk.current);
}
// The builder returns to the sheet after applying: when that sheet is the walk's current
// character and its level went up, the next one in the queue is offered.
export function walkNavigated(ctx, payload) {
  // The offer belongs to the sheet it appeared on: any page change closes it.
  if (currentPop()?.kind === "levelup") closePop();
  if (!walk.current || walk.role !== ctx.role) return;
  if (payload.page !== "characters" || payload.id !== walk.current) return;
  const actor = ctx.state.actors?.[walk.current];
  if (!actor || !(actor.level > walk.levels[walk.current])) return;
  const queue = levelUpQueue(ctx.state, ctx.role);
  const nextId = walk.ids.find(
    (id) => id !== walk.current && queue.some((row) => row.actorId === id),
  );
  const next = queue.find((row) => row.actorId === nextId);
  const t = (it, en) => ctx.t(it, en);
  if (!next) {
    resetLevelWalk();
    ctx.toast(
      t(
        `${actor.name} è al livello ${actor.level}. Coda completata: nessun altro da far salire.`,
        `${actor.name} is now level ${actor.level}. Queue complete: nobody else to level up.`,
      ),
    );
    return;
  }
  walk.ids = walk.ids.filter((id) => id !== walk.current);
  walk.current = next.actorId;
  setTimeout(
    () =>
      showPop(ctx, {
        kind: "levelup",
        id: next.actorId,
        kicker: L("Avanza tutti", "Level up all"),
        title: L(
          `${actor.name} è al livello ${actor.level}`,
          `${actor.name} is now level ${actor.level}`,
        ),
        body: L(
          `In coda: ${next.name} può salire al livello ${next.next}.`,
          `Queued: ${next.name} can reach level ${next.next}.`,
        ),
        anchor: '[data-character-action="table"]',
        placement: "below-end",
        actions: [
          { id: "next", label: L(`Avanza ${next.name}`, `Level ${next.name} up`), primary: true },
          { id: "later", label: L("Più tardi", "Later") },
        ],
        onAction(action) {
          if (action === "next") {
            closePop();
            openAdvance(ctx, next.actorId);
          } else resetLevelWalk();
        },
      }),
    0,
  );
}
function levelButtons(ctx, queue, { heading = false } = {}) {
  const t = (it, en) => ctx.t(it, en);
  return queue.length > 1
    ? `<button type="button" class="button ${heading ? "primary" : ""}" data-home-advance-all aria-label="${ctx.esc(t(`Avanza tutti: ${queue.length} personaggi, uno dopo l’altro`, `Level up all: ${queue.length} characters, one after another`))}">${t(`Avanza tutti (${queue.length})`, `Level up all (${queue.length})`)}</button>`
    : "";
}
export function renderLevelUp(ctx) {
  const queue = levelUpQueue(ctx.state, ctx.role);
  if (!queue.length) return "";
  const t = (it, en) => ctx.t(it, en);
  return `<section class="home-card home-levelup" data-home-levelup aria-labelledby="home-levelup-title"><div class="section-heading"><h2 id="home-levelup-title">${t("Pronti a salire di livello", "Ready to level up")}</h2><span class="badge">${queue.length}</span>${levelButtons(ctx, queue, { heading: true })}</div><ul class="home-list">${queue
    .map(
      (row, index) =>
        `<li class="home-row${index === 0 ? " is-next" : ""}" data-home-levelup-row="${ctx.esc(row.actorId)}"><div class="home-row-text"><strong>${ctx.esc(t(`${row.name} può salire al livello ${row.next}`, `${row.name} can reach level ${row.next}`))}</strong><small>${number(ctx, row.xp)} / ${number(ctx, row.needed)} ${t("PE", "XP")} · ${t("Avanzamento del personaggio, SRD 5.2.1", "Character Advancement, SRD 5.2.1")}${row.draftId ? ` · ${t("avanzamento già in bozza", "level up already in draft")}` : ""}</small><span class="home-xpbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-label="${ctx.esc(t(`Soglia del livello ${row.next} raggiunta`, `Level ${row.next} threshold reached`))}"><span></span></span></div><button type="button" class="button ${index === 0 && queue.length === 1 ? "primary" : ""}" data-home-advance="${ctx.esc(row.actorId)}" aria-label="${ctx.esc(row.draftId ? t(`Riprendi l’avanzamento di ${row.name}`, `Resume ${row.name}’s level up`) : t(`Avanza ${row.name} al livello ${row.next}`, `Level ${row.name} up to ${row.next}`))}">${row.draftId ? t("Riprendi", "Resume") : t("Avanza", "Level up")}</button></li>`,
    )
    .join("")}</ul>${
    queue.length > 1
      ? `<p class="muted home-desc">${ctx.esc(
          t(
            `In coda: dopo ${queue[0].name} tocca a ${queue
              .slice(1)
              .map((row) => row.name)
              .join(
                ", ",
              )}. «Avanza tutti» li apre uno dopo l’altro; ogni avanzamento ha la sua revisione.`,
            `Queued: after ${queue[0].name} comes ${queue
              .slice(1)
              .map((row) => row.name)
              .join(
                ", ",
              )}. “Level up all” opens them one after another; each level up has its own review.`,
          ),
        )}</p>`
      : ""
  }</section>`;
}
export function bindLevelUp(el, ctx) {
  el.querySelectorAll("[data-home-advance]").forEach((button) =>
    button.addEventListener("click", () => {
      resetLevelWalk();
      openAdvance(ctx, button.dataset.homeAdvance);
    }),
  );
  el.querySelector("[data-home-advance-all]")?.addEventListener("click", () => startLevelWalk(ctx));
}
// The sheet's persistent level-up signal (BG3 XP bar that changes state): a "Level up" tab
// shown while the character has the XP of the next level. Not a tip: never archived.
export function levelTabVisible(ctx, actor) {
  return canAdvance(ctx.state, actor, ctx.role) && xpStatus(actor).ready;
}
export function renderLevelTab(ctx, actor) {
  const t = (it, en) => ctx.t(it, en);
  const status = xpStatus(actor);
  const queue = levelUpQueue(ctx.state, ctx.role);
  const row = queue.find((entry) => entry.actorId === actor.id);
  const others = queue.filter((entry) => entry.actorId !== actor.id);
  const span = Math.max(1, status.needed - status.floor);
  const pct = Math.min(100, Math.round((100 * (status.xp - status.floor)) / span));
  return `<section class="panel home-level-tab" data-home-level-tab="${ctx.esc(actor.id)}" aria-labelledby="home-level-tab-title"><div class="section-heading"><h2 id="home-level-tab-title">${ctx.esc(t(`Pronto per il livello ${status.next}`, `Ready for level ${status.next}`))}</h2></div><p><strong>${number(ctx, status.xp)} / ${number(ctx, status.needed)} ${t("PE", "XP")}</strong> · ${t("Avanzamento del personaggio, SRD 5.2.1", "Character Advancement, SRD 5.2.1")}</p><span class="home-xpbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${ctx.esc(t(`Verso il livello ${status.next}`, `Towards level ${status.next}`))}"><span style="width:${pct}%"></span></span><p class="muted">${t("L’avanzamento apre una bozza privata con revisione finale: la scheda in gioco cambia solo quando applichi.", "Levelling up opens a private draft with a final review: the sheet in play changes only when you apply it.")}</p><div class="toolbar"><button type="button" class="button primary" data-home-advance="${ctx.esc(actor.id)}">${row?.draftId ? t("Riprendi l’avanzamento", "Resume the level up") : t(`Avanza al livello ${status.next}`, `Level up to ${status.next}`)}</button>${levelButtons(ctx, queue)}</div>${others.length ? `<p class="muted">${ctx.esc(t(`Pronti anche: ${others.map((entry) => entry.name).join(", ")}.`, `Also ready: ${others.map((entry) => entry.name).join(", ")}.`))}</p>` : ""}</section>`;
}

// ---------------------------------------------------------------- work to resume (IN-06)

export function renderWork(ctx) {
  const rows = incompleteWork(ctx.state, ctx.role);
  if (!rows.length) return "";
  const t = (it, en) => ctx.t(it, en);
  return `<section class="home-card home-work" data-home-work aria-labelledby="home-work-title"><div class="section-heading"><h2 id="home-work-title">${t("Da riprendere", "Pick up where you left off")}</h2><span class="badge">${rows.length}</span></div><ul class="home-list">${rows
    .slice(0, 6)
    .map((row) => {
      const title = `${ctx.label(row.type)}${row.title ? ` · ${row.title}` : ""}`;
      const detail = [
        row.section && row.builder === "quick"
          ? ctx.label(row.section)
          : row.section
            ? t(`Sezione: ${ctx.label(row.section)}`, `Section: ${ctx.label(row.section)}`)
            : "",
        row.updatedAt
          ? t(`salvata ${ago(ctx, row.updatedAt)}`, `saved ${ago(ctx, row.updatedAt)}`)
          : "",
        row.kind === "cobuild"
          ? t("da costruire insieme", "to build together")
          : t("bozza privata, non applicata", "private draft, not applied"),
      ]
        .filter(Boolean)
        .join(" · ");
      return `<li class="home-row" data-home-work-row="${ctx.esc(row.kind + ":" + row.id)}"><div class="home-row-text"><strong>${ctx.esc(title)}</strong><small>${ctx.esc(detail)}</small></div><button type="button" class="button" data-home-resume="${ctx.esc(row.kind + ":" + row.id)}" aria-label="${ctx.esc(t(`Riprendi ${title}`, `Resume ${title}`))}">${t("Riprendi", "Resume")}</button></li>`;
    })
    .join(
      "",
    )}</ul>${rows.length > 6 ? `<p class="muted">${t(`Altre ${rows.length - 6} bozze nelle rispettive pagine.`, `${rows.length - 6} more drafts on their own pages.`)}</p>` : ""}</section>`;
}
export function bindWork(el, ctx) {
  el.querySelectorAll("[data-home-resume]").forEach((button) =>
    button.addEventListener("click", () => {
      const row = incompleteWork(ctx.state, ctx.role).find(
        (entry) => entry.kind + ":" + entry.id === button.dataset.homeResume,
      );
      if (!row)
        return ctx.toast(
          ctx.t("La bozza non è più disponibile.", "The draft is no longer available."),
          true,
        );
      if (row.kind === "character") resetCharacterBuilderView();
      if (row.builder === "quick" || row.kind === "cobuild") resetBuilderPlusView();
      if (row.kind === "homebrew") resetLibraryView();
      if (row.kind === "entry" || row.kind === "session") resetCampaignView();
      ctx.navigate(row.route.page, row.route.params);
    }),
  );
}

// ---------------------------------------------------------------- recent characters (IN-11)

export function renderRecent(ctx) {
  const rows = recentCharacters(ctx.state, ctx.role, readRecents(ctx.role));
  if (!rows.length) return "";
  const t = (it, en) => ctx.t(it, en);
  return `<section class="home-card home-recent" data-home-recent aria-labelledby="home-recent-title"><div class="section-heading"><h2 id="home-recent-title">${t("Accesso rapido", "Quick access")}</h2><small class="muted">${t("Schede aperte di recente su questo dispositivo", "Sheets opened recently on this device")}</small></div><div class="home-recent-grid">${rows
    .map(
      (row) =>
        `<button type="button" class="home-chip" data-open-sheet="${ctx.esc(row.id)}" aria-label="${ctx.esc(t(`Apri la scheda di ${row.name}`, `Open ${row.name}’s sheet`))}"><span class="portrait small" aria-hidden="true">${ctx.esc(String(row.name).slice(0, 1))}</span><span><strong>${ctx.esc(row.name)}</strong><small>${ctx.esc(classAndLevel(ctx, row.className, row.level))}${Number.isFinite(row.hp) ? ` · ${row.hp}/${row.maxHp} ${t("PF", "HP")}` : ""}</small></span></button>`,
    )
    .join("")}</div></section>`;
}

// ---------------------------------------------------------------- first steps (IN-07/08)

function renderStart(ctx, { fresh, hub, campaignsHere = false, folded = false }) {
  const t = (it, en) => ctx.t(it, en);
  const dm = ctx.role === "dm";
  const status = starterStatus(ctx.state, ctx.role);
  const map = dm && hub.permissions.canRead;
  // IN-07: the path always ends in an action — a player joins with the DM's invite, a DM
  // uploads a map straight into a new scene (Roll20 Quick Start).
  const second = map
    ? `<button type="button" class="button quiet" data-home-path="map">${t("Prepara una mappa", "Prepare a map")}</button>`
    : `<button type="button" class="button quiet" data-home-path="join">${t("Unisciti con un invito", "Join with an invite")}</button>`;
  const campaignButtons = `${campaignsHere ? "" : `<button type="button" class="button" data-home-path="campaign">${t("Crea una campagna", "Create a campaign")}</button>`}${second}`;
  const campaignText = campaignsHere
    ? fresh
      ? t(
          "Crea un gruppo con le regole 2024 o entra con il link d’invito del tuo DM da «Le tue campagne», qui sotto.",
          "Create a group with the 2024 rules or join with your DM’s invite link from “Your campaigns”, below.",
        )
      : t(
          "Crea un gruppo con le regole 2024 o entra con il link d’invito del tuo DM da «Le tue campagne», qui sopra.",
          "Create a group with the 2024 rules or join with your DM’s invite link from “Your campaigns”, above.",
        )
    : t(
        "Crea un gruppo con le regole 2024 e una prossima sessione, oppure entra con il link d’invito del tuo DM.",
        "Create a group with the 2024 rules and a next session, or join with your DM’s invite link.",
      );
  const link = (html) => `<li>${html}</li>`;
  const sample = status
    ? `<article class="home-path is-ready" data-home-sample="ready"><h3>${t("«Inizia qui» è pronto", "“Start here” is ready")}</h3><p class="home-desc">${t("Tutto privato: nessun altro lo vede finché non scegli di condividerlo.", "All private: nobody else sees it until you choose to share it.")}</p><ul class="home-checklist">${[
        status.note.exists
          ? link(
              `<button type="button" class="text-button" data-home-starter="note">${t("Apri la nota «Inizia qui»", "Open the “Start here” note")}</button>`,
            )
          : "",
        status.actor.exists
          ? link(
              `<button type="button" class="text-button" data-open-sheet="${ctx.esc(status.actorId)}">${ctx.esc(t(`Apri la scheda di prova: ${status.actor.name}`, `Open the practice sheet: ${status.actor.name}`))}</button>`,
            )
          : "",
        status.scene.exists
          ? link(
              `<button type="button" class="text-button" data-home-starter="scene">${t("Apri la scena di prova", "Open the practice scene")}</button>`,
            )
          : "",
        status.npc.exists
          ? link(
              `<button type="button" class="text-button" data-open-sheet="${ctx.esc(status.npcId)}">${ctx.esc(t(`Apri il nemico d’esempio: ${status.npc.name}`, `Open the sample enemy: ${status.npc.name}`))}</button>`,
            )
          : "",
        status.handout.exists
          ? link(
              `<button type="button" class="text-button" data-home-starter="handout">${t("Apri l’handout di prova a tutto schermo", "Open the practice handout full screen")}</button>`,
            )
          : "",
      ].join(
        "",
      )}</ul><button type="button" class="button quiet" data-home-starter="remove">${t("Rimuovi l’esempio", "Remove the example")}</button></article>`
    : `<article class="home-path" data-home-sample="new"><h3>${t("Un esempio pronto", "A ready example")}</h3><p class="home-desc">${dm ? t("Una nota «Inizia qui» con guida rapida e modello di appunti, una scena di prova nascosta ai giocatori con un nemico d’esempio sulla sua pedina e un handout di prova.", "A “Start here” note with a quick start and a notes template, a practice scene hidden from players with a sample enemy on its token, and a practice handout.") : t("Una nota «Inizia qui» con guida rapida e modello di appunti, più una scheda di prova privata.", "A “Start here” note with a quick start and a notes template, plus a private practice sheet.")}</p><button type="button" class="button" data-home-path="sample">${t("Prova l’esempio", "Try the example")}</button></article>`;
  if (folded)
    return `<details class="home-start home-start-fold" data-home-start data-home-start-folded${ui.startOpen ? " open" : ""}><summary data-home-start-summary><span class="home-eyebrow">${t("Primi passi", "First steps")}</span> <strong>${t("Da dove vuoi iniziare?", "Where do you want to start?")}</strong></summary>${startBody()}<button type="button" class="button quiet" data-home-welcome="hide">${t("Nascondi i primi passi", "Hide first steps")}</button></details>`;
  return `<section class="home-start${fresh ? " is-fresh" : ""}" data-home-start aria-labelledby="home-start-title">${startBody(true)}</section>`;
  function startBody(head = false) {
    return `${head ? `<div class="home-start-head"><div><p class="home-eyebrow">${t("Primi passi", "First steps")}</p><h2 id="home-start-title">${fresh ? t("Benvenuto in d20 Studio", "Welcome to d20 Studio") : t("Da dove vuoi iniziare?", "Where do you want to start?")}</h2><p class="muted home-desc">${t("Tre strade: scegline una, le altre restano qui.", "Three paths: pick one, the others stay here.")}</p></div>${fresh ? "" : `<button type="button" class="button quiet" data-home-welcome="hide">${t("Nascondi i primi passi", "Hide first steps")}</button>`}</div>` : ""}<div class="home-paths"><article class="home-path"><h3>${t("Un personaggio", "A character")}</h3><p class="home-desc">${t("Una bozza privata, anche senza campagna: la completi quando vuoi e la riprendi da qui.", "A private draft, even without a campaign: finish it when you like and resume it from here.")}</p><button type="button" class="button primary" data-home-path="character">${t("Crea un personaggio", "Create a character")}</button></article><article class="home-path" data-home-campaign-path="${campaignsHere ? "above" : "here"}"><h3>${t("Una campagna o una mappa", "A campaign or a map")}</h3><p class="home-desc">${campaignText}</p>${campaignButtons ? `<div class="toolbar">${campaignButtons}</div>` : ""}</article>${sample}</div>`;
  }
}
// Why a part stays: it has become the person's own.
const KEEP = {
  changed: L("resta: l’hai modificata tu", "stays: you changed it"),
  shared: L("resta: è condivisa o mostrata", "stays: it is shared or shown"),
  "in-use": L("resta: è collegata o in uso", "stays: it is connected or in use"),
  editing: L("resta: la stai modificando", "stays: you are editing it"),
};
const KEEP_MALE = {
  changed: L("resta: l’hai modificato tu", "stays: you changed it"),
  shared: L("resta: è condiviso o mostrato", "stays: it is shared or shown"),
  "in-use": L("resta: è collegato o in uso", "stays: it is connected or in use"),
  editing: L("resta: lo stai modificando", "stays: you are editing it"),
};
function openRemoveStarter(ctx) {
  const status = starterStatus(ctx.state, ctx.role);
  if (!status) return;
  const t = (it, en) => ctx.t(it, en);
  const line = (part, name, male = false) => {
    const item = status[part];
    if (!item.exists) return "";
    const outcome = item.removable
      ? male
        ? t("verrà rimosso", "will be removed")
        : t("verrà rimossa", "will be removed")
      : ctx.label((male ? KEEP_MALE : KEEP)[item.reason] ?? KEEP["in-use"]);
    return `<li data-home-remove-part="${part}" data-removable="${item.removable}">${ctx.esc(name)} — ${ctx.esc(outcome)}</li>`;
  };
  const keeps = ["note", "actor", "scene", "npc", "handout"].some(
    (part) => status[part].exists && !status[part].removable,
  );
  ctx.dialog(
    t("Rimuovere l’esempio «Inizia qui»?", "Remove the “Start here” example?"),
    `<ul class="home-consequences">${line("note", t("La nota «Inizia qui»", "The “Start here” note"))}${line("actor", t(`La scheda di prova ${status.actor.name ?? ""}`, `The practice sheet ${status.actor.name ?? ""}`))}${line("scene", t("La scena di prova", "The practice scene"))}${line("npc", t(`Il nemico d’esempio ${status.npc.name ?? ""}`, `The sample enemy ${status.npc.name ?? ""}`), true)}${line("handout", t("L’handout di prova", "The practice handout"), true)}</ul><p class="muted">${keeps ? t("Ciò che hai modificato, condiviso o collegato è tuo e resta dov’è. ", "What you changed, shared or connected is yours and stays where it is. ") : ""}${t("Puoi ricreare l’esempio in qualsiasi momento dai Primi passi.", "You can create the example again at any time from First steps.")}</p>`,
    {
      submitLabel: t("Rimuovi l’esempio", "Remove the example"),
      cancelLabel: t("Tieni l’esempio", "Keep the example"),
      onSubmit() {
        let result;
        ctx.commit(
          t("Esempio «Inizia qui» rimosso", "“Start here” example removed"),
          (draft) => {
            result = removeStarter(draft, ctx.role);
          },
          ctx.role === "dm" && (status.scene.exists || status.npc.exists || status.handout.exists)
            ? { visibility: "private", undoable: false }
            : PRIVATE,
        );
        ctx.toast(
          result.kept.length
            ? t(
                "Esempio rimosso; ciò che è diventato tuo resta.",
                "Example removed; what became yours stays.",
              )
            : t("Esempio rimosso.", "Example removed."),
        );
        // The button that opened this dialog is gone: once the dialog has closed, the
        // keyboard lands on "Try the example", which can bring it back (review P3).
        setTimeout(
          () => globalThis.document?.querySelector('[data-home-path="sample"]')?.focus(),
          0,
        );
      },
    },
  );
}
// IN-07 DM path (Roll20 Quick Start: upload a map, then play): the image becomes a new
// scene open in Preparazione, ready to save and «Attiva al Tavolo». Private to DMs.
const MAP_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAP_MAX_BYTES = 1024 * 1024;
function readMap(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(Error("image"));
      image.onload = () =>
        resolve({ url: reader.result, width: image.naturalWidth, height: image.naturalHeight });
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function openMapStart(ctx) {
  const t = (it, en) => ctx.t(it, en);
  ctx.dialog(
    t("Prepara una mappa", "Prepare a map"),
    `<p class="muted">${t("Carica l’immagine: diventa una scena nuova, riservata ai DM. Poi la salvi e la attivi al Tavolo.", "Upload the image: it becomes a new scene, private to DMs. Then save it and activate it at the Table.")}</p><label class="field">${t("Nome della scena", "Scene name")}<input name="name" required maxlength="100" value="${ctx.esc(t("La mia mappa", "My map"))}"></label><label class="field">${t("Immagine della mappa", "Map image")}<input type="file" name="map" accept="image/png,image/jpeg,image/webp" required data-home-map-file><span class="muted">PNG, JPG, WebP · ${t("fino a 1 MB", "up to 1 MB")}</span></label><p class="muted">${t("Non hai un’immagine? Da Preparazione puoi partire da una scena vuota o da una base.", "No image? In Preparation you can start from a blank scene or a template.")} <button type="button" class="text-button" data-home-map-blank>${t("Apri Preparazione", "Open Preparation")}</button></p>`,
    {
      submitLabel: t("Crea la scena con la mappa", "Create the scene with the map"),
      onSubmit: (data) => {
        const file = data.get("map"),
          name = String(data.get("name") || "").trim();
        if (!name || !file || !file.size)
          throw Error(t("Scegli un nome e un’immagine.", "Choose a name and an image."));
        if (!MAP_TYPES.includes(file.type) || file.size > MAP_MAX_BYTES)
          throw Error(
            t(
              "Scegli un file PNG, JPG o WebP di massimo 1 MB.",
              "Choose a PNG, JPG or WebP file up to 1 MB.",
            ),
          );
        readMap(file)
          .then((image) => {
            const id = globalThis.crypto?.randomUUID?.() ?? `scene-${Date.now().toString(36)}`;
            openSceneDraft(ctx, {
              id,
              name,
              width: 1000,
              height: 650,
              tokens: [],
              walls: [],
              revealed: false,
              background: image.url,
              imageName: file.name,
              imageWidth: image.width,
              imageHeight: image.height,
            });
            ctx.toast(
              t(
                "Mappa caricata: salva la scena, poi «Attiva al Tavolo…».",
                "Map uploaded: save the scene, then «Activate at table…».",
              ),
            );
          })
          .catch(() =>
            ctx.toast(
              t(
                "L’immagine non si apre: prova un altro file.",
                "The image does not open: try another file.",
              ),
              true,
            ),
          );
      },
    },
  );
  globalThis.document?.querySelector("[data-home-map-blank]")?.addEventListener("click", () => {
    ctx.closeDialog();
    ctx.navigate("preparation");
  });
}
function runPath(ctx, path) {
  if (path === "character") return startCharacterBuilder(ctx, { kind: "create" });
  if (path === "campaign") {
    const command = ctx.registry?.get?.("command", "campaign-members.create", ctx);
    if (command) return ctx.registry.run(command, ctx);
    return ctx.navigate("campaigns");
  }
  if (path === "join") {
    ctx.navigate("campaigns");
    // The Campaigns page (B13) takes invitations through "I have an invite link": the
    // keyboard lands on it, one Enter away from pasting the link.
    setTimeout(() => globalThis.document?.querySelector('[data-cm="paste-link"]')?.focus(), 0);
    return;
  }
  if (path === "map") return openMapStart(ctx);
  if (path === "sample") {
    const hub = getCampaignHub(ctx.state, ctx.state.campaign?.id, ctx.role);
    const shared = ctx.role === "dm" && hub.permissions.canRead;
    ui.focus = '[data-home-sample="ready"] [data-home-starter="note"]';
    if (
      personalCommit(
        ctx,
        ctx.t("Esempio «Inizia qui» creato", "“Start here” example created"),
        (draft) => createStarter(draft, ctx.role, { lang: ctx.lang, online: !ctx.offline }),
        shared ? { visibility: "private", undoable: false } : PRIVATE,
      )
    )
      ctx.toast(
        ctx.t(
          "Pronto: la nota è in Appunti personali, visibile solo a te.",
          "Ready: the note is in Personal notes, visible to you only.",
        ),
      );
  }
}

// ---------------------------------------------------------------- side panel (R20-003)

function selectedTab(ctx) {
  const tab = ui.tab ?? ctx.view.tab;
  return TABS.includes(tab) ? tab : "news";
}
function newsHTML(ctx) {
  const t = (it, en) => ctx.t(it, en);
  const news = newsFor(ctx);
  const unread = news.filter((item) => !item.read).length;
  const date = (value) =>
    new Intl.DateTimeFormat(locale(ctx), {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value + "T12:00:00Z"));
  const item = (item) =>
    `<li class="home-news-item${item.read ? "" : " is-unread"}" data-home-news="${ctx.esc(item.id)}"${item.id === ui.newsTarget ? ' tabindex="-1"' : ""}><p class="home-news-meta"><time datetime="${item.date}">${ctx.esc(date(item.date))}</time>${item.read ? "" : `<span class="badge home-badge-new">${t("Nuova", "New")}</span>`}</p><h3>${ctx.esc(ctx.label(item.title))}</h3><p class="home-desc">${ctx.esc(ctx.label(item.body))}</p><div class="toolbar"><button type="button" class="button" data-home-news-action="${ctx.esc(item.id)}">${ctx.esc(ctx.label(item.action.label))}</button><button type="button" class="button quiet" data-home-news-read="${ctx.esc(item.id)}" aria-label="${ctx.esc(item.read ? t(`Segna come non letta: ${ctx.label(item.title)}`, `Mark as unread: ${ctx.label(item.title)}`) : t(`Segna come letta: ${ctx.label(item.title)}`, `Mark as read: ${ctx.label(item.title)}`))}">${item.read ? t("Segna come non letta", "Mark as unread") : t("Segna come letta", "Mark as read")}</button></div></li>`;
  // Roll20 Announcements: the latest entries first; older ones one click away.
  const recent = news.slice(0, NEWS_SHOWN);
  const older = news.slice(NEWS_SHOWN);
  // The entry a notification points to is never left inside a closed section.
  if (older.some((row) => row.id === ui.newsTarget)) ui.older = true;
  return `<div class="home-panel-head"><p data-home-unread="${unread}">${unread ? t(`${unread} da leggere`, `${unread} unread`) : t("Tutte lette", "All read")}</p>${unread ? `<button type="button" class="button quiet" data-home-news-all>${t("Segna tutte come lette", "Mark all as read")}</button>` : ""}</div><ol class="home-news">${recent.map(item).join("")}</ol>${older.length ? `<details class="home-details home-news-older"${ui.older ? " open" : ""}><summary data-home-news-older>${t(`Novità precedenti (${older.length})`, `Earlier news (${older.length})`)}</summary><ol class="home-news">${older.map(item).join("")}</ol></details>` : ""}`;
}
function guidesHTML(ctx, record) {
  const t = (it, en) => ctx.t(it, en);
  const tours = TOURS.map((tour) => {
    const progress = tourProgress(ctx, tour.id);
    const available = tourAvailable(ctx, tour);
    const name = ctx.label(tour.title);
    const state =
      progress.status === "done"
        ? t("Completato", "Completed")
        : progress.status === "paused"
          ? t(
              `In pausa al passo ${progress.step + 1} di ${progress.total}`,
              `Paused at step ${progress.step + 1} of ${progress.total}`,
            )
          : t(`${progress.total} passi`, `${progress.total} steps`);
    const main =
      progress.status === "paused"
        ? [t("Riprendi", "Resume"), t(`Riprendi il tour ${name}`, `Resume the ${name} tour`)]
        : progress.status === "done"
          ? [t("Rivedi", "Replay"), t(`Rivedi il tour ${name}`, `Replay the ${name} tour`)]
          : [t("Avvia", "Start"), t(`Avvia il tour ${name}`, `Start the ${name} tour`)];
    return `<li class="home-row" data-home-tour-row="${tour.id}" data-status="${progress.status}"><div class="home-row-text"><strong>${ctx.esc(name)}</strong><small>${ctx.esc(ctx.label(tour.summary))} · ${ctx.esc(state)}${available ? "" : ` · <span id="home-tour-why-${tour.id}">${t("serve un personaggio o una campagna tuoi: creane uno da Inizio", "needs a character or campaign of yours: create one from Home")}</span>`}</small></div><div class="toolbar"><button type="button" class="button" data-home-tour-start="${tour.id}" aria-label="${ctx.esc(main[1])}" ${available ? "" : `disabled aria-describedby="home-tour-why-${tour.id}"`}>${main[0]}</button>${progress.status === "paused" ? `<button type="button" class="button quiet" data-home-tour-restart="${tour.id}" aria-label="${ctx.esc(t(`Ricomincia il tour ${name}`, `Restart the ${name} tour`))}">${t("Ricomincia", "Restart")}</button>` : ""}</div></li>`;
  }).join("");
  const enabled = tipsEnabled(ctx);
  const tips = TIPS.filter((tip) => ui.undiscovered || record.tips[tip.id]);
  const archivedDate = (value) =>
    new Intl.DateTimeFormat(locale(ctx), { dateStyle: "short", timeStyle: "short" }).format(
      new Date(value),
    );
  const starter = starterStatus(ctx.state, ctx.role);
  return `<section class="home-card" aria-labelledby="home-first-title"><h3 id="home-first-title">${t("Primi passi", "First steps")}</h3>${record.welcome === "hidden" ? `<p class="muted">${t("Hai nascosto i primi passi.", "You hid the first steps.")}</p><button type="button" class="button" data-home-welcome="show">${t("Mostra di nuovo i primi passi", "Show first steps again")}</button>` : `<p class="muted">${t("I primi passi sono nella pagina Inizio.", "First steps are on the Home page.")}</p>`}${starter ? `<p class="home-desc">${t("Il tuo esempio «Inizia qui» è attivo: lo apri e lo rimuovi dai primi passi.", "Your “Start here” example is active: open or remove it from first steps.")}</p>` : ""}</section><section class="home-card" aria-labelledby="home-tours-title"><h3 id="home-tours-title">${t("Tour guidati", "Guided tours")}</h3><ul class="home-list">${tours}</ul><button type="button" class="button quiet" data-home-tours-reset>${t("Ripristina tutti i tour", "Reset all tours")}</button></section><section class="home-card" aria-labelledby="home-tips-title"><h3 id="home-tips-title">${t("Suggerimenti", "Tips")}</h3><p class="muted">${t("Un suggerimento compare accanto alla meccanica la prima volta che la incontri ed entra subito qui.", "A tip appears next to a mechanic the first time you meet it and is added here at once.")}</p><label class="check-field home-check"><input type="checkbox" data-home-tips-enabled ${enabled ? "checked" : ""}> <span>${t("Mostra un suggerimento la prima volta che incontri una meccanica", "Show a tip the first time you meet a mechanic")}</span></label><label class="check-field home-check"><input type="checkbox" data-home-tips-undiscovered ${ui.undiscovered ? "checked" : ""}> <span>${t("Elenca anche quelli non ancora incontrati", "Also list the ones not met yet")}</span></label>${
    tips.length
      ? `<ul class="home-tip-archive">${tips
          .map(
            (tip) =>
              `<li data-home-tip-row="${tip.id}"><details><summary><strong>${ctx.esc(ctx.label(tip.title))}</strong> <small class="muted">${record.tips[tip.id] ? ctx.esc(t(`incontrato ${archivedDate(record.tips[tip.id].archivedAt)}`, `met ${archivedDate(record.tips[tip.id].archivedAt)}`)) : t("non ancora incontrato", "not met yet")}</small></summary><p>${ctx.esc(ctx.label(tip.body))}</p></details></li>`,
          )
          .join("")}</ul>`
      : `<p class="muted">${t("Nessun suggerimento incontrato finora.", "No tips met so far.")}</p>`
  }<button type="button" class="button quiet" data-home-tips-reset ${Object.keys(record.tips).length ? "" : 'disabled aria-describedby="home-tips-reset-why"'}>${t("Ripristina suggerimenti", "Reset tips")}</button>${Object.keys(record.tips).length ? "" : `<p class="muted" id="home-tips-reset-why">${t("Niente da ripristinare: i suggerimenti che incontri finiscono qui.", "Nothing to reset: the tips you meet land here.")}</p>`}</section>`;
}
function renderAside(ctx, record) {
  const t = (it, en) => ctx.t(it, en);
  const tab = selectedTab(ctx);
  const unread = newsFor(ctx).filter((item) => !item.read).length;
  const names = {
    news: t("Novità", "What’s new"),
    guides: t("Guide", "Guides"),
    support: t("Supporto", "Support"),
  };
  const panels = {
    news: () => newsHTML(ctx),
    guides: () => guidesHTML(ctx, record),
    support: () => renderSupport(ctx),
  };
  return `<aside class="home-aside" data-home-aside aria-label="${t("Novità, guide e supporto", "What’s new, guides and support")}"><div class="home-tabs" role="tablist" aria-label="${t("Novità, guide e supporto", "What’s new, guides and support")}">${TABS.map(
    (id) =>
      `<button type="button" role="tab" id="home-tab-${id}" aria-controls="home-panel-${id}" aria-selected="${id === tab}" tabindex="${id === tab ? 0 : -1}" data-home-tab="${id}">${names[id]}${id === "news" && unread ? ` <span class="home-count" aria-label="${t(`${unread} da leggere`, `${unread} unread`)}">${unread}</span>` : ""}</button>`,
  ).join("")}</div>${TABS.map(
    (id) =>
      `<section class="home-panel" role="tabpanel" id="home-panel-${id}" aria-labelledby="home-tab-${id}" data-home-panel="${id}" tabindex="0"${id === tab ? "" : " hidden"}>${panels[id]()}</section>`,
  ).join("")}</aside>`;
}
function selectTab(root, id, { focus = false } = {}) {
  ui.tab = id;
  root.querySelectorAll("[data-home-tab]").forEach((button) => {
    const on = button.dataset.homeTab === id;
    button.setAttribute("aria-selected", String(on));
    button.tabIndex = on ? 0 : -1;
    if (on && focus) button.focus();
  });
  root.querySelectorAll("[data-home-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.homePanel !== id;
  });
}
function bindAside(root, ctx) {
  const aside = root.querySelector("[data-home-aside]");
  if (!aside) return;
  aside.querySelectorAll("[data-home-tab]").forEach((button) => {
    button.addEventListener("click", () => selectTab(aside, button.dataset.homeTab));
    // WAI-ARIA tabs: arrows, Home and End move and select.
    button.addEventListener("keydown", (event) => {
      const index = TABS.indexOf(button.dataset.homeTab);
      const next = {
        ArrowRight: (index + 1) % TABS.length,
        ArrowLeft: (index + TABS.length - 1) % TABS.length,
        Home: 0,
        End: TABS.length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectTab(aside, TABS[next], { focus: true });
    });
  });
  aside
    .querySelector(".home-news-older")
    ?.addEventListener("toggle", (event) => (ui.older = event.currentTarget.open));
  aside.querySelector("[data-home-news-all]")?.addEventListener("click", () =>
    personal(
      ctx,
      (book) =>
        markAllNews(
          book,
          ctx.role,
          newsFor(ctx).map((item) => item.id),
        ),
      '[data-home-tab="news"]',
    ),
  );
  aside.querySelectorAll("[data-home-news-read]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.homeNewsRead;
      const item = newsFor(ctx).find((row) => row.id === id);
      personal(
        ctx,
        (book) => markNews(book, ctx.role, id, !item?.read),
        `[data-home-news-read="${id}"]`,
      );
    }),
  );
  aside.querySelectorAll("[data-home-news-action]").forEach((button) =>
    button.addEventListener("click", () => {
      const item = newsFor(ctx).find((row) => row.id === button.dataset.homeNewsAction);
      if (!item) return;
      // Following a news item also marks it read (Roll20 replays the tour on demand).
      if (!item.read)
        writeBook(ctx, (book) => markNews(book, ctx.role, item.id, true), {
          render: item.action.kind !== "tab",
        });
      const action = item.action;
      if (action.kind === "tour") startTour(ctx, action.id, { restart: true });
      else if (action.kind === "help") openHelp(ctx, { openReport });
      else if (action.kind === "tab") {
        ui.tab = action.tab;
        ui.focus = `[data-home-tab="${action.tab}"]`;
        ctx.render();
      } else if (action.kind === "page") ctx.navigate(action.page);
    }),
  );
  aside
    .querySelectorAll("[data-home-tour-start]")
    .forEach((button) =>
      button.addEventListener("click", () => startTour(ctx, button.dataset.homeTourStart)),
    );
  aside
    .querySelectorAll("[data-home-tour-restart]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        startTour(ctx, button.dataset.homeTourRestart, { restart: true }),
      ),
    );
  aside.querySelector("[data-home-tours-reset]")?.addEventListener("click", () => {
    if (personal(ctx, (book) => resetTours(book, ctx.role), "[data-home-tours-reset]"))
      ctx.toast(
        ctx.t(
          "Tutti i tour ripartono dal primo passo.",
          "All tours start again from the first step.",
        ),
      );
  });
  aside.querySelector("[data-home-tips-reset]")?.addEventListener("click", () => {
    if (personal(ctx, (book) => resetTips(book, ctx.role), "[data-home-tips-enabled]"))
      ctx.toast(
        ctx.t(
          "Suggerimenti ripristinati: riappariranno alla prossima occasione.",
          "Tips reset: they will appear again at the next opportunity.",
        ),
      );
  });
  aside.querySelector("[data-home-tips-enabled]")?.addEventListener("change", (event) => {
    ui.focus = "[data-home-tips-enabled]";
    try {
      ctx.registry.setSetting(ctx, TIPS_SETTING, event.currentTarget.checked);
    } catch (error) {
      event.currentTarget.checked = !event.currentTarget.checked;
      ctx.toast(errorText(ctx, error), true);
    }
  });
  aside.querySelector("[data-home-tips-undiscovered]")?.addEventListener("change", (event) => {
    ui.undiscovered = event.currentTarget.checked;
    ui.focus = "[data-home-tips-undiscovered]";
    ctx.render();
  });
  aside
    .querySelectorAll("[data-home-welcome]")
    .forEach((button) =>
      button.addEventListener("click", () => welcome(ctx, button.dataset.homeWelcome)),
    );
  const support = aside.querySelector('[data-home-panel="support"]');
  if (support) bindSupport(support, ctx);
}
function welcome(ctx, value) {
  const hide = value === "hide";
  if (
    personal(
      ctx,
      (book) => setWelcome(book, ctx.role, hide ? "hidden" : "open"),
      hide ? '[data-home-welcome="show"], [data-home-tab="guides"]' : "[data-home-start] h2",
    ) &&
    hide
  )
    ctx.toast(ctx.t("Li ritrovi in Inizio › Guide.", "You will find them in Home › Guides."));
}

// ---------------------------------------------------------------- page

export function renderHome(ctx) {
  const t = (it, en) => ctx.t(it, en);
  const registry = ctx.registry;
  const hub = getCampaignHub(ctx.state, ctx.state.campaign?.id, ctx.role);
  const record = bookFor(ctx.role);
  const fresh = isNewIdentity(ctx.state, ctx.role);
  // Final review F22 (Roll20 «My Games»: the GM's game card has Launch and the GM's tools):
  // the DM is asked to prepare and run the session, not to find a character.
  const dmHome = ctx.role === "dm";
  const heading = hub.permissions.canRead
    ? dmHome
      ? `<div class="page-heading"><div><h1>${t("La prossima sessione", "Your next session")}</h1><p>${t("Prepara scene e incontri, poi guida il gruppo al Tavolo.", "Prepare scenes and encounters, then run the party at the Table.")}</p></div><button class="button" data-nav="preparation">${ctx.icon("map")} ${t("Preparazione", "Preparation")}</button></div>`
      : `<div class="page-heading"><div><h1>${t("La prossima avventura", "Your next adventure")}</h1><p>${t("Ritrova il tuo personaggio. Il resto può aspettare.", "Find your character. The rest can wait.")}</p></div><button class="button" data-nav="characters">${ctx.icon("person")} ${t("I tuoi personaggi", "Your characters")}</button></div>`
    : `<div class="page-heading"><div><h1>${t("La prossima avventura", "Your next adventure")}</h1><p>${t("Nessuna campagna accessibile. Le tue schede e le note personali rimangono raggiungibili.", "No accessible campaign. Your sheets and personal notes remain available.")}</p></div></div><div class="toolbar"><button class="button" data-nav="characters">${t("Personaggi", "Characters")}</button><button class="button" data-service="notes">${t("Appunti personali", "Personal notes")}</button></div>`;
  // A new identity starts from the three paths; someone with a game or a character finds
  // it first (start.md: characters first, aids optional) and the paths after it.
  const blocks = hub.permissions.canRead ? coreBlocks(ctx, hub) : [];
  const widgets = registry
    ? registry
        .merge("home-widget", blocks, ctx)
        .map((b) => (b.core ? b.html : registry.slot("home-widget", b, ctx)))
        .join("")
    : blocks.map((b) => b.html).join("");
  const campaignsHere = /data-cm="create"/.test(widgets) && /data-cm="paste-link"/.test(widgets);
  // IN-07: first steps lead while a character or a campaign is still missing; otherwise
  // they fold into one line at the end of the page.
  const lead = fresh || needsFirstSteps(ctx.state, ctx.role);
  const start =
    fresh || record.welcome !== "hidden"
      ? renderStart(ctx, { fresh, hub, campaignsHere, folded: !lead })
      : "";
  return `<div class="home-page${previewOn(ctx, "compact") ? " home-compact" : ""}" data-home-page data-fresh="${fresh}" data-home-lead="${lead}">${heading}${lead ? start : ""}<div class="home-layout"><div class="home-main">${widgets}${lead ? "" : start}</div>${renderAside(ctx, record)}</div></div>`;
}
export function bindHome(root, ctx) {
  ctx.registry?.bindSlots(root, ctx, { points: ["home-widget"] });
  // The folded first steps stay as the person left them across renders; the click (before
  // the details flips) keeps a quick follow-up click from finding them closed again.
  const folded = root.querySelector("[data-home-start-folded]");
  folded?.querySelector("summary")?.addEventListener("click", () => (ui.startOpen = !folded.open));
  root
    .querySelectorAll("[data-home-path]")
    .forEach((button) =>
      button.addEventListener("click", () => runPath(ctx, button.dataset.homePath)),
    );
  root
    .querySelectorAll("[data-home-start] [data-home-welcome]")
    .forEach((button) =>
      button.addEventListener("click", () => welcome(ctx, button.dataset.homeWelcome)),
    );
  root.querySelectorAll("[data-home-starter]").forEach((button) =>
    button.addEventListener("click", () => {
      const status = starterStatus(ctx.state, ctx.role);
      const part = button.dataset.homeStarter;
      if (!status) return;
      if (part === "note") ctx.navigate("notes", { tab: "entry", id: status.noteId });
      else if (part === "scene") ctx.navigate("preparation", { id: status.sceneId });
      else if (part === "handout")
        ctx.navigate("campaign", { tab: "handouts", id: status.handoutId });
      else if (part === "remove") openRemoveStarter(ctx);
    }),
  );
  bindAside(root, ctx);
  startClock(root, ctx);
  // Keyboard focus survives the re-render after a personal command.
  if (ui.focus) {
    root.querySelector(ui.focus)?.focus();
    ui.focus = null;
  }
  // Arriving with ?tab=… (from help, a tip or a command) brings that panel into view; with
  // ?tab=news&id=… the news item itself (a bell row points at one entry).
  const routeKey = `${ctx.view.tab}:${ctx.view.id ?? ""}`;
  if (ctx.view.tab && TABS.includes(ctx.view.tab) && !ui.tab && ui.routeFocus !== routeKey) {
    ui.routeFocus = routeKey;
    const item =
      ui.newsTarget &&
      root.querySelector(`[data-home-news="${String(ui.newsTarget).replace(/"/g, "")}"]`);
    const target = item || root.querySelector(`[data-home-tab="${ctx.view.tab}"]`);
    target?.scrollIntoView?.({ block: item ? "center" : "start" });
    target?.focus({ preventScroll: true });
    ui.newsTarget = null;
  }
}
