// B37 — Character sheet: derived values, reasoned overrides and conveniences (UI).
//
// Entry module of the "sheet-plus" area (extensions.mjs). Placement (B61 rule, D&D Beyond
// sheet structure): a sheet bar under the vitals on every tab (dnd5e Play/Edit toggle
// FVT-008, derived stats with rich tooltips FVT-010, roll toggles VTL-013, favourites
// FVT-009, experience DDB-024); saving throws, senses, speeds, defenses and skills plus the
// action list with economy filters in the Actions tab (DDB-028–031, DDB-039); notes
// sections in the Story tab (DDB-056); reselectable choices in the Features tab (Shard
// VTL-017); the selected creature's speeds and active effects in the Table's Creature tab.
// The domain (rules, sources, stacking order) is sheet-plus-domain.mjs.

import * as D from "./sheet-plus-domain.mjs";
import { rollDie } from "./state.mjs";
import { getEffectiveSpeed, speedBreakdown, getEffectiveActor } from "./forms-companions.mjs";
import { startCharacterBuilder } from "./character-builder.mjs";
import { addAttackModifierProvider } from "./combat.mjs";
import { prepareCombatAction } from "./combat-ui.mjs";
import { icon } from "./ui.mjs";
import {
  RULES_GLOSSARY,
  LABELS,
  WEAPON_PROPERTY_RULES,
  MASTERY_RULES,
  weaponDefinition,
  formatDistance,
} from "./srd-sample.mjs";
import { linkTerms } from "./srd-compendium.mjs";
import * as QB from "./quickbar-domain.mjs";
import { potionCost, potionBlock } from "./inventory-plus-domain.mjs";
import { openBastion } from "./bastions.mjs";
import { knownLanguages, languageName } from "./chat-domain.mjs";

const { ID, ROLLS } = D;
const L = (it, en) => ({ it, en });
let area = null;
let providerInstalled = false;
// C8: the combat tracker's own Initiative roll (combat-tracker.rollOwnInitiative and
// combat-tracker-domain.awaitsInitiative), an optional neighbour loaded by dynamic import at
// registration. Absent (area not built, contract not there yet): Initiative stays a sheet roll.
let tracker = null;
// C6 (R2 TV-95, Foundry's Pixels roll resolver): the dice tray's connected dice, when built.
let connectedDice = null;
let connectedPinned = false;
let loading = null;
export const neighboursReady = () => loading ?? Promise.resolve();
function loadNeighbours() {
  loading ??= Promise.all([
    Promise.all([import("./combat-tracker.mjs"), import("./combat-tracker-domain.mjs")])
      .then(([ui, domain]) => {
        if (
          typeof ui.rollOwnInitiative === "function" &&
          typeof domain.awaitsInitiative === "function"
        )
          tracker = {
            rollOwnInitiative: ui.rollOwnInitiative,
            awaitsInitiative: domain.awaitsInitiative,
          };
      })
      .catch(() => {}),
    import("./dice-tray.mjs")
      .then((tray) => {
        if (
          !connectedPinned &&
          typeof tray.hasConnectedDie === "function" &&
          typeof tray.awaitConnectedFaces === "function"
        )
          connectedDice = {
            hasConnectedDie: tray.hasConnectedDie,
            awaitConnectedFaces: tray.awaitConnectedFaces,
          };
      })
      .catch(() => {}),
  ]);
  return loading;
}
/** Whether a paired, connected die of these sides can answer a throw now (C6). */
function hasConnected(ctx, sides) {
  try {
    return connectedDice?.hasConnectedDie(ctx, sides) === true;
  } catch {
    return false;
  }
}
function awaitsInitiative(ctx, actorId) {
  try {
    return (
      typeof tracker?.rollOwnInitiative === "function" &&
      tracker.awaitsInitiative(ctx.state, actorId) === true
    );
  } catch {
    return false;
  }
}
// Per-view UI state (not game data): the action filter and the notes chip.
const ui = { filter: "all", notes: "all", tipsOff: false, focus: null };
const glossarySource = (slug) => RULES_GLOSSARY.find((e) => e.slug === slug)?.source ?? null;
const D20_TEST_SOURCE = glossarySource("d20-test");
// Favourites that roll at once (dnd5e Favourites): d20 tests and attack rolls.
const QUICK_ROLL = new Set(["skill", "save", "check", "initiative", "attack"]);

// ------------------------------------------------------------------------------ helpers

const lbl = (ctx, value) => ctx.esc(ctx.label(value));
const signedText = (value) => D.signed(value);
const attr = (value) => String(value ?? "").replace(/[^a-z0-9_-]/gi, "-");
// SV-37 (Roll20's errors name the cause and the fix): a disabled command carries one sentence
// «cause. remedy.» beside it, linked by aria-describedby. `reason` is {it, en} or null.
const whyId = (key) => `shp-why-${attr(key)}`;
const FAV_MISSING = L(
  "Non più sulla scheda (usato o tolto). Toglilo dai preferiti in Modifica.",
  "No longer on the sheet (used up or removed). Remove it from favourites in Edit.",
);
const NO_USES = L(
  "Nessun uso rimasto: si recupera con il riposo indicato, o «Ripristina» per una correzione.",
  "No uses left: they come back with the stated rest, or “Reset” for a correction.",
);
const offReason = (ctx, key, reason) =>
  reason ? ` disabled aria-describedby="${whyId(key)}"` : "";
const whyReason = (ctx, key, reason) =>
  reason ? `<small class="shp-why" id="${whyId(key)}">${lbl(ctx, reason)}</small>` : "";
/**
 * The viewer's remembered dice for rolls in place (the dice tray's «Dadi per i tiri sul
 * posto», review P2-6 of B34; D&D Beyond's dice setting, Foundry's manual dice): the roll
 * window opens on it. Without the dice tray, digital as before.
 */
function rememberedDice(ctx) {
  try {
    return (area ?? ctx.registry)?.getSetting(ctx, "dice-tray.dice") === "physical"
      ? "physical"
      : "digital";
  } catch {
    return "digital";
  }
}
function modeOf(ctx) {
  try {
    return (area ?? ctx.registry)?.getSetting(ctx, "sheet-plus.mode") === "edit" ? "edit" : "play";
  } catch {
    return "play";
  }
}
const editing = (ctx, actor) => modeOf(ctx) === "edit" && Boolean(actor) && ctx.canControl(actor);
function refusal(ctx, error) {
  if (error instanceof TypeError || error instanceof ReferenceError) throw error;
  return ctx.label(error?.it ? { it: error.it, en: error.en } : (error?.message ?? String(error)));
}
function attempt(ctx, run) {
  try {
    return run();
  } catch (error) {
    ctx.toast(refusal(ctx, error), true);
    return null;
  }
}
/** Shows a refusal inside the open dialog (the shell's error line), else as a toast. */
function dialogError(ctx, error) {
  const line = globalThis.document?.querySelector("#dialog .dialog-error");
  const text = refusal(ctx, error);
  if (line) {
    line.textContent = text;
    line.hidden = false;
  } else ctx.toast(text, true);
}
function commitSheet(ctx, actorId, label, mutate, options = {}) {
  const actor = ctx.state.actors[actorId];
  if (!actor || !ctx.canControl(actor))
    throw D.fail("Non puoi modificare questa scheda.", "You cannot edit this sheet.");
  let result;
  ctx.commit(
    label,
    (draft) => {
      result = mutate(draft);
    },
    {
      ...(D.isPersonal(actor) ? { local: true, visibility: "private" } : {}),
      ...options,
    },
  );
  return result;
}
/** A value the viewer cannot roll: plain text, not an inert button (read-only sheet). */
const staticValue = (ctx, text) => `<strong class="shp-value is-static">${ctx.esc(text)}</strong>`;
/** Where a defense comes from, as plain text (a rule source, the sheet, the SRD stat block
 *  linked from the compendium or the DM's record in the damage tray). */
function defenseSource(ctx, s) {
  if (s.kind === "sheet") return ctx.t("scheda", "sheet");
  if (s.kind === "block")
    return ctx.t("blocco SRD", "SRD stat block") + (s.block ? " " + ctx.label(s.block) : "");
  if (s.kind === "dm-record") return ctx.t("registrata dal DM", "recorded by the DM");
  return (s.name || ctx.t("personalizzata", "custom")) + (s.custom ? "*" : "");
}
function sourceLine(ctx, source) {
  const text = D.pagesText(source);
  return text ? `<small class="shp-source">${ctx.esc(text)}</small>` : "";
}
const star = (ctx, on, name, kind, id) =>
  `<button type="button" class="shp-star" data-shp="fav" data-kind="${ctx.esc(kind)}" data-id="${ctx.esc(id)}" aria-pressed="${on}" aria-label="${ctx.esc(on ? ctx.t(`Togli ${name} dai preferiti`, `Remove ${name} from favourites`) : ctx.t(`Aggiungi ${name} ai preferiti`, `Add ${name} to favourites`))}" title="${ctx.esc(on ? ctx.t("Nei preferiti", "In favourites") : ctx.t("Aggiungi ai preferiti", "Add to favourites"))}">${on ? "★" : "☆"}</button>`;
function ridersText(ctx, riders) {
  return riders.map((rider) => D.riderText(rider, ctx.lang)).join(" · ");
}
function riderBadges(ctx, riders) {
  return riders
    .map(
      (rider) =>
        `<span class="shp-rider" title="${ctx.esc(ctx.label(rider.name))}">${ctx.esc(D.riderText(rider, ctx.lang))}</span>`,
    )
    .join("");
}
function partsHTML(ctx, parts) {
  return parts
    .map(
      (part) =>
        `<li><span>${lbl(ctx, part.label)}</span><strong>${part.value === null || part.value === undefined ? "—" : ctx.esc(part.plain ? String(part.value) : signedText(part.value))}</strong>${part.source ? sourceLine(ctx, part.source) : ""}</li>`,
    )
    .join("");
}
/** Parts outside the reasoned chain: worn items (PG-25) and conditions (PG-23). */
const extraParts = (stat) => [...(stat.itemParts ?? []), ...(stat.conditionParts ?? [])];
/** Tooltip body for a stat: base parts, every step in stacking order, riders, source. */
function tipBody(ctx, stat, riders = [], hint = null) {
  const steps = stat.steps
    .map(
      (step) =>
        `<li class="${step.applied ? "" : "shp-step-off"}"><span>${lbl(ctx, D.OP_NAMES[step.op])}: ${ctx.esc(step.note)}</span><strong>${ctx.esc(step.op === "add" ? signedText(step.value) : String(step.value))} → ${ctx.esc(String(step.after))}</strong></li>`,
    )
    .join("");
  return `<strong class="shp-tip-title">${lbl(ctx, stat.name)} ${ctx.esc(stat.kind === "ac" || stat.kind === "passive-perception" ? String(stat.total) : signedText(stat.total))}</strong><ul>${partsHTML(ctx, stat.baseParts)}${steps}${partsHTML(ctx, extraParts(stat))}</ul>${riders.length ? `<p>${ctx.t("Con gli effetti attivi", "With active effects")}: ${ctx.esc(ridersText(ctx, riders))}</p>` : ""}${stat.drift ? `<p class="shp-warn">${ctx.t("Valore cambiato altrove: apri per riallineare.", "Value changed elsewhere: open to realign.")}</p>` : ""}${stat.form ? `<p>${ctx.t("Forma attiva: vale il valore della forma.", "Active form: the form’s value applies.")}</p>` : ""}${sourceLine(ctx, stat.source)}<small class="shp-tip-hint">${hint ?? ctx.t("Clic: dettagli e modifiche", "Click: details and changes")}</small>`;
}
/** PG-40: a row name that shows its tooltip on hover or focus and pins it on click or tap
 *  (dnd5e hover tooltips, BG3 pinned detail). */
function tipName(ctx, id, inner, body, label) {
  const tip = `shp-tip-${attr(id)}`;
  return `<div class="shp-row-cell"><button type="button" class="shp-row-name shp-row-tip" data-shp="tip" data-tip="${ctx.esc(tip)}" aria-describedby="${tip}" aria-label="${ctx.esc(ctx.t(`${label}: dettagli, clic per fissarli`, `${label}: details, click to pin them`))}">${inner}</button><div class="shp-tip" role="tooltip" id="${tip}">${body}</div></div>`;
}
const ROW_HINT = (ctx) =>
  ctx.t(
    "Clic sul nome: fissa il dettaglio · sul numero: tira",
    "Click the name: pin the detail · the number: roll",
  );
function pill(ctx, { id, label, value, body, data, cog = false, extra = "", hidden = false }) {
  const tip = `shp-tip-${attr(id)}`;
  return `<div class="shp-stat" data-shp-stat="${attr(id)}"${hidden ? " hidden" : ""}><button type="button" class="shp-pill${cog ? " shp-pill-edit" : ""}" ${data} aria-describedby="${tip}"><span class="shp-pill-label">${label}</span><strong>${value}</strong>${cog ? `<span class="shp-cog" aria-hidden="true">${icon("settings")}</span>` : ""}${extra}</button><div class="shp-tip" role="tooltip" id="${tip}">${body}</div></div>`;
}

// ------------------------------------------------------------------------------ sheet bar

function renderBar(ctx, actor) {
  if (!actor || !D.sliceOf(ctx.state)) return "";
  const canEdit = ctx.canControl(actor);
  const edit = editing(ctx, actor);
  const id = actor.id;
  const stat = (key) => D.statValue(ctx.state, id, key);
  const ac = stat("ac");
  const init = stat("initiative");
  const speeds = D.speedsOf(ctx.state, id);
  const entry = D.entryOf(ctx.state, id);
  const display = speeds[entry?.speedDisplay] ? entry.speedDisplay : "walk";
  const moving = D.currentMovementMode(ctx.state, id);
  const defenses = D.collapsedDefenses(ctx.state, id);
  const effects = D.effectList(ctx.state, id);
  const favorites = D.resolveFavorites(ctx.state, id);
  const xp = D.xpView(ctx.state, id);
  const pending = D.pendingReselect(ctx.state, id);
  const drifts = Object.keys(entry?.applied ?? {})
    .filter((key) => D.statKind(key))
    .map((key) => stat(key))
    .filter((row) => row.drift);
  // PG-25: Play and Edit show the same number (the total); Edit adds the base as a note.
  const valueOf = (row) => row.total;
  const baseNote = (row) =>
    edit && row.base !== row.total
      ? `<small class="shp-base-note">${ctx.t("base", "base")} ${ctx.esc(row.kind === "ac" || row.kind === "passive-perception" ? String(row.base) : signedText(row.base))}</small>`
      : "";
  // PG-70: walking shows the speed now in effect (encumbrance, conditions, form).
  const walking = speedBreakdown({ ...ctx.state.actors[id], movementMode: undefined });
  const walkNow = Number.isFinite(walking?.effective) ? walking.effective : speeds.walk;
  const speedText = (mode) => `${mode === "walk" ? walkNow : speeds[mode]} m`;
  const walkNote = speedNote(ctx, walking);
  const senses = D.sensesOf(ctx.state, id, tableSenses(ctx, id));
  const shownSense =
    entry?.senseDisplay && senses[entry.senseDisplay]?.value ? entry.senseDisplay : null;
  // D&D Beyond's strip over the tabs: Initiative, Armor Class, Defenses (the Conditions box
  // follows it from the core). Speed and the sense chosen for the top show once, in the
  // core's Walking Speed box of the top band: their pills stay hidden, for their tooltips'
  // data only. Passive Perception is in the Senses box; the Proficiency Bonus in the band.
  const pills = [
    pill(ctx, {
      id: "initiative",
      label: ctx.t("Iniziativa", "Initiative"),
      value: ctx.esc(signedText(valueOf(init))),
      body:
        tipBody(ctx, init, D.activeRiders(ctx.state, id, "check")) +
        `<p>${ctx.t("Punteggio d’iniziativa", "Initiative score")}: ${10 + init.total}</p>`,
      data: `data-shp="stat" data-key="initiative"`,
      cog: edit,
      extra: baseNote(init),
    }),
    pill(ctx, {
      id: "ac",
      label: ctx.t("CA", "AC"),
      value: ctx.esc(String(valueOf(ac) ?? "—")),
      body: tipBody(ctx, ac),
      data: `data-shp="stat" data-key="ac"`,
      cog: edit,
      extra:
        (ac.mods.length || ac.itemParts?.length) && !edit
          ? `<span class="shp-dot" aria-hidden="true"></span>`
          : baseNote(ac),
    }),
    // PG-30: the sense chosen for the top («Senso mostrato in alto»), as D&D Beyond's
    // Senses box beside the passive scores.
    shownSense
      ? pill(ctx, {
          id: "sense",
          label: lbl(ctx, D.SENSE_NAMES[shownSense]),
          value: ctx.esc(`${senses[shownSense].value} m`),
          body: `<strong class="shp-tip-title">${ctx.t("Sensi", "Senses")}</strong><ul>${D.SENSES.filter(
            (s) => senses[s].value,
          )
            .map(
              (s) =>
                `<li><span>${lbl(ctx, D.SENSE_NAMES[s])}</span><strong>${senses[s].value} m</strong></li>`,
            )
            .join(
              "",
            )}</ul>${sourceLine(ctx, D.SOURCES.darkvision)}<small class="shp-tip-hint">${ctx.t("Clic: velocità e sensi", "Click: speeds and senses")}</small>`,
          data: `data-shp="senses"`,
          cog: edit,
          hidden: true,
        })
      : "",
    pill(ctx, {
      id: "speed",
      label:
        moving !== "walk"
          ? lbl(ctx, D.SPEED_NAMES[moving])
          : display !== "walk"
            ? lbl(ctx, D.SPEED_NAMES[display])
            : ctx.t("Velocità", "Speed"),
      value: ctx.esc(speedText(moving !== "walk" ? moving : display)),
      body: `<strong class="shp-tip-title">${ctx.t("Velocità", "Speeds")}</strong><ul>${D.SPEED_MODES.filter(
        (m) => speeds[m],
      )
        .map(
          (m) =>
            `<li><span>${lbl(ctx, D.SPEED_NAMES[m])}${m === moving ? " · " + ctx.t("in uso", "in use") : ""}</span><strong>${ctx.esc(speedText(m))}</strong></li>`,
        )
        .join(
          "",
        )}</ul>${walkNote ? `<p>${ctx.esc(ctx.label(D.SPEED_NAMES.walk))}: ${ctx.esc(walkNote)}</p>` : ""}<p>${ctx.t("Con più velocità scegli quale usare; cambiando, la distanza già percorsa si sottrae dalla nuova.", "With several speeds choose which to use; switching subtracts the distance already moved from the new one.")}</p>${sourceLine(ctx, D.SOURCES.speed)}<small class="shp-tip-hint">${ctx.t("Clic: velocità e sensi", "Click: speeds and senses")}</small>`,
      data: `data-shp="speeds"`,
      cog: edit,
      hidden: true,
    }),
    pill(ctx, {
      id: "defenses",
      label: ctx.t("Difese", "Defenses"),
      value: defenses.length
        ? ctx.esc(
            defenses
              .slice(0, 2)
              .map((d) => ctx.label(d.name) + d.marker)
              .join(", ") + (defenses.length > 2 ? ` +${defenses.length - 2}` : ""),
          )
        : ctx.t("Nessuna", "None"),
      body: `<strong class="shp-tip-title">${ctx.t("Difese", "Defenses")}</strong>${defenses.length ? `<ul>${defenses.map((d) => `<li><span>${lbl(ctx, D.DEFENSE_NAMES[d.kind])}: ${lbl(ctx, d.name)}${d.marker}</span><strong>${ctx.esc(d.sources.map((s) => defenseSource(ctx, s)).join(", "))}</strong></li>`).join("")}</ul>` : `<p>${ctx.t("Nessuna resistenza, immunità o vulnerabilità.", "No resistances, immunities or vulnerabilities.")}</p>`}<small class="shp-tip-hint">${ctx.t("* voce personalizzata senza fonte di regola", "* custom entry with no rule source")}</small>`,
      data: `data-shp="defenses"`,
      cog: edit,
    }),
  ].join("");
  const modeToggle = canEdit
    ? `<div class="shp-mode" role="group" aria-label="${ctx.t("Modalità della scheda", "Sheet mode")}"><button type="button" data-shp="mode" data-mode="play" aria-pressed="${!edit}">${icon("play")}<span>${ctx.t("Gioco", "Play")}</span></button><button type="button" data-shp="mode" data-mode="edit" aria-pressed="${edit}">${icon("pen")}<span>${ctx.t("Modifica", "Edit")}</span></button></div>`
    : `<span class="badge">${ctx.t("Consultazione", "View only")}</span>`;
  const xpBlock =
    actor.kind === "character"
      ? xp.mode === "milestone"
        ? `<div class="shp-xp"><span>${ctx.t(`Livello ${xp.level} · a traguardi`, `Level ${xp.level} · milestones`)}${xp.milestones.length ? ` · ${xp.milestones.length} ${ctx.t("traguardi", "milestones")}` : ""}</span><button type="button" class="button quiet" data-shp="xp">${ctx.t("Gestisci avanzamento", "Manage advancement")}</button></div>`
        : `<div class="shp-xp"><span>${ctx.t(`Livello ${xp.level}`, `Level ${xp.level}`)} · <strong>${ctx.esc(numberText(ctx, xp.xp))}</strong>${xp.needed ? ` / ${ctx.esc(numberText(ctx, xp.needed))}` : ""} ${ctx.t("PE", "XP")}${xp.recorded ? "" : ` <small>(${ctx.t("dal livello", "from level")})</small>`}</span><span class="shp-xpbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${xp.pct}" aria-label="${ctx.esc(ctx.t(`Verso il livello ${xp.level + 1}`, `Towards level ${xp.level + 1}`))}"><span style="width:${xp.pct}%"></span></span><button type="button" class="button quiet" data-shp="xp">${ctx.t("Gestisci PE", "Manage XP")}</button></div>`
      : "";
  const effectsRow = `<div class="shp-effects" role="group" aria-label="${ctx.t("Effetti sui tiri", "Roll effects")}"><span class="shp-row-label">${ctx.t("Effetti", "Effects")}</span>${effects
    .map(
      (effect) =>
        // SV-37: a viewer who cannot change an effect reads its state, not an inert switch.
        `<${canEdit ? `button type="button" class="shp-switch" role="switch" aria-checked="${effect.active}" data-shp="effect" data-effect="${ctx.esc(effect.id)}"` : `span class="shp-switch is-static${effect.active ? " is-on" : ""}"`} title="${ctx.esc(ctx.label(effect.summary) || ctx.label(effect.name))}"><span class="shp-switch-knob" aria-hidden="true"></span>${lbl(ctx, effect.name)}${canEdit ? "" : ` <span class="visually-hidden">${effect.active ? ctx.t("attivo", "on") : ctx.t("spento", "off")}</span>`}${effect.active ? ` <small>${ctx.esc(effect.dice ? `${effect.sign < 0 ? "−" : "+"}${effect.dice.count}d${effect.dice.sides}` : signedText(effect.sign * effect.flat))}</small>` : ""}</${canEdit ? "button" : "span"}>`,
    )
    .join(
      "",
    )}${canEdit ? `<button type="button" class="button quiet shp-small" data-shp="effect-add">${icon("plus")} ${ctx.t("Effetto", "Effect")}</button>` : ""}</div>`;
  const favoritesRow = `<div class="shp-favorites" role="group" aria-label="${ctx.t("Preferiti", "Favourites")}"><span class="shp-row-label">★ ${ctx.t("Preferiti", "Favourites")}</span>${
    favorites.length
      ? favorites
          .map(
            (fav) =>
              `<span class="shp-fav${fav.available ? "" : " is-missing"}">${canEdit ? `<button type="button" class="shp-fav-use" data-shp="use" data-kind="${ctx.esc(fav.ref.kind)}" data-id="${ctx.esc(fav.ref.id)}" data-fav="1"${offReason(ctx, `fav-${fav.ref.kind}-${fav.ref.id}`, fav.available ? null : FAV_MISSING)} title="${ctx.esc(QUICK_ROLL.has(fav.ref.kind) ? ctx.t("Clic: tira subito · clic destro o pressione lunga: vantaggio, svantaggio, dadi fisici", "Click: roll now · right-click or long press: advantage, disadvantage, physical dice") : ctx.t("Clic: usa", "Click: use"))}">` : `<span class="shp-fav-use is-static">`}${lbl(ctx, fav.name)}${Number.isFinite(fav.value) ? ` <strong>${ctx.esc(fav.ref.kind === "check" || fav.ref.kind === "skill" || fav.ref.kind === "save" || fav.ref.kind === "initiative" || fav.ref.kind === "attack" ? signedText(fav.value) : String(fav.value))}</strong>` : ""}${fav.uses ? ` <small>${fav.uses.used === null ? "×" + fav.uses.max : fav.uses.max - fav.uses.used + "/" + fav.uses.max}</small>` : ""}${canEdit ? "</button>" : "</span>"}${canEdit ? whyReason(ctx, `fav-${fav.ref.kind}-${fav.ref.id}`, fav.available ? null : FAV_MISSING) : ""}${edit ? `<button type="button" class="shp-fav-tool" data-shp="fav-move" data-kind="${ctx.esc(fav.ref.kind)}" data-id="${ctx.esc(fav.ref.id)}" data-delta="-1" aria-label="${ctx.esc(ctx.t("Sposta prima: ", "Move earlier: ") + ctx.label(fav.name))}">‹</button><button type="button" class="shp-fav-tool" data-shp="fav" data-kind="${ctx.esc(fav.ref.kind)}" data-id="${ctx.esc(fav.ref.id)}" aria-label="${ctx.esc(ctx.t("Togli dai preferiti: ", "Remove from favourites: ") + ctx.label(fav.name))}">${icon("close")}</button>` : ""}</span>`,
          )
          .join("")
      : `<span class="muted shp-empty">${canEdit ? ctx.t("Tocca ☆ accanto a tiri, abilità e azioni per averli qui a un clic.", "Tap ☆ next to rolls, skills and actions to keep them here, one click away.") : ctx.t("Nessun preferito.", "No favourites.")}</span>`
  }</div>`;
  const notices = [];
  for (const row of drifts)
    notices.push(
      `<div class="shp-notice"><span>${ctx.esc(ctx.t(`${ctx.label(row.name)}: la scheda ora dice ${row.field}, i modificatori davano ${row.chainTotal}.`, `${ctx.label(row.name)}: the sheet now says ${row.field}, the modifiers gave ${row.chainTotal}.`))}</span><button type="button" class="button" data-shp="stat" data-key="${ctx.esc(row.key)}">${ctx.t("Apri e riallinea", "Open and realign")}</button></div>`,
    );
  if (xp.mode === "xp" && xp.ready && actor.kind === "character")
    notices.push(
      `<div class="shp-notice is-good"><span>${ctx.esc(ctx.t(`${numberText(ctx, xp.xp)} PE: il livello ${xp.level + 1} è disponibile.`, `${numberText(ctx, xp.xp)} XP: level ${xp.level + 1} is available.`))}</span>${canEdit ? `<button type="button" class="button primary" data-shp="advance">${ctx.t(`Avanza al livello ${xp.level + 1}`, `Level up to ${xp.level + 1}`)}</button>` : ""}</div>`,
    );
  if (xp.proposedLevel)
    notices.push(
      `<div class="shp-notice is-good"><span>${ctx.esc(ctx.t(`Il DM propone il livello ${xp.proposedLevel} (traguardo).`, `The DM proposes level ${xp.proposedLevel} (milestone).`))}</span>${canEdit ? `<button type="button" class="button primary" data-shp="advance">${ctx.t(`Avanza al livello ${xp.level + 1}`, `Level up to ${xp.level + 1}`)}</button>` : ""}</div>`,
    );
  for (const row of pending)
    notices.push(
      `<div class="shp-notice"><span>${ctx.esc(ctx.t(`Dopo il riposo ${row.trigger === "short" ? "" : "lungo "}puoi rivedere: ${ctx.label(row.name)}.`, `After the ${row.trigger === "short" ? "" : "Long "}Rest you can revise: ${ctx.label(row.name)}.`))}</span>${canEdit ? (row.external === "forms" ? `<button type="button" class="button" data-shp="forms-known">${ctx.t("Apri le forme", "Open forms")}</button>` : `<button type="button" class="button primary" data-shp="reselect" data-reselect="${ctx.esc(row.id)}">${ctx.t("Rivedi la scelta", "Revise the choice")}</button><button type="button" class="button quiet" data-shp="reselect-keep" data-reselect="${ctx.esc(row.id)}">${ctx.t("Tieni le scelte", "Keep the choices")}</button>`) : ""}</div>`,
    );
  return `<section class="shp-bar${edit ? " is-edit" : ""}${ui.tipsOff ? " shp-tips-off" : ""}" data-shp-bar="${ctx.esc(id)}" aria-label="${ctx.t("Scheda: modalità, valori derivati e preferiti", "Sheet: mode, derived values and favourites")}"><div class="shp-bar-top">${modeToggle}${edit ? `<span class="shp-mode-hint">${ctx.t("Modifica: gli ingranaggi aprono le modifiche motivate; il numero resta il totale.", "Edit: cogs open reasoned changes; the number stays the total.")}</span>` : ""}${undoControl(ctx)}${xpBlock}</div>${effectsRow}${favoritesRow}<div class="shp-stats">${pills}</div>${notices.join("")}</section>`;
}
// D&D Beyond's top band, left part: the six abilities (modifier big, score small; a click
// rolls the check through the one engine, hover or focus shows its components, PG-40), then
// the Proficiency Bonus box. The core adds Walking Speed, Inspiration and Hit Points.
function renderBand(ctx, actor) {
  if (!actor || !D.sliceOf(ctx.state)) return "";
  const canEdit = ctx.canControl(actor);
  const id = actor.id;
  const pb = D.proficiencyBonus(actor);
  const pbPill = pill(ctx, {
    id: "pb",
    label: ctx.t("Competenza", "Proficiency"),
    value: ctx.esc(signedText(pb.value)),
    body: `<strong class="shp-tip-title">${ctx.t("Bonus di competenza", "Proficiency Bonus")} ${signedText(pb.value)}</strong><p>${pb.from === "recorded" ? ctx.t("Registrato sulla scheda.", "Recorded on the sheet.") : ctx.t(`Dal livello ${actor.level} (tabella Avanzamento del personaggio).`, `From level ${actor.level} (Character Advancement table).`)}</p>${sourceLine(ctx, D.SOURCES.advancement)}`,
    data: `data-shp="info" data-info="pb"`,
  });
  const abilitiesRow = `<div class="shp-abilities" role="group" aria-label="${ctx.t("Caratteristiche", "Abilities")}">${D.ABILITIES.map(
    (key) => {
      const score = actor.abilities?.[key];
      const mod = D.abilityMod(score);
      const name = ctx.label(D.ABILITY_NAMES[key]);
      const save = D.statValue(ctx.state, id, "save:" + key);
      const body = `<strong class="shp-tip-title">${ctx.esc(name)} ${Number.isFinite(score) ? score : "—"}</strong><ul><li><span>${ctx.t("Modificatore", "Modifier")}</span><strong>${ctx.esc(signedText(mod))}</strong></li><li><span>${ctx.t("Tiro salvezza", "Saving throw")}${save.proficient ? " · " + ctx.t("competente", "proficient") : ""}</span><strong>${ctx.esc(signedText(save.total))}</strong></li></ul>${sourceLine(ctx, D20_TEST_SOURCE)}<small class="shp-tip-hint">${ctx.t("Clic: prova di caratteristica", "Click: ability check")}</small>`;
      const inner = `<span class="shp-ability-name">${lbl(ctx, D.ABILITY_SHORT[key])}</span><strong>${ctx.esc(signedText(mod))}</strong><small>${Number.isFinite(score) ? score : "—"}</small>`;
      return `<div class="shp-stat shp-ability">${
        canEdit && Number.isFinite(score)
          ? `<button type="button" class="shp-ability-box" data-shp="roll" data-kind="check" data-subject="${key}" aria-describedby="shp-tip-ab-${key}" aria-label="${ctx.esc(ctx.t(`Prova di ${name} ${signedText(mod)}`, `${name} check ${signedText(mod)}`))}">${inner}</button>`
          : `<span class="shp-ability-box is-static" tabindex="0" aria-describedby="shp-tip-ab-${key}">${inner}</span>`
      }<div class="shp-tip" role="tooltip" id="shp-tip-ab-${key}">${body}</div></div>`;
    },
  ).join("")}</div>`;
  return `<div class="shp-band${ui.tipsOff ? " shp-tips-off" : ""}" data-shp-band="${ctx.esc(id)}">${abilitiesRow}${pbPill}</div>`;
}
// The app's "Undo last change" (the conditions panel offers the same), naming what it undoes.
function undoControl(ctx) {
  const label = ctx.canUndo?.() ? ctx.undoLabel?.() : "";
  if (!label) return "";
  return `<button type="button" class="button quiet shp-small shp-undo" data-shp="undo" title="${ctx.esc(label)}">${icon("undo")} ${ctx.t("Annulla ultima modifica", "Undo last change")}</button>`;
}
const numberText = (ctx, value) =>
  new Intl.NumberFormat(ctx.lang === "it" ? "it-IT" : "en-GB").format(value);

// ------------------------------------------------------------------------------ actions tab: values

function renderDerived(ctx, actor) {
  if (!actor || !D.sliceOf(ctx.state)) return "";
  const id = actor.id;
  const edit = editing(ctx, actor);
  const canEdit = ctx.canControl(actor);
  const saveRiders = D.activeRiders(ctx.state, id, "save");
  const checkRiders = D.activeRiders(ctx.state, id, "check");
  const saves = D.ABILITIES.map((key) => {
    const stat = D.statValue(ctx.state, id, "save:" + key);
    const fav = D.isFavorite(ctx.state, id, { kind: "save", id: key });
    const name = ctx.label(D.ABILITY_NAMES[key]);
    return `<li class="shp-row" data-shp-save="${key}">${canEdit ? star(ctx, fav, ctx.t(`TS ${name}`, `${name} save`), "save", key) : ""}<span class="shp-prof${stat.proficient ? " is-on" : ""}" title="${ctx.esc(stat.proficient ? ctx.t("Competente", "Proficient") : ctx.t("Non competente", "Not proficient"))}" aria-hidden="true"></span>${tipName(ctx, "save-" + key, `${lbl(ctx, D.ABILITY_SHORT[key])} <small>${ctx.esc(name)}</small>${stat.mods.length ? `<small class="shp-modded">${stat.mods.length} ${ctx.t("mod.", "mod.")}</small>` : ""}${stat.drift ? `<small class="shp-warn">${ctx.t("da riallineare", "to realign")}</small>` : ""}`, tipBody(ctx, stat, saveRiders, ROW_HINT(ctx)), ctx.t(`TS ${name}`, `${name} save`))}${saveRiders.length && !edit ? riderBadges(ctx, saveRiders) : ""}${
      edit
        ? `<button type="button" class="shp-value shp-value-edit" data-shp="stat" data-key="save:${key}" aria-label="${ctx.esc(ctx.t(`Modifiche al TS su ${name}: totale ${D.signed(stat.total)}, base ${D.signed(stat.base)}`, `Changes to the ${name} save: total ${D.signed(stat.total)}, base ${D.signed(stat.base)}`))}">${ctx.esc(signedText(stat.total))}<span class="shp-cog" aria-hidden="true">${icon("settings")}</span></button>`
        : !canEdit
          ? staticValue(ctx, signedText(stat.total))
          : `<button type="button" class="shp-value" data-shp="roll" data-kind="save" data-subject="${key}" aria-label="${ctx.esc(ctx.t(`Tira il TS su ${name} ${D.signed(stat.total)}${saveRiders.length ? " " + ridersText(ctx, saveRiders) : ""}`, `Roll the ${name} save ${D.signed(stat.total)}${saveRiders.length ? " " + ridersText(ctx, saveRiders) : ""}`))}">${ctx.esc(signedText(stat.total))}</button>`
    }</li>`;
  }).join("");
  const skills = D.skillRows(ctx.state, id);
  const skillRow = (row) => {
    const stat = D.statValue(ctx.state, id, row.key);
    const name = ctx.label(row.name);
    return `<li class="shp-row" data-shp-skill="${ctx.esc(row.id)}">${canEdit ? star(ctx, row.favorite, name, "skill", row.id) : ""}<span class="shp-prof${row.proficient ? " is-on" : ""}${row.proficiency === "expertise" ? " is-expert" : ""}" aria-hidden="true"></span>${tipName(ctx, "skill-" + row.id, `${ctx.esc(name)} <small>${lbl(ctx, D.ABILITY_SHORT[row.ability])}</small>${row.custom ? `<small class="shp-custom">${ctx.t("personalizzata", "custom")}</small>` : ""}${stat.mods.length ? `<small class="shp-modded">${stat.mods.length} ${ctx.t("mod.", "mod.")}</small>` : ""}${stat.drift ? `<small class="shp-warn">${ctx.t("da riallineare", "to realign")}</small>` : ""}`, tipBody(ctx, stat, D.activeRiders(ctx.state, id, "check"), ROW_HINT(ctx)), name)}${
      edit
        ? `<button type="button" class="shp-value shp-value-edit" data-shp="stat" data-key="${ctx.esc(row.key)}" aria-label="${ctx.esc(ctx.t(`Modifiche a ${name}: totale ${D.signed(stat.total)}, base ${D.signed(stat.base)}`, `Changes to ${name}: total ${D.signed(stat.total)}, base ${D.signed(stat.base)}`))}">${ctx.esc(signedText(stat.total))}<span class="shp-cog" aria-hidden="true">${icon("settings")}</span></button>${row.custom ? `<button type="button" class="shp-icon-btn" data-shp="skill-remove" data-skill="${ctx.esc(row.id.slice(7))}" aria-label="${ctx.esc(ctx.t("Togli l’abilità ", "Remove the skill ") + name)}">${icon("close")}</button>` : ""}`
        : !canEdit
          ? staticValue(ctx, signedText(stat.total))
          : `<button type="button" class="shp-value" data-shp="roll" data-kind="skill" data-subject="${ctx.esc(row.id)}" aria-label="${ctx.esc(ctx.t(`Tira ${name} ${D.signed(stat.total)}`, `Roll ${name} ${D.signed(stat.total)}`))}">${ctx.esc(signedText(stat.total))}</button>`
    }</li>`;
  };
  const senses = D.sensesOf(ctx.state, id, tableSenses(ctx, id));
  const senseRows = D.SENSES.filter((s) => senses[s].value)
    .map(
      (s) =>
        `<li><span>${lbl(ctx, D.SENSE_NAMES[s])}</span><strong>${senses[s].value} m</strong><small>${senses[s].form ? ctx.t("forma", "form") : senses[s].sheet ? ctx.t("scheda", "sheet") : ctx.t("al Tavolo (pedina)", "at the Table (token)")}</small></li>`,
    )
    .join("");
  const passiveOf = (skill) => 10 + D.statValue(ctx.state, id, "skill:" + skill).total;
  const passive = D.statValue(ctx.state, id, "passive-perception");
  // Passive Perception opens its reasoned changes here (it was a pill of the bar before the
  // DDB layout; the Senses box is where D&D Beyond shows it).
  const passiveValue = !canEdit
    ? `<strong>${passive.total}</strong>`
    : `<button type="button" class="shp-value${edit ? " shp-value-edit" : ""}" data-shp="stat" data-key="passive-perception" aria-label="${ctx.esc(ctx.t(`Percezione passiva ${passive.total}: modifiche motivate`, `Passive Perception ${passive.total}: reasoned changes`))}">${passive.total}${edit ? `<span class="shp-cog" aria-hidden="true">${icon("settings")}</span>` : ""}</button>`;
  const recent = D.visibleRolls(ctx.state, id, ctx.role, 6);
  // D&D Beyond's left columns: Saving Throws, Senses and Proficiencies & Training over
  // Skills. Speeds and Defenses show once, in the top band and in the strip over the tabs.
  return `<section class="shp-derived${edit ? " is-edit" : ""}" data-shp-derived="${ctx.esc(id)}" aria-labelledby="shp-derived-${ctx.esc(attr(id))}"><div class="section-heading visually-hidden"><h2 id="shp-derived-${ctx.esc(attr(id))}">${ctx.t("Tiri salvezza, sensi e abilità", "Saving throws, senses and skills")}</h2><span class="badge">${edit ? ctx.t("Modifica · ingranaggi per le modifiche", "Edit · cogs for changes") : ctx.t("Gioco · valori effettivi", "Play · effective values")}</span></div><div class="shp-grid"><div class="shp-col shp-col-saves"><h3>${ctx.t("Tiri salvezza", "Saving throws")}</h3><ul class="shp-list">${saves}</ul>${saveRiders.length ? `<p class="shp-rider-note">${ctx.t("Effetti attivi sui TS", "Active effects on saves")}: ${ctx.esc(ridersText(ctx, saveRiders))}</p>` : ""}</div><div class="shp-col shp-col-senses"><h3>${ctx.t("Sensi", "Senses")}</h3><ul class="shp-facts"><li><span>${ctx.t("Percezione passiva", "Passive Perception")}</span>${passiveValue}</li><li><span>${ctx.t("Indagare passiva", "Passive Investigation")}</span><strong>${passiveOf("investigation")}</strong></li><li><span>${ctx.t("Intuizione passiva", "Passive Insight")}</span><strong>${passiveOf("insight")}</strong></li>${senseRows}</ul>${canEdit ? `<div class="shp-col-tools"><button type="button" class="button quiet" data-shp="senses">${icon("settings")} ${ctx.t("Gestisci sensi", "Manage senses")}</button><button type="button" class="button quiet" data-shp="speeds">${icon("settings")} ${ctx.t("Gestisci velocità", "Manage speeds")}</button></div>` : ""}</div>${trainingBox(ctx, actor)}<div class="shp-col shp-col-skills"><h3>${ctx.t("Abilità", "Skills")}</h3>${skills.pinned.length ? `<p class="shp-sub">★ ${ctx.t("Preferite in alto", "Favourites on top")}</p><ul class="shp-list shp-pinned">${skills.pinned.map(skillRow).join("")}</ul>` : ""}<ul class="shp-list">${[
    ...skills.standard,
  ]
    .sort((a, b) => ctx.label(a.name).localeCompare(ctx.label(b.name), ctx.lang))
    .map(skillRow)
    .join(
      "",
    )}</ul><h3>${ctx.t("Abilità aggiuntive", "Additional skills")}</h3>${skills.custom.length ? `<ul class="shp-list">${skills.custom.map(skillRow).join("")}</ul>` : `<p class="muted">${ctx.t("Abilità del tavolo, con caratteristica e competenza concordate.", "Table skills, with the agreed ability and proficiency.")}</p>`}${canEdit ? `<button type="button" class="button shp-add-skill" data-shp="skill-add">${icon("plus")} ${ctx.t("Aggiungi abilità", "Add skill")}</button>` : ""}${checkRiders.length ? `<p class="shp-rider-note">${ctx.t("Effetti attivi sulle prove", "Active effects on checks")}: ${ctx.esc(ridersText(ctx, checkRiders))}</p>` : ""}</div></div>${recent.length ? `<div class="shp-recent"><h3>${ctx.t("Tiri recenti dalla scheda", "Recent rolls from the sheet")}</h3><ul>${recent.map((r) => rollLine(ctx, r)).join("")}</ul></div>` : ""}</section>`;
}
// D&D Beyond's Proficiencies & Training box: what the sheet records — the weapon
// proficiencies the attack engine uses and the known languages. Nothing is inferred from a
// class name; an empty sheet says so.
function trainingBox(ctx, actor) {
  const weapons = (actor.combatProfile?.weaponProficiencies ?? []).map((weaponId) => {
    const name = weaponDefinition(null, weaponId)?.name;
    return name ? ctx.label(name) : weaponId;
  });
  let languages = [];
  try {
    languages = (knownLanguages(ctx.state, actor.id) ?? []).map((lang) =>
      languageName(lang, ctx.lang),
    );
  } catch {
    languages = [];
  }
  const rows = [
    [ctx.t("Armi", "Weapons"), weapons],
    [ctx.t("Lingue", "Languages"), languages],
  ]
    .filter(([, list]) => list.length)
    .map(([term, list]) => `<div><dt>${term}</dt><dd>${ctx.esc(list.join(", "))}</dd></div>`)
    .join("");
  return `<div class="shp-col shp-col-training"><h3>${ctx.t("Competenze e addestramento", "Proficiencies & training")}</h3>${rows ? `<dl class="shp-training">${rows}</dl>` : `<p class="muted">${ctx.t("Nessuna competenza registrata sulla scheda.", "No proficiencies recorded on the sheet.")}</p>`}</div>`;
}
function rollLine(ctx, r) {
  const d20 = r.values.filter((_, i) => r.dice[i].role === "d20");
  const riders = r.values
    .map((v, i) =>
      r.dice[i].role === "rider" ? `${r.dice[i].sign < 0 ? "−" : "+"}d${r.dice[i].sides} ${v}` : "",
    )
    .filter(Boolean);
  return `<li class="${r.live ? "" : "is-withdrawn"}" data-shp-roll="${ctx.esc(r.id)}"><strong>${lbl(ctx, r.label)}: ${r.total}</strong> <small>${d20.length ? `d20 ${d20.join("/")}${r.rollMode !== "normal" ? " (" + (r.rollMode === "advantage" ? ctx.t("vantaggio", "advantage") : ctx.t("svantaggio", "disadvantage")) + ")" : ""} ${D.signed(r.modifier)}` : ""}${riders.length ? " " + riders.join(" ") : ""} · ${r.mode === "physical" ? ctx.t("dadi fisici", "physical dice") : ctx.t("dadi digitali", "digital dice")}${r.status === "reused" ? " · " + ctx.t("facce riusate", "faces reused") : ""}${r.live ? "" : " · " + ctx.t("annullato: le facce restano e un nuovo tiro digitale uguale le riusa una volta", "undone: the faces stay and an identical new digital roll reuses them once")}</small></li>`;
}
function tableSenses(ctx, actorId) {
  const setting = ctx.state.ext?.["fog-vision"]?.tokens?.[actorId];
  if (!setting) return null;
  const out = {};
  for (const sense of D.SENSES)
    if (Number.isFinite(Number(setting[sense]))) out[sense] = Number(setting[sense]);
  return out;
}

// ------------------------------------------------------------------------------ actions tab: actions

// PG-38: the sheet's custom actions (quick bar area) listed with the others, D&D Beyond's
// «Manage Custom»: same filters, same economy groups.
function customActionRows(ctx, actorId) {
  const slice = ctx.state.ext?.[QB.ID];
  return QB.customActionsOf(slice, actorId).map((action) => {
    const view = QB.customView(ctx.state, actorId, action);
    return {
      ref: { kind: "custom", id: action.id },
      name: L(action.name, action.name),
      summary: view.summary,
      economy: ["action", "bonus", "reaction"].includes(action.activation)
        ? action.activation
        : "other",
      attack: Boolean(action.attack),
      limited: false,
      toHit: view.toHit,
      custom: true,
      notes: action.notes ?? "",
      source: null,
    };
  });
}
// C7 (BG3 Custom Mode, Solasta presets): a potion sits under the economy of the campaign's
// rule for drinking it: the SRD Bonus Action, or the Action of a house rule.
function potionRow(ctx, row) {
  if (row.ref.kind !== "item" || potionCost(ctx.state) !== "action") return row;
  return {
    ...row,
    economy: "action",
    summary: L(
      "Bevi: 2d4 + 2 PF, Azione (regola della casa).",
      "Drink: 2d4 + 2 HP, Action (house rule).",
    ),
  };
}
function renderActions(ctx, actor) {
  if (!actor || !D.sliceOf(ctx.state)) return "";
  const id = actor.id;
  const canEdit = ctx.canControl(actor);
  const rows = [
    ...D.actionList(ctx.state, id).map((row) => potionRow(ctx, row)),
    ...customActionRows(ctx, id),
  ];
  const filter = D.ACTION_FILTERS.includes(ui.filter) ? ui.filter : "all";
  const shown = D.filterActions(rows, filter);
  const attackRiders = D.activeRiders(ctx.state, id, "attack");
  const counts = Object.fromEntries(
    D.ACTION_FILTERS.map((f) => [f, D.filterActions(rows, f).length]),
  );
  const groups = ["action", "bonus", "reaction", "other"]
    .map((economy) => {
      const list = shown.filter((row) => row.economy === economy);
      if (!list.length) return "";
      const specific = list.filter((row) => !row.generic);
      const generic = list.filter((row) => row.generic);
      // D&D Beyond lists the generic 2024 actions in one line of rule links.
      return `<div class="shp-action-group" data-shp-economy="${economy}"><h3>${lbl(ctx, D.ACTION_FILTER_NAMES[economy])}</h3>${specific.length ? `<ul class="shp-action-list">${specific.map((row) => actionRow(ctx, actor, row, attackRiders, canEdit)).join("")}</ul>` : ""}${generic.length ? `<p class="shp-generic-line"><strong>${economy === "reaction" ? ctx.t("Reazioni di tutti (2024)", "Everyone’s reactions (2024)") : ctx.t("Azioni in combattimento (2024)", "Actions in combat (2024)")}:</strong> ${generic.map((row) => `<button type="button" class="shp-generic-open" data-shp="action-detail" data-kind="generic" data-id="${ctx.esc(row.ref.id)}" data-shp-action="${ctx.esc(row.ref.kind + ":" + row.ref.id)}" title="${ctx.esc(ctx.label(row.summary))}">${lbl(ctx, row.name)}</button>`).join("")}</p>` : ""}</div>`;
    })
    .join("");
  return `<section class="panel shp-actions" data-shp-actions="${ctx.esc(id)}"><div class="section-heading"><h2>${ctx.t("Azioni", "Actions")}</h2><span class="muted">${ctx.t("Attacchi per azione: 1", "Attacks per Action: 1")}</span>${canEdit && ctx.state.ext?.[QB.ID] ? `<button type="button" class="button quiet shp-small" data-shp="custom-new">${icon("plus")} ${ctx.t("Azione personalizzata", "Custom action")}</button>` : ""}</div><div class="shp-chips" role="group" aria-label="${ctx.t("Filtra per economia d’azione", "Filter by action economy")}">${D.ACTION_FILTERS.map(
    (f) =>
      `<button type="button" class="shp-chip" data-shp="filter" data-filter="${f}" aria-pressed="${f === filter}">${lbl(ctx, D.ACTION_FILTER_NAMES[f])} <small>${counts[f]}</small></button>`,
  ).join(
    "",
  )}</div>${attackRiders.length ? `<p class="shp-rider-note">${ctx.t("Effetti attivi sui tiri per colpire", "Active effects on attack rolls")}: ${ctx.esc(ridersText(ctx, attackRiders))}</p>` : ""}${groups || `<p class="muted">${ctx.t("Nessuna voce per questo filtro.", "Nothing for this filter.")}</p>`}<p class="muted shp-foot">${ctx.t("Il tiro per colpire dalla scheda non ha bersaglio; contro una creatura usa il Tavolo, che applica colpo, danni e reazioni.", "An attack roll from the sheet has no target; against a creature use the Table, which applies hit, damage and reactions.")} ${ctx.esc(D.pagesText(D.SOURCES.actions))}</p></section>`;
}
/** PG-40: an action's tooltip: what it does, the attack's parts and its source. */
function actionTip(ctx, row, attack, riders) {
  const parts = attack
    ? `<ul>${partsHTML(ctx, attack.parts)}${riders.map((r) => `<li><span>${lbl(ctx, r.name)}</span><strong>${ctx.esc(D.riderText(r, ctx.lang).split(" ")[0])}</strong></li>`).join("")}</ul>${attack.dice?.length ? `<p>${ctx.t("Danni", "Damage")}: ${ctx.esc(attack.dice.map((d) => `${d.count}d${d.sides}`).join(" + "))}</p>` : ""}`
    : "";
  return `<strong class="shp-tip-title">${lbl(ctx, row.name)}${attack ? " " + ctx.esc(D.signed(attack.toHit)) : ""}</strong>${ctx.label(row.summary) ? `<p>${lbl(ctx, row.summary)}</p>` : ""}${parts}${row.uses && Number.isInteger(row.uses.max) ? `<p>${ctx.t("Usi", "Uses")}: ${row.uses.used === null ? "×" + row.uses.max : `${row.uses.max - row.uses.used}/${row.uses.max}`}</p>` : ""}${sourceLine(ctx, row.source)}<small class="shp-tip-hint">${ctx.t("Clic sul nome: fissa il dettaglio", "Click the name: pin the detail")}</small>`;
}
/** D&D Beyond's «Limited Use» boxes: one pip per use, filled when spent (PG-34). */
export function usePips(ctx, featureId, uses, canEdit, name) {
  if (!uses || !Number.isInteger(uses.max) || uses.max < 1 || uses.max > 20) return "";
  const used = Number.isInteger(uses.used) ? uses.used : 0;
  return `<span class="shp-pips" role="group" aria-label="${ctx.esc(ctx.t(`${name}: ${Math.max(0, uses.max - used)} usi su ${uses.max}`, `${name}: ${Math.max(0, uses.max - used)} of ${uses.max} uses left`))}">${Array.from(
    { length: uses.max },
    (_, i) => {
      const spent = i < used;
      const label = ctx.t(
        `Uso ${i + 1} di ${uses.max}: ${spent ? "speso, clic per recuperarlo" : "disponibile, clic per spenderlo"}`,
        `Use ${i + 1} of ${uses.max}: ${spent ? "spent, click to regain it" : "available, click to spend it"}`,
      );
      return canEdit
        ? `<button type="button" class="shp-pip${spent ? " is-spent" : ""}" data-shp="pip" data-id="${ctx.esc(featureId)}" data-index="${i}" aria-pressed="${spent}" aria-label="${ctx.esc(label)}" title="${ctx.esc(label)}"></button>`
        : `<span class="shp-pip${spent ? " is-spent" : ""}" aria-hidden="true"></span>`;
    },
  ).join("")}</span>`;
}
/** Sets a limited feature's spent uses (a pip or «Ripristina»): 0 ≤ used ≤ max. */
export function setFeatureUsed(actor, featureId, used) {
  const feature = (actor?.features ?? []).find((f) => f.id === featureId);
  if (!feature || !Number.isInteger(feature.max))
    throw D.fail("Capacità senza contatore.", "Feature without a counter.");
  if (!Number.isInteger(used) || used < 0 || used > feature.max)
    throw D.fail("Usi fuori dal massimo.", "Uses outside the maximum.");
  feature.used = used;
  if (actor.featureUsageLedger?.[feature.id])
    actor.featureUsageLedger[feature.id] = { ...actor.featureUsageLedger[feature.id], used };
  return feature;
}
function isWildShape(actor, row) {
  if (row.ref.kind !== "feature") return false;
  const feature = (actor.features ?? []).find((f) => f.id === row.ref.id);
  return (
    actor.formsProfile?.wildShapeFeatureId === row.ref.id ||
    /(^|:)wild-shape$/.test(String(feature?.definitionId ?? row.ref.id))
  );
}
/** PG-37: the weapon's property chips and its mastery, from the SRD weapon definition. */
function weaponChips(ctx, actor, attack) {
  const item = (actor.inventory ?? []).find((r) => r.id === attack?.itemId) ?? null;
  const def = weaponDefinition(item, attack?.id ?? "");
  if (!def) return "";
  const w = def.weapon;
  const chips = w.properties.map((prop) => {
    const extra =
      prop === "versatile" && w.versatile
        ? " " + w.versatile
        : prop === "range" || prop === "thrown"
          ? w.range
            ? ` ${formatRange(ctx, w.range)}`
            : ""
          : "";
    const rule = WEAPON_PROPERTY_RULES[prop];
    return `<button type="button" class="shp-prop" data-shp="weapon-rule" data-rule="property:${prop}" data-weapon="${ctx.esc(def.id)}" title="${ctx.esc(ctx.label(rule ?? ""))}">${lbl(ctx, LABELS.weaponProperty[prop] ?? { it: prop, en: prop })}${ctx.esc(extra)}</button>`;
  });
  if (w.mastery)
    chips.push(
      `<button type="button" class="shp-prop is-mastery" data-shp="weapon-rule" data-rule="mastery:${w.mastery}" data-weapon="${ctx.esc(def.id)}" title="${ctx.esc(ctx.label(MASTERY_RULES[w.mastery] ?? ""))}">${ctx.t("Padronanza", "Mastery")}: ${lbl(ctx, LABELS.mastery[w.mastery])}</button>`,
    );
  return `<span class="shp-props" role="group" aria-label="${ctx.esc(ctx.t("Proprietà dell’arma", "Weapon properties"))}">${chips.join("")}</span>`;
}
const formatRange = (ctx, range) =>
  ctx.lang === "it"
    ? `${formatDistance(range.normal, "it").slice(0, -2)}/${formatDistance(range.long, "it")}`
    : `${range.normal}/${range.long} ft`;
function actionRow(ctx, actor, row, attackRiders, canEdit) {
  const fav = row.custom ? false : D.isFavorite(ctx.state, actor.id, row.ref);
  const name = ctx.label(row.name);
  const economyBadge = `<span class="badge shp-econ shp-econ-${row.economy}">${lbl(ctx, D.ACTION_FILTER_NAMES[row.economy])}</span>`;
  const pips =
    row.ref.kind === "feature" && row.uses ? usePips(ctx, row.ref.id, row.uses, canEdit, name) : "";
  const uses = pips
    ? `<small class="shp-uses">${ctx.t(`${row.uses.max - row.uses.used} di ${row.uses.max}`, `${row.uses.max - row.uses.used} of ${row.uses.max}`)}</small>`
    : row.uses
      ? `<small class="shp-uses">${row.uses.used === null ? "×" + row.uses.max : ctx.t(`${row.uses.max - row.uses.used} di ${row.uses.max} usi`, `${row.uses.max - row.uses.used} of ${row.uses.max} uses`)}</small>`
      : "";
  const attack =
    row.ref.kind === "attack"
      ? D.sheetAttacks(ctx.state, actor.id).find((a) => a.id === row.ref.id)
      : null;
  let use = "";
  if (row.ref.kind === "attack" && !canEdit) use = staticValue(ctx, signedText(row.toHit));
  else if (row.ref.kind === "attack")
    use = `<button type="button" class="shp-value" data-shp="roll" data-kind="attack" data-subject="${ctx.esc(row.ref.id)}" aria-label="${ctx.esc(ctx.t(`Tiro per colpire con ${name} ${D.signed(row.toHit)}${attackRiders.length ? " " + ridersText(ctx, attackRiders) : ""}`, `Attack roll with ${name} ${D.signed(row.toHit)}${attackRiders.length ? " " + ridersText(ctx, attackRiders) : ""}`))}">${ctx.esc(signedText(row.toHit))}</button>`;
  else if (row.custom && canEdit)
    use = `<button type="button" class="${row.attack ? "shp-value" : "button"}" data-shp="custom-roll" data-id="${ctx.esc(row.ref.id)}" aria-label="${ctx.esc(ctx.t(`Usa ${name}`, `Use ${name}`))}">${row.attack && Number.isFinite(row.toHit) ? ctx.esc(signedText(row.toHit)) : ctx.t("Tira", "Roll")}</button>`;
  else if (row.ref.kind === "item" && canEdit) {
    const item = (getEffectiveActor(actor)?.inventory ?? []).find((r) => r.id === row.ref.id);
    use = `<button type="button" class="button" data-character-action="use-healing" data-item="${ctx.esc(row.ref.id)}"${offReason(ctx, "drink-" + row.ref.id, potionBlock(ctx.state, actor, item))}>${ctx.t("Bevi", "Drink")}</button>${whyReason(ctx, "drink-" + row.ref.id, potionBlock(ctx.state, actor, item))}`;
  } else if (row.ref.kind === "feature" && canEdit && isWildShape(actor, row) && ctx.openForms)
    // PG-77: «Usa» on Wild Shape opens the form picker: the use is spent with the transformation.
    use = `<button type="button" class="button primary" data-shp="wild-shape" data-id="${ctx.esc(row.ref.id)}"${offReason(ctx, "use-" + row.ref.id, row.uses.used < row.uses.max ? null : NO_USES)}>${ctx.t("Trasformati", "Transform")}</button>${whyReason(ctx, "use-" + row.ref.id, row.uses.used < row.uses.max ? null : NO_USES)}`;
  else if (row.ref.kind === "feature" && canEdit)
    use = `<button type="button" class="button" data-shp="use" data-kind="feature" data-id="${ctx.esc(row.ref.id)}"${offReason(ctx, "use-" + row.ref.id, row.uses.used < row.uses.max ? null : NO_USES)}>${ctx.t("Usa", "Use")}</button>${whyReason(ctx, "use-" + row.ref.id, row.uses.used < row.uses.max ? null : NO_USES)}${row.uses.used > 0 ? `<button type="button" class="button quiet" data-shp="restore" data-id="${ctx.esc(row.ref.id)}">${ctx.t("Ripristina", "Reset")}</button>` : ""}`;
  const summary = row.custom
    ? `${lbl(ctx, row.summary)}${row.notes ? " · " + ctx.esc(row.notes) : ""}`
    : glossaryText(ctx, row.summary);
  return `<li class="shp-action" data-shp-action="${ctx.esc(row.ref.kind + ":" + row.ref.id)}">${canEdit && !row.custom ? star(ctx, fav, name, row.ref.kind, row.ref.id) : ""}<div class="shp-action-copy">${tipName(ctx, "action-" + row.ref.kind + "-" + row.ref.id, `<strong>${ctx.esc(name)}</strong>`, actionTip(ctx, row, attack, attackRiders), name)} ${economyBadge}${row.custom ? ` <span class="badge">${ctx.t("personalizzata", "custom")}</span>` : ""}${row.attack && row.ref.kind === "attack" && attackRiders.length ? riderBadges(ctx, attackRiders) : ""}${pips}${uses}${attack ? weaponChips(ctx, actor, attack) : ""}<p>${summary}</p></div><div class="shp-action-tools">${use}${row.custom ? "" : `<button type="button" class="button quiet" data-shp="action-detail" data-kind="${ctx.esc(row.ref.kind)}" data-id="${ctx.esc(row.ref.id)}">${ctx.t("Dettagli", "Details")}</button>`}</div></li>`;
}
/** BI-05: rule words in sheet texts are the compendium's glossary terms (hover, tap, pin,
 *  «Applica…»), the same markup compendium.mjs renders; bindGlossary wires them. */
export function glossaryText(ctx, value) {
  const text = ctx.label(value ?? "");
  if (!text) return "";
  try {
    return linkTerms(text, ctx.lang)
      .map((segment) =>
        segment.term
          ? `<button type="button" class="compendium-term" data-compendium-term="${ctx.esc(segment.term)}" aria-expanded="false">${ctx.esc(segment.text)}</button>`
          : ctx.esc(segment.text),
      )
      .join("");
  } catch {
    return ctx.esc(text);
  }
}
let compendiumModule = null;
/** Binds glossary terms with the compendium's own tooltip (loaded on demand: no cycle). */
export function bindGlossary(el, ctx) {
  if (!el?.querySelector?.("[data-compendium-term]")) return;
  compendiumModule ??= import("./compendium.mjs").catch(() => null);
  compendiumModule.then((mod) => mod?.bindTerms?.(el, ctx));
}

// ------------------------------------------------------------------------------ story tab: notes

function renderNotes(ctx, actor) {
  if (!actor || !D.sliceOf(ctx.state)) return "";
  const id = actor.id;
  const notes = D.readableNotes(ctx.state, id, ctx.role);
  const current = ["all", ...D.NOTE_SECTIONS].includes(ui.notes) ? ui.notes : "all";
  const canEdit = ctx.canControl(actor);
  const sections = (current === "all" ? D.NOTE_SECTIONS : [current])
    .map((section) => {
      const list = notes.filter((n) => n.section === section);
      return `<div class="shp-note-section" data-shp-note-section="${section}"><div class="shp-note-head"><h3>${lbl(ctx, D.NOTE_SECTION_NAMES[section])}</h3><button type="button" class="button quiet shp-small" data-shp="note-add" data-section="${section}">${icon("plus")} ${ctx.t("Aggiungi", "Add")}</button></div>${list.length ? `<ul class="shp-note-list">${list.map((n) => noteRow(ctx, actor, n, canEdit)).join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna nota.", "No notes.")}</p>`}</div>`;
    })
    .join("");
  return `<section class="panel shp-notes" data-shp-notes="${ctx.esc(id)}"><div class="section-heading"><h2>${ctx.t("Note", "Notes")}</h2><button type="button" class="button" data-shp="note-add" data-section="${current === "all" ? "other" : current}">${icon("plus")} ${ctx.t("Aggiungi nota", "Add note")}</button></div><p class="muted">${ctx.t("Le note «Scheda» le legge chi consulta la scheda; quelle «Solo io» restano tue, anche per il DM.", "“Sheet” notes are read by whoever views the sheet; “Only me” notes stay yours, the DM included.")}</p><div class="shp-chips" role="group" aria-label="${ctx.t("Filtra le note", "Filter notes")}">${[
    "all",
    ...D.NOTE_SECTIONS,
  ]
    .map(
      (s) =>
        `<button type="button" class="shp-chip" data-shp="notes-filter" data-filter="${s}" aria-pressed="${s === current}">${s === "all" ? ctx.t("Tutte", "All") : lbl(ctx, D.NOTE_SECTION_NAMES[s])} <small>${s === "all" ? notes.length : notes.filter((n) => n.section === s).length}</small></button>`,
    )
    .join("")}</div>${sections}</section>`;
}
function noteRow(ctx, actor, note, canEdit) {
  const mine = note.audience === "me";
  const editable = mine ? note.author === ctx.role : canEdit;
  return `<li class="shp-note" data-shp-note="${ctx.esc(note.id)}"><div><strong>${ctx.esc(note.title)}</strong> ${mine ? `<span class="badge shp-private">${ctx.t("Solo io", "Only me")}</span>` : ""}<p class="character-multiline">${ctx.esc(note.text)}</p></div>${editable ? `<div class="shp-note-tools"><button type="button" class="button quiet" data-shp="note-edit" data-note="${ctx.esc(note.id)}">${ctx.t("Modifica", "Edit")}</button><button type="button" class="button quiet" data-shp="note-remove" data-note="${ctx.esc(note.id)}">${ctx.t("Togli", "Remove")}</button></div>` : ""}</li>`;
}

// ------------------------------------------------------------------------------ features tab: reselect

function renderReselect(ctx, actor) {
  if (!actor || !D.sliceOf(ctx.state)) return "";
  const id = actor.id;
  const rows = D.reselectState(ctx.state, id);
  const edit = editing(ctx, actor);
  const canEdit = ctx.canControl(actor);
  if (!rows.length && !edit) return "";
  const optionName = (row, optionId) =>
    ctx.label(row.options?.find((o) => o.id === optionId)?.name ?? optionId);
  return `<section class="panel shp-reselect" data-shp-reselect="${ctx.esc(id)}"><div class="section-heading"><h2>${ctx.t("Scelte da rivedere dopo un riposo", "Choices to revise after a rest")}</h2>${edit ? `<button type="button" class="button" data-shp="reselect-add">${icon("plus")} ${ctx.t("Aggiungi scelta", "Add choice")}</button>` : ""}</div>${
    rows.length
      ? `<ul class="shp-reselect-list">${rows
          .map(
            (row) =>
              `<li class="shp-reselect-row${row.pending ? " is-pending" : ""}" data-shp-reselect-row="${ctx.esc(row.id)}"><div><strong>${lbl(ctx, row.name)}</strong> <span class="badge">${row.trigger === "short" ? ctx.t("Riposo breve o lungo", "Short or Long Rest") : ctx.t("Riposo lungo", "Long Rest")}</span>${row.pending ? ` <span class="badge shp-pending">${ctx.t("Da rivedere ora", "To revise now")}</span>` : ""}${
                row.external
                  ? `<p class="muted">${ctx.t("Gestita dal pannello delle forme.", "Managed in the forms panel.")}</p>`
                  : `<p>${row.chosen.map((c) => `<span class="shp-choice">${ctx.esc(optionName(row, c))}</span>`).join(" ")}</p><p class="muted">${ctx.esc(ctx.t(`Dopo il riposo cambi fino a ${row.changeLimit} ${row.changeLimit === 1 ? "scelta" : "scelte"} su ${row.count}.`, `After the rest change up to ${row.changeLimit} of ${row.count} ${row.count === 1 ? "choice" : "choices"}.`))}${row.note ? " " + ctx.esc(row.note) : ""}</p>${
                      row.history?.length
                        ? `<p class="muted">${ctx.t("Ultima revisione", "Last revision")}: ${ctx.esc(
                            row.history
                              .at(-1)
                              .to.map((c) => optionName(row, c))
                              .join(", "),
                          )}</p>`
                        : ""
                    }`
              }${sourceLine(ctx, row.source)}</div><div class="shp-note-tools">${row.pending && canEdit ? (row.external === "forms" ? `<button type="button" class="button" data-shp="forms-known">${ctx.t("Apri le forme", "Open forms")}</button>` : `<button type="button" class="button primary" data-shp="reselect" data-reselect="${ctx.esc(row.id)}">${ctx.t("Rivedi", "Revise")}</button><button type="button" class="button quiet" data-shp="reselect-keep" data-reselect="${ctx.esc(row.id)}">${ctx.t("Tieni", "Keep")}</button>`) : ""}${edit && !row.external ? `<button type="button" class="button quiet" data-shp="reselect-remove" data-reselect="${ctx.esc(row.id)}">${ctx.t("Togli", "Remove")}</button>` : ""}</div></li>`,
          )
          .join("")}</ul>`
      : `<p class="muted">${ctx.t("Nessuna scelta segnata: aggiungine una per avere il promemoria dopo il riposo.", "No choice flagged: add one to get the reminder after the rest.")}</p>`
  }</section>`;
}

// ------------------------------------------------------------------------------ table: inspector

/** PG-39 (dnd5e Favourites, kept at the Table): the sheet's favourites in the hotbar's
 *  quick-bar page; a click rolls at once, right-click or a long press opens the options. */
function renderFavouritesDock(ctx, tableView) {
  const id = tableView?.selectedActorId;
  const actor = id ? ctx.state.actors[id] : null;
  if (!actor || !ctx.canControl(actor) || !D.sliceOf(ctx.state)) return "";
  const favorites = D.resolveFavorites(ctx.state, id).filter(
    (fav) => fav.available && (QUICK_ROLL.has(fav.ref.kind) || fav.ref.kind === "feature"),
  );
  if (!favorites.length) return "";
  return `<div class="shp-fav-dock" data-shp-dock="${ctx.esc(id)}" role="group" aria-label="${ctx.esc(ctx.t(`Preferiti di ${actor.name}`, `${actor.name}’s favourites`))}"><span class="shp-row-label">★ ${ctx.t("Preferiti", "Favourites")}</span>${favorites
    .map(
      (fav) =>
        `<button type="button" class="shp-fav-use" data-shp="use" data-kind="${ctx.esc(fav.ref.kind)}" data-id="${ctx.esc(fav.ref.id)}" data-fav="1" title="${ctx.esc(QUICK_ROLL.has(fav.ref.kind) ? ctx.t("Clic: tira subito · clic destro o pressione lunga: opzioni", "Click: roll now · right-click or long press: options") : ctx.t("Clic: usa", "Click: use"))}">${lbl(ctx, fav.name)}${Number.isFinite(fav.value) ? ` <strong>${ctx.esc(QUICK_ROLL.has(fav.ref.kind) ? signedText(fav.value) : String(fav.value))}</strong>` : ""}${fav.uses ? ` <small>${fav.uses.used === null ? "×" + fav.uses.max : fav.uses.max - fav.uses.used + "/" + fav.uses.max}</small>` : ""}</button>`,
    )
    .join("")}</div>`;
}
function renderTablePanel(ctx, tableView) {
  const id = tableView?.selectedActorId;
  const actor = id ? ctx.state.actors[id] : null;
  if (!actor || !ctx.canControl(actor) || !D.sliceOf(ctx.state)) return "";
  const speeds = D.speedsOf(ctx.state, id);
  const modes = D.SPEED_MODES.filter((m) => speeds[m]);
  const moving = D.currentMovementMode(ctx.state, id);
  const effects = D.effectList(ctx.state, id).filter((e) => e.active);
  const defenses = D.collapsedDefenses(ctx.state, id);
  const init = D.statValue(ctx.state, id, "initiative").total;
  const passive = D.statValue(ctx.state, id, "passive-perception").total;
  const remaining = ctx.state.combat?.active ? actor.movement : getEffectiveSpeed(actor);
  return `<div class="shp-table" data-shp-table="${ctx.esc(id)}">${modes.length > 1 ? `<div class="shp-table-row"><span class="shp-row-label">${ctx.t("Muoviti", "Move by")}</span><div class="shp-mode shp-move" role="group" aria-label="${ctx.t("Velocità da usare", "Speed to use")}">${modes.map((m) => `<button type="button" data-shp="move-mode" data-mode="${m}" aria-pressed="${m === moving}">${lbl(ctx, D.SPEED_NAMES[m])} ${speeds[m]} m</button>`).join("")}</div></div><p class="muted">${ctx.esc(ctx.t(`In uso: ${ctx.label(D.SPEED_NAMES[moving])} · movimento ${remaining} m. Cambiando, la distanza già percorsa si sottrae dalla nuova velocità.`, `In use: ${ctx.label(D.SPEED_NAMES[moving])} · movement ${remaining} m. Switching subtracts the distance already moved from the new speed.`))}</p>` : ""}${effects.length ? `<div class="shp-table-row"><span class="shp-row-label">${ctx.t("Effetti", "Effects")}</span><ul class="shp-table-effects">${effects.map((e) => `<li><strong>${lbl(ctx, e.name)}</strong> ${ctx.esc(e.dice ? `${e.sign < 0 ? "−" : "+"}${e.dice.count}d${e.dice.sides}` : signedText(e.sign * e.flat))} · ${ctx.esc(e.appliesTo.map((k) => ctx.label(D.ROLL_KIND_NAMES[k])).join(", "))}${e.dice ? `<button type="button" class="button quiet shp-small" data-shp="rider-roll" data-effect="${ctx.esc(e.id)}">${icon("dice")} ${ctx.t("Tira", "Roll")} ${e.dice.count}d${e.dice.sides}</button>` : ""}<button type="button" class="button quiet shp-small" data-shp="effect" data-effect="${ctx.esc(e.id)}">${ctx.t("Disattiva", "Turn off")}</button></li>`).join("")}</ul><p class="muted">${ctx.t("Il dado dell’effetto si tira insieme al d20 nei tiri a cui si applica (al Tavolo, nelle richieste del DM e nella scheda) ed entra nel totale. «Tira» serve per un tiro fatto fuori dall’app.", "The effect die is rolled with the d20 of the rolls it applies to (at the Table, in the DM’s requests and on the sheet) and adds to the total. “Roll” is for a roll made outside the app.")}</p></div>` : ""}${defenses.length ? `<p class="shp-table-row"><span class="shp-row-label">${ctx.t("Difese", "Defenses")}</span> ${defenses.map((d) => `${lbl(ctx, D.DEFENSE_NAMES[d.kind])}: ${lbl(ctx, d.name)}${d.marker}`).join(" · ")}</p>` : ""}<p class="shp-table-row"><span class="shp-row-label">${ctx.t("Iniziativa", "Initiative")}</span> ${signedText(init)} · <span class="shp-row-label">${ctx.t("Percezione passiva", "Passive Perception")}</span> ${passive}</p></div>`;
}

// ------------------------------------------------------------------------------ dialogs

function statDialog(ctx, actorId, key) {
  let actor;
  try {
    actor = D.readable(ctx.state, actorId, ctx.role);
  } catch {
    return;
  }
  const stat = D.statValue(ctx.state, actorId, key);
  const canEdit = ctx.canControl(actor);
  // In a form the form's values apply: its changes wait for the return (no add or remove).
  const edit = editing(ctx, actor) && !stat.form;
  const riders =
    stat.kind === "save"
      ? D.activeRiders(ctx.state, actorId, "save")
      : ["skill", "custom-skill", "initiative"].includes(stat.kind)
        ? D.activeRiders(ctx.state, actorId, "check")
        : [];
  const rollable = ["save", "skill", "custom-skill", "initiative"].includes(stat.kind);
  const rollKind =
    stat.kind === "save" ? "save" : stat.kind === "initiative" ? "initiative" : "skill";
  const rollSubject =
    stat.kind === "save" ? key.slice(5) : stat.kind === "initiative" ? "initiative" : key.slice(6);
  const steps = stat.steps.length
    ? `<ol class="shp-chain">${stat.steps
        .map(
          (step) =>
            `<li class="${step.applied ? "" : "shp-step-off"}"><span><strong>${lbl(ctx, D.OP_NAMES[step.op])} ${ctx.esc(step.op === "add" ? D.signed(step.value) : String(step.value))}</strong> · ${ctx.esc(step.note)} <small>(${step.by === "dm" ? "DM" : ctx.t("giocatore", "player")})</small></span><span>${step.before} → ${step.after}${step.applied ? "" : " · " + ctx.t("non applicata", "not applied")}</span>${edit ? `<button type="button" class="button quiet shp-small" data-shp-dialog="remove-mod" data-mod="${ctx.esc(step.id)}">${ctx.t("Togli", "Remove")}</button>` : ""}</li>`,
        )
        .join("")}</ol>`
    : `<p class="muted">${ctx.t("Nessuna modifica: vale il valore di base.", "No changes: the base value applies.")}</p>`;
  const form = edit
    ? `<fieldset class="shp-fieldset"><legend>${ctx.t("Aggiungi una modifica motivata", "Add a reasoned change")}</legend><div class="form-grid"><label class="field"><span>${ctx.t("Tipo", "Kind")}</span><select name="op">${D.OPS.map((op) => `<option value="${op}" ${op === "add" ? "selected" : ""}>${lbl(ctx, D.OP_NAMES[op])}</option>`).join("")}</select></label><label class="field"><span>${ctx.t("Valore", "Value")}</span><input name="value" type="number" step="any" min="-99" max="99" inputmode="numeric" value="1"></label></div><label class="field"><span>${ctx.t("Motivo (resta accanto al valore)", "Reason (stays next to the value)")}</span><input name="note" maxlength="120" placeholder="${ctx.esc(ctx.t("es. Anello di protezione", "e.g. Ring of Protection"))}"></label><p class="muted">${ctx.t("Ordine di applicazione: base → somme → almeno / al massimo → moltiplica → sostituisci. Più basi: vale la migliore.", "Order: base → additions → at least / at most → multiply → override. Several bases: the best one applies.")}</p></fieldset>`
    : canEdit && !stat.form && !editing(ctx, actor)
      ? `<p class="muted">${ctx.t("Per cambiare i valori passa a Modifica: le modifiche chiedono un motivo.", "To change values switch to Edit: changes ask for a reason.")}</p><button type="button" class="button" data-shp-dialog="to-edit">${icon("pen")} ${ctx.t("Passa a Modifica", "Switch to Edit")}</button>`
      : "";
  const body = `<div class="shp-dialog" data-shp-stat-dialog="${ctx.esc(key)}"><p class="shp-total">${ctx.t("Totale", "Total")}: <strong>${ctx.esc(stat.kind === "ac" || stat.kind === "passive-perception" ? String(stat.total) : D.signed(stat.total))}</strong>${riders.length ? ` <span>${ctx.esc(ridersText(ctx, riders))}</span>` : ""}</p>${stat.form ? `<p class="shp-warn">${ctx.t("Forma attiva: vale il valore della forma; le modifiche della scheda tornano al ritorno alla forma normale.", "Active form: the form’s value applies; the sheet’s changes return with the normal form.")}</p>` : ""}${stat.drift ? `<div class="shp-notice"><span>${ctx.esc(ctx.t(`La scheda ora dice ${stat.field}; con queste modifiche il totale era ${stat.chainTotal}. Riallinea per usare il nuovo valore come base.`, `The sheet now says ${stat.field}; with these changes the total was ${stat.chainTotal}. Realign to use the new value as the base.`))}</span>${canEdit ? `<button type="button" class="button primary" data-shp-dialog="realign">${ctx.t("Riallinea", "Realign")}</button>` : ""}</div>` : ""}<h3>${ctx.t("Base", "Base")} ${ctx.esc(stat.kind === "ac" || stat.kind === "passive-perception" ? String(stat.base) : D.signed(stat.base))}</h3><ul class="shp-parts">${partsHTML(ctx, stat.baseParts)}</ul>${sourceLine(ctx, stat.source)}<h3>${ctx.t("Modifiche nell’ordine di cumulo", "Changes in stacking order")}</h3>${steps}${extraParts(stat).length ? `<h3>${ctx.t("Oggetti indossati e condizioni", "Worn items and conditions")}</h3><ul class="shp-parts">${partsHTML(ctx, extraParts(stat))}</ul>${stat.itemParts?.length ? `<p class="muted">${ctx.t("Un oggetto conta finché lo indossi (e sei in sintonia, se la richiede): per toglierlo riponilo nell’Inventario.", "An item counts while you wear it (and are attuned, when it requires it): unequip it in the Inventory to remove it.")}</p>` : ""}` : ""}${riders.length ? `<h3>${ctx.t("Effetti attivi", "Active effects")}</h3><ul class="shp-parts">${riders.map((r) => `<li><span>${lbl(ctx, r.name)}</span><strong>${ctx.esc(D.riderText(r, ctx.lang).split(" ")[0])}</strong>${r.source ? sourceLine(ctx, r.source) : ""}</li>`).join("")}</ul>` : ""}${form}${rollable && canEdit ? `<p><button type="button" class="button" data-shp-dialog="roll">${icon("dice")} ${ctx.t("Tira", "Roll")}</button></p>` : ""}</div>`;
  ctx.dialog(`${ctx.label(stat.name)} · ${actor.name}`, body, {
    submitLabel: edit ? ctx.t("Aggiungi modifica", "Add change") : undefined,
    cancelLabel: ctx.t("Chiudi", "Close"),
    onSubmit: edit
      ? (data) => {
          commitSheet(
            ctx,
            actorId,
            ctx.t(
              `${ctx.label(stat.name)}: modifica «${String(data.get("note") ?? "").trim()}»`,
              `${ctx.label(stat.name)}: change “${String(data.get("note") ?? "").trim()}”`,
            ),
            (draft) =>
              D.addModifier(
                draft,
                actorId,
                key,
                { op: data.get("op"), value: data.get("value"), note: data.get("note") },
                ctx.role,
              ),
          );
          queueMicrotask(() => statDialog(ctx, actorId, key));
        }
      : undefined,
  });
  bindDialog(ctx, {
    "remove-mod": (button) => {
      commitSheet(
        ctx,
        actorId,
        ctx.t(`${ctx.label(stat.name)}: modifica tolta`, `${ctx.label(stat.name)}: change removed`),
        (draft) => D.removeModifier(draft, actorId, key, button.dataset.mod, ctx.role),
      );
      statDialog(ctx, actorId, key);
    },
    realign: () => {
      commitSheet(
        ctx,
        actorId,
        ctx.t(`${ctx.label(stat.name)}: riallineata`, `${ctx.label(stat.name)}: realigned`),
        (draft) => D.realignStat(draft, actorId, key, ctx.role),
      );
      statDialog(ctx, actorId, key);
    },
    "to-edit": () => {
      setMode(ctx, "edit");
      statDialog(ctx, actorId, key);
    },
    roll: () => rollDialog(ctx, actorId, rollKind, rollSubject),
  });
}
// C8 (D&D Beyond): while the combat waits for this creature's Initiative, clicking the
// sheet's Initiative rolls it (the roll window, digital or physical) instead of the details.
function openStat(ctx, actorId, key) {
  if (key === "initiative" && awaitsInitiative(ctx, actorId))
    return rollDialog(ctx, actorId, "initiative", "initiative");
  return statDialog(ctx, actorId, key);
}
function bindDialog(ctx, handlers) {
  const root = globalThis.document?.querySelector("#dialog");
  if (!root) return;
  // Enter in a field marked data-shp-enter runs its button (the dialog has no submit).
  root.querySelectorAll("[data-shp-enter]").forEach((field) =>
    field.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      root.querySelector(`[data-shp-dialog="${field.dataset.shpEnter}"]`)?.click();
    }),
  );
  root.querySelectorAll("[data-shp-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      const run = handlers[button.dataset.shpDialog];
      if (!run) return;
      try {
        run(button);
      } catch (error) {
        dialogError(ctx, error);
      }
    });
  });
}
function setMode(ctx, mode) {
  (area ?? ctx.registry).setSetting(ctx, "sheet-plus.mode", mode === "edit" ? "edit" : "play");
}

/** The roll dialog: digital or physical dice, normal/advantage/disadvantage, riders. */
function rollDialog(ctx, actorId, kind, subject) {
  const actor = ctx.state.actors[actorId];
  if (!actor || !ctx.canControl(actor)) return;
  const profile = D.rollProfile(ctx.state, actorId, kind, subject);
  const noD20 = kind === "rider";
  // H-03 (D&D Beyond): the dialog opens with the engine's mode, so a Poisoned check or a
  // character's «always disadvantage» shows both d20 fields for physical dice at once.
  const preset = noD20 ? "normal" : D.effectiveRollMode(profile, "normal");
  // C8 (D&D Beyond: the sheet's Initiative rolls into the encounter): while the tracker
  // waits for this creature's Initiative, the roll goes into the turn order.
  const encounter = kind === "initiative" && awaitsInitiative(ctx, actorId);
  const dice = D.rollDice(profile, "advantage");
  const faceFields = dice
    .map(
      (d, i) =>
        `<label class="field" ${d.role === "d20" && i === 1 ? `data-shp-second${preset === "normal" ? " hidden" : ""}` : ""}><span>${d.role === "d20" ? `d20${i === 1 ? " (2)" : ""}` : `d${d.sides} · ${ctx.esc(ctx.label(profile.riders.find((r) => r.id === d.riderId)?.name ?? ""))}`}</span><input name="face${i}" type="number" min="1" max="${d.sides}" inputmode="numeric" data-shp-face="${i}"></label>`,
    )
    .join("");
  const formula = `${noD20 ? "" : "d20 " + D.signed(profile.modifier)}${profile.riders.length ? " " + ridersText(ctx, profile.riders) : ""}`;
  const radio = (value, it, en) =>
    `<label class="shp-radio"><input type="radio" name="rollMode" value="${value}"${value === preset ? " checked" : ""}> ${ctx.t(it, en)}</label>`;
  // TV-95 (Pixels in Foundry, Roll20 and D&D Beyond): a paired d20 answers the throw.
  const connected = !noD20 && hasConnected(ctx, 20);
  // The remembered dice for rolls in place (review P2-6 of B34): a physical-dice player is
  // asked the faces at once; digital stays one click away for this roll.
  const savedDice = rememberedDice(ctx);
  const presetNote =
    preset !== "normal"
      ? `<p class="muted shp-preset">${ctx.t(`Scelto dalla scheda: ${preset === "advantage" ? "vantaggio" : "svantaggio"} (vedi sopra).`, `Chosen by the sheet: ${preset} (see above).`)}</p>`
      : "";
  const body = `<div class="shp-dialog shp-roll">${encounter ? `<p class="shp-notice" data-shp-initiative-encounter>${ctx.t("Il combattimento aspetta la tua iniziativa: il risultato entra nell’ordine dei turni.", "The combat is waiting for your Initiative: the result goes into the turn order.")}</p>` : ""}<p class="shp-total"><strong>${ctx.esc(formula.trim())}</strong></p><ul class="shp-parts">${partsHTML(ctx, profile.parts)}${profile.riders.map((r) => `<li><span>${lbl(ctx, r.name)}</span><strong>${ctx.esc(D.riderText(r, ctx.lang).split(" ")[0])}</strong>${r.source ? sourceLine(ctx, r.source) : ""}</li>`).join("")}</ul>${noD20 ? "" : `<fieldset class="shp-fieldset"><legend>${ctx.t("Tiro", "Roll")}</legend>${radio("normal", "Normale", "Normal")}${radio("advantage", "Vantaggio", "Advantage")}${radio("disadvantage", "Svantaggio", "Disadvantage")}${presetNote}</fieldset>`}<fieldset class="shp-fieldset"><legend>${ctx.t("Dadi", "Dice")}</legend><label class="shp-radio"><input type="radio" name="mode" value="digital"${savedDice === "digital" ? " checked" : ""}> ${ctx.t("Digitali", "Digital")}</label><label class="shp-radio"><input type="radio" name="mode" value="physical"${savedDice === "physical" ? " checked" : ""}> ${ctx.t("Fisici: inserisco le facce", "Physical: I enter the faces")}</label>${connected ? `<label class="shp-radio"><input type="radio" name="mode" value="connected"> ${ctx.t("Dado connesso: lancio il d20 collegato", "Connected die: I throw the paired d20")}</label>` : ""}<div class="shp-faces" data-shp-faces${savedDice === "physical" ? "" : " hidden"}>${faceFields}</div></fieldset><p class="muted">${ctx.t("Il tiro va nel registro. Un tiro accettato non cambia: Annulla toglie il risultato e un nuovo tiro digitale uguale riusa le stesse facce una volta.", "The roll goes to the log. An accepted roll never changes: Undo removes the result and an identical new digital roll reuses the same faces once.")}</p></div>`;
  ctx.dialog(`${ctx.label(profile.label)} · ${actor.name}`, body, {
    submitLabel: encounter ? ctx.t("Tira l’iniziativa", "Roll Initiative") : ctx.t("Tira", "Roll"),
    cancelLabel: ctx.t("Annulla", "Cancel"),
    onSubmit: (data) => {
      const rollMode = noD20 ? "normal" : String(data.get("rollMode") ?? "normal");
      const mode = String(data.get("mode") ?? "digital");
      const used = D.rollDice(profile, rollMode);
      if (mode === "connected")
        return rollConnected(ctx, actorId, { kind, subject, rollMode, used, profile, encounter });
      // Physical faces follow the dice of the chosen roll mode: skip the hidden second d20.
      const all = dice.map((_, i) => data.get("face" + i));
      const faces = rollMode === "normal" && !noD20 ? [all[0], ...all.slice(2)] : all;
      if (encounter) {
        // The tracker's own roll (C8): the kept physical d20, or its digital roll with the
        // engine's mode (conditions and roll policy included).
        const d20s = faces.slice(0, used.length).map(Number);
        const advantage = D.effectiveRollMode(profile, rollMode);
        const natural =
          mode !== "physical"
            ? undefined
            : rollMode === "advantage"
              ? Math.max(...d20s)
              : rollMode === "disadvantage"
                ? Math.min(...d20s)
                : d20s[0];
        return tracker.rollOwnInitiative(ctx, actorId, { mode, natural, advantage });
      }
      const record = rollNow(ctx, actorId, {
        kind,
        subject,
        mode,
        rollMode,
        faces: faces.slice(0, used.length),
      });
      if (record) announceRoll(ctx, record);
    },
  });
  const root = globalThis.document?.querySelector("#dialog");
  if (!root) return;
  const sync = () => {
    const physical = root.querySelector('input[name="mode"]:checked')?.value === "physical";
    const adv = root.querySelector('input[name="rollMode"]:checked')?.value;
    const faces = root.querySelector("[data-shp-faces]");
    faces.hidden = !physical;
    const second = root.querySelector("[data-shp-second]");
    if (second) second.hidden = !(adv === "advantage" || adv === "disadvantage");
    faces.querySelectorAll("input").forEach((input) => {
      const label = input.closest("label");
      input.required = physical && !label.hidden;
    });
  };
  root
    .querySelectorAll('input[name="mode"], input[name="rollMode"]')
    .forEach((input) => input.addEventListener("change", sync));
  sync();
}
function announceRoll(ctx, record) {
  const riders = record.riders.length ? " (" + ridersText(ctx, record.riders) + ")" : "";
  ctx.toast(`${ctx.label(record.label)}: ${record.total}${riders}`);
}
/**
 * TV-95 (C6, Foundry's roll resolver with Pixels): the paired dice answer the throw one
 * group at a time (the d20s, then each rider's dice); a type without a paired die is drawn
 * digitally. The faces land as physical dice with their origin and the die's name; a die
 * that does not answer records nothing and says how to go on.
 */
async function rollConnected(ctx, actorId, { kind, subject, rollMode, used, profile, encounter }) {
  const groups = [];
  for (const d of used) {
    const last = groups.at(-1);
    if (last && last.sides === d.sides && last.role === d.role && last.riderId === d.riderId)
      last.count++;
    else groups.push({ sides: d.sides, role: d.role, riderId: d.riderId, count: 1 });
  }
  const faces = [];
  const faceModes = [];
  const devices = [];
  for (const group of groups) {
    if (!hasConnected(ctx, group.sides)) {
      for (let i = 0; i < group.count; i++) {
        faces.push((ctx.rollDie ?? rollDie)(group.sides));
        faceModes.push("digital");
      }
      continue;
    }
    const rider = profile.riders.find((r) => r.id === group.riderId);
    let got = null;
    try {
      got = await connectedDice.awaitConnectedFaces(ctx, {
        actorId,
        sides: group.sides,
        count: group.count,
        label: group.role === "d20" ? profile.label : (rider?.name ?? null),
      });
    } catch {
      got = null;
    }
    if (
      !Array.isArray(got) ||
      got.length !== group.count ||
      got.some((face) => !Number.isInteger(face) || face < 1 || face > group.sides)
    ) {
      ctx.toast(
        ctx.t(
          "Il dado connesso non ha risposto: scegli «Fisici» e inserisci le facce.",
          "The connected die did not answer: choose “Physical” and enter the faces.",
        ),
        true,
      );
      return;
    }
    faces.push(...got);
    faceModes.push(...(got.faceModes ?? got.map(() => "connected")));
    if (Array.isArray(got.devices)) devices.push(...structuredClone(got.devices));
  }
  if (encounter) {
    const d20s = faces.filter((_, i) => used[i]?.role === "d20");
    const natural =
      rollMode === "advantage"
        ? Math.max(...d20s)
        : rollMode === "disadvantage"
          ? Math.min(...d20s)
          : d20s[0];
    return tracker.rollOwnInitiative(ctx, actorId, {
      mode: "physical",
      natural,
      advantage: D.effectiveRollMode(profile, rollMode),
    });
  }
  const record = rollNow(ctx, actorId, {
    kind,
    subject,
    mode: "physical",
    rollMode,
    faces,
    faceModes,
    devices,
  });
  if (record) announceRoll(ctx, record);
}
/** Records the roll through the common commit; the log entry carries it and the dice
 *  overlay/chat hear "roll-accepted" (the host does not repeat area rolls). */
function rollNow(ctx, actorId, input) {
  const actor = ctx.state.actors[actorId];
  let record = null;
  let logId = null;
  const profile = D.rollProfile(ctx.state, actorId, input.kind, input.subject);
  const title = `${actor.name} · ${ctx.label(profile.label)}`;
  commitSheet(
    ctx,
    actorId,
    title,
    (draft) => {
      record = D.recordRoll(draft, actorId, { ...input, die: ctx.rollDie ?? rollDie }, ctx.role);
      return record;
    },
    {
      afterCommit: (state) => {
        const entry = state.log?.at(-1);
        if (!entry || entry.label !== title || !record) return;
        entry.rolls = [D.logRollOf(record)];
        logId = entry.id;
        const saved = state.ext[ROLLS].rolls.find((row) => row.id === record.id);
        if (saved) saved.logId = entry.id;
      },
    },
  );
  if (record) area?.emit?.("roll-accepted", { logId, roll: D.logRollOf(record) });
  return record;
}

// PG-30: D&D Beyond's one «Speeds and senses» window: every speed, the one shown at the
// top, every sense and the sense shown at the top, saved in one commit. Also in Play mode.
function movementDialog(ctx, actorId, focus = "speeds") {
  const actor = ctx.state.actors[actorId];
  if (!actor || !ctx.canControl(actor)) return;
  const speeds = D.speedsOf(ctx.state, actorId);
  const entry = D.entryOf(ctx.state, actorId);
  const display = entry?.speedDisplay ?? "walk";
  const senses = D.sensesOf(ctx.state, actorId, tableSenses(ctx, actorId));
  const walking = speedBreakdown({ ...actor, movementMode: undefined });
  const walkNote = walking?.steps.length ? ` · ${speedNote(ctx, walking)}` : "";
  const speedFields = `<fieldset class="shp-fieldset" data-shp-move-speeds><legend>${ctx.t("Velocità", "Speeds")}</legend>${actor.activeForm ? `<p class="shp-warn" id="shp-why-form-speeds">${ctx.t("Forma attiva: valgono le velocità della forma e i campi sono bloccati. Le velocità della scheda restano e tornano al ritorno alla forma normale.", "Active form: the form’s speeds apply and the fields are locked. The sheet’s speeds stay and come back with the normal form.")}</p>` : ""}<div class="form-grid">${D.SPEED_MODES.map(
    (m) =>
      m === "walk"
        ? `<label class="field"><span>${lbl(ctx, D.SPEED_NAMES.walk)} (m)${ctx.esc(walkNote)}</span><input value="${speeds.walk ?? ""}" readonly aria-describedby="shp-why-walk"></label>`
        : `<label class="field"><span>${lbl(ctx, D.SPEED_NAMES[m])} (m)</span><input name="${m}" type="number" min="0" max="300" step="0.5" inputmode="decimal" value="${speeds[m] ?? ""}" ${actor.activeForm ? 'disabled aria-describedby="shp-why-form-speeds"' : ""}></label>`,
  ).join(
    "",
  )}</div><label class="field"><span>${ctx.t("Velocità mostrata in alto", "Speed shown at the top")}</span><select name="display">${D.SPEED_MODES.map((m) => `<option value="${m}" ${m === display ? "selected" : ""}>${lbl(ctx, D.SPEED_NAMES[m])}</option>`).join("")}</select></label><p class="muted" id="shp-why-walk">${ctx.t("Camminare è la velocità della scheda («Correggi valori»). Al Tavolo scegli quale velocità usare dal pannello della creatura.", "Walk is the sheet’s speed (“Correct values”). At the Table choose the speed to use in the creature panel.")} ${ctx.esc(D.pagesText(D.SOURCES.speed))}</p></fieldset>`;
  const senseFields = `<fieldset class="shp-fieldset" data-shp-move-senses><legend>${ctx.t("Sensi", "Senses")}</legend><div class="form-grid">${D.SENSES.map((s) => `<label class="field"><span>${lbl(ctx, D.SENSE_NAMES[s])} (m)${senses[s].table && senses[s].sheet == null ? ` · ${ctx.t("dal Tavolo", "from the Table")}` : ""}</span><input name="sense-${s}" type="number" min="0" max="300" step="1.5" inputmode="decimal" value="${senses[s].sheet ?? senses[s].table ?? ""}"></label>`).join("")}</div><label class="field"><span>${ctx.t("Senso mostrato in alto", "Sense shown at the top")}</span><select name="senseDisplay"><option value="">${ctx.t("Nessuno", "None")}</option>${D.SENSES.map((s) => `<option value="${s}" ${entry?.senseDisplay === s ? "selected" : ""}>${lbl(ctx, D.SENSE_NAMES[s])}</option>`).join("")}</select></label><p class="muted">${ctx.t("La visione della pedina al Tavolo la regola il DM in «Nebbia e visione».", "The token’s vision at the Table is set by the DM in “Fog and vision”.")}</p>${sourceLine(ctx, D.SOURCES.darkvision)}</fieldset>`;
  const body = `<div class="shp-dialog shp-movement" data-shp-movement="${ctx.esc(focus)}">${focus === "senses" ? senseFields + speedFields : speedFields + senseFields}</div>`;
  ctx.dialog(ctx.t(`Velocità e sensi · ${actor.name}`, `Speeds and senses · ${actor.name}`), body, {
    submitLabel: ctx.t("Salva velocità e sensi", "Save speeds and senses"),
    onSubmit: (data) => {
      commitSheet(
        ctx,
        actorId,
        ctx.t(
          `Velocità e sensi di ${actor.name} aggiornati`,
          `${actor.name}’s speeds and senses updated`,
        ),
        (draft) => {
          D.setSpeeds(
            draft,
            actorId,
            Object.fromEntries(
              ["fly", "swim", "climb", "burrow", "display"].map((k) => [k, data.get(k)]),
            ),
            ctx.role,
          );
          D.setSenses(
            draft,
            actorId,
            {
              ...Object.fromEntries(D.SENSES.map((k) => [k, data.get("sense-" + k)])),
              display: data.get("senseDisplay"),
            },
            ctx.role,
          );
        },
      );
    },
  });
}
const speedsDialog = (ctx, actorId) => movementDialog(ctx, actorId, "speeds");
const sensesDialog = (ctx, actorId) => movementDialog(ctx, actorId, "senses");
function defensesDialog(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const canEdit = ctx.canControl(actor);
  const entry = D.entryOf(ctx.state, actorId);
  const collapsed = D.collapsedDefenses(ctx.state, actorId);
  const list = collapsed.length
    ? `<ul class="shp-defense-manage">${collapsed
        .map(
          (group) =>
            `<li><strong>${lbl(ctx, D.DEFENSE_NAMES[group.kind])}: ${lbl(ctx, group.name)}${group.marker}</strong>${group.sources.length > 1 ? ` <small>${ctx.t("voci unite", "entries merged")}: ${group.sources.length}</small>` : ""}<ul>${group.sources
              .map(
                (s) =>
                  `<li><span>${s.kind === "sheet" ? ctx.t("Già sulla scheda", "Already on the sheet") : s.kind === "block" || s.kind === "dm-record" ? ctx.esc(defenseSource(ctx, s)) : `${lbl(ctx, D.SOURCE_KIND_NAMES[s.kind])}${s.name ? ": " + ctx.esc(s.name) : ""}${s.custom ? " *" : ""}`}${s.note ? ` · <em>${ctx.esc(s.note)}</em>` : ""}</span>${canEdit && s.id ? `<button type="button" class="button quiet shp-small" data-shp-dialog="remove-defense" data-defense="${ctx.esc(s.id)}">${ctx.t("Togli", "Remove")}</button>` : ""}</li>`,
              )
              .join("")}</ul></li>`,
        )
        .join("")}</ul>`
    : `<p class="muted">${ctx.t("Nessuna difesa.", "No defenses.")}</p>`;
  const form = canEdit
    ? `<fieldset class="shp-fieldset"><legend>${ctx.t("Aggiungi difesa", "Add defense")}</legend><div class="form-grid"><label class="field"><span>${ctx.t("Tipo", "Kind")}</span><select name="kind">${D.DEFENSE_KINDS.map((k) => `<option value="${k}">${lbl(ctx, D.DEFENSE_NAMES[k])}</option>`).join("")}</select></label><label class="field"><span>${ctx.t("Contro", "Against")}</span><select name="target"><optgroup label="${ctx.t("Danni", "Damage")}">${D.DAMAGE_TYPES.map((d) => `<option value="${d}">${lbl(ctx, D.defenseTargetName(d))}</option>`).join("")}</optgroup><optgroup label="${ctx.t("Condizioni (solo immunità)", "Conditions (immunity only)")}">${D.CONDITIONS.map((c) => `<option value="condition:${c.id}">${lbl(ctx, c.name)}</option>`).join("")}</optgroup></select></label><label class="field"><span>${ctx.t("Fonte", "Source")}</span><select name="sourceKind">${D.SOURCE_KINDS.map((k) => `<option value="${k}">${lbl(ctx, D.SOURCE_KIND_NAMES[k])}</option>`).join("")}</select></label><label class="field"><span>${ctx.t("Nome della fonte", "Source name")}</span><input name="sourceName" maxlength="80" list="shp-source-items" placeholder="${ctx.esc(ctx.t("es. Protezione dall’energia", "e.g. Protection from Energy"))}"></label></div><datalist id="shp-source-items">${(actor.inventory ?? []).map((item) => `<option value="${ctx.esc(ctx.label(item.name))}"></option>`).join("")}</datalist><label class="field"><span>${ctx.t("Nota (obbligatoria per una voce personalizzata)", "Note (required for a custom entry)")}</span><input name="note" maxlength="200"></label><p class="muted">${ctx.t("Una voce senza fonte di regola ha l’asterisco. La stessa difesa da più fonti diventa una sola voce.", "An entry with no rule source gets an asterisk. The same defense from several sources becomes one entry.")} ${ctx.esc([D.SOURCES.resistance, D.SOURCES.immunity, D.SOURCES.vulnerability].map(D.pagesText).join(" · "))}</p></fieldset>`
    : "";
  const recorded = collapsed.some((group) => group.sources.some((s) => s.kind === "dm-record"));
  const recordNote = recorded
    ? `<p class="shp-warn">${ctx.t("Al Tavolo valgono le difese registrate dal DM nel vassoio dei danni: una voce aggiunta qui resta sulla scheda finché il DM non aggiorna quella registrazione.", "At the Table the defenses the DM recorded in the damage tray apply: an entry added here stays on the sheet until the DM updates that record.")}</p>`
    : "";
  ctx.dialog(
    ctx.t(`Difese · ${actor.name}`, `Defenses · ${actor.name}`),
    `<div class="shp-dialog">${recordNote}${list}${form}</div>`,
    {
      submitLabel: canEdit ? ctx.t("Aggiungi difesa", "Add defense") : undefined,
      cancelLabel: ctx.t("Chiudi", "Close"),
      onSubmit: canEdit
        ? (data) => {
            const row = commitSheet(
              ctx,
              actorId,
              ctx.t(`Difesa aggiunta a ${actor.name}`, `Defense added to ${actor.name}`),
              (draft) =>
                D.addDefense(
                  draft,
                  actorId,
                  Object.fromEntries(
                    ["kind", "target", "sourceKind", "sourceName", "note"].map((k) => [
                      k,
                      data.get(k),
                    ]),
                  ),
                  ctx.role,
                ),
            );
            if (row) queueMicrotask(() => defensesDialog(ctx, actorId));
          }
        : undefined,
    },
  );
  void entry;
  bindDialog(ctx, {
    "remove-defense": (button) => {
      commitSheet(
        ctx,
        actorId,
        ctx.t(`Difesa tolta a ${actor.name}`, `Defense removed from ${actor.name}`),
        (draft) => D.removeDefense(draft, actorId, button.dataset.defense, ctx.role),
      );
      defensesDialog(ctx, actorId);
    },
  });
}
function skillDialog(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor || !ctx.canControl(actor)) return;
  const body = `<div class="shp-dialog"><p>${ctx.t("Un’abilità del tavolo (es. «Tecnologia antica»): caratteristica e competenza secondo l’accordo. Non concede competenze da sola.", "A table skill (e.g. “Ancient technology”): ability and proficiency as agreed. It grants no proficiency by itself.")}</p><div class="form-grid"><label class="field"><span>${ctx.t("Nome", "Name")}</span><input name="name" maxlength="60" required></label><label class="field"><span>${ctx.t("Caratteristica", "Ability")}</span><select name="ability">${D.ABILITIES.map((a) => `<option value="${a}">${lbl(ctx, D.ABILITY_NAMES[a])}</option>`).join("")}</select></label><label class="field"><span>${ctx.t("Competenza", "Proficiency")}</span><select name="proficiency"><option value="none">${ctx.t("Nessuna", "None")}</option><option value="proficient" selected>${ctx.t("Competente", "Proficient")}</option><option value="expertise">${ctx.t("Maestria", "Expertise")}</option></select></label><label class="field"><span>${ctx.t("Bonus concordato", "Agreed bonus")}</span><input name="bonus" type="number" min="-10" max="10" value="0"></label></div><label class="field"><span>${ctx.t("Nota", "Note")}</span><input name="note" maxlength="200"></label>${sourceLine(ctx, D.SOURCES.expertise)}</div>`;
  ctx.dialog(ctx.t("Aggiungi abilità", "Add skill"), body, {
    submitLabel: ctx.t("Aggiungi abilità", "Add skill"),
    onSubmit: (data) => {
      commitSheet(
        ctx,
        actorId,
        ctx.t(
          `Abilità «${String(data.get("name")).trim()}» aggiunta`,
          `Skill “${String(data.get("name")).trim()}” added`,
        ),
        (draft) =>
          D.addCustomSkill(
            draft,
            actorId,
            Object.fromEntries(
              ["name", "ability", "proficiency", "bonus", "note"].map((k) => [k, data.get(k)]),
            ),
            ctx.role,
          ),
      );
    },
  });
}
function effectDialog(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor || !ctx.canControl(actor)) return;
  const custom = D.effectList(ctx.state, actorId).filter((e) => e.custom);
  const body = `<div class="shp-dialog"><p>${ctx.t("Un effetto che aggiunge o toglie un dado o un bonus a certi tiri finché è attivo (es. un beneficio concordato col DM).", "An effect that adds or subtracts a die or a bonus to some rolls while active (e.g. a benefit agreed with the DM).")}</p><div class="form-grid"><label class="field"><span>${ctx.t("Nome", "Name")}</span><input name="name" maxlength="60" required></label><label class="field"><span>${ctx.t("Segno", "Sign")}</span><select name="sign"><option value="1">+</option><option value="-1">−</option></select></label><label class="field"><span>${ctx.t("Dado", "Die")}</span><select name="sides"><option value="">${ctx.t("Nessuno", "None")}</option>${[4, 6, 8, 10, 12].map((s) => `<option value="${s}" ${s === 4 ? "selected" : ""}>1d${s}</option>`).join("")}</select></label><label class="field"><span>${ctx.t("Oppure bonus fisso", "Or flat bonus")}</span><input name="flat" type="number" min="-10" max="10" value="0"></label></div><fieldset class="shp-fieldset"><legend>${ctx.t("Si applica a", "Applies to")}</legend>${["attack", "save", "check"].map((k) => `<label class="shp-radio"><input type="checkbox" name="appliesTo" value="${k}" ${k !== "check" ? "checked" : ""}> ${lbl(ctx, D.ROLL_KIND_NAMES[k])}</label>`).join("")}</fieldset><label class="field"><span>${ctx.t("Nota", "Note")}</span><input name="note" maxlength="200"></label>${custom.length ? `<h3>${ctx.t("Effetti personalizzati", "Custom effects")}</h3><ul class="shp-parts">${custom.map((e) => `<li><span>${lbl(ctx, e.name)}</span><button type="button" class="button quiet shp-small" data-shp-dialog="remove-effect" data-effect="${ctx.esc(e.id)}">${ctx.t("Togli", "Remove")}</button></li>`).join("")}</ul>` : ""}</div>`;
  ctx.dialog(ctx.t("Effetto sui tiri", "Roll effect"), body, {
    submitLabel: ctx.t("Aggiungi e attiva", "Add and turn on"),
    onSubmit: (data) => {
      commitSheet(
        ctx,
        actorId,
        ctx.t(
          `Effetto «${String(data.get("name")).trim()}» attivato`,
          `Effect “${String(data.get("name")).trim()}” turned on`,
        ),
        (draft) =>
          D.addCustomEffect(
            draft,
            actorId,
            {
              name: data.get("name"),
              sign: Number(data.get("sign")),
              sides: data.get("sides") ? Number(data.get("sides")) : null,
              flat: Number(data.get("flat") || 0),
              appliesTo: data.getAll("appliesTo"),
              note: data.get("note"),
            },
            ctx.role,
          ),
      );
    },
  });
  bindDialog(ctx, {
    "remove-effect": (button) => {
      commitSheet(ctx, actorId, ctx.t("Effetto tolto", "Effect removed"), (draft) =>
        D.removeCustomEffect(draft, actorId, button.dataset.effect, ctx.role),
      );
      effectDialog(ctx, actorId);
    },
  });
}
function noteDialog(ctx, actorId, { section = "other", noteId = null } = {}) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const note = noteId
    ? D.readableNotes(ctx.state, actorId, ctx.role).find((n) => n.id === noteId)
    : null;
  const canEdit = ctx.canControl(actor);
  const body = `<div class="shp-dialog"><div class="form-grid"><label class="field"><span>${ctx.t("Sezione", "Section")}</span><select name="section">${D.NOTE_SECTIONS.map((s) => `<option value="${s}" ${(note?.section ?? section) === s ? "selected" : ""}>${lbl(ctx, D.NOTE_SECTION_NAMES[s])}</option>`).join("")}</select></label><label class="field"><span>${ctx.t("Titolo", "Title")}</span><input name="title" maxlength="80" required value="${ctx.esc(note?.title ?? "")}"></label></div><label class="field"><span>${ctx.t("Testo", "Text")}</span><textarea name="text" rows="5" maxlength="4000">${ctx.esc(note?.text ?? "")}</textarea></label>${note ? "" : `<fieldset class="shp-fieldset"><legend>${ctx.t("Chi la legge", "Who reads it")}</legend><label class="shp-radio"><input type="radio" name="audience" value="sheet" ${canEdit ? "checked" : 'disabled aria-describedby="shp-why-audience"'}> ${ctx.t("Chi consulta la scheda", "Whoever views the sheet")}</label>${canEdit ? "" : `<small class="shp-why" id="shp-why-audience">${ctx.t("Solo chi controlla la scheda scrive note per chi la consulta: la tua resta tua.", "Only the sheet’s controller writes notes for its viewers: yours stays yours.")}</small>`}<label class="shp-radio"><input type="radio" name="audience" value="me" ${canEdit ? "" : "checked"}> ${ctx.t("Solo io", "Only me")}</label></fieldset>`}</div>`;
  ctx.dialog(note ? ctx.t("Modifica nota", "Edit note") : ctx.t("Nuova nota", "New note"), body, {
    submitLabel: ctx.t("Salva nota", "Save note"),
    onSubmit: (data) => {
      const input = Object.fromEntries(
        ["section", "title", "text", "audience"].map((k) => [k, data.get(k)]),
      );
      const personal = note ? note.audience === "me" : input.audience === "me";
      const label = personal
        ? ctx.t("Nota personale salvata", "Personal note saved")
        : ctx.t(`Nota su ${actor.name} salvata`, `Note on ${actor.name} saved`);
      ctx.commit(
        label,
        (draft) =>
          note
            ? D.updateNote(draft, actorId, note.id, input, ctx.role)
            : D.addNote(draft, actorId, input, ctx.role),
        personal || D.isPersonal(actor) ? { local: true, visibility: "private" } : {},
      );
      // A note saved into another section than the one filtered stays visible (All).
      if (ui.notes !== "all" && ui.notes !== input.section && input.section) ui.notes = "all";
    },
  });
}
function reselectDialog(ctx, actorId, reselectId) {
  const actor = ctx.state.actors[actorId];
  const row = D.reselectState(ctx.state, actorId).find((r) => r.id === reselectId);
  if (!actor || !row || !ctx.canControl(actor)) return;
  const body = `<div class="shp-dialog"><p>${ctx.esc(ctx.t(`Scegli ${row.count} opzioni; dopo questo riposo ne puoi cambiare ${row.changeLimit}.`, `Choose ${row.count} options; after this rest you can change ${row.changeLimit}.`))}</p><fieldset class="shp-fieldset shp-options"><legend>${lbl(ctx, row.name)}</legend>${row.options.map((o) => `<label class="shp-radio"><input type="checkbox" name="chosen" value="${ctx.esc(o.id)}" ${row.chosen.includes(o.id) ? "checked" : ""}> ${lbl(ctx, o.name)}</label>`).join("")}</fieldset>${sourceLine(ctx, row.source)}</div>`;
  ctx.dialog(ctx.t(`Rivedi: ${ctx.label(row.name)}`, `Revise: ${ctx.label(row.name)}`), body, {
    submitLabel: ctx.t("Conferma le scelte", "Confirm the choices"),
    onSubmit: (data) => {
      commitSheet(
        ctx,
        actorId,
        ctx.t(
          `${actor.name}: ${ctx.label(row.name)} rivista dopo il riposo`,
          `${actor.name}: ${ctx.label(row.name)} revised after the rest`,
        ),
        (draft) =>
          D.resolveReselect(
            draft,
            actorId,
            reselectId,
            { chosen: data.getAll("chosen") },
            ctx.role,
          ),
      );
    },
  });
}
function reselectAddDialog(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor || !ctx.canControl(actor)) return;
  const body = `<div class="shp-dialog"><p>${ctx.t("Segna una scelta che la regola permette di cambiare dopo un riposo (es. le armi di Padronanza delle armi). Riceverai il promemoria al riposo.", "Flag a choice the rule lets you change after a rest (e.g. Weapon Mastery weapons). You get the reminder at the rest.")}</p><label class="field"><span>${ctx.t("Nome", "Name")}</span><input name="name" maxlength="60" required></label><div class="form-grid"><label class="field"><span>${ctx.t("Dopo", "After")}</span><select name="trigger"><option value="long">${ctx.t("Riposo lungo", "Long Rest")}</option><option value="short">${ctx.t("Riposo breve o lungo", "Short or Long Rest")}</option></select></label><label class="field"><span>${ctx.t("Scelte che puoi cambiare", "Choices you can change")}</span><input name="changeLimit" type="number" min="1" max="10" value="1"></label></div><label class="field"><span>${ctx.t("Opzioni (separate da virgole)", "Options (comma separated)")}</span><input name="options" maxlength="600" required></label><label class="field"><span>${ctx.t("Scelte attuali (tra le opzioni, separate da virgole)", "Current choices (among the options, comma separated)")}</span><input name="chosen" maxlength="400" required></label><label class="field"><span>${ctx.t("Nota o regola", "Note or rule")}</span><input name="note" maxlength="200"></label></div>`;
  ctx.dialog(ctx.t("Scelta da rivedere dopo un riposo", "Choice to revise after a rest"), body, {
    submitLabel: ctx.t("Aggiungi scelta", "Add choice"),
    onSubmit: (data) => {
      commitSheet(
        ctx,
        actorId,
        ctx.t("Scelta riselezionabile aggiunta", "Reselectable choice added"),
        (draft) =>
          D.addReselect(
            draft,
            actorId,
            Object.fromEntries(
              ["name", "trigger", "changeLimit", "options", "chosen", "note"].map((k) => [
                k,
                data.get(k),
              ]),
            ),
            ctx.role,
          ),
      );
    },
  });
}
function xpDialog(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const canEdit = ctx.canControl(actor);
  const xp = D.xpView(ctx.state, actorId);
  const modeRow = canEdit
    ? `<fieldset class="shp-fieldset"><legend>${ctx.t("Come avanza", "How it advances")}</legend><div class="shp-mode" role="group"><button type="button" data-shp-dialog="adv-mode" data-mode="xp" aria-pressed="${xp.mode === "xp"}">${ctx.t("Punti esperienza", "Experience points")}</button><button type="button" data-shp-dialog="adv-mode" data-mode="milestone" aria-pressed="${xp.mode === "milestone"}">${ctx.t("Traguardi", "Milestones")}</button></div></fieldset>`
    : "";
  const xpBody = `<p class="shp-total">${ctx.t("PE", "XP")}: <strong>${ctx.esc(numberText(ctx, xp.xp))}</strong>${xp.recorded ? "" : ` <small>${ctx.t(`(nessun valore registrato: minimo del livello ${xp.level})`, `(no value recorded: level ${xp.level} minimum)`)}</small>`}</p><span class="shp-xpbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${xp.pct}" aria-label="${ctx.esc(ctx.t(`Verso il livello ${xp.level + 1}`, `Towards level ${xp.level + 1}`))}"><span style="width:${xp.pct}%"></span></span><p class="muted">${xp.needed ? ctx.esc(ctx.t(`Livello ${xp.level + 1} a ${numberText(ctx, xp.needed)} PE.`, `Level ${xp.level + 1} at ${numberText(ctx, xp.needed)} XP.`)) : ctx.t("Livello massimo.", "Maximum level.")} ${ctx.esc(D.pagesText(D.SOURCES.advancement))}</p>${xp.ready ? `<div class="shp-notice is-good"><span>${ctx.esc(ctx.t(`Il livello ${xp.level + 1} è disponibile${xp.reachable > xp.level + 1 ? ` (fino al ${xp.reachable}, uno alla volta)` : ""}.`, `Level ${xp.level + 1} is available${xp.reachable > xp.level + 1 ? ` (up to ${xp.reachable}, one at a time)` : ""}.`))}</span>${canEdit ? `<button type="button" class="button primary" data-shp-dialog="advance">${ctx.t(`Avanza al livello ${xp.level + 1}`, `Level up to ${xp.level + 1}`)}</button>` : ""}</div>` : ""}${canEdit ? `<div class="shp-inline"><label class="field"><span>${ctx.t("Aggiungi PE (negativo per togliere)", "Add XP (negative to remove)")}</span><input name="amount" type="number" step="1" inputmode="numeric" data-shp-enter="add-xp"></label><button type="button" class="button" data-shp-dialog="add-xp">${ctx.t("Aggiungi", "Add")}</button></div><details class="shp-details"><summary>${ctx.t("Correggi il totale", "Correct the total")}</summary><div class="shp-inline"><label class="field"><span>${ctx.t("Nuovo totale PE", "New XP total")}</span><input name="total" type="number" min="0" step="1" inputmode="numeric"></label><label class="field"><span>${ctx.t("Motivo", "Reason")}</span><input name="reason" maxlength="200"></label><button type="button" class="button" data-shp-dialog="set-xp">${ctx.t("Correggi", "Correct")}</button></div></details>` : ""}`;
  const milestoneBody = `<p>${ctx.t("Il gruppo avanza quando il DM lo stabilisce: niente conteggio dei PE.", "The group advances when the DM says so: no XP counting.")}</p>${xp.milestones.length ? `<ul class="shp-parts">${xp.milestones.map((m) => `<li><span>${ctx.esc(m.title)}</span><strong>${m.proposedLevel ? ctx.t(`livello ${m.proposedLevel} proposto`, `level ${m.proposedLevel} proposed`) : ""}</strong></li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessun traguardo registrato.", "No milestone recorded.")}</p>`}${xp.proposedLevel ? `<div class="shp-notice is-good"><span>${ctx.esc(ctx.t(`Il DM propone il livello ${xp.proposedLevel}.`, `The DM proposes level ${xp.proposedLevel}.`))}</span>${canEdit ? `<button type="button" class="button primary" data-shp-dialog="advance">${ctx.t(`Avanza al livello ${xp.level + 1}`, `Level up to ${xp.level + 1}`)}</button>` : ""}</div>` : ""}${ctx.role === "dm" ? `<div class="shp-inline"><label class="field"><span>${ctx.t("Traguardo raggiunto", "Milestone reached")}</span><input name="milestone" maxlength="100" data-shp-enter="milestone"></label><label class="shp-radio"><input type="checkbox" name="propose" checked> ${ctx.t(`Proponi il livello ${xp.level + 1}`, `Propose level ${xp.level + 1}`)}</label><button type="button" class="button" data-shp-dialog="milestone">${ctx.t("Registra traguardo", "Record milestone")}</button></div>` : `<p class="muted">${ctx.t("I traguardi li registra il DM.", "The DM records milestones.")}</p>`}`;
  const body = `<div class="shp-dialog shp-xp-dialog">${modeRow}${xp.mode === "milestone" ? milestoneBody : xpBody}</div>`;
  ctx.dialog(ctx.t(`Avanzamento · ${actor.name}`, `Advancement · ${actor.name}`), body, {
    cancelLabel: ctx.t("Chiudi", "Close"),
    // Enter in a field runs that field's button instead of closing the dialog.
    onSubmit: () => {
      const active = globalThis.document?.activeElement;
      const target = active?.dataset?.shpEnter;
      if (target)
        globalThis.document.querySelector(`#dialog [data-shp-dialog="${target}"]`)?.click();
      return false;
    },
  });
  const field = (name) => globalThis.document?.querySelector(`#dialog [name="${name}"]`);
  bindDialog(ctx, {
    "adv-mode": (button) => {
      commitSheet(
        ctx,
        actorId,
        ctx.t(
          button.dataset.mode === "milestone"
            ? `${actor.name}: avanzamento a traguardi`
            : `${actor.name}: avanzamento a PE`,
          button.dataset.mode === "milestone"
            ? `${actor.name}: milestone advancement`
            : `${actor.name}: XP advancement`,
        ),
        (draft) => D.setAdvancementMode(draft, actorId, button.dataset.mode, ctx.role),
      );
      xpDialog(ctx, actorId);
    },
    "add-xp": () => {
      const amount = Number(field("amount")?.value);
      const result = commitSheet(
        ctx,
        actorId,
        ctx.t(
          `${actor.name}: ${amount > 0 ? "+" : ""}${amount} PE`,
          `${actor.name}: ${amount > 0 ? "+" : ""}${amount} XP`,
        ),
        (draft) => D.addXp(draft, actorId, amount, ctx.role),
      );
      if (result) xpDialog(ctx, actorId);
    },
    "set-xp": () => {
      const total = field("total")?.value;
      const reason = field("reason")?.value;
      commitSheet(
        ctx,
        actorId,
        ctx.t(
          `${actor.name}: PE corretti (${String(reason ?? "").trim()})`,
          `${actor.name}: XP corrected (${String(reason ?? "").trim()})`,
        ),
        (draft) => D.setXp(draft, actorId, Number(total === "" ? NaN : total), reason, ctx.role),
      );
      xpDialog(ctx, actorId);
    },
    milestone: () => {
      const title = field("milestone")?.value;
      const propose = field("propose")?.checked;
      ctx.commit(
        ctx.t(
          `Traguardo: ${String(title ?? "").trim()}`,
          `Milestone: ${String(title ?? "").trim()}`,
        ),
        (draft) => D.recordMilestone(draft, actorId, { title, propose }, ctx.role),
        D.isPersonal(actor) ? { local: true, visibility: "private" } : {},
      );
      xpDialog(ctx, actorId);
    },
    advance: () => {
      ctx.closeDialog();
      startCharacterBuilder(ctx, { kind: "advance", actorId });
    },
  });
}
function actionDetail(ctx, actorId, ref) {
  const row = D.actionList(ctx.state, actorId).find(
    (r) => r.ref.kind === ref.kind && r.ref.id === ref.id,
  );
  if (!row) return;
  const riders = row.ref.kind === "attack" ? D.activeRiders(ctx.state, actorId, "attack") : [];
  const attack =
    row.ref.kind === "attack"
      ? D.sheetAttacks(ctx.state, actorId).find((a) => a.id === row.ref.id)
      : null;
  const body = `<div class="shp-dialog"><p><span class="badge">${lbl(ctx, D.ACTION_FILTER_NAMES[row.economy])}</span>${row.limited ? ` <span class="badge">${ctx.t("Usi limitati", "Limited use")}</span>` : ""}</p><p class="character-multiline">${lbl(ctx, row.summary) || ctx.t("Nessuna descrizione registrata.", "No recorded description.")}</p>${attack ? `<h3>${ctx.t("Tiro per colpire", "Attack roll")} ${ctx.esc(D.signed(attack.toHit))}${riders.length ? " " + ctx.esc(ridersText(ctx, riders)) : ""}</h3><ul class="shp-parts">${partsHTML(ctx, attack.parts)}${riders.map((r) => `<li><span>${lbl(ctx, r.name)}</span><strong>${ctx.esc(D.riderText(r, ctx.lang).split(" ")[0])}</strong>${r.source ? sourceLine(ctx, r.source) : ""}</li>`).join("")}</ul>${attack.dice.length ? `<p>${ctx.t("Danni", "Damage")}: ${ctx.esc(attack.dice.map((d) => `${d.count}d${d.sides}`).join(" + "))}${attack.damageType ? " · " + lbl(ctx, D.defenseTargetName(attack.damageType)) : ""}</p>` : ""}` : ""}${sourceLine(ctx, row.source)}${attack && ctx.canControl(ctx.state.actors[actorId]) ? `<p><button type="button" class="button" data-shp-dialog="roll">${icon("dice")} ${ctx.t("Tiro per colpire", "Attack roll")}</button> <button type="button" class="button quiet" data-shp-dialog="table">${ctx.t("Al Tavolo, contro un bersaglio", "At the Table, against a target")}</button></p>` : ""}</div>`;
  ctx.dialog(ctx.label(row.name), body, { cancelLabel: ctx.t("Chiudi", "Close") });
  bindDialog(ctx, {
    roll: () => rollDialog(ctx, actorId, "attack", row.ref.id),
    table: () => {
      ctx.closeDialog();
      // PG-69 (P5 shared edit, dnd5e attack dialog): the Table opens with this attack
      // armed (roll mode, bonus, ammunition), waiting only for the target.
      prepareCombatAction(ctx, actorId, row.ref.id);
      ctx.navigate("table", { id: actorId });
    },
  });
}

/** PG-70: «9 m base, −3 m ingombro» (D&D Beyond's note under the effective speed); a
 *  condition's effect reads «ora 0 m per condizioni». Empty when nothing changes it. */
export function speedNote(ctx, breakdown) {
  if (!breakdown?.steps?.length) return "";
  const m = (value) => `${String(value).replace(".", ctx.lang === "it" ? "," : ".")} m`;
  let now = breakdown.base;
  const parts = [`${m(breakdown.base)} ${ctx.t("base", "base")}`];
  for (const step of breakdown.steps) {
    now += step.delta;
    parts.push(
      step.kind === "conditions"
        ? ctx.t(`ora ${m(now)} per condizioni`, `now ${m(now)} from conditions`)
        : `${step.delta < 0 ? "−" : "+"}${m(Math.abs(step.delta))} ${ctx.label(step.reason)}`,
    );
  }
  return parts.join(", ");
}
/** PG-40: the pinned detail (BG3): a copy of the tooltip that stays until closed. */
function pinTip(ctx, control) {
  const doc = globalThis.document;
  const tip = doc?.getElementById(control.dataset.tip);
  if (!tip) return;
  doc.querySelector(".shp-pinned")?.remove();
  const box = doc.createElement("aside");
  box.className = "shp-pinned";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", ctx.t("Dettaglio fissato", "Pinned detail"));
  box.innerHTML = `<div class="shp-pinned-head"><span>${ctx.t("Fissato", "Pinned")}</span><button type="button" class="button quiet shp-small" data-shp-unpin>${icon("close")} ${ctx.t("Chiudi", "Close")}</button></div>${tip.innerHTML}`;
  box.querySelector(".shp-tip-hint")?.remove();
  const close = () => {
    box.remove();
    if (control.isConnected) control.focus({ preventScroll: true });
  };
  box.querySelector("[data-shp-unpin]").addEventListener("click", close);
  box.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  });
  doc.body.append(box);
  bindGlossary(box, ctx);
  box.querySelector("[data-shp-unpin]").focus({ preventScroll: true });
}
// PG-39: a favourite rolls at once with digital dice through the one engine (dnd5e
// Favourites); right-click or a long press opens the full roll window instead.
const rollSubject = (kind, id) => (kind === "initiative" ? "initiative" : id);
export function quickRoll(ctx, actorId, kind, id) {
  // C8: a favourite Initiative clicked while the combat waits for it joins the turn order.
  if (kind === "initiative" && awaitsInitiative(ctx, actorId))
    return tracker.rollOwnInitiative(ctx, actorId, {
      mode: "digital",
      advantage: D.effectiveRollMode(D.rollProfile(ctx.state, actorId, "initiative"), "normal"),
    });
  const record = rollNow(ctx, actorId, {
    kind,
    subject: rollSubject(kind, id),
    mode: "digital",
    rollMode: "normal",
    faces: [],
  });
  if (record)
    ctx.toast(
      `${ctx.label(record.label)}: ${record.total}${record.riders?.length ? " (" + ridersText(ctx, record.riders) + ")" : ""}`,
    );
  return record;
}
/**
 * Final review F10 (D&D Beyond: clicking a modifier rolls it; right-click gives Advantage,
 * Disadvantage and the rest): a sheet number rolls at once with digital dice through the
 * one engine; with physical dice remembered, or a paired smart die, the roll window opens
 * for the faces. Returns the record, or null when the window opened.
 */
export function rollFromNumber(ctx, actorId, kind, subject, { physical = null } = {}) {
  const manual =
    physical ?? (rememberedDice(ctx) === "physical" || (kind !== "rider" && hasConnected(ctx, 20)));
  if (manual || !QUICK_ROLL.has(kind)) {
    rollDialog(ctx, actorId, kind, subject);
    return null;
  }
  return quickRoll(ctx, actorId, kind, subject);
}
let suppressClick = false;
function bindQuickFavourites(el, ctx, actorId) {
  const options = (button) => {
    if (!QUICK_ROLL.has(button.dataset.kind) || button.disabled) return;
    rollDialog(
      ctx,
      button.closest("[data-shp-table], [data-shp-dock]")?.dataset.shpTable ??
        button.closest("[data-shp-dock]")?.dataset.shpDock ??
        actorId,
      button.dataset.kind,
      button.dataset.subject ?? rollSubject(button.dataset.kind, button.dataset.id),
    );
  };
  el.querySelectorAll('[data-shp="use"][data-fav], [data-shp="roll"]').forEach((button) => {
    if (button.dataset.shp === "roll" && QUICK_ROLL.has(button.dataset.kind) && !button.title)
      button.title = ctx.t(
        "Clic: tira subito · clic destro o pressione lunga: vantaggio, svantaggio, dadi fisici",
        "Click: roll now · right-click or long press: advantage, disadvantage, physical dice",
      );
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      options(button);
    });
    let timer = null;
    button.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      timer = setTimeout(() => {
        timer = null;
        suppressClick = true;
        options(button);
      }, 550);
    });
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    button.addEventListener("pointerup", cancel);
    button.addEventListener("pointerleave", cancel);
    button.addEventListener("pointercancel", cancel);
  });
}
// PG-38: a custom action rolls from the sheet through the quick bar's own engine (the one
// that runs it at the Table); a missing slot is added first, as Roll20's «Add to Token Bar».
async function customRoll(ctx, actorId, actionId) {
  const qb = await import("./quickbar.mjs");
  const find = () =>
    QB.barOf(ctx.state.ext?.[QB.ID], ctx.role, actorId)
      .pages.flatMap((page) => page.slots)
      .find((slot) => slot?.kind === "custom" && slot.ref?.customId === actionId);
  let slot = find();
  if (!slot) {
    ctx.commit(
      ctx.t("Barra rapida: azione personalizzata aggiunta", "Quick bar: custom action added"),
      (draft) =>
        QB.addSlot(draft, draft.ext[QB.ID], ctx.role, actorId, {
          kind: "custom",
          ref: { customId: actionId },
          color: "red",
        }),
      { local: true, visibility: "private" },
    );
    slot = find();
  }
  if (slot) qb.useSlot(ctx, null, actorId, slot.id);
}
/** PG-37: what a weapon property or mastery does, with its SRD pages. */
function weaponRuleDialog(ctx, actorId, rule, weaponId) {
  const [kind, key] = String(rule).split(":");
  const text = kind === "mastery" ? MASTERY_RULES[key] : WEAPON_PROPERTY_RULES[key];
  if (!text) return;
  const name =
    kind === "mastery"
      ? `${ctx.t("Padronanza", "Mastery")}: ${ctx.label(LABELS.mastery[key])}`
      : ctx.label(LABELS.weaponProperty[key]);
  const actor = ctx.state.actors[actorId];
  const masteryNote =
    kind === "mastery" &&
    !(actor?.features ?? []).some((f) => /weapon-mastery/.test(String(f.definitionId ?? f.id)))
      ? `<p class="muted">${ctx.t("Serve il privilegio Padronanza d’armi per usare questa proprietà.", "You need the Weapon Mastery feature to use this property.")}</p>`
      : "";
  const pages =
    kind === "mastery" ? "SRD 5.2.1 · EN 90 / IT 102–103" : "SRD 5.2.1 · EN 89–90 / IT 101–102";
  ctx.dialog(
    name,
    `<div class="shp-dialog"><p>${glossaryText(ctx, text)}</p>${masteryNote}<small class="shp-source">${ctx.esc(pages)}</small></div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  bindGlossary(globalThis.document?.querySelector("#dialog"), ctx);
  void weaponId;
}

// ------------------------------------------------------------------------------ binding

function useFavorite(ctx, actorId, kind, id, root) {
  if (kind === "skill") return rollDialog(ctx, actorId, "skill", id);
  if (kind === "save") return rollDialog(ctx, actorId, "save", id);
  if (kind === "check") return rollDialog(ctx, actorId, "check", id);
  if (kind === "initiative") return rollDialog(ctx, actorId, "initiative", "initiative");
  if (kind === "attack") return rollDialog(ctx, actorId, "attack", id);
  if (kind === "feature") {
    const feature = ctx.state.actors[actorId]?.features?.find((f) => f.id === id);
    // PG-77: a Wild Shape favourite opens the form picker; the use is spent by the form.
    if (ctx.openForms && isWildShape(ctx.state.actors[actorId], { ref: { kind: "feature", id } }))
      return ctx.openForms(actorId, "forms");
    commitSheet(
      ctx,
      actorId,
      ctx.t(
        `${ctx.label(feature?.name ?? "")}: un uso speso`,
        `${ctx.label(feature?.name ?? "")}: one use spent`,
      ),
      (draft) => D.spendFeatureUse(draft, actorId, id, ctx.role),
    );
    return;
  }
  if (kind === "item") {
    // The potion flow of the sheet itself (preview, Bonus Action, dice, Undo): the core
    // handler listens on the sheet for this control.
    const proxy = globalThis.document?.createElement("button");
    if (!proxy || !root) return actionDetail(ctx, actorId, { kind, id });
    proxy.type = "button";
    proxy.hidden = true;
    proxy.dataset.characterAction = ctx.state.actors[actorId]?.inventory?.find((i) => i.id === id)
      ?.healing
      ? "use-healing"
      : "detail-item";
    proxy.dataset.item = id;
    root.append(proxy);
    proxy.click();
    proxy.remove();
    return;
  }
  return actionDetail(ctx, actorId, { kind, id });
}
// Controls that re-render the sheet in place: the keyboard focus returns to the same
// control (same action and data, same section) instead of falling to the page body.
const IN_PLACE = new Set([
  "pip",
  "restore",
  "mode",
  "filter",
  "notes-filter",
  "fav",
  "fav-move",
  "effect",
  "move-mode",
  "skill-remove",
  "note-remove",
  "reselect-keep",
  "reselect-remove",
  "use",
  "undo",
]);
const SECTIONS = ["bar", "derived", "actions", "notes", "reselect", "table", "dock"];
const quote = (value) =>
  globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
function focusKey(control) {
  const section = SECTIONS.find((name) => control.closest(`[data-shp-${name}]`));
  if (!section) return null;
  const data = ["shp", "kind", "id", "key", "filter", "effect", "mode", "delta", "skill"]
    .concat(["reselect", "note", "section", "subject", "index"])
    .filter((name) => control.dataset[name] !== undefined)
    .map((name) => `[data-${name}="${quote(control.dataset[name])}"]`)
    .join("");
  return { section, exact: data, action: `[data-shp="${quote(control.dataset.shp)}"]` };
}
function restoreFocus(el) {
  const key = ui.focus;
  if (!key) return;
  const section = el.matches(`[data-shp-${key.section}]`)
    ? el
    : el.querySelector(`[data-shp-${key.section}]`);
  if (!section) return;
  const target =
    section.querySelector(key.exact) ?? section.querySelector(`${key.action}:not([disabled])`);
  if (!target) return;
  target.focus({ preventScroll: true });
  ui.focus = null;
}
/** One click handler per slot; each control names its action in data-shp. */
function bindArea(el, ctx, actorArg) {
  const actorId = actorArg?.id ?? ctx.view?.id;
  restoreFocus(el);
  bindGlossary(el, ctx);
  bindQuickFavourites(el, ctx, actorId);
  el.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && el.querySelector(".shp-tip")) {
      ui.tipsOff = true;
      el.querySelectorAll(".shp-bar, .shp-band").forEach((bar) =>
        bar.classList.add("shp-tips-off"),
      );
    }
  });
  const tipsBack = () => {
    if (!ui.tipsOff) return;
    ui.tipsOff = false;
    el.querySelectorAll(".shp-tips-off").forEach((bar) => bar.classList.remove("shp-tips-off"));
  };
  el.addEventListener("pointermove", tipsBack);
  el.addEventListener("focusin", tipsBack);
  el.addEventListener("click", (event) => {
    const control = event.target.closest("[data-shp]");
    if (!control || control.disabled || !el.contains(control)) return;
    const action = control.dataset.shp;
    const holder = control.closest("[data-shp-table], [data-shp-dock]");
    const id = holder?.dataset.shpTable ?? holder?.dataset.shpDock ?? actorId;
    // Only a keyboard activation (no pointer position) asks for the focus back.
    ui.focus = IN_PLACE.has(action) && event.detail === 0 ? focusKey(control) : null;
    attempt(ctx, () => {
      if (action === "mode") return setMode(ctx, control.dataset.mode);
      if (action === "undo") return ctx.undo();
      if (action === "stat") return openStat(ctx, id, control.dataset.key);
      if (action === "info")
        return ctx.dialog(
          ctx.t("Bonus di competenza", "Proficiency Bonus"),
          `<div class="shp-dialog">${control.nextElementSibling?.innerHTML ?? ""}</div>`,
          { cancelLabel: ctx.t("Chiudi", "Close") },
        );
      if (action === "speeds") return speedsDialog(ctx, id);
      if (action === "senses") return sensesDialog(ctx, id);
      if (action === "defenses") return defensesDialog(ctx, id);
      if (action === "skill-add") return skillDialog(ctx, id);
      if (action === "skill-remove")
        return commitSheet(
          ctx,
          id,
          ctx.t("Abilità personalizzata tolta", "Custom skill removed"),
          (draft) => D.removeCustomSkill(draft, id, control.dataset.skill, ctx.role),
        );
      if (action === "effect") {
        const effect = D.effectList(ctx.state, id).find((e) => e.id === control.dataset.effect);
        const on = !effect?.active;
        return commitSheet(
          ctx,
          id,
          ctx.t(
            `${ctx.label(effect?.name ?? "")} ${on ? "attivata" : "disattivata"}`,
            `${ctx.label(effect?.name ?? "")} turned ${on ? "on" : "off"}`,
          ),
          (draft) => D.toggleEffect(draft, id, control.dataset.effect, on, ctx.role),
        );
      }
      if (action === "effect-add") return effectDialog(ctx, id);
      if (action === "fav") {
        const on = !D.isFavorite(ctx.state, id, {
          kind: control.dataset.kind,
          id: control.dataset.id,
        });
        return commitSheet(
          ctx,
          id,
          on
            ? ctx.t("Aggiunto ai preferiti", "Added to favourites")
            : ctx.t("Tolto dai preferiti", "Removed from favourites"),
          (draft) =>
            D.toggleFavorite(
              draft,
              id,
              { kind: control.dataset.kind, id: control.dataset.id },
              ctx.role,
            ),
        );
      }
      if (action === "fav-move")
        return commitSheet(
          ctx,
          id,
          ctx.t("Preferiti riordinati", "Favourites reordered"),
          (draft) =>
            D.moveFavorite(
              draft,
              id,
              { kind: control.dataset.kind, id: control.dataset.id },
              Number(control.dataset.delta),
              ctx.role,
            ),
        );
      if (action === "use" && control.dataset.fav && QUICK_ROLL.has(control.dataset.kind)) {
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        return quickRoll(ctx, id, control.dataset.kind, control.dataset.id);
      }
      if (action === "use")
        return useFavorite(ctx, id, control.dataset.kind, control.dataset.id, el);
      if (action === "roll") {
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        return rollFromNumber(ctx, id, control.dataset.kind, control.dataset.subject);
      }
      if (action === "rider-roll") return rollDialog(ctx, id, "rider", control.dataset.effect);
      if (action === "filter") {
        ui.filter = control.dataset.filter;
        return ctx.render();
      }
      if (action === "action-detail")
        return actionDetail(ctx, id, { kind: control.dataset.kind, id: control.dataset.id });
      if (action === "notes-filter") {
        ui.notes = control.dataset.filter;
        return ctx.render();
      }
      if (action === "note-add") return noteDialog(ctx, id, { section: control.dataset.section });
      if (action === "note-edit") return noteDialog(ctx, id, { noteId: control.dataset.note });
      if (action === "note-remove") {
        const note = D.readableNotes(ctx.state, id, ctx.role).find(
          (n) => n.id === control.dataset.note,
        );
        return ctx.commit(
          ctx.t("Nota tolta", "Note removed"),
          (draft) => D.removeNote(draft, id, control.dataset.note, ctx.role),
          note?.audience === "me" || D.isPersonal(ctx.state.actors[id])
            ? { local: true, visibility: "private" }
            : {},
        );
      }
      if (action === "xp") return xpDialog(ctx, id);
      if (action === "advance") return startCharacterBuilder(ctx, { kind: "advance", actorId: id });
      if (action === "reselect") return reselectDialog(ctx, id, control.dataset.reselect);
      if (action === "reselect-keep")
        return commitSheet(
          ctx,
          id,
          ctx.t("Scelte confermate dopo il riposo", "Choices kept after the rest"),
          (draft) =>
            D.resolveReselect(draft, id, control.dataset.reselect, { keep: true }, ctx.role),
        );
      if (action === "reselect-add") return reselectAddDialog(ctx, id);
      if (action === "reselect-remove")
        return commitSheet(
          ctx,
          id,
          ctx.t("Scelta riselezionabile tolta", "Reselectable choice removed"),
          (draft) => D.removeReselect(draft, id, control.dataset.reselect, ctx.role),
        );
      if (action === "forms-known") return ctx.openForms?.(id, "known");
      if (action === "wild-shape") return ctx.openForms?.(id, "forms");
      if (action === "tip") return pinTip(ctx, control);
      if (action === "pip" || action === "restore") {
        const feature = ctx.state.actors[id]?.features?.find((f) => f.id === control.dataset.id);
        if (!feature) return;
        const index = Number(control.dataset.index);
        const used = action === "restore" ? 0 : index < (feature.used ?? 0) ? index : index + 1;
        const name = ctx.label(feature.name);
        return commitSheet(
          ctx,
          id,
          used < (feature.used ?? 0)
            ? ctx.t(
                `${name}: usi recuperati (${used}/${feature.max} spesi)`,
                `${name}: uses regained (${used}/${feature.max} spent)`,
              )
            : ctx.t(
                `${name}: uso speso (${used}/${feature.max})`,
                `${name}: use spent (${used}/${feature.max})`,
              ),
          (draft) => setFeatureUsed(draft.actors[id], feature.id, used),
        );
      }
      if (action === "custom-roll") return customRoll(ctx, id, control.dataset.id);
      if (action === "custom-new")
        return import("./quickbar.mjs").then((qb) => qb.openCustom(ctx, id));
      if (action === "weapon-rule")
        return weaponRuleDialog(ctx, id, control.dataset.rule, control.dataset.weapon);
      if (action === "move-mode") {
        const actor = ctx.state.actors[id];
        return commitSheet(
          ctx,
          id,
          ctx.t(
            `${actor.name}: si muove con ${ctx.label(D.SPEED_NAMES[control.dataset.mode]).toLocaleLowerCase()}`,
            `${actor.name}: moves by ${ctx.label(D.SPEED_NAMES[control.dataset.mode]).toLocaleLowerCase()}`,
          ),
          (draft) => D.setMovementMode(draft, id, control.dataset.mode, ctx.role),
        );
      }
    });
    ui.focus = null;
  });
}

// ------------------------------------------------------------------------------ register

const isSheet = (ctx, actor) => Boolean(actor) && ctx.view?.page === "characters";
export function register(registry) {
  loadNeighbours();
  area = registry;
  registry.registerStateSlice(ID, {
    version: D.VERSION,
    seed: (state) => D.seedSlice(state),
    normalize: D.normalizeSlice,
  });
  registry.registerStateSlice(ROLLS, {
    version: D.VERSION,
    undo: "preserve",
    seed: () => D.emptyRolls(),
    normalize: D.normalizeRolls,
  });
  registry.registerStyles(new URL("./sheet-plus.css", import.meta.url));
  registry.add("settings", {
    id: ID,
    label: L("Scheda del personaggio", "Character sheet"),
    scope: "device",
    fields: [
      {
        id: "mode",
        label: L("Modalità della scheda (Gioco / Modifica)", "Sheet mode (Play / Edit)"),
        type: "choice",
        default: "play",
        options: [
          {
            value: "play",
            label: L("Gioco: valori effettivi e azioni", "Play: effective values and actions"),
          },
          {
            value: "edit",
            label: L(
              "Modifica: valori di base e costruzione",
              "Edit: base values and construction",
            ),
          },
        ],
      },
    ],
  });
  registry.add("sheet-section", {
    id: `${ID}-bar`,
    tab: "summary",
    label: L("Modalità, valori derivati e preferiti", "Mode, derived values and favourites"),
    order: 10,
    when: (ctx, actor) => isSheet(ctx, actor),
    render: (ctx, actor) => renderBar(ctx, actor),
    bind: (el, ctx, actor) => bindArea(el, ctx, actor),
  });
  // D&D Beyond's top band: the six abilities and the Proficiency Bonus (visual pass 2).
  registry.add("sheet-section", {
    id: `${ID}-band`,
    tab: "band",
    label: L("Caratteristiche e competenza", "Abilities and proficiency"),
    order: 10,
    when: (ctx, actor) => isSheet(ctx, actor),
    render: (ctx, actor) => renderBand(ctx, actor),
    bind: (el, ctx, actor) => bindArea(el, ctx, actor),
  });
  // D&D Beyond's left columns, beside the tabs on every tab (visual pass 2; before, the
  // Actions tab's first section).
  registry.add("sheet-section", {
    id: `${ID}-derived`,
    tab: "side",
    label: L("Tiri salvezza, sensi e abilità", "Saving throws, senses and skills"),
    order: 1,
    when: (ctx, actor) => isSheet(ctx, actor),
    render: (ctx, actor) => renderDerived(ctx, actor),
    bind: (el, ctx, actor) => bindArea(el, ctx, actor),
  });
  registry.add("sheet-section", {
    id: `${ID}-actions`,
    tab: "actions",
    label: L("Azioni", "Actions"),
    order: 2,
    when: (ctx, actor) => isSheet(ctx, actor),
    render: (ctx, actor) => renderActions(ctx, actor),
    bind: (el, ctx, actor) => bindArea(el, ctx, actor),
  });
  // PG-43: D&D Beyond's Notes tab: the section notes (allies, enemies, organizations…)
  // are the first page of «Note», before the adventure log and the revisions.
  registry.add("sheet-tab", {
    id: `${ID}-notes`,
    category: "notes",
    label: L("Note", "Notes"),
    order: 10,
    when: (ctx, actor) => isSheet(ctx, actor) && Boolean(D.sliceOf(ctx.state)),
    render: (ctx, actor) => renderNotes(ctx, actor),
    bind: (el, ctx, actor) => bindArea(el, ctx, actor),
  });
  registry.add("sheet-section", {
    id: `${ID}-reselect`,
    tab: "features",
    label: L("Scelte da rivedere dopo un riposo", "Choices to revise after a rest"),
    order: 30,
    when: (ctx, actor) => isSheet(ctx, actor) && actor.kind === "character",
    render: (ctx, actor) => renderReselect(ctx, actor),
    bind: (el, ctx, actor) => bindArea(el, ctx, actor),
  });
  // PG-77: Wild Shape from the token's right-click menu (dnd5e Transformation, BG3), with
  // «Torna alla forma originale» on a transformed token (dnd5e Revert).
  const wildShaper = (ctx, target) => {
    const actor = ctx.state.actors[target?.actorId];
    return actor &&
      ctx.canControl(actor) &&
      (actor.activeForm ||
        actor.formsProfile?.wildShapeFeatureId ||
        (actor.features ?? []).some((f) => f.definitionId === "druid:wild-shape"))
      ? actor
      : null;
  };
  registry.add("token-menu", {
    id: `${ID}-wild-shape`,
    submenu: "actions",
    label: L("Forma Selvatica…", "Wild Shape…"),
    group: "forms",
    when: (ctx, target) => Boolean(wildShaper(ctx, target) && !wildShaper(ctx, target).activeForm),
    run: (ctx, target) => ctx.openForms?.(target.actorId, "forms"),
  });
  registry.add("token-menu", {
    id: `${ID}-wild-shape-revert`,
    submenu: "actions",
    label: L("Torna alla forma originale…", "Return to original form…"),
    group: "forms",
    when: (ctx, target) => Boolean(wildShaper(ctx, target)?.activeForm),
    run: (ctx, target) =>
      import("./forms-ui.mjs").then((m) => m.openFormReturn(ctx, target.actorId)),
  });
  registry.add("table-panel", {
    id: `${ID}-favourites`,
    label: L("Preferiti della scheda", "Sheet favourites"),
    placement: "dock-row",
    order: 5,
    when: (ctx, tableView) => {
      const actor = ctx.state.actors[tableView?.selectedActorId];
      return Boolean(actor && ctx.canControl(actor) && D.sliceOf(ctx.state));
    },
    render: (ctx, tableView) => renderFavouritesDock(ctx, tableView),
    bind: (el, ctx) => bindArea(el, ctx, null),
  });
  registry.add("table-panel", {
    id: `${ID}-inspector`,
    label: L("Velocità ed effetti", "Speeds and effects"),
    placement: "inspector",
    order: 12,
    when: (ctx, tableView) => {
      const actor = ctx.state.actors[tableView?.selectedActorId];
      return Boolean(actor && ctx.canControl(actor) && D.sliceOf(ctx.state));
    },
    render: (ctx, tableView) => renderTablePanel(ctx, tableView),
    bind: (el, ctx) => bindArea(el, ctx, null),
  });
  registry.add("notifications", {
    id: `${ID}-reselect`,
    label: L("Scelte dopo il riposo", "Choices after the rest"),
    collect: (ctx) =>
      Object.values(ctx.state.actors ?? {})
        .filter(
          (actor) =>
            actor.kind === "character" &&
            (actor.owner ?? "dm") === ctx.role &&
            ctx.canControl(actor),
        )
        .flatMap((actor) =>
          D.pendingReselect(ctx.state, actor.id)
            .filter((row) => !row.external)
            .map((row) => ({
              id: `${ID}-reselect-${actor.id}-${row.id}-${row.restKey}`.slice(0, 190),
              title: L(
                `${actor.name}: rivedi ${row.name.it}`,
                `${actor.name}: revise ${row.name.en}`,
              ),
              body: L(
                `Dopo il ${row.trigger === "short" ? "riposo breve o lungo" : "riposo lungo"} puoi cambiare ${row.changeLimit === 1 ? "una scelta" : `${row.changeLimit} scelte`}.`,
                `After the ${row.trigger === "short" ? "Short or Long Rest" : "Long Rest"} you can change ${row.changeLimit === 1 ? "one choice" : `${row.changeLimit} choices`}.`,
              ),
              category: "reminders",
              target: { page: "characters", params: { id: actor.id, tab: "features" } },
            })),
        ),
  });
  // PG-82 / H-07: «Apri un Bastione…» by its own words, also from Home with no character in
  // context (a picker of the characters with a Bastion tab, or the party's bases).
  registry.add("command", {
    id: `${ID}.bastion`,
    label: L("Apri un Bastione…", "Open a Bastion…"),
    description: L(
      "Il Bastione di un personaggio o le basi del gruppo",
      "A character’s Bastion or the party’s bases",
    ),
    keywords: [
      L("bastione", "bastion"),
      L("bastioni", "bastions"),
      L("basi", "bases"),
      L("base", "base"),
      L("turno delle basi", "bastion turn"),
      L("strutture", "facilities"),
      L("ordini", "orders"),
      L("fortezza", "stronghold"),
    ],
    group: "characters",
    when: (ctx) => Boolean(ctx.state.ext?.party?.bastions),
    run: (ctx) => openBastion(ctx, ctx.state.ext.party.bastions),
  });
  registry.add("command", {
    id: `${ID}.mode`,
    label: L("Scheda: passa da Gioco a Modifica", "Sheet: switch between Play and Edit"),
    context: "characters",
    run: (ctx) => setMode(ctx, modeOf(ctx) === "edit" ? "play" : "edit"),
  });
  // The Table's attack detail names the attacker's active attack effects (Bless, Bane,
  // custom riders) as information rows (B46 provider seam): the combat engine does not add
  // their die, so the reminder sits where the attack is resolved. One provider per module,
  // installed last so a failed registration leaves nothing behind.
  if (!providerInstalled) {
    providerInstalled = true;
    addAttackModifierProvider((state, attackerId) => D.attackRiderRows(state, attackerId));
  }
}

/** The stat window (components, reasoned changes, roll) for another sheet control: the AC
 *  card and «Correggi valori» (PG-25). `edit` switches to Edit so a reasoned change can be
 *  added at once, as Roll20's per-section cog. */
export function openSheetStat(ctx, actorId, key, { edit = false } = {}) {
  if (edit && ctx.canControl(ctx.state.actors[actorId])) setMode(ctx, "edit");
  statDialog(ctx, actorId, key);
}
/** The one «Velocità e sensi» window (PG-30), from the sheet's Movement card. */
export function openSheetMovement(ctx, actorId, focus = "speeds") {
  movementDialog(ctx, actorId, focus);
}

// Test seams: render and dialog functions for Node tests with a fake ctx.
export const _test = {
  renderBar,
  renderBand,
  renderDerived,
  renderActions,
  renderNotes,
  renderReselect,
  renderTablePanel,
  renderFavouritesDock,
  statDialog,
  rollDialog,
  rollNow,
  xpDialog,
  defensesDialog,
  speedsDialog,
  movementDialog,
  noteDialog,
  reselectDialog,
  useFavorite,
  setMode,
  modeOf,
  ui,
  openStat,
  // Replaces the tracker neighbour (tests): {rollOwnInitiative, awaitsInitiative} or null.
  setTracker(value) {
    tracker = value;
  },
  // Replaces the dice tray's connected dice (C6, tests): {hasConnectedDie, awaitConnectedFaces},
  // null (none), or undefined to let the real neighbour load again.
  setConnectedDice(value) {
    connectedPinned = value !== undefined;
    connectedDice = value ?? null;
  },
  // Loads the real neighbour again (tests).
  reloadNeighbours() {
    loading = null;
    return loadNeighbours();
  },
};
