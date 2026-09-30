// B46 — Knowledge, examination, hidden identity, stealth, cover modifiers and pickpocket:
// pure domain (no DOM). The UI and registration live in knowledge.mjs.
//
// Patterns copied (IDs from docs/interview/CAPABILITY_CENSUS.md and
// changes/interview-01/market-census/*.md):
// - Solasta graded bestiary: a creature card shown at the party's knowledge level, 1/4 to
//   4/4, raised by identification checks; an option unlocks everything (CRP-135).
// - Pathfinder WotR pooled knowledge: one result for the whole party; the lore DC grows
//   with the creature's challenge, DC 10 + CR (CRP-136).
// - BG3 Examine window: conditions, resistances, saves, description (CRP-134), limited here
//   to what the party knows (census choice C9).
// - Fantasy Grounds ID toggle "unidentified creature" with a non-ID name, Foundry Anonymous,
//   Beyond20 hidden monster name (R20-155, FVT-126, VTL-223).
// - BG3 sneaking: who can see you, stealth loss explained in the log (CRP-144), obscurity
//   states with darkvision (CRP-145).
// - XCOM cover preview (CRP-116), Owlbear Peekaboo lines (VTL-138): see cover.mjs.
// - BG3 modifiers listed under the target (CRP-119) and hit chance on hover (CRP-126), the
//   chance only when the campaign's disclosure policy allows it (census C9).
// - BG3 pickpocket and reverse pickpocket (CRP-151) as a Sleight of Hand check the DM
//   adjudicates.
//
// Rules: D&D 2024, SRD 5.2.1 EN/IT (pages below, checked in the official PDFs). Knowledge
// tiers, the lore DC and the pickpocket flow are this app's authored defaults (each has its
// own source record), never an SRD citation. Synthetic data only; local two-role demo, no
// backend authorization.

import * as C from "./cover.mjs";
import { getById, LABELS, srdSource, feetToMeters } from "./srd-sample.mjs";
import { canViewActor, canControlActor, isActorAvailable } from "./character-access.mjs";
import { hasCondition, applyConditionEvent, listConditionDefinitions } from "./conditions.mjs";
import { checkProfile, passiveScore } from "./travel-domain.mjs";
import { giveItemToActor, takeItemFromActor } from "./party-stash.mjs";
import * as FV from "./fog-vision-domain.mjs";
import { skills as SKILLS } from "./character-rules.mjs";
import { getEffectiveActor } from "./forms-companions.mjs";
import { listActions } from "./combat.mjs";
import { hasLineOfSight } from "./spatial.mjs";
import { hiddenName as menuHiddenName } from "./token-menu.mjs";
import { playerDisclosure } from "./chat-domain.mjs";

export const ID = "knowledge";
export const ROLLS = "knowledge-rolls";
export const POLICY = "knowledge-policy";
export const VERSION = 1;
const L = (it, en) => Object.freeze({ it, en });
const copy = (value) => structuredClone(value);
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const filled = (value, max = 300) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
const newId = (prefix) =>
  prefix +
  "-" +
  (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36))
    .replace(/-/g, "")
    .slice(0, 12);
export const fail = (it, en, code = "refused") => {
  throw Object.assign(new Error(en), { it, en, code });
};
const mod = (score) => Math.floor(((Number.isFinite(score) ? score : 10) - 10) / 2);

// ---------------------------------------------------------------- sources

export const SOURCES = Object.freeze({
  study: srdSource([189], [216]),
  hide: srdSource([183], [210]),
  obscured: srdSource([11, 182], [12, 211]),
  invisible: srdSource([184], [209]),
  passive: srdSource([186], [211]),
  search: srdSource([187], [212]),
  sleight: srdSource([9], [10]),
  unseen: srdSource([14], [16]),
  cover: C.COVER_SOURCE,
  tiers: Object.freeze({
    kind: "authored-demo",
    edition: "2024",
    revision: "b46-knowledge-tiers-v1",
    title: L(
      "Livelli di conoscenza 1–4 come il bestiario di Solasta (CRP-135)",
      "Knowledge tiers 1–4 like Solasta's bestiary (CRP-135)",
    ),
  }),
  loreDc: Object.freeze({
    kind: "authored-demo",
    edition: "2024",
    revision: "b46-lore-dc-v1",
    title: L(
      "CD proposta 10 + GS, come la conoscenza dei mostri di Pathfinder (CRP-136); il DM la cambia",
      "Proposed DC 10 + CR, like Pathfinder monster lore (CRP-136); the DM changes it",
    ),
  }),
  pickpocket: Object.freeze({
    kind: "authored-demo",
    edition: "2024",
    revision: "b46-pickpocket-v1",
    title: L(
      "Borseggio: richiesta, decisione del DM, prova di Rapidità di Mano (CRP-151)",
      "Pickpocket: request, DM decision, Sleight of Hand check (CRP-151)",
    ),
  }),
});

// SRD 5.2.1 "Study" (EN 189 / IT 216), Areas of Knowledge table: the skill for each type.
export const TYPE_SKILL = Object.freeze({
  aberration: "arcana",
  construct: "arcana",
  elemental: "arcana",
  fey: "arcana",
  monstrosity: "arcana",
  giant: "history",
  humanoid: "history",
  beast: "nature",
  dragon: "nature",
  ooze: "nature",
  plant: "nature",
  celestial: "religion",
  fiend: "religion",
  undead: "religion",
});
export const skillName = (id) => SKILLS.find((skill) => skill.id === id)?.name ?? L(id, id);

// Solasta's four tiers (CRP-135): what each level of the party's knowledge shows.
export const TIERS = Object.freeze([
  Object.freeze({
    level: 1,
    title: L("Riconoscimento", "Recognition"),
    fields: L("nome, taglia e tipo", "name, size and type"),
  }),
  Object.freeze({
    level: 2,
    title: L("Difese", "Defences"),
    fields: L(
      "CA, punti ferita tipici, velocità e sensi",
      "AC, typical hit points, speed and senses",
    ),
  }),
  Object.freeze({
    level: 3,
    title: L("Capacità", "Capabilities"),
    fields: L(
      "caratteristiche, tiri salvezza, abilità e attacchi",
      "ability scores, saving throws, skills and attacks",
    ),
  }),
  Object.freeze({
    level: 4,
    title: L("Segreti", "Secrets"),
    fields: L(
      "vulnerabilità, resistenze, immunità, tratti, reazioni e GS",
      "vulnerabilities, resistances, immunities, traits, reactions and CR",
    ),
  }),
]);
export const MAX_LEVEL = 4;
export const HIDE_DC = 15;
export const ALIAS_MAX = 60;
export const REASON_MAX = 200;
const GOBLIN = "srd2024:creature:goblin-warrior";

// ---------------------------------------------------------------- slices

/** Seed: the sample goblins are linked to the SRD Goblin Warrior profile (DM can change). */
export function seedSlice(state = null) {
  const links = {};
  for (const id of ["goblin-1", "goblin-2"]) if (!state || state.actors?.[id]) links[id] = GOBLIN;
  return {
    campaigns: {},
    links,
    identities: {},
    hidden: {},
    events: [],
    shared: {},
    pickpocket: [],
  };
}
export function normalizeSlice(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Knowledge data from a newer version");
  const base = seedSlice();
  const out = isObject(slice) ? slice : base;
  for (const key of ["campaigns", "links", "identities", "hidden", "shared"])
    if (!isObject(out[key])) out[key] = isObject(slice) ? {} : base[key];
  for (const key of ["events", "pickpocket"]) if (!Array.isArray(out[key])) out[key] = [];
  for (const [cid, record] of Object.entries(out.campaigns)) {
    if (!isObject(record) || !isObject(record.kinds)) out.campaigns[cid] = { kinds: {} };
    for (const [kind, entry] of Object.entries(out.campaigns[cid].kinds)) {
      if (!isObject(entry) || !Number.isInteger(entry.level)) {
        delete out.campaigns[cid].kinds[kind];
        continue;
      }
      entry.level = Math.min(MAX_LEVEL, Math.max(1, entry.level));
      if (!Array.isArray(entry.history)) entry.history = [];
      if (!isObject(entry.blocked)) entry.blocked = {};
    }
  }
  for (const [actorId, record] of Object.entries(out.hidden))
    if (!isObject(record) || typeof record.id !== "string" || !Number.isFinite(record.total))
      delete out.hidden[actorId];
    else {
      if (!Array.isArray(record.seenAttempts)) record.seenAttempts = [];
      if (!Array.isArray(record.ignore)) record.ignore = [];
      if (!Number.isFinite(record.seenChatSeq)) record.seenChatSeq = 0;
    }
  for (const [actorId, record] of Object.entries(out.identities))
    if (
      !isObject(record) ||
      !filled(record.alias, ALIAS_MAX) ||
      typeof record.trueName !== "string"
    )
      delete out.identities[actorId];
  return out;
}
export const seedRolls = () => ({ rolls: [] });
export function normalizeRolls(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Knowledge rolls from a newer version");
  return { rolls: Array.isArray(slice?.rolls) ? slice.rolls.filter(isObject) : [] };
}
export const sliceOf = (state) => (isObject(state?.ext?.[ID]) ? state.ext[ID] : seedSlice());
const rollsOf = (state) => (isObject(state?.ext?.[ROLLS]) ? state.ext[ROLLS] : seedRolls());
export const campaignIdOf = (state) => state?.campaign?.id ?? "lanterns";
function campaignRecord(slice, state) {
  const cid = campaignIdOf(state);
  slice.campaigns[cid] ??= { kinds: {} };
  return slice.campaigns[cid];
}
function pushEvent(slice, entry) {
  slice.events.push(entry);
  if (slice.events.length > 200) slice.events.splice(0, slice.events.length - 200);
  return entry;
}

// ---------------------------------------------------------------- policy (census C9)

/** The campaign's disclosure policy, read from the registry's campaign settings. */
export function policyOf(state) {
  const settings = state?.ext?.["core-settings"]?.campaign ?? {};
  const chance = settings[POLICY + ".hit-chance"];
  return {
    mode: settings[POLICY + ".mode"] === "full" ? "full" : "graded",
    hitChance: ["never", "known", "always"].includes(chance) ? chance : "never",
  };
}

// ---------------------------------------------------------------- scene helpers

export const activeScene = (state) =>
  state?.scenes?.find((scene) => scene.id === state.activeSceneId) ?? null;
export const tokenOf = (scene, actorId) =>
  scene?.tokens?.find((token) => token.actorId === actorId) ?? null;
// Additive seam: what else hides a token from a viewer on this device (the fog and vision of
// B35, registered by knowledge.mjs). A filter returns false for a creature the viewer cannot
// perceive; one that throws hides nothing.
const visibilityFilters = new Set();
export function addVisibilityFilter(filter) {
  if (typeof filter === "function") visibilityFilters.add(filter);
  return () => visibilityFilters.delete(filter);
}
function perceived(state, actorId, role) {
  for (const filter of visibilityFilters)
    try {
      if (filter(state, actorId, role) === false) return false;
    } catch {
      /* the Table's own rule decides */
    }
  return true;
}
/**
 * The Table's own rule (table.mjs / token-menu observesToken): the viewer sees this token,
 * and the fog and vision do not hide it (a player learns nothing of a creature in the dark).
 */
export function observes(state, token, role) {
  const subject = state?.actors?.[token?.actorId];
  return Boolean(
    token &&
    isActorAvailable(subject) &&
    (!subject.companion || canViewActor(subject, role, state)) &&
    (subject.visibility !== "private" || canViewActor(subject, role, state)) &&
    (canControlActor(subject, role, state) ||
      (!subject.hidden &&
        !token.hidden &&
        token.visible !== false &&
        perceived(state, token.actorId, role))),
  );
}
const sampleTeam = (actor) =>
  ["livia", "doran"].includes(actor?.id)
    ? "party"
    : ["goblin-1", "goblin-2"].includes(actor?.id)
      ? "watch"
      : null;
/** Team as combat reads it (combat.mjs profileFor): party characters, the watch. */
export function teamOf(actor) {
  return (
    actor?.combatProfile?.team ??
    sampleTeam(actor) ??
    (actor?.kind === "character" && !actor.companion ? "party" : null)
  );
}
export const opposed = (a, b) =>
  (a === "party" && b === "watch") || (a === "watch" && b === "party");
/** Creatures on the active scene whose team opposes this creature's team. */
export function opponentsOf(state, actorId) {
  const scene = activeScene(state);
  const team = teamOf(state.actors?.[actorId]);
  return (scene?.tokens ?? [])
    .map((token) => token.actorId)
    .filter((id) => {
      const actor = state.actors?.[id];
      return (
        id !== actorId &&
        actor &&
        isActorAvailable(actor) &&
        !actor.dead &&
        opposed(team, teamOf(actor))
      );
    });
}
export function spaceOf(state, scene, actorId) {
  const token = tokenOf(scene, actorId);
  return token ? { id: actorId, ...C.footprint(scene, token, state.actors?.[actorId]) } : null;
}
/** Other creatures that may give Half cover between two creatures (live, not dead). */
function blockersFor(state, scene, ids, role) {
  return (scene?.tokens ?? [])
    .filter(
      (token) =>
        !ids.includes(token.actorId) &&
        state.actors?.[token.actorId] &&
        isActorAvailable(state.actors[token.actorId]) &&
        !state.actors[token.actorId].dead &&
        (role === "dm" || observes(state, token, role)),
    )
    .map((token) => spaceOf(state, scene, token.actorId));
}
/**
 * Cover of `targetId` against an attack from `attackerId`; `from`/`to` move either space to
 * a point being considered (a destination, a hiding place).
 */
export function coverFor(
  state,
  attackerId,
  targetId,
  { role = "dm", from = null, to = null } = {},
) {
  const scene = activeScene(state);
  const attacker = spaceOf(state, scene, attackerId);
  const target = spaceOf(state, scene, targetId);
  if (!scene || !attacker || !target) return null;
  const a = from ? { ...attacker, x: from.x, y: from.y } : attacker;
  const b = to ? { ...target, x: to.x, y: to.y } : target;
  return C.coverBetween(scene, a, b, {
    blockers: blockersFor(state, scene, [attackerId, targetId], role),
    role: role === "dm" ? "dm" : "player",
  });
}
/** Cover a creature would have at `point` against each opponent (XCOM destination). */
export function coverAtDestination(state, actorId, point, role = "dm") {
  const scene = activeScene(state);
  const mover = spaceOf(state, scene, actorId);
  if (!scene || !mover) return [];
  const target = { ...mover, x: point.x, y: point.y };
  return opponentsOf(state, actorId)
    .filter((id) => role === "dm" || observes(state, tokenOf(scene, id), role))
    .map((id) => {
      const from = spaceOf(state, scene, id);
      const cover = C.coverBetween(scene, from, target, {
        blockers: blockersFor(state, scene, [id, actorId], role),
        role: role === "dm" ? "dm" : "player",
      });
      return { id, name: state.actors[id].name, degree: cover.degree, acBonus: cover.acBonus };
    });
}

// ---------------------------------------------------------------- bestiary and knowledge

/** The creature profile an NPC is linked to (compendium, encounter or DM link), or null. */
export function kindOf(state, actorId) {
  const actor = state?.actors?.[actorId];
  if (!actor || actor.kind !== "npc") return null;
  const id =
    actor.compendiumRef?.id ?? actor.encounterBlock?.creatureId ?? sliceOf(state).links[actorId];
  const block = id ? getById(id) : null;
  return block?.kind === "creature" ? block : null;
}
export function knowledgeLevel(state, kindId) {
  if (!kindId) return 0;
  if (policyOf(state).mode === "full") return MAX_LEVEL;
  return sliceOf(state).campaigns?.[campaignIdOf(state)]?.kinds?.[kindId]?.level ?? 1;
}
const kindRecord = (state, kindId) =>
  sliceOf(state).campaigns?.[campaignIdOf(state)]?.kinds?.[kindId] ?? null;
export const loreDc = (block) => 10 + Math.max(0, Math.floor(block?.crValue ?? 0));
export const studySkill = (block) => TYPE_SKILL[block?.type] ?? "arcana";

/** The hidden-identity record while it still applies (the actor still wears the alias). */
export function identityOf(state, actorId) {
  const record = sliceOf(state).identities?.[actorId];
  return record && state.actors?.[actorId]?.name === record.alias ? record : null;
}
/**
 * Any hidden identity a player must not see through: this area's unidentified name, or a
 * name hidden from the token menu (B12 «Nascondi il nome ai giocatori», same TV-141
 * pattern). Review B46-rf: without the second, Examine named the profile ("Goblin
 * guerriero") of a creature whose name the DM had hidden.
 */
export function unknownIdentity(state, actorId) {
  const own = identityOf(state, actorId);
  if (own) return { source: "knowledge", alias: own.alias, trueName: own.trueName };
  const menu = menuHiddenName(state, state?.ext?.["token-menu"], actorId);
  return menu
    ? { source: "token-menu", alias: state.actors[actorId].name, trueName: menu.trueName }
    : null;
}
/** Text replacements for the DM's screen: "alias" → "alias · true name" (like B12). */
export function aliasProjections(state) {
  return Object.entries(sliceOf(state).identities ?? {})
    .filter(([actorId]) => identityOf(state, actorId))
    .map(([actorId, record]) => ({ actorId, from: record.alias, trueName: record.trueName }))
    .sort((a, b) => b.from.length - a.from.length);
}

let conditionNames = null;
const CONDITION_NAMES = () =>
  (conditionNames ??= new Map(
    listConditionDefinitions().map((row) => [row.id, L(row.name.it, row.name.en)]),
  ));
const labelOf = (group, key) => LABELS[group]?.[key] ?? L(String(key ?? ""), String(key ?? ""));
const typeLabel = (block) => {
  const type = labelOf("creatureType", block.type);
  const tags = (block.typeTags ?? []).map((tag) => labelOf("creatureTag", tag));
  return tags.length
    ? L(
        `${type.it} (${tags.map((t) => t.it).join(", ")})`,
        `${type.en} (${tags.map((t) => t.en).join(", ")})`,
      )
    : type;
};
const metres = (feet) => `${String(feetToMeters(feet)).replace(".", ",")} m`;
const metresEn = (feet) => `${feetToMeters(feet)} m`;
function speedText(actor, block) {
  if (Number.isFinite(actor?.speed)) return L(`${actor.speed} m`, `${actor.speed} m`);
  const walk = block?.speed?.walk;
  return Number.isFinite(walk) ? L(metres(walk), metresEn(walk)) : L("—", "—");
}
function sensesText(state, actor, block) {
  const parts = [];
  const dv = block?.senses?.darkvision;
  if (Number.isFinite(dv))
    parts.push(L(`scurovisione ${metres(dv)}`, `darkvision ${metresEn(dv)}`));
  const pp = passiveScore(actor, { ability: "wis", skill: "perception" });
  parts.push(L(`Percezione passiva ${pp}`, `Passive Perception ${pp}`));
  return L(parts.map((p) => p.it).join("; "), parts.map((p) => p.en).join("; "));
}
const listText = (group, list) =>
  list?.length
    ? L(
        list.map((key) => labelOf(group, key).it).join(", "),
        list.map((key) => labelOf(group, key).en).join(", "),
      )
    : L("nessuna", "none");
const actionRows = (list) =>
  (list ?? []).map((entry) => ({
    name: copy(entry.name),
    summary: copy(entry.summary ?? L("", "")),
  }));

const ABILITY_SHORT = Object.freeze({
  it: ["For", "Des", "Cos", "Int", "Sag", "Car"],
  en: ["Str", "Dex", "Con", "Int", "Wis", "Cha"],
});
function saveText(state, actor) {
  const bonuses = ["str", "dex", "con", "int", "wis", "cha"].map((ability) => {
    const bonus = checkProfile(state, { actorId: actor?.id, ability, save: true }).baseBonus;
    return `${bonus >= 0 ? "+" : "−"}${Math.abs(bonus)}`;
  });
  const line = (lang) => ABILITY_SHORT[lang].map((s, i) => `${s} ${bonuses[i]}`).join(" · ");
  return L(line("it"), line("en"));
}
/** Every tier of a profile for one actor (values of this creature first, then the block). */
function tierRows(state, actor, block) {
  const abilities = actor?.abilities ?? block.abilities ?? {};
  return {
    1: [
      { label: L("Creatura", "Creature"), value: copy(block.name) },
      { label: L("Taglia", "Size"), value: labelOf("size", actor?.size ?? block.size?.[0]) },
      { label: L("Tipo", "Type"), value: typeLabel(block) },
    ],
    2: [
      {
        label: L("Classe Armatura", "Armor Class"),
        value: L(String(actor?.ac ?? block.ac), String(actor?.ac ?? block.ac)),
      },
      {
        label: L("Punti ferita tipici", "Typical hit points"),
        value: L(
          `${block.hp?.average} (${block.hp?.formula})`,
          `${block.hp?.average} (${block.hp?.formula})`,
        ),
      },
      { label: L("Velocità", "Speed"), value: speedText(actor, block) },
      { label: L("Sensi", "Senses"), value: sensesText(state, actor, block) },
    ],
    3: [
      {
        label: L("Caratteristiche", "Ability scores"),
        value: L(
          ["For", "Des", "Cos", "Int", "Sag", "Car"]
            .map((short, i) => {
              const score = abilities[["str", "dex", "con", "int", "wis", "cha"][i]];
              return `${short} ${score} (${mod(score) >= 0 ? "+" : "−"}${Math.abs(mod(score))})`;
            })
            .join(" · "),
          ["Str", "Dex", "Con", "Int", "Wis", "Cha"]
            .map((short, i) => {
              const score = abilities[["str", "dex", "con", "int", "wis", "cha"][i]];
              return `${short} ${score} (${mod(score) >= 0 ? "+" : "−"}${Math.abs(mod(score))})`;
            })
            .join(" · "),
        ),
      },
      // Tier 3 announces "saving throws": the live sheet's save bonuses, as the checks read
      // them (travel-domain checkProfile), without temporary penalties (review B46-rf).
      { label: L("Tiri salvezza", "Saving throws"), value: saveText(state, actor) },
      {
        label: L("Abilità", "Skills"),
        value: Object.keys(block.skills ?? {}).length
          ? L(
              Object.entries(block.skills)
                .map(([id, bonus]) => `${skillName(id).it} +${bonus}`)
                .join(", "),
              Object.entries(block.skills)
                .map(([id, bonus]) => `${skillName(id).en} +${bonus}`)
                .join(", "),
            )
          : L("nessuna", "none"),
      },
      { label: L("Azioni", "Actions"), list: actionRows(block.actions) },
    ],
    4: [
      {
        label: L("Vulnerabilità", "Vulnerabilities"),
        value: listText("damageType", block.vulnerabilities),
      },
      { label: L("Resistenze", "Resistances"), value: listText("damageType", block.resistances) },
      { label: L("Immunità", "Immunities"), value: listText("damageType", block.immunities) },
      {
        label: L("Immunità alle condizioni", "Condition immunities"),
        value: block.conditionImmunities?.length
          ? L(
              block.conditionImmunities.map((id) => CONDITION_NAMES().get(id)?.it ?? id).join(", "),
              block.conditionImmunities.map((id) => CONDITION_NAMES().get(id)?.en ?? id).join(", "),
            )
          : L("nessuna", "none"),
      },
      {
        label: L("Tratti e azioni bonus", "Traits and bonus actions"),
        list: actionRows([...(block.traits ?? []), ...(block.bonusActions ?? [])]),
      },
      { label: L("Reazioni", "Reactions"), list: actionRows(block.reactions) },
      {
        label: L("Grado di sfida", "Challenge rating"),
        value: L(`GS ${block.cr} (${block.xp} PE)`, `CR ${block.cr} (${block.xp} XP)`),
      },
    ],
  };
}

/**
 * What a viewer may read about a creature (BG3 Examine at the party's Solasta level).
 * Players receive only the tiers the party knows: locked tiers carry their title and what
 * they hide, never their values (census C9). While the identity is hidden a player learns
 * nothing of the profile. The DM reads everything, with the tier's player visibility.
 */
export function examineView(state, actorId, viewer) {
  const actor = state?.actors?.[actorId];
  if (!actor) return null;
  const scene = activeScene(state);
  const dm = viewer === "dm";
  const identity = unknownIdentity(state, actorId);
  const block = kindOf(state, actorId);
  const level = block ? knowledgeLevel(state, block.id) : 0;
  const shown = dm ? MAX_LEVEL : identity ? 0 : level;
  const rows = block ? tierRows(state, actor, block) : {};
  const sections = [];
  const locked = [];
  for (const tier of TIERS) {
    if (!block) break;
    if (tier.level <= shown)
      sections.push({
        level: tier.level,
        title: copy(tier.title),
        rows: copy(rows[tier.level]),
        players: tier.level <= level && !identity,
      });
    else if (!identity || dm)
      locked.push({ level: tier.level, title: copy(tier.title), fields: copy(tier.fields) });
  }
  const record = block ? kindRecord(state, block.id) : null;
  const history = (record?.history ?? []).map((entry) => ({
    ...copy(entry),
    ...(dm
      ? {}
      : { dc: undefined, reason: entry.kind === "correction" ? entry.reason : undefined }),
  }));
  const conditions = (actor.conditions ?? [])
    .filter((c) => !(isObject(c) && c.visibility === "private" && c.owner !== viewer))
    .map((c) => (typeof c === "string" ? c : c?.id))
    .filter(Boolean);
  // Condition names in both languages (review B46-rf: raw ids like "prone" were shown).
  const conditionNames = [...new Set(conditions)].map((id) =>
    copy(CONDITION_NAMES().get(id) ?? L(id, id)),
  );
  return {
    actorId,
    name: actor.name,
    trueName: dm && identity ? identity.trueName : null,
    identityHidden: Boolean(identity),
    identitySource: identity?.source ?? null,
    linked: Boolean(block),
    kindId: shown >= 1 && block ? block.id : null,
    level: identity && !dm ? null : level,
    maxLevel: MAX_LEVEL,
    mode: policyOf(state).mode,
    size: labelOf("size", actor.size ?? "medium"),
    onScene: Boolean(tokenOf(scene, actorId)),
    conditions: conditionNames,
    sections,
    locked,
    history: shown >= 1 || dm ? history : [],
    blocked: dm && record ? copy(record.blocked) : {},
    source: block && shown >= 1 ? copy(block.source) : null,
    study:
      block && !identity
        ? {
            skill: studySkill(block),
            skillName: skillName(studySkill(block)),
            ...(dm ? { dc: loreDc(block) } : {}),
          }
        : null,
  };
}

// ---------------------------------------------------------------- rolls (I-229 like travel)

/** Roll ids the snapshot slice still references: any other accepted roll was undone. */
export function appliedRollIds(slice) {
  const ids = new Set();
  const walk = (value) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (isObject(value))
      for (const [key, inner] of Object.entries(value))
        if (key === "rollId" && typeof inner === "string") ids.add(inner);
        else walk(inner);
  };
  walk(slice);
  return ids;
}
export const validFace = (face, sides) => Number.isInteger(face) && face >= 1 && face <= sides;
/**
 * One accepted roll in the preserved roll slice. A digital retry with the same key after an
 * Undo reuses the faces of the undone roll once: Undo is never a free reroll (I-229).
 */
export function acceptRoll(rolls, applied, { key, sides = 20, count, mode, faces, rng, meta }) {
  let values;
  let reusedFrom = null;
  if (mode === "physical") {
    values = (faces ?? []).map(Number);
    if (values.length !== count || values.some((face) => !validFace(face, sides)))
      fail(
        `Inserisci ${count === 1 ? "la faccia" : `le ${count} facce`} del d${sides} fisico (da 1 a ${sides}).`,
        `Enter the physical d${sides} ${count === 1 ? "face" : `${count} faces`} (1 to ${sides}).`,
        "faces",
      );
  } else if (mode === "digital") {
    const withdrawn = rolls.rolls.find(
      (r) =>
        r.key === key &&
        r.mode === "digital" &&
        !r.reusedBy &&
        !applied.has(r.id) &&
        r.values.length === count &&
        r.sides === sides,
    );
    if (withdrawn) {
      values = [...withdrawn.values];
      reusedFrom = withdrawn.id;
    } else values = Array.from({ length: count }, () => rng(sides));
  } else fail("Scegli dadi digitali o fisici.", "Choose digital or physical dice.", "mode");
  const roll = {
    id: newId("kroll"),
    key,
    sides,
    mode,
    values,
    reusedFrom,
    reusedBy: null,
    ...meta,
  };
  if (reusedFrom) rolls.rolls.find((r) => r.id === reusedFrom).reusedBy = roll.id;
  rolls.rolls.push(roll);
  if (rolls.rolls.length > 300) rolls.rolls.splice(0, rolls.rolls.length - 300);
  return roll;
}
const d20Result = (values, mode) =>
  mode === "advantage"
    ? Math.max(...values)
    : mode === "disadvantage"
      ? Math.min(...values)
      : values[0];
const diceFor = (mode) => (mode === "normal" ? 1 : 2);
/** Bonus and d20 mode of a check as the sheet and the conditions set them. */
export function checkModeOf(state, actorId, ability, skill) {
  const profile = checkProfile(state, { actorId, ability, skill, save: false });
  return { bonus: profile.bonus, mode: profile.mode, reasons: profile.reasons };
}
/** Passive Wisdom (Perception), SRD EN 186 / IT 211. */
export const passiveOf = (state, actorId) =>
  passiveScore(state.actors?.[actorId], { ability: "wis", skill: "perception" });
/** A d20 check with the sheet's bonus and condition-driven mode (travel-domain profile). */
function rollCheck(state, slice, rolls, { actorId, ability, skill, key, mode, faces, rng, meta }) {
  const profile = checkProfile(state, { actorId, ability, skill, save: false });
  const roll = acceptRoll(rolls, appliedRollIds(slice), {
    key,
    count: diceFor(profile.mode),
    mode,
    faces,
    rng,
    meta: { actorId, rollMode: profile.mode, modifier: profile.bonus, ...meta },
  });
  roll.natural = d20Result(roll.values, profile.mode);
  roll.total = roll.natural + profile.bonus;
  return { roll, profile };
}
/** The Table log's roll shape (dice, chat and B56 listen to "roll-accepted"). */
export function logRoll(state, roll) {
  return {
    id: roll.id,
    source: "knowledge",
    kind: roll.kind,
    actorId: roll.actorId ?? null,
    actorName: roll.actorId ? (state.actors?.[roll.actorId]?.name ?? null) : null,
    label: copy(roll.label),
    controller: roll.by,
    owner: roll.by,
    visibility: roll.visibility ?? "shared",
    mode: roll.mode,
    dice: [{ count: roll.values.length, sides: roll.sides }],
    values: [...roll.values],
    natural: roll.natural ?? roll.values[0],
    modifier: roll.modifier ?? 0,
    total: roll.total,
    dc: roll.publicDc ?? null,
    rollMode: roll.rollMode ?? "normal",
    status: roll.reusedFrom ? "reused" : "accepted",
  };
}

// ---------------------------------------------------------------- permissions

function requireDM(role) {
  if (role !== "dm") fail("Solo il DM può farlo.", "Only the DM can do this.", "dm-only");
}
function requireControl(state, actorId, role) {
  const actor = state.actors?.[actorId];
  if (!actor || !isActorAvailable(actor))
    fail("Creatura non disponibile.", "Creature unavailable.", "unavailable");
  if (!canControlActor(actor, role, state))
    fail("Non controlli questa creatura.", "You do not control this creature.", "not-controller");
  return actor;
}
function requireObserved(state, actorId, role) {
  const scene = activeScene(state);
  if (!observes(state, tokenOf(scene, actorId), role))
    fail("Creatura non visibile sulla scena.", "Creature not visible on the scene.", "not-visible");
}
/** Hide, Search and Study are actions (SRD): in initiative, on the creature's turn, once. */
function spendAction(state, actor) {
  if (!state.combat?.active) return false;
  if (state.combat.order?.[state.combat.turn] !== actor.id)
    fail(
      "È un'azione: usala nel turno di questa creatura.",
      "It is an action: use it on this creature's turn.",
      "not-your-turn",
    );
  if (!actor.action)
    fail("Azione già spesa in questo turno.", "Action already spent this turn.", "action-spent");
  actor.action = false;
  return true;
}

// ---------------------------------------------------------------- knowledge commands

/** What a Study check about this creature would be for one of the viewer's characters. */
export function studyPreview(state, actorId, targetId, role) {
  const block = kindOf(state, targetId);
  const reasons = [];
  const add = (code, it, en) => reasons.push({ code, it, en });
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state) || !isActorAvailable(actor))
    add("not-controller", "Scegli una creatura che controlli.", "Choose a creature you control.");
  if (!block)
    add(
      "no-profile",
      "Nessun profilo collegato: il DM può collegarlo dall'esame.",
      "No profile linked: the DM can link one from the examination.",
    );
  if (unknownIdentity(state, targetId))
    add(
      "identity-hidden",
      "Identità sconosciuta: il DM decide quando rivelarla.",
      "Unknown identity: the DM decides when to reveal it.",
    );
  const level = block ? knowledgeLevel(state, block.id) : 0;
  if (block && level >= MAX_LEVEL)
    add(
      "complete",
      "Il gruppo sa già tutto di questa creatura.",
      "The party already knows everything about this creature.",
    );
  const blocked = block ? kindRecord(state, block.id)?.blocked?.[actorId] : undefined;
  if (block && blocked === level && level < MAX_LEVEL)
    add(
      "tried",
      "Questo personaggio ha già fallito a questo livello: serve una nuova informazione o il permesso del DM.",
      "This character already failed at this level: new information or the DM's permission is needed.",
    );
  const skill = studySkill(block);
  const profile = actor
    ? checkProfile(state, { actorId, ability: "int", skill, save: false })
    : null;
  return {
    available: reasons.length === 0,
    reasons,
    skill,
    skillName: skillName(skill),
    bonus: profile?.bonus ?? 0,
    mode: profile?.mode ?? "normal",
    level,
    kindId: block?.id ?? null,
    ...(role === "dm" && block ? { dc: loreDc(block) } : {}),
  };
}
/**
 * Study action (SRD EN 189 / IT 216): an Intelligence check with the skill for the
 * creature's type against DC 10 + CR (authored, WotR). Success raises the party's shared
 * knowledge one tier (Solasta); a failure blocks this character at this tier.
 */
export function study(
  state,
  slice,
  rolls,
  { actorId, targetId, mode, faces },
  role,
  rng,
  at = new Date().toISOString(),
) {
  requireObserved(state, targetId, role);
  const preview = studyPreview(state, actorId, targetId, role);
  if (!preview.available)
    fail(preview.reasons[0].it, preview.reasons[0].en, preview.reasons[0].code);
  const actor = requireControl(state, actorId, role);
  const block = kindOf(state, targetId);
  const record = (campaignRecord(slice, state).kinds[block.id] ??= {
    level: knowledgeLevel(state, block.id),
    history: [],
    blocked: {},
  });
  const spent = spendAction(state, actor);
  const n = record.history.filter((h) => h.kind === "check" && h.actorId === actorId).length;
  const dc = loreDc(block);
  const { roll } = rollCheck(state, slice, rolls, {
    actorId,
    ability: "int",
    skill: preview.skill,
    key: `study:${campaignIdOf(state)}:${block.id}:${actorId}:${n}`,
    mode,
    faces,
    rng,
    meta: {
      kind: "check",
      by: role,
      visibility: "shared",
      label: L(
        `Studio · Intelligenza (${skillName(preview.skill).it})`,
        `Study · Intelligence (${skillName(preview.skill).en})`,
      ),
      at,
    },
  });
  const success = roll.total >= dc;
  const from = record.level;
  if (success) {
    record.level = Math.min(MAX_LEVEL, record.level + 1);
    record.blocked = {};
  } else record.blocked[actorId] = record.level;
  record.history.push({
    id: newId("know"),
    kind: "check",
    actorId,
    targetId,
    from,
    to: record.level,
    total: roll.total,
    dc,
    success,
    rollId: roll.id,
    by: role,
    at,
    action: spent,
  });
  return { roll, success, total: roll.total, dc, from, to: record.level, kindId: block.id };
}
/** DM: sets the party's tier; lowering it is a correction and needs a reason. */
export function grantLevel(
  state,
  slice,
  { kindId, level, reason = "" },
  role,
  at = new Date().toISOString(),
) {
  requireDM(role);
  const block = getById(kindId);
  if (block?.kind !== "creature") fail("Profilo non valido.", "Invalid profile.", "profile");
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL)
    fail("Scegli un livello da 1 a 4.", "Choose a level from 1 to 4.", "level");
  const record = (campaignRecord(slice, state).kinds[kindId] ??= {
    level: knowledgeLevel(state, kindId),
    history: [],
    blocked: {},
  });
  const from = record.level;
  if (level === from)
    fail("Il gruppo è già a questo livello.", "The party is already at this level.", "same");
  const lowering = level < from;
  if (lowering && !filled(reason, REASON_MAX))
    fail(
      "Per abbassare il livello serve un motivo (correzione).",
      "Lowering the level needs a reason (correction).",
      "reason",
    );
  record.level = level;
  record.blocked = {};
  record.history.push({
    id: newId("know"),
    kind: lowering ? "correction" : "grant",
    from,
    to: level,
    reason: filled(reason, REASON_MAX) ? reason.trim() : null,
    by: role,
    at,
  });
  return { from, to: level };
}
/** DM: lets a character who failed at this tier try again. */
export function allowRetry(state, slice, { kindId, actorId }, role, at = new Date().toISOString()) {
  requireDM(role);
  const record = campaignRecord(slice, state).kinds[kindId];
  if (!record?.blocked || record.blocked[actorId] === undefined)
    fail("Nessun tentativo da sbloccare.", "No attempt to unlock.", "not-blocked");
  delete record.blocked[actorId];
  record.history.push({
    id: newId("know"),
    kind: "retry",
    actorId,
    from: record.level,
    to: record.level,
    by: role,
    at,
  });
}
/** DM: links an NPC to an SRD creature profile (or removes the link). */
export function linkProfile(state, slice, { actorId, creatureId }, role) {
  requireDM(role);
  const actor = state.actors?.[actorId];
  if (!actor || actor.kind !== "npc")
    fail(
      "Solo le creature del DM hanno un profilo.",
      "Only DM creatures have a profile.",
      "npc-only",
    );
  if (creatureId && getById(creatureId)?.kind !== "creature")
    fail("Profilo non valido.", "Invalid profile.", "profile");
  if (actor.compendiumRef?.id || actor.encounterBlock?.creatureId)
    fail(
      "Il profilo viene dal compendio o dall'incontro di questa creatura.",
      "The profile comes from this creature's compendium entry or encounter.",
      "fixed-profile",
    );
  if (creatureId) slice.links[actorId] = creatureId;
  else delete slice.links[actorId];
}

// ---------------------------------------------------------------- hidden identity (FG ID)

export function hideIdentity(
  state,
  slice,
  { actorId, alias },
  role,
  at = new Date().toISOString(),
) {
  requireDM(role);
  const actor = state.actors?.[actorId];
  if (!actor || actor.kind !== "npc" || actor.companion)
    fail(
      "Solo le creature del DM hanno un'identità da nascondere.",
      "Only DM creatures have an identity to hide.",
      "npc-only",
    );
  if (identityOf(state, actorId))
    fail("L'identità è già nascosta.", "The identity is already hidden.", "already");
  if (state.ext?.["token-menu"]?.names?.[actorId]?.hidden)
    fail(
      "Il nome è già nascosto dal menu della pedina: mostralo prima di scegliere un nome non identificato.",
      "The name is already hidden from the token menu: show it before choosing an unidentified name.",
      "token-menu-hidden",
    );
  const next = String(alias ?? "").trim();
  if (!filled(next, ALIAS_MAX))
    fail("Il nome deve avere da 1 a 60 caratteri.", "The name needs 1 to 60 characters.", "alias");
  const taken = Object.values(state.actors).some(
    (other) => other.name?.trim().toLocaleLowerCase() === next.toLocaleLowerCase(),
  );
  if (taken)
    fail(
      "Un'altra creatura ha già questo nome: scegline uno diverso.",
      "Another creature already has this name: choose a different one.",
      "alias-taken",
    );
  slice.identities[actorId] = { alias: next, trueName: actor.name, at, by: role };
  actor.name = next;
  pushEvent(slice, {
    id: newId("kev"),
    kind: "identity-hidden",
    actorId,
    alias: next,
    by: role,
    at,
  });
}
export function revealIdentity(state, slice, { actorId }, role, at = new Date().toISOString()) {
  requireDM(role);
  const record = identityOf(state, actorId);
  if (!record) fail("L'identità è già visibile.", "The identity is already visible.", "not-hidden");
  state.actors[actorId].name = record.trueName;
  delete slice.identities[actorId];
  pushEvent(slice, {
    id: newId("kev"),
    kind: "identity-revealed",
    actorId,
    alias: record.alias,
    by: role,
    at,
  });
  return record;
}

// ---------------------------------------------------------------- vision and stealth

/** A creature's eyes: fog-vision viewer, with the darkvision of its linked profile. */
function viewerFor(state, scene, actorId) {
  const viewer = FV.buildViewer(state, scene, actorId);
  if (!viewer) return null;
  const dv = kindOf(state, actorId)?.senses?.darkvision;
  const px = Number.isFinite(dv) ? FV.metersToPx(scene, feetToMeters(dv)) : 0;
  return px > viewer.darkvisionPx ? { ...viewer, darkvisionPx: px } : viewer;
}
const OBSCURITY = {
  bright: { id: "clear", name: L("Luce intensa · non oscurata", "Bright light · not obscured") },
  dim: {
    id: "light",
    name: L("Luce fioca · leggermente oscurata", "Dim light · lightly obscured"),
  },
  dark: { id: "heavy", name: L("Oscurità · pesantemente oscurata", "Darkness · heavily obscured") },
};
/**
 * Where a creature stands for Hide (SRD EN 183 / IT 210): Heavily Obscured, or behind
 * Three-Quarters or Total Cover, and out of every enemy's line of sight. A player learns
 * only about the enemies they can see ("if you can see a creature, you can discern whether
 * it can see you"); the DM sees every enemy and who would notice (passive Perception).
 */
export function stealthAssessment(state, actorId, viewer, { at = null } = {}) {
  const scene = activeScene(state);
  const token = tokenOf(scene, actorId);
  const actor = state.actors?.[actorId];
  if (!scene || !token || !actor) return null;
  const point = at ?? { x: token.x, y: token.y };
  const lighting = FV.buildLighting(state, scene);
  const light = FV.lightLevelAt(lighting, point);
  const obscurity = OBSCURITY[light.level] ?? OBSCURITY.bright;
  const record = sliceOf(state).hidden?.[actorId] ?? null;
  const dm = viewer === "dm";
  const rows = opponentsOf(state, actorId).map((id) => {
    const eyes = viewerFor(state, scene, id);
    const sight = FV.canSee(eyes, lighting, point);
    const cover = coverFor(state, id, actorId, { role: viewer, to: point });
    const passive = passiveScore(state.actors[id], { ability: "wis", skill: "perception" });
    return {
      id,
      name: state.actors[id].name,
      observed: observes(state, tokenOf(scene, id), viewer),
      sees: Boolean(sight.visible),
      why: sight.reason ?? null,
      cover: cover?.degree ?? "unknown",
      ...(dm ? { passive, notices: record ? passive >= record.total : null } : {}),
    };
  });
  const known = dm ? rows : rows.filter((row) => row.observed);
  const covered = known.every((row) => C.rankOf(row.cover) >= C.rankOf("three-quarters"));
  const concealed = obscurity.id === "heavy" || covered;
  const seenBy = known.filter((row) => row.sees);
  const reasons = [];
  if (!concealed)
    reasons.push({
      code: "exposed",
      it: "Serve un'area pesantemente oscurata o una copertura di tre quarti o totale dai nemici.",
      en: "You need a Heavily Obscured area or Three-Quarters or Total Cover from enemies.",
    });
  if (seenBy.length)
    reasons.push({
      code: "seen",
      it: `Sei nel campo visivo di: ${seenBy.map((row) => row.name).join(", ")}.`,
      en: `You are in the line of sight of: ${seenBy.map((row) => row.name).join(", ")}.`,
    });
  return {
    actorId,
    light: light.level,
    obscurity: obscurity.id,
    obscurityName: copy(obscurity.name),
    rows: known,
    concealed,
    eligible: reasons.length === 0,
    reasons,
    hidden: record
      ? { total: record.total, since: record.at, dmReason: dm ? record.dmReason : undefined }
      : null,
  };
}
const attemptsOf = (state, actorId) =>
  (state.combatAttempts ?? []).filter((a) => a.actorId === actorId);
const chatMessages = (state) =>
  Array.isArray(state.ext?.chat?.messages) ? state.ext.chat.messages : [];
const maxChatSeq = (state) =>
  chatMessages(state).reduce((max, m) => Math.max(max, Number(m.seq) || 0), 0);
const hideCause = (record) => "knowledge-hide:" + record.id;
const holdsHide = (actor, record) =>
  (actor?.conditions ?? []).some((c) => isObject(c) && c.cause === hideCause(record));

/** A DM creature hides in secret: its roll and its Invisible stay private to the DM. */
export const secretHider = (state, actorId, role) =>
  role === "dm" && state.actors?.[actorId]?.kind === "npc";
/** Is this creature hiding in secret now (a DM creature the DM hid)? */
export function hiddenInSecret(state, actorId) {
  const record = sliceOf(state).hidden?.[actorId];
  return Boolean(record) && secretHider(state, actorId, record.by);
}
/** Was this loss the end of a secret hiding? */
export function lossInSecret(state, eventId) {
  const loss = sliceOf(state).events.find((e) => e.id === eventId && e.kind === "lost");
  return Boolean(loss?.record) && secretHider(state, loss.actorId, loss.record.by);
}
function applyHidden(state, slice, actorId, record, role) {
  applyConditionEvent(state, {
    eventId: "knowledge-hide-" + record.id,
    actorId,
    kind: "apply",
    conditionId: "invisible",
    source: SOURCES.hide,
    cause: hideCause(record),
    owner: role,
    visibility: secretHider(state, actorId, role) ? "private" : "shared",
    // Hiding grants the Invisible condition (SRD Hide); no SRD creature is immune to it.
    immunityConfirmed: true,
    origin: { label: "Nascondersi · Hide" },
  });
  slice.hidden[actorId] = record;
}
/**
 * Hide action: a DC 15 Dexterity (Stealth) check where the assessment allows it (the DM may
 * allow it anyway, with a reason). Success gives Invisible while hidden, and the total is the
 * DC to find the creature (SRD EN 183 / IT 210).
 */
export function hide(
  state,
  slice,
  rolls,
  { actorId, mode, faces, dmReason = "" },
  role,
  rng,
  at = new Date().toISOString(),
) {
  const actor = requireControl(state, actorId, role);
  if (slice.hidden[actorId]) fail("È già nascosta.", "Already hidden.", "already");
  const assessment = stealthAssessment(state, actorId, role);
  if (!assessment)
    fail("La creatura non è sulla scena.", "The creature is not on the scene.", "no-token");
  const override = role === "dm" && filled(dmReason, REASON_MAX);
  if (!assessment.eligible && !override)
    fail(assessment.reasons[0].it, assessment.reasons[0].en, assessment.reasons[0].code);
  // The rule is objective ("out of any enemy's line of sight"): an enemy the player cannot
  // perceive (fog, darkness) still counts. The DM's full view decides; the refusal names
  // nobody, as a DM at the table would say "you can't hide here" (review B46-rf).
  const truth = role === "dm" ? assessment : stealthAssessment(state, actorId, "dm");
  if (!truth.eligible && !override)
    fail(
      "Qui non puoi nasconderti: secondo il DM non sei fuori dalla vista di ogni nemico.",
      "You can't hide here: by the DM's reckoning you are not out of every enemy's sight.",
      "not-out-of-sight",
    );
  const spent = spendAction(state, actor);
  const n = slice.events.filter(
    (e) => e.actorId === actorId && ["hidden", "hide-failed"].includes(e.kind),
  ).length;
  const { roll } = rollCheck(state, slice, rolls, {
    actorId,
    ability: "dex",
    skill: "stealth",
    key: `hide:${actorId}:${n}`,
    mode,
    faces,
    rng,
    meta: {
      kind: "check",
      by: role,
      visibility: secretHider(state, actorId, role) ? "private" : "shared",
      publicDc: HIDE_DC,
      label: L("Nascondersi · Destrezza (Furtività)", "Hide · Dexterity (Stealth)"),
      at,
    },
  });
  const success = roll.total >= HIDE_DC;
  let record = null;
  if (success) {
    record = {
      id: newId("hid"),
      actorId,
      total: roll.total,
      sceneId: state.activeSceneId,
      at,
      by: role,
      rollId: roll.id,
      dmReason: override && !assessment.eligible ? dmReason.trim() : null,
      seenAttempts: attemptsOf(state, actorId).map((a) => a.id),
      seenChatSeq: maxChatSeq(state),
      ignore: [],
    };
    applyHidden(state, slice, actorId, record, role);
  }
  pushEvent(slice, {
    id: newId("kev"),
    kind: success ? "hidden" : "hide-failed",
    actorId,
    total: roll.total,
    rollId: roll.id,
    by: role,
    at,
    action: spent,
    dmReason: record?.dmReason ?? null,
    // CA-71: each opponent's passive Perception against the Stealth total, taken when the
    // creature hid (BG3 rolls the passive check then). The DM's «chi se ne accorgerebbe»
    // stays live in stealthAssessment; players read only their own failures.
    ...(success ? { passives: passiveChecks(state, actorId, roll.total) } : {}),
  });
  return { roll, success, total: roll.total, record };
}
function passiveChecks(state, actorId, total) {
  return opponentsOf(state, actorId).map((id) => {
    const passive = passiveOf(state, id);
    return { actorId: id, passive, notices: passive >= total };
  });
}
/**
 * CA-71 (BG3 failed passive roll; C1 `passiveFailures`): when the campaign shows failed
 * passive checks, a player reads «Livia non nota nulla (Percezione passiva 12)» for each
 * character they play whose passive Perception a hiding creature's Stealth beat. The line
 * never names, counts or places what was missed; the DM keeps «chi se ne accorgerebbe».
 * Newest first. Nothing for the DM, nothing while the campaign hides them.
 */
export function failedPassives(state, viewer) {
  if (viewer === "dm" || !viewer || viewer === "spectator") return [];
  if (playerDisclosure(state).passiveFailures !== "shown") return [];
  const out = [];
  for (const event of sliceOf(state).events ?? []) {
    if (event.kind !== "hidden" || !Array.isArray(event.passives)) continue;
    for (const check of event.passives) {
      const actor = state.actors?.[check.actorId];
      if (check.notices || !actor || actor.kind !== "character") continue;
      if (!canControlActor(actor, viewer, state)) continue;
      out.push({
        id: `${event.id}:${check.actorId}`,
        at: event.at,
        actorId: check.actorId,
        name: actor.name,
        passive: check.passive,
        text: L(
          `${actor.name} non nota nulla (Percezione passiva ${check.passive})`,
          `${actor.name} notices nothing (Passive Perception ${check.passive})`,
        ),
      });
    }
  }
  return out.reverse();
}

export const LOSS = Object.freeze({
  attack: L("ha effettuato un tiro per colpire", "made an attack roll"),
  spell: L(
    "ha lanciato un incantesimo con componente verbale",
    "cast a spell with a Verbal component",
  ),
  sound: L("ha parlato più forte di un sussurro", "spoke louder than a whisper"),
  found: L("un nemico l'ha trovata", "an enemy found it"),
  chosen: L("ha smesso di nascondersi", "stopped hiding"),
  dm: L("il DM ha deciso", "the DM decided"),
  condition: L("la condizione Invisibile è terminata", "the Invisible condition ended"),
});
/**
 * Why a hidden creature is no longer hidden, from what happened after it hid (BG3: loss
 * explained). Attack attempts and Verbal spells come from the combat log, speech from the
 * chat (in-character dialogue to everyone, not a whisper), a removed Invisible condition
 * from the conditions.
 */
export function detectLosses(state) {
  const slice = sliceOf(state);
  const out = [];
  for (const [actorId, record] of Object.entries(slice.hidden ?? {})) {
    const actor = state.actors?.[actorId];
    if (!actor) continue;
    if (!holdsHide(actor, record)) {
      out.push({ actorId, reason: "condition", triggerId: null, detail: {} });
      continue;
    }
    const ignored = new Set([...(record.seenAttempts ?? []), ...(record.ignore ?? [])]);
    const attempt = attemptsOf(state, actorId).find(
      (a) =>
        !ignored.has(a.id) &&
        (a.kind === "attack" ||
          a.requests?.some((r) => r.kind === "attack") ||
          verbalSpell(state, actorId, a.actionId)),
    );
    if (attempt) {
      const attack =
        attempt.kind === "attack" || attempt.requests?.some((r) => r.kind === "attack");
      out.push({
        actorId,
        reason: attack ? "attack" : "spell",
        triggerId: attempt.id,
        detail: { action: copy(attempt.actionName ?? null) },
      });
      continue;
    }
    const speech = chatMessages(state).find(
      (m) =>
        (Number(m.seq) || 0) > (record.seenChatSeq ?? 0) &&
        m.speaker?.actorId === actorId &&
        m.kind === "ic" &&
        // A whisper (range or addressed to someone) is not louder than a whisper.
        !m.to &&
        m.range?.id !== "whisper" &&
        !m.removed &&
        !(record.ignore ?? []).includes(m.id),
    );
    if (speech) out.push({ actorId, reason: "sound", triggerId: speech.id, detail: {} });
  }
  return out;
}
function verbalSpell(state, actorId, actionId) {
  const action = listActions(state, actorId).find((entry) => entry.id === actionId);
  return Boolean(action?.spell && (action.components ?? []).includes("V"));
}
/** Ends hiding with its explained reason (and the Invisible it gave, if still there). */
export function endHidden(
  state,
  slice,
  { actorId, reason, detail = {}, triggerId = null, note = "" },
  role,
  at = new Date().toISOString(),
) {
  const record = slice.hidden?.[actorId];
  if (!record) fail("Non è nascosta.", "Not hidden.", "not-hidden");
  if (!LOSS[reason]) fail("Motivo non valido.", "Invalid reason.", "reason");
  const actor = state.actors?.[actorId];
  if (actor && holdsHide(actor, record))
    applyConditionEvent(state, {
      eventId: `knowledge-unhide-${record.id}-${slice.events.length}`,
      actorId,
      kind: "end",
      cause: hideCause(record),
      reason: LOSS[reason].en,
      source: SOURCES.hide,
    });
  delete slice.hidden[actorId];
  return pushEvent(slice, {
    id: newId("kev"),
    kind: "lost",
    actorId,
    reason,
    detail: copy(detail),
    note: filled(note, REASON_MAX) ? note.trim() : null,
    triggerId,
    record: copy(record),
    by: role,
    at,
  });
}
/** The hidden creature's controller stops hiding, or makes a sound (their choice). */
export function stopHiding(state, slice, { actorId, reason = "chosen" }, role, at) {
  requireControl(state, actorId, role);
  if (!["chosen", "sound"].includes(reason))
    fail("Motivo non valido.", "Invalid reason.", "reason");
  return endHidden(state, slice, { actorId, reason }, role, at);
}
/** DM: an enemy finds the hidden creature (or the DM ends hiding for another reason). */
export function dmEndHidden(state, slice, { actorId, finderId = null, note = "" }, role, at) {
  requireDM(role);
  if (finderId && !state.actors?.[finderId])
    fail("Creatura non disponibile.", "Creature unavailable.", "unavailable");
  if (!finderId && !filled(note, REASON_MAX))
    fail("Scrivi il motivo.", "Write the reason.", "reason");
  return endHidden(
    state,
    slice,
    { actorId, reason: finderId ? "found" : "dm", detail: finderId ? { finderId } : {}, note },
    role,
    at,
  );
}
/** DM correction: keeps a creature hidden after an automatic loss, with a reason. */
export function keepHidden(state, slice, { eventId, reason }, role, at = new Date().toISOString()) {
  requireDM(role);
  if (!filled(reason, REASON_MAX))
    fail("Scrivi il motivo della correzione.", "Write the reason for the correction.", "reason");
  const loss = slice.events.find((e) => e.id === eventId && e.kind === "lost");
  if (!loss) fail("Perdita non trovata.", "Loss not found.", "not-found");
  if (slice.hidden[loss.actorId]) fail("È già nascosta.", "Already hidden.", "already");
  if (slice.events.some((e) => e.kind === "kept" && e.lossId === eventId))
    fail("Questa perdita è già stata corretta.", "This loss was already corrected.", "already");
  const record = {
    ...copy(loss.record),
    id: newId("hid"),
    ignore: [...(loss.record.ignore ?? []), ...(loss.triggerId ? [loss.triggerId] : [])],
  };
  applyHidden(state, slice, loss.actorId, record, role);
  pushEvent(slice, {
    id: newId("kev"),
    kind: "kept",
    actorId: loss.actorId,
    lossId: eventId,
    reason: reason.trim(),
    by: role,
    at,
  });
  return record;
}
/**
 * Search action (SRD EN 187 / IT 212): a Wisdom (Perception) check; every hidden enemy whose
 * Stealth total it meets or beats, and that is not behind Total Cover, is found.
 */
export function search(
  state,
  slice,
  rolls,
  { finderId, mode, faces },
  role,
  rng,
  at = new Date().toISOString(),
) {
  const finder = requireControl(state, finderId, role);
  const scene = activeScene(state);
  if (!tokenOf(scene, finderId))
    fail("La creatura non è sulla scena.", "The creature is not on the scene.", "no-token");
  const spent = spendAction(state, finder);
  const n = slice.events.filter((e) => e.kind === "search" && e.actorId === finderId).length;
  const { roll } = rollCheck(state, slice, rolls, {
    actorId: finderId,
    ability: "wis",
    skill: "perception",
    key: `search:${finderId}:${n}`,
    mode,
    faces,
    rng,
    meta: {
      kind: "check",
      by: role,
      visibility: role === "dm" ? "private" : "shared",
      label: L("Cercare · Saggezza (Percezione)", "Search · Wisdom (Perception)"),
      at,
    },
  });
  const found = [];
  for (const id of opponentsOf(state, finderId)) {
    const record = slice.hidden[id];
    if (!record) continue;
    const cover = coverFor(state, finderId, id);
    if (cover?.degree === "total") continue;
    if (roll.total >= record.total) {
      endHidden(
        state,
        slice,
        { actorId: id, reason: "found", detail: { finderId, total: roll.total } },
        role,
        at,
      );
      found.push(id);
    }
  }
  pushEvent(slice, {
    id: newId("kev"),
    kind: "search",
    actorId: finderId,
    // P6 TV-138: where it happened, so the scene keeps its «Trovato» list.
    sceneId: scene.id,
    total: roll.total,
    found,
    rollId: roll.id,
    by: role,
    at,
    action: spent,
  });
  return { roll, total: roll.total, found };
}

/**
 * P6 TV-138 (BG3 keeps what a search turned up in view): what the searches on `sceneId` found,
 * newest first, as {id, kind: "creature" | "trap" | "point", finderId, total, at}. Other
 * areas' finds (traps, search points) are recorded on the search that found them.
 */
export function foundOn(slice, sceneId) {
  const out = [];
  const seen = new Set();
  for (const e of [...(slice?.events ?? [])].reverse()) {
    if (e.kind !== "search" || e.sceneId !== sceneId) continue;
    for (const [kind, ids] of [
      ["creature", e.found],
      ["trap", e.traps],
      ["point", e.points],
    ])
      for (const id of ids ?? []) {
        if (seen.has(kind + ":" + id)) continue;
        seen.add(kind + ":" + id);
        out.push({ id, kind, finderId: e.actorId, total: e.total, at: e.at });
      }
  }
  return out;
}
/** Adds another area's finds (trap and search-point ids) to the latest search of `finderId`. */
export function recordFinds(slice, finderId, { traps = [], points = [] } = {}) {
  const event = [...(slice?.events ?? [])]
    .reverse()
    .find((e) => e.kind === "search" && e.actorId === finderId);
  if (!event) return;
  if (traps.length) event.traps = [...new Set([...(event.traps ?? []), ...traps])];
  if (points.length) event.points = [...new Set([...(event.points ?? []), ...points])];
}

// ---------------------------------------------------------------- public line-of-sight checks

export const SHARED_MAX = 5;
function endpoint(state, value) {
  if (typeof value?.actorId === "string") {
    if (!state.actors?.[value.actorId])
      fail("Creatura non disponibile.", "Creature unavailable.", "unavailable");
    return { actorId: value.actorId };
  }
  if (Number.isFinite(value?.x) && Number.isFinite(value?.y))
    return { x: Math.round(value.x), y: Math.round(value.y) };
  return fail("Punto non valido.", "Invalid point.", "point");
}
/** Peekaboo "public": a line-of-sight check shown to everyone on the scene until removed. */
export function shareCheck(
  state,
  slice,
  { sceneId, from, to },
  role,
  at = new Date().toISOString(),
) {
  if (!state.scenes?.some((scene) => scene.id === sceneId))
    fail("Scena non disponibile.", "Scene unavailable.", "scene");
  const list = (slice.shared[sceneId] ??= []);
  const entry = {
    id: newId("los"),
    from: endpoint(state, from),
    to: endpoint(state, to),
    by: role,
    at,
  };
  list.push(entry);
  if (list.length > SHARED_MAX) list.splice(0, list.length - SHARED_MAX);
  return entry;
}
export function removeCheck(state, slice, { sceneId, id }, role) {
  const list = slice.shared[sceneId] ?? [];
  const entry = list.find((e) => e.id === id);
  if (!entry) fail("Verifica non trovata.", "Check not found.", "not-found");
  if (entry.by !== role && role !== "dm")
    fail(
      "Solo chi l'ha condivisa o il DM può toglierla.",
      "Only its author or the DM can remove it.",
      "not-author",
    );
  slice.shared[sceneId] = list.filter((e) => e.id !== id);
}
export function resolveEndpoint(state, scene, value) {
  if (value?.actorId) {
    const token = tokenOf(scene, value.actorId);
    return token ? { actorId: value.actorId, ...spaceOf(state, scene, value.actorId) } : null;
  }
  return Number.isFinite(value?.x)
    ? { x: value.x, y: value.y, half: (scene.gridSize || 50) / 2 }
    : null;
}
/** A line-of-sight check between two endpoints, as the viewer may know the walls. */
export function losCheck(state, scene, from, to, role) {
  const a = resolveEndpoint(state, scene, from);
  const b = resolveEndpoint(state, scene, to);
  if (!a || !b) return null;
  const ids = [a.actorId, b.actorId].filter(Boolean);
  return C.coverBetween(scene, a, b, {
    blockers: blockersFor(state, scene, ids, role),
    role: role === "dm" ? "dm" : "player",
  });
}

// ---------------------------------------------------------------- modifiers and hit chance

/** Attack bonus as combat's initializeAttack computes it (checked against it in tests). */
export function attackBonusFor(rawActor, action, extra = 0) {
  const actor = getEffectiveActor(rawActor);
  const profile = actor?.combatProfile ?? {
    proficiencyBonus: 2,
    weaponProficiencies: [],
    spellcastingAbility: actor?.id === "livia" ? "int" : undefined,
  };
  const ability =
    action.id === "melee-attack"
      ? 0
      : action.id === "quarterstaff"
        ? mod(actor.abilities?.str)
        : profile.spellcastingAbility
          ? mod(actor.abilities?.[profile.spellcastingAbility])
          : 0;
  const proficient =
    action.id !== "quarterstaff" || profile.weaponProficiencies?.includes("quarterstaff");
  return (
    (action.attackModifier ?? ability + (proficient ? (profile.proficiencyBonus ?? 0) : 0)) + extra
  );
}
/** Chance that a d20 attack hits (natural 20 always hits, natural 1 always misses). */
export function hitChance(bonus, ac, mode = "normal") {
  let hits = 0;
  for (let face = 1; face <= 20; face++)
    if (face === 20 || (face !== 1 && face + bonus >= ac)) hits++;
  const p = hits / 20;
  return mode === "advantage" ? 1 - (1 - p) ** 2 : mode === "disadvantage" ? p ** 2 : p;
}
/** Census C9: the DM always; a player only as the campaign's policy allows. */
export function chanceAllowed(state, role, targetId) {
  if (role === "dm") return true;
  const policy = policyOf(state).hitChance;
  if (policy === "always") return true;
  if (policy !== "known" || unknownIdentity(state, targetId)) return false;
  const block = kindOf(state, targetId);
  return (
    state.actors?.[targetId]?.kind === "character" ||
    (block && knowledgeLevel(state, block.id) >= 2)
  );
}
export const percent = (p) => Math.round(p * 100);
/**
 * Combat provider (combat.mjs addAttackModifierProvider): cover as a target-AC row and, in a
 * preview the policy allows, the chance to hit. At resolution (no role) the cover is
 * measured on the DM's full geometry.
 */
export function attackRows(state, attackerId, targetId, action, context = {}) {
  const role = context.role ?? "dm";
  const cover = coverFor(state, attackerId, targetId, { role });
  const rows = [];
  if (cover && ["half", "three-quarters", "total"].includes(cover.degree))
    rows.push({
      code: "cover-" + cover.degree,
      mode: "target-ac",
      acBonus: C.DEGREE[cover.degree].acBonus ?? 0,
      blocksTargeting: cover.degree === "total",
      name: copy(C.DEGREE[cover.degree].name),
      source: copy(C.COVER_SOURCE),
    });
  if (
    context.role &&
    context.rollMode &&
    cover?.degree !== "total" &&
    chanceAllowed(state, role, targetId)
  ) {
    const attacker = state.actors?.[attackerId];
    const target = state.actors?.[targetId];
    if (attacker && Number.isFinite(target?.ac)) {
      const p = hitChance(
        attackBonusFor(attacker, action, context.modifier ?? 0),
        target.ac + (cover?.acBonus ?? 0),
        context.rollMode,
      );
      rows.push({
        code: "hit-chance",
        mode: "info",
        chance: p,
        name: L(`Probabilità di colpire: ${percent(p)}%`, `Chance to hit: ${percent(p)}%`),
        source: null,
      });
    }
  }
  return rows;
}
/**
 * BG3 modifiers under the target (CRP-119): what a viewer's creature faces against another
 * one right now — cover, and whether each can see the other (SRD Unseen Attackers and
 * Targets, EN 14 / IT 16; hidden = Invisible, EN 184 / IT 209).
 */
export function targetModifiers(state, attackerId, targetId, role) {
  const scene = activeScene(state);
  const a = tokenOf(scene, attackerId);
  const b = tokenOf(scene, targetId);
  if (!scene || !a || !b) return [];
  const rows = [];
  const cover = coverFor(state, attackerId, targetId, { role });
  if (cover && cover.degree !== "none" && cover.degree !== "unknown")
    rows.push({
      code: "cover",
      tone: cover.degree === "total" ? "blocked" : "partial",
      degree: cover.degree,
      text:
        cover.degree === "total"
          ? L("Copertura totale · non bersagliabile", "Total Cover · can't be targeted")
          : L(
              `${C.DEGREE[cover.degree].name.it} · CA +${C.DEGREE[cover.degree].acBonus}`,
              `${C.DEGREE[cover.degree].name.en} · AC +${C.DEGREE[cover.degree].acBonus}`,
            ),
      source: C.COVER_SOURCE,
    });
  const sees = (observer, target, from, to) =>
    !hasCondition(state.actors[observer], "blinded") &&
    !hasCondition(state.actors[target], "invisible") &&
    hasLineOfSight(scene, from, to, { role: role === "dm" ? "dm" : "player" });
  if (!sees(targetId, attackerId, b, a))
    rows.push({
      code: "unseen-attacker",
      tone: "good",
      text: L("Non ti vede · vantaggio", "Can't see you · Advantage"),
      source: SOURCES.unseen,
    });
  if (!sees(attackerId, targetId, a, b))
    rows.push({
      code: "unseen-target",
      tone: "bad",
      text: L("Non lo vedi · svantaggio", "You can't see it · Disadvantage"),
      source: SOURCES.unseen,
    });
  return rows;
}

// ---------------------------------------------------------------- pickpocket (CRP-151)

export const PICK_STATUS = ["asked", "ready", "failed", "done", "refused", "withdrawn", "reverted"];
/** Adjacent on the grid, diagonals included (SRD 5-foot reach on a grid). */
export function adjacent(scene, a, b) {
  if (!scene || !a || !b) return false;
  const cells = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) / (scene.gridSize || 50);
  return cells * (scene.metersPerCell || 1.5) <= 1.5 + 0.01;
}
/** Characters the viewer controls that stand next to the target (the possible pickpockets). */
export function pickpocketThieves(state, targetId, role) {
  const scene = activeScene(state);
  const target = state.actors?.[targetId];
  const at = tokenOf(scene, targetId);
  if (!target || target.kind !== "npc" || !at) return [];
  return (scene.tokens ?? [])
    .filter((token) => token.actorId !== targetId)
    .map((token) => state.actors?.[token.actorId])
    .filter(
      (actor) =>
        actor &&
        actor.kind === "character" &&
        isActorAvailable(actor) &&
        canControlActor(actor, role, state) &&
        adjacent(scene, tokenOf(scene, actor.id), at),
    )
    .map((actor) => actor.id);
}
const findRequest = (slice, id) =>
  slice.pickpocket.find((r) => r.id === id) ??
  fail("Richiesta non trovata.", "Request not found.", "not-found");
const itemName = (item, lang = "it") =>
  typeof item?.name === "string" ? item.name : (item?.name?.[lang] ?? item?.name?.it ?? "");
/** Player (or DM for Doran): asks to take something from, or slip something to, a creature. */
export function requestPickpocket(
  state,
  slice,
  { thiefId, targetId, intent, itemId = null, wish = "" },
  role,
  at = new Date().toISOString(),
) {
  requireControl(state, thiefId, role);
  requireObserved(state, targetId, role);
  if (!pickpocketThieves(state, targetId, role).includes(thiefId))
    fail(
      "Avvicinati: serve essere adiacenti alla creatura.",
      "Move closer: you must be adjacent to the creature.",
      "not-adjacent",
    );
  if (!["take", "plant"].includes(intent))
    fail(
      "Scegli se prendere o mettere un oggetto.",
      "Choose to take or to plant an item.",
      "intent",
    );
  if (
    slice.pickpocket.some(
      (r) => r.thiefId === thiefId && ["asked", "ready", "failed"].includes(r.status),
    )
  )
    fail(
      "C'è già una richiesta di borseggio in corso.",
      "A pickpocket request is already under way.",
      "pending",
    );
  let item = null;
  if (intent === "plant") {
    item = state.actors[thiefId].inventory?.find((row) => row.id === itemId && row.quantity > 0);
    if (!item)
      fail("Scegli un oggetto del tuo inventario.", "Choose an item from your inventory.", "item");
    if (item.equipped)
      fail("Riponi prima l'oggetto equipaggiato.", "Unequip the item first.", "equipped");
  } else if (!filled(wish, 80))
    fail(
      "Scrivi che cosa cerchi (fino a 80 caratteri).",
      "Write what you are after (up to 80 characters).",
      "wish",
    );
  const request = {
    id: newId("pick"),
    thiefId,
    targetId,
    intent,
    itemId: item?.id ?? null,
    itemName: item ? copy(item.name) : null,
    wish: intent === "take" ? wish.trim() : null,
    status: "asked",
    by: role,
    at,
    dc: null,
    loot: null,
    roll: null,
    outcome: null,
  };
  slice.pickpocket.push(request);
  if (slice.pickpocket.length > 60) slice.pickpocket.splice(0, slice.pickpocket.length - 60);
  return request;
}
export function withdrawPickpocket(state, slice, { requestId }, role) {
  const request = findRequest(slice, requestId);
  requireControl(state, request.thiefId, role);
  if (!["asked", "ready"].includes(request.status))
    fail(
      "La richiesta non si può più ritirare.",
      "The request can no longer be withdrawn.",
      "status",
    );
  request.status = "withdrawn";
}
/**
 * DM decision: allow the check with a DC (default the target's passive Perception) and,
 * for "take", what is in reach — an item of the creature, a new item, or nothing like it
 * (which ends the request without a roll); or refuse with a reason.
 */
export function decidePickpocket(
  state,
  slice,
  { requestId, allow, dc = null, loot = null, reason = "" },
  role,
  at = new Date().toISOString(),
) {
  requireDM(role);
  const request = findRequest(slice, requestId);
  if (request.status !== "asked")
    fail("Questa richiesta è già stata decisa.", "This request was already decided.", "status");
  if (!allow) {
    if (!filled(reason, REASON_MAX))
      fail("Scrivi il motivo del rifiuto.", "Write the reason for refusing.", "reason");
    Object.assign(request, {
      status: "refused",
      outcome: { reason: reason.trim() },
      decidedAt: at,
    });
    return request;
  }
  if (request.intent === "take") {
    const target = state.actors[request.targetId];
    if (loot?.mode === "item") {
      const row = target.inventory?.find((r) => r.id === loot.itemId && r.quantity > 0);
      if (!row)
        fail("Scegli un oggetto della creatura.", "Choose one of the creature's items.", "item");
      if (row.equipped)
        fail(
          "Un oggetto equipaggiato non si borseggia.",
          "An equipped item can't be pickpocketed.",
          "equipped",
        );
      request.loot = { mode: "item", itemId: row.id, name: copy(row.name) };
    } else if (loot?.mode === "new") {
      if (!filled(loot.name, 80))
        fail(
          "Scrivi il nome dell'oggetto (fino a 80 caratteri).",
          "Write the item's name (up to 80 characters).",
          "name",
        );
      request.loot = { mode: "new", name: loot.name.trim() };
    } else if (loot?.mode === "nothing") {
      Object.assign(request, {
        status: "done",
        loot: { mode: "nothing" },
        outcome: { success: null, nothing: true },
        decidedAt: at,
      });
      return request;
    } else fail("Scegli che cosa trova.", "Choose what is found.", "loot");
  }
  const value = Number(dc);
  if (!Number.isInteger(value) || value < 5 || value > 30)
    fail("La CD va da 5 a 30.", "The DC goes from 5 to 30.", "dc");
  Object.assign(request, { status: "ready", dc: value, decidedAt: at });
  return request;
}
function transfer(state, request) {
  const thief = state.actors[request.thiefId];
  const target = state.actors[request.targetId];
  if (request.intent === "plant") {
    const moved = takeItemFromActor(thief, request.itemId, 1);
    const row = giveItemToActor(target, moved, 1);
    return { fromActorId: thief.id, toActorId: target.id, rowId: row.id, name: copy(row.name) };
  }
  if (request.loot.mode === "item") {
    const moved = takeItemFromActor(target, request.loot.itemId, 1);
    const row = giveItemToActor(thief, moved, 1);
    return { fromActorId: target.id, toActorId: thief.id, rowId: row.id, name: copy(row.name) };
  }
  const row = giveItemToActor(
    thief,
    {
      name: request.loot.name,
      quantity: 1,
      weight: null,
      kind: "gear",
      description: L(`Borseggiato a ${target.name}.`, `Pickpocketed from ${target.name}.`),
    },
    1,
  );
  return { fromActorId: null, toActorId: thief.id, rowId: row.id, name: copy(row.name) };
}
/** The thief's Dexterity (Sleight of Hand) check (SRD EN 9 / IT 10) against the DM's DC. */
export function rollPickpocket(
  state,
  slice,
  rolls,
  { requestId, mode, faces },
  role,
  rng,
  at = new Date().toISOString(),
) {
  const request = findRequest(slice, requestId);
  requireControl(state, request.thiefId, role);
  if (request.status !== "ready")
    fail("Il DM non ha ancora deciso.", "The DM has not decided yet.", "status");
  const { roll } = rollCheck(state, slice, rolls, {
    actorId: request.thiefId,
    ability: "dex",
    skill: "sleight-of-hand",
    key: `pickpocket:${request.id}`,
    mode,
    faces,
    rng,
    meta: {
      kind: "check",
      by: role,
      visibility: "shared",
      label: L(
        "Borseggio · Destrezza (Rapidità di Mano)",
        "Pickpocket · Dexterity (Sleight of Hand)",
      ),
      at,
    },
  });
  const success = roll.total >= request.dc;
  request.roll = { rollId: roll.id, total: roll.total, mode };
  if (success) {
    request.outcome = { success: true, transfer: transfer(state, request) };
    request.status = "done";
  } else {
    request.outcome = { success: false, noticed: null };
    request.status = "failed";
  }
  request.rolledAt = at;
  return { roll, success, request };
}
/** DM after a failed attempt: whether the creature notices it. */
export function settlePickpocket(
  state,
  slice,
  { requestId, noticed },
  role,
  at = new Date().toISOString(),
) {
  requireDM(role);
  const request = findRequest(slice, requestId);
  if (request.status !== "failed")
    fail(
      "Non c'è un tentativo fallito da decidere.",
      "There is no failed attempt to decide.",
      "status",
    );
  request.outcome = { ...request.outcome, noticed: Boolean(noticed) };
  request.status = "done";
  request.settledAt = at;
  return request;
}
/** DM correction with a reason: puts a transferred item back where it was. */
export function revertPickpocket(
  state,
  slice,
  { requestId, reason },
  role,
  at = new Date().toISOString(),
) {
  requireDM(role);
  if (!filled(reason, REASON_MAX))
    fail("Scrivi il motivo della correzione.", "Write the reason for the correction.", "reason");
  const request = findRequest(slice, requestId);
  const moved = request.outcome?.transfer;
  if (request.status !== "done" || !moved)
    fail("Nessun oggetto da rimettere a posto.", "No item to put back.", "status");
  const holder = state.actors[moved.toActorId];
  const row = holder?.inventory?.find((r) => r.id === moved.rowId && r.quantity > 0);
  if (!row)
    fail(
      "L'oggetto non è più nell'inventario di chi l'ha ricevuto.",
      "The item is no longer in the recipient's inventory.",
      "gone",
    );
  const back = takeItemFromActor(holder, row.id, 1);
  if (moved.fromActorId) giveItemToActor(state.actors[moved.fromActorId], back, 1);
  Object.assign(request, {
    status: "reverted",
    correction: { reason: reason.trim(), by: role, at },
  });
  return request;
}
/** What a viewer may read of a request: the DC and the DM's choice only for the DM. */
export function projectPickpocket(state, request, role) {
  const dm = role === "dm";
  const mine = canControlActor(state.actors?.[request.thiefId], role, state);
  if (!dm && !mine) return null;
  const out = copy(request);
  if (!dm) {
    delete out.dc;
    if (request.status !== "done" || !request.outcome?.success) delete out.loot;
  }
  return out;
}
