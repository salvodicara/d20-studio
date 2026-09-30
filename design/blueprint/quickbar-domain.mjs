// B53 — Personal commands and quick bar: pure domain (no DOM).
//
// Patterns (market census): Roll20 macro quick bar and token actions (R20-148, R20-035:
// buttons on a bottom bar, rename, colour, drag to reorder, Shift+click edits, the
// selected token's actions); Owlbear Dice+ saved rolls in shareable panels (VTL-174:
// name, notation validated live, colour, drag to reorder also by touch, carousel of
// panels, share a panel as a copy, copy as text); Let's Role QuickBar (VTL-184: "+" makes
// a custom action, right-click edits); Foundry hotbar (FVT-194: 5 pages × 10 slots, keys
// 1–0; FVT-195 rows of every page); D&D Beyond custom actions (DDB-040: activation type,
// "display as attack" adds to-hit and damage); Alchemy composable actions (VTL-028:
// several rolls chained with each result visible); BG3 hotbar per character (CRP-098).
//
// Rules: D&D 2024, SRD 5.2.1. Every digital face comes from the core dice service
// (state.mjs rollDie); plans, faces and totals from srd-compendium.mjs (the Compendium's
// own dice plans: Advantage/Disadvantage keep one d20, a Critical Hit rolls the damage
// dice twice). A shortcut grants no power or resource (F-064): in combat an attack of a
// custom action spends the creature's Action, Bonus Action or Reaction like the core.
import { rollDie } from "./state.mjs";
import { rollPlan, resolvePlan, formulaText, validFace, parseDice } from "./srd-compendium.mjs";
import { listActions, isIncapacitated } from "./combat.mjs";
import { getEffectiveActor } from "./forms-companions.mjs";
import { canControlActor, canViewActor, isActorAvailable } from "./character-access.mjs";
import { getById, SPELLS, ITEMS } from "./srd-sample.mjs";
import { skills as SKILL_LIST } from "./character-rules.mjs";
// The sheet's own effective values (B37: class save proficiency, skill proficiency, reasoned
// overrides and active forms), so a slot rolls the number the sheet shows (review of B53).
import {
  statValue,
  rollProfile,
  effectiveRollMode,
  spendFeatureUse,
} from "./sheet-plus-domain.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const ID = "quickbar";
export const ROLLS = "quickbar-rolls";
export const VERSION = 1;
export const SLOT_COUNT = 10;
export const MAX_PAGES = 5;
export const MAX_STEPS = 6;
export const MAX_LABEL = 24;
export const MAX_NAME = 40;
export const MAX_RUNS = 12;
export const MAX_ROLLS = 200;
export const KEYS = Object.freeze(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
// Sample stamps follow the visit (sample-clock.mjs), computed at seed time.
const seedAt = () => sampleDate("2026-09-20T18:00:00.000Z");

const L = (it, en) => ({ it, en });
const copy = (value) => structuredClone(value);
const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const str = (value) => (typeof value === "string" ? value : "");
const int = (value, fallback = 0) => (Number.isInteger(value) ? value : fallback);
/** A refusal with its message in both languages (shown by the shell as a refusal). */
export function fail(it, en) {
  return Object.assign(new Error(en), { it, en });
}
const newId = (prefix) => `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;

export const COLORS = Object.freeze([
  { id: "gold", name: L("Oro", "Gold") },
  { id: "red", name: L("Rosso", "Red") },
  { id: "blue", name: L("Blu", "Blue") },
  { id: "green", name: L("Verde", "Green") },
  { id: "purple", name: L("Viola", "Purple") },
  { id: "grey", name: L("Grigio", "Grey") },
]);
const COLOR_IDS = COLORS.map((c) => c.id);
export const ABILITIES = Object.freeze({
  str: L("Forza", "Strength"),
  dex: L("Destrezza", "Dexterity"),
  con: L("Costituzione", "Constitution"),
  int: L("Intelligenza", "Intelligence"),
  wis: L("Saggezza", "Wisdom"),
  cha: L("Carisma", "Charisma"),
});
const ABILITY_IDS = Object.keys(ABILITIES);
// The 18 skills of the 2024 rules with their ability (SRD 5.2.1, character-rules.mjs).
export const SKILLS = Object.freeze(Object.fromEntries(SKILL_LIST.map((s) => [s.id, s])));
const skillOf = (ability, skill) => (SKILLS[skill]?.ability === ability ? SKILLS[skill] : null);
export const ACTIVATIONS = Object.freeze({
  action: L("Azione", "Action"),
  bonus: L("Azione bonus", "Bonus Action"),
  reaction: L("Reazione", "Reaction"),
  none: L("Nessuna", "None"),
});
// The thirteen damage types of the 2024 rules (SRD 5.2.1 glossary, "Damage Types").
export const DAMAGE_TYPES = Object.freeze({
  acid: L("acido", "acid"),
  bludgeoning: L("contundenti", "bludgeoning"),
  cold: L("freddo", "cold"),
  fire: L("fuoco", "fire"),
  force: L("forza", "force"),
  lightning: L("fulmine", "lightning"),
  necrotic: L("necrotici", "necrotic"),
  piercing: L("perforanti", "piercing"),
  poison: L("veleno", "poison"),
  psychic: L("psichici", "psychic"),
  radiant: L("radiosi", "radiant"),
  slashing: L("taglienti", "slashing"),
  thunder: L("tuono", "thunder"),
});

// Sources quoted by the reasons the bar shows (SRD 5.2.1 EN/IT pages from the catalogue).
const rule = (slug) => getById(`srd2024:rule:${slug}`)?.source ?? null;
export const RULES = Object.freeze({
  advantage: rule("advantage"),
  disadvantage: rule("disadvantage"),
  criticalHit: rule("critical-hit"),
  bonusAction: rule("bonus-action"),
  reaction: rule("reaction"),
  attack: rule("attack"),
  incapacitated: getById("srd2024:condition:incapacitated")?.source ?? null,
});
const pages = (source) =>
  source ? `SRD 5.2.1 EN ${source.en?.pages?.join("–")} / IT ${source.it?.pages?.join("–")}` : "";

// ------------------------------------------------------------------ formulas (Dice+)

const SIDES = [4, 6, 8, 10, 12, 20, 100];
/**
 * Dice+ notation, validated live: "1d20+5", "d20 - 1", "2d6+1d4+3". Returns
 * `{ ok: true, groups: [{count, sides}], modifier, d20, text }` or `{ ok: false, error }`.
 * A lone "1d20 ± n" is a D20 Test (Advantage and Disadvantage apply); anything else sums.
 */
export function parseFormula(input) {
  const raw = String(input ?? "")
    .replace(/−/g, "-")
    .replace(/\s+/g, "")
    .toLowerCase();
  const bad = (it, en) => ({ ok: false, error: L(it, en) });
  if (!raw) return bad("Scrivi una formula, per esempio 1d20+5.", "Write a formula, e.g. 1d20+5.");
  if (raw.length > 40) return bad("Formula troppo lunga.", "Formula too long.");
  if (/[+-]$/.test(raw))
    return bad(
      "Formula incompleta: manca un numero dopo il segno.",
      "Incomplete formula: a number is missing after the sign.",
    );
  const terms = raw.match(/[+-]?[^+-]+/g) ?? [];
  if (terms.join("") !== raw || !terms.length)
    return bad("Formula non valida.", "Invalid formula.");
  const groups = [];
  let modifier = 0;
  for (const term of terms) {
    const sign = term.startsWith("-") ? -1 : 1;
    const body = term.replace(/^[+-]/, "");
    const die = body.match(/^(\d{0,2})d(\d{1,3})$/);
    if (die) {
      const count = die[1] === "" ? 1 : Number(die[1]);
      const sides = Number(die[2]);
      if (sign < 0) return bad("I dadi non si sottraggono.", "Dice cannot be subtracted.");
      if (!SIDES.includes(sides))
        return bad(
          `d${sides} non esiste: usa d4, d6, d8, d10, d12, d20 o d100.`,
          `d${sides} does not exist: use d4, d6, d8, d10, d12, d20 or d100.`,
        );
      if (count < 1 || count > 20)
        return bad("Da 1 a 20 dadi per gruppo.", "From 1 to 20 dice per group.");
      groups.push({ count, sides });
    } else if (/^\d{1,3}$/.test(body)) modifier += sign * Number(body);
    else
      return bad(
        `«${body}» non è un dado né un numero.`,
        `“${body}” is neither a die nor a number.`,
      );
  }
  if (!groups.length)
    return bad("Serve almeno un dado, per esempio 1d20.", "At least one die is needed, e.g. 1d20.");
  if (groups.length > 4) return bad("Al massimo 4 gruppi di dadi.", "At most 4 dice groups.");
  if (groups.reduce((sum, g) => sum + g.count, 0) > 20)
    return bad("Al massimo 20 dadi in un tiro.", "At most 20 dice in one roll.");
  if (Math.abs(modifier) > 50)
    return bad("Il modificatore va da −50 a +50.", "The modifier goes from −50 to +50.");
  const d20 = groups.length === 1 && groups[0].count === 1 && groups[0].sides === 20;
  const text =
    groups.map((g) => `${g.count}d${g.sides}`).join("+") +
    (modifier ? (modifier > 0 ? "+" : "-") + Math.abs(modifier) : "");
  return { ok: true, groups, modifier, d20, text };
}
const signedText = (n) => (n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`);

// ------------------------------------------------------------------ actors and sheet values

export const abilityMod = (score) =>
  Number.isFinite(score) ? Math.floor((Number(score) - 10) / 2) : null;
const effective = (state, actorId) => {
  const actor = state.actors?.[actorId];
  return actor ? getEffectiveActor(actor) : null;
};
export function proficiencyOf(actor) {
  if (Number.isInteger(actor?.proficiencyBonus)) return actor.proficiencyBonus;
  if (Number.isInteger(actor?.combatProfile?.proficiencyBonus))
    return actor.combatProfile.proficiencyBonus;
  const level = Number.isInteger(actor?.level) ? actor.level : 1;
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}
/**
 * The sheet's modifier for an ability check, a saving throw or a skill check: the ability
 * modifier for a check; for saves and skills the effective value the sheet shows (B37
 * statValue: class save proficiency, skill proficiency, reasoned overrides, forms). Null when
 * the sheet has neither the score nor a recorded value.
 */
export function checkBonus(state, actorId, ability, type = "check", skill = null) {
  const actor = effective(state, actorId);
  if (!actor || !ABILITY_IDS.includes(ability)) return null;
  if (type === "check") return abilityMod(actor.abilities?.[ability]);
  if (type === "skill" && !skillOf(ability, skill)) return null;
  if (type !== "save" && type !== "skill") return null;
  const recorded = type === "save" ? actor.savingThrows?.[ability] : actor.skillModifiers?.[skill];
  if (!Number.isFinite(recorded) && abilityMod(actor.abilities?.[ability]) === null) return null;
  const value = statValue(state, actorId, type === "save" ? `save:${ability}` : `skill:${skill}`);
  return Number.isFinite(value.total) ? value.total : null;
}
export const checkName = (ability, type, skill = null) =>
  type === "save"
    ? L(`Tiro salvezza su ${ABILITIES[ability]?.it}`, `${ABILITIES[ability]?.en} saving throw`)
    : type === "skill"
      ? L(
          `Prova di ${ABILITIES[ability]?.it} (${SKILLS[skill]?.name.it})`,
          `${ABILITIES[ability]?.en} (${SKILLS[skill]?.name.en}) check`,
        )
      : L(`Prova di ${ABILITIES[ability]?.it}`, `${ABILITIES[ability]?.en} check`);
// What a 64 px slot can show (the full name stays in its accessible name and tooltip).
const SHORT = {
  str: L("For", "Str"),
  dex: L("Des", "Dex"),
  con: L("Cos", "Con"),
  int: L("Int", "Int"),
  wis: L("Sag", "Wis"),
  cha: L("Car", "Cha"),
};
export const checkShortName = (ability, type, skill = null) =>
  type === "save"
    ? L(`TS ${SHORT[ability]?.it}`, `${SHORT[ability]?.en} save`)
    : type === "skill"
      ? copy(SKILLS[skill]?.name ?? L(skill, skill))
      : L(`Prova ${SHORT[ability]?.it}`, `${SHORT[ability]?.en} check`);

// ------------------------------------------------------------------ custom actions (DDB-040)

/** SRD entries a custom action can start from: weapons and spells with an attack roll. */
export function customTemplates() {
  const weapons = ITEMS.filter((item) => item.weapon?.damage?.dice).map((item) => ({
    id: item.id,
    kind: "weapon",
    name: copy(item.name),
    dice: item.weapon.damage.dice,
    type: item.weapon.damage.type,
    finesse: (item.weapon.properties ?? []).includes("finesse"),
    ranged: item.weapon.type === "ranged",
  }));
  const spells = SPELLS.filter((s) => s.attack && s.damage?.[0]?.dice).map((s) => ({
    id: s.id,
    kind: "spell",
    name: copy(s.name),
    dice: s.damage[0].dice,
    type: s.damage[0].types?.[0] ?? "force",
  }));
  return [...weapons, ...spells];
}
/** Fills a custom action from an SRD entry for this actor (the person can still edit it). */
export function templateAction(state, actorId, templateId) {
  const template = customTemplates().find((t) => t.id === templateId);
  if (!template) throw fail("Voce SRD non trovata.", "SRD entry not found.");
  const actor = effective(state, actorId);
  let ability = "str";
  if (template.kind === "spell")
    ability = actor?.combatProfile?.spellcastingAbility ?? actor?.spellcastingAbility ?? "int";
  else if (template.ranged) ability = "dex";
  else if (template.finesse)
    ability =
      (abilityMod(actor?.abilities?.dex) ?? 0) > (abilityMod(actor?.abilities?.str) ?? 0)
        ? "dex"
        : "str";
  return {
    name: template.name,
    activation: "action",
    attack: { ability, proficient: true, bonus: 0 },
    damage: {
      dice: template.dice,
      ability: template.kind === "weapon",
      bonus: 0,
      type: DAMAGE_TYPES[template.type] ? template.type : "force",
    },
    srdId: template.id,
  };
}
/** Validated custom action from form input (throws a refusal in both languages). */
export function validateCustomAction(input) {
  const name = str(input?.name).trim().slice(0, MAX_NAME);
  if (!name) throw fail("Dai un nome all'azione.", "Name the action.");
  const activation = ACTIVATIONS[input?.activation] ? input.activation : null;
  if (!activation) throw fail("Scegli il tipo di attivazione.", "Choose the activation type.");
  const bound = (value, min, max, it, en) => {
    const n = Number(value ?? 0);
    if (!Number.isInteger(n) || n < min || n > max) throw fail(it, en);
    return n;
  };
  let attack = null;
  if (input?.attack) {
    if (!ABILITY_IDS.includes(input.attack.ability))
      throw fail("Scegli la caratteristica del tiro per colpire.", "Choose the attack ability.");
    attack = {
      ability: input.attack.ability,
      proficient: input.attack.proficient === true,
      bonus: bound(
        input.attack.bonus,
        -20,
        20,
        "Il bonus per colpire va da −20 a +20.",
        "The attack bonus goes from −20 to +20.",
      ),
    };
  }
  let damage = null;
  if (input?.damage) {
    const dice = str(input.damage.dice).replace(/\s+/g, "").toLowerCase();
    const parsed = parseDice(dice);
    if (!parsed || parsed.modifier)
      throw fail(
        "Dadi del danno non validi: scrivi per esempio 1d8.",
        "Invalid damage dice: write for example 1d8.",
      );
    if (!DAMAGE_TYPES[input.damage.type])
      throw fail("Scegli il tipo di danno.", "Choose the damage type.");
    damage = {
      dice: `${parsed.count}d${parsed.sides}`,
      ability: input.damage.ability === true,
      bonus: bound(
        input.damage.bonus,
        -20,
        20,
        "Il bonus ai danni va da −20 a +20.",
        "The damage bonus goes from −20 to +20.",
      ),
      type: input.damage.type,
    };
    if (damage.ability && !attack)
      throw fail(
        "Per sommare la caratteristica ai danni serve il tiro per colpire.",
        "Adding the ability to damage needs the attack roll.",
      );
  }
  if (!attack && !damage)
    throw fail(
      "Un'azione personalizzata ha un tiro per colpire, un danno o entrambi.",
      "A custom action has an attack roll, damage or both.",
    );
  const srdId =
    typeof input?.srdId === "string" && customTemplates().some((t) => t.id === input.srdId)
      ? input.srdId
      : null;
  return {
    name,
    activation,
    attack,
    damage,
    notes: str(input?.notes).trim().slice(0, 300),
    srdId,
  };
}
/** What the sheet shows for a custom action: to-hit and damage with the sheet's values. */
export function customView(state, actorId, action) {
  const actor = effective(state, actorId);
  const pb = proficiencyOf(actor);
  const toHit = action.attack
    ? (abilityMod(actor?.abilities?.[action.attack.ability]) ?? 0) +
      (action.attack.proficient ? pb : 0) +
      int(action.attack.bonus)
    : null;
  const damageMod = action.damage
    ? (action.damage.ability && action.attack
        ? (abilityMod(actor?.abilities?.[action.attack.ability]) ?? 0)
        : 0) + int(action.damage.bonus)
    : null;
  const damageText = action.damage
    ? `${action.damage.dice}${damageMod ? ` ${signedText(damageMod)}` : ""}`
    : "";
  return {
    toHit,
    damageMod,
    damageText,
    type: action.damage ? DAMAGE_TYPES[action.damage.type] : null,
    summary: L(
      [
        toHit !== null ? `${toHit < 0 ? "−" : "+"}${Math.abs(toHit)} per colpire` : "",
        action.damage ? `${damageText} ${DAMAGE_TYPES[action.damage.type].it}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      [
        toHit !== null ? `${toHit < 0 ? "−" : "+"}${Math.abs(toHit)} to hit` : "",
        action.damage ? `${damageText} ${DAMAGE_TYPES[action.damage.type].en}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ),
  };
}
export const customActionsOf = (slice, actorId) =>
  Array.isArray(slice?.customActions?.[actorId]) ? slice.customActions[actorId] : [];
/** Creates or updates a custom action on a sheet the identity controls. */
export function saveCustomAction(state, slice, role, actorId, input, { id = null, now } = {}) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    throw fail(
      "Puoi modificare solo le schede che controlli.",
      "You can edit only sheets you control.",
    );
  const data = validateCustomAction(input);
  const list = (slice.customActions[actorId] ??= []);
  if (id) {
    const row = list.find((a) => a.id === id);
    if (!row) throw fail("Azione personalizzata non trovata.", "Custom action not found.");
    Object.assign(row, data, { updatedAt: now, updatedBy: role });
    return row;
  }
  if (list.length >= 20)
    throw fail(
      "Al massimo 20 azioni personalizzate per scheda.",
      "At most 20 custom actions per sheet.",
    );
  const row = { id: newId("qbca"), ...data, by: role, at: now };
  list.push(row);
  return row;
}
export function removeCustomAction(state, slice, role, actorId, id) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    throw fail(
      "Puoi modificare solo le schede che controlli.",
      "You can edit only sheets you control.",
    );
  const list = customActionsOf(slice, actorId);
  const index = list.findIndex((a) => a.id === id);
  if (index < 0) throw fail("Azione personalizzata non trovata.", "Custom action not found.");
  return list.splice(index, 1)[0];
}

// ------------------------------------------------------------------ seed and normalization

const slotOf = (id, kind, ref, color, label = null) => ({ id, kind, ref, color, label, uses: 0 });
const emptySlots = () => Array.from({ length: SLOT_COUNT }, () => null);
const pageOf = (id, name, filled) => {
  const slots = emptySlots();
  filled.forEach((slot, i) => (slots[i] = slot));
  return { id, name, slots };
};
/** Synthetic sample bars for the demo actors (Livia, Mira, Doran, the Sentinel). */
export function seedQuickbar(state = {}) {
  const has = (id) => Boolean(state.actors?.[id]);
  const bars = { player: {}, dm: {} };
  if (has("livia") || !state.actors)
    bars.player.livia = {
      pages: [
        pageOf("qb-livia-1", L("Combattimento", "Combat"), [
          slotOf("qb-livia-fire-bolt", "action", { actionId: "fire-bolt" }, "red"),
          slotOf("qb-livia-missile", "action", { actionId: "magic-missile" }, "purple"),
          slotOf("qb-livia-staff", "action", { actionId: "quarterstaff" }, "grey"),
        ]),
      ],
    };
  // PG-77 (BG3 class actions on the hotbar): Mira's Wild Shape sits on her bar with the uses
  // left from the sheet's limited uses (Doran's Second Wind and Action Surge are in the tray).
  const featureSlot = (slotId, actorId, suffix, color) => {
    const feature = (state.actors?.[actorId]?.features ?? []).find((row) =>
      String(row.definitionId ?? row.id).endsWith(suffix),
    );
    return feature ? slotOf(slotId, "feature", { featureId: feature.id }, color) : null;
  };
  if (has("mira"))
    bars.player.mira = {
      pages: [
        pageOf("qb-mira-1", L("Natura", "Nature"), [
          slotOf(
            "qb-mira-perception",
            "roll",
            { formula: "1d20+5" },
            "green",
            L("Percezione", "Perception"),
          ),
          slotOf("qb-mira-nature", "roll", { formula: "1d20+3" }, "green", L("Natura", "Nature")),
          slotOf("qb-mira-staff", "action", { actionId: "quarterstaff" }, "grey"),
          featureSlot("qb-mira-wild-shape", "mira", "wild-shape", "green"),
        ]),
      ],
    };
  if (has("doran") || !state.actors)
    bars.dm.doran = {
      pages: [
        pageOf("qb-doran-1", L("Doran", "Doran"), [
          slotOf("qb-doran-con-save", "check", { ability: "con", type: "save" }, "blue"),
          slotOf("qb-doran-str", "check", { ability: "str", type: "check" }, "gold"),
        ]),
      ],
    };
  if (has("goblin-1"))
    bars.dm["goblin-1"] = {
      pages: [
        pageOf("qb-sentinel-1", L("Sentinella", "Sentinel"), [
          slotOf(
            "qb-sentinel-stealth",
            "roll",
            { formula: "1d20+6" },
            "grey",
            L("Furtività", "Stealth"),
          ),
        ]),
      ],
    };
  return {
    bars,
    // Doran's sheet already carries the fighter's longsword as a custom action (DDB-040):
    // SRD 5.2.1 Longsword 1d8 slashing, Versatile 1d10, mastery Sap (EN 91 / IT 103).
    customActions:
      has("doran") || !state.actors
        ? {
            doran: [
              {
                id: "qb-doran-longsword",
                name: "Attacco con spada",
                activation: "action",
                attack: { ability: "str", proficient: true, bonus: 0 },
                damage: { dice: "1d8", ability: true, bonus: 0, type: "slashing" },
                // X-A2: a player's note is written in one language (the group's), not
                // repeated in English under the Italian line.
                notes: "Spada lunga (SRD 5.2.1): versatile 1d10 a due mani; padronanza Fiaccare.",
                srdId: "srd2024:item:longsword",
                by: "dm",
                at: seedAt(),
              },
            ],
          }
        : {},
    runs: [],
    live: [],
  };
}
const validLabel = (value) =>
  value === null ||
  typeof value === "string" ||
  (isObject(value) && typeof value.it === "string" && typeof value.en === "string");
function normalizeSlot(slot) {
  if (!isObject(slot) || typeof slot.id !== "string") return null;
  if (!["action", "custom", "check", "roll", "sequence", "feature"].includes(slot.kind))
    return null;
  return {
    id: slot.id,
    kind: slot.kind,
    ref: isObject(slot.ref) ? copy(slot.ref) : {},
    color: COLOR_IDS.includes(slot.color) ? slot.color : "gold",
    label: validLabel(slot.label ?? null) ? (slot.label ?? null) : null,
    uses: int(slot.uses),
  };
}
function normalizeBar(bar) {
  const list = Array.isArray(bar?.pages) ? bar.pages : [];
  const pages = list.slice(0, MAX_PAGES).map((page, i) => {
    const slots = emptySlots();
    (Array.isArray(page?.slots) ? page.slots : [])
      .slice(0, SLOT_COUNT)
      .forEach((slot, j) => (slots[j] = normalizeSlot(slot)));
    return {
      id: typeof page?.id === "string" ? page.id : `qb-page-${i}`,
      name: validLabel(page?.name ?? null) && page?.name ? page.name : `${i + 1}`,
      slots,
      ...(isObject(page?.sharedFrom) ? { sharedFrom: copy(page.sharedFrom) } : {}),
    };
  });
  return { pages };
}
export function normalizeQuickbar(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Quick bar data comes from a newer version");
  const out = { bars: {}, customActions: {}, runs: [], live: [] };
  for (const [role, byActor] of Object.entries(isObject(slice?.bars) ? slice.bars : {})) {
    if (!isObject(byActor)) continue;
    out.bars[role] = {};
    for (const [actorId, bar] of Object.entries(byActor))
      out.bars[role][actorId] = normalizeBar(bar);
  }
  for (const [actorId, list] of Object.entries(
    isObject(slice?.customActions) ? slice.customActions : {},
  ))
    out.customActions[actorId] = (Array.isArray(list) ? list : []).filter(
      (a) => isObject(a) && typeof a.id === "string" && typeof a.name === "string",
    );
  out.runs = (Array.isArray(slice?.runs) ? slice.runs : [])
    .filter((run) => isObject(run) && typeof run.id === "string" && Array.isArray(run.steps))
    .slice(-MAX_RUNS * 4);
  out.live = (Array.isArray(slice?.live) ? slice.live : [])
    .filter((id) => typeof id === "string")
    .slice(-MAX_ROLLS);
  return out;
}
export const emptyRolls = () => ({ rolls: [] });
export function normalizeRolls(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Quick bar rolls come from a newer version");
  return {
    rolls: (Array.isArray(slice?.rolls) ? slice.rolls : [])
      .filter((r) => isObject(r) && typeof r.id === "string" && Array.isArray(r.values))
      .slice(-MAX_ROLLS),
  };
}

// ------------------------------------------------------------------ bars and slots

/** This identity's bar for the actor (read only; an empty one-page bar when absent). */
export function barOf(slice, role, actorId) {
  return (
    slice?.bars?.[role]?.[actorId] ?? {
      pages: [{ id: "qb-new", name: L("Pagina 1", "Page 1"), slots: emptySlots() }],
      virtual: true,
    }
  );
}
function mutableBar(slice, role, actorId) {
  slice.bars[role] ??= {};
  slice.bars[role][actorId] ??= {
    pages: [{ id: newId("qbp"), name: L("Pagina 1", "Page 1"), slots: emptySlots() }],
  };
  return slice.bars[role][actorId];
}
const findSlot = (bar, slotId) => {
  for (let p = 0; p < bar.pages.length; p++) {
    const index = bar.pages[p].slots.findIndex((s) => s?.id === slotId);
    if (index >= 0) return { page: p, index, slot: bar.pages[p].slots[index] };
  }
  return null;
};
export const slotAt = (slice, role, actorId, page, index) =>
  barOf(slice, role, actorId).pages[page]?.slots[index] ?? null;
function requireControl(state, role, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor || !isActorAvailable(actor))
    throw fail("La creatura non è disponibile.", "The creature is not available.");
  if (!canControlActor(actor, role, state))
    throw fail(
      `Non controlli ${actor.name}: la barra è di chi la gioca.`,
      `You do not control ${actor.name}: the bar belongs to whoever plays it.`,
    );
  return actor;
}
const cleanLabel = (value) => {
  if (value === null || value === undefined) return null;
  if (isObject(value)) return copy(value);
  const text = String(value).trim().slice(0, MAX_LABEL);
  return text || null;
};
function validateStep(step) {
  if (step?.kind === "roll") {
    const parsed = parseFormula(step.formula);
    if (!parsed.ok) throw Object.assign(new Error(parsed.error.en), parsed.error);
    const label = cleanLabel(step.label);
    return { kind: "roll", formula: parsed.text, label: label ?? parsed.text };
  }
  if (step?.kind === "check") {
    if (
      !ABILITY_IDS.includes(step.ability) ||
      !["check", "save", "skill"].includes(step.type) ||
      (step.type === "skill" && !skillOf(step.ability, step.skill))
    )
      throw fail("Prova non valida.", "Invalid check.");
    return step.type === "skill"
      ? { kind: "check", ability: step.ability, type: "skill", skill: step.skill }
      : { kind: "check", ability: step.ability, type: step.type };
  }
  if (step?.kind === "custom") {
    if (typeof step.customId !== "string" || !step.customId)
      throw fail("Azione personalizzata non valida.", "Invalid custom action.");
    return { kind: "custom", customId: step.customId };
  }
  throw fail(
    "Una sequenza contiene tiri salvati, prove e azioni personalizzate.",
    "A sequence holds saved rolls, checks and custom actions.",
  );
}
/** A slot definition from the tray or the add dialog, validated. */
export function makeSlot(state, slice, actorId, item) {
  const color = COLOR_IDS.includes(item?.color) ? item.color : "gold";
  const label = cleanLabel(item?.label);
  if (item?.kind === "action") {
    if (!listActions(state, actorId).some((a) => a.id === item.ref?.actionId))
      throw fail("Azione della scheda non disponibile.", "Sheet action not available.");
    return slotOf(newId("qbs"), "action", { actionId: item.ref.actionId }, color, label);
  }
  if (item?.kind === "custom") {
    if (!customActionsOf(slice, actorId).some((a) => a.id === item.ref?.customId))
      throw fail("Azione personalizzata non trovata.", "Custom action not found.");
    return slotOf(newId("qbs"), "custom", { customId: item.ref.customId }, color, label);
  }
  if (item?.kind === "feature") {
    if (!limitedFeature(state, actorId, item.ref?.featureId))
      throw fail(
        "Capacità con usi limitati non trovata sulla scheda.",
        "Limited-use feature not found on the sheet.",
      );
    return slotOf(newId("qbs"), "feature", { featureId: item.ref.featureId }, color, label);
  }
  if (item?.kind === "check") {
    const { kind, ...ref } = validateStep({ kind: "check", ...item.ref });
    return slotOf(newId("qbs"), kind, ref, color, label);
  }
  if (item?.kind === "roll") {
    const parsed = parseFormula(item.ref?.formula);
    if (!parsed.ok) throw Object.assign(new Error(parsed.error.en), parsed.error);
    if (!label) throw fail("Dai un nome al tiro salvato.", "Name the saved roll.");
    return slotOf(newId("qbs"), "roll", { formula: parsed.text }, color, label);
  }
  if (item?.kind === "sequence") {
    const steps = (Array.isArray(item.ref?.steps) ? item.ref.steps : []).map(validateStep);
    if (steps.length < 2)
      throw fail("Una sequenza ha almeno due passi.", "A sequence has at least two steps.");
    if (steps.length > MAX_STEPS)
      throw fail(`Al massimo ${MAX_STEPS} passi.`, `At most ${MAX_STEPS} steps.`);
    if (!label) throw fail("Dai un nome alla sequenza.", "Name the sequence.");
    return slotOf(newId("qbs"), "sequence", { steps }, color, label);
  }
  throw fail("Elemento non riconosciuto.", "Unknown item.");
}
/** Puts a new slot at page/index (the first free one of that page when index is null). */
export function addSlot(state, slice, role, actorId, item, { page = 0, index = null } = {}) {
  requireControl(state, role, actorId);
  const bar = mutableBar(slice, role, actorId);
  const target = bar.pages[page];
  if (!target) throw fail("Pagina non trovata.", "Page not found.");
  const at = index ?? target.slots.findIndex((s) => !s);
  if (!Number.isInteger(at) || at < 0 || at >= SLOT_COUNT)
    throw fail(
      "Questa pagina è piena: scegli una casella o un'altra pagina.",
      "This page is full: choose a slot or another page.",
    );
  if (target.slots[at])
    throw fail(
      "La casella è occupata: trascina sopra per sostituire o scegline una vuota.",
      "The slot is taken: choose an empty one.",
    );
  const slot = makeSlot(state, slice, actorId, item);
  target.slots[at] = slot;
  return { slot, page, index: at };
}
/** Rename, recolour, change a saved roll's formula or a sequence's steps. */
export function updateSlot(state, slice, role, actorId, slotId, patch) {
  requireControl(state, role, actorId);
  const found = findSlot(mutableBar(slice, role, actorId), slotId);
  if (!found) throw fail("Casella non trovata.", "Slot not found.");
  const { slot } = found;
  if ("label" in patch) {
    const label = cleanLabel(patch.label);
    if (!label && ["roll", "sequence"].includes(slot.kind))
      throw fail("Il nome non può restare vuoto.", "The name cannot be empty.");
    slot.label = label;
  }
  if ("color" in patch) {
    if (!COLOR_IDS.includes(patch.color)) throw fail("Colore non valido.", "Invalid colour.");
    slot.color = patch.color;
  }
  if ("formula" in patch && slot.kind === "roll") {
    const parsed = parseFormula(patch.formula);
    if (!parsed.ok) throw Object.assign(new Error(parsed.error.en), parsed.error);
    slot.ref.formula = parsed.text;
  }
  if ("steps" in patch && slot.kind === "sequence") {
    const steps = patch.steps.map(validateStep);
    if (steps.length < 2 || steps.length > MAX_STEPS)
      throw fail(
        `Una sequenza ha da 2 a ${MAX_STEPS} passi.`,
        `A sequence has 2 to ${MAX_STEPS} steps.`,
      );
    slot.ref.steps = steps;
  }
  return slot;
}
/**
 * Moves a slot to page/index. An occupied destination swaps with it (Foundry's hotbar and
 * Roll20's quick bar exchange the two buttons); a move onto itself changes nothing.
 */
export function moveSlot(state, slice, role, actorId, slotId, { page, index }) {
  requireControl(state, role, actorId);
  const bar = mutableBar(slice, role, actorId);
  const from = findSlot(bar, slotId);
  if (!from) throw fail("Casella non trovata.", "Slot not found.");
  if (!bar.pages[page] || !Number.isInteger(index) || index < 0 || index >= SLOT_COUNT)
    throw fail("Posizione non valida.", "Invalid position.");
  if (from.page === page && from.index === index) return false;
  const other = bar.pages[page].slots[index];
  bar.pages[page].slots[index] = from.slot;
  bar.pages[from.page].slots[from.index] = other ?? null;
  return true;
}
export function removeSlot(state, slice, role, actorId, slotId) {
  requireControl(state, role, actorId);
  const bar = mutableBar(slice, role, actorId);
  const found = findSlot(bar, slotId);
  if (!found) throw fail("Casella non trovata.", "Slot not found.");
  bar.pages[found.page].slots[found.index] = null;
  return found.slot;
}
export function addPage(state, slice, role, actorId, name) {
  requireControl(state, role, actorId);
  const bar = mutableBar(slice, role, actorId);
  if (bar.pages.length >= MAX_PAGES)
    throw fail(`Al massimo ${MAX_PAGES} pagine.`, `At most ${MAX_PAGES} pages.`);
  const label = String(name ?? "")
    .trim()
    .slice(0, MAX_LABEL);
  const page = {
    id: newId("qbp"),
    name: label || `${bar.pages.length + 1}`,
    slots: emptySlots(),
  };
  bar.pages.push(page);
  return bar.pages.length - 1;
}
export function renamePage(state, slice, role, actorId, page, name) {
  requireControl(state, role, actorId);
  const target = mutableBar(slice, role, actorId).pages[page];
  if (!target) throw fail("Pagina non trovata.", "Page not found.");
  const label = String(name ?? "")
    .trim()
    .slice(0, MAX_LABEL);
  if (!label)
    throw fail("Il nome della pagina non può restare vuoto.", "The page name cannot be empty.");
  target.name = label;
}
export function removePage(state, slice, role, actorId, page) {
  requireControl(state, role, actorId);
  const bar = mutableBar(slice, role, actorId);
  if (bar.pages.length <= 1)
    throw fail("La barra conserva almeno una pagina.", "The bar keeps at least one page.");
  if (!bar.pages[page]) throw fail("Pagina non trovata.", "Page not found.");
  return bar.pages.splice(page, 1)[0];
}

// ------------------------------------------------------------------ availability and steps

// ------------------------------------------------------------------ class features (PG-77)

/** A feature of the actor with a use counter (the sheet's limited uses), or null. */
export function limitedFeature(state, actorId, featureId) {
  const feature = (state.actors?.[actorId]?.features ?? []).find((row) => row.id === featureId);
  return feature && Number.isInteger(feature.max) && feature.max > 0 ? feature : null;
}
/** Wild Shape, as the sheet recognises it (the forms profile or the SRD definition id). */
export function isWildShapeSlot(state, actorId, slot) {
  if (slot?.kind !== "feature") return false;
  const actor = state.actors?.[actorId];
  const feature = limitedFeature(state, actorId, slot.ref.featureId);
  return (
    Boolean(feature) &&
    (actor?.formsProfile?.wildShapeFeatureId === feature.id ||
      /(^|:)wild-shape$/.test(String(feature.definitionId ?? feature.id)))
  );
}
/** A Wild Shape slot of a transformed druid: it reads «Torna alla forma originale». */
export const featureReturns = (state, actorId, slot) =>
  isWildShapeSlot(state, actorId, slot) && Boolean(state.actors?.[actorId]?.activeForm);
/** Uses left of a feature slot ({left, max}), or null for another slot. */
export function featureUses(state, actorId, slot) {
  if (slot?.kind !== "feature") return null;
  const feature = limitedFeature(state, actorId, slot.ref.featureId);
  return feature
    ? { left: Math.max(0, feature.max - (feature.used ?? 0)), max: feature.max }
    : null;
}
/**
 * Spends one use of the feature (the sheet's own counter, sheet-plus-domain spendFeatureUse):
 * Second Wind, Action Surge. Wild Shape is not spent here: the forms spend it with the form.
 */
export function useFeature(state, role, actorId, slot) {
  requireControl(state, role, actorId);
  if (isWildShapeSlot(state, actorId, slot))
    throw fail("Forma Selvatica si usa dalle forme.", "Wild Shape is used from the forms.");
  return spendFeatureUse(state, actorId, slot.ref.featureId, role);
}
const nameOfAction = (state, actorId, actionId) =>
  listActions(state, actorId).find((a) => a.id === actionId)?.name ?? null;
/** The slot's short face on the bar: its own label, else a short name (checks). */
export function slotFace(state, slice, actorId, slot) {
  if (slot && !slot.label && slot.kind === "check")
    return checkShortName(slot.ref.ability, slot.ref.type, slot.ref.skill);
  return slotName(state, slice, actorId, slot);
}
/** The name a slot shows: its own label, else the name of what it runs. */
export function slotName(state, slice, actorId, slot) {
  if (!slot) return "";
  if (slot.kind === "feature" && featureReturns(state, actorId, slot))
    return L("Torna alla forma originale", "Return to your original form");
  if (slot.label) return slot.label;
  if (slot.kind === "feature")
    return copy(limitedFeature(state, actorId, slot.ref.featureId)?.name ?? slot.ref.featureId);
  if (slot.kind === "action")
    return nameOfAction(state, actorId, slot.ref.actionId) ?? slot.ref.actionId;
  if (slot.kind === "custom")
    return customActionsOf(slice, actorId).find((a) => a.id === slot.ref.customId)?.name ?? "?";
  if (slot.kind === "check") return checkName(slot.ref.ability, slot.ref.type, slot.ref.skill);
  if (slot.kind === "roll") return slot.ref.formula;
  return L("Sequenza", "Sequence");
}
const KIND_NAMES = {
  action: L("azione della scheda", "sheet action"),
  custom: L("azione personalizzata", "custom action"),
  check: L("prova dalla scheda", "check from the sheet"),
  roll: L("tiro salvato", "saved roll"),
  sequence: L("sequenza", "sequence"),
  feature: L("capacità di classe", "class feature"),
};
export const slotKindName = (kind) => KIND_NAMES[kind] ?? L(kind, kind);
function stepReason(state, slice, actorId, step) {
  if (
    step.kind === "custom" &&
    !customActionsOf(slice, actorId).some((a) => a.id === step.customId)
  )
    return L(
      "Azione personalizzata rimossa dalla scheda.",
      "Custom action removed from the sheet.",
    );
  if (
    step.kind === "check" &&
    checkBonus(state, actorId, step.ability, step.type, step.skill) === null
  )
    return L(
      "Punteggio di caratteristica non registrato sulla scheda.",
      "Ability score not recorded on the sheet.",
    );
  if (step.kind === "roll" && !parseFormula(step.formula).ok)
    return L("Formula non valida.", "Invalid formula.");
  return null;
}
/** Whether the slot can run for this actor now, and why not ({it, en}). */
export function slotStatus(state, slice, actorId, slot) {
  if (!slot) return { available: false, reason: null };
  if (slot.kind === "feature") {
    const feature = limitedFeature(state, actorId, slot.ref.featureId);
    if (!feature)
      return {
        available: false,
        reason: L(
          "Capacità non più sulla scheda: toglila dalla barra.",
          "Feature no longer on the sheet: remove it from the bar.",
        ),
      };
    if (featureReturns(state, actorId, slot)) return { available: true, reason: null };
    return (feature.used ?? 0) < feature.max
      ? { available: true, reason: null }
      : {
          available: false,
          reason: L(
            "Nessun uso rimasto: si recupera con il riposo indicato sulla scheda.",
            "No uses left: they come back with the rest the sheet states.",
          ),
        };
  }
  if (slot.kind === "action")
    return listActions(state, actorId).some((a) => a.id === slot.ref.actionId)
      ? { available: true, reason: null }
      : {
          available: false,
          reason: L(
            "Azione non disponibile ora sulla scheda (per esempio arma non impugnata).",
            "Action not available on the sheet now (for example a weapon not in hand).",
          ),
        };
  const steps = slot.kind === "sequence" ? slot.ref.steps : [{ kind: slot.kind, ...slot.ref }];
  for (const step of steps) {
    const reason = stepReason(state, slice, actorId, step);
    if (reason) return { available: false, reason };
  }
  return { available: true, reason: null };
}
/** Items this identity can put on the actor's bar (tray and add dialog), in groups. */
export function availableItems(state, slice, actorId) {
  const items = [];
  for (const action of listActions(state, actorId))
    items.push({
      group: "sheet",
      key: `action:${action.id}`,
      kind: "action",
      ref: { actionId: action.id },
      name: copy(action.name),
    });
  for (const action of customActionsOf(slice, actorId))
    items.push({
      group: "custom",
      key: `custom:${action.id}`,
      kind: "custom",
      ref: { customId: action.id },
      name: action.name,
      detail: customView(state, actorId, action).summary,
    });
  for (const feature of state.actors?.[actorId]?.features ?? [])
    if (limitedFeature(state, actorId, feature.id))
      items.push({
        group: "features",
        key: `feature:${feature.id}`,
        kind: "feature",
        ref: { featureId: feature.id },
        name: copy(feature.name),
        detail: L(
          `${feature.max - (feature.used ?? 0)} di ${feature.max} usi`,
          `${feature.max - (feature.used ?? 0)} of ${feature.max} uses`,
        ),
      });
  for (const type of ["check", "save"])
    for (const ability of ABILITY_IDS) {
      const bonus = checkBonus(state, actorId, ability, type);
      if (bonus === null) continue;
      items.push({
        group: type === "save" ? "saves" : "checks",
        key: `check:${ability}:${type}`,
        kind: "check",
        ref: { ability, type },
        name: checkName(ability, type),
        detail: L(`d20 ${signedText(bonus)}`, `d20 ${signedText(bonus)}`),
      });
    }
  // Skills, as the sheet lists them (Roll20 and Foundry: any sheet roll goes on the bar).
  for (const skill of SKILL_LIST) {
    const bonus = checkBonus(state, actorId, skill.ability, "skill", skill.id);
    if (bonus === null) continue;
    items.push({
      group: "skills",
      key: `check:${skill.ability}:skill:${skill.id}`,
      kind: "check",
      ref: { ability: skill.ability, type: "skill", skill: skill.id },
      // As the sheet lists skills: the name, then its ability and bonus.
      name: copy(skill.name),
      detail: L(
        `${SHORT[skill.ability].it} · d20 ${signedText(bonus)}`,
        `${SHORT[skill.ability].en} · d20 ${signedText(bonus)}`,
      ),
    });
  }
  return items;
}
/**
 * Executable steps of a slot for this actor: a saved roll or check is one step; a custom
 * action is its attack roll then its damage; a sequence joins its steps in order.
 */
export function expandSteps(state, slice, actorId, slot) {
  const out = [];
  const add = (step) => {
    const reason = stepReason(state, slice, actorId, step);
    if (reason) throw Object.assign(new Error(reason.en), reason);
    if (step.kind === "roll") {
      const parsed = parseFormula(step.formula);
      out.push({
        type: "roll",
        label: copy(step.label ?? parsed.text),
        formula: parsed.text,
        rollKind: "free",
      });
    } else if (step.kind === "check") {
      out.push({
        type: "check",
        label: checkName(step.ability, step.type, step.skill),
        ability: step.ability,
        checkType: step.type,
        ...(step.type === "skill" ? { skill: step.skill } : {}),
        rollKind: step.type === "save" ? "save" : "check",
      });
    } else if (step.kind === "custom") {
      const action = customActionsOf(slice, actorId).find((a) => a.id === step.customId);
      if (action.attack)
        out.push({
          type: "attack",
          customId: action.id,
          label: L(`${action.name} · per colpire`, `${action.name} · attack roll`),
          activation: action.activation,
          rollKind: "attack",
        });
      if (action.damage)
        out.push({
          type: "damage",
          customId: action.id,
          label: L(`${action.name} · danni`, `${action.name} · damage`),
          activation: action.attack ? null : action.activation,
          afterAttack: Boolean(action.attack),
          rollKind: "damage",
        });
    }
  };
  if (slot.kind === "action")
    throw fail(
      "Un'azione della scheda si usa sul Tavolo con il suo bersaglio.",
      "A sheet action is used at the Table with its target.",
    );
  if (slot.kind === "feature")
    throw fail(
      "Una capacità di classe si usa dalla sua casella, senza tiri.",
      "A class feature is used from its slot, without rolls.",
    );
  if (slot.kind === "sequence") slot.ref.steps.forEach(add);
  else add({ kind: slot.kind, ...slot.ref, label: slot.label ?? undefined });
  return out;
}
/**
 * Why this step cannot run now for this identity (null when it can). Checked on the
 * state as it is when the step runs, so an earlier step's spent Action counts.
 */
export function stepPermission(state, role, actorId, step) {
  const actor = state.actors?.[actorId];
  if (!actor || !isActorAvailable(actor))
    return L("La creatura non è più disponibile.", "The creature is no longer available.");
  if (!canControlActor(actor, role, state))
    return L(`Non controlli più ${actor.name}.`, `You no longer control ${actor.name}.`);
  if (actor.dead) return L(`${actor.name} è morto.`, `${actor.name} is dead.`);
  const activation = step.activation;
  if (!activation || activation === "none") return null;
  if (isIncapacitated(getEffectiveActor(actor)))
    return L(
      `${actor.name} è Incapacitato: niente azioni, azioni bonus o reazioni (${pages(RULES.incapacitated)}).`,
      `${actor.name} is Incapacitated: no actions, Bonus Actions or Reactions (${pages(RULES.incapacitated)}).`,
    );
  const combat = state.combat;
  if (!combat?.active || !combat.order?.includes(actorId)) return null;
  const turn = combat.order[combat.turn] === actorId;
  if (activation !== "reaction" && !turn)
    return L(
      `Non è il turno di ${actor.name}: azioni e azioni bonus si usano nel proprio turno.`,
      `It is not ${actor.name}'s turn: actions and Bonus Actions are taken on your own turn.`,
    );
  if (activation === "action" && !actor.action)
    return L(
      "Azione già usata in questo turno: un personaggio ha un'Azione per turno.",
      "Action already used this turn: a character has one Action per turn.",
    );
  if (activation === "bonus" && !actor.bonus)
    return L(
      `Azione bonus già usata in questo turno (${pages(RULES.bonusAction)}).`,
      `Bonus Action already used this turn (${pages(RULES.bonusAction)}).`,
    );
  if (activation === "reaction" && !actor.reaction)
    return L(
      `Reazione già usata: torna all'inizio del tuo prossimo turno (${pages(RULES.reaction)}).`,
      `Reaction already used: it returns at the start of your next turn (${pages(RULES.reaction)}).`,
    );
  return null;
}
function spendActivation(state, actorId, activation) {
  const actor = state.actors[actorId];
  const combat = state.combat;
  if (!combat?.active || !combat.order?.includes(actorId)) return;
  if (activation === "action") actor.action = false;
  if (activation === "bonus") actor.bonus = false;
  if (activation === "reaction") actor.reaction = false;
}
/**
 * H-02 (D&D Beyond: one roll engine): a check, save or skill step is the sheet's D20 Test,
 * built as the dice tray builds it: sheet-plus-domain rollProfile (modifier with conditions
 * such as Exhaustion, riders such as Bless and Bane) and effectiveRollMode (the chosen mode
 * joined with the conditions' Advantage and Disadvantage, Poisoned included, and the
 * character's roll policy). A rider's dice follow the d20s in the plan, each with its sign.
 */
function checkPlan(state, actorId, step, mode) {
  const bonus = checkBonus(state, actorId, step.ability, step.checkType, step.skill);
  if (bonus === null)
    throw fail("Punteggio non registrato sulla scheda.", "Score not recorded on the sheet.");
  const kind = step.checkType === "save" ? "save" : step.checkType === "skill" ? "skill" : "check";
  const profile = rollProfile(state, actorId, kind, kind === "skill" ? step.skill : step.ability);
  if (profile.autoFail?.length) {
    const names = (lang) => profile.autoFail.map((r) => r.name?.[lang] ?? "").join(", ");
    const who = state.actors[actorId]?.name ?? "";
    throw fail(
      `${who} fallisce automaticamente questo tiro salvezza (${names("it")}): non serve tirare.`,
      `${who} automatically fails this saving throw (${names("en")}): no roll is needed.`,
    );
  }
  const riders = (profile.riders ?? []).filter((r) => r.dice || r.flat);
  const flat = riders.reduce((sum, r) => sum + (r.flat ? r.sign * r.flat : 0), 0);
  const plan = rollPlan({
    kind: "d20",
    bonus: profile.modifier + flat,
    mode: effectiveRollMode(profile, mode),
  });
  const reasons = [
    ...(profile.conditionReasons?.advantage ?? []).map((r) => ({ ...r, mode: "advantage" })),
    ...(profile.conditionReasons?.disadvantage ?? []).map((r) => ({ ...r, mode: "disadvantage" })),
  ].map((r) => ({ name: copy(r.name), mode: r.mode }));
  if (reasons.length) plan.reasons = reasons;
  const dice = riders.filter((r) => r.dice);
  if (dice.length) {
    plan.riders = dice.map((r, i) => ({
      id: r.id,
      name: copy(r.name),
      group: i + 1,
      sign: r.sign < 0 ? -1 : 1,
      dice: copy(r.dice),
    }));
    for (const rider of plan.riders)
      for (let i = 0; i < rider.dice.count; i++)
        plan.dice.push({ sides: rider.dice.sides, group: rider.group, rider: rider.id });
  }
  return plan;
}
/** A plan's faces resolved: the d20 part by srd-compendium, then each rider with its sign. */
export function resolveStep(plan, faces) {
  if (!plan.riders?.length) return resolvePlan(plan, faces);
  if (!Array.isArray(faces) || faces.length !== plan.dice.length)
    throw new Error("Every die needs a face");
  const count = plan.dice.findIndex((d) => d.rider);
  const base = resolvePlan({ ...plan, dice: plan.dice.slice(0, count) }, faces.slice(0, count));
  let riders = 0;
  plan.dice.slice(count).forEach((die, i) => {
    const face = faces[count + i];
    if (!validFace(face, die.sides)) throw new Error(`Invalid face for d${die.sides}`);
    riders += (plan.riders.find((r) => r.id === die.rider)?.sign ?? 1) * face;
  });
  return { ...base, faces: [...faces], total: base.total + riders };
}
/** The formula of a plan in words: "2d20 + 3 (svantaggio) + 1d4 (Benedizione)". */
export function planText(plan, lang = "it") {
  if (!plan.riders?.length) return formulaText(plan, lang);
  const base = formulaText({ ...plan, dice: plan.dice.filter((d) => !d.rider) }, lang);
  const riders = plan.riders.map(
    (r) =>
      `${r.sign < 0 ? "−" : "+"} ${r.dice.count}d${r.dice.sides} (${r.name?.[lang] ?? r.name?.it ?? ""})`,
  );
  return [base, ...riders].join(" ");
}
/** Dice plan (srd-compendium) of a step with the sheet's values at this moment. */
export function stepPlan(
  state,
  slice,
  actorId,
  step,
  { rollMode = "normal", critical = false } = {},
) {
  const mode = ["advantage", "disadvantage"].includes(rollMode) ? rollMode : "normal";
  if (step.type === "check") return checkPlan(state, actorId, step, mode);
  if (step.type === "roll") {
    const parsed = parseFormula(step.formula);
    if (!parsed.ok) throw Object.assign(new Error(parsed.error.en), parsed.error);
    if (parsed.d20) return rollPlan({ kind: "d20", bonus: parsed.modifier, mode });
    return rollPlan({
      kind: "damage",
      terms: parsed.groups.map((g, i) => ({
        dice:
          `${g.count}d${g.sides}` +
          (i === 0 && parsed.modifier
            ? (parsed.modifier > 0 ? "+" : "-") + Math.abs(parsed.modifier)
            : ""),
      })),
    });
  }
  const action = customActionsOf(slice, actorId).find((a) => a.id === step.customId);
  if (!action) throw fail("Azione personalizzata non trovata.", "Custom action not found.");
  const view = customView(state, actorId, action);
  if (step.type === "attack") return rollPlan({ kind: "d20", bonus: view.toHit, mode });
  return rollPlan({
    kind: "damage",
    critical,
    terms: [
      {
        dice:
          action.damage.dice +
          (view.damageMod ? (view.damageMod > 0 ? "+" : "-") + Math.abs(view.damageMod) : ""),
        type: action.damage.type,
      },
    ],
  });
}

// ------------------------------------------------------------------ runs and rolls

const liveSet = (slice) => new Set(slice.live ?? []);
/** Rolls of a withdrawn run (Undo) stay on record; the same attempt reuses them once. */
function withdrawnFor(slice, rolls, key) {
  const live = liveSet(slice);
  return rolls.rolls.find(
    (r) => r.retryKey === key && r.mode === "digital" && !r.reusedBy && !live.has(r.id),
  );
}
export const rollStatus = (slice, record) =>
  !liveSet(slice).has(record.id) ? "withdrawn" : (record.status ?? "accepted");
/** The run this identity has under way for the actor (a physical sequence waiting). */
export const runningRun = (slice, role, actorId) =>
  (slice.runs ?? []).find((r) => r.by === role && r.actorId === actorId && r.status === "running");
export const latestRun = (slice, role, actorId) =>
  (slice.runs ?? []).filter((r) => r.by === role && r.actorId === actorId).at(-1) ?? null;
/**
 * Starts running a slot: one attempt of that slot (its use counter is the retry identity
 * after an Undo). `visibility` "private" for a personal sheet or the DM's hidden roll.
 */
export function startRun(
  state,
  slice,
  role,
  actorId,
  slotId,
  { mode, rollMode = "normal", visibility = "shared", now, id = newId("qbr") },
) {
  requireControl(state, role, actorId);
  if (!["digital", "physical"].includes(mode))
    throw fail("Scegli dadi digitali o fisici.", "Choose digital or physical dice.");
  if (runningRun(slice, role, actorId))
    throw fail(
      "C'è già una sequenza in corso: completala o interrompila con un motivo.",
      "A sequence is already under way: finish it or stop it with a reason.",
    );
  const found = findSlot(mutableBar(slice, role, actorId), slotId);
  if (!found) throw fail("Casella non trovata.", "Slot not found.");
  const { slot } = found;
  const steps = expandSteps(state, slice, actorId, slot);
  const run = {
    id,
    by: role,
    actorId,
    slotId,
    name: copy(slotName(state, slice, actorId, slot)),
    kind: slot.kind,
    mode,
    rollMode: ["advantage", "disadvantage"].includes(rollMode) ? rollMode : "normal",
    visibility: visibility === "private" ? "private" : "shared",
    attempt: slot.uses,
    status: "running",
    current: 0,
    startedAt: now,
    endedAt: null,
    stopReason: null,
    steps: steps.map((step) => ({ ...step, status: "pending", rollIds: [], reason: null })),
  };
  slot.uses += 1;
  slice.runs.push(run);
  const mine = slice.runs.filter((r) => r.by === role);
  if (mine.length > MAX_RUNS) {
    const drop = mine.slice(0, mine.length - MAX_RUNS).map((r) => r.id);
    slice.runs = slice.runs.filter((r) => !drop.includes(r.id));
  }
  return run;
}
const runById = (slice, role, runId) => {
  const run = (slice.runs ?? []).find((r) => r.id === runId);
  if (!run) throw fail("Sequenza non trovata.", "Sequence not found.");
  if (run.by !== role)
    throw fail("Questa sequenza è di un'altra persona.", "This sequence belongs to someone else.");
  return run;
};
function finishIfDone(run, now) {
  if (run.current >= run.steps.length && run.status === "running") {
    run.status = "done";
    run.endedAt = now;
  }
}
/** The plan of the step waiting for faces (physical runs), with its critical state. */
export function pendingPlan(state, slice, run) {
  const step = run.steps[run.current];
  if (!step || run.status !== "running") return null;
  const critical = criticalBefore(run, run.current);
  return stepPlan(state, slice, run.actorId, step, { rollMode: run.rollMode, critical });
}
function criticalBefore(run, index) {
  const step = run.steps[index];
  if (step?.type !== "damage" || !step.afterAttack) return false;
  const attack = run.steps[index - 1];
  return attack?.type === "attack" && attack.natural === 20;
}
/**
 * Runs the next step(s). Digital: every remaining step in order, until one is not
 * permitted (it stops there with the reason). Physical: only the current step, with the
 * natural faces entered. Each accepted roll is a record in the preserved slice.
 */
export function runSteps(
  state,
  slice,
  rolls,
  role,
  runId,
  { faces = null, die = rollDie, now, idOf = () => newId("qbroll") } = {},
) {
  const run = runById(slice, role, runId);
  if (run.status !== "running")
    throw fail("La sequenza è già conclusa.", "The sequence is already over.");
  const records = [];
  const once = run.mode === "physical";
  while (run.status === "running" && run.current < run.steps.length) {
    const index = run.current;
    const step = run.steps[index];
    if (step.afterAttack) {
      const attack = run.steps[index - 1];
      if (attack?.status !== "done") {
        step.status = "skipped";
        step.reason = L(
          "Il tiro per colpire non è stato eseguito.",
          "The attack roll was not made.",
        );
        run.current += 1;
        continue;
      }
    }
    const denied = stepPermission(state, role, run.actorId, step);
    if (denied) {
      step.status = "blocked";
      step.reason = denied;
      run.status = "blocked";
      run.endedAt = now;
      run.steps.slice(index + 1).forEach((s) => {
        s.status = "skipped";
        s.reason = L(
          "Non eseguito: la sequenza si è fermata prima.",
          "Not run: the sequence stopped earlier.",
        );
      });
      break;
    }
    const critical = criticalBefore(run, index);
    const plan = stepPlan(state, slice, run.actorId, step, { rollMode: run.rollMode, critical });
    const retryKey = [role, run.actorId, run.slotId, run.attempt, index].join("|");
    let values,
      status = "accepted",
      reusedFrom = null;
    const id = idOf();
    if (run.mode === "physical") {
      const entered = (faces ?? []).map(Number);
      if (
        entered.length !== plan.dice.length ||
        plan.dice.some((d, i) => !validFace(entered[i], d.sides))
      )
        throw fail(
          "Inserisci ogni faccia del dado fisico: un intero tra 1 e il numero di facce.",
          "Enter every physical die face: a whole number from 1 to the number of sides.",
        );
      values = entered;
    } else {
      const withdrawn = withdrawnFor(slice, rolls, retryKey);
      if (withdrawn && withdrawn.values.length === plan.dice.length) {
        values = [...withdrawn.values];
        status = "reused";
        reusedFrom = withdrawn.id;
        withdrawn.reusedBy = id;
      } else values = plan.dice.map((d) => die(d.sides));
      if (plan.dice.some((d, i) => !validFace(values[i], d.sides)))
        throw Error("The dice service returned an invalid face");
    }
    const result = resolveStep(plan, values);
    if (step.activation) spendActivation(state, run.actorId, step.activation);
    const record = {
      id,
      at: now,
      by: role,
      actorId: run.actorId,
      runId: run.id,
      slotId: run.slotId,
      step: index,
      label: copy(step.label),
      rollKind: step.rollKind,
      plan: copy(plan),
      formula: planText(plan, "it"),
      formulaEn: planText(plan, "en"),
      mode: run.mode,
      values: result.faces,
      total: result.total,
      natural: plan.kind === "d20" ? result.natural : null,
      rollMode: plan.kind === "d20" ? plan.mode : "normal",
      critical: plan.critical === true,
      status,
      retryKey,
      visibility: run.visibility,
      corrections: [],
      ...(reusedFrom ? { reusedFrom } : {}),
    };
    rolls.rolls.push(record);
    if (rolls.rolls.length > MAX_ROLLS) rolls.rolls.splice(0, rolls.rolls.length - MAX_ROLLS);
    slice.live.push(id);
    if (slice.live.length > MAX_ROLLS) slice.live.splice(0, slice.live.length - MAX_ROLLS);
    step.status = "done";
    step.rollIds = [id];
    step.natural = record.natural;
    step.total = record.total;
    step.values = [...record.values];
    run.current += 1;
    records.push(record);
    finishIfDone(run, now);
    if (once) break;
  }
  finishIfDone(run, now);
  return { run, records };
}
/** Interrupts a running sequence with a reason; the steps already rolled stay. */
export function stopRun(slice, role, runId, reason, now) {
  const run = runById(slice, role, runId);
  if (run.status !== "running")
    throw fail("La sequenza è già conclusa.", "The sequence is already over.");
  const why = String(reason ?? "")
    .trim()
    .slice(0, 200);
  if (!why)
    throw fail(
      "Scrivi il motivo dell'interruzione: resta nel registro.",
      "Write why you stop: it stays in the log.",
    );
  run.status = "stopped";
  run.stopReason = why;
  run.endedAt = now;
  run.steps.slice(run.current).forEach((s) => {
    s.status = "skipped";
    s.reason = L("Non eseguito: sequenza interrotta.", "Not run: sequence stopped.");
  });
  return run;
}
/**
 * Reasoned correction of a physical roll typed wrong (the compendium and dice areas do
 * the same): the earlier faces stay in the record; digital faces are never edited.
 */
export function correctRoll(slice, rolls, role, rollId, faces, reason, now) {
  const record = rolls.rolls.find((r) => r.id === rollId);
  if (!record) throw fail("Il tiro non esiste più.", "The roll no longer exists.");
  if (record.by !== role)
    throw fail("Solo chi ha tirato può correggere.", "Only the roller can correct.");
  if (!liveSet(slice).has(record.id))
    throw fail("Il tiro è stato annullato.", "The roll was undone.");
  if (record.mode !== "physical")
    throw fail(
      "Le facce digitali non si modificano: annulla e tira di nuovo (le stesse facce verranno riusate).",
      "Digital faces cannot be edited: undo and roll again (the same faces are reused).",
    );
  const next = record.plan.dice.map((_, i) => Number(faces?.[i]));
  if (next.some((face, i) => !validFace(face, record.plan.dice[i].sides)))
    throw fail(
      "Inserisci ogni faccia del dado fisico: un intero tra 1 e il numero di facce.",
      "Enter every physical die face: a whole number from 1 to the number of sides.",
    );
  if (JSON.stringify(next) === JSON.stringify(record.values))
    throw fail("Le facce sono uguali a quelle registrate.", "These faces match the recorded ones.");
  const why = String(reason ?? "")
    .trim()
    .slice(0, 200);
  if (!why)
    throw fail(
      "Scrivi il motivo: resta nella cronologia del tiro.",
      "Write the reason: it stays in the roll history.",
    );
  const result = resolveStep(record.plan, next);
  record.corrections = [
    ...(record.corrections ?? []),
    { values: [...record.values], total: record.total, reason: why, at: now, by: role },
  ];
  record.values = result.faces;
  record.total = result.total;
  if (record.plan.kind === "d20") record.natural = result.natural;
  record.status = "corrected";
  // The run's step follows the corrected faces, so a damage step still waiting reads the
  // corrected natural 20 (or its absence) for the Critical Hit (SRD 5.2.1 EN 179 / IT 205).
  const step = (slice.runs ?? []).find((r) => r.id === record.runId)?.steps?.[record.step];
  if (step?.rollIds?.includes(record.id)) {
    step.natural = record.natural;
    step.total = record.total;
    step.values = [...record.values];
  }
  return record;
}
/** The log roll of a record (state.log rolls[] shape: read by the chat, dice and archive). */
export function logRollOf(state, record) {
  const last = record.corrections?.at(-1);
  const groups = [];
  for (const d of record.plan.dice) {
    const prev = groups.at(-1);
    if (prev && prev.sides === d.sides && prev.group === d.group) prev.count += 1;
    else groups.push({ count: 1, sides: d.sides, group: d.group });
  }
  const faceSum = record.values.reduce((a, b) => a + b, 0);
  return {
    id: last ? `${record.id}:c${record.corrections.length}` : record.id,
    source: ID,
    kind: record.rollKind,
    actorId: record.actorId,
    actorName: state.actors?.[record.actorId]?.name ?? null,
    actionName: copy(record.label),
    label: copy(record.label),
    controller: record.by,
    owner: record.by,
    visibility: record.visibility,
    mode: record.mode,
    dice: groups.map(({ count, sides }) => ({ count, sides })),
    values: [...record.values],
    natural: record.natural,
    modifier: record.plan.kind === "d20" ? record.total - record.natural : record.total - faceSum,
    total: record.total,
    rollMode: record.rollMode,
    ...(record.critical ? { critical: true } : {}),
    status: last ? "corrected" : record.status,
    ...(last
      ? { correctionReason: last.reason, previousValues: [...last.values], corrects: record.id }
      : {}),
  };
}
/** One readable line per roll: "Arcano: 1d20 + 5 → [12] = 17". */
export function rollLine(record, lang = "it") {
  const name = typeof record.label === "string" ? record.label : record.label?.[lang];
  const formula = lang === "en" ? (record.formulaEn ?? record.formula) : record.formula;
  return `${name}: ${formula} → [${record.values.join(", ")}] = ${record.total}`;
}

// ------------------------------------------------------------------ sharing (Dice+ panels)

const shareable = (slot) =>
  slot &&
  (slot.kind === "roll" ||
    slot.kind === "check" ||
    (slot.kind === "sequence" && slot.ref.steps.every((s) => s.kind !== "custom")));
/** Characters the page can be shared with: other visible characters of the campaign. */
export function shareTargets(state, role, actorId) {
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor.id !== actorId &&
      actor.kind === "character" &&
      !actor.companion &&
      actor.visibility !== "private" &&
      isActorAvailable(actor) &&
      canViewActor(actor, role, state) &&
      (actor.campaignIds === undefined || actor.campaignIds.includes(state.campaign?.id)),
  );
}
/** What a copy of the page would carry and what it leaves out, with the reason. */
export function sharePreview(state, slice, role, actorId, page) {
  const source = barOf(slice, role, actorId).pages[page];
  if (!source) throw fail("Pagina non trovata.", "Page not found.");
  const copied = [],
    skipped = [];
  for (const slot of source.slots) {
    if (!slot) continue;
    const name = slotName(state, slice, actorId, slot);
    if (shareable(slot)) copied.push({ name, kind: slot.kind });
    else
      skipped.push({
        name,
        kind: slot.kind,
        reason:
          slot.kind === "action"
            ? L("azione della scheda di chi condivide", "an action of the sharer's sheet")
            : slot.kind === "sequence"
              ? L(
                  "sequenza con azioni personalizzate della scheda di chi condivide",
                  "a sequence with custom actions of the sharer's sheet",
                )
              : L(
                  "azione personalizzata della scheda di chi condivide",
                  "a custom action of the sharer's sheet",
                ),
      });
  }
  return { page: source, copied, skipped };
}
/**
 * Shares the page as a copy (Dice+ VTL-174): each identity who plays the target gets a new
 * page on that character's bar. Later edits on either side do not travel: it is a copy.
 * A check copied from the sheet reads the recipient's sheet when it runs.
 */
export function sharePage(state, slice, role, actorId, page, targetActorId, now) {
  requireControl(state, role, actorId);
  const target = shareTargets(state, role, actorId).find((a) => a.id === targetActorId);
  if (!target) throw fail("Destinatario non disponibile.", "Recipient not available.");
  const preview = sharePreview(state, slice, role, actorId, page);
  if (!preview.copied.length)
    throw fail(
      "Nessuna casella condivisibile: tiri salvati, prove e sequenze di tiri si copiano; le azioni della scheda restano di chi le ha.",
      "Nothing to share: saved rolls, checks and roll sequences are copied; sheet actions stay with their owner.",
    );
  const recipients = [
    ...new Set([target.owner, ...(Array.isArray(target.controllers) ? target.controllers : [])]),
  ].filter((who) => typeof who === "string" && who);
  for (const who of recipients) {
    const bar = mutableBar(slice, who, target.id);
    if (bar.pages.length >= MAX_PAGES)
      throw fail(
        `La barra di ${target.name} ha già ${MAX_PAGES} pagine: chiedi di liberarne una.`,
        `${target.name}'s bar already has ${MAX_PAGES} pages: ask to free one.`,
      );
  }
  // A personal sheet stays private (never readable by the DM): the copy names no source.
  const personal = state.actors[actorId].visibility === "private";
  const actorName = personal ? null : state.actors[actorId].name;
  const sourceName = preview.page.name;
  for (const who of recipients) {
    const slots = emptySlots();
    let at = 0;
    for (const slot of preview.page.slots) {
      if (!shareable(slot)) continue;
      slots[at++] = {
        ...copy(slot),
        id: newId("qbs"),
        uses: 0,
        label: slot.label ?? copy(slotName(state, slice, actorId, slot)),
      };
    }
    mutableBar(slice, who, target.id).pages.push({
      id: newId("qbp"),
      name: copy(sourceName),
      slots,
      sharedFrom: { by: role, actorId: personal ? null : actorId, actorName, at: now },
    });
  }
  return { recipients, target: target.id, copied: preview.copied, skipped: preview.skipped };
}
/** Copy as text (Dice+): one saved roll per line, "Name = formula". */
export function pageText(state, slice, role, actorId, page, lang = "it") {
  const source = barOf(slice, role, actorId).pages[page];
  if (!source) throw fail("Pagina non trovata.", "Page not found.");
  return source.slots
    .filter((slot) => slot?.kind === "roll")
    .map((slot) => {
      const name = slotName(state, slice, actorId, slot);
      return `${typeof name === "string" ? name : name[lang]} = ${slot.ref.formula}`;
    })
    .join("\n");
}
/** Reads "Name = formula" lines (the text another bar copied) into saved rolls. */
export function parsePageText(text) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length)
    throw fail(
      "Incolla almeno una riga «Nome = formula».",
      "Paste at least one “Name = formula” line.",
    );
  if (lines.length > SLOT_COUNT)
    throw fail(
      `Al massimo ${SLOT_COUNT} righe per pagina.`,
      `At most ${SLOT_COUNT} lines per page.`,
    );
  return lines.map((line, i) => {
    const match = line.match(/^(.{1,24}?)\s*[=:|]\s*(.+)$/);
    const parsed = match ? parseFormula(match[2]) : null;
    if (!match || !parsed?.ok)
      throw fail(
        `Riga ${i + 1} non valida: scrivi «Nome = 1d20+5».`,
        `Line ${i + 1} is invalid: write “Name = 1d20+5”.`,
      );
    return { label: match[1].trim(), formula: parsed.text };
  });
}
export function importPage(state, slice, role, actorId, name, text) {
  const rows = parsePageText(text);
  const index = addPage(state, slice, role, actorId, name);
  const page = mutableBar(slice, role, actorId).pages[index];
  rows.forEach((row, i) => {
    page.slots[i] = slotOf(newId("qbs"), "roll", { formula: row.formula }, "gold", row.label);
  });
  return index;
}
/** Shared pages this identity received and has not opened yet (for the notification bell). */
export function receivedPages(slice, role) {
  const out = [];
  for (const [actorId, bar] of Object.entries(slice?.bars?.[role] ?? {}))
    bar.pages.forEach((page, index) => {
      if (page.sharedFrom) out.push({ actorId, index, page });
    });
  return out;
}
