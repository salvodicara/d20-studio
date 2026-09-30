// B45 — Exploration, travel and camp: the area's entry module (registry) and its UI.
//
// Where it lives (B61 Table structure): the right sidebar tab «Viaggio e accampamento»
// (Marcia · Viaggio · Campo), the selected creature's light and Search in the Creature
// tab, «Posiziona il gruppo» and «Punto di ricerca» in the DM tools of the left toolbar,
// torch light, found points and weather on a map layer, requests in the bell (B24) and
// the character's light and rations in the sheet's Inventory tab.
// Patterns and rules: see travel-domain.mjs and camp.mjs (census IDs in their headers).

import * as D from "./travel-domain.mjs";
import * as K from "./camp.mjs";
import { rollDie } from "./state.mjs";
import { canViewActor, canControlActor } from "./character-access.mjs";
import { getRest } from "./rest-time.mjs";
import { openRest, restNotifications } from "./rest-ui.mjs";
import * as FV from "./fog-vision-domain.mjs";

const L = (it, en) => ({ it, en });
let area = null;
// View state only (never game data): open sub-tab, formation pick, drag, last dice mode.
const ui = {
  sub: null,
  picked: null,
  diceMode: "digital",
  routeView: null,
  // false, "travel" or "creature": the tab a route opens once (applyRouteTab).
  openTab: false,
  subChanged: false,
  hours: 8,
  // TV-133: the hour the DM means to make camp (WotR: at dusk); the plan starts there.
  campAt: K.DEFAULT_CAMP_TIME,
};
export function resetTravelView() {
  Object.assign(ui, {
    sub: null,
    picked: null,
    routeView: null,
    openTab: false,
    subChanged: false,
    hours: 8,
    campAt: K.DEFAULT_CAMP_TIME,
  });
}
export const ROUTE_TAB = "travel";
// Each identity finds its last sub-tab again on this device (like the B61 sidebar tab).
const SUB_KEY = "d20-studio-travel-sub";
const SUBS = ["march", "journey", "camp"];
function subOf(ctx) {
  if (ui.sub?.[ctx.role]) return ui.sub[ctx.role];
  let id = "march";
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(SUB_KEY) ?? "{}")?.[ctx.role];
    if (SUBS.includes(saved)) id = saved;
  } catch {
    /* no storage: the first sub-tab */
  }
  ui.sub = { ...(ui.sub ?? {}), [ctx.role]: id };
  return id;
}
function setSub(ctx, id) {
  ui.sub = { ...(ui.sub ?? {}), [ctx.role]: id };
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(SUB_KEY) ?? "{}") ?? {};
    globalThis.localStorage?.setItem(SUB_KEY, JSON.stringify({ ...saved, [ctx.role]: id }));
  } catch {
    /* the choice lasts for this page */
  }
}
function forgetSub() {
  try {
    globalThis.localStorage?.removeItem(SUB_KEY);
  } catch {
    /* nothing saved */
  }
}
const sliceOf = (state) => state?.ext?.[D.ID] ?? null;
const rollsOf = (state) => state?.ext?.[D.ROLLS] ?? { rolls: [] };
const cid = (ctx) => D.campaignIdOf(ctx.state);
const campaignOf = (ctx) => D.campaignOf(sliceOf(ctx.state), cid(ctx)) ?? D.emptyCampaign();
const pick = (ctx, value) => D.pick(value, ctx.lang);
const esc = (ctx, value) => ctx.esc(String(value ?? ""));
const nameOf = (ctx, id) => ctx.state.actors?.[id]?.name ?? "—";
const initial = (name) =>
  String(name ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase() || "?";
const num = (lang, value, digits = 1) =>
  Number(value).toLocaleString(lang === "it" ? "it-IT" : "en-GB", {
    maximumFractionDigits: digits,
  });
const distance = (ctx, km) =>
  ctx.lang === "it" ? `${num("it", km)} km` : `${num("en", km / D.KM_PER_MILE)} mi`;
const dmOf = (ctx) => D.isDm(ctx.state, ctx.role);
function sourceText(ctx, source) {
  if (!source) return "";
  if (source.kind === "srd") {
    const loc = source[ctx.lang] ?? source.en;
    return `SRD 5.2.1 ${ctx.lang === "it" ? "IT" : "EN"} p. ${loc.pages.join(", ")}`;
  }
  return `${pick(ctx, { it: source.it, en: source.en })} · ${source.revision}`;
}
const sourceLink = (ctx, source) => {
  if (!source) return "";
  const loc = source.kind === "srd" ? (source[ctx.lang] ?? source.en) : null;
  const text = esc(ctx, sourceText(ctx, source));
  return loc?.url
    ? `<a class="travel-source" href="${esc(ctx, loc.url)}" target="_blank" rel="noopener noreferrer">${text}</a>`
    : `<span class="travel-source">${text}</span>`;
};
const button = (ctx, attrs, text, cls = "") =>
  `<button type="button" class="button${cls ? " " + cls : ""}" ${attrs}>${text}</button>`;
function clockLine(ctx, at = D.now(ctx.state, cid(ctx))) {
  const day = at.date ?? ctx.t(`Giorno ${at.dayNumber}`, `Day ${at.dayNumber}`);
  return `${esc(ctx, day)} · ${D.timeText(at)}`;
}
function localized(ctx, error) {
  return error?.[ctx.lang] || error?.it || error?.message || String(error ?? "");
}

// ------------------------------------------------------------------ commits and rolls
/**
 * One area command: a commit on the travel slices (the rest engine and actors in the same
 * draft when the domain calls them). Accepted rolls join the commit's log entry and are
 * announced with "roll-accepted", like the other areas that keep their own dice.
 * `dialog: true` (a dialog's submit): a refusal is thrown so the app's dialog prints it in
 * its own error line and stays open; a toast would sit behind the modal backdrop.
 */
function act(ctx, label, fn, { dialog = submitting, ...options } = {}) {
  let result,
    rolls = [];
  try {
    ctx.commit(
      label,
      (draft) => {
        result = fn(draft, area.slice(draft), area.slice(draft, D.ROLLS));
        rolls = [result?.roll].filter(Boolean);
      },
      {
        ...options,
        afterCommit: (state) => {
          const entry = state.log?.at(-1);
          if (!entry || !rolls.length) return;
          entry.rolls = [...(entry.rolls ?? []), ...rolls.map((roll) => logRoll(state, roll))];
        },
      },
    );
  } catch (error) {
    if (dialog) {
      const it = error?.it || error?.message || String(error ?? "");
      throw Object.assign(new Error(localized(ctx, error)), { it, en: error?.en || it });
    }
    ctx.toast(localized(ctx, error), true);
    return null;
  }
  const logId = ctx.state.log?.at(-1)?.id ?? null;
  for (const roll of rolls)
    area?.emit?.("roll-accepted", { logId, roll: logRoll(ctx.state, roll) });
  return result ?? true;
}
function logRoll(state, roll) {
  const last = roll.corrections?.at(-1);
  return {
    id: last ? `${roll.id}:c${roll.corrections.length}` : roll.id,
    ...(last
      ? { correctionReason: last.reason, previousValues: [...last.values], corrects: roll.id }
      : {}),
    source: "travel",
    kind: roll.kind,
    actorId: roll.actorId ?? null,
    actorName: roll.actorId ? state.actors?.[roll.actorId]?.name : null,
    label: structuredClone(roll.label),
    controller: roll.by,
    owner: roll.by,
    visibility: roll.visibility,
    mode: roll.mode,
    dice: [{ count: roll.values.length, sides: roll.sides }],
    values: [...roll.values],
    natural: roll.natural ?? roll.values[0],
    modifier: roll.modifier ?? 0,
    total: roll.total,
    dc: roll.dc ?? null,
    rollMode: roll.rollMode ?? "normal",
    status: last ? "corrected" : roll.reusedFrom ? "reused" : "accepted",
  };
}
// True while a dialog of this area runs its submit: `act` then reports in the dialog.
let submitting = false;
/** The app dialog, with every area command of its submit reporting refusals inside it. */
function openDialog(ctx, title, body, options = {}) {
  const onSubmit = options.onSubmit;
  ctx.dialog(title, body, {
    ...options,
    ...(onSubmit
      ? {
          onSubmit: (...args) => {
            submitting = true;
            try {
              return onSubmit(...args);
            } finally {
              submitting = false;
            }
          },
        }
      : {}),
  });
}
const online = (ctx) => ({ online: !ctx.offline });
const rng = (ctx) => (sides) => (ctx.rollDie || rollDie)(sides);
/**
 * The app's roll dialog (combat requests): digital or physical dice; physical faces are
 * typed as rolled, the modifier is added once. Escape leaves the request pending.
 */
function rollDialog(ctx, { title, sides, count, summary, onRoll }) {
  const faces = Array.from(
    { length: count },
    (_, i) =>
      `<label class="field">${ctx.t("Dado", "Die")} ${i + 1} · d${sides}<input type="number" name="face${i}" min="1" max="${sides}" step="1" inputmode="numeric"></label>`,
  ).join("");
  openDialog(
    ctx,
    title,
    `<div class="travel-roll-dialog">${summary}<label class="field">${ctx.t("Dadi", "Dice")}<select name="diceMode" data-travel-dice-mode><option value="digital">${ctx.t("Digitali", "Digital")}</option><option value="physical"${ui.diceMode === "physical" ? " selected" : ""}>${ctx.t("Fisici", "Physical")}</option></select></label><div class="travel-physical" data-travel-physical${ui.diceMode === "physical" ? "" : " hidden"}>${faces}</div><p class="muted">${ctx.t("Inserisci le facce naturali. Il modificatore viene aggiunto una volta. Esc lascia il tiro in attesa.", "Enter natural faces. The modifier is added once. Escape leaves the roll pending.")}</p></div>`,
    {
      submitLabel: ctx.t("Tira", "Roll"),
      onSubmit: (data) => {
        const mode = data.get("diceMode") === "physical" ? "physical" : "digital";
        ui.diceMode = mode;
        const values =
          mode === "physical"
            ? Array.from({ length: count }, (_, i) => Number(data.get(`face${i}`)))
            : null;
        return onRoll(mode, values) === null ? false : undefined;
      },
    },
  );
  if (typeof document === "undefined") return;
  const select = document.querySelector("#dialog [data-travel-dice-mode]");
  const physical = document.querySelector("#dialog [data-travel-physical]");
  select?.addEventListener("change", () => {
    physical.hidden = select.value !== "physical";
    physical.querySelectorAll("input").forEach((input) => (input.required = !physical.hidden));
    if (!physical.hidden) physical.querySelector("input")?.focus();
  });
  if (physical && !physical.hidden)
    physical.querySelectorAll("input").forEach((input) => (input.required = true));
}

// ------------------------------------------------------------------ checks (shared block)
const modeText = (ctx, mode) =>
  mode === "advantage"
    ? ctx.t("vantaggio", "advantage")
    : mode === "disadvantage"
      ? ctx.t("svantaggio", "disadvantage")
      : "";
const showsDc = (ctx, check) => dmOf(ctx) || check.kind === "extended";
function checkContext(ctx, c, check) {
  if (check.kind === "watch") return ctx.t("turno di guardia", "watch shift");
  if (check.kind === "extended")
    return ctx.t(
      `viaggio prolungato, ${check.context.hour}ª ora`,
      `extended travel, hour ${check.context.hour}`,
    );
  if (check.kind === "search") return ctx.t("Cercare", "Search");
  if (check.kind === "travel") {
    const event = c.events.find((e) => e.id === check.context.eventId);
    const row = D.EVENT_TABLE.rows.find((r) => r.id === event?.rowId);
    return row ? pick(ctx, row.title) : ctx.t("evento di viaggio", "travel event");
  }
  return "";
}
function checkLine(ctx, c, check) {
  const profile = D.checkProfile(ctx.state, check);
  const reasons = profile.reasons
    .map(
      (r) =>
        `<span class="badge travel-badge-${r.mode}">${esc(ctx, pick(ctx, r.label))} · ${esc(ctx, modeText(ctx, r.mode))}</span>`,
    )
    .join("");
  const bonus = `${profile.bonus >= 0 ? "+" : "−"}${Math.abs(profile.bonus)}`;
  return `<strong>${esc(ctx, nameOf(ctx, check.actorId))}</strong> · ${esc(ctx, pick(ctx, D.checkName(check)))} ${bonus}${showsDc(ctx, check) && check.dc !== null ? ` · ${ctx.t("CD", "DC")} ${check.dc}` : ""} <span class="muted">· ${esc(ctx, checkContext(ctx, c, check))}</span>${profile.penalty ? ` <span class="badge">${ctx.t("Indebolimento", "Exhaustion")} −${profile.penalty}</span>` : ""}${reasons}`;
}
function resultText(ctx, check) {
  if (check.status === "pending") return ctx.t("in attesa", "pending");
  const verdict =
    check.success === true && showsDc(ctx, check)
      ? ` · ${ctx.t("successo", "success")}`
      : check.success === false && showsDc(ctx, check)
        ? ` · ${ctx.t("fallimento", "failure")}`
        : "";
  const how =
    check.status === "passive"
      ? ctx.t("passiva", "passive")
      : check.mode === "physical"
        ? ctx.t("dado fisico", "physical die")
        : ctx.t("dado digitale", "digital die");
  return `${check.total} (${how})${verdict}${check.corrected ? ` · ${ctx.t("corretto", "corrected")}: ${check.corrected}` : ""}`;
}
function checksBlock(ctx, c, filter = () => true) {
  const mine = D.pendingChecksFor(ctx.state, c, ctx.role).filter(filter);
  const dm = dmOf(ctx);
  const others = dm
    ? c.checks.filter((x) => x.status === "pending" && !mine.includes(x)).filter(filter)
    : [];
  if (!mine.length && !others.length) return "";
  const item = (check, own) =>
    `<li class="travel-check" data-travel-check="${esc(ctx, check.id)}"><span class="travel-check-text">${checkLine(ctx, c, check)}</span><span class="toolbar">${own ? button(ctx, `data-travel-roll="${esc(ctx, check.id)}"`, ctx.t("Tira", "Roll"), "primary") : `<span class="muted">${ctx.t("Tira chi gioca il personaggio", "The character’s player rolls")}</span>`}${dm && !check.save ? button(ctx, `data-travel-passive="${esc(ctx, check.id)}"`, `${ctx.t("Usa passiva", "Use passive")} (${D.passiveScore(ctx.state.actors[check.actorId], check)})`, "quiet") : ""}</span></li>`;
  return `<section class="travel-card travel-checks" aria-labelledby="travel-checks-title"><h3 id="travel-checks-title">${ctx.t("Tiri richiesti", "Requested rolls")} <span class="badge">${mine.length + others.length}</span></h3><ul class="travel-list">${mine.map((x) => item(x, true)).join("")}${others.map((x) => item(x, false)).join("")}</ul></section>`;
}
function resolvedList(ctx, c, checks, extra = () => "") {
  if (!checks.length) return "";
  const rolls = rollsOf(ctx.state).rolls;
  return `<ul class="travel-list travel-results">${checks
    .map((check) => {
      const roll = rolls.find((r) => r.id === check.rollId);
      const correct =
        check.status === "rolled" && roll?.mode === "physical" && roll.by === ctx.role
          ? button(
              ctx,
              `data-travel-correct="${esc(ctx, check.id)}"`,
              ctx.t("Correggi", "Correct"),
              "quiet",
            )
          : "";
      const tone =
        showsDc(ctx, check) && check.success !== null ? (check.success ? "ok" : "ko") : "";
      return `<li class="travel-result ${tone ? "is-" + tone : ""}" data-travel-result="${esc(ctx, check.id)}"><span><strong>${esc(ctx, nameOf(ctx, check.actorId))}</strong> · ${esc(ctx, pick(ctx, D.checkName(check)))}: ${esc(ctx, resultText(ctx, check))}${extra(check)}</span>${correct}</li>`;
    })
    .join("")}</ul>`;
}
function openCheckRoll(ctx, checkId) {
  const c = campaignOf(ctx);
  const check = c.checks.find((x) => x.id === checkId);
  if (!check) return;
  const profile = D.checkProfile(ctx.state, check);
  const count = profile.mode === "normal" ? 1 : 2;
  rollDialog(ctx, {
    title: `${nameOf(ctx, check.actorId)} · ${pick(ctx, D.checkName(check))}`,
    sides: 20,
    count,
    summary: `<p>${checkLine(ctx, c, check)}</p><p class="muted">${count === 2 ? ctx.t(`Due d20: si tiene ${profile.mode === "advantage" ? "il più alto" : "il più basso"}.`, `Two d20: keep the ${profile.mode === "advantage" ? "higher" : "lower"}.`) : "d20"}</p>`,
    onRoll: (mode, faces) =>
      act(
        ctx,
        ctx.t(
          `Prova: ${nameOf(ctx, check.actorId)} · ${pick(ctx, D.checkName(check))}`,
          `Check: ${nameOf(ctx, check.actorId)} · ${pick(ctx, D.checkName(check))}`,
        ),
        (draft, slice, rolls) =>
          D.rollCheck(draft, slice, rolls, { checkId, mode, faces }, ctx.role, rng(ctx)),
      ),
  });
}
function openCorrect(ctx, checkId) {
  const c = campaignOf(ctx);
  const check = c.checks.find((x) => x.id === checkId);
  const roll = rollsOf(ctx.state).rolls.find((r) => r.id === check?.rollId);
  if (!check || !roll) return;
  openDialog(
    ctx,
    ctx.t("Correggi le facce del dado fisico", "Correct the physical die faces"),
    `<p>${esc(ctx, nameOf(ctx, check.actorId))} · ${esc(ctx, pick(ctx, D.checkName(check)))} → [${esc(ctx, roll.values.join(", "))}] = ${roll.total}</p>${roll.values.map((v, i) => `<label class="field">${ctx.t("Dado", "Die")} ${i + 1} · d20<input type="number" name="face${i}" min="1" max="20" value="${v}" inputmode="numeric" required></label>`).join("")}<label class="field">${ctx.t("Motivo", "Reason")}<textarea name="reason" maxlength="200" required></textarea></label><p class="muted">${ctx.t("Le facce precedenti restano nella cronologia del tiro.", "The earlier faces stay in the roll history.")}</p>`,
    {
      submitLabel: ctx.t("Registra la correzione", "Record the correction"),
      onSubmit: (data) =>
        act(
          ctx,
          ctx.t("Correzione del tiro", "Roll correction"),
          (draft, slice, rolls) =>
            D.correctCheck(
              draft,
              slice,
              rolls,
              {
                checkId,
                faces: roll.values.map((_, i) => data.get(`face${i}`)),
                reason: data.get("reason"),
              },
              ctx.role,
            ),
          { undoable: false },
        ) === null
          ? false
          : undefined,
    },
  );
}

// ------------------------------------------------------------------ Marcia (formation)
const FACING_TEXT = {
  north: L("Nord ↑", "North ↑"),
  east: L("Est →", "East →"),
  south: L("Sud ↓", "South ↓"),
  west: L("Ovest ←", "West ←"),
};
function marchHTML(ctx, c) {
  const f = c.formation;
  const ids = D.memberIds(ctx.state);
  const cells = f.cells.map((id) => (id && ids.includes(id) ? id : null));
  const rankName = (r) =>
    r === 0
      ? ctx.t("Testa", "Front")
      : r === f.rows - 1
        ? ctx.t("Coda", "Rear")
        : ctx.t(`${r + 1}ª fila`, `Rank ${r + 1}`);
  const cell = (id, i) => {
    const r = Math.floor(i / f.cols),
      col = (i % f.cols) + 1;
    const label = `${rankName(r)}, ${ctx.t("colonna", "column")} ${col}: ${id ? nameOf(ctx, id) : ctx.t("vuota", "empty")}`;
    return `<button type="button" class="travel-cell${id ? " is-filled" : ""}${id && ui.picked === id ? " is-picked" : ""}" data-travel-cell="${i}"${id ? ` data-travel-drag="${esc(ctx, id)}"` : ""} aria-label="${esc(ctx, label)}"${id ? ` aria-pressed="${ui.picked === id}"` : ""}>${id ? `<span class="travel-avatar" aria-hidden="true">${esc(ctx, initial(nameOf(ctx, id)))}</span><span class="travel-cell-name">${esc(ctx, nameOf(ctx, id))}</span>` : `<span class="travel-cell-empty" aria-hidden="true">+</span>`}</button>`;
  };
  const rows = Array.from(
    { length: f.rows },
    (_, r) =>
      `<div class="travel-rank" role="group" aria-label="${esc(ctx, rankName(r))}"><span class="travel-rank-name">${esc(ctx, rankName(r))}</span>${cells
        .slice(r * f.cols, (r + 1) * f.cols)
        .map((id, k) => cell(id, r * f.cols + k))
        .join("")}</div>`,
  ).join("");
  const out = D.unplaced(ctx.state, { ...f, cells });
  const order = D.marchingOrder({ ...f, cells });
  const orderText = order.length
    ? order
        .map(
          (rank, i) =>
            `${i === 0 ? ctx.t("davanti", "front") : i === order.length - 1 ? ctx.t("in coda", "rear") : ctx.t("poi", "then")}: ${rank.map((id) => nameOf(ctx, id)).join(", ")}`,
        )
        .join(" · ")
    : ctx.t("nessuno in formazione", "nobody placed");
  return `<section class="travel-card" aria-labelledby="travel-march-title"><div class="travel-card-head"><h3 id="travel-march-title">${ctx.t("Ordine di marcia", "Marching order")}</h3><span class="travel-facing" data-travel-facing="${f.facing}">${ctx.t("Fronte", "Facing")}: ${esc(ctx, pick(ctx, FACING_TEXT[f.facing]))}</span></div><div class="travel-formation" data-travel-formation data-facing="${f.facing}">${rows}</div><div class="travel-unplaced" aria-label="${ctx.t("Fuori formazione", "Not placed")}"><span class="muted">${ctx.t("Fuori formazione", "Not placed")}:</span>${out.length ? out.map((id) => `<button type="button" class="travel-chip${ui.picked === id ? " is-picked" : ""}" data-travel-member="${esc(ctx, id)}" data-travel-drag="${esc(ctx, id)}" aria-pressed="${ui.picked === id}"><span class="travel-avatar" aria-hidden="true">${esc(ctx, initial(nameOf(ctx, id)))}</span>${esc(ctx, nameOf(ctx, id))}</button>`).join("") : `<span class="muted">${ctx.t("nessuno", "none")}</span>`}</div><p class="muted travel-hint" data-travel-hint>${ui.picked ? ctx.t(`${nameOf(ctx, ui.picked)} scelto: tocca una casella per spostarlo.`, `${nameOf(ctx, ui.picked)} picked: tap a cell to move them.`) : ctx.t("Tocca un personaggio e poi una casella, oppure trascinalo.", "Tap a character then a cell, or drag it.")}</p><div class="toolbar travel-tools">${[1, 2, 3].map((n) => button(ctx, `data-travel-fill="${n}"`, n === 1 ? ctx.t("1 colonna", "1 column") : ctx.t(`${n} colonne`, `${n} columns`), "quiet")).join("")}${button(ctx, "data-travel-group-all", ctx.t("Raggruppa tutti", "Group all"), "quiet")}${button(ctx, `data-travel-rotate="-1" aria-label="${ctx.t("Ruota a sinistra", "Rotate left")}"`, "↺", "quiet")}${button(ctx, `data-travel-rotate="1" aria-label="${ctx.t("Ruota a destra", "Rotate right")}"`, "↻", "quiet")}${ui.picked && cells.includes(ui.picked) ? button(ctx, "data-travel-unplace", ctx.t(`Togli ${nameOf(ctx, ui.picked)}`, `Remove ${nameOf(ctx, ui.picked)}`), "quiet") : ""}</div><p class="travel-order" data-travel-order>${esc(ctx, orderText)}</p>${dmOf(ctx) ? `<div class="toolbar">${button(ctx, "data-travel-place", `${ctx.icon("person")} ${ctx.t("Posiziona il gruppo sulla mappa", "Place the party on the map")}`, "primary")}</div>` : ""}<p class="muted">${ctx.t("L’ordine di marcia dice chi incontra per primo trappole e nemici.", "The marching order tells who meets traps and enemies first.")} ${sourceLink(ctx, D.SOURCES.marching)}</p></section>`;
}

// ------------------------------------------------------------------ Viaggio (journey)
function journeyHTML(ctx, c) {
  const dm = dmOf(ctx);
  const j = c.journey;
  if (!j || j.status !== "underway") {
    const last = !j
      ? ""
      : j.status === "cancelled"
        ? `<p class="travel-arrived">${esc(ctx, ctx.t(`Viaggio verso ${j.to} annullato: ${j.reason}`, `Journey to ${j.to} cancelled: ${j.reason}`))}</p>`
        : `<p class="travel-arrived" data-travel-arrived>${esc(ctx, ctx.t(`Arrivati a ${j.to}.`, `Arrived at ${j.to}.`))} ${esc(ctx, distance(ctx, j.km))}</p>`;
    return `<section class="travel-card" aria-labelledby="travel-journey-title"><h3 id="travel-journey-title">${ctx.t("Viaggio", "Journey")}</h3>${last}${dm ? newJourneyForm(ctx) : `<p class="muted">${ctx.t("Nessun viaggio in corso: lo avvia il DM.", "No journey underway: the DM starts one.")}</p>`}</section>`;
  }
  const percent = Math.min(100, Math.round((j.travelledKm / j.km) * 100));
  const terrain = D.terrainOf(j.terrain);
  const options = D.paceOptions(ctx.state, j);
  const hours = Number(ui.hours ?? 8);
  const plan = D.travelPlan(ctx.state, j, hours, cid(ctx));
  const paces = options
    .map(
      (o) =>
        `<label class="travel-pace${o.pace.id === j.pace ? " is-active" : ""}${o.allowed ? "" : " is-blocked"}"><input type="radio" name="travel-pace" value="${o.pace.id}" data-travel-pace${o.pace.id === j.pace ? " checked" : ""}${dm && o.allowed ? "" : ` disabled aria-describedby="${!dm ? "travel-pace-why" : `travel-pace-why-${o.pace.id}`}"`}><span><strong>${esc(ctx, ctx.t(o.pace.it, o.pace.en))}</strong> · ${esc(ctx, distance(ctx, o.pace.kmHour))}/h · ${esc(ctx, distance(ctx, o.pace.kmDay))}/${ctx.t("giorno", "day")}<small>${esc(ctx, pick(ctx, o.effect))}</small>${o.reason ? `<small class="travel-warn" id="travel-pace-why-${o.pace.id}">${esc(ctx, pick(ctx, o.reason))}</small>` : dm && !o.allowed ? `<small class="travel-warn" id="travel-pace-why-${o.pace.id}">${ctx.t("Andatura non disponibile qui.", "Pace not available here.")}</small>` : ""}</span></label>`,
    )
    .join("");
  const log = [...j.log]
    .reverse()
    .slice(0, 6)
    .map((entry) => logLine(ctx, c, entry))
    .join("");
  const extended = plan.saves.length
    ? `<p class="travel-warn" data-travel-extended>${ctx.t(`Viaggio prolungato oltre 8 ore: ogni viaggiatore fa un TS Costituzione per ogni ora in più (CD ${plan.saves.map((s) => s.dc).join(", ")}); chi fallisce ottiene 1 livello di Indebolimento.`, `Extended travel beyond 8 hours: each traveler makes a Constitution save for each extra hour (DC ${plan.saves.map((s) => s.dc).join(", ")}); on a failure they gain 1 Exhaustion level.`)} ${sourceLink(ctx, D.SOURCES.terrain)}</p>`
    : "";
  const controls = dm
    ? `<div class="travel-go"><label class="field travel-hours">${ctx.t("Ore di viaggio", "Hours of travel")}<select data-travel-hours>${Array.from(
        { length: D.MAX_TRAVEL_HOURS },
        (_, i) => i + 1,
      )
        .map(
          (h) =>
            `<option value="${h}"${h === hours ? " selected" : ""}>${h} h${h > 8 ? " · " + ctx.t("prolungato", "extended") : ""}</option>`,
        )
        .join(
          "",
        )}</select></label><p class="travel-preview" data-travel-preview>${esc(ctx, ctx.t(`${plan.arrives ? "Arrivo" : `${hours} h`}: ${distance(ctx, plan.km)} a passo ${plan.pace.it.toLowerCase()} · orologio → ${D.timeText(plan.after)}${plan.after.day !== D.now(ctx.state, cid(ctx)).day ? " del giorno dopo" : ""}`, `${plan.arrives ? "Arrival" : `${hours} h`}: ${distance(ctx, plan.km)} at a ${plan.pace.en.toLowerCase()} pace · clock → ${D.timeText(plan.after)}${plan.after.day !== D.now(ctx.state, cid(ctx)).day ? " next day" : ""}`))}</p>${extended}<div class="toolbar">${button(ctx, "data-travel-go", ctx.t("Viaggia", "Travel"), "primary")}${button(ctx, "data-travel-event", ctx.t("Tira un evento", "Roll an event"))}${button(ctx, "data-travel-summary", ctx.t("Riassumi il viaggio", "Summarise the journey"), "quiet")}${button(ctx, "data-travel-cancel", ctx.t("Annulla il viaggio", "Cancel the journey"), "quiet")}</div></div>`
    : `<p class="muted">${ctx.t("Il DM sceglie il passo e fa avanzare il viaggio.", "The DM picks the pace and moves the journey on.")}</p>`;
  return `<section class="travel-card" aria-labelledby="travel-journey-title"><div class="travel-card-head"><h3 id="travel-journey-title">${esc(ctx, `${j.from} → ${j.to}`)}</h3><span class="muted">${esc(ctx, ctx.t(terrain.it, terrain.en))}${j.road ? " · " + ctx.t("strada buona", "good road") : ""}</span></div><div class="travel-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${ctx.t("Percorso", "Progress")}"><span style="width:${percent}%"></span></div><p data-travel-progress>${esc(ctx, ctx.t(`${distance(ctx, j.travelledKm)} di ${distance(ctx, j.km)} · restano ${distance(ctx, plan.remaining)}`, `${distance(ctx, j.travelledKm)} of ${distance(ctx, j.km)} · ${distance(ctx, plan.remaining)} to go`))}</p><fieldset class="travel-paces"><legend>${ctx.t("Passo", "Pace")} · ${sourceLink(ctx, D.SOURCES.pace)}</legend>${paces}${dm ? "" : `<small class="travel-why" id="travel-pace-why">${ctx.t("Il passo lo sceglie il DM: chiediglielo se vuoi cambiarlo.", "The DM chooses the pace: ask them to change it.")}</small>`}</fieldset>${controls}${eventsHTML(ctx, c)}${extendedHTML(ctx, c, j)}${log ? `<h4>${ctx.t("Diario di marcia", "March log")}</h4><ul class="travel-list travel-log" data-travel-log>${log}</ul>` : ""}</section>`;
}
// SRD Extended Travel: a failed save means 1 Exhaustion level. The DM applies it in the
// shared Conditions panel (nothing is applied here); a success needs nothing.
function extendedHTML(ctx, c, j) {
  const checks = D.visibleChecks(ctx.state, c, ctx.role).filter(
    (x) => x.kind === "extended" && x.context.journeyId === j.id && x.status !== "pending",
  );
  if (!checks.length) return "";
  const failed = (check) =>
    check.success === false
      ? `<small class="travel-warn">${ctx.t("Fallito: 1 livello di Indebolimento, lo applica il DM.", "Failed: 1 Exhaustion level, applied by the DM.")}${dmOf(ctx) ? ` ${button(ctx, `data-travel-conditions="${esc(ctx, check.actorId)}"`, ctx.t("Condizioni e stato", "Conditions and status"), "quiet")}` : ""}</small>`
      : "";
  return `<h4>${ctx.t("Tiri salvezza del viaggio prolungato", "Extended travel saves")}</h4>${resolvedList(ctx, c, checks.slice(-9), failed)}`;
}
function logLine(ctx, c, entry) {
  const at = D.now(ctx.state, cid(ctx), entry.at);
  const when = clockLine(ctx, at);
  if (entry.kind === "travel") {
    const pace = D.paceOf(entry.pace);
    const h = D.durationParts(entry.seconds);
    return `<li><span class="muted">${when}</span> ${esc(ctx, ctx.t(`${h.hours} h${h.minutes ? ` ${h.minutes} min` : ""} a passo ${pace.it.toLowerCase()}: ${distance(ctx, entry.km)}${entry.extended ? ` · ${entry.extended} h oltre le 8` : ""}`, `${h.hours} h${h.minutes ? ` ${h.minutes} min` : ""} at a ${pace.en.toLowerCase()} pace: ${distance(ctx, entry.km)}${entry.extended ? ` · ${entry.extended} h beyond 8` : ""}`))}</li>`;
  }
  if (entry.kind === "arrived")
    return `<li><span class="muted">${when}</span> <strong>${ctx.t("Arrivo", "Arrival")}</strong></li>`;
  if (entry.kind === "summary")
    return `<li><span class="muted">${when}</span> ${esc(ctx, ctx.t(`Riassunto dal DM: ${entry.seconds / D.DAY} giorni.`, `Summarised by the DM: ${entry.seconds / D.DAY} days.`))} ${esc(ctx, entry.note ?? "")}</li>`;
  if (entry.kind === "event") {
    const event = c.events.find((e) => e.id === entry.eventId);
    const row = D.EVENT_TABLE.rows.find((r) => r.id === event?.rowId);
    return row
      ? `<li><span class="muted">${when}</span> ${ctx.t("Evento", "Event")}: <strong>${esc(ctx, pick(ctx, row.title))}</strong> — ${esc(ctx, pick(ctx, row.text))}</li>`
      : "";
  }
  return "";
}
function eventsHTML(ctx, c) {
  const dm = dmOf(ctx);
  const proposed = dm ? c.events.filter((e) => e.status === "proposed") : [];
  const accepted = D.visibleEvents(ctx.state, c, ctx.role)
    .filter((e) => e.status === "accepted" && e.checkIds.length)
    .slice(-2);
  const proposal = proposed
    .map((event) => {
      const row = D.EVENT_TABLE.rows.find((r) => r.id === event.rowId);
      const check = D.eventCheck(event, event.terrain);
      const data = D.TERRAIN_DATA[event.terrain];
      const members = D.members(ctx.state);
      // The marching order says who spots and leads first (SRD): its front rank rolls.
      const front = (D.marchingOrder(c.formation)[0] ?? []).filter((id) =>
        members.some((a) => a.id === id),
      );
      const asked = (a, i) => (front.length ? front.includes(a.id) : i === 0);
      return `<article class="travel-proposal" data-travel-proposal="${esc(ctx, event.id)}" aria-labelledby="travel-proposal-${esc(ctx, event.id)}"><p class="travel-kicker">${ctx.t("Proposta, non applicata", "Proposal, not applied")} · d${D.EVENT_TABLE.sides} = ${event.face}</p><h4 id="travel-proposal-${esc(ctx, event.id)}">${esc(ctx, pick(ctx, row.title))}</h4><p>${esc(ctx, pick(ctx, row.text))}</p>${check ? `<p>${ctx.t("Prova suggerita", "Suggested check")}: <strong>${esc(ctx, pick(ctx, D.checkName(check)))}</strong> · ${ctx.t("CD", "DC")} ${check.dc} (${ctx.t("tabella del terreno", "terrain table")}, ${sourceLink(ctx, D.SOURCES.terrain)})</p><fieldset class="travel-who"><legend>${ctx.t("Chi tira", "Who rolls")}</legend>${members.map((a, i) => `<label><input type="checkbox" data-travel-event-actor="${esc(ctx, a.id)}"${asked(a, i) ? " checked" : ""}> ${esc(ctx, a.name)}</label>`).join("")}</fieldset>` : ""}${row.distance ? `<p>${ctx.t("Distanza d’incontro del terreno", "Terrain encounter distance")}: ${esc(ctx, data.distance)} × ${ctx.t("3 metri", "10 feet")} · ${sourceLink(ctx, D.SOURCES.terrain)}</p>` : ""}<p class="muted">${sourceLink(ctx, D.EVENT_TABLE.source)}</p><div class="toolbar">${button(ctx, `data-travel-accept="${esc(ctx, event.id)}"`, check ? ctx.t("Accetta e chiedi la prova", "Accept and ask the check") : ctx.t("Accetta", "Accept"), "primary")}${button(ctx, `data-travel-dismiss="${esc(ctx, event.id)}"`, ctx.t("Scarta", "Dismiss"), "quiet")}</div></article>`;
    })
    .join("");
  const results = accepted
    .map((event) => {
      const row = D.EVENT_TABLE.rows.find((r) => r.id === event.rowId);
      const checks = event.checkIds.map((id) => c.checks.find((x) => x.id === id)).filter(Boolean);
      return `<div class="travel-event-result"><p><strong>${esc(ctx, pick(ctx, row.title))}</strong></p>${resolvedList(
        ctx,
        c,
        checks.filter((x) => x.status !== "pending"),
      )}</div>`;
    })
    .join("");
  return proposal + results;
}
function newJourneyForm(ctx) {
  const unit = ctx.lang === "it" ? "km" : "mi";
  return `<form class="travel-form" data-travel-new-journey><div class="travel-form-grid"><label class="field">${ctx.t("Da", "From")}<input name="from" required maxlength="80" value="${esc(ctx, campaignOf(ctx).journey?.to ?? "")}"></label><label class="field">${ctx.t("A", "To")}<input name="to" required maxlength="80"></label><label class="field">${ctx.t("Distanza", "Distance")} (${unit})<input name="distance" type="number" min="0.5" max="3000" step="0.5" required inputmode="decimal"></label><label class="field">${ctx.t("Terreno", "Terrain")}<select name="terrain">${D.TERRAINS.map((t) => `<option value="${t.id}"${t.id === "hill" ? " selected" : ""}>${esc(ctx, ctx.t(t.it, t.en))}</option>`).join("")}</select></label></div><label class="travel-check-label"><input type="checkbox" name="road"> ${ctx.t("Strada buona (passo massimo +1)", "Good road (maximum pace +1)")}</label><div class="toolbar"><button type="submit" class="button primary">${ctx.t("Parti", "Set out")}</button></div><p class="muted">${sourceLink(ctx, D.SOURCES.terrain)}</p></form>`;
}
function weatherHTML(ctx, c) {
  const dm = dmOf(ctx);
  const day = D.todayWeather(ctx.state, c, ctx.role, cid(ctx));
  let body;
  if (!day)
    body = `<p class="muted" data-travel-weather-none>${dm ? ctx.t("Nessun meteo registrato oggi.", "No weather recorded today.") : ctx.t("Il DM non ha ancora indicato il meteo di oggi.", "The DM has not set today’s weather yet.")}</p>`;
  else if (day.hidden)
    body = `<p class="muted" data-travel-weather-hidden>${ctx.t("Il DM non ha condiviso il meteo di oggi.", "The DM has not shared today’s weather.")}</p>`;
  else {
    const w = D.WEATHER[day.conditionId];
    const effects = w.effects.length
      ? `<ul class="travel-effects">${w.effects.map((e) => `<li>${esc(ctx, pick(ctx, e.text))} ${sourceLink(ctx, e.source)}</li>`).join("")}</ul>`
      : `<p class="muted">${ctx.t("Nessun effetto di regola.", "No rule effect.")}</p>`;
    const history =
      dm && day.changes?.length
        ? `<details><summary>${ctx.t("Cronologia", "History")} (${day.changes.length})</summary><ul class="travel-list">${day.changes.map((ch) => `<li>${esc(ctx, pick(ctx, D.WEATHER[ch.from]?.name))} → ${esc(ctx, pick(ctx, D.WEATHER[ch.to]?.name))}: ${esc(ctx, pick(ctx, ch.reason))}</li>`).join("")}</ul></details>`
        : "";
    body = `<p class="travel-weather-now" data-travel-weather="${esc(ctx, day.conditionId)}"><span class="travel-weather-icon" aria-hidden="true">${w.icon}</span><strong>${esc(ctx, pick(ctx, w.name))}</strong>${dm ? ` <span class="badge">${day.shared ? ctx.t("Condiviso", "Shared") : ctx.t("Solo DM", "DM only")}</span>` : ""}${day.face ? ` <span class="muted">d20 = ${day.face}</span>` : ""}</p>${effects}${history}`;
  }
  const climate = c.weather.climate;
  // The empty choice follows the World calendar (B42): it names the season it gives now.
  const calendarSeason = D.weatherSeason(ctx.state, null, cid(ctx));
  const controls = dm
    ? `<div class="travel-form-grid"><label class="field">${ctx.t("Clima", "Climate")}<select data-travel-climate>${D.CLIMATES.map((x) => `<option value="${x.id}"${x.id === climate ? " selected" : ""}>${esc(ctx, pick(ctx, x.name))}</option>`).join("")}</select></label><label class="field">${ctx.t("Stagione", "Season")}<select data-travel-season><option value=""${c.weather.season ? "" : " selected"}>${ctx.t("Dal calendario", "From the calendar")} (${esc(ctx, pick(ctx, D.SEASONS.find((s) => s.id === calendarSeason)?.name))})</option>${D.SEASONS.map((x) => `<option value="${x.id}"${x.id === c.weather.season ? " selected" : ""}>${esc(ctx, pick(ctx, x.name))}</option>`).join("")}</select></label></div><div class="toolbar">${button(ctx, "data-travel-weather-roll", ctx.t("Genera il meteo", "Generate weather"))}${button(ctx, "data-travel-weather-set", ctx.t("Cambia", "Change"), "quiet")}${day && !day.hidden ? `<label class="travel-check-label"><input type="checkbox" data-travel-weather-share${day.shared ? " checked" : ""}> ${ctx.t("Mostra ai giocatori", "Show to players")}</label>` : ""}${day && !day.hidden && D.MAP_WEATHER[day.conditionId] ? `<label class="travel-check-label"><input type="checkbox" data-travel-weather-map${day.onMap ? " checked" : ""}> ${ctx.t("Sulla mappa", "On the map")}</label>` : ""}</div><p class="muted">${sourceLink(ctx, D.AUTHORED.weather)}</p>`
    : "";
  return `<section class="travel-card" aria-labelledby="travel-weather-title"><h3 id="travel-weather-title">${ctx.t("Meteo di oggi", "Today’s weather")}</h3>${body}${controls}</section>`;
}
function provisionsHTML(ctx, c) {
  const dm = dmOf(ctx);
  const at = D.now(ctx.state, cid(ctx));
  const day = c.provisions.days[at.day];
  const rows = D.members(ctx.state)
    .filter((a) => canViewActor(a, ctx.role, ctx.state))
    .map((actor) => {
      const answer = day?.rows?.[actor.id];
      const count = D.rationCount(actor);
      const mayAnswer =
        answer?.status === "pending" &&
        canControlActor(actor, ctx.role, ctx.state) &&
        (actor.owner === ctx.role || (ctx.role === "dm" && actor.owner === "dm"));
      const status = !answer
        ? ""
        : answer.status === "pending"
          ? ctx.t("in attesa del consenso", "waiting for consent")
          : answer.status === "eat"
            ? ctx.t(`ha mangiato (−${answer.rations} razione)`, `ate (−${answer.rations} Rations)`)
            : answer.status === "other"
              ? ctx.t("altra fonte di cibo", "other food")
              : ctx.t("ha saltato il pasto", "skipped the meal");
      return `<li class="travel-supply" data-travel-supply="${esc(ctx, actor.id)}"><span><strong>${esc(ctx, actor.name)}</strong> · ${ctx.t("Razioni", "Rations")}: <span data-travel-rations>${count}</span>${status ? ` · <em>${esc(ctx, status)}</em>` : ""}</span>${mayAnswer ? `<span class="toolbar">${button(ctx, `data-travel-eat="${esc(ctx, actor.id)}"${count < D.rationsNeeded(actor) ? ` disabled aria-describedby="travel-eat-why-${esc(ctx, actor.id)}"` : ""}`, ctx.t("Consuma 1 razione", "Use 1 Rations"), "primary")}${button(ctx, `data-travel-other="${esc(ctx, actor.id)}"`, ctx.t("Altra fonte", "Other food"), "quiet")}${button(ctx, `data-travel-skip="${esc(ctx, actor.id)}"`, ctx.t("Salta", "Skip"), "quiet")}</span>${count < D.rationsNeeded(actor) ? `<small class="travel-why" id="travel-eat-why-${esc(ctx, actor.id)}">${ctx.t("Razioni finite: scegli «Altra fonte» o «Salta», o aggiungi razioni all’Inventario.", "No Rations left: choose “Other food” or “Skip”, or add Rations to the Inventory.")}</small>` : ""}` : answer?.status === "pending" ? `<span class="muted">${ctx.t("Decide chi gioca il personaggio", "The character’s player decides")}</span>` : ""}</li>`;
    })
    .join("");
  const warnings = D.provisionWarnings(ctx.state, c, at.day).filter(
    (w) => !w.actorId || canViewActor(ctx.state.actors[w.actorId], ctx.role, ctx.state),
  );
  const warn = warnings.length
    ? `<ul class="travel-list travel-warnings" data-travel-warnings>${warnings.map((w) => `<li class="travel-warn">${esc(ctx, pick(ctx, w.text))} ${sourceLink(ctx, w.source)}${dm && w.actorId ? ` ${button(ctx, `data-travel-conditions="${esc(ctx, w.actorId)}"`, ctx.t("Condizioni e stato", "Conditions and status"), "quiet")}` : ""}</li>`).join("")}</ul>`
    : "";
  const propose =
    dm && !day
      ? `<form class="travel-inline" data-travel-propose><label class="travel-check-label"><input type="checkbox" name="water" checked> ${ctx.t("Acqua sufficiente oggi (fonte o otri pieni)", "Enough water today (a source or full waterskins)")}</label><button type="submit" class="button">${ctx.t("Proponi il consumo di oggi", "Propose today’s consumption")}</button></form>`
      : "";
  return `<section class="travel-card" aria-labelledby="travel-supplies-title"><h3 id="travel-supplies-title">${ctx.t("Provviste", "Provisions")}${day ? ` <span class="badge">${day.water === "scarce" ? ctx.t("acqua scarsa", "scarce water") : ctx.t("acqua sufficiente", "enough water")}</span>` : ""}</h3><ul class="travel-list">${rows}</ul>${warn}${propose}<p class="muted">${ctx.t("Una razione è il cibo di un giorno per una creatura Piccola o Media. Nessun consumo e nessun Indebolimento avvengono da soli.", "One Rations is a day of food for a Small or Medium creature. No consumption and no Exhaustion happen by themselves.")} ${sourceLink(ctx, D.SOURCES.rations)}</p></section>`;
}

// ------------------------------------------------------------------ Campo (camp)
function campHTML(ctx, c) {
  const dm = dmOf(ctx);
  const camp = c.camp;
  const live = camp && ["active", "interrupted"].includes(camp.status);
  const effective = K.campStatus(ctx.state, camp);
  const ids = D.memberIds(ctx.state).filter((id) =>
    canViewActor(ctx.state.actors[id], ctx.role, ctx.state),
  );
  const from = K.firstEditableShift(c);
  // Before the camp the plan starts at the camp's hour, not at the current time (TV-133).
  const start = live ? camp.startedAt : K.nextCampStart(ctx.state, ui.campAt);
  const shiftTime = (i) => D.timeText(D.now(ctx.state, cid(ctx), start + i * K.SHIFT_SECONDS));
  const head = `<tr><th scope="col">${ctx.t("Turno", "Shift")}</th>${ids.map((id) => `<th scope="col">${esc(ctx, nameOf(ctx, id))}</th>`).join("")}</tr>`;
  const body = c.watch.shifts
    .map((shift, i) => {
      const current = live && camp.shift === i;
      const done = live && i < camp.shift;
      return `<tr class="${current ? "is-current" : ""}${done ? " is-done" : ""}" data-travel-shift-row="${i}"><th scope="row">${i + 1} · ${shiftTime(i)}–${shiftTime(i + 1)}${current ? ` <span class="badge">${ctx.t("ora", "now")}</span>` : ""}</th>${ids
        .map((id) => {
          const editable = i >= from && (dm || ctx.state.actors[id]?.owner === ctx.role);
          return `<td><label class="travel-watch"><input type="checkbox" data-travel-watch="${i}" data-actor="${esc(ctx, id)}"${shift.includes(id) ? " checked" : ""}${editable ? "" : ` disabled aria-describedby="travel-watch-why"`} aria-label="${esc(ctx, ctx.t(`${nameOf(ctx, id)} di guardia nel turno ${i + 1}`, `${nameOf(ctx, id)} on watch in shift ${i + 1}`))}"></label></td>`;
        })
        .join("")}</tr>`;
    })
    .join("");
  const totals = `<tr class="travel-watch-total"><th scope="row">${ctx.t("Ore di guardia", "Watch hours")}</th>${ids.map((id) => `<td>${K.watchSeconds(c.watch.shifts, id) / D.HOUR} h</td>`).join("")}</tr>`;
  const warnings = K.watchWarnings(
    ctx.state,
    c.watch.shifts,
    live ? camp.actorIds : D.memberIds(ctx.state),
  );
  const plan = `<div class="table-wrap travel-watch-wrap"><table class="travel-watch-table" data-travel-watch-plan><caption>${ctx.t("Turni di guardia (2 ore ciascuno)", "Watch shifts (2 hours each)")}${!dm || from > 0 ? `<small class="travel-why" id="travel-watch-why">${ctx.t("Ogni giocatore segna i propri personaggi; i turni già passati non si cambiano.", "Each player marks their own characters; past shifts do not change.")}</small>` : ""}</caption><thead>${head}</thead><tbody>${body}${totals}</tbody></table></div>${warnings.length ? `<ul class="travel-list travel-warnings" data-travel-watch-warnings>${warnings.map((w) => `<li class="travel-warn">${esc(ctx, pick(ctx, w.text))}${w.source ? " " + sourceLink(ctx, w.source) : ""}</li>`).join("")}</ul>` : ""}${dm ? `<div class="toolbar">${button(ctx, "data-travel-rotate-watch", ctx.t("Turni a rotazione", "Rotate the watch"), "quiet")}</div>` : ""}`;
  let status = "";
  if (!live) {
    const summary =
      camp?.status === "done"
        ? `<p data-travel-camp-done>${ctx.t("Riposo lungo concluso all’accampamento.", "Long Rest finished at the camp.")}</p>`
        : camp?.status === "broken"
          ? `<p>${ctx.t("Accampamento levato", "Camp struck")}: ${esc(ctx, camp.reason)}</p>`
          : "";
    status = `${summary}${
      dm
        ? `<label class="field travel-camp-at">${ctx.t("Ora del campo", "Camp time")}<input type="time" name="campAt" step="60" value="${esc(ctx, ui.campAt)}" data-travel-camp-at></label><p class="muted">${ctx.t("Il tempo fino all’ora del campo passa quando vi accampate; i turni partono da lì.", "Time until the camp's hour passes when you make camp; the shifts start there.")}</p><form class="travel-form" data-travel-camp-start><fieldset class="travel-who"><legend>${ctx.t("Chi riposa", "Who rests")}</legend>${D.members(
            ctx.state,
          )
            .map(
              (a) =>
                `<label><input type="checkbox" name="actor" value="${esc(ctx, a.id)}" checked> ${esc(ctx, a.name)}</label>`,
            )
            .join(
              "",
            )}</fieldset><div class="toolbar"><button type="submit" class="button primary">${ctx.t("Accampatevi: riposo lungo", "Make camp: Long Rest")}</button></div></form>`
        : `<p class="muted">${ctx.t("Il DM monta l’accampamento; qui puoi metterti di guardia.", "The DM makes camp; here you can take a watch.")}</p>`
    }`;
  } else {
    let rest = null;
    try {
      rest = getRest(ctx.state, camp.restId, ctx.role);
    } catch {
      rest = null;
    }
    const need = K.remainingSeconds(ctx.state, camp);
    const people = (rest?.participants ?? [])
      .map((p) => {
        const h = D.durationParts(p.elapsedSeconds),
          r = D.durationParts(p.requiredSeconds);
        const what =
          p.status === "interrupted"
            ? ctx.t("interrotto", "interrupted")
            : p.status === "completed"
              ? ctx.t("concluso", "finished")
              : p.activity === "sleep"
                ? ctx.t("dorme", "sleeping")
                : ctx.t("di guardia, sveglio", "on watch, awake");
        return `<li data-travel-rester="${esc(ctx, p.actorId)}"><strong>${esc(ctx, nameOf(ctx, p.actorId))}</strong> · ${esc(ctx, what)} · ${h.hours} h${h.minutes ? ` ${h.minutes} min` : ""} / ${r.hours} h</li>`;
      })
      .join("");
    const event = camp.events.find((e) => e.status === "open");
    // Players see an event only through the Perception checks it asks of the watchers.
    const eventBox =
      event && (dm || K.eventNotice(c, event).checks.length) ? campEventHTML(ctx, c, event) : "";
    const last = camp.events
      .filter((e) => e.status === "closed")
      .slice(-4)
      .reverse();
    // The event text is the DM's (what the watchers may notice); players read the outcome.
    // Every watch is logged with the Perception it used (TV-133, FG watch order).
    const when = (e) =>
      `${D.timeText(D.now(ctx.state, cid(ctx), K.shiftStart(camp, e.shift)))}–${D.timeText(D.now(ctx.state, cid(ctx), K.shiftStart(camp, e.shift + 1)))}`;
    const perception = (e) => {
      const checks = K.eventNotice(c, e).checks.filter(
        (x) =>
          x.status !== "pending" && canViewActor(ctx.state.actors[x.actorId], ctx.role, ctx.state),
      );
      const rows = [
        ...(e.passives ?? []).map((p) => `${nameOf(ctx, p.actorId)} ${p.score}`),
        ...checks.map((x) => `${nameOf(ctx, x.actorId)} ${x.total}`),
      ];
      const passive = (e.passives ?? []).length || checks.some((x) => x.status === "passive");
      return rows.length
        ? ` · ${passive ? ctx.t("Percezione passiva", "Passive Perception") : ctx.t("Percezione", "Perception")}: ${esc(ctx, rows.join(", "))}`
        : "";
    };
    const history = last.length
      ? `<ul class="travel-list" data-travel-camp-log>${last.map((e) => `<li>${ctx.t(`Turno ${e.shift + 1}`, `Shift ${e.shift + 1}`)} (${when(e)}): <strong>${e.outcome === "initiative" ? ctx.t("iniziativa, riposo interrotto", "initiative, rest interrupted") : e.watch && e.dc === null ? ctx.t("tranquillo", "quiet") : ctx.t("falso allarme", "false alarm")}</strong>${perception(e)}${dm ? ` · «${esc(ctx, e.text)}»${e.face ? ` (d6 = ${e.face})` : ""}` : ""}</li>`).join("")}</ul>`
      : "";
    // Initiative rolled at the Table or damage also interrupt rests (rest engine, Inc. 8).
    const interrupted = K.interruptedIn(ctx.state, camp);
    const resume = interrupted.length
      ? `<p class="travel-warn" data-travel-interrupted>${esc(ctx, ctx.t(`Riposo interrotto: ${interrupted.map((id) => nameOf(ctx, id)).join(", ")}. Chi aveva riposato almeno 1 ora ha i benefici di un riposo breve. Riprendendo, il riposo richiede 1 ora in più.`, `Rest interrupted: ${interrupted.map((id) => nameOf(ctx, id)).join(", ")}. Anyone who rested at least 1 hour gains a Short Rest’s benefits. On resuming, the rest needs 1 more hour.`))} ${sourceLink(ctx, D.SOURCES.longRest)}</p>`
      : "";
    // During an encounter the night waits: no shift, event or resume until it ends.
    const fighting = Boolean(ctx.state.combat?.active);
    const controls = dm
      ? fighting
        ? `${resume}<p class="muted" data-travel-camp-combat>${ctx.t("Combattimento in corso: turni, eventi e ripresa del riposo aspettano la fine dell’incontro.", "Combat in progress: shifts, events and resuming the rest wait for the encounter to end.")}</p><div class="toolbar">${button(ctx, "data-travel-open-rest", ctx.t("Apri il riposo", "Open the rest"), "quiet")}${button(ctx, "data-travel-camp-break", ctx.t("Leva il campo", "Strike camp"), "quiet")}</div>`
        : effective === "interrupted"
          ? `${resume || `<p class="travel-warn" data-travel-interrupted>${ctx.t("Riposo interrotto.", "Rest interrupted.")}</p>`}<div class="toolbar">${button(ctx, "data-travel-camp-resume", ctx.t("Riprendi il riposo", "Resume the rest"), "primary")}${button(ctx, "data-travel-encounter", ctx.t("Prepara l’incontro", "Prepare the encounter"))}${button(ctx, "data-travel-open-rest", ctx.t("Apri il riposo", "Open the rest"), "quiet")}${button(ctx, "data-travel-camp-break", ctx.t("Leva il campo", "Strike camp"), "quiet")}</div>`
          : `${resume}<div class="toolbar">${interrupted.length ? button(ctx, "data-travel-camp-resume", ctx.t("Riprendi il riposo", "Resume the rest")) : ""}${camp.shift < D.SHIFTS ? (camp.events.some((e) => e.watch && e.shift === camp.shift) || event ? "" : button(ctx, "data-travel-camp-watch", ctx.t("Controlla la guardia", "Check the watch"), "primary")) + button(ctx, "data-travel-camp-event", ctx.t("Evento nel turno", "Event in this shift")) + button(ctx, "data-travel-camp-next", ctx.t("Turno successivo (+2 h)", "Next shift (+2 h)"), camp.events.some((e) => e.watch && e.shift === camp.shift) ? "primary" : "") : need ? button(ctx, "data-travel-camp-hour", ctx.t(`Un’ora in più (mancano ${Math.ceil(need / 60)} min)`, `One more hour (${Math.ceil(need / 60)} min left)`), "primary") : button(ctx, "data-travel-camp-finish", ctx.t("Concludi il riposo lungo", "Finish the Long Rest"), "primary")}${button(ctx, "data-travel-open-rest", ctx.t("Apri il riposo", "Open the rest"), "quiet")}${button(ctx, "data-travel-camp-break", ctx.t("Leva il campo", "Strike camp"), "quiet")}</div>`
      : effective === "interrupted"
        ? `<p class="travel-warn">${ctx.t("Riposo interrotto: decide il DM se riprenderlo.", "Rest interrupted: the DM decides whether to resume.")}</p>`
        : "";
    status = `<p class="travel-camp-now" data-travel-camp-shift="${camp.shift}">${camp.shift < D.SHIFTS ? ctx.t(`Turno ${camp.shift + 1} di ${D.SHIFTS}: di guardia ${(c.watch.shifts[camp.shift] ?? []).map((id) => nameOf(ctx, id)).join(", ") || "nessuno"}.`, `Shift ${camp.shift + 1} of ${D.SHIFTS}: on watch ${(c.watch.shifts[camp.shift] ?? []).map((id) => nameOf(ctx, id)).join(", ") || "nobody"}.`) : ctx.t("La notte è passata.", "The night has passed.")}</p><ul class="travel-list travel-resters">${people}</ul>${eventBox}${controls}${history}`;
  }
  return `<section class="travel-card" aria-labelledby="travel-camp-title"><div class="travel-card-head"><h3 id="travel-camp-title">${ctx.t("Accampamento", "Camp")}</h3>${live ? `<span class="badge">${effective === "interrupted" ? ctx.t("interrotto", "interrupted") : ctx.t("riposo lungo in corso", "Long Rest in progress")}</span>` : ""}</div>${status}${plan}<p class="muted">${ctx.t("Riposo lungo: almeno 8 ore, di cui 6 di sonno e non più di 2 di attività leggera come montare la guardia.", "Long Rest: at least 8 hours, 6 of sleep and no more than 2 of light activity such as standing watch.")} ${sourceLink(ctx, D.SOURCES.longRest)}</p></section>`;
}
function campEventHTML(ctx, c, event) {
  const notice = K.eventNotice(c, event);
  const dm = dmOf(ctx);
  const checks = notice.checks;
  // What happens is the DM's until the table learns it: the watchers only get the check.
  const what = dm
    ? `<p><strong>${esc(ctx, event.text)}</strong></p>`
    : `<p>${ctx.t("Il DM chiede una prova di Percezione a chi è di guardia.", "The DM asks the watchers for a Perception check.")}</p>`;
  return `<article class="travel-proposal" data-travel-camp-card="${esc(ctx, event.id)}"><p class="travel-kicker">${ctx.t(`Turno ${event.shift + 1}`, `Shift ${event.shift + 1}`)}${dm && event.face ? ` · d6 = ${event.face}` : ""}${dm && event.dc !== null ? ` · ${ctx.t("CD per accorgersene", "DC to notice")} ${event.dc}` : ""}</p>${what}${
    checks.length
      ? resolvedList(
          ctx,
          c,
          checks.filter((x) => x.status !== "pending"),
        )
      : `<p class="muted">${event.dc === null ? ctx.t("Nulla da notare.", "Nothing to notice.") : ctx.t("Nessuno di guardia in questo turno.", "Nobody on watch in this shift.")}</p>`
  }${notice.pending ? `<p class="muted">${ctx.t(`In attesa di ${notice.pending} ${notice.pending === 1 ? "prova" : "prove"} di Percezione.`, `Waiting for ${notice.pending} Perception ${notice.pending === 1 ? "check" : "checks"}.`)}</p>` : ""}${dm && !notice.pending ? `<p data-travel-noticed>${notice.noticed.length ? ctx.t(`Se ne accorge: ${notice.noticed.map((id) => nameOf(ctx, id)).join(", ")}.`, `Noticed by: ${notice.noticed.map((id) => nameOf(ctx, id)).join(", ")}.`) : ctx.t("Nessuno se ne accorge.", "Nobody notices.")}</p><div class="toolbar">${button(ctx, `data-travel-camp-calm="${esc(ctx, event.id)}"`, ctx.t("Falso allarme: il riposo continua", "False alarm: the rest goes on"))}${button(ctx, `data-travel-camp-fight="${esc(ctx, event.id)}"`, ctx.t("Si tira l’iniziativa", "Roll Initiative"), "danger")}</div>` : ""}</article>`;
}

// ------------------------------------------------------------------ the sidebar tab
// Each sub-tab lists the requests it produces (Search results stay in the Creature tab).
const SUB_CHECKS = { march: [], journey: ["travel", "extended"], camp: ["watch"] };
function panelHTML(ctx) {
  const c = campaignOf(ctx);
  if (!D.isMember(ctx.state, ctx.role))
    return `<p class="muted">${ctx.t("Viaggio e accampamento sono per i membri della campagna.", "Travel and camp are for campaign members.")}</p>`;
  const tabs = [
    ["march", ctx.t("Marcia", "March")],
    ["journey", ctx.t("Viaggio", "Journey")],
    ["camp", ctx.t("Campo", "Camp")],
  ];
  // Rolls waiting for this viewer, counted on the sub-tab that lists them.
  const mine = D.pendingChecksFor(ctx.state, c, ctx.role);
  const waiting = Object.fromEntries(
    SUBS.map((id) => [id, mine.filter((x) => SUB_CHECKS[id].includes(x.kind)).length]),
  );
  const weather = D.todayWeather(ctx.state, c, ctx.role, cid(ctx));
  const chip =
    weather && !weather.hidden
      ? ` · <span class="travel-weather-chip">${D.WEATHER[weather.conditionId].icon} ${esc(ctx, pick(ctx, D.WEATHER[weather.conditionId].name))}</span>`
      : "";
  const undo =
    ctx.canUndo?.() && ctx.undoLabel?.()
      ? button(
          ctx,
          "data-travel-undo",
          `${ctx.icon("undo")} <span>${ctx.t("Annulla", "Undo")}: ${esc(ctx, ctx.undoLabel())}</span>`,
          "quiet travel-undo",
        )
      : "";
  const sub =
    subOf(ctx) === "journey"
      ? journeyHTML(ctx, c) + weatherHTML(ctx, c) + provisionsHTML(ctx, c)
      : subOf(ctx) === "camp"
        ? campHTML(ctx, c)
        : marchHTML(ctx, c);
  return `<div class="travel-panel" data-travel-panel><p class="travel-now" data-travel-now>${ctx.icon("clock")} <span>${clockLine(ctx)}</span>${chip}</p>${undo}<div class="travel-subtabs" role="tablist" aria-label="${ctx.t("Viaggio e accampamento", "Travel and camp")}">${tabs.map(([id, name]) => `<button type="button" role="tab" class="travel-subtab${subOf(ctx) === id ? " active" : ""}" data-travel-sub="${id}" aria-selected="${subOf(ctx) === id}" tabindex="${subOf(ctx) === id ? 0 : -1}"${waiting[id] ? ` aria-label="${esc(ctx, ctx.t(`${name}: ${waiting[id]} ${waiting[id] === 1 ? "tiro richiesto" : "tiri richiesti"}`, `${name}: ${waiting[id]} requested ${waiting[id] === 1 ? "roll" : "rolls"}`))}"` : ""}>${esc(ctx, name)}${id === "camp" && c.camp && ["active", "interrupted"].includes(c.camp.status) ? " •" : ""}${waiting[id] ? `<span class="travel-sub-count" aria-hidden="true">${waiting[id]}</span>` : ""}</button>`).join("")}</div>${checksBlock(ctx, c, (x) => SUB_CHECKS[subOf(ctx)].includes(x.kind))}${sub}</div>`;
}

// ------------------------------------------------------------------ inspector (light, Search)
function inspectorHTML(ctx, tableView) {
  const id = tableView?.selectedActorId;
  const actor = ctx.state.actors?.[id];
  if (!actor || !D.memberIds(ctx.state).includes(id) || !canViewActor(actor, ctx.role, ctx.state))
    return "";
  const c = campaignOf(ctx);
  const control = canControlActor(actor, ctx.role, ctx.state) && D.isMember(ctx.state, ctx.role);
  const seconds = D.clockSeconds(ctx.state, cid(ctx));
  const light = D.litLight(c, id, seconds);
  const lastLight = [...c.lights].reverse().find((l) => l.actorId === id);
  const torches = D.torchCount(actor);
  let lightBox;
  if (light) {
    const s = D.lightStatus(light, seconds);
    const left = D.durationParts(s.remaining);
    lightBox = `<p class="travel-light is-${s.state}" data-travel-light="${s.state}">${ctx.icon("light")} <span><strong>${ctx.t("Torcia accesa", "Lit torch")}</strong> · ${ctx.t("resta", "left")} ${left.hours ? `${left.hours} h ` : ""}${left.minutes} min (${ctx.t("fino alle", "until")} ${D.timeText(D.now(ctx.state, cid(ctx), s.endsAt))})${s.state === "warning" ? ` · <strong>${ctx.t("si spegne tra poco", "going out soon")}</strong>` : ""}<small>${ctx.t("Luce intensa 6 m, fioca per altri 6 m", "Bright Light 20 ft, Dim Light 20 ft more")} · ${sourceLink(ctx, D.TORCH.source)}</small></span>${control ? button(ctx, `data-travel-out="${esc(ctx, light.id)}"`, ctx.t("Spegni", "Put out"), "quiet") : ""}</p>`;
  } else {
    const burnt = lastLight && D.lightStatus(lastLight, seconds).state === "burnt";
    lightBox = `<p class="travel-light" data-travel-light="none">${ctx.icon("light")} <span>${burnt ? `<strong>${ctx.t("La torcia si è consumata", "The torch burned out")}</strong> (${D.timeText(D.now(ctx.state, cid(ctx), D.lightStatus(lastLight, seconds).endsAt))}) · ` : ""}${ctx.t("Torce nell’inventario", "Torches in the inventory")}: <strong data-travel-torches>${torches}</strong>${torches ? "" : `<small>${ctx.t("Prendine una dalla scorta del gruppo (Monete e scorta).", "Take one from the party stash (Coins and stash).")}</small>`}</span>${control && torches ? button(ctx, `data-travel-light-on="${esc(ctx, id)}"`, ctx.t("Accendi una torcia", "Light a torch")) : ""}</p>`;
  }
  const weather = D.todayWeather(ctx.state, c, ctx.role, cid(ctx));
  const flames =
    light &&
    weather &&
    !weather.hidden &&
    D.WEATHER[weather.conditionId].effects.some((e) => e.flames)
      ? `<p class="travel-warn">${esc(ctx, ctx.t(`${pick(ctx, D.WEATHER[weather.conditionId].name)}: all’aperto spegne le fiamme scoperte (decide il DM).`, `${pick(ctx, D.WEATHER[weather.conditionId].name)}: outdoors it puts out open flames (the DM decides).`))} ${sourceLink(ctx, D.SOURCES.environment)}</p>`
      : "";
  const search = [...c.searches]
    .reverse()
    .find((s) => s.actorId === id && s.sceneId === ctx.state.activeSceneId);
  const points = D.pointsOf(sliceOf(ctx.state), ctx.state.activeSceneId);
  const found = search
    ? search.found.length
      ? `<ul class="travel-list travel-found" data-travel-found>${search.found
          .map((pid) => points.find((p) => p.id === pid))
          .filter(Boolean)
          .map(
            (p) =>
              `<li data-travel-found-point="${esc(ctx, p.id)}"><span class="travel-kind travel-kind-${p.kind}" aria-hidden="true"></span><span><strong>${esc(ctx, pick(ctx, p.name))}</strong> · ${D.pointEmpty(p) ? `<em data-travel-empty>${ctx.t("vuoto", "empty")}</em>` : esc(ctx, p.items.map((it) => `${pick(ctx, itemName(it))} ×${it.quantity}`).join(", "))}${pick(ctx, p.note) ? `<small>${esc(ctx, pick(ctx, p.note))}</small>` : ""}</span>${control && !D.pointEmpty(p) ? button(ctx, `data-travel-take="${esc(ctx, p.id)}" data-actor="${esc(ctx, id)}"`, ctx.t("Prendi", "Take")) : ""}</li>`,
          )
          .join("")}</ul>`
      : `<p class="muted" data-travel-found-none>${ctx.t("Niente di nuovo qui intorno.", "Nothing new around here.")}</p>`
    : "";
  // B62: with B46 the Table has one Search action («Cerca», in this tab and the token menu)
  // that also finds these points; this box keeps their results and «Prendi».
  const unified = Boolean(ctx.registry?.get("token-menu", "knowledge-search"));
  const searchBox = `<div class="travel-search"><div class="travel-search-head">${control && !unified ? button(ctx, `data-travel-search="${esc(ctx, id)}"`, `${ctx.icon("search")} ${ctx.t("Cerca qui", "Search here")}`) : ""}<small class="muted">${unified ? `${ctx.t("Con «Cerca»", "With “Search”")}: ` : ""}${ctx.t("Saggezza (Percezione) entro 4,5 m", "Wisdom (Perception) within 15 ft")} · ${sourceLink(ctx, D.SOURCES.search)}</small></div>${search ? `<p class="muted">${ctx.t("Risultato", "Result")}: ${search.total}</p>` : ""}${found}</div>`;
  return `<div class="travel-inspector" data-travel-inspector="${esc(ctx, id)}">${lightBox}${flames}${searchBox}</div>`;
}
const itemName = (item) => {
  const names = {
    "srd2024:item:rations": L("Razioni", "Rations"),
    "srd2024:item:torch": L("Torcia", "Torch"),
    "srd2024:item:rope": L("Corda", "Rope"),
  };
  return names[item.srdId] ?? L(item.srdId, item.srdId);
};

// ------------------------------------------------------------------ binding
const on = (root, selector, handler, type = "click") =>
  root.querySelectorAll(selector).forEach((node) =>
    node.addEventListener(type, (event) => {
      if (type === "click" || type === "submit") event.preventDefault?.();
      const key = focusKey(node);
      handler(node, event);
      keepFocus(key);
    }),
  );
/**
 * Keyboard: a committed control is drawn again by the render; the focus returns to the
 * same control in the new markup (found by its data attributes), unless a dialog or a
 * handler already moved it elsewhere.
 */
function focusKey(node) {
  if (typeof document === "undefined" || !node?.attributes || node.tagName === "FORM") return null;
  const parts = [...node.attributes]
    .filter((a) => a.name.startsWith("data-") || (a.name === "value" && node.type === "radio"))
    .map((a) => `[${a.name}="${globalThis.CSS?.escape?.(a.value) ?? a.value}"]`);
  return parts.length ? node.tagName.toLowerCase() + parts.join("") : null;
}
function keepFocus(key) {
  if (!key) return;
  queueMicrotask(() => {
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    document.querySelector(`#content ${key}`)?.focus({ preventScroll: true });
  });
}
function bindPanel(root, ctx, table) {
  on(root, "[data-travel-sub]", (node) => {
    setSub(ctx, node.dataset.travelSub);
    ui.picked = null;
    ctx.render();
    queueFocus(`[data-travel-sub="${node.dataset.travelSub}"]`);
  });
  on(
    root,
    "[data-travel-sub]",
    (node, event) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1 };
      if (!keys[event.key]) return;
      const next = SUBS[(SUBS.indexOf(node.dataset.travelSub) + keys[event.key] + 3) % 3];
      setSub(ctx, next);
      ctx.render();
      queueFocus(`[data-travel-sub="${next}"]`);
    },
    "keydown",
  );
  on(root, "[data-travel-undo]", () => ctx.undo());
  on(root, "[data-travel-roll]", (node) => openCheckRoll(ctx, node.dataset.travelRoll));
  on(root, "[data-travel-passive]", (node) =>
    act(ctx, ctx.t("Percezione passiva usata", "Passive Perception used"), (draft, slice) =>
      D.usePassive(draft, slice, { checkId: node.dataset.travelPassive }, ctx.role),
    ),
  );
  on(root, "[data-travel-correct]", (node) => openCorrect(ctx, node.dataset.travelCorrect));
  bindMarch(root, ctx, table);
  bindJourney(root, ctx);
  bindCamp(root, ctx);
}
function queueFocus(selector) {
  if (typeof document === "undefined") return;
  queueMicrotask(() =>
    document.querySelector(`#content ${selector}`)?.focus({ preventScroll: true }),
  );
}
function moveMember(ctx, actorId, cell) {
  const done = act(
    ctx,
    ctx.t(
      `Formazione: ${nameOf(ctx, actorId)} spostato`,
      `Formation: ${nameOf(ctx, actorId)} moved`,
    ),
    (draft, slice) => D.moveInFormation(draft, slice, { actorId, cell }, ctx.role),
  );
  if (done) {
    ui.picked = null;
    ctx.render();
    if (cell !== null) queueFocus(`[data-travel-cell="${cell}"]`);
  }
}
function bindMarch(root, ctx, table) {
  on(root, "[data-travel-cell]", (node) => {
    const cell = Number(node.dataset.travelCell);
    const here = campaignOf(ctx).formation.cells[cell];
    if (ui.picked && ui.picked !== here) return moveMember(ctx, ui.picked, cell);
    ui.picked = here && ui.picked !== here ? here : null;
    ctx.render();
    queueFocus(`[data-travel-cell="${cell}"]`);
  });
  on(root, "[data-travel-member]", (node) => {
    ui.picked = ui.picked === node.dataset.travelMember ? null : node.dataset.travelMember;
    ctx.render();
    queueFocus(`[data-travel-member="${node.dataset.travelMember}"]`);
  });
  on(root, "[data-travel-unplace]", () => ui.picked && moveMember(ctx, ui.picked, null));
  on(root, "[data-travel-fill]", (node) =>
    act(
      ctx,
      ctx.t(
        `Formazione su ${node.dataset.travelFill} colonne`,
        `Formation in ${node.dataset.travelFill} columns`,
      ),
      (draft, slice) =>
        D.quickFill(draft, slice, { columns: Number(node.dataset.travelFill) }, ctx.role),
    ),
  );
  on(root, "[data-travel-group-all]", () =>
    act(
      ctx,
      ctx.t("Tutto il gruppo in formazione", "The whole party in formation"),
      (draft, slice) => D.groupAll(draft, slice, ctx.role),
    ),
  );
  on(root, "[data-travel-rotate]", (node) =>
    act(ctx, ctx.t("Formazione ruotata", "Formation rotated"), (draft, slice) =>
      D.rotateFormation(draft, slice, { turn: Number(node.dataset.travelRotate) }, ctx.role),
    ),
  );
  on(root, "[data-travel-place]", () => {
    if (!table?.setMode) return;
    table.setMode(PLACE_TOOL);
  });
  bindDrag(root, ctx);
}
// Pointer drag of a portrait onto a cell (FG formation grid); touch and mouse alike.
function bindDrag(root, ctx) {
  if (typeof document === "undefined") return;
  root.querySelectorAll("[data-travel-drag]").forEach((node) => {
    node.addEventListener("pointerdown", (down) => {
      if (down.button !== undefined && down.button !== 0) return;
      const actorId = node.dataset.travelDrag;
      let ghost = null;
      node.setPointerCapture?.(down.pointerId);
      const move = (event) => {
        if (!ghost && Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY) < 8)
          return;
        if (!ghost) {
          ghost = document.createElement("div");
          ghost.className = "travel-drag-ghost";
          ghost.textContent = nameOf(ctx, actorId);
          document.body.append(ghost);
        }
        ghost.style.left = `${event.clientX}px`;
        ghost.style.top = `${event.clientY}px`;
        event.preventDefault();
      };
      const up = (event) => {
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerup", up);
        node.removeEventListener("pointercancel", up);
        if (!ghost) return;
        ghost.remove();
        const target = document
          .elementsFromPoint(event.clientX, event.clientY)
          .find((el) => el.matches?.("[data-travel-cell]"));
        // The click that ends a drag is not a tap (the drop already moved the portrait).
        const swallow = (click) => {
          if (click.target !== node && click.target?.isConnected) return;
          click.stopPropagation();
          click.preventDefault();
        };
        window.addEventListener("click", swallow, { capture: true });
        setTimeout(() => window.removeEventListener("click", swallow, true), 300);
        if (target && event.type === "pointerup")
          moveMember(ctx, actorId, Number(target.dataset.travelCell));
      };
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", up);
      node.addEventListener("pointercancel", up);
    });
  });
}
function bindJourney(root, ctx) {
  on(
    root,
    "[data-travel-new-journey]",
    (form) => {
      const data = new FormData(form);
      const value = Number(data.get("distance"));
      act(ctx, ctx.t("Viaggio iniziato", "Journey started"), (draft, slice) =>
        D.startJourney(
          draft,
          slice,
          {
            from: data.get("from"),
            to: data.get("to"),
            km: ctx.lang === "it" ? value : value * D.KM_PER_MILE,
            terrain: data.get("terrain"),
            road: data.get("road") === "on",
          },
          ctx.role,
        ),
      );
    },
    "submit",
  );
  on(
    root,
    "[data-travel-pace]",
    (node) =>
      act(ctx, ctx.t("Passo di viaggio cambiato", "Travel pace changed"), (draft, slice) =>
        D.setPace(draft, slice, { pace: node.value }, ctx.role),
      ),
    "change",
  );
  on(
    root,
    "[data-travel-hours]",
    (node) => {
      ui.hours = Number(node.value);
      ctx.render();
      queueFocus("[data-travel-hours]");
    },
    "change",
  );
  on(root, "[data-travel-go]", () => {
    const hours = Number(ui.hours ?? 8);
    act(ctx, ctx.t(`Viaggio: ${hours} h`, `Travel: ${hours} h`), (draft, slice) =>
      D.travel(draft, slice, { id: D.newId("leg"), hours }, ctx.role, online(ctx)),
    );
  });
  on(root, "[data-travel-summary]", () => {
    openDialog(
      ctx,
      ctx.t("Riassumi il viaggio", "Summarise the journey"),
      `<p>${ctx.t("Il DM può riassumere il viaggio senza calcolare distanze e tempi esatti: il gruppo arriva a destinazione. L’orologio avanza solo dei giorni indicati.", "The DM can summarise travel without exact distances or times: the party reaches the destination. The clock advances only by the days you state.")} ${sourceLink(ctx, D.SOURCES.pace)}</p><label class="field">${ctx.t("Giorni trascorsi", "Days elapsed")}<input type="number" name="days" min="0" max="60" value="2" required inputmode="numeric"></label><label class="field">${ctx.t("Nota", "Note")}<input name="note" maxlength="280"></label>`,
      {
        submitLabel: ctx.t("Arrivati", "Arrived"),
        onSubmit: (data) =>
          act(ctx, ctx.t("Viaggio riassunto", "Journey summarised"), (draft, slice) =>
            D.summarizeJourney(
              draft,
              slice,
              { id: D.newId("summary"), days: Number(data.get("days")), note: data.get("note") },
              ctx.role,
              online(ctx),
            ),
          ) === null
            ? false
            : undefined,
      },
    );
  });
  on(root, "[data-travel-cancel]", () =>
    openDialog(
      ctx,
      ctx.t("Annulla il viaggio", "Cancel the journey"),
      `<p>${ctx.t("Il viaggio resta nella cronologia; l’orologio non cambia.", "The journey stays in the history; the clock does not change.")}</p><label class="field">${ctx.t("Motivo", "Reason")}<input name="reason" maxlength="200" required></label>`,
      {
        submitLabel: ctx.t("Annulla il viaggio", "Cancel the journey"),
        onSubmit: (data) =>
          act(ctx, ctx.t("Viaggio annullato", "Journey cancelled"), (draft, slice) =>
            D.cancelJourney(draft, slice, { reason: data.get("reason") }, ctx.role),
          ) === null
            ? false
            : undefined,
      },
    ),
  );
  on(root, "[data-travel-event]", () =>
    rollDialog(ctx, {
      title: ctx.t("Evento di viaggio", "Travel event"),
      sides: D.EVENT_TABLE.sides,
      count: 1,
      summary: `<p>${ctx.t("Il risultato è una proposta per te: nulla si applica finché non decidi.", "The result is a proposal for you: nothing applies until you decide.")} ${sourceLink(ctx, D.EVENT_TABLE.source)}</p>`,
      onRoll: (mode, faces) =>
        act(
          ctx,
          ctx.t("Evento di viaggio proposto", "Travel event proposed"),
          (draft, slice, rolls) =>
            D.drawEvent(
              draft,
              slice,
              rolls,
              { id: D.newId("event"), mode, faces },
              ctx.role,
              rng(ctx),
            ),
          { visibility: "private" },
        ),
    }),
  );
  on(root, "[data-travel-accept]", (node) => {
    const actorIds = [
      ...root.querySelectorAll(
        `[data-travel-proposal="${node.dataset.travelAccept}"] [data-travel-event-actor]`,
      ),
    ]
      .filter((box) => box.checked)
      .map((box) => box.dataset.travelEventActor);
    act(ctx, ctx.t("Evento di viaggio accettato", "Travel event accepted"), (draft, slice) =>
      D.decideEvent(
        draft,
        slice,
        { eventId: node.dataset.travelAccept, accept: true, actorIds },
        ctx.role,
      ),
    );
  });
  on(root, "[data-travel-dismiss]", (node) =>
    act(
      ctx,
      ctx.t("Evento di viaggio scartato", "Travel event dismissed"),
      (draft, slice) =>
        D.decideEvent(
          draft,
          slice,
          { eventId: node.dataset.travelDismiss, accept: false },
          ctx.role,
        ),
      { visibility: "private" },
    ),
  );
  on(
    root,
    "[data-travel-climate]",
    (node) =>
      act(
        ctx,
        ctx.t("Clima del meteo", "Weather climate"),
        (draft, slice) => D.setClimate(draft, slice, { climate: node.value }, ctx.role),
        { visibility: "private" },
      ),
    "change",
  );
  on(
    root,
    "[data-travel-season]",
    (node) =>
      act(
        ctx,
        ctx.t("Stagione del meteo", "Weather season"),
        (draft, slice) => D.setClimate(draft, slice, { season: node.value || null }, ctx.role),
        { visibility: "private" },
      ),
    "change",
  );
  on(root, "[data-travel-weather-roll]", () =>
    rollDialog(ctx, {
      title: ctx.t("Meteo del giorno", "Weather of the day"),
      sides: 20,
      count: 1,
      summary: `<p>${ctx.t("Tabella per clima e stagione.", "Table by climate and season.")} ${sourceLink(ctx, D.AUTHORED.weather)}</p>`,
      onRoll: (mode, faces) =>
        act(
          ctx,
          ctx.t("Meteo generato", "Weather generated"),
          (draft, slice, rolls) =>
            D.generateWeather(draft, slice, rolls, { mode, faces }, ctx.role, rng(ctx)),
          { visibility: "private" },
        ),
    }),
  );
  on(root, "[data-travel-weather-set]", () => {
    const c = campaignOf(ctx);
    const current = c.weather.days[D.now(ctx.state, cid(ctx)).day];
    openDialog(
      ctx,
      ctx.t("Cambia il meteo di oggi", "Change today’s weather"),
      `<label class="field">${ctx.t("Condizione", "Condition")}<select name="condition">${Object.entries(
        D.WEATHER,
      )
        .map(
          ([id, w]) =>
            `<option value="${id}"${id === current?.conditionId ? " selected" : ""}>${w.icon} ${esc(ctx, pick(ctx, w.name))}</option>`,
        )
        .join(
          "",
        )}</select></label>${current ? `<label class="field">${ctx.t("Motivo", "Reason")}<input name="reason" maxlength="200" required></label>` : ""}<p class="muted">${ctx.t("Gli effetti di regola vengono dalle regole ambientali dell’SRD; il DM decide quando si applicano.", "Rule effects come from the SRD environmental rules; the DM decides when they apply.")}</p>`,
      {
        submitLabel: ctx.t("Salva", "Save"),
        onSubmit: (data) =>
          act(
            ctx,
            ctx.t("Meteo cambiato dal DM", "Weather changed by the DM"),
            (draft, slice) =>
              D.setWeather(
                draft,
                slice,
                { conditionId: data.get("condition"), reason: data.get("reason") },
                ctx.role,
              ),
            { visibility: "private" },
          ) === null
            ? false
            : undefined,
      },
    );
  });
  on(
    root,
    "[data-travel-weather-share]",
    (node) =>
      act(
        ctx,
        node.checked
          ? ctx.t("Meteo mostrato ai giocatori", "Weather shown to players")
          : ctx.t("Meteo nascosto ai giocatori", "Weather hidden from players"),
        (draft, slice) => D.shareWeather(draft, slice, { shared: node.checked }, ctx.role),
      ),
    "change",
  );
  on(
    root,
    "[data-travel-weather-map]",
    (node) =>
      act(
        ctx,
        node.checked
          ? ctx.t("Meteo sulla mappa", "Weather on the map")
          : ctx.t("Meteo tolto dalla mappa", "Weather off the map"),
        (draft, slice) => D.weatherOnMap(draft, slice, { onMap: node.checked }, ctx.role),
      ),
    "change",
  );
  on(
    root,
    "[data-travel-propose]",
    (form) => {
      const water = new FormData(form).get("water") === "on" ? "available" : "scarce";
      act(ctx, ctx.t("Consumo di provviste proposto", "Provision use proposed"), (draft, slice) =>
        D.proposeProvisions(draft, slice, { water }, ctx.role),
      );
    },
    "submit",
  );
  for (const [attr, choice, it, en] of [
    ["data-travel-eat", "eat", "ha consumato 1 razione", "used 1 Rations"],
    ["data-travel-other", "other", "mangia da un’altra fonte", "eats other food"],
    ["data-travel-skip", "skip", "salta il pasto", "skips the meal"],
  ])
    on(root, `[${attr}]`, (node) => {
      const actorId = node.dataset[attr.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())];
      act(
        ctx,
        ctx.t(
          `Provviste: ${nameOf(ctx, actorId)} ${it}`,
          `Provisions: ${nameOf(ctx, actorId)} ${en}`,
        ),
        (draft, slice) => D.answerProvisions(draft, slice, { actorId, choice }, ctx.role),
      );
    });
  on(root, "[data-travel-conditions]", (node) =>
    ctx.openConditions?.(node.dataset.travelConditions),
  );
}
// TV-133: «Controlla la guardia» — the encounter roll (optional) and the watchers'
// Perception, passive by default (WotR night watch; FG watch order).
function openWatchCheck(ctx) {
  const c = campaignOf(ctx);
  const weather = c.weather.days[D.now(ctx.state, cid(ctx)).day];
  const hinder = weather && D.WEATHER[weather.conditionId].effects.some((e) => e.perception);
  openDialog(
    ctx,
    ctx.t("Controlla la guardia", "Check the watch"),
    `<p class="muted">${ctx.t("Chi è di guardia fa una prova di Saggezza (Percezione): passiva, o tirata dai giocatori. Il d6 della tabella del campo dice se qualcosa si avvicina.", "The watchers make a Wisdom (Perception) check: passive, or rolled by the players. The camp table's d6 says whether something approaches.")}</p><label class="travel-check-label"><input type="checkbox" name="encounter" checked> ${ctx.t(`Tira per un incontro (d${K.CAMP_TABLE.sides} della tabella del campo)`, `Roll for an encounter (camp table d${K.CAMP_TABLE.sides})`)}</label><label class="field">${ctx.t("Dadi", "Dice")}<select name="diceMode"><option value="digital">${ctx.t("Digitali", "Digital")}</option><option value="physical">${ctx.t("Fisici", "Physical")}</option></select></label><label class="field">${ctx.t("Faccia del d6 fisico (solo dadi fisici)", "Physical d6 face (physical dice only)")}<input type="number" name="face0" min="1" max="6" inputmode="numeric"></label><fieldset class="travel-who"><legend>${ctx.t("Percezione delle sentinelle", "The watchers' Perception")}</legend><label><input type="radio" name="perception" value="passive" checked> ${ctx.t("Passiva (10 + modificatore)", "Passive (10 + modifier)")}</label><label><input type="radio" name="perception" value="rolled"> ${ctx.t("Tirata dai giocatori", "Rolled by the players")}</label></fieldset><label class="travel-check-label"><input type="checkbox" name="weather"${hinder ? " checked" : ""}> ${ctx.t("Svantaggio per il meteo (visibilità ridotta)", "Disadvantage from the weather (reduced visibility)")}</label><p class="muted">${sourceLink(ctx, D.SOURCES.passive)} · ${sourceLink(ctx, K.CAMP_TABLE.source)}</p>`,
    {
      submitLabel: ctx.t("Controlla", "Check"),
      onSubmit: (data) => {
        const mode = data.get("diceMode") === "physical" ? "physical" : "digital";
        return act(ctx, ctx.t("Guardia controllata", "Watch checked"), (draft, slice, rolls) =>
          K.checkWatch(
            draft,
            slice,
            rolls,
            {
              id: D.newId("watch"),
              encounter: data.get("encounter") === "on",
              mode,
              faces: mode === "physical" ? [Number(data.get("face0"))] : null,
              passive: data.get("perception") !== "rolled",
              weather: data.get("weather") === "on",
              lang: ctx.lang,
            },
            ctx.role,
            rng(ctx),
          ),
        ) === null
          ? false
          : undefined;
      },
    },
  );
}
// For tests and the Camp sub-tab: the camp card and its controls.
export const campPlanHTML = (ctx) => campHTML(ctx, campaignOf(ctx));
export const bindCampControls = (root, ctx) => bindCamp(root, ctx);
function bindCamp(root, ctx) {
  on(
    root,
    "[data-travel-watch]",
    (node) =>
      act(ctx, ctx.t("Turni di guardia aggiornati", "Watch shifts updated"), (draft, slice) =>
        K.setWatch(
          draft,
          slice,
          {
            shift: Number(node.dataset.travelWatch),
            actorId: node.dataset.actor,
            on: node.checked,
          },
          ctx.role,
        ),
      ),
    "change",
  );
  on(root, "[data-travel-rotate-watch]", () =>
    act(ctx, ctx.t("Turni di guardia a rotazione", "Watch shifts rotated"), (draft, slice) =>
      K.rotateWatch(draft, slice, ctx.role),
    ),
  );
  on(
    root,
    "[data-travel-camp-start]",
    (form) => {
      const data = new FormData(form);
      const actorIds = data.getAll("actor");
      const typed = root.querySelector?.("[data-travel-camp-at]")?.value;
      if (/^\d{1,2}:\d{2}$/.test(typed ?? "")) ui.campAt = typed;
      const startAt = K.nextCampStart(ctx.state, ui.campAt);
      act(
        ctx,
        ctx.t("Accampamento: riposo lungo iniziato", "Camp: Long Rest started"),
        (draft, slice) =>
          K.startCamp(
            draft,
            slice,
            { id: D.newId("camp"), actorIds, startAt },
            ctx.role,
            online(ctx),
          ),
      );
    },
    "submit",
  );
  on(
    root,
    '[name="campAt"]',
    (node) => {
      if (!/^\d{1,2}:\d{2}$/.test(node.value)) return;
      ui.campAt = node.value;
      ctx.render();
      queueFocus?.('[name="campAt"]');
    },
    "change",
  );
  on(root, "[data-travel-camp-watch]", () => openWatchCheck(ctx));
  on(root, "[data-travel-camp-next]", () =>
    act(ctx, ctx.t("Accampamento: turno successivo", "Camp: next shift"), (draft, slice) =>
      K.nextShift(draft, slice, { id: D.newId("shift") }, ctx.role, online(ctx)),
    ),
  );
  on(root, "[data-travel-camp-hour]", () =>
    act(ctx, ctx.t("Accampamento: un’ora in più", "Camp: one more hour"), (draft, slice) =>
      K.extraHour(draft, slice, { id: D.newId("hour") }, ctx.role, online(ctx)),
    ),
  );
  on(root, "[data-travel-camp-finish]", () =>
    act(
      ctx,
      ctx.t("Accampamento: riposo lungo concluso", "Camp: Long Rest finished"),
      (draft, slice) => K.finishCamp(draft, slice, { id: D.newId("end") }, ctx.role, online(ctx)),
    ),
  );
  on(root, "[data-travel-camp-resume]", () =>
    act(ctx, ctx.t("Accampamento: riposo ripreso", "Camp: rest resumed"), (draft, slice) =>
      K.resumeCamp(draft, slice, ctx.role, online(ctx)),
    ),
  );
  on(root, "[data-travel-open-rest]", () => {
    const camp = campaignOf(ctx).camp;
    const first = camp?.actorIds?.[0];
    if (first) ctx.openRest?.(first);
  });
  on(root, "[data-travel-encounter]", () => ctx.startEncounter?.(ctx.state.activeSceneId));
  on(root, "[data-travel-camp-break]", () =>
    openDialog(
      ctx,
      ctx.t("Leva il campo", "Strike camp"),
      `<p>${ctx.t("Il riposo lungo si ferma senza concludersi; i benefici già maturati restano.", "The Long Rest stops without finishing; benefits already earned stay.")}</p><label class="field">${ctx.t("Motivo", "Reason")}<input name="reason" maxlength="200" required></label>`,
      {
        submitLabel: ctx.t("Leva il campo", "Strike camp"),
        onSubmit: (data) =>
          act(ctx, ctx.t("Accampamento levato", "Camp struck"), (draft, slice) =>
            K.breakCamp(draft, slice, { reason: data.get("reason") }, ctx.role, online(ctx)),
          ) === null
            ? false
            : undefined,
      },
    ),
  );
  on(root, "[data-travel-camp-event]", () => {
    const c = campaignOf(ctx);
    const weather = c.weather.days[D.now(ctx.state, cid(ctx)).day];
    const hinder = weather && D.WEATHER[weather.conditionId].effects.some((e) => e.perception);
    openDialog(
      ctx,
      ctx.t("Evento nel turno di guardia", "Event during the watch"),
      `<p class="muted">${ctx.t("Le sentinelle del turno fanno una prova di Saggezza (Percezione) contro la CD. Nulla interrompe il riposo finché non decidi.", "The shift’s watchers make a Wisdom (Perception) check against the DC. Nothing interrupts the rest until you decide.")}</p><fieldset class="travel-who"><legend>${ctx.t("Origine", "Source")}</legend><label><input type="radio" name="source" value="table" checked> ${ctx.t(`Tira sulla tabella del campo (d${K.CAMP_TABLE.sides})`, `Roll on the camp table (d${K.CAMP_TABLE.sides})`)}</label><label><input type="radio" name="source" value="text"> ${ctx.t("Descrivo io", "I describe it")}</label></fieldset><label class="field" data-travel-camp-own hidden>${ctx.t("Che cosa succede", "What happens")}<input name="text" maxlength="200"></label><label class="field" data-travel-camp-own hidden>${ctx.t("CD per accorgersene", "DC to notice")}<input type="number" name="dc" min="1" max="30" value="12" inputmode="numeric"></label><label class="field" data-travel-camp-draw>${ctx.t("Dadi", "Dice")}<select name="diceMode" data-travel-camp-dice><option value="digital">${ctx.t("Digitali", "Digital")}</option><option value="physical">${ctx.t("Fisici", "Physical")}</option></select></label><label class="field" data-travel-camp-face hidden>${ctx.t("Faccia del d6 fisico", "Physical d6 face")}<input type="number" name="face0" min="1" max="6" inputmode="numeric"></label><label class="travel-check-label"><input type="checkbox" name="weather"${hinder ? " checked" : ""}> ${ctx.t("Svantaggio per il meteo (visibilità ridotta)", "Disadvantage from the weather (reduced visibility)")}</label><p class="muted">${sourceLink(ctx, K.CAMP_TABLE.source)}</p>`,
      {
        submitLabel: ctx.t("Avvia l’evento", "Start the event"),
        onSubmit: (data) => {
          const table = data.get("source") !== "text";
          const mode = data.get("diceMode") === "physical" ? "physical" : "digital";
          return act(ctx, ctx.t("Evento all’accampamento", "Camp event"), (draft, slice, rolls) =>
            K.campEvent(
              draft,
              slice,
              rolls,
              {
                id: D.newId("camp-event"),
                text: data.get("text"),
                dc: table ? null : data.get("dc"),
                weather: data.get("weather") === "on",
                lang: ctx.lang,
                draw: table
                  ? { mode, faces: mode === "physical" ? [Number(data.get("face0"))] : null }
                  : null,
              },
              ctx.role,
              rng(ctx),
            ),
          ) === null
            ? false
            : undefined;
        },
      },
    );
    // Only the fields of the chosen source show: the table draw (dice, physical face) or
    // the DM's own event (text, DC); a hidden field is never sent as a choice.
    if (typeof document === "undefined") return;
    const form = document.querySelector("#dialog form");
    const sync = () => {
      const own = form?.querySelector('[name="source"]:checked')?.value === "text";
      const physical = form?.querySelector("[data-travel-camp-dice]")?.value === "physical";
      form?.querySelectorAll("[data-travel-camp-own]").forEach((el) => (el.hidden = !own));
      form?.querySelectorAll("[data-travel-camp-draw]").forEach((el) => (el.hidden = own));
      const face = form?.querySelector("[data-travel-camp-face]");
      if (face) face.hidden = own || !physical;
      const text = form?.querySelector('[name="text"]');
      if (text) text.required = own;
      const faceInput = form?.querySelector('[name="face0"]');
      if (faceInput) faceInput.required = !own && physical;
    };
    form
      ?.querySelectorAll('[name="source"], [data-travel-camp-dice]')
      .forEach((el) => el.addEventListener("change", sync));
    sync();
  });
  on(root, "[data-travel-camp-calm]", (node) =>
    act(
      ctx,
      ctx.t("Falso allarme: il riposo continua", "False alarm: the rest goes on"),
      (draft, slice) =>
        K.decideCampEvent(
          draft,
          slice,
          { eventId: node.dataset.travelCampCalm, outcome: "calm" },
          ctx.role,
          online(ctx),
        ),
    ),
  );
  on(root, "[data-travel-camp-fight]", (node) =>
    act(
      ctx,
      ctx.t("Iniziativa: riposo interrotto", "Initiative: rest interrupted"),
      (draft, slice) =>
        K.decideCampEvent(
          draft,
          slice,
          { eventId: node.dataset.travelCampFight, outcome: "initiative" },
          ctx.role,
          online(ctx),
        ),
    ),
  );
}
function bindInspector(root, ctx) {
  on(root, "[data-travel-light-on]", (node) =>
    act(
      ctx,
      ctx.t(
        `Torcia accesa: ${nameOf(ctx, node.dataset.travelLightOn)}`,
        `Torch lit: ${nameOf(ctx, node.dataset.travelLightOn)}`,
      ),
      (draft, slice) =>
        D.lightTorch(
          draft,
          slice,
          { id: D.newId("light"), actorId: node.dataset.travelLightOn },
          ctx.role,
        ),
    ),
  );
  on(root, "[data-travel-out]", (node) =>
    act(ctx, ctx.t("Torcia spenta", "Torch put out"), (draft, slice) =>
      D.extinguish(draft, slice, { lightId: node.dataset.travelOut }, ctx.role),
    ),
  );
  on(root, "[data-travel-search]", (node) => {
    const actorId = node.dataset.travelSearch;
    const actor = ctx.state.actors[actorId];
    const check = { actorId, ability: "wis", skill: "perception" };
    const profile = D.checkProfile(ctx.state, check);
    rollDialog(ctx, {
      title: ctx.t(`Cercare: ${actor.name}`, `Search: ${actor.name}`),
      sides: 20,
      count: profile.mode === "normal" ? 1 : 2,
      summary: `<p>${checkLine(ctx, campaignOf(ctx), { ...check, kind: "search", reasons: [], context: {} })}</p><p class="muted">${ctx.t("Si cerca attorno alla pedina (4,5 m): contenitori e oggetti nascosti.", "The search covers the token’s surroundings (15 ft): containers and hidden objects.")}</p>`,
      onRoll: (mode, faces) =>
        act(ctx, ctx.t(`Cercare: ${actor.name}`, `Search: ${actor.name}`), (draft, slice, rolls) =>
          D.search(
            draft,
            slice,
            rolls,
            { id: D.newId("search"), actorId, mode, faces },
            ctx.role,
            rng(ctx),
          ),
        ),
    });
  });
  on(root, "[data-travel-take]", (node) => {
    act(ctx, ctx.t("Oggetti presi", "Items taken"), (draft, slice) =>
      D.takeFound(
        draft,
        slice,
        {
          sceneId: ctx.state.activeSceneId,
          pointId: node.dataset.travelTake,
          actorId: node.dataset.actor,
        },
        ctx.role,
      ),
    );
  });
}

// ------------------------------------------------------------------ map layer and tools
const PLACE_TOOL = "travel-place";
const POINT_TOOL = "travel-point";
const metersToPx = (scene, m) => (m / (scene.metersPerCell || 1.5)) * (scene.gridSize || 50);
function layerSVG(ctx, tableView) {
  const scene = tableView?.scene;
  if (!scene || !D.isMember(ctx.state, ctx.role)) return "";
  const c = campaignOf(ctx);
  const seconds = D.clockSeconds(ctx.state, cid(ctx));
  const lights = c.lights
    .map((light) => {
      const s = D.lightStatus(light, seconds);
      const token = scene.tokens?.find((t) => t.actorId === light.actorId);
      if (!token || !["lit", "warning"].includes(s.state)) return "";
      const bright = metersToPx(scene, D.TORCH.bright),
        dim = bright + metersToPx(scene, D.TORCH.dim);
      return `<g class="travel-light-glow is-${s.state}" data-travel-glow="${ctx.esc(light.actorId)}" transform="translate(${token.x} ${token.y})"><circle r="${dim}" class="travel-glow-dim"/><circle r="${bright}" class="travel-glow-bright"/></g>`;
    })
    .join("");
  const points = D.visiblePoints(ctx.state, sliceOf(ctx.state), scene.id, ctx.role)
    .map(
      (p) =>
        `<g class="travel-point travel-point-${p.kind}${p.found ? " is-found" : " is-hidden"}${D.pointEmpty(p) ? " is-empty" : ""}" data-travel-point="${ctx.esc(p.id)}" transform="translate(${p.x} ${p.y})"${dmOf(ctx) ? ` tabindex="0" role="button" aria-label="${ctx.esc(pick(ctx, p.name))}"` : ""}><circle r="11"/><text y="4" text-anchor="middle">${p.kind === "container" ? "▣" : p.kind === "trace" ? "⋯" : "✦"}</text><title>${ctx.esc(pick(ctx, p.name))}${D.pointEmpty(p) ? ` · ${ctx.t("vuoto", "empty")}` : ""}${!p.found ? ` · ${ctx.t("nascosto", "hidden")} CD ${p.dc}` : ""}</title></g>`,
    )
    .join("");
  const ghost =
    tableView.mode === PLACE_TOOL
      ? `<g class="travel-ghost" data-travel-ghost style="display:none">${D.formationLayout(
          c.formation,
          scene,
          { x: 0, y: 0 },
        )
          .map(
            (spot) =>
              `<circle data-travel-ghost-spot="${ctx.esc(spot.actorId)}" r="${(scene.gridSize || 50) / 2 - 4}"/>`,
          )
          .join("")}</g>`
      : "";
  return `<g class="travel-layer">${lights}${points}${ghost}</g>`;
}
function weatherSVG(ctx, tableView) {
  const scene = tableView?.scene;
  if (!scene) return "";
  const day = D.todayWeather(ctx.state, campaignOf(ctx), ctx.role, cid(ctx));
  if (!day || day.hidden || !day.onMap) return "";
  const kind = D.MAP_WEATHER[day.conditionId];
  if (!kind) return "";
  const w = scene.width || 1000,
    h = scene.height || 650;
  const pattern =
    kind === "rain"
      ? `<pattern id="travel-rain" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M4 0 L0 12 M16 8 L12 20" class="travel-rain-line"/></pattern>`
      : kind === "snow"
        ? `<pattern id="travel-snow" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="6" cy="8" r="1.8" class="travel-snow-dot"/><circle cx="21" cy="22" r="1.4" class="travel-snow-dot"/></pattern>`
        : "";
  return `<g class="travel-weather-layer travel-weather-${kind}" aria-hidden="true">${pattern ? `<defs>${pattern}</defs>` : ""}<rect width="${w}" height="${h}" ${kind === "fog" ? 'class="travel-fog"' : `fill="url(#travel-${kind})"`}/></g>`;
}
function bindLayer(el, ctx, table) {
  applyRouteTab(ctx, table);
  if (!dmOf(ctx)) return;
  el.querySelectorAll?.("[data-travel-point]").forEach((node) => {
    const open = () => openPointDialog(ctx, { pointId: node.dataset.travelPoint });
    node.addEventListener("click", (event) => {
      if (table?.mode === PLACE_TOOL) return;
      event.stopPropagation();
      open();
    });
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        open();
      }
    });
  });
}
function openPointDialog(ctx, { pointId = null, at = null }) {
  const sceneId = ctx.state.activeSceneId;
  const point = pointId
    ? D.pointsOf(sliceOf(ctx.state), sceneId).find((p) => p.id === pointId)
    : null;
  const item = (srdId) => point?.items?.find((x) => x.srdId === srdId)?.quantity ?? 0;
  openDialog(
    ctx,
    point
      ? ctx.t("Punto di ricerca", "Search point")
      : ctx.t("Nuovo punto di ricerca", "New search point"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="80" value="${esc(ctx, point ? pick(ctx, point.name) : "")}"></label><label class="field">${ctx.t("Tipo", "Type")}<select name="kind">${[
      ["container", ctx.t("Contenitore (visibile)", "Container (visible)")],
      ["hidden", ctx.t("Oggetto nascosto", "Hidden object")],
      ["trace", ctx.t("Traccia o indizio", "Trace or clue")],
    ]
      .map(
        ([id, name]) =>
          `<option value="${id}"${point?.kind === id ? " selected" : ""}>${esc(ctx, name)}</option>`,
      )
      .join(
        "",
      )}</select></label><label class="field">${ctx.t("CD per trovarlo (vuota = visibile)", "DC to find it (empty = visible)")}<input type="number" name="dc" min="1" max="30" value="${point?.dc ?? ""}" inputmode="numeric"></label><fieldset class="travel-who"><legend>${ctx.t("Contenuto", "Contents")}</legend>${[
      ["srd2024:item:rations", ctx.t("Razioni", "Rations")],
      ["srd2024:item:torch", ctx.t("Torce", "Torches")],
      ["srd2024:item:rope", ctx.t("Corda", "Rope")],
    ]
      .map(
        ([srdId, name]) =>
          `<label class="field">${esc(ctx, name)}<input type="number" name="${srdId}" min="0" max="99" value="${item(srdId)}" inputmode="numeric"></label>`,
      )
      .join(
        "",
      )}</fieldset><label class="field">${ctx.t("Nota", "Note")}<input name="note" maxlength="200" value="${esc(ctx, point ? pick(ctx, point.note) : "")}"></label>${point ? `<p class="muted">${point.found ? ctx.t("Già trovato dal gruppo.", "Already found by the party.") : ctx.t("Non ancora trovato.", "Not found yet.")}</p><label class="travel-check-label"><input type="checkbox" name="remove"> ${ctx.t("Elimina questo punto", "Delete this point")}</label>` : ""}`,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (data) => {
        if (point && data.get("remove") === "on")
          return act(
            ctx,
            ctx.t("Punto di ricerca eliminato", "Search point deleted"),
            (draft, slice) => D.removePoint(draft, slice, { sceneId, pointId: point.id }, ctx.role),
            { visibility: "private" },
          ) === null
            ? false
            : undefined;
        const items = ["srd2024:item:rations", "srd2024:item:torch", "srd2024:item:rope"]
          .map((srdId) => ({ srdId, quantity: Number(data.get(srdId)) || 0 }))
          .filter((x) => x.quantity > 0);
        return act(
          ctx,
          ctx.t("Punto di ricerca salvato", "Search point saved"),
          (draft, slice) =>
            D.savePoint(
              draft,
              slice,
              {
                sceneId,
                point: {
                  id: point?.id,
                  kind: data.get("kind"),
                  name: data.get("name"),
                  dc: data.get("dc"),
                  note: data.get("note"),
                  items,
                  x: point?.x ?? at.x,
                  y: point?.y ?? at.y,
                },
              },
              ctx.role,
            ),
          { visibility: "private" },
        ) === null
          ? false
          : undefined;
      },
    },
  );
}
function placeAt(ctx, table, point) {
  const done = act(
    ctx,
    ctx.t("Gruppo posizionato in formazione", "Party placed in formation"),
    (draft, slice) => D.placeParty(draft, slice, { sceneId: table.scene.id, point }, ctx.role),
  );
  if (done) table.setMode("move");
}
const placeTool = {
  id: PLACE_TOOL,
  label: L("Posiziona il gruppo", "Place the party"),
  icon: "person",
  group: "dm",
  roles: ["dm"],
  order: 57,
  activate(ctx, table) {
    table.message(
      ctx.t(
        "Clicca sulla mappa: il gruppo si dispone in formazione attorno al punto. Invio lo mette al centro, Esc annulla.",
        "Click the map: the party forms up around the point. Enter places it in the centre, Escape cancels.",
      ),
    );
  },
  // A press on a token must not select it (a new render would lose the click): the tool
  // keeps the press and places the party on the click.
  onPointerDown() {},
  onPointerMove(ctx, event, table) {
    const ghost = table.svg?.querySelector?.("[data-travel-ghost]");
    if (!ghost) return;
    const at = table.point(event);
    const layout = D.formationLayout(campaignOf(ctx).formation, table.scene, at);
    ghost.style.display = "";
    for (const spot of layout) {
      const circle = ghost.querySelector(`[data-travel-ghost-spot="${spot.actorId}"]`);
      circle?.setAttribute("cx", spot.x);
      circle?.setAttribute("cy", spot.y);
    }
  },
  onClick(ctx, event, table) {
    placeAt(ctx, table, table.point(event));
  },
  onKeyDown(ctx, event, table) {
    if (event.key === "Escape") return table.setMode("move");
    if (event.key !== "Enter" || event.target?.closest?.("[data-actor]")) return;
    event.preventDefault?.();
    placeAt(ctx, table, { x: (table.scene.width || 1000) / 2, y: (table.scene.height || 650) / 2 });
  },
};
const pointTool = {
  id: POINT_TOOL,
  label: L("Punto di ricerca", "Search point"),
  icon: "search",
  group: "dm",
  roles: ["dm"],
  order: 58,
  activate(ctx, table) {
    table.message(
      ctx.t(
        "Clicca sulla mappa per nascondere un oggetto o mettere un contenitore da cercare.",
        "Click the map to hide an object or put a container to search.",
      ),
    );
  },
  onPointerDown() {},
  onClick(ctx, event, table) {
    openPointDialog(ctx, { at: table.point(event) });
  },
  onKeyDown(ctx, event, table) {
    if (event.key === "Escape") table.setMode("move");
  },
};
/**
 * A notification or search result opens the Table on this tab once (as B25 does). The
 * route names the sub-tab that lists the request ("travel-camp", "travel-journey"), or
 * "travel-creature" for what lives in the Creature tab (the torch of the routed actor).
 */
const routeFor = (where, actorId = null) => ({
  page: "table",
  params: { tab: `${ROUTE_TAB}-${where}`, ...(actorId ? { id: actorId } : {}) },
});
const SUB_OF_KIND = { travel: "journey", extended: "journey", watch: "camp" };
let restRouteView = null;
function applyRouteTab(ctx, table) {
  const view = ctx.view;
  if (view && view !== ui.routeView) {
    ui.routeView = view;
    const tab = view.page === "table" ? String(view.tab ?? "") : "";
    // A rest notification (CA-77, PG-81): the Table opens with that rest's dialog, once per
    // navigation (a role change or a re-render of the same view never reopens it).
    if (tab.startsWith("rest:") && view !== restRouteView) {
      restRouteView = view;
      const restId = tab.slice(5);
      queueMicrotask(() => openRest(ctx, { restId }));
    }
    if (tab === ROUTE_TAB || tab.startsWith(`${ROUTE_TAB}-`)) {
      const where = tab.slice(ROUTE_TAB.length + 1);
      ui.openTab = where === "creature" ? "creature" : "travel";
      if (SUBS.includes(where) && subOf(ctx) !== where) {
        setSub(ctx, where);
        ui.subChanged = true;
      }
    }
  }
  if (!ui.openTab || !table?.root) return;
  const target =
    ui.openTab === "creature" ? '[data-table-tab="creature"]' : '[data-table-drawer="travel"]';
  const redraw = ui.subChanged;
  ui.openTab = false;
  ui.subChanged = false;
  const tab = table.root.querySelector(target);
  if (tab && tab.getAttribute("aria-expanded") !== "true") queueMicrotask(() => tab.click());
  // Already open on another sub-tab: draw the routed one.
  else if (tab && redraw) queueMicrotask(() => ctx.render());
}

// ------------------------------------------------------------------ sheet section
function sheetHTML(ctx, actor) {
  const c = campaignOf(ctx);
  const seconds = D.clockSeconds(ctx.state, cid(ctx));
  const raw = ctx.state.actors[actor.id] ?? actor;
  const light = D.litLight(c, actor.id, seconds);
  const s = light ? D.lightStatus(light, seconds) : null;
  const left = s ? D.durationParts(s.remaining) : null;
  return `<div class="travel-sheet" data-travel-sheet><p>${ctx.icon("light")} ${light ? `<strong>${ctx.t("Torcia accesa", "Lit torch")}</strong> · ${ctx.t("resta", "left")} ${left.hours ? `${left.hours} h ` : ""}${left.minutes} min` : ctx.t("Nessuna luce accesa", "No light lit")} · ${ctx.t("Torce", "Torches")}: ${D.torchCount(raw)}</p><p>${ctx.icon("bag")} ${ctx.t("Razioni", "Rations")}: <strong>${D.rationCount(raw)}</strong> (${D.rationCount(raw) === 1 ? ctx.t("1 giorno di cibo", "1 day of food") : ctx.t(`${D.rationCount(raw)} giorni di cibo`, `${D.rationCount(raw)} days of food`)})</p><p class="muted">${ctx.t("Accensione, ricerca e consumo al Tavolo, scheda «Viaggio e accampamento».", "Lighting, searching and eating at the Table, «Travel and camp» tab.")} ${sourceLink(ctx, D.SOURCES.rations)}</p></div>`;
}

// ------------------------------------------------------------------ notifications
function collect(ctx) {
  const slice = sliceOf(ctx.state);
  if (!slice || !D.isMember(ctx.state, ctx.role)) return [];
  const c = campaignOf(ctx);
  const target = routeFor("journey");
  const out = [];
  for (const check of D.pendingChecksFor(ctx.state, c, ctx.role))
    out.push({
      id: `travel-check-${check.id}`,
      title: L(
        `Prova richiesta: ${nameOf(ctx, check.actorId)} · ${D.checkName(check).it}`,
        `Check requested: ${nameOf(ctx, check.actorId)} · ${D.checkName(check).en}`,
      ),
      body: L("Viaggio e accampamento", "Travel and camp"),
      category: "requests",
      target: routeFor(SUB_OF_KIND[check.kind] ?? "journey", check.actorId),
    });
  const day = c.provisions.days[D.now(ctx.state, cid(ctx)).day];
  for (const [actorId, answer] of Object.entries(day?.rows ?? {})) {
    const actor = ctx.state.actors[actorId];
    if (answer.status === "pending" && actor && actor.owner === ctx.role)
      out.push({
        id: `travel-food-${day.at}-${actorId}`,
        title: L(
          `Provviste di oggi: decide ${actor.name}`,
          `Today’s provisions: ${actor.name} decides`,
        ),
        body: L(
          "Consuma una razione, un’altra fonte o salta il pasto.",
          "Use a Rations, other food or skip the meal.",
        ),
        category: "party",
        target: routeFor("journey", actorId),
      });
  }
  const seconds = D.clockSeconds(ctx.state, cid(ctx));
  for (const light of c.lights) {
    const s = D.lightStatus(light, seconds);
    const actor = ctx.state.actors[light.actorId];
    if (s.state === "warning" && actor && canControlActor(actor, ctx.role, ctx.state))
      out.push({
        id: `travel-torch-${light.id}`,
        title: L(
          `La torcia di ${actor.name} si spegne tra ${Math.ceil(s.remaining / 60)} min`,
          `${actor.name}’s torch goes out in ${Math.ceil(s.remaining / 60)} min`,
        ),
        body: L("Luce portatile", "Portable light"),
        category: "reminders",
        target: routeFor("creature", light.actorId),
      });
  }
  if (dmOf(ctx))
    for (const event of c.events.filter((e) => e.status === "proposed"))
      out.push({
        id: `travel-event-${event.id}`,
        title: L("Evento di viaggio da decidere", "Travel event to decide"),
        body: D.EVENT_TABLE.rows.find((r) => r.id === event.rowId)?.title,
        category: "party",
        target,
      });
  return out;
}

// ------------------------------------------------------------------ registration
export function register(registry) {
  area = registry;
  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    seed: D.seedSlice,
    normalize: D.normalizeSlice,
  });
  // Accepted dice stay as evidence across gameplay Undo (like the log and B25 history).
  registry.registerStateSlice(D.ROLLS, {
    version: D.VERSION,
    undo: "preserve",
    seed: D.seedRolls,
    normalize: D.normalizeRolls,
  });
  registry.registerStyles(new URL("./exploration.css", import.meta.url));
  // A lit torch lights the scene for the Table's vision (B35), not only this area's ring.
  FV.addLightProvider?.(D.torchLights);
  registry.add("table-panel", {
    id: "travel",
    section: "exploration",
    label: L("Viaggio e accampamento", "Travel and camp"),
    placement: "sidebar-tab",
    icon: "light",
    order: 74,
    when: (ctx) => Boolean(sliceOf(ctx.state)) && D.isMember(ctx.state, ctx.role),
    render: (ctx) => panelHTML(ctx),
    bind: (el, ctx, table) => bindPanel(el, ctx, table),
  });
  registry.add("table-panel", {
    id: "travel-inspector",
    label: L("Luce e ricerca", "Light and search"),
    placement: "inspector",
    order: 30,
    when: (ctx, tableView) =>
      Boolean(sliceOf(ctx.state)) &&
      D.memberIds(ctx.state).includes(tableView?.selectedActorId) &&
      canViewActor(ctx.state.actors[tableView.selectedActorId], ctx.role, ctx.state),
    render: (ctx, tableView) => inspectorHTML(ctx, tableView),
    bind: (el, ctx) => bindInspector(el, ctx),
  });
  registry.add("map-layer", {
    id: "travel-layer",
    label: L("Luci, ricerca e formazione", "Lights, search and formation"),
    order: 55,
    interactive: true,
    svg: (ctx, tableView) => layerSVG(ctx, tableView),
    bind: (el, ctx, table) => bindLayer(el, ctx, table),
  });
  registry.add("map-layer", {
    id: "travel-weather",
    label: L("Meteo sulla mappa", "Weather on the map"),
    order: 95,
    svg: (ctx, tableView) => weatherSVG(ctx, tableView),
  });
  registry.add("table-tool", placeTool);
  registry.add("table-tool", pointTool);
  registry.add("sheet-section", {
    id: "travel-supplies",
    tab: "inventory",
    label: L("Luce e provviste", "Light and provisions"),
    when: (ctx, actor) => Boolean(sliceOf(ctx.state)) && D.memberIds(ctx.state).includes(actor?.id),
    render: (ctx, actor) => sheetHTML(ctx, actor),
  });
  registry.add("notifications", {
    id: "travel",
    label: L("Viaggio e accampamento", "Travel and camp"),
    collect,
  });
  // CA-77 / PG-81 (dnd5e rest request): the DM sees rests waiting for game time; players
  // get their Hit Dice step and the choices to review after a Long Rest.
  registry.add("notifications", {
    id: "travel-rests",
    label: L("Riposi", "Rests"),
    collect: (ctx) => restNotifications(ctx),
  });
  registry.add("command", {
    id: "travel.open",
    label: L("Apri viaggio e accampamento", "Open travel and camp"),
    group: "table",
    run: (ctx) => {
      ui.openTab = true;
      ui.routeView = null;
      ctx.navigate("table", { tab: ROUTE_TAB });
    },
  });
  registry.on("role-changed", () => resetTravelView());
  registry.on("reset", () => {
    resetTravelView();
    forgetSub();
  });
}
