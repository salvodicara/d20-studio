// B20 — Campaign settings, permissions, table rules and "view as": pure domain.
//
// Patterns copied (IDs from docs/interview/CAPABILITY_CENSUS.md and
// changes/interview-01/market-census/*.md):
// - D&D Beyond Game Settings: DM switches for what players may do, pointer included,
//   effective at once for everyone (DDB-128, SVC-105).
// - BG3 Custom Mode: a preset bundle, then single switches; some switches lock once the
//   game has started (CRP-040); hide NPC health (CRP-041).
// - Pathfinder WotR: changing a rule marks the campaign "custom" for good (CRP-050).
// - Fantasy Grounds 5E campaign options: enemy health exact / status words / off
//   (R20-167); Improved Initiative player-view verbosity (VTL-128).
// - dnd5e chat card with Apply, applied by the target's owner, as the default (census
//   choice C1) vs Midi-QOL full automation as a campaign level (FVT-138, FVT-141).
// - Roll20 Compendium Selection: each source available, shared or not available (R20-183).
// - Roll20 "Apply Default Settings" with the number of tokens that change (R20-087, SVC-101).
// - Kanka: disable unused campaign modules (CMP-24); "View campaign as member" with a way
//   back, the member's own "self" content staying hidden (SVC-040, CMP-52).
// - World Anvil "Edit Sheet" / Demiplane: the GM edits a player's sheet only when that
//   player allows it (CMP-18, CMP-16).
//
// Rules baseline: D&D 2024, SRD 5.2.1 EN/IT. House rules cite their own authored decision
// (author, date, history entry), never an SRD location. Synthetic data only; identities
// are the shell's demonstration identities; no backend authorization is implied.

import { srdSource } from "./srd-sample.mjs";
import { campaignMembers, listCampaignEntries, getCampaignEntry } from "./campaign-content.mjs";
import { listCampaignSessions } from "./campaign-sessions.mjs";
import { canViewActor, canControlActor, isCampaignActor } from "./character-access.mjs";
import { listHomebrew, enableHomebrewRevision } from "./homebrew.mjs";
import { requirementStatus } from "./adventures.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const ID = "campaign-settings";
export const VERSION = 1;
export const LEGACY_CAMPAIGN = "lanterns";
const L = (it, en) => Object.freeze({ it, en });
const copy = (value) => structuredClone(value);
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const uid = (prefix) =>
  prefix +
  "-" +
  (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36))
    .replace(/-/g, "")
    .slice(0, 12);
export const refuse = (it, en, code = "refused") => {
  throw Object.assign(new Error(en), { it, en, code });
};

// ---------------------------------------------------------------- catalogue

export const SRD_EDITION = Object.freeze({
  edition: "2024",
  revision: "5.2.1",
  en: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
  it: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf",
});
// SRD 5.2.1 "Multiclassing" EN 24–26, IT "Multiclasse" 27–29 (checked in the official PDFs).
export const MULTICLASS_SOURCE = srdSource([24, 25, 26], [27, 28, 29]);
// SRD 5.2.1 Rules Glossary "Bloodied" / "Sanguinante": EN 177, IT 214.
export const BLOODIED_SOURCE = srdSource([177], [214]);
const APP_OPTION = Object.freeze({ kind: "app-option", edition: "2024", revision: "b20-1" });
const HOUSE_RULE = Object.freeze({ kind: "house-rule", edition: "2024" });
// A rule the SRD 5.2.1 names (EN and IT PDFs); the rule's own name locates it, no page is
// claimed (P10 CA-69: never an invented SRD page).
const srdRule = (it, en) =>
  Object.freeze({ kind: "srd-rule", edition: "2024", revision: "5.2.1", rule: L(it, en) });
// The 2024 core rules with nothing added (for "no flanking bonus").
const CORE_RULES = Object.freeze({ kind: "core", edition: "2024" });

// The "Standard 2024" preset: the rules as the SRD writes them plus this app's defaults:
// assisted application (census choice C1: the dnd5e card with "Apply", FVT-138; automatic
// is a campaign level, FVT-141) and status words for enemies. P10 CA-69 adds the rule
// catalogue of BG3 Custom Mode / Solasta presets: critical hits, potions, weight, flanking.
export const STANDARD_2024 = Object.freeze({
  multiclass: "allowed",
  automation: "assisted",
  enemyHp: "words",
  criticals: "dice",
  potions: "bonus",
  encumbrance: "standard",
  flanking: "off",
});
export const PRESET_KEYS = Object.freeze(Object.keys(STANDARD_2024));
// Rule presets (BG3 difficulty + Custom Mode CRP-040, Solasta presets then single values):
// picking one sets every rule not locked; changing one rule afterwards reads "Custom".
export const PRESETS = Object.freeze([
  Object.freeze({
    id: "standard-2024",
    label: L("Standard 2024", "Standard 2024"),
    help: L(
      "Le regole come le scrive il SRD 5.2.1. I danni aspettano «Applica».",
      "The rules as SRD 5.2.1 writes them. Damage waits for “Apply”.",
    ),
    values: STANDARD_2024,
  }),
  Object.freeze({
    id: "narrative",
    label: L("Narrativo", "Narrative"),
    help: L(
      "Meno conti: il peso non si conta, la salute dei nemici a parole.",
      "Less bookkeeping: weight is not counted, enemy health in words.",
    ),
    values: Object.freeze({ ...STANDARD_2024, encumbrance: "off" }),
  }),
  Object.freeze({
    id: "tactical",
    label: L("Tattico", "Tactical"),
    help: L(
      "Più sfida: danni subito, salute dei nemici nascosta, fiancheggiamento e ingombro variante.",
      "More challenge: damage at once, enemy health hidden, flanking and variant encumbrance.",
    ),
    values: Object.freeze({
      ...STANDARD_2024,
      automation: "automatic",
      enemyHp: "hidden",
      potions: "action",
      encumbrance: "variant",
      flanking: "advantage",
    }),
  }),
]);
export const presetById = (id) => PRESETS.find((preset) => preset.id === id) ?? null;
// Where each rule is shown in the settings (one place per rule).
export const RULE_GROUPS = Object.freeze([
  Object.freeze({ id: "character", label: L("Personaggi", "Characters") }),
  Object.freeze({ id: "table", label: L("Tavolo e automazione", "Table and automation") }),
  Object.freeze({ id: "combat", label: L("Combattimento e avventura", "Combat and adventure") }),
  Object.freeze({ id: "disclosure", label: L("Cosa vedono i giocatori", "What players see") }),
]);

// Table rules shown as BG3-style switches. `lock: "start"` freezes the rule once the
// campaign has started (BG3 CRP-040); every option names its source kind.
export const RULES = Object.freeze([
  Object.freeze({
    key: "multiclass",
    group: "character",
    lock: "start",
    label: L("Multiclasse", "Multiclassing"),
    help: L(
      "Se non è consentito, nella creazione del personaggio «Aggiungi classe» resta disattivato con il motivo.",
      "When not allowed, “Add class” stays disabled in the character builder, with the reason.",
    ),
    consumer: L("Creazione del personaggio", "Character builder"),
    pattern: "CRP-040",
    options: Object.freeze([
      Object.freeze({
        value: "allowed",
        label: L("Consentito", "Allowed"),
        source: MULTICLASS_SOURCE,
      }),
      Object.freeze({
        value: "forbidden",
        label: L("Non consentito · regola della casa", "Not allowed · house rule"),
        source: HOUSE_RULE,
      }),
    ]),
  }),
  Object.freeze({
    key: "automation",
    group: "table",
    lock: null,
    label: L("Livello di automazione", "Automation level"),
    help: L(
      "Assistito: danni ed effetti di un colpo restano sulla carta d’attacco finché chi controlla il bersaglio preme «Applica» (il DM per le sue creature). Automatico: si applicano subito, con «Annulla» sulla carta.",
      "Assisted: a hit’s damage and effects stay on the attack card until whoever controls the target presses “Apply” (the DM for their creatures). Automatic: they apply at once, with “Undo” on the card.",
    ),
    consumer: L(
      "Carta d’attacco in «Tiri e risultati»; «Da applicare» al Tavolo del DM",
      "Attack card in “Rolls and results”; “To apply” on the DM’s Table",
    ),
    pattern: "FVT-138 · FVT-141 · C1",
    options: Object.freeze([
      Object.freeze({ value: "assisted", label: L("Assistito", "Assisted"), source: APP_OPTION }),
      Object.freeze({
        value: "automatic",
        label: L("Automatico", "Automatic"),
        source: APP_OPTION,
      }),
    ]),
  }),
  Object.freeze({
    key: "enemyHp",
    group: "disclosure",
    lock: null,
    label: L("Salute dei nemici vista dai giocatori", "Enemy health shown to players"),
    help: L(
      "Vale per le creature del DM: PF esatti, parole (Illeso, Ferito, Sanguinante) oppure nulla. Il DM vede sempre i PF.",
      "Applies to the DM’s creatures: exact HP, words (Unhurt, Wounded, Bloodied) or nothing. The DM always sees HP.",
    ),
    consumer: L(
      "Tavolo: sotto la pedina e nel pannello",
      "Table: under the token and in the panel",
    ),
    pattern: "R20-167 · CRP-041 · VTL-128",
    options: Object.freeze([
      Object.freeze({ value: "exact", label: L("PF esatti", "Exact HP"), source: APP_OPTION }),
      Object.freeze({
        value: "words",
        label: L("A parole", "In words"),
        source: BLOODIED_SOURCE,
      }),
      Object.freeze({ value: "hidden", label: L("Nascosta", "Hidden"), source: APP_OPTION }),
    ]),
  }),
  // P10 CA-69: the rule catalogue. `consumer` names where the rule acts; since R1 and R4
  // (H-01, contract C7) critical hits, flanking and potions are computed by their engines.
  Object.freeze({
    key: "criticals",
    group: "combat",
    lock: null,
    label: L("Colpi critici", "Critical hits"),
    help: L(
      "Con un 20 naturale l’attacco colpisce e i dadi del danno si tirano due volte (regole 2024). La variante dà il massimo di un tiro più un tiro.",
      "On a natural 20 the attack hits and the damage dice are rolled twice (2024 rules). The variant gives the maximum of one roll plus a roll.",
    ),
    consumer: L(
      "Motore d’attacco del Tavolo: con un 20 naturale raddoppia i dadi del danno; con la variante mette un set di dadi al massimo e tira l’altro, e la carta d’attacco lo scrive",
      "The Table’s attack engine: on a natural 20 it doubles the damage dice; with the variant it sets one set of dice to its maximum and rolls the other, and the attack card says so",
    ),
    pattern: "CRP-040",
    options: Object.freeze([
      Object.freeze({
        value: "dice",
        label: L("Dadi raddoppiati", "Dice rolled twice"),
        source: srdRule("Colpo critico", "Critical Hit"),
      }),
      Object.freeze({
        value: "max",
        label: L("Massimo più un tiro · regola della casa", "Maximum plus a roll · house rule"),
        source: HOUSE_RULE,
      }),
    ]),
  }),
  Object.freeze({
    key: "potions",
    group: "combat",
    lock: null,
    label: L("Bere una pozione", "Drinking a potion"),
    help: L(
      "Nelle regole 2024 bere o far bere una Pozione di guarigione è un’Azione Bonus, come in BG3.",
      "In the 2024 rules drinking or administering a Potion of Healing is a Bonus Action, as in BG3.",
    ),
    consumer: L(
      "Inventario e barra delle azioni: bere o far bere una pozione spende un’Azione Bonus, o un’Azione con la regola della casa",
      "Inventory and action bar: drinking or administering a potion spends a Bonus Action, or an Action with the house rule",
    ),
    pattern: "CRP-040",
    options: Object.freeze([
      Object.freeze({
        value: "bonus",
        label: L("Azione Bonus", "Bonus Action"),
        source: srdRule("Pozione di guarigione", "Potion of Healing"),
      }),
      Object.freeze({
        value: "action",
        label: L("Azione · regola della casa", "Action · house rule"),
        source: HOUSE_RULE,
      }),
    ]),
  }),
  Object.freeze({
    key: "encumbrance",
    group: "character",
    lock: null,
    label: L("Peso e ingombro", "Weight and encumbrance"),
    help: L(
      "Standard: capacità di carico pari a Forza × 15. La variante rallenta chi porta molto; senza peso nessuno lo conta.",
      "Standard: carrying capacity equal to Strength × 15. The variant slows whoever carries a lot; without weight nobody counts it.",
    ),
    consumer: L(
      "Inventario del personaggio (ognuno può ancora sceglierlo per la propria scheda)",
      "Character inventory (each player can still choose it for their own sheet)",
    ),
    pattern: "CRP-040",
    options: Object.freeze([
      Object.freeze({
        value: "standard",
        label: L("Capacità di carico", "Carrying capacity"),
        source: srdRule("Capacità di carico", "Carrying Capacity"),
      }),
      Object.freeze({
        value: "variant",
        label: L("Ingombro variante · regola facoltativa", "Variant encumbrance · optional rule"),
        source: HOUSE_RULE,
      }),
      Object.freeze({
        value: "off",
        label: L("Non si conta il peso · regola della casa", "Weight not counted · house rule"),
        source: HOUSE_RULE,
      }),
    ]),
  }),
  Object.freeze({
    key: "flanking",
    group: "combat",
    lock: null,
    label: L("Fiancheggiamento", "Flanking"),
    help: L(
      "Le regole 2024 non danno bonus a chi circonda un nemico. La variante dà vantaggio a due alleati su lati opposti.",
      "The 2024 rules give no bonus for surrounding a foe. The variant gives advantage to two allies on opposite sides.",
    ),
    consumer: L(
      "Motore d’attacco del Tavolo: in mischia dà vantaggio a chi ha un alleato conscio sul lato opposto del nemico e lo scrive tra i motivi del tiro",
      "The Table’s attack engine: in melee it gives Advantage to whoever has a conscious ally on the enemy’s opposite side and names it among the roll’s reasons",
    ),
    pattern: "CRP-040",
    options: Object.freeze([
      Object.freeze({
        value: "off",
        label: L("Nessun bonus", "No bonus"),
        source: CORE_RULES,
      }),
      Object.freeze({
        value: "advantage",
        label: L(
          "Vantaggio a chi fiancheggia · regola facoltativa",
          "Advantage when flanking · optional rule",
        ),
        source: HOUSE_RULE,
      }),
    ]),
  }),
]);
export const ruleOf = (key) => RULES.find((rule) => rule.key === key) ?? null;

export const CREATURE_NAME = Object.freeze([
  Object.freeze({ value: "everyone", label: L("Tutti", "Everyone") }),
  Object.freeze({ value: "dm", label: L("Solo il DM", "The DM only") }),
]);

// Campaign sections that can never be switched off: the landing page, the DM's
// preparation and settings, this area's own pages and the players' safety tools (B27:
// whether a DM may hide them is an owner decision, so they stay on until it is taken).
export const PROTECTED_SECTIONS = Object.freeze([
  "overview",
  "preparation",
  "settings",
  "notes",
  "entry",
  "edit",
  "safety",
  "campaign-settings-rules",
  "campaign-settings-view",
]);
export const CORE_SECTIONS = Object.freeze([
  Object.freeze({ id: "group", label: L("Gruppo", "Party") }),
  Object.freeze({ id: "sessions", label: L("Sessioni", "Sessions") }),
  Object.freeze({ id: "journal", label: L("Diario", "Journal") }),
  Object.freeze({ id: "world", label: L("Mondo", "World") }),
]);
const SECTION_ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

// What players may do on the Table (D&D Beyond Game Settings, DDB-128/SVC-105). One source
// of truth: the campaign-scoped settings B18 (annotations.mjs) registered and enforces;
// this area presents them in Permissions, "Table rules" and History, and table.mjs reads
// the same keys for the disabled chip. `legacy` is the key B20 used before (history rows).
export const SETTINGS_SLICE = "core-settings";
export const PLAYER_TOOLS = Object.freeze([
  Object.freeze({
    key: "players-pointer",
    legacy: "playersPointer",
    setting: "annotations-table.players-pointer",
    label: L("I giocatori possono usare puntatore e segnali", "Players can use pointer and pings"),
    short: L("Puntatore e segnali dei giocatori", "Players’ pointer and pings"),
  }),
  Object.freeze({
    key: "players-draw",
    setting: "annotations-table.players-draw",
    label: L("I giocatori possono disegnare", "Players can draw"),
    short: L("Disegni dei giocatori", "Players’ drawings"),
  }),
  Object.freeze({
    key: "players-templates",
    setting: "annotations-table.players-templates",
    label: L("I giocatori possono creare sagome", "Players can create templates"),
    short: L("Sagome dei giocatori", "Players’ templates"),
  }),
]);
export const toolOf = (key) =>
  PLAYER_TOOLS.find((tool) => tool.key === key || tool.legacy === key) ?? null;
/** Whether players may use a Table tool: the stored campaign setting, allowed by default. */
export function playerToolAllowed(state, key) {
  const tool = toolOf(key);
  return Boolean(tool) && state?.ext?.[SETTINGS_SLICE]?.campaign?.[tool.setting] !== false;
}
export const playerTools = (state) =>
  Object.fromEntries(PLAYER_TOOLS.map((tool) => [tool.key, playerToolAllowed(state, tool.key)]));

// P10 CA-61 (D&D Beyond Game Settings, Owlbear per-role permissions, Roll20 "controlled by
// all players"): what the "player" role may do besides the Table tools above. The co-DM
// role already has the DM's powers over creatures (character-access.mjs); observers only
// watch. `dmCreatures: "players"` lets players move and act with the DM's creatures
// (through each creature's controllers, the same field the session handover uses);
// `playerLock` lets them lock and unlock the tokens they control from the token menu;
// `playerGroup` (R7, contract C2, Owlbear per-role permissions) lets them group and ungroup
// the tokens they control (token-menu.mjs playersMayGroup reads it; off by default).
export const PERMISSIONS = Object.freeze([
  Object.freeze({
    key: "dmCreatures",
    on: "players",
    off: "dm",
    label: L(
      "I giocatori possono muovere e far agire le creature del DM",
      "Players can move and act with the DM’s creatures",
    ),
    short: L("Creature del DM controllate dai giocatori", "DM creatures controlled by players"),
    help: L(
      "Come «Controllata da: tutti i giocatori» di Roll20: utile per alleati e mostri evocati. Le creature private del DM restano sue.",
      "Like Roll20’s “Controlled by: all players”: useful for allies and summoned monsters. The DM’s private creatures stay theirs.",
    ),
  }),
  Object.freeze({
    key: "playerLock",
    on: true,
    off: false,
    label: L(
      "I giocatori possono bloccare e sbloccare le proprie pedine",
      "Players can lock and unlock their own tokens",
    ),
    short: L("Blocco delle pedine dei giocatori", "Players lock their tokens"),
    help: L(
      "Dal menu della pedina («Blocca o sblocca la pedina»): una pedina bloccata non si muove per sbaglio.",
      "From the token menu (“Lock or unlock the token”): a locked token does not move by mistake.",
    ),
  }),
  Object.freeze({
    key: "playerGroup",
    on: true,
    off: false,
    label: L(
      "I giocatori possono raggruppare le proprie pedine",
      "Players can group their own tokens",
    ),
    short: L("Gruppi di pedine dei giocatori", "Players group their tokens"),
    help: L(
      "Dal menu della pedina («Raggruppa» e «Separa»), solo con le pedine che ognuno controlla, come i permessi per ruolo di Owlbear. Le pedine del DM e degli altri giocatori restano fuori.",
      "From the token menu (“Group” and “Ungroup”), only with the tokens each player controls, like Owlbear’s per-role permissions. The DM’s and other players’ tokens stay out.",
    ),
  }),
]);
export const permissionOf = (key) => PERMISSIONS.find((row) => row.key === key) ?? null;

// P10 CA-74 (Roll20 default page and token settings with "Apply Default Settings"): what a
// new scene starts with, and what "Apply to existing" writes on the scenes already made.
// Grid and scale are the scene's own fields (preparation.mjs); vision and time of day are
// the fog-and-vision area's scene options (fog-vision-domain.mjs setSceneOptions).
export const SCENE_DEFAULTS = Object.freeze([
  Object.freeze({
    key: "gridVisible",
    label: L("Griglia visibile", "Grid shown"),
    type: "boolean",
  }),
  Object.freeze({
    key: "gridSnap",
    label: L("Le pedine si agganciano alla griglia", "Tokens snap to the grid"),
    type: "boolean",
  }),
  Object.freeze({
    key: "metersPerCell",
    label: L("Scala (metri per casella)", "Scale (metres per square)"),
    type: "choice",
    options: Object.freeze([1.5, 3]),
  }),
  Object.freeze({
    key: "vision",
    label: L("Nebbia e visione dei personaggi", "Fog and character vision"),
    type: "boolean",
  }),
  Object.freeze({
    key: "phase",
    label: L("Luce della scena", "Scene light"),
    type: "choice",
    options: Object.freeze(["day", "dusk", "night"]),
  }),
]);
export const PHASE_NAMES = Object.freeze({
  day: L("Giorno (luce intensa)", "Day (bright light)"),
  dusk: L("Crepuscolo (luce fioca)", "Dusk (dim light)"),
  night: L("Notte (oscurità)", "Night (darkness)"),
});
export const DEFAULT_SCENE = Object.freeze({
  gridVisible: true,
  gridSnap: false,
  metersPerCell: 1.5,
  vision: false,
  phase: "day",
});

export const DEFAULT_POLICY = Object.freeze({
  ...STANDARD_2024,
  legacySources: "blocked",
  creatureName: "everyone",
  hiddenSections: Object.freeze([]),
  dmSheetEdit: Object.freeze({}),
  dmCreatures: "dm",
  playerLock: false,
  playerGroup: false,
  dc: "shown",
  passiveFailures: "hidden",
  sceneDefaults: DEFAULT_SCENE,
  creatureVision: false,
});
export const HOUSE_TITLE_MAX = 80;
export const HOUSE_TEXT_MAX = 600;
export const REASON_MAX = 300;

// ---------------------------------------------------------------- slice

function blankRecord({ createdAt = null, startedAt = null } = {}) {
  return {
    policy: copy(DEFAULT_POLICY),
    createdAt,
    startedAt,
    customizedAt: null,
    houseRules: [],
    history: [],
    sheetRequests: [],
    sheetTrace: [],
    considered: [],
    // P10: DM creatures the players' control permission granted (actor id → had it
    // before), and the scenes / creatures already under the current scene defaults.
    creatureGrant: {},
    consideredScenes: null,
    consideredVision: null,
  };
}
export function seedSlice() {
  // The sample campaign was created on 2 May 2026 (B13 seed) and first played on 3 May.
  const lanterns = blankRecord({
    createdAt: sampleDate("2026-05-02T18:00:00.000Z"),
    startedAt: sampleDate("2026-05-03T20:10:00.000Z"),
  });
  // Standard 2024 applies damage in assisted mode (C1). The sample group chose automatic
  // application at creation (a campaign level, FVT-141): every existing Table journey
  // plays this campaign that way. New campaigns start assisted.
  lanterns.policy.automation = "automatic";
  lanterns.customizedAt = sampleDate("2026-05-02T18:05:00.000Z");
  lanterns.history.push(
    {
      id: "hist-created",
      at: sampleDate("2026-05-02T18:00:00.000Z"),
      by: "dm",
      kind: "preset",
      key: "preset",
      from: null,
      to: "standard-2024",
    },
    {
      id: "hist-automation",
      at: sampleDate("2026-05-02T18:05:00.000Z"),
      by: "dm",
      kind: "rule",
      key: "automation",
      from: "assisted",
      to: "automatic",
      reason: "Scelta del gruppo di esempio: danni applicati subito, con Annulla",
    },
    {
      id: "hist-started",
      at: sampleDate("2026-05-03T20:10:00.000Z"),
      by: "dm",
      kind: "start",
      key: "startedAt",
      from: null,
      to: sampleDate("2026-05-03T20:10:00.000Z"),
    },
  );
  return { campaigns: { [LEGACY_CAMPAIGN]: lanterns } };
}
const text = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");
const isoOrNull = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
/** A valid scene-defaults record: each known field kept only when its value is allowed. */
export function sceneDefaultValue(key, value) {
  const field = SCENE_DEFAULTS.find((row) => row.key === key);
  if (!field) return undefined;
  if (field.type === "boolean") return typeof value === "boolean" ? value : undefined;
  return field.options.includes(value) ? value : undefined;
}
function normalizeSceneDefaults(raw) {
  const out = { ...DEFAULT_SCENE };
  if (!isObject(raw)) return out;
  for (const field of SCENE_DEFAULTS) {
    const value = sceneDefaultValue(field.key, raw[field.key]);
    if (value !== undefined) out[field.key] = value;
  }
  return out;
}
function normalizePolicy(raw) {
  const policy = copy(DEFAULT_POLICY);
  if (!isObject(raw)) return policy;
  for (const rule of RULES)
    if (rule.options.some((option) => option.value === raw[rule.key]))
      policy[rule.key] = raw[rule.key];
  // Players' tools live in the campaign settings (PLAYER_TOOLS); an older stored
  // `playersPointer` is not a second source of truth and is dropped.
  if (CREATURE_NAME.some((option) => option.value === raw.creatureName))
    policy.creatureName = raw.creatureName;
  if (Array.isArray(raw.hiddenSections))
    policy.hiddenSections = [
      ...new Set(
        raw.hiddenSections.filter(
          (id) => typeof id === "string" && SECTION_ID.test(id) && !PROTECTED_SECTIONS.includes(id),
        ),
      ),
    ];
  if (isObject(raw.dmSheetEdit))
    for (const [actorId, value] of Object.entries(raw.dmSheetEdit))
      if (value === false) policy.dmSheetEdit[actorId] = false;
  if (raw.dmCreatures === "players") policy.dmCreatures = "players";
  if (raw.playerLock === true) policy.playerLock = true;
  if (raw.playerGroup === true) policy.playerGroup = true;
  for (const row of DISCLOSURE_POLICY)
    if (row.options.some((option) => option.value === raw[row.key])) policy[row.key] = raw[row.key];
  if (raw.creatureVision === true) policy.creatureVision = true;
  policy.sceneDefaults = normalizeSceneDefaults(raw.sceneDefaults);
  // C4: the legacy 2014 versions stand beside the 2024 ones only when the DM switches them
  // on in Fonti; the rules edition itself stays 2024, fixed at creation.
  policy.legacySources = raw.legacySources === "available" ? "available" : "blocked";
  return policy;
}
function normalizeRecord(raw) {
  const record = blankRecord({
    createdAt: isoOrNull(raw?.createdAt),
    startedAt: isoOrNull(raw?.startedAt),
  });
  if (!isObject(raw)) return record;
  record.policy = normalizePolicy(raw.policy);
  record.customizedAt = isoOrNull(raw.customizedAt);
  record.houseRules = (Array.isArray(raw.houseRules) ? raw.houseRules : [])
    .filter(
      (rule) => isObject(rule) && typeof rule.id === "string" && typeof rule.title === "string",
    )
    .map((rule) => ({
      id: rule.id,
      title: text(rule.title, HOUSE_TITLE_MAX),
      text: text(rule.text, HOUSE_TEXT_MAX),
      authorId: typeof rule.authorId === "string" ? rule.authorId : null,
      createdAt: isoOrNull(rule.createdAt),
      decisionId: typeof rule.decisionId === "string" ? rule.decisionId : null,
      retiredAt: isoOrNull(rule.retiredAt),
      retiredReason: text(rule.retiredReason, REASON_MAX),
    }));
  record.history = (Array.isArray(raw.history) ? raw.history : []).filter(
    (entry) => isObject(entry) && typeof entry.id === "string" && typeof entry.kind === "string",
  );
  record.sheetRequests = (Array.isArray(raw.sheetRequests) ? raw.sheetRequests : []).filter(
    (entry) => isObject(entry) && typeof entry.id === "string" && typeof entry.actorId === "string",
  );
  record.sheetTrace = (Array.isArray(raw.sheetTrace) ? raw.sheetTrace : []).filter(
    (entry) => isObject(entry) && typeof entry.actorId === "string",
  );
  record.considered = [
    ...new Set(
      (Array.isArray(raw.considered) ? raw.considered : []).filter((id) => typeof id === "string"),
    ),
  ];
  if (isObject(raw.creatureGrant))
    for (const [actorId, had] of Object.entries(raw.creatureGrant))
      if (typeof had === "boolean") record.creatureGrant[actorId] = had;
  const ids = (value) =>
    Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === "string"))] : null;
  record.consideredScenes = ids(raw.consideredScenes);
  record.consideredVision = ids(raw.consideredVision);
  return record;
}
export function normalizeSlice(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Campaign settings data comes from a newer version");
  if (!isObject(slice) || !isObject(slice.campaigns)) return seedSlice();
  const campaigns = {};
  for (const [id, raw] of Object.entries(slice.campaigns))
    if (typeof id === "string" && SECTION_ID.test(id)) campaigns[id] = normalizeRecord(raw);
  return { campaigns };
}
export const recordOf = (slice, campaignId) => slice?.campaigns?.[campaignId] ?? null;
function mutableRecord(slice, campaignId) {
  if (!isObject(slice?.campaigns)) throw Error("Campaign settings state is not initialized");
  if (!campaignId) refuse("Nessuna campagna aperta.", "No open campaign.", "no-campaign");
  return (slice.campaigns[campaignId] ??= blankRecord());
}
/** The effective policy of a campaign: its record, or the Standard 2024 defaults. */
export function policyOf(slice, campaignId) {
  return normalizePolicy(recordOf(slice, campaignId)?.policy);
}
/** The preset every rule matches ("standard-2024", "narrative", "tactical") or "custom". */
export function presetOf(policy) {
  return (
    PRESETS.find((preset) => PRESET_KEYS.every((key) => policy[key] === preset.values[key]))?.id ??
    "custom"
  );
}

// ---------------------------------------------------------------- roles

export function memberOf(state, campaignId, viewer) {
  return campaignMembers(state, campaignId).find((member) => member.id === viewer) ?? null;
}
export function isCampaignDm(state, campaignId, viewer) {
  return ["dm", "co-dm"].includes(memberOf(state, campaignId, viewer)?.role);
}
function requireDm(state, campaignId, viewer) {
  if (!isCampaignDm(state, campaignId, viewer))
    refuse(
      "Solo il DM della campagna può cambiare le impostazioni.",
      "Only the campaign’s DM can change the settings.",
      "dm-only",
    );
}
function history(record, entry, now) {
  const row = { id: uid("hist"), at: new Date(now).toISOString(), ...entry };
  record.history.push(row);
  if (record.history.length > 200) record.history.splice(0, record.history.length - 200);
  return row;
}
const cleanReason = (reason) =>
  String(reason ?? "")
    .trim()
    .slice(0, REASON_MAX);

// ---------------------------------------------------------------- rules

/** Why a rule cannot change now, or null. */
export function ruleLock(record, key) {
  const rule = ruleOf(key);
  if (rule?.lock === "start" && record?.startedAt)
    return {
      since: record.startedAt,
      it: "Bloccata dall’avvio della campagna: cambiarla ora cambierebbe le regole di personaggi già costruiti.",
      en: "Locked since the campaign started: changing it now would change the rules for characters already built.",
    };
  return null;
}
function markCustom(record, now) {
  if (presetOf(record.policy) === "custom" && !record.customizedAt)
    record.customizedAt = new Date(now).toISOString();
}
export function setRule(state, slice, campaignId, key, value, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  const rule = ruleOf(key);
  if (!rule) refuse("Regola sconosciuta.", "Unknown rule.", "unknown-rule");
  if (!rule.options.some((option) => option.value === value))
    refuse("Valore non valido per questa regola.", "Invalid value for this rule.", "invalid-value");
  const record = mutableRecord(slice, campaignId);
  const current = policyOf(slice, campaignId)[key];
  if (current === value)
    refuse("La regola ha già questo valore.", "The rule already has this value.", "same");
  const lock = ruleLock(record, key);
  if (lock) refuse(lock.it, lock.en, "locked");
  record.policy = { ...policyOf(slice, campaignId), [key]: value };
  const now = options.now ?? Date.now();
  markCustom(record, now);
  return history(
    record,
    {
      by: viewer,
      kind: "rule",
      key,
      from: current,
      to: value,
      reason: cleanReason(options.reason),
    },
    now,
  );
}
/** A preset's values for every rule not locked; locked rules keep theirs (BG3 CRP-040). */
export function previewPreset(slice, campaignId, presetId = "standard-2024") {
  const preset = presetById(presetId);
  if (!preset) refuse("Preset sconosciuto.", "Unknown preset.", "unknown-preset");
  const record = recordOf(slice, campaignId);
  const policy = policyOf(slice, campaignId);
  const changes = [],
    kept = [];
  for (const key of PRESET_KEYS) {
    if (policy[key] === preset.values[key]) continue;
    if (ruleLock(record, key)) kept.push({ key, value: policy[key], wanted: preset.values[key] });
    else changes.push({ key, from: policy[key], to: preset.values[key] });
  }
  return { preset: presetId, changes, kept };
}
/** Applies a preset in one history entry; a later single change makes the rules "custom". */
export function applyPreset(state, slice, campaignId, presetId, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  const { changes, kept } = previewPreset(slice, campaignId, presetId);
  const name = presetById(presetId).label;
  if (!changes.length)
    refuse(
      kept.length
        ? `Le regole modificabili sono già ${name.it}; quelle bloccate restano come sono.`
        : `Le regole sono già ${name.it}.`,
      kept.length
        ? `The editable rules already match ${name.en}; locked ones stay as they are.`
        : `The rules already match ${name.en}.`,
      "same",
    );
  const record = mutableRecord(slice, campaignId);
  const policy = policyOf(slice, campaignId);
  const from = presetOf(policy);
  for (const change of changes) policy[change.key] = change.to;
  record.policy = policy;
  const now = options.now ?? Date.now();
  markCustom(record, now);
  return history(
    record,
    {
      by: viewer,
      kind: "preset",
      key: "preset",
      from,
      to: presetId,
      changes,
      kept,
      reason: cleanReason(options.reason),
    },
    now,
  );
}
export function applyStandardPreset(state, slice, campaignId, viewer, options = {}) {
  return applyPreset(state, slice, campaignId, "standard-2024", viewer, options);
}
export function startCampaign(state, slice, campaignId, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  const record = mutableRecord(slice, campaignId);
  if (record.startedAt)
    refuse("La campagna è già avviata.", "The campaign has already started.", "same");
  const now = options.now ?? Date.now();
  record.startedAt = new Date(now).toISOString();
  return history(
    record,
    { by: viewer, kind: "start", key: "startedAt", from: null, to: record.startedAt },
    now,
  );
}

// ---------------------------------------------------------------- house rules

export function addHouseRule(state, slice, campaignId, input, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  const title = String(input?.title ?? "").trim();
  const body = String(input?.text ?? "").trim();
  if (!title || title.length > HOUSE_TITLE_MAX)
    refuse(
      `Il titolo deve avere da 1 a ${HOUSE_TITLE_MAX} caratteri.`,
      `The title needs 1 to ${HOUSE_TITLE_MAX} characters.`,
      "title",
    );
  if (!body || body.length > HOUSE_TEXT_MAX)
    refuse(
      `Descrivi la regola in 1–${HOUSE_TEXT_MAX} caratteri.`,
      `Describe the rule in 1–${HOUSE_TEXT_MAX} characters.`,
      "text",
    );
  const record = mutableRecord(slice, campaignId);
  if (record.houseRules.some((rule) => !rule.retiredAt && rule.title === title))
    refuse(
      "Esiste già una regola della casa con questo titolo.",
      "A house rule with this title already exists.",
      "duplicate",
    );
  const now = options.now ?? Date.now();
  const id = uid("house");
  const entry = history(
    record,
    { by: viewer, kind: "house-rule", key: id, from: null, to: title },
    now,
  );
  record.houseRules.push({
    id,
    title,
    text: body,
    authorId: viewer,
    createdAt: entry.at,
    decisionId: entry.id,
    retiredAt: null,
    retiredReason: "",
  });
  return id;
}
export function retireHouseRule(state, slice, campaignId, ruleId, reason, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  const why = cleanReason(reason);
  if (!why) refuse("Indica il motivo.", "Give the reason.", "reason");
  const record = mutableRecord(slice, campaignId);
  const rule = record.houseRules.find((entry) => entry.id === ruleId && !entry.retiredAt);
  if (!rule) refuse("Regola della casa non trovata.", "House rule not found.", "missing");
  const entry = history(
    record,
    {
      by: viewer,
      kind: "house-rule-retired",
      key: ruleId,
      from: rule.title,
      to: null,
      reason: why,
    },
    options.now ?? Date.now(),
  );
  rule.retiredAt = entry.at;
  rule.retiredReason = why;
  return entry;
}
/** A house rule's source: its authored decision (author, date, history entry). */
export function houseRuleSource(rule) {
  return {
    kind: "house-rule",
    edition: "2024",
    authorId: rule.authorId,
    decidedAt: rule.createdAt,
    decisionId: rule.decisionId,
  };
}

// ---------------------------------------------------------------- permissions

/**
 * Turns a players' Table tool on or off: writes the campaign setting B18 enforces (the one
 * value every screen reads) and records the change in this area's history, atomically.
 */
export function setPlayerTool(state, slice, campaignId, key, allowed, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  const tool = toolOf(key);
  if (!tool) refuse("Strumento sconosciuto.", "Unknown tool.", "unknown-tool");
  if (typeof allowed !== "boolean") refuse("Valore non valido.", "Invalid value.", "invalid-value");
  const bag = state.ext?.[SETTINGS_SLICE]?.campaign;
  if (!isObject(bag))
    refuse(
      "Le impostazioni della campagna non sono disponibili.",
      "Campaign settings are unavailable.",
      "no-settings",
    );
  const record = mutableRecord(slice, campaignId);
  const current = playerToolAllowed(state, tool.key);
  if (current === allowed)
    refuse("L’impostazione è già così.", "The setting is already so.", "same");
  bag[tool.setting] = allowed;
  return history(
    record,
    {
      by: viewer,
      kind: "permission",
      key: tool.key,
      from: current,
      to: allowed,
      reason: cleanReason(options.reason),
    },
    options.now ?? Date.now(),
  );
}
/** History rows for tool changes made elsewhere (B18's drawer, Preferences): same log. */
export function recordToolChanges(slice, campaignId, before, after, viewer, options = {}) {
  const rows = [];
  for (const tool of PLAYER_TOOLS)
    if (before[tool.key] !== after[tool.key])
      rows.push(
        history(
          mutableRecord(slice, campaignId),
          {
            by: viewer,
            kind: "permission",
            key: tool.key,
            from: before[tool.key],
            to: after[tool.key],
          },
          options.now ?? Date.now(),
        ),
      );
  return rows;
}

// ---------------------------------------------------------------- permissions (P10 CA-61)

/** The DM creatures the "players control" permission covers: the campaign's NPCs, not
 * companions, never the DM's private ones. */
export function sharedCreatures(state, campaignId) {
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor?.kind === "npc" &&
      !actor.companion &&
      actor.visibility !== "private" &&
      isCampaignActor(actor, campaignId),
  );
}
export const permissionAllowed = (policy, key) => policy?.[key] === permissionOf(key)?.on;
const handoverTo = (state, campaignId) =>
  state?.ext?.["campaign-members"]?.campaigns?.[campaignId]?.handover?.to ?? null;
/** Grants or withdraws the players' control of the DM creatures (Roll20 "controlled by"). */
function syncCreatureControl(state, record, allowed, campaignId) {
  if (allowed) {
    for (const actor of sharedCreatures(state, campaignId)) {
      if (actor.id in record.creatureGrant) continue;
      const had = Array.isArray(actor.controllers) && actor.controllers.includes("player");
      record.creatureGrant[actor.id] = had;
      if (!had) actor.controllers = [...(actor.controllers ?? []), "player"];
    }
    return;
  }
  // A session handover to the player keeps its creatures (campaign-members.mjs ends it).
  const keep = handoverTo(state, campaignId) === "player";
  for (const [actorId, had] of Object.entries(record.creatureGrant)) {
    const actor = state.actors?.[actorId];
    if (actor && !had && !keep) {
      actor.controllers = (actor.controllers ?? []).filter((id) => id !== "player");
      if (!actor.controllers.length) delete actor.controllers;
    }
  }
  record.creatureGrant = {};
}
/** New DM creatures the "players control" permission still has to cover. */
export function pendingSharedCreatures(state, slice, campaignId) {
  const record = recordOf(slice, campaignId);
  if (!record || !permissionAllowed(policyOf(slice, campaignId), "dmCreatures")) return [];
  return sharedCreatures(state, campaignId).filter((actor) => !(actor.id in record.creatureGrant));
}
export function shareNewCreatures(state, slice, campaignId) {
  const fresh = pendingSharedCreatures(state, slice, campaignId);
  if (fresh.length) syncCreatureControl(state, mutableRecord(slice, campaignId), true, campaignId);
  return fresh.map((actor) => actor.id);
}
export function setPermission(state, slice, campaignId, key, allowed, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  const permission = permissionOf(key);
  if (!permission) refuse("Permesso sconosciuto.", "Unknown permission.", "unknown-permission");
  if (typeof allowed !== "boolean") refuse("Valore non valido.", "Invalid value.", "invalid-value");
  const record = mutableRecord(slice, campaignId);
  const policy = policyOf(slice, campaignId);
  const current = permissionAllowed(policy, key);
  if (current === allowed)
    refuse("L’impostazione è già così.", "The setting is already so.", "same");
  policy[key] = allowed ? permission.on : permission.off;
  record.policy = policy;
  if (key === "dmCreatures") syncCreatureControl(state, record, allowed, campaignId);
  return history(
    record,
    {
      by: viewer,
      kind: "permission",
      key,
      from: current,
      to: allowed,
      reason: cleanReason(options.reason),
    },
    options.now ?? Date.now(),
  );
}

// ---------------------------------------------------------------- what players see (CA-71)

// One «Cosa vedono i giocatori» group (BG3 DC and passive-roll toggles, Fantasy Grounds
// health for public): enemy health and creature names are this area's policy; the chance to
// hit and the players' bestiary are the knowledge area's campaign settings (knowledge.mjs,
// census C9), written here in the same place it reads them, so there is one value each.
export const DISCLOSURE_SETTINGS = Object.freeze([
  Object.freeze({
    key: "hitChance",
    setting: "knowledge-policy.hit-chance",
    default: "never",
    label: L("Probabilità di colpire", "Chance to hit"),
    help: L(
      "Mostrata nell’anteprima dell’attacco dei giocatori, come in BG3. Rivela quanto è difficile colpire (la CA).",
      "Shown in the players’ attack preview, as in BG3. It reveals how hard a target is to hit (its AC).",
    ),
    options: Object.freeze([
      Object.freeze({ value: "never", label: L("Mai", "Never") }),
      Object.freeze({
        value: "known",
        label: L("Quando il gruppo conosce la CA", "When the party knows the AC"),
      }),
      Object.freeze({ value: "always", label: L("Sempre", "Always") }),
    ]),
  }),
  Object.freeze({
    key: "bestiary",
    setting: "knowledge-policy.mode",
    default: "graded",
    label: L("Schede dei mostri per i giocatori", "Monster entries for players"),
    help: L(
      "Graduato: i giocatori scoprono le statistiche con le prove, come in Solasta. Tutto: le vedono subito.",
      "Graded: players learn the statistics through checks, as in Solasta. Everything: they see them at once.",
    ),
    options: Object.freeze([
      Object.freeze({
        value: "graded",
        label: L("Si scoprono con le prove", "Learnt through checks"),
      }),
      Object.freeze({ value: "full", label: L("Tutto visibile", "Everything visible") }),
    ]),
  }),
]);
// R7 CA-71 (contract C1; BG3 shows the DC of a check, Fantasy Grounds can hide it; BG3's
// failed passive roll): two switches kept in this area's own policy, read by the roll
// engines (R1 combat.mjs dcShownTo, R2 chat-domain playerDisclosure). Defaults are today's
// behaviour: DCs shown, failed passives hidden.
export const DISCLOSURE_POLICY = Object.freeze([
  Object.freeze({
    key: "dc",
    default: "shown",
    label: L("CD dei tiri", "Roll DCs"),
    help: L(
      "Nascoste: nei tiri che chiedi tu i giocatori leggono «CD nascosta» con il successo o il fallimento, come la CD nascosta di Fantasy Grounds. Le CD scritte da chi tira e quelle delle regole (tiro contro la morte, concentrazione) restano visibili. Tu vedi sempre la CD.",
      "Hidden: in the rolls you ask for, players read “DC hidden” with the success or failure, like Fantasy Grounds’ hidden DC. DCs typed by the roller and the rules’ own (death save, concentration) stay visible. You always see the DC.",
    ),
    options: Object.freeze([
      Object.freeze({ value: "shown", label: L("Visibili", "Shown") }),
      Object.freeze({
        value: "hidden",
        label: L("Nascoste (si vede solo l’esito)", "Hidden (only the outcome shows)"),
      }),
    ]),
  }),
  Object.freeze({
    key: "passiveFailures",
    default: "hidden",
    label: L("Prove passive fallite", "Failed passive checks"),
    help: L(
      "Mostrate: quando la Percezione passiva di un personaggio non basta, chi lo gioca legge «Livia non nota nulla (Percezione passiva 11)» senza sapere cosa, come i tiri passivi falliti di BG3. Nascoste: non legge nulla.",
      "Shown: when a character’s passive Perception falls short, their player reads “Livia notices nothing (passive Perception 11)” without learning what, like BG3’s failed passive rolls. Hidden: they read nothing.",
    ),
    options: Object.freeze([
      Object.freeze({ value: "hidden", label: L("Nascoste", "Hidden") }),
      Object.freeze({ value: "shown", label: L("Mostrate ai giocatori", "Shown to players") }),
    ]),
  }),
]);
export const disclosureSetting = (key) =>
  DISCLOSURE_SETTINGS.find((row) => row.key === key) ??
  DISCLOSURE_POLICY.find((row) => row.key === key) ??
  null;
const inPolicy = (key) => DISCLOSURE_POLICY.some((row) => row.key === key);
/**
 * What players see, in one read (the «Cosa vedono i giocatori» contract for other areas):
 * enemy health, creature names, chance to hit, bestiary, roll DCs (`dc`: "shown" |
 * "hidden") and failed passive checks (`passiveFailures`: "hidden" | "shown").
 */
export function disclosureOf(state, campaignId = state?.campaign?.id) {
  const policy = policyOf(state?.ext?.[ID], campaignId);
  const bag = state?.ext?.[SETTINGS_SLICE]?.campaign ?? {};
  const out = {
    enemyHp: policy.enemyHp,
    creatureName: policy.creatureName,
    dc: policy.dc,
    passiveFailures: policy.passiveFailures,
  };
  for (const row of DISCLOSURE_SETTINGS)
    out[row.key] = row.options.some((option) => option.value === bag[row.setting])
      ? bag[row.setting]
      : row.default;
  return out;
}
export function setDisclosure(state, slice, campaignId, key, value, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  const row = disclosureSetting(key);
  if (!row) refuse("Impostazione sconosciuta.", "Unknown setting.", "unknown-setting");
  if (!row.options.some((option) => option.value === value))
    refuse("Valore non valido.", "Invalid value.", "invalid-value");
  if (inPolicy(key)) {
    const policy = policyOf(slice, campaignId);
    if (policy[key] === value)
      refuse("L’impostazione è già così.", "The setting is already so.", "same");
    const record = mutableRecord(slice, campaignId);
    const from = policy[key];
    policy[key] = value;
    record.policy = policy;
    return history(
      record,
      { by: viewer, kind: "disclosure", key, from, to: value, reason: cleanReason(options.reason) },
      options.now ?? Date.now(),
    );
  }
  const bag = state.ext?.[SETTINGS_SLICE]?.campaign;
  if (!isObject(bag))
    refuse(
      "Le impostazioni della campagna non sono disponibili.",
      "Campaign settings are unavailable.",
      "no-settings",
    );
  const current = disclosureOf(state, campaignId)[key];
  if (current === value) refuse("L’impostazione è già così.", "The setting is already so.", "same");
  bag[row.setting] = value;
  return history(
    mutableRecord(slice, campaignId),
    {
      by: viewer,
      kind: "disclosure",
      key,
      from: current,
      to: value,
      reason: cleanReason(options.reason),
    },
    options.now ?? Date.now(),
  );
}

// ---------------------------------------------------------------- scene defaults (CA-74)

const FOG = "fog-vision";
const FOG_DEFAULTS = Object.freeze({ vision: false, phase: "day" });
const PHASE_AMBIENT = Object.freeze({ day: "bright", dusk: "dim", night: "dark" });
/** A scene's current value for a default field (scene fields, or fog-and-vision options). */
function sceneValue(state, scene, key) {
  if (key === "vision" || key === "phase") {
    const cfg = state.ext?.[FOG]?.scenes?.[scene.id];
    return cfg?.[key] ?? FOG_DEFAULTS[key];
  }
  if (key === "gridVisible") return scene.gridVisible !== false;
  if (key === "gridSnap") return scene.gridSnap === true;
  return scene[key];
}
const fogLoaded = (state) => isObject(state.ext?.[FOG]);
const sceneKeys = (state) =>
  SCENE_DEFAULTS.map((row) => row.key).filter(
    (key) => fogLoaded(state) || (key !== "vision" && key !== "phase"),
  );
export function setSceneDefault(state, slice, campaignId, key, value, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  if (sceneDefaultValue(key, value) === undefined)
    refuse("Valore non valido.", "Invalid value.", "invalid-value");
  const record = mutableRecord(slice, campaignId);
  const policy = policyOf(slice, campaignId);
  const current = policy.sceneDefaults[key];
  if (current === value)
    refuse("Il predefinito è già questo.", "The default is already this.", "same");
  policy.sceneDefaults = { ...policy.sceneDefaults, [key]: value };
  record.policy = policy;
  // Roll20: a new default touches the pages made from now on; the existing ones change only
  // through "Apply to existing".
  record.consideredScenes = (state.scenes ?? []).map((scene) => scene.id);
  return history(
    record,
    { by: viewer, kind: "scene-default", key, from: current, to: value },
    options.now ?? Date.now(),
  );
}
export function setCreatureVisionDefault(state, slice, campaignId, value, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  if (typeof value !== "boolean") refuse("Valore non valido.", "Invalid value.", "invalid-value");
  const record = mutableRecord(slice, campaignId);
  const policy = policyOf(slice, campaignId);
  if (policy.creatureVision === value)
    refuse("Il predefinito è già questo.", "The default is already this.", "same");
  const current = policy.creatureVision;
  policy.creatureVision = value;
  record.policy = policy;
  record.consideredVision = dmCreatures(state).map((actor) => actor.id);
  return history(
    record,
    { by: viewer, kind: "scene-default", key: "creatureVision", from: current, to: value },
    options.now ?? Date.now(),
  );
}
const creatureSees = (state, actorId) => state.ext?.[FOG]?.tokens?.[actorId]?.vision === true;
/** What "Apply to existing" would change, with the impact count (Roll20 R20-087). */
export function previewSceneDefaults(state, slice, campaignId) {
  const defaults = policyOf(slice, campaignId).sceneDefaults;
  const keys = sceneKeys(state);
  const scenes = (state.scenes ?? [])
    .map((scene) => ({
      sceneId: scene.id,
      name: scene.name,
      fields: keys.filter((key) => sceneValue(state, scene, key) !== defaults[key]),
    }))
    .filter((row) => row.fields.length);
  const vision = policyOf(slice, campaignId).creatureVision;
  const creatures = fogLoaded(state)
    ? dmCreatures(state)
        .filter((actor) => creatureSees(state, actor.id) !== vision)
        .map((actor) => ({ actorId: actor.id, name: actor.name }))
    : [];
  return { scenes, creatures, count: scenes.length + creatures.length };
}
function writeScene(state, scene, defaults, keys) {
  for (const key of keys) {
    if (key === "vision" || key === "phase") {
      const bag = state.ext[FOG].scenes;
      const cfg = (bag[scene.id] ??= {
        fog: [],
        vision: false,
        phase: "day",
        ambient: "bright",
        updateOnDrop: false,
        lights: [],
      });
      if (key === "vision") cfg.vision = defaults.vision;
      else {
        cfg.phase = defaults.phase;
        cfg.ambient = PHASE_AMBIENT[defaults.phase];
        cfg.followTime = false;
      }
    } else scene[key] = defaults[key];
  }
}
function writeCreatureVision(state, actorId, value) {
  const tokens = state.ext[FOG].tokens;
  tokens[actorId] = { ...(tokens[actorId] ?? {}), vision: value };
}
/** Writes the scene and creature defaults on what already exists, in one commit. */
export function applySceneDefaults(
  state,
  slice,
  campaignId,
  viewer,
  { scenes = true, creatures = true } = {},
  options = {},
) {
  requireDm(state, campaignId, viewer);
  const preview = previewSceneDefaults(state, slice, campaignId);
  const policy = policyOf(slice, campaignId);
  const sceneRows = scenes ? preview.scenes : [];
  const creatureRows = creatures ? preview.creatures : [];
  if (!sceneRows.length && !creatureRows.length)
    refuse(
      "Niente da cambiare: scene e creature seguono già i predefiniti.",
      "Nothing to change: scenes and creatures already follow the defaults.",
      "same",
    );
  for (const row of sceneRows)
    writeScene(
      state,
      state.scenes.find((scene) => scene.id === row.sceneId),
      policy.sceneDefaults,
      row.fields,
    );
  for (const row of creatureRows) writeCreatureVision(state, row.actorId, policy.creatureVision);
  const record = mutableRecord(slice, campaignId);
  record.consideredScenes = [
    ...new Set([...(record.consideredScenes ?? []), ...(state.scenes ?? []).map((s) => s.id)]),
  ];
  return history(
    record,
    {
      by: viewer,
      kind: "apply-defaults",
      key: "sceneDefaults",
      from: null,
      to: null,
      count: sceneRows.length + creatureRows.length,
      scenes: sceneRows.length,
      creatures: creatureRows.length,
    },
    options.now ?? Date.now(),
  );
}
/** Scenes and creatures made after a default was set, which must follow it. */
export function pendingNewDefaults(state, slice, campaignId) {
  const record = recordOf(slice, campaignId);
  if (!record) return { scenes: [], creatures: [] };
  const scenes = Array.isArray(record.consideredScenes)
    ? (state.scenes ?? []).filter((scene) => !record.consideredScenes.includes(scene.id))
    : [];
  const creatures =
    Array.isArray(record.consideredVision) && fogLoaded(state)
      ? dmCreatures(state).filter((actor) => !record.consideredVision.includes(actor.id))
      : [];
  return { scenes, creatures };
}
export function followNewDefaults(state, slice, campaignId) {
  const { scenes, creatures } = pendingNewDefaults(state, slice, campaignId);
  const record = mutableRecord(slice, campaignId);
  const policy = policyOf(slice, campaignId);
  for (const scene of scenes) {
    writeScene(state, scene, policy.sceneDefaults, sceneKeys(state));
    record.consideredScenes.push(scene.id);
  }
  for (const actor of creatures) {
    writeCreatureVision(state, actor.id, policy.creatureVision);
    record.consideredVision.push(actor.id);
  }
  return { scenes: scenes.map((s) => s.id), creatures: creatures.map((a) => a.id) };
}

// ---------------------------------------------------------------- sections (Kanka modules)

export function setSectionHidden(
  state,
  slice,
  campaignId,
  sectionId,
  hidden,
  viewer,
  options = {},
) {
  requireDm(state, campaignId, viewer);
  if (typeof sectionId !== "string" || !SECTION_ID.test(sectionId))
    refuse("Sezione sconosciuta.", "Unknown section.", "unknown-section");
  if (PROTECTED_SECTIONS.includes(sectionId))
    refuse(
      "Questa sezione resta sempre attiva.",
      "This section always stays on.",
      "protected-section",
    );
  const record = mutableRecord(slice, campaignId);
  const policy = policyOf(slice, campaignId);
  const was = policy.hiddenSections.includes(sectionId);
  if (was === hidden)
    refuse(
      hidden ? "La sezione è già disattivata." : "La sezione è già attiva.",
      hidden ? "The section is already off." : "The section is already on.",
      "same",
    );
  policy.hiddenSections = hidden
    ? [...policy.hiddenSections, sectionId]
    : policy.hiddenSections.filter((id) => id !== sectionId);
  record.policy = policy;
  return history(
    record,
    {
      by: viewer,
      kind: "section",
      key: sectionId,
      from: !was,
      to: !hidden,
      reason: cleanReason(options.reason),
    },
    options.now ?? Date.now(),
  );
}
export const sectionHidden = (policy, sectionId) => policy.hiddenSections.includes(sectionId);

// ---------------------------------------------------------------- sources (R20-183)

export function sourceStates(state, policy) {
  const enabled = (state.campaign?.enabledContent ?? []).length;
  return [
    {
      id: "srd-5.2.1",
      name: L("SRD 5.2.1 · regole D&D 2024 (EN/IT)", "SRD 5.2.1 · D&D 2024 rules (EN/IT)"),
      status: "available",
      locked: L(
        "Base della campagna: fissata alla creazione.",
        "The campaign’s base: fixed at creation.",
      ),
    },
    {
      id: "campaign-homebrew",
      name: L(
        "Contenuti homebrew attivati nella campagna",
        "Homebrew content enabled in the campaign",
      ),
      status: enabled ? "shared" : "none",
      count: enabled,
      locked: null,
    },
    {
      id: "legacy-2014",
      name: L("Contenuti legacy 2014 (SRD 5.1)", "Legacy 2014 content (SRD 5.1)"),
      status: policy.legacySources === "available" ? "available" : "blocked",
      locked:
        policy.legacySources === "available"
          ? L(
              "Accanto alle 2024: il DM le ha attivate in Fonti. Le regole della campagna restano 2024 (SRD 5.2.1): una versione 2014 si sceglie in più, non sostituisce mai quella 2024.",
              "Beside the 2024 ones: the DM turned them on in Sources. The campaign’s rules stay 2024 (SRD 5.2.1): a 2014 version is an extra choice, it never replaces the 2024 one.",
            )
          : L(
              "La campagna usa le regole 2024 (SRD 5.2.1), fissate alla creazione: le regole 2014 non si mescolano e non sostituiscono quelle 2024. Il DM può metterle accanto alle 2024 in Fonti.",
              "The campaign uses the 2024 rules (SRD 5.2.1), fixed at creation: 2014 rules are not mixed in and never replace 2024 ones. The DM can put them beside the 2024 ones in Sources.",
            ),
    },
  ];
}
/**
 * R7 PG-53 (contract C4; D&D Beyond «Legacy content» source toggle, Roll20 Compendium
 * Selection): the DM puts the legacy 2014 versions (SRD 5.1) beside the 2024 ones. The
 * campaign's rules edition stays 2024 and locked; `sourceStates` then reads «available»
 * for `legacy-2014` (spells-plus legacyState, builder-plus legacyAccess, character-library).
 */
export function setLegacySources(state, slice, campaignId, on, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  if (typeof on !== "boolean") refuse("Valore non valido.", "Invalid value.", "invalid-value");
  const policy = policyOf(slice, campaignId);
  const current = policy.legacySources === "available";
  if (current === on) refuse("L’impostazione è già così.", "The setting is already so.", "same");
  const record = mutableRecord(slice, campaignId);
  policy.legacySources = on ? "available" : "blocked";
  record.policy = policy;
  return history(
    record,
    {
      by: viewer,
      kind: "source",
      key: "legacy-2014",
      from: current,
      to: on,
      reason: cleanReason(options.reason),
    },
    options.now ?? Date.now(),
  );
}

// P10 CA-73 (Roll20 Compendium Selection, one toggle per book; Kobold+ Sources): every
// homebrew content the DM can read, grouped by type, with its switch and the revision the
// campaign uses; an enabled revision the Library no longer holds reads «mancante» (CA-75).
export const HOMEBREW_TYPES = Object.freeze({
  class: L("Classi", "Classes"),
  subclass: L("Sottoclassi", "Subclasses"),
  species: L("Specie", "Species"),
  background: L("Background", "Backgrounds"),
  feat: L("Talenti", "Feats"),
  feature: L("Capacità", "Features"),
  spell: L("Incantesimi", "Spells"),
  item: L("Oggetti", "Items"),
  weapon: L("Armi", "Weapons"),
  armor: L("Armature", "Armor"),
  consumable: L("Consumabili", "Consumables"),
  creature: L("Creature", "Creatures"),
});
export function homebrewSources(state, viewer) {
  const enabled = Array.isArray(state.campaign?.enabledContent)
    ? state.campaign.enabledContent
    : [];
  const library = listHomebrew(state, viewer);
  const remembered = (state.ext?.["campaign-data"]?.missing?.[state.campaign?.id] ?? []).filter(
    (ref) => !enabled.some((row) => row.contentId === ref?.contentId),
  );
  const rows = library.map((content) => {
    const on = enabled.find((ref) => ref.contentId === content.id) ?? null;
    const at = on ? content.revisions.findIndex((r) => r.id === on.revisionId) : -1;
    return {
      contentId: content.id,
      name: copy(content.name),
      type: content.type,
      owner: content.owner,
      // Needed by the campaign (imported file) and now in the Library: one switch away.
      needed: !on && remembered.some((ref) => ref.contentId === content.id),
      status: !on ? "off" : at >= 0 ? "on" : "missing",
      enabledRef: on ? copy(on) : null,
      enabledNumber: at >= 0 ? at + 1 : null,
      latestRef: copy(content.latestRef),
      latestNumber: content.revisions.length,
      canEnable: Boolean(content.permissions?.canEnable),
    };
  });
  // P10 CA-75: references an imported campaign file needed that the Library lacked
  // (campaign-data's record), shown with the enabled ones the Library no longer holds.
  const missing = [...enabled, ...remembered]
    .filter((ref) => !library.some((content) => content.id === ref.contentId))
    .map((ref) => ({
      contentId: ref.contentId,
      name: null,
      type: null,
      owner: null,
      status: "missing",
      enabledRef: copy(ref),
      enabledNumber: null,
      latestRef: null,
      latestNumber: 0,
      canEnable: false,
    }));
  return [...rows, ...missing];
}
/** One source switch: the Library's own "enable in campaign" (homebrew.mjs). */
export function setHomebrewSource(state, contentId, on, viewer) {
  if (!isCampaignDm(state, state.campaign?.id, viewer))
    refuse(
      "Solo il DM della campagna può cambiare le fonti.",
      "Only the campaign’s DM can change the sources.",
      "dm-only",
    );
  const row = homebrewSources(state, viewer).find((entry) => entry.contentId === contentId);
  if (!row) refuse("Contenuto non trovato.", "Content not found.", "missing");
  if (on && row.status === "on") refuse("È già attivo.", "It is already on.", "same");
  if (!on && row.status === "off") refuse("È già spento.", "It is already off.", "same");
  const remembered = state.ext?.["campaign-data"]?.missing;
  if (on && remembered?.[state.campaign.id]) {
    remembered[state.campaign.id] = remembered[state.campaign.id].filter(
      (ref) => ref.contentId !== contentId,
    );
    if (!remembered[state.campaign.id].length) delete remembered[state.campaign.id];
  }
  if (on) {
    if (!row.latestRef) refuse("Contenuto non disponibile.", "Content unavailable.", "missing");
    state.campaign.enabledContent = (state.campaign.enabledContent ?? []).filter(
      (ref) => ref.contentId !== contentId,
    );
    enableHomebrewRevision(state, row.latestRef, { enabled: true }, viewer);
  } else
    state.campaign.enabledContent = (state.campaign.enabledContent ?? []).filter(
      (ref) => ref.contentId !== contentId,
    );
  return row;
}
/**
 * P10 CA-75 (BG3 mod verification, CRP-171): the adventures checker applied to a list of
 * homebrew references (a campaign's enabled content, a JSON import): per entry its state
 * (ready, disabled, missing, outdated) and the one action that fixes it. `campaignId` null
 * checks the Library only (a campaign not created yet).
 */
export function dependencyCheck(state, refs, campaignId, viewer) {
  const list = (Array.isArray(refs) ? refs : []).filter(
    (ref) => ref && typeof ref.contentId === "string" && typeof ref.revisionId === "string",
  );
  const library = listHomebrew(state, viewer);
  const version = {
    requires: list.map((ref) => ({
      contentId: ref.contentId,
      revisionId: ref.revisionId,
      name: library.find((content) => content.id === ref.contentId)?.name ?? null,
    })),
  };
  return requirementStatus(state, version, campaignId, viewer).map((row) => ({
    ...row,
    // The campaign file never carries the content: a missing entry is added from the
    // Library (import it there); an outdated one needs that exact revision.
    action: row.status === "disabled" ? "enable" : row.status === "ready" ? null : "library",
  }));
}

// ---------------------------------------------------------------- defaults (R20-087)

const onScene = (state, actorId) =>
  (state.scenes ?? []).filter((scene) => (scene.tokens ?? []).some((t) => t.actorId === actorId));
/** DM creatures (NPCs, not companions) that have a token on a scene of this campaign. */
export function dmCreatures(state) {
  return Object.values(state.actors ?? {}).filter(
    (actor) => actor?.kind === "npc" && !actor.companion && onScene(state, actor.id).length,
  );
}
export const nameHidden = (tokenSlice, actorId) => tokenSlice?.names?.[actorId]?.hidden === true;
/** What "Apply to existing" would change, with the impact count (Roll20 R20-087). */
export function previewCreatureDefaults(state, tokenSlice, value) {
  if (!CREATURE_NAME.some((option) => option.value === value))
    refuse("Valore non valido.", "Invalid value.", "invalid-value");
  const hide = value === "dm";
  const changes = dmCreatures(state)
    .filter((actor) => nameHidden(tokenSlice, actor.id) !== hide)
    .map((actor) => ({
      actorId: actor.id,
      name: hide ? actor.name : (tokenSlice?.names?.[actor.id]?.trueName ?? actor.name),
      sceneIds: onScene(state, actor.id).map((scene) => scene.id),
    }));
  return {
    value,
    changes,
    scenes: new Set(changes.flatMap((change) => change.sceneIds)).size,
  };
}
export function setCreatureNameDefault(state, slice, campaignId, value, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  if (!CREATURE_NAME.some((option) => option.value === value))
    refuse("Valore non valido.", "Invalid value.", "invalid-value");
  const record = mutableRecord(slice, campaignId);
  const current = policyOf(slice, campaignId).creatureName;
  if (current === value)
    refuse("Il predefinito è già questo.", "The default is already this.", "same");
  record.policy = { ...policyOf(slice, campaignId), creatureName: value };
  // Like Roll20, a new default touches only creatures added from now on: the ones already
  // on the scenes change only through "Apply to existing".
  record.considered = dmCreatures(state).map((actor) => actor.id);
  return history(
    record,
    { by: viewer, kind: "default", key: "creatureName", from: current, to: value },
    options.now ?? Date.now(),
  );
}
/**
 * Applies the name default to existing creatures through the token menu's own command
 * (`setNameHidden` from token-menu.mjs, passed in), in one atomic commit.
 */
export function applyCreatureDefaults(
  state,
  slice,
  tokenSlice,
  campaignId,
  viewer,
  setNameHidden,
  options = {},
) {
  requireDm(state, campaignId, viewer);
  if (!tokenSlice?.names)
    refuse(
      "Serve il menu della pedina per nascondere i nomi.",
      "The token menu is needed to hide names.",
      "token-menu",
    );
  const value = policyOf(slice, campaignId).creatureName;
  const preview = previewCreatureDefaults(state, tokenSlice, value);
  if (!preview.changes.length)
    refuse(
      "Nessuna creatura da cambiare: tutte seguono già il predefinito.",
      "No creature to change: they all follow the default already.",
      "same",
    );
  for (const change of preview.changes)
    setNameHidden(state, tokenSlice, change.actorId, value === "dm", viewer, options.lang ?? "it");
  const record = mutableRecord(slice, campaignId);
  record.considered = [
    ...new Set([...record.considered, ...preview.changes.map((change) => change.actorId)]),
  ];
  return history(
    record,
    {
      by: viewer,
      kind: "apply-defaults",
      key: "creatureName",
      from: null,
      to: value,
      count: preview.changes.length,
      scenes: preview.scenes,
    },
    options.now ?? Date.now(),
  );
}
/** New DM creatures the "DM only" default must still hide (added after the default). */
export function pendingNewCreatures(state, slice, tokenSlice, campaignId) {
  const record = recordOf(slice, campaignId);
  if (!record || policyOf(slice, campaignId).creatureName !== "dm" || !tokenSlice?.names) return [];
  return dmCreatures(state).filter(
    (actor) => !record.considered.includes(actor.id) && !nameHidden(tokenSlice, actor.id),
  );
}
export function hideNewCreatures(state, slice, tokenSlice, campaignId, setNameHidden, lang = "it") {
  const fresh = pendingNewCreatures(state, slice, tokenSlice, campaignId);
  const record = mutableRecord(slice, campaignId);
  for (const actor of fresh) {
    setNameHidden(state, tokenSlice, actor.id, true, "dm", lang);
    record.considered.push(actor.id);
  }
  return fresh.map((actor) => actor.id);
}

// ---------------------------------------------------------------- history corrections

const RESTORABLE = [
  "rule",
  "permission",
  "section",
  "default",
  "disclosure",
  "scene-default",
  "source",
];
// A permission row names a players' tool (older rows use its legacy key) or, since P10, a
// campaign permission (PERMISSIONS).
const keyOf = (entry) =>
  entry.kind === "permission" ? (toolOf(entry.key)?.key ?? entry.key) : entry.key;
function currentValue(state, slice, campaignId, entry) {
  const policy = policyOf(slice, campaignId);
  if (entry.kind === "permission")
    return permissionOf(entry.key)
      ? permissionAllowed(policy, entry.key)
      : playerToolAllowed(state, entry.key);
  if (entry.kind === "disclosure") return disclosureOf(state, campaignId)[entry.key];
  if (entry.kind === "scene-default")
    return entry.key === "creatureVision" ? policy.creatureVision : policy.sceneDefaults[entry.key];
  if (entry.kind === "section") return !policy.hiddenSections.includes(entry.key);
  if (entry.kind === "source") return policy.legacySources === "available";
  return policy[entry.key];
}
// Only the latest change of a value can be corrected (a preset counts for each rule it set).
function latestFor(slice, campaignId, entry) {
  const history = recordOf(slice, campaignId)?.history ?? [];
  for (let i = history.length - 1; i >= 0; i--) {
    const row = history[i];
    if (row.kind === entry.kind && keyOf(row) === keyOf(entry)) return row.id === entry.id;
    if (
      entry.kind === "rule" &&
      row.kind === "preset" &&
      (row.changes ?? []).some((c) => c.key === entry.key)
    )
      return false;
  }
  return false;
}
export function canRestore(slice, campaignId, entry, state = null) {
  if (!RESTORABLE.includes(entry?.kind) || entry.restoredBy) return false;
  const inSettings =
    (entry.kind === "permission" && !permissionOf(entry.key)) ||
    (entry.kind === "disclosure" && !inPolicy(entry.key));
  if (inSettings && !isObject(state?.ext?.[SETTINGS_SLICE]?.campaign)) return false;
  return (
    currentValue(state, slice, campaignId, entry) === entry.to &&
    latestFor(slice, campaignId, entry)
  );
}
/** Correction with a reason: puts back the value before a recorded change. */
export function restoreHistoryEntry(
  state,
  slice,
  campaignId,
  historyId,
  reason,
  viewer,
  options = {},
) {
  requireDm(state, campaignId, viewer);
  const why = cleanReason(reason);
  if (!why)
    refuse("Indica il motivo della correzione.", "Give the reason for the correction.", "reason");
  const record = mutableRecord(slice, campaignId);
  const entry = record.history.find((row) => row.id === historyId);
  if (!entry || !RESTORABLE.includes(entry.kind))
    refuse(
      "Questa voce non si può ripristinare.",
      "This entry cannot be restored.",
      "not-restorable",
    );
  if (entry.restoredBy)
    refuse("Questa modifica è già stata corretta.", "This change was already corrected.", "same");
  if (
    currentValue(state, slice, campaignId, entry) !== entry.to ||
    !latestFor(slice, campaignId, entry)
  )
    refuse(
      "Il valore è cambiato dopo: correggi l’ultima modifica.",
      "The value changed afterwards: correct the latest change.",
      "stale",
    );
  const now = options.now ?? Date.now();
  let row;
  if (entry.kind === "rule")
    row = setRule(state, slice, campaignId, entry.key, entry.from, viewer, { now, reason: why });
  else if (entry.kind === "permission")
    row = (permissionOf(entry.key) ? setPermission : setPlayerTool)(
      state,
      slice,
      campaignId,
      entry.key,
      entry.from,
      viewer,
      { now, reason: why },
    );
  else if (entry.kind === "disclosure")
    row = setDisclosure(state, slice, campaignId, entry.key, entry.from, viewer, {
      now,
      reason: why,
    });
  else if (entry.kind === "scene-default")
    row =
      entry.key === "creatureVision"
        ? setCreatureVisionDefault(state, slice, campaignId, entry.from, viewer, { now })
        : setSceneDefault(state, slice, campaignId, entry.key, entry.from, viewer, { now });
  else if (entry.kind === "section")
    row = setSectionHidden(state, slice, campaignId, entry.key, entry.from === false, viewer, {
      now,
      reason: why,
    });
  else if (entry.kind === "source")
    row = setLegacySources(state, slice, campaignId, entry.from === true, viewer, {
      now,
      reason: why,
    });
  else row = setCreatureNameDefault(state, slice, campaignId, entry.from, viewer, { now });
  row.reason = why;
  row.revertsId = entry.id;
  row.correction = true;
  entry.restoredBy = row.id;
  return row;
}

// ---------------------------------------------------------------- sheets (PG-94)

/** Player-owned characters of the campaign (the DM needs their authorization to edit). */
export function playerCharacters(state, campaignId) {
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor?.kind === "character" &&
      !actor.companion &&
      actor.owner &&
      actor.owner !== "dm" &&
      actor.visibility !== "private" &&
      isCampaignActor(actor, campaignId),
  );
}
/** The DM edits a player's sheet only while its owner allows it (default: allowed, I-043). */
export function dmMayEdit(policy, actor) {
  return !(actor && policy.dmSheetEdit[actor.id] === false);
}
export function sheetLockedFor(policy, actor, viewer) {
  return Boolean(
    actor && viewer === "dm" && actor.owner && actor.owner !== "dm" && !dmMayEdit(policy, actor),
  );
}
function ownedCharacter(state, actorId, viewer) {
  const actor = state.actors?.[actorId];
  if (!actor || actor.kind !== "character" || actor.owner !== viewer || viewer === "dm")
    refuse(
      "Solo chi possiede la scheda decide chi la modifica.",
      "Only the sheet’s owner decides who edits it.",
      "owner-only",
    );
  return actor;
}
export function setDmSheetEdit(state, slice, campaignId, actorId, allowed, viewer, options = {}) {
  const actor = ownedCharacter(state, actorId, viewer);
  const record = mutableRecord(slice, campaignId);
  const policy = policyOf(slice, campaignId);
  const current = dmMayEdit(policy, actor);
  if (current === allowed)
    refuse("L’autorizzazione è già così.", "The authorization is already so.", "same");
  if (allowed) delete policy.dmSheetEdit[actorId];
  else policy.dmSheetEdit[actorId] = false;
  record.policy = policy;
  const now = options.now ?? Date.now();
  for (const request of record.sheetRequests)
    if (request.actorId === actorId && request.status === "pending") {
      request.status = allowed ? "granted" : "declined";
      request.answeredAt = new Date(now).toISOString();
    }
  return history(
    record,
    { by: viewer, kind: "sheet", key: actorId, from: current, to: allowed, actorName: actor.name },
    now,
  );
}
export function requestSheetEdit(state, slice, campaignId, actorId, viewer, options = {}) {
  requireDm(state, campaignId, viewer);
  const actor = state.actors?.[actorId];
  const policy = policyOf(slice, campaignId);
  if (!actor || !playerCharacters(state, campaignId).includes(actor))
    refuse("Scheda non disponibile.", "Sheet unavailable.", "missing");
  if (dmMayEdit(policy, actor))
    refuse("Puoi già modificare questa scheda.", "You can already edit this sheet.", "same");
  const record = mutableRecord(slice, campaignId);
  if (record.sheetRequests.some((r) => r.actorId === actorId && r.status === "pending"))
    refuse(
      "Richiesta già inviata: attendi la risposta.",
      "Request already sent: wait for the answer.",
      "pending",
    );
  const now = options.now ?? Date.now();
  const request = {
    id: uid("sheet-request"),
    actorId,
    from: viewer,
    owner: actor.owner,
    at: new Date(now).toISOString(),
    status: "pending",
  };
  record.sheetRequests.push(request);
  history(record, { by: viewer, kind: "sheet-request", key: actorId, actorName: actor.name }, now);
  return request;
}
export function answerSheetRequest(
  state,
  slice,
  campaignId,
  requestId,
  grant,
  viewer,
  options = {},
) {
  const record = mutableRecord(slice, campaignId);
  const request = record.sheetRequests.find((r) => r.id === requestId && r.status === "pending");
  if (!request) refuse("Richiesta non più in attesa.", "Request no longer pending.", "missing");
  ownedCharacter(state, request.actorId, viewer);
  const now = options.now ?? Date.now();
  if (grant)
    return setDmSheetEdit(state, slice, campaignId, request.actorId, true, viewer, { now });
  request.status = "declined";
  request.answeredAt = new Date(now).toISOString();
  return history(
    record,
    {
      by: viewer,
      kind: "sheet-declined",
      key: request.actorId,
      actorName: state.actors[request.actorId]?.name,
    },
    now,
  );
}
export function pendingSheetRequests(slice, campaignId, viewer, state) {
  return (recordOf(slice, campaignId)?.sheetRequests ?? []).filter(
    (request) => request.status === "pending" && state.actors?.[request.actorId]?.owner === viewer,
  );
}
export function recordSheetTrace(state, slice, campaignId, trace, options = {}) {
  const record = mutableRecord(slice, campaignId);
  record.sheetTrace.push({
    id: uid("trace"),
    actorId: trace.actorId,
    logId: trace.logId ?? null,
    label: String(trace.label ?? "").slice(0, 200),
    kind: trace.kind === "correction" ? "correction" : "change",
    by: trace.by ?? "dm",
    authorized: trace.authorized !== false,
    at: new Date(options.now ?? Date.now()).toISOString(),
  });
  if (record.sheetTrace.length > 100) record.sheetTrace.splice(0, record.sheetTrace.length - 100);
}
export const sheetTraceOf = (slice, campaignId, actorId) =>
  (recordOf(slice, campaignId)?.sheetTrace ?? []).filter((row) => row.actorId === actorId);
// A sheet's data as its owner sees it change. Identity-private plans (`personalPlans`) are
// each identity's own notes and `lastCheck` is the result of a check roll (characters.mjs):
// neither is an edit of the sheet.
const NOT_EDITS = new Set(["personalPlans", "lastCheck"]);
const sheetPrint = (actor) =>
  JSON.stringify(actor ?? null, (key, value) => (NOT_EDITS.has(key) ? undefined : value));
/** Fingerprints of the campaign's player sheets, to tell which sheet a commit changed. */
export function sheetPrints(state, campaignId) {
  return Object.fromEntries(
    playerCharacters(state, campaignId).map((actor) => [actor.id, sheetPrint(actor)]),
  );
}
/** Player sheets whose data differs from the fingerprints taken before a commit. */
export function changedSheets(prints, state, campaignId) {
  return playerCharacters(state, campaignId).filter(
    (actor) => actor.id in prints && prints[actor.id] !== sheetPrint(actor),
  );
}

// ---------------------------------------------------------------- enemy health (R20-167)

/** Status words for a creature's health; "bloodied" is the SRD 5.2.1 glossary term. */
export function healthWord(actor) {
  const hp = Number(actor?.hp),
    max = Number(actor?.maxHp);
  if (!Number.isFinite(hp) || !Number.isFinite(max) || max <= 0) return null;
  if (hp <= 0) return "down";
  if (hp >= max) return "unhurt";
  return hp <= max / 2 ? "bloodied" : "wounded";
}
export const HEALTH_WORDS = Object.freeze({
  unhurt: L("Illeso", "Unhurt"),
  wounded: L("Ferito", "Wounded"),
  bloodied: L("Sanguinante", "Bloodied"),
  down: L("A 0 PF", "At 0 HP"),
});
/** Whether this creature's health follows the enemy policy for this viewer. */
export function isEnemyFor(state, actor, viewer) {
  return Boolean(
    actor && actor.kind === "npc" && !actor.companion && !canControlActor(actor, viewer, state),
  );
}
/** What a viewer reads about an enemy's health under the policy: null means nothing. */
export function enemyHealthFor(policy, actor, lang = "it") {
  if (policy.enemyHp === "hidden") return null;
  if (policy.enemyHp === "exact")
    return {
      mode: "exact",
      text: `${actor.hp}/${actor.maxHp} ${lang === "en" ? "HP" : "PF"}`,
      word: healthWord(actor),
    };
  const word = healthWord(actor);
  return word
    ? { mode: "words", word, text: HEALTH_WORDS[word][lang === "en" ? "en" : "it"] }
    : null;
}

// ---------------------------------------------------------------- assisted automation (C1)

/**
 * Assisted outcomes waiting for "Apply" that this viewer may apply: whoever controls the
 * target, the DM for their creatures (dnd5e applies damage through the target's owner,
 * FVT-138). `at` is the time of the last accepted roll of that attempt.
 */
export function readyApplications(state, viewer) {
  const rows = [];
  for (const attempt of state.combatAttempts ?? [])
    for (const outcome of attempt.outcomes ?? []) {
      const target = state.actors?.[outcome.actorId];
      if (outcome.status !== "ready" || !attempt.pendingApplications?.[outcome.actorId]) continue;
      if (!target || !canControlActor(target, viewer, state)) continue;
      const logged = [...(state.log ?? [])]
        .reverse()
        .find((entry) => (entry.rolls ?? []).some((roll) => roll.attemptId === attempt.id));
      rows.push({
        attemptId: attempt.id,
        actorId: outcome.actorId,
        targetName: target.name,
        sourceId: attempt.actorId ?? null,
        damage: outcome.damage ?? 0,
        at: logged?.time ?? null,
      });
    }
  return rows;
}

// ---------------------------------------------------------------- view as (Kanka SVC-040)

export function viewableMembers(state, campaignId, viewer) {
  if (!isCampaignDm(state, campaignId, viewer)) return [];
  return campaignMembers(state, campaignId)
    .filter((member) => member.id !== viewer && !["dm", "co-dm"].includes(member.role))
    .map((member) => ({
      ...copy(member),
      characters: playerCharacters(state, campaignId)
        .filter((actor) => actor.owner === member.id)
        .map((actor) => ({ id: actor.id, name: actor.name })),
    }));
}
/**
 * The campaign as a member sees it, for the DM who checks permissions. Only what both
 * can read appears (a participant preview is the intersection, not impersonation): the
 * member's own "Only me" content stays hidden, like Kanka's "self" entries.
 */
function viewAsMember(state, campaignId, memberId, viewer) {
  if (!isCampaignDm(state, campaignId, viewer))
    refuse("Solo il DM può vedere come un membro.", "Only the DM can view as a member.", "dm-only");
  const member = viewableMembers(state, campaignId, viewer).find((m) => m.id === memberId);
  if (!member) refuse("Membro non disponibile.", "Member unavailable.", "missing");
  return member;
}
/**
 * The campaign as a member sees it, for the DM who checks permissions (Kanka SVC-040, Roll20
 * player view). Only what both can read appears (a participant preview is the intersection,
 * not impersonation): the member's own "Only me" content stays hidden, like Kanka's "self"
 * entries. `options.lang` is the DM's display language; `options.nameOf(actor)` gives the
 * creature name the member reads (a hidden name stays an alias).
 */
export function projectViewAs(state, slice, campaignId, memberId, viewer, options = {}) {
  const member = viewAsMember(state, campaignId, memberId, viewer);
  const lang = options.lang === "en" ? "en" : "it";
  const nameOf = options.nameOf ?? ((actor) => actor.name);
  const policy = policyOf(slice, campaignId);
  const theirs = listCampaignEntries(state, { campaignId }, memberId);
  const mine = new Set(listCampaignEntries(state, { campaignId }, viewer).map((e) => e.id));
  const entries = theirs
    .filter((entry) => mine.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      title: entry.data?.title ?? "",
      excerpt: String(entry.data?.body ?? "").slice(0, 280),
      ownerId: entry.ownerId,
      updatedAt: entry.updatedAt ?? null,
    }));
  const readable = new Set(theirs.map((entry) => entry.id));
  const ownNotes = listCampaignEntries(state, {}, viewer).filter(
    (entry) => entry.ownerId === viewer && !readable.has(entry.id),
  );
  // A member's private personal sheet stays theirs: only sheets both can read are listed.
  const actors = Object.values(state.actors ?? {}).filter(
    (actor) => canViewActor(actor, memberId, state) && canViewActor(actor, viewer, state),
  );
  const privatePlans = Object.values(state.actors ?? {})
    .filter((actor) => String(actor.personalPlans?.[viewer] ?? "").trim())
    .map((actor) => ({ actorId: actor.id, name: actor.name }));
  const scene = (state.scenes ?? []).find((s) => s.id === state.activeSceneId);
  const enemies = (scene?.tokens ?? [])
    .map((token) => ({ token, actor: state.actors?.[token.actorId] }))
    .filter(
      ({ token, actor }) =>
        isEnemyFor(state, actor, memberId) &&
        !actor.hidden &&
        !token.hidden &&
        token.visible !== false,
    )
    .map(({ actor }) => ({
      actorId: actor.id,
      name: nameOf(actor),
      health: enemyHealthFor(policy, actor, lang),
    }));
  const sessions = listCampaignSessions(state, campaignId, memberId).map((session) => ({
    id: session.id,
    title: session.title ?? "",
    startsAt: session.startsAt ?? null,
    status: session.status ?? null,
  }));
  return {
    member,
    entries,
    sessions,
    hiddenFromMember: { ownNotes: ownNotes.length, privatePlans },
    characters: actors.map((actor) => ({
      id: actor.id,
      name: actor.name,
      kind: actor.kind,
      className: copy(actor.className ?? null),
      hp: actor.hp ?? null,
      maxHp: actor.maxHp ?? null,
      campaign: actor.kind === "character" && isCampaignActor(actor, campaignId),
      controlled: canControlActor(actor, memberId, state),
    })),
    enemies,
    tools: playerTools(state),
    enemyHp: policy.enemyHp,
  };
}
/** One entry as the member reads it, limited to the sections the DM can read too. */
export function viewAsEntry(state, campaignId, memberId, viewer, entryId) {
  viewAsMember(state, campaignId, memberId, viewer);
  let theirs, mine;
  try {
    theirs = getCampaignEntry(state, entryId, memberId);
    mine = getCampaignEntry(state, entryId, viewer);
  } catch {
    refuse(
      "Questa voce non è leggibile da entrambi.",
      "This entry is not readable by both of you.",
      "missing",
    );
  }
  if (theirs.campaignId !== campaignId)
    refuse("Voce di un’altra campagna.", "Entry of another campaign.", "missing");
  const shared = new Set((mine.data.sections ?? []).map((section) => section.id));
  return {
    id: theirs.id,
    kind: theirs.kind,
    title: theirs.data.title ?? "",
    body: theirs.data.body ?? "",
    updatedAt: theirs.updatedAt ?? null,
    sections: (theirs.data.sections ?? [])
      .filter((section) => shared.has(section.id))
      .map((section) => ({ id: section.id, title: section.title ?? "", body: section.body ?? "" })),
  };
}
