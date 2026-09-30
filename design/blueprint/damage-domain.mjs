// B33 — damage, healing and the HP log: pure domain (no DOM).
//
// Every HP change goes through the conditions domain (increment 10): the tray applies an
// assisted combat outcome with `applyReadyOutcome` (which calls `applyVitalityEvent`), the
// HP widget, proposals, reverts and reapplications use `applyVitalityChange`. Nothing here
// writes `actor.hp`. This module owns only its slice `state.ext["damage-tray"]`: DM-recorded
// damage defenses, the details of manual entries, reverts, reapplications, maximum-HP
// modifiers with their notes and the players' proposals.
//
// Rules (SRD 5.2.1, official PDFs, printed pages): Bloodied EN 16 + 177 / IT 18 + 214; half
// damage on a successful save EN 16 / IT 18; Resistance, Vulnerability, No Stacking, Order
// of Application and Immunity EN 17 / IT 19; healing cap EN 17 / IT 19; Temporary Hit
// Points EN 18 / IT 20. Patterns (market census): dnd5e damage application tray with
// defense chips and multipliers (FVT-139); Shieldmaiden hit/half/double and typed damage
// with automatic defenses (CMP-172, CMP-173); D&D Beyond HP widget identical on sheet,
// token and tracker (DDB-032, DDB-142); Improved Initiative player suggestions (VTL-129,
// CMP-163); Foundry Damage Log targeted undo and reapply (FVT-144); D&D Beyond Bloodied
// and Dead visuals hidden from players in Settings (DDB-143).
import * as srd from "./srd-sample.mjs";
import { getEntry } from "./srd-compendium.mjs";
import {
  previewVitalityChange,
  applyVitalityChange,
  previewConditionChange,
  applyConditionChange,
  getConditionHistory,
  canReadVitals,
  hasCondition,
  listConditionDefinitions,
} from "./conditions.mjs";
import { applyReadyOutcome, applyConditionFollowUps, projectAttempts } from "./combat.mjs";
import { canControlActor, isCampaignActor, isActorAvailable } from "./character-access.mjs";

export const ID = "damage-tray";
export const VERSION = 1;
const L = (it, en) => ({ it, en });
const copy = (value) => (value === undefined ? undefined : structuredClone(value));
const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const int = (value) => Number.isSafeInteger(value);
const nowIso = () => new Date().toISOString();
export const newId = (prefix = "dt") =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`;

// ---------------------------------------------------------------- sources and constants

export const SOURCES = Object.freeze({
  defenses: srd.srdSource([17], [19]),
  halfDamage: srd.srdSource([16], [18]),
  bloodied: srd.srdSource([16, 177], [18, 214]),
  tempHp: srd.srdSource([18], [20]),
  healing: srd.srdSource([17], [19]),
  damageTypes: srd.LABEL_SOURCES.damageType,
});
/** The app command that records a change typed at the table (widget, tray, proposal). */
export const APP_SOURCE = Object.freeze({
  kind: "manual",
  edition: "2024",
  revision: "damage-tray-1",
  title: L("Registrazione dal widget dei punti ferita", "Record from the hit point widget"),
});
export const DAMAGE_TYPES = Object.freeze(Object.keys(srd.LABELS.damageType));
export const typeLabel = (type) => srd.LABELS.damageType[type] ?? L(type, type);
/** dnd5e tray multipliers (FVT-139); ×0 also covers Shieldmaiden's "no damage". */
export const MULTIPLIERS = Object.freeze([0, 0.25, 0.5, 1, 2]);
export const multiplierText = (m) => ({ 0: "×0", 0.25: "×¼", 0.5: "×½", 1: "×1", 2: "×2" })[m];
export const MAX_NOTE = 200;
export const MAX_AMOUNT = 9999;
export const SETTINGS_ID = "damage-tray-policy";
export const SETTING_KEYS = Object.freeze({
  tokenStates: "damage-tray-policy.token-states",
  suggestions: "damage-tray-policy.suggestions",
});
const DEFENSE_KINDS = Object.freeze(["immunity", "resistance", "vulnerability"]);
export const DEFENSE_LABEL = Object.freeze({
  immunity: L("Immunità", "Immunity"),
  resistance: L("Resistenza", "Resistance"),
  vulnerability: L("Vulnerabilità", "Vulnerability"),
});

/** A refusal shown as a message: a plain Error with its Italian and English text. */
export function refuse(it, en, code = "refused") {
  throw Object.assign(new Error(en), { it, en, code });
}

// ---------------------------------------------------------------- slice

export function seedSlice() {
  return {
    defenses: {},
    manual: {},
    reverts: {},
    revertOf: {},
    reapplied: {},
    maxMods: {},
    proposals: [],
  };
}
const record = (value) => (isObject(value) ? value : {});
export function normalizeSlice(value, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw new Error("Future damage-tray version");
  const seed = seedSlice();
  if (!isObject(value)) return seed;
  const lists = (entry) =>
    Object.fromEntries(
      ["resistances", "vulnerabilities", "immunities"].map((key) => [
        key,
        (Array.isArray(entry?.[key]) ? entry[key] : []).filter((t) => DAMAGE_TYPES.includes(t)),
      ]),
    );
  return {
    defenses: Object.fromEntries(
      Object.entries(record(value.defenses))
        .filter(([, entry]) => isObject(entry))
        .map(([id, entry]) => [
          id,
          {
            ...lists(entry),
            note: String(entry.note ?? "").slice(0, MAX_NOTE),
            by: entry.by ?? null,
            at: entry.at ?? null,
          },
        ]),
    ),
    manual: Object.fromEntries(Object.entries(record(value.manual)).filter(([, v]) => isObject(v))),
    reverts: Object.fromEntries(
      Object.entries(record(value.reverts)).filter(([, v]) => isObject(v)),
    ),
    revertOf: Object.fromEntries(
      Object.entries(record(value.revertOf)).filter(([, v]) => typeof v === "string"),
    ),
    reapplied: Object.fromEntries(
      Object.entries(record(value.reapplied)).filter(([, v]) => isObject(v)),
    ),
    maxMods: Object.fromEntries(
      Object.entries(record(value.maxMods))
        .filter(([, v]) => Array.isArray(v))
        .map(([id, list]) => [
          id,
          list.filter((m) => isObject(m) && int(m.delta) && typeof m.id === "string"),
        ]),
    ),
    proposals: (Array.isArray(value.proposals) ? value.proposals : []).filter(
      (p) => isObject(p) && typeof p.id === "string" && typeof p.actorId === "string",
    ),
  };
}
export const sliceOf = (state) => state?.ext?.[ID] ?? null;
// The live slice inside a draft (never replaced, so references taken earlier stay valid).
function mutableSlice(state) {
  state.ext ??= {};
  if (!isObject(state.ext[ID])) state.ext[ID] = seedSlice();
  const slice = state.ext[ID];
  for (const [key, value] of Object.entries(seedSlice()))
    if (slice[key] === undefined) slice[key] = value;
  return slice;
}
const pick = (value, lang) => (lang === "en" ? value.en : value.it);

// ---------------------------------------------------------------- defenses

const PETRIFIED_SOURCE = () =>
  listConditionDefinitions().find((row) => row.id === "petrified")?.source ?? null;
const typeList = (value) =>
  (Array.isArray(value) ? value : []).filter((type) => DAMAGE_TYPES.includes(type));
/**
 * The damage defenses in effect for a creature, with where they come from: the DM's own
 * record (dnd5e actor traits), the defenses the encounter builder copied onto the NPC, or
 * the SRD stat block linked from the compendium. Petrified adds Resistance to all damage.
 * `origin: "none"` means nothing is recorded: the tray says so instead of guessing.
 */
export function defensesOf(state, actorId) {
  const actor = state?.actors?.[actorId];
  const out = {
    resistances: [],
    vulnerabilities: [],
    immunities: [],
    origin: "none",
    source: null,
    note: "",
    blockName: null,
    allResistance: null,
  };
  if (!actor) return out;
  const recorded = sliceOf(state)?.defenses?.[actorId];
  if (recorded) {
    Object.assign(out, {
      resistances: typeList(recorded.resistances),
      vulnerabilities: typeList(recorded.vulnerabilities),
      immunities: typeList(recorded.immunities),
      origin: "recorded",
      source: { kind: "dm-record", revision: recorded.at ?? "unknown" },
      note: recorded.note ?? "",
    });
  } else if (isObject(actor.damageDefenses)) {
    Object.assign(out, {
      resistances: typeList(actor.damageDefenses.resistances),
      vulnerabilities: typeList(actor.damageDefenses.vulnerabilities),
      immunities: typeList(actor.damageDefenses.immunities),
      origin: "actor",
      source: copy(actor.provenance ?? null),
    });
  } else {
    const ref = actor.compendiumRef?.id ?? actor.encounterBlock?.creatureId;
    const block = ref ? getEntry(ref) : null;
    if (block?.kind === "creature")
      Object.assign(out, {
        resistances: typeList(block.resistances),
        vulnerabilities: typeList(block.vulnerabilities),
        immunities: typeList(block.immunities),
        origin: "block",
        source: copy(block.source),
        blockName: copy(block.name),
      });
  }
  if (hasCondition(actor, "petrified")) out.allResistance = { source: PETRIFIED_SOURCE() };
  return out;
}
export const hasAnyDefense = (d) =>
  d.resistances.length + d.vulnerabilities.length + d.immunities.length > 0 || !!d.allResistance;

/** The chips of one damage type: immunity, one resistance (no stacking), vulnerability. */
export function chipsFor(defenses, type) {
  if (!type || !DAMAGE_TYPES.includes(type)) return [];
  const chips = [];
  if (defenses.immunities.includes(type))
    chips.push({ kind: "immunity", type, source: defenses.source });
  if (defenses.resistances.includes(type) || defenses.allResistance)
    chips.push({
      kind: "resistance",
      type,
      all: !defenses.resistances.includes(type),
      source: defenses.resistances.includes(type)
        ? defenses.source
        : (defenses.allResistance?.source ?? null),
    });
  if (defenses.vulnerabilities.includes(type))
    chips.push({ kind: "vulnerability", type, source: defenses.source });
  return chips;
}

// ---------------------------------------------------------------- adjustment

/** Validates a tray decision against the chips; a downgrade needs its reason. */
export function checkDecision(decision, chips) {
  const d = decision ?? {};
  if (d.multiplier !== undefined && !MULTIPLIERS.includes(d.multiplier))
    refuse("Moltiplicatore non valido.", "Invalid multiplier.", "multiplier");
  for (const kind of d.off ?? [])
    if (!DEFENSE_KINDS.includes(kind)) refuse("Difesa non valida.", "Invalid defense.", "defense");
  if (d.downgrade) {
    if (!chips.some((c) => c.kind === "immunity"))
      refuse(
        "Non c’è un’immunità da declassare.",
        "There is no immunity to downgrade.",
        "downgrade",
      );
    const reason = String(d.downgrade.reason ?? "").trim();
    if (!reason)
      refuse(
        "Scrivi il motivo per cui declassi l’immunità a resistenza.",
        "Write why you downgrade the immunity to resistance.",
        "downgrade-reason",
      );
    if (reason.length > MAX_NOTE)
      refuse("Motivo troppo lungo.", "Reason too long.", "downgrade-reason");
  }
}
function applySteps(value, active, multiplier) {
  // Order of application (SRD EN 17 / IT 19): adjustments such as multipliers first, then
  // Resistance (halved, round down), then Vulnerability (doubled). Immunity: no damage.
  let out = multiplier === 1 ? value : Math.floor(value * multiplier);
  if (active.immunity) return 0;
  if (active.resistance) out = Math.floor(out / 2);
  if (active.vulnerability) out *= 2;
  return out;
}
/**
 * The damage after a decision: `multiplier` (default ×1), `off` (defenses the DM turns off,
 * dnd5e chips) and `downgrade` (an immunity treated as a resistance, with its reason).
 * Magic Missile darts are separate instances and are adjusted one by one.
 */
export function adjustDamage(base, chips, decision = {}, { darts = null } = {}) {
  const multiplier = MULTIPLIERS.includes(decision.multiplier) ? decision.multiplier : 1;
  const off = new Set(decision.off ?? []);
  const has = (kind) => chips.some((c) => c.kind === kind) && !off.has(kind);
  const downgraded = !!decision.downgrade && has("immunity");
  const active = {
    immunity: has("immunity") && !downgraded,
    resistance: has("resistance") || downgraded,
    vulnerability: has("vulnerability"),
  };
  const parts =
    Array.isArray(darts) && darts.length
      ? darts.map((dart) => ({ ...copy(dart), total: applySteps(dart.total, active, multiplier) }))
      : null;
  const amount = parts
    ? parts.reduce((sum, dart) => sum + dart.total, 0)
    : applySteps(Math.max(0, base), active, multiplier);
  const steps = [{ kind: "base", value: base }];
  let running = base;
  if (multiplier !== 1) {
    running = Math.floor(running * multiplier);
    steps.push({ kind: "multiplier", factor: multiplier, value: running });
  }
  if (active.immunity) steps.push({ kind: "immunity", value: 0 });
  else {
    if (active.resistance) {
      running = Math.floor(running / 2);
      steps.push({ kind: downgraded ? "downgrade" : "resistance", value: running });
    }
    if (active.vulnerability) {
      running *= 2;
      steps.push({ kind: "vulnerability", value: running });
    }
  }
  return { amount, active, multiplier, downgraded, darts: parts, steps, perDart: !!parts };
}
/** What is stored with the applied damage: enough to explain and audit it later. */
export function adjustmentRecord(type, base, adjusted, chips, decision = {}, extra = {}) {
  return {
    type,
    base,
    amount: adjusted.amount,
    multiplier: adjusted.multiplier,
    applied: DEFENSE_KINDS.filter((kind) => adjusted.active[kind]),
    off: [...(decision.off ?? [])].filter((kind) => chips.some((c) => c.kind === kind)),
    downgrade: adjusted.downgraded ? { reason: String(decision.downgrade.reason).trim() } : null,
    chips: chips.map((c) => ({ kind: c.kind, all: c.all === true })),
    perDart: adjusted.perDart,
    automatic: extra.automatic === true,
  };
}
/**
 * The combat seam (`adjustDamageWith` in combat.mjs): damage applied without a tray
 * decision (automatic campaigns, a plain Apply) gets the target's defenses, as in
 * Shieldmaiden (CMP-173) and Midi-QOL. No defense for the type: null, damage as rolled.
 */
export function automaticAdjust(state, attempt, outcome, damage, extra = {}) {
  const type = attempt?.damageType;
  if (!type || !outcome?.actorId) return null;
  const chips = chipsFor(defensesOf(state, outcome.actorId), type);
  if (!chips.length) return null;
  const adjusted = adjustDamage(damage, chips, {}, { darts: extra?.darts });
  return {
    amount: adjusted.amount,
    darts: adjusted.darts,
    adjustment: adjustmentRecord(type, damage, adjusted, chips, {}, { automatic: true }),
  };
}

// ---------------------------------------------------------------- health states

/** Bloodied is half the Hit Points or fewer (SRD EN 16 / IT 18); 0 HP; Dead. */
export function healthState(actor) {
  if (!actor) return null;
  if (actor.dead === true) return "dead";
  const hp = actor.hp,
    max = actor.maxHp;
  if (!int(hp) || !int(max) || max <= 0) return null;
  if (hp <= 0) return "down";
  return hp <= max / 2 ? "bloodied" : null;
}
export const HEALTH_LABEL = Object.freeze({
  bloodied: L("Sanguinante", "Bloodied"),
  down: L("A 0 PF", "At 0 HP"),
  dead: L("Morto", "Dead"),
});
/**
 * Whether a viewer sees a creature's Bloodied/Dead visual (DDB-143): the DM always; whoever
 * reads the sheet (own and party characters) always; for the DM's creatures only while the
 * campaign shows them to players and the enemy-health rule does not hide health.
 */
export function showsHealthState(
  state,
  actor,
  viewer,
  { tokenStates = true, enemyHp = "words" } = {},
) {
  if (!actor) return false;
  if (viewer === "dm" || canReadVitals(state, actor, viewer)) return true;
  return tokenStates === true && enemyHp !== "hidden";
}

// ---------------------------------------------------------------- vitality commands

function errorOf(issue) {
  return Object.assign(new Error(issue?.en ?? "Unavailable"), {
    it: issue?.it ?? "Non disponibile.",
    en: issue?.en ?? "Unavailable.",
    code: issue?.code ?? "unavailable",
  });
}
/** Commit scope of a change to this creature: local and private for a personal sheet. */
export function commitScope(state, actorId, viewer) {
  const actor = state?.actors?.[actorId];
  if (!actor) return { local: false, visibility: "shared" };
  const personal =
    actor.visibility === "private" ||
    (Array.isArray(actor.campaignIds) && actor.campaignIds.length === 0);
  return personal ? { local: true, visibility: "private" } : { local: false, visibility: "shared" };
}
export const commitOptions = (scope) =>
  scope.local
    ? { local: true, visibility: "private" }
    : scope.visibility === "private"
      ? { visibility: "private" }
      : {};

function runVitality(state, actorId, selection, viewer, { online = true, operationId } = {}) {
  const preview = previewVitalityChange(state, actorId, selection, viewer);
  if (!preview.canApply) throw errorOf(preview.errors[0]);
  const result = applyVitalityChange(state, actorId, selection, viewer, {
    operationId,
    reviewKey: preview.reviewKey,
    online,
  });
  applyConditionFollowUps(state, result, { manual: true });
  return result;
}
function canManage(state, actorId, viewer) {
  const actor = state?.actors?.[actorId];
  return (
    !!actor &&
    isActorAvailable(actor) &&
    canReadVitals(state, actor, viewer) &&
    canControlActor(actor, viewer, state)
  );
}
function requireManage(state, actorId, viewer) {
  if (!canManage(state, actorId, viewer))
    refuse(
      "Non puoi cambiare i punti ferita di questa creatura.",
      "You cannot change this creature’s hit points.",
      "permission",
    );
  return state.actors[actorId];
}
function amountOf(value) {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (!int(n) || n < 1 || n > MAX_AMOUNT)
    refuse(
      `Scrivi un numero intero da 1 a ${MAX_AMOUNT}.`,
      `Enter a whole number from 1 to ${MAX_AMOUNT}.`,
      "amount",
    );
  return n;
}
const noteOf = (value) => {
  const note = String(value ?? "").trim();
  if (note.length > MAX_NOTE) refuse("Nota troppo lunga.", "Note too long.", "note");
  return note;
};
const SURFACE = {
  sheet: L("scheda", "sheet"),
  token: L("pedina", "token"),
  tracker: L("tracker", "tracker"),
  proposal: L("proposta", "proposal"),
  log: L("registro PF", "HP log"),
};
/** Short reason text for the ledger (both languages: the ledger keeps one string). */
function reasonText(parts) {
  return parts.filter(Boolean).join(" · ").slice(0, 480);
}
export function adjustmentText(adjustment, lang = "it") {
  if (!adjustment) return "";
  const type = pick(typeLabel(adjustment.type), lang);
  const kinds = adjustment.applied.map((kind) => pick(DEFENSE_LABEL[kind], lang).toLowerCase());
  const downgrade = adjustment.downgrade
    ? pick(
        L(" · immunità declassata a resistenza: ", " · immunity downgraded to resistance: "),
        lang,
      ) + adjustment.downgrade.reason
    : "";
  return `${type} ${adjustment.base} → ${adjustment.amount}${kinds.length ? " (" + kinds.join(", ") + ")" : ""}${adjustment.multiplier !== 1 ? " " + multiplierText(adjustment.multiplier) : ""}${downgrade}`;
}

/**
 * The widget's Heal or Damage (DDB-032/142), with an optional damage type and tray
 * decision (Shieldmaiden typed damage, CMP-173). Damage goes through the vitality domain:
 * Temporary HP absorb first (SRD EN 18 / IT 20); healing never adds Temporary HP.
 */
export function manualChange(state, actorId, input, viewer, options = {}) {
  requireManage(state, actorId, viewer);
  const kind = input?.kind === "heal" ? "heal" : input?.kind === "damage" ? "damage" : null;
  if (!kind) refuse("Scegli Cura o Danno.", "Choose Heal or Damage.", "kind");
  const requested = amountOf(input.amount);
  const note = noteOf(input.note);
  const type = kind === "damage" && input.type ? input.type : null;
  if (type && !DAMAGE_TYPES.includes(type))
    refuse("Tipo di danno sconosciuto.", "Unknown damage type.", "type");
  let amount = requested,
    adjustment = null;
  if (type) {
    const chips = chipsFor(defensesOf(state, actorId), type);
    checkDecision(input.decision, chips);
    const adjusted = adjustDamage(requested, chips, input.decision ?? {});
    adjustment = adjustmentRecord(type, requested, adjusted, chips, input.decision ?? {});
    amount = adjusted.amount;
  }
  const actor = state.actors[actorId];
  if (kind === "heal") {
    if (actor.dead === true)
      refuse(
        "Una creatura morta non recupera PF: serve una magia che la riporti in vita.",
        "A dead creature regains no HP: it needs magic that returns it to life.",
        "dead",
      );
    if (int(actor.hp) && int(actor.maxHp) && actor.hp >= actor.maxHp)
      refuse(
        `I PF sono già al massimo (${actor.maxHp}).`,
        `HP are already at maximum (${actor.maxHp}).`,
        "full",
      );
  }
  const lang = options.lang === "en" ? "en" : "it";
  const surface = pick(SURFACE[input.surface] ?? SURFACE.token, lang);
  const selection = {
    kind,
    amount,
    reason: reasonText([
      input.reason ||
        pick(
          kind === "damage"
            ? L("Danno dal widget PF", "Damage from the HP widget")
            : L("Cura dal widget PF", "Healing from the HP widget"),
          lang,
        ) + ` (${surface})`,
      adjustmentText(adjustment, lang),
      note,
    ]),
    source: copy(APP_SOURCE),
    ...(kind === "damage" && input.critical === true ? { critical: true } : {}),
  };
  const operationId = options.operationId ?? newId("dt-hp");
  const result = runVitality(state, actorId, selection, viewer, { ...options, operationId });
  mutableSlice(state).manual[operationId] = {
    kind,
    requested,
    amount,
    type,
    adjustment,
    note,
    surface: input.surface ?? "token",
    proposalId: input.proposalId ?? null,
    by: viewer,
    at: options.now ?? nowIso(),
  };
  return { result, adjustment, amount, eventId: operationId };
}

/**
 * «Correggi» in the HP widget (PG-21; D&D Beyond: click the HP and correct them in place,
 * with the reason): current, maximum and temporary HP in one vitality correction with a
 * required reason. It is logged in the one HP log with its targeted Undo. A correction is
 * not damage: it never drops a creature to 0 HP (use Damage), nor a maximum to 0 (Dead).
 */
export function correctVitals(state, actorId, input, viewer, options = {}) {
  const actor = requireManage(state, actorId, viewer);
  const patch = {};
  for (const key of ["hp", "maxHp", "tempHp"]) {
    const raw = input?.[key];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    const n = typeof raw === "string" ? Number(raw.trim()) : raw;
    if (!int(n) || n < 0 || n > MAX_AMOUNT)
      refuse(
        `Scrivi un numero intero da 0 a ${MAX_AMOUNT}.`,
        `Enter a whole number from 0 to ${MAX_AMOUNT}.`,
        key,
      );
    if (n !== actor[key]) patch[key] = n;
  }
  if (!Object.keys(patch).length)
    refuse("Nessun valore cambiato.", "No value changed.", "unchanged");
  const reason = noteOf(input?.reason);
  if (!reason)
    refuse(
      "Scrivi il motivo della correzione: resta nel registro PF.",
      "Write the reason for the correction: it stays in the HP log.",
      "reason",
    );
  const operationId = options.operationId ?? newId("dt-fix");
  const result = runVitality(
    state,
    actorId,
    { kind: "correct", patch, reason, source: copy(APP_SOURCE) },
    viewer,
    { ...options, operationId },
  );
  mutableSlice(state).manual[operationId] = {
    kind: "correct",
    requested: null,
    amount: null,
    type: null,
    adjustment: null,
    note: reason,
    surface: input.surface ?? "sheet",
    proposalId: null,
    by: viewer,
    at: options.now ?? nowIso(),
  };
  return { result, patch, eventId: operationId };
}

/** Temporary HP: they do not stack; with some already, keep or replace (SRD EN 18 / IT 20). */
export function setTempHp(state, actorId, input, viewer, options = {}) {
  requireManage(state, actorId, viewer);
  const raw = typeof input?.amount === "string" ? Number(input.amount.trim()) : input?.amount;
  if (!int(raw) || raw < 0 || raw > MAX_AMOUNT)
    refuse(
      `Scrivi un numero intero da 0 a ${MAX_AMOUNT}.`,
      `Enter a whole number from 0 to ${MAX_AMOUNT}.`,
      "amount",
    );
  const note = noteOf(input.note);
  const operationId = options.operationId ?? newId("dt-temp");
  const selection = {
    kind: "temp-hp",
    amount: raw,
    ...(input.choice ? { choice: input.choice } : {}),
    reason: reasonText([
      pick(L("PF temporanei dal widget PF", "Temporary HP from the HP widget"), options.lang) +
        ` (${pick(SURFACE[input.surface] ?? SURFACE.token, options.lang)})`,
      note,
    ]),
    source: copy(SOURCES.tempHp),
  };
  const result = runVitality(state, actorId, selection, viewer, { ...options, operationId });
  mutableSlice(state).manual[operationId] = {
    kind: "temp-hp",
    amount: raw,
    note,
    surface: input.surface ?? "token",
    by: viewer,
    at: options.now ?? nowIso(),
  };
  return { result, eventId: operationId };
}

/** Active maximum-HP modifiers of a creature, each with its note (DDB "Max HP Modifier"). */
export const activeMaxMods = (state, actorId) =>
  (sliceOf(state)?.maxMods?.[actorId] ?? []).filter((mod) => !mod.removed);

function maxCorrection(state, actorId, delta, reason, viewer, options) {
  const actor = state.actors[actorId];
  if (!int(actor.maxHp))
    refuse("PF massimi non registrati.", "Maximum HP not recorded.", "max-unknown");
  const next = actor.maxHp + delta;
  if (next < 1)
    refuse(
      "Il massimo non può scendere sotto 1: un massimo di 0 uccide la creatura (SRD EN 17 / IT 19).",
      "The maximum cannot drop below 1: a 0 maximum kills the creature (SRD EN 17 / IT 19).",
      "max-low",
    );
  const patch = { maxHp: next };
  if (int(actor.hp) && actor.hp > next) patch.hp = next;
  return runVitality(
    state,
    actorId,
    { kind: "correct", patch, reason, source: copy(APP_SOURCE) },
    viewer,
    options,
  );
}
/** A signed change of the maximum with a required note (e.g. "+5 Aid"). */
export function changeMaxHp(state, actorId, input, viewer, options = {}) {
  requireManage(state, actorId, viewer);
  const raw = typeof input?.delta === "string" ? Number(input.delta.trim()) : input?.delta;
  if (!int(raw) || raw === 0 || Math.abs(raw) > MAX_AMOUNT)
    refuse(
      "Scrivi di quanto cambia il massimo, per esempio 5 o -3.",
      "Enter how much the maximum changes, for example 5 or -3.",
      "delta",
    );
  const note = noteOf(input.note);
  if (!note)
    refuse(
      "Scrivi una nota: perché cambia il massimo.",
      "Write a note: why the maximum changes.",
      "note",
    );
  const operationId = options.operationId ?? newId("dt-max");
  const result = maxCorrection(
    state,
    actorId,
    raw,
    reasonText([
      `${pick(L("Massimo", "Maximum"), options.lang)} ${raw > 0 ? "+" : ""}${raw}`,
      note,
    ]),
    viewer,
    { ...options, operationId },
  );
  const slice = mutableSlice(state);
  (slice.maxMods[actorId] ??= []).push({
    id: operationId,
    delta: raw,
    note,
    eventId: operationId,
    by: viewer,
    at: options.now ?? nowIso(),
  });
  slice.manual[operationId] = {
    kind: "max",
    delta: raw,
    note,
    by: viewer,
    at: options.now ?? nowIso(),
  };
  return { result, eventId: operationId };
}
export function removeMaxMod(state, actorId, modId, viewer, options = {}) {
  requireManage(state, actorId, viewer);
  const mod = activeMaxMods(state, actorId).find((entry) => entry.id === modId);
  if (!mod) refuse("Modifica del massimo non trovata.", "Maximum modifier not found.", "missing");
  const operationId = options.operationId ?? newId("dt-max");
  const result = maxCorrection(
    state,
    actorId,
    -mod.delta,
    reasonText([
      `${pick(L("Tolta la modifica del massimo", "Removed the maximum modifier"), options.lang)} ${mod.delta > 0 ? "+" : ""}${mod.delta}`,
      mod.note,
    ]),
    viewer,
    { ...options, operationId },
  );
  const slice = mutableSlice(state);
  const target = slice.maxMods[actorId].find((entry) => entry.id === modId);
  target.removed = { eventId: operationId, by: viewer, at: options.now ?? nowIso() };
  slice.manual[operationId] = {
    kind: "max",
    delta: -mod.delta,
    note: mod.note,
    removes: modId,
    by: viewer,
    at: options.now ?? nowIso(),
  };
  return { result, eventId: operationId };
}

/** The DM records a creature's damage defenses (dnd5e actor traits). */
export function recordDefenses(state, actorId, input, viewer, options = {}) {
  if (viewer !== "dm")
    refuse("Solo il DM registra le difese ai danni.", "Only the DM records damage defenses.", "dm");
  if (!state.actors?.[actorId]) refuse("Creatura non trovata.", "Creature not found.", "missing");
  const lists = Object.fromEntries(
    ["resistances", "vulnerabilities", "immunities"].map((key) => [key, typeList(input?.[key])]),
  );
  const clash = lists.immunities.find(
    (type) => lists.resistances.includes(type) || lists.vulnerabilities.includes(type),
  );
  if (clash)
    refuse(
      `${typeLabel(clash).it}: l’immunità esclude resistenza e vulnerabilità allo stesso tipo.`,
      `${typeLabel(clash).en}: immunity excludes resistance and vulnerability to the same type.`,
      "clash",
    );
  const slice = mutableSlice(state);
  if (input?.clear === true) delete slice.defenses[actorId];
  else
    slice.defenses[actorId] = {
      ...lists,
      note: noteOf(input?.note),
      by: viewer,
      at: options.now ?? nowIso(),
    };
}

// ---------------------------------------------------------------- the tray

/**
 * Assisted outcomes waiting for Apply that this viewer controls (dnd5e applies through the
 * target's owner, FVT-138), one row per target, with the pending amount (after a
 * successful save's half) and the damage type when the viewer knows the source.
 */
export function trayRows(state, viewer) {
  const projected = new Map(projectAttempts(state, viewer).map((a) => [a.id, a]));
  const rows = [];
  for (const attempt of state.combatAttempts ?? [])
    for (const outcome of attempt.outcomes ?? []) {
      const pending = attempt.pendingApplications?.[outcome.actorId];
      const target = state.actors?.[outcome.actorId];
      if (outcome.status !== "ready" || !pending || !target) continue;
      if (!canControlActor(target, viewer, state)) continue;
      const view = projected.get(attempt.id);
      rows.push({
        key: `attempt:${attempt.id}:${target.id}`,
        kind: "attempt",
        attemptId: attempt.id,
        actorId: target.id,
        name: target.name,
        base: pending.damage,
        darts: copy(pending.extra?.darts ?? null),
        type: attempt.damageType ?? null,
        typeKnown: !!view?.damageType,
        actionName: copy(view?.actionName ?? L("Azione non rivelata", "Unrevealed action")),
        sourceName: view?.actorName ?? null,
        saveSuccess: pending.extra?.saveSuccess,
        saveTotal: canControlActor(target, viewer, state) ? pending.extra?.saveTotal : undefined,
        critical: pending.extra?.critical === true,
        hit: pending.extra?.hit,
      });
    }
  return rows;
}
/** One row's result under a decision: chips, adjusted damage and the HP preview. */
export function previewRow(state, row, decision, viewer) {
  const chips = row.type ? chipsFor(defensesOf(state, row.actorId), row.type) : [];
  const adjusted = adjustDamage(row.base, chips, decision ?? {}, { darts: row.darts });
  const preview = previewVitalityChange(
    state,
    row.actorId,
    {
      kind: "damage",
      amount: adjusted.amount,
      reason: "preview",
      source: copy(APP_SOURCE),
      ...(row.critical ? { critical: true } : {}),
    },
    viewer,
  );
  const breakdown = preview.breakdown;
  const after = breakdown
    ? healthState({
        hp: breakdown.hpAfter,
        maxHp: state.actors[row.actorId]?.maxHp,
        dead: breakdown.deadAfter,
      })
    : null;
  return { chips, adjusted, breakdown, after, errors: preview.errors };
}
/** Applies one tray row: the controller's decision replaces the automatic defenses. */
export function applyTrayRow(state, key, decision, viewer) {
  const row = trayRows(state, viewer).find((entry) => entry.key === key);
  if (!row)
    refuse(
      "Non c’è più nulla da applicare qui: la carta è cambiata.",
      "There is nothing left to apply here: the card changed.",
      "stale",
    );
  const chips = row.type ? chipsFor(defensesOf(state, row.actorId), row.type) : [];
  checkDecision(decision, chips);
  const adjusted = adjustDamage(row.base, chips, decision ?? {}, { darts: row.darts });
  const adjustment = adjustmentRecord(row.type, row.base, adjusted, chips, decision ?? {});
  applyReadyOutcome(state, row.attemptId, row.actorId, viewer, {
    amount: adjusted.amount,
    adjustment,
    ...(adjusted.darts ? { darts: adjusted.darts } : {}),
  });
  return { row, adjustment, amount: adjusted.amount };
}

// ---------------------------------------------------------------- proposals (VTL-129)

/** Conditions a player may propose (Improved Initiative tags): the SRD 2024 list but
 * Exhaustion, which is a level with its own reasoned command. */
export const PROPOSABLE_CONDITIONS = Object.freeze(
  listConditionDefinitions()
    .filter((c) => c.id !== "exhaustion")
    .map((c) => Object.freeze({ id: c.id, name: c.name })),
);
export const conditionName = (id) =>
  PROPOSABLE_CONDITIONS.find((c) => c.id === id)?.name ?? L(id, id);

export const pendingProposals = (state) =>
  (sliceOf(state)?.proposals ?? []).filter((p) => p.status === "pending");
/** What a viewer reads of the proposals: the DM all, a player their own. */
export function proposalsFor(state, viewer) {
  return (sliceOf(state)?.proposals ?? []).filter((p) => viewer === "dm" || p.by === viewer);
}
/** Whether this viewer may propose for a creature: one they control or see on the Table. */
export function observes(state, actor, viewer) {
  if (!actor || !isActorAvailable(actor)) return false;
  if (canControlActor(actor, viewer, state)) return true;
  if (!isCampaignActor(actor, state.campaign?.id) || actor.hidden === true) return false;
  const scene = (state.scenes ?? []).find((s) => s.id === state.activeSceneId);
  const token = scene?.tokens?.find((t) => t.actorId === actor.id);
  return !!token && token.hidden !== true && token.visible !== false;
}
/** A player proposes damage or healing to a creature they see; the DM decides. */
export function propose(state, input, viewer, { allowed = true, now, id } = {}) {
  if (viewer === "dm") refuse("Il DM applica direttamente.", "The DM applies directly.", "dm");
  if (!allowed)
    refuse(
      "Il DM ha disattivato le proposte dei giocatori.",
      "The DM turned off player suggestions.",
      "off",
    );
  const actor = state.actors?.[input?.actorId];
  if (!observes(state, actor, viewer))
    refuse("Non vedi questa creatura.", "You cannot see this creature.", "unseen");
  const kind = ["heal", "condition"].includes(input.kind) ? input.kind : "damage";
  const condition = kind === "condition";
  if (condition && !PROPOSABLE_CONDITIONS.some((c) => c.id === input.conditionId))
    refuse("Scegli una condizione del SRD.", "Choose an SRD condition.", "condition");
  const amount = condition ? null : amountOf(input.amount);
  const type = kind === "damage" && input.type ? input.type : null;
  if (type && !DAMAGE_TYPES.includes(type))
    refuse("Tipo di danno sconosciuto.", "Unknown damage type.", "type");
  const note = noteOf(input.note);
  const proposal = {
    id: id ?? newId("dt-prop"),
    by: viewer,
    actorId: actor.id,
    kind,
    amount,
    type,
    ...(condition ? { conditionId: input.conditionId } : {}),
    note,
    at: now ?? nowIso(),
    status: "pending",
  };
  mutableSlice(state).proposals.push(proposal);
  return proposal;
}
export function withdrawProposal(state, proposalId, viewer, { now } = {}) {
  const proposal = mutableSlice(state).proposals.find((p) => p.id === proposalId);
  if (!proposal || proposal.status !== "pending" || proposal.by !== viewer)
    refuse("Proposta non disponibile.", "Proposal unavailable.", "missing");
  proposal.status = "withdrawn";
  proposal.answer = { by: viewer, at: now ?? nowIso() };
}
/** The DM accepts (applies through the vitality domain, with the tray decision) or declines. */
export function answerProposal(state, proposalId, input, viewer, options = {}) {
  if (viewer !== "dm")
    refuse("Solo il DM risponde alle proposte.", "Only the DM answers proposals.", "dm");
  const slice = mutableSlice(state);
  const proposal = slice.proposals.find((p) => p.id === proposalId);
  if (!proposal || proposal.status !== "pending")
    refuse("Proposta già gestita.", "Proposal already handled.", "handled");
  const at = options.now ?? nowIso();
  if (input?.accept === true && proposal.kind === "condition") {
    // Improved Initiative's accepted tag (CMP-163): a recorded application through the
    // conditions domain, ended by hand (the player named no duration).
    const operationId = options.operationId ?? newId("dt-cond");
    const label = pick(L("Proposta del giocatore", "Player proposal"), options.lang);
    const selection = {
      kind: "apply",
      conditionId: proposal.conditionId,
      source: copy(APP_SOURCE),
      origin: { label: (proposal.note ? `${label}: ${proposal.note}` : label).slice(0, 120) },
      term: { kind: "manual" },
      mode: "record",
    };
    const preview = previewConditionChange(state, proposal.actorId, selection, viewer);
    if (!preview.canApply) throw errorOf(preview.errors[0]);
    const result = applyConditionChange(state, proposal.actorId, selection, viewer, {
      operationId,
      reviewKey: preview.reviewKey,
      online: options.online ?? true,
    });
    applyConditionFollowUps(state, result);
    proposal.status = "accepted";
    proposal.answer = { by: viewer, at, eventId: operationId, conditionId: proposal.conditionId };
    return { result, eventId: operationId };
  }
  if (input?.accept === true) {
    const applied = manualChange(
      state,
      proposal.actorId,
      {
        kind: proposal.kind,
        amount: proposal.amount,
        type: proposal.type,
        decision: input.decision,
        note: proposal.note,
        surface: "proposal",
        proposalId: proposal.id,
        reason: pick(
          L("Proposta del giocatore accettata dal DM", "Player proposal accepted by the DM"),
          options.lang,
        ),
      },
      viewer,
      options,
    );
    const target = mutableSlice(state).proposals.find((p) => p.id === proposalId);
    target.status = "accepted";
    target.answer = { by: viewer, at, eventId: applied.eventId, amount: applied.amount };
    return applied;
  }
  const reason = noteOf(input?.reason);
  proposal.status = "declined";
  proposal.answer = { by: viewer, at, reason };
  return null;
}

// ---------------------------------------------------------------- the HP log (FVT-144)

const LOG_KINDS = new Set([
  "damage",
  "healing",
  "vitality-correct",
  "temp-hp",
  "roll",
  "recovered",
]);
const REVERTIBLE = new Set(["damage", "healing", "vitality-correct", "temp-hp"]);
const rowOf = (rows, field) => rows.find((r) => r.field === field) ?? null;
function attemptOfEvent(id) {
  const index = id.indexOf(":vitality:");
  return index > 0 ? id.slice(0, index) : null;
}
/**
 * The creature's HP changes, newest first, as this viewer may read them (the conditions
 * history projection), each with what caused it and whether it can be undone alone or
 * reapplied. Combat entries carry the attack and the defenses applied.
 */
export function hpLog(state, actorId, viewer) {
  const history = new Map(getConditionHistory(state, actorId, viewer).map((h) => [h.id, h]));
  const slice = sliceOf(state) ?? seedSlice();
  const projected = new Map(projectAttempts(state, viewer).map((a) => [a.id, a]));
  const control = canManage(state, actorId, viewer);
  const entries = [];
  for (const event of state.conditionEvents ?? []) {
    if (!(event.actorIds ?? [event.actorId]).includes(actorId) || !LOG_KINDS.has(event.kind))
      continue;
    // The conditions history projection decides what this viewer reads; a recorded change
    // that moved no value (an immunity, 0 damage) is still listed from this area's record.
    const h =
      history.get(event.id) ??
      (slice.manual[event.id] && event.owner === viewer
        ? {
            id: event.id,
            kind: event.kind,
            label: event.label,
            reason: event.reason ?? null,
            rows: [],
          }
        : null);
    if (!h) continue;
    if (!h.rows.some((r) => ["hp", "tempHp", "maxHp"].includes(r.field)) && !slice.manual[h.id])
      continue;
    const attemptId = attemptOfEvent(h.id);
    const attempt = attemptId ? (state.combatAttempts ?? []).find((a) => a.id === attemptId) : null;
    const view = attemptId ? projected.get(attemptId) : null;
    const outcome = attempt?.outcomes?.find((o) => o.actorId === actorId);
    const adjustment = slice.manual[h.id]?.adjustment ?? outcome?.adjustment ?? null;
    const typeKnown = !attempt || !!view?.damageType;
    entries.push({
      id: h.id,
      index: entries.length,
      kind: h.kind,
      label: h.label,
      reason: h.reason,
      hp: rowOf(h.rows, "hp"),
      tempHp: rowOf(h.rows, "tempHp"),
      maxHp: rowOf(h.rows, "maxHp"),
      dead: rowOf(h.rows, "dead"),
      rows: h.rows,
      amount:
        event.result?.breakdown?.damage ??
        event.result?.breakdown?.healing ??
        event.result?.breakdown?.granted ??
        null,
      combat: attempt
        ? {
            attemptId,
            actionName: copy(view?.actionName ?? L("Azione non rivelata", "Unrevealed action")),
            sourceName: view?.actorName ?? null,
          }
        : null,
      adjustment: adjustment && typeKnown ? copy(adjustment) : null,
      manual: copy(slice.manual[h.id] ?? null),
      revert: copy(slice.reverts[h.id] ?? null),
      reapplied: copy(slice.reapplied[h.id] ?? null),
      revertOf: slice.revertOf[h.id] ?? null,
      canRevert:
        control &&
        h.rows.length > 0 &&
        REVERTIBLE.has(h.kind) &&
        !slice.reverts[h.id] &&
        !slice.revertOf[h.id],
      canReapply: control && !!slice.reverts[h.id] && !slice.reapplied[h.id],
    });
  }
  return entries.reverse();
}
function eventFor(state, actorId, entryId) {
  const event = (state.conditionEvents ?? []).find((e) => e.id === entryId);
  if (!event || !(event.actorIds ?? [event.actorId]).includes(actorId))
    refuse("Voce del registro non trovata.", "Log entry not found.", "missing");
  return event;
}
const delta = (row) => (row && int(row.after) && int(row.before) ? row.after - row.before : 0);
/** Rule conditions an HP entry applied that are still on the creature and may end by hand. */
function endableConditions(actor, entryId) {
  return (Array.isArray(actor?.conditions) ? actor.conditions : [])
    .filter(
      (i) =>
        isObject(i) &&
        !i.custom &&
        i.origin?.eventId === entryId &&
        i.cause !== "sleep" &&
        !(i.id === "unconscious" && i.restId),
    )
    .sort((a, b) => Number(!!a.parentInstanceId) - Number(!!b.parentInstanceId)); // cause first
}
/**
 * What undoing one entry alone would change now (Damage Log, FVT-144): the inverse of its
 * HP, temporary HP and maximum deltas against the current values, plus the consequences
 * that depend on it. Options (`dead`, `failures`) are the DM's to include.
 */
export function planRevert(state, actorId, entryId, viewer) {
  const actor = requireManage(state, actorId, viewer);
  const slice = sliceOf(state) ?? seedSlice();
  const event = eventFor(state, actorId, entryId);
  const out = { patch: {}, consequences: [], options: [], errors: [], event: event.kind };
  if (!REVERTIBLE.has(event.kind) || slice.revertOf[entryId])
    out.errors.push(L("Questa voce non si annulla da sola.", "This entry cannot be undone alone."));
  if (slice.reverts[entryId]) out.errors.push(L("Voce già annullata.", "Entry already undone."));
  const rows = (event.rows ?? []).filter((r) => (r.actorId ?? event.actorId) === actorId);
  const hpRow = rowOf(rows, "hp"),
    tempRow = rowOf(rows, "tempHp"),
    maxRow = rowOf(rows, "maxHp");
  if (maxRow && int(actor.maxHp)) {
    const target = actor.maxHp - delta(maxRow);
    if (target < 1)
      out.errors.push(L("Il massimo scenderebbe sotto 1.", "The maximum would drop below 1."));
    else if (target !== actor.maxHp) out.patch.maxHp = target;
  }
  const maxAfter = out.patch.maxHp ?? actor.maxHp;
  if (hpRow && int(actor.hp)) {
    let target = actor.hp - delta(hpRow);
    if (int(maxAfter) && target > maxAfter) {
      target = maxAfter;
      out.consequences.push({
        code: "capped",
        text: L(
          `I PF tornano al massimo attuale (${maxAfter}), non oltre.`,
          `HP return to the current maximum (${maxAfter}), not beyond.`,
        ),
      });
    }
    if (target <= 0 && actor.hp > 0)
      out.errors.push(
        L(
          "Annullare questa voce porterebbe a 0 PF: una correzione non fa cadere a 0, registra un Danno.",
          "Undoing this entry would drop to 0 HP: a correction does not drop to 0, record Damage.",
        ),
      );
    else if (target !== actor.hp) out.patch.hp = Math.max(0, target);
  }
  if (tempRow) {
    const current = int(actor.tempHp) ? actor.tempHp : 0;
    const target = Math.max(0, current - delta(tempRow));
    if (target !== current) out.patch.tempHp = target;
  }
  const deadRow = rowOf(rows, "dead");
  if (deadRow?.before === false && deadRow.after === true && actor.dead === true)
    out.options.push({
      id: "dead",
      checked: true,
      text: L(
        "Questa voce ha causato «Morto»: toglilo con la stessa correzione (non è una resurrezione).",
        "This entry caused “Dead”: remove it with the same correction (not a resurrection).",
      ),
    });
  const failRow = rowOf(rows, "deathSaves.failures");
  const failures = actor.deathSaves?.failures ?? 0;
  if (failRow && delta(failRow) > 0 && failures > 0)
    out.options.push({
      id: "failures",
      checked: true,
      value: Math.max(0, failures - delta(failRow)),
      text: L(
        `Ha aggiunto ${delta(failRow)} fallimenti contro la morte: riportali a ${Math.max(0, failures - delta(failRow))}.`,
        `It added ${delta(failRow)} death save failures: set them back to ${Math.max(0, failures - delta(failRow))}.`,
      ),
    });
  // Conditions this entry put on the creature that are still there (Unconscious and Prone
  // from dropping to 0 HP): once the correction brings HP back above 0 they can end in the
  // same command, through the conditions domain, like "Dead" above. A knockout's
  // Unconscious belongs to its Short Rest and stays with the rest.
  const endable = endableConditions(actor, entryId);
  const hpAfterRevert = out.patch.hp ?? actor.hp;
  if (endable.length && int(hpAfterRevert) && hpAfterRevert > 0)
    out.options.push({
      id: "conditions",
      checked: true,
      instanceIds: endable.map((i) => i.instanceId),
      text: L(
        `Ha causato ${endable.map((i) => conditionName(i.id).it).join(", ")}: terminale con la stessa correzione.`,
        `It caused ${endable.map((i) => conditionName(i.id).en).join(", ")}: end them with the same correction.`,
      ),
    });
  const endableIds = new Set(endable.map((i) => i.id));
  const added = rows.filter(
    (r) =>
      r.field.startsWith("conditions.") &&
      r.before === false &&
      r.after === true &&
      !(out.options.some((o) => o.id === "conditions") && endableIds.has(r.field.slice(11))),
  );
  if (added.length)
    out.consequences.push({
      code: "conditions",
      text: L(
        `Restano le condizioni che ha causato (${added.map((r) => r.label?.it ?? r.field).join(", ")}): terminale in «Condizioni e stato» se erano dovute a questa voce.`,
        `The conditions it caused remain (${added.map((r) => r.label?.en ?? r.field).join(", ")}): end them in “Conditions and status” if they came from this entry.`,
      ),
    });
  if (
    rows.some((r) => r.field === "concentration.active" && r.before === true && r.after === false)
  )
    out.consequences.push({
      code: "concentration",
      text: L(
        "La concentrazione che ha interrotto non torna: l’incantesimo resta concluso.",
        "The concentration it broke does not come back: the spell stays ended.",
      ),
    });
  const events = (state.conditionEvents ?? []).filter((e) =>
    (e.actorIds ?? [e.actorId]).includes(actorId),
  );
  const later = events
    .slice(events.findIndex((e) => e.id === entryId) + 1)
    .filter(
      (e) =>
        LOG_KINDS.has(e.kind) &&
        (e.rows ?? []).some((r) => ["hp", "tempHp", "maxHp"].includes(r.field)),
    );
  if (later.length)
    out.consequences.push({
      code: "later",
      text: L(
        `${later.length === 1 ? "Dopo questa voce c’è un altro cambio di PF" : `Dopo questa voce ci sono ${later.length} altri cambi di PF`}: l’annullamento corregge i valori attuali (${hpRow ? (delta(hpRow) > 0 ? "−" : "+") + Math.abs(delta(hpRow)) + " PF" : "stessa differenza"}) e non riscrive ${later.length === 1 ? "quello successivo" : "quelli successivi"}.`,
        `${later.length === 1 ? "There is one later HP change" : `There are ${later.length} later HP changes`}: the undo corrects the current values (${hpRow ? (delta(hpRow) > 0 ? "−" : "+") + Math.abs(delta(hpRow)) + " HP" : "same difference"}) and does not rewrite ${later.length === 1 ? "it" : "them"}.`,
      ),
    });
  if (
    event.kind === "damage" &&
    (event.result?.followUps ?? []).some((f) => f.kind === "start-knockout-rest")
  )
    out.consequences.push({
      code: "knockout",
      text: L(
        "Il riposo breve del knockout resta registrato: concludilo o annullalo dal pannello Riposo.",
        "The knockout Short Rest stays recorded: finish or cancel it from the Rest panel.",
      ),
    });
  if (!Object.keys(out.patch).length && !out.options.length && !out.errors.length)
    out.errors.push(
      L(
        "Niente da annullare: i valori attuali non contengono più questa differenza.",
        "Nothing to undo: the current values no longer hold this difference.",
      ),
    );
  return out;
}
/** Undoes one HP log entry alone, as a correction with its reason. */
export function revertEntry(state, actorId, entryId, viewer, input = {}, options = {}) {
  const reason = noteOf(input.reason);
  if (!reason) refuse("Scrivi il motivo dell’annullamento.", "Write why you undo it.", "reason");
  const plan = planRevert(state, actorId, entryId, viewer);
  if (plan.errors.length) refuse(plan.errors[0].it, plan.errors[0].en, "revert");
  const include = input.include ?? {};
  const patch = { ...plan.patch };
  for (const option of plan.options)
    if (include[option.id] ?? option.checked) {
      if (option.id === "dead") patch.dead = false;
      if (option.id === "failures") patch.failures = option.value;
    }
  if (!Object.keys(patch).length) refuse("Niente da annullare.", "Nothing to undo.", "revert");
  const event = eventFor(state, actorId, entryId);
  const operationId = options.operationId ?? newId("dt-undo");
  const result = runVitality(
    state,
    actorId,
    {
      kind: "correct",
      patch,
      reason: reasonText([
        pick(
          L(
            `Annullata la voce del registro PF «${event.label?.it ?? event.kind}»`,
            `Undid the HP log entry “${event.label?.en ?? event.kind}”`,
          ),
          options.lang,
        ),
        reason,
      ]),
      source: copy(APP_SOURCE),
    },
    viewer,
    { ...options, operationId },
  );
  // The conditions it caused end in the same command, through the conditions domain
  // (Conditions and status shows each end with this reason).
  const ended = [];
  const conditions = plan.options.find((o) => o.id === "conditions");
  if (conditions && (include.conditions ?? conditions.checked))
    conditions.instanceIds.forEach((instanceId, index) => {
      const selection = {
        kind: "end",
        instanceId,
        reason: reasonText([
          pick(L("Annullata la voce del registro PF", "Undid the HP log entry"), options.lang),
          reason,
        ]),
      };
      const preview = previewConditionChange(state, actorId, selection, viewer);
      if (!preview.canApply) return; // already ended together with another one
      const endResult = applyConditionChange(state, actorId, selection, viewer, {
        operationId: `${operationId}:end-${index}`,
        reviewKey: preview.reviewKey,
        online: options.online ?? true,
      });
      applyConditionFollowUps(state, endResult);
      ended.push(instanceId);
    });
  const slice = mutableSlice(state);
  slice.reverts[entryId] = {
    correctionId: operationId,
    reason,
    included: Object.fromEntries(plan.options.map((o) => [o.id, include[o.id] ?? o.checked])),
    ended,
    by: viewer,
    at: options.now ?? nowIso(),
  };
  slice.revertOf[operationId] = entryId;
  syncMaxMod(slice, actorId, entryId, "revert", operationId, viewer, options);
  return { result, eventId: operationId, patch, ended };
}
/**
 * Keeps the maximum-HP modifier list in step with the log: undoing "+5 Aid" takes the
 * modifier off the list, undoing its removal puts it back; reapplying does the opposite.
 */
function syncMaxMod(slice, actorId, entryId, action, eventId, viewer, options) {
  // A reapplication is the same change again: undoing it acts like undoing the original.
  const baseId = slice.manual[entryId]?.kind === "reapply" ? slice.manual[entryId].of : entryId;
  const manual = slice.manual[baseId];
  if (manual?.kind !== "max") return;
  const mod = (slice.maxMods[actorId] ?? []).find(
    (entry) => entry.id === (manual.removes ?? baseId),
  );
  if (!mod) return;
  const off = manual.removes ? action === "reapply" : action === "revert";
  if (off) mod.removed = { eventId, by: viewer, at: options.now ?? nowIso(), [action]: entryId };
  else delete mod.removed;
}
/** Applies an undone entry again (Damage Log "reapply"): the same change, on current values. */
export function reapplyEntry(state, actorId, entryId, viewer, options = {}) {
  requireManage(state, actorId, viewer);
  const slice = sliceOf(state) ?? seedSlice();
  if (!slice.reverts[entryId] || slice.reapplied[entryId])
    refuse(
      "Questa voce non è da riapplicare.",
      "This entry is not waiting to be reapplied.",
      "reapply",
    );
  const event = eventFor(state, actorId, entryId);
  const actor = state.actors[actorId];
  const operationId = options.operationId ?? newId("dt-redo");
  const reason = pick(
    L(
      `Riapplicata la voce del registro PF «${event.label?.it ?? event.kind}»`,
      `Reapplied the HP log entry “${event.label?.en ?? event.kind}”`,
    ),
    options.lang,
  );
  const rows = (event.rows ?? []).filter((r) => (r.actorId ?? event.actorId) === actorId);
  let selection;
  if (event.kind === "damage")
    selection = {
      kind: "damage",
      amount: event.result?.breakdown?.damage,
      ...(event.result?.breakdown?.critical ? { critical: true } : {}),
      reason,
      source: copy(APP_SOURCE),
    };
  else if (event.kind === "healing")
    selection = {
      kind: "heal",
      amount: event.result?.breakdown?.healing,
      reason,
      source: copy(APP_SOURCE),
    };
  else if (event.kind === "temp-hp") {
    const target = rowOf(rows, "tempHp")?.after;
    selection = {
      kind: "temp-hp",
      amount: target,
      ...(int(actor.tempHp) && actor.tempHp > 0 && target > 0 ? { choice: "replace" } : {}),
      reason,
      source: copy(SOURCES.tempHp),
    };
  } else {
    const patch = {};
    const maxRow = rowOf(rows, "maxHp"),
      hpRow = rowOf(rows, "hp"),
      tempRow = rowOf(rows, "tempHp");
    if (maxRow) patch.maxHp = actor.maxHp + delta(maxRow);
    if (hpRow) patch.hp = Math.min(patch.maxHp ?? actor.maxHp, actor.hp + delta(hpRow));
    if (tempRow) patch.tempHp = Math.max(0, (actor.tempHp ?? 0) + delta(tempRow));
    selection = { kind: "correct", patch, reason, source: copy(APP_SOURCE) };
  }
  const result = runVitality(state, actorId, selection, viewer, { ...options, operationId });
  const target = mutableSlice(state);
  target.reapplied[entryId] = { eventId: operationId, by: viewer, at: options.now ?? nowIso() };
  target.manual[operationId] = {
    kind: "reapply",
    of: entryId,
    by: viewer,
    at: options.now ?? nowIso(),
  };
  syncMaxMod(target, actorId, entryId, "reapply", operationId, viewer, options);
  return { result, eventId: operationId };
}
