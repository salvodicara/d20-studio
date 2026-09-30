// B23 — keyboard shortcuts: one command registry drives the palette, the generated guide
// and rebindable keys (pure domain, no DOM).
//
// Patterns: one registry → toolbar, row, tooltip and hotkey (Improved Initiative,
// CMP-155–157, VTL-130); keyboard help modal generated from the registered shortcuts
// (Kobold+ Fight Club, CMP-239); Configure Controls with categories, conflict warnings,
// locked binds and Reset Defaults with confirmation (Foundry core, FVT-191, SVC-162;
// BG3 categories and reset, CRP-182); shortcut label adapting to Windows or Mac
// (D&D Beyond Maps quick jot, DDB-086).
import { CORE, ROLES, normalizeShortcut } from "./registry.mjs";

export const SLICE_VERSION = 1;
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const localized = (it, en) => Object.assign(new Error(en), { it, en });

/** Empty personal bindings: `bindings[role][commandId]` is a shortcut or "" (none). */
export function seedBindings() {
  return { bindings: Object.fromEntries(ROLES.map((role) => [role, {}])) };
}
/** Keeps only well-formed overrides; an unknown future version is refused. */
export function normalizeBindings(value, fromVersion = SLICE_VERSION) {
  if (fromVersion > SLICE_VERSION) throw Error("Newer shortcut data than this build");
  const out = seedBindings();
  for (const role of ROLES) {
    const saved = isObject(value?.bindings?.[role]) ? value.bindings[role] : {};
    for (const [id, shortcut] of Object.entries(saved)) {
      if (typeof id !== "string" || !id) continue;
      if (shortcut === "") out.bindings[role][id] = "";
      else {
        const key = normalizeShortcut(shortcut);
        if (key) out.bindings[role][id] = key;
      }
    }
  }
  return out;
}

export const contextsOverlap = (a, b) =>
  a === "global" || b === "global" || (a ?? "global") === (b ?? "global");

// Keys the browser keeps (reload, find, print, save, address bar, tabs, windows): a page
// that takes them breaks the browser function, or never receives them at all.
const BROWSER_KEYS = new Set(
  [
    ...["R", "F", "P", "S", "L", "W", "T", "N", "Q"].map((key) => "Mod+" + key),
    ...["R", "W", "T", "N"].map((key) => "Mod+Shift+" + key),
    "F5",
    "F11",
    "F12",
  ].map(normalizeShortcut),
);
// Keys a Table control handles itself without a registered command: Delete/Backspace
// remove the selected tokens (token menu, DDB-117).
const ELEMENT_KEYS = [
  { id: "token-menu-remove", shortcut: "Delete", context: "table" },
  { id: "token-menu-remove", shortcut: "Backspace", context: "table" },
];

/**
 * Keys that no command can take in this context (Foundry's locked binds): the core's
 * Escape, Tab, Enter, Space and editing keys everywhere, Mod+Z and arrows on the Table;
 * the browser's own keys; keys a Table control handles itself. `kind` says which.
 */
export function reservedBy(shortcut, context = "global") {
  const key = normalizeShortcut(shortcut);
  if (!key) return null;
  const core = CORE.command.find(
    (entry) => normalizeShortcut(entry.shortcut) === key && contextsOverlap(entry.context, context),
  );
  if (core) return { ...core, kind: "core" };
  if (BROWSER_KEYS.has(key))
    return { id: "browser", shortcut: key, context: "global", kind: "browser" };
  const element = ELEMENT_KEYS.find(
    (entry) => entry.shortcut === key && contextsOverlap(entry.context, context),
  );
  return element ? { ...element, kind: "element" } : null;
}

// The core's fixed keys as the guide shows them (read-only rows), one label per group of
// core ids; the keys come from CORE.command, so the guide follows the core.
const LOCKED = [
  [
    "cancel",
    ["cancel"],
    "global",
    "Chiudi la finestra o annulla (sul Tavolo: annulla la mossa preparata)",
    "Close the window or cancel (at the Table: cancel the prepared move)",
  ],
  [
    "focus",
    ["focus-next", "focus-previous"],
    "global",
    "Controllo successivo o precedente",
    "Next or previous control",
  ],
  [
    "press",
    ["press-enter", "press-space"],
    "global",
    "Attiva il pulsante o il controllo in primo piano",
    "Activate the focused button or control",
  ],
  [
    "undo",
    ["undo"],
    "table",
    "Annulla l’ultima modifica (mappa in primo piano)",
    "Undo the last change (map focused)",
  ],
  [
    "arrowup",
    ["arrowup", "arrowdown", "arrowleft", "arrowright"],
    "table",
    "Sposta di una casella il punto della mossa (mappa in primo piano)",
    "Move the point of the move by one cell (map focused)",
  ],
  [
    "confirm",
    ["confirm", "activate"],
    "table",
    "Sulla mappa: seleziona la pedina, apre la porta o conferma il punto",
    "On the map: select the token, open the door or confirm the point",
  ],
];
/** Rows of fixed keys for the guide: {id, context, shortcuts, label}. */
export function lockedKeys() {
  return LOCKED.map(([id, ids, context, it, en]) => ({
    id,
    context,
    shortcuts: ids.map((core) => CORE.command.find((c) => c.id === core)?.shortcut).filter(Boolean),
    label: { it, en },
  })).filter((row) => row.shortcuts.length);
}

/**
 * The rows of the one command catalogue with their effective key for this identity.
 * `commands` are {id, label, context, roles?, shortcut (registered default or null),
 * shortcutConflict?, group?, extension?}; `overrides` are the identity's saved choices.
 */
export function bindingRows(commands, overrides = {}) {
  const rows = commands.map((command) => {
    const own = Object.hasOwn(overrides, command.id) ? overrides[command.id] : undefined;
    const fallback = command.shortcut ?? null;
    const shortcut = own === undefined ? fallback : own || null;
    return {
      id: command.id,
      command,
      context: command.context ?? "global",
      defaultShortcut: fallback,
      droppedDefault: command.shortcutConflict ?? null,
      shortcut,
      status: own === undefined ? (fallback ? "default" : "none") : "custom",
      conflicts: [],
    };
  });
  for (const row of rows)
    if (row.shortcut)
      row.conflicts = rows
        .filter(
          (other) =>
            other !== row &&
            other.shortcut === row.shortcut &&
            contextsOverlap(other.context, row.context),
        )
        .map((other) => other.id);
  return rows;
}

/** Keys shared by more than one command in overlapping contexts, once per key. */
export function conflictGroups(rows) {
  const groups = new Map();
  for (const row of rows)
    if (row.conflicts.length) {
      const ids = [row.id, ...row.conflicts].sort();
      groups.set(row.shortcut + "|" + ids.join(","), { shortcut: row.shortcut, ids });
    }
  return [...groups.values()];
}

/**
 * Which command a key runs on this page. A choice the identity made wins over a default;
 * otherwise the first in catalogue order keeps it, like the registry's load rule.
 */
export function keyHolder(rows, shortcut, page) {
  const key = normalizeShortcut(shortcut);
  if (!key) return null;
  const holders = rows.filter(
    (row) => row.shortcut === key && (row.context === "global" || row.context === page),
  );
  return holders.find((row) => row.status === "custom") ?? holders[0] ?? null;
}

/**
 * Checks a new key for a command before saving. Returns {ok} or {reserved} (refused) or
 * {conflicts} (rows that would lose it; the caller asks before moving it).
 */
export function checkBinding(rows, id, shortcut) {
  const row = rows.find((entry) => entry.id === id);
  if (!row) throw localized("Comando non disponibile.", "Command unavailable.");
  const key = normalizeShortcut(shortcut);
  if (!key) return { invalid: true };
  const reserved = reservedBy(key, row.context);
  if (reserved) return { reserved, shortcut: key };
  const conflicts = rows.filter(
    (other) =>
      other.id !== id && other.shortcut === key && contextsOverlap(other.context, row.context),
  );
  return conflicts.length ? { conflicts, shortcut: key } : { ok: true, shortcut: key };
}

function roleBag(slice, role) {
  if (!ROLES.includes(role)) throw localized("Identità non valida.", "Invalid identity.");
  slice.bindings ??= {};
  return (slice.bindings[role] ??= {});
}
/**
 * Saves a key for one command of this identity. Conflicting rows are refused unless they
 * are listed in `displace`, which leaves them without a key (BG3/Foundry: the user
 * resolves the conflict explicitly). Returns the ids that lost the key.
 */
export function setBinding(slice, role, rows, id, shortcut, { displace = [] } = {}) {
  const result = checkBinding(rows, id, shortcut);
  if (result.invalid) throw localized("Combinazione non valida.", "Invalid key combination.");
  if (result.reserved)
    throw localized(
      "Questo tasto è riservato all’app e non si può assegnare.",
      "This key is reserved by the app and cannot be assigned.",
    );
  const bag = roleBag(slice, role);
  const moved = (result.conflicts ?? []).map((row) => row.id);
  if (moved.some((other) => !displace.includes(other)))
    throw localized(
      "Il tasto è già usato da un altro comando: conferma lo spostamento.",
      "The key is already used by another command: confirm the move.",
    );
  for (const other of moved) bag[other] = "";
  const row = rows.find((entry) => entry.id === id);
  if (result.shortcut === row.defaultShortcut) delete bag[id];
  else bag[id] = result.shortcut;
  return moved;
}
/** Leaves one command without a key for this identity. */
export function clearBinding(slice, role, id) {
  roleBag(slice, role)[id] = "";
}
/** Back to the registered default for one command. */
export function resetBinding(slice, role, id) {
  delete roleBag(slice, role)[id];
}
/** Back to every default for this identity; returns how many choices were removed. */
export function resetAllBindings(slice, role) {
  const bag = roleBag(slice, role);
  const count = Object.keys(bag).length;
  slice.bindings[role] = {};
  return count;
}

const NAMES = {
  it: {
    Mod: "Ctrl",
    Alt: "Alt",
    Shift: "Maiusc",
    Escape: "Esc",
    Enter: "Invio",
    Space: "Spazio",
    Backspace: "Backspace",
    Delete: "Canc",
    Home: "Home",
    End: "Fine",
  },
  en: {
    Mod: "Ctrl",
    Alt: "Alt",
    Shift: "Shift",
    Escape: "Esc",
    Enter: "Enter",
    Space: "Space",
    Backspace: "Backspace",
    Delete: "Del",
    Home: "Home",
    End: "End",
  },
};
const MAC = { Mod: "⌘", Alt: "⌥", Shift: "⇧" };
/**
 * Whether keys read as ⌘/⌥/⇧: Chromium reports "macOS" in userAgentData, Safari and
 * Firefox "MacIntel", "iPhone" or "iPad" in platform (DDB-086 adapts the label).
 */
export const isMacPlatform = (nav = globalThis.navigator) =>
  [nav?.userAgentData?.platform, nav?.platform].some((value) =>
    /mac|iphone|ipad|ipod/i.test(String(value ?? "")),
  );
/** The shortcut in the `aria-keyshortcuts` form: Mod is Control, or Meta on a Mac. */
export function ariaKeyshortcuts(shortcut, { mac = false } = {}) {
  const key = normalizeShortcut(shortcut ?? "");
  if (!key) return "";
  return (key === "+" ? ["+"] : key.split("+"))
    .map((part) => (part === "Mod" ? (mac ? "Meta" : "Control") : part))
    .join("+");
}
const ARROWS = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
/** Shortcut text for people: Ctrl or ⌘ depending on the platform, Italian key names. */
export function formatShortcut(shortcut, { lang = "it", mac = false } = {}) {
  const key = normalizeShortcut(shortcut ?? "");
  if (!key) return "";
  const names = NAMES[lang] ?? NAMES.it;
  const parts = key === "+" ? ["+"] : key.split("+");
  return parts
    .map((part) => (mac && MAC[part]) || ARROWS[part] || names[part] || part)
    .join(mac ? "" : "+");
}
/** Keys for a <kbd> list: each part separately, for the guide and tooltips. */
export function shortcutParts(shortcut, options) {
  const text = formatShortcut(shortcut, options);
  if (!text) return [];
  return options?.mac ? [text] : text === "+" ? ["+"] : text.split("+");
}

/**
 * The generated guide (Kobold+): rows with a key, grouped by where they work, in the
 * order everywhere → Table → other pages; within a group by label.
 */
export function guideGroups(rows, labelOf, contextName) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.shortcut) continue;
    if (!groups.has(row.context)) groups.set(row.context, []);
    groups.get(row.context).push(row);
  }
  const rank = (context) => (context === "global" ? 0 : context === "table" ? 1 : 2);
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || String(a).localeCompare(String(b)))
    .map(([context, list]) => ({
      context,
      title: contextName(context),
      rows: list.sort((a, b) => labelOf(a).localeCompare(labelOf(b))),
    }));
}
