// B35 — Fog, lights and vision at the Table (entry module of the area).
//
// Left toolbar, "fog" group (B61): Fog (DM), Lights (DM), Barriers (DM); "dm" group:
// Teleport (DM). Right sidebar tab "Vision" for both roles. Map layers: lighting under the
// tokens, fog and vision above them, controlled tokens and the tools' HUD on top.
// Patterns copied (census IDs): D&D Beyond Maps fog with creature-size brushes and polygon
// (DDB-121); Owlbear fog tool modes and Fog Preview (VTL-066/067); Smoke & Spectre per-player
// vision with persistence and reset (VTL-142) and obstruction types (VTL-071); Foundry
// lights, darkness sources, day/night transitions and wall types (FVT-075/077/159); Roll20
// lighting panel, token vision, Explorer mode, "update on drop", controlled tokens above the
// darkness (R20-093/094/095/153); Fantasy Grounds vision from the sheet's senses (R20-122);
// AboveVTT's DM vision check with opaque fog (VTL-144). Rules: SRD 5.2.1 (see the domain).
import * as D from "./fog-vision-domain.mjs";
import { runsSession, sessionGated } from "./table-spatial.mjs";
import { towerScene } from "./fog-vision-seed.mjs";
import { renderSceneBase } from "./preparation.mjs";
import { renderSpatialOverlay } from "./spatial-editor.mjs";
import {
  LIGHTS_TOOL,
  lightsTool,
  lighting,
  resetLighting,
  lightMarks,
  bindLightMarks,
  lightsBar,
  bindLightsBar,
  diagnosticsSection,
  bindDiagnostics,
  toggleLightById,
  lightLabel,
  btn,
  group,
  keepMapFocus,
  capture,
  layoutHud,
  stopMapEvents,
  run,
  errorText,
} from "./lighting-editor.mjs";

const ID = D.ID;
export const FOG_TOOL = "fog-vision";
export const BARRIER_TOOL = "fog-vision-barriers";
export const TELEPORT_TOOL = "fog-vision-teleport";
const L = (it, en) => ({ it, en });
const f1 = (n) => Math.round(n * 10) / 10;
const SETTINGS = "fog-vision";
const VIEW_SETTINGS = "fog-vision-view";
let registryRef = null;

// ------------------------------------------------------------------------------ view state

const ui = {
  preview: false,
  viewAs: null,
  fog: { op: "cover", shape: "brush", brush: "circle", size: "medium", target: "scene" },
  gesture: null,
  polygon: [],
  cursor: null,
  wall: null,
  teleport: null,
  liveEl: null,
  table: null,
  focusKey: null,
  ambient: {},
  recording: false,
};
export const fogVisionView = () => ui;
export function resetFogVisionView() {
  ui.preview = false;
  ui.viewAs = null;
  ui.fog = { op: "cover", shape: "brush", brush: "circle", size: "medium", target: "scene" };
  ui.gesture = null;
  ui.polygon = [];
  ui.cursor = null;
  ui.rectStart = null;
  ui.wall = null;
  ui.teleport = null;
  ui.focusKey = null;
  resetLighting();
}
/** Escape: drops the gesture in progress (polygon, cursor, first corner, pick, nudge). */
export function cancelGestures() {
  const had = Boolean(
    ui.polygon.length || ui.cursor || ui.gesture || ui.teleport || ui.rectStart || lighting.nudge,
  );
  ui.polygon = [];
  ui.cursor = null;
  ui.gesture = null;
  ui.rectStart = null;
  ui.teleport = null;
  lighting.nudge = null;
  return had;
}
const setting = (ctx, key) => {
  try {
    return registryRef?.getSetting(ctx, key);
  } catch {
    return undefined;
  }
};
const onTop = (ctx) => setting(ctx, VIEW_SETTINGS + ".controlled-on-top") !== false;
const name = (ctx, id) => ctx.state.actors?.[id]?.name ?? "?";
const phaseName = (ctx, id) => ctx.label(D.PHASES.find(([p]) => p === id)?.[2] ?? D.PHASES[0][2]);
const levelName = (ctx, level) => ctx.label(D.LEVEL_NAMES[level] ?? D.LEVEL_NAMES.dark);

// ------------------------------------------------------------------------------ model

// One computation per state, identity and view flags: the three layers and the panel share it.
const cache = new WeakMap();
export function model(ctx, scene) {
  if (!scene || !D.sliceOf(ctx.state)) return null;
  const sharedVision = setting(ctx, SETTINGS + ".shared-vision") === true;
  const sharedMemory = setting(ctx, SETTINGS + ".shared-memory") === true;
  const key = [scene.id, ctx.role, ui.preview, ui.viewAs, sharedVision, sharedMemory].join("|");
  let bucket = cache.get(ctx.state);
  if (!bucket) cache.set(ctx.state, (bucket = new Map()));
  if (bucket.has(key)) return bucket.get(key);
  const view = D.viewFor(ctx.state, scene.id, {
    role: ctx.role,
    controls: (id) => Boolean(ctx.state.actors?.[id]) && ctx.canControl(ctx.state.actors[id]),
    viewAs: ui.viewAs,
    preview: ui.preview,
    sharedVision,
    sharedMemory,
  });
  const cfg = view.cfg;
  const lit = D.buildLighting(ctx.state, scene, cfg);
  const viewers = view.viewers.map((id) => D.buildViewer(ctx.state, scene, id)).filter(Boolean);
  const opaque = view.mode !== "dm";
  const seesPoint = (p) =>
    !D.fogHiddenAt(scene, cfg.fog, p) &&
    (!view.vision || viewers.some((v) => D.canSee(v, lit, p).visible));
  const rim = (t) => [
    { x: t.x, y: t.y },
    { x: t.x + 18, y: t.y },
    { x: t.x - 18, y: t.y },
    { x: t.x, y: t.y + 18 },
    { x: t.x, y: t.y - 18 },
  ];
  const hiddenTokens = [],
    clones = [];
  if (opaque)
    for (const token of scene.tokens ?? []) {
      const visible = rim(token).some(seesPoint);
      if (view.controlled.includes(token.actorId)) {
        if (!seesPoint({ x: token.x, y: token.y })) clones.push(token.actorId);
      } else if (!visible) hiddenTokens.push(token.actorId);
    }
  const hiddenDoors = [];
  if (opaque)
    for (const wall of scene.walls ?? []) {
      if (wall.kind !== "door") continue;
      const mid = { x: (wall.a.x + wall.b.x) / 2, y: (wall.a.y + wall.b.y) / 2 };
      const len = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y) || 1;
      const nx = (-(wall.b.y - wall.a.y) / len) * 6,
        ny = ((wall.b.x - wall.a.x) / len) * 6;
      if (
        ![
          { x: mid.x + nx, y: mid.y + ny },
          { x: mid.x - nx, y: mid.y - ny },
        ].some(seesPoint)
      )
        hiddenDoors.push(wall.id);
    }
  const result = {
    scene,
    view,
    cfg,
    lit,
    viewers,
    opaque,
    hiddenTokens,
    hiddenDoors,
    clones,
    memory: view.vision && opaque ? D.memoryBits(ctx.state, scene.id, view.memoryActors) : null,
  };
  bucket.set(key, result);
  return result;
}

// ------------------------------------------------------------------------------ svg helpers

const pts = (points) => points.map((p) => `${f1(p.x)},${f1(p.y)}`).join(" ");
function sector(at, radius, rotation) {
  const half = (D.CONE_ANGLE / 2) * (Math.PI / 180);
  const r0 = (rotation * Math.PI) / 180;
  const a = { x: at.x + Math.cos(r0 - half) * radius, y: at.y + Math.sin(r0 - half) * radius };
  const b = { x: at.x + Math.cos(r0 + half) * radius, y: at.y + Math.sin(r0 + half) * radius };
  return `M${f1(at.x)} ${f1(at.y)}L${f1(a.x)} ${f1(a.y)}A${f1(radius)} ${f1(radius)} 0 0 1 ${f1(b.x)} ${f1(b.y)}Z`;
}
const lightShape = (light, radius, fill, clip, extra = "") =>
  light.cone
    ? `<path d="${sector(light.at, radius, light.rotation ?? 0)}" fill="${fill}" clip-path="url(#${clip})"${extra}/>`
    : `<circle cx="${f1(light.at.x)}" cy="${f1(light.at.y)}" r="${f1(radius)}" fill="${fill}" clip-path="url(#${clip})"${extra}/>`;
const circle = (at, r, fill, clip = "") =>
  `<circle cx="${f1(at.x)}" cy="${f1(at.y)}" r="${f1(r)}" fill="${fill}"${clip ? ` clip-path="url(#${clip})"` : ""}/>`;
/** SVG for one fog operation, painted with `fill` (white covers, black reveals in a mask). */
export function opSvg(scene, op, fill) {
  if (op.shape === "all")
    return `<rect width="${scene.width}" height="${scene.height}" fill="${fill}"/>`;
  if (op.shape === "rect") {
    const [a, b] = op.points;
    return `<rect x="${f1(Math.min(a.x, b.x))}" y="${f1(Math.min(a.y, b.y))}" width="${f1(Math.abs(a.x - b.x))}" height="${f1(Math.abs(a.y - b.y))}" fill="${fill}"/>`;
  }
  if (op.shape === "polygon") return `<polygon points="${pts(op.points)}" fill="${fill}"/>`;
  const size = D.metersToPx(scene, D.brushMeters(op.size));
  if (op.brush === "square")
    return `<path d="${op.points.map((p) => `M${f1(p.x - size / 2)} ${f1(p.y - size / 2)}h${f1(size)}v${f1(size)}h${f1(-size)}Z`).join("")}" fill="${fill}"/>`;
  if (op.points.length === 1) return circle(op.points[0], size / 2, fill);
  return `<polyline points="${pts(op.points)}" fill="none" stroke="${fill}" stroke-width="${f1(size)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
/** The explored cells as horizontal runs (one path), softened by the mask filter. */
function memoryPath(scene, bits) {
  const { cell, cols, rows } = D.gridOf(scene);
  let d = "";
  for (let row = 0; row < rows; row++) {
    let start = -1;
    for (let col = 0; col <= cols; col++) {
      const on = col < cols && D.bitAt(bits, row * cols + col);
      if (on && start < 0) start = col;
      if (!on && start >= 0) {
        d += `M${f1(start * cell)} ${f1(row * cell)}h${f1((col - start) * cell)}v${f1(cell)}h${f1(-(col - start) * cell)}Z`;
        start = -1;
      }
    }
  }
  return d;
}
/**
 * The region hidden behind a magical darkness sphere from a viewer outside it: the tangent
 * cone beyond the sphere (the near cap is the sphere itself). Matches D.throughDarkness.
 */
export function shadowPoints(viewer, d, far) {
  const dx = d.at.x - viewer.at.x,
    dy = d.at.y - viewer.at.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= d.brightPx) return null;
  const base = Math.atan2(dy, dx);
  const half = Math.asin(d.brightPx / distance);
  const tangent = Math.sqrt(distance * distance - d.brightPx * d.brightPx);
  const at = (angle, r) => ({
    x: viewer.at.x + Math.cos(angle) * r,
    y: viewer.at.y + Math.sin(angle) * r,
  });
  const points = [at(base - half, tangent)];
  for (let i = 0; i <= 8; i++) points.push(at(base - half + (2 * half * i) / 8, far));
  points.push(at(base + half, tangent));
  return points;
}
/** What the viewers see now, painted `on` (lit, darkvision, senses) and `off` (darkness). */
function visibleShapes(m, on = "white", off = "black") {
  const { lit } = m;
  const far = 3 * (m.scene.width + m.scene.height);
  const full = `<rect width="${m.scene.width}" height="${m.scene.height}" fill="${on}"/>`;
  return m.viewers
    .map((viewer, i) => {
      const parts = [];
      if (!viewer.senses.blinded) {
        if (lit.ambient !== "dark") parts.push(full);
        else {
          if (viewer.darkvisionPx) parts.push(circle(viewer.at, viewer.darkvisionPx, on));
          lit.lights.forEach((light, j) => {
            if (light.on !== false && !light.suppressed)
              parts.push(lightShape(light, light.radiusPx, on, `fv-lc-${j}`));
          });
        }
        lit.darkness.forEach((d, k) => {
          parts.push(circle(d.at, d.brightPx, off, `fv-dk-${k}`));
          // Nothing is seen through the sphere (SRD Darkness): its shadow from this viewer.
          const shadow = shadowPoints(viewer, d, far);
          if (shadow)
            parts.push(
              `<polygon class="fv-shadow" points="${pts(shadow)}" fill="${off}" clip-path="url(#fv-dk-${k})"/>`,
            );
        });
        if (viewer.truesightPx) parts.push(circle(viewer.at, viewer.truesightPx, on));
      }
      if (viewer.blindsightPx) parts.push(circle(viewer.at, viewer.blindsightPx, on));
      return `<g clip-path="url(#fv-los-${i})">${parts.join("")}</g>`;
    })
    .join("");
}
const clipDefs = (m) =>
  [
    ...m.viewers.map(
      (v, i) => `<clipPath id="fv-los-${i}"><polygon points="${pts(v.polygon)}"/></clipPath>`,
    ),
    ...m.lit.lights.map(
      (l, j) => `<clipPath id="fv-lc-${j}"><polygon points="${pts(l.polygon)}"/></clipPath>`,
    ),
    ...m.lit.darkness.map(
      (d, k) => `<clipPath id="fv-dk-${k}"><polygon points="${pts(d.polygon)}"/></clipPath>`,
    ),
  ].join("");

// ------------------------------------------------------------------------------ layers

// Ambient darkness per level: the DM keeps seeing the tokens through a lighter veil.
const AMBIENT = { bright: [0, 0], dim: [0.28, 0.16], dark: [0.66, 0.36] };
/** Under the tokens: the night, the glow of each light and the magical darkness. */
export function lightingLayer(ctx, tv) {
  const m = model(ctx, tv.scene);
  if (!m || (!m.cfg.lights.length && m.lit.ambient === "bright")) return "";
  const { scene, lit } = m;
  const W = scene.width,
    H = scene.height;
  // PR-25: the night's colour and intensity (Fantasy Grounds lighting presets).
  const intensity = (Number(m.cfg.ambientIntensity) || 100) / 100;
  const tint = m.cfg.ambientTint || "#050912";
  const opacity = Math.min(0.92, AMBIENT[lit.ambient][m.opaque ? 0 : 1] * intensity);
  const glowing = lit.lights.filter((l) => l.on !== false && !l.suppressed);
  const clips = [
    ...lit.lights.map(
      (l, j) => `<clipPath id="fv-glc-${j}"><polygon points="${pts(l.polygon)}"/></clipPath>`,
    ),
    ...lit.darkness.map(
      (d, k) => `<clipPath id="fv-gdk-${k}"><polygon points="${pts(d.polygon)}"/></clipPath>`,
    ),
  ].join("");
  const gradients = lit.lights
    .map((l, j) => {
      const inner = l.radiusPx ? Math.min(1, l.brightPx / l.radiusPx) : 1;
      const strength = lit.ambient === "bright" ? 0.12 : 0.26;
      return `<radialGradient id="fv-glow-${j}" gradientUnits="userSpaceOnUse" cx="${f1(l.at.x)}" cy="${f1(l.at.y)}" r="${f1(l.radiusPx)}"><stop offset="0" stop-color="${l.color}" stop-opacity="${strength}"/><stop offset="${f1(inner * 100) / 100}" stop-color="${l.color}" stop-opacity="${f1(strength * 60) / 100}"/><stop offset="1" stop-color="${l.color}" stop-opacity="0"/></radialGradient>`;
    })
    .join("");
  const index = (l) => lit.lights.indexOf(l);
  // Foundry's day/night transition (FVT-159): the veil fades over 1.2 s to the new level and
  // keeps fading across the renders that follow (exploration follow-ups, other areas).
  const veilKey = scene.id + (m.opaque ? ":player" : ":dm");
  const now = Date.now();
  const previous = ui.ambient[veilKey];
  const at = (anim) =>
    !anim || anim.duration <= 0
      ? (anim?.to ?? opacity)
      : anim.from + (anim.to - anim.from) * Math.min(1, (now - anim.start) / anim.duration);
  if (!previous) ui.ambient[veilKey] = { from: opacity, to: opacity, start: now, duration: 0 };
  else if (previous.to !== opacity)
    ui.ambient[veilKey] = { from: at(previous), to: opacity, start: now, duration: 1200 };
  const anim = ui.ambient[veilKey];
  const shown = f1(at(anim) * 100) / 100;
  const remaining = Math.max(0, anim.start + anim.duration - now);
  const ambientMask =
    opacity > 0 || shown > 0
      ? `<mask id="fv-amb" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="white"/>${glowing.map((l) => lightShape(l, l.radiusPx, "#5a5a5a", `fv-glc-${index(l)}`)).join("")}${glowing.map((l) => lightShape(l, l.brightPx, "black", `fv-glc-${index(l)}`)).join("")}</mask>`
      : "";
  return `<g class="fv-lighting" data-fv-phase="${D.effectivePhase(ctx.state, scene.id)}"><defs>${clips}${gradients}${ambientMask}</defs>${opacity > 0 || shown > 0 ? `<rect class="fv-ambient" data-fv-ambient="${opacity}" data-fv-remaining="${remaining}" width="${W}" height="${H}" fill="${ctx.esc(tint)}" opacity="${shown}"${ambientMask ? ' mask="url(#fv-amb)"' : ""}/>` : ""}${glowing.map((l) => lightShape(l, l.radiusPx, `url(#fv-glow-${index(l)})`, `fv-glc-${index(l)}`, ' class="fv-glow"')).join("")}${lit.darkness.map((d, k) => `<circle class="fv-darkness" cx="${f1(d.at.x)}" cy="${f1(d.at.y)}" r="${f1(d.brightPx)}" clip-path="url(#fv-gdk-${k})"${m.opaque ? "" : ' data-fv-dm=""'}/>`).join("")}</g>`;
}
function bindLightingLayer(el) {
  const rect = el.querySelector("[data-fv-ambient]");
  if (!rect) return;
  const target = rect.dataset.fvAmbient;
  const remaining = Number(rect.dataset.fvRemaining) || 0;
  if (rect.getAttribute("opacity") === target) return;
  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduced || !remaining) {
    rect.setAttribute("opacity", target);
    return;
  }
  rect.style.transition = `opacity ${remaining}ms linear`;
  requestAnimationFrame(() => requestAnimationFrame(() => rect.setAttribute("opacity", target)));
}

/** Above the tokens: manual fog, unexplored darkness, explored memory and darkvision grey. */
export function fogLayer(ctx, tv) {
  const m = model(ctx, tv.scene);
  if (!m) return "";
  const { scene, cfg, view } = m;
  const W = scene.width,
    H = scene.height;
  const box = `maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"`;
  const defs = [],
    parts = [];
  if (view.vision && m.opaque) {
    const { cell } = D.gridOf(scene);
    const memory = memoryPath(scene, m.memory);
    defs.push(
      clipDefs(m),
      `<filter id="fv-soft" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="${f1(cell * 0.6)}"/></filter>`,
      `<filter id="fv-mono" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feColorMatrix type="saturate" values="0.15"/></filter>`,
      `<mask id="fv-vis" ${box}><rect width="${W}" height="${H}" fill="black"/>${visibleShapes(m)}</mask>`,
      `<mask id="fv-notvis" ${box}><rect width="${W}" height="${H}" fill="white"/><rect width="${W}" height="${H}" fill="black" mask="url(#fv-vis)"/></mask>`,
      `<mask id="fv-mem" ${box}><rect width="${W}" height="${H}" fill="black"/>${memory ? `<path d="${memory}" fill="white" filter="url(#fv-soft)"/>` : ""}</mask>`,
    );
    // Everything out of sight is covered; explored areas show the remembered map only
    // (Roll20 Explorer mode, Smoke trailing fog): the scene drawing and its walls, grey and
    // dim, with no creature or marker of the present.
    parts.push(
      `<rect class="fv-unexplored" width="${W}" height="${H}" mask="url(#fv-notvis)"/>`,
      memory
        ? `<g class="fv-remembered" mask="url(#fv-mem)"><g mask="url(#fv-notvis)"><g filter="url(#fv-mono)">${renderSceneBase(scene, ctx)}${scene.gridVisible !== false ? `<rect width="${W}" height="${H}" fill="url(#map-grid)"/>` : ""}${renderSpatialOverlay(scene, ctx, { players: true })}</g><rect class="fv-explored" width="${W}" height="${H}"/></g></g>`
        : "",
    );
    // Darkvision in darkness shows shades of grey (SRD Darkvision; Smoke greyscale).
    if (m.lit.ambient === "dark") {
      const grey = m.viewers
        .map((v, i) =>
          v.darkvisionPx && !v.senses.blinded
            ? `<g clip-path="url(#fv-los-${i})">${circle(v.at, v.darkvisionPx, "white")}</g>`
            : "",
        )
        .join("");
      if (grey) {
        const lit = m.lit.lights
          .map((l, j) =>
            l.on !== false && !l.suppressed ? lightShape(l, l.radiusPx, "black", `fv-lc-${j}`) : "",
          )
          .join("");
        defs.push(
          `<mask id="fv-grey" ${box}><rect width="${W}" height="${H}" fill="black"/>${grey}${lit}</mask>`,
        );
        parts.push(`<rect class="fv-grey" width="${W}" height="${H}" mask="url(#fv-grey)"/>`);
      }
    }
  }
  // The DM's manual fog comes last: nothing of a covered area shows, remembered or not.
  if (cfg.fog.length) {
    defs.push(
      `<mask id="fv-fog" ${box}><rect width="${W}" height="${H}" fill="black"/>${cfg.fog.map((op) => opSvg(scene, op, op.op === "cover" ? "white" : "black")).join("")}</mask>`,
    );
    parts.push(
      m.opaque
        ? `<rect class="fv-fog is-opaque" width="${W}" height="${H}" mask="url(#fv-fog)"/>`
        : `<rect class="fv-fog is-dm" width="${W}" height="${H}" mask="url(#fv-fog)"/><rect class="fv-fog-hatch" width="${W}" height="${H}" fill="url(#fv-hatch)" mask="url(#fv-fog)"/>`,
    );
    if (!m.opaque)
      defs.push(
        `<pattern id="fv-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V16" stroke="#9fb3c0" stroke-opacity=".35" stroke-width="2"/></pattern>`,
      );
  }
  // Tokens and door controls the viewer cannot see are not on screen, not in the
  // accessibility tree and not in the tab order (Foundry hides unseen tokens).
  // Decorations of other areas follow their token: elements carrying data-token-for
  // (annotations elevation and note dots), the token-note badge, health words, condition
  // marks and the out-of-combat marker (hidden under the fog, still read aloud), and the
  // token's row in the Creature tab's distances (B18), which would name it.
  const hide = [
    ...m.hiddenTokens.flatMap((raw) => {
      const id = CSS_ID(raw);
      return [
        `#battle-map .map-token[data-actor="${id}"]`,
        `#battle-map [data-token-for="${id}"]`,
        `#battle-map [data-annot-tip="${id}"]`,
        `#battle-map [data-cs-health="${id}"]`,
        `#battle-map [data-token-menu-deco="${id}"]`,
        `#battle-map [data-ct-out="${id}"]`,
        `#content li:has(> [data-annot-dist="${id}"])`,
      ];
    }),
    ...m.hiddenDoors.map((id) => `#battle-map [data-door="${CSS_ID(id)}"]`),
    // An invisible barrier (Foundry invisible wall) is not drawn for whoever sees as a player.
    ...(m.opaque
      ? (scene.walls ?? [])
          .filter((wall) => D.barrierType(wall) === "invisible")
          .map((wall) => `#battle-map [data-spatial-wall="${CSS_ID(wall.id)}"]`)
      : []),
  ];
  if (!defs.length && !parts.length && !hide.length) return "";
  return `<g class="fv-fog-layer" data-fv-mode="${view.mode}" data-fv-hidden-tokens="${ctx.esc(m.hiddenTokens.join(" "))}" data-fv-hidden-doors="${ctx.esc(m.hiddenDoors.join(" "))}" data-fv-viewers="${ctx.esc(m.viewers.map((v) => v.actorId).join(" "))}" data-fv-memory="${ctx.esc(m.memory ? m.view.memoryActors.join(" ") : "")}"><defs>${defs.join("")}</defs>${parts.join("")}${hide.length ? `<style>${hide.join(",")}{display:none}</style>` : ""}</g>`;
}
const CSS_ID = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, "");

// ------------------------------------------------------------------------------ top layer

function cloneMarkup(ctx, scene, actorId, selected) {
  const token = D.tokenOf(scene, actorId);
  const actor = ctx.state.actors[actorId];
  if (!token || !actor) return "";
  return `<g class="fv-clone${selected ? " is-selected" : ""}" data-fv-clone="${ctx.esc(actorId)}" transform="translate(${f1(token.x)} ${f1(token.y)})" pointer-events="none" aria-hidden="true"><circle r="28" class="fv-clone-ring"/><circle r="23" class="fv-clone-disc"/><text y="6" text-anchor="middle">${ctx.esc(actor.name[0])}</text><text class="fv-clone-name" y="44" text-anchor="middle">${ctx.esc(actor.name)}</text></g>`;
}
function barrierOverlay(ctx, tv) {
  const scale = 1 / (tv.zoom || 1);
  return (tv.scene.walls ?? [])
    .map((wall) => {
      const type = D.barrierType(wall);
      const selected = ui.wall === wall.id;
      const typeName =
        type === "door"
          ? ctx.t("Porta", "Door")
          : ctx.label(
              D.BARRIER_TYPES.find(([id]) => id === type)?.[1] ?? L("Personalizzata", "Custom"),
            );
      let arrows = "";
      if (wall.blockSide) {
        // Chevrons point the way sight passes: from the open side into the blocked side.
        const len = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y) || 1;
        const ux = (wall.b.x - wall.a.x) / len,
          uy = (wall.b.y - wall.a.y) / len;
        // Normal toward the "right" side of A→B in map coordinates (y down).
        const rx = -uy,
          ry = ux;
        const dir = wall.blockSide === "right" ? 1 : -1;
        for (const t of [0.3, 0.5, 0.7]) {
          const c = {
            x: wall.a.x + (wall.b.x - wall.a.x) * t,
            y: wall.a.y + (wall.b.y - wall.a.y) * t,
          };
          const tip = { x: c.x + rx * dir * 10 * scale, y: c.y + ry * dir * 10 * scale };
          const back = { x: c.x - rx * dir * 6 * scale, y: c.y - ry * dir * 6 * scale };
          arrows += `<path d="M${f1(back.x + ux * 7 * scale)} ${f1(back.y + uy * 7 * scale)}L${f1(tip.x)} ${f1(tip.y)}L${f1(back.x - ux * 7 * scale)} ${f1(back.y - uy * 7 * scale)}" class="fv-oneway"/>`;
        }
      }
      return `<g class="fv-barrier is-${type}${selected ? " is-selected" : ""}" data-fv-wall="${ctx.esc(wall.id)}"><title>${ctx.esc(typeName)}</title><line class="fv-barrier-hit" x1="${wall.a.x}" y1="${wall.a.y}" x2="${wall.b.x}" y2="${wall.b.y}"/><line class="fv-barrier-line" x1="${wall.a.x}" y1="${wall.a.y}" x2="${wall.b.x}" y2="${wall.b.y}"/>${arrows}</g>`;
    })
    .join("");
}
function polygonDraft(ctx, tv) {
  if (!ui.polygon.length && !ui.cursor) return "";
  const scale = 1 / (tv.zoom || 1);
  const points = ui.cursor ? [...ui.polygon, ui.cursor] : ui.polygon;
  return `<g class="fv-draft"><polyline points="${pts(points)}"/>${ui.polygon.map((p, i) => `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1((i === 0 ? 9 : 5) * scale)}" class="${i === 0 ? "is-first" : ""}"/>`).join("")}${ui.cursor ? `<circle cx="${f1(ui.cursor.x)}" cy="${f1(ui.cursor.y)}" r="${f1(6 * scale)}" class="is-cursor"/>` : ""}</g>`;
}
export function topLayer(ctx, tv) {
  const m = model(ctx, tv.scene);
  if (!m) return "";
  const parts = [];
  if (onTop(ctx))
    parts.push(...m.clones.map((id) => cloneMarkup(ctx, tv.scene, id, tv.selectedActorId === id)));
  if (runsSession(ctx.state, ctx.role)) {
    parts.push(lightMarks(ctx, tv, m.lit));
    // Diagnostics rings for vision tokens (hover a row of the panel).
    parts.push(
      ...D.visionTokens(ctx.state, tv.scene).map((id) => {
        const t = D.tokenOf(tv.scene, id);
        return `<circle class="fv-mark-ring" data-fv-mark="${ctx.esc(CSS_ID(id))}" cx="${f1(t.x)}" cy="${f1(t.y)}" r="${f1(34 / (tv.zoom || 1))}"/>`;
      }),
    );
    if (tv.mode === BARRIER_TOOL) parts.push(barrierOverlay(ctx, tv));
    if (tv.mode === FOG_TOOL) parts.push(polygonDraft(ctx, tv));
    if (tv.mode === TELEPORT_TOOL && ui.teleport) {
      const t = D.tokenOf(tv.scene, ui.teleport);
      if (t)
        parts.push(
          `<circle class="fv-teleport-pick" cx="${f1(t.x)}" cy="${f1(t.y)}" r="${f1(32 / (tv.zoom || 1))}"/>`,
        );
    }
  }
  parts.push('<g class="fv-live" data-fv-live></g>');
  return `<g class="fv-top">${parts.join("")}</g>`;
}
// TV-30: the tool options sit in their own layer above every map layer (doors, pings,
// other areas' marks), so a locked-door icon never draws over the panel.
export function hudLayer(ctx, tv) {
  const m = model(ctx, tv.scene);
  return m ? hudMarkup(ctx, tv, m) : "";
}

// ------------------------------------------------------------------------------ HUD

function fogBar(ctx, tv, m) {
  const f = ui.fog;
  const memoryTargets = m.cfg.vision ? D.partyViewers(ctx.state, tv.scene) : [];
  const onMemory = f.target !== "scene";
  const opButtons = [
    [
      "reveal",
      onMemory
        ? ctx.t("Rivela (aggiungi all’esplorato)", "Reveal (add to explored)")
        : ctx.t("Rivela", "Reveal"),
    ],
    ["cover", onMemory ? ctx.t("Copri (dimentica)", "Cover (forget)") : ctx.t("Copri", "Cover")],
  ]
    .map(([id, text]) =>
      btn(ctx, {
        attrs: `data-fv-fog-set="op:${id}"`,
        text,
        pressed: f.op === id,
        focus: "op-" + id,
      }),
    )
    .join("");
  const shapes = [
    ["brush", ctx.t("Pennello", "Brush")],
    ["polygon", ctx.t("Poligono", "Polygon")],
    ["rect", ctx.t("Rettangolo", "Rectangle")],
  ]
    .map(([id, text]) =>
      btn(ctx, {
        attrs: `data-fv-fog-set="shape:${id}"`,
        text,
        pressed: f.shape === id,
        focus: "shape-" + id,
      }),
    )
    .join("");
  const tips =
    f.shape === "brush"
      ? group(
          ctx.t("Punta", "Tip"),
          [
            ["circle", ctx.t("Cerchio", "Circle")],
            ["square", ctx.t("Quadrato", "Square")],
          ]
            .map(([id, text]) =>
              btn(ctx, {
                attrs: `data-fv-fog-set="brush:${id}"`,
                text,
                pressed: f.brush === id,
                focus: "brush-" + id,
              }),
            )
            .join(""),
        ) +
        `<label class="fv-field">${ctx.t("Taglia", "Size")}<select data-fv-fog-select="size" aria-label="${ctx.t("Taglia del pennello", "Brush size")}">${D.BRUSH_SIZES.map(([id, meters, label]) => `<option value="${id}"${f.size === id ? " selected" : ""}>${ctx.esc(ctx.label(label))} · ${String(meters).replace(".", ctx.lang === "it" ? "," : ".")} m</option>`).join("")}</select></label>`
      : "";
  const target = memoryTargets.length
    ? `<label class="fv-field">${ctx.t("Su", "On")}<select data-fv-fog-select="target" aria-label="${ctx.t("Dove dipingi", "Paint on")}"><option value="scene"${f.target === "scene" ? " selected" : ""}>${ctx.t("Nebbia della scena", "Scene fog")}</option>${memoryTargets.map((id) => `<option value="memory:${ctx.esc(id)}"${f.target === "memory:" + id ? " selected" : ""}>${ctx.t("Aree esplorate di", "Explored areas of")} ${ctx.esc(name(ctx, id))}</option>`).join("")}</select></label>`
    : "";
  const whole = onMemory
    ? ""
    : `${btn(ctx, { attrs: 'data-fv-act="cover-all"', text: ctx.t("Copri tutto", "Cover all"), focus: "cover-all" })}${btn(ctx, { attrs: 'data-fv-act="reveal-all"', text: ctx.t("Rivela tutto", "Reveal all"), focus: "reveal-all" })}`;
  const polygon = ui.polygon.length
    ? `<div class="fv-row" role="group" aria-label="${ctx.t("Poligono in corso", "Polygon in progress")}"><span class="fv-hint" id="fv-polygon-why">${ctx.t("Punti", "Points")}: ${ui.polygon.length}${ui.polygon.length < 3 ? ` · ${ctx.t("ne servono almeno 3: clic sulla mappa per aggiungerli", "at least 3 are needed: click the map to add them")}` : ""}</span>${btn(ctx, { attrs: 'data-fv-act="polygon-close"', text: ctx.t("Chiudi poligono", "Close polygon"), cls: "is-primary", disabled: ui.polygon.length < 3, why: "fv-polygon-why", focus: "polygon-close" })}${btn(ctx, { attrs: 'data-fv-act="polygon-back" aria-keyshortcuts="Z Backspace"', text: ctx.t("Togli ultimo punto", "Remove last point"), focus: "polygon-back" })}${btn(ctx, { attrs: 'data-fv-act="polygon-cancel"', text: ctx.t("Annulla poligono", "Cancel polygon"), focus: "polygon-cancel" })}</div>`
    : "";
  return `<div class="fv-row">${group(ctx.t("Azione", "Action"), opButtons)}${group(ctx.t("Forma", "Shape"), shapes)}${tips}</div><div class="fv-row">${target}${whole}${btn(ctx, { attrs: 'data-fv-act="preview"', text: ctx.t("Anteprima giocatori", "Player preview"), icon: "eye", pressed: ui.preview, focus: "preview" })}${btn(ctx, { attrs: 'data-fv-act="undo"', text: ctx.t("Annulla", "Undo"), icon: "undo", focus: "undo" })}</div>${polygon}`;
}
function barrierBar(ctx, tv) {
  const walls = (tv.scene.walls ?? []).filter((w) => w.kind !== "door");
  const wall = walls.find((w) => w.id === ui.wall);
  const nav = `${btn(ctx, { attrs: 'data-fv-act="wall-prev"', text: ctx.t("Barriera precedente", "Previous barrier"), disabled: !walls.length, why: "fv-walls-why", focus: "wall-prev" })}${btn(ctx, { attrs: 'data-fv-act="wall-next"', text: ctx.t("Barriera successiva", "Next barrier"), disabled: !walls.length, why: "fv-walls-why", focus: "wall-next" })}`;
  if (!wall)
    return `<div class="fv-row"><span class="fv-hint" id="fv-walls-why">${walls.length ? ctx.t("Clic su un muro per sceglierne il tipo. Le porte si aprono e chiudono dal loro simbolo.", "Click a wall to choose its type. Doors open and close from their symbol.") : ctx.t("Questa scena non ha muri: disegnali nell’editor della scena (Preparazione).", "This scene has no walls: draw them in the scene editor (Preparation).")}</span>${nav}</div>`;
  const type = D.barrierType(wall);
  const index = walls.indexOf(wall) + 1;
  const described = D.BARRIER_TYPES.find(([id]) => id === type)?.[3];
  return `<div class="fv-row"><strong>${ctx.t("Barriera", "Barrier")} ${index}/${walls.length}</strong>${group(
    ctx.t("Tipo di barriera", "Barrier type"),
    D.BARRIER_TYPES.map(([id, label]) =>
      btn(ctx, {
        attrs: `data-fv-wall-type="${id}"`,
        text: ctx.label(label),
        pressed: type === id,
        focus: "wall-" + id,
      }),
    ).join(""),
  )}${type === "one-way" ? btn(ctx, { attrs: 'data-fv-act="wall-flip"', text: ctx.t("Inverti lato", "Flip side"), focus: "wall-flip" }) : ""}${type === "proximity" ? `<label class="fv-field">${ctx.t("Vede attraverso chi è entro (m)", "Seen through from within (m)")}<input type="number" inputmode="decimal" min="0.5" max="120" step="0.5" value="${ctx.esc(wall.proximityMeters ?? 3)}" data-fv-proximity data-fv-focus="wall-proximity"></label>` : ""}${nav}${btn(ctx, { attrs: 'data-fv-act="wall-deselect"', text: ctx.t("Deseleziona", "Deselect"), focus: "wall-deselect" })}</div>${described ? `<div class="fv-row"><span class="fv-hint">${ctx.esc(ctx.label(described))}</span></div>` : ""}`;
}
function teleportBar(ctx, tv, m) {
  const picked = ui.teleport && ctx.state.actors[ui.teleport];
  return `<div class="fv-row"><span class="fv-hint">${picked ? ctx.t(`Clic sul punto d’arrivo di ${picked.name} (anche oltre i muri).`, `Click where ${picked.name} arrives (walls do not stop it).`) : ctx.t("Clic sulla pedina da teletrasportare, poi sul punto d’arrivo. Tastiera: frecce e Invio dalla pedina selezionata.", "Click the token to teleport, then its destination. Keyboard: arrows and Enter from the selected token.")}</span>${picked ? btn(ctx, { attrs: 'data-fv-act="teleport-cancel"', text: ctx.t("Annulla scelta", "Cancel choice"), focus: "teleport-cancel" }) : ""}${btn(ctx, { attrs: 'data-fv-act="update-on-drop"', text: ctx.t("Aggiorna la visione solo all’arrivo", "Update vision only on drop"), pressed: m.cfg.updateOnDrop === true, focus: "update-on-drop" })}</div>`;
}
function hudMarkup(ctx, tv, m) {
  const width = tv.scene.width / (tv.zoom || 1);
  const height = tv.scene.height / (tv.zoom || 1);
  const bar = !runsSession(ctx.state, ctx.role)
    ? ""
    : tv.mode === FOG_TOOL
      ? fogBar(ctx, tv, m)
      : tv.mode === LIGHTS_TOOL
        ? lightsBar(ctx, tv)
        : tv.mode === BARRIER_TOOL
          ? barrierBar(ctx, tv)
          : tv.mode === TELEPORT_TOOL
            ? teleportBar(ctx, tv, m)
            : "";
  const banner =
    m.view.mode === "as-token"
      ? `<div class="fv-banner" role="status" data-fv-banner="as-token"><span>${ctx.icon("eye")} ${ctx.t("Vista di", "View of")} <strong>${ctx.esc(name(ctx, ui.viewAs))}</strong>: ${ctx.t("nebbia opaca come per il giocatore", "fog opaque as for the player")}</span><button type="button" class="fv-btn is-primary" data-fv-act="exit-view">${ctx.t("Torna alla vista del DM", "Back to the DM view")}</button></div>`
      : m.view.mode === "preview"
        ? `<div class="fv-banner" role="status" data-fv-banner="preview"><span>${ctx.icon("eye")} ${ctx.t("Anteprima giocatori: ciò che vedono i personaggi del gruppo", "Player preview: what the party’s characters see")}</span><button type="button" class="fv-btn is-primary" data-fv-act="exit-view">${ctx.t("Torna alla vista del DM", "Back to the DM view")}</button></div>`
        : "";
  if (!bar && !banner) return "";
  // PR-23/TV-30: the options can be folded to one line so they never hide the tokens under
  // them (Owlbear's collapsible tool bar); the choice is kept while the tool stays open.
  const folded = Boolean(bar) && ui.barFolded;
  const fold = bar
    ? `<button type="button" class="fv-btn fv-fold" data-fv-fold aria-expanded="${!folded}" data-fv-focus="fold">${folded ? `▴ ${ctx.t("Mostra le opzioni", "Show the options")}` : `▾ ${ctx.t("Riduci", "Fold")}`}</button>`
    : "";
  // The fold control is a tab above the bar, so the bar keeps its own size; folded, only the
  // tab stays and the map under the options is free.
  const options = bar
    ? `<div class="fv-fold-row">${fold}</div>${folded ? "" : `<div class="fv-bar" data-fv-bar="${ctx.esc(tv.mode)}" role="toolbar" aria-label="${ctx.t("Opzioni dello strumento", "Tool options")}">${bar}</div>`}`
    : "";
  return `<foreignObject class="fv-hud-fo" x="${tv.pan?.x ?? 0}" y="${tv.pan?.y ?? 0}" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" class="fv-hud"><div class="fv-bottom">${banner}${options}</div></div></foreignObject>`;
}
function bindTopLayer(el, ctx, table) {
  ui.table = table;
  ui.liveEl = el.querySelector("[data-fv-live]");
  stopMapEvents(el);
  bindLightMarks(el, ctx, table);
  // Escape also clears this area's gestures (polygon, cursor, picked token, nudge).
  table.svg.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (cancelGestures()) queueMicrotask(() => ctx.render());
  });
}
function bindHudLayer(el, ctx, table) {
  ui.table = table;
  // TV-30: the Table draws its door buttons after the area layers; the tool options move
  // to the end of the map so no door icon paints over them.
  if (el.firstElementChild && el.parentNode === table.svg && table.svg.lastElementChild !== el)
    table.svg.appendChild(el);
  stopMapEvents(el);
  layoutHud(el, table);
  const bar = el.querySelector("[data-fv-bar]");
  const sceneId = table.scene.id;
  el.querySelector("[data-fv-fold]")?.addEventListener("click", () => {
    ui.barFolded = !ui.barFolded;
    ui.focusKey = "fold";
    ctx.render();
  });
  el.querySelectorAll('[data-fv-act="exit-view"]').forEach((b) =>
    b.addEventListener("click", () => {
      ui.viewAs = null;
      ui.preview = false;
      ctx.render();
    }),
  );
  if (bar) {
    if (bar.dataset.fvBar === LIGHTS_TOOL) bindLightsBar(bar, ctx, table);
    bar.querySelectorAll("[data-fv-fog-set]").forEach((b) =>
      b.addEventListener("click", () => {
        const [key, value] = b.dataset.fvFogSet.split(":");
        ui.fog = { ...ui.fog, [key]: value };
        ui.focusKey = b.dataset.fvFocus;
        if (key === "shape") {
          ui.polygon = [];
          ui.rectStart = null;
        }
        ctx.render();
      }),
    );
    bar.querySelectorAll("[data-fv-fog-select]").forEach((s) =>
      s.addEventListener("change", () => {
        ui.fog = { ...ui.fog, [s.dataset.fvFogSelect]: s.value };
        if (s.dataset.fvFogSelect === "target" && s.value !== "scene") ui.fog.op = "reveal";
        ctx.render();
      }),
    );
    bar.querySelectorAll("[data-fv-wall-type]").forEach((b) =>
      b.addEventListener("click", () => {
        ui.focusKey = b.dataset.fvFocus;
        setBarrier(ctx, sceneId, b.dataset.fvWallType);
      }),
    );
    // PR-22: the proximity distance, applied when the field is left (Foundry's wall config).
    bar.querySelector("[data-fv-proximity]")?.addEventListener("change", (event) => {
      ui.focusKey = "wall-proximity";
      setBarrier(ctx, sceneId, "proximity", null, Number(event.target.value));
    });
    bar.querySelectorAll("[data-fv-act]").forEach((b) =>
      b.addEventListener("click", () => {
        ui.focusKey = b.dataset.fvFocus ?? null;
        hudAction(ctx, table, b.dataset.fvAct);
      }),
    );
  }
  const key = ui.focusKey ?? lighting.focusKey;
  if (key) {
    ui.focusKey = null;
    lighting.focusKey = null;
    el.querySelector(`[data-fv-focus="${CSS_ID(key)}"]`)?.focus({ preventScroll: true });
  }
}
function hudAction(ctx, table, action) {
  const sceneId = table.scene.id;
  if (action === "undo") return ctx.undo();
  if (action === "cover-all" || action === "reveal-all")
    return commitFog(ctx, table, { op: action === "cover-all" ? "cover" : "reveal", shape: "all" });
  if (action === "preview") {
    ui.preview = !ui.preview;
    ui.viewAs = null;
    return ctx.render();
  }
  if (action === "polygon-close") return closePolygon(ctx, table);
  if (action === "polygon-back") {
    ui.polygon = ui.polygon.slice(0, -1);
    return ctx.render();
  }
  if (action === "polygon-cancel") {
    ui.polygon = [];
    ui.cursor = null;
    return ctx.render();
  }
  if (action === "wall-prev" || action === "wall-next") {
    const walls = (table.scene.walls ?? []).filter((w) => w.kind !== "door");
    if (!walls.length) return;
    const index = walls.findIndex((w) => w.id === ui.wall);
    const step = action === "wall-next" ? 1 : -1;
    ui.wall = walls[(index + step + walls.length) % walls.length].id;
    return ctx.render();
  }
  if (action === "wall-flip") {
    const wall = table.scene.walls.find((w) => w.id === ui.wall);
    return setBarrier(ctx, sceneId, "one-way", wall?.blockSide === "left" ? "right" : "left");
  }
  if (action === "wall-deselect") {
    ui.wall = null;
    return ctx.render();
  }
  if (action === "teleport-cancel") {
    ui.teleport = null;
    return ctx.render();
  }
  if (action === "update-on-drop") {
    const cfg = D.sceneConfig(ctx.state, sceneId);
    return run(
      ctx,
      cfg.updateOnDrop
        ? ctx.t("Visione aggiornata anche lungo il percorso", "Vision updated along the path too")
        : ctx.t("Visione aggiornata solo all’arrivo", "Vision updated only on drop"),
      (s) => D.setSceneOptions(s, ctx.role, sceneId, { updateOnDrop: !cfg.updateOnDrop }),
    );
  }
}

// ------------------------------------------------------------------------------ fog tool

const opName = (ctx, op) =>
  op === "cover"
    ? ctx.t("Nebbia coperta", "Fog covered")
    : ctx.t("Nebbia rivelata", "Fog revealed");
function commitFog(ctx, table, input) {
  const sceneId = table.scene.id;
  const target = ui.fog.target;
  if (target.startsWith("memory:") && input.shape !== "all") {
    const actorId = target.slice("memory:".length);
    return run(
      ctx,
      `${input.op === "reveal" ? ctx.t("Aree esplorate aggiunte", "Explored areas added") : ctx.t("Aree esplorate dimenticate", "Explored areas forgotten")}: ${name(ctx, actorId)}`,
      (s) => D.editMemory(s, ctx.role, sceneId, actorId, input),
    );
  }
  const label =
    input.shape === "all"
      ? input.op === "cover"
        ? ctx.t("Nebbia: copri tutto", "Fog: cover all")
        : ctx.t("Nebbia: rivela tutto", "Fog: reveal all")
      : `${opName(ctx, input.op)} (${input.shape === "brush" ? ctx.t("pennello", "brush") : input.shape === "polygon" ? ctx.t("poligono", "polygon") : ctx.t("rettangolo", "rectangle")})`;
  return run(ctx, label, (s) => D.addFogOp(s, ctx.role, sceneId, input));
}
const effectiveOp = (e) => (e?.altKey ? (ui.fog.op === "cover" ? "reveal" : "cover") : ui.fog.op);
function live(html) {
  if (ui.liveEl?.isConnected) ui.liveEl.innerHTML = html;
}
function livePreview(scene, op) {
  live(
    `<g class="fv-live-op is-${op.op}">${opSvg(scene, op, op.op === "cover" ? "#0b0f14" : "#e2c17b")}</g>`,
  );
}
function closePolygon(ctx, table) {
  if (ui.polygon.length < 3) {
    table.message(ctx.t("Servono almeno tre punti.", "At least three points are needed."));
    return false;
  }
  // TV-30 (DDB fog polygon): the draft is cleared before the commit redraws the map, so no
  // dashed outline or «Punti: 3» stays behind; a refused commit gives the points back.
  const points = ui.polygon;
  ui.polygon = [];
  ui.cursor = null;
  ui.lastClick = null;
  live("");
  const ok = commitFog(ctx, table, { op: ui.fog.op, shape: "polygon", points });
  if (!ok) {
    ui.polygon = points;
    ctx.render();
  }
  return ok;
}
export const fogTool = {
  id: FOG_TOOL,
  label: L("Nebbia", "Fog"),
  icon: "fog",
  group: "fog",
  roles: ["dm"],
  order: 10,
  activate(ctx, table) {
    table.message(
      ctx.t(
        "Nebbia: trascina il pennello per coprire o rivelare (Alt inverte). Poligono: clic sui vertici, doppio clic o Invio chiude. Tastiera: frecce spostano il mirino, Invio posa.",
        "Fog: drag the brush to cover or reveal (Alt inverts). Polygon: click the corners, double-click or Enter closes. Keyboard: arrows move the cursor, Enter places.",
      ),
    );
  },
  deactivate() {
    ui.gesture = null;
    ui.polygon = [];
    ui.cursor = null;
    ui.rectStart = null;
  },
  onPointerDown(ctx, e, table) {
    if (e.button !== 0) return;
    e.preventDefault?.();
    const p = table.point(e);
    const op = effectiveOp(e);
    if (ui.fog.shape === "polygon") {
      const first = ui.polygon[0];
      const scale = table.view?.zoom ? 1 / table.view.zoom : 1;
      // The press time of the event itself: a redraw after the first click must not make
      // the second press of a double-click look late (TV-30).
      const now = Number.isFinite(e.timeStamp) && e.timeStamp > 0 ? e.timeStamp : Date.now();
      const doubled =
        (e.detail ?? 0) >= 2 ||
        (ui.lastClick &&
          now - ui.lastClick.at < 500 &&
          Math.hypot(p.x - ui.lastClick.x, p.y - ui.lastClick.y) < 12 * scale);
      ui.lastClick = { at: now, x: p.x, y: p.y };
      if (
        ui.polygon.length >= 3 &&
        (doubled || (first && Math.hypot(p.x - first.x, p.y - first.y) < 14 * scale))
      ) {
        closePolygon(ctx, table);
        return;
      }
      ui.polygon = [...ui.polygon, { x: p.x, y: p.y }];
      ui.cursor = null;
      ctx.render();
      return;
    }
    ui.gesture = { shape: ui.fog.shape, op, points: [{ x: p.x, y: p.y }], start: p, end: p };
    capture(table, e);
    if (ui.fog.shape === "brush")
      livePreview(table.scene, {
        op,
        shape: "brush",
        brush: ui.fog.brush,
        size: ui.fog.size,
        points: ui.gesture.points,
      });
  },
  onPointerMove(ctx, e, table) {
    const g = ui.gesture;
    const p = table.point(e);
    if (!g) {
      if (ui.fog.shape === "polygon" && ui.polygon.length) {
        ui.cursor = { x: p.x, y: p.y };
        const preview = [...ui.polygon, ui.cursor];
        live(`<polyline class="fv-draft-line" points="${pts(preview)}"/>`);
      }
      return;
    }
    const clamped = {
      x: Math.max(0, Math.min(table.scene.width, p.x)),
      y: Math.max(0, Math.min(table.scene.height, p.y)),
    };
    if (g.shape === "brush") {
      const last = g.points.at(-1);
      if (Math.hypot(clamped.x - last.x, clamped.y - last.y) >= 3) g.points.push(clamped);
      livePreview(table.scene, {
        op: g.op,
        shape: "brush",
        brush: ui.fog.brush,
        size: ui.fog.size,
        points: g.points,
      });
    } else if (g.shape === "rect") {
      g.end = clamped;
      livePreview(table.scene, { op: g.op, shape: "rect", points: [g.start, g.end] });
    }
  },
  onPointerUp(ctx, e, table) {
    const g = ui.gesture;
    ui.gesture = null;
    if (!g) return;
    if (g.shape === "brush") {
      if (
        !commitFog(ctx, table, {
          op: g.op,
          shape: "brush",
          brush: ui.fog.brush,
          size: ui.fog.size,
          points: g.points,
        })
      )
        live("");
    } else if (g.shape === "rect") {
      if (!commitFog(ctx, table, { op: g.op, shape: "rect", points: [g.start, g.end] })) live("");
    }
  },
  onClick() {},
  onKeyDown(ctx, e, table) {
    const scene = table.scene;
    const step = (scene.gridSize || 50) / 2;
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.key]) {
      e.preventDefault();
      const token = D.tokenOf(scene, table.selectedActorId);
      const base =
        ui.cursor ??
        ui.polygon.at(-1) ??
        (token ? { x: token.x, y: token.y } : { x: scene.width / 2, y: scene.height / 2 });
      ui.cursor = {
        x: Math.max(0, Math.min(scene.width, base.x + arrows[e.key][0] * step)),
        y: Math.max(0, Math.min(scene.height, base.y + arrows[e.key][1] * step)),
      };
      ctx.render();
      table.message(
        ui.fog.shape === "polygon"
          ? ctx.t(
              "Invio aggiunge il vertice; Maiusc+Invio chiude il poligono.",
              "Enter adds the corner; Shift+Enter closes the polygon.",
            )
          : ui.fog.shape === "rect"
            ? ctx.t("Invio fissa un angolo, poi l’altro.", "Enter sets one corner, then the other.")
            : ctx.t("Invio posa il pennello qui.", "Enter places the brush here."),
      );
      return;
    }
    // Backspace, or Z as in Smoke & Spectre's obstruction tool (VTL-071), drops the last point.
    const plainZ = (e.key === "z" || e.key === "Z") && !e.ctrlKey && !e.metaKey && !e.altKey;
    if ((e.key === "Backspace" || plainZ) && ui.polygon.length) {
      e.preventDefault();
      ui.polygon = ui.polygon.slice(0, -1);
      ctx.render();
      return;
    }
    if (e.key !== "Enter" || e.target?.closest?.("[data-actor]")) return;
    e.preventDefault();
    if (ui.fog.shape === "polygon") {
      if (e.shiftKey || !ui.cursor) {
        closePolygon(ctx, table);
        return;
      }
      ui.polygon = [...ui.polygon, ui.cursor];
      ctx.render();
      return;
    }
    const at = ui.cursor;
    if (!at) return;
    if (ui.fog.shape === "rect") {
      if (!ui.rectStart) {
        ui.rectStart = at;
        table.message(
          ctx.t(
            "Primo angolo fissato: sposta il mirino e premi Invio.",
            "First corner set: move the cursor and press Enter.",
          ),
        );
        return;
      }
      const start = ui.rectStart;
      ui.rectStart = null;
      ui.cursor = null;
      commitFog(ctx, table, { op: ui.fog.op, shape: "rect", points: [start, at] });
      return;
    }
    ui.cursor = null;
    commitFog(ctx, table, {
      op: ui.fog.op,
      shape: "brush",
      brush: ui.fog.brush,
      size: ui.fog.size,
      points: [at],
    });
  },
};

// ------------------------------------------------------------------------------ barriers

function setBarrier(ctx, sceneId, type, side, meters) {
  if (!ui.wall) return false;
  const label = ctx.label(D.BARRIER_TYPES.find(([id]) => id === type)?.[1] ?? L(type, type));
  return run(ctx, `${ctx.t("Tipo di barriera", "Barrier type")}: ${label}`, (s) =>
    D.setBarrierType(s, ctx.role, sceneId, ui.wall, type, side, meters),
  );
}
function nearestWall(scene, p, max) {
  let best = null,
    bestD = max;
  for (const wall of scene.walls ?? []) {
    if (wall.kind === "door") continue;
    const dx = wall.b.x - wall.a.x,
      dy = wall.b.y - wall.a.y;
    const length = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - wall.a.x) * dx + (p.y - wall.a.y) * dy) / length));
    const d = Math.hypot(p.x - (wall.a.x + t * dx), p.y - (wall.a.y + t * dy));
    if (d < bestD) {
      bestD = d;
      best = wall;
    }
  }
  return best;
}
export const barrierTool = {
  id: BARRIER_TOOL,
  label: L("Barriere", "Barriers"),
  icon: "wall",
  group: "fog",
  roles: ["dm"],
  order: 30,
  activate(ctx, table) {
    table.message(
      ctx.t(
        "Barriere: clic su un muro per sceglierne il tipo (finestra, unidirezionale, illusoria, invisibile). [ e ] passano da una barriera all’altra.",
        "Barriers: click a wall to choose its type (window, one-way, illusory, invisible). [ and ] move between barriers.",
      ),
    );
  },
  deactivate() {},
  onPointerDown(ctx, e, table) {
    if (e.button !== 0) return;
    e.preventDefault?.();
    const p = table.point(e);
    const scale = table.view?.zoom ? 1 / table.view.zoom : 1;
    const hit = e.target.closest?.("[data-fv-wall]")?.dataset.fvWall;
    const wall = hit
      ? table.scene.walls.find((w) => w.id === hit)
      : nearestWall(table.scene, p, 14 * scale);
    ui.wall = wall && wall.kind !== "door" ? wall.id : null;
    ctx.render();
  },
  onClick() {},
  onKeyDown(ctx, e, table) {
    if (e.key === "[" || e.key === "]") {
      e.preventDefault();
      hudAction(ctx, table, e.key === "]" ? "wall-next" : "wall-prev");
    }
  },
};

// ------------------------------------------------------------------------------ teleport

function teleport(ctx, table, actorId, point) {
  const cfg = D.sceneConfig(ctx.state, table.scene.id);
  const ok = run(ctx, `${ctx.t("Teletrasporto", "Teleport")}: ${name(ctx, actorId)}`, (s) =>
    D.teleportToken(s, ctx.role, table.scene.id, actorId, point),
  );
  if (ok) {
    ui.teleport = null;
    table.message(
      cfg.vision
        ? cfg.updateOnDrop
          ? ctx.t(
              "Arrivato. La visione si aggiorna all’arrivo: il percorso resta nascosto.",
              "Arrived. Vision updates on drop: the path stays hidden.",
            )
          : ctx.t(
              "Arrivato. La visione rivela anche la linea percorsa.",
              "Arrived. Vision also reveals the line travelled.",
            )
        : ctx.t("Arrivato.", "Arrived."),
    );
  }
  return ok;
}
export const teleportTool = {
  id: TELEPORT_TOOL,
  label: L("Teletrasporta (DM)", "Teleport (DM)"),
  icon: "arrow",
  group: "dm",
  roles: ["dm"],
  order: 57,
  activate(ctx, table) {
    table.message(
      ctx.t(
        "Teletrasporta: clic sulla pedina, poi sul punto d’arrivo.",
        "Teleport: click the token, then its destination.",
      ),
    );
  },
  deactivate() {
    ui.teleport = null;
    ui.cursor = null;
  },
  onPointerDown(ctx, e, table) {
    if (e.button !== 0) return;
    e.preventDefault?.();
    const token = e.target.closest?.("[data-actor]")?.dataset.actor;
    if (token && (!ui.teleport || token !== ui.teleport)) {
      ui.teleport = token;
      table.select(token);
      return;
    }
    if (!ui.teleport) {
      table.message(ctx.t("Scegli prima una pedina.", "Choose a token first."));
      return;
    }
    teleport(ctx, table, ui.teleport, table.point(e));
  },
  onClick() {},
  onKeyDown(ctx, e, table) {
    const scene = table.scene;
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const actorId = ui.teleport ?? table.selectedActorId;
    const token = D.tokenOf(scene, actorId);
    if (arrows[e.key] && token) {
      e.preventDefault();
      ui.teleport = actorId;
      const base = ui.cursor ?? { x: token.x, y: token.y };
      ui.cursor = {
        x: Math.max(0, Math.min(scene.width, base.x + arrows[e.key][0] * scene.gridSize)),
        y: Math.max(0, Math.min(scene.height, base.y + arrows[e.key][1] * scene.gridSize)),
      };
      live(
        `<line class="fv-draft-line" x1="${f1(token.x)}" y1="${f1(token.y)}" x2="${f1(ui.cursor.x)}" y2="${f1(ui.cursor.y)}"/><circle class="fv-teleport-pick" cx="${f1(ui.cursor.x)}" cy="${f1(ui.cursor.y)}" r="24"/>`,
      );
      table.message(
        ctx.t("Invio teletrasporta qui, Esc annulla.", "Enter teleports here, Escape cancels."),
      );
      return;
    }
    if (e.key === "Enter" && ui.cursor && ui.teleport) {
      e.preventDefault();
      const to = ui.cursor;
      ui.cursor = null;
      teleport(ctx, table, ui.teleport, to);
    }
  },
};

for (const tool of [fogTool, barrierTool, teleportTool])
  tool.onKeyDown = keepMapFocus(tool.onKeyDown);

// ------------------------------------------------------------------------------ panel

function toggleRow(ctx, { attr, text, on, hint = "" }) {
  return `<label class="fv-switch"><input type="checkbox" ${attr}${on ? " checked" : ""}><span><strong>${ctx.esc(text)}</strong>${hint ? `<small>${ctx.esc(hint)}</small>` : ""}</span></label>`;
}
function sensesText(ctx, senses) {
  const parts = [];
  if (senses.darkvision)
    parts.push(
      `${ctx.t("Scurovisione", "Darkvision")} ${senses.darkvision} m (${senses.origin === "sheet" ? ctx.t("dalla scheda", "from the sheet") : ctx.t("impostazione della pedina", "token setting")})`,
    );
  if (senses.blindsight) parts.push(`${ctx.t("Vista cieca", "Blindsight")} ${senses.blindsight} m`);
  if (senses.truesight) parts.push(`${ctx.t("Vista pura", "Truesight")} ${senses.truesight} m`);
  if (senses.blinded) parts.push(ctx.t("Accecato: non vede", "Blinded: cannot see"));
  if (!parts.length)
    parts.push(ctx.t("Vista normale, senza scurovisione", "Normal sight, no darkvision"));
  return parts.join(" · ");
}
function characterRows(ctx, m, ids) {
  return ids
    .map((id) => {
      const viewer = D.buildViewer(ctx.state, m.scene, id);
      if (!viewer) return "";
      const here = D.lightLevelAt(m.lit, viewer.at);
      const self = D.canSee(viewer, m.lit, viewer.at);
      const carried = D.carriedLight(ctx.state, m.scene.id, id);
      const levelText = here.magical
        ? ctx.t("nell’oscurità magica", "in magical darkness")
        : `${levelName(ctx, here.level).toLowerCase()}${self.visible && self.perceived !== here.level && self.perceived !== "blindsight" ? ` (${self.perceived === "grey" ? ctx.t("vista in grigio con la scurovisione", "seen in grey by darkvision") : ctx.t("vista come intensa con la scurovisione", "seen as bright by darkvision")})` : ""}`;
      return `<li class="fv-char" data-fv-char="${ctx.esc(id)}"><strong>${ctx.esc(name(ctx, id))}</strong><span>${ctx.t("Dove si trova", "Where it stands")}: ${ctx.esc(levelText)}</span><span>${ctx.esc(sensesText(ctx, viewer.senses))}</span>${carried ? `<span>${ctx.esc(lightLabel(ctx, carried))}: ${carried.on === false ? ctx.t("spenta", "out") : ctx.t("accesa", "lit")} <button type="button" class="fv-btn fv-mini" data-fv-carried="${ctx.esc(carried.id)}">${carried.on === false ? ctx.t("Accendi", "Light it") : ctx.t("Spegni", "Put out")}</button></span>` : ""}</li>`;
    })
    .join("");
}
export function panel(ctx, tv) {
  const m = model(ctx, tv.scene);
  if (!m) return `<p class="muted">${ctx.t("Nessuna scena.", "No scene.")}</p>`;
  const { cfg, scene } = m;
  const sharedMemory = setting(ctx, SETTINGS + ".shared-memory") === true;
  const sharedVision = setting(ctx, SETTINGS + ".shared-vision") === true;
  const status = `<p class="fv-status" role="status" data-fv-status>${ctx.esc(scene.name)} · ${cfg.vision ? ctx.t("visione dinamica attiva", "dynamic vision on") : ctx.t("visione dinamica spenta", "dynamic vision off")} · ${ctx.esc(phaseName(ctx, D.effectivePhase(ctx.state, scene.id)))} · ${ctx.t("nebbia", "fog")}: ${cfg.fog.length ? `${cfg.fog.length} ${ctx.t("aree", "areas")}` : ctx.t("nessuna", "none")}</p>`;
  const onTopRow = toggleRow(ctx, {
    attr: "data-fv-ontop",
    text: ctx.t("Le mie pedine sempre sopra l’oscurità", "My tokens always above the darkness"),
    on: onTop(ctx),
    hint: ctx.t("Solo per te, su questo profilo.", "Only for you, on this profile."),
  });
  const sharing = `<p class="fv-note">${ctx.t("Memoria dell’esplorato", "Explored memory")}: <strong>${sharedMemory ? ctx.t("condivisa dal gruppo", "shared by the party") : ctx.t("per giocatore", "per player")}</strong> · ${ctx.t("Visione", "Vision")}: <strong>${sharedVision ? ctx.t("condivisa dal gruppo", "shared by the party") : ctx.t("per giocatore", "per player")}</strong></p>`;
  if (!runsSession(ctx.state, ctx.role)) {
    const own = D.partyViewers(ctx.state, scene).filter((id) =>
      ctx.canControl(ctx.state.actors[id]),
    );
    return `<div class="fv-panel" data-fv-panel="player">${status}<section class="fv-section"><h3>${ctx.t("Cosa vedono i tuoi personaggi", "What your characters see")}</h3>${cfg.vision ? `<ul class="fv-chars">${characterRows(ctx, m, own) || `<li class="muted">${ctx.t("Nessun tuo personaggio con visione in questa scena.", "None of your characters has vision in this scene.")}</li>`}</ul>` : `<p class="muted">${ctx.t("Il DM non usa la visione dinamica in questa scena: vedi tutto ciò che non è coperto dalla nebbia.", "The DM does not use dynamic vision in this scene: you see everything the fog does not cover.")}</p>`}${sharing}</section><section class="fv-section">${onTopRow}</section><p class="fv-source">${ctx.esc(D.sourcePages(D.SOURCES.visionAndLight, ctx.lang))} · ${ctx.t("Scurovisione", "Darkvision")} ${ctx.esc(D.sourcePages(D.SOURCES.darkvision, ctx.lang))}</p></div>`;
  }
  const shownPhase = D.effectivePhase(ctx.state, scene.id);
  const hour = D.narrativeHour(ctx.state);
  const clock = `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.floor((hour % 1) * 60)).padStart(2, "0")}`;
  const phases = `${D.PHASES.map(
    ([id, , label]) =>
      `<button type="button" class="fv-btn" data-fv-phase="${id}" aria-pressed="${shownPhase === id}">${ctx.esc(ctx.label(label))}</button>`,
  ).join("")}</div>${toggleRow(ctx, {
    attr: "data-fv-follow-time",
    text: ctx.t("Segue il tempo narrativo", "Follows narrative time"),
    on: cfg.followTime === true,
    hint: ctx.t(
      `Ora di gioco ${clock} → ${phaseName(ctx, D.phaseAtHour(hour))}. Quando fai avanzare il tempo (Tempo › Avanza di… › Applica) la scena passa da sola a crepuscolo, notte e alba.`,
      `Game time ${clock} → ${phaseName(ctx, D.phaseAtHour(hour))}. When you advance time (Time › Advance by… › Apply) the scene moves to dusk, night and dawn by itself.`,
    ),
  })}<div class="fv-ambient-row"><label class="fv-field">${ctx.t("Colore della notte", "Night colour")}<select data-fv-ambient-set="ambientTint">${D.AMBIENT_TINTS.map(([hex, label]) => `<option value="${hex}"${hex === (cfg.ambientTint || "#050912") ? " selected" : ""}>${ctx.esc(ctx.label(label))}</option>`).join("")}</select></label><label class="fv-field">${ctx.t("Intensità del buio", "Darkness intensity")}<select data-fv-ambient-set="ambientIntensity">${D.AMBIENT_INTENSITIES.map((v) => `<option value="${v}"${v === (Number(cfg.ambientIntensity) || 100) ? " selected" : ""}>${v}%</option>`).join("")}</select></label>`;
  const vision = D.visionTokens(ctx.state, scene);
  const memoryRows = D.partyViewers(ctx.state, scene)
    .map((id) => {
      const share = D.exploredShare(ctx.state, scene.id, id);
      return `<li class="fv-memory" data-fv-memory-row="${ctx.esc(id)}"><strong>${ctx.esc(name(ctx, id))}</strong><span class="fv-meter" role="img" aria-label="${ctx.t("Esplorato", "Explored")} ${Math.round(share * 100)}%"><span style="width:${Math.round(share * 100)}%"></span></span><span>${Math.round(share * 100)}%</span><button type="button" class="fv-btn fv-mini" data-fv-memory-edit="${ctx.esc(id)}">${ctx.t("Modifica", "Edit")}</button><button type="button" class="fv-btn fv-mini" data-fv-memory-reset="${ctx.esc(id)}">${ctx.t("Azzera", "Reset")}</button></li>`;
    })
    .join("");
  return `<div class="fv-panel" data-fv-panel="dm">${status}
  <section class="fv-section"><h3>${ctx.t("Nebbia", "Fog")}</h3><div class="fv-actions"><button type="button" class="fv-btn" data-fv-panel-act="fog-tool">${ctx.icon("fog")} ${ctx.t("Strumento Nebbia", "Fog tool")}</button><button type="button" class="fv-btn" data-fv-panel-act="cover-all">${ctx.t("Copri tutto", "Cover all")}</button><button type="button" class="fv-btn" data-fv-panel-act="reveal-all">${ctx.t("Rivela tutto", "Reveal all")}</button><button type="button" class="fv-btn" data-fv-panel-act="preview" aria-pressed="${ui.preview}">${ctx.icon("eye")} ${ctx.t("Anteprima giocatori", "Player preview")}</button></div><p class="fv-note">${ctx.t("Tu vedi attraverso la nebbia (tratteggiata); i giocatori la vedono opaca.", "You see through the fog (hatched); players see it opaque.")}</p></section>
  <section class="fv-section"><h3>${ctx.t("Visione e luce", "Vision and light")}</h3>${toggleRow(ctx, { attr: 'data-fv-scene="vision"', text: ctx.t("Visione dinamica dai muri e dai sensi", "Dynamic vision from walls and senses"), on: cfg.vision, hint: ctx.t("Ogni giocatore vede ciò che vedono i suoi personaggi.", "Each player sees what their characters see.") })}<div class="fv-group-row" role="group" aria-label="${ctx.t("Momento del giorno", "Time of day")}">${phases}</div><div class="fv-actions"><button type="button" class="fv-btn" data-fv-panel-act="next-phase">${ctx.t("Passa al momento successivo", "Move to the next time of day")}</button><button type="button" class="fv-btn" data-fv-panel-act="lights-tool">${ctx.icon("light")} ${ctx.t("Strumento Luci", "Lights tool")}</button><button type="button" class="fv-btn" data-fv-panel-act="barrier-tool">${ctx.icon("wall")} ${ctx.t("Strumento Barriere", "Barriers tool")}</button></div>${toggleRow(ctx, { attr: 'data-fv-scene="updateOnDrop"', text: ctx.t("Aggiorna la visione solo all’arrivo", "Update vision only on drop"), on: cfg.updateOnDrop, hint: ctx.t("Un teletrasporto o uno spostamento non rivela il percorso.", "A teleport or a move does not reveal the path.") })}${toggleRow(ctx, { attr: 'data-fv-campaign="shared-memory"', text: ctx.t("Memoria dell’esplorato condivisa dal gruppo", "Explored memory shared by the party"), on: sharedMemory, hint: ctx.t("Opzione della campagna: utile per esagoni e mappe regionali.", "Campaign option: useful for hexes and regional maps.") })}${toggleRow(ctx, { attr: 'data-fv-campaign="shared-vision"', text: ctx.t("Visione condivisa dal gruppo", "Vision shared by the party"), on: sharedVision, hint: ctx.t("Ogni giocatore vede ciò che vede il gruppo.", "Each player sees what the party sees.") })}${onTopRow}</section>
  <section class="fv-section"><h3>${ctx.t("Vedi con la pedina", "See as the token")}</h3><p class="fv-note">${ctx.t("Controlla che cosa vede una pedina: la nebbia diventa opaca come per il giocatore (Maiusc+V con la pedina selezionata).", "Check what a token sees: the fog becomes opaque as for the player (Shift+V with the token selected).")}</p><div class="fv-actions">${vision.map((id) => `<button type="button" class="fv-btn" data-fv-view-as="${ctx.esc(id)}" aria-pressed="${ui.viewAs === id}">${ctx.t("Vedi come", "See as")} ${ctx.esc(name(ctx, id))}</button>`).join("") || `<span class="muted">${ctx.t("Nessuna pedina con visione.", "No token with vision.")}</span>`}${ui.viewAs || ui.preview ? `<button type="button" class="fv-btn is-primary" data-fv-panel-act="exit-view">${ctx.t("Torna alla vista del DM", "Back to the DM view")}</button>` : ""}</div></section>
  ${diagnosticsSection(ctx, scene.id)}
  <section class="fv-section"><h3>${ctx.t("Aree esplorate", "Explored areas")}</h3>${cfg.vision ? `<ul class="fv-memories">${memoryRows || `<li class="muted">${ctx.t("Nessun personaggio del gruppo con visione.", "No party character with vision.")}</li>`}</ul><div class="fv-actions"><button type="button" class="fv-btn" data-fv-panel-act="memory-reset-all">${ctx.t("Azzera tutte le aree esplorate", "Reset all explored areas")}</button></div>` : `<p class="muted">${ctx.t("Attiva la visione dinamica per ricordare le aree esplorate.", "Turn on dynamic vision to remember explored areas.")}</p>`}</section>
  <section class="fv-section"><h3>${ctx.t("Sensi delle pedine", "Token senses")}</h3><ul class="fv-chars">${(
    scene.tokens ?? []
  )
    .map((t) => {
      const senses = D.resolveSenses(ctx.state, t.actorId);
      return `<li class="fv-char"><strong>${ctx.esc(name(ctx, t.actorId))}</strong><span>${senses.enabled ? ctx.esc(sensesText(ctx, senses)) : ctx.t("Senza visione propria", "No vision of its own")}</span><button type="button" class="fv-btn fv-mini" data-fv-senses="${ctx.esc(t.actorId)}">${ctx.t("Visione e luce…", "Vision and light…")}</button></li>`;
    })
    .join("")}</ul></section>
  <p class="fv-source">${ctx.esc(D.sourcePages(D.SOURCES.visionAndLight, ctx.lang))} · ${ctx.t("Torcia", "Torch")} ${ctx.esc(D.sourcePages(D.SOURCES.torch, ctx.lang))} · ${ctx.t("Oscurità", "Darkness")} ${ctx.esc(D.sourcePages(D.SOURCES.darkness, ctx.lang))}</p></div>`;
}
export function bindPanel(el, ctx, table) {
  const sceneId = table?.scene?.id ?? ctx.state.activeSceneId;
  bindDiagnostics(el, ctx, table);
  el.querySelector("[data-fv-ontop]")?.addEventListener("change", (e) => {
    try {
      registryRef.setSetting(ctx, VIEW_SETTINGS + ".controlled-on-top", e.target.checked);
    } catch (error) {
      ctx.toast(errorText(ctx, error), true);
    }
  });
  el.querySelectorAll("[data-fv-scene]").forEach((input) =>
    input.addEventListener("change", () => {
      const key = input.dataset.fvScene;
      const on = input.checked;
      run(
        ctx,
        key === "vision"
          ? on
            ? ctx.t("Visione dinamica attivata", "Dynamic vision turned on")
            : ctx.t("Visione dinamica spenta", "Dynamic vision turned off")
          : on
            ? ctx.t("Visione aggiornata solo all’arrivo", "Vision updated only on drop")
            : ctx.t(
                "Visione aggiornata anche lungo il percorso",
                "Vision updated along the path too",
              ),
        (s) => D.setSceneOptions(s, ctx.role, sceneId, { [key]: on }),
      );
    }),
  );
  el.querySelectorAll("[data-fv-campaign]").forEach((input) =>
    input.addEventListener("change", () => {
      try {
        registryRef.setSetting(ctx, SETTINGS + "." + input.dataset.fvCampaign, input.checked);
      } catch (error) {
        ctx.toast(errorText(ctx, error), true);
        ctx.render();
      }
    }),
  );
  el.querySelectorAll("[data-fv-phase]").forEach((b) =>
    b.addEventListener("click", () =>
      run(
        ctx,
        `${ctx.t("Momento del giorno", "Time of day")}: ${phaseName(ctx, b.dataset.fvPhase)}`,
        // A chosen time of day takes the scene off the clock.
        (s) =>
          D.setSceneOptions(s, ctx.role, sceneId, { followTime: false, phase: b.dataset.fvPhase }),
      ),
    ),
  );
  el.querySelector("[data-fv-follow-time]")?.addEventListener("change", (event) =>
    run(
      ctx,
      event.target.checked
        ? ctx.t("La scena segue il tempo narrativo", "The scene follows narrative time")
        : ctx.t(
            "La scena non segue più il tempo narrativo",
            "The scene no longer follows narrative time",
          ),
      (s) => D.setSceneOptions(s, ctx.role, sceneId, { followTime: event.target.checked }),
    ),
  );
  el.querySelectorAll("[data-fv-ambient-set]").forEach((select) =>
    select.addEventListener("change", () =>
      run(ctx, ctx.t("Luce ambientale della scena", "Scene ambient light"), (s) =>
        D.setSceneOptions(s, ctx.role, sceneId, { [select.dataset.fvAmbientSet]: select.value }),
      ),
    ),
  );
  el.querySelectorAll("[data-fv-view-as]").forEach((b) =>
    b.addEventListener("click", () => {
      ui.viewAs = ui.viewAs === b.dataset.fvViewAs ? null : b.dataset.fvViewAs;
      ui.preview = false;
      ctx.render();
    }),
  );
  el.querySelectorAll("[data-fv-carried]").forEach((b) =>
    b.addEventListener("click", () => toggleLightById(ctx, sceneId, b.dataset.fvCarried)),
  );
  el.querySelectorAll("[data-fv-senses]").forEach((b) =>
    b.addEventListener("click", () => openVisionDialog(ctx, b.dataset.fvSenses, sceneId)),
  );
  el.querySelectorAll("[data-fv-memory-reset]").forEach((b) =>
    b.addEventListener("click", () =>
      run(
        ctx,
        `${ctx.t("Aree esplorate azzerate", "Explored areas reset")}: ${name(ctx, b.dataset.fvMemoryReset)}`,
        (s) => D.resetMemory(s, ctx.role, sceneId, b.dataset.fvMemoryReset),
      ),
    ),
  );
  el.querySelectorAll("[data-fv-memory-edit]").forEach((b) =>
    b.addEventListener("click", () => {
      ui.fog = { ...ui.fog, target: "memory:" + b.dataset.fvMemoryEdit, op: "reveal" };
      table?.setMode?.(FOG_TOOL);
    }),
  );
  const acts = {
    "fog-tool": () => {
      ui.fog = { ...ui.fog, target: "scene" };
      table?.setMode?.(FOG_TOOL);
    },
    "lights-tool": () => table?.setMode?.(LIGHTS_TOOL),
    "barrier-tool": () => table?.setMode?.(BARRIER_TOOL),
    "cover-all": () =>
      commitFog(ctx, { scene: D.sceneOf(ctx.state, sceneId) }, { op: "cover", shape: "all" }),
    "reveal-all": () =>
      commitFog(ctx, { scene: D.sceneOf(ctx.state, sceneId) }, { op: "reveal", shape: "all" }),
    preview: () => {
      ui.preview = !ui.preview;
      ui.viewAs = null;
      ctx.render();
    },
    "exit-view": () => {
      ui.preview = false;
      ui.viewAs = null;
      ctx.render();
    },
    "next-phase": () => {
      const next =
        D.PHASES[
          (D.PHASES.findIndex(([id]) => id === D.effectivePhase(ctx.state, sceneId)) + 1) %
            D.PHASES.length
        ];
      run(ctx, `${ctx.t("Momento del giorno", "Time of day")}: ${ctx.label(next[2])}`, (s) =>
        D.advancePhase(s, ctx.role, sceneId),
      );
    },
    "memory-reset-all": () =>
      ctx.dialog(
        ctx.t("Azzera tutte le aree esplorate", "Reset all explored areas"),
        `<p>${ctx.t("Ogni personaggio dimentica le aree esplorate di questa scena; restano visibili solo quelle che vede ora. «Annulla ultima modifica» le ripristina.", "Every character forgets the explored areas of this scene; only what it sees now stays visible. “Undo last change” restores them.")}</p>`,
        {
          submitLabel: ctx.t("Azzera", "Reset"),
          onSubmit: () => {
            run(
              ctx,
              ctx.t("Aree esplorate azzerate per tutti", "Explored areas reset for everyone"),
              (s) => D.resetMemory(s, ctx.role, sceneId, null),
            );
          },
        },
      ),
  };
  el.querySelectorAll("[data-fv-panel-act]").forEach((b) => {
    const act = acts[b.dataset.fvPanelAct];
    if (act) b.addEventListener("click", act);
  });
}

// ------------------------------------------------------------------------------ dialogs

const CARRIABLE = ["torch", "lamp", "hooded-lantern", "bullseye-lantern"];
export function openVisionDialog(ctx, actorId, sceneId = ctx.state.activeSceneId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const senses = D.resolveSenses(ctx.state, actorId);
  const carried = D.carriedLight(ctx.state, sceneId, actorId);
  const controls = ctx.canControl(actor);
  const sheet = senses.sheetDarkvision
    ? ctx.t(
        `La scheda dà scurovisione ${senses.sheetDarkvision} m (specie). `,
        `The sheet gives darkvision ${senses.sheetDarkvision} m (species). `,
      )
    : ctx.t("La scheda non indica scurovisione. ", "The sheet lists no darkvision. ");
  if (!runsSession(ctx.state, ctx.role)) {
    // A player reads the senses and lights or puts out a light their character carries.
    ctx.dialog(
      `${ctx.t("Visione e luce", "Vision and light")} · ${actor.name}`,
      `<p>${ctx.esc(sensesText(ctx, senses))}</p><p class="muted">${ctx.esc(sheet)}${ctx.t("Solo il DM modifica i sensi della pedina.", "Only the DM changes the token’s senses.")}</p>${carried ? `<p>${ctx.esc(lightLabel(ctx, carried))}: <strong>${carried.on === false ? ctx.t("spenta", "out") : ctx.t("accesa", "lit")}</strong></p>` : ""}`,
      {
        submitLabel:
          carried && controls
            ? carried.on === false
              ? ctx.t("Accendi", "Light it")
              : ctx.t("Spegni", "Put it out")
            : undefined,
        cancelLabel: ctx.t("Chiudi", "Close"),
        onSubmit: () => {
          toggleLightById(ctx, sceneId, carried.id);
        },
      },
    );
    return;
  }
  const setting = D.sliceOf(ctx.state)?.tokens?.[actorId] ?? {};
  const value = (key) => (setting[key] !== undefined ? setting[key] : "");
  ctx.dialog(
    `${ctx.t("Visione e luce", "Vision and light")} · ${actor.name}`,
    `<p class="muted">${ctx.esc(sheet)}${ctx.t("Un valore scritto qui prevale sulla scheda (impostazione della pedina).", "A value written here takes precedence over the sheet (token setting).")}</p>
    <label class="prep-check"><input type="checkbox" name="vision"${senses.enabled ? " checked" : ""}> ${ctx.t("Questa pedina ha una visione propria", "This token has its own vision")}</label>
    <div class="form-grid"><label class="field">${ctx.t("Scurovisione (m)", "Darkvision (m)")}<input name="darkvision" type="number" inputmode="decimal" min="0" max="300" step="1.5" value="${ctx.esc(value("darkvision"))}" placeholder="${senses.sheetDarkvision || 0}"></label><label class="field">${ctx.t("Vista cieca (m)", "Blindsight (m)")}<input name="blindsight" type="number" inputmode="decimal" min="0" max="300" step="1.5" value="${ctx.esc(value("blindsight"))}" placeholder="0"></label><label class="field">${ctx.t("Vista pura (m)", "Truesight (m)")}<input name="truesight" type="number" inputmode="decimal" min="0" max="300" step="1.5" value="${ctx.esc(value("truesight"))}" placeholder="0"></label></div>
    <label class="prep-check"><input type="checkbox" name="useSheet"> ${ctx.t("Usa solo i sensi della scheda", "Use only the sheet’s senses")}</label>
    <label class="field">${ctx.t("Luce portata", "Carried light")}<select name="carried"><option value="">${ctx.t("Nessuna", "None")}</option>${CARRIABLE.map((preset) => `<option value="${preset}"${carried?.preset === preset ? " selected" : ""}>${ctx.esc(ctx.label(D.LIGHT_PRESETS[preset].name))} · ${D.LIGHT_PRESETS[preset].bright} + ${D.LIGHT_PRESETS[preset].dim} m</option>`).join("")}</select></label>
    <p class="fv-source">${ctx.esc(D.sourcePages(D.SOURCES.darkvision, ctx.lang))} · ${ctx.t("Luci", "Lights")} ${ctx.esc(D.sourcePages(D.SOURCES.torch, ctx.lang))}, ${ctx.esc(D.sourcePages(D.SOURCES.lanterns, ctx.lang))}</p>`,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (data) => {
        const num = (key) => {
          const raw = String(data.get(key) ?? "")
            .trim()
            .replace(",", ".");
          return raw === "" ? null : Number(raw);
        };
        const preset = String(data.get("carried") ?? "");
        const ok = run(
          ctx,
          `${ctx.t("Visione e luce", "Vision and light")}: ${actor.name}`,
          (s) => {
            D.setTokenVision(s, ctx.role, actorId, {
              vision: data.has("vision"),
              darkvision: num("darkvision"),
              blindsight: num("blindsight"),
              truesight: num("truesight"),
              useSheet: data.has("useSheet"),
            });
            if ((carried?.preset ?? "") !== preset)
              D.setCarriedLight(s, ctx.role, sceneId, actorId, preset || null);
          },
        );
        return ok ? undefined : false;
      },
    },
  );
}

// ------------------------------------------------------------------------------ exploration

/** After every accepted change: what the party sees now joins its explored memory. */
export function followUp(ctx) {
  if (ui.recording || !ctx?.state || !D.sliceOf(ctx.state)) return false;
  const state = ctx.state;
  const sceneId = state.activeSceneId;
  if (!D.sceneConfig(state, sceneId).vision) return false;
  const slice = D.sliceOf(state);
  // Dry run on copies of the memory only: nothing is committed when nothing changes.
  const shadow = {
    ...state,
    ext: {
      ...state.ext,
      [ID]: {
        ...slice,
        memory: structuredClone(slice.memory),
        positions: structuredClone(slice.positions),
      },
    },
  };
  const result = D.recordExploration(shadow, sceneId);
  if (!result.changed) return false;
  const memory = shadow.ext[ID].memory[sceneId];
  const positions = shadow.ext[ID].positions[sceneId];
  ui.recording = true;
  try {
    ctx.commit(
      ctx.t("Aree esplorate aggiornate", "Explored areas updated"),
      (draft) => {
        const target = D.sliceOf(draft);
        target.memory[sceneId] = memory;
        target.positions[sceneId] = positions;
      },
      { undoable: false, visibility: "private" },
    );
    return true;
  } catch {
    // Offline or refused: the next accepted change records the exploration.
    return false;
  } finally {
    ui.recording = false;
  }
}

// ------------------------------------------------------------------------------ register

export function seed(state) {
  const slice = D.seedSlice();
  if (state?.scenes && !state.scenes.some((scene) => scene.id === D.TOWER_SCENE_ID))
    state.scenes.push(towerScene(D.TOWER_SCENE_ID));
  const light = (id, preset, x, y, on, name) => ({
    id,
    preset,
    name,
    x,
    y,
    bright: D.LIGHT_PRESETS[preset].bright,
    dim: D.LIGHT_PRESETS[preset].dim,
    color: D.LIGHT_PRESETS[preset].color,
    rotation: 0,
    on,
    attachedTo: null,
    magical: false,
    cone: false,
  });
  slice.scenes[D.TOWER_SCENE_ID] = {
    fog: [],
    vision: true,
    phase: "night",
    ambient: "dark",
    updateOnDrop: false,
    lights: [
      light("tower-torch", "torch", 320, 85, true, "Torcia a muro"),
      light("tower-store-lantern", "hooded-lantern", 850, 100, false, "Lanterna del magazzino"),
      light("tower-stair-torch", "torch", 860, 570, true, "Torcia della scala"),
    ],
  };
  return slice;
}
export function register(registry) {
  // C3 (CA-57): the DM's fog, light, barrier and teleport tools follow the session's
  // authority, so the runner of a hand-off gets them.
  const add = (point, def) => registry.add(point, sessionGated(def));
  registryRef = registry;
  registry.registerStateSlice(ID, {
    version: D.VERSION,
    seed,
    normalize: D.normalizeSlice,
  });
  registry.registerStyles(new URL("./fog-vision.css", import.meta.url));
  add("table-tool", fogTool);
  add("table-tool", lightsTool);
  add("table-tool", barrierTool);
  add("table-tool", teleportTool);
  add("map-layer", {
    id: "fog-vision-lighting",
    label: L("Luci e oscurità", "Lights and darkness"),
    order: 30,
    when: (ctx, tv) => Boolean(tv?.scene),
    svg: lightingLayer,
    bind: bindLightingLayer,
  });
  add("map-layer", {
    id: "fog-vision-fog",
    label: L("Nebbia e visione", "Fog and vision"),
    // Above the token decorations of other areas (health words 64, marks 65, bubbles 66,
    // loot 67), so nothing of an unseen creature shows through; below pings (70) and HUDs.
    order: 68,
    when: (ctx, tv) => Boolean(tv?.scene),
    svg: fogLayer,
  });
  add("map-layer", {
    id: "fog-vision-top",
    label: L("Strumenti di nebbia e luci", "Fog and light tools"),
    order: 69,
    interactive: true,
    when: (ctx, tv) => Boolean(tv?.scene),
    svg: topLayer,
    bind: bindTopLayer,
  });
  add("map-layer", {
    id: "fog-vision-hud",
    label: L("Opzioni degli strumenti di nebbia e luci", "Fog and light tool options"),
    // Above every other map layer (doors 70, pings, area marks up to 95).
    order: 99,
    interactive: true,
    when: (ctx, tv) => Boolean(tv?.scene),
    svg: hudLayer,
    bind: bindHudLayer,
  });
  add("table-panel", {
    id: "fog-vision-panel",
    section: "scene",
    label: L("Visione", "Vision"),
    placement: "sidebar-tab",
    icon: "eye",
    order: 82,
    when: (ctx, tv) => Boolean(tv?.scene),
    render: panel,
    bind: bindPanel,
  });
  add("token-menu", {
    id: "fog-vision-senses",
    submenu: "visibility",
    label: L("Visione e luce…", "Vision and light…"),
    icon: "eye",
    group: "fog-vision",
    when: (ctx, target) =>
      Boolean(ctx.state.actors?.[target?.actorId]) &&
      (runsSession(ctx.state, ctx.role) || ctx.canControl(ctx.state.actors[target.actorId])),
    run: (ctx, target) =>
      openVisionDialog(ctx, target.actorId, target.sceneId ?? ctx.state.activeSceneId),
  });
  add("token-menu", {
    id: "fog-vision-view-as",
    submenu: "visibility",
    label: L("Vedi con questa pedina", "See as this token"),
    icon: "eye",
    group: "fog-vision",
    roles: ["dm"],
    when: (ctx, target) =>
      Boolean(target?.actorId) && D.resolveSenses(ctx.state, target.actorId).enabled,
    run: (ctx, target) => {
      ui.viewAs = ui.viewAs === target.actorId ? null : target.actorId;
      ui.preview = false;
      ctx.render();
    },
  });
  add("command", {
    id: "fog-vision.view-as",
    label: L(
      "Vedi con la pedina selezionata (verifica della visione)",
      "See as the selected token (vision check)",
    ),
    shortcut: "Shift+V",
    context: "table",
    roles: ["dm"],
    group: "fog-vision",
    run: (ctx) => {
      const selected = ui.table?.selectedActorId;
      ui.viewAs = ui.viewAs
        ? null
        : selected && D.resolveSenses(ctx.state, selected).enabled
          ? selected
          : null;
      ui.preview = false;
      if (!ui.viewAs && selected && !D.resolveSenses(ctx.state, selected).enabled)
        ctx.toast(
          ctx.t(
            "Questa pedina non ha una visione propria.",
            "This token has no vision of its own.",
          ),
        );
      ctx.render();
    },
  });
  // D&D Beyond Maps opens its Fog tool with F (DDB-121), like the Table's R, X, O and V keys.
  add("command", {
    id: "fog-vision.fog-tool",
    label: L("Strumento Nebbia", "Fog tool"),
    shortcut: "F",
    context: "table",
    roles: ["dm"],
    group: "fog-vision",
    run: () => {
      if (!ui.table?.setMode || ui.table.svg?.isConnected === false)
        throw Object.assign(Error("Open the Table."), {
          it: "Apri il Tavolo.",
          en: "Open the Table.",
        });
      ui.fog = { ...ui.fog, target: "scene" };
      ui.table.setMode(FOG_TOOL);
    },
  });
  add("command", {
    id: "fog-vision.preview",
    label: L("Anteprima giocatori (nebbia e visione)", "Player preview (fog and vision)"),
    context: "table",
    roles: ["dm"],
    group: "fog-vision",
    run: (ctx) => {
      ui.preview = !ui.preview;
      ui.viewAs = null;
      ctx.render();
    },
  });
  add("command", {
    id: "fog-vision.next-phase",
    label: L("Passa al momento del giorno successivo", "Move to the next time of day"),
    context: "table",
    roles: ["dm"],
    group: "fog-vision",
    run: (ctx) =>
      ctx.commit(ctx.t("Momento del giorno successivo", "Next time of day"), (s) =>
        D.advancePhase(s, ctx.role, s.activeSceneId),
      ),
  });
  add("settings", {
    id: SETTINGS,
    label: L("Nebbia e visione del gruppo", "Party fog and vision"),
    scope: "campaign",
    fields: [
      {
        id: "shared-memory",
        label: L(
          "Memoria dell’esplorato condivisa dal gruppo",
          "Explored memory shared by the party",
        ),
        type: "boolean",
        default: false,
      },
      {
        id: "shared-vision",
        label: L("Visione condivisa dal gruppo", "Vision shared by the party"),
        type: "boolean",
        default: false,
      },
    ],
  });
  add("settings", {
    id: VIEW_SETTINGS,
    label: L("Visione al Tavolo", "Vision at the Table"),
    scope: "personal",
    fields: [
      {
        id: "controlled-on-top",
        label: L("Le mie pedine sempre sopra l’oscurità", "My tokens always above the darkness"),
        type: "boolean",
        default: true,
      },
    ],
  });
  registry.on("commit", (payload, { ctx }) => followUp(ctx));
  registry.on("role-changed", () => resetFogVisionView());
  registry.on("reset", () => {
    resetFogVisionView();
    ui.ambient = {};
  });
  registry.on("scene-activated", () => {
    ui.polygon = [];
    ui.wall = null;
    ui.teleport = null;
    ui.viewAs = null;
    lighting.selected = null;
  });
}
