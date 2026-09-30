// B41 — Regions, traps and behaviours: the pure domain of state.ext.regions (no DOM).
//
// Patterns (docs/interview/CAPABILITY_CENSUS.md, #### B41): Foundry Scene Regions with
// behaviours (FVT-082: a shape, events enter / exit / turn start / turn end, visibility);
// the curated action list of Monk's Active Tile Triggers (FVT-084: an ordered list of
// actions, a probability, "deactivate after trigger"); dnd5e area behaviours (FVT-117:
// Difficult Terrain inside the area, effects on whoever enters); Roll20 Reactions (R20-098:
// one-shot with a manual "Reaction ready" reset, our «Riarma»); Stairways and Owlbear
// Portals (FVT-086, VTL-100: linked passages across scenes, a confirmation before the
// teleport); Fantasy Grounds global effects (R20-164: an effect on each creature as its
// turn starts). Rules: D&D 2024 SRD 5.2.1 (traps, Search, Thieves' Tools, Burning,
// Difficult Terrain). Outcomes go through the existing flows: saving throws and damage
// through the combat request queue (combat.mjs), conditions through conditions.mjs, doors
// through table-spatial.mjs. The DM sees every trigger first; players see consequences.
import { canControlActor, isActorAvailable } from "./character-access.mjs";
import { getEffectiveActor } from "./forms-companions.mjs";
import {
  applyConditionEvent,
  combatTurnKey,
  conditionSaveRules,
  getConditionMechanics,
  listConditionDefinitions,
} from "./conditions.mjs";
import { applyConditionFollowUps, knownEvidence, refreshConsequences } from "./combat.mjs";
import { correctDoor } from "./table-spatial.mjs";
import { classes as CLASSES } from "./character-rules.mjs";
import { giveItemToActor, itemFromCatalog } from "./party-stash.mjs";

export const ID = "regions";
export const ROLLS = "regions-rolls";
export const VERSION = 1;
export const CRYPT_SCENE_ID = "old-watch-crypt";
export const COURTYARD_SCENE_ID = "old-watch";

const text = (it, en) => ({ it, en });
const clone = (value) => (value === undefined ? undefined : structuredClone(value));
const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const uid = (prefix) => `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
const mod = (score) => Math.floor(((Number.isFinite(score) ? score : 10) - 10) / 2);
const round = (value) => Math.round(value * 10) / 10;
/** A refusal with its Italian and English text (shown as a refusal, not an area bug). */
export function fail(it, en, code = "refused") {
  throw Object.assign(new Error(en), { it, en, code });
}

// ---------------------------------------------------------------- sources

const EN_SHA = "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87";
const IT_SHA = "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718";
const EN_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf";
const srd = (title, en, it) =>
  Object.freeze({
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    title,
    sha256: EN_SHA,
    pages: en,
    url: EN_URL,
    en: { sha256: EN_SHA, pages: en },
    it: { sha256: IT_SHA, pages: it },
  });
export const SOURCES = Object.freeze({
  traps: srd("Traps (Parts of a Trap, Poisoned Darts)", [199, 200], [227, 228]),
  fallingNet: srd("Traps: Falling Net", [199], [229]),
  search: srd("Search [Action]", [187], [212]),
  thievesTools: srd("Thieves' Tools", [94], [106]),
  burning: srd("Burning [Hazard]", [178], [208]),
  difficultTerrain: srd("Difficult Terrain", [14, 181], [15, 217]),
  behaviours: Object.freeze({
    kind: "authored-demo",
    edition: "2024",
    revision: "b41-regions-v1",
    title: "Blueprint region behaviours (Foundry Regions and Monk's Active Tiles adaptation)",
  }),
});
// Review (B41-rf, F2): the sample traps and hazard are authored adaptations. Each names the
// SRD text it builds on (`basis`) and says what is not SRD: never an SRD citation of its own.
const adapted = (id, title, basis) =>
  Object.freeze({ kind: "authored-demo", edition: "2024", revision: `b41-${id}-v1`, title, basis });
export const SAMPLE_SOURCES = Object.freeze({
  plate: adapted(
    "pressure-plate",
    "Pressure plate of the B41 card (acceptance 1): the SRD pressure-plate trigger, DC 13 Dexterity save and DC 15 Perception; 2d6 Piercing and «once» come from the card, not the SRD",
    SOURCES.traps,
  ),
  net: adapted(
    "falling-net",
    "Falling Net: SRD DC 10 Dexterity save or Restrained and DC 11 Perception; the DC 10 Thieves' Tools disarm is a blueprint adaptation (the SRD lets a detected trip wire be cut or avoided with no check)",
    SOURCES.fallingNet,
  ),
  embers: adapted(
    "embers",
    "Burning embers: an authored hazard dealing the SRD Burning damage (1d4 Fire) at each turn start inside it; SRD Difficult Terrain inside",
    SOURCES.burning,
  ),
});

// ---------------------------------------------------------------- catalogs

export const ABILITIES = [
  ["str", "Forza", "Strength"],
  ["dex", "Destrezza", "Dexterity"],
  ["con", "Costituzione", "Constitution"],
  ["int", "Intelligenza", "Intelligence"],
  ["wis", "Saggezza", "Wisdom"],
  ["cha", "Carisma", "Charisma"],
];
export const DAMAGE_TYPES = [
  ["acid", "acido", "acid"],
  ["bludgeoning", "contundenti", "bludgeoning"],
  ["cold", "freddo", "cold"],
  ["fire", "fuoco", "fire"],
  ["force", "forza", "force"],
  ["lightning", "fulmine", "lightning"],
  ["necrotic", "necrotici", "necrotic"],
  ["piercing", "perforanti", "piercing"],
  ["poison", "veleno", "poison"],
  ["psychic", "psichici", "psychic"],
  ["radiant", "radiosi", "radiant"],
  ["slashing", "taglienti", "slashing"],
  ["thunder", "tuono", "thunder"],
];
export const KINDS = [
  ["trap", "Trappola", "Trap"],
  ["hazard", "Pericolo", "Hazard"],
  ["passage", "Passaggio", "Passage"],
  ["area", "Area", "Area"],
];
export const EVENTS = [
  ["enter", "Una creatura entra", "A creature enters"],
  ["exit", "Una creatura esce", "A creature exits"],
  ["turn-start", "Inizio del turno dentro l’area", "Turn starts inside"],
  ["turn-end", "Fine del turno dentro l’area", "Turn ends inside"],
];
export const WHO = [
  ["all", "Tutte le creature", "All creatures"],
  ["players", "Personaggi dei giocatori", "Player characters"],
  ["dm", "Creature del DM", "DM creatures"],
];
// The curated action list (Monk's Active Tiles, FVT-084), run in this order.
export const ACTION_TYPES = ["save", "damage", "condition", "door", "message", "teleport"];
export const DICE_SIDES = [4, 6, 8, 10, 12, 20];
export const conditionChoices = () =>
  listConditionDefinitions().filter((row) => row.id !== "exhaustion");
const labelOf = (rows, id) => {
  const row = rows.find((entry) => entry[0] === id);
  return row ? text(row[1], row[2]) : text(id, id);
};
export const abilityName = (id) => labelOf(ABILITIES, id);
export const damageTypeName = (id) => labelOf(DAMAGE_TYPES, id);
export const kindName = (id) => labelOf(KINDS, id);
export const eventName = (id) => labelOf(EVENTS, id);
export const conditionName = (id) =>
  conditionChoices().find((row) => row.id === id)?.name ?? text(id, id);

// ---------------------------------------------------------------- slice

// The event's source travels to the player's request card once run: it names the region by
// its public name only (review F5), never the DM's name for it.
const regionSource = (region) => ({
  kind: "authored-demo",
  edition: "2024",
  revision: `b41-region-${region.id}-r${region.revision ?? 1}`,
  title: region.publicName || region.name,
});
const emptyStatus = () => ({
  spent: false,
  disarmed: false,
  discovered: false,
  discoveredBy: null,
  revealed: false,
  triggers: 0,
  pendingEventId: null,
});
function makeRegion(input) {
  return {
    id: input.id,
    sceneId: input.sceneId,
    name: input.name,
    publicName: input.publicName || input.name,
    kind: input.kind ?? "area",
    shape: { ...input.shape },
    visibility: input.visibility ?? "hidden",
    difficult: input.difficult === true,
    trigger: {
      event: "enter",
      who: "all",
      chance: 100,
      once: false,
      stopMovement: false,
      ...(input.trigger ?? {}),
    },
    actions: clone(input.actions ?? []),
    trap: input.trap ? { detectDC: 15, disarmDC: 15, failTriggers: false, ...input.trap } : null,
    status: { ...emptyStatus(), ...(input.status ?? {}) },
    revision: input.revision ?? 1,
    source: input.source ?? clone(SOURCES.behaviours),
  };
}
// Library templates: reusable traps without scene links (PR-29).
const TEMPLATE_PLATE = {
  id: "trap-pressure-plate",
  name: "Lastra a pressione",
  publicName: "Lastra a pressione",
  kind: "trap",
  size: { width: 50, height: 60 },
  visibility: "hidden",
  difficult: false,
  trigger: { event: "enter", who: "all", chance: 100, once: true, stopMovement: true },
  actions: [
    {
      id: "save",
      type: "save",
      ability: "dex",
      dc: 13,
      dice: { count: 2, sides: 6, bonus: 0 },
      damageType: "piercing",
      onSuccess: "none",
      conditionId: null,
    },
  ],
  trap: { detectDC: 15, disarmDC: 15, failTriggers: false },
  source: SAMPLE_SOURCES.plate,
};
const TEMPLATE_NET = {
  id: "trap-falling-net",
  name: "Rete che cade",
  publicName: "Rete",
  kind: "trap",
  size: { width: 100, height: 100 },
  visibility: "hidden",
  difficult: false,
  trigger: { event: "enter", who: "all", chance: 100, once: true, stopMovement: true },
  actions: [
    {
      id: "save",
      type: "save",
      ability: "dex",
      dc: 10,
      dice: null,
      damageType: null,
      onSuccess: "none",
      conditionId: "restrained",
    },
  ],
  trap: { detectDC: 11, disarmDC: 10, failTriggers: false },
  source: SAMPLE_SOURCES.net,
};
const wall = (id, ax, ay, bx, by) => ({
  id,
  kind: "wall",
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  blocksMovement: true,
  blocksSight: true,
  blocksEffect: true,
  secret: false,
  source: { kind: "authored-demo", revision: "b41-crypt-v1", title: "Synthetic crypt walls" },
});
/** The crypt under the courtyard: the other end of the courtyard stairs (card check 5). */
export function cryptScene() {
  return {
    id: CRYPT_SCENE_ID,
    name: "La cripta sotto il cortile",
    description:
      "Cripta sotto il cortile dell’osservatorio. La scala arriva a nord-ovest; gli ossari corrono lungo le pareti.",
    publicDescription: "Una scala di pietra scende nel buio umido della cripta.",
    gridSize: 50,
    metersPerCell: 1.5,
    width: 1000,
    height: 650,
    gridVisible: true,
    gridSnap: false,
    background: null,
    revealed: true,
    template: "blank",
    tokens: [],
    walls: [
      wall("crypt-north", 40, 40, 960, 40),
      wall("crypt-east", 960, 40, 960, 610),
      wall("crypt-south", 960, 610, 40, 610),
      wall("crypt-west", 40, 610, 40, 40),
      wall("crypt-ossuary", 500, 40, 500, 330),
    ],
    terrain: [],
  };
}
/** Synthetic sample regions on the courtyard and in the crypt (coherent with the seed). */
export function sampleRegions() {
  return [
    makeRegion({
      ...clone(TEMPLATE_PLATE),
      id: "region-plate",
      sceneId: COURTYARD_SCENE_ID,
      shape: { x: 400, y: 350, width: 50, height: 60 },
    }),
    makeRegion({
      id: "region-embers",
      sceneId: COURTYARD_SCENE_ID,
      name: "Brace ardenti",
      publicName: "Brace ardenti",
      kind: "hazard",
      shape: { x: 200, y: 480, width: 100, height: 80 },
      visibility: "shared",
      difficult: true,
      trigger: { event: "turn-start", who: "all", chance: 100, once: false, stopMovement: false },
      actions: [
        { id: "burn", type: "damage", dice: { count: 1, sides: 4, bonus: 0 }, damageType: "fire" },
      ],
      source: clone(SAMPLE_SOURCES.embers),
    }),
    makeRegion({
      id: "region-stairs-down",
      sceneId: COURTYARD_SCENE_ID,
      name: "Scale per la cripta",
      publicName: "Scale per la cripta",
      kind: "passage",
      shape: { x: 860, y: 520, width: 80, height: 80 },
      visibility: "shared",
      trigger: { event: "enter", who: "all", chance: 100, once: false, stopMovement: true },
      actions: [{ id: "stairs", type: "teleport", targetRegionId: "region-stairs-up" }],
    }),
    makeRegion({
      id: "region-stairs-up",
      sceneId: CRYPT_SCENE_ID,
      name: "Scale per il cortile",
      publicName: "Scale per il cortile",
      kind: "passage",
      shape: { x: 80, y: 80, width: 80, height: 80 },
      visibility: "shared",
      trigger: { event: "enter", who: "all", chance: 100, once: false, stopMovement: true },
      actions: [{ id: "stairs", type: "teleport", targetRegionId: "region-stairs-down" }],
    }),
  ];
}
export const libraryTemplates = () => [clone(TEMPLATE_PLATE), clone(TEMPLATE_NET)];
/**
 * First load: the slice with its sample regions and reusable traps. The seed also adds the
 * crypt scene when absent and gives Mira a set of Thieves' Tools from the SRD catalog (the
 * party's way to disarm, card check 3); existing records are never changed otherwise.
 */
export function seedSlice(state) {
  if (state?.scenes && !state.scenes.some((scene) => scene.id === CRYPT_SCENE_ID))
    state.scenes.push(cryptScene());
  const mira = state?.actors?.mira;
  if (mira && !(mira.inventory ?? []).some((item) => item?.srdId === "srd2024:item:thieves-tools"))
    try {
      giveItemToActor(mira, itemFromCatalog("srd2024:item:thieves-tools"));
    } catch {
      /* catalog unavailable: disarming then asks for the tools */
    }
  const slice = {
    regions: sampleRegions().filter(
      (region) => !state?.scenes || state.scenes.some((scene) => scene.id === region.sceneId),
    ),
    events: [],
    checks: [],
    library: libraryTemplates(),
  };
  if (state?.scenes)
    for (const scene of state.scenes) syncTerrain({ ...state, ext: { [ID]: slice } }, scene.id);
  return slice;
}
export function normalizeSlice(slice, fromVersion) {
  if (fromVersion > VERSION) throw Error("Region data comes from a newer version");
  const list = (value) => (Array.isArray(value) ? value.filter(isObject) : []);
  return {
    regions: list(slice?.regions)
      .filter((r) => typeof r.id === "string" && isObject(r.shape))
      .map((r) => makeRegion(r)),
    events: list(slice?.events),
    checks: list(slice?.checks),
    library: list(slice?.library),
  };
}
export const seedRolls = () => ({ rolls: [] });
export const normalizeRolls = (slice) => ({
  rolls: Array.isArray(slice?.rolls) ? slice.rolls.filter(isObject) : [],
});
export const sliceOf = (state) => state?.ext?.[ID] ?? null;
export const rollsOf = (state) => state?.ext?.[ROLLS] ?? null;
const sceneOf = (state, id) => state.scenes?.find((scene) => scene.id === id) ?? null;
export const activeScene = (state) => sceneOf(state, state.activeSceneId);
const tokenOf = (scene, actorId) => scene?.tokens?.find((t) => t.actorId === actorId) ?? null;
export const regionOf = (state, id) => sliceOf(state)?.regions.find((r) => r.id === id) ?? null;
export const regionsIn = (state, sceneId) =>
  (sliceOf(state)?.regions ?? []).filter((r) => r.sceneId === sceneId);
const requireDM = (role) => {
  if (role !== "dm")
    fail("Solo il DM gestisce regioni e trappole.", "Only the DM manages regions and traps.");
};

// ---------------------------------------------------------------- geometry

const EPS = 0.01;
/** Center-point test, edges included (a token on the edge stands on the region). */
export const inside = (shape, p) =>
  !!p &&
  p.x >= shape.x - EPS &&
  p.x <= shape.x + shape.width + EPS &&
  p.y >= shape.y - EPS &&
  p.y <= shape.y + shape.height + EPS;
/** Liang–Barsky: the parameter interval [t0, t1] of a→b inside the rectangle, or null. */
export function clip(shape, a, b) {
  let t0 = 0,
    t1 = 1;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const edges = [
    [-dx, a.x - shape.x],
    [dx, shape.x + shape.width - a.x],
    [-dy, a.y - shape.y],
    [dy, shape.y + shape.height - a.y],
  ];
  for (const [p, q] of edges) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return null;
  }
  return [t0, t1];
}
/** Meters from a point to the nearest edge of a region (0 inside). */
export function metersTo(scene, shape, p) {
  const dx = Math.max(shape.x - p.x, 0, p.x - (shape.x + shape.width));
  const dy = Math.max(shape.y - p.y, 0, p.y - (shape.y + shape.height));
  return (Math.hypot(dx, dy) / scene.gridSize) * scene.metersPerCell;
}
export const center = (shape) => ({
  x: shape.x + shape.width / 2,
  y: shape.y + shape.height / 2,
});
/** The smallest region under a point (the one drawn on top). */
export function regionAt(regions, p) {
  return (
    regions
      .filter((r) => inside(r.shape, p))
      .sort((a, b) => a.shape.width * a.shape.height - b.shape.width * b.shape.height)[0] ?? null
  );
}

// ---------------------------------------------------------------- validation and editing

const clean = (value, max) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
function checkDice(dice, where = text("Danni", "Damage")) {
  if (
    !isObject(dice) ||
    !Number.isInteger(dice.count) ||
    dice.count < 1 ||
    dice.count > 20 ||
    !DICE_SIDES.includes(dice.sides) ||
    !Number.isInteger(dice.bonus ?? 0) ||
    Math.abs(dice.bonus ?? 0) > 20
  )
    fail(
      `${where.it}: indica da 1 a 20 dadi (d4–d20) e un bonus fra −20 e +20.`,
      `${where.en}: enter 1 to 20 dice (d4–d20) and a bonus from −20 to +20.`,
    );
}
/** Validates a region definition against its scene; returns a normalized copy or throws. */
export function validateRegion(state, input) {
  const scene = sceneOf(state, input.sceneId);
  if (!scene) fail("Scena non trovata.", "Scene not found.");
  const name = clean(input.name, 80);
  if (!name) fail("Dai un nome alla regione.", "Give the region a name.");
  const shape = {
    x: round(Number(input.shape?.x)),
    y: round(Number(input.shape?.y)),
    width: round(Number(input.shape?.width)),
    height: round(Number(input.shape?.height)),
  };
  if (
    ![shape.x, shape.y, shape.width, shape.height].every(Number.isFinite) ||
    shape.width < 10 ||
    shape.height < 10 ||
    shape.x < 0 ||
    shape.y < 0 ||
    shape.x + shape.width > scene.width + EPS ||
    shape.y + shape.height > scene.height + EPS
  )
    fail(
      "La regione deve stare dentro la scena e misurare almeno 10 × 10 pixel.",
      "The region must lie inside the scene and measure at least 10 × 10 pixels.",
    );
  if (!KINDS.some(([id]) => id === input.kind))
    fail("Tipo di regione non valido.", "Invalid kind.");
  if (!["hidden", "shared"].includes(input.visibility))
    fail("Visibilità non valida.", "Invalid visibility.");
  const trigger = input.trigger ?? {};
  if (!EVENTS.some(([id]) => id === trigger.event)) fail("Innesco non valido.", "Invalid trigger.");
  if (!WHO.some(([id]) => id === trigger.who))
    fail("Scegli chi fa scattare la regione.", "Choose who sets the region off.");
  if (!Number.isInteger(trigger.chance) || trigger.chance < 1 || trigger.chance > 100)
    fail("La probabilità va da 1 a 100%.", "Chance ranges from 1 to 100%.");
  const actions = Array.isArray(input.actions) ? input.actions : [];
  const types = actions.map((a) => a?.type);
  if (types.some((type) => !ACTION_TYPES.includes(type)) || new Set(types).size !== types.length)
    fail(
      "Ogni azione dell’elenco compare una volta sola.",
      "Each action of the list appears only once.",
    );
  const conditions = conditionChoices().map((row) => row.id);
  const out = [];
  for (const type of ACTION_TYPES) {
    const a = actions.find((entry) => entry.type === type);
    if (!a) continue;
    if (type === "save") {
      if (!ABILITIES.some(([id]) => id === a.ability))
        fail("Scegli la caratteristica del tiro salvezza.", "Choose the saving throw ability.");
      if (!Number.isInteger(a.dc) || a.dc < 1 || a.dc > 30)
        fail("La CD del tiro salvezza va da 1 a 30.", "The save DC ranges from 1 to 30.");
      if (a.dice) checkDice(a.dice, text("Tiro salvezza", "Saving throw"));
      if (a.dice && !DAMAGE_TYPES.some(([id]) => id === a.damageType))
        fail("Scegli il tipo di danno.", "Choose the damage type.");
      if (!["none", "half"].includes(a.onSuccess))
        fail("Indica l’effetto di un TS riuscito.", "Choose what a successful save does.");
      if (a.conditionId && !conditions.includes(a.conditionId))
        fail("Condizione non valida.", "Invalid condition.");
      if (!a.dice && !a.conditionId)
        fail(
          "Un tiro salvezza deve avere danni o una condizione.",
          "A saving throw needs damage or a condition.",
        );
      out.push({
        id: a.id || "save",
        type,
        ability: a.ability,
        dc: a.dc,
        dice: a.dice
          ? { count: a.dice.count, sides: a.dice.sides, bonus: a.dice.bonus ?? 0 }
          : null,
        damageType: a.dice ? a.damageType : null,
        onSuccess: a.onSuccess,
        conditionId: a.conditionId || null,
      });
    } else if (type === "damage") {
      checkDice(a.dice);
      if (!DAMAGE_TYPES.some(([id]) => id === a.damageType))
        fail("Scegli il tipo di danno.", "Choose the damage type.");
      out.push({
        id: a.id || "damage",
        type,
        dice: { count: a.dice.count, sides: a.dice.sides, bonus: a.dice.bonus ?? 0 },
        damageType: a.damageType,
      });
    } else if (type === "condition") {
      if (!conditions.includes(a.conditionId))
        fail("Scegli la condizione.", "Choose the condition.");
      out.push({ id: a.id || "condition", type, conditionId: a.conditionId });
    } else if (type === "door") {
      const door = (scene.walls ?? []).find((w) => w.id === a.doorId && w.kind === "door");
      if (!door) fail("Scegli una porta di questa scena.", "Choose a door of this scene.");
      if (!["open", "closed", "locked"].includes(a.doorState))
        fail("Stato della porta non valido.", "Invalid door state.");
      out.push({ id: a.id || "door", type, doorId: a.doorId, doorState: a.doorState });
    } else if (type === "message") {
      const message = clean(a.text, 500);
      if (!message) fail("Scrivi il messaggio.", "Write the message.");
      out.push({ id: a.id || "message", type, text: message });
    } else if (type === "teleport") {
      const target = regionOf(state, a.targetRegionId);
      if (!target || target.id === input.id)
        fail(
          "Scegli la regione d’arrivo (un’altra regione).",
          "Choose the arrival region (another region).",
        );
      if (!["enter", "exit"].includes(trigger.event))
        fail(
          "Le scale si prendono entrando o uscendo, non a inizio o fine turno.",
          "Stairs are taken on entering or exiting, not at turn start or end.",
        );
      out.push({ id: a.id || "teleport", type, targetRegionId: target.id });
    }
  }
  let trap = null;
  if (input.trap) {
    const detect = input.trap.detectDC,
      disarm = input.trap.disarmDC;
    if (detect !== null && (!Number.isInteger(detect) || detect < 1 || detect > 30))
      fail("La CD per individuarla va da 1 a 30.", "The detection DC ranges from 1 to 30.");
    if (disarm !== null && (!Number.isInteger(disarm) || disarm < 1 || disarm > 30))
      fail("La CD per disinnescarla va da 1 a 30.", "The disarm DC ranges from 1 to 30.");
    trap = { detectDC: detect, disarmDC: disarm, failTriggers: input.trap.failTriggers === true };
  }
  return {
    name,
    publicName: clean(input.publicName, 80) || name,
    kind: input.kind,
    shape,
    visibility: input.visibility,
    difficult: input.difficult === true,
    trigger: {
      event: trigger.event,
      who: trigger.who,
      chance: trigger.chance,
      once: trigger.once === true,
      stopMovement: trigger.event === "enter" && trigger.stopMovement === true,
    },
    actions: out,
    trap,
  };
}
/** Difficult Terrain of regions joins scene.terrain, so the core movement cost counts it. */
export function syncTerrain(state, sceneId) {
  const scene = sceneOf(state, sceneId);
  if (!scene) return;
  const own = (entry) => typeof entry?.regionId === "string";
  scene.terrain = [
    ...(scene.terrain ?? []).filter((entry) => !own(entry)),
    ...regionsIn(state, sceneId)
      .filter((region) => region.difficult)
      .map((region) => ({
        id: "region-terrain-" + region.id,
        kind: "difficult",
        x: region.shape.x,
        y: region.shape.y,
        width: region.shape.width,
        height: region.shape.height,
        regionId: region.id,
        source: {
          kind: "authored-demo",
          revision: `b41-region-${region.id}-r${region.revision}`,
          title: "Region difficult terrain (SRD 5.2.1 Difficult Terrain)",
        },
      })),
  ];
}
export function createRegion(state, input, role, id = uid("region")) {
  requireDM(role);
  const slice = sliceOf(state);
  const valid = validateRegion(state, { ...input, id });
  const region = makeRegion({ id, sceneId: input.sceneId, ...valid });
  slice.regions.push(region);
  syncTerrain(state, region.sceneId);
  return region;
}
export function updateRegion(state, regionId, input, role, expectedRevision) {
  requireDM(role);
  const region = regionOf(state, regionId);
  if (!region) fail("Regione non trovata.", "Region not found.");
  if (expectedRevision !== undefined && region.revision !== expectedRevision)
    fail(
      "La regione è cambiata nel frattempo: riaprila prima di salvare.",
      "The region changed meanwhile: reopen it before saving.",
      "stale",
    );
  const valid = validateRegion(state, { ...input, id: regionId, sceneId: region.sceneId });
  Object.assign(region, valid, { revision: region.revision + 1 });
  if (input.status) {
    if (typeof input.status.discovered === "boolean") {
      region.status.discovered = input.status.discovered;
      if (!input.status.discovered) region.status.discoveredBy = null;
    }
    if (typeof input.status.disarmed === "boolean") region.status.disarmed = input.status.disarmed;
  }
  syncTerrain(state, region.sceneId);
  return region;
}
export function moveRegion(state, regionId, shape, role) {
  const region = regionOf(state, regionId);
  if (!region) fail("Regione non trovata.", "Region not found.");
  const { status: _status, ...definition } = region;
  return updateRegion(state, regionId, { ...definition, shape }, role);
}
const awaiting = (event) =>
  ["awaiting-dm", "awaiting-roll", "awaiting-mover"].includes(event.status);
export function deleteRegion(state, regionId, role) {
  requireDM(role);
  const slice = sliceOf(state);
  const region = regionOf(state, regionId);
  if (!region) fail("Regione non trovata.", "Region not found.");
  if (slice.events.some((e) => e.regionId === regionId && awaiting(e)))
    fail(
      "La regione ha un evento in attesa: eseguilo o annullalo prima.",
      "The region has a pending event: run or cancel it first.",
    );
  const linked = slice.regions.find((r) =>
    r.actions.some((a) => a.type === "teleport" && a.targetRegionId === regionId),
  );
  if (linked)
    fail(
      `È l’arrivo delle scale «${linked.name}»: cambia prima quel passaggio.`,
      `It is where «${linked.name}» leads: change that passage first.`,
    );
  slice.regions = slice.regions.filter((r) => r.id !== regionId);
  syncTerrain(state, region.sceneId);
}
/** Roll20 "Reaction ready" (R20-098): a one-shot region can fire again. */
export function rearmRegion(state, regionId, role) {
  requireDM(role);
  const region = regionOf(state, regionId);
  if (!region) fail("Regione non trovata.", "Region not found.");
  const pending = sliceOf(state).events.some((e) => e.regionId === regionId && awaiting(e));
  if (pending)
    fail(
      "C’è ancora un evento in attesa per questa regione.",
      "An event is still pending for this region.",
    );
  region.status.spent = false;
  region.status.disarmed = false;
  region.status.pendingEventId = null;
  return region;
}

// ---------------------------------------------------------------- library (PR-29)

export function saveAsTemplate(state, regionId, role, id = uid("trap")) {
  requireDM(role);
  const region = regionOf(state, regionId);
  if (!region) fail("Regione non trovata.", "Region not found.");
  const template = {
    id,
    name: region.name,
    publicName: region.publicName,
    kind: region.kind,
    size: { width: region.shape.width, height: region.shape.height },
    visibility: region.visibility,
    difficult: region.difficult,
    trigger: clone(region.trigger),
    // Doors and passages belong to one scene: a reusable trap keeps the portable actions.
    actions: region.actions.filter((a) => !["door", "teleport"].includes(a.type)).map(clone),
    trap: clone(region.trap),
    source: clone(region.source),
  };
  sliceOf(state).library.push(template);
  return template;
}
export function placeTemplate(state, templateId, sceneId, point, role, id = uid("region")) {
  requireDM(role);
  const template = sliceOf(state).library.find((t) => t.id === templateId);
  const scene = sceneOf(state, sceneId);
  if (!template || !scene) fail("Trappola o scena non trovata.", "Trap or scene not found.");
  const width = Math.min(template.size.width, scene.width),
    height = Math.min(template.size.height, scene.height);
  const shape = {
    x: Math.max(0, Math.min(scene.width - width, point.x - width / 2)),
    y: Math.max(0, Math.min(scene.height - height, point.y - height / 2)),
    width,
    height,
  };
  const region = createRegion(
    state,
    {
      sceneId,
      name: template.name,
      publicName: template.publicName,
      kind: template.kind,
      shape,
      visibility: template.visibility,
      difficult: template.difficult,
      trigger: clone(template.trigger),
      actions: clone(template.actions),
      trap: clone(template.trap),
    },
    role,
    id,
  );
  region.source = clone(template.source);
  return region;
}
export function deleteTemplate(state, templateId, role) {
  requireDM(role);
  const slice = sliceOf(state);
  if (!slice.library.some((t) => t.id === templateId))
    fail("Trappola non trovata.", "Trap not found.");
  slice.library = slice.library.filter((t) => t.id !== templateId);
}

// ---------------------------------------------------------------- triggers

/** Whether the region can fire now (armed, not disarmed, no one-shot event waiting). */
export const isLive = (region) =>
  !region.status.disarmed &&
  !region.status.spent &&
  !(region.trigger.once && region.status.pendingEventId);
const matchesWho = (region, actor) =>
  region.trigger.who === "all" ||
  (region.trigger.who === "players" ? actor?.owner === "player" : actor?.owner !== "player");
// W2b2 integration (B47 scene archive × B41 passages): a region that is only a passage and
// whose every arrival lies on a scene no longer in the campaign's list (archived or deleted)
// leads nowhere: it neither stops the creature nor asks. Restoring the scene revives it.
const leadsNowhere = (state, region) => {
  const passages = region.actions.filter((a) => a.type === "teleport");
  return (
    passages.length > 0 &&
    region.actions.every((a) => ["teleport", "message"].includes(a.type)) &&
    passages.every((a) => {
      const target = regionOf(state, a.targetRegionId);
      return !target || !sceneOf(state, target.sceneId);
    })
  );
};
const needsAttempt = (actions) =>
  actions.some((a) => ["save", "damage", "condition"].includes(a.type));
function attemptFor(state, event, actor) {
  return {
    id: "region:" + event.id,
    actorId: actor.id,
    actorName: actor.name,
    actionId: "region-event",
    actionName: text("Evento della scena: decide il DM", "Scene event: the DM decides"),
    kind: "region",
    mode: null,
    status: "pending",
    requests: [],
    outcomes: [{ actorId: actor.id, name: actor.name, status: "pending" }],
    targets: [{ actorId: actor.id, knownToPlayer: true }],
    cost: {},
    source: clone(SOURCES.behaviours),
    damageType: null,
    turnKey: state.combat?.active ? combatTurnKey(state.combat) : null,
    selection: {
      targetIds: [],
      point: null,
      allocations: [],
      slotLevel: 1,
      hands: 1,
      rollMode: "normal",
      waypoints: [],
      geometryKey: null,
    },
    geometry: null,
    acceptedBy: null,
    region: { eventId: event.id, regionId: event.regionId, executed: false },
  };
}
/**
 * Records that `actorId` set the region off (`cause`: enter, exit, turn-start, turn-end or
 * disarm-failed). The event waits for the DM (a passage alone waits for the mover). When the
 * behaviours roll or change the creature, a pending attempt in the combat request queue
 * keeps the creature from moving on or ending its turn until the event is settled.
 */
export function triggerRegion(
  state,
  regionId,
  actorId,
  { cause, movementId = null, key = null } = {},
) {
  const slice = sliceOf(state);
  const region = regionOf(state, regionId);
  const actor = state.actors?.[actorId];
  if (!slice || !region || !actor) return null;
  const onlyPassage =
    region.actions.length > 0 &&
    region.actions.every((a) => ["teleport", "message"].includes(a.type)) &&
    region.actions.some((a) => a.type === "teleport");
  const event = {
    id: uid("rev"),
    regionId,
    sceneId: region.sceneId,
    actorId,
    cause,
    key,
    movementId,
    at: new Date().toISOString(),
    turnKey: state.combat?.active ? combatTurnKey(state.combat) : null,
    status: onlyPassage ? "awaiting-mover" : "awaiting-dm",
    plan: {
      name: region.name,
      publicName: region.publicName,
      kind: region.kind,
      visibility: region.visibility,
      trigger: clone(region.trigger),
      actions: clone(region.actions),
      revision: region.revision,
      source: regionSource(region),
    },
    attemptId: null,
    result: null,
  };
  if (onlyPassage && region.trigger.chance < 100) event.status = "awaiting-dm";
  if (needsAttempt(region.actions)) {
    const attempt = attemptFor(state, event, actor);
    (state.combatAttempts ||= []).push(attempt);
    event.attemptId = attempt.id;
  }
  slice.events.push(event);
  if (slice.events.length > 200) {
    const drop = slice.events.findIndex((e) => !awaiting(e));
    if (drop >= 0) slice.events.splice(drop, 1);
  }
  if (region.trigger.once) region.status.pendingEventId = event.id;
  return event;
}
/**
 * Movement observer (combat.mjs observeMovementStops): the first region edge on the segment
 * start→end that sets something off. An entry into a region with «Ferma il movimento» ends
 * the movement on the edge (Monk's "Stop token movement"); other entries and exits record
 * their event and the creature goes on. Each region fires once per movement.
 */
export function movementStop(state, { movement, start, end }) {
  const slice = sliceOf(state);
  const scene = activeScene(state);
  if (!slice || !scene || movement.sceneId !== scene.id) return null;
  const actor = state.actors?.[movement.actorId];
  if (!actor) return null;
  // Moving on declines a passage that was waiting for this creature's answer.
  for (const event of slice.events)
    if (
      event.status === "awaiting-mover" &&
      event.actorId === actor.id &&
      event.movementId !== movement.id
    ) {
      event.status = "expired";
      event.reason = text(
        "La creatura ha proseguito senza prendere il passaggio.",
        "The creature moved on without taking the passage.",
      );
    }
  const handled = movement.regionsHandled ?? [];
  let best = null;
  for (const region of regionsIn(state, scene.id)) {
    const { event } = region.trigger;
    if (!["enter", "exit"].includes(event) || !isLive(region) || !matchesWho(region, actor))
      continue;
    if (handled.includes(region.id + ":" + event)) continue;
    if (leadsNowhere(state, region)) continue;
    let fraction = null;
    if (event === "enter" && !inside(region.shape, start)) {
      const span = clip(region.shape, start, end);
      if (span && (span[1] - span[0] > 1e-9 || inside(region.shape, end))) fraction = span[0];
    } else if (event === "exit" && inside(region.shape, start) && !inside(region.shape, end)) {
      const span = clip(region.shape, start, end);
      fraction = span ? span[1] : 0;
    }
    if (fraction !== null && (!best || fraction < best.fraction)) best = { fraction, region };
  }
  if (!best) return null;
  const { region } = best;
  return {
    fraction: best.fraction,
    stop: region.trigger.event === "enter" && region.trigger.stopMovement,
    reason: { kind: "region" },
    apply(draft, mv) {
      (mv.regionsHandled ||= []).push(region.id + ":" + region.trigger.event);
      triggerRegion(draft, region.id, mv.actorId, {
        cause: region.trigger.event,
        movementId: mv.id,
      });
    },
  };
}
/** Turn observer (combat.mjs observeTurnPhases): hazards at the start or end of a turn. */
export function onTurnPhase(state, { actorId, phase, turnKey }) {
  const slice = sliceOf(state);
  const scene = activeScene(state);
  const actor = state.actors?.[actorId];
  const token = tokenOf(scene, actorId);
  if (!slice || !scene || !actor || !token || !isActorAvailable(actor)) return;
  for (const region of regionsIn(state, scene.id)) {
    if (region.trigger.event !== "turn-" + phase || !isLive(region) || !matchesWho(region, actor))
      continue;
    if (!inside(region.shape, token)) continue;
    const key = `${region.id}:${turnKey}:${phase}:${actorId}`;
    if (slice.events.some((e) => e.key === key)) continue;
    triggerRegion(state, region.id, actorId, { cause: "turn-" + phase, key });
  }
}

// ---------------------------------------------------------------- rolls (own checks)

/** Roll ids the snapshot slice still uses; any other roll was undone. */
function appliedRollIds(state) {
  const ids = new Set();
  const slice = sliceOf(state);
  for (const check of slice?.checks ?? []) if (check.rollId) ids.add(check.rollId);
  for (const event of slice?.events ?? []) if (event.chance?.rollId) ids.add(event.chance.rollId);
  return ids;
}
const validFace = (face, sides) => Number.isInteger(face) && face >= 1 && face <= sides;
/**
 * One accepted roll in the Undo-preserved roll slice. A digital retry of the same key after
 * an Undo reuses the faces the undone roll produced, once (I-229): Undo is never a way to
 * roll again for a better result. Physical faces are typed as rolled.
 */
function acceptRoll(state, { key, sides, count, mode, faces, rng, meta }) {
  const rolls = rollsOf(state);
  if (!rolls) fail("Registro dei tiri non disponibile.", "Roll record unavailable.");
  let values,
    reusedFrom = null;
  if (mode === "physical") {
    values = (faces ?? []).map(Number);
    if (values.length !== count || values.some((face) => !validFace(face, sides)))
      fail(
        `Inserisci ${count === 1 ? "la faccia" : `le ${count} facce`} del d${sides} fisico (da 1 a ${sides}).`,
        `Enter the physical d${sides} ${count === 1 ? "face" : `${count} faces`} (1 to ${sides}).`,
      );
  } else if (mode === "digital") {
    const applied = appliedRollIds(state);
    const withdrawn = rolls.rolls.find(
      (r) =>
        r.key === key &&
        r.mode === "digital" &&
        !r.reusedBy &&
        !applied.has(r.id) &&
        r.values.length === count &&
        r.sides === sides,
    );
    if (withdrawn) {
      values = [...withdrawn.values];
      reusedFrom = withdrawn.id;
    } else values = Array.from({ length: count }, () => rng(sides));
  } else fail("Scegli dadi digitali o fisici.", "Choose digital or physical dice.");
  const roll = {
    id: uid("roll"),
    key,
    sides,
    count,
    mode,
    values,
    reusedFrom,
    reusedBy: null,
    corrections: [],
    at: new Date().toISOString(),
    ...meta,
  };
  if (reusedFrom) rolls.rolls.find((r) => r.id === reusedFrom).reusedBy = roll.id;
  rolls.rolls.push(roll);
  if (rolls.rolls.length > 300) rolls.rolls.splice(0, rolls.rolls.length - 300);
  return roll;
}
const d20 = (values, rollMode) =>
  rollMode === "advantage"
    ? Math.max(...values)
    : rollMode === "disadvantage"
      ? Math.min(...values)
      : values[0];
const proficiency = (actor) =>
  actor?.proficiencyBonus ??
  actor?.combatProfile?.proficiencyBonus ??
  2 + Math.floor((Math.max(1, actor?.level ?? 1) - 1) / 4);
/** Saving throw bonus and d20 mode with the conditions that change it (as the combat queue). */
export function saveProfile(state, actorId, ability) {
  const raw = state.actors?.[actorId];
  const actor = getEffectiveActor(raw);
  if (!actor) fail("Creatura non disponibile.", "Creature unavailable.");
  let bonus;
  if (Number.isFinite(actor.savingThrows?.[ability])) bonus = actor.savingThrows[ability];
  else {
    const first = actor.buildSeed?.levelOrder?.[0] ?? actor.buildSeed?.classes?.[0]?.classId;
    const proficient = CLASSES.find((row) => row.id === first)?.savingThrows?.includes(ability);
    bonus = mod(actor.abilities?.[ability]) + (proficient ? proficiency(actor) : 0);
  }
  const rules = conditionSaveRules(raw, ability);
  const adv = rules.advantage.length > 0,
    dis = rules.disadvantage.length > 0;
  return {
    bonus: bonus + rules.modifier,
    rollMode: adv === dis ? "normal" : adv ? "advantage" : "disadvantage",
    autoFail: rules.autoFail,
    autoFailReasons: clone(rules.autoFailReasons),
    modifierSources: clone(rules.modifierSources),
  };
}
/** Ability check bonus: Wisdom (Perception) or a Dexterity check with Thieves' Tools. */
export function checkProfile(state, actorId, kind) {
  const raw = state.actors?.[actorId];
  const actor = getEffectiveActor(raw);
  if (!actor) fail("Creatura non disponibile.", "Creature unavailable.");
  let bonus;
  if (kind === "search") {
    bonus = Number.isFinite(actor.skillModifiers?.perception)
      ? actor.skillModifiers.perception
      : mod(actor.abilities?.wis) +
        ((actor.skills ?? []).includes("perception") ? proficiency(actor) : 0);
  } else if (kind === "force") {
    // PR-20: forcing a locked door is a Strength (Athletics) check.
    bonus = Number.isFinite(actor.skillModifiers?.athletics)
      ? actor.skillModifiers.athletics
      : mod(actor.abilities?.str) +
        ((actor.skills ?? []).includes("athletics") ? proficiency(actor) : 0);
  } else {
    const tools = [
      ...(actor.toolProficiencies ?? []),
      ...(actor.combatProfile?.toolProficiencies ?? []),
    ];
    bonus = mod(actor.abilities?.dex) + (tools.includes("thieves-tools") ? proficiency(actor) : 0);
  }
  const mech = raw ? getConditionMechanics(raw) : null;
  const disadvantage = (mech?.checkDisadvantage ?? []).filter((r) => !r.requires);
  const penalty = mech?.d20Penalty ?? 0;
  return {
    bonus: bonus - penalty,
    rollMode: disadvantage.length ? "disadvantage" : "normal",
    reasons: disadvantage.map((r) => r.name).filter(Boolean),
  };
}
export const hasThievesTools = (actor) =>
  (actor?.inventory ?? []).some(
    (item) =>
      item?.srdId === "srd2024:item:thieves-tools" ||
      /thieves|scasso/i.test(
        typeof item?.name === "string" ? item.name : `${item?.name?.it} ${item?.name?.en}`,
      ),
  );
const actsNow = (state, actorId) =>
  !state.combat?.active || state.combat.order?.[state.combat.turn] === actorId;
function requireActing(state, actor, role, verb) {
  if (!actor || !isActorAvailable(actor) || !canControlActor(actor, role, state))
    fail("Non controlli questa creatura.", "You do not control this creature.");
  if (actor.dead || actor.hp === 0)
    fail("La creatura non può agire ora.", "The creature cannot act now.");
  if (!actsNow(state, actor.id))
    fail(`Puoi ${verb.it} nel tuo turno.`, `You can ${verb.en} on your turn.`);
  if (state.combat?.active && !actor.action)
    fail("L’azione di questo turno è già spesa.", "This turn’s action is already spent.");
}
export const SEARCH_METERS = 3;
export const REACH_METERS = 1.5;
/** Hidden traps a search by this creature examines (within 3 m of its token). */
export function searchable(state, actorId) {
  const scene = activeScene(state);
  const token = tokenOf(scene, actorId);
  if (!token) return [];
  return regionsIn(state, scene.id).filter(
    (r) =>
      r.trap &&
      !r.status.discovered &&
      !r.status.disarmed &&
      metersTo(scene, r.shape, token) <= SEARCH_METERS,
  );
}
/** Discovered, armed traps within reach (1.5 m) that this creature may try to disarm. */
export function disarmable(state, actorId) {
  const scene = activeScene(state);
  const token = tokenOf(scene, actorId);
  if (!token) return [];
  return regionsIn(state, scene.id).filter(
    (r) =>
      r.trap &&
      r.trap.disarmDC !== null &&
      r.status.discovered &&
      !r.status.disarmed &&
      !r.status.spent &&
      metersTo(scene, r.shape, token) <= REACH_METERS,
  );
}
/**
 * The Search action (SRD 2024): a Wisdom (Perception) check against each hidden trap within
 * 3 m; each one met is discovered and marked for the whole party. In combat it takes the
 * action. The result never says whether a trap was there when nothing is found.
 */
export function searchForTraps(state, { actorId, mode, faces, rng }, role) {
  const actor = state.actors?.[actorId];
  requireActing(state, actor, role, text("cercare", "search"));
  const scene = activeScene(state);
  if (!tokenOf(scene, actorId))
    fail("La creatura non è su questa scena.", "The creature is not on this scene.");
  const profile = checkProfile(state, actorId, "search");
  const count = profile.rollMode === "normal" ? 1 : 2;
  const turn = state.combat?.active ? combatTurnKey(state.combat) : "free";
  const roll = acceptRoll(state, {
    key: `search:${actorId}:${scene.id}:${turn}`,
    sides: 20,
    count,
    mode,
    faces,
    rng,
    meta: {
      kind: "search",
      actorId,
      by: role,
      modifier: profile.bonus,
      rollMode: profile.rollMode,
    },
  });
  roll.natural = d20(roll.values, profile.rollMode);
  roll.total = roll.natural + profile.bonus;
  const examined = searchable(state, actorId);
  const found = examined.filter((r) => roll.total >= (r.trap.detectDC ?? 99));
  for (const region of found)
    Object.assign(region.status, { discovered: true, discoveredBy: actorId });
  if (state.combat?.active) actor.action = false;
  const check = {
    id: uid("check"),
    kind: "search",
    actorId,
    sceneId: scene.id,
    rollId: roll.id,
    mode,
    natural: roll.natural,
    modifier: profile.bonus,
    rollMode: profile.rollMode,
    total: roll.total,
    examined: examined.map((r) => r.id),
    found: found.map((r) => r.id),
    by: role,
    at: roll.at,
    source: clone(SOURCES.search),
  };
  sliceOf(state).checks.push(check);
  return check;
}
/**
 * B62 — one Search action. SRD 5.2.1 "Search [Action]" (EN 187 / IT 212) is one Wisdom check,
 * Wisdom (Perception) for a concealed creature or object: the Table's single «Cerca» rolls it
 * once (B46's knowledge domain finds the hidden creatures and spends the action) and hands the
 * accepted roll here, where the hidden traps within 3 m are compared with the same total. No
 * second roll and no second action; the trap check keeps a copy of those faces in this area's
 * ledger (`sharedFrom`), so its history and physical-face correction work as before.
 * Returns the check, or null when this area's data is absent.
 */
export function searchForTrapsWithRoll(state, { actorId, roll }, role) {
  if (!sliceOf(state) || !rollsOf(state)) return null;
  const actor = state.actors?.[actorId];
  if (!actor || !isActorAvailable(actor) || !canControlActor(actor, role, state))
    fail("Non controlli questa creatura.", "You do not control this creature.");
  const scene = activeScene(state);
  if (!tokenOf(scene, actorId))
    fail("La creatura non è su questa scena.", "The creature is not on this scene.");
  const values = (roll?.values ?? []).map(Number);
  if (!values.length || values.some((face) => !validFace(face, 20)) || !Number.isFinite(roll.total))
    fail("Tiro di ricerca non valido.", "Invalid search roll.");
  const rollMode = roll.rollMode ?? "normal";
  const copy = {
    id: uid("roll"),
    key: `search:${actorId}:${scene.id}:shared:${roll.id}`,
    sides: 20,
    count: values.length,
    mode: roll.mode === "physical" ? "physical" : "digital",
    values,
    reusedFrom: null,
    reusedBy: null,
    corrections: [],
    at: new Date().toISOString(),
    kind: "search",
    actorId,
    by: role,
    modifier: roll.modifier ?? 0,
    rollMode,
    sharedFrom: roll.id ?? null,
    natural: d20(values, rollMode),
    total: roll.total,
  };
  const rolls = rollsOf(state);
  rolls.rolls.push(copy);
  if (rolls.rolls.length > 300) rolls.rolls.splice(0, rolls.rolls.length - 300);
  const examined = searchable(state, actorId);
  const found = examined.filter((r) => copy.total >= (r.trap.detectDC ?? 99));
  for (const region of found)
    Object.assign(region.status, { discovered: true, discoveredBy: actorId });
  const check = {
    id: uid("check"),
    kind: "search",
    actorId,
    sceneId: scene.id,
    rollId: copy.id,
    mode: copy.mode,
    natural: copy.natural,
    modifier: copy.modifier,
    rollMode,
    total: copy.total,
    examined: examined.map((r) => r.id),
    found: found.map((r) => r.id),
    by: role,
    at: copy.at,
    sharedFrom: copy.sharedFrom,
    source: clone(SOURCES.search),
  };
  sliceOf(state).checks.push(check);
  return check;
}
/**
 * Disarming with Thieves' Tools (SRD 2024 Utilize: disarm a trap, DC 15 by default): a
 * Dexterity check, adding proficiency with the tools. Success disarms the trap; a failure
 * sets it off only when the region says so. In combat it takes the action.
 */
export function disarmTrap(state, { actorId, regionId, mode, faces, rng }, role) {
  const actor = state.actors?.[actorId];
  requireActing(state, actor, role, text("disinnescare", "disarm"));
  const region = regionOf(state, regionId);
  if (!region || !disarmable(state, actorId).some((r) => r.id === regionId))
    fail(
      "Avvicinati entro 1,5 m a una trappola individuata e ancora armata.",
      "Move within 1.5 m of a discovered, still armed trap.",
    );
  if (!hasThievesTools(actor))
    fail(
      "Servono gli Arnesi da scasso nell’inventario di questa creatura.",
      "This creature needs Thieves’ Tools in its inventory.",
    );
  const profile = checkProfile(state, actorId, "disarm");
  const count = profile.rollMode === "normal" ? 1 : 2;
  const turn = state.combat?.active ? combatTurnKey(state.combat) : "free";
  const roll = acceptRoll(state, {
    key: `disarm:${actorId}:${regionId}:${turn}`,
    sides: 20,
    count,
    mode,
    faces,
    rng,
    meta: {
      kind: "disarm",
      actorId,
      by: role,
      modifier: profile.bonus,
      rollMode: profile.rollMode,
    },
  });
  roll.natural = d20(roll.values, profile.rollMode);
  roll.total = roll.natural + profile.bonus;
  const success = roll.total >= region.trap.disarmDC;
  if (state.combat?.active) actor.action = false;
  let triggered = null;
  if (success) region.status.disarmed = true;
  else if (region.trap.failTriggers && isLive(region))
    triggered = triggerRegion(state, regionId, actorId, { cause: "disarm-failed" })?.id ?? null;
  const check = {
    id: uid("check"),
    kind: "disarm",
    actorId,
    regionId,
    sceneId: region.sceneId,
    rollId: roll.id,
    mode,
    natural: roll.natural,
    modifier: profile.bonus,
    rollMode: profile.rollMode,
    total: roll.total,
    dc: region.trap.disarmDC,
    success,
    triggered,
    by: role,
    at: roll.at,
    source: clone(SOURCES.thievesTools),
  };
  sliceOf(state).checks.push(check);
  return check;
}
// ---------------------------------------------------------------- PR-31: scene conditions
// Fantasy Grounds global effects: a condition of the whole scene (a blizzard, toxic fumes)
// is a hazard covering the map, run at the start of each creature's turn inside it (the
// region trigger «Inizio del turno dentro l'area»). The presets are authored examples, not
// SRD rules; «custom» leaves the actions to the DM.
export const SCENE_CONDITIONS = Object.freeze([
  [
    "blizzard",
    text("Bufera", "Blizzard"),
    text("1d4 danni da freddo a ogni creatura all’inizio del suo turno.", "1d4 cold damage to each creature at the start of its turn."),
    [{ type: "damage", dice: { count: 1, sides: 4, bonus: 0 }, damageType: "cold" }],
  ],
  [
    "fumes",
    text("Fumi tossici", "Toxic fumes"),
    text("Tiro salvezza su Costituzione CD 12 all’inizio del turno: 1d6 danni da veleno, metà se riesce.", "Constitution saving throw DC 12 at the start of the turn: 1d6 poison damage, half on a success."),
    [
      {
        type: "save",
        ability: "con",
        dc: 12,
        dice: { count: 1, sides: 6, bonus: 0 },
        damageType: "poison",
        onSuccess: "half",
      },
    ],
  ],
  [
    "custom",
    text("Su misura", "Custom"),
    text("Scegli tu tiro salvezza, danni, condizione o messaggio.", "You choose the saving throw, damage, condition or message."),
    [],
  ],
]);
/** The region input of a scene condition: the whole map, turn start, everyone, shared. */
export function sceneConditionInput(scene, presetId, lang = "it") {
  const preset = SCENE_CONDITIONS.find(([id]) => id === presetId);
  if (!preset) fail("Condizione della scena sconosciuta.", "Unknown scene condition.");
  const [, name, summary, actions] = preset;
  return {
    sceneId: scene.id,
    name: `${lang === "en" ? "Scene condition" : "Condizione della scena"}: ${name[lang] ?? name.it}`,
    publicName: name[lang] ?? name.it,
    kind: "hazard",
    shape: { x: 0, y: 0, width: scene.width, height: scene.height },
    visibility: "shared",
    difficult: false,
    trigger: { event: "turn-start", who: "all", chance: 100, once: false, stopMovement: false },
    actions: clone(actions),
    trap: null,
    note: summary[lang] ?? summary.it,
  };
}

// ---------------------------------------------------------------- PR-20: locked doors
// BG3/DOS2 locks: a door locked in the scene editor may carry `lock` {dc, check, key, cost}.
// SRD 5.2.1 Thieves' Tools (Utilize: pick a lock) is a Dexterity check with the tools; forcing
// is a Strength (Athletics) check; the named key opens it without a roll.
const fold = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
const itemName = (item) =>
  typeof item?.name === "string" ? item.name : `${item?.name?.it ?? ""} ${item?.name?.en ?? ""}`;
/** Whether the creature carries the key the lock names. */
export function hasKeyFor(actor, key) {
  const wanted = fold(key);
  if (!wanted) return false;
  return (actor?.inventory ?? []).some((item) =>
    [item?.name?.it, item?.name?.en, typeof item?.name === "string" ? item.name : null]
      .filter(Boolean)
      .some((name) => fold(name) === wanted),
  );
}
function metersToSegment(scene, wall, p) {
  const { a, b } = wall;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  return (d / scene.gridSize) * scene.metersPerCell;
}
/** Locked doors within reach of the creature's token (a player never gets a secret one). */
export function lockedDoorsNear(state, actorId, role = "player") {
  const scene = activeScene(state);
  const token = tokenOf(scene, actorId);
  const actor = state.actors?.[actorId];
  if (!token) return [];
  return (scene.walls ?? [])
    .filter(
      (w) =>
        w.kind === "door" &&
        w.doorState === "locked" &&
        (role === "dm" || !w.secret) &&
        metersToSegment(scene, w, token) <=
          Math.max(REACH_METERS, Number(w.interactionRangeMeters) || 0) + 0.01,
    )
    .map((door) => ({
      door,
      lock: door.lock ?? null,
      hasKey: Boolean(door.lock?.key) && hasKeyFor(actor, door.lock.key),
    }));
}
const LOCK_METHODS = ["key", "lockpick", "force"];
const lockProfile = (state, actorId, method) =>
  checkProfile(state, actorId, method === "lockpick" ? "disarm" : "force");
/**
 * Opens a locked door: with its key (no roll), by picking the lock (Thieves' Tools) or by
 * force (Strength (Athletics)). Success leaves the door closed and unlocked; the attempt
 * costs what the lock says, in combat.
 */
export function openLock(state, { actorId, doorId, method, mode, faces, rng }, role) {
  const actor = state.actors?.[actorId];
  if (!actor || !isActorAvailable(actor) || !canControlActor(actor, role, state))
    fail("Non controlli questa creatura.", "You do not control this creature.");
  if (actor.dead || actor.hp === 0)
    fail("La creatura non può agire ora.", "The creature cannot act now.");
  if (!actsNow(state, actor.id))
    fail("Puoi farlo nel tuo turno.", "You can do it on your turn.");
  if (!LOCK_METHODS.includes(method)) fail("Scegli come aprirla.", "Choose how to open it.");
  const near = lockedDoorsNear(state, actorId, role).find((row) => row.door.id === doorId);
  if (!near)
    fail(
      "Avvicinati alla porta chiusa a chiave (entro la sua distanza d’interazione).",
      "Move next to the locked door (within its interaction distance).",
    );
  const { door, lock } = near;
  const cost = method === "key" ? "free" : (lock?.cost ?? "action");
  if (state.combat?.active) {
    if (cost === "action" && !actor.action)
      fail("L’azione di questo turno è già spesa.", "This turn’s action is already spent.");
    if (cost === "bonus" && !actor.bonus)
      fail("L’azione bonus di questo turno è già spesa.", "This turn’s bonus action is already spent.");
  }
  const scene = activeScene(state);
  const base = {
    id: uid("check"),
    kind: "lock",
    method,
    actorId,
    doorId,
    sceneId: scene.id,
    by: role,
  };
  if (method === "key") {
    if (!near.hasKey)
      fail(
        `Serve «${lock?.key || "la chiave"}» nell’inventario di questa creatura.`,
        `This creature needs “${lock?.key || "the key"}” in its inventory.`,
      );
    door.doorState = "closed";
    const check = { ...base, success: true, total: null, dc: null, at: new Date().toISOString() };
    sliceOf(state).checks.push(check);
    return check;
  }
  if (!Number.isFinite(lock?.dc))
    fail(
      "Questa serratura non si apre con una prova: serve la chiave o il DM.",
      "This lock does not open with a check: it needs the key or the DM.",
    );
  const allowed = lock.check === "both" || lock.check === method;
  if (!allowed)
    fail(
      method === "force"
        ? "Questa porta non si sfonda: prova a scassinarla."
        : "Questa serratura non si scassina: prova a forzarla.",
      method === "force"
        ? "This door cannot be forced: try picking the lock."
        : "This lock cannot be picked: try forcing it.",
    );
  if (method === "lockpick" && !hasThievesTools(actor))
    fail(
      "Servono gli Arnesi da scasso nell’inventario di questa creatura.",
      "This creature needs Thieves’ Tools in its inventory.",
    );
  const profile = lockProfile(state, actorId, method);
  const count = profile.rollMode === "normal" ? 1 : 2;
  const turn = state.combat?.active ? combatTurnKey(state.combat) : "free";
  const roll = acceptRoll(state, {
    key: `lock:${method}:${actorId}:${doorId}:${turn}`,
    sides: 20,
    count,
    mode,
    faces,
    rng,
    meta: {
      kind: method,
      actorId,
      by: role,
      modifier: profile.bonus,
      rollMode: profile.rollMode,
    },
  });
  roll.natural = d20(roll.values, profile.rollMode);
  roll.total = roll.natural + profile.bonus;
  const success = roll.total >= lock.dc;
  if (state.combat?.active) {
    if (cost === "action") actor.action = false;
    if (cost === "bonus") actor.bonus = false;
  }
  if (success) door.doorState = "closed";
  const check = {
    ...base,
    rollId: roll.id,
    mode,
    natural: roll.natural,
    modifier: profile.bonus,
    rollMode: profile.rollMode,
    total: roll.total,
    dc: lock.dc,
    success,
    at: roll.at,
    source: clone(SOURCES.thievesTools),
  };
  sliceOf(state).checks.push(check);
  return check;
}

/** The roller corrects physical faces typed wrong, with a reason; the result is re-applied. */
export function correctCheck(state, { checkId, faces, reason }, role) {
  const check = sliceOf(state)?.checks.find((c) => c.id === checkId);
  const roll = rollsOf(state)?.rolls.find((r) => r.id === check?.rollId);
  if (!check || !roll) fail("Prova non trovata.", "Check not found.");
  if (check.by !== role)
    fail("Solo chi ha tirato corregge il tiro.", "Only the roller corrects the roll.");
  if (roll.mode !== "physical")
    fail("Le facce digitali non si modificano.", "Digital faces cannot be edited.");
  const why = clean(reason, 200);
  if (!why) fail("Scrivi il motivo della correzione.", "Write the reason for the correction.");
  const next = (faces ?? []).map(Number);
  if (next.length !== roll.values.length || next.some((face) => !validFace(face, 20)))
    fail("Inserisci ogni faccia del d20 (da 1 a 20).", "Enter every d20 face (1 to 20).");
  if (JSON.stringify(next) === JSON.stringify(roll.values))
    fail("Le facce sono uguali a quelle registrate.", "These faces match the recorded ones.");
  roll.corrections.push({ values: [...roll.values], total: check.total, reason: why, by: role });
  roll.values = next;
  const natural = d20(next, check.rollMode);
  const total = natural + check.modifier;
  Object.assign(check, { natural, total, corrected: why });
  if (check.kind === "search") {
    for (const id of check.examined) {
      const region = regionOf(state, id);
      if (!region) continue;
      const met = total >= (region.trap?.detectDC ?? 99);
      if (met && !region.status.discovered)
        Object.assign(region.status, { discovered: true, discoveredBy: check.actorId });
      if (!met && region.status.discoveredBy === check.actorId && check.found.includes(id))
        Object.assign(region.status, { discovered: false, discoveredBy: null });
    }
    check.found = check.examined.filter(
      (id) => total >= (regionOf(state, id)?.trap?.detectDC ?? 99),
    );
  } else if (check.kind === "lock") {
    const door = sceneOf(state, check.sceneId)?.walls?.find((w) => w.id === check.doorId);
    const success = total >= check.dc;
    if (door && success !== check.success) door.doorState = success ? "closed" : "locked";
    check.success = success;
  } else {
    const region = regionOf(state, check.regionId);
    const success = total >= check.dc;
    if (region && success !== check.success) region.status.disarmed = success;
    check.success = success;
  }
  return check;
}

const ROLL_LABELS = {
  search: text("Cercare (trappole)", "Search (traps)"),
  disarm: text("Arnesi da scasso: disinnesco", "Thieves’ Tools: disarm"),
  lockpick: text("Arnesi da scasso: scassinare una serratura", "Thieves’ Tools: pick a lock"),
  force: text("Forza (Atletica): forzare una porta", "Strength (Athletics): force a door"),
  chance: text("Probabilità della regione (d100)", "Region chance (d100)"),
};
/**
 * Review (B41-rf, F1): the Table log's roll shape for a roll this area keeps in its own
 * slice (registry plan §2.6: such an area adds it to its commit's Log entry and announces
 * it with "roll-accepted", like B34/B46). A hidden trap's DC never travels with the roll;
 * the DM's d100 and the DM's own creatures' checks stay private.
 */
export function logRoll(state, roll, { status = null, correctionReason = null } = {}) {
  const actor = roll.actorId ? state.actors?.[roll.actorId] : null;
  const check = sliceOf(state)?.checks.find((c) => c.rollId === roll.id) ?? null;
  const dmOnly =
    roll.kind === "chance" ||
    actor?.visibility === "private" ||
    (roll.by === "dm" && actor?.owner !== "player");
  const natural = roll.kind === "chance" ? roll.values[0] : d20(roll.values, roll.rollMode);
  return {
    id: status === "corrected" ? `${roll.id}-c${roll.corrections.length}` : roll.id,
    source: ID,
    // Shared roll kinds (chat and dice name them): Search and disarm are ability checks,
    // the d100 a plain roll; the action name says which, `regionKind` keeps ours.
    kind: roll.kind === "chance" ? "free" : "check",
    regionKind: roll.kind,
    actorId: roll.actorId ?? null,
    actorName: actor?.name ?? null,
    actionName: clone(ROLL_LABELS[roll.kind] ?? text("Tiro", "Roll")),
    label: clone(ROLL_LABELS[roll.kind] ?? text("Tiro", "Roll")),
    controller: roll.by,
    owner: roll.by,
    visibility: dmOnly ? "private" : "shared",
    mode: roll.mode,
    dice: [{ count: roll.values.length, sides: roll.sides }],
    values: [...roll.values],
    natural,
    modifier: roll.kind === "chance" ? 0 : (roll.modifier ?? 0),
    total: roll.kind === "chance" ? roll.values[0] : natural + (roll.modifier ?? 0),
    dc: null,
    ...(["disarm", "lockpick", "force"].includes(roll.kind) && check
      ? { success: check.success }
      : {}),
    rollMode: roll.rollMode ?? "normal",
    status: status ?? (roll.reusedFrom ? "reused" : "accepted"),
    ...(correctionReason ? { correctionReason, correctsRollId: roll.id } : {}),
  };
}

// ---------------------------------------------------------------- DM decisions

const eventOf = (state, id) => sliceOf(state)?.events.find((e) => e.id === id) ?? null;
const attemptOf = (state, event) =>
  (state.combatAttempts ?? []).find((a) => a.id === event.attemptId) ?? null;
const sameDice = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Faces of a damage roll the DM already recorded for this event (kept across an Undo). */
export function knownDamageFaces(state, eventId, actionId) {
  const event = eventOf(state, eventId);
  const attempt = event && attemptOf(state, event);
  const evidence = attempt?.rollEvidence?.[`${attempt.id}-damage-${actionId}`];
  const action = event?.plan.actions.find((a) => a.id === actionId);
  if (!evidence?.acceptedValues || !action?.dice) return null;
  return sameDice(evidence.dice, [{ count: action.dice.count, sides: action.dice.sides }])
    ? { values: [...evidence.acceptedValues], mode: evidence.mode ?? null }
    : null;
}
function closeAttempt(attempt, label, status) {
  if (!attempt) return;
  for (const request of attempt.requests)
    if (request.status === "pending") {
      request.status = "expired";
      request.reason = "region-event-" + status;
    }
  for (const outcome of attempt.outcomes)
    if (outcome.status === "pending") Object.assign(outcome, { status, label: clone(label) });
  attempt.status = "resolved";
}
function settleRegion(state, event) {
  const region = regionOf(state, event.regionId);
  if (region && region.status.pendingEventId === event.id) region.status.pendingEventId = null;
}
/**
 * The DM runs a waiting event (card check 6: nothing runs unseen). The DM rolls the chance
 * (d100, when below 100%) and the damage dice, digital or physical; the saving throw goes to
 * the creature's controller in the request queue, and the outcome applies after that roll
 * (combat.mjs resolveAttemptKind → resolveRegionAttempt). Doors change and messages reach
 * the controller now; a passage then asks the mover.
 */
export function executeEvent(state, eventId, input = {}, role, rng) {
  requireDM(role);
  const event = eventOf(state, eventId);
  if (!event || event.status !== "awaiting-dm")
    fail("Questo evento non è più in attesa.", "This event is no longer waiting.");
  const region = regionOf(state, event.regionId);
  const actor = state.actors?.[event.actorId];
  if (!actor) fail("La creatura non è più disponibile.", "The creature is no longer available.");
  const plan = event.plan;
  const attempt = attemptOf(state, event);
  if (plan.trigger.chance < 100) {
    const chance = input.chance ?? {};
    const roll = acceptRoll(state, {
      key: `chance:${event.id}`,
      sides: 100,
      count: 1,
      mode: chance.mode,
      faces: chance.faces,
      rng,
      meta: { kind: "chance", eventId: event.id, by: role },
    });
    event.chance = {
      value: roll.values[0],
      chance: plan.trigger.chance,
      rollId: roll.id,
      mode: roll.mode,
    };
    if (roll.values[0] > plan.trigger.chance) {
      event.status = "fizzled";
      closeAttempt(attempt, text("Non scatta", "Does not go off"), "fizzled");
      settleRegion(state, event);
      return event;
    }
  }
  const publicName = plan.publicName || plan.name;
  const info = attempt?.region;
  if (attempt) {
    attempt.actionName = text(publicName, publicName);
    attempt.source = clone(plan.source);
    Object.assign(info, { executed: true, damage: [], conditions: [], save: null });
  }
  const results = { messages: [], doors: [] };
  const rollDamage = (action, withSave) => {
    const id = `${attempt.id}-damage-${action.id}`;
    const dice = [{ count: action.dice.count, sides: action.dice.sides }];
    const known = knownDamageFaces(state, event.id, action.id);
    const chosen = input.damage?.[action.id] ?? {};
    let values, mode;
    if (known) {
      values = known.values;
      mode = known.mode;
    } else if (chosen.mode === "physical") {
      values = (chosen.faces ?? []).map(Number);
      if (
        values.length !== action.dice.count ||
        values.some((v) => !validFace(v, action.dice.sides))
      )
        fail(
          `Inserisci ${action.dice.count} facce del d${action.dice.sides} fisico.`,
          `Enter ${action.dice.count} physical d${action.dice.sides} faces.`,
        );
      mode = "physical";
    } else if (chosen.mode === "digital") {
      values = Array.from({ length: action.dice.count }, () => rng(action.dice.sides));
      mode = "digital";
    } else
      fail("Scegli dadi digitali o fisici per i danni.", "Choose digital or physical damage dice.");
    const total = Math.max(0, values.reduce((sum, v) => sum + v, 0) + (action.dice.bonus ?? 0));
    attempt.requests.push({
      id,
      kind: "damage",
      actorId: actor.id,
      owner: "dm",
      personal: false,
      dice,
      modifier: action.dice.bonus ?? 0,
      rollMode: "normal",
      status: "resolved",
      values: [...values],
      acceptedValues: [...values],
      natural: null,
      total,
      resolvedBy: "dm",
      mode,
      targetId: actor.id,
      damageType: action.damageType,
      ...(known ? { reusedFromEvidence: true } : {}),
    });
    info.damage.push({ requestId: id, withSave, damageType: action.damageType });
  };
  for (const action of plan.actions) {
    if (action.type === "save") {
      const profile = saveProfile(state, actor.id, action.ability);
      info.save = {
        requestId: null,
        ability: action.ability,
        dc: action.dc,
        onSuccess: action.onSuccess,
        autoFail: profile.autoFail,
        autoFailReasons: profile.autoFailReasons,
      };
      if (!profile.autoFail) {
        const id = `${attempt.id}-save-${actor.id}`;
        const request = {
          id,
          kind: "save",
          actorId: actor.id,
          owner: actor.owner,
          personal: actor.visibility === "private",
          dice: [{ count: profile.rollMode === "normal" ? 1 : 2, sides: 20 }],
          modifier: profile.bonus,
          rollMode: profile.rollMode,
          status: "pending",
          ability: action.ability,
          modifierSources: profile.modifierSources,
          targetId: actor.id,
        };
        Object.assign(request, knownEvidence(attempt.rollEvidence?.[id], request));
        attempt.requests.push(request);
        info.save.requestId = id;
      }
      if (action.dice) rollDamage(action, true);
      if (action.conditionId)
        info.conditions.push({ conditionId: action.conditionId, onFail: true });
    } else if (action.type === "damage") rollDamage(action, false);
    else if (action.type === "condition")
      info.conditions.push({ conditionId: action.conditionId, onFail: false });
    else if (action.type === "door") {
      if (event.sceneId !== state.activeSceneId)
        fail(
          "La porta è in un’altra scena: attivala prima di eseguire.",
          "The door is in another scene: activate it before running.",
        );
      correctDoor(state, action.doorId, { doorState: action.doorState }, "dm");
      results.doors.push({ doorId: action.doorId, doorState: action.doorState });
    } else if (action.type === "message") results.messages.push(action.text);
  }
  if (info) {
    info.immunityConfirmed = input.immunityConfirmed === true;
    info.teleport = plan.actions.some((a) => a.type === "teleport");
  }
  event.result = results;
  event.executedAt = new Date().toISOString();
  if (region) {
    region.status.triggers += 1;
    region.status.revealed = true;
    if (plan.trigger.once) region.status.spent = true;
  }
  settleRegion(state, event);
  const teleport = plan.actions.some((a) => a.type === "teleport");
  event.status = attempt ? "awaiting-roll" : teleport ? "awaiting-mover" : "applied";
  // The queue settles what needs no roll now (damage, conditions, an automatic failure).
  if (attempt) refreshConsequences(state);
  return event;
}
/**
 * Resolver of the "region" attempt kind (combat.mjs resolveAttemptKind): once the saving
 * throw is recorded, the damage applies — full on a failure, none or half on a success —
 * and conditions follow through conditions.mjs, in the same transaction as the roll.
 */
export function resolveRegionAttempt(state, attempt, { applyDamage }) {
  const info = attempt.region;
  const outcome = attempt.outcomes[0];
  if (!info?.executed || !outcome || outcome.status !== "pending") return;
  const save = info.save?.requestId
    ? attempt.requests.find((r) => r.id === info.save.requestId)
    : null;
  if (info.save && !info.save.autoFail && save?.status !== "resolved") return;
  const success = info.save ? !info.save.autoFail && save.total >= info.save.dc : null;
  let amount = 0;
  for (const part of info.damage) {
    const request = attempt.requests.find((r) => r.id === part.requestId);
    if (request?.status !== "resolved") continue;
    amount += part.withSave
      ? success
        ? info.save.onSuccess === "half"
          ? Math.floor(request.total / 2)
          : 0
        : request.total
      : request.total;
  }
  applyDamage(
    outcome,
    amount,
    info.save
      ? {
          ...(save ? { saveTotal: save.total } : {}),
          saveSuccess: success,
          ...(info.save.autoFail
            ? { autoFailSave: true, autoFailReasons: clone(info.save.autoFailReasons) }
            : {}),
        }
      : {},
  );
  const conditions = [];
  for (const entry of info.conditions) {
    if (entry.onFail && success !== false) continue;
    const result = applyConditionEvent(state, {
      eventId: `${attempt.id}:condition:${entry.conditionId}`,
      kind: "apply",
      actorId: outcome.actorId,
      conditionId: entry.conditionId,
      source: clone(attempt.source),
      origin: { label: String(attempt.actionName?.it ?? "Regione").slice(0, 120) },
      owner: "dm",
      visibility: "shared",
      immunityConfirmed: info.immunityConfirmed === true,
    });
    applyConditionFollowUps(state, result);
    conditions.push({
      conditionId: entry.conditionId,
      applied: result.applied,
      reconciliation: result.reconciliation?.[0]?.code ?? null,
    });
  }
  outcome.regionConditions = conditions;
  const event = eventOf(state, info.eventId);
  if (event) {
    event.result = {
      ...(event.result ?? {}),
      damage: outcome.damage ?? amount,
      saveSuccess: success,
      saveTotal: save?.total ?? null,
      autoFail: info.save?.autoFail === true,
      conditions,
      hpAfter: outcome.hpAfter ?? null,
    };
    event.status = info.teleport ? "awaiting-mover" : "applied";
  }
}
/** The DM cancels a waiting event (before or after running it): nothing more applies. */
export function cancelEvent(state, eventId, reason, role) {
  requireDM(role);
  const event = eventOf(state, eventId);
  if (!event || !awaiting(event))
    fail("Questo evento non è più in attesa.", "This event is no longer waiting.");
  event.status = "cancelled";
  event.reason = clean(reason, 200) || null;
  closeAttempt(
    attemptOf(state, event),
    text("Annullato dal DM", "Cancelled by the DM"),
    "cancelled",
  );
  settleRegion(state, event);
  return event;
}
/**
 * The mover answers a passage (Owlbear Portals "confirm before teleport", VTL-100): yes
 * moves the token to the linked region's centre, in this scene or another one (Stairways,
 * FVT-086); a passage to another scene waits until combat ends. No leaves it here.
 */
export function answerPassage(state, eventId, accept, role) {
  const event = eventOf(state, eventId);
  if (!event || event.status !== "awaiting-mover")
    fail("Il passaggio non è più in attesa.", "The passage is no longer waiting.");
  const actor = state.actors?.[event.actorId];
  if (!actor || !(role === "dm" || canControlActor(actor, role, state)))
    fail("Decide chi controlla la creatura.", "Whoever controls the creature decides.");
  if (!accept) {
    event.status = "declined";
    return event;
  }
  const action = event.plan.actions.find((a) => a.type === "teleport");
  const target = regionOf(state, action?.targetRegionId);
  if (!target)
    fail("L’arrivo del passaggio non esiste più.", "The passage’s arrival no longer exists.");
  const from = sceneOf(state, event.sceneId);
  const to = sceneOf(state, target.sceneId);
  const token = tokenOf(from, actor.id);
  // W2b2 integration: the arrival scene may have been archived (B47) or deleted meanwhile.
  if (token && !to)
    fail(
      "La scena d’arrivo del passaggio non è disponibile: è archiviata o eliminata.",
      "The passage’s arrival scene is not available: it is archived or deleted.",
    );
  if (!token || !to)
    fail("La creatura non è più sulla scena.", "The creature is no longer on the scene.");
  if (from.id !== to.id && state.combat?.active)
    fail(
      "Durante il combattimento il passaggio verso un’altra scena attende la fine dello scontro.",
      "During combat a passage to another scene waits for the fight to end.",
    );
  const point = center(target.shape);
  if (from.id === to.id) Object.assign(token, point);
  else {
    from.tokens = from.tokens.filter((t) => t.actorId !== actor.id);
    const there = tokenOf(to, actor.id);
    if (there) Object.assign(there, point);
    else (to.tokens ||= []).push({ id: `token-${actor.id}-${to.id}`, actorId: actor.id, ...point });
  }
  event.status = "applied";
  event.result = {
    ...(event.result ?? {}),
    passage: { fromSceneId: from.id, toSceneId: to.id, x: point.x, y: point.y },
  };
  return event;
}

// ---------------------------------------------------------------- projections

/** Regions a viewer may see on a scene: all for the DM; shared, found or fired for players. */
export function visibleRegions(state, role, sceneId) {
  const list = regionsIn(state, sceneId);
  if (role === "dm") return list;
  return list
    .filter((r) => r.visibility === "shared" || r.status.discovered || r.status.revealed)
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      shape: { ...r.shape },
      publicName: r.publicName,
      visibility: r.visibility,
      difficult: r.difficult,
      status: {
        discovered: r.status.discovered,
        disarmed: r.status.disarmed,
        spent: r.status.spent,
        revealed: r.status.revealed,
      },
    }));
}
export const pendingEvents = (state) => (sliceOf(state)?.events ?? []).filter(awaiting);
/** Events the viewer's creatures are part of (players never see DM-only configuration). */
export function eventsFor(state, role, actorId = null) {
  return (sliceOf(state)?.events ?? []).filter((event) => {
    if (actorId && event.actorId !== actorId) return false;
    return role === "dm" || canControlActor(state.actors?.[event.actorId], role, state);
  });
}
/** The DM's one-line preview of what the region will do (card check 6). */
export function planSummary(plan, lang = "it") {
  const L = (value) => (typeof value === "string" ? value : (value?.[lang] ?? value?.it ?? ""));
  const dice = (d) =>
    `${d.count}d${d.sides}${d.bonus ? (d.bonus > 0 ? " + " : " − ") + Math.abs(d.bonus) : ""}`;
  const parts = [];
  for (const a of plan.actions ?? []) {
    if (a.type === "save")
      parts.push(
        `${lang === "it" ? "TS" : "Save"} ${L(abilityName(a.ability))} ${lang === "it" ? "CD" : "DC"} ${a.dc}` +
          (a.dice
            ? ` → ${dice(a.dice)} ${L(damageTypeName(a.damageType))} ${lang === "it" ? (a.onSuccess === "half" ? "(metà se riesce)" : "(nulla se riesce)") : a.onSuccess === "half" ? "(half on a success)" : "(none on a success)"}`
            : "") +
          (a.conditionId
            ? ` · ${lang === "it" ? "se fallisce" : "on a failure"}: ${L(conditionName(a.conditionId))}`
            : ""),
      );
    else if (a.type === "damage") parts.push(`${dice(a.dice)} ${L(damageTypeName(a.damageType))}`);
    else if (a.type === "condition") parts.push(L(conditionName(a.conditionId)));
    else if (a.type === "door")
      parts.push(
        `${lang === "it" ? "Porta" : "Door"}: ${lang === "it" ? { open: "aperta", closed: "chiusa", locked: "chiusa a chiave" }[a.doorState] : a.doorState}`,
      );
    else if (a.type === "message")
      parts.push(`${lang === "it" ? "Messaggio" : "Message"}: “${a.text}”`);
    else if (a.type === "teleport")
      parts.push(lang === "it" ? "Passaggio collegato" : "Linked passage");
  }
  if ((plan.trigger?.chance ?? 100) < 100)
    parts.push(`${plan.trigger.chance}% ${lang === "it" ? "di probabilità" : "chance"}`);
  if (plan.trigger?.once) parts.push(lang === "it" ? "una volta" : "once");
  return parts.join(" · ");
}
