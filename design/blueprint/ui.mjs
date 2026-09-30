// Distances and other measures in the viewer's language: 1,5 m in Italian, 1.5 m in English.
export const formatNumber = (lang, value, digits = 1) =>
  new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-GB", {
    maximumFractionDigits: digits,
  }).format(Number(value) || 0);
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const paths = {
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z M9 21v-8h6v8",
  person: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3",
  campaign: "M3 5h7l2 3h9v13H3Z",
  book: "M12 5Q6 2 2 5v15q6-3 10 0 4-3 10 0V5q-6-3-10 0Zm0 0v15",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0m-2 5 6 6",
  note: "M5 3h14v18H5Zm3 5h8M8 12h8M8 16h5",
  bell: "M5 17h14l-2-4V9a5 5 0 0 0-10 0v4Zm5 3h4",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  arrow: "M19 12H5m6-6-6 6 6 6",
  play: "m7 3 14 9-14 9Z",
  plus: "M12 4v16M4 12h16",
  undo: "M4 10h10a7 7 0 0 1 0 14 M4 10l5-5M4 10l5 5",
  map: "m2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3Zm7-3v17m6-14v17",
  dice: "M12 2 20.66 7v10L12 22 3.34 17V7Z M12 7.5 17 16H7Z M12 2v5.5 M3.34 7 12 7.5 20.66 7 M3.34 7 7 16 12 22 17 16 20.66 7 M3.34 17 7 16 M20.66 17 17 16",
  move: "M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4",
  sword: "m5 3 15 15-2 2L3 5V3ZM6 18l4-4m-8 8 4-4m-3-3 6 6",
  check: "m4 12 5 5L20 6",
  close: "m5 5 14 14M5 19 19 5",
  menu: "M3 5h18M3 12h18M3 19h18",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  bag: "M5 7h14l2 14H3ZM9 7V5a3 3 0 0 1 6 0v2",
  flag: "M5 22V3m0 0c5-5 9 5 14 0v10c-5 5-9-5-14 0",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 4v5l4 2",
  // B30: the "?" help button (FG R20-012).
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6 M12 17.2v.3",
  // B18: map toolbar chips for Draw (pencil), Template (cone) and Measure (ruler).
  pen: "M4 20h4L19 9l-4-4L4 16Z M13.5 6.5l4 4",
  shape: "M3 12 20 4v16Z M9 9.2v5.6",
  ruler: "M3 16 16 3l5 5L8 21Z M7 12l2 2M10 9l2 2M13 6l2 2",
  // B61: the DM tools group of the map toolbar and the sidebar collapse control.
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z",
  panel: "M3 4h18v16H3Z M15 4v16",
  // B61: distinct sidebar tab icons (log, materials, tables and decks, shop, images).
  chat: "M4 5h16v11H10l-5 4v-4H4Z M8 9h8M8 12h5",
  scroll:
    "M7 4h11a2 2 0 0 1 2 2v1h-4 M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V6 M9 10h6M9 14h6",
  cards: "M3 7h11v14H3Z M7 3h11v14 M8.5 12h0",
  // B32: crossed swords, the combat tracker tab (Foundry's Combat Tracker tab, FVT-127).
  swords: "M5 3 19 17 M16 20l4-4 M18 18l3 3 M19 3 5 17 M4 16l4 4 M6 18l-3 3",
  coins:
    "M12 4c4 0 7 1.3 7 3s-3 3-7 3-7-1.3-7-3 3-3 7-3Z M5 7v5c0 1.7 3 3 7 3s7-1.3 7-3V7 M5 12v5c0 1.7 3 3 7 3s7-1.3 7-3v-5",
  image: "M3 5h18v14H3Z M3 16l5-5 4 4 3-3 6 6 M15.5 9.5h0",
  // B61 review: "All panels" (the sidebar's quick-jump list), an apps grid.
  grid: "M4 4h6v6H4Z M14 4h6v6h-6Z M4 14h6v6H4Z M14 14h6v6h-6Z",
  // B35: fog (cloud with a brush stroke), light (flame over a torch), barrier (brick wall).
  fog: "M7 17h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 10.1 3.5 3.5 0 0 0 7 17Z M5 21h14",
  light: "M12 3c2.5 3 4 5 4 7.5a4 4 0 0 1-8 0C8 8 9.5 6 12 3Z M10 15h4l-1 6h-2Z",
  wall: "M3 5h18v14H3Z M3 9.7h18M3 14.3h18 M9 5v4.7M15 5v4.7 M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6 M9 14.3V19M15 14.3V19",
};
// Brand mark: a faceted d20 (icosahedron seen along a three-fold axis), in the accent gold
// with the page's edge colour (--logo-edge) and the display serif of the visual system.
const d20Faces = [
  ["16,9.5 3.88,9 16,2", 0.86],
  ["16,9.5 16,2 28.12,9", 1],
  ["16,9.5 9,21.5 3.88,9", 0.7],
  ["23,21.5 16,9.5 28.12,9", 0.8],
  ["9,21.5 23,21.5 16,30", 0.58],
  ["9,21.5 3.88,9 3.88,23", 0.5],
  ["9,21.5 3.88,23 16,30", 0.42],
  ["23,21.5 16,30 28.12,23", 0.52],
  ["23,21.5 28.12,23 28.12,9", 0.64],
];
// CA-88 (Roll20 Transmogrifier, contract C5): «Copia in un’altra campagna…» in an item's own
// menu opens campaign-data's copy with the item picked (`openCopyTo(ctx, "<kind>:<id>")`,
// loaded on demand). Offered only while the copy command is available to this identity.
export const canCopyToCampaign = (ctx) =>
  Boolean(ctx?.registry?.get?.("command", "campaign-data.copy-to", ctx));
export function copyToCampaign(ctx, pick, load = () => import("./campaign-data.mjs")) {
  return Promise.resolve()
    .then(load)
    .then((module) => module.openCopyTo(ctx, pick))
    .catch(() =>
      ctx.toast(
        ctx.t(
          "La copia tra campagne non è disponibile: apri Campagna › Dati.",
          "Copying between campaigns is unavailable: open Campaign › Data.",
        ),
        true,
      ),
    );
}
export function logo(className = "logo") {
  const faces = d20Faces
    .map(
      ([points, opacity]) =>
        `<polygon points="${points}" fill="currentColor" fill-opacity="${opacity}"/>`,
    )
    .join("");
  return `<svg class="${className}" viewBox="0 0 32 32" aria-hidden="true"><g stroke="var(--logo-edge, #12171d)" stroke-width="0.6" stroke-linejoin="round">${faces}<polygon points="16,9.5 23,21.5 9,21.5" fill="#f7e6bd"/></g><text x="16" y="19.3" text-anchor="middle" font-family="Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif" font-size="6.8" font-weight="700" fill="#2a2116">20</text></svg>`;
}
/**
 * Brings one item of a scrolling strip (the Table's tab bar or rail, the campaign sections
 * on a phone) into the strip's visible part, without scrolling the page. A strip drawn
 * again starts at its beginning, which would hide the item just chosen (B61 review).
 */
export function scrollIntoStrip(strip, item) {
  if (!strip || !item) return;
  const box = strip.getBoundingClientRect();
  const r = item.getBoundingClientRect();
  if (r.right > box.right) {
    // Final review F11: scroll to the start of a whole tab, so the first visible one is never
    // cut («RATTERISTICHE»), as far as the open tab still fits.
    const need = r.right - box.right;
    const edge = [...(strip.children ?? [])]
      .map((child) => child.getBoundingClientRect().left - box.left)
      .filter((left) => left >= need && left <= r.left - box.left)
      .sort((a, b) => a - b)[0];
    strip.scrollLeft += edge ?? need;
  } else if (r.left < box.left) strip.scrollLeft -= box.left - r.left;
  if (r.bottom > box.bottom) strip.scrollTop += r.bottom - box.bottom;
  else if (r.top < box.top) strip.scrollTop -= box.top - r.top;
}
// Final review P1 (F4, D&D Beyond and Kanka): a new page (another page or another record)
// starts at the top with the focus on its title; Back and Forward restore the position the
// entry had. A tab or section change inside a page is not a new page.
export function isNewPage(prev, next) {
  if (!prev || !next) return false;
  return prev.page !== next.page || (prev.id || "") !== (next.id || "");
}
/** Scroll positions per history entry, the oldest forgotten past `limit`. */
export function createScrollMemory(limit = 60) {
  const positions = new Map();
  return {
    remember(key, y) {
      if (key == null) return;
      positions.delete(key);
      positions.set(key, Math.max(0, Math.round(y)));
      while (positions.size > limit) positions.delete(positions.keys().next().value);
    },
    recall(key) {
      return positions.has(key) ? positions.get(key) : null;
    },
  };
}
/** The path of a core icon (for menus that draw their own svg), or null. */
export const iconPath = (name) => paths[name] ?? null;
export function icon(name) {
  return (
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
    (paths[name] || paths.book) +
    '"/></svg>'
  );
}

/**
 * Puts text at a field's cursor (or over its selection) and tells the field's own handlers
 * with an `input` event, so a draft marks itself changed. Used by Quick Insert (Foundry,
 * SV-02) and the @ / [[ link suggestions of the journal editors (CA-12).
 */
export function insertAtCaret(el, text, range = {}) {
  if (!el || typeof el.value !== "string") return;
  const start = Number.isInteger(range.start)
    ? range.start
    : (el.selectionStart ?? el.value.length);
  const end = Number.isInteger(range.end) ? range.end : (el.selectionEnd ?? start);
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  const caret = start + text.length;
  el.focus?.();
  el.setSelectionRange?.(caret, caret);
  if (typeof globalThis.Event === "function")
    el.dispatchEvent?.(new globalThis.Event("input", { bubbles: true }));
}

/**
 * A notice with one or two buttons ("Apri", "Annulla"), for results the person may want to
 * reach at once (Kanka "Create and open", SV-04). A global overlay under <body>, like the
 * shell's toast; `actions` are [{label, run}]. Returns the element (or null without a DOM).
 */
export function actionToast(
  text,
  actions = [],
  { error = false, timeout = 9000, closeLabel = "×" } = {},
) {
  const doc = globalThis.document;
  if (!doc?.body) return null;
  doc.querySelector(".ui-action-toast")?.remove();
  const el = doc.createElement("div");
  el.className = `ui-action-toast${error ? " error" : ""}`;
  el.setAttribute("role", error ? "alert" : "status");
  el.innerHTML = `<p>${esc(text)}</p><div class="ui-action-toast-actions">${actions
    .map(
      (action, i) =>
        `<button type="button" class="button${i ? " quiet" : " primary"}" data-ui-toast-action="${i}">${esc(action.label)}</button>`,
    )
    .join(
      "",
    )}<button type="button" class="icon-button" data-ui-toast-close aria-label="${esc(closeLabel)}">${icon("close")}</button></div>`;
  let timer = null;
  const close = () => {
    clearTimeout(timer);
    el.remove();
  };
  el.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-ui-toast-action]");
    if (button) {
      close();
      actions[Number(button.dataset.uiToastAction)]?.run?.();
    } else if (event.target.closest?.("[data-ui-toast-close]")) close();
  });
  // Hovering or focusing the notice keeps it (WCAG 2.2.1: enough time to reach «Apri»).
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(close, timeout);
  };
  el.addEventListener("pointerenter", () => clearTimeout(timer));
  el.addEventListener("focusin", () => clearTimeout(timer));
  el.addEventListener("pointerleave", arm);
  doc.body.append(el);
  arm();
  return el;
}

// ------------------------------------------------------------------ tooltips (SV-22)
// Tooltips with an adjustable delay (BG3 "Tooltip delay") that also work by touch: a
// control's `title` (or `data-tip`) shows in a styled bubble after the chosen delay on
// hover or keyboard focus, and after a long press on a touch screen, where a native title
// never appears. The title is lent to the bubble while it shows, so the browser's own
// tooltip does not appear twice, and given back afterwards.
const TIP = {
  installed: false,
  delay: () => 250,
  el: null,
  owner: null,
  timer: null,
  press: null,
  swallow: 0,
};
const TIP_TARGET = "[title],[data-tip]";
const tipText = (el) =>
  el.getAttribute("data-tip") ||
  el.getAttribute("data-tip-title") ||
  el.getAttribute("title") ||
  "";
function tipElement(doc) {
  if (TIP.el?.isConnected) return TIP.el;
  TIP.el = doc.createElement("div");
  TIP.el.className = "ui-tip";
  TIP.el.setAttribute("role", "tooltip");
  TIP.el.id = "ui-tip";
  TIP.el.hidden = true;
  doc.body.append(TIP.el);
  return TIP.el;
}
function lend(el) {
  if (el.hasAttribute("title")) {
    el.setAttribute("data-tip-title", el.getAttribute("title"));
    el.removeAttribute("title");
  }
}
function giveBack(el) {
  if (!el) return;
  if (el.hasAttribute("data-tip-title")) {
    if (!el.hasAttribute("title")) el.setAttribute("title", el.getAttribute("data-tip-title"));
    el.removeAttribute("data-tip-title");
  }
  if (el.getAttribute("aria-describedby") === "ui-tip") el.removeAttribute("aria-describedby");
}
export function hideTip() {
  clearTimeout(TIP.timer);
  if (TIP.el) TIP.el.hidden = true;
  giveBack(TIP.owner);
  TIP.owner = null;
}
function placeTip(doc, el) {
  const tip = tipElement(doc);
  const text = tipText(el).trim();
  if (!text || !el.isConnected) return;
  tip.textContent = text;
  tip.hidden = false;
  const box = el.getBoundingClientRect();
  const width = tip.offsetWidth;
  const height = tip.offsetHeight;
  const view = doc.documentElement;
  const left = Math.max(
    8,
    Math.min(box.left + box.width / 2 - width / 2, view.clientWidth - width - 8),
  );
  const below = box.bottom + 8 + height < view.clientHeight;
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(below ? box.bottom + 8 : Math.max(8, box.top - height - 8))}px`;
  if (!el.hasAttribute("aria-describedby")) el.setAttribute("aria-describedby", "ui-tip");
}
function showTipLater(doc, el, delay) {
  if (TIP.owner && TIP.owner !== el) hideTip();
  TIP.owner = el;
  lend(el);
  clearTimeout(TIP.timer);
  const wait = Math.max(0, Number(delay) || 0);
  if (wait === 0) placeTip(doc, el);
  else TIP.timer = setTimeout(() => TIP.owner === el && placeTip(doc, el), wait);
}
/** Installs the tooltip behaviour once; `delay()` returns the current delay in ms (or -1: off). */
export function installTooltips(doc = globalThis.document, { delay } = {}) {
  if (typeof delay === "function") TIP.delay = delay;
  if (TIP.installed || !doc?.addEventListener) return;
  TIP.installed = true;
  const target = (event) => {
    const el = event.target?.closest?.(TIP_TARGET);
    // The map keeps its own long press (the token menu) and hover labels.
    return el && !el.closest?.("svg, #battle-map, [data-no-tip]") ? el : null;
  };
  doc.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch") return;
    const el = target(event);
    const wait = TIP.delay();
    if (!el || wait < 0 || !tipText(el).trim()) return;
    if (el !== TIP.owner) showTipLater(doc, el, wait);
  });
  doc.addEventListener("pointerout", (event) => {
    if (event.pointerType === "touch" || !TIP.owner) return;
    if (event.relatedTarget && TIP.owner.contains(event.relatedTarget)) return;
    hideTip();
  });
  doc.addEventListener("focusin", (event) => {
    const el = target(event);
    const wait = TIP.delay();
    if (!el || wait < 0 || !el.matches?.(":focus-visible") || !tipText(el).trim()) return;
    showTipLater(doc, el, wait);
  });
  doc.addEventListener("focusout", () => TIP.owner && hideTip());
  doc.addEventListener("keydown", (event) => event.key === "Escape" && TIP.owner && hideTip());
  doc.addEventListener("scroll", () => TIP.owner && hideTip(), true);
  // Touch: a long press shows the tooltip (a native title never appears on a phone); the
  // tap that ends that press does not also press the control.
  doc.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    const el = target(event);
    if (!el || !tipText(el).trim()) return;
    clearTimeout(TIP.press);
    TIP.press = setTimeout(() => {
      showTipLater(doc, el, 0);
      TIP.swallow = Date.now() + 800;
      TIP.timer = setTimeout(hideTip, 2500);
    }, 500);
  });
  for (const type of ["pointerup", "pointercancel", "pointermove"])
    doc.addEventListener(type, (event) => {
      if (event.pointerType !== "touch") return;
      if (type === "pointermove" && Math.hypot(event.movementX || 0, event.movementY || 0) < 6)
        return;
      clearTimeout(TIP.press);
    });
  doc.addEventListener(
    "click",
    (event) => {
      if (Date.now() < TIP.swallow) {
        TIP.swallow = 0;
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
  doc.addEventListener("contextmenu", (event) => {
    if (Date.now() < TIP.swallow && target(event)) event.preventDefault();
  });
}
