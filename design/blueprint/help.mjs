// B30 — Help, first-occurrence tips, guided tours and what's new.
//
// Patterns (IDs from docs/interview/CAPABILITY_CENSUS.md and market-census rows):
// - Fantasy Grounds "?" on a window opens the matching manual page (R20-012): the header
//   "?" opens the help of the current page in a dialog; closing it returns to the page.
//   Area pages build their help from what the area registers (description, commands with
//   their shortcuts, the other places where the area appears).
// - BG3 contextual tutorials (CRP-001): a pop-up the first time a mechanic occurs, which
//   enters the tutorial archive at that moment (with a toggle for tips not met yet) and
//   "Reset tutorials" brings them back. The pop-up is non-modal: it does not take focus,
//   the page under it keeps working, and it goes away with "Got it" or when leaving.
// - Foundry tours (FVT-006), Shard feature tours (VTL-002), DDB "Watch Tour" (DDB-005):
//   each step highlights a real control with a step counter; progress survives closing;
//   one tour or all tours can be reset.
// - Roll20 Announcements tab and DDB "What's New" (R20-003, DDB-007, CMP-05): news in a
//   panel with read/unread, replaying a tour on demand; never a pop-up.
//
// Personal bookkeeping (news read, tips, tours, first steps, reports) lives in a per-device,
// per-identity book (localStorage), like the B24/B17 read markers: it never commits, so it
// never reaches the shared game log, works offline and is untouched by gameplay Undo.
//
// The tour overlay and the pop-up are global overlays under document.body (registry rule:
// the one DOM exception, prefixed "home-"); everything else renders inside given elements.

import { canControlActor } from "./character-access.mjs";
import { formatShortcut } from "./shortcuts.mjs";
import {
  normalizeBook,
  bookOf,
  archiveTip,
  resetTips,
  saveTourProgress,
  markNews,
} from "./home-domain.mjs";

const L = (it, en) => ({ it, en });
export const PRIVATE = { local: true, visibility: "private", undoable: false };
export const errorText = (ctx, error) =>
  error?.it && error?.en
    ? ctx.label({ it: error.it, en: error.en })
    : String(error?.message ?? error);
// Commands that change game records (the "Start here" example): private and, for a
// player's example, offline too.
export function personalCommit(ctx, label, mutator, options = PRIVATE) {
  try {
    ctx.commit(label, mutator, options);
    return true;
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
const doc = () => globalThis.document ?? null;
const isMac = () => /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? "");

// ---------------------------------------------------------------- personal book (device)

export const BOOK_KEY = "d20-studio-home:v1";
let bookStorage; // undefined: the browser's localStorage (a test passes its own)
let bookMemory = null; // fallback when the device cannot store
export function useBookStorage(storage) {
  bookStorage = storage;
  bookMemory = null;
}
function storage() {
  if (bookStorage !== undefined) return bookStorage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
function loadBook() {
  try {
    const raw = storage()?.getItem(BOOK_KEY);
    if (typeof raw === "string") return normalizeBook(JSON.parse(raw));
  } catch {}
  return normalizeBook(bookMemory);
}
// This identity's record: welcome, newsRead, tips, tours, reports.
export const bookFor = (role) => bookOf(loadBook(), role);
// Applies a personal change on this device. No commit: nothing enters the game log.
export function writeBook(ctx, mutator, { render = true } = {}) {
  try {
    const book = loadBook();
    const result = mutator(book);
    bookMemory = normalizeBook(book);
    try {
      storage()?.setItem(BOOK_KEY, JSON.stringify(bookMemory));
    } catch {
      // Storage off: kept in memory for this visit.
    }
    if (render) ctx.render?.();
    return result ?? true;
  } catch (error) {
    ctx.toast?.(errorText(ctx, error), true);
    return false;
  }
}
// "Reset example" clears every identity's personal book on this device.
export function clearBook() {
  bookMemory = null;
  try {
    storage()?.removeItem(BOOK_KEY);
  } catch {}
}

// ---------------------------------------------------------------- settings

export const TIPS_SETTING = "home-tips.enabled";
export const PREVIEW_SETTINGS = {
  "news-bell": "home-previews.news-bell",
  compact: "home-previews.compact",
};
export function setting(ctx, key, fallback) {
  try {
    return ctx.registry?.getSetting ? ctx.registry.getSetting(ctx, key) : fallback;
  } catch {
    return fallback;
  }
}
// Owner decision I-236 (3): tips are off by default and turned on from the help of any page
// (SV-48: «Non mostrare più» on any tip, an archive and a reset); once on, each shows once.
export const tipsEnabled = (ctx) => setting(ctx, TIPS_SETTING, false) === true;
export const previewOn = (ctx, id) => setting(ctx, PREVIEW_SETTINGS[id], false) === true;

// ---------------------------------------------------------------- what's new

// Dated entries, newest first. `requires` hides an entry whose area is not built;
// `roles` limits it to the identities it concerns.
export const NEWS = Object.freeze([
  {
    id: "2026-09-24-home",
    date: "2026-09-24",
    title: L("Inizio rinnovato", "A renewed Home"),
    body: L(
      "Primi passi con tre strade, l’esempio privato «Inizia qui», il lavoro da riprendere nella stessa sezione, chi può salire di livello e la prossima sessione con il conto alla rovescia nella tua ora locale.",
      "First steps with three paths, the private “Start here” example, work to resume at the same section, who can level up and the next session with a countdown in your local time.",
    ),
    action: { kind: "tour", id: "home", label: L("Guarda il tour", "Take the tour") },
  },
  {
    id: "2026-09-24-help",
    date: "2026-09-24",
    title: L("Aiuto «?» su ogni pagina", "“?” help on every page"),
    body: L(
      "Il pulsante «?» in alto (o il tasto F1) apre l’aiuto della pagina in cui sei; chiudendolo torni esattamente lì. I suggerimenti alla prima occorrenza sono attivi: li spegni o li ripristini dallo stesso aiuto.",
      "The “?” button at the top (or the F1 key) opens help for the page you are on; closing it takes you back exactly there. First-occurrence tips are on: turn them off or reset them from the same help.",
    ),
    action: { kind: "help", label: L("Apri l’aiuto", "Open help") },
  },
  {
    id: "2026-09-24-support",
    date: "2026-09-24",
    title: L("Stato, diagnostica e segnalazioni", "Status, diagnostics and reports"),
    body: L(
      "In Supporto vedi lo stato del servizio simulato, la diagnostica di questo dispositivo e prepari una segnalazione senza dati personali.",
      "In Support you see the simulated service status and this device’s diagnostics, and prepare a report without personal data.",
    ),
    action: { kind: "tab", tab: "support", label: L("Apri Supporto", "Open Support") },
  },
  {
    id: "2026-09-23-campaigns",
    date: "2026-09-23",
    requires: "campaign-members",
    title: L("Più campagne, inviti e membri", "More campaigns, invitations and members"),
    body: L(
      "Crea altre campagne, invita con un link e scegli con quale personaggio entrare.",
      "Create more campaigns, invite with a link and choose which character to join with.",
    ),
    action: { kind: "page", page: "campaigns", label: L("Vai alle campagne", "Go to campaigns") },
  },
  {
    id: "2026-09-23-loot",
    date: "2026-09-23",
    requires: "loot",
    title: L("Tesori, PE e scorta del gruppo", "Treasure, XP and party stash"),
    body: L(
      "Il DM prepara i tesori della scena e assegna PE e monete; quando un personaggio raggiunge la soglia, Inizio lo segnala.",
      "The DM prepares scene treasure and awards XP and coins; when a character reaches the threshold, Home shows it.",
    ),
    action: { kind: "page", page: "table", label: L("Vai al Tavolo", "Go to the Table") },
  },
  {
    id: "2026-09-22-conditions",
    date: "2026-09-22",
    title: L("Condizioni e stato", "Conditions and status"),
    body: L(
      "Le 15 condizioni con origine e termine, tiri contro la morte e correzioni motivate, dalla scheda e dal Tavolo.",
      "The 15 conditions with origin and end, death saves and reasoned corrections, from the sheet and the Table.",
    ),
    action: { kind: "tour", id: "sheet", label: L("Tour della scheda", "Sheet tour") },
  },
  {
    id: "2026-09-20-table",
    date: "2026-09-20",
    title: L(
      "Il Tavolo: movimento, attacchi e reazioni",
      "The Table: movement, attacks and reactions",
    ),
    body: L(
      "Muovi le pedine con il costo visibile, prepara attacchi e aree, risolvi Scudo e attacchi d’opportunità con dadi fisici o digitali.",
      "Move tokens with the cost shown, prepare attacks and areas, resolve Shield and opportunity attacks with physical or digital dice.",
    ),
    action: { kind: "tour", id: "table", label: L("Tour del Tavolo", "Table tour") },
  },
]);
function builtAreas(ctx) {
  try {
    return new Set((ctx.registry?.report?.().built ?? []).map((row) => row.id));
  } catch {
    return new Set();
  }
}
export function newsFor(ctx) {
  const built = builtAreas(ctx);
  const read = bookFor(ctx.role).newsRead;
  return NEWS.filter(
    (item) =>
      (!item.requires || built.has(item.requires)) &&
      (!item.roles || item.roles.includes(ctx.role)),
  ).map((item) => ({ ...item, read: Boolean(read[item.id]), readAt: read[item.id] ?? null }));
}
export const unreadNews = (ctx) => newsFor(ctx).filter((item) => !item.read);
// A news item opened from the notification centre (B24 preview) is read here too: one
// read state for both places.
export function newsOpened(ctx, newsId) {
  const item = newsFor(ctx).find((row) => row.id === newsId);
  if (!item || item.read) return false;
  return writeBook(ctx, (book) => markNews(book, ctx.role, newsId, true), { render: false });
}

// ---------------------------------------------------------------- pop-up (global overlay)

const pop = {
  el: null,
  kind: null,
  id: null,
  anchor: null,
  placement: "right",
  listeners: null,
  // B61: a Table tip on a phone is a compact bar above the action bar until "Read" opens it.
  compact: false,
  expanded: false,
};
export const currentPop = () => (pop.kind ? { kind: pop.kind, id: pop.id } : null);
export function closePop({ restoreFocus = false } = {}) {
  const hadFocus = pop.el?.contains?.(doc()?.activeElement);
  if (pop.listeners) {
    globalThis.removeEventListener?.("resize", pop.listeners);
    globalThis.removeEventListener?.("scroll", pop.listeners, true);
    pop.listeners = null;
  }
  pop.el?.remove();
  Object.assign(pop, {
    el: null,
    kind: null,
    id: null,
    anchor: null,
    compact: false,
    expanded: false,
  });
  if (restoreFocus && hadFocus) doc()?.querySelector("#content")?.focus({ preventScroll: true });
}
function visibleTarget(selector) {
  for (const el of doc()?.querySelectorAll(selector) ?? [])
    if (el.getClientRects().length && !el.closest("[hidden]")) return el;
  return null;
}
// Beside the relevant control: to its right when there is room ("right"), or under it
// aligned to its end ("below-end"); docked at the bottom on a phone, like the tour card.
function placePop() {
  const card = pop.el;
  if (!card) return;
  const vw = globalThis.innerWidth ?? 1024;
  const vh = globalThis.innerHeight ?? 768;
  const docked = vw <= 720;
  card.classList.toggle("is-docked", docked);
  if (docked) {
    card.style.top = "";
    card.style.left = "";
    // W1b integration: on a phone the Table's action dock is sticky at the bottom; the
    // docked card sits just above it so Map, Move and End turn stay usable (like B27).
    const dock = visibleTarget("#content .action-dock")?.getBoundingClientRect();
    // B61: at the Table the tip is a one-row bar docked there, like B27's docked X-card,
    // so the map stays uncovered; "Read" opens the whole card at the reader's choice.
    const compact = Boolean(pop.compact && dock && !pop.expanded);
    card.classList.toggle("can-compact", Boolean(pop.compact && dock));
    card.classList.toggle("is-compact", compact);
    // B61: the action bar may sit above the tab bar pinned under it, so "near the
    // bottom" is the lower part of the screen, not the very edge.
    const reach = vh - (card.offsetHeight || 180) - 12 - 96;
    let bottom =
      dock && dock.top < vh && dock.bottom > reach ? vh - dock.top + (compact ? 4 : 8) : null;
    // With no room between the map and the action bar, the bar lies over the Table's tab
    // bar under it for as long as it is shown: the map and the actions stay in view.
    const map = compact ? visibleTarget("#battle-map")?.getBoundingClientRect() : null;
    const h = card.offsetHeight || 49;
    if (bottom !== null && map && map.bottom > vh - bottom - h && vh - dock.bottom >= h)
      bottom = Math.max(0, (vh - dock.bottom - h) / 2);
    card.style.bottom = bottom === null ? "" : `${Math.round(bottom)}px`;
    return;
  }
  let corner = null;
  if (pop.placement === "free-corner") {
    card.classList.remove("is-compact", "can-compact");
    const found = freeCorner(card.offsetWidth || 340, card.offsetHeight || 180, vw, vh);
    corner = found?.spot ?? null;
    // B61: beside the right sidebar the map has less room; when no corner is free the
    // Table tip becomes its one-row bar (as on a phone) in a free spot along the map's
    // edges, and "Read" opens the whole card at the reader's choice.
    if (found?.cost && pop.compact) {
      card.classList.add("is-compact");
      const small = freeCorner(card.offsetWidth || 340, card.offsetHeight || 48, vw, vh, true);
      card.classList.remove("is-compact");
      if (small && !small.cost) {
        card.classList.add("can-compact");
        if (!pop.expanded) {
          card.classList.add("is-compact");
          corner = small.spot;
        }
      }
    }
  }
  const width = card.offsetWidth || 340;
  const height = card.offsetHeight || 180;
  const anchor = pop.anchor ? visibleTarget(pop.anchor) : null;
  let left = vw - width - 16;
  let top = vh - height - 16;
  if (corner) [left, top] = corner;
  else if (anchor) {
    const rect = anchor.getBoundingClientRect();
    if (pop.placement === "right" && rect.right + 12 + width <= vw - 12) {
      left = rect.right + 12;
      top = rect.top;
    } else {
      left = rect.right - width;
      top = rect.bottom + 12;
    }
  }
  const clamp = (value, max) => Math.max(12, Math.min(value, Math.max(12, max)));
  card.style.left = `${clamp(left, vw - width - 12)}px`;
  card.style.top = `${clamp(top, vh - height - 12)}px`;
}
// BG3 keeps its tutorial card at the edge of the screen, off the play area. On the Table
// the card takes the corner of the map area that covers the fewest tokens and controls
// (top-right, bottom-right, bottom-left, top-left beside the map tools), so the player's
// own token is never hidden under it (review P3).
const STAGE = ".map-container";
const AVOID = ".table-stage .map-token, .table-stage button, .table-stage [role='toolbar']";
function freeCorner(width, height, vw, vh, scan = false) {
  const stage = visibleTarget(STAGE);
  if (!stage) return null;
  const area = stage.getBoundingClientRect();
  const tools = visibleTarget(".map-toolbar")?.getBoundingClientRect();
  const top = Math.max(area.top, 0) + 12;
  const bottom = Math.min(area.bottom, vh) - 12 - height;
  const leftmost =
    Math.max(area.left, tools && tools.left < area.left + 120 ? tools.right : 0) + 12;
  const rightmost = Math.min(area.right, vw) - 12 - width;
  const busy = [...(doc()?.querySelectorAll(AVOID) ?? [])]
    .filter((el) => el.getClientRects().length && !pop.el?.contains(el))
    .map((el) => el.getBoundingClientRect());
  const covered = ([x, y]) =>
    busy.reduce(
      (sum, box) =>
        sum +
        Math.max(0, Math.min(x + width, box.right) - Math.max(x, box.left)) *
          Math.max(0, Math.min(y + height, box.bottom) - Math.max(y, box.top)),
      0,
    );
  const spots = [
    [rightmost, top],
    [rightmost, bottom],
    [leftmost, bottom],
    [leftmost, top],
  ];
  // B61 (compact bar): also every 16 px along the right, left, bottom and top edges.
  if (scan)
    for (let step = 16; step < Math.max(bottom - top, rightmost - leftmost); step += 16) {
      if (top + step < bottom) spots.push([rightmost, top + step], [leftmost, top + step]);
      if (leftmost + step < rightmost)
        spots.push([rightmost - step, bottom], [rightmost - step, top]);
    }
  let best = null;
  for (const spot of spots) {
    const cost = covered(spot);
    if (!best || cost < best.cost) best = { spot, cost };
    if (!cost) break;
  }
  return best;
}
// A non-modal card: `aside` with a polite live region, never moving the focus; Escape
// inside it closes it. `actions` are buttons; onAction(id) handles them.
export function showPop(ctx, spec) {
  closePop();
  Object.assign(pop, {
    kind: spec.kind,
    id: spec.id,
    anchor: spec.anchor ?? null,
    placement: spec.placement ?? "right",
    compact: spec.compact === true,
    expanded: false,
  });
  const document = doc();
  if (!document?.body) return;
  const el = document.createElement("aside");
  el.className = `home-pop home-pop-${spec.kind}`;
  el.dataset.homePop = spec.kind;
  el.dataset.homePopId = spec.id;
  el.setAttribute("aria-labelledby", "home-pop-title");
  el.setAttribute("aria-live", "polite");
  document.body.append(el);
  pop.el = el;
  // Filled on the next frame so that the live region announces it.
  const fill = () => {
    if (pop.el !== el) return;
    const more = spec.compact
      ? `<button type="button" class="button quiet home-pop-more" data-home-pop-more aria-expanded="false" aria-controls="home-pop-body" data-more="${ctx.esc(ctx.t("Leggi", "Read"))}" data-less="${ctx.esc(ctx.t("Riduci", "Less"))}">${ctx.esc(ctx.t("Leggi", "Read"))}</button>`
      : "";
    el.innerHTML = `<p class="home-pop-kicker">${ctx.esc(ctx.label(spec.kicker))}</p><h2 id="home-pop-title">${ctx.esc(ctx.label(spec.title))}</h2><p id="home-pop-body">${ctx.esc(ctx.label(spec.body))}</p><div class="home-pop-actions">${more}${spec.actions
      .map(
        (action) =>
          `<button type="button" class="button ${action.primary ? "primary" : "quiet"}" data-home-pop-action="${ctx.esc(action.id)}">${ctx.esc(ctx.label(action.label))}</button>`,
      )
      .join("")}</div>`;
    placePop();
  };
  globalThis.requestAnimationFrame ? requestAnimationFrame(fill) : fill();
  el.addEventListener("click", (event) => {
    const more = event.target.closest?.("[data-home-pop-more]");
    if (more) {
      pop.expanded = !pop.expanded;
      more.setAttribute("aria-expanded", String(pop.expanded));
      more.textContent = pop.expanded ? more.dataset.less : more.dataset.more;
      placePop();
      return;
    }
    const button = event.target.closest?.("[data-home-pop-action]");
    if (button) spec.onAction?.(button.dataset.homePopAction);
  });
  el.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    spec.onAction?.("close");
  });
  pop.listeners = () => placePop();
  globalThis.addEventListener?.("resize", pop.listeners);
  globalThis.addEventListener?.("scroll", pop.listeners, true);
}

// ---------------------------------------------------------------- tips (BG3)

function pendingRollFor(ctx) {
  return (ctx.state.combatAttempts ?? []).some((attempt) =>
    (attempt.requests ?? []).some(
      (request) =>
        request.status === "pending" &&
        (request.personal !== true || request.owner === ctx.role) &&
        canControlActor(ctx.state.actors?.[request.actorId], ctx.role, ctx.state),
    ),
  );
}
// `slot` says where the tip can appear; `when` is the first occurrence of the mechanic.
// The level-up signal is not a tip: it is a persistent state (the sheet's "Level up" tab
// and the Home queue), never archived or switched off.
export const TIPS = Object.freeze([
  {
    id: "table",
    slot: "table",
    priority: 1,
    title: L("Il Tavolo", "The Table"),
    body: L(
      "Seleziona la tua pedina e trascinala: il percorso mostra il costo prima che tu confermi. Esc annulla la preparazione; «Annulla ultima modifica» corregge un errore già applicato.",
      "Select your token and drag it: the path shows the cost before you confirm. Escape cancels the preview; “Undo last change” corrects a mistake already applied.",
    ),
    when: () => true,
  },
  {
    id: "combat",
    slot: "table",
    priority: 2,
    title: L("Turni e iniziativa", "Turns and initiative"),
    body: L(
      "In combattimento l’ordine d’iniziativa è sopra la mappa. Al tuo turno hai azione, azione bonus e movimento; «Termina turno» passa al successivo. Fuori turno puoi preparare una mossa senza eseguirla.",
      "In combat the initiative order is above the map. On your turn you have an action, a bonus action and movement; “End turn” passes to the next. Off turn you can prepare a move without executing it.",
    ),
    when: (ctx) => Boolean(ctx.state.combat?.active),
  },
  {
    id: "rolls",
    slot: "table",
    priority: 3,
    title: L("Tiri fisici o digitali", "Physical or digital dice"),
    body: L(
      "Un tiro richiesto compare in «Richieste in attesa» di Notifiche e richieste, la campanella in alto, e in «Tiri e risultati» al Tavolo. Con «Ho lanciato i dadi» scrivi le facce dei tuoi dadi; con «Tira i dadi» tira l’app. Il risultato resta nel registro e un errore si corregge con un motivo.",
      "A requested roll appears under “Pending requests” in Notifications and requests, the bell at the top, and in “Rolls and results” at the Table. With “I rolled the dice” you type your dice faces; with “Roll dice” the app rolls. The result stays in the log and a mistake is corrected with a reason.",
    ),
    when: (ctx) => pendingRollFor(ctx),
  },
  {
    id: "sheet",
    slot: "sheet",
    priority: 1,
    title: L("La tua scheda", "Your sheet"),
    body: L(
      "In alto trovi punti ferita, classe armatura e condizioni. «Riposa» registra un riposo breve o lungo; «Correggi valori» chiede un motivo e lascia traccia nel registro.",
      "At the top you find hit points, armour class and conditions. “Rest” records a short or long rest; “Correct values” asks for a reason and leaves a trace in the log.",
    ),
    when: () => true,
  },
  {
    id: "conditions",
    slot: "sheet",
    priority: 2,
    title: L("Condizioni", "Conditions"),
    body: L(
      "Ogni condizione mostra origine e termine. Da «Condizioni e stato» la termini con un motivo e vedi come cambia i tiri.",
      "Each condition shows its origin and end. From “Conditions and status” you end it with a reason and see how it changes rolls.",
    ),
    when: (ctx, actor) => (actor?.conditions ?? []).length > 0,
  },
]);
// The most specific tip not archived yet whose mechanic is happening now.
export function pendingTip(ctx, slot, actor = null) {
  if (!tipsEnabled(ctx)) return null;
  const archived = bookFor(ctx.role).tips;
  return (
    TIPS.filter((tip) => tip.slot === slot && !archived[tip.id])
      .filter((tip) => {
        try {
          return tip.when(ctx, actor);
        } catch {
          return false;
        }
      })
      .sort((a, b) => b.priority - a.priority)[0] ?? null
  );
}
// Where tips can appear on the current page: the Table, or a sheet this identity controls.
function tipPlace(ctx) {
  if (ctx.view?.page === "table") return { slot: "table", key: "table", actor: null };
  if (ctx.view?.page === "characters" && ctx.view.id) {
    const actor = ctx.state.actors?.[ctx.view.id];
    const control = ctx.canControl
      ? ctx.canControl(actor)
      : canControlActor(actor, ctx.role, ctx.state);
    if (actor?.kind === "character" && control)
      return { slot: "sheet", key: `sheet:${actor.id}`, actor };
  }
  return null;
}
// One visit of a page: at most one tip at a time, and within the visit only a more
// specific one can follow (combat after the Table tip), never the generic one again.
const tipVisit = { key: null, priority: 0, role: null };
export function resetTipVisit() {
  Object.assign(tipVisit, { key: null, priority: 0, role: null });
  if (pop.kind === "tip") closePop();
}
function tipActions(ctx, tip) {
  return {
    kind: "tip",
    id: tip.id,
    kicker: L("Suggerimento", "Tip"),
    title: tip.title,
    body: tip.body,
    anchor: tip.slot === "table" ? ".map-toolbar" : '[data-character-action="table"]',
    placement: tip.slot === "table" ? "free-corner" : "below-end",
    compact: tip.slot === "table",
    actions: [
      { id: "got-it", label: L("Ho capito", "Got it"), primary: true },
      { id: "all", label: L("Tutti i suggerimenti", "All tips") },
      { id: "off", label: L("Non mostrare più", "Don’t show again") },
    ],
    onAction(action) {
      if (action === "got-it" || action === "close") return closePop({ restoreFocus: true });
      closePop();
      if (action === "all") return ctx.navigate("home", { tab: "guides" });
      if (action === "off")
        try {
          ctx.registry.setSetting(ctx, TIPS_SETTING, false);
          ctx.toast(
            ctx.t(
              "Suggerimenti disattivati. Li riattivi dall’aiuto «?» di ogni pagina, da Inizio › Guide o da Preferenze.",
              "Tips turned off. Turn them back on from the «?» help of any page, Home › Guides or Preferences.",
            ),
          );
        } catch (error) {
          ctx.toast(errorText(ctx, error), true);
        }
    },
  };
}
// Called after the page is drawn (navigate, commit, role change): shows the tip of a
// mechanic happening now for the first time and archives it at once (BG3 journal).
export function syncTips(ctx) {
  const place = tipPlace(ctx);
  // Leaving the Table or the sheet ends the visit: a later return is a new occasion.
  if (!place) {
    resetTipVisit();
    return null;
  }
  if (!tipsEnabled(ctx)) {
    if (pop.kind === "tip") closePop();
    return null;
  }
  if (tipVisit.key !== place.key || tipVisit.role !== ctx.role) {
    Object.assign(tipVisit, { key: place.key, priority: 0, role: ctx.role });
    if (pop.kind === "tip") closePop();
  }
  // Another pop-up (the level-up queue's next character) is not covered by a tip.
  if (pop.kind && pop.kind !== "tip") {
    placePop();
    return null;
  }
  const tip = pendingTip(ctx, place.slot, place.actor);
  if (tip && tip.priority > tipVisit.priority) {
    tipVisit.priority = tip.priority;
    writeBook(ctx, (book) => archiveTip(book, ctx.role, tip.id), { render: false });
    showPop(ctx, tipActions(ctx, tip));
    return tip;
  }
  if (pop.kind) placePop();
  return null;
}
// A language change redraws the open tip in the new language (it is already archived).
export function refreshTipPop(ctx) {
  const tip = pop.kind === "tip" ? TIPS.find((row) => row.id === pop.id) : null;
  if (tip) showPop(ctx, tipActions(ctx, tip));
  else if (pop.kind) closePop();
}
let tipTimer = 0;
// Deferred until the shell has finished drawing the page the pop-up points at.
export function scheduleTips(ctx) {
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => {
    if (!tourUI.active) syncTips(ctx);
  }, 0);
}

// ---------------------------------------------------------------- tours (Foundry)

function ownCharacter(ctx) {
  return (
    Object.values(ctx.state.actors ?? {})
      .filter(
        (actor) =>
          actor?.kind === "character" &&
          !actor.companion &&
          actor.owner === ctx.role &&
          canControlActor(actor, ctx.role, ctx.state),
      )
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))[0] ?? null
  );
}
const sheet = (ctx) => ({ id: ownCharacter(ctx)?.id, tab: "actions" });
// The header as it is drawn now (areas add or rename services, e.g. "Notifications and
// requests", Account): the tour names what the person sees, never a fixed list (review P3).
function headerBody(ctx) {
  const names = (selector, attribute) => [
    ...new Set(
      [...(doc()?.querySelectorAll(selector) ?? [])]
        .filter((el) => el.getClientRects().length)
        .map((el) => (attribute ? el.getAttribute(attribute) : el.textContent)?.trim())
        .filter(Boolean),
    ),
  ];
  const list = (rows) => {
    try {
      return new Intl.ListFormat(ctx.lang === "en" ? "en-GB" : "it-IT", {
        type: "conjunction",
      }).format(rows);
    } catch {
      return rows.join(", ");
    }
  };
  const quote = (rows) => rows.map((name) => (ctx.lang === "en" ? `“${name}”` : `«${name}»`));
  const sections = names(".app-header nav [data-nav]");
  const services = quote(names(".service-nav [data-service]", "title"));
  return L(
    `${sections.length ? `${list(sections)} restano sempre in alto.` : "Le sezioni dell’app restano sempre in alto."} A destra ci sono i servizi${services.length ? `: ${list(services)}` : ""}.`,
    `${sections.length ? `${list(sections)} always stay at the top.` : "The app’s sections always stay at the top."} On the right are the services${services.length ? `: ${list(services)}` : ""}.`,
  );
}
export const TOURS = Object.freeze([
  {
    id: "home",
    title: L("Inizio", "Home"),
    summary: L(
      "Dove ritrovi partita, lavoro in sospeso, novità e aiuto.",
      "Where you find your game, pending work, news and help.",
    ),
    steps: [
      {
        page: "home",
        target: ".app-header nav",
        title: L("Sezioni e servizi", "Sections and services"),
        body: headerBody,
      },
      {
        page: "home",
        target: ".resume-scene",
        fallback: "[data-home-start]",
        title: L("Riprendi la partita", "Resume your game"),
        body: L(
          "Da qui entri al Tavolo o apri la campagna in corso, anche se non c’è un combattimento.",
          "From here you enter the Table or open the current campaign, even when no combat is running.",
        ),
      },
      {
        page: "home",
        target: "[data-home-appointment]",
        title: L("La prossima sessione", "The next session"),
        body: L(
          "Il conto alla rovescia usa la tua ora locale; sotto trovi l’ora concordata nel fuso di chi ha fissato la sessione.",
          "The countdown uses your local time; below it you find the time agreed in the time zone of whoever scheduled the session.",
        ),
      },
      {
        page: "home",
        target: "[data-home-aside]",
        title: L("Novità, guide e supporto", "News, guides and support"),
        body: L(
          "Le novità restano qui finché non le segni come lette. In Guide ritrovi tour e suggerimenti archiviati; in Supporto diagnostica e segnalazioni.",
          "News stays here until you mark it read. In Guides you find tours and archived tips; in Support, diagnostics and reports.",
        ),
      },
      {
        page: "home",
        target: '.service-nav [data-service="home-help"]',
        title: L("Aiuto su ogni pagina", "Help on every page"),
        body: L(
          "«?» apre l’aiuto della pagina in cui sei e, chiuso, ti lascia lì. Da tastiera basta il tasto F1.",
          "“?” opens help for the page you are on and, once closed, leaves you there. On the keyboard, just press F1.",
        ),
      },
    ],
  },
  {
    id: "sheet",
    title: L("Scheda del personaggio", "Character sheet"),
    summary: L(
      "Punti ferita, schede, riposi e avanzamento.",
      "Hit points, tabs, rests and advancement.",
    ),
    requires: (ctx) => Boolean(ownCharacter(ctx)),
    steps: [
      {
        page: "characters",
        params: sheet,
        target: ".character-vitals",
        title: L("Valori vitali", "Vital values"),
        body: L(
          "Punti ferita, classe armatura e condizioni. Dai punti ferita apri Condizioni e stato per danni, cure e correzioni motivate.",
          "Hit points, armour class and conditions. From hit points you open Conditions and status for damage, healing and reasoned corrections.",
        ),
      },
      {
        page: "characters",
        params: sheet,
        target: ".character-tabs",
        title: L("Le parti della scheda", "The parts of the sheet"),
        body: L(
          "Azioni, inventario, incantesimi, capacità, storia ed extra: ogni parte ha i suoi comandi.",
          "Actions, inventory, spells, features, story and extras: each part has its own commands.",
        ),
      },
      {
        page: "characters",
        params: sheet,
        target: '[data-character-action="rest"]',
        title: L("Riposi", "Rests"),
        body: L(
          "Registra un riposo breve o lungo: vedi prima cosa recuperi, poi confermi.",
          "Record a short or long rest: you see what you recover first, then confirm.",
        ),
      },
      {
        page: "characters",
        params: sheet,
        target: '[data-character-action="advance"]',
        title: L("Avanza di livello", "Level up"),
        body: L(
          "Apre una bozza privata: la scheda in gioco cambia solo quando applichi la revisione finale.",
          "Opens a private draft: the sheet in play changes only when you apply the final review.",
        ),
      },
      {
        page: "characters",
        params: sheet,
        target: '[data-character-action="table"]',
        title: L("Al Tavolo", "To the Table"),
        body: L(
          "Porta la stessa scheda al Tavolo: risorse e punti ferita sono gli stessi.",
          "Takes the same sheet to the Table: resources and hit points are the same.",
        ),
      },
    ],
  },
  {
    id: "table",
    title: L("Il Tavolo", "The Table"),
    summary: L(
      "Mappa, strumenti, tiri, richieste e registro.",
      "Map, tools, rolls, requests and log.",
    ),
    requires: (ctx) => Boolean(ctx.state.campaign?.id),
    steps: [
      {
        page: "table",
        target: "#battle-map",
        title: L("La mappa", "The map"),
        body: L(
          "Seleziona una pedina e trascinala; con la tastiera usa le frecce e Invio. Il percorso mostra il costo prima di confermare.",
          "Select a token and drag it; with the keyboard use the arrows and Enter. The path shows the cost before you confirm.",
        ),
      },
      {
        page: "table",
        target: ".map-toolbar",
        title: L("Strumenti della mappa", "Map tools"),
        body: L(
          "Muovi, pianifica un percorso, sposta la vista, misura e indica un punto al gruppo.",
          "Move, plan a path, pan the view, measure and point something out to the party.",
        ),
      },
      {
        page: "table",
        target: ".table-inspector",
        title: L("La pedina scelta", "The chosen token"),
        body: L(
          "Punti ferita, movimento, azioni disponibili e i comandi della scheda della pedina selezionata.",
          "Hit points, movement, available actions and the sheet commands of the selected token.",
        ),
      },
      {
        page: "table",
        target: '[data-table="dice"]',
        title: L("Tira i dadi", "Roll dice"),
        body: L(
          "Ogni tiro può essere fisico (scrivi le facce) o digitale; il risultato resta nel registro.",
          "Every roll can be physical (type the faces) or digital; the result stays in the log.",
        ),
      },
      {
        page: "table",
        target: '.service-nav [data-service="requests"]',
        title: L("Notifiche e richieste", "Notifications and requests"),
        body: L(
          "Qui arrivano i tiri che il DM ti chiede e quelli in sospeso.",
          "Rolls the DM asks you for and pending rolls arrive here.",
        ),
      },
      {
        page: "table",
        // B62: the log is the first panel of the sidebar's Chat tab (Foundry's chat log).
        target: '.table-tabs [data-table-section="chat"]',
        title: L("Registro della sessione", "Session log"),
        body: L(
          "Tutto ciò che accade, con le correzioni: nulla sparisce senza traccia.",
          "Everything that happens, with corrections: nothing disappears without a trace.",
        ),
      },
    ],
  },
]);
export const tourAvailable = (ctx, tour) => !tour.requires || tour.requires(ctx);
export function tourProgress(ctx, tourId) {
  const tour = TOURS.find((row) => row.id === tourId);
  const saved = bookFor(ctx.role).tours[tourId];
  if (!saved) return { status: "new", step: 0, total: tour.steps.length };
  return { status: saved.status, step: saved.step, total: tour.steps.length };
}

const tourUI = {
  opener: null,
  active: null,
  root: null,
  ring: null,
  observer: null,
  frame: 0,
  expect: null,
  missingTimer: 0,
  scrolled: -1,
  listeners: null,
};
export const activeTour = () => (tourUI.active ? { ...tourUI.active } : null);
function stepParams(ctx, step) {
  const params = typeof step.params === "function" ? step.params(ctx) : (step.params ?? {});
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value));
}
function onStepPage(ctx, step) {
  const params = stepParams(ctx, step);
  return ctx.view.page === step.page && (!params.id || ctx.view.id === params.id);
}
export function startTour(ctx, tourId, { restart = false, at = null } = {}) {
  const tour = TOURS.find((row) => row.id === tourId);
  if (!tour) return false;
  if (!tourAvailable(ctx, tour)) {
    ctx.toast(
      ctx.t(
        "Questo tour ha bisogno di un personaggio o di una campagna tuoi.",
        "This tour needs a character or campaign of yours.",
      ),
      true,
    );
    return false;
  }
  // Where the tour was started from (Guides row, help dialog's "?"), for the focus on close.
  const from = doc()?.activeElement;
  if (from && from !== doc().body && !tourUI.root?.contains(from)) tourUI.opener = from;
  closeOverlay();
  closePop();
  const saved = bookFor(ctx.role).tours[tourId];
  const step =
    Number.isInteger(at) && at >= 0 && at < tour.steps.length
      ? at
      : !restart && saved?.status === "paused"
        ? saved.step
        : 0;
  tourUI.active = { id: tourId, step, role: ctx.role };
  showStep(ctx);
  return true;
}
function showStep(ctx) {
  const { id, step } = tourUI.active;
  const tour = TOURS.find((row) => row.id === id);
  const current = tour.steps[step];
  tourUI.scrolled = -1;
  if (!onStepPage(ctx, current)) {
    const params = stepParams(ctx, current);
    tourUI.expect = { page: current.page, id: params.id ?? "" };
    ctx.navigate(current.page, params);
  }
  mountOverlay(ctx);
  schedule(ctx);
}
// The navigate event: a page change the tour did not ask for pauses it, saving progress.
export function tourNavigated(ctx, payload) {
  if (!tourUI.active) return;
  if (tourUI.expect && payload.page === tourUI.expect.page) {
    tourUI.expect = null;
    return;
  }
  const tour = TOURS.find((row) => row.id === tourUI.active.id);
  if (onStepPage(ctx, tour.steps[tourUI.active.step])) return;
  // Not during the shell's render: the saved progress redraws the page right after it.
  setTimeout(() => closeTour(ctx, { save: true, quiet: false }), 0);
}
export function closeTour(
  ctx,
  { save = true, done = false, quiet = true, restoreFocus = false } = {},
) {
  const active = tourUI.active;
  closeOverlay();
  if (!active || !save || active.role !== ctx.role) return;
  const tour = TOURS.find((row) => row.id === active.id);
  writeBook(ctx, (book) =>
    saveTourProgress(
      book,
      ctx.role,
      active.id,
      done ? tour.steps.length - 1 : active.step,
      done ? "done" : "paused",
      tour.steps.length,
    ),
  );
  if (restoreFocus) focusAfterTour(active.id);
  if (!quiet && !done)
    ctx.toast(
      ctx.t(
        `Tour in pausa al passo ${active.step + 1}: riprendilo da Inizio › Guide.`,
        `Tour paused at step ${active.step + 1}: resume it from Home › Guides.`,
      ),
    );
}
// Closed with Escape, × or "Finish tour": the keyboard goes back to the control that
// started it, or to that tour's row in Guides, or to the "?" help button (review P3).
function focusAfterTour(tourId) {
  const usable = (el) =>
    el?.isConnected && !el.disabled && el.getClientRects?.().length && !el.closest?.("[hidden]");
  const target = [
    tourUI.opener,
    visibleTarget(`[data-home-tour-start="${tourId}"]`),
    visibleTarget('.service-nav [data-service="home-help"]'),
  ].find(usable);
  tourUI.opener = null;
  (target ?? doc()?.querySelector("#content"))?.focus?.({ preventScroll: false });
}
// Role change or reset: the overlay goes away without writing for another identity.
export function dropTour() {
  closeOverlay();
}
function closeOverlay() {
  tourUI.active = null;
  tourUI.expect = null;
  clearTimeout(tourUI.missingTimer);
  globalThis.cancelAnimationFrame?.(tourUI.frame);
  tourUI.observer?.disconnect();
  tourUI.observer = null;
  if (tourUI.listeners) {
    globalThis.removeEventListener?.("resize", tourUI.listeners);
    globalThis.removeEventListener?.("scroll", tourUI.listeners, true);
    tourUI.listeners = null;
  }
  tourUI.root?.remove();
  tourUI.ring?.remove();
  tourUI.root = null;
  tourUI.ring = null;
}
function move(ctx, delta) {
  const active = tourUI.active;
  if (!active) return;
  const tour = TOURS.find((row) => row.id === active.id);
  const next = active.step + delta;
  if (next >= tour.steps.length)
    return closeTour(ctx, { save: true, done: true, restoreFocus: true });
  if (next < 0) return;
  active.step = next;
  showStep(ctx);
}
function mountOverlay(ctx) {
  const document = doc();
  if (!document?.body) return;
  if (!tourUI.root) {
    tourUI.ring = document.createElement("div");
    tourUI.ring.className = "home-tour-ring";
    tourUI.ring.setAttribute("aria-hidden", "true");
    tourUI.ring.hidden = true;
    tourUI.root = document.createElement("section");
    tourUI.root.className = "home-tour";
    tourUI.root.setAttribute("role", "dialog");
    tourUI.root.setAttribute("aria-modal", "false");
    tourUI.root.setAttribute("aria-labelledby", "home-tour-title");
    document.body.append(tourUI.ring, tourUI.root);
    tourUI.root.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-home-tour]");
      if (!button) return;
      const action = button.dataset.homeTour;
      if (action === "next") move(ctx, 1);
      else if (action === "back") move(ctx, -1);
      else if (action === "close") closeTour(ctx, { save: true, quiet: false, restoreFocus: true });
    });
    tourUI.root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeTour(ctx, { save: true, quiet: false, restoreFocus: true });
      }
    });
    const app = document.querySelector("#app");
    if (app && globalThis.MutationObserver) {
      tourUI.observer = new MutationObserver(() => schedule(ctx));
      tourUI.observer.observe(app, { childList: true, subtree: true });
    }
    tourUI.listeners = () => schedule(ctx, false);
    globalThis.addEventListener?.("resize", tourUI.listeners);
    globalThis.addEventListener?.("scroll", tourUI.listeners, true);
  }
  const { id, step } = tourUI.active;
  const tour = TOURS.find((row) => row.id === id);
  const current = tour.steps[step];
  const last = step === tour.steps.length - 1;
  tourUI.root.dataset.tour = id;
  tourUI.root.dataset.step = String(step);
  tourUI.root.innerHTML = `<div class="home-tour-head"><p class="home-tour-count">${ctx.esc(ctx.label(tour.title))} · ${ctx.t(`Passo ${step + 1} di ${tour.steps.length}`, `Step ${step + 1} of ${tour.steps.length}`)}</p><button type="button" class="icon-button" data-home-tour="close" aria-label="${ctx.t("Chiudi il tour", "Close the tour")}">${ctx.icon("close")}</button></div><h2 id="home-tour-title" tabindex="-1">${ctx.esc(ctx.label(current.title))}</h2><p>${ctx.esc(ctx.label(typeof current.body === "function" ? current.body(ctx) : current.body))}</p><p class="home-tour-missing" data-home-tour-missing hidden>${ctx.t("Questo controllo non è visibile in questo momento: puoi continuare il tour.", "This control is not visible right now: you can continue the tour.")}</p><div class="home-tour-actions"><button type="button" class="button" data-home-tour="back" ${step === 0 ? 'disabled aria-describedby="home-tour-back-why"' : ""}>${ctx.t("Indietro", "Back")}</button>${step === 0 ? `<span class="visually-hidden" id="home-tour-back-why">${ctx.t("È il primo passo: prosegui con Avanti.", "This is the first step: continue with Next.")}</span>` : ""}<button type="button" class="button primary" data-home-tour="next">${last ? ctx.t("Fine del tour", "Finish tour") : ctx.t("Avanti", "Next")}</button></div>`;
  tourUI.root.querySelector("#home-tour-title")?.focus({ preventScroll: true });
}
function schedule(ctx, scroll = true) {
  if (!tourUI.active) return;
  globalThis.cancelAnimationFrame?.(tourUI.frame);
  tourUI.frame = globalThis.requestAnimationFrame?.(() => place(ctx, scroll)) ?? 0;
}
function place(ctx, scroll) {
  if (!tourUI.active || !tourUI.root) return;
  const tour = TOURS.find((row) => row.id === tourUI.active.id);
  const current = tour.steps[tourUI.active.step];
  const target =
    visibleTarget(current.target) ?? (current.fallback ? visibleTarget(current.fallback) : null);
  const missing = tourUI.root.querySelector("[data-home-tour-missing]");
  if (!target) {
    tourUI.ring.hidden = true;
    clearTimeout(tourUI.missingTimer);
    tourUI.missingTimer = setTimeout(() => {
      if (missing && tourUI.active && !visibleTarget(current.target)) missing.hidden = false;
    }, 900);
    positionCard(null);
    return;
  }
  clearTimeout(tourUI.missingTimer);
  if (missing) missing.hidden = true;
  if (scroll && tourUI.scrolled !== tourUI.active.step) {
    tourUI.scrolled = tourUI.active.step;
    target.scrollIntoView?.({ block: "center", inline: "nearest" });
  }
  const rect = target.getBoundingClientRect();
  const pad = 6;
  Object.assign(tourUI.ring.style, {
    top: `${rect.top - pad}px`,
    left: `${rect.left - pad}px`,
    width: `${rect.width + pad * 2}px`,
    height: `${rect.height + pad * 2}px`,
  });
  tourUI.ring.hidden = false;
  tourUI.root.dataset.target = current.target;
  positionCard(rect);
}
function positionCard(rect) {
  const card = tourUI.root;
  const vw = globalThis.innerWidth ?? 1024;
  const vh = globalThis.innerHeight ?? 768;
  if (vw <= 720 || !rect) {
    // Phone: docked at the bottom like a sheet; no target: centred.
    card.classList.toggle("is-docked", vw <= 720);
    card.style.top = vw <= 720 ? "" : `${Math.max(16, vh / 2 - card.offsetHeight / 2)}px`;
    card.style.left = vw <= 720 ? "" : `${Math.max(16, vw / 2 - card.offsetWidth / 2)}px`;
    return;
  }
  card.classList.remove("is-docked");
  const width = card.offsetWidth || 360;
  const height = card.offsetHeight || 200;
  const below = rect.bottom + 14;
  const top = below + height <= vh - 12 ? below : Math.max(12, rect.top - height - 14);
  const left = Math.min(Math.max(12, rect.left), vw - width - 12);
  card.style.top = `${top}px`;
  card.style.left = `${left}px`;
}

// ---------------------------------------------------------------- page help (FG "?")

const HELP = {
  home: {
    title: L("Inizio", "Home"),
    can: [
      L(
        "Riprendere la partita: Entra al Tavolo o apri la campagna.",
        "Resume your game: Enter table or open the campaign.",
      ),
      L(
        "Riprendere una bozza nella sezione in cui l’avevi lasciata.",
        "Resume a draft at the section where you left it.",
      ),
      L(
        "Vedere chi può salire di livello («Avanza tutti» li fa uno dopo l’altro) e la prossima sessione con il conto alla rovescia.",
        "See who can level up (“Level up all” takes them one after another) and the next session with its countdown.",
      ),
      L(
        "Leggere le novità, rivedere tour e suggerimenti, preparare una segnalazione.",
        "Read what’s new, replay tours and tips, prepare a report.",
      ),
    ],
    tour: "home",
  },
  characters: {
    title: L("Personaggi", "Characters"),
    can: [
      L(
        "Aprire le schede che puoi vedere; quelle private restano solo tue.",
        "Open the sheets you can see; private ones stay yours alone.",
      ),
      L(
        "Creare un personaggio con una bozza privata, anche senza campagna.",
        "Create a character through a private draft, even without a campaign.",
      ),
      L(
        "Collegare una scheda alla campagna solo con un passaggio esplicito.",
        "Connect a sheet to the campaign only through an explicit step.",
      ),
    ],
    tour: "sheet",
  },
  sheet: {
    title: L("Scheda del personaggio", "Character sheet"),
    can: [
      L(
        "Punti ferita, condizioni, riposi e tiri con dadi fisici o digitali.",
        "Hit points, conditions, rests and rolls with physical or digital dice.",
      ),
      L(
        "«Correggi valori» chiede un motivo e resta nel registro.",
        "“Correct values” asks for a reason and stays in the log.",
      ),
      L(
        "«Avanza di livello» apre una bozza privata: nulla cambia finché non applichi. Quando hai i PE, compare la scheda «Sali di livello».",
        "“Level up” opens a private draft: nothing changes until you apply it. When you have the XP, the “Level up” tab appears.",
      ),
    ],
    tour: "sheet",
  },
  builder: {
    title: L("Bozza del personaggio", "Character draft"),
    can: [
      L(
        "Compilare le sezioni in qualsiasi ordine; «Salva bozza» conserva anche i campi incompleti.",
        "Fill in the sections in any order; “Save draft” keeps incomplete fields too.",
      ),
      L(
        "Riprendere più tardi da Inizio nella stessa sezione.",
        "Resume later from Home at the same section.",
      ),
      L(
        "Applicare solo dal Riepilogo, dopo aver visto le differenze.",
        "Apply only from the Review, after seeing the differences.",
      ),
    ],
    tour: null,
  },
  campaigns: {
    title: L("Campagne", "Campaigns"),
    can: [
      L(
        "Vedere le tue campagne, crearne una o entrare con un link d’invito.",
        "See your campaigns, create one or join with an invite link.",
      ),
      L(
        "Scegliere con quale personaggio partecipare.",
        "Choose which character to take part with.",
      ),
    ],
    tour: null,
  },
  campaign: {
    title: L("Campagna", "Campaign"),
    can: [
      L(
        "Panoramica, gruppo, sessioni, diario e mondo della campagna in corso.",
        "Overview, party, sessions, journal and world of the current campaign.",
      ),
      L(
        "Concordare una data o raccogliere le disponibilità.",
        "Agree a date or collect availability.",
      ),
      L(
        "Ogni testo ha destinatari espliciti; i tuoi appunti restano privati.",
        "Every text has explicit recipients; your notes stay private.",
      ),
    ],
    tour: null,
  },
  notes: {
    title: L("Appunti personali", "Personal notes"),
    can: [
      L(
        "Scrivere note «Solo io»: il DM non le legge.",
        "Write “Only me” notes: the DM does not read them.",
      ),
      L(
        "Condividerle solo scegliendo i destinatari; la cronologia resta.",
        "Share them only by choosing recipients; the history stays.",
      ),
    ],
    tour: null,
  },
  preparation: {
    title: L("Preparazione", "Preparation"),
    can: [
      L(
        "Preparare scene, mappe, muri, porte e incontri senza mostrarli ai giocatori.",
        "Prepare scenes, maps, walls, doors and encounters without showing them to players.",
      ),
      L(
        "Mostrare una scena solo quando scegli; attivarla al Tavolo.",
        "Show a scene only when you choose; activate it at the Table.",
      ),
    ],
    tour: null,
  },
  table: {
    title: L("Tavolo", "Table"),
    can: [
      L(
        "Muovere le pedine con il costo visibile prima di confermare.",
        "Move tokens with the cost shown before confirming.",
      ),
      L(
        "Attaccare, lanciare incantesimi e rispondere alle richieste con dadi fisici o digitali.",
        "Attack, cast spells and answer requests with physical or digital dice.",
      ),
      L(
        "Esc annulla la preparazione; «Annulla ultima modifica» corregge con una traccia.",
        "Escape cancels the preview; “Undo last change” corrects with a trace.",
      ),
    ],
    tour: "table",
  },
  library: {
    title: L("Biblioteca", "Library"),
    can: [
      L(
        "Consultare i contenuti disponibili e le tue raccolte.",
        "Browse available content and your collections.",
      ),
      L(
        "Creare e rivedere contenuti tuoi, poi assegnarli a una scheda o a una bozza.",
        "Create and revise your own content, then assign it to a sheet or a draft.",
      ),
    ],
    tour: null,
  },
};
export function helpKey(ctx) {
  const page = ctx.view.page;
  if (page === "characters" && ctx.view.id) return "sheet";
  return HELP[page] ? page : "area";
}
// Where an area appears besides its page: points listed with the real ctx only (their
// `when` needs no other argument).
const PLACES = [
  ["route", L("Pagina", "Page")],
  ["campaign-section", L("Campagna", "Campaign")],
  ["preparation-section", L("Preparazione", "Preparation")],
  ["library-section", L("Biblioteca", "Library")],
  ["home-widget", L("Inizio", "Home")],
  ["service", L("In alto", "At the top")],
];
function safeList(ctx, point) {
  try {
    return ctx.registry?.list?.(point, ctx) ?? [];
  } catch {
    return [];
  }
}
// FG "?" for an area page: built from what the area registers, not a generic sentence.
function areaHelp(ctx) {
  const page = ctx.view.page;
  const route = ctx.registry?.get?.("route", page, ctx) ?? null;
  const name = route ? ctx.registry.label(route, ctx.lang) : page;
  const area = route?.extension ?? null;
  const own = (c) => area && c.extension === area;
  const commands = safeList(ctx, "command")
    .filter((c) => own(c) || c.context === page)
    .map((c) => ({
      label: c.label,
      shortcut: c.shortcut ? formatShortcut(c.shortcut, { lang: ctx.lang, mac: isMac() }) : null,
    }));
  const places = PLACES.flatMap(([point, where]) =>
    safeList(ctx, point)
      .filter((c) => own(c) && !(point === "route" && c.id === page))
      .map((c) => ({
        it: `${where.it} › ${ctx.registry.label(c, "it")}`,
        en: `${where.en} › ${ctx.registry.label(c, "en")}`,
      })),
  );
  return {
    key: "area",
    title: { it: name, en: name },
    description: route?.description ?? null,
    can: commands.length
      ? commands.map((row) =>
          row.shortcut
            ? {
                it: `${ctx.label(row.label)} — ${row.shortcut}`,
                en: `${ctx.label(row.label)} — ${row.shortcut}`,
              }
            : row.label,
        )
      : [
          L(
            "Quest’area non aggiunge comandi da tastiera: usa i pulsanti della pagina.",
            "This area adds no keyboard commands: use the buttons on the page.",
          ),
        ],
    canTitle: commands.length ? L("Comandi di quest’area", "Commands of this area") : null,
    places,
    tour: null,
  };
}
export function helpContent(ctx) {
  const key = helpKey(ctx);
  if (key !== "area") return { key, ...HELP[key] };
  return areaHelp(ctx);
}
export function helpBody(ctx) {
  const help = helpContent(ctx);
  const tour = help.tour ? TOURS.find((row) => row.id === help.tour) : null;
  const available = tour && tourAvailable(ctx, tour);
  const list = (rows) =>
    `<ul>${rows.map((row) => `<li>${ctx.esc(ctx.label(row))}</li>`).join("")}</ul>`;
  return `<div class="home-help" data-home-help="${ctx.esc(help.key)}"><p class="muted">${ctx.t("Aiuto per questa pagina", "Help for this page")}: <strong>${ctx.esc(ctx.label(help.title))}</strong></p>${help.description ? `<p>${ctx.esc(ctx.label(help.description))}</p>` : ""}<h3>${ctx.esc(ctx.label(help.canTitle ?? L("Cosa puoi fare qui", "What you can do here")))}</h3>${list(help.can)}${help.places?.length ? `<h3>${ctx.t("La trovi anche in", "Also found in")}</h3>${list(help.places)}` : ""}${help.key === "area" ? `<p class="muted">${((key) => ctx.t(`Tutti i comandi, con le scorciatoie, sono anche in Cerca e comandi (${key}).`, `Every command, with its shortcut, is also in Search and commands (${key}).`))(ctx.esc(formatShortcut("Mod+K", { lang: ctx.lang, mac: isMac() })))}</p>` : ""}<div class="toolbar">${available ? `<button type="button" class="button primary" data-home-help-tour="${ctx.esc(tour.id)}">${ctx.t(`Avvia il tour «${ctx.label(tour.title)}»`, `Start the “${ctx.label(tour.title)}” tour`)}</button>` : ""}<button type="button" class="button" data-home-help-guides>${ctx.t("Tour e suggerimenti", "Tours and tips")}</button><button type="button" class="button" data-home-help-report>${ctx.t("Segnala un problema", "Report a problem")}</button></div>${tipsBlock(ctx)}<p class="muted">${ctx.t("Scorciatoia: F1 apre questo aiuto da qualsiasi pagina (il tasto ? apre la guida alle scorciatoie).", "Shortcut: F1 opens this help from any page (the ? key opens the shortcut guide).")}</p></div>`;
}
// BG3: tips on or off, their archive and «Ripristina suggerimenti», from the help of every
// page (the Table included), so nobody has to leave the page to find them.
function tipsBlock(ctx) {
  const on = tipsEnabled(ctx),
    met = Object.keys(bookFor(ctx.role).tips ?? {}).length;
  return `<section class="home-help-tips" data-home-help-tips aria-labelledby="home-help-tips-title"><h3 id="home-help-tips-title">${ctx.t("Suggerimenti", "Tips")}</h3><p class="muted">${on ? ctx.t(`Attivi: compaiono la prima volta che incontri una meccanica. Già visti: ${met}.`, `On: they appear the first time you meet a mechanic. Seen so far: ${met}.`) : ctx.t("Spenti: nessun suggerimento compare.", "Off: no tip appears.")}</p><div class="toolbar"><button type="button" class="button" data-home-help-tips-toggle>${on ? ctx.t("Non mostrare più i suggerimenti", "Stop showing tips") : ctx.t("Mostra i suggerimenti", "Show tips")}</button><button type="button" class="button quiet" data-home-help-tips-reset ${met ? "" : 'disabled aria-describedby="home-help-tips-reset-why"'}>${ctx.t("Ripristina suggerimenti", "Reset tips")}</button>${met ? "" : `<span class="visually-hidden" id="home-help-tips-reset-why">${ctx.t("Niente da ripristinare: nessun suggerimento visto finora.", "Nothing to reset: no tip seen so far.")}</span>`}<button type="button" class="button quiet" data-home-help-tips-archive>${ctx.t("Archivio dei suggerimenti", "Tips archive")}</button></div></section>`;
}
function bindTipsBlock(box, ctx) {
  const redraw = () => {
    const holder = doc()?.createElement("div");
    const old = box.querySelector("[data-home-help-tips]");
    if (!holder || !old) return;
    holder.innerHTML = tipsBlock(ctx);
    const next = holder.firstElementChild;
    old.replaceWith(next);
    bindTipsBlock(box, ctx);
  };
  box.querySelector("[data-home-help-tips-toggle]")?.addEventListener("click", () => {
    try {
      ctx.registry.setSetting(ctx, TIPS_SETTING, !tipsEnabled(ctx));
      ctx.toast(
        tipsEnabled(ctx)
          ? ctx.t("Suggerimenti attivi.", "Tips on.")
          : ctx.t("Suggerimenti disattivati.", "Tips turned off."),
      );
    } catch (error) {
      ctx.toast(errorText(ctx, error), true);
    }
    redraw();
    box.querySelector("[data-home-help-tips-toggle]")?.focus?.();
  });
  box.querySelector("[data-home-help-tips-reset]")?.addEventListener("click", () => {
    writeBook(ctx, (book) => resetTips(book, ctx.role), { render: false });
    ctx.toast(
      ctx.t(
        "Suggerimenti ripristinati: riappariranno alla prossima occasione.",
        "Tips reset: they will appear again at the next opportunity.",
      ),
    );
    redraw();
    box.querySelector("[data-home-help-tips-archive]")?.focus?.();
  });
  box.querySelector("[data-home-help-tips-archive]")?.addEventListener("click", () => {
    ctx.closeDialog();
    ctx.navigate("home", { tab: "guides" });
  });
}
// Opens in the common dialog: closing it (button, ×, Escape) leaves the page as it was.
export function openHelp(ctx, { openReport } = {}) {
  const help = helpContent(ctx);
  ctx.dialog(
    ctx.t(`Aiuto · ${ctx.label(help.title)}`, `Help · ${ctx.label(help.title)}`),
    helpBody(ctx),
    {
      cancelLabel: ctx.t("Torna alla pagina", "Back to the page"),
    },
  );
  const box = doc()?.querySelector("#dialog [data-home-help]");
  if (!box) return;
  box.querySelector("[data-home-help-tour]")?.addEventListener("click", (event) => {
    const id = event.currentTarget.dataset.homeHelpTour;
    ctx.closeDialog();
    startTour(ctx, id);
  });
  box.querySelector("[data-home-help-guides]")?.addEventListener("click", () => {
    ctx.closeDialog();
    ctx.navigate("home", { tab: "guides" });
  });
  box.querySelector("[data-home-help-report]")?.addEventListener("click", () => openReport?.(ctx));
  bindTipsBlock(box, ctx);
}
