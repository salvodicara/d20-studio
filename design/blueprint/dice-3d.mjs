// B56 — Presentation of digital rolls: animated 3D dice.
//
// Entry module of the "dice-3d" area (registry B11). It listens to "roll-accepted" (and the
// Compendium's own "compendium:roll") and presents ONLY results the rules engine already
// accepted: the die lands on the recorded face, nothing is decided or rerolled here.
//
// - Checks and saves with a DC: Baldur's Gate 3 roll screen — big d20 in the centre, DC and
//   modifiers listed, SUCCESS/FAILURE after the die lands (CRP-131, 2024 rules: no
//   automatic success on a natural 20 except where the rule says so, e.g. death saves).
// - Every other roll: dice rolling across the table and a result summary, as D&D Beyond
//   shared 3D dice, Dice So Nice and Owlbear Dice (DDB-152, FVT-155, VTL-113).
// - Hidden rolls are never presented to an identity that cannot see them (FVT-155,
//   FVT-150, VTL-173); physical faces are shown as entered, never animated (FVT-153).
// - Per-user dice colour, saved with each roll, and on/off (DDB-151/152, FVT-155);
//   reduced motion (B22 "Movimento ridotto" when present, its root marker, or the system
//   setting) shows the result at once; click, tap or Esc skips, then closes (Dice So
//   Nice / BG3). Esc acts on the dice only: a dialog underneath stays open (topmost layer).
//   The BG3 check screen is modal until it closes: clicks, taps, Enter, Space and Tab stay
//   on it, so a closing click never runs the control it covers. It is only for a check or
//   save with a DC that this identity starts outside combat actions (B61). Dice on the
//   table never hold a click or a key: rolling or at rest, the press reaches the page and
//   the dice make way (Dice So Nice, D&D Beyond).
// - "Prova i dadi" drawer on the Table: rolls through the app's digital dice service
//   (state.mjs rollDie) or entered physical faces, records the result, lists recent rolls
//   with replay, reasoned correction/withdrawal, and the dice appearance.

import { rollDie } from "./state.mjs";
import * as domain from "./dice-3d-domain.mjs";
import * as geo from "./dice-3d-geometry.mjs";

const { ID } = domain;
const L = (it, en) => ({ it, en });

export const DICE_COLORS = Object.freeze([
  { value: "gold", label: L("Oro", "Gold"), body: "#c9a14f", ink: "#241a08" },
  { value: "ruby", label: L("Rubino", "Ruby"), body: "#a8263e", ink: "#fff1e0" },
  { value: "sapphire", label: L("Zaffiro", "Sapphire"), body: "#2d62ad", ink: "#f3f7ff" },
  { value: "emerald", label: L("Smeraldo", "Emerald"), body: "#23805a", ink: "#effff6" },
  { value: "ivory", label: L("Avorio", "Ivory"), body: "#e6dcc6", ink: "#3a2b17" },
  { value: "obsidian", label: L("Ossidiana", "Obsidian"), body: "#2e2e37", ink: "#e9c46f" },
]);
const colorOf = (value) => DICE_COLORS.find((c) => c.value === value) ?? DICE_COLORS[0];

let area = null;
// W2b1 integration: the dice tray's domain (B34), an optional neighbour loaded without
// making the dice depend on it; its rolls join «Tiri recenti». Null if the area is absent.
let tray = null;
export const neighboursReady = import("./dice-tray-domain.mjs").then(
  (module) => (tray = module),
  () => null,
);

// ---------------------------------------------------------------- settings

const SETTING_ENABLED = `${ID}.enabled`;
const SETTING_COLOR = `${ID}.color`;
// Reduced motion is B22's single product-wide choice (Preferenze › Movimento ridotto);
// the drawer offers the same setting, never a second one.
const B22_MOTION = "preferences-motion.reduced-motion";
const setting = (ctx, key, fallback) => {
  try {
    return area.getSetting(ctx, key);
  } catch {
    return fallback;
  }
};
export const diceEnabled = (ctx) => setting(ctx, SETTING_ENABLED, true) !== false;
/** The roller's own dice colour (per identity), as others see it too (Dice So Nice). */
export const diceColor = (ctx, role = ctx.role) =>
  colorOf(setting({ state: ctx.state, role }, SETTING_COLOR, "gold"));
/** B22's reduced-motion choice for this identity, or null when B22 is not loaded. */
function b22Motion(ctx) {
  try {
    return area.getSetting(ctx, B22_MOTION);
  } catch {
    return null;
  }
}
// B22 is not required: when its preferences area registers a motion field, a reduced
// value wins; so do a root marker it may set and the system preference.
function preferencesReduced(ctx) {
  try {
    for (const section of area?.list("settings", ctx) ?? []) {
      if (!String(section.id).startsWith("preferences")) continue;
      for (const field of section.fields ?? []) {
        if (!/motion/i.test(field.id)) continue;
        const value = area.getSetting(ctx, `${section.id}.${field.id}`);
        if (value === true || /^(reduce|reduced|on|always|minimal|none|off)$/i.test(String(value)))
          return true;
      }
    }
  } catch {
    /* an unreadable area setting never blocks the dice */
  }
  const root = globalThis.document?.documentElement;
  return (
    ["reduce", "reduced"].includes(root?.dataset?.motion) ||
    root?.dataset?.reducedMotion === "true" ||
    root?.classList?.contains("reduce-motion") === true
  );
}
export function reducedMotion(ctx) {
  if (preferencesReduced(ctx)) return true;
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

// ---------------------------------------------------------------- overlay (global layer)

const overlay = {
  layer: null,
  canvas: null,
  queue: [],
  current: null,
  raf: 0,
  timers: new Set(),
  pending: [],
  pressed: null,
  flushTimer: 0,
  listening: false,
  lastPresented: null,
  history: [],
  returnFocus: null,
};
const later = (fn, ms) => {
  const id = setTimeout(() => {
    overlay.timers.delete(id);
    fn();
  }, ms);
  overlay.timers.add(id);
  return id;
};
const now = () => globalThis.performance?.now?.() ?? Date.now();

/** Stops and hides everything: role change, reset, language change. */
export function clearDice() {
  overlay.queue = [];
  overlay.pending = [];
  if (overlay.flushTimer) clearTimeout(overlay.flushTimer);
  overlay.flushTimer = 0;
  finishCurrent(true);
  overlay.pressed = null;
  // Another identity never inherits the previous one's result, not even in hidden DOM.
  const live = overlay.layer?.querySelector("[data-dice3d-live]");
  if (live) live.textContent = "";
  overlay.returnFocus = null;
}
function finishCurrent(silent = false) {
  if (overlay.raf) globalThis.cancelAnimationFrame?.(overlay.raf);
  overlay.raf = 0;
  for (const id of overlay.timers) clearTimeout(id);
  overlay.timers.clear();
  overlay.current = null;
  const layer = overlay.layer;
  if (layer) {
    layer.dataset.phase = "idle";
    layer.hidden = true;
    try {
      if (layer.matches?.(":popover-open")) layer.hidePopover();
    } catch {
      /* popover not supported: `hidden` already hides the layer */
    }
    const g = overlay.canvas?.getContext?.("2d");
    g?.clearRect(0, 0, overlay.canvas.width, overlay.canvas.height);
    const content = layer.querySelector("[data-dice3d-content]");
    if (content) content.innerHTML = "";
  }
  restoreFocus();
  if (!silent) next();
}
/** Focus returns where it was before the dice, if the dice left it nowhere. */
function restoreFocus() {
  const target = overlay.returnFocus;
  overlay.returnFocus = null;
  const doc = globalThis.document;
  if (!target || !doc) return;
  const active = doc.activeElement;
  if ((!active || active === doc.body) && target.isConnected)
    target.focus?.({ preventScroll: true });
}
function ensureLayer() {
  const doc = globalThis.document;
  if (!doc?.body) return null;
  if (overlay.layer?.isConnected) return overlay.layer;
  const layer = doc.createElement("div");
  layer.className = "dice3d-layer";
  layer.dataset.dice3dLayer = "";
  layer.dataset.phase = "idle";
  layer.hidden = true;
  // The top layer keeps the dice above an open modal dialog (native <dialog>).
  if (typeof layer.showPopover === "function") layer.setAttribute("popover", "manual");
  layer.innerHTML = `<canvas class="dice3d-canvas" aria-hidden="true"></canvas><div class="dice3d-content" data-dice3d-content></div><p class="dice3d-live" role="status" aria-live="polite" data-dice3d-live></p>`;
  doc.body.append(layer);
  overlay.layer = layer;
  overlay.canvas = layer.querySelector("canvas");
  if (!overlay.listening) {
    overlay.listening = true;
    // Capture phase: skipping works whatever has focus, also over an open dialog.
    doc.addEventListener("keydown", onKey, true);
    doc.addEventListener("pointerdown", onPointer, true);
    doc.addEventListener("click", onClick, true);
    globalThis.addEventListener?.("resize", () => overlay.current && relayout());
  }
  return layer;
}
// Keys the BG3 check screen keeps while it is on screen: the control it covers (often the
// focused "Lancia i dadi" or the dialog's "Registra tiro") never receives them.
const CHECK_KEYS = new Set(["Enter", " ", "Spacebar", "Tab"]);
/**
 * Whether a press or key under the dice belongs to them. Over a modal dialog the browser
 * treats the dice layer as inert and hands the event to the dialog behind it, so anything
 * outside a dialog opened after the dice appeared counts as aimed at the dice.
 */
function forDice(target, scene = overlay.current) {
  if (overlay.layer?.contains(target)) return true;
  const dialog = target?.closest?.("dialog[open]");
  return !dialog || (scene?.dialogs ?? []).includes(dialog);
}
function swallow(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}
function onKey(event) {
  const scene = overlay.current;
  if (!scene) return;
  const modal = scene.layout === "check" && CHECK_KEYS.has(event.key) && forDice(event.target);
  if (event.key !== "Escape" && !modal) return;
  // The dice are the topmost layer: while they are on screen, rolling or landed, Esc
  // acts on them only (first skips, then closes). A dialog underneath, a Table preview or
  // a menu stays as it is; the next Esc reaches them. On the check screen Enter and Space
  // do the same; Tab has nowhere to go (no controls on it, the page is covered).
  swallow(event);
  if (event.key !== "Tab") skip();
}
function onPointer(event) {
  overlay.pressed = null;
  const scene = overlay.current;
  if (!scene) return;
  const mine = forDice(event.target, scene);
  if (mine && scene.layout === "check") {
    // The press and the click after it end on the dice: the page or dialog underneath
    // never receives them (no click- or tap-through). A rolling scene skips at once; the
    // landed check screen closes on that click, since hiding it on the press would hand
    // the click to the control underneath.
    swallow(event);
    overlay.pressed = { scene, at: now() };
    if (scene.phase === "rolling") skip();
    else scene.closing = true;
  } else if (scene.phase === "rolling") skip();
  // Dice on the table let the press through (rolling or at rest) and make way (Dice So
  // Nice): a rolling scene lands on its result, a landed one closes.
  else finishCurrent();
}
function onClick(event) {
  // A script's own element.click() is not the player's hand: it always goes through.
  if (event.isTrusted === false) return;
  const scene = overlay.current;
  const pressed = overlay.pressed;
  overlay.pressed = null;
  const followsPress =
    pressed !== null && now() - pressed.at < 1500 && forDice(event.target, pressed.scene);
  const modal = scene?.layout === "check" && forDice(event.target, scene);
  if (!followsPress && !modal) return;
  swallow(event);
  if (scene && scene === pressed?.scene && scene.closing) finishCurrent();
}
/** Skip: a rolling scene lands at once on the recorded faces; a landed one closes. */
export function skip() {
  const scene = overlay.current;
  if (!scene) return;
  if (scene.phase === "rolling") {
    scene.skipped = true;
    land(scene);
  } else finishCurrent();
}

// ---------------------------------------------------------------- scenes

const esc = (ctx, value) => ctx.esc(value);
const pick = (value, lang) =>
  value && typeof value === "object" ? (value[lang] ?? value.it ?? "") : String(value ?? "");
const roleName = (ctx, role) => (role === "dm" ? "DM" : ctx.t("Giocatore", "Player"));
function whoText(ctx, view) {
  return view.actorName ?? roleName(ctx, view.controller);
}
function facesText(view) {
  return view.dice.map((d) => (d.kept === false ? `(${d.value})` : String(d.value))).join(", ");
}
/** "[14] + 2 = 16" style breakdown for the summary and the recent list. */
function breakdown(view) {
  const faces = `[${facesText(view)}]`;
  const mod = view.modifier ? ` ${view.modifier < 0 ? "−" : "+"} ${Math.abs(view.modifier)}` : "";
  return view.total !== null ? `${faces}${mod} = ${view.total}` : faces;
}
const practiceText = (ctx, view) =>
  view.source === ID ? ctx.t("Tiro di prova", "Practice roll") : "";
function audienceText(ctx, view) {
  if (view.visibility !== "private") return "";
  return view.controller === "dm" ? ctx.t("Solo DM", "DM only") : ctx.t("Solo tu", "Only you");
}
function modeText(ctx, view) {
  return view.mode === "physical"
    ? ctx.t("dado fisico", "physical die")
    : view.mode === "digital"
      ? ctx.t("dado digitale", "digital die")
      : ctx.t("dado non indicato", "die not stated");
}
function statusText(ctx, view) {
  if (view.status === "reused") return ctx.t("Facce riusate", "Reused faces");
  if (view.status === "corrected" || view.correctionReason)
    return ctx.t("Correzione", "Correction");
  return "";
}
const coarse = () => globalThis.matchMedia?.("(pointer: coarse)")?.matches === true;
/** What a click, tap or key does now: skip while the dice roll, close once they rest. */
function hintText(ctx, scene, landed = !scene.animate) {
  const check = scene.layout === "check";
  const action = coarse()
    ? landed
      ? ctx.t("Tocca per chiudere", "Tap to close")
      : ctx.t("Tocca per saltare", "Tap to skip")
    : check
      ? landed
        ? ctx.t("Clic, Invio o Esc per chiudere", "Click, Enter or Esc to close")
        : ctx.t("Clic, Invio o Esc per saltare", "Click, Enter or Esc to skip")
      : landed
        ? ctx.t("Clic o Esc per chiudere", "Click or Esc to close")
        : ctx.t("Clic o Esc per saltare", "Click or Esc to skip");
  return scene.replay
    ? `${ctx.t("Rivedi: stesso risultato registrato", "Replay: same recorded result")} · ${action}`
    : action;
}

function checkHTML(ctx, scene) {
  const view = scene.views[0];
  const lang = ctx.lang;
  const tiles = !view.drawn
    ? `<div class="dice3d-tiles">${view.dice.map((d) => `<span class="dice3d-tile${d.kept === false ? " is-dropped" : ""}"><small>d${d.sides}</small><strong>${d.value}</strong></span>`).join("")}<p class="dice3d-tile-note">${view.mode === "physical" ? ctx.t("Dado fisico: faccia inserita", "Physical die: entered face") : ctx.t("Faccia registrata", "Recorded face")}</p></div>`
    : "";
  const total =
    view.total !== null
      ? `${view.natural ?? view.dice.find((d) => d.kept !== false)?.value ?? ""}${view.modifier ? ` ${view.modifier < 0 ? "−" : "+"} ${Math.abs(view.modifier)}` : ""} = <strong>${view.total}</strong>`
      : "";
  return `<section class="dice3d-check" aria-label="${esc(ctx, pick(view.title, lang))}">
<p class="dice3d-who">${esc(ctx, whoText(ctx, view))}${practiceText(ctx, view) ? ` · ${esc(ctx, practiceText(ctx, view))}` : ""}${audienceText(ctx, view) ? ` · <span class="dice3d-audience">${esc(ctx, audienceText(ctx, view))}</span>` : ""}</p>
<h2 class="dice3d-title">${esc(ctx, pick(view.title, lang))}</h2>
<div class="dice3d-dc"><span>${ctx.t("Classe Difficoltà", "Difficulty Class")}</span><strong>${view.dcHidden ? ctx.t("nascosta", "hidden") : view.dc}</strong></div>
<div class="dice3d-stage" data-dice3d-stage>${tiles}</div>
<ul class="dice3d-mods">${view.lines.map((line) => `<li>${esc(ctx, pick(line, lang))}</li>`).join("")}</ul>
<div class="dice3d-result"><p class="dice3d-total">${total}</p>${view.verdict ? `<p class="dice3d-verdict is-${view.tone}" data-dice3d-verdict="${view.tone}">${esc(ctx, pick(view.verdict, lang))}</p>` : ""}${statusText(ctx, view) ? `<p class="dice3d-status">${esc(ctx, statusText(ctx, view))}</p>` : ""}</div>
<p class="dice3d-hint" data-dice3d-hint>${esc(ctx, hintText(ctx, scene))}</p>
</section>`;
}
function tumbleHTML(ctx, scene) {
  const lang = ctx.lang;
  const rows = scene.views
    .map((view) => {
      const chips = view.drawn
        ? ""
        : `<span class="dice3d-chips">${view.dice.map((d) => `<span class="dice3d-chip${d.kept === false ? " is-dropped" : ""}">${d.sides ? `d${d.sides} · ` : ""}${d.value}</span>`).join("")}</span>`;
      const extra = [audienceText(ctx, view), statusText(ctx, view)].filter(Boolean);
      return `<li class="dice3d-line" data-dice3d-line="${esc(ctx, view.id)}"><span class="dice3d-line-title"><strong>${esc(ctx, whoText(ctx, view))}</strong> · ${esc(ctx, pick(view.title, lang))}</span><span class="dice3d-line-math">${chips}<span>${esc(ctx, breakdown(view))}${view.dc !== null ? ` · ${ctx.t("CD", "DC")} ${view.dc}` : view.dcHidden ? ` · ${ctx.t("CD nascosta", "DC hidden")}` : ""}</span>${view.verdict ? ` <em class="dice3d-outcome is-${view.tone}" data-dice3d-verdict="${view.tone}">${esc(ctx, pick(view.verdict, lang))}</em>` : ""}${view.outcome ? ` <em class="dice3d-outcome">${esc(ctx, pick(view.outcome, lang))}</em>` : ""}</span><span class="dice3d-line-meta">${esc(ctx, modeText(ctx, view))}${extra.map((x) => ` · ${esc(ctx, x)}`).join("")}${view.lines.length ? ` · ${view.lines.map((l) => esc(ctx, pick(l, lang))).join(" · ")}` : ""}</span></li>`;
    })
    .join("");
  const more = scene.hiddenDice
    ? `<p class="dice3d-more">${ctx.t(`Altri ${scene.hiddenDice} dadi nel riepilogo`, `${scene.hiddenDice} more dice in the summary`)}</p>`
    : "";
  return `<div class="dice3d-tray" data-dice3d-stage></div><section class="dice3d-summary" aria-label="${ctx.t("Risultato del tiro", "Roll result")}"><ul>${rows}</ul>${more}<p class="dice3d-hint" data-dice3d-hint>${esc(ctx, hintText(ctx, scene))}</p></section>`;
}
function liveText(ctx, scene) {
  return scene.views
    .map(
      (view) =>
        `${whoText(ctx, view)}, ${pick(view.title, ctx.lang)}: ${breakdown(view)}${view.dc !== null ? `, ${ctx.t("CD", "DC")} ${view.dc}` : view.dcHidden ? `, ${ctx.t("CD nascosta", "DC hidden")}` : ""}${view.verdict ? `, ${pick(view.verdict, ctx.lang)}` : ""}${view.outcome ? `, ${pick(view.outcome, ctx.lang)}` : ""}`,
    )
    .join(". ");
}

const MAX_3D = 20;
/**
 * Builds a scene for one presentation (pure apart from the settings it reads). Digital
 * faces become 3D dice: rolling when accepted now and motion is allowed, otherwise at
 * rest on the recorded face. Physical faces stay flat tiles, exactly as entered.
 */
export function buildScene(ctx, views, { replay = false } = {}) {
  const reduced = reducedMotion(ctx);
  const layout = views.length === 1 && views[0].layout === "check" ? "check" : "tumble";
  const dice = [];
  let hiddenDice = 0;
  for (const view of views) {
    view.drawn = false;
    if (view.mode !== "digital") continue;
    // The colour saved with the roll; rolls from other areas use the roller's setting.
    const owner = ["dm", "player"].includes(view.controller) ? view.controller : ctx.role;
    const color = view.color ? colorOf(view.color) : diceColor(ctx, owner);
    view.dice.forEach((d, index) => {
      for (const body of geo.physicalDice(d.sides, d.value)) {
        if (dice.length >= MAX_3D) {
          hiddenDice++;
          continue;
        }
        view.drawn = true;
        dice.push({
          ...body,
          view,
          index,
          kept: d.kept !== false,
          color,
          animate: view.animate && !reduced,
        });
      }
    });
  }
  return {
    layout,
    views,
    dice,
    hiddenDice,
    reduced,
    replay,
    animate: dice.some((die) => die.animate),
    key: views.map((v) => v.id).join("|"),
  };
}

function present(ctx, scene) {
  if (!scene.views.length) return;
  // Diagnostics for tests and the browser journey: what was shown, to whom, how.
  overlay.history.push({
    key: scene.key,
    role: ctx.role,
    layout: scene.layout,
    animate: scene.animate,
    replay: scene.replay,
    views: scene.views.map((v) => ({
      id: v.id,
      faces: v.dice.map((d) => d.value),
      total: v.total,
      dc: v.dc,
      success: v.success,
      mode: v.mode,
    })),
    dice: scene.dice.map((d) => [d.kind, d.face, d.labels]),
  });
  if (overlay.history.length > 20) overlay.history.shift();
  overlay.queue.push({ ctx, scene });
  // A long burst never piles up: the oldest waiting scenes give way, and a result already
  // on screen makes room sooner for the next roll.
  if (overlay.queue.length > 6) overlay.queue.splice(0, overlay.queue.length - 6);
  const current = overlay.current;
  if (!current) next();
  else if (current.phase === "landed")
    later(() => overlay.current === current && finishCurrent(), 700);
}
function next() {
  const item = overlay.queue.shift();
  if (!item) return;
  start(item.ctx, item.scene);
}
function sizeCanvas() {
  const canvas = overlay.canvas;
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const w = globalThis.innerWidth,
    h = globalThis.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  return { dpr, w, h };
}
function start(ctx, scene) {
  const layer = ensureLayer();
  // Without a document (Node tests) nothing is drawn; the queue still drains.
  if (!layer) return next();
  const active = globalThis.document.activeElement;
  if (!overlay.returnFocus && active && active !== globalThis.document.body)
    overlay.returnFocus = active;
  overlay.current = scene;
  overlay.lastPresented = { key: scene.key, layout: scene.layout, animate: scene.animate };
  scene.ctx = ctx;
  scene.phase = "rolling";
  layer.dataset.layout = scene.layout;
  // Dialogs open now sit under the dice; one opened later is above them (forDice).
  scene.dialogs = [...(globalThis.document.querySelectorAll?.("dialog[open]") ?? [])];
  layer.dataset.reduced = scene.reduced ? "true" : "false";
  layer.dataset.animate = scene.animate ? "true" : "false";
  layer.querySelector("[data-dice3d-content]").innerHTML =
    scene.layout === "check" ? checkHTML(ctx, scene) : tumbleHTML(ctx, scene);
  layer.querySelector("[data-dice3d-live]").textContent = "";
  layer.hidden = false;
  try {
    // Re-entering the top layer keeps the dice above a dialog opened in the meantime.
    if (layer.matches?.(":popover-open")) layer.hidePopover();
    layer.showPopover?.();
  } catch {
    /* no popover support: the layer stays a fixed overlay */
  }
  layer.dataset.phase = "rolling";
  relayout();
  if (!scene.animate) {
    land(scene);
    return;
  }
  scene.startedAt = now();
  const tick = () => {
    if (overlay.current !== scene || scene.phase !== "rolling") return;
    const done = drawScene(scene, now() - scene.startedAt);
    if (done) land(scene);
    else overlay.raf = globalThis.requestAnimationFrame(tick);
  };
  overlay.raf = globalThis.requestAnimationFrame(tick);
}
/** Lays the dice out from the stage the DOM reserved for them. */
function relayout() {
  const scene = overlay.current;
  if (!scene) return;
  const { dpr, w, h } = sizeCanvas();
  scene.dpr = dpr;
  const stage = overlay.layer.querySelector("[data-dice3d-stage]")?.getBoundingClientRect?.();
  const box = stage && stage.width > 0 ? stage : { left: 0, top: 0, width: w, height: h * 0.6 };
  const rand = geo.seeded(scene.key);
  const count = scene.dice.length;
  if (!count) return;
  if (scene.layout === "check") {
    const size = Math.max(34, Math.min(box.height * 0.34, box.width * 0.26, 118));
    const cx = box.left + box.width / 2,
      cy = box.top + box.height / 2;
    scene.dice.forEach((die, i) => {
      const offset = count > 1 ? (i - (count - 1) / 2) * size * 2.5 : 0;
      const s = count > 1 ? size * 0.82 : size;
      die.size = s;
      die.to = [cx + offset, cy];
      die.from = [cx + offset + (rand() - 0.5) * s * 2.4, cy - s * 0.5];
      die.final = geo.restingMatrix(geo.getMesh(die.kind), die.face, 0);
      die.delay = i * 90;
      die.duration = 1500;
      die.path = geo.tumblePath({
        from: die.from,
        to: die.to,
        final: die.final,
        turns: 2.5 + rand(),
        spin: (rand() - 0.5) * 2.4,
        bounces: 3,
        lift: s * 2.4,
      });
    });
  } else {
    const base = Math.max(20, Math.min(46, Math.min(w, h) * 0.055)) * (count > 8 ? 0.82 : 1);
    const gap = base * 2.9;
    const cols = Math.max(1, Math.min(count, Math.floor(box.width / gap) || 1, 6));
    const rows = Math.ceil(count / cols);
    const cx = box.left + box.width / 2,
      cy = box.top + box.height / 2;
    scene.dice.forEach((die, i) => {
      const row = Math.floor(i / cols),
        col = i % cols;
      const inRow = Math.min(cols, count - row * cols);
      const x = cx + (col - (inRow - 1) / 2) * gap + (rand() - 0.5) * base * 0.6;
      const y = cy + (row - (rows - 1) / 2) * gap + (rand() - 0.5) * base * 0.5;
      die.size = base * (die.kind === "d6" ? 0.95 : 1);
      die.to = [x, y];
      die.from = [x + (rand() - 0.5) * w * 0.35, h + base * 2.5];
      die.final = geo.restingMatrix(geo.getMesh(die.kind), die.face, (rand() - 0.5) * 0.9);
      die.delay = i * 70;
      die.duration = 1150 + rand() * 300;
      die.path = geo.tumblePath({
        from: die.from,
        to: die.to,
        final: die.final,
        turns: 2 + rand() * 2,
        spin: (rand() - 0.5) * 3,
        bounces: 3,
        lift: base * (2 + rand()),
      });
    });
  }
  if (scene.phase !== "rolling" || !scene.animate) drawScene(scene, Infinity);
}
/** Draws one frame; returns true once every die rests on its recorded face. */
function drawScene(scene, elapsed) {
  const canvas = overlay.canvas;
  const g = canvas?.getContext?.("2d");
  if (!g) return true;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  let done = true;
  const frames = scene.dice
    .filter((die) => die.path)
    .map((die) => {
      const t =
        elapsed === Infinity || !die.animate
          ? 1
          : Math.max(0, (elapsed - die.delay) / die.duration);
      if (t < 1) done = false;
      return { die, state: die.path(t) };
    })
    .sort((a, b) => a.state.height - b.state.height);
  for (const { die, state } of frames) {
    const options = {
      matrix: state.matrix,
      x: state.x,
      y: state.y,
      size: die.size,
      height: state.height,
      dpr: scene.dpr,
    };
    geo.drawShadow(g, options);
    geo.drawDie(g, geo.getMesh(die.kind), {
      ...options,
      colors: { body: die.color.body, ink: die.color.ink },
      labels: die.labels,
      dim: scene.phase === "landed" && !die.kept,
    });
    // A d4 at rest also shows its recorded value in a badge: vertex numerals are small.
    if (die.kind === "d4" && state.done)
      geo.drawValueBadge(g, {
        x: state.x,
        y: state.y,
        size: die.size,
        dpr: scene.dpr,
        text: geo.faceLabel(die.face, die.labels),
        colors: { body: die.color.body, ink: die.color.ink },
      });
  }
  return done;
}
function land(scene) {
  if (overlay.current !== scene || scene.phase === "landed") return;
  if (overlay.raf) globalThis.cancelAnimationFrame?.(overlay.raf);
  overlay.raf = 0;
  scene.phase = "landed";
  const layer = overlay.layer;
  layer.dataset.phase = "landed";
  drawScene(scene, Infinity);
  const hint = layer.querySelector("[data-dice3d-hint]");
  if (hint) hint.textContent = hintText(scene.ctx, scene, true);
  layer.querySelector("[data-dice3d-live]").textContent = liveText(scene.ctx, scene);
  const hold = (scene.layout === "check" ? 3000 : 2600) + (scene.reduced ? 900 : 0);
  later(() => overlay.current === scene && finishCurrent(), scene.skipped ? 1400 : hold);
}

// ---------------------------------------------------------------- event intake

function queueRoll(ctx, roll, { force = false } = {}) {
  overlay.pending.push({ roll, role: ctx.role });
  if (overlay.flushTimer) return;
  // After the commit: the page renders and any follow-up dialog opens first.
  overlay.flushTimer = setTimeout(() => flush(ctx, force), 0);
}
function flush(ctx, force) {
  overlay.flushTimer = 0;
  const batch = overlay.pending.splice(0);
  if (!force && !diceEnabled(ctx)) return;
  const views = batch
    .filter((item) => item.role === ctx.role)
    .map((item) => domain.describeRoll(ctx.state, item.roll, ctx.role))
    .filter(Boolean);
  if (!views.length) return;
  const checks = views.filter((v) => v.layout === "check");
  const rest = views.filter((v) => v.layout !== "check");
  for (const view of checks) present(ctx, buildScene(ctx, [view]));
  if (rest.length) present(ctx, buildScene(ctx, rest));
}
/** Test/diagnostic view of what the overlay is doing (no DOM needed). */
export function diceStatus() {
  return {
    current: overlay.current
      ? {
          layout: overlay.current.layout,
          phase: overlay.current.phase,
          animate: overlay.current.animate,
          views: overlay.current.views.map((v) => v.id),
          faces: overlay.current.dice.map((d) => [d.kind, d.face]),
        }
      : null,
    queued: overlay.queue.length,
    last: overlay.lastPresented,
    history: overlay.history.map((entry) => JSON.parse(JSON.stringify(entry))),
  };
}

// ---------------------------------------------------------------- drawer: Prova i dadi

const ui = {
  role: null,
  pool: [20],
  modifier: "",
  dc: "",
  label: "",
  ability: null,
  actorId: "",
  mode: "digital",
  visibility: "shared",
  faces: [],
  error: "",
  focus: null,
};
export function resetDiceUI() {
  Object.assign(ui, {
    role: null,
    pool: [20],
    modifier: "",
    dc: "",
    label: "",
    ability: null,
    actorId: "",
    mode: "digital",
    visibility: "shared",
    faces: [],
    error: "",
    focus: null,
  });
}
const attr = (ctx, value) => ctx.esc(value);
function syncRole(ctx, tableView) {
  if (ui.role === ctx.role) return;
  resetDiceUI();
  ui.role = ctx.role;
  ui.actorId = domain.defaultDemoActor(ctx.state, ctx.role, tableView?.selectedActorId);
}
function timeText(ctx, iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
function presetSaveLabel(ctx) {
  const actor = ctx.state.actors[ui.actorId];
  const who = actor ? ` · ${actor.name}` : "";
  return `${ctx.t("Tiro salvezza su Costituzione", "Constitution saving throw")}${who} · ${ctx.t("CD", "DC")} 12`;
}
export function renderDrawer(ctx, tableView) {
  syncRole(ctx, tableView);
  const t = ctx.t;
  const actors = domain.demoActors(ctx.state, ctx.role);
  const dice = domain.groupPool(ui.pool);
  const sides = ui.pool.length ? domain.expandDice(dice, []).map((d) => d.sides) : [];
  const mod = Number(ui.modifier) || 0;
  const formula = ui.pool.length ? domain.formulaText(dice, mod) : t("nessun dado", "no dice");
  const faces =
    ui.mode === "physical" && sides.length
      ? `<div class="dice3d-faces" data-dice3d-faces>${sides
          .map(
            (s, i) =>
              `<label class="field dice3d-face">${t("Dado", "Die")} ${i + 1} · d${s}<input type="number" name="face-${i}" min="1" max="${s}" inputmode="numeric" value="${attr(ctx, ui.faces[i] ?? "")}" data-dice3d-face="${i}" required></label>`,
          )
          .join("")}</div>`
      : "";
  // SV-37: a disabled choice is linked to the sentence that says why (`why`: its id).
  const radio = (name, value, current, label, disabled = false, why = null) =>
    `<label class="dice3d-radio"><input type="radio" name="${name}" value="${value}" ${current === value ? "checked" : ""}${disabled ? ` disabled${why ? ` aria-describedby="${why}"` : ""}` : ""} data-dice3d-${name}> <span>${label}</span></label>`;
  const full = ui.pool.length >= domain.MAX_POOL;
  const recent = domain.recentRolls(ctx.state, ctx.role, 8, { tray });
  const color = diceColor(ctx);
  const forced = domain.forcedPrivateReason(ctx.state, ui.actorId);
  const visibility = forced ? "private" : ui.visibility;
  const motion = b22Motion(ctx);
  return `<div class="dice3d-drawer">
<form class="dice3d-try" data-dice3d-form novalidate aria-labelledby="dice3d-try-title">
<h3 id="dice3d-try-title">${t("Scegli i dadi", "Choose the dice")}</h3>
<p class="muted dice3d-note">${t("Il risultato viene dai dadi digitali dell’app o dalle facce che inserisci, e resta nel registro. L’animazione mostra solo il risultato già registrato.", "The result comes from the app’s digital dice or from the faces you enter, and stays in the log. The animation only shows the recorded result.")}</p>
<div class="dice3d-presets">${actors.length ? `<button type="button" class="button" data-dice3d-preset="save">${ctx.esc(presetSaveLabel(ctx))}</button>` : ""}<button type="button" class="button" data-dice3d-preset="all">${t("Tutti i dadi: d4–d100", "All the dice: d4–d100")}</button></div>
<fieldset class="dice3d-picker"><legend>${t("Aggiungi un dado", "Add a die")}</legend>${domain.DEMO_SIDES.map((s) => `<button type="button" class="dice3d-die-button" data-dice3d-add="${s}" aria-label="${t("Aggiungi un", "Add a")} d${s}"${full ? ' disabled aria-describedby="dice3d-full"' : ""}>d${s}</button>`).join("")}${full ? `<p class="muted dice3d-note" id="dice3d-full">${t(`Al massimo ${domain.MAX_POOL} dadi per lancio: togline uno qui sotto per aggiungerne un altro.`, `At most ${domain.MAX_POOL} dice per roll: remove one below to add another.`)}</p>` : ""}</fieldset>
<div class="dice3d-pool"><p class="dice3d-formula"><span>${t("Da tirare", "To roll")}:</span> <strong data-dice3d-formula>${ctx.esc(formula)}</strong></p><ul class="dice3d-pool-list" aria-label="${t("Dadi scelti", "Chosen dice")}">${ui.pool.map((s, i) => `<li><button type="button" class="dice3d-pool-chip" data-dice3d-remove="${i}" aria-label="${t("Togli il", "Remove the")} d${s}">d${s}<span aria-hidden="true">×</span></button></li>`).join("")}</ul>${ui.pool.length ? `<button type="button" class="button quiet" data-dice3d-clear>${t("Svuota", "Clear")}</button>` : ""}</div>
<div class="form-grid dice3d-grid">
<label class="field">${t("Chi tira", "Who rolls")}<select name="actorId" data-dice3d-actor><option value="">${t("Nessuna creatura (solo i dadi)", "No creature (dice only)")}</option>${actors.map((a) => `<option value="${attr(ctx, a.id)}" ${a.id === ui.actorId ? "selected" : ""}>${ctx.esc(a.name)}</option>`).join("")}</select></label>
<label class="field">${t("Modificatore", "Modifier")}<input type="number" name="modifier" min="-30" max="30" step="1" inputmode="numeric" value="${attr(ctx, ui.modifier)}" data-dice3d-field="modifier"></label>
<label class="field">${t("CD (facoltativa, con un d20)", "DC (optional, with one d20)")}<input type="number" name="dc" min="1" max="30" step="1" inputmode="numeric" value="${attr(ctx, ui.dc)}" data-dice3d-field="dc"></label>
<label class="field">${t("Descrizione (facoltativa)", "Description (optional)")}<input name="label" maxlength="80" value="${attr(ctx, ui.label)}" placeholder="${t("Prova di Atletica", "Athletics check")}" data-dice3d-field="label"></label>
</div>
<fieldset class="dice3d-choice"><legend>${t("Dadi", "Dice")}</legend>${radio("mode", "digital", ui.mode, t("Digitali", "Digital"))}${radio("mode", "physical", ui.mode, t("Fisici: inserisco le facce", "Physical: I enter the faces"))}</fieldset>
${faces}
<fieldset class="dice3d-choice"${forced ? ' aria-describedby="dice3d-forced"' : ""}><legend>${t("Chi vede il risultato", "Who sees the result")}</legend>${radio("visibility", "shared", visibility, t("Tutto il tavolo", "The whole table"), forced, "dice3d-forced")}${radio("visibility", "private", visibility, ctx.role === "dm" ? t("Solo io (tiro nascosto del DM)", "Only me (hidden DM roll)") : t("Solo io", "Only me"))}${forced ? `<p class="muted dice3d-note dice3d-forced" id="dice3d-forced" data-dice3d-forced>${ctx.esc(pick(forced, ctx.lang))}</p>` : ""}</fieldset>
<p class="error dice3d-error" role="alert" data-dice3d-error${ui.error ? "" : " hidden"}>${ctx.esc(ui.error)}</p>
<button class="button primary dice3d-roll" type="submit" data-dice3d-roll>${ctx.icon("dice")} ${t("Lancia i dadi", "Roll the dice")}</button>
</form>
<section class="dice3d-recent" aria-labelledby="dice3d-recent-title">
<h3 id="dice3d-recent-title">${t("Tiri recenti", "Recent rolls")}</h3>
<p class="muted dice3d-note">${t("Solo i tiri che puoi vedere. «Rivedi» ripete l’animazione sullo stesso risultato registrato.", "Only rolls you can see. “Replay” repeats the animation on the same recorded result.")}</p>
${recent.length ? `<ol class="dice3d-recent-list">${recent.map((item) => recentRow(ctx, item)).join("")}</ol>` : `<p class="empty-state dice3d-empty">${t("Nessun tiro ancora: prova qui accanto.", "No rolls yet: try one here.")}</p>`}
</section>
<section class="dice3d-look" aria-labelledby="dice3d-look-title">
<h3 id="dice3d-look-title">${t("I tuoi dadi", "Your dice")}</h3>
<canvas class="dice3d-preview" width="120" height="120" data-dice3d-preview aria-hidden="true"></canvas>
<fieldset class="dice3d-swatches"><legend>${t("Colore (lo vedono tutti)", "Colour (everyone sees it)")}</legend>${DICE_COLORS.map((c) => `<label class="dice3d-swatch"><input type="radio" name="dice3d-color" value="${c.value}" ${c.value === color.value ? "checked" : ""} data-dice3d-color><span class="dice3d-swatch-dot" style="--dice3d-swatch:${c.body}"></span><span>${ctx.esc(pick(c.label, ctx.lang))}</span></label>`).join("")}</fieldset>
<label class="check-field"><input type="checkbox" data-dice3d-enabled ${diceEnabled(ctx) ? "checked" : ""}> ${t("Mostra i dadi animati", "Show animated dice")}</label>
${motion === null ? "" : `<label class="field">${t("Movimento ridotto (tutta l’app)", "Reduced motion (whole app)")}<select data-dice3d-motion><option value="system" ${motion !== "reduced" ? "selected" : ""}>${t("Come il sistema", "Follow the system")}</option><option value="reduced" ${motion === "reduced" ? "selected" : ""}>${t("Sempre attivo", "Always on")}</option></select></label>`}
<p class="muted dice3d-note">${reducedMotion(ctx) ? t("Movimento ridotto attivo: i dadi mostrano subito il risultato.", "Reduced motion is on: dice show the result at once.") : motion === null ? t("Il movimento dei dadi segue il sistema.", "Dice motion follows the system.") : t("Le stesse scelte sono in Preferenze › Dadi animati e Movimento ed effetti.", "The same choices are in Preferences › Animated dice and Motion and effects.")}</p>
</section>
</div>`;
}
function recentRow(ctx, item) {
  const view = item.view;
  const record = item.record;
  const t = ctx.t;
  const badges = [];
  if (view.visibility === "private")
    badges.push(view.controller === "dm" ? t("Solo DM", "DM only") : t("Solo tu", "Only you"));
  if (record?.status === "withdrawn")
    badges.push(`${t("Ritirato", "Withdrawn")}: ${record.withdrawal?.reason ?? ""}`);
  if (record?.status === "corrected")
    badges.push(
      `${t("Corretto", "Corrected")}: ${record.corrections.at(-1)?.reason ?? ""} (${t("prima", "before")} ${record.corrections.at(-1)?.values.join(", ")})`,
    );
  if (view.status === "reused")
    badges.push(t("Facce riusate dopo il ritiro", "Faces reused after withdrawal"));
  if (item.reverted)
    badges.push(
      t("Annullato con «Annulla»: risultato conservato", "Undone: result kept as evidence"),
    );
  if (record) badges.push(t("Tiro di prova", "Practice roll"));
  const dc = view.dc !== null ? ` · ${t("CD", "DC")} ${view.dc}` : "";
  const verdict = view.verdict ? ` · ${pick(view.verdict, ctx.lang)}` : "";
  const outcome = view.outcome ? ` · ${pick(view.outcome, ctx.lang)}` : "";
  const own = record && item.own && record.status !== "withdrawn";
  const standing = record?.status !== "withdrawn" && !item.reverted;
  const status = item.reverted ? "reverted" : (record?.status ?? view.status);
  return `<li class="dice3d-row" data-dice3d-row="${attr(ctx, item.key)}" data-status="${attr(ctx, status)}">
<div class="dice3d-row-main"><strong>${ctx.esc(whoText(ctx, view))} · ${ctx.esc(pick(view.title, ctx.lang))}</strong><span class="dice3d-row-math">${ctx.esc(breakdown(view) + dc + verdict + outcome)}</span><span class="dice3d-row-meta">${ctx.esc(modeText(ctx, view))} · ${ctx.esc(timeText(ctx, item.time))}</span>${badges.map((b) => `<span class="badge dice3d-badge">${ctx.esc(b)}</span>`).join("")}</div>
<div class="dice3d-row-actions">${!standing ? "" : `<button type="button" class="button quiet" data-dice3d-replay="${attr(ctx, item.key)}">${ctx.icon("play")} ${t("Rivedi", "Replay")}</button>`}${own && record.mode === "physical" ? `<button type="button" class="button quiet" data-dice3d-correct="${attr(ctx, record.id)}">${t("Correggi", "Correct")}</button>` : ""}${own ? `<button type="button" class="button quiet" data-dice3d-withdraw="${attr(ctx, record.id)}">${t("Ritira", "Withdraw")}</button>` : ""}</div>
</li>`;
}
const localized = (ctx, error) =>
  error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error);
function commitOptions(visibility) {
  // "Only me" is personal: allowed offline like other private data. Table rolls are shared.
  return visibility === "private"
    ? { local: true, visibility: "private", undoable: false }
    : { undoable: false };
}
function logLabel(ctx, record) {
  const view = domain.describeRoll(ctx.state, domain.demoRollEvent(record), ctx.role, {
    listing: true,
  });
  // Practice rolls never read as game rolls in the shared log, chat or recap.
  const parts = [ctx.t("Tiro di prova", "Practice roll")];
  if (record.actorName) parts.push(record.actorName);
  if (view && (record.label || record.dc !== null)) parts.push(pick(view.title, ctx.lang));
  const dc =
    record.dc !== null
      ? ` · ${ctx.t("CD", "DC")} ${record.dc}: ${record.success ? ctx.t("successo", "success") : ctx.t("fallimento", "failure")}`
      : "";
  return `${parts.join(" · ")}: ${domain.formulaText(record.dice, record.modifier)} → [${record.values.join(", ")}] = ${record.total}${dc} · ${record.mode === "physical" ? ctx.t("dado fisico", "physical die") : ctx.t("dado digitale", "digital die")}`;
}
/** Rolls the drawer's dice through the app's dice service and announces the result. */
export function rollDemo(ctx) {
  const input = {
    pool: [...ui.pool],
    modifier: ui.modifier,
    dc: ui.dc,
    label: ui.label,
    ability: ui.ability,
    actorId: ui.actorId,
    mode: ui.mode,
    visibility: ui.visibility,
    faces: [...ui.faces],
    color: diceColor(ctx).value,
  };
  const die = ctx.rollDie ?? rollDie;
  const at = new Date().toISOString();
  let record = null;
  const forced = Boolean(domain.forcedPrivateReason(ctx.state, input.actorId));
  if (ctx.offline && input.visibility !== "private" && !forced) {
    // Refused before any digital face is drawn: nothing is rolled that is not recorded.
    ui.error = ctx.t(
      "Sei senza rete: un tiro per tutto il tavolo non può essere registrato. Scegli «Solo io» o riconnettiti.",
      "You are offline: a roll for the whole table cannot be recorded. Choose “Only me” or reconnect.",
    );
    ctx.render();
    return null;
  }
  const typedFaces = ui.faces;
  try {
    // A dry run on a copy validates the input and draws the faces once; the commit then
    // records exactly those faces (the label names the result).
    const trial = structuredClone(area.slice(ctx.state));
    const preview = domain.recordDemoRoll(trial, ctx.state, input, ctx.role, die, at);
    const faces = [...preview.values];
    // The commit renders once (and restores focus): the form is already clean for it.
    ui.error = "";
    ui.faces = [];
    ctx.commit(
      logLabel(ctx, preview),
      (draft) => {
        record = domain.recordDemoRoll(
          area.slice(draft),
          draft,
          input,
          ctx.role,
          () => faces.shift(),
          at,
        );
      },
      commitOptions(preview.visibility),
    );
  } catch (error) {
    ui.faces = typedFaces;
    ui.error = localized(ctx, error);
    ctx.render();
    return null;
  }
  area.emit("roll-accepted", {
    logId: ctx.state.log.at(-1)?.id ?? null,
    roll: domain.demoRollEvent(record),
  });
  return record;
}
/** Replays an accepted roll this viewer can see: same recorded faces, never a new roll. */
export function replayRoll(ctx, key) {
  const item = domain
    .recentRolls(ctx.state, ctx.role, 60, { tray })
    .find((entry) => entry.key === key);
  // An undone roll is evidence, not a standing result: it is listed, never replayed.
  const view = item && !item.reverted ? domain.describeRoll(ctx.state, item.roll, ctx.role) : null;
  if (!view) {
    ctx.toast(ctx.t("Questo tiro non è disponibile.", "This roll is unavailable."), true);
    return false;
  }
  // An explicit replay shows the dice even when automatic dice are turned off; the faces
  // are the recorded ones (reused or corrected faces included).
  if (view.mode === "digital") view.animate = true;
  present(ctx, buildScene(ctx, [view], { replay: true }));
  return true;
}
function openWithdraw(ctx, id) {
  const record = area.slice(ctx.state).rolls.find((r) => r.id === id);
  if (!record) return;
  ctx.dialog(
    ctx.t("Ritira il tiro", "Withdraw the roll"),
    `<p>${ctx.esc(logLabel(ctx, record))}</p><p class="muted">${ctx.t("Le facce restano nella cronologia come ritirate. Un nuovo tiro identico riusa una volta le stesse facce digitali.", "The faces stay in the history as withdrawn. An identical new roll reuses the same digital faces once.")}</p><label class="field">${ctx.t("Motivo", "Reason")}<textarea name="reason" maxlength="200" required data-dice3d-reason></textarea></label>`,
    {
      submitLabel: ctx.t("Ritira", "Withdraw"),
      onSubmit: (data) => {
        ctx.commit(
          `${ctx.t("Tiro di prova ritirato", "Practice roll withdrawn")}: ${record.label || domain.formulaText(record.dice, record.modifier)}`,
          (draft) => {
            domain.withdrawDemoRoll(area.slice(draft), id, data.get("reason"), ctx.role);
          },
          commitOptions(record.visibility),
        );
      },
    },
  );
}
function openCorrect(ctx, id) {
  const record = area.slice(ctx.state).rolls.find((r) => r.id === id);
  if (!record) return;
  const sides = domain.expandDice(record.dice, []).map((d) => d.sides);
  ctx.dialog(
    ctx.t("Correggi le facce del dado fisico", "Correct the physical die faces"),
    `<p>${ctx.esc(logLabel(ctx, record))}</p><div class="form-grid">${sides.map((s, i) => `<label class="field">${ctx.t("Dado", "Die")} ${i + 1} · d${s}<input type="number" name="face-${i}" min="1" max="${s}" inputmode="numeric" value="${record.values[i]}" required></label>`).join("")}</div><label class="field">${ctx.t("Motivo", "Reason")}<textarea name="reason" maxlength="200" required data-dice3d-reason></textarea></label>`,
    {
      submitLabel: ctx.t("Registra la correzione", "Record the correction"),
      onSubmit: (data) => {
        let corrected = null;
        ctx.commit(
          `${ctx.t("Correzione del tiro di prova", "Practice roll correction")}: ${record.label || domain.formulaText(record.dice, record.modifier)}`,
          (draft) => {
            corrected = domain.correctDemoRoll(
              area.slice(draft),
              id,
              sides.map((_, i) => data.get(`face-${i}`)),
              data.get("reason"),
              ctx.role,
            );
          },
          commitOptions(record.visibility),
        );
        area.emit("roll-accepted", {
          logId: ctx.state.log.at(-1)?.id ?? null,
          roll: domain.demoRollEvent(corrected),
        });
      },
    },
  );
}
function drawPreview(canvas, color) {
  const g = canvas?.getContext?.("2d");
  if (!g) return;
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  canvas.width = 120 * dpr;
  canvas.height = 120 * dpr;
  g.clearRect(0, 0, canvas.width, canvas.height);
  const mesh = geo.getMesh("d20");
  // Tilted so the facets read as a solid, not a flat badge.
  const matrix = geo.matMul(geo.rotAxis([1, 0.35, 0], 0.42), geo.restingMatrix(mesh, 20, 0.2));
  geo.drawShadow(g, { x: 60, y: 62, size: 38, dpr });
  geo.drawDie(g, mesh, {
    matrix,
    x: 60,
    y: 58,
    size: 38,
    dpr,
    colors: { body: color.body, ink: color.ink },
  });
}
function applyFocus(root) {
  if (!ui.focus) return;
  const target = root.querySelector(ui.focus);
  ui.focus = null;
  target?.focus?.();
}
export function bindDrawer(root, ctx) {
  const rerender = (focus) => {
    ui.focus = focus ?? null;
    ctx.render();
  };
  root.querySelectorAll("[data-dice3d-add]").forEach((button) => {
    button.onclick = () => {
      if (ui.pool.length >= domain.MAX_POOL) return;
      ui.pool.push(Number(button.dataset.dice3dAdd));
      ui.faces = [];
      ui.error = "";
      rerender(`[data-dice3d-add="${button.dataset.dice3dAdd}"]`);
    };
  });
  root.querySelectorAll("[data-dice3d-remove]").forEach((button) => {
    button.onclick = () => {
      ui.pool.splice(Number(button.dataset.dice3dRemove), 1);
      ui.faces = [];
      ui.error = "";
      rerender(ui.pool.length ? "[data-dice3d-remove]" : '[data-dice3d-add="20"]');
    };
  });
  root.querySelector("[data-dice3d-clear]")?.addEventListener("click", () => {
    Object.assign(ui, { pool: [], faces: [], dc: "", error: "" });
    rerender('[data-dice3d-add="20"]');
  });
  root.querySelectorAll("[data-dice3d-preset]").forEach((button) => {
    button.onclick = () => {
      if (button.dataset.dice3dPreset === "save") {
        const bonus = domain.saveModifier(ctx.state, ui.actorId, "con");
        Object.assign(ui, {
          pool: [20],
          modifier: String(bonus?.modifier ?? 0),
          dc: "12",
          ability: "con",
          label: "",
        });
      } else
        Object.assign(ui, {
          pool: [...domain.DEMO_SIDES],
          modifier: "",
          dc: "",
          ability: null,
          label: "",
        });
      ui.faces = [];
      ui.error = "";
      rerender("[data-dice3d-roll]");
    };
  });
  root.querySelectorAll("[data-dice3d-field]").forEach((input) => {
    input.addEventListener("input", () => {
      ui[input.dataset.dice3dField] = input.value;
      // A hand-changed modifier is no longer the preset's saving-throw modifier.
      if (input.dataset.dice3dField === "modifier") ui.ability = null;
    });
  });
  root.querySelectorAll("[data-dice3d-face]").forEach((input) => {
    input.addEventListener(
      "input",
      () => (ui.faces[Number(input.dataset.dice3dFace)] = input.value),
    );
  });
  root.querySelector("[data-dice3d-actor]")?.addEventListener("change", (event) => {
    ui.actorId = event.target.value;
    ui.ability = null;
    rerender("[data-dice3d-actor]");
  });
  root.querySelectorAll("[data-dice3d-mode]").forEach((input) => {
    input.addEventListener("change", () => {
      ui.mode = input.value;
      ui.faces = [];
      rerender(`[data-dice3d-mode][value="${input.value}"]`);
    });
  });
  root.querySelectorAll("[data-dice3d-visibility]").forEach((input) => {
    input.addEventListener("change", () => (ui.visibility = input.value));
  });
  const form = root.querySelector("[data-dice3d-form]");
  if (form)
    form.onsubmit = (event) => {
      event.preventDefault?.();
      ui.focus = "[data-dice3d-roll]";
      rollDemo(ctx);
    };
  root.querySelectorAll("[data-dice3d-replay]").forEach((button) => {
    button.onclick = () => replayRoll(ctx, button.dataset.dice3dReplay);
  });
  root.querySelectorAll("[data-dice3d-withdraw]").forEach((button) => {
    button.onclick = () => openWithdraw(ctx, button.dataset.dice3dWithdraw);
  });
  root.querySelectorAll("[data-dice3d-correct]").forEach((button) => {
    button.onclick = () => openCorrect(ctx, button.dataset.dice3dCorrect);
  });
  const settingChange = (key, value, focus) => {
    // Set before the call: setSetting commits and re-renders, which restores focus.
    ui.focus = focus;
    try {
      area.setSetting(ctx, key, value);
    } catch (error) {
      ui.focus = null;
      ctx.toast(localized(ctx, error), true);
    }
  };
  root.querySelectorAll("[data-dice3d-color]").forEach((input) => {
    input.addEventListener("change", () =>
      settingChange(SETTING_COLOR, input.value, `[data-dice3d-color][value="${input.value}"]`),
    );
  });
  root
    .querySelector("[data-dice3d-enabled]")
    ?.addEventListener("change", (event) =>
      settingChange(SETTING_ENABLED, event.target.checked, "[data-dice3d-enabled]"),
    );
  root
    .querySelector("[data-dice3d-motion]")
    ?.addEventListener("change", (event) =>
      settingChange(B22_MOTION, event.target.value, "[data-dice3d-motion]"),
    );
  drawPreview(root.querySelector?.("[data-dice3d-preview]"), diceColor(ctx));
  applyFocus(root);
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  area = registry;
  registry.registerStateSlice(ID, {
    version: 1,
    // Accepted faces are evidence: gameplay Undo never removes them (corrections do).
    undo: "preserve",
    seed: domain.seedSlice,
    normalize: domain.normalizeSlice,
  });
  registry.registerStyles(new URL("./dice-3d.css", import.meta.url));
  registry.add("settings", {
    id: ID,
    label: L("Dadi animati", "Animated dice"),
    description: L(
      "Dadi 3D sui tiri digitali già registrati.",
      "3D dice on digital rolls already recorded.",
    ),
    scope: "personal",
    fields: [
      {
        id: "enabled",
        label: L("Mostra i dadi animati", "Show animated dice"),
        type: "boolean",
        default: true,
      },
      {
        id: "color",
        label: L("Colore dei tuoi dadi (lo vedono tutti)", "Your dice colour (everyone sees it)"),
        type: "choice",
        default: "gold",
        options: DICE_COLORS.map((c) => ({ value: c.value, label: c.label })),
      },
    ],
  });
  registry.add("table-panel", {
    id: ID,
    section: "chat",
    label: L("Prova i dadi", "Try the dice"),
    placement: "sidebar-tab",
    icon: "dice",
    order: 90,
    // B34: the dice tray absorbs this tab (its "Appearance and practice" section renders
    // this same drawer); the tab stays only when the tray is not built.
    when: () => !area?.get("table-panel", "dice-tray"),
    render: (ctx, tableView) => renderDrawer(ctx, tableView),
    bind: (el, ctx) => bindDrawer(el, ctx),
  });
  registry.on("roll-accepted", (payload, { ctx }) => {
    // An Undo's correction entry is not a new roll; a missing roll is nothing to show.
    if (!ctx || payload?.correction || !payload?.roll) return;
    queueRoll(ctx, payload.roll);
  });
  // The Table's free roll records a label only (until B34): the same dice, from the log.
  registry.on("commit", (payload, { ctx }) => {
    if (!ctx || payload?.correction || payload?.kind === "correction") return;
    const entry = (ctx.state?.log ?? []).find((e) => e.id === payload?.id);
    const roll = domain.freeRollFromEntry(entry);
    if (roll) queueRoll(ctx, roll);
  });
  registry.on("compendium:roll", (payload, { ctx }) => {
    const record = (ctx?.state?.ext?.["compendium-rolls"]?.rolls ?? []).find(
      (r) => r.id === payload?.rollId,
    );
    if (record) queueRoll(ctx, domain.compendiumRollEvent(record));
  });
  // Another identity never inherits the dice on screen (a hidden roll stays hidden).
  registry.on("role-changed", () => {
    clearDice();
    resetDiceUI();
  });
  registry.on("reset", () => {
    clearDice();
    resetDiceUI();
  });
  registry.on("language-changed", () => clearDice());
}
