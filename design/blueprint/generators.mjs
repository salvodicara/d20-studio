// B57 — Assisted procedural generators. Entry module (register) and UI.
//
// Where it appears (no new tab, no header row): Preparation › Scenes has «Genera…» beside
// «Nuova scena»; Preparation › Encounters (B19) has «Genera incontro…» (Ctrl/Cmd+G, the
// Kobold+ shortcut); the command palette lists every generator. Each opens one panel in the
// common dialog with the kinds side by side (dungeon, encounter, inn, settlement, names,
// walls from a map). Everything is a draft with a visible seed and «Rigenera»; only the
// explicit hand-offs write: the scene editor (unsaved until «Salva preparazione»), B19
// encounters, campaign World entries, B25 tables. Domain and pattern sources:
// generators-domain.mjs.

import * as G from "./generators-domain.mjs";
import * as EB from "./encounter-builder-domain.mjs";
import { uiState as encounterUi, bandLabel } from "./encounter-builder.mjs";
import {
  currentSceneDraft,
  openSceneDraft,
  renderSceneBase,
  validateSceneDraft,
} from "./preparation.mjs";
import { rollDie } from "./state.mjs";
import * as srd from "./srd-sample.mjs";
import * as SA from "./scene-assets-domain.mjs";
import { stickerById } from "./scene-assets-art.mjs";
import { createParcel, setParcelCoins, addParcelItem, selectPrepParcel } from "./loot.mjs";
import { itemFromCatalog } from "./party-stash.mjs";

const ID = G.ID;
const L = (it, en) => ({ it, en });
const TABLES = "random-tables";
const DRAFT = { local: true, visibility: "private" }; // B19's own option for encounter prep
const KINDS = [
  ["dungeon", L("Dungeon", "Dungeon"), "map"],
  ["encounter", L("Incontro", "Encounter"), "sword"],
  ["inn", L("Locanda", "Inn"), "home"],
  ["town", L("Centro abitato", "Settlement"), "campaign"],
  ["names", L("Nomi", "Names"), "person"],
  ["treasure", L("Tesoro", "Treasure"), "coins"],
  ["walls", L("Muri da mappa", "Walls from a map"), "wall"],
];
const SEEDED = ["dungeon", "encounter", "inn", "town", "names", "treasure"];
let dialogPanel = null;

// ---------------------------------------------------------------- per-viewer UI state

const byRole = new Map();
const STORE = (role) => `d20-generators:${role}`;
function session() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}
const defaults = () => ({
  kind: "dungeon",
  seeds: {},
  options: {
    dungeon: G.defaultDungeonOptions(),
    encounter: {
      difficulty: "moderate",
      type: "random",
      filters: G.emptyEncounterFilters(),
      party: "campaign",
      pcCount: 4,
      pcLevel: 3,
    },
    walls: { sceneId: null, sensitivity: 0, minCells: 1 },
    world: { access: "dms" },
    treasure: { cr: "3", mode: "hoard", count: 4 },
  },
  names: {},
  drafts: {},
  decisions: {},
  into: null,
  history: {},
  error: "",
  notice: "",
  open: null,
  rolls: new Set(),
  analysis: null,
  selected: null,
  busy: false,
});
export function uiState(ctx) {
  if (!byRole.has(ctx.role)) {
    const state = defaults();
    try {
      const saved = JSON.parse(session()?.getItem(STORE(ctx.role)) ?? "null");
      if (saved && typeof saved === "object") {
        if (KINDS.some(([id]) => id === saved.kind)) state.kind = saved.kind;
        Object.assign(state.seeds, saved.seeds ?? {});
        for (const key of Object.keys(state.options))
          Object.assign(state.options[key], saved.options?.[key] ?? {});
        Object.assign(state.names, saved.names ?? {});
        Object.assign(state.drafts, saved.drafts ?? {});
        Object.assign(state.decisions, saved.decisions ?? {});
      }
    } catch {
      // Unreadable saved view state: start from the defaults.
    }
    byRole.set(ctx.role, state);
  }
  return byRole.get(ctx.role);
}
function remember(ctx) {
  const s = uiState(ctx);
  try {
    session()?.setItem(
      STORE(ctx.role),
      JSON.stringify({
        kind: s.kind,
        seeds: s.seeds,
        options: s.options,
        names: s.names,
        drafts: s.drafts,
        decisions: s.decisions,
      }),
    );
  } catch {
    // Storage blocked: the drafts stay in memory for this visit.
  }
}
export function resetUi() {
  byRole.clear();
  dialogPanel = null;
}

// ---------------------------------------------------------------- helpers

const message = (ctx, error) =>
  error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error);
const num = (ctx, value, digits = 0) =>
  new Intl.NumberFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
    maximumFractionDigits: digits,
    useGrouping: "always",
  }).format(Number(value) || 0);
const xpText = (ctx, xp) => `${num(ctx, xp)} ${ctx.t("PE", "XP")}`;
const key = (value) => `data-gen-key="${value}"`;
const option = (ctx, value, text, current) =>
  `<option value="${ctx.esc(value)}" ${String(current) === String(value) ? "selected" : ""}>${ctx.esc(text)}</option>`;
const kindLabel = (ctx, kind) => ctx.label(KINDS.find(([id]) => id === kind)[1]);
const sourceLabel = (ctx, source) =>
  ({
    seed: ctx.t("dal seme", "from the seed"),
    digital: ctx.t("dado digitale", "digital die"),
    physical: ctx.t("dado fisico", "physical die"),
    manual: ctx.t("scelta del DM", "DM’s choice"),
    adjusted: ctx.t("adattata", "adjusted"),
  })[source] ?? source;
// How to roll a die that is not a standard one with a real die (d5: a d6, reroll the 6).
const dieHint = (ctx, sides) => {
  const hint = G.physicalDieFor(sides);
  return hint
    ? ` <span class="muted">${ctx.esc(ctx.t(`(con un d${hint.die}: ritira oltre ${sides})`, `(with a d${hint.die}: reroll above ${sides})`))}</span>`
    : "";
};
const exprHelp = (ctx, pc) =>
  ctx.t(
    `Numero, dadi (1d4+1), $PC = ${pc} personaggi (2*$PC), intervallo $PC..2*$PC.`,
    `Number, dice (1d4+1), $PC = ${pc} characters (2*$PC), range $PC..2*$PC.`,
  );
const openEncounterOf = (ctx) => {
  const s = uiState(ctx);
  const slice = ctx.state.ext?.[EB.ID];
  return s.into ? (slice?.encounters.find((e) => e.id === s.into) ?? null) : null;
};

// Party that sets the budget and $PC: campaign characters, the open B19 encounter's party,
// or a typical party (Kobold+ party panel).
export function partyFor(ctx) {
  const o = uiState(ctx).options.encounter;
  const open = openEncounterOf(ctx);
  if (o.party === "encounter" && open) {
    const party = EB.partyOf(ctx.state, open);
    return {
      mode: "encounter",
      members: party.members,
      levels: party.members.map((m) => m.level),
    };
  }
  if (o.party === "custom") {
    const count = Math.max(1, Math.min(8, Number(o.pcCount) || 4));
    const level = Math.max(1, Math.min(20, Number(o.pcLevel) || 1));
    return { mode: "custom", members: [], levels: Array(count).fill(level) };
  }
  const members = EB.campaignParty(ctx.state);
  return { mode: "campaign", members, levels: members.map((m) => m.level) };
}

function build(ctx, kind, seed) {
  const s = uiState(ctx);
  if (kind === "dungeon") return G.generateDungeon({ seed, ...s.options.dungeon });
  if (kind === "treasure") return G.generateTreasure({ seed, ...s.options.treasure });
  if (kind === "encounter") {
    const o = s.options.encounter;
    const party = partyFor(ctx);
    return G.generateEncounter({
      seed,
      levels: party.levels,
      party: { mode: party.mode },
      difficulty: o.difficulty,
      type: o.type,
      filters: o.filters,
      ebSlice: ctx.state.ext?.[EB.ID] ?? null,
    });
  }
  return G.generateSettlement(kind, { seed, rtSlice: ctx.state.ext?.[TABLES] ?? null });
}
/** Replaces the current kind's draft; the previous one stays one click away. */
export function regenerate(ctx, { seed = null, kind = uiState(ctx).kind } = {}) {
  const s = uiState(ctx);
  const next = seed === null ? G.newSeed(ctx.rollDie ?? rollDie) : G.requireSeed(seed);
  s.error = "";
  try {
    const draft = build(ctx, kind, next);
    pushHistory(s, kind);
    s.drafts[kind] = draft;
    s.seeds[kind] = next;
    s.notice = "";
  } catch (error) {
    s.error = message(ctx, error);
  }
  remember(ctx);
  return s.drafts[kind] ?? null;
}
function ensureDraft(ctx, kind) {
  const s = uiState(ctx);
  if (!SEEDED.includes(kind) || s.drafts[kind]) return;
  regenerate(ctx, { kind, seed: s.seeds[kind] ?? null });
}
const HISTORY = 10;
function pushHistory(s, kind) {
  if (!s.drafts[kind]) return;
  const list = (s.history[kind] ??= []);
  list.push(s.drafts[kind]);
  if (list.length > HISTORY) list.shift();
}
/** Back to the previous draft, with the options that produced it (same seed + options). */
export function previousDraft(ctx) {
  const s = uiState(ctx);
  const previous = s.history[s.kind]?.pop();
  if (!previous) return false;
  s.drafts[s.kind] = previous;
  s.seeds[s.kind] = previous.seed;
  if (s.kind === "dungeon" && previous.options) Object.assign(s.options.dungeon, previous.options);
  if (s.kind === "encounter" && previous.options) {
    const { difficulty, type, filters } = previous.options;
    Object.assign(s.options.encounter, { difficulty, type, filters: { ...filters } });
  }
  s.error = "";
  remember(ctx);
  return true;
}
function setDraft(ctx, draft) {
  const s = uiState(ctx);
  pushHistory(s, s.kind);
  s.drafts[s.kind] = draft;
  s.error = "";
  remember(ctx);
}
function tryDraft(ctx, change) {
  const s = uiState(ctx);
  try {
    setDraft(ctx, change(s.drafts[s.kind]));
    return true;
  } catch (error) {
    s.error = message(ctx, error);
    return false;
  }
}

// ---------------------------------------------------------------- panel markup

function kindsHTML(ctx) {
  const s = uiState(ctx);
  return `<div class="gen-kinds" role="tablist" aria-label="${ctx.t("Cosa generare", "What to generate")}">${KINDS.map(
    ([id, text, glyph]) =>
      `<button type="button" role="tab" class="gen-kind ${s.kind === id ? "active" : ""}" aria-selected="${s.kind === id}" tabindex="${s.kind === id ? 0 : -1}" data-gen-kind="${id}" ${key(`kind-${id}`)}>${ctx.icon(glyph)}<span>${ctx.esc(ctx.label(text))}</span></button>`,
  ).join("")}</div>`;
}
function seedHTML(ctx) {
  const s = uiState(ctx);
  const seed = s.seeds[s.kind] ?? "";
  const back = s.history[s.kind]?.length
    ? `<button type="button" class="button quiet" data-gen-act="back" ${key("back")}>${ctx.icon("undo")} ${ctx.t("Bozza precedente", "Previous draft")}</button>`
    : "";
  return `<div class="gen-seedbar"><label class="field gen-seed">${ctx.t("Seme", "Seed")}<input data-gen-seed ${key("seed")} value="${ctx.esc(seed)}" maxlength="24" autocomplete="off" spellcheck="false" aria-describedby="gen-seed-help"></label><button type="button" class="button primary" data-gen-act="regen" ${key("regen")} aria-keyshortcuts="Control+G Meta+G">${ctx.icon("dice")} ${ctx.t("Rigenera", "Regenerate")}</button>${back}<span class="badge gen-draft-badge">${ctx.t("Bozza · non ancora in gioco", "Draft · not in play yet")}</span></div><p class="muted gen-help" id="gen-seed-help">${ctx.t("Stesso seme e stesse opzioni danno lo stesso risultato. Invio sul seme per usarlo; Rigenera (Ctrl/Cmd+G) sceglie un seme nuovo.", "The same seed and options give the same result. Press Enter on the seed to use it; Regenerate (Ctrl/Cmd+G) picks a new seed.")}</p>`;
}
function statusHTML(ctx) {
  const s = uiState(ctx);
  return `${s.error ? `<p class="error gen-error" role="alert" data-gen-error>${ctx.esc(s.error)}</p>` : ""}<p class="gen-notice" role="status" aria-live="polite" data-gen-notice>${ctx.esc(s.notice)}</p>`;
}
function select(ctx, path, text, pairs, current) {
  return `<label class="field">${ctx.esc(text)}<select data-gen-opt="${path}" ${key(`opt-${path}`)}>${pairs
    .map(([value, label]) => option(ctx, value, ctx.label(label), current))
    .join("")}</select></label>`;
}
function checkbox(ctx, path, text, checked) {
  return `<label class="gen-check"><input type="checkbox" data-gen-opt="${path}" ${key(`opt-${path}`)} ${checked ? "checked" : ""}> ${ctx.esc(text)}</label>`;
}

// ---- dungeon

// PR-17: the furniture drawn with the scene-object stickers (as the Table draws them).
function furnitureSVG(ctx, dungeon) {
  if (dungeon.options?.furnish === false) return "";
  const c = dungeon.cell;
  return G.furnishDungeon(dungeon)
    .map((p) => {
      const art = stickerById(p.sticker);
      if (!art) return "";
      const width = (art.meters / G.METERS_PER_CELL) * c;
      const scale = width / 100;
      return `<g class="gen-prop${p.hidden ? " is-hidden" : ""}" transform="translate(${p.x} ${p.y}) scale(${scale.toFixed(3)})"><title>${ctx.esc(ctx.label(p.name))}</title>${art.svg}</g>`;
    })
    .join("");
}
function dungeonSVG(ctx, dungeon) {
  const c = dungeon.cell;
  const cells = [];
  dungeon.region.forEach((row, y) =>
    row.forEach((value, x) => {
      if (value === -1)
        cells.push(
          `<rect class="gen-corridor" x="${x * c}" y="${y * c}" width="${c}" height="${c}"/>`,
        );
    }),
  );
  const rooms = dungeon.rooms
    .map(
      (r) =>
        `<rect class="gen-room gen-room-${r.content}" x="${r.x * c}" y="${r.y * c}" width="${r.w * c}" height="${r.h * c}"/><text class="gen-room-number" x="${r.x * c + 10}" y="${r.y * c + 30}">${r.id}</text>`,
    )
    .join("");
  const line = (w, cls) =>
    `<line class="${cls}" x1="${w.a.x}" y1="${w.a.y}" x2="${w.b.x}" y2="${w.b.y}"/>`;
  const walls = dungeon.walls.map((w) => line(w, "gen-wall")).join("");
  const doors = dungeon.doors
    .map((d) =>
      line(
        d,
        `gen-door ${d.doorState === "locked" ? "is-locked" : ""} ${d.secret ? "is-secret" : ""}`,
      ),
    )
    .join("");
  const grid = `<defs><pattern id="gen-grid" width="${c}" height="${c}" patternUnits="userSpaceOnUse"><path d="M ${c} 0 H 0 V ${c}" fill="none" class="gen-grid-line"/></pattern></defs>`;
  return `<svg class="gen-map" viewBox="0 0 ${dungeon.width} ${dungeon.height}" role="img" aria-label="${ctx.esc(ctx.t(`Anteprima del dungeon: ${dungeon.rooms.length} stanze`, `Dungeon preview: ${dungeon.rooms.length} rooms`))}">${grid}<rect class="gen-rock" width="${dungeon.width}" height="${dungeon.height}"/>${cells.join("")}${rooms}<rect width="${dungeon.width}" height="${dungeon.height}" fill="url(#gen-grid)"/>${furnitureSVG(ctx, dungeon)}${walls}${doors}</svg>`;
}
function dungeonHTML(ctx) {
  const s = uiState(ctx);
  const o = s.options.dungeon;
  const d = s.drafts.dungeon;
  const options = `<fieldset class="gen-options"><legend>${ctx.t("Opzioni (donjon)", "Options (donjon)")}</legend>${select(
    ctx,
    "dungeon.size",
    ctx.t("Dimensione", "Size"),
    Object.entries(G.DUNGEON_SIZES).map(([id, v]) => [
      id,
      L(`${v.label.it} · ${v.cols}×${v.rows} celle`, `${v.label.en} · ${v.cols}×${v.rows} cells`),
    ]),
    o.size,
  )}${select(
    ctx,
    "dungeon.rooms",
    ctx.t("Stanze", "Rooms"),
    Object.entries(G.ROOM_DENSITY).map(([id, v]) => [id, v.label]),
    o.rooms,
  )}${select(
    ctx,
    "dungeon.roomSize",
    ctx.t("Dimensione delle stanze", "Room size"),
    Object.entries(G.ROOM_SIZES).map(([id, v]) => [id, v.label]),
    o.roomSize,
  )}${select(ctx, "dungeon.corridors", ctx.t("Corridoi", "Corridors"), Object.entries(G.CORRIDORS), o.corridors)}${select(
    ctx,
    "dungeon.doors",
    ctx.t("Porte", "Doors"),
    Object.entries(G.DOORS),
    o.doors,
  )}${checkbox(ctx, "dungeon.loops", ctx.t("Anelli: più di un percorso tra le stanze", "Loops: more than one path between rooms"), o.loops)}${checkbox(ctx, "dungeon.secret", ctx.t("Porte segrete (solo DM)", "Secret doors (DM only)"), o.secret)}${checkbox(ctx, "dungeon.furnish", ctx.t("Arreda le stanze (mobili e oggetti per tipo di stanza)", "Furnish the rooms (furniture and props by room type)"), o.furnish !== false)}${checkbox(ctx, "dungeon.numbers", ctx.t("Numeri delle stanze sull’immagine (li vedono anche i giocatori)", "Room numbers on the image (players see them too)"), o.numbers)}</fieldset>`;
  if (!d) return `<div class="gen-layout">${options}<div class="gen-result"></div></div>`;
  const stats = G.dungeonStats(d);
  const name = s.names.dungeon?.[d.seed] ?? ctx.label(d.name);
  const furniture = d.options?.furnish === false ? [] : G.furnishDungeon(d);
  const furnished = (room) => {
    const list = furniture.filter((p) => p.room === room);
    return list.length
      ? `<br><span class="muted">${ctx.t("Arredo", "Furniture")}: ${ctx.esc(list.map((p) => ctx.label(p.name) + (p.hidden ? ctx.t(" (solo DM)", " (DM only)") : "")).join(", "))}</span>`
      : "";
  };
  const key_ = d.rooms
    .map(
      (r) =>
        `<li data-gen-room="${r.id}"><strong>${r.id}. ${ctx.esc(ctx.label(r.contentLabel))}</strong> <span class="muted">${r.w}×${r.h} ${ctx.t("celle", "cells")} · ${r.exits} ${r.exits === 1 ? ctx.t("uscita", "exit") : ctx.t("uscite", "exits")}</span><br>${ctx.esc(ctx.label(r.feature))}${furnished(r.id)}${r.content === "monster" ? ` <button type="button" class="button quiet gen-inline" data-gen-act="room-encounter" data-room="${r.id}" ${key(`room-${r.id}`)}>${ctx.icon("sword")} ${ctx.t("Genera incontro", "Generate encounter")}</button>` : ""}</li>`,
    )
    .join("");
  return `<div class="gen-layout">${options}<div class="gen-result"><label class="field">${ctx.t("Nome della scena", "Scene name")}<input data-gen-name="dungeon" ${key("name-dungeon")} maxlength="100" value="${ctx.esc(name)}"></label>${dungeonSVG(ctx, d)}<p class="gen-stats" data-gen-stats>${ctx.esc(
    ctx.t(
      `${stats.rooms} stanze · ${stats.walls} muri · ${stats.doors} porte (${stats.locked} a chiave, ${stats.secret} segrete) · ${stats.arches} archi · ${d.cols}×${d.rows} celle da ${num(ctx, G.METERS_PER_CELL, 1)} m`,
      `${stats.rooms} rooms · ${stats.walls} walls · ${stats.doors} doors (${stats.locked} locked, ${stats.secret} secret) · ${stats.arches} arches · ${d.cols}×${d.rows} cells of ${num(ctx, G.METERS_PER_CELL, 1)} m`,
    ),
  )}</p><p class="gen-legend muted"><span class="gen-swatch is-door"></span>${ctx.t("porta", "door")} <span class="gen-swatch is-locked"></span>${ctx.t("a chiave", "locked")} <span class="gen-swatch is-secret"></span>${ctx.t("segreta: solo il DM la vede al Tavolo", "secret: only the DM sees it at the Table")}</p><details class="gen-key" open><summary>${ctx.t("Legenda delle stanze (note DM)", "Room key (DM notes)")}</summary><ol class="gen-room-list">${key_}</ol></details><div class="toolbar gen-actions"><button type="button" class="button primary" data-gen-act="dungeon-open" ${key("dungeon-open")}>${ctx.icon("map")} ${ctx.t("Apri come bozza di scena", "Open as a scene draft")}</button></div><p class="muted">${ctx.t("La bozza si apre nell’editor della scena con muri e porte: la scena esiste solo dopo «Salva preparazione». Legenda e seme vanno nelle note riservate ai DM.", "The draft opens in the scene editor with walls and doors: the scene exists only after “Save preparation”. The key and seed go into the DM-only notes.")}</p></div></div>`;
}

// ---- encounter

function encounterOptionsHTML(ctx) {
  const s = uiState(ctx);
  const o = s.options.encounter;
  const open = openEncounterOf(ctx);
  const party = partyFor(ctx);
  const campaign = EB.campaignParty(ctx.state);
  return `<fieldset class="gen-options"><legend>${ctx.t("Opzioni (Kobold+)", "Options (Kobold+)")}</legend><fieldset class="gen-choice"><legend>${ctx.t("Gruppo", "Party")}</legend><label><input type="radio" name="gen-party" value="campaign" data-gen-opt="encounter.party" ${key("party-campaign")} ${party.mode === "campaign" ? "checked" : ""}> ${ctx.t("Gruppo della campagna", "Campaign party")} <span class="muted">(${ctx.esc(campaign.map((m) => `${m.name} ${m.level}`).join(" · ") || "—")})</span></label>${open ? `<label><input type="radio" name="gen-party" value="encounter" data-gen-opt="encounter.party" ${key("party-encounter")} ${party.mode === "encounter" ? "checked" : ""}> ${ctx.esc(ctx.t(`Gruppo di «${open.name}»`, `Party of “${open.name}”`))}</label>` : ""}<label><input type="radio" name="gen-party" value="custom" data-gen-opt="encounter.party" ${key("party-custom")} ${party.mode === "custom" ? "checked" : ""}> ${ctx.t("Gruppo tipo", "Typical party")}</label>${
    party.mode === "custom"
      ? `<div class="gen-inline-fields"><label class="field">${ctx.t("Personaggi", "Characters")}<select data-gen-opt="encounter.pcCount" ${key("opt-pc")}>${Array.from({ length: 8 }, (_, i) => option(ctx, i + 1, i + 1, o.pcCount)).join("")}</select></label><label class="field">${ctx.t("Livello", "Level")}<select data-gen-opt="encounter.pcLevel" ${key("opt-level")}>${Array.from({ length: 20 }, (_, i) => option(ctx, i + 1, i + 1, o.pcLevel)).join("")}</select></label></div>`
      : ""
  }</fieldset>${select(
    ctx,
    "encounter.difficulty",
    ctx.t("Difficoltà 2024", "2024 difficulty"),
    G.DIFFICULTIES.map((d) => [d, srd.LABELS.encounterDifficulty[d]]),
    o.difficulty,
  )}${select(
    ctx,
    "encounter.type",
    ctx.t("Tipo d’incontro", "Encounter type"),
    G.ENCOUNTER_TYPES.map((t) => [t.id, t.label]),
    o.type,
  )}${select(
    ctx,
    "encounter.filters.type",
    ctx.t("Tipo di creatura", "Creature type"),
    [
      ["", L("Tutti", "All")],
      ...EB.creatureTypesInCatalog().map((t) => [t, srd.LABELS.creatureType[t] ?? L(t, t)]),
    ],
    o.filters.type,
  )}<div class="gen-inline-fields">${select(ctx, "encounter.filters.crMin", ctx.t("GS minimo", "Minimum CR"), [["", L("Qualsiasi", "Any")], ...EB.CR_OPTIONS.map((cr) => [cr, L(cr, cr)])], o.filters.crMin)}${select(
    ctx,
    "encounter.filters.crMax",
    ctx.t("GS massimo", "Maximum CR"),
    [["", L("Qualsiasi", "Any")], ...EB.CR_OPTIONS.map((cr) => [cr, L(cr, cr)])],
    o.filters.crMax,
  )}</div><p class="muted">${ctx.t("Le creature vengono dal compendio SRD 2024 e dai tuoi blocchi personalizzati del costruttore.", "Monsters come from the 2024 SRD compendium and your custom blocks in the builder.")}</p></fieldset>`;
}
function rowHTML(ctx, draft, row) {
  const s = uiState(ctx);
  const name = ctx.label(row.name);
  const dice = row.form.dice.length;
  const physicalOpen = s.open === `row:${row.id}`;
  const facesText = row.faces.length
    ? ` (${row.faces.join(" + ")}${row.form.constant ? ` ${row.form.constant > 0 ? "+" : "−"} ${Math.abs(row.form.constant)}` : ""})`
    : "";
  return `<li class="gen-row" data-gen-row="${ctx.esc(row.id)}"><div class="gen-row-main"><strong>${ctx.esc(name)}</strong>${row.leader ? ` <span class="badge">${ctx.t("capo", "leader")}</span>` : ""}${row.custom ? ` <span class="badge">${ctx.t("personalizzato", "custom")}</span>` : ""}<span class="muted">${ctx.t("GS", "CR")} ${ctx.esc(row.cr)} · ${xpText(ctx, row.xp)} ${ctx.t("ciascuno", "each")}</span></div><div class="gen-row-count"><label class="field gen-expr">${ctx.t("Quantità", "Count")}<input data-gen-expr="${ctx.esc(row.id)}" ${key(`expr-${row.id}`)} value="${ctx.esc(row.expr)}" maxlength="40" aria-describedby="gen-expr-help"></label><output class="gen-count" data-gen-count="${ctx.esc(row.id)}">${dice ? `${ctx.esc(G.diceText(row.form))}${ctx.esc(facesText)} → ` : ""}<strong>${row.count}</strong>${row.clamped ? ` <span class="badge">${ctx.t("limite 1–20", "limit 1–20")}</span>` : ""} <span class="badge gen-source" data-gen-source>${ctx.esc(sourceLabel(ctx, row.source))}</span></output></div><div class="toolbar gen-row-tools"><button type="button" class="button quiet" data-gen-act="minus" data-row="${ctx.esc(row.id)}" ${key(`minus-${row.id}`)} aria-label="${ctx.esc(ctx.t(`Una copia in meno di ${name}`, `One fewer ${name}`))}" ${row.count <= 1 ? `disabled aria-describedby="gen-why-min-${ctx.esc(row.id)}"` : ""}>−</button>${row.count <= 1 ? `<span class="visually-hidden" id="gen-why-min-${ctx.esc(row.id)}">${ctx.t("Una copia è il minimo: rigenera l’incontro per cambiare le creature.", "One copy is the minimum: regenerate the encounter to change the creatures.")}</span>` : ""}<button type="button" class="button quiet" data-gen-act="plus" data-row="${ctx.esc(row.id)}" ${key(`plus-${row.id}`)} aria-label="${ctx.esc(ctx.t(`Una copia in più di ${name}`, `One more ${name}`))}" ${row.count >= G.MAX_COUNT ? `disabled aria-describedby="gen-why-max-${ctx.esc(row.id)}"` : ""}>+</button>${row.count >= G.MAX_COUNT ? `<span class="visually-hidden" id="gen-why-max-${ctx.esc(row.id)}">${ctx.t(`Al massimo ${G.MAX_COUNT} copie per riga: aggiungine un’altra riga.`, `At most ${G.MAX_COUNT} copies per row: add another row.`)}</span>` : ""}${
    dice
      ? `<button type="button" class="button quiet" data-gen-act="roll" data-row="${ctx.esc(row.id)}" ${key(`roll-${row.id}`)}>${ctx.icon("dice")} ${ctx.t("Tira", "Roll")} ${ctx.esc(G.diceText({ dice: row.form.dice, constant: 0 }))}</button><details class="gen-physical" ${physicalOpen ? "open" : ""}><summary data-gen-open="row:${ctx.esc(row.id)}" ${key(`phys-${row.id}`)}>${ctx.t("Dado fisico", "Physical die")}</summary><div class="gen-physical-body">${row.form.dice
          .map(
            (sides, i) =>
              `<label class="field">d${sides}${dieHint(ctx, sides)}<input type="number" min="1" max="${sides}" inputmode="numeric" data-gen-face="${ctx.esc(row.id)}" data-index="${i}" ${key(`face-${row.id}-${i}`)}></label>`,
          )
          .join(
            "",
          )}<button type="button" class="button" data-gen-act="physical" data-row="${ctx.esc(row.id)}" ${key(`physical-${row.id}`)}>${ctx.t("Registra", "Record")}</button></div></details>`
      : ""
  }<button type="button" class="button quiet" data-gen-act="remove" data-row="${ctx.esc(row.id)}" ${key(`remove-${row.id}`)} aria-label="${ctx.esc(ctx.t(`Togli ${name}`, `Remove ${name}`))}">${ctx.icon("close")} ${ctx.t("Togli", "Remove")}</button></div></li>`;
}
function encounterHTML(ctx) {
  const s = uiState(ctx);
  const d = s.drafts.encounter;
  const options = encounterOptionsHTML(ctx);
  if (!d) return `<div class="gen-layout">${options}<div class="gen-result"></div></div>`;
  const goal = srd.LABELS.encounterDifficulty[d.options.difficulty];
  const b = d.budget;
  const mismatch = d.band !== d.options.difficulty;
  const open = openEncounterOf(ctx);
  const name = s.names.encounter?.[d.seed] ?? G.defaultEncounterName(d, ctx.lang);
  const typeText = ctx.label(G.ENCOUNTER_TYPES.find((t) => t.id === d.options.type).label);
  return `<div class="gen-layout">${options}<div class="gen-result"><section class="gen-budget" data-gen-budget><p>${ctx.t("Budget 2024 per", "2024 budget for")} ${d.pc} ${ctx.t("personaggi", "characters")} (${ctx.esc(d.levels.join(", "))}): ${ctx.esc(bandLabel(ctx, "low"))} ${num(ctx, b.low)} · ${ctx.esc(bandLabel(ctx, "moderate"))} ${num(ctx, b.moderate)} · ${ctx.esc(bandLabel(ctx, "high"))} ${num(ctx, b.high)} ${ctx.t("PE", "XP")}. ${ctx.t("Obiettivo Kobold+", "Kobold+ target")}: ${num(ctx, b[d.options.difficulty])} × ${num(ctx, G.KOBOLD_FUDGE, 2)} = <strong>${xpText(ctx, d.target)}</strong>.</p><p class="muted">SRD 5.2.1 · ${ctx.esc(EB.pagesText(G.SOURCES.budget, ctx.lang))} · ${ctx.esc(ctx.t(`modello ${d.sample + 1} «${typeText}»`, `template ${d.sample + 1} “${typeText}”`))}</p></section><ol class="gen-rows">${d.rows.map((row) => rowHTML(ctx, d, row)).join("") || `<li class="empty-state">${ctx.t("Nessuna creatura nella bozza.", "No monsters in the draft.")}</li>`}</ol><p class="muted" id="gen-expr-help">${ctx.esc(exprHelp(ctx, d.pc))}</p><p class="gen-total" data-gen-total>${ctx.t("Totale", "Total")}: <strong>${xpText(ctx, d.xp)}</strong> · <span class="badge eb-band eb-band-${d.band}" data-gen-band="${d.band}">${ctx.esc(bandLabel(ctx, d.band))}</span> <span class="muted">(${ctx.t("obiettivo", "target")}: ${ctx.esc(ctx.label(goal))})</span></p>${
    mismatch && d.rows.length
      ? `<p class="gen-adjust"><button type="button" class="button" data-gen-act="adjust" ${key("adjust")}>${ctx.esc(ctx.t(`Adatta a «${goal.it}»`, `Adjust to “${goal.en}”`))}</button> <span class="muted">${ctx.t("Aggiunge o toglie copie finché il totale entra nella fascia (5e.tools).", "Adds or removes copies until the total fits the band (5e.tools).")}</span></p>`
      : ""
  }<label class="field">${ctx.t("Nome dell’incontro", "Encounter name")}<input data-gen-name="encounter" ${key("name-encounter")} maxlength="100" value="${ctx.esc(name)}"></label><div class="toolbar gen-actions"><button type="button" class="button primary" data-gen-act="encounter-save" ${key("encounter-save")} ${d.rows.length ? "" : 'disabled aria-describedby="gen-why-encounter"'}>${ctx.icon("sword")} ${ctx.t("Salva come nuovo incontro", "Save as a new encounter")}</button>${open ? `<button type="button" class="button" data-gen-act="encounter-into" ${key("encounter-into")} ${d.rows.length ? "" : 'disabled aria-describedby="gen-why-encounter"'}>${ctx.esc(ctx.t(`Aggiungi a «${open.name}»`, `Add to “${open.name}”`))}</button>` : ""}</div>${d.rows.length ? "" : `<p class="gen-why" id="gen-why-encounter">${ctx.t("L’incontro è vuoto: genera o aggiungi almeno una creatura.", "The encounter is empty: generate or add at least one creature.")}</p>`}<p class="muted">${ctx.t("Il salvataggio crea l’incontro nel costruttore (non su una scena): consegna, iniziativa e avvio restano lì. Annulla ultima modifica lo toglie.", "Saving creates the encounter in the builder (not on a scene): hand-off, initiative and start stay there. Undo last change removes it.")}</p></div></div>`;
}

// ---- inn, settlement, names (B25 tables)

function fieldHTML(ctx, draft, field) {
  const s = uiState(ctx);
  const names = draft.kind === "names";
  if (field.missing)
    return `<div class="gen-field is-missing" data-gen-field="${ctx.esc(field.id)}"><dt>${ctx.esc(ctx.label(field.label))}</dt><dd class="muted">${ctx.esc(ctx.t(`Tabella non trovata in «Tabelle e mazzi»: ${field.missing.join(", ")}.`, `Table not found in “Tables and decks”: ${field.missing.join(", ")}.`))}</dd></div>`;
  const steps = field.steps
    .map((step, i) => {
      const id = `${field.id}:${i}`;
      const open = s.open === `step:${id}`;
      return `<li class="gen-step"><span class="gen-die">${ctx.esc(ctx.label(step.tableName).replace(/^Generatore · |^Generator · /, ""))} · d${step.sides} <strong data-gen-face-value="${ctx.esc(id)}">${step.face}</strong> <span class="badge gen-source">${ctx.esc(sourceLabel(ctx, step.mode))}</span></span><button type="button" class="button quiet gen-inline" data-gen-act="step-roll" data-field="${ctx.esc(field.id)}" data-step="${i}" ${key(`step-roll-${id}`)} aria-label="${ctx.esc(ctx.t(`Ritira il d${step.sides}`, `Reroll the d${step.sides}`))}">${ctx.icon("dice")}</button><details class="gen-physical" ${open ? "open" : ""}><summary data-gen-open="step:${ctx.esc(id)}" ${key(`step-open-${id}`)}>${ctx.t("Dado fisico", "Physical die")}</summary><div class="gen-physical-body"><label class="field">d${step.sides}${dieHint(ctx, step.sides)}<input type="number" min="1" max="${step.sides}" inputmode="numeric" data-gen-step-face="${ctx.esc(id)}" ${key(`step-face-${id}`)}></label><button type="button" class="button" data-gen-act="step-physical" data-field="${ctx.esc(field.id)}" data-step="${i}" ${key(`step-physical-${id}`)}>${ctx.t("Registra", "Record")}</button></div></details></li>`;
    })
    .join("");
  const pick = names
    ? `<label class="gen-check"><input type="checkbox" data-gen-pick="${ctx.esc(field.id)}" ${key(`pick-${field.id}`)} ${draft.selected.includes(field.id) ? "checked" : ""}> ${ctx.t("Salva", "Save")}</label>`
    : "";
  // The rolls stay one tap away (collapsed), their faces visible in the summary line.
  const faces = field.steps
    .map((step) => `d${step.sides} ${step.face} (${sourceLabel(ctx, step.mode)})`)
    .join(" · ");
  const rollsOpen = s.rolls.has(field.id) || s.open?.startsWith(`step:${field.id}:`);
  return `<div class="gen-field" data-gen-field="${ctx.esc(field.id)}"><dt>${ctx.esc(ctx.label(field.label))}</dt><dd><div class="gen-field-line"><input class="gen-field-text" data-gen-field-text="${ctx.esc(field.id)}" ${key(`text-${field.id}`)} maxlength="200" value="${ctx.esc(G.fieldText(field, ctx.lang))}" aria-label="${ctx.esc(ctx.label(field.label))}">${field.edited !== null ? `<span class="badge">${ctx.t("modificato dal DM", "edited by the DM")}</span>` : ""}${pick}</div><details class="gen-rolls" data-gen-rolls="${ctx.esc(field.id)}" ${rollsOpen ? "open" : ""}><summary data-gen-open-rolls="${ctx.esc(field.id)}" ${key(`rolls-${field.id}`)}>${ctx.t("Tiri", "Rolls")}: ${ctx.esc(faces)}</summary><ul class="gen-steps">${steps}</ul></details></dd></div>`;
}
function settlementHTML(ctx) {
  const s = uiState(ctx);
  const d = s.drafts[s.kind];
  const rt = ctx.state.ext?.[TABLES] ?? null;
  const installed = G.installedTables(rt);
  const tables = [...new Set((d?.fields ?? []).flatMap((f) => f.tables))];
  const access = s.options.world.access;
  const info = `<fieldset class="gen-options"><legend>${ctx.t("Tabelle casuali (donjon, motore B25)", "Random tables (donjon, B25 engine)")}</legend><ul class="gen-table-list">${tables
    .map((id) => {
      const own = rt?.tables.find((t) => t.id === id);
      const def = own ?? G.GENERATOR_TABLES.find((t) => t.id === id);
      return `<li>${ctx.esc(def ? ctx.label(def.name) : id)} ${def ? `· d${def.sides}` : ""} ${own ? `<span class="badge">${ctx.t("in Tabelle e mazzi", "in Tables and decks")}</span>` : ""}</li>`;
    })
    .join(
      "",
    )}</ul><button type="button" class="button quiet" data-gen-act="edit-tables" ${key("edit-tables")}>${installed.length === G.GENERATOR_TABLES.length ? ctx.t("Modifica le tabelle in «Tabelle e mazzi»", "Edit the tables in “Tables and decks”") : ctx.t("Copia le tabelle in «Tabelle e mazzi» per modificarle", "Copy the tables to “Tables and decks” to edit them")}</button><p class="muted">${ctx.t("Ogni voce è un tiro sulla tabella: correggilo con un dado fisico, ritiralo o riscrivi il testo.", "Each field is a roll on the table: correct it with a physical die, reroll it or rewrite the text.")}</p></fieldset>`;
  if (!d) return `<div class="gen-layout">${info}<div class="gen-result"></div></div>`;
  const saveText =
    d.kind === "names"
      ? d.selected.length === 1
        ? ctx.t("Salva 1 nome come persona nel Mondo", "Save 1 name as a person in the World")
        : ctx.t(
            `Salva ${d.selected.length} nomi come persone nel Mondo`,
            `Save ${d.selected.length} names as people in the World`,
          )
      : ctx.t("Salva come luogo nel Mondo", "Save as a place in the World");
  return `<div class="gen-layout">${info}<div class="gen-result"><dl class="gen-fields">${d.fields.map((f) => fieldHTML(ctx, d, f)).join("")}</dl><div class="gen-save">${select(
    ctx,
    "world.access",
    ctx.t("Chi può leggerlo", "Who can read it"),
    Object.entries(G.WORLD_ACCESS),
    access,
  )}<div class="toolbar gen-actions"><button type="button" class="button primary" data-gen-act="world-save" ${key("world-save")} ${d.kind === "names" && !d.selected.length ? 'disabled aria-describedby="gen-why-world"' : ""}>${ctx.icon("campaign")} ${ctx.esc(saveText)}</button></div>${d.kind === "names" && !d.selected.length ? `<p class="gen-why" id="gen-why-world">${ctx.t("Nessun nome scelto: seleziona almeno un nome dall’elenco.", "No name chosen: select at least one name from the list.")}</p>` : ""}</div><p class="muted">${ctx.t("Diventa una voce del Mondo della campagna, con cronologia e condivisione proprie; da lì si corregge o si condivide in seguito.", "It becomes a campaign World entry with its own history and sharing; it is corrected or shared from there later.")}</p></div></div>`;
}

// ---- walls from a map (Forecast)

function wallsHTML(ctx) {
  const s = uiState(ctx);
  const o = s.options.walls;
  const scenes = wallsScenes(ctx);
  const scene = wallsScene(ctx);
  if (!scene)
    return `<div class="empty-state"><h3>${ctx.t("Nessuna scena", "No scenes")}</h3><p>${ctx.t("Crea una scena con una mappa per rilevarne i muri.", "Create a scene with a map to detect its walls.")}</p></div>`;
  const a = s.analysis?.sceneId === scene.id ? s.analysis : null;
  const decisions = s.decisions[scene.id] ?? {};
  const offered = a ? a.proposals.filter((p) => !p.existing) : [];
  const accepted = offered.filter((p) => decisions[p.id] === "accepted").length;
  const rejected = offered.filter((p) => decisions[p.id] === "rejected").length;
  const options = `<fieldset class="gen-options"><legend>${ctx.t("Analisi della mappa (Forecast)", "Map analysis (Forecast)")}</legend><label class="field">${ctx.t("Scena", "Scene")}<select data-gen-opt="walls.sceneId" ${key("opt-walls-scene")}>${scenes.map((sc) => option(ctx, sc.id, `${sc.name}${sc.unsaved ? ctx.t(" · bozza non salvata", " · unsaved draft") : ""}${sc.background ? "" : ctx.t(" · base geometrica", " · geometric base")}`, scene.id)).join("")}</select></label><label class="field">${ctx.t("Sensibilità", "Sensitivity")} <span class="muted">(${o.sensitivity > 0 ? "+" : ""}${o.sensitivity})</span><input type="range" min="-60" max="60" step="5" value="${o.sensitivity}" data-gen-opt="walls.sensitivity" ${key("opt-walls-sensitivity")}></label>${select(
    ctx,
    "walls.minCells",
    ctx.t("Lunghezza minima", "Minimum length"),
    [1, 2, 3].map((n) => [
      n,
      L(`${n} ${n === 1 ? "cella" : "celle"}`, `${n} ${n === 1 ? "cell" : "cells"}`),
    ]),
    o.minCells,
  )}<button type="button" class="button primary" data-gen-act="analyze" ${key("analyze")} ${s.busy ? 'disabled aria-describedby="gen-why-busy"' : ""}>${ctx.icon("wall")} ${a ? ctx.t("Analizza di nuovo", "Analyse again") : ctx.t("Rileva i muri", "Detect walls")}</button>${s.busy ? `<p class="gen-why" id="gen-why-busy" role="status">${ctx.t("In corso…", "In progress…")}</p>` : ""}<p class="muted">${ctx.t("Il confine tra zone chiare (pavimento) e scure (roccia) diventa una proposta. Può perdere stanze piccole o linee sottili: ogni muro si conferma uno per uno.", "The boundary between light (floor) and dark (rock) areas becomes a proposal. It may miss small rooms or thin lines: each wall is confirmed one by one.")}</p></fieldset>`;
  const svg = `<svg class="gen-map" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-label="${ctx.esc(ctx.t(`Proposte di muri su ${scene.name}`, `Wall proposals on ${scene.name}`))}">${renderSceneBase(scene, ctx)}${(
    scene.walls ?? []
  )
    .map(
      (w) => `<line class="gen-existing" x1="${w.a.x}" y1="${w.a.y}" x2="${w.b.x}" y2="${w.b.y}"/>`,
    )
    .join("")}${offered
    .map((p) => {
      const state = decisions[p.id] ?? "pending";
      const mid = { x: (p.a.x + p.b.x) / 2, y: (p.a.y + p.b.y) / 2 };
      return `<g class="gen-proposal is-${state} ${s.selected === p.id ? "is-selected" : ""}" data-gen-proposal="${ctx.esc(p.id)}"><title>${ctx.esc(`${ctx.t("Muro", "Wall")} ${p.index}`)}</title><line class="gen-hit" x1="${p.a.x}" y1="${p.a.y}" x2="${p.b.x}" y2="${p.b.y}"/><line x1="${p.a.x}" y1="${p.a.y}" x2="${p.b.x}" y2="${p.b.y}"/><circle cx="${mid.x}" cy="${mid.y}" r="13"/><text x="${mid.x}" y="${mid.y + 5}">${p.index}</text></g>`;
    })
    .join("")}</svg>`;
  const list = offered
    .map((p) => {
      const state = decisions[p.id] ?? "pending";
      const text = `${ctx.t("Muro", "Wall")} ${p.index} · ${p.axis === "h" ? ctx.t("orizzontale", "horizontal") : ctx.t("verticale", "vertical")} · ${num(ctx, (p.length / scene.gridSize) * scene.metersPerCell, 1)} m`;
      return `<li class="gen-proposal-row is-${state} ${s.selected === p.id ? "is-selected" : ""}" data-gen-proposal-row="${ctx.esc(p.id)}"><span>${ctx.esc(text)}</span><span class="badge">${state === "accepted" ? ctx.t("confermato", "confirmed") : state === "rejected" ? ctx.t("scartato", "discarded") : ctx.t("da decidere", "to decide")}</span><div class="toolbar"><button type="button" class="button ${state === "accepted" ? "primary" : ""}" aria-pressed="${state === "accepted"}" data-gen-act="accept" data-proposal="${ctx.esc(p.id)}" ${key(`accept-${p.id}`)}>${ctx.icon("check")} ${ctx.t("Conferma", "Confirm")}</button><button type="button" class="button quiet" aria-pressed="${state === "rejected"}" data-gen-act="reject" data-proposal="${ctx.esc(p.id)}" ${key(`reject-${p.id}`)}>${ctx.icon("close")} ${ctx.t("Scarta", "Discard")}</button></div></li>`;
    })
    .join("");
  const result = a
    ? `<p class="gen-stats" data-gen-walls-stats>${ctx.esc(
        ctx.t(
          `${offered.length} proposte · ${accepted} confermate · ${rejected} scartate · ${offered.length - accepted - rejected} da decidere · ${a.proposals.length - offered.length} già presenti nella scena · soglia ${num(ctx, a.threshold)}`,
          `${offered.length} proposals · ${accepted} confirmed · ${rejected} discarded · ${offered.length - accepted - rejected} to decide · ${a.proposals.length - offered.length} already in the scene · threshold ${num(ctx, a.threshold)}`,
        ),
      )}</p>${svg}<ol class="gen-proposals">${list || `<li class="muted">${ctx.t("Nessuna proposta nuova: prova un’altra sensibilità o disegna i muri nell’editor.", "No new proposals: try another sensitivity or draw walls in the editor.")}</li>`}</ol><div class="toolbar gen-actions"><button type="button" class="button primary" data-gen-act="walls-open" ${key("walls-open")} ${accepted ? "" : 'disabled aria-describedby="gen-why-walls"'}>${ctx.icon("wall")} ${ctx.esc(accepted === 1 ? ctx.t("Aggiungi 1 muro confermato alla bozza della scena", "Add 1 confirmed wall to the scene draft") : ctx.t(`Aggiungi ${accepted} muri confermati alla bozza della scena`, `Add ${accepted} confirmed walls to the scene draft`))}</button></div>${accepted ? "" : `<p class="gen-why" id="gen-why-walls">${ctx.t("Nessun muro confermato: conferma almeno una proposta dall’elenco.", "No wall confirmed: confirm at least one proposal from the list.")}</p>`}<p class="muted">${ctx.t("I muri confermati entrano nella bozza dell’editor: la scena cambia solo con «Salva preparazione». Là si correggono con Seleziona, Muro e Annulla.", "Confirmed walls enter the editor draft: the scene changes only with “Save preparation”. Correct them there with Select, Wall and Undo.")}</p>`
    : `${svg}<p class="muted">${ctx.t("Nessuna analisi ancora: scegli la scena e premi «Rileva i muri».", "No analysis yet: choose the scene and press “Detect walls”.")}</p>`;
  return `<div class="gen-layout">${options}<div class="gen-result" data-gen-walls-scene="${ctx.esc(scene.id)}">${result}</div></div>`;
}

export function panelHTML(ctx) {
  const s = uiState(ctx);
  ensureDraft(ctx, s.kind);
  const body =
    s.kind === "treasure"
      ? treasureHTML(ctx)
      : s.kind === "dungeon"
        ? dungeonHTML(ctx)
        : s.kind === "encounter"
          ? encounterHTML(ctx)
          : s.kind === "walls"
            ? wallsHTML(ctx)
            : settlementHTML(ctx);
  return `${kindsHTML(ctx)}<div class="gen-panel-body" role="tabpanel" aria-label="${ctx.esc(kindLabel(ctx, s.kind))}" data-gen-view="${s.kind}">${SEEDED.includes(s.kind) ? seedHTML(ctx) : ""}${statusHTML(ctx)}${body}</div>`;
}

// ---------------------------------------------------------------- actions

function setOption(ctx, path, value) {
  const s = uiState(ctx);
  const parts = path.split(".");
  let target = s.options;
  for (const part of parts.slice(0, -1)) target = target[part];
  const last = parts.at(-1);
  target[last] = typeof target[last] === "number" ? Number(value) : value;
  remember(ctx);
}
/** Options change → same seed, new result (donjon: change options, same seed). */
function optionChanged(ctx, path) {
  const s = uiState(ctx);
  const kind = path.split(".")[0];
  if (kind === "walls") {
    s.analysis = null;
    s.selected = null;
    return;
  }
  if (kind === "world") return;
  if (s.drafts[kind]) regenerate(ctx, { kind, seed: s.seeds[kind] });
}

// Physical and digital corrections keep the draft; the DM's text or count wins.
export function encounterRowCommand(ctx, rowId, change) {
  return tryDraft(ctx, (draft) => G.editEncounterRow(draft, rowId, change, ctx.rollDie ?? rollDie));
}
export function settlementCommand(ctx, fieldId, change) {
  return tryDraft(ctx, (draft) =>
    change.pick !== undefined
      ? G.toggleName(draft, fieldId, change.pick)
      : G.editSettlementField(
          draft,
          ctx.state.ext?.[TABLES] ?? null,
          fieldId,
          change,
          ctx.rollDie ?? rollDie,
        ),
  );
}

export function saveEncounter(ctx, { into = false } = {}) {
  const s = uiState(ctx);
  const draft = s.drafts.encounter;
  const target = into ? openEncounterOf(ctx) : null;
  if (into && !target) {
    s.error = ctx.t("L’incontro aperto non esiste più.", "The open encounter no longer exists.");
    return null;
  }
  const name = s.names.encounter?.[draft.seed] ?? G.defaultEncounterName(draft, ctx.lang);
  let id = null;
  try {
    ctx.commit(
      target
        ? ctx.t(
            `Creature generate aggiunte a ${target.name}`,
            `Generated monsters added to ${target.name}`,
          )
        : ctx.t(`Incontro generato: ${name}`, `Generated encounter: ${name}`),
      (state) => {
        id = G.saveEncounterDraft(state.ext[EB.ID], draft, ctx.role, {
          name,
          lang: ctx.lang,
          into: target?.id ?? null,
          campaignLevels: EB.campaignParty(state).map((m) => m.level),
        });
      },
      DRAFT,
    );
  } catch (error) {
    s.error = message(ctx, error);
    return null;
  }
  const eb = encounterUi(ctx);
  eb.openId = id;
  eb.targetGroup = "main";
  ctx.closeDialog();
  ctx.toast(
    target
      ? ctx.t("Creature aggiunte all’incontro.", "Monsters added to the encounter.")
      : ctx.t("Incontro salvato nel costruttore.", "Encounter saved in the builder."),
  );
  ctx.navigate("preparation", { tab: EB.ID });
  return id;
}

/** PNG of the generated map (browser only): floor, walls, visible doors, optional numbers. */
export function dungeonPng(dungeon, { numbers = false } = {}) {
  const canvas = globalThis.document?.createElement("canvas");
  const g = canvas?.getContext?.("2d");
  if (!g) return null;
  canvas.width = dungeon.width;
  canvas.height = dungeon.height;
  const c = dungeon.cell;
  g.fillStyle = "#1d2327";
  g.fillRect(0, 0, dungeon.width, dungeon.height);
  dungeon.region.forEach((row, y) =>
    row.forEach((value, x) => {
      if (!value) return;
      g.fillStyle = value === -1 ? "#bdb296" : "#cdc2a4";
      g.fillRect(x * c, y * c, c, c);
    }),
  );
  g.strokeStyle = "rgba(70, 58, 38, 0.28)";
  g.lineWidth = 1;
  dungeon.region.forEach((row, y) =>
    row.forEach((value, x) => {
      if (value) g.strokeRect(x * c + 0.5, y * c + 0.5, c - 1, c - 1);
    }),
  );
  g.strokeStyle = "#2a2521";
  g.lineWidth = 6;
  g.lineCap = "square";
  for (const w of [...dungeon.walls, ...dungeon.doors.filter((d) => d.secret)]) {
    g.beginPath();
    g.moveTo(w.a.x, w.a.y);
    g.lineTo(w.b.x, w.b.y);
    g.stroke();
  }
  for (const d of dungeon.doors.filter((door) => !door.secret)) {
    const horizontal = d.a.y === d.b.y;
    const mx = (d.a.x + d.b.x) / 2,
      my = (d.a.y + d.b.y) / 2;
    g.fillStyle = d.doorState === "locked" ? "#5a3719" : "#8b5d2e";
    if (horizontal) g.fillRect(mx - c * 0.32, my - 5, c * 0.64, 10);
    else g.fillRect(mx - 5, my - c * 0.32, 10, c * 0.64);
  }
  if (numbers) {
    g.fillStyle = "#2a2521";
    g.font = "bold 22px Georgia, serif";
    for (const room of dungeon.rooms) g.fillText(String(room.id), room.x * c + 8, room.y * c + 26);
  }
  const url = canvas.toDataURL("image/png");
  return /^data:image\/png;base64,/.test(url) && url.length < 1_300_000 ? url : null;
}
export function openDungeonDraft(ctx) {
  const s = uiState(ctx);
  const dungeon = s.drafts.dungeon;
  if (!dungeon) return false;
  const scene = G.dungeonScene(dungeon, {
    lang: ctx.lang,
    name: s.names.dungeon?.[dungeon.seed] ?? "",
    background: dungeonPng(dungeon, { numbers: s.options.dungeon.numbers }),
  });
  if (validateSceneDraft(scene).length) {
    s.error = ctx.t("La bozza della scena non è valida.", "The scene draft is not valid.");
    return false;
  }
  ctx.closeDialog();
  const furniture = s.options.dungeon.furnish === false ? [] : G.furnishDungeon(dungeon);
  // Called when the draft really opens (after «Discard changes?» if another one is unsaved).
  openSceneDraft(ctx, scene, () => {
    if (furniture.length) pendingFurniture.set(scene.id, { props: furniture, lang: ctx.lang });
    ctx.toast(
      furniture.length
        ? ctx.t(
            `Bozza del dungeon nell’editor: salvala con «Salva preparazione» e arrivano anche ${furniture.length} oggetti d’arredo.`,
            `Dungeon draft in the editor: save it with “Save preparation” and ${furniture.length} furniture objects come with it.`,
          )
        : ctx.t(
            "Bozza del dungeon nell’editor: salvala con «Salva preparazione».",
            "Dungeon draft in the editor: save it with “Save preparation”.",
          ),
    );
    return {};
  });
  return scene.id;
}
// PR-17: the furniture of a drafted dungeon waits for its scene to be saved, then becomes
// scene objects (scene-assets stickers: movable, hideable, lockable; traps DM-only).
const pendingFurniture = new Map();
export function placePendingFurniture(ctx) {
  if (!pendingFurniture.size || ctx?.role !== "dm") return 0;
  const ready = [...pendingFurniture].filter(([sceneId]) =>
    ctx.state.scenes?.some((scene) => scene.id === sceneId),
  );
  if (!ready.length || !SA.sliceOf(ctx.state)) return 0;
  let placed = 0;
  for (const [sceneId] of ready) pendingFurniture.delete(sceneId);
  ctx.commit(ctx.t("Arredo del dungeon", "Dungeon furniture"), (draft) => {
    for (const [sceneId, { props, lang }] of ready)
      for (const p of props) {
        SA.addProp(draft, "dm", sceneId, {
          sticker: p.sticker,
          name: p.name[lang] ?? p.name.it,
          x: p.x,
          y: p.y,
          hidden: p.hidden,
        });
        placed++;
      }
  });
  return placed;
}

// ---------------------------------------------------------------- treasure (PR-55)

function treasureHTML(ctx) {
  const s = uiState(ctx);
  const o = s.options.treasure;
  const d = s.drafts.treasure;
  const options = `<fieldset class="gen-options"><legend>${ctx.t("Tesoro per GS (AideDD / donjon)", "Treasure by CR (AideDD / donjon)")}</legend>${select(
    ctx,
    "treasure.cr",
    ctx.t("Grado di sfida", "Challenge Rating"),
    G.TREASURE_CRS.map((cr) => [cr, L(`GS ${cr}`, `CR ${cr}`)]),
    o.cr,
  )}${select(
    ctx,
    "treasure.mode",
    ctx.t("Tipo", "Kind"),
    [
      ["hoard", L("Gruzzolo (tesoro del covo)", "Hoard (lair treasure)")],
      ["individual", L("Individuale (per creatura)", "Individual (per creature)")],
    ],
    o.mode,
  )}${o.mode === "individual" ? `<label class="field">${ctx.t("Creature", "Creatures")}<input type="number" min="1" max="20" data-gen-opt="treasure.count" ${key("opt-treasure.count")} value="${ctx.esc(o.count)}" inputmode="numeric"></label>` : ""}<p class="muted">${ctx.esc(ctx.label(G.TREASURE_SOURCE.title))} · ${ctx.t("valori degli oggetti magici: SRD 5.2.1 EN 206 / IT 234", "magic item values: SRD 5.2.1 EN 206 / IT 234")}</p></fieldset>`;
  if (!d) return `<div class="gen-layout">${options}<div class="gen-result"></div></div>`;
  const coins = Object.entries(d.coins)
    .filter(([, n]) => n > 0)
    .map(([coin, n]) => `${num(ctx, n)} ${coinName(ctx, coin)}`)
    .join(" · ");
  const items = d.items.length
    ? `<ul class="gen-treasure-items">${d.items.map((item) => `<li><strong>${ctx.esc(ctx.label(item.name))}</strong> <span class="muted">${ctx.esc(rarityName(ctx, item.rarity))}${item.valueCp ? ` · ${num(ctx, item.valueCp / 100)} ${coinName(ctx, "gp")}` : ""}</span></li>`).join("")}</ul>`
    : `<p class="muted">${d.mode === "hoard" ? ctx.t("Nessun oggetto magico in questo gruzzolo.", "No magic item in this hoard.") : ctx.t("Il tesoro individuale è in monete.", "Individual treasure is coins.")}</p>`;
  const rolls = `<details class="gen-key"><summary>${ctx.t("Dadi tirati", "Dice rolled")}</summary><ul>${d.rolls.map((r) => `<li>${ctx.esc(ctx.label(r.label))}: ${r.dice} → ${r.values.join(" + ")} = <strong>${r.total}</strong></li>`).join("")}</ul></details>`;
  return `<div class="gen-layout">${options}<div class="gen-result" data-gen-treasure><h3>${ctx.esc(d.mode === "hoard" ? ctx.t(`Gruzzolo · GS ${d.cr}`, `Hoard · CR ${d.cr}`) : ctx.t(`Tesoro individuale · GS ${d.cr} · ${d.count} creature`, `Individual treasure · CR ${d.cr} · ${d.count} creatures`))}</h3><p class="gen-stats" data-gen-treasure-coins><strong>${ctx.esc(coins || "—")}</strong></p>${items}${d.fallback ? `<p class="muted" data-gen-treasure-fallback>${ctx.t("Il catalogo SRD di prova non ha oggetti di questa rarità: al loro posto il più raro disponibile.", "The sample SRD catalogue has no items of this rarity: the rarest available stands in.")}</p>` : ""}<p>${ctx.t("Valore totale", "Total value")}: <strong>${num(ctx, d.valueCp / 100)} ${coinName(ctx, "gp")}</strong></p>${rolls}<div class="toolbar gen-actions"><button type="button" class="button primary" data-gen-act="treasure-loot" ${key("treasure-loot")}>${ctx.icon("bag")} ${ctx.t("Metti nel bottino", "Put in the loot")}</button></div><p class="muted">${ctx.t("Diventa un pacchetto nascosto in Preparazione › Tesori, sulla scena attiva: lo mostri al Tavolo quando il gruppo lo trova.", "It becomes a hidden parcel in Preparation › Treasure, on the active scene: show it at the Table when the party finds it.")}</p></div></div>`;
}
const COIN_NAMES = {
  cp: L("mr", "cp"),
  sp: L("ma", "sp"),
  ep: L("me", "ep"),
  gp: L("mo", "gp"),
  pp: L("mp", "pp"),
};
const coinName = (ctx, coin) => ctx.label(COIN_NAMES[coin] ?? L(coin, coin));
const RARITY_NAMES = {
  common: L("comune", "common"),
  uncommon: L("non comune", "uncommon"),
  rare: L("raro", "rare"),
  "very-rare": L("molto raro", "very rare"),
  legendary: L("leggendario", "legendary"),
};
const rarityName = (ctx, rarity) => ctx.label(RARITY_NAMES[rarity] ?? L(rarity, rarity));
// «Metti nel bottino»: a hidden Treasure parcel on the active scene (B26 loot), opened in
// Preparation › Treasure; nothing reaches the players until the DM shows it.
export function putTreasureInLoot(ctx) {
  const s = uiState(ctx);
  const d = s.drafts.treasure;
  if (!d || ctx.role !== "dm") return null;
  let parcelId = null;
  const name =
    d.mode === "hoard"
      ? ctx.t(`Gruzzolo GS ${d.cr}`, `Hoard CR ${d.cr}`)
      : ctx.t(`Tesoro GS ${d.cr}`, `Treasure CR ${d.cr}`);
  try {
    ctx.commit(
      ctx.t(`Tesoro generato: ${name}`, `Generated treasure: ${name}`),
      (draft) => {
        const slice = draft.ext?.loot;
        if (!slice) throw G.refuse("Il bottino non è disponibile.", "Loot is unavailable.");
        const parcel = createParcel(draft, slice, ctx.role, {
          name,
          sceneId: draft.activeSceneId ?? null,
        });
        setParcelCoins(draft, slice, ctx.role, parcel.id, d.coins);
        for (const item of d.items)
          addParcelItem(draft, slice, ctx.role, parcel.id, itemFromCatalog(item.srdId));
        parcelId = parcel.id;
      },
      { visibility: "private" },
    );
  } catch (error) {
    s.error = message(ctx, error);
    return null;
  }
  selectPrepParcel(parcelId);
  ctx.closeDialog();
  ctx.toast(
    ctx.t(
      "Tesoro nel bottino: pacchetto nascosto in Preparazione › Tesori.",
      "Treasure in the loot: hidden parcel in Preparation › Treasure.",
    ),
  );
  ctx.navigate("preparation", { tab: "loot" });
  return parcelId;
}

export function saveWorld(ctx) {
  const s = uiState(ctx);
  const draft = s.drafts[s.kind];
  const access = s.options.world.access;
  const entries = G.settlementEntries(draft, ctx.lang);
  const prefix = `gen-${draft.kind}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  let result = null;
  try {
    // Dry run on a copy: the campaign content API names the commit options (B25 journal).
    const dry = G.saveWorldEntries(structuredClone(ctx.state), entries, access, ctx.role, {
      online: !ctx.offline,
      prefix,
    });
    ctx.commit(
      ctx
        .t(
          `Nel Mondo della campagna: ${entries.map((e) => e.title).join(", ")}`,
          `In the campaign World: ${entries.map((e) => e.title).join(", ")}`,
        )
        .slice(0, 200),
      (state) => {
        result = G.saveWorldEntries(state, entries, access, ctx.role, {
          online: !ctx.offline,
          prefix,
        });
      },
      dry.commit,
    );
  } catch (error) {
    s.error = message(ctx, error);
    return null;
  }
  s.notice = ctx.t(
    `Salvato nel Mondo della campagna (${ctx.label(G.WORLD_ACCESS[access])}).`,
    `Saved in the campaign World (${ctx.label(G.WORLD_ACCESS[access])}).`,
  );
  ctx.closeDialog();
  ctx.toast(s.notice);
  if (result.ids.length === 1) ctx.navigate("campaign", { tab: "entry", id: result.ids[0] });
  else ctx.navigate("campaign", { tab: "world" });
  return result.ids;
}
export function editTables(ctx) {
  const s = uiState(ctx);
  const draft = s.drafts[s.kind];
  const first = draft?.fields.find((f) => !f.missing)?.tables[0] ?? G.GENERATOR_TABLES[0].id;
  const rt = ctx.state.ext?.[TABLES];
  if (!rt) {
    s.error = ctx.t(
      "L’area «Tabelle e mazzi» non è disponibile.",
      "The “Tables and decks” area is not available.",
    );
    return false;
  }
  if (G.installedTables(rt).length < G.GENERATOR_TABLES.length)
    try {
      ctx.commit(
        ctx.t(
          "Tabelle del generatore copiate in Tabelle e mazzi",
          "Generator tables copied to Tables and decks",
        ),
        (state) => G.installGeneratorTables(state.ext[TABLES], ctx.role),
        DRAFT,
      );
    } catch (error) {
      s.error = message(ctx, error);
      return false;
    }
  ctx.closeDialog();
  ctx.navigate("preparation", { tab: TABLES, id: `table:${first}` });
  return true;
}

// Forecast: rasterise the scene base (uploaded image or geometric base) and analyse it.
async function sceneImage(ctx, scene) {
  const width = scene.width,
    height = scene.height;
  const src =
    typeof scene.background === "string" &&
    /^data:image\/(png|jpeg|webp);base64,/.test(scene.background)
      ? scene.background
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${renderSceneBase(scene, ctx)}</svg>`)}`;
  const image = new Image();
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  g.drawImage(image, 0, 0, width, height);
  return g.getImageData(0, 0, width, height);
}
export function analyseGrid(ctx, scene, grid) {
  const o = uiState(ctx).options.walls;
  const otsu = G.otsuThreshold(grid.values);
  const threshold = Math.max(1, Math.min(254, otsu + Number(o.sensitivity || 0)));
  const proposals = G.detectWalls(grid, {
    threshold,
    minBlocks:
      Math.max(1, Number(o.minCells) || 1) * Math.max(1, Math.round(scene.gridSize / grid.block)),
    existing: scene.walls ?? [],
  });
  return { sceneId: scene.id, otsu, threshold, proposals };
}
async function analyse(ctx, rerender) {
  const s = uiState(ctx);
  const scene = wallsScene(ctx);
  if (!scene || s.busy) return;
  s.busy = true;
  s.error = "";
  s.notice = ctx.t("Analisi della mappa…", "Analysing the map…");
  rerender();
  try {
    const data = await sceneImage(ctx, scene);
    const grid = G.lumaBlocks(
      data.data,
      data.width,
      data.height,
      Math.max(5, Math.round(scene.gridSize / 2)),
    );
    s.analysis = analyseGrid(ctx, scene, grid);
    const fresh = s.analysis.proposals.filter((p) => !p.existing).length;
    s.notice = ctx.t(
      `${fresh} muri proposti: confermali uno per uno.`,
      `${fresh} walls proposed: confirm them one by one.`,
    );
  } catch {
    s.error = ctx.t(
      "Non riesco a leggere l’immagine della scena.",
      "The scene image cannot be read.",
    );
    s.notice = "";
  }
  s.busy = false;
  rerender();
}
/**
 * Scenes Forecast can analyse: the saved ones, where the scene open in the editor with
 * unsaved changes (a new map, a generated dungeon) is its draft, the map the DM sees.
 */
function wallsScenes(ctx) {
  const draft = currentSceneDraft();
  const scenes = ctx.state.scenes.map((sc) =>
    draft?.id === sc.id ? { ...draft, unsaved: true } : sc,
  );
  if (draft && !scenes.some((sc) => sc.id === draft.id)) scenes.push({ ...draft, unsaved: true });
  return scenes;
}
export function wallsScene(ctx) {
  const o = uiState(ctx).options.walls;
  const scenes = wallsScenes(ctx);
  return (
    scenes.find((sc) => sc.id === o.sceneId) ??
    scenes.find((sc) => sc.id === ctx.state.activeSceneId) ??
    scenes[0] ??
    null
  );
}
export function decideProposal(ctx, proposalId, decision) {
  const s = uiState(ctx);
  const scene = wallsScene(ctx);
  const decisions = (s.decisions[scene.id] ??= {});
  // Pressing the active choice again returns the proposal to "to decide" (correction).
  if (decisions[proposalId] === decision) delete decisions[proposalId];
  else decisions[proposalId] = decision;
  s.selected = proposalId;
  remember(ctx);
}
/**
 * Confirmed walls go into the editor: added to the DM's unsaved draft of that scene (its
 * own changes kept), or to a new draft of the saved scene. The decisions are cleared only
 * when the walls are really handed over (not if «Discard changes?» is cancelled).
 */
export function openWallsDraft(ctx) {
  const s = uiState(ctx);
  const scene = wallsScene(ctx);
  const a = s.analysis;
  if (!scene || !a || a.sceneId !== scene.id) return false;
  const walls = G.proposalsToWalls(a.proposals, s.decisions[scene.id] ?? {}, scene.id);
  if (!walls.length) return false;
  const { unsaved, ...base } = scene;
  ctx.closeDialog();
  openSceneDraft(
    ctx,
    unsaved ? base : ctx.state.scenes.find((sc) => sc.id === scene.id),
    (draft) => {
      const present = new Set((draft.walls ?? []).map((w) => w.id));
      delete s.decisions[scene.id];
      s.analysis = null;
      s.selected = null;
      remember(ctx);
      ctx.toast(
        walls.length === 1
          ? ctx.t(
              "1 muro nella bozza della scena: salvala con «Salva preparazione».",
              "1 wall in the scene draft: save it with “Save preparation”.",
            )
          : ctx.t(
              `${walls.length} muri nella bozza della scena: salvala con «Salva preparazione».`,
              `${walls.length} walls in the scene draft: save it with “Save preparation”.`,
            ),
      );
      return { walls: [...(draft.walls ?? []), ...walls.filter((w) => !present.has(w.id))] };
    },
  );
  return walls.length;
}

// ---------------------------------------------------------------- binding

function focusKeyOf(element) {
  return element?.closest?.("[data-gen-key]")?.dataset.genKey ?? null;
}
function bindPanel(panel, ctx) {
  const rerender = (focus = focusKeyOf(globalThis.document?.activeElement)) => {
    if (!panel.isConnected) return;
    panel.innerHTML = panelHTML(ctx);
    const target = focus && panel.querySelector(`[data-gen-key="${CSS.escape(focus)}"]`);
    (target || panel.querySelector("[data-gen-error]"))?.focus?.();
  };
  const s = () => uiState(ctx);
  // A change fired by leaving a field while the pointer is already down on the next control
  // must not replace that control before its click (B25 note): re-render after the click.
  let pointerDown = false;
  let pending = false;
  const refresh = () => {
    if (pointerDown) pending = true;
    else rerender();
  };
  panel.addEventListener("pointerdown", () => (pointerDown = true), true);
  panel.addEventListener(
    "pointerup",
    () => {
      pointerDown = false;
      if (pending)
        setTimeout(() => {
          if (!pending) return;
          pending = false;
          rerender();
        }, 0);
    },
    true,
  );
  panel.addEventListener("click", (event) => {
    pending = false;
    const rolls = event.target.closest("[data-gen-open-rolls]");
    if (rolls) {
      const id = rolls.dataset.genOpenRolls;
      if (s().rolls.has(id)) s().rolls.delete(id);
      else s().rolls.add(id);
      return;
    }
    const summary = event.target.closest("[data-gen-open]");
    if (summary) {
      s().open = s().open === summary.dataset.genOpen ? null : summary.dataset.genOpen;
      return;
    }
    const proposal = event.target.closest("[data-gen-proposal]");
    if (proposal) {
      s().selected = proposal.dataset.genProposal;
      rerender(`accept-${proposal.dataset.genProposal}`);
      panel
        .querySelector(`[data-gen-proposal-row="${CSS.escape(proposal.dataset.genProposal)}"]`)
        ?.scrollIntoView?.({ block: "nearest" });
      return;
    }
    const tab = event.target.closest("[data-gen-kind]");
    if (tab) {
      s().kind = tab.dataset.genKind;
      s().error = "";
      s().notice = "";
      remember(ctx);
      return rerender(`kind-${s().kind}`);
    }
    const button = event.target.closest("[data-gen-act]");
    if (!button || button.disabled) return;
    const act = button.dataset.genAct;
    const row = button.dataset.row;
    const draft = s().drafts[s().kind];
    switch (act) {
      case "regen":
        regenerate(ctx);
        break;
      case "back":
        previousDraft(ctx);
        break;
      case "minus":
      case "plus": {
        const current = draft.rows.find((r) => r.id === row);
        encounterRowCommand(ctx, row, {
          mode: "manual",
          value: current.count + (act === "plus" ? 1 : -1),
        });
        break;
      }
      case "roll":
        encounterRowCommand(ctx, row, { mode: "digital" });
        break;
      case "physical": {
        const faces = [...panel.querySelectorAll(`[data-gen-face="${CSS.escape(row)}"]`)].map(
          (input) => (input.value === "" ? NaN : Number(input.value)),
        );
        if (encounterRowCommand(ctx, row, { mode: "physical", faces })) s().open = null;
        break;
      }
      case "remove":
        tryDraft(ctx, (d) => G.removeEncounterRow(d, row));
        break;
      case "adjust":
        tryDraft(ctx, (d) => G.adjustEncounterDraft(d));
        break;
      case "encounter-save":
      case "encounter-into":
        if (saveEncounter(ctx, { into: act === "encounter-into" })) return;
        break;
      case "dungeon-open":
        if (openDungeonDraft(ctx)) return;
        break;
      case "treasure-loot":
        if (putTreasureInLoot(ctx)) return;
        break;
      case "room-encounter": {
        const dungeon = s().drafts.dungeon;
        const name = `${ctx.t("Stanza", "Room")} ${button.dataset.room} · ${s().names.dungeon?.[dungeon.seed] ?? ctx.label(dungeon.name)}`;
        s().kind = "encounter";
        regenerate(ctx, { kind: "encounter", seed: `${dungeon.seed}-${button.dataset.room}` });
        const encounter = s().drafts.encounter;
        if (encounter) (s().names.encounter ??= {})[encounter.seed] = name.slice(0, 100);
        remember(ctx);
        return rerender("regen");
      }
      case "step-roll":
        settlementCommand(ctx, button.dataset.field, {
          mode: "digital",
          step: button.dataset.step,
        });
        break;
      case "step-physical": {
        const id = `${button.dataset.field}:${button.dataset.step}`;
        const input = panel.querySelector(`[data-gen-step-face="${CSS.escape(id)}"]`);
        const face = input?.value === "" ? NaN : Number(input?.value);
        if (
          settlementCommand(ctx, button.dataset.field, {
            mode: "physical",
            step: button.dataset.step,
            face,
          })
        )
          s().open = null;
        break;
      }
      case "world-save":
        if (saveWorld(ctx)) return;
        break;
      case "edit-tables":
        if (editTables(ctx)) return;
        break;
      case "analyze":
        analyse(ctx, () => rerender("analyze"));
        return;
      case "accept":
      case "reject":
        decideProposal(ctx, button.dataset.proposal, act === "accept" ? "accepted" : "rejected");
        break;
      case "walls-open":
        if (openWallsDraft(ctx)) return;
        break;
    }
    rerender();
  });
  panel.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-gen-opt]")) {
      const path = target.dataset.genOpt;
      setOption(ctx, path, target.type === "checkbox" ? target.checked : target.value);
      optionChanged(ctx, path);
      return refresh();
    }
    if (target.matches("[data-gen-seed]")) {
      const seed = G.normalizeSeed(target.value);
      if (seed && seed !== s().seeds[s().kind]) regenerate(ctx, { seed });
      else if (!seed)
        s().error = ctx.t(
          "Scrivi un seme: lettere e numeri, fino a 24 caratteri.",
          "Enter a seed: letters and digits, up to 24 characters.",
        );
      return refresh();
    }
    if (target.matches("[data-gen-expr]")) {
      encounterRowCommand(ctx, target.dataset.genExpr, { mode: "expr", expr: target.value });
      return refresh();
    }
    if (target.matches("[data-gen-field-text]")) {
      settlementCommand(ctx, target.dataset.genFieldText, { mode: "text", text: target.value });
      return refresh();
    }
    if (target.matches("[data-gen-pick]")) {
      settlementCommand(ctx, target.dataset.genPick, { pick: target.checked });
      return refresh();
    }
    if (target.matches("[data-gen-name]")) {
      const kind = target.dataset.genName;
      const draft = s().drafts[kind];
      if (draft) (s().names[kind] ??= {})[draft.seed] = target.value.trim().slice(0, 100);
      remember(ctx);
    }
    if (target.matches("[data-gen-face], [data-gen-step-face]")) return;
  });
  panel.addEventListener("keydown", (event) => {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "g" && SEEDED.includes(s().kind)) {
      // Kobold+ Generate (Ctrl/Cmd+G) inside the panel: a new seed.
      event.preventDefault();
      regenerate(ctx);
      return rerender("regen");
    }
    if (
      event.key === "Enter" &&
      event.target.matches(
        "[data-gen-seed], [data-gen-expr], [data-gen-field-text], [data-gen-name], [data-gen-face], [data-gen-step-face]",
      )
    ) {
      // Enter applies the field (Watabou: Enter rerolls from the seed) instead of submitting.
      event.preventDefault();
      event.target.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    const tab = event.target.closest?.("[data-gen-kind]");
    if (tab && ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const ids = KINDS.map(([id]) => id);
      const at = ids.indexOf(tab.dataset.genKind);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? ids.length - 1
            : (at + (event.key === "ArrowRight" ? 1 : -1) + ids.length) % ids.length;
      s().kind = ids[next];
      s().error = "";
      remember(ctx);
      rerender(`kind-${ids[next]}`);
    }
  });
}

/** Opens the generator panel in the common dialog (DM only). */
export function openGenerator(ctx, kind = null, { encounterId, sceneId } = {}) {
  if (ctx.role !== "dm") {
    ctx.toast(
      ctx.t("I generatori sono riservati ai DM.", "Generators are reserved for DMs."),
      true,
    );
    return false;
  }
  const s = uiState(ctx);
  if (kind) s.kind = kind;
  if (sceneId && sceneId !== s.options.walls.sceneId) {
    s.options.walls.sceneId = sceneId;
    s.analysis = null;
    s.selected = null;
  }
  // The encounter open in B19 (Kobold+ fills the encounter being edited): its party is the
  // default and «Aggiungi a …» appears; elsewhere the campaign party.
  s.into =
    encounterId !== undefined
      ? encounterId
      : ctx.view.page === "preparation" && ctx.view.tab === EB.ID
        ? (encounterUi(ctx).openId ?? null)
        : null;
  if (s.into && openEncounterOf(ctx)) s.options.encounter.party = "encounter";
  else if (s.options.encounter.party === "encounter") s.options.encounter.party = "campaign";
  const encounterDraft = s.drafts.encounter;
  if (
    encounterDraft &&
    JSON.stringify(partyFor(ctx).levels) !== JSON.stringify(encounterDraft.levels)
  )
    regenerate(ctx, { kind: "encounter", seed: encounterDraft.seed });
  s.error = "";
  s.notice = "";
  s.open = null;
  ctx.dialog(
    ctx.t("Genera per la preparazione", "Generate for preparation"),
    `<div class="gen" data-gen-panel>${panelHTML(ctx)}</div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  dialogPanel = globalThis.document?.querySelector("#dialog [data-gen-panel]") ?? null;
  if (dialogPanel) {
    bindPanel(dialogPanel, ctx);
    dialogPanel.querySelector(`[data-gen-key="kind-${s.kind}"]`)?.focus();
  }
  return true;
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  // The scene open in Preparation's editor (not its preview, not an area section's item).
  const editedScene = (ctx) =>
    ctx.view.page === "preparation" &&
    ctx.view.id &&
    ctx.view.tab !== "preview" &&
    !(ctx.view.tab && registry.get("preparation-section", ctx.view.tab))
      ? ctx.view.id
      : null;
  registry.registerStyles(new URL("./generators.css", import.meta.url));
  // Beside «Nuova scena» (Preparation › Scenes): the donjon/Watabou/Forecast panel.
  registry.add("command", {
    id: `${ID}.open`,
    label: L("Genera…", "Generate…"),
    description: L(
      "Dungeon, incontri, locande, centri abitati, nomi, muri da mappa",
      "Dungeons, encounters, inns, settlements, names, walls from a map",
    ),
    roles: ["dm"],
    context: "preparation",
    group: "preparation-create",
    // The scene list: no scene open and no area section (the campaign sidebar opens it
    // with tab "preparation").
    when: (ctx) =>
      ctx.view.page === "preparation" &&
      !ctx.view.id &&
      !(ctx.view.tab && registry.get("preparation-section", ctx.view.tab)),
    run: (ctx) => openGenerator(ctx),
  });
  // Inside the encounter builder (B19): Kobold+ "Generate", Ctrl/Cmd+G.
  registry.add("command", {
    id: `${ID}.encounter`,
    label: L("Genera incontro…", "Generate encounter…"),
    roles: ["dm"],
    context: "preparation",
    group: "preparation-create",
    shortcut: "Mod+G",
    when: (ctx) => ctx.view.page === "preparation" && ctx.view.tab === EB.ID,
    run: (ctx) => openGenerator(ctx, "encounter", { encounterId: encounterUi(ctx).openId ?? null }),
  });
  // Owlbear Forecast sits in the map's tools (VTL-065): in the scene editor, beside the map
  // tools, it analyses the map being edited (its unsaved draft included).
  registry.add("command", {
    id: `${ID}.walls-here`,
    label: L("Rileva i muri…", "Detect walls…"),
    description: L(
      "Propone i muri dalla mappa di questa scena; ognuno si conferma",
      "Proposes walls from this scene's map; each one is confirmed",
    ),
    roles: ["dm"],
    context: "preparation",
    group: "preparation-scene-map",
    when: (ctx) => Boolean(editedScene(ctx)),
    run: (ctx) => openGenerator(ctx, "walls", { sceneId: editedScene(ctx) }),
  });
  // Palette entries (B23) for each generator; not rendered as page buttons. The treasure
  // generator answers the words a DM searches for (PR-55).
  const DESCRIPTIONS = {
    treasure: L(
      "Tesoro per GS: bottino, gruzzolo, ricompensa, monete e oggetti magici; poi «Metti nel bottino»",
      "Treasure by CR: loot, hoard, reward, coins and magic items; then “Put in the loot”",
    ),
  };
  for (const [kind, text] of KINDS.filter(([id]) => id !== "encounter"))
    registry.add("command", {
      id: `${ID}.${kind}`,
      label: L(`Genera: ${text.it}`, `Generate: ${text.en}`),
      ...(DESCRIPTIONS[kind] ? { description: DESCRIPTIONS[kind] } : {}),
      roles: ["dm"],
      group: "preparation",
      // From a scene's editor, «Muri da mappa» starts on that scene (and its draft).
      run: (ctx) => openGenerator(ctx, kind, kind === "walls" ? { sceneId: editedScene(ctx) } : {}),
    });
  registry.on("reset", () => resetUi());
  // PR-17: a drafted dungeon's furniture follows its scene once saved.
  registry.on("commit", (payload, { ctx } = {}) => {
    if (ctx) placePendingFurniture(ctx);
  });
}
