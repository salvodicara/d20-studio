// B53 — Personal commands and quick bar (Table area, registry B11).
//
// Where it lives (B61 structure): a row of the bottom action bar under the controlled
// creature's resources, like BG3's hotbar (CRP-098/099); the selected token's bar as
// Roll20's token actions (R20-035/148); custom actions in the sheet's Actions tab like
// D&D Beyond's "Manage Custom" (DDB-040). Pure rules live in quickbar-domain.mjs.
//
// Controls (all real): click/tap runs a slot; Shift+click, right click, a long press or
// Shift+F10 edit it; drag reorders (mouse, and touch while customising); "+" and empty
// slots add; the pen customises (tray of sheet actions, custom actions, checks and saves
// to drag in, Dice+ VTL-174); ‹ › and Alt+1–5 change page, keys 1–0 run the open page's
// slots (Foundry FVT-194); the ⋯ menu shares a page as a copy, copies it as text,
// imports text, renames/adds/removes pages, lists every page (FVT-195) and the roll history.
import * as D from "./quickbar-domain.mjs";
import { rollDie } from "./state.mjs";
import { canViewActor } from "./character-access.mjs";
import { usableItems, openItemUse } from "./inventory-plus.mjs";
import { openFormReturn } from "./forms-ui.mjs";

const { ID, ROLLS } = D;
let area = null;
let tableRef = null;

// ------------------------------------------------------------------ device memory

// Per identity on this device (Foundry keeps the hotbar page per client): open page per
// creature, dice mode, d20 mode, the DM's hidden rolls and dismissed results.
const MEMORY_KEY = "d20-studio-quickbar";
let memory = null;
function loadMemory() {
  if (memory) return memory;
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(MEMORY_KEY) ?? "null");
    memory = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    memory = {};
  }
  return memory;
}
export function prefsFor(role) {
  const entry = loadMemory()[role] ?? {};
  return {
    page: entry.page && typeof entry.page === "object" ? entry.page : {},
    dice: entry.dice === "physical" ? "physical" : "digital",
    d20: ["advantage", "disadvantage"].includes(entry.d20) ? entry.d20 : "normal",
    hidden: entry.hidden === true,
    dismissed: Array.isArray(entry.dismissed) ? entry.dismissed : [],
  };
}
/** Device preferences of an identity (also used by the tests). */
export function setQuickbarPrefs(role, patch) {
  return remember(role, patch);
}
function remember(role, patch) {
  const next = { ...prefsFor(role), ...patch };
  memory = { ...loadMemory(), [role]: next };
  try {
    globalThis.localStorage?.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch {
    /* no storage: the choice lasts for this page */
  }
  return next;
}
function forgetMemory() {
  memory = {};
  try {
    globalThis.localStorage?.removeItem(MEMORY_KEY);
  } catch {
    /* nothing saved */
  }
}
// Transient UI of this page: customising, the element to focus after the next bind, a
// click to ignore right after a drag or a long press.
const ui = { editing: false, refocus: null, ignoreClickUntil: 0 };
export function resetQuickbarUI() {
  ui.editing = false;
  ui.refocus = null;
  ui.ignoreClickUntil = 0;
}

// ------------------------------------------------------------------ helpers

const sliceOf = (state) => state?.ext?.[ID] ?? null;
const rollsOf = (state) => state?.ext?.[ROLLS] ?? { rolls: [] };
const lbl = (ctx, value) =>
  value && typeof value === "object" ? (value[ctx.lang] ?? value.it ?? "") : String(value ?? "");
const esc = (ctx, value) => ctx.esc(String(value ?? ""));
const text = (ctx, value) => esc(ctx, lbl(ctx, value));
const localized = (ctx, error) =>
  error?.[ctx.lang] || error?.it || error?.message || String(error ?? "");
function toastError(ctx, error) {
  ctx.toast(localized(ctx, error), true);
}
const pageIndex = (ctx, slice, actorId) => {
  const count = D.barOf(slice, ctx.role, actorId).pages.length;
  const saved = prefsFor(ctx.role).page[actorId];
  return Number.isInteger(saved) && saved >= 0 && saved < count ? saved : 0;
};
function setPage(ctx, actorId, index) {
  remember(ctx.role, { page: { ...prefsFor(ctx.role).page, [actorId]: index } });
}
const commitOptions = (actor, { hidden = false } = {}) =>
  actor?.visibility === "private"
    ? { local: true, visibility: "private" }
    : hidden
      ? { visibility: "private" }
      : {};
// Bar edits are this identity's own configuration: a private local change (offline too).
const PERSONAL = { local: true, visibility: "private" };
function barCommit(ctx, label, mutate) {
  ctx.commit(label, (draft) => mutate(draft, area.slice(draft)), PERSONAL);
}
const dialogBody = () => globalThis.document?.querySelector("#dialog");
const signed = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);
// Who a shared copy comes from: the character, or only the role for a personal sheet.
const sharedByName = (ctx, from) =>
  from?.actorName ??
  (from?.by === "dm" ? ctx.t("il DM", "the DM") : ctx.t("un giocatore", "a player"));
// Skills in the alphabetical order of the current language, as the sheet lists them.
const byName = (ctx) => (a, b) => lbl(ctx, a.name).localeCompare(lbl(ctx, b.name), ctx.lang);
const skillsSorted = (ctx) => Object.values(D.SKILLS).sort(byName(ctx));
const modeName = (ctx, mode) =>
  mode === "physical"
    ? ctx.t("dadi fisici", "physical dice")
    : ctx.t("dadi digitali", "digital dice");

// ------------------------------------------------------------------ dock row

function slotButton(ctx, slice, actorId, slot, index, page, focusIndex) {
  const key = D.KEYS[index];
  const tab = index === focusIndex ? 0 : -1;
  if (!slot)
    return `<button type="button" class="qb-slot is-empty" data-qb-empty data-qb-index="${index}" data-qb-drop tabindex="${tab}" aria-keyshortcuts="${key}" aria-label="${key}: ${ctx.t("casella vuota, aggiungi", "empty slot, add")}" title="${ctx.t("Casella vuota: aggiungi", "Empty slot: add")} (${key})"><span class="qb-key" aria-hidden="true">${key}</span><span class="qb-plus" aria-hidden="true">+</span></button>`;
  const name = lbl(ctx, D.slotName(ctx.state, slice, actorId, slot));
  const face = lbl(ctx, D.slotFace(ctx.state, slice, actorId, slot));
  const status = D.slotStatus(ctx.state, slice, actorId, slot);
  const kind = lbl(ctx, D.slotKindName(slot.kind));
  const reason = status.available ? "" : lbl(ctx, status.reason);
  const steps = slot.kind === "sequence" ? slot.ref.steps.length : 0;
  // PG-77 (BG3 class actions): a class feature shows its uses left; a transformed druid's
  // Wild Shape reads «Torna alla forma originale».
  const uses = D.featureReturns(ctx.state, actorId, slot)
    ? null
    : D.featureUses(ctx.state, actorId, slot);
  const usesText = uses
    ? ctx.t(`${uses.left} di ${uses.max} usi`, `${uses.left} of ${uses.max} uses`)
    : "";
  const hint = ctx.t(
    "Clic: usa · Maiusc+clic o clic destro: modifica · trascina per spostare",
    "Click: use · Shift+click or right click: edit · drag to move",
  );
  return `<button type="button" class="qb-slot qb-c-${slot.color}${status.available ? "" : " is-unavailable"}" data-qb-slot="${esc(ctx, slot.id)}" data-qb-index="${index}" data-qb-kind="${slot.kind}" data-qb-drag data-qb-drop tabindex="${tab}" aria-keyshortcuts="${key}"${status.available ? "" : ' aria-disabled="true"'} aria-label="${esc(ctx, `${key}: ${name} · ${kind}${usesText ? ` · ${usesText}` : ""}${steps ? ` · ${steps} ${ctx.t("passi", "steps")}` : ""}${reason ? ` · ${reason}` : ""}`)}" title="${esc(ctx, `${name} · ${kind}${usesText ? ` · ${usesText}` : ""} (${key})${reason ? ` — ${reason}` : ""}\n${hint}`)}"><span class="qb-key" aria-hidden="true">${key}</span><span class="qb-label">${esc(ctx, face)}</span>${steps ? `<span class="qb-steps-count" aria-hidden="true">${steps}×</span>` : ""}${uses ? `<span class="qb-uses" aria-hidden="true">${uses.left}/${uses.max}</span>` : ""}</button>`;
}
function runPanel(ctx, slice, run) {
  if (!run) return "";
  const records = rollsOf(ctx.state).rolls;
  const actor = ctx.state.actors[run.actorId];
  const status =
    run.status === "running"
      ? ctx.t(
          `Passo ${run.current + 1} di ${run.steps.length}`,
          `Step ${run.current + 1} of ${run.steps.length}`,
        )
      : run.status === "done"
        ? ctx.t("Completata", "Completed")
        : run.status === "blocked"
          ? ctx.t("Fermata: passo non permesso", "Stopped: step not permitted")
          : ctx.t("Interrotta", "Stopped");
  const steps = run.steps
    .map((step, i) => {
      const record = records.find((r) => r.id === step.rollIds?.[0]);
      const live = record && D.rollStatus(slice, record) !== "withdrawn";
      const cls = `qb-step is-${step.status}`;
      let detail = "";
      if (step.status === "done" && record) {
        const formula = ctx.lang === "en" ? (record.formulaEn ?? record.formula) : record.formula;
        const notes = [];
        if (record.status === "corrected")
          notes.push(
            ctx.t("corretto: ", "corrected: ") + esc(ctx, record.corrections.at(-1)?.reason),
          );
        if (record.status === "reused")
          notes.push(ctx.t("facce riusate dopo l'annullo", "faces reused after undo"));
        if (step.type === "attack" && record.natural === 20)
          notes.push(
            ctx.t(
              "20 naturale: colpo critico, i dadi dei danni si tirano due volte (SRD 5.2.1 EN 179 / IT 205)",
              "natural 20: Critical Hit, the damage dice are rolled twice (SRD 5.2.1 EN 179 / IT 205)",
            ),
          );
        if (step.type === "attack" && record.natural === 1)
          notes.push(ctx.t("1 naturale: l'attacco manca", "natural 1: the attack misses"));
        if (step.type === "attack" && ![1, 20].includes(record.natural))
          notes.push(
            ctx.t(
              "il DM confronta il totale con la CA del bersaglio",
              "the DM compares the total with the target's AC",
            ),
          );
        detail = `<strong class="qb-step-total">${record.total}</strong><small>${esc(ctx, formula)} → [${record.values.join(", ")}] · ${record.mode === "physical" ? ctx.t("fisico", "physical") : ctx.t("digitale", "digital")}${notes.length ? " · " + notes.join(" · ") : ""}</small>${live && record.mode === "physical" && record.by === ctx.role ? `<button type="button" class="button quiet qb-small" data-qb-correct="${esc(ctx, record.id)}">${ctx.t("Correggi…", "Correct…")}</button>` : ""}`;
      } else if (step.reason)
        detail = `<small class="qb-step-reason">${text(ctx, step.reason)}</small>`;
      else detail = `<small>${ctx.t("in attesa", "waiting")}</small>`;
      return `<li class="${cls}" data-qb-step="${i}"><span class="qb-step-n" aria-hidden="true">${i + 1}</span><span class="qb-step-name">${text(ctx, step.label)}</span>${detail}</li>`;
    })
    .join("");
  const next = run.steps[run.current];
  const running = run.status === "running";
  return `<div class="qb-run" data-qb-run="${esc(ctx, run.id)}" data-qb-run-status="${run.status}" role="status" aria-live="polite"><div class="qb-run-head"><strong>${esc(ctx, actor?.name ?? "")} · ${text(ctx, run.name)}</strong><span class="qb-run-status">${status} · ${modeName(ctx, run.mode)}${run.visibility === "private" ? " · " + ctx.t("nascosto", "hidden") : ""}</span><span class="qb-run-tools">${running && run.mode === "physical" && next ? `<button type="button" class="button primary qb-small" data-qb-run-next>${ctx.t("Registra passo", "Record step")} ${run.current + 1}…</button>` : ""}${running ? `<button type="button" class="button quiet qb-small" data-qb-run-stop>${ctx.t("Interrompi…", "Stop…")}</button>` : `<button type="button" class="icon-button qb-close" data-qb-run-close aria-label="${ctx.t("Chiudi il risultato", "Close the result")}">${ctx.icon("close")}</button>`}</span></div><ol class="qb-run-steps">${steps}</ol>${run.stopReason ? `<p class="qb-run-reason">${ctx.t("Motivo dell'interruzione", "Reason for stopping")}: ${esc(ctx, run.stopReason)}</p>` : ""}</div>`;
}
function trayHTML(ctx, slice, actorId) {
  const items = D.availableItems(ctx.state, slice, actorId);
  const groups = [
    ["custom", ctx.t("Azioni personalizzate", "Custom actions")],
    ["sheet", ctx.t("Azioni della scheda", "Sheet actions")],
    ["features", ctx.t("Capacità di classe", "Class features")],
    ["checks", ctx.t("Prove", "Checks")],
    ["saves", ctx.t("Tiri salvezza", "Saving throws")],
    ["skills", ctx.t("Abilità", "Skills")],
  ];
  return `<div class="qb-tray" data-qb-tray><div class="qb-tray-head"><p class="qb-hint">${ctx.t("Trascina un elemento su una casella, o premi Invio per metterlo nella prima casella libera. Trascina le caselle per riordinarle; un clic su una casella la modifica.", "Drag an item onto a slot, or press Enter to put it in the first free slot. Drag slots to reorder them; clicking a slot edits it.")}</p><div class="qb-tray-actions"><button type="button" class="button" data-qb-new="roll">${ctx.icon("dice")} ${ctx.t("Nuovo tiro salvato…", "New saved roll…")}</button><button type="button" class="button" data-qb-new="sequence">${ctx.icon("cards")} ${ctx.t("Nuova sequenza…", "New sequence…")}</button><button type="button" class="button" data-qb-custom-sheet>${ctx.icon("book")} ${ctx.t("Azioni personalizzate della scheda", "Sheet custom actions")}</button><button type="button" class="button primary" data-qb-edit-done>${ctx.t("Fatto", "Done")}</button></div></div><div class="qb-tray-groups">${groups
    .map(([id, title]) => {
      const list = items.filter((item) => item.group === id);
      if (id === "skills") list.sort(byName(ctx));
      if (!list.length && id !== "custom") return "";
      return `<section class="qb-tray-group" aria-label="${esc(ctx, title)}"><h3>${esc(ctx, title)}</h3><div class="qb-chips">${
        list
          .map(
            (item) =>
              `<button type="button" class="qb-chip" data-qb-item="${esc(ctx, item.key)}" data-qb-drag title="${esc(ctx, lbl(ctx, item.detail ?? ""))}">${text(ctx, item.name)}${item.detail ? `<small>${text(ctx, item.detail)}</small>` : ""}</button>`,
          )
          .join("") ||
        `<span class="muted qb-empty-note">${ctx.t("Nessuna: creale dalla scheda, sezione Azioni.", "None: create them from the sheet, Actions tab.")}</span>`
      }</div></section>`;
    })
    .join("")}</div></div>`;
}
export function renderDock(ctx, view) {
  const slice = sliceOf(ctx.state);
  const actorId = view?.selectedActorId;
  const actor = actorId ? ctx.state.actors[actorId] : null;
  if (!slice || !actor) return "";
  if (!ctx.canControl(actor))
    return `<section class="qb qb-observer" data-qb data-qb-actor="${esc(ctx, actorId)}" aria-label="${ctx.t("Barra rapida", "Quick bar")}"><p class="qb-note">${ctx.icon("dice")} ${esc(ctx, ctx.t(`Barra rapida: ${actor.name} non è sotto il tuo controllo. Seleziona una creatura che controlli per usarne la barra.`, `Quick bar: ${actor.name} is not under your control. Select a creature you control to use its bar.`))}</p></section>`;
  const bar = D.barOf(slice, ctx.role, actorId);
  const page = pageIndex(ctx, slice, actorId);
  const current = bar.pages[page];
  const prefs = prefsFor(ctx.role);
  const run = D.latestRun(slice, ctx.role, actorId);
  const showRun = run && showsPanel(run) && !prefs.dismissed.includes(run.id);
  const focusIndex = Math.max(0, Number.isInteger(ui.refocus?.index) ? ui.refocus.index : 0);
  const pageName = lbl(ctx, current.name);
  const shared = current.sharedFrom
    ? ctx.t(
        ` · copia da ${sharedByName(ctx, current.sharedFrom)}`,
        ` · copy from ${sharedByName(ctx, current.sharedFrom)}`,
      )
    : "";
  const d20Names = {
    normal: ctx.t("Normale", "Normal"),
    advantage: ctx.t("Vantaggio", "Advantage"),
    disadvantage: ctx.t("Svantaggio", "Disadvantage"),
  };
  return `<section class="qb${ui.editing ? " is-editing" : ""}" data-qb data-qb-actor="${esc(ctx, actorId)}" data-qb-page-index="${page}" aria-label="${esc(ctx, ctx.t(`Barra rapida di ${actor.name}`, `${actor.name}'s quick bar`))}">${showRun ? runPanel(ctx, slice, run) : ""}${ui.editing ? trayHTML(ctx, slice, actorId) : ""}<div class="qb-row"><div class="qb-pages" role="group" aria-label="${ctx.t("Pagine della barra", "Bar pages")}"><button type="button" class="qb-icon" data-qb-page="prev" aria-label="${ctx.t("Pagina precedente", "Previous page")}" ${bar.pages.length < 2 ? `disabled aria-describedby="qb-why-one-page" title="${ctx.t("Una sola pagina: aggiungine un’altra dal menu della barra.", "One page only: add another from the bar menu.")}"` : ""}>‹</button><button type="button" class="qb-page-name${current.sharedFrom ? " is-shared" : ""}" data-qb-menu aria-haspopup="dialog" aria-label="${esc(ctx, ctx.t(`Pagina ${page + 1} di ${bar.pages.length}: ${pageName}${shared}. Opzioni della barra`, `Page ${page + 1} of ${bar.pages.length}: ${pageName}${shared}. Bar options`))}" title="${esc(ctx, pageName + shared)}"><span class="qb-page-num">${page + 1}/${bar.pages.length}</span><span class="qb-page-label">${esc(ctx, pageName)}</span></button><button type="button" class="qb-icon" data-qb-page="next" aria-label="${ctx.t("Pagina successiva", "Next page")}" ${bar.pages.length < 2 ? `disabled aria-describedby="qb-why-one-page" title="${ctx.t("Una sola pagina: aggiungine un’altra dal menu della barra.", "One page only: add another from the bar menu.")}"` : ""}>›</button>${bar.pages.length < 2 ? `<span class="visually-hidden" id="qb-why-one-page">${ctx.t("Una sola pagina: aggiungine un’altra dal menu della barra.", "One page only: add another from the bar menu.")}</span>` : ""}</div><div class="qb-slots" role="toolbar" aria-label="${esc(ctx, ctx.t(`Caselle 1–0 della pagina ${pageName}`, `Slots 1–0 of page ${pageName}`))}" data-qb-slots>${current.slots
    .map((slot, i) => slotButton(ctx, slice, actorId, slot, i, page, focusIndex))
    .join(
      "",
    )}</div><div class="qb-tools"><button type="button" class="qb-icon" data-qb-add aria-label="${ctx.t("Aggiungi alla barra", "Add to the bar")}" title="${ctx.t("Aggiungi alla barra", "Add to the bar")}">${ctx.icon("plus")}</button>${itemsButton(ctx, actorId)}<button type="button" class="qb-icon${ui.editing ? " active" : ""}" data-qb-edit aria-pressed="${ui.editing}" aria-label="${ctx.t("Personalizza la barra", "Customise the bar")}" title="${ctx.t("Personalizza la barra", "Customise the bar")}">${ctx.icon("pen")}</button><label class="qb-select"><select data-qb-dice aria-label="${ctx.t("Dadi della barra rapida", "Quick bar dice")}"><option value="digital" ${prefs.dice === "digital" ? "selected" : ""}>${ctx.t("Dadi digitali", "Digital dice")}</option><option value="physical" ${prefs.dice === "physical" ? "selected" : ""}>${ctx.t("Dadi fisici", "Physical dice")}</option></select></label><label class="qb-select${prefs.d20 !== "normal" ? " is-set" : ""}"><span>d20</span><select data-qb-d20 aria-label="${ctx.t("Modalità del d20", "d20 mode")}">${Object.entries(
    d20Names,
  )
    .map(
      ([value, name]) =>
        `<option value="${value}" ${prefs.d20 === value ? "selected" : ""}>${name}</option>`,
    )
    .join(
      "",
    )}</select></label>${ctx.role === "dm" ? `<button type="button" class="qb-icon${prefs.hidden ? " active" : ""}" data-qb-hidden aria-pressed="${prefs.hidden}" aria-label="${ctx.t("Tiri nascosti: solo il DM li vede", "Hidden rolls: only the DM sees them")}" title="${prefs.hidden ? ctx.t("Tiri nascosti: solo il DM li vede", "Hidden rolls: only the DM sees them") : ctx.t("Tiri visibili a tutti (premi per nasconderli)", "Rolls visible to everyone (press to hide them)")}">${ctx.icon("eye")}</button>` : ""}<button type="button" class="qb-icon" data-qb-menu aria-haspopup="dialog" aria-label="${ctx.t("Opzioni della barra rapida", "Quick bar options")}" title="${ctx.t("Opzioni della barra rapida", "Quick bar options")}">${ctx.icon("menu")}</button></div></div></section>`;
}

// TV-70 (BG3 hotbar items, dnd5e Activities): the creature's usable items, from the
// inventory's own list (inventory-plus export), used here with a target at the Table.
function itemsButton(ctx, actorId) {
  const count = usableItems(ctx.state, actorId, ctx.role).length;
  if (!count) return "";
  const name = ctx.t(`Usa un oggetto (${count})`, `Use an item (${count})`);
  return `<button type="button" class="qb-icon" data-qb-items aria-haspopup="dialog" aria-label="${esc(ctx, name)}" title="${esc(ctx, name)}">${ctx.icon("bag")}</button>`;
}
export function openItems(ctx, actorId) {
  const items = usableItems(ctx.state, actorId, ctx.role);
  if (items.length === 1) return openItemUse(ctx, actorId, items[0].id);
  ctx.dialog(
    ctx.t("Usa un oggetto", "Use an item"),
    `<div class="qb-items">${items
      .map(
        (item) =>
          `<button type="button" class="button" data-qb-use-item="${esc(ctx, item.id)}">${text(ctx, item.name)}${item.charges ? ` <small>${item.charges.value}/${item.charges.max} ${ctx.t("cariche", "charges")}</small>` : ""}</button>`,
      )
      .join("")}</div>`,
  );
  dialogBody()
    ?.querySelectorAll("[data-qb-use-item]")
    .forEach((button) =>
      button.addEventListener("click", () => openItemUse(ctx, actorId, button.dataset.qbUseItem)),
    );
}

// ------------------------------------------------------------------ running slots

// A single digital roll reports like Dice+ and Roll20 (toast, 3D dice, log card); the
// panel is for sequences, attack + damage, physical steps and a stopped run.
const showsPanel = (run) =>
  run.status === "running" ||
  run.steps.length > 1 ||
  run.mode === "physical" ||
  run.status !== "done";
function runLabel(ctx, state, run, records) {
  const actor = state.actors[run.actorId];
  const lines = records.map((r) => D.rollLine(r, ctx.lang));
  if (run.steps.length === 1 && lines.length === 1 && run.status === "done")
    return `${actor?.name ?? ""} · ${lines[0]} (${modeName(ctx, run.mode)})`;
  const blocked = run.steps.find((s) => s.status === "blocked");
  const tail = blocked
    ? ` · ${ctx.t("fermata", "stopped")}: ${lbl(ctx, blocked.reason)}`
    : run.status === "running"
      ? ` · ${ctx.t(`passo ${run.current} di ${run.steps.length}`, `step ${run.current} of ${run.steps.length}`)}`
      : "";
  return `${actor?.name ?? ""} · ${lbl(ctx, run.name)}${lines.length ? ": " + lines.join("; ") : ""} (${modeName(ctx, run.mode)})${tail}`;
}
/** One quick-bar roll command: slice and rolls in the same commit; the log entry gets the
 * result line and the log rolls; "roll-accepted" is announced as the other areas do. */
function commitRun(ctx, actorId, title, mutate, { hidden = false, undoable } = {}) {
  const actor = ctx.state.actors[actorId];
  let out = { run: null, records: [] };
  let logId = null;
  ctx.commit(
    title,
    (draft) => {
      out = mutate(draft, area.slice(draft), area.slice(draft, ROLLS));
    },
    {
      ...commitOptions(actor, { hidden }),
      ...(undoable === false ? { undoable: false } : {}),
      afterCommit: (state) => {
        const entry = state.log?.at(-1);
        if (!entry) return;
        logId = entry.id;
        if (out.label) entry.label = out.label(state);
        else if (out.run) entry.label = runLabel(ctx, state, out.run, out.records);
        entry.rolls = [
          ...(entry.rolls ?? []),
          ...out.records.map((record) => D.logRollOf(state, record)),
        ];
      },
    },
  );
  for (const record of out.records)
    area?.emit?.("roll-accepted", { logId, roll: D.logRollOf(ctx.state, record) });
  return out;
}
function visibilityFor(ctx, actor) {
  if (actor?.visibility === "private") return "private";
  return ctx.role === "dm" && prefsFor(ctx.role).hidden ? "private" : "shared";
}
/** Runs a slot of the selected creature (click, tap, key 1–0). */
export function useSlot(ctx, table, actorId, slotId) {
  const slice = sliceOf(ctx.state);
  const bar = D.barOf(slice, ctx.role, actorId);
  const slot = bar.pages.flatMap((p) => p.slots).find((s) => s?.id === slotId);
  if (!slot) return;
  const status = D.slotStatus(ctx.state, slice, actorId, slot);
  if (!status.available) {
    ctx.toast(lbl(ctx, status.reason), true);
    return;
  }
  if (slot.kind === "feature") return useFeatureSlot(ctx, actorId, slot);
  if (slot.kind === "action") {
    // Roll20 token action (R20-035): the button runs the sheet's own action, here the
    // Table's action preview (target, confirmation and dice happen in the core flow).
    const button = table?.root?.querySelector(
      `[data-combat-action="${globalThis.CSS?.escape ? CSS.escape(slot.ref.actionId) : slot.ref.actionId}"]`,
    );
    if (!button) {
      ctx.toast(
        ctx.t(
          "Azione della scheda non disponibile sul Tavolo ora.",
          "Sheet action not available at the Table now.",
        ),
        true,
      );
      return;
    }
    // The bar's physical/digital choice applies to the action it runs: the Table's own
    // dice selector follows it (visible above the bar), instead of a second, silent mode.
    const mode = table?.root?.querySelector("[data-combat-mode]");
    const dice = prefsFor(ctx.role).dice;
    if (mode && mode.value !== dice) {
      mode.value = dice;
      mode.dispatchEvent(new Event("change", { bubbles: true }));
    }
    button.click();
    return;
  }
  const running = D.runningRun(slice, ctx.role, actorId);
  if (running) {
    ctx.toast(
      ctx.t(
        "C'è già una sequenza in corso: registra il passo o interrompila con un motivo.",
        "A sequence is already under way: record the step or stop it with a reason.",
      ),
      true,
    );
    return;
  }
  const prefs = prefsFor(ctx.role);
  const actor = ctx.state.actors[actorId];
  const visibility = visibilityFor(ctx, actor);
  const name = lbl(ctx, D.slotName(ctx.state, slice, actorId, slot));
  const title = `${actor.name} · ${name}`;
  const start = (draft, s) =>
    D.startRun(draft, s, ctx.role, actorId, slotId, {
      mode: prefs.dice,
      rollMode: prefs.d20,
      visibility,
      now: new Date().toISOString(),
    });
  if (prefs.dice === "digital") {
    try {
      ui.refocus = focusOfSlot(table, slotId);
      commitRun(
        ctx,
        actorId,
        title,
        (draft, s, rolls) => {
          const run = start(draft, s);
          return D.runSteps(draft, s, rolls, ctx.role, run.id, {
            die: ctx.rollDie ?? rollDie,
            now: new Date().toISOString(),
          });
        },
        { hidden: visibility === "private" },
      );
      forgetDismissed(ctx);
      const done = D.latestRun(sliceOf(ctx.state), ctx.role, actorId);
      if (done && !showsPanel(done)) {
        const record = rollsOf(ctx.state).rolls.find((r) => r.id === done.steps[0].rollIds[0]);
        if (record) ctx.toast(`${actor.name} · ${D.rollLine(record, ctx.lang)}`);
      }
    } catch (error) {
      toastError(ctx, error);
    }
    return;
  }
  // Physical dice: the first step's faces come from the table, then each next step.
  let plan;
  try {
    const steps = D.expandSteps(ctx.state, slice, actorId, slot);
    if (D.stepPermission(ctx.state, ctx.role, actorId, steps[0])) {
      ui.refocus = focusOfSlot(table, slotId);
      commitRun(
        ctx,
        actorId,
        title,
        (draft, s, rolls) => {
          const run = start(draft, s);
          return D.runSteps(draft, s, rolls, ctx.role, run.id, {
            faces: [],
            now: new Date().toISOString(),
          });
        },
        { hidden: visibility === "private" },
      );
      return;
    }
    plan = D.stepPlan(ctx.state, slice, actorId, steps[0], { rollMode: prefs.d20 });
    openFaces(ctx, {
      title,
      step: steps[0],
      index: 0,
      total: steps.length,
      plan,
      onFaces: (faces) => {
        ui.refocus = focusOfSlot(table, slotId);
        commitRun(
          ctx,
          actorId,
          title,
          (draft, s, rolls) => {
            const run = start(draft, s);
            return D.runSteps(draft, s, rolls, ctx.role, run.id, {
              faces,
              now: new Date().toISOString(),
            });
          },
          { hidden: visibility === "private" },
        );
        forgetDismissed(ctx);
      },
    });
  } catch (error) {
    toastError(ctx, error);
  }
}
// PG-77 / C9 (BG3 class actions): Wild Shape opens the forms (the form spends its use) and,
// once transformed, returns to the original form; another feature spends one use of the
// sheet's own counter, as the sheet's «Usa».
function useFeatureSlot(ctx, actorId, slot) {
  if (D.featureReturns(ctx.state, actorId, slot)) return openFormReturn(ctx, actorId);
  if (D.isWildShapeSlot(ctx.state, actorId, slot)) return ctx.openForms?.(actorId, "forms");
  const actor = ctx.state.actors[actorId];
  const name = lbl(ctx, D.slotName(ctx.state, sliceOf(ctx.state), actorId, slot));
  try {
    ctx.commit(
      ctx.t(`${actor.name} · ${name}: un uso speso`, `${actor.name} · ${name}: one use spent`),
      (draft) => D.useFeature(draft, ctx.role, actorId, slot),
      commitOptions(actor),
    );
    const uses = D.featureUses(ctx.state, actorId, slot);
    if (uses)
      ctx.toast(
        ctx.t(
          `${name}: ${uses.left} di ${uses.max} usi rimasti.`,
          `${name}: ${uses.left} of ${uses.max} uses left.`,
        ),
      );
  } catch (error) {
    toastError(ctx, error);
  }
}
function forgetDismissed(ctx) {
  const prefs = prefsFor(ctx.role);
  if (prefs.dismissed.length > 30) remember(ctx.role, { dismissed: prefs.dismissed.slice(-30) });
}
const focusOfSlot = (table, slotId) => {
  const index = Number(
    table?.root?.querySelector?.(`[data-qb-slot="${slotId}"]`)?.dataset?.qbIndex,
  );
  return Number.isInteger(index) ? { index } : null;
};
function facesFields(ctx, plan, values = []) {
  return `<div class="form-grid qb-faces">${plan.dice
    .map(
      (die, i) =>
        `<label class="field">${ctx.t("Dado", "Die")} ${i + 1} · d${die.sides}${die.rider ? ` (${esc(ctx, ctx.label(plan.riders?.find((r) => r.id === die.rider)?.name ?? ""))})` : ""}<input type="number" name="face${i}" min="1" max="${die.sides}" step="1" inputmode="numeric" required value="${values[i] ?? ""}"></label>`,
    )
    .join("")}</div>`;
}
const readFaces = (data, plan) => plan.dice.map((_, i) => Number(data.get(`face${i}`)));
function openFaces(ctx, { title, step, index, total, plan, onFaces }) {
  const d20Note =
    plan.kind === "d20" && plan.mode !== "normal"
      ? `<p class="muted">${plan.mode === "advantage" ? ctx.t("Vantaggio: tira due d20 e inserisci entrambe le facce; vale la più alta (SRD 5.2.1 EN 176 / IT 218).", "Advantage: roll two d20 and enter both faces; the higher counts (SRD 5.2.1 EN 176 / IT 218).") : ctx.t("Svantaggio: tira due d20 e inserisci entrambe le facce; vale la più bassa (SRD 5.2.1 EN 181 / IT 217).", "Disadvantage: roll two d20 and enter both faces; the lower counts (SRD 5.2.1 EN 181 / IT 217).")}</p>`
      : "";
  // H-02: the conditions that set the mode, named as the sheet and the tray name them.
  const reasons = plan.reasons?.length
    ? `<p class="muted qb-reasons">${plan.reasons.map((r) => `${esc(ctx, ctx.label(r.name))}: ${r.mode === "advantage" ? ctx.t("vantaggio", "advantage") : ctx.t("svantaggio", "disadvantage")}`).join(" · ")}</p>`
    : "";
  const crit = plan.critical
    ? `<p class="effect-note">${ctx.t("Colpo critico: tira due volte i dadi del danno (SRD 5.2.1 EN 179 / IT 205).", "Critical Hit: roll the damage dice twice (SRD 5.2.1 EN 179 / IT 205).")}</p>`
    : "";
  ctx.dialog(
    title,
    `<p><strong>${ctx.t("Passo", "Step")} ${index + 1} ${ctx.t("di", "of")} ${total}: ${text(ctx, step.label)}</strong></p><p class="qb-formula">${esc(ctx, planText(ctx, plan))}</p>${d20Note}${reasons}${crit}${facesFields(ctx, plan)}<p class="muted">${ctx.t("Inserisci le facce naturali dei dadi fisici: il modificatore si aggiunge una volta. Esc lascia il passo in attesa.", "Enter the natural faces of the physical dice: the modifier is added once. Escape leaves the step waiting.")}</p>`,
    {
      submitLabel: ctx.t("Registra il tiro", "Record the roll"),
      onSubmit: (data) => {
        onFaces(readFaces(data, plan));
      },
    },
  );
}
function planText(ctx, plan) {
  if (plan.riders?.length) return D.planText(plan, ctx.lang);
  const counts = [];
  for (const die of plan.dice) {
    const last = counts.at(-1);
    if (last && last.sides === die.sides && last.group === die.group) last.count += 1;
    else counts.push({ ...die, count: 1 });
  }
  const mod = plan.modifier ? ` ${plan.modifier < 0 ? "−" : "+"} ${Math.abs(plan.modifier)}` : "";
  const mode =
    plan.kind === "d20" && plan.mode === "advantage"
      ? ctx.t(" (vantaggio)", " (advantage)")
      : plan.kind === "d20" && plan.mode === "disadvantage"
        ? ctx.t(" (svantaggio)", " (disadvantage)")
        : plan.critical
          ? ctx.t(" (critico)", " (critical)")
          : "";
  return counts.map((c) => `${c.count}d${c.sides}`).join(" + ") + mod + mode;
}
export function nextStep(ctx, actorId) {
  const slice = sliceOf(ctx.state);
  const run = D.runningRun(slice, ctx.role, actorId);
  if (!run) return;
  try {
    const plan = D.pendingPlan(ctx.state, slice, run);
    const step = run.steps[run.current];
    const title = `${ctx.state.actors[actorId].name} · ${lbl(ctx, run.name)}`;
    // A step that is not permitted stops the sequence with its reason, without faces.
    const denied = D.stepPermission(ctx.state, ctx.role, actorId, step);
    if (denied) {
      commitRun(ctx, actorId, title, (draft, s, rolls) =>
        D.runSteps(draft, s, rolls, ctx.role, run.id, { faces: [], now: new Date().toISOString() }),
      );
      return;
    }
    openFaces(ctx, {
      title,
      step,
      index: run.current,
      total: run.steps.length,
      plan,
      onFaces: (faces) =>
        commitRun(
          ctx,
          actorId,
          title,
          (draft, s, rolls) =>
            D.runSteps(draft, s, rolls, ctx.role, run.id, { faces, now: new Date().toISOString() }),
          {
            hidden:
              run.visibility === "private" && ctx.state.actors[actorId]?.visibility !== "private",
          },
        ),
    });
  } catch (error) {
    toastError(ctx, error);
  }
}
export function stopDialog(ctx, actorId) {
  const slice = sliceOf(ctx.state);
  const run = D.runningRun(slice, ctx.role, actorId);
  if (!run) return;
  ctx.dialog(
    ctx.t("Interrompi la sequenza", "Stop the sequence"),
    `<p>${text(ctx, run.name)} · ${ctx.t(`passo ${run.current + 1} di ${run.steps.length}`, `step ${run.current + 1} of ${run.steps.length}`)}</p><p class="muted">${ctx.t("I passi già tirati restano; quelli mancanti non vengono eseguiti. Il motivo va nel registro.", "Steps already rolled stay; the missing ones are not run. The reason goes to the log.")}</p><label class="field">${ctx.t("Motivo", "Reason")}<textarea name="reason" maxlength="200" required data-qb-stop-reason></textarea></label>`,
    {
      submitLabel: ctx.t("Interrompi", "Stop"),
      onSubmit: (data) => {
        const reason = String(data.get("reason") ?? "");
        const actor = ctx.state.actors[actorId];
        commitRun(
          ctx,
          actorId,
          `${actor.name} · ${lbl(ctx, run.name)}: ${ctx.t("interrotta", "stopped")}`,
          (draft, s) => {
            const stopped = D.stopRun(s, ctx.role, run.id, reason, new Date().toISOString());
            return {
              run: stopped,
              records: [],
              label: () =>
                `${actor.name} · ${lbl(ctx, run.name)}: ${ctx.t("sequenza interrotta", "sequence stopped")} — ${reason.trim()}`,
            };
          },
          { hidden: run.visibility === "private" && actor?.visibility !== "private" },
        );
      },
    },
  );
}
export function correctDialog(ctx, rollId) {
  const record = rollsOf(ctx.state).rolls.find((r) => r.id === rollId);
  if (!record) return;
  ctx.dialog(
    ctx.t("Correggi il tiro fisico", "Correct the physical roll"),
    `<p>${esc(ctx, D.rollLine(record, ctx.lang))}</p><p class="muted">${ctx.t("Per una faccia inserita per errore. Le facce precedenti restano nella cronologia con il motivo.", "For a face entered by mistake. The earlier faces stay in the history with the reason.")}</p>${facesFields(ctx, record.plan, record.values)}<label class="field">${ctx.t("Motivo", "Reason")}<input name="reason" maxlength="200" required data-qb-correct-reason></label>`,
    {
      submitLabel: ctx.t("Registra la correzione", "Record the correction"),
      onSubmit: (data) => {
        const faces = readFaces(data, record.plan);
        const reason = String(data.get("reason") ?? "");
        const actor = ctx.state.actors[record.actorId];
        commitRun(
          ctx,
          record.actorId,
          ctx.t("Correzione del tiro", "Roll correction"),
          (draft, s, rolls) => {
            const before = D.rollLine(
              rolls.rolls.find((r) => r.id === rollId),
              ctx.lang,
            );
            const corrected = D.correctRoll(
              s,
              rolls,
              ctx.role,
              rollId,
              faces,
              reason,
              new Date().toISOString(),
            );
            return {
              run: null,
              records: [corrected],
              label: () =>
                `${actor?.name ?? ""} · ${ctx.t("Correzione del tiro", "Roll correction")}: ${before} → [${corrected.values.join(", ")}] = ${corrected.total} · ${ctx.t("Motivo", "Reason")}: ${reason.trim()}`,
            };
          },
          {
            hidden: record.visibility === "private" && actor?.visibility !== "private",
            undoable: false,
          },
        );
      },
    },
  );
}

// ------------------------------------------------------------------ add and edit dialogs

function colorField(ctx, current = "gold") {
  return `<fieldset class="qb-colors"><legend>${ctx.t("Colore", "Colour")}</legend>${D.COLORS.map(
    (c) =>
      `<label class="qb-swatch qb-c-${c.id}"><input type="radio" name="color" value="${c.id}" ${c.id === current ? "checked" : ""}><span>${text(ctx, c.name)}</span></label>`,
  ).join("")}</fieldset>`;
}
// The name of a step value for its option: a saved roll no longer on the bar (renamed,
// removed or named in the other language) or a removed custom action still shows.
function stepValueName(ctx, slice, actorId, value) {
  const step = parseStepValue(value);
  if (step?.kind === "roll") return `${step.label} (${step.formula})`;
  if (step?.kind === "custom")
    return (
      D.customActionsOf(slice, actorId).find((a) => a.id === step.customId)?.name ??
      ctx.t("Azione personalizzata rimossa", "Removed custom action")
    );
  if (step?.kind === "check") return lbl(ctx, D.checkName(step.ability, step.type, step.skill));
  return value;
}
function stepOptions(ctx, slice, actorId, selected = "") {
  const bar = D.barOf(slice, ctx.role, actorId);
  const rolls = bar.pages.flatMap((p) => p.slots).filter((s) => s?.kind === "roll");
  const option = (value, name) =>
    `<option value="${esc(ctx, value)}" ${value === selected ? "selected" : ""}>${esc(ctx, name)}</option>`;
  const values = [
    ...D.customActionsOf(slice, actorId).map((a) => `custom:${a.id}`),
    ...rolls.map((s) => `roll:${s.ref.formula}:${lbl(ctx, s.label)}`),
    ...Object.keys(D.ABILITIES).flatMap((ab) => [`check:${ab}:check`, `check:${ab}:save`]),
    ...Object.values(D.SKILLS).map((sk) => `check:${sk.ability}:skill:${sk.id}`),
  ];
  // The step as it is now keeps its own option, so saving never drops it.
  const current =
    selected && !values.includes(selected)
      ? `<optgroup label="${ctx.t("Passo attuale", "Current step")}">${option(selected, stepValueName(ctx, slice, actorId, selected))}</optgroup>`
      : "";
  return `<option value="">—</option>${current}<optgroup label="${ctx.t("Azioni personalizzate", "Custom actions")}">${D.customActionsOf(
    slice,
    actorId,
  )
    .map((a) => option(`custom:${a.id}`, a.name))
    .join(
      "",
    )}</optgroup><optgroup label="${ctx.t("Tiri salvati di questa barra", "Saved rolls of this bar")}">${rolls
    .map((s) =>
      option(
        `roll:${s.ref.formula}:${lbl(ctx, s.label)}`,
        `${lbl(ctx, s.label)} (${s.ref.formula})`,
      ),
    )
    .join("")}</optgroup><optgroup label="${ctx.t("Prove", "Checks")}">${Object.keys(D.ABILITIES)
    .map((ab) => option(`check:${ab}:check`, lbl(ctx, D.checkName(ab, "check"))))
    .join("")}</optgroup><optgroup label="${ctx.t("Tiri salvezza", "Saving throws")}">${Object.keys(
    D.ABILITIES,
  )
    .map((ab) => option(`check:${ab}:save`, lbl(ctx, D.checkName(ab, "save"))))
    .join("")}</optgroup><optgroup label="${ctx.t("Abilità", "Skills")}">${skillsSorted(ctx)
    .map((sk) =>
      option(
        `check:${sk.ability}:skill:${sk.id}`,
        lbl(ctx, D.checkName(sk.ability, "skill", sk.id)),
      ),
    )
    .join("")}</optgroup>`;
}
const stepValue = (ctx, step) =>
  step.kind === "custom"
    ? `custom:${step.customId}`
    : step.kind === "check"
      ? `check:${step.ability}:${step.type}${step.type === "skill" ? `:${step.skill}` : ""}`
      : `roll:${step.formula}:${lbl(ctx, step.label ?? step.formula)}`;
function parseStepValue(value) {
  if (!value) return null;
  const [kind, a, ...rest] = value.split(":");
  if (kind === "custom") return { kind, customId: a };
  if (kind === "check")
    return rest[0] === "skill"
      ? { kind, ability: a, type: "skill", skill: rest[1] }
      : { kind, ability: a, type: rest[0] };
  if (kind === "roll") return { kind, formula: a, label: rest.join(":") || a };
  return null;
}
function stepsFields(ctx, slice, actorId, steps = []) {
  return `<fieldset class="qb-seq"><legend>${ctx.t(`Passi in ordine (da 2 a ${D.MAX_STEPS})`, `Steps in order (2 to ${D.MAX_STEPS})`)}</legend>${Array.from(
    { length: D.MAX_STEPS },
    (_, i) =>
      `<label class="field qb-seq-step"><span>${ctx.t("Passo", "Step")} ${i + 1}</span><select name="step${i}" data-qb-seq-step>${stepOptions(ctx, slice, actorId, steps[i] ? stepValue(ctx, steps[i]) : "")}</select></label>`,
  ).join(
    "",
  )}<p class="muted">${ctx.t("Un'azione personalizzata vale due passi: tiro per colpire, poi danni. Ogni passo controlla i permessi quando tocca a lui (turno, Azione, Incapacitato).", "A custom action counts as two steps: attack roll, then damage. Each step checks its permissions when its turn comes (turn, Action, Incapacitated).")}</p></fieldset>`;
}
const readSteps = (data) =>
  Array.from({ length: D.MAX_STEPS }, (_, i) =>
    parseStepValue(String(data.get(`step${i}`) ?? "")),
  ).filter(Boolean);
function formulaStatus(ctx, value) {
  const parsed = D.parseFormula(value);
  return parsed.ok
    ? `<span class="qb-ok">${ctx.t("Valida", "Valid")}: ${esc(ctx, parsed.text.replace(/([+-])/g, " $1 "))}${parsed.d20 ? ` · ${ctx.t("prova con d20 (vantaggio e svantaggio si applicano)", "d20 test (advantage and disadvantage apply)")}` : ""}</span>`
    : `<span class="qb-bad">${text(ctx, parsed.error)}</span>`;
}
function bindFormula(form) {
  const input = form?.querySelector("[data-qb-formula]");
  const out = form?.querySelector("[data-qb-formula-status]");
  if (!input || !out) return;
  const update = () => {
    const ctx = area.ctx;
    out.innerHTML = formulaStatus(ctx, input.value);
    input.setAttribute("aria-invalid", String(!D.parseFormula(input.value).ok));
  };
  input.addEventListener("input", update);
  update();
}
/** "+" or an empty slot: sheet actions, custom actions, checks, a new saved roll or sequence. */
export function openAdd(ctx, actorId, { index = null, preset = "" } = {}) {
  const slice = sliceOf(ctx.state);
  const actor = ctx.state.actors[actorId];
  const page = pageIndex(ctx, slice, actorId);
  const bar = D.barOf(slice, ctx.role, actorId);
  const free = bar.pages[page].slots.map((s, i) => (s ? null : i)).filter((i) => i !== null);
  const at = index ?? free[0] ?? null;
  const items = D.availableItems(ctx.state, slice, actorId);
  const groups = [
    ["custom", ctx.t("Azioni personalizzate", "Custom actions")],
    ["sheet", ctx.t("Azioni della scheda", "Sheet actions")],
    ["features", ctx.t("Capacità di classe", "Class features")],
    ["checks", ctx.t("Prove", "Checks")],
    ["saves", ctx.t("Tiri salvezza", "Saving throws")],
    ["skills", ctx.t("Abilità", "Skills")],
  ];
  const inGroup = (id) => {
    const list = items.filter((item) => item.group === id);
    return id === "skills" ? list.sort(byName(ctx)) : list;
  };
  // The first item in the order shown is chosen (custom actions first, as the tray).
  const shown = groups.flatMap(([id]) => inGroup(id));
  const radio = (value, name, detail = "", checked = false) =>
    `<label class="qb-option"><input type="radio" name="item" value="${esc(ctx, value)}" ${checked ? "checked" : ""}><span>${name}${detail ? ` <small>${detail}</small>` : ""}</span></label>`;
  const first = preset ? `new:${preset}` : "";
  const body = `<p class="muted">${esc(ctx, actor.name)} · ${ctx.t("pagina", "page")} ${page + 1}: ${text(ctx, bar.pages[page].name)}</p><fieldset class="qb-choose"><legend>${ctx.t("Cosa aggiungere", "What to add")}</legend>${groups
    .map(([id, title]) => {
      const list = inGroup(id);
      return list.length
        ? `<p class="qb-group-title">${esc(ctx, title)}</p>${list
            .map((item) =>
              radio(
                item.key,
                text(ctx, item.name),
                item.detail ? text(ctx, item.detail) : "",
                !first && item.key === shown[0]?.key,
              ),
            )
            .join("")}`
        : "";
    })
    .join(
      "",
    )}<p class="qb-group-title">${ctx.t("Nuovo", "New")}</p>${radio("new:roll", ctx.t("Tiro salvato (formula)", "Saved roll (formula)"), "", preset === "roll")}${radio("new:sequence", ctx.t("Sequenza di passi", "Sequence of steps"), "", preset === "sequence")}</fieldset><div data-qb-new-roll ${preset === "roll" ? "" : "hidden"}><div class="form-grid"><label class="field">${ctx.t("Nome del tiro", "Roll name")}<input name="rollName" maxlength="${D.MAX_LABEL}" data-qb-roll-name></label><label class="field">${ctx.t("Formula", "Formula")}<input name="formula" maxlength="40" placeholder="1d20+5" autocomplete="off" data-qb-formula></label></div><p class="qb-formula-status" data-qb-formula-status aria-live="polite"></p></div><div data-qb-new-sequence ${preset === "sequence" ? "" : "hidden"}><label class="field">${ctx.t("Nome della sequenza", "Sequence name")}<input name="seqName" maxlength="${D.MAX_LABEL}" data-qb-seq-name></label>${stepsFields(ctx, slice, actorId)}</div><div class="form-grid"><label class="field">${ctx.t("Casella", "Slot")}<select name="index" data-qb-add-index>${bar.pages[
    page
  ].slots
    .map((s, i) =>
      s ? "" : `<option value="${i}" ${i === at ? "selected" : ""}>${D.KEYS[i]}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="field">${ctx.t("Nome sulla barra (facoltativo)", "Name on the bar (optional)")}<input name="label" maxlength="${D.MAX_LABEL}" data-qb-add-label></label></div>${colorField(ctx, "gold")}`;
  if (!free.length) {
    ctx.toast(
      ctx.t(
        "Questa pagina è piena: libera una casella o aggiungi una pagina dal menu ⋯.",
        "This page is full: free a slot or add a page from the ⋯ menu.",
      ),
      true,
    );
    return;
  }
  ctx.dialog(ctx.t("Aggiungi alla barra rapida", "Add to the quick bar"), body, {
    submitLabel: ctx.t("Aggiungi", "Add"),
    onSubmit: (data) => {
      const choice = String(data.get("item") ?? "");
      if (!choice) throw D.fail("Scegli cosa aggiungere.", "Choose what to add.");
      const slotIndex = Number(data.get("index"));
      const color = String(data.get("color") ?? "gold");
      let item;
      if (choice === "new:roll")
        item = {
          kind: "roll",
          ref: { formula: String(data.get("formula") ?? "") },
          label: String(data.get("rollName") ?? "") || String(data.get("label") ?? ""),
          color,
        };
      else if (choice === "new:sequence")
        item = {
          kind: "sequence",
          ref: { steps: readSteps(data) },
          label: String(data.get("seqName") ?? "") || String(data.get("label") ?? ""),
          color,
        };
      else {
        const found = items.find((x) => x.key === choice);
        if (!found) throw D.fail("Elemento non disponibile.", "Item not available.");
        item = { kind: found.kind, ref: found.ref, label: String(data.get("label") ?? ""), color };
      }
      // Validate before committing so the dialog shows the refusal and stays open.
      D.makeSlot(ctx.state, slice, actorId, item);
      ui.refocus = { index: slotIndex };
      barCommit(ctx, ctx.t("Barra rapida: casella aggiunta", "Quick bar: slot added"), (draft, s) =>
        D.addSlot(draft, s, ctx.role, actorId, item, { page, index: slotIndex }),
      );
    },
  });
  const form = dialogBody()?.querySelector("form");
  if (!form) return;
  const toggle = () => {
    const value = form.querySelector("input[name=item]:checked")?.value ?? "";
    form.querySelector("[data-qb-new-roll]").hidden = value !== "new:roll";
    form.querySelector("[data-qb-new-sequence]").hidden = value !== "new:sequence";
  };
  form
    .querySelectorAll("input[name=item]")
    .forEach((input) => input.addEventListener("change", toggle));
  toggle();
  bindFormula(form);
  if (preset === "roll") form.querySelector("[data-qb-roll-name]")?.focus();
  else if (preset === "sequence") form.querySelector("[data-qb-seq-name]")?.focus();
  else form.querySelector("input[name=item]:checked, input[name=item]")?.focus();
}
/** Adds a tray item to a slot (drag), or the first free slot of the open page (Enter). */
function addItem(ctx, actorId, key, index = null) {
  const slice = sliceOf(ctx.state);
  const item = D.availableItems(ctx.state, slice, actorId).find((x) => x.key === key);
  if (!item) return;
  const page = pageIndex(ctx, slice, actorId);
  try {
    let placed = null;
    barCommit(ctx, ctx.t("Barra rapida: casella aggiunta", "Quick bar: slot added"), (draft, s) => {
      placed = D.addSlot(
        draft,
        s,
        ctx.role,
        actorId,
        { kind: item.kind, ref: item.ref, color: "gold" },
        { page, index },
      );
    });
    ui.refocus = placed ? { index: placed.index } : null;
    ctx.toast(
      ctx.t(
        `${lbl(ctx, item.name)} nella casella ${D.KEYS[placed.index]}.`,
        `${lbl(ctx, item.name)} in slot ${D.KEYS[placed.index]}.`,
      ),
    );
  } catch (error) {
    toastError(ctx, error);
  }
}
/** Roll20 Shift+click / Let's Role right click: name, colour, formula, steps, position. */
export function openEdit(ctx, actorId, slotId) {
  const slice = sliceOf(ctx.state);
  const bar = D.barOf(slice, ctx.role, actorId);
  let pageAt = -1,
    indexAt = -1;
  bar.pages.forEach((p, pi) =>
    p.slots.forEach((s, si) => {
      if (s?.id === slotId) {
        pageAt = pi;
        indexAt = si;
      }
    }),
  );
  if (pageAt < 0) return;
  const slot = bar.pages[pageAt].slots[indexAt];
  const name = lbl(ctx, D.slotName(ctx.state, slice, actorId, slot));
  const status = D.slotStatus(ctx.state, slice, actorId, slot);
  const custom =
    slot.kind === "custom"
      ? D.customActionsOf(slice, actorId).find((a) => a.id === slot.ref.customId)
      : null;
  const detail =
    slot.kind === "roll"
      ? slot.ref.formula
      : slot.kind === "check"
        ? `d20 ${signed(D.checkBonus(ctx.state, actorId, slot.ref.ability, slot.ref.type, slot.ref.skill) ?? 0)}`
        : custom
          ? lbl(ctx, D.customView(ctx.state, actorId, custom).summary)
          : "";
  const labelValue =
    typeof slot.label === "string" ? slot.label : slot.label ? lbl(ctx, slot.label) : "";
  const positions = (pi) =>
    bar.pages[pi].slots
      .map(
        (s, i) =>
          `<option value="${i}" ${pi === pageAt && i === indexAt ? "selected" : ""}>${D.KEYS[i]}${s && s.id !== slotId ? ` · ${ctx.t("scambia con", "swap with")} ${esc(ctx, lbl(ctx, D.slotName(ctx.state, slice, actorId, s)))}` : s ? ` · ${ctx.t("qui ora", "here now")}` : ` · ${ctx.t("vuota", "empty")}`}</option>`,
      )
      .join("");
  const body = `<p class="muted">${text(ctx, D.slotKindName(slot.kind))}${detail ? ` · ${esc(ctx, detail)}` : ""}${status.available ? "" : ` · <span class="qb-bad">${text(ctx, status.reason)}</span>`}</p><label class="field">${ctx.t("Nome", "Name")}<input name="label" maxlength="${D.MAX_LABEL}" value="${esc(ctx, labelValue)}" placeholder="${esc(ctx, name)}" data-qb-edit-label ${["roll", "sequence"].includes(slot.kind) ? "required" : ""}></label>${colorField(ctx, slot.color)}${slot.kind === "roll" ? `<label class="field">${ctx.t("Formula", "Formula")}<input name="formula" maxlength="40" value="${esc(ctx, slot.ref.formula)}" autocomplete="off" data-qb-formula></label><p class="qb-formula-status" data-qb-formula-status aria-live="polite"></p>` : ""}${slot.kind === "sequence" ? stepsFields(ctx, slice, actorId, slot.ref.steps) : ""}<div class="form-grid"><label class="field">${ctx.t("Pagina", "Page")}<select name="page" data-qb-edit-page>${bar.pages.map((p, i) => `<option value="${i}" ${i === pageAt ? "selected" : ""}>${i + 1} · ${text(ctx, p.name)}</option>`).join("")}</select></label><label class="field">${ctx.t("Casella", "Slot")}<select name="index" data-qb-edit-index>${positions(pageAt)}</select></label></div><p class="muted">${ctx.t("Una casella occupata si scambia con questa.", "An occupied slot swaps with this one.")}</p><button type="button" class="button danger" data-qb-remove>${ctx.t("Rimuovi dalla barra", "Remove from the bar")}</button>`;
  ctx.dialog(
    ctx.t(`Modifica casella ${D.KEYS[indexAt]}: ${name}`, `Edit slot ${D.KEYS[indexAt]}: ${name}`),
    body,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (data) => {
        const patch = {
          label: String(data.get("label") ?? ""),
          color: String(data.get("color") ?? slot.color),
        };
        if (slot.kind === "roll") patch.formula = String(data.get("formula") ?? "");
        if (slot.kind === "sequence") patch.steps = readSteps(data);
        const target = { page: Number(data.get("page")), index: Number(data.get("index")) };
        ui.refocus =
          target.page === pageIndex(ctx, slice, actorId)
            ? { index: target.index }
            : { index: indexAt };
        barCommit(
          ctx,
          ctx.t("Barra rapida: casella modificata", "Quick bar: slot edited"),
          (draft, s) => {
            D.updateSlot(draft, s, ctx.role, actorId, slotId, patch);
            D.moveSlot(draft, s, ctx.role, actorId, slotId, target);
          },
        );
      },
    },
  );
  const form = dialogBody()?.querySelector("form");
  if (!form) return;
  bindFormula(form);
  const pageSelect = form.querySelector("[data-qb-edit-page]");
  pageSelect?.addEventListener("change", () => {
    form.querySelector("[data-qb-edit-index]").innerHTML = positions(Number(pageSelect.value));
  });
  form.querySelector("[data-qb-remove]")?.addEventListener("click", () => {
    ctx.closeDialog();
    ui.refocus = { index: indexAt };
    try {
      barCommit(
        ctx,
        ctx.t("Barra rapida: casella rimossa", "Quick bar: slot removed"),
        (draft, s) => D.removeSlot(draft, s, ctx.role, actorId, slotId),
      );
    } catch (error) {
      toastError(ctx, error);
    }
  });
  form.querySelector("[data-qb-edit-label]")?.focus();
}
function moveBy(ctx, actorId, slotId, index) {
  const slice = sliceOf(ctx.state);
  const page = pageIndex(ctx, slice, actorId);
  try {
    let moved = false;
    ui.refocus = { index };
    barCommit(ctx, ctx.t("Barra rapida: casella spostata", "Quick bar: slot moved"), (draft, s) => {
      moved = D.moveSlot(draft, s, ctx.role, actorId, slotId, { page, index });
    });
    return moved;
  } catch (error) {
    toastError(ctx, error);
    return false;
  }
}

// ------------------------------------------------------------------ bar menu (⋯)

function historyHTML(ctx, slice, actorId) {
  const rows = rollsOf(ctx.state)
    .rolls.filter((r) => r.by === ctx.role && r.actorId === actorId)
    .slice(-12)
    .reverse();
  if (!rows.length)
    return `<p class="muted">${ctx.t("Nessun tiro dalla barra.", "No roll from the bar yet.")}</p>`;
  const names = {
    accepted: ctx.t("accettato", "accepted"),
    reused: ctx.t("facce riusate dopo l'annullo", "faces reused after undo"),
    corrected: ctx.t("corretto", "corrected"),
    withdrawn: ctx.t(
      "annullato: le facce restano e un nuovo tiro digitale uguale le riusa una volta",
      "undone: the faces stay and an identical new digital roll reuses them once",
    ),
  };
  return `<ol class="qb-history" data-qb-history>${rows
    .map((r) => {
      const status = D.rollStatus(slice, r);
      return `<li class="is-${status}" data-qb-history-roll="${esc(ctx, r.id)}" data-qb-history-status="${status}"><span>${esc(ctx, D.rollLine(r, ctx.lang))}</span><small>${r.mode === "physical" ? ctx.t("fisico", "physical") : ctx.t("digitale", "digital")} · ${names[status] ?? status}${r.corrections?.length ? ` · ${ctx.t("prima", "before")}: [${r.corrections.at(-1).values.join(", ")}] — ${esc(ctx, r.corrections.at(-1).reason)}` : ""}</small></li>`;
    })
    .join("")}</ol>`;
}
export function openMenu(ctx, actorId) {
  const slice = sliceOf(ctx.state);
  const actor = ctx.state.actors[actorId];
  const bar = D.barOf(slice, ctx.role, actorId);
  const page = pageIndex(ctx, slice, actorId);
  const prefs = prefsFor(ctx.role);
  const current = bar.pages[page];
  const pagesHTML = bar.pages
    .map(
      (p, i) =>
        `<li class="${i === page ? "is-current" : ""}"><div class="qb-all-head"><strong>${i + 1} · ${text(ctx, p.name)}</strong>${p.sharedFrom ? `<small>${ctx.t("copia da", "copy from")} ${esc(ctx, sharedByName(ctx, p.sharedFrom))}</small>` : ""}<button type="button" class="button quiet qb-small" data-qb-m-open="${i}" ${i === page ? 'aria-current="true"' : ""}>${i === page ? ctx.t("Aperta", "Open") : ctx.t("Apri", "Open")}</button></div><p class="qb-all-row">${p.slots.map((s, si) => `<span class="qb-mini${s ? ` qb-c-${s.color}` : ""}">${D.KEYS[si]}${s ? " " + esc(ctx, lbl(ctx, D.slotName(ctx.state, slice, actorId, s))) : ""}</span>`).join("")}</p></li>`,
    )
    .join("");
  const body = `<div class="qb-menu"><section><h3>${ctx.t("Dadi della barra", "Bar dice")}</h3><div class="form-grid"><label class="field">${ctx.t("Dadi", "Dice")}<select data-qb-m-dice><option value="digital" ${prefs.dice === "digital" ? "selected" : ""}>${ctx.t("Digitali", "Digital")}</option><option value="physical" ${prefs.dice === "physical" ? "selected" : ""}>${ctx.t("Fisici", "Physical")}</option></select></label><label class="field">d20<select data-qb-m-d20><option value="normal" ${prefs.d20 === "normal" ? "selected" : ""}>${ctx.t("Normale", "Normal")}</option><option value="advantage" ${prefs.d20 === "advantage" ? "selected" : ""}>${ctx.t("Vantaggio", "Advantage")}</option><option value="disadvantage" ${prefs.d20 === "disadvantage" ? "selected" : ""}>${ctx.t("Svantaggio", "Disadvantage")}</option></select></label>${ctx.role === "dm" ? `<label class="field">${ctx.t("Chi vede", "Who sees")}<select data-qb-m-hidden><option value="shared" ${prefs.hidden ? "" : "selected"}>${ctx.t("Tutti", "Everyone")}</option><option value="hidden" ${prefs.hidden ? "selected" : ""}>${ctx.t("Solo il DM", "DM only")}</option></select></label>` : ""}</div></section><section><h3>${ctx.t("Pagina", "Page")} ${page + 1}: ${text(ctx, current.name)}</h3><div class="qb-menu-row"><label class="field">${ctx.t("Nome della pagina", "Page name")}<input maxlength="${D.MAX_LABEL}" value="${text(ctx, current.name)}" data-qb-m-name></label><button type="button" class="button" data-qb-m="rename">${ctx.t("Rinomina", "Rename")}</button></div><div class="toolbar qb-menu-actions"><button type="button" class="button" data-qb-m="new-page" ${bar.pages.length >= D.MAX_PAGES ? 'disabled aria-describedby="qb-why-full"' : ""}>${ctx.icon("plus")} ${ctx.t("Nuova pagina", "New page")}</button><button type="button" class="button" data-qb-m="share">${ctx.t("Condividi una copia…", "Share a copy…")}</button><button type="button" class="button" data-qb-m="text">${ctx.t("Copia come testo…", "Copy as text…")}</button><button type="button" class="button" data-qb-m="import" ${bar.pages.length >= D.MAX_PAGES ? 'disabled aria-describedby="qb-why-full"' : ""}>${ctx.t("Importa da testo…", "Import from text…")}</button><button type="button" class="button danger" data-qb-m="delete-page" ${bar.pages.length < 2 ? 'disabled aria-describedby="qb-why-last"' : ""}>${ctx.t("Elimina pagina…", "Delete page…")}</button></div>${bar.pages.length >= D.MAX_PAGES ? `<p class="muted qb-why" id="qb-why-full">${ctx.t(`La barra ha già ${D.MAX_PAGES} pagine, il massimo. Elimina una pagina per aggiungerne o importarne un’altra.`, `The bar already has ${D.MAX_PAGES} pages, the maximum. Delete a page to add or import another.`)}</p>` : ""}${bar.pages.length < 2 ? `<p class="muted qb-why" id="qb-why-last">${ctx.t("È l’unica pagina: la barra ne conserva sempre una. Aggiungine un’altra prima di eliminarla.", "It is the only page: the bar always keeps one. Add another before deleting it.")}</p>` : ""}</section><section><h3>${ctx.t("Tutte le pagine", "All pages")}</h3><ol class="qb-all">${pagesHTML}</ol></section><section><h3>${ctx.t("Cronologia dei tiri della barra", "Bar roll history")}</h3>${historyHTML(ctx, slice, actorId)}</section><p class="muted qb-keys-help">${ctx.t("Tasti: 1–0 usano le caselle della pagina aperta; Alt+1…5 aprono le pagine; nella barra, frecce per muoversi, Maiusc+F10 per modificare. Maiusc+clic, clic destro o pressione lunga modificano una casella.", "Keys: 1–0 use the open page's slots; Alt+1…5 open pages; in the bar, arrows move, Shift+F10 edits. Shift+click, right click or a long press edit a slot.")}</p></div>`;
  ctx.dialog(ctx.t(`Barra rapida · ${actor.name}`, `Quick bar · ${actor.name}`), body, {
    cancelLabel: ctx.t("Chiudi", "Close"),
  });
  const form = dialogBody()?.querySelector("form");
  if (!form) return;
  const reopen = () => openMenu(ctx, actorId);
  form.querySelector("[data-qb-m-dice]")?.addEventListener("change", (e) => {
    remember(ctx.role, { dice: e.target.value });
    ctx.render();
  });
  form.querySelector("[data-qb-m-d20]")?.addEventListener("change", (e) => {
    remember(ctx.role, { d20: e.target.value });
    ctx.render();
  });
  form.querySelector("[data-qb-m-hidden]")?.addEventListener("change", (e) => {
    remember(ctx.role, { hidden: e.target.value === "hidden" });
    ctx.render();
  });
  form.querySelectorAll("[data-qb-m-open]").forEach((button) =>
    button.addEventListener("click", () => {
      setPage(ctx, actorId, Number(button.dataset.qbMOpen));
      ctx.closeDialog();
      ctx.render();
    }),
  );
  form.querySelectorAll("[data-qb-m]").forEach((button) =>
    button.addEventListener("click", () => {
      const action = button.dataset.qbM;
      try {
        if (action === "rename") {
          const name = form.querySelector("[data-qb-m-name]").value;
          barCommit(
            ctx,
            ctx.t("Barra rapida: pagina rinominata", "Quick bar: page renamed"),
            (draft, s) => D.renamePage(draft, s, ctx.role, actorId, page, name),
          );
          reopen();
        } else if (action === "new-page") {
          let index = 0;
          barCommit(ctx, ctx.t("Barra rapida: nuova pagina", "Quick bar: new page"), (draft, s) => {
            index = D.addPage(
              draft,
              s,
              ctx.role,
              actorId,
              ctx.t(`Pagina ${bar.pages.length + 1}`, `Page ${bar.pages.length + 1}`),
            );
          });
          setPage(ctx, actorId, index);
          ctx.render();
          reopen();
        } else if (action === "delete-page") deletePageDialog(ctx, actorId, page);
        else if (action === "share") shareDialog(ctx, actorId, page);
        else if (action === "text") textDialog(ctx, actorId, page);
        else if (action === "import") importDialog(ctx, actorId);
      } catch (error) {
        toastError(ctx, error);
      }
    }),
  );
}
export function deletePageDialog(ctx, actorId, page) {
  const slice = sliceOf(ctx.state);
  const current = D.barOf(slice, ctx.role, actorId).pages[page];
  const filled = current.slots.filter(Boolean).length;
  ctx.dialog(
    ctx.t("Elimina pagina", "Delete page"),
    `<p>${esc(ctx, ctx.t(`La pagina «${lbl(ctx, current.name)}» e le sue ${filled} caselle spariscono dalla barra. Annulla ultima modifica la ripristina.`, `The page “${lbl(ctx, current.name)}” and its ${filled} slots leave the bar. Undo last change brings it back.`))}</p>`,
    {
      submitLabel: ctx.t("Elimina pagina", "Delete page"),
      onSubmit: () => {
        barCommit(
          ctx,
          ctx.t("Barra rapida: pagina eliminata", "Quick bar: page deleted"),
          (draft, s) => D.removePage(draft, s, ctx.role, actorId, page),
        );
        setPage(ctx, actorId, Math.max(0, page - 1));
        ctx.render();
      },
    },
  );
}
export function shareDialog(ctx, actorId, page) {
  const slice = sliceOf(ctx.state);
  const targets = D.shareTargets(ctx.state, ctx.role, actorId);
  const preview = D.sharePreview(ctx.state, slice, ctx.role, actorId, page);
  const who = (actor) => {
    const ids = [actor.owner, ...(actor.controllers ?? [])].filter(Boolean);
    return ids
      .map((id) =>
        id === "dm" ? "DM" : id === ctx.role ? ctx.t("tu", "you") : ctx.t("Giocatore", "Player"),
      )
      .join(", ");
  };
  const list = (rows, empty) =>
    rows.length
      ? `<ul class="qb-share-list">${rows.map((r) => `<li>${text(ctx, r.name)}${r.reason ? ` <small>— ${text(ctx, r.reason)}</small>` : ""}</li>`).join("")}</ul>`
      : `<p class="muted">${empty}</p>`;
  if (!targets.length) {
    ctx.toast(
      ctx.t(
        "Nessun altro personaggio della campagna a cui condividere.",
        "No other campaign character to share with.",
      ),
      true,
    );
    return;
  }
  ctx.dialog(
    ctx.t(
      `Condividi una copia di «${lbl(ctx, preview.page.name)}»`,
      `Share a copy of “${lbl(ctx, preview.page.name)}”`,
    ),
    `<p class="muted">${ctx.t("Come i pannelli di Dice+: chi riceve trova una pagina nuova nella barra di quel personaggio. È una copia: le modifiche successive, tue o sue, non viaggiano. Le prove leggono la scheda di chi riceve.", "Like Dice+ panels: the recipient finds a new page on that character's bar. It is a copy: later edits, yours or theirs, do not travel. Checks read the recipient's sheet.")}</p><fieldset class="qb-choose"><legend>${ctx.t("Con chi", "With whom")}</legend>${targets
      .map(
        (actor, i) =>
          `<label class="qb-option"><input type="radio" name="target" value="${esc(ctx, actor.id)}" ${i === 0 ? "checked" : ""}><span>${esc(ctx, actor.name)} <small>${ctx.t("gioca", "played by")}: ${esc(ctx, who(actor))}</small></span></label>`,
      )
      .join(
        "",
      )}</fieldset><h3>${ctx.t("Si copiano", "Copied")}</h3>${list(preview.copied, ctx.t("Niente da copiare.", "Nothing to copy."))}<h3>${ctx.t("Restano qui", "Stay here")}</h3>${list(preview.skipped, ctx.t("Nessuna esclusione.", "Nothing left out."))}`,
    {
      submitLabel: ctx.t("Condividi la copia", "Share the copy"),
      onSubmit: (data) => {
        const targetId = String(data.get("target") ?? "");
        const target = ctx.state.actors[targetId];
        let result = null;
        ctx.commit(
          ctx.t(
            `Barra rapida: copia della pagina «${lbl(ctx, preview.page.name)}» condivisa con ${target?.name}`,
            `Quick bar: copy of the page “${lbl(ctx, preview.page.name)}” shared with ${target?.name}`,
          ),
          (draft) => {
            result = D.sharePage(
              draft,
              area.slice(draft),
              ctx.role,
              actorId,
              page,
              targetId,
              new Date().toISOString(),
            );
          },
        );
        ctx.toast(
          ctx.t(
            `Copia condivisa con ${target?.name}: ${result.copied.length} caselle.`,
            `Copy shared with ${target?.name}: ${result.copied.length} slots.`,
          ),
        );
      },
    },
  );
}
function textDialog(ctx, actorId, page) {
  const slice = sliceOf(ctx.state);
  const value = D.pageText(ctx.state, slice, ctx.role, actorId, page, ctx.lang);
  ctx.dialog(
    ctx.t("Copia come testo", "Copy as text"),
    `<p class="muted">${ctx.t("I tiri salvati della pagina, una riga ciascuno: incollali in «Importa da testo» su un'altra barra.", "The page's saved rolls, one per line: paste them into “Import from text” on another bar.")}</p><label class="field">${ctx.t("Testo", "Text")}<textarea readonly rows="6" data-qb-text>${esc(ctx, value)}</textarea></label>${value ? "" : `<p class="muted">${ctx.t("Nessun tiro salvato in questa pagina.", "No saved roll on this page.")}</p>`}<button type="button" class="button" data-qb-copy>${ctx.t("Copia negli appunti", "Copy to clipboard")}</button>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const form = dialogBody()?.querySelector("form");
  form?.querySelector("[data-qb-copy]")?.addEventListener("click", async () => {
    const box = form.querySelector("[data-qb-text]");
    box.select();
    try {
      await globalThis.navigator?.clipboard?.writeText(box.value);
      ctx.toast(ctx.t("Testo copiato.", "Text copied."));
    } catch {
      ctx.toast(
        ctx.t(
          "Testo selezionato: copialo con Ctrl/Cmd+C.",
          "Text selected: copy it with Ctrl/Cmd+C.",
        ),
      );
    }
  });
}
function importDialog(ctx, actorId) {
  ctx.dialog(
    ctx.t("Importa da testo", "Import from text"),
    `<p class="muted">${ctx.t("Una riga per tiro: «Nome = formula» (per esempio «Percezione = 1d20+5»). Diventa una pagina nuova.", "One line per roll: “Name = formula” (for example “Perception = 1d20+5”). It becomes a new page.")}</p><label class="field">${ctx.t("Nome della pagina", "Page name")}<input name="name" maxlength="${D.MAX_LABEL}" required></label><label class="field">${ctx.t("Testo", "Text")}<textarea name="text" rows="6" required data-qb-import-text></textarea></label>`,
    {
      submitLabel: ctx.t("Importa", "Import"),
      onSubmit: (data) => {
        let index = 0;
        barCommit(
          ctx,
          ctx.t("Barra rapida: pagina importata", "Quick bar: page imported"),
          (draft, s) => {
            index = D.importPage(
              draft,
              s,
              ctx.role,
              actorId,
              String(data.get("name") ?? ""),
              String(data.get("text") ?? ""),
            );
          },
        );
        setPage(ctx, actorId, index);
        ctx.render();
      },
    },
  );
}

// ------------------------------------------------------------------ dock binding

function bindDrag(el, ctx, actorId) {
  let drag = null;
  let press = null;
  const cleanup = () => {
    drag?.ghost?.remove();
    el.querySelectorAll(".is-drop").forEach((n) => n.classList.remove("is-drop"));
    el.querySelector(".qb")?.classList.remove("is-dragging");
    drag = null;
  };
  const targetAt = (x, y) => {
    const hit = globalThis.document?.elementFromPoint(x, y)?.closest?.("[data-qb-drop]");
    return hit && el.contains(hit) ? hit : null;
  };
  el.addEventListener("pointerdown", (e) => {
    // A new press is a new gesture: only the click that ends a drag or a long press is eaten.
    ui.ignoreClickUntil = 0;
    const source = e.target.closest?.("[data-qb-drag]");
    if (!source || (e.pointerType === "mouse" && e.button !== 0)) return;
    // Touch drags while customising; outside it a tap runs and a long press edits.
    if (e.pointerType !== "mouse" && source.dataset.qbSlot && !ui.editing) {
      clearTimeout(press?.timer);
      press = {
        x: e.clientX,
        y: e.clientY,
        id: e.pointerId,
        timer: setTimeout(() => {
          ui.ignoreClickUntil = Date.now() + 800;
          press = null;
          openEdit(ctx, actorId, source.dataset.qbSlot);
        }, 550),
      };
      return;
    }
    if (e.pointerType !== "mouse" && !ui.editing) return;
    drag = { source, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, ghost: null };
  });
  el.addEventListener("pointermove", (e) => {
    if (
      press &&
      e.pointerId === press.id &&
      Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8
    ) {
      clearTimeout(press.timer);
      press = null;
    }
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      drag.moved = true;
      try {
        drag.source.setPointerCapture?.(e.pointerId);
      } catch {
        /* pointer already released */
      }
      const ghost = drag.source.cloneNode(true);
      ghost.className = drag.source.className + " qb-ghost";
      ghost.removeAttribute("data-qb-drop");
      ghost.setAttribute("aria-hidden", "true");
      el.querySelector(".qb")?.append(ghost);
      el.querySelector(".qb")?.classList.add("is-dragging");
      drag.ghost = ghost;
    }
    e.preventDefault();
    drag.ghost.style.left = `${e.clientX - 30}px`;
    drag.ghost.style.top = `${e.clientY - 22}px`;
    el.querySelectorAll(".is-drop").forEach((n) => n.classList.remove("is-drop"));
    const target = targetAt(e.clientX, e.clientY);
    if (target && target !== drag.source) target.classList.add("is-drop");
  });
  const finish = (e) => {
    if (press && e.pointerId === press.id) {
      clearTimeout(press.timer);
      press = null;
    }
    if (!drag || e.pointerId !== drag.id) return;
    const { source, moved } = drag;
    const target = moved ? targetAt(e.clientX, e.clientY) : null;
    cleanup();
    if (!moved) return;
    ui.ignoreClickUntil = Date.now() + 400;
    if (!target || target === source) return;
    const index = Number(target.dataset.qbIndex);
    if (source.dataset.qbItem) {
      if (target.dataset.qbSlot) {
        ctx.toast(
          ctx.t(
            "Casella occupata: trascina su una casella vuota.",
            "Slot taken: drop on an empty slot.",
          ),
          true,
        );
        return;
      }
      addItem(ctx, actorId, source.dataset.qbItem, index);
    } else if (source.dataset.qbSlot) moveBy(ctx, actorId, source.dataset.qbSlot, index);
  };
  el.addEventListener("pointerup", finish);
  el.addEventListener("pointercancel", (e) => {
    if (press && e.pointerId === press.id) {
      clearTimeout(press.timer);
      press = null;
    }
    if (drag && e.pointerId === drag.id) cleanup();
  });
}
export function bindDock(el, ctx, table) {
  tableRef = table;
  const section = el.querySelector("[data-qb]");
  if (!section) return;
  const actorId = section.dataset.qbActor;
  if (section.classList.contains("qb-observer")) return;
  const slice = sliceOf(ctx.state);
  bindDrag(el, ctx, actorId);
  el.addEventListener("contextmenu", (e) => {
    const slot = e.target.closest?.("[data-qb-slot]");
    if (!slot) return;
    e.preventDefault();
    if (Date.now() < ui.ignoreClickUntil) return;
    openEdit(ctx, actorId, slot.dataset.qbSlot);
  });
  el.addEventListener("click", (e) => {
    const target = e.target.closest?.("button");
    if (!target || !el.contains(target)) return;
    if (Date.now() < ui.ignoreClickUntil && target.closest("[data-qb-drag]")) {
      e.preventDefault();
      return;
    }
    const d = target.dataset;
    if (d.qbSlot) {
      if (e.shiftKey || ui.editing) openEdit(ctx, actorId, d.qbSlot);
      else useSlot(ctx, table, actorId, d.qbSlot);
    } else if ("qbEmpty" in d) openAdd(ctx, actorId, { index: Number(d.qbIndex) });
    else if ("qbAdd" in d) openAdd(ctx, actorId);
    else if (d.qbPage) {
      const count = D.barOf(slice, ctx.role, actorId).pages.length;
      const page = pageIndex(ctx, slice, actorId);
      setPage(ctx, actorId, (page + (d.qbPage === "next" ? 1 : count - 1)) % count);
      ui.refocus = { selector: `[data-qb-page="${d.qbPage}"]` };
      ctx.render();
    } else if ("qbMenu" in d) openMenu(ctx, actorId);
    else if ("qbItems" in d) openItems(ctx, actorId);
    else if ("qbEdit" in d) {
      ui.editing = !ui.editing;
      ui.refocus = { selector: "[data-qb-edit]" };
      ctx.render();
    } else if ("qbEditDone" in d) {
      ui.editing = false;
      ui.refocus = { selector: "[data-qb-edit]" };
      ctx.render();
    } else if (d.qbItem) addItem(ctx, actorId, d.qbItem);
    else if (d.qbNew) openAdd(ctx, actorId, { preset: d.qbNew });
    else if ("qbCustomSheet" in d) ctx.openSheet(actorId, "actions");
    else if ("qbRunNext" in d) nextStep(ctx, actorId);
    else if ("qbRunStop" in d) stopDialog(ctx, actorId);
    else if ("qbRunClose" in d) {
      const run = D.latestRun(slice, ctx.role, actorId);
      if (run)
        remember(ctx.role, { dismissed: [...prefsFor(ctx.role).dismissed, run.id].slice(-40) });
      ctx.render();
    } else if (d.qbCorrect) correctDialog(ctx, d.qbCorrect);
  });
  el.querySelector("[data-qb-dice]")?.addEventListener("change", (e) => {
    remember(ctx.role, { dice: e.target.value });
    ui.refocus = { selector: "[data-qb-dice]" };
    ctx.render();
  });
  el.querySelector("[data-qb-d20]")?.addEventListener("change", (e) => {
    remember(ctx.role, { d20: e.target.value });
    ui.refocus = { selector: "[data-qb-d20]" };
    ctx.render();
  });
  el.querySelector("[data-qb-hidden]")?.addEventListener("click", () => {
    remember(ctx.role, { hidden: !prefsFor(ctx.role).hidden });
    ui.refocus = { selector: "[data-qb-hidden]" };
    ctx.render();
  });
  // WAI-ARIA toolbar: one tab stop, arrows move between slots, Shift+F10 edits; Alt+1–5
  // by key code too (macOS Option+digit types a symbol, so the shell's key misses it).
  const slots = el.querySelector("[data-qb-slots]");
  slots?.addEventListener("keydown", (e) => {
    const buttons = [...slots.querySelectorAll(".qb-slot")];
    const i = buttons.indexOf(globalThis.document?.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === "ArrowRight") next = (i + 1) % buttons.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + buttons.length) % buttons.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = buttons.length - 1;
    else if ((e.key === "F10" && e.shiftKey) || e.key === "ContextMenu") {
      e.preventDefault();
      e.stopPropagation();
      if (buttons[i].dataset.qbSlot) openEdit(ctx, actorId, buttons[i].dataset.qbSlot);
      else openAdd(ctx, actorId, { index: i });
      return;
    }
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    buttons.forEach((b, n) => b.setAttribute("tabindex", n === next ? "0" : "-1"));
    buttons[next].focus();
  });
  el.addEventListener("keydown", (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || !/^Digit[1-5]$/.test(e.code ?? "")) return;
    if (e.key && /^[1-5]$/.test(e.key)) return; // the shell's command handles it
    e.preventDefault();
    openPage(ctx, Number(e.code.slice(5)) - 1);
  });
  // Keyboard focus survives the re-render that follows a change (a slot, a control).
  const refocus = ui.refocus;
  ui.refocus = null;
  if (refocus) {
    const active = globalThis.document?.activeElement;
    if (!active || active === globalThis.document.body) {
      const target = refocus.selector
        ? el.querySelector(refocus.selector)
        : el.querySelector(`.qb-slot[data-qb-index="${refocus.index}"]`);
      target?.focus?.({ preventScroll: true });
    }
  }
}

// ------------------------------------------------------------------ keys (commands)

function currentTable(ctx) {
  if (!tableRef?.root?.isConnected || ctx.view?.page !== "table")
    throw D.fail(
      "Apri il Tavolo per usare la barra rapida.",
      "Open the Table to use the quick bar.",
    );
  return tableRef;
}
export function runKey(ctx, index) {
  const table = currentTable(ctx);
  const actorId = table.selectedActorId;
  const actor = ctx.state.actors[actorId];
  if (!actor || !ctx.canControl(actor))
    throw D.fail(
      "Seleziona una creatura che controlli per usare la sua barra.",
      "Select a creature you control to use its bar.",
    );
  const slice = sliceOf(ctx.state);
  const page = pageIndex(ctx, slice, actorId);
  const slot = D.barOf(slice, ctx.role, actorId).pages[page].slots[index];
  if (!slot) {
    ctx.toast(
      ctx.t(
        `Casella ${D.KEYS[index]} vuota: premi + per aggiungere.`,
        `Slot ${D.KEYS[index]} is empty: press + to add.`,
      ),
    );
    return;
  }
  useSlot(ctx, table, actorId, slot.id);
}
export function openPage(ctx, index) {
  const table = currentTable(ctx);
  const actorId = table.selectedActorId;
  const slice = sliceOf(ctx.state);
  const bar = D.barOf(slice, ctx.role, actorId);
  if (!bar.pages[index]) {
    ctx.toast(
      ctx.t(`La barra non ha la pagina ${index + 1}.`, `The bar has no page ${index + 1}.`),
      true,
    );
    return;
  }
  setPage(ctx, actorId, index);
  ctx.render();
}

// ------------------------------------------------------------------ sheet: custom actions

function customForm(ctx, actorId, action = null) {
  const templates = D.customTemplates();
  const abilityOptions = (current) =>
    Object.entries(D.ABILITIES)
      .map(
        ([id, name]) =>
          `<option value="${id}" ${id === current ? "selected" : ""}>${text(ctx, name)}</option>`,
      )
      .join("");
  const a = action ?? {
    name: "",
    activation: "action",
    attack: { ability: "str", proficient: true, bonus: 0 },
    damage: { dice: "", ability: true, bonus: 0, type: "slashing" },
    notes: "",
    srdId: "",
  };
  return `<label class="field">${ctx.t("Parti da una voce SRD (facoltativo)", "Start from an SRD entry (optional)")}<select name="template" data-qb-template><option value="">—</option><optgroup label="${ctx.t("Armi", "Weapons")}">${templates
    .filter((t) => t.kind === "weapon")
    .map(
      (t) =>
        `<option value="${t.id}" ${a.srdId === t.id ? "selected" : ""}>${text(ctx, t.name)}</option>`,
    )
    .join(
      "",
    )}</optgroup><optgroup label="${ctx.t("Incantesimi con tiro per colpire", "Spells with an attack roll")}">${templates
    .filter((t) => t.kind === "spell")
    .map(
      (t) =>
        `<option value="${t.id}" ${a.srdId === t.id ? "selected" : ""}>${text(ctx, t.name)}</option>`,
    )
    .join(
      "",
    )}</optgroup></select></label><input type="hidden" name="srdId" value="${esc(ctx, a.srdId ?? "")}"><div class="form-grid"><label class="field">${ctx.t("Nome", "Name")}<input name="name" maxlength="${D.MAX_NAME}" required value="${esc(ctx, a.name)}" data-qb-custom-name></label><label class="field">${ctx.t("Attivazione", "Activation")}<select name="activation">${Object.entries(
    D.ACTIVATIONS,
  )
    .map(
      ([id, name]) =>
        `<option value="${id}" ${a.activation === id ? "selected" : ""}>${text(ctx, name)}</option>`,
    )
    .join(
      "",
    )}</select></label></div><fieldset class="qb-fieldset"><legend><label><input type="checkbox" name="hasAttack" ${a.attack ? "checked" : ""}> ${ctx.t("Mostra come attacco: tiro per colpire", "Display as attack: attack roll")}</label></legend><div class="form-grid"><label class="field">${ctx.t("Caratteristica", "Ability")}<select name="attackAbility">${abilityOptions(a.attack?.ability ?? "str")}</select></label><label class="field">${ctx.t("Bonus aggiuntivo", "Extra bonus")}<input type="number" name="attackBonus" min="-20" max="20" step="1" value="${a.attack?.bonus ?? 0}"></label></div><label class="qb-check"><input type="checkbox" name="proficient" ${a.attack?.proficient !== false ? "checked" : ""}> ${ctx.t("Competente (aggiunge il bonus di competenza)", "Proficient (adds the proficiency bonus)")}</label></fieldset><fieldset class="qb-fieldset"><legend><label><input type="checkbox" name="hasDamage" ${a.damage ? "checked" : ""}> ${ctx.t("Danno", "Damage")}</label></legend><div class="form-grid"><label class="field">${ctx.t("Dadi", "Dice")}<input name="damageDice" maxlength="8" placeholder="1d8" value="${esc(ctx, a.damage?.dice ?? "")}"></label><label class="field">${ctx.t("Bonus", "Bonus")}<input type="number" name="damageBonus" min="-20" max="20" step="1" value="${a.damage?.bonus ?? 0}"></label><label class="field">${ctx.t("Tipo", "Type")}<select name="damageType">${Object.entries(
    D.DAMAGE_TYPES,
  )
    .map(
      ([id, name]) =>
        `<option value="${id}" ${a.damage?.type === id ? "selected" : ""}>${text(ctx, name)}</option>`,
    )
    .join(
      "",
    )}</select></label></div><label class="qb-check"><input type="checkbox" name="damageAbility" ${a.damage?.ability !== false ? "checked" : ""}> ${ctx.t("Aggiungi il modificatore della caratteristica", "Add the ability modifier")}</label></fieldset><label class="field">${ctx.t("Note", "Notes")}<textarea name="notes" maxlength="300" rows="2">${esc(ctx, a.notes ?? "")}</textarea></label><p class="qb-preview" data-qb-custom-preview aria-live="polite"></p>`;
}
function readCustom(data) {
  return {
    name: String(data.get("name") ?? ""),
    activation: String(data.get("activation") ?? ""),
    attack: data.get("hasAttack")
      ? {
          ability: String(data.get("attackAbility") ?? ""),
          proficient: Boolean(data.get("proficient")),
          bonus: Number(data.get("attackBonus") || 0),
        }
      : null,
    damage: data.get("hasDamage")
      ? {
          dice: String(data.get("damageDice") ?? ""),
          ability: Boolean(data.get("damageAbility")),
          bonus: Number(data.get("damageBonus") || 0),
          type: String(data.get("damageType") ?? ""),
        }
      : null,
    notes: String(data.get("notes") ?? ""),
    srdId: String(data.get("srdId") ?? ""),
  };
}
export function openCustom(ctx, actorId, actionId = null) {
  const slice = sliceOf(ctx.state);
  const actor = ctx.state.actors[actorId];
  const existing = actionId
    ? D.customActionsOf(slice, actorId).find((a) => a.id === actionId)
    : null;
  ctx.dialog(
    existing
      ? ctx.t(`Modifica azione: ${existing.name}`, `Edit action: ${existing.name}`)
      : ctx.t(`Nuova azione personalizzata · ${actor.name}`, `New custom action · ${actor.name}`),
    `<p class="muted">${ctx.t("Come «Gestisci personalizzate» di D&D Beyond: un'azione con attivazione, tiro per colpire e danno calcolati dalla scheda. Non applica danni: il DM confronta con la CA e decide.", "Like D&D Beyond's “Manage Custom”: an action with activation, attack roll and damage computed from the sheet. It applies no damage: the DM compares with the AC and decides.")}</p>${customForm(ctx, actorId, existing)}`,
    {
      submitLabel: ctx.t("Salva azione", "Save action"),
      onSubmit: (data) => {
        const input = readCustom(data);
        D.validateCustomAction(input);
        const label = existing
          ? ctx.t(
              `${actor.name}: azione personalizzata «${input.name.trim()}» modificata`,
              `${actor.name}: custom action “${input.name.trim()}” edited`,
            )
          : ctx.t(
              `${actor.name}: azione personalizzata «${input.name.trim()}» creata`,
              `${actor.name}: custom action “${input.name.trim()}” created`,
            );
        ctx.commit(
          label,
          (draft) =>
            D.saveCustomAction(draft, area.slice(draft), ctx.role, actorId, input, {
              id: existing?.id ?? null,
              now: new Date().toISOString(),
            }),
          commitOptions(actor),
        );
      },
    },
  );
  const form = dialogBody()?.querySelector("form");
  if (!form) return;
  const preview = form.querySelector("[data-qb-custom-preview]");
  const update = () => {
    try {
      const input = D.validateCustomAction(readCustom(new FormData(form)));
      preview.innerHTML = `<strong>${esc(ctx, input.name)}</strong> · ${text(ctx, D.ACTIVATIONS[input.activation])} · ${text(ctx, D.customView(ctx.state, actorId, input).summary)}`;
      preview.classList.remove("qb-bad");
    } catch (error) {
      preview.textContent = localized(ctx, error);
      preview.classList.add("qb-bad");
    }
  };
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.querySelector("[data-qb-template]")?.addEventListener("change", (e) => {
    if (!e.target.value) return;
    const t = D.templateAction(ctx.state, actorId, e.target.value);
    form.elements.name.value = lbl(ctx, t.name);
    form.elements.srdId.value = t.srdId;
    form.elements.activation.value = t.activation;
    form.elements.hasAttack.checked = true;
    form.elements.attackAbility.value = t.attack.ability;
    form.elements.proficient.checked = true;
    form.elements.attackBonus.value = "0";
    form.elements.hasDamage.checked = true;
    form.elements.damageDice.value = t.damage.dice;
    form.elements.damageAbility.checked = t.damage.ability;
    form.elements.damageBonus.value = "0";
    form.elements.damageType.value = t.damage.type;
    update();
  });
  update();
  form.querySelector("[data-qb-custom-name]")?.focus();
}
export function renderCustomSection(ctx, actor) {
  const slice = sliceOf(ctx.state);
  if (!slice || !actor) return "";
  const list = D.customActionsOf(slice, actor.id);
  const control = ctx.canControl(ctx.state.actors[actor.id]);
  const rows = list
    .map((a) => {
      const view = D.customView(ctx.state, actor.id, a);
      const source = a.srdId ? D.customTemplates().find((t) => t.id === a.srdId) : null;
      return `<li class="item-row qb-custom-row" data-qb-custom-row="${esc(ctx, a.id)}"><div><strong>${esc(ctx, a.name)}</strong><p class="muted">${text(ctx, D.ACTIVATIONS[a.activation])} · ${text(ctx, view.summary)}${source ? ` · SRD 5.2.1: ${text(ctx, source.name)}` : ` · ${ctx.t("scritta a mano", "hand-written")}`}</p>${a.notes ? `<p class="qb-custom-notes">${esc(ctx, a.notes)}</p>` : ""}</div>${control ? `<div class="toolbar"><button type="button" class="button" data-qb-custom-bar="${esc(ctx, a.id)}">${ctx.icon("plus")} ${ctx.t("Aggiungi alla barra rapida", "Add to the quick bar")}</button><button type="button" class="button quiet" data-qb-custom-edit="${esc(ctx, a.id)}">${ctx.t("Modifica", "Edit")}</button><button type="button" class="button quiet danger" data-qb-custom-remove="${esc(ctx, a.id)}">${ctx.t("Rimuovi…", "Remove…")}</button></div>` : ""}</li>`;
    })
    .join("");
  return `<section class="panel qb-custom" data-qb-custom aria-labelledby="qb-custom-title"><div class="section-heading"><h2 id="qb-custom-title">${ctx.t("Azioni personalizzate", "Custom actions")}</h2>${control ? `<button type="button" class="button" data-qb-custom-new>${ctx.icon("plus")} ${ctx.t("Nuova azione personalizzata", "New custom action")}</button>` : ""}</div><p class="muted">${ctx.t("Attacchi e abilità che l'app non conosce ancora, con tiro per colpire e danno calcolati dalla scheda. Al Tavolo si usano dalla barra rapida.", "Attacks and abilities the app does not know yet, with attack roll and damage computed from the sheet. At the Table they run from the quick bar.")}</p>${rows ? `<ul class="item-list">${rows}</ul>` : `<p class="empty-state qb-custom-empty">${ctx.t("Nessuna azione personalizzata.", "No custom action.")}</p>`}</section>`;
}
export function bindCustomSection(el, ctx, actor) {
  if (!actor) return;
  const actorId = actor.id;
  el.addEventListener("click", (e) => {
    const b = e.target.closest?.("button");
    if (!b || !el.contains(b)) return;
    const d = b.dataset;
    try {
      if ("qbCustomNew" in d) openCustom(ctx, actorId);
      else if (d.qbCustomEdit) openCustom(ctx, actorId, d.qbCustomEdit);
      else if (d.qbCustomRemove) removeCustomDialog(ctx, actorId, d.qbCustomRemove);
      else if (d.qbCustomBar) {
        // Roll20 "Add to Token Bar" (R20-035): from the sheet to the first free slot.
        const slice = sliceOf(ctx.state);
        const page = pageIndex(ctx, slice, actorId);
        let placed = null;
        barCommit(
          ctx,
          ctx.t("Barra rapida: casella aggiunta", "Quick bar: slot added"),
          (draft, s) => {
            placed = D.addSlot(
              draft,
              s,
              ctx.role,
              actorId,
              { kind: "custom", ref: { customId: d.qbCustomBar }, color: "red" },
              { page },
            );
          },
        );
        ctx.toast(
          ctx.t(
            `Aggiunta alla barra rapida, pagina ${page + 1}, casella ${D.KEYS[placed.index]}.`,
            `Added to the quick bar, page ${page + 1}, slot ${D.KEYS[placed.index]}.`,
          ),
        );
      }
    } catch (error) {
      toastError(ctx, error);
    }
  });
}
function removeCustomDialog(ctx, actorId, id) {
  const slice = sliceOf(ctx.state);
  const action = D.customActionsOf(slice, actorId).find((a) => a.id === id);
  if (!action) return;
  const actor = ctx.state.actors[actorId];
  ctx.dialog(
    ctx.t("Rimuovi azione personalizzata", "Remove custom action"),
    `<p>${esc(ctx, ctx.t(`«${action.name}» lascia la scheda. Le caselle che la usano restano sulla barra, segnate come non disponibili. Annulla ultima modifica la ripristina.`, `“${action.name}” leaves the sheet. Slots that use it stay on the bar, marked unavailable. Undo last change brings it back.`))}</p>`,
    {
      submitLabel: ctx.t("Rimuovi", "Remove"),
      onSubmit: () =>
        ctx.commit(
          ctx.t(
            `${actor.name}: azione personalizzata «${action.name}» rimossa`,
            `${actor.name}: custom action “${action.name}” removed`,
          ),
          (draft) => D.removeCustomAction(draft, area.slice(draft), ctx.role, actorId, id),
          commitOptions(actor),
        ),
    },
  );
}

// ------------------------------------------------------------------ notifications

function collectShared(ctx) {
  const slice = sliceOf(ctx.state);
  if (!slice) return [];
  return D.receivedPages(slice, ctx.role)
    .filter(({ actorId }) => ctx.state.actors[actorId])
    .map(({ actorId, index, page }) => {
      const target = ctx.state.actors[actorId].name;
      const from = page.sharedFrom;
      const who = {
        it: from.actorName ?? (from.by === "dm" ? "Il DM" : "Un giocatore"),
        en: from.actorName ?? (from.by === "dm" ? "The DM" : "A player"),
      };
      return {
        id: `quickbar-shared-${page.id}`,
        title: {
          it: `Copia di una pagina della barra rapida per ${target}`,
          en: `Copy of a quick bar page for ${target}`,
        },
        body: {
          it: `${who.it} ha condiviso «${lbl({ lang: "it" }, page.name)}»: è la pagina ${index + 1} della barra di ${target}.`,
          en: `${who.en} shared “${lbl({ lang: "en" }, page.name)}”: it is page ${index + 1} of ${target}'s bar.`,
        },
        time: page.sharedFrom.at,
        category: "quickbar",
        target: { page: "table", params: { id: actorId } },
      };
    });
}

// ------------------------------------------------------------------ registration

export function register(registry) {
  area = registry;
  registry.registerStateSlice(ID, {
    version: D.VERSION,
    seed: (state) => D.seedQuickbar(state),
    normalize: D.normalizeQuickbar,
  });
  // Accepted faces are evidence: Undo withdraws a roll (it leaves `live`), never deletes it.
  registry.registerStateSlice(ROLLS, {
    version: D.VERSION,
    undo: "preserve",
    seed: () => D.emptyRolls(),
    normalize: D.normalizeRolls,
  });
  registry.registerStyles(new URL("./quickbar.css", import.meta.url));
  registry.add("table-panel", {
    id: ID,
    label: { it: "Barra rapida", en: "Quick bar" },
    placement: "dock-row",
    icon: "dice",
    render: (ctx, view) => renderDock(ctx, view),
    bind: (el, ctx, table) => bindDock(el, ctx, table),
  });
  registry.add("sheet-section", {
    id: "quickbar-custom",
    tab: "actions",
    label: { it: "Azioni personalizzate", en: "Custom actions" },
    order: 20,
    when: (ctx, actor) =>
      Boolean(actor) &&
      actor.kind === "character" &&
      Boolean(sliceOf(ctx.state)) &&
      canViewActor(ctx.state.actors[actor.id], ctx.role, ctx.state),
    render: (ctx, actor) => renderCustomSection(ctx, actor),
    bind: (el, ctx, actor) => bindCustomSection(el, ctx, actor),
  });
  D.KEYS.forEach((key, index) =>
    registry.add("command", {
      id: `quickbar.slot-${key}`,
      label: { it: `Barra rapida: casella ${key}`, en: `Quick bar: slot ${key}` },
      shortcut: key,
      context: "table",
      group: "quickbar",
      run: (ctx) => runKey(ctx, index),
    }),
  );
  for (let page = 1; page <= D.MAX_PAGES; page++)
    registry.add("command", {
      id: `quickbar.page-${page}`,
      label: { it: `Barra rapida: pagina ${page}`, en: `Quick bar: page ${page}` },
      shortcut: `Alt+${page}`,
      context: "table",
      group: "quickbar",
      run: (ctx) => openPage(ctx, page - 1),
    });
  registry.add("notifications", {
    id: "quickbar-shared",
    label: { it: "Barra rapida", en: "Quick bar" },
    collect: (ctx) => collectShared(ctx),
  });
  registry.on("role-changed", () => resetQuickbarUI());
  registry.on("reset", () => {
    resetQuickbarUI();
    forgetMemory();
  });
}
