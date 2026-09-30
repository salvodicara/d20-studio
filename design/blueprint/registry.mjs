// Extension registry for the navigable blueprint (B11).
//
// Areas built after B11 add pages, sections, tools, commands, settings, state slices,
// styles and event handlers through this one explicit API, without editing shared files.
// Every call into extension code is isolated: a failure becomes a circumscribed warning
// and the host keeps working. Builder reference and host hook plan:
// changes/interview-01/blueprint-registry-plan.md

export const ROLES = Object.freeze(["player", "dm"]);

// Core events are emitted by the host (derived from committed state where possible).
// Extensions may also emit their own namespaced events: "<extension-id>:<name>".
export const EVENTS = Object.freeze([
  "commit",
  "reset",
  "navigate",
  "role-changed",
  "language-changed",
  "offline-changed",
  "roll-accepted",
  "turn-start",
  "turn-end",
  "combat-start",
  "combat-end",
  "scene-activated",
  "rest-completed",
  "condition-changed",
]);

// Events a switched-off area still receives (SV-42 module gate): only view lifecycle.
const LIFECYCLE_EVENTS = Object.freeze([
  "reset",
  "navigate",
  "role-changed",
  "language-changed",
  "offline-changed",
]);
const EMPTY_SET = Object.freeze(new Set());

// Extension points: the fields each contribution must or may declare besides the common
// ones (id, label, description, order, roles, when, replaces).
export const POINTS = Object.freeze({
  route: { required: ["render"], optional: ["bind", "nav", "icon"] },
  // badge(ctx) → number: the header count of a service (B24: unread notifications).
  service: { required: ["run"], optional: ["header", "icon", "badge"] },
  // group (B62): the campaign rail group the section joins (CAMPAIGN_SECTION_GROUPS).
  "campaign-section": { required: ["render"], optional: ["bind", "group"] },
  // category (B62): the sheet category the tab folds into (SHEET_CATEGORIES).
  "sheet-tab": { required: ["render"], optional: ["bind", "category"] },
  "sheet-section": { required: ["tab", "render"], optional: ["bind"] },
  // group (B62): the Preparation group the section joins (PREPARATION_GROUPS).
  "preparation-section": { required: ["render"], optional: ["bind", "group"] },
  "library-section": { required: ["render"], optional: ["bind"] },
  "home-widget": { required: ["render"], optional: ["bind"] },
  // group (B61): the map toolbar group the tool joins (TABLE_TOOL_GROUPS).
  "table-tool": {
    required: [],
    optional: [
      "icon",
      "group",
      "activate",
      "deactivate",
      "onPointerDown",
      "onPointerMove",
      "onPointerUp",
      "onClick",
      "onKeyDown",
    ],
  },
  // placement (B61): "inspector" (default, the Creature tab), "sidebar-tab" (a panel of the
  // Table's right sidebar), "cover"; "drawer" is the old name of "sidebar-tab". section
  // (B62): the sidebar tab a "sidebar-tab" panel joins (TABLE_SIDEBAR_SECTIONS).
  "table-panel": { required: ["render"], optional: ["bind", "placement", "icon", "section"] },
  // submenu (B62): the labelled submenu the item joins (TOKEN_MENU_SUBMENUS); none = top level.
  "token-menu": { required: ["run"], optional: ["icon", "group", "submenu"] },
  "map-layer": { required: ["svg"], optional: ["bind", "interactive"] },
  search: { required: ["search"], optional: [] },
  // keywords (SV-02): search synonyms the palette matches besides label and description,
  // plain strings or {it, en} labels (Alchemy OmniSearch aliases, Kanka search words).
  command: { required: ["run"], optional: ["shortcut", "context", "group", "keywords"] },
  settings: { required: ["scope", "fields"], optional: [] },
  notifications: { required: ["collect"], optional: [] },
  "draft-guard": { required: ["hasDraft", "confirm"], optional: [] },
});

// Where a contained warning happened, in the owner's words ("<place> «<label>»").
const PLACES = Object.freeze({
  route: ["La pagina", "The page"],
  service: ["Il servizio", "The service"],
  "campaign-section": ["La sezione della campagna", "The campaign section"],
  "sheet-tab": ["La scheda del personaggio", "The character sheet tab"],
  "sheet-section": ["Il riquadro della scheda", "The sheet box"],
  "preparation-section": ["La sezione di preparazione", "The preparation section"],
  "library-section": ["La sezione della Biblioteca", "The Library section"],
  "home-widget": ["Il riquadro della pagina iniziale", "The home page box"],
  "table-tool": ["Lo strumento del Tavolo", "The Table tool"],
  "table-panel": ["Il pannello del Tavolo", "The Table panel"],
  "token-menu": ["La voce del menu della pedina", "The token menu item"],
  "map-layer": ["Il livello della mappa", "The map layer"],
  search: ["La ricerca", "The search provider"],
  command: ["Il comando", "The command"],
  settings: ["L’impostazione", "The setting"],
  notifications: ["L’elenco delle notifiche", "The notification list"],
  "draft-guard": ["La protezione della bozza", "The draft guard"],
  event: ["La reazione all’evento", "The handler of the event"],
  state: ["Il salvataggio dei dati", "The saved data"],
  gate: ["Il controllo d’accesso", "The access check"],
});

// Map toolbar groups (B61). The Table's left toolbar shows one button per group with at
// least one visible tool; the tools of the active group stand beside it (Foundry scene
// controls FVT-108, Roll20 left toolbar R20-127, Owlbear tool modes VTL-231). A group with
// a single visible tool shows that tool directly. "fog" appears only once an area (B35)
// registers a tool in it; "more" collects tools that declare no group.
export const TABLE_TOOL_GROUPS = Object.freeze(
  [
    ["select", 10, "move", "Seleziona e muovi", "Select and move"],
    ["measure", 20, "ruler", "Misura e sagome", "Measure and templates"],
    ["draw", 30, "pen", "Disegna e annota", "Draw and annotate"],
    ["fog", 40, "eye", "Nebbia e visione", "Fog and vision"],
    ["ping", 50, "flag", "Segnala", "Ping"],
    ["dm", 60, "shield", "Strumenti del DM", "DM tools"],
    ["more", 90, "menu", "Altri strumenti", "More tools"],
  ].map(([id, order, icon, it, en]) => Object.freeze({ id, order, icon, label: { it, en } })),
);

// Information architecture (B62): where area commands live once all 48 areas exist. Each
// list is a closed taxonomy an area names in its contribution; a contribution without one
// keeps its own entry (the pre-B62 behaviour), so a builder never loses a command.
const taxonomy = (rows) =>
  Object.freeze(
    rows.map(([id, order, icon, it, en, extra = {}]) =>
      Object.freeze({ id, order, icon, label: Object.freeze({ it, en }), ...extra }),
    ),
  );
// Table right sidebar: one tab per Foundry sidebar document type (FVT-007: chat, combat,
// scenes, actors, items, journal, tables/cards, compendium) and Roll20's right sidebar; the
// panels of a tab are its sub-tabs (Foundry journal pages, D&D Beyond Maps panel tabs
// DDB-133). "creature" (the selected creature, core) and "chat" (the log, core) always exist.
// Foundry's order, except the Creature tab first (B61) and Exploration (travel, world map and
// calendar: no Foundry tab) beside Scene; Items before Journal as in Foundry (B62 review).
export const TABLE_SIDEBAR_SECTIONS = taxonomy([
  ["creature", 0, "person", "Creatura", "Creature"],
  ["chat", 10, "chat", "Chat", "Chat"],
  ["combat", 20, "swords", "Combattimento", "Combat"],
  ["scene", 30, "map", "Scena", "Scene"],
  ["exploration", 40, "light", "Esplorazione", "Exploration"],
  ["items", 50, "bag", "Oggetti", "Items"],
  // Final review F17 (one name per concept, Kanka/Foundry glossaries): handouts, quests and
  // files at the Table are «Documenti»; «Diario» stays the campaign's journal.
  ["journal", 60, "scroll", "Documenti", "Documents"],
  ["tables", 70, "cards", "Tabelle e mazzi", "Tables and decks"],
  ["reference", 80, "book", "Consultazione", "Reference"],
]);
// Campaign rail: Kanka/World Anvil module groups (CMP-23), collapsible with a remembered
// state; "campaign" holds the most used sections and is open by default.
export const CAMPAIGN_SECTION_GROUPS = taxonomy([
  ["campaign", 10, "campaign", "Campagna", "Campaign", { open: true }],
  ["story", 20, "scroll", "Racconto", "Story"],
  // F17: the group is «Ambientazione»; «Mondo» stays the section of world entries.
  ["world", 30, "map", "Ambientazione", "Setting"],
  ["play", 40, "dice", "Gioco", "Play"],
  ["manage", 50, "settings", "Gestione DM", "DM management", { player: ["Strumenti", "Tools"] }],
]);
// Preparation: Foundry's sidebar directories / Roll20's page toolbar grouped by the DM's
// job — scenes and maps, encounters, materials, sessions and adventures.
export const PREPARATION_GROUPS = taxonomy([
  ["scenes", 10, "map", "Scene", "Scenes"],
  ["encounters", 20, "swords", "Incontri", "Encounters"],
  ["materials", 30, "scroll", "Materiali", "Materials"],
  // F17: «Sessioni» stays the campaign's calendar; here the DM's session outline.
  ["sessions", 40, "clock", "Scaletta e avventure", "Session outline and adventures"],
]);
// Character sheet: D&D Beyond's sheet sections (DDB-027/053: Actions, Spells, Inventory,
// Features & Traits, Background, Notes, Extras). An area tab with a category becomes a
// sub-section of that category (DDB's filter chips inside a section).
export const SHEET_CATEGORIES = taxonomy([
  ["actions", 10, "sword", "Azioni", "Actions"],
  ["spells", 20, "book", "Magie", "Spells"],
  ["inventory", 30, "bag", "Inventario", "Inventory"],
  ["features", 40, "check", "Capacità", "Features"],
  ["story", 50, "scroll", "Storia", "Story"],
  ["notes", 55, "note", "Note", "Notes"],
  ["extras", 60, "plus", "Extra", "Extras"],
]);
// Token menu: Foundry Token HUD (FVT-119) and D&D Beyond's token menu (DDB-117) keep the
// frequent commands at the top; the rest sit in labelled submenus.
export const TOKEN_MENU_SUBMENUS = taxonomy([
  ["actions", 10, "sword", "Azioni", "Actions"],
  ["look", 20, "eye", "Aspetto", "Appearance"],
  ["visibility", 30, "eye", "Visibilità", "Visibility"],
  ["items", 40, "bag", "Oggetti", "Items"],
  ["dm", 50, "shield", "Strumenti DM", "DM tools"],
]);
// Field of a point → the taxonomy its value must belong to.
const TAXONOMY_FIELDS = Object.freeze({
  "table-panel": ["section", TABLE_SIDEBAR_SECTIONS],
  "campaign-section": ["group", CAMPAIGN_SECTION_GROUPS],
  "preparation-section": ["group", PREPARATION_GROUPS],
  "sheet-tab": ["category", SHEET_CATEGORIES],
  "token-menu": ["submenu", TOKEN_MENU_SUBMENUS],
});

// Identifiers and orders the host already uses. A core id can be taken over only when
// it is marked replaceable and the contribution says `replaces: true`.
const core = (id, order, extra = {}) => Object.freeze({ id, order, ...extra });
const replaceable = (id, order, extra = {}) => core(id, order, { replaceable: true, ...extra });
export const CORE = Object.freeze({
  route: [
    replaceable("home", 10, { nav: true }),
    replaceable("characters", 20, { nav: true }),
    replaceable("campaigns", 30, { nav: true }),
    core("library", 40, { nav: true }),
    core("builder"),
    core("campaign"),
    core("preparation"),
    core("table"),
    core("notes"),
  ],
  service: [
    replaceable("search", 10, { header: true }),
    replaceable("notes", 20, { header: true }),
    replaceable("requests", 30, { header: true }),
    replaceable("preferences", 40, { header: true }),
    core("app-menu"),
    core("scope"),
    core("reset"),
    core("new-journal"),
  ],
  "campaign-section": [
    replaceable("overview", 10),
    replaceable("group", 20),
    replaceable("sessions", 30),
    replaceable("journal", 40),
    replaceable("world", 50),
    core("preparation", 60, { roles: ["dm"] }),
    replaceable("settings", 70, { roles: ["dm"] }),
    core("notes"),
    core("entry"),
    core("edit"),
  ],
  "sheet-tab": ["actions", "inventory", "spells", "features", "story", "extras"].map((id, i) =>
    replaceable(id, (i + 1) * 10),
  ),
  "sheet-section": [],
  "preparation-section": [core("scenes", 10), core("edit"), core("preview")],
  "library-section": [
    core("available", 10),
    core("personal", 20),
    core("campaign", 30),
    core("edit"),
  ],
  // Home blocks: the resume card, the character + recap row, the next appointment.
  "home-widget": ["resume", "summary", "appointment"].map((id, i) => replaceable(id, (i + 1) * 10)),
  "table-tool": [
    core("move", 10, { group: "select" }),
    core("plan", 20, { group: "select" }),
    core("pan", 30, { group: "select" }),
    replaceable("measure", 40, { group: "measure" }),
    replaceable("pointer", 50, { group: "ping" }),
  ],
  // The log is the second tab of the Table's sidebar, after the selected creature (B61).
  "table-panel": [replaceable("log", 10, { placement: "sidebar-tab" })],
  "token-menu": [],
  // Map layers below 60 draw under the tokens, from 60 above them.
  "map-layer": ["base", "grid", "spatial", "preview", "combat", "tokens", "doors"].map((id, i) =>
    core(id, (i + 1) * 10),
  ),
  search: [core("pages", 10), core("characters", 20), core("campaign", 30)],
  command: [
    core("undo", 0, { shortcut: "Mod+Z", context: "table" }),
    core("cancel", 0, { shortcut: "Escape", context: "global" }),
    core("focus-next", 0, { shortcut: "Tab", context: "global" }),
    core("focus-previous", 0, { shortcut: "Shift+Tab", context: "global" }),
    core("confirm", 0, { shortcut: "Enter", context: "table" }),
    core("activate", 0, { shortcut: "Space", context: "table" }),
    ...["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].map((key) =>
      core(key.toLowerCase(), 0, { shortcut: key, context: "table" }),
    ),
    // Everywhere, plain Enter/Space activate the focused control and these keys select,
    // copy, paste and cut: no area command takes them (text-field editing keys such as
    // Mod+Z are also never taken while typing, see the shell's key listener).
    core("press-enter", 0, { shortcut: "Enter", context: "global" }),
    core("press-space", 0, { shortcut: "Space", context: "global" }),
    ...["A", "C", "V", "X"].map((key) =>
      core("edit-" + key.toLowerCase(), 0, { shortcut: "Mod+" + key, context: "global" }),
    ),
  ],
  settings: [],
  notifications: [],
  "draft-guard": [],
});

const ID = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/;
const DEFAULT_ORDER = 100;
const COMMON = ["id", "label", "description", "order", "roles", "when", "replaces"];
const MAX_WARNINGS = 100;
const MAX_EVENT_DEPTH = 8;
const DEVICE_PREFIX = "d20-studio-setting:";
const SETTINGS_SLICE = "core-settings";
const FIELD_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const copy = (value) => structuredClone(value);
const isFn = (value) => typeof value === "function";
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const isLabel = (value) => isObject(value) && isText(value.it) && isText(value.en);
const byOrder = (a, b) => a.order - b.order || (a.seq ?? 0) - (b.seq ?? 0);
const owns = (extension, id) =>
  id === extension || id.startsWith(extension + "-") || id.startsWith(extension + ".");
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const localized = (it, en) => Object.assign(new Error(en), { it, en });
const textOf = (value, lang) =>
  isObject(value) ? value[lang] || value.it || value.en || "" : String(value ?? "");

const SETTING_TYPES = {
  boolean: (field, value) => typeof value === "boolean",
  number: (field, value) =>
    Number.isFinite(value) &&
    (field.min === undefined || value >= field.min) &&
    (field.max === undefined || value <= field.max),
  text: (field, value) => typeof value === "string" && value.length <= (field.maxLength ?? 500),
  choice: (field, value) => field.options.some((option) => option.value === value),
};
function checkFields(fields) {
  if (!Array.isArray(fields) || !fields.length) return false;
  const seen = new Set();
  for (const field of fields) {
    const known = ["id", "label", "type", "default", "options", "min", "max", "maxLength"];
    if (!isObject(field) || Object.keys(field).some((key) => !known.includes(key))) return false;
    if (!FIELD_ID.test(field.id ?? "") || seen.has(field.id) || !isLabel(field.label)) return false;
    if (!SETTING_TYPES[field.type]) return false;
    if (
      field.type === "choice" &&
      (!Array.isArray(field.options) ||
        !field.options.length ||
        field.options.some((option) => !isLabel(option?.label) || option.value === undefined))
    )
      return false;
    if (!SETTING_TYPES[field.type](field, field.default)) return false;
    seen.add(field.id);
  }
  return true;
}
const CHECKS = {
  nav: (value) => typeof value === "boolean",
  header: (value) => typeof value === "boolean",
  interactive: (value) => typeof value === "boolean",
  icon: isText,
  group: isText,
  tab: (value) => typeof value === "string" && ID.test(value),
  // B62 taxonomies: shape here, membership in validate() (TAXONOMY_FIELDS).
  section: isText,
  category: isText,
  submenu: isText,
  // "cover" (B14): a visible panel replaces the whole Table view for that identity.
  // "dock" (B40, additive): commands of the selected creature at the end of the action bar,
  // after its actions (BG3 hotbar common actions CRP-098; the bottom dock keeps the core
  // commands, registry plan §5.1 — W2b1 integration).
  // "dock-row" (B53, additive): a full row of that action dock, under its commands (the
  // quick bar's hotbar, BG3 CRP-098).
  placement: (value) =>
    ["inspector", "sidebar-tab", "drawer", "cover", "dock", "dock-row"].includes(value),
  shortcut: (value) => normalizeShortcut(value) !== null,
  context: (value) => value === "global" || (typeof value === "string" && ID.test(value)),
  scope: (value) => ["device", "personal", "campaign"].includes(value),
  fields: checkFields,
  keywords: (value) =>
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 40 &&
    value.every((word) => isText(word) || isLabel(word)),
};

const NAMED_KEYS = [
  "Escape",
  "Enter",
  "Tab",
  "Space",
  "Backspace",
  "Delete",
  "Insert",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  ...Array.from({ length: 12 }, (_, i) => "F" + (i + 1)),
];
const KEY_NAMES = new Map([
  ...NAMED_KEYS.map((key) => [key.toLowerCase(), key]),
  ["esc", "Escape"],
  ["return", "Enter"],
  [" ", "Space"],
  ["spacebar", "Space"],
  ["del", "Delete"],
  ["up", "ArrowUp"],
  ["down", "ArrowDown"],
  ["left", "ArrowLeft"],
  ["right", "ArrowRight"],
]);
const MODIFIERS = new Map([
  ["mod", "Mod"],
  ["ctrl", "Mod"],
  ["control", "Mod"],
  ["cmd", "Mod"],
  ["command", "Mod"],
  ["meta", "Mod"],
  ["alt", "Alt"],
  ["option", "Alt"],
  ["shift", "Shift"],
]);
/**
 * Canonical shortcut text ("Mod+Shift+K") from a string or a KeyboardEvent-like object,
 * or null when it is not a usable shortcut. Ctrl, Cmd and Meta all become "Mod", so a
 * conflict is detected on every platform. Shift is ignored for printable symbols, whose
 * character already reflects it ("?" rather than "Shift+/").
 */
export function normalizeShortcut(input) {
  const mods = new Set();
  let key;
  if (isObject(input)) {
    if (input.ctrlKey || input.metaKey) mods.add("Mod");
    if (input.altKey) mods.add("Alt");
    if (input.shiftKey) mods.add("Shift");
    key = input.key;
    if (["Control", "Meta", "Alt", "Shift", "OS"].includes(key)) return null;
  } else if (typeof input === "string" && input.length) {
    const plus = input.endsWith("++") || input === "+";
    const parts = (plus ? input.slice(0, -1) : input).split("+").filter(Boolean);
    key = plus ? "+" : parts.pop();
    for (const part of parts) {
      const mod = MODIFIERS.get(part.trim().toLowerCase());
      if (!mod) return null;
      mods.add(mod);
    }
  } else return null;
  if (typeof key !== "string" || !key.length) return null;
  const named = KEY_NAMES.get(key.toLowerCase());
  if (named) key = named;
  else if ([...key].length === 1 && key.trim()) {
    key = key.toUpperCase();
    if (!/\p{L}|\p{N}/u.test(key)) mods.delete("Shift");
  } else return null;
  return [...["Mod", "Alt", "Shift"].filter((mod) => mods.has(mod)), key].join("+");
}

/** Whether a roll record from the commit log may be shown to this demo identity. */
export function rollVisibleTo(roll, role) {
  return roll?.visibility !== "private" || roll.owner === role || roll.controller === role;
}

/**
 * Core domain events implied by one committed transition. The host calls this after a
 * successful commit or undo, so events never fire for previews or rejected mutations.
 * Payloads carry identifiers (plus a copy of an accepted roll); listeners must still
 * apply access rules before showing anything.
 */
export function deriveStateEvents(before, after, { kind = "change" } = {}) {
  const events = [];
  const correction = kind === "correction";
  const push = (event, payload) => events.push([event, { ...payload, correction }]);
  const oldLog = before?.log ?? [];
  const added = (after?.log ?? []).slice(oldLog.length);
  const entry = added.at(-1);
  if (entry)
    push("commit", {
      id: entry.id,
      label: entry.label,
      kind: entry.kind,
      controller: entry.controller,
      visibility: entry.visibility,
    });
  for (const logEntry of added)
    for (const roll of logEntry.rolls ?? [])
      if (roll.status !== "superseded")
        push("roll-accepted", { logId: logEntry.id, roll: copy(roll) });
  const was = before?.combat ?? {};
  const is = after?.combat ?? {};
  const current = (combat) => combat.order?.[combat.turn];
  if (!was.active && is.active) {
    push("combat-start", { sceneId: after.activeSceneId, round: is.round });
    push("turn-start", { actorId: current(is), round: is.round });
  } else if (was.active && !is.active) {
    push("turn-end", { actorId: current(was), round: was.round });
    push("combat-end", { sceneId: before.activeSceneId, round: was.round });
  } else if (is.active && (was.turn !== is.turn || was.round !== is.round)) {
    push("turn-end", { actorId: current(was), round: was.round });
    push("turn-start", { actorId: current(is), round: is.round });
  }
  if (before?.activeSceneId !== after?.activeSceneId)
    push("scene-activated", {
      sceneId: after?.activeSceneId,
      previousSceneId: before?.activeSceneId,
    });
  const applied = new Set();
  for (const rest of before?.restTime?.rests ?? [])
    for (const part of rest.participants ?? [])
      for (const benefit of part.benefits ?? []) if (benefit.applied) applied.add(benefit.id);
  for (const rest of after?.restTime?.rests ?? [])
    for (const part of rest.participants ?? [])
      for (const benefit of part.benefits ?? [])
        if (benefit.applied && !applied.has(benefit.id))
          push("rest-completed", {
            restId: rest.id,
            actorId: part.actorId,
            kind: benefit.kind,
            benefitId: benefit.id,
          });
  const status = (actor) => JSON.stringify([actor?.conditions ?? [], actor?.exhaustion ?? 0]);
  const actorIds = new Set([
    ...Object.keys(before?.actors ?? {}),
    ...Object.keys(after?.actors ?? {}),
  ]);
  for (const actorId of actorIds)
    if (status(before?.actors?.[actorId]) !== status(after?.actors?.[actorId]))
      push("condition-changed", { actorId });
  return events;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
}
function defaultDeviceStorage() {
  try {
    if (globalThis.localStorage) return globalThis.localStorage;
  } catch {}
  return memoryStorage();
}

/**
 * Creates the registry. Options: `document` (styles are injected only when present),
 * `deviceStorage` (device-scoped settings; localStorage or memory by default) and
 * `logger` (console by default; null keeps warnings silent).
 */
export function createRegistry({
  document = globalThis.document,
  deviceStorage = defaultDeviceStorage(),
  logger = globalThis.console,
} = {}) {
  const items = new Map(Object.keys(POINTS).map((point) => [point, []]));
  const slices = new Map();
  const listeners = new Map();
  const extensionRows = new Map();
  const styleList = [];
  const warningList = [];
  const warningKeys = new Set();
  const conflictList = [];
  // Access gates (additive, B29): {extension, page, refusal}.
  const gates = [];
  // Module gates (additive, SV-42): {extension, disabled(ctx)}.
  const moduleGates = [];
  let switchedCache = { state: null, campaign: null, off: null };
  let seq = 0;
  let depth = 0;
  let host = null;

  // Access gate (additive, B29 "sign in to continue", DDB/Roll20): the first gate whose
  // refusal(ctx) returns {it, en} for the current identity closes the app to it. The shell
  // then renders only the gate's page and refuses commits; the registry runs actions,
  // search results, notifications and non-device settings of the gate's own area only.
  // A gate that throws is contained as a warning and counts as open.
  function accessGate(ctx = host) {
    for (const gate of gates) {
      let message = null;
      try {
        message = gate.refusal(ctx);
      } catch (error) {
        warn(gate.extension, "gate", gate.page, "refusal", error);
      }
      if (isLabel(message)) return { extension: gate.extension, page: gate.page, message };
    }
    return null;
  }
  // The closed gate that withholds contribution c (another area's), or null.
  const withheld = (c, ctx) => {
    const gate = gates.length ? accessGate(ctx) : null;
    return gate && gate.extension !== c?.extension ? gate : null;
  };
  // Module gate (additive, SV-42, beside the access gate; Foundry Manage Modules, Owlbear
  // room extensions): the areas a gate reports as switched off in the campaign of `ctx`.
  // Their contributions are not visible to anyone there (sections, commands, panels, tools,
  // token-menu entries, sheet tabs, search, notifications) and their actions do not run;
  // their state slices stay untouched, so everything returns when switched on again. A gate
  // never switches off its own area or the core; a gate that throws is a warning.
  function switchedOff(ctx = host) {
    const state = ctx?.state;
    if (!moduleGates.length || !state) return EMPTY_SET;
    const campaign = state.campaign?.id ?? null;
    if (switchedCache.state === state && switchedCache.campaign === campaign)
      return switchedCache.off;
    const off = new Set();
    for (const gate of moduleGates) {
      try {
        for (const id of gate.disabled(ctx) ?? [])
          if (typeof id === "string" && id !== gate.extension && id !== "core") off.add(id);
      } catch (error) {
        warn(gate.extension, "gate", "modules", "disabled", error);
      }
    }
    switchedCache = { state, campaign, off };
    return off;
  }
  const moduleOff = (c, ctx) =>
    moduleGates.length > 0 && Boolean(c?.extension) && switchedOff(ctx).has(c.extension);

  function warn(extension, point, id, phase, error) {
    const message = String(error?.message ?? error).slice(0, 300);
    const key = [extension, point, id, phase, message].join("|");
    if (warningKeys.has(key)) return;
    warningKeys.add(key);
    warningList.push(
      Object.freeze({ extension, point, id, phase, message, time: new Date().toISOString() }),
    );
    if (warningList.length > MAX_WARNINGS) warningList.shift();
    logger?.warn?.(`[extension ${extension}] ${point} "${id}" ${phase}: ${message}`);
  }
  function record(id, status, { error = null, backlog = "", title = null, contributions = 0 }) {
    const row = Object.freeze({
      id,
      backlog,
      title,
      status,
      contributions,
      error: error ? String(error?.message ?? error).slice(0, 300) : null,
    });
    extensionRows.set(id, row);
    if (status === "failed") warn(id, "extension", id, "load", row.error);
    return row;
  }

  // Isolated call into extension code: an error becomes a warning and the fallback value
  // is returned. Used for queries (when, hasDraft, search, collect, confirm...).
  function call(c, method, fallback, ...args) {
    if (!c || !isFn(c[method])) return fallback;
    try {
      return c[method](...args);
    } catch (error) {
      warn(c.extension, c.point, c.id, method, error);
      return fallback;
    }
  }
  function visible(c, ctx, args) {
    if (ctx?.role && !c.roles.includes(ctx.role)) return false;
    if (ctx && moduleOff(c, ctx)) return false;
    if (!c.when) return true;
    return Boolean(call(c, "when", false, ctx, ...args));
  }
  function list(point, ctx, ...args) {
    if (!items.has(point)) throw TypeError(`Unknown extension point "${point}"`);
    return items.get(point).filter((c) => visible(c, ctx, args));
  }
  function get(point, id, ctx, ...args) {
    if (!items.has(point)) throw TypeError(`Unknown extension point "${point}"`);
    const c = items.get(point).find((entry) => entry.id === id);
    return c && (ctx === undefined || visible(c, ctx, args)) ? c : null;
  }
  // Core items (host data: {id, order, roles?, ...}) merged with visible contributions.
  // A visible replacement takes the core item's place; otherwise the core item stays.
  function merge(point, coreItems, ctx, ...args) {
    const contributions = list(point, ctx, ...args);
    const replacements = new Map(contributions.filter((c) => c.replaces).map((c) => [c.id, c]));
    const extra = contributions.filter((c) => !c.replaces);
    const merged = coreItems.flatMap((item) => {
      if (replacements.has(item.id)) return [replacements.get(item.id)];
      if (ctx?.role && item.roles && !item.roles.includes(ctx.role)) return [];
      const order = item.order ?? CORE[point]?.find((c) => c.id === item.id)?.order;
      return [{ ...item, core: true, order: order ?? DEFAULT_ORDER, seq: 0 }];
    });
    return [...merged, ...extra].sort(byOrder);
  }
  function label(c, lang = host?.lang ?? "it") {
    return textOf(c?.label, lang);
  }
  function failureHTML(c, ctx) {
    const name = label(c, ctx?.lang);
    const text =
      ctx?.lang === "en"
        ? `${name} is unavailable right now. The rest of the app keeps working.`
        : `${name} non è disponibile in questo momento. Il resto dell’app continua a funzionare.`;
    return `<div class="panel ext-error" role="status" data-ext-error="${esc(c.extension)}"><p class="error">${esc(text)}</p></div>`;
  }
  // Wraps a contribution's markup in a slot the host can bind later. Map layers render
  // SVG into <g>; everything else renders HTML into a layout-neutral <div>.
  function slot(point, item, ctx, ...args) {
    const c = typeof item === "string" ? get(point, item, ctx, ...args) : item;
    if (!c) return "";
    const svg = point === "map-layer";
    const method = svg ? "svg" : "render";
    const attrs = `data-ext-slot="${esc(point + ":" + c.id)}"`;
    let html;
    try {
      html = c[method](ctx, ...args);
      if (typeof html !== "string") throw TypeError(`${method}() must return a string`);
    } catch (error) {
      warn(c.extension, point, c.id, method, error);
      return svg
        ? `<g ${attrs} data-ext-failed></g>`
        : `<div ${attrs} data-ext-failed style="display:contents">${failureHTML(c, ctx)}</div>`;
    }
    return svg
      ? `<g ${attrs}${c.interactive ? "" : ' pointer-events="none"'}>${html}</g>`
      : `<div ${attrs} style="display:contents">${html}</div>`;
  }
  // Binds every rendered slot under root, optionally only for some points. A failing bind
  // replaces that slot's content with the circumscribed warning.
  function bindSlots(root, ctx, { points = null, args = [] } = {}) {
    for (const el of root?.querySelectorAll?.("[data-ext-slot]") ?? []) {
      if (el.hasAttribute("data-ext-failed") || el.hasAttribute("data-ext-bound")) continue;
      const value = el.getAttribute("data-ext-slot");
      const split = value.indexOf(":");
      const point = value.slice(0, split);
      if (points && !points.includes(point)) continue;
      const c = items.get(point)?.find((entry) => entry.id === value.slice(split + 1));
      el.setAttribute("data-ext-bound", "");
      if (!c?.bind) continue;
      try {
        c.bind(el, ctx, ...args);
      } catch (error) {
        warn(c.extension, point, c.id, "bind", error);
        el.setAttribute("data-ext-failed", "");
        el.innerHTML = point === "map-layer" ? "" : failureHTML(c, ctx);
      }
    }
  }
  // Runs an action of a contribution (run, tool handlers, activate). Returns true when it
  // completed. A validation error carrying {it, en}, or a refusal the host's ctx.commit
  // marked (`refusal: true`: offline, an invalid operation), is shown to the user as it
  // is and is no warning; any other error becomes a warning plus a short localized toast.
  function run(c, ctx, ...args) {
    return invoke(c, "run", ctx, ...args);
  }
  function invoke(c, method, ctx, ...args) {
    if (!c || !isFn(c[method])) return false;
    // A closed access gate refuses actions, never a tool's teardown (deactivate).
    const gate = method === "deactivate" ? null : withheld(c, ctx);
    if (gate) {
      ctx?.toast?.(textOf(gate.message, ctx?.lang), true);
      return false;
    }
    // A switched-off area (module gate) runs nothing but a tool's teardown.
    if (method !== "deactivate" && moduleOff(c, ctx ?? host)) {
      ctx?.toast?.(
        textOf(
          {
            it: "Questa funzione è spenta in questa campagna: il DM la riaccende in Integrazioni › Moduli.",
            en: "This feature is switched off in this campaign: the DM switches it back on in Integrations › Modules.",
          },
          ctx?.lang,
        ),
        true,
      );
      return false;
    }
    try {
      c[method](ctx, ...args);
      return true;
    } catch (error) {
      if (isText(error?.it) && isText(error?.en)) {
        ctx?.toast?.(textOf(error, ctx.lang), true);
        return false;
      }
      if (error?.refusal === true && isText(error.message)) {
        ctx?.toast?.(error.message, true);
        return false;
      }
      warn(c.extension, c.point, c.id, method, error);
      ctx?.toast?.(
        ctx?.lang === "en"
          ? `${label(c, "en")} did not work. The rest of the app keeps working.`
          : `${label(c, "it")} non ha funzionato. Il resto dell’app continua a funzionare.`,
        true,
      );
      return false;
    }
  }
  function search(ctx, query, { limit = 20 } = {}) {
    return list("search", ctx, query).flatMap((c) => {
      if (withheld(c, ctx)) return [];
      const results = call(c, "search", [], ctx, query);
      if (!Array.isArray(results)) {
        warn(c.extension, "search", c.id, "search", "search() must return an array");
        return [];
      }
      return results
        .filter((result) => {
          const ok = (isText(result?.title) || isLabel(result?.title)) && isText(result?.page);
          if (!ok) warn(c.extension, "search", c.id, "result", "result needs title and page");
          return ok;
        })
        .slice(0, limit)
        .map((result) => ({ ...result, provider: c.id, providerLabel: c.label }));
    });
  }
  function notifications(ctx) {
    return list("notifications", ctx)
      .flatMap((c) => {
        if (withheld(c, ctx)) return [];
        const entries = call(c, "collect", [], ctx);
        if (!Array.isArray(entries)) {
          warn(c.extension, "notifications", c.id, "collect", "collect() must return an array");
          return [];
        }
        return entries
          .filter((entry) => {
            const ok = isText(entry?.id) && (isText(entry?.title) || isLabel(entry?.title));
            if (!ok) warn(c.extension, "notifications", c.id, "entry", "entry needs id and title");
            return ok;
          })
          .map((entry) => ({ ...entry, source: c.id, sourceLabel: c.label }));
      })
      .sort((a, b) => String(b.time ?? "").localeCompare(String(a.time ?? "")));
  }
  function commandForKey(input, ctx) {
    const shortcut = normalizeShortcut(input);
    if (!shortcut) return null;
    return (
      list("command", ctx).find(
        (c) => c.shortcut === shortcut && (c.context === "global" || c.context === ctx?.view?.page),
      ) ?? null
    );
  }
  function pendingDraft(ctx, next = null) {
    return (
      list("draft-guard", ctx).find((c) => Boolean(call(c, "hasDraft", false, ctx, next))) ?? null
    );
  }

  // Settings: Foundry-style scopes. Device values stay in this browser; personal values
  // belong to the current identity; campaign values are shared and DM-authored.
  function settingField(key) {
    const [sectionId, fieldId] = String(key).split(/\.(?=[^.]+$)/);
    const section = items.get("settings").find((c) => c.id === sectionId);
    const field = section?.fields.find((entry) => entry.id === fieldId);
    if (!field) throw TypeError(`Unknown setting "${key}"`);
    return { section, field };
  }
  function getSetting(ctx = host, key) {
    const { section, field } = settingField(key);
    let value;
    try {
      if (section.scope === "device") {
        const raw = deviceStorage.getItem(DEVICE_PREFIX + key);
        value = raw === null ? undefined : JSON.parse(raw);
      } else if (section.scope === "personal")
        value = ctx?.state?.ext?.[SETTINGS_SLICE]?.personal?.[ctx.role]?.[key];
      else value = ctx?.state?.ext?.[SETTINGS_SLICE]?.campaign?.[key];
    } catch {
      value = undefined;
    }
    return value !== undefined && SETTING_TYPES[field.type](field, value) ? value : field.default;
  }
  function setSetting(ctx = host, key, value) {
    const { section, field } = settingField(key);
    if (!section.roles.includes(ctx?.role))
      throw localized(
        "Questa impostazione non è disponibile per te.",
        "This setting is not available to you.",
      );
    if (!SETTING_TYPES[field.type](field, value))
      throw localized(
        "Valore non valido per questa impostazione.",
        "Invalid value for this setting.",
      );
    // Signed out (access gate, B29): only this device's settings can change.
    const gate = section.scope === "device" ? null : withheld(section, ctx);
    if (gate) throw localized(gate.message.it, gate.message.en);
    if (section.scope === "device") {
      try {
        deviceStorage.setItem(DEVICE_PREFIX + key, JSON.stringify(value));
      } catch {
        throw localized(
          "Questo dispositivo non può conservare l’impostazione.",
          "This device cannot keep the setting.",
        );
      }
      ctx?.render?.();
      return { applied: true, persisted: true };
    }
    if (section.scope === "campaign" && ctx.role !== "dm")
      throw localized(
        "Solo il DM può cambiare le impostazioni della campagna.",
        "Only the DM can change campaign settings.",
      );
    const personal = section.scope === "personal";
    return ctx.commit(
      textOf({ it: "Impostazione aggiornata", en: "Setting updated" }, ctx.lang) +
        ": " +
        textOf(field.label, ctx.lang),
      (draft) => {
        const bag = draft.ext?.[SETTINGS_SLICE];
        if (!bag) throw Error("Settings state is not initialized");
        const target = personal ? (bag.personal[ctx.role] ??= {}) : bag.campaign;
        target[key] = copy(value);
      },
      personal ? { local: true, visibility: "private", undoable: false } : { undoable: false },
    );
  }

  // State slices live in state.ext[name]; their schema versions in state.extVersions.
  // Unknown slices (an extension not loaded now) are kept untouched.
  function initState(state) {
    if (!isObject(state)) throw TypeError("initState() needs the state object");
    const result = { changed: false, seeded: [], normalized: [], failed: [] };
    if (!isObject(state.ext)) {
      if (state.ext !== undefined) warn("core", "state", "ext", "load", "state.ext was replaced");
      state.ext = {};
      result.changed = true;
    }
    if (!isObject(state.extVersions)) {
      state.extVersions = {};
      result.changed = true;
    }
    for (const slice of slices.values()) {
      const present = Object.hasOwn(state.ext, slice.name);
      try {
        if (!present) {
          // seed(state): the state is passed so an area can add its own synthetic sample
          // records when absent (B21 adds the library-only sample character Iria); existing
          // records are never changed. Seeds that ignore the argument behave as before.
          const seeded = slice.seed(state);
          if (seeded === undefined) throw TypeError("seed() returned nothing");
          state.ext[slice.name] = copy(seeded);
          result.seeded.push(slice.name);
        } else {
          const from = state.extVersions[slice.name] ?? 0;
          const raw = JSON.stringify(state.ext[slice.name]);
          const next = slice.normalize(copy(state.ext[slice.name]), from);
          if (next === undefined) throw TypeError("normalize() returned nothing");
          if (JSON.stringify(next) === raw && from === slice.version) continue;
          state.ext[slice.name] = copy(next);
          result.normalized.push(slice.name);
        }
        state.extVersions[slice.name] = slice.version;
        result.changed = true;
      } catch (error) {
        warn(slice.extension, "state", slice.name, present ? "normalize" : "seed", error);
        result.failed.push(slice.name);
      }
    }
    return result;
  }
  // Gameplay Undo restores a snapshot; slices declared `undo: "preserve"` keep their
  // current value, like narrative content does in the core store.
  function afterUndo(current, restored) {
    for (const slice of slices.values()) {
      if (slice.undo !== "preserve") continue;
      if (Object.hasOwn(current?.ext ?? {}, slice.name)) {
        restored.ext ??= {};
        restored.extVersions ??= {};
        restored.ext[slice.name] = copy(current.ext[slice.name]);
        restored.extVersions[slice.name] = current.extVersions?.[slice.name] ?? slice.version;
      } else if (restored.ext) delete restored.ext[slice.name];
    }
    // Optional reconciliation (additive, B30): a slice whose own commands are not undoable
    // but create or remove core records re-applies them to the restored snapshot. It runs
    // after every preserved slice is back; a failure is contained as a warning.
    for (const slice of slices.values()) {
      if (!isFn(slice.afterUndo)) continue;
      try {
        slice.afterUndo(current, restored);
      } catch (error) {
        warn(slice.extension, "state", slice.name, "afterUndo", error);
      }
    }
  }
  function slice(state, name) {
    const value = state?.ext?.[name];
    if (value === undefined) throw Error(`State slice "${name}" is not initialized`);
    return value;
  }

  function checkEvent(event) {
    if (EVENTS.includes(event) || /^[a-z0-9-]+:[a-z0-9-]+$/.test(String(event))) return;
    throw TypeError(`Unknown event "${event}"; use a core event or "<extension-id>:<name>"`);
  }
  function subscribe(event, handler, extension) {
    checkEvent(event);
    if (!isFn(handler)) throw TypeError(`Handler for "${event}" must be a function`);
    if (!listeners.has(event)) listeners.set(event, []);
    const entry = { handler, extension };
    listeners.get(event).push(entry);
    return () => {
      const entries = listeners.get(event) ?? [];
      if (entries.includes(entry)) entries.splice(entries.indexOf(entry), 1);
    };
  }
  function emit(event, payload = {}, emitter = "core") {
    checkEvent(event);
    if (depth >= MAX_EVENT_DEPTH) {
      warn(emitter, "event", event, "emit", "event chain too deep; emission skipped");
      return 0;
    }
    depth++;
    let delivered = 0;
    try {
      for (const { handler, extension } of [...(listeners.get(event) ?? [])]) {
        // A switched-off area still hears lifecycle events (reset, role, language, route,
        // offline) to clear its views, never game events: it does not act while off.
        if (
          !LIFECYCLE_EVENTS.includes(event) &&
          extension !== "core" &&
          moduleOff({ extension }, host)
        )
          continue;
        try {
          handler(payload, { event, emitter, ctx: host });
          delivered++;
        } catch (error) {
          warn(extension, "event", event, "handler", error);
        }
      }
    } finally {
      depth--;
    }
    return delivered;
  }
  function emitStateEvents(before, after, options) {
    for (const [event, payload] of deriveStateEvents(before, after, options)) emit(event, payload);
  }

  function injectStyles(href, extension) {
    if (styleList.some((entry) => entry.href === href)) return;
    styleList.push(Object.freeze({ href, extension }));
    if (!document?.createElement) return;
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", href);
    link.setAttribute("data-extension", extension);
    document.head.append(link);
  }

  function validate(point, def, extension) {
    const spec = POINTS[point];
    if (!spec) throw TypeError(`Unknown extension point "${point}"`);
    if (!isObject(def)) throw TypeError(`${point}: the definition must be an object`);
    const name = `${point} "${def.id}"`;
    for (const key of Object.keys(def))
      if (!COMMON.includes(key) && !spec.required.includes(key) && !spec.optional.includes(key))
        throw TypeError(`${name}: unknown field "${key}"`);
    if (typeof def.id !== "string" || !ID.test(def.id))
      throw TypeError(`${name}: id must be lowercase words joined by "-" or "."`);
    if (!isLabel(def.label)) throw TypeError(`${name}: label needs non-empty it and en text`);
    if (def.description !== undefined && !isLabel(def.description))
      throw TypeError(`${name}: description needs it and en text`);
    if (def.order !== undefined && !Number.isFinite(def.order))
      throw TypeError(`${name}: order must be a finite number`);
    if (
      def.roles !== undefined &&
      (!Array.isArray(def.roles) || !def.roles.length || def.roles.some((r) => !ROLES.includes(r)))
    )
      throw TypeError(`${name}: roles must list "player" and/or "dm"`);
    if (def.when !== undefined && !isFn(def.when))
      throw TypeError(`${name}: when must be a function`);
    for (const key of spec.required)
      if (def[key] === undefined) throw TypeError(`${name}: missing "${key}"`);
    for (const key of [...spec.required, ...spec.optional])
      if (def[key] !== undefined && !(CHECKS[key] ?? isFn)(def[key]))
        throw TypeError(`${name}: invalid "${key}"`);
    if (
      point === "table-tool" &&
      def.group !== undefined &&
      !TABLE_TOOL_GROUPS.some((group) => group.id === def.group)
    )
      throw TypeError(
        `${name}: group must be one of ${TABLE_TOOL_GROUPS.map((g) => g.id).join(", ")}`,
      );
    const [field, list] = TAXONOMY_FIELDS[point] ?? [];
    if (field && def[field] !== undefined && !list.some((entry) => entry.id === def[field]))
      throw TypeError(`${name}: ${field} must be one of ${list.map((e) => e.id).join(", ")}`);
    const coreItem = CORE[point].find((entry) => entry.id === def.id);
    if (def.replaces !== undefined && def.replaces !== true)
      throw TypeError(`${name}: replaces can only be true`);
    if (coreItem && !coreItem.replaceable)
      throw TypeError(`${name}: this id is reserved by the core`);
    if (coreItem && !def.replaces)
      throw TypeError(`${name}: this is a core id; declare replaces: true to replace it`);
    if (!coreItem && def.replaces) throw TypeError(`${name}: replaces is only for core ids`);
    if (!coreItem && !owns(extension, def.id))
      throw TypeError(`${name}: id must be "${extension}" or start with "${extension}-"`);
    return coreItem;
  }
  function claimShortcut(c) {
    if (!c.shortcut) return c;
    const overlaps = (a, b) => a === "global" || b === "global" || a === b;
    const clash = [...CORE.command, ...items.get("command")].find(
      (other) =>
        other.shortcut &&
        normalizeShortcut(other.shortcut) === c.shortcut &&
        overlaps(other.context ?? "global", c.context) &&
        (other.roles ?? ROLES).some((role) => c.roles.includes(role)),
    );
    if (!clash) return c;
    const kept = (clash.extension ?? "core") + "/" + clash.id;
    conflictList.push(
      Object.freeze({
        shortcut: c.shortcut,
        context: c.context,
        kept,
        dropped: c.extension + "/" + c.id,
      }),
    );
    warn(c.extension, "command", c.id, "shortcut", `${c.shortcut} is already used by ${kept}`);
    return Object.freeze({ ...c, shortcut: null, shortcutConflict: c.shortcut });
  }

  // The object an entry module receives: registration methods that only work during
  // register(), plus the read/query helpers it may use later from its callbacks.
  function scoped(extension, pending) {
    const open = () => {
      if (!pending.open)
        throw Error(`${extension}: register contributions synchronously inside register()`);
    };
    return Object.freeze({
      id: extension,
      get ctx() {
        return host;
      },
      add(point, def) {
        open();
        const coreItem = validate(point, def, extension);
        if (
          items.get(point).some((c) => c.id === def.id) ||
          pending.items.some((c) => c.point === point && c.id === def.id)
        )
          throw Error(`${point} "${def.id}" is already registered`);
        const c = {
          ...def,
          point,
          extension,
          order: def.order ?? coreItem?.order ?? DEFAULT_ORDER,
          roles: Object.freeze([...(def.roles ?? ROLES)]),
          seq: 0,
        };
        if (point === "command") {
          c.context = def.context ?? "global";
          c.shortcut = def.shortcut ? normalizeShortcut(def.shortcut) : null;
        }
        // "drawer" (before B61) is the same place as "sidebar-tab": a tab of the sidebar.
        if (point === "table-panel")
          c.placement = def.placement === "drawer" ? "sidebar-tab" : (def.placement ?? "inspector");
        // A tool without a group joins "more"; a replacement keeps the core tool's group.
        if (point === "table-tool") c.group = def.group ?? coreItem?.group ?? "more";
        if (point === "settings") c.fields = Object.freeze(def.fields.map((f) => Object.freeze(f)));
        pending.items.push(c);
        return c.id;
      },
      registerStateSlice(name, def) {
        open();
        if (typeof name !== "string" || !ID.test(name) || !owns(extension, name))
          throw TypeError(
            `State slice "${name}" must be "${extension}" or start with "${extension}-"`,
          );
        if (slices.has(name) || pending.slices.some((entry) => entry.name === name))
          throw Error(`State slice "${name}" is already registered`);
        const known = ["version", "seed", "normalize", "undo", "afterUndo"];
        if (!isObject(def) || Object.keys(def).some((key) => !known.includes(key)))
          throw TypeError(`State slice "${name}": allowed fields are ${known.join(", ")}`);
        if (def.afterUndo !== undefined && !isFn(def.afterUndo))
          throw TypeError(`State slice "${name}": afterUndo must be a function`);
        if (!Number.isInteger(def.version) || def.version < 1)
          throw TypeError(`State slice "${name}": version must be a positive integer`);
        if (!isFn(def.seed) || !isFn(def.normalize))
          throw TypeError(`State slice "${name}": seed() and normalize() are required`);
        if (def.undo !== undefined && !["snapshot", "preserve"].includes(def.undo))
          throw TypeError(`State slice "${name}": undo is "snapshot" or "preserve"`);
        pending.slices.push(
          Object.freeze({ ...def, name, extension, undo: def.undo ?? "snapshot" }),
        );
        return name;
      },
      registerStyles(href) {
        open();
        const value = href instanceof URL ? href.href : href;
        if (
          typeof value !== "string" ||
          !(/\.css(?:[?#].*)?$/.test(value) || value.startsWith("data:text/css"))
        )
          throw TypeError(`${extension}: styles must be a .css URL`);
        pending.styles.push(value);
      },
      // Module gate (additive, SV-42): `disabled(ctx)` lists the areas switched off in the
      // campaign of ctx (see switchedOff). One per area.
      registerModuleGate(def) {
        open();
        if (!isObject(def) || !isFn(def.disabled))
          throw TypeError(`${extension}: a module gate needs disabled(ctx)`);
        if (pending.moduleGates.length) throw Error(`${extension}: one module gate per area`);
        pending.moduleGates.push(Object.freeze({ extension, disabled: def.disabled }));
      },
      // Access gate (additive, B29): `page` is a route of this area shown instead of any
      // page while `refusal(ctx)` returns {it, en} (see accessGate). One per area.
      registerAccessGate(def) {
        open();
        if (
          !isObject(def) ||
          !isFn(def.refusal) ||
          typeof def.page !== "string" ||
          !ID.test(def.page) ||
          !owns(extension, def.page)
        )
          throw TypeError(`${extension}: an access gate needs its own route as page and refusal()`);
        if (pending.gates.length) throw Error(`${extension}: one access gate per area`);
        pending.gates.push(Object.freeze({ extension, page: def.page, refusal: def.refusal }));
      },
      on(event, handler) {
        open();
        checkEvent(event);
        if (!isFn(handler)) throw TypeError(`Handler for "${event}" must be a function`);
        pending.handlers.push({ event, handler });
      },
      emit(event, payload) {
        const own = String(event).startsWith(extension + ":");
        if (!own && !EVENTS.includes(event))
          throw TypeError(`${extension} can emit core events or "${extension}:<name>"`);
        return emit(event, payload, extension);
      },
      slice: (state, name = extension) => slice(state, name),
      list,
      get,
      merge,
      label,
      slot,
      bindSlots,
      run,
      invoke,
      search,
      notifications,
      commandForKey,
      getSetting,
      setSetting,
    });
  }

  const registry = {
    get ctx() {
      return host;
    },
    /** Host context passed to event handlers and used by settings helpers by default. */
    attach(ctx) {
      host = ctx;
      return registry;
    },
    /**
     * Registers one extension transactionally: register(api) runs synchronously and
     * either all of its contributions are added, or none are and it is reported failed.
     */
    use(extension, register, meta = {}) {
      if (typeof extension !== "string" || !ID.test(extension))
        throw TypeError(`Invalid extension id "${extension}"`);
      if (extensionRows.has(extension)) throw Error(`Extension "${extension}" is already loaded`);
      if (!isFn(register))
        return record(extension, "failed", {
          ...meta,
          error: "The entry module must export register(registry)",
        });
      const pending = {
        open: true,
        items: [],
        slices: [],
        styles: [],
        handlers: [],
        gates: [],
        moduleGates: [],
      };
      try {
        const result = register(scoped(extension, pending));
        if (isFn(result?.then)) {
          result.then?.(null, () => {});
          throw TypeError("register(registry) must be synchronous");
        }
      } catch (error) {
        return record(extension, "failed", { ...meta, error });
      } finally {
        pending.open = false;
      }
      for (const c of pending.items) {
        const entry = Object.freeze({ ...c, seq: ++seq });
        items.get(c.point).push(c.point === "command" ? claimShortcut(entry) : entry);
        items.get(c.point).sort(byOrder);
      }
      for (const entry of pending.slices) slices.set(entry.name, entry);
      for (const href of pending.styles) injectStyles(href, extension);
      for (const { event, handler } of pending.handlers) subscribe(event, handler, extension);
      gates.push(...pending.gates);
      moduleGates.push(...pending.moduleGates);
      switchedCache = { state: null, campaign: null, off: null };
      return record(extension, "built", { ...meta, contributions: pending.items.length });
    },
    /** Records an extension that could not be imported (loader use). */
    recordExtension: (id, status, meta = {}) => record(id, status, meta),
    extensions: () => [...extensionRows.values()],
    warnings: () => [...warningList],
    conflicts: () => [...conflictList],
    styles: () => [...styleList],
    slices: () => [...slices.values()],
    report() {
      const rows = [...extensionRows.values()];
      return {
        built: rows.filter((row) => row.status === "built"),
        notBuilt: rows.filter((row) => row.status === "not-built"),
        failed: rows.filter((row) => row.status === "failed"),
        warnings: [...warningList],
        conflicts: [...conflictList],
      };
    },
    /**
     * Localized owner summary for the shell's "What is ready" dialog: one line per area,
     * grouped as with errors / ready / still to build, in plain words first and the
     * technical detail after.
     */
    reportHTML(ctx = host) {
      const t = (it, en) => (ctx?.lang === "en" ? en : it);
      const { built, notBuilt, failed, warnings } = registry.report();
      const count = (id) => warnings.filter((w) => w.extension === id).length;
      const name = (entry) =>
        `<strong>${esc(entry.backlog ? entry.backlog + " · " : "")}${esc(textOf(entry.title, ctx?.lang) || entry.id)}</strong>`;
      const failedRow = (entry) =>
        `<li>${name(entry)} — ${t("il modulo esiste ma non si è avviato: resta escluso e il resto dell’app funziona.", "the module exists but did not start: it stays out and the rest of the app works.")}<small>${t("Dettaglio tecnico", "Technical detail")}: ${esc(entry.error)}</small></li>`;
      // Each contained warning of an area as a plain sentence: where it happened, then
      // the technical text as detail.
      const where = (w) => {
        const [it, en] = PLACES[w.point] ?? ["Un elemento", "An item"];
        const c = items.get(w.point)?.find((e) => e.id === w.id && e.extension === w.extension);
        const quoted = t(`«${c ? label(c, "it") : w.id}»`, `“${c ? label(c, "en") : w.id}”`);
        return `${t(it, en)} ${quoted}`;
      };
      const warningRow = (w) =>
        `<li>${esc(where(w))} ${w.phase === "shortcut" ? t("resta senza scorciatoia: è già in uso.", "has no shortcut: it is already in use.") : t("non ha funzionato.", "did not work.")}<small>${t("Dettaglio tecnico", "Technical detail")}: ${esc(w.message)}</small></li>`;
      const builtRow = (entry) => {
        const own = warnings.filter((w) => w.extension === entry.id && w.point !== "extension");
        const n = count(entry.id);
        return `<li>${name(entry)} — ${t("attiva", "active")} · ${entry.contributions} ${entry.contributions === 1 ? t("contributo", "contribution") : t("contributi", "contributions")}${n ? ` · <span class="error">${n} ${n === 1 ? t("avviso circoscritto", "contained warning") : t("avvisi circoscritti", "contained warnings")}</span>` : ""}${own.length ? `<ul class="ext-warning-list">${own.map(warningRow).join("")}</ul>` : ""}</li>`;
      };
      const plainRow = (entry) => `<li>${name(entry)}</li>`;
      return `<section class="ext-report"><h3>${t("Aree aggiuntive", "Additional areas")}</h3><p>${built.length} ${t("pronte", "ready")} · ${notBuilt.length} ${t("da costruire", "to build")} · ${failed.length} ${t("con errori", "with errors")}</p><p class="muted">${t("Ogni area compare nell’app appena il suo modulo è pronto. Un’area con un errore resta esclusa o mostra un avviso nel suo spazio, senza bloccare il resto.", "Each area appears in the app as soon as its module is ready. An area with an error stays out or shows a warning in its own space, without blocking the rest.")}</p>${failed.length ? `<h4>${t("Con errori · non caricate", "With errors · not loaded")}</h4><ul>${failed.map(failedRow).join("")}</ul>` : ""}${built.length ? `<h4>${t("Pronte", "Ready")}</h4><ul>${built.map(builtRow).join("")}</ul>` : ""}${notBuilt.length ? `<details><summary>${t("Ancora da costruire", "Still to build")} (${notBuilt.length})</summary><ul>${notBuilt.map(plainRow).join("")}</ul></details>` : ""}${warnings.length ? `<details><summary>${t("Avvisi circoscritti", "Contained warnings")} (${warnings.length})</summary><ul>${warnings.map((w) => `<li>${esc(w.extension)} · ${esc(w.point)} “${esc(w.id)}” · ${esc(w.phase)}: ${esc(w.message)}</li>`).join("")}</ul></details>` : ""}</section>`;
    },
    list,
    get,
    merge,
    label,
    call,
    slot,
    bindSlots,
    run,
    invoke,
    search,
    notifications,
    commandForKey,
    pendingDraft,
    getSetting,
    setSetting,
    accessGate,
    switchedOff: (ctx = host) => [...switchedOff(ctx)],
    initState,
    afterUndo,
    slice,
    on: (event, handler) => subscribe(event, handler, "core"),
    emit: (event, payload) => emit(event, payload, "core"),
    emitStateEvents,
  };

  // Core-owned slice holding personal and campaign setting values.
  registry.use("core", (api) =>
    api.registerStateSlice(SETTINGS_SLICE, {
      version: 1,
      undo: "preserve",
      seed: () => ({ personal: {}, campaign: {} }),
      normalize: (value) => ({
        personal: isObject(value?.personal) ? value.personal : {},
        campaign: isObject(value?.campaign) ? value.campaign : {},
      }),
    }),
  );
  extensionRows.delete("core");
  return registry;
}
