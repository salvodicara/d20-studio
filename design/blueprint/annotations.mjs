// B18 — Table: annotations, persistent templates, extended measuring and pings.
//
// Entry module (registry area "annotations"). Copied patterns, by census ID:
// - Foundry Drawings: the author owns a drawing, "Clear" removes only your own, the GM
//   hides a drawing (FVT-100); DDB Draw: 12 colours, 5 brush sizes, Clear All (DDB-122).
// - DDB Overlays (tool O): cone, circle, square, line; colour plus damage-type pattern;
//   live ruler in metres while dragging; far handle rotates and resizes from the origin;
//   per-overlay menu with visibility (hidden traps), colour, pattern, delete (DDB-123);
//   Shift+L locks (DDB-118).
// - Roll20 Measure: line/circle/cone/square with a broadcast switch (R20-136); segments
//   added by click, Backspace removes one, double-click or Enter confirms (VTL-134);
//   Owlbear Ranges rings with colour-blind themes that stay in place when the token moves
//   (VTL-136); Battle Board / Character Distances list with elevation (VTL-137).
// - Owlbear pointer (VTL-146) and Foundry pings in the user's colour, Alt for the red alert
//   ping, edge arrow for an off-screen ping (FVT-157); the GM's recentring arrives as a
//   proposal the recipient accepts (Pulpscape opt-in VTL-183; F-051 boundary: no forced view).
// - Owlbear Tooltips: Text tool on a token writes a note, hover previews it, an info icon
//   on the selected token, show to everyone briefly (VTL-106).
// - Auras and Emanations: add from the token's context menu (shortcut E), follow the token
//   (VTL-140); up to two auras per token, circle or square (Roll20 R20-133).
// - DDB tool memory: every tool remembers its last colour, shape, pattern and mode
//   (DDB-126), kept on this device.
//
// Shared data: state.ext.annotations (see annotations-domain.mjs). Signals are transient.

import * as D from "./annotations-domain.mjs";
import { formatNumber } from "./ui.mjs";

const ID = D.ID;
const L = (it, en) => ({ it, en });
const TOOL_SETTINGS = "annotations-tools";
const TABLE_SETTINGS = "annotations-table";
export const DRAW_TOOL = "annotations-draw";
export const TEMPLATE_TOOL = "annotations-template";
const OWN_TOOLS = ["measure", "pointer", DRAW_TOOL, TEMPLATE_TOOL];

let registryRef = null;
/** Broadcast of transient signals shared by both identities of this browser. */
export const bus = D.createSignalBus();
let hudObserver = null;

const freshUi = () => ({
  table: null, // latest bound Table services
  liveEl: null, // <g> for gestures in progress (updated without a render)
  gesture: null,
  measure: null, // private measurement {sceneId, shape, ..., frozen}
  rings: null, // private rings {sceneId, origin, radii, theme, actorId}
  cursor: null, // keyboard cursor in scene coordinates
  selectedTemplate: null,
  newHidden: false, // DM: next template hidden from players
  swatches: null, // which colour row is open: "draw" | "template" | "selected"
  tempRuler: null, // {sceneId, fromActorId, toActorId, until}
  tipOpen: null, // actorId whose tooltip bubble is pinned open
  hover: null, // actorId hovered or focused
  focusKey: null,
  lastClick: null,
});
const ui = freshUi();
export function resetAnnotationsView() {
  Object.assign(ui, freshUi());
  hudObserver?.disconnect();
  hudObserver = null;
}
/** Test seam: the private in-memory view state (read only). */
export const annotationsView = () => ui;
/** Test seam: a tool-bar or drawer action ("share", "tpl-lock"...), as its button runs it. */
export const annotationsAction = (ctx, table, action) => barAction(ctx, table, action);

// ---------------------------------------------------------------- settings and helpers

const setting = (ctx, key) => {
  try {
    return registryRef?.getSetting(ctx, key);
  } catch {
    return undefined;
  }
};
export const pref = (ctx, field) => setting(ctx, `${TOOL_SETTINGS}.${field}`);
function remember(ctx, field, value) {
  try {
    registryRef.setSetting(ctx, `${TOOL_SETTINGS}.${field}`, value);
  } catch (error) {
    ctx.toast(ctx.label(error?.it ? error : String(error?.message ?? error)), true);
  }
}
export const permissions = (ctx) => ({
  playersDraw: setting(ctx, `${TABLE_SETTINGS}.players-draw`) !== false,
  playersPointer: setting(ctx, `${TABLE_SETTINGS}.players-pointer`) !== false,
  playersTemplates: setting(ctx, `${TABLE_SETTINGS}.players-templates`) !== false,
});
const ringPresets = (ctx) => D.parseRingPresets(setting(ctx, `${TABLE_SETTINGS}.ring-presets`));
/** Ring presets written in the reader's language ("1,5; 9" / "1.5; 9"); both parse. */
const presetsText = (ctx, values) => values.map((n) => formatNumber(ctx.lang, n, 2)).join("; ");
/** "auto" follows the colour-vision preference (B22) when that area is loaded. */
export function ringTheme(ctx) {
  const chosen = pref(ctx, "ring-theme");
  if (chosen && chosen !== "auto") return chosen;
  const vision = setting(ctx, "preferences-access.color-vision");
  return Object.hasOwn(D.RING_THEMES, vision) ? vision : "standard";
}
const fmt = (ctx, value) => formatNumber(ctx.lang, value, 1);
const f1 = (value) => Math.round(value * 10) / 10;
const errorText = (ctx, error) => ctx.label(error?.it ? error : String(error?.message ?? error));

/** One shared or local commit; a refusal is shown, never thrown to the Table. */
function run(ctx, label, mutate, options = {}) {
  try {
    ctx.commit(label, (draft) => mutate(draft), options);
    return true;
  } catch (error) {
    const text = errorText(ctx, error);
    ctx.toast(text, true);
    try {
      ui.table?.message(text);
    } catch {
      /* the table may be gone */
    }
    return false;
  }
}
function identityName(state, id, lang) {
  if (id === "dm") return "DM";
  const actorId = D.actingAs(state, id);
  return actorId ? state.actors[actorId].name : lang === "en" ? "Player" : "Giocatore";
}
const acting = (ctx, table) => D.actingAs(ctx.state, ctx.role, table?.selectedActorId);
const actorName = (ctx, actorId) => ctx.state.actors?.[actorId]?.name ?? "?";

// Own icons for the tool bars (the core icon set has no pen, cone or rings).
const ICONS = {
  free: "M3 17c3-6 5-9 7-6s1 6 4 4 4-7 7-8",
  arrow: "M4 20 20 4M11 4h9v9",
  rect: "M4 6h16v12H4Z",
  ellipse: "M12 5c5 0 9 3 9 7s-4 7-9 7-9-3-9-7 4-7 9-7Z",
  text: "M5 5h14M12 5v14M9 19h6",
  erase: "M4 16 13 7l6 6-7 7H7Zm5-5 6 6M12 20h8",
  line: "M4 18 20 6M4 18l2-2M20 6l-2 2",
  circle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 8v2",
  cone: "M3 12 20 4v16Z",
  square: "M5 5h14v14H5Z",
  rings:
    "M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19",
  ping: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16",
  alert: "M12 3 22 20H2Zm0 6v5m0 3v.5",
  recall: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  share:
    "M18 5a3 3 0 1 0 0 .1M6 12a3 3 0 1 0 0 .1M18 19a3 3 0 1 0 0 .1M8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  lock: "M6 11h12v10H6Z M8 11V7a4 4 0 0 1 8 0v4",
  unlock: "M6 11h12v10H6Z M8 11V7a4 4 0 0 1 7.5-2",
  hide: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.8 9.8 0 0 0 4.4-1",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  undo: "M4 10h10a7 7 0 0 1 0 14 M4 10l5-5M4 10l5 5",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  close: "m5 5 14 14M5 19 19 5",
  rename: "M4 20h4L19 9l-4-4L4 16Z",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v6M12 7.5v.5",
};
const svgIcon = (name) =>
  `<svg class="annotations-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name] ?? ICONS.info}"/></svg>`;

// ---------------------------------------------------------------- SVG rendering

const pts = (list) => list.map((p) => `${f1(p.x)},${f1(p.y)}`).join(" ");
function areaSvg(scene, area, attrs) {
  const g = D.areaGeometry(scene, area);
  return g.kind === "circle"
    ? `<circle cx="${f1(g.cx)}" cy="${f1(g.cy)}" r="${f1(g.r)}" ${attrs}/>`
    : `<polygon points="${pts(g.points)}" ${attrs}/>`;
}
/**
 * Where an area's label goes: clear of the origin, where a token usually stands (a circle
 * near its top edge, other shapes just past the far end).
 */
function labelAnchor(scene, area) {
  const g = D.areaGeometry(scene, area);
  if (g.kind === "circle") return { x: g.cx, y: g.cy - g.r + 16 };
  const dx = g.tip.x - g.origin.x,
    dy = g.tip.y - g.origin.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: g.tip.x + (dx / length) * 16, y: g.tip.y + (dy / length) * 16 + 4 };
}
const label = (x, y, text, cls = "annotations-label", extra = "") =>
  `<text class="${cls}" x="${f1(x)}" y="${f1(y)}" text-anchor="middle"${extra}>${text}</text>`;

// Damage-type patterns over the overlay colour (DDB-123), light ink over any colour.
function patternDefs() {
  const ink = 'stroke="#fff" stroke-opacity=".75" fill="none" stroke-width="1.6"';
  const dot = 'fill="#fff" fill-opacity=".7"';
  const P = (id, size, body) =>
    `<pattern id="annotations-pat-${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">${body}</pattern>`;
  return `<defs>${[
    P("acid", 20, `<circle cx="6" cy="7" r="3" ${ink}/><circle cx="14" cy="15" r="2" ${ink}/>`),
    P("bludgeoning", 16, `<circle cx="8" cy="8" r="3.2" ${dot}/>`),
    P("cold", 22, `<path d="M11 3v16M4 7l14 8M18 7 4 15" ${ink}/>`),
    P("fire", 24, `<path d="M5 22c-1-6 5-8 4-15 4 3 7 8 4 13 2-1 3-3 3-5 3 3 3 7 0 9" ${ink}/>`),
    P("force", 22, `<path d="M11 2l8 5v8l-8 5-8-5V7Z" ${ink}/>`),
    P("lightning", 24, `<path d="M4 3l6 8-4 1 9 9-3-7 5-1-7-9" ${ink}/>`),
    P("necrotic", 14, `<path d="M0 14 14 0M-2 2l4-4M12 16l4-4" ${ink}/>`),
    P("piercing", 18, `<path d="M4 14 9 4l5 10" ${ink}/>`),
    P(
      "poison",
      18,
      `<circle cx="5" cy="5" r="1.8" ${dot}/><circle cx="13" cy="11" r="1.8" ${dot}/><circle cx="6" cy="14" r="1.1" ${dot}/>`,
    ),
    P("psychic", 26, `<path d="M13 13a2 2 0 1 1 3 0 4 4 0 1 1-8 0 6 6 0 1 1 12 0" ${ink}/>`),
    P("radiant", 26, `<path d="M13 5v16M5 13h16M7.5 7.5l11 11M18.5 7.5l-11 11" ${ink}/>`),
    P("slashing", 16, `<path d="M2 14 14 2M-2 6l8-8M10 18l8-8" ${ink}/>`),
    P("thunder", 26, `<path d="M3 21a10 10 0 0 1 20 0M8 21a5 5 0 0 1 10 0" ${ink}/>`),
  ].join("")}</defs>`;
}
function templateSvg(ctx, scene, t, selected) {
  const hex = D.colourHex(t.color);
  const cls = [
    "annotations-template",
    t.hidden ? "is-hidden" : "",
    t.locked ? "is-locked" : "",
    selected ? "is-selected" : "",
  ].join(" ");
  const stroke = `stroke="${hex}" stroke-width="2.5" vector-effect="non-scaling-stroke"${t.hidden ? ' stroke-dasharray="8 5"' : ""}`;
  const base = areaSvg(scene, t, `fill="${hex}" fill-opacity=".3" ${stroke}`);
  const pattern =
    t.pattern !== "none"
      ? areaSvg(scene, t, `fill="url(#annotations-pat-${t.pattern})" stroke="none"`)
      : "";
  const c = labelAnchor(scene, t);
  const parts = [
    t.label ? ctx.esc(t.label) : "",
    `${ctx.esc(ctx.label(D.SHAPE_LABELS[t.shape]))} ${fmt(ctx, t.size)} m`,
    t.pattern !== "none" ? ctx.esc(ctx.label(D.damageLabel(t.pattern))) : "",
    t.hidden ? ctx.t("nascosta ai giocatori", "hidden from players") : "",
    t.locked ? ctx.t("bloccata", "locked") : "",
  ].filter(Boolean);
  const g = D.areaGeometry(scene, t);
  const handle =
    selected && t.canEdit && !t.locked
      ? `<circle class="annotations-handle" cx="${f1(g.tip.x)}" cy="${f1(g.tip.y)}" r="9"/>`
      : "";
  return `<g class="${cls}" data-annot-template="${ctx.esc(t.id)}">${base}${pattern}${label(c.x, c.y, parts.join(" · "))}${handle}</g>`;
}
function arrowHead(a, b, size) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const p = (d) => ({ x: b.x - size * Math.cos(angle + d), y: b.y - size * Math.sin(angle + d) });
  return pts([b, p(0.45), p(-0.45)]);
}
export function markSvg(ctx, mark) {
  const hex = D.colourHex(mark.color);
  const w = mark.width * 2;
  const stroke = `stroke="${hex}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const [a, b] = mark.points;
  let body = "";
  if (mark.kind === "free")
    body = `<path d="M${mark.points.map((p) => `${f1(p.x)} ${f1(p.y)}`).join(" L")}" ${stroke}/>`;
  else if (mark.kind === "arrow")
    body = `<line x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(b.x)}" y2="${f1(b.y)}" ${stroke}/><polygon points="${arrowHead(a, b, 12 + w * 2)}" fill="${hex}"/>`;
  else if (mark.kind === "rect")
    body = `<rect x="${f1(Math.min(a.x, b.x))}" y="${f1(Math.min(a.y, b.y))}" width="${f1(Math.abs(b.x - a.x))}" height="${f1(Math.abs(b.y - a.y))}" ${stroke}/>`;
  else if (mark.kind === "ellipse")
    body = `<ellipse cx="${f1((a.x + b.x) / 2)}" cy="${f1((a.y + b.y) / 2)}" rx="${f1(Math.abs(b.x - a.x) / 2)}" ry="${f1(Math.abs(b.y - a.y) / 2)}" ${stroke}/>`;
  else if (mark.kind === "text")
    body = `<text class="annotations-mark-text" x="${f1(a.x)}" y="${f1(a.y)}" fill="${hex}" font-size="${14 + mark.width * 3}">${ctx.esc(mark.text)}</text>`;
  const hidden = mark.hidden
    ? label(
        a.x,
        a.y - 14,
        ctx.t("nascosto ai giocatori", "hidden from players"),
        "annotations-label is-small",
      )
    : "";
  return `<g class="annotations-mark${mark.hidden ? " is-hidden" : ""}" data-annot-mark="${ctx.esc(mark.id)}">${body}${hidden}</g>`;
}
function auraSvg(ctx, aura) {
  const hex = D.colourHex(aura.color);
  const attrs = `fill="${hex}" fill-opacity="${aura.opacity}" stroke="${hex}" stroke-opacity=".85" stroke-width="2" vector-effect="non-scaling-stroke"`;
  const shape =
    aura.shape === "square"
      ? `<rect x="${f1(aura.x - aura.r)}" y="${f1(aura.y - aura.r)}" width="${f1(aura.r * 2)}" height="${f1(aura.r * 2)}" rx="6" ${attrs}/>`
      : `<circle cx="${f1(aura.x)}" cy="${f1(aura.y)}" r="${f1(aura.r)}" ${attrs}/>`;
  const text = `${aura.label ? ctx.esc(aura.label) + " · " : ""}${fmt(ctx, aura.radius)} m`;
  return `<g class="annotations-aura" data-annot-aura="${ctx.esc(aura.id)}">${shape}${label(aura.x, aura.y - aura.r + 15, text, "annotations-label is-small")}</g>`;
}
/**
 * P6 TV-36 (Owlbear's ruler label): under a finger the distance floats about 70 screen pixels
 * above the touch point, clear of the finger and of the token being measured to.
 */
export function fingerLift(table, event) {
  if (event?.pointerType !== "touch") return 0;
  const scale = table?.svg?.getScreenCTM?.()?.a || 1;
  return 70 / scale;
}
/** Under a finger the label is also drawn at a readable screen size (16 px). */
export function fingerTextScale(table, event) {
  if (event?.pointerType !== "touch") return 1;
  const scale = table?.svg?.getScreenCTM?.()?.a || 1;
  return Math.max(1, 16 / 13 / scale);
}
const liftedStyle = (k) =>
  k > 1 ? ` style="font-size:${f1(13 * k)}px;stroke-width:${f1(3.5 * k)}px"` : "";
function ringsSvg(ctx, scene, rings, owner = "") {
  // P6 TV-38 (Owlbear Ranges): rings follow the viewer's current colour theme, so changing it
  // recolours the rings already on the map too.
  const theme =
    D.RING_THEMES[ringTheme(ctx)] ?? D.RING_THEMES[rings.theme] ?? D.RING_THEMES.standard;
  const circles = rings.radii
    .map((radius, i) => {
      const r = D.mToPx(scene, radius);
      const colour = theme.colours[i % theme.colours.length];
      const dash = D.RING_DASHES[i % D.RING_DASHES.length];
      return `<circle cx="${f1(rings.origin.x)}" cy="${f1(rings.origin.y)}" r="${f1(r)}" fill="none" stroke="${colour}" stroke-width="2.5" vector-effect="non-scaling-stroke"${dash ? ` stroke-dasharray="${dash}"` : ""}/>${label(rings.origin.x, rings.origin.y - r - 4, `${fmt(ctx, radius)} m`, "annotations-label is-small", ` fill="${colour}"`)}`;
    })
    .join("");
  // Owlbear Ranges: the rings stay where they were placed; a moved token shows the distance.
  // Only for a token this viewer observes: a token the DM hides gives away neither its name
  // nor its position through shared rings.
  const token =
    rings.actorId &&
    D.observable(ctx.state, scene, rings.actorId, ctx.role) &&
    scene.tokens.find((entry) => entry.actorId === rings.actorId);
  const moved =
    token && Math.hypot(token.x - rings.origin.x, token.y - rings.origin.y) > 1
      ? `<line x1="${f1(rings.origin.x)}" y1="${f1(rings.origin.y)}" x2="${f1(token.x)}" y2="${f1(token.y)}" class="annotations-moved"/>${label((rings.origin.x + token.x) / 2, (rings.origin.y + token.y) / 2 - 6, `${ctx.esc(actorName(ctx, rings.actorId))}: ${ctx.t("spostata di", "moved")} ${fmt(ctx, D.distanceM(scene, rings.origin, token))} m`)}`
      : "";
  return `<g class="annotations-rings" data-annot-rings data-theme="${ctx.esc(ringTheme(ctx))}"><circle cx="${f1(rings.origin.x)}" cy="${f1(rings.origin.y)}" r="4" fill="#f4e4bf"/>${circles}${moved}${owner ? label(rings.origin.x, rings.origin.y + 20, owner, "annotations-label is-small") : ""}</g>`;
}
function measureSvg(
  ctx,
  scene,
  measure,
  { colour, owner = "", local = false, signal = false, extra = "", lift = 0, textScale = 1 } = {},
) {
  const cls = `annotations-measure${local ? " is-local" : ""}`;
  if (measure.shape === "rings") return ringsSvg(ctx, scene, measure, ctx.esc(owner));
  const key = signal ? "signal" : local ? "local" : ctx.esc(measure.id);
  const text = ctx.esc(
    (owner ? owner + ": " : "") + D.measureSummary(scene, measure, ctx.lang) + extra,
  );
  if (measure.shape === "line") {
    const end = measure.points.at(-1);
    return `<g class="${cls}" data-annot-measure="${key}"><polyline points="${pts(measure.points)}" fill="none" stroke="${colour}" stroke-width="3" stroke-dasharray="10 6" vector-effect="non-scaling-stroke"/>${measure.points.map((p) => `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="4" fill="${colour}"/>`).join("")}${label(end.x, end.y - 12 - lift, text, lift ? "annotations-label is-lifted" : "annotations-label", liftedStyle(textScale))}</g>`;
  }
  const c = labelAnchor(scene, measure);
  return `<g class="${cls}" data-annot-measure="${key}">${areaSvg(scene, measure, `fill="${colour}" fill-opacity=".14" stroke="${colour}" stroke-width="2.5" stroke-dasharray="10 6" vector-effect="non-scaling-stroke"`)}${label(c.x, c.y - lift, text, lift ? "annotations-label is-lifted" : "annotations-label", liftedStyle(textScale))}</g>`;
}

/**
 * A read-only projection of the map (B14 spectator display, breakout and the DM's "view
 * as" draw these layers with an identity that is neither "player" nor "dm"). It shows
 * what everyone at the table sees: shared items only, never this browser's private
 * measurement, rings, keyboard cursor, selection or tool bars.
 */
const projection = (ctx) => ctx.role !== "player" && ctx.role !== "dm";

/** Map layer under the tokens: auras, templates, measurements, rings, drawings. */
function areasLayer(ctx, tv) {
  const scene = tv?.scene;
  if (!scene) return "";
  const state = ctx.state;
  const onTable = !projection(ctx);
  const auras = D.visibleAuras(state, scene.id, ctx.role)
    .map((aura) => auraSvg(ctx, aura))
    .join("");
  const templates = D.visibleTemplates(state, scene.id, ctx.role)
    .map((t) => templateSvg(ctx, scene, t, onTable && ui.selectedTemplate === t.id))
    .join("");
  const shared = D.visibleMeasures(state, scene.id, ctx.role)
    .map((m) =>
      measureSvg(ctx, scene, m, {
        colour: D.identityColour(m.author),
        owner: m.own ? "" : D.authorName(state, m, ctx.lang),
      }),
    )
    .join("");
  const marks = D.visibleMarks(state, scene.id, ctx.role)
    .map((m) => markSvg(ctx, m))
    .join("");
  if (!onTable)
    return `${patternDefs()}<g class="annotations-auras">${auras}</g><g class="annotations-templates">${templates}</g><g class="annotations-measures">${shared}</g><g class="annotations-marks">${marks}</g>`;
  const own = D.identityColour(ctx.role);
  const local =
    ui.measure?.sceneId === scene.id
      ? measureSvg(ctx, scene, ui.measure, { colour: own, local: true })
      : "";
  const rings = ui.rings?.sceneId === scene.id ? ringsSvg(ctx, scene, ui.rings) : "";
  const ruler = tempRulerSvg(ctx, scene);
  return `${patternDefs()}<g class="annotations-auras">${auras}</g><g class="annotations-templates">${templates}</g><g class="annotations-measures">${shared}${local}${rings}${ruler}</g><g class="annotations-marks">${marks}</g><g data-annot-live></g>`;
}
function tempRulerSvg(ctx, scene) {
  const r = ui.tempRuler;
  if (!r || r.sceneId !== scene.id || Date.now() > r.until) return "";
  const a = scene.tokens.find((t) => t.actorId === r.fromActorId);
  const b = scene.tokens.find((t) => t.actorId === r.toActorId);
  if (!a || !b) return "";
  const row = D.distanceRows(ctx.state, scene.id, r.fromActorId, ctx.role).find(
    (entry) => entry.actorId === r.toActorId,
  );
  if (!row) return "";
  const text = `${ctx.esc(actorName(ctx, r.fromActorId))} → ${ctx.esc(row.name)}: ${fmt(ctx, row.meters)} m`;
  return `<g class="annotations-temp-ruler" style="animation-delay:-${Math.max(0, 8000 - (r.until - Date.now()))}ms"><line x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(b.x)}" y2="${f1(b.y)}"/>${label((a.x + b.x) / 2, (a.y + b.y) / 2 - 8, text)}</g>`;
}

/** Map layer above the tokens: badges, signals, the keyboard cursor and the HUD overlay. */
function signalsLayer(ctx, tv) {
  const scene = tv?.scene;
  if (!scene) return "";
  const state = ctx.state;
  const now = Date.now();
  const onTable = !projection(ctx);
  const badges = scene.tokens
    .filter((token) => D.observable(state, scene, token.actorId, ctx.role))
    .map((token) => {
      const z = D.elevationOf(state, token.id);
      const tips = D.visibleTooltips(state, token.actorId, ctx.role);
      const elevation = z
        ? `<g class="annotations-elevation" data-token-for="${ctx.esc(token.actorId)}" pointer-events="none" transform="translate(${f1(token.x + 24)},${f1(token.y + 22)})"><rect x="-4" y="-11" width="${24 + String(fmt(ctx, Math.abs(z))).length * 7}" height="16" rx="8"/><text x="4" y="1">${z > 0 ? "↑" : "↓"}${fmt(ctx, Math.abs(z))} m</text></g>`
        : "";
      const tip =
        tips.length && onTable && tv.selectedActorId === token.actorId
          ? `<g class="annotations-tip-badge" data-annot-tip="${ctx.esc(token.actorId)}" role="button" tabindex="0" aria-expanded="${ui.tipOpen === token.actorId}" aria-label="${ctx.esc(ctx.t("Note sulla pedina", "Token notes") + ": " + actorName(ctx, token.actorId))}" data-x="${f1(token.x)}" data-y="${f1(token.y)}" transform="translate(${f1(token.x - 22)},${f1(token.y - 22)})"><circle class="annotations-tip-hit" r="20"/><g class="annotations-tip-face"><circle r="11"/><text y="4.5" text-anchor="middle">i</text></g></g>`
          : tips.length
            ? `<g class="annotations-tip-dot" data-token-for="${ctx.esc(token.actorId)}" pointer-events="none" transform="translate(${f1(token.x - 20)},${f1(token.y - 20)})" aria-hidden="true"><circle r="5"/></g>`
            : "";
      return elevation + tip;
    })
    .join("");
  const signals = bus
    .live(scene.id, ctx.role)
    // A view proposal is addressed to each player; a projection cannot answer it.
    .filter((signal) => signal.kind !== "tooltip" && (onTable || signal.kind !== "recall"))
    .map((signal) => signalSvg(ctx, scene, signal, now))
    .join("");
  const cursor =
    ui.cursor && onTable
      ? `<g class="annotations-cursor" transform="translate(${f1(ui.cursor.x)},${f1(ui.cursor.y)})" aria-hidden="true"><circle r="9"/><path d="M-16 0H16M0-16V16"/></g>`
      : "";
  return `<g class="annotations-badges">${badges}</g><g class="annotations-signals" pointer-events="none">${signals}${cursor}</g>${onTable ? hudMarkup(ctx, tv) : ""}`;
}
function signalSvg(ctx, scene, s, now) {
  const elapsed = Math.max(0, now - s.at);
  const ttl = D.SIGNAL_TTL[s.kind];
  const style = `style="--annot-colour:${s.colour};--annot-ttl:${ttl}ms;animation-delay:-${elapsed}ms"`;
  const name = ctx.esc(s.name);
  // Roll20 Measure broadcast (R20-136): the measurement being dragged, in the author's
  // colour with the author's name, gone shortly after release.
  if (s.kind === "measure")
    return `<g class="annotations-measure-signal" data-annot-signal="measure" ${style}>${measureSvg(
      ctx,
      scene,
      s.measure,
      { colour: s.colour, owner: s.own ? "" : s.name, signal: true },
    )}</g>`;
  if (s.kind === "laser")
    return `<g class="annotations-laser" data-annot-signal="laser" ${style}><polyline points="${pts(s.trail.length ? s.trail : [s])}" /><circle cx="${f1(s.x)}" cy="${f1(s.y)}" r="6"/>${label(s.x, s.y - 14, name, "annotations-label is-signal")}</g>`;
  if (s.kind === "recall")
    return `<g class="annotations-recall-mark" data-annot-signal="recall" ${style} transform="translate(${f1(s.x)},${f1(s.y)})"><rect x="-22" y="-16" width="44" height="32" rx="4"/>${label(0, -24, ctx.t("Vista proposta", "Proposed view"), "annotations-label is-signal")}</g>`;
  const alert = s.kind === "alert";
  return `<g class="annotations-ping${alert ? " is-alert" : ""}" data-annot-signal="${s.kind}" ${style} transform="translate(${f1(s.x)},${f1(s.y)})"><circle class="annotations-ping-wave" r="${alert ? 30 : 22}" style="animation-delay:-${elapsed}ms"/><circle class="annotations-ping-wave is-late" r="${alert ? 30 : 22}" style="animation-delay:-${elapsed + 400}ms"/><circle r="${alert ? 9 : 6}" class="annotations-ping-dot"/>${alert ? `<text class="annotations-ping-mark" y="5" text-anchor="middle">!</text>` : ""}${label(0, alert ? -38 : -30, name, "annotations-label is-signal")}</g>`;
}

// ---------------------------------------------------------------- HUD (tool bars, banner, arrows)

const btn = (
  ctx,
  {
    key,
    attrs = "",
    text,
    icon,
    pressed = null,
    cls = "",
    label: visible = false,
    disabled = false,
    why = "",
  },
) =>
  `<button type="button" class="annotations-btn${icon && !visible ? " is-icon" : ""}${cls ? " " + cls : ""}" data-annot-focus="${ctx.esc(key)}" ${attrs} ${icon && !visible ? `aria-label="${ctx.esc(text)}" title="${ctx.esc(text)}"` : ""}${pressed === null ? "" : ` aria-pressed="${pressed}"`}${disabled ? ` disabled aria-describedby="${why}"` : ""}>${icon ? svgIcon(icon) : ""}${!icon || visible ? `<span>${ctx.esc(text)}</span>` : ""}</button>`;
function swatchesMarkup(ctx, which, current) {
  return `<div class="annotations-swatches" role="group" aria-label="${ctx.t("Colore", "Colour")}">${D.COLOURS.map(
    ([id, hex, name]) =>
      `<button type="button" class="annotations-swatch" data-annot-colour="${which}:${id}" data-annot-focus="colour-${which}-${id}" aria-pressed="${current === id}" aria-label="${ctx.esc(ctx.label(name))}" title="${ctx.esc(ctx.label(name))}" style="--swatch:${hex}"></button>`,
  ).join("")}</div>`;
}
function colourButton(ctx, which, current, disabled = false, why = "annot-why-locked") {
  const name = ctx.label(D.COLOURS.find(([id]) => id === current)?.[2] ?? D.COLOURS[0][2]);
  return `<button type="button" class="annotations-btn is-icon annotations-colour" data-annot-swatches="${which}" data-annot-focus="swatches-${which}" aria-expanded="${!disabled && ui.swatches === which}" aria-label="${ctx.esc(ctx.t("Colore", "Colour") + ": " + name)}" title="${ctx.esc(ctx.t("Colore", "Colour") + ": " + name)}"${disabled ? ` disabled aria-describedby="${why}"` : ""}><span style="--swatch:${D.colourHex(current)}"></span></button>`;
}
const select = (ctx, { key, attr, text, options, value }) =>
  `<label class="annotations-select"><span>${ctx.esc(text)}</span><select ${attr} data-annot-focus="${ctx.esc(key)}">${options
    .map(
      ([v, name]) =>
        `<option value="${ctx.esc(v)}"${String(v) === String(value) ? " selected" : ""}>${ctx.esc(name)}</option>`,
    )
    .join("")}</select></label>`;
const group = (ctx, text, inner) =>
  `<div class="annotations-group" role="group" aria-label="${ctx.esc(text)}">${inner}</div>`;
function undoButton(ctx) {
  const can = ctx.canUndo?.() ?? false;
  const text = can
    ? ctx.t("Annulla", "Undo") + ": " + (ctx.undoLabel?.() ?? "")
    : ctx.t("Annulla", "Undo");
  // The accessible name says what will be undone (it may be another game change). SV-37: a
  // disabled Undo says why (cause and remedy) through aria-describedby.
  return `<button type="button" class="annotations-btn is-icon" data-annot-focus="undo" data-annot-act="undo" aria-label="${ctx.esc(text)}" title="${ctx.esc(can ? text : ctx.t("Niente da annullare: prima disegna, misura o sposta qualcosa.", "Nothing to undo: draw, measure or move something first."))}"${can ? "" : ' disabled aria-describedby="annot-why-undo"'}>${svgIcon("undo")}</button>${can ? "" : `<span class="visually-hidden" id="annot-why-undo">${ctx.t("Niente da annullare: prima disegna, misura o sposta qualcosa.", "Nothing to undo: draw, measure or move something first.")}</span>`}`;
}
const listButton = (ctx) =>
  `<button type="button" class="annotations-btn is-icon" data-table-drawer="annotations-list" aria-controls="table-drawer" data-annot-focus="list" aria-label="${ctx.t("Elenco delle annotazioni", "Annotations list")}" title="${ctx.t("Elenco delle annotazioni", "Annotations list")}">${svgIcon("list")}</button>`;
const reasonBar = (ctx, reason) =>
  `<p class="annotations-reason" role="status">${ctx.esc(ctx.label(reason))}</p>`;

const DRAW_MODES = [
  ["free", L("Mano libera", "Freehand")],
  ["arrow", L("Freccia", "Arrow")],
  ["rect", L("Rettangolo", "Rectangle")],
  ["ellipse", L("Ellisse", "Ellipse")],
  ["text", L("Testo o nota sulla pedina", "Text or token note")],
  ["erase", L("Gomma", "Eraser")],
];
/** The tool's short guide, shown in the map caption (role=status) while the tool is on. */
function hintFor(ctx, mode) {
  const t = ctx.t;
  if (mode === DRAW_TOOL)
    return {
      free: t(
        "Disegna: trascina sulla mappa. Il disegno resta finché tu o il DM lo cancellate.",
        "Draw: drag on the map. It stays until you or the DM erase it.",
      ),
      arrow: t(
        "Freccia: trascina dalla coda alla punta. Frecce + Invio: dalla pedina selezionata.",
        "Arrow: drag from tail to tip. Arrow keys + Enter: from the selected token.",
      ),
      rect: t("Rettangolo: trascina da un angolo all'altro.", "Rectangle: drag corner to corner."),
      ellipse: t("Ellisse: trascina da un angolo all'altro.", "Ellipse: drag corner to corner."),
      text: t(
        "Testo: clic sulla mappa. Clic su una pedina: nota che appare al passaggio.",
        "Text: click the map. Click a token: a note shown on hover.",
      ),
      erase: t(
        "Gomma: clic su un tuo disegno (il DM può cancellarli tutti).",
        "Eraser: click one of your drawings (the DM can erase any).",
      ),
    }[pref(ctx, "draw-mode")];
  if (mode === TEMPLATE_TOOL)
    return t(
      "Sagoma: trascina dall'origine per crearla, a passi di 1,5 m (Maiusc: misura libera). Trascina una sagoma per spostarla; la maniglia ruota e ridimensiona. Tasti: frecce, [ ], + −, Canc, Maiusc+L.",
      "Template: drag from the origin to create it, in 1.5 m steps (Shift: free size). Drag a template to move it; the handle rotates and resizes. Keys: arrows, [ ], + −, Delete, Shift+L.",
    );
  if (mode === "measure") {
    const shape = pref(ctx, "measure-shape");
    const who =
      pref(ctx, "measure-share") === true
        ? t(
            "Condivisa: gli altri vedono la misura mentre trascini e quella che fissi.",
            "Shared: others see the measurement while you drag and the one you pin.",
          )
        : t("Solo per te: nessun altro la vede.", "Only for you: nobody else sees it.");
    return (
      (shape === "line"
        ? t(
            "Misura: passa sulla mappa per la distanza dalla pedina selezionata; trascina per una misura che sparisce al rilascio; clic aggiunge un tratto, Backspace lo toglie, doppio clic o Invio la fissa.",
            "Measure: hover for the distance from the selected token; drag for a measurement that goes on release; click adds a leg, Backspace removes one, double-click or Enter pins it.",
          )
        : shape === "rings"
          ? t(
              "Anelli: tocca o fai clic su una pedina o sulla mappa; restano fermi anche quando la pedina si muove.",
              "Rings: tap or click a token or the map; they stay put even when the token moves.",
            )
          : t(
              "Trascina dall'origine: direzione e misura in metri, sparisce al rilascio. Frecce + Invio dalla pedina selezionata la fissano.",
              "Drag from the origin: direction and size in metres, gone on release. Arrow keys + Enter from the selected token pin it.",
            )) +
      " " +
      who
    );
  }
  if (mode === "pointer")
    return (
      t(
        "Puntatore: clic per un segnale col tuo colore, Alt+clic allerta rossa, tieni premuto e trascina per indicare.",
        "Pointer: click to ping in your colour, Alt+click for a red alert, press and drag to point.",
      ) +
      (ctx.role === "dm"
        ? " " +
          t(
            "Maiusc+clic: proponi ai giocatori di guardare qui.",
            "Shift+click: propose players look here.",
          )
        : "")
    );
  return "";
}
function drawBar(ctx) {
  const reason = D.permissionReason("draw", ctx.role, permissions(ctx));
  if (reason) return reasonBar(ctx, reason);
  const mode = pref(ctx, "draw-mode");
  const colour = pref(ctx, "draw-color");
  const modes = DRAW_MODES.map(([id, name]) =>
    btn(ctx, {
      key: "draw-" + id,
      attrs: `data-annot-set="draw-mode:${id}"`,
      text: ctx.label(name),
      icon: id,
      pressed: mode === id,
    }),
  ).join("");
  const clearAll =
    ctx.role === "dm"
      ? btn(ctx, {
          key: "clear-all",
          attrs: 'data-annot-act="clear-all"',
          text: ctx.t("Cancella tutti i disegni", "Clear all drawings"),
          icon: "trash",
          cls: "is-danger",
        })
      : "";
  return `<div class="annotations-row">${group(ctx, ctx.t("Modo di disegno", "Drawing mode"), modes)}${colourButton(ctx, "draw", colour)}${select(
    ctx,
    {
      key: "draw-width",
      attr: 'data-annot-pref="draw-width" data-annot-number',
      text: ctx.t("Spessore", "Width"),
      options: [1, 2, 3, 4, 5].map((n) => [n, String(n)]),
      value: pref(ctx, "draw-width"),
    },
  )}${undoButton(ctx)}${btn(ctx, { key: "clear-mine", attrs: 'data-annot-act="clear-mine"', text: ctx.t("Cancella i miei", "Clear mine"), icon: "erase", label: true })}${clearAll}${listButton(ctx)}</div>${ui.swatches === "draw" ? swatchesMarkup(ctx, "draw", colour) : ""}`;
}
function templateBar(ctx, tv) {
  const reason = D.permissionReason("template", ctx.role, permissions(ctx));
  if (reason) return reasonBar(ctx, reason);
  const shape = pref(ctx, "template-shape");
  const colour = pref(ctx, "template-color");
  const shapes = D.TEMPLATE_SHAPES.map((id) =>
    btn(ctx, {
      key: "tpl-" + id,
      attrs: `data-annot-set="template-shape:${id}"`,
      text: `${ctx.label(D.SHAPE_LABELS[id])} (${ctx.label(D.SHAPE_RULE[id][1])})`,
      icon: id,
      pressed: shape === id,
    }),
  ).join("");
  const patterns = [
    ["none", ctx.t("Nessuno", "None")],
    ...D.DAMAGE_TYPES.map(([id, name]) => [id, ctx.label(name)]),
  ];
  const selected = ui.selectedTemplate
    ? D.visibleTemplates(ctx.state, tv.scene.id, ctx.role).find((t) => t.id === ui.selectedTemplate)
    : null;
  const hidden =
    ctx.role === "dm"
      ? btn(ctx, {
          key: "tpl-hidden",
          attrs: 'data-annot-act="new-hidden"',
          text: ctx.t("Nuove nascoste ai giocatori", "New ones hidden from players"),
          icon: "hide",
          pressed: ui.newHidden,
        })
      : "";
  const defaults = `<div class="annotations-row">${group(ctx, ctx.t("Forma", "Shape"), shapes)}${colourButton(ctx, "template", colour)}${select(
    ctx,
    {
      key: "tpl-pattern",
      attr: 'data-annot-pref="template-pattern"',
      text: ctx.t("Motivo", "Pattern"),
      options: patterns,
      value: pref(ctx, "template-pattern"),
    },
  )}${hidden}${undoButton(ctx)}${listButton(ctx)}</div>${ui.swatches === "template" ? swatchesMarkup(ctx, "template", colour) : ""}`;
  if (!selected) return defaults;
  const title = `${ctx.esc(selected.label || ctx.label(D.SHAPE_LABELS[selected.shape]))} · ${fmt(ctx, selected.size)} m${selected.hidden ? " · " + ctx.t("nascosta", "hidden") : ""}${selected.locked ? " · " + (selected.lockedBy === "dm" ? ctx.t("bloccata dal DM", "locked by the DM") : ctx.t("bloccata", "locked")) : ""}`;
  const dmLock = D.lockedByDm(selected, ctx.role);
  const tools = selected.canEdit
    ? `${selected.locked ? `<span class="annotations-why" id="annot-why-locked">${dmLock ? ctx.t("Bloccata dal DM: chiedi al DM di sbloccarla.", "Locked by the DM: ask the DM to unlock it.") : ctx.t("Sagoma bloccata: premi Sblocca per modificarla.", "Template locked: press Unlock to change it.")}</span>` : ""}${btn(ctx, { key: "sel-rename", attrs: 'data-annot-act="tpl-rename"', text: ctx.t("Nome…", "Name…"), icon: "rename", disabled: selected.locked, why: "annot-why-locked" })}${colourButton(ctx, "selected", selected.color, selected.locked)}${select(
        ctx,
        {
          key: "sel-pattern",
          attr: `data-annot-tpl-pattern${selected.locked ? ' disabled aria-describedby="annot-why-locked"' : ""}`,
          text: ctx.t("Motivo", "Pattern"),
          options: patterns,
          value: selected.pattern,
        },
      )}${
        ctx.role === "dm"
          ? btn(ctx, {
              key: "sel-visibility",
              attrs: 'data-annot-act="tpl-visibility"',
              text: selected.hidden
                ? ctx.t("Rivela ai giocatori", "Reveal to players")
                : ctx.t("Nascondi ai giocatori", "Hide from players"),
              icon: selected.hidden ? "recall" : "hide",
              label: selected.hidden,
              disabled: selected.locked,
              why: "annot-why-locked",
            })
          : ""
      }${btn(ctx, {
        key: "sel-lock",
        attrs: 'data-annot-act="tpl-lock" aria-keyshortcuts="Shift+L"',
        text: dmLock
          ? ctx.t(
              "Bloccata dal DM: solo il DM può sbloccarla",
              "Locked by the DM: only the DM can unlock it",
            )
          : selected.locked
            ? ctx.t("Sblocca", "Unlock")
            : ctx.t("Blocca", "Lock"),
        icon: selected.locked ? "unlock" : "lock",
        pressed: selected.locked,
        disabled: dmLock,
        why: "annot-why-locked",
      })}${btn(ctx, { key: "sel-delete", attrs: 'data-annot-act="tpl-delete" aria-keyshortcuts="Delete"', text: ctx.t("Elimina", "Delete"), icon: "trash", cls: "is-danger", disabled: selected.locked, why: "annot-why-locked" })}`
    : `<span class="annotations-hint">${ctx.t("Creata da", "Created by")} ${ctx.esc(D.authorName(ctx.state, selected, ctx.lang))}</span>`;
  return `${defaults}<div class="annotations-row annotations-selection" role="group" aria-label="${ctx.t("Sagoma selezionata", "Selected template")}"><strong>${title}</strong>${tools}${btn(ctx, { key: "sel-close", attrs: 'data-annot-act="tpl-deselect"', text: ctx.t("Deseleziona", "Deselect"), icon: "close" })}</div>${ui.swatches === "selected" ? swatchesMarkup(ctx, "selected", selected.color) : ""}`;
}
function measureBar(ctx, tv) {
  const shape = pref(ctx, "measure-shape");
  const share = pref(ctx, "measure-share") === true;
  const shapes = D.MEASURE_SHAPES.map((id) =>
    btn(ctx, {
      key: "measure-" + id,
      attrs: `data-annot-set="measure-shape:${id}"`,
      text: ctx.label(D.SHAPE_LABELS[id]),
      icon: id,
      pressed: shape === id,
    }),
  ).join("");
  const own = D.ownSharedMeasure(ctx.state, tv.scene.id, ctx.role);
  const theme =
    shape === "rings"
      ? select(ctx, {
          key: "ring-theme",
          attr: 'data-annot-pref="ring-theme"',
          text: ctx.t("Tema dei colori", "Colour theme"),
          options: [
            ["auto", ctx.t("Come la visione dei colori", "As colour vision")],
            ...Object.entries(D.RING_THEMES).map(([id, entry]) => [id, ctx.label(entry.label)]),
          ],
          value: pref(ctx, "ring-theme"),
        })
      : "";
  const has = Boolean(ui.measure || ui.rings || own);
  return `<div class="annotations-row">${group(ctx, ctx.t("Forma della misura", "Measurement shape"), shapes)}${btn(
    ctx,
    {
      key: "measure-share",
      attrs: 'data-annot-act="share"',
      text: share
        ? ctx.t("Condivisa con il tavolo", "Shared with the table")
        : ctx.t("Solo per te", "Only for you"),
      icon: share ? "share" : "hide",
      label: true,
      pressed: share,
    },
  )}${theme}${btn(ctx, { key: "measure-clear", attrs: 'data-annot-act="measure-clear"', text: ctx.t("Togli misura", "Clear measurement"), icon: "close", disabled: !has, why: "annot-why-measure" })}${has ? "" : `<span class="visually-hidden" id="annot-why-measure">${ctx.t("Nessuna misura da togliere: trascina sulla mappa per misurare.", "No measurement to clear: drag on the map to measure.")}</span>`}</div>`;
}
function pointerBar(ctx) {
  const reason = D.permissionReason("pointer", ctx.role, permissions(ctx));
  if (reason) return reasonBar(ctx, reason);
  const mode = pref(ctx, "pointer-mode");
  const modes = [
    ["ping", L("Segnale", "Ping")],
    ["alert", L("Allerta", "Alert")],
    ...(ctx.role === "dm" ? [["recall", L("Proponi la vista", "Propose the view")]] : []),
  ];
  const last = ctx.role === "dm" ? bus.lastRecallBy(ctx.role) : null;
  const answers = last ? Object.entries(last.answers) : [];
  const status = last
    ? `<span class="annotations-status" role="status">${ctx.t("Proposta di vista", "View proposal")}: ${
        answers.length
          ? answers
              .map(
                ([who, answer]) =>
                  `${ctx.esc(identityName(ctx.state, who, ctx.lang))} ${answer === "accepted" ? ctx.t("ha accettato", "accepted") : ctx.t("ha ignorato", "ignored")}`,
              )
              .join(", ")
          : ctx.t("in attesa di risposta", "awaiting an answer")
      }</span>`
    : "";
  const effective = modes.some(([id]) => id === mode) ? mode : "ping";
  return `<div class="annotations-row">${group(
    ctx,
    ctx.t("Effetto del clic", "Click action"),
    modes
      .map(([id, name]) =>
        btn(ctx, {
          key: "pointer-" + id,
          attrs: `data-annot-set="pointer-mode:${id}"`,
          text: ctx.label(name),
          icon: id,
          label: true,
          pressed: effective === id,
        }),
      )
      .join(""),
  )}${status}</div>`;
}
function hudMarkup(ctx, tv) {
  const width = tv.scene.width / (tv.zoom || 1);
  const height = tv.scene.height / (tv.zoom || 1);
  const bar =
    tv.mode === DRAW_TOOL
      ? drawBar(ctx)
      : tv.mode === TEMPLATE_TOOL
        ? templateBar(ctx, tv)
        : tv.mode === "measure"
          ? measureBar(ctx, tv)
          : tv.mode === "pointer"
            ? pointerBar(ctx)
            : "";
  const proposal = bus.pendingRecall(ctx.role);
  const banner =
    proposal && proposal.sceneId === tv.scene.id
      ? `<div class="annotations-banner" role="status" data-annot-banner><span>${ctx.esc(proposal.name)} ${ctx.t("propone di guardare un punto della mappa.", "proposes a point of the map to look at.")}</span>${btn(ctx, { key: "recall-accept", attrs: `data-annot-recall="accepted:${ctx.esc(proposal.id)}"`, text: ctx.t("Guarda", "Look"), cls: "is-primary" })}${btn(ctx, { key: "recall-decline", attrs: `data-annot-recall="declined:${ctx.esc(proposal.id)}"`, text: ctx.t("Ignora", "Ignore") })}</div>`
      : "";
  return `<foreignObject class="annotations-hud-fo" pointer-events="none" x="${tv.pan?.x ?? 0}" y="${tv.pan?.y ?? 0}" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" class="annotations-hud">${bar || banner ? `<div class="annotations-bottom">${banner}${bar ? `<div class="annotations-bar" data-annot-bar="${ctx.esc(tv.mode)}" role="toolbar" aria-label="${ctx.t("Opzioni dello strumento", "Tool options")}">${bar}</div>` : ""}</div>` : ""}<div class="annotations-arrows" data-annot-arrows></div><div class="annotations-bubble" data-annot-bubble hidden></div></div></foreignObject>`;
}

// ---------------------------------------------------------------- HUD binding

function layoutHud(el, table) {
  const fo = el.querySelector(".annotations-hud-fo");
  const svg = table.svg;
  if (!fo || !svg?.isConnected) return null;
  const m = svg.getScreenCTM();
  const r = svg.getBoundingClientRect();
  if (!m || !r.width) return null;
  const origin = new DOMPoint(r.left, r.top).matrixTransform(m.inverse());
  fo.setAttribute("x", "0");
  fo.setAttribute("y", "0");
  fo.setAttribute("width", String(r.width));
  fo.setAttribute("height", String(r.height));
  fo.setAttribute("transform", `translate(${origin.x} ${origin.y}) scale(${1 / m.a})`);
  const hud = fo.firstElementChild;
  if (hud) {
    hud.style.width = r.width + "px";
    hud.style.height = r.height + "px";
  }
  return { m, r };
}
const toScreen = (frame, p) => ({
  x: frame.m.a * p.x + frame.m.e - frame.r.left,
  y: frame.m.d * p.y + frame.m.f - frame.r.top,
});
/** Edge arrows for live signals outside the visible part of the map (Foundry FVT-157). */
function placeArrows(el, ctx, table, frame) {
  const box = el.querySelector("[data-annot-arrows]");
  if (!box || !frame) return;
  const { r } = frame;
  const margin = 30;
  const placed = [];
  // P6: the map's own controls (zoom and find, the tool column, the door buttons drawn above
  // the layers) never sit on an arrow; an arrow that would slides along its edge, away.
  const blockers = [
    ...(globalThis.document?.querySelectorAll?.(
      "#content .map-zoom, #content .map-toolbar, #content #battle-map [data-door]",
    ) ?? []),
  ].map((node) => {
    const b = node.getBoundingClientRect();
    return {
      left: b.left - r.left,
      top: b.top - r.top,
      right: b.right - r.left,
      bottom: b.bottom - r.top,
    };
  });
  const covered = (x, y) =>
    blockers.some(
      (b) => x + 50 > b.left && x - 50 < b.right && y + 22 > b.top && y - 22 < b.bottom,
    );
  const arrows = bus
    .live(table.scene.id, ctx.role)
    .filter((signal) => signal.kind !== "tooltip" && signal.kind !== "measure")
    .map((signal) => {
      const s = toScreen(frame, signal);
      if (s.x >= 8 && s.y >= 8 && s.x <= r.width - 8 && s.y <= r.height - 8) return "";
      const cx = r.width / 2,
        cy = r.height / 2;
      const dx = s.x - cx,
        dy = s.y - cy;
      const k = Math.min(
        dx ? (r.width / 2 - margin) / Math.abs(dx) : Infinity,
        dy ? (r.height / 2 - margin) / Math.abs(dy) : Infinity,
      );
      let x = cx + dx * k,
        y = cy + dy * k;
      // Two signals in the same direction: slide the later arrow along its edge.
      const horizontalEdge = Math.abs(Math.abs(y - cy) - (r.height / 2 - margin)) < 1;
      for (
        let guard = 0;
        guard < 12 &&
        (placed.some((p) => Math.abs(p.x - x) < 96 && Math.abs(p.y - y) < 44) || covered(x, y));
        guard++
      ) {
        if (horizontalEdge) x = x > cx ? x - 100 : x + 100;
        else y = y > cy ? y - 48 : y + 48;
      }
      placed.push({ x, y });
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const what =
        signal.kind === "alert"
          ? ctx.t("Allerta", "Alert")
          : signal.kind === "recall"
            ? ctx.t("Vista proposta", "Proposed view")
            : signal.kind === "laser"
              ? ctx.t("Puntatore", "Pointer")
              : ctx.t("Segnale", "Ping");
      return `<button type="button" class="annotations-arrow${signal.kind === "alert" ? " is-alert" : ""}" data-annot-goto="${f1(signal.x)},${f1(signal.y)}" data-annot-focus="arrow-${signal.id}" style="left:${f1(x)}px;top:${f1(y)}px;--annot-colour:${signal.colour}" aria-label="${ctx.esc(`${what} · ${signal.name} · ${ctx.t("fuori schermo: vai", "off screen: go there")}`)}"><svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${f1(angle)}deg)"><path d="M4 12h14m-5-6 6 6-6 6"/></svg><span>${ctx.esc(signal.name)}</span></button>`;
    })
    .join("");
  box.innerHTML = arrows;
  box.querySelectorAll("[data-annot-goto]").forEach((b) =>
    b.addEventListener("click", () => {
      const [x, y] = b.dataset.annotGoto.split(",").map(Number);
      centreOn(table, { x, y });
    }),
  );
}
function centreOn(table, p, zoom = table.view?.zoom ?? 1) {
  const z = Math.min(3, Math.max(0.6, zoom));
  table.setView({
    zoom: z,
    pan: { x: p.x - table.scene.width / z / 2, y: p.y - table.scene.height / z / 2 },
  });
}
function bubbleMarkup(ctx, actorId, { pinned, shownBy }) {
  const tips = D.visibleTooltips(ctx.state, actorId, ctx.role);
  if (!tips.length) return "";
  const rows = tips
    .map(
      (tip) =>
        `<li><strong>${ctx.esc(D.authorName(ctx.state, tip.asActorId ? tip : { author: tip.author, asActorId: D.actingAs(ctx.state, tip.author) }, ctx.lang))}</strong>${tip.audience === "me" ? ` <span class="annotations-chip">${ctx.t("Solo io", "Only me")}</span>` : ""}<p>${ctx.esc(tip.text)}</p>${
          pinned
            ? `<div class="annotations-row">${
                tip.audience === "all" && (tip.own || ctx.role === "dm")
                  ? btn(ctx, {
                      key: "tip-show-" + tip.id,
                      attrs: `data-annot-tip-show="${ctx.esc(tip.id)}"`,
                      text: ctx.t("Mostra a tutti", "Show everyone"),
                      icon: "share",
                      label: true,
                    })
                  : ""
              }${tip.own ? btn(ctx, { key: "tip-edit-" + tip.id, attrs: `data-annot-tip-edit="${ctx.esc(actorId)}"`, text: ctx.t("Modifica", "Edit"), icon: "rename", label: true }) : ""}${
                tip.canRemove
                  ? btn(ctx, {
                      key: "tip-remove-" + tip.id,
                      attrs: `data-annot-tip-remove="${ctx.esc(tip.id)}"`,
                      text: ctx.t("Rimuovi", "Remove"),
                      icon: "trash",
                      label: true,
                    })
                  : ""
              }</div>`
            : ""
        }</li>`,
    )
    .join("");
  return `<div class="annotations-bubble-head"><span>${ctx.esc(actorName(ctx, actorId))}</span>${shownBy ? `<small>${ctx.t("mostrata da", "shown by")} ${ctx.esc(shownBy)}</small>` : ""}${pinned ? btn(ctx, { key: "tip-close", attrs: "data-annot-tip-close", text: ctx.t("Chiudi", "Close"), icon: "close" }) : ""}</div><ul>${rows}</ul>`;
}
function showBubble(el, ctx, table, frame) {
  const box = el.querySelector("[data-annot-bubble]");
  if (!box || !frame) return;
  const shown = bus
    .live(table.scene.id, ctx.role)
    .find(
      (signal) =>
        signal.kind === "tooltip" &&
        !signal.own &&
        D.visibleTooltips(ctx.state, signal.actorId, ctx.role).some(
          (tip) => tip.id === signal.tooltipId,
        ),
    );
  const actorId = ui.tipOpen ?? ui.hover ?? shown?.actorId ?? null;
  const token = actorId && table.scene.tokens.find((entry) => entry.actorId === actorId);
  const html = token
    ? bubbleMarkup(ctx, actorId, {
        pinned: ui.tipOpen === actorId,
        shownBy: !ui.tipOpen && !ui.hover ? shown?.name : "",
      })
    : "";
  if (!html) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  box.innerHTML = html;
  box.hidden = false;
  box.classList.toggle("is-pinned", ui.tipOpen === actorId);
  box.setAttribute("role", ui.tipOpen === actorId ? "dialog" : "tooltip");
  box.setAttribute(
    "aria-label",
    ctx.t("Note sulla pedina", "Token notes") + ": " + actorName(ctx, actorId),
  );
  const s = toScreen(frame, token);
  const w = box.offsetWidth || 260,
    h = box.offsetHeight || 80;
  // Keep clear of the map toolbar on the left (16px + 49px, 9px + 48px when narrow).
  const inset = matchMedia("(max-width: 1000px)").matches ? 62 : 74;
  const x = Math.max(inset, Math.min(frame.r.width - w - 8, s.x - w / 2));
  const above = s.y - 36 - h;
  box.style.left = f1(x) + "px";
  // Below the session bar in the top-right corner (B14 HUD, 40px + margins).
  box.style.top =
    f1(above >= 56 ? above : Math.max(56, Math.min(frame.r.height - h - 8, s.y + 36))) + "px";
  bindBubble(box, ctx, table);
}
function bindBubble(box, ctx, table) {
  box.querySelector("[data-annot-tip-close]")?.addEventListener("click", () => {
    ui.tipOpen = null;
    ctx.render();
  });
  box
    .querySelectorAll("[data-annot-tip-edit]")
    .forEach((b) =>
      b.addEventListener("click", () => openTooltipDialog(ctx, b.dataset.annotTipEdit)),
    );
  box.querySelectorAll("[data-annot-tip-remove]").forEach((b) =>
    b.addEventListener("click", () => {
      const tip = D.sliceOf(ctx.state).tooltips.find(
        (entry) => entry.id === b.dataset.annotTipRemove,
      );
      run(
        ctx,
        ctx.t("Nota sulla pedina rimossa", "Token note removed"),
        (s) => D.removeTooltip(s, ctx.role, b.dataset.annotTipRemove),
        tip?.audience === "me" ? { local: true, visibility: "private" } : {},
      );
    }),
  );
  box.querySelectorAll("[data-annot-tip-show]").forEach((b) =>
    b.addEventListener("click", () => {
      const tip = D.sliceOf(ctx.state).tooltips.find(
        (entry) => entry.id === b.dataset.annotTipShow,
      );
      if (!tip) return;
      if (
        !sendSignal(ctx, table, {
          kind: "tooltip",
          actorId: tip.actorId,
          tooltipId: tip.id,
          x: 0,
          y: 0,
        })
      )
        return;
      ctx.toast(
        ctx.t(
          "Nota mostrata a tutti per qualche secondo.",
          "Note shown to everyone for a few seconds.",
        ),
      );
    }),
  );
}
function stopMapEvents(el) {
  const inside = (e) =>
    e.target.closest?.(
      ".annotations-hud button, .annotations-hud select, .annotations-hud input, .annotations-hud label, [data-annot-tip], .annotations-bubble",
    );
  for (const type of ["pointerdown", "click"])
    el.addEventListener(type, (e) => {
      if (inside(e)) e.stopPropagation();
    });
  el.addEventListener("keydown", (e) => {
    if (inside(e) && !["Escape", "Tab"].includes(e.key)) e.stopPropagation();
  });
}
function bindSignalsLayer(el, ctx, table) {
  ui.table = table;
  stopMapEvents(el);
  const frame = layoutHud(el, table);
  // Touch: the info badge keeps a 40px target and a readable face at any map scale, and
  // sits outside the token (the core enlarges tokens on phones) so a tap that selects the
  // token never lands on the badge.
  if (frame?.m.a) {
    const scale = frame.m.a;
    const enlarged = matchMedia("(max-width: 720px)").matches ? Math.max(1, 1 / scale) : 1;
    const ring = 28 * enlarged * scale; // token selection ring, in screen pixels
    const offset = (ring + 22) / Math.SQRT2 / scale;
    el.querySelectorAll("[data-annot-tip]").forEach((badge) => {
      const x = Number(badge.dataset.x) - offset;
      const y = Number(badge.dataset.y) - offset;
      badge.setAttribute("transform", `translate(${f1(x)},${f1(y)})`);
      badge.querySelector(".annotations-tip-hit")?.setAttribute("r", String(20 / scale));
      badge
        .querySelector(".annotations-tip-face")
        ?.setAttribute("transform", `scale(${Math.max(1, 12 / (11 * scale))})`);
    });
  }
  placeArrows(el, ctx, table, frame);
  showBubble(el, ctx, table, frame);
  hudObserver?.disconnect();
  hudObserver = new ResizeObserver(() => {
    if (!el.isConnected) return;
    const next = layoutHud(el, table);
    placeArrows(el, ctx, table, next);
    showBubble(el, ctx, table, next);
  });
  hudObserver.observe(table.svg);
  bindBar(el, ctx, table);
  const hint = OWN_TOOLS.includes(table.mode) ? hintFor(ctx, table.mode) : "";
  if (hint) table.message(hint);
  // Tooltip preview on hover and keyboard focus (Owlbear Tooltips).
  const svg = table.svg;
  const hoverTo = (actorId) => {
    if (ui.hover === actorId) return;
    ui.hover = actorId;
    showBubble(el, ctx, table, layoutHud(el, table));
  };
  svg.addEventListener("pointerover", (e) => {
    const g = e.target.closest?.("[data-actor]");
    if (g) hoverTo(g.dataset.actor);
  });
  svg.addEventListener("pointerout", (e) => {
    const g = e.target.closest?.("[data-actor]");
    if (g && !g.contains(e.relatedTarget)) hoverTo(null);
  });
  svg.addEventListener("focusin", (e) => {
    const g = e.target.closest?.("[data-actor]");
    if (g) hoverTo(g.dataset.actor);
  });
  svg.addEventListener("focusout", (e) => {
    if (e.target.closest?.("[data-actor]")) hoverTo(null);
  });
  // Escape clears this area's private measurement, cursor and template selection too.
  svg.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const had =
      ui.measure || ui.rings || ui.cursor || ui.selectedTemplate || ui.tipOpen || ui.gesture;
    if (table.mode === "measure") ui.rings = null;
    ui.gesture = null;
    ui.cursor = null;
    ui.selectedTemplate = null;
    ui.tipOpen = null;
    if (ui.measure && !ui.measure.frozen) ui.measure = null;
    else if (ui.measure && table.mode === "measure") ui.measure = null;
    if (had) queueMicrotask(() => ctx.render());
  });
  el.querySelectorAll("[data-annot-tip]").forEach((badge) => {
    const toggle = () => {
      ui.tipOpen = ui.tipOpen === badge.dataset.annotTip ? null : badge.dataset.annotTip;
      ui.focusKey = null;
      ctx.render();
    };
    badge.addEventListener("click", toggle);
    badge.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });
  el.querySelectorAll("[data-annot-recall]").forEach((b) =>
    b.addEventListener("click", () => {
      const [answer, id] = b.dataset.annotRecall.split(":");
      try {
        const signal = bus.respond(id, ctx.role, answer);
        if (answer === "accepted") centreOn(table, signal, signal.zoom);
        else ctx.render();
        table.message(
          answer === "accepted"
            ? ctx.t("Vista spostata sul punto proposto.", "View moved to the proposed point.")
            : ctx.t(
                "Proposta ignorata: la tua vista non cambia.",
                "Proposal ignored: your view stays.",
              ),
        );
      } catch (error) {
        ctx.toast(errorText(ctx, error), true);
        ctx.render();
      }
    }),
  );
  if (ui.focusKey) {
    const key = ui.focusKey;
    ui.focusKey = null;
    el.querySelector(`[data-annot-focus="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
  }
}
function bindBar(el, ctx, table) {
  const bar = el.querySelector("[data-annot-bar]");
  if (!bar) return;
  const keep = (b) => (ui.focusKey = b.dataset.annotFocus ?? null);
  bar.querySelectorAll("[data-annot-set]").forEach((b) =>
    b.addEventListener("click", () => {
      const [field, value] = b.dataset.annotSet.split(":");
      keep(b);
      if (field === "measure-shape") ui.measure = null;
      remember(ctx, field, value);
    }),
  );
  bar.querySelectorAll("[data-annot-pref]").forEach((s) =>
    s.addEventListener("change", () => {
      keep(s);
      remember(
        ctx,
        s.dataset.annotPref,
        s.hasAttribute("data-annot-number") ? Number(s.value) : s.value,
      );
    }),
  );
  bar.querySelectorAll("[data-annot-swatches]").forEach((b) =>
    b.addEventListener("click", () => {
      keep(b);
      ui.swatches = ui.swatches === b.dataset.annotSwatches ? null : b.dataset.annotSwatches;
      ctx.render();
    }),
  );
  bar.querySelectorAll("[data-annot-colour]").forEach((b) =>
    b.addEventListener("click", () => {
      const [which, colour] = b.dataset.annotColour.split(":");
      ui.swatches = null;
      ui.focusKey = "swatches-" + which;
      if (which === "selected")
        updateSelected(ctx, { color: colour }, ctx.t("Colore della sagoma", "Template colour"));
      else remember(ctx, which === "draw" ? "draw-color" : "template-color", colour);
    }),
  );
  bar.querySelector("[data-annot-tpl-pattern]")?.addEventListener("change", (e) => {
    ui.focusKey = "sel-pattern";
    updateSelected(
      ctx,
      { pattern: e.target.value },
      ctx.t("Motivo della sagoma", "Template pattern"),
    );
  });
  bar.querySelectorAll("[data-annot-act]").forEach((b) =>
    b.addEventListener("click", () => {
      keep(b);
      barAction(ctx, table, b.dataset.annotAct);
    }),
  );
}
function barAction(ctx, table, action) {
  const sceneId = table.scene.id;
  if (action === "undo") return ctx.undo();
  if (action === "clear-mine")
    return run(ctx, ctx.t("Cancellati i miei disegni", "Cleared my drawings"), (s) =>
      D.clearMine(s, ctx.role, sceneId),
    );
  if (action === "clear-all")
    return ctx.dialog(
      ctx.t("Cancella tutti i disegni", "Clear all drawings"),
      `<p>${ctx.t("Cancella i disegni di tutti su questa scena. Annulla ultima modifica li ripristina.", "Erase everyone's drawings on this scene. Undo last change restores them.")}</p>`,
      {
        submitLabel: ctx.t("Cancella tutti", "Clear all"),
        onSubmit: () => {
          ctx.commit(
            ctx.t("Il DM ha cancellato tutti i disegni", "The DM cleared all drawings"),
            (s) => D.clearAll(s, ctx.role, sceneId),
          );
        },
      },
    );
  if (action === "new-hidden") {
    ui.newHidden = !ui.newHidden;
    return ctx.render();
  }
  if (action === "share") return toggleShare(ctx, table);
  if (action === "measure-clear") return clearMeasure(ctx, table);
  if (action === "tpl-deselect") {
    ui.selectedTemplate = null;
    ui.swatches = null;
    return ctx.render();
  }
  const selected = ui.selectedTemplate;
  if (!selected) return;
  const template = D.sliceOf(ctx.state).templates.find((t) => t.id === selected);
  if (!template) return;
  if (action === "tpl-rename") return openTemplateName(ctx, template);
  if (action === "tpl-visibility")
    return updateSelected(
      ctx,
      { hidden: !template.hidden },
      template.hidden
        ? `${ctx.t("Sagoma rivelata", "Template revealed")}: ${template.label || ctx.label(D.SHAPE_LABELS[template.shape])}`
        : ctx.t("Sagoma nascosta ai giocatori", "Template hidden from players"),
      { reveal: template.hidden },
    );
  if (action === "tpl-lock")
    return updateSelected(
      ctx,
      { locked: !template.locked },
      template.locked
        ? ctx.t("Sagoma sbloccata", "Template unlocked")
        : ctx.t("Sagoma bloccata", "Template locked"),
    );
  if (action === "tpl-delete") return deleteTemplate(ctx, template);
}

// ---------------------------------------------------------------- signals

function sendSignal(ctx, table, input) {
  if (ctx.offline) {
    const text = ctx.t(
      "Sei senza rete: il segnale non è partito.",
      "You are offline: the signal was not sent.",
    );
    ctx.toast(text, true);
    table.message(text);
    return null;
  }
  const reason = D.permissionReason("pointer", ctx.role, permissions(ctx));
  if (reason) {
    ctx.toast(ctx.label(reason), true);
    return null;
  }
  try {
    // A view proposal always comes from the DM as DM, never as a character.
    const actorId = input.kind === "recall" ? null : acting(ctx, table);
    return bus.send({
      ...input,
      from: ctx.role,
      name: actorId ? actorName(ctx, actorId) : identityName(ctx.state, ctx.role, ctx.lang),
      sceneId: table.scene.id,
    });
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return null;
  }
}
function pingAt(ctx, table, p, kind) {
  const effective = kind === "recall" && ctx.role !== "dm" ? "ping" : kind;
  const signal = sendSignal(ctx, table, {
    kind: effective,
    x: p.x,
    y: p.y,
    zoom: table.view?.zoom ?? 1,
  });
  if (!signal) return;
  ui.focusKey = null;
  ctx.render();
  ui.table?.message(
    effective === "recall"
      ? ctx.t(
          "Proposta inviata: ogni giocatore sceglie se guardare.",
          "Proposal sent: each player decides whether to look.",
        )
      : effective === "alert"
        ? ctx.t("Allerta inviata a tutto il tavolo.", "Alert sent to the whole table.")
        : ctx.t("Segnale inviato a tutto il tavolo.", "Ping sent to the whole table."),
  );
}

// ---------------------------------------------------------------- measure

function selectedPoint(table) {
  const token = table.scene.tokens.find((entry) => entry.actorId === table.selectedActorId);
  return token ? { x: token.x, y: token.y, actorId: token.actorId } : null;
}
function pressPoint(table, e) {
  const g = e.target.closest?.("[data-actor]");
  const token = g && table.scene.tokens.find((entry) => entry.actorId === g.dataset.actor);
  const p = table.point(e);
  return token ? { x: token.x, y: token.y, actorId: token.actorId } : { x: p.x, y: p.y };
}
/**
 * A template from a drag: origin, direction and size, whatever the shape. The size snaps
 * to whole cells (1,5 m / 5 ft) as Foundry templates snap to the grid (FVT-116); Shift
 * keeps the free size, as Shift skips snapping in Foundry.
 */
function templateArea(scene, shape, start, p, free = false) {
  const d = dragArea(scene, shape === "circle" ? "circle" : "cone", start, p);
  return {
    shape,
    origin: d.origin,
    angle: d.angle,
    size: D.snapSize(scene, d.size, free),
    width: 1.5,
  };
}
function dragArea(scene, shape, start, p) {
  if (shape === "line")
    return {
      shape,
      points: [
        { x: start.x, y: start.y },
        { x: p.x, y: p.y },
      ],
    };
  return {
    shape,
    origin: { x: start.x, y: start.y },
    angle: shape === "circle" ? 0 : D.angleOf(start, p),
    size: Math.max(0.1, Math.round(D.distanceM(scene, start, p) * 10) / 10),
  };
}
function live(html) {
  if (ui.liveEl?.isConnected) ui.liveEl.innerHTML = html;
}
/**
 * Token to token with different elevations: the straight line in space next to the flat
 * reading (" · 3,4 m con la quota (↑ 3 m)"), as the Distances list counts it (VTL-137).
 * The Table's action ranges still measure flat: the flat value stays first.
 */
function elevationNote(ctx, table, fromActorId, toActorId) {
  if (!fromActorId || !toActorId || fromActorId === toActorId) return "";
  const row = D.distanceRows(ctx.state, table.scene.id, fromActorId, ctx.role).find(
    (entry) => entry.actorId === toActorId,
  );
  if (!row?.dz) return "";
  return ` · ${fmt(ctx, row.meters)} m ${ctx.t("con la quota", "with elevation")} (${row.dz > 0 ? "↑" : "↓"} ${fmt(ctx, Math.abs(row.dz))} m)`;
}
function linePreview(ctx, table, p, overActorId = null) {
  const scene = table.scene;
  const base =
    ui.measure && ui.measure.shape === "line" && !ui.measure.frozen ? ui.measure.points : null;
  const from = selectedPoint(table);
  const start = base ?? (from ? [from] : null);
  if (!start) {
    table.message(
      ctx.t(
        "Seleziona una pedina o trascina da un punto per misurare.",
        "Select a token or drag from a point to measure.",
      ),
    );
    return;
  }
  const measure = { shape: "line", points: [...start, { x: p.x, y: p.y }] };
  const extra = base ? "" : elevationNote(ctx, table, from?.actorId, overActorId);
  live(measureSvg(ctx, scene, measure, { colour: D.identityColour(ctx.role), local: true, extra }));
  table.message(D.measureSummary(scene, measure, ctx.lang) + extra);
}
/** Pins a measurement (double-click or Enter: Owlbear permanent ruler, VTL-134/135). */
function freeze(ctx, table, measure) {
  ui.measure = { ...measure, sceneId: table.scene.id, frozen: true };
  if (pref(ctx, "measure-share") === true) publishMeasure(ctx, table, ui.measure);
  else ctx.render();
  ui.table?.message(D.measureSummary(table.scene, measure, ctx.lang));
}
// Shared measurements are not game actions: out of the gameplay Undo and of the others'
// log (the author keeps a private line); the slice's afterUndo keeps them.
const MEASURE_COMMIT = Object.freeze({ undoable: false, visibility: "private" });
function publishMeasure(ctx, table, measure) {
  const summary = D.measureSummary(table.scene, measure, ctx.lang);
  const ok = run(
    ctx,
    `${ctx.t("Misura condivisa", "Measurement shared")}: ${summary}`,
    (s) =>
      D.shareMeasure(s, ctx.role, {
        ...measure,
        sceneId: table.scene.id,
        asActorId: acting(ctx, table),
      }),
    MEASURE_COMMIT,
  );
  if (ok) {
    if (measure.shape === "rings") ui.rings = null;
    else ui.measure = null;
  }
  return ok;
}
/**
 * A drag measurement is temporary (Owlbear and DDB rulers go on release, VTL-135/DDB-124).
 * Shared, it is broadcast while dragging and fades shortly after release (Roll20 Measure
 * broadcast, R20-136): nothing is stored, logged or undone.
 */
function broadcastMeasure(ctx, table, measure) {
  if (pref(ctx, "measure-share") !== true || ctx.offline) return false;
  const end = measure.shape === "line" ? measure.points.at(-1) : measure.origin;
  const actorId = acting(ctx, table);
  try {
    bus.send({
      kind: "measure",
      from: ctx.role,
      name: actorId ? actorName(ctx, actorId) : identityName(ctx.state, ctx.role, ctx.lang),
      sceneId: table.scene.id,
      x: end.x,
      y: end.y,
      measure,
    });
    return true;
  } catch {
    return false;
  }
}
function releaseDrag(ctx, table, measure) {
  live("");
  const summary = D.measureSummary(table.scene, measure, ctx.lang);
  const shared = pref(ctx, "measure-share") === true;
  if (shared && ctx.offline) {
    const text = ctx.t(
      "Sei senza rete: la misura è rimasta solo tua.",
      "You are offline: the measurement stayed yours only.",
    );
    ctx.toast(text, true);
    table.message(`${summary} · ${text}`);
    return;
  }
  if (shared && broadcastMeasure(ctx, table, measure)) ctx.render();
  ui.table?.message(
    `${summary} · ${
      shared
        ? ctx.t("mostrata al tavolo mentre trascinavi", "shown to the table while you dragged")
        : measure.shape === "line"
          ? ctx.t(
              "temporanea: per fissarla clic per i tratti, poi doppio clic o Invio",
              "temporary: to pin it click the legs, then double-click or Enter",
            )
          : ctx.t(
              "temporanea: frecce e Invio la fissano; un'area che resta è una Sagoma",
              "temporary: arrow keys and Enter pin it; an area that stays is a Template",
            )
    }`,
  );
}
function toggleShare(ctx, table) {
  const next = pref(ctx, "measure-share") !== true;
  const own = D.ownSharedMeasure(ctx.state, table.scene.id, ctx.role);
  const local = ui.measure?.frozen ? ui.measure : ui.rings;
  remember(ctx, "measure-share", next);
  if (next && local) publishMeasure(ctx, table, local);
  else if (!next && own) {
    const { id, sceneId, shape } = own;
    if (
      run(
        ctx,
        ctx.t("Misura non più condivisa", "Measurement no longer shared"),
        (s) => D.removeSharedMeasure(s, ctx.role, id),
        MEASURE_COMMIT,
      )
    ) {
      if (shape === "rings") ui.rings = { ...own, sceneId };
      else ui.measure = { ...own, sceneId, frozen: true };
      ctx.render();
    }
  }
}
function clearMeasure(ctx, table) {
  ui.measure = null;
  ui.rings = null;
  ui.cursor = null;
  const own = D.ownSharedMeasure(ctx.state, table.scene.id, ctx.role);
  if (own)
    run(
      ctx,
      ctx.t("Misura tolta", "Measurement cleared"),
      (s) => D.removeSharedMeasure(s, ctx.role, own.id),
      MEASURE_COMMIT,
    );
  else ctx.render();
}
const ringsAt = (ctx, table, at) => ({
  sceneId: table.scene.id,
  shape: "rings",
  origin: { x: at.x, y: at.y },
  radii: ringPresets(ctx),
  theme: ringTheme(ctx),
  actorId: at.actorId ?? null,
});
function placeRings(ctx, table, at) {
  live("");
  ui.rings = ringsAt(ctx, table, at);
  if (pref(ctx, "measure-share") === true) publishMeasure(ctx, table, ui.rings);
  else ctx.render();
  ui.table?.message(
    `${ctx.t("Anelli di gittata", "Range rings")}: ${D.measureSummary(table.scene, ui.rings ?? { shape: "rings", radii: ringPresets(ctx) }, ctx.lang)}`,
  );
}
const measureTool = {
  id: "measure",
  replaces: true,
  label: L("Misura", "Measure"),
  icon: "ruler",
  deactivate() {
    ui.gesture = null;
    ui.cursor = null;
    live("");
    if (ui.measure && !ui.measure.frozen) ui.measure = null;
  },
  onPointerDown(ctx, e, table) {
    if (e.button !== 0) return;
    e.preventDefault?.();
    const start = pressPoint(table, e);
    ui.gesture = { tool: "measure", start, moved: false, id: e.pointerId, sentAt: 0 };
    table.svg.setPointerCapture?.(e.pointerId);
    // Owlbear Ranges: holding shows the rings (VTL-136); the release places them.
    if (pref(ctx, "measure-shape") === "rings")
      live(ringsSvg(ctx, table.scene, ringsAt(ctx, table, start)));
  },
  onPointerMove(ctx, e, table) {
    const p = table.point(e);
    const shape = pref(ctx, "measure-shape");
    const g = ui.gesture;
    if (g?.tool === "measure") {
      if (!g.moved && Math.hypot(p.x - g.start.x, p.y - g.start.y) > 6) g.moved = true;
      if (!g.moved || shape === "rings") return;
      const measure = dragArea(table.scene, shape, g.start, p);
      live(
        measureSvg(ctx, table.scene, measure, {
          colour: D.identityColour(ctx.role),
          local: true,
          lift: fingerLift(table, e),
          textScale: fingerTextScale(table, e),
        }),
      );
      table.message(D.measureSummary(table.scene, measure, ctx.lang));
      // Shared: broadcast while dragging, throttled like the pointer.
      const now = Date.now();
      if (now - g.sentAt > 150) {
        g.sentAt = now;
        broadcastMeasure(ctx, table, measure);
      }
      return;
    }
    if (shape === "line" && !ui.measure?.frozen) linePreview(ctx, table, p, onToken(e));
  },
  onPointerUp(ctx, e, table) {
    const g = ui.gesture;
    ui.gesture = null;
    if (g?.tool !== "measure") return;
    const shape = pref(ctx, "measure-shape");
    const p = table.point(e);
    if (shape === "rings") return placeRings(ctx, table, g.start);
    if (g.moved) return releaseDrag(ctx, table, dragArea(table.scene, shape, g.start, p));
    if (shape !== "line") {
      table.message(
        ctx.t(
          "Trascina dall'origine per dare direzione e misura.",
          "Drag from the origin to set direction and size.",
        ),
      );
      return;
    }
    // Click: a new leg; a quick second click on the same spot confirms (double-click).
    const now = Date.now();
    const last = ui.lastClick;
    ui.lastClick = { at: now, x: p.x, y: p.y };
    if (
      last &&
      now - last.at < 400 &&
      Math.hypot(p.x - last.x, p.y - last.y) < 8 &&
      ui.measure &&
      !ui.measure.frozen
    ) {
      ui.lastClick = null;
      return freeze(ctx, table, { shape: "line", points: ui.measure.points });
    }
    const base =
      ui.measure && !ui.measure.frozen
        ? ui.measure.points
        : [selectedPoint(table) ?? { x: p.x, y: p.y }];
    const points = [...base, { x: p.x, y: p.y }].map(({ x, y }) => ({ x, y }));
    ui.measure = { sceneId: table.scene.id, shape: "line", points, frozen: false };
    ctx.render();
    ui.table?.message(D.measureSummary(table.scene, { shape: "line", points }, ctx.lang));
  },
  onClick() {},
  onKeyDown(ctx, e, table) {
    const shape = pref(ctx, "measure-shape");
    if (e.key === "Backspace" && ui.measure && !ui.measure.frozen) {
      e.preventDefault();
      const points = ui.measure.points.slice(0, -1);
      ui.measure = points.length >= 2 ? { ...ui.measure, points } : null;
      ctx.render();
      return;
    }
    if (moveCursor(ctx, e, table)) {
      const origin = selectedPoint(table);
      if (!origin || shape === "rings") return;
      if (shape === "line") linePreview(ctx, table, ui.cursor);
      else {
        const measure = dragArea(table.scene, shape, origin, ui.cursor);
        live(
          measureSvg(ctx, table.scene, measure, {
            colour: D.identityColour(ctx.role),
            local: true,
          }),
        );
        table.message(D.measureSummary(table.scene, measure, ctx.lang));
      }
      return;
    }
    if (e.key !== "Enter" || onToken(e)) return;
    e.preventDefault();
    const origin = selectedPoint(table);
    if (shape === "rings")
      return placeRings(
        ctx,
        table,
        ui.cursor ?? origin ?? { x: table.scene.width / 2, y: table.scene.height / 2 },
      );
    if (shape === "line") {
      const base = ui.measure && !ui.measure.frozen ? ui.measure.points : origin ? [origin] : [];
      const points = [...base, ...(ui.cursor ? [ui.cursor] : [])].map(({ x, y }) => ({ x, y }));
      ui.cursor = null;
      if (points.length >= 2) return freeze(ctx, table, { shape: "line", points });
      return table.message(
        ctx.t(
          "Usa le frecce per scegliere il punto, poi Invio.",
          "Use the arrow keys to choose the point, then Enter.",
        ),
      );
    }
    if (origin && ui.cursor) {
      const area = dragArea(table.scene, shape, origin, ui.cursor);
      ui.cursor = null;
      return freeze(ctx, table, area);
    }
    table.message(
      ctx.t(
        "Usa le frecce per scegliere direzione e misura, poi Invio.",
        "Use the arrow keys for direction and size, then Enter.",
      ),
    );
  },
};
const onToken = (e) => e.target.closest?.("[data-actor]")?.dataset.actor ?? null;
/** Arrow keys move a keyboard cursor one cell, starting at the selected token. */
function moveCursor(ctx, e, table) {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return false;
  e.preventDefault();
  const step = table.scene.gridSize || 50;
  const from = ui.cursor ??
    selectedPoint(table) ?? { x: table.scene.width / 2, y: table.scene.height / 2 };
  ui.cursor = {
    x: Math.max(
      0,
      Math.min(
        table.scene.width,
        from.x + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0),
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        table.scene.height,
        from.y + (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0),
      ),
    ),
  };
  const cursor = table.svg.querySelector(".annotations-cursor");
  if (cursor) cursor.setAttribute("transform", `translate(${f1(ui.cursor.x)},${f1(ui.cursor.y)})`);
  else
    live(
      `<g class="annotations-cursor" transform="translate(${f1(ui.cursor.x)},${f1(ui.cursor.y)})"><circle r="9"/><path d="M-16 0H16M0-16V16"/></g>`,
    );
  return true;
}

// ---------------------------------------------------------------- pointer

const pointerTool = {
  id: "pointer",
  replaces: true,
  label: L("Puntatore", "Pointer"),
  icon: "flag",
  deactivate() {
    ui.gesture = null;
    ui.cursor = null;
  },
  onPointerDown(ctx, e, table) {
    if (e.button !== 0) return;
    e.preventDefault?.();
    const reason = D.permissionReason("pointer", ctx.role, permissions(ctx));
    if (reason) return table.message(ctx.label(reason));
    if (ctx.offline) {
      const text = ctx.t(
        "Sei senza rete: il segnale non partirebbe.",
        "You are offline: the signal would not be sent.",
      );
      ctx.toast(text, true);
      return table.message(text);
    }
    const p = table.point(e);
    ui.gesture = {
      tool: "pointer",
      start: p,
      moved: false,
      trail: [p],
      alt: e.altKey,
      shift: e.shiftKey,
      sentAt: 0,
    };
    table.svg.setPointerCapture?.(e.pointerId);
  },
  onPointerMove(ctx, e, table) {
    const g = ui.gesture;
    if (g?.tool !== "pointer") return;
    const p = table.point(e);
    if (!g.moved && Math.hypot(p.x - g.start.x, p.y - g.start.y) > 6) g.moved = true;
    if (!g.moved) return;
    const last = g.trail.at(-1);
    if (Math.hypot(p.x - last.x, p.y - last.y) >= 4) g.trail.push({ x: p.x, y: p.y });
    const colour = D.identityColour(ctx.role);
    live(
      `<g class="annotations-laser is-live" style="--annot-colour:${colour}"><polyline points="${pts(g.trail.slice(-60))}"/><circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="6"/></g>`,
    );
    // Owlbear pointer: transmitted while held (throttled), not only on release.
    const now = Date.now();
    if (now - g.sentAt > 150) {
      g.sentAt = now;
      const actorId = acting(ctx, table);
      try {
        bus.send({
          kind: "laser",
          from: ctx.role,
          name: actorId ? actorName(ctx, actorId) : identityName(ctx.state, ctx.role, ctx.lang),
          sceneId: table.scene.id,
          x: p.x,
          y: p.y,
          trail: g.trail,
        });
      } catch {
        /* refused signals are reported on release */
      }
    }
  },
  onPointerUp(ctx, e, table) {
    const g = ui.gesture;
    ui.gesture = null;
    if (g?.tool !== "pointer") return;
    if (g.moved) {
      const end = g.trail.at(-1);
      if (sendSignal(ctx, table, { kind: "laser", x: end.x, y: end.y, trail: g.trail })) {
        ctx.render();
        ui.table?.message(
          ctx.t("Puntatore mostrato a tutto il tavolo.", "Pointer shown to the whole table."),
        );
      } else live("");
      return;
    }
    const mode = pref(ctx, "pointer-mode");
    const kind = g.alt ? "alert" : g.shift && ctx.role === "dm" ? "recall" : mode;
    pingAt(ctx, table, g.start, kind);
  },
  onClick() {},
  onKeyDown(ctx, e, table) {
    if (moveCursor(ctx, e, table)) return;
    if (e.key !== "Enter" || onToken(e)) return;
    e.preventDefault();
    const p = ui.cursor ??
      selectedPoint(table) ?? { x: table.scene.width / 2, y: table.scene.height / 2 };
    ui.cursor = null;
    pingAt(
      ctx,
      table,
      p,
      e.altKey ? "alert" : e.shiftKey && ctx.role === "dm" ? "recall" : pref(ctx, "pointer-mode"),
    );
  },
};

// ---------------------------------------------------------------- draw

function commitMark(ctx, table, kind, points, text = "") {
  const names = {
    free: L("tratto a mano libera", "freehand stroke"),
    arrow: L("freccia", "arrow"),
    rect: L("rettangolo", "rectangle"),
    ellipse: L("ellisse", "ellipse"),
    text: L("testo", "text"),
  };
  return run(ctx, `${ctx.t("Disegno aggiunto", "Drawing added")}: ${ctx.label(names[kind])}`, (s) =>
    D.addMark(
      s,
      ctx.role,
      {
        sceneId: table.scene.id,
        kind,
        points,
        text,
        color: pref(ctx, "draw-color"),
        width: Number(pref(ctx, "draw-width")),
        asActorId: acting(ctx, table),
      },
      { perms: permissions(ctx) },
    ),
  );
}
function openTextDialog(ctx, table, p) {
  const scene = table.scene;
  ctx.dialog(
    ctx.t("Testo sulla mappa", "Text on the map"),
    `<label class="field">${ctx.t("Testo", "Text")}<input name="text" maxlength="140" required autocomplete="off"></label><div class="form-grid"><label class="field">X<input name="x" type="number" step="any" min="0" max="${scene.width}" value="${f1(p.x)}"></label><label class="field">Y<input name="y" type="number" step="any" min="0" max="${scene.height}" value="${f1(p.y)}"></label></div><p class="muted">${ctx.t("Resta sulla mappa finché tu o il DM lo cancellate. Lo vedono tutti al tavolo.", "It stays on the map until you or the DM erase it. Everyone at the table sees it.")}</p>`,
    {
      submitLabel: ctx.t("Aggiungi testo", "Add text"),
      onSubmit: (data) => {
        const text = String(data.get("text") ?? "").trim();
        const point = { x: Number(data.get("x")), y: Number(data.get("y")) };
        ctx.commit(
          `${ctx.t("Disegno aggiunto", "Drawing added")}: ${ctx.t("testo", "text")}`,
          (s) =>
            D.addMark(
              s,
              ctx.role,
              {
                sceneId: scene.id,
                kind: "text",
                points: [point],
                text,
                color: pref(ctx, "draw-color"),
                width: Number(pref(ctx, "draw-width")),
                asActorId: acting(ctx, table),
              },
              { perms: permissions(ctx) },
            ),
        );
      },
    },
  );
}
const drawTool = {
  id: DRAW_TOOL,
  label: L("Disegna", "Draw"),
  icon: "pen",
  group: "draw",
  order: 52,
  deactivate() {
    ui.gesture = null;
    ui.cursor = null;
    ui.swatches = null;
  },
  onPointerDown(ctx, e, table) {
    if (e.button !== 0) return;
    e.preventDefault?.();
    const reason = D.permissionReason("draw", ctx.role, permissions(ctx));
    if (reason) {
      table.message(ctx.label(reason));
      return;
    }
    const mode = pref(ctx, "draw-mode");
    const p = table.point(e);
    if (mode === "erase") {
      const mark = D.visibleMarks(ctx.state, table.scene.id, ctx.role)
        .reverse()
        .find((entry) => D.markContains(entry, p));
      if (!mark)
        return table.message(ctx.t("Nessun disegno in questo punto.", "No drawing at this point."));
      if (!mark.canErase)
        return table.message(
          ctx.t(
            "È di un altro: l'autore ne è il proprietario. Il DM può nasconderlo.",
            "It belongs to someone else: the author owns it. The DM can hide it.",
          ),
        );
      run(ctx, ctx.t("Disegno cancellato", "Drawing erased"), (s) =>
        D.removeMark(s, ctx.role, mark.id),
      );
      return;
    }
    ui.gesture = {
      tool: "draw",
      mode,
      points: [{ x: p.x, y: p.y }],
      moved: false,
      target: e.target.closest?.("[data-actor]")?.dataset.actor ?? null,
    };
    table.svg.setPointerCapture?.(e.pointerId);
  },
  onPointerMove(ctx, e, table) {
    const g = ui.gesture;
    if (g?.tool !== "draw" || g.mode === "text") return;
    const p = table.point(e);
    const start = g.points[0];
    if (!g.moved && Math.hypot(p.x - start.x, p.y - start.y) > 4) g.moved = true;
    if (!g.moved) return;
    if (g.mode === "free") {
      const last = g.points.at(-1);
      if (Math.hypot(p.x - last.x, p.y - last.y) >= 2) g.points.push({ x: p.x, y: p.y });
    } else g.points = [start, { x: p.x, y: p.y }];
    live(
      markSvg(ctx, {
        id: "live",
        kind: g.mode,
        points: g.points,
        color: pref(ctx, "draw-color"),
        width: Number(pref(ctx, "draw-width")),
        text: "",
      }),
    );
  },
  onPointerUp(ctx, e, table) {
    const g = ui.gesture;
    ui.gesture = null;
    if (g?.tool !== "draw") return;
    if (g.mode === "text") {
      // Owlbear Tooltips: the Text tool on a token writes the token's note.
      if (g.target) return openTooltipDialog(ctx, g.target);
      return openTextDialog(ctx, table, g.points[0]);
    }
    if (!g.moved) {
      live("");
      return table.message(ctx.t("Trascina per disegnare.", "Drag to draw."));
    }
    if (!commitMark(ctx, table, g.mode, g.points)) live("");
  },
  onClick() {},
  onKeyDown(ctx, e, table) {
    const mode = pref(ctx, "draw-mode");
    if (mode === "arrow" && moveCursor(ctx, e, table)) {
      const from = selectedPoint(table);
      if (from)
        live(
          markSvg(ctx, {
            id: "live",
            kind: "arrow",
            points: [from, ui.cursor],
            color: pref(ctx, "draw-color"),
            width: Number(pref(ctx, "draw-width")),
          }),
        );
      return;
    }
    if (e.key !== "Enter") return;
    const token = onToken(e);
    if (token) {
      // Owlbear Tooltips from the keyboard: Enter on a focused token in Text mode.
      if (mode !== "text") return;
      e.preventDefault();
      return openTooltipDialog(ctx, token);
    }
    const from = selectedPoint(table);
    if (mode === "text") {
      e.preventDefault();
      return openTextDialog(
        ctx,
        table,
        from
          ? { x: from.x + 30, y: from.y - 30 }
          : { x: table.scene.width / 2, y: table.scene.height / 2 },
      );
    }
    if (mode === "arrow" && from && ui.cursor) {
      e.preventDefault();
      const to = ui.cursor;
      ui.cursor = null;
      commitMark(ctx, table, "arrow", [
        { x: from.x, y: from.y },
        { x: to.x, y: to.y },
      ]);
    }
  },
};

// ---------------------------------------------------------------- templates

function updateSelected(ctx, patch, labelText, { reveal = false } = {}) {
  const id = ui.selectedTemplate;
  const template = id && D.sliceOf(ctx.state).templates.find((t) => t.id === id);
  if (!template) return false;
  // A hidden trap's changes stay out of the shared log until it is revealed.
  const secret = template.hidden && !reveal;
  return run(
    ctx,
    labelText,
    (s) => D.updateTemplate(s, ctx.role, id, patch, { perms: permissions(ctx) }),
    secret || patch.hidden === true ? { visibility: "private" } : {},
  );
}
function deleteTemplate(ctx, template) {
  const ok = run(
    ctx,
    ctx.t("Sagoma eliminata", "Template deleted"),
    (s) => D.removeTemplate(s, ctx.role, template.id),
    template.hidden ? { visibility: "private" } : {},
  );
  if (ok && ui.selectedTemplate === template.id) {
    ui.selectedTemplate = null;
    ctx.render();
  }
}
function openTemplateName(ctx, template) {
  ctx.dialog(
    ctx.t("Nome della sagoma", "Template name"),
    `<label class="field">${ctx.t("Nome (es. Trappola)", "Name (e.g. Trap)")}<input name="label" maxlength="60" value="${ctx.esc(template.label)}" autocomplete="off"></label>`,
    {
      submitLabel: ctx.t("Salva nome", "Save name"),
      onSubmit: (data) => {
        ctx.commit(
          ctx.t("Sagoma rinominata", "Template renamed"),
          (s) =>
            D.updateTemplate(
              s,
              ctx.role,
              template.id,
              { label: String(data.get("label") ?? "") },
              { perms: permissions(ctx) },
            ),
          template.hidden ? { visibility: "private" } : {},
        );
      },
    },
  );
}
function templatePreview(ctx, table, area, extra = "") {
  const hex = D.colourHex(pref(ctx, "template-color"));
  const c = labelAnchor(table.scene, area);
  live(
    `<g class="annotations-template is-live">${areaSvg(table.scene, area, `fill="${hex}" fill-opacity=".25" stroke="${hex}" stroke-width="2.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"`)}${label(c.x, c.y, `${ctx.esc(ctx.label(D.SHAPE_LABELS[area.shape]))} ${fmt(ctx, area.size)} m${extra}`)}</g>`,
  );
  table.message(`${ctx.label(D.SHAPE_LABELS[area.shape])} · ${fmt(ctx, area.size)} m`);
}
function createTemplate(ctx, table, area) {
  const hidden = ui.newHidden && ctx.role === "dm";
  let id = null;
  const ok = run(
    ctx,
    `${ctx.t("Sagoma aggiunta", "Template added")}: ${ctx.label(D.SHAPE_LABELS[area.shape])} ${fmt(ctx, area.size)} m`,
    (s) => {
      id = D.addTemplate(
        s,
        ctx.role,
        {
          ...area,
          sceneId: table.scene.id,
          color: pref(ctx, "template-color"),
          pattern: pref(ctx, "template-pattern"),
          hidden,
          asActorId: acting(ctx, table),
        },
        { perms: permissions(ctx) },
      ).id;
      ui.selectedTemplate = id;
    },
    hidden ? { visibility: "private" } : {},
  );
  if (!ok) live("");
  return ok;
}
function nudgeTemplate(ctx, table, template, patch) {
  if (template.locked) {
    table.message(
      ctx.t(
        "Sagoma bloccata: non si sposta. Sbloccala con Maiusc+L.",
        "Template locked: it does not move. Unlock it with Shift+L.",
      ),
    );
    return;
  }
  updateSelected(ctx, patch, ctx.t("Sagoma modificata", "Template changed"));
}
const templateTool = {
  id: TEMPLATE_TOOL,
  label: L("Sagoma", "Template"),
  icon: "shape",
  group: "measure",
  order: 54,
  deactivate() {
    ui.gesture = null;
    ui.cursor = null;
    ui.swatches = null;
  },
  onPointerDown(ctx, e, table) {
    if (e.button !== 0) return;
    e.preventDefault?.();
    const p = table.point(e);
    const scene = table.scene;
    // Player templates switched off: a player's own templates can be selected, not changed.
    const reason = D.permissionReason("template", ctx.role, permissions(ctx));
    const current =
      ui.selectedTemplate &&
      D.visibleTemplates(ctx.state, scene.id, ctx.role).find((t) => t.id === ui.selectedTemplate);
    if (current?.canEdit && !current.locked && !reason) {
      const tip = D.areaGeometry(scene, current).tip;
      if (Math.hypot(p.x - tip.x, p.y - tip.y) <= 16) {
        ui.gesture = {
          tool: "template",
          kind: "resize",
          id: current.id,
          template: current,
          moved: false,
          start: p,
        };
        table.svg.setPointerCapture?.(e.pointerId);
        return;
      }
    }
    const hit = D.templateAt(ctx.state, scene.id, ctx.role, p);
    if (hit) {
      const changed = ui.selectedTemplate !== hit.id;
      ui.selectedTemplate = hit.id;
      if (hit.locked) {
        ctx.render();
        ui.table?.message(
          ctx.t("Sagoma bloccata: non si sposta.", "Template locked: it does not move."),
        );
        return;
      }
      ui.gesture = {
        tool: "template",
        kind: hit.canEdit && !reason ? "move" : "select",
        id: hit.id,
        template: hit,
        start: p,
        moved: false,
        changed,
        reason: hit.canEdit ? reason : null,
      };
      table.svg.setPointerCapture?.(e.pointerId);
      return;
    }
    if (reason) return table.message(ctx.label(reason));
    ui.gesture = {
      tool: "template",
      kind: "create",
      start: p,
      moved: false,
      deselected: Boolean(ui.selectedTemplate),
    };
    table.svg.setPointerCapture?.(e.pointerId);
  },
  onPointerMove(ctx, e, table) {
    const g = ui.gesture;
    if (g?.tool !== "template") return;
    const p = table.point(e);
    if (!g.moved && Math.hypot(p.x - g.start.x, p.y - g.start.y) > 6) g.moved = true;
    if (!g.moved) return;
    if (g.kind === "create") {
      g.area = templateArea(table.scene, pref(ctx, "template-shape"), g.start, p, e.shiftKey);
      templatePreview(ctx, table, g.area);
    } else if (g.kind === "move") {
      g.origin = {
        x: g.template.origin.x + p.x - g.start.x,
        y: g.template.origin.y + p.y - g.start.y,
      };
      templatePreview(ctx, table, { ...g.template, origin: g.origin });
    } else if (g.kind === "resize") {
      const o = g.template.origin;
      g.patch = {
        angle: g.template.shape === "circle" ? g.template.angle : D.angleOf(o, p),
        size: D.snapSize(table.scene, D.distanceM(table.scene, o, p), e.shiftKey),
      };
      templatePreview(ctx, table, { ...g.template, ...g.patch });
    }
  },
  onPointerUp(ctx, e, table) {
    const g = ui.gesture;
    ui.gesture = null;
    if (g?.tool !== "template") return;
    if (g.kind === "create") {
      if (!g.moved || !g.area || g.area.size < 0.5) {
        live("");
        if (g.deselected) {
          ui.selectedTemplate = null;
          ctx.render();
        }
        return table.message(
          ctx.t(
            "Trascina dall'origine per creare la sagoma.",
            "Drag from the origin to create the template.",
          ),
        );
      }
      return createTemplate(ctx, table, g.area);
    }
    if (g.kind === "move" && g.moved)
      return updateSelected(ctx, { origin: g.origin }, ctx.t("Sagoma spostata", "Template moved"));
    if (g.kind === "resize" && g.moved && g.patch)
      return updateSelected(
        ctx,
        g.patch,
        ctx.t("Sagoma ruotata o ridimensionata", "Template rotated or resized"),
      );
    live("");
    ctx.render();
    if (g.kind === "select" && g.moved && g.reason) ui.table?.message(ctx.label(g.reason));
  },
  onClick() {},
  onKeyDown(ctx, e, table) {
    const template =
      ui.selectedTemplate &&
      D.visibleTemplates(ctx.state, table.scene.id, ctx.role).find(
        (t) => t.id === ui.selectedTemplate,
      );
    if (template?.canEdit) {
      const step = table.scene.gridSize || 50;
      const o = template.origin;
      const moves = {
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
      };
      if (moves[e.key]) {
        e.preventDefault();
        return nudgeTemplate(ctx, table, template, {
          origin: { x: o.x + moves[e.key][0], y: o.y + moves[e.key][1] },
        });
      }
      if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        return nudgeTemplate(ctx, table, template, {
          angle: template.angle + (e.key === "]" ? 15 : -15),
        });
      }
      if (e.key === "+" || e.key === "=" || e.key === "-") {
        e.preventDefault();
        return nudgeTemplate(ctx, table, template, {
          size: Math.max(0.5, template.size + (e.key === "-" ? -1.5 : 1.5)),
        });
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        return deleteTemplate(ctx, template);
      }
      if (e.shiftKey && (e.key === "L" || e.key === "l")) {
        e.preventDefault();
        return updateSelected(
          ctx,
          { locked: !template.locked },
          template.locked
            ? ctx.t("Sagoma sbloccata", "Template unlocked")
            : ctx.t("Sagoma bloccata", "Template locked"),
        );
      }
      return;
    }
    if (moveCursor(ctx, e, table)) {
      const origin = selectedPoint(table);
      if (origin)
        templatePreview(
          ctx,
          table,
          templateArea(table.scene, pref(ctx, "template-shape"), origin, ui.cursor),
        );
      return;
    }
    if (e.key === "Enter" && !onToken(e) && ui.cursor && selectedPoint(table)) {
      e.preventDefault();
      const area = templateArea(
        table.scene,
        pref(ctx, "template-shape"),
        selectedPoint(table),
        ui.cursor,
      );
      ui.cursor = null;
      if (area.size >= 0.5) createTemplate(ctx, table, area);
    }
  },
};

// ---------------------------------------------------------------- dialogs (auras, notes, elevation)

const AURA_DEFAULTS = Object.freeze({
  radius: 3,
  shape: "circle",
  color: "teal",
  opacity: 0.25,
  label: "",
  audience: "all",
});
/**
 * Owlbear "Add Aura" (VTL-140) adds a new aura; Roll20 keeps each of the two auras in its
 * own slot (R20-133). The dialog opens on "New aura" while the token has fewer than two;
 * editing starts from an aura's own row (Edit) or the drawer, never silently from the
 * first one. `auraId` opens that aura for editing.
 */
export function openAuraDialog(ctx, actorId, { auraId = null } = {}) {
  const actor = ctx.state.actors?.[actorId];
  if (!actor || !ctx.canControl(actor)) {
    ctx.toast(
      ctx.t("Seleziona una creatura che controlli.", "Select a creature you control."),
      true,
    );
    return;
  }
  const auras = D.aurasOf(ctx.state, actorId, ctx.role);
  const canEdit = (aura) => aura.author === ctx.role || ctx.role === "dm";
  const editable = auras.filter(canEdit);
  const full = auras.length >= D.MAX_AURAS_PER_TOKEN;
  const start = editable.find((aura) => aura.id === auraId) ?? (full ? editable[0] : null) ?? null;
  const v = start ?? AURA_DEFAULTS;
  const name = (aura) => aura.label || ctx.t("Aura", "Aura");
  const colours = D.COLOURS.map(
    ([id, , colour]) =>
      `<option value="${id}"${v.color === id ? " selected" : ""}>${ctx.esc(ctx.label(colour))}</option>`,
  ).join("");
  const list = auras.length
    ? `<ul class="annotations-list">${auras
        .map(
          (aura) =>
            `<li><span>${ctx.esc(name(aura))} · ${fmt(ctx, aura.radius)} m · ${aura.audience === "me" ? ctx.t("solo io", "only me") : ctx.t("tutti", "everyone")}</span>${
              canEdit(aura)
                ? `<div class="annotations-actions"><button type="button" class="button quiet" data-annot-aura-pick="${ctx.esc(aura.id)}">${ctx.t("Modifica", "Edit")}</button><button type="button" class="button quiet" data-annot-aura-remove="${ctx.esc(aura.id)}">${ctx.t("Rimuovi", "Remove")}</button></div>`
                : ""
            }</li>`,
        )
        .join("")}</ul>`
    : "";
  const newLabel = full
    ? ctx.t("Nuova aura (massimo due: rimuovine una)", "New aura (two at most: remove one)")
    : ctx.t("Nuova aura", "New aura");
  const choice = `<label class="field">${ctx.t("Aura da salvare", "Aura to save")}<select name="id" data-annot-aura-choice><option value=""${full ? " disabled" : ""}${start ? "" : " selected"}>${ctx.esc(newLabel)}</option>${editable.map((aura) => `<option value="${ctx.esc(aura.id)}"${aura.id === start?.id ? " selected" : ""}>${ctx.t("Modifica", "Edit")}: ${ctx.esc(name(aura))} · ${fmt(ctx, aura.radius)} m</option>`).join("")}</select></label>`;
  const submitText = (editing) =>
    editing ? ctx.t("Salva aura", "Save aura") : ctx.t("Aggiungi aura", "Add aura");
  ctx.dialog(
    `${ctx.t("Aura", "Aura")} · ${actor.name}`,
    `${list}${choice}<div class="form-grid"><label class="field">${ctx.t("Distanza (m)", "Distance (m)")}<input name="radius" type="number" min="0.5" max="60" step="0.5" value="${v.radius}" required></label><label class="field">${ctx.t("Forma", "Shape")}<select name="shape"><option value="circle">${ctx.t("Cerchio", "Circle")}</option><option value="square"${v.shape === "square" ? " selected" : ""}>${ctx.t("Quadrato", "Square")}</option></select></label><label class="field">${ctx.t("Colore", "Colour")}<select name="color">${colours}</select></label><label class="field">${ctx.t("Opacità (%)", "Opacity (%)")}<input name="opacity" type="number" min="10" max="60" step="5" value="${Math.round(v.opacity * 100)}"></label></div><label class="field">${ctx.t("Nome (facoltativo)", "Name (optional)")}<input name="label" maxlength="40" value="${ctx.esc(v.label)}" autocomplete="off"></label><label class="field">${ctx.t("Chi la vede", "Who sees it")}<select name="audience"><option value="all">${ctx.t("Tutto il tavolo", "The whole table")}</option><option value="me"${v.audience === "me" ? " selected" : ""}>${ctx.t("Solo io", "Only me")}</option></select></label><p class="muted">${ctx.t("Un'emanazione si estende dalla creatura in ogni direzione e si muove con essa (SRD 5.2.1, glossario, Emanazione: EN p. 181, IT p. 207). Il raggio disegnato è la distanza più metà dello spazio della creatura. Al massimo due aure per pedina.", "An Emanation extends from the creature in every direction and moves with it (SRD 5.2.1 glossary, Emanation: EN p. 181, IT p. 207). The drawn radius is the distance plus half the creature's space. At most two auras per token.")}</p>`,
    {
      submitLabel: submitText(Boolean(start)),
      onSubmit: (data) => {
        const input = {
          id: String(data.get("id") || "") || undefined,
          actorId,
          radius: Number(String(data.get("radius")).replace(",", ".")),
          shape: data.get("shape"),
          color: data.get("color"),
          opacity: Number(data.get("opacity")) / 100,
          label: data.get("label"),
          audience: data.get("audience"),
        };
        const previous = input.id ? auras.find((aura) => aura.id === input.id) : null;
        // Local (allowed offline) only while it stays "Only me" (see the token note).
        const local = input.audience === "me" && (!previous || previous.audience === "me");
        ctx.commit(
          `${ctx.t("Aura", "Aura")}: ${actor.name} · ${fmt(ctx, input.radius)} m`,
          (s) => D.setAura(s, ctx.role, input),
          local ? { local: true, visibility: "private" } : {},
        );
      },
    },
  );
  const form = globalThis.document?.querySelector("#dialog form");
  if (!form) return;
  const field = (key) => form.elements.namedItem(key);
  const fill = (aura) => {
    const values = aura ?? AURA_DEFAULTS;
    field("radius").value = String(values.radius);
    field("shape").value = values.shape;
    field("color").value = values.color;
    field("opacity").value = String(Math.round(values.opacity * 100));
    field("label").value = values.label;
    field("audience").value = values.audience;
    const submit = form.querySelector('footer [type="submit"]');
    if (submit) submit.textContent = submitText(Boolean(aura));
  };
  field("id")?.addEventListener("change", (e) =>
    fill(editable.find((aura) => aura.id === e.target.value) ?? null),
  );
  form.querySelectorAll("[data-annot-aura-pick]").forEach((b) =>
    b.addEventListener("click", () => {
      field("id").value = b.dataset.annotAuraPick;
      fill(editable.find((aura) => aura.id === b.dataset.annotAuraPick) ?? null);
      field("radius").focus();
    }),
  );
  form.querySelectorAll("[data-annot-aura-remove]").forEach((b) =>
    b.addEventListener("click", () => {
      const aura = auras.find((entry) => entry.id === b.dataset.annotAuraRemove);
      if (
        run(
          ctx,
          `${ctx.t("Aura rimossa", "Aura removed")}: ${actor.name}`,
          (s) => D.removeAura(s, ctx.role, b.dataset.annotAuraRemove),
          aura?.audience === "me" ? { local: true, visibility: "private" } : {},
        )
      )
        ctx.closeDialog();
    }),
  );
}
export function openTooltipDialog(ctx, actorId) {
  const actor = ctx.state.actors?.[actorId];
  const scene = D.sceneOf(ctx.state);
  if (!actor || !D.observable(ctx.state, scene, actorId, ctx.role)) return;
  const own = D.visibleTooltips(ctx.state, actorId, ctx.role).find((tip) => tip.own);
  ctx.dialog(
    `${ctx.t("Nota sulla pedina", "Token note")} · ${actor.name}`,
    `<label class="field">${ctx.t("Nota (appare al passaggio del puntatore)", "Note (shown on hover)")}<textarea name="text" maxlength="280" rows="3" required>${ctx.esc(own?.text ?? "")}</textarea></label><label class="field">${ctx.t("Chi la vede", "Who sees it")}<select name="audience"><option value="all">${ctx.t("Tutto il tavolo", "The whole table")}</option><option value="me"${own?.audience === "me" ? " selected" : ""}>${ctx.t("Solo io", "Only me")}</option></select></label><p class="muted">${ctx.t("«Solo io» resta tua: nessun altro, DM compreso, la legge.", "“Only me” stays yours: nobody else, the DM included, reads it.")}</p>${own ? `<button type="button" class="button quiet" data-annot-tip-delete>${ctx.t("Rimuovi la nota", "Remove the note")}</button>` : ""}`,
    {
      submitLabel: ctx.t("Salva nota", "Save note"),
      onSubmit: (data) => {
        const audience = data.get("audience") === "me" ? "me" : "all";
        const asActorId = D.actingAs(ctx.state, ctx.role, ui.table?.selectedActorId);
        // Local (allowed offline) only while it stays "Only me": withdrawing a shared note
        // from the table, or sharing a private one, is a shared change.
        const local = audience === "me" && (!own || own.audience === "me");
        ctx.commit(
          `${ctx.t("Nota sulla pedina", "Token note")}: ${actor.name}`,
          (s) =>
            D.setTooltip(s, ctx.role, { actorId, text: data.get("text"), audience, asActorId }),
          local ? { local: true, visibility: "private" } : {},
        );
      },
    },
  );
  globalThis.document
    ?.querySelector("#dialog [data-annot-tip-delete]")
    ?.addEventListener("click", () => {
      if (
        run(
          ctx,
          ctx.t("Nota sulla pedina rimossa", "Token note removed"),
          (s) => D.removeTooltip(s, ctx.role, own.id),
          own.audience === "me" ? { local: true, visibility: "private" } : {},
        )
      )
        ctx.closeDialog();
    });
}
export function openElevationDialog(ctx, actorId) {
  const scene = D.sceneOf(ctx.state);
  const token = scene?.tokens.find((entry) => entry.actorId === actorId);
  const actor = ctx.state.actors?.[actorId];
  if (!token || !actor || !ctx.canControl(actor)) {
    ctx.toast(
      ctx.t("Seleziona una creatura che controlli.", "Select a creature you control."),
      true,
    );
    return;
  }
  ctx.dialog(
    `${ctx.t("Quota", "Elevation")} · ${actor.name}`,
    `<label class="field">${ctx.t("Quota rispetto al terreno (m)", "Height above the ground (m)")}<input name="meters" type="number" step="0.5" min="-300" max="300" value="${D.elevationOf(ctx.state, token.id)}" required></label><p class="muted">${ctx.t("Compare come targhetta sulla pedina ed entra nelle distanze. Non è una regola di volo: è un'informazione di posizione.", "Shown as a badge on the token and included in distances. It is not a flying rule: it is position data.")}</p>`,
    {
      submitLabel: ctx.t("Salva quota", "Save elevation"),
      onSubmit: (data) => {
        const meters = Number(String(data.get("meters")).replace(",", "."));
        ctx.commit(`${ctx.t("Quota", "Elevation")}: ${actor.name} ${fmt(ctx, meters)} m`, (s) =>
          D.setElevation(s, ctx.role, { sceneId: scene.id, tokenId: token.id, meters }),
        );
      },
    },
  );
}

// ---------------------------------------------------------------- panels

function distancesPanel(ctx, tv) {
  const scene = tv.scene;
  const fromId = tv.selectedActorId;
  const token = scene.tokens.find((entry) => entry.actorId === fromId);
  if (!token)
    return `<p class="muted">${ctx.t("Seleziona una pedina sulla scena.", "Select a token on the scene.")}</p>`;
  const rows = D.distanceRows(ctx.state, scene.id, fromId, ctx.role);
  const z = D.elevationOf(ctx.state, token.id);
  const canEdit = ctx.canControl(ctx.state.actors[fromId]);
  const list = rows.length
    ? `<ol class="annotations-dist" aria-label="${ctx.t("Distanze, dalla più vicina", "Distances, nearest first")}">${rows
        .map(
          (row) =>
            `<li><button type="button" class="annotations-dist-row" data-annot-dist="${ctx.esc(row.actorId)}" aria-label="${ctx.esc(`${row.name}: ${row.touch ? ctx.t("a contatto", "touching") : fmt(ctx, row.meters) + " m"}${row.dz ? ", " + ctx.t("dislivello", "height difference") + " " + fmt(ctx, row.dz) + " m, " + ctx.t("in pianta", "flat") + " " + fmt(ctx, row.horizontal) + " m" : ""}. ${ctx.t("Mostra righello", "Show ruler")}`)}"><span>${ctx.esc(row.name)}</span><strong>${row.touch ? ctx.t("a contatto", "touching") : fmt(ctx, row.meters) + " m"}</strong>${row.dz ? `<small>${row.dz > 0 ? "↑" : "↓"} ${fmt(ctx, Math.abs(row.dz))} m · ${ctx.t("in pianta", "flat")} ${fmt(ctx, row.horizontal)} m</small>` : ""}</button></li>`,
        )
        .join("")}</ol>`
    : `<p class="muted">${ctx.t("Nessun'altra creatura visibile.", "No other visible creature.")}</p>`;
  return `<div class="annotations-panel" data-annot-distances><p class="annotations-dist-from">${ctx.t("Da", "From")} <strong>${ctx.esc(actorName(ctx, fromId))}</strong> · ${ctx.t("quota", "elevation")} ${fmt(ctx, z)} m${canEdit ? ` <button type="button" class="button quiet annotations-small" data-annot-elevation="${ctx.esc(fromId)}">${ctx.t("Quota…", "Elevation…")}</button>` : ""}</p>${list}<p class="muted annotations-note">${ctx.t("In linea retta dal centro, quota inclusa; con un dislivello c'è anche la distanza in pianta. Le gittate delle azioni del Tavolo (mischia compresa) misurano ancora in pianta, senza quota. Clic su una riga: righello temporaneo e vista su entrambe.", "Straight line from the centre, elevation included; with a height difference the flat distance is shown too. The Table's action ranges (melee included) still measure flat, without elevation. Click a row: temporary ruler and view on both.")}</p></div>`;
}
function bindDistances(el, ctx, table) {
  el.querySelector("[data-annot-elevation]")?.addEventListener("click", (e) =>
    openElevationDialog(ctx, e.currentTarget.dataset.annotElevation),
  );
  el.querySelectorAll("[data-annot-dist]").forEach((b) =>
    b.addEventListener("click", () => {
      const scene = table.scene;
      const a = scene.tokens.find((t) => t.actorId === table.selectedActorId);
      const other = scene.tokens.find((t) => t.actorId === b.dataset.annotDist);
      if (!a || !other) return;
      ui.tempRuler = {
        sceneId: scene.id,
        fromActorId: a.actorId,
        toActorId: other.actorId,
        until: Date.now() + 8000,
      };
      centreOn(table, { x: (a.x + other.x) / 2, y: (a.y + other.y) / 2 });
    }),
  );
}
function listPanel(ctx, tv) {
  const state = ctx.state;
  const scene = tv.scene;
  const dm = ctx.role === "dm";
  const who = (entry) => ctx.esc(D.authorName(state, entry, ctx.lang));
  const kind = {
    free: L("Tratto", "Stroke"),
    arrow: L("Freccia", "Arrow"),
    rect: L("Rettangolo", "Rectangle"),
    ellipse: L("Ellisse", "Ellipse"),
    text: L("Testo", "Text"),
  };
  const action = (attr, text, cls = "") =>
    `<button type="button" class="button quiet annotations-small ${cls}" ${attr}>${ctx.esc(text)}</button>`;
  const marks = D.visibleMarks(state, scene.id, ctx.role);
  const templates = D.visibleTemplates(state, scene.id, ctx.role);
  const measures = D.visibleMeasures(state, scene.id, ctx.role);
  const auras = D.sliceOf(state).auras.filter(
    (aura) =>
      (aura.audience === "all" || aura.author === ctx.role) &&
      D.observable(state, scene, aura.actorId, ctx.role),
  );
  const tips = scene.tokens.flatMap((token) => D.visibleTooltips(state, token.actorId, ctx.role));
  const section = (title, rows, empty) =>
    `<section class="annotations-list-section"><h3>${ctx.esc(title)}</h3>${rows.length ? `<ul class="annotations-list">${rows.join("")}</ul>` : `<p class="muted">${ctx.esc(empty)}</p>`}</section>`;
  const perms = permissions(ctx);
  const permissionsBox = dm
    ? `<section class="annotations-list-section"><h3>${ctx.t("Permessi dei giocatori", "Player permissions")}</h3>${[
        ["players-draw", perms.playersDraw, ctx.t("Possono disegnare", "They can draw")],
        [
          "players-pointer",
          perms.playersPointer,
          ctx.t("Possono usare puntatore e segnali", "They can use pointer and pings"),
        ],
        [
          "players-templates",
          perms.playersTemplates,
          ctx.t("Possono creare sagome", "They can create templates"),
        ],
      ]
        .map(
          ([id, on, text]) =>
            `<label class="annotations-check"><input type="checkbox" data-annot-perm="${id}"${on ? " checked" : ""}> ${text}</label>`,
        )
        .join(
          "",
        )}<label class="field">${ctx.t("Anelli di gittata predefiniti (m)", "Default range rings (m)")}<input data-annot-presets value="${ctx.esc(presetsText(ctx, ringPresets(ctx)))}" maxlength="60"></label>${action("data-annot-presets-save", ctx.t("Salva anelli", "Save rings"))}</section>`
    : "";
  return `<div class="annotations-panel annotations-list-panel" data-annot-list><div class="toolbar">${action('data-annot-list-act="clear-mine"', ctx.t("Cancella i miei disegni", "Clear my drawings"))}${dm ? action('data-annot-list-act="clear-all"', ctx.t("Cancella tutti i disegni", "Clear all drawings"), "danger") : ""}${action('data-annot-list-act="undo"', ctx.t("Annulla ultima modifica", "Undo last change"))}</div>${section(
    ctx.t("Disegni", "Drawings"),
    marks.map(
      (mark) =>
        `<li data-annot-row="mark"><span class="annotations-swatch-dot" style="--swatch:${D.colourHex(mark.color)}"></span><span>${ctx.esc(ctx.label(kind[mark.kind]))}${mark.kind === "text" ? ` «${ctx.esc(mark.text)}»` : ""} · ${who(mark)}${mark.hidden ? ` · <em>${ctx.t("nascosto", "hidden")}</em>` : ""}</span>${dm ? action(`data-annot-mark-hide="${ctx.esc(mark.id)}"`, mark.hidden ? ctx.t("Mostra", "Show") : ctx.t("Nascondi", "Hide")) : ""}${mark.canErase ? action(`data-annot-mark-delete="${ctx.esc(mark.id)}"`, ctx.t("Cancella", "Erase")) : ""}</li>`,
    ),
    ctx.t("Nessun disegno su questa scena.", "No drawings on this scene."),
  )}${section(
    ctx.t("Sagome", "Templates"),
    templates.map(
      (t) =>
        `<li data-annot-row="template"><span class="annotations-swatch-dot" style="--swatch:${D.colourHex(t.color)}"></span><span>${ctx.esc(t.label || ctx.label(D.SHAPE_LABELS[t.shape]))} · ${ctx.esc(ctx.label(D.SHAPE_LABELS[t.shape]))} ${fmt(ctx, t.size)} m${t.pattern !== "none" ? " · " + ctx.esc(ctx.label(D.damageLabel(t.pattern))) : ""}${t.hidden ? ` · <em>${ctx.t("nascosta", "hidden")}</em>` : ""}${t.locked ? ` · <em>${ctx.t("bloccata", "locked")}</em>` : ""} · ${who(t)}</span>${action(`data-annot-tpl-select="${ctx.esc(t.id)}"`, ctx.t("Seleziona", "Select"))}</li>`,
    ),
    ctx.t("Nessuna sagoma su questa scena.", "No templates on this scene."),
  )}${section(
    ctx.t("Misure condivise", "Shared measurements"),
    measures.map(
      (m) =>
        `<li data-annot-row="measure"><span>${ctx.esc(D.measureSummary(scene, m, ctx.lang))} · ${who(m)}</span>${m.own || dm ? action(`data-annot-measure-remove="${ctx.esc(m.id)}"`, ctx.t("Togli", "Remove")) : ""}</li>`,
    ),
    ctx.t("Nessuna misura condivisa.", "No shared measurements."),
  )}${section(
    ctx.t("Aure", "Auras"),
    auras.map(
      (aura) =>
        `<li data-annot-row="aura"><span class="annotations-swatch-dot" style="--swatch:${D.colourHex(aura.color)}"></span><span>${ctx.esc(actorName(ctx, aura.actorId))} · ${fmt(ctx, aura.radius)} m${aura.label ? " · " + ctx.esc(aura.label) : ""} · ${aura.audience === "me" ? ctx.t("solo io", "only me") : ctx.t("tutti", "everyone")}</span>${ctx.canControl(ctx.state.actors[aura.actorId]) && (aura.author === ctx.role || dm) ? action(`data-annot-aura-edit="${ctx.esc(aura.actorId)}" data-annot-aura-id="${ctx.esc(aura.id)}"`, ctx.t("Modifica", "Edit")) : ""}</li>`,
    ),
    ctx.t(
      "Nessuna aura. Menu della pedina › Aura…, oppure E.",
      "No auras. Token menu › Aura…, or E.",
    ),
  )}${section(
    ctx.t("Note sulle pedine", "Token notes"),
    tips.map(
      (tip) =>
        `<li data-annot-row="tooltip"><span>${ctx.esc(actorName(ctx, tip.actorId))} · ${tip.audience === "me" ? ctx.t("solo io", "only me") : ctx.t("tutti", "everyone")}: ${ctx.esc(tip.text)}</span>${tip.own ? action(`data-annot-tip-edit-row="${ctx.esc(tip.actorId)}"`, ctx.t("Modifica", "Edit")) : ""}</li>`,
    ),
    ctx.t(
      "Nessuna nota. Strumento Disegna › Testo, clic su una pedina.",
      "No notes. Draw tool › Text, click a token.",
    ),
  )}${permissionsBox}</div>`;
}
function bindList(el, ctx, table) {
  el.querySelectorAll("[data-annot-list-act]").forEach((b) =>
    b.addEventListener("click", () => barAction(ctx, table, b.dataset.annotListAct)),
  );
  el.querySelectorAll("[data-annot-mark-hide]").forEach((b) =>
    b.addEventListener("click", () => {
      const mark = D.sliceOf(ctx.state).marks.find((entry) => entry.id === b.dataset.annotMarkHide);
      if (!mark) return;
      run(
        ctx,
        mark.hidden
          ? ctx.t("Disegno di nuovo visibile", "Drawing visible again")
          : `${ctx.t("Il DM ha nascosto un disegno di", "The DM hid a drawing by")} ${D.authorName(ctx.state, mark, ctx.lang)}`,
        (s) => D.setMarkHidden(s, ctx.role, mark.id, !mark.hidden),
      );
    }),
  );
  el.querySelectorAll("[data-annot-mark-delete]").forEach((b) =>
    b.addEventListener("click", () =>
      run(ctx, ctx.t("Disegno cancellato", "Drawing erased"), (s) =>
        D.removeMark(s, ctx.role, b.dataset.annotMarkDelete),
      ),
    ),
  );
  el.querySelectorAll("[data-annot-tpl-select]").forEach((b) =>
    b.addEventListener("click", () => {
      ui.selectedTemplate = b.dataset.annotTplSelect;
      if (table.mode !== TEMPLATE_TOOL) table.setMode(TEMPLATE_TOOL);
      else ctx.render();
    }),
  );
  el.querySelectorAll("[data-annot-measure-remove]").forEach((b) =>
    b.addEventListener("click", () =>
      run(
        ctx,
        ctx.t("Misura tolta", "Measurement cleared"),
        (s) => D.removeSharedMeasure(s, ctx.role, b.dataset.annotMeasureRemove),
        MEASURE_COMMIT,
      ),
    ),
  );
  el.querySelectorAll("[data-annot-aura-edit]").forEach((b) =>
    b.addEventListener("click", () =>
      openAuraDialog(ctx, b.dataset.annotAuraEdit, { auraId: b.dataset.annotAuraId }),
    ),
  );
  el.querySelectorAll("[data-annot-tip-edit-row]").forEach((b) =>
    b.addEventListener("click", () => openTooltipDialog(ctx, b.dataset.annotTipEditRow)),
  );
  el.querySelectorAll("[data-annot-perm]").forEach((box) =>
    box.addEventListener("change", () => {
      try {
        registryRef.setSetting(ctx, `${TABLE_SETTINGS}.${box.dataset.annotPerm}`, box.checked);
      } catch (error) {
        ctx.toast(errorText(ctx, error), true);
        ctx.render();
      }
    }),
  );
  el.querySelector("[data-annot-presets-save]")?.addEventListener("click", () => {
    const value = el.querySelector("[data-annot-presets]").value;
    try {
      registryRef.setSetting(
        ctx,
        `${TABLE_SETTINGS}.ring-presets`,
        presetsText(ctx, D.parseRingPresets(value)),
      );
    } catch (error) {
      ctx.toast(errorText(ctx, error), true);
    }
  });
}

// ---------------------------------------------------------------- registration

const colourOptions = D.COLOURS.map(([id, , name]) => ({ value: id, label: name }));
export function register(registry) {
  registryRef = registry;
  registry.registerStateSlice(ID, {
    version: D.VERSION,
    seed: D.seedAnnotations,
    normalize: D.normalizeAnnotations,
    // Drawings, templates, auras, notes and elevations follow the gameplay Undo; shared
    // measurements (not game actions) keep their current value.
    afterUndo: D.preserveMeasures,
  });
  registry.registerStyles(new URL("./annotations.css", import.meta.url));

  registry.add("table-tool", measureTool);
  registry.add("table-tool", pointerTool);
  registry.add("table-tool", drawTool);
  registry.add("table-tool", templateTool);
  registry.add("map-layer", {
    id: "annotations-areas",
    label: L("Annotazioni e sagome", "Annotations and templates"),
    order: 45,
    svg: areasLayer,
    bind: (el, ctx, table) => {
      ui.liveEl = el.querySelector("[data-annot-live]");
      ui.table = table;
    },
  });
  registry.add("map-layer", {
    id: "annotations-signals",
    label: L("Segnali e note sulle pedine", "Signals and token notes"),
    order: 70,
    interactive: true,
    svg: signalsLayer,
    bind: bindSignalsLayer,
  });
  registry.add("table-panel", {
    id: "annotations-distances",
    label: L("Distanze", "Distances"),
    placement: "inspector",
    order: 15,
    when: (ctx, tv) => Boolean(tv?.scene && tv.selectedActorId),
    render: distancesPanel,
    bind: bindDistances,
  });
  registry.add("table-panel", {
    id: "annotations-list",
    section: "scene",
    label: L("Annotazioni", "Annotations"),
    placement: "sidebar-tab",
    icon: "pen",
    order: 80,
    when: (ctx, tv) => Boolean(tv?.scene),
    render: listPanel,
    bind: bindList,
  });
  registry.add("token-menu", {
    id: "annotations-aura",
    submenu: "look",
    label: L("Aura…", "Aura…"),
    group: "annotations",
    when: (ctx, target) =>
      Boolean(ctx.state.actors?.[target?.actorId]) &&
      ctx.canControl(ctx.state.actors[target.actorId]),
    run: (ctx, target) => openAuraDialog(ctx, target.actorId),
  });
  registry.add("token-menu", {
    id: "annotations-tooltip",
    submenu: "look",
    label: L("Nota sulla pedina…", "Token note…"),
    group: "annotations",
    when: (ctx, target) =>
      D.observable(ctx.state, D.sceneOf(ctx.state, target?.sceneId), target?.actorId, ctx.role),
    run: (ctx, target) => openTooltipDialog(ctx, target.actorId),
  });
  registry.add("token-menu", {
    id: "annotations-elevation",
    submenu: "actions",
    label: L("Quota…", "Elevation…"),
    group: "annotations",
    when: (ctx, target) =>
      Boolean(ctx.state.actors?.[target?.actorId]) &&
      ctx.canControl(ctx.state.actors[target.actorId]),
    run: (ctx, target) => openElevationDialog(ctx, target.actorId),
  });

  const toolCommand = (id, shortcut, tool, it, en) =>
    registry.add("command", {
      id,
      label: L(it, en),
      ...(shortcut ? { shortcut } : {}),
      context: "table",
      group: "annotations",
      run: (ctx) => {
        if (!ui.table)
          throw Object.assign(Error("No table"), { it: "Apri il Tavolo.", en: "Open the Table." });
        ui.table.setMode(tool);
      },
    });
  toolCommand("annotations.measure", "R", "measure", "Strumento Misura", "Measure tool");
  toolCommand(
    "annotations.pointer",
    "X",
    "pointer",
    "Strumento Puntatore e segnali",
    "Pointer and ping tool",
  );
  toolCommand("annotations.template", "O", TEMPLATE_TOOL, "Strumento Sagoma", "Template tool");
  toolCommand("annotations.draw", null, DRAW_TOOL, "Strumento Disegna", "Draw tool");
  registry.add("command", {
    id: "annotations.aura",
    label: L("Aura sulla pedina selezionata", "Aura on the selected token"),
    shortcut: "E",
    context: "table",
    group: "annotations",
    run: (ctx) => openAuraDialog(ctx, ui.table?.selectedActorId),
  });
  registry.add("command", {
    id: "annotations.clear-mine",
    label: L("Cancella i miei disegni", "Clear my drawings"),
    context: "table",
    group: "annotations",
    run: (ctx) =>
      ctx.commit(ctx.t("Cancellati i miei disegni", "Cleared my drawings"), (s) =>
        D.clearMine(s, ctx.role, s.activeSceneId),
      ),
  });

  // DDB-126 tool memory: each tool keeps its last choices on this device.
  const choice = (id, it, en, options, def) => ({
    id,
    label: L(it, en),
    type: "choice",
    default: def,
    options,
  });
  registry.add("settings", {
    id: TOOL_SETTINGS,
    label: L("Tavolo: ultime scelte degli strumenti", "Table: last tool choices"),
    scope: "device",
    fields: [
      choice(
        "draw-mode",
        "Disegno: modo",
        "Drawing: mode",
        DRAW_MODES.map(([value, name]) => ({ value, label: name })),
        "free",
      ),
      choice("draw-color", "Disegno: colore", "Drawing: colour", colourOptions, "gold"),
      {
        id: "draw-width",
        label: L("Disegno: spessore", "Drawing: width"),
        type: "number",
        min: 1,
        max: 5,
        default: 2,
      },
      choice(
        "template-shape",
        "Sagoma: forma",
        "Template: shape",
        D.TEMPLATE_SHAPES.map((value) => ({ value, label: D.SHAPE_LABELS[value] })),
        "cone",
      ),
      choice("template-color", "Sagoma: colore", "Template: colour", colourOptions, "orange"),
      choice(
        "template-pattern",
        "Sagoma: motivo",
        "Template: pattern",
        [
          { value: "none", label: L("Nessuno", "None") },
          ...D.DAMAGE_TYPES.map(([value, name]) => ({ value, label: name })),
        ],
        "none",
      ),
      choice(
        "measure-shape",
        "Misura: forma",
        "Measure: shape",
        D.MEASURE_SHAPES.map((value) => ({ value, label: D.SHAPE_LABELS[value] })),
        "line",
      ),
      {
        id: "measure-share",
        label: L("Misura: condivisa con il tavolo", "Measure: shared with the table"),
        type: "boolean",
        default: false,
      },
      choice(
        "ring-theme",
        "Anelli: tema dei colori",
        "Rings: colour theme",
        [
          { value: "auto", label: L("Come la visione dei colori", "As colour vision") },
          ...Object.entries(D.RING_THEMES).map(([value, entry]) => ({ value, label: entry.label })),
        ],
        "auto",
      ),
      choice(
        "pointer-mode",
        "Puntatore: effetto del clic",
        "Pointer: click action",
        [
          { value: "ping", label: L("Segnale", "Ping") },
          { value: "alert", label: L("Allerta", "Alert") },
          { value: "recall", label: L("Proponi la vista (DM)", "Propose the view (DM)") },
        ],
        "ping",
      ),
    ],
  });
  // Campaign permissions (DDB Game Settings: players may draw, DDB-122) and GM ring presets
  // (Owlbear Ranges, VTL-136). B20 can present these same keys in campaign settings.
  registry.add("settings", {
    id: TABLE_SETTINGS,
    label: L("Tavolo: annotazioni dei giocatori", "Table: player annotations"),
    scope: "campaign",
    roles: ["dm"],
    fields: [
      {
        id: "players-draw",
        label: L("I giocatori possono disegnare", "Players can draw"),
        type: "boolean",
        default: true,
      },
      {
        id: "players-pointer",
        label: L("I giocatori usano puntatore e segnali", "Players use the pointer and pings"),
        type: "boolean",
        default: true,
      },
      {
        id: "players-templates",
        label: L("I giocatori creano sagome", "Players create templates"),
        type: "boolean",
        default: true,
      },
      {
        id: "ring-presets",
        label: L("Anelli di gittata (m, separati da ;)", "Range rings (m, separated by ;)"),
        type: "text",
        maxLength: 60,
        default: D.DEFAULT_RING_PRESETS,
      },
    ],
  });
  registry.add("notifications", {
    id: "annotations-recall",
    label: L("Proposte di vista", "View proposals"),
    collect: (ctx) => {
      const proposal = bus.pendingRecall(ctx.role);
      return proposal
        ? [
            {
              id: "annotations-recall-" + proposal.id,
              title: L(
                `${proposal.name} propone di guardare un punto della mappa`,
                `${proposal.name} proposes a point of the map to look at`,
              ),
              body: L(
                "Apri il Tavolo: scegli Guarda o Ignora.",
                "Open the Table: choose Look or Ignore.",
              ),
              time: new Date(proposal.at).toISOString(),
              category: "annotations",
              target: { page: "table" },
            },
          ]
        : [];
    },
  });

  registry.on("role-changed", () => resetAnnotationsView());
  registry.on("reset", () => {
    resetAnnotationsView();
    bus.clear();
  });
  registry.on("navigate", (payload) => {
    if (payload.page !== "table") {
      ui.gesture = null;
      ui.table = null;
      ui.tipOpen = null;
      ui.hover = null;
    }
  });
  registry.on("scene-activated", () => {
    ui.measure = null;
    ui.rings = null;
    ui.selectedTemplate = null;
    ui.tempRuler = null;
  });
}
