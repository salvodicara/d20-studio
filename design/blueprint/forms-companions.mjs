import { canControlActor, canViewActor, isCampaignActor } from "./character-access.mjs";
import { campaignMembers, isCampaignMember, campaignReviewKey } from "./campaign-content.mjs";
import { hasBlockingConsequences, observeConcentrationEnd } from "./combat.mjs";
import * as spatial from "./spatial.mjs";
import { getFamiliarCastingAccess } from "./forms-profile.mjs";
import { hasCondition, getConditionMechanics, combatTurnKey } from "./conditions.mjs";
import { activeItemModifiers, CREATURES, getById } from "./srd-sample.mjs";
import { runsSession } from "./table-spatial.mjs";

const copy = (v) => structuredClone(v);
const text = (it, en) => ({ it, en });
const integer = (v, min = 0) => Number.isSafeInteger(v) && v >= min;
const validId = (v) => typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(v);
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const issue = (code, it, en) => ({ code, it, en });
function fail(
  code = "unavailable",
  it = "Dati o comando non disponibili.",
  en = "Data or command unavailable.",
) {
  throw Object.assign(new Error(en), { code, it, en });
}
const source = (en, it) => ({
  kind: "srd",
  edition: "2024",
  revision: "5.2.1",
  sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
  url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
  pages: en,
  en: {
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
    sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
    pages: en,
  },
  it: {
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf",
    sha256: "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718",
    pages: it,
  },
});
const SHAPE = source([42, 43], [48, 49]),
  FAMILIAR = source([130], [198, 199]),
  CASTING = source([104, 105], [118, 119]),
  POLYMORPH = source([153, 154], [164]);
const MOD = (v) => (Number.isFinite(v) ? Math.floor((v - 10) / 2) : null);
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
function creature(
  id,
  name,
  pages,
  size,
  cr,
  ac,
  hp,
  hitDice,
  speeds,
  values,
  saves,
  skills,
  senses,
  melee,
  traits = [],
) {
  const s = source(pages[0], pages[1]);
  return {
    id,
    name,
    source: s,
    size,
    cr,
    creatureType: "beast",
    ac,
    hp,
    hitDice,
    speeds,
    abilities: Object.fromEntries(ABILITIES.map((k, i) => [k, values[i]])),
    savingThrows: saves,
    skillModifiers: skills,
    senses,
    proficiencyBonus: 2,
    melee: { ...melee, reachMeters: 1.5, source: s },
    traits: traits.map((id) => ({ id, source: s })),
  };
}
const CATALOG = [
  creature(
    "srd2024:cat",
    text("Gatto", "Cat"),
    [[346], [391, 392]],
    "tiny",
    0,
    12,
    2,
    { d4: { max: 1, used: 0 } },
    { walk: 12, climb: 12 },
    [3, 15, 10, 3, 12, 7],
    { str: -4, dex: 4, con: 0, int: -4, wis: 1, cha: -2 },
    { perception: 3, stealth: 4 },
    { darkvisionMeters: 18, passivePerception: 13 },
    {
      name: text("Graffio", "Scratch"),
      attackBonus: 4,
      damageDice: [],
      damageModifier: 0,
      fixedDamage: 1,
      damageType: "slashing",
    },
    ["jumper-dexterity"],
  ),
  creature(
    "srd2024:rat",
    text("Topo", "Rat"),
    [[359], [405]],
    "tiny",
    0,
    10,
    1,
    { d4: { max: 1, used: 0 } },
    { walk: 6, climb: 6 },
    [2, 11, 9, 2, 10, 4],
    { str: -4, dex: 0, con: -1, int: -4, wis: 0, cha: -3 },
    { perception: 2 },
    { darkvisionMeters: 9, passivePerception: 12 },
    {
      name: text("Morso", "Bite"),
      attackBonus: 2,
      damageDice: [],
      damageModifier: 0,
      fixedDamage: 1,
      damageType: "piercing",
    },
    ["agile"],
  ),
  creature(
    "srd2024:wolf",
    text("Lupo", "Wolf"),
    [[364], [394]],
    "medium",
    0.25,
    12,
    11,
    { d8: { max: 2, used: 0 } },
    { walk: 12 },
    [14, 15, 12, 3, 12, 6],
    { str: 2, dex: 2, con: 1, int: -4, wis: 1, cha: -2 },
    { perception: 5, stealth: 4 },
    { darkvisionMeters: 18, passivePerception: 15 },
    {
      name: text("Morso", "Bite"),
      attackBonus: 4,
      damageDice: [{ count: 1, sides: 6 }],
      damageModifier: 2,
      damageType: "piercing",
      onHitProneMaxSize: "medium",
    },
    ["pack-tactics"],
  ),
];
const catalog = (id) => CATALOG.find((p) => p.id === id);

// ---------------------------------------------------------------- transformations (R3 PG-79)

// dnd5e's Transform dialog (FVT-034): presets and keep switches, with «Revert». Polymorph is
// SRD 5.2.1 (EN 153–154 / IT 164); Wild Shape keeps its own flow (the same activeForm engine);
// the custom preset is the DM's (True Polymorph, Shapechange, curses), an authored rule.
const CUSTOM = {
  kind: "authored",
  edition: "2024",
  revision: "transform-custom-v1",
  title: text("Trasformazione personalizzata del DM", "DM custom transformation"),
};
export const TRANSFORM_SOURCES = Object.freeze({ polymorph: POLYMORPH, custom: CUSTOM });
export const TRANSFORM_PRESETS = Object.freeze([
  Object.freeze({ id: "polymorph", label: text("Metamorfosi", "Polymorph") }),
  Object.freeze({ id: "wild-shape", label: text("Forma Selvatica", "Wild Shape") }),
  Object.freeze({
    id: "custom",
    label: text("Trasformazione personalizzata", "Custom transformation"),
    dmOnly: true,
  }),
]);
export const KEEP_SWITCHES = Object.freeze([
  ["physical", text("Caratteristiche fisiche (FOR, DES, COS)", "Physical scores (STR, DEX, CON)")],
  ["mental", text("Caratteristiche mentali (INT, SAG, CAR)", "Mental scores (INT, WIS, CHA)")],
  ["saves", text("Tiri salvezza", "Saving throws")],
  ["skills", text("Abilità", "Skills")],
  ["classFeatures", text("Privilegi di classe e incantesimi", "Class features and spells")],
]);
const TRANSFORM_KINDS = new Set(["polymorph", "custom"]);
export const isTransformation = (form) => TRANSFORM_KINDS.has(form?.kind);
const feetToMeters = (feet) => Math.round(feet * 0.3 * 10) / 10;
// An SRD sample Beast as a form profile (the shape of CATALOG): speeds and senses in metres,
// its first melee attack as the form's attack.
function beastProfile(entry) {
  const known = catalog("srd2024:" + entry.slug);
  if (known) return known;
  const attack = entry.actions.find((a) => a.kind === "attack" && a.attack?.type !== "ranged");
  const hit = attack?.damage?.[0];
  const dice = /^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/.exec(String(hit?.dice ?? ""));
  return {
    id: "srd2024:" + entry.slug,
    name: copy(entry.name),
    source: copy(entry.source),
    size: entry.size[0],
    cr: entry.crValue,
    creatureType: "beast",
    ac: entry.ac,
    hp: entry.hp.average,
    speeds: Object.fromEntries(
      Object.entries(entry.speed)
        .filter(([, feet]) => Number.isFinite(feet))
        .map(([mode, feet]) => [mode, feetToMeters(feet)]),
    ),
    abilities: { ...entry.abilities },
    savingThrows: Object.fromEntries(
      ABILITIES.map((k) => [k, entry.saves?.[k] ?? MOD(entry.abilities[k])]),
    ),
    skillModifiers: { ...entry.skills },
    senses: {
      ...(entry.senses.darkvision
        ? { darkvisionMeters: feetToMeters(entry.senses.darkvision) }
        : {}),
      passivePerception: entry.senses.passivePerception,
    },
    proficiencyBonus: entry.proficiencyBonus,
    melee: attack
      ? {
          name: copy(attack.name),
          attackBonus: attack.attack.bonus,
          damageDice: dice ? [{ count: Number(dice[1]), sides: Number(dice[2]) }] : [],
          damageModifier: dice?.[4] ? Number(dice[3] + dice[4]) : 0,
          ...(dice ? {} : { fixedDamage: hit?.average ?? 0 }),
          damageType: hit?.type ?? "bludgeoning",
          reachMeters: 1.5,
          source: copy(entry.source),
        }
      : null,
    traits: [],
  };
}
const BEASTS = CREATURES.filter((c) => c.type === "beast")
  .map(beastProfile)
  .sort((a, b) => a.cr - b.cr || a.name.it.localeCompare(b.name.it));
export const transformProfile = (id) => BEASTS.find((p) => p.id === id) ?? catalog(id) ?? null;
const CR_TEXT = { 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };
export const crText = (cr) => CR_TEXT[cr] ?? String(cr);
/** The target's CR, or its level when it has none (SRD Polymorph). */
export function challengeOf(a) {
  if (Number.isFinite(a?.cr)) return a.cr;
  const ref = a?.compendiumRef?.id ? getById(a.compendiumRef.id) : null;
  if (Number.isFinite(ref?.crValue)) return ref.crValue;
  return Number.isFinite(a?.level) ? a.level : 0;
}
function transformEligibility(a, p, preset) {
  if (preset !== "polymorph") return [];
  const limit = challengeOf(a);
  return p.cr > limit
    ? [
        issue(
          "form-cr",
          `GS ${crText(p.cr)} oltre il limite di ${a.name} (${Number.isFinite(a.cr) || a.compendiumRef ? "GS" : "livello"} ${crText(limit)}): scegli una bestia di GS ${crText(limit)} o inferiore.`,
          `CR ${crText(p.cr)} is over ${a.name}’s limit (${Number.isFinite(a.cr) || a.compendiumRef ? "CR" : "level"} ${crText(limit)}): choose a Beast of CR ${crText(limit)} or lower.`,
        ),
      ]
    : [];
}
/** The SRD sample bestiary's Beasts for a preset, each with its eligibility and reasons. */
export function listTransformProfiles(s, actorId, v, { preset = "polymorph" } = {}) {
  const a = actorFor(s, actorId, v);
  return BEASTS.map((p) => {
    const reasons = transformEligibility(a, p, preset);
    return { ...copy(p), eligible: reasons.length === 0, reasons };
  });
}
/** «Lupo (Mira)»: the form's name with the creature's (BG3 forms keep identity, CRP-032). */
export function formTokenName(a, lang = "it") {
  const form = a?.activeForm?.profile?.name;
  if (!form) return a?.name ?? "";
  return `${form[lang] ?? form.it ?? form.en} (${a.name})`;
}
/** What a transformed creature cannot do, in one sentence (dialogs, inspector). */
export function formLimitsText(a) {
  const f = a?.activeForm;
  if (!f) return null;
  if (f.kind === "polymorph")
    return text(
      "Non può parlare né lanciare incantesimi; agisce come permette l’anatomia della bestia. L’equipaggiamento si fonde nella forma.",
      "It cannot speak or cast spells; it acts as the Beast’s anatomy allows. Its gear melds into the form.",
    );
  if (f.kind === "custom")
    return f.keep?.classFeatures
      ? text("Conserva privilegi di classe e incantesimi.", "It keeps class features and spells.")
      : text("Non usa privilegi di classe né incantesimi.", "It uses no class features or spells.");
  return null;
}
const transformerOk = (s, a, v) => v === "dm" || runsSession(s, v) || canControlActor(a, v);
// SRD 5.2.1 Polymorph (EN 153–154 / IT 164): a level 4 spell cast as an Action. BG3 and the
// dnd5e sheet spend both when the spell is cast; «Nessuno» as caster stays an effect the DM
// decides (an item, a curse, a Polymorph already running) and spends nothing.
export const POLYMORPH_LEVEL = 4;
/** The caster's spell slots of level 4 or higher, with what is left of each. */
export function polymorphSlots(caster) {
  return Object.entries(caster?.spellSlots ?? {})
    .map(([level, pool]) => ({
      level: Number(level),
      max: Number(pool?.max) || 0,
      remaining: Math.max(0, (Number(pool?.max) || 0) - (Number(pool?.used) || 0)),
    }))
    .filter((row) => row.level >= POLYMORPH_LEVEL && row.level <= 9 && row.max > 0)
    .sort((a, b) => a.level - b.level);
}
/** The cast of Polymorph by `caster`: its slot and Action costs, or the reasons it cannot. */
function polymorphCast(s, caster, sel) {
  const free = polymorphSlots(caster).filter((row) => row.remaining > 0);
  const level =
    Number.isInteger(Number(sel?.slotLevel)) && Number(sel.slotLevel) >= POLYMORPH_LEVEL
      ? Number(sel.slotLevel)
      : free[0]?.level;
  const slot = free.find((row) => row.level === level);
  const errors = [];
  if (!slot)
    errors.push(
      issue(
        "slot",
        free.length
          ? `${caster.name} non ha slot liberi di livello ${level}: scegli un altro livello (4° o superiore).`
          : `${caster.name} non ha uno slot libero di 4° livello o superiore: Metamorfosi è un incantesimo di 4° livello. Scegli un incantatore che possa lanciarlo, oppure «Nessuno» per un effetto deciso dal DM.`,
        free.length
          ? `${caster.name} has no free level ${level} slot: choose another level (4th or higher).`
          : `${caster.name} has no free spell slot of 4th level or higher: Polymorph is a level 4 spell. Choose a caster who can cast it, or “None” for an effect the DM decides.`,
      ),
    );
  const combat = Boolean(s.combat?.active);
  if (combat && caster.action === false)
    errors.push(
      issue(
        "action",
        `${caster.name} ha già usato l’Azione in questo turno: Metamorfosi si lancia con un’Azione. Aspetta il prossimo turno di ${caster.name}.`,
        `${caster.name} has already used the Action this turn: Polymorph is cast with an Action. Wait for ${caster.name}’s next turn.`,
      ),
    );
  const costs = slot
    ? [
        {
          actorId: caster.id,
          kind: "slot",
          level: slot.level,
          label: text(`Slot di ${slot.level}° livello`, `Level ${slot.level} spell slot`),
          amount: 1,
          before: slot.remaining,
          after: slot.remaining - 1,
          source: copy(POLYMORPH),
        },
      ]
    : [];
  if (combat && caster.action !== false)
    costs.push({
      actorId: caster.id,
      kind: "action",
      label: text("Azione", "Action"),
      amount: 1,
      before: 1,
      after: 0,
      source: copy(POLYMORPH),
    });
  return { errors, costs, slotLevel: slot?.level ?? null, action: combat };
}
/**
 * Trusted adapter: spends the cast of Polymorph that previewTransform checked (the slot and,
 * in combat, the Action). Called once per cast: by applyTransform for a willing target and by
 * the unwilling target's save request (special-moves-domain.commitTransformSave).
 */
export function spendPolymorphCast(s, sel) {
  if (sel?.preset !== "polymorph" || !sel.casterId) return null;
  const caster = s.actors?.[sel.casterId];
  if (!caster) return null;
  const cast = polymorphCast(s, caster, sel);
  if (cast.errors.length) {
    const e = cast.errors[0];
    fail(e.code, e.it, e.en);
  }
  caster.spellSlots[cast.slotLevel].used =
    (Number(caster.spellSlots[cast.slotLevel].used) || 0) + 1;
  if (cast.action) caster.action = false;
  return { casterId: caster.id, slotLevel: cast.slotLevel, action: cast.action };
}
export function previewTransform(s, id, sel, v) {
  // A creature the viewer may not transform gets a preview that only says why (its sheet
  // data stays unread).
  const a = s.actors?.[id];
  if (!a) fail();
  const preset = sel?.preset;
  const rule = TRANSFORM_SOURCES[preset] ?? POLYMORPH;
  if (!transformerOk(s, a, v))
    return {
      canApply: false,
      errors: [
        issue(
          "permission",
          `Puoi trasformare solo le creature che controlli: ${a.name} la trasforma il DM.`,
          `You can only transform creatures you control: the DM transforms ${a.name}.`,
        ),
      ],
      warnings: [],
      actorId: id,
      actorName: copy(a.name),
      selection: copy(sel),
      source: copy(rule),
      changes: [],
      costs: [],
      retained: [],
      commit: commitFor(a),
      reviewKey: null,
    };
  const p = preview(s, a, sel, rule);
  p.retained =
    preset === "polymorph"
      ? ["name", "creatureType", "hp", "hitDice", "conditions"]
      : ["name", "hp", "hitDice", "conditions"];
  if (!TRANSFORM_KINDS.has(preset))
    error(
      p,
      "preset",
      "Scegli Metamorfosi o una trasformazione personalizzata.",
      "Choose Polymorph or a custom transformation.",
    );
  if (preset === "custom" && v !== "dm" && !runsSession(s, v))
    error(
      p,
      "custom-dm",
      "La trasformazione personalizzata la decide il DM: chiedi al DM o usa Metamorfosi.",
      "The DM decides custom transformations: ask the DM or use Polymorph.",
    );
  if (a.activeForm)
    error(
      p,
      "already",
      `${a.name} è già trasformato: prima «Torna alla forma originale».`,
      `${a.name} is already transformed: first “Return to original form”.`,
    );
  if (a.dead || a.hp === 0)
    error(
      p,
      "incapacitated",
      `${a.name} è a 0 PF: non può trasformarsi.`,
      `${a.name} is at 0 HP: it cannot transform.`,
    );
  if (pending(s, a.id))
    error(
      p,
      "pending",
      "Risolvi prima la richiesta pendente di questo soggetto.",
      "Resolve this actor's pending request first.",
    );
  const def = transformProfile(sel?.profileId);
  if (!def) error(p, "profile", "Scegli la forma.", "Choose the form.");
  else for (const e of transformEligibility(a, def, preset)) error(p, e.code, e.it, e.en);
  const caster = sel?.casterId ? s.actors[sel.casterId] : null;
  if (sel?.casterId && (!caster || caster.dead))
    error(p, "caster", "L’incantatore non è disponibile.", "The caster is not available.");
  else if (caster && preset === "polymorph") {
    const cast = polymorphCast(s, caster, sel);
    for (const e of cast.errors) error(p, e.code, e.it, e.en);
    p.costs.push(...cast.costs);
  }
  if (caster?.concentration?.active)
    p.warnings.push(
      issue(
        "concentration",
        `${caster.name} smette di concentrarsi su ${caster.concentration.name?.it ?? caster.concentration.name ?? "l’effetto attuale"}.`,
        `${caster.name} stops concentrating on ${caster.concentration.name?.en ?? caster.concentration.name ?? "the current effect"}.`,
      ),
    );
  const hpMode = preset === "polymorph" ? "temp" : sel?.hp === "own" ? "own" : "temp";
  if (def) {
    const keep = preset === "custom" ? normalKeep(sel.keep) : {};
    p.proposed = mechanical({
      ...a,
      activeForm: { kind: preset, profile: def, keep, equipment: [] },
    });
    const before = mechanical(a);
    p.changes.push(
      {
        field: "form",
        label: text("Forma", "Form"),
        before: null,
        after: def.name,
        source: def.source,
      },
      ...[
        ["ac", text("Classe Armatura", "Armor Class")],
        ["speed", text("Velocità", "Speed")],
        ["abilities", text("Caratteristiche", "Ability scores")],
        ["savingThrows", text("Tiri salvezza", "Saving throws")],
      ].map(([field, label]) => ({
        field,
        label,
        before: before[field] ?? null,
        after: p.proposed[field],
        source: def.source,
      })),
    );
    p.tempHp =
      hpMode === "temp"
        ? { before: a.tempHp ?? 0, after: def.hp, source: rule }
        : { before: a.tempHp ?? 0, after: a.tempHp ?? 0, source: rule };
    p.ends =
      hpMode === "temp"
        ? text(
            `Finisce a 0 PF temporanei, se ${a.name} muore${caster ? ` o quando ${caster.name} perde la Concentrazione` : ""} (al massimo 1 ora).`,
            `It ends at 0 Temporary HP, if ${a.name} dies${caster ? ` or when ${caster.name} loses Concentration` : ""} (1 hour at most).`,
          )
        : text("Finisce quando il DM la annulla.", "It ends when the DM reverts it.");
  }
  p.reviewKey = campaignReviewKey({ base: p.reviewKey, caster: caster ? basis(s, caster) : null });
  return p;
}
function normalKeep(keep = {}) {
  return Object.fromEntries(KEEP_SWITCHES.map(([key]) => [key, keep?.[key] === true]));
}
/**
 * Trusted adapter (the transformation's save already failed, or the checked command below):
 * the creature takes the form. Polymorph and a custom form with Temporary HP give the form's
 * HP as Temporary HP; a caster's Concentration holds it.
 */
export function imposeTransformation(s, id, sel, { operationId }) {
  const a = s.actors[id];
  const def = transformProfile(sel.profileId);
  if (!a || !def || a.activeForm || !TRANSFORM_KINDS.has(sel.preset)) return null;
  const preset = sel.preset;
  const formId = operationId + ":form";
  const clockId = clockIdFor(s, a);
  const caster = sel.casterId ? s.actors[sel.casterId] : null;
  let concentrationId = null;
  if (caster) {
    if (caster.concentration?.active) {
      const old = caster.concentration.id;
      caster.concentration.active = false;
      caster.concentration.endedReason = "replaced";
      if (old) observeConcentrationEnd(s, caster.id, old);
    }
    concentrationId = formId + ":concentration";
    caster.concentration = {
      id: concentrationId,
      name: text("Metamorfosi", "Polymorph"),
      kind: "spell",
      active: true,
      source: copy(TRANSFORM_SOURCES[preset]),
    };
  }
  const hpMode = preset === "polymorph" ? "temp" : sel.hp === "own" ? "own" : "temp";
  const before = getEffectiveActor(a).speed;
  a.activeForm = {
    id: formId,
    kind: preset,
    profileId: def.id,
    profile: copy(def),
    source: copy(TRANSFORM_SOURCES[preset]),
    clockId,
    startedAt: time(s, clockId),
    expiresAt: time(s, clockId) + 3600,
    equipment: [],
    casterId: caster?.id ?? null,
    concentrationId,
    keep: preset === "custom" ? normalKeep(sel.keep) : null,
    hpMode,
  };
  if (hpMode === "temp") {
    a.tempHp = def.hp;
    a.tempHpSource = { id: formId, source: copy(TRANSFORM_SOURCES[preset]) };
  }
  preserveMovement(a, before, getEffectiveActor(a).speed);
  return { actorId: id, formId, profileId: def.id };
}
export function applyTransform(s, id, sel, v, opt = {}) {
  const a = actorFor(s, id, v);
  if (!transformerOk(s, a, v)) fail("permission");
  return perform(
    s,
    a,
    "transform",
    sel,
    v,
    { ...opt, skipControl: true },
    () => previewTransform(s, id, sel, v),
    () => {
      spendPolymorphCast(s, sel);
      return imposeTransformation(s, id, sel, opt);
    },
  );
}
const data = (s) => s.formsCompanions ?? { version: 1, castings: [], operations: [], events: [] };
export function initializeFormsCompanions(s) {
  s.formsCompanions ??= { version: 1, castings: [], operations: [], events: [] };
  if (
    s.formsCompanions.version !== 1 ||
    !["castings", "operations", "events"].every((k) => Array.isArray(s.formsCompanions[k]))
  )
    fail("schema");
  return s.formsCompanions;
}
const local = (a) => a.visibility === "private" || a.campaignIds?.length === 0;
const canRead = (s, a, v) =>
  !!a &&
  canViewActor(a, v) &&
  (local(a)
    ? a.owner === v || a.controllers?.includes(v)
    : isCampaignMember(s, s.campaign?.id, v) && isCampaignActor(a, s.campaign?.id));
function actorFor(s, id, v, control = false) {
  const a = s.actors?.[id];
  if (!canRead(s, a, v) || (control && !canControlActor(a, v))) fail();
  return a;
}
const commitFor = (a, origin) => ({
  local: local(a),
  visibility: local(a) || origin === null ? "private" : "shared",
});
const clockIdFor = (s, a) => (local(a) ? "personal:" + a.id : s.campaign.id);
const time = (s, id) => s.restTime?.clocks?.[id]?.seconds ?? 0;
// The shared, index-independent turn identity (conditions.mjs): removing a companion
// earlier in the order never changes the key of the turn under way.
const turnKey = (s) => combatTurnKey(s.combat);
const inCombat = (s, id) => !!s.combat?.active && s.combat.order?.includes(id);
// One incapacity rule for strings, legacy objects and domain instances (increment 10).
const incapacitated = (a) => hasCondition(a, "incapacitated");
const unavailableLife = (a) => a.companion && a.companion.lifecycle !== "available";
const pending = (s, id) =>
  !!s.actors[id]?.pendingHealing ||
  (s.restTime?.rolls ?? []).some((r) => r.actorId === id && r.status === "pending") ||
  hasBlockingConsequences({ ...s, combat: s.combat ?? { order: [], turn: 0 } }, id);
const feature = (a) => a.features?.find((x) => x.id === a.formsProfile?.wildShapeFeatureId);
const slot = (a, level, pact = false) =>
  pact ? a.pactSlots : (a.spellSlots?.[level] ?? (level === 1 ? a.slots : null));
const usable = (r) => !!r && integer(r.max, 1) && integer(r.used) && r.used < r.max;
function castingsFor(s, a) {
  return data(s).castings.filter((x) => x.actorId === a.id);
}
const activeCasting = (s, a) => castingsFor(s, a).find((x) => x.status === "casting");
function mechanical(a) {
  const e = getEffectiveActor(a);
  return copy(
    Object.fromEntries(
      [
        "id",
        "name",
        "hp",
        "maxHp",
        "tempHp",
        "ac",
        "speed",
        "size",
        "abilities",
        "savingThrows",
        "skillModifiers",
        "senses",
        "creatureType",
        "combatProfile",
        "formLimitations",
      ].map((k) => [k, e[k]]),
    ),
  );
}
function basis(s, a) {
  return {
    owner: a.owner,
    controllers: a.controllers,
    visibility: a.visibility,
    campaignIds: a.campaignIds,
    members: s.campaign?.members,
    hp: a.hp,
    tempHp: a.tempHp,
    tempHpSource: a.tempHpSource,
    activeForm: a.activeForm,
    profile: a.formsProfile,
    features: a.features,
    slots: a.spellSlots ?? a.slots,
    pactSlots: a.pactSlots,
    action: a.action,
    bonus: a.bonus,
    conditions: a.conditions,
    dead: a.dead,
    incapacitated: a.incapacitated,
    inventory: a.inventory,
    concentration: a.concentration,
    stats: mechanical(a),
    movement: a.movement,
    movementSpent: a.movementSpent,
    dashCount: a.dashCount,
    turn: s.combat?.active ? turnKey(s) : null,
    companion: a.companion,
    clock: time(s, clockIdFor(s, a)),
    casting: castingsFor(s, a),
  };
}
function preview(s, a, selection, rule = SHAPE) {
  return {
    canApply: true,
    errors: [],
    warnings: [],
    actorId: a.id,
    actorName: copy(a.name),
    selection: copy(selection),
    source: copy(rule),
    changes: [],
    costs: [],
    retained: ["hp", "hitDice", "slots", "conditions", "concentration"],
    commit: commitFor(a),
    reviewKey: campaignReviewKey({ actor: basis(s, a), selection }),
  };
}
function error(p, code, it, en) {
  p.errors.push(issue(code, it, en));
  p.canApply = false;
}
function guard(s, a, v, p, budget) {
  if (!canControlActor(a, v))
    error(
      p,
      "permission",
      "Non puoi controllare questo soggetto.",
      "You cannot control this actor.",
    );
  if (a.dead || incapacitated(a) || unavailableLife(a))
    error(p, "incapacitated", "Il soggetto non può agire ora.", "This actor cannot act now.");
  if (pending(s, a.id))
    error(
      p,
      "pending",
      "Risolvi prima la richiesta pendente di questo soggetto.",
      "Resolve this actor's pending request first.",
    );
  if (inCombat(s, a.id) && budget) {
    if (s.combat.order[s.combat.turn] !== a.id)
      error(p, "turn", "Non è il suo turno.", "It is not this actor's turn.");
    if (!a[budget])
      error(
        p,
        "action",
        "La risorsa del turno è già spesa.",
        "This turn resource is already spent.",
      );
  }
}
function cost(p, a, kind, id, pool, label, phase = "apply") {
  p.costs.push({
    actorId: a.id,
    kind,
    id,
    amount: 1,
    before: pool && integer(pool.used) ? Math.max(0, pool.max - pool.used) : null,
    after: usable(pool) ? pool.max - pool.used - 1 : null,
    label,
    phase,
    source: p.source,
  });
  if (!usable(pool))
    error(
      p,
      "resource",
      "La risorsa è esaurita o non registrata.",
      "The resource is exhausted or unrecorded.",
    );
}
function spendSlot(a, level, pact) {
  slot(a, level, pact).used += 1;
  if (!pact && level === 1 && a.spellSlots?.[1]) a.slots = a.spellSlots[1];
}
function actionCost(s, a, budget) {
  if (inCombat(s, a.id)) a[budget] = false;
}
function checkSlotTurn(s, a, p) {
  if (s.combat?.active && a.lastSlotTurn === turnKey(s))
    error(
      p,
      "slot-turn",
      "Uno slot è già stato speso per lanciare in questo turno.",
      "A spell slot was already spent to cast on this turn.",
    );
}
function perform(s, a, name, selection, v, options, makePreview, mutate) {
  actorFor(s, a.id, v, !options?.skipControl);
  if (!validId(options?.operationId)) fail("operation-id");
  const inputKey = campaignReviewKey({ name, actorId: a.id, selection });
  const old = data(s).operations.find((o) => o.id === options.operationId);
  if (old) {
    if (old.owner !== v || old.inputKey !== inputKey) fail("operation-conflict");
    if (options.online === false && !commitFor(a).local) fail("offline");
    return copy(old.result);
  }
  const p = makePreview();
  if (options.online === false && !p.commit.local)
    fail(
      "offline",
      "Riconnettiti per modificare il gioco condiviso.",
      "Reconnect to change shared gameplay.",
    );
  if (!p.canApply) {
    const e = p.errors[0];
    fail(e.code, e.it, e.en);
  }
  if (options.reviewKey !== p.reviewKey)
    fail(
      "conflict",
      "I dati pertinenti sono cambiati. Rivedi il confronto.",
      "Relevant data changed. Review the comparison.",
    );
  if (
    ["companion", "casting-complete"].includes(name) &&
    s.actors[options.operationId + ":companion"]
  )
    fail(
      "identity-conflict",
      "Identità della creatura già occupata.",
      "Creature identity is already in use.",
    );
  const d = initializeFormsCompanions(s),
    result = mutate(p);
  d.operations.push({
    id: options.operationId,
    owner: v,
    actorId: a.id,
    inputKey,
    result: copy(result),
    visibility: p.commit.visibility,
  });
  d.events.push({
    id: options.operationId,
    actorId: a.id,
    owner: v,
    kind: name,
    label: text("Forme e compagni: " + name, "Forms and companions: " + name),
    source: copy(p.source),
    result: copy(result),
    visibility: p.commit.visibility,
  });
  return copy(result);
}

export function getEffectiveMovementBudget(a, beforeSpeed, afterSpeed) {
  const count = integer(a.dashCount) ? a.dashCount : 0;
  const spent = Number.isFinite(a.movementSpent)
    ? a.movementSpent
    : Math.max(0, beforeSpeed * (1 + count) - (a.movement ?? beforeSpeed));
  return Math.max(0, afterSpeed * (1 + count) - spent);
}
// Movement speed after the form projection and the active conditions (Exhaustion,
// speed 0). Never written back: canonical base speed stays on the actor.
export function getEffectiveSpeed(a) {
  const eff = getEffectiveActor(a);
  if (!eff) return eff?.speed;
  const base = adjustedBaseSpeed(eff);
  return getConditionMechanics(eff, { baseSpeed: base }).speed ?? base;
}
/**
 * PG-70: the walking speed now in effect and why (D&D Beyond shows the effective speed as
 * the number, with the base and each penalty as a note): {base, effective, steps:[{kind:
 * "load"|"conditions", reason, delta}], form}. Deltas are in metres, negative when slower.
 */
export function speedBreakdown(a) {
  const eff = getEffectiveActor(a);
  if (!eff || !Number.isFinite(eff.speed)) return null;
  const base = eff.speed;
  const steps = adjustSpeed(eff).map((row) => ({
    kind: "load",
    reason: text("ingombro", "encumbrance"),
    detail: row.reason ?? null,
    delta: row.speed - row.from,
  }));
  const adjusted = steps.reduce((value, row) => value + row.delta, base);
  const effective = getEffectiveSpeed(a);
  if (Number.isFinite(effective) && effective !== adjusted)
    steps.push({
      kind: "conditions",
      reason: text("condizioni", "conditions"),
      detail: null,
      delta: effective - adjusted,
    });
  return {
    base,
    effective: Number.isFinite(effective) ? effective : adjusted,
    steps,
    form: Boolean(a?.activeForm),
  };
}
// B36 (inventory-plus, additive): pure adjusters of the base walking speed from the actor's
// own data (encumbrance by carried weight, DDB-051), applied before conditions. Each returns
// {speed, reason:{it,en}, source} or null. No adjuster: the base speed is unchanged.
const speedAdjusters = [];
export function registerSpeedAdjuster(adjuster) {
  if (typeof adjuster === "function" && !speedAdjusters.includes(adjuster))
    speedAdjusters.push(adjuster);
  return () => {
    const index = speedAdjusters.indexOf(adjuster);
    if (index >= 0) speedAdjusters.splice(index, 1);
  };
}
export function speedAdjustments(a) {
  return adjustSpeed(getEffectiveActor(a));
}
function adjustSpeed(eff) {
  const out = [];
  if (!eff || !Number.isFinite(eff.speed)) return out;
  let speed = eff.speed;
  for (const adjust of speedAdjusters) {
    let result = null;
    try {
      result = adjust(eff, speed);
    } catch {
      result = null; // an area failure never changes movement
    }
    if (result && Number.isFinite(result.speed) && result.speed !== speed) {
      out.push({ ...result, from: speed });
      speed = result.speed;
    }
  }
  return out;
}
function adjustedBaseSpeed(eff) {
  if (!speedAdjusters.length) return eff.speed;
  return adjustSpeed(eff).at(-1)?.speed ?? eff.speed;
}
// B37 (sheet-plus, additive): the movement mode chosen for the creature picks the Speed it
// moves with (SRD 5.2.1 "Speed", EN 188 / IT 218). Only a finite special Speed of the actor
// (or of its form) applies; without `movementMode` nothing changes.
function withMovementMode(a, result) {
  const mode = a.movementMode;
  if (mode && mode !== "walk" && Number.isFinite(result.speeds?.[mode]))
    result.speed = result.speeds[mode];
  return result;
}
export function getEffectiveActor(a) {
  if (!a) return a;
  if (a.movementMode && a.movementMode !== "walk")
    return withMovementMode(a, getEffectiveActorBase(a));
  return getEffectiveActorBase(a);
}
function getEffectiveActorBase(a) {
  const result = { ...a, combatProfile: { ...(a.combatProfile ?? {}) } };
  if (a.companion && (!a.companion.attacksAllowed || unavailableLife(a))) {
    result.combatProfile = {
      ...result.combatProfile,
      meleeAttack: null,
      spells: [],
      weaponProficiencies: [],
      attacksAllowed: false,
      unavailable: unavailableLife(a),
    };
  }
  if (!a.activeForm) return withItemBonuses(a, result);
  if (isTransformation(a.activeForm)) return withTransformation(a, result);
  const p = a.activeForm.profile,
    fp = a.formsProfile ?? {},
    pb = a.proficiencyBonus ?? a.combatProfile?.proficiencyBonus;
  result.abilities = {
    ...p.abilities,
    ...Object.fromEntries(["int", "wis", "cha"].map((k) => [k, a.abilities?.[k]])),
  };
  result.ac = p.ac;
  result.speed = p.speeds.walk;
  result.speeds = copy(p.speeds);
  result.size = p.size;
  result.senses = copy(p.senses);
  result.savingThrows = {};
  for (const key of ABILITIES) {
    const base = MOD(result.abilities[key]);
    if (base === null) {
      result.savingThrows[key] = null;
      continue;
    }
    const proficient =
      fp.savingThrowProficiencies?.includes(key) || p.savingThrows[key] > MOD(p.abilities[key]);
    const own = proficient && Number.isFinite(pb) ? base + pb : base;
    const currentMental =
      ["int", "wis", "cha"].includes(key) && Number.isFinite(a.savingThrows?.[key])
        ? a.savingThrows[key]
        : own;
    result.savingThrows[key] = Math.max(
      currentMental ?? -Infinity,
      p.savingThrows[key] ?? -Infinity,
    );
  }
  result.skillModifiers = { ...p.skillModifiers };
  for (const [id, ability] of [
    ["perception", "wis"],
    ["stealth", "dex"],
  ]) {
    if (MOD(result.abilities[ability]) === null) result.skillModifiers[id] = null;
    else if (Object.hasOwn(p.skillModifiers, id) && Number.isFinite(pb))
      result.skillModifiers[id] = Math.max(
        p.skillModifiers[id],
        MOD(result.abilities[ability]) + pb,
      );
  }
  for (const sk of fp.skillProficiencies ?? []) {
    if (MOD(result.abilities[sk.ability]) === null) result.skillModifiers[sk.id] = null;
    else if (Number.isFinite(pb) && ABILITIES.includes(sk.ability))
      result.skillModifiers[sk.id] = Math.max(
        result.skillModifiers[sk.id] ?? -Infinity,
        MOD(result.abilities[sk.ability]) + pb * (sk.multiplier === 2 ? 2 : 1),
      );
  }
  result.combatProfile = {
    ...result.combatProfile,
    meleeAttack: copy(p.melee),
    weaponProficiencies: [],
    spells: fp.druidLevel >= 18 ? [...(a.combatProfile?.spells ?? [])] : [],
    spellcastingRestricted: fp.druidLevel >= 18 ? "no-costly-or-consumed-material" : "wild-shape",
    traits: copy(p.traits),
    attacksAllowed: true,
  };
  result.formLimitations = [
    text(
      "Scalata, salti e anatomia speciale richiedono ancora verifica al tavolo.",
      "Climbing, jumping and special anatomy still require table adjudication.",
    ),
    text(
      "I bonus degli oggetti indossati non sono ricalcolati automaticamente: registra le correzioni della forma con un motivo.",
      "Worn item bonuses are not recalculated automatically: record form corrections with a reason.",
    ),
  ];
  result.inventory = (a.inventory ?? []).map((item) => {
    const disposition = a.activeForm.equipment.find((e) => e.itemId === item.id)?.disposition;
    return {
      ...item,
      formDisposition: disposition ?? null,
      availableInForm: disposition === "wear" && item.location !== "ground",
    };
  });
  for (const key of ["ac", "speed"])
    if (Number.isFinite(a.activeForm.overrides?.values?.[key]))
      result[key] = a.activeForm.overrides.values[key];
  return result;
}
// R3 PG-79: Polymorph replaces the game statistics with the Beast's (mental scores included),
// keeping creature type and Hit Points (SRD 5.2.1 EN 153–154 / IT 164); a custom
// transformation keeps what its switches keep (dnd5e keep options, FVT-034).
function withTransformation(a, result) {
  const f = a.activeForm,
    p = f.profile,
    keep = f.kind === "custom" ? (f.keep ?? {}) : {};
  const own = (key) => a.savingThrows?.[key] ?? MOD(a.abilities?.[key]);
  result.abilities = Object.fromEntries(
    ABILITIES.map((key) => [
      key,
      (["str", "dex", "con"].includes(key) ? keep.physical : keep.mental)
        ? a.abilities?.[key]
        : p.abilities[key],
    ]),
  );
  result.ac = p.ac;
  result.speed = p.speeds.walk;
  result.speeds = copy(p.speeds);
  result.size = p.size;
  result.senses = copy(p.senses);
  result.savingThrows = keep.saves
    ? Object.fromEntries(ABILITIES.map((key) => [key, own(key)]))
    : copy(p.savingThrows);
  result.skillModifiers = keep.skills ? copy(a.skillModifiers ?? {}) : copy(p.skillModifiers);
  const cp = a.combatProfile ?? {};
  result.combatProfile = {
    ...result.combatProfile,
    meleeAttack: copy(p.melee),
    weaponProficiencies: keep.classFeatures ? [...(cp.weaponProficiencies ?? [])] : [],
    spells: keep.classFeatures ? [...(cp.spells ?? [])] : [],
    spellcastingRestricted: keep.classFeatures ? null : "transformation",
    traits: copy(p.traits ?? []),
    attacksAllowed: true,
    cannotSpeak: f.kind === "polymorph",
  };
  result.formLimitations = [formLimitsText(a)].filter(Boolean);
  // SRD Polymorph: the gear melds into the new form; it cannot be used.
  result.inventory = (a.inventory ?? []).map((item) => ({
    ...item,
    formDisposition: "merge",
    availableInForm: false,
  }));
  for (const key of ["ac", "speed"])
    if (Number.isFinite(f.overrides?.values?.[key])) result[key] = f.overrides.values[key];
  return result;
}
// PG-25: worn items with structured bonuses (Cloak of Protection: +1 AC and saving throws)
// feed the values every reader of the effective actor uses (Table, combat target AC, party,
// dice). A form keeps its own values (worn bonuses are not recalculated there, see above).
// The marker is a Symbol: spreading an effective actor keeps it (no double bonus when a
// reader projects an already effective actor), JSON and structuredClone never persist it.
const ITEM_BONUSES = Symbol("item-bonuses");
function withItemBonuses(a, result) {
  if (a[ITEM_BONUSES]) return result;
  const mods = activeItemModifiers(a);
  if (!mods.length) return result;
  const sum = (target) =>
    mods.filter((m) => m.target === target).reduce((total, m) => total + m.value, 0);
  const ac = sum("ac"),
    saves = sum("saves");
  if (ac && Number.isFinite(result.ac)) result.ac += ac;
  if (saves && result.savingThrows && typeof result.savingThrows === "object")
    result.savingThrows = Object.fromEntries(
      Object.entries(result.savingThrows).map(([k, v]) => [k, Number.isFinite(v) ? v + saves : v]),
    );
  result[ITEM_BONUSES] = { ac, saves };
  return result;
}
function eligibility(a, p, purpose) {
  const reasons = [],
    lv = a.formsProfile?.druidLevel ?? 0;
  if (purpose === "wild-shape") {
    if (lv < 2)
      reasons.push(issue("level", "Serve druido di livello 2.", "Druid level 2 is required."));
    if (p.cr > (lv >= 8 ? 1 : lv >= 4 ? 0.5 : 0.25) || (p.speeds.fly && lv < 8))
      reasons.push(
        issue(
          "form-limit",
          "Forma oltre i limiti del livello da druido.",
          "Form exceeds this Druid level's limits.",
        ),
      );
  } else if (purpose === "familiar" && p.cr !== 0)
    reasons.push(
      issue(
        "familiar-cr",
        "Il famiglio richiede un profilo GS 0.",
        "A familiar requires a CR 0 profile.",
      ),
    );
  return reasons;
}
export function listCreatureProfiles(s, actorId, v, { purpose = "manual", query = "" } = {}) {
  const a = actorFor(s, actorId, v);
  return CATALOG.filter(
    (p) =>
      !query ||
      Object.values(p.name).some((n) => n.toLowerCase().includes(String(query).toLowerCase())),
  ).map((p) => ({
    ...copy(p),
    eligible: eligibility(a, p, purpose).length === 0,
    reasons: eligibility(a, p, purpose),
    known: !!a.formsProfile?.knownForms?.includes(p.id),
    recent: data(s).events.some((e) => e.actorId === a.id && e.result?.profileId === p.id),
  }));
}
function appearanceContext(s, a, v, rangeMeters = 3) {
  const scene = s.scenes?.find((x) => x.id === s.activeSceneId);
  const token = scene?.tokens?.find(
    (t) => t.actorId === a.id && (v === "dm" || (!t.hidden && t.visible !== false)),
  );
  return {
    canUseMap: !!token,
    needsAttestation: !token,
    ...(token ? { sceneId: scene.id, parentActorId: a.id } : {}),
    rangeMeters,
  };
}
function checkAppearance(s, a, selection, v, p, rangeMeters) {
  const c = appearanceContext(s, a, v, rangeMeters),
    app = selection.appearance;
  if (!c.canUseMap) {
    if (app?.kind !== "attested" || app.confirmed !== true)
      error(
        p,
        "appearance",
        "Conferma uno spazio libero entro la gittata nella finzione.",
        "Confirm a free space within range in the fiction.",
      );
    return;
  }
  const scene = s.scenes.find((x) => x.id === c.sceneId),
    origin = scene.tokens.find((t) => t.actorId === a.id);
  if (
    app?.kind !== "map" ||
    app.sceneId !== scene.id ||
    typeof spatial.previewTokenPlacement !== "function"
  ) {
    error(
      p,
      "appearance-map",
      "Scegli la comparsa sulla mappa attuale.",
      "Choose the appearance on the current map.",
    );
    return;
  }
  const result = spatial.previewTokenPlacement(scene, app.point, {
    origin,
    maxDistanceMeters: rangeMeters,
  });
  if (!result.available) for (const r of result.reasons) error(p, r.code, r.it, r.en);
  p.reviewKey = campaignReviewKey({ base: p.reviewKey, appearance: app, scene });
}
const projectedItems = (a) =>
  (a.inventory ?? []).map((item) =>
    copy(
      Object.fromEntries(
        ["id", "name", "quantity", "equipped", "location", "source"].map((k) => [k, item[k]]),
      ),
    ),
  );
export function getFormsOverview(s, id, v) {
  const a = actorFor(s, id, v),
    control = canControlActor(a, v),
    familiarCasting = getFamiliarCastingAccess(a);
  return {
    actorId: id,
    actorName: copy(a.name),
    effective: mechanical(a),
    concentrationActive: !!a.concentration?.active,
    activeForm: copy(a.activeForm ?? null),
    profile: a.formsProfile
      ? {
          ...copy(a.formsProfile),
          familiarCasting,
          knownFormsLimit:
            a.formsProfile.druidLevel >= 8 ? 8 : a.formsProfile.druidLevel >= 4 ? 6 : 4,
        }
      : null,
    wildShapeResource: copy(feature(a) ?? null),
    slots: Object.entries(a.spellSlots ?? (a.slots ? { 1: a.slots } : {})).map(([level, r]) => ({
      kind: "slot",
      level: Number(level),
      ...copy(r),
    })),
    pactSlots: copy(a.pactSlots ?? null),
    companions: listCompanions(s, id, v),
    castings: castingsFor(s, a)
      .filter((c) => c.campaignId !== null || c.owner === v)
      .map((c) => getFamiliarCasting(s, c.id, v)),
    equipment: control ? projectedItems(a) : [],
    materials: control
      ? projectedItems(a).filter((i) => i.quantity > 0 && i.location !== "ground")
      : [],
    appearanceContext: appearanceContext(s, a, v),
    permissions: {
      canControl: control,
      canTransform: control && a.formsProfile?.druidLevel >= 2,
      canCastFamiliar: control && !!(familiarCasting?.prepared || familiarCasting?.ritualFromBook),
      canCreateCompanion: control,
      canManageKnownForms: control && a.formsProfile?.druidLevel >= 2,
    },
    commit: commitFor(a),
  };
}
export function getFormsHistory(s, actorId, v) {
  actorFor(s, actorId, v);
  return copy(
    data(s).events.filter(
      (e) => e.actorId === actorId && (e.visibility !== "private" || e.owner === v),
    ),
  );
}

export function previewWildShape(s, id, sel, v) {
  const a = actorFor(s, id, v),
    p = preview(s, a, sel),
    def = catalog(sel.profileId);
  guard(s, a, v, p, "bonus");
  if (["int", "wis", "cha"].some((key) => !Number.isFinite(a.abilities?.[key])))
    error(
      p,
      "mental-unknown",
      "Registra prima le caratteristiche mentali conservate.",
      "Record the retained mental ability scores first.",
    );
  if (activeCasting(s, a))
    error(
      p,
      "casting-pending",
      "Concludi o interrompi prima il lancio in corso.",
      "Complete or cancel the ongoing casting first.",
    );
  if (!def) error(p, "profile", "Profilo non disponibile.", "Profile unavailable.");
  else {
    for (const e of eligibility(a, def, "wild-shape")) error(p, e.code, e.it, e.en);
    if (!a.formsProfile?.knownForms?.includes(def.id))
      error(p, "unknown-form", "La forma non è fra quelle note.", "The form is not known.");
    p.changes.push(
      {
        field: "form",
        before: a.activeForm?.profile.name ?? null,
        after: def.name,
        source: def.source,
      },
      {
        field: "speed",
        before: getEffectiveActor(a).speed,
        after: def.speeds.walk,
        source: def.source,
      },
    );
  }
  if (
    !Array.isArray(a.formsProfile?.savingThrowProficiencies) ||
    !Array.isArray(a.formsProfile?.skillProficiencies) ||
    !Number.isFinite(a.proficiencyBonus ?? a.combatProfile?.proficiencyBonus)
  )
    error(
      p,
      "proficiency-unknown",
      "Registra le competenze prima del confronto automatico.",
      "Record proficiencies before the automatic comparison.",
    );
  cost(p, a, "wild-shape", feature(a)?.id, feature(a), text("Forma Selvatica", "Wild Shape"));
  if (a.tempHp == null || !integer(a.tempHp))
    error(
      p,
      "temp-hp-unknown",
      "Registra i PF temporanei attuali.",
      "Record current Temporary Hit Points.",
    );
  else if (a.tempHp > 0 && !["keep", "replace"].includes(sel.tempHpChoice))
    error(
      p,
      "temp-hp-choice",
      "Scegli quali PF temporanei mantenere.",
      "Choose which Temporary Hit Points to keep.",
    );
  const items = (a.inventory ?? []).filter((i) => i.quantity > 0 && i.location !== "ground");
  const rows = sel.equipment ?? [];
  if (
    !Array.isArray(rows) ||
    new Set(rows.map((r) => r.itemId)).size !== rows.length ||
    rows.some((r) => !items.some((i) => i.id === r.itemId)) ||
    items.some((i) => !rows.some((r) => r.itemId === i.id))
  )
    error(
      p,
      "equipment",
      "Scegli la destinazione di ogni oggetto trasportato.",
      "Choose a disposition for each carried item.",
    );
  else
    for (const row of rows)
      if (
        !["drop", "merge", "wear"].includes(row.disposition) ||
        (row.disposition === "wear" && row.wearApproved !== true)
      )
        error(
          p,
          "wear",
          "Registra la decisione del DM su cosa la forma può indossare.",
          "Record the DM's ruling on what this form can wear.",
        );
  p.durationSeconds = Math.floor((a.formsProfile?.druidLevel ?? 0) / 2) * 3600;
  p.tempHp = {
    before: a.tempHp,
    offered: a.formsProfile?.druidLevel ?? 0,
    after: sel.tempHpChoice === "keep" && a.tempHp > 0 ? a.tempHp : a.formsProfile?.druidLevel,
    source: SHAPE,
  };
  p.equipment = copy(rows);
  if (def) {
    p.proposed = mechanical({ ...a, activeForm: { profile: def, equipment: rows } });
    const before = mechanical(a);
    for (const [field, label] of [
      ["ac", text("Classe Armatura", "Armor Class")],
      ["abilities", text("Caratteristiche", "Ability scores")],
      ["savingThrows", text("Tiri salvezza", "Saving throws")],
      ["skillModifiers", text("Abilità", "Skills")],
      ["senses", text("Sensi", "Senses")],
    ])
      p.changes.push({
        field,
        label,
        before: before[field] ?? null,
        after: p.proposed[field],
        source: def.source,
      });
    p.changes[0].label = text("Forma", "Form");
    p.changes[1].label = text("Velocità", "Speed");
  }
  return p;
}
function preserveMovement(a, before, after) {
  if (!Number.isFinite(a.movementSpent))
    a.movementSpent = Math.max(0, before * (1 + (a.dashCount ?? 0)) - (a.movement ?? before));
  a.movement = getEffectiveMovementBudget(a, before, after);
}
export function applyWildShape(s, id, sel, v, opt = {}) {
  const a = actorFor(s, id, v, true);
  return perform(
    s,
    a,
    "wild-shape",
    sel,
    v,
    opt,
    () => previewWildShape(s, id, sel, v),
    (p) => {
      const before = getEffectiveActor(a).speed,
        def = catalog(sel.profileId),
        clockId = clockIdFor(s, a);
      a.activeForm = {
        id: opt.operationId + ":form",
        kind: "wild-shape",
        profileId: def.id,
        profile: copy(def),
        source: copy(SHAPE),
        druidLevel: a.formsProfile.druidLevel,
        clockId,
        startedAt: time(s, clockId),
        expiresAt: time(s, clockId) + p.durationSeconds,
        equipment: copy(sel.equipment ?? []),
      };
      for (const row of a.activeForm.equipment)
        if (row.disposition === "drop") {
          const item = a.inventory.find((i) => i.id === row.itemId);
          item.location = "ground";
          item.equipped = false;
        }
      if (sel.tempHpChoice !== "keep" || !a.tempHp) {
        a.tempHp = a.formsProfile.druidLevel;
        a.tempHpSource = { id: a.activeForm.id, source: copy(SHAPE) };
      }
      feature(a).used++;
      actionCost(s, a, "bonus");
      preserveMovement(a, before, def.speeds.walk);
      return { actorId: id, formId: a.activeForm.id, profileId: def.id };
    },
  );
}
export function previewFormReturn(s, id, sel, v) {
  const a = actorFor(s, id, v),
    transformed = isTransformation(a.activeForm),
    p = preview(s, a, sel, transformed ? a.activeForm.source : SHAPE);
  if (a.activeForm?.clockId?.startsWith("personal:")) p.commit.visibility = "private";
  if (!a.activeForm) error(p, "no-form", "Nessuna forma attiva.", "No active form.");
  // Ending a transformation (dnd5e «Revert») spends nothing; Wild Shape's return is a Bonus
  // Action on the druid's turn.
  if (sel.mode === "normal" && transformed) {
    if (!transformerOk(s, a, v))
      error(
        p,
        "permission",
        `La trasformazione di ${a.name} la annulla chi la controlla o il DM.`,
        `${a.name}’s transformation is reverted by its controller or the DM.`,
      );
  } else if (sel.mode === "normal") guard(s, a, v, p, "bonus");
  else if (
    sel.mode !== "correction" ||
    typeof sel.reason !== "string" ||
    !sel.reason.trim() ||
    !canControlActor(a, v)
  )
    error(
      p,
      "reason",
      "La correzione richiede controllo e motivo.",
      "Correction requires control and a reason.",
    );
  if (pending(s, id))
    error(
      p,
      "pending",
      "Risolvi prima la conseguenza pendente.",
      "Resolve the pending consequence first.",
    );
  // PG-77: the return names both forms («Lupo → Mira, forma originale»).
  p.changes.push({
    field: "form",
    before: a.activeForm?.profile.name ?? null,
    after: text(`${a.name}, forma originale`, `${a.name}, original form`),
    source: transformed ? a.activeForm.source : SHAPE,
  });
  if (transformed && a.tempHpSource?.id === a.activeForm.id)
    p.warnings.push(
      issue(
        "temp-hp-vanish",
        `I ${a.tempHp} PF temporanei della forma svaniscono.`,
        `The form’s ${a.tempHp} Temporary HP vanish.`,
      ),
    );
  return p;
}
// R3 PG-79: Polymorph ends early with no Temporary HP left (they were its own) or when the
// caster's Concentration on it ends; a custom form with Temporary HP ends the same way.
function transformationOver(s, a) {
  const f = a.activeForm;
  if (!isTransformation(f)) return false;
  if (f.hpMode === "temp" && (!(a.tempHp > 0) || a.tempHpSource?.id !== f.id)) return true;
  if (f.concentrationId) {
    const c = s.actors[f.casterId]?.concentration;
    if (!c?.active || c.id !== f.concentrationId) return true;
  }
  return a.hp === 0;
}
function endForm(a, s = null) {
  const before = getEffectiveActor(a).speed;
  const f = a.activeForm;
  a.activeForm = null;
  if (isTransformation(f)) {
    // The spell's leftover Temporary HP vanish; its Concentration, if still held, ends.
    if (a.tempHpSource?.id === f.id) {
      a.tempHp = 0;
      delete a.tempHpSource;
    }
    const caster = s?.actors?.[f.casterId];
    if (
      f.concentrationId &&
      caster?.concentration?.active &&
      caster.concentration.id === f.concentrationId
    ) {
      caster.concentration.active = false;
      caster.concentration.endedReason = "effect-ended";
      observeConcentrationEnd(s, caster.id, f.concentrationId);
    }
  }
  preserveMovement(a, before, a.speed);
}
export function returnToNormalForm(s, id, sel, v, opt = {}) {
  // The DM (or the session runner, C3) reverts any transformation, as it can impose one.
  const byAuthority =
    isTransformation(s.actors?.[id]?.activeForm) && (v === "dm" || runsSession(s, v));
  const a = actorFor(s, id, v, !byAuthority);
  return perform(
    s,
    a,
    "return",
    sel,
    v,
    byAuthority ? { ...opt, skipControl: true } : opt,
    () => previewFormReturn(s, id, sel, v),
    () => {
      if (sel.mode === "normal" && !isTransformation(a.activeForm)) actionCost(s, a, "bonus");
      endForm(a, s);
      return { actorId: id, mode: sel.mode, reason: sel.reason ?? null };
    },
  );
}
export function previewFormCorrection(s, id, sel, v) {
  const a = actorFor(s, id, v),
    p = preview(s, a, sel, { kind: "authored", edition: "2024", revision: "form-correction-v1" });
  if (a.activeForm?.clockId?.startsWith("personal:")) p.commit.visibility = "private";
  if (!a.activeForm || !canControlActor(a, v) || pending(s, id))
    error(
      p,
      "form-unavailable",
      "La forma non è correggibile ora.",
      "The form cannot be corrected now.",
    );
  if (
    !object(sel.patch) ||
    !Object.keys(sel.patch).length ||
    Object.keys(sel.patch).some((k) => !["ac", "speed"].includes(k)) ||
    Object.values(sel.patch).some((value) => !Number.isFinite(value) || value < 0) ||
    typeof sel.reason !== "string" ||
    !sel.reason.trim()
  )
    error(
      p,
      "form-correction",
      "Indica CA/velocità valide e un motivo.",
      "Give valid AC/speed values and a reason.",
    );
  if (object(sel.patch))
    for (const [field, after] of Object.entries(sel.patch))
      p.changes.push({
        field,
        label: field === "ac" ? text("Classe Armatura", "Armor Class") : text("Velocità", "Speed"),
        before: getEffectiveActor(a)[field],
        after,
        source: p.source,
      });
  return p;
}
export function applyFormCorrection(s, id, sel, v, opt = {}) {
  const a = actorFor(s, id, v, true);
  return perform(
    s,
    a,
    "form-correction",
    sel,
    v,
    opt,
    () => previewFormCorrection(s, id, sel, v),
    (p) => {
      const before = getEffectiveActor(a).speed;
      a.activeForm.overrides = {
        values: { ...a.activeForm.overrides?.values, ...copy(sel.patch) },
        reason: sel.reason.trim(),
        source: copy(p.source),
        author: v,
      };
      preserveMovement(a, before, getEffectiveActor(a).speed);
      return {
        actorId: id,
        formId: a.activeForm.id,
        patch: copy(sel.patch),
        reason: sel.reason.trim(),
      };
    },
  );
}
export function previewKnownForms(s, id, sel, v) {
  const a = actorFor(s, id, v),
    p = preview(s, a, sel),
    fp = a.formsProfile;
  if (!canControlActor(a, v) || !fp || fp.druidLevel < 2)
    error(p, "permission", "Forme note non modificabili.", "Known forms cannot be edited.");
  const ids = sel.profileIds,
    limit = fp?.druidLevel >= 8 ? 8 : fp?.druidLevel >= 4 ? 6 : 4;
  if (
    !Array.isArray(ids) ||
    ids.length > limit ||
    new Set(ids).size !== ids.length ||
    ids.some((x) => !catalog(x) || eligibility(a, catalog(x), "wild-shape").length)
  )
    error(p, "known-forms", "Lista delle forme non valida.", "Invalid known-form list.");
  if (sel.mode === "initial") {
    if (fp?.knownFormsInitialized)
      error(
        p,
        "initialized",
        "Le forme iniziali sono già registrate.",
        "Initial forms are already recorded.",
      );
  } else if (sel.mode === "replace") {
    const old = fp?.knownForms ?? [];
    if (
      !fp?.knownFormReplacement ||
      fp.knownFormReplacement.used ||
      !Array.isArray(ids) ||
      old.filter((x) => !ids.includes(x)).length !== 1 ||
      ids.filter((x) => !old.includes(x)).length !== 1 ||
      ids.length !== old.length
    )
      error(
        p,
        "replacement",
        "Dopo il proprio lungo si può sostituire una forma nota.",
        "One known form may be replaced after your own Long Rest.",
      );
  } else if (sel.mode !== "correction" || !sel.reason?.trim())
    error(
      p,
      "reason",
      "Specifica un motivo per correggere le forme note.",
      "Give a reason to correct known forms.",
    );
  return p;
}
export function setKnownForms(s, id, sel, v, opt = {}) {
  const a = actorFor(s, id, v, true);
  return perform(
    s,
    a,
    "known-forms",
    sel,
    v,
    opt,
    () => previewKnownForms(s, id, sel, v),
    () => {
      a.formsProfile.knownForms = [...sel.profileIds];
      a.formsProfile.knownFormsInitialized = true;
      if (sel.mode === "replace") a.formsProfile.knownFormReplacement.used = true;
      return { actorId: id, profileIds: [...sel.profileIds] };
    },
  );
}

const familiars = (s, parentId) =>
  Object.values(s.actors).filter(
    (a) =>
      a.companion?.parentActorId === parentId &&
      ["familiar", "wild-companion"].includes(a.companion.kind) &&
      !["released", "expired", "archived"].includes(a.companion.lifecycle),
  );
function validateCompanionSelection(s, a, sel, v, p, familiar) {
  const def = catalog(sel.profileId);
  if (!def) error(p, "profile", "Scegli un profilo disponibile.", "Choose an available profile.");
  if (typeof sel.name !== "string" || !sel.name.trim() || sel.name.length > 120)
    error(
      p,
      "name",
      "Inserisci un nome entro 120 caratteri.",
      "Enter a name up to 120 characters.",
    );
  if (familiar) {
    if (def && eligibility(a, def, "familiar").length)
      error(p, "familiar-cr", "Il famiglio richiede GS 0.", "A familiar requires CR 0.");
    if (familiars(s, a.id).some((x) => !canRead(s, x, v) || pending(s, x.id)))
      error(
        p,
        "familiar-pending",
        "Il famiglio esistente non è modificabile ora.",
        "The existing familiar cannot be changed now.",
      );
  }
}
function makeCompanion(s, parent, selection, id, kind) {
  const def = catalog(selection.profileId),
    existing = kind === "manual" ? null : familiars(s, parent.id)[0];
  const profile = copy(def);
  const a = existing ?? {
    id,
    owner: parent.owner,
    controllers: [...(parent.controllers ?? [])],
    visibility: parent.visibility ?? "shared",
    campaignIds: [...(parent.campaignIds ?? [s.campaign.id])],
    kind: "npc",
    notes: "",
    inventory: [],
    features: [],
    spellSlots: {},
    conditions: [],
    action: true,
    bonus: true,
    reaction: true,
    movementSpent: 0,
    dashCount: 0,
  };
  const oldHp = a.hp,
    destroyed = a.companion?.lifecycle === "destroyed",
    oldSpeed = a.speed;
  Object.assign(a, {
    name: selection.name.trim(),
    ac: def.ac,
    speed: def.speeds.walk,
    size: def.size,
    abilities: copy(def.abilities),
    savingThrows: copy(def.savingThrows),
    skillModifiers: copy(def.skillModifiers),
    senses: copy(def.senses),
    maxHp: def.hp,
    proficiencyBonus: 2,
    hitDice: a.hitDice ?? copy(def.hitDice),
    creatureType:
      kind === "manual" ? "beast" : kind === "wild-companion" ? "fey" : selection.creatureType,
    hp: existing && !destroyed ? Math.min(oldHp, def.hp) : def.hp,
    tempHp: a.tempHp ?? 0,
    combatProfile: {
      ...(a.combatProfile ?? {}),
      team: parent.combatProfile?.team ?? null,
      meleeAttack: kind === "manual" ? copy(def.melee) : null,
      spells: [],
      weaponProficiencies: [],
      traits: copy(def.traits),
      attacksAllowed: kind === "manual",
    },
    companion: {
      ...(a.companion ?? {}),
      parentActorId: parent.id,
      kind,
      lifecycle: "available",
      profileId: def.id,
      source:
        kind === "manual"
          ? (selection.manual?.source ?? {
              kind: "authored-demo",
              edition: "2024",
              revision: "manual-companion-v1",
            })
          : copy(FAMILIAR),
      profile,
      createdByOperationId: id,
      creatureType: kind === "wild-companion" ? "fey" : (selection.creatureType ?? "beast"),
      initiativePolicy: "independent",
      attacksAllowed: kind === "manual",
      expiresOnParentLongRest: kind === "wild-companion",
      appearance: copy(selection.appearance ?? null),
    },
  });
  // Zero-HP policy and condition data are explicit per companion (increment 10). The
  // familiar and Wild Companion disappear at 0 HP by their own source; a manual
  // companion is a DM decision, never assumed to use character death saves.
  a.vitalityPolicy =
    kind === "manual"
      ? {
          zeroHp: "manual",
          source: { kind: "authored-demo", edition: "2024", revision: "manual-companion-v1" },
        }
      : { zeroHp: "disappear", source: copy(FAMILIAR) };
  // The SRD 2024 stat blocks of this catalog list no Condition Immunities.
  a.conditionImmunities = [];
  a.conditionImmunitiesSource = copy(def.source);
  a.heldItemIds ??= [];
  if (kind === "manual" && selection.manual)
    for (const k of ["hp", "maxHp", "ac", "speed", "abilities"])
      if (Object.hasOwn(selection.manual, k)) a[k] = copy(selection.manual[k]);
  if (existing) preserveMovement(a, oldSpeed, a.speed);
  else a.movement = a.speed;
  s.actors[a.id] = a;
  return a;
}
export function previewCompanionCreation(s, id, sel, v) {
  const a = actorFor(s, id, v),
    p = preview(
      s,
      a,
      sel,
      sel.mode === "manual"
        ? { kind: "authored-demo", edition: "2024", revision: "manual-companion-v1" }
        : SHAPE,
    );
  const wild = sel.mode === "wild-companion";
  if (!["manual", "wild-companion"].includes(sel.mode))
    error(p, "mode", "Modalità non valida.", "Invalid mode.");
  if (!canControlActor(a, v))
    error(
      p,
      "permission",
      "Non puoi creare un compagno per questa scheda.",
      "You cannot create a companion for this sheet.",
    );
  validateCompanionSelection(s, a, sel, v, p, wild);
  if (sel.manual) {
    if (
      !object(sel.manual) ||
      !sel.manual.reason?.trim() ||
      (Object.hasOwn(sel.manual, "abilities") &&
        (!object(sel.manual.abilities) ||
          Object.keys(sel.manual.abilities).some((k) => !ABILITIES.includes(k)) ||
          ABILITIES.some(
            (k) =>
              !Object.hasOwn(sel.manual.abilities, k) ||
              (sel.manual.abilities[k] !== null &&
                (!integer(sel.manual.abilities[k], 1) || sel.manual.abilities[k] > 30)),
          )))
    )
      error(
        p,
        "manual-profile",
        "Registra tutte le caratteristiche valide e un motivo.",
        "Record all valid ability scores and a reason.",
      );
    for (const k of ["hp", "maxHp", "ac", "speed"])
      if (
        Object.hasOwn(sel.manual, k) &&
        sel.manual[k] !== null &&
        (!Number.isFinite(sel.manual[k]) || sel.manual[k] < 0)
      )
        error(p, "manual-value", "Valori manuali non validi.", "Invalid manual values.");
    const hp = Object.hasOwn(sel.manual, "hp") ? sel.manual.hp : catalog(sel.profileId)?.hp;
    const maxHp = Object.hasOwn(sel.manual, "maxHp")
      ? sel.manual.maxHp
      : catalog(sel.profileId)?.hp;
    if (Number.isFinite(hp) && Number.isFinite(maxHp) && hp > maxHp)
      error(p, "manual-hp", "PF oltre il massimo.", "Hit Points exceed their maximum.");
  }
  if (wild) {
    guard(s, a, v, p, "action");
    if (a.combatProfile?.componentsAvailable === false)
      error(
        p,
        "components",
        "Le componenti verbali o somatiche non sono disponibili.",
        "Verbal or Somatic components are unavailable.",
      );
    if ((a.formsProfile?.druidLevel ?? 0) < 2)
      error(p, "level", "Serve druido di livello 2.", "Druid level 2 is required.");
    if (a.activeForm && a.formsProfile.druidLevel < 18)
      error(
        p,
        "no-spellcasting",
        "La forma attuale non consente di lanciare.",
        "The current form prevents spellcasting.",
      );
    if (sel.cost?.kind === "wild-shape")
      cost(p, a, "wild-shape", feature(a)?.id, feature(a), text("Forma Selvatica", "Wild Shape"));
    else if (["slot", "pact-slot"].includes(sel.cost?.kind)) {
      p.retained = p.retained.filter((field) => field !== "slots");
      cost(
        p,
        a,
        sel.cost.kind,
        String(sel.cost.level),
        slot(a, sel.cost.level, sel.cost.kind === "pact-slot"),
        text("Slot", "Spell slot"),
      );
      checkSlotTurn(s, a, p);
    } else
      error(p, "cost", "Scegli un uso Forma o uno slot.", "Choose a Wild Shape use or spell slot.");
    checkAppearance(s, a, sel, v, p, 3);
    p.reviewKey = campaignReviewKey({
      base: p.reviewKey,
      familiar: familiars(s, id).map((c) => basis(s, c)),
    });
  }
  return p;
}
export function createCompanion(s, id, sel, v, opt = {}) {
  const a = actorFor(s, id, v, true);
  return perform(
    s,
    a,
    "companion",
    sel,
    v,
    opt,
    () => previewCompanionCreation(s, id, sel, v),
    () => {
      if (sel.mode === "wild-companion") {
        actionCost(s, a, "action");
        if (sel.cost.kind === "wild-shape") feature(a).used++;
        else {
          spendSlot(a, sel.cost.level, sel.cost.kind === "pact-slot");
          if (s.combat?.active) a.lastSlotTurn = turnKey(s);
        }
      }
      const c = makeCompanion(
        s,
        a,
        sel,
        opt.operationId + ":companion",
        sel.mode === "manual" ? "manual" : "wild-companion",
      );
      return {
        actorId: c.id,
        parentActorId: id,
        profileId: sel.profileId,
        created: c.id === opt.operationId + ":companion",
      };
    },
  );
}
function companionFor(s, id, v) {
  const a = actorFor(s, id, v);
  if (!a.companion) fail();
  return a;
}
export function getCompanion(s, id, v) {
  const a = companionFor(s, id, v),
    parent = s.actors[a.companion.parentActorId],
    parentRead = canRead(s, parent, v),
    control = canControlActor(a, v),
    manage =
      a.owner === v ||
      (!local(a) &&
        campaignMembers(s, s.campaign.id).some(
          (m) => m.id === v && ["dm", "co-dm"].includes(m.role),
        )),
    parentControl = parentRead && canControlActor(parent, v),
    familiar = a.companion.kind !== "manual";
  return {
    actorId: id,
    name: copy(a.name),
    hp: a.hp,
    maxHp: a.maxHp,
    tempHp: a.tempHp,
    lifecycle: a.companion.lifecycle,
    kind: a.companion.kind,
    parentActorId: parentRead ? parent.id : null,
    source: copy(a.companion.source),
    initiativePolicy: a.companion.initiativePolicy,
    attacksAllowed: a.companion.attacksAllowed,
    controllers: control ? [...new Set([a.owner, ...(a.controllers ?? [])])] : [],
    controllerChoices: manage
      ? (local(a) ? [{ id: a.owner, name: a.owner }] : campaignMembers(s, s.campaign.id)).map(
          (m) => ({ id: m.id, name: m.name ?? m.id, isOwner: m.id === a.owner }),
        )
      : [],
    placements: (s.scenes ?? []).flatMap((scene) =>
      (scene.tokens ?? [])
        .filter((t) => t.actorId === id && (v === "dm" || (!t.hidden && t.visible !== false)))
        .map((t) => ({ sceneId: scene.id, tokenId: t.id })),
    ),
    appearanceContext: parentControl
      ? appearanceContext(s, parent, v, 9)
      : { canUseMap: false, needsAttestation: false, rangeMeters: 9 },
    permissions: {
      canControl: control,
      canManage: manage,
      canArchive: manage && a.companion.lifecycle !== "archived",
      canPlace: control && a.companion.lifecycle === "available",
      canDismiss: control && parentControl && familiar && a.companion.lifecycle === "available",
      canReappear: control && parentControl && familiar && a.companion.lifecycle === "dismissed",
      canRelease:
        control &&
        parentControl &&
        familiar &&
        !["released", "expired", "archived"].includes(a.companion.lifecycle),
      canCorrect: control,
    },
    commit: commitFor(a),
  };
}
export function listCompanions(s, parentId, v) {
  actorFor(s, parentId, v);
  return Object.values(s.actors)
    .filter((a) => a.companion?.parentActorId === parentId && canRead(s, a, v))
    .map((a) => getCompanion(s, a.id, v));
}
export function getCompanionPlacement(s, id, v) {
  const c = getCompanion(s, id, v);
  return {
    canPlace: c.permissions.canPlace,
    actorId: id,
    existingToken: c.placements.find((p) => p.sceneId === s.activeSceneId) ?? null,
    restriction: null,
    permissions: c.permissions,
    commit: c.commit,
  };
}
function removeRepresentations(s, a) {
  for (const scene of s.scenes ?? [])
    scene.tokens = (scene.tokens ?? []).filter((t) => t.actorId !== a.id);
  const active = s.combat?.order?.[s.combat.turn];
  if (s.combat?.order?.includes(a.id)) {
    const previousTurn = s.combat.turn,
      previousTurnKey = s.combat.active ? turnKey(s) : null;
    s.combat.order = s.combat.order.filter((id) => id !== a.id);
    const index = s.combat.order.indexOf(active);
    const roundAdvanced =
      index < 0 && previousTurn >= s.combat.order.length && s.combat.order.length > 0;
    s.combat.turn =
      index >= 0
        ? index
        : roundAdvanced
          ? 0
          : Math.min(previousTurn, Math.max(0, s.combat.order.length - 1));
    if (!s.combat.order.length) {
      s.combat.active = false;
      delete s.combat.pendingTurnStart;
    } else if (index < 0) {
      if (roundAdvanced) s.combat.round += 1;
      // The removed creature's turn ends under its own identity (encounter, round,
      // creature), not the next creature's, so its "end of current turn" terms expire.
      s.combat.pendingTurnStart = {
        actorId: s.combat.order[s.combat.turn],
        previousActorId: a.id,
        previousTurnKey,
        reason: "companion-removed",
        roundAdvanced,
      };
    }
  }
}
function dismiss(s, a, lifecycle) {
  a.companion.lifecycle = lifecycle;
  for (const item of a.inventory ?? [])
    if (item.quantity > 0 && item.location !== "ground") {
      item.location = "ground";
      item.equipped = false;
    }
  removeRepresentations(s, a);
}
export function previewCompanionCommand(s, id, sel, v) {
  const a = companionFor(s, id, v),
    projected = getCompanion(s, id, v),
    p = preview(s, a, sel, a.companion.source),
    parent = s.actors[a.companion.parentActorId];
  if (pending(s, id))
    error(
      p,
      "pending",
      "Risolvi prima la richiesta della creatura.",
      "Resolve the creature's pending request first.",
    );
  if (["dismiss", "reappear", "release"].includes(sel.command)) {
    const permission = { dismiss: "canDismiss", reappear: "canReappear", release: "canRelease" }[
      sel.command
    ];
    if (!projected.permissions[permission])
      error(
        p,
        "lifecycle",
        "Comando non consentito nello stato attuale.",
        "Command unavailable in the current state.",
      );
    if (canRead(s, parent, v)) {
      guard(s, parent, v, p, "action");
      p.reviewKey = campaignReviewKey({ base: p.reviewKey, parent: basis(s, parent) });
      if (sel.command === "reappear") checkAppearance(s, parent, sel, v, p, 9);
    }
  } else if (sel.command === "controllers") {
    if (
      !projected.permissions.canManage ||
      !Array.isArray(sel.controllers) ||
      new Set(sel.controllers).size !== sel.controllers.length ||
      sel.controllers.some(
        (id) =>
          !validId(id) || (local(a) ? id !== a.owner : !isCampaignMember(s, s.campaign.id, id)),
      )
    )
      error(
        p,
        "controllers",
        "Controllori o autorità non validi.",
        "Invalid controllers or authority.",
      );
  } else if (sel.command === "correct") {
    if (
      !projected.permissions.canCorrect ||
      !sel.reason?.trim() ||
      !object(sel.patch) ||
      Object.keys(sel.patch).some(
        (k) => !["name", "hp", "maxHp", "ac", "speed", "tempHp"].includes(k),
      )
    )
      error(p, "correction", "Correzione e motivo non validi.", "Invalid correction or reason.");
    else
      for (const [key, value] of Object.entries(sel.patch))
        if (
          key === "name"
            ? typeof value !== "string" || !value.trim() || value.length > 120
            : value !== null && (!Number.isFinite(value) || value < 0)
        )
          error(p, "correction-value", "Valore non valido.", "Invalid value.");
    const corrected = { ...a, ...sel.patch };
    if (
      Number.isFinite(corrected.hp) &&
      Number.isFinite(corrected.maxHp) &&
      corrected.hp > corrected.maxHp
    )
      error(
        p,
        "correction-hp",
        "PF oltre il massimo risultante.",
        "Hit Points exceed the resulting maximum.",
      );
  } else if (sel.command === "archive") {
    if (!projected.permissions.canArchive || !sel.reason?.trim())
      error(
        p,
        "archive",
        "Archiviazione richiede autorità e motivo.",
        "Archiving requires authority and a reason.",
      );
  } else error(p, "command", "Comando non riconosciuto.", "Unrecognized command.");
  return p;
}
export function applyCompanionCommand(s, id, sel, v, opt = {}) {
  const a = companionFor(s, id, v);
  return perform(
    s,
    a,
    "companion-" + sel.command,
    sel,
    v,
    opt,
    () => previewCompanionCommand(s, id, sel, v),
    () => {
      if (["dismiss", "reappear", "release"].includes(sel.command)) {
        actionCost(s, s.actors[a.companion.parentActorId], "action");
        if (sel.command === "reappear") {
          a.companion.lifecycle = "available";
          a.companion.appearance = copy(sel.appearance);
        } else dismiss(s, a, sel.command === "dismiss" ? "dismissed" : "released");
      } else if (sel.command === "controllers")
        a.controllers = sel.controllers.filter((id) => id !== a.owner);
      else if (sel.command === "correct") Object.assign(a, copy(sel.patch));
      else if (sel.command === "archive") dismiss(s, a, "archived");
      return {
        actorId: id,
        command: sel.command,
        lifecycle: a.companion.lifecycle,
        reason: sel.reason ?? null,
      };
    },
  );
}

function checkSpellAccess(a, sel, p) {
  const access = getFamiliarCastingAccess(a);
  if (
    access?.spellId !== "find-familiar" ||
    !access.source ||
    !(access.prepared || (sel.mode === "ritual" && access.ritualFromBook))
  )
    error(
      p,
      "spell-access",
      "Trova Famiglio non è disponibile con questa modalità.",
      "Find Familiar is not available in this casting mode.",
    );
  if (getEffectiveActor(a).combatProfile?.spellcastingRestricted)
    error(
      p,
      "form-casting",
      "Questa forma non consente il lancio con materiali consumati.",
      "This form does not allow casting with consumed materials.",
    );
  if (a.combatProfile?.componentsAvailable === false)
    error(
      p,
      "components",
      "Le componenti verbali o somatiche non sono disponibili.",
      "Verbal or Somatic components are unavailable.",
    );
}
function checkMaterial(a, sel, p) {
  const mat = sel.material,
    item = a.inventory?.find((i) => i.id === mat?.itemId);
  // PG-78: the refusal names the box the player still has to tick.
  if (mat && mat.incenseConfirmed !== true && item)
    error(
      p,
      "material",
      "Spunta «È incenso disponibile per questo lancio» per confermare l’incenso scelto.",
      "Tick “This is incense available for this casting” to confirm the chosen incense.",
    );
  else if (
    !mat ||
    !integer(mat.quantity, 1) ||
    !Number.isFinite(mat.unitValueGp) ||
    mat.unitValueGp * mat.quantity < 10 ||
    !item ||
    !integer(item.quantity) ||
    item.quantity < mat.quantity ||
    item.location === "ground"
  )
    error(
      p,
      "material",
      "Scegli nell’elenco «Oggetto nell’inventario» un incenso da almeno 10 mo in tutto.",
      "Choose in “Inventory item” incense worth at least 10 GP in total.",
    );
  p.costs.push({
    actorId: a.id,
    kind: "material",
    id: mat?.itemId,
    label: item?.name ?? text("Incenso", "Incense"),
    amount: mat?.quantity ?? null,
    before: item?.quantity ?? null,
    after: item ? item.quantity - (mat?.quantity ?? 0) : null,
    phase: "complete",
    source: FAMILIAR,
  });
}
export function previewFamiliarCasting(s, id, sel, v) {
  const a = actorFor(s, id, v),
    p = preview(s, a, sel, FAMILIAR);
  p.retained = p.retained.filter((field) => field !== "concentration");
  guard(s, a, v, p, "action");
  validateCompanionSelection(s, a, sel, v, p, true);
  checkSpellAccess(a, sel, p);
  checkMaterial(a, sel, p);
  if (
    !["celestial", "fey", "fiend"].includes(sel.creatureType) ||
    !["slot", "ritual"].includes(sel.mode)
  )
    error(
      p,
      "casting-choice",
      "Tipo di creatura o modalità non validi.",
      "Invalid creature type or casting mode.",
    );
  if (activeCasting(s, a))
    error(p, "already-casting", "Un lancio è già in corso.", "A casting is already in progress.");
  if (a.concentration?.active && sel.replaceConcentration !== true)
    error(
      p,
      "concentration-choice",
      "Conferma la fine della concentrazione precedente.",
      "Confirm ending the previous Concentration.",
    );
  if (sel.mode === "slot")
    cost(
      p,
      a,
      "slot",
      String(sel.slotLevel),
      slot(a, sel.slotLevel),
      text("Slot", "Spell slot"),
      "complete",
    );
  p.requiredSeconds = sel.mode === "ritual" ? 4200 : 3600;
  return p;
}
export function startFamiliarCasting(s, id, sel, v, opt = {}) {
  const a = actorFor(s, id, v, true);
  return perform(
    s,
    a,
    "casting-start",
    sel,
    v,
    opt,
    () => previewFamiliarCasting(s, id, sel, v),
    (p) => {
      const castingId = opt.operationId + ":casting",
        concentrationId = castingId + ":concentration",
        clockId = clockIdFor(s, a);
      const c = {
        id: castingId,
        actorId: id,
        owner: v,
        campaignId: local(a) ? null : s.campaign.id,
        selection: copy(sel),
        status: "casting",
        clockId,
        startedAt: time(s, clockId),
        requiredSeconds: p.requiredSeconds,
        concentrationId,
        lastMagicTurnKey: inCombat(s, id) ? turnKey(s) : null,
        source: copy(FAMILIAR),
      };
      initializeFormsCompanions(s).castings.push(c);
      a.concentration = {
        id: concentrationId,
        name: text("Lancio di Trova Famiglio", "Casting Find Familiar"),
        kind: "casting",
        active: true,
        source: copy(CASTING),
      };
      actionCost(s, a, "action");
      return { actorId: id, castingId };
    },
  );
}
function castingFor(s, id, v) {
  const c = data(s).castings.find((x) => x.id === id);
  if (!c || (c.campaignId === null && c.owner !== v)) fail();
  const a = actorFor(s, c.actorId, v);
  return { a, c };
}
export function getFamiliarCasting(s, id, v) {
  const { a, c } = castingFor(s, id, v),
    elapsedSeconds = Math.max(0, time(s, c.clockId) - c.startedAt);
  const costs = { costs: [], errors: [], canApply: true, source: FAMILIAR };
  checkMaterial(a, c.selection, costs);
  if (c.selection.mode === "slot")
    cost(
      costs,
      a,
      "slot",
      String(c.selection.slotLevel),
      slot(a, c.selection.slotLevel),
      text("Slot", "Spell slot"),
      "complete",
    );
  return {
    ...copy(c),
    actorName: copy(a.name),
    elapsedSeconds,
    remainingSeconds: Math.max(0, c.requiredSeconds - elapsedSeconds),
    costs: costs.costs,
    permissions: {
      canControl: canControlActor(a, v),
      canComplete:
        canControlActor(a, v) && c.status === "casting" && elapsedSeconds >= c.requiredSeconds,
      canContinue: canControlActor(a, v) && c.status === "casting",
      canCancel: canControlActor(a, v) && c.status === "casting",
    },
    appearanceContext: appearanceContext(s, a, v),
    commit: commitFor(a, c.campaignId),
  };
}
export function previewFamiliarCompletion(s, id, sel, v) {
  const { a, c } = castingFor(s, id, v),
    p = preview(s, a, { castingId: id, ...sel }, FAMILIAR);
  p.retained = p.retained.filter(
    (field) => field !== "concentration" && (c.selection.mode !== "slot" || field !== "slots"),
  );
  p.commit = commitFor(a, c.campaignId);
  guard(s, a, v, p);
  if (
    c.status !== "casting" ||
    !a.concentration?.active ||
    a.concentration.id !== c.concentrationId
  )
    error(p, "casting-ended", "Il lancio non è più in corso.", "The casting is no longer active.");
  if (time(s, c.clockId) - c.startedAt < c.requiredSeconds)
    error(
      p,
      "casting-time",
      "Il tempo di lancio non è ancora trascorso.",
      "The casting time has not yet elapsed.",
    );
  if (
    inCombat(s, a.id) &&
    (s.combat.order[s.combat.turn] !== a.id || c.lastMagicTurnKey !== turnKey(s))
  )
    error(
      p,
      "continue-turn",
      "Continua il lancio con l'azione di questo turno.",
      "Continue casting with this turn's action.",
    );
  checkSpellAccess(a, c.selection, p);
  checkMaterial(a, c.selection, p);
  if (c.selection.mode === "slot") {
    cost(
      p,
      a,
      "slot",
      String(c.selection.slotLevel),
      slot(a, c.selection.slotLevel),
      text("Slot", "Spell slot"),
      "complete",
    );
    checkSlotTurn(s, a, p);
  }
  validateCompanionSelection(s, a, c.selection, v, p, true);
  checkAppearance(s, a, sel, v, p, 3);
  p.reviewKey = campaignReviewKey({
    base: p.reviewKey,
    casting: c,
    elapsed: time(s, c.clockId),
    familiar: familiars(s, a.id).map((x) => basis(s, x)),
  });
  return p;
}
export function completeFamiliarCasting(s, id, sel, v, opt = {}) {
  const { a, c } = castingFor(s, id, v);
  return perform(
    s,
    a,
    "casting-complete",
    { castingId: id, ...sel },
    v,
    opt,
    () => previewFamiliarCompletion(s, id, sel, v),
    () => {
      if (c.selection.mode === "slot") {
        spendSlot(a, c.selection.slotLevel, false);
        if (s.combat?.active) a.lastSlotTurn = turnKey(s);
      }
      a.inventory.find((i) => i.id === c.selection.material.itemId).quantity -=
        c.selection.material.quantity;
      const companion = makeCompanion(
        s,
        a,
        { ...c.selection, appearance: sel.appearance },
        opt.operationId + ":companion",
        "familiar",
      );
      c.status = "completed";
      c.resultActorId = companion.id;
      a.concentration.active = false;
      return {
        actorId: companion.id,
        parentActorId: a.id,
        castingId: id,
        profileId: c.selection.profileId,
      };
    },
  );
}
export function continueFamiliarCasting(s, id, v, opt = {}) {
  const { a, c } = castingFor(s, id, v),
    sel = { castingId: id };
  const make = () => {
    const p = preview(s, a, sel, CASTING);
    p.commit = commitFor(a, c.campaignId);
    guard(s, a, v, p, "action");
    if (
      c.status !== "casting" ||
      !a.concentration?.active ||
      a.concentration.id !== c.concentrationId ||
      (inCombat(s, a.id) && c.lastMagicTurnKey === turnKey(s))
    )
      error(
        p,
        "casting-state",
        "Il lancio non può proseguire in questa fase.",
        "The casting cannot continue in this phase.",
      );
    return p;
  };
  // This command has no separate preview screen: callers may use the query's command key.
  return perform(
    s,
    a,
    "casting-continue",
    sel,
    v,
    { ...opt, reviewKey: opt.reviewKey ?? make().reviewKey },
    make,
    () => {
      actionCost(s, a, "action");
      c.lastMagicTurnKey = turnKey(s);
      return { actorId: a.id, castingId: id };
    },
  );
}
export function cancelFamiliarCasting(s, id, reason, v, opt = {}) {
  const { a, c } = castingFor(s, id, v),
    sel = { castingId: id, reason };
  const make = () => {
    const p = preview(s, a, sel, CASTING);
    p.commit = commitFor(a, c.campaignId);
    if (c.status !== "casting" || typeof reason !== "string" || !reason.trim())
      error(p, "reason", "Specifica il motivo dell'interruzione.", "Give a reason for stopping.");
    return p;
  };
  return perform(
    s,
    a,
    "casting-cancel",
    sel,
    v,
    { ...opt, reviewKey: opt.reviewKey ?? make().reviewKey },
    make,
    () => {
      c.status = "cancelled";
      c.failure = reason;
      if (a.concentration?.id === c.concentrationId) a.concentration.active = false;
      return { actorId: a.id, castingId: id, status: c.status };
    },
  );
}
export function recordPersonalFormsTime(s, id, seconds, reason, v, opt = {}) {
  const a = actorFor(s, id, v, true),
    sel = { seconds, reason },
    clockId = "personal:" + id;
  const make = () => {
    const p = preview(s, a, sel, CASTING);
    p.commit.visibility = "private";
    if (
      a.owner !== v ||
      inCombat(s, id) ||
      !integer(seconds, 1) ||
      seconds > 604800 ||
      !reason?.trim() ||
      (!local(a) &&
        a.activeForm?.clockId !== clockId &&
        !castingsFor(s, a).some((c) => c.clockId === clockId && c.status === "casting"))
    )
      error(
        p,
        "personal-time",
        "Registra un intervallo personale valido e il motivo.",
        "Record a valid personal interval and reason.",
      );
    return p;
  };
  return perform(
    s,
    a,
    "personal-time",
    sel,
    v,
    { ...opt, reviewKey: opt.reviewKey ?? make().reviewKey },
    make,
    () => {
      s.restTime ??= { version: 1, clocks: {}, rests: [], rolls: [], events: [] };
      const clock = (s.restTime.clocks[clockId] ??= { seconds: 0, revision: 0 });
      clock.seconds += seconds;
      clock.revision++;
      observeFormsEvent(s, { eventId: opt.operationId + ":time", cause: "time", actorIds: [id] });
      return { actorId: id, seconds, clockId, after: clock.seconds };
    },
  );
}

export function observeFormsEvent(s, event) {
  if (
    !validId(event?.eventId) ||
    !["time", "actor-status", "concentration", "long-rest", "turn-end", "turn-start"].includes(
      event.cause,
    ) ||
    !Array.isArray(event.actorIds)
  )
    fail("event");
  const d = initializeFormsCompanions(s);
  const privateOrigins = new Set(
    Object.values(s.actors)
      .filter(
        (a) =>
          (a.activeForm?.clockId ?? "").startsWith("personal:") ||
          d.castings.some(
            (c) => c.actorId === a.id && c.campaignId === null && c.status === "casting",
          ),
      )
      .map((a) => a.id),
  );
  if (d.events.some((e) => e.id === event.eventId)) return;
  const ids = new Set(event.actorIds),
    changed = [];
  for (const a of Object.values(s.actors)) {
    if (
      a.activeForm &&
      (ids.has(a.id) || event.cause === "time") &&
      (a.dead ||
        (!isTransformation(a.activeForm) && incapacitated(a)) ||
        time(s, a.activeForm.clockId) >= a.activeForm.expiresAt ||
        transformationOver(s, a))
    ) {
      endForm(a, s);
      changed.push(a.id);
    }
    if (
      ids.has(a.id) &&
      a.companion &&
      !["released", "expired", "archived", "destroyed"].includes(a.companion.lifecycle) &&
      a.hp === 0 &&
      a.companion.kind !== "manual"
    ) {
      dismiss(s, a, "destroyed");
      changed.push(a.id);
    }
    if (
      event.cause === "long-rest" &&
      ids.has(a.id) &&
      a.formsProfile?.druidLevel >= 2 &&
      a.formsProfile.knownFormReplacement?.restId !== (event.restId ?? event.eventId)
    )
      a.formsProfile.knownFormReplacement = { restId: event.restId ?? event.eventId, used: false };
    if (
      event.cause === "long-rest" &&
      a.companion?.expiresOnParentLongRest &&
      ids.has(a.companion.parentActorId) &&
      !["released", "expired", "archived"].includes(a.companion.lifecycle)
    ) {
      dismiss(s, a, "expired");
      changed.push(a.id);
    }
  }
  for (const c of d.castings.filter(
    (c) => c.status === "casting" && (ids.has(c.actorId) || event.cause === "time"),
  )) {
    const a = s.actors[c.actorId],
      lost =
        !a ||
        a.dead ||
        incapacitated(a) ||
        !a.concentration?.active ||
        a.concentration.id !== c.concentrationId;
    const missed =
      event.cause === "turn-end" &&
      ids.has(c.actorId) &&
      c.lastMagicTurnKey !== (event.turnKey ?? turnKey(s));
    if (lost || missed) {
      c.status = "failed";
      c.failure = lost ? "concentration-ended" : "magic-action-missed";
      if (a?.concentration?.id === c.concentrationId) a.concentration.active = false;
      changed.push(c.actorId);
    }
  }
  for (const id of new Set([...ids, ...changed])) {
    const a = s.actors[id];
    if (!a) continue;
    d.events.push({
      id: event.eventId + ":" + id,
      actorId: id,
      owner: a.owner,
      kind: event.cause,
      label: text("Aggiornamento forme e compagni", "Forms and companions updated"),
      source: SHAPE,
      result: { changed: changed.includes(id) },
      visibility: local(a) || privateOrigins.has(a.id) ? "private" : "shared",
    });
  }
  d.events.push({
    id: event.eventId,
    actorId: null,
    owner: null,
    kind: "observed",
    visibility: "private",
    result: { changed },
  });
}
