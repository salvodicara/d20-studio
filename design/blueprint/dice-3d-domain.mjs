// B56 animated dice: pure domain. It turns an already accepted roll (from the commit log,
// another area, or the "Try the dice" demo) into a presentation for one viewer, and owns
// the demo's own records. It never decides or rerolls a result: faces, totals, DCs and
// successes are read from the record that the rules engine already accepted.
//
// Patterns: BG3 check screen with DC, modifiers and success/failure (CRP-131); D&D Beyond
// shared 3D dice "one roll = one result" and game-log detail (DDB-152, DDB-148); Dice So
// Nice per-user dice visible only to who can see the roll (FVT-155); Foundry roll modes
// and Owlbear Dice+ audience (FVT-150, VTL-173); physical faces entered, never animated
// (FVT-153). Rules: SRD 5.2.1 "D20 Tests", "Saving Throws", "Death Saving Throws".

import { rollVisibleTo } from "./registry.mjs";
import { projectAttempts, canSeeAttemptValues, maskedFor } from "./combat.mjs";
import { getEffectiveActor } from "./forms-companions.mjs";
import { canControlActor, canViewActor, isCampaignActor } from "./character-access.mjs";
import { parseFreeRoll, dcVisibleTo, dcSetterOf } from "./chat-domain.mjs";

export const ID = "dice-3d";
export const DEMO_SIDES = Object.freeze([4, 6, 8, 10, 12, 20, 100]);
export const MAX_POOL = 10;
export const MAX_RECORDS = 60;
export const ABILITIES = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);

const text = (it, en) => ({ it, en });
const copy = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
const fail = (it, en) => {
  throw Object.assign(new Error(en), { it, en });
};
export const ABILITY_NAMES = Object.freeze({
  str: text("Forza", "Strength"),
  dex: text("Destrezza", "Dexterity"),
  con: text("Costituzione", "Constitution"),
  int: text("Intelligenza", "Intelligence"),
  wis: text("Saggezza", "Wisdom"),
  cha: text("Carisma", "Charisma"),
});
const pick = (value, lang) =>
  value && typeof value === "object"
    ? (value[lang] ?? value.it ?? value.en ?? "")
    : String(value ?? "");
const join = (parts) => ({
  it: parts
    .map((p) => pick(p, "it"))
    .filter(Boolean)
    .join(" · "),
  en: parts
    .map((p) => pick(p, "en"))
    .filter(Boolean)
    .join(" · "),
});

// ---------------------------------------------------------------- slice

export const seedSlice = () => ({ rolls: [] });
export function normalizeSlice(saved, fromVersion) {
  if (fromVersion > 1) throw new Error("Saved dice demo data comes from a newer version");
  const rolls = Array.isArray(saved?.rolls)
    ? saved.rolls.filter(
        (r) =>
          r &&
          typeof r.id === "string" &&
          Array.isArray(r.dice) &&
          Array.isArray(r.values) &&
          ["player", "dm"].includes(r.by),
      )
    : [];
  return { rolls: rolls.slice(-MAX_RECORDS) };
}

// ---------------------------------------------------------------- dice helpers

/** Pool of sides (click order) → dice groups in order of first appearance. */
export function groupPool(pool) {
  const groups = [];
  for (const sides of pool) {
    const group = groups.find((g) => g.sides === sides);
    if (group) group.count++;
    else groups.push({ count: 1, sides });
  }
  return groups;
}
/** Dice groups and a flat list of faces → one entry per die. Unknown sides stay null. */
export function expandDice(dice, values) {
  const out = [];
  let index = 0;
  for (const group of Array.isArray(dice) ? dice : [])
    for (let k = 0; k < (group?.count ?? 1); k++)
      out.push({ sides: Number(group?.sides) || null, value: values?.[index++] ?? null });
  for (; Array.isArray(values) && index < values.length; index++)
    out.push({ sides: null, value: values[index] });
  return out;
}
export const signedNumber = (n) => (n < 0 ? "−" + Math.abs(n) : "+" + n);
/** "1d20 + 2d6 + 3" from dice groups and a modifier. */
export function formulaText(dice, modifier = 0) {
  const parts = dice.map((g) => `${g.count}d${g.sides}`).join(" + ");
  if (!modifier) return parts;
  return `${parts} ${modifier < 0 ? "−" : "+"} ${Math.abs(modifier)}`;
}
const validFace = (face, sides) => Number.isInteger(face) && face >= 1 && face <= sides;

// ---------------------------------------------------------------- demo actors and presets

/**
 * Why a roll for this actor can only be private, or null: a personal sheet, a hidden
 * creature or a character outside the active campaign never reaches the table. Same
 * audience rule as the core's accepted rolls (state.mjs acceptedRolls: rest and combat).
 */
export function forcedPrivateReason(state, actorId) {
  const actor = actorId ? state.actors?.[actorId] : null;
  if (!actor) return null;
  if (actor.visibility === "private")
    return text(
      `${actor.name} è una scheda personale: il tiro resta solo tuo.`,
      `${actor.name} is a personal sheet: the roll stays yours only.`,
    );
  if (actor.hidden)
    return text(
      `${actor.name} è nascosto: il tiro resta nascosto.`,
      `${actor.name} is hidden: the roll stays hidden.`,
    );
  if (!isCampaignActor(actor, state.campaign?.id))
    return text(
      `${actor.name} non è in questa campagna: il tiro resta solo tuo.`,
      `${actor.name} is not in this campaign: the roll stays yours only.`,
    );
  return null;
}
/** Actors this viewer may roll for in the demo: visible and controlled by the viewer. */
export function demoActors(state, role) {
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor &&
      !actor.dead &&
      canViewActor(actor, role, state) &&
      canControlActor(actor, role, state),
  );
}
/**
 * Who rolls when the drawer opens. The selected token when this viewer controls it (for
 * the DM only a creature the DM owns: a player's character is chosen on purpose),
 * otherwise the player's first character that rolls for the table, otherwise nobody.
 */
export function defaultDemoActor(state, role, selectedId) {
  const actors = demoActors(state, role);
  const selected = actors.find((a) => a.id === selectedId);
  if (selected && (role !== "dm" || selected.owner !== "player")) return selected.id;
  if (role === "dm") return "";
  return actors.find((a) => !forcedPrivateReason(state, a.id))?.id ?? "";
}
/**
 * Saving-throw modifier for the demo check, with the same source order as the combat
 * domain (concentration and area saves): the sheet's recorded saving throw, otherwise
 * the ability modifier. `source` says which one was used.
 */
export function saveModifier(state, actorId, ability) {
  const actor = getEffectiveActor(state.actors?.[actorId]);
  if (!actor || !ABILITIES.includes(ability)) return null;
  const recorded = actor.savingThrows?.[ability];
  if (Number.isFinite(recorded)) return { modifier: recorded, source: "sheet" };
  const score = actor.abilities?.[ability];
  if (!Number.isFinite(score)) return null;
  return { modifier: Math.floor((score - 10) / 2), source: "ability" };
}

// ---------------------------------------------------------------- demo records

const cleanText = (value, max) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
function retryKey(role, input) {
  return JSON.stringify([
    role,
    input.actorId ?? null,
    [...input.pool].sort((a, b) => a - b),
    input.modifier,
    input.dc,
    input.ability ?? null,
    input.label,
  ]);
}
/** Validates the demo form; returns a normalized input or throws a localized error. */
export function validateDemoInput(state, input, role) {
  const pool = Array.isArray(input?.pool) ? input.pool.map(Number) : [];
  if (!pool.length) fail("Aggiungi almeno un dado da tirare.", "Add at least one die to roll.");
  if (pool.length > MAX_POOL)
    fail(
      `Puoi tirare al massimo ${MAX_POOL} dadi insieme.`,
      `You can roll at most ${MAX_POOL} dice together.`,
    );
  if (pool.some((sides) => !DEMO_SIDES.includes(sides)))
    fail(
      "Scegli dadi tra d4, d6, d8, d10, d12, d20 e d100.",
      "Choose dice among d4, d6, d8, d10, d12, d20 and d100.",
    );
  const modifier = input.modifier === "" || input.modifier == null ? 0 : Number(input.modifier);
  if (!Number.isInteger(modifier) || modifier < -30 || modifier > 30)
    fail(
      "Il modificatore è un numero intero tra −30 e +30.",
      "The modifier is a whole number from −30 to +30.",
    );
  const dc = input.dc === "" || input.dc == null ? null : Number(input.dc);
  if (dc !== null) {
    if (!Number.isInteger(dc) || dc < 1 || dc > 30)
      fail("La CD è un numero intero tra 1 e 30.", "The DC is a whole number from 1 to 30.");
    if (pool.length !== 1 || pool[0] !== 20)
      fail(
        "La CD vale per un tiro di d20 singolo: togli gli altri dadi o svuota la CD.",
        "A DC applies to a single d20 roll: remove the other dice or clear the DC.",
      );
  }
  const mode = input.mode === "physical" ? "physical" : "digital";
  let actorId = input.actorId || null;
  if (actorId && !demoActors(state, role).some((a) => a.id === actorId))
    fail("Non puoi tirare per questa creatura.", "You cannot roll for this creature.");
  // A private, hidden or out-of-campaign actor never rolls for the whole table.
  const forced = Boolean(forcedPrivateReason(state, actorId));
  const visibility = forced || input.visibility === "private" ? "private" : "shared";
  // The roller's dice colour travels with the roll (Dice So Nice, DDB): replays keep it.
  const color =
    typeof input.color === "string" && /^[a-z]{1,20}$/.test(input.color) ? input.color : null;
  const ability = ABILITIES.includes(input.ability) ? input.ability : null;
  const label = cleanText(input.label, 80);
  const dice = groupPool(pool);
  const sides = expandDice(dice, []).map((d) => d.sides);
  let faces = null;
  if (mode === "physical") {
    faces = sides.map((_, i) => Number(input.faces?.[i]));
    if (faces.some((face, i) => !validFace(face, sides[i])))
      fail(
        "Inserisci ogni faccia del dado fisico: un numero intero tra 1 e il numero di facce.",
        "Enter every physical die face: a whole number from 1 to the number of sides.",
      );
  }
  return {
    pool,
    dice,
    sides,
    modifier,
    dc,
    mode,
    visibility,
    forced,
    actorId,
    ability,
    label,
    faces,
    color,
  };
}
const totalOf = (values, modifier) => values.reduce((sum, v) => sum + v, 0) + modifier;

/**
 * Records one demo roll in the slice. Digital faces come from `die(sides)` (the app's
 * digital dice service), physical faces from the form. An identical retry after a
 * withdrawal reuses the withdrawn digital faces once (the same rule as combat, I-229).
 */
export function recordDemoRoll(slice, state, rawInput, role, die, now = new Date().toISOString()) {
  const input = validateDemoInput(state, rawInput, role);
  const key = retryKey(role, input);
  const withdrawn =
    input.mode === "digital"
      ? slice.rolls.find(
          (r) =>
            r.status === "withdrawn" &&
            r.mode === "digital" &&
            r.retryKey === key &&
            !r.reusedBy &&
            r.by === role,
        )
      : null;
  const values =
    input.faces ?? (withdrawn ? [...withdrawn.values] : input.sides.map((s) => die(s)));
  if (values.some((face, i) => !validFace(face, input.sides[i])))
    throw Error("The dice service returned an invalid face");
  const actor = input.actorId ? state.actors[input.actorId] : null;
  const total = totalOf(values, input.modifier);
  const id = `${ID}-${now.replace(/\D/g, "").slice(0, 17)}-${slice.rolls.length}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const record = {
    id,
    at: now,
    by: role,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    label: input.label,
    ability: input.ability,
    dice: input.dice,
    values,
    modifier: input.modifier,
    total,
    natural: input.dc !== null ? values[0] : null,
    dc: input.dc,
    success: input.dc !== null ? total >= input.dc : null,
    mode: input.mode,
    visibility: input.visibility,
    ...(input.color ? { color: input.color } : {}),
    status: withdrawn ? "reused" : "accepted",
    retryKey: key,
    ...(withdrawn ? { reusedFrom: withdrawn.id } : {}),
    corrections: [],
  };
  if (withdrawn) withdrawn.reusedBy = id;
  slice.rolls.push(record);
  if (slice.rolls.length > MAX_RECORDS) slice.rolls.splice(0, slice.rolls.length - MAX_RECORDS);
  return record;
}
function ownRecord(slice, id, role) {
  const record = slice.rolls.find((r) => r.id === id);
  if (!record) fail("Il tiro non esiste più.", "The roll no longer exists.");
  if (record.by !== role)
    fail(
      "Solo chi ha tirato può correggere o ritirare questo tiro.",
      "Only the roller can correct or withdraw this roll.",
    );
  if (record.status === "withdrawn")
    fail("Il tiro è già ritirato.", "The roll is already withdrawn.");
  return record;
}
const reasonOf = (reason) => {
  const clean = cleanText(reason, 200);
  if (!clean)
    fail(
      "Scrivi il motivo: resta nella cronologia del tiro.",
      "Write the reason: it stays in the roll history.",
    );
  return clean;
};
/** Withdraws an own demo roll with a reason. Faces stay on record, marked withdrawn. */
export function withdrawDemoRoll(slice, id, reason, role, now = new Date().toISOString()) {
  const record = ownRecord(slice, id, role);
  record.withdrawal = { reason: reasonOf(reason), at: now, by: role };
  record.status = "withdrawn";
  return record;
}
/**
 * Corrects the faces of an own physical demo roll (a typing mistake) with a reason. The
 * previous faces stay in `corrections`. Digital faces are never edited: withdraw instead.
 */
export function correctDemoRoll(slice, id, faces, reason, role, now = new Date().toISOString()) {
  const record = ownRecord(slice, id, role);
  if (record.mode !== "physical")
    fail(
      "Le facce digitali non si modificano: ritira il tiro con un motivo.",
      "Digital faces cannot be edited: withdraw the roll with a reason.",
    );
  const sides = expandDice(record.dice, []).map((d) => d.sides);
  const next = sides.map((_, i) => Number(faces?.[i]));
  if (next.some((face, i) => !validFace(face, sides[i])))
    fail(
      "Inserisci ogni faccia del dado fisico: un numero intero tra 1 e il numero di facce.",
      "Enter every physical die face: a whole number from 1 to the number of sides.",
    );
  if (JSON.stringify(next) === JSON.stringify(record.values))
    fail("Le facce sono uguali a quelle registrate.", "These faces match the recorded ones.");
  const why = reasonOf(reason);
  record.corrections.push({
    values: [...record.values],
    total: record.total,
    reason: why,
    at: now,
    by: role,
  });
  record.values = next;
  record.total = totalOf(next, record.modifier);
  if (record.dc !== null) {
    record.natural = next[0];
    record.success = record.total >= record.dc;
  }
  record.status = "corrected";
  return record;
}
/**
 * Whether a viewer may see a demo record. The roller always may; others only a shared
 * roll whose actor still rolls for the table (a record saved before the audience rule,
 * for a personal or hidden sheet, stays with its roller).
 */
export const canSeeDemo = (record, role, state = null) =>
  record.by === role ||
  (record.visibility !== "private" && !(state && forcedPrivateReason(state, record.actorId)));

/** The roll object a demo record announces with "roll-accepted" (log roll shape). */
export function demoRollEvent(record) {
  return {
    id: record.id,
    source: ID,
    kind: record.dc !== null ? "check" : "free",
    demoRollId: record.id,
    actorId: record.actorId,
    actorName: record.actorName,
    controller: record.by,
    owner: record.by,
    visibility: record.visibility,
    mode: record.mode,
    ...(record.color ? { color: record.color } : {}),
    dice: copy(record.dice),
    values: [...record.values],
    modifier: record.modifier,
    natural: record.natural,
    total: record.total,
    dc: record.dc,
    success: record.success,
    ability: record.ability,
    label: record.label,
    rollMode: "normal",
    status: record.status,
    ...(record.status === "corrected"
      ? {
          correctionReason: record.corrections.at(-1)?.reason,
          previousValues: record.corrections.at(-1)?.values,
        }
      : {}),
  };
}

/**
 * The flat bonus of a Compendium roll, so "[2, 3] + 2 = 7" adds up: total minus the kept
 * d20, or minus every damage/healing face. B16 floors each damage group at 0 (SRD 5.2.1);
 * no SRD entry it rolls can go below 0, so this equals the formula's own bonus.
 */
function compendiumModifier(record) {
  if (!Number.isFinite(record.total)) return null;
  if (record.kind === "d20")
    return Number.isFinite(record.natural) ? record.total - record.natural : null;
  const faces = Array.isArray(record.faces) ? record.faces : [];
  if (!faces.length || !faces.every(Number.isFinite)) return null;
  return record.total - faces.reduce((sum, face) => sum + face, 0);
}
/** A Compendium roll record (B16 slice) as a log-shaped roll; sides parsed only if certain. */
export function compendiumRollEvent(record) {
  let dice = null;
  if (record.kind === "d20") dice = [{ count: record.faces.length, sides: 20 }];
  else {
    const tokens = [...String(record.formula ?? "").matchAll(/(\d+)d(\d+)/g)].map((m) => ({
      count: Number(m[1]),
      sides: Number(m[2]),
    }));
    const sides = new Set(tokens.map((t) => t.sides));
    const count = tokens.reduce((sum, t) => sum + t.count, 0);
    if (sides.size === 1 && count === record.faces.length)
      dice = [{ count, sides: tokens[0].sides }];
  }
  return {
    id: record.id,
    source: "compendium",
    kind: record.kind,
    controller: record.by,
    owner: record.by,
    visibility: record.visibility,
    mode: record.mode,
    dice,
    values: [...record.faces],
    total: record.total,
    natural: record.kind === "d20" ? record.natural : null,
    modifier: compendiumModifier(record),
    rollMode: record.kind === "d20" ? (record.advantage ?? "normal") : "normal",
    label: record.label,
  };
}

// ---------------------------------------------------------------- presentation

const VITALITY = ["death-save", "medicine", "stable-recovery"];
const actionName = (attempt, roll) => attempt?.actionName ?? roll.actionName ?? null;
function keptFlags(roll, dice) {
  const flags = dice.map(() => true);
  const values = dice.map((d) => d.value);
  const d20s = dice.every((d) => d.sides === 20);
  if (d20s && dice.length === 2 && ["advantage", "disadvantage"].includes(roll.rollMode)) {
    const kept = roll.rollMode === "advantage" ? Math.max(...values) : Math.min(...values);
    const index = values.indexOf(Number.isInteger(roll.natural) ? roll.natural : kept);
    flags.fill(false);
    flags[index < 0 ? 0 : index] = true;
  }
  if (roll.source === "character-build" && roll.kind === "abilities" && dice.length === 4) {
    const drop = Number.isInteger(roll.discarded) ? roll.discarded : Math.min(...values);
    const index = values.indexOf(drop);
    if (index >= 0) flags[index] = false;
  }
  return flags;
}
const verdictFor = (success) =>
  success === true
    ? { verdict: text("Successo", "Success"), tone: "success" }
    : success === false
      ? { verdict: text("Fallimento", "Failure"), tone: "failure" }
      : { verdict: null, tone: null };

/**
 * The presentation of one accepted roll for one viewer, or null when this viewer may not
 * see it (a hidden roll is never presented to another identity) or it is not a new roll.
 * `layout` is "check" (BG3 screen: DC, modifiers, success/failure) for a d20 test with a
 * DC, otherwise "tumble" (dice rolling on the table with a summary). `animate` is true
 * only for digital faces accepted now; physical, reused and corrected faces are shown
 * as entered, without motion.
 */
export function describeRoll(state, roll, role, { listing = false } = {}) {
  if (!roll || roll.status === "superseded") return null;
  if (!listing && roll.status === "withdrawn") return null;
  if (!rollVisibleTo(roll, role)) return null;
  // TV-89: a combat roll keeps its attack's audience (state.mjs); whoever may not read its
  // values sees no dice at all, whoever runs the session included for a «Solo io» roll.
  if (
    roll.source === "combat" &&
    roll.audience &&
    roll.audience !== "public" &&
    !canSeeAttemptValues(state, roll, role)
  )
    return null;
  const dice = expandDice(roll.dice, roll.values);
  if (!dice.length || dice.some((d) => !Number.isInteger(d.value))) return null;
  const kept = keptFlags(roll, dice);
  dice.forEach((d, i) => (d.kept = kept[i]));
  const digital =
    roll.mode === "digital" &&
    (!Array.isArray(roll.faceModes) || roll.faceModes.every((m) => m === "digital"));
  const fresh =
    !["reused", "corrected", "withdrawn"].includes(roll.status) && !roll.correctionReason;
  const out = {
    id: roll.id,
    source: roll.source ?? null,
    kind: roll.kind ?? null,
    // TV-141: a disguised creature reads by its disguise, in older rolls too.
    actorName: roll.actorName ? maskedFor(state, role, roll.actorName) : null,
    title: text("Tiro", "Roll"),
    dice,
    modifier: Number.isFinite(roll.modifier) ? roll.modifier : null,
    total: Number.isFinite(roll.total) ? roll.total : null,
    natural: Number.isInteger(roll.natural) ? roll.natural : null,
    dc: null,
    success: null,
    verdict: null,
    tone: null,
    lines: [],
    outcome: null,
    mode: roll.mode === "physical" ? "physical" : roll.mode === "digital" ? "digital" : "unknown",
    animate: digital && fresh,
    status: roll.status ?? "accepted",
    visibility: roll.visibility === "private" ? "private" : "shared",
    controller: roll.controller ?? roll.owner ?? null,
    rollMode: roll.rollMode ?? "normal",
    correctionReason: roll.correctionReason ?? null,
    color: typeof roll.color === "string" ? roll.color : null,
  };
  if (["advantage", "disadvantage"].includes(out.rollMode))
    out.lines.push(
      out.rollMode === "advantage"
        ? text("Vantaggio: si tiene il d20 più alto", "Advantage: the higher d20 is kept")
        : text("Svantaggio: si tiene il d20 più basso", "Disadvantage: the lower d20 is kept"),
    );
  if (roll.source === "combat") describeCombat(state, roll, role, out);
  else if (roll.source === "initiative") {
    out.title = text("Iniziativa", "Initiative");
    if (out.modifier !== null)
      out.lines.push(
        text(
          `Bonus d'iniziativa ${signedNumber(out.modifier)}`,
          `Initiative bonus ${signedNumber(out.modifier)}`,
        ),
      );
  } else if (roll.source === "rest") {
    out.title = text("Dado Vita", "Hit Point Die");
    if (out.modifier !== null)
      out.lines.push(
        text(
          `Modificatore di Costituzione ${signedNumber(out.modifier)} (minimo 1 PF)`,
          `Constitution modifier ${signedNumber(out.modifier)} (at least 1 HP)`,
        ),
      );
  } else if (roll.source === "character-build") {
    out.title =
      roll.kind === "abilities"
        ? text(
            "Punteggio di caratteristica · 4d6, si scarta il più basso",
            "Ability score · 4d6, drop the lowest",
          )
        : text(
            `Punti ferita del livello ${roll.index ?? ""}`.trim(),
            `Hit points for level ${roll.index ?? ""}`.trim(),
          );
  } else if (roll.source === "random-table") {
    out.title = text("Tabella casuale", "Random table");
  } else if (roll.source === "compendium") {
    out.title =
      roll.label && typeof roll.label === "object"
        ? copy(roll.label)
        : text("Compendio", "Compendium");
  } else if (roll.source === "free") {
    out.title = text("Tiro libero", "Free roll");
    if (out.modifier)
      out.lines.push(
        text(
          `Modificatore ${signedNumber(out.modifier)}`,
          `Modifier ${signedNumber(out.modifier)}`,
        ),
      );
  } else if (roll.source === "dice-tray") {
    // B34 (additive): the dice tray's rolls and Heroic Inspiration rerolls carry their own
    // title, kept dice (keep/drop, advantage), DC and recorded success.
    out.title =
      roll.label && typeof roll.label === "object"
        ? copy(roll.label)
        : text("Vassoio dei dadi", "Dice tray");
    if (Array.isArray(roll.kept) && roll.kept.length === out.dice.length)
      out.dice.forEach((d, i) => (d.kept = roll.kept[i] !== false));
    if (Number.isFinite(roll.dc)) {
      out.dc = roll.dc;
      out.success = typeof roll.success === "boolean" ? roll.success : out.total >= out.dc;
      Object.assign(out, verdictFor(out.success));
    }
    for (const m of roll.stack ?? [])
      if (m?.label)
        out.lines.push(join([m.label, text(signedNumber(m.value), signedNumber(m.value))]));
  } else if (roll.source === ID) {
    describeDemo(roll, out);
  } else if (roll.source === "projects") {
    // B54 (additive, review): a downtime project's d20 ability check against its step's DC
    // is the player's own check outside combat, so it gets the BG3 check screen (CRP-131).
    out.title =
      roll.label && typeof roll.label === "object" ? copy(roll.label) : text("Prova", "Check");
    if (Number.isFinite(roll.dc)) {
      out.dc = roll.dc;
      out.success = typeof roll.success === "boolean" ? roll.success : out.total >= out.dc;
      Object.assign(out, verdictFor(out.success));
    }
    const ability = ABILITY_NAMES[roll.ability];
    if (ability && out.modifier !== null)
      out.lines.push(
        text(
          `${ability.it} ${signedNumber(out.modifier)}`,
          `${ability.en} ${signedNumber(out.modifier)}`,
        ),
      );
  }
  if (out.dc === null) out.lines = out.lines.filter(Boolean);
  // C1 (FG hidden DC): a DC the DM set reads «CD nascosta» for players; success still shows.
  if (out.dc !== null && !dcVisibleTo(state, role, dcSetterFor(state, roll))) {
    out.dc = null;
    out.dcHidden = true;
    // A request's stored title names its DC ("… · CD 13"): the player reads «CD nascosta».
    if (out.title && typeof out.title === "object")
      out.title = {
        it: String(out.title.it ?? "").replace(/ · CD \d+$/, " · CD nascosta"),
        en: String(out.title.en ?? "").replace(/ · DC \d+$/, " · DC hidden"),
      };
  }
  // The BG3 roll screen is the player character's check (CRP-131). A creature's save that
  // the DM resolves rolls on the table with its DC and result in the summary, as BG3
  // shows enemy saves in the combat log: several saves in a row never block the DM.
  const npc = roll.source !== ID && state.actors?.[roll.actorId]?.kind === "npc";
  // B61 (owner direction after wave 1): the screen is modal, so it is kept for the check or
  // save with a DC that this identity starts itself outside combat actions. Rolls resolved
  // in combat (attacks, saves, concentration, death saves) and anyone else's roll tumble on
  // the table without holding clicks (Dice So Nice FVT-155, D&D Beyond DDB-152).
  const own = (roll.controller ?? roll.owner ?? null) === role;
  out.layout =
    (out.dc !== null || out.dcHidden === true) &&
    !npc &&
    own &&
    roll.source !== "combat" &&
    dice.filter((d) => d.sides === 20).length === dice.length &&
    dice.length <= 2
      ? "check"
      : "tumble";
  return out;
}
/**
 * Who set a described roll's DC: the tray says so; a request or a DM creature's save DC is the
 * DM's; a rule's DC (death save, concentration, Medicine, practice) and other areas stay "rule".
 */
function dcSetterFor(state, roll) {
  if (roll.source === "dice-tray") return roll.dcBy ?? "player";
  if (roll.source !== "combat" || !["save", "check"].includes(roll.kind)) return "rule";
  return dcSetterOf(
    state,
    (state?.combatAttempts ?? []).find((a) => a.id === roll.attemptId),
  );
}
function describeDemo(roll, out) {
  const label = roll.label ? String(roll.label) : "";
  if (roll.dc !== null && roll.dc !== undefined) {
    const ability = ABILITY_NAMES[roll.ability];
    out.title = label
      ? text(label, label)
      : ability
        ? text(`Tiro salvezza su ${ability.it}`, `${ability.en} saving throw`)
        : text("Prova con CD", "Check against a DC");
    out.dc = roll.dc;
    out.success = typeof roll.success === "boolean" ? roll.success : null;
    Object.assign(out, verdictFor(out.success));
    if (out.modifier !== null)
      out.lines.push(
        ability
          ? text(
              `${ability.it} ${signedNumber(out.modifier)}`,
              `${ability.en} ${signedNumber(out.modifier)}`,
            )
          : text(
              `Modificatore ${signedNumber(out.modifier)}`,
              `Modifier ${signedNumber(out.modifier)}`,
            ),
      );
  } else {
    out.title = label ? text(label, label) : text("Prova i dadi", "Try the dice");
    if (out.modifier)
      out.lines.push(
        text(
          `Modificatore ${signedNumber(out.modifier)}`,
          `Modifier ${signedNumber(out.modifier)}`,
        ),
      );
  }
  out.lines.push(text("Tiro di prova: nessun effetto sul gioco", "Practice roll: no game effect"));
}
function describeCombat(state, roll, role, out) {
  const attempt = (state.combatAttempts ?? []).find((a) => a.id === roll.attemptId);
  const request = attempt?.requests?.find((r) => r.id === roll.requestId);
  // Outcomes as this viewer may read them (hidden targets and vitals stay hidden).
  const projected = attempt ? projectAttempts(state, role).find((a) => a.id === attempt.id) : null;
  const outcome = projected?.outcomes?.find((o) => o.actorId === roll.actorId);
  const name = actionName(projected ?? attempt, roll);
  const sources = (request?.modifierSources ?? []).map((m) =>
    m?.label ? join([m.label, text(signedNumber(m.value), signedNumber(m.value))]) : null,
  );
  // B34 (additive): a check or save the DM requested (roll-requests.mjs) shows its test,
  // DC and success; nothing else is applied.
  if (attempt?.kind === "roll-request") {
    out.title = attempt.rollRequest?.title ? copy(attempt.rollRequest.title) : join([name]);
    if (Number.isFinite(request?.dc)) {
      out.dc = request.dc;
      out.success = out.total >= out.dc;
      Object.assign(out, verdictFor(out.success));
    }
    out.lines.push(...sources.filter(Boolean));
    return;
  }
  if (roll.kind === "attack") {
    out.title = join([text("Attacco", "Attack"), name]);
    const first = projected?.outcomes?.[0];
    if (first && typeof first.hit === "boolean")
      out.outcome = first.hit
        ? first.critical
          ? text("Colpo critico", "Critical hit")
          : text("Colpito", "Hit")
        : text("Mancato", "Miss");
    if (out.modifier !== null)
      out.lines.push(
        text(
          `Bonus d'attacco ${signedNumber(out.modifier)}`,
          `Attack bonus ${signedNumber(out.modifier)}`,
        ),
      );
  } else if (roll.kind === "damage") {
    out.title = join([text("Danni", "Damage"), name]);
    if (out.modifier)
      out.lines.push(
        text(
          `Modificatore ${signedNumber(out.modifier)}`,
          `Modifier ${signedNumber(out.modifier)}`,
        ),
      );
  } else if (roll.kind === "save") {
    const target = attempt?.targets?.find((t) => t.actorId === roll.actorId);
    const dex = target && target.saveModifier !== undefined;
    out.title = join([
      dex
        ? text("Tiro salvezza su Destrezza", "Dexterity saving throw")
        : text("Tiro salvezza", "Saving throw"),
      name,
    ]);
    if (Number.isFinite(target?.saveDC)) {
      out.dc = target.saveDC;
      // Recorded outcome first; otherwise the SRD rule (total ≥ DC), as combat.mjs applies it.
      out.success =
        typeof outcome?.saveSuccess === "boolean" ? outcome.saveSuccess : out.total >= out.dc;
      Object.assign(out, verdictFor(out.success));
    }
    if (out.modifier !== null)
      out.lines.push(
        text(
          `Modificatore del tiro salvezza ${signedNumber(out.modifier)}`,
          `Saving throw modifier ${signedNumber(out.modifier)}`,
        ),
      );
  } else if (roll.kind === "concentration") {
    out.title = join([
      text("Tiro salvezza su Costituzione", "Constitution saving throw"),
      text("Concentrazione", "Concentration"),
    ]);
    if (request?.concentrationName)
      out.lines.push(join([text("Incantesimo", "Spell"), request.concentrationName]));
    if (Number.isFinite(request?.dc)) {
      out.dc = request.dc;
      out.success = typeof request.success === "boolean" ? request.success : out.total >= out.dc;
      Object.assign(out, verdictFor(out.success));
      if (Number.isFinite(request.damage))
        out.lines.push(
          text(
            `CD: 10 o metà dei ${request.damage} danni (max 30)`,
            `DC: 10 or half of ${request.damage} damage (max 30)`,
          ),
        );
    }
    if (out.modifier !== null)
      out.lines.push(
        text(
          `Tiro salvezza su Costituzione ${signedNumber(out.modifier)}`,
          `Constitution save ${signedNumber(out.modifier)}`,
        ),
      );
  } else if (VITALITY.includes(roll.kind)) {
    const vit = outcome?.vitality ?? projected?.outcomes?.[0]?.vitality ?? null;
    if (roll.kind === "death-save") {
      out.title = text("Tiro salvezza contro la morte", "Death saving throw");
      out.dc = 10;
      if (vit) {
        out.success = typeof vit.success === "boolean" ? vit.success : null;
        if (vit.result === "regain-hp")
          Object.assign(out, {
            verdict: text("20 naturale: recupera 1 PF", "Natural 20: regain 1 HP"),
            tone: "success",
          });
        else if (vit.result === "two-failures")
          Object.assign(out, {
            verdict: text("1 naturale: due fallimenti", "Natural 1: two failures"),
            tone: "failure",
          });
        else Object.assign(out, verdictFor(out.success));
      }
    } else if (roll.kind === "medicine") {
      out.title = text("Prova di Saggezza (Medicina)", "Wisdom (Medicine) check");
      out.dc = Number.isFinite(vit?.dc) ? vit.dc : 10;
      if (vit) {
        out.success = typeof vit.success === "boolean" ? vit.success : null;
        Object.assign(out, verdictFor(out.success));
      }
    } else {
      out.title = text("Stabile: ore per recuperare 1 PF", "Stable: hours to regain 1 HP");
      if (Number.isInteger(vit?.hours))
        out.outcome = text(`${vit.hours} ore`, `${vit.hours} hours`);
    }
    if (out.modifier)
      out.lines.push(
        text(
          `Modificatore ${signedNumber(out.modifier)}`,
          `Modifier ${signedNumber(out.modifier)}`,
        ),
      );
  }
  out.lines.push(...sources.filter(Boolean));
}

// ---------------------------------------------------------------- recent rolls

/**
 * The Table's free roll (inspector → "Tira i dadi") as a roll: the core records only a
 * formatted label, read with the chat's own parser (B17) until a structured roll
 * replaces it (B34). Null for any other entry, for Undo corrections and for entries that
 * already carry structured rolls.
 */
export function freeRollFromEntry(entry) {
  if (!entry || entry.kind === "correction" || entry.rolls?.length) return null;
  const parsed = parseFreeRoll(entry.label);
  if (!parsed) return null;
  return {
    ...parsed,
    id: `free:${entry.id}`,
    logId: entry.id,
    controller: entry.controller ?? null,
    owner: entry.controller ?? null,
    visibility: entry.visibility === "private" ? "private" : "shared",
    rollMode: "normal",
  };
}

/**
 * Recent accepted rolls this viewer may see: the commit log (combat, initiative, Hit
 * Dice, character creation, the Table's free roll), the Compendium and the demo. Newest
 * first. A roll whose commit a gameplay Undo reverted stays listed as evidence, marked
 * `reverted` (the same rule as combat-ui's roll history).
 * `neighbours.tray` (W2b1 integration): the dice tray's domain (B34), passed by the UI when
 * that area is present; its rolls replaced the Table's free roll and are listed with the
 * tray's own audience (`canSeeResult`) and event shape (`rollEvent`). A withdrawn tray roll
 * stays listed as evidence, marked `reverted`.
 */
export function recentRolls(state, role, limit = 8, neighbours = {}) {
  const reverted = new Set(
    (state.log ?? []).filter((entry) => entry.kind === "correction").map((e) => e.revertsId),
  );
  const items = [];
  for (const entry of state.log ?? []) {
    const undone = reverted.has(entry.id);
    const free = freeRollFromEntry(entry);
    for (const roll of free ? [free] : (entry.rolls ?? []))
      if (roll.status !== "superseded" && rollVisibleTo(roll, role))
        items.push({
          key: roll.id,
          time: entry.time ?? "",
          roll,
          own: roll.controller === role,
          reverted: undone,
        });
  }
  for (const record of state.ext?.[ID]?.rolls ?? [])
    if (canSeeDemo(record, role, state))
      items.push({
        key: record.id,
        time: record.at,
        roll: demoRollEvent(record),
        record,
        own: record.by === role,
        reverted: false,
      });
  const tray = neighbours.tray;
  for (const record of (tray && state.ext?.["dice-tray"]?.rolls) || [])
    if (record && Array.isArray(record.groups) && tray.canSeeResult(record, role, state))
      items.push({
        key: record.id,
        time: record.at ?? "",
        roll: tray.rollEvent(record),
        own: record.by === role,
        reverted: record.status === "withdrawn",
      });
  for (const record of state.ext?.["compendium-rolls"]?.rolls ?? []) {
    const roll = record && Array.isArray(record.faces) ? compendiumRollEvent(record) : null;
    if (roll && rollVisibleTo(roll, role))
      items.push({
        key: record.id,
        time: record.at ?? "",
        roll,
        own: record.by === role,
        reverted: false,
      });
  }
  items.sort((a, b) => String(b.time).localeCompare(String(a.time)));
  // Only rolls that can be presented count towards the limit.
  const out = [];
  for (const item of items) {
    if (out.length >= limit) break;
    const view = describeRoll(state, item.roll, role, { listing: true });
    if (view) out.push({ ...item, view });
  }
  return out;
}
