// B34 — Dice tray: entry module of the "dice-tray" area (registry B11).
//
// Where dice live in the app (B61 placement):
// - Table: the "Dadi" tab of the right sidebar, opened also by the action dock's "Tira i
//   dadi" (D&D Beyond's d20 tray button, DDB-151). Three sections: Tira (formula, dice
//   buttons, advantage, audience, physical/digital/connected dice, modifier stack, rolls
//   in place for checks/saves/skills, last ten rolls), Richieste (the DM's requests and
//   opposed rolls as cards, answered with physical or digital dice) and Impostazioni
//   (dice style 3D/2D, roll policy, hidden-roll policy, spell effects, connected dice and
//   the B56 "Prova i dadi" demo, absorbed here).
// - Character sheet, Actions tab: "Tiri" section with the Heroic Inspiration switch, a free
//   formula and the character's roll policy (DDB-036; PG-23: saves and skills roll from the
//   sheet's own list through the one engine, sheet-plus-domain rollProfile).
// - Log: a roll card's Correct, Reveal and Withdraw and a request card's «Tira» ask this
//   area through "chat:roll-action" (TV-87, TV-92).
// - Campaign journal: `@Embed[save:dex:13]` becomes a roll card (dnd5e FVT-146).
// - Map: short spell effects after a spell's roll or a sheet cast, by damage type, switchable
//   off (TV-125, Automated Animations).
// Pure rules live in dice-tray-domain.mjs and roll-requests.mjs; this file only renders
// permitted projections and commits. Every digital face comes from state.mjs rollDie.

import { rollDie } from "./state.mjs";
import * as domain from "./dice-tray-domain.mjs";
import * as requests from "./roll-requests.mjs";
import * as dice3d from "./dice-3d.mjs";
import { openRoll } from "./combat-ui.mjs";
import { registerTextEmbed } from "./text-embeds.mjs";
import { canControlActor, canViewActor, hiddenFromPlayers } from "./character-access.mjs";
import { SPELLS } from "./srd-sample.mjs";
import { disguises, maskNames } from "./conditions.mjs";

const { ID, pick } = domain;
const L = (it, en) => ({ it, en });
let area = null;

// ---------------------------------------------------------------- per-viewer UI memory

const blankRequestDraft = () => ({
  audience: "public",
  kind: "save",
  ability: "dex",
  skill: "athletics",
  dc: "",
  rollMode: "normal",
  actorIds: null,
  contest: [
    { actorId: "", kind: "skill", ability: "str", skill: "athletics" },
    { actorId: "", kind: "skill", ability: "dex", skill: "acrobatics" },
  ],
});
const ui = {
  role: null,
  section: "roll",
  actorId: null,
  formula: "1d20",
  rollMode: "normal",
  mode: null,
  audience: null,
  dc: "",
  label: "",
  faces: [],
  extra: [],
  error: "",
  requestError: "",
  modValue: "",
  presetDraft: { label: "", value: "", visible: true },
  requestDraft: blankRequestDraft(),
  requestFaces: {},
  physicalOpen: {},
  scan: false,
  blink: null,
  fresh: null,
  focus: null,
  menu: null,
  sheetFormula: "",
};
export function resetTrayUI(keepRole = null) {
  // A waiting roll never outlives its identity's view (role change, reset, tests).
  dropAllPrompts(keepRole);
  Object.assign(ui, {
    role: null,
    section: "roll",
    actorId: null,
    formula: "1d20",
    rollMode: "normal",
    mode: null,
    audience: null,
    dc: "",
    label: "",
    faces: [],
    extra: [],
    error: "",
    requestError: "",
    modValue: "",
    presetDraft: { label: "", value: "", visible: true },
    requestDraft: blankRequestDraft(),
    requestFaces: {},
    physicalOpen: {},
    scan: false,
    blink: null,
    fresh: null,
    focus: null,
    menu: null,
    sheetFormula: "",
  });
}
/** Test seam: the tray's transient UI memory. */
export const trayUI = () => ui;

// ---------------------------------------------------------------- helpers

const sliceOf = (ctx) => area?.slice(ctx.state) ?? domain.seedSlice();
const die = (ctx) => ctx.rollDie ?? rollDie;
const now = () => new Date().toISOString();
const esc = (ctx, value) => ctx.esc(value ?? "");
const localized = (ctx, error) =>
  error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error);
function setting(ctx, key, fallback) {
  try {
    return area.getSetting(ctx, key);
  } catch {
    return fallback;
  }
}
const b56Loaded = () => Boolean(area?.get("table-panel", "dice-3d"));
/** 3D shared dice (B56), 2D dice only for the roller, or none (Shard VTL-157, DDB-152). */
export function diceStyle(ctx) {
  if (b56Loaded() && dice3d.diceEnabled(ctx)) return "3d";
  return setting(ctx, `${ID}.style`, "2d") === "off" ? "off" : "2d";
}
export function motionReduced(ctx) {
  try {
    if (b56Loaded()) return dice3d.reducedMotion(ctx);
  } catch {
    /* B56 unavailable: fall back to the system setting */
  }
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}
/** Who sees a roll by default: the character's policy (PG-48), else the personal setting. */
const defaultAudience = (ctx, actorId = null) => {
  // Close review 01/10 (privacy P1-3; Fantasy Grounds hides GM rolls, Roll20 whispers NPC
  // rolls to the GM): the DM's roll for a creature hidden from the players starts hidden.
  if (actorId && runs(ctx) && hiddenFromPlayers(ctx.state, actorId))
    return ctx.role === "dm" ? "self" : "gm";
  const own = actorId ? domain.policyOf(sliceOf(ctx), actorId) : null;
  const value = own?.set ? own.audience : setting(ctx, `${ID}.audience`, "public");
  const allowed = domain.audiencesFor(ctx.role);
  // The DM's "Io e il DM" or "Solo il DM" is their own hidden roll ("Solo DM").
  if (ctx.role === "dm" && (value === "gm" || value === "blind")) return "self";
  return allowed.includes(value) ? value : "public";
};
/** The panel's one visibility selector (TV-90, Foundry roll mode): every roll it starts. */
const audienceNow = (ctx, actorId = ui.actorId) =>
  domain.audiencesFor(ctx.role).includes(ui.audience)
    ? ui.audience
    : defaultAudience(ctx, actorId || null);
const announcePolicy = (ctx) => setting(ctx, `${ID}-campaign.announce`, true) !== false;
/** TV-156: karmic dice for players' digital d20s, a campaign choice that starts off. */
export const karmaOn = (ctx) => setting(ctx, `${ID}-campaign.karmic`, false) === true;
/** The remembered dice choice for rolls in place: digital, or physical faces asked. */
const savedDice = (ctx) =>
  setting(ctx, `${ID}.dice`, "digital") === "physical" ? "physical" : "digital";
/** The tray's dice now: the tab's own choice, else the remembered one (review P2-6). */
const modeNow = (ctx) => ui.mode ?? savedDice(ctx);
function syncRole(ctx, selectedId) {
  if (ui.role !== ctx.role) {
    resetTrayUI(ctx.role);
    ui.role = ctx.role;
  }
  const actors = domain.trayActors(ctx.state, ctx.role);
  if (ui.actorId === null || (ui.actorId && !actors.some((a) => a.id === ui.actorId)))
    ui.actorId = domain.defaultActor(ctx.state, ctx.role, selectedId);
}
const modeText = (ctx, mode) =>
  mode === "physical"
    ? ctx.t("dado fisico", "physical die")
    : mode === "connected"
      ? ctx.t("dado connesso", "connected die")
      : ctx.t("dado digitale", "digital die");
/**
 * A record's dice in words: a connected die lands as a physical die and is named
 * («fisico · Pixels d20 Onice», the Pixels module's chat line); other rolls as modeText.
 */
function modeOf(ctx, record) {
  const names = (record?.devices ?? []).map((d) => pick(d, ctx.lang)).filter(Boolean);
  if (!names.length) return modeText(ctx, record?.mode);
  const mixed = (record.faceModes ?? []).includes("digital")
    ? ` (${ctx.t("gli altri dadi digitali", "the other dice digital")})`
    : "";
  return `${ctx.t("fisico", "physical")} · ${names.join(", ")}${mixed}`;
}
/** C3: the DM, or the member the DM handed the session to. */
const runs = (ctx) => domain.runsSessionFor(ctx.state, ctx.role);
/**
 * C1 (Fantasy Grounds hidden DC, BG3 DC display): "CD 13", or «CD nascosta» when `viewer`
 * may not read a DC the DM set. The success or failure is always shown.
 */
const dcText = (ctx, dc, setBy = "dm", viewer = ctx.role) =>
  domain.dcVisibleTo(ctx.state, viewer, setBy)
    ? `${ctx.t("CD", "DC")} ${dc}`
    : ctx.t("CD nascosta", "DC hidden");
const timeText = (ctx, iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
};
// TV-141: a player reads a disguised creature's old rolls under its current disguise.
const whoOf = (ctx, record) => {
  const name = record.actorName ?? (record.by === "dm" ? "DM" : ctx.t("Giocatore", "Player"));
  return ctx.role === "dm" ? name : maskNames(name, disguises(ctx.state));
};
// Attribute values in selectors (ids are UUID-based; quotes and backslashes escaped).
const cssEscape = (value) =>
  globalThis.CSS?.escape?.(String(value)) ?? String(value).replace(/["\\]/g, "\\$&");
const titleOf = (ctx, record) =>
  record.title ? pick(record.title, ctx.lang) : domain.prettyFormula(record.expression);

// ---------------------------------------------------------------- rolling

function commitOptionsFor(record) {
  if (record.audience === "self" && !record.announced)
    return { local: true, visibility: "private", undoable: false };
  return { undoable: false };
}
/**
 * The log line of a roll: the full result, or only its announcement for hidden rolls. The
 * line is shared, so a DC the DM set reads as players read it (C1); `viewer` overrides it
 * for a dialog only the roller sees.
 */
function rollLabel(ctx, record, viewer = "player") {
  const who = record.actorName ?? (record.by === "dm" ? "DM" : ctx.t("Giocatore", "Player"));
  const full = () => {
    const view = { ...record, readable: true };
    const dc =
      record.dc !== null
        ? ` · ${dcText(ctx, record.dc, record.dcBy, viewer)}: ${record.success ? ctx.t("successo", "success") : ctx.t("fallimento", "failure")}`
        : "";
    return `${who} · ${titleOf(ctx, record)}: ${domain.breakdown(view, ctx.lang)}${dc} · ${modeOf(ctx, record)}`;
  };
  if (record.audience === "public") return full();
  if (record.audience === "gm")
    return `${who} · ${ctx.t("tiro per sé e per il DM", "roll for self and the DM")}`;
  if (record.audience === "blind")
    return `${who} · ${ctx.t("tiro solo per il DM", "roll for the DM only")}`;
  if (record.announced)
    return record.by === "dm"
      ? ctx.t("Il DM ha fatto un tiro nascosto", "The DM made a hidden roll")
      : `${who} · ${ctx.t("tiro nascosto", "hidden roll")}`;
  return `${ctx.t("Solo per me", "Only for me")} · ${full()}`;
}
function announceRoll(ctx, record, logId = ctx.state.log.at(-1)?.id ?? null) {
  area.emit("roll-accepted", { logId, roll: domain.rollEvent(record) });
}
/**
 * Records a tray roll: validates first (nothing is drawn for a refused roll), draws the
 * digital faces once on a copy, then commits exactly those faces and announces the roll
 * with "roll-accepted" (B56 animates it for whoever may see it).
 */
export function rollFromTray(ctx, raw, { faces, faceModes, devices } = {}) {
  const slice = sliceOf(ctx);
  const prepared = domain.prepareRoll(slice, ctx.state, raw, ctx.role);
  const online = !ctx.offline;
  if (!online && prepared.audience !== "self")
    domain.fail(
      "Sei senza rete: un tiro che vedono altri non può essere registrato. Scegli «Solo io» o riconnettiti.",
      "You are offline: a roll others see cannot be recorded. Choose “Only me” or reconnect.",
      { code: "offline" },
    );
  const at = now();
  const id = `roll-${globalThis.crypto.randomUUID()}`;
  // TV-156: a player's digital d20s pass through karma when the campaign chose it.
  const karmic =
    karmaOn(ctx) && ctx.role !== "dm" && !faces && prepared.mode === "digital"
      ? domain.karmicDraw(die(ctx), slice.karma?.[ctx.role] ?? 0)
      : null;
  const options = {
    draw: karmic ? karmic.next : die(ctx),
    faces,
    faceModes,
    devices,
    now: at,
    announce: announcePolicy(ctx),
    online,
    id,
  };
  const preview = domain.recordRoll(structuredClone(slice), ctx.state, raw, ctx.role, options);
  const drawn = [...preview.values];
  let record = null;
  ui.fresh = { id, at: Date.now() };
  const rethrown = karmic?.report.rethrown ?? [];
  const label =
    rollLabel(ctx, preview) +
    (rethrown.length
      ? ` · ${ctx.t("dadi karmici", "karmic dice")}: ${rethrown.map((r) => `${r.from} → ${r.to}`).join(", ")}`
      : "");
  ctx.commit(
    label,
    (draft) => {
      record = domain.recordRoll(area.slice(draft), draft, raw, ctx.role, {
        ...options,
        draw: () => drawn.shift(),
      });
      // W2b1 integration (additive): the log line this roll wrote, so the chat (B17) shows
      // that line as the roll's card, as it did for the Table's old free roll.
      record.logLabel = label;
      if (karmic) {
        const tray = area.slice(draft);
        tray.karma = { ...(tray.karma ?? {}), [ctx.role]: karmic.report.streak };
        if (rethrown.length) record.karmic = rethrown;
      }
    },
    commitOptionsFor(preview),
  );
  announceRoll(ctx, record);
  return record;
}
/** The form's roll as raw input. */
function formRoll(ctx, overrides = {}) {
  return {
    kind: "free",
    formula: ui.formula,
    actorId: ui.actorId || null,
    rollMode: ui.rollMode,
    audience: audienceNow(ctx),
    mode: modeNow(ctx),
    dc: ui.dc,
    label: ui.label,
    ...overrides,
  };
}
function safe(ctx, run, onError) {
  try {
    return run();
  } catch (error) {
    if (onError) onError(localized(ctx, error), error);
    else ctx.toast(localized(ctx, error), true);
    return null;
  }
}
function toastRoll(ctx, record) {
  if (!record) return;
  const view = domain.projectRoll(record, ctx.role, ctx.state);
  ctx.toast(
    view?.readable
      ? `${record.actorName} · ${titleOf(ctx, record)}: ${record.total}${record.dc !== null ? ` · ${record.success ? ctx.t("successo", "success") : ctx.t("fallimento", "failure")}` : ""}`
      : pick(view?.announcement, ctx.lang) || ctx.t("Tiro registrato.", "Roll recorded."),
  );
}
/**
 * Rolls a check/save/skill "in place" from a boxed number (DDB-150) with the viewer's dice:
 * digital at once; physical asks the d20 faces first (Foundry manual fulfilment, FVT-153);
 * a die type set to a connected die waits for it (Pixels, TV-95), in the tray when the
 * number is the tray's (`where` "tray"), otherwise in the resolver dialog. `dice` defaults
 * to the remembered choice (Preferenze › Tiri e dadi, or the tray's «Dadi»).
 */
export function rollNumber(ctx, spec, { rollMode, audience, dice, where = "dialog" } = {}) {
  // PG-48: the character's own policy (Roll20 Manage Sheet) wins over the personal default.
  const own = domain.policyOf(sliceOf(ctx), spec.actorId);
  const policy = own.set ? own.d20 : setting(ctx, `${ID}.advantage`, "normal");
  const how = (dice ?? savedDice(ctx)) === "physical" ? "physical" : "digital";
  const raw = (mode) => ({
    kind: spec.kind,
    ability: spec.ability,
    skill: spec.skill,
    actorId: spec.actorId,
    rollMode: mode,
    audience: audience ?? defaultAudience(ctx, spec.actorId),
    mode: how,
    dc: spec.dc ?? null,
    origin: spec.origin ?? null,
  });
  const run = (mode) => {
    const plan = connectedPlan(ctx, raw(mode));
    if (plan) return waitForRoll(ctx, raw(mode), plan, { where });
    if (how === "physical") return askFaces(ctx, spec, raw(mode));
    return safe(ctx, () => {
      const record = rollFromTray(ctx, raw(mode));
      toastRoll(ctx, record);
      return record;
    });
  };
  // Roll20 "Query" / Beyond20 "ask every time" (PG-48): the choice comes before the roll;
  // "always advantage/disadvantage" (Roll20 Always, Beyond20) unless the roll names one.
  if (!rollMode && policy === "ask") return askAdvantage(ctx, spec, run);
  const always = policy === "advantage" || policy === "disadvantage" ? policy : "normal";
  return run(rollMode ?? always);
}
/**
 * Physical dice for a roll in place: one field per d20 (two with advantage or
 * disadvantage), then the roll is recorded with those faces. A wrong face keeps the dialog
 * open with the reason; Escape leaves nothing recorded.
 */
function askFaces(ctx, spec, raw) {
  // The effective mode (a condition's Disadvantage included) decides how many d20s.
  const prepared = safe(ctx, () => domain.prepareRoll(sliceOf(ctx), ctx.state, raw, ctx.role));
  if (!prepared) return null;
  const count = prepared.rollMode === "advantage" || prepared.rollMode === "disadvantage" ? 2 : 1;
  const modifier = modifierOf(ctx, spec.actorId, spec);
  const title = pick(domain.testTitle(spec), ctx.lang);
  const dc =
    raw.dc !== null && raw.dc !== undefined
      ? ` · ${dcText(ctx, raw.dc, raw.origin?.kind === "journal" ? "dm" : "player")}`
      : "";
  const reasons = modeWithReasons(ctx, prepared.rollMode, prepared.conditionReasons);
  const how =
    count > 1
      ? ` (${reasons}: ${ctx.t("due d20", "two d20s")})`
      : prepared.conditionReasons
        ? ` (${reasons})`
        : "";
  ctx.dialog(
    ctx.t("Facce del dado fisico", "Physical die faces"),
    `<p><strong>${esc(ctx, ctx.state.actors[spec.actorId]?.name)} · ${esc(ctx, title)}${esc(ctx, dc)}</strong></p><p>d20${esc(ctx, how)} ${modifier === null ? "" : domain.signed(modifier)}</p><div class="form-grid">${Array.from({ length: count }, (_, i) => `<label class="field">d20${count > 1 ? " " + (i + 1) : ""}<input type="number" name="face-${i}" min="1" max="20" step="1" inputmode="numeric" data-dtray-ask-face="${i}"></label>`).join("")}</div><p class="muted">${ctx.t("Lancia il dado e scrivi la faccia naturale: il modificatore si aggiunge una volta. Esc chiude senza registrare.", "Roll the die and write the natural face: the modifier is added once. Escape closes without recording.")}</p>`,
    {
      submitLabel: ctx.t("Registra il tiro", "Record the roll"),
      onSubmit: (data) => {
        const faces = Array.from({ length: count }, (_, i) => data.get(`face-${i}`) ?? "");
        const record = rollFromTray(ctx, raw, { faces });
        toastRoll(ctx, record);
      },
    },
  );
  globalThis.document?.querySelector('#dialog [data-dtray-ask-face="0"]')?.focus();
  return null;
}
// ---------------------------------------------------------------- connected dice (TV-95)

// Rolls waiting for a connected die, oldest first: Foundry's roll resolver waiting for a
// Pixels die (the Pixels module fills the manual fulfilment). Each belongs to one identity
// and is cancelled by a role change. Nothing is recorded before every face is known.
const prompts = [];
let promptSeq = 0;
/** Test seam: this identity's rolls waiting for a connected die. */
export const waitingRolls = (ctx) => prompts.filter((p) => p.role === ctx.role);
const deviceName = (ctx, device) => pick(device?.name, ctx.lang) || `d${device?.sides ?? ""}`;
const deviceById = (ctx, id) =>
  (sliceOf(ctx).devices?.[ctx.role] ?? []).find((d) => d.id === id) ?? null;
const slotDevice = (ctx, slot) =>
  slot.method === "connected"
    ? (deviceById(ctx, slot.deviceId) ?? domain.deviceFor(sliceOf(ctx), ctx.role, slot.sides))
    : null;
const isFace = (value, sides) => {
  const n = Number(value);
  return String(value ?? "").trim() !== "" && Number.isInteger(n) && n >= 1 && n <= sides;
};
/** C6: a paired die of `sides` is connected and can report a throw now. */
export function hasConnectedDie(ctx, sides) {
  return Boolean(domain.usableDevice(sliceOf(ctx), ctx.role, Number(sides)));
}
/** Why a paired die cannot report a throw now, with the remedy (SV-37), or "". */
function deviceBlock(ctx, device) {
  if (!device) return "";
  if (device.state === "charging")
    return ctx.t(
      `${deviceName(ctx, device)} è in carica: toglilo dal caricatore per lanciarlo, oppure scrivi la faccia a mano.`,
      `${deviceName(ctx, device)} is charging: take it off the charger to throw it, or type the face.`,
    );
  if (device.state === "disconnected")
    return ctx.t(
      `${deviceName(ctx, device)} non è connesso: ricollegalo in Dadi › Impostazioni › Dadi connessi, oppure scrivi la faccia a mano.`,
      `${deviceName(ctx, device)} is not connected: reconnect it in Dice › Settings › Connected dice, or type the face.`,
    );
  return "";
}
/**
 * The plan of a tray roll when a die type it rolls is set to a connected die (Foundry's
 * dice configuration); null when no connected die takes part (the usual paths apply).
 */
function connectedPlan(ctx, raw) {
  let prepared = null;
  try {
    prepared = domain.prepareRoll(sliceOf(ctx), ctx.state, raw, ctx.role);
  } catch {
    return null;
  }
  const fallback = raw.mode === "physical" ? "physical" : "digital";
  const plan = domain.dicePlan(sliceOf(ctx), ctx.role, domain.baseSides(prepared.parsed), fallback);
  return plan.some((d) => d.method === "connected") ? plan : null;
}
/** The extra dice an explosion asks for once these faces are known (none otherwise). */
function explosionNeeds(ctx, raw, faces) {
  try {
    domain.physicalFaces(domain.prepareRoll(sliceOf(ctx), ctx.state, raw, ctx.role).parsed, faces);
    return [];
  } catch (error) {
    return error.code === "explosion-faces" ? error.needs : [];
  }
}
/**
 * Opens a waiting roll: `plan` lists each die with its method; physical faces may come
 * prefilled. `finish(faces, {faceModes, devices})` runs once every face is known; digital
 * dice are drawn by the app's dice service then. `where`: "tray" (the tray's result card)
 * or "dialog" (the resolver dialog, above any page).
 */
function openPrompt(ctx, { where = "dialog", title, detail = "", plan, prefill = [], ...hooks }) {
  const prompt = {
    id: `wait-${++promptSeq}`,
    role: ctx.role,
    where,
    title,
    detail,
    error: "",
    dice: plan.map((d, i) => {
      const typed = d.method !== "digital" && isFace(prefill[i], d.sides);
      return {
        sides: d.sides,
        method: d.method,
        deviceId: d.device?.id ?? null,
        face: typed ? Number(prefill[i]) : null,
        by: typed ? "hand" : null,
      };
    }),
    ...hooks,
  };
  prompts.push(prompt);
  if (ready(prompt)) {
    complete(ctx, prompt);
    return prompt;
  }
  if (where === "tray") {
    ui.section = "roll";
    rerender(ctx, `[data-dtray-connected-roll="${prompt.id}"]`);
  } else openResolver(ctx, prompt);
  return prompt;
}
const ready = (prompt) => prompt.dice.every((d) => d.method === "digital" || d.face !== null);
const nextConnected = (prompt) =>
  prompt.dice.find((d) => d.method === "connected" && d.face === null) ?? null;
function dropPrompt(prompt) {
  const index = prompts.indexOf(prompt);
  if (index >= 0) prompts.splice(index, 1);
}
/**
 * Every face known: draws the digital dice, asks the extra dice an explosion needs (the
 * roll keeps waiting for them), then records through the prompt's `finish`. A resolver
 * dialog is closed first, so whatever `finish` opens next stays open.
 */
function complete(ctx, prompt) {
  for (const slot of prompt.dice)
    if (slot.method === "digital" && slot.face === null) {
      slot.face = domain.digitalFaces(die(ctx))(slot.sides);
      slot.by = "digital";
    }
  const faces = prompt.dice.map((d) => d.face);
  const needs = prompt.needs?.(faces) ?? [];
  if (needs.length) {
    const fallback = prompt.fallback ?? "digital";
    for (const plan of domain.dicePlan(sliceOf(ctx), ctx.role, needs, fallback))
      prompt.dice.push({
        sides: plan.sides,
        method: plan.method,
        deviceId: plan.device?.id ?? null,
        face: null,
        by: null,
      });
    if (ready(prompt)) return complete(ctx, prompt);
    prompt.error = ctx.t(
      "Un dado è esploso: lancia anche il dado aggiuntivo.",
      "A die exploded: throw the extra die too.",
    );
    return refreshPrompt(ctx, prompt);
  }
  const info = {
    faceModes: prompt.dice.map((d) =>
      d.method === "digital" ? "digital" : d.by === "device" ? "connected" : "physical",
    ),
    devices: [
      ...new Map(
        prompt.dice
          .filter((d) => d.by === "device")
          .map((d) => deviceById(ctx, d.deviceId))
          .filter(Boolean)
          .map((d) => [d.id, d.name]),
      ).values(),
    ],
  };
  dropPrompt(prompt);
  prompt.done = true;
  if (prompt.where === "dialog") closeResolver(ctx, prompt);
  try {
    prompt.finish?.(faces, info);
  } catch (error) {
    if (prompt.where === "tray") {
      ui.error = localized(ctx, error);
      prompt.done = false;
      prompt.error = ui.error;
      prompts.push(prompt);
    } else ctx.toast(localized(ctx, error), true);
  }
  if (prompt.where === "tray") rerender(ctx, ui.focus ?? "[data-dtray-roll-button]");
  return true;
}
function cancelPrompt(ctx, prompt) {
  if (prompt.done) return;
  dropPrompt(prompt);
  prompt.done = true;
  prompt.cancelled?.();
  if (prompt.where === "tray") rerender(ctx, "[data-dtray-roll-button]");
}
/** Reads the faces typed by hand into a waiting roll; a wrong or missing one is refused. */
function takeTyped(ctx, prompt, typed) {
  prompt.dice.forEach((slot, i) => {
    if (slot.method === "digital" || slot.by === "device") return;
    const value = typed(i);
    if (value === null || value === undefined || String(value).trim() === "") return;
    if (!isFace(value, slot.sides))
      domain.fail(
        `Faccia ${i + 1} non valida: serve un numero intero tra 1 e ${slot.sides}.`,
        `Face ${i + 1} is not valid: it must be a whole number from 1 to ${slot.sides}.`,
      );
    slot.face = Number(value);
    slot.by = "hand";
  });
  const missing = prompt.dice.find((d) => d.method !== "digital" && d.face === null);
  if (missing)
    domain.fail(
      `Manca la faccia del d${missing.sides}: lancia il dado connesso o scrivila a mano.`,
      `The d${missing.sides} face is missing: throw the connected die or type it.`,
    );
}
/**
 * «Simula il lancio»: stands in for throwing a connected die (no Bluetooth here). The face
 * comes from the app's dice service and fills the oldest roll waiting for that die type; with
 * nothing waiting it is an unprompted roll, a free roll card in the tray (Pixels module).
 * `target` is a paired die's id or a number of sides.
 */
export function simulateConnectedRoll(ctx, target) {
  syncRole(ctx);
  const slice = sliceOf(ctx);
  const device =
    typeof target === "string" && !/^\d+$/.test(target)
      ? deviceById(ctx, target)
      : (domain.usableDevice(slice, ctx.role, Number(target)) ??
        domain.deviceFor(slice, ctx.role, Number(target)));
  if (!device)
    domain.fail(
      "Nessun dado connesso di questo tipo: collegane uno in Dadi › Impostazioni › Dadi connessi.",
      "No connected die of this type: pair one in Dice › Settings › Connected dice.",
      { code: "no-device" },
    );
  const blocked = deviceBlock(ctx, device);
  if (blocked) throw Object.assign(Error(blocked), { it: blocked, en: blocked, code: "blocked" });
  const face = domain.digitalFaces(die(ctx))(device.sides);
  const prompt = prompts.find(
    (p) =>
      p.role === ctx.role &&
      p.dice.some((d) => d.method === "connected" && d.sides === device.sides && d.face === null),
  );
  if (!prompt) return { face, unprompted: rollUnprompted(ctx, device, face) };
  const slot = prompt.dice.find(
    (d) => d.method === "connected" && d.sides === device.sides && d.face === null,
  );
  Object.assign(slot, { face, by: "device", deviceId: device.id });
  prompt.error = "";
  if (ready(prompt)) complete(ctx, prompt);
  else refreshPrompt(ctx, prompt);
  return { face, prompt: prompt.id };
}
/** A connected-die throw with nothing waiting: a free roll card (the Pixels module's roll). */
function rollUnprompted(ctx, device, face) {
  const who = ui.actorId || null;
  const record = rollFromTray(
    ctx,
    {
      kind: "free",
      formula: `1d${device.sides}`,
      actorId: who,
      rollMode: "normal",
      audience: audienceNow(ctx, who),
      mode: "connected",
      label: L(
        `Tiro senza richiesta · ${pick(device.name, "it")}`,
        `Unprompted roll · ${pick(device.name, "en")}`,
      ),
    },
    { faces: [face], faceModes: ["connected"], devices: [device.name] },
  );
  ui.section = "roll";
  ui.focus = "[data-dtray-result]";
  toastRoll(ctx, record);
  ctx.render();
  return record;
}
/** A tray roll (form or number) that waits for a connected die, then lands as physical. */
function waitForRoll(ctx, raw, plan, { where = "tray", prefill = [] } = {}) {
  ui.error = "";
  const actor = raw.actorId ? ctx.state.actors[raw.actorId] : null;
  const title =
    raw.kind === "free"
      ? `${actor?.name ?? (ctx.role === "dm" ? "DM" : ctx.t("Giocatore", "Player"))} · ${raw.label || domain.prettyFormula(domain.parseFormula(raw.formula).text)}`
      : `${actor?.name ?? ""} · ${pick(domain.testTitle(raw), ctx.lang)}`;
  const detail =
    raw.dc !== null && raw.dc !== undefined && raw.dc !== ""
      ? dcText(ctx, raw.dc, raw.origin?.kind === "journal" || ctx.role === "dm" ? "dm" : "player")
      : "";
  openPrompt(ctx, {
    where,
    title,
    detail,
    plan,
    prefill,
    fallback: raw.mode === "physical" ? "physical" : "digital",
    needs: (faces) => explosionNeeds(ctx, raw, faces),
    finish: (faces, info) => {
      const record = rollFromTray(ctx, { ...raw, mode: "connected" }, { faces, ...info });
      ui.faces = [];
      ui.extra = [];
      ui.focus = "[data-dtray-roll-button]";
      toastRoll(ctx, record);
      return record;
    },
  });
  return null;
}
/**
 * C6 for combat attempts (R1): waits for `count` faces of a connected d`sides` in the
 * resolver dialog (Foundry's roll resolver with the Pixels module). Resolves with the faces
 * (their `faceModes` and the `devices` that reported them as properties of the array), or
 * null when no die of that type is paired or the person cancels.
 */
export function awaitConnectedFaces(
  ctx,
  { actorId = null, sides = 20, count = 1, label = null } = {},
) {
  const n = Number(sides);
  const device = domain.deviceFor(sliceOf(ctx), ctx.role, n);
  if (!device) return Promise.resolve(null);
  const name = actorId ? ctx.state.actors?.[actorId]?.name : null;
  return new Promise((resolve) => {
    openPrompt(ctx, {
      where: "dialog",
      title: [name, label ? pick(label, ctx.lang) : null].filter(Boolean).join(" · ") || `d${n}`,
      plan: Array.from({ length: Math.max(1, Number(count) || 1) }, () => ({
        sides: n,
        method: "connected",
        device,
      })),
      finish: (faces, info) => resolve(Object.assign([...faces], info)),
      cancelled: () => resolve(null),
    });
  });
}

/** A role change or a reset cancels every waiting roll: none crosses to another identity. */
function dropAllPrompts(keepRole = null) {
  for (const prompt of prompts.filter((p) => p.role !== keepRole)) {
    dropPrompt(prompt);
    prompt.done = true;
    prompt.cancelled?.();
  }
}
/**
 * The palette's «Dadi connessi»: the Table's Dice tab, Settings, the connection panel in view
 * (the dock's «Tira i dadi» opens the tab and never closes it).
 */
export function openConnectedDice(ctx) {
  openTraySection(ctx, "look", "#dtray-devices-title");
}
/**
 * Final review F16: the Table's Dice tab on a section ("roll", "requests", "look"), with a
 * control to focus; `audience` preselects who sees a roll (the DM's secret roll).
 */
export function openTraySection(ctx, section, focus = null, { audience = null } = {}) {
  syncRole(ctx);
  ui.section = section;
  ui.focus = focus;
  if (audience && domain.audiencesFor(ctx.role).includes(audience)) ui.audience = audience;
  const press = (tries = 0) => {
    const doc = globalThis.document;
    const dock = doc?.querySelector?.('#content [data-table="dice"]');
    if (dock) return dock.click();
    const handle = doc?.querySelector?.('#content [data-table-drawer="dice-tray"]');
    if (handle && handle.getAttribute("aria-expanded") !== "true") return handle.click();
    if (handle) return ctx.render();
    if (tries < 20) globalThis.setTimeout?.(() => press(tries + 1), 50);
  };
  if (ctx.view?.page !== "table") {
    ctx.navigate?.("table");
    globalThis.setTimeout?.(() => press(), 0);
  } else press();
}

// ---------------------------------------------------------------- the waiting card / resolver

function batteryHTML(ctx, device) {
  if (!device) return "";
  const low = domain.batteryLow(device);
  return ` · <span class="dtray-battery${low ? " is-low" : ""}" data-dtray-battery="${esc(ctx, device.id)}">${ctx.t("batteria", "battery")} ${device.battery}%${low ? ` · ${ctx.t("scarica: ricaricalo presto", "low: charge it soon")}` : ""}</span>`;
}
function slotState(ctx, slot) {
  if (slot.face !== null)
    return slot.by === "device"
      ? ctx.t("arrivata dal dado connesso", "reported by the connected die")
      : slot.by === "digital"
        ? ctx.t("dado digitale", "digital die")
        : ctx.t("scritta a mano", "typed by hand");
  if (slot.method === "digital")
    return ctx.t("la tira l'app alla fine", "the app rolls it at the end");
  if (slot.method === "connected") return ctx.t("in attesa del lancio", "waiting for the throw");
  return ctx.t("scrivi la faccia del dado fisico", "type the physical die's face");
}
/** The waiting roll: each die, its face as it arrives, «Simula il lancio», by hand or cancel. */
function waitingHTML(ctx, prompt, inDialog = false) {
  const next = nextConnected(prompt);
  const device = next ? slotDevice(ctx, next) : null;
  const blocked = deviceBlock(ctx, device);
  const whyId = `dtray-wait-why-${prompt.id}`;
  const rows = prompt.dice
    .map((slot, i) => {
      const dev = slotDevice(ctx, slot);
      const who =
        slot.method === "connected"
          ? deviceName(ctx, dev)
          : slot.method === "physical"
            ? ctx.t("a mano", "by hand")
            : ctx.t("digitale", "digital");
      const input =
        slot.method === "digital"
          ? `<strong class="dtray-wait-face">${slot.face ?? "—"}</strong>`
          : `<label class="field dtray-small">${ctx.t("Faccia", "Face")}<input type="number" inputmode="numeric" min="1" max="${slot.sides}" step="1" name="wait-face-${i}" value="${slot.face ?? ""}" data-dtray-wait-face="${i}" data-prompt="${esc(ctx, prompt.id)}"${slot.by === "device" ? " readonly" : ""}></label>`;
      return `<li class="dtray-wait-die" data-dtray-wait-die="${i}" data-state="${slot.face !== null ? "done" : "waiting"}"><span class="dtray-wait-name"><strong>d${slot.sides}</strong> · ${esc(ctx, who)}${dev ? batteryHTML(ctx, dev) : ""}</span>${input}<small class="muted" data-dtray-wait-state="${i}">${esc(ctx, slotState(ctx, slot))}</small></li>`;
    })
    .join("");
  const simulate = next
    ? `<button type="button" class="button primary" data-dtray-connected-roll="${esc(ctx, prompt.id)}"${blocked ? ` disabled aria-describedby="${whyId}"` : ""}>${ctx.icon("dice")} ${ctx.t("Simula il lancio", "Simulate the throw")} · ${esc(ctx, deviceName(ctx, device))}</button>`
    : "";
  const buttons = inDialog
    ? simulate
    : `${simulate}<button type="button" class="button" data-dtray-connected-record="${esc(ctx, prompt.id)}">${ctx.t("Registra con queste facce", "Record with these faces")}</button><button type="button" class="button quiet" data-dtray-connected-cancel="${esc(ctx, prompt.id)}">${ctx.t("Annulla", "Cancel")}</button>`;
  // In the resolver dialog its own title already says it; the tray card carries its title.
  const heading = inDialog
    ? ""
    : `<p class="dtray-wait-title" id="dtray-wait-title-${esc(ctx, prompt.id)}"><strong>${ctx.t("In attesa del dado connesso…", "Waiting for the connected die…")}</strong></p>`;
  return `<div class="dtray-result dtray-waiting" data-dtray-waiting="${esc(ctx, prompt.id)}" role="group" aria-labelledby="${inDialog ? "dialog-title" : `dtray-wait-title-${esc(ctx, prompt.id)}`}">${heading}<p class="dtray-wait-what">${esc(ctx, prompt.title)}${prompt.detail ? ` · ${esc(ctx, prompt.detail)}` : ""}</p><ol class="dtray-wait-dice">${rows}</ol>${blocked ? `<p class="dtray-warn" id="${whyId}">${esc(ctx, blocked)}</p>` : ""}<p class="muted dtray-hint">${ctx.t("Lancia il dado vero: la faccia arriva da sola. Qui è una simulazione: «Simula il lancio» fa le veci del lancio. Puoi anche scrivere la faccia a mano.", "Throw the real die: the face arrives by itself. This is a simulation: “Simulate the throw” stands in for the throw. You can also type the face.")}</p><p class="error" role="alert" data-dtray-wait-error${prompt.error ? "" : " hidden"}>${esc(ctx, prompt.error)}</p><div class="toolbar dtray-wait-actions">${buttons}</div></div>`;
}
/** The resolver dialog (Foundry's roll resolver window) for a roll outside the tray. */
function openResolver(ctx, prompt) {
  ctx.dialog(
    ctx.t("In attesa del dado connesso", "Waiting for the connected die"),
    waitingHTML(ctx, prompt, true),
    {
      submitLabel: ctx.t("Registra il tiro", "Record the roll"),
      cancelLabel: ctx.t("Annulla", "Cancel"),
      onSubmit: (data) => {
        if (prompt.done) return true;
        takeTyped(ctx, prompt, (i) => data.get(`wait-face-${i}`));
        complete(ctx, prompt);
        return true;
      },
    },
  );
  bindResolver(ctx, prompt);
  const el = resolverRoot();
  // Escape or «Annulla» cancels the roll; an earlier dialog's close event is ignored, and a
  // resolver replaced by another dialog cancels its roll too (nothing left to show it).
  const onClose = () => {
    if (prompt.done) return el.removeEventListener("close", onClose);
    if (el.open && el.querySelector(`[data-dtray-waiting="${cssEscape(prompt.id)}"]`)) return;
    el.removeEventListener("close", onClose);
    cancelPrompt(ctx, prompt);
  };
  el?.addEventListener?.("close", onClose);
}
function resolverRoot() {
  return globalThis.document?.querySelector?.("#dialog") ?? null;
}
function bindResolver(ctx, prompt) {
  const el = resolverRoot();
  if (!el) return;
  el.querySelector(`[data-dtray-connected-roll]`)?.addEventListener("click", () => {
    const next = nextConnected(prompt);
    if (!next) return;
    safe(
      ctx,
      () => simulateConnectedRoll(ctx, slotDevice(ctx, next)?.id ?? next.sides),
      (message) => {
        prompt.error = message;
        refreshPrompt(ctx, prompt);
      },
    );
  });
  el.querySelectorAll("[data-dtray-wait-face]").forEach((input) =>
    input.addEventListener("input", () => {
      const slot = prompt.dice[Number(input.dataset.dtrayWaitFace)];
      if (slot && slot.by !== "device") {
        slot.face = isFace(input.value, slot.sides) ? Number(input.value) : null;
        slot.by = slot.face === null ? null : "hand";
      }
    }),
  );
}
function closeResolver(ctx, prompt) {
  const el = resolverRoot();
  if (!el || el.querySelector(`[data-dtray-waiting="${cssEscape(prompt.id)}"]`)) ctx.closeDialog();
}
/** Shows a face as it arrives: the tray re-renders; the resolver dialog updates in place. */
function refreshPrompt(ctx, prompt) {
  if (prompt.where === "tray") return rerender(ctx, `[data-dtray-connected-roll="${prompt.id}"]`);
  const el = resolverRoot();
  const box = el?.querySelector(`[data-dtray-waiting="${cssEscape(prompt.id)}"]`);
  if (!box) return;
  const holder = el.ownerDocument.createElement("div");
  holder.innerHTML = waitingHTML(ctx, prompt, true);
  box.replaceWith(holder.firstElementChild);
  bindResolver(ctx, prompt);
  const live =
    el.querySelector("[data-dtray-connected-roll]") ?? el.querySelector("[data-dtray-wait-face]");
  live?.focus?.();
}
function askAdvantage(ctx, spec, run) {
  const title = domain.testTitle(spec);
  ctx.dialog(
    ctx.t("Vantaggio o svantaggio?", "Advantage or disadvantage?"),
    `<p>${esc(ctx, ctx.state.actors[spec.actorId]?.name)} · ${esc(ctx, pick(title, ctx.lang))}</p><p class="muted">${ctx.t("La tua politica dei tiri chiede ogni volta (Preferenze › Tiri e dadi).", "Your roll policy asks every time (Preferences › Rolls and dice).")}</p><div class="dtray-ask" role="group" aria-label="${ctx.t("Come tirare", "How to roll")}"><button type="button" class="button" data-dtray-ask="advantage">${ctx.t("Vantaggio", "Advantage")}</button><button type="button" class="button primary" data-dtray-ask="normal">${ctx.t("Normale", "Normal")}</button><button type="button" class="button" data-dtray-ask="disadvantage">${ctx.t("Svantaggio", "Disadvantage")}</button></div>`,
    { cancelLabel: ctx.t("Annulla", "Cancel") },
  );
  const dialog = globalThis.document?.querySelector("#dialog");
  dialog?.querySelectorAll("[data-dtray-ask]").forEach((button) => {
    button.onclick = () => {
      ctx.closeDialog();
      run(button.dataset.dtrayAsk);
    };
  });
  dialog?.querySelector('[data-dtray-ask="normal"]')?.focus();
}

// ---------------------------------------------------------------- roll menu (right click, long press, "…")

let menuCleanup = null;
function closeMenu() {
  menuCleanup?.();
  menuCleanup = null;
}
/**
 * The roll menu of a number or of the tray's Roll button (D&D Beyond: right click or long
 * press; here also a visible "…" button): Advantage, Disadvantage, Normal (one d20) or
 * Critical for damage dice, then who sees this one roll (DDB-149 per-roll override).
 */
function openMenu(ctx, host, anchor, spec, run, point = null) {
  closeMenu();
  const doc = host.ownerDocument;
  // A popup overlay under <body>: the Table panel is a size container, which would become
  // the containing block of a fixed menu (registry rule 6, overlay exception).
  const menu = doc.createElement("div");
  menu.className = "dtray-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", ctx.t("Opzioni di tiro", "Roll options"));
  const items = [];
  if (spec.d20)
    items.push(
      ["advantage", ctx.t("Tira con vantaggio", "Roll with advantage")],
      ["disadvantage", ctx.t("Tira con svantaggio", "Roll with disadvantage")],
      ["normal", ctx.t("Tira normale (un d20)", "Roll normally (one d20)")],
    );
  else
    items.push(
      ["normal", ctx.t("Tira normale", "Roll normally")],
      ...(spec.critical ? [["critical", ctx.t("Tira come critico", "Roll as a critical")]] : []),
    );
  const audiences = domain.audiencesFor(ctx.role);
  menu.innerHTML =
    items
      .map(
        ([mode, label]) =>
          `<button type="button" role="menuitem" class="dtray-menu-item" data-dtray-menu-mode="${mode}">${esc(ctx, label)}</button>`,
      )
      .join("") +
    `<p class="dtray-menu-heading" role="presentation">${ctx.t("Tira per", "Roll to")}</p>` +
    audiences
      .map(
        (a) =>
          `<button type="button" role="menuitem" class="dtray-menu-item" data-dtray-menu-audience="${a}">${esc(ctx, pick(domain.audienceName(a, ctx.role), ctx.lang))}</button>`,
      )
      .join("");
  doc.body.append(menu);
  const rect = anchor.getBoundingClientRect();
  const x = point?.x ?? rect.left;
  const y = point?.y ?? rect.bottom;
  const width = menu.offsetWidth || 240;
  const height = menu.offsetHeight || 300;
  const view = doc.defaultView;
  menu.style.left = `${Math.max(8, Math.min(x, view.innerWidth - width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y + 4, view.innerHeight - height - 8))}px`;
  const buttons = [...menu.querySelectorAll("[role=menuitem]")];
  const choose = (event) => {
    const button = event.target.closest("[role=menuitem]");
    if (!button) return;
    const mode = button.dataset.dtrayMenuMode;
    const audience = button.dataset.dtrayMenuAudience;
    closeMenu();
    anchor.focus?.({ preventScroll: true });
    run({ rollMode: mode ?? undefined, audience: audience ?? undefined });
  };
  const onKey = (event) => {
    const index = buttons.indexOf(doc.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      anchor.focus?.({ preventScroll: true });
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      buttons[event.key === "Home" ? 0 : buttons.length - 1].focus();
    } else if (event.key === "Tab") closeMenu();
  };
  const outside = (event) => {
    if (!menu.contains(event.target) && event.target !== anchor) closeMenu();
  };
  menu.addEventListener("click", choose);
  menu.addEventListener("keydown", onKey);
  doc.addEventListener("pointerdown", outside, true);
  // The "…" button says whether its menu is open (menu button pattern).
  const expands = anchor.hasAttribute?.("aria-haspopup");
  if (expands) anchor.setAttribute("aria-expanded", "true");
  menuCleanup = () => {
    doc.removeEventListener("pointerdown", outside, true);
    menu.remove();
    if (expands) anchor.setAttribute("aria-expanded", "false");
  };
  buttons[0]?.focus();
  return menu;
}
/**
 * Binds a rollable control: click rolls (Shift = advantage, Ctrl/⌘ = disadvantage,
 * Beyond20 hotkeys VTL-012), right click and a long press open the roll menu, and the
 * sibling "…" button opens it from the keyboard.
 */
function bindRollable(ctx, host, control, spec, run) {
  let timer = 0;
  let start = null;
  let longPressed = false;
  const clear = () => {
    clearTimeout(timer);
    timer = 0;
  };
  control.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    longPressed = false;
    start = { x: event.clientX, y: event.clientY };
    clear();
    timer = setTimeout(() => {
      longPressed = true;
      openMenu(ctx, host, control, spec, run, start);
    }, 500);
  });
  control.addEventListener("pointermove", (event) => {
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) clear();
  });
  for (const type of ["pointerup", "pointercancel", "pointerleave"])
    control.addEventListener(type, clear);
  control.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    clear();
    if (longPressed) return; // a touch long press already opened it
    openMenu(ctx, host, control, spec, run, { x: event.clientX, y: event.clientY });
  });
  control.addEventListener("click", (event) => {
    if (longPressed) {
      longPressed = false;
      event.preventDefault();
      return;
    }
    const rollMode = event.shiftKey
      ? "advantage"
      : event.ctrlKey || event.metaKey
        ? "disadvantage"
        : undefined;
    run({ rollMode: spec.d20 ? rollMode : undefined });
  });
  const more = control.parentElement?.querySelector("[data-dtray-more]");
  more?.addEventListener("click", () => openMenu(ctx, host, more, spec, run));
}

// ---------------------------------------------------------------- 2D dice (Shard, VTL-157)

function dieFace(ctx, face, sides, { animate, index }) {
  return `<span class="dtray-die dtray-d${sides}${face.kept ? "" : " is-dropped"}${face.rerolled ? " is-rerolled" : ""}${animate ? " is-rolling" : ""}" style="--dtray-i:${index}" aria-hidden="true"><span>${face.value}</span></span>`;
}
function dice2D(ctx, record, animate) {
  let index = 0;
  return `<div class="dtray-2d" data-dtray-2d data-animated="${animate}" aria-hidden="true">${record.groups
    .map((g) => g.faces.map((f) => dieFace(ctx, f, g.sides, { animate, index: index++ })).join(""))
    .join("")}</div>`;
}

// ---------------------------------------------------------------- render: Tira

function numberButton(ctx, spec, label, value, attrs = "") {
  const name = `${pick(domain.testTitle(spec), ctx.lang)} · ${ctx.state.actors[spec.actorId]?.name ?? ""}`;
  // PG-23 (D&D Beyond's advantage/disadvantage marks): the number says the mode it rolls with.
  const effects = domain.conditionTest(ctx.state, spec.actorId, spec);
  const mode = domain.combineModes(
    effects.advantage.length ? "advantage" : "normal",
    effects.disadvantage.length ? "disadvantage" : "normal",
  );
  const why = mode === "normal" ? "" : modeWithReasons(ctx, mode, effects);
  const mark = why
    ? `<small class="dtray-num-mode is-${mode}" title="${esc(ctx, why)}" aria-hidden="true">${mode === "advantage" ? "▲" : "▼"}</small>`
    : "";
  return `<div class="dtray-num"${attrs}><button type="button" class="dtray-num-roll" data-dtray-roll data-kind="${spec.kind}" data-ability="${spec.ability ?? ""}" data-skill="${spec.skill ?? ""}" data-actor="${esc(ctx, spec.actorId)}" aria-label="${esc(ctx, `${ctx.t("Tira", "Roll")} ${name} ${domain.signed(value)}${why ? " · " + why : ""}`)}"><span>${esc(ctx, label)}</span><strong>${domain.signed(value)}</strong>${mark}</button><button type="button" class="dtray-num-more" data-dtray-more aria-haspopup="menu" aria-expanded="false" aria-label="${esc(ctx, `${ctx.t("Opzioni di tiro", "Roll options")}: ${name}`)}">…</button></div>`;
}
function modifierOf(ctx, actorId, spec) {
  try {
    return domain.testModifier(ctx.state, actorId, spec).modifier;
  } catch {
    return null;
  }
}
const ABBREVIATIONS = {
  str: L("FOR", "STR"),
  dex: L("DES", "DEX"),
  con: L("COS", "CON"),
  int: L("INT", "INT"),
  wis: L("SAG", "WIS"),
  cha: L("CAR", "CHA"),
};
/**
 * Checks, saving throws and skills of one creature as rollable boxed numbers (D&D Beyond
 * sheet: abilities with their save beside them, then the skill list).
 */
function renderNumbers(ctx, actorId, { checks = true } = {}) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return "";
  const cell = (spec, label) => {
    const value = modifierOf(ctx, actorId, spec);
    return value === null
      ? `<span class="dtray-num is-missing muted">—</span>`
      : numberButton(ctx, { ...spec, actorId }, label, value);
  };
  const rows = domain.ABILITIES.map(
    (ability) =>
      `<div class="dtray-ability-row" role="row"><span class="dtray-abbr" role="rowheader" title="${esc(ctx, pick(domain.abilityName(ability), ctx.lang))}"><abbr title="${esc(ctx, pick(domain.abilityName(ability), ctx.lang))}">${esc(ctx, pick(ABBREVIATIONS[ability], ctx.lang))}</abbr></span>${checks ? `<span role="cell">${cell({ kind: "check", ability }, "")}</span>` : ""}<span role="cell">${cell({ kind: "save", ability }, "")}</span></div>`,
  ).join("");
  const skills = domain.SKILLS.map((skill) =>
    cell(
      { kind: "skill", skill: skill.id },
      `${pick(skill.name, ctx.lang)} (${pick(ABBREVIATIONS[skill.ability], ctx.lang)})`,
    ),
  ).join("");
  const abilitiesHTML = checks
    ? `<div class="dtray-abilities" role="table" aria-label="${checks ? ctx.t("Prove di caratteristica e tiri salvezza", "Ability checks and saving throws") : ctx.t("Tiri salvezza", "Saving throws")}"><div class="dtray-ability-row dtray-ability-head" role="row"><span role="columnheader"></span>${checks ? `<span role="columnheader">${ctx.t("Prova", "Check")}</span>` : ""}<span role="columnheader">${ctx.t("Tiro salvezza", "Saving throw")}</span></div>${rows}</div>`
    : `<h4 class="dtray-subhead">${ctx.t("Tiri salvezza", "Saving throws")}</h4><div class="dtray-numbers dtray-saves">${domain.ABILITIES.map((ability) => cell({ kind: "save", ability }, pick(ABBREVIATIONS[ability], ctx.lang))).join("")}</div>`;
  return `${abilitiesHTML}<h4 class="dtray-subhead">${ctx.t("Abilità", "Skills")}</h4><div class="dtray-numbers dtray-skills">${skills}</div><p class="muted dtray-hint">${ctx.t("Clic: tira subito. Clic destro, pressione lunga o «…»: vantaggio, svantaggio e chi vede. Maiusc+clic vantaggio, Ctrl/⌘+clic svantaggio.", "Click: roll now. Right click, long press or “…”: advantage, disadvantage and who sees it. Shift+click advantage, Ctrl/⌘+click disadvantage.")}</p>`;
}
// SV-37: a disabled option points to the sentence that says why (`why`: its element id).
function segmented(ctx, name, current, options, extra = "", why = null) {
  return `<div class="dtray-segmented" role="radiogroup" aria-label="${esc(ctx, extra)}">${options
    .map(
      ([value, label, disabled]) =>
        `<label class="dtray-seg"><input type="radio" name="dtray-${name}" value="${value}" data-dtray-${name} ${value === current ? "checked" : ""}${disabled ? ` disabled${why ? ` aria-describedby="${why}"` : ""}` : ""}><span>${esc(ctx, label)}</span></label>`,
    )
    .join("")}</div>`;
}
function inspirationControl(ctx, actorId, where, label = null) {
  const actor = ctx.state.actors[actorId];
  if (!actor || actor.kind !== "character") return "";
  const on = domain.hasInspiration(sliceOf(ctx), actorId);
  const canChange =
    ctx.role === "dm" || (canControlActor(actor, ctx.role, ctx.state) && actor.owner === ctx.role);
  const whyId = `dtray-inspiration-why-${esc(ctx, where)}`;
  return `<label class="dtray-switch${on ? " is-on" : ""}" data-dtray-inspiration-wrap="${where}"><input type="checkbox" role="switch" data-dtray-inspiration="${esc(ctx, actorId)}" ${on ? "checked" : ""}${canChange ? "" : ` disabled aria-describedby="${whyId}"`}${label ? ` aria-label="${esc(ctx, `${ctx.t("Ispirazione eroica", "Heroic Inspiration")}: ${label}`)}"` : ""}><span class="dtray-switch-track" aria-hidden="true"></span><span>${label ? esc(ctx, label) : ctx.t("Ispirazione eroica", "Heroic Inspiration")}</span></label>${canChange ? "" : `<small class="muted dtray-hint" id="${whyId}">${ctx.t("La cambia chi gioca il personaggio o il DM.", "Whoever plays the character or the DM changes it.")}</small>`}`;
}
function stackHTML(ctx) {
  const slice = sliceOf(ctx);
  const stack = domain.stackOf(slice, ctx.role);
  const presets = domain.visiblePresets(slice, ctx.role);
  const total = domain.stackTotal(stack);
  return `<section class="dtray-stack" aria-labelledby="dtray-stack-title"><h4 class="dtray-subhead" id="dtray-stack-title">${ctx.t("Pila dei modificatori", "Modifier stack")} <span class="muted">${ctx.t("· al prossimo tiro", "· next roll")}</span></h4>
<ul class="dtray-chips" aria-label="${ctx.t("Modificatori nella pila", "Modifiers in the stack")}">${
    stack
      .map(
        (m) =>
          `<li><button type="button" class="dtray-chip" data-dtray-unstack="${esc(ctx, m.id)}" aria-label="${esc(ctx, `${ctx.t("Togli", "Remove")} ${pick(m.label, ctx.lang)} ${domain.signed(m.value)}`)}">${esc(ctx, pick(m.label, ctx.lang))} ${domain.signed(m.value)} <span aria-hidden="true">×</span></button></li>`,
      )
      .join("") ||
    `<li class="muted dtray-empty-chip">${ctx.t("Vuota: nessun modificatore extra.", "Empty: no extra modifier.")}</li>`
  }</ul>
${stack.length ? `<p class="dtray-stack-total"><strong>${domain.signed(total)}</strong> ${ctx.t("sul prossimo tiro, poi la pila si svuota.", "on the next roll, then the stack empties.")} <button type="button" class="button quiet" data-dtray-unstack-all>${ctx.t("Svuota pila", "Clear stack")}</button></p>` : ""}
<div class="dtray-presets" role="group" aria-label="${ctx.t("Modificatori preparati dal DM", "Modifiers prepared by the DM")}">${presets
    .map(
      (p) =>
        `<button type="button" class="button quiet dtray-preset" data-dtray-stack-preset="${esc(ctx, p.id)}" title="${esc(ctx, pick(p.note, ctx.lang))}">${ctx.icon("plus")} ${esc(ctx, pick(p.label, ctx.lang))} ${domain.signed(p.value)}${ctx.role === "dm" && p.visible === false ? ` <span class="badge">${ctx.t("nascosto", "hidden")}</span>` : ""}</button>`,
    )
    .join("")}</div>
<div class="dtray-inline"><label class="field dtray-small">${ctx.t("Altro modificatore", "Other modifier")}<input type="number" inputmode="numeric" min="-20" max="20" step="1" value="${esc(ctx, ui.modValue)}" data-dtray-mod-value placeholder="+1"></label><button type="button" class="button" data-dtray-stack-add>${ctx.t("Aggiungi alla pila", "Add to stack")}</button></div>
${ctx.role === "dm" ? presetsManager(ctx, slice) : ""}</section>`;
}
function presetsManager(ctx, slice) {
  const d = ui.presetDraft;
  return `<details class="dtray-details" data-dtray-presets-manager><summary>${ctx.t("Gestisci i modificatori preparati", "Manage prepared modifiers")}</summary>
<ul class="dtray-list">${slice.presets
    .map(
      (p) =>
        `<li class="dtray-row"><div><strong>${esc(ctx, pick(p.label, ctx.lang))} ${domain.signed(p.value)}</strong>${p.note && pick(p.note, ctx.lang) ? `<small class="muted">${esc(ctx, pick(p.note, ctx.lang))}</small>` : ""}${p.source?.kind === "srd" ? `<small class="muted">SRD 5.2.1 · EN ${p.source.en.pages.join(", ")} / IT ${p.source.it.pages.join(", ")}</small>` : ""}</div><div class="dtray-row-actions"><label class="check-field"><input type="checkbox" data-dtray-preset-visible="${esc(ctx, p.id)}" ${p.visible !== false ? "checked" : ""}> ${ctx.t("Visibile ai giocatori", "Visible to players")}</label><button type="button" class="button quiet" data-dtray-preset-remove="${esc(ctx, p.id)}">${ctx.t("Elimina", "Delete")}</button></div></li>`,
    )
    .join("")}</ul>
<div class="form-grid dtray-grid"><label class="field">${ctx.t("Nome", "Name")}<input maxlength="40" value="${esc(ctx, d.label)}" data-dtray-preset-field="label" placeholder="${ctx.t("Terreno sdrucciolevole", "Slippery ground")}"></label><label class="field">${ctx.t("Valore", "Value")}<input type="number" min="-20" max="20" step="1" value="${esc(ctx, d.value)}" data-dtray-preset-field="value" placeholder="-2"></label></div>
<label class="check-field"><input type="checkbox" data-dtray-preset-field="visible" ${d.visible ? "checked" : ""}> ${ctx.t("Visibile ai giocatori", "Visible to players")}</label>
<button type="button" class="button" data-dtray-preset-add>${ctx.t("Aggiungi modificatore", "Add modifier")}</button></details>`;
}
function physicalInputs(ctx) {
  let parsed = null;
  try {
    parsed = domain.applyRollMode(domain.parseFormula(ui.formula), ui.rollMode);
  } catch {
    return `<p class="muted">${ctx.t("Scrivi una formula valida per inserire le facce.", "Type a valid formula to enter the faces.")}</p>`;
  }
  const sides = [...domain.baseSides(parsed), ...ui.extra];
  return `<fieldset class="dtray-faces" data-dtray-faces><legend>${ctx.t("Facce dei dadi fisici", "Physical dice faces")}</legend>${sides
    .map(
      (s, i) =>
        `<label class="field dtray-face">${i < sides.length - ui.extra.length ? `${ctx.t("Dado", "Die")} ${i + 1}` : ctx.t("Esplosione", "Explosion")} · d${s}<input type="number" inputmode="numeric" min="1" max="${s}" value="${esc(ctx, ui.faces[i] ?? "")}" data-dtray-face="${i}"></label>`,
    )
    .join("")}</fieldset>`;
}
function resultCard(ctx) {
  const slice = sliceOf(ctx);
  // TV-95: a tray roll waiting for its connected die shows here until every face is known.
  const waiting = prompts.filter((p) => p.role === ctx.role && p.where === "tray").at(-1);
  if (waiting) return waitingHTML(ctx, waiting);
  const own = [...slice.rolls].reverse().find((r) => r.by === ctx.role);
  if (!own) return "";
  const view = domain.projectRoll(own, ctx.role, ctx.state);
  if (!view) return "";
  if (!view.readable)
    return `<div class="dtray-result" data-dtray-result data-readable="false" role="status"><strong>${esc(ctx, own.actorName ?? ctx.t("Tiro", "Roll"))}</strong><p>${esc(ctx, pick(view.announcement, ctx.lang))}</p></div>`;
  const style = diceStyle(ctx);
  const fresh = ui.fresh?.id === own.id && Date.now() - ui.fresh.at < 1600;
  const animate = style === "2d" && fresh && !motionReduced(ctx);
  const tone = own.success === true ? "success" : own.success === false ? "failure" : "";
  const inspired =
    own.actorId &&
    domain.hasInspiration(slice, own.actorId) &&
    !own.rerolls.length &&
    own.status !== "withdrawn";
  return `<div class="dtray-result" data-dtray-result data-readable="true" data-roll="${esc(ctx, own.id)}" ${tone ? `data-tone="${tone}"` : ""} role="status" aria-live="polite">
${style === "2d" ? dice2D(ctx, own, animate) : ""}
<div class="dtray-result-main"><span class="dtray-result-title">${esc(ctx, whoOf(ctx, own))} · ${esc(ctx, titleOf(ctx, own))}</span><strong class="dtray-total" data-dtray-total>${own.total}</strong>${own.dc !== null ? `<span class="dtray-verdict" data-dtray-verdict>${esc(ctx, dcText(ctx, own.dc, own.dcBy))} · ${own.success ? ctx.t("Successo", "Success") : ctx.t("Fallimento", "Failure")}</span>` : ""}</div>
<p class="dtray-breakdown" data-dtray-breakdown>${esc(ctx, domain.breakdown(view, ctx.lang))}</p>
<p class="muted dtray-meta">${esc(ctx, modeOf(ctx, own))} · ${esc(ctx, pick(domain.audienceName(own.audience, own.by), ctx.lang))}${modeWithReasons(ctx, own.rollMode, own.conditionReasons) ? ` · ${esc(ctx, modeWithReasons(ctx, own.rollMode, own.conditionReasons))}` : ""}${own.rerolls.length ? ` · ${ctx.t("Ispirazione eroica", "Heroic Inspiration")}: ${own.rerolls[0].from} → ${own.rerolls[0].to}` : ""}${own.forced ? ` · ${ctx.t("scheda personale: solo tu", "personal sheet: only you")}` : ""}</p>
${inspired ? `<button type="button" class="button ${own.success === false ? "primary" : ""} dtray-reroll" data-dtray-reroll="${esc(ctx, own.id)}">${ctx.icon("dice")} ${ctx.t("Ripeti un dado · Ispirazione eroica", "Reroll a die · Heroic Inspiration")}</button>` : ""}
</div>`;
}
/**
 * "svantaggio (Trattenuto)": the roll mode and the conditions that set it; when a chosen
 * Advantage meets a condition's Disadvantage they cancel out and the text says so (P2-12).
 */
function modeWithReasons(ctx, mode, reasons) {
  const adv = (reasons?.advantage ?? []).map((r) => pick(r.name, ctx.lang));
  const dis = (reasons?.disadvantage ?? []).map((r) => pick(r.name, ctx.lang));
  const base = mode !== "normal" ? rollModeName(ctx, mode) : "";
  if (!adv.length && !dis.length) return base;
  if (mode === "normal")
    return `${ctx.t("normale: vantaggio e svantaggio si annullano", "normal: advantage and disadvantage cancel out")} (${[...adv, ...dis].join(", ")})`;
  const own = mode === "advantage" ? adv : dis;
  return `${base} (${(own.length ? own : [...adv, ...dis]).join(", ")})`;
}
const rollModeName = (ctx, mode) =>
  ({
    advantage: ctx.t("vantaggio", "advantage"),
    disadvantage: ctx.t("svantaggio", "disadvantage"),
    critical: ctx.t("critico", "critical"),
  })[mode] ?? "";
function recentHTML(ctx) {
  const slice = sliceOf(ctx);
  const list = domain.recentRolls(slice, ctx.state, ctx.role);
  // Only characters a player plays (never a personal sheet or the DM's own): review P1-2.
  const actors = domain.revealTargets(ctx.state);
  return `<section class="dtray-recent" aria-labelledby="dtray-recent-title"><h4 class="dtray-subhead" id="dtray-recent-title">${ctx.t("Ultimi tiri", "Last rolls")} <span class="muted">(${ctx.t("gli ultimi 10 che puoi vedere", "the last 10 you can see")})</span></h4>${
    list.length
      ? `<ol class="dtray-list">${list
          .map((view) => {
            if (!view.readable)
              return `<li class="dtray-row" data-dtray-recent="${esc(ctx, view.id)}" data-readable="false"><div><strong>${esc(ctx, pick(view.announcement, ctx.lang))}</strong><small class="muted">${esc(ctx, timeText(ctx, view.at))}</small></div></li>`;
            const record = slice.rolls.find((r) => r.id === view.id);
            const hidden = record.audience !== "public" && !record.reveal.all;
            const canReveal =
              hidden &&
              record.status !== "withdrawn" &&
              (ctx.role === "dm" || (record.by === ctx.role && record.audience !== "blind"));
            const badges = [
              pick(domain.audienceName(record.audience, record.by), ctx.lang),
              modeOf(ctx, record),
              modeWithReasons(ctx, record.rollMode, record.conditionReasons) || null,
              record.status === "withdrawn"
                ? `${ctx.t("Ritirato", "Withdrawn")}: ${record.withdrawal?.reason ?? ""}`
                : null,
              record.status === "corrected"
                ? `${ctx.t("Corretto", "Corrected")}: ${record.corrections.at(-1)?.reason ?? ""} (${ctx.t("prima", "before")} ${record.corrections.at(-1)?.values.join(", ")})`
                : null,
              record.status === "reused"
                ? ctx.t("Facce riusate dopo il ritiro", "Faces reused after withdrawal")
                : null,
              record.reveal.all ? ctx.t("Rivelato a tutti", "Revealed to everyone") : null,
              record.reveal.dm ? ctx.t("Rivelato al DM", "Revealed to the DM") : null,
              ...record.reveal.actorIds.map(
                (id) => `${ctx.t("Rivelato a", "Revealed to")} ${ctx.state.actors[id]?.name ?? ""}`,
              ),
              record.rerolls.length
                ? `${ctx.t("Ispirazione eroica", "Heroic Inspiration")}: ${record.rerolls[0].from} → ${record.rerolls[0].to}`
                : null,
            ].filter(Boolean);
            const own = record.by === ctx.role;
            return `<li class="dtray-row" data-dtray-recent="${esc(ctx, record.id)}" data-readable="true" data-status="${esc(ctx, record.status)}"><div><strong>${esc(ctx, whoOf(ctx, record))} · ${esc(ctx, titleOf(ctx, record))}: <span data-dtray-recent-total>${record.total}</span></strong><small>${esc(ctx, domain.breakdown(view, ctx.lang))}${record.dc !== null ? ` · ${esc(ctx, dcText(ctx, record.dc, record.dcBy))}: ${record.success ? ctx.t("successo", "success") : ctx.t("fallimento", "failure")}` : ""}</small><small class="muted">${esc(ctx, timeText(ctx, record.at))}</small><span class="dtray-badges">${badges.map((b) => `<span class="badge dtray-badge">${esc(ctx, b)}</span>`).join("")}</span></div><div class="dtray-row-actions">${own && record.status !== "withdrawn" ? `<button type="button" class="button quiet" data-dtray-again="${esc(ctx, record.id)}">${ctx.icon("dice")} ${ctx.t("Ripeti il tiro", "Roll again")}</button>` : ""}${canReveal ? revealControl(ctx, record, actors) : ""}${own && record.mode === "physical" && record.status !== "withdrawn" ? `<button type="button" class="button quiet" data-dtray-correct="${esc(ctx, record.id)}">${ctx.t("Correggi", "Correct")}</button>` : ""}${own && record.status !== "withdrawn" ? `<button type="button" class="button quiet" data-dtray-withdraw="${esc(ctx, record.id)}">${ctx.t("Ritira", "Withdraw")}</button>` : ""}</div></li>`;
          })
          .join("")}</ol>`
      : `<p class="empty-state dtray-empty">${ctx.t("Nessun tiro ancora.", "No rolls yet.")}</p>`
  }</section>`;
}
function revealOptions(ctx, record, actors) {
  return ctx.role === "dm"
    ? [
        ["all", ctx.t("A tutti", "To everyone")],
        ...actors
          .filter((a) => !record.reveal.actorIds.includes(a.id))
          .map((a) => [a.id, `${ctx.t("Solo a", "Only to")} ${a.name}`]),
      ]
    : [
        ["all", ctx.t("A tutti", "To everyone")],
        ...(record.audience === "self" && !record.reveal.dm
          ? [["dm", ctx.t("Al DM", "To the DM")]]
          : []),
      ];
}
function revealControl(ctx, record, actors) {
  const options = revealOptions(ctx, record, actors);
  return `<span class="dtray-reveal"><label class="visually-hidden" for="dtray-reveal-${esc(ctx, record.id)}">${ctx.t("Rivela a", "Reveal to")}</label><select id="dtray-reveal-${esc(ctx, record.id)}" data-dtray-reveal-target="${esc(ctx, record.id)}">${options.map(([value, label]) => `<option value="${esc(ctx, value)}">${esc(ctx, label)}</option>`).join("")}</select><button type="button" class="button quiet" data-dtray-reveal="${esc(ctx, record.id)}">${ctx.icon("eye")} ${ctx.t("Rivela", "Reveal")}</button></span>`;
}
function renderRollSection(ctx) {
  const slice = sliceOf(ctx);
  const actors = domain.trayActors(ctx.state, ctx.role);
  const audience = audienceNow(ctx);
  const devices = slice.devices?.[ctx.role] ?? [];
  let parsed = null;
  let formulaError = "";
  try {
    parsed = domain.parseFormula(ui.formula);
  } catch (error) {
    formulaError = localized(ctx, error);
  }
  const d20 = parsed ? domain.hasPlainD20(parsed) : false;
  const forced = ui.actorId ? dice3dReason(ctx, ui.actorId) : null;
  const rollText = parsed
    ? `${ctx.t("Tira", "Roll")} ${domain.prettyFormula(parsed.text)}`
    : ctx.t("Tira", "Roll");
  // Final review F7 (Owlbear Rodeo's dice tray: dice, visibility and the roll button
  // together): who, formula, dice, who sees and «Tira» come first; mode, physical or digital
  // dice, the syntax help, DC and the stack follow. Nothing moved behind a fold.
  return `<form class="dtray-form" data-dtray-form novalidate aria-label="${ctx.t("Vassoio dei dadi", "Dice tray")}">
<div class="dtray-who"><label class="field">${ctx.t("Chi tira", "Who rolls")}<select data-dtray-actor><option value="">${ctx.role === "dm" ? ctx.t("Il DM (nessuna creatura)", "The DM (no creature)") : ctx.t("Nessuna creatura (solo i dadi)", "No creature (dice only)")}</option>${actors.map((a) => `<option value="${esc(ctx, a.id)}" ${a.id === ui.actorId ? "selected" : ""}>${esc(ctx, a.name)}</option>`).join("")}</select></label>${ui.actorId ? inspirationControl(ctx, ui.actorId, "tray") : ""}</div>
<label class="field dtray-formula">${ctx.t("Formula", "Formula")}<input value="${esc(ctx, ui.formula)}" data-dtray-formula autocomplete="off" spellcheck="false" inputmode="text" maxlength="120" placeholder="2d6+1d4+3" aria-describedby="dtray-formula-help dtray-formula-error"${formulaError ? ' aria-invalid="true"' : ""}></label>
<p class="error dtray-formula-error" id="dtray-formula-error" role="alert" data-dtray-formula-error${formulaError ? "" : " hidden"}>${esc(ctx, formulaError)}</p>
<div class="dtray-dice" role="group" aria-label="${ctx.t("Aggiungi un dado alla formula", "Add a die to the formula")}">${domain.STANDARD_SIDES.map((s) => `<button type="button" class="dtray-die-button" data-dtray-add="${s}" aria-label="${ctx.t("Aggiungi un", "Add a")} d${s}">d${s}</button>`).join("")}<button type="button" class="dtray-die-button" data-dtray-bonus="-1" aria-label="${ctx.t("Modificatore −1", "Modifier −1")}">−1</button><button type="button" class="dtray-die-button" data-dtray-bonus="1" aria-label="${ctx.t("Modificatore +1", "Modifier +1")}">+1</button><button type="button" class="dtray-die-button dtray-clear" data-dtray-clear aria-label="${ctx.t("Svuota la formula", "Clear the formula")}">${ctx.icon("close")}</button></div>
${modeNow(ctx) === "physical" ? physicalInputs(ctx) : ""}
<fieldset class="dtray-fieldset"${forced ? ' aria-describedby="dtray-forced"' : ""}><legend>${ctx.t("Chi vede il risultato", "Who sees the result")}</legend>${segmented(
    ctx,
    "audience",
    forced ? "self" : audience,
    domain
      .audiencesFor(ctx.role)
      .map((a) => [a, pick(domain.audienceName(a, ctx.role), ctx.lang), forced && a !== "self"]),
    ctx.t("Chi vede il risultato", "Who sees the result"),
    "dtray-forced",
  )}${forced ? `<p class="muted dtray-hint" id="dtray-forced">${esc(ctx, pick(forced, ctx.lang))}</p>` : ""}</fieldset>
<p class="error dtray-error" role="alert" data-dtray-error${ui.error ? "" : " hidden"}>${esc(ctx, ui.error)}</p>
<div class="dtray-roll-row"><button type="submit" class="button primary dtray-roll" data-dtray-roll-button data-invalid="${!parsed}">${ctx.icon("dice")} <span data-dtray-roll-text>${esc(ctx, rollText)}</span></button><button type="button" class="button dtray-roll-more" data-dtray-more aria-haspopup="menu" aria-expanded="false" aria-label="${ctx.t("Opzioni di tiro: vantaggio, svantaggio, critico, chi vede", "Roll options: advantage, disadvantage, critical, who sees")}">…</button></div>
<fieldset class="dtray-fieldset"><legend>${ctx.t("Modalità", "Mode")}</legend>${segmented(
    ctx,
    "rollmode",
    ui.rollMode,
    [
      ["normal", ctx.t("Normale", "Normal")],
      ["advantage", ctx.t("Vantaggio", "Advantage"), !d20],
      ["disadvantage", ctx.t("Svantaggio", "Disadvantage"), !d20],
      ["critical", ctx.t("Critico", "Critical"), d20 || !parsed],
    ],
    ctx.t("Modalità", "Mode"),
    "dtray-mode-why",
  )}<p class="muted dtray-hint" id="dtray-mode-why">${ctx.t("Vantaggio e svantaggio valgono per un solo d20; Critico raddoppia i dadi dei danni, non il d20: cambia la formula per sceglierli.", "Advantage and disadvantage apply to a single d20; Critical doubles damage dice, not the d20: change the formula to choose them.")}</p></fieldset>
<fieldset class="dtray-fieldset"><legend>${ctx.t("Dadi", "Dice")}</legend>${segmented(
    ctx,
    "mode",
    modeNow(ctx) === "physical" ? "physical" : "digital",
    [
      ["digital", ctx.t("Digitali", "Digital")],
      ["physical", ctx.t("Fisici", "Physical")],
    ],
    ctx.t("Dadi", "Dice"),
  )}${connectedSummary(ctx, devices)}</fieldset>
<p class="muted dtray-hint" id="dtray-formula-help">${ctx.t("Es. 2d6+1d4+3 · 4d6kh3 tieni i 3 più alti · 2d6x esplode · 10d6cs>=5 conta i successi.", "E.g. 2d6+1d4+3 · 4d6kh3 keep the highest 3 · 2d6x explodes · 10d6cs>=5 counts successes.")}</p>
<details class="dtray-details"${ui.dc || ui.label ? " open" : ""}><summary>${ctx.t("CD e descrizione", "DC and description")}</summary><div class="form-grid dtray-grid"><label class="field">${ctx.t("CD (facoltativa)", "DC (optional)")}<input type="number" min="1" max="40" step="1" inputmode="numeric" value="${esc(ctx, ui.dc)}" data-dtray-dc></label><label class="field">${ctx.t("Descrizione (facoltativa)", "Description (optional)")}<input maxlength="60" value="${esc(ctx, ui.label)}" data-dtray-label placeholder="${ctx.t("Salto oltre il fossato", "Jump across the ditch")}"></label></div></details>
${stackHTML(ctx)}
</form>
${resultCard(ctx)}
${ui.actorId ? `<details class="dtray-details dtray-tests" data-dtray-tests open><summary>${ctx.t("Prove, tiri salvezza e abilità", "Checks, saving throws and skills")} · ${esc(ctx, ctx.state.actors[ui.actorId]?.name)}</summary>${renderNumbers(ctx, ui.actorId)}</details>` : ""}
${recentHTML(ctx)}`;
}
const dice3dReason = (ctx, actorId) => {
  try {
    return actorId
      ? domain.prepareRoll(
          sliceOf(ctx),
          ctx.state,
          { formula: "1d20", actorId, audience: "public" },
          ctx.role,
        ).forced
      : null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------- render: Richieste

function requestRow(ctx, group, row) {
  const slice = sliceOf(ctx);
  const actor = ctx.state.actors[row.actorId];
  const status =
    row.status === "pending"
      ? row.knownValues
        ? `${ctx.t("Annullato: facce note", "Undone: known faces")} ${row.knownValues.join(", ")}`
        : ctx.t("In attesa", "Pending")
      : row.status === "expired"
        ? row.autoFail
          ? `${ctx.t("Fallimento automatico", "Automatic failure")} (${domain.reasonNames(row.autoFail, ctx.lang)})`
          : ctx.t("Non più applicabile", "No longer applicable")
        : row.readable
          ? `${row.total}${row.success === true ? ` · ${ctx.t("Successo", "Success")}` : row.success === false ? ` · ${ctx.t("Fallimento", "Failure")}` : ""}`
          : ctx.t("Ha tirato · risultato riservato al DM", "Rolled · result kept for the DM");
  const tone = row.success === true ? "success" : row.success === false ? "failure" : row.status;
  const inspired =
    row.readable &&
    row.status === "resolved" &&
    row.plays &&
    actor?.kind === "character" &&
    !row.reroll &&
    !row.rerolled &&
    !group.closed &&
    domain.hasInspiration(slice, row.actorId);
  let actions = "";
  if (row.canRoll && !group.closed) {
    if (row.knownValues)
      actions = `<button type="button" class="button primary" data-dtray-reapply="${esc(ctx, row.requestId)}" data-attempt="${esc(ctx, row.attemptId)}">${ctx.t("Riapplica il risultato noto", "Reapply the known result")}</button><button type="button" class="button quiet" data-dtray-request-correct="${esc(ctx, row.requestId)}" data-attempt="${esc(ctx, row.attemptId)}">${ctx.t("Correggi…", "Correct…")}</button>`;
    else {
      const open = ui.physicalOpen[row.requestId];
      const count = row.dice.reduce((sum, g) => sum + g.count, 0);
      // TV-95: with a d20 paired, the connected die answers too (the Pixels module).
      const connected = domain.deviceFor(slice, ctx.role, 20)
        ? `<button type="button" class="button" data-dtray-answer-connected="${esc(ctx, row.requestId)}">${ctx.t("Dado connesso", "Connected die")}</button>`
        : "";
      actions = `<button type="button" class="button primary" data-dtray-answer="${esc(ctx, row.requestId)}" data-attempt="${esc(ctx, row.attemptId)}">${ctx.icon("dice")} ${ctx.t("Dadi digitali", "Digital dice")}</button><button type="button" class="button" data-dtray-answer-physical="${esc(ctx, row.requestId)}" aria-expanded="${!!open}">${ctx.t("Dadi fisici", "Physical dice")}</button>${connected}${
        open
          ? `<span class="dtray-inline" data-dtray-physical-row="${esc(ctx, row.requestId)}">${Array.from({ length: count }, (_, i) => `<label class="field dtray-small">${ctx.t("d20", "d20")}${count > 1 ? " " + (i + 1) : ""}<input type="number" inputmode="numeric" min="1" max="20" value="${esc(ctx, ui.requestFaces[row.requestId]?.[i] ?? "")}" data-dtray-request-face="${esc(ctx, row.requestId)}" data-index="${i}"></label>`).join("")}<button type="button" class="button primary" data-dtray-answer-record="${esc(ctx, row.requestId)}" data-attempt="${esc(ctx, row.attemptId)}">${ctx.t("Registra", "Record")}</button></span>`
          : ""
      }`;
    }
  }
  if (inspired)
    actions += `<button type="button" class="button ${row.success === false ? "primary" : ""}" data-dtray-request-reroll="${esc(ctx, row.requestId)}" data-attempt="${esc(ctx, row.attemptId)}">${ctx.icon("dice")} ${ctx.t("Ripeti un dado · Ispirazione eroica", "Reroll a die · Heroic Inspiration")}</button>`;
  const detail =
    row.readable && row.status === "resolved"
      ? `<small>${esc(ctx, (row.rollMode === "advantage" ? "max" : row.rollMode === "disadvantage" ? "min" : "") + "[" + (row.reroll ? row.reroll.values : row.values).join(", ") + "]")} ${domain.signed(row.modifier)}${row.modifierSources.length ? ` (${esc(ctx, row.modifierSources.map((m) => `${pick(m.label, ctx.lang)} ${domain.signed(m.value)}`).join(", "))})` : ""} · ${esc(ctx, modeOf(ctx, { mode: row.mode, devices: row.devices }))}${row.reroll ? ` · ${ctx.t("Ispirazione eroica", "Heroic Inspiration")}: ${row.reroll.from} → ${row.reroll.to}` : ""}${row.correctionReason ? ` · ${ctx.t("Correzione", "Correction")}: ${esc(ctx, row.correctionReason)}` : ""}${row.conditionReasons ? ` · ${esc(ctx, modeWithReasons(ctx, row.rollMode, row.conditionReasons))}` : ""}</small>`
      : row.readable && row.status === "pending" && row.modifier !== null
        ? `<small class="muted">d20${modeWithReasons(ctx, row.rollMode, row.conditionReasons) ? ` (${esc(ctx, modeWithReasons(ctx, row.rollMode, row.conditionReasons))})` : ""} ${domain.signed(row.modifier)}</small>`
        : "";
  return `<li class="dtray-request-row" data-dtray-request-row="${esc(ctx, row.requestId)}" data-actor="${esc(ctx, row.actorId)}" data-status="${esc(ctx, row.status)}" data-tone="${esc(ctx, tone)}"><div><strong>${esc(ctx, typeof row.name === "string" ? row.name : pick(row.name, ctx.lang))}</strong>${group.kind === "contest" && row.test ? ` <span class="muted">${esc(ctx, pick(domain.testTitle(row.test), ctx.lang))}</span>` : ""}<span class="dtray-request-status" data-dtray-request-status>${esc(ctx, status)}</span>${detail}</div>${actions ? `<div class="dtray-row-actions">${actions}</div>` : ""}</li>`;
}
function groupTitle(ctx, group) {
  if (group.kind !== "contest") return pick(group.title, ctx.lang);
  const [a, b] = ["a", "b"].map((side) => group.rows.find((r) => r.side === side));
  const name = (row) => (typeof row?.name === "string" ? row.name : pick(row?.name, ctx.lang));
  return `${ctx.t("Contrapposto", "Opposed")}: ${name(a)} ${ctx.t("contro", "vs")} ${name(b)}`;
}
function requestCard(ctx, group) {
  const s = group.summary;
  const verdict = group.verdict;
  const verdictText =
    group.kind !== "contest"
      ? ""
      : verdict.state === "higher"
        ? `${ctx.t("Totale più alto", "Higher total")}: ${esc(ctx, typeof verdict.name === "string" ? verdict.name : pick(verdict.name, ctx.lang))} ${verdict.winnerTotal} ${ctx.t("contro", "vs")} ${verdict.loserTotal}`
        : verdict.state === "tie"
          ? `${ctx.t("Pareggio", "Tie")} (${verdict.total}): ${ctx.t("decide il DM", "the DM decides")}`
          : verdict.state === "hidden"
            ? ctx.t("Un risultato è riservato al DM.", "One result is kept for the DM.")
            : ctx.t("In attesa di entrambi i tiri.", "Waiting for both rolls.");
  return `<article class="dtray-card${group.closed ? " is-closed" : ""}" data-dtray-group="${esc(ctx, group.groupId)}" aria-labelledby="dtray-group-${esc(ctx, group.groupId)}">
<header><h4 id="dtray-group-${esc(ctx, group.groupId)}">${esc(ctx, groupTitle(ctx, group))}</h4><span class="badge">${group.origin?.kind === "journal" ? ctx.t("Dal diario", "From the journal") : ctx.t("Richiesta del DM", "DM request")}</span>${group.rollMode !== "normal" ? `<span class="badge">${esc(ctx, rollModeName(ctx, group.rollMode))}</span>` : ""}${group.closed ? `<span class="badge">${ctx.t("Conclusa", "Closed")}</span>` : ""}</header>
<ul class="dtray-request-rows">${group.rows.map((row) => requestRow(ctx, group, row)).join("")}</ul>
${group.kind === "contest" ? `<p class="dtray-summary" data-dtray-verdict>${verdictText}</p><p class="muted dtray-hint">${ctx.t("Confronto dell'app: l'SRD 5.2.1 non ha una regola generale per le prove contrapposte.", "App comparison: SRD 5.2.1 has no general rule for opposed checks.")}</p>` : `<p class="dtray-summary" data-dtray-summary>${ctx.t("Successi", "Successes")} ${s.success} · ${ctx.t("Fallimenti", "Failures")} ${s.failure} · ${ctx.t("In attesa", "Pending")} ${s.pending}${s.hidden ? ` · ${ctx.t("Riservati", "Kept private")} ${s.hidden}` : ""}</p>`}
<p class="muted dtray-hint">${ctx.t("Nessuna conseguenza automatica: il DM decide cosa succede.", "No automatic consequence: the DM decides what happens.")}</p>
${runs(ctx) ? `<div class="toolbar">${group.closed ? `<button type="button" class="button quiet" data-dtray-request-reopen="${esc(ctx, group.groupId)}">${ctx.t("Riapri", "Reopen")}</button>` : `<button type="button" class="button quiet" data-dtray-request-close="${esc(ctx, group.groupId)}">${ctx.t("Concludi la richiesta", "Close the request")}</button>`}</div>` : ""}
</article>`;
}
function testSelect(ctx, value, data, withSave = true) {
  return `<select ${data}>${withSave ? `<option value="save" ${value === "save" ? "selected" : ""}>${ctx.t("Tiro salvezza", "Saving throw")}</option>` : ""}<option value="check" ${value === "check" ? "selected" : ""}>${ctx.t("Prova di caratteristica", "Ability check")}</option><option value="skill" ${value === "skill" ? "selected" : ""}>${ctx.t("Prova di abilità", "Skill check")}</option></select>`;
}
const abilityOptions = (ctx, value) =>
  domain.ABILITIES.map(
    (a) =>
      `<option value="${a}" ${a === value ? "selected" : ""}>${esc(ctx, pick(domain.abilityName(a), ctx.lang))}</option>`,
  ).join("");
const skillOptions = (ctx, value) =>
  domain.SKILLS.map(
    (s) =>
      `<option value="${s.id}" ${s.id === value ? "selected" : ""}>${esc(ctx, pick(s.name, ctx.lang))}</option>`,
  ).join("");
/**
 * «Chi vede il risultato» of a DM request (close review 01/10, P1; Monk's TokenBar request
 * roll modes): everyone, or only the DM, the player rolling without reading the value.
 */
function requestAudienceField(ctx, current, attrs = "data-dtray-rq-audience") {
  const option = (value, label) =>
    `<label class="dtray-seg"><input type="radio" ${attrs.startsWith("name=") ? attrs : `name="dtray-rq-audience" ${attrs}`} value="${value}" ${value === current ? "checked" : ""}><span>${esc(ctx, label)}</span></label>`;
  return `<fieldset class="dtray-fieldset"><legend>${ctx.t("Chi vede il risultato", "Who sees the result")}</legend><div class="dtray-segmented" role="radiogroup" aria-label="${ctx.t("Chi vede il risultato", "Who sees the result")}">${option("public", ctx.t("Tutti", "Everyone"))}${option("blind", ctx.t("Solo DM (tiro segreto)", "DM only (secret roll)"))}</div><p class="muted dtray-hint">${ctx.t("Con «Solo DM» il giocatore tira ma non vede il risultato, come un tiro cieco di Foundry.", "With «DM only» the player rolls without seeing the result, like Foundry’s blind roll.")}</p></fieldset>`;
}
function requestForm(ctx) {
  const d = ui.requestDraft;
  const actors = requests.requestableActors(ctx.state);
  if (d.actorIds === null)
    d.actorIds = actors.filter((a) => a.kind === "character").map((a) => a.id);
  const contest = d.kind === "contest";
  const testFields = (prefix, entry, withSave) =>
    `<label class="field">${ctx.t("Tiro", "Roll")}${testSelect(ctx, entry.kind, `data-dtray-rq="${prefix}kind"`, withSave)}</label>${
      entry.kind === "skill"
        ? `<label class="field">${ctx.t("Abilità", "Skill")}<select data-dtray-rq="${prefix}skill">${skillOptions(ctx, entry.skill)}</select></label>`
        : `<label class="field">${ctx.t("Caratteristica", "Ability")}<select data-dtray-rq="${prefix}ability">${abilityOptions(ctx, entry.ability)}</select></label>`
    }`;
  return `<form class="dtray-request-form" data-dtray-request-form novalidate aria-labelledby="dtray-request-title"><h4 class="dtray-subhead" id="dtray-request-title">${ctx.t("Chiedi un tiro", "Request a roll")}</h4>
<div class="dtray-segmented dtray-request-kind" role="radiogroup" aria-label="${ctx.t("Tipo di richiesta", "Request kind")}"><label class="dtray-seg"><input type="radio" name="dtray-rq-mode" value="group" ${contest ? "" : "checked"} data-dtray-rq-mode><span>${ctx.t("Al gruppo", "To the group")}</span></label><label class="dtray-seg"><input type="radio" name="dtray-rq-mode" value="contest" ${contest ? "checked" : ""} data-dtray-rq-mode><span>${ctx.t("Contrapposto", "Opposed")}</span></label></div>
${
  contest
    ? d.contest
        .map(
          (side, i) =>
            `<fieldset class="dtray-fieldset"><legend>${i ? ctx.t("Seconda creatura", "Second creature") : ctx.t("Prima creatura", "First creature")}</legend><div class="form-grid dtray-grid"><label class="field">${ctx.t("Creatura", "Creature")}<select data-dtray-rq="c${i}-actorId"><option value="">—</option>${actors.map((a) => `<option value="${esc(ctx, a.id)}" ${a.id === side.actorId ? "selected" : ""}>${esc(ctx, a.name)}</option>`).join("")}</select></label>${testFields(`c${i}-`, side, false)}</div></fieldset>`,
        )
        .join("")
    : `<div class="form-grid dtray-grid">${testFields("", d, true)}<label class="field">${ctx.t("CD (facoltativa)", "DC (optional)")}<input type="number" min="1" max="40" step="1" inputmode="numeric" value="${esc(ctx, d.dc)}" data-dtray-rq="dc"></label><label class="field">${ctx.t("Modalità", "Mode")}<select data-dtray-rq="rollMode"><option value="normal" ${d.rollMode === "normal" ? "selected" : ""}>${ctx.t("Normale", "Normal")}</option><option value="advantage" ${d.rollMode === "advantage" ? "selected" : ""}>${ctx.t("Vantaggio", "Advantage")}</option><option value="disadvantage" ${d.rollMode === "disadvantage" ? "selected" : ""}>${ctx.t("Svantaggio", "Disadvantage")}</option></select></label></div>
<fieldset class="dtray-fieldset dtray-targets"><legend>${ctx.t("A chi", "To whom")}</legend>${actors.map((a) => `<label class="check-field"><input type="checkbox" value="${esc(ctx, a.id)}" data-dtray-rq-target ${d.actorIds.includes(a.id) ? "checked" : ""}> ${esc(ctx, a.name)}${a.kind === "npc" ? ` <span class="muted">(${ctx.t("creatura del DM", "DM creature")})</span>` : a.owner === "dm" ? ` <span class="muted">(${ctx.t("la tiri tu", "you roll it")})</span>` : ""}</label>`).join("")}</fieldset>`
}
${requestAudienceField(ctx, d.audience ?? "public")}
<p class="error" role="alert" data-dtray-request-error${ui.requestError ? "" : " hidden"}>${esc(ctx, ui.requestError)}</p>
<button type="submit" class="button primary" data-dtray-request-send>${ctx.icon("bell")} ${ctx.t("Invia la richiesta", "Send the request")}</button></form>`;
}
function partyInspiration(ctx) {
  const characters = Object.values(ctx.state.actors).filter(
    (a) =>
      a.kind === "character" && a.visibility !== "private" && canViewActor(a, ctx.role, ctx.state),
  );
  return `<section class="dtray-party" aria-labelledby="dtray-party-title"><h4 class="dtray-subhead" id="dtray-party-title">${ctx.t("Ispirazione eroica nel gruppo", "Heroic Inspiration in the party")}</h4><div class="dtray-party-list">${characters.map((a) => inspirationControl(ctx, a.id, `party-${a.id}`, a.name)).join("")}</div></section>`;
}
function renderRequestsSection(ctx) {
  const groups = requests.requestGroups(ctx.state, sliceOf(ctx), ctx.role);
  const open = groups.filter((g) => !g.closed);
  const closed = groups.filter((g) => g.closed);
  return `${ctx.role === "dm" ? requestForm(ctx) + partyInspiration(ctx) : runs(ctx) ? requestForm(ctx) : `<p class="muted dtray-hint">${ctx.t("Qui arrivano i tiri che il DM ti chiede: rispondi con dadi fisici o digitali. Li trovi anche nella campanella.", "Rolls the DM asks you for arrive here: answer with physical or digital dice. They are in the bell too.")}</p>`}
<section class="dtray-requests" aria-labelledby="dtray-requests-title"><h4 class="dtray-subhead" id="dtray-requests-title">${ctx.t("Richieste aperte", "Open requests")}</h4>${open.length ? open.map((g) => requestCard(ctx, g)).join("") : `<p class="empty-state dtray-empty">${ctx.t("Nessuna richiesta aperta.", "No open requests.")}</p>`}</section>
${closed.length ? `<details class="dtray-details"><summary>${ctx.t("Richieste concluse", "Closed requests")} (${closed.length})</summary>${closed.map((g) => requestCard(ctx, g)).join("")}</details>` : ""}`;
}
export function pendingForRole(ctx) {
  return requests
    .requestGroups(ctx.state, sliceOf(ctx), ctx.role)
    .filter((g) => !g.closed)
    .reduce((sum, g) => sum + g.rows.filter((r) => r.canRoll).length, 0);
}

// ---------------------------------------------------------------- render: Impostazioni (TV-90)

function choiceField(ctx, key, current, options, label) {
  return `<label class="field">${esc(ctx, label)}<select data-dtray-setting="${key}">${options.map(([value, text]) => `<option value="${value}" ${value === current ? "selected" : ""}>${esc(ctx, text)}</option>`).join("")}</select></label>`;
}
// ---------------------------------------------------------------- connected dice panel (TV-95)

const DIE_METHOD_NAMES = {
  digital: L("Digitale", "Digital"),
  physical: L("Fisico, scrivo la faccia", "Physical, I type the face"),
  connected: L("Dado connesso", "Connected die"),
};
/** Under «Dadi»: which die types a connected die answers, or how to pair one. */
function connectedSummary(ctx, devices) {
  const slice = sliceOf(ctx);
  const lines = domain.STANDARD_SIDES.filter(
    (s) => domain.dieMethod(slice, ctx.role, s, "digital") === "connected",
  ).map((s) => {
    const device = domain.deviceFor(slice, ctx.role, s);
    return `<li data-dtray-connected-type="${s}"><strong>d${s}</strong> · ${esc(ctx, deviceName(ctx, device))} · ${esc(ctx, pick(domain.DEVICE_STATE_NAMES[device.state], ctx.lang))}${batteryHTML(ctx, device)}</li>`;
  });
  const open = `<button type="button" class="button quiet dtray-open-devices" data-dtray-open-devices>${ctx.icon("settings")} ${devices.length ? ctx.t("Dadi connessi…", "Connected dice…") : ctx.t("Collega dadi smart (Pixels)…", "Pair smart dice (Pixels)…")}</button>`;
  if (!lines.length) return `<p class="dtray-connected-line muted">${open}</p>`;
  return `<div class="dtray-connected-line" data-dtray-connected-summary><p class="muted dtray-hint">${ctx.t("Questi dadi aspettano il dado connesso:", "These dice wait for the connected die:")}</p><ul class="dtray-connected-types">${lines.join("")}</ul>${open}</div>`;
}
/**
 * «Dadi connessi» (Pixels pattern, simulated): scan, pair, state, battery, blink, disconnect,
 * a throw stand-in, and Foundry's per-type dice configuration.
 */
function devicesPanel(ctx, devices) {
  const slice = sliceOf(ctx);
  const nearby = ui.scan ? domain.nearbyDice(slice, ctx.role) : [];
  const blinkOn = (id) => ui.blink?.id === id && Date.now() < ui.blink.until;
  const scanList = ui.scan
    ? nearby.length
      ? `<ul class="dtray-list dtray-nearby" data-dtray-nearby aria-label="${ctx.t("Dadi trovati vicino a te", "Dice found near you")}">${nearby
          .map(
            (d) =>
              `<li class="dtray-row" data-dtray-nearby-die="${esc(ctx, d.pixelId)}"><div><strong>${esc(ctx, pick(d.name, ctx.lang))}</strong><small class="muted">d${d.sides} · ${ctx.t("segnale", "signal")} ${esc(ctx, pick(domain.SIGNALS[d.signal], ctx.lang))} · ${ctx.t("batteria", "battery")} ${d.battery}%${d.charging ? ` · ${ctx.t("in carica", "charging")}` : ""}</small>${d.battery < domain.LOW_BATTERY ? `<small class="dtray-battery is-low">${ctx.t("Batteria scarica: ricaricalo presto.", "Low battery: charge it soon.")}</small>` : ""}</div><div class="dtray-row-actions"><button type="button" class="button" data-dtray-connect="${esc(ctx, d.pixelId)}">${ctx.t("Collega", "Connect")}</button></div></li>`,
          )
          .join("")}</ul>`
      : `<p class="muted" data-dtray-nearby-empty>${ctx.t("Nessun altro dado vicino: sono già tutti collegati.", "No other die nearby: they are all paired already.")}</p>`
    : "";
  const paired = devices
    .map((d) => {
      const block = deviceBlock(ctx, d);
      const whyId = `dtray-device-why-${esc(ctx, d.id)}`;
      const off = block ? ` disabled aria-describedby="${whyId}"` : "";
      const low = domain.batteryLow(d);
      const stateButton =
        d.state === "connected"
          ? `<button type="button" class="button quiet" data-dtray-device-state="${esc(ctx, d.id)}" data-state="disconnected">${ctx.t("Scollega", "Disconnect")}</button>`
          : d.state === "charging"
            ? `<button type="button" class="button quiet" data-dtray-device-state="${esc(ctx, d.id)}" data-state="connected">${ctx.t("Togli dal caricatore", "Take off the charger")}</button>`
            : `<button type="button" class="button" data-dtray-device-state="${esc(ctx, d.id)}" data-state="connected">${ctx.t("Ricollega", "Reconnect")}</button>`;
      return `<li class="dtray-row dtray-device${blinkOn(d.id) ? " is-blinking" : ""}" data-dtray-device="${esc(ctx, d.id)}" data-state="${esc(ctx, d.state)}"><div class="dtray-device-main"><span class="dtray-device-light" aria-hidden="true"></span><div><span class="dtray-device-title"><strong>${esc(ctx, deviceName(ctx, d))}</strong> <span class="badge dtray-device-state is-${esc(ctx, d.state)}" data-dtray-device-status>${esc(ctx, pick(domain.DEVICE_STATE_NAMES[d.state], ctx.lang))}</span></span><small class="muted">d${d.sides} · ${ctx.t("segnale", "signal")} ${esc(ctx, pick(domain.SIGNALS[d.signal], ctx.lang))}</small><small class="dtray-battery${low ? " is-low" : ""}" data-dtray-battery="${esc(ctx, d.id)}">${ctx.t("Batteria", "Battery")} ${d.battery}%${low ? ` · ${ctx.t("scarica: ricaricalo presto (sotto il 20 %).", "low: charge it soon (under 20%).")}` : ""}</small>${blinkOn(d.id) ? `<small class="dtray-blink-note" role="status">${ctx.t("Lampeggia: cercalo sul tavolo.", "Blinking: look for it on the table.")}</small>` : ""}${block ? `<small class="dtray-warn" id="${whyId}">${esc(ctx, block)}</small>` : ""}</div></div><div class="dtray-row-actions"><button type="button" class="button primary" data-dtray-device-roll="${esc(ctx, d.id)}"${off}>${ctx.icon("dice")} ${ctx.t("Simula il lancio", "Simulate the throw")}</button><button type="button" class="button quiet" data-dtray-device-blink="${esc(ctx, d.id)}"${off}>${ctx.t("Fai lampeggiare", "Make it blink")}</button>${stateButton}<button type="button" class="button quiet" data-dtray-device-forget="${esc(ctx, d.id)}">${ctx.t("Dimentica", "Forget")}</button></div><details class="dtray-device-more"><summary>${ctx.t("Rinomina", "Rename")}</summary><div class="dtray-inline"><label class="field dtray-small">${ctx.t("Nome", "Name")}<input maxlength="30" value="${esc(ctx, deviceName(ctx, d))}" data-dtray-device-name="${esc(ctx, d.id)}"></label><button type="button" class="button quiet" data-dtray-device-rename="${esc(ctx, d.id)}">${ctx.t("Salva il nome", "Save the name")}</button></div></details></li>`;
    })
    .join("");
  const methods = domain.STANDARD_SIDES.map((s) => {
    const current = domain.dieMethodOf(slice, ctx.role, s);
    const hasDie = Boolean(domain.deviceFor(slice, ctx.role, s));
    const options = [
      [
        "default",
        `${ctx.t("Come «Dadi»", "As “Dice”")} (${modeNow(ctx) === "physical" ? ctx.t("fisici", "physical") : ctx.t("digitali", "digital")})`,
      ],
      ["digital", pick(DIE_METHOD_NAMES.digital, ctx.lang)],
      ["physical", pick(DIE_METHOD_NAMES.physical, ctx.lang)],
      ...(hasDie ? [["connected", pick(DIE_METHOD_NAMES.connected, ctx.lang)]] : []),
    ];
    return `<label class="field dtray-method"><span>d${s}</span><select data-dtray-method="${s}">${options.map(([value, text]) => `<option value="${value}"${value === current ? " selected" : ""}>${esc(ctx, text)}</option>`).join("")}</select></label>`;
  }).join("");
  return `<section class="dtray-devices" data-dtray-devices aria-labelledby="dtray-devices-title"><h4 class="dtray-subhead" id="dtray-devices-title" tabindex="-1">${ctx.t("Dadi connessi", "Connected dice")} <span class="badge">${ctx.t("simulazione", "simulation")}</span></h4><p class="muted dtray-hint" data-dtray-sim-note>${ctx.t("Come i dadi Pixels (il modulo Pixels di Foundry, le integrazioni di Roll20 e D&D Beyond): lanci il dado vero e il risultato arriva da solo. Qui non c'è Bluetooth: dadi, batteria e lancio sono simulati.", "Like Pixels dice (Foundry's Pixels module, the Roll20 and D&D Beyond integrations): you throw the real die and the result arrives by itself. There is no Bluetooth here: dice, battery and throw are simulated.")}</p><div class="toolbar"><button type="button" class="button${devices.length ? "" : " primary"}" data-dtray-scan aria-expanded="${ui.scan}">${ctx.icon("search")} ${ctx.t("Cerca dadi vicini", "Find nearby dice")}</button></div>${scanList}${devices.length ? `<h5 class="dtray-subhead">${ctx.t("I tuoi dadi", "Your dice")}</h5><ul class="dtray-list dtray-paired" data-dtray-paired>${paired}</ul>` : `<p class="empty-state dtray-empty">${ctx.t("Nessun dado collegato.", "No die paired.")}</p>`}<fieldset class="dtray-fieldset dtray-methods" data-dtray-methods><legend>${ctx.t("Come tiri ogni dado", "How you roll each die")}</legend><p class="muted dtray-hint">${ctx.t("Per ogni tipo di dado: digitale, fisico (scrivi la faccia) o il dado connesso, come la configurazione dei dadi di Foundry. «Dado connesso» compare dopo aver collegato un dado di quel tipo.", "For each die type: digital, physical (you type the face) or the connected die, as Foundry's dice configuration. “Connected die” appears once a die of that type is paired.")}</p><div class="dtray-method-grid">${methods}</div></fieldset></section>`;
}
function renderLookSection(ctx, tableView) {
  const slice = sliceOf(ctx);
  const style = diceStyle(ctx);
  const devices = slice.devices?.[ctx.role] ?? [];
  const b56 = b56Loaded();
  return `${devicesPanel(ctx, devices)}<section class="dtray-look" aria-labelledby="dtray-style-title"><h4 class="dtray-subhead" id="dtray-style-title">${ctx.t("Dadi animati", "Animated dice")}</h4>
<div class="dtray-segmented dtray-style" role="radiogroup" aria-label="${ctx.t("Dadi animati", "Animated dice")}">${[
    ...(b56 ? [["3d", ctx.t("3D condivisi", "Shared 3D")]] : []),
    ["2d", ctx.t("2D leggeri, solo per te", "Light 2D, only for you")],
    ["off", ctx.t("Nessuna animazione", "No animation")],
  ]
    .map(
      ([value, label]) =>
        `<label class="dtray-seg"><input type="radio" name="dtray-style" value="${value}" data-dtray-style ${value === style ? "checked" : ""}><span>${esc(ctx, label)}</span></label>`,
    )
    .join("")}</div>
<p class="muted dtray-hint" data-dtray-motion-note>${motionReduced(ctx) ? ctx.t("Movimento ridotto attivo: i dadi mostrano subito il risultato, senza rotolare.", "Reduced motion is on: dice show the result at once, without rolling.") : ctx.t("I dadi 3D li vede chi può vedere il tiro; i 2D solo chi tira. Con Movimento ridotto non rotolano.", "Whoever may see the roll sees the 3D dice; only the roller sees the 2D ones. With Reduced motion they do not roll.")}</p>
${
  ui.actorId
    ? `<h4 class="dtray-subhead">${ctx.t("Politica dei tiri di", "Roll policy of")} ${esc(ctx, ctx.state.actors[ui.actorId]?.name)}</h4><p class="dtray-sheet-policy"><span>${esc(ctx, policyText(ctx, domain.policyOf(sliceOf(ctx), ui.actorId)))}</span> <button type="button" class="button quiet" data-dtray-policy="${esc(ctx, ui.actorId)}" aria-haspopup="dialog">${ctx.icon("settings")} ${ctx.t("Cambia…", "Change…")}</button></p>`
    : ""
}<h4 class="dtray-subhead">${ctx.t("Le tue preferenze predefinite", "Your default preferences")}</h4>
<div class="form-grid dtray-grid">${choiceField(
    ctx,
    "advantage",
    setting(ctx, `${ID}.advantage`, "normal"),
    [
      ["normal", ctx.t("Tira subito, normale", "Roll at once, normally")],
      [
        "ask",
        ctx.t("Chiedi sempre vantaggio o svantaggio", "Always ask advantage or disadvantage"),
      ],
      ["advantage", ctx.t("Sempre con vantaggio", "Always with advantage")],
      ["disadvantage", ctx.t("Sempre con svantaggio", "Always with disadvantage")],
    ],
    ctx.t("Vantaggio sui numeri della scheda", "Advantage on sheet numbers"),
  )}${choiceField(
    ctx,
    "dice",
    savedDice(ctx),
    [
      ["digital", ctx.t("Digitali", "Digital")],
      ["physical", ctx.t("Fisici: chiedi le facce", "Physical: ask the faces")],
    ],
    ctx.t("Dadi per i tiri sul posto", "Dice for rolls in place"),
  )}${choiceField(
    ctx,
    "audience",
    defaultAudience(ctx),
    domain.audiencesFor(ctx.role).map((a) => [a, pick(domain.audienceName(a, ctx.role), ctx.lang)]),
    ctx.t("Chi vede i tuoi tiri di solito", "Who usually sees your rolls"),
  )}</div>
<label class="check-field"><input type="checkbox" data-dtray-setting-bool="spell-fx" ${setting(ctx, `${ID}.spell-fx`, true) ? "checked" : ""}> ${ctx.t("Effetti visivi degli incantesimi sulla mappa", "Spell visual effects on the map")}</label>
${ctx.role === "dm" ? `<h4 class="dtray-subhead">${ctx.t("Tiri nascosti (campagna)", "Hidden rolls (campaign)")}</h4><label class="check-field"><input type="checkbox" data-dtray-announce ${announcePolicy(ctx) ? "checked" : ""}> ${ctx.t("Annuncia ai giocatori i tiri nascosti, senza risultato", "Announce hidden rolls to players, without the result")}</label><label class="check-field"><input type="checkbox" data-dtray-karmic ${karmaOn(ctx) ? "checked" : ""}> ${ctx.t("Dadi karmici (come BG3), spenti di serie", "Karmic dice (like BG3), off by default")}</label><p class="muted dtray-hint">${ctx.t("Solo i d20 digitali dei giocatori: dopo due risultati da 1 a 5 di fila, il terzo da 1 a 5 si ritira e il registro lo scrive. I dadi fisici non cambiano mai.", "Only players’ digital d20s: after two results of 1 to 5 in a row, a third of 1 to 5 is rerolled and the log says so. Physical dice never change.")}</p>` : karmaOn(ctx) ? `<p class="muted dtray-hint" data-dtray-karmic-note>${ctx.t("In questa campagna i dadi karmici sono attivi: un terzo d20 digitale da 1 a 5 di fila si ritira, e il registro lo scrive.", "Karmic dice are on in this campaign: a third digital d20 of 1 to 5 in a row is rerolled, and the log says so.")}</p>` : ""}
</section>
${b56 ? `<section class="dtray-b56" aria-labelledby="dtray-b56-title"><h4 class="dtray-subhead" id="dtray-b56-title">${ctx.t("Prova i dadi 3D", "Try the 3D dice")}</h4>${safeRender(() => dice3d.renderDrawer(ctx, tableView))}</section>` : ""}`;
}
function safeRender(run) {
  try {
    return run();
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------- panel

export function renderTray(ctx, tableView) {
  syncRole(ctx, tableView?.selectedActorId);
  const pending = pendingForRole(ctx);
  const tabs = [
    ["roll", ctx.t("Tira", "Roll")],
    ["requests", ctx.t("Richieste", "Requests")],
    ["look", ctx.t("Impostazioni", "Settings")],
  ];
  const body =
    ui.section === "requests"
      ? renderRequestsSection(ctx)
      : ui.section === "look"
        ? renderLookSection(ctx, tableView)
        : renderRollSection(ctx);
  return `<div class="dtray" data-dtray data-section="${ui.section}"><div class="dtray-sections" role="tablist" aria-label="${ctx.t("Sezioni dei dadi", "Dice sections")}">${tabs
    .map(
      ([id, label]) =>
        `<button type="button" role="tab" class="dtray-section${ui.section === id ? " active" : ""}" data-dtray-section="${id}" aria-selected="${ui.section === id}" tabindex="${ui.section === id ? 0 : -1}" aria-controls="dtray-panel">${esc(ctx, label)}${id === "requests" && pending ? ` <span class="dtray-count" data-dtray-pending>${pending}</span><span class="visually-hidden"> ${ctx.t("da tirare", "to roll")}</span>` : ""}</button>`,
    )
    .join("")}</div><div class="dtray-panel" id="dtray-panel" role="tabpanel">${body}</div></div>`;
}

// ---------------------------------------------------------------- bind

function rerender(ctx, focus) {
  ui.focus = focus ?? null;
  ctx.render();
}
function applyFocus(root) {
  if (!ui.focus) return;
  const target = root.querySelector(ui.focus);
  ui.focus = null;
  target?.focus?.({ preventScroll: false });
  if (target?.select && target.matches?.("[data-dtray-formula]")) target.select();
}
function appendToFormula(term) {
  const current = ui.formula.trim();
  if (!current) {
    ui.formula = term.startsWith("+") ? term.slice(1) : term;
    return;
  }
  // Clicking the same die again raises its count (D&D Beyond / Owlbear tray).
  const die = /^1?d(\d+)$/.exec(term);
  if (die) {
    const pattern = new RegExp(`(^|[+-])(\\d*)d${die[1]}(?![0-9a-z])`);
    const match = pattern.exec(current);
    if (match) {
      const count = (Number(match[2]) || 1) + 1;
      ui.formula =
        current.slice(0, match.index) +
        match[1] +
        count +
        "d" +
        die[1] +
        current.slice(match.index + match[0].length);
      return;
    }
    ui.formula = `${current}+1d${die[1]}`;
    return;
  }
  // ±1 adjusts the trailing constant.
  const constant = /([+-])(\d+)$/.exec(current);
  const delta = Number(term);
  if (constant && !/d\d+$/.test(current)) {
    const value = (constant[1] === "-" ? -1 : 1) * Number(constant[2]) + delta;
    const head = current.slice(0, constant.index);
    ui.formula = value === 0 ? head : `${head}${value < 0 ? "-" : "+"}${Math.abs(value)}`;
  } else ui.formula = `${current}${delta < 0 ? "-" : "+"}${Math.abs(delta)}`;
}
function submitForm(ctx, root, overrides = {}) {
  ui.error = "";
  const raw = formRoll(ctx, overrides);
  // TV-95: a die type set to a connected die waits for it in the result card; faces typed
  // in the physical fields are kept for the dice rolled by hand.
  const plan = connectedPlan(ctx, raw);
  if (plan)
    return waitForRoll(ctx, raw, plan, {
      where: "tray",
      prefill: raw.mode === "physical" ? [...ui.faces] : [],
    });
  const faces = raw.mode === "physical" ? [...ui.faces] : undefined;
  try {
    rollFromTray(ctx, raw, { faces });
    ui.faces = [];
    ui.extra = [];
    ui.focus = "[data-dtray-roll-button]";
    ctx.render();
  } catch (error) {
    if (error.code === "explosion-faces") ui.extra = [...ui.extra, ...error.needs];
    ui.error = localized(ctx, error);
    rerender(
      ctx,
      error.code === "explosion-faces"
        ? `[data-dtray-face="${ui.faces.length}"]`
        : "[data-dtray-roll-button]",
    );
  }
}
function openReroll(ctx, { record, row }) {
  const values = record ? record.values : row.values;
  const sides = record
    ? record.groups.flatMap((g) => g.faces.map(() => g.sides))
    : values.map(() => 20);
  const name = record ? record.actorName : ctx.state.actors[row.actorId]?.name;
  ctx.dialog(
    ctx.t("Ripeti un dado · Ispirazione eroica", "Reroll a die · Heroic Inspiration"),
    `<p>${esc(ctx, name)} · ${ctx.t("spendi l'Ispirazione eroica per ripetere un dado subito dopo il tiro e usare il nuovo risultato (SRD 5.2.1, EN 8 / IT 8).", "spend Heroic Inspiration to reroll a die right after rolling and use the new result (SRD 5.2.1, EN 8 / IT 8).")}</p>${values.length > 1 ? `<p class="muted">${ctx.t("Con vantaggio o svantaggio ripeti un solo d20: scegli quale.", "With advantage or disadvantage you reroll only one d20: choose which.")}</p>` : ""}<fieldset class="dtray-fieldset"><legend>${ctx.t("Dado da ripetere", "Die to reroll")}</legend>${values.map((v, i) => `<label class="check-field"><input type="radio" name="index" value="${i}" ${i === 0 ? "checked" : ""}> d${sides[i]}: ${v}</label>`).join("")}</fieldset><label class="field">${ctx.t("Dadi", "Dice")}<select name="mode" data-dtray-reroll-mode><option value="digital">${ctx.t("Digitale", "Digital")}</option><option value="physical">${ctx.t("Fisico", "Physical")}</option></select></label><label class="field" data-dtray-reroll-face hidden>${ctx.t("Nuova faccia del dado fisico", "New physical die face")}<input type="number" name="face" min="1" max="${Math.max(...sides)}" inputmode="numeric"></label>`,
    {
      submitLabel: ctx.t("Ripeti il dado", "Reroll the die"),
      onSubmit: (data) => {
        const index = Number(data.get("index") ?? 0);
        const face = data.get("mode") === "physical" ? data.get("face") : null;
        if (data.get("mode") === "physical" && !String(face ?? "").trim())
          throw Error(ctx.t("Inserisci la nuova faccia.", "Enter the new face."));
        if (record) {
          let updated = null;
          const trial = domain.inspirationReroll(
            structuredClone(sliceOf(ctx)),
            ctx.state,
            record.id,
            index,
            ctx.role,
            {
              draw: die(ctx),
              face,
              now: now(),
            },
          );
          const next = trial.rerolls.at(-1).to;
          ctx.commit(
            `${record.actorName} · ${ctx.t("Ispirazione eroica spesa", "Heroic Inspiration spent")}: ${ctx.t("ripete", "rerolls")} ${trial.rerolls.at(-1).from} → ${next} · ${titleOf(ctx, record)} = ${trial.total}${trial.dc !== null ? ` · ${dcText(ctx, trial.dc, record.dcBy, "player")}: ${trial.success ? ctx.t("successo", "success") : ctx.t("fallimento", "failure")}` : ""}`,
            (draft) => {
              updated = domain.inspirationReroll(
                area.slice(draft),
                draft,
                record.id,
                index,
                ctx.role,
                {
                  draw: () => next,
                  face: face ?? null,
                  now: trial.rerolls.at(-1).at,
                },
              );
            },
            commitOptionsFor(record),
          );
          const event = domain.rollEvent(updated);
          area.emit("roll-accepted", {
            logId: ctx.state.log.at(-1)?.id ?? null,
            roll: {
              ...event,
              id: `${updated.id}:reroll`,
              kind: "reroll",
              dice: [{ count: 1, sides: sides[index] }],
              values: [next],
              kept: [true],
              mode: face ? "physical" : "digital",
              modifier: updated.total - next,
              label: L(
                `${pick(event.label, "it")} · Ispirazione eroica`,
                `${pick(event.label, "en")} · Heroic Inspiration`,
              ),
            },
          });
          ui.fresh = { id: updated.id, at: Date.now() };
        } else {
          const trial = requests.rerollRequest(
            structuredClone(sliceOf(ctx)),
            ctx.state,
            row.attemptId,
            row.requestId,
            index,
            ctx.role,
            {
              draw: die(ctx),
              face,
              now: now(),
            },
          );
          let reroll = null;
          // The reroll has the answer's audience: a DM creature's result stays private.
          const hidden = requests.requestIsPrivate(ctx.state, row.actorId);
          ctx.commit(
            `${trial.actorName} · ${ctx.t("Ispirazione eroica spesa", "Heroic Inspiration spent")}: ${ctx.t("ripete il d20", "rerolls the d20")} ${trial.from} → ${trial.to} = ${trial.total}${trial.dc !== null ? ` · ${dcText(ctx, trial.dc, "dm", "player")}: ${trial.success ? ctx.t("successo", "success") : ctx.t("fallimento", "failure")}` : ""}`,
            (draft) => {
              reroll = requests.rerollRequest(
                area.slice(draft),
                draft,
                row.attemptId,
                row.requestId,
                index,
                ctx.role,
                {
                  draw: () => trial.to,
                  face: face ?? null,
                  now: trial.at,
                },
              );
            },
            hidden ? { visibility: "private", undoable: false } : { undoable: false },
          );
          const request = ctx.state.combatAttempts.find((a) => a.id === row.attemptId)?.requests[0];
          area.emit("roll-accepted", {
            logId: ctx.state.log.at(-1)?.id ?? null,
            roll: {
              id: reroll.id,
              source: ID,
              kind: "reroll",
              actorId: reroll.actorId,
              actorName: reroll.actorName,
              controller: ctx.role,
              owner: ctx.role,
              visibility: hidden ? "private" : "shared",
              mode: reroll.mode,
              dice: [{ count: 1, sides: 20 }],
              values: [reroll.to],
              kept: [true],
              modifier: reroll.total - reroll.to,
              natural: reroll.to,
              total: reroll.total,
              dc: reroll.dc,
              success: reroll.success,
              label: L(
                `${pick(requests.requestTitle(ctx.state, ctx.state.combatAttempts.find((a) => a.id === row.attemptId)?.rollRequest, "player"), "it")} · Ispirazione eroica`,
                `${pick(requests.requestTitle(ctx.state, ctx.state.combatAttempts.find((a) => a.id === row.attemptId)?.rollRequest, "player"), "en")} · Heroic Inspiration`,
              ),
              rollMode: request?.rollMode ?? "normal",
            },
          });
        }
      },
    },
  );
  const form = globalThis.document?.querySelector("#dialog form");
  const select = form?.querySelector("[data-dtray-reroll-mode]");
  if (select)
    select.onchange = () =>
      (form.querySelector("[data-dtray-reroll-face]").hidden = select.value !== "physical");
}
function answerRequest(
  ctx,
  attemptId,
  requestId,
  { physical = false, known = false, faces: given = null, devices = null } = {},
) {
  const attempt = ctx.state.combatAttempts.find((a) => a.id === attemptId);
  const request = attempt?.requests.find((r) => r.id === requestId);
  if (!request) return;
  const actor = ctx.state.actors[request.actorId];
  let faces;
  if (known) faces = [...request.acceptedValues];
  else if (Array.isArray(given)) faces = [...given];
  else if (physical) {
    const typed = ui.requestFaces[requestId] ?? [];
    const count = request.dice.reduce((sum, g) => sum + g.count, 0);
    faces = Array.from({ length: count }, (_, i) =>
      String(typed[i] ?? "").trim() === "" ? NaN : Number(typed[i]),
    );
    if (faces.some((f) => !Number.isInteger(f) || f < 1 || f > 20))
      domain.fail(
        "Inserisci ogni faccia del d20: un numero da 1 a 20.",
        "Enter every d20 face: a number from 1 to 20.",
      );
  } else faces = requests.requestDigitalFaces(request, die(ctx));
  const stack = known ? [] : structuredClone(domain.stackOf(sliceOf(ctx), ctx.role));
  const trial = structuredClone(ctx.state);
  const answered = requests.answerRequest(trial, attemptId, requestId, faces, ctx.role, {
    mode: physical ? "physical" : "digital",
    stack,
    devices,
  });
  // The shared line names the DC as players may read it (C1: «CD nascosta»).
  const title = pick(
    requests.requestTitle(ctx.state, attempt.rollRequest, "player") ??
      attempt.rollRequest?.title ??
      attempt.actionName,
    ctx.lang,
  );
  const dc = Number.isInteger(answered.dc)
    ? ` · ${answered.total >= answered.dc ? ctx.t("successo", "success") : ctx.t("fallimento", "failure")}`
    : "";
  // A creature the DM plays answers privately, as its rolls are private in the log; a
  // blind request (close review 01/10) keeps its value out of the roller's line too.
  const blind = attempt.audience === "blind";
  const options =
    blind || requests.requestIsPrivate(ctx.state, request.actorId) ? { visibility: "private" } : {};
  ctx.commit(
    blind
      ? `${actor?.name} · ${title}: ${ctx.t("tiro segreto, risultato solo al DM", "secret roll, result for the DM only")} · ${modeOf(ctx, { mode: physical ? "physical" : "digital", devices })}`
      : `${actor?.name} · ${title}: [${answered.values.join(", ")}] ${domain.signed(answered.modifier)} = ${answered.total}${dc} · ${known ? ctx.t("risultato riapplicato", "result reapplied") : modeOf(ctx, { mode: physical ? "physical" : "digital", devices })}`,
    (draft) => {
      requests.answerRequest(draft, attemptId, requestId, faces, ctx.role, {
        mode: physical ? "physical" : "digital",
        stack,
        devices,
      });
      if (stack.length) domain.clearStack(area.slice(draft), ctx.role);
    },
    options,
  );
  delete ui.requestFaces[requestId];
  delete ui.physicalOpen[requestId];
}
/**
 * One DM request, sent from the tray or a journal embed: the shared line names the DC as
 * players may read it (C1) and only the creatures they see (close review 01/10, privacy
 * P1-3: a hidden creature is never named in a shared line, «Shared audit labels must not
 * reveal a hidden source»). A request that only concerns hidden creatures stays private.
 * The line is the request's card in the chat (TV-92, `logLabel`).
 */
export function commitRequest(ctx, input, origin) {
  const trial = structuredClone(ctx.state);
  const id = globalThis.crypto.randomUUID();
  const at = now();
  requests.createRequest(trial, input, ctx.role, { id, now: at, origin });
  const group = requests.requestGroups(trial, sliceOf(ctx), ctx.role).find((g) => g.groupId === id);
  const seen = group.rows.filter((r) => !hiddenFromPlayers(ctx.state, r.actorId));
  const names = seen
    .map((r) => (typeof r.name === "string" ? r.name : pick(r.name, ctx.lang)))
    .join(", ");
  const shared = {
    ...group,
    title: requests.titleWithDc(
      domain.testTitle(input),
      input.kind === "contest" || group.dc === null
        ? null
        : domain.dcVisibleTo(ctx.state, "player", "dm")
          ? group.dc
          : "hidden",
    ),
  };
  const secret =
    input.audience === "blind"
      ? ` · ${ctx.t("risultato solo al DM", "result for the DM only")}`
      : "";
  const label = `${ctx.t("Richiesta del DM", "DM request")}: ${input.kind === "contest" ? groupTitle(ctx, group) : groupTitle(ctx, shared)}${secret} → ${names}`;
  const hiddenSide = seen.length < group.rows.length && (input.kind === "contest" || !seen.length);
  ctx.commit(
    label,
    (draft) =>
      requests.createRequest(draft, input, ctx.role, {
        id,
        now: at,
        origin,
        logLabel: label,
      }),
    hiddenSide ? { visibility: "private" } : {},
  );
  return group;
}
function sendRequest(ctx) {
  const d = ui.requestDraft;
  ui.requestError = "";
  const input =
    d.kind === "contest"
      ? {
          kind: "contest",
          sides: d.contest.map((side) => ({ ...side })),
          audience: d.audience ?? "public",
        }
      : {
          kind: d.kind,
          ability: d.ability,
          skill: d.skill,
          dc: d.dc,
          rollMode: d.rollMode,
          actorIds: [...(d.actorIds ?? [])],
          audience: d.audience ?? "public",
        };
  commitRequest(ctx, input, { kind: "tray" });
}
/**
 * «Tira» on a request card in the chat (TV-92, dnd5e request card with its roll button):
 * digital dice at once, physical dice ask the faces first (the remembered choice).
 */
export function rollRequestFromCard(ctx, requestId) {
  const group = requests
    .requestGroups(ctx.state, sliceOf(ctx), ctx.role)
    .find((g) => g.rows.some((r) => r.requestId === requestId));
  const row = group?.rows.find((r) => r.requestId === requestId);
  if (!row?.canRoll)
    domain.fail("Questa richiesta non è più da tirare.", "This request is no longer to roll.");
  // TV-95: a d20 set to a connected die waits for it (Foundry's dice configuration).
  if (requestPlan(ctx, row)) return answerWithConnected(ctx, row);
  if (savedDice(ctx) === "physical") return askRequestFaces(ctx, row);
  answerRequest(ctx, row.attemptId, row.requestId);
  ctx.toast(requestToast(ctx, row.attemptId));
}
/** The dice of a request row with their methods, or null when no connected die takes part. */
function requestPlan(ctx, row, force = false) {
  const sides = (row.dice ?? []).flatMap((g) => Array(g.count).fill(g.sides));
  const slice = sliceOf(ctx);
  const plan = force
    ? sides.map((s) => {
        const device = domain.deviceFor(slice, ctx.role, s);
        return { sides: s, method: device ? "connected" : "physical", device };
      })
    : domain.dicePlan(slice, ctx.role, sides, savedDice(ctx));
  return plan.some((d) => d.method === "connected") ? plan : null;
}
/**
 * A DM request answered with the connected die (TV-95): the resolver waits for the throw,
 * then the answer is recorded as physical faces, named in the log («fisico · Pixels d20»).
 */
function answerWithConnected(ctx, row, force = false) {
  const plan = requestPlan(ctx, row, force);
  if (!plan) return null;
  const actor = ctx.state.actors[row.actorId];
  openPrompt(ctx, {
    where: "dialog",
    title: `${actor?.name ?? ""} · ${pick(domain.testTitle(row.test ?? {}), ctx.lang)}`,
    detail: row.dcHidden
      ? ctx.t("CD nascosta", "DC hidden")
      : Number.isInteger(row.dc)
        ? `${ctx.t("CD", "DC")} ${row.dc}`
        : "",
    plan,
    finish: (faces, info) => {
      answerRequest(ctx, row.attemptId, row.requestId, {
        physical: true,
        faces,
        devices: info.devices,
      });
      ctx.toast(requestToast(ctx, row.attemptId));
    },
  });
  return null;
}
// Each section keeps its scroll position across renders (a commit re-renders the Table):
// the person stays on the card or row they were working on.
const scrollMemory = {};
function keepScroll(root) {
  const scroller = root.closest?.(".table-drawer");
  if (!scroller) return;
  const key = `${ui.role}:${ui.section}`;
  if (scrollMemory[key] !== undefined) scroller.scrollTop = scrollMemory[key];
  scroller.addEventListener("scroll", () => (scrollMemory[key] = scroller.scrollTop), {
    passive: true,
  });
}
function bindTray(root, ctx) {
  closeMenu();
  keepScroll(root);
  const host = root.querySelector("[data-dtray]") ?? root;
  root.querySelectorAll("[data-dtray-section]").forEach((tab) => {
    tab.onclick = () => {
      ui.section = tab.dataset.dtraySection;
      rerender(ctx, `[data-dtray-section="${ui.section}"]`);
    };
    tab.onkeydown = (event) => {
      const tabs = [...root.querySelectorAll("[data-dtray-section]")];
      const index = tabs.indexOf(tab);
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
    };
  });
  bindRollSection(root, ctx, host);
  bindRequestsSection(root, ctx);
  bindLookSection(root, ctx);
  bindInspiration(root, ctx);
  applyFocus(root);
}
/** Updates the parts of the form that depend on the typed formula, in place. */
function refreshFormulaUI(root, ctx) {
  const formula = root.querySelector("[data-dtray-formula]");
  const text = root.querySelector("[data-dtray-roll-text]");
  const error = root.querySelector("[data-dtray-formula-error]");
  let parsed = null;
  try {
    parsed = domain.parseFormula(ui.formula);
    if (text) text.textContent = `${ctx.t("Tira", "Roll")} ${domain.prettyFormula(parsed.text)}`;
    formula?.removeAttribute("aria-invalid");
    if (error) {
      error.hidden = true;
      error.textContent = "";
    }
  } catch (problem) {
    if (text) text.textContent = ctx.t("Tira", "Roll");
    formula?.setAttribute("aria-invalid", "true");
    if (error) {
      error.hidden = false;
      error.textContent = localized(ctx, problem);
    }
  }
  const d20 = parsed ? domain.hasPlainD20(parsed) : false;
  const disabled = {
    advantage: !d20,
    disadvantage: !d20,
    critical: d20 || !parsed,
  };
  root.querySelectorAll("[data-dtray-rollmode]").forEach((input) => {
    input.disabled = Boolean(disabled[input.value]);
  });
  if (disabled[ui.rollMode]) {
    ui.rollMode = "normal";
    const normal = root.querySelector('[data-dtray-rollmode][value="normal"]');
    if (normal) normal.checked = true;
  }
  // Still pressable: a press on a wrong formula explains it again (never a silent button).
  root.querySelector("[data-dtray-roll-button]")?.setAttribute("data-invalid", String(!parsed));
  const faces = root.querySelector("[data-dtray-faces]");
  if (faces && modeNow(ctx) === "physical") {
    const holder = root.ownerDocument.createElement("div");
    holder.innerHTML = physicalInputs(ctx);
    const next = holder.firstElementChild;
    if (next) {
      faces.replaceWith(next);
      bindFaces(root);
    }
  }
}
function bindFaces(root) {
  root
    .querySelectorAll("[data-dtray-face]")
    .forEach((input) =>
      input.addEventListener(
        "input",
        () => (ui.faces[Number(input.dataset.dtrayFace)] = input.value),
      ),
    );
}
function bindRollSection(root, ctx, host) {
  const form = root.querySelector("[data-dtray-form]");
  if (!form) return;
  root.querySelector("[data-dtray-actor]")?.addEventListener("change", (event) => {
    ui.actorId = event.target.value;
    rerender(ctx, "[data-dtray-actor]");
  });
  const formula = root.querySelector("[data-dtray-formula]");
  // Live label, explanation, modes and physical inputs while typing, without a render
  // (a render on "change" would replace the Roll button under the pointer).
  formula?.addEventListener("input", () => {
    ui.formula = formula.value;
    ui.faces = [];
    ui.extra = [];
    refreshFormulaUI(root, ctx);
  });
  root.querySelectorAll("[data-dtray-add]").forEach((button) => {
    button.onclick = () => {
      appendToFormula(`1d${button.dataset.dtrayAdd}`);
      ui.faces = [];
      ui.extra = [];
      ui.error = "";
      if (ui.rollMode !== "normal") ui.rollMode = "normal";
      rerender(ctx, `[data-dtray-add="${button.dataset.dtrayAdd}"]`);
    };
  });
  root.querySelectorAll("[data-dtray-bonus]").forEach((button) => {
    button.onclick = () => {
      appendToFormula(button.dataset.dtrayBonus);
      rerender(ctx, `[data-dtray-bonus="${button.dataset.dtrayBonus}"]`);
    };
  });
  root.querySelector("[data-dtray-clear]")?.addEventListener("click", () => {
    Object.assign(ui, { formula: "", faces: [], extra: [], error: "", rollMode: "normal" });
    rerender(ctx, "[data-dtray-formula]");
  });
  root.querySelectorAll("[data-dtray-rollmode]").forEach((input) =>
    input.addEventListener("change", () => {
      ui.rollMode = input.value;
      ui.faces = [];
      ui.extra = [];
      rerender(ctx, `[data-dtray-rollmode][value="${input.value}"]`);
    }),
  );
  root.querySelectorAll("[data-dtray-mode]").forEach((input) =>
    input.addEventListener("change", () => {
      ui.mode = input.value;
      ui.faces = [];
      ui.extra = [];
      // Digital or physical is remembered for every roll in place (sheet, journal): one
      // personal choice, as Foundry's per-user dice configuration (FVT-153).
      if (["digital", "physical"].includes(input.value) && savedDice(ctx) !== input.value)
        try {
          area.setSetting(ctx, `${ID}.dice`, input.value);
        } catch {
          /* signed out or storage refused: the tab's own choice still applies */
        }
      rerender(ctx, `[data-dtray-mode][value="${input.value}"]`);
    }),
  );
  root
    .querySelectorAll("[data-dtray-audience]")
    .forEach((input) => input.addEventListener("change", () => (ui.audience = input.value)));
  root
    .querySelector("[data-dtray-dc]")
    ?.addEventListener("input", (event) => (ui.dc = event.target.value));
  root
    .querySelector("[data-dtray-label]")
    ?.addEventListener("input", (event) => (ui.label = event.target.value));
  root
    .querySelectorAll("[data-dtray-face]")
    .forEach((input) =>
      input.addEventListener(
        "input",
        () => (ui.faces[Number(input.dataset.dtrayFace)] = input.value),
      ),
    );
  form.onsubmit = (event) => {
    event.preventDefault();
    submitForm(ctx, root);
  };
  // The Roll button's own menu (right click, long press, "…").
  const rollButton = root.querySelector("[data-dtray-roll-button]");
  if (rollButton) {
    let parsed = null;
    try {
      parsed = domain.parseFormula(ui.formula);
    } catch {
      parsed = null;
    }
    const spec = {
      d20: parsed ? domain.hasPlainD20(parsed) : false,
      critical: parsed
        ? !domain.hasPlainD20(parsed) && parsed.terms.some((t) => t.type === "dice")
        : false,
    };
    // The menu decides this roll only (D&D Beyond per-roll override, DDB-149); physical
    // dice with advantage need a second face first, so that choice stays on the form.
    const run = ({ rollMode, audience }) => {
      if (modeNow(ctx) === "physical" && rollMode && rollMode !== ui.rollMode) {
        Object.assign(ui, { rollMode, faces: [], extra: [], error: "" });
        if (audience) ui.audience = audience;
        return rerender(ctx, '[data-dtray-face="0"]');
      }
      submitForm(ctx, root, {
        ...(rollMode ? { rollMode } : {}),
        ...(audience ? { audience } : {}),
      });
    };
    // A plain click submits the form (Enter too); only the menu gestures are bound here.
    rollButton.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openMenu(ctx, host, rollButton, spec, run, { x: event.clientX, y: event.clientY });
    });
    let timer = 0;
    let pressed = false;
    rollButton.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      pressed = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        pressed = true;
        openMenu(ctx, host, rollButton, spec, run, { x: event.clientX, y: event.clientY });
      }, 500);
    });
    for (const type of ["pointerup", "pointercancel", "pointerleave"])
      rollButton.addEventListener(type, () => clearTimeout(timer));
    rollButton.addEventListener(
      "click",
      (event) => {
        if (pressed) {
          pressed = false;
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    root
      .querySelector(".dtray-roll-row [data-dtray-more]")
      ?.addEventListener("click", (event) => openMenu(ctx, host, event.currentTarget, spec, run));
  }
  // The tray's numbers follow the tray's «Dadi» choice (connected included).
  // TV-90: the panel's «Chi vede il risultato» applies to its listed checks too (Foundry's
  // one roll-mode selector), unless the roll menu names another audience.
  bindNumbers(
    root,
    ctx,
    host,
    () => modeNow(ctx),
    () => audienceNow(ctx),
    "tray",
  );
  bindStack(root, ctx);
  bindWaiting(root, ctx);
  root.querySelector("[data-dtray-open-devices]")?.addEventListener("click", () => {
    ui.section = "look";
    rerender(ctx, "#dtray-devices-title");
  });
  root.querySelectorAll("[data-dtray-reroll]").forEach((button) => {
    button.onclick = () => {
      const record = sliceOf(ctx).rolls.find((r) => r.id === button.dataset.dtrayReroll);
      if (record) openReroll(ctx, { record });
    };
  });
  bindRecent(root, ctx);
}
/** The tray's waiting card (TV-95): simulate the throw, type by hand, record or cancel. */
function bindWaiting(root, ctx) {
  const promptOf = (id) => prompts.find((p) => p.id === id && p.role === ctx.role) ?? null;
  root.querySelectorAll("[data-dtray-connected-roll]").forEach((button) =>
    button.addEventListener("click", () => {
      const prompt = promptOf(button.dataset.dtrayConnectedRoll);
      const next = prompt && nextConnected(prompt);
      if (!next) return;
      safe(
        ctx,
        () => simulateConnectedRoll(ctx, slotDevice(ctx, next)?.id ?? next.sides),
        (message) => {
          prompt.error = message;
          rerender(ctx, `[data-dtray-connected-roll="${prompt.id}"]`);
        },
      );
    }),
  );
  root.querySelectorAll("[data-dtray-wait-face]").forEach((input) =>
    input.addEventListener("input", () => {
      const prompt = promptOf(input.dataset.prompt);
      const slot = prompt?.dice[Number(input.dataset.dtrayWaitFace)];
      if (slot && slot.by !== "device") {
        slot.face = isFace(input.value, slot.sides) ? Number(input.value) : null;
        slot.by = slot.face === null ? null : "hand";
      }
    }),
  );
  root.querySelectorAll("[data-dtray-connected-record]").forEach((button) =>
    button.addEventListener("click", () => {
      const prompt = promptOf(button.dataset.dtrayConnectedRecord);
      if (!prompt) return;
      const typed = (i) => root.querySelector(`[data-dtray-wait-face="${i}"]`)?.value;
      try {
        takeTyped(ctx, prompt, typed);
        prompt.error = "";
        complete(ctx, prompt);
      } catch (error) {
        prompt.error = localized(ctx, error);
        rerender(ctx, `[data-dtray-connected-record="${prompt.id}"]`);
      }
    }),
  );
  root.querySelectorAll("[data-dtray-connected-cancel]").forEach((button) =>
    button.addEventListener("click", () => {
      const prompt = promptOf(button.dataset.dtrayConnectedCancel);
      if (prompt) cancelPrompt(ctx, prompt);
    }),
  );
}
function bindNumbers(
  root,
  ctx,
  host,
  diceOf = () => savedDice(ctx),
  audienceOf = () => null,
  where = "dialog",
) {
  root.querySelectorAll("[data-dtray-roll]").forEach((control) => {
    const spec = {
      kind: control.dataset.kind,
      ability: control.dataset.ability || null,
      skill: control.dataset.skill || null,
      actorId: control.dataset.actor,
      d20: true,
    };
    bindRollable(ctx, host, control, spec, ({ rollMode, audience }) =>
      rollNumber(ctx, spec, {
        rollMode,
        audience: audience ?? audienceOf() ?? undefined,
        dice: diceOf(),
        where,
      }),
    );
  });
}
function bindStack(root, ctx) {
  const local = { local: true, visibility: "private", undoable: false };
  const change = (label, mutate, focus) => {
    safe(ctx, () => {
      ui.focus = focus;
      ctx.commit(label, (draft) => mutate(area.slice(draft)), local);
    });
  };
  root.querySelectorAll("[data-dtray-stack-preset]").forEach((button) => {
    button.onclick = () => {
      const preset = sliceOf(ctx).presets.find((p) => p.id === button.dataset.dtrayStackPreset);
      change(
        `${ctx.t("Pila dei modificatori", "Modifier stack")}: + ${pick(preset?.label, ctx.lang)} ${domain.signed(preset?.value ?? 0)}`,
        (slice) => domain.pushStack(slice, ctx.role, { presetId: button.dataset.dtrayStackPreset }),
        `[data-dtray-stack-preset="${button.dataset.dtrayStackPreset}"]`,
      );
    };
  });
  const value = root.querySelector("[data-dtray-mod-value]");
  value?.addEventListener("input", () => (ui.modValue = value.value));
  value?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      root.querySelector("[data-dtray-stack-add]")?.click();
    }
  });
  root.querySelector("[data-dtray-stack-add]")?.addEventListener("click", () => {
    const n = Number(ui.modValue);
    safe(ctx, () => {
      ui.focus = "[data-dtray-mod-value]";
      ctx.commit(
        `${ctx.t("Pila dei modificatori", "Modifier stack")}: ${domain.signed(n)}`,
        (draft) => domain.pushStack(area.slice(draft), ctx.role, { value: ui.modValue }),
        local,
      );
      ui.modValue = "";
      ctx.render();
    });
  });
  root.querySelectorAll("[data-dtray-unstack]").forEach((button) => {
    button.onclick = () =>
      change(
        ctx.t("Modificatore tolto dalla pila", "Modifier removed from the stack"),
        (slice) => domain.removeFromStack(slice, ctx.role, button.dataset.dtrayUnstack),
        "[data-dtray-mod-value]",
      );
  });
  root
    .querySelector("[data-dtray-unstack-all]")
    ?.addEventListener("click", () =>
      change(
        ctx.t("Pila dei modificatori svuotata", "Modifier stack cleared"),
        (slice) => domain.clearStack(slice, ctx.role),
        "[data-dtray-mod-value]",
      ),
    );
  // DM presets (shared with the campaign).
  root.querySelectorAll("[data-dtray-preset-field]").forEach((input) =>
    input.addEventListener("input", () => {
      ui.presetDraft[input.dataset.dtrayPresetField] =
        input.type === "checkbox" ? input.checked : input.value;
    }),
  );
  root.querySelector("[data-dtray-preset-add]")?.addEventListener("click", () =>
    safe(ctx, () => {
      ui.focus = "[data-dtray-preset-add]";
      ctx.commit(
        `${ctx.t("Modificatore preparato", "Prepared modifier")}: ${ui.presetDraft.label} ${ui.presetDraft.value}`,
        (draft) => domain.addPreset(area.slice(draft), ctx.role, ui.presetDraft),
        // TV-96 (Fantasy Grounds standard modifiers): preparing a modifier is the DM's
        // service work; its line stays in the DM's log and never names it to the players.
        { undoable: false, visibility: "private" },
      );
      ui.presetDraft = { label: "", value: "", visible: true };
      ctx.render();
      root.ownerDocument.querySelector("[data-dtray-presets-manager]")?.setAttribute("open", "");
    }),
  );
  root.querySelectorAll("[data-dtray-preset-visible]").forEach((input) =>
    input.addEventListener("change", () =>
      safe(ctx, () => {
        ui.focus = `[data-dtray-preset-visible="${input.dataset.dtrayPresetVisible}"]`;
        ctx.commit(
          input.checked
            ? ctx.t("Modificatore visibile ai giocatori", "Modifier visible to players")
            : ctx.t("Modificatore nascosto ai giocatori", "Modifier hidden from players"),
          (draft) =>
            domain.setPresetVisible(
              area.slice(draft),
              ctx.role,
              input.dataset.dtrayPresetVisible,
              input.checked,
            ),
          { undoable: false, visibility: "private" },
        );
      }),
    ),
  );
  root.querySelectorAll("[data-dtray-preset-remove]").forEach((button) => {
    button.onclick = () =>
      safe(ctx, () =>
        ctx.commit(
          ctx.t("Modificatore preparato eliminato", "Prepared modifier deleted"),
          (draft) =>
            domain.removePreset(area.slice(draft), ctx.role, button.dataset.dtrayPresetRemove),
          { undoable: false, visibility: "private" },
        ),
      );
  });
}
/** Withdraw with a reason (the tray's list and the log card, TV-87). */
function openWithdraw(ctx, record) {
  ctx.dialog(
    ctx.t("Ritira il tiro", "Withdraw the roll"),
    `<p>${esc(ctx, rollLabel(ctx, { ...record, audience: "public" }, ctx.role))}</p><p class="muted">${ctx.t("Le facce restano nello storico come ritirate. Un nuovo tiro identico riusa una volta le stesse facce digitali.", "The faces stay in the history as withdrawn. An identical new roll reuses the same digital faces once.")}</p><label class="field">${ctx.t("Motivo", "Reason")}<textarea name="reason" maxlength="200" required data-dtray-reason></textarea></label>`,
    {
      submitLabel: ctx.t("Ritira", "Withdraw"),
      onSubmit: (data) =>
        ctx.commit(
          `${ctx.t("Tiro ritirato", "Roll withdrawn")}: ${record.actorName ?? ""} ${titleOf(ctx, record)} · ${data.get("reason")}`,
          (draft) =>
            domain.withdrawRoll(area.slice(draft), record.id, data.get("reason"), ctx.role, now()),
          commitOptionsFor(record),
        ),
    },
  );
}
/** Correct a physical roll's faces with a reason (the tray's list and the log card). */
function openCorrect(ctx, record) {
  const sides = domain.inputSides(record);
  const values = domain.inputOrder(record);
  ctx.dialog(
    ctx.t("Correggi le facce del dado fisico", "Correct the physical die faces"),
    `<p>${esc(ctx, titleOf(ctx, record))} · ${esc(ctx, domain.breakdown({ ...record, readable: true }, ctx.lang))}</p><div class="form-grid">${sides.map((s, i) => `<label class="field">${ctx.t("Dado", "Die")} ${i + 1} · d${s}<input type="number" name="face-${i}" min="1" max="${s}" inputmode="numeric" value="${values[i]}" required></label>`).join("")}</div><label class="field">${ctx.t("Motivo", "Reason")}<textarea name="reason" maxlength="200" required data-dtray-reason></textarea></label>`,
    {
      submitLabel: ctx.t("Registra la correzione", "Record the correction"),
      onSubmit: (data) => {
        let corrected = null;
        const faces = sides.map((_, i) => data.get(`face-${i}`));
        domain.correctRoll(
          structuredClone(sliceOf(ctx)),
          ctx.state,
          record.id,
          faces,
          data.get("reason"),
          ctx.role,
          now(),
        );
        ctx.commit(
          `${ctx.t("Correzione del tiro", "Roll correction")}: ${record.actorName ?? ""} ${titleOf(ctx, record)} · ${data.get("reason")}`,
          (draft) => {
            corrected = domain.correctRoll(
              area.slice(draft),
              draft,
              record.id,
              faces,
              data.get("reason"),
              ctx.role,
              now(),
            );
          },
          commitOptionsFor(record),
        );
        announceRoll(ctx, corrected);
      },
    },
  );
}
/** Reveal a hidden roll (Foundry reveal; FG drag onto a player), to the chosen audience. */
function revealTo(ctx, record, target) {
  const to =
    target === "all"
      ? ctx.t("a tutti", "to everyone")
      : target === "dm"
        ? ctx.t("al DM", "to the DM")
        : `${ctx.t("solo a", "only to")} ${ctx.state.actors[target]?.name ?? ""}`;
  const full = rollLabel(ctx, { ...record, audience: "public" });
  ctx.commit(
    // A reveal to everyone shows the result in the log; to one person it stays private.
    target === "all"
      ? `${ctx.t("Tiro rivelato", "Roll revealed")} ${to}: ${full}`
      : `${ctx.t("Tiro rivelato", "Roll revealed")} ${to}`,
    (draft) => domain.revealRoll(area.slice(draft), draft, record.id, target, ctx.role, now()),
    target === "all" ? { undoable: false } : { visibility: "private", undoable: false },
  );
}
function openReveal(ctx, record) {
  const actors = domain.revealTargets(ctx.state);
  ctx.dialog(
    ctx.t("Rivela il tiro", "Reveal the roll"),
    `<p>${esc(ctx, whoOf(ctx, record))} · ${esc(ctx, titleOf(ctx, record))}: <strong>${record.total}</strong></p><label class="field">${ctx.t("Rivela a", "Reveal to")}<select name="target">${revealOptions(
      ctx,
      record,
      actors,
    )
      .map(([value, label]) => `<option value="${esc(ctx, value)}">${esc(ctx, label)}</option>`)
      .join("")}</select></label>`,
    {
      submitLabel: ctx.t("Rivela", "Reveal"),
      onSubmit: (data) => revealTo(ctx, record, String(data.get("target") ?? "all")),
    },
  );
}
/** The log card's actions (TV-87): the chat asks, the tray runs its own dialogs. */
export function runRollAction(ctx, id, action) {
  const record = sliceOf(ctx).rolls.find((r) => r.id === id);
  if (!record) return;
  if (action === "withdraw") return openWithdraw(ctx, record);
  if (action === "correct") return openCorrect(ctx, record);
  if (action === "reveal") return openReveal(ctx, record);
}
function bindRecent(root, ctx) {
  root.querySelectorAll("[data-dtray-again]").forEach((button) => {
    button.onclick = () => {
      const record = sliceOf(ctx).rolls.find((r) => r.id === button.dataset.dtrayAgain);
      if (!record) return;
      if (record.mode === "physical") {
        // Physical dice are rolled at the table: the form is prefilled for the new faces.
        Object.assign(ui, {
          formula: record.formula,
          rollMode: record.rollMode,
          mode: "physical",
          audience: record.audience,
          actorId: record.actorId ?? "",
          dc: record.dc === null ? "" : String(record.dc),
          faces: [],
          extra: [],
        });
        return rerender(ctx, '[data-dtray-face="0"]');
      }
      safe(ctx, () => {
        rollFromTray(ctx, {
          kind: record.kind,
          ability: record.ability,
          skill: record.skill,
          formula: record.formula,
          actorId: record.actorId,
          rollMode: record.rollMode,
          audience: record.audience,
          mode: record.mode === "connected" ? "digital" : record.mode,
          dc: record.dc,
          label: record.kind === "free" && record.title ? pick(record.title, ctx.lang) : "",
        });
        ui.focus = "[data-dtray-roll-button]";
        ctx.render();
      });
    };
  });
  root.querySelectorAll("[data-dtray-withdraw]").forEach((button) => {
    button.onclick = () => {
      const record = sliceOf(ctx).rolls.find((r) => r.id === button.dataset.dtrayWithdraw);
      if (record) openWithdraw(ctx, record);
    };
  });
  root.querySelectorAll("[data-dtray-correct]").forEach((button) => {
    button.onclick = () => {
      const record = sliceOf(ctx).rolls.find((r) => r.id === button.dataset.dtrayCorrect);
      if (record) openCorrect(ctx, record);
    };
  });
  root.querySelectorAll("[data-dtray-reveal]").forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.dtrayReveal;
      const target =
        root.querySelector(`[data-dtray-reveal-target="${cssEscape(id)}"]`)?.value ?? "all";
      const record = sliceOf(ctx).rolls.find((r) => r.id === id);
      if (!record) return;
      safe(ctx, () => revealTo(ctx, record, target));
    };
  });
}
function bindRequestsSection(root, ctx) {
  const form = root.querySelector("[data-dtray-request-form]");
  if (form) {
    const d = ui.requestDraft;
    form.querySelectorAll("[data-dtray-rq-mode]").forEach((input) =>
      input.addEventListener("change", () => {
        d.kind = input.value === "contest" ? "contest" : (d.lastKind ?? "save");
        rerender(ctx, `[data-dtray-rq-mode][value="${input.value}"]`);
      }),
    );
    form.querySelectorAll("[data-dtray-rq]").forEach((input) => {
      const key = input.dataset.dtrayRq;
      const apply = () => {
        const contest = /^c(\d)-(.+)$/.exec(key);
        if (contest) d.contest[Number(contest[1])][contest[2]] = input.value;
        else d[key] = input.value;
        if (key === "kind") d.lastKind = input.value;
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", () => {
        apply();
        // The test kind decides which field (ability or skill) follows.
        if (/kind$/.test(key)) rerender(ctx, `[data-dtray-rq="${key}"]`);
      });
    });
    form
      .querySelectorAll("[data-dtray-rq-audience]")
      .forEach((input) => input.addEventListener("change", () => (d.audience = input.value)));
    form.querySelectorAll("[data-dtray-rq-target]").forEach((input) =>
      input.addEventListener("change", () => {
        d.actorIds = [...form.querySelectorAll("[data-dtray-rq-target]:checked")].map(
          (i) => i.value,
        );
      }),
    );
    form.onsubmit = (event) => {
      event.preventDefault();
      try {
        sendRequest(ctx);
        ui.requestDraft = {
          ...blankRequestDraft(),
          audience: d.audience,
          actorIds: d.actorIds,
          kind: d.kind === "contest" ? "contest" : d.kind,
          ability: d.ability,
          skill: d.skill,
          contest: d.contest,
        };
        ui.focus = "[data-dtray-request-send]";
        ctx.render();
      } catch (error) {
        ui.requestError = localized(ctx, error);
        rerender(ctx, "[data-dtray-request-send]");
      }
    };
  }
  const guarded = (run, focus) => {
    try {
      run();
      ui.requestError = "";
      if (focus) ui.focus = focus;
      ctx.render();
    } catch (error) {
      ctx.toast(localized(ctx, error), true);
    }
  };
  root.querySelectorAll("[data-dtray-answer]").forEach((button) => {
    button.onclick = () =>
      guarded(
        () => answerRequest(ctx, button.dataset.attempt, button.dataset.dtrayAnswer),
        `[data-dtray-request-row="${button.dataset.dtrayAnswer}"] button, [data-dtray-requests-title]`,
      );
  });
  root.querySelectorAll("[data-dtray-answer-connected]").forEach((button) => {
    button.onclick = () => {
      const row = requests
        .requestGroups(ctx.state, sliceOf(ctx), ctx.role)
        .flatMap((g) => g.rows)
        .find((r) => r.requestId === button.dataset.dtrayAnswerConnected);
      if (row?.canRoll) safe(ctx, () => answerWithConnected(ctx, row, true));
    };
  });
  root.querySelectorAll("[data-dtray-answer-physical]").forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.dtrayAnswerPhysical;
      ui.physicalOpen[id] = !ui.physicalOpen[id];
      rerender(
        ctx,
        ui.physicalOpen[id]
          ? `[data-dtray-request-face="${id}"]`
          : `[data-dtray-answer-physical="${id}"]`,
      );
    };
  });
  root.querySelectorAll("[data-dtray-request-face]").forEach((input) =>
    input.addEventListener("input", () => {
      const id = input.dataset.dtrayRequestFace;
      (ui.requestFaces[id] ||= [])[Number(input.dataset.index)] = input.value;
    }),
  );
  root.querySelectorAll("[data-dtray-request-face]").forEach((input) =>
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      root
        .querySelector(`[data-dtray-answer-record="${cssEscape(input.dataset.dtrayRequestFace)}"]`)
        ?.click();
    }),
  );
  root.querySelectorAll("[data-dtray-answer-record]").forEach((button) => {
    button.onclick = () =>
      guarded(() =>
        answerRequest(ctx, button.dataset.attempt, button.dataset.dtrayAnswerRecord, {
          physical: true,
        }),
      );
  });
  root.querySelectorAll("[data-dtray-reapply]").forEach((button) => {
    button.onclick = () =>
      guarded(() =>
        answerRequest(ctx, button.dataset.attempt, button.dataset.dtrayReapply, { known: true }),
      );
  });
  root.querySelectorAll("[data-dtray-request-correct]").forEach((button) => {
    button.onclick = () =>
      openRoll(ctx, button.dataset.attempt, button.dataset.dtrayRequestCorrect);
  });
  root.querySelectorAll("[data-dtray-request-reroll]").forEach((button) => {
    button.onclick = () => {
      const group = requests
        .requestGroups(ctx.state, sliceOf(ctx), ctx.role)
        .find((g) => g.rows.some((r) => r.requestId === button.dataset.dtrayRequestReroll));
      const row = group?.rows.find((r) => r.requestId === button.dataset.dtrayRequestReroll);
      if (row) openReroll(ctx, { row });
    };
  });
  const slicing = (label, mutate) =>
    safe(ctx, () =>
      ctx.commit(label, (draft) => mutate(area.slice(draft), draft), { undoable: false }),
    );
  root.querySelectorAll("[data-dtray-request-close]").forEach((button) => {
    button.onclick = () =>
      slicing(ctx.t("Richiesta conclusa", "Request closed"), (slice, draft) =>
        requests.closeRequest(slice, button.dataset.dtrayRequestClose, ctx.role, draft),
      );
  });
  root.querySelectorAll("[data-dtray-request-reopen]").forEach((button) => {
    button.onclick = () =>
      slicing(ctx.t("Richiesta riaperta", "Request reopened"), (slice, draft) =>
        requests.reopenRequest(slice, button.dataset.dtrayRequestReopen, ctx.role, draft),
      );
  });
}
function bindLookSection(root, ctx) {
  root.querySelectorAll("[data-dtray-policy]").forEach((button) => {
    button.onclick = () => openPolicyDialog(ctx, button.dataset.dtrayPolicy);
  });
  const settingChange = (key, value, focus) =>
    safe(ctx, () => {
      ui.focus = focus;
      // The remembered dice choice is the tray's too (one choice, never two that differ).
      if (key === `${ID}.dice`) ui.mode = null;
      area.setSetting(ctx, key, value);
    });
  root.querySelectorAll("[data-dtray-style]").forEach((input) =>
    input.addEventListener("change", () =>
      safe(ctx, () => {
        ui.focus = `[data-dtray-style][value="${input.value}"]`;
        if (b56Loaded()) area.setSetting(ctx, "dice-3d.enabled", input.value === "3d");
        if (input.value !== "3d") area.setSetting(ctx, `${ID}.style`, input.value);
      }),
    ),
  );
  root
    .querySelectorAll("[data-dtray-setting]")
    .forEach((select) =>
      select.addEventListener("change", () =>
        settingChange(
          `${ID}.${select.dataset.dtraySetting}`,
          select.value,
          `[data-dtray-setting="${select.dataset.dtraySetting}"]`,
        ),
      ),
    );
  root
    .querySelectorAll("[data-dtray-setting-bool]")
    .forEach((input) =>
      input.addEventListener("change", () =>
        settingChange(
          `${ID}.${input.dataset.dtraySettingBool}`,
          input.checked,
          `[data-dtray-setting-bool="${input.dataset.dtraySettingBool}"]`,
        ),
      ),
    );
  root
    .querySelector("[data-dtray-announce]")
    ?.addEventListener("change", (event) =>
      settingChange(`${ID}-campaign.announce`, event.target.checked, "[data-dtray-announce]"),
    );
  root
    .querySelector("[data-dtray-karmic]")
    ?.addEventListener("change", (event) =>
      settingChange(`${ID}-campaign.karmic`, event.target.checked, "[data-dtray-karmic]"),
    );
  const local = { local: true, visibility: "private", undoable: false };
  // TV-95: the connected dice panel (Pixels pattern, simulated). Pairing and the per-type
  // methods are this identity's own (local, private, no Undo), like the Pixels app's list.
  const device = (label, mutate, focus) =>
    safe(ctx, () => {
      ui.focus = focus;
      ctx.commit(label, (draft) => mutate(area.slice(draft)), local);
    });
  root.querySelector("[data-dtray-scan]")?.addEventListener("click", () => {
    ui.scan = !ui.scan;
    rerender(ctx, ui.scan ? "[data-dtray-connect], [data-dtray-scan]" : "[data-dtray-scan]");
  });
  root.querySelectorAll("[data-dtray-connect]").forEach((button) => {
    button.onclick = () => {
      const found = domain.NEARBY_DICE.find((d) => d.pixelId === button.dataset.dtrayConnect);
      device(
        `${ctx.t("Dado connesso collegato (simulato)", "Connected die paired (simulated)")}: ${pick(found?.name, ctx.lang)}`,
        (slice) => domain.pairDevice(slice, ctx.role, { pixelId: button.dataset.dtrayConnect }),
        "[data-dtray-paired] [data-dtray-device-roll], [data-dtray-scan]",
      );
    };
  });
  root.querySelectorAll("[data-dtray-device-rename]").forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.dtrayDeviceRename;
      const name = root.querySelector(`[data-dtray-device-name="${cssEscape(id)}"]`)?.value;
      device(
        ctx.t("Dado connesso rinominato", "Connected die renamed"),
        (slice) => domain.renameDevice(slice, ctx.role, id, name),
        `[data-dtray-device-rename="${id}"]`,
      );
    };
  });
  root.querySelectorAll("[data-dtray-device-state]").forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.dtrayDeviceState;
      const state = button.dataset.state;
      const name = deviceName(ctx, deviceById(ctx, id));
      device(
        state === "disconnected"
          ? `${ctx.t("Dado scollegato", "Die disconnected")}: ${name}`
          : `${ctx.t("Dado connesso", "Die connected")}: ${name}`,
        (slice) => domain.setDeviceState(slice, ctx.role, id, state),
        `[data-dtray-device-state="${id}"]`,
      );
    };
  });
  root.querySelectorAll("[data-dtray-device-blink]").forEach((button) => {
    button.onclick = () => {
      // «Fai lampeggiare» (Pixels "Blink"): the real die lights up; here the row does.
      ui.blink = { id: button.dataset.dtrayDeviceBlink, until: Date.now() + 3000 };
      rerender(ctx, `[data-dtray-device-blink="${button.dataset.dtrayDeviceBlink}"]`);
    };
  });
  root.querySelectorAll("[data-dtray-device-roll]").forEach((button) => {
    button.onclick = () =>
      safe(ctx, () => {
        const result = simulateConnectedRoll(ctx, button.dataset.dtrayDeviceRoll);
        if (result.prompt)
          ctx.toast(
            ctx.t(
              `Faccia ${result.face} arrivata al tiro in attesa.`,
              `Face ${result.face} sent to the waiting roll.`,
            ),
          );
      });
  });
  root.querySelectorAll("[data-dtray-device-forget]").forEach((button) => {
    button.onclick = () =>
      device(
        ctx.t("Dado connesso dimenticato", "Connected die forgotten"),
        (slice) => domain.forgetDevice(slice, ctx.role, button.dataset.dtrayDeviceForget),
        "[data-dtray-scan]",
      );
  });
  root
    .querySelectorAll("[data-dtray-method]")
    .forEach((select) =>
      select.addEventListener("change", () =>
        device(
          `${ctx.t("Metodo del dado", "Die method")} d${select.dataset.dtrayMethod}: ${select.value === "default" ? ctx.t("come «Dadi»", "as “Dice”") : pick(DIE_METHOD_NAMES[select.value], ctx.lang)}`,
          (slice) =>
            domain.setDieMethod(slice, ctx.role, Number(select.dataset.dtrayMethod), select.value),
          `[data-dtray-method="${select.dataset.dtrayMethod}"]`,
        ),
      ),
    );
  const b56 = root.querySelector(".dtray-b56");
  if (b56 && b56Loaded()) safeRender(() => dice3d.bindDrawer(b56, ctx));
}
function bindInspiration(root, ctx) {
  root.querySelectorAll("[data-dtray-inspiration]").forEach((input) =>
    input.addEventListener("change", () => {
      const actorId = input.dataset.dtrayInspiration;
      const name = ctx.state.actors[actorId]?.name ?? "";
      const where = input.closest("[data-dtray-inspiration-wrap]")?.dataset.dtrayInspirationWrap;
      safe(
        ctx,
        () => {
          ui.focus = `[data-dtray-inspiration-wrap="${where}"] [data-dtray-inspiration="${actorId}"]`;
          ctx.commit(
            `${name}: ${input.checked ? ctx.t("Ispirazione eroica ottenuta", "Heroic Inspiration gained") : ctx.t("Ispirazione eroica tolta", "Heroic Inspiration removed")}`,
            (draft) =>
              domain.setInspiration(
                area.slice(draft),
                draft,
                actorId,
                input.checked,
                ctx.role,
                now(),
              ),
            { undoable: false },
          );
        },
        (message) => {
          input.checked = !input.checked;
          ctx.toast(message, true);
        },
      );
    }),
  );
}

// ---------------------------------------------------------------- sheet section

function renderSheetSection(ctx, actor) {
  const slice = sliceOf(ctx);
  const canRoll = domain.trayActors(ctx.state, ctx.role).some((a) => a.id === actor.id);
  const last = [...slice.rolls]
    .reverse()
    .find((r) => r.actorId === actor.id && domain.canSeeResult(r, ctx.role, ctx.state));
  const inspired =
    last &&
    last.by === ctx.role &&
    domain.hasInspiration(slice, actor.id) &&
    !last.rerolls.length &&
    last.status !== "withdrawn";
  const policy = domain.policyOf(slice, actor.id);
  // PG-23: the saves and skills are rolled from the sheet's own list above (one engine);
  // this box keeps what the list has not: Heroic Inspiration, a free formula for this
  // character and the character's roll policy (Roll20 Manage Sheet, Beyond20 Type of Roll).
  return `<section class="panel dtray-sheet" data-dtray-sheet aria-labelledby="dtray-sheet-title"><div class="dtray-sheet-head"><h3 id="dtray-sheet-title">${ctx.t("Tiri", "Rolls")}</h3>${inspirationControl(ctx, actor.id, "sheet")}</div>
${
  canRoll
    ? `<form class="dtray-sheet-free" data-dtray-sheet-free="${esc(ctx, actor.id)}" novalidate><label class="field">${ctx.t("Formula libera", "Free formula")}<input value="${esc(ctx, ui.sheetFormula ?? "")}" data-dtray-sheet-formula autocomplete="off" spellcheck="false" maxlength="120" placeholder="2d6+3" aria-describedby="dtray-sheet-formula-help"></label><button type="submit" class="button">${ctx.icon("dice")} ${ctx.t("Tira", "Roll")}</button></form><p class="muted dtray-hint" id="dtray-sheet-formula-help">${ctx.t("Es. 2d6+3, 4d6kh3, 1d20+5. Tiri salvezza e abilità: clic sul numero nell'elenco della scheda.", "E.g. 2d6+3, 4d6kh3, 1d20+5. Saving throws and skills: click the number in the sheet's list.")}</p>`
    : `<p class="muted">${ctx.t("Puoi vedere questi valori; tira chi gioca il personaggio.", "You can see these values; whoever plays the character rolls.")}</p>`
}
${last ? `<p class="dtray-sheet-last" data-dtray-sheet-last>${ctx.t("Ultimo tiro", "Last roll")}: <strong>${esc(ctx, titleOf(ctx, last))} = ${last.total}</strong>${last.dc !== null ? ` · ${esc(ctx, dcText(ctx, last.dc, last.dcBy))}: ${last.success ? ctx.t("successo", "success") : ctx.t("fallimento", "failure")}` : ""} <small class="muted">${esc(ctx, domain.breakdown({ ...last, readable: true }, ctx.lang))}${last.rerolls.length ? ` · ${ctx.t("Ispirazione eroica", "Heroic Inspiration")}: ${last.rerolls[0].from} → ${last.rerolls[0].to}` : ""}</small>${inspired ? ` <button type="button" class="button quiet" data-dtray-reroll="${esc(ctx, last.id)}">${ctx.t("Ripeti un dado · Ispirazione eroica", "Reroll a die · Heroic Inspiration")}</button>` : ""}</p>` : ""}
${canRoll ? `<p class="dtray-sheet-policy" data-dtray-sheet-policy-line><span>${ctx.t("Politica dei tiri", "Roll policy")}: <strong>${esc(ctx, policyText(ctx, policy))}</strong></span> <button type="button" class="button quiet" data-dtray-policy="${esc(ctx, actor.id)}" aria-haspopup="dialog">${ctx.icon("settings")} ${ctx.t("Cambia…", "Change…")}</button></p>` : ""}</section>`;
}
/** "Chiedi sempre · Io e il DM · danni automatici": a character's roll policy in words. */
function policyText(ctx, policy) {
  if (!policy.set) return ctx.t("come le tue preferenze", "as your preferences");
  const d20 = {
    normal: ctx.t("normale", "normal"),
    ask: ctx.t("chiedi sempre vantaggio o svantaggio", "always ask advantage or disadvantage"),
    advantage: ctx.t("sempre con vantaggio", "always with advantage"),
    disadvantage: ctx.t("sempre con svantaggio", "always with disadvantage"),
  }[policy.d20];
  return [
    d20,
    pick(domain.audienceName(policy.audience, ctx.role), ctx.lang),
    policy.autoDamage ? ctx.t("danni e critico automatici", "automatic damage and critical") : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
/** The character's roll policy (PG-48): one dialog from the sheet, the tray and the palette. */
export function openPolicyDialog(ctx, actorId) {
  const actor = ctx.state.actors?.[actorId];
  if (!actor || !domain.trayActors(ctx.state, ctx.role).some((a) => a.id === actorId)) {
    ctx.toast(
      ctx.t(
        "Scegli un personaggio che controlli per impostare la sua politica dei tiri.",
        "Choose a character you control to set its roll policy.",
      ),
      true,
    );
    return;
  }
  const policy = domain.policyOf(sliceOf(ctx), actorId);
  const option = (value, current, text) =>
    `<option value="${value}"${value === current ? " selected" : ""}>${esc(ctx, text)}</option>`;
  const audiences = domain
    .audiencesFor(ctx.role)
    .map((a) => option(a, policy.audience, pick(domain.audienceName(a, ctx.role), ctx.lang)))
    .join("");
  const body = `<div class="dtray-policy" data-dtray-policy-dialog><p class="muted">${ctx.t(`Vale per ogni tiro di ${actor.name}: elenco della scheda, preferiti, vassoio dei dadi e barra rapida. Un tiro con Maiusc/Ctrl o dal menu «…» sceglie da sé.`, `It applies to every roll of ${actor.name}: the sheet's list, favourites, the dice tray and the quick bar. A roll with Shift/Ctrl or from the “…” menu chooses for itself.`)}</p><label class="field">${ctx.t("Vantaggio e svantaggio", "Advantage and disadvantage")}<select name="d20">${option("normal", policy.d20, ctx.t("Tira subito, normale", "Roll at once, normally"))}${option("ask", policy.d20, ctx.t("Chiedi sempre vantaggio o svantaggio", "Always ask advantage or disadvantage"))}${option("advantage", policy.d20, ctx.t("Sempre con vantaggio", "Always with advantage"))}${option("disadvantage", policy.d20, ctx.t("Sempre con svantaggio", "Always with disadvantage"))}</select></label><label class="field">${ctx.t("Chi vede i tiri di questo personaggio", "Who sees this character's rolls")}<select name="audience">${audiences}</select></label><label class="check-field"><input type="checkbox" name="autoDamage"${policy.autoDamage ? " checked" : ""}> ${ctx.t("Critico automatico: tira i danni con l'attacco, dadi raddoppiati con un 20 naturale", "Automatic critical: roll damage with the attack, dice doubled on a natural 20")}</label><p class="muted dtray-hint">${ctx.t("Le condizioni (Avvelenato, Indebolimento…) si applicano comunque; vantaggio e svantaggio insieme si annullano (SRD 5.2.1 EN 7–8 / IT 8).", "Conditions (Poisoned, Exhaustion…) apply anyway; advantage and disadvantage together cancel out (SRD 5.2.1 EN 7–8 / IT 8).")}</p></div>`;
  ctx.dialog(ctx.t(`Politica dei tiri · ${actor.name}`, `Roll policy · ${actor.name}`), body, {
    submitLabel: ctx.t("Salva", "Save"),
    cancelLabel: ctx.t("Annulla", "Cancel"),
    onSubmit: (data) => {
      const input = {
        d20: String(data.get("d20") ?? "normal"),
        audience: String(data.get("audience") ?? "public"),
        autoDamage: data.get("autoDamage") === "on",
      };
      return (
        safe(ctx, () => {
          ctx.commit(
            ctx.t(`Politica dei tiri di ${actor.name}`, `${actor.name}'s roll policy`),
            (draft) => domain.setPolicy(area.slice(draft), draft, actorId, input, ctx.role),
            {
              undoable: false,
              visibility: "private",
              ...(actor.visibility === "private" ? { local: true } : {}),
            },
          );
          ctx.toast(ctx.t("Politica dei tiri salvata.", "Roll policy saved."));
          return true;
        }) ?? false
      );
    },
  });
}
function bindSheetSection(el, ctx) {
  closeMenu();
  bindInspiration(el, ctx);
  el.querySelectorAll("[data-dtray-reroll]").forEach((button) => {
    button.onclick = () => {
      const record = sliceOf(ctx).rolls.find((r) => r.id === button.dataset.dtrayReroll);
      if (record) openReroll(ctx, { record });
    };
  });
  el.querySelectorAll("[data-dtray-policy]").forEach((button) => {
    button.onclick = () => openPolicyDialog(ctx, button.dataset.dtrayPolicy);
  });
  const form = el.querySelector("[data-dtray-sheet-free]");
  const input = el.querySelector("[data-dtray-sheet-formula]");
  input?.addEventListener("input", () => (ui.sheetFormula = input.value));
  if (form)
    form.onsubmit = (event) => {
      event?.preventDefault?.();
      const actorId = form.dataset.dtraySheetFree;
      const formula = String(input?.value ?? ui.sheetFormula ?? "").trim();
      const raw = {
        kind: "free",
        formula,
        actorId: actorId || null,
        rollMode: "normal",
        audience: defaultAudience(ctx, actorId || null),
        mode: "digital",
      };
      // TV-95: a die type set to a connected die waits for it here too (resolver dialog).
      const plan = connectedPlan(ctx, raw);
      if (plan) {
        ui.sheetFormula = "";
        return waitForRoll(ctx, raw, plan, { where: "dialog" });
      }
      const record = safe(ctx, () => rollFromTray(ctx, raw));
      if (record) {
        ui.sheetFormula = "";
        toastRoll(ctx, record);
      }
    };
  applyFocus(el);
}

// ---------------------------------------------------------------- journal embeds (FVT-146)

function renderEmbed(ctx, ref) {
  const test = requests.parseRollRef(ref);
  if (!test) return null;
  const title =
    pick(domain.testTitle(test), ctx.lang) + (test.dc !== null ? ` · ${dcText(ctx, test.dc)}` : "");
  const groups = requests
    .requestGroups(ctx.state, sliceOf(ctx), ctx.role)
    .filter((g) => g.origin?.kind === "journal" && g.origin.ref === ref && !g.closed);
  const mine = domain
    .trayActors(ctx.state, ctx.role)
    .filter((a) => a.kind === "character" && a.owner === ctx.role);
  const rolled = sliceOf(ctx)
    .rolls.filter((r) => r.origin?.ref === ref && domain.canSeeResult(r, ctx.role, ctx.state))
    .map((r) => ({ name: r.actorName, total: r.total, success: r.success, dc: r.dc }));
  // Answers to the journal's request show here too (the request card's readable rows).
  const answered = groups.flatMap((g) =>
    g.rows
      .filter((r) => r.readable && r.status === "resolved")
      .map((r) => ({
        name: typeof r.name === "string" ? r.name : pick(r.name, ctx.lang),
        total: r.total,
        success: r.success,
        dc: r.dc,
      })),
  );
  const results = [...answered, ...rolled].slice(-3);
  return `<div class="dtray-embed" data-dtray-embed="${esc(ctx, ref)}"><span class="dtray-embed-icon" aria-hidden="true">${ctx.icon("dice")}</span><div class="dtray-embed-body"><strong>${esc(ctx, title)}</strong><small class="muted">${ctx.t("Tiro nel testo", "Roll in the text")}</small>${
    groups.length
      ? `<small data-dtray-embed-status>${ctx.t("Richiesta inviata", "Request sent")}: ${groups[0].summary.pending} ${ctx.t("in attesa", "pending")}, ${groups[0].summary.success} ${ctx.t("successi", "successes")}, ${groups[0].summary.failure} ${ctx.t("fallimenti", "failures")}</small>`
      : ""
  }${results.map((r) => `<small data-dtray-embed-result>${esc(ctx, r.name)}: ${r.total}${r.dc !== null ? ` · ${r.success ? ctx.t("successo", "success") : ctx.t("fallimento", "failure")}` : ""}</small>`).join("")}</div><div class="dtray-embed-actions">${
    runs(ctx)
      ? `<button type="button" class="button primary" data-dtray-embed-request>${ctx.icon("bell")} ${ctx.t("Chiedi il tiro…", "Request the roll…")}</button>`
      : mine
          .map(
            (a) =>
              `<button type="button" class="button${requests.openJournalRow(ctx.state, sliceOf(ctx), ref, a.id, ctx.role) ? " primary" : ""}" data-dtray-embed-roll="${esc(ctx, a.id)}">${ctx.icon("dice")} ${ctx.t("Tira", "Roll")}: ${esc(ctx, a.name)}${requests.openJournalRow(ctx.state, sliceOf(ctx), ref, a.id, ctx.role) ? ` · ${ctx.t("richiesto dal DM", "requested by the DM")}` : ""}</button>`,
          )
          .join("")
  }</div></div>`;
}
/**
 * A roll written in the journal text (dnd5e request enricher, FVT-146). When the DM asked
 * it from this text and the creature's roll is still open, the roll answers that request
 * (the card, the bell and «Tiri e risultati» update together, review P2-5); otherwise it
 * rolls in place, remembering the text it came from. The viewer's dice decide how.
 */
export function rollFromEmbed(ctx, ref, actorId) {
  const test = requests.parseRollRef(ref);
  if (!test) return null;
  const row = requests.openJournalRow(ctx.state, sliceOf(ctx), ref, actorId, ctx.role);
  if (!row) return rollNumber(ctx, { ...test, actorId, origin: { kind: "journal", ref } });
  if (row.knownValues)
    return safe(ctx, () => answerRequest(ctx, row.attemptId, row.requestId, { known: true }));
  if (requestPlan(ctx, row)) return answerWithConnected(ctx, row);
  if (savedDice(ctx) === "physical") return askRequestFaces(ctx, row);
  return safe(ctx, () => {
    answerRequest(ctx, row.attemptId, row.requestId);
    ctx.toast(requestToast(ctx, row.attemptId));
  });
}
function requestToast(ctx, attemptId) {
  const attempt = ctx.state.combatAttempts.find((a) => a.id === attemptId);
  const request = attempt?.requests[0];
  if (!request || request.status !== "resolved") return ctx.t("Tiro registrato.", "Roll recorded.");
  if (attempt.audience === "blind" && !runs(ctx))
    return ctx.t(
      "Tiro registrato: il risultato è solo per il DM.",
      "Roll recorded: the result is for the DM only.",
    );
  const verdict = Number.isInteger(request.dc)
    ? ` · ${request.total >= request.dc ? ctx.t("successo", "success") : ctx.t("fallimento", "failure")}`
    : "";
  return `${attempt.actorName} · ${pick(attempt.rollRequest?.title, ctx.lang)}: ${request.total}${verdict}`;
}
/** Physical faces for a request answered outside the tray card (the same checks). */
function askRequestFaces(ctx, row) {
  // Each die with its own sides and name: the d20s first, then a rider's dice
  // («d4 (Benedizione)», PG-47), as the combat engine reads them.
  const fields = row.dice.flatMap((g) =>
    Array.from({ length: g.count }, (_, i) => ({
      sides: g.sides,
      label: g.label ? pick(g.label, ctx.lang) : "",
      index: i,
      of: g.count,
    })),
  );
  const count = fields.length;
  const name = ctx.state.actors[row.actorId]?.name ?? "";
  ctx.dialog(
    ctx.t("Facce del dado fisico", "Physical die faces"),
    `<p><strong>${esc(ctx, name)} · ${esc(ctx, pick(domain.testTitle(row.test), ctx.lang))}${row.dcHidden ? ` · ${ctx.t("CD nascosta", "DC hidden")}` : row.dc !== null ? ` · ${ctx.t("CD", "DC")} ${row.dc}` : ""}</strong></p><div class="form-grid">${fields.map((f, i) => `<label class="field">d${f.sides}${f.of > 1 ? " " + (f.index + 1) : ""}${f.label ? ` (${esc(ctx, f.label)})` : ""}<input type="number" name="face-${i}" min="1" max="${f.sides}" step="1" inputmode="numeric" data-dtray-ask-face="${i}"></label>`).join("")}</div><p class="muted">${ctx.t("Richiesta del DM: il risultato va nella sua carta. Nessuna conseguenza automatica.", "DM request: the result goes to its card. No automatic consequence.")}</p>`,
    {
      submitLabel: ctx.t("Registra il tiro", "Record the roll"),
      onSubmit: (data) => {
        ui.requestFaces[row.requestId] = Array.from(
          { length: count },
          (_, i) => data.get(`face-${i}`) ?? "",
        );
        answerRequest(ctx, row.attemptId, row.requestId, { physical: true });
        ctx.toast(requestToast(ctx, row.attemptId));
      },
    },
  );
  globalThis.document?.querySelector('#dialog [data-dtray-ask-face="0"]')?.focus();
  return null;
}
function bindEmbed(el, ctx, ref) {
  const test = requests.parseRollRef(ref);
  if (!test) return;
  el.querySelectorAll("[data-dtray-embed-roll]").forEach((button) => {
    button.onclick = () => rollFromEmbed(ctx, ref, button.dataset.dtrayEmbedRoll);
  });
  el.querySelector("[data-dtray-embed-request]")?.addEventListener("click", () => {
    const actors = requests.requestableActors(ctx.state);
    const title =
      pick(domain.testTitle(test), ctx.lang) +
      (test.dc !== null ? ` · ${ctx.t("CD", "DC")} ${test.dc}` : "");
    ctx.dialog(
      `${ctx.t("Chiedi", "Request")}: ${title}`,
      `<p class="muted">${ctx.t("Diventa una carta di richiesta: chi gioca ogni creatura tira con dadi fisici o digitali. Nessuna conseguenza automatica.", "It becomes a request card: whoever plays each creature rolls with physical or digital dice. No automatic consequence.")}</p><fieldset class="dtray-fieldset"><legend>${ctx.t("A chi", "To whom")}</legend>${actors.map((a) => `<label class="check-field"><input type="checkbox" name="actor" value="${esc(ctx, a.id)}" ${a.kind === "character" ? "checked" : ""}> ${esc(ctx, a.name)}</label>`).join("")}</fieldset><label class="field">${ctx.t("Modalità", "Mode")}<select name="rollMode"><option value="normal">${ctx.t("Normale", "Normal")}</option><option value="advantage">${ctx.t("Vantaggio", "Advantage")}</option><option value="disadvantage">${ctx.t("Svantaggio", "Disadvantage")}</option></select></label>${requestAudienceField(ctx, "public", 'name="audience"')}`,
      {
        submitLabel: ctx.t("Invia la richiesta", "Send the request"),
        onSubmit: (data) => {
          const input = {
            ...test,
            rollMode: data.get("rollMode"),
            actorIds: data.getAll("actor"),
            audience: data.get("audience") === "blind" ? "blind" : "public",
          };
          // Close review 01/10 (privacy P2-4, P1-3): the tray's own rule, so the line names
          // the DC as players may read it and only the creatures they see, as a card.
          commitRequest(ctx, input, { kind: "journal", ref });
          ctx.toast(
            ctx.t(
              "Richiesta inviata: la trovano nella campanella e al Tavolo › Dadi › Richieste.",
              "Request sent: it is in the bell and at Table › Dice › Requests.",
            ),
          );
        },
      },
    );
  });
}

// ---------------------------------------------------------------- spell effects (TV-125)

// TV-125 (Automated Animations): every spell with a target or an area plays an effect on the
// map, coloured by its damage type: a projectile to each target (darts for Magic Missile),
// a cone from the caster, a burst on an area's point; a spell cast outside combat, from the
// sheet, glows on the caster. The personal toggle and Reduced motion turn them off.
const FX_TYPES = new Set([
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder",
]);
const fx = { items: [], casts: new Set() };
const fxAllowed = (ctx) => setting(ctx, `${ID}.spell-fx`, true) !== false && !motionReduced(ctx);
// A combat action names its spell by slug ("fire-bolt"); a sheet cast by its entry id.
function spellOf(id) {
  if (!id) return null;
  return SPELLS.find((spell) => spell.id === id || spell.slug === id) ?? null;
}
function fxType(type, spell) {
  const value = type ?? spell?.damage?.[0]?.types?.[0] ?? null;
  return FX_TYPES.has(value) ? value : "arcane";
}
function queueSpellFx(ctx, roll) {
  if (roll?.source !== "combat") return;
  const attempt = (ctx.state.combatAttempts ?? []).find((a) => a.id === roll.attemptId);
  const spell = attempt ? spellOf(attempt.actionId) : null;
  if (!spell || fx.items.some((f) => f.attemptId === attempt.id)) return;
  if (!fxAllowed(ctx)) return;
  const scene = ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId);
  const seen = (t) =>
    Boolean(t) &&
    (ctx.role === "dm" ||
      (!ctx.state.actors[t.actorId]?.hidden && !t.hidden && t.visible !== false));
  const from = scene?.tokens.find((t) => t.actorId === attempt.actorId);
  if (!seen(from)) return;
  const targets = (
    attempt.selection?.targetIds?.length
      ? attempt.selection.targetIds
      : attempt.targets.map((t) => t.actorId)
  )
    .map((id) => scene.tokens.find((t) => t.actorId === id))
    // Only tokens this viewer sees on the map (a hidden creature never gets an effect).
    .filter(seen);
  const point =
    attempt.selection?.point ?? (targets[0] ? { x: targets[0].x, y: targets[0].y } : null);
  if (!point) return;
  const shape = attempt.geometry?.shape ?? (attempt.geometry ? "sphere" : null);
  const kind =
    shape === "cone"
      ? "cone"
      : shape
        ? "burst"
        : attempt.actionId === "magic-missile"
          ? "darts"
          : "bolt";
  fx.items.push({
    attemptId: attempt.id,
    sceneId: scene.id,
    kind,
    type: fxType(attempt.damageType, spell),
    from: { x: from.x, y: from.y },
    to: targets.length ? targets.map((t) => ({ x: t.x, y: t.y })) : [point],
    point,
    at: Date.now(),
  });
}
/** A spell cast from the sheet outside combat (B39 casts): a glow on the caster's token. */
function queueCastFx(ctx) {
  const casts = ctx.state.ext?.["spells-plus"]?.casts ?? [];
  const cast = casts.at(-1);
  if (!cast || fx.casts.has(cast.id)) return;
  fx.casts.add(cast.id);
  const fresh = Date.now() - new Date(cast.at).getTime() < 3000;
  if (!fresh || !fxAllowed(ctx) || ctx.state.combat?.active) return;
  if (cast.private && cast.owner !== ctx.role) return;
  const scene = ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId);
  const token = scene?.tokens.find((t) => t.actorId === cast.actorId);
  if (!token || (ctx.role !== "dm" && (token.hidden || token.visible === false))) return;
  const spell = spellOf(cast.entryId);
  fx.items.push({
    attemptId: `cast:${cast.id}`,
    sceneId: scene.id,
    kind: "glow",
    type: fxType(null, spell),
    from: { x: token.x, y: token.y },
    to: [{ x: token.x, y: token.y }],
    point: { x: token.x, y: token.y },
    at: Date.now(),
  });
  ctx.render?.();
}
function renderFx(ctx, tableView) {
  const live = fx.items.filter(
    (f) => Date.now() - f.at < 1800 && f.sceneId === tableView?.scene?.id,
  );
  fx.items = live;
  if (!live.length) return "";
  return `<g class="dtray-fx" data-dtray-fx aria-hidden="true">${live
    .map((f) => {
      const type = `dtray-fx-type-${f.type ?? "arcane"}`;
      if (f.kind === "cone") {
        const angle = Math.atan2(f.point.y - f.from.y, f.point.x - f.from.x);
        const r = 110;
        const a1 = angle - 0.5;
        const a2 = angle + 0.5;
        return `<path class="dtray-fx-cone ${type}" data-dtray-fx-kind="cone" d="M${f.from.x} ${f.from.y} L${f.from.x + r * Math.cos(a1)} ${f.from.y + r * Math.sin(a1)} A${r} ${r} 0 0 1 ${f.from.x + r * Math.cos(a2)} ${f.from.y + r * Math.sin(a2)} Z"/>`;
      }
      if (f.kind === "burst" || f.kind === "glow")
        return `<circle class="dtray-fx-${f.kind} ${type}" data-dtray-fx-kind="${f.kind}" cx="${f.point.x}" cy="${f.point.y}" r="${f.kind === "glow" ? 36 : 70}"/>`;
      return f.to
        .map(
          (to, i) =>
            `<line class="dtray-fx-${f.kind} ${type}" data-dtray-fx-kind="${f.kind}" style="--dtray-fx-i:${i}" x1="${f.from.x}" y1="${f.from.y}" x2="${to.x}" y2="${to.y}"/>`,
        )
        .join("");
    })
    .join("")}</g>`;
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  area = registry;
  registry.registerStateSlice(ID, {
    version: 1,
    // Accepted faces are evidence (as B56): gameplay Undo never removes a tray roll; its
    // own Withdraw and Correct keep a reason. Requests live in the core queue instead.
    undo: "preserve",
    seed: domain.seedSlice,
    normalize: domain.normalizeSlice,
  });
  registry.registerStyles(new URL("./dice.css", import.meta.url));
  registry.add("settings", {
    id: ID,
    label: L("Tiri e dadi", "Rolls and dice"),
    description: L(
      "Politica dei tiri, destinatari predefiniti e aspetto dei dadi.",
      "Roll policy, default audience and dice look.",
    ),
    scope: "personal",
    fields: [
      {
        id: "advantage",
        label: L("Vantaggio sui numeri della scheda", "Advantage on sheet numbers"),
        type: "choice",
        default: "normal",
        options: [
          { value: "normal", label: L("Tira subito, normale", "Roll at once, normally") },
          { value: "ask", label: L("Chiedi sempre", "Always ask") },
          { value: "advantage", label: L("Sempre con vantaggio", "Always with advantage") },
          {
            value: "disadvantage",
            label: L("Sempre con svantaggio", "Always with disadvantage"),
          },
        ],
      },
      {
        id: "dice",
        label: L("Dadi per i tiri sul posto", "Dice for rolls in place"),
        type: "choice",
        default: "digital",
        options: [
          { value: "digital", label: L("Digitali", "Digital") },
          {
            value: "physical",
            label: L("Fisici: chiedi le facce", "Physical: ask the faces"),
          },
        ],
      },
      {
        id: "audience",
        label: L("Chi vede i tuoi tiri di solito", "Who usually sees your rolls"),
        type: "choice",
        default: "public",
        options: domain.AUDIENCES.map((a) => ({ value: a, label: domain.AUDIENCE_NAMES[a] })),
      },
      {
        id: "style",
        label: L("Senza dadi 3D", "Without 3D dice"),
        type: "choice",
        default: "2d",
        options: [
          { value: "2d", label: L("Dadi 2D leggeri, solo per me", "Light 2D dice, only for me") },
          { value: "off", label: L("Nessuna animazione", "No animation") },
        ],
      },
      {
        id: "spell-fx",
        label: L("Effetti visivi degli incantesimi", "Spell visual effects"),
        type: "boolean",
        default: true,
      },
    ],
  });
  registry.add("settings", {
    id: `${ID}-campaign`,
    label: L("Tiri nascosti", "Hidden rolls"),
    scope: "campaign",
    roles: ["dm"],
    fields: [
      {
        id: "announce",
        label: L(
          "Annuncia ai giocatori i tiri nascosti, senza risultato",
          "Announce hidden rolls to players, without the result",
        ),
        type: "boolean",
        default: true,
      },
      {
        id: "karmic",
        label: L(
          "Dadi karmici (come BG3): dopo due d20 digitali da 1 a 5 di fila, un giocatore ritira il terzo se è ancora da 1 a 5",
          "Karmic dice (like BG3): after two digital d20s of 1 to 5 in a row, a player rerolls the third if it is 1 to 5 again",
        ),
        type: "boolean",
        default: false,
      },
    ],
  });
  registry.add("table-panel", {
    id: ID,
    section: "chat",
    label: L("Dadi", "Dice"),
    placement: "sidebar-tab",
    icon: "dice",
    order: 90,
    render: (ctx, tableView) => renderTray(ctx, tableView),
    bind: (el, ctx) => bindTray(el, ctx),
  });
  registry.add("sheet-section", {
    id: `${ID}-sheet`,
    tab: "actions",
    label: L("Tiri", "Rolls"),
    order: 30,
    when: (ctx, actor) =>
      Boolean(actor) && actor.kind === "character" && canViewActor(actor, ctx.role, ctx.state),
    render: (ctx, actor) => renderSheetSection(ctx, actor),
    bind: (el, ctx) => bindSheetSection(el, ctx),
  });
  // PG-48: the roll policy is found by what people search (Roll20 "Manage Sheet", Beyond20
  // "Type of Roll"): the description carries the synonyms the palette matches.
  // Final review F16 (Foundry's roll request and GM roll mode, Roll20's /gmroll): the DM finds
  // «Chiedi un tiro» and the secret roll by what they type, and beside the chat field.
  // TV-156 (BG3 «Karmic Dice»): the campaign choice is found by its name.
  registry.add("command", {
    id: `${ID}.karmic`,
    label: L("Dadi karmici (impostazione della campagna)", "Karmic dice (campaign setting)"),
    description: L(
      "Dadi karmici come BG3: spenti di serie; li accende o spegne il DM",
      "Karmic dice like BG3: off by default; the DM turns them on or off",
    ),
    keywords: [L("dadi karmici", "karmic dice"), L("sfortuna", "bad luck")],
    group: "dice",
    context: "table",
    roles: ["dm"],
    run: (ctx) => openTraySection(ctx, "look", "[data-dtray-karmic]"),
  });
  registry.add("command", {
    id: `${ID}.request`,
    label: L("Chiedi un tiro ai giocatori…", "Ask the players for a roll…"),
    description: L(
      "Richiesta di prova, tiro salvezza o abilità con CD, a uno o a tutti, anche segreta.",
      "Request a check, saving throw or skill roll with a DC, to one or all, secret too.",
    ),
    keywords: [
      L("richiesta di tiro", "roll request"),
      L("chiedi un tiro", "request a roll"),
      L("prova contrapposta", "contested check"),
      L("prova segreta ai giocatori", "secret check for players"),
      L("tiro salvezza di gruppo", "group saving throw"),
      L("prova di gruppo", "group check"),
    ],
    group: "dice",
    context: "table",
    roles: ["dm"],
    run: (ctx) => openTraySection(ctx, "requests", "#dtray-request-title"),
  });
  registry.add("command", {
    id: `${ID}.secret`,
    label: L("Tiro segreto (solo DM)", "Secret roll (DM only)"),
    description: L(
      "Tira di nascosto dietro lo schermo: il risultato lo vedi solo tu.",
      "Roll in secret behind the screen: only you see the result.",
    ),
    keywords: [
      L("segreto", "secret"),
      L("tiro nascosto", "hidden roll"),
      L("di nascosto", "blind roll"),
      L("dietro lo schermo", "behind the screen"),
      L("gmroll", "gmroll"),
    ],
    group: "dice",
    context: "table",
    roles: ["dm"],
    run: (ctx) => openTraySection(ctx, "roll", "[data-dtray-roll-button]", { audience: "self" }),
  });
  registry.add("command", {
    id: `${ID}.policy`,
    label: L("Politica dei tiri del personaggio…", "Character roll policy…"),
    description: L(
      "Vantaggio o svantaggio sempre, chiedi ogni volta, tiro nascosto o sussurrato al DM, chi vede i tiri, critico e danni automatici, tipo di tiro.",
      "Always advantage or disadvantage, ask every time, hidden or whispered roll to the DM, who sees rolls, automatic critical and damage, type of roll.",
    ),
    group: "dice",
    run: (ctx) =>
      openPolicyDialog(
        ctx,
        (ctx.view?.page === "characters" && ctx.view?.id) ||
          ui.actorId ||
          domain.defaultActor(ctx.state, ctx.role, null),
      ),
  });
  // TV-95: connected dice are found by what a Pixels owner types (Pixels, Bluetooth, smart
  // dice), as the policy above.
  registry.add("command", {
    id: `${ID}.connected`,
    label: L("Dadi connessi (Pixels, Bluetooth)…", "Connected dice (Pixels, Bluetooth)…"),
    description: L(
      "Cerca e collega dadi smart come i Pixels, batteria, fai lampeggiare, scollega, e come tiri ogni dado (simulazione).",
      "Find and pair smart dice such as Pixels, battery, blink, disconnect, and how you roll each die (simulation).",
    ),
    keywords: [
      "pixels",
      "bluetooth",
      L("dadi connessi", "connected dice"),
      L("dadi smart", "smart dice"),
      L("dado elettronico", "electronic die"),
      L("collega dado", "pair die"),
      L("dadi fisici", "physical dice"),
      L("configura dadi", "configure dice"),
    ],
    group: "dice",
    run: (ctx) => openConnectedDice(ctx),
  });
  registry.add("map-layer", {
    id: `${ID}-fx`,
    label: L("Effetti degli incantesimi", "Spell effects"),
    order: 65,
    svg: (ctx, tableView) => renderFx(ctx, tableView),
  });
  registry.on("roll-accepted", (payload, { ctx }) => {
    if (!ctx || payload?.correction) return;
    queueSpellFx(ctx, payload?.roll);
  });
  registry.on("commit", (payload, { ctx }) => {
    if (ctx && !payload?.correction) queueCastFx(ctx);
  });
  registry.on("chat:roll-action", (payload, { ctx }) => {
    if (!ctx) return;
    if (payload?.action === "request")
      return safe(ctx, () => rollRequestFromCard(ctx, payload?.id));
    runRollAction(ctx, payload?.id, payload?.action);
  });
  registry.on("dice-tray:prefill", (payload, { ctx }) => {
    const formula = String(payload?.formula ?? "");
    try {
      domain.parseFormula(formula);
    } catch {
      return;
    }
    if (ctx && ui.role !== ctx.role) {
      resetTrayUI(ctx.role);
      ui.role = ctx.role;
    }
    Object.assign(ui, {
      section: "roll",
      formula,
      rollMode: "normal",
      error: "",
      faces: [],
      extra: [],
    });
    if (payload?.actorId) ui.actorId = payload.actorId;
    ui.focus = "[data-dtray-formula]";
  });
  registry.on("role-changed", () => {
    closeMenu();
    resetTrayUI();
  });
  registry.on("reset", () => {
    closeMenu();
    resetTrayUI();
    fx.items = [];
    fx.casts.clear();
  });
  registerTextEmbed({
    id: `${ID}-roll`,
    accepts: (ref) => Boolean(requests.parseRollRef(ref)),
    render: (ctx, ref) => renderEmbed(ctx, ref),
    bind: (el, ctx, ref) => bindEmbed(el, ctx, ref),
  });
}
