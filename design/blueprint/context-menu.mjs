// Final review X-06 (Owlbear Rodeo and Fantasy Grounds: a labelled context menu on every
// object, opened by right-click, long press or the keyboard). A row marked
// `data-context-menu="<its name>"` gets a menu of its own visible commands, in their order,
// by their accessible names; choosing one presses that command. Nothing new is invented:
// the menu is a second way to reach what the row already offers (Foundry's context menus
// on sidebar entries do the same). Core module, no imports.

/** Pure: the menu entries from the row's command descriptors (label, disabled, hidden). */
export function contextItems(descriptors) {
  const seen = new Set();
  const items = [];
  for (const entry of descriptors) {
    const label = String(entry.label ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!label || entry.disabled || entry.hidden || seen.has(label)) continue;
    seen.add(label);
    items.push({ ...entry, label });
  }
  return items;
}

const COMMANDS = "button, a[href], summary";
// «Gestisci Livia» in Livia's own menu reads «Gestisci»: the title already names the object.
function withoutTitle(label, title) {
  const text = String(label ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title || !text.includes(title)) return text;
  const rest = text
    .replace(title, "")
    .replace(/\s*[:·—-]\s*$/, "")
    .replace(/^\s*[:·—-]\s*/, "")
    .trim();
  return rest || text;
}
function commandsOf(row) {
  const title = row.getAttribute("data-context-menu") || "";
  return contextItems(
    [...row.querySelectorAll(COMMANDS)]
      .filter((el) => el.closest("[data-context-menu]") === row)
      .map((el) => ({
        el,
        label: withoutTitle(el.getAttribute("aria-label") || el.textContent, title),
        disabled: el.disabled || el.getAttribute("aria-disabled") === "true",
        hidden: !el.getClientRects().length && !el.closest("details:not([open])"),
      })),
  );
}

let menu = null;
function close({ restore = true } = {}) {
  if (!menu) return;
  const { el, returnTo } = menu;
  menu = null;
  if (el.matches?.(":popover-open")) el.hidePopover();
  el.remove();
  if (restore && returnTo?.isConnected) returnTo.focus({ preventScroll: true });
}

function open(doc, row, at, t, returnTo) {
  close({ restore: false });
  const items = commandsOf(row);
  if (!items.length) return false;
  const title = row.getAttribute("data-context-menu") || "";
  const el = doc.createElement("div");
  el.className = "context-menu";
  el.setAttribute("role", "menu");
  el.setAttribute("aria-label", t(`Comandi: ${title}`, `Commands: ${title}`));
  const heading = doc.createElement("p");
  heading.className = "context-menu-title";
  heading.textContent = title;
  heading.setAttribute("aria-hidden", "true");
  el.append(heading);
  for (const item of items) {
    const button = doc.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.textContent = item.label;
    button.addEventListener("click", () => {
      close({ restore: false });
      if (!item.el.isConnected) return;
      if (item.el.tagName === "SUMMARY") item.el.parentElement.open = true;
      item.el.click();
    });
    el.append(button);
  }
  doc.body.append(el);
  if (typeof el.showPopover === "function") {
    el.setAttribute("popover", "manual");
    el.showPopover();
  }
  const view = doc.defaultView;
  const box = el.getBoundingClientRect();
  const x = Math.max(8, Math.min(at.x, view.innerWidth - box.width - 8));
  const y = Math.max(8, Math.min(at.y, view.innerHeight - box.height - 8));
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
  menu = { el, row, returnTo };
  el.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
  el.addEventListener("keydown", (event) => {
    const buttons = [...el.querySelectorAll('[role="menuitem"]')];
    const index = buttons.indexOf(doc.activeElement);
    const move = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (move) buttons[(index + move + buttons.length) % buttons.length]?.focus();
    else if (event.key === "Home") buttons[0]?.focus();
    else if (event.key === "End") buttons.at(-1)?.focus();
    else if (event.key === "Escape") close();
    else if (event.key === "Tab") close();
    else return;
    event.preventDefault();
    event.stopPropagation();
  });
  return true;
}

const typing = (el) =>
  Boolean(el?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable=true]"));

/** Installs the delegated listeners once. `t(it, en)` names the menu in the viewer's language. */
export function installContextMenus(doc, t) {
  if (!doc || doc.__d20ContextMenus) return;
  doc.__d20ContextMenus = true;
  doc.addEventListener("contextmenu", (event) => {
    // An area's own menu (the inventory's dnd5e row menu) keeps the event.
    if (event.defaultPrevented) return;
    const row = event.target.closest?.("[data-context-menu]");
    if (!row || typing(event.target)) return;
    const keyboard = event.clientX === 0 && event.clientY === 0;
    const r = (keyboard ? (doc.activeElement ?? row) : row).getBoundingClientRect();
    const at = keyboard
      ? { x: r.left + 8, y: r.bottom + 4 }
      : { x: event.clientX, y: event.clientY };
    if (open(doc, row, at, t, doc.activeElement)) event.preventDefault();
  });
  // Shift+F10 (the context-menu key sends `contextmenu` itself).
  doc.addEventListener("keydown", (event) => {
    if (!(event.shiftKey && event.key === "F10")) return;
    const row = doc.activeElement?.closest?.("[data-context-menu]");
    if (!row || typing(doc.activeElement)) return;
    const r = doc.activeElement.getBoundingClientRect();
    if (open(doc, row, { x: r.left + 8, y: r.bottom + 4 }, t, doc.activeElement))
      event.preventDefault();
  });
  // Long press on touch (Owlbear: a long press opens the item's menu).
  let press = null;
  let swallowClick = false;
  doc.addEventListener("pointerdown", (event) => {
    if (menu && !menu.el.contains(event.target)) close({ restore: false });
    if (event.pointerType === "mouse") return;
    const row = event.target.closest?.("[data-context-menu]");
    if (!row || typing(event.target)) return;
    const start = { x: event.clientX, y: event.clientY };
    clearTimeout(press?.timer);
    press = {
      start,
      timer: setTimeout(() => {
        press = null;
        if (open(doc, row, start, t, event.target.closest?.(COMMANDS) ?? null)) swallowClick = true;
      }, 550),
    };
  });
  const cancel = () => {
    clearTimeout(press?.timer);
    press = null;
  };
  doc.addEventListener("pointermove", (event) => {
    if (press && Math.hypot(event.clientX - press.start.x, event.clientY - press.start.y) > 10)
      cancel();
  });
  doc.addEventListener("pointerup", cancel);
  doc.addEventListener("pointercancel", cancel);
  doc.addEventListener(
    "click",
    (event) => {
      if (!swallowClick) return;
      swallowClick = false;
      if (menu?.el.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
  doc.defaultView?.addEventListener("resize", () => close({ restore: false }));
  doc.addEventListener("scroll", () => close({ restore: false }), true);
}
