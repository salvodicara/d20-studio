// B42 — World: world map, calendar and chronicle (Campaign area, entry module).
//
// Where it lives (B61 placement rules): a campaign section "Mappa e calendario" next to
// "Mondo" with three views (map, calendar, chronicle); a box on world entries showing
// their pins and place history; a Table sidebar tab "Mondo" with today's date, moons,
// arrived reminders and a way to the map; reminders in the notification centre (B24);
// results in global search; two palette commands. Nothing is added to a header row.
//
// Adopted patterns (census IDs, see world-map-domain.mjs for the model):
// - Kanka Map Explorer without a separate edit mode (CMP-41): a bottom toolbar with
//   Select / Pin / Measure, a details side panel for the selected pin (CMP-44: centre,
//   edit, duplicate, remove), Rapid placement that keeps the tool on (CMP-42), a legend
//   button top-left with search and groups (CMP-43), measuring with waypoints finished by
//   Esc or double-click (CMP-45), draggable pins that save their position (CMP-47), group
//   and per-pin visibility (CMP-48); map settings with units and scale (CMP-46).
// - LegendKeeper: right-click the map to drop a pin (CMP-65), pins that open another
//   map with a breadcrumb back (CMP-64), create the linked page from the pin (CMP-67),
//   "fantasy navigation" measuring (CMP-68), chronicle timeline view (CMP-69), moons with
//   phases and colours (CMP-70).
// - World Anvil Chronicles (CMP-79): the selected place lists its history; events link
//   to map places; Foundry map note opened with a double-click (FVT-087).
// - Fantasy Calendar (CMP-98/100): month grid with custom weeks, moons in each day,
//   seasons, eras, recurring events. Kanka Ctrl+←/→ between months (CMP-39).
// - Calendaria (Foundry module, FVT-062): notes Visible / Hidden (GM) / private, GM
//   reveal, reminders when game time reaches them; dnd5e GM-only time advance (FVT-060).
// - Zoom and fit controls bottom-right like Owlbear (VTL-231 surfaces, B61).
// Time: the calendar reads rest-time's campaign clock; only play or the DM advance it
// (C24, I-087), through the same "Tempo" dialog of the Table (ctx.openGameTime).

import * as C from "./world-calendar.mjs";
import * as D from "./world-map-domain.mjs";
import {
  applyCampaignDraft,
  createCampaignDraft,
  getCampaignEntry,
  isCampaignMember,
  listCampaignEntries,
  previewCampaignDraft,
  saveCampaignDraft,
} from "./campaign-content.mjs";
import { resolveUnits } from "./preferences-domain.mjs";

const ID = D.SLICE;
const L = (it, en) => ({ it, en });
const ACKS_KEY = "d20-studio-world-map:acks:v1";
const PIN_PATH = "M0 0C-2-8-12-12-12-22A12 12 0 1 1 12-22C12-12 2-8 0 0Z";
const ART_SIZE = {
  valley: [1200, 800],
  city: [1000, 700],
  crypt: [800, 600],
  parchment: [1000, 700],
};

let api = null; // the registry object given to register()
let ui = fresh();
let lastTap = null; // {time, x, y} of the last map tap, for double-click detection
const memoryAcks = {};
const myLabels = new Set();

function fresh() {
  return {
    role: null,
    campaign: null,
    mapId: null,
    views: {},
    tool: "select",
    rapid: false,
    selected: null,
    legend: false,
    legendQuery: "",
    hidden: {},
    measure: null,
    calCursor: null,
    calDay: null,
    routeId: null,
    place: "",
    focus: null,
    width: 900,
    aspect: 0,
  };
}
/** Clears the view state and this device's reminder marks (tests, "Ripristina esempio"). */
export function resetWorldView() {
  ui = fresh();
  lastTap = null;
  clearAcks();
  myLabels.clear();
}
/** Read-only view state for tests. */
export const worldView = () => ui;

// ------------------------------------------------------------------ small helpers
const sliceOf = (state) => (api ? api.slice(state) : state?.ext?.[ID]);
const campaignId = (ctx) => ctx.state.campaign?.id ?? null;
const member = (ctx) => {
  const id = campaignId(ctx);
  return Boolean(id) && isCampaignMember(ctx.state, id, ctx.role);
};
export function worldFor(ctx) {
  return D.worldOf(sliceOf(ctx.state), campaignId(ctx)) ?? D.emptyWorld();
}
const nowOf = (ctx, w) => D.worldNow(ctx.state, w, campaignId(ctx));
const errorText = (ctx, error) =>
  error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error);
function attempt(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
/** One accepted change of this area's campaign world (throws when refused). */
function change(ctx, label, fn, options = {}) {
  let result;
  const text = ctx.t(label.it, label.en);
  myLabels.add(text); // before the commit: the commit renders the Undo button
  ctx.commit(
    text,
    (draft) => {
      const world = D.ensureWorld(sliceOf(draft), D.campaignIdOf(draft));
      result = fn(world, D.worldNow(draft, world).abs, draft);
    },
    options,
  );
  return result;
}
const nf = (ctx, value, digits = 1) =>
  new Intl.NumberFormat(ctx.lang === "en" ? "en-GB" : "it-IT", {
    maximumFractionDigits: digits,
  }).format(value);
function unitOf(ctx) {
  const get = (key) => {
    try {
      return ctx.registry?.getSetting?.(ctx, key);
    } catch {
      return undefined;
    }
  };
  return resolveUnits(get("preferences-units.units"), get("preferences-table.units"), ctx.lang)
    .unit;
}
/** A distance in km shown in the reader's units: km/m, or miles/feet (SRD 1.5 km per mile). */
export function distanceText(ctx, km) {
  if (unitOf(ctx) === "imperial") {
    const miles = km / D.KM_PER_MILE;
    return miles < 0.5
      ? `${nf(ctx, (km * 1000) / 0.3, 0)} ft`
      : `${nf(ctx, miles, miles < 10 ? 1 : 0)} ${ctx.t("miglia", "miles")}`;
  }
  return km < 1 ? `${nf(ctx, km * 1000, 0)} m` : `${nf(ctx, km, km < 10 ? 1 : 0)} km`;
}
const half = (v) => Math.round(v * 2) / 2;
export function travelText(ctx, row) {
  if (row.hours < 1) return `${Math.max(1, Math.round(row.hours * 60))} min`;
  if (!row.days) return `${nf(ctx, half(row.hours))} h`;
  const rest = half(row.restHours);
  return ctx.t(
    `${row.days} ${row.days === 1 ? "giorno" : "giorni"}${rest ? ` e ${nf(ctx, rest)} h` : ""}`,
    `${row.days} ${row.days === 1 ? "day" : "days"}${rest ? ` and ${nf(ctx, rest)} h` : ""}`,
  );
}
const phaseName = (ctx, index) => ctx.label(C.PHASES[index]);
function whenText(ctx, cal, event, day = null) {
  const date = day === null ? event.date : C.dateFromAbsDay(cal, day);
  return [C.formatDate(cal, date), event.time ? C.formatTime(event.time) : ""]
    .filter(Boolean)
    .join(" · ");
}
const badge = (ctx, text, cls = "") =>
  `<span class="badge wm-badge ${cls}">${ctx.esc(text)}</span>`;
function visibilityBadge(ctx, event) {
  if (event.visibility === "dm") return badge(ctx, ctx.t("Solo DM", "DM only"), "is-secret");
  if (event.visibility === "private") return badge(ctx, ctx.t("Solo io", "Only me"), "is-private");
  return "";
}
const recurrenceText = (ctx, value) =>
  ({
    yearly: ctx.t("Ogni anno", "Every year"),
    monthly: ctx.t("Ogni mese", "Every month"),
  })[value] ?? "";
const act = (name, data = {}) =>
  `data-wm-act="${name}"${Object.entries(data)
    .map(
      ([k, v]) =>
        ` data-${k}="${String(v).replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c])}"`,
    )
    .join("")}`;
const button = (ctx, label, name, data = {}, cls = "", extra = "") =>
  `<button type="button" class="button ${cls}" ${act(name, data)} ${extra}>${label}</button>`;
function undoButton(ctx) {
  const label = ctx.undoLabel?.() ?? "";
  if (!ctx.canUndo?.() || !myLabels.has(label)) return "";
  return `<button type="button" class="button quiet wm-undo" ${act("undo")} title="${ctx.esc(label)}">${ctx.icon("undo")} ${ctx.esc(ctx.t(`Annulla «${label}»`, `Undo “${label}”`))}</button>`;
}

// Per-device reminder acknowledgements (like B24 read markers: personal bookkeeping,
// never a game event, untouched by gameplay Undo, available offline).
function readAcks() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(ACKS_KEY) ?? "null") ?? memoryAcks;
  } catch {
    return memoryAcks;
  }
}
function ackSet(ctx) {
  const all = readAcks();
  return new Set(all?.[campaignId(ctx)]?.[ctx.role] ?? []);
}
function writeAck(ctx, key) {
  const all = { ...readAcks() };
  const cid = campaignId(ctx);
  all[cid] = { ...(all[cid] ?? {}) };
  all[cid][ctx.role] = [...new Set([...(all[cid][ctx.role] ?? []), key])].slice(-300);
  Object.assign(memoryAcks, all);
  try {
    globalThis.localStorage?.setItem(ACKS_KEY, JSON.stringify(all));
  } catch {
    /* memory only */
  }
}
function clearAcks() {
  for (const key of Object.keys(memoryAcks)) delete memoryAcks[key];
  try {
    globalThis.localStorage?.removeItem(ACKS_KEY);
  } catch {
    /* ignore */
  }
}
/** Reminders the game time reached for this reader and not yet marked as seen here. */
export function pendingReminders(ctx) {
  if (!member(ctx)) return [];
  const w = worldFor(ctx);
  const acks = ackSet(ctx);
  return D.dueReminders(w, ctx.role, nowOf(ctx, w).abs).filter((r) => !acks.has(r.key));
}

// ------------------------------------------------------------------ routing
function parseRoute(ctx) {
  const [view, a, b] = String(ctx.view.id || "").split(".");
  if (view === "calendar") return { view, eventId: a || null };
  if (view === "timeline") return { view, pinId: a || null };
  return { view: "map", mapId: a || null, pinId: b || null };
}
function go(ctx, id) {
  ctx.navigate("campaign", { tab: ID, id });
}
function syncRole(ctx) {
  if (ui.role !== ctx.role || ui.campaign !== campaignId(ctx)) {
    const keep = { views: ui.views, width: ui.width, aspect: ui.aspect };
    ui = { ...fresh(), ...keep, role: ctx.role, campaign: campaignId(ctx) };
  }
}
function applyRoute(ctx, w, r) {
  const key = String(ctx.view.id || "");
  if (ui.routeId === key) return;
  ui.routeId = key;
  if (r.view === "map" && r.pinId) {
    const pin = w.pins.find((p) => p.id === r.pinId);
    if (pin && D.canSeePin(w, pin, ctx.role)) {
      ui.selected = pin.id;
      ui.tool = "select";
      const map = w.maps.find((m) => m.id === pin.mapId);
      if (map) centerOn(map, pin);
    }
  }
  if (r.view === "calendar" && r.eventId) {
    const event = w.events.find((e) => e.id === r.eventId);
    if (event && D.canSeeEvent(event, ctx.role) && C.validDate(w.calendar, event.date)) {
      const now = nowOf(ctx, w);
      const next =
        C.occurrences(w.calendar, event, now.absDay - 1, now.absDay + 4000)[0] ??
        C.absDay(w.calendar, event.date);
      const date = C.dateFromAbsDay(w.calendar, next);
      ui.calCursor = { year: date.year, month: date.month };
      ui.calDay = next;
    }
  }
  if (r.view === "timeline") ui.place = r.pinId ?? "";
}
/** The place filter of the chronicle, only when this reader may see that place. */
function placeFilter(ctx, w) {
  const pin = ui.place ? w.pins.find((p) => p.id === ui.place) : null;
  if (!pin || !D.canSeePin(w, pin, ctx.role)) ui.place = "";
  return ui.place ? pin : null;
}

// ------------------------------------------------------------------ map view state
// The view box follows the stage's proportions (no letterbox bands); until the reader pans
// or zooms, it covers the stage with the centre of the map ("auto").
// It also widens enough to show every visible place (Kanka keeps an initial position per
// map, CMP-46; here it is derived from the places).
function coverView(map, pins = []) {
  const aspect = ui.aspect || 0.72;
  const fit = Math.max(map.width, map.height / aspect);
  let w = Math.min(map.width, map.height / aspect);
  let cx = map.width / 2,
    cy = map.height / 2;
  if (pins.length) {
    const xs = pins.map((p) => p.x),
      ys = pins.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    // Screen room kept free around the places: labels, the legend button (top left) and
    // the zoom buttons (bottom right).
    const cw = Math.max(240, ui.width || 900),
      ch = cw * aspect;
    const across = ((x1 - x0 + 60) * cw) / Math.max(120, cw - 150);
    const down = ((y1 - y0 + 50) * ch) / Math.max(120, ch - 130) / aspect;
    w = Math.min(Math.max(w, across, down), fit);
    const unit = w / cw;
    cx = (x0 + x1) / 2 + 10 * unit;
    cy = (y0 + y1) / 2 - 20 * unit;
  }
  const h = w * aspect;
  const x = w <= map.width ? Math.min(Math.max(cx - w / 2, 0), map.width - w) : (map.width - w) / 2;
  const y =
    h <= map.height ? Math.min(Math.max(cy - h / 2, 0), map.height - h) : (map.height - h) / 2;
  return { x, y, w, auto: true };
}
function viewOf(map, pins) {
  return (ui.views[map.id] ??= coverView(map, pins));
}
const viewHeight = (map, v) => v.w * (ui.aspect || 0.72);
function centerOn(map, point) {
  const v = viewOf(map);
  v.auto = false;
  v.x = point.x - v.w / 2;
  v.y = point.y - viewHeight(map, v) / 2;
  clampView(map, v);
}
const maxWidth = (map) => Math.max(map.width, map.height / (ui.aspect || 0.72)) * 1.5;
// The view stays on the map (Leaflet maxBounds, as in Kanka); zoomed out past the map it
// is centred on it.
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
function clampView(map, v) {
  v.w = clamp(v.w, map.width / 10, maxWidth(map));
  const h = viewHeight(map, v);
  v.x = v.w <= map.width ? clamp(v.x, 0, map.width - v.w) : (map.width - v.w) / 2;
  v.y = h <= map.height ? clamp(v.y, 0, map.height - h) : (map.height - h) / 2;
}
function zoomAt(map, factor, cx, cy) {
  const v = viewOf(map);
  v.auto = false;
  const before = v.w;
  v.w = Math.min(Math.max(v.w * factor, map.width / 10), maxWidth(map));
  const k = v.w / before;
  v.x = cx - (cx - v.x) * k;
  v.y = cy - (cy - v.y) * k;
  clampView(map, v);
}
/** The whole map in view (contain), centred. */
function fitView(map) {
  const aspect = ui.aspect || 0.72;
  const w = Math.max(map.width, map.height / aspect);
  ui.views[map.id] = { x: (map.width - w) / 2, y: (map.height - w * aspect) / 2, w, auto: false };
}
const markerScale = (v) => v.w / Math.max(240, ui.width || 900);

// ------------------------------------------------------------------ map art (synthetic)
function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
function artSVG(map) {
  const w = map.width,
    h = map.height;
  if (map.background)
    return `<image href="${map.background.replace(/"/g, "")}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
  if (map.art === "valley") {
    const trees = [];
    for (let i = 0; i < 70; i++) {
      const x = 80 + hash(i) * 260,
        y = 460 + hash(i + 99) * 250;
      trees.push(
        `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(11 + hash(i + 7) * 7).toFixed(1)}"/>`,
      );
    }
    const peaks = [
      [470, 150],
      [540, 108],
      [612, 140],
      [690, 96],
      [770, 132],
      [850, 104],
      [915, 158],
      [400, 176],
    ]
      .map(
        ([x, y]) =>
          `<polygon points="${x - 48},${y + 52} ${x},${y - 32} ${x + 48},${y + 52}"/><polygon class="wm-snow" points="${x - 13},${y - 14} ${x},${y - 32} ${x + 13},${y - 14}"/>`,
      )
      .join("");
    return `<rect class="wm-land" width="${w}" height="${h}"/><ellipse class="wm-hill" cx="300" cy="250" rx="120" ry="70"/><ellipse class="wm-hill" cx="540" cy="330" rx="90" ry="46"/><ellipse class="wm-water" cx="230" cy="118" rx="70" ry="34"/><path class="wm-sea" d="M1010 0C990 120 1040 220 1000 330C965 430 1030 470 990 560C960 640 1020 720 1000 800L1200 800L1200 0Z"/><path class="wm-coast" d="M1010 0C990 120 1040 220 1000 330C965 430 1030 470 990 560C960 640 1020 720 1000 800"/><g class="wm-waves"><path d="M1060 120q10-8 20 0t20 0"/><path d="M1100 300q10-8 20 0t20 0"/><path d="M1050 470q10-8 20 0t20 0"/><path d="M1110 640q10-8 20 0t20 0"/></g><g class="wm-forest">${trees.join("")}</g><g class="wm-mountains">${peaks}</g><path class="wm-river" d="M700 176C690 262 610 332 650 450S820 560 1000 545"/><path class="wm-river is-thin" d="M298 132C340 190 360 250 420 300S560 380 650 450"/><path class="wm-road" d="M300 240L420 380L650 450C760 480 860 500 960 520"/><g class="wm-compass" transform="translate(880 720)"><circle r="34"/><path d="M0-30L7 0L0 30L-7 0Z"/><text y="-40">N</text></g>`;
  }
  if (map.art === "city") {
    const blocks = [];
    for (let i = 0; i < 46; i++) {
      const x = 200 + hash(i + 3) * 540,
        y = 140 + hash(i + 51) * 360;
      blocks.push(
        `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(24 + hash(i) * 30).toFixed(0)}" height="${(18 + hash(i + 5) * 24).toFixed(0)}"/>`,
      );
    }
    return `<rect class="wm-land" width="${w}" height="${h}"/><path class="wm-sea" d="M0 640C260 610 460 660 640 620C760 595 820 520 860 470C900 420 960 430 1000 420L1000 700L0 700Z"/><polygon class="wm-land" points="800,600 868,506 906,512 842,606"/><polygon class="wm-walls" points="180,120 760,90 840,250 800,470 560,560 260,540 140,330"/><g class="wm-streets"><path d="M140 330L800 300"/><path d="M430 110L470 550"/><path d="M620 100L600 580"/><path d="M260 180L760 470"/></g><g class="wm-blocks">${blocks.join("")}</g><rect class="wm-quay" x="540" y="585" width="150" height="16"/><rect class="wm-quay" x="600" y="600" width="18" height="60"/><circle class="wm-temple" cx="690" cy="240" r="34"/><rect class="wm-market" x="380" y="298" width="92" height="62"/><circle class="wm-tower" cx="890" cy="520" r="12"/>`;
  }
  if (map.art === "crypt") {
    const grid = [];
    for (let x = 0; x <= w; x += 25) grid.push(`<path d="M${x} 0V${h}"/>`);
    for (let y = 0; y <= h; y += 25) grid.push(`<path d="M0 ${y}H${w}"/>`);
    return `<rect class="wm-rock" width="${w}" height="${h}"/><g class="wm-grid">${grid.join("")}</g><g class="wm-rooms"><rect x="70" y="60" width="130" height="110"/><rect x="300" y="80" width="160" height="100"/><rect x="430" y="255" width="190" height="150"/><rect x="110" y="380" width="170" height="130"/><rect x="620" y="110" width="120" height="90"/><rect x="195" y="100" width="110" height="28"/><rect x="455" y="175" width="28" height="85"/><rect x="275" y="420" width="160" height="28"/><rect x="620" y="195" width="28" height="70"/></g>`;
  }
  const grid = [];
  for (let x = 0; x <= w; x += 50) grid.push(`<path d="M${x} 0V${h}"/>`);
  for (let y = 0; y <= h; y += 50) grid.push(`<path d="M0 ${y}H${w}"/>`);
  return `<rect class="wm-parchment" width="${w}" height="${h}"/><g class="wm-grid">${grid.join("")}</g>`;
}

// ------------------------------------------------------------------ map view
function pinSVG(ctx, w, pin, scale) {
  const group = w.groups.find((g) => g.id === pin.groupId);
  const color = /^#[0-9a-f]{6}$/i.test(group?.color ?? "") ? group.color : "#8fc1d4";
  const child =
    pin.childMapId &&
    D.canSeeMap(
      w.maps.find((m) => m.id === pin.childMapId),
      ctx.role,
    );
  const selected = ui.selected === pin.id;
  const label = [
    pin.name,
    group?.name,
    pin.visibility === "dm" ? ctx.t("solo DM", "DM only") : "",
    child ? ctx.t("apre un’altra mappa", "opens another map") : "",
  ]
    .filter(Boolean)
    .join(", ");
  return `<g class="wm-pin${selected ? " is-selected" : ""}${pin.visibility === "dm" ? " is-secret" : ""}" data-wm-pin="${ctx.esc(pin.id)}" transform="translate(${pin.x} ${pin.y})" tabindex="0" role="button" aria-pressed="${selected}" aria-label="${ctx.esc(label)}"><g class="wm-pin-body" transform="scale(${scale})"><circle class="wm-pin-hit" cx="0" cy="-16" r="21"/>${selected ? `<circle class="wm-pin-ring" cx="0" cy="-22" r="18"/>` : ""}<path class="wm-pin-shape" d="${PIN_PATH}" fill="${color}"/><circle class="wm-pin-dot" cx="0" cy="-22" r="4.5"/>${child ? `<path class="wm-pin-child" d="M8-40h9v9M17-40l-7 7"/>` : ""}${pin.visibility === "dm" ? `<path class="wm-pin-eye" d="M-17-40l8 8"/>` : ""}<text class="wm-pin-label" x="0" y="16">${ctx.esc(pin.name)}</text></g></g>`;
}
function measureSVG(ctx, map, scale) {
  const m = ui.measure;
  if (!m || m.mapId !== map.id || !m.points.length) return "";
  let km = 0;
  const marks = m.points
    .map((p, i) => {
      if (i) km += Math.hypot(p.x - m.points[i - 1].x, p.y - m.points[i - 1].y) * map.kmPerUnit;
      return `<g transform="translate(${p.x} ${p.y})"><g class="wm-measure-body" transform="scale(${scale})"><circle r="6"/>${i ? `<text y="-13">${ctx.esc(distanceText(ctx, km))}</text>` : ""}</g></g>`;
    })
    .join("");
  return `<g class="wm-measure" aria-hidden="true"><polyline points="${m.points.map((p) => `${p.x},${p.y}`).join(" ")}" vector-effect="non-scaling-stroke"/>${marks}</g>`;
}
// A touch screen has no right-click, Esc or Backspace: its hints name taps and the
// panel's buttons instead (B42 review).
const coarse = () => Boolean(globalThis.matchMedia?.("(pointer: coarse)")?.matches);
function hint(ctx) {
  if (coarse()) {
    if (ui.tool === "pin")
      return ctx.t("Tocca la mappa per posare uno spillo.", "Tap the map to drop a pin.");
    if (ui.tool === "measure")
      return ctx.t(
        "Tocca per aggiungere tappe (su uno spillo si aggancia al luogo). Doppio tocco o «Termina» per finire.",
        "Tap to add waypoints (on a pin it snaps to the place). Double-tap or “Finish” to end.",
      );
    return ctx.t(
      "Trascina per spostare la vista; pizzica o +/− per lo zoom. Doppio tocco su uno spillo apre la sua mappa.",
      "Drag to pan; pinch or +/− to zoom. Double-tap a pin to open its map.",
    );
  }
  if (ui.tool === "pin")
    return ctx.t(
      "Clic sulla mappa per posare uno spillo (Invio: al centro). Clic destro funziona con ogni strumento.",
      "Click the map to drop a pin (Enter: at the centre). Right-click works with any tool.",
    );
  if (ui.tool === "measure")
    return ctx.t(
      "Clic per aggiungere tappe (su uno spillo si aggancia al luogo). Doppio clic o Esc per terminare, Backspace toglie l’ultima.",
      "Click to add waypoints (on a pin it snaps to the place). Double-click or Esc to finish, Backspace removes the last.",
    );
  return ctx.t(
    "Trascina per spostare la vista; rotellina, pizzico o +/− per lo zoom. Doppio clic o doppio tocco su uno spillo apre la sua mappa.",
    "Drag to pan; wheel, pinch or +/− to zoom. Double-click or double-tap a pin to open its map.",
  );
}
function legendHTML(ctx, w, map) {
  const pins = D.visiblePins(w, ctx.role, map.id);
  const groups = w.groups.filter((g) => pins.some((p) => p.groupId === g.id));
  const hidden = ui.hidden[map.id] ?? [];
  return `<div class="wm-legend" id="wm-legend" ${ui.legend ? "" : "hidden"}><label class="field wm-legend-search">${ctx.t("Cerca un luogo", "Find a place")}<input type="search" data-wm-legend-query value="${ctx.esc(ui.legendQuery)}" autocomplete="off"></label>${groups
    .map(
      (g) =>
        `<section class="wm-legend-group"><label class="wm-legend-toggle"><input type="checkbox" ${act("group-toggle", { group: g.id })} ${hidden.includes(g.id) ? "" : "checked"}><span class="wm-swatch" style="background:${/^#[0-9a-f]{6}$/i.test(g.color) ? g.color : "#8fc1d4"}"></span>${ctx.esc(g.name)} <span class="muted">(${pins.filter((p) => p.groupId === g.id).length})</span></label><ul>${pins
          .filter((p) => p.groupId === g.id)
          .map(
            (p) =>
              `<li data-wm-legend-item="${ctx.esc(`${p.name} ${p.description}`.toLowerCase())}"><button type="button" class="wm-legend-pin" ${act("legend-pin", { pin: p.id })}>${ctx.esc(p.name)}${p.visibility === "dm" ? ` <span class="muted">· ${ctx.t("solo DM", "DM only")}</span>` : ""}</button></li>`,
          )
          .join("")}</ul></section>`,
    )
    .join(
      "",
    )}<p class="muted wm-legend-empty" hidden>${ctx.t("Nessun luogo corrisponde.", "No place matches.")}</p>${ctx.role === "dm" ? button(ctx, ctx.t("Gestisci gruppi", "Manage groups"), "groups", {}, "quiet") : ""}</div>`;
}
function mapSelect(ctx, w, map) {
  const maps = D.visibleMaps(w, ctx.role);
  if (maps.length < 2) return "";
  return `<label class="wm-mapselect">${ctx.t("Mappa", "Map")}<select data-wm-map-select>${maps
    .map(
      (m) =>
        `<option value="${ctx.esc(m.id)}" ${m.id === map.id ? "selected" : ""}>${ctx.esc(m.name)}${m.visibility === "dm" ? ` (${ctx.t("solo DM", "DM only")})` : ""}</option>`,
    )
    .join("")}</select></label>`;
}
function emptyMaps(ctx) {
  return `<div class="empty-state wm-empty"><h2>${ctx.t("Nessuna mappa ancora", "No map yet")}</h2><p>${ctx.t("La mappa è facoltativa: potete giocare anche solo con le voci del Mondo e il calendario.", "The map is optional: you can play with World entries and the calendar alone.")}</p>${ctx.role === "dm" ? button(ctx, ctx.t("Carica la prima mappa", "Upload the first map"), "map-new", {}, "primary") : `<p>${ctx.t("Il DM non ha ancora condiviso una mappa.", "The DM has not shared a map yet.")}</p>`}</div>`;
}
function mapView(ctx, w, r) {
  const maps = D.visibleMaps(w, ctx.role);
  if (!maps.length) return emptyMaps(ctx);
  let map = r.mapId ? maps.find((m) => m.id === r.mapId) : null;
  if (r.mapId && !map)
    return `<div class="empty-state wm-empty"><h2>${ctx.t("Mappa non disponibile", "Map unavailable")}</h2><p>${ctx.t("Questa mappa non è visibile per te.", "This map is not visible to you.")}</p>${button(ctx, ctx.t("Torna alla mappa principale", "Back to the main map"), "open-map", { map: D.rootMap(w, ctx.role).id }, "primary")}</div>`;
  map ??= D.rootMap(w, ctx.role);
  if (ui.mapId !== map.id) {
    if (ui.measure?.mapId !== map.id) ui.measure = null;
    if (ui.selected && !w.pins.some((p) => p.id === ui.selected && p.mapId === map.id))
      ui.selected = null;
  }
  ui.mapId = map.id;
  const hidden = ui.hidden[map.id] ?? [];
  const pins = D.visiblePins(w, ctx.role, map.id).filter((p) => !hidden.includes(p.groupId));
  if (
    ui.selected &&
    !D.canSeePin(
      w,
      w.pins.find((p) => p.id === ui.selected),
      ctx.role,
    )
  )
    ui.selected = null;
  const v = viewOf(map, D.visiblePins(w, ctx.role, map.id));
  const scale = markerScale(v);
  const trail = D.mapTrail(w, map.id, ctx.role);
  const crumbs = trail
    .map((step, i) =>
      i === trail.length - 1
        ? `<span aria-current="page">${ctx.esc(step.map.name)}</span>`
        : `<button type="button" class="text-button" ${act("open-map", { map: step.map.id })}>${ctx.esc(step.map.name)}</button>`,
    )
    .join(`<span class="wm-crumb-sep" aria-hidden="true">›</span>`);
  const tools = [
    ["select", "move", "Seleziona", "Select"],
    ...(ctx.role === "dm" ? [["pin", "flag", "Spillo", "Pin"]] : []),
    ["measure", "ruler", "Misura", "Measure"],
  ];
  const selectedPin = ui.selected ? w.pins.find((p) => p.id === ui.selected) : null;
  return `<div class="wm-mapbar"><nav class="wm-crumbs" aria-label="${ctx.t("Percorso delle mappe", "Map trail")}">${crumbs}</nav><div class="wm-mapbar-tools">${mapSelect(ctx, w, map)}${ctx.role === "dm" ? button(ctx, `${ctx.icon("plus")} ${ctx.t("Nuova mappa", "New map")}`, "map-new", {}, "quiet") + button(ctx, `${ctx.icon("settings")} ${ctx.t("Impostazioni della mappa", "Map settings")}`, "map-settings", { map: map.id }, "quiet") : ""}</div></div><div class="wm-explorer"><div class="wm-stage" data-wm-stage><svg class="wm-canvas${ui.tool !== "select" ? " is-tool" : ""}" data-wm-canvas data-map="${ctx.esc(map.id)}" viewBox="${v.x} ${v.y} ${v.w} ${viewHeight(map, v)}" preserveAspectRatio="xMidYMid meet" tabindex="0" role="application" aria-roledescription="${ctx.t("mappa", "map")}" aria-label="${ctx.esc(`${map.name}. ${hint(ctx)}`)}" aria-describedby="wm-hint"><g class="wm-art">${artSVG(map)}</g><g class="wm-pins">${pins.map((p) => pinSVG(ctx, w, p, scale)).join("")}</g>${measureSVG(ctx, map, scale)}</svg><div class="wm-crosshair" aria-hidden="true"></div><div class="wm-legend-anchor"><button type="button" class="button wm-legend-button" ${act("legend")} aria-expanded="${ui.legend}" aria-controls="wm-legend">${ctx.icon("menu")} ${ctx.t("Legenda", "Legend")}</button>${legendHTML(ctx, w, map)}</div><div class="wm-zoom" role="group" aria-label="${ctx.t("Zoom", "Zoom")}"><button type="button" class="icon-button" ${act("zoom", { dir: "in" })} aria-label="${ctx.t("Ingrandisci", "Zoom in")}">+</button><button type="button" class="icon-button" ${act("zoom", { dir: "out" })} aria-label="${ctx.t("Riduci", "Zoom out")}">−</button><button type="button" class="icon-button" ${act("zoom", { dir: "fit" })} aria-label="${ctx.t("Mostra tutta la mappa", "Fit the whole map")}">${ctx.icon("grid")}</button></div><div class="wm-scale" data-wm-scale aria-hidden="true"><span></span><i></i></div></div><div class="wm-toolbar" role="toolbar" aria-label="${ctx.t("Strumenti della mappa", "Map tools")}">${tools
    .map(
      ([id, icon, it, en]) =>
        `<button type="button" class="button ${ui.tool === id ? "active" : "quiet"}" ${act("tool", { tool: id })} aria-pressed="${ui.tool === id}">${ctx.icon(icon)} ${ctx.t(it, en)}</button>`,
    )
    .join(
      "",
    )}${ui.tool === "pin" ? `<label class="wm-rapid"><input type="checkbox" ${act("rapid")} ${ui.rapid ? "checked" : ""}> ${ctx.t("Rapido", "Rapid")}</label>` : ""}${undoButton(ctx)}</div><p class="muted wm-hint" id="wm-hint" aria-live="polite">${ctx.esc(hint(ctx))}</p><aside class="wm-panel" aria-label="${ctx.t("Dettagli", "Details")}">${ui.tool === "measure" ? measurePanel(ctx, w, map) : selectedPin ? pinPanel(ctx, w, selectedPin) : mapPanel(ctx, w, map)}</aside></div>`;
}
function mapPanel(ctx, w, map) {
  const pins = D.visiblePins(w, ctx.role, map.id);
  const children = pins
    .filter(
      (p) =>
        p.childMapId &&
        D.canSeeMap(
          w.maps.find((m) => m.id === p.childMapId),
          ctx.role,
        ),
    )
    .map((p) => ({ pin: p, map: w.maps.find((m) => m.id === p.childMapId) }));
  return `<h2>${ctx.esc(map.name)}</h2><p class="muted">${ctx.t("Larghezza", "Width")}: ${ctx.esc(distanceText(ctx, map.width * map.kmPerUnit))} · ${pins.length} ${ctx.t("luoghi", "places")}${map.visibility === "dm" ? ` · ${ctx.t("solo DM", "DM only")}` : ""}</p><p>${ctx.t("Seleziona un luogo sulla mappa o nella legenda per leggerne le informazioni e la storia.", "Select a place on the map or in the legend to read its information and history.")}</p>${children.length ? `<h3>${ctx.t("Mappe collegate", "Linked maps")}</h3><ul class="wm-list">${children.map((c) => `<li>${button(ctx, `${ctx.icon("map")} ${ctx.esc(c.map.name)}`, "open-map", { map: c.map.id }, "quiet")}</li>`).join("")}</ul>` : ""}${ctx.role === "dm" ? `<div class="wm-actions">${button(ctx, `${ctx.icon("flag")} ${ctx.t("Nuovo spillo al centro", "New pin at the centre")}`, "pin-new-center")}${w.rootMapId !== map.id && map.visibility === "all" ? button(ctx, ctx.t("Rendi mappa principale", "Make main map"), "map-root", { map: map.id }, "quiet") : ""}${button(ctx, ctx.t("Elimina la mappa", "Delete the map"), "map-delete", { map: map.id }, "danger")}</div>` : ""}`;
}
function entryInfo(ctx, pin) {
  if (!pin.entryId) return null;
  try {
    return getCampaignEntry(ctx.state, pin.entryId, ctx.role);
  } catch {
    return null;
  }
}
function pinPanel(ctx, w, pin) {
  const cal = w.calendar;
  const group = w.groups.find((g) => g.id === pin.groupId);
  const entry = entryInfo(ctx, pin);
  const child = pin.childMapId ? w.maps.find((m) => m.id === pin.childMapId) : null;
  const childVisible = child && D.canSeeMap(child, ctx.role);
  const history = D.eventsForPin(w, pin.id, ctx.role);
  const dm = ctx.role === "dm";
  const scene = pin.sceneId ? ctx.state.scenes?.find((s) => s.id === pin.sceneId) : null;
  const sceneOpen = scene && (dm || (scene.revealed && ctx.state.activeSceneId === scene.id));
  const entries = dm
    ? listCampaignEntries(ctx.state, { campaignId: campaignId(ctx), kind: "world" }, ctx.role)
    : [];
  return `<div class="wm-pin-panel" data-wm-pin-panel="${ctx.esc(pin.id)}"><div class="wm-panel-head"><h2 id="wm-pin-title" tabindex="-1">${ctx.esc(pin.name)}</h2><button type="button" class="icon-button" ${act("deselect")} aria-label="${ctx.t("Chiudi i dettagli", "Close the details")}">${ctx.icon("close")}</button></div><p>${badge(ctx, group?.name ?? ctx.t("Senza gruppo", "No group"))}${pin.visibility === "dm" ? badge(ctx, ctx.t("Solo DM", "DM only"), "is-secret") : ""}</p>${pin.description ? `<p class="wm-prose">${ctx.esc(pin.description)}</p>` : ""}<section class="wm-block"><h3>${ctx.t("Voce collegata", "Linked entry")}</h3>${
    entry
      ? `<p>${ctx.esc(entry.data.title || ctx.t("Senza titolo", "Untitled"))}</p>${button(ctx, `${ctx.icon("book")} ${ctx.t("Apri la voce", "Open the entry")}`, "open-entry", { entry: entry.id, pin: pin.id })}`
      : // An entry this reader cannot read looks like no entry: the link alone reveals
        // nothing (F-039, B42 review).
        `<p class="muted">${ctx.t("Nessuna voce collegata.", "No linked entry.")}</p>`
  }${
    dm
      ? `<label class="field">${ctx.t("Collega a una voce del Mondo", "Link to a World entry")}<select data-wm-entry-link data-pin="${ctx.esc(pin.id)}"><option value="">${ctx.t("Nessuna", "None")}</option>${entries.map((e) => `<option value="${ctx.esc(e.id)}" ${e.id === pin.entryId ? "selected" : ""}>${ctx.esc(e.data.title || ctx.t("Senza titolo", "Untitled"))}</option>`).join("")}</select></label>${pin.entryId ? "" : button(ctx, `${ctx.icon("plus")} ${ctx.t("Crea la voce del luogo", "Create the place entry")}`, "entry-create", { pin: pin.id })}`
      : ""
  }</section>${
    childVisible
      ? `<section class="wm-block"><h3>${ctx.t("Mappa del luogo", "Place map")}</h3>${button(ctx, `${ctx.icon("map")} ${ctx.t(`Apri la mappa «${child.name}»`, `Open the “${child.name}” map`)}`, "open-map", { map: child.id }, "primary")}</section>`
      : dm && !child
        ? `<section class="wm-block"><h3>${ctx.t("Mappa del luogo", "Place map")}</h3>${button(ctx, `${ctx.icon("plus")} ${ctx.t("Crea la mappa collegata", "Create the linked map")}`, "map-new", { pin: pin.id })}</section>`
        : ""
  }${
    sceneOpen
      ? `<section class="wm-block"><h3>${ctx.t("Scena del Tavolo", "Table scene")}</h3><p>${ctx.esc(scene.name)}</p>${button(ctx, `${ctx.icon("play")} ${dm ? ctx.t("Apri la scena", "Open the scene") : ctx.t("Vai al Tavolo", "Go to the Table")}`, "open-scene", { scene: scene.id })}</section>`
      : ""
  }<section class="wm-block"><h3>${ctx.t("Storia del luogo", "Place history")} <span class="muted">(${history.length})</span></h3>${
    history.length
      ? `<ol class="wm-history">${history
          .map(
            (e) =>
              `<li><span class="wm-when">${ctx.esc(whenText(ctx, cal, e))}</span><span>${ctx.esc(e.title)}</span> ${visibilityBadge(ctx, e)}${e.recurrence !== "none" ? badge(ctx, recurrenceText(ctx, e.recurrence)) : ""}</li>`,
          )
          .join("")}</ol>`
      : `<p class="muted">${ctx.t("Nessun evento registrato qui.", "No event recorded here.")}</p>`
  }<div class="wm-actions">${button(ctx, ctx.t("Apri nella cronologia", "Open in the timeline"), "pin-history", { pin: pin.id }, "quiet")}${button(ctx, `${ctx.icon("plus")} ${ctx.t("Evento qui", "Event here")}`, "event-new", { pin: pin.id }, "quiet")}</div></section><div class="wm-actions">${button(ctx, ctx.t("Centra", "Centre"), "center", { pin: pin.id }, "quiet")}${
    dm
      ? `${button(ctx, `${ctx.icon("pen")} ${ctx.t("Modifica", "Edit")}`, "pin-edit", { pin: pin.id })}${button(ctx, ctx.t("Duplica", "Duplicate"), "pin-duplicate", { pin: pin.id }, "quiet")}${pin.visibility === "dm" ? button(ctx, `${ctx.icon("eye")} ${ctx.t("Mostra ai giocatori", "Show to players")}`, "pin-visibility", { pin: pin.id, to: "all" }) : button(ctx, ctx.t("Nascondi ai giocatori", "Hide from players"), "pin-visibility", { pin: pin.id, to: "dm" }, "quiet")}${button(ctx, ctx.t("Elimina", "Delete"), "pin-delete", { pin: pin.id }, "danger")}`
      : ""
  }</div></div>`;
}
function measurePanel(ctx, w, map) {
  const m = ui.measure?.mapId === map.id ? ui.measure : null;
  const points = m?.points ?? [];
  const { legs, km } = D.routeLegs(points, map.kmPerUnit);
  const estimate = D.travelEstimate(km, { terrain: m?.terrain ?? "", road: m?.road ?? false });
  const name = (p) => p.name || ctx.t("punto sulla mappa", "map point");
  const imperial = unitOf(ctx) === "imperial";
  const source = (s) =>
    `SRD 5.2.1 · ${ctx.t("p.", "p.")} ${s[ctx.lang === "en" ? "en" : "it"].pages.join(", ")}`;
  return `<h2>${ctx.t("Misura il percorso", "Measure the route")}</h2><p class="muted">${ctx.t("Solo una stima: non fa avanzare il tempo. Il DM può sempre riassumere il viaggio.", "An estimate only: it does not advance time. The DM can always summarize the journey.")}</p>${
    legs.length
      ? `<ol class="wm-legs">${legs.map((leg, i) => `<li><span>${ctx.t("Tappa", "Leg")} ${i + 1}: ${ctx.esc(name(leg.from))} → ${ctx.esc(name(leg.to))}</span><strong>${ctx.esc(distanceText(ctx, leg.km))}</strong></li>`).join("")}</ol><p class="wm-total" data-wm-total>${ctx.t("Totale", "Total")}: <strong>${ctx.esc(distanceText(ctx, km))}</strong>${m?.done ? "" : ` · ${ctx.t("in corso", "in progress")}`}</p>`
      : `<p>${ctx.t("Clic sulla mappa per la prima tappa.", "Click the map for the first waypoint.")}</p>`
  }<div class="wm-travel-options"><label class="field">${ctx.t("Terreno prevalente", "Predominant terrain")}<select data-wm-terrain><option value="">${ctx.t("Non indicato", "Not set")}</option>${D.TERRAINS.map((t) => `<option value="${t.id}" ${m?.terrain === t.id ? "selected" : ""}>${ctx.esc(ctx.label(t))}</option>`).join("")}</select></label><label class="wm-check"><input type="checkbox" data-wm-road ${m?.road ? "checked" : ""}> ${ctx.t("Strada in buone condizioni", "Good road")}</label></div>${
    legs.length
      ? `<table class="wm-pace"><caption>${ctx.t("Stima per passo di viaggio (8 ore al giorno)", "Estimate by travel pace (8 hours a day)")}</caption><thead><tr><th scope="col">${ctx.t("Passo", "Pace")}</th><th scope="col">${ctx.t("Al giorno", "Per day")}</th><th scope="col">${ctx.t("Tempo", "Time")}</th></tr></thead><tbody>${estimate
          .map(
            (row) =>
              `<tr class="${row.allowed ? "" : "is-blocked"}" data-wm-pace="${row.id}"><th scope="row">${ctx.esc(ctx.label(row.pace))}</th><td>${imperial ? `${row.pace.miDay} ${ctx.t("miglia", "miles")}` : `${row.pace.kmDay} km`}</td><td>${row.allowed ? ctx.esc(travelText(ctx, row)) : ctx.t("Non consentito su questo terreno", "Not allowed on this terrain")}</td></tr><tr class="wm-effect-row${row.allowed ? "" : " is-blocked"}"><td colspan="3">${ctx.esc(ctx.label(D.PACE_EFFECTS[row.id]))}</td></tr>`,
          )
          .join(
            "",
          )}</tbody></table><p class="muted wm-source">${ctx.t("Passo di viaggio", "Travel Pace")}: ${source(D.SOURCES.pace)}; ${ctx.t("terreno e strade", "terrain and roads")}: ${source(D.SOURCES.terrain)}.</p>`
      : ""
  }<div class="wm-actions">${points.length > 1 && !m?.done ? button(ctx, ctx.t("Termina", "Finish"), "measure-finish", {}, "primary") : ""}${points.length ? button(ctx, ctx.t("Togli l’ultima tappa", "Remove last waypoint"), "measure-back", {}, "quiet") + button(ctx, ctx.t("Azzera", "Clear"), "measure-clear", {}, "quiet") : ""}${button(ctx, ctx.t("Chiudi la misura", "Close measuring"), "tool", { tool: "select" }, "quiet")}</div>`;
}

// ------------------------------------------------------------------ calendar view
function moonIcon(ctx, moon, day, size = 14) {
  const { index, fraction } = C.moonPhase(moon, day);
  const r = 8,
    cx = 10,
    cy = 10;
  const waxing = fraction < 0.5;
  const k = Math.cos(2 * Math.PI * fraction);
  const rx = Math.abs(k) * r;
  const outer = waxing ? 1 : 0;
  const inner = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0;
  const color = /^#[0-9a-f]{6}$/i.test(moon.color) ? moon.color : "#dfe6ea";
  const label = `${moon.name}: ${phaseName(ctx, index)}`;
  return `<svg class="wm-moon" viewBox="0 0 20 20" width="${size}" height="${size}" role="img" aria-label="${ctx.esc(label)}"><title>${ctx.esc(label)}</title><circle cx="10" cy="10" r="8.5" class="wm-moon-dark" stroke="${color}"/>${index === 0 ? "" : `<path d="M${cx} ${cy - r}A${r} ${r} 0 0 ${outer} ${cx} ${cy + r}A${rx.toFixed(2)} ${r} 0 0 ${inner} ${cx} ${cy - r}Z" fill="${color}"/>`}</svg>`;
}
function todayHTML(ctx, w, { compact = false } = {}) {
  const cal = w.calendar;
  const now = nowOf(ctx, w);
  const season = C.seasonOf(cal, now.date.month);
  const moons = cal.moons
    .map(
      (m) =>
        `<span class="wm-moon-row">${moonIcon(ctx, m, now.absDay, compact ? 16 : 18)} ${ctx.esc(m.name)}: ${ctx.esc(phaseName(ctx, C.moonPhase(m, now.absDay).index))}</span>`,
    )
    .join("");
  return `<div class="wm-today" data-wm-today><p class="muted">${ctx.t("Oggi nel mondo", "Today in the world")}</p><p class="wm-today-date" data-wm-today-date>${ctx.esc(C.formatDate(cal, now.date))}</p><p class="wm-today-meta"><strong data-wm-today-time>${C.formatTime(now)}</strong>${season ? ` · ${ctx.esc(season.name)}` : ""}</p><div class="wm-moons-today">${moons}</div></div>`;
}
function remindersHTML(ctx, w) {
  const due = pendingReminders(ctx);
  if (!due.length) return "";
  const cal = w.calendar;
  return `<section class="wm-reminders" aria-live="polite"><h3>${ctx.icon("bell")} ${ctx.t("Promemoria arrivati", "Reminders reached")}</h3><ul>${due
    .map(
      (r) =>
        `<li data-wm-reminder="${ctx.esc(r.key)}"><div><strong>${ctx.esc(r.event.title)}</strong> ${visibilityBadge(ctx, r.event)}<span class="wm-when">${ctx.esc(whenText(ctx, cal, r.event, r.day))}</span></div><div class="wm-actions">${button(ctx, ctx.t("Mostra", "Show"), "event-show", { event: r.event.id, day: r.day }, "quiet")}${button(ctx, ctx.t("Visto", "Seen"), "ack", { key: r.key })}</div></li>`,
    )
    .join("")}</ul></section>`;
}
function eventRow(ctx, w, e, day = null) {
  const cal = w.calendar;
  const pin = e.pinId ? w.pins.find((p) => p.id === e.pinId) : null;
  const pinVisible = pin && D.canSeePin(w, pin, ctx.role);
  const own = D.canEditEvent(e, ctx.role);
  const last = e.corrections?.at(-1);
  return `<li class="wm-event" data-wm-event="${ctx.esc(e.id)}"><div class="wm-event-head"><strong>${ctx.esc(e.title)}</strong>${visibilityBadge(ctx, e)}${e.recurrence !== "none" ? badge(ctx, recurrenceText(ctx, e.recurrence)) : ""}${e.reminder ? badge(ctx, ctx.t("Promemoria", "Reminder")) : ""}</div><span class="wm-when">${ctx.esc(whenText(ctx, cal, e, day))}</span>${pinVisible ? button(ctx, `${ctx.icon("map")} ${ctx.esc(pin.name)}`, "show-pin", { pin: pin.id }, "quiet wm-place") : ""}${e.description ? `<p class="wm-prose">${ctx.esc(e.description)}</p>` : ""}${last?.reason ? `<p class="muted wm-correction">${ctx.t("Data corretta", "Date corrected")}: ${ctx.esc(last.reason)}</p>` : ""}${
    own || (ctx.role === "dm" && e.owner === "dm")
      ? `<div class="wm-actions">${button(ctx, ctx.t("Modifica", "Edit"), "event-edit", { event: e.id }, "quiet")}${ctx.role === "dm" && e.visibility === "dm" ? button(ctx, `${ctx.icon("eye")} ${ctx.t("Rivela ai giocatori", "Reveal to players")}`, "event-reveal", { event: e.id }) : ""}${ctx.role === "dm" && e.owner === "dm" && e.visibility === "all" ? button(ctx, ctx.t("Nascondi", "Hide"), "event-hide", { event: e.id }, "quiet") : ""}${button(ctx, ctx.t("Elimina", "Delete"), "event-delete", { event: e.id }, "quiet wm-danger-text")}</div>`
      : ""
  }</li>`;
}
function calendarView(ctx, w) {
  const cal = w.calendar;
  const now = nowOf(ctx, w);
  ui.calCursor ??= { year: now.date.year, month: now.date.month };
  if (C.monthIndex(cal, ui.calCursor.month) < 0)
    ui.calCursor = { year: now.date.year, month: now.date.month };
  ui.calDay ??= now.absDay;
  const { year, month } = ui.calCursor;
  const rows = C.monthGrid(cal, year, month);
  const first = C.absDay(cal, { year, month, day: 1 });
  const lastDay = first + cal.months[C.monthIndex(cal, month)].days - 1;
  const events = D.visibleEvents(w, ctx.role);
  const byDay = new Map();
  for (const e of events)
    for (const day of C.occurrences(cal, e, first, lastDay))
      byDay.set(day, [...(byDay.get(day) ?? []), e]);
  const inMonth = ui.calDay >= first && ui.calDay <= lastDay;
  const focusDay = inMonth
    ? ui.calDay
    : now.absDay >= first && now.absDay <= lastDay
      ? now.absDay
      : first;
  const season = C.seasonOf(cal, month);
  const selectedDate = C.dateFromAbsDay(cal, ui.calDay);
  const dayEvents = D.eventsOnDay(w, ctx.role, ui.calDay);
  const next = D.upcoming(w, ctx.role, now.abs, 5);
  const grid = `<table class="wm-grid" role="grid" aria-labelledby="wm-month-title"><thead><tr>${cal.weekdays.map((d) => `<th scope="col" abbr="${ctx.esc(d.name)}">${ctx.esc(d.name.slice(0, 3))}</th>`).join("")}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => {
            if (!cell) return `<td class="wm-blank"></td>`;
            const list = byDay.get(cell.absDay) ?? [];
            const today = cell.absDay === now.absDay;
            const selected = cell.absDay === ui.calDay;
            const moons = cal.moons.map((m) => moonIcon(ctx, m, cell.absDay, 12)).join("");
            const aria = [
              C.formatDate(cal, { year, month, day: cell.day }),
              today ? ctx.t("oggi", "today") : "",
              list.length ? ctx.t(`${list.length} eventi`, `${list.length} events`) : "",
            ]
              .filter(Boolean)
              .join(", ");
            return `<td><button type="button" class="wm-day${today ? " is-today" : ""}${selected ? " is-selected" : ""}" ${act("cal-day", { day: cell.absDay })} data-wm-day="${cell.absDay}" tabindex="${cell.absDay === focusDay ? 0 : -1}" aria-pressed="${selected}" aria-label="${ctx.esc(aria)}"${today ? ` aria-current="date"` : ""}><span class="wm-day-n">${cell.day}</span><span class="wm-day-moons">${moons}</span><span class="wm-day-events">${list
              .slice(0, 2)
              .map(
                (e) =>
                  `<span class="wm-chip${e.visibility !== "all" ? " is-hidden" : ""}">${ctx.esc(e.title)}</span>`,
              )
              .join(
                "",
              )}${list.length > 2 ? `<span class="wm-chip is-more">+${list.length - 2}</span>` : ""}</span></button></td>`;
          })
          .join("")}</tr>`,
    )
    .join("")}</tbody></table>`;
  const dm = ctx.role === "dm";
  return `<div class="wm-cal-head">${todayHTML(ctx, w)}<div class="wm-actions">${dm ? button(ctx, `${ctx.icon("clock")} ${ctx.t("Avanza il tempo", "Advance time")}`, "advance", {}, "primary") : ""}${button(ctx, `${ctx.icon("plus")} ${ctx.t("Nuovo evento", "New event")}`, "event-new", { day: ui.calDay })}${dm ? button(ctx, `${ctx.icon("settings")} ${ctx.t("Impostazioni del calendario", "Calendar settings")}`, "cal-settings", {}, "quiet") : ""}${undoButton(ctx)}</div></div><p class="muted wm-time-note">${ctx.t("La data avanza solo con il gioco o con il DM (riposi, round, «Tempo» al Tavolo). Le date reali degli incontri restano in Sessioni.", "The date advances only through play or the DM (rests, rounds, “Time” at the Table). Real meeting dates stay in Sessions.")}</p>${remindersHTML(ctx, w)}<div class="wm-cal-layout"><section class="wm-month" data-wm-month><div class="wm-month-nav"><button type="button" class="icon-button" ${act("cal-prev")} aria-label="${ctx.t("Mese precedente", "Previous month")}" title="Ctrl+←">‹</button><h2 id="wm-month-title">${ctx.esc(cal.months[C.monthIndex(cal, month)].name)} ${ctx.esc(C.formatYear(cal, year))}${season ? ` <span class="muted">· ${ctx.esc(season.name)}</span>` : ""}</h2><button type="button" class="icon-button" ${act("cal-next")} aria-label="${ctx.t("Mese successivo", "Next month")}" title="Ctrl+→">›</button>${button(ctx, ctx.t("Oggi", "Today"), "cal-today", {}, "quiet")}</div><div class="wm-grid-wrap">${grid}</div><p class="muted wm-legend-line">${cal.moons.map((m) => `${moonIcon(ctx, m, now.absDay, 12)} ${ctx.esc(m.name)} (${ctx.t("ciclo", "cycle")} ${nf(ctx, m.cycle)} ${ctx.t("giorni", "days")})`).join(" · ")}</p></section><aside class="wm-dayside"><section><h3 id="wm-day-title" tabindex="-1">${ctx.esc(C.formatDate(cal, selectedDate))}</h3>${dayEvents.length ? `<ul class="wm-events">${dayEvents.map((e) => eventRow(ctx, w, e, ui.calDay)).join("")}</ul>` : `<p class="muted">${ctx.t("Nessun evento in questo giorno.", "No event on this day.")}</p>`}</section><section><h3>${ctx.t("Prossimi eventi", "Upcoming events")}</h3>${next.length ? `<ul class="wm-upcoming">${next.map((row) => `<li><button type="button" class="text-button" ${act("event-show", { event: row.event.id, day: row.day })}>${ctx.esc(row.event.title)}</button> <span class="wm-when">${ctx.esc(whenText(ctx, cal, row.event, row.day))}</span></li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessun evento in arrivo.", "No upcoming event.")}</p>`}</section>${
    (cal.corrections ?? []).length && dm
      ? `<details><summary>${ctx.t("Correzioni della data d’inizio", "Start date corrections")}</summary><ul>${cal.corrections.map((c) => `<li>${ctx.esc(C.formatDate(cal, c.from))} → ${ctx.esc(C.formatDate(cal, c.to))}: ${ctx.esc(c.reason)}</li>`).join("")}</ul></details>`
      : ""
  }</aside></div>`;
}

// ------------------------------------------------------------------ timeline view
function timelineView(ctx, w) {
  const cal = w.calendar;
  const now = nowOf(ctx, w);
  // A DM-only place named by the route (a shared link, a role change) is ignored.
  const pin = placeFilter(ctx, w);
  const groups = D.chronicle(w, ctx.role, { pinId: ui.place });
  const places = D.visiblePins(w, ctx.role).filter((p) =>
    w.events.some((e) => e.pinId === p.id && D.canSeeEvent(e, ctx.role)),
  );
  let nowPlaced = false;
  const nowRow = () => {
    nowPlaced = true;
    return `<li class="wm-now" aria-label="${ctx.t("Adesso", "Now")}"><span>${ctx.t("Adesso", "Now")}</span> ${ctx.esc(C.formatDate(cal, now.date))} · ${C.formatTime(now)}</li>`;
  };
  const sections = groups
    .map((g) => {
      const inEra =
        !g.era ||
        (now.date.year >= g.era.startYear && (g.endYear === null || now.date.year <= g.endYear));
      const items = g.events
        .map((e) => {
          const before =
            !nowPlaced && inEra && C.absSeconds(cal, e.date, e.time) > now.abs ? nowRow() : "";
          return before + eventRow(ctx, w, e);
        })
        .join("");
      const tail = !nowPlaced && inEra ? nowRow() : "";
      return `<section class="wm-era"><h2>${g.era ? ctx.esc(g.era.name) : ctx.t("Prima delle ere", "Before the eras")} <span class="muted">${g.era ? `${g.era.startYear} – ${g.endYear ?? ctx.t("oggi", "today")}${g.era.abbr ? ` · ${ctx.esc(g.era.abbr)}` : ""}` : ""}</span></h2>${items || tail ? `<ol class="wm-chronicle">${items}${tail}</ol>` : `<p class="muted">${ctx.t("Nessun evento in questa era.", "No event in this era.")}</p>`}</section>`;
    })
    .join("");
  return `<div class="wm-timeline-bar"><label class="field">${ctx.t("Luogo", "Place")}<select data-wm-place><option value="">${ctx.t("Tutti i luoghi", "All places")}</option>${places.map((p) => `<option value="${ctx.esc(p.id)}" ${p.id === ui.place ? "selected" : ""}>${ctx.esc(p.name)}</option>`).join("")}</select></label><div class="wm-actions">${button(ctx, `${ctx.icon("plus")} ${ctx.t("Nuovo evento", "New event")}`, "event-new", pin ? { pin: pin.id } : {})}${ctx.role === "dm" ? button(ctx, ctx.t("Modifica le ere", "Edit eras"), "eras", {}, "quiet") : ""}${pin && D.canSeePin(w, pin, ctx.role) ? button(ctx, `${ctx.icon("map")} ${ctx.t("Mostra sulla mappa", "Show on the map")}`, "show-pin", { pin: pin.id }, "quiet") : ""}${undoButton(ctx)}</div></div>${pin ? `<p class="muted">${ctx.t(`Storia di «${pin.name}»`, `History of “${pin.name}”`)}</p>` : ""}<div class="wm-timeline">${sections}</div>`;
}

// ------------------------------------------------------------------ section
function renderSection(ctx) {
  syncRole(ctx);
  const w = worldFor(ctx);
  const r = parseRoute(ctx);
  applyRoute(ctx, w, r);
  const tabs = [
    ["map", "Mappa del mondo", "World map"],
    ["calendar", "Calendario", "Calendar"],
    ["timeline", "Cronologia", "Timeline"],
  ];
  const body =
    r.view === "calendar"
      ? calendarView(ctx, w)
      : r.view === "timeline"
        ? timelineView(ctx, w)
        : mapView(ctx, w, r);
  return `<div class="wm" data-wm-root data-wm-view="${r.view}"><div class="campaign-heading"><div><h1>${ctx.t("Mappa e calendario", "Map and calendar")}</h1><p class="muted">${ctx.esc(ctx.label(ctx.state.campaign?.name ?? ""))} · ${ctx.esc(w.calendar.name)}</p></div></div><nav class="tabs wm-tabs" aria-label="${ctx.t("Viste del mondo", "World views")}">${tabs
    .map(
      ([id, it, en]) =>
        `<button type="button" class="${r.view === id ? "active" : ""}" ${act("view", { view: id })}${r.view === id ? ` aria-current="page"` : ""}>${ctx.t(it, en)}</button>`,
    )
    .join("")}</nav>${body}</div>`;
}

// ------------------------------------------------------------------ entry box and Table tab
function renderEntryBox(ctx, entry) {
  const w = worldFor(ctx);
  const pins = D.pinsForEntry(w, entry.id, ctx.role);
  if (!pins.length) return "";
  return `<section class="wm-entry" aria-labelledby="wm-entry-title"><h2 id="wm-entry-title">${ctx.t("Sulla mappa", "On the map")}</h2>${pins
    .map((pin) => {
      const map = w.maps.find((m) => m.id === pin.mapId);
      const history = D.eventsForPin(w, pin.id, ctx.role);
      return `<article class="wm-entry-pin"><p><strong>${ctx.esc(pin.name)}</strong> · ${ctx.esc(map?.name ?? "")}</p>${button(ctx, `${ctx.icon("map")} ${ctx.t("Mostra sulla mappa", "Show on the map")}`, "show-pin", { pin: pin.id })}${history.length ? `<h3>${ctx.t("Storia del luogo", "Place history")}</h3><ol class="wm-history">${history.map((e) => `<li><span class="wm-when">${ctx.esc(whenText(ctx, w.calendar, e))}</span><span>${ctx.esc(e.title)}</span> ${visibilityBadge(ctx, e)}</li>`).join("")}</ol>` : ""}</article>`;
    })
    .join("")}</section>`;
}
function renderTablePanel(ctx) {
  const w = worldFor(ctx);
  const now = nowOf(ctx, w);
  const today = D.eventsOnDay(w, ctx.role, now.absDay);
  const next = D.upcoming(w, ctx.role, now.abs, 3);
  return `<div class="wm wm-table-panel" data-wm-root>${todayHTML(ctx, w, { compact: true })}${remindersHTML(ctx, w)}<section><h3>${ctx.t("Oggi", "Today")}</h3>${today.length ? `<ul class="wm-events">${today.map((e) => `<li><strong>${ctx.esc(e.title)}</strong> ${visibilityBadge(ctx, e)} <span class="wm-when">${e.time ? C.formatTime(e.time) : ctx.t("tutto il giorno", "all day")}</span></li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessun evento oggi.", "No event today.")}</p>`}</section><section><h3>${ctx.t("Prossimi eventi", "Upcoming events")}</h3>${next.length ? `<ul class="wm-upcoming">${next.map((row) => `<li><button type="button" class="text-button" ${act("event-show", { event: row.event.id, day: row.day })}>${ctx.esc(row.event.title)}</button> <span class="wm-when">${ctx.esc(whenText(ctx, w.calendar, row.event, row.day))}</span></li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessun evento in arrivo.", "No upcoming event.")}</p>`}</section><div class="wm-actions">${ctx.role === "dm" ? button(ctx, `${ctx.icon("clock")} ${ctx.t("Avanza il tempo", "Advance time")}`, "advance", {}, "primary") : ""}${button(ctx, ctx.t("Apri il calendario", "Open the calendar"), "view", { view: "calendar" })}${button(ctx, `${ctx.icon("map")} ${ctx.t("Mappa del mondo", "World map")}`, "view", { view: "map" }, "quiet")}</div></div>`;
}

// ------------------------------------------------------------------ dialogs
const field = (label, control, cls = "") =>
  `<label class="field ${cls}">${label}${control}</label>`;
const opt = (ctx, value, label, current) =>
  `<option value="${ctx.esc(value)}" ${String(current) === String(value) ? "selected" : ""}>${ctx.esc(label)}</option>`;
const fd = (form, key) => {
  const v = form.get(key);
  return v === null || v === undefined ? "" : String(v);
};
const all = (form, key) => (form.getAll ? form.getAll(key).map(String) : []);
const num = (v) => (String(v).trim() === "" ? NaN : Number(String(v).replace(",", ".")));

function openPinDialog(ctx, { pinId = null, mapId = null, x = 0, y = 0 } = {}) {
  const w = worldFor(ctx);
  const pin = pinId ? w.pins.find((p) => p.id === pinId) : null;
  const ownMap = pin?.mapId ?? mapId;
  const entries = listCampaignEntries(
    ctx.state,
    { campaignId: campaignId(ctx), kind: "world" },
    ctx.role,
  );
  const maps = w.maps.filter((m) => m.id !== ownMap);
  const cur = pin ?? {
    name: "",
    groupId: w.groups[0]?.id,
    visibility: "all",
    description: "",
    entryId: null,
    childMapId: null,
    sceneId: null,
  };
  const body = `${field(ctx.t("Nome", "Name"), `<input name="name" required maxlength="80" value="${ctx.esc(cur.name)}" autocomplete="off">`)}<div class="wm-form-row">${field(ctx.t("Gruppo", "Group"), `<select name="groupId">${w.groups.map((g) => opt(ctx, g.id, g.name, cur.groupId)).join("")}</select>`)}${field(ctx.t("Chi lo vede", "Who sees it"), `<select name="visibility">${opt(ctx, "all", ctx.t("Tutti", "Everyone"), cur.visibility)}${opt(ctx, "dm", ctx.t("Solo DM", "DM only"), cur.visibility)}</select>`)}</div>${field(ctx.t("Descrizione", "Description"), `<textarea name="description" maxlength="2000">${ctx.esc(cur.description)}</textarea>`)}${field(ctx.t("Voce del Mondo collegata", "Linked World entry"), `<select name="entryId"><option value="">${ctx.t("Nessuna", "None")}</option>${entries.map((e) => opt(ctx, e.id, e.data.title || ctx.t("Senza titolo", "Untitled"), cur.entryId ?? "")).join("")}</select>`)}${field(ctx.t("Apre la mappa", "Opens the map"), `<select name="childMapId"><option value="">${ctx.t("Nessuna", "None")}</option>${maps.map((m) => opt(ctx, m.id, m.name, cur.childMapId ?? "")).join("")}</select>`)}${field(ctx.t("Scena del Tavolo", "Table scene"), `<select name="sceneId"><option value="">${ctx.t("Nessuna", "None")}</option>${(ctx.state.scenes ?? []).map((s) => opt(ctx, s.id, s.name, cur.sceneId ?? "")).join("")}</select>`)}${pin ? `<div class="wm-form-row">${field("X", `<input name="x" type="number" value="${pin.x}">`)}${field("Y", `<input name="y" type="number" value="${pin.y}">`)}</div>` : ""}`;
  ctx.dialog(
    pin ? ctx.t("Modifica lo spillo", "Edit the pin") : ctx.t("Nuovo spillo", "New pin"),
    body,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (form) => submitPin(ctx, form, { pinId, mapId: ownMap, x, y }),
    },
  );
}
export function submitPin(ctx, form, { pinId = null, mapId = null, x = 0, y = 0 } = {}) {
  const input = {
    mapId,
    x: pinId ? num(fd(form, "x")) : x,
    y: pinId ? num(fd(form, "y")) : y,
    name: fd(form, "name"),
    groupId: fd(form, "groupId"),
    visibility: fd(form, "visibility"),
    description: fd(form, "description"),
    entryId: fd(form, "entryId"),
    childMapId: fd(form, "childMapId"),
    sceneId: fd(form, "sceneId"),
  };
  const secret = input.visibility === "dm";
  const pin = change(
    ctx,
    pinId
      ? L("Spillo modificato", "Pin edited")
      : L("Spillo aggiunto alla mappa", "Pin added to the map"),
    (world) =>
      pinId ? D.updatePin(world, ctx.role, pinId, input) : D.createPin(world, ctx.role, input),
    secret ? { visibility: "private" } : {},
  );
  if (!pinId) {
    if (ui.rapid) ui.tool = "pin";
    else {
      ui.tool = "select";
      ui.selected = pin.id;
      ui.focus = "#wm-pin-title";
    }
    ctx.render(); // the commit rendered before the new pin became the selection
  }
  return true;
}
function confirmDialog(ctx, title, text, label, onConfirm) {
  ctx.dialog(title, `<p>${ctx.esc(text)}</p>`, { submitLabel: label, onSubmit: () => onConfirm() });
}
function openEntryCreate(ctx, pinId) {
  const w = worldFor(ctx);
  const pin = w.pins.find((p) => p.id === pinId);
  if (!pin) return;
  const body = `<p class="muted">${ctx.t("Crea una voce «Luogo» nel Mondo, collegata a questo spillo. Potrai completarla dal suo editor.", "Creates a “Place” entry in World, linked to this pin. You can complete it in its editor.")}</p>${field(ctx.t("Titolo", "Title"), `<input name="title" required maxlength="120" value="${ctx.esc(pin.name)}">`)}${field(ctx.t("Testo", "Text"), `<textarea name="body">${ctx.esc(pin.description)}</textarea>`)}${field(ctx.t("Chi la legge", "Who reads it"), `<select name="access">${opt(ctx, "campaign", ctx.t("Tutta la campagna", "The whole campaign"), pin.visibility === "dm" ? "dms" : "campaign")}${opt(ctx, "dms", ctx.t("Solo DM", "DM only"), pin.visibility === "dm" ? "dms" : "campaign")}</select>`)}`;
  ctx.dialog(ctx.t("Crea la voce del luogo", "Create the place entry"), body, {
    submitLabel: ctx.t("Crea e collega", "Create and link"),
    onSubmit: (form) => submitEntryCreate(ctx, pinId, form),
  });
}
/** LegendKeeper "create a page from the map" (CMP-67): one command creates and links. */
export function submitEntryCreate(ctx, pinId, form) {
  const mode = fd(form, "access") === "dms" ? "dms" : "campaign";
  const title = fd(form, "title").trim();
  if (!title) throw D.fail("Scrivi un titolo.", "Write a title.");
  change(
    ctx,
    L("Voce creata dal luogo della mappa", "Entry created from the map place"),
    (world, nowAbs, draft) => {
      const pin = world.pins.find((p) => p.id === pinId);
      if (!pin) throw D.fail("Spillo non disponibile.", "Pin unavailable.");
      const id = D.newId("wmentry");
      createCampaignDraft(
        draft,
        { id, kind: "world", campaignId: D.campaignIdOf(draft) },
        ctx.role,
      );
      saveCampaignDraft(
        draft,
        id,
        {
          data: {
            title,
            body: fd(form, "body"),
            worldType: "place",
            questStatus: "open",
            sessionId: null,
            narratorActorId: null,
            links: [],
            sections: [],
          },
          access: { mode, grants: [] },
        },
        ctx.role,
      );
      const preview = previewCampaignDraft(draft, id, ctx.role);
      if (!preview.canApply) throw D.fail(preview.errors[0].it, preview.errors[0].en);
      const result = applyCampaignDraft(draft, id, { reviewKey: preview.reviewKey }, ctx.role, {
        online: !ctx.offline,
      });
      D.linkPinEntry(world, ctx.role, pinId, result.entryId);
    },
    mode === "dms" ? { visibility: "private" } : {},
  );
  return true;
}
function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type))
      return reject(D.fail("Usa un’immagine PNG, JPEG o WebP.", "Use a PNG, JPEG or WebP image."));
    if (file.size > D.MAX_BACKGROUND)
      return reject(D.fail("L’immagine supera 2 MB.", "The image exceeds 2 MB."));
    const reader = new FileReader();
    reader.onerror = () =>
      reject(D.fail("Impossibile leggere il file.", "The file cannot be read."));
    reader.onload = () => {
      const img = new Image();
      img.onload = () =>
        resolve({ url: reader.result, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () =>
        reject(D.fail("Il file non è un’immagine valida.", "The file is not a valid image."));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function openMapDialog(ctx, { mapId = null, fromPinId = null } = {}) {
  const w = worldFor(ctx);
  const map = mapId ? w.maps.find((m) => m.id === mapId) : null;
  const pin = fromPinId ? w.pins.find((p) => p.id === fromPinId) : null;
  const arts = [
    ["valley", ctx.t("Regione (disegno d’esempio)", "Region (sample drawing)")],
    ["city", ctx.t("Città (disegno d’esempio)", "City (sample drawing)")],
    ["crypt", ctx.t("Sotterraneo (disegno d’esempio)", "Dungeon (sample drawing)")],
    ["parchment", ctx.t("Pergamena a quadretti", "Squared parchment")],
  ];
  const widthKm = map ? map.width * map.kmPerUnit : pin ? 2 : 200;
  // The width is asked in the reader's unit, like every distance shown (B42 review).
  const miles = unitOf(ctx) === "imperial";
  const width = miles ? widthKm / D.KM_PER_MILE : widthKm;
  const body = `${pin ? `<p class="muted">${ctx.t(`Si aprirà dallo spillo «${pin.name}».`, `It will open from the “${pin.name}” pin.`)}</p>` : ""}${field(ctx.t("Nome", "Name"), `<input name="name" required maxlength="80" value="${ctx.esc(map?.name ?? pin?.name ?? "")}">`)}${field(miles ? ctx.t("Larghezza reale della mappa (miglia)", "Real width of the map (miles)") : ctx.t("Larghezza reale della mappa (km)", "Real width of the map (km)"), `<input name="width" type="number" min="0.001" step="any" required value="${Number(width.toFixed(4))}"><input type="hidden" name="unit" value="${miles ? "mi" : "km"}">`)}${field(ctx.t("Sfondo", "Background"), `<select name="art">${arts.map(([v, label]) => opt(ctx, v, label, map?.art ?? (pin ? "city" : "valley"))).join("")}</select>`)}${field(ctx.t("Oppure carica un’immagine (PNG, JPEG o WebP, massimo 2 MB)", "Or upload an image (PNG, JPEG or WebP, 2 MB at most)"), `<input type="file" accept="image/png,image/jpeg,image/webp" data-wm-upload>`)}<input type="hidden" name="background"><input type="hidden" name="imgWidth"><input type="hidden" name="imgHeight"><p class="muted" data-wm-upload-status aria-live="polite">${map?.background ? ctx.t("Questa mappa usa un’immagine caricata.", "This map uses an uploaded image.") : ""}</p>${field(ctx.t("Chi la vede", "Who sees it"), `<select name="visibility">${opt(ctx, "all", ctx.t("Tutti", "Everyone"), map?.visibility ?? (pin?.visibility === "dm" ? "dm" : "all"))}${opt(ctx, "dm", ctx.t("Solo DM", "DM only"), map?.visibility ?? (pin?.visibility === "dm" ? "dm" : "all"))}</select>`)}`;
  ctx.dialog(
    map ? ctx.t("Impostazioni della mappa", "Map settings") : ctx.t("Nuova mappa", "New map"),
    body,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (form) => submitMap(ctx, form, { mapId, fromPinId }),
    },
  );
  const dialog = globalThis.document?.querySelector("#dialog");
  const input = dialog?.querySelector("[data-wm-upload]");
  if (input)
    input.addEventListener("change", () => {
      const status = dialog.querySelector("[data-wm-upload-status]");
      const file = input.files?.[0];
      dialog.querySelector('[name="background"]').value = "";
      if (!file) return;
      status.textContent = ctx.t("Caricamento…", "Loading…");
      dialog.dataset.wmLoading = "1";
      readImage(file)
        .then((img) => {
          dialog.querySelector('[name="background"]').value = img.url;
          dialog.querySelector('[name="imgWidth"]').value = img.width;
          dialog.querySelector('[name="imgHeight"]').value = img.height;
          status.textContent = ctx.t(
            `Immagine pronta: ${img.width} × ${img.height} px.`,
            `Image ready: ${img.width} × ${img.height} px.`,
          );
        })
        .catch((error) => {
          input.value = "";
          status.textContent = errorText(ctx, error);
          status.classList.add("error");
        })
        .finally(() => delete dialog.dataset.wmLoading);
    });
}
export function submitMap(ctx, form, { mapId = null, fromPinId = null } = {}) {
  if (globalThis.document?.querySelector("#dialog")?.dataset.wmLoading)
    throw D.fail(
      "Attendi la fine del caricamento dell’immagine.",
      "Wait for the image to finish loading.",
    );
  const background = fd(form, "background");
  const art = fd(form, "art");
  let width = ART_SIZE[art]?.[0] ?? 1000,
    height = ART_SIZE[art]?.[1] ?? 700;
  if (background) {
    const iw = num(fd(form, "imgWidth")),
      ih = num(fd(form, "imgHeight"));
    if (iw > 0 && ih > 0) {
      width = 1000;
      height = Math.max(100, Math.round((1000 * ih) / iw));
    }
  }
  // "width" is in the unit the dialog showed ("unit"); "widthKm" stays accepted.
  const unit = fd(form, "unit") || (unitOf(ctx) === "imperial" ? "mi" : "km");
  const widthKm = fd(form, "width")
    ? num(fd(form, "width")) * (unit === "mi" ? D.KM_PER_MILE : 1)
    : num(fd(form, "widthKm"));
  const input = {
    name: fd(form, "name"),
    widthKm,
    art,
    background: background || (mapId ? undefined : null),
    visibility: fd(form, "visibility"),
    width,
    height,
    fromPinId,
  };
  const map = change(
    ctx,
    mapId ? L("Mappa aggiornata", "Map updated") : L("Mappa aggiunta", "Map added"),
    (world) =>
      mapId ? D.updateMap(world, ctx.role, mapId, input) : D.createMap(world, ctx.role, input),
    input.visibility === "dm" ? { visibility: "private" } : {},
  );
  if (!mapId) {
    ui.selected = null;
    go(ctx, `map.${map.id}`);
  }
  return true;
}
function rowsEditor(ctx, { name, legend, rows, fields, addLabel, max }) {
  const row = (values = {}) =>
    `<div class="wm-row" data-wm-row>${fields
      .map((f) =>
        f.type === "hidden"
          ? `<input type="hidden" name="${name}-${f.id}" value="${ctx.esc(values[f.id] ?? "")}">`
          : f.type === "select"
            ? field(
                f.label,
                `<select name="${name}-${f.id}">${f.options.map(([v, label]) => opt(ctx, v, label, values[f.id] ?? "")).join("")}</select>`,
                "wm-cell",
              )
            : field(
                f.label,
                `<input name="${name}-${f.id}" type="${f.type ?? "text"}" ${f.attrs ?? ""} value="${ctx.esc(values[f.id] ?? f.default ?? "")}">`,
                "wm-cell",
              ),
      )
      .join(
        "",
      )}<button type="button" class="button quiet wm-row-remove" data-wm-row-remove aria-label="${ctx.t("Rimuovi la riga", "Remove the row")}">${ctx.icon("close")}</button></div>`;
  return `<fieldset class="wm-rows" data-wm-rows="${name}" data-max="${max}"><legend>${legend}</legend><div data-wm-row-list>${rows.map((r) => row(r)).join("")}</div><template data-wm-row-template>${row()}</template><button type="button" class="button quiet" data-wm-row-add>${ctx.icon("plus")} ${addLabel}</button></fieldset>`;
}
function bindRows() {
  const dialog = globalThis.document?.querySelector("#dialog");
  if (!dialog) return;
  dialog.querySelectorAll("[data-wm-rows]").forEach((set) => {
    const list = set.querySelector("[data-wm-row-list]");
    set.querySelector("[data-wm-row-add]").addEventListener("click", () => {
      if (list.children.length >= Number(set.dataset.max || 99)) return;
      list.insertAdjacentHTML("beforeend", set.querySelector("template").innerHTML);
      list.lastElementChild.querySelector("input:not([type=hidden])")?.focus();
    });
    list.addEventListener("click", (e) => {
      const remove = e.target.closest("[data-wm-row-remove]");
      if (!remove) return;
      const row = remove.closest("[data-wm-row]");
      const next = row.nextElementSibling ?? row.previousElementSibling;
      row.remove();
      (
        next?.querySelector("input:not([type=hidden])") ?? set.querySelector("[data-wm-row-add]")
      ).focus();
    });
  });
}
function openGroupsDialog(ctx) {
  const w = worldFor(ctx);
  const body = rowsEditor(ctx, {
    name: "group",
    legend: ctx.t("Gruppi della legenda", "Legend groups"),
    rows: w.groups,
    max: 20,
    addLabel: ctx.t("Aggiungi un gruppo", "Add a group"),
    fields: [
      { id: "id", type: "hidden" },
      { id: "name", label: ctx.t("Nome", "Name"), attrs: 'maxlength="40" required' },
      { id: "color", label: ctx.t("Colore", "Colour"), type: "color", default: "#8fc1d4" },
    ],
  });
  ctx.dialog(ctx.t("Gruppi della legenda", "Legend groups"), body, {
    submitLabel: ctx.t("Salva", "Save"),
    onSubmit: (form) => submitGroups(ctx, form),
  });
  bindRows();
}
export function submitGroups(ctx, form) {
  const ids = all(form, "group-id"),
    names = all(form, "group-name"),
    colors = all(form, "group-color");
  const groups = names.map((n, i) => ({ id: ids[i] || null, name: n, color: colors[i] }));
  change(ctx, L("Gruppi della legenda aggiornati", "Legend groups updated"), (world) =>
    D.saveGroups(world, ctx.role, groups),
  );
  return true;
}
function eventDialog(ctx, { eventId = null, day = null, pinId = null } = {}) {
  const w = worldFor(ctx);
  const cal = w.calendar;
  const event = eventId ? w.events.find((e) => e.id === eventId) : null;
  const now = nowOf(ctx, w);
  const date =
    event?.date ??
    C.dateFromAbsDay(
      cal,
      Number.isFinite(Number(day)) && day !== null && day !== "" ? Number(day) : now.absDay,
    );
  const dm = ctx.role === "dm";
  const cur = event ?? {
    title: "",
    description: "",
    time: null,
    recurrence: "none",
    visibility: dm ? "all" : "private",
    pinId: pinId ?? null,
    reminder: null,
  };
  const pins = D.visiblePins(w, ctx.role);
  const mapName = (id) => w.maps.find((m) => m.id === id)?.name ?? "";
  const vis = dm
    ? [
        ["all", ctx.t("Tutti", "Everyone")],
        ["dm", ctx.t("Solo DM (da rivelare)", "DM only (to reveal)")],
      ]
    : [
        ["private", ctx.t("Solo io", "Only me")],
        ["all", ctx.t("Il gruppo e il DM", "The party and the DM")],
      ];
  const body = `${field(ctx.t("Titolo", "Title"), `<input name="title" required maxlength="120" value="${ctx.esc(cur.title)}" autocomplete="off">`)}<div class="wm-form-row">${field(ctx.t("Giorno", "Day"), `<input name="day" type="number" min="1" max="99" required value="${date.day}">`)}${field(ctx.t("Mese", "Month"), `<select name="month">${cal.months.map((m) => opt(ctx, m.id, m.name, date.month)).join("")}</select>`)}${field(ctx.t("Anno", "Year"), `<input name="year" type="number" min="1" max="${C.MAX_YEAR}" required value="${date.year}">`)}</div><div class="wm-form-row">${field(ctx.t("Ora (vuota: tutto il giorno)", "Time (empty: all day)"), `<input name="time" type="time" value="${cur.time ? C.formatTime(cur.time) : ""}">`)}${field(ctx.t("Si ripete", "Repeats"), `<select name="recurrence">${opt(ctx, "none", ctx.t("No", "No"), cur.recurrence)}${opt(ctx, "monthly", ctx.t("Ogni mese", "Every month"), cur.recurrence)}${opt(ctx, "yearly", ctx.t("Ogni anno", "Every year"), cur.recurrence)}</select>`)}</div>${field(ctx.t("Chi lo vede", "Who sees it"), `<select name="visibility">${vis.map(([v, label]) => opt(ctx, v, label, cur.visibility)).join("")}</select>`)}${field(ctx.t("Luogo", "Place"), `<select name="pinId"><option value="">${ctx.t("Nessuno", "None")}</option>${pins.map((p) => opt(ctx, p.id, `${p.name} · ${mapName(p.mapId)}`, cur.pinId ?? "")).join("")}</select>`)}<div class="wm-form-row">${field(ctx.t("Promemoria", "Reminder"), `<select name="lead">${opt(ctx, "", ctx.t("Nessuno", "None"), cur.reminder ? cur.reminder.leadDays : "")}${opt(ctx, "0", ctx.t("Quando arriva", "When it arrives"), cur.reminder?.leadDays ?? "")}${opt(ctx, "1", ctx.t("1 giorno prima", "1 day before"), cur.reminder?.leadDays ?? "")}${opt(ctx, "3", ctx.t("3 giorni prima", "3 days before"), cur.reminder?.leadDays ?? "")}${opt(ctx, "7", ctx.t("7 giorni prima", "7 days before"), cur.reminder?.leadDays ?? "")}</select>`)}${field(ctx.t("Chi riceve il promemoria", "Who gets the reminder"), `<select name="audience">${opt(ctx, "viewers", ctx.t("Chi vede l’evento", "Whoever sees the event"), cur.reminder?.audience ?? "viewers")}${opt(ctx, "owner", ctx.t("Solo io", "Only me"), cur.reminder?.audience ?? "viewers")}</select>`)}</div>${field(ctx.t("Descrizione", "Description"), `<textarea name="description" maxlength="2000">${ctx.esc(cur.description)}</textarea>`)}${event ? field(ctx.t("Motivo della correzione (necessario se chi legge vede già la data)", "Reason for the correction (needed when readers already see the date)"), `<input name="reason" maxlength="300" autocomplete="off">`) : ""}<p class="muted">${ctx.t("Il promemoria arriva quando il tempo di gioco raggiunge il momento indicato; il DM decide che cosa accade.", "The reminder arrives when game time reaches that moment; the DM decides what happens.")}</p>`;
  ctx.dialog(
    event ? ctx.t("Modifica l’evento", "Edit the event") : ctx.t("Nuovo evento", "New event"),
    body,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (form) => submitEvent(ctx, form, { eventId }),
    },
  );
}
export function submitEvent(ctx, form, { eventId = null } = {}) {
  const time = fd(form, "time");
  const [h, m] = time ? time.split(":").map(Number) : [];
  const lead = fd(form, "lead");
  const input = {
    title: fd(form, "title"),
    description: fd(form, "description"),
    date: { year: num(fd(form, "year")), month: fd(form, "month"), day: num(fd(form, "day")) },
    time: time ? { hour: h, minute: m } : null,
    recurrence: fd(form, "recurrence") || "none",
    visibility: fd(form, "visibility"),
    pinId: fd(form, "pinId"),
    reminder:
      lead === "" ? null : { leadDays: Number(lead), audience: fd(form, "audience") || "viewers" },
    reason: fd(form, "reason"),
  };
  const privateEvent = input.visibility === "private";
  const hidden = input.visibility === "dm";
  const event = change(
    ctx,
    eventId
      ? L("Evento modificato", "Event edited")
      : L("Evento aggiunto al calendario", "Event added to the calendar"),
    (world, nowAbs) =>
      eventId
        ? D.updateEvent(world, ctx.role, eventId, input, nowAbs)
        : D.createEvent(world, ctx.role, input, nowAbs),
    privateEvent ? { local: true, visibility: "private" } : hidden ? { visibility: "private" } : {},
  );
  const w = worldFor(ctx);
  if (C.validDate(w.calendar, event.date)) {
    ui.calDay = C.absDay(w.calendar, event.date);
    ui.calCursor = { year: event.date.year, month: event.date.month };
    ctx.render();
  }
  return true;
}
function openCalendarSettings(ctx) {
  const w = worldFor(ctx);
  const cal = w.calendar;
  const months = cal.months.map((m) => [m.id, m.name]);
  const body = `${field(ctx.t("Nome del calendario", "Calendar name"), `<input name="name" maxlength="80" required value="${ctx.esc(cal.name)}">`)}${rowsEditor(
    ctx,
    {
      name: "month",
      legend: ctx.t("Mesi", "Months"),
      rows: cal.months,
      max: 24,
      addLabel: ctx.t("Aggiungi un mese", "Add a month"),
      fields: [
        { id: "id", type: "hidden" },
        { id: "name", label: ctx.t("Nome", "Name"), attrs: 'maxlength="40" required' },
        {
          id: "days",
          label: ctx.t("Giorni", "Days"),
          type: "number",
          attrs: 'min="1" max="99" required',
          default: 30,
        },
      ],
    },
  )}${rowsEditor(ctx, {
    name: "weekday",
    legend: ctx.t("Giorni della settimana", "Days of the week"),
    rows: cal.weekdays,
    max: 14,
    addLabel: ctx.t("Aggiungi un giorno", "Add a day"),
    fields: [
      { id: "id", type: "hidden" },
      { id: "name", label: ctx.t("Nome", "Name"), attrs: 'maxlength="30" required' },
    ],
  })}${rowsEditor(ctx, {
    name: "moon",
    legend: ctx.t("Lune", "Moons"),
    rows: cal.moons,
    max: 4,
    addLabel: ctx.t("Aggiungi una luna", "Add a moon"),
    fields: [
      { id: "id", type: "hidden" },
      { id: "name", label: ctx.t("Nome", "Name"), attrs: 'maxlength="30" required' },
      {
        id: "cycle",
        label: ctx.t("Ciclo (giorni)", "Cycle (days)"),
        type: "number",
        attrs: 'min="1" max="1000" step="any" required',
        default: 28,
      },
      {
        id: "offset",
        label: ctx.t("Sfasamento", "Offset"),
        type: "number",
        attrs: 'step="1"',
        default: 0,
      },
      { id: "color", label: ctx.t("Colore", "Colour"), type: "color", default: "#dfe6ea" },
    ],
  })}${rowsEditor(ctx, {
    name: "season",
    legend: ctx.t(
      "Stagioni (i mesi nuovi compaiono dopo il salvataggio)",
      "Seasons (new months appear after saving)",
    ),
    rows: cal.seasons,
    max: 8,
    addLabel: ctx.t("Aggiungi una stagione", "Add a season"),
    fields: [
      { id: "id", type: "hidden" },
      { id: "name", label: ctx.t("Nome", "Name"), attrs: 'maxlength="30" required' },
      { id: "startMonth", label: ctx.t("Inizia in", "Starts in"), type: "select", options: months },
    ],
  })}<fieldset class="wm-rows"><legend>${ctx.t("Data all’inizio del tempo di gioco", "Date at the start of game time")}</legend><p class="muted">${ctx.t("È la data in cui il tempo di gioco era zero. Cambiarla sposta la data di oggi senza far passare tempo: serve un motivo.", "The date when game time was zero. Changing it moves today’s date without time passing: a reason is required.")}</p><div class="wm-form-row">${field(ctx.t("Giorno", "Day"), `<input name="epochDay" type="number" min="1" max="99" value="${cal.epoch.day}">`)}${field(ctx.t("Mese", "Month"), `<select name="epochMonth">${cal.months.map((m) => opt(ctx, m.id, m.name, cal.epoch.month)).join("")}</select>`)}${field(ctx.t("Anno", "Year"), `<input name="epochYear" type="number" min="1" value="${cal.epoch.year}">`)}${field(ctx.t("Ora", "Time"), `<input name="epochTime" type="time" value="${C.formatTime(cal.epoch)}">`)}</div>${field(ctx.t("Motivo della correzione", "Reason for the correction"), `<input name="reason" maxlength="300" autocomplete="off">`)}</fieldset>`;
  ctx.dialog(ctx.t("Impostazioni del calendario", "Calendar settings"), body, {
    submitLabel: ctx.t("Salva", "Save"),
    onSubmit: (form) => submitCalendar(ctx, form),
  });
  bindRows();
}
export function submitCalendar(ctx, form) {
  const w = worldFor(ctx);
  const zip = (prefix, keys) => {
    const cols = keys.map((k) => all(form, `${prefix}-${k}`));
    return (cols[0] ?? []).map((_, i) => Object.fromEntries(keys.map((k, j) => [k, cols[j][i]])));
  };
  const [eh, em] = (fd(form, "epochTime") || "00:00").split(":").map(Number);
  const next = {
    name: fd(form, "name"),
    months: zip("month", ["id", "name", "days"]).map((m) => ({
      id: m.id || null,
      name: m.name.trim(),
      days: num(m.days),
    })),
    weekdays: zip("weekday", ["id", "name"]).map((d, i) => ({
      id: d.id || `wd-${i + 1}-${Date.now().toString(36)}`,
      name: d.name.trim(),
    })),
    weekdayOffset: w.calendar.weekdayOffset ?? 0,
    moons: zip("moon", ["id", "name", "cycle", "offset", "color"]).map((m, i) => ({
      id: m.id || `moon-${i + 1}-${Date.now().toString(36)}`,
      name: m.name.trim(),
      cycle: num(m.cycle),
      offset: Math.round(num(m.offset) || 0),
      color: m.color,
    })),
    seasons: zip("season", ["id", "name", "startMonth"]).map((s, i) => ({
      id: s.id || `season-${i + 1}-${Date.now().toString(36)}`,
      name: s.name.trim(),
      startMonth: s.startMonth,
    })),
    epoch: {
      year: num(fd(form, "epochYear")),
      month: fd(form, "epochMonth"),
      day: num(fd(form, "epochDay")),
      hour: eh,
      minute: em,
    },
  };
  change(ctx, L("Calendario del mondo aggiornato", "World calendar updated"), (world, nowAbs) =>
    D.saveCalendar(world, ctx.role, next, { reason: fd(form, "reason"), nowAbs }),
  );
  ui.calCursor = null;
  ui.calDay = null;
  ctx.render();
  return true;
}
function openErasDialog(ctx) {
  const w = worldFor(ctx);
  const body = rowsEditor(ctx, {
    name: "era",
    legend: ctx.t("Ere, dalla più antica", "Eras, oldest first"),
    rows: [...w.calendar.eras].sort((a, b) => a.startYear - b.startYear),
    max: 12,
    addLabel: ctx.t("Aggiungi un’era", "Add an era"),
    fields: [
      { id: "id", type: "hidden" },
      { id: "name", label: ctx.t("Nome", "Name"), attrs: 'maxlength="60" required' },
      { id: "abbr", label: ctx.t("Sigla", "Abbreviation"), attrs: 'maxlength="12"' },
      {
        id: "startYear",
        label: ctx.t("Anno d’inizio", "Start year"),
        type: "number",
        attrs: 'min="1" required',
        default: 1,
      },
    ],
  });
  ctx.dialog(ctx.t("Ere della cronologia", "Timeline eras"), body, {
    submitLabel: ctx.t("Salva", "Save"),
    onSubmit: (form) => submitEras(ctx, form),
  });
  bindRows();
}
export function submitEras(ctx, form) {
  const ids = all(form, "era-id"),
    names = all(form, "era-name"),
    abbrs = all(form, "era-abbr"),
    years = all(form, "era-startYear");
  const eras = names.map((n, i) => ({
    id: ids[i] || null,
    name: n.trim(),
    abbr: abbrs[i].trim(),
    startYear: num(years[i]),
  }));
  change(ctx, L("Ere aggiornate", "Eras updated"), (world) => D.saveEras(world, ctx.role, eras));
  return true;
}

// ------------------------------------------------------------------ actions
function selectedMap(ctx, w) {
  return w.maps.find((m) => m.id === ui.mapId) ?? D.rootMap(w, ctx.role);
}
function viewCenter(map) {
  const v = viewOf(map);
  return { x: Math.round(v.x + v.w / 2), y: Math.round(v.y + viewHeight(map, v) / 2) };
}
function addWaypoint(ctx, map, point) {
  if (!ui.measure || ui.measure.mapId !== map.id || ui.measure.done)
    ui.measure = {
      mapId: map.id,
      points: [],
      done: false,
      terrain: ui.measure?.terrain ?? "",
      road: ui.measure?.road ?? false,
    };
  ui.measure.points.push(point);
}
function pinPoint(pin) {
  return { x: pin.x, y: pin.y, name: pin.name, pinId: pin.id };
}
/** Every bound control of the area runs through here (exported for the Node tests). */
export function runAction(ctx, action, data = {}) {
  syncRole(ctx);
  const w = worldFor(ctx);
  const dm = ctx.role === "dm";
  const pin = data.pin ? w.pins.find((p) => p.id === data.pin) : null;
  const rerender = () => ctx.render();
  return attempt(ctx, () => {
    switch (action) {
      case "view":
        return go(
          ctx,
          data.view === "calendar"
            ? "calendar"
            : data.view === "timeline"
              ? "timeline"
              : ui.mapId
                ? `map.${ui.mapId}`
                : "map",
        );
      case "open-map":
        ui.selected = null;
        return go(ctx, `map.${data.map}`);
      case "tool":
        ui.tool =
          ["select", "pin", "measure"].includes(data.tool) && (data.tool !== "pin" || dm)
            ? data.tool
            : "select";
        if (ui.tool !== "measure") ui.measure = null;
        return rerender();
      case "rapid":
        ui.rapid = !ui.rapid;
        return rerender();
      case "legend":
        ui.legend = !ui.legend;
        ui.focus = ui.legend ? "[data-wm-legend-query]" : ".wm-legend-button";
        return rerender();
      case "group-toggle": {
        const list = (ui.hidden[ui.mapId] ??= []);
        const at = list.indexOf(data.group);
        if (at >= 0) list.splice(at, 1);
        else list.push(data.group);
        ui.focus = `[data-wm-act="group-toggle"][data-group="${data.group}"]`;
        return rerender();
      }
      case "legend-pin":
      case "select-pin": {
        if (!pin || !D.canSeePin(w, pin, ctx.role)) return;
        if (ui.width < 560) ui.legend = false; // the legend covers a phone map
        // While measuring, a place picked in the legend becomes the next waypoint: the
        // keyboard path to measure between named places.
        if (action === "legend-pin" && ui.tool === "measure") {
          addWaypoint(
            ctx,
            w.maps.find((m) => m.id === pin.mapId),
            pinPoint(pin),
          );
          ui.focus = `[data-wm-act="legend-pin"][data-pin="${pin.id}"]`;
          return rerender();
        }
        ui.selected = pin.id;
        // Selecting a place of a hidden group shows that group again.
        ui.hidden[pin.mapId] = (ui.hidden[pin.mapId] ?? []).filter((g) => g !== pin.groupId);
        if (action === "legend-pin") {
          const map = w.maps.find((m) => m.id === pin.mapId);
          if (map) centerOn(map, pin);
          ui.focus = "#wm-pin-title";
        }
        if (ui.tool !== "select") ui.tool = "select";
        return rerender();
      }
      case "deselect":
        ui.selected = null;
        ui.focus = "[data-wm-canvas]";
        return rerender();
      case "center": {
        const map = pin && w.maps.find((m) => m.id === pin.mapId);
        if (map) centerOn(map, pin);
        return rerender();
      }
      case "zoom": {
        const map = selectedMap(ctx, w);
        if (!map) return;
        const c = viewCenter(map);
        if (data.dir === "fit") fitView(map);
        else zoomAt(map, data.dir === "in" ? 0.7 : 1 / 0.7, c.x, c.y);
        return rerender();
      }
      case "show-pin": {
        if (!pin || !D.canSeePin(w, pin, ctx.role)) return;
        ui.selected = pin.id;
        ui.tool = "select";
        ui.routeId = null;
        return go(ctx, `map.${pin.mapId}.${pin.id}`);
      }
      case "pin-new-center": {
        const map = selectedMap(ctx, w);
        const c = viewCenter(map);
        return openPinDialog(ctx, { mapId: map.id, x: c.x, y: c.y });
      }
      case "pin-new-at":
        return openPinDialog(ctx, { mapId: data.map, x: Number(data.x), y: Number(data.y) });
      case "pin-edit":
        return openPinDialog(ctx, { pinId: data.pin });
      case "pin-duplicate": {
        const copy = change(
          ctx,
          L("Spillo duplicato", "Pin duplicated"),
          (world) => D.duplicatePin(world, ctx.role, data.pin),
          pin?.visibility === "dm" ? { visibility: "private" } : {},
        );
        ui.selected = copy.id;
        return ctx.render();
      }
      case "pin-visibility":
        return change(
          ctx,
          data.to === "all"
            ? L("Luogo mostrato ai giocatori", "Place shown to players")
            : L("Luogo nascosto ai giocatori", "Place hidden from players"),
          (world) => D.setPinVisibility(world, ctx.role, data.pin, data.to),
          data.to === "all" ? {} : { visibility: "private" },
        );
      case "pin-delete":
        return confirmDialog(
          ctx,
          ctx.t("Eliminare lo spillo?", "Delete the pin?"),
          ctx.t(
            `«${pin?.name ?? ""}» sparisce dalla mappa. Gli eventi collegati restano, senza luogo. Puoi annullare subito dopo.`,
            `“${pin?.name ?? ""}” leaves the map. Linked events stay, without a place. You can undo right after.`,
          ),
          ctx.t("Elimina", "Delete"),
          () => {
            ui.focus = "[data-wm-canvas]";
            change(
              ctx,
              L("Spillo eliminato", "Pin deleted"),
              (world) => D.deletePin(world, ctx.role, data.pin),
              pin?.visibility === "dm" ? { visibility: "private" } : {},
            );
            ui.selected = null;
            return true;
          },
        );
      case "entry-link":
        return change(
          ctx,
          L("Voce collegata allo spillo", "Entry linked to the pin"),
          (world) => D.linkPinEntry(world, ctx.role, data.pin, data.entry),
          { visibility: "private" },
        );
      case "entry-create":
        return openEntryCreate(ctx, data.pin);
      case "open-entry":
        return ctx.navigate("campaign", {
          tab: "entry",
          id: data.entry,
          returnTo: JSON.stringify({
            page: "campaign",
            tab: ID,
            id: `map.${ui.mapId ?? ""}.${data.pin ?? ""}`,
          }),
        });
      case "open-scene": {
        const scene = ctx.state.scenes?.find((s) => s.id === data.scene);
        if (!scene) return;
        if (dm && ctx.state.activeSceneId !== scene.id)
          return ctx.navigate("preparation", { id: scene.id });
        return ctx.navigate("table");
      }
      case "map-new":
        return openMapDialog(ctx, { fromPinId: data.pin || null });
      case "map-settings":
        return openMapDialog(ctx, { mapId: data.map });
      case "map-root":
        return change(ctx, L("Mappa principale cambiata", "Main map changed"), (world) =>
          D.setRootMap(world, ctx.role, data.map),
        );
      case "map-delete": {
        const map = w.maps.find((m) => m.id === data.map);
        return confirmDialog(
          ctx,
          ctx.t("Eliminare la mappa?", "Delete the map?"),
          ctx.t(
            `«${map?.name ?? ""}» e i suoi spilli spariscono. Gli spilli che la aprivano restano senza mappa; gli eventi restano senza luogo. Puoi annullare subito dopo.`,
            `“${map?.name ?? ""}” and its pins disappear. Pins that opened it stay without a map; events stay without a place. You can undo right after.`,
          ),
          ctx.t("Elimina", "Delete"),
          () => {
            change(
              ctx,
              L("Mappa eliminata", "Map deleted"),
              (world) => D.deleteMap(world, ctx.role, data.map),
              map?.visibility === "dm" ? { visibility: "private" } : {},
            );
            ui.selected = null;
            ui.mapId = null;
            go(ctx, "map");
            return true;
          },
        );
      }
      case "groups":
        return openGroupsDialog(ctx);
      case "pin-history":
        ui.place = data.pin;
        ui.routeId = null;
        return go(ctx, `timeline.${data.pin}`);
      case "measure-finish":
        if (ui.measure) ui.measure.done = true;
        return rerender();
      case "measure-back":
        if (ui.measure) {
          ui.measure.points.pop();
          ui.measure.done = false;
        }
        return rerender();
      case "measure-clear":
        if (ui.measure) ui.measure = { ...ui.measure, points: [], done: false };
        return rerender();
      case "measure-add": {
        const map = selectedMap(ctx, w);
        addWaypoint(ctx, map, pin ? pinPoint(pin) : { x: Number(data.x), y: Number(data.y) });
        return rerender();
      }
      case "terrain":
        ui.measure ??= { mapId: ui.mapId, points: [], done: false, terrain: "", road: false };
        ui.measure.terrain = data.value ?? "";
        return rerender();
      case "road":
        ui.measure ??= { mapId: ui.mapId, points: [], done: false, terrain: "", road: false };
        ui.measure.road = Boolean(data.value);
        return rerender();
      case "undo":
        return ctx.undo();
      // Calendar
      case "cal-prev":
      case "cal-next": {
        const cal = w.calendar;
        const cursor = ui.calCursor ?? {
          year: nowOf(ctx, w).date.year,
          month: nowOf(ctx, w).date.month,
        };
        ui.calCursor = C.shiftMonth(cal, cursor.year, cursor.month, action === "cal-prev" ? -1 : 1);
        ui.calDay = C.absDay(cal, { ...ui.calCursor, day: 1 });
        ui.focus = `[data-wm-act="${action}"]`;
        return rerender();
      }
      case "cal-today": {
        const now = nowOf(ctx, w);
        ui.calCursor = { year: now.date.year, month: now.date.month };
        ui.calDay = now.absDay;
        ui.focus = `[data-wm-day="${now.absDay}"]`;
        return rerender();
      }
      case "cal-day":
        ui.calDay = Number(data.day);
        ui.focus = `[data-wm-day="${ui.calDay}"]`;
        return rerender();
      case "event-show": {
        const cal = w.calendar;
        const day = Number(data.day);
        const date = C.dateFromAbsDay(cal, day);
        ui.calCursor = { year: date.year, month: date.month };
        ui.calDay = day;
        ui.focus = "#wm-day-title";
        if (parseRoute(ctx).view !== "calendar" || ctx.view.page !== "campaign") {
          ui.routeId = `calendar`;
          return go(ctx, "calendar");
        }
        return rerender();
      }
      case "event-new":
        return eventDialog(ctx, { day: data.day ?? null, pinId: data.pin ?? null });
      case "event-edit":
        return eventDialog(ctx, { eventId: data.event });
      case "event-reveal":
        return change(
          ctx,
          L("Evento rivelato ai giocatori", "Event revealed to players"),
          (world, nowAbs) => D.revealEvent(world, ctx.role, data.event, nowAbs),
        );
      case "event-hide":
        return change(
          ctx,
          L("Evento nascosto ai giocatori", "Event hidden from players"),
          (world) => D.hideEvent(world, ctx.role, data.event),
          { visibility: "private" },
        );
      case "event-delete": {
        const event = w.events.find((e) => e.id === data.event);
        return confirmDialog(
          ctx,
          ctx.t("Eliminare l’evento?", "Delete the event?"),
          ctx.t(
            `«${event?.title ?? ""}» sparisce dal calendario e dalla cronologia. Puoi annullare subito dopo.`,
            `“${event?.title ?? ""}” leaves the calendar and the timeline. You can undo right after.`,
          ),
          ctx.t("Elimina", "Delete"),
          () => {
            ui.focus = "#wm-day-title";
            change(
              ctx,
              L("Evento eliminato", "Event deleted"),
              (world) => D.deleteEvent(world, ctx.role, data.event),
              event?.visibility === "private"
                ? { local: true, visibility: "private" }
                : event?.visibility === "dm"
                  ? { visibility: "private" }
                  : {},
            );
            return true;
          },
        );
      }
      case "ack":
        writeAck(ctx, data.key);
        ui.focus = "[data-wm-act='ack'], [data-wm-act='event-new'], [data-wm-act='view']";
        return rerender();
      case "advance":
        return ctx.openGameTime?.();
      case "cal-settings":
        return openCalendarSettings(ctx);
      case "eras":
        return openErasDialog(ctx);
      case "place":
        ui.place = data.value ?? "";
        ui.routeId = null;
        return go(ctx, ui.place ? `timeline.${ui.place}` : "timeline");
      default:
        return undefined;
    }
  });
}

// ------------------------------------------------------------------ binding
function restoreFocus(root) {
  if (!ui.focus) return;
  const target = root.querySelector(ui.focus) ?? globalThis.document?.querySelector(ui.focus);
  ui.focus = null;
  target?.focus?.({ preventScroll: false });
}
function bindSection(root, ctx) {
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-wm-act]");
    if (!el || !root.contains(el) || el.matches("input")) return;
    runAction(ctx, el.dataset.wmAct, { ...el.dataset });
  });
  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.matches("[data-wm-act='group-toggle']"))
      runAction(ctx, "group-toggle", { ...el.dataset });
    else if (el.matches("[data-wm-act='rapid']")) runAction(ctx, "rapid");
    else if (el.matches("[data-wm-map-select]")) runAction(ctx, "open-map", { map: el.value });
    else if (el.matches("[data-wm-entry-link]"))
      runAction(ctx, "entry-link", { pin: el.dataset.pin, entry: el.value });
    else if (el.matches("[data-wm-terrain]")) runAction(ctx, "terrain", { value: el.value });
    else if (el.matches("[data-wm-road]")) runAction(ctx, "road", { value: el.checked });
    else if (el.matches("[data-wm-place]")) runAction(ctx, "place", { value: el.value });
  });
  const query = root.querySelector("[data-wm-legend-query]");
  const filterLegend = () => {
    const q = (query?.value ?? "").trim().toLowerCase();
    ui.legendQuery = query?.value ?? "";
    let shown = 0;
    root.querySelectorAll("[data-wm-legend-item]").forEach((li) => {
      const hit = !q || li.dataset.wmLegendItem.includes(q);
      li.hidden = !hit;
      if (hit) shown++;
    });
    root.querySelectorAll(".wm-legend-group").forEach((g) => {
      g.hidden = Boolean(q) && !g.querySelector("[data-wm-legend-item]:not([hidden])");
    });
    const empty = root.querySelector(".wm-legend-empty");
    if (empty) empty.hidden = shown > 0;
  };
  query?.addEventListener("input", filterLegend);
  query?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      runAction(ctx, "legend");
    }
  });
  if (query?.value) filterLegend();
  bindCalendarKeys(root, ctx);
  bindCanvas(root, ctx);
  restoreFocus(root);
}
function bindCalendarKeys(root, ctx) {
  const month = root.querySelector("[data-wm-month]");
  if (!month) return;
  month.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      return runAction(ctx, e.key === "ArrowLeft" ? "cal-prev" : "cal-next");
    }
    const day = e.target.closest?.("[data-wm-day]");
    if (!day) return;
    const w = worldFor(ctx);
    const week = w.calendar.weekdays.length;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -week, ArrowDown: week }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = Number(day.dataset.wmDay) + step;
    if (next < 0) return;
    const target = month.querySelector(`[data-wm-day="${next}"]`);
    if (target) {
      // Roving focus inside the grid; Enter or Space selects the focused day.
      day.tabIndex = -1;
      target.tabIndex = 0;
      target.focus();
      return;
    }
    const date = C.dateFromAbsDay(w.calendar, next);
    ui.calCursor = { year: date.year, month: date.month };
    ui.calDay = next;
    ui.focus = `[data-wm-day="${next}"]`;
    ctx.render();
  });
}
function bindCanvas(root, ctx) {
  const svg = root.querySelector("[data-wm-canvas]");
  if (!svg) return;
  const w = worldFor(ctx);
  const map = w.maps.find((m) => m.id === svg.dataset.map);
  if (!map) return;
  const stage = root.querySelector("[data-wm-stage]");
  const v = viewOf(map);
  const apply = () => {
    ui.width = svg.clientWidth || ui.width;
    if (svg.clientWidth && svg.clientHeight) {
      const aspect = svg.clientHeight / svg.clientWidth;
      if (Math.abs(aspect - (ui.aspect || 0)) > 0.001) {
        ui.aspect = aspect;
        if (v.auto) Object.assign(v, coverView(map, D.visiblePins(w, ctx.role, map.id)));
        else clampView(map, v);
      }
    }
    svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${viewHeight(map, v)}`);
    const s = markerScale(v);
    svg
      .querySelectorAll(".wm-pin-body,.wm-measure-body")
      .forEach((g) => g.setAttribute("transform", `scale(${s})`));
    const scale = stage?.querySelector("[data-wm-scale]");
    if (scale && svg.clientWidth) {
      const pxPerUnit = svg.clientWidth / v.w;
      const targetKm = (110 / pxPerUnit) * map.kmPerUnit;
      const imperial = unitOf(ctx) === "imperial";
      const factor = imperial ? D.KM_PER_MILE : 1;
      const raw = targetKm / factor;
      const pow = 10 ** Math.floor(Math.log10(raw));
      const nice =
        [1, 2, 5, 10]
          .map((n) => n * pow)
          .reverse()
          .find((n) => n <= raw) ?? pow;
      const km = nice * factor;
      scale.querySelector("i").style.width = `${Math.round((km / map.kmPerUnit) * pxPerUnit)}px`;
      scale.querySelector("span").textContent = distanceText(ctx, km);
    }
  };
  apply();
  const point = (e) => {
    const m = svg.getScreenCTM()?.inverse();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  };
  const pointers = new Map();
  let gesture = null;
  const dmCanDrag = ctx.role === "dm";
  svg.addEventListener("pointerdown", (e) => {
    if (e.button === 2) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    svg.setPointerCapture?.(e.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = { kind: "pinch", dist: Math.hypot(a.x - b.x, a.y - b.y), w: v.w };
      return;
    }
    const pinEl = e.target.closest?.("[data-wm-pin]");
    const pin = pinEl ? w.pins.find((p) => p.id === pinEl.dataset.wmPin) : null;
    gesture = {
      kind: ui.tool === "select" && pin ? "pin" : ui.tool === "select" ? "pan" : "tap",
      pin,
      pinEl,
      start: { x: e.clientX, y: e.clientY },
      view: { ...v },
      moved: false,
    };
  });
  svg.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.kind === "pinch" && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 0) {
        const c = point({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
        zoomAt(map, (gesture.w * (gesture.dist / dist)) / v.w, c.x, c.y);
        apply();
      }
      return;
    }
    const dx = e.clientX - gesture.start.x,
      dy = e.clientY - gesture.start.y;
    if (!gesture.moved && Math.hypot(dx, dy) < 6) return;
    gesture.moved = true;
    const k = v.w / (svg.clientWidth || 900);
    if (gesture.kind === "tap") gesture.kind = "pan";
    if (gesture.kind === "pan") {
      v.auto = false;
      v.x = gesture.view.x - dx * k;
      v.y = gesture.view.y - dy * k;
      clampView(map, v);
      apply();
    } else if (gesture.kind === "pin" && dmCanDrag) {
      gesture.to = {
        x: Math.min(map.width, Math.max(0, gesture.pin.x + dx * k)),
        y: Math.min(map.height, Math.max(0, gesture.pin.y + dy * k)),
      };
      gesture.pinEl.setAttribute("transform", `translate(${gesture.to.x} ${gesture.to.y})`);
      gesture.pinEl.classList.add("is-dragging");
    }
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    const g = gesture;
    if (!g || g.kind === "pinch") {
      if (!pointers.size) gesture = null;
      return;
    }
    gesture = null;
    if (e.type === "pointercancel") return ctx.render();
    // A second tap within 450 ms at the same spot is a double-click / double-tap. It is
    // detected here because each tap re-renders the map (a native dblclick would reach a
    // replaced element).
    const now = Date.now();
    const double =
      !g.moved &&
      lastTap &&
      now - lastTap.time < 450 &&
      Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 10;
    lastTap = g.moved ? null : { time: now, x: e.clientX, y: e.clientY };
    if (g.kind === "pin") {
      if (g.moved && g.to && dmCanDrag) {
        ui.selected = g.pin.id;
        const moved = attempt(ctx, () =>
          change(
            ctx,
            L("Spillo spostato", "Pin moved"),
            (world) => D.movePin(world, ctx.role, g.pin.id, g.to.x, g.to.y),
            g.pin.visibility === "dm" ? { visibility: "private" } : {},
          ),
        );
        // A refused move (offline, ...) draws the pin back where it is saved (B42 review).
        if (moved === false) ctx.render();
      } else if (!g.moved) {
        const child = g.pin.childMapId && w.maps.find((m) => m.id === g.pin.childMapId);
        if (double && child && D.canSeeMap(child, ctx.role)) {
          lastTap = null;
          return runAction(ctx, "open-map", { map: child.id });
        }
        runAction(ctx, "select-pin", { pin: g.pin.id });
      }
      return;
    }
    if (g.kind === "tap" && !g.moved) {
      const p = point(e);
      // The pin under the pointer at pointerdown (pointer capture retargets pointerup).
      const pin = g.pin;
      if (ui.tool === "measure") {
        if (double && (ui.measure?.points.length ?? 0) > 1) {
          lastTap = null;
          return runAction(ctx, "measure-finish");
        }
        return runAction(
          ctx,
          "measure-add",
          pin ? { pin: pin.id } : { x: Math.round(p.x), y: Math.round(p.y) },
        );
      }
      if (ui.tool === "pin") {
        if (pin) return runAction(ctx, "select-pin", { pin: pin.id });
        return runAction(ctx, "pin-new-at", {
          map: map.id,
          x: Math.round(p.x),
          y: Math.round(p.y),
        });
      }
    }
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("dblclick", (e) => e.preventDefault());
  svg.addEventListener("contextmenu", (e) => {
    if (ctx.role !== "dm") return;
    e.preventDefault();
    if (e.target.closest?.("[data-wm-pin]")) return;
    const p = point(e);
    runAction(ctx, "pin-new-at", { map: map.id, x: Math.round(p.x), y: Math.round(p.y) });
  });
  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const p = point(e);
      zoomAt(map, Math.exp(e.deltaY * 0.0015), p.x, p.y);
      apply();
    },
    { passive: false },
  );
  svg.addEventListener("keydown", (e) => {
    const pinEl = e.target.closest?.("[data-wm-pin]");
    if (pinEl && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      const id = pinEl.dataset.wmPin;
      ui.focus = `[data-wm-pin="${id}"]`;
      if (ui.tool === "measure") return runAction(ctx, "measure-add", { pin: id });
      return runAction(ctx, "select-pin", { pin: id });
    }
    const step = v.w * 0.1;
    const moves = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[e.key] && !pinEl) {
      e.preventDefault();
      v.auto = false;
      v.x += moves[e.key][0];
      v.y += moves[e.key][1];
      clampView(map, v);
      return apply();
    }
    if (["+", "=", "-", "_", "0"].includes(e.key)) {
      e.preventDefault();
      const c = viewCenter(map);
      if (e.key === "0") fitView(map);
      else zoomAt(map, e.key === "-" || e.key === "_" ? 1 / 0.7 : 0.7, c.x, c.y);
      Object.assign(v, viewOf(map));
      return apply();
    }
    if (e.key === "Enter" && !pinEl && e.target === svg) {
      e.preventDefault();
      const c = viewCenter(map);
      ui.focus = "[data-wm-canvas]";
      if (ui.tool === "pin") return runAction(ctx, "pin-new-at", { map: map.id, ...c });
      if (ui.tool === "measure") return runAction(ctx, "measure-add", c);
    }
    if (e.key === "Escape") {
      if (ui.tool === "measure" && ui.measure?.points.length && !ui.measure.done) {
        e.preventDefault();
        ui.focus = "[data-wm-canvas]";
        return runAction(ctx, "measure-finish");
      }
      if (ui.selected) {
        e.preventDefault();
        return runAction(ctx, "deselect");
      }
    }
    if (e.key === "Backspace" && ui.tool === "measure" && ui.measure?.points.length) {
      e.preventDefault();
      ui.focus = "[data-wm-canvas]";
      return runAction(ctx, "measure-back");
    }
  });
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => {
      if (!svg.isConnected) return observer.disconnect();
      if (svg.clientWidth && svg.clientWidth !== ui.width) apply();
    });
    observer.observe(svg);
  }
}
function bindTablePanel(root, ctx) {
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-wm-act]");
    if (!el || !root.contains(el)) return;
    const data = { ...el.dataset };
    if (el.dataset.wmAct === "view") return go(ctx, data.view === "calendar" ? "calendar" : "map");
    runAction(ctx, el.dataset.wmAct, data);
  });
}

// ------------------------------------------------------------------ registration
export function register(registry) {
  api = registry;
  registry.registerStateSlice(ID, {
    version: D.VERSION,
    seed: D.seedWorld,
    normalize: D.normalizeWorld,
  });
  registry.registerStyles(new URL("./world.css", import.meta.url));
  registry.add("campaign-section", {
    id: ID,
    group: "world",
    label: L("Mappa e calendario", "Map and calendar"),
    description: L(
      "Mappa del mondo, calendario ed eventi, cronologia",
      "World map, calendar and events, timeline",
    ),
    order: 51,
    when: (ctx) => member(ctx),
    render: renderSection,
    bind: bindSection,
  });
  registry.add("campaign-section", {
    id: `${ID}.entry`,
    label: L("Sulla mappa", "On the map"),
    when: (ctx, entry) =>
      Boolean(entry?.id) &&
      entry.kind === "world" &&
      D.pinsForEntry(worldFor(ctx), entry.id, ctx.role).length > 0,
    render: (ctx, entry) => renderEntryBox(ctx, entry),
    bind: (el, ctx) => bindTablePanel(el, ctx),
  });
  registry.add("table-panel", {
    id: `${ID}-calendar`,
    section: "exploration",
    // "Mondo": the world's date, moons, reminders and upcoming events beside the map, with
    // the world map one click away (F-039/F-040 reachable from the Table).
    label: L("Mondo", "World"),
    icon: "map",
    placement: "sidebar-tab",
    order: 72,
    when: (ctx) => member(ctx),
    render: (ctx) => renderTablePanel(ctx),
    bind: (el, ctx) => bindTablePanel(el, ctx),
  });
  registry.add("notifications", {
    id: `${ID}-reminders`,
    label: L("Promemoria del calendario", "Calendar reminders"),
    collect: (ctx) => {
      const w = worldFor(ctx);
      return pendingReminders(ctx).map((r) => ({
        id: `${ID}-${r.key}`,
        by: null,
        category: "reminders",
        title: L(`Promemoria: ${r.event.title}`, `Reminder: ${r.event.title}`),
        body: L(
          `Nel mondo: ${whenText({ t: (it) => it }, w.calendar, r.event, r.day)}`,
          `In the world: ${whenText({ t: (_, en) => en }, w.calendar, r.event, r.day)}`,
        ),
        target: { page: "campaign", params: { tab: ID, id: `calendar.${r.event.id}` } },
      }));
    },
  });
  registry.add("search", {
    id: `${ID}-search`,
    label: L("Mappa e calendario", "Map and calendar"),
    search: (ctx, query) =>
      member(ctx)
        ? D.searchWorld(worldFor(ctx), ctx.role, query).map((r) => ({
            title: r.title,
            excerpt:
              r.kind === "event"
                ? L("Evento del calendario", "Calendar event")
                : r.kind === "map"
                  ? L("Mappa", "Map")
                  : L("Luogo sulla mappa", "Place on the map"),
            page: "campaign",
            params: {
              tab: ID,
              id:
                r.kind === "event"
                  ? `calendar.${r.id}`
                  : r.kind === "pin"
                    ? `map.${r.mapId}.${r.id}`
                    : `map.${r.mapId}`,
            },
          }))
        : [],
  });
  registry.add("command", {
    id: `${ID}.open-map`,
    label: L("Apri la mappa del mondo", "Open the world map"),
    context: "global",
    when: (ctx) => member(ctx),
    run: (ctx) => go(ctx, "map"),
  });
  registry.add("command", {
    id: `${ID}.open-calendar`,
    label: L("Apri il calendario del mondo", "Open the world calendar"),
    context: "global",
    when: (ctx) => member(ctx),
    run: (ctx) => go(ctx, "calendar"),
  });
  registry.on("role-changed", () => {
    ui = { ...fresh(), views: ui.views, width: ui.width, aspect: ui.aspect };
  });
  registry.on("reset", () => resetWorldView());
}
