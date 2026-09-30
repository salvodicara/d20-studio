// B34 — Dice tray: pure domain (no DOM, no registry).
//
// The tray records rolls typed as a formula ("2d6+1d4+3") or started from a number on the
// sheet (a check, a save, a skill), with digital faces from the app's one dice service
// (state.mjs rollDie, passed in as `draw`), physical faces entered by hand, or faces
// reported by a connected die (simulated here). It also owns who sees each result, the
// later reveal, Heroic Inspiration, the modifier stack and its campaign presets.
//
// Patterns copied (census IDs in docs/interview/CAPABILITY_CENSUS.md and
// changes/interview-01/market-census/*.md):
// - D&D Beyond dice tray, roll in place, roll audience (DDB-149/150/151); Roll20 roller
//   with the last ten rolls (R20-142); Owlbear Dice tray (VTL-113); Foundry Dice Tray
//   (FVT-156) and dice syntax subset (FVT-152).
// - Foundry roll modes public/GM/blind/self and later reveal (FVT-150); Roll20 visibility
//   ladder (R20-143); Owlbear Dice+ audience (VTL-173); Bones! announcement of a hidden
//   roll without its result (VTL-172); Fantasy Grounds reveal to everyone or to one
//   player (R20-172).
// - Fantasy Grounds modifier stack applied to the next roll and campaign presets with a
//   player visibility eye (R20-174, R20-126).
// - D&D Beyond Heroic Inspiration toggle (DDB-036); BG3 "Roll Again" after a failure
//   (CRP-031), with the 2024 rule instead of BG3's party pool.
// - Foundry per-die fulfilment and external providers; Owlbear Pixels (FVT-153, VTL-176).
// Rules: SRD 5.2.1 "D20 Tests", "Advantage/Disadvantage", "Heroic Inspiration" (EN 6–8 /
// IT 6–8), "Critical Hits" (EN 16 / IT 18), "Cover" (EN 179 / IT 206).

import { getEffectiveActor } from "./forms-companions.mjs";
import { canControlActor, canViewActor } from "./character-access.mjs";
import { abilities as ABILITY_LIST, skills as SKILL_LIST } from "./character-rules.mjs";
import { srdSource } from "./srd-sample.mjs";
import { forcedPrivateReason } from "./dice-3d-domain.mjs";
import { runsSessionFor } from "./chat-domain.mjs";
// «Cosa vedono i giocatori» (C1) and the session runner (C3), for the tray and requests.
export {
  dcVisibleTo,
  playerDisclosure,
  runsSessionFor,
  disclosureReady,
  dcSetterOf,
} from "./chat-domain.mjs";
import {
  testProfile,
  testConditions,
  activeRiders,
  riderKindOf,
  combineModes,
} from "./sheet-plus-domain.mjs";

export const ID = "dice-tray";
export const STANDARD_SIDES = Object.freeze([4, 6, 8, 10, 12, 20, 100]);
export const MAX_DICE = 40;
export const MAX_TERM_DICE = 20;
export const MAX_EXPLOSIONS = 10;
export const MAX_RECORDS = 80;
export const RECENT_LIMIT = 10;
export const AUDIENCES = Object.freeze(["public", "gm", "blind", "self"]);
export const ROLL_MODES = Object.freeze(["normal", "advantage", "disadvantage", "critical"]);
export const DICE_MODES = Object.freeze(["digital", "physical", "connected"]);

const text = (it, en) => ({ it, en });
const copy = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
/** Throws a refusal with both languages (shown as the message, not an area warning). */
export function fail(it, en, extra = {}) {
  throw Object.assign(new Error(en), { it, en, ...extra });
}
export const pick = (value, lang) =>
  value && typeof value === "object" ? (value[lang] ?? value.it ?? value.en ?? "") : (value ?? "");

// ---------------------------------------------------------------- rule sources

// Page numbers read from the official SRD 5.2.1 PDFs (EN and IT) on 24/09/2026.
export const SOURCES = Object.freeze({
  d20: srdSource([6], [6]),
  save: srdSource([7], [7]),
  skills: srdSource([9], [10]),
  advantage: srdSource([7, 8], [8]),
  inspiration: srdSource([8, 183], [8, 209]),
  critical: srdSource([16], [18]),
  cover: srdSource([179], [206]),
});
// Authored product decisions (no SRD rule): never presented as SRD text.
export const AUTHORED = Object.freeze({
  contest: {
    kind: "authored",
    revision: "b34-1",
    note: "SRD 5.2.1 has no general Contest rule: the app compares totals and the DM decides.",
  },
  syntax: {
    kind: "authored",
    revision: "b34-1",
    note: "Dice syntax subset of Foundry VTT dice modifiers (FVT-152): kh/kl/dh/dl, x/xo, cs.",
  },
});

export const ABILITIES = Object.freeze(ABILITY_LIST.map((a) => a.id));
export const abilityName = (id) => ABILITY_LIST.find((a) => a.id === id)?.name ?? null;
export const SKILLS = Object.freeze(SKILL_LIST.map((s) => ({ ...s })));
export const skillInfo = (id) => SKILLS.find((s) => s.id === id) ?? null;

// ---------------------------------------------------------------- formula

const SIDES_TEXT = text(
  "usa d4, d6, d8, d10, d12, d20 o d100",
  "use d4, d6, d8, d10, d12, d20 or d100",
);

/**
 * Parses a dice formula. Grammar (Foundry subset, FVT-152):
 * term (("+" | "-") term)*, term = N | [N]d(S|%)[mods], mods = kh[n] kl[n] k[n] dh[n]
 * dl[n] x xo cs(>=|>|=|<=|<)n. Returns {terms, text}; throws a refusal that names the
 * position and the fix.
 */
export function parseFormula(input) {
  const source = String(input ?? "").trim();
  if (!source) fail("Scrivi una formula, per esempio 2d6+3.", "Type a formula, for example 2d6+3.");
  if (source.length > 120)
    fail(
      "La formula è troppo lunga (massimo 120 caratteri).",
      "The formula is too long (120 max).",
    );
  const s = source.replace(/\s+/g, "").toLowerCase().replace(/−/g, "-");
  let i = 0;
  const terms = [];
  const at = () => i + 1;
  const number = () => {
    const m = /^\d+/.exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };
  let sign = 1;
  if (s[i] === "+" || s[i] === "-") {
    sign = s[i] === "-" ? -1 : 1;
    i += 1;
  }
  for (;;) {
    if (i >= s.length) {
      const op = s[i - 1];
      fail(
        `Manca un dado o un numero dopo «${op}» (posizione ${i}).`,
        `A die or a number is missing after “${op}” (position ${i}).`,
        { code: "missing-term", at: i },
      );
    }
    const start = i;
    let count = number();
    if (s[i] === "d") {
      i += 1;
      if (count === null) count = 1;
      let sides;
      if (s[i] === "%") {
        sides = 100;
        i += 1;
      } else sides = number();
      if (sides === null)
        fail(
          `Dopo «d» serve il numero di facce (posizione ${at()}): ${SIDES_TEXT.it}.`,
          `“d” needs a number of sides (position ${at()}): ${SIDES_TEXT.en}.`,
          { code: "missing-sides", at: at() },
        );
      if (!STANDARD_SIDES.includes(sides))
        fail(
          `d${sides} non è un dado standard: ${SIDES_TEXT.it}.`,
          `d${sides} is not a standard die: ${SIDES_TEXT.en}.`,
          { code: "sides", at: start + 1 },
        );
      if (count < 1 || count > MAX_TERM_DICE)
        fail(
          `Da 1 a ${MAX_TERM_DICE} dadi per termine (hai scritto ${count}d${sides}).`,
          `From 1 to ${MAX_TERM_DICE} dice per term (you wrote ${count}d${sides}).`,
          { code: "count", at: start + 1 },
        );
      const mods = { keep: null, explode: null, success: null };
      for (;;) {
        const rest = s.slice(i);
        let m;
        if ((m = /^(kh|kl|k|dh|dl)(\d*)/.exec(rest)) && !/^d\d/.test(rest)) {
          if (mods.keep)
            fail(
              "Usa una sola regola tieni/scarta per dado.",
              "Use one keep/drop rule per die term.",
              { code: "keep-twice", at: at() },
            );
          const kind = m[1] === "k" ? "kh" : m[1];
          const n = m[2] === "" ? 1 : Number(m[2]);
          if (n < 1 || n >= count + (kind.startsWith("k") ? 1 : 0))
            fail(
              kind.startsWith("k")
                ? `Non puoi tenere ${n} dadi su ${count}.`
                : `Non puoi scartare ${n} dadi su ${count}.`,
              kind.startsWith("k")
                ? `You cannot keep ${n} of ${count} dice.`
                : `You cannot drop ${n} of ${count} dice.`,
              { code: "keep-count", at: at() },
            );
          mods.keep = { kind, n };
          i += m[0].length;
        } else if ((m = /^xo?/.exec(rest))) {
          if (sides < 2 || mods.explode)
            fail("Usa una sola esplosione per dado.", "Use one explode rule per die term.", {
              code: "explode-twice",
              at: at(),
            });
          mods.explode = m[0] === "xo" ? "once" : "repeat";
          i += m[0].length;
        } else if ((m = /^cs(>=|<=|>|<|=)?(\d+)/.exec(rest))) {
          mods.success = { op: m[1] ?? ">=", value: Number(m[2]) };
          i += m[0].length;
        } else break;
      }
      terms.push({ type: "dice", sign, count, sides, mods });
    } else if (count !== null) {
      if (count > 999)
        fail("Un modificatore arriva al massimo a 999.", "A modifier is at most 999.", {
          code: "constant",
          at: start + 1,
        });
      terms.push({ type: "const", sign, value: count });
    } else {
      const ch = s[i];
      fail(
        `Carattere non valido «${ch}» in posizione ${at()}: scrivi dadi come 2d6 e numeri.`,
        `Invalid character “${ch}” at position ${at()}: write dice like 2d6 and numbers.`,
        { code: "char", at: at() },
      );
    }
    if (i >= s.length) break;
    if (s[i] !== "+" && s[i] !== "-")
      fail(
        `Carattere non valido «${s[i]}» in posizione ${at()}: separa i termini con + o −.`,
        `Invalid character “${s[i]}” at position ${at()}: separate terms with + or −.`,
        { code: "char", at: at() },
      );
    sign = s[i] === "-" ? -1 : 1;
    i += 1;
  }
  const dice = terms.filter((t) => t.type === "dice").reduce((sum, t) => sum + t.count, 0);
  if (dice > MAX_DICE)
    fail(
      `Al massimo ${MAX_DICE} dadi in un tiro (qui ${dice}).`,
      `At most ${MAX_DICE} dice in one roll (here ${dice}).`,
      { code: "too-many" },
    );
  return { terms, text: formulaText(terms) };
}

/** Canonical text of parsed terms ("2d20kh1+1d4+3"). */
export function formulaText(terms) {
  return terms
    .map((t, index) => {
      const sign = t.sign < 0 ? "-" : index ? "+" : "";
      if (t.type === "const") return sign + t.value;
      const m = t.mods ?? {};
      const keep = m.keep ? m.keep.kind + (m.keep.n === 1 ? "1" : m.keep.n) : "";
      const explode = m.explode === "once" ? "xo" : m.explode === "repeat" ? "x" : "";
      const success = m.success ? `cs${m.success.op}${m.success.value}` : "";
      return `${sign}${t.count}d${t.sides}${explode}${keep}${success}`;
    })
    .join("");
}
/** The same formula typeset for people: "2d6 + 1d4 + 3". */
export const prettyFormula = (textValue) =>
  String(textValue ?? "")
    .replace(/(?!^)([+-])/g, " $1 ")
    .replace(/-/g, "−");

const plainD20 = (t) =>
  t.type === "dice" &&
  t.sides === 20 &&
  t.count === 1 &&
  t.sign > 0 &&
  !t.mods.keep &&
  !t.mods.explode &&
  !t.mods.success;
export const hasPlainD20 = (parsed) => parsed.terms.some(plainD20);

/**
 * Applies a roll mode to parsed terms. Advantage/disadvantage turn the single d20 of a
 * D20 Test into two d20s keeping the higher/lower one (SRD EN 7–8 / IT 8); critical rolls
 * every die twice, modifiers once (SRD EN 16 / IT 18).
 */
export function applyRollMode(parsed, rollMode = "normal") {
  if (!ROLL_MODES.includes(rollMode))
    fail("Modalità di tiro sconosciuta.", "Unknown roll mode.", { code: "mode" });
  const terms = copy(parsed.terms);
  if (rollMode === "advantage" || rollMode === "disadvantage") {
    const d20 = terms.find(plainD20);
    if (!d20)
      fail(
        "Vantaggio e svantaggio valgono per un solo d20 (una prova con d20): aggiungi 1d20 senza altre regole.",
        "Advantage and Disadvantage apply to a single d20 (a D20 Test): add 1d20 without other rules.",
        { code: "no-d20" },
      );
    d20.count = 2;
    d20.mods.keep = { kind: rollMode === "advantage" ? "kh" : "kl", n: 1 };
  }
  if (rollMode === "critical") {
    const dice = terms.filter((t) => t.type === "dice");
    if (!dice.length)
      fail(
        "Il critico raddoppia i dadi: la formula non ne ha.",
        "A critical doubles dice: none here.",
        {
          code: "no-dice",
        },
      );
    if (dice.some((t) => t.sides === 20))
      fail(
        "Il critico raddoppia i dadi dei danni, non il d20 del tiro per colpire.",
        "A critical doubles damage dice, not the attack roll's d20.",
        { code: "critical-d20" },
      );
    for (const t of dice) {
      if (t.count * 2 > MAX_TERM_DICE)
        fail("Troppi dadi per un critico.", "Too many dice for a critical.", { code: "count" });
      t.count *= 2;
      if (t.mods.keep) t.mods.keep.n *= 2;
    }
  }
  return { terms, text: formulaText(terms) };
}

/** Base dice in order (one entry per die before explosions), for physical inputs. */
export const baseSides = (parsed) =>
  parsed.terms.flatMap((t) => (t.type === "dice" ? Array(t.count).fill(t.sides) : []));

const compare = (value, { op, value: target }) =>
  op === ">="
    ? value >= target
    : op === ">"
      ? value > target
      : op === "<="
        ? value <= target
        : op === "<"
          ? value < target
          : value === target;

/**
 * Evaluates parsed terms with faces from `next(sides)`: digital draws, a queue of physical
 * faces, or a device. Explosions ask for more faces in order. Returns the groups with each
 * face (kept, exploded), the flat faces, the constant and the total.
 */
export function evaluate(parsed, next) {
  const groups = [];
  let constant = 0;
  let total = 0;
  for (const term of parsed.terms) {
    if (term.type === "const") {
      constant += term.sign * term.value;
      total += term.sign * term.value;
      continue;
    }
    const faces = [];
    for (let d = 0; d < term.count; d += 1) {
      let value = next(term.sides);
      faces.push({ value, kept: true, extra: false, exploded: false });
      let chain = 0;
      while (
        term.mods.explode &&
        value === term.sides &&
        chain < (term.mods.explode === "once" ? 1 : MAX_EXPLOSIONS)
      ) {
        faces.at(-1).exploded = true;
        value = next(term.sides, true);
        faces.push({ value, kept: true, extra: true, exploded: false });
        chain += 1;
      }
    }
    if (term.mods.keep) {
      const { kind, n } = term.mods.keep;
      const order = faces
        .map((f, index) => ({ v: f.value, index }))
        .sort(
          (a, b) => (kind === "kh" || kind === "dl" ? b.v - a.v : a.v - b.v) || a.index - b.index,
        );
      const keepCount = kind.startsWith("k") ? n : faces.length - n;
      const kept = new Set(order.slice(0, keepCount).map((o) => o.index));
      faces.forEach((f, index) => (f.kept = kept.has(index)));
    }
    let subtotal;
    let successes = null;
    if (term.mods.success) {
      successes = faces.filter((f) => f.kept && compare(f.value, term.mods.success)).length;
      subtotal = successes;
    } else subtotal = faces.filter((f) => f.kept).reduce((sum, f) => sum + f.value, 0);
    total += term.sign * subtotal;
    groups.push({
      sign: term.sign,
      sides: term.sides,
      count: term.count,
      mods: copy(term.mods),
      faces,
      subtotal,
      successes,
    });
  }
  const values = groups.flatMap((g) => g.faces.map((f) => f.value));
  return { groups, constant, total, values };
}

/** Faces drawn by the app's digital dice service; validates each face it returns. */
export function digitalFaces(draw) {
  return (sides) => {
    const face = draw(sides);
    if (!Number.isInteger(face) || face < 1 || face > sides)
      throw Error("The dice service returned an invalid face");
    return face;
  };
}
/**
 * Faces typed for physical dice: first one face per base die, in order, then the faces of
 * the extra dice that explosions add. When extra faces are missing the refusal carries
 * `needs` (the sides of each missing extra die) so the form can ask for them.
 */
export function physicalFaces(parsed, faces) {
  const all = (faces ?? []).map((f) =>
    f === "" || f === null || f === undefined ? NaN : Number(f),
  );
  const baseCount = baseSides(parsed).length;
  if (all.length < baseCount || all.slice(0, baseCount).some((f) => Number.isNaN(f)))
    fail("Inserisci la faccia di ogni dado fisico.", "Enter the face of every physical die.", {
      code: "faces-missing",
    });
  const base = all.slice(0, baseCount);
  const extra = all.slice(baseCount).filter((f) => !Number.isNaN(f));
  let b = 0;
  let e = 0;
  const needs = [];
  const check = (face, sides, position) => {
    if (!Number.isInteger(face) || face < 1 || face > sides)
      fail(
        `Faccia ${position} non valida: serve un numero intero tra 1 e ${sides}.`,
        `Face ${position} is not valid: it must be a whole number from 1 to ${sides}.`,
        { code: "face", index: position - 1 },
      );
    return face;
  };
  const result = evaluate(parsed, (sides, isExtra) => {
    if (!isExtra) {
      b += 1;
      return check(base[b - 1], sides, b);
    }
    if (e >= extra.length) {
      needs.push(sides);
      e += 1;
      return 1; // placeholder: the evaluation continues only to count what is missing
    }
    e += 1;
    return check(extra[e - 1], sides, baseCount + e);
  });
  if (needs.length)
    fail(
      `Un dado è esploso: inserisci ${needs.length === 1 ? "la faccia del dado aggiuntivo" : `le facce dei ${needs.length} dadi aggiuntivi`} (${needs.map((s) => "d" + s).join(", ")}).`,
      `A die exploded: enter ${needs.length === 1 ? "the face of the extra die" : `the faces of the ${needs.length} extra dice`} (${needs.map((s) => "d" + s).join(", ")}).`,
      { code: "explosion-faces", needs, given: extra.length },
    );
  if (e < extra.length)
    fail(
      "Hai inserito più facce dei dadi da tirare.",
      "You entered more faces than dice to roll.",
      { code: "extra-faces" },
    );
  return result;
}
/** A recorded roll's faces in the physical input order: base dice, then explosion dice. */
export const inputOrder = (record) => [
  ...record.groups.flatMap((g) => g.faces.filter((f) => !f.extra).map((f) => f.value)),
  ...record.groups.flatMap((g) => g.faces.filter((f) => f.extra).map((f) => f.value)),
];
/** Sides of each face in the physical input order. */
export const inputSides = (record) => [
  ...record.groups.flatMap((g) => g.faces.filter((f) => !f.extra).map(() => g.sides)),
  ...record.groups.flatMap((g) => g.faces.filter((f) => f.extra).map(() => g.sides)),
];

// ---------------------------------------------------------------- sheet numbers

export function proficiencyBonus(actor) {
  const recorded = actor?.combatProfile?.proficiencyBonus ?? actor?.proficiencyBonus;
  if (Number.isFinite(recorded)) return recorded;
  const level = Number(actor?.level);
  return Number.isFinite(level) && level > 0 ? Math.ceil(level / 4) + 1 : 2;
}
/**
 * The modifier of a check, save or skill check, with the sources that make it up (DDB boxed
 * numbers), from the one D20 Test engine (sheet-plus-domain testProfile, PG-23): the sheet's
 * value with its named parts and reasoned changes, then what conditions add (Exhaustion −2
 * per level, SRD 5.2.1 Conditions). Riders (Bless) and the roll mode come with it but are
 * not part of the modifier. Throws when the sheet has neither the score nor a recorded value.
 */
export function testModifier(state, actorId, test = {}) {
  const canonical = state.actors?.[actorId];
  const actor = getEffectiveActor(canonical);
  if (!actor) fail("Creatura non disponibile.", "Creature unavailable.", { code: "actor" });
  const abilityId = test.kind === "skill" ? skillInfo(test.skill)?.ability : test.ability;
  if (!ABILITIES.includes(abilityId))
    fail("Scegli una caratteristica o un'abilità.", "Choose an ability or a skill.", {
      code: "ability",
    });
  const recorded =
    test.kind === "save"
      ? actor.savingThrows?.[abilityId]
      : test.kind === "skill"
        ? actor.skillModifiers?.[test.skill]
        : undefined;
  if (!Number.isFinite(recorded) && !Number.isFinite(actor.abilities?.[abilityId])) {
    const name = abilityName(abilityId);
    fail(
      `Manca il punteggio di ${name.it} nella scheda di ${actor.name}: correggi la scheda.`,
      `${actor.name}'s sheet has no ${name.en} score: correct the sheet.`,
      { code: "score" },
    );
  }
  const profile = testProfile(state, actorId, {
    kind: test.kind,
    ability: abilityId,
    skill: test.kind === "skill" ? test.skill : undefined,
  });
  return { modifier: profile.modifier, ability: abilityId, sources: profile.sources };
}
/**
 * What the creature's conditions do to one D20 Test: the one engine's rules (sheet-plus-domain
 * testConditions; SRD 5.2.1 Conditions). Review P2-12.
 */
export function conditionTest(state, actorId, { kind, ability, skill } = {}) {
  return testConditions(state, actorId, { kind, ability, skill });
}
/** Advantage and Disadvantage together cancel out: the one engine's rule (SRD EN 7–8 / IT 8). */
export { combineModes };
/** Names of condition reasons in one language: "Trattenuto, Avvelenato". */
export const reasonNames = (reasons, lang = "it") =>
  (reasons ?? []).map((r) => pick(r.name, lang)).join(", ");

/** Title of a D20 Test: "Tiro salvezza su Destrezza", "Prova di Destrezza (Acrobazia)". */
export function testTitle({ kind, ability, skill }) {
  if (kind === "skill") {
    const info = skillInfo(skill);
    const a = abilityName(info?.ability);
    return text(
      `Prova di ${a?.it ?? ""} (${info?.name.it ?? skill})`,
      `${a?.en ?? ""} (${info?.name.en ?? skill}) check`,
    );
  }
  const a = abilityName(ability);
  if (kind === "save") return text(`Tiro salvezza su ${a?.it}`, `${a?.en} saving throw`);
  return text(`Prova di ${a?.it}`, `${a?.en} check`);
}
export const signed = (n) => (n < 0 ? "−" + Math.abs(n) : "+" + n);

// ---------------------------------------------------------------- audience

/** Audiences offered to a role (Foundry modes; the DM's own GM roll is "Solo io"). */
export const audiencesFor = (role) => (role === "dm" ? ["public", "self"] : [...AUDIENCES]);
export const AUDIENCE_NAMES = Object.freeze({
  public: text("Tutti", "Everyone"),
  gm: text("Io e il DM", "Me and the DM"),
  blind: text("Solo il DM", "DM only"),
  self: text("Solo io", "Only me"),
});
export const audienceName = (audience, role) =>
  audience === "self" && role === "dm" ? text("Solo DM", "DM only") : AUDIENCE_NAMES[audience];

const playsActor = (state, actorId, role) => {
  const actor = state.actors?.[actorId];
  return (
    !!actor &&
    canControlActor(actor, role, state) &&
    (actor.owner === role || (Array.isArray(actor.controllers) && actor.controllers.includes(role)))
  );
};
/**
 * Whether `role` may read a tray roll's faces and total. Public: everyone. GM: the roller
 * and the DM. Blind: the DM only (the roller gets a confirmation). Self: the roller only.
 * A reveal adds everyone or whoever plays the named characters.
 */
export function canSeeResult(record, role, state) {
  if (!record) return false;
  if (record.audience === "public") return true;
  if (record.reveal?.all) return true;
  // C3: whoever runs the session reads the rolls sent to the DM ("Solo il DM", "Io e il
  // DM"), never a personal sheet's roll nor the DM's own hidden roll.
  const runner =
    role !== "dm" &&
    !record.forced &&
    ["blind", "gm"].includes(record.audience) &&
    runsSessionFor(state, role);
  if (record.audience === "blind") {
    if (role === "dm" || runner) return true;
  } else if (record.by === role) return true;
  if (record.audience === "gm" && (role === "dm" || runner)) return true;
  if (record.reveal?.dm && role === "dm") return true;
  return (record.reveal?.actorIds ?? []).some((id) => playsActor(state, id, role));
}
/**
 * What `role` knows of a roll it cannot read: the roller's confirmation for a blind roll
 * (Roll20 /sr) or the announcement of a hidden roll (Bones!), when it was announced.
 * Null when the roll stays invisible (Roll20 /ssr, or no announcement policy).
 */
export function announcementFor(record, role, state) {
  if (canSeeResult(record, role, state)) return null;
  if (record.by === role && record.audience === "blind")
    return text(
      "Tiro inviato al DM: il risultato è nascosto anche a te.",
      "Roll sent to the DM: the result is hidden from you too.",
    );
  if (record.announced)
    return record.by === "dm"
      ? text("Il DM ha fatto un tiro nascosto.", "The DM made a hidden roll.")
      : text(
          `${record.actorName ?? "Un giocatore"} ha fatto un tiro nascosto.`,
          `${record.actorName ?? "A player"} made a hidden roll.`,
        );
  return null;
}
/** Whether a roll should be announced to the others (policy, audience and connection). */
export const shouldAnnounce = (audience, policyAnnounce, online) =>
  audience !== "public" && audience !== "gm" && policyAnnounce !== false && online !== false
    ? audience === "self"
    : false;

// ---------------------------------------------------------------- actors

/** Creatures this identity may roll for from the tray: visible and controlled. */
export function trayActors(state, role) {
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor &&
      !actor.dead &&
      canViewActor(actor, role, state) &&
      canControlActor(actor, role, state),
  );
}
/** The tray's default roller: the selected token when controlled, else the first character. */
export function defaultActor(state, role, selectedId) {
  const actors = trayActors(state, role);
  const selected = actors.find((a) => a.id === selectedId);
  if (selected && (role !== "dm" || selected.owner !== "player")) return selected.id;
  if (role === "dm") return "";
  return (
    actors.find((a) => a.kind === "character" && !forcedPrivateReason(state, a.id))?.id ??
    actors[0]?.id ??
    ""
  );
}

// ---------------------------------------------------------------- slice

export const PRESET_SEED = Object.freeze([
  {
    id: "half-cover",
    label: text("Mezza copertura", "Half Cover"),
    value: 2,
    note: text("CA e tiri salvezza su Destrezza", "AC and Dexterity saving throws"),
    visible: true,
    source: SOURCES.cover,
  },
  {
    id: "three-quarters-cover",
    label: text("Tre quarti di copertura", "Three-Quarters Cover"),
    value: 5,
    note: text("CA e tiri salvezza su Destrezza", "AC and Dexterity saving throws"),
    visible: true,
    source: SOURCES.cover,
  },
]);
export const seedSlice = () => ({
  rolls: [],
  inspiration: {},
  presets: copy(PRESET_SEED),
  stacks: { player: [], dm: [] },
  requestRerolls: [],
  closedRequests: [],
  devices: { player: [], dm: [] },
  diceMethods: { player: {}, dm: {} },
  policies: {},
});
const methodsOf = (value) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).filter(
          ([sides, method]) =>
            STANDARD_SIDES.includes(Number(sides)) &&
            DIE_METHODS.includes(method) &&
            method !== "default",
        ),
      )
    : {};
export function normalizeSlice(saved, fromVersion) {
  if (fromVersion > 1) throw Error("Unknown future dice-tray version");
  const seed = seedSlice();
  const value = saved && typeof saved === "object" ? saved : {};
  const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);
  const perRole = (v) => ({
    player: list(v?.player),
    dm: list(v?.dm),
  });
  return {
    rolls: list(value.rolls).slice(-MAX_RECORDS),
    inspiration:
      value.inspiration && typeof value.inspiration === "object" ? value.inspiration : {},
    presets: Array.isArray(value.presets) ? list(value.presets) : seed.presets,
    stacks: perRole(value.stacks),
    requestRerolls: list(value.requestRerolls),
    closedRequests: Array.isArray(value.closedRequests)
      ? value.closedRequests.filter((id) => typeof id === "string")
      : [],
    devices: {
      player: list(value.devices?.player).map(normalizeDevice),
      dm: list(value.devices?.dm).map(normalizeDevice),
    },
    diceMethods: {
      player: methodsOf(value.diceMethods?.player),
      dm: methodsOf(value.diceMethods?.dm),
    },
    policies:
      value.policies && typeof value.policies === "object" && !Array.isArray(value.policies)
        ? Object.fromEntries(
            Object.entries(value.policies).filter(([, p]) => p && typeof p === "object"),
          )
        : {},
  };
}
const newId = (prefix) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`;

// ---------------------------------------------------------------- inspiration

export const hasInspiration = (slice, actorId) => slice?.inspiration?.[actorId]?.active === true;
/**
 * Gives or removes Heroic Inspiration (DDB header toggle, DDB-036). Whoever plays the
 * character or the DM may change it; one instance at most (SRD EN 8 / IT 8), so giving it
 * twice changes nothing.
 */
export function setInspiration(slice, state, actorId, active, role, now) {
  const actor = state.actors?.[actorId];
  if (!actor || actor.kind !== "character")
    fail(
      "L'Ispirazione eroica è dei personaggi giocanti.",
      "Heroic Inspiration belongs to player characters.",
    );
  if (!(role === "dm" || playsActor(state, actorId, role)))
    fail(
      "Può cambiarla chi gioca il personaggio o il DM.",
      "Whoever plays the character or the DM can change it.",
    );
  const current = hasInspiration(slice, actorId);
  if (current === !!active) return { changed: false };
  slice.inspiration[actorId] = { active: !!active, at: now, by: role };
  return { changed: true };
}

// ---------------------------------------------------------------- roll policy (PG-48)

/**
 * Sets a character's roll policy (Roll20 "Manage Sheet": roll queries and whisper to GM;
 * Beyond20 "Type of Roll"): d20 normal / always ask / always advantage / always
 * disadvantage, the default audience and automatic damage (with critical dice) after a sheet
 * attack. Whoever controls the character sets it; the engine (sheet-plus-domain rollPolicy)
 * applies it on every surface.
 */
export function setPolicy(slice, state, actorId, input, role) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    fail(
      "La politica dei tiri la sceglie chi controlla la creatura.",
      "Whoever controls the creature chooses its roll policy.",
    );
  const d20 = ["normal", "ask", "advantage", "disadvantage"].includes(input?.d20)
    ? input.d20
    : "normal";
  const audience = AUDIENCES.includes(input?.audience) ? input.audience : "public";
  slice.policies ??= {};
  slice.policies[actorId] = { d20, audience, autoDamage: input?.autoDamage === true };
  return slice.policies[actorId];
}
/** The character's policy with the tray's defaults filled in (for the settings form). */
export function policyOf(slice, actorId) {
  const raw = slice?.policies?.[actorId] ?? null;
  return {
    set: Boolean(raw),
    d20: raw?.d20 ?? "normal",
    audience: raw?.audience ?? "public",
    autoDamage: raw?.autoDamage === true,
  };
}

// ---------------------------------------------------------------- modifier stack

export const stackOf = (slice, role) => slice?.stacks?.[role] ?? [];
export const stackTotal = (stack) => stack.reduce((sum, m) => sum + m.value, 0);
function cleanLabel(value, max = 40) {
  const clean = (v) =>
    String(v ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  if (value && typeof value === "object") return text(clean(value.it), clean(value.en));
  const one = clean(value);
  return text(one, one);
}
const validModifier = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n === 0 || n < -20 || n > 20)
    fail(
      "Il modificatore è un numero intero tra −20 e +20, diverso da 0.",
      "The modifier is a whole number from −20 to +20, not 0.",
    );
  return n;
};
/** Adds a campaign preset or a typed number to this identity's stack (FG, R20-174). */
export function pushStack(slice, role, entry) {
  const stack = (slice.stacks[role] ||= []);
  if (stack.length >= 8)
    fail("La pila tiene al massimo 8 modificatori.", "The stack holds at most 8 modifiers.");
  if (entry.presetId) {
    const preset = slice.presets.find((p) => p.id === entry.presetId);
    if (!preset || (role !== "dm" && preset.visible === false))
      fail("Modificatore non disponibile.", "Modifier unavailable.");
    stack.push({
      id: newId("mod"),
      presetId: preset.id,
      label: copy(preset.label),
      value: preset.value,
    });
  } else {
    const value = validModifier(entry.value);
    const label = cleanLabel(entry.label || (value > 0 ? "+" + value : "−" + Math.abs(value)));
    stack.push({ id: newId("mod"), presetId: null, label, value });
  }
  return stack.at(-1);
}
export function removeFromStack(slice, role, id) {
  const stack = slice.stacks[role] ?? [];
  const index = stack.findIndex((m) => m.id === id);
  if (index < 0) fail("Modificatore già tolto.", "Modifier already removed.");
  stack.splice(index, 1);
}
export function clearStack(slice, role) {
  slice.stacks[role] = [];
}
/** DM campaign presets (FG Standard Modifiers, R20-126): add, change visibility, remove. */
export function addPreset(slice, role, input) {
  if (role !== "dm") fail("Solo il DM prepara i modificatori.", "Only the DM prepares modifiers.");
  const value = validModifier(input.value);
  const label = cleanLabel(input.label);
  if (!label.it)
    fail("Dai un nome al modificatore.", "Give the modifier a name.", { code: "label" });
  if (slice.presets.length >= 12)
    fail("Al massimo 12 modificatori preparati.", "At most 12 prepared modifiers.");
  const preset = {
    id: newId("preset"),
    label,
    value,
    note: cleanLabel(input.note ?? "", 60),
    visible: input.visible !== false,
    source: { kind: "authored", revision: "dm-preset" },
  };
  slice.presets.push(preset);
  return preset;
}
export function setPresetVisible(slice, role, id, visible) {
  if (role !== "dm") fail("Solo il DM prepara i modificatori.", "Only the DM prepares modifiers.");
  const preset = slice.presets.find((p) => p.id === id);
  if (!preset) fail("Modificatore non trovato.", "Modifier not found.");
  preset.visible = !!visible;
}
export function removePreset(slice, role, id) {
  if (role !== "dm") fail("Solo il DM prepara i modificatori.", "Only the DM prepares modifiers.");
  const index = slice.presets.findIndex((p) => p.id === id);
  if (index < 0) fail("Modificatore non trovato.", "Modifier not found.");
  slice.presets.splice(index, 1);
}
export const visiblePresets = (slice, role) =>
  (slice?.presets ?? []).filter((p) => role === "dm" || p.visible !== false);

// ---------------------------------------------------------------- connected dice (simulated)

// TV-95, delegated simulation (I-233): the Pixels pattern (Foundry's Pixels module, the
// Roll20 and D&D Beyond integrations; FVT-153, VTL-176). A scan lists nearby dice with
// signal and battery, «Collega» pairs one, each paired die has a state (connected, not
// connected, charging), a battery with a warning under 20 %, «Fai lampeggiare» and
// «Scollega»; each die type has a fulfilment method (Foundry's dice configuration). There
// is no Bluetooth here: the dice, their battery and the throw are simulated, and the face a
// simulated throw reports comes from the app's dice service.

export const LOW_BATTERY = 20;
export const DEVICE_STATES = Object.freeze(["connected", "disconnected", "charging"]);
export const DIE_METHODS = Object.freeze(["default", "digital", "physical", "connected"]);
export const SIGNALS = Object.freeze({
  strong: text("forte", "strong"),
  medium: text("medio", "medium"),
  weak: text("debole", "weak"),
});
export const DEVICE_STATE_NAMES = Object.freeze({
  connected: text("Connesso", "Connected"),
  disconnected: text("Non connesso", "Not connected"),
  charging: text("In carica", "Charging"),
});
/** What a simulated scan finds nearby (Pixels colourways; synthetic data). */
export const NEARBY_DICE = Object.freeze([
  {
    pixelId: "px-d20-onyx",
    sides: 20,
    name: text("Pixels d20 Onice", "Pixels d20 Onyx"),
    battery: 86,
    signal: "strong",
    charging: false,
  },
  {
    pixelId: "px-d20-aurora",
    sides: 20,
    name: text("Pixels d20 Aurora", "Pixels d20 Aurora"),
    battery: 14,
    signal: "medium",
    charging: false,
  },
  {
    pixelId: "px-d6-hellfire",
    sides: 6,
    name: text("Pixels d6 Fiamma", "Pixels d6 Hellfire"),
    battery: 62,
    signal: "weak",
    charging: false,
  },
  {
    pixelId: "px-d8-galaxy",
    sides: 8,
    name: text("Pixels d8 Galassia", "Pixels d8 Galaxy"),
    battery: 71,
    signal: "strong",
    charging: false,
  },
  {
    pixelId: "px-d12-clear",
    sides: 12,
    name: text("Pixels d12 Cristallo", "Pixels d12 Clear"),
    battery: 40,
    signal: "medium",
    charging: true,
  },
]);
const devicesOf = (slice, role) => slice?.devices?.[role] ?? [];
/** A saved device with every field (older saves had only id, sides and name). */
export function normalizeDevice(raw) {
  const sides = STANDARD_SIDES.includes(Number(raw?.sides)) ? Number(raw.sides) : 20;
  const battery = Number(raw?.battery);
  return {
    ...raw,
    sides,
    name:
      raw?.name && typeof raw.name === "object"
        ? raw.name
        : cleanLabel(raw?.name || `Pixels d${sides}`, 30),
    battery: Number.isFinite(battery) ? Math.max(0, Math.min(100, Math.round(battery))) : 100,
    state: DEVICE_STATES.includes(raw?.state) ? raw.state : "connected",
    signal: SIGNALS[raw?.signal] ? raw.signal : "strong",
    pixelId: typeof raw?.pixelId === "string" ? raw.pixelId : null,
  };
}
export const batteryLow = (device) =>
  Number.isFinite(device?.battery) && device.battery < LOW_BATTERY;
/** «Cerca dadi vicini»: the simulated dice in range that this identity has not paired. */
export function nearbyDice(slice, role) {
  const paired = new Set(
    devicesOf(slice, role)
      .map((d) => d.pixelId)
      .filter(Boolean),
  );
  return NEARBY_DICE.filter((d) => !paired.has(d.pixelId)).map((d) => copy(d));
}
/**
 * «Collega»: pairs a die found by the scan (`pixelId`), or a generic simulated die of `sides`.
 * A die type without a chosen method starts using the die it just paired (Pixels: the
 * connected die answers every roll of its type).
 */
export function pairDevice(slice, role, input) {
  const devices = (slice.devices[role] ||= []);
  const found = input?.pixelId ? NEARBY_DICE.find((d) => d.pixelId === input.pixelId) : null;
  if (input?.pixelId && !found)
    fail("Questo dado non è più nelle vicinanze.", "This die is no longer nearby.");
  if (found && devices.some((d) => d.pixelId === found.pixelId))
    fail("Questo dado è già collegato.", "This die is already paired.");
  const sides = found ? found.sides : Number(input?.sides);
  if (!STANDARD_SIDES.includes(sides))
    fail("Scegli un dado standard da associare.", "Choose a standard die to pair.");
  if (devices.length >= 6) fail("Al massimo 6 dadi connessi.", "At most 6 connected dice.");
  const device = normalizeDevice({
    id: newId("device"),
    sides,
    name: found ? copy(found.name) : cleanLabel(input?.name || `Pixels d${sides}`, 30),
    battery: found?.battery ?? 100,
    signal: found?.signal ?? "strong",
    state: found?.charging ? "charging" : "connected",
    pixelId: found?.pixelId ?? null,
  });
  devices.push(device);
  const methods = (slice.diceMethods ||= { player: {}, dm: {} });
  methods[role] ||= {};
  if (!methods[role][sides] || methods[role][sides] === "default")
    methods[role][sides] = "connected";
  return device;
}
export function renameDevice(slice, role, id, name) {
  const device = devicesOf(slice, role).find((d) => d.id === id);
  if (!device) fail("Dado connesso non trovato.", "Connected die not found.");
  const label = cleanLabel(name, 30);
  if (!label.it) fail("Dai un nome al dado.", "Give the die a name.");
  device.name = label;
}
/**
 * «Scollega» (state "disconnected"), «Ricollega» (back to "connected") and «Togli dal
 * caricatore» (a charging die back to "connected"). A disconnected die stays in the list.
 */
export function setDeviceState(slice, role, id, state) {
  const device = devicesOf(slice, role).find((d) => d.id === id);
  if (!device) fail("Dado connesso non trovato.", "Connected die not found.");
  if (!DEVICE_STATES.includes(state)) fail("Stato del dado sconosciuto.", "Unknown die state.");
  device.state = state;
  return device;
}
export function forgetDevice(slice, role, id) {
  const devices = slice.devices[role] ?? [];
  const index = devices.findIndex((d) => d.id === id);
  if (index < 0) fail("Dado connesso non trovato.", "Connected die not found.");
  const [gone] = devices.splice(index, 1);
  // The last die of a type forgotten: that type goes back to the default method.
  const methods = slice.diceMethods?.[role];
  if (methods?.[gone.sides] === "connected" && !devices.some((d) => d.sides === gone.sides))
    delete methods[gone.sides];
}
/** The paired die of a type that reports rolls: a connected one first, else any paired one. */
export function deviceFor(slice, role, sides) {
  const list = devicesOf(slice, role).filter((d) => d.sides === sides);
  return list.find((d) => (d.state ?? "connected") === "connected") ?? list[0] ?? null;
}
/** A die of this type that can report a throw now (paired and connected, C6). */
export function usableDevice(slice, role, sides) {
  return (
    devicesOf(slice, role).find(
      (d) => d.sides === sides && (d.state ?? "connected") === "connected",
    ) ?? null
  );
}
/** The method chosen for a die type ("default" follows the tray's «Dadi»). */
export const dieMethodOf = (slice, role, sides) => {
  const value = slice?.diceMethods?.[role]?.[sides];
  return DIE_METHODS.includes(value) ? value : "default";
};
/**
 * Foundry's dice configuration: how one die type is rolled for this identity. "connected"
 * needs a paired die of that type; otherwise (and for "default") the tray's «Dadi» choice
 * (`fallback`: digital or physical) decides.
 */
export function dieMethod(slice, role, sides, fallback = "digital") {
  const chosen = dieMethodOf(slice, role, sides);
  if (chosen === "connected" && deviceFor(slice, role, sides)) return "connected";
  if (chosen === "digital" || chosen === "physical") return chosen;
  return fallback === "physical" ? "physical" : "digital";
}
/** Sets the method of one die type; a connected method needs a paired die of that type. */
export function setDieMethod(slice, role, sides, method) {
  const n = Number(sides);
  if (!STANDARD_SIDES.includes(n)) fail("Scegli un dado standard.", "Choose a standard die.");
  if (!DIE_METHODS.includes(method)) fail("Metodo sconosciuto.", "Unknown method.");
  if (method === "connected" && !deviceFor(slice, role, n))
    fail(
      `Nessun d${n} collegato: collegane uno con «Cerca dadi vicini».`,
      `No d${n} paired: pair one with “Find nearby dice”.`,
      { code: "no-device" },
    );
  const methods = (slice.diceMethods ||= { player: {}, dm: {} });
  methods[role] ||= {};
  if (method === "default") delete methods[role][n];
  else methods[role][n] = method;
}
/** One entry per die of `sides`, with its method and (when connected) the die that reports it. */
export function dicePlan(slice, role, sides, fallback = "digital") {
  return sides.map((s) => {
    const method = dieMethod(slice, role, s, fallback);
    return { sides: s, method, device: method === "connected" ? deviceFor(slice, role, s) : null };
  });
}

// ---------------------------------------------------------------- roll records

function retryKey(role, input) {
  return JSON.stringify([
    role,
    input.actorId ?? null,
    input.kind,
    input.ability ?? null,
    input.skill ?? null,
    input.expression,
    input.dc ?? null,
  ]);
}
/**
 * Validates a tray roll before any face is drawn. Returns the normalized input with the
 * parsed expression (roll mode applied), the stack it consumes and the audience.
 */
export function prepareRoll(slice, state, raw, role) {
  const kind = ["free", "check", "save", "skill"].includes(raw?.kind) ? raw.kind : "free";
  const actorId = raw?.actorId || null;
  const actor = actorId ? state.actors?.[actorId] : null;
  if (actorId && !trayActors(state, role).some((a) => a.id === actorId))
    fail("Non puoi tirare per questa creatura.", "You cannot roll for this creature.", {
      code: "actor",
    });
  let formula = raw?.formula;
  let modifierSources = [];
  let ability = null;
  let skill = null;
  let conditionReasons = null;
  let riders = [];
  if (kind !== "free") {
    if (!actor) fail("Scegli chi tira la prova.", "Choose who makes the test.", { code: "actor" });
    const test = testModifier(state, actorId, {
      kind,
      ability: raw.ability,
      skill: raw.skill,
    });
    ability = test.ability;
    skill = kind === "skill" ? raw.skill : null;
    modifierSources = test.sources;
    const effects = conditionTest(state, actorId, { kind, ability, skill });
    if (effects.autoFail.length) {
      const name = abilityName(ability);
      fail(
        `${actor.name} fallisce automaticamente i tiri salvezza su ${name.it} (${reasonNames(effects.autoFail, "it")}): non serve tirare.`,
        `${actor.name} automatically fails ${name.en} saving throws (${reasonNames(effects.autoFail, "en")}): no roll is needed.`,
        { code: "auto-fail", reasons: effects.autoFail },
      );
    }
    if (effects.advantage.length || effects.disadvantage.length)
      conditionReasons = { advantage: effects.advantage, disadvantage: effects.disadvantage };
    // Toggled riders (PG-47; Beyond20 per-character toggles, AboveVTT buffs): Bless and Bane
    // roll their die with the test, a flat rider joins the named sources.
    riders = activeRiders(state, actorId, riderKindOf(kind)).map((r) => ({
      id: r.id,
      name: copy(r.name),
      sign: r.sign,
      dice: r.dice ? copy(r.dice) : null,
      flat: r.flat ?? 0,
    }));
    let constant = test.modifier;
    for (const r of riders)
      if (r.flat) {
        modifierSources = [...modifierSources, { label: copy(r.name), value: r.sign * r.flat }];
        constant += r.sign * r.flat;
      }
    const dice = riders
      .filter((r) => r.dice)
      .map((r) => `${r.sign < 0 ? "-" : "+"}${r.dice.count}d${r.dice.sides}`)
      .join("");
    formula = `1d20${dice}${constant ? (constant < 0 ? "-" : "+") + Math.abs(constant) : ""}`;
  }
  const parsed = parseFormula(formula);
  const chosen = ROLL_MODES.includes(raw?.rollMode) ? raw.rollMode : "normal";
  // A condition's Advantage/Disadvantage joins the chosen one; both together cancel out.
  const rollMode =
    conditionReasons && chosen !== "critical"
      ? combineModes(
          chosen,
          conditionReasons.advantage.length ? "advantage" : "normal",
          conditionReasons.disadvantage.length ? "disadvantage" : "normal",
        )
      : chosen;
  const effective = applyRollMode(parsed, rollMode);
  const stack = raw?.useStack === false ? [] : copy(stackOf(slice, role));
  const dc = raw?.dc === "" || raw?.dc === null || raw?.dc === undefined ? null : Number(raw.dc);
  if (dc !== null) {
    if (!Number.isInteger(dc) || dc < 1 || dc > 40)
      fail("La CD è un numero intero tra 1 e 40.", "The DC is a whole number from 1 to 40.", {
        code: "dc",
      });
    // One d20 term (Bless's 1d4 or other dice may be added to it).
    const d20 = effective.terms.filter((t) => t.type === "dice" && t.sides === 20);
    if (d20.length !== 1 || d20[0].mods.success || d20[0].mods.explode)
      fail(
        "La CD vale per una prova con d20: un solo termine d20, più eventuali dadi e modificatori.",
        "A DC applies to a D20 Test: one d20 term, plus any other dice and modifiers.",
        { code: "dc-d20" },
      );
  }
  const allowed = audiencesFor(role);
  let audience = allowed.includes(raw?.audience) ? raw.audience : "public";
  // A personal, hidden or out-of-campaign sheet never rolls for the table (same rule as
  // the core's accepted rolls and B56).
  const forced = actorId ? forcedPrivateReason(state, actorId) : null;
  if (forced && audience !== "self") audience = "self";
  const mode = DICE_MODES.includes(raw?.mode) ? raw.mode : "digital";
  const title =
    kind === "free"
      ? raw?.label
        ? cleanLabel(raw.label, 60)
        : null
      : testTitle({ kind, ability, skill });
  return {
    kind,
    actorId,
    actor,
    ability,
    skill,
    formula: parsed.text,
    expression: effective.text,
    parsed: effective,
    rollMode,
    chosenMode: chosen,
    conditionReasons,
    riders,
    stack,
    modifierSources,
    dc,
    audience,
    forced,
    mode,
    title,
  };
}
/**
 * Records one tray roll. `faces` supplies physical faces; otherwise `draw(sides)` is the
 * app's dice service (digital) or the connected die (per die, with digital fallback).
 * An identical digital retry after a withdrawal reuses the withdrawn faces once (I-229).
 */
export function recordRoll(
  slice,
  state,
  raw,
  role,
  { draw, faces, faceModes: reported, devices, now, announce, online, id } = {},
) {
  const input = prepareRoll(slice, state, raw, role);
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
  let result;
  let faceModes = null;
  if (input.mode === "physical") result = physicalFaces(input.parsed, faces);
  else if (withdrawn) {
    const queue = [...withdrawn.values];
    result = evaluate(input.parsed, (sides) => {
      const face = queue.shift();
      return Number.isInteger(face) && face >= 1 && face <= sides
        ? face
        : digitalFaces(draw)(sides);
    });
  } else if (input.mode === "connected") {
    // TV-95: a connected die reports its faces like a physical die (the Pixels module fills
    // Foundry's manual fulfilment); `faceModes` says per die whether the connected die, the
    // hand or the dice service gave it, `devices` which dice reported.
    const modes = Array.isArray(reported) ? reported : [];
    if (
      !modes.includes("connected") ||
      !baseSides(input.parsed).some((s, i) => modes[i] === "connected" && deviceFor(slice, role, s))
    )
      fail(
        "Nessun dado connesso adatto: collegane uno in Dadi › Impostazioni › Dadi connessi, o scegli dadi digitali.",
        "No matching connected die: pair one in Dice › Settings › Connected dice, or choose digital dice.",
        { code: "no-device" },
      );
    result = physicalFaces(input.parsed, faces);
    // In the input order of the faces (base dice, then explosion dice), as inputOrder.
    faceModes = result.values.map((_, i) =>
      ["connected", "physical", "digital"].includes(modes[i]) ? modes[i] : "physical",
    );
  } else result = evaluate(input.parsed, digitalFaces(draw));
  const stackValue = stackTotal(input.stack);
  const total = result.total + stackValue;
  const d20 =
    input.parsed.terms.length && input.parsed.terms.some((t) => t.type === "dice" && t.sides === 20)
      ? result.groups.find((g) => g.sides === 20)
      : null;
  const natural = d20 && !d20.mods.success ? (d20.faces.find((f) => f.kept)?.value ?? null) : null;
  const at = now ?? new Date().toISOString();
  const record = {
    id: id ?? newId("roll"),
    at,
    by: role,
    actorId: input.actor?.id ?? null,
    actorName: input.actor?.name ?? null,
    kind: input.kind,
    ability: input.ability,
    skill: input.skill,
    title: input.title,
    formula: input.formula,
    expression: input.expression,
    rollMode: input.rollMode,
    ...(input.conditionReasons ? { conditionReasons: copy(input.conditionReasons) } : {}),
    ...(input.riders.length ? { riders: copy(input.riders) } : {}),
    groups: result.groups,
    values: result.values,
    constant: result.constant,
    stack: input.stack,
    modifierSources: input.modifierSources,
    total,
    natural,
    dc: input.dc,
    // C1: a DC the DM set (the DM's roll, a roll written in the journal) follows the
    // campaign's «CD dei tiri»; one the roller typed stays theirs.
    ...(input.dc !== null
      ? { dcBy: role === "dm" || raw?.origin?.kind === "journal" ? "dm" : "player" }
      : {}),
    success: input.dc !== null ? total >= input.dc : null,
    mode: input.mode === "connected" ? "physical" : input.mode,
    ...(faceModes ? { faceModes } : {}),
    ...(faceModes && Array.isArray(devices) && devices.length
      ? { devices: devices.map((d) => cleanLabel(d, 30)) }
      : {}),
    audience: input.audience,
    forced: !!input.forced,
    // A personal, hidden or out-of-campaign sheet's roll stays the roller's only: no
    // announcement names it to the others (review P1-1).
    announced: !input.forced && shouldAnnounce(input.audience, announce, online),
    status: withdrawn ? "reused" : "accepted",
    retryKey: key,
    ...(withdrawn ? { reusedFrom: withdrawn.id } : {}),
    corrections: [],
    reveal: { all: false, dm: false, actorIds: [], history: [] },
    rerolls: [],
    origin: copy(raw?.origin ?? null),
  };
  if (withdrawn) withdrawn.reusedBy = record.id;
  slice.rolls.push(record);
  if (slice.rolls.length > MAX_RECORDS) slice.rolls.splice(0, slice.rolls.length - MAX_RECORDS);
  // The stack applies to this roll only (Fantasy Grounds): it empties once used.
  if (input.stack.length && raw?.useStack !== false) slice.stacks[role] = [];
  return record;
}
const reasonOf = (reason) => {
  const clean = String(reason ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  if (!clean)
    fail("Scrivi il motivo della correzione.", "Write the reason for the correction.", {
      code: "reason",
    });
  return clean;
};
function ownRoll(slice, id, role) {
  const record = slice.rolls.find((r) => r.id === id);
  if (!record) fail("Tiro non trovato.", "Roll not found.");
  if (record.by !== role)
    fail("Può correggerlo solo chi l'ha tirato.", "Only whoever rolled it can correct it.");
  if (record.status === "withdrawn")
    fail("Il tiro è già ritirato.", "The roll is already withdrawn.");
  return record;
}
/** Withdraws a roll with a reason: its faces stay as evidence (B56 rule). */
export function withdrawRoll(slice, id, reason, role, now) {
  const record = ownRoll(slice, id, role);
  const why = reasonOf(reason);
  record.status = "withdrawn";
  record.withdrawal = { at: now, by: role, reason: why };
  return record;
}
/** Corrects the faces of a physical roll with a reason; the previous faces stay listed. */
export function correctRoll(slice, state, id, faces, reason, role, now) {
  const record = ownRoll(slice, id, role);
  if (record.mode !== "physical")
    fail(
      "Si correggono solo le facce inserite a mano; un tiro digitale si ritira.",
      "Only hand-entered faces can be corrected; withdraw a digital roll.",
    );
  const why = reasonOf(reason);
  const parsed = { terms: record.groups.length ? rebuildTerms(record) : [] };
  const result = physicalFaces(parsed, faces);
  record.corrections.push({
    at: now,
    by: role,
    values: [...record.values],
    total: record.total,
    reason: why,
  });
  record.groups = result.groups;
  record.values = result.values;
  record.total = result.total + stackTotal(record.stack ?? []);
  const d20 = result.groups.find((g) => g.sides === 20 && !g.mods.success);
  record.natural = d20 ? (d20.faces.find((f) => f.kept)?.value ?? null) : null;
  record.success = record.dc !== null ? record.total >= record.dc : null;
  record.status = "corrected";
  return record;
}
/** Parsed terms of a recorded roll (its effective expression), for re-evaluation. */
export function rebuildTerms(record) {
  return parseFormula(record.expression).terms;
}
/**
 * The characters a DM reveal can reach (Fantasy Grounds drags a result onto one player,
 * R20-172): shared characters a player plays. Never a personal sheet the DM cannot read,
 * never a character the DM plays (the reveal would reach nobody).
 */
export function revealTargets(state) {
  return Object.values(state?.actors ?? {}).filter(
    (actor) =>
      actor &&
      actor.kind === "character" &&
      actor.visibility !== "private" &&
      canViewActor(actor, "dm", state) &&
      playsActor(state, actor.id, "player"),
  );
}
/**
 * Reveals a hidden roll later (Foundry reveal; FG drag onto a player): to everyone, to the
 * DM (the roller of a "Solo io" roll) or to whoever plays one character (the DM only).
 */
export function revealRoll(slice, state, id, target, role, now) {
  const record = slice.rolls.find((r) => r.id === id);
  if (!record) fail("Tiro non trovato.", "Roll not found.");
  if (record.status === "withdrawn")
    fail("Un tiro ritirato non si rivela.", "A withdrawn roll is not revealed.");
  if (record.audience === "public" || record.reveal.all)
    fail("Questo tiro è già visibile a tutti.", "This roll is already visible to everyone.");
  const isRoller = record.by === role && record.audience !== "blind";
  if (!(role === "dm" || isRoller))
    fail("Può rivelarlo il DM o chi ha tirato.", "The DM or whoever rolled it can reveal it.");
  if (target === "all") record.reveal.all = true;
  else if (target === "dm") {
    if (!isRoller || role === "dm") fail("Destinatario non valido.", "Invalid recipient.");
    record.reveal.dm = true;
  } else {
    if (role !== "dm")
      fail("Rivela a un solo personaggio il DM.", "The DM reveals to a single character.");
    if (!revealTargets(state).some((actor) => actor.id === target))
      fail("Rivela a un personaggio di un giocatore.", "Reveal to a character a player plays.", {
        code: "reveal-target",
      });
    if (!record.reveal.actorIds.includes(target)) record.reveal.actorIds.push(target);
  }
  record.reveal.history.push({ at: now, by: role, to: target });
  return record;
}
/**
 * Heroic Inspiration: rerolls one die of the roller's latest roll right after it (SRD EN 8
 * / IT 8); with Advantage or Disadvantage only one d20, chosen by the player. The new face
 * must be used; the old one stays in the history. Spends the character's inspiration.
 */
export function inspirationReroll(slice, state, id, dieIndex, role, { draw, face, now } = {}) {
  const record = slice.rolls.find((r) => r.id === id);
  if (!record) fail("Tiro non trovato.", "Roll not found.");
  if (record.by !== role || !record.actorId)
    fail(
      "Ripete il dado chi ha tirato per il proprio personaggio.",
      "Whoever rolled for their character rerolls the die.",
    );
  if (record.status === "withdrawn") fail("Il tiro è ritirato.", "The roll is withdrawn.");
  if (!hasInspiration(slice, record.actorId))
    fail(
      `${record.actorName} non ha l'Ispirazione eroica.`,
      `${record.actorName} has no Heroic Inspiration.`,
      { code: "no-inspiration" },
    );
  if (record.rerolls.length)
    fail(
      "L'Ispirazione eroica ripete un dado una volta sola.",
      "Heroic Inspiration rerolls one die once.",
    );
  const latest = [...slice.rolls]
    .reverse()
    .find((r) => r.by === role && r.actorId === record.actorId && r.status !== "withdrawn");
  if (latest?.id !== record.id)
    fail(
      "Si ripete subito dopo il tiro: questo non è l'ultimo tiro del personaggio.",
      "It rerolls right after rolling: this is not the character's latest roll.",
      { code: "not-latest" },
    );
  let offset = 0;
  let target = null;
  for (const group of record.groups) {
    for (const f of group.faces) {
      if (offset === dieIndex) target = { group, f };
      offset += 1;
    }
  }
  if (!target) fail("Scegli un dado del tiro.", "Choose a die of the roll.");
  const { group } = target;
  const sides = group.sides;
  const next =
    face !== undefined && face !== null && face !== "" ? Number(face) : digitalFaces(draw)(sides);
  if (!Number.isInteger(next) || next < 1 || next > sides)
    fail(
      `La nuova faccia è un numero intero tra 1 e ${sides}.`,
      `The new face is a whole number from 1 to ${sides}.`,
    );
  const from = target.f.value;
  target.f.value = next;
  target.f.rerolled = true;
  // Recompute the group: keep/drop and successes follow the new face.
  if (group.mods.keep) {
    const { kind, n } = group.mods.keep;
    const order = group.faces
      .map((f, index) => ({ v: f.value, index }))
      .sort(
        (a, b) => (kind === "kh" || kind === "dl" ? b.v - a.v : a.v - b.v) || a.index - b.index,
      );
    const keepCount = kind.startsWith("k") ? n : group.faces.length - n;
    const kept = new Set(order.slice(0, keepCount).map((o) => o.index));
    group.faces.forEach((f, index) => (f.kept = kept.has(index)));
  }
  const before = group.subtotal;
  group.subtotal = group.mods.success
    ? group.faces.filter((f) => f.kept && compare(f.value, group.mods.success)).length
    : group.faces.filter((f) => f.kept).reduce((sum, f) => sum + f.value, 0);
  const previousTotal = record.total;
  record.total += group.sign * (group.subtotal - before);
  record.values = record.groups.flatMap((g) => g.faces.map((f) => f.value));
  const d20 = record.groups.find((g) => g.sides === 20 && !g.mods.success);
  record.natural = d20 ? (d20.faces.find((f) => f.kept)?.value ?? null) : null;
  record.success = record.dc !== null ? record.total >= record.dc : null;
  record.rerolls.push({
    at: now,
    by: role,
    index: dieIndex,
    from,
    to: next,
    mode: face !== undefined && face !== null && face !== "" ? "physical" : "digital",
    previousTotal,
  });
  slice.inspiration[record.actorId] = { active: false, at: now, by: role, spentOn: record.id };
  return record;
}

// ---------------------------------------------------------------- projections

/** A tray roll as this viewer may read it (null when invisible). */
export function projectRoll(record, role, state) {
  const readable = canSeeResult(record, role, state);
  const announcement = readable ? null : announcementFor(record, role, state);
  if (!readable && !announcement) return null;
  const base = {
    id: record.id,
    at: record.at,
    by: record.by,
    own: record.by === role,
    actorId: record.actorId,
    actorName: record.actorName,
    audience: record.audience,
    status: record.status,
    readable,
  };
  if (!readable) return { ...base, announcement };
  return { ...base, ...copy(record), own: record.by === role, readable: true };
}
/** Recent tray rolls for this viewer, newest first (Roll20 keeps the last ten). */
export function recentRolls(slice, state, role, limit = RECENT_LIMIT) {
  const out = [];
  for (const record of [...(slice?.rolls ?? [])].reverse()) {
    const view = projectRoll(record, role, state);
    if (view) out.push(view);
    if (out.length >= limit) break;
  }
  return out;
}
/** The rider whose die a group of a sheet test is: groups after the d20, in rider order. */
export function riderOfGroup(record, index) {
  if (!index || !record?.riders?.length || record.kind === "free") return null;
  return record.riders.filter((r) => r.dice)[index - 1] ?? null;
}
/** The breakdown of a readable roll: "[4, 2] + [3] + 3 (Mezza copertura +2) = 14". */
export function breakdown(view, lang = "it") {
  if (!view?.readable) return "";
  const parts = view.groups.map((g, index) => {
    const faces = g.faces
      .map((f) => (f.kept ? String(f.value) : `~${f.value}~`) + (f.exploded ? "!" : ""))
      .join(", ");
    const sign = g.sign < 0 ? "− " : index ? "+ " : "";
    const suffix =
      g.successes !== null ? ` → ${g.successes} ${lang === "en" ? "successes" : "successi"}` : "";
    // A rider's die names its effect ("+ [3] (Benedizione)", PG-47).
    const rider = riderOfGroup(view, index);
    return `${sign}[${faces}]${suffix}${rider ? ` (${pick(rider.name, lang)})` : ""}`;
  });
  // A sheet test names where its modifier comes from ("+ 2 (Destrezza)"), as DDB does.
  const sources = (view.modifierSources ?? []).filter((m) => m.value);
  if (sources.length && sources.reduce((sum, m) => sum + m.value, 0) === view.constant)
    for (const m of sources)
      parts.push(`${m.value < 0 ? "− " : "+ "}${Math.abs(m.value)} (${pick(m.label, lang)})`);
  else if (view.constant) parts.push((view.constant < 0 ? "− " : "+ ") + Math.abs(view.constant));
  for (const m of view.stack ?? [])
    parts.push(`${m.value < 0 ? "− " : "+ "}${Math.abs(m.value)} (${pick(m.label, lang)})`);
  return `${parts.join(" ")} = ${view.total}`;
}
/** The named sources of a record's constant, when they add up to it (as breakdown). */
function eventSources(record) {
  const sources = (record.modifierSources ?? []).filter((m) => m.value);
  return sources.length && sources.reduce((sum, m) => sum + m.value, 0) === record.constant
    ? sources
    : [];
}
/**
 * The roll object announced with "roll-accepted" (log roll shape, for B56 and others).
 * Hidden audiences stay private; a blind roll belongs to the DM so the roller never sees
 * its dice.
 */
export function rollEvent(record) {
  // Final review P3 (state.mjs acceptedRolls convention): «Io e il DM» and «Solo il DM» are
  // owned by the DM; the roller stays the controller of «Io e il DM», so rollVisibleTo admits
  // both and nobody else. A blind roll's controller is the DM too.
  const owner = ["blind", "gm"].includes(record.audience) ? "dm" : record.by;
  const controller = record.audience === "blind" ? "dm" : record.by;
  const dice = record.groups.map((g) => ({ count: g.faces.length, sides: g.sides }));
  return {
    id: record.id,
    source: ID,
    kind: record.kind,
    actorId: record.actorId,
    actorName: record.actorName,
    controller,
    owner,
    visibility: record.audience === "public" ? "shared" : "private",
    mode:
      record.mode === "physical"
        ? "physical"
        : record.mode === "connected"
          ? "physical"
          : "digital",
    ...(record.faceModes ? { faceModes: [...record.faceModes] } : {}),
    // TV-95: the connected dice that reported the faces («fisico · Pixels d20»).
    ...(record.devices?.length ? { devices: copy(record.devices) } : {}),
    // C1: who set the DC, so every viewer's projection can hide a DM's DC from players.
    ...(record.dcBy ? { dcBy: record.dcBy } : {}),
    dice,
    values: [...record.values],
    kept: record.groups.flatMap((g) => g.faces.map((f) => f.kept)),
    modifier: record.constant + stackTotal(record.stack ?? []),
    natural: record.natural,
    total: record.total,
    dc: record.dc,
    success: record.success,
    ability: record.ability,
    label: record.title ?? text(prettyFormula(record.expression), prettyFormula(record.expression)),
    rollMode: ["advantage", "disadvantage"].includes(record.rollMode) ? record.rollMode : "normal",
    status: record.status,
    stack: copy(record.stack ?? []),
    // The log card's detail (TV-87 / TV-97, Foundry chat log and DDB game log): the formula
    // with its rules (4d6kh3, 10d6cs>=5), each face kept or dropped, the successes, the
    // named sources and riders, who sees it and what was corrected, withdrawn or revealed.
    formula: record.expression ?? null,
    faces: record.groups.flatMap((g, index) => {
      const rider = riderOfGroup(record, index);
      return g.faces.map((f) => ({
        value: f.value,
        sides: g.sides,
        kept: f.kept !== false,
        ...(f.exploded ? { exploded: true } : {}),
        ...(f.rerolled ? { rerolled: true } : {}),
        ...(rider ? { label: copy(rider.name), sign: rider.sign } : {}),
      }));
    }),
    successes: record.groups.some((g) => g.successes !== null)
      ? record.groups.reduce((sum, g) => sum + (g.successes ?? 0), 0)
      : null,
    sources: [...eventSources(record), ...(record.stack ?? [])].map((m) => ({
      label: copy(m.label),
      value: m.value,
    })),
    audience: record.audience,
    ...(record.conditionReasons ? { conditionReasons: copy(record.conditionReasons) } : {}),
    corrections: copy(record.corrections ?? []),
    ...(record.withdrawal ? { withdrawal: copy(record.withdrawal) } : {}),
    reveal: copy(record.reveal ?? null),
    rerolls: copy(record.rerolls ?? []),
  };
}
