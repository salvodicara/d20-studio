import { getCompanionPlacement } from "./forms-companions.mjs";
import { canControlActor } from "./character-access.mjs";
import { previewTokenPlacement } from "./spatial.mjs";

export function previewCompanionMapPlacement(state, actorId, point, viewer) {
  const placement = getCompanionPlacement(state, actorId, viewer);
  const scene = state.scenes.find((s) => s.id === state.activeSceneId);
  const geometry = previewTokenPlacement(scene, point);
  const reasons = [...geometry.reasons];
  const add = (code, it, en) => reasons.push({ code, it, en });
  if (!placement.canPlace)
    add(
      "unavailable-companion",
      "Questa creatura non può essere collocata.",
      "This creature cannot be placed.",
    );
  if (placement.existingToken)
    add(
      "already-placed",
      "La pedina è già sulla scena: usa il movimento.",
      "The token is already on the scene: use movement.",
    );
  if (!scene || (viewer !== "dm" && !scene.revealed))
    add("unavailable-scene", "La scena non è disponibile.", "The scene is unavailable.");
  if (placement.commit.local)
    add(
      "private-companion",
      "Collega prima la creatura alla campagna per mostrarla sul Tavolo.",
      "Connect the creature to the campaign before showing it on the Table.",
    );
  return {
    ...geometry,
    available: reasons.length === 0,
    reasons,
    sceneId: scene?.id,
    commit: placement.commit,
  };
}

export function placeCompanionOnMap(
  state,
  actorId,
  point,
  viewer,
  { sceneId, tokenId, online = true } = {},
) {
  const preview = previewCompanionMapPlacement(state, actorId, point, viewer);
  if (!preview.available) throw Object.assign(new Error(preview.reasons[0].en), preview.reasons[0]);
  if (!online) throw new Error("A shared token cannot be placed while offline");
  if (
    sceneId !== state.activeSceneId ||
    !tokenId ||
    state.scenes.some((s) => s.tokens.some((t) => t.id === tokenId))
  )
    throw new Error("Scene or token changed: choose the point again");
  const scene = state.scenes.find((s) => s.id === sceneId);
  scene.tokens.push({ id: tokenId, actorId, x: point.x, y: point.y, visible: true });
  return { actorId, sceneId, tokenId };
}

/**
 * PG-78 (dnd5e Summon: the token appears at once): places a newly created companion on the
 * map point chosen while creating it. Returns the placement, null when no point was chosen
 * or the creature is already on the scene, or {error} with the reason it could not appear.
 */
export function placeAtChosenPoint(state, actorId, appearance, viewer, { online = true } = {}) {
  if (!actorId || appearance?.kind !== "map" || !appearance.point) return null;
  if (appearance.sceneId !== state.activeSceneId) return null;
  const scene = state.scenes?.find((row) => row.id === appearance.sceneId);
  if (!scene || scene.tokens?.some((token) => token.actorId === actorId)) return null;
  try {
    return placeCompanionOnMap(state, actorId, appearance.point, viewer, {
      sceneId: appearance.sceneId,
      tokenId: "token-" + String(actorId).replace(/[^a-z0-9-]/gi, "").slice(0, 60),
      online,
    });
  } catch (error) {
    return { error: { it: error.it ?? error.message, en: error.en ?? error.message } };
  }
}

let selection = null;
let unbind = null;
export function resetMapPlacement() {
  unbind?.();
  unbind = null;
  selection = null;
}
// W2b1 integration (additive): whether a companion or familiar placement owns map clicks,
// so area interceptors of the core Move (B40) leave the click to it.
export const mapPlacementActive = () => selection !== null;
function startSelection(ctx, options) {
  resetMapPlacement();
  selection = { ...options, role: ctx.role, sceneId: ctx.state.activeSceneId, cursor: null };
  ctx.closeDialog();
  ctx.navigate("table");
}
export function confirmCompanionAppearance(ctx, options, done) {
  startSelection(ctx, { ...options, kind: "appearance", done });
}
export function beginCompanionPlacement(ctx, actorId) {
  const p = getCompanionPlacement(ctx.state, actorId, ctx.role);
  if (p.existingToken) {
    ctx.closeDialog();
    ctx.navigate("table", { id: actorId });
    return;
  }
  if (!p.canPlace) throw new Error("This companion cannot be placed");
  startSelection(ctx, { kind: "placement", actorId });
}

export function bindMapPlacement(ctx) {
  unbind?.();
  unbind = null;
  if (!selection) return;
  if (
    ctx.view.page !== "table" ||
    ctx.role !== selection.role ||
    ctx.state.activeSceneId !== selection.sceneId
  ) {
    resetMapPlacement();
    return;
  }
  const svg = document.querySelector("#battle-map"),
    container = svg?.closest(".map-container");
  if (!svg || !container) return;
  const task = selection;
  const scene = ctx.state.scenes.find((s) => s.id === task.sceneId);
  const origin = scene.tokens.find((t) => t.actorId === task.parentActorId);
  const title =
    task.kind === "appearance"
      ? ctx.t("Scegli dove appare · ", "Choose where it appears · ") + task.rangeMeters + " m"
      : ctx.t(
          "Colloca la pedina · nessun costo aggiuntivo",
          "Place the token · no additional cost",
        );
  const panel = document.createElement("div");
  panel.className = "map-placement-controls";
  panel.innerHTML = `<strong>${ctx.esc(title)}</strong><span>${ctx.t("Clicca sulla mappa. Frecce e Invio da tastiera. Esc annulla.", "Click the map. Arrow keys and Enter work too. Escape cancels.")}</span><button class="button" data-placement-cancel>${ctx.t("Annulla", "Cancel")}</button><p role="status" data-placement-status></p>`;
  container.prepend(panel);
  const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  layer.setAttribute("pointer-events", "none");
  layer.setAttribute("data-placement-preview", "");
  svg.append(layer);
  const status = panel.querySelector("[data-placement-status]");
  const readPreview = (point) => {
    if (ctx.role !== task.role || ctx.state.activeSceneId !== task.sceneId)
      throw new Error(ctx.t("Il contesto è cambiato.", "The context changed."));
    if (task.kind === "placement")
      return previewCompanionMapPlacement(ctx.state, task.actorId, point, ctx.role);
    const currentParent = ctx.state.actors[task.parentActorId];
    const currentScene = ctx.state.scenes.find((s) => s.id === task.sceneId);
    const currentOrigin = currentScene.tokens.find((t) => t.actorId === task.parentActorId);
    if (
      !canControlActor(currentParent, ctx.role, ctx.state) ||
      !currentOrigin ||
      (ctx.role !== "dm" && !currentScene.revealed)
    )
      throw new Error(
        ctx.t(
          "La creatura o la scena non sono disponibili.",
          "The creature or scene is unavailable.",
        ),
      );
    return previewTokenPlacement(currentScene, point, {
      origin: currentOrigin,
      maxDistanceMeters: task.rangeMeters,
      excludeActorId: task.companionActorId,
    });
  };
  const draw = (point) => {
    task.cursor = { x: point.x, y: point.y };
    try {
      const p = readPreview(point);
      const color = p.available ? "#8fb48a" : "#e88f84";
      layer.innerHTML = `${origin && task.kind === "appearance" ? `<circle cx="${origin.x}" cy="${origin.y}" r="${(task.rangeMeters * scene.gridSize) / scene.metersPerCell}" fill="none" stroke="#d6bc79" stroke-dasharray="8 6"/>` : ""}<circle cx="${point.x}" cy="${point.y}" r="23" fill="${color}" fill-opacity=".25" stroke="${color}" stroke-width="3"/>`;
      status.textContent = p.available
        ? ctx.t(
            "Punto disponibile. Clicca o premi Invio.",
            "Available point. Click or press Enter.",
          )
        : p.reasons.map((r) => ctx.label(r)).join(" ");
      return p;
    } catch (error) {
      status.textContent = ctx.label(error.it ? error : error.message);
      return null;
    }
  };
  const finish = (point) => {
    if (!draw(point)?.available) return;
    if (task.kind === "appearance") {
      const appearance = { kind: "map", sceneId: task.sceneId, point: { x: point.x, y: point.y } };
      resetMapPlacement();
      ctx.render();
      task.done(appearance);
    } else {
      try {
        const tokenId = crypto.randomUUID();
        ctx.commit(ctx.t("Colloca compagno", "Place companion"), (draft) =>
          placeCompanionOnMap(draft, task.actorId, point, ctx.role, {
            sceneId: task.sceneId,
            tokenId,
            online: !ctx.offline,
          }),
        );
        resetMapPlacement();
        ctx.navigate("table", { id: task.actorId });
      } catch (error) {
        status.textContent = ctx.label(error.it ? error : error.message);
      }
    }
  };
  const cancel = () => {
    resetMapPlacement();
    ctx.render();
    task.done?.(null);
  };
  panel.querySelector("[data-placement-cancel]").onclick = cancel;
  const toPoint = (e) => {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };
  const capture = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const move = (e) => {
    capture(e);
    draw(toPoint(e));
  };
  const click = (e) => {
    capture(e);
    finish(toPoint(e));
  };
  const key = (e) => {
    if (e.key === "Escape") {
      capture(e);
      cancel();
      return;
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "].includes(e.key)) return;
    capture(e);
    if (e.key === "Enter" || e.key === " ") {
      if (task.cursor) finish(task.cursor);
      return;
    }
    const p = { ...(task.cursor ?? origin ?? { x: scene.width / 2, y: scene.height / 2 }) };
    if (e.key === "ArrowUp") p.y -= scene.gridSize;
    if (e.key === "ArrowDown") p.y += scene.gridSize;
    if (e.key === "ArrowLeft") p.x -= scene.gridSize;
    if (e.key === "ArrowRight") p.x += scene.gridSize;
    draw(p);
  };
  const escape = (e) => {
    if (e.key === "Escape" && !document.querySelector("#dialog")?.open) key(e);
  };
  const handlers = [
    ["pointerdown", capture],
    ["pointermove", move],
    ["pointerup", capture],
    ["click", click],
    ["keydown", key],
  ];
  for (const [name, fn] of handlers) svg.addEventListener(name, fn, true);
  document.addEventListener("keydown", escape, true);
  unbind = () => {
    for (const [name, fn] of handlers) svg.removeEventListener(name, fn, true);
    document.removeEventListener("keydown", escape, true);
    panel.remove();
    layer.remove();
  };
  if (task.cursor) draw(task.cursor);
  svg.focus();
}
