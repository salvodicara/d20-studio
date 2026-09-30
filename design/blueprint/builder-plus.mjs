// B39 — Creation: quick paths, ready-made characters and checks (entry module + UI).
//
// Where it lives (B61 placement rule): no new header row. The three creation methods of
// D&D Beyond (DDB-009) appear at the top of the builder's Identity section for a new draft
// ("Crea personaggio" → method), and on the drafts list; the quick path, the ready-made
// characters and the shared drafts are sections of one area page (#builder-plus). Checks
// live inside the builder sections they belong to (seam in character-builder.mjs); level
// down, full rebuild and rule exceptions sit in the sheet's Features tab (Foundry dnd5e
// puts the class level there), the reopenable starting equipment in the Inventory tab
// (DDB "Starting Equipment"). Every change goes through the existing builder domain.

import {
  ID,
  COBUILD_ID,
  VERSION,
  STANDARD_ARRAY_SOURCE,
  RECOMMENDED,
  SOURCE_CATEGORIES,
  LEGACY_OPTIONS,
  LEGACY_SOURCE,
  HIGHER_LEVEL_SOURCE,
  MULTICLASS_SOURCE,
  PREMADE_SOURCE,
  PREMADES,
  QUICK_STEPS,
  COBUILD_FIELDS,
  arrayScores,
  abilityName,
  bandFor,
  claimPremade,
  cobuildOf,
  cobuildSessions,
  cobuildView,
  composeBuild,
  defaultOption,
  discardLocal,
  duplicateSkills,
  replaceDuplicate,
  editLocal,
  featEligibility,
  featRequirement,
  finishQuick,
  hiddenOptions,
  legacyAccess,
  legacyRecord,
  legacyRecords,
  levelDownPlan,
  applyLevelDown,
  logRoll,
  markSeen,
  multiclassRows,
  nameSuggestions,
  normalizeCobuild,
  normalizeSlice,
  planStarting,
  premadeBuild,
  premadeOf,
  previewStarting,
  applyStarting,
  publish,
  quickOf,
  quickSpec,
  recordStartingRoll,
  releaseDuplicates,
  resolveConflict,
  respecOf,
  restoreValue,
  ruleExceptions,
  allowException,
  removeException,
  scratchPreview,
  seedCobuild,
  seedSlice,
  skillName,
  sliceOf,
  startCobuild,
  startQuick,
  startRespec,
  startingBonusRoll,
  startingContext,
  startingOptions,
  startingRecord,
  transferToDraft,
  updateQuick,
  withdrawnFace,
  itemRow,
  closeCobuild,
  moveQuickToBuilder,
  scoresBefore,
} from "./builder-plus-domain.mjs";
import { registerBuilderPanel, startCharacterBuilder } from "./character-builder.mjs";
import { createCharacterDraft } from "./character-build.mjs";
import { getCharacterCatalog } from "./character-rules.mjs";
import { isCampaignActor } from "./character-access.mjs";
import { rollDie } from "./state.mjs";
import { formatNumber } from "./ui.mjs";
import { addAsset, mediaOf, setPortrait, visibleAssets } from "./media-domain.mjs";

let area = null;
const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  Date.now().toString(36) + Math.random().toString(36).slice(2);
const local = { local: true, visibility: "private" };
// Transient view state, per identity; never persisted (the choices themselves are).
const view = {
  detail: null,
  namePage: {},
  notice: null,
  pendingText: null,
  premadeFrom: null,
  operations: new Map(),
};
export function resetView() {
  view.detail = null;
  view.namePage = {};
  view.notice = null;
  view.pendingText = null;
  view.premadeFrom = null;
}
// The page document, when there is one (Node tests have none).
const $ = (selector) => globalThis.document?.querySelector?.(selector) ?? null;
const msg = (ctx, error) =>
  error?.it ? ctx.t(error.it, error.en) : ctx.label(error?.message ?? String(error ?? ""));
function attempt(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(msg(ctx, error), true);
    return null;
  }
}
const catalog = () => getCharacterCatalog();
const byId = (list, id) => (list ?? []).find((row) => row.id === id) ?? null;
const pages = (source, lang) => {
  const list = source?.[lang]?.pages ?? (lang === "en" ? source?.pages : null) ?? [];
  return list.length ? list.join("–") : "";
};
function sourceLine(ctx, source) {
  if (!source) return "";
  if (source.edition === "2014") return ctx.esc(LEGACY_SOURCE.label);
  if (source.kind === "authored-demo")
    return (
      ctx.t("Dati sintetici di d20 Studio", "d20 Studio synthetic data") +
      " · " +
      ctx.esc(source.revision)
    );
  const en = pages(source, "en"),
    it = pages(source, "it");
  return `SRD ${ctx.esc(source.revision ?? "5.2.1")}${en ? ` · EN ${ctx.esc(en)}` : ""}${it ? ` / IT ${ctx.esc(it)}` : ""}`;
}
const scopeFor = (ctx, actor) =>
  !actor || actor.visibility === "private" || !isCampaignActor(actor, ctx.state.campaign?.id)
    ? local
    : {};
const meters = (value, lang = "it") =>
  Number.isFinite(value) ? `${formatNumber(lang, value)} m` : "—";
// Language names as the catalogue stores them, with a capital first letter.
const capital = (value) => String(value ?? "").replace(/^./, (c) => c.toUpperCase());
const signed = (n) => (n >= 0 ? "+" + n : String(n));
const modOf = (score) => Math.floor((score - 10) / 2);

// ---------------------------------------------------------------- text saved on leaving a field
//
// A text field is saved when it loses focus, and a save redraws the page. Drawn between the
// press and the release of a button, the new page would swallow that click (and send the
// focus back to the field). So: pressing a clickable control holds the save until its click,
// whose handler saves the text first (a later save then finds nothing left); a select opens on
// the press itself, so the text is saved at once; after Tab or a press on another field the
// save runs once the focus has moved, and the focus is put back where it went. Each save
// carries the edit taken when the field was left: typing in the next field cannot replace it.

const CLICKABLE =
  "button, a, summary, label, input[type=radio], input[type=checkbox], [role=button]";
const press = { target: null, deferred: null, timer: 0, ctx: null, installed: false };
/** When a field left because of `target` (the pressed element, if any) saves its text. */
export function saveTiming(target, input) {
  if (!target || target === input) return "after-focus";
  if (target.tagName === "SELECT") return "now";
  return target.matches?.(CLICKABLE) ? "click" : "after-focus";
}
function trackPresses(ctx) {
  press.ctx = ctx;
  const doc = globalThis.document;
  if (press.installed || !doc?.addEventListener) return;
  press.installed = true;
  doc.addEventListener(
    "pointerdown",
    (event) => {
      // A save still held (a press released without a click) waits for this press instead.
      clearTimeout(press.timer);
      press.target = event.target?.closest?.(CLICKABLE + ", select, input, textarea") ?? null;
    },
    true,
  );
  // After the click's own handlers (or, with no click, a moment after the release).
  const settle = (delay) => {
    clearTimeout(press.timer);
    press.timer = setTimeout(() => {
      const edit = press.deferred;
      press.target = null;
      press.deferred = null;
      if (edit) savePending(press.ctx, edit);
    }, delay);
  };
  doc.addEventListener("click", () => settle(0), true);
  doc.addEventListener("pointerup", () => settle(700), true);
  doc.addEventListener("pointercancel", () => settle(0), true);
}
// Where the focus is, as a selector that finds the same control in the redrawn page.
function focusKey(node) {
  const doc = globalThis.document;
  if (!doc || !node?.isConnected || node === doc.body || !node.attributes) return null;
  const quote = (value) => `"${String(value).replace(/["\\]/g, "\\$&")}"`;
  if (node.id) return { selector: `[id=${quote(node.id)}]`, index: 0 };
  const attrs = [...node.attributes].filter(
    (a) =>
      a.name.startsWith("data-") ||
      a.name === "name" ||
      (a.name === "value" && node.type === "radio"),
  );
  if (!attrs.length) return null;
  const selector =
    node.tagName.toLowerCase() + attrs.map((a) => `[${a.name}=${quote(a.value)}]`).join("");
  return { selector, index: [...doc.querySelectorAll(selector)].indexOf(node) };
}
function refocus(key) {
  if (!key) return;
  const node = globalThis.document?.querySelectorAll(key.selector)[Math.max(0, key.index)];
  node?.focus?.();
  if (node && typeof node.setSelectionRange === "function" && node.type !== "radio")
    try {
      node.setSelectionRange(node.value.length, node.value.length);
    } catch {
      /* not a text control */
    }
}
const sameField = (a, b) =>
  Boolean(a && b) &&
  a.kind === b.kind &&
  a.draftId === b.draftId &&
  a.id === b.id &&
  a.field === b.field;
// Whether an edit (quick path name, shared-draft field) differs from what is saved.
function differs(ctx, edit) {
  if (!ctx || !edit) return false;
  if (edit.kind === "quick-name") {
    const row = quickOf(ctx.state, edit.draftId, ctx.role);
    return row?.status === "active" && row.name !== edit.value;
  }
  if (edit.kind === "cobuild")
    try {
      const f = cobuildView(ctx.state, edit.id, ctx.role).fields.find((x) => x.id === edit.field);
      return Boolean(f) && (f.mine ? f.mine.value : f.value) !== edit.value;
    } catch {
      return false;
    }
  return false;
}
const pendingChange = (ctx) => (differs(ctx, view.pendingText) ? view.pendingText : null);
/** Saves an edit (by default the text being written); true when it changed something. */
function savePending(ctx, edit = view.pendingText) {
  if (!edit) return false;
  if (sameField(view.pendingText, edit) && view.pendingText.value === edit.value)
    view.pendingText = null;
  if (sameField(press.deferred, edit)) press.deferred = null;
  if (!differs(ctx, edit)) return false;
  if (edit.kind === "quick-name")
    return (
      attempt(ctx, () =>
        ctx.commit(
          ctx.t("Percorso rapido: nome", "Quick path: name"),
          (draft) => updateQuick(draft, edit.draftId, ctx.role, { name: edit.value }),
          local,
        ),
      ) !== null
    );
  return (
    attempt(ctx, () =>
      ctx.commit(
        ctx.t("Bozza condivisa: modifica non pubblicata", "Shared draft: unpublished edit"),
        (draft) => editLocal(draft, edit.id, ctx.role, edit.field, edit.value),
        { local: true, visibility: "private", undoable: false },
      ),
    ) !== null
  );
}
/** Binds a text field: `describe(value)` names its edit for the save and the draft guard. */
function bindTextField(ctx, input, describe) {
  trackPresses(ctx);
  input.addEventListener("input", () => (view.pendingText = describe(input.value)));
  input.addEventListener("change", () => {
    const edit = describe(input.value);
    const timing = saveTiming(press.target, input);
    if (timing === "click") {
      press.deferred = edit;
      return;
    }
    if (timing === "now") {
      const key = focusKey(press.target);
      if (savePending(ctx, edit)) setTimeout(() => refocus(key), 0);
      return;
    }
    setTimeout(() => {
      const key = focusKey(globalThis.document?.activeElement);
      if (savePending(ctx, edit)) refocus(key);
    }, 0);
  });
}
// The value to draw in a field: the text still being written wins over the saved one.
const pendingValue = (match) => {
  const pending = view.pendingText;
  return pending && Object.entries(match).every(([k, v]) => pending[k] === v)
    ? pending.value
    : undefined;
};

// ---------------------------------------------------------------- emblems (art-forward cards)

const GLYPHS = {
  sword: "M14 50 L44 20 L48 16 L50 14 L48 22 L44 26 L14 56 Z M18 42 L26 50 M12 52 L16 56",
  shield: "M32 12 L48 18 V32 C48 42 41 49 32 52 C23 49 16 42 16 32 V18 Z",
  book: "M16 16 H30 C31 16 32 17 32 18 V50 C32 48 30 47 28 47 H16 Z M48 16 H34 C33 16 32 17 32 18 V50 C32 48 34 47 36 47 H48 Z",
  leaf: "M16 48 C16 26 30 16 48 16 C48 34 38 48 16 48 Z M16 48 L40 24",
  sun: "M32 22 A10 10 0 1 1 31.9 22 Z M32 10 V16 M32 48 V54 M10 32 H16 M48 32 H54 M17 17 L21 21 M43 43 L47 47 M17 47 L21 43 M43 21 L47 17",
  flame: "M32 54 C22 54 18 46 20 38 C22 30 30 28 28 18 C36 22 44 30 44 40 C44 48 40 54 32 54 Z",
  eye: "M12 32 C18 22 25 18 32 18 C39 18 46 22 52 32 C46 42 39 46 32 46 C25 46 18 42 12 32 Z M32 26 A6 6 0 1 1 31.9 26 Z",
  note: "M26 46 A6 6 0 1 1 25.9 46 Z M32 46 V16 L46 20 V28 L32 24",
  fist: "M20 30 H44 V44 C44 50 40 52 34 52 H26 C22 52 20 48 20 44 Z M24 30 V22 M30 30 V20 M36 30 V20 M42 30 V24",
  bow: "M20 12 C40 20 40 44 20 52 M20 12 V52 M16 32 H50 M44 28 L50 32 L44 36",
  mask: "M14 22 C22 18 42 18 50 22 C50 40 42 48 32 48 C22 48 14 40 14 22 Z M22 30 H28 M36 30 H42",
  axe: "M20 54 L42 22 M36 14 C46 14 52 22 50 30 L40 24 Z",
  mountain: "M10 50 L26 24 L34 36 L40 28 L54 50 Z",
  star: "M32 12 L37 26 L52 26 L40 35 L44 50 L32 41 L20 50 L24 35 L12 26 L27 26 Z",
};
const CLASS_ART = {
  barbarian: ["#8e3b2e", "axe"],
  bard: ["#6c3f86", "note"],
  cleric: ["#9b7a26", "sun"],
  druid: ["#3f6b3a", "leaf"],
  fighter: ["#3d5a78", "sword"],
  monk: ["#2f6d6b", "fist"],
  paladin: ["#8a6d2c", "shield"],
  ranger: ["#55632d", "bow"],
  rogue: ["#3b3f48", "mask"],
  sorcerer: ["#a2522a", "flame"],
  warlock: ["#5a2f6e", "eye"],
  wizard: ["#2d4f8f", "book"],
  acolyte: ["#8f7a3a", "sun"],
  criminal: ["#3b3f48", "mask"],
  sage: ["#2d4f8f", "book"],
  soldier: ["#6b3b32", "shield"],
};
const artOf = (id) => CLASS_ART[id] ?? ["#46605f", "mountain"];
export function emblem(id, { size = 64, letter = "", art = null } = {}) {
  const [hue, glyph] = art ?? artOf(id);
  const gid = `bp-g-${id}`;
  return `<svg class="bp-emblem" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" focusable="false"><defs><radialGradient id="${gid}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="${hue}"/><stop offset="1" stop-color="#111" stop-opacity=".85"/></radialGradient></defs><circle cx="32" cy="32" r="30" fill="url(#${gid})" stroke="rgba(240,233,216,.55)" stroke-width="1.5"/>${letter ? `<text x="32" y="41" text-anchor="middle" font-size="26" font-family="Georgia, serif" fill="#f7efdc">${letter}</text>` : `<path d="${GLYPHS[glyph]}" fill="none" stroke="#f7efdc" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`}</svg>`;
}
// Portrait emblems for the portrait picker: drawn once on a canvas as a real PNG portrait.
export const PORTRAIT_EMBLEMS = [
  ["emblem-steel", "#3d5a78", "sword", "Acciaio", "Steel"],
  ["emblem-ember", "#a2522a", "flame", "Brace", "Ember"],
  ["emblem-grove", "#3f6b3a", "leaf", "Bosco", "Grove"],
  ["emblem-dawn", "#9b7a26", "sun", "Alba", "Dawn"],
  ["emblem-arcane", "#2d4f8f", "star", "Arcano", "Arcane"],
  ["emblem-shadow", "#3b3f48", "mask", "Ombra", "Shadow"],
  ["emblem-dusk", "#5a2f6e", "eye", "Crepuscolo", "Dusk"],
  ["emblem-stone", "#6b5a44", "mountain", "Pietra", "Stone"],
];
function portraitSvg(emblemId, letter = "") {
  const row = PORTRAIT_EMBLEMS.find((entry) => entry[0] === emblemId) ?? PORTRAIT_EMBLEMS[0];
  return emblem(emblemId, { size: 72, letter, art: [row[1], row[2]] });
}
/** A 128×128 PNG of an emblem with the character's initial (browser only). */
export function emblemPng(emblemId, name) {
  const row = PORTRAIT_EMBLEMS.find((entry) => entry[0] === emblemId) ?? PORTRAIT_EMBLEMS[0];
  const canvas = globalThis.document?.createElement?.("canvas");
  const g = canvas?.getContext?.("2d");
  if (!g) return null;
  canvas.width = canvas.height = 128;
  const gradient = g.createRadialGradient(44, 38, 6, 64, 64, 70);
  gradient.addColorStop(0, "#f0e3c4");
  gradient.addColorStop(0.35, row[1]);
  gradient.addColorStop(1, "#101418");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  g.save();
  g.translate(32, 18);
  g.globalAlpha = 0.35;
  g.strokeStyle = "#f7efdc";
  g.lineWidth = 3;
  g.stroke(new Path2D(GLYPHS[row[2]]));
  g.restore();
  g.fillStyle = "#f7efdc";
  g.font = "bold 58px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(
    String(name || "?")
      .trim()
      .slice(0, 1)
      .toUpperCase() || "?",
    64,
    70,
  );
  return canvas.toDataURL("image/png");
}

// ---------------------------------------------------------------- method chooser (DDB-009)

function methodCards(ctx, { draftId = null, current = false } = {}) {
  const card = (id, title, body, action, extra = "") =>
    `<article class="bp-method" data-bp-method="${id}"><div class="bp-method-art">${emblem(id === "standard" ? "wizard" : id === "quick" ? "fighter" : id === "premade" ? "cleric" : "bard")}</div><div><h3>${title}</h3><p>${body}</p>${extra}</div>${action}</article>`;
  return `<div class="bp-methods">${card(
    "standard",
    ctx.t("Passo per passo", "Step by step"),
    ctx.t(
      "Ogni scelta a mano, con fonti, controlli e tiri: la costruzione completa.",
      "Every choice by hand, with sources, checks and rolls: the full build.",
    ),
    current
      ? `<span class="badge bp-current">${ctx.t("Stai usando questo metodo", "You are using this method")}</span>`
      : `<button type="button" class="button" data-bp-go="standard">${ctx.t("Inizia passo per passo", "Start step by step")}</button>`,
  )}${card(
    "quick",
    ctx.t("Percorso rapido", "Quick path"),
    ctx.t(
      "Livello 1: classe, background e specie con le loro pagine, poi nome e ritratto. Il resto segue i consigli della SRD e resta modificabile.",
      "Level 1: class, background and species with their pages, then name and portrait. The rest follows the SRD’s suggestions and stays editable.",
    ),
    `<button type="button" class="button primary" data-bp-go="quick" ${draftId ? `data-draft="${ctx.esc(draftId)}"` : ""}>${ctx.t("Percorso rapido", "Quick path")}</button>`,
  )}${card(
    "premade",
    ctx.t("Personaggio pronto", "Ready-made character"),
    ctx.t(
      "Scegli un personaggio già costruito, guardalo in anteprima e reclamane una copia tutta tua.",
      "Pick a character already built, preview it and claim a copy of your own.",
    ),
    `<button type="button" class="button" data-bp-go="premade" ${draftId ? `data-draft="${ctx.esc(draftId)}"` : ""}>${ctx.t("Personaggi pronti", "Ready-made characters")}</button>`,
  )}</div>`;
}
function bindMethods(el, ctx) {
  el.querySelectorAll("[data-bp-go]").forEach((button) => {
    button.onclick = () => {
      const target = button.dataset.bpGo;
      const draftId = button.dataset.draft || null;
      if (target === "standard") return startCharacterBuilder(ctx, { kind: "create" });
      if (target === "premade") {
        view.premadeFrom = draftId;
        return ctx.navigate(ID, { tab: "premade" });
      }
      if (target === "quick") return openQuick(ctx, draftId);
    };
  });
}
function openQuick(ctx, draftId) {
  attempt(ctx, () => {
    let id = draftId;
    if (!id) {
      id = uid();
      ctx.commit(
        ctx.t("Bozza personaggio iniziata", "Character draft started"),
        (draft) => {
          createDraftFor(draft, id, ctx.role);
          startQuick(draft, id, ctx.role);
        },
        local,
      );
    } else if (!quickOf(ctx.state, id, ctx.role))
      ctx.commit(
        ctx.t("Percorso rapido iniziato", "Quick path started"),
        (draft) => startQuick(draft, id, ctx.role),
        local,
      );
    view.detail = null;
    ctx.navigate(ID, { tab: "quick", id });
  });
}
const createDraftFor = (state, id, role) =>
  createCharacterDraft(state, { id, kind: "create" }, role);

// ---------------------------------------------------------------- quick path (DDB-010, BG3 CRP-010)

const STEP_NAMES = {
  class: ["Classe", "Class"],
  background: ["Background", "Background"],
  species: ["Specie", "Species"],
  identity: ["Nome e ritratto", "Name and portrait"],
  review: ["Riepilogo", "Review"],
};
function classFacts(ctx, cls) {
  return `d${cls.hitDie} · ${cls.primaryAbilities.map((id) => ctx.esc(ctx.label(abilityName(id)))).join(cls.primaryMode === "any" ? ctx.t(" o ", " or ") : " + ")}`;
}
function renderQuick(ctx) {
  const draftId = ctx.view.id;
  const row = draftId ? quickOf(ctx.state, draftId, ctx.role) : null;
  const draft = (ctx.state.characterDrafts ?? []).find(
    (d) => d.id === draftId && d.owner === ctx.role,
  );
  if (!row || row.status !== "active" || draft?.status !== "active") {
    const done = row?.status === "done" && row.actorId && ctx.state.actors[row.actorId];
    return `<section class="bp-page"><div class="page-heading"><div><h1>${ctx.t("Percorso rapido", "Quick path")}</h1><p class="muted">${done ? ctx.t("Questo percorso ha già creato il personaggio.", "This path already created the character.") : ctx.t("Nessun percorso rapido aperto con questa bozza.", "No quick path is open with this draft.")}</p></div></div>${done ? `<button type="button" class="button primary" data-bp-open-sheet="${ctx.esc(row.actorId)}">${ctx.t("Apri la scheda", "Open the sheet")}</button>` : `<button type="button" class="button primary" data-bp-go="quick">${ctx.t("Inizia un percorso rapido", "Start a quick path")}</button>`}</section>`;
  }
  const step = row.step;
  const index = QUICK_STEPS.indexOf(step);
  const reachable = (id) =>
    ({
      class: true,
      background: !!row.classId,
      species: !!row.backgroundId,
      identity: !!row.speciesId,
      review: !!row.speciesId,
    })[id];
  // BG3 / Roll20 Charactermancer: each done step keeps its choice in view (a resumed
  // draft shows the class chosen at step 1).
  const cat = catalog();
  const chosen = {
    class: byId(cat.classes, row.classId)?.name,
    background: byId(cat.backgrounds, row.backgroundId)?.name,
    species: byId(cat.species, row.speciesId)?.name,
  };
  const steps = `<ol class="bp-steps" aria-label="${ctx.t("Passi del percorso rapido", "Quick path steps")}">${QUICK_STEPS.map(
    (id, i) =>
      `<li><button type="button" class="bp-step${id === step ? " is-current" : i < index ? " is-done" : ""}" data-bp-step="${id}" ${id === step ? 'aria-current="step"' : ""} ${reachable(id) ? "" : 'disabled aria-describedby="bp-steps-why"'}><span class="bp-step-n">${i + 1}</span><span>${ctx.t(...STEP_NAMES[id])}${chosen[id] ? `<small class="bp-step-choice" data-bp-step-choice="${id}">${ctx.esc(ctx.label(chosen[id]))}</small>` : ""}</span></button></li>`,
  ).join(
    "",
  )}</ol>${QUICK_STEPS.some((id) => !reachable(id)) ? `<p class="visually-hidden" id="bp-steps-why">${ctx.t("I passi successivi si aprono dopo aver scelto quello corrente.", "The next steps open once you choose the current one.")}</p>` : ""}`;
  let body = "";
  if (step === "class")
    body =
      view.detail?.kind === "class"
        ? classDetail(ctx, row, view.detail.id)
        : pickGrid(ctx, row, "class");
  else if (step === "background")
    body =
      view.detail?.kind === "background"
        ? backgroundDetail(ctx, row, view.detail.id)
        : pickGrid(ctx, row, "background");
  else if (step === "species")
    body =
      view.detail?.kind === "species"
        ? speciesDetail(ctx, row, view.detail.id)
        : pickGrid(ctx, row, "species");
  else if (step === "identity") body = identityStep(ctx, row);
  else body = reviewStep(ctx, row);
  return `<section class="bp-page bp-quick" data-bp-quick="${ctx.esc(draftId)}"><div class="page-heading"><div><p class="muted">${ctx.t("Nuovo personaggio · bozza privata · livello 1", "New character · private draft · level 1")}</p><h1>${ctx.t("Percorso rapido", "Quick path")}</h1></div><div class="toolbar"><button type="button" class="button quiet" data-bp-to-builder>${ctx.t("Passa al passo per passo", "Switch to step by step")}</button><button type="button" class="button quiet" data-bp-exit>${ctx.t("Esci (la bozza resta)", "Leave (the draft stays)")}</button></div></div>${steps}<div class="bp-quick-body">${body}</div></section>`;
}
function pickGrid(ctx, row, kind) {
  const cat = catalog();
  const list =
    kind === "class" ? cat.classes : kind === "background" ? cat.backgrounds : cat.species;
  const selected =
    row[kind === "class" ? "classId" : kind === "background" ? "backgroundId" : "speciesId"];
  const title = {
    class: ["Scegli una classe", "Choose a class"],
    background: ["Scegli un background", "Choose a background"],
    species: ["Scegli una specie", "Choose a species"],
  }[kind];
  const facts = (entry) =>
    kind === "class"
      ? classFacts(ctx, entry)
      : kind === "background"
        ? entry.abilities.map((id) => ctx.esc(ctx.label(abilityName(id)))).join(" · ")
        : `${ctx.t("Velocità", "Speed")} ${meters(entry.speed, ctx.lang)}`;
  const hidden = kind === "species" ? hiddenOptions({ sources: {} }, "origin").length : 0;
  return `<h2 tabindex="-1">${ctx.t(...title)}</h2><p class="muted">${ctx.t("Apri una carta per leggere la sua pagina, poi sceglila.", "Open a card to read its page, then choose it.")}</p><div class="bp-grid">${list
    .map(
      (entry) =>
        `<button type="button" class="bp-card${entry.id === selected ? " is-selected" : ""}" data-bp-detail="${kind}:${ctx.esc(entry.id)}" aria-label="${ctx.esc(ctx.label(entry.name))}${entry.id === selected ? ctx.t(" (scelta attuale)", " (current choice)") : ""}">${emblem(kind === "species" ? entry.id : entry.id, { letter: kind === "species" ? ctx.esc(ctx.label(entry.name).slice(0, 1)) : "" })}<strong>${ctx.esc(ctx.label(entry.name))}</strong><small>${facts(entry)}</small>${entry.id === selected ? `<span class="badge">${ctx.t("Scelta", "Chosen")}</span>` : ""}</button>`,
    )
    .join(
      "",
    )}</div>${hidden ? `<p class="bp-hidden-note">${ctx.t(`${hidden} opzioni nascoste: fonte Legacy 2014 disattivata. Il percorso rapido usa solo le regole 2024.`, `${hidden} options hidden: the Legacy 2014 source is off. The quick path uses the 2024 rules only.`)}</p>` : ""}`;
}
function detailFrame(ctx, kind, entry, factsHtml, extra = "") {
  const back = {
    class: ["Tutte le classi", "All classes"],
    background: ["Tutti i background", "All backgrounds"],
    species: ["Tutte le specie", "All species"],
  }[kind];
  return `<article class="bp-detail" aria-labelledby="bp-detail-title"><button type="button" class="button quiet bp-back" data-bp-detail-close>← ${ctx.t(...back)}</button><header class="bp-detail-head">${emblem(entry.id, { size: 96, letter: kind === "species" ? ctx.esc(ctx.label(entry.name).slice(0, 1)) : "" })}<div><p class="muted">${ctx.t(...{ class: ["Classe", "Class"], background: ["Background", "Background"], species: ["Specie", "Species"] }[kind])}</p><h2 id="bp-detail-title" tabindex="-1">${ctx.esc(ctx.label(entry.name))}</h2><p class="bp-source">${sourceLine(ctx, entry.source)}</p></div></header><dl class="bp-facts">${factsHtml}</dl>${extra}<div class="bp-detail-actions"><button type="button" class="button primary" data-bp-choose="${kind}:${ctx.esc(entry.id)}">${ctx.t("Scegli", "Choose")} ${ctx.esc(ctx.label(entry.name))}</button></div></article>`;
}
const fact = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
function equipmentFact(ctx, group) {
  if (!group) return "—";
  return `<ul class="bp-options">${group.options
    .map(
      (option) =>
        `<li><strong>(${option.id})</strong> ${option.items.length ? option.items.map(([slug, q]) => ctx.esc((q > 1 ? q + " × " : "") + itemName(ctx, slug))).join(", ") + (option.gp ? `, ${option.gp} ${ctx.t("mo", "gp")}` : "") : `${option.gp} ${ctx.t("mo", "gp")}`}</li>`,
    )
    .join(
      "",
    )}</ul>${group.missing ? `<p class="muted">${ctx.t("Pacchetto di oggetti non ancora catalogato qui: puoi prendere l’oro e registrare gli oggetti a mano.", "Item package not catalogued here yet: take the gold and record items by hand.")}</p>` : ""}`;
}
const itemNames = new Map();
function itemName(ctx, slug) {
  if (!itemNames.has(slug)) itemNames.set(slug, itemRow(slug, 1, "name").name);
  return ctx.label(itemNames.get(slug));
}
function classDetail(ctx, row, id) {
  const cls = byId(catalog().classes, id);
  if (!cls) return pickGrid(ctx, row, "class");
  const array = arrayScores(cls.id);
  const rec = RECOMMENDED[cls.id];
  const recText = [
    rec?.fightingStyle ? ctx.t("Stile di combattimento: Difesa", "Fighting Style: Defense") : null,
    rec?.cantrips?.length
      ? ctx.t("Trucchetti: ", "Cantrips: ") +
        rec.cantrips.map((s) => ctx.esc(ctx.label(byId(catalog().spells, s)?.name ?? s))).join(", ")
      : null,
    rec?.spells?.length
      ? ctx.t("Incantesimi: ", "Spells: ") +
        rec.spells.map((s) => ctx.esc(ctx.label(byId(catalog().spells, s)?.name ?? s))).join(", ")
      : null,
    rec?.expertise
      ? ctx.t("Maestria: ", "Expertise: ") +
        rec.expertise.map((s) => ctx.esc(ctx.label(skillName(s)))).join(", ")
      : null,
  ].filter(Boolean);
  const facts =
    fact(ctx.t("Dado Vita", "Hit Die"), `d${cls.hitDie}`) +
    fact(
      ctx.t("Caratteristica primaria", "Primary ability"),
      cls.primaryAbilities
        .map((a) => ctx.esc(ctx.label(abilityName(a))))
        .join(cls.primaryMode === "any" ? ctx.t(" o ", " or ") : " + "),
    ) +
    fact(
      ctx.t("Tiri salvezza", "Saving throws"),
      cls.savingThrows.map((a) => ctx.esc(ctx.label(abilityName(a)))).join(", "),
    ) +
    fact(
      ctx.t("Abilità", "Skills"),
      `${ctx.t("Scegli", "Choose")} ${cls.skillCount}: ${cls.skills.map((s) => ctx.esc(ctx.label(skillName(s)))).join(", ")}`,
    ) +
    fact(
      ctx.t("Privilegi di 1° livello", "Level 1 features"),
      cls.features.map((f) => ctx.esc(ctx.label(f.name))).join(", "),
    ) +
    fact(
      ctx.t("Serie standard consigliata", "Suggested standard array"),
      `${Object.entries(array)
        .map(([a, v]) => `${ctx.esc(ctx.label(abilityName(a)).slice(0, 3))} ${v}`)
        .join(" · ")} <span class="bp-source">${sourceLine(ctx, STANDARD_ARRAY_SOURCE)}</span>`,
    ) +
    (recText.length
      ? fact(
          ctx.t("Consigliati dalla SRD", "Recommended by the SRD"),
          `${recText.join(" · ")} <span class="bp-source">${sourceLine(ctx, rec.src)}</span>`,
        )
      : "") +
    fact(
      ctx.t("Dotazione iniziale", "Starting equipment"),
      equipmentFact(ctx, startingOptions(cls.id, "soldier").class),
    );
  return detailFrame(ctx, "class", cls, facts);
}
function backgroundDetail(ctx, row, id) {
  const bg = byId(catalog().backgrounds, id);
  if (!bg) return pickGrid(ctx, row, "background");
  const feat = byId(catalog().feats, bg.featId);
  const facts =
    fact(
      ctx.t("Punteggi di caratteristica", "Ability scores"),
      `${bg.abilities.map((a) => ctx.esc(ctx.label(abilityName(a)))).join(", ")} · ${ctx.t("+2 e +1, oppure +1 a tutte e tre", "+2 and +1, or +1 to all three")}`,
    ) +
    fact(ctx.t("Talento", "Feat"), ctx.esc(ctx.label(feat?.name ?? bg.featId))) +
    fact(
      ctx.t("Abilità", "Skills"),
      bg.skills.map((s) => ctx.esc(ctx.label(skillName(s)))).join(", "),
    ) +
    fact(
      ctx.t("Dotazione", "Equipment"),
      equipmentFact(ctx, startingOptions(row.classId ?? "fighter", bg.id).background),
    );
  return detailFrame(ctx, "background", bg, facts);
}
function speciesDetail(ctx, row, id) {
  const race = byId(catalog().species, id);
  if (!race) return pickGrid(ctx, row, "species");
  const chosen = row.speciesId === race.id ? (row.speciesChoices ?? {}) : {};
  const defaults = composeDefaults(race.id, row);
  const selects = (race.choices ?? [])
    .map((choice) => {
      const value = chosen[choice.id] ?? defaults[choice.id] ?? "";
      return `<label class="field">${ctx.esc(ctx.label(choice.name))}<select data-bp-species-choice="${ctx.esc(choice.id)}">${choice.options.map((o) => `<option value="${ctx.esc(o.id)}" ${o.id === value ? "selected" : ""}>${ctx.esc(ctx.label(o.name))}</option>`).join("")}</select></label>`;
    })
    .join("");
  const facts =
    fact(
      ctx.t("Taglia", "Size"),
      ctx.esc(
        {
          medium: ctx.t("Media", "Medium"),
          small: ctx.t("Piccola", "Small"),
          choice: ctx.t("Piccola o Media, a scelta", "Small or Medium, your choice"),
        }[race.size] ?? race.size,
      ),
    ) +
    fact(ctx.t("Velocità", "Speed"), meters(race.speed, ctx.lang)) +
    fact(
      ctx.t("Tratti", "Traits"),
      race.features.map((f) => ctx.esc(ctx.label(f.name))).join(", "),
    );
  return detailFrame(
    ctx,
    "species",
    race,
    facts,
    selects
      ? `<fieldset class="bp-choices"><legend>${ctx.t("Scelte della specie", "Species choices")}</legend><p class="muted">${ctx.t("Proposte dall’app; cambiale qui o più tardi nel builder.", "Proposed by the app; change them here or later in the builder.")}</p><div class="form-grid">${selects}</div></fieldset>`
      : "",
  );
}
function composeDefaults(speciesId, row) {
  try {
    const { data } = composeBuild({
      ...quickSpec({
        ...row,
        speciesId,
        speciesChoices: row.speciesId === speciesId ? row.speciesChoices : {},
      }),
      classes: [{ classId: row.classId ?? "fighter", level: 1 }],
      backgroundId: row.backgroundId ?? "soldier",
    });
    return data.origin.choices;
  } catch {
    return {};
  }
}
function identityStep(ctx, row) {
  const names = nameSuggestions(row.speciesId, row.namePage ?? 0);
  const assets = mediaOf(ctx.state)
    ? visibleAssets(ctx.state, ctx.role, { use: "portrait" }).filter((a) => a.kind === "image")
    : [];
  const current = row.portrait;
  const letter = ctx.esc(
    String(row.name || "?")
      .slice(0, 1)
      .toUpperCase(),
  );
  const option = (value, art, label, checked) =>
    `<label class="bp-portrait${checked ? " is-selected" : ""}"><input type="radio" name="bp-portrait" value="${ctx.esc(value)}" ${checked ? "checked" : ""}><span class="bp-portrait-art">${art}</span><span class="bp-portrait-label">${label}</span></label>`;
  return `<h2 tabindex="-1">${ctx.t("Nome e ritratto", "Name and portrait")}</h2><form class="bp-identity" data-bp-identity><label class="field">${ctx.t("Nome del personaggio", "Character name")}<input name="name" maxlength="100" value="${ctx.esc(pendingValue({ kind: "quick-name", draftId: ctx.view.id }) ?? row.name ?? "")}" data-bp-name autocomplete="off"></label><section class="bp-names" aria-labelledby="bp-names-title"><h3 id="bp-names-title">${ctx.t("Nomi suggeriti", "Suggested names")}</h3><p class="muted">${ctx.t("Tocca un nome per usarlo: il nome attuale cambia solo quando lo scegli.", "Tap a name to use it: the current name changes only when you pick one.")}</p><div class="bp-name-list">${names.map((name) => `<button type="button" class="bp-chip" data-bp-name-pick="${ctx.esc(name)}">${ctx.esc(name)}</button>`).join("")}</div><button type="button" class="button quiet" data-bp-names-more>${ctx.t("Suggerisci altri", "Suggest more")}</button></section><fieldset class="bp-portraits"><legend>${ctx.t("Ritratto", "Portrait")}</legend><div class="bp-portrait-grid">${option("none", `<span class="bp-letter">${letter}</span>`, ctx.t("Solo l’iniziale", "Initial only"), !current)}${PORTRAIT_EMBLEMS.map(([id, , , it, en]) => option("emblem:" + id, portraitSvg(id, letter), ctx.t("Emblema " + it, en + " emblem"), current?.kind === "emblem" && current.id === id)).join("")}${assets.map((asset) => option("asset:" + asset.id, `<img src="${ctx.esc(asset.dataUrl)}" alt="">`, ctx.esc(asset.name), current?.kind === "asset" && current.assetId === asset.id)).join("")}</div><p class="muted">${ctx.t("Il ritratto va nella tua libreria delle immagini e compare nell’elenco dei personaggi e sulla pedina.", "The portrait goes into your image library and shows in the character list and on the token.")}</p></fieldset><div class="bp-detail-actions"><button type="button" class="button" data-bp-step="species">${ctx.t("Indietro", "Back")}</button><button type="submit" class="button primary">${ctx.t("Continua al riepilogo", "Continue to review")}</button></div></form>`;
}
function reviewStep(ctx, row) {
  let built, preview;
  try {
    built = composeBuild(quickSpec(row));
    preview = scratchPreview(built.data, ctx.role);
  } catch (error) {
    return `<p class="error">${ctx.esc(msg(ctx, error))}</p>`;
  }
  const cat = catalog();
  const p = preview.proposed ?? {};
  const cls = byId(cat.classes, row.classId),
    bg = byId(cat.backgrounds, row.backgroundId),
    race = byId(cat.species, row.speciesId);
  const base = arrayScores(row.classId);
  const bonuses = built.data.origin.backgroundBonuses;
  const abilities = Object.keys(base)
    .map(
      (id) =>
        `<tr><th scope="row">${ctx.esc(ctx.label(abilityName(id)))}</th><td>${base[id]}</td><td>${bonuses[id] ? "+" + bonuses[id] : "—"}</td><td><strong>${p.abilities?.[id] ?? "—"}</strong> (${signed(modOf(p.abilities?.[id] ?? 10))})</td></tr>`,
    )
    .join("");
  const featureNames = built.data.features.selected
    .map((s) =>
      ctx.label(
        byId(cat.feats, s.id)?.name ??
          preview.choices?.grants
            ?.find((g) => g.id === s.grantId)
            ?.options?.find((o) => o.id === s.id)?.name ??
          s.id,
      ),
    )
    .map((n) => ctx.esc(n));
  const spellNames = built.data.spells.selected.map((s) =>
    ctx.esc(ctx.label(byId(cat.spells, s.id)?.name ?? s.id)),
  );
  const warnings = (preview.warnings ?? []).filter((w) => w.code !== "manual-feature-resolution");
  const equipment = built.data.equipment;
  const srd = built.picks.filter((pick) => pick.from === "srd").length;
  const portrait =
    row.portrait?.kind === "emblem"
      ? portraitSvg(
          row.portrait.id,
          ctx.esc(
            String(row.name || "?")
              .slice(0, 1)
              .toUpperCase(),
          ),
        )
      : row.portrait?.kind === "asset"
        ? `<img class="bp-review-img" src="${ctx.esc(visibleAssets(ctx.state, ctx.role, { use: "portrait" }).find((a) => a.id === row.portrait.assetId)?.dataUrl ?? "")}" alt="">`
        : `<span class="bp-letter">${ctx.esc(
            String(row.name || "?")
              .slice(0, 1)
              .toUpperCase(),
          )}</span>`;
  return `<h2 tabindex="-1">${ctx.t("Riepilogo", "Review")}</h2><div class="bp-review-head">${portrait}<div><h3>${ctx.esc(row.name?.trim() || ctx.t("Personaggio senza nome", "Unnamed character"))}</h3><p>${ctx.esc(ctx.label(cls?.name))} 1 · ${ctx.esc(ctx.label(race?.name))} · ${ctx.esc(ctx.label(bg?.name))}</p><p class="muted">${srdPicks(ctx, srd)} ${ctx.t("Le altre sono proposte dall’app. Tutto resta modificabile con «Rivedi scelte».", "The others are proposed by the app. Everything stays editable with “Revise choices”.")}</p></div></div><dl class="bp-stats">${fact(ctx.t("PF", "HP"), p.maxHp ?? "—")}${fact(ctx.t("CA", "AC"), p.ac ?? "—")}${fact(ctx.t("Velocità", "Speed"), meters(p.speed, ctx.lang))}${fact(ctx.t("Competenza", "Proficiency"), "+" + (p.proficiencyBonus ?? 2))}</dl><div class="table-wrap"><table class="bp-table"><caption>${ctx.t("Caratteristiche: serie standard consigliata dalla SRD per la classe, poi il background", "Abilities: the SRD’s suggested standard array for the class, then the background")} <span class="bp-source">${sourceLine(ctx, STANDARD_ARRAY_SOURCE)}</span></caption><thead><tr><th scope="col">${ctx.t("Caratteristica", "Ability")}</th><th scope="col">${ctx.t("Serie", "Array")}</th><th scope="col">${ctx.t("Background", "Background")}</th><th scope="col">${ctx.t("Totale", "Total")}</th></tr></thead><tbody>${abilities}</tbody></table></div><dl class="bp-facts">${fact(ctx.t("Abilità", "Skills"), (p.skills ?? []).map((s) => ctx.esc(ctx.label(skillName(s)))).join(", "))}${fact(ctx.t("Lingue", "Languages"), (p.languages ?? []).map((l) => ctx.esc(capital(ctx.label(byId(cat.languages, l)?.name ?? l)))).join(", "))}${featureNames.length ? fact(ctx.t("Scelte di capacità e talenti", "Feature and feat choices"), featureNames.join(", ")) : ""}${spellNames.length ? fact(ctx.t("Magie", "Spells"), spellNames.join(", ")) : ""}${fact(
    ctx.t("Dotazione", "Equipment"),
    `${ctx.t("Classe", "Class")} (${ctx.esc(equipment.starting.classOption)}) · ${ctx.t("Background", "Background")} (${ctx.esc(equipment.starting.backgroundOption)}) · ${equipment.items.length} ${ctx.t("oggetti", "items")} · ${equipment.currency.gp} ${ctx.t("mo", "gp")} <button type="button" class="button quiet" data-bp-quick-equipment>${ctx.t("Cambia dotazione…", "Change equipment…")}</button><br><span class="muted">${ctx.t("Nessun oggetto viene equipaggiato: lo decidi dalla scheda.", "No item is equipped: you decide that from the sheet.")}</span>`,
  )}</dl>${warnings.length ? `<section class="bp-warnings"><h3>${ctx.t("Aspetti da verificare", "Aspects to verify")}</h3><ul>${warnings.map((w) => `<li>${ctx.esc(ctx.t(w.it, w.en))}</li>`).join("")}</ul></section>` : ""}${preview.errors?.length ? `<p class="error" id="bp-create-why">${ctx.esc(ctx.t(preview.errors[0].it, preview.errors[0].en))}</p>` : preview.canApply ? "" : `<p class="error" id="bp-create-why">${ctx.t("Il riepilogo non è ancora completo: torna al passo segnato.", "The review is not complete yet: go back to the marked step.")}</p>`}<form class="bp-create" data-bp-create>${preview.incomplete ? `<label class="builder-check"><input type="checkbox" name="confirm" required> ${ctx.t("Confermo la scheda con gli aspetti da verificare elencati sopra.", "I confirm the sheet with the aspects to verify listed above.")}</label>` : ""}<div class="bp-detail-actions"><button type="button" class="button" data-bp-step="identity">${ctx.t("Indietro", "Back")}</button><button type="button" class="button quiet" data-bp-quick-standard>${ctx.t("Modifica nel passo per passo", "Edit step by step")}</button><button type="submit" class="button primary" ${preview.canApply ? "" : `disabled aria-describedby="bp-create-why"`}>${ctx.t("Crea personaggio", "Create character")}</button></div></form>`;
}
function quickCommit(ctx, label, patch) {
  return attempt(ctx, () =>
    ctx.commit(label, (draft) => updateQuick(draft, ctx.view.id, ctx.role, patch), local),
  );
}
function bindQuick(el, ctx) {
  const draftId = ctx.view.id;
  // The current step stays in view in the sideways step strip (phone).
  const strip = el.querySelector(".bp-steps");
  const current = el.querySelector('.bp-step[aria-current="step"]');
  if (strip && current && strip.scrollWidth > strip.clientWidth)
    strip.scrollLeft = Math.max(0, current.parentElement.offsetLeft - 16);
  el.querySelectorAll("[data-bp-step]").forEach(
    (button) =>
      (button.onclick = () => {
        const nameInput = el.querySelector("[data-bp-name]");
        view.detail = null;
        const patch = { step: button.dataset.bpStep };
        if (nameInput && nameInput.value !== (quickOf(ctx.state, draftId, ctx.role)?.name ?? ""))
          patch.name = nameInput.value;
        view.pendingText = null;
        quickCommit(ctx, ctx.t("Percorso rapido: passo", "Quick path: step"), patch);
        $(".bp-quick-body h2")?.focus?.();
      }),
  );
  el.querySelectorAll("[data-bp-detail]").forEach(
    (button) =>
      (button.onclick = () => {
        const [kind, id] = button.dataset.bpDetail.split(":");
        view.detail = { kind, id };
        ctx.render();
        $("#bp-detail-title")?.focus();
      }),
  );
  el.querySelector("[data-bp-detail-close]")?.addEventListener("click", () => {
    const back = view.detail;
    view.detail = null;
    ctx.render();
    $(`[data-bp-detail="${back?.kind}:${back?.id}"]`)?.focus();
  });
  el.querySelector("[data-bp-choose]")?.addEventListener("click", (event) => {
    const [kind, id] = event.currentTarget.dataset.bpChoose.split(":");
    const next = { class: "background", background: "species", species: "identity" }[kind];
    const patch = {
      [kind === "class" ? "classId" : kind === "background" ? "backgroundId" : "speciesId"]: id,
      step: next,
    };
    if (kind === "species") {
      const choices = {};
      el.querySelectorAll("[data-bp-species-choice]").forEach(
        (select) => (choices[select.dataset.bpSpeciesChoice] = select.value),
      );
      patch.speciesChoices = choices;
    }
    view.detail = null;
    quickCommit(ctx, ctx.t("Percorso rapido: scelta", "Quick path: choice"), patch);
    $(".bp-quick-body h2")?.focus?.();
  });
  const nameInput = el.querySelector("[data-bp-name]");
  if (nameInput) bindTextField(ctx, nameInput, (value) => ({ kind: "quick-name", draftId, value }));
  el.querySelectorAll("[data-bp-name-pick]").forEach(
    (button) =>
      (button.onclick = () => {
        view.pendingText = null;
        quickCommit(ctx, ctx.t("Percorso rapido: nome suggerito", "Quick path: suggested name"), {
          name: button.dataset.bpNamePick,
        });
        $("[data-bp-name]")?.focus();
      }),
  );
  el.querySelector("[data-bp-names-more]")?.addEventListener("click", () => {
    const row = quickOf(ctx.state, draftId, ctx.role);
    const patch = { namePage: (row?.namePage ?? 0) + 1 };
    if (nameInput && nameInput.value !== row?.name) patch.name = nameInput.value;
    view.pendingText = null;
    quickCommit(ctx, ctx.t("Percorso rapido: altri nomi", "Quick path: more names"), patch);
    $("[data-bp-names-more]")?.focus();
  });
  el.querySelectorAll('input[name="bp-portrait"]').forEach(
    (radio) =>
      (radio.onchange = () => {
        const value = radio.value;
        const row = quickOf(ctx.state, draftId, ctx.role);
        const name = nameInput?.value ?? row?.name ?? "";
        let portrait = null;
        if (value.startsWith("emblem:"))
          portrait = {
            kind: "emblem",
            id: value.slice(7),
            dataUrl: emblemPng(value.slice(7), name),
          };
        else if (value.startsWith("asset:")) portrait = { kind: "asset", assetId: value.slice(6) };
        view.pendingText = null;
        quickCommit(ctx, ctx.t("Percorso rapido: ritratto", "Quick path: portrait"), {
          portrait,
          ...(name !== row?.name ? { name } : {}),
        });
        $(`input[name="bp-portrait"][value="${value.replace(/["\\]/g, "")}"]`)?.focus();
      }),
  );
  el.querySelector("[data-bp-identity]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    view.pendingText = null;
    quickCommit(ctx, ctx.t("Percorso rapido: riepilogo", "Quick path: review"), {
      name: nameInput.value,
      step: "review",
    });
    $(".bp-quick-body h2")?.focus?.();
  });
  el.querySelector("[data-bp-quick-equipment]")?.addEventListener("click", () => {
    const row = quickOf(ctx.state, draftId, ctx.role);
    const built = composeBuild(quickSpec(row));
    openChooser(ctx, {
      mode: "quick",
      classId: row.classId,
      backgroundId: row.backgroundId,
      level: 1,
      current: row.equipment ?? {
        classOption: built.data.equipment.starting.classOption,
        backgroundOption: built.data.equipment.starting.backgroundOption,
      },
      onApply: (choice) =>
        quickCommit(ctx, ctx.t("Percorso rapido: dotazione", "Quick path: equipment"), {
          equipment: choice,
        }),
    });
  });
  el.querySelector("[data-bp-create]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const allowIncomplete = Boolean(event.currentTarget.querySelector('[name="confirm"]')?.checked);
    finishQuickCommand(ctx, draftId, allowIncomplete);
  });
  // Both "switch" controls hand the choices made so far to the full builder (DDB).
  const toBuilder = () =>
    attempt(ctx, () => {
      let section = "class";
      const name = nameInput?.value;
      ctx.commit(
        ctx.t("Percorso rapido portato nel builder", "Quick path moved to the builder"),
        (draft) => {
          if (name !== undefined) updateQuick(draft, draftId, ctx.role, { name });
          section = moveQuickToBuilder(draft, draftId, ctx.role);
        },
        local,
      );
      view.pendingText = null;
      ctx.navigate("builder", { id: draftId, tab: section });
    });
  el.querySelector("[data-bp-quick-standard]")?.addEventListener("click", toBuilder);
  el.querySelector("[data-bp-to-builder]")?.addEventListener("click", toBuilder);
  el.querySelector("[data-bp-exit]")?.addEventListener("click", () => ctx.navigate("characters"));
  el.querySelector("[data-bp-open-sheet]")?.addEventListener("click", (event) =>
    ctx.navigate("characters", { id: event.currentTarget.dataset.bpOpenSheet, tab: "actions" }),
  );
  el.querySelectorAll("[data-bp-go]").forEach(
    (button) => (button.onclick = () => openQuick(ctx, null)),
  );
}
function finishQuickCommand(ctx, draftId, allowIncomplete) {
  attempt(ctx, () => {
    const key = "quick:" + draftId;
    const operationId = view.operations.get(key) ?? uid();
    view.operations.set(key, operationId);
    let actorId = null;
    const row = quickOf(ctx.state, draftId, ctx.role);
    ctx.commit(
      ctx.t("Personaggio creato con il percorso rapido", "Character created with the quick path"),
      (draft) => {
        actorId = finishQuick(draft, draftId, ctx.role, { operationId, allowIncomplete });
        applyPortrait(draft, ctx.role, actorId, row.portrait, row.name, emblemLabel(ctx, row));
        // The image now lives in the media library (or as the emblem id): no second copy.
        if (row.portrait?.dataUrl) delete sliceOf(draft).quick[draftId].portrait.dataUrl;
      },
      local,
    );
    view.operations.delete(key);
    ctx.navigate("characters", { id: actorId, tab: "actions" });
    ctx.toast(
      ctx.t(
        "Personaggio creato. Puoi cambiare ogni scelta con «Rivedi scelte».",
        "Character created. You can change every choice with “Revise choices”.",
      ),
    );
  });
}
// "Emblema Acciaio" / "Steel emblem": the portrait's name in the image library.
function emblemLabel(ctx, row) {
  const emblemRow = PORTRAIT_EMBLEMS.find((entry) => entry[0] === row?.portrait?.id);
  return emblemRow ? ctx.t("Emblema " + emblemRow[3], emblemRow[4] + " emblem") : "";
}
function applyPortrait(state, role, actorId, portrait, name, label = "") {
  if (!portrait) return;
  if (!mediaOf(state)) {
    state.ext[ID].origins[actorId].emblem = portrait.kind === "emblem" ? portrait.id : null;
    return;
  }
  if (portrait.kind === "asset") return setPortrait(state, role, actorId, portrait.assetId);
  if (portrait.kind === "emblem" && portrait.dataUrl) {
    const assetId = addAsset(state, role, {
      name: `${name || "?"} — ${label || portrait.id}`,
      fileName: `${portrait.id}.png`,
      dataUrl: portrait.dataUrl,
      width: 128,
      height: 128,
      use: "portrait",
      tags: ["ritratto", "percorso-rapido"],
    });
    setPortrait(state, role, actorId, assetId);
  }
}

// ---------------------------------------------------------------- ready-made characters

function renderPremades(ctx) {
  const id = ctx.view.id;
  if (id && premadeOf(id)) return premadePreview(ctx, id);
  return `<section class="bp-page"><div class="page-heading"><div><p class="muted">${ctx.t("Nuovo personaggio", "New character")}</p><h1>${ctx.t("Personaggi pronti", "Ready-made characters")}</h1><p class="muted">${ctx.t("Costruiti con le regole 2024: guardali in anteprima e reclamane una copia personale, privata e modificabile.", "Built with the 2024 rules: preview them and claim a personal, private, editable copy.")}</p></div><div class="toolbar"><button type="button" class="button quiet" data-bp-nav="characters">← ${ctx.t("Personaggi", "Characters")}</button></div></div><div class="bp-premades">${PREMADES.map(
    (premade) => {
      const { preview } = premadeBuild(premade.id, ctx.lang);
      const p = preview.proposed;
      return `<article class="bp-premade" aria-labelledby="bp-pm-${premade.id}">${emblem(premade.spec.classes[0].classId, { size: 72 })}<div><h2 id="bp-pm-${premade.id}">${ctx.esc(premade.name)}</h2><p>${ctx.esc(ctx.label(premade.tagline))}</p><p class="muted">${ctx.esc(ctx.label(p.className))} · ${ctx.t("livello", "level")} ${p.level} · ${ctx.t("PF", "HP")} ${p.maxHp} · ${ctx.t("CA", "AC")} ${p.ac}</p></div><div class="bp-premade-actions"><button type="button" class="button" data-bp-premade="${premade.id}">${ctx.t("Anteprima", "Preview")}</button><button type="button" class="button primary" data-bp-claim="${premade.id}">${ctx.t("Reclama", "Claim")}</button></div></article>`;
    },
  ).join(
    "",
  )}</div><p class="bp-source">${sourceLine(ctx, PREMADE_SOURCE)} · ${ctx.t("non sono personaggi ufficiali", "not official characters")}</p></section>`;
}
function premadePreview(ctx, id) {
  const { premade, data, preview, picks } = premadeBuild(id, ctx.lang);
  const p = preview.proposed ?? {};
  const cat = catalog();
  const race = byId(cat.species, data.origin.speciesId),
    bg = byId(cat.backgrounds, data.origin.backgroundId);
  const multi = data.classes.length > 1 ? multiclassRows(p.abilities, data.classes) : [];
  const warnings = (preview.warnings ?? []).filter((w) => w.code !== "manual-feature-resolution");
  return `<section class="bp-page bp-premade-page"><div class="page-heading"><div><p class="muted">${ctx.t("Anteprima · personaggio pronto", "Preview · ready-made character")}</p><h1 tabindex="-1" data-bp-focus>${ctx.esc(premade.name)}</h1><p>${ctx.esc(ctx.label(premade.tagline))}</p></div><div class="toolbar"><button type="button" class="button quiet" data-bp-premades>← ${ctx.t("Tutti i personaggi pronti", "All ready-made characters")}</button><button type="button" class="button primary" data-bp-claim="${premade.id}">${ctx.t("Reclama personaggio", "Claim character")}</button></div></div><div class="bp-review-head">${emblem(premade.spec.classes[0].classId, { size: 96 })}<div><h2>${ctx.esc(ctx.label(p.className))}</h2><p>${ctx.esc(ctx.label(race?.name))} · ${ctx.esc(ctx.label(bg?.name))} · ${ctx.t("livello", "level")} ${p.level}</p><p class="bp-source">${sourceLine(ctx, PREMADE_SOURCE)} · ${ctx.t("revisione", "revision")} ${premade.revision}</p></div></div><dl class="bp-stats">${fact(ctx.t("PF", "HP"), p.maxHp)}${fact(ctx.t("CA", "AC"), p.ac)}${fact(ctx.t("Velocità", "Speed"), meters(p.speed, ctx.lang))}${fact(ctx.t("Competenza", "Proficiency"), "+" + p.proficiencyBonus)}</dl><dl class="bp-facts">${fact(
    ctx.t("Caratteristiche", "Abilities"),
    Object.entries(p.abilities ?? {})
      .map(([a, v]) => `${ctx.esc(ctx.label(abilityName(a)).slice(0, 3))} ${v}`)
      .join(" · "),
  )}${fact(ctx.t("Abilità", "Skills"), (p.skills ?? []).map((s) => ctx.esc(ctx.label(skillName(s)))).join(", "))}${fact(ctx.t("Privilegi e talenti", "Features and feats"), (p.features ?? []).map((f) => ctx.esc(ctx.label(f.name))).join(", "))}${p.spells?.length ? fact(ctx.t("Magie", "Spells"), p.spells.map((s) => ctx.esc(ctx.label(s.name)) + (s.prepared && s.level ? "*" : "")).join(", ") + ` <span class="muted">(* ${ctx.t("preparata", "prepared")})</span>`) : ""}${fact(ctx.t("Dotazione", "Equipment"), `${(p.inventory ?? []).map((i) => ctx.esc((i.quantity > 1 ? i.quantity + " × " : "") + ctx.label(i.name))).join(", ")} · ${p.currency?.gp ?? 0} ${ctx.t("mo", "gp")}`)}${fact(ctx.t("Storia", "Story"), ctx.esc(p.story?.backstory ?? ""))}</dl>${multi.length ? multiclassTable(ctx, multi) : ""}${warnings.length ? `<section class="bp-warnings"><h3>${ctx.t("Aspetti da verificare", "Aspects to verify")}</h3><ul>${warnings.map((w) => `<li>${ctx.esc(ctx.t(w.it, w.en))}</li>`).join("")}</ul></section>` : ""}<p class="muted">${srdPicks(ctx, picks.filter((x) => x.from === "srd").length)} ${ctx.t("Reclamare crea una scheda privata tua: il personaggio pronto non cambia e si può reclamare di nuovo.", "Claiming creates a private sheet of yours: the ready-made character does not change and can be claimed again.")}</p></section>`;
}
const srdPicks = (ctx, n) =>
  n === 1
    ? ctx.t(
        "1 scelta segue un consiglio stampato nella SRD.",
        "1 choice follows a recommendation printed in the SRD.",
      )
    : ctx.t(
        `${n} scelte seguono i consigli stampati nella SRD.`,
        `${n} choices follow the recommendations printed in the SRD.`,
      );
function multiclassTable(ctx, rows) {
  return `<section class="bp-multiclass" aria-labelledby="bp-mc-title"><h3 id="bp-mc-title">${ctx.t("Requisiti del multiclasse", "Multiclass prerequisites")}</h3><div class="table-wrap"><table class="bp-table"><thead><tr><th scope="col">${ctx.t("Classe", "Class")}</th><th scope="col">${ctx.t("Richiede", "Requires")}</th><th scope="col">${ctx.t("Valori attuali", "Current values")}</th><th scope="col">${ctx.t("Esito", "Result")}</th></tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr class="${row.ok ? "is-ok" : "is-blocked"}"><th scope="row">${ctx.esc(ctx.label(row.name))} ${row.level}</th><td>${ctx.esc(ctx.label(row.requirement))}</td><td>${row.values.map(([a, v]) => `${ctx.esc(ctx.label(abilityName(a)))} ${v ?? "?"}`).join(" · ")}</td><td>${row.ok ? `✓ ${ctx.t("Soddisfatto", "Met")}` : `✗ ${ctx.t("Bloccato", "Blocked")}`}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table></div><p class="bp-source">${ctx.t("Serve almeno 13 nella caratteristica primaria di ogni classe, attuale e nuova. La deroga ai talenti non vale qui.", "Every class, current and new, needs at least 13 in its primary ability. The feat override does not apply here.")} ${sourceLine(ctx, MULTICLASS_SOURCE)}</p></section>`;
}
function bindPremades(el, ctx) {
  el.querySelectorAll("[data-bp-premade]").forEach(
    (button) =>
      (button.onclick = () => ctx.navigate(ID, { tab: "premade", id: button.dataset.bpPremade })),
  );
  el.querySelector("[data-bp-premades]")?.addEventListener("click", () =>
    ctx.navigate(ID, { tab: "premade" }),
  );
  el.querySelectorAll("[data-bp-claim]").forEach(
    (button) => (button.onclick = () => openClaim(ctx, button.dataset.bpClaim)),
  );
  el.querySelector("[data-bp-focus]")?.focus?.({ preventScroll: true });
}
function openClaim(ctx, premadeId) {
  const { premade, preview } = premadeBuild(premadeId, ctx.lang);
  const warnings = (preview.warnings ?? []).filter((w) => w.code !== "manual-feature-resolution");
  ctx.dialog(
    ctx.t(`Reclamare ${premade.name}?`, `Claim ${premade.name}?`),
    `<p>${ctx.t("Diventa una tua scheda privata, fuori dalle campagne: potrai collegarla alla campagna dalla scheda. Il personaggio pronto resta disponibile.", "It becomes a private sheet of yours, outside campaigns: you can connect it to the campaign from the sheet. The ready-made character stays available.")}</p>${warnings.length ? `<ul class="bp-warnings">${warnings.map((w) => `<li>${ctx.esc(ctx.t(w.it, w.en))}</li>`).join("")}</ul><label class="builder-check"><input type="checkbox" name="confirm" required> ${ctx.t("Ho visto gli aspetti da verificare.", "I saw the aspects to verify.")}</label>` : ""}`,
    {
      submitLabel: ctx.t("Reclama personaggio", "Claim character"),
      onSubmit: (form) => {
        const allowIncomplete = form.has("confirm");
        const operationId = uid();
        let actorId = null;
        ctx.commit(
          ctx.t(
            `Personaggio pronto reclamato: ${premade.name}`,
            `Ready-made character claimed: ${premade.name}`,
          ),
          (draft) => {
            actorId = claimPremade(draft, premadeId, ctx.role, {
              operationId,
              allowIncomplete,
              discardDraftId: view.premadeFrom,
              lang: ctx.lang,
            });
          },
          local,
        );
        view.premadeFrom = null;
        ctx.navigate("characters", { id: actorId, tab: "actions" });
        ctx.toast(
          ctx.t(
            `${premade.name} è tuo: la copia è privata e modificabile.`,
            `${premade.name} is yours: the copy is private and editable.`,
          ),
        );
      },
    },
  );
}

// ---------------------------------------------------------------- co-building (VTL-022)

function roleName(ctx, role) {
  return role === "dm" ? "DM" : ctx.t("Giocatore", "Player");
}
// "del DM" / "dal giocatore" and "the DM" / "the player", for sentences about the other identity.
function byRole(ctx, role, kind) {
  if (ctx.lang === "en") return role === "dm" ? "the DM" : "the player";
  return kind === "of"
    ? role === "dm"
      ? "del DM"
      : "del giocatore"
    : role === "dm"
      ? "dal DM"
      : "dal giocatore";
}
function time(ctx, iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(ctx.lang === "en" ? "en-GB" : "it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
function renderCobuild(ctx) {
  const id = ctx.view.id;
  const sessions = cobuildSessions(ctx.state, ctx.role, { includeClosed: true });
  if (!id || !sessions.some((row) => row.id === id))
    return `<section class="bp-page"><div class="page-heading"><div><h1>${ctx.t("Bozze condivise", "Shared drafts")}</h1><p class="muted">${ctx.t("Personaggi che il giocatore e il DM costruiscono insieme: ognuno vede dove sta scrivendo l’altro e i conflitti si risolvono in modo esplicito.", "Characters the player and the DM build together: each sees where the other is writing, and conflicts are resolved explicitly.")}</p></div></div>${
      sessions.length
        ? `<div class="bp-sessions">${sessions
            .map((row) => {
              const v = cobuildView(ctx.state, row.id, ctx.role);
              return `<article class="builder-draft-row"><div><h2>${ctx.esc(v.fields.find((f) => f.id === "name")?.value || ctx.t("Personaggio senza nome", "Unnamed character"))}</h2><p class="muted">${row.status === "closed" ? `<span class="badge">${ctx.t("Chiusa", "Closed")}</span> ` : ""}${ctx.t("Avviata da", "Started by")} ${roleName(ctx, row.owner)}${v.unseen > 0 ? ` · <strong>${v.unseen} ${ctx.t("novità", "updates")}</strong>` : ""}</p></div><button type="button" class="button" data-bp-cobuild-open="${ctx.esc(row.id)}" aria-label="${ctx.t("Apri", "Open")} ${ctx.esc(v.fields.find((f) => f.id === "name")?.value || ctx.t("Personaggio senza nome", "Unnamed character"))}">${ctx.t("Apri", "Open")}</button></article>`;
            })
            .join("")}</div>`
        : `<p class="empty-state">${ctx.t("Nessuna bozza condivisa. Si avvia dalla sezione Identità di una bozza del builder con «Costruisci con il DM».", "No shared draft. Start one from a builder draft’s Identity section with “Build with the DM”.")}</p>`
    }</section>`;
  const v = cobuildView(ctx.state, id, ctx.role);
  const conflicts = v.conflicts
    .map((c) => {
      const def = COBUILD_FIELDS.find((f) => f.id === c.field);
      const show = (value) => ctx.esc(selectLabel(ctx, def, value) || "—");
      return `<li class="bp-conflict" data-bp-conflict="${ctx.esc(c.field)}"><strong>${ctx.esc(ctx.label(def.label))}</strong><div class="bp-conflict-grid"><div><span class="muted">${ctx.t("La tua versione", "Your version")}</span><p>${show(c.mine)}</p></div><div><span class="muted">${ctx.t("Versione", "Version by")} ${byRole(ctx, c.theirsBy, "of")} · rev ${c.theirsRev}</span><p>${show(c.theirs)}</p></div></div><div class="toolbar"><button type="button" class="button primary" data-bp-resolve="mine" data-field="${ctx.esc(c.field)}">${ctx.t("Tieni la mia", "Keep mine")}</button><button type="button" class="button" data-bp-resolve="theirs" data-field="${ctx.esc(c.field)}">${ctx.t("Usa la versione", "Use the version by")} ${byRole(ctx, c.theirsBy, "of")}</button></div></li>`;
    })
    .join("");
  const readOnly = v.status !== "open" ? ' disabled aria-describedby="bp-cobuild-closed"' : "";
  const field = (f) => {
    const value =
      pendingValue({ kind: "cobuild", id, field: f.id }) ?? (f.mine ? f.mine.value : f.value);
    const input =
      f.kind === "select"
        ? `<select data-bp-field="${f.id}" id="bp-f-${f.id}"${readOnly}><option value="">${ctx.t("Da decidere", "To decide")}</option>${f
            .options()
            .map(
              (o) =>
                `<option value="${ctx.esc(o.id)}" ${o.id === value ? "selected" : ""}>${ctx.esc(ctx.label(o.name))}</option>`,
            )
            .join("")}</select>`
        : f.kind === "textarea"
          ? `<textarea data-bp-field="${f.id}" id="bp-f-${f.id}" rows="3" maxlength="${f.max}"${readOnly}>${ctx.esc(value)}</textarea>`
          : `<input data-bp-field="${f.id}" id="bp-f-${f.id}" maxlength="${f.max}" value="${ctx.esc(value)}" autocomplete="off"${readOnly}>`;
    return `<div class="bp-cofield${f.presence ? ` has-presence has-presence-${f.presence.role}` : ""}${f.mine ? " has-mine" : ""}" data-bp-cofield="${f.id}"><div class="bp-cofield-head"><label for="bp-f-${f.id}">${ctx.esc(ctx.label(f.label))}</label>${f.presence ? `<span class="bp-presence" role="status"><span class="bp-dot bp-dot-${f.presence.role}" aria-hidden="true"></span>${ctx.t(f.presence.role === "dm" ? "Il DM sta modificando qui" : "Il giocatore sta modificando qui", f.presence.role === "dm" ? "The DM is editing here" : "The player is editing here")}</span>` : ""}</div>${input}<p class="bp-cofield-meta">${f.rev ? `rev ${f.rev} · ${roleName(ctx, f.by)} · ${time(ctx, f.at)}` : ctx.t("valore iniziale", "initial value")}${f.mine ? ` · <strong>${ctx.t("non pubblicato", "not published")}</strong>${f.stale ? ` · <span class="bp-stale">${ctx.t("cambiato", "changed")} ${byRole(ctx, v.other, "by")} ${ctx.t("dopo la tua modifica", "after your edit")}</span>` : ""}${readOnly ? "" : ` <button type="button" class="text-button" data-bp-discard="${f.id}">${ctx.t("Scarta", "Discard")}</button>`}` : ""}</p></div>`;
  };
  const history = v.history
    .slice(0, 12)
    .map((h) => {
      const def = COBUILD_FIELDS.find((f) => f.id === h.field);
      const kind =
        {
          edit: "",
          restore: ctx.t(" · ripristino", " · restore"),
          "kept-mine": ctx.t(" · conflitto risolto", " · conflict resolved"),
        }[h.kind] ?? "";
      return `<li><span>rev ${h.rev} · <strong>${ctx.esc(ctx.label(def?.label ?? h.field))}</strong>: «${ctx.esc(selectLabel(ctx, def, h.value) || "—")}» · ${roleName(ctx, h.by)} · ${time(ctx, h.at)}${kind}</span>${v.status === "open" ? `<button type="button" class="text-button" data-bp-restore="${ctx.esc(h.id)}">${ctx.t("Ripristina il valore precedente", "Restore the previous value")}</button>` : ""}</li>`;
    })
    .join("");
  return `<section class="bp-page bp-cobuild" data-bp-cobuild="${ctx.esc(id)}"><div class="page-heading"><div><p class="muted">${ctx.t("Bozza condivisa", "Shared draft")} · ${ctx.t("avviata da", "started by")} ${roleName(ctx, v.owner)}</p><h1>${ctx.esc(v.fields.find((f) => f.id === "name")?.value || ctx.t("Personaggio senza nome", "Unnamed character"))}</h1><p class="muted">${ctx.t("Giocatore e DM vedono e modificano questi campi. Le modifiche restano tue finché non le pubblichi; gli Appunti Solo io e le bozze private restano privati.", "The player and the DM see and edit these fields. Edits stay yours until you publish them; Only me notes and private drafts stay private.")}</p></div><div class="toolbar"><button type="button" class="button quiet" data-bp-cobuild-list>← ${ctx.t("Bozze condivise", "Shared drafts")}</button></div></div><p class="bp-members"><span class="bp-dot bp-dot-${ctx.role}" aria-hidden="true"></span>${ctx.t("Tu", "You")} (${roleName(ctx, ctx.role)}) · <span class="bp-dot bp-dot-${v.other}" aria-hidden="true"></span>${roleName(ctx, v.other)}</p>${conflicts ? `<section class="bp-conflicts" aria-labelledby="bp-conflicts-title"><h2 id="bp-conflicts-title">${ctx.t("Conflitti da risolvere", "Conflicts to resolve")}</h2><ul>${conflicts}</ul></section>` : ""}${v.status !== "open" ? `<p class="bp-hidden-note" id="bp-cobuild-closed">${ctx.t("Bozza condivisa chiusa: solo lettura. Per cambiare ancora, aprine una nuova da «Bozze condivise».", "Shared draft closed: read only. To change it again, open a new one from “Shared drafts”.")}</p>` : ""}<form class="bp-coform" data-bp-coform>${v.fields.map(field).join("")}<div class="bp-detail-actions">${v.status === "open" ? `<button type="submit" class="button primary" data-bp-publish>${ctx.t("Pubblica modifiche", "Publish changes")}${v.pending ? ` (${v.pending})` : ""}</button>` : ""}${v.isOwner && v.status === "open" ? `<button type="button" class="button" data-bp-transfer>${ctx.t("Porta nella mia bozza del builder", "Bring into my builder draft")}</button><button type="button" class="button quiet" data-bp-close>${ctx.t("Chiudi la bozza condivisa", "Close the shared draft")}</button>` : ""}</div></form>${history ? `<details class="bp-history" open><summary>${ctx.t("Cronologia", "History")} (${v.history.length})</summary><ul>${history}</ul></details>` : ""}</section>`;
}
function selectLabel(ctx, def, value) {
  if (def?.kind !== "select") return value;
  const option = def.options().find((o) => o.id === value);
  return option ? ctx.label(option.name) : value;
}
function cobuildCommit(ctx, label, mutate, { localOnly = false } = {}) {
  return attempt(ctx, () =>
    ctx.commit(
      label,
      mutate,
      localOnly ? { local: true, visibility: "private", undoable: false } : { undoable: false },
    ),
  );
}
function bindCobuild(el, ctx) {
  el.querySelectorAll("[data-bp-cobuild-open]").forEach(
    (button) =>
      (button.onclick = () =>
        ctx.navigate(ID, { tab: "cobuild", id: button.dataset.bpCobuildOpen })),
  );
  el.querySelector("[data-bp-cobuild-list]")?.addEventListener("click", () =>
    ctx.navigate(ID, { tab: "cobuild" }),
  );
  const id = el.querySelector("[data-bp-cobuild]")?.dataset.bpCobuild;
  if (!id) return;
  el.querySelectorAll("[data-bp-field]").forEach((input) => {
    const field = input.dataset.bpField;
    if (input.tagName !== "SELECT")
      return bindTextField(ctx, input, (value) => ({ kind: "cobuild", id, field, value }));
    input.addEventListener("change", () => {
      const v = cobuildView(ctx.state, id, ctx.role).fields.find((f) => f.id === field);
      if (input.value === (v.mine ? v.mine.value : v.value)) return;
      cobuildCommit(
        ctx,
        ctx.t("Bozza condivisa: modifica non pubblicata", "Shared draft: unpublished edit"),
        (draft) => editLocal(draft, id, ctx.role, field, input.value),
        { localOnly: true },
      );
      $("#" + input.id)?.focus?.();
    });
  });
  el.querySelector("[data-bp-coform]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    // The text still in a field is part of what gets published (saved first: kept offline).
    savePending(ctx);
    let result = null;
    cobuildCommit(
      ctx,
      ctx.t("Bozza condivisa: modifiche pubblicate", "Shared draft: changes published"),
      (draft) => {
        result = publish(draft, id, ctx.role);
      },
    );
    if (result?.conflicts?.length)
      ctx.toast(
        result.conflicts.length === 1
          ? ctx.t(
              "1 campo in conflitto: scegli quale versione tenere.",
              "1 field in conflict: choose which version to keep.",
            )
          : ctx.t(
              `${result.conflicts.length} campi in conflitto: scegli quale versione tenere.`,
              `${result.conflicts.length} fields in conflict: choose which version to keep.`,
            ),
        true,
      );
    else if (result) ctx.toast(ctx.t("Modifiche pubblicate.", "Changes published."));
    $(".bp-conflict button, [data-bp-publish]")?.focus();
  });
  el.querySelectorAll("[data-bp-resolve]").forEach(
    (button) =>
      (button.onclick = () => {
        savePending(ctx);
        cobuildCommit(
          ctx,
          ctx.t("Bozza condivisa: conflitto risolto", "Shared draft: conflict resolved"),
          (draft) =>
            resolveConflict(draft, id, ctx.role, button.dataset.field, button.dataset.bpResolve),
        );
        $("#bp-f-" + button.dataset.field)?.focus();
      }),
  );
  el.querySelectorAll("[data-bp-discard]").forEach(
    (button) =>
      (button.onclick = () => {
        savePending(ctx);
        cobuildCommit(
          ctx,
          ctx.t("Bozza condivisa: modifica scartata", "Shared draft: edit discarded"),
          (draft) => discardLocal(draft, id, ctx.role, button.dataset.bpDiscard),
          { localOnly: true },
        );
        $("#bp-f-" + button.dataset.bpDiscard)?.focus();
      }),
  );
  el.querySelectorAll("[data-bp-restore]").forEach(
    (button) =>
      (button.onclick = () => {
        savePending(ctx);
        cobuildCommit(
          ctx,
          ctx.t("Bozza condivisa: valore ripristinato", "Shared draft: value restored"),
          (draft) => restoreValue(draft, id, ctx.role, button.dataset.bpRestore),
        );
        $(".bp-history summary")?.focus();
      }),
  );
  el.querySelector("[data-bp-transfer]")?.addEventListener("click", () =>
    attempt(ctx, () => {
      // Text still in a field becomes a pending edit, which the transfer asks to publish first.
      savePending(ctx);
      let draftId = null;
      ctx.commit(
        ctx.t("Bozza condivisa portata nel builder", "Shared draft brought into the builder"),
        (draft) => {
          draftId = transferToDraft(draft, id, ctx.role, { draftId: uid() });
        },
        { local: true, visibility: "private", undoable: false },
      );
      ctx.navigate("builder", { id: draftId, tab: "identity" });
    }),
  );
  el.querySelector("[data-bp-close]")?.addEventListener("click", () =>
    ctx.dialog(
      ctx.t("Chiudere la bozza condivisa?", "Close the shared draft?"),
      `<p>${ctx.t("Resta in sola lettura con la sua cronologia. La tua bozza del builder non cambia.", "It stays read-only with its history. Your builder draft does not change.")}</p>`,
      {
        submitLabel: ctx.t("Chiudi", "Close"),
        onSubmit: () => {
          savePending(ctx);
          cobuildCommit(ctx, ctx.t("Bozza condivisa chiusa", "Shared draft closed"), (draft) =>
            closeCobuild(draft, id, ctx.role),
          );
        },
      },
    ),
  );
  // Opening the page marks the other identity's changes as seen (private bookkeeping).
  const v = cobuildView(ctx.state, id, ctx.role);
  if (v.unseen > 0 || !v.opened)
    setTimeout(() => {
      if (ctx.view.page === ID && ctx.view.id === id)
        attempt(ctx, () =>
          ctx.commit(
            ctx.t("Bozza condivisa letta", "Shared draft read"),
            (draft) => markSeen(draft, id, ctx.role),
            { local: true, visibility: "private", undoable: false },
          ),
        );
    }, 0);
}
function openCobuildStart(ctx, api) {
  ctx.dialog(
    ctx.t("Costruire insieme al DM?", "Build together with the DM?"),
    `<p>${ctx.t("Nome, classe, specie, background, aspetto, storia, idea e agganci di questa bozza diventano una bozza condivisa: il DM potrà leggerli e modificarli. Ognuno vede dove scrive l’altro; se modificate lo stesso campo, chi pubblica per secondo sceglie quale versione tenere.", "This draft’s name, class, species, background, appearance, story, concept and hooks become a shared draft: the DM can read and edit them. Each sees where the other is writing; if you both change a field, whoever publishes second chooses which version to keep.")}</p><p class="muted">${ctx.t("Caratteristiche, tiri e Appunti Solo io restano privati.", "Abilities, rolls and Only me notes stay private.")}</p>`,
    {
      submitLabel: ctx.t("Condividi con il DM", "Share with the DM"),
      onSubmit: () => {
        if (api.dirty()) api.change(() => {});
        const id = uid();
        cobuildCommit(ctx, ctx.t("Bozza condivisa avviata", "Shared draft started"), (draft) =>
          startCobuild(draft, ctx.role, { id, draftId: api.draft.id }),
        );
        ctx.navigate(ID, { tab: "cobuild", id });
      },
    },
  );
}

// ---------------------------------------------------------------- starting equipment chooser

function chooserBody(ctx, { classId, backgroundId, level, current, roll, sheet }) {
  const options = startingOptions(classId, backgroundId);
  const band = bandFor(level);
  const group = (name, key, data) =>
    data
      ? `<fieldset class="bp-chooser-group"><legend>${name}: ${ctx.esc(ctx.label(data.name))} <span class="bp-source">${sourceLine(ctx, data.source)}</span></legend>${data.options
          .map(
            (option) =>
              `<label class="bp-radio"><input type="radio" name="${key}" value="${ctx.esc(option.id)}" ${option.id === current[key] ? "checked" : ""}><span><strong>(${ctx.esc(option.id)})</strong> ${option.items.length ? option.items.map(([slug, q]) => ctx.esc((q > 1 ? q + " × " : "") + itemName(ctx, slug))).join(", ") + ` + ${option.gp} ${ctx.t("mo", "gp")}` : `${option.gp} ${ctx.t("mo", "gp")} ${ctx.t("al posto degli oggetti", "instead of items")}`}</span></label>`,
          )
          .join(
            "",
          )}${data.missing ? `<p class="muted">${ctx.t("Pacchetto di oggetti non ancora catalogato: resta l’oro.", "Item package not catalogued yet: the gold remains.")}</p>` : ""}</fieldset>`
      : "";
  const bandHtml = band
    ? `<fieldset class="bp-chooser-group"><legend>${ctx.t("Partenza al livello", "Starting at level")} ${level} · ${ctx.t("guida per il DM", "a guide for the DM")} <span class="bp-source">${sourceLine(ctx, HIGHER_LEVEL_SOURCE)}</span></legend><p>${band.multiplier ? ctx.t(`${band.base} mo più 1d10 × ${band.multiplier} mo, oltre alla dotazione ordinaria.`, `${band.base} gp plus 1d10 × ${band.multiplier} gp, besides the normal starting equipment.`) : ctx.t("Dotazione ordinaria.", "Normal starting equipment.")} ${ctx.t("Oggetti magici:", "Magic items:")} ${ctx.esc(ctx.label(band.magic))} ${ctx.t("(li assegna il DM; non vengono aggiunti da soli).", "(the DM assigns them; they are never added automatically).")}</p>${
        band.multiplier && sheet
          ? roll
            ? `<p class="bp-roll-result" data-bp-roll-result>d10 = <strong>${roll.values[0]}</strong> → ${band.base} + ${roll.values[0]} × ${band.multiplier} = <strong>${roll.total} ${ctx.t("mo", "gp")}</strong> · ${roll.mode === "physical" ? ctx.t("dado fisico", "physical die") : ctx.t("dado digitale", "digital die")}${roll.reusedFrom ? ` · ${ctx.t("Riusato", "Reused")}` : ""}${roll.reason ? ` · ${ctx.t("corretto", "corrected")}: ${ctx.esc(roll.reason)}` : ""}</p><label class="builder-check"><input type="checkbox" name="useBonus" ${current.useBonus !== false ? "checked" : ""}> ${ctx.t("Aggiungi quest’oro alla dotazione", "Add this gold to the equipment")}</label><details class="bp-correct"><summary>${ctx.t("Correggi registrazione…", "Correct record…")}</summary><div class="form-grid"><label class="field">${ctx.t("Faccia corretta del d10", "Correct d10 face")}<input type="number" min="1" max="10" step="1" inputmode="numeric" data-bp-fix-face></label><label class="field">${ctx.t("Motivo", "Reason")}<input maxlength="200" data-bp-fix-reason></label></div><button type="button" class="button" data-bp-fix-roll="${ctx.esc(roll.id)}">${ctx.t("Registra correzione", "Record correction")}</button></details>`
            : `<div class="bp-roll"><button type="button" class="button" data-bp-roll="digital">${ctx.t("Tira 1d10 digitale", "Roll 1d10 digitally")}</button><label class="field bp-face">${ctx.t("Dado fisico: faccia", "Physical die: face")}<input type="number" min="1" max="10" step="1" inputmode="numeric" data-bp-face></label><button type="button" class="button" data-bp-roll="physical">${ctx.t("Registra tiro fisico", "Record physical roll")}</button></div>`
          : ""
      }</fieldset>`
    : "";
  return `<div class="bp-chooser" data-bp-chooser>${group(ctx.t("Classe", "Class"), "classOption", options.class)}${group(ctx.t("Background", "Background"), "backgroundOption", options.background)}${bandHtml}<section class="bp-chooser-preview" data-bp-chooser-preview aria-live="polite"></section></div>`;
}
function describePreview(ctx, info) {
  if (!info) return "";
  if (info.kind === "plan")
    return `<p><strong>${ctx.t("Risultato", "Result")}:</strong> ${info.plan.items.length} ${ctx.t("oggetti", "items")} · ${info.plan.total} ${ctx.t("mo", "gp")}</p>`;
  const p = info.preview;
  return `<p><strong>${ctx.t("Rimuove", "Removes")}:</strong> ${p.removed.length ? p.removed.map((i) => ctx.esc((i.quantity > 1 ? i.quantity + " × " : "") + ctx.label(i.name)) + (i.equipped ? ` (${ctx.t("equipaggiato", "equipped")})` : "")).join(", ") : "—"}</p><p><strong>${ctx.t("Aggiunge", "Adds")}:</strong> ${p.added.length ? p.added.map((i) => ctx.esc((i.quantity > 1 ? i.quantity + " × " : "") + ctx.label(i.name))).join(", ") : "—"}</p>${p.kept.length ? `<p><strong>${ctx.t("Restano come sono", "Stay as they are")}:</strong> ${p.kept.length} ${ctx.t("oggetti", "items")}</p>` : ""}<p><strong>${ctx.t("Oro", "Gold")}:</strong> ${p.gpBefore} → ${p.gpAfter} ${ctx.t("mo", "gp")} (${signed(p.delta)})</p>${p.errors.length ? `<p class="error">${ctx.esc(ctx.label(p.errors[0]))}</p>` : ""}`;
}
/** DDB "Starting Equipment": class and background packages or their gold; reopenable. */
export function openChooser(
  ctx,
  { mode, actorId = null, classId, backgroundId, level = 1, current, onApply },
) {
  const readChoice = (form) => ({
    classOption:
      form.querySelector('input[name="classOption"]:checked')?.value ?? current.classOption,
    backgroundOption:
      form.querySelector('input[name="backgroundOption"]:checked')?.value ??
      current.backgroundOption,
    useBonus: form.querySelector('input[name="useBonus"]')
      ? form.querySelector('input[name="useBonus"]').checked
      : false,
  });
  const sheet = mode === "sheet";
  const roll = sheet ? startingBonusRoll(ctx.state, actorId) : null;
  ctx.dialog(
    ctx.t("Dotazione iniziale", "Starting equipment"),
    `<p class="muted">${ctx.t("Ogni origine dà il suo pacchetto oppure il suo oro, mai entrambi. Nessun oggetto viene equipaggiato da solo.", "Each origin gives its package or its gold, never both. No item is equipped automatically.")}</p>${chooserBody(ctx, { classId, backgroundId, level, current, roll, sheet })}`,
    {
      submitLabel: sheet
        ? ctx.t("Applica dotazione", "Apply equipment")
        : ctx.t("Usa questa dotazione", "Use this equipment"),
      onSubmit: (_data, form) => {
        const choice = readChoice(form);
        if (sheet) {
          const actor = ctx.state.actors[actorId];
          const preview = previewStarting(ctx.state, actorId, choice);
          const label = ctx.t("Dotazione iniziale riaperta", "Starting equipment reopened");
          withNotice({ actorId, kind: "start", label }, () =>
            ctx.commit(
              label,
              (draft) => applyStarting(draft, actorId, choice, ctx.role, { key: preview.key }),
              scopeFor(ctx, actor),
            ),
          );
          focusNotice();
          return;
        }
        onApply(choice);
      },
    },
  );
  const dialog = $("#dialog");
  const form = dialog?.querySelector("form");
  const box = dialog?.querySelector("[data-bp-chooser-preview]");
  const refresh = () => {
    if (!form || !box) return;
    try {
      const choice = readChoice(form);
      box.innerHTML = sheet
        ? describePreview(ctx, {
            kind: "sheet",
            preview: previewStarting(ctx.state, actorId, choice),
          })
        : describePreview(ctx, {
            kind: "plan",
            plan: planStarting({ classId, backgroundId, ...choice, bonus: 0 }),
          });
    } catch (error) {
      box.innerHTML = `<p class="error">${ctx.esc(msg(ctx, error))}</p>`;
    }
  };
  form?.addEventListener("change", refresh);
  refresh();
  const reopen = () => {
    const choice = form ? readChoice(form) : current;
    openChooser(ctx, {
      mode,
      actorId,
      classId,
      backgroundId,
      level,
      current: { ...choice, useBonus: true },
      onApply,
    });
  };
  dialog?.querySelectorAll("[data-bp-roll]").forEach(
    (button) =>
      (button.onclick = () => {
        const physical = button.dataset.bpRoll === "physical";
        const face = Number(dialog.querySelector("[data-bp-face]")?.value);
        if (physical && !(Number.isInteger(face) && face >= 1 && face <= 10)) {
          const err = dialog.querySelector(".dialog-error");
          if (err) {
            err.textContent = ctx.t(
              "Inserisci la faccia del d10, da 1 a 10.",
              "Enter the d10 face, 1 to 10.",
            );
            err.hidden = false;
          }
          return;
        }
        if (
          attempt(ctx, () =>
            rollStartingGold(
              ctx,
              actorId,
              physical ? { mode: "physical", value: face } : { mode: "digital" },
            ),
          ) !== null
        )
          reopen();
      }),
  );
  dialog?.querySelector("[data-bp-fix-roll]")?.addEventListener("click", (event) => {
    const face = Number(dialog.querySelector("[data-bp-fix-face]")?.value);
    const reason = dialog.querySelector("[data-bp-fix-reason]")?.value ?? "";
    if (
      attempt(ctx, () =>
        rollStartingGold(ctx, actorId, {
          mode: "physical",
          value: face,
          reason,
          correctionOf: event.currentTarget.dataset.bpFixRoll,
        }),
      ) !== null
    )
      reopen();
  });
}
export function rollStartingGold(
  ctx,
  actorId,
  { mode, value = null, reason = "", correctionOf = null },
) {
  const actor = ctx.state.actors[actorId];
  const id = uid();
  let face = value,
    reusedFrom = null;
  if (mode === "digital") {
    const withdrawn = withdrawnFace(ctx.state, actorId);
    if (withdrawn) {
      face = withdrawn.value;
      reusedFrom = withdrawn.rollId;
    }
  }
  let recorded = null;
  const label = ctx.t("Oro iniziale: tiro 1d10", "Starting gold: 1d10 roll");
  ctx.commit(
    label,
    (draft) => {
      const faceNow = face ?? (ctx.rollDie ?? rollDie)(10);
      recorded = recordStartingRoll(draft, actorId, ctx.role, {
        id,
        mode,
        value: faceNow,
        reason,
        correctionOf,
        reusedFrom,
      });
    },
    {
      ...scopeFor(ctx, actor),
      afterCommit: (state) => {
        const entry = state.log?.at(-1);
        if (entry && entry.label === label && recorded) entry.rolls = [logRoll(recorded, actor)];
      },
    },
  );
  if (recorded) {
    const logId = ctx.state.log?.at(-1)?.id ?? null;
    area?.emit?.("roll-accepted", { logId, roll: logRoll(recorded, actor) });
  }
  return recorded;
}

// ---------------------------------------------------------------- sheet sections

function originLine(ctx, actorId) {
  const origin = sliceOf(ctx.state)?.origins?.[actorId];
  if (!origin) return "";
  if (origin.kind === "premade")
    return `${ctx.t("Personaggio pronto", "Ready-made character")} «${ctx.esc(premadeOf(origin.premadeId)?.name ?? origin.premadeId)}» · ${ctx.t("revisione", "revision")} ${origin.revision} · ${ctx.t("reclamato il", "claimed on")} ${ctx.esc(new Date(origin.at).toLocaleDateString(ctx.lang === "en" ? "en-GB" : "it-IT"))}`;
  return `${ctx.t("Creato con il percorso rapido", "Created with the quick path")} · ${ctx.esc(new Date(origin.at).toLocaleDateString(ctx.lang === "en" ? "en-GB" : "it-IT"))}`;
}
// The notice is set before the commit renders, and dropped if the commit is refused.
function withNotice(notice, fn) {
  const previous = view.notice;
  view.notice = notice;
  try {
    return fn();
  } catch (error) {
    view.notice = previous;
    throw error;
  }
}
function noticeHtml(ctx, actorId, kind) {
  const notice = view.notice;
  if (!notice || notice.actorId !== actorId || notice.kind !== kind) return "";
  const canUndo = ctx.canUndo?.() && ctx.undoLabel?.() === notice.label;
  return `<div class="bp-notice" role="status"><span>${ctx.esc(notice.label)}.</span>${canUndo ? ` <button type="button" class="button quiet" data-bp-undo>${ctx.t("Annulla", "Undo")}</button>` : ""}<button type="button" class="text-button" data-bp-notice-close>${ctx.t("Chiudi", "Dismiss")}</button></div>`;
}
function renderBuildSection(ctx, actor) {
  const live = ctx.state.actors[actor.id] ?? actor;
  const build = live.characterBuild?.data;
  const control = ctx.canControl(live);
  const origin = originLine(ctx, live.id);
  const exceptions = build
    ? ruleExceptions(build, { level: live.level, abilities: live.abilities })
    : [];
  const legacy = legacyRecords(live);
  if (!build)
    return `<section class="bp-sheet panel" aria-labelledby="bp-build-${ctx.esc(live.id)}"><h3 id="bp-build-${ctx.esc(live.id)}">${ctx.t("Livelli e rifacimento", "Levels and rebuild")}</h3><p class="muted">${ctx.t("Questa scheda non è stata costruita con il builder: scendere di livello o rifarla richiede prima «Rivedi scelte».", "This sheet was not built with the builder: levelling down or rebuilding needs “Revise choices” first.")}</p></section>`;
  const rows = build.classes ?? [];
  const total = rows.reduce((sum, row) => sum + row.level, 0);
  const order = rows.length === 1 ? [] : (build.levelOrder ?? []);
  const cat = catalog();
  const classRows = rows
    .map((row) => {
      const cls = byId(cat.classes, row.classId);
      const initial = rows.length > 1 && order[0] === row.classId && row.level === 1;
      const reason =
        total <= 1
          ? ctx.t("Il livello 1 è il minimo.", "Level 1 is the minimum.")
          : initial
            ? ctx.t(
                "La classe iniziale resta: scendi prima nelle altre.",
                "The starting class stays: level down the others first.",
              )
            : "";
      return `<tr><th scope="row">${ctx.esc(ctx.label(cls?.name ?? row.classId))}</th><td>${row.level}</td><td>d${cls?.hitDie ?? "?"}</td><td>${control ? (reason ? `<span class="muted">${reason}</span>` : `<button type="button" class="button" data-bp-level-down="${ctx.esc(row.classId)}">${ctx.t("Scendi di livello…", "Level down…")}</button>`) : ""}</td></tr>`;
    })
    .join("");
  return `<section class="bp-sheet panel" aria-labelledby="bp-build-${ctx.esc(live.id)}"><h3 id="bp-build-${ctx.esc(live.id)}" tabindex="-1">${ctx.t("Livelli e rifacimento", "Levels and rebuild")}</h3>${origin ? `<p class="muted">${origin}</p>` : ""}${noticeHtml(ctx, live.id, "build")}<div class="table-wrap"><table class="bp-table"><thead><tr><th scope="col">${ctx.t("Classe", "Class")}</th><th scope="col">${ctx.t("Livello", "Level")}</th><th scope="col">${ctx.t("Dado Vita", "Hit Die")}</th><th scope="col"><span class="bp-sr">${ctx.t("Azioni", "Actions")}</span></th></tr></thead><tbody>${classRows}</tbody></table></div>${rows.length > 1 ? multiclassTable(ctx, multiclassRows(live.abilities, rows)) : ""}${control ? `<div class="toolbar"><button type="button" class="button" data-bp-respec>${ctx.t("Rifai da capo…", "Rebuild from scratch…")}</button></div>` : ""}${
    exceptions.length
      ? `<section class="bp-exceptions" aria-labelledby="bp-exc-${ctx.esc(live.id)}"><h4 id="bp-exc-${ctx.esc(live.id)}">${ctx.t("Eccezioni alle regole", "Rule exceptions")}</h4><ul>${exceptions
          .map(
            (row) =>
              `<li data-bp-exception="${ctx.esc(row.featId)}"><strong>${ctx.esc(ctx.label(row.name))}</strong>: ${ctx.t("requisito non soddisfatto", "prerequisite not met")} (${ctx.esc(ctx.label(row.requirement.text))}${row.requirement.values.length ? ` · ${row.requirement.values.map(([a, v]) => `${ctx.esc(ctx.label(abilityName(a)))} ${v ?? "?"}`).join(", ")}` : ""}).${row.reason ? ` ${ctx.t("Motivo", "Reason")}: «${ctx.esc(row.reason)}»` : ""}${row.by ? ` · ${roleName(ctx, row.by)}${row.at ? ", " + ctx.esc(new Date(row.at).toLocaleDateString(ctx.lang === "en" ? "en-GB" : "it-IT")) : ""}` : ""}</li>`,
          )
          .join(
            "",
          )}</ul><p class="muted">${ctx.t("Resta segnalata finché il talento non soddisfa il requisito o non viene tolto con «Rivedi scelte».", "It stays flagged until the feat meets its prerequisite or is removed with “Revise choices”.")}</p></section>`
      : ""
  }${legacy.length ? `<section class="bp-exceptions"><h4>${ctx.t("Contenuti legacy 2014", "Legacy 2014 content")}</h4><ul>${legacy.map((row) => `<li><span class="badge">Legacy</span> ${ctx.esc(ctx.label(row.name))} · ${ctx.esc(LEGACY_SOURCE.label)}</li>`).join("")}</ul></section>` : ""}</section>`;
}
// After Undo (or dismissing the notice) the focus stays on the section, not the page top.
const focusSection = (kind, actorId) =>
  $(`[id="bp-${kind}-${String(actorId).replace(/["\\]/g, "")}"]`)?.focus?.();
// After applying from a dialog, the focus goes to the notice's Undo (the dialog is closed then).
const focusNotice = () => setTimeout(() => $(".bp-notice [data-bp-undo]")?.focus?.(), 0);
function bindBuildSection(el, ctx, actor) {
  const actorId = actor.id;
  el.querySelector("[data-bp-undo]")?.addEventListener("click", () => {
    view.notice = null;
    ctx.undo();
    focusSection("build", actorId);
  });
  el.querySelector("[data-bp-notice-close]")?.addEventListener("click", () => {
    view.notice = null;
    ctx.render();
    focusSection("build", actorId);
  });
  el.querySelectorAll("[data-bp-level-down]").forEach(
    (button) => (button.onclick = () => openLevelDown(ctx, actorId, button.dataset.bpLevelDown)),
  );
  el.querySelector("[data-bp-respec]")?.addEventListener("click", () => openRespec(ctx, actorId));
}
function openLevelDown(ctx, actorId, classId, manualMaxHp = null) {
  const plan = attempt(ctx, () =>
    levelDownPlan(ctx.state, actorId, classId, ctx.role, { manualMaxHp }),
  );
  if (!plan) return;
  const cls = byId(catalog().classes, classId);
  const list = (items) =>
    items.length
      ? `<ul>${items.map((n) => `<li>${ctx.esc(ctx.label(n))}</li>`).join("")}</ul>`
      : `<p class="muted">—</p>`;
  const choices = plan.removed.choices
    .filter((c) => c.kind !== "spell")
    .map((c) => {
      const cat = catalog();
      const name =
        byId(cat.feats, c.id)?.name ?? byId(cat.spells, c.id)?.name ?? skillName(c.id) ?? c.id;
      return c.kind === "unprepared"
        ? L2(ctx, "Non più preparata: ", "No longer prepared: ", name)
        : ctx.label(name);
    });
  const warnings = plan.warnings.filter((w) => w.code !== "catalogue-partial" || plan.toLevel > 1);
  ctx.dialog(
    ctx.t(`Scendere di livello: ${ctx.label(cls?.name)}`, `Level down: ${ctx.label(cls?.name)}`),
    `<p>${ctx.t(`Livello totale ${plan.fromLevel} → ${plan.toLevel}`, `Total level ${plan.fromLevel} → ${plan.toLevel}`)} · ${ctx.esc(ctx.label(plan.before.className))} → ${ctx.esc(ctx.label(plan.after.className ?? ""))}</p><div class="bp-level-down"><section><h3>${ctx.t("Privilegi rimossi", "Features removed")}</h3>${list(plan.removed.features)}</section><section><h3>${ctx.t("Magie rimosse", "Spells removed")}</h3>${list(plan.removed.spells)}</section><section><h3>${ctx.t("Risorse", "Resources")}</h3><ul>${plan.removed.slots.map((s) => `<li>${ctx.t("Slot di", "Level")} ${s.level}° ${ctx.t("livello", "slots")}: ${s.from} → ${s.to}</li>`).join("")}${plan.removed.hitDice.map((d) => `<li>${ctx.t("Dadi Vita", "Hit Dice")} ${ctx.esc(d.die)}: ${d.from} → ${d.to}</li>`).join("")}<li>${ctx.t("PF massimi", "Maximum HP")}: ${plan.before.maxHp} → ${plan.after.maxHp ?? "?"}${plan.after.hp !== null && plan.after.hp < plan.before.hp ? ` · ${ctx.t("PF attuali limitati a", "current HP limited to")} ${plan.after.hp}` : ""}</li></ul></section>${choices.length ? `<section><h3>${ctx.t("Scelte liberate", "Choices released")}</h3>${list(choices)}</section>` : ""}</div>${plan.needsHp ? `<label class="field">${ctx.t("PF massimi dopo la discesa (il valore del livello rimosso non è registrato)", "Maximum HP after levelling down (the removed level’s value is not recorded)")}<input type="number" min="1" step="1" name="maxHp" required></label>` : ""}<p class="muted">${ctx.t("Consumi, condizioni, oggetti e storia restano. Nessun riposo né rimborso: si può annullare subito dopo.", "Spent resources, conditions, items and story stay. No rest and no refund: it can be undone right after.")}</p>${plan.errors.length ? `<p class="error">${ctx.esc(ctx.t(plan.errors[0].it, plan.errors[0].en))}</p>` : ""}${plan.incomplete ? `<ul class="bp-warnings">${warnings.map((w) => `<li>${ctx.esc(ctx.t(w.it, w.en))}</li>`).join("")}</ul><label class="builder-check"><input type="checkbox" name="confirm" required> ${ctx.t("Confermo con gli aspetti da verificare.", "I confirm with the aspects to verify.")}</label>` : ""}`,
    {
      submitLabel: ctx.t("Scendi di livello", "Level down"),
      onSubmit: (form) => {
        const hp = form.has("maxHp") ? Number(form.get("maxHp")) : null;
        if (plan.needsHp && !(Number.isInteger(hp) && hp > 0))
          throw Error(ctx.t("Indica i PF massimi.", "Enter the maximum HP."));
        const label = ctx.t(
          `Sceso di livello: ${ctx.label(cls?.name)}`,
          `Levelled down: ${ctx.label(cls?.name)}`,
        );
        const actor = ctx.state.actors[actorId];
        withNotice({ actorId, kind: "build", label }, () =>
          ctx.commit(
            label,
            (draft) =>
              applyLevelDown(draft, actorId, classId, ctx.role, {
                key: plan.needsHp ? undefined : plan.key,
                operationId: uid(),
                allowIncomplete: form.has("confirm"),
                manualMaxHp: hp,
              }),
            scopeFor(ctx, actor),
          ),
        );
        focusNotice();
      },
    },
  );
}
const L2 = (ctx, it, en, name) => ctx.t(it, en) + ctx.label(name);
function openRespec(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  const cat = catalog();
  const race = byId(cat.species, actor.characterBuild?.data?.origin?.speciesId);
  const bg = byId(cat.backgrounds, actor.characterBuild?.data?.origin?.backgroundId);
  ctx.dialog(
    ctx.t(`Rifare da capo ${actor.name}?`, `Rebuild ${actor.name} from scratch?`),
    `<p>${ctx.t(`Si apre una bozza privata: classe, sottoclasse, caratteristiche, abilità, talenti e magie tornano da scegliere fino al livello ${actor.level}.`, `A private draft opens: class, subclass, abilities, skills, feats and spells are chosen again up to level ${actor.level}.`)}</p><p>${ctx.t("Restano", "Kept")}: ${ctx.esc(ctx.label(race?.name ?? ""))}, ${ctx.esc(ctx.label(bg?.name ?? ""))}, ${ctx.t("nome, aspetto, storia, lingue e oggetti", "name, appearance, story, languages and items")}.</p><p class="muted">${ctx.t("La scheda cambia solo quando applichi il riepilogo; se scarti la bozza non cambia nulla. Consumi e condizioni restano.", "The sheet changes only when you apply the review; discarding the draft changes nothing. Spent resources and conditions stay.")}</p>`,
    {
      submitLabel: ctx.t("Inizia il rifacimento", "Start the rebuild"),
      onSubmit: () => {
        const draftId = uid();
        ctx.commit(
          ctx.t("Rifacimento completo iniziato", "Full rebuild started"),
          (draft) => startRespec(draft, actorId, ctx.role, { draftId }),
          local,
        );
        ctx.navigate("builder", { id: draftId, tab: "class" });
      },
    },
  );
}
function renderStartSection(ctx, actor) {
  const live = ctx.state.actors[actor.id] ?? actor;
  const context = startingContext(ctx.state, live.id);
  const control = ctx.canControl(live);
  if (!context.available)
    return `<section class="bp-sheet panel" aria-labelledby="bp-start-${ctx.esc(live.id)}"><h3 id="bp-start-${ctx.esc(live.id)}">${ctx.t("Dotazione iniziale", "Starting equipment")}</h3><p class="muted">${ctx.esc(ctx.label(context.reason))}</p></section>`;
  const record = context.record;
  const cat = catalog();
  const roll = startingBonusRoll(ctx.state, live.id);
  const summary = record
    ? `${ctx.esc(ctx.label(byId(cat.classes, context.classId)?.name))} (${ctx.esc(record.classOption)}) · ${ctx.esc(ctx.label(byId(cat.backgrounds, context.backgroundId)?.name))} (${ctx.esc(record.backgroundOption)}) · ${(record.gold?.class ?? 0) + (record.gold?.background ?? 0) + (record.gold?.bonus ?? 0)} ${ctx.t("mo", "gp")}${record.gold?.bonus ? ` (${ctx.t("di cui", "of which")} ${record.gold.bonus} ${ctx.t("dal livello di partenza", "from the starting level")})` : ""}`
    : ctx.t("Non ancora scelta.", "Not chosen yet.");
  return `<section class="bp-sheet panel" aria-labelledby="bp-start-${ctx.esc(live.id)}"><h3 id="bp-start-${ctx.esc(live.id)}" tabindex="-1">${ctx.t("Dotazione iniziale", "Starting equipment")}</h3>${noticeHtml(ctx, live.id, "start")}<p>${summary}</p>${roll ? `<p class="muted">${ctx.t("Tiro dell’oro del livello di partenza", "Starting-level gold roll")}: d10 = ${roll.values[0]} → ${roll.total} ${ctx.t("mo", "gp")} · ${roll.mode === "physical" ? ctx.t("fisico", "physical") : ctx.t("digitale", "digital")}</p>` : ""}${control ? `<button type="button" class="button" data-bp-reopen>${record ? ctx.t("Riapri dotazione iniziale…", "Reopen starting equipment…") : ctx.t("Scegli dotazione iniziale…", "Choose starting equipment…")}</button>` : ""}</section>`;
}
function bindStartSection(el, ctx, actor) {
  const actorId = actor.id;
  el.querySelector("[data-bp-undo]")?.addEventListener("click", () => {
    view.notice = null;
    ctx.undo();
    focusSection("start", actorId);
  });
  el.querySelector("[data-bp-notice-close]")?.addEventListener("click", () => {
    view.notice = null;
    ctx.render();
    focusSection("start", actorId);
  });
  el.querySelector("[data-bp-reopen]")?.addEventListener("click", () => {
    const context = startingContext(ctx.state, actorId);
    const options = startingOptions(context.classId, context.backgroundId);
    openChooser(ctx, {
      mode: "sheet",
      actorId,
      classId: context.classId,
      backgroundId: context.backgroundId,
      level: context.level,
      current: {
        classOption: context.record?.classOption ?? defaultOption(options.class),
        backgroundOption: context.record?.backgroundOption ?? defaultOption(options.background),
        useBonus: true,
      },
    });
  });
}

// ---------------------------------------------------------------- builder panels (seam)

const isNewCreate = (draft) => draft?.kind === "create" && !draft.actorId;
const PANELS = [
  {
    id: "builder-plus-methods",
    sections: ["identity"],
    placement: "start",
    render(ctx, api) {
      if (!isNewCreate(api.draft)) return "";
      const data = api.data();
      const untouched =
        !data.classes?.length && !data.origin?.backgroundId && !data.origin?.speciesId;
      return `<section class="bp-panel" aria-labelledby="bp-methods-title"><h3 id="bp-methods-title">${ctx.t("Come vuoi creare il personaggio?", "How do you want to create the character?")}</h3>${untouched ? methodCards(ctx, { draftId: api.draft.id, current: true }) : `<p class="muted">${ctx.t("Hai già iniziato passo per passo: continua qui oppure", "You already started step by step: continue here or")} <button type="button" class="text-button" data-bp-go="premade" data-draft="">${ctx.t("guarda i personaggi pronti", "see the ready-made characters")}</button>.</p>`}<p class="bp-cobuild-line"><button type="button" class="button quiet" data-bp-cobuild-start>${ctx.role === "dm" ? ctx.t("Costruisci con il giocatore…", "Build with the player…") : ctx.t("Costruisci con il DM…", "Build with the DM…")}</button> <span class="muted">${ctx.t("Bozza condivisa, modifiche e conflitti visibili a entrambi.", "Shared draft, edits and conflicts visible to both.")}</span></p></section>`;
    },
    bind(el, ctx, api) {
      bindMethods(el, ctx);
      el.querySelector("[data-bp-cobuild-start]")?.addEventListener("click", () =>
        openCobuildStart(ctx, api),
      );
    },
  },
  {
    id: "builder-plus-names",
    sections: ["identity"],
    render(ctx, api) {
      if (!isNewCreate(api.draft)) return "";
      const data = api.data();
      const page = view.namePage[api.draft.id] ?? 0;
      const names = nameSuggestions(data.origin?.speciesId, page);
      return `<section class="bp-panel bp-names" aria-labelledby="bp-bnames"><h3 id="bp-bnames">${ctx.t("Nomi suggeriti", "Suggested names")}</h3><div class="bp-name-list">${names.map((name) => `<button type="button" class="bp-chip" data-bp-builder-name="${ctx.esc(name)}">${ctx.esc(name)}</button>`).join("")}</div><button type="button" class="button quiet" data-bp-builder-names-more>${ctx.t("Suggerisci altri", "Suggest more")}</button></section>`;
    },
    bind(el, ctx, api) {
      el.querySelectorAll("[data-bp-builder-name]").forEach(
        (button) =>
          (button.onclick = () =>
            api.change((data) => (data.identity.name = button.dataset.bpBuilderName))),
      );
      el.querySelector("[data-bp-builder-names-more]")?.addEventListener("click", () => {
        view.namePage[api.draft.id] = (view.namePage[api.draft.id] ?? 0) + 1;
        ctx.render();
        $("[data-bp-builder-names-more]")?.focus();
      });
    },
  },
  {
    id: "builder-plus-sources",
    sections: ["sources"],
    render(ctx, api) {
      if (!api.draft) return "";
      const data = api.data();
      const access = legacyAccess(ctx.state, api.draft);
      const hidden = hiddenOptions(data);
      const on = data.sources?.legacy2014 === true;
      return `<section class="bp-panel" aria-labelledby="bp-cats"><h3 id="bp-cats">${ctx.t("Categorie di contenuti", "Content categories")}</h3><ul class="bp-categories">${SOURCE_CATEGORIES.map(
        (cat) => {
          const control =
            cat.id === "core-2024"
              ? `<span class="badge">${(data.sources?.enabled ?? []).includes("srd-2024") ? ctx.t("Attiva", "On") : ctx.t("Spenta", "Off")}</span>`
              : cat.id === "legacy-2014"
                ? `<label class="builder-check"><input type="checkbox" data-bp-legacy ${on ? "checked" : ""} ${access.allowed ? "" : 'disabled aria-describedby="bp-legacy-why"'}> ${on ? ctx.t("Attiva", "On") : ctx.t("Spenta", "Off")}</label>`
                : `<button type="button" class="button quiet" data-bp-library>${ctx.t("Apri la Biblioteca", "Open the Library")}</button>`;
          return `<li><div><strong>${ctx.esc(ctx.label(cat.name))}</strong><p class="muted">${ctx.esc(ctx.label(cat.description))}</p>${cat.id === "legacy-2014" && (access.reason || !access.allowed) ? `<p class="bp-hidden-note" id="bp-legacy-why">${ctx.esc(ctx.label(access.reason ?? { it: "La campagna non ammette la fonte Legacy 2014: il DM la attiva in Impostazioni › Fonti.", en: "The campaign does not allow the Legacy 2014 source: the DM turns it on in Settings › Sources." }))}</p>` : ""}</div>${control}</li>`;
        },
      ).join(
        "",
      )}</ul>${hidden.length ? `<p class="bp-hidden-note" data-bp-hidden-count="${hidden.length}">${ctx.t(`${hidden.length} opzioni nascoste dalle fonti disattivate (Legacy 2014).`, `${hidden.length} options hidden by disabled sources (Legacy 2014).`)}</p>` : `<p class="muted">${ctx.t("Le opzioni legacy compaiono con il loro badge in Background e specie, Capacità e talenti.", "Legacy options appear with their badge in Background and species, Features and feats.")}</p>`}</section>`;
    },
    bind(el, ctx, api) {
      el.querySelector("[data-bp-legacy]")?.addEventListener("change", (event) => {
        const checked = event.currentTarget.checked;
        api.change((data) => {
          data.sources = { ...data.sources, legacy2014: checked };
        });
        $("[data-bp-legacy]")?.focus();
      });
      el.querySelector("[data-bp-library]")?.addEventListener("click", () =>
        ctx.navigate("library"),
      );
    },
  },
  {
    id: "builder-plus-legacy",
    sections: ["origin", "features"],
    placement: "start",
    render(ctx, api) {
      if (!api.draft) return "";
      const data = api.data();
      const section = api.section;
      const hidden = hiddenOptions(data, section);
      if (hidden.length)
        return `<p class="bp-hidden-note">${ctx.t(`${hidden.length === 1 ? "1 opzione nascosta" : hidden.length + " opzioni nascoste"} dalla fonte Legacy 2014 disattivata.`, `${hidden.length === 1 ? "1 option hidden" : hidden.length + " options hidden"} by the disabled Legacy 2014 source.`)} <button type="button" class="text-button" data-bp-sources>${ctx.t("Perché? Mostra le fonti", "Why? Show sources")}</button></p>`;
      const options = LEGACY_OPTIONS.filter((option) => option.section === section);
      if (!options.length || data.sources?.legacy2014 !== true) return "";
      const recorded = new Set(
        (data.features?.custom ?? []).map((row) => row.legacyId).filter(Boolean),
      );
      return `<section class="bp-panel bp-legacy" aria-labelledby="bp-legacy-${section}"><h3 id="bp-legacy-${section}">${ctx.t("Opzioni legacy (regole 2014)", "Legacy options (2014 rules)")}</h3><ul>${options.map((option) => `<li><div><span class="badge">Legacy</span> <strong>${ctx.esc(ctx.label(option.name))}</strong><p class="muted">${ctx.esc(ctx.label(option.summary))} ${ctx.esc(LEGACY_SOURCE.label)}</p></div>${recorded.has(option.id) ? `<span class="badge">${ctx.t("Registrata", "Recorded")}</span>` : `<button type="button" class="button" data-bp-legacy-add="${ctx.esc(option.id)}">${ctx.t("Registra come capacità manuale", "Record as manual feature")}</button>`}</li>`).join("")}</ul></section>`;
    },
    bind(el, ctx, api) {
      el.querySelector("[data-bp-sources]")?.addEventListener("click", () =>
        ctx.navigate("builder", { id: api.draft.id, tab: "sources" }),
      );
      el.querySelectorAll("[data-bp-legacy-add]").forEach(
        (button) =>
          (button.onclick = () =>
            api.change((data) => {
              data.features.custom = [
                ...(data.features.custom ?? []),
                legacyRecord(button.dataset.bpLegacyAdd),
              ];
            })),
      );
    },
  },
  {
    id: "builder-plus-dupes",
    sections: ["origin", "skills"],
    placement: "start",
    render(ctx, api) {
      if (!api.draft) return "";
      const data = api.data();
      const notes = (data.skills?.released ?? []).filter((row) => !row.seen);
      const pending = duplicateSkills(data);
      const asks = pending.filter((row) => row.ask);
      if (!notes.length && !pending.length) return "";
      // DDB duplicate-proficiency detection: the source is always named; a clash between two
      // of the player's own choices asks which one to replace instead of clearing one.
      const source = (row) =>
        ctx.label(row.grantedBy?.name ?? "") || ctx.t("un’altra scelta", "another choice");
      const askHtml = asks
        .map(
          (row) =>
            `<li data-bp-dupe-ask="${ctx.esc(row.skillId)}">${ctx.esc(ctx.t(`${ctx.label(skillName(row.skillId))} è scelta due volte: dalla classe (${ctx.label(row.alsoBy?.name ?? "")}) e da ${source(row)}. Quale scelta vuoi cambiare?`, `${ctx.label(skillName(row.skillId))} is chosen twice: for the class (${ctx.label(row.alsoBy?.name ?? "")}) and by ${source(row)}. Which choice do you want to change?`))}<div class="toolbar"><button type="button" class="button" data-bp-dupe-replace="class" data-skill="${ctx.esc(row.skillId)}">${ctx.t("Cambia la scelta della classe", "Change the class choice")}</button><button type="button" class="button" data-bp-dupe-replace="species" data-skill="${ctx.esc(row.skillId)}">${ctx.t("Cambia la scelta della specie", "Change the species choice")}</button></div></li>`,
        )
        .join("");
      return `<section class="bp-panel bp-dupes" role="status" aria-labelledby="bp-dupes-title"><h3 id="bp-dupes-title">${asks.length && !notes.length ? ctx.t("Competenza scelta due volte", "Proficiency chosen twice") : ctx.t("Competenze duplicate liberate", "Duplicate proficiencies released")}</h3><ul>${askHtml}${notes
        .map(
          (row) =>
            `<li>${ctx.esc(ctx.t(`${ctx.label(skillName(row.skillId))} ora è concessa da ${source(row)}: la scelta ${row.from === "class" ? "della classe" : "della specie"} è stata liberata. Scegli un’altra competenza.`, `${ctx.label(skillName(row.skillId))} is now granted by ${source(row)}: the ${row.from} choice was released. Choose another proficiency.`))}</li>`,
        )
        .join(
          "",
        )}</ul>${notes.length ? `<div class="toolbar">${api.section !== "skills" ? `<button type="button" class="button" data-bp-go-skills>${ctx.t("Vai alle competenze", "Go to proficiencies")}</button>` : ""}<button type="button" class="button quiet" data-bp-dupes-ok>${ctx.t("Ho capito", "Got it")}</button></div>` : ""}</section>`;
    },
    bind(el, ctx, api) {
      const data = api.data();
      // DDB: the duplicate is released automatically, with a notice (after this bind ends).
      if (duplicateSkills(data).some((row) => !row.ask))
        setTimeout(() => api.change((next) => releaseDuplicates(next, { by: ctx.role })), 0);
      el.querySelectorAll("[data-bp-dupe-replace]").forEach(
        (button) =>
          (button.onclick = () => {
            const which = button.dataset.bpDupeReplace;
            api.change((next) =>
              replaceDuplicate(next, button.dataset.skill, which, { by: ctx.role }),
            );
            const tab = which === "class" ? "skills" : "origin";
            if (api.section !== tab) ctx.navigate("builder", { id: api.draft.id, tab });
          }),
      );
      el.querySelector("[data-bp-go-skills]")?.addEventListener("click", () =>
        ctx.navigate("builder", { id: api.draft.id, tab: "skills" }),
      );
      el.querySelector("[data-bp-dupes-ok]")?.addEventListener("click", () =>
        api.change((next) => {
          for (const row of next.skills.released ?? []) row.seen = true;
        }),
      );
    },
  },
  {
    id: "builder-plus-feats",
    sections: ["features"],
    placement: "start",
    render(ctx, api) {
      const preview = api.preview();
      if (!preview) return "";
      const data = api.data();
      const abilities = preview.proposed?.abilities ?? {};
      const total = (data.classes ?? []).reduce((sum, row) => sum + (Number(row.level) || 0), 0);
      const cat = catalog();
      const rows = [];
      for (const grant of preview.choices?.grants ?? []) {
        if (grant.kind !== "feat") continue;
        for (const option of grant.options ?? []) {
          const feat = byId(cat.feats, option.id);
          if (!feat) continue;
          const selection = (data.features?.selected ?? []).find(
            (s) => s.id === feat.id && s.grantId === grant.id,
          );
          // Prerequisites are met before taking the feat: its own increases do not count.
          const before = scoresBefore(abilities, selection);
          const eligibility = featEligibility(feat, total, before, data.classes ?? []);
          if (eligibility.eligible === true) continue;
          rows.push({
            grant,
            feat,
            eligibility,
            selection,
            requirement: featRequirement(feat, before, total),
          });
        }
      }
      if (!rows.length) return "";
      return `<section class="bp-panel bp-feats" aria-labelledby="bp-feats-title"><h3 id="bp-feats-title">${ctx.t("Talenti bloccati dai requisiti", "Feats blocked by prerequisites")}</h3><p class="muted">${ctx.t("Il controllo resta attivo. Con l’accordo del DM puoi consentire un’eccezione per un talento: resta segnalata sulla scheda.", "The check stays on. With the DM’s agreement you can allow an exception for one feat: it stays flagged on the sheet.")}</p><ul>${rows
        .map(({ grant, feat, eligibility, selection, requirement }) => {
          const values = requirement.values
            .map(([a, v]) => `${ctx.label(abilityName(a))} ${v ?? "?"}`)
            .join(" · ");
          const status = selection?.exception
            ? `<span class="badge bp-badge-warn">${ctx.t("Eccezione consentita", "Exception allowed")}</span> «${ctx.esc(selection.exception.reason)}» <button type="button" class="text-button" data-bp-exc-remove="${ctx.esc(feat.id)}" data-grant="${ctx.esc(grant.id)}">${ctx.t("Togli eccezione", "Remove exception")}</button>`
            : `<button type="button" class="button" data-bp-exc-allow="${ctx.esc(feat.id)}" data-grant="${ctx.esc(grant.id)}">${selection ? ctx.t("Consenti eccezione…", "Allow exception…") : ctx.t("Consenti eccezione e scegli…", "Allow exception and choose…")}</button>`;
          return `<li data-bp-blocked="${ctx.esc(feat.id)}"><div><strong>${ctx.esc(ctx.label(feat.name))}</strong> · ${ctx.esc(ctx.label(grant.name))}<p>${selection?.exception ? "" : `<span class="badge bp-badge-block">${ctx.t("Bloccato", "Blocked")}</span> `}${ctx.esc(ctx.label(eligibility.reason))} ${ctx.t("Richiede", "Requires")}: ${ctx.esc(ctx.label(requirement.text))}${values ? ` (${ctx.esc(values)})` : ""}. <span class="bp-source">${sourceLine(ctx, feat.source)}</span></p></div><div>${status}</div></li>`;
        })
        .join("")}</ul></section>`;
    },
    bind(el, ctx, api) {
      el.querySelectorAll("[data-bp-exc-allow]").forEach(
        (button) =>
          (button.onclick = () => {
            const featId = button.dataset.bpExcAllow,
              grantId = button.dataset.grant;
            const feat = byId(catalog().feats, featId);
            ctx.dialog(
              ctx.t(`Eccezione: ${ctx.label(feat.name)}`, `Exception: ${ctx.label(feat.name)}`),
              `<p>${ctx.t("Il talento verrà scelto anche senza il requisito. L’eccezione resta visibile sulla scheda, a te e al DM; non concede talenti in più e non vale per il multiclasse.", "The feat is chosen even without its prerequisite. The exception stays visible on the sheet, to you and the DM; it grants no extra feat and does not apply to multiclassing.")}</p><label class="field">${ctx.t("Motivo (per esempio l’accordo con il DM)", "Reason (for example the agreement with the DM)")}<input name="reason" required maxlength="300"></label>`,
              {
                submitLabel: ctx.t("Consenti eccezione", "Allow exception"),
                onSubmit: (form) => {
                  const reason = String(form.get("reason") ?? "");
                  if (!reason.trim()) throw Error(ctx.t("Scrivi il motivo.", "Write the reason."));
                  const abilities = api.preview()?.proposed?.abilities ?? {};
                  api.change((data) =>
                    allowException(data, { grantId, featId, reason, by: ctx.role, abilities }),
                  );
                },
              },
            );
          }),
      );
      el.querySelectorAll("[data-bp-exc-remove]").forEach(
        (button) =>
          (button.onclick = () =>
            api.change((data) =>
              removeException(data, {
                grantId: button.dataset.grant,
                featId: button.dataset.bpExcRemove,
              }),
            )),
      );
    },
  },
  {
    id: "builder-plus-multiclass",
    sections: ["class"],
    render(ctx, api) {
      const preview = api.preview();
      const data = api.data();
      const rows = (data.classes ?? []).filter((row) => row.classId);
      if (!preview || rows.length < 2) return "";
      return multiclassTable(ctx, multiclassRows(preview.proposed?.abilities ?? {}, rows));
    },
  },
  {
    id: "builder-plus-respec",
    sections: [
      "identity",
      "sources",
      "class",
      "origin",
      "abilities",
      "skills",
      "features",
      "spells",
      "equipment",
      "story",
      "review",
    ],
    placement: "start",
    render(ctx, api) {
      const respec = api.draft && respecOf(ctx.state, api.draft.id);
      if (!respec) return "";
      const data = api.data();
      const chosen = (data.classes ?? []).reduce((sum, row) => sum + (Number(row.level) || 0), 0);
      const actor = ctx.state.actors[respec.actorId];
      return `<section class="bp-panel bp-respec" role="status"><strong>${ctx.t(`Rifacimento completo di ${actor?.name ?? ""}`, `Full rebuild of ${actor?.name ?? ""}`)}</strong> · ${ctx.t(`livelli scelti ${chosen}/${respec.targetLevel}`, `levels chosen ${chosen}/${respec.targetLevel}`)}${chosen !== respec.targetLevel ? ` · <span class="bp-stale">${ctx.t(`ricostruisci fino al livello ${respec.targetLevel}`, `rebuild up to level ${respec.targetLevel}`)}</span>` : ` · ✓`}<p class="muted">${ctx.t("Specie, background, nome, storia, lingue e oggetti restano; il resto si sceglie di nuovo. La scheda cambia solo con «Applica alla scheda».", "Species, background, name, story, languages and items stay; the rest is chosen again. The sheet changes only with “Apply to sheet”.")}</p></section>`;
    },
  },
  {
    id: "builder-plus-equipment",
    sections: ["equipment"],
    render(ctx, api) {
      if (!isNewCreate(api.draft)) return "";
      const data = api.data();
      const classId = data.levelOrder?.[0] || data.classes?.[0]?.classId;
      const backgroundId = data.origin?.backgroundId;
      if (!classId || !backgroundId)
        return `<section class="bp-panel"><h3>${ctx.t("Pacchetti iniziali", "Starting packages")}</h3><p class="muted">${ctx.t("Scegli prima classe e background: i pacchetti dipendono da loro.", "Choose class and background first: the packages depend on them.")}</p></section>`;
      const start = data.equipment?.starting;
      return `<section class="bp-panel" aria-labelledby="bp-packs"><h3 id="bp-packs">${ctx.t("Pacchetti iniziali", "Starting packages")}</h3><p>${start ? `${ctx.t("Scelti", "Chosen")}: ${ctx.t("classe", "class")} (${ctx.esc(start.classOption)}) · background (${ctx.esc(start.backgroundOption)}) · ${(start.gold?.class ?? 0) + (start.gold?.background ?? 0)} ${ctx.t("mo", "gp")}` : ctx.t("Pacchetti di classe e background, oppure il loro oro: ogni oggetto entra nella tabella qui sotto con la sua fonte.", "Class and background packages, or their gold: each item enters the table below with its source.")}</p><button type="button" class="button" data-bp-packs>${start ? ctx.t("Cambia pacchetti…", "Change packages…") : ctx.t("Scegli pacchetti iniziali…", "Choose starting packages…")}</button></section>`;
    },
    bind(el, ctx, api) {
      el.querySelector("[data-bp-packs]")?.addEventListener("click", () => {
        const data = api.data();
        const classId = data.levelOrder?.[0] || data.classes?.[0]?.classId;
        const backgroundId = data.origin?.backgroundId;
        const options = startingOptions(classId, backgroundId);
        const start = data.equipment?.starting;
        openChooser(ctx, {
          mode: "draft",
          classId,
          backgroundId,
          level: 1,
          current: {
            classOption: start?.classOption ?? defaultOption(options.class),
            backgroundOption: start?.backgroundOption ?? defaultOption(options.background),
          },
          onApply: (choice) =>
            api.change((next) => {
              const plan = planStarting({ classId, backgroundId, ...choice });
              const before = next.equipment?.starting?.gold
                ? next.equipment.starting.gold.class + next.equipment.starting.gold.background
                : 0;
              next.equipment = {
                ...next.equipment,
                mode: "manual",
                items: [
                  ...(next.equipment?.items ?? []).filter(
                    (item) => !String(item.id).startsWith("bp-start:"),
                  ),
                  ...plan.items,
                ],
                currency: {
                  ...(next.equipment?.currency ?? {}),
                  gp: Math.max(0, Number(next.equipment?.currency?.gp ?? 0) - before) + plan.total,
                },
                starting: { level: 1, classId, backgroundId, ...choice, gold: plan.gold },
              };
            }),
        });
      });
    },
  },
  {
    id: "builder-plus-drafts",
    sections: ["drafts"],
    render(ctx) {
      // Closed shared drafts too: they stay readable with their history.
      const shared = cobuildSessions(ctx.state, ctx.role, { includeClosed: true });
      return `<section class="bp-panel" aria-labelledby="bp-more-ways"><h2 id="bp-more-ways">${ctx.t("Altri modi per creare", "Other ways to create")}</h2>${methodCards(ctx)}${shared.length ? `<p><button type="button" class="button" data-bp-shared>${ctx.t("Bozze condivise", "Shared drafts")} (${shared.length})</button></p>` : ""}</section>`;
    },
    bind(el, ctx) {
      bindMethods(el, ctx);
      el.querySelector("[data-bp-shared]")?.addEventListener("click", () =>
        ctx.navigate(ID, { tab: "cobuild" }),
      );
    },
  },
];

// ---------------------------------------------------------------- route

function renderRoute(ctx) {
  const tab = ctx.view.tab;
  if (tab === "quick") return renderQuick(ctx);
  if (tab === "premade") return renderPremades(ctx);
  if (tab === "cobuild") return renderCobuild(ctx);
  return `<section class="bp-page"><div class="page-heading"><div><p class="muted">${ctx.t("Personaggi", "Characters")}</p><h1>${ctx.t("Nuovo personaggio", "New character")}</h1><p class="muted">${ctx.t("Tre modi, lo stesso risultato: una scheda privata e modificabile.", "Three ways, the same result: a private, editable sheet.")}</p></div></div>${methodCards(ctx)}</section>`;
}
function bindRoute(el, ctx) {
  el.querySelectorAll("[data-bp-nav]").forEach(
    (button) => (button.onclick = () => ctx.navigate(button.dataset.bpNav)),
  );
  const tab = ctx.view.tab;
  if (tab === "quick") return bindQuick(el, ctx);
  if (tab === "premade") return bindPremades(el, ctx);
  if (tab === "cobuild") return bindCobuild(el, ctx);
  bindMethods(el, ctx);
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  registry.registerStateSlice(ID, { version: VERSION, seed: seedSlice, normalize: normalizeSlice });
  registry.registerStateSlice(COBUILD_ID, {
    version: VERSION,
    undo: "preserve",
    seed: seedCobuild,
    normalize: normalizeCobuild,
  });
  registry.registerStyles(new URL("./builder-plus.css", import.meta.url));
  registry.add("route", {
    id: ID,
    label: { it: "Nuovo personaggio", en: "New character" },
    icon: "person",
    render: renderRoute,
    bind: bindRoute,
  });
  registry.add("sheet-section", {
    id: `${ID}-build`,
    tab: "features",
    label: { it: "Livelli e rifacimento", en: "Levels and rebuild" },
    when: (ctx, actor) => actor?.kind === "character",
    render: renderBuildSection,
    bind: bindBuildSection,
  });
  registry.add("sheet-section", {
    id: `${ID}-start`,
    tab: "inventory",
    label: { it: "Dotazione iniziale", en: "Starting equipment" },
    when: (ctx, actor) => actor?.kind === "character",
    render: renderStartSection,
    bind: bindStartSection,
  });
  registry.add("notifications", {
    id: `${ID}-cobuild`,
    label: { it: "Bozze condivise", en: "Shared drafts" },
    collect(ctx) {
      return cobuildSessions(ctx.state, ctx.role)
        .map((row) => ({ row, v: cobuildView(ctx.state, row.id, ctx.role) }))
        .filter(({ v }) => v.unseen > 0 || v.conflicts.length || !v.opened)
        .map(({ row, v }) => {
          const name = v.fields.find((f) => f.id === "name")?.value || "—";
          const by =
            v.other === "dm"
              ? { it: "Il DM", en: "The DM" }
              : { it: "Il giocatore", en: "The player" };
          return {
            id: `${ID}-cobuild-${row.id}-${row.history.length}-${v.conflicts.length}`,
            title: { it: `Bozza condivisa · ${name}`, en: `Shared draft · ${name}` },
            body: v.conflicts.length
              ? {
                  it: `${v.conflicts.length} conflitti da risolvere`,
                  en: `${v.conflicts.length} conflicts to resolve`,
                }
              : !v.opened
                ? {
                    it: `${by.it} ti invita a costruire il personaggio insieme`,
                    en: `${by.en} invites you to build the character together`,
                  }
                : {
                    it: `${by.it} ha pubblicato ${v.unseen} modifiche`,
                    en: `${by.en} published ${v.unseen} changes`,
                  },
            time: row.updatedAt,
            category: v.opened ? "party" : "invites",
            by: v.other,
            target: { page: ID, params: { tab: "cobuild", id: row.id } },
          };
        });
    },
  });
  registry.add("command", {
    id: `${ID}.quick`,
    label: { it: "Crea personaggio: percorso rapido", en: "Create character: quick path" },
    run: (ctx) => openQuick(ctx, null),
  });
  registry.add("command", {
    id: `${ID}.premades`,
    label: { it: "Personaggi pronti", en: "Ready-made characters" },
    run: (ctx) => ctx.navigate(ID, { tab: "premade" }),
  });
  registry.add("command", {
    id: `${ID}.shared`,
    label: { it: "Bozze condivise dei personaggi", en: "Shared character drafts" },
    description: {
      it: "bozze condivise, costruisci con il DM, costruire insieme, personaggio del giocatore, co-costruzione",
      en: "shared drafts, build with the DM, build together, player's character, co-building",
    },
    run: (ctx) => ctx.navigate(ID, { tab: "cobuild" }),
  });
  registry.add("draft-guard", {
    id: `${ID}-guard`,
    label: { it: "Testo non salvato del nuovo personaggio", en: "Unsaved new-character text" },
    hasDraft: (ctx) => !press.deferred && Boolean(pendingChange(ctx)),
    confirm: (ctx, proceed) => {
      ctx.dialog(
        ctx.t("Salvare il testo appena scritto?", "Save the text you just wrote?"),
        `<p>${ctx.t("Il testo non è ancora stato registrato.", "The text is not recorded yet.")}</p>`,
        {
          submitLabel: ctx.t("Salva e continua", "Save and continue"),
          cancelLabel: ctx.t("Resta qui", "Stay here"),
          onSubmit: () => {
            savePending(ctx);
            proceed();
          },
        },
      );
    },
  });
  registry.on("role-changed", () => resetView());
  registry.on("reset", () => resetView());
  area = registry;
  // Builder panels last: a failure above leaves nothing of this area registered.
  for (const panel of PANELS) registerBuilderPanel(panel);
}
