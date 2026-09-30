// B47 — scene levels: the floors of one building and the stairs between them. Pure domain.
//
// Patterns: Foundry V14 Scene Levels (FVT-080: stacked levels at defined elevations; walls,
// lights and objects belong to their level; tokens climb between levels), the Levels module
// (FVT-081: a floor switch for the GM, stairs), XCOM 2 floor switching (CRP-118: keys change
// the displayed floor). Each floor is a real scene of the campaign with the same footprint,
// so its walls, doors, tokens and lights stay the increment 4 / B35 ones and every editor
// keeps working. The Table shows one floor to everyone at a time (the campaign's active
// scene): the DM's floor switch moves the party's view, as Roll20's page ribbon does. A stair
// has one position, the same on the floors it joins (Foundry levels region), and a token
// standing on it can climb to the other floor.
import { canControlActor, isCampaignActor, isActorAvailable } from "./character-access.mjs";

export const LEVELS_SLICE = "scene-assets";
const L = (it, en) => ({ it, en });
const fail = (it, en) => {
  throw Object.assign(new Error(en), { it, en });
};
const slice = (state) => {
  const value = state?.ext?.[LEVELS_SLICE];
  if (!value) fail("Cartelle, oggetti e piani delle scene non sono disponibili.", "Scene folders, objects and floors are unavailable.");
  if (!value.stacks || typeof value.stacks !== "object") value.stacks = {};
  return value;
};
const requireDM = (role) => {
  if (role !== "dm")
    fail("Solo il DM può cambiare piani e scale.", "Only the DM can change floors and stairs.");
};
const sceneOf = (state, id) => state.scenes.find((scene) => scene.id === id) ?? null;
const uid = (prefix) =>
  prefix +
  "-" +
  (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36))
    .replace(/-/g, "")
    .slice(0, 10);
const cleanName = (value, fallback = "") =>
  String(value ?? fallback)
    .trim()
    .slice(0, 80);
const noCombat = (state) => {
  if (state.combat?.active)
    fail(
      "Durante un combattimento il Tavolo resta sul piano dell’incontro: concludi l’incontro per cambiare piano o salire le scale.",
      "During combat the Table stays on the encounter’s floor: end the encounter to switch floors or climb the stairs.",
    );
};

// ------------------------------------------------------------------------------ queries

/** Floors sorted from the lowest elevation, with their scene. */
export function floorsOf(state, stack) {
  return [...(stack?.floors ?? [])]
    .sort((a, b) => a.elevation - b.elevation)
    .map((floor) => ({ ...floor, scene: sceneOf(state, floor.sceneId) }))
    .filter((floor) => floor.scene);
}
/** The building a scene is a floor of: {stack, floor, floors, index} or null. */
export function stackOf(state, sceneId) {
  const stacks = state?.ext?.[LEVELS_SLICE]?.stacks ?? {};
  for (const stack of Object.values(stacks)) {
    if (!stack.floors?.some((floor) => floor.sceneId === sceneId)) continue;
    const floors = floorsOf(state, stack);
    const index = floors.findIndex((floor) => floor.sceneId === sceneId);
    if (index < 0) continue;
    return { stack, floor: floors[index], floors, index };
  }
  return null;
}
export const floorName = (floor) => floor?.name || floor?.scene?.name || "";
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Stairs of a floor that reach another floor that still exists. */
export function stairsOn(state, sceneId) {
  const found = stackOf(state, sceneId);
  if (!found) return [];
  return (found.stack.stairs ?? []).filter(
    (stair) =>
      stair.floors.includes(sceneId) &&
      stair.floors.some((id) => id !== sceneId && found.floors.some((f) => f.sceneId === id)),
  );
}
/**
 * Tokens standing on a stair of this floor, with where the stair leads (up or down):
 * `[{actorId, tokenId, stair, targets: [{sceneId, name, direction}]}]`.
 */
export function tokensOnStairs(state, sceneId) {
  const scene = sceneOf(state, sceneId);
  const found = stackOf(state, sceneId);
  if (!scene || !found) return [];
  const out = [];
  for (const token of scene.tokens ?? [])
    for (const stair of stairsOn(state, sceneId)) {
      if (dist(token, stair) > stair.radius) continue;
      const here = found.floor.elevation;
      const targets = stair.floors
        .filter((id) => id !== sceneId)
        .map((id) => found.floors.find((floor) => floor.sceneId === id))
        .filter(Boolean)
        .map((floor) => ({
          sceneId: floor.sceneId,
          name: floorName(floor),
          direction: floor.elevation > here ? "up" : "down",
        }));
      if (targets.length) out.push({ actorId: token.actorId, tokenId: token.id, stair, targets });
    }
  return out;
}
/**
 * The party's characters standing on another floor of the building shown at the Table
 * (what the DM is told: nobody else is on screen for them).
 */
export function partyElsewhere(state) {
  const found = stackOf(state, state.activeSceneId);
  if (!found) return [];
  const out = [];
  for (const floor of found.floors) {
    if (floor.sceneId === state.activeSceneId) continue;
    for (const token of floor.scene.tokens ?? []) {
      const actor = state.actors?.[token.actorId];
      if (
        actor?.kind === "character" &&
        actor.visibility !== "private" &&
        isActorAvailable(actor) &&
        isCampaignActor(actor, state.campaign?.id)
      )
        out.push({ actorId: actor.id, name: actor.name, floor });
    }
  }
  return out;
}
/** Where a creature is inside the building shown at the Table (its floor), or null. */
export function floorOfActor(state, actorId) {
  const found = stackOf(state, state.activeSceneId);
  if (!found) return null;
  return (
    found.floors.find((floor) => floor.scene.tokens?.some((t) => t.actorId === actorId)) ?? null
  );
}

// ------------------------------------------------------------------------------ building

export function createStack(state, role, sceneId, { name, floorName: first = "" } = {}) {
  requireDM(role);
  const scene = sceneOf(state, sceneId);
  if (!scene) fail("La scena non esiste più.", "The scene no longer exists.");
  if (stackOf(state, sceneId))
    fail("Questa scena è già un piano di un edificio.", "This scene is already a building floor.");
  const stack = {
    id: uid("stack"),
    name: cleanName(name, scene.name) || scene.name,
    floors: [
      { sceneId, name: cleanName(first) || L("Piano terra", "Ground floor").it, elevation: 0 },
    ],
    stairs: [],
  };
  slice(state).stacks[stack.id] = stack;
  return stack;
}
function stackById(state, stackId) {
  const stack = slice(state).stacks[stackId];
  if (!stack) fail("L’edificio non esiste più.", "The building no longer exists.");
  return stack;
}
const sameFootprint = (a, b) => a.width === b.width && a.height === b.height;

/**
 * Adds a floor: an existing scene with the same footprint, or a new empty scene (`create`:
 * a scene record prepared by the caller, pushed here). Elevation in metres.
 */
export function addFloor(state, role, stackId, { sceneId, create, name, elevation } = {}) {
  requireDM(role);
  const stack = stackById(state, stackId);
  const base = floorsOf(state, stack)[0]?.scene;
  const height = Number(elevation);
  if (!Number.isFinite(height) || height < -300 || height > 300)
    fail("Indica un’altezza tra −300 e 300 m.", "Enter an elevation between −300 and 300 m.");
  if (stack.floors.some((floor) => Math.abs(floor.elevation - height) < 0.01))
    fail("C’è già un piano a questa altezza.", "There is already a floor at this elevation.");
  if (stack.floors.length >= 8)
    fail("Al massimo 8 piani per edificio.", "At most 8 floors per building.");
  let scene;
  if (create) {
    if (sceneOf(state, create.id)) fail("La scena esiste già.", "The scene already exists.");
    state.scenes.push(create);
    scene = create;
  } else {
    scene = sceneOf(state, sceneId);
    if (!scene) fail("La scena non esiste più.", "The scene no longer exists.");
    if (stackOf(state, scene.id))
      fail(
        "Questa scena è già un piano di un edificio.",
        "This scene is already a building floor.",
      );
  }
  if (base && !sameFootprint(base, scene))
    fail(
      `I piani di un edificio hanno la stessa impronta: questa scena misura ${scene.width} × ${scene.height} px, l’edificio ${base.width} × ${base.height} px.`,
      `A building’s floors share one footprint: this scene measures ${scene.width} × ${scene.height} px, the building ${base.width} × ${base.height} px.`,
    );
  const floor = { sceneId: scene.id, name: cleanName(name) || scene.name, elevation: height };
  stack.floors.push(floor);
  return floor;
}
export function updateFloor(state, role, stackId, sceneId, patch = {}) {
  requireDM(role);
  const stack = stackById(state, stackId);
  const floor = stack.floors.find((row) => row.sceneId === sceneId);
  if (!floor) fail("Il piano non esiste più.", "The floor no longer exists.");
  if (patch.name !== undefined) {
    const next = cleanName(patch.name);
    if (!next) fail("Dai un nome al piano.", "Name the floor.");
    floor.name = next;
  }
  if (patch.elevation !== undefined) {
    const height = Number(patch.elevation);
    if (!Number.isFinite(height) || height < -300 || height > 300)
      fail("Indica un’altezza tra −300 e 300 m.", "Enter an elevation between −300 and 300 m.");
    if (stack.floors.some((row) => row !== floor && Math.abs(row.elevation - height) < 0.01))
      fail("C’è già un piano a questa altezza.", "There is already a floor at this elevation.");
    floor.elevation = height;
  }
  return floor;
}
/** Takes a floor out of its building (the scene stays); stairs that reached it go too. */
export function removeFloor(state, role, stackId, sceneId) {
  requireDM(role);
  const stack = stackById(state, stackId);
  if (!stack.floors.some((row) => row.sceneId === sceneId))
    fail("Il piano non esiste più.", "The floor no longer exists.");
  stack.floors = stack.floors.filter((row) => row.sceneId !== sceneId);
  stack.stairs = (stack.stairs ?? []).filter((stair) => !stair.floors.includes(sceneId));
  if (stack.floors.length < 1) delete slice(state).stacks[stackId];
}
export function renameStack(state, role, stackId, name) {
  requireDM(role);
  const stack = stackById(state, stackId);
  const next = cleanName(name);
  if (!next) fail("Dai un nome all’edificio.", "Name the building.");
  stack.name = next;
}

// ------------------------------------------------------------------------------ stairs

export function addStair(state, role, stackId, input = {}) {
  requireDM(role);
  const stack = stackById(state, stackId);
  const floors = [...new Set(input.floors ?? [])];
  if (floors.length !== 2 || !floors.every((id) => stack.floors.some((f) => f.sceneId === id)))
    fail(
      "Una scala collega due piani dello stesso edificio.",
      "A stair joins two floors of the same building.",
    );
  const scene = sceneOf(state, floors[0]);
  const x = Number(input.x),
    y = Number(input.y),
    radius = Number(input.radius ?? scene?.gridSize ?? 50);
  if (
    !scene ||
    ![x, y].every(Number.isFinite) ||
    x < 0 ||
    y < 0 ||
    x > scene.width ||
    y > scene.height
  )
    fail("La scala deve stare dentro la mappa.", "The stair must be inside the map.");
  if (!Number.isFinite(radius) || radius < 10 || radius > 400)
    fail("Il raggio va da 10 a 400 pixel.", "The radius must be between 10 and 400 pixels.");
  if ((stack.stairs ?? []).length >= 20)
    fail("Al massimo 20 scale per edificio.", "At most 20 stairs per building.");
  const stair = {
    id: input.id ?? uid("stair"),
    name: cleanName(input.name) || L("Scala", "Stair").it,
    x: Math.round(x),
    y: Math.round(y),
    radius: Math.round(radius),
    floors,
  };
  stack.stairs = [...(stack.stairs ?? []), stair];
  return stair;
}
export function updateStair(state, role, stackId, stairId, patch = {}) {
  requireDM(role);
  const stack = stackById(state, stackId);
  const index = (stack.stairs ?? []).findIndex((row) => row.id === stairId);
  if (index < 0) fail("La scala non esiste più.", "The stair no longer exists.");
  const current = stack.stairs[index];
  stack.stairs.splice(index, 1);
  try {
    const next = addStair(state, role, stackId, { ...current, ...patch, id: current.id });
    // addStair appended it: keep the list order.
    stack.stairs.pop();
    stack.stairs.splice(index, 0, next);
    return next;
  } catch (error) {
    stack.stairs.splice(index, 0, current);
    throw error;
  }
}
export function removeStair(state, role, stackId, stairId) {
  requireDM(role);
  const stack = stackById(state, stackId);
  if (!(stack.stairs ?? []).some((row) => row.id === stairId))
    fail("La scala non esiste più.", "The stair no longer exists.");
  stack.stairs = stack.stairs.filter((row) => row.id !== stairId);
}

/** A free spot for an arriving token: where it stands, or the nearest free one on the stair. */
function landing(scene, stair, from) {
  const free = (p) =>
    p.x >= 20 &&
    p.y >= 20 &&
    p.x <= scene.width - 20 &&
    p.y <= scene.height - 20 &&
    !(scene.tokens ?? []).some((token) => dist(token, p) < 40);
  if (free(from)) return { x: Math.round(from.x), y: Math.round(from.y) };
  for (let ring = 1; ring <= 4; ring++)
    for (let i = 0; i < 8 * ring; i++) {
      const angle = (i * 2 * Math.PI) / (8 * ring);
      const r = (stair.radius * ring) / 4;
      const p = { x: stair.x + r * Math.cos(angle), y: stair.y + r * Math.sin(angle) };
      if (free(p)) return { x: Math.round(p.x), y: Math.round(p.y) };
    }
  fail(
    "Il pianerottolo è occupato: libera un po’ di spazio sull’altro piano.",
    "The landing is taken: make room on the other floor.",
  );
}

/**
 * A token on a stair goes to another floor it reaches: the DM for any creature, a player for
 * a creature they control. It keeps its position on the stair (the other floor has the same
 * footprint). With `follow` (DM only) the Table shows that floor. Refused during combat.
 */
export function climb(
  state,
  role,
  { actorId, fromSceneId, toSceneId, stairId, follow = false } = {},
) {
  noCombat(state);
  const onFloor = (scene) =>
    Boolean(scene) &&
    (scene.tokens ?? []).some((token) => token.actorId === actorId) &&
    Boolean(stackOf(state, scene.id));
  // The floor named by the caller, else the one shown at the Table, else the first floor
  // of a building where the creature stands.
  const from = fromSceneId
    ? [sceneOf(state, fromSceneId)].find(onFloor)
    : [sceneOf(state, state.activeSceneId)].concat(state.scenes).find(onFloor);
  const actor = state.actors?.[actorId];
  if (!from || !actor) fail("La pedina non è in un edificio.", "The token is not in a building.");
  if (role !== "dm" && !canControlActor(actor, role, state))
    fail(
      "Puoi far salire o scendere solo una creatura che controlli.",
      "You can only move a creature you control up or down.",
    );
  const on = tokensOnStairs(state, from.id).filter(
    (row) => row.actorId === actorId && (!stairId || row.stair.id === stairId),
  );
  const pick = on.find((row) => row.targets.some((target) => target.sceneId === toSceneId));
  if (!pick)
    fail(
      "La pedina deve stare sulla scala che porta a quel piano.",
      "The token must stand on the stair that leads to that floor.",
    );
  const target = sceneOf(state, toSceneId);
  const token = from.tokens.find((row) => row.actorId === actorId);
  if ((target.tokens ?? []).some((row) => row.actorId === actorId))
    fail(
      "Questa creatura ha già una pedina sull’altro piano.",
      "This creature already has a token on the other floor.",
    );
  const at = landing(target, pick.stair, token);
  from.tokens = from.tokens.filter((row) => row !== token);
  if (from.encounter?.participants)
    from.encounter.participants = from.encounter.participants.filter(
      (row) => row.actorId !== actorId,
    );
  const id = (target.tokens ?? []).some((row) => row.id === token.id) ? uid("token") : token.id;
  target.tokens = [...(target.tokens ?? []), { ...token, id, ...at }];
  if (follow) {
    requireDM(role);
    state.activeSceneId = target.id;
  }
  return {
    from: from.id,
    to: target.id,
    direction: pick.targets.find((row) => row.sceneId === toSceneId).direction,
  };
}

/** DM: shows another floor of the building at the Table (the party's view moves too). */
export function switchFloor(state, role, sceneId) {
  requireDM(role);
  noCombat(state);
  const found = stackOf(state, sceneId);
  if (!found)
    fail("Questa scena non è un piano di un edificio.", "This scene is not a building floor.");
  const current = stackOf(state, state.activeSceneId);
  if (current?.stack.id !== found.stack.id)
    fail(
      "Al Tavolo c’è un’altra scena: attiva prima l’edificio.",
      "Another scene is at the Table: activate the building first.",
    );
  state.activeSceneId = sceneId;
  return found.floor;
}
/** DM: the floor above (+1) or below (−1) the one shown (XCOM keys). */
export function stepFloor(state, role, delta) {
  const found = stackOf(state, state.activeSceneId);
  if (!found)
    fail("Al Tavolo non c’è un edificio a più piani.", "No multi-floor building is at the Table.");
  const next = found.floors[found.index + (delta > 0 ? 1 : -1)];
  if (!next)
    fail(
      delta > 0 ? "Questo è il piano più alto." : "Questo è il piano più basso.",
      delta > 0 ? "This is the top floor." : "This is the lowest floor.",
    );
  return switchFloor(state, role, next.sceneId);
}

// ------------------------------------------------------------------------------ seed

/** The Lantern tower's upper floor joined to the B35 ground floor by the spiral stair. */
export function seedTowerLevels(state, value, { image, source }) {
  const ground = state.scenes.find((scene) => scene.id === "lantern-tower");
  if (!ground) return;
  const id = "lantern-tower-top";
  if (!state.scenes.some((scene) => scene.id === id)) {
    const wall = (wallId, ax, ay, bx, by, extra = {}) => ({
      id: wallId,
      kind: "wall",
      a: { x: ax, y: ay },
      b: { x: bx, y: by },
      blocksMovement: true,
      blocksSight: true,
      blocksEffect: true,
      secret: false,
      source: source("Lantern tower upper floor wall"),
      ...extra,
    });
    state.scenes.push({
      id,
      name: "La torre della lanterna — cella della lanterna",
      description:
        "Piano superiore della torre: la grande lanterna è stata riaccesa. Si sale dalla scala a chiocciola del piano terra; la stanza della scala ha una porta verso la cella.",
      publicDescription: "In cima alla scala, la luce della grande lanterna.",
      gridSize: ground.gridSize ?? 50,
      metersPerCell: ground.metersPerCell ?? 1.5,
      width: ground.width,
      height: ground.height,
      gridVisible: true,
      gridSnap: false,
      background: image,
      imageName: "torre-cella-della-lanterna.webp",
      imageWidth: 1000,
      imageHeight: 650,
      revealed: false,
      revealedTo: [],
      template: "blank",
      tokens: [],
      walls: [
        wall("top-north", 100, 50, 900, 50),
        wall("top-east", 900, 50, 900, 600),
        wall("top-south", 900, 600, 100, 600),
        wall("top-west", 100, 600, 100, 50),
        wall("top-stair-north", 550, 300, 900, 300),
        wall("top-stair-west-1", 550, 300, 550, 380),
        {
          ...wall("top-stair-door", 550, 380, 550, 450),
          kind: "door",
          doorState: "closed",
          playerOperable: true,
          interactionRangeMeters: 1.5,
          source: source("Lantern tower upper floor door"),
        },
        wall("top-stair-west-2", 550, 450, 550, 600),
      ],
      terrain: [],
    });
  }
  value.stacks = value.stacks ?? {};
  if (!Object.values(value.stacks).some((stack) => stack.floors.some((f) => f.sceneId === id)))
    value.stacks.tower = {
      id: "tower",
      name: "La torre della lanterna",
      floors: [
        { sceneId: "lantern-tower", name: "Piano terra", elevation: 0 },
        { sceneId: id, name: "Cella della lanterna", elevation: 6 },
      ],
      stairs: [
        {
          id: "tower-spiral",
          name: "Scala a chiocciola",
          x: 770,
          y: 470,
          radius: 100,
          floors: ["lantern-tower", id],
        },
      ],
    };
}
