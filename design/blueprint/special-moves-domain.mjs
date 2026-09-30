// B40 — Special movement and actions: pure domain (no DOM).
//
// Movement modes (long and high jump, climbing, swimming, flying, falling, dragging a
// grappled creature, riding), the 2024 generic actions (Grapple and Shove through the
// Unarmed Strike, Help, Hide, Search, Study, Influence, Utilize), thrown weapons and
// weapon rows with Weapon Mastery, the two-tier movement range, the turn's movement
// history, DM-approved movement and the scene's distance rule.
//
// Rules: SRD 5.2.1 (2024) EN/IT with page numbers in SOURCES. Every roll goes through the
// existing request queue (state.combatAttempts, combat.mjs resolveRoll, physical or
// digital dice); this module never draws a die. Consequences reuse the owners' domains:
// conditions (applyConditionEvent), damage (the resolver's applyDamage), movement
// (combat.mjs beginMovement, state.mjs spendMovement), altitude (B18 annotations
// elevations). Patterns (census IDs): BG3 jump/shove/throw previews CRP-107/108/109, BG3
// unavailability CRP-103, BG3 Alt labels CRP-148, dnd5e falling FVT-145, D&D Beyond 2024
// generic actions DDB-039 and weapon rows with mastery DDB-041, XCOM two-tier range
// CRP-113, dnd5e speed ruler FVT-111, Foundry movement history FVT-112/113, Roll20 last
// move R20-135, Not Your Turn FVT-114, Fantasy Grounds token locking R20-168, Roll20
// diagonal rule R20-086, Solasta II hexes CRP-121, dnd5e transformation FVT-034.

import {
  getEffectiveActor,
  getEffectiveSpeed,
  imposeTransformation,
  previewTransform as transformPreview,
  spendPolymorphCast,
  transformProfile,
} from "./forms-companions.mjs";
import { canControlActor, canViewActor, isActorAvailable } from "./character-access.mjs";
import {
  tracePath,
  geometryKey,
  segmentMeters,
  hasLineOfSight,
  isSegmentBlocked,
  previewTokenPlacement,
  DISTANCE_RULES,
  distanceRuleOf,
} from "./spatial.mjs";
import { spendMovement } from "./state.mjs";
import {
  hasCondition,
  getConditionMechanics,
  applyConditionEvent,
  combatTurnKey,
  conditionSaveRules,
} from "./conditions.mjs";
import { beginMovement, knownEvidence, hasBlockingConsequences, listActions } from "./combat.mjs";
import { ITEMS } from "./srd-sample.mjs";
import { skills as SKILL_LIST, abilities as ABILITY_LIST } from "./character-rules.mjs";
import { itemFromCatalog } from "./party-stash.mjs";
import { runsSession } from "./table-spatial.mjs";

export const ID = "special-moves";
export const VERSION = 1;
// Attempt kind of this area in state.combatAttempts (settled by resolveAttempt).
export const KIND = "special-moves";
export const ACTION_PREFIX = "special-moves.";

const text = (it, en) => ({ it, en });
const copy = (value) => (value === undefined ? undefined : structuredClone(value));
const EPS = 1e-6;
const round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const mod = (score) => Math.floor((score - 10) / 2);
const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value : []);
const reason = (code, it, en) => ({ code, it, en });
export function fail(code, it, en) {
  throw Object.assign(new Error(en), { code, it, en });
}
const refuse = (first) => fail(first.code, first.it, first.en);

// ---------------------------------------------------------------- sources

const EN_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf";
const EN_SHA = "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87";
const IT_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";
const IT_SHA = "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718";
const srd = (en, it, extra = {}) =>
  Object.freeze({
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    sha256: EN_SHA,
    url: EN_URL,
    pages: en,
    en: { url: EN_URL, sha256: EN_SHA, pages: en },
    it: { url: IT_URL, sha256: IT_SHA, pages: it },
    ...extra,
  });
const authored = (revision, title) =>
  Object.freeze({ kind: "authored-demo", edition: "2024", revision, title });
export const SOURCES = Object.freeze({
  longJump: srd([184, 185], [214]),
  highJump: srd([183], [214]),
  falling: srd([182], [205]),
  climbing: srd([178, 179], [214]),
  swimming: srd([189], [210]),
  flying: srd([182], [219]),
  unarmedStrike: srd([190, 191], [205, 206]),
  grappling: srd([182], [202, 203]),
  help: srd([182, 183], [203]),
  hide: srd([183], [210]),
  influence: srd([184], [208]),
  search: srd([187], [212]),
  study: srd([189], [216]),
  utilize: srd([191], [218]),
  thrown: srd([15, 90], [17, 101]),
  mastery: srd([90], [102, 103]),
  grid: srd([13], [14]),
  mounted: srd([15, 16], [17]),
  horse: srd([360], [387]),
  polymorph: srd([153, 154], [164]),
  prone: srd([186], [212]),
  invisible: srd([184], [209]),
  dash: srd([180], [214]),
  // Authored parts of this demonstration, never cited as SRD.
  euclidean: authored("blueprint-euclidean-centerpoint-v1", "Gridless centre-to-centre distance"),
  alternate: authored("b40-diagonal-5-10-5-v1", "Optional 5-10-5 diagonal (table variant)"),
  manhattan: authored("b40-manhattan-v1", "Optional orthogonal-only distance (table variant)"),
  hex: authored("b40-hex-pointy-v1", "Optional hexes as wide as a grid cell"),
  flightCost: authored(
    "b40-flight-cost-v1",
    "Flying cost = horizontal distance plus change of altitude (prototype convention)",
  ),
  ledge: authored(
    "b40-ledge-v1",
    "A shove moves an elevated creature off its perch: it falls (prototype convention)",
  ),
  demo: authored("b40-old-watch-1", "Old watch courtyard features (synthetic sample)"),
});

// ---------------------------------------------------------------- rule tables

export const SIZES = Object.freeze(["tiny", "small", "medium", "large", "huge", "gargantuan"]);
export const SIZE_NAMES = Object.freeze({
  tiny: text("Minuscola", "Tiny"),
  small: text("Piccola", "Small"),
  medium: text("Media", "Medium"),
  large: text("Grande", "Large"),
  huge: text("Enorme", "Huge"),
  gargantuan: text("Mastodontica", "Gargantuan"),
});
const SKILLS = new Map(SKILL_LIST.map((row) => [row.id, row]));
const ABILITY_NAMES = new Map(ABILITY_LIST.map((row) => [row.id, row.name]));
export const skillName = (id) => SKILLS.get(id)?.name ?? text(id, id);
export const abilityName = (id) => ABILITY_NAMES.get(id) ?? text(id, id);
// SRD "Search" table (EN 187 / IT 212) and "Areas of Knowledge" (EN 189 / IT 216).
export const SEARCH_SKILLS = Object.freeze(["perception", "insight", "medicine", "survival"]);
export const STUDY_SKILLS = Object.freeze([
  "arcana",
  "history",
  "investigation",
  "nature",
  "religion",
]);
// SRD "Influence Checks" (EN 184 / IT 208).
export const INFLUENCE_SKILLS = Object.freeze([
  "deception",
  "intimidation",
  "performance",
  "persuasion",
  "animal-handling",
]);
const KNOWLEDGE_BY_TYPE = Object.freeze({
  aberration: "arcana",
  construct: "arcana",
  elemental: "arcana",
  fey: "arcana",
  monstrosity: "arcana",
  giant: "history",
  humanoid: "history",
  beast: "nature",
  dragon: "nature",
  ooze: "nature",
  plant: "nature",
  celestial: "religion",
  fiend: "religion",
  undead: "religion",
});
export const ATTITUDES = Object.freeze(["friendly", "indifferent", "hostile"]);
export const ATTITUDE_NAMES = Object.freeze({
  friendly: text("Amichevole", "Friendly"),
  indifferent: text("Indifferente", "Indifferent"),
  hostile: text("Ostile", "Hostile"),
});
// Weapon Mastery property names and the SRD summary of each (EN 90 / IT 102–103).
export const MASTERIES = Object.freeze({
  cleave: {
    name: text("Doppio fendente", "Cleave"),
    rule: text(
      "Se colpisci in mischia, puoi attaccare una seconda creatura entro 1,5 m dalla prima e entro la tua portata (una volta per turno), senza modificatore ai danni.",
      "If you hit with a melee attack roll, you can attack a second creature within 5 feet of the first and within your reach (once per turn), without your modifier to damage.",
    ),
  },
  graze: {
    name: text("Colpo di striscio", "Graze"),
    rule: text(
      "Se il tiro per colpire manca, infliggi comunque danni pari al modificatore usato per l’attacco.",
      "If your attack roll misses, you still deal damage equal to the ability modifier used for the attack.",
    ),
  },
  nick: {
    name: text("Graffio", "Nick"),
    rule: text(
      "L’attacco extra della proprietà Leggera fa parte dell’azione di Attacco invece che dell’azione bonus (una volta per turno).",
      "The extra attack of the Light property is part of the Attack action instead of a Bonus Action (once per turn).",
    ),
  },
  push: {
    name: text("Spinta", "Push"),
    rule: text(
      "Se colpisci, puoi spingere la creatura fino a 3 m lontano da te, se è Grande o più piccola.",
      "If you hit, you can push the creature up to 10 feet straight away from you if it is Large or smaller.",
    ),
  },
  sap: {
    name: text("Fiaccare", "Sap"),
    rule: text(
      "Se colpisci, la creatura ha svantaggio al suo prossimo tiro per colpire prima dell’inizio del tuo prossimo turno.",
      "If you hit, the creature has Disadvantage on its next attack roll before the start of your next turn.",
    ),
  },
  slow: {
    name: text("Lentezza", "Slow"),
    rule: text(
      "Se colpisci e infliggi danni, puoi ridurre di 3 m la velocità della creatura fino all’inizio del tuo prossimo turno.",
      "If you hit and deal damage, you can reduce the creature's Speed by 10 feet until the start of your next turn.",
    ),
  },
  topple: {
    name: text("Rovesciamento", "Topple"),
    rule: text(
      "Se colpisci, puoi imporre un TS su Costituzione (CD 8 + modificatore dell’attacco + competenza): se fallisce, è Prona.",
      "If you hit, you can force a Constitution save (DC 8 + attack modifier + Proficiency Bonus): on a failure it has the Prone condition.",
    ),
  },
  vex: {
    name: text("Vessazione", "Vex"),
    rule: text(
      "Se colpisci e infliggi danni, hai vantaggio al tuo prossimo tiro per colpire contro quella creatura prima della fine del tuo prossimo turno.",
      "If you hit and deal damage, you have Advantage on your next attack roll against that creature before the end of your next turn.",
    ),
  },
});
// Automated here: the effect needs no extra choice at the table.
export const AUTOMATED_MASTERIES = Object.freeze(["sap", "vex"]);
// Classes whose level-1 features include Weapon Mastery (SRD 5.2.1 class tables).
const MASTERY_CLASSES = new Set(["barbarian", "fighter", "paladin", "ranger", "rogue"]);
// Weapon proficiencies granted by class (SRD 5.2.1 Core Traits): martial for these.
const MARTIAL_CLASSES = new Set(["barbarian", "fighter", "paladin", "ranger"]);

// SRD 5.2.1 Riding Horse (EN 360 / IT 387): the demo mount the DM can bring on the scene.
export const RIDING_HORSE = Object.freeze({
  id: "riding-horse",
  name: text("Cavallo da galoppo", "Riding Horse"),
  size: "large",
  creatureType: "beast",
  ac: 11,
  hp: 13,
  speed: 18,
  abilities: Object.freeze({ str: 16, dex: 13, con: 12, int: 2, wis: 11, cha: 7 }),
  source: SOURCES.horse,
});

// ---------------------------------------------------------------- slice and seed

export function emptySlice() {
  return {
    settings: { approval: "free" },
    features: {},
    lore: [],
    learned: [],
    attitudes: {},
    masteries: {},
    moves: [],
    grapples: [],
    hidden: {},
    effects: [],
    flight: {},
    perches: {},
    mounts: {},
    mountUse: {},
    thrown: [],
    proposals: [],
    judgements: [],
    squareGrid: {},
    altitudes: {},
    history: { cleared: null },
    nextHorse: 1,
  };
}
const RUBBLE = Object.freeze({
  id: "sm-rubble",
  kind: "difficult",
  x: 690,
  y: 470,
  width: 190,
  height: 90,
  source: {
    kind: "authored-demo",
    edition: "2024",
    revision: "b40-old-watch-rubble-1",
    title: "Rubble in the south-east room (synthetic sample)",
  },
});
function oldWatchFeatures() {
  return [
    {
      id: "sm-fountain",
      kind: "water",
      x: 500,
      y: 325,
      r: 60,
      name: text("Vasca della fontana", "Fountain basin"),
      text: text(
        "Acqua fino al petto: la si attraversa a nuoto.",
        "Chest-deep water: you cross it swimming.",
      ),
      drained: false,
    },
    {
      id: "sm-west-wall",
      kind: "climb",
      a: { x: 99, y: 215 },
      b: { x: 99, y: 572 },
      height: 6,
      dc: null,
      name: text("Muro di cinta ovest", "West curtain wall"),
      text: text(
        "Pietre sbrecciate, ottimi appigli fino al camminamento a 6 m.",
        "Chipped stones, good holds up to the wall walk at 6 m.",
      ),
    },
    {
      id: "sm-north-wall",
      kind: "climb",
      a: { x: 99, y: 200 },
      b: { x: 340, y: 200 },
      height: 3,
      dc: 15,
      name: text("Muretto della stanza nord", "North room low wall"),
      text: text(
        "Coperto di muschio umido: scivoloso, serve una prova di Atletica (CD 15).",
        "Covered in damp moss: slippery, it needs an Athletics check (DC 15).",
      ),
    },
    {
      id: "sm-lever",
      kind: "object",
      x: 566,
      y: 300,
      secret: true,
      revealed: false,
      dc: 13,
      effect: "drain-fountain",
      used: false,
      name: text("Leva di bronzo", "Bronze lever"),
      action: text("Tira la leva", "Pull the lever"),
      text: text(
        "Sotto il bordo della vasca, una leva di bronzo verdastra.",
        "Under the basin's rim, a greenish bronze lever.",
      ),
      result: text(
        "Un gorgoglio: la vasca si svuota. Ora si attraversa a piedi.",
        "A gurgle: the basin drains. Now you can walk across it.",
      ),
    },
    {
      id: "sm-bell",
      kind: "object",
      x: 500,
      y: 92,
      secret: false,
      effect: "bell",
      used: false,
      name: text("Campana d’allarme", "Alarm bell"),
      action: text("Suona la campana", "Ring the bell"),
      text: text(
        "Una campana di bronzo appesa sopra il portone nord.",
        "A bronze bell above the north gate.",
      ),
      result: text(
        "Il rintocco rimbomba nel cortile: chi è nella torre ora sa che siete qui.",
        "The toll echoes across the courtyard: whoever is in the tower now knows you are here.",
      ),
    },
  ];
}
function seedLore() {
  return [
    {
      id: "lore-sentinella",
      subject: { kind: "actor", id: "goblin-1" },
      skill: "history",
      dc: 10,
      text: text(
        "Le sentinelle goblin portano un fischietto d’osso: se lo suonano, arrivano rinforzi dal magazzino.",
        "Goblin sentries carry a bone whistle: if they blow it, reinforcements come from the storehouse.",
      ),
    },
    {
      id: "lore-fountain",
      subject: { kind: "feature", id: "sm-fountain" },
      skill: "arcana",
      dc: 14,
      text: text(
        "Rune d’acqua consumate sul bordo: un tempo la fontana era alimentata dalla magia.",
        "Worn water runes on the rim: the fountain was once fed by magic.",
      ),
    },
    {
      id: "lore-lever",
      subject: { kind: "feature", id: "sm-lever" },
      skill: "investigation",
      dc: 12,
      text: text(
        "Il meccanismo chiude la condotta: tirando la leva la vasca si svuota in un minuto.",
        "The mechanism closes the conduit: pulling the lever drains the basin in a minute.",
      ),
    },
  ];
}
// seed(state): own slice plus the synthetic sample it needs, added only when absent (the
// registry convention, like B35's tower scene and B36's inventory rows).
export function seedSlice(state) {
  const slice = emptySlice();
  slice.features["old-watch"] = oldWatchFeatures();
  slice.lore = seedLore();
  slice.attitudes = { "goblin-1": "indifferent", "goblin-2": "hostile" };
  // Doran, Fighter 3: three weapons chosen for Weapon Mastery (synthetic choices).
  slice.masteries = { doran: ["longsword", "handaxe", "longbow"] };
  if (isObject(state)) seedCore(state);
  return slice;
}
// P6 TV-01: the courtyard's drawn walls (the "courtyard" template: the curtain wall and the
// two rooms) are walls of the scene geometry, so walking never crosses them (Foundry walls
// block movement; climbing is the special move). The climbable ones name their feature. They
// block movement only: sight and effects pass as before. Each room keeps a way in on foot: a
// closed door in the north room's east wall, an open one in the south-east room's west wall.
const wallSource = (title) => ({
  kind: "authored-demo",
  edition: "2024",
  revision: "p6-old-watch-walls-1",
  title: `${title} (synthetic sample, movement only)`,
});
const COURTYARD_WALLS = Object.freeze(
  [
    ["sm-curtain-west", [99, 79], [99, 571], "West curtain wall", "sm-west-wall"],
    ["sm-curtain-north", [99, 79], [901, 79], "North curtain wall"],
    ["sm-curtain-east", [901, 79], [901, 571], "East curtain wall"],
    ["sm-curtain-south", [99, 571], [901, 571], "South curtain wall"],
    ["sm-north-wall", [99, 200], [340, 200], "North room low wall", "sm-north-wall"],
    ["sm-north-room-east-1", [340, 79], [340, 110], "North room east wall"],
    ["sm-north-room-east-2", [340, 170], [340, 200], "North room east wall"],
    ["sm-south-room-north", [660, 450], [901, 450], "South-east room north wall"],
    ["sm-south-room-west-1", [660, 450], [660, 490], "South-east room west wall"],
    ["sm-south-room-west-2", [660, 550], [660, 571], "South-east room west wall"],
  ].map(([id, a, b, title, climb]) =>
    Object.freeze({
      id,
      kind: "wall",
      a: { x: a[0], y: a[1] },
      b: { x: b[0], y: b[1] },
      blocksMovement: true,
      blocksSight: false,
      blocksEffect: false,
      secret: false,
      ...(climb ? { climb } : {}),
      source: wallSource(title),
    }),
  ),
);
const COURTYARD_DOORS = Object.freeze(
  [
    ["sm-north-room-door", [340, 110], [340, 170], "closed", "North room door"],
    ["sm-south-room-door", [660, 490], [660, 550], "open", "South-east room door"],
  ].map(([id, a, b, doorState, title]) =>
    Object.freeze({
      id,
      kind: "door",
      a: { x: a[0], y: a[1] },
      b: { x: b[0], y: b[1] },
      blocksMovement: true,
      blocksSight: false,
      blocksEffect: false,
      secret: false,
      doorState,
      playerOperable: true,
      interactionRangeMeters: 1.5,
      source: wallSource(title),
    }),
  ),
);
function seedCore(state) {
  const scene = list(state.scenes).find((s) => s.id === "old-watch");
  if (scene && !list(scene.terrain).some((t) => t.id === RUBBLE.id))
    scene.terrain = [...list(scene.terrain), copy(RUBBLE)];
  if (scene)
    for (const wall of [...COURTYARD_WALLS, ...COURTYARD_DOORS])
      if (!list(scene.walls).some((w) => w.id === wall.id))
        scene.walls = [...list(scene.walls), copy(wall)];
  const doran = state.actors?.doran;
  if (doran && !list(doran.inventory).some((row) => row.id === "sm-doran-handaxe")) {
    const {
      lootId: _loot,
      identified: _identified,
      ...row
    } = itemFromCatalog("srd2024:item:handaxe", { quantity: 2 });
    doran.inventory = [
      ...list(doran.inventory),
      { ...row, id: "sm-doran-handaxe", equipped: true },
    ];
  }
}
export function normalizeSlice(value, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Saved special-moves data comes from a newer version");
  const base = emptySlice();
  const source = isObject(value) ? value : {};
  const out = { ...base };
  for (const key of Object.keys(base)) {
    if (Array.isArray(base[key])) out[key] = list(source[key]);
    else if (isObject(base[key])) out[key] = isObject(source[key]) ? copy(source[key]) : base[key];
    else out[key] = Number.isInteger(source[key]) ? source[key] : base[key];
  }
  if (!["free", "out-of-turn", "all"].includes(out.settings.approval))
    out.settings = { ...out.settings, approval: "free" };
  return out;
}
export const sliceOf = (state) => (isObject(state?.ext?.[ID]) ? state.ext[ID] : null);
function writable(state) {
  const slice = sliceOf(state);
  if (!slice) throw Error("Special moves state is not initialized");
  return slice;
}

// ---------------------------------------------------------------- scene helpers

export const sceneOf = (state) =>
  list(state?.scenes).find((scene) => scene.id === state.activeSceneId) ?? null;
export const tokenOf = (state, actorId, scene = sceneOf(state)) =>
  list(scene?.tokens).find((token) => token.actorId === actorId) ?? null;
export const metersBetween = (scene, a, b) => segmentMeters(scene, a, b);
const pixelsPerMeter = (scene) => scene.gridSize / scene.metersPerCell;
export const featuresOf = (state, sceneId = state?.activeSceneId) =>
  list(sliceOf(state)?.features?.[sceneId]);
export function featureById(state, id, sceneId = state?.activeSceneId) {
  return featuresOf(state, sceneId).find((feature) => feature.id === id) ?? null;
}
const inCombat = (state) => state.combat?.active === true;
const turnKeyOf = (state) => (inCombat(state) ? combatTurnKey(state.combat) : null);
const actsNow = (state, actorId) =>
  !inCombat(state) || state.combat.order?.[state.combat.turn] === actorId;
const effective = (actor) => getEffectiveActor(actor);
export const sizeOf = (actor) => effective(actor)?.size ?? "medium";
const sizeIndex = (actor) => SIZES.indexOf(sizeOf(actor));
export function proficiencyBonus(actor) {
  const recorded = actor?.proficiencyBonus ?? actor?.combatProfile?.proficiencyBonus;
  if (Number.isFinite(recorded)) return recorded;
  const level = Number(actor?.level);
  return Number.isFinite(level) && level > 0 ? Math.ceil(level / 4) + 1 : 2;
}
export function abilityMod(actor, ability) {
  const score = effective(actor)?.abilities?.[ability];
  return Number.isFinite(score) ? mod(score) : null;
}
const SAMPLE_TEAMS = { livia: "party", doran: "party", mira: "party" };
export function teamOf(actor) {
  return (
    actor?.combatProfile?.team ??
    SAMPLE_TEAMS[actor?.id] ??
    (["goblin-1", "goblin-2"].includes(actor?.id) ? "watch" : null)
  );
}
export const opposed = (a, b) => {
  const [x, y] = [teamOf(a), teamOf(b)];
  return (x === "party" && y === "watch") || (x === "watch" && y === "party");
};
/** The Table's own observation rule (table.mjs canObserve). */
export function observes(state, actorId, role, scene = sceneOf(state)) {
  const actor = state.actors?.[actorId];
  const token = tokenOf(state, actorId, scene);
  return Boolean(
    actor &&
    token &&
    isActorAvailable(actor) &&
    (!actor.companion || canViewActor(actor, role, state)) &&
    (actor.visibility !== "private" || canViewActor(actor, role, state)) &&
    (canControlActor(actor, role, state) ||
      (!actor.hidden && !token.hidden && token.visible !== false)),
  );
}
/** Altitude above the ground in metres: B18's token elevation when its area is present. */
export function altitudeOf(state, actorId) {
  const token = tokenOf(state, actorId);
  if (!token) return 0;
  const annotations = state?.ext?.annotations;
  if (isObject(annotations?.elevations)) return Number(annotations.elevations[token.id]) || 0;
  return Number(sliceOf(state)?.altitudes?.[token.id]) || 0;
}
function setAltitude(state, actorId, meters) {
  const token = tokenOf(state, actorId);
  if (!token) return;
  const value = round(Math.max(0, meters), 2);
  const annotations = state?.ext?.annotations;
  const store = isObject(annotations?.elevations)
    ? annotations.elevations
    : (writable(state).altitudes ??= {});
  if (value === 0) delete store[token.id];
  else store[token.id] = value;
}

// ---------------------------------------------------------------- speeds and movement

export function speedsOf(state, actorId) {
  const actor = state.actors?.[actorId];
  const eff = effective(actor);
  const walk = getEffectiveSpeed(actor) ?? 0;
  const speeds = isObject(eff?.speeds) ? eff.speeds : {};
  const flight = sliceOf(state)?.flight?.[actorId];
  const fly = Math.max(Number(speeds.fly) || 0, Number(flight?.speed) || 0);
  const zero = getConditionMechanics(actor).speedZero === true;
  return {
    walk: zero ? 0 : walk,
    climb: zero ? 0 : Number(speeds.climb) || 0,
    swim: zero ? 0 : Number(speeds.swim) || 0,
    fly: zero ? 0 : fly,
    hover: flight?.hover === true || speeds.hover === true,
    flightSource: flight ?? null,
  };
}
/** Remaining movement: in combat the actor's budget, outside combat its speed (no limit). */
export function movementLeft(state, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor) return 0;
  return inCombat(state) ? Math.max(0, Number(actor.movement) || 0) : Infinity;
}
/** XCOM two-tier range (CRP-113) / dnd5e ruler (FVT-111): movement left and with a Dash. */
export function rangeTiers(state, actorId) {
  const actor = state.actors?.[actorId];
  const speed = Math.max(0, getEffectiveSpeed(actor) ?? 0);
  const base = inCombat(state) ? Math.max(0, Number(actor?.movement) || 0) : speed;
  const dashAvailable = !inCombat(state) || actor?.action === true;
  return { speed, base: round(base), dash: round(base + speed), dashAvailable };
}
export function tierOf(cost, tiers) {
  if (cost <= tiers.base + 0.01) return "normal";
  if (cost <= tiers.dash + 0.01) return "dash";
  return "beyond";
}
/**
 * Polygon of the points reachable from `start` with `budget` metres, sampled on `rays`
 * straight lines and following the scene's walls, terrain and distance rule.
 */
export function reachPolygon(scene, start, budget, { rays = 72, crawling = false, role } = {}) {
  if (!scene || !start || !(budget > 0)) return [];
  const ppm = pixelsPerMeter(scene);
  const far = budget * ppm * 1.5 + scene.gridSize;
  const clampPoint = (p) => ({
    x: Math.max(0, Math.min(scene.width, p.x)),
    y: Math.max(0, Math.min(scene.height, p.y)),
  });
  const points = [];
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    let target = clampPoint({ x: start.x + dir.x * far, y: start.y + dir.y * far });
    if (isSegmentBlocked(scene, start, target, "blocksMovement", { role })) {
      let lo = 0,
        hi = 1;
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) / 2;
        const p = {
          x: start.x + (target.x - start.x) * mid,
          y: start.y + (target.y - start.y) * mid,
        };
        if (isSegmentBlocked(scene, start, p, "blocksMovement", { role })) hi = mid;
        else lo = mid;
      }
      target = { x: start.x + (target.x - start.x) * lo, y: start.y + (target.y - start.y) * lo };
    }
    const path = tracePath(scene, start, [target], { budget, crawling, role });
    points.push(path.blocked ? { ...start } : { x: round(path.end.x, 1), y: round(path.end.y, 1) });
  }
  return points;
}

// ---------------------------------------------------------------- tests (checks and saves)

/** Modifier of a check, skill check or save from the effective sheet, with its parts. */
export function testModifier(state, actorId, { kind, ability, skill }) {
  const actor = state.actors?.[actorId];
  const eff = effective(actor);
  const abilityId = kind === "skill" ? SKILLS.get(skill)?.ability : ability;
  const parts = [];
  if (kind === "save" && Number.isFinite(eff?.savingThrows?.[abilityId]))
    parts.push({
      label: text("Tiro salvezza (scheda)", "Saving throw (sheet)"),
      value: eff.savingThrows[abilityId],
    });
  else if (kind === "skill" && Number.isFinite(eff?.skillModifiers?.[skill]))
    parts.push({
      label: text("Abilità (scheda)", "Skill (sheet)"),
      value: eff.skillModifiers[skill],
    });
  else {
    const value = abilityMod(actor, abilityId);
    if (value === null) return null;
    parts.push({ label: abilityName(abilityId), value });
    if (kind === "skill" && list(eff?.skills).includes(skill))
      parts.push({ label: text("Competenza", "Proficiency"), value: proficiencyBonus(eff) });
  }
  const mechanics = getConditionMechanics(actor);
  if (Number.isFinite(mechanics.d20Penalty) && mechanics.d20Penalty > 0)
    parts.push({ label: text("Indebolimento", "Exhaustion"), value: -mechanics.d20Penalty });
  return { value: parts.reduce((sum, part) => sum + part.value, 0), parts, ability: abilityId };
}
// Condition advantage/disadvantage on checks and saves (SRD conditions, EN 177–191).
function testRollMode(state, actorId, { kind, ability }) {
  const actor = state.actors?.[actorId];
  const reasons = [];
  if (kind === "save") {
    const rules = conditionSaveRules(actor, ability);
    if (rules.autoFail) return { mode: "auto-fail", reasons: rules.autoFailReasons };
    for (const r of rules.disadvantage) reasons.push({ mode: "disadvantage", name: r.name ?? r });
  } else if (hasCondition(actor, "poisoned"))
    reasons.push({ mode: "disadvantage", name: text("Avvelenato", "Poisoned") });
  return { mode: modeFrom(reasons.map((r) => r.mode)), reasons };
}
function modeFrom(modes) {
  const adv = modes.includes("advantage"),
    dis = modes.includes("disadvantage");
  return adv && !dis ? "advantage" : dis && !adv ? "disadvantage" : "normal";
}
/** Chance that a d20 test with this bonus reaches the DC (BG3's percentage, CRP-108). */
export function chanceToReach(bonus, dc, mode = "normal") {
  const single = Math.min(1, Math.max(0, (21 - (dc - bonus)) / 20));
  if (mode === "advantage") return 1 - (1 - single) ** 2;
  if (mode === "disadvantage") return single ** 2;
  return single;
}

// ---------------------------------------------------------------- common checks

function actorOf(state, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor || !isActorAvailable(actor))
    fail("unavailable", "Creatura non disponibile.", "Creature unavailable.");
  return actor;
}
/**
 * Reasons shared by every move: control, presence on the scene, the turn, pending
 * requests, the action economy (in combat only) and the conditions that stop it.
 */
function common(
  state,
  actorId,
  role,
  { action = false, bonus = false, movement = false, combat = false, move = false } = {},
) {
  const reasons = [];
  const actor = state.actors?.[actorId];
  if (!actor || !isActorAvailable(actor)) {
    reasons.push(reason("unavailable", "Creatura non disponibile.", "Creature unavailable."));
    return reasons;
  }
  if (!canControlActor(actor, role, state))
    reasons.push(
      reason(
        "not-controller",
        "Non controlli questa creatura.",
        "You do not control this creature.",
      ),
    );
  if (!tokenOf(state, actorId))
    reasons.push(
      reason(
        "no-token",
        "La creatura non è sulla scena attiva.",
        "The creature is not on the active scene.",
      ),
    );
  if (combat && !inCombat(state))
    reasons.push(
      reason(
        "needs-initiative",
        "Parte dell’azione di Attacco: prepara l’iniziativa (Avvia combattimento).",
        "Part of the Attack action: roll initiative first (Start combat).",
      ),
    );
  if (inCombat(state) && !actsNow(state, actorId))
    reasons.push(
      reason(
        "not-your-turn",
        "Non è il turno di questa creatura: puoi solo valutare.",
        "It is not this creature’s turn: preview only.",
      ),
    );
  if (actor.dead || actor.hp <= 0 || hasCondition(actor, "incapacitated"))
    reasons.push(
      reason(
        "cannot-act",
        "La creatura non può agire nello stato attuale.",
        "The creature cannot act in its current state.",
      ),
    );
  if (hasBlockingConsequences(state, actorId))
    reasons.push(
      reason(
        "pending",
        "Completa prima le richieste in attesa (Tiri e risultati).",
        "Complete the pending requests first (Rolls and results).",
      ),
    );
  if (inCombat(state) && action && actor.action !== true)
    reasons.push(
      reason(
        "action-spent",
        "Azione già spesa in questo turno.",
        "Action already spent this turn.",
      ),
    );
  if (inCombat(state) && bonus && actor.bonus !== true)
    reasons.push(reason("bonus-spent", "Azione bonus già spesa.", "Bonus Action already spent."));
  if (move) {
    const mechanics = getConditionMechanics(actor);
    if (mechanics.speedZero)
      reasons.push(
        reason(
          "speed-zero",
          "Velocità 0 per una condizione (per esempio Afferrato): non puoi muoverti.",
          "Speed 0 from a condition (for example Grappled): you cannot move.",
        ),
      );
    if (hasCondition(actor, "prone"))
      reasons.push(
        reason(
          "prone",
          "Sei Prono: rialzati prima (metà del movimento).",
          "You are Prone: stand up first (half your movement).",
        ),
      );
  }
  if (movement && inCombat(state) && !(Number(actor.movement) > 0))
    reasons.push(
      reason("no-movement", "Movimento esaurito in questo turno.", "No movement left this turn."),
    );
  return reasons;
}
const budgetReason = (cost, left) =>
  reason(
    "budget",
    `Costa ${fmt(cost)} m di movimento: te ne restano ${fmt(left)} m.`,
    `It costs ${fmt(cost, "en")} m of movement: you have ${fmt(left, "en")} m left.`,
  );
const fmt = (value, lang = "it") =>
  new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-GB", { maximumFractionDigits: 2 }).format(
    round(value, 2),
  );

// ---------------------------------------------------------------- history records

function recordMove(state, entry) {
  const slice = writable(state);
  const record = {
    id: entry.id,
    kind: entry.kind,
    actorId: entry.actorId,
    targetId: entry.targetId ?? null,
    sceneId: state.activeSceneId,
    from: entry.from ? { x: entry.from.x, y: entry.from.y } : null,
    to: entry.to ? { x: entry.to.x, y: entry.to.y } : null,
    meters: round(entry.meters ?? 0),
    cost: round(entry.cost ?? 0),
    altitude: entry.altitude ?? null,
    outcome: entry.outcome ? copy(entry.outcome) : null,
    turnKey: turnKeyOf(state),
    movementsBefore: list(state.movements).length,
    at: entry.at ?? new Date().toISOString(),
  };
  slice.moves.push(record);
  if (slice.moves.length > 200) slice.moves.splice(0, slice.moves.length - 200);
  return record;
}
const MOVE_NAMES = {
  move: text("Movimento", "Move"),
  dash: text("Movimento con Scatto", "Move with Dash"),
  "long-jump": text("Salto in lungo", "Long jump"),
  "high-jump": text("Salto in alto", "High jump"),
  climb: text("Arrampicata", "Climb"),
  swim: text("Nuoto", "Swim"),
  fly: text("Volo", "Fly"),
  fall: text("Caduta", "Fall"),
  drag: text("Trascinamento", "Drag"),
  pushed: text("Spinto", "Pushed"),
  dragged: text("Trascinato", "Dragged"),
  utilize: text("Usa un oggetto", "Utilize"),
  ride: text("Cavalcata", "Ride"),
  mount: text("In sella", "Mount"),
  dismount: text("Smonta", "Dismount"),
  approved: text("Movimento approvato dal DM", "Move approved by the DM"),
};
export const moveName = (kind) => MOVE_NAMES[kind] ?? text(kind, kind);
/**
 * Foundry movement history (FVT-112) and Roll20's last move (R20-135): core movements
 * (state.movements) and this area's moves, in the order they happened. `scope` "turn"
 * keeps the current combat turn; "all" everything since the DM cleared the history.
 */
export function movementHistory(state, actorId, { scope = "turn" } = {}) {
  const slice = sliceOf(state);
  const cleared = slice?.history?.cleared ?? null;
  const key = turnKeyOf(state);
  const rows = [];
  // Core movements a move of this area started (jump, swim, drag) show as that move.
  const covered = new Set(
    list(slice?.moves)
      .map((move) => move.coreMovementId)
      .filter(Boolean),
  );
  list(state.movements).forEach((movement, index) => {
    if (movement.actorId !== actorId || movement.sceneId !== state.activeSceneId) return;
    if (cleared && index < cleared.movements) return;
    if (covered.has(movement.id)) return;
    if (!(movement.traveledMeters > 0)) return;
    rows.push({
      order: index,
      id: movement.id,
      kind: movement.effectiveDash ? "dash" : "move",
      actorId,
      from: copy(movement.start),
      to: copy(movement.position),
      path: copy(list(movement.path).slice(0, movement.pathIndex).concat([movement.position])),
      meters: round(movement.traveledMeters),
      cost: round(movement.traveledCost ?? movement.traveledMeters),
      turnKey: movement.turnKey ?? null,
      core: true,
    });
  });
  list(slice?.moves).forEach((move, index) => {
    if (move.sceneId !== state.activeSceneId || !move.from || !move.to) return;
    if (cleared && index < cleared.moves) return;
    const order = move.movementsBefore - 0.5 + index * 1e-6;
    const row = (kind, from, to) =>
      rows.push({
        ...copy(move),
        kind,
        order,
        from: copy(from),
        to: copy(to),
        path: [copy(from), copy(to)],
        core: false,
      });
    if (move.actorId === actorId && move.kind !== "pushed") row(move.kind, move.from, move.to);
    else if (move.targetId === actorId && move.kind === "pushed") row("pushed", move.from, move.to);
    else if (move.targetId === actorId && move.kind === "drag" && move.dragged)
      row("dragged", move.dragged.from, move.dragged.to);
    else if (move.targetId === actorId && move.kind === "ride") row("ride", move.from, move.to);
  });
  rows.sort((a, b) => a.order - b.order);
  return scope === "turn" && key ? rows.filter((row) => row.turnKey === key) : rows;
}
export const lastMove = (state, actorId) =>
  movementHistory(state, actorId, { scope: "all" }).at(-1) ?? null;
export function clearHistories(state, role) {
  if (!runsSession(state, role))
    fail(
      "dm-only",
      "Solo il DM azzera lo storico dei movimenti.",
      "Only the DM clears movement histories.",
    );
  writable(state).history.cleared = {
    movements: list(state.movements).length,
    moves: writable(state).moves.length,
  };
}

// ---------------------------------------------------------------- attempts (request queue)

function assistedMode(state) {
  const campaigns = state.ext?.["campaign-settings"];
  return campaigns && campaigns.campaigns?.[state.campaign?.id]?.policy?.automation !== "automatic"
    ? "assisted"
    : undefined;
}
// Faces accepted before an Undo are reused by an identical retry (I-229), as combat.mjs
// does for its own attempts: the same log evidence, keyed by the attempt's retryKey.
function reversedEvidence(state, attempt) {
  const log = list(state.log);
  const reverted = new Set(log.filter((e) => e.kind === "correction").map((e) => e.revertsId));
  const live = new Set(list(state.combatAttempts).map((a) => a.id));
  const matching = log.flatMap((entry) =>
    list(entry.rolls)
      .filter(
        (roll) =>
          roll.source === "combat" &&
          roll.retryKey === attempt.retryKey &&
          roll.status !== "superseded" &&
          Array.isArray(roll.values) &&
          !(reverted.has(entry.id) && live.has(roll.attemptId)),
      )
      .map((roll) => ({ roll, reverted: reverted.has(entry.id) })),
  );
  if (!matching.at(-1)?.reverted) return null;
  const previous = matching.at(-1).roll.attemptId;
  const evidence = {};
  for (const { roll } of matching.filter((m) => m.reverted && m.roll.attemptId === previous))
    evidence[attempt.id + roll.requestId.slice(previous.length)] = {
      acceptedValues: copy(roll.values),
      dice: copy(roll.dice),
      mode: roll.mode ?? null,
      personal: roll.personal === true,
      owner: roll.owner,
      reusedFrom: roll.requestId,
    };
  return evidence;
}
/**
 * One attempt of this area in the shared request queue. `requests`: [{roller, kind
 * ("check"|"save"|"damage"), dice, modifier, dc, rollMode, label, modifierSources}];
 * `outcomes`: creatures whose result the resolver settles; `move` travels with it.
 */
function enqueue(state, { id, actorId, move, label, source, requests, outcomes, targets = [] }) {
  const actor = state.actors[actorId];
  const attempt = {
    id,
    actorId,
    actorName: actor.name,
    actionId: ACTION_PREFIX + move.kind,
    actionName: copy(label),
    kind: KIND,
    mode: null,
    status: "pending",
    requests: [],
    outcomes: outcomes.map((o) => ({
      actorId: o,
      name: state.actors[o]?.name ?? "",
      status: "pending",
    })),
    targets: targets.map((t) => ({
      actorId: t,
      name: state.actors[t]?.name ?? "",
      knownToPlayer: !state.actors[t]?.hidden && !tokenOf(state, t)?.hidden,
    })),
    cost: {},
    source: copy(source),
    damageType: move.damageType ?? null,
    turnKey: turnKeyOf(state),
    selection: {
      targetIds: [...targets],
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
    applyMode: assistedMode(state),
    specialMove: copy(move),
  };
  attempt.retryKey = JSON.stringify([
    KIND,
    move.kind,
    actorId,
    move.targetId ?? null,
    attempt.turnKey,
  ]);
  const reused = reversedEvidence(state, attempt);
  if (reused) attempt.rollEvidence = reused;
  requests.forEach((r, index) => {
    const roller = state.actors[r.roller];
    const requestId = attempt.id + "-" + r.kind + "-" + roller.id + "-" + index;
    const request = {
      id: requestId,
      kind: r.kind,
      actorId: roller.id,
      owner: roller.owner,
      personal: roller.visibility === "private",
      dice: copy(r.dice ?? [{ count: r.rollMode && r.rollMode !== "normal" ? 2 : 1, sides: 20 }]),
      modifier: r.modifier ?? 0,
      rollMode: r.rollMode ?? "normal",
      status: "pending",
      dc: Number.isInteger(r.dc) ? r.dc : null,
      targetId: r.targetId ?? null,
      label: copy(r.label ?? null),
      modifierSources: copy(r.modifierSources ?? []),
      step: r.step ?? null,
      // A DC the DM set keeps out of the player's roll dialog (combat-ui shows the rest).
      ...(r.dcHidden ? { dcHidden: true } : {}),
    };
    Object.assign(request, knownEvidence(attempt.rollEvidence?.[requestId], request));
    attempt.requests.push(request);
  });
  (state.combatAttempts ||= []).push(attempt);
  return attempt;
}
function testRequest(
  state,
  rollerId,
  test,
  { dc, label, step, extraModes = [], dcHidden = false } = {},
) {
  const modifier = testModifier(state, rollerId, test);
  if (!modifier)
    fail(
      "score-missing",
      "Manca il punteggio di caratteristica sulla scheda: correggi la scheda.",
      "The ability score is missing on the sheet: correct the sheet.",
    );
  const modes = testRollMode(state, rollerId, test);
  const rollMode =
    modes.mode === "auto-fail"
      ? "normal"
      : modeFrom([...modes.reasons.map((r) => r.mode), ...extraModes]);
  return {
    roller: rollerId,
    kind: test.kind === "save" ? "save" : "check",
    modifier: modifier.value,
    modifierSources: modifier.parts,
    rollMode,
    dc,
    label,
    step,
    dcHidden,
    autoFail: modes.mode === "auto-fail",
  };
}
const requestTotal = (request) => (request?.status === "resolved" ? request.total : null);

// ---------------------------------------------------------------- jumping

/** Long and high jump distances (SRD EN 183–185 / IT 214; cat's Jumper uses Dexterity). */
export function jumpProfile(state, actorId, { runUp = null } = {}) {
  const actor = state.actors?.[actorId];
  const eff = effective(actor);
  const jumper = list(eff?.combatProfile?.traits).some((t) => t.id === "jumper-dexterity");
  const ability = jumper ? "dex" : "str";
  const score = eff?.abilities?.[ability];
  const running = runUp ?? hasRunUp(state, actorId);
  const longFull = Number.isFinite(score) ? round(score * 0.3, 2) : 0;
  const highFull = Number.isFinite(score) ? round(Math.max(0, 3 + mod(score)) * 0.3, 2) : 0;
  return {
    ability,
    score,
    jumper,
    runUp: running,
    longFull,
    highFull,
    long: running ? longFull : round(longFull / 2, 2),
    high: running ? highFull : round(highFull / 2, 2),
  };
}
/** In combat: the creature's last movement this turn covered at least 3 m on foot. */
export function hasRunUp(state, actorId) {
  if (!inCombat(state)) return false;
  const key = turnKeyOf(state);
  const token = tokenOf(state, actorId);
  const last = list(state.movements)
    .filter((m) => m.actorId === actorId && m.turnKey === key)
    .at(-1);
  return Boolean(
    last &&
    last.status === "resolved" &&
    last.traveledMeters >= 3 - 0.01 &&
    token &&
    Math.hypot(token.x - last.position.x, token.y - last.position.y) < 0.5,
  );
}
function inTerrain(scene, point) {
  return list(scene?.terrain).some(
    (r) =>
      r.kind === "difficult" &&
      point.x >= r.x - EPS &&
      point.x <= r.x + r.width + EPS &&
      point.y >= r.y - EPS &&
      point.y <= r.y + r.height + EPS,
  );
}
export function previewJump(state, input, role) {
  const { actorId, kind = "long" } = input;
  const scene = sceneOf(state);
  const token = tokenOf(state, actorId);
  const actor = state.actors?.[actorId];
  const reasons = common(state, actorId, role, { movement: true, move: true });
  const declaredRunUp = inCombat(state) ? null : input.runUp === true;
  const profile = actor ? jumpProfile(state, actorId, { runUp: declaredRunUp }) : null;
  const result = {
    kind,
    reasons,
    profile,
    source: kind === "high" ? SOURCES.highJump : SOURCES.longJump,
  };
  if (!scene || !token || !profile) return { ...result, available: false };
  if (!Number.isFinite(profile.score))
    reasons.push(
      reason(
        "score",
        "Manca il punteggio di Forza sulla scheda.",
        "The Strength score is missing on the sheet.",
      ),
    );
  const left = movementLeft(state, actorId);
  if (kind === "high") {
    result.height = profile.high;
    result.cost = profile.high;
    result.reach = profile.high;
    if (profile.high <= 0)
      reasons.push(
        reason(
          "no-height",
          "Con questa Forza il salto in alto è di 0 m.",
          "With this Strength the high jump is 0 m.",
        ),
      );
    if (result.cost > left + EPS) reasons.push(budgetReason(result.cost, left));
    return { ...result, available: reasons.length === 0 };
  }
  let point = input.point;
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    reasons.push(
      reason(
        "choose-landing",
        "Indica dove atterrare sulla mappa.",
        "Point at where to land on the map.",
      ),
    );
    return { ...result, available: false };
  }
  let distance = metersBetween(scene, token, point);
  // A pointer a hair past the longest jump (a pixel on a zoomed map) lands at the limit.
  if (distance > profile.long + 0.01 && distance <= profile.long + 0.15 && profile.long > 0) {
    const f = profile.long / distance;
    point = {
      x: round(token.x + (point.x - token.x) * f, 2),
      y: round(token.y + (point.y - token.y) * f, 2),
    };
    distance = metersBetween(scene, token, point);
  }
  Object.assign(result, {
    from: { x: token.x, y: token.y },
    landing: { x: point.x, y: point.y },
    distance: round(distance),
    cost: round(distance),
    max: profile.long,
  });
  if (distance < 0.3)
    reasons.push(
      reason(
        "too-short",
        "Scegli un punto di atterraggio diverso dalla posizione attuale.",
        "Choose a landing point away from where you stand.",
      ),
    );
  if (distance > profile.long + 0.01)
    reasons.push(
      reason(
        "too-far",
        `Troppo lontano: salto massimo ${fmt(profile.long)} m ${profile.runUp ? "con rincorsa" : "da fermo (con 3 m di rincorsa: " + fmt(profile.longFull) + " m)"}.`,
        `Too far: longest jump ${fmt(profile.long, "en")} m ${profile.runUp ? "with a run-up" : "standing (with a 3 m run-up: " + fmt(profile.longFull, "en") + " m)"}.`,
      ),
    );
  if (isSegmentBlocked(scene, token, point, "blocksMovement", { role }))
    reasons.push(
      reason(
        "blocked",
        "Un muro o un ostacolo alto blocca il salto.",
        "A wall or a tall obstacle blocks the jump.",
      ),
    );
  const placement = previewTokenPlacement(scene, point, { excludeActorId: actorId });
  if (!placement.available)
    reasons.push(
      reason(
        "landing",
        "Il punto di atterraggio è occupato o fuori dalla scena.",
        "The landing point is occupied or outside the scene.",
      ),
    );
  if (result.cost > left + EPS) reasons.push(budgetReason(result.cost, left));
  result.landingCheck = inTerrain(scene, point)
    ? { skill: "acrobatics", ability: "dex", dc: 10 }
    : null;
  const crossed = tracePath(scene, token, [point], { role });
  result.overTerrain = crossed.segments.some((s) => s.multiplier > 1);
  return { ...result, available: reasons.length === 0 };
}
export function commitJump(state, input, role, { operationId }) {
  const preview = previewJump(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  const token = tokenOf(state, input.actorId);
  const from = { x: token.x, y: token.y };
  if (preview.kind === "high") {
    if (inCombat(state)) spendMovement(actor, preview.cost);
    return recordMove(state, {
      id: operationId,
      kind: "high-jump",
      actorId: actor.id,
      from,
      to: from,
      meters: preview.height,
      cost: preview.cost,
      outcome: text(
        `Salto in alto di ${fmt(preview.height)} m: raggiungi quell’altezza più una volta e mezza la tua statura.`,
        `High jump of ${fmt(preview.height, "en")} m: you reach that height plus one and a half times your height.`,
      ),
    });
  }
  let movement = null;
  // The jump uses movement: through the core movement it can provoke opportunity attacks.
  // Over difficult terrain the jump still costs 1:1, so the token is placed directly.
  if (!preview.overTerrain) {
    movement = beginMovement(
      state,
      {
        id: operationId + ":move",
        actorId: actor.id,
        point: preview.landing,
        waypoints: [],
        geometryKey: geometryKey(sceneOf(state)),
      },
      role,
    );
  } else {
    Object.assign(token, preview.landing);
    if (inCombat(state)) spendMovement(actor, preview.cost);
  }
  const landed = !movement || movement.status === "resolved";
  const record = recordMove(state, {
    id: operationId,
    kind: "long-jump",
    actorId: actor.id,
    from,
    to: preview.landing,
    meters: preview.distance,
    cost: preview.cost,
    outcome: landed
      ? text(
          `Salto in lungo di ${fmt(preview.distance)} m.`,
          `Long jump of ${fmt(preview.distance, "en")} m.`,
        )
      : text(
          "Salto in corso: una reazione lo interrompe (Tiri e risultati).",
          "Jump under way: a reaction interrupts it (Rolls and results).",
        ),
  });
  // Legacy core movements are not duplicated in the history: the jump replaces them.
  if (movement) record.coreMovementId = movement.id;
  if (landed && preview.landingCheck) landingCheck(state, operationId, actor.id);
  else if (preview.landingCheck) record.landingPending = true;
  return record;
}
function landingCheck(state, operationId, actorId) {
  const request = testRequest(
    state,
    actorId,
    { kind: "skill", skill: "acrobatics" },
    {
      dc: 10,
      label: text("Atterraggio su terreno difficile", "Landing in difficult terrain"),
    },
  );
  return enqueue(state, {
    id: operationId + ":landing",
    actorId,
    move: { kind: "landing", actorId },
    label: text("Salto: atterraggio su terreno difficile", "Jump: landing in difficult terrain"),
    source: SOURCES.longJump,
    requests: [request],
    outcomes: [actorId],
  });
}
/** A jump interrupted by a reaction that later landed in difficult terrain: ask now. */
export function commitLandingCheck(state, input, role, { operationId }) {
  const slice = writable(state);
  const record = slice.moves.find((m) => m.id === input.moveId);
  if (!record?.landingPending || !canControlActor(state.actors[record.actorId], role, state))
    fail("no-landing", "Nessun atterraggio da verificare.", "No landing to check.");
  record.landingPending = false;
  return landingCheck(state, operationId, record.actorId);
}

// ---------------------------------------------------------------- falling

/** Falling (SRD EN 182 / IT 205): 1d6 per 3 m, at most 20d6, Prone unless no damage. */
export function previewFall(state, input, role) {
  const { actorId } = input;
  const actor = state.actors?.[actorId];
  const reasons = [];
  if (!actor || !isActorAvailable(actor))
    reasons.push(reason("unavailable", "Creatura non disponibile.", "Creature unavailable."));
  else if (!runsSession(state, role) && !canControlActor(actor, role, state))
    reasons.push(
      reason(
        "not-controller",
        "Solo chi controlla la creatura o il DM la fa cadere.",
        "Only its controller or the DM makes it fall.",
      ),
    );
  const altitude = Number.isFinite(input.meters) ? input.meters : altitudeOf(state, actorId);
  if (!(altitude > 0))
    reasons.push(
      reason(
        "on-ground",
        "La creatura è già a terra (quota 0 m).",
        "The creature is already on the ground (0 m).",
      ),
    );
  const dice = Math.min(20, Math.floor(altitude / 3 + EPS));
  const token = tokenOf(state, actorId);
  const water = token
    ? featuresOf(state).find(
        (f) => f.kind === "water" && !f.drained && Math.hypot(token.x - f.x, token.y - f.y) <= f.r,
      )
    : null;
  return {
    available: reasons.length === 0,
    reasons,
    meters: round(Math.max(0, altitude)),
    dice,
    formula: dice ? `${dice}d6` : "0",
    prone: dice > 0,
    water: water ? { featureId: water.id, dc: 15 } : null,
    source: SOURCES.falling,
  };
}
export function commitFall(state, input, role, { operationId }) {
  const preview = previewFall(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  return startFall(state, input.actorId, preview, operationId, input.dive === true);
}
function startFall(state, actorId, preview, operationId, dive = false) {
  const slice = writable(state);
  setAltitude(state, actorId, 0);
  delete slice.perches[actorId];
  const flight = slice.flight[actorId];
  if (flight) flight.airborne = false;
  const token = tokenOf(state, actorId);
  recordMove(state, {
    id: operationId,
    kind: "fall",
    actorId,
    from: token,
    to: token,
    meters: preview.meters,
    altitude: 0,
    outcome: preview.dice
      ? text(
          `Cade da ${fmt(preview.meters)} m: ${preview.formula} contundenti.`,
          `Falls ${fmt(preview.meters, "en")} m: ${preview.formula} bludgeoning.`,
        )
      : text(
          `Cade da ${fmt(preview.meters)} m: nessun danno.`,
          `Falls ${fmt(preview.meters, "en")} m: no damage.`,
        ),
  });
  if (!preview.dice) return null;
  const requests = [];
  if (dive && preview.water) {
    const actor = state.actors[actorId];
    const athletics =
      testModifier(state, actorId, { kind: "skill", skill: "athletics" })?.value ?? -99;
    const acrobatics =
      testModifier(state, actorId, { kind: "skill", skill: "acrobatics" })?.value ?? -99;
    if (actor.reaction !== false) {
      requests.push(
        testRequest(
          state,
          actorId,
          { kind: "skill", skill: athletics >= acrobatics ? "athletics" : "acrobatics" },
          {
            dc: 15,
            label: text("Tuffo: dimezza i danni", "Dive: halves the damage"),
            step: "dive",
          },
        ),
      );
      if (inCombat(state)) actor.reaction = false;
    }
  }
  requests.push({
    roller: actorId,
    kind: "damage",
    dice: [{ count: preview.dice, sides: 6 }],
    modifier: 0,
    label: text("Danni da caduta", "Falling damage"),
    step: "damage",
  });
  return enqueue(state, {
    id: operationId + ":fall",
    actorId,
    move: { kind: "fall", actorId, damageType: "bludgeoning", meters: preview.meters },
    label: text(`Caduta da ${fmt(preview.meters)} m`, `Fall of ${fmt(preview.meters, "en")} m`),
    source: SOURCES.falling,
    requests,
    outcomes: [actorId],
  });
}
/** dnd5e "falling" status (FVT-145): an airborne creature that can no longer fly. */
export function fallingState(state, actorId) {
  const altitude = altitudeOf(state, actorId);
  if (!(altitude > 0)) return null;
  const slice = sliceOf(state);
  const flight = slice?.flight?.[actorId];
  const speeds = speedsOf(state, actorId);
  const actor = state.actors?.[actorId];
  if (!flight?.airborne && !(Number(effective(actor)?.speeds?.fly) > 0)) return null;
  if (speeds.hover) return null;
  const cause = hasCondition(actor, "prone")
    ? text("Prono", "Prone")
    : hasCondition(actor, "incapacitated")
      ? text("Incapacitato", "Incapacitated")
      : !(speeds.fly > 0)
        ? text("velocità di volo 0", "Fly Speed 0")
        : null;
  return cause ? { altitude, cause } : null;
}

// ---------------------------------------------------------------- climbing and swimming

function pointSegment(p, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return { x: a.x + dx * t, y: a.y + dy * t };
}
/** Climbable surfaces within reach (1.5 m) of the creature, nearest first. */
export function climbableNear(state, actorId) {
  const scene = sceneOf(state);
  const token = tokenOf(state, actorId);
  if (!scene || !token) return [];
  return featuresOf(state)
    .filter((f) => f.kind === "climb")
    .map((f) => ({
      feature: f,
      meters: metersBetween(scene, token, pointSegment(token, f.a, f.b)),
    }))
    .filter((row) => row.meters <= 1.5 + 0.01)
    .sort((a, b) => a.meters - b.meters);
}
/** Climbing (SRD EN 178–179 / IT 214): +1 m per metre, +2 in difficult terrain. */
export function previewClimb(state, input, role) {
  const { actorId, featureId } = input;
  const reasons = common(state, actorId, role, { movement: true, move: true });
  const scene = sceneOf(state);
  const token = tokenOf(state, actorId);
  const feature = featureById(state, featureId);
  const result = { reasons, source: SOURCES.climbing, featureId };
  if (!feature || feature.kind !== "climb") {
    reasons.push(
      reason("no-surface", "Scegli una superficie da scalare.", "Choose a surface to climb."),
    );
    return { ...result, available: false };
  }
  const near = token
    ? metersBetween(scene, token, pointSegment(token, feature.a, feature.b))
    : Infinity;
  if (near > 1.5 + 0.01)
    reasons.push(
      reason(
        "too-far",
        `Avvicinati a ${fmt(near)} m → entro 1,5 m dalla parete prima di arrampicarti.`,
        `Move from ${fmt(near, "en")} m to within 1.5 m of the wall before climbing.`,
      ),
    );
  const current = altitudeOf(state, actorId);
  const height = Math.max(0, Math.min(feature.height, Number(input.height)));
  if (!Number.isFinite(Number(input.height)))
    reasons.push(
      reason("choose-height", "Indica a che altezza arrivare.", "Choose the height to reach."),
    );
  const delta = Math.abs(height - current);
  if (Number.isFinite(delta) && delta < 0.1)
    reasons.push(
      reason("same-height", "Sei già a questa altezza.", "You are already at this height."),
    );
  const speeds = speedsOf(state, actorId);
  const difficult = token ? inTerrain(scene, token) : false;
  const factor = (speeds.climb > 0 ? 1 : 2) + (difficult ? 1 : 0);
  const cost = round(delta * factor);
  const left = movementLeft(state, actorId);
  if (cost > left + EPS) reasons.push(budgetReason(cost, left));
  Object.assign(result, {
    feature,
    from: current,
    height: round(height),
    delta: round(delta),
    factor,
    cost,
    climbSpeed: speeds.climb,
    difficult,
    check: feature.dc ? { skill: "athletics", ability: "str", dc: feature.dc } : null,
  });
  return { ...result, available: reasons.length === 0 };
}
function applyClimb(state, actorId, move) {
  const actor = state.actors[actorId];
  if (inCombat(state) && move.cost > 0) spendMovement(actor, move.cost);
  setAltitude(state, actorId, move.height);
  const slice = writable(state);
  if (move.height > 0) slice.perches[actorId] = { featureId: move.featureId };
  else delete slice.perches[actorId];
}
export function commitClimb(state, input, role, { operationId }) {
  const preview = previewClimb(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const token = tokenOf(state, input.actorId);
  const move = {
    kind: "climb",
    actorId: input.actorId,
    featureId: preview.featureId,
    height: preview.height,
    cost: preview.cost,
    from: preview.from,
  };
  if (preview.check) {
    const request = testRequest(
      state,
      input.actorId,
      { kind: "skill", skill: "athletics" },
      {
        dc: preview.check.dc,
        label: text("Parete scivolosa", "Slippery wall"),
      },
    );
    return enqueue(state, {
      id: operationId,
      actorId: input.actorId,
      move,
      label: text(`Arrampicata: ${preview.feature.name.it}`, `Climb: ${preview.feature.name.en}`),
      source: SOURCES.climbing,
      requests: [request],
      outcomes: [input.actorId],
    });
  }
  applyClimb(state, input.actorId, move);
  return recordMove(state, {
    id: operationId,
    kind: "climb",
    actorId: input.actorId,
    from: token,
    to: token,
    meters: preview.delta,
    cost: preview.cost,
    altitude: preview.height,
    outcome: text(
      `Arriva a ${fmt(preview.height)} m (${fmt(preview.cost)} m di movimento).`,
      `Reaches ${fmt(preview.height, "en")} m (${fmt(preview.cost, "en")} m of movement).`,
    ),
  });
}
// Length of the path inside each water feature that has not been drained.
function waterMeters(state, scene, points) {
  const waters = featuresOf(state).filter((f) => f.kind === "water" && !f.drained);
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    for (const w of waters) {
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const fx = a.x - w.x,
        fy = a.y - w.y;
      const A = dx * dx + dy * dy;
      if (A < EPS) continue;
      const B = 2 * (fx * dx + fy * dy),
        C = fx * fx + fy * fy - w.r * w.r;
      const disc = B * B - 4 * A * C;
      if (disc <= 0) continue;
      const s = Math.sqrt(disc);
      const t1 = Math.max(0, (-B - s) / (2 * A)),
        t2 = Math.min(1, (-B + s) / (2 * A));
      if (t2 > t1)
        total += segmentMeters(
          scene,
          { x: a.x + dx * t1, y: a.y + dy * t1 },
          { x: a.x + dx * t2, y: a.y + dy * t2 },
        );
    }
  }
  return total;
}
/** Swimming (SRD EN 189 / IT 210): +1 m per metre in water, unless a Swim Speed is used. */
export function previewSwim(state, input, role) {
  const { actorId, point, waypoints = [] } = input;
  const reasons = common(state, actorId, role, { movement: true, move: true });
  const scene = sceneOf(state);
  const token = tokenOf(state, actorId);
  const result = { reasons, source: SOURCES.swimming };
  if (!scene || !token || !point) {
    if (!point)
      reasons.push(
        reason("choose-destination", "Indica dove arrivare.", "Point at your destination."),
      );
    return { ...result, available: false };
  }
  const path = tracePath(scene, token, [...waypoints, point], { role });
  const inWater = waterMeters(state, scene, [token, ...waypoints, point]);
  const speeds = speedsOf(state, actorId);
  const extra = speeds.swim > 0 ? 0 : inWater;
  const cost = round(path.totalCost + extra);
  const left = movementLeft(state, actorId);
  if (path.blocked)
    reasons.push(path.reasons.at(-1) ?? reason("blocked", "Percorso bloccato.", "Path blocked."));
  if (inWater < 0.05)
    reasons.push(
      reason(
        "no-water",
        "Nessuna acqua sul percorso: usa Muovi.",
        "No water on this path: use Move.",
      ),
    );
  if (cost > left + EPS) reasons.push(budgetReason(cost, left));
  Object.assign(result, {
    from: { x: token.x, y: token.y },
    to: { x: point.x, y: point.y },
    waypoints: copy(waypoints),
    meters: round(path.distance),
    water: round(inWater),
    extra: round(extra),
    cost,
    swimSpeed: speeds.swim,
    path,
  });
  return { ...result, available: reasons.length === 0 };
}
export function commitSwim(state, input, role, { operationId }) {
  const preview = previewSwim(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  // The swimming surcharge is spent first; the core movement then pays the path itself
  // (walls, terrain, opportunity attacks), so the whole move costs what the preview said.
  if (inCombat(state) && preview.extra > 0) spendMovement(actor, preview.extra);
  const movement = beginMovement(
    state,
    {
      id: operationId + ":move",
      actorId: actor.id,
      point: preview.to,
      waypoints: preview.waypoints,
      geometryKey: geometryKey(sceneOf(state)),
    },
    role,
  );
  const record = recordMove(state, {
    id: operationId,
    kind: "swim",
    actorId: actor.id,
    from: preview.from,
    to: preview.to,
    meters: preview.meters,
    cost: preview.cost,
    outcome: text(
      `Nuota per ${fmt(preview.water)} m in acqua: ${fmt(preview.cost)} m di movimento.`,
      `Swims ${fmt(preview.water, "en")} m in water: ${fmt(preview.cost, "en")} m of movement.`,
    ),
  });
  record.coreMovementId = movement.id;
  return record;
}

// ---------------------------------------------------------------- flying

/** Flying (SRD EN 182 / IT 219): a Fly Speed from the sheet, a form or a granted effect. */
export function previewFly(state, input, role) {
  const { actorId } = input;
  const reasons = common(state, actorId, role, { move: true });
  const scene = sceneOf(state);
  const token = tokenOf(state, actorId);
  const actor = state.actors?.[actorId];
  const speeds = actor ? speedsOf(state, actorId) : { fly: 0 };
  const result = { reasons, source: SOURCES.flying, flightCost: SOURCES.flightCost };
  if (!(speeds.fly > 0)) {
    reasons.push(
      reason(
        "no-fly-speed",
        "Nessuna velocità di volo: serve un incantesimo, un oggetto o una forma che la conceda (il DM può registrarla).",
        "No Fly Speed: it needs a spell, an item or a form that grants it (the DM can record one).",
      ),
    );
    return { ...result, available: false };
  }
  if (!scene || !token) return { ...result, available: false };
  const point = input.point ?? { x: token.x, y: token.y };
  const from = altitudeOf(state, actorId);
  const altitude = Math.max(
    0,
    Math.min(300, Number.isFinite(Number(input.altitude)) ? Number(input.altitude) : from),
  );
  const horizontal = metersBetween(scene, token, point);
  if (horizontal > 0.05 && isSegmentBlocked(scene, token, point, "blocksMovement", { role }))
    reasons.push(reason("blocked", "Un muro blocca il volo.", "A wall blocks the flight."));
  if (
    horizontal > 0.05 &&
    !previewTokenPlacement(scene, point, { excludeActorId: actorId }).available
  )
    reasons.push(
      reason("occupied", "Lo spazio di arrivo è occupato.", "The destination space is occupied."),
    );
  const cost = round(horizontal + Math.abs(altitude - from));
  if (cost < 0.05)
    reasons.push(
      reason(
        "no-change",
        "Scegli una destinazione o una quota diversa.",
        "Choose another destination or altitude.",
      ),
    );
  const spent = Number(actor.movementSpent) || 0;
  const dash = Number.isInteger(actor.dashCount) ? actor.dashCount : 0;
  const left = inCombat(state) ? Math.max(0, speeds.fly * (1 + dash) - spent) : Infinity;
  if (cost > left + EPS) reasons.push(budgetReason(cost, left));
  Object.assign(result, {
    from: { x: token.x, y: token.y, altitude: from },
    to: { x: point.x, y: point.y, altitude: round(altitude) },
    horizontal: round(horizontal),
    cost,
    flySpeed: speeds.fly,
    hover: speeds.hover,
    left,
  });
  return { ...result, available: reasons.length === 0 };
}
export function commitFly(state, input, role, { operationId }) {
  const preview = previewFly(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  const token = tokenOf(state, input.actorId);
  Object.assign(token, { x: preview.to.x, y: preview.to.y });
  setAltitude(state, actor.id, preview.to.altitude);
  const slice = writable(state);
  slice.flight[actor.id] = { ...(slice.flight[actor.id] ?? {}), airborne: preview.to.altitude > 0 };
  delete slice.perches[actor.id];
  if (inCombat(state)) {
    // Switching speeds (SRD "Speed"): what was moved is subtracted from the walking speed too.
    const walk = Math.max(0, getEffectiveSpeed(actor) ?? 0);
    const dash = Number.isInteger(actor.dashCount) ? actor.dashCount : 0;
    actor.movementSpent = round((Number(actor.movementSpent) || 0) + preview.cost, 6);
    actor.movement = Math.max(0, round(walk * (1 + dash) - actor.movementSpent, 6));
  }
  return recordMove(state, {
    id: operationId,
    kind: "fly",
    actorId: actor.id,
    from: preview.from,
    to: preview.to,
    meters: preview.horizontal,
    cost: preview.cost,
    altitude: preview.to.altitude,
    outcome: text(
      `Vola a quota ${fmt(preview.to.altitude)} m (${fmt(preview.cost)} m di volo).`,
      `Flies at ${fmt(preview.to.altitude, "en")} m (${fmt(preview.cost, "en")} m of flight).`,
    ),
  });
}
/** DM: record a Fly Speed granted by an effect (the Fly spell, a potion...). */
export function commitGrantFlight(state, input, role) {
  if (!runsSession(state, role))
    fail("dm-only", "Solo il DM registra un volo concesso.", "Only the DM records granted flight.");
  const actor = actorOf(state, input.actorId);
  const slice = writable(state);
  if (input.revoke) {
    const was = slice.flight[actor.id];
    delete slice.flight[actor.id];
    return { revoked: true, falling: Boolean(was?.airborne && altitudeOf(state, actor.id) > 0) };
  }
  const speed = Number(input.speed);
  if (!Number.isFinite(speed) || speed <= 0 || speed > 60)
    fail("speed", "Velocità di volo tra 0,3 e 60 m.", "Fly Speed between 0.3 and 60 m.");
  const label = String(input.label ?? "")
    .trim()
    .slice(0, 80);
  if (!label)
    fail(
      "label",
      "Scrivi da dove viene il volo (per esempio l’incantesimo Volare).",
      "Write where the flight comes from (for example the Fly spell).",
    );
  slice.flight[actor.id] = {
    speed: round(speed),
    hover: input.hover === true,
    label,
    airborne: false,
  };
  return slice.flight[actor.id];
}

// ---------------------------------------------------------------- grapple, shove, drag

const REACH = 1.5;
/** Hands in use: the active weapon set (B36) or equipped weapons, plus a shield. */
export function handsInUse(actor) {
  const rows = list(actor?.inventory).filter((row) => row.equipped && (row.quantity ?? 1) > 0);
  const sets = actor?.weaponSets;
  const inSet = (row) =>
    !sets ||
    [sets[sets.active]].flat().filter(Boolean).includes(row.id) ||
    row.armor?.category === "shield";
  let hands = 0;
  for (const row of rows) {
    if (row.armor?.category === "shield" || row.srdId === "srd2024:item:shield") hands += 1;
    else if (
      (row.kind === "weapon" || row.weapon) &&
      inSet(row) &&
      !row.weapon?.properties?.includes("thrown")
    )
      hands += row.weapon?.properties?.includes("two-handed") ? 2 : 1;
  }
  return Math.min(2, hands);
}
export const saveDC = (actor) =>
  8 + (abilityMod(actor, "str") ?? 0) + proficiencyBonus(effective(actor));
/** The better of Strength and Dexterity saves, the target's own choice (SRD EN 190). */
function bestSave(state, targetId) {
  const str = testModifier(state, targetId, { kind: "save", ability: "str" });
  const dex = testModifier(state, targetId, { kind: "save", ability: "dex" });
  if (!str && !dex) return null;
  return (dex?.value ?? -99) > (str?.value ?? -99)
    ? { ability: "dex", ...dex }
    : { ability: "str", ...str };
}
export function grappleOf(state, actorId) {
  return list(sliceOf(state)?.grapples).filter(
    (g) => g.grapplerId === actorId || g.targetId === actorId,
  );
}
/** Targets of a touch move (Grapple, Shove, Help): within reach, visible, with reasons. */
export function touchTargets(state, actorId, role, { enemiesOnly = false, allies = false } = {}) {
  const scene = sceneOf(state);
  const token = tokenOf(state, actorId);
  const actor = state.actors?.[actorId];
  if (!scene || !token || !actor) return [];
  return list(scene.tokens)
    .filter((t) => t.actorId !== actorId && observes(state, t.actorId, role, scene))
    .map((t) => {
      const other = state.actors[t.actorId];
      const meters = metersBetween(scene, token, t);
      return {
        actorId: t.actorId,
        name: other.name,
        meters: round(meters),
        inReach: meters <= REACH + 0.01,
        enemy: opposed(actor, other),
        ally: teamOf(actor) && teamOf(actor) === teamOf(other),
      };
    })
    .filter((row) => (!enemiesOnly || row.enemy) && (!allies || row.ally))
    .sort((a, b) => a.meters - b.meters);
}
function touchReasons(state, actorId, targetId, role, { sizeLimit = true } = {}) {
  const reasons = [];
  const scene = sceneOf(state);
  const actor = state.actors?.[actorId];
  const target = state.actors?.[targetId];
  const token = tokenOf(state, actorId);
  const other = tokenOf(state, targetId);
  if (!target || !other || !observes(state, targetId, role)) {
    reasons.push(
      reason(
        "choose-target",
        "Scegli una creatura sulla mappa o nell’elenco.",
        "Choose a creature on the map or in the list.",
      ),
    );
    return reasons;
  }
  if (targetId === actorId)
    reasons.push(reason("self", "Scegli un’altra creatura.", "Choose another creature."));
  const meters = token ? metersBetween(scene, token, other) : Infinity;
  if (meters > REACH + 0.01)
    reasons.push(
      reason(
        "out-of-reach",
        `${target.name} è a ${fmt(meters)} m: serve entro 1,5 m (Colpo senz’armi).`,
        `${target.name} is ${fmt(meters, "en")} m away: it must be within 1.5 m (Unarmed Strike).`,
      ),
    );
  if (sizeLimit && sizeIndex(target) > sizeIndex(actor) + 1)
    reasons.push(
      reason(
        "too-large",
        `${target.name} è troppo grande: al massimo una taglia più di te (${SIZE_NAMES[sizeOf(actor)].it}).`,
        `${target.name} is too large: at most one size larger than you (${SIZE_NAMES[sizeOf(actor)].en}).`,
      ),
    );
  return reasons;
}
/** Grapple option of the Unarmed Strike (SRD EN 190–191 / IT 205–206). */
export function previewGrapple(state, input, role) {
  const { actorId, targetId } = input;
  const reasons = common(state, actorId, role, { action: true, combat: true });
  const actor = state.actors?.[actorId];
  const result = { reasons, source: SOURCES.unarmedStrike, rule: SOURCES.grappling };
  if (!actor) return { ...result, available: false };
  if (handsInUse(actor) >= 2)
    reasons.push(
      reason(
        "no-free-hand",
        "Serve una mano libera: le tue mani sono occupate (armi o scudo).",
        "You need a free hand: your hands are full (weapons or shield).",
      ),
    );
  const holding = grappleOf(state, actorId).filter((g) => g.grapplerId === actorId);
  if (holding.length >= 2)
    reasons.push(
      reason(
        "hands-grappling",
        "Stai già afferrando due creature, una per mano.",
        "You are already grappling two creatures, one per hand.",
      ),
    );
  if (targetId) {
    reasons.push(...touchReasons(state, actorId, targetId, role));
    if (holding.some((g) => g.targetId === targetId))
      reasons.push(reason("already", "La stai già afferrando.", "You are already grappling it."));
  } else
    reasons.push(
      reason(
        "choose-target",
        "Scegli una creatura entro 1,5 m.",
        "Choose a creature within 1.5 m.",
      ),
    );
  const dc = saveDC(actor);
  const save = targetId && state.actors[targetId] ? bestSave(state, targetId) : null;
  if (targetId && !save)
    reasons.push(
      reason(
        "save-data",
        "Mancano i dati del tiro salvezza del bersaglio: serve il DM.",
        "The target's save data is missing: the DM must fix the sheet.",
      ),
    );
  const mode = save ? testRollMode(state, targetId, { kind: "save", ability: save.ability }) : null;
  Object.assign(result, {
    dc,
    save: save ? { ability: save.ability, bonus: save.value, mode: mode.mode } : null,
    chance: save
      ? round(1 - (mode.mode === "auto-fail" ? 0 : chanceToReach(save.value, dc, mode.mode)), 2)
      : null,
  });
  return { ...result, available: reasons.length === 0 };
}
/** Shove option of the Unarmed Strike: push 1.5 m straight away or knock Prone. */
export function previewShove(state, input, role) {
  const { actorId, targetId, effect = "push" } = input;
  const reasons = common(state, actorId, role, { action: true, combat: true });
  const actor = state.actors?.[actorId];
  const scene = sceneOf(state);
  const result = { reasons, effect, source: SOURCES.unarmedStrike };
  if (!actor) return { ...result, available: false };
  if (!targetId) {
    reasons.push(
      reason(
        "choose-target",
        "Scegli una creatura entro 1,5 m.",
        "Choose a creature within 1.5 m.",
      ),
    );
    return { ...result, available: false };
  }
  reasons.push(...touchReasons(state, actorId, targetId, role));
  const target = state.actors[targetId];
  const token = tokenOf(state, actorId);
  const other = tokenOf(state, targetId);
  const dc = saveDC(actor);
  const save = target ? bestSave(state, targetId) : null;
  if (target && !save)
    reasons.push(
      reason(
        "save-data",
        "Mancano i dati del tiro salvezza del bersaglio: serve il DM.",
        "The target's save data is missing: the DM must fix the sheet.",
      ),
    );
  if (effect === "prone" && target && hasCondition(target, "prone"))
    reasons.push(
      reason("already-prone", `${target.name} è già Prono.`, `${target.name} is already Prone.`),
    );
  let push = null;
  if (token && other) {
    const len = Math.hypot(other.x - token.x, other.y - token.y) || 1;
    const step = pixelsPerMeter(scene) * 1.5;
    const landing = {
      x: round(other.x + ((other.x - token.x) / len) * step, 1),
      y: round(other.y + ((other.y - token.y) / len) * step, 1),
    };
    const blocked = isSegmentBlocked(scene, other, landing, "blocksMovement", { role });
    const place = previewTokenPlacement(scene, landing, { excludeActorId: targetId });
    const altitude = altitudeOf(state, targetId);
    push = {
      from: { x: other.x, y: other.y },
      landing,
      blocked: blocked || !place.available,
      why: blocked
        ? text("un muro ferma la spinta", "a wall stops the push")
        : !place.available
          ? text("lo spazio dietro è occupato", "the space behind is occupied")
          : null,
      fall:
        altitude > 0 && !speedsOf(state, targetId).fly
          ? { meters: altitude, dice: Math.min(20, Math.floor(altitude / 3 + EPS)) }
          : null,
    };
    if (effect === "push" && push.blocked)
      reasons.push(
        reason(
          "push-blocked",
          `Spinta bloccata: ${push.why.it}. Puoi farlo cadere Prono.`,
          `Push blocked: ${push.why.en}. You can knock it Prone instead.`,
        ),
      );
  }
  const mode = save ? testRollMode(state, targetId, { kind: "save", ability: save.ability }) : null;
  Object.assign(result, {
    dc,
    push,
    save: save ? { ability: save.ability, bonus: save.value, mode: mode.mode } : null,
    chance: save
      ? round(1 - (mode.mode === "auto-fail" ? 0 : chanceToReach(save.value, dc, mode.mode)), 2)
      : null,
  });
  return { ...result, available: reasons.length === 0 };
}
function saveAttempt(state, operationId, actorId, targetId, move, label) {
  const save = bestSave(state, targetId);
  const request = testRequest(
    state,
    targetId,
    { kind: "save", ability: save.ability },
    {
      dc: move.dc,
      label: text(
        "TS del bersaglio (sceglie Forza o Destrezza)",
        "Target's save (it chooses Strength or Dexterity)",
      ),
      step: "save",
    },
  );
  const attempt = enqueue(state, {
    id: operationId,
    actorId,
    move: { ...move, targetId, saveAbility: save.ability },
    label,
    source: SOURCES.unarmedStrike,
    requests: [request],
    outcomes: [targetId],
    targets: [targetId],
  });
  if (request.autoFail) attempt.specialMove.autoFail = true;
  return attempt;
}
export function commitGrapple(state, input, role, { operationId }) {
  const preview = previewGrapple(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) actor.action = false;
  const target = state.actors[input.targetId];
  return saveAttempt(
    state,
    operationId,
    actor.id,
    target.id,
    { kind: "grapple", actorId: actor.id, dc: preview.dc },
    text(`Afferrare ${target.name} (Colpo senz’armi)`, `Grapple ${target.name} (Unarmed Strike)`),
  );
}
export function commitShove(state, input, role, { operationId }) {
  const preview = previewShove(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) actor.action = false;
  const target = state.actors[input.targetId];
  return saveAttempt(
    state,
    operationId,
    actor.id,
    target.id,
    {
      kind: "shove",
      actorId: actor.id,
      dc: preview.dc,
      effect: preview.effect,
      landing: preview.push?.landing ?? null,
    },
    preview.effect === "prone"
      ? text(`Spingere ${target.name} a terra (Prono)`, `Shove ${target.name} Prone`)
      : text(`Spingere ${target.name} di 1,5 m`, `Shove ${target.name} 1.5 m away`),
  );
}
/** The target's controller picks Strength or Dexterity before rolling (SRD: it chooses). */
export function chooseSaveAbility(state, input, role) {
  const attempt = list(state.combatAttempts).find(
    (a) => a.id === input.attemptId && a.kind === KIND,
  );
  const request = attempt?.requests.find((r) => r.step === "save" && r.status === "pending");
  if (!request || !canControlActor(state.actors[request.actorId], role, state))
    fail("no-save", "Nessun tiro salvezza da scegliere.", "No saving throw to choose.");
  if (!["str", "dex"].includes(input.ability))
    fail("ability", "Scegli Forza o Destrezza.", "Choose Strength or Dexterity.");
  const test = { kind: "save", ability: input.ability };
  const modifier = testModifier(state, request.actorId, test);
  if (!modifier)
    fail("score-missing", "Manca il punteggio sulla scheda.", "The score is missing on the sheet.");
  const modes = testRollMode(state, request.actorId, test);
  request.modifier = modifier.value;
  request.modifierSources = modifier.parts;
  request.rollMode = modes.mode === "auto-fail" ? "normal" : modes.mode;
  request.dice = [{ count: request.rollMode === "normal" ? 1 : 2, sides: 20 }];
  attempt.specialMove.saveAbility = input.ability;
  attempt.specialMove.autoFail = modes.mode === "auto-fail";
  return attempt;
}
/** Dragging a grappled creature (SRD Grappled "Movable", EN 182 / IT 203). */
export function previewDrag(state, input, role) {
  const { actorId, point } = input;
  const reasons = common(state, actorId, role, { movement: true, move: true });
  const scene = sceneOf(state);
  const token = tokenOf(state, actorId);
  const grapple = grappleOf(state, actorId).find((g) => g.grapplerId === actorId);
  const result = { reasons, source: SOURCES.grappling };
  if (!grapple) {
    reasons.push(
      reason(
        "not-grappling",
        "Non stai afferrando nessuno: prima Afferra.",
        "You are not grappling anyone: Grapple first.",
      ),
    );
    return { ...result, available: false };
  }
  const target = state.actors[grapple.targetId];
  if (!point || !scene || !token) {
    reasons.push(
      reason("choose-destination", "Indica dove trascinarlo.", "Point at where to drag it."),
    );
    return { ...result, grapple, available: false };
  }
  const path = tracePath(scene, token, [point], { role });
  const light =
    sizeOf(target) === "tiny" || sizeIndex(target) <= sizeIndex(state.actors[actorId]) - 2;
  const factor = light ? 1 : 2;
  const cost = round(path.totalCost * factor);
  const left = movementLeft(state, actorId);
  if (path.blocked)
    reasons.push(path.reasons.at(-1) ?? reason("blocked", "Percorso bloccato.", "Path blocked."));
  if (cost > left + EPS) reasons.push(budgetReason(cost, left));
  const len = Math.hypot(point.x - token.x, point.y - token.y) || 1;
  const step = pixelsPerMeter(scene) * 1.5;
  const behind = {
    x: round(point.x - ((point.x - token.x) / len) * step, 1),
    y: round(point.y - ((point.y - token.y) / len) * step, 1),
  };
  if (path.distance < 0.3)
    reasons.push(
      reason("too-short", "Scegli una destinazione più lontana.", "Choose a farther destination."),
    );
  Object.assign(result, {
    grapple,
    targetId: target.id,
    from: { x: token.x, y: token.y },
    to: { x: point.x, y: point.y },
    behind,
    meters: round(path.distance),
    factor,
    cost,
    path,
  });
  return { ...result, available: reasons.length === 0 };
}
export function commitDrag(state, input, role, { operationId }) {
  const preview = previewDrag(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state) && preview.factor > 1)
    spendMovement(actor, preview.cost - preview.path.totalCost);
  const movement = beginMovement(
    state,
    {
      id: operationId + ":move",
      actorId: actor.id,
      point: preview.to,
      waypoints: [],
      geometryKey: geometryKey(sceneOf(state)),
    },
    role,
  );
  const target = tokenOf(state, preview.targetId);
  const from = { x: target.x, y: target.y };
  if (movement.status === "resolved") Object.assign(target, preview.behind);
  const record = recordMove(state, {
    id: operationId,
    kind: "drag",
    actorId: actor.id,
    targetId: preview.targetId,
    from: preview.from,
    to: preview.to,
    meters: preview.meters,
    cost: preview.cost,
    outcome: text(
      `Trascina ${state.actors[preview.targetId].name} (${fmt(preview.cost)} m di movimento).`,
      `Drags ${state.actors[preview.targetId].name} (${fmt(preview.cost, "en")} m of movement).`,
    ),
  });
  record.coreMovementId = movement.id;
  record.dragged = { from, to: { x: target.x, y: target.y } };
  return record;
}
function endGrapple(state, grapple, reasonText, operationId) {
  const slice = writable(state);
  slice.grapples = slice.grapples.filter((g) => g.id !== grapple.id);
  const target = state.actors[grapple.targetId];
  const live = list(target?.conditions).some((c) => c?.instanceId === grapple.instanceId);
  if (live)
    applyConditionEvent(state, {
      eventId: operationId + ":end-grappled",
      actorId: grapple.targetId,
      kind: "end",
      instanceId: grapple.instanceId,
      reason: reasonText,
      source: SOURCES.grappling,
    });
}
export function commitRelease(state, input, role, { operationId }) {
  const grapple = list(sliceOf(state)?.grapples).find((g) => g.id === input.grappleId);
  if (!grapple || !canControlActor(state.actors[grapple.grapplerId], role, state))
    fail("no-grapple", "Nessuna presa da lasciare.", "No grapple to release.");
  endGrapple(state, grapple, "Released by the grappler (no action)", operationId);
  return grapple;
}
/** Escaping a grapple: the Grappled creature's action, Athletics or Acrobatics check. */
export function previewEscape(state, input, role) {
  const { actorId } = input;
  const reasons = common(state, actorId, role, { action: true });
  const grapple = grappleOf(state, actorId).find((g) => g.targetId === actorId);
  const result = { reasons, source: SOURCES.grappling };
  if (!grapple) {
    reasons.push(reason("not-grappled", "Nessuno ti sta afferrando.", "No one is grappling you."));
    return { ...result, available: false };
  }
  const athletics = testModifier(state, actorId, { kind: "skill", skill: "athletics" });
  const acrobatics = testModifier(state, actorId, { kind: "skill", skill: "acrobatics" });
  const skill = (acrobatics?.value ?? -99) > (athletics?.value ?? -99) ? "acrobatics" : "athletics";
  const bonus = (skill === "acrobatics" ? acrobatics : athletics)?.value ?? 0;
  return {
    ...result,
    grapple,
    dc: grapple.dc,
    skill,
    bonus,
    chance: round(chanceToReach(bonus, grapple.dc), 2),
    available: reasons.length === 0,
  };
}
export function commitEscape(state, input, role, { operationId }) {
  const preview = previewEscape(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) actor.action = false;
  const request = testRequest(
    state,
    actor.id,
    { kind: "skill", skill: input.skill ?? preview.skill },
    {
      dc: preview.dc,
      label: text("Sfuggire alla presa", "Escape the grapple"),
    },
  );
  return enqueue(state, {
    id: operationId,
    actorId: actor.id,
    move: { kind: "escape", actorId: actor.id, grappleId: preview.grapple.id },
    label: text("Sfuggire alla presa", "Escape a grapple"),
    source: SOURCES.grappling,
    requests: [request],
    outcomes: [actor.id],
  });
}
/** Grapples end when the grappler is Incapacitated or the target moves out of reach. */
// A movement still waiting for a reaction or a choice: a drag is not over yet.
const unsettledMovement = (state, actorId) =>
  list(state.movements).some(
    (m) => m.actorId === actorId && ["pending", "awaiting-choice"].includes(m.status),
  );
/** Why a grapple ends now (SRD Grappled EN 182 / IT 203), or null while it holds. */
function grappleBreak(state, grapple, scene = sceneOf(state)) {
  const grappler = state.actors[grapple.grapplerId];
  if (!grappler || grappler.dead || hasCondition(grappler, "incapacitated"))
    return "The grappler is Incapacitated";
  if (unsettledMovement(state, grapple.grapplerId)) return null;
  const a = tokenOf(state, grapple.grapplerId, scene);
  const b = tokenOf(state, grapple.targetId, scene);
  return !a || !b || metersBetween(scene, a, b) > REACH + 0.01
    ? "Out of the grapple's range"
    : null;
}
export function reconcileGrapples(state, operationId) {
  const slice = sliceOf(state);
  if (!slice) return [];
  const scene = sceneOf(state);
  const ended = [];
  for (const grapple of [...slice.grapples]) {
    const why = grappleBreak(state, grapple, scene);
    if (why) {
      endGrapple(state, grapple, why, operationId + ":" + grapple.id);
      ended.push(grapple);
    }
  }
  return ended;
}

// ---------------------------------------------------------------- weapons, thrown, mastery

export const catalogWeapon = (row) => {
  if (row?.weapon?.properties) return row.weapon;
  const slug = row?.weaponType;
  return ITEMS.find((item) => item.id === "srd2024:item:" + slug)?.weapon ?? null;
};
const weaponSlug = (row) =>
  row?.weaponType ?? String(row?.srdId ?? "").replace("srd2024:item:", "");
const rowName = (row, lang) =>
  typeof row?.name === "string" ? row.name : (row?.name?.[lang] ?? row?.name?.it ?? "");
function classIds(actor) {
  return list(actor?.buildSeed?.classes).map((c) => c.classId);
}
export function hasWeaponMastery(actor) {
  return (
    classIds(actor).some((id) => MASTERY_CLASSES.has(id)) ||
    list(actor?.features).some((f) => String(f.definitionId ?? f.id ?? "").endsWith(":mastery"))
  );
}
/** DDB-041: a weapon's mastery shows only when a feature unlocks it for the character. */
export function masteryOf(state, actor, row) {
  const weapon = catalogWeapon(row);
  const property = weapon?.mastery ?? null;
  if (!property) return null;
  const slug = weaponSlug(row);
  const feature = hasWeaponMastery(actor);
  const chosen = list(sliceOf(state)?.masteries?.[actor?.id]).includes(slug);
  return {
    property,
    slug,
    active: feature && chosen,
    feature,
    chosen,
    name: MASTERIES[property]?.name,
    rule: MASTERIES[property]?.rule,
  };
}
function weaponProficient(actor, weapon) {
  const profile = actor?.combatProfile ?? {};
  const classes = classIds(actor);
  if (!classes.length && actor?.kind === "npc") return true;
  if (weapon.category === "simple") return true;
  return (
    classes.some((id) => MARTIAL_CLASSES.has(id)) || list(profile.weaponProficiencies).length > 0
  );
}
const feetToMeters = (feet) => round(feet * 0.3, 2);
function parseDice(text) {
  const match = /^(\d+)d(\d+)$/.exec(String(text ?? "").trim());
  return match ? { count: Number(match[1]), sides: Number(match[2]) } : null;
}
export function thrownOut(state, actorId, itemId) {
  return list(sliceOf(state)?.thrown).filter(
    (t) => t.actorId === actorId && t.itemId === itemId && !t.recovered,
  ).length;
}
const CORE_WEAPONS = new Set(["quarterstaff"]);
/**
 * Weapon rows as Table attacks (D&D Beyond weapon rows DDB-041; BG3 throw CRP-109): an
 * equipped melee weapon of the active set and every equipped Thrown weapon still in hand.
 * Explicit modifiers: Strength (or the better of Strength and Dexterity with Finesse)
 * plus the Proficiency Bonus when proficient (SRD EN 89–91 / IT 101–103).
 */
export function weaponActions(state, actor) {
  const canonical = state.actors?.[actor?.id];
  if (!canonical) return [];
  const eff = effective(canonical);
  const sets = canonical.weaponSets;
  const activeIds = sets ? [sets[sets.active]].flat().filter(Boolean) : null;
  const out = [];
  for (const row of list(canonical.inventory)) {
    const weapon = catalogWeapon(row);
    if (!row.equipped || !weapon || row.unidentified || row.location === "ground") continue;
    if (row.availableInForm === false) continue;
    const slug = weaponSlug(row);
    const dice = parseDice(weapon.damage?.dice);
    if (!dice) continue;
    const properties = list(weapon.properties);
    const str = mod(eff.abilities?.str ?? 10),
      dex = mod(eff.abilities?.dex ?? 10);
    const ability = properties.includes("finesse")
      ? Math.max(str, dex)
      : weapon.type === "ranged"
        ? dex
        : str;
    const pb = weaponProficient(canonical, weapon) ? proficiencyBonus(eff) : 0;
    const mastery = masteryOf(state, canonical, row);
    const name = { it: rowName(row, "it"), en: rowName(row, "en") };
    const base = {
      itemId: row.id,
      kind: "attack",
      targetMode: "single",
      cost: { action: 1 },
      dice: [dice],
      damageType: weapon.damage?.type ?? "bludgeoning",
      attackModifier: ability + pb,
      damageModifier: ability,
      mastery: mastery?.active ? mastery.property : null,
      source: SOURCES.thrown,
    };
    if (
      weapon.type === "melee" &&
      !CORE_WEAPONS.has(slug) &&
      (!activeIds || activeIds.includes(row.id))
    )
      out.push({
        ...base,
        id: ACTION_PREFIX + "weapon." + row.id,
        name,
        shortDescription: text(
          `Attacco in mischia con arma${mastery?.active ? " · Padronanza: " + mastery.name.it : ""}.`,
          `Melee weapon attack${mastery?.active ? " · Mastery: " + mastery.name.en : ""}.`,
        ),
        attackType: "melee",
        rangeMeters: properties.includes("reach") ? 3 : 1.5,
        source: SOURCES.mastery,
      });
    if (properties.includes("thrown") && weapon.range) {
      const inHand = (row.quantity ?? 1) - thrownOut(state, canonical.id, row.id);
      if (inHand > 0)
        out.push({
          ...base,
          id: ACTION_PREFIX + "throw." + row.id,
          name: text(`Lancia: ${name.it}`, `Throw: ${name.en}`),
          shortDescription: text(
            `Attacco a distanza: ${fmt(feetToMeters(weapon.range.normal))}/${fmt(feetToMeters(weapon.range.long))} m (svantaggio oltre la normale). In mano: ${inHand}.`,
            `Ranged attack: ${fmt(feetToMeters(weapon.range.normal), "en")}/${fmt(feetToMeters(weapon.range.long), "en")} m (Disadvantage beyond normal). In hand: ${inHand}.`,
          ),
          attackType: "ranged",
          thrown: true,
          rangeMeters: feetToMeters(weapon.range.normal),
          longRangeMeters: feetToMeters(weapon.range.long),
        });
    }
  }
  return out;
}
/** Items the BG3 throw menu lists: throwable ones, and why the others are not (CRP-103). */
export function throwMenu(state, actorId) {
  const actor = state.actors?.[actorId];
  return list(actor?.inventory)
    .filter((row) => (row.quantity ?? 1) > 0 && row.location !== "ground")
    .map((row) => {
      const weapon = catalogWeapon(row);
      const thrown = list(weapon?.properties).includes("thrown");
      const out = thrown ? thrownOut(state, actorId, row.id) : 0;
      const inHand = (row.quantity ?? 1) - out;
      const why = !thrown
        ? text("Non ha la proprietà Lancio.", "It lacks the Thrown property.")
        : !row.equipped
          ? text(
              "Non è equipaggiata: equipaggiala dall’inventario.",
              "Not equipped: equip it from the inventory.",
            )
          : inHand <= 0
            ? text(
                `Tutte a terra (${out}): raccoglile.`,
                `All on the ground (${out}): pick them up.`,
              )
            : null;
      return {
        itemId: row.id,
        name: { it: rowName(row, "it"), en: rowName(row, "en") },
        thrown,
        inHand,
        out,
        range: thrown
          ? { normal: feetToMeters(weapon.range.normal), long: feetToMeters(weapon.range.long) }
          : null,
        actionId: ACTION_PREFIX + "throw." + row.id,
        available: !why,
        why,
      };
    })
    .sort((a, b) => Number(b.thrown) - Number(a.thrown));
}
// Combat hook (B36 registerActionProvider `commit`): runs inside the accepted attempt.
export function onWeaponAttempt(state, attempt, action) {
  if (!String(action?.id ?? "").startsWith(ACTION_PREFIX)) return;
  if (action.mastery) attempt.mastery = { property: action.mastery, itemId: action.itemId };
  if (!action.thrown) return;
  const slice = sliceOf(state);
  if (!slice) return;
  const target = tokenOf(state, attempt.targets?.[0]?.actorId);
  const origin = tokenOf(state, attempt.actorId);
  const spot = target ?? origin;
  slice.thrown.push({
    id: attempt.id + ":thrown",
    attemptId: attempt.id,
    actorId: attempt.actorId,
    itemId: action.itemId,
    name: copy(action.name),
    targetId: attempt.targets?.[0]?.actorId ?? null,
    sceneId: state.activeSceneId,
    x: round(spot.x + 16, 1),
    y: round(spot.y + 16, 1),
    recovered: false,
  });
}
export function previewRecover(state, input, role) {
  const { actorId, thrownId } = input;
  const reasons = common(state, actorId, role, {});
  const entry = list(sliceOf(state)?.thrown).find((t) => t.id === thrownId && !t.recovered);
  const token = tokenOf(state, actorId);
  const actor = state.actors?.[actorId];
  if (!entry || entry.actorId !== actorId)
    reasons.push(
      reason("nothing", "Nessuna arma lanciata da raccogliere.", "No thrown weapon to pick up."),
    );
  else if (entry.sceneId !== state.activeSceneId)
    reasons.push(
      reason(
        "elsewhere",
        "L’arma è rimasta in un’altra scena.",
        "The weapon was left in another scene.",
      ),
    );
  else if (inCombat(state) && token && metersBetween(sceneOf(state), token, entry) > REACH + 0.01)
    reasons.push(
      reason(
        "too-far",
        "Avvicinati entro 1,5 m dall’arma a terra.",
        "Move within 1.5 m of the weapon on the ground.",
      ),
    );
  const free = !inCombat(state) || actor?.objectInteractionUsed !== true;
  if (inCombat(state) && !free && actor?.action !== true)
    reasons.push(
      reason(
        "interaction",
        "Interazione gratuita già usata e azione spesa.",
        "Free interaction already used and action spent.",
      ),
    );
  return {
    reasons,
    entry,
    cost: free ? "free" : "action",
    source: SOURCES.utilize,
    available: reasons.length === 0,
  };
}
export function commitRecover(state, input, role) {
  const preview = previewRecover(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) {
    if (preview.cost === "free") actor.objectInteractionUsed = true;
    else actor.action = false;
  }
  preview.entry.recovered = true;
  return preview.entry;
}
// Where a two-range turn window stands: [round, order index] of the current turn.
const position = (state) => [state.combat.round, state.combat.turn];
const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
function parseTurnKey(key) {
  const parts = String(key ?? "").split(":");
  const round = Number(parts.at(-2));
  return {
    encounter: parts.slice(0, -2).join(":"),
    round: Number.isFinite(round) ? round : null,
    actorId: parts.at(-1) ?? null,
  };
}
/** [round, index] at which `actorId`'s next turn starts, after a turn key. */
function nextTurnStart(state, turnKey, actorId) {
  const { encounter, round, actorId: during } = parseTurnKey(turnKey);
  if (round === null || encounter !== (state.combat?.encounterId ?? "demo")) return null;
  const order = list(state.combat?.order);
  const own = order.indexOf(actorId);
  const then = order.indexOf(during);
  if (own < 0) return null;
  return during === actorId || own <= then ? [round + 1, own] : [round, own];
}
const hitWithDamage = (outcome) =>
  outcome &&
  outcome.hit !== false &&
  ["applied", "ready"].includes(outcome.status) &&
  outcome.damage > 0;
const hit = (outcome) =>
  outcome && outcome.hit === true && ["applied", "ready"].includes(outcome.status);
/**
 * Roll reasons for the core attack (combat.mjs provideRollReasons): Vex and Sap from
 * resolved hits, and the Help action's distraction. Derived from the attempts already in
 * the state: nothing to expire by hand, Undo removes them with the attempt.
 */
export function rollReasons(state, attacker, action, selection, target) {
  if (!state.combat?.active || !target || action?.kind !== "attack") return [];
  const attempts = list(state.combatAttempts);
  const now = position(state);
  const out = [];
  const attacksAfter = (index, actorId, targetId) =>
    attempts
      .slice(index + 1)
      .some(
        (a) =>
          a.actorId === actorId &&
          a.requests?.some((r) => r.kind === "attack" && r.targetId === targetId),
      );
  // Vex: the attacker's own hit with a Vex weapon on this target.
  for (let i = attempts.length - 1; i >= 0; i--) {
    const a = attempts[i];
    if (a.actorId !== attacker.id || a.mastery?.property !== "vex") continue;
    const outcome = a.outcomes?.find((o) => o.actorId === target.id);
    if (!hitWithDamage(outcome)) continue;
    const start = nextTurnStart(state, a.turnKey, attacker.id);
    const end = start ? [start[0], start[1] + 1] : null;
    if (end && before(now, end) && !attacksAfter(i, attacker.id, target.id))
      out.push({
        code: "mastery-vex",
        mode: "advantage",
        name: text(
          "Vessazione (Padronanza): hai colpito e ferito questo bersaglio",
          "Vex (Mastery): you hit and damaged this target",
        ),
        source: SOURCES.mastery,
      });
    break;
  }
  // Sap: a hit by a Sap weapon on the attacker, before the start of that wielder's next turn.
  for (let i = attempts.length - 1; i >= 0; i--) {
    const a = attempts[i];
    if (a.mastery?.property !== "sap") continue;
    const outcome = a.outcomes?.find((o) => o.actorId === attacker.id);
    if (!hit(outcome)) continue;
    const start = nextTurnStart(state, a.turnKey, a.actorId);
    const usedSince = attempts
      .slice(i + 1)
      .some((b) => b.actorId === attacker.id && b.requests?.some((r) => r.kind === "attack"));
    if (start && before(now, start) && !usedSince)
      out.push({
        code: "mastery-sap",
        mode: "disadvantage",
        name: text(
          `Fiaccare (Padronanza di ${a.actorName}): svantaggio al prossimo attacco`,
          `Sap (${a.actorName}'s Mastery): Disadvantage on the next attack`,
        ),
        source: SOURCES.mastery,
      });
    break;
  }
  // Help (assist an attack roll): an ally distracted this enemy within 1.5 m.
  for (const effect of list(sliceOf(state)?.effects)) {
    if (effect.kind !== "help-attack" || effect.enemyId !== target.id) continue;
    if (effect.helperId === attacker.id || !helpActive(state, effect)) continue;
    const helper = state.actors[effect.helperId];
    if (!helper || teamOf(helper) !== teamOf(state.actors[attacker.id])) continue;
    const used = attempts.slice(effect.attemptsBefore).some((b) => {
      const by = state.actors[b.actorId];
      return (
        by &&
        teamOf(by) === teamOf(helper) &&
        b.actorId !== effect.helperId &&
        b.requests?.some((r) => r.kind === "attack" && r.targetId === target.id)
      );
    });
    if (!used)
      out.push({
        code: "help-attack",
        mode: "advantage",
        name: text(
          `Aiuto di ${helper.name}: il bersaglio è distratto`,
          `${helper.name}'s Help: the target is distracted`,
        ),
        source: SOURCES.help,
      });
  }
  return out;
}

/** Mastery effects standing on a creature now (shown on the Table, applied by rollReasons). */
export function masteryMarks(state, actorId) {
  const actor = state.actors?.[actorId];
  if (!state.combat?.active || !actor) return [];
  const marks = [];
  const probe = { kind: "attack" };
  const sap = rollReasons(state, actor, probe, {}, { id: "__any__" }).find(
    (r) => r.code === "mastery-sap",
  );
  if (sap) marks.push({ property: "sap", name: sap.name });
  for (const other of Object.values(state.actors)) {
    if (!other || other.id === actorId) continue;
    const vex = rollReasons(state, other, probe, {}, actor).find((r) => r.code === "mastery-vex");
    if (vex) marks.push({ property: "vex", by: other.id, name: vex.name });
  }
  return marks;
}

// ---------------------------------------------------------------- Help

export function helpActive(state, effect) {
  if (effect.consumed) return false;
  if (!effect.turnKey) return !state.combat?.active;
  if (!state.combat?.active) return false;
  const start = nextTurnStart(state, effect.turnKey, effect.helperId);
  return Boolean(start && before(position(state), start));
}
/** Skills the helper can assist with (SRD Help: one of your skill proficiencies). */
export function helpSkills(state, actorId) {
  const own = list(effective(state.actors?.[actorId])?.skills).filter((id) => SKILLS.has(id));
  return own.length ? own : [...SKILLS.keys()];
}
/** Help (SRD EN 182–183 / IT 203): assist an ally's check or distract an enemy. */
export function previewHelp(state, input, role) {
  const { actorId, mode = "attack", targetId, skill } = input;
  const reasons = common(state, actorId, role, { action: true, combat: mode === "attack" });
  const result = { reasons, mode, source: SOURCES.help };
  const actor = state.actors?.[actorId];
  if (!actor) return { ...result, available: false };
  if (!targetId) {
    reasons.push(
      mode === "attack"
        ? reason("choose-enemy", "Scegli un nemico entro 1,5 m.", "Choose an enemy within 1.5 m.")
        : reason("choose-ally", "Scegli l’alleato da aiutare.", "Choose the ally to help."),
    );
    return { ...result, available: false };
  }
  const target = state.actors[targetId];
  if (mode === "attack") {
    reasons.push(...touchReasons(state, actorId, targetId, role, { sizeLimit: false }));
    if (target && !opposed(actor, target))
      reasons.push(
        reason("not-enemy", `${target.name} non è un nemico.`, `${target.name} is not an enemy.`),
      );
  } else {
    const scene = sceneOf(state);
    const a = tokenOf(state, actorId),
      b = tokenOf(state, targetId);
    if (!target || !b || !observes(state, targetId, role))
      reasons.push(
        reason("choose-ally", "Scegli l’alleato da aiutare.", "Choose the ally to help."),
      );
    else if (a && metersBetween(scene, a, b) > 9 + 0.01)
      reasons.push(
        reason(
          "far",
          `${target.name} è troppo lontano per aiutarlo (il DM ha l’ultima parola).`,
          `${target.name} is too far to help (the DM has the final say).`,
        ),
      );
    if (!SKILLS.has(skill))
      reasons.push(
        reason("skill", "Scegli l’abilità in cui aiuti.", "Choose the skill you help with."),
      );
    else if (list(effective(actor).skills).length && !list(effective(actor).skills).includes(skill))
      reasons.push(
        reason(
          "not-proficient",
          "Serve la competenza nell’abilità scelta.",
          "You need proficiency in the chosen skill.",
        ),
      );
  }
  return { ...result, available: reasons.length === 0 };
}
export function commitHelp(state, input, role, { operationId }) {
  const preview = previewHelp(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) actor.action = false;
  const effect = {
    id: operationId,
    kind: preview.mode === "attack" ? "help-attack" : "help-check",
    helperId: actor.id,
    enemyId: preview.mode === "attack" ? input.targetId : null,
    allyId: preview.mode === "check" ? input.targetId : null,
    skill: preview.mode === "check" ? input.skill : null,
    turnKey: turnKeyOf(state),
    attemptsBefore: list(state.combatAttempts).length,
    consumed: false,
  };
  writable(state).effects.push(effect);
  return effect;
}
function helpForCheck(state, actorId, skill) {
  return list(sliceOf(state)?.effects).find(
    (e) =>
      e.kind === "help-check" && e.allyId === actorId && e.skill === skill && helpActive(state, e),
  );
}

// ---------------------------------------------------------------- Hide, Search, Study

/** Enemies that see the creature now (line of sight, not Blinded, not Incapacitated). */
export function watchers(state, actorId) {
  const scene = sceneOf(state);
  const token = tokenOf(state, actorId);
  const actor = state.actors?.[actorId];
  if (!scene || !token || !actor) return [];
  return list(scene.tokens)
    .map((t) => ({ token: t, other: state.actors[t.actorId] }))
    .filter(
      ({ token: t, other }) =>
        other &&
        t.actorId !== actorId &&
        isActorAvailable(other) &&
        opposed(actor, other) &&
        !other.dead &&
        !hasCondition(other, "blinded") &&
        !hasCondition(other, "incapacitated") &&
        hasLineOfSight(scene, t, token),
    )
    .map(({ other }) => ({ actorId: other.id, name: other.name }));
}
/** Hide (SRD EN 183 / IT 210): DC 15 Dexterity (Stealth), out of every enemy's sight. */
export function previewHide(state, input, role) {
  const { actorId } = input;
  const reasons = common(state, actorId, role, { action: true });
  const result = { reasons, dc: 15, source: SOURCES.hide };
  const hidden = sliceOf(state)?.hidden?.[actorId];
  if (hidden) reasons.push(reason("already", "Sei già nascosto.", "You are already hidden."));
  const seen = watchers(state, actorId);
  result.watchers = seen;
  // The DM decides Heavy Obscurement and cover the map cannot know (SRD: the GM).
  result.dmConfirmed = runsSession(state, role) && input.confirmed === true;
  if (seen.length && !result.dmConfirmed)
    reasons.push(
      reason(
        "seen",
        `Sei in vista di: ${seen.map((w) => w.name).join(", ")}. Mettiti fuori vista (muri, oscurità pesante) o chiedi al DM.`,
        `Seen by: ${seen.map((w) => w.name).join(", ")}. Get out of sight (walls, heavy obscurement) or ask the DM.`,
      ),
    );
  const stealth = testModifier(state, actorId, { kind: "skill", skill: "stealth" });
  Object.assign(result, {
    bonus: stealth?.value ?? null,
    chance: stealth ? round(chanceToReach(stealth.value, 15), 2) : null,
  });
  return { ...result, available: reasons.length === 0 };
}
export function commitHide(state, input, role, { operationId }) {
  const preview = previewHide(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) actor.action = false;
  const help = helpForCheck(state, actor.id, "stealth");
  const request = testRequest(
    state,
    actor.id,
    { kind: "skill", skill: "stealth" },
    {
      dc: 15,
      label: text("Furtività per nascondersi", "Stealth to hide"),
      extraModes: help ? ["advantage"] : [],
    },
  );
  return enqueue(state, {
    id: operationId,
    actorId: actor.id,
    move: {
      kind: "hide",
      actorId: actor.id,
      helpId: help?.id ?? null,
      dmConfirmed: preview.dmConfirmed,
    },
    label: text("Nascondersi", "Hide"),
    source: SOURCES.hide,
    requests: [request],
    outcomes: [actor.id],
  });
}
function endHidden(state, actorId, reasonText, operationId) {
  const slice = writable(state);
  const entry = slice.hidden[actorId];
  if (!entry) return false;
  delete slice.hidden[actorId];
  const actor = state.actors[actorId];
  if (list(actor?.conditions).some((c) => c?.instanceId === entry.instanceId))
    applyConditionEvent(state, {
      eventId: operationId + ":visible:" + actorId,
      actorId,
      kind: "end",
      instanceId: entry.instanceId,
      reason: reasonText,
      source: SOURCES.hide,
    });
  return true;
}
export function commitReveal(state, input, role, { operationId }) {
  const actor = state.actors?.[input.actorId];
  if (!actor || !canControlActor(actor, role, state))
    fail("not-controller", "Non controlli questa creatura.", "You do not control this creature.");
  if (!endHidden(state, actor.id, "Stopped hiding", operationId))
    fail("not-hidden", "Non è nascosto.", "Not hidden.");
  return true;
}
/** Search (SRD EN 187 / IT 212): a Wisdom check; Perception finds hidden things. */
export function previewSearch(state, input, role) {
  const { actorId, skill = "perception" } = input;
  const reasons = common(state, actorId, role, { action: true });
  if (!SEARCH_SKILLS.includes(skill))
    reasons.push(
      reason(
        "skill",
        "Scegli un’abilità della tabella Ricerca.",
        "Choose a skill from the Search table.",
      ),
    );
  const modifier = testModifier(state, actorId, { kind: "skill", skill });
  return {
    reasons,
    skill,
    bonus: modifier?.value ?? null,
    radius: 9,
    source: SOURCES.search,
    available: reasons.length === 0,
  };
}
export function commitSearch(state, input, role, { operationId }) {
  const preview = previewSearch(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) actor.action = false;
  const help = helpForCheck(state, actor.id, preview.skill);
  const request = testRequest(
    state,
    actor.id,
    { kind: "skill", skill: preview.skill },
    {
      label: text("Cercare", "Search"),
      extraModes: help ? ["advantage"] : [],
    },
  );
  return enqueue(state, {
    id: operationId,
    actorId: actor.id,
    move: { kind: "search", actorId: actor.id, skill: preview.skill, helpId: help?.id ?? null },
    label: text(
      `Cercare (${skillName(preview.skill).it})`,
      `Search (${skillName(preview.skill).en})`,
    ),
    source: SOURCES.search,
    requests: [request],
    outcomes: [actor.id],
  });
}
/** What can be studied here: visible creatures and features, with the suggested skill. */
export function studySubjects(state, actorId, role) {
  const scene = sceneOf(state);
  const out = [];
  for (const t of list(scene?.tokens)) {
    if (t.actorId === actorId || !observes(state, t.actorId, role, scene)) continue;
    const other = state.actors[t.actorId];
    const type =
      other.creatureType ??
      (["goblin-1", "goblin-2"].includes(other.id)
        ? "humanoid"
        : other.kind === "character"
          ? "humanoid"
          : null);
    out.push({
      kind: "actor",
      id: other.id,
      name: text(other.name, other.name),
      suggested: KNOWLEDGE_BY_TYPE[type] ?? "history",
    });
  }
  for (const f of featuresOf(state)) {
    if (f.secret && !f.revealed && !runsSession(state, role)) continue;
    out.push({
      kind: "feature",
      id: f.id,
      name: copy(f.name),
      suggested: f.kind === "object" ? "investigation" : f.kind === "water" ? "arcana" : "nature",
    });
  }
  return out;
}
/** Study (SRD EN 189 / IT 216): an Intelligence check about a creature, clue or place. */
export function previewStudy(state, input, role) {
  const { actorId, subject, skill } = input;
  const reasons = common(state, actorId, role, { action: true });
  const subjects = studySubjects(state, actorId, role);
  const chosen = subject && subjects.find((s) => s.kind === subject.kind && s.id === subject.id);
  if (!chosen)
    reasons.push(reason("choose-subject", "Scegli cosa studiare.", "Choose what to study."));
  if (!STUDY_SKILLS.includes(skill))
    reasons.push(reason("skill", "Scegli un’area di conoscenza.", "Choose an area of knowledge."));
  const modifier = STUDY_SKILLS.includes(skill)
    ? testModifier(state, actorId, { kind: "skill", skill })
    : null;
  return {
    reasons,
    subject: chosen ?? null,
    skill,
    bonus: modifier?.value ?? null,
    source: SOURCES.study,
    available: reasons.length === 0,
  };
}
export function commitStudy(state, input, role, { operationId }) {
  const preview = previewStudy(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) actor.action = false;
  const help = helpForCheck(state, actor.id, preview.skill);
  const request = testRequest(
    state,
    actor.id,
    { kind: "skill", skill: preview.skill },
    {
      label: text("Studiare", "Study"),
      extraModes: help ? ["advantage"] : [],
    },
  );
  return enqueue(state, {
    id: operationId,
    actorId: actor.id,
    move: {
      kind: "study",
      actorId: actor.id,
      subject: { kind: preview.subject.kind, id: preview.subject.id },
      skill: preview.skill,
      helpId: help?.id ?? null,
    },
    label: text(`Studiare: ${preview.subject.name.it}`, `Study: ${preview.subject.name.en}`),
    source: SOURCES.study,
    requests: [request],
    outcomes: [actor.id],
  });
}
/** Knowledge this viewer may read: what its creatures learned, or everything for the DM. */
export function learnedFor(state, role) {
  const slice = sliceOf(state);
  return list(slice?.learned)
    .filter(
      (row) => runsSession(state, role) || canControlActor(state.actors[row.actorId], role, state),
    )
    .map((row) => ({ ...row, lore: list(slice.lore).find((l) => l.id === row.loreId) }))
    .filter((row) => row.lore);
}

// ---------------------------------------------------------------- Influence (DM judgement)

/** Influence (SRD EN 184 / IT 208): the DM judges willing, unwilling or hesitant. */
export function previewInfluence(state, input, role) {
  const { actorId, targetId, skill, urge } = input;
  const reasons = common(state, actorId, role, { action: true });
  const target = state.actors?.[targetId];
  if (!target || targetId === actorId || !observes(state, targetId, role))
    reasons.push(
      reason(
        "choose-target",
        "Scegli la creatura da influenzare.",
        "Choose the creature to influence.",
      ),
    );
  // SRD: "you urge a monster"; another player's character decides for itself.
  else if (target.kind === "character")
    reasons.push(
      reason(
        "not-monster",
        `${target.name} è un personaggio giocante: decide chi lo gioca, non una prova di Influenza.`,
        `${target.name} is a player character: its player decides, not an Influence check.`,
      ),
    );
  if (!INFLUENCE_SKILLS.includes(skill))
    reasons.push(
      reason(
        "skill",
        "Scegli come interagisci (tabella Prove di Influenza).",
        "Choose how you interact (Influence Checks table).",
      ),
    );
  const words = String(urge ?? "").trim();
  if (!words)
    reasons.push(
      reason(
        "urge",
        "Scrivi che cosa chiedi alla creatura.",
        "Write what you urge the creature to do.",
      ),
    );
  if (words.length > 200)
    reasons.push(reason("urge-long", "Al massimo 200 caratteri.", "200 characters at most."));
  const attitude = sliceOf(state)?.attitudes?.[targetId] ?? "indifferent";
  const locked = list(sliceOf(state)?.judgements).some(
    (j) =>
      j.kind === "influence" &&
      j.actorId === actorId &&
      j.targetId === targetId &&
      j.skill === skill &&
      j.status === "failed" &&
      !j.cleared,
  );
  if (locked)
    reasons.push(
      reason(
        "wait",
        "Hai già fallito così: aspetta 24 ore (o quanto decide il DM).",
        "You already failed this way: wait 24 hours (or what the DM decides).",
      ),
    );
  const modifier = INFLUENCE_SKILLS.includes(skill)
    ? testModifier(state, actorId, { kind: "skill", skill })
    : null;
  const dc = target ? Math.max(15, Number(effective(target).abilities?.int) || 0) : null;
  return {
    reasons,
    attitude,
    dc,
    bonus: modifier?.value ?? null,
    source: SOURCES.influence,
    available: reasons.length === 0,
  };
}
export function commitInfluence(state, input, role, { operationId }) {
  const preview = previewInfluence(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) actor.action = false;
  const judgement = {
    id: operationId,
    kind: "influence",
    actorId: actor.id,
    targetId: input.targetId,
    skill: input.skill,
    urge: String(input.urge).trim(),
    attitude: preview.attitude,
    dc: preview.dc,
    status: "awaiting-dm",
    by: role,
    at: new Date().toISOString(),
    outcome: null,
  };
  writable(state).judgements.push(judgement);
  return judgement;
}
/** DM: willing (success), unwilling (fails), hesitant (a check against the DC). */
export function commitJudge(state, input, role, { operationId }) {
  if (!runsSession(state, role)) fail("dm-only", "Decide il DM.", "The DM decides.");
  const judgement = list(sliceOf(state)?.judgements).find((j) => j.id === input.judgementId);
  if (!judgement || judgement.status !== "awaiting-dm")
    fail("closed", "Questa richiesta è già decisa.", "This request is already decided.");
  if (!["willing", "unwilling", "hesitant"].includes(input.decision))
    fail("decision", "Scegli una decisione.", "Choose a decision.");
  judgement.decision = input.decision;
  if (input.decision === "willing") {
    judgement.status = "succeeded";
    judgement.outcome = text(
      "Disposta: lo fa a modo suo, senza prova.",
      "Willing: it complies its own way, no check.",
    );
    return judgement;
  }
  if (input.decision === "unwilling") {
    judgement.status = "refused";
    judgement.outcome = text(
      "Contraria: non lo fa, nessuna prova.",
      "Unwilling: it does not comply, no check.",
    );
    return judgement;
  }
  const dc = Number.isInteger(input.dc) ? input.dc : judgement.dc;
  const extra =
    judgement.attitude === "friendly"
      ? ["advantage"]
      : judgement.attitude === "hostile"
        ? ["disadvantage"]
        : [];
  const request = testRequest(
    state,
    judgement.actorId,
    { kind: "skill", skill: judgement.skill },
    {
      dc,
      label: text("Prova di Influenza", "Influence check"),
      extraModes: extra,
      dcHidden: true,
    },
  );
  judgement.status = "rolling";
  judgement.attemptId = operationId;
  enqueue(state, {
    id: operationId,
    actorId: judgement.actorId,
    move: {
      kind: "influence",
      actorId: judgement.actorId,
      targetId: judgement.targetId,
      judgementId: judgement.id,
    },
    label: text(
      `Influenzare ${state.actors[judgement.targetId]?.name ?? ""}`,
      `Influence ${state.actors[judgement.targetId]?.name ?? ""}`,
    ),
    source: SOURCES.influence,
    requests: [request],
    outcomes: [judgement.actorId],
  });
  return judgement;
}
export function commitAttitude(state, input, role) {
  if (!runsSession(state, role))
    fail("dm-only", "Solo il DM cambia l’atteggiamento.", "Only the DM changes attitudes.");
  if (!ATTITUDES.includes(input.attitude))
    fail("attitude", "Atteggiamento non valido.", "Invalid attitude.");
  const actor = state.actors?.[input.actorId];
  if (!actor || actor.kind === "character")
    fail(
      "not-monster",
      "L’atteggiamento vale per mostri e PNG.",
      "Attitudes apply to monsters and NPCs.",
    );
  writable(state).attitudes[input.actorId] = input.attitude;
}
/** DM: after a failed Influence, allow the same approach again before 24 hours pass. */
export function commitAllowRetry(state, input, role) {
  if (!runsSession(state, role))
    fail("dm-only", "Solo il DM consente di riprovare.", "Only the DM allows a new attempt.");
  const judgement = list(sliceOf(state)?.judgements).find((j) => j.id === input.judgementId);
  if (!judgement || judgement.status !== "failed" || judgement.cleared)
    fail("closed", "Nessun tentativo da sbloccare.", "No attempt to unlock.");
  judgement.cleared = true;
  judgement.outcome = text(
    "Rifiuta: il DM consente di riprovare",
    "Refuses: the DM allows a new attempt",
  );
  return judgement;
}

// ---------------------------------------------------------------- Utilize

/** Utilize (SRD EN 191 / IT 218): an object that needs an action, within reach. */
export function previewUtilize(state, input, role) {
  const { actorId, featureId } = input;
  const reasons = common(state, actorId, role, { action: true });
  const feature = featureById(state, featureId);
  const token = tokenOf(state, actorId);
  if (!feature || feature.kind !== "object" || (feature.secret && !feature.revealed))
    reasons.push(
      reason("choose-object", "Scegli un oggetto visibile.", "Choose a visible object."),
    );
  else {
    const meters = token ? metersBetween(sceneOf(state), token, feature) : Infinity;
    if (meters > REACH + 0.01)
      reasons.push(
        reason(
          "out-of-reach",
          `L’oggetto è a ${fmt(meters)} m: avvicinati entro 1,5 m.`,
          `The object is ${fmt(meters, "en")} m away: move within 1.5 m.`,
        ),
      );
    if (feature.used && feature.effect === "drain-fountain")
      reasons.push(reason("used", "La leva è già stata tirata.", "The lever was already pulled."));
  }
  return { reasons, feature, source: SOURCES.utilize, available: reasons.length === 0 };
}
export function commitUtilize(state, input, role, { operationId }) {
  const preview = previewUtilize(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) actor.action = false;
  const feature = featureById(state, input.featureId);
  feature.used = true;
  if (feature.effect === "drain-fountain") {
    const water = featureById(state, "sm-fountain");
    if (water) water.drained = true;
  }
  const token = tokenOf(state, actor.id);
  return recordMove(state, {
    id: operationId,
    kind: "utilize",
    actorId: actor.id,
    from: token,
    to: token,
    outcome: copy(feature.result),
  });
}

// ---------------------------------------------------------------- mounts

export function mountOf(state, riderId) {
  return sliceOf(state)?.mounts?.[riderId] ?? null;
}
export function riderOf(state, mountId) {
  const entry = Object.entries(sliceOf(state)?.mounts ?? {}).find(([, m]) => m.mountId === mountId);
  return entry ? entry[0] : null;
}
/**
 * C10 (R3 → R1): who rides this mount and whether it is controlled (SRD 5.2.1 "Controlling a
 * Mount", EN 15 / IT 17: it acts on the rider's turn with only Dash, Disengage and Dodge) or
 * independent (keeps its place in the order and acts as it likes). Null when not ridden.
 */
export function mountControl(state, mountId) {
  const riderId = riderOf(state, mountId);
  if (!riderId) return null;
  return { riderId, controlled: sliceOf(state).mounts[riderId].controlled !== false };
}
// Where rider and mount stood at the last synchronisation: the rider follows a mount that
// moved (carried, no movement spent); a rider moved on her own left the saddle.
const spotOf = (state, actorId) => {
  const t = tokenOf(state, actorId);
  return t ? { x: t.x, y: t.y } : null;
};
function syncMount(state, riderId) {
  const entry = writable(state).mounts[riderId];
  if (entry) entry.at = { mount: spotOf(state, entry.mountId), rider: spotOf(state, riderId) };
}
const moved = (a, b) => !a || !b || Math.hypot(a.x - b.x, a.y - b.y) > 0.5;
/** DM: bring the SRD Riding Horse on the scene next to a creature (a party mount). */
export function commitSummonMount(state, input, role) {
  if (!runsSession(state, role))
    fail(
      "dm-only",
      "Solo il DM porta una cavalcatura in scena.",
      "Only the DM brings a mount on the scene.",
    );
  const scene = sceneOf(state);
  const near = tokenOf(state, input.nearActorId);
  if (!scene || !near)
    fail("no-token", "Scegli una creatura sulla scena.", "Choose a creature on the scene.");
  const slice = writable(state);
  const id = "sm-horse-" + slice.nextHorse;
  slice.nextHorse += 1;
  const spot = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]
    .map(([dx, dy]) => ({ x: near.x + dx * scene.gridSize, y: near.y + dy * scene.gridSize }))
    .find((p) => previewTokenPlacement(scene, p, {}).available);
  if (!spot) fail("no-space", "Nessuno spazio libero accanto.", "No free space next to it.");
  const h = RIDING_HORSE;
  state.actors[id] = {
    id,
    name: h.name.it + (slice.nextHorse > 2 ? " " + (slice.nextHorse - 1) : ""),
    kind: "npc",
    owner: "dm",
    visibility: "shared",
    campaignIds: state.campaign?.id ? [state.campaign.id] : [],
    hp: h.hp,
    maxHp: h.hp,
    ac: h.ac,
    className: text("Cavalcatura (SRD)", "Mount (SRD)"),
    level: 1,
    size: h.size,
    creatureType: h.creatureType,
    speed: h.speed,
    movement: h.speed,
    movementSpent: 0,
    dashCount: 0,
    action: true,
    bonus: true,
    reaction: true,
    abilities: { ...h.abilities },
    proficiencyBonus: 2,
    // SRD "Controlling a Mount": domesticated horses are trained to accept a rider.
    mountTrained: true,
    slots: { used: 0, max: 0 },
    inventory: [],
    notes: "",
    conditions: [],
    conditionImmunities: [],
    vitalityPolicy: { zeroHp: "death", source: { kind: "srd", revision: "5.2.1" } },
    combatProfile: {
      team: "party",
      proficiencyBonus: 2,
      weaponProficiencies: [],
      spells: [],
      componentsAvailable: true,
    },
    source: copy(h.source),
  };
  scene.tokens.push({ id: "token-" + id, actorId: id, x: spot.x, y: spot.y });
  return state.actors[id];
}
/** Mounting (SRD "Mounted Combat", EN 15 / IT 17): within 1.5 m, one size larger, half Speed. */
export function previewMount(state, input, role) {
  const { actorId, mountId } = input;
  const reasons = common(state, actorId, role, { movement: true, move: true });
  const actor = state.actors?.[actorId];
  const mount = state.actors?.[mountId];
  const scene = sceneOf(state);
  const result = { reasons, source: SOURCES.mounted };
  if (!actor) return { ...result, available: false };
  if (mountOf(state, actorId))
    reasons.push(reason("mounted", "Sei già in sella.", "You are already mounted."));
  if (!mount || !tokenOf(state, mountId) || mountId === actorId) {
    reasons.push(
      reason(
        "choose-mount",
        "Scegli la cavalcatura entro 1,5 m.",
        "Choose the mount within 1.5 m.",
      ),
    );
    return { ...result, available: false };
  }
  const a = tokenOf(state, actorId),
    b = tokenOf(state, mountId);
  const meters = a && b ? metersBetween(scene, a, b) : Infinity;
  if (meters > REACH + 0.01)
    reasons.push(
      reason(
        "far",
        `${mount.name} è a ${fmt(meters)} m: serve entro 1,5 m.`,
        `${mount.name} is ${fmt(meters, "en")} m away: it must be within 1.5 m.`,
      ),
    );
  if (sizeIndex(mount) < sizeIndex(actor) + 1)
    reasons.push(
      reason(
        "too-small",
        `${mount.name} deve essere almeno di una taglia più grande (${SIZE_NAMES[sizeOf(mount)].it} contro ${SIZE_NAMES[sizeOf(actor)].it}${mount.activeForm ? ", nella forma attuale" : ""}).`,
        `${mount.name} must be at least one size larger (${SIZE_NAMES[sizeOf(mount)].en} against ${SIZE_NAMES[sizeOf(actor)].en}${mount.activeForm ? ", in its current form" : ""}).`,
      ),
    );
  if (riderOf(state, mountId))
    reasons.push(
      reason("taken", `${mount.name} ha già un cavaliere.`, `${mount.name} already has a rider.`),
    );
  // SRD "Controlling a Mount" (EN 15 / IT 17): only a mount trained to accept a rider can be
  // controlled; any willing creature can carry a rider as an independent mount.
  const controlled = input.controlled !== false;
  if (controlled && mount.mountTrained !== true)
    reasons.push(
      reason(
        "untrained",
        `${mount.name} non è addestrata a portare un cavaliere: scegli «Indipendente» (si muove e agisce da sola).`,
        `${mount.name} is not trained to accept a rider: choose “Independent” (it moves and acts on its own).`,
      ),
    );
  const willing = canControlActor(mount, role, state) || teamOf(mount) === teamOf(actor);
  if (!willing)
    reasons.push(
      reason(
        "unwilling",
        `${mount.name} non è disposta: serve il consenso del DM.`,
        `${mount.name} is not willing: the DM must agree.`,
      ),
    );
  const speed = Math.max(0, getEffectiveSpeed(actor) ?? 0);
  const cost = round(Math.floor(speed / 2 / 0.3 + EPS) * 0.3);
  const left = movementLeft(state, actorId);
  if (cost > left + EPS) reasons.push(budgetReason(cost, left));
  return {
    ...result,
    mount: {
      id: mount.id,
      name: mount.name,
      size: sizeOf(mount),
      speed: speedsOf(state, mountId).walk,
      trained: mount.mountTrained === true,
    },
    controlled,
    cost,
    available: reasons.length === 0,
  };
}
function removeFromOrder(state, actorId) {
  const order = state.combat?.order;
  if (!Array.isArray(order)) return null;
  const index = order.indexOf(actorId);
  if (index < 0) return null;
  order.splice(index, 1);
  if (index < state.combat.turn) state.combat.turn -= 1;
  return index;
}
export function commitMount(state, input, role, { operationId }) {
  const preview = previewMount(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) spendMovement(actor, preview.cost);
  const slice = writable(state);
  // A controlled mount's initiative changes to match its rider's: it acts on that turn. An
  // independent one keeps its place in the order.
  const removed =
    inCombat(state) && preview.controlled ? removeFromOrder(state, input.mountId) : null;
  slice.mounts[actor.id] = {
    mountId: input.mountId,
    controlled: preview.controlled,
    since: turnKeyOf(state),
    removedAt: removed,
  };
  const rider = tokenOf(state, actor.id);
  const mount = tokenOf(state, input.mountId);
  const from = { x: rider.x, y: rider.y };
  Object.assign(rider, { x: mount.x, y: mount.y - 12 });
  syncMount(state, actor.id);
  return recordMove(state, {
    id: operationId,
    kind: "mount",
    actorId: actor.id,
    targetId: input.mountId,
    from,
    to: rider,
    cost: preview.cost,
    outcome: text(
      `In sella a ${preview.mount.name} (${fmt(preview.cost)} m).`,
      `Mounted on ${preview.mount.name} (${fmt(preview.cost, "en")} m).`,
    ),
  });
}
/** Riding a controlled mount: it moves on the rider's turn with its own Speed. */
export function previewRide(state, input, role) {
  const { actorId, point } = input;
  const reasons = common(state, actorId, role, {});
  const entry = mountOf(state, actorId);
  const result = { reasons, source: SOURCES.mounted };
  if (!entry) {
    reasons.push(reason("not-mounted", "Non sei in sella.", "You are not mounted."));
    return { ...result, available: false };
  }
  const mount = state.actors[entry.mountId];
  const scene = sceneOf(state);
  const start = tokenOf(state, entry.mountId);
  if (!mount || !start) {
    reasons.push(
      reason("no-mount", "La cavalcatura non è sulla scena.", "The mount is not on the scene."),
    );
    return { ...result, available: false };
  }
  if (entry.controlled === false && inCombat(state))
    reasons.push(
      reason(
        "independent",
        `${mount.name} è una cavalcatura indipendente: si muove nel suo turno, come vuole. Smonta per muoverti da solo.`,
        `${mount.name} is an independent mount: it moves on its own turn, as it likes. Dismount to move on your own.`,
      ),
    );
  if (!point) {
    reasons.push(reason("choose-destination", "Indica dove cavalcare.", "Point at where to ride."));
    return { ...result, available: false };
  }
  const path = tracePath(scene, start, [...(input.waypoints ?? []), point], { role });
  const speed = speedsOf(state, entry.mountId).walk;
  const used = Number(sliceOf(state).mountUse?.[turnKeyOf(state) + ":" + entry.mountId]) || 0;
  const left = inCombat(state) ? Math.max(0, speed - used) : Infinity;
  if (path.blocked)
    reasons.push(path.reasons.at(-1) ?? reason("blocked", "Percorso bloccato.", "Path blocked."));
  if (path.totalCost > left + EPS) reasons.push(budgetReason(path.totalCost, left));
  if (!previewTokenPlacement(scene, point, { excludeActorId: entry.mountId }).available)
    reasons.push(
      reason("occupied", "Lo spazio di arrivo è occupato.", "The destination is occupied."),
    );
  return {
    ...result,
    mountId: entry.mountId,
    from: { x: start.x, y: start.y },
    to: { x: point.x, y: point.y },
    meters: round(path.distance),
    cost: round(path.totalCost),
    left,
    speed,
    path,
    available: reasons.length === 0,
  };
}
export function commitRide(state, input, role, { operationId }) {
  const preview = previewRide(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const mount = tokenOf(state, preview.mountId);
  const rider = tokenOf(state, input.actorId);
  Object.assign(mount, { x: preview.to.x, y: preview.to.y });
  Object.assign(rider, { x: preview.to.x, y: preview.to.y - 12 });
  syncMount(state, input.actorId);
  if (inCombat(state)) {
    const key = turnKeyOf(state) + ":" + preview.mountId;
    const slice = writable(state);
    slice.mountUse[key] = round((Number(slice.mountUse[key]) || 0) + preview.cost);
  }
  return recordMove(state, {
    id: operationId,
    kind: "ride",
    actorId: input.actorId,
    targetId: preview.mountId,
    from: preview.from,
    to: preview.to,
    meters: preview.meters,
    cost: preview.cost,
    outcome: text(`Cavalca per ${fmt(preview.meters)} m.`, `Rides ${fmt(preview.meters, "en")} m.`),
  });
}
export function previewDismount(state, input, role) {
  const { actorId } = input;
  const reasons = common(state, actorId, role, { movement: true });
  const entry = mountOf(state, actorId);
  if (!entry) reasons.push(reason("not-mounted", "Non sei in sella.", "You are not mounted."));
  const actor = state.actors?.[actorId];
  const speed = Math.max(0, getEffectiveSpeed(actor) ?? 0);
  const cost = round(Math.floor(speed / 2 / 0.3 + EPS) * 0.3);
  const left = movementLeft(state, actorId);
  if (cost > left + EPS) reasons.push(budgetReason(cost, left));
  return { reasons, entry, cost, source: SOURCES.mounted, available: reasons.length === 0 };
}
function placeBeside(state, actorId, nearId) {
  const scene = sceneOf(state);
  const near = tokenOf(state, nearId);
  const token = tokenOf(state, actorId);
  const spot = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
    [-1, 1],
    [1, 1],
  ]
    .map(([dx, dy]) => ({ x: near.x + dx * scene.gridSize, y: near.y + dy * scene.gridSize }))
    .find((p) => previewTokenPlacement(scene, p, { excludeActorId: actorId }).available);
  if (spot) Object.assign(token, spot);
  return token;
}
function dismount(state, actorId, { place = true } = {}) {
  const slice = writable(state);
  const entry = slice.mounts[actorId];
  if (!entry) return null;
  delete slice.mounts[actorId];
  // After dismounting, the mount keeps the initiative it matched: right after the rider.
  const order = state.combat?.order;
  if (inCombat(state) && Array.isArray(order) && !order.includes(entry.mountId)) {
    const found = order.indexOf(actorId);
    const at = found < 0 ? order.length - 1 : found;
    order.splice(at + 1, 0, entry.mountId);
    if (at + 1 <= state.combat.turn) state.combat.turn += 1;
  }
  if (place && tokenOf(state, entry.mountId) && tokenOf(state, actorId))
    placeBeside(state, actorId, entry.mountId);
  return entry;
}
export function commitDismount(state, input, role, { operationId }) {
  const preview = previewDismount(state, input, role);
  if (!preview.available) refuse(preview.reasons[0]);
  const actor = state.actors[input.actorId];
  if (inCombat(state)) spendMovement(actor, preview.cost);
  const from = { ...tokenOf(state, actor.id) };
  dismount(state, actor.id);
  return recordMove(state, {
    id: operationId,
    kind: "dismount",
    actorId: actor.id,
    targetId: preview.entry.mountId,
    from,
    to: tokenOf(state, actor.id),
    cost: preview.cost,
    outcome: text(`Smonta (${fmt(preview.cost)} m).`, `Dismounts (${fmt(preview.cost, "en")} m).`),
  });
}

// ---------------------------------------------------------------- transformation save (R3 PG-79)

/**
 * SRD 5.2.1 Polymorph (EN 153–154 / IT 164): an unwilling target makes a Wisdom saving throw
 * through the request queue (physical or digital dice); a failure imposes the chosen form
 * (forms-companions.imposeTransformation), a success leaves it as it is. The DM, or the
 * controller of the target, asks for it; the DC is the caster's spell save DC.
 */
export function commitTransformSave(state, input, role, { operationId }) {
  const { actorId, dc, selection } = input;
  const target = state.actors?.[actorId];
  if (!target || !tokenOf(state, actorId))
    fail("no-token", "Scegli una creatura sulla scena.", "Choose a creature on the scene.");
  const preview = transformPreview(state, actorId, selection, role);
  if (!preview.canApply) {
    const e = preview.errors[0];
    fail(e.code, e.it, e.en);
  }
  if (!Number.isInteger(dc) || dc < 1 || dc > 40)
    fail("dc", "Indica la CD del tiro salvezza (1–40).", "Give the saving throw DC (1–40).");
  // PG-79: the spell is cast now (slot and Action), whatever the save decides.
  spendPolymorphCast(state, selection);
  const request = testRequest(
    state,
    actorId,
    { kind: "save", ability: "wis" },
    { dc, label: text("Resistere a Metamorfosi", "Resist Polymorph") },
  );
  return enqueue(state, {
    id: operationId,
    actorId: selection.casterId && state.actors[selection.casterId] ? selection.casterId : actorId,
    move: { kind: "transform-save", actorId, targetId: actorId, selection: copy(selection) },
    label: text("Metamorfosi: tiro salvezza su Saggezza", "Polymorph: Wisdom saving throw"),
    source: SOURCES.polymorph,
    requests: [request],
    outcomes: [actorId],
  });
}

// ---------------------------------------------------------------- approval (FG / NYT)

export const APPROVAL_MODES = Object.freeze(["free", "out-of-turn", "all"]);
/** FVT-114 / R20-168: a player's move becomes a proposal the DM approves or cancels. */
export function approvalRequired(state, actorId, role) {
  const mode = sliceOf(state)?.settings?.approval ?? "free";
  if (runsSession(state, role) || mode === "free") return false;
  if (mode === "all") return true;
  return inCombat(state) && state.combat.order?.[state.combat.turn] !== actorId;
}
export function commitApprovalMode(state, input, role) {
  if (!runsSession(state, role))
    fail(
      "dm-only",
      "Solo il DM sceglie la modalità della mappa.",
      "Only the DM chooses the map mode.",
    );
  if (!APPROVAL_MODES.includes(input.mode)) fail("mode", "Modalità non valida.", "Invalid mode.");
  writable(state).settings.approval = input.mode;
}
export function commitPropose(state, input, role, { operationId }) {
  const { actorId, point, waypoints = [] } = input;
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    fail("not-controller", "Non controlli questa creatura.", "You do not control this creature.");
  const scene = sceneOf(state);
  const token = tokenOf(state, actorId);
  if (!token || !point)
    fail("choose-destination", "Indica la destinazione.", "Point at the destination.");
  const path = tracePath(scene, token, [...waypoints, point], { role });
  if (path.blocked) refuse(path.reasons.at(-1));
  if (path.distance < 0.1)
    fail("too-short", "Scegli una destinazione diversa.", "Choose another destination.");
  const slice = writable(state);
  // One pending proposal per creature: a new one replaces the previous.
  for (const old of slice.proposals)
    if (old.actorId === actorId && old.status === "pending") old.status = "replaced";
  const proposal = {
    id: operationId,
    actorId,
    sceneId: state.activeSceneId,
    from: { x: token.x, y: token.y },
    points: [...waypoints, point].map((p) => ({ x: round(p.x, 1), y: round(p.y, 1) })),
    meters: round(path.distance),
    cost: round(path.totalCost),
    status: "pending",
    by: role,
    at: new Date().toISOString(),
    turnKey: turnKeyOf(state),
  };
  slice.proposals.push(proposal);
  if (slice.proposals.length > 60) slice.proposals.splice(0, slice.proposals.length - 60);
  return proposal;
}
export const pendingProposals = (state) =>
  list(sliceOf(state)?.proposals).filter(
    (p) => p.status === "pending" && p.sceneId === state.activeSceneId,
  );
export function commitDecide(state, input, role, { operationId }) {
  const proposal = list(sliceOf(state)?.proposals).find((p) => p.id === input.proposalId);
  if (!proposal || proposal.status !== "pending")
    fail("closed", "Proposta già decisa.", "Proposal already decided.");
  if (input.decision === "withdraw") {
    if (!canControlActor(state.actors[proposal.actorId], role, state) || proposal.by !== role)
      fail("not-owner", "Solo chi l’ha proposta la ritira.", "Only its author withdraws it.");
    proposal.status = "withdrawn";
    return proposal;
  }
  if (!runsSession(state, role))
    fail("dm-only", "Approva o annulla il DM.", "The DM approves or cancels.");
  proposal.decidedAt = new Date().toISOString();
  if (input.decision === "cancel") {
    proposal.status = "cancelled";
    return proposal;
  }
  const token = tokenOf(state, proposal.actorId);
  if (!token || Math.hypot(token.x - proposal.from.x, token.y - proposal.from.y) > 0.5) {
    proposal.status = "stale";
    fail(
      "stale",
      "La pedina si è già spostata: la proposta non vale più.",
      "The token already moved: the proposal no longer applies.",
    );
  }
  const point = proposal.points.at(-1);
  const waypoints = proposal.points.slice(0, -1);
  if (inCombat(state) && state.combat.order?.[state.combat.turn] !== proposal.actorId) {
    // Out of turn (Not Your Turn): the DM places the token; no turn movement is spent.
    const path = tracePath(sceneOf(state), token, proposal.points, { role });
    if (path.blocked) refuse(path.reasons.at(-1));
    Object.assign(token, path.end);
    proposal.outOfTurn = true;
    recordMove(state, {
      id: operationId,
      kind: "approved",
      actorId: proposal.actorId,
      from: proposal.from,
      to: path.end,
      meters: path.distance,
      cost: 0,
      outcome: text(
        "Spostamento fuori turno approvato dal DM.",
        "Out-of-turn move approved by the DM.",
      ),
    });
  } else {
    beginMovement(
      state,
      {
        id: operationId + ":move",
        actorId: proposal.actorId,
        point,
        waypoints,
        geometryKey: geometryKey(sceneOf(state)),
      },
      "dm",
    );
  }
  proposal.status = "approved";
  return proposal;
}

// ---------------------------------------------------------------- scene rules

export const RULE_NAMES = Object.freeze({
  euclidean: text("Linea retta (senza griglia)", "Straight line (gridless)"),
  "grid-srd": text(
    "Griglia SRD 2024: diagonale = 1 quadretto (predefinita)",
    "SRD 2024 grid: diagonal = 1 square (default)",
  ),
  "grid-alternate": text("Variante 1,5 m / 3 m alternati", "Variant alternating 5/10 ft"),
  manhattan: text("Solo ortogonale (Manhattan)", "Orthogonal only (Manhattan)"),
  hex: text("Esagoni", "Hexes"),
});
export const RULE_SOURCES = Object.freeze({
  euclidean: SOURCES.euclidean,
  "grid-srd": SOURCES.grid,
  "grid-alternate": SOURCES.alternate,
  manhattan: SOURCES.manhattan,
  hex: SOURCES.hex,
});
// P6 TV-10: a scene without a rule uses the SRD 2024 grid (spatial.distanceRuleOf).
export const ruleOf = (scene) => distanceRuleOf(scene);
/** DM: the scene's distance rule and grid shape (Roll20 page settings R20-086). */
export function commitSceneRule(state, input, role) {
  if (!runsSession(state, role))
    fail("dm-only", "Solo il DM cambia la griglia.", "Only the DM changes the grid.");
  const scene = list(state.scenes).find((s) => s.id === (input.sceneId ?? state.activeSceneId));
  if (!scene) fail("scene", "Scena non trovata.", "Scene not found.");
  if (!DISTANCE_RULES.includes(input.rule)) fail("rule", "Regola non valida.", "Invalid rule.");
  const slice = writable(state);
  const wasHex = scene.gridShape === "hex";
  if (input.rule === "hex" && !wasHex) {
    slice.squareGrid[scene.id] = scene.gridVisible !== false;
    scene.gridVisible = false;
    scene.gridShape = "hex";
  } else if (input.rule !== "hex" && wasHex) {
    scene.gridVisible = slice.squareGrid[scene.id] !== false;
    delete slice.squareGrid[scene.id];
    delete scene.gridShape;
  }
  scene.distanceRule = input.rule;
  return scene;
}
/** Pointy-top hex outlines as wide as a grid cell, covering the scene (SVG path data). */
export function hexGridPath(scene) {
  const w = scene.gridSize,
    size = w / Math.sqrt(3),
    h = size * 2,
    step = h * 0.75;
  const parts = [];
  for (let row = 0, y = size; y - size < scene.height; row++, y += step) {
    for (let x = row % 2 ? w : w / 2; x - w / 2 < scene.width; x += w) {
      const corners = [];
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 180) * (60 * k - 30);
        corners.push(`${round(x + size * Math.cos(a), 1)} ${round(y + size * Math.sin(a), 1)}`);
      }
      parts.push("M" + corners.join("L") + "Z");
    }
  }
  return parts.join("");
}

// ---------------------------------------------------------------- resolver and turns

function outcomeOf(attempt, actorId) {
  return attempt.outcomes.find((o) => o.actorId === actorId);
}
function settle(outcome, status, label, extra = {}) {
  Object.assign(outcome, { status, label, ...extra });
}
const success = (request) =>
  request.status === "resolved" && Number.isInteger(request.dc) && request.total >= request.dc;
/**
 * Settles this area's attempts once their rolls are resolved (combat.mjs
 * resolveAttemptKind): in the same transaction that accepted the roll.
 */
export function resolveAttempt(state, attempt, { applyDamage }) {
  const move = attempt.specialMove ?? {};
  if (attempt.requests.some((r) => r.status === "pending")) return;
  const operationId = attempt.id;
  const byStep = (step) => attempt.requests.find((r) => r.step === step);
  const first = attempt.requests[0];
  if (move.kind === "grapple" || move.kind === "shove") {
    const outcome = outcomeOf(attempt, move.targetId);
    if (!outcome || outcome.status !== "pending") return;
    const save = byStep("save") ?? first;
    const saved = !move.autoFail && save.total >= move.dc;
    outcome.saveSuccess = saved;
    if (saved)
      return settle(outcome, "resisted", text("Resiste: nessun effetto", "Resists: no effect"));
    const target = state.actors[move.targetId];
    if (move.kind === "grapple") {
      const result = applyConditionEvent(state, {
        eventId: operationId + ":grappled",
        actorId: move.targetId,
        kind: "apply",
        conditionId: "grappled",
        source: SOURCES.grappling,
        origin: { actorId: move.actorId, label: state.actors[move.actorId]?.name ?? "" },
        term: { kind: "manual" },
      });
      writable(state).grapples.push({
        id: operationId,
        grapplerId: move.actorId,
        targetId: move.targetId,
        dc: move.dc,
        instanceId: result.instanceIds?.[0] ?? null,
      });
      return settle(
        outcome,
        "applied",
        text(
          `${target.name} è Afferrato (CD per sfuggire ${move.dc})`,
          `${target.name} is Grappled (escape DC ${move.dc})`,
        ),
      );
    }
    if (move.effect === "prone") {
      applyConditionEvent(state, {
        eventId: operationId + ":prone",
        actorId: move.targetId,
        kind: "apply",
        conditionId: "prone",
        source: SOURCES.unarmedStrike,
        origin: { actorId: move.actorId, label: state.actors[move.actorId]?.name ?? "" },
        term: { kind: "manual" },
      });
      riderFall(state, move.targetId, operationId);
      return settle(
        outcome,
        "applied",
        text(`${target.name} cade Prono`, `${target.name} falls Prone`),
      );
    }
    const token = tokenOf(state, move.targetId);
    const scene = sceneOf(state);
    if (
      !token ||
      !move.landing ||
      isSegmentBlocked(scene, token, move.landing, "blocksMovement") ||
      !previewTokenPlacement(scene, move.landing, { excludeActorId: move.targetId }).available
    )
      return settle(
        outcome,
        "applied",
        text(
          "Spinta fallita: lo spazio non è più libero",
          "Push failed: the space is no longer free",
        ),
      );
    const from = { x: token.x, y: token.y };
    Object.assign(token, move.landing);
    // A mount moved against its will carries its rider, who saves or falls off (SRD
    // "Falling Off", EN 16 / IT 17).
    const riderId = riderOf(state, move.targetId);
    const riderToken = riderId ? tokenOf(state, riderId) : null;
    if (riderToken) {
      riderToken.x = round(riderToken.x + move.landing.x - from.x, 1);
      riderToken.y = round(riderToken.y + move.landing.y - from.y, 1);
      riderFall(state, move.targetId, operationId);
    }
    recordMove(state, {
      id: operationId + ":pushed",
      kind: "pushed",
      actorId: move.actorId,
      targetId: move.targetId,
      from,
      to: move.landing,
      meters: 1.5,
      cost: 0,
      outcome: text(`${target.name} spinto di 1,5 m`, `${target.name} pushed 1.5 m`),
    });
    const altitude = altitudeOf(state, move.targetId);
    if (altitude > 0 && !(speedsOf(state, move.targetId).fly > 0)) {
      const preview = previewFall(state, { actorId: move.targetId }, "dm");
      if (preview.available) startFall(state, move.targetId, preview, operationId + ":ledge");
      reconcileGrapples(state, operationId);
      return settle(
        outcome,
        "applied",
        text(
          `${target.name} spinto giù dal bordo: cade da ${fmt(altitude)} m`,
          `${target.name} shoved off the edge: falls ${fmt(altitude, "en")} m`,
        ),
      );
    }
    reconcileGrapples(state, operationId);
    return settle(
      outcome,
      "applied",
      text(`${target.name} spinto di 1,5 m`, `${target.name} pushed 1.5 m`),
    );
  }
  if (move.kind === "fall") {
    const outcome = outcomeOf(attempt, move.actorId);
    if (!outcome || outcome.status !== "pending") return;
    const dive = byStep("dive");
    const damage = byStep("damage") ?? first;
    const halved = dive ? success(dive) : false;
    const amount = halved ? Math.floor(damage.total / 2) : damage.total;
    if (amount > 0) {
      applyConditionEvent(state, {
        eventId: operationId + ":landed-prone",
        actorId: move.actorId,
        kind: "apply",
        conditionId: "prone",
        source: SOURCES.falling,
        origin: { label: "Fall" },
        term: { kind: "manual" },
      });
      riderFall(state, move.actorId, operationId);
    }
    applyDamage(outcome, amount, halved ? { saveSuccess: true } : {});
    if (outcome.status !== "ready")
      outcome.label =
        amount > 0
          ? text("Atterra Prono", "Lands Prone")
          : text("Atterra senza danni", "Lands unharmed");
    else
      outcome.label = text("Atterra Prono · danni da applicare", "Lands Prone · damage to apply");
    return;
  }
  const outcome = outcomeOf(attempt, move.actorId ?? attempt.actorId);
  if (!outcome || outcome.status !== "pending") return;
  const passed = success(first);
  const consumeHelp = () => {
    const help = list(sliceOf(state)?.effects).find((e) => e.id === move.helpId);
    if (help) help.consumed = true;
  };
  if (move.helpId) consumeHelp();
  if (move.kind === "landing")
    return passed
      ? settle(outcome, "applied", text("Atterra in piedi", "Lands on its feet"))
      : (applyConditionEvent(state, {
          eventId: operationId + ":prone",
          actorId: move.actorId,
          kind: "apply",
          conditionId: "prone",
          source: SOURCES.longJump,
          origin: { label: "Jump" },
          term: { kind: "manual" },
        }),
        settle(
          outcome,
          "applied",
          text("Atterra Prono sul terreno difficile", "Lands Prone in the difficult terrain"),
        ));
  if (move.kind === "climb") {
    if (!passed)
      return settle(
        outcome,
        "applied",
        text("Scivola: non sale, movimento non speso", "Slips: no progress, no movement spent"),
      );
    applyClimb(state, move.actorId, move);
    const token = tokenOf(state, move.actorId);
    recordMove(state, {
      id: operationId + ":climbed",
      kind: "climb",
      actorId: move.actorId,
      from: token,
      to: token,
      meters: Math.abs(move.height - move.from),
      cost: move.cost,
      altitude: move.height,
      outcome: text(`Arriva a ${fmt(move.height)} m`, `Reaches ${fmt(move.height, "en")} m`),
    });
    return settle(
      outcome,
      "applied",
      text(`Sale a ${fmt(move.height)} m`, `Climbs to ${fmt(move.height, "en")} m`),
    );
  }
  if (move.kind === "escape") {
    if (!passed) return settle(outcome, "applied", text("Resta Afferrato", "Stays Grappled"));
    const grapple = list(sliceOf(state)?.grapples).find((g) => g.id === move.grappleId);
    if (grapple) endGrapple(state, grapple, "Escaped the grapple", operationId);
    return settle(outcome, "applied", text("Si libera dalla presa", "Escapes the grapple"));
  }
  if (move.kind === "hide") {
    if (!passed)
      return settle(outcome, "applied", text("Non riesce a nascondersi", "Fails to hide"));
    const result = applyConditionEvent(state, {
      eventId: operationId + ":invisible",
      actorId: move.actorId,
      kind: "apply",
      conditionId: "invisible",
      source: SOURCES.hide,
      origin: { actorId: move.actorId, label: "Hide" },
      term: { kind: "manual" },
    });
    writable(state).hidden[move.actorId] = {
      dc: first.total,
      instanceId: result.instanceIds?.[0] ?? null,
      sceneId: state.activeSceneId,
      attemptsBefore: list(state.combatAttempts).length,
    };
    return settle(
      outcome,
      "applied",
      text(
        `Nascosto: Invisibile, CD ${first.total} per trovarlo`,
        `Hidden: Invisible, DC ${first.total} to find it`,
      ),
    );
  }
  if (move.kind === "search") {
    const scene = sceneOf(state);
    const origin = tokenOf(state, move.actorId);
    const found = [];
    if (move.skill === "perception" && origin) {
      for (const f of featuresOf(state))
        if (
          f.secret &&
          !f.revealed &&
          metersBetween(scene, origin, f) <= 9 + 0.01 &&
          first.total >= f.dc
        ) {
          f.revealed = true;
          found.push(copy(f.name));
        }
      for (const [actorId, entry] of Object.entries(sliceOf(state)?.hidden ?? {})) {
        const t = tokenOf(state, actorId);
        if (
          actorId === move.actorId ||
          !t ||
          !opposed(state.actors[move.actorId], state.actors[actorId])
        )
          continue;
        if (first.total >= entry.dc && hasLineOfSight(scene, origin, t)) {
          endHidden(state, actorId, "Found by a Search", operationId);
          found.push(text(state.actors[actorId].name, state.actors[actorId].name));
        }
      }
    }
    outcome.found = found;
    return settle(
      outcome,
      "applied",
      found.length
        ? text(
            `Trova: ${found.map((f) => f.it).join(", ")}`,
            `Finds: ${found.map((f) => f.en).join(", ")}`,
          )
        : move.skill === "perception"
          ? text("Non trova nulla di nascosto qui intorno", "Finds nothing hidden nearby")
          : text(
              `Totale ${first.total}: il DM descrive cosa noti`,
              `Total ${first.total}: the DM describes what you notice`,
            ),
    );
  }
  if (move.kind === "study") {
    const slice = writable(state);
    const learned = list(slice.lore).filter(
      (l) =>
        l.subject.kind === move.subject.kind &&
        l.subject.id === move.subject.id &&
        l.skill === move.skill &&
        first.total >= l.dc,
    );
    for (const lore of learned)
      if (!slice.learned.some((row) => row.loreId === lore.id && row.actorId === move.actorId))
        slice.learned.push({ loreId: lore.id, actorId: move.actorId, attemptId: attempt.id });
    outcome.learned = learned.map((l) => l.id);
    return settle(
      outcome,
      "applied",
      learned.length
        ? text(
            `Ricorda: ${learned.map((l) => l.text.it).join(" ")}`,
            `Recalls: ${learned.map((l) => l.text.en).join(" ")}`,
          )
        : text(
            `Totale ${first.total}: nulla di nuovo (il DM può aggiungere un dettaglio)`,
            `Total ${first.total}: nothing new (the DM may add a detail)`,
          ),
    );
  }
  if (move.kind === "influence") {
    const judgement = list(sliceOf(state)?.judgements).find((j) => j.id === move.judgementId);
    if (judgement) {
      judgement.status = passed ? "succeeded" : "failed";
      judgement.total = first.total;
      judgement.outcome = passed
        ? text(`Accetta: «${judgement.urge}»`, `Agrees: “${judgement.urge}”`)
        : text(
            "Rifiuta: aspetta 24 ore prima di riprovare così",
            "Refuses: wait 24 hours before trying this way again",
          );
    }
    return settle(
      outcome,
      "applied",
      passed
        ? text("Influenza riuscita", "Influence succeeded")
        : text("Influenza fallita", "Influence failed"),
    );
  }
  if (move.kind === "transform-save") {
    if (passed)
      return settle(
        outcome,
        "resisted",
        text("Resiste: nessuna trasformazione", "Resists: no transformation"),
      );
    imposeTransformation(state, move.targetId, move.selection, { operationId });
    return settle(
      outcome,
      "applied",
      text(
        `Trasformato in ${move.selection?.profileId ? (transformProfile(move.selection.profileId)?.name?.it ?? "") : ""}`,
        `Transformed into ${move.selection?.profileId ? (transformProfile(move.selection.profileId)?.name?.en ?? "") : ""}`,
      ),
    );
  }
  if (move.kind === "rider-fall") {
    if (passed) return settle(outcome, "applied", text("Resta in sella", "Stays in the saddle"));
    const entry = mountOf(state, move.actorId);
    if (entry) dismount(state, move.actorId);
    if (!hasCondition(state.actors[move.actorId], "prone"))
      applyConditionEvent(state, {
        eventId: operationId + ":thrown-prone",
        actorId: move.actorId,
        kind: "apply",
        conditionId: "prone",
        source: SOURCES.mounted,
        origin: { label: "Falling off" },
        term: { kind: "manual" },
      });
    return settle(outcome, "applied", text("Cade di sella, Prono", "Falls off, Prone"));
  }
  settle(outcome, "applied", text("Risolto", "Resolved"));
}
// SRD "Falling Off" (EN 16 / IT 17): a mount moved against its will, or a rider or mount
// knocked Prone → DC 10 Dex save. (SRD 5.2.1 has no Reaction to land on one's feet when the
// mount falls: that was the 2014 rule; the same save applies.) One request per fall.
function riderFall(state, actorId, operationId) {
  const riderId = mountOf(state, actorId) ? actorId : riderOf(state, actorId);
  if (!riderId) return;
  const entry = writable(state).mounts[riderId];
  entry.proneSeen = {
    rider: hasCondition(state.actors[riderId], "prone"),
    mount: hasCondition(state.actors[entry.mountId], "prone"),
  };
  if (
    list(state.combatAttempts).some(
      (a) =>
        a.status === "pending" &&
        a.specialMove?.kind === "rider-fall" &&
        a.specialMove.actorId === riderId,
    )
  )
    return;
  const request = testRequest(
    state,
    riderId,
    { kind: "save", ability: "dex" },
    { dc: 10, label: text("Restare in sella", "Stay mounted") },
  );
  enqueue(state, {
    id: operationId + ":rider",
    actorId: riderId,
    move: { kind: "rider-fall", actorId: riderId },
    label: text("Cadere di sella?", "Falling off?"),
    source: SOURCES.mounted,
    requests: [request],
    outcomes: [riderId],
  });
}
// Since it hid, the creature made an attack roll or cast a spell with a Verbal component.
function revealedWhileHidden(state, actorId, entry) {
  const since = list(state.combatAttempts)
    .slice(entry?.attemptsBefore ?? 0)
    .filter((a) => a.actorId === actorId);
  if (!since.length) return false;
  const actions = new Map(listActions(state, actorId).map((row) => [row.id, row]));
  return since.some((a) => {
    const action = actions.get(a.actionId);
    return (
      a.requests?.some((r) => r.kind === "attack" && r.status === "resolved") ||
      Boolean(action?.spell && list(action.components).includes("V"))
    );
  });
}
/**
 * Consequences due right after any change, applied by the Table in a follow-up
 * transaction that Undo removes with the change: the Invisible condition of Hide ends
 * immediately after the creature's attack roll or a spell with a Verbal component (SRD
 * Hide EN 183 / IT 210), and a grapple
 * ends as soon as the two creatures are out of reach or the grappler is Incapacitated,
 * whatever moved them (SRD Grappled EN 182 / IT 203).
 */
export function dueConsequences(state) {
  const slice = sliceOf(state);
  if (!slice) return [];
  const out = mountConsequences(state, slice);
  for (const [actorId, entry] of Object.entries(slice.hidden ?? {}))
    if (revealedWhileHidden(state, actorId, entry)) out.push({ kind: "hidden", actorId });
  const scene = sceneOf(state);
  for (const grapple of list(slice.grapples)) {
    const why = grappleBreak(state, grapple, scene);
    if (why)
      out.push({
        kind: "grapple",
        grappleId: grapple.id,
        grapplerId: grapple.grapplerId,
        targetId: grapple.targetId,
        why,
      });
  }
  return out;
}
/**
 * R3 PG-79 (Foundry/Roll20 attached tokens; SRD 5.2.1 Mounted Combat, EN 15–16 / IT 17):
 * after any change the rider follows a mount that moved (carried, no movement spent); a rider
 * relocated on her own (teleport, Misty Step) or a mount taken off the scene ends the riding;
 * a rider or mount newly Prone asks the rider's DC 10 Dexterity save.
 */
function mountConsequences(state, slice) {
  const out = [];
  for (const [riderId, entry] of Object.entries(slice.mounts ?? {})) {
    const rider = spotOf(state, riderId);
    const mount = spotOf(state, entry.mountId);
    if (!rider && !mount) continue;
    const base = { riderId, mountId: entry.mountId };
    if (!rider || !mount || !state.actors[riderId] || !state.actors[entry.mountId]) {
      out.push({ kind: "unmount", ...base });
      continue;
    }
    if (entry.at && moved(entry.at.mount, mount)) out.push({ kind: "carry", ...base });
    else if (entry.at && moved(entry.at.rider, rider)) {
      out.push({ kind: "left-saddle", ...base });
      continue;
    }
    const prone = {
      rider: hasCondition(state.actors[riderId], "prone"),
      mount: hasCondition(state.actors[entry.mountId], "prone"),
    };
    const seen = entry.proneSeen ?? {};
    if ((prone.rider && !seen.rider) || (prone.mount && !seen.mount))
      out.push({
        kind: "prone-fall",
        ...base,
        subject: prone.mount && !seen.mount ? "mount" : "rider",
      });
    else if (Boolean(seen.rider) !== prone.rider || Boolean(seen.mount) !== prone.mount)
      out.push({ kind: "prone-clear", ...base, quiet: true });
  }
  return out;
}
function applyMountConsequence(state, row, operationId) {
  const entry = writable(state).mounts[row.riderId];
  if (!entry) return;
  if (row.kind === "carry") {
    const rider = tokenOf(state, row.riderId);
    const mount = tokenOf(state, row.mountId);
    const at = entry.at;
    Object.assign(rider, {
      x: round(mount.x + (at.rider.x - at.mount.x), 1),
      y: round(mount.y + (at.rider.y - at.mount.y), 1),
    });
    syncMount(state, row.riderId);
  } else if (row.kind === "left-saddle" || row.kind === "unmount")
    dismount(state, row.riderId, { place: false });
  else if (row.kind === "prone-fall") riderFall(state, row.riderId, operationId + ":prone");
  else if (row.kind === "prone-clear")
    entry.proneSeen = {
      rider: hasCondition(state.actors[row.riderId], "prone"),
      mount: hasCondition(state.actors[row.mountId], "prone"),
    };
}
export function applyConsequences(state, operationId) {
  const due = dueConsequences(state);
  for (const row of due)
    if (row.kind === "hidden")
      endHidden(state, row.actorId, "Attack roll or spell with a Verbal component", operationId);
    else if (["carry", "left-saddle", "unmount", "prone-fall", "prone-clear"].includes(row.kind))
      applyMountConsequence(state, row, operationId);
  reconcileGrapples(state, operationId);
  return due;
}
/** Turn phases (combat.mjs observeTurnPhases): hiding ends after an attack; grapples. */
export function onTurnPhase(state, { actorId, phase, turnKey }) {
  const slice = sliceOf(state);
  if (!slice) return;
  const operationId = "turn:" + turnKey + ":" + actorId + ":" + phase + ":b40";
  if (phase === "end") {
    const hidden = slice.hidden[actorId];
    if (hidden) {
      const attacked = list(state.combatAttempts)
        .slice(hidden.attemptsBefore ?? 0)
        .some((a) => a.actorId === actorId && a.requests?.some((r) => r.kind === "attack"));
      if (attacked) endHidden(state, actorId, "Made an attack roll", operationId);
    }
  }
  if (phase === "start")
    slice.effects = slice.effects.filter(
      (e) => !e.turnKey || helpActive(state, e) || e.helperId !== actorId,
    );
  reconcileGrapples(state, operationId);
}

// ---------------------------------------------------------------- catalogue for the tray

/** Hidden status as this viewer may read it: the DC only for the DM and the controller. */
export function hiddenFor(state, actorId, role) {
  const entry = sliceOf(state)?.hidden?.[actorId];
  if (!entry) return null;
  const readable = runsSession(state, role) || canControlActor(state.actors[actorId], role, state);
  return readable ? { dc: entry.dc } : { dc: null };
}
