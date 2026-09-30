// Area B22 — Preferences, accessibility and units. Entry module loaded by extensions.mjs
// through the B11 registry. The preferences live in the one core Preferences dialog (the
// header gear), as scoped settings grouped by "this device", "my account" and "this
// campaign" (Foundry client/user/world, FVT-188). This module:
// - applies them to the whole app (theme, text size, interface scale, typeface, contrast,
//   colour vision, reduced motion, photosensitive mode, units, sheet-only Table, screen
//   wake lock, dice and interface sounds);
// - enriches the open dialog through the "preferences:dialog" hook: scope badges, a live
//   preview reverted by Cancel/Escape (BG3 live preview, CRP-181), notes that explain the
//   effective value, volume sliders with a test button, "Reset to defaults" with a
//   confirmation and an undo, DM proposals the player accepts or declines (FVT-192);
// - adds a sheet-only Table panel, map words, notifications and a palette command.
// The pure model (sections, precedence, palettes, distance conversion, proposals) is in
// preferences-domain.mjs. Other areas read `isReducedMotion(ctx)` / `isPhotosensitive(ctx)`
// or the root attribute data-motion="reduced" (B56 animated dice already does).

import * as P from "./preferences-domain.mjs";
import { distanceRows } from "./annotations-domain.mjs";
import { campaignMembers } from "./campaign-content.mjs";
import { canViewActor, isActorAvailable } from "./character-access.mjs";
import { hasCombatPreview, handleCombatMap } from "./combat-ui.mjs";
import { rollVisibleTo } from "./registry.mjs";
import { installTooltips, scrollIntoStrip } from "./ui.mjs";

export { KEYS } from "./preferences-domain.mjs";

const L = (it, en) => ({ it, en });
const fieldName = (settingKey) => `setting:${settingKey}`;
const PALETTE_VARS = Object.keys(P.paletteVariables("protanopia", "dark"));
const hasDOM = () => typeof document !== "undefined" && Boolean(document.documentElement);
// The page a notification about DM proposals opens (Kanka / GitHub: the click opens the
// item's context).
export const PROPOSALS_ROUTE = "preferences-proposals";

// Session-local runtime state (never persisted): the host context, the distance adapter,
// the wake lock, the audio context and the last reversible preference action.
const runtime = {
  ctx: null,
  unit: null,
  lang: null,
  observer: null,
  scaling: false,
  listening: false,
  wake: { lock: null, status: "off", pending: false },
  audio: null,
  diceAt: 0,
  uiTimer: 0,
  undo: null,
  focusedRoute: null,
};
const scaledRules = new WeakSet();
// The last sounds requested (kind and volume), for tests and the dialog's status line.
export const soundLog = [];

// ---------------------------------------------------------------- reading preferences

function mediaState() {
  const match = (query) => {
    try {
      return Boolean(globalThis.matchMedia?.(query)?.matches);
    } catch {
      return false;
    }
  };
  return {
    light: match("(prefers-color-scheme: light)"),
    reduced: match("(prefers-reduced-motion: reduce)"),
  };
}
function storedValues(ctx, overrides = null) {
  return P.readValues((settingKey) =>
    overrides && Object.hasOwn(overrides, settingKey)
      ? overrides[settingKey]
      : ctx.registry.getSetting(ctx, settingKey),
  );
}
/** Effective preferences for this identity, device and language (overrides: a preview). */
export function effectivePreferences(ctx, overrides = null) {
  const media = mediaState();
  return P.effectivePreferences(storedValues(ctx, overrides), {
    lang: ctx.lang,
    systemLight: media.light,
    systemReduced: media.reduced,
  });
}
/** For other areas: no dice, token or page animation (explicit, system or photosensitive). */
export function isReducedMotion(ctx) {
  try {
    return effectivePreferences(ctx).motionReduced;
  } catch {
    return mediaState().reduced;
  }
}
/** For other areas: no flashes (critical bursts, pings, blinking highlights). */
export function isPhotosensitive(ctx) {
  try {
    return effectivePreferences(ctx).photosensitive;
  } catch {
    return false;
  }
}
/** For other areas: a canonical distance in metres in this person's unit. */
export function formatDistance(ctx, meters) {
  return P.formatDistance(meters, effectivePreferences(ctx).unit, ctx.lang);
}
/** For other areas: a canonical weight in kilograms in this person's unit. */
export function formatWeight(ctx, kg) {
  return P.formatWeight(kg, effectivePreferences(ctx).unit, ctx.lang);
}

// ---------------------------------------------------------------- applying preferences

/**
 * Applies the effective preferences to the document root: data attributes read by
 * preferences.css and by other areas, custom properties for text size, interface scale
 * and the colour-vision palette, the distance adapter and the screen wake lock.
 */
export function applyPreferences(ctx, overrides = null, doc = globalThis.document) {
  const eff = effectivePreferences(ctx, overrides);
  const root = doc?.documentElement;
  if (!root) return eff;
  const set = (name, value) => {
    if (value === null) delete root.dataset[name];
    else root.dataset[name] = value;
  };
  set("prefTheme", eff.theme);
  set("prefFont", eff.font);
  set("prefContrast", eff.contrast);
  set("prefVision", eff.vision);
  set("prefMapWords", eff.mapWords ? "on" : null);
  set("prefNames", eff.nameBackdrop);
  set("prefUnits", eff.unit);
  set("prefCanvas", eff.sheetOnly ? "off" : "on");
  set("motion", eff.motionReduced ? "reduced" : null);
  set("prefPhotosensitive", eff.photosensitive ? "on" : null);
  set("prefScaled", eff.textScale > 1 || eff.uiScale > 1 ? "on" : null);
  set("prefFade", eff.panelOpacity < 1 ? "on" : null);
  root.style.setProperty("--pref-text-scale", String(eff.textScale));
  root.style.setProperty("--pref-ui-scale", String(eff.uiScale));
  root.style.setProperty("--pref-panel-opacity", String(eff.panelOpacity));
  for (const name of PALETTE_VARS) root.style.removeProperty(name);
  for (const [name, value] of Object.entries(P.paletteVariables(eff.vision, eff.theme)))
    root.style.setProperty(name, value);
  if (eff.textScale !== 1 || eff.uiScale !== 1) scaleStyleSheets(doc);
  setDistanceUnit(eff.unit, ctx.lang, doc);
  if (doc === globalThis.document) scheduleTableFit();
  if (!overrides) syncWakeLock(ctx, eff);
  return eff;
}

// Interface scale and text size (Foundry UI scale and font size, FVT-189 / SVC-160; Fantasy
// Grounds /scaleui, R20-202; BG3 text size, SVC-170) rewrite the lengths of every
// same-origin stylesheet once — core and areas, also those loaded or inserted later: every
// px length is multiplied by --pref-ui-scale, and text sizes (font-size, line-height) also
// by --pref-text-scale. Like browser zoom, everything grows while window units (vh, vw)
// still mean the window and the positions scripts measure stay in page pixels. (CSS zoom
// on the body multiplied the window units, so the Table no longer fitted the window, and
// misplaced the menus that scripts place beside a token.) Nothing is rewritten until a
// size other than 100% is chosen; back at 100% both factors are 1 and the result is the
// same as the original rules.
const TEXT_PROPERTIES = new Set(["font-size", "line-height"]);
const PX_LENGTH = /(^|[\s(,/*+-])(-?(?:\d+\.\d+|\.\d+|\d+))px\b/g;
const PURE_PX = /^-?(?:\d+\.\d+|\.\d+|\d+)px$/;
const UI_FACTOR = "var(--pref-ui-scale, 1)";
const TEXT_FACTOR = "var(--pref-text-scale, 1) * var(--pref-ui-scale, 1)";
/** The scaled form of one declaration, or null when it stays as it is. */
export function scaledValue(property, value) {
  const text = String(value ?? "").trim();
  if (!text.includes("px") || /url\(|["']/.test(text)) return null;
  if (property.startsWith("--")) return PURE_PX.test(text) ? `calc(${text} * ${UI_FACTOR})` : null;
  if (TEXT_PROPERTIES.has(property))
    // The whole value, so that clamp(29px, 3vw, 42px) grows too; em, rem and % already
    // follow a scaled parent or root.
    return /\d(?:r?em|ex|ch)\b|%/.test(text) ? null : `calc(${text} * ${TEXT_FACTOR})`;
  const next = text.replace(PX_LENGTH, (match, before, number) =>
    Number(number) === 0 ? match : `${before}calc(${number}px * ${UI_FACTOR})`,
  );
  return next === text ? null : next;
}
function scaleRules(rules) {
  for (const rule of rules) {
    if (rule.cssRules?.length) scaleRules(rule.cssRules);
    const style = rule.style;
    if (!style || scaledRules.has(rule)) continue;
    scaledRules.add(rule);
    for (const property of Array.from(style)) {
      const next = scaledValue(property, style.getPropertyValue(property));
      if (next) style.setProperty(property, next, style.getPropertyPriority(property));
    }
  }
}
function scaleSheet(sheet) {
  let rules = null;
  try {
    rules = sheet?.cssRules;
  } catch {
    return;
  }
  if (rules) scaleRules(rules);
}
function scaleStyleSheets(doc) {
  runtime.scaling = true;
  for (const sheet of doc.styleSheets ?? []) scaleSheet(sheet);
}
// The core sizes the Table's map for the 100 % header and bars (100dvh − 480px). With a
// larger text or interface those bars grow: the bars around the map are measured after
// each render or resize and the map takes the rest of the window (preferences.css), so
// the action bar stays in the window as it does at 100 %.
let fitFrame = 0;
function scheduleTableFit() {
  if (fitFrame || typeof globalThis.requestAnimationFrame !== "function") return;
  const root = globalThis.document?.documentElement;
  if (!root?.dataset.prefScaled && !root?.style.getPropertyValue("--pref-table-chrome")) return;
  fitFrame = globalThis.requestAnimationFrame(() => {
    fitFrame = 0;
    fitTable(globalThis.document);
  });
}
function fitTable(doc) {
  const root = doc?.documentElement;
  if (!root) return;
  const stage = doc.querySelector(".workspace.is-table .table-stage");
  const main = stage?.closest("main");
  if (!stage || !main || root.dataset.prefScaled !== "on") {
    root.style.removeProperty("--pref-table-chrome");
    return;
  }
  const box = stage.getBoundingClientRect();
  const around =
    box.top + (globalThis.scrollY ?? 0) + (main.getBoundingClientRect().bottom - box.bottom);
  const value = `${Math.ceil(around)}px`;
  if (root.style.getPropertyValue("--pref-table-chrome") !== value)
    root.style.setProperty("--pref-table-chrome", value);
}
// A <style> element an area inserts or rewrites after the first pass (map layers do).
function scaleStyleElements(node) {
  if (!runtime.scaling || node?.nodeType !== 1) return;
  const styles = node.localName === "style" ? [node] : (node.querySelectorAll?.("style") ?? []);
  for (const style of styles) scaleSheet(style.sheet);
}

// Distances and weights: canonical data stays in metres and kilograms (Italian SRD) and
// rendered text is shown in this person's unit system. The adapter converts text and
// accessible names as they are rendered anywhere in the page, outside editable fields;
// BG3 converts every game text the same way (CRP-184). A number and its unit drawn in two
// sibling nodes (`9 <small>m</small>` on the sheet) are converted together. A number
// field that takes metres or kilograms keeps its canonical unit and shows the equivalent
// beside it ("= 30 ft"). New code can call formatDistance / formatWeight instead.
const SKIP = "textarea, script, style, code, pre, [contenteditable='true'], [data-units='raw']";
const ATTRIBUTES = ["aria-label", "title", "aria-valuetext"];
const SPLIT_NUMBER = /(?<![\p{L}\p{N}.,])(\d+(?:[.,]\d+)?)([   ]*)$/u;
function convertTextNode(node) {
  if (!node.data || !/\d/.test(node.data)) return;
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP)) return;
  const next = P.convertUnitsText(node.data, runtime.unit, runtime.lang);
  if (next !== node.data) node.data = next;
  convertSplit(node);
}
function convertSplit(node) {
  const unit = node.nextSibling;
  if (
    unit?.nodeType !== 1 ||
    unit.childNodes.length !== 1 ||
    unit.firstChild.nodeType !== 3 ||
    unit.matches(SKIP)
  )
    return;
  const match = SPLIT_NUMBER.exec(node.data);
  if (!match) return;
  const pair = P.convertSplitPair(match[1], unit.firstChild.data, runtime.unit, runtime.lang);
  if (!pair) return;
  node.data = node.data.slice(0, match.index) + pair.number + match[2];
  unit.firstChild.data = unit.firstChild.data.replace(/\S+/, pair.unit);
}
function convertAttributes(element) {
  if (!element.getAttribute || element.closest?.(SKIP)) return;
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (!value || !/\d/.test(value)) continue;
    const next = P.convertUnitsText(value, runtime.unit, runtime.lang);
    if (next !== value) element.setAttribute(name, next);
  }
}
// Number fields labelled in metres or kilograms, e.g. "Velocità (metri)", "Peso (kg)".
const HINT_LABELS = {
  distance: /\((?:m|metri|metres|meters)\)/i,
  weight: /\((?:kg|chilogrammi|kilograms)\)/i,
};
let hintCount = 0;
function hintKind(input) {
  const label =
    [...(input.labels ?? [])].map((entry) => entry.textContent).join(" ") ||
    input.getAttribute("aria-label") ||
    "";
  return HINT_LABELS.distance.test(label)
    ? "distance"
    : HINT_LABELS.weight.test(label)
      ? "weight"
      : null;
}
function hintText(kind, raw) {
  const value = Number(String(raw ?? "").replace(",", "."));
  if (String(raw ?? "").trim() === "" || !Number.isFinite(value)) return "";
  return `= ${kind === "distance" ? P.formatDistance(value, runtime.unit, runtime.lang) : P.formatWeight(value, runtime.unit, runtime.lang)}`;
}
function updateHint(event) {
  const input = event.currentTarget;
  const hint = input.nextElementSibling;
  if (hint?.classList.contains("pref-unit-hint"))
    hint.textContent = hintText(input.dataset.prefHint, input.value);
}
function hintInput(input) {
  if (runtime.unit !== "imperial" || input.type !== "number" || input.dataset.prefHint) return;
  if (input.closest(SKIP)) return;
  const kind = hintKind(input);
  if (!kind) return;
  const id = `pref-unit-hint-${++hintCount}`;
  input.dataset.prefHint = kind;
  input.insertAdjacentHTML(
    "afterend",
    `<small class="pref-unit-hint" id="${id}" data-units="raw" aria-live="polite"></small>`,
  );
  input.nextElementSibling.textContent = hintText(kind, input.value);
  const described = input.getAttribute("aria-describedby");
  input.setAttribute("aria-describedby", described ? `${described} ${id}` : id);
  input.addEventListener("input", updateHint);
}
function clearHints(doc) {
  for (const hint of doc.querySelectorAll?.(".pref-unit-hint") ?? []) {
    const input = hint.previousElementSibling;
    if (input?.dataset?.prefHint) {
      delete input.dataset.prefHint;
      input.removeEventListener("input", updateHint);
      const rest = (input.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter((id) => id && id !== hint.id);
      if (rest.length) input.setAttribute("aria-describedby", rest.join(" "));
      else input.removeAttribute("aria-describedby");
    }
    hint.remove();
  }
}
function convertTree(node) {
  if (node.nodeType === 3) return convertTextNode(node);
  if (node.nodeType !== 1 || node.closest(SKIP)) return;
  scaleStyleElements(node);
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) convertTextNode(text);
  convertAttributes(node);
  node.querySelectorAll("[aria-label],[title],[aria-valuetext]").forEach(convertAttributes);
  if (runtime.unit !== "imperial") return;
  if (node.localName === "input") hintInput(node);
  node.querySelectorAll('input[type="number"]').forEach(hintInput);
}
function setDistanceUnit(unit, lang, doc) {
  const changed = unit !== runtime.unit || lang !== runtime.lang;
  runtime.unit = unit;
  runtime.lang = lang;
  if (!doc.body || typeof MutationObserver === "undefined") return;
  if (!runtime.observer) {
    runtime.observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList") {
          if (record.target.localName === "style") scaleStyleElements(record.target);
          record.addedNodes.forEach(convertTree);
          // A number drawn before its unit element: the unit arrives as a later sibling.
          if (record.previousSibling?.nodeType === 3) convertTextNode(record.previousSibling);
        } else if (record.type === "characterData") convertTextNode(record.target);
        else convertAttributes(record.target);
      }
      scheduleTableFit();
    });
    runtime.observer.observe(doc.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES,
    });
  }
  if (changed) {
    clearHints(doc);
    convertTree(doc.body);
  }
}

// Keep the screen awake while a sheet or the Table is open (D&D Beyond app, DDB-069),
// through the Screen Wake Lock API; released when leaving or when the page is hidden.
function wantsWake(ctx, eff) {
  const page = ctx.view?.page;
  return (
    eff.keepAwake &&
    globalThis.document?.visibilityState !== "hidden" &&
    ((page === "characters" && Boolean(ctx.view.id)) || page === "table")
  );
}
function syncWakeLock(ctx, eff) {
  const wake = runtime.wake;
  const want = wantsWake(ctx, eff);
  if (!want && wake.lock) {
    const lock = wake.lock;
    wake.lock = null;
    lock.release?.().catch?.(() => {});
  }
  if (!eff.keepAwake) wake.status = "off";
  else if (!want) wake.status = wake.status === "unsupported" ? "unsupported" : "waiting";
  if (!want || wake.lock || wake.pending) return;
  if (!globalThis.navigator?.wakeLock?.request) {
    wake.status = "unsupported";
    return;
  }
  wake.pending = true;
  globalThis.navigator.wakeLock
    .request("screen")
    .then((lock) => {
      wake.pending = false;
      // The page may have been left while the request was pending.
      if (!runtime.ctx || !wantsWake(runtime.ctx, effectivePreferences(runtime.ctx))) {
        lock.release?.().catch?.(() => {});
        wake.status = "waiting";
        return;
      }
      wake.lock = lock;
      wake.status = "active";
      lock.addEventListener?.("release", () => {
        if (wake.lock !== lock) return;
        wake.lock = null;
        wake.status = "waiting";
      });
      refreshDialogNotes();
    })
    .catch(() => {
      wake.pending = false;
      wake.status = "denied";
      refreshDialogNotes();
    });
}
/** The wake lock state: off, waiting (no sheet open), active, denied or unsupported. */
export const wakeStatus = () => runtime.wake.status;

// ---------------------------------------------------------------- sounds (TV-145)

/**
 * Plays a short synthesized sound: "dice" (a few clicks on a tray) or "ui" (a soft tick).
 * Volume 0 is silence. No audio file or external asset is used.
 */
export function playSound(kind, volume) {
  soundLog.push({ kind, volume });
  if (soundLog.length > 30) soundLog.shift();
  if (!(volume > 0)) return false;
  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextClass) return false;
  try {
    runtime.audio ??= new AudioContextClass();
    const audio = runtime.audio;
    if (audio.state === "suspended") audio.resume?.();
    const now = audio.currentTime;
    const master = audio.createGain();
    master.gain.value = Math.min(1, volume / 100) * 0.6;
    master.connect(audio.destination);
    if (kind === "dice") {
      const length = Math.max(1, Math.floor(audio.sampleRate * 0.045));
      for (let hit = 0; hit < 4; hit++) {
        const buffer = audio.createBuffer(1, length, audio.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
        const source = audio.createBufferSource();
        source.buffer = buffer;
        const gain = audio.createGain();
        gain.gain.value = 1 - hit * 0.2;
        source.connect(gain);
        gain.connect(master);
        source.start(now + hit * 0.075);
      }
    } else {
      const oscillator = audio.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      const gain = audio.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now);
      oscillator.stop(now + 0.09);
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- labels

const t = (ctx, it, en) => (ctx.lang === "en" ? en : it);
const esc = (ctx, value) => ctx.esc(value);
function scopeBadge(ctx, scope) {
  return `<span class="pref-scope" data-scope="${scope}">${esc(ctx, P.SCOPE_LABELS[scope][ctx.lang] ?? P.SCOPE_LABELS[scope].it)}</span>`;
}
function playerLabel(ctx, id) {
  const state = ctx.state;
  const characters = Object.values(state.actors ?? {})
    .filter((a) => a.owner === id && a.kind === "character" && !a.companion)
    .map((a) => a.name);
  const display = state.ext?.account?.profiles?.[id]?.displayName;
  const name =
    typeof display === "string" && display.trim()
      ? display
      : id === "player"
        ? t(ctx, "Giocatore", "Player")
        : id === "dm"
          ? "DM"
          : id;
  return characters.length ? `${name} (${characters.join(", ")})` : name;
}
function players(ctx) {
  return campaignMembers(ctx.state)
    .filter((member) => member.role === "player")
    .map((member) => member.id);
}
const unitName = (ctx, unit) =>
  unit === "imperial"
    ? t(ctx, "piedi e libbre", "feet and pounds")
    : t(ctx, "metri e chilogrammi", "metres and kilograms");
function unitsNote(ctx, eff) {
  const source = {
    personal: t(ctx, "scelta tua", "your choice"),
    campaign: t(ctx, "scelta del DM per il tavolo", "the DM’s choice for the table"),
    language: t(ctx, "secondo la lingua", "by language"),
  }[eff.unitSource];
  return `${t(ctx, "Ora", "Now")}: ${unitName(ctx, eff.unit)} (${source}) · ${t(ctx, "esempio", "example")}: ${P.formatDistance(9, eff.unit, ctx.lang)}, ${P.formatWeight(2, eff.unit, ctx.lang)}. ${t(ctx, "I dati restano in metri e chilogrammi: cambia solo come li leggi.", "Data stays in metres and kilograms: only how you read it changes.")}`;
}
function motionNote(ctx, eff) {
  const media = mediaState();
  if (eff.photosensitive)
    return t(ctx, "La modalità fotosensibile lo tiene attivo.", "Photosensitive mode keeps it on.");
  if (eff.motionChoice === "reduced")
    return t(
      ctx,
      "Attivo: niente animazioni di dadi, pedine e pagine.",
      "On: no dice, token or page animations.",
    );
  return media.reduced
    ? t(
        ctx,
        "Il sistema chiede movimento ridotto: è attivo anche così.",
        "The system asks for reduced motion: it is on this way too.",
      )
    : t(
        ctx,
        "Il sistema ora non lo chiede: le animazioni restano.",
        "The system does not ask for it now: animations stay.",
      );
}
function wakeNote(ctx) {
  return {
    off: t(ctx, "Disattivato.", "Off."),
    waiting: t(
      ctx,
      "Si attiva quando apri una scheda o il Tavolo.",
      "It starts when you open a sheet or the Table.",
    ),
    active: t(ctx, "Attivo ora: lo schermo resta acceso.", "Active now: the screen stays on."),
    denied: t(
      ctx,
      "Il browser non lo ha permesso in questo momento.",
      "The browser did not allow it right now.",
    ),
    unsupported: t(ctx, "Questo browser non lo supporta.", "This browser does not support it."),
  }[runtime.wake.status];
}
function changeList(ctx, changes) {
  return `<ul class="pref-changes">${changes
    .map(
      (change) =>
        `<li><strong>${esc(ctx, P.describeKey(change.key, ctx.lang))}</strong>: ${esc(ctx, P.describeValue(change.key, change.from, ctx.lang))} → ${esc(ctx, P.describeValue(change.key, change.to, ctx.lang))} ${scopeBadge(ctx, P.fieldOf(change.key).section.scope)}</li>`,
    )
    .join("")}</ul>`;
}

// ---------------------------------------------------------------- commands (testable)

const slice = (state) => state.ext[P.PREFERENCES_SLICE];
const now = () => new Date().toISOString();
const localized = (error) => (error?.it ? L(error.it, error.en) : null);

function writeValues(ctx, entries) {
  for (const [settingKey, value] of entries) ctx.registry.setSetting(ctx, settingKey, value);
  applyPreferences(ctx);
}

/** Changes that "Reset to defaults" would make for this identity on this device. */
export function pendingReset(ctx) {
  return P.resetChanges(storedValues(ctx));
}
/** Resets this identity's device and account preferences; returns the applied changes. */
export function resetToDefaults(ctx) {
  const changes = pendingReset(ctx);
  if (!changes.length) return changes;
  // Recorded first, so the redraw each write causes already offers the way back.
  runtime.undo = {
    kind: "reset",
    role: ctx.role,
    previous: changes.map((change) => [change.key, change.from]),
  };
  writeValues(
    ctx,
    changes.map((change) => [change.key, change.to]),
  );
  return changes;
}
/** Restores the values a reset replaced (same identity, same session). */
export function undoReset(ctx) {
  const undo = runtime.undo;
  if (undo?.kind !== "reset" || undo.role !== ctx.role)
    throw Object.assign(Error("There is no reset to undo."), {
      it: "Non c’è un ripristino da annullare.",
      en: "There is no reset to undo.",
    });
  writeValues(ctx, undo.previous);
  runtime.undo = null;
  return undo.previous.length;
}

/** The DM proposes values to a player (a shared change: it needs the network). */
export function sendProposal(ctx, { to, values, note }) {
  let proposal;
  ctx.commit(
    t(ctx, "Preferenze proposte a un giocatore", "Preferences proposed to a player"),
    (draft) => {
      proposal = P.proposeSettings(slice(draft), {
        id: globalThis.crypto.randomUUID(),
        from: ctx.role,
        fromRole: ctx.role,
        to,
        players: players(ctx),
        values,
        note,
        now: now(),
      });
    },
    { undoable: false },
  );
  return proposal;
}
/**
 * The player answers. Accepting records the answer first (a shared change, refused
 * offline before anything changes), then applies the values to this device and account.
 */
export function answerProposal(ctx, proposalId, response) {
  const proposal = slice(ctx.state).proposals.find((p) => p.id === proposalId);
  const before = storedValues(ctx);
  ctx.commit(
    response === "accepted"
      ? t(ctx, "Proposta di preferenze accettata", "Preferences proposal accepted")
      : t(ctx, "Proposta di preferenze rifiutata", "Preferences proposal declined"),
    (draft) => {
      P.respondToProposal(slice(draft), proposalId, ctx.role, response, now());
    },
    { undoable: false },
  );
  if (response !== "accepted") return [];
  const changes = Object.entries(proposal.values)
    .map(([settingKey, value]) => ({ key: settingKey, from: before[settingKey], to: value }))
    .filter((change) => JSON.stringify(change.from) !== JSON.stringify(change.to));
  // Nothing to go back to when the player already had these values.
  runtime.undo = changes.length
    ? {
        kind: "accept",
        role: ctx.role,
        proposalId,
        previous: changes.map((change) => [change.key, change.from]),
      }
    : runtime.undo;
  writeValues(
    ctx,
    changes.map((change) => [change.key, change.to]),
  );
  return changes;
}
/** The player goes back to the values they had before accepting. */
export function undoAcceptedProposal(ctx) {
  const undo = runtime.undo;
  if (undo?.kind !== "accept" || undo.role !== ctx.role)
    throw Object.assign(Error("There is no accepted proposal to undo."), {
      it: "Non c’è una proposta accettata da annullare.",
      en: "There is no accepted proposal to undo.",
    });
  ctx.commit(
    t(
      ctx,
      "Proposta di preferenze annullata dal giocatore",
      "Preferences proposal undone by the player",
    ),
    (draft) => {
      P.revertProposal(slice(draft), undo.proposalId, ctx.role, now());
    },
    { undoable: false },
  );
  writeValues(ctx, undo.previous);
  runtime.undo = null;
  return undo.previous.length;
}
export function withdrawProposal(ctx, proposalId) {
  ctx.commit(
    t(ctx, "Proposta di preferenze ritirata", "Preferences proposal withdrawn"),
    (draft) => {
      P.withdrawProposal(slice(draft), proposalId, ctx.role, now());
    },
    { undoable: false },
  );
}
export function setSheetOnly(ctx, value) {
  writeValues(ctx, [[P.KEYS.sheetOnly, Boolean(value)]]);
}

// ---------------------------------------------------------------- dialog enrichment

const STATUS = {
  pending: L("In attesa", "Pending"),
  accepted: L("Accettata", "Accepted"),
  declined: L("Rifiutata", "Declined"),
  withdrawn: L("Ritirata", "Withdrawn"),
  reverted: L("Accettata, poi annullata dal giocatore", "Accepted, then undone by the player"),
};
function proposalValues(ctx, proposal) {
  return `<ul class="pref-changes">${Object.entries(proposal.values)
    .map(
      ([settingKey, value]) =>
        `<li><strong>${esc(ctx, P.describeKey(settingKey, ctx.lang))}</strong>: ${esc(ctx, P.describeValue(settingKey, value, ctx.lang))} ${scopeBadge(ctx, P.fieldOf(settingKey).section.scope)}</li>`,
    )
    .join("")}</ul>`;
}
/** The block at the top of Preferences: incoming proposals, or the DM's help tools. */
export function proposalsHTML(ctx) {
  const all = P.proposalsFor(slice(ctx.state), ctx.role);
  if (ctx.role === "dm") {
    const sent = all
      .filter((p) => p.from === ctx.role)
      .slice(-5)
      .reverse();
    return `<section class="pref-help" aria-labelledby="pref-help-title"><h3 id="pref-help-title">${t(ctx, "Aiuta un giocatore", "Help a player")}</h3><p class="muted">${t(ctx, "Proponi preferenze: il giocatore le accetta o le rifiuta. Non vedi le sue preferenze attuali.", "Propose preferences: the player accepts or declines them. You do not see their current preferences.")}</p><button type="button" class="button" data-pref-propose>${t(ctx, "Proponi preferenze a un giocatore…", "Propose preferences to a player…")}</button>${
      sent.length
        ? `<ul class="pref-sent">${sent
            .map(
              (p) =>
                `<li data-pref-proposal="${esc(ctx, p.id)}"><span><strong>${esc(ctx, playerLabel(ctx, p.to))}</strong> · ${esc(ctx, ctx.label(STATUS[p.status]))}</span>${proposalValues(ctx, p)}${p.status === "pending" ? `<button type="button" class="button quiet" data-pref-withdraw="${esc(ctx, p.id)}">${t(ctx, "Ritira", "Withdraw")}</button>` : ""}</li>`,
            )
            .join("")}</ul>`
        : ""
    }<p class="error" role="alert" data-pref-help-error hidden></p></section>`;
  }
  const pending = all.filter((p) => p.to === ctx.role && p.status === "pending");
  if (!pending.length) return "";
  return `<section class="pref-proposals" aria-labelledby="pref-proposals-title"><h3 id="pref-proposals-title">${t(ctx, "Proposte del DM", "Proposals from the DM")}</h3>${pending
    .map(
      (p) =>
        `<article data-pref-proposal="${esc(ctx, p.id)}"><p>${t(ctx, "Il DM ti propone queste preferenze. Decidi tu: se accetti puoi tornare indietro.", "The DM proposes these preferences. You decide: if you accept you can go back.")}</p>${proposalValues(ctx, p)}${p.note ? `<blockquote>${esc(ctx, p.note)}</blockquote>` : ""}<div class="toolbar"><button type="button" class="button primary" data-pref-accept="${esc(ctx, p.id)}">${t(ctx, "Accetta e applica", "Accept and apply")}</button><button type="button" class="button" data-pref-decline="${esc(ctx, p.id)}">${t(ctx, "Rifiuta", "Decline")}</button></div></article>`,
    )
    .join("")}<p class="error" role="alert" data-pref-proposals-error hidden></p></section>`;
}

function formOverrides(form) {
  const out = {};
  for (const settingKey of P.ALL_KEYS) {
    const element = form.querySelector(`[name="${fieldName(settingKey)}"]`);
    if (!element || element.disabled) continue;
    const { field } = P.fieldOf(settingKey);
    if (field.type === "boolean") out[settingKey] = element.checked;
    else if (field.type === "choice") {
      const choice = field.options[Number(element.value)];
      if (choice) out[settingKey] = choice.value;
    } else if (field.type === "number") {
      const value = Number(element.value);
      if (Number.isFinite(value)) out[settingKey] = Math.min(field.max, Math.max(field.min, value));
    }
  }
  return out;
}
function describedField(form, settingKey) {
  return form.querySelector(`[name="${fieldName(settingKey)}"]`);
}
function addNote(ctx, form, settingKey, name, text) {
  const element = describedField(form, settingKey);
  const label = element?.closest("label");
  if (!label) return;
  const id = `pref-note-${name}`;
  label.insertAdjacentHTML(
    "afterend",
    `<p class="pref-note" id="${id}" data-pref-note="${name}" aria-live="polite">${esc(ctx, text)}</p>`,
  );
  element.setAttribute("aria-describedby", id);
}
let openForm = null;
function refreshDialogNotes() {
  const form = openForm;
  const ctx = runtime.ctx;
  if (!form?.isConnected || !ctx) return;
  const eff = effectivePreferences(ctx, formOverrides(form));
  const write = (name, text) => {
    const note = form.querySelector(`[data-pref-note="${name}"]`);
    if (note && note.textContent !== text) note.textContent = text;
  };
  write("units", unitsNote(ctx, eff));
  write("motion", motionNote(ctx, eff));
  write("wake", wakeNote(ctx));
}
function showError(root, selector, ctx, error) {
  const box = root.querySelector(selector);
  if (!box) return void ctx.toast(ctx.label(localized(error) ?? error.message), true);
  box.textContent = ctx.label(localized(error) ?? error.message);
  box.hidden = false;
}

/** Enriches the core Preferences dialog: called by the "preferences:dialog" hook. */
// The first control of a settings group: the fields that follow its heading.
function firstFieldAfter(heading) {
  for (
    let node = heading?.nextElementSibling;
    node && node.tagName !== "H3";
    node = node.nextElementSibling
  ) {
    const field = node.matches?.("input,select,textarea")
      ? node
      : node.querySelector?.("input:not([type=hidden]),select,textarea");
    if (field) return field;
  }
  return null;
}
export function enhancePreferencesDialog(form, ctx) {
  if (!form || form.dataset.prefEnhanced) return;
  form.dataset.prefEnhanced = "1";
  runtime.ctx = ctx;
  openForm = form;
  const body = form.querySelector(".dialog-body");
  if (!body) return;
  const eff = effectivePreferences(ctx);
  // Scope badges on every B22 section heading ("each item declares its scope").
  const found = [];
  for (const section of P.SECTIONS) {
    const first = describedField(form, P.key(section.id, section.fields[0].id));
    let heading = first?.closest("label")?.previousElementSibling;
    while (heading && heading.tagName !== "H3") heading = heading.previousElementSibling;
    if (!heading) continue;
    heading.id = `pref-section-${section.id}`;
    heading.classList.add("pref-heading");
    // Final review C2-4 (Foundry «Game Settings»: the scope is the group's heading, said once):
    // the category's own chip stays for assistive technology only.
    heading.insertAdjacentHTML(
      "beforeend",
      ` <span class="visually-hidden">${scopeBadge(ctx, section.scope)}</span>`,
    );
    found.push({ section, heading });
  }
  // Proposals first; then, before the first settings group, a jump list and the preview
  // status (BG3 shows the change live; Save confirms, Cancel or Escape discards it).
  body.insertAdjacentHTML(
    "afterbegin",
    `<div data-pref-proposals-slot>${proposalsHTML(ctx)}${undoHTML(ctx)}</div>`,
  );
  // Every settings group in the jump list, also those of other areas (Notifiche, Tiri e
  // dadi...): BG3's settings tabs name every page (CA-47: «Notifiche» was only reachable by
  // scrolling).
  const headings = [...body.querySelectorAll(".ext-settings h3")];
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `pref-section-area-${index}`;
  });
  const jumpName = (heading) =>
    [...heading.childNodes]
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent)
      .join("")
      .trim() || heading.textContent.trim();
  // Visual pass 2 (30/09): BG3's options menu and Foundry v13's «Game Settings» window — a
  // vertical list of categories on the left, the settings on the right. The list is grouped
  // by scope (the fieldset legends, as Foundry groups Core / System / Modules) and each entry
  // shows how many settings it holds (Foundry's «Core [33]»; the count is decorative, so a
  // button's name stays the category's name). The first entry leads to language and the
  // demo network switch, which have no heading of their own.
  const firstGroup = body.querySelector(".ext-settings");
  if (firstGroup && headings.length) {
    firstGroup.insertAdjacentHTML(
      "beforebegin",
      `<p class="pref-live" role="status" data-pref-live>${t(ctx, "Aspetto, colori e unità si vedono subito. «Salva preferenze» conferma; «Annulla» o Esc tornano a prima.", "Appearance, colours and units show at once. “Save preferences” confirms; “Cancel” or Escape go back.")}</p>`,
    );
    const general = form.querySelector('[name="lang"]')?.closest("label");
    if (general) general.id = "pref-section-general";
    const count = (heading) => {
      let n = 0;
      for (let node = heading.nextElementSibling; node && node.tagName !== "H3"; ) {
        if (node.tagName === "LABEL") n += 1;
        node = node.nextElementSibling;
      }
      return n;
    };
    const entry = (id, name, n = 0) =>
      `<button type="button" class="button quiet" data-pref-jump="${esc(ctx, id)}"><span class="pref-jump-name">${esc(ctx, name)}</span>${n ? `<span class="pref-jump-count" aria-hidden="true">${n}</span>` : ""}</button>`;
    const groups = [...body.querySelectorAll(".ext-settings")]
      .map((fieldset) => {
        const items = [...fieldset.querySelectorAll("h3")];
        if (!items.length) return "";
        const legend = fieldset.querySelector("legend")?.textContent.trim() ?? "";
        return `<p class="pref-jump-group" aria-hidden="true">${esc(ctx, legend)}</p>${items
          .map((heading) =>
            entry(heading.id.replace(/^pref-section-/, ""), jumpName(heading), count(heading)),
          )
          .join("")}`;
      })
      .join("");
    // The settings move into their own scrolling pane; the list scrolls on its own.
    const pane = form.ownerDocument.createElement("div");
    pane.className = "pref-pane";
    pane.dataset.prefPane = "";
    pane.append(...body.childNodes);
    body.classList.add("pref-layout");
    body.append(pane);
    body.insertAdjacentHTML(
      "afterbegin",
      `<nav class="pref-jump" aria-label="${t(ctx, "Sezioni delle preferenze", "Preference sections")}">${general ? entry("general", t(ctx, "Lingua e rete", "Language and network")) : ""}${groups}</nav>`,
    );
  }
  // Notes that explain the effective value, and the player's reason for a locked value.
  addNote(ctx, form, P.KEYS.units, "units", unitsNote(ctx, eff));
  addNote(ctx, form, P.KEYS.motion, "motion", motionNote(ctx, eff));
  addNote(ctx, form, P.KEYS.keepAwake, "wake", wakeNote(ctx));
  addNote(
    ctx,
    form,
    P.KEYS.sheetOnly,
    "sheet-only",
    t(
      ctx,
      "Per dispositivi lenti o schermi piccoli: la mappa non viene disegnata; scheda, elenco delle creature e azioni restano.",
      "For slow devices or small screens: the map is not drawn; sheet, creature list and actions remain.",
    ),
  );
  if (ctx.role !== "dm")
    addNote(
      ctx,
      form,
      P.KEYS.tableUnits,
      "table-units",
      t(
        ctx,
        "Bloccata: solo il DM la cambia perché vale per tutto il gruppo. La tua scelta «Distanze» in Il mio account la sostituisce solo per te.",
        "Locked: only the DM changes it because it applies to the whole group. Your “Distances” choice in My account overrides it for you only.",
      ),
    );
  // Volume sliders (Foundry per-category sliders, SVC-124) with a test button.
  for (const [settingKey, kind] of [
    [P.KEYS.diceVolume, "dice"],
    [P.KEYS.uiVolume, "ui"],
  ]) {
    const input = describedField(form, settingKey);
    if (!input || input.disabled) continue;
    input.type = "range";
    input.step = "5";
    input.classList.add("pref-range");
    const id = `pref-volume-${kind}`;
    input.insertAdjacentHTML(
      "afterend",
      `<output class="pref-output" id="${id}" for="${input.name}">${input.value}%</output>`,
    );
    input
      .closest("label")
      .insertAdjacentHTML(
        "afterend",
        `<div class="pref-sound-row"><button type="button" class="button" data-pref-test="${kind}">${kind === "dice" ? t(ctx, "Prova il suono dei dadi", "Test the dice sound") : t(ctx, "Prova il suono dell’interfaccia", "Test the interface sound")}</button><span class="muted" role="status" data-pref-sound-status="${kind}"></span></div>`,
      );
  }
  // Reset to defaults sits with the dialog's own buttons (BG3 "Reset to default").
  form
    .querySelector("footer")
    ?.insertAdjacentHTML(
      "afterbegin",
      `<button type="button" class="button quiet pref-reset" data-pref-reset>${t(ctx, "Ripristina predefiniti…", "Reset to defaults…")}</button>`,
    );
  bindDialog(form, ctx);
}

// While a reset or an accepted proposal can still be undone (same identity, until the
// page is reloaded), Preferences and the proposals page keep the way back in view.
function undoHTML(ctx) {
  const undo = runtime.undo;
  if (!undo || undo.role !== ctx.role) return "";
  const reset = undo.kind === "reset";
  return `<div class="pref-undo" data-pref-undo-block><p>${
    reset
      ? t(
          ctx,
          "Hai ripristinato i predefiniti. Puoi tornare ai valori di prima finché non ricarichi la pagina.",
          "You reset to the defaults. You can go back to the previous values until you reload the page.",
        )
      : t(
          ctx,
          "Hai accettato preferenze proposte dal DM. Puoi tornare ai valori di prima finché non ricarichi la pagina.",
          "You accepted preferences proposed by the DM. You can go back to the previous values until you reload the page.",
        )
  }</p><button type="button" class="button" data-pref-undo>${reset ? t(ctx, "Annulla ripristino", "Undo reset") : t(ctx, "Torna ai valori precedenti", "Go back to the previous values")}</button></div>`;
}
/** Undoes the last reset or accepted proposal of this identity; returns the values restored. */
export function undoLastPreferenceAction(ctx) {
  return runtime.undo?.kind === "accept" ? undoAcceptedProposal(ctx) : undoReset(ctx);
}
// The shell's own Preferences control (the header gear, on every page).
function openPreferences() {
  globalThis.document?.querySelector('.service-nav [data-service="preferences"]')?.click();
}

/**
 * Opens Preferences on one control (a settings command, SV-02): the dialog scrolls to it,
 * focuses it and marks it for a moment. `name` is a form field name ("lang",
 * "setting:preferences-look.theme"). Returns whether the control was found.
 */
export function openPreferencesAt(ctx, name) {
  openPreferences();
  const form = globalThis.document?.querySelector?.("#dialog form");
  const field = form?.querySelector?.(`[name="${String(name).replace(/["\\]/g, "\\$&")}"]`);
  if (!field) return false;
  const row = field.closest("label") ?? field;
  row.scrollIntoView?.({ block: "center" });
  field.focus?.({ preventScroll: true });
  row.classList?.add("pref-found");
  setTimeout(() => row.classList?.remove("pref-found"), 2200);
  return true;
}
const settingField = (settingKey) => `setting:${settingKey}`;
// Settings indexed as commands (Alchemy OmniSearch, Kanka's K menu; SV-02): the words
// people type ("tema", "lingua", "daltonismo") lead straight to the control.
const SETTING_COMMANDS = [
  [
    "theme",
    L("Preferenze: tema chiaro o scuro", "Preferences: light or dark theme"),
    L(
      "tema, scuro, chiaro, modalità scura, aspetto, colori dell’interfaccia",
      "theme, dark, light, dark mode, appearance, interface colours",
    ),
    () => settingField(P.KEYS.theme),
  ],
  [
    "text-size",
    L("Preferenze: dimensione del testo e scala", "Preferences: text size and scale"),
    L(
      "testo grande, dimensione del testo, caratteri più grandi, zoom, scala dell’interfaccia",
      "large text, text size, bigger font, zoom, interface scale",
    ),
    () => settingField(P.KEYS.textSize),
  ],
  [
    "language",
    L("Preferenze: lingua dell’interfaccia", "Preferences: interface language"),
    L(
      "lingua, italiano, inglese, english, traduzione",
      "language, italian, english, italiano, translation",
    ),
    () => "lang",
  ],
  [
    "colours",
    L(
      "Preferenze: colori per daltonismo e contrasto",
      "Preferences: colour-blind colours and contrast",
    ),
    L(
      "daltonismo, daltonico, protanopia, deuteranopia, tritanopia, contrasto elevato, colori",
      "colour blind, color blind, protanopia, deuteranopia, tritanopia, high contrast, colours",
    ),
    () => settingField(P.KEYS.vision),
  ],
  [
    "font",
    L("Preferenze: carattere ad alta leggibilità", "Preferences: high-legibility typeface"),
    L(
      "dislessia, carattere, font, leggibilità, lettura",
      "dyslexia, typeface, font, legibility, reading",
    ),
    () => settingField(P.KEYS.font),
  ],
  [
    "motion",
    L(
      "Preferenze: movimento ridotto e fotosensibilità",
      "Preferences: reduced motion and photosensitivity",
    ),
    L(
      "animazioni, movimento ridotto, fotosensibile, lampi, epilessia",
      "animations, reduced motion, photosensitive, flashes, epilepsy",
    ),
    () => settingField(P.KEYS.motion),
  ],
  [
    "sound",
    L("Preferenze: volume di dadi e interfaccia", "Preferences: dice and interface volume"),
    L("suono, suoni, volume, audio, muto, silenzio", "sound, sounds, volume, audio, mute, silence"),
    () => settingField(P.KEYS.diceVolume),
  ],
  [
    "units",
    L("Preferenze: unità di misura (metri o piedi)", "Preferences: units (metres or feet)"),
    L(
      "unità, metri, piedi, feet, chili, libbre, misure",
      "units, metres, meters, feet, kilograms, pounds, measures",
    ),
    () => settingField(P.KEYS.units),
  ],
  [
    "tooltips",
    L("Preferenze: ritardo dei suggerimenti (tooltip)", "Preferences: tooltip delay"),
    L(
      "tooltip, suggerimenti, ritardo, descrizioni al passaggio del mouse",
      "tooltip, tooltips, delay, hover descriptions",
    ),
    () => settingField(P.KEYS.tooltipDelay),
  ],
  [
    "notifications",
    L(
      "Preferenze: notifiche e promemoria delle sessioni",
      "Preferences: notifications and session reminders",
    ),
    L(
      "notifiche, promemoria, avvisi, ricordami, reminder, campanella",
      "notifications, reminders, alerts, remind me, bell",
    ),
    () => "setting:notifications.cat-reminders",
  ],
  [
    "open",
    L("Apri le preferenze", "Open preferences"),
    L(
      "preferenze, impostazioni personali, opzioni, accessibilità, settings",
      "preferences, personal settings, options, accessibility, settings",
    ),
    () => "lang",
  ],
];
function bindProposals(root, ctx) {
  const slot = root.matches?.("[data-pref-proposals-slot]")
    ? root
    : root.querySelector("[data-pref-proposals-slot]");
  if (!slot) return;
  const form = root.localName === "form" ? root : null;
  // In Preferences the block is redrawn in place; the page is redrawn by the commit.
  const refresh = () => {
    if (!form || !slot.isConnected) return;
    slot.innerHTML = proposalsHTML(ctx) + undoHTML(ctx);
    bindProposals(form, ctx);
  };
  slot.querySelector("[data-pref-undo]")?.addEventListener("click", () => {
    try {
      undoLastPreferenceAction(ctx);
    } catch (error) {
      return ctx.toast(ctx.label(localized(error) ?? error.message), true);
    }
    ctx.toast(t(ctx, "Valori precedenti ripristinati.", "Previous values restored."));
    // The open form still shows the undone values: open it again with the restored ones.
    if (form) {
      ctx.closeDialog();
      openPreferences();
    }
  });
  slot
    .querySelector("[data-pref-propose]")
    ?.addEventListener("click", () => openProposalDialog(ctx));
  slot.querySelectorAll("[data-pref-withdraw]").forEach((button) =>
    button.addEventListener("click", () => {
      try {
        withdrawProposal(ctx, button.dataset.prefWithdraw);
        ctx.toast(t(ctx, "Proposta ritirata.", "Proposal withdrawn."));
        refresh();
      } catch (error) {
        showError(slot, "[data-pref-help-error]", ctx, error);
      }
    }),
  );
  slot.querySelectorAll("[data-pref-decline]").forEach((button) =>
    button.addEventListener("click", () => {
      try {
        answerProposal(ctx, button.dataset.prefDecline, "declined");
        ctx.toast(
          t(ctx, "Proposta rifiutata: nulla è cambiato.", "Proposal declined: nothing changed."),
        );
        refresh();
      } catch (error) {
        showError(slot, "[data-pref-proposals-error]", ctx, error);
      }
    }),
  );
  slot.querySelectorAll("[data-pref-accept]").forEach((button) =>
    button.addEventListener("click", () => {
      const dirty = form?.dataset.prefDirty === "1";
      let changes;
      try {
        changes = answerProposal(ctx, button.dataset.prefAccept, "accepted");
      } catch (error) {
        return showError(slot, "[data-pref-proposals-error]", ctx, error);
      }
      openAcceptedDialog(ctx, changes, dirty);
    }),
  );
}

// Left and right arrows step through a closed drop-down on every platform (Fantasy
// Grounds options, R20-201): the AFB report found menus that ignored the arrows (SVC-169),
// and on macOS the down arrow only opens the native list.
function arrowCycling(form) {
  form?.addEventListener("keydown", (event) => {
    const select = event.target;
    if (select?.tagName !== "SELECT" || select.disabled) return;
    if (!["ArrowLeft", "ArrowRight"].includes(event.key) || event.altKey || event.metaKey) return;
    event.preventDefault();
    const next = select.selectedIndex + (event.key === "ArrowRight" ? 1 : -1);
    if (next < 0 || next >= select.options.length) return;
    select.selectedIndex = next;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

// Marks one category of the list as current: the one clicked, or the last whose heading has
// reached the top of the settings pane (the last one once the pane is scrolled to the end).
const jumpHold = new WeakMap();
function markJump(form, chosen = null) {
  const nav = form.querySelector(".pref-jump");
  const pane = form.querySelector("[data-pref-pane]");
  if (!nav || !pane) return;
  const buttons = [...nav.querySelectorAll("[data-pref-jump]")];
  // A category just clicked stays lit while its own scroll settles (the last ones cannot
  // reach the top of the pane).
  if (chosen) jumpHold.set(form, Date.now() + 500);
  else if ((jumpHold.get(form) ?? 0) > Date.now()) return;
  let current = chosen;
  if (!current) {
    const top = pane.getBoundingClientRect().top + 24;
    current = buttons[0];
    for (const button of buttons) {
      const target = form.querySelector(`#pref-section-${button.dataset.prefJump}`);
      if (target && target.getBoundingClientRect().top <= top) current = button;
    }
    if (pane.scrollTop > 0 && pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2)
      current = buttons.at(-1);
  }
  for (const button of buttons) {
    const on = button === current;
    button.classList.toggle("active", on);
    if (on) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  }
  if (current) scrollIntoStrip(nav, current);
}
function bindDialog(form, ctx) {
  const dialog = form.closest("dialog");
  const preview = () => {
    form.dataset.prefDirty = "1";
    const overrides = formOverrides(form);
    applyPreferences(ctx, overrides);
    for (const output of form.querySelectorAll(".pref-output")) {
      const input = form.querySelector(
        `[name="${output.htmlFor.value || output.getAttribute("for")}"]`,
      );
      if (input) output.textContent = `${input.value}%`;
    }
    const live = form.querySelector("[data-pref-live]");
    if (live)
      live.textContent = t(
        ctx,
        "Anteprima attiva: non ancora salvata. «Salva preferenze» conferma; «Annulla» o Esc tornano a prima.",
        "Preview on: not saved yet. “Save preferences” confirms; “Cancel” or Escape go back.",
      );
    refreshDialogNotes();
  };
  form.addEventListener("input", preview);
  form.addEventListener("change", preview);
  arrowCycling(form);
  form.querySelectorAll("[data-pref-jump]").forEach((button) =>
    button.addEventListener("click", () => {
      const heading = form.querySelector(`#pref-section-${button.dataset.prefJump}`);
      heading?.scrollIntoView({ block: "start" });
      (heading?.tagName === "H3"
        ? firstFieldAfter(heading)
        : heading?.querySelector("input,select,textarea")
      )?.focus({ preventScroll: true });
      markJump(form, button);
    }),
  );
  // The open category is marked in the list while the settings scroll (BG3 and Foundry show
  // the selected category lit).
  const pane = form.querySelector("[data-pref-pane]");
  if (pane) {
    let frame = 0;
    pane.addEventListener(
      "scroll",
      () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          markJump(form);
        });
      },
      { passive: true },
    );
    markJump(form);
  }
  form.querySelectorAll("[data-pref-test]").forEach((button) =>
    button.addEventListener("click", () => {
      const kind = button.dataset.prefTest;
      const settingKey = kind === "dice" ? P.KEYS.diceVolume : P.KEYS.uiVolume;
      const volume = formOverrides(form)[settingKey] ?? ctx.registry.getSetting(ctx, settingKey);
      const played = playSound(kind, volume);
      const status = form.querySelector(`[data-pref-sound-status="${kind}"]`);
      if (status)
        status.textContent = !(volume > 0)
          ? t(ctx, "Volume a 0: silenzio.", "Volume at 0: silence.")
          : played
            ? t(ctx, `Suono riprodotto al ${volume}%.`, `Sound played at ${volume}%.`)
            : t(ctx, "Questo browser non riproduce suoni.", "This browser cannot play sounds.");
    }),
  );
  form
    .querySelector("[data-pref-reset]")
    ?.addEventListener("click", () => openResetDialog(ctx, form.dataset.prefDirty === "1"));
  bindProposals(form, ctx);
  // Saving, cancelling, Escape or opening another dialog all end here: the saved values
  // are applied again (a cancelled preview disappears, a saved one stays).
  const closed = () => {
    // A close event queued by an earlier dialog is not this form closing.
    if (dialog.open && form.isConnected) return;
    dialog.removeEventListener("close", closed);
    if (openForm === form) openForm = null;
    applyPreferences(ctx);
  };
  dialog?.addEventListener("close", closed);
}

// ---------------------------------------------------------------- follow-up dialogs

function proposalFieldsHTML(ctx) {
  return P.PROPOSABLE_KEYS.map((settingKey) => {
    const { section, field } = P.fieldOf(settingKey);
    const options =
      field.type === "boolean"
        ? [
            ["true", t(ctx, "Attiva", "On")],
            ["false", t(ctx, "Disattiva", "Off")],
          ]
        : field.options.map((choice, i) => [String(i), ctx.label(choice.label)]);
    return `<label class="field"><span class="pref-field-label">${esc(ctx, ctx.label(field.label))} ${scopeBadge(ctx, section.scope)}</span><select name="propose:${settingKey}"><option value="">${t(ctx, "— Non proporre —", "— Do not propose —")}</option>${options.map(([value, text]) => `<option value="${value}">${esc(ctx, text)}</option>`).join("")}</select></label>`;
  }).join("");
}
/** Reads the proposal form: {to, values, note}. */
export function readProposalForm(data) {
  const values = {};
  for (const settingKey of P.PROPOSABLE_KEYS) {
    const raw = data.get(`propose:${settingKey}`);
    if (raw === null || raw === "") continue;
    const { field } = P.fieldOf(settingKey);
    values[settingKey] =
      field.type === "boolean" ? raw === "true" : field.options[Number(raw)]?.value;
  }
  return { to: String(data.get("to") ?? ""), values, note: String(data.get("note") ?? "") };
}
export function openProposalDialog(ctx) {
  const list = players(ctx);
  ctx.dialog(
    t(ctx, "Proponi preferenze a un giocatore", "Propose preferences to a player"),
    `<p>${t(ctx, "Il giocatore riceve la proposta tra le notifiche e in Preferenze e decide lui se applicarla. Non vedrai le sue preferenze attuali.", "The player receives the proposal in the notifications and in Preferences and decides whether to apply it. You will not see their current preferences.")}</p><label class="field">${t(ctx, "Giocatore", "Player")}<select name="to">${list.map((id) => `<option value="${esc(ctx, id)}">${esc(ctx, playerLabel(ctx, id))}</option>`).join("")}</select></label><fieldset class="pref-propose"><legend>${t(ctx, "Preferenze da proporre", "Preferences to propose")}</legend>${proposalFieldsHTML(ctx)}</fieldset><label class="field">${t(ctx, "Nota per il giocatore (facoltativa)", "Note for the player (optional)")}<textarea name="note" maxlength="${P.NOTE_MAX}" rows="3"></textarea></label>`,
    {
      submitLabel: t(ctx, "Invia proposta", "Send proposal"),
      onSubmit: (data) => {
        const proposal = sendProposal(ctx, readProposalForm(data));
        ctx.toast(
          t(
            ctx,
            `Proposta inviata a ${playerLabel(ctx, proposal.to)}.`,
            `Proposal sent to ${playerLabel(ctx, proposal.to)}.`,
          ),
        );
      },
    },
  );
  arrowCycling(globalThis.document?.querySelector("#dialog form"));
}
function openAcceptedDialog(ctx, changes, dirty) {
  ctx.dialog(
    t(ctx, "Preferenze del DM applicate", "DM’s preferences applied"),
    `${changes.length ? changeList(ctx, changes) : `<p>${t(ctx, "Avevi già questi valori: nulla è cambiato.", "You already had these values: nothing changed.")}</p>`}<p class="muted">${t(ctx, "Puoi cambiarle quando vuoi in Preferenze. Finché non ricarichi la pagina, lì trovi anche «Torna ai valori precedenti».", "You can change them any time in Preferences. Until you reload the page, you also find “Go back to the previous values” there.")}</p>${dirty ? `<p class="muted">${t(ctx, "Le altre modifiche non salvate nel modulo Preferenze non sono state applicate.", "Other unsaved changes in the Preferences form were not applied.")}</p>` : ""}`,
    {
      submitLabel: changes.length
        ? t(ctx, "Annulla e torna ai valori precedenti", "Undo and go back to the previous values")
        : undefined,
      cancelLabel: t(ctx, "Chiudi", "Close"),
      onSubmit: () => {
        undoAcceptedProposal(ctx);
        ctx.toast(t(ctx, "Valori precedenti ripristinati.", "Previous values restored."));
      },
    },
  );
}
function openResetDialog(ctx, dirty) {
  const changes = pendingReset(ctx);
  if (!changes.length) {
    ctx.dialog(
      t(ctx, "Ripristina predefiniti", "Reset to defaults"),
      `<p>${t(ctx, "Le tue preferenze di aspetto, accessibilità, unità e suoni sono già quelle predefinite.", "Your appearance, accessibility, units and sound preferences are already the defaults.")}</p>`,
      { cancelLabel: t(ctx, "Chiudi", "Close"), onCancel: () => openPreferences() },
    );
    return;
  }
  ctx.dialog(
    t(ctx, "Ripristinare i predefiniti?", "Reset to defaults?"),
    `<p>${t(ctx, "Tornano ai valori predefiniti le tue preferenze di aspetto, accessibilità, unità e suoni su questo dispositivo e nel tuo account:", "Your appearance, accessibility, units and sound preferences on this device and in your account go back to the defaults:")}</p>${changeList(ctx, changes)}<p class="muted">${t(ctx, "Lingua, notifiche, preferenze delle altre aree e della campagna non cambiano.", "Language, notifications, other areas’ and campaign preferences do not change.")}${dirty ? " " + t(ctx, "Le modifiche non salvate nel modulo Preferenze vanno perse.", "Unsaved changes in the Preferences form are lost.") : ""}</p>`,
    {
      submitLabel: t(ctx, "Ripristina", "Reset"),
      // X-05: «Annulla» or Esc goes back to Preferences, not out of everything.
      onCancel: () => openPreferences(),
      onSubmit: () => {
        const applied = resetToDefaults(ctx);
        ctx.dialog(
          t(ctx, "Predefiniti ripristinati", "Defaults restored"),
          `${changeList(ctx, applied)}<p class="muted">${t(ctx, "Puoi tornare ai valori di prima finché non ricarichi la pagina: da qui o, dopo, da Preferenze.", "You can go back to the previous values until you reload the page: from here or, later, from Preferences.")}</p>`,
          {
            submitLabel: t(ctx, "Annulla ripristino", "Undo reset"),
            cancelLabel: t(ctx, "Chiudi", "Close"),
            onSubmit: () => {
              undoReset(ctx);
              ctx.toast(t(ctx, "Valori precedenti ripristinati.", "Previous values restored."));
            },
          },
        );
      },
    },
  );
}

// ---------------------------------------------------------------- Table: sheet-only mode

function observable(ctx, scene) {
  const state = ctx.state;
  return (scene?.tokens ?? []).filter((token) => {
    const subject = state.actors[token.actorId];
    return Boolean(
      isActorAvailable(subject) &&
      (!subject.companion || canViewActor(subject, ctx.role, state)) &&
      (subject.visibility !== "private" || canViewActor(subject, ctx.role, state)) &&
      (ctx.canControl(subject) || (!subject.hidden && !token.hidden && token.visible !== false)),
    );
  });
}
function disposition(ctx, actor) {
  const team =
    actor.combatProfile?.team ?? (["goblin-1", "goblin-2"].includes(actor.id) ? "watch" : null);
  if (team === "watch") return "hostile";
  return actor.kind === "character" || team === "party" ? "ally" : "neutral";
}
const WORDS = {
  hostile: L("Ostile", "Hostile"),
  ally: L("Alleato", "Ally"),
  neutral: L("Neutrale", "Neutral"),
};
/**
 * The inspector block shown when the map is hidden (Foundry Disable Game Canvas, FVT-190):
 * the creatures in the scene with their distance from the selected one (the same rule as
 * the Table's Distances list: straight line from the centre, elevation included), to
 * select one or, while an attack or spell is being prepared, to choose its target. The
 * map-only controls of other areas (find or centre a token, the distance ruler, the
 * token list that centres on double-click) are hidden with the map (preferences.css).
 */
export function sheetOnlyPanelHTML(ctx, tableView) {
  const scene = tableView?.scene ?? ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId);
  const selected = tableView?.selectedActorId;
  const tokens = observable(ctx, scene);
  const targeting = selected && hasCombatPreview(ctx, selected);
  const distances = new Map(
    (scene ? distanceRows(ctx.state, scene.id, selected, ctx.role) : []).map((row) => [
      row.actorId,
      row,
    ]),
  );
  // Metres to one decimal first, as the Distances list shows them, then this person's unit.
  const shown = (meters) => formatDistance(ctx, Math.round(meters * 10) / 10);
  const far = (row) =>
    row.touch
      ? t(ctx, "a contatto", "touching")
      : `${shown(row.meters)}${row.dz ? ` (${row.dz > 0 ? "↑" : "↓"} ${shown(Math.abs(row.dz))})` : ""}`;
  const rows = tokens
    .filter((token) => !targeting || token.actorId !== selected)
    .map((token) => {
      const actor = ctx.state.actors[token.actorId];
      const facts = [
        ctx.label(WORDS[disposition(ctx, actor)]),
        ctx.canControl(actor) ? `${t(ctx, "PF", "HP")} ${actor.hp}/${actor.maxHp}` : "",
        distances.has(actor.id) ? far(distances.get(actor.id)) : "",
      ].filter(Boolean);
      const button = targeting
        ? `<button type="button" class="button" data-pref-target="${esc(ctx, actor.id)}">${t(ctx, "Scegli", "Choose")} ${esc(ctx, actor.name)}</button>`
        : `<button type="button" class="button${actor.id === selected ? " active" : ""}" data-pref-select="${esc(ctx, actor.id)}" aria-pressed="${actor.id === selected}">${esc(ctx, actor.name)}</button>`;
      return `<li>${button}<span class="muted">${esc(ctx, facts.join(" · "))}</span></li>`;
    })
    .join("");
  const from = selected && distances.size ? ctx.state.actors[selected]?.name : "";
  return `<div class="pref-sheet-only" data-pref-sheet-only><p>${t(ctx, "La mappa non viene disegnata su questo dispositivo: scheda, creature e azioni restano qui. Per muovere le pedine mostra la mappa.", "The map is not drawn on this device: sheet, creatures and actions stay here. To move tokens, show the map.")}</p><button type="button" class="button" data-pref-show-map>${t(ctx, "Mostra la mappa", "Show the map")}</button><h4>${targeting ? t(ctx, "Scegli il bersaglio o il centro dell’area", "Choose the target or the area centre") : t(ctx, "Creature in scena", "Creatures in the scene")}</h4>${from ? `<p class="muted">${esc(ctx, t(ctx, `Distanze da ${from}: in linea retta dal centro, quota inclusa, come le gittate del Tavolo.`, `Distances from ${from}: straight line from the centre, elevation included, like Table ranges.`))}</p>` : ""}<ul class="pref-sheet-list">${rows}</ul></div>`;
}
function bindSheetOnly(el, ctx, table) {
  // First in the inspector in the page order too, so keyboard and screen-reader users meet
  // it first, as it is shown (not a visual-only reordering).
  const section = el.closest(".table-ext-panel");
  const inspector = section?.parentElement;
  if (inspector?.classList.contains("table-inspector") && inspector.firstElementChild !== section)
    inspector.prepend(section);
  el.querySelector("[data-pref-show-map]")?.addEventListener("click", () => {
    const selected = table?.selectedActorId;
    setSheetOnly(ctx, false);
    // The map is drawn again (device settings render at once): focus the selected token,
    // else the map, instead of leaving the focus on the removed button.
    const doc = globalThis.document;
    const token =
      selected &&
      doc?.querySelector(
        `#battle-map [data-actor="${globalThis.CSS?.escape?.(selected) ?? selected}"]`,
      );
    (token ?? doc?.querySelector("#battle-map"))?.focus();
  });
  el.querySelectorAll("[data-pref-select]").forEach((button) =>
    button.addEventListener("click", () => table?.select(button.dataset.prefSelect)),
  );
  el.querySelectorAll("[data-pref-target]").forEach((button) =>
    button.addEventListener("click", () => {
      const scene = table?.scene ?? ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId);
      const token = scene?.tokens.find((entry) => entry.actorId === button.dataset.prefTarget);
      const selected = table?.selectedActorId;
      if (!token || !selected) return;
      handleCombatMap(ctx, selected, "click", { x: token.x, y: token.y }, token.actorId);
    }),
  );
}

// Words above the tokens when chosen: colour and shape are never the only signal
// (Owlbear Ranges / Battle Board, VTL-243). Not interactive: it never takes the pointer.
export function mapWordsSVG(ctx, tableView) {
  return observable(ctx, tableView?.scene)
    .map((token) => {
      const actor = ctx.state.actors[token.actorId];
      const kind = disposition(ctx, actor);
      return `<text class="pref-map-word" data-disposition="${kind}" x="${token.x}" y="${token.y - 33}" text-anchor="middle">${esc(ctx, ctx.label(WORDS[kind]))}</text>`;
    })
    .join("");
}

// ---------------------------------------------------------------- notifications

export function collectNotifications(ctx) {
  const all = P.proposalsFor(slice(ctx.state), ctx.role);
  const count = (p) => Object.keys(p.values).length;
  const target = { page: PROPOSALS_ROUTE, params: {} };
  if (ctx.role === "dm")
    return all
      .filter((p) => p.from === ctx.role && ["accepted", "declined", "reverted"].includes(p.status))
      .map((p) => ({
        id: `preferences-answer-${p.id}-${p.status}`,
        title:
          p.status === "declined"
            ? L(
                "Il giocatore ha rifiutato le preferenze proposte",
                "The player declined the proposed preferences",
              )
            : p.status === "accepted"
              ? L(
                  "Il giocatore ha accettato le preferenze proposte",
                  "The player accepted the proposed preferences",
                )
              : L(
                  "Il giocatore ha annullato le preferenze accettate",
                  "The player undid the accepted preferences",
                ),
        body: L(
          playerLabel({ ...ctx, lang: "it" }, p.to),
          playerLabel({ ...ctx, lang: "en" }, p.to),
        ),
        time: p.respondedAt ?? p.createdAt,
        category: "preferences",
        target,
      }));
  return all
    .filter((p) => p.to === ctx.role && p.status === "pending")
    .map((p) => ({
      id: `preferences-proposal-${p.id}`,
      title: L("Il DM ti propone delle preferenze", "The DM proposes preferences to you"),
      body:
        count(p) === 1
          ? L(
              "1 preferenza proposta. Aprila per accettarla o rifiutarla.",
              "1 preference proposed. Open it to accept or decline it.",
            )
          : L(
              `${count(p)} preferenze proposte. Aprile per accettarle o rifiutarle.`,
              `${count(p)} preferences proposed. Open them to accept or decline them.`,
            ),
      time: p.createdAt,
      category: "preferences",
      target,
    }));
}

// ---------------------------------------------------------------- proposals page

// The page a proposal notification opens: the pending proposals with Accept and Decline
// for the player, the proposals sent and their answers for the DM, and the way to the
// full Preferences. The same blocks appear at the top of Preferences.
function answeredHTML(ctx) {
  const answered = P.proposalsFor(slice(ctx.state), ctx.role)
    .filter((p) => p.to === ctx.role && p.status !== "pending")
    .slice(-5)
    .reverse();
  if (!answered.length) return "";
  return `<section class="pref-answered" aria-labelledby="pref-answered-title"><h2 id="pref-answered-title">${t(ctx, "Proposte già decise", "Proposals already decided")}</h2><ul class="pref-sent">${answered
    .map(
      (p) =>
        `<li><span><strong>${esc(ctx, ctx.label(STATUS[p.status]))}</strong></span>${proposalValues(ctx, p)}</li>`,
    )
    .join("")}</ul></section>`;
}
export function renderProposalsPage(ctx) {
  const dm = ctx.role === "dm";
  const block = proposalsHTML(ctx);
  const empty = `<div class="empty-state"><p>${t(ctx, "Nessuna proposta del DM in attesa.", "No proposal from the DM is waiting.")}</p></div>`;
  return `<div class="page-heading"><div><h1 tabindex="-1" data-pref-page-title>${dm ? t(ctx, "Preferenze proposte ai giocatori", "Preferences proposed to players") : t(ctx, "Proposte di preferenze del DM", "Preference proposals from the DM")}</h1><p class="muted">${dm ? t(ctx, "Proponi aspetto, lettura, movimento e unità a un giocatore; lui decide. Qui vedi le risposte, mai le sue preferenze attuali.", "Propose appearance, reading, motion and units to a player; they decide. Here you see the answers, never their current preferences.") : t(ctx, "Il DM ti propone delle preferenze. Decidi tu: se accetti puoi tornare ai valori precedenti.", "The DM proposes preferences to you. You decide: if you accept you can go back to the previous values.")}</p></div></div><div class="pref-page" data-pref-proposals-slot>${block || empty}${dm ? "" : answeredHTML(ctx)}${undoHTML(ctx)}<p><button type="button" class="button" data-service="preferences">${t(ctx, "Apri tutte le preferenze", "Open all preferences")}</button></p></div>`;
}
function bindProposalsPage(el, ctx) {
  bindProposals(el, ctx);
  // Focus the heading once per arrival (a notification click removed the focused
  // button), never again when a commit redraws the page.
  if (runtime.focusedRoute !== ctx.role) {
    runtime.focusedRoute = ctx.role;
    el.querySelector("[data-pref-page-title]")?.focus({ preventScroll: true });
  }
}

/** Clears session-local state (undo snapshots, sound log): tests and role resets. */
export function resetPreferencesView() {
  runtime.undo = null;
  openForm = null;
  soundLog.length = 0;
}

// ---------------------------------------------------------------- registration

function listen(ctx) {
  runtime.ctx = ctx;
  if (runtime.listening || !hasDOM()) return;
  runtime.listening = true;
  // Styled tooltips with this person's delay, also by long press on touch (SV-22).
  installTooltips(document, {
    delay: () => {
      const value = runtime.ctx?.registry?.getSetting(runtime.ctx, P.KEYS.tooltipDelay);
      return typeof value === "number" ? value : -1;
    },
  });
  for (const query of ["(prefers-color-scheme: light)", "(prefers-reduced-motion: reduce)"])
    globalThis.matchMedia?.(query)?.addEventListener?.("change", () => {
      applyPreferences(runtime.ctx);
      refreshDialogNotes();
    });
  document.addEventListener("visibilitychange", () => applyPreferences(runtime.ctx));
  // Sheet-only: "Centra sulla mappa" in the token menu (B12) has no map to centre. It
  // still selects its creature; the creature's row in the sheet-only list takes the focus
  // and a notice says where it is (the list is this mode's view of the scene).
  document.addEventListener(
    "click",
    (event) => {
      if (document.documentElement.dataset.prefCanvas !== "off") return;
      if (!event.target.closest?.('[data-token-menu-item="token-menu-center"]')) return;
      globalThis.requestAnimationFrame?.(() => {
        const ctx = runtime.ctx;
        const row = document.querySelector(
          '[data-pref-sheet-only] [data-pref-select][aria-pressed="true"]',
        );
        if (!ctx || !row) return;
        row.focus();
        const name = row.textContent.trim();
        ctx.toast(
          t(
            ctx,
            `La mappa non è disegnata su questo dispositivo: nell’elenco è selezionata la creatura ${name}.`,
            `The map is not drawn on this device: ${name} is selected in the list.`,
          ),
        );
      });
    },
    true,
  );
  globalThis.addEventListener?.("resize", scheduleTableFit);
  // Stylesheets that load later (area styles) get the text and interface size too.
  document.addEventListener(
    "load",
    (event) => {
      if (runtime.scaling && event.target?.tagName === "LINK") scaleStyleSheets(document);
    },
    true,
  );
}

export function register(registry) {
  registry.registerStateSlice(P.PREFERENCES_SLICE, {
    version: P.PREFERENCES_VERSION,
    undo: "preserve",
    seed: P.seedSlice,
    normalize: (value, fromVersion) => P.normalizeSlice(value, fromVersion),
  });
  registry.registerStyles(new URL("./preferences.css", import.meta.url));
  for (const section of P.SECTIONS)
    registry.add("settings", {
      id: section.id,
      label: section.label,
      order: section.order,
      scope: section.scope,
      fields: section.fields,
    });

  // While the Preferences form shows an unsaved preview, the preview stays applied.
  const apply = (ctx) => {
    if (!ctx) return;
    listen(ctx);
    const previewing = openForm?.isConnected && openForm.dataset.prefDirty === "1";
    applyPreferences(ctx, previewing ? formOverrides(openForm) : null);
  };
  registry.on("navigate", (payload, { ctx }) => {
    if (ctx?.view?.page !== PROPOSALS_ROUTE) runtime.focusedRoute = null;
    apply(ctx);
  });
  registry.on("commit", (payload, { ctx }) => {
    apply(ctx);
    // A soft tick for your own changes (not for the dice, which have their own sound).
    if (!ctx || payload.controller !== ctx.role || !hasDOM()) return;
    clearTimeout(runtime.uiTimer);
    runtime.uiTimer = setTimeout(() => {
      if (Date.now() - runtime.diceAt < 400) return;
      playSound("ui", ctx.registry.getSetting(ctx, P.KEYS.uiVolume));
    }, 0);
  });
  registry.on("roll-accepted", (payload, { ctx }) => {
    const roll = payload?.roll;
    // Physical dice were heard at the table; a hidden roll is not heard by who cannot see it.
    if (!ctx || roll?.mode !== "digital" || !rollVisibleTo(roll, ctx.role)) return;
    if (Date.now() - runtime.diceAt < 250) return;
    runtime.diceAt = Date.now();
    playSound("dice", ctx.registry.getSetting(ctx, P.KEYS.diceVolume));
  });
  for (const event of ["role-changed", "language-changed", "reset"])
    registry.on(event, (payload, { ctx }) => {
      if (event !== "language-changed") runtime.undo = null;
      apply(ctx);
    });
  registry.on("preferences:dialog", (payload, { ctx }) => {
    apply(ctx);
    enhancePreferencesDialog(payload?.form, ctx);
  });

  registry.add("table-panel", {
    id: "preferences-sheet-only",
    label: L("Solo scheda", "Sheet only"),
    order: 5,
    when: (ctx) => ctx.registry.getSetting(ctx, P.KEYS.sheetOnly) === true,
    render: (ctx, tableView) => sheetOnlyPanelHTML(ctx, tableView),
    bind: (el, ctx, table) => bindSheetOnly(el, ctx, table),
  });
  registry.add("route", {
    id: PROPOSALS_ROUTE,
    label: L("Proposte di preferenze", "Preference proposals"),
    icon: "settings",
    render: (ctx) => renderProposalsPage(ctx),
    bind: (el, ctx) => bindProposalsPage(el, ctx),
  });
  registry.add("map-layer", {
    id: "preferences-map-words",
    label: L("Parole sulla mappa", "Words on the map"),
    order: 64,
    when: (ctx) => ctx.registry.getSetting(ctx, P.KEYS.mapWords) === true,
    svg: (ctx, tableView) => mapWordsSVG(ctx, tableView),
  });
  registry.add("notifications", {
    id: "preferences-proposals",
    label: L("Preferenze", "Preferences"),
    collect: (ctx) => collectNotifications(ctx),
  });
  for (const [id, label, description, field] of SETTING_COMMANDS)
    registry.add("command", {
      id: `preferences.${id}`,
      label,
      description,
      context: "global",
      group: "preferences",
      run: (ctx) => {
        // The notifications group may be missing (area not built): open Preferences anyway.
        if (!openPreferencesAt(ctx, field()) && id === "notifications")
          openPreferencesAt(ctx, "lang");
      },
    });
  registry.add("command", {
    id: "preferences.toggle-theme",
    label: L("Cambia tema: chiaro o scuro", "Switch theme: light or dark"),
    description: L(
      "tema, modalità scura, modalità chiara, dark mode",
      "theme, dark mode, light mode",
    ),
    context: "global",
    group: "preferences",
    run: (ctx) => {
      const dark = effectivePreferences(ctx).theme !== "light";
      ctx.registry.setSetting(ctx, P.KEYS.theme, dark ? "light" : "dark");
      applyPreferences(ctx);
      ctx.toast(
        dark
          ? t(ctx, "Tema chiaro su questo dispositivo.", "Light theme on this device.")
          : t(ctx, "Tema scuro su questo dispositivo.", "Dark theme on this device."),
      );
    },
  });
  registry.add("command", {
    id: "preferences.sheet-only",
    label: L("Attiva o disattiva la modalità solo scheda", "Turn sheet-only mode on or off"),
    context: "global",
    group: "preferences",
    run: (ctx) => {
      const next = ctx.registry.getSetting(ctx, P.KEYS.sheetOnly) !== true;
      setSheetOnly(ctx, next);
      ctx.toast(
        next
          ? t(
              ctx,
              "Modalità solo scheda attiva su questo dispositivo.",
              "Sheet-only mode on for this device.",
            )
          : t(ctx, "La mappa è di nuovo visibile.", "The map is visible again."),
      );
    },
  });
}
