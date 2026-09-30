import { canControlActor, isActorAvailable } from "./character-access.mjs";
import {
  isSegmentBlocked,
  validateSceneGeometry,
  routePath,
  tracePath,
  segmentMeters,
} from "./spatial.mjs";
import { formatNumber } from "./ui.mjs";
import {
  hasBlockingConsequences,
  isIncapacitated,
  refreshConsequences,
  beginMovement,
  listActions,
} from "./combat.mjs";
import { hasCondition } from "./conditions.mjs";
const text = (it, en) => ({ it, en });
const REACH_TOLERANCE_METERS = 0.01;

// C3 (R7 → R3, CA-57): one authority predicate for the DM's session powers during a hand-off
// (Owlbear's GM hand-off): session-view's runsSession, loaded as an optional neighbour by
// dynamic import (a static import would tie the Table to that area). Until it loads, or
// without it, only the DM runs the session (the contract's default). Identity checks
// (ownership, private data) never go through this predicate.
let runsSessionOf = null;
export const sessionAuthorityReady = import("./session-view.mjs")
  .then((module) => {
    runsSessionOf = typeof module.runsSession === "function" ? module.runsSession : null;
  })
  .catch(() => {});
export const runsSession = (state, role) =>
  role === "dm" || (Boolean(role) && Boolean(runsSessionOf?.(state, role)));
/** A contribution that is the DM's (`roles: ["dm"]`) follows the session's authority. */
export function sessionGated(def) {
  if (!(Array.isArray(def?.roles) && def.roles.length === 1 && def.roles[0] === "dm")) return def;
  const { roles: _roles, when, ...rest } = def;
  return {
    ...rest,
    when: (ctx, ...args) => runsSession(ctx.state, ctx.role) && (when ? when(ctx, ...args) : true),
  };
}
const sceneFor = (state) => state.scenes.find((s) => s.id === state.activeSceneId);
const wallFor = (state, id) =>
  sceneFor(state)?.walls?.find((w) => w.id === id && w.kind === "door");
const source = {
  kind: "srd",
  edition: "2024",
  revision: "5.2.1",
  sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
  pages: [13, 14],
  url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=13",
};
export function previewDoorInteraction(state, doorId, actorId, role) {
  const wall = wallFor(state, doorId),
    actor = state.actors[actorId],
    scene = sceneFor(state),
    reasons = [];
  const visible = !!wall && (runsSession(state, role) || !wall.secret);
  if (!visible)
    return {
      available: false,
      visible: false,
      reasons: [text("Porta non disponibile.", "Door unavailable.")],
    };
  if (
    !isActorAvailable(actor) ||
    !canControlActor(actor, role, state) ||
    !scene.tokens.some((t) => t.actorId === actorId)
  )
    reasons.push(
      text(
        "Seleziona una creatura sotto il tuo controllo nella scena.",
        "Select a creature you control in this scene.",
      ),
    );
  if (actor && (actor.dead || isIncapacitated(actor)))
    reasons.push(
      text(
        "La creatura non può interagire nello stato attuale.",
        "This creature cannot interact in its current state.",
      ),
    );
  if (!runsSession(state, role) && !wall.playerOperable)
    reasons.push(text("Questa porta è gestita dal DM.", "This door is managed by the DM."));
  if (wall.doorState === "locked")
    reasons.push(
      text(
        "La porta è chiusa a chiave. Serve una soluzione del personaggio o un intervento del DM.",
        "This door is locked. It needs a character solution or DM intervention.",
      ),
    );
  if (!["open", "closed", "locked"].includes(wall.doorState))
    reasons.push(
      text(
        "Il DM deve correggere lo stato della porta.",
        "The DM needs to correct the door state.",
      ),
    );
  if (state.combat.active && state.combat.order[state.combat.turn] !== actorId)
    reasons.push(
      text("Puoi interagire durante il tuo turno.", "You can interact during your turn."),
    );
  if (hasBlockingConsequences(state, actorId))
    reasons.push(
      text("Risolvi prima le conseguenze ancora in attesa.", "Resolve pending consequences first."),
    );
  const cost = state.combat.active
    ? actor?.objectInteractionUsed
      ? "action"
      : "interaction"
    : "none";
  if (cost === "action" && !actor?.action)
    reasons.push(
      text(
        "L’interazione gratuita è già usata e l’azione non è disponibile.",
        "The free interaction is already used and your action is unavailable.",
      ),
    );
  const token = scene.tokens.find((t) => t.actorId === actorId);
  if (validateSceneGeometry(scene).length)
    reasons.push(
      text("La scena richiede una correzione del DM.", "This scene needs correction by the DM."),
    );
  const dx = wall.b.x - wall.a.x,
    dy = wall.b.y - wall.a.y;
  const fraction = token
    ? Math.max(
        0,
        Math.min(1, ((token.x - wall.a.x) * dx + (token.y - wall.a.y) * dy) / (dx * dx + dy * dy)),
      )
    : 0;
  const nearest = { x: wall.a.x + fraction * dx, y: wall.a.y + fraction * dy };
  if (
    token &&
    isSegmentBlocked(
      { ...scene, walls: scene.walls.filter((w) => w.id !== doorId) },
      token,
      nearest,
      "blocksMovement",
    )
  )
    reasons.push(
      text(
        "Non puoi raggiungere questa porta dalla posizione attuale.",
        "You cannot reach this door from your current position.",
      ),
    );
  const distance = token
    ? (Math.hypot(token.x - wall.a.x - fraction * dx, token.y - wall.a.y - fraction * dy) /
        scene.gridSize) *
      scene.metersPerCell
    : null;
  // 1 cm of tolerance (as regions-domain's door reach): a token placed by pointer carries float
  // noise from the screen-to-scene conversion, and the distance is shown to 0,1 m.
  if (
    Number.isFinite(wall.interactionRangeMeters) &&
    distance > wall.interactionRangeMeters + REACH_TOLERANCE_METERS
  )
    reasons.push(
      text(
        "Avvicinati alla porta entro la distanza configurata.",
        "Move within this door’s configured interaction distance.",
      ),
    );
  return {
    available: reasons.length === 0,
    visible: true,
    reasons,
    cost,
    nextState: wall.doorState === "open" ? "closed" : "open",
    currentState: wall.doorState,
    range: wall.interactionRangeMeters,
    distance,
    source,
  };
}
export function interactWithDoor(state, doorId, actorId, role, { expectedState } = {}) {
  const p = previewDoorInteraction(state, doorId, actorId, role),
    wall = wallFor(state, doorId);
  if (!p.available) {
    const message = p.reasons[0];
    throw Object.assign(Error(message.en), message);
  }
  if (expectedState !== wall.doorState)
    throw Object.assign(
      Error("Door state changed; review it before interacting."),
      text(
        "Lo stato della porta è cambiato: rivaluta prima di interagire.",
        "Door state changed; review it before interacting.",
      ),
    );
  if (p.cost === "interaction") state.actors[actorId].objectInteractionUsed = true;
  if (p.cost === "action") state.actors[actorId].action = false;
  wall.doorState = p.nextState;
  refreshConsequences(state);
  return { doorId, actorId, from: p.currentState, to: p.nextState, cost: p.cost, source };
}
export function correctDoor(state, doorId, patch, role) {
  if (!runsSession(state, role)) throw Error("Only the DM can correct a door.");
  const wall = wallFor(state, doorId);
  if (!wall) throw Error("Door unavailable.");
  if (patch.doorState !== undefined && !["closed", "open", "locked"].includes(patch.doorState))
    throw Error("Invalid door state");
  if (patch.secret !== undefined && typeof patch.secret !== "boolean")
    throw Error("Invalid door visibility");
  if (patch.doorState !== undefined) wall.doorState = patch.doorState;
  if (patch.secret !== undefined) wall.secret = patch.secret;
  refreshConsequences(state);
}
const doorName = (ctx, wall) =>
  wall.secret ? ctx.t("Porta segreta", "Secret door") : ctx.t("Porta", "Door");
const stateName = (ctx, state) =>
  state === "open"
    ? ctx.t("Aperta", "Open")
    : state === "locked"
      ? ctx.t("Chiusa a chiave", "Locked")
      : ctx.t("Chiusa", "Closed");
export function renderDoorControls(ctx) {
  return (sceneFor(ctx.state)?.walls || [])
    .filter(
      (w) =>
        w.kind === "door" &&
        (runsSession(ctx.state, ctx.role) || !w.secret) &&
        [w.a?.x, w.a?.y, w.b?.x, w.b?.y].every(Number.isFinite),
    )
    .map(
      (w) =>
        `<g transform="translate(${(w.a.x + w.b.x) / 2} ${(w.a.y + w.b.y) / 2})" data-door="${ctx.esc(w.id)}" role="button" tabindex="0" aria-label="${ctx.esc(doorName(ctx, w) + " · " + stateName(ctx, w.doorState))}"><g class="door-display"><rect x="-21" y="-21" width="42" height="42" rx="7"/><text text-anchor="middle" y="7">${w.doorState === "open" ? "↗" : w.doorState === "locked" ? "×" : "+"}</text></g></g>`,
    )
    .join("");
}
// P6 TV-04: why a door is out of reach (walking there solves these; the others stay).
const REACH_REASONS = new Set([
  "Avvicinati alla porta entro la distanza configurata.",
  "Non puoi raggiungere questa porta dalla posizione attuale.",
]);
export function openDoor(ctx, doorId, actorId) {
  const wall = wallFor(ctx.state, doorId),
    p = previewDoorInteraction(ctx.state, doorId, actorId, ctx.role);
  if (!p.visible) return;
  const { t, esc } = ctx,
    actor = ctx.state.actors[actorId];
  // BG3 and Arms Reach: a door out of reach is walked to first, then opened, in one choice.
  const far = p.reasons.length > 0 && p.reasons.every((r) => REACH_REASONS.has(r.it));
  const approach = far ? doorApproach(ctx.state, doorId, actorId, ctx.role) : null;
  const budget = ctx.state.combat.active ? Math.max(0, Number(actor?.movement) || 0) : Infinity;
  const walkable = Boolean(approach) && approach.cost <= budget + 1e-6;
  const cost =
    p.cost === "action"
      ? t(
          "Costo: azione Utilizzare (l’interazione gratuita di questo turno è già usata).",
          "Cost: Utilize action (this turn’s free object interaction is already used).",
        )
      : p.cost === "interaction"
        ? t(
            "Costo: la prima interazione con un oggetto di questo turno (l’azione resta).",
            "Cost: this turn’s first object interaction (your action stays).",
          )
        : t("Nessun costo: fuori dal combattimento.", "No cost: outside combat.");
  const walk = approach
    ? `<p>${t("Prima", "First")} ${actor ? esc(actor.name) : ""} ${t("cammina fino alla porta", "walks to the door")}: ${formatNumber(ctx.lang, approach.cost)} m${ctx.state.combat.active ? " " + t("di movimento", "of movement") : ""}.</p>`
    : "";
  const reasons = (far && walkable ? [] : p.reasons)
    .map((r) => `<p class="error">${esc(ctx.label(r))}</p>`)
    .join("");
  const noWay =
    far && !approach
      ? `<p class="error">${t("Non c’è un passaggio a piedi fino alla porta.", "There is no way on foot to the door.")}</p>`
      : far && approach && !walkable
        ? `<p class="error">${t("Il movimento rimasto non basta per arrivare alla porta.", "Your movement left is not enough to reach the door.")}</p>`
        : "";
  const available = p.available || (far && walkable);
  const verb =
    p.nextState === "open" ? t("Apri con ", "Open with ") : t("Chiudi con ", "Close with ");
  const goVerb =
    p.nextState === "open"
      ? t("Vai e apri con ", "Walk and open with ")
      : t("Vai e chiudi con ", "Walk and close with ");
  ctx.dialog(
    doorName(ctx, wall),
    `<p><strong>${stateName(ctx, wall.doorState)}</strong></p>${walk}<p>${actor ? esc(actor.name) + " · " : ""}${cost}</p>${Number.isFinite(p.range) && Number.isFinite(p.distance) ? `<p class="muted">${t("Distanza", "Distance")}: ${formatNumber(ctx.lang, p.distance)} m · ${t("Portata", "Reach")}: ${formatNumber(ctx.lang, p.range)} m</p>` : ""}${reasons}${noWay}${runsSession(ctx.state, ctx.role) ? `<details class="door-dm-controls"><summary>${t("Intervento del DM", "DM intervention")}</summary><p>${t("Cambia la porta senza spendere le risorse di una creatura.", "Changes the door without spending a creature’s resources.")}</p><div class="toolbar">${["open", "closed", "locked"].map((value) => `<button type="button" class="button" data-correct-door="${value}">${value === "open" ? t("Imposta aperta", "Set open") : value === "closed" ? t("Imposta chiusa", "Set closed") : t("Chiudi a chiave", "Lock")}</button>`).join("")}${wall.secret ? `<button type="button" class="button" data-reveal-door>${t("Rivela porta", "Reveal door")}</button>` : ""}</div></details>` : ""}`,
    {
      submitLabel: available ? (p.available ? verb : goVerb) + actor.name : undefined,
      onSubmit: () => {
        if (p.available)
          return ctx.commit(t("Interazione con porta", "Door interaction"), (s) =>
            interactWithDoor(s, doorId, actorId, ctx.role, { expectedState: p.currentState }),
          );
        // Walk there and use the door in one change: Undo takes back both.
        ctx.commit(t("Cammina fino alla porta e la usa", "Walks to the door and uses it"), (s) => {
          beginMovement(
            s,
            {
              id: crypto.randomUUID(),
              actorId,
              point: approach.point,
              waypoints: approach.waypoints,
            },
            ctx.role,
          );
          interactWithDoor(s, doorId, actorId, ctx.role, { expectedState: p.currentState });
        });
      },
      cancelLabel: t("Torna alla mappa", "Back to map"),
    },
  );
  document.querySelectorAll("[data-correct-door]").forEach(
    (b) =>
      (b.onclick = () => {
        try {
          ctx.commit(t("Porta corretta dal DM", "Door corrected by DM"), (s) =>
            correctDoor(s, doorId, { doorState: b.dataset.correctDoor }, ctx.role),
          );
          openDoor(ctx, doorId, actorId);
        } catch (e) {
          ctx.toast(ctx.label(e.it ? e : e.message), true);
        }
      }),
  );
  document.querySelector("[data-reveal-door]")?.addEventListener("click", () => {
    try {
      ctx.commit(t("Porta rivelata dal DM", "Door revealed by DM"), (s) =>
        correctDoor(s, doorId, { secret: false }, ctx.role),
      );
      openDoor(ctx, doorId, actorId);
    } catch (e) {
      ctx.toast(e.message, true);
    }
  });
}
// ---------------------------------------------------------------- P6 movement and camera

/**
 * Where a move to `point` ends before the rules trim it: kept 20 px inside the scene and on
 * the grid centre when the scene snaps (state.previewMovement does the same), so a route is
 * planned to the same point the move is checked against.
 */
export function movementTarget(scene, point) {
  let p = { x: Number(point?.x), y: Number(point?.y) };
  if (scene.gridSnap === true) {
    const snap = (value, offset) =>
      Math.round((value - offset - scene.gridSize / 2) / scene.gridSize) * scene.gridSize +
      offset +
      scene.gridSize / 2;
    p = { x: snap(p.x, scene.gridOffsetX || 0), y: snap(p.y, scene.gridOffsetY || 0) };
  }
  return {
    x: Math.max(20, Math.min(scene.width - 20, p.x)),
    y: Math.max(20, Math.min(scene.height - 20, p.y)),
  };
}
/**
 * P6 TV-01 (BG3, Foundry and Owlbear walk around walls): the waypoints of a move of `actorId`
 * to `point`, through the planned `waypoints`, routed around walls and closed doors when a
 * straight leg is blocked. `reachable` is false when no way exists on foot: the waypoints are
 * then the planned ones and the move preview shows it blocked, with its reason.
 */
export function plannedWaypoints(state, actorId, point, { role, waypoints = [] } = {}) {
  const scene = sceneFor(state);
  const token = scene?.tokens.find((t) => t.actorId === actorId);
  if (!scene || !token || !Number.isFinite(point?.x) || !Number.isFinite(point?.y))
    return { waypoints, routed: false, reachable: false };
  const route = routePath(scene, token, movementTarget(scene, point), { role, waypoints });
  if (!route) return { waypoints, routed: false, reachable: false };
  return { waypoints: route.points.slice(0, -1), routed: route.routed, reachable: true };
}
/**
 * P6 TV-05: the view after zooming by `factor` around the scene point `anchor`, which stays
 * under the cursor (D&D Beyond Maps, Owlbear, Roll20 zoom at the pointer). The SVG keeps the
 * scene's aspect ratio, so keeping the anchor's offset in the view keeps it on screen.
 */
export function zoomAt(view, scene, factor, anchor, { min = 0.6, max = 3 } = {}) {
  const zoom = Number(view?.zoom) || 1,
    pan = { x: Number(view?.pan?.x) || 0, y: Number(view?.pan?.y) || 0 };
  const next = Math.min(max, Math.max(min, zoom * factor));
  if (!anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y))
    return { zoom: next, pan: { ...pan } };
  const k = zoom / next;
  return {
    zoom: next,
    pan: { x: anchor.x - (anchor.x - pan.x) * k, y: anchor.y - (anchor.y - pan.y) * k },
  };
}
/**
 * P6 TV-04 (BG3 and Arms Reach: click a door to walk there and open it): where the creature
 * would stand to reach the door and the waypoints of the walk there, or null when the door is
 * already in reach or no free spot in reach can be walked to. The walk never passes through
 * the door itself; its cost follows the scene's rule.
 */
export function doorApproach(state, doorId, actorId, role) {
  const scene = sceneFor(state),
    wall = wallFor(state, doorId);
  const token = scene?.tokens.find((t) => t.actorId === actorId);
  if (!scene || !wall || !token || validateSceneGeometry(scene).length) return null;
  const ppm = scene.gridSize / scene.metersPerCell;
  const reach = Math.max(1, (wall.interactionRangeMeters ?? 1.5) * ppm);
  const open = { ...scene, walls: scene.walls.filter((w) => w.id !== doorId) };
  const dx = wall.b.x - wall.a.x,
    dy = wall.b.y - wall.a.y,
    length = Math.hypot(dx, dy);
  const normal = { x: -dy / length, y: dx / length };
  const standOff = Math.min(reach * 0.8, scene.gridSize * 0.8);
  const candidates = [];
  for (const t of [0.5, 0.25, 0.75])
    for (const side of [1, -1]) {
      const on = { x: wall.a.x + dx * t, y: wall.a.y + dy * t };
      candidates.push({
        x: on.x + normal.x * standOff * side,
        y: on.y + normal.y * standOff * side,
        on,
      });
    }
  let best = null;
  for (const c of candidates) {
    if (c.x < 20 || c.y < 20 || c.x > scene.width - 20 || c.y > scene.height - 20) continue;
    if (isSegmentBlocked(open, c, c.on, "blocksMovement")) continue;
    const route = routePath(scene, token, { x: c.x, y: c.y }, { role });
    if (!route) continue;
    const trace = tracePath(scene, token, route.points, { role });
    if (trace.blocked) continue;
    if (!best || trace.totalCost < best.cost)
      best = {
        point: { x: c.x, y: c.y },
        waypoints: route.points.slice(0, -1),
        cost: trace.totalCost,
        distance: trace.distance,
      };
  }
  if (!best) return null;
  best.meters = segmentMeters(scene, token, best.point);
  return best;
}

// ---------------------------------------------------------------- P6 TV-77 path warnings

// The sample's sides as the combat engine reads them (combat.mjs sampleTeam/profileFor).
function teamOf(actor) {
  if (!actor) return null;
  if (actor.combatProfile?.team) return actor.combatProfile.team;
  if (["livia", "doran"].includes(actor.id)) return "party";
  if (["goblin-1", "goblin-2"].includes(actor.id)) return "watch";
  return actor.kind === "character" && !actor.companion ? "party" : null;
}
const opposed = (a, b) => (a === "party" && b === "watch") || (a === "watch" && b === "party");
function exitFraction(start, end, centre, radius) {
  const dx = end.x - start.x,
    dy = end.y - start.y;
  const x = start.x - centre.x,
    y = start.y - centre.y;
  const a = dx * dx + dy * dy;
  if (a < 1e-10) return null;
  const b = 2 * (x * dx + y * dy),
    c = x * x + y * y - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc <= 1e-10) return null;
  const exit = (-b + Math.sqrt(disc)) / (2 * a);
  // As the combat engine reads it (combat.mjs crossingFraction): the piece crosses the reach's
  // edge on its way out, a start on the edge included.
  if (exit < -1e-8 || exit >= 1 - 1e-8) return null;
  return Math.max(0, exit);
}
/**
 * P6 TV-77 (BG3 marks where a path provokes): the points of a move in combat where it leaves
 * the melee reach of an enemy that could still take its Opportunity Attack (reaction left,
 * not incapacitated, a melee attack; no Disengage on the mover). `canSee(actorId)` limits the
 * warning to creatures the viewer sees. A preview only: the engine decides when moving.
 */
export function opportunityWarnings(state, moverId, points, canSee = () => true) {
  const scene = sceneFor(state),
    mover = state.actors[moverId];
  if (!state.combat?.active || !scene || !mover || !Array.isArray(points) || points.length < 2)
    return [];
  if ((mover.combatEffects ?? []).some((effect) => effect.type === "disengage")) return [];
  const out = [];
  for (const token of scene.tokens) {
    const enemy = state.actors[token.actorId];
    if (!enemy || enemy.id === moverId || !canSee(enemy.id)) continue;
    if (!opposed(teamOf(enemy), teamOf(mover))) continue;
    if (!enemy.reaction || enemy.dead || isIncapacitated(enemy) || hasCondition(enemy, "blinded"))
      continue;
    let reach = 0;
    try {
      reach = Math.max(
        0,
        ...listActions(state, enemy.id)
          .filter((action) => action.attackType === "melee")
          .map((action) => Number(action.rangeMeters) || 0),
      );
    } catch {
      reach = 0;
    }
    if (!(reach > 0)) continue;
    const radius = (reach / scene.metersPerCell) * scene.gridSize;
    for (let i = 1; i < points.length; i++) {
      const f = exitFraction(points[i - 1], points[i], token, radius);
      if (f === null) continue;
      out.push({
        actorId: enemy.id,
        name: enemy.name,
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * f,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * f,
      });
      break;
    }
  }
  return out;
}
