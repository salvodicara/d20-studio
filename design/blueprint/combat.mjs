import { getEffectiveActor, getEffectiveSpeed, observeFormsEvent } from "./forms-companions.mjs";
import { canControlActor, isActorAvailable } from "./character-access.mjs";
import { previewMovement, spendMovement, grantDash, resetTurnMovement } from "./state.mjs";
import { observeRestEvent, advanceRoundTime, startKnockoutRest } from "./rest-time.mjs";
import {
  hasCondition,
  conditionAttackRules,
  conditionSaveRules,
  applyVitalityEvent,
  applyConditionEvent,
  observeConditionEvent,
  describeDeathSave,
  describeStableRecovery,
  beginAid,
  previewAid,
  getVitalityRollState,
  applyVitalityRoll,
  combatTurnKey,
  currentVitalityDescriptor,
  projectConditionReasons,
  hiddenConditionIds,
  canReadVitals,
  disguises,
  maskNames,
} from "./conditions.mjs";
import { activeItemModifiers, rowWeapon } from "./srd-sample.mjs";
import {
  tracePath,
  geometryKey,
  validateSceneGeometry,
  hasLineOfSight,
  hasLineOfEffect,
  findApproachPath,
  segmentMeters,
  distanceRuleOf,
} from "./spatial.mjs";

const SOURCE = Object.freeze({
  kind: "srd",
  edition: "2024",
  revision: "5.2.1",
  sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
  url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
});
const text = (it, en) => ({ it, en });
const copy = (value) => structuredClone(value);
const mod = (value) => Math.floor((value - 10) / 2);
// A rule the campaign chose in its settings (house rule, «regola della campagna»): no SRD page.
const CAMPAIGN_RULE = Object.freeze({
  kind: "house-rule",
  edition: "2024",
  title: Object.freeze(text("Regola della campagna", "Campaign rule")),
});

// R1 (round 2): optional neighbours are areas, loaded by dynamic import and null while absent
// (DEVELOPMENT.md, W2b1 integration): a static import of an area would make the core fail
// when that area is not built. Each contract keeps its stated default until it loads:
// sheet-plus-domain (roll riders, homebrew roll modes), special-moves-domain (C10
// mountControl), session-view (C3 runsSession) and campaign-settings-domain (C1 disclosure,
// C7 campaign rules). Tests await `neighboursReady`.
let sheetPlus = null;
let specialMoves = null;
let sessionView = null;
let campaignSettings = null;
const optional = (path, assign) => import(path).then(assign, () => null);
export const neighboursReady = Promise.all([
  optional("./sheet-plus-domain.mjs", (module) => (sheetPlus = module)),
  optional("./special-moves-domain.mjs", (module) => (specialMoves = module)),
  optional("./session-view.mjs", (module) => (sessionView = module)),
  optional("./campaign-settings-domain.mjs", (module) => (campaignSettings = module)),
]);
const guarded = (run, fallback) => {
  try {
    return run() ?? fallback;
  } catch {
    return fallback;
  }
};
/**
 * C3 (CA-57, Owlbear GM hand-off): whoever runs the session holds the DM's powers at the
 * Table and in combat (projections of hidden creatures, roll requests, reaction order).
 * Identity checks (ownership, private data) stay on the role itself.
 */
export function sessionAuthority(state, role) {
  return typeof sessionView?.runsSession === "function"
    ? guarded(() => sessionView.runsSession(state, role) === true, role === "dm")
    : role === "dm";
}
// C7: the campaign's rules (BG3 Custom Mode / Solasta presets, computed by this engine);
// the SRD values while the settings area is absent.
const SRD_RULES = Object.freeze({ criticals: "dice", flanking: "off" });
export function campaignRules(state) {
  const policy =
    typeof campaignSettings?.policyOf === "function"
      ? guarded(
          () => campaignSettings.policyOf(state?.ext?.["campaign-settings"], state?.campaign?.id),
          SRD_RULES,
        )
      : SRD_RULES;
  return {
    criticals: policy.criticals === "max" ? "max" : "dice",
    flanking: policy.flanking === "advantage" ? "advantage" : "off",
  };
}
// C1 (CA-71): whether players read the DC of a save or check (FG hidden DC).
export function dcShownTo(state, role) {
  if (sessionAuthority(state, role)) return true;
  const disclosure =
    typeof campaignSettings?.disclosureOf === "function"
      ? guarded(() => campaignSettings.disclosureOf(state), {})
      : {};
  return disclosure.dc !== "hidden";
}
// TV-141 (Fantasy Grounds ID toggle, Foundry Anonymous): attempts store a creature's true
// name, even while it wears a disguise; projections show players the disguise, retroactively,
// as the log does (conditions.mjs disguises/maskNames). The session runner keeps the truth.
function trueNameOf(state, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor) return "";
  return disguises(state).find((entry) => entry.actorId === actorId)?.trueName ?? actor.name;
}
/** A creature's name as `role` may read it (the disguise for players, the truth for the DM). */
export function displayName(state, actorId, role) {
  if (sessionAuthority(state, role)) return trueNameOf(state, actorId);
  const name = state.actors?.[actorId]?.name ?? "";
  return maskNames(name, disguises(state));
}
/** Any text naming creatures, masked for `role` (the disguises of names written in it). */
export function maskedFor(state, role, value) {
  if (sessionAuthority(state, role)) return value;
  const list = disguises(state);
  return list.length ? maskNames(value, list) : value;
}
// C10 (PG-79): the rider of a controlled mount, or null (no restriction while absent).
function mountControlOf(state, actorId) {
  if (typeof specialMoves?.mountControl !== "function") return null;
  const control = guarded(() => specialMoves.mountControl(state, actorId), null);
  return control && typeof control === "object" ? control : null;
}
const canControl = canControlActor;
const sceneFor = (state) => state.scenes.find((scene) => scene.id === state.activeSceneId);
const tokenFor = (state, actorId) =>
  sceneFor(state)?.tokens.find((token) => token.actorId === actorId);
const sampleTeam = (actor) =>
  ["livia", "doran"].includes(actor.id)
    ? "party"
    : ["goblin-1", "goblin-2"].includes(actor.id)
      ? "watch"
      : null;
const opposingTeams = (first, second) =>
  (first === "party" && second === "watch") || (first === "watch" && second === "party");
// BI-24: the effective actor always carries a combatProfile object (forms-companions copies
// it), so an empty one is an actor without a profile and takes the default below.
const hasProfile = (profile) => Boolean(profile) && Object.keys(profile).length > 0;
const profileFor = (input) => {
  const actor = getEffectiveActor(input);
  return hasProfile(actor.combatProfile)
    ? { team: sampleTeam(actor), ...actor.combatProfile }
    : actor.id === "livia"
      ? {
          spellcastingAbility: "int",
          proficiencyBonus: 2,
          weaponProficiencies: ["quarterstaff"],
          spells: ["fire-bolt", "burning-hands", "magic-missile"],
          componentsAvailable: true,
          team: "party",
        }
      : {
          proficiencyBonus: 2,
          weaponProficiencies: [],
          spells: [],
          componentsAvailable: true,
          team:
            actor.id === "doran"
              ? "party"
              : ["goblin-1", "goblin-2"].includes(actor.id)
                ? "watch"
                : null,
        };
};
const source = (pages, extra = {}) => ({ ...SOURCE, pages, ...extra });
export function isValidMeleeProfile(profile) {
  return (
    !!profile &&
    typeof profile.name?.it === "string" &&
    !!profile.name.it.trim() &&
    typeof profile.name?.en === "string" &&
    !!profile.name.en.trim() &&
    Number.isFinite(profile.reachMeters) &&
    profile.reachMeters > 0 &&
    Number.isInteger(profile.attackBonus) &&
    Number.isInteger(profile.damageModifier) &&
    Array.isArray(profile.damageDice) &&
    ((profile.damageDice.length === 0 &&
      Number.isInteger(profile.fixedDamage) &&
      profile.fixedDamage >= 0 &&
      profile.damageModifier === 0) ||
      (profile.damageDice.length === 1 && profile.fixedDamage === undefined)) &&
    profile.damageDice.every(
      (die) =>
        Number.isInteger(die.count) &&
        die.count >= 1 &&
        die.count <= 20 &&
        [4, 6, 8, 10, 12, 20].includes(die.sides),
    ) &&
    typeof profile.damageType === "string" &&
    !!profile.damageType.trim() &&
    (profile.source?.kind === "authored-demo" ||
      // BI-45: an enabled compatibility pack's attack, with its pack, version and page.
      (profile.source?.kind === "compat-pack" &&
        typeof profile.source.packId === "string" &&
        Array.isArray(profile.source.pages)) ||
      (profile.source?.kind === "srd" &&
        profile.source.sha256 === SOURCE.sha256 &&
        profile.source.revision === SOURCE.revision)) &&
    profile.source?.edition === "2024" &&
    typeof profile.source?.revision === "string" &&
    !!profile.source.revision.trim()
  );
}

function dexteritySaveModifier(actor) {
  actor = getEffectiveActor(actor);
  if (actor.savingThrows?.dex !== undefined)
    return Number.isFinite(actor.savingThrows.dex) ? actor.savingThrows.dex : NaN;
  return Number.isFinite(actor.abilities?.dex) ? mod(actor.abilities.dex) : NaN;
}
function defensiveDataAvailable(actor, action) {
  actor = getEffectiveActor(actor);
  return (
    !!actor &&
    Number.isFinite(actor.hp) &&
    actor.hp >= 0 &&
    (action.kind !== "attack" || Number.isFinite(actor.ac)) &&
    (action.kind !== "area" || Number.isFinite(dexteritySaveModifier(actor)))
  );
}
// A creature the players can see now: not hidden, token not hidden (the rules' sight and
// what a player may know); a personal sheet counts for the player who plays it, as before.
const publicly = (state, actorId) => {
  const actor = state.actors[actorId];
  if (!actor) return false;
  if (actor.visibility === "private") return canControl(actor, "player", state);
  return (
    !actor.hidden &&
    !tokenFor(state, actorId)?.hidden &&
    tokenFor(state, actorId)?.visible !== false
  );
};
// What `role` may know of a creature: the session runner (C3) sees what the DM's Table shows.
const visible = (state, actorId, role) => {
  const actor = state.actors[actorId];
  if (!actor) return false;
  if (actor.visibility === "private") return canControl(actor, role, state);
  return sessionAuthority(state, role) || publicly(state, actorId);
};
// One condition reading for strings, legacy objects and domain instances (increment 10).
const incapacitated = (actor) => hasCondition(actor, "incapacitated");
export { incapacitated as isIncapacitated };
const dodging = (actor) =>
  (actor.combatEffects ?? []).some((effect) => effect.type === "dodge") &&
  !incapacitated(actor) &&
  getEffectiveSpeed(actor) > 0;
const canSee = (state, observerId, targetId, role) =>
  !hasCondition(state.actors[observerId], "blinded") &&
  !hasCondition(state.actors[targetId], "invisible") &&
  publicly(state, targetId) &&
  hasLineOfSight(sceneFor(state), tokenFor(state, observerId), tokenFor(state, targetId), { role });
// The shared, index-independent identity of the turn under way (conditions.mjs).
const turnKey = (state) => combatTurnKey(state.combat);
const failure = (code, it, en) => ({ code, it, en });
function reject(reason) {
  const error = new Error(reason.en);
  Object.assign(error, reason);
  throw error;
}
function distance(state, first, second) {
  // B40: the scene's distance rule (SRD grid squares, hexes...); Euclidean when none is set.
  return segmentMeters(sceneFor(state), first, second);
}
function resource(actor, level) {
  return actor.spellSlots?.[level] ?? (level === 1 ? actor.slots : null);
}
function spendSpellSlot(actor, level) {
  resource(actor, level).used += 1;
  if (level === 1 && actor.spellSlots?.[1]) actor.slots = actor.spellSlots[1];
}
function spellLevels(actor) {
  const levels = new Set([1, ...Object.keys(actor.spellSlots ?? {}).map(Number)]);
  return [...levels]
    .sort((a, b) => a - b)
    .filter((level) => level >= 1 && level <= 9 && resource(actor, level))
    .map((level) => ({
      level,
      max: resource(actor, level).max,
      remaining: Number.isInteger(resource(actor, level).used)
        ? Math.max(0, resource(actor, level).max - resource(actor, level).used)
        : null,
    }));
}

// B36 additive hook (inventory-plus.mjs): an area may provide inventory-based actions, such
// as a ranged weapon that expends ammunition (dnd5e FVT-140). `list(state, actor, profile)`
// returns plain action data; `preview(state, actor, action, selection)` returns refusal
// reasons ({code, it, en}); `commit(state, attempt, action)` runs once inside the accepted
// attempt, after its costs, to spend what the action consumes. No provider: no change.
const inventoryActionHooks = [];
export function registerActionProvider(provider) {
  if (provider && !inventoryActionHooks.includes(provider)) inventoryActionHooks.push(provider);
  return () => {
    const index = inventoryActionHooks.indexOf(provider);
    if (index >= 0) inventoryActionHooks.splice(index, 1);
  };
}
export function listActions(state, actorId) {
  const actor = getEffectiveActor(state.actors[actorId]);
  if (!isActorAvailable(actor)) return [];
  const profile = profileFor(actor);
  const actions = [
    {
      id: "dash",
      name: text("Scatto", "Dash"),
      shortDescription: text(
        "Aggiungi la velocità al movimento residuo e scegli dove andare.",
        "Add your speed to remaining movement and choose a destination.",
      ),
      kind: "self",
      targetMode: "destination",
      cost: { action: 1 },
      rangeMeters: 0,
      dice: [],
      source: source([180]),
    },
    {
      id: "dodge",
      name: text("Schivata", "Dodge"),
      shortDescription: text(
        "Svantaggio agli attacchi che vedi; vantaggio ai TS Destrezza fino al tuo prossimo turno.",
        "Disadvantage on attacks you can see; advantage on Dexterity saves until your next turn.",
      ),
      kind: "self",
      targetMode: "self",
      cost: { action: 1 },
      rangeMeters: 0,
      dice: [],
      source: source([181]),
    },
    {
      id: "disengage",
      name: text("Disimpegno", "Disengage"),
      shortDescription: text(
        "Il movimento non provoca attacchi di opportunità per il resto del turno.",
        "Your movement does not provoke opportunity attacks for the rest of this turn.",
      ),
      kind: "self",
      targetMode: "self",
      cost: { action: 1 },
      rangeMeters: 0,
      dice: [],
      source: source([181]),
    },
  ];
  if (profile.meleeAttack) {
    const weapon = profile.meleeAttack;
    actions.unshift({
      id: "melee-attack",
      name: copy(weapon.name),
      shortDescription: text(
        "Attacco in mischia con il profilo configurato.",
        "Melee attack using the configured profile.",
      ),
      kind: "attack",
      targetMode: "single",
      cost: { action: 1 },
      rangeMeters: weapon.reachMeters,
      dice: copy(weapon.damageDice),
      damageType: weapon.damageType,
      attackType: "melee",
      attackModifier: weapon.attackBonus,
      damageModifier: weapon.damageModifier,
      fixedDamage: weapon.fixedDamage,
      onHitProneMaxSize: weapon.onHitProneMaxSize,
      source: copy(weapon.source),
    });
  }
  const staff = actor.inventory?.find(
    (item) =>
      (item.weaponType === "quarterstaff" || item.id === "staff") &&
      item.kind === "weapon" &&
      item.equipped &&
      item.availableInForm !== false &&
      item.location !== "ground" &&
      item.quantity > 0,
  );
  if (staff)
    actions.unshift({
      id: "quarterstaff",
      itemId: staff.id,
      name: text("Bastone ferrato", "Quarterstaff"),
      shortDescription: text(
        "Attacco in mischia; 1d6 + Forza, oppure 1d8 a due mani.",
        "Melee attack; 1d6 + Strength, or 1d8 with two hands.",
      ),
      kind: "attack",
      targetMode: "single",
      cost: { action: 1 },
      rangeMeters: 1.5,
      dice: [{ count: 1, sides: 6 }],
      damageType: "bludgeoning",
      attackType: "melee",
      handsOptions: [1, 2],
      source: source([7, 16, 90, 91]),
    });
  if (profile.spells?.includes("fire-bolt"))
    actions.unshift({
      id: "fire-bolt",
      name: text("Dardo di fuoco", "Fire Bolt"),
      shortDescription: text(
        "Attacco a distanza con incantesimo, danni da fuoco.",
        "Ranged spell attack, fire damage.",
      ),
      kind: "attack",
      targetMode: "single",
      cost: { action: 1 },
      rangeMeters: 36,
      dice: [
        {
          count: actor.level >= 17 ? 4 : actor.level >= 11 ? 3 : actor.level >= 5 ? 2 : 1,
          sides: 10,
        },
      ],
      damageType: "fire",
      attackType: "ranged",
      spell: true,
      components: ["V", "S"],
      source: source([7, 15, 16, 132]),
    });
  if (profile.spells?.includes("burning-hands"))
    actions.unshift({
      id: "burning-hands",
      name: text("Mani brucianti", "Burning Hands"),
      shortDescription: text(
        "Cono di 4,5 m; 3d6 comuni, TS Destrezza per dimezzare.",
        "4.5 m cone; one shared 3d6 roll, Dexterity save for half damage.",
      ),
      kind: "area",
      targetMode: "area",
      cost: { action: 1, slotLevel: 1 },
      rangeMeters: 4.5,
      area: { shape: "cone", lengthMeters: 4.5, angleRadians: 2 * Math.atan(0.5) },
      dice: [{ count: 3, sides: 6 }],
      damageType: "fire",
      spell: true,
      components: ["V", "S"],
      slotLevels: spellLevels(actor),
      source: source([16, 105, 114, 177, 179]),
    });
  if (profile.spells?.includes("magic-missile"))
    actions.unshift({
      id: "magic-missile",
      name: text("Dardo incantato", "Magic Missile"),
      shortDescription: text(
        "Distribuisci 3 dardi prima di tirare: ciascuno infligge 1d4 + 1 forza.",
        "Assign 3 darts before rolling: each deals 1d4 + 1 force damage.",
      ),
      kind: "multi",
      targetMode: "multiple",
      cost: { action: 1, slotLevel: 1 },
      rangeMeters: 36,
      dice: [{ count: 3, sides: 4 }],
      damageType: "force",
      spell: true,
      components: ["V", "S"],
      slotLevels: spellLevels(actor),
      source: source([16, 105, 146], {
        interpretation: "One damage die per dart; 2024 shared-save damage rule does not apply.",
      }),
    });
  const extras = [];
  for (const provider of inventoryActionHooks)
    for (const extra of provider.list?.(state, actor, profile) ?? []) extras.push(copy(extra));
  // BI-24 (dnd5e: each weapon item carries its attack): an equipped melee weapon that no area
  // lists yet (a forged homebrew copy) becomes its own attack; the configured profile stays
  // for creatures without one.
  const listed = new Set(
    [...actions, ...extras].map((action) => action.itemId).filter((id) => id !== undefined),
  );
  for (const weapon of inventoryWeaponActions(state, actor, profile, listed).reverse())
    actions.unshift(weapon);
  for (const extra of extras) actions.unshift(extra);
  // BI-24 (FG Forge, dnd5e Enchant): the weapon item's structured bonus (a forged +1 or a
  // customised copy's attack/damage modifiers) travels with every attack made with it.
  const bonuses = activeItemModifiers(actor, state.library).filter((row) =>
    ["attack", "damage"].includes(row.target),
  );
  for (const action of actions) {
    if (action.kind !== "attack" || !action.itemId) continue;
    const own = bonuses.filter((row) => row.rowId === action.itemId);
    if (own.length)
      action.itemBonuses = own.map((row) => ({
        target: row.target,
        value: row.value,
        label:
          typeof row.name === "object" ? copy(row.name) : text(String(row.name), String(row.name)),
        ...(row.source ? { source: copy(row.source) } : {}),
      }));
  }
  return actor.companion?.attacksAllowed === false || profile.attacksAllowed === false
    ? actions.filter((action) => action.kind !== "attack")
    : actions;
}
const MARTIAL_CLASSES = new Set(["barbarian", "fighter", "paladin", "ranger"]);
// Weapon proficiency by class (SRD 5.2.1 class tables): every class uses Simple weapons;
// Barbarian, Fighter, Paladin and Ranger Martial ones; a Rogue Martial weapons with Finesse
// or Light, a Monk Martial weapons with Light. A creature without classes (an NPC) uses its
// weapons as its stat block does; an explicit proficiency on the profile always counts.
function weaponProficient(actor, profile, slug, weapon) {
  if (slug && profile.weaponProficiencies?.includes(slug)) return true;
  const classes = (actor.buildSeed?.classes ?? []).map((entry) => entry.classId);
  if (!classes.length) return actor.kind === "npc" || weapon.category === "simple";
  if (weapon.category === "simple" || classes.some((id) => MARTIAL_CLASSES.has(id))) return true;
  const properties = weapon.properties ?? [];
  return (
    (classes.includes("rogue") &&
      (properties.includes("finesse") || properties.includes("light"))) ||
    (classes.includes("monk") && properties.includes("light"))
  );
}
const dieOf = (value) => {
  const match = /^(\d+)d(\d+)$/.exec(String(value ?? "").trim());
  return match ? { count: Number(match[1]), sides: Number(match[2]) } : null;
};
const rowName = (row) =>
  typeof row.name === "object" && row.name
    ? text(row.name.it ?? row.name.en ?? "", row.name.en ?? row.name.it ?? "")
    : text(String(row.name ?? ""), String(row.name ?? ""));
// BI-24: attacks of equipped melee weapons in the inventory that no area lists (ranged
// weapons with ammunition and thrown ones stay with the areas that count them, B36 and B40).
// Ability: Strength, or the better of Strength and Dexterity with Finesse (SRD 5.2.1 weapon
// properties, EN 89–91 / IT 101–103); the Proficiency Bonus when proficient; the weapon's
// mastery when the sheet's mastery (B40 special-moves) makes it active.
function inventoryWeaponActions(state, actor, profile, listed) {
  const out = [];
  for (const row of actor.inventory ?? []) {
    if (!row || !row.equipped || listed.has(row.id) || !(row.quantity > 0)) continue;
    if (row.location === "ground" || row.availableInForm === false || row.unidentified) continue;
    const found = rowWeapon(row, state.library);
    const weapon = found?.weapon;
    const dice = dieOf(weapon?.damage?.dice);
    if (!weapon || weapon.type !== "melee" || !dice) continue;
    const properties = weapon.properties ?? [];
    const str = mod(actor.abilities?.str ?? 10),
      dex = mod(actor.abilities?.dex ?? 10);
    const useDex = properties.includes("finesse") && dex > str;
    const ability = useDex ? dex : str;
    // The sheet's Proficiency Bonus (recorded, else by level: SRD 5.2.1 EN 8 / IT 8).
    const pb = weaponProficient(actor, profile, found.slug, weapon)
      ? Number.isFinite(profile.proficiencyBonus)
        ? profile.proficiencyBonus
        : Number.isFinite(actor.proficiencyBonus)
          ? actor.proficiencyBonus
          : 2 + Math.floor((Math.max(1, Math.min(20, actor.level || 1)) - 1) / 4)
      : 0;
    const versatile = dieOf(weapon.versatile);
    const mastery =
      weapon.mastery && typeof specialMoves?.masteryOf === "function"
        ? guarded(
            () =>
              specialMoves.masteryOf(state, state.actors[actor.id] ?? actor, {
                ...row,
                weapon,
                weaponType: found.slug ?? undefined,
              }),
            null,
          )
        : null;
    const abilityName = useDex ? text("Destrezza", "Dexterity") : text("Forza", "Strength");
    const masteryName = mastery?.active ? mastery.name : null;
    out.push({
      id: "item-attack." + row.id,
      itemId: row.id,
      name: rowName(row),
      shortDescription: text(
        `Attacco in mischia con arma: ${weapon.damage.dice}${versatile ? ` (${weapon.versatile} a due mani)` : ""} + ${abilityName.it}${masteryName ? ` · Padronanza: ${masteryName.it ?? ""}` : ""}.`,
        `Melee weapon attack: ${weapon.damage.dice}${versatile ? ` (${weapon.versatile} two-handed)` : ""} + ${abilityName.en}${masteryName ? ` · Mastery: ${masteryName.en ?? ""}` : ""}.`,
      ),
      kind: "attack",
      targetMode: "single",
      cost: { action: 1 },
      rangeMeters: properties.includes("reach") ? 3 : 1.5,
      dice: [dice],
      ...(versatile ? { handsOptions: [1, 2], versatileDice: versatile } : {}),
      damageType: weapon.damage.type ?? "bludgeoning",
      attackType: "melee",
      attackModifier: ability + pb,
      damageModifier: ability,
      attackParts: [
        { label: abilityName, value: ability },
        ...(pb ? [{ label: text("Competenza", "Proficiency"), value: pb }] : []),
      ],
      ...(mastery?.active ? { mastery: mastery.property } : {}),
      source: copy(found.source ?? null),
    });
  }
  return out;
}
// B40 (additive): `provider(state, attacker, action, selection, target)` returns extra
// sourced roll reasons `{code, mode, name, source}` (weapon mastery, Help).
const rollReasonProviders = new Set();
export function provideRollReasons(provider) {
  rollReasonProviders.add(provider);
  return () => rollReasonProviders.delete(provider);
}
// B46 (additive): situational rows another area computes for an attack against one target:
// cover from walls and creatures (SRD 5.2.1 "Cover", EN 15 / IT 16) and, where the campaign
// allows it, the chance to hit. `provider(state, attackerId, targetId, action, context)`
// returns [{code, mode: "target-ac" | "info", name, source?, acBonus?, blocksTargeting?}];
// `context` is {role, rollMode, modifier} in a preview and {} at resolution. The preview
// shows the rows with the roll reasons; the resolution adds each `acBonus` to the target's
// AC. A provider that throws adds nothing. No provider: no change.
const attackModifierProviders = new Set();
export function addAttackModifierProvider(provider) {
  if (typeof provider === "function") attackModifierProviders.add(provider);
  return () => attackModifierProviders.delete(provider);
}
function attackModifiers(state, attackerId, targetId, action, context = {}) {
  const rows = [];
  for (const provider of attackModifierProviders)
    try {
      const list = provider(state, attackerId, targetId, action, context);
      if (Array.isArray(list)) rows.push(...list.filter((row) => typeof row?.code === "string"));
    } catch {
      /* the attack keeps the core rules */
    }
  return rows;
}
function coneGeometry(state, actorId, point) {
  const origin = tokenFor(state, actorId);
  if (!origin || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const dx = point.x - origin.x,
    dy = point.y - origin.y,
    length = Math.hypot(dx, dy);
  if (length < 0.001) return null;
  const scene = sceneFor(state);
  const pixels = (4.5 / scene.metersPerCell) * scene.gridSize;
  const ux = dx / length,
    uy = dy / length;
  const center = { x: origin.x + ux * pixels, y: origin.y + uy * pixels };
  return {
    shape: "cone",
    origin: { x: origin.x, y: origin.y },
    points: [
      { x: origin.x, y: origin.y },
      { x: center.x - (uy * pixels) / 2, y: center.y + (ux * pixels) / 2 },
      { x: center.x + (uy * pixels) / 2, y: center.y - (ux * pixels) / 2 },
    ],
    direction: { x: ux, y: uy },
    lengthPixels: pixels,
    lengthMeters: 4.5,
    angleRadians: 2 * Math.atan(0.5),
    inclusion: "token-center-demo",
  };
}
function coneContains(geometry, point) {
  const dx = point.x - geometry.origin.x,
    dy = point.y - geometry.origin.y;
  const along = dx * geometry.direction.x + dy * geometry.direction.y;
  const across = Math.abs(dx * geometry.direction.y - dy * geometry.direction.x);
  return along > 0 && along <= geometry.lengthPixels + 0.001 && across <= along / 2 + 0.001;
}
function targetSummary(state, actorId, origin) {
  return {
    actorId,
    name: state.actors[actorId]?.name ?? "",
    distanceMeters: distance(state, origin, tokenFor(state, actorId)),
  };
}
function modeFrom(...modes) {
  const advantage = modes.includes("advantage"),
    disadvantage = modes.includes("disadvantage");
  return advantage === disadvantage ? "normal" : advantage ? "advantage" : "disadvantage";
}
// Condition rules at the real token distance; sight facts come from the same scene checks.
// Frightened: the source of fear counts while it is within line of sight of the
// attacker's token (SRD EN 182 / IT 216); an unknown or absent source needs an explicit
// answer in `selection.conditionFacts` instead of a silent normal roll.
function conditionRulesFor(state, actor, target, role, selection = {}) {
  const origin = tokenFor(state, actor.id),
    token = target && tokenFor(state, target.id);
  return conditionAttackRules(actor, target, {
    distanceMeters: origin && token ? distance(state, origin, token) : undefined,
    attackerCanSeeTarget: canSee(state, actor.id, target.id, role),
    targetCanSeeAttacker: canSee(state, target.id, actor.id, role),
    canSeeSource: (sourceId) => {
      const sourceToken = state.actors[sourceId] && tokenFor(state, sourceId);
      return origin && sourceToken
        ? hasLineOfSight(sceneFor(state), origin, sourceToken)
        : undefined;
    },
    facts: selection?.conditionFacts,
  });
}
// Facts the attacker's controller can declare when a condition's origin is unknown.
export const CONDITION_FACTS = ["source-sight", "grappler-unknown", "charmer-unknown"];
const IT_SRD = Object.freeze({
  url: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf",
  sha256: "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718",
});
const rule = (en, it) => ({
  ...SOURCE,
  pages: en,
  en: { url: SOURCE.url, sha256: SOURCE.sha256, pages: en },
  it: { ...IT_SRD, pages: it },
});
// Sourced reasons, besides conditions, that set an attack roll's Advantage/Disadvantage.
const ROLL_REASONS = {
  declared: [text("Circostanze dichiarate", "Declared circumstances"), null],
  "pack-tactics": [text("Tattiche del branco", "Pack Tactics"), null],
  dodge: [
    text("Il bersaglio schiva e ti vede", "The target is Dodging and sees you"),
    rule([10], [10]),
  ],
  "close-combat": [
    text(
      "Attacco a distanza con un nemico entro 1,5 m che ti vede",
      "Ranged attack with an enemy within 1.5 m who can see you",
    ),
    rule([15], [17]),
  ],
  "unseen-target": [text("Non vedi il bersaglio", "You can't see the target"), rule([14], [16])],
  "unseen-attacker": [
    text("Il bersaglio non ti vede", "The target can't see you"),
    rule([14], [16]),
  ],
  // B40 (additive): SRD 5.2.1 "Range" (EN 15, 90 / IT 17, 101).
  "long-range": [
    text("Oltre la gittata normale", "Beyond normal range"),
    rule([15, 90], [17, 101]),
  ],
  // H-01 / C7: the campaign's optional flanking rule (BG3 Custom Mode, Solasta presets).
  flanking: [text("Fiancheggiamento (regola della campagna)", "Flanking (campaign rule)"), null],
};
const rollReason = (code, mode, extra = {}) => ({
  code,
  mode,
  name: copy(ROLL_REASONS[code][0]),
  source: copy(extra.source ?? ROLL_REASONS[code][1]),
});
const SIGHT_CONDITIONS = ["blinded", "invisible"];
function rollReasonsFor(state, actor, action, selection, target, role, rules = null) {
  const reasons = [];
  if (["advantage", "disadvantage"].includes(selection.rollMode))
    reasons.push(rollReason("declared", selection.rollMode));
  if (target && dodging(target) && canSee(state, target.id, actor.id, role))
    reasons.push(rollReason("dodge", "disadvantage"));
  const origin = tokenFor(state, actor.id);
  const profile = profileFor(actor);
  const team = profile.team;
  const packTactics =
    target &&
    team &&
    profile.traits?.some((t) => t.id === "pack-tactics") &&
    sceneFor(state).tokens.some((token) => {
      const ally = state.actors[token.actorId];
      return (
        ally &&
        ally.id !== actor.id &&
        ally.id !== target.id &&
        isActorAvailable(ally) &&
        profileFor(ally).team === team &&
        !incapacitated(ally) &&
        !ally.dead &&
        distance(state, token, tokenFor(state, target.id)) <= 1.5 + 0.001
      );
    });
  if (packTactics)
    reasons.push(
      rollReason("pack-tactics", "advantage", { source: profile.source ?? actor.source ?? null }),
    );
  // SRD 5.2.1 "Ranged Attacks in Close Combat" (EN 15 / IT 17).
  const closeEnemy =
    action.attackType === "ranged" &&
    sceneFor(state).tokens.some((token) => {
      const enemy = state.actors[token.actorId];
      const enemyTeam = enemy && profileFor(enemy).team;
      return (
        enemy &&
        enemy.id !== actor.id &&
        opposingTeams(team, enemyTeam) &&
        enemy.hp > 0 &&
        !incapacitated(enemy) &&
        canSee(state, enemy.id, actor.id, role) &&
        distance(state, origin, token) <= 1.5 + 0.001
      );
    });
  if (closeEnemy) reasons.push(rollReason("close-combat", "disadvantage"));
  // A sight condition already explains an unseen attacker or target: no duplicate line.
  const covered = (list, side) =>
    (list ?? []).some((r) => SIGHT_CONDITIONS.includes(r.conditionId) && r.side === side);
  if (
    target &&
    !canSee(state, actor.id, target.id, role) &&
    !covered(rules?.disadvantage, "target") &&
    !covered(rules?.disadvantage, "attacker")
  )
    reasons.push(rollReason("unseen-target", "disadvantage"));
  if (
    target &&
    !canSee(state, target.id, actor.id, role) &&
    !covered(rules?.advantage, "attacker") &&
    !covered(rules?.advantage, "target")
  )
    reasons.push(rollReason("unseen-attacker", "advantage"));
  // B40 (additive): a two-range weapon beyond its normal range (thrown weapons, CRP-109).
  if (
    target &&
    Number.isFinite(action.longRangeMeters) &&
    distance(state, origin, tokenFor(state, target.id)) > action.rangeMeters + 0.001
  )
    reasons.push(rollReason("long-range", "disadvantage"));
  // H-01 / C7: with the campaign's flanking rule a melee attacker has Advantage while a
  // conscious ally stands adjacent to the target on the opposite side.
  if (
    target &&
    action.attackType === "melee" &&
    campaignRules(state).flanking === "advantage" &&
    flankingAlly(state, actor, target)
  )
    reasons.push(rollReason("flanking", "advantage", { source: CAMPAIGN_RULE }));
  // BI-18 (Roll20 Modifier Builder, DDB modifiers): homebrew Advantage or Disadvantage on
  // attack rolls applied to this creature, named "<entry> (homebrew)".
  const homebrew = homebrewModes(state, actor.id, { kind: "attack" });
  for (const mode of ["advantage", "disadvantage"])
    for (const reason of homebrew[mode])
      reasons.push({
        code: "homebrew",
        mode,
        name: copy(reason.name),
        source: copy(reason.source),
      });
  // B40 (additive): sourced reasons from areas (weapon mastery, the Help action).
  for (const provider of rollReasonProviders)
    for (const reason of provider(state, actor, action, selection, target) ?? [])
      if (["advantage", "disadvantage"].includes(reason?.mode)) reasons.push(copy(reason));
  return reasons;
}
// BI-18: the homebrew roll modes of one D20 Test (sheet-plus-domain homebrewRollModes).
function homebrewModes(state, actorId, test) {
  const modes =
    typeof sheetPlus?.homebrewRollModes === "function"
      ? guarded(() => sheetPlus.homebrewRollModes(state, actorId, test), null)
      : null;
  return {
    advantage: Array.isArray(modes?.advantage) ? modes.advantage : [],
    disadvantage: Array.isArray(modes?.disadvantage) ? modes.disadvantage : [],
  };
}
// The optional flanking rule as written for a grid: two allies flank an enemy when both are
// adjacent to it and the line between their centres passes through opposite sides (or
// opposite corners) of the enemy's space. The ally must be conscious (not Incapacitated).
const SPACE_CELLS = { large: 2, huge: 3, gargantuan: 4 };
function flankingAlly(state, attacker, target) {
  const scene = sceneFor(state);
  const a = tokenFor(state, attacker.id),
    t = tokenFor(state, target.id);
  const team = profileFor(attacker).team;
  if (!scene || !a || !t || !team) return null;
  const cells = (actor) => SPACE_CELLS[String(actor?.size ?? "").toLowerCase()] ?? 1;
  const half = (cells(target) * scene.gridSize) / 2;
  const adjacent = (token, actor) => {
    const reach = half + (cells(actor) * scene.gridSize) / 2 + scene.gridSize * 0.25;
    const dx = Math.abs(token.x - t.x),
      dy = Math.abs(token.y - t.y);
    return Math.max(dx, dy) <= reach && Math.max(dx, dy) > 0;
  };
  if (!adjacent(a, attacker)) return null;
  for (const token of scene.tokens) {
    const ally = state.actors[token.actorId];
    if (
      !ally ||
      ally.id === attacker.id ||
      ally.id === target.id ||
      token.hidden ||
      !isActorAvailable(ally) ||
      ally.dead ||
      !(ally.hp > 0) ||
      incapacitated(ally) ||
      profileFor(ally).team !== team ||
      !adjacent(token, ally)
    )
      continue;
    if (oppositeSides(a, token, t, half)) return ally.id;
  }
  return null;
}
// The segment a→b clipped to the square centred on c (half side h): entry and exit sides.
function oppositeSides(a, b, c, h) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  let t0 = 0,
    t1 = 1;
  for (const [p, q] of [
    [-dx, a.x - (c.x - h)],
    [dx, c.x + h - a.x],
    [-dy, a.y - (c.y - h)],
    [dy, c.y + h - a.y],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  const sides = (t) => {
    const x = a.x + dx * t,
      y = a.y + dy * t,
      e = 0.5;
    return {
      left: Math.abs(x - (c.x - h)) < e,
      right: Math.abs(x - (c.x + h)) < e,
      top: Math.abs(y - (c.y - h)) < e,
      bottom: Math.abs(y - (c.y + h)) < e,
    };
  };
  const enter = sides(t0),
    leave = sides(t1);
  return (
    (enter.left && leave.right) ||
    (enter.right && leave.left) ||
    (enter.top && leave.bottom) ||
    (enter.bottom && leave.top)
  );
}
function rollModeFor(state, actor, action, selection, target, role, rules = null) {
  return modeFrom(
    ...rollReasonsFor(state, actor, action, selection, target, role, rules).map((r) => r.mode),
    rules?.advantage.length ? "advantage" : "normal",
    rules?.disadvantage.length ? "disadvantage" : "normal",
  );
}

export function previewAction(state, actorId, actionId, selection = {}, role = "player") {
  const reasons = [];
  const actor = getEffectiveActor(state.actors[actorId]);
  const action = listActions(state, actorId).find((entry) => entry.id === actionId);
  const result = {
    action: action ? copy(action) : null,
    available: false,
    reasons,
    targets: [],
    cost: action ? copy(action.cost) : {},
    geometry: null,
  };
  const add = (code, it, en) => reasons.push(failure(code, it, en));
  if (!actor || !action) {
    add(
      "action-unavailable",
      "Questa mossa non è disponibile sulla scheda.",
      "This action is not available on the sheet.",
    );
    return result;
  }
  if (!canControl(actor, role, state))
    add("not-controller", "Non controlli questa creatura.", "You do not control this creature.");
  const scene = sceneFor(state);
  const origin = tokenFor(state, actorId);
  if (!scene || !origin) {
    add(
      "no-token",
      "La creatura non è presente nella scena.",
      "The creature is not in this scene.",
    );
    return result;
  }
  // TV-74 (BG3 greyed actions with the reason): the reason names the actual state.
  if (actor.dead) add("unable-to-act", "Morta: non può agire.", "Dead: it cannot act.");
  else if (actor.hp <= 0)
    add(
      "unable-to-act",
      "A 0 punti ferita non puoi agire: prima i tiri salvezza contro la morte o una cura.",
      "At 0 hit points you cannot act: death saving throws or healing first.",
    );
  else if (incapacitated(actor))
    add(
      "unable-to-act",
      "Incapacitata: niente azioni né reazioni.",
      "Incapacitated: no actions or reactions.",
    );
  // C10 (PG-79; SRD 5.2.1 Mounted Combat, EN 15–16 / IT 17): a controlled mount acts on its
  // rider's turn and has only three action options, Dash, Disengage and Dodge; the others
  // are greyed with this reason before any click (TV-74). An independent mount is unchanged.
  const mount = mountControlOf(state, actorId);
  if (mount?.controlled && !MOUNT_ACTIONS.has(action.id))
    add(
      "mount-controlled",
      "Cavalcatura controllata: nel turno di chi la cavalca può solo Scattare, Disimpegnarsi o Schivare (Combattimento in sella). Per agire da sola, rendila indipendente.",
      "Controlled mount: on its rider's turn it can only Dash, Disengage or Dodge (Mounted Combat). To act on its own, make it independent.",
    );
  // PG-69 (dnd5e and DDB roll attacks at any time): outside combat an action needs no
  // initiative; in combat it waits for its own turn.
  if (state.combat.active && !actsNow(state, actorId))
    add(
      "not-your-turn",
      "Puoi prepararla ora: si usa nel tuo turno.",
      "You can prepare it now: it is used on your turn.",
    );
  if (hasPendingForActor(state, actorId))
    add(
      "pending-attempt",
      "Completa le richieste del tentativo precedente.",
      "Complete the previous attempt requests.",
    );
  reasons.push(...validateSceneGeometry(scene));
  if (selection.geometryKey && selection.geometryKey !== geometryKey(scene))
    add(
      "stale-geometry",
      "La scena è cambiata: aggiorna l’anteprima.",
      "Scene geometry changed: refresh the preview.",
    );
  if (action.spell && profileFor(actor).componentsAvailable === false)
    add(
      "components-unavailable",
      "Le componenti richieste non sono disponibili.",
      "Required components are unavailable.",
    );
  if (
    action.spell &&
    (!profileFor(actor).spellcastingAbility ||
      !Number.isFinite(actor.abilities?.[profileFor(actor).spellcastingAbility]))
  )
    add(
      "casting-data-missing",
      "Manca la caratteristica di lancio verificata.",
      "Verified spellcasting ability is missing.",
    );
  const profile = profileFor(actor);
  if (action.id === "melee-attack" && !isValidMeleeProfile(profile.meleeAttack))
    add(
      "invalid-melee-profile",
      "Il profilo in mischia richiede dati validi.",
      "The melee profile requires valid data.",
    );
  const requiresProficiency =
    action.spell ||
    (action.id === "quarterstaff" && profile.weaponProficiencies?.includes("quarterstaff"));
  if (
    (action.id === "quarterstaff" && !Number.isFinite(actor.abilities?.str)) ||
    (requiresProficiency &&
      (!Number.isFinite(profile.proficiencyBonus) || profile.proficiencyBonus < 0))
  )
    add(
      "offensive-data-missing",
      "Mancano caratteristica o competenza valide per il tiro.",
      "Valid offensive ability or proficiency data is missing.",
    );
  if (action.cost.slotLevel) {
    const level = selection.slotLevel ?? 1;
    const pool = resource(actor, level);
    result.cost.slotLevel = level;
    if (!Number.isInteger(level) || level < 1 || level > 9 || !pool)
      add(
        "slot-level-unavailable",
        "Questo livello di slot non è configurato sulla scheda.",
        "This slot level is not configured on the sheet.",
      );
    else if (!Number.isInteger(pool.used) || pool.used < 0)
      add(
        "slot-state-unknown",
        "Registra gli slot già spesi sulla scheda prima di usarli.",
        "Record spent spell slots on the sheet before using them.",
      );
    else if (pool.used >= pool.max)
      add(
        "no-slot",
        "Nessuno slot disponibile del livello scelto.",
        "No slot remains at the selected level.",
      );
    if (state.combat.active && actor.lastSlotTurn === turnKey(state))
      add(
        "slot-used-this-turn",
        "Hai già speso uno slot per lanciare in questo turno.",
        "You already spent a spell slot to cast on this turn.",
      );
    if (action.id === "burning-hands") result.action.dice = [{ count: 2 + level, sides: 6 }];
    if (action.id === "magic-missile") {
      result.action.dice = [{ count: 2 + level, sides: 4 }];
      result.action.dartCount = 2 + level;
    }
  }
  if (!["normal", "advantage", "disadvantage"].includes(selection.rollMode ?? "normal"))
    add("invalid-roll-mode", "Modalità del tiro non valida.", "Invalid roll mode.");
  if (action.id === "quarterstaff") {
    const hands = selection.hands ?? 1;
    if (![1, 2].includes(hands))
      add("invalid-hands", "Scegli una o due mani.", "Choose one or two hands.");
    result.action.dice = [{ count: 1, sides: hands === 2 ? 8 : 6 }];
  } else if (action.versatileDice) {
    // BI-24: a Versatile inventory weapon (SRD 5.2.1 weapon properties) with two hands.
    const hands = selection.hands ?? 1;
    if (![1, 2].includes(hands))
      add("invalid-hands", "Scegli una o due mani.", "Choose one or two hands.");
    result.action.dice = [copy(hands === 2 ? action.versatileDice : action.dice[0])];
  }
  // PG-47: the riders this attack will roll with (Bless +1d4, Bane −1d4), for the detail.
  if (action.kind === "attack") {
    const riders = ridersFor(state, actorId, "attack");
    if (riders.length) result.riders = riders;
  }
  for (const provider of inventoryActionHooks)
    for (const reason of provider.preview?.(state, actor, action, selection) ?? [])
      add(reason.code, reason.it, reason.en);
  let targetIds = [];
  if (action.targetMode === "single") {
    targetIds = selection.targetIds ?? [];
    if (targetIds.length !== 1) add("choose-target", "Scegli un bersaglio.", "Choose one target.");
  }
  if (action.targetMode === "multiple") {
    const allocations = selection.allocations ?? [];
    const required = result.action.dartCount ?? 3;
    if (
      !Array.isArray(allocations) ||
      allocations.some((entry) => !Number.isInteger(entry.count) || entry.count < 1) ||
      allocations.reduce((sum, entry) => sum + entry.count, 0) !== required
    )
      add(
        "assign-darts",
        "Assegna tutti i dardi prima del lancio.",
        "Assign every dart before casting.",
      );
    targetIds = [...new Set(allocations.map((entry) => entry.actorId))];
  }
  if (action.targetMode === "area") {
    result.geometry = coneGeometry(state, actorId, selection.point);
    if (!result.geometry)
      add(
        "choose-direction",
        "Punta una direzione sulla mappa.",
        "Point at a direction on the map.",
      );
    else
      targetIds = scene.tokens
        .filter(
          (token) =>
            token.actorId !== actorId &&
            coneContains(result.geometry, token) &&
            hasLineOfEffect(scene, origin, token, { role }),
        )
        .map((token) => token.actorId);
  }
  if (action.targetMode === "destination") {
    if (
      !selection.point ||
      !Number.isFinite(selection.point.x) ||
      !Number.isFinite(selection.point.y)
    )
      add(
        "choose-destination",
        "Scegli dove terminare lo Scatto.",
        "Choose where to finish the Dash.",
      );
    else {
      const ordinary = previewMovement(state, actorId, selection.point, {
        waypoints: selection.waypoints,
        role,
      });
      result.effectiveDash = state.combat.active && ordinary.limited;
      result.cost.action = result.effectiveDash ? 1 : 0;
      if (result.effectiveDash) {
        const previewState = copy(state);
        previewState.actors[actorId].movement += Math.max(
          0,
          getEffectiveSpeed(state.actors[actorId]),
        );
        result.movement = previewMovement(previewState, actorId, selection.point, {
          waypoints: selection.waypoints,
          role,
        });
      } else result.movement = ordinary;
      reasons.push(...result.movement.reasons);
      if (result.movement.distance < 0.01)
        add(
          "choose-destination",
          "Scegli una destinazione diversa dalla posizione attuale.",
          "Choose a destination different from your current position.",
        );
    }
  }
  for (const targetId of [...new Set(targetIds)]) {
    const target = state.actors[targetId],
      token = tokenFor(state, targetId);
    if (!target || !token || !visible(state, targetId, role)) {
      if (action.targetMode !== "area")
        add(
          "target-unavailable",
          "Bersaglio non disponibile nella scena.",
          "Target unavailable in this scene.",
        );
      continue;
    }
    const summary = targetSummary(state, targetId, origin);
    result.targets.push(summary);
    if (!defensiveDataAvailable(target, action))
      add(
        "resolution-data-missing",
        "Mancano dati per risolvere il bersaglio: serve il DM.",
        "Target resolution data is missing: the DM must resolve it.",
      );
    const needsApproach =
      action.attackType === "melee" &&
      (summary.distanceMeters > action.rangeMeters + 0.001 ||
        !hasLineOfEffect(scene, origin, token, { role }) ||
        selection.waypoints?.length > 0);
    if (needsApproach) {
      const crawling = hasCondition(actor, "prone");
      const points = findApproachPath(
        scene,
        origin,
        token,
        (action.rangeMeters / scene.metersPerCell) * scene.gridSize,
        { role, waypoints: selection.waypoints ?? [], crawling },
      );
      const movement =
        points &&
        tracePath(scene, origin, points, {
          role,
          budget: state.combat.active ? Math.max(0, actor.movement) : Infinity,
          crawling,
        });
      result.approach = {
        required: true,
        movement,
        available: !!movement && !movement.blocked && !movement.limited,
      };
      const speed = getEffectiveSpeed(state.actors[actorId]);
      if (!Number.isFinite(speed) || speed <= 0 || !Number.isFinite(actor.movement))
        result.approach.available = false;
      if (!result.approach.available)
        add(
          "approach-unavailable",
          "Non puoi raggiungere una posizione d’attacco con questo percorso e movimento: nessuno spostamento verrà eseguito.",
          "You cannot reach an attacking position with this path and movement: no partial move will execute.",
        );
    } else if (action.targetMode !== "area") {
      // B40: a two-range weapon reaches its long range (with Disadvantage, see rollReasonsFor).
      if (summary.distanceMeters > (action.longRangeMeters ?? action.rangeMeters) + 0.001)
        add(
          "out-of-range",
          "Bersaglio fuori portata: puoi prima muoverti.",
          "Target out of range: you can move first.",
        );
      if (!hasLineOfEffect(scene, origin, token, { role }))
        add(
          "effect-blocked",
          "Un ostacolo impedisce di raggiungere direttamente il bersaglio.",
          "An obstacle blocks a direct effect on the target.",
        );
    }
    if (action.id === "magic-missile" && !canSee(state, actorId, targetId, role))
      add(
        "target-not-seen",
        "Dardo incantato richiede un bersaglio che puoi vedere.",
        "Magic Missile requires a target you can see.",
      );
  }
  if (action.kind === "attack" && result.targets.length === 1) {
    const modeState = result.approach?.available ? copy(state) : state;
    if (result.approach?.available)
      Object.assign(tokenFor(modeState, actorId), result.approach.movement.end);
    const target = state.actors[result.targets[0].actorId];
    const rules = conditionRulesFor(modeState, actor, target, role, selection);
    result.rollReasons = rollReasonsFor(modeState, actor, action, selection, target, role, rules);
    result.rollMode = rollModeFor(modeState, actor, action, selection, target, role, rules);
    // B46 (additive): providers' rows (cover, chance to hit) join the reasons shown in the
    // detail; Total Cover refuses the target (SRD "Cover": it can't be targeted directly).
    const extra = attackModifiers(modeState, actorId, target.id, action, {
      role,
      rollMode: result.rollMode,
      modifier: rules.modifier,
    });
    result.rollReasons.push(...extra.map((row) => copy(row)));
    if (extra.some((row) => row.blocksTargeting))
      add(
        "total-cover",
        "Copertura totale: il bersaglio non può essere preso di mira direttamente.",
        "Total Cover: the target can't be targeted directly.",
      );
    // Reasons from applications this viewer cannot see stay anonymous.
    result.conditionRules = projectConditionReasons(
      rules,
      { attacker: state.actors[actorId], target },
      role,
    );
    // An unknown origin needs the controller's explicit answer, never a silent normal roll.
    const hidden = new Set([
      ...hiddenConditionIds(state.actors[actorId], role),
      ...hiddenConditionIds(target, role),
    ]);
    result.conditionFacts = rules.unresolved
      .filter((u) => CONDITION_FACTS.includes(u.code) && !hidden.has(u.conditionId))
      .map((u) => ({ code: u.code, conditionId: u.conditionId, it: u.it, en: u.en }));
    if (result.conditionFacts.length)
      add(
        "condition-fact",
        "Rispondi alla domanda sulla condizione: l’origine non è registrata.",
        "Answer the condition question: its origin is not recorded.",
      );
    if (!rules.canAttack)
      add(
        "charmed-target",
        "Una creatura Affascinata non può attaccare chi l’ha affascinata.",
        "A Charmed creature cannot attack its charmer.",
      );
  }
  if (state.combat.active && result.cost.action && !actor.action)
    add("action-spent", "Azione già spesa.", "Action already spent.");
  result.action.cost = copy(result.cost);
  result.available = reasons.length === 0;
  return result;
}
// TV-74 (BG3 greyed actions with the reason on hover): why an action cannot be used now,
// before any target, area or destination is chosen; null when only choices are missing.
// A `soft` reason (off turn; Dash with the action spent) is a hint: the action still opens.
const CHOICE_CODES = new Set([
  "choose-target",
  "assign-darts",
  "choose-direction",
  "choose-destination",
  "stale-geometry",
  "invalid-roll-mode",
  "invalid-hands",
  "target-unavailable",
  "out-of-range",
  "effect-blocked",
  "target-not-seen",
  "total-cover",
  "condition-fact",
  "charmed-target",
  "approach-unavailable",
  "resolution-data-missing",
]);
export function actionBlockReason(state, actorId, actionId, role = "player") {
  const preview = previewAction(state, actorId, actionId, {}, role);
  // Dash with the action spent is still a move within the remaining movement (its
  // destination decides the cost), so a spent action only makes it a hint there.
  const soft = new Set(["not-your-turn"]);
  if (preview.action?.targetMode === "destination") soft.add("action-spent");
  const reasons = preview.reasons.filter(
    (reason) => reason?.code && !CHOICE_CODES.has(reason.code),
  );
  const hard = reasons.find((reason) => !soft.has(reason.code));
  return hard ?? (reasons[0] ? { ...reasons[0], soft: true } : null);
}
export function hasPendingForActor(state, actorId) {
  return hasBlockingConsequences(state, actorId);
}

function requestFor(attempt, actor, kind, dice, modifier = 0, extra = {}) {
  const id = attempt.id + "-" + kind + "-" + actor.id + "-" + attempt.requests.length;
  const request = {
    id,
    kind,
    actorId: actor.id,
    owner: actor.owner,
    personal: actor.visibility === "private",
    dice: copy(dice),
    modifier,
    rollMode: "normal",
    status: "pending",
    ...extra,
  };
  return Object.assign(request, knownEvidence(attempt.rollEvidence?.[id], request));
}
// PG-47 (Beyond20 per-character toggles, AboveVTT buff menu; the dice tray's maths, P3): the
// active riders of a roll kind (Bless +1d4 and Bane −1d4 on attack rolls and saving throws)
// are rolled as their own dice after the d20s and are part of the total; a flat rider joins
// the modifier under its own name. Read from the sheet area (sheet-plus-domain activeRiders).
const RIDER_SIDES = [4, 6, 8, 10, 12];
function ridersFor(state, actorId, kind) {
  const list =
    typeof sheetPlus?.activeRiders === "function"
      ? guarded(() => sheetPlus.activeRiders(state, actorId, kind), [])
      : [];
  return (Array.isArray(list) ? list : [])
    .map((rider) => ({
      id: String(rider?.id ?? ""),
      name: copy(rider?.name ?? text("", "")),
      sign: rider?.sign < 0 ? -1 : 1,
      dice:
        Number.isInteger(rider?.dice?.count) &&
        rider.dice.count >= 1 &&
        rider.dice.count <= 4 &&
        RIDER_SIDES.includes(rider.dice.sides)
          ? { count: rider.dice.count, sides: rider.dice.sides }
          : null,
      flat: Number.isInteger(rider?.flat) ? rider.flat : 0,
      source: rider?.source ? copy(rider.source) : null,
    }))
    .filter((rider) => rider.id && (rider.dice || rider.flat));
}
/** The fields of a D20 request with its riders: dice (d20s first), modifier and sources. */
function d20Fields(riders, rollMode, modifier, sources = []) {
  const rolled = riders.filter((rider) => rider.dice);
  const flat = riders.filter((rider) => rider.flat);
  return {
    dice: [
      { count: rollMode === "normal" ? 1 : 2, sides: 20 },
      ...rolled.map((rider) => ({ ...rider.dice, label: copy(rider.name) })),
    ],
    modifier: Number.isFinite(modifier)
      ? flat.reduce((sum, rider) => sum + rider.sign * rider.flat, modifier)
      : modifier,
    modifierSources: [
      ...copy(sources ?? []),
      ...flat.map((rider) => ({
        kind: "rider",
        label: copy(rider.name),
        value: rider.sign * rider.flat,
        ...(rider.source ? { source: copy(rider.source) } : {}),
      })),
    ],
    ...(rolled.length ? { riders: copy(rolled) } : {}),
  };
}
const D20_KINDS = ["attack", "save", "check", "concentration", "death-save", "medicine"];
/**
 * The natural d20, each rider's faces and the total of a request's faces (PG-47): the d20s
 * come first (two with Advantage or Disadvantage), then each rider's dice in order. Other
 * areas that recompute a request (a reroll) use the same reading.
 */
export function requestScore(request, faces) {
  const riders = Array.isArray(request?.riders) ? request.riders : [];
  const main = riders.length ? faces.slice(0, request.dice[0].count) : faces;
  const natural =
    request.rollMode === "advantage"
      ? Math.max(...main)
      : request.rollMode === "disadvantage"
        ? Math.min(...main)
        : D20_KINDS.includes(request.kind) || request.kind === "stable-recovery"
          ? main[0]
          : null;
  let offset = main.length;
  const riderRolls = riders.map((rider) => {
    const values = faces.slice(offset, offset + rider.dice.count);
    offset += rider.dice.count;
    return {
      id: rider.id,
      name: copy(rider.name),
      sign: rider.sign,
      faces: values,
      total: rider.sign * values.reduce((sum, face) => sum + face, 0),
    };
  });
  const base = natural ?? faces.reduce((sum, face) => sum + face, 0);
  return {
    natural,
    riderRolls,
    total: base + riderRolls.reduce((sum, roll) => sum + roll.total, 0) + request.modifier,
  };
}
const dieSides = (dice) =>
  dice.flatMap((group) => Array.from({ length: group.count }, () => group.sides));
const facesFit = (values, dice) => {
  const sides = dieSides(dice);
  return (
    Array.isArray(values) &&
    values.length === sides.length &&
    values.every((face, index) => Number.isInteger(face) && face >= 1 && face <= sides[index])
  );
};
const sameDice = (first, second) =>
  JSON.stringify(first.map((g) => [g.count, g.sides])) ===
  JSON.stringify(second.map((g) => [g.count, g.sides]));
/**
 * Maps faces accepted before an Undo onto a request that may have been recreated.
 * An identical dice profile reuses every face. A recomputed profile (for example
 * normal versus critical damage) keeps, per die group with the same sides, the
 * first faces in their original order; the rest are superseded, never chosen.
 * Faces accepted for a personal sheet keep their personal provenance.
 */
export function knownEvidence(evidence, request) {
  const values = evidence?.acceptedValues;
  if (!Array.isArray(values)) return {};
  const patch = {};
  if (evidence.mode) patch.mode = evidence.mode;
  if (evidence.reusedFrom) patch.reusedFrom = evidence.reusedFrom;
  if (evidence.personal === true) {
    patch.personal = true;
    patch.owner = evidence.owner ?? request.owner;
  }
  const oldDice = Array.isArray(evidence.dice) ? evidence.dice : null;
  if (facesFit(values, request.dice) && (!oldDice || sameDice(oldDice, request.dice)))
    return { ...patch, acceptedValues: copy(values) };
  const known = [],
    kept = [],
    superseded = [];
  if (oldDice && facesFit(values, oldDice)) {
    let offset = 0;
    const oldGroups = oldDice.map((group) => {
      const faces = values.slice(offset, offset + group.count);
      offset += group.count;
      return { sides: group.sides, faces };
    });
    request.dice.forEach((group, index) => {
      const old = oldGroups[index];
      const reusable = old?.sides === group.sides ? old.faces.slice(0, group.count) : [];
      kept.push(...reusable);
      known.push(...reusable, ...Array(group.count - reusable.length).fill(null));
    });
    oldGroups.forEach((old, index) => {
      const group = request.dice[index];
      superseded.push(...(group?.sides === old.sides ? old.faces.slice(group.count) : old.faces));
    });
  } else superseded.push(...values);
  patch.recomputedFrom = {
    reason: "dice-profile-changed",
    dice: oldDice && copy(oldDice),
    values: copy(values),
    mode: evidence.mode ?? null,
    keptValues: kept,
    supersededValues: superseded,
  };
  if (kept.length) patch.knownValues = known;
  if (kept.length && !known.includes(null)) patch.acceptedValues = copy(known);
  return patch;
}
const retryKeyOf = (attempt) =>
  JSON.stringify([
    attempt.actorId,
    attempt.actionId,
    attempt.targets.map((target) => target.actorId).sort(),
    attempt.turnKey,
  ]);
/**
 * Evidence of an attempt that Undo withdrew entirely, remapped onto a retry with the
 * same retry key: accepted faces come back as known faces (`reusedFrom` names the old
 * request). The latest recorded face of each request wins, corrections included.
 * Faces are reused once: an accepted roll with the same key recorded after them (the
 * retry itself, applied and kept) means the next identical attempt rolls anew.
 */
function reversedEvidence(state, attempt) {
  const log = state.log ?? [];
  const reverted = new Set(
    log.filter((entry) => entry.kind === "correction").map((entry) => entry.revertsId),
  );
  const live = new Set((state.combatAttempts ?? []).map((entry) => entry.id));
  const matching = log.flatMap((entry) =>
    (entry.rolls ?? [])
      .filter(
        (roll) =>
          roll.source === "combat" &&
          roll.retryKey === attempt.retryKey &&
          roll.status !== "superseded" &&
          Array.isArray(roll.values) &&
          // Withdrawn faces a live attempt still holds are that attempt's own evidence.
          !(reverted.has(entry.id) && live.has(roll.attemptId)),
      )
      .map((roll) => ({ roll, reverted: reverted.has(entry.id) })),
  );
  if (!matching.at(-1)?.reverted) return null;
  const previous = matching.at(-1).roll.attemptId;
  const rolls = matching.filter((m) => m.reverted).map((m) => m.roll);
  const evidence = {};
  for (const roll of rolls.filter((entry) => entry.attemptId === previous))
    evidence[attempt.id + roll.requestId.slice(previous.length)] = {
      acceptedValues: copy(roll.values),
      dice: copy(roll.dice),
      mode: roll.mode ?? null,
      personal: roll.personal === true,
      owner: roll.owner,
      reusedFrom: roll.requestId,
    };
  return evidence;
}
function makeTarget(state, targetId, caster, action) {
  caster = getEffectiveActor(caster);
  const target = getEffectiveActor(state.actors[targetId]);
  const profile = profileFor(caster);
  const result = {
    actorId: target.id,
    name: trueNameOf(state, target.id),
    knownToPlayer: publicly(state, targetId),
  };
  if (action.kind === "attack") result.targetAC = target.ac;
  // B46 (additive): cover and other providers' AC bonuses, measured at resolution.
  if (action.kind === "attack") {
    const bonuses = attackModifiers(state, caster.id, target.id, action).filter(
      (row) => Number.isFinite(row.acBonus) && row.acBonus !== 0,
    );
    if (bonuses.length) {
      result.targetAC += bonuses.reduce((sum, row) => sum + row.acBonus, 0);
      result.acModifiers = copy(bonuses);
    }
  }
  if (action.kind === "area") {
    result.saveModifier = dexteritySaveModifier(target);
    result.saveDC =
      8 + profile.proficiencyBonus + mod(caster.abilities[profile.spellcastingAbility]);
  }
  return result;
}
// Who sees an attempt's dice (the dice tray's audiences, B34; Foundry roll modes).
export const ROLL_AUDIENCES = Object.freeze(["public", "gm", "blind", "self"]);
function selectionCopy(selection) {
  return {
    targetIds: copy(selection.targetIds ?? []),
    point: selection.point ? { x: selection.point.x, y: selection.point.y } : null,
    allocations: copy(selection.allocations ?? []),
    slotLevel: selection.slotLevel ?? 1,
    hands: selection.hands ?? 1,
    rollMode: selection.rollMode ?? "normal",
    waypoints: copy(selection.waypoints ?? []),
    geometryKey: selection.geometryKey ?? null,
    ...(selection.allowApproach === false ? { allowApproach: false } : {}),
    // Declared before the attack; applies only to a melee hit that would reach 0 HP.
    ...(selection.knockout === true ? { knockout: true } : {}),
    // TV-83 (dnd5e "Situational Bonus", BG3 "Add Bonus"): a declared flat bonus to hit.
    ...(Number.isInteger(selection.situationalBonus) &&
    selection.situationalBonus !== 0 &&
    Math.abs(selection.situationalBonus) <= 10
      ? { situationalBonus: selection.situationalBonus }
      : {}),
    // TV-89 (DDB right-click «Crit» and «Roll to», Foundry roll modes): the damage of this
    // attack declared a Critical Hit, with the reason the DM reads, and who sees the dice.
    ...(selection.forceCritical === true
      ? {
          forceCritical: true,
          criticalReason: String(selection.criticalReason ?? "")
            .trim()
            .slice(0, 120),
        }
      : {}),
    ...(ROLL_AUDIENCES.includes(selection.audience) && selection.audience !== "public"
      ? { audience: selection.audience }
      : {}),
    // Explicit answers when a condition's origin is unknown (see CONDITION_FACTS).
    ...(selection.conditionFacts && typeof selection.conditionFacts === "object"
      ? {
          conditionFacts: Object.fromEntries(
            Object.entries(selection.conditionFacts).filter(
              ([code, value]) => CONDITION_FACTS.includes(code) && typeof value === "boolean",
            ),
          ),
        }
      : {}),
  };
}
function validateAcceptedPath(state, preview, key) {
  const scene = sceneFor(state);
  if (key && key !== geometryKey(scene))
    reject(
      failure(
        "stale-geometry",
        "La scena è cambiata: aggiorna l’anteprima.",
        "Scene geometry changed: refresh the preview.",
      ),
    );
  const authoritative = tracePath(scene, preview.start, preview.path.slice(1), {
    budget: Infinity,
  });
  if (authoritative.blocked)
    reject(
      failure(
        "path-unavailable",
        "Il percorso non è disponibile. Modificalo o chiedi al DM.",
        "The path is not available. Change it or ask the DM.",
      ),
    );
}
function initializeAttack(state, attempt, action) {
  const actor = getEffectiveActor(state.actors[attempt.actorId]),
    profile = profileFor(actor),
    selection = attempt.selection;
  const target = state.actors[attempt.targets[0].actorId],
    actionId = action.id;
  const ability =
    actionId === "melee-attack"
      ? 0
      : actionId === "quarterstaff"
        ? mod(actor.abilities.str)
        : mod(actor.abilities[profile.spellcastingAbility]);
  const proficient =
    actionId !== "quarterstaff" || profile.weaponProficiencies?.includes("quarterstaff");
  const rules = conditionRulesFor(state, actor, target, undefined, selection);
  const bonus = Number.isInteger(selection.situationalBonus) ? selection.situationalBonus : 0;
  // BI-24 (FG Forge, dnd5e Enchant): the weapon item's own bonus (a forged +1) is added to the
  // attack and to the damage, named in both breakdowns.
  const itemBonus = (target) => (action.itemBonuses ?? []).filter((row) => row.target === target);
  const itemPart = (row) => ({
    kind: "item",
    label: copy(row.label),
    value: row.value,
    ...(row.source ? { source: copy(row.source) } : {}),
  });
  const attackModifier =
    (action.attackModifier ?? ability + (proficient ? (profile.proficiencyBonus ?? 0) : 0)) +
    rules.modifier +
    bonus +
    itemBonus("attack").reduce((sum, row) => sum + row.value, 0);
  if (bonus)
    rules.modifierSources = [
      ...(rules.modifierSources ?? []),
      { kind: "situational", label: text("Bonus aggiunto", "Added bonus"), value: bonus },
    ];
  if (itemBonus("attack").length)
    rules.modifierSources = [
      ...(rules.modifierSources ?? []),
      ...itemBonus("attack").map(itemPart),
    ];
  const rollReasons = rollReasonsFor(state, actor, action, selection, target, undefined, rules);
  const rollMode = rollModeFor(state, actor, action, selection, target, undefined, rules);
  attempt.attackType = action.attackType ?? null;
  if (action.onHitProneMaxSize) attempt.onHitProneMaxSize = action.onHitProneMaxSize;
  attempt.damageDice = copy(action.dice);
  attempt.fixedDamage = action.fixedDamage;
  attempt.damageModifier =
    (action.damageModifier ?? (actionId === "quarterstaff" ? mod(actor.abilities.str) : 0)) +
    itemBonus("damage").reduce((sum, row) => sum + row.value, 0);
  if (itemBonus("damage").length) attempt.damageSources = itemBonus("damage").map(itemPart);
  // A weapon's active mastery (DDB-041), for weapons the core builds from the inventory; an
  // area's own weapon action records it in its commit.
  if (action.mastery && action.itemId && !attempt.mastery)
    attempt.mastery = { property: action.mastery, itemId: action.itemId };
  const fields = d20Fields(
    ridersFor(state, actor.id, "attack"),
    rollMode,
    attackModifier,
    conditionRequestFields(rules).modifierSources,
  );
  attempt.requests.push(
    requestFor(attempt, actor, "attack", fields.dice, fields.modifier, {
      rollMode,
      targetId: target.id,
      rollReasons,
      ...conditionRequestFields(rules),
      modifierSources: fields.modifierSources,
      ...(fields.riders ? { riders: fields.riders } : {}),
    }),
  );
  attempt.outcomes.push({
    actorId: target.id,
    name: trueNameOf(state, target.id) || target.name,
    status: "pending",
  });
  // Attacking with an inventory weapon is evidence that it is in hand, so a later drop
  // to 0 HP drops it instead of guessing (SRD Unconscious, EN 191 / IT 212).
  const canonical = state.actors[attempt.actorId];
  if (action.itemId && canonical?.inventory?.some((item) => item.id === action.itemId)) {
    const held = Array.isArray(canonical.heldItemIds) ? canonical.heldItemIds : [];
    if (!held.includes(action.itemId)) canonical.heldItemIds = [...held, action.itemId];
  }
}
// Visible reasons, modifier sources and the near-hit critical travel with the request.
function conditionRequestFields(rules) {
  return {
    modifierSources: copy(rules.modifierSources),
    conditionReasons: {
      advantage: copy(rules.advantage),
      disadvantage: copy(rules.disadvantage),
      unresolved: copy(rules.unresolved),
    },
    criticalOnHit: rules.criticalOnHit === true,
  };
}
function activateApproach(state, attempt, physicalThrow = false) {
  const approach = attempt.approach;
  if (!approach || !["moving", "awaiting-throw"].includes(approach.status)) return attempt;
  const check = copy(state);
  check.combatAttempts = check.combatAttempts.filter((a) => a.id !== attempt.id);
  check.movements = (check.movements ?? []).filter((m) => m.id !== approach.movementId);
  const selection = {
    ...attempt.selection,
    waypoints: [],
    geometryKey: geometryKey(sceneFor(state)),
  };
  const preview = previewAction(
    check,
    attempt.actorId,
    attempt.actionId,
    selection,
    attempt.acceptedBy,
  );
  const target = tokenFor(state, attempt.targets[0].actorId),
    origin = tokenFor(state, attempt.actorId);
  const reachable =
    preview.available &&
    !preview.approach?.required &&
    hasLineOfEffect(sceneFor(state), origin, target);
  if (!reachable || turnKey(state) !== attempt.turnKey) {
    approach.status = "blocked";
    approach.reason = text(
      "La situazione è cambiata: annulla il seguito e scegli una nuova mossa.",
      "The situation changed: cancel the follow-up and choose a new move.",
    );
    return attempt;
  }
  if (attempt.mode === "physical" && !physicalThrow) {
    approach.status = "awaiting-throw";
    return attempt;
  }
  attempt.targets = preview.targets.map((entry) =>
    makeTarget(state, entry.actorId, state.actors[attempt.actorId], preview.action),
  );
  initializeAttack(state, attempt, preview.action);
  if (state.combat.active && attempt.cost.action) state.actors[attempt.actorId].action = false;
  approach.status = "attacking";
  observeRestEvent(state, {
    eventId: attempt.id + ":attack",
    actorIds: [attempt.actorId],
    cause: "activity",
  });
  return attempt;
}
export function confirmApproachAttack(state, id, role) {
  const attempt = (state.combatAttempts ?? []).find((a) => a.id === id);
  if (!attempt?.approach || !canControl(state.actors[attempt.actorId], role, state))
    throw Error("Cannot control this approach");
  if (["attacking", "resolved"].includes(attempt.approach.status)) return attempt;
  if (attempt.approach.status !== "awaiting-throw")
    throw Error("The approach is not ready for an attack");
  return activateApproach(state, attempt, true);
}
export function cancelApproachAttack(state, id, role) {
  const attempt = (state.combatAttempts ?? []).find((a) => a.id === id);
  if (!attempt?.approach || !canControl(state.actors[attempt.actorId], role, state))
    throw Error("Cannot control this approach");
  if (attempt.approach.status === "cancelled") return attempt;
  if (!["awaiting-throw", "blocked"].includes(attempt.approach.status))
    throw Error("Resolve the movement or attack before cancelling");
  attempt.approach.status = "cancelled";
  attempt.status = "resolved";
  return attempt;
}
export { cancelApproachAttack as cancelApproach };
export function projectApproaches(state, role) {
  return (state.combatAttempts ?? [])
    .filter((a) => a.approach && canControl(state.actors[a.actorId], role, state))
    .map((a) => ({
      id: a.id,
      actorId: a.actorId,
      actorName: a.actorName,
      actionId: a.actionId,
      actionName: copy(a.actionName),
      status:
        a.approach.status === "attacking" && a.status === "resolved"
          ? "resolved"
          : a.approach.status,
      movementId: a.approach.movementId,
      reason: a.approach.reason,
      canRespond: ["awaiting-throw", "blocked"].includes(a.approach.status),
    }));
}
export function beginAttempt(state, payload, role) {
  const { id, actorId, actionId } = payload;
  const actor = state.actors[actorId];
  if (!actor || !canControl(actor, role, state))
    reject(
      failure(
        "not-controller",
        "Non controlli questa creatura.",
        "You do not control this creature.",
      ),
    );
  if (typeof id !== "string" || !id.trim())
    reject(
      failure(
        "missing-attempt-id",
        "Identità del tentativo mancante.",
        "Attempt identity is missing.",
      ),
    );
  const selection = selectionCopy(payload.selection ?? {});
  const mode = payload.mode ?? "digital";
  if (!["physical", "digital"].includes(mode))
    reject(
      failure(
        "invalid-dice-mode",
        "Scegli dadi fisici o digitali.",
        "Choose physical or digital dice.",
      ),
    );
  const fingerprint = JSON.stringify({ actorId, actionId, selection, mode });
  const existing = (state.combatAttempts ?? []).find((attempt) => attempt.id === id);
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      reject(
        failure(
          "attempt-conflict",
          "Questo tentativo esiste con scelte diverse. Riapri il risultato.",
          "This attempt already exists with different choices. Reopen its result.",
        ),
      );
    return existing;
  }
  const preview = previewAction(state, actorId, actionId, selection, role);
  if (selection.allowApproach === false && preview.approach?.required)
    reject(
      failure(
        "approach-not-authorized",
        "Il bersaglio richiede ora un avvicinamento: rivaluta la mossa prima di lanciare. Nessuna risorsa è stata consumata.",
        "The target now requires an approach: reassess the move before rolling. No resource was consumed.",
      ),
    );
  if (!preview.available) reject(preview.reasons[0]);
  if (preview.approach?.required)
    validateAcceptedPath(state, preview.approach.movement, selection.geometryKey);
  if (preview.movement) validateAcceptedPath(state, preview.movement, selection.geometryKey);
  const action = preview.action,
    profile = profileFor(actor);
  let targetIds = preview.targets.map((target) => target.actorId);
  if (action.targetMode === "area")
    targetIds = sceneFor(state)
      .tokens.filter(
        (token) =>
          token.actorId !== actorId &&
          coneContains(preview.geometry, token) &&
          hasLineOfEffect(sceneFor(state), tokenFor(state, actorId), token),
      )
      .map((token) => token.actorId);
  for (const targetId of targetIds) {
    const target = state.actors[targetId];
    if (!defensiveDataAvailable(target, action))
      reject(
        failure(
          "resolution-data-missing",
          "Mancano dati per risolvere: serve il DM.",
          "Resolution data is missing: the DM must resolve it.",
        ),
      );
    if (
      !preview.approach?.required &&
      action.targetMode !== "area" &&
      (!hasLineOfEffect(sceneFor(state), tokenFor(state, actorId), tokenFor(state, targetId)) ||
        (action.id === "magic-missile" && !canSee(state, actorId, targetId)))
    )
      reject(
        failure(
          "target-unavailable",
          "Questo bersaglio non può essere raggiunto. Chiedi al DM.",
          "This target cannot be reached. Ask the DM.",
        ),
      );
  }
  const attempt = {
    id,
    actorId,
    actorName: trueNameOf(state, actor.id),
    actionId,
    actionName: copy(action.name),
    selection,
    mode,
    fingerprint,
    status: "pending",
    requests: [],
    outcomes: [],
    cost: copy(preview.cost),
    source: copy(action.source),
    damageType: action.damageType ?? null,
    targets: targetIds.map((targetId) => makeTarget(state, targetId, actor, action)),
    turnKey: turnKey(state),
    geometry: preview.geometry ? copy(preview.geometry) : null,
    kind: action.kind,
    acceptedBy: role,
    // TV-89: who sees this attempt's dice (default: everyone).
    ...(selection.audience ? { audience: selection.audience } : {}),
    // B20 campaign automation level: "assisted" keeps damage on the card until Apply.
    ...(payload.applyMode === "assisted" ? { applyMode: "assisted" } : {}),
  };
  // Undo never grants a free reroll: retrying the same action on the same targets in the
  // same turn reuses the faces of the withdrawn attempt, digital or physical alike.
  attempt.retryKey = retryKeyOf(attempt);
  const reused = reversedEvidence(state, attempt);
  if (reused) attempt.rollEvidence = reused;
  if (preview.approach?.required) {
    const movementId = id + "-approach";
    attempt.approach = { status: "moving", movementId };
    (state.combatAttempts ||= []).push(attempt);
    const movement = createMovement(
      state,
      {
        id: movementId,
        actorId,
        point: preview.approach.movement.end,
        waypoints: selection.waypoints,
      },
      preview.approach.movement,
      false,
      id,
    );
    advanceMovement(state, movement);
    return attempt;
  }
  if (action.kind === "attack") {
    initializeAttack(state, attempt, action);
  } else if (action.kind === "area") {
    attempt.requests.push(requestFor(attempt, actor, "damage", action.dice));
    for (const target of attempt.targets) {
      const subject = state.actors[target.actorId];
      const save = conditionSaveRules(subject, "dex");
      if (save.autoFail) {
        // An automatic failure has a reason, never an invented die.
        attempt.outcomes.push({
          actorId: subject.id,
          name: trueNameOf(state, subject.id),
          status: "pending",
          autoFailSave: true,
          autoFailReasons: copy(save.autoFailReasons),
        });
        continue;
      }
      // BI-18: homebrew Advantage/Disadvantage on this creature's Dexterity saves.
      const homebrew = homebrewModes(state, subject.id, { kind: "save", ability: "dex" });
      const rollMode = modeFrom(
        dodging(subject) ? "advantage" : "normal",
        save.disadvantage.length ? "disadvantage" : "normal",
        homebrew.advantage.length ? "advantage" : "normal",
        homebrew.disadvantage.length ? "disadvantage" : "normal",
      );
      // PG-47: the creature's save riders (Bless, Bane) roll with its save.
      const fields = d20Fields(
        ridersFor(state, subject.id, "save"),
        rollMode,
        target.saveModifier + save.modifier,
        save.modifierSources,
      );
      attempt.requests.push(
        requestFor(attempt, subject, "save", fields.dice, fields.modifier, {
          targetId: subject.id,
          rollMode,
          modifierSources: fields.modifierSources,
          ...(fields.riders ? { riders: fields.riders } : {}),
          conditionReasons: {
            advantage: copy(homebrew.advantage),
            disadvantage: [...copy(save.disadvantage), ...copy(homebrew.disadvantage)],
          },
        }),
      );
      attempt.outcomes.push({
        actorId: subject.id,
        name: trueNameOf(state, subject.id),
        status: "pending",
      });
    }
  } else if (action.kind === "multi") {
    attempt.dartAssignments = selection.allocations.flatMap((entry) =>
      Array.from({ length: entry.count }, () => entry.actorId),
    );
    attempt.requests.push(
      requestFor(
        attempt,
        actor,
        "damage",
        [{ count: attempt.dartAssignments.length, sides: 4 }],
        attempt.dartAssignments.length,
      ),
    );
    for (const target of attempt.targets)
      attempt.outcomes.push({ actorId: target.actorId, name: target.name, status: "pending" });
  } else {
    attempt.status = "resolved";
    if (actionId === "dash") {
      attempt.movement = copy(preview.movement);
      attempt.effectiveDash = preview.effectiveDash;
      if (!attempt.effectiveDash) attempt.actionName = text("Movimento", "Movement");
    } else
      attempt.effect = {
        type: actionId,
        expires: actionId === "dodge" ? "start" : "end",
        actorId,
        source: copy(action.source),
      };
  }
  // Commit only after all selections, permissions and required data have validated.
  if (state.combat.active && attempt.cost.action) actor.action = false;
  for (const provider of inventoryActionHooks) provider.commit?.(state, attempt, action);
  if (attempt.cost.slotLevel) {
    spendSpellSlot(actor, attempt.cost.slotLevel);
    if (state.combat.active) actor.lastSlotTurn = turnKey(state);
  }
  if (actionId === "dash") {
    if (attempt.effectiveDash) grantDash(actor);
    // TV-64 (BG3 status icon with its duration): Dash stays visible until this turn ends.
    if (attempt.effectiveDash && state.combat.active) {
      actor.combatEffects = (actor.combatEffects ?? []).filter((effect) => effect.type !== "dash");
      actor.combatEffects.push({
        type: "dash",
        expires: "end",
        actorId,
        source: copy(action.source),
        attemptId: id,
      });
    }
    attempt.status = "pending";
  } else if (attempt.effect) {
    actor.combatEffects ??= [];
    actor.combatEffects = actor.combatEffects.filter((effect) => effect.type !== actionId);
    actor.combatEffects.push({ ...copy(attempt.effect), attemptId: id });
    attempt.outcomes.push({
      actorId,
      name: trueNameOf(state, actorId),
      status: "applied",
      effect: actionId,
    });
  }
  state.combatAttempts ??= [];
  state.combatAttempts.push(attempt);
  observeRestEvent(state, {
    eventId: attempt.id + ":activity",
    actorIds: [actorId],
    cause: attempt.cost.slotLevel ? "leveled-spell" : "activity",
  });
  if (actionId === "dash") {
    const movement = createMovement(
      state,
      { id: id + "-movement", actorId, point: selection.point, waypoints: selection.waypoints },
      preview.movement,
      attempt.effectiveDash,
      id,
    );
    advanceMovement(state, movement);
  }
  if (actionId === "magic-missile") {
    for (const outcome of attempt.outcomes) offerShield(state, attempt, outcome);
    completeAvailableOutcomes(state, attempt);
  }
  return attempt;
}
function checkedFaces(request, values) {
  const sides = request.dice.flatMap((group) =>
    Array.from({ length: group.count }, () => group.sides),
  );
  if (
    !Array.isArray(values) ||
    values.length !== sides.length ||
    values.some((face, index) => !Number.isInteger(face) || face < 1 || face > sides[index])
  )
    reject(
      failure(
        "invalid-dice",
        "Inserisci tutte le facce naturali entro i limiti dei dadi.",
        "Enter every natural die face within its die limits.",
      ),
    );
  return [...values];
}
const SIZES = ["tiny", "small", "medium", "large", "huge", "gargantuan"];
// B33 damage tray (additive seam): one registered adjuster applies the target's damage
// defenses (SRD 5.2.1 EN 17 / IT 19: multipliers, then Resistance, then Vulnerability;
// Immunity) to damage that carries no explicit tray decision (`extra.adjustment`). It
// returns `{amount, adjustment, darts?}` or null. Without an adjuster damage applies as
// rolled, exactly as before.
let damageAdjuster = null;
export function adjustDamageWith(adjuster) {
  damageAdjuster = typeof adjuster === "function" ? adjuster : null;
  return () => {
    if (damageAdjuster === adjuster) damageAdjuster = null;
  };
}
// HP, temporary HP, zero-HP policy and death-save failures change once, in the vitality
// domain; combat only records the breakdown and runs the returned follow-ups.
function applyDamage(state, attempt, outcome, damage, extra = {}) {
  if (outcome.status !== "pending") return;
  // Assisted automation (B20 campaign rule; dnd5e chat card with Apply, FVT-138): damage
  // and its consequences wait, status "ready", until applyReadyOutcome. The pending
  // application stays on the attempt, never in the projected outcome.
  if (attempt.applyMode === "assisted" && !outcome.applyApproved && damage > 0) {
    (attempt.pendingApplications ??= {})[outcome.actorId] = { damage, extra: copy(extra) };
    Object.assign(outcome, {
      status: "ready",
      damage: Math.max(0, damage),
      ...Object.fromEntries(
        ["hit", "critical", "saveSuccess", "darts", "fixedDamage"]
          .filter((key) => extra[key] !== undefined)
          .map((key) => [key, copy(extra[key])]),
      ),
    });
    return;
  }
  const actor = state.actors[outcome.actorId];
  if (!actor)
    reject(
      failure(
        "missing-target",
        "Il bersaglio non è più disponibile: serve una correzione esplicita.",
        "The target is no longer available: an explicit correction is required.",
      ),
    );
  if (damageAdjuster && damage > 0 && extra.adjustment === undefined) {
    const adjusted = damageAdjuster(state, attempt, outcome, damage, extra);
    if (adjusted?.adjustment && Number.isInteger(adjusted.amount) && adjusted.amount >= 0) {
      extra = {
        ...extra,
        adjustment: copy(adjusted.adjustment),
        ...(adjusted.darts ? { darts: copy(adjusted.darts) } : {}),
      };
      damage = adjusted.amount;
    }
  }
  const amount = Math.max(0, damage);
  const results = [];
  let breakdown;
  if (amount > 0) {
    const knockout =
      attempt.selection?.knockout === true && attempt.attackType === "melee" && extra.hit === true;
    // Declared unit of damage: each Magic Missile dart is its own damage instance, the
    // same unit as its Concentration saves. At 0 HP each dart counts one death-save
    // failure and is compared alone for massive damage (review 10, P3 dart unit).
    const parts = extra.darts?.length
      ? extra.darts.map((dart) => ({ suffix: ":dart-" + dart.index, amount: dart.total }))
      : [{ suffix: "", amount }];
    for (const part of parts)
      if (part.amount > 0)
        results.push(
          applyVitalityEvent(state, {
            eventId: attempt.id + ":vitality:" + actor.id + part.suffix,
            actorId: actor.id,
            kind: "damage",
            amount: part.amount,
            source: attempt.source ?? { kind: "unrecorded-action", revision: "unknown" },
            critical: extra.critical === true,
            ...(knockout ? { knockout: { melee: true } } : {}),
            sourceVisibility: publicly(state, attempt.actorId) ? "shared" : "private",
            sourceOwner: state.actors[attempt.actorId]?.owner ?? null,
          }),
        );
    const first = results[0].breakdown,
      last = results.at(-1).breakdown,
      sum = (key) => results.reduce((total, r) => total + (r.breakdown[key] ?? 0), 0);
    breakdown = {
      hpBefore: first.hpBefore,
      hpAfter: last.hpAfter,
      hpLost: sum("hpLost"),
      tempHpBefore: first.tempHpBefore,
      tempHpAfter: last.tempHpAfter,
      tempHpAbsorbed: sum("tempHpAbsorbed"),
      knockout: results.some((r) => r.breakdown.knockout),
      deadBefore: first.deadBefore,
      deadAfter: last.deadAfter,
      failuresAdded: sum("failuresAdded"),
    };
  } else {
    const temp = Number.isFinite(actor.tempHp) ? Math.max(0, actor.tempHp) : 0;
    breakdown = {
      hpBefore: actor.hp,
      hpAfter: actor.hp,
      hpLost: 0,
      tempHpBefore: temp,
      tempHpAfter: temp,
      tempHpAbsorbed: 0,
    };
  }
  Object.assign(outcome, {
    status: "applied",
    damage: amount,
    hpBefore: breakdown.hpBefore,
    hpAfter: breakdown.hpAfter,
    hpLost: breakdown.hpLost,
    tempHpBefore: breakdown.tempHpBefore,
    tempHpAfter: breakdown.tempHpAfter,
    tempHpAbsorbed: breakdown.tempHpAbsorbed,
    ...extra,
    ...(breakdown.knockout ? { knockout: true } : {}),
    ...(breakdown.deadAfter && !breakdown.deadBefore ? { dead: true } : {}),
    ...(breakdown.failuresAdded ? { deathSaveFailures: breakdown.failuresAdded } : {}),
  });
  if (amount > 0) {
    // Damage interrupts rests first, so a knockout's own Short Rest starts afterwards.
    observeRestEvent(state, {
      eventId: attempt.id + ":damage:" + actor.id,
      actorIds: [actor.id],
      cause: "damage",
    });
    for (const result of results) applyConditionFollowUps(state, result);
    const causes = extra.darts?.length
      ? extra.darts.map((dart) => ({ id: "dart-" + dart.index, damage: dart.total }))
      : [{ id: "damage", damage: amount }];
    for (const cause of causes) requestConcentration(state, attempt, actor, cause);
    observeFormsEvent(state, {
      eventId: attempt.id + ":forms-damage:" + actor.id,
      cause: "actor-status",
      actorIds: [actor.id],
    });
  }
  if (extra.hit === true) applyOnHitConditions(state, attempt, outcome);
}
// A sourced on-hit rule (Wolf Bite) applies Prone through the domain; unknown size or
// immunity stays a visible reconciliation instead of a guessed condition.
function applyOnHitConditions(state, attempt, outcome) {
  if (!attempt.onHitProneMaxSize || outcome.conditions) return;
  const target = state.actors[outcome.actorId];
  outcome.conditions = [];
  if (!target || target.dead) return;
  const size = SIZES.indexOf(getEffectiveActor(target).size),
    limit = SIZES.indexOf(attempt.onHitProneMaxSize);
  if (size < 0 || limit < 0) {
    outcome.conditions.push({
      conditionId: "prone",
      applied: false,
      reconciliation: "size-unknown",
    });
    return;
  }
  if (size > limit) {
    outcome.conditions.push({ conditionId: "prone", applied: false, reason: "size" });
    return;
  }
  const result = applyConditionEvent(state, {
    eventId: attempt.id + ":prone:" + target.id,
    kind: "apply",
    actorId: target.id,
    conditionId: "prone",
    source: attempt.source,
    origin: { actorId: attempt.actorId, eventId: attempt.id },
    // The attacker's controller owns the application, so a private source stays
    // readable to the DM who runs the wolf instead of to nobody.
    owner: state.actors[attempt.actorId]?.owner,
    sourceVisibility: publicly(state, attempt.actorId) ? "shared" : "private",
  });
  outcome.conditions.push({
    conditionId: "prone",
    applied: result.applied,
    reconciliation: result.reconciliation[0]?.code ?? null,
  });
  applyConditionFollowUps(state, result);
}
function completeAvailableOutcomes(state, attempt) {
  if (
    attempt.approach &&
    ["moving", "awaiting-throw", "blocked", "cancelled"].includes(attempt.approach.status)
  )
    return;
  if (attempt.requests.some((request) => request.kind === "attack")) {
    const attack = attempt.requests.find((request) => request.kind === "attack");
    // TV-83: a held d20 waits for the Heroic Inspiration choice before hit or damage.
    if (attack.status !== "resolved" || attack.hold) return;
    const outcome = attempt.outcomes[0],
      target = attempt.targets[0];
    if (outcome.status === "pending") {
      const natural = attack.natural;
      const hit =
        natural === 20 ||
        (natural !== 1 &&
          attack.total >= target.targetAC + (shieldActive(state.actors[target.actorId]) ? 5 : 0));
      outcome.hit = hit;
      // Any hit within 1.5 m on a Paralyzed or Unconscious creature is a critical hit; TV-89
      // (DDB «Crit»): a hit whose damage was declared critical before the roll is one too.
      const declared = hit && attempt.selection?.forceCritical === true;
      outcome.critical = natural === 20 || (hit && attack.criticalOnHit === true) || declared;
      if (outcome.critical)
        outcome.criticalReasons = [
          ...(natural === 20 ? ["natural-20"] : []),
          ...(hit && attack.criticalOnHit === true ? ["within-1.5-m"] : []),
          ...(declared ? ["declared"] : []),
        ];
      if (!hit) {
        outcome.status = "missed";
        outcome.damage = 0;
      } else {
        offerShield(state, attempt, outcome);
        if (shieldPending(state, attempt.id, outcome.actorId)) return;
        const actor = state.actors[attempt.actorId];
        // H-01 / C7 (BG3 Custom Mode, Solasta presets): the campaign's critical-hit rule.
        // SRD: the damage dice are rolled twice; house rule "max": one set of dice at their
        // maximum plus one roll, named on the card.
        const maxRule = outcome.critical && campaignRules(state).criticals === "max";
        if (outcome.critical) outcome.criticalRule = maxRule ? "max" : "dice";
        const dice = attempt.damageDice.map((group) => ({
          ...group,
          count: group.count * (outcome.critical && !maxRule ? 2 : 1),
        }));
        const maximum = maxRule
          ? attempt.damageDice.reduce((sum, group) => sum + group.count * group.sides, 0)
          : 0;
        if (Number.isInteger(attempt.fixedDamage))
          applyDamage(state, attempt, outcome, attempt.fixedDamage, {
            hit: true,
            critical: outcome.critical,
            fixedDamage: true,
          });
        else if (!attempt.requests.some((request) => request.kind === "damage"))
          attempt.requests.push(
            requestFor(attempt, actor, "damage", dice, attempt.damageModifier + maximum, {
              targetId: target.actorId,
              ...(attempt.damageSources?.length || maximum
                ? {
                    modifierSources: [
                      ...copy(attempt.damageSources ?? []),
                      ...(maximum
                        ? [
                            {
                              kind: "critical-max",
                              label: text(
                                "Colpo critico: dadi al massimo (regola della campagna)",
                                "Critical Hit: dice at maximum (campaign rule)",
                              ),
                              value: maximum,
                              source: copy(CAMPAIGN_RULE),
                            },
                          ]
                        : []),
                    ],
                  }
                : {}),
            }),
          );
      }
    }
    const damage = attempt.requests.find((request) => request.kind === "damage");
    if (damage?.status === "resolved")
      applyDamage(state, attempt, outcome, damage.total, { hit: true, critical: outcome.critical });
  } else if (attempt.kind === "vitality") {
    const request = attempt.requests[0],
      outcome = attempt.outcomes[0];
    if (request.status === "resolved" && outcome.status === "pending") {
      const result = applyVitalityRoll(
        state,
        {
          eventId: request.id + ":outcome",
          descriptor: attempt.descriptor,
          values: request.values,
        },
        request.resolvedBy,
      );
      outcome.status = result.outcome.status === "applied" ? "applied" : "expired";
      outcome.vitality = result.outcome;
      applyConditionFollowUps(state, result, { eventId: request.id + ":outcome" });
    }
  } else if (attempt.actionId === "burning-hands") {
    const damage = attempt.requests.find((request) => request.kind === "damage");
    if (damage.status !== "resolved") return;
    for (const outcome of attempt.outcomes) {
      const save = attempt.requests.find(
        (request) => request.kind === "save" && request.actorId === outcome.actorId,
      );
      if (!save && outcome.autoFailSave) {
        applyDamage(state, attempt, outcome, damage.total, { saveSuccess: false });
        continue;
      }
      if (save.status !== "resolved" || save.hold) continue;
      const target = attempt.targets.find((target) => target.actorId === outcome.actorId);
      const success = save.total >= target.saveDC;
      applyDamage(state, attempt, outcome, success ? Math.floor(damage.total / 2) : damage.total, {
        saveTotal: save.total,
        saveSuccess: success,
      });
    }
  } else if (attempt.actionId === "magic-missile") {
    const damage = attempt.requests[0];
    for (const outcome of attempt.outcomes) {
      if (outcome.status !== "pending" || shieldPending(state, attempt.id, outcome.actorId))
        continue;
      const shielded = shieldActive(state.actors[outcome.actorId]);
      if (shielded) {
        applyDamage(state, attempt, outcome, 0, { blockedByShield: true });
        continue;
      }
      if (damage.status !== "resolved") continue;
      const darts = attempt.dartAssignments.flatMap((actorId, index) =>
        actorId === outcome.actorId
          ? [{ index, face: damage.values[index], modifier: 1, total: damage.values[index] + 1 }]
          : [],
      );
      applyDamage(
        state,
        attempt,
        outcome,
        shielded ? 0 : darts.reduce((sum, dart) => sum + dart.total, 0),
        { darts, blockedByShield: shielded },
      );
    }
    if (
      damage.status === "pending" &&
      attempt.outcomes.every((outcome) => outcome.status !== "pending")
    ) {
      damage.status = "expired";
      damage.reason = "shield-blocked-all-darts";
    }
  } else if (attemptResolvers.has(attempt.kind)) {
    // B41 (additive): an area's own attempt kind (a region trap) settles its outcomes here,
    // in the transaction that resolved the roll, through the same damage application.
    attemptResolvers.get(attempt.kind)(state, attempt, {
      applyDamage: (outcome, damage, extra) => applyDamage(state, attempt, outcome, damage, extra),
    });
  }
  expireConcentrationRequests(state, attempt);
  if (
    attempt.requests.every((request) => request.status !== "pending") &&
    attempt.outcomes.every((outcome) => outcome.status !== "pending")
  )
    attempt.status = "resolved";
}
export function resolveRoll(state, attemptId, requestId, values, role, options = {}) {
  const attempt = (state.combatAttempts ?? []).find((entry) => entry.id === attemptId);
  const request = attempt?.requests.find((entry) => entry.id === requestId);
  if (
    !request ||
    (request.personal === true && request.owner !== role) ||
    !canControl(state.actors[request.actorId], role, state)
  )
    reject(
      failure(
        "roll-not-permitted",
        "Non puoi rispondere a questo tiro.",
        "You cannot answer this roll.",
      ),
    );
  const faces = checkedFaces(request, values);
  // Faces already accepted (fully, or partially after a recomputed dice profile) are evidence.
  const known = Array.isArray(request.acceptedValues)
    ? request.acceptedValues
    : Array.isArray(request.knownValues)
      ? request.knownValues
      : null;
  const changedFaces =
    !!known &&
    (known.length !== faces.length ||
      known.some((face, index) => face !== null && face !== faces[index]));
  const correctionReason =
    typeof options.correctionReason === "string" ? options.correctionReason.trim() : "";
  if (changedFaces && (!correctionReason || request.status !== "pending"))
    reject(
      failure(
        "roll-face-already-accepted",
        "Le facce sono già registrate. Riapplica il risultato noto oppure usa una correzione esplicita.",
        "The faces are already recorded. Reapply the known result or use an explicit correction.",
      ),
    );
  if (request.status === "resolved") {
    if (JSON.stringify(request.values) !== JSON.stringify(faces))
      reject(
        failure(
          "roll-already-resolved",
          "Il tiro è già registrato con altre facce: usa la correzione.",
          "The roll is already recorded with other faces: use correction.",
        ),
      );
    return attempt;
  }
  if (request.status === "expired")
    reject(
      failure(
        "request-expired",
        "La richiesta non è più applicabile.",
        "This request no longer applies.",
      ),
    );
  if (attempt.kind === "vitality") {
    // Healing, death or stability before the roll makes it unnecessary: no face is kept.
    const current = vitalityRollState(state, attempt, role);
    if (!current.needed) {
      expireVitalityAttempt(attempt, current.reason);
      return attempt;
    }
    // The domain recomputes the modifier when the roll is made (for example a changed
    // Exhaustion level): the request total uses that same value.
    const d = currentVitalityDescriptor(state, attempt.descriptor);
    request.modifier = d.modifier;
    request.modifierSources = copy(d.modifierSources ?? []);
  }
  if (request.kind === "concentration" && !concentrationCurrent(state, request)) {
    expireConcentrationRequests(state, attempt);
    completeAvailableOutcomes(state, attempt);
    refreshMovements(state);
    return attempt;
  }
  if (!Number.isFinite(request.modifier))
    reject(
      failure(
        "roll-data-missing",
        "Manca il modificatore verificato del tiro: correggi la scheda.",
        "The verified roll modifier is missing: correct the sheet.",
      ),
    );
  // The pending result may have been resumed after a reload or a role switch.
  for (const outcome of attempt.outcomes)
    if (outcome.status === "pending" && !state.actors[outcome.actorId])
      reject(
        failure(
          "missing-target",
          "Il bersaglio non è più disponibile: serve una correzione esplicita.",
          "The target is no longer available: an explicit correction is required.",
        ),
      );
  if (changedFaces) {
    request.previousValues = copy(known);
    request.correctionReason = correctionReason;
  }
  request.acceptedValues = copy(faces);
  request.values = faces;
  delete request.withdrawn;
  const score = requestScore(request, faces);
  request.natural = score.natural;
  if (score.riderRolls.length) request.riderRolls = score.riderRolls;
  request.total = score.total;
  request.status = "resolved";
  request.resolvedBy = role;
  // TV-83 (BG3 reroll with Inspiration): a roller with Heroic Inspiration stops after the d20
  // of an attack or of a save inside a combat attempt; nothing hits or deals damage before
  // «Usa Ispirazione eroica» or «Continua». Without inspiration nothing waits.
  if (
    ["attack", "save"].includes(request.kind) &&
    !["roll-request", "vitality"].includes(attempt.kind) &&
    !request.inspirationDecided &&
    hasHeroicInspiration(state, request.actorId)
  )
    request.hold = "inspiration";
  if (request.kind === "concentration") {
    request.success = request.total >= request.dc;
    if (!request.success)
      endConcentration(state, request.actorId, request.concentrationId, "failed-save");
  }
  completeAvailableOutcomes(state, attempt);
  refreshMovements(state);
  return attempt;
}
// ---------------------------------------------------------------- Heroic Inspiration (TV-83)
// SRD 5.2.1 "Heroic Inspiration" (EN 8 / IT 8): expend it to reroll a die immediately after
// rolling it, and use the new roll. The inspiration lives in the dice tray's slice (B34,
// dice-tray-domain setInspiration writes the same record); it is read and spent here
// without importing that area, as conditions.mjs reads its neighbours' slices.
export function hasHeroicInspiration(state, actorId) {
  return (
    state?.actors?.[actorId]?.kind === "character" &&
    state?.ext?.["dice-tray"]?.inspiration?.[actorId]?.active === true
  );
}
function heldRequest(state, attemptId, requestId, role) {
  const attempt = (state.combatAttempts ?? []).find((entry) => entry.id === attemptId);
  const request = attempt?.requests.find((entry) => entry.id === requestId);
  if (!request || request.hold !== "inspiration")
    reject(
      failure(
        "no-inspiration-hold",
        "Questo tiro non attende una scelta sull’Ispirazione eroica.",
        "This roll does not await a Heroic Inspiration choice.",
      ),
    );
  if (
    (request.personal === true && request.owner !== role) ||
    !canControl(state.actors[request.actorId], role, state)
  )
    reject(
      failure(
        "roll-not-permitted",
        "Sceglie chi gioca la creatura che ha tirato.",
        "Whoever plays the creature that rolled chooses.",
      ),
    );
  return { attempt, request };
}
function releaseHold(state, attempt, request, decision) {
  delete request.hold;
  request.inspirationDecided = decision;
  completeAvailableOutcomes(state, attempt);
  refreshMovements(state);
  return attempt;
}
/**
 * «Usa Ispirazione eroica: ritira il d20» (BG3 reroll with Inspiration): rerolls the lowest
 * d20 of the held roll (the one that decides with Disadvantage, the only one that can raise
 * the result with Advantage), keeps the new face and spends the inspiration. `face` is a
 * physical die's face; without it `rollDie(20)` rolls digitally. Both faces stay: the log
 * records the first roll and this reroll as two accepted rolls.
 */
export function useHeroicInspiration(state, attemptId, requestId, role, options = {}) {
  const { attempt, request } = heldRequest(state, attemptId, requestId, role);
  if (!hasHeroicInspiration(state, request.actorId))
    reject(
      failure(
        "no-inspiration",
        "Questo personaggio non ha più l’Ispirazione eroica.",
        "This character no longer has Heroic Inspiration.",
      ),
    );
  const physical = options.face !== undefined && options.face !== null && options.face !== "";
  const next = physical ? Number(options.face) : options.rollDie?.(20);
  if (!Number.isInteger(next) || next < 1 || next > 20)
    reject(
      failure(
        "invalid-dice",
        "La nuova faccia del d20 è un numero intero da 1 a 20.",
        "The new d20 face is a whole number from 1 to 20.",
      ),
    );
  const d20 = request.values.slice(0, request.dice[0].count);
  const index = d20.indexOf(Math.min(...d20));
  const values = [...request.values];
  const from = values[index];
  values[index] = next;
  request.inspirationReroll = {
    index,
    from,
    to: next,
    values: copy(request.values),
    mode: physical ? "physical" : "digital",
    by: role,
  };
  request.values = values;
  request.acceptedValues = copy(values);
  const score = requestScore(request, values);
  request.natural = score.natural;
  if (score.riderRolls.length) request.riderRolls = score.riderRolls;
  request.total = score.total;
  const tray = state.ext["dice-tray"];
  tray.inspiration[request.actorId] = {
    active: false,
    at: options.now ?? new Date().toISOString(),
    by: role,
    spentOn: request.id,
  };
  return releaseHold(state, attempt, request, "rerolled");
}
/** «Continua»: keeps the roll as it is and lets the attack or save resolve. */
export function continueWithoutInspiration(state, attemptId, requestId, role) {
  const { attempt, request } = heldRequest(state, attemptId, requestId, role);
  return releaseHold(state, attempt, request, "kept");
}
// Apply of the assisted card (B20): whoever controls the target applies a "ready" outcome
// (the DM for their creatures), as dnd5e applies damage through the target's owner
// (FVT-138); damage, conditions, concentration and rest follow-ups happen now.
// B33: `options` `{amount, adjustment, darts?}` is the controller's explicit tray decision
// (multiplier, defenses kept or dropped, an immunity downgraded with its reason); it
// replaces the automatic defenses. Without options the call behaves as before.
export function applyReadyOutcome(state, attemptId, actorId, role, options = {}) {
  const attempt = (state.combatAttempts ?? []).find((entry) => entry.id === attemptId);
  const outcome = attempt?.outcomes.find(
    (entry) => entry.actorId === actorId && entry.status === "ready",
  );
  const pending = attempt?.pendingApplications?.[actorId];
  if (!outcome || !pending)
    reject(
      failure("nothing-to-apply", "Non c’è nulla da applicare.", "There is nothing to apply."),
    );
  if (!canControl(state.actors[actorId], role, state))
    reject(
      failure(
        "apply-not-permitted",
        "Applica chi controlla il bersaglio: il DM per le sue creature.",
        "Whoever controls the target applies it: the DM for their creatures.",
      ),
    );
  outcome.status = "pending";
  outcome.applyApproved = true;
  delete attempt.pendingApplications[actorId];
  const decided = !!options?.adjustment && Number.isInteger(options.amount) && options.amount >= 0;
  applyDamage(
    state,
    attempt,
    outcome,
    decided ? options.amount : pending.damage,
    decided
      ? {
          ...pending.extra,
          adjustment: copy(options.adjustment),
          ...(options.darts ? { darts: copy(options.darts) } : {}),
        }
      : pending.extra,
  );
  expireConcentrationRequests(state, attempt);
  attempt.status =
    attempt.requests.some((request) => request.status === "pending") ||
    attempt.outcomes.some((entry) => entry.status === "pending")
      ? "pending"
      : "resolved";
  refreshMovements(state);
  return outcome;
}
/**
 * TV-89 (Foundry roll modes, DDB «Roll to»): whether `role` reads an attempt's dice and
 * results. Everyone: all; «Io e il DM»: the roller and whoever runs the session; «Solo il
 * DM» (blind): only whoever runs the session; «Solo io»: only the roller. The engine still
 * resolves the hit and the damage for the table.
 */
export function canSeeAttemptValues(state, attempt, role) {
  const audience = attempt?.audience ?? "public";
  if (audience === "public") return true;
  const runner = sessionAuthority(state, role);
  const roller = attempt.acceptedBy === role;
  return audience === "gm" ? roller || runner : audience === "blind" ? runner : roller;
}
const HIDDEN_REQUEST_FIELDS = [
  "values",
  "acceptedValues",
  "knownValues",
  "previousValues",
  "natural",
  "total",
  "riderRolls",
  "inspirationReroll",
  "recomputedFrom",
];
const HIDDEN_OUTCOME_FIELDS = [
  "hit",
  "critical",
  "criticalReasons",
  "criticalRule",
  "damage",
  "saveSuccess",
  "saveTotal",
  "darts",
];
export function projectAttempts(state, role) {
  const runner = sessionAuthority(state, role);
  // TV-141: players read disguised creatures by their disguise, in old attempts too.
  const mask = runner ? [] : disguises(state);
  const hide = (value) =>
    mask.length && typeof value === "string" ? maskNames(value, mask) : value;
  const dcShown = dcShownTo(state, role);
  const controls = (actorId) => canControl(state.actors[actorId], role, state);
  // TV-92 (dnd5e request card): a player's own attempts are those of the creatures they
  // play or that target them; «Tiri e risultati» lists only these, so a request addressed
  // to a DM creature never appears there. Whoever runs the session owns the whole table.
  const involves = (attempt) =>
    runner ||
    controls(attempt.actorId) ||
    attempt.requests.some((request) => controls(request.actorId)) ||
    attempt.outcomes.some((outcome) => controls(outcome.actorId));
  return (state.combatAttempts ?? [])
    .filter((attempt) => visible(state, attempt.actorId, role) || involves(attempt))
    .map((attempt) => {
      const authorizedSource = canControl(state.actors[attempt.actorId], role, state);
      const knownSource = authorizedSource || visible(state, attempt.actorId, role);
      const permittedTargets = new Set(
        attempt.targets
          .filter(
            (target) =>
              canControl(state.actors[target.actorId], role, state) ||
              (target.knownToPlayer && visible(state, target.actorId, role)),
          )
          .map((target) => target.actorId),
      );
      const seesValues = canSeeAttemptValues(state, attempt, role);
      const canReadRequest = (request) =>
        (request.personal !== true || request.owner === role || request.resolvedBy === role) &&
        canControl(state.actors[request.actorId], role, state);
      const publicRequest = (request) =>
        canReadRequest(request) ||
        (knownSource && request.actorId === attempt.actorId) ||
        permittedTargets.has(request.actorId);
      const requests = attempt.requests
        .filter((request) => canReadRequest(request) && publicRequest(request))
        .map((request) => {
          const value = copy(request);
          if (value.targetId && !permittedTargets.has(value.targetId)) delete value.targetId;
          // Reasons from applications this viewer cannot see stay anonymous.
          if (value.conditionReasons)
            value.conditionReasons = projectConditionReasons(
              value.conditionReasons,
              value.kind === "attack"
                ? {
                    attacker: state.actors[attempt.actorId],
                    target: state.actors[request.targetId],
                  }
                : { actor: state.actors[request.actorId] },
              role,
            );
          // C1 (FG hidden DC): «CD nascosta» for players when the campaign hides DCs.
          if (!dcShown && value.dc !== undefined && value.dc !== null) {
            delete value.dc;
            value.dcHidden = true;
          }
          // TV-89: a roll this viewer may not read keeps its place, not its faces.
          if (!seesValues && value.status === "resolved") {
            for (const key of HIDDEN_REQUEST_FIELDS) delete value[key];
            value.hiddenResult = attempt.audience;
          }
          return value;
        });
      const waiting = attempt.requests
        .filter((request) => request.status === "pending" && publicRequest(request))
        .map((request) => ({
          requestId: canReadRequest(request) ? request.id : undefined,
          actorId: request.actorId,
          name: hide(state.actors[request.actorId]?.name ?? ""),
          owner: state.actors[request.actorId]?.owner ?? request.owner,
          kind: request.kind,
          canRespond: canReadRequest(request),
        }));
      const outcomes = attempt.outcomes
        .filter(
          (outcome) =>
            (knownSource && outcome.actorId === attempt.actorId) ||
            permittedTargets.has(outcome.actorId),
        )
        .map((outcome) => {
          const value = copy(outcome);
          delete value.shieldChecked;
          value.name = hide(value.name);
          // One audience for vitals: whoever can read the creature's sheet (the conditions
          // overview audience) sees HP, death-save counts and vital rolls; others see only
          // the public token status.
          if (!canReadVitals(state, state.actors[outcome.actorId], role)) {
            delete value.hpBefore;
            delete value.hpAfter;
            delete value.hpLost;
            delete value.tempHpBefore;
            delete value.tempHpAfter;
            delete value.tempHpAbsorbed;
            delete value.deathSaveFailures;
            delete value.vitality;
          }
          // Faces of a personal vital roll stay personal after the sheet joins a campaign:
          // its natural, total, result and d4 hours follow the request's audience.
          const vital = attempt.kind === "vitality" ? attempt.requests[0] : null;
          if (vital?.personal === true && vital.owner !== role && vital.resolvedBy !== role)
            delete value.vitality;
          if (!canControl(state.actors[outcome.actorId], role, state)) delete value.saveTotal;
          // TV-89: whoever controls the target still sees what happened to it.
          if (!seesValues && !controls(outcome.actorId)) {
            for (const key of HIDDEN_OUTCOME_FIELDS) delete value[key];
            value.hiddenResult = attempt.audience;
          }
          if (value.autoFailReasons)
            value.autoFailReasons = projectConditionReasons(
              { advantage: [], disadvantage: [], autoFailReasons: value.autoFailReasons },
              { actor: state.actors[outcome.actorId] },
              role,
            ).autoFailReasons;
          return value;
        });
      const result = {
        id: attempt.id,
        own: involves(attempt),
        actorId: knownSource ? attempt.actorId : null,
        actorName: knownSource ? hide(attempt.actorName) : null,
        sourceHidden: !knownSource,
        actionId: knownSource ? attempt.actionId : "unknown",
        actionName: knownSource
          ? copy(attempt.actionName)
          : text("Azione non rivelata", "Unrevealed action"),
        mode: attempt.mode,
        audience: attempt.audience ?? "public",
        ...(attempt.selection?.forceCritical && (authorizedSource || runner)
          ? { declaredCritical: { reason: attempt.selection.criticalReason ?? "" } }
          : {}),
        status:
          (authorizedSource && attempt.approach && attempt.status === "pending") ||
          waiting.length ||
          outcomes.some((outcome) => outcome.status === "pending")
            ? "pending"
            : "resolved",
        requests,
        outcomes,
        waiting,
        source: knownSource ? copy(attempt.source) : null,
        damageType: knownSource ? attempt.damageType : null,
      };
      if (authorizedSource) {
        result.cost = copy(attempt.cost);
        result.selection = copy(attempt.selection);
        result.selection.targetIds = result.selection.targetIds.filter((id) =>
          permittedTargets.has(id),
        );
        result.selection.allocations = result.selection.allocations.filter((entry) =>
          permittedTargets.has(entry.actorId),
        );
        result.geometry = copy(attempt.geometry);
      }
      return result;
    });
}
// `options.turnKey` names the turn that starts or ends when it is no longer the current
// one: a companion removed during its own turn ends that turn with the key recorded in
// `combat.pendingTurnStart.previousTurnKey`.
export function expireTurnEffects(state, actorId, phase = "start", options = {}) {
  const actor = state.actors[actorId];
  if (!actor) return;
  const key = options.turnKey ?? turnKey(state);
  if (
    actor.activeForm ||
    actor.formsProfile ||
    state.formsCompanions?.castings.some((c) => c.actorId === actorId && c.status === "casting")
  )
    observeFormsEvent(state, {
      eventId: "turn:" + key + ":" + actorId + ":" + phase,
      cause: phase === "start" ? "turn-start" : "turn-end",
      actorIds: [actorId],
      turnKey: key,
    });
  // TV-84 (FG duration anchors): what ends here is passed to the observers, which announce it.
  const expired = (actor.combatEffects ?? []).filter(
    (effect) => effect.actorId === actorId && effect.expires === phase,
  );
  actor.combatEffects = (actor.combatEffects ?? []).filter(
    (effect) => !(effect.actorId === actorId && effect.expires === phase),
  );
  if (phase === "start")
    for (const subject of Object.values(state.actors)) delete subject.lastSlotTurn;
  observeConditionTerms(state, {
    eventId: "turn:" + key + ":" + actorId + ":" + phase,
    kind: phase === "start" ? "turn-start" : "turn-end",
    actorIds: [actorId],
    turnKey: key,
  });
  if (phase === "start") {
    // One death save per actual turn: a save requested outside initiative and still
    // pending, or bound to another encounter, no longer applies once turns run.
    expireVitalityRequests(state, null, "death-save");
    queueDeathSave(state, actorId, key);
  }
  // B32 (combat tracker): area observers run last, inside the same transaction.
  for (const observer of turnPhaseObservers)
    observer(state, { actorId, phase, turnKey: key, expired: copy(expired) });
}
// ---------------------------------------------------------------- active effects (TV-85)

// The timed effects the Table shows on a creature (Visual Active Effects, BG3 portrait
// icons): name, icon, source and how long it lasts, from the turn anchor it expires at.
export const EFFECT_INFO = Object.freeze({
  shield: { icon: "shield", name: text("Scudo", "Shield"), detail: text("CA +5", "AC +5") },
  dodge: {
    icon: "dodge",
    feminine: true,
    name: text("Schivata", "Dodge"),
    detail: text(
      "Svantaggio agli attacchi che vedi; vantaggio ai TS di Destrezza",
      "Disadvantage on attacks you can see; advantage on Dexterity saves",
    ),
  },
  disengage: {
    icon: "disengage",
    name: text("Disimpegno", "Disengage"),
    detail: text("Nessun attacco di opportunità", "No opportunity attacks"),
  },
  dash: {
    icon: "dash",
    name: text("Scatto", "Dash"),
    detail: text("Movimento extra in questo turno", "Extra movement this turn"),
  },
});
export const effectName = (type) => EFFECT_INFO[type]?.name ?? text(type, type);
/** «Scudo di Livia è terminato» / «Schivata di Livia è terminata» (TV-84). */
export const effectEndedText = (type, name) => {
  const effect = effectName(type);
  return text(
    `${effect.it} di ${name} è terminat${EFFECT_INFO[type]?.feminine ? "a" : "o"}`,
    `${name}’s ${effect.en} has ended`,
  );
};
const untilText = (effect) =>
  effect.expires === "start"
    ? text("fino all’inizio del suo prossimo turno", "until the start of its next turn")
    : effect.expires === "end"
      ? text("fino alla fine di questo turno", "until the end of this turn")
      : text("finché dura", "while it lasts");
export function activeEffectsOf(state, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor) return [];
  const rows = (actor.combatEffects ?? [])
    .filter((effect) => EFFECT_INFO[effect.type])
    .map((effect) => ({
      id: `${effect.type}:${effect.attemptId ?? effect.reactionId ?? ""}`,
      type: effect.type,
      icon: EFFECT_INFO[effect.type].icon,
      name: copy(EFFECT_INFO[effect.type].name),
      detail: copy(EFFECT_INFO[effect.type].detail),
      until: untilText(effect),
      source: effect.source ? copy(effect.source) : null,
    }));
  if (actor.concentration?.active)
    rows.push({
      id: `concentration:${actor.concentration.id ?? ""}`,
      type: "concentration",
      icon: "concentration",
      name: text("Concentrazione", "Concentration"),
      detail:
        typeof actor.concentration.name === "object"
          ? copy(actor.concentration.name)
          : text(String(actor.concentration.name ?? ""), String(actor.concentration.name ?? "")),
      until: text(
        "finché la mantieni (TS di Costituzione se subisci danni)",
        "while you keep it (Constitution save when you take damage)",
      ),
      source: null,
    });
  return rows;
}
// Shared turns (additive, B32): an area's predicate `(state, actorId) => boolean` lets a
// creature act as on its own turn while another holds the turn (the group-turn house
// rule). With no predicate only the current creature acts, as before. The third argument
// is "action" or "movement" (B32 review: a readied move shares movement only).
const turnSharers = new Set();
export function shareCurrentTurn(predicate) {
  turnSharers.add(predicate);
  return () => turnSharers.delete(predicate);
}
const MOUNT_ACTIONS = new Set(["dash", "disengage", "dodge"]);
function actsNow(state, actorId, purpose = "action") {
  if (state.combat.order[state.combat.turn] === actorId) return true;
  // C10: a controlled mount acts on its rider's turn (its initiative matches the rider's).
  const mount = mountControlOf(state, actorId);
  if (mount?.controlled && mount.riderId && state.combat.order[state.combat.turn] === mount.riderId)
    return true;
  for (const predicate of turnSharers) if (predicate(state, actorId, purpose)) return true;
  return false;
}
// Turn-phase observers (additive, B32): pure functions called at the end of every turn
// start/end above, with the draft state. Returns the function that removes the observer.
const turnPhaseObservers = new Set();
export function observeTurnPhases(observer) {
  turnPhaseObservers.add(observer);
  return () => turnPhaseObservers.delete(observer);
}
// Area seams (additive, B41 regions). A movement-stop observer `(state, {movement, start,
// end})` returns null or `{fraction, stop, reason, apply(state, movement)}` for the first
// point of the straight segment start→end where something happens (a region edge);
// `apply` runs inside the movement's transaction, and `stop` ends the movement there.
// An attempt resolver settles the outcomes of its own `attempt.kind` (see
// completeAvailableOutcomes). Each returns the function that removes it.
const movementStops = new Set();
export function observeMovementStops(observer) {
  movementStops.add(observer);
  return () => movementStops.delete(observer);
}
function firstMovementStop(state, movement, end) {
  let first = null;
  for (const observer of movementStops) {
    const found = observer(state, {
      movement,
      start: copy(tokenFor(state, movement.actorId)),
      end: copy(end),
    });
    if (
      found &&
      Number.isFinite(found.fraction) &&
      found.fraction >= 0 &&
      found.fraction <= 1 &&
      (!first || found.fraction < first.fraction)
    )
      first = found;
  }
  return first;
}
const attemptResolvers = new Map();
export function resolveAttemptKind(kind, resolver) {
  attemptResolvers.set(kind, resolver);
  return () => attemptResolvers.delete(kind);
}
// DDB-138 (additive, B32): a viewer who cannot see the creature whose turn it is keeps
// seeing the last visible one before it, so a hidden turn never leaks through the order.
export function visibleTurnActor(state, canSee) {
  const order = state.combat?.order ?? [];
  for (let back = 0; back < order.length; back++) {
    const id = order[(((state.combat.turn - back) % order.length) + order.length) % order.length];
    if (canSee(id)) return id;
  }
  return null;
}
// Legendary Resistance (additive, B32; SRD 5.2.1 stat blocks, e.g. EN 258 / IT 293): the
// creature chooses to succeed on a saving throw it failed. Only an outcome whose damage
// still waits for Apply (assisted automation) changes; Burning Hands then deals half.
export function succeedFailedSave(state, attemptId, actorId, role) {
  const attempt = (state.combatAttempts ?? []).find((entry) => entry.id === attemptId);
  const outcome = attempt?.outcomes.find((entry) => entry.actorId === actorId);
  if (!outcome || outcome.saveSuccess !== false)
    reject(
      failure(
        "no-failed-save",
        "Nessun tiro salvezza fallito da cambiare.",
        "No failed saving throw to change.",
      ),
    );
  if (!canControl(state.actors[actorId], role, state))
    reject(
      failure(
        "not-controller",
        "Non controlli questa creatura.",
        "You do not control this creature.",
      ),
    );
  const damage = attempt.requests.find((request) => request.kind === "damage");
  const pending = attempt.pendingApplications?.[actorId];
  if (outcome.status !== "ready" || !pending)
    reject(
      failure(
        "save-already-applied",
        "Il danno di questo tiro salvezza è già applicato: annullalo prima di usare la resistenza.",
        "This saving throw's damage is already applied: undo it before using the resistance.",
      ),
    );
  if (attempt.actionId !== "burning-hands" || damage?.status !== "resolved")
    reject(
      failure(
        "save-success-unknown",
        "Per questa azione non è registrato l’effetto di un tiro riuscito.",
        "This action records no effect for a successful save.",
      ),
    );
  const half = Math.floor(damage.total / 2);
  Object.assign(outcome, { saveSuccess: true, damage: half, legendaryResistance: true });
  pending.damage = half;
  pending.extra = { ...pending.extra, saveSuccess: true, legendaryResistance: true };
  return outcome;
}

const shieldActive = (actor) =>
  (actor?.combatEffects ?? []).some((effect) => effect.type === "shield");
const shieldPending = (state, attemptId, actorId) =>
  (state.combatReactions ?? []).some(
    (reaction) =>
      reaction.type === "shield" &&
      reaction.attemptId === attemptId &&
      reaction.actorId === actorId &&
      reaction.status === "pending",
  );
function shieldAvailable(state, actor, level = null) {
  return (
    !!actor &&
    actor.reaction &&
    !incapacitated(actor) &&
    !actor.dead &&
    profileFor(actor).spells?.includes("shield") &&
    profileFor(actor).componentsAvailable !== false &&
    (!state.combat.active || actor.lastSlotTurn !== turnKey(state)) &&
    spellLevels(actor).some((pool) => (!level || pool.level === level) && pool.remaining > 0)
  );
}
function offerShield(state, attempt, outcome) {
  if (outcome.shieldChecked) return;
  outcome.shieldChecked = true;
  const actor = state.actors[outcome.actorId];
  if (shieldActive(actor) || !shieldAvailable(state, actor)) return;
  (state.combatReactions ||= []).push({
    id: attempt.id + "-shield-" + actor.id,
    type: "shield",
    status: "pending",
    actorId: actor.id,
    attemptId: attempt.id,
    movementId: attempt.movementId || null,
    trigger: attempt.actionId === "magic-missile" ? "magic-missile" : "hit",
    cost: { reaction: 1, slotLevel: 1 },
    source: source([7, 10, 105, 161, 162]),
  });
}
function concentrationCurrent(state, request) {
  const actor = state.actors[request.actorId];
  return (
    actor?.concentration?.active &&
    actor.concentration.id === request.concentrationId &&
    !incapacitated(actor) &&
    !actor.dead
  );
}
function endConcentration(state, actorId, id, reason) {
  const actor = state.actors[actorId];
  if (actor?.concentration?.id !== id) return;
  actor.concentration.active = false;
  actor.concentration.endedReason = reason;
  observeFormsEvent(state, {
    eventId: id + ":ended:" + reason,
    cause: "concentration",
    actorIds: [actorId],
  });
  for (const subject of Object.values(state.actors))
    subject.combatEffects = (subject.combatEffects ?? []).filter(
      (effect) => effect.concentrationId !== id,
    );
  observeConcentrationEnd(state, actorId, id);
}
// TV-82 (Solasta II Ready; SRD Ready, EN 186–187 / IT 211): a readied spell is cast now,
// its slot spent, and its magic held with Concentration until the Reaction releases it.
// A broken Concentration loses the spell (the engine's usual Constitution save).
export function holdReadiedSpell(state, actorId, { slotLevel, name, readyId }) {
  const actor = state.actors[actorId];
  const pool = actor && resource(actor, slotLevel);
  if (!pool || !Number.isInteger(pool.used) || pool.used >= pool.max)
    reject(
      failure(
        "no-slot",
        "Nessuno slot disponibile del livello scelto.",
        "No slot remains at the selected level.",
      ),
    );
  if (state.combat.active && actor.lastSlotTurn === turnKey(state))
    reject(
      failure(
        "slot-used-this-turn",
        "Hai già speso uno slot per lanciare in questo turno.",
        "You already spent a spell slot to cast on this turn.",
      ),
    );
  spendSpellSlot(actor, slotLevel);
  if (state.combat.active) actor.lastSlotTurn = turnKey(state);
  if (actor.concentration?.active)
    endConcentration(state, actorId, actor.concentration.id, "replaced");
  actor.concentration = {
    id: "ready-" + readyId,
    name: copy(name),
    active: true,
    source: { kind: "ready", readyId, revision: "5.2.1" },
  };
  return actor.concentration.id;
}
/** Whether the held spell still stands (its Concentration was not broken). */
export const readiedSpellHeld = (state, actorId, concentrationId) =>
  state.actors[actorId]?.concentration?.active === true &&
  state.actors[actorId].concentration.id === concentrationId;
// Releasing gives back the slot spent when readying, so the cast that follows spends it
// exactly once, and ends the holding Concentration.
export function releaseReadiedSpell(state, actorId, concentrationId, slotLevel) {
  const actor = state.actors[actorId];
  const pool = resource(actor, slotLevel);
  if (pool && Number.isInteger(pool.used) && pool.used > 0) {
    pool.used -= 1;
    if (slotLevel === 1 && actor.spellSlots?.[1]) actor.slots = actor.spellSlots[1];
  }
  endConcentration(state, actorId, concentrationId, "released");
}
// Conditions sustained by a concentration end with it, and only those (increment 10).
export function observeConcentrationEnd(state, actorId, concentrationId) {
  observeConditionTerms(state, {
    eventId: "concentration-end:" + concentrationId,
    kind: "concentration-end",
    concentrationId,
    actorIds: [actorId],
  });
}
function requestConcentration(state, attempt, actor, cause) {
  actor = getEffectiveActor(actor);
  if (!actor.concentration?.active) return;
  if (incapacitated(actor) || actor.dead) {
    endConcentration(state, actor.id, actor.concentration.id, "incapacitated-or-dead");
    return;
  }
  const save = conditionSaveRules(actor, "con");
  const modifier =
    (actor.savingThrows?.con !== undefined
      ? actor.savingThrows.con
      : Number.isFinite(actor.abilities?.con)
        ? mod(actor.abilities.con)
        : NaN) + save.modifier;
  // PG-47: a Constitution save for Concentration is a saving throw: its riders roll with it.
  const fields = d20Fields(
    ridersFor(state, actor.id, "save"),
    "normal",
    modifier,
    save.modifierSources,
  );
  const request = requestFor(attempt, actor, "concentration", fields.dice, fields.modifier, {
    ...(fields.modifierSources.length ? { modifierSources: fields.modifierSources } : {}),
    ...(fields.riders ? { riders: fields.riders } : {}),
    concentrationId: actor.concentration.id,
    concentrationName: copy(actor.concentration.name),
    damageInstanceId: attempt.id + ":" + actor.id + ":" + cause.id,
    damage: cause.damage,
    dc: Math.min(30, Math.max(10, Math.floor(cause.damage / 2))),
    source: source(
      [179],
      cause.id.startsWith("dart-")
        ? {
            interpretation:
              "One concentration save per harmful dart; local convention, not an explicit 2024 ruling.",
          }
        : {},
    ),
  });
  if (!Number.isFinite(modifier)) {
    request.modifier = null;
    request.needsData = true;
  }
  attempt.requests.push(request);
}
function expireConcentrationRequests(state, attempt) {
  for (const request of attempt.requests) {
    if (request.kind === "concentration" && request.status === "pending" && request.needsData) {
      const actor = getEffectiveActor(state.actors[request.actorId]);
      const modifier =
        actor?.savingThrows?.con !== undefined
          ? actor.savingThrows.con
          : Number.isFinite(actor?.abilities?.con)
            ? mod(actor.abilities.con)
            : NaN;
      if (Number.isFinite(modifier)) {
        request.modifier = modifier;
        request.needsData = false;
      }
    }
    if (
      request.kind !== "concentration" ||
      request.status !== "pending" ||
      concentrationCurrent(state, request)
    )
      continue;
    const actor = state.actors[request.actorId];
    if (
      actor?.concentration?.id === request.concentrationId &&
      (incapacitated(actor) || actor.dead)
    )
      endConcentration(state, actor.id, request.concentrationId, "incapacitated-or-dead");
    request.status = "expired";
    request.reason = "concentration-ended-or-replaced";
  }
}

export function hasBlockingConsequences(state, actorId = state.combat.order[state.combat.turn]) {
  return (
    (state.movements ?? []).some(
      (movement) =>
        movement.actorId === actorId &&
        ["pending", "awaiting-choice", "blocked"].includes(movement.status),
    ) ||
    (state.combatAttempts ?? []).some(
      (attempt) =>
        attempt.status === "pending" &&
        // The 1d4 recovery period of a stable creature is narrative time, not a turn gate.
        !(attempt.kind === "vitality" && attempt.requests[0]?.kind === "stable-recovery") &&
        // B34: a check or save the DM requested has no automatic consequence to wait for.
        attempt.kind !== "roll-request" &&
        (attempt.actorId === actorId ||
          attempt.outcomes.some(
            (outcome) => outcome.actorId === actorId && outcome.status === "pending",
          ) ||
          attempt.requests.some(
            (request) =>
              request.actorId === actorId &&
              request.status === "pending" &&
              (request.kind !== "concentration" || concentrationCurrent(state, request)),
          )),
    ) ||
    (state.combatReactions ?? []).some(
      (reaction) => reaction.actorId === actorId && reaction.status === "pending",
    )
  );
}

function opportunityActions(state, actorId) {
  return listActions(state, actorId).filter(
    (action) =>
      action.attackType === "melee" &&
      (action.id !== "melee-attack" ||
        isValidMeleeProfile(profileFor(state.actors[actorId]).meleeAttack)),
  );
}
function opportunityEligible(state, actorId, moverId, atPoint = tokenFor(state, moverId)) {
  const actor = state.actors[actorId],
    mover = state.actors[moverId];
  const firstTeam = actor && profileFor(actor).team,
    secondTeam = mover && profileFor(mover).team;
  return (
    state.combat.active &&
    isActorAvailable(actor) &&
    isActorAvailable(mover) &&
    actor.id !== mover.id &&
    actor.reaction &&
    !incapacitated(actor) &&
    !actor.dead &&
    opposingTeams(firstTeam, secondTeam) &&
    !hasCondition(actor, "blinded") &&
    publicly(state, moverId) &&
    hasLineOfSight(sceneFor(state), tokenFor(state, actorId), atPoint) &&
    hasLineOfEffect(sceneFor(state), tokenFor(state, actorId), atPoint) &&
    !(mover.combatEffects ?? []).some((effect) => effect.type === "disengage") &&
    !profileFor(mover).traits?.some((trait) => trait.id === "agile") &&
    opportunityActions(state, actorId).length > 0
  );
}
function crossingFraction(start, end, center, radius) {
  const dx = end.x - start.x,
    dy = end.y - start.y;
  const x = start.x - center.x,
    y = start.y - center.y;
  const a = dx * dx + dy * dy;
  if (a < 1e-10) return null;
  const b = 2 * (x * dx + y * dy),
    c = x * x + y * y - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant <= 1e-10) return null;
  const exit = (-b + Math.sqrt(discriminant)) / (2 * a);
  if (exit < -1e-8 || exit >= 1 - 1e-8) return null;
  return Math.max(0, exit);
}
// TV-80: reach follows the scene's distance rule, as every other range check does
// (segmentMeters): on the SRD 2024 grid a diagonal neighbour is within 1.5 m, so leaving it
// provokes. Reach on each grid metric is a convex polygon (a square on the SRD grid, a
// diamond, an octagon for the alternating diagonals, a hexagon); the move is clipped to it
// (Cyrus–Beck) and the end of that stretch is where the mover leaves reach.
const S3 = Math.sqrt(3);
const REACH_EDGES = {
  "grid-srd": [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  manhattan: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
  "grid-alternate": [
    [1, 0.5],
    [1, -0.5],
    [-1, 0.5],
    [-1, -0.5],
    [0.5, 1],
    [-0.5, 1],
    [0.5, -1],
    [-0.5, -1],
  ],
  hex: [
    [1, -1 / S3],
    [-1, 1 / S3],
    [0, 2 / S3],
    [0, -2 / S3],
    [1, 1 / S3],
    [-1, -1 / S3],
  ],
};
function reachExitFraction(scene, start, end, center, reachMeters) {
  const edges = REACH_EDGES[distanceRuleOf(scene)];
  if (!edges)
    return crossingFraction(
      start,
      end,
      center,
      (reachMeters / scene.metersPerCell) * scene.gridSize,
    );
  const cell = scene.gridSize;
  const sx = (start.x - center.x) / cell,
    sy = (start.y - center.y) / cell;
  const dx = (end.x - start.x) / cell,
    dy = (end.y - start.y) / cell;
  if (dx * dx + dy * dy < 1e-10) return null;
  const reach = reachMeters / scene.metersPerCell;
  let enter = -Infinity,
    exit = Infinity;
  for (const [nx, ny] of edges) {
    const base = nx * sx + ny * sy - reach;
    const rate = nx * dx + ny * dy;
    if (Math.abs(rate) < 1e-12) {
      if (base > 1e-9) return null;
      continue;
    }
    const t = -base / rate;
    if (rate > 0) exit = Math.min(exit, t);
    else enter = Math.max(enter, t);
  }
  if (enter >= exit - 1e-10 || exit < -1e-8 || exit >= 1 - 1e-8) return null;
  return Math.max(0, exit);
}
function nextOpportunities(state, movement, end) {
  const start = tokenFor(state, movement.actorId),
    scene = sceneFor(state);
  const entries = [];
  for (const token of scene.tokens) {
    if (movement.handledActors.includes(token.actorId)) continue;
    const action = opportunityActions(state, token.actorId)[0];
    if (!action) continue;
    const fraction = reachExitFraction(scene, start, end, token, action.rangeMeters);
    const atPoint = fraction !== null && {
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
    };
    if (fraction !== null && opportunityEligible(state, token.actorId, movement.actorId, atPoint))
      entries.push({ actorId: token.actorId, actionId: action.id, fraction });
  }
  entries.sort((a, b) => a.fraction - b.fraction);
  return entries.filter((entry) => Math.abs(entry.fraction - entries[0].fraction) < 1e-7);
}
function travel(state, movement, point) {
  const token = tokenFor(state, movement.actorId),
    actor = state.actors[movement.actorId];
  const path = tracePath(sceneFor(state), token, [point], {
    crawling: hasCondition(actor, "prone"),
  });
  const spent = path.totalCost;
  movement.traveledMeters = Math.round((movement.traveledMeters + path.distance) * 1e6) / 1e6;
  movement.traveledCost = Math.round(((movement.traveledCost ?? 0) + spent) * 1e6) / 1e6;
  if (state.combat.active) spendMovement(actor, spent);
  Object.assign(token, point);
  if (path.distance > 0)
    observeRestEvent(state, {
      eventId: movement.id + ":move:" + movement.traveledMeters,
      actorIds: [movement.actorId],
      cause: "movement",
    });
  movement.position = { x: token.x, y: token.y };
}
function createMovement(state, payload, preview, effectiveDash, attemptId = null) {
  const actor = state.actors[payload.actorId];
  const movement = {
    id: payload.id,
    actorId: actor.id,
    sceneId: state.activeSceneId,
    status: "pending",
    phase: "moving",
    start: copy(preview.start),
    position: copy(preview.start),
    destination: copy(preview.end),
    requestedPoint: copy(payload.point),
    plannedMeters: preview.segments
      .filter((segment) => segment.reachable)
      .reduce((n, segment) => n + segment.distance, 0),
    plannedCost: preview.cost,
    traveledMeters: 0,
    traveledCost: 0,
    path: copy(preview.reachablePath),
    pathIndex: 1,
    geometryKey: preview.geometryKey,
    spatialSources: copy(preview.sources),
    effectiveDash,
    speedAtStart: getEffectiveSpeed(actor),
    turnKey: turnKey(state),
    attemptId,
    handledActors: [],
    reactionOrder: [],
    orderChosen: false,
    acknowledgedAttempts: [],
    fingerprint: JSON.stringify({
      actorId: actor.id,
      point: payload.point,
      dash: payload.dash === true,
      waypoints: payload.waypoints ?? [],
      geometryKey: payload.geometryKey ?? null,
    }),
  };
  (state.movements ||= []).push(movement);
  return movement;
}
function finishMovement(state, movement, status = "resolved") {
  movement.status = status;
  movement.phase = status === "resolved" ? "done" : "changed";
  if (status === "changed")
    for (const reaction of state.combatReactions || []) {
      if (
        reaction.movementId === movement.id &&
        reaction.status === "pending" &&
        reaction.type === "opportunity"
      ) {
        reaction.status = "expired";
        reaction.reason = "movement-abandoned";
      }
    }
  const attempt = (state.combatAttempts ?? []).find((entry) => entry.id === movement.attemptId);
  if (attempt?.approach) {
    if (status === "changed") {
      attempt.approach.status = "cancelled";
      attempt.status = "resolved";
    } else activateApproach(state, attempt);
    return;
  }
  if (attempt) {
    attempt.status = "resolved";
    attempt.outcomes = [
      {
        actorId: movement.actorId,
        name: state.actors[movement.actorId].name,
        status: "applied",
        effect: movement.effectiveDash ? "dash" : "move",
        movement: {
          ...copy(attempt.movement),
          end: copy(movement.position),
          cost: movement.traveledCost,
        },
        changed: status === "changed",
      },
    ];
  }
}
function advanceMovement(state, movement) {
  if (movement.status !== "pending") return;
  const actor = state.actors[movement.actorId];
  if (
    !actor ||
    actor.dead ||
    state.activeSceneId !== movement.sceneId ||
    getEffectiveSpeed(actor) !== movement.speedAtStart ||
    !tokenFor(state, actor.id) ||
    distance(state, tokenFor(state, actor.id), movement.position) > 0.001 ||
    turnKey(state) !== movement.turnKey ||
    movement.geometryKey !== geometryKey(sceneFor(state))
  ) {
    movement.status = "blocked";
    movement.reason = actor?.dead
      ? text(
          "La creatura è morta: il movimento non può proseguire.",
          "The creature is dead: movement cannot continue.",
        )
      : text(
          "La posizione, la velocità, la geometria o il turno è cambiato: cambia mossa dalla situazione attuale.",
          "Position, speed, geometry or turn changed: change the move from the current situation.",
        );
    return;
  }
  for (const reactionId of movement.reactionOrder) {
    const reaction = state.combatReactions.find((entry) => entry.id === reactionId);
    if (reaction.status === "pending") {
      if (!opportunityEligible(state, reaction.actorId, movement.actorId)) {
        reaction.status = "expired";
        reaction.reason = "opportunity-no-longer-available";
        continue;
      }
      movement.phase = movement.orderChosen ? "reaction" : "order";
      return;
    }
    if (reaction.status === "used") {
      const attempt = state.combatAttempts.find((entry) => entry.id === reaction.createdAttemptId);
      if (attempt.status === "pending") {
        movement.phase = "roll";
        return;
      }
      if (
        !movement.acknowledgedAttempts.includes(attempt.id) &&
        attempt.outcomes.some((outcome) => outcome.damage > 0)
      ) {
        movement.status = "awaiting-choice";
        movement.phase = "choice";
        movement.awaitingAttemptId = attempt.id;
        return;
      }
    }
  }
  movement.reactionOrder = [];
  const remaining = tracePath(
    sceneFor(state),
    tokenFor(state, actor.id),
    movement.path.slice(movement.pathIndex),
    {
      budget: state.combat.active ? Math.max(0, actor.movement) : Infinity,
      crawling: hasCondition(actor, "prone"),
    },
  );
  if (remaining.blocked || remaining.limited) {
    movement.status = "blocked";
    movement.reason = text(
      "Il percorso accettato non è più disponibile: cambia mossa.",
      "The accepted path is no longer available: change the move.",
    );
    return;
  }
  let areaStops = 0;
  while (movement.pathIndex < movement.path.length) {
    const end = movement.path[movement.pathIndex];
    const crossings = nextOpportunities(state, movement, end);
    // B41 (additive): an area event on this segment (a region edge) that comes first.
    const stop = areaStops < 32 ? firstMovementStop(state, movement, end) : null;
    if (stop && (!crossings.length || stop.fraction <= crossings[0].fraction)) {
      areaStops += 1;
      const start = tokenFor(state, actor.id);
      travel(state, movement, {
        x: start.x + (end.x - start.x) * stop.fraction,
        y: start.y + (end.y - start.y) * stop.fraction,
      });
      stop.apply?.(state, movement);
      if (stop.stop) {
        const attempt = (state.combatAttempts ?? []).find((a) => a.id === movement.attemptId);
        movement.stoppedBy = copy(stop.reason ?? null);
        finishMovement(state, movement, attempt?.approach ? "changed" : "resolved");
        return;
      }
      continue;
    }
    if (crossings.length) {
      const start = tokenFor(state, actor.id),
        fraction = crossings[0].fraction;
      travel(state, movement, {
        x: start.x + (end.x - start.x) * fraction,
        y: start.y + (end.y - start.y) * fraction,
      });
      for (const crossing of crossings) {
        const id = movement.id + "-opportunity-" + movement.handledActors.length;
        movement.handledActors.push(crossing.actorId);
        movement.reactionOrder.push(id);
        (state.combatReactions ||= []).push({
          id,
          type: "opportunity",
          status: "pending",
          actorId: crossing.actorId,
          targetId: actor.id,
          actionId: crossing.actionId,
          movementId: movement.id,
          attemptId: null,
          cost: { reaction: 1 },
          source: source([10, 15, 185]),
        });
      }
      movement.orderChosen = crossings.length === 1;
      movement.phase = movement.orderChosen ? "reaction" : "order";
      return;
    }
    travel(state, movement, end);
    movement.pathIndex += 1;
  }
  finishMovement(state, movement);
}
function refreshMovements(state) {
  for (const movement of state.movements || []) advanceMovement(state, movement);
}
export function refreshConsequences(state) {
  for (const actor of Object.values(state.actors)) {
    if (actor.concentration?.active && (incapacitated(actor) || actor.dead))
      endConcentration(state, actor.id, actor.concentration.id, "incapacitated-or-dead");
  }
  for (const reaction of state.combatReactions || []) {
    if (
      reaction.status === "pending" &&
      reaction.type === "shield" &&
      !shieldAvailable(state, state.actors[reaction.actorId])
    ) {
      reaction.status = "expired";
      reaction.reason = "reaction-no-longer-available";
    }
  }
  for (const attempt of state.combatAttempts || []) {
    if (attempt.status !== "pending" || attempt.actionId === "dash") continue;
    completeAvailableOutcomes(state, attempt);
  }
  expireVitalityRequests(state);
  refreshMovements(state);
}
export function beginMovement(state, payload, role) {
  const actor = state.actors[payload.actorId];
  if (!actor || !canControl(actor, role, state))
    reject(
      failure(
        "not-controller",
        "Non controlli questa creatura.",
        "You do not control this creature.",
      ),
    );
  if (!payload.id || typeof payload.id !== "string") throw Error("Movement identity is missing");
  const fingerprint = JSON.stringify({
    actorId: actor.id,
    point: payload.point,
    dash: payload.dash === true,
    waypoints: payload.waypoints ?? [],
    geometryKey: payload.geometryKey ?? null,
  });
  const existing = (state.movements || []).find((movement) => movement.id === payload.id);
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      throw Error("Movement already exists with different choices");
    return existing;
  }
  if (state.combat.active && !actsNow(state, actor.id, "movement"))
    throw Error("Not this creature’s turn");
  if (hasBlockingConsequences(state, actor.id))
    throw Error("Resolve this creature's pending consequences first");
  if (
    !isActorAvailable(actor) ||
    actor.dead ||
    !Number.isFinite(getEffectiveSpeed(actor)) ||
    getEffectiveSpeed(actor) <= 0 ||
    !Number.isFinite(actor.movement)
  )
    throw Error("Movement is not available");
  let preview = previewMovement(state, actor.id, payload.point, {
      waypoints: payload.waypoints,
      role,
    }),
    effectiveDash = false;
  if (payload.dash) {
    const actionPreview = previewAction(
      state,
      actor.id,
      "dash",
      { point: payload.point, waypoints: payload.waypoints, geometryKey: payload.geometryKey },
      role,
    );
    if (!actionPreview.available) reject(actionPreview.reasons[0]);
    preview = actionPreview.movement;
    effectiveDash = actionPreview.effectiveDash;
  }
  validateAcceptedPath(state, preview, payload.geometryKey);
  if (preview.blocked) reject(preview.reasons[0]);
  if (preview.cost < 0.001) throw Error("Choose a reachable destination");
  if (effectiveDash) {
    actor.action = false;
    grantDash(actor);
  }
  const movement = createMovement(state, payload, preview, effectiveDash);
  advanceMovement(state, movement);
  return movement;
}
function controlledMovement(state, id, role) {
  const movement = (state.movements || []).find((entry) => entry.id === id);
  if (!movement || !canControl(state.actors[movement.actorId], role, state))
    throw Error("Cannot control this movement");
  return movement;
}
export function resumeMovement(state, id, role) {
  const movement = controlledMovement(state, id, role);
  if (movement.status === "resolved") return movement;
  if (movement.status !== "awaiting-choice")
    throw Error("Movement is waiting for a dependent result");
  movement.acknowledgedAttempts.push(movement.awaitingAttemptId);
  movement.status = "pending";
  advanceMovement(state, movement);
  return movement;
}
export function changeMovement(state, id, role) {
  const movement = controlledMovement(state, id, role);
  if (movement.status === "changed") return movement;
  if (!["awaiting-choice", "blocked"].includes(movement.status))
    throw Error("Resolve the pending event before changing the move");
  finishMovement(state, movement, "changed");
  return movement;
}
export function setReactionOrder(state, id, reactionIds, role) {
  const movement = (state.movements || []).find((entry) => entry.id === id);
  const turnActor = state.actors[state.combat.order[state.combat.turn]];
  if (!movement || !canControl(turnActor, role, state))
    throw Error("Only the turn controller can order simultaneous effects");
  if (movement.orderChosen) {
    if (JSON.stringify(movement.reactionOrder) === JSON.stringify(reactionIds)) return movement;
    throw Error("The reaction order is already recorded");
  }
  if (
    !Array.isArray(reactionIds) ||
    reactionIds.length !== movement.reactionOrder.length ||
    new Set(reactionIds).size !== reactionIds.length ||
    reactionIds.some((id) => !movement.reactionOrder.includes(id))
  )
    throw Error("Include each simultaneous reaction exactly once");
  if (
    !sessionAuthority(state, role) &&
    reactionIds.some(
      (id) =>
        !visible(state, state.combatReactions.find((reaction) => reaction.id === id).actorId, role),
    )
  )
    throw Error("Hidden simultaneous effects require explicit DM mediation");
  movement.reactionOrder = [...reactionIds];
  movement.orderChosen = true;
  movement.orderBy = role;
  advanceMovement(state, movement);
  return movement;
}
function beginOpportunity(state, reaction, mode, role) {
  const actor = state.actors[reaction.actorId],
    target = state.actors[reaction.targetId];
  const action = opportunityActions(state, actor.id).find(
    (entry) => entry.id === reaction.actionId,
  );
  if (!action || !defensiveDataAvailable(target, action))
    throw Error("Opportunity attack data is missing");
  if (
    !tokenFor(state, actor.id) ||
    !tokenFor(state, target.id) ||
    distance(state, tokenFor(state, actor.id), tokenFor(state, target.id)) >
      action.rangeMeters + 0.001
  )
    throw Error("The opportunity target is no longer within reach");
  const profile = profileFor(actor);
  const attackModifier =
    action.attackModifier ??
    mod(getEffectiveActor(actor).abilities?.str) +
      (profile.weaponProficiencies?.includes("quarterstaff") ? profile.proficiencyBonus : 0);
  const damageModifier = action.damageModifier ?? mod(getEffectiveActor(actor).abilities?.str);
  if (!Number.isFinite(attackModifier) || !Number.isFinite(damageModifier))
    throw Error("Opportunity attack modifiers are missing");
  const attempt = {
    id: reaction.id + "-attack",
    actorId: actor.id,
    actorName: trueNameOf(state, actor.id),
    actionId: action.id,
    actionName: copy(action.name),
    kind: "attack",
    mode,
    status: "pending",
    requests: [],
    outcomes: [{ actorId: target.id, name: trueNameOf(state, target.id), status: "pending" }],
    targets: [makeTarget(state, target.id, actor, action)],
    cost: { reaction: 1 },
    source: copy(action.source),
    damageType: action.damageType,
    damageDice: copy(action.dice),
    fixedDamage: action.fixedDamage,
    damageModifier,
    turnKey: turnKey(state),
    movementId: reaction.movementId,
    reactionId: reaction.id,
    selection: selectionCopy({ targetIds: [target.id] }),
    geometry: null,
    acceptedBy: role,
  };
  const rules = conditionRulesFor(state, getEffectiveActor(actor), target);
  const rollReasons = rollReasonsFor(state, actor, action, {}, target, undefined, rules);
  const rollMode = rollModeFor(state, actor, action, {}, target, undefined, rules);
  attempt.attackType = action.attackType ?? null;
  if (action.onHitProneMaxSize) attempt.onHitProneMaxSize = action.onHitProneMaxSize;
  attempt.requests.push(
    requestFor(
      attempt,
      actor,
      "attack",
      [{ count: rollMode === "normal" ? 1 : 2, sides: 20 }],
      attackModifier + rules.modifier,
      { targetId: target.id, rollMode, rollReasons, ...conditionRequestFields(rules) },
    ),
  );
  actor.reaction = false;
  (state.combatAttempts ||= []).push(attempt);
  reaction.createdAttemptId = attempt.id;
  return attempt;
}
export function resolveReaction(state, id, decision, role) {
  const reaction = (state.combatReactions || []).find((entry) => entry.id === id);
  const actor = reaction && state.actors[reaction.actorId];
  if (!actor || !canControl(actor, role, state)) throw Error("Cannot control this reaction");
  if (typeof decision?.use !== "boolean") throw Error("Choose use or decline");
  const response = {
    use: decision.use,
    slotLevel: decision.slotLevel ?? 1,
    mode: decision.mode ?? "physical",
  };
  if (reaction.status !== "pending") {
    if (JSON.stringify(reaction.response) === JSON.stringify(response)) return reaction;
    throw Error("This reaction already has a different response");
  }
  if (reaction.type === "opportunity") {
    const movement = state.movements.find((entry) => entry.id === reaction.movementId);
    const next = movement.reactionOrder.find((id) => {
      const prior = state.combatReactions.find((entry) => entry.id === id);
      return (
        prior.status === "pending" ||
        (prior.status === "used" &&
          state.combatAttempts.find((attempt) => attempt.id === prior.createdAttemptId).status ===
            "pending")
      );
    });
    if (!movement.orderChosen || next !== reaction.id || movement.status !== "pending")
      throw Error("Resolve simultaneous effects in the chosen causal order");
    if (decision.use) {
      if (
        !["digital", "physical"].includes(response.mode) ||
        !opportunityEligible(state, actor.id, movement.actorId)
      )
        throw Error("This opportunity is no longer available");
      beginOpportunity(state, reaction, response.mode, role);
    }
  } else if (decision.use) {
    if (!Number.isInteger(response.slotLevel) || !shieldAvailable(state, actor, response.slotLevel))
      throw Error("Shield reaction or spell slot is no longer available");
    actor.reaction = false;
    spendSpellSlot(actor, response.slotLevel);
    if (state.combat.active) actor.lastSlotTurn = turnKey(state);
    actor.combatEffects ??= [];
    actor.combatEffects.push({
      type: "shield",
      actorId: actor.id,
      expires: "start",
      source: source([161, 162]),
      reactionId: id,
    });
  }
  reaction.status = decision.use ? "used" : "declined";
  if (decision.use)
    observeRestEvent(state, {
      eventId: reaction.id + ":used",
      actorIds: [actor.id],
      cause: reaction.type === "shield" ? "leveled-spell" : "activity",
    });
  reaction.response = response;
  reaction.resolvedBy = role;
  if (reaction.attemptId)
    completeAvailableOutcomes(
      state,
      state.combatAttempts.find((attempt) => attempt.id === reaction.attemptId),
    );
  refreshMovements(state);
  return reaction;
}
const automaticRequest = (attempt) =>
  attempt.requests.find(
    (entry) =>
      entry.actorId === attempt.actorId &&
      entry.status === "pending" &&
      entry.withdrawn !== true &&
      ["attack", "damage"].includes(entry.kind),
  );
// Known physical faces are never completed with digital dice: the controller types the rest.
const needsTypedFaces = (request) =>
  request.mode === "physical" && !Array.isArray(request.acceptedValues);
function nextAutomatic(state) {
  return (state.combatAttempts || []).find(
    (entry) =>
      entry.status === "pending" &&
      entry.mode === "digital" &&
      entry.acceptedBy &&
      canControl(state.actors[entry.actorId], entry.acceptedBy, state) &&
      automaticRequest(entry) &&
      !needsTypedFaces(automaticRequest(entry)),
  );
}
/** Whether an accepted digital attempt has attack/damage dice the app would roll now. */
export function hasAutomaticRolls(state) {
  return !!nextAutomatic(state);
}
export function resolveAutomaticRolls(state, rollDie) {
  const accepted = [];
  for (;;) {
    const attempt = nextAutomatic(state);
    if (!attempt) break;
    const request = automaticRequest(attempt);
    // Reuse every accepted face; only dice that were never rolled are generated.
    const known = request.acceptedValues ?? request.knownValues ?? [];
    const values = dieSides(request.dice).map((sides, index) =>
      Number.isInteger(known[index]) ? known[index] : rollDie(sides),
    );
    request.mode ??= "digital";
    request.automatic = true;
    resolveRoll(state, attempt.id, request.id, values, attempt.acceptedBy);
    accepted.push({ attemptId: attempt.id, requestId: request.id, actorId: request.actorId });
  }
  return accepted;
}
export function projectReactions(state, role) {
  return (state.combatReactions || [])
    .filter((reaction) => canControl(state.actors[reaction.actorId], role, state))
    .map((reaction) => {
      const actor = state.actors[reaction.actorId],
        movement = (state.movements || []).find((entry) => entry.id === reaction.movementId);
      const eligible =
        reaction.type === "shield"
          ? shieldAvailable(state, actor)
          : opportunityEligible(state, actor.id, reaction.targetId);
      const first = movement?.reactionOrder.find((id) => {
        const current = state.combatReactions.find((entry) => entry.id === id);
        return (
          current.status === "pending" ||
          (current.status === "used" &&
            state.combatAttempts.find((attempt) => attempt.id === current.createdAttemptId)
              .status === "pending")
        );
      });
      return {
        id: reaction.id,
        type: reaction.type,
        status: reaction.status,
        actorId: actor.id,
        actorName: actor.name,
        movementId: reaction.movementId,
        attemptId: reaction.attemptId,
        createdAttemptId: reaction.createdAttemptId,
        triggerLabel:
          reaction.type === "shield"
            ? reaction.trigger === "magic-missile"
              ? text("Sei bersaglio di Dardo incantato.", "You are targeted by Magic Missile.")
              : text(
                  "Un attacco ti ha colpito. Scudo aggiunge +5 CA, senza garantire che il colpo manchi.",
                  "An attack hit you. Shield adds +5 AC without guaranteeing a miss.",
                )
            : text(
                "Una creatura visibile sta uscendo dalla tua portata.",
                "A visible creature is leaving your reach.",
              ),
        cost: copy(reaction.cost),
        source: copy(reaction.source),
        slotLevels: reaction.type === "shield" ? spellLevels(actor) : [],
        canRespond:
          reaction.status === "pending" &&
          (reaction.type === "shield" ||
            (movement?.orderChosen && movement.status === "pending" && first === reaction.id)),
        canUse: !!eligible,
        resolvedBy: reaction.resolvedBy,
      };
    });
}
export function projectMovements(state, role) {
  return (state.movements || [])
    .filter((movement) => canControl(state.actors[movement.actorId], role, state))
    .map((movement) => ({
      id: movement.id,
      actorId: movement.actorId,
      actorName: state.actors[movement.actorId].name,
      status: movement.status,
      phase: movement.phase,
      position: copy(movement.position),
      destination: copy(movement.destination),
      traveledMeters: movement.traveledMeters,
      traveledCost: movement.traveledCost,
      remainingPathCost: Math.max(0, movement.plannedCost - movement.traveledCost),
      remainingPathMeters: Math.max(0, movement.plannedMeters - movement.traveledMeters),
      remainingMovement: state.actors[movement.actorId].movement,
      canRespond: canControl(state.actors[movement.actorId], role, state),
      reason: movement.reason,
      orderCandidates:
        movement.phase === "order"
          ? movement.reactionOrder.flatMap((id) => {
              const reaction = state.combatReactions.find((entry) => entry.id === id);
              return visible(state, reaction.actorId, role)
                ? [
                    {
                      reactionId: id,
                      actorId: reaction.actorId,
                      actorName: state.actors[reaction.actorId].name,
                    },
                  ]
                : [];
            })
          : [],
      orderRequiresDM:
        movement.phase === "order" &&
        !sessionAuthority(state, role) &&
        movement.reactionOrder.some(
          (id) =>
            !visible(
              state,
              state.combatReactions.find((reaction) => reaction.id === id).actorId,
              role,
            ),
        ),
    }));
}

// ---------------------------------------------------------------- conditions and survival
// Root adapters for increment 10. The domain (conditions.mjs) owns rules and history;
// these functions place its roll descriptors in this same request queue, run its
// tagged follow-ups inside the current transaction and report observed turn events.
const VITALITY_KINDS = ["death-save", "medicine", "stable-recovery"];
const VITALITY_NAMES = {
  "death-save": text("Tiro salvezza contro la morte", "Death Saving Throw"),
  medicine: text("Prova di Saggezza (Medicina)", "Wisdom (Medicine) check"),
  "stable-recovery": text("Recupero da stabile · 1d4 ore", "Stable recovery · 1d4 hours"),
};
const OBSERVED_TERMS = {
  "turn-start": () => (term) => term.kind === "turn",
  "turn-end": () => (term) => term.kind === "turn",
  clock: (event) => (term) => term.kind === "clock" && term.clockId === event.clockId,
  rest: () => (term) => term.kind === "rest",
  "concentration-end": (event) => (term) =>
    term.kind === "concentration" && term.concentrationId === event.concentrationId,
};
// Reports an observed fact only when some active condition or stable recovery could
// react to it; the domain decides what expires and keeps retries idempotent.
export function observeConditionTerms(state, event) {
  const matches = OBSERVED_TERMS[event.kind](event);
  const actors = Object.values(state.actors ?? {});
  const recovering =
    event.kind === "clock" &&
    actors.some(
      (a) => a?.deathSaves?.recovery?.clockId === event.clockId && a.deathSaves.recovery.expiresAt,
    );
  const due =
    recovering ||
    actors.some((a) =>
      (a?.conditions ?? []).some((c) => c && typeof c === "object" && c.term && matches(c.term)),
    );
  if (!due) return null;
  const result = observeConditionEvent(state, event);
  applyConditionFollowUps(state, result);
  return result;
}
// System-issued descriptors use an identity that currently controls the creature.
function withViewer(state, actor, run) {
  let error = Error("unavailable");
  for (const viewer of new Set([actor?.owner, ...(actor?.controllers ?? []), "dm"])) {
    if (!viewer || !canControl(actor, viewer, state)) continue;
    try {
      return run(viewer);
    } catch (caught) {
      error = caught;
    }
  }
  throw error;
}
// Retry identity of a vital roll: kind, roller, subject and occasion. The occasion is
// the subject's 0-HP episode (its knockout for a wake-up) plus, in initiative, the turn
// of a death save or of the Help action. Stable recovery is one per episode at a time.
// Faces are reused once (see reversedEvidence), so later rolls of the same episode are
// new rolls.
function vitalityRetryKey(state, attempt) {
  const d = attempt.descriptor;
  const subject = state.actors[d.targetId ?? d.actorId];
  const cause = d.context?.aidKind === "wake-knockout" ? "knockout" : "zero-hp";
  const episode =
    (subject?.conditions ?? []).find((c) => c && typeof c === "object" && c.cause === cause)
      ?.instanceId ?? null;
  const turn =
    d.kind === "death-save"
      ? (d.context?.turnKey ?? null)
      : d.kind === "medicine"
        ? attempt.turnKey
        : null;
  return JSON.stringify([
    "vitality",
    d.kind,
    d.actorId,
    d.targetId ?? d.actorId,
    d.context?.aidKind ?? null,
    episode,
    turn,
  ]);
}
function enqueueVitalityRequest(state, descriptor) {
  const id = "vitality:" + descriptor.id;
  const existing = (state.combatAttempts ?? []).find((attempt) => attempt.id === id);
  if (existing) return existing;
  const roller = state.actors[descriptor.actorId],
    target = state.actors[descriptor.targetId ?? descriptor.actorId];
  const attempt = {
    id,
    actorId: roller.id,
    actorName: trueNameOf(state, roller.id),
    actionId: descriptor.kind,
    actionName: copy(VITALITY_NAMES[descriptor.kind]),
    kind: "vitality",
    mode: null,
    status: "pending",
    requests: [],
    outcomes: [{ actorId: target.id, name: trueNameOf(state, target.id), status: "pending" }],
    targets: [],
    cost: {},
    source: copy(descriptor.source),
    damageType: null,
    turnKey: state.combat?.active ? turnKey(state) : null,
    selection: selectionCopy({}),
    geometry: null,
    // Never continued automatically: the controller rolls physical or digital dice.
    acceptedBy: null,
    descriptor: copy(descriptor),
  };
  // Undo never produces new faces (I-229): an identical request after Undo withdrew
  // the previous one carries its accepted faces as known faces.
  attempt.retryKey = vitalityRetryKey(state, attempt);
  const reused = reversedEvidence(state, attempt);
  if (reused) attempt.rollEvidence = reused;
  attempt.requests.push(
    requestFor(attempt, roller, descriptor.kind, descriptor.dice, descriptor.modifier, {
      targetId: target.id,
      dc: descriptor.dc,
      descriptorId: descriptor.id,
      rollMode: descriptor.context?.rollMode ?? "normal",
      modifierSources: copy(descriptor.modifierSources ?? []),
      ...(descriptor.kind === "medicine"
        ? { actionSpent: descriptor.context?.actionSpent === true }
        : {}),
    }),
  );
  (state.combatAttempts ||= []).push(attempt);
  return attempt;
}
function vitalityRollState(state, attempt, role) {
  const d = attempt.descriptor;
  try {
    return role
      ? getVitalityRollState(state, d, role)
      : withViewer(state, state.actors[d.actorId], (v) => getVitalityRollState(state, d, v));
  } catch (error) {
    return {
      needed: false,
      reason: { code: error.code ?? "unavailable", it: error.it, en: error.en ?? error.message },
    };
  }
}
function expireVitalityAttempt(attempt, reason) {
  const request = attempt.requests[0];
  if (request.status !== "pending") return;
  request.status = "expired";
  request.reason = reason?.code ?? "not-needed";
  request.expiredReason = copy(reason ?? null);
  Object.assign(attempt.outcomes[0], { status: "expired", reason: copy(reason ?? null) });
  attempt.status = "resolved";
}
function expireVitalityRequests(state, actorId = null, kind = null) {
  for (const attempt of state.combatAttempts ?? []) {
    if (attempt.kind !== "vitality" || attempt.status !== "pending") continue;
    const d = attempt.descriptor;
    if (actorId && d.actorId !== actorId && (d.targetId ?? d.actorId) !== actorId) continue;
    if (kind && d.kind !== kind) continue;
    const current = vitalityRollState(state, attempt, null);
    if (!current.needed) expireVitalityAttempt(attempt, current.reason);
  }
}
// A death save is due only at the creature's actual turn start.
function queueDeathSave(state, actorId, key) {
  const actor = state.actors[actorId];
  if (
    !actor ||
    actor.hp !== 0 ||
    actor.dead === true ||
    actor.vitalityPolicy?.zeroHp !== "death-saves" ||
    actor.deathSaves?.stable === true
  )
    return;
  try {
    const descriptor = withViewer(state, actor, (v) =>
      describeDeathSave(state, actorId, { triggerId: "turn:" + key, turnKey: key }, v),
    );
    enqueueVitalityRequest(state, descriptor);
  } catch {
    // Not due (already resolved for this turn) or no controller: nothing to queue.
  }
}
function queueStableRecovery(state, actorId) {
  try {
    const descriptor = withViewer(state, state.actors[actorId], (v) =>
      describeStableRecovery(state, actorId, v),
    );
    enqueueVitalityRequest(state, descriptor);
  } catch {
    // Stability already resolved or no longer current.
  }
}
// Keeps the actual movement spent and Dash count when a condition changes the speed.
function reconcileMovementBudget(state, actorId) {
  const actor = state.actors[actorId];
  if (
    !state.combat?.active ||
    state.combat.order?.[state.combat.turn] !== actorId ||
    !Number.isFinite(actor.movementSpent)
  )
    return;
  const speed = getEffectiveSpeed(actor);
  if (!Number.isFinite(speed)) return;
  const dash = Number.isInteger(actor.dashCount) && actor.dashCount > 0 ? actor.dashCount : 0;
  actor.movement = Math.max(
    0,
    Math.round((Math.max(0, speed) * (1 + dash) - actor.movementSpent) * 1e6) / 1e6,
  );
}
function manualConcentrationCheck(state, result, eventId) {
  const actor = state.actors[result.actorId];
  if (!actor?.concentration?.active) return;
  const attempt = {
    id: "damage-record:" + eventId,
    actorId: actor.id,
    actorName: trueNameOf(state, actor.id),
    actionId: "damage-record",
    actionName: text("Danno registrato", "Recorded damage"),
    kind: "record",
    mode: null,
    status: "pending",
    requests: [],
    outcomes: [
      {
        actorId: actor.id,
        name: trueNameOf(state, actor.id),
        status: "applied",
        damage: result.breakdown.damage,
        hpBefore: result.breakdown.hpBefore,
        hpAfter: result.breakdown.hpAfter,
      },
    ],
    targets: [],
    cost: {},
    source: copy(result.source ?? null),
    damageType: null,
    turnKey: state.combat?.active ? turnKey(state) : null,
    selection: selectionCopy({}),
    geometry: null,
    acceptedBy: null,
  };
  requestConcentration(state, attempt, actor, { id: "damage", damage: result.breakdown.damage });
  if (attempt.requests.length) (state.combatAttempts ||= []).push(attempt);
}
/**
 * Runs the domain's tagged follow-ups in the same transaction. `manual` marks damage
 * recorded from the conditions panel: it also interrupts rests and asks the
 * Concentration save that combat damage would ask, never a second HP change.
 */
export function applyConditionFollowUps(state, result, options = {}) {
  if (!result) return;
  const eventId = result.eventId ?? options.eventId ?? "condition-follow-up";
  const manualDamage =
    options.manual === true && result.kind === "damage" && result.breakdown?.damage > 0;
  if (manualDamage)
    observeRestEvent(state, {
      eventId: eventId + ":rest",
      actorIds: [result.actorId],
      cause: "damage",
    });
  for (const followUp of result.followUps ?? []) {
    if (!state.actors[followUp.actorId]) continue;
    if (followUp.kind === "end-concentration")
      endConcentration(state, followUp.actorId, followUp.concentrationId, followUp.reason);
    else if (followUp.kind === "start-knockout-rest") startKnockoutRest(state, followUp);
    else if (followUp.kind === "request-stable-recovery")
      queueStableRecovery(state, followUp.actorId);
    else if (followUp.kind === "expire-vitality-requests")
      expireVitalityRequests(state, followUp.actorId);
    else if (followUp.kind === "reconcile-actor") reconcileMovementBudget(state, followUp.actorId);
    // "held-items" stays a visible reconciliation on its instance: nothing is guessed.
  }
  if (manualDamage) manualConcentrationCheck(state, result, eventId);
}
// The one End Turn transition: end effects, next creature, a round's six seconds once,
// start effects (including a due death save), then the next turn's resources.
export function advanceTurn(
  state,
  { online = true, eventId = globalThis.crypto.randomUUID() } = {},
) {
  const current = state.actors[state.combat.order[state.combat.turn]];
  if (current) expireTurnEffects(state, current.id, "end");
  state.combat.turn = (state.combat.turn + 1) % state.combat.order.length;
  if (state.combat.turn === 0) {
    state.combat.round++;
    advanceRoundTime(state, { eventId, round: state.combat.round }, { online });
  }
  const next = state.actors[state.combat.order[state.combat.turn]];
  expireTurnEffects(state, next.id, "start");
  resetTurnMovement(next);
  next.action = true;
  next.bonus = true;
  next.reaction = true;
  next.objectInteractionUsed = false;
  return next.id;
}
/**
 * Starts an explicit vitality roll in the existing queue: `death-save` outside
 * initiative, `stable-recovery` for the current stability, or `medicine` (the Help
 * action through beginAid, spending the action once). Returns the request identity.
 */
export function beginVitalityRoll(state, input, role, options = {}) {
  const operationId = options.operationId ?? globalThis.crypto.randomUUID();
  const pending = (state.combatAttempts ?? []).find(
    (attempt) =>
      attempt.kind === "vitality" &&
      attempt.status === "pending" &&
      attempt.descriptor.kind === input?.kind &&
      attempt.descriptor.actorId === input?.actorId &&
      (input.kind !== "medicine" || attempt.descriptor.targetId === input.targetId),
  );
  let descriptor = pending?.descriptor;
  if (!descriptor) {
    if (input?.kind === "death-save")
      descriptor = describeDeathSave(
        state,
        input.actorId,
        { triggerId: "request:" + operationId, outsideInitiative: true },
        role,
      );
    else if (input?.kind === "stable-recovery")
      descriptor = describeStableRecovery(state, input.actorId, role);
    else if (input?.kind === "medicine")
      descriptor = beginAid(
        state,
        { actorId: input.actorId, targetId: input.targetId, kind: input.aidKind },
        role,
        {
          operationId,
          reviewKey: input.reviewKey,
          online: options.online !== false,
          effectiveActor: getEffectiveActor(state.actors[input.actorId]),
        },
      ).descriptor;
    else
      reject(
        failure("vitality-kind", "Tiro vitale non riconosciuto.", "Unrecognized vitality roll."),
      );
  }
  const attempt = enqueueVitalityRequest(state, descriptor);
  return { descriptorId: descriptor.id, attemptId: attempt.id, requestId: attempt.requests[0].id };
}
// Commit scope for beginVitalityRoll: personal sheets stay local and private.
export function vitalityCommit(state, input, role) {
  if (input?.kind === "medicine")
    return previewAid(
      state,
      { actorId: input.actorId, targetId: input.targetId, kind: input.aidKind },
      role,
      { effectiveActor: getEffectiveActor(state.actors[input.actorId]) },
    ).commit;
  const actor = state.actors[input?.actorId];
  const local =
    !!actor &&
    (actor.visibility === "private" ||
      (Array.isArray(actor.campaignIds) && actor.campaignIds.length === 0));
  return local ? { local: true, visibility: "private" } : { local: false, visibility: "shared" };
}
// Authorized projection of vitality requests where the creature rolls or is the subject.
export function projectVitalityRolls(state, actorId, role) {
  return (state.combatAttempts ?? [])
    .filter(
      (attempt) =>
        attempt.kind === "vitality" &&
        (attempt.descriptor.actorId === actorId || attempt.descriptor.targetId === actorId) &&
        (canControl(state.actors[attempt.actorId], role, state) ||
          canControl(state.actors[attempt.descriptor.targetId], role, state)) &&
        (attempt.requests[0].personal !== true || attempt.requests[0].owner === role),
    )
    .map((attempt) => ({
      descriptorId: attempt.descriptor.id,
      kind: attempt.descriptor.kind,
      status: attempt.requests[0].status,
      label: copy(attempt.actionName),
      attemptId: attempt.id,
      requestId: attempt.requests[0].id,
    }));
}
// Root-derived Stand up context: the form projection and pending causal requests.
export function standContextFor(state, actorId) {
  return {
    effectiveActor: getEffectiveActor(state.actors[actorId]),
    blocking: hasBlockingConsequences(state, actorId),
  };
}
/**
 * B34 (additive): a check or saving throw the DM requests from one creature (dnd5e roll
 * request FVT-146, Monk's TokenBar FVT-147) enters this same request queue as one attempt
 * of kind "roll-request". Its controller answers with physical or digital dice through
 * resolveRoll; the accepted roll reaches the log like any request. Nothing is applied: no
 * outcome, cost or turn gate. The caller (roll-requests.mjs) computes the modifier from
 * the sheet. Returns the existing attempt when the same id is enqueued again.
 */
export function enqueueRollRequest(state, input, role) {
  // C3 (CA-57): whoever runs the session asks for rolls.
  if (!sessionAuthority(state, role))
    reject(
      failure("request-not-permitted", "Solo il DM chiede tiri.", "Only the DM requests rolls."),
    );
  const actor = state.actors[input?.actorId];
  if (!actor || !isActorAvailable(actor) || actor.visibility === "private")
    reject(
      failure(
        "request-actor",
        "Questa creatura non può ricevere richieste.",
        "This creature cannot receive requests.",
      ),
    );
  if (!["check", "save"].includes(input.kind) || typeof input.id !== "string" || !input.id)
    reject(failure("request-kind", "Richiesta di tiro non valida.", "Invalid roll request."));
  if (!Number.isFinite(input.modifier))
    reject(
      failure(
        "roll-data-missing",
        "Manca il modificatore verificato del tiro: correggi la scheda.",
        "The verified roll modifier is missing: correct the sheet.",
      ),
    );
  const id = "roll-request:" + input.id;
  const existing = (state.combatAttempts ?? []).find((attempt) => attempt.id === id);
  if (existing) return existing;
  const rollMode = ["advantage", "disadvantage"].includes(input.rollMode)
    ? input.rollMode
    : "normal";
  const attempt = {
    id,
    actorId: actor.id,
    actorName: trueNameOf(state, actor.id),
    actionId: "roll-request",
    actionName: copy(input.label),
    kind: "roll-request",
    mode: null,
    status: "pending",
    requests: [],
    outcomes: [],
    targets: [],
    cost: {},
    source: copy(input.source ?? null),
    damageType: null,
    turnKey: state.combat?.active ? turnKey(state) : null,
    selection: selectionCopy({}),
    geometry: null,
    acceptedBy: role,
    rollRequest: copy(input.meta ?? {}),
  };
  // PG-47: the creature's riders roll with the requested save (Bless, Bane) or check; a
  // caller that computed its own riders passes `riders` (an empty list for none).
  const riders = Array.isArray(input.riders)
    ? input.riders
    : ridersFor(state, actor.id, input.kind === "save" ? "save" : "check");
  const fields = d20Fields(riders, rollMode, input.modifier, input.modifierSources);
  attempt.requests.push(
    requestFor(attempt, actor, input.kind, fields.dice, fields.modifier, {
      dc: Number.isInteger(input.dc) ? input.dc : null,
      rollMode,
      ability: input.ability ?? null,
      skill: input.skill ?? null,
      modifierSources: fields.modifierSources,
      ...(fields.riders ? { riders: fields.riders } : {}),
    }),
  );
  (state.combatAttempts ||= []).push(attempt);
  return attempt;
}
