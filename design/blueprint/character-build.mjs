import { updateCharacterFormsProfile } from "./forms-profile.mjs";
import { canControlActor } from "./character-access.mjs";
import { hasBlockingConsequences } from "./combat.mjs";
import { homebrewAvailability, listHomebrew, getHomebrewRevision } from "./homebrew.mjs";
import { updateCharacterRestProfile } from "./rest-profile.mjs";
import { packSubclasses } from "./compat-packs.mjs";
import {
  ABILITY_IDS,
  STANDARD_ARRAY,
  POINT_COST,
  abilities,
  classes as ruleClasses,
  backgrounds,
  species,
  skills,
  languages,
  feats,
  spells,
  equipmentOptions,
  SPELL_PROGRESSION,
  ruleSource,
  characterZeroHpPolicy,
  calculateSpellSlots,
  getCharacterCatalog,
  requiredFeatureGrants,
  classFeaturesAt,
} from "./character-rules.mjs";
const copy = (v) => structuredClone(v);
// The SRD class catalogue; a draft's own list adds the homebrew classes it may use.
const classes = ruleClasses;
// DDB traits / ideals / bonds / flaws: actor.personality = {traits, ideals, bonds, flaws},
// each an array of strings (the P2 sheet renders the same shape).
export const PERSONALITY_KEYS = ["traits", "ideals", "bonds", "flaws"];
export function normalizePersonality(value) {
  return Object.fromEntries(
    PERSONALITY_KEYS.map((key) => [
      key,
      (Array.isArray(value?.[key]) ? value[key] : [])
        .filter((entry) => typeof entry === "string" && entry.trim())
        .map((entry) => entry.trim().slice(0, 300))
        .slice(0, 12),
    ]),
  );
}
const text = (it, en) => ({ it, en });
const now = () => new Date().toISOString();
const mod = (n) => Math.floor((n - 10) / 2);
const number = (n) => Number.isFinite(n);
const integer = (n, min, max = Number.MAX_SAFE_INTEGER) =>
  Number.isInteger(n) && n >= min && n <= max;
const dataKeys = [
  "identity",
  "sources",
  "classes",
  "levelOrder",
  "origin",
  "abilities",
  "skills",
  "features",
  "spells",
  "equipment",
  "hp",
  "story",
];
export const BUILD_SECTIONS = [
  ["identity", "Identità", "Identity"],
  ["sources", "Fonti", "Sources"],
  ["class", "Classi e punti ferita", "Classes and hit points"],
  ["origin", "Background e specie", "Background and species"],
  ["abilities", "Caratteristiche", "Abilities"],
  ["skills", "Competenze", "Proficiencies"],
  ["features", "Capacità e talenti", "Features and feats"],
  ["spells", "Magie", "Spells"],
  ["equipment", "Equipaggiamento", "Equipment"],
  ["story", "Storia", "Story"],
  ["review", "Riepilogo", "Review"],
].map(([id, it, en]) => ({ id, name: text(it, en) }));
function error(code, it, en) {
  return Object.assign(new Error(en), { code, it, en });
}
function hash(value) {
  const s = JSON.stringify(value) ?? "undefined";
  let n = 2166136261;
  for (let i = 0; i < s.length; i++) n = Math.imul(n ^ s.charCodeAt(i), 16777619);
  return (n >>> 0).toString(16);
}
function structural(actor) {
  return actor
    ? {
        characterBuild: actor.characterBuild,
        buildSeed: actor.buildSeed,
        level: actor.level,
        className: actor.className,
        name: actor.name,
        abilities: actor.abilities,
        maxHp: actor.maxHp,
        ac: actor.ac,
        speed: actor.speed,
        slotMaxima: Object.fromEntries(
          Object.entries(actor.spellSlots ?? { 1: actor.slots }).map(([id, p]) => [id, p?.max]),
        ),
        pactMax: actor.pactSlots && { max: actor.pactSlots.max, level: actor.pactSlots.level },
      }
    : null;
}
function currentResources(actor) {
  return actor
    ? {
        hp: actor.hp,
        tempHp: actor.tempHp,
        slots: actor.spellSlots ?? { 1: actor.slots },
        pactSlots: actor.pactSlots,
        hitDice: actor.hitDice,
        featureUses: actor.featureUses,
        features: actor.features,
        featureUsageLedger: actor.featureUsageLedger,
        spells: actor.spells,
        spellUsageLedger: actor.spellUsageLedger,
        savingThrows: actor.savingThrows,
        description: actor.description,
        backstory: actor.backstory,
      }
    : null;
}
function initialData(kind, actor) {
  const existing = actor?.characterBuild?.data;
  if (existing) {
    const data = copy(existing);
    data.identity.name = actor.name;
    data.identity.visibility = actor.visibility;
    data.story = {
      description: actor.description ?? "",
      backstory: actor.backstory ?? "",
      personality: normalizePersonality(actor.personality),
    };
    data.spells.prepared = livePreparedSelections(actor);
    const prior = actor.characterBuild.appliedValues;
    for (const ability of ABILITY_IDS) {
      if (prior && actor.abilities[ability] !== prior.abilities[ability]) {
        data.abilities.manualTotals ??= {};
        data.abilities.manualTotals[ability] = {
          value: actor.abilities[ability],
          reason: "Preserved correction from the live character sheet",
        };
      }
    }
    // Advancing and revising both start from the live maximum and change it only by the
    // levels added or removed (never a declared manual total the player did not type).
    data.hp.mode = "delta";
    data.hp.maxHp = actor.maxHp;
    data.hp.currentHp = actor.hp;
    data.hp.tempHp = actor.tempHp ?? 0;
    data.hp.currentKnown = true;
    return data;
  }
  const known = actor?.buildSeed;
  return {
    identity: {
      name: actor?.name ?? "",
      visibility: actor?.visibility ?? "private",
      context: "personal",
      advancement: { method: "xp", xp: 0, milestone: "" },
    },
    sources: { enabled: ["srd-2024"], manualReason: "" },
    classes: copy(known?.classes ?? []),
    levelOrder: copy(known?.levelOrder ?? []),
    origin: { backgroundId: null, speciesId: null, backgroundBonuses: {}, choices: {} },
    abilities: {
      method: actor ? "manual" : "array",
      assignment: {},
      scores: copy(actor?.abilities ?? Object.fromEntries(ABILITY_IDS.map((id) => [id, null]))),
      manualTotals: {},
      source: actor ? "Existing sheet: recorded effective values" : "",
    },
    skills: { selected: [], languages: [], tools: [], confirmed: false },
    features: { selected: [], custom: [], featOverride: false, confirmed: false },
    spells: { selected: [], prepared: [], custom: [], confirmed: false },
    equipment: { mode: "manual", items: [], currency: { gp: 0 }, confirmed: !!actor },
    hp: {
      mode: actor ? "delta" : kind === "reconstruct" ? "manual" : "calculated",
      maxHp: actor?.maxHp ?? null,
      currentHp: actor?.hp ?? null,
      tempHp: actor?.tempHp ?? 0,
      perLevel: {},
      currentKnown: !!actor,
    },
    story: {
      description: actor?.description ?? "",
      backstory: actor?.backstory ?? "",
      personality: normalizePersonality(actor?.personality),
    },
  };
}
// ---------------------------------------------------------------- homebrew classes (BI-21/22)

// Roll20 custom class in the builder: a homebrew class this identity can read and use in
// the draft's context (its own content, or content the DM enabled in the campaign of the
// sheet) becomes a builder class. Its advancement (dnd5e Advancement) is applied level by
// level: feature grants, scale values, Ability Score Improvements and feature choices.
const HB_PREFIX = "hb-class:";
export const isHomebrewClass = (id) => typeof id === "string" && id.startsWith(HB_PREFIX);
// The latest revision of every homebrew content of `type` this identity may use in the
// draft's context (its own, or enabled in the campaign of the sheet).
function usableHomebrew(state, role, actorId, type) {
  let entries = [];
  try {
    entries = listHomebrew(state, role).filter((entry) => entry.type === type);
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const ref = entry.latestRef;
    if (!homebrewAvailability(state, ref, actorId ? { actorId } : {}, role).canUse) continue;
    try {
      out.push({ ref, data: getHomebrewRevision(state, ref, role).data ?? {} });
    } catch {
      continue;
    }
  }
  return out;
}
const homebrewName = (data) =>
  text(data.name?.it || data.name?.en || "Homebrew", data.name?.en || data.name?.it || "Homebrew");
const homebrewSourceOf = (ref, data) => ({
  kind: "homebrew",
  revision: ref.revisionId,
  label: data.source?.label || "Homebrew",
  edition: "2024",
});
export function homebrewClasses(state, role, actorId = null) {
  const out = [];
  for (const { ref, data } of usableHomebrew(state, role, actorId, "class")) {
    const k = data.structured?.class ?? {};
    if (!integer(k.hitDie, 4, 12)) continue;
    const label = data.source?.label || "Homebrew";
    out.push({
      id: HB_PREFIX + ref.contentId,
      homebrew: true,
      homebrewRef: copy(ref),
      name: homebrewName(data),
      hitDie: k.hitDie,
      primaryAbilities: Array.isArray(k.primary) && k.primary.length ? [...k.primary] : ["str"],
      primaryMode: "all",
      savingThrows: Array.isArray(k.saves) ? [...k.saves] : [],
      skillCount: 2,
      skills: skills.map((row) => row.id),
      caster: "none",
      homebrewCaster: k.caster && k.caster !== "none" ? k.caster : null,
      spellcastingAbility: null,
      source: { kind: "homebrew", revision: ref.revisionId, label, edition: "2024" },
      subclasses: [],
      features: [],
      advancement: copy(data.structured?.advancement ?? []),
      coverage: text(
        "Classe homebrew: privilegi, valori di scala, aumenti e scelte dal suo avanzamento.",
        "Homebrew class: features, scale values, improvements and choices from its advancement.",
      ),
    });
  }
  return out;
}
// PG-06 (Roll20 Charactermancer custom content, D&D Beyond homebrew origins): a homebrew
// species brings its size, speed and level-1 traits; a homebrew background its three
// abilities, two skills and origin feat. Their other text stays manual.
const HB_SPECIES = "hb-species:",
  HB_BACKGROUND = "hb-background:",
  HB_SUBCLASS = "hb-subclass:";
export const isHomebrewSubclass = (id) => typeof id === "string" && id.startsWith(HB_SUBCLASS);
const homebrewTraits = (id, ref, data, source, level = 1) => {
  const granted = (data.structured?.advancement ?? [])
    .filter((row) => row.type === "grant" && integer(row.level, 1, level))
    .flatMap((row) => row.features ?? []);
  const rows = granted.length
    ? granted
    : [{ id: "trait", name: homebrewName(data), description: data.description }];
  return rows.map((f) => ({
    id: `${id}:${f.id}`,
    name: copy(f.name),
    description: copy(f.description ?? text("", "")),
    automation: "manual",
    homebrewRef: copy(ref),
    source: copy(source),
  }));
};
export function homebrewSpecies(state, role, actorId = null) {
  return usableHomebrew(state, role, actorId, "species").map(({ ref, data }) => {
    const s = data.structured?.species ?? {},
      id = HB_SPECIES + ref.contentId,
      source = homebrewSourceOf(ref, data);
    const size = ["small", "medium", "choice"].includes(s.size) ? s.size : "medium";
    return {
      id,
      homebrew: true,
      homebrewRef: copy(ref),
      name: homebrewName(data),
      speed: number(s.speed) && s.speed >= 1.5 && s.speed <= 30 ? s.speed : 9,
      size,
      source,
      features: homebrewTraits(id, ref, data, source),
      choices:
        size === "choice"
          ? [
              {
                id: "size",
                name: text("Taglia", "Size"),
                options: [
                  { id: "small", name: text("Piccola", "Small") },
                  { id: "medium", name: text("Media", "Medium") },
                ],
              },
            ]
          : [],
    };
  });
}
export function homebrewBackgrounds(state, role, actorId = null) {
  return usableHomebrew(state, role, actorId, "background").map(({ ref, data }) => {
    const b = data.structured?.background ?? {},
      id = HB_BACKGROUND + ref.contentId,
      source = homebrewSourceOf(ref, data);
    const abilities = [...new Set(b.abilities ?? [])].filter((key) => ABILITY_IDS.includes(key));
    return {
      id,
      homebrew: true,
      homebrewRef: copy(ref),
      name: homebrewName(data),
      abilities: abilities.length === 3 ? abilities : [],
      skills: [...new Set(b.skills ?? [])].filter((k) => skills.some((row) => row.id === k)),
      featId: feats.some((f) => f.id === b.featId && f.category === "origin") ? b.featId : null,
      tool: null,
      source,
      features: homebrewTraits(id, ref, data, source),
    };
  });
}
// BI-22 (Roll20 custom subclass in the Charactermancer): a homebrew subclass of an SRD
// class joins that class's subclass choice; its advancement applies level by level.
export function homebrewSubclasses(state, role, actorId = null) {
  return usableHomebrew(state, role, actorId, "subclass")
    .filter(({ data }) => ruleClasses.some((c) => c.id === data.structured?.subclass?.classId))
    .map(({ ref, data }) => ({
      id: HB_SUBCLASS + ref.contentId,
      homebrew: true,
      homebrewRef: copy(ref),
      classId: data.structured.subclass.classId,
      name: homebrewName(data),
      source: homebrewSourceOf(ref, data),
      advancement: copy(data.structured?.advancement ?? []),
    }));
}
// Every class a draft may use: SRD (with its usable homebrew subclasses) plus the usable
// homebrew classes.
function classesFor(state, role, actorId) {
  // BI-45: the subclasses of the compatibility packs enabled in the campaign (Shard/Foundry
  // compendium packs feed the builder), known by name and page as the SRD ones beyond level 3.
  const subclasses = [...homebrewSubclasses(state, role, actorId), ...packSubclasses(state)];
  return [
    ...ruleClasses.map((c) => {
      const extra = subclasses.filter((s) => s.classId === c.id);
      return extra.length ? { ...c, subclasses: [...c.subclasses, ...extra] } : c;
    }),
    ...homebrewClasses(state, role, actorId),
  ];
}
// A homebrew background's starting gold, as the SRD backgrounds' option B (50 GP).
const homebrewEquipment = (list) =>
  list.map((b) => ({
    id: b.id + "-gold",
    backgroundId: b.id,
    name: text("Oro del background (alternativa B)", "Background gold (option B)"),
    items: [],
    currency: { gp: 50 },
    source: copy(b.source),
  }));
/** Species, backgrounds and starting options a draft may use: SRD plus usable homebrew. */
function originsFor(state, role, actorId) {
  const hbBackgrounds = homebrewBackgrounds(state, role, actorId);
  return {
    species: [...species, ...homebrewSpecies(state, role, actorId)],
    backgrounds: [...backgrounds, ...hbBackgrounds],
    equipmentOptions: [...equipmentOptions, ...homebrewEquipment(hbBackgrounds)],
  };
}
const scaleAt = (scale, level) =>
  Object.entries(scale?.values ?? {})
    .map(([at, value]) => [Number(at), value])
    .filter(([at]) => Number.isInteger(at) && at <= level)
    .sort((a, b) => a[0] - b[0])
    .at(-1)?.[1] ?? null;
// Feature records of a homebrew class up to `level`: grants and the current scale values.
function homebrewFeaturesAt(cls, level) {
  const out = [];
  for (const adv of cls.advancement ?? []) {
    if (!integer(adv.level, 1, 20) || adv.level > level) continue;
    if (adv.type === "grant")
      for (const f of adv.features ?? [])
        out.push({
          id: `${cls.id}:${f.id}`,
          name: copy(f.name),
          description: copy(f.description ?? text("", "")),
          level: adv.level,
          automation: "manual",
          homebrewRef: copy(cls.homebrewRef),
          source: copy(cls.source),
        });
    if (adv.type === "scale" && adv.scale) {
      const value = scaleAt(adv.scale, level);
      if (value !== null)
        out.push({
          id: `${cls.id}:scale:${adv.id}`,
          name: text(
            `${adv.scale.name?.it ?? ""}: ${value}`,
            `${adv.scale.name?.en ?? ""}: ${value}`,
          ),
          description: text(
            "Valore di scala della classe homebrew, al livello attuale.",
            "Homebrew class scale value at the current level.",
          ),
          level: adv.level,
          automation: "manual",
          homebrewRef: copy(cls.homebrewRef),
          source: copy(cls.source),
        });
    }
  }
  return out;
}
// Choices a homebrew class grants up to `level`: its ASI levels (the 2024 feat choice) and
// its feature choices.
function homebrewGrants(cls, level) {
  const out = [];
  for (const adv of cls.advancement ?? []) {
    if (!integer(adv.level, 1, 20) || adv.level > level) continue;
    if (adv.type === "asi")
      out.push({
        id: `class:${cls.id}:asi:${adv.level}`,
        name: text(
          `Aumento dei punteggi · livello ${adv.level}`,
          `Ability Score Improvement · level ${adv.level}`,
        ),
        count: 1,
        options: copy(feats.filter((f) => f.category !== "fighting-style")),
        kind: "feat",
        level: adv.level,
      });
    if (adv.type === "choice" && adv.choice)
      out.push({
        id: `class:${cls.id}:choice:${adv.id}`,
        name: copy(adv.choice.name),
        count: 1,
        options: (adv.choice.from ?? []).map((f) => ({
          id: f.id,
          name: copy(f.name),
          description: copy(f.description ?? text("", "")),
          automation: "manual",
          homebrewRef: copy(cls.homebrewRef),
          source: copy(cls.source),
        })),
        kind: "choice",
        level: adv.level,
      });
  }
  return out;
}
/** The builder catalogue for one draft: the SRD catalogue plus its usable homebrew classes. */
export function getDraftCatalog(state, id, role) {
  const catalog = getCharacterCatalog();
  const d = (state.characterDrafts ?? []).find((row) => row.id === id && row.owner === role);
  const actorId = d?.actorId ?? null;
  catalog.classes = copy(classesFor(state, role, actorId));
  Object.assign(catalog, copy(originsFor(state, role, actorId)));
  return catalog;
}
function ownedDraft(state, id, role, { writable = false } = {}) {
  const draft = (state.characterDrafts ?? []).find((d) => d.id === id);
  if (!draft || draft.owner !== role)
    throw error("draft-private", "Questa bozza è privata.", "This draft is private to its owner.");
  if (draft.actorId && !canControlActor(state.actors[draft.actorId], role))
    throw error(
      "actor-access",
      "Non puoi più modificare questa scheda.",
      "You can no longer edit this character.",
    );
  if (writable && draft.status !== "active")
    throw error("draft-closed", "La bozza è già conclusa.", "This draft is already closed.");
  return draft;
}
function livePreparedSelections(actor) {
  return (actor?.spells ?? [])
    .filter((s) => s.buildManaged && s.grantId && s.catalogId && s.level > 0 && s.prepared)
    .map((s) => ({ id: s.catalogId, grantId: s.grantId }));
}
function mergePreparedSelections(base, draft, live) {
  const key = (s) => s.grantId + ":" + s.id;
  const before = new Set(base.map(key)),
    planned = new Set(draft.map(key)),
    current = new Set(live.map(key));
  return [...new Map([...base, ...draft, ...live].map((s) => [key(s), s])).values()].filter((s) =>
    planned.has(key(s)) === before.has(key(s)) ? current.has(key(s)) : planned.has(key(s)),
  );
}
export function createCharacterDraft(state, { id, kind = "create", actorId = null }, role) {
  if (
    !["player", "dm"].includes(role) ||
    typeof id !== "string" ||
    !id.trim() ||
    !["create", "reconstruct", "advance", "revise"].includes(kind)
  )
    throw Error("Invalid draft identity or kind");
  const existing = (state.characterDrafts ?? []).find((d) => d.id === id);
  if (existing) {
    ownedDraft(state, id, role);
    if (existing.kind !== kind || existing.actorId !== actorId)
      throw Error("Draft identity already has different choices");
    return existing;
  }
  const actor = actorId ? state.actors[actorId] : null;
  if (
    ["advance", "revise"].includes(kind) &&
    (!actor || !canControlActor(actor, role) || actor.kind !== "character")
  )
    throw Error("Cannot control this character");
  if (!["advance", "revise"].includes(kind) && actorId)
    throw Error("New drafts cannot overwrite an actor");
  const draft = {
    id,
    owner: role,
    kind,
    actorId,
    section: "identity",
    revision: 0,
    status: "active",
    createdAt: now(),
    updatedAt: now(),
    data: initialData(kind, actor),
    rolls: copy(actor?.characterBuild?.rolls ?? []),
    baseStructureKey: hash(structural(actor)),
    baseLevel: actor?.level ?? 0,
    baseAbilities: copy(actor?.abilities ?? {}),
    baseMaxHp: actor?.maxHp ?? null,
    basePreparedSelections: actor?.characterBuild ? livePreparedSelections(actor) : null,
    baseStory: actor
      ? {
          description: actor.description ?? "",
          backstory: actor.backstory ?? "",
          personality: normalizePersonality(actor.personality),
        }
      : null,
  };
  (state.characterDrafts ||= []).push(draft);
  return draft;
}
/** BG3 / DDB «Level Up»: an advance draft opens on the next level of the class that levels
 *  (the only class, or the one levelled last), with the SRD fixed value as its HP method. */
export function prepareLevelUp(state, id, role) {
  const d = ownedDraft(state, id, role, { writable: true });
  const rows = Array.isArray(d.data.classes) ? d.data.classes : [];
  const total = rows.reduce((n, r) => n + (integer(r.level, 1, 20) ? r.level : 0), 0);
  if (d.kind !== "advance" || !rows.length || total !== d.baseLevel || total >= 20) return d;
  const order = levelOrder(d.data);
  const row = rows.find((r) => r.classId === (rows.length === 1 ? rows[0].classId : order.at(-1)));
  if (!row) return d;
  if (rows.length > 1) d.data.levelOrder = [...order, row.classId];
  row.level += 1;
  d.data.hp.perLevel ??= {};
  d.data.hp.perLevel[total + 1] ??= { method: "fixed" };
  d.revision++;
  d.updatedAt = now();
  return d;
}
export function getCharacterDraft(state, id, role) {
  return copy(ownedDraft(state, id, role));
}
export function listCharacterDrafts(state, role) {
  return (state.characterDrafts ?? [])
    .filter(
      (d) =>
        d.owner === role &&
        d.status === "active" &&
        (!d.actorId || canControlActor(state.actors[d.actorId], role)),
    )
    .map(copy);
}
export function saveCharacterDraft(state, id, { section, data = {}, expectedRevision }, role) {
  const d = ownedDraft(state, id, role, { writable: true });
  if (expectedRevision !== undefined && expectedRevision !== d.revision)
    throw error(
      "draft-conflict",
      "La bozza è cambiata: riaprila prima di salvare.",
      "The draft changed: reopen it before saving.",
    );
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).some((k) => !dataKeys.includes(k))
  )
    throw Error("Unknown draft data; roll evidence cannot be edited");
  if (section && !BUILD_SECTIONS.some((s) => s.id === section))
    throw Error("Unknown builder section");
  d.data = { ...d.data, ...copy(data) };
  if (section) d.section = section;
  d.revision++;
  d.updatedAt = now();
  return d;
}
export function discardCharacterDraft(state, id, role) {
  const d = ownedDraft(state, id, role, { writable: true });
  d.status = "discarded";
  d.updatedAt = now();
  return d;
}
function levelOrder(data) {
  if (!Array.isArray(data.classes)) return [];
  if (data.classes.length === 1 && integer(data.classes[0].level, 1, 20))
    return Array(data.classes[0].level).fill(data.classes[0].classId);
  return Array.isArray(data.levelOrder) ? data.levelOrder : [];
}
// Maximum HP the live sheet's recorded build explains through its level table (first level
// at maximum, then each level's recorded method), with the CON of the draft's baseline; null
// when a level's value was never recorded (a reconstructed sheet).
function baseHpTable(state, live, d, list = classes) {
  const data = live?.characterBuild?.data;
  if (!data || !number(d.baseAbilities?.con) || !integer(d.baseMaxHp, 1)) return null;
  const order = levelOrder(data),
    con = mod(d.baseAbilities.con);
  if (order.length !== d.baseLevel || !order.length) return null;
  let sum = 0;
  for (let i = 0; i < order.length; i++) {
    const c = list.find((row) => row.id === order[i]);
    if (!c) return null;
    const choice = data.hp?.perLevel?.[i + 1];
    let natural = i === 0 ? c.hitDie : null;
    if (i > 0 && choice?.method === "fixed") natural = c.hitDie / 2 + 1;
    else if (i > 0 && choice?.method === "manual" && integer(choice.value, 1, c.hitDie))
      natural = choice.value;
    else if (i > 0 && choice?.method === "roll") {
      const ledger = (state.characterBuildRolls ?? []).find((r) => r.id === choice.rollId);
      const roll = (live.characterBuild.rolls ?? []).find(
        (r) => r.id === choice.rollId && r.status === "resolved",
      );
      if (
        ledger?.status !== "reversed" &&
        roll?.kind === "hp" &&
        roll.dice?.[0]?.sides === c.hitDie
      )
        natural = roll.total;
    }
    if (natural === null) return null;
    sum += Math.max(1, natural + con);
  }
  return sum + (data.origin?.speciesId === "dwarf" ? order.length : 0);
}
function currentRoll(state, draft, id) {
  const ledger = (state.characterBuildRolls ?? []).find((r) => r.id === id);
  if (ledger?.status === "reversed") return null;
  return (draft.rolls ?? []).find((r) => r.id === id && r.status === "resolved") ?? null;
}
export function beginCharacterRoll(state, draftId, payload, role) {
  const d = ownedDraft(state, draftId, role, { writable: true }),
    { id, kind, index, mode } = payload;
  if (
    !id ||
    typeof id !== "string" ||
    !["abilities", "hp"].includes(kind) ||
    !["physical", "digital"].includes(mode)
  )
    throw Error("Invalid roll request");
  if ((state.characterBuildRolls ?? []).some((r) => r.id === id && r.status === "reversed"))
    throw Error("This roll was reversed; start a new explicit roll");
  const existing = d.rolls.find((r) => r.id === id);
  if (existing) {
    if (existing.kind !== kind || existing.index !== index || existing.mode !== mode)
      throw Error("Roll identity has different choices");
    return existing;
  }
  if ((state.characterBuildRolls ?? []).some((r) => r.id === id))
    throw Error("Roll identity belongs to another draft");
  const previous = d.rolls
    .filter(
      (r) =>
        r.kind === kind &&
        r.index === index &&
        r.status === "resolved" &&
        currentRoll(state, d, r.id),
    )
    .at(-1);
  if (previous && !payload.reason?.trim())
    throw error(
      "roll-already-recorded",
      "Un risultato è già registrato: dichiara il motivo del nuovo tiro o della correzione.",
      "A result is already recorded: explain this new roll or correction.",
    );
  if (
    payload.correctionOf &&
    (!d.rolls.some((r) => r.id === payload.correctionOf && r.status === "resolved") ||
      !payload.reason?.trim())
  )
    throw Error("A correction needs the previous result and a reason");
  let dice;
  if (kind === "abilities") {
    if (!integer(index, 0, 5)) throw Error("Invalid ability group");
    dice = [{ count: 4, sides: 6 }];
  } else {
    const order = levelOrder(d.data),
      c = classesFor(state, role, d.actorId).find((c) => c.id === order[index - 1]);
    if (!integer(index, 2, 20) || !c)
      throw Error("Choose the class of this later character level first");
    dice = [{ count: 1, sides: c.hitDie }];
  }
  const roll = {
    id,
    kind,
    index,
    mode,
    owner: role,
    controller: role,
    status: "pending",
    dice,
    modifier: 0,
    source: ruleSource(kind === "abilities" ? 21 : 23),
    createdAt: now(),
    correctionOf: payload.correctionOf ?? null,
    reason: payload.reason ?? "",
  };
  d.rolls.push(roll);
  d.revision++;
  d.updatedAt = now();
  return roll;
}
export function resolveCharacterRoll(state, draftId, rollId, values, role) {
  const d = ownedDraft(state, draftId, role, { writable: true }),
    r = d.rolls.find((r) => r.id === rollId);
  if (!r) throw Error("Unknown roll request");
  if ((state.characterBuildRolls ?? []).some((e) => e.id === rollId && e.status === "reversed"))
    throw Error("This roll was reversed; record a new roll");
  if (r.status === "resolved") {
    if (JSON.stringify(r.values) !== JSON.stringify(values))
      throw Error("Accepted dice cannot be overwritten");
    return r;
  }
  const sides = r.dice.flatMap((d) => Array(d.count).fill(d.sides));
  if (
    !Array.isArray(values) ||
    values.length !== sides.length ||
    values.some((v, i) => !integer(v, 1, sides[i]))
  )
    throw error(
      "invalid-roll",
      "Inserisci tutte le facce naturali valide.",
      "Enter all valid natural die faces.",
    );
  r.values = [...values];
  r.discarded = r.kind === "abilities" ? Math.min(...values) : null;
  r.total = values.reduce((a, b) => a + b, 0) - (r.discarded ?? 0);
  r.status = "resolved";
  r.resolvedAt = now();
  if (r.kind === "hp") {
    d.data.hp.perLevel ??= {};
    d.data.hp.perLevel[r.index] = { method: "roll", rollId };
  }
  const ledger = (state.characterBuildRolls ||= []);
  if (!ledger.some((e) => e.id === r.id)) ledger.push({ ...copy(r), draftId });
  d.revision++;
  d.updatedAt = now();
  return r;
}
function choiceId(value) {
  return typeof value === "string" ? value : value?.id;
}
function hasProvenance(item) {
  return (
    !!item?.source &&
    (typeof item.source === "string"
      ? !!item.source.trim()
      : !!item.source.kind && !!item.source.revision)
  );
}
function featEligibility(feat, total, effective, rows) {
  const req = feat.requirements;
  if (req.level && total < req.level)
    return {
      eligible: false,
      reason: text("Livello richiesto non raggiunto.", "Required level not reached."),
    };
  if (req.anyAbility) {
    const vals = req.anyAbility.map((a) => effective[a]);
    if (vals.some((v) => number(v) && v >= req.minimum)) return { eligible: true };
    if (vals.some((v) => !number(v)))
      return {
        eligible: null,
        reason: text("Caratteristica richiesta ignota.", "Required ability is unknown."),
      };
    return {
      eligible: false,
      reason: text("Caratteristica richiesta troppo bassa.", "Required ability is too low."),
    };
  }
  if (
    req.feature &&
    !rows.some(
      (r) => r.classId === "fighter" || (["paladin", "ranger"].includes(r.classId) && r.level >= 2),
    )
  )
    return {
      eligible: false,
      reason: text(
        "Manca la capacità Stile di Combattimento.",
        "The Fighting Style feature is missing.",
      ),
    };
  return { eligible: true };
}
function normalizeSelection(value, defaultGrant) {
  return typeof value === "string" ? { id: value, grantId: defaultGrant } : value;
}
function retainedInstanceEdits(record, actor, collection = "features") {
  if (!record.homebrewRef || !record.baseDefinition)
    record.baseDefinition = {
      name: copy(record.name),
      description: copy(record.description),
      source: copy(record.source),
    };
  const prior =
    actor?.[collection]?.find((f) => f.id === record.id) ??
    actor?.[collection === "features" ? "featureUsageLedger" : "spellUsageLedger"]?.[record.id];
  // Class-table uses (Action Surge 1 → 2): the maximum follows the level unless the sheet
  // corrected it; spent uses stay spent and never exceed the new maximum.
  if (record.catalogUses) {
    record.catalogMax = record.max;
    record.used ??= 0;
  }
  if (!prior) return record;
  for (const key of ["max", "used", "resourceHistory"]) {
    if (
      key === "max" &&
      record.catalogUses &&
      (prior.catalogMax === undefined || prior.max === prior.catalogMax)
    )
      continue;
    if (Object.hasOwn(prior, key)) record[key] = copy(prior[key]);
  }
  if (record.catalogUses && number(record.used) && number(record.max))
    record.used = Math.min(record.used, record.max);
  for (const key of ["name", "description"]) {
    if (
      Object.hasOwn(prior, key) &&
      hash(prior[key]) !== hash(prior.baseDefinition?.[key] ?? record.baseDefinition[key])
    ) {
      record.manualOverrides ??= {};
      record.manualOverrides[key] = {
        value: copy(prior[key]),
        source: prior.manualOverrides?.[key]?.source ?? {
          kind: "manual",
          revision: "sheet-correction-" + hash({ id: record.id, key, value: prior[key] }),
          label: "Preserved live sheet correction",
        },
      };
      record[key] = copy(prior[key]);
    }
  }
  return record;
}

export function previewCharacterDraft(state, id, role) {
  const d = ownedDraft(state, id, role),
    data = d.data,
    live = d.actorId ? state.actors[d.actorId] : null,
    errors = [],
    warnings = [];
  // SRD classes plus the homebrew classes this draft may use (BI-22).
  const classes = classesFor(state, role, d.actorId);
  const add = (code, section, it, en, path) =>
    errors.push({ code, section, it, en, ...(path ? { path } : {}) });
  const warn = (code, section, it, en, path) =>
    warnings.push({ code, section, it, en, ...(path ? { path } : {}) });
  const checkHomebrew = (record, section, current) => {
    if (!record?.homebrewRef) return;
    const available = homebrewAvailability(
      state,
      record.homebrewRef,
      { actorId: d.actorId || undefined },
      role,
    );
    if (available.canUse) return;
    const acquired =
      current?.homebrewRef?.contentId === record.homebrewRef.contentId &&
      current?.homebrewRef?.revisionId === record.homebrewRef.revisionId;
    if (acquired) {
      warn(
        "homebrew-retained-copy",
        section,
        "La copia già acquisita resta sulla scheda; questa fonte non è disponibile per nuove scelte o aggiornamenti.",
        "The acquired copy stays on the sheet; this source is unavailable for new choices or updates.",
      );
      return;
    }
    add(
      "homebrew-unavailable",
      section,
      "Una nuova scelta della Biblioteca non è più utilizzabile qui. Rimuovila o scegli una revisione disponibile.",
      "A new Library choice is no longer usable here. Remove it or choose an available revision.",
    );
  };
  for (const record of data.features?.custom ?? [])
    checkHomebrew(
      record,
      "features",
      live?.features?.find((entry) => entry.id === record.id),
    );
  for (const selected of data.spells?.selected ?? []) {
    const record = data.spells?.custom?.find((entry) => entry.id === (selected.id ?? selected));
    const current = live?.spells?.find((entry) =>
      selected.instanceId
        ? entry.id === selected.instanceId
        : entry.catalogId === selected.id && entry.grantId === selected.grantId,
    );
    checkHomebrew(record, "spells", current);
  }
  if (!live) for (const record of data.equipment?.items ?? []) checkHomebrew(record, "equipment");
  // Final review F1 (D&D Beyond Manage Level Up, BG3 level up): advancing a sheet whose
  // earlier levels the builder never recorded (a sample or hand-kept sheet) asks only for the
  // new level's choices; origin, skills, languages, class name and earlier features and
  // spells stay as the sheet has them. The applied level up stays in this mode.
  const levelUpOnly =
    d.kind === "advance" &&
    !!live &&
    (!live.characterBuild || live.characterBuild.levelUpOnly === true);
  const baseClassLevel = (classId) =>
    (live?.characterBuild?.data?.classes ?? live?.buildSeed?.classes ?? []).find(
      (c) => c.classId === classId,
    )?.level ?? 0;
  const reconstruction =
    d.kind === "reconstruct" ||
    levelUpOnly ||
    (!!live && (!live.characterBuild || live.characterBuild.verification === "partial"));
  const missing = (code, section, it, en, path) =>
    reconstruction ? warn(code, section, it, en, path) : add(code, section, it, en, path);
  const story = {};
  for (const key of ["description", "backstory"]) {
    const planned = data.story?.[key] ?? "",
      current = live?.[key] ?? "",
      before = d.baseStory?.[key] ?? current;
    if (typeof planned !== "string")
      add(
        "story-format",
        "story",
        "Il testo della storia non è valido.",
        "The story text is invalid.",
      );
    if (live && planned !== before && current !== before && planned !== current)
      add(
        "story-conflict",
        "story",
        "Lo stesso testo è cambiato anche sulla scheda: confronta la versione corrente prima di applicare.",
        "The same text also changed on the sheet: compare the current version before applying.",
      );
    story[key] = live && planned === before ? current : planned;
  }
  {
    const planned = normalizePersonality(data.story?.personality),
      current = normalizePersonality(live?.personality),
      before = d.baseStory?.personality ? normalizePersonality(d.baseStory.personality) : current,
      same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    if (live && !same(planned, before) && !same(current, before) && !same(planned, current))
      add(
        "story-conflict",
        "story",
        "Tratti, ideali, legami o difetti sono cambiati anche sulla scheda: confronta prima di applicare.",
        "Traits, ideals, bonds or flaws also changed on the sheet: compare before applying.",
      );
    story.personality = live && same(planned, before) ? current : planned;
  }
  if (
    live &&
    (hasBlockingConsequences(state, live.id) ||
      live.pendingHealing ||
      state.restTime?.rolls.some((roll) => roll.actorId === live.id && roll.status === "pending"))
  )
    add(
      "pending-consequences",
      "review",
      "Completa prima i tentativi e le reazioni collegati a questa scheda; la bozza resta salvata.",
      "Complete this character’s connected attempts and reactions first; the draft stays saved.",
    );
  if (live && hash(structural(live)) !== d.baseStructureKey)
    add(
      "structural-conflict",
      "review",
      "La costruzione della scheda è cambiata: confronta e riapri una bozza.",
      "The sheet structure changed: compare it and start a fresh draft.",
    );
  if (typeof data.identity?.name !== "string")
    add("name-format", "identity", "Nome non valido.", "Invalid name.");
  if (!["private", "shared"].includes(data.identity?.visibility))
    add("visibility", "identity", "Scegli la visibilità della scheda.", "Choose sheet visibility.");
  const rows = Array.isArray(data.classes) ? data.classes : [],
    total = rows.reduce((n, r) => n + (integer(r.level, 1, 20) ? r.level : 0), 0),
    order = levelOrder(data);
  if (
    !rows.length ||
    rows.some((r) => !classes.some((c) => c.id === r.classId) || !integer(r.level, 1, 20)) ||
    new Set(rows.map((r) => r.classId)).size !== rows.length ||
    !integer(total, 1, 20)
  )
    add(
      "classes",
      "class",
      "Scegli classi distinte e livelli validi, fino a 20 totali.",
      "Choose distinct classes and valid levels, up to 20 total.",
    );
  if (
    order.length !== total ||
    rows.some((r) => order.filter((id) => id === r.classId).length !== r.level)
  )
    missing(
      "level-order",
      "class",
      "Specifica l’ordine dei livelli: determina classe iniziale e PF.",
      "Specify level order: it determines initial class and HP.",
    );
  if (d.kind === "advance" && total <= d.baseLevel)
    add(
      "no-advancement",
      "class",
      "Il livello proposto deve superare quello attuale.",
      "The proposed level must exceed the current level.",
    );
  if (d.kind === "advance" && live?.characterBuild) {
    const before = levelOrder(live.characterBuild.data);
    if (before.some((c, i) => order[i] !== c))
      add(
        "changed-past-levels",
        "class",
        "Avanzare conserva i livelli precedenti: usa Rivedi scelte per cambiarli.",
        "Advancement preserves prior levels: use Revise choices to change them.",
      );
  }
  const origins = originsFor(state, role, d.actorId);
  const background = origins.backgrounds.find((b) => b.id === data.origin?.backgroundId),
    race = origins.species.find((s) => s.id === data.origin?.speciesId),
    initial = classes.find((c) => c.id === order[0]);
  // The class table (every base-class feature by level) is catalogued; subclass features,
  // from level 3, are known by subclass name only (a homebrew subclass brings its own).
  if (
    rows.some(
      (r) => r.level >= 3 && !isHomebrewClass(r.classId) && !isHomebrewSubclass(r.subclassId),
    )
  )
    warn(
      "catalogue-partial",
      "features",
      "Il catalogo guidato include i privilegi della tabella di classe, non quelli di sottoclasse (dal 3° livello): riconcilia quelli mancanti come capacità manuali con la loro fonte.",
      "The guided catalogue includes the class table’s features, not subclass features (from level 3): reconcile missing features manually with their sources.",
    );
  // Elven Lineage's level-1 cantrip is granted below (High Elf picker, Wood Elf Druidcraft);
  // Drow's Dancing Lights and the level 3/5 lineage spells are still recorded by hand.
  if (
    ["gnome", "tiefling"].includes(race?.id) ||
    (race?.id === "elf" && (data.origin?.choices?.lineage === "drow" || total >= 3))
  )
    warn(
      "catalogue-partial",
      "spells",
      "Le magie della specie richiedono ancora registrazione manuale della concessione e degli usi; il nome della specie non le aggiunge automaticamente.",
      "Species spell grants and uses still require manual recording; selecting a species does not add them automatically.",
    );
  if (!background)
    missing(
      "background",
      "origin",
      "Scegli il background o segnala la ricostruzione incompleta.",
      "Choose a background or retain the incomplete reconstruction.",
    );
  if (!race)
    missing(
      "species",
      "origin",
      "Scegli la specie o segnala la ricostruzione incompleta.",
      "Choose a species or retain the incomplete reconstruction.",
    );
  if (!data.sources?.enabled?.includes("srd-2024") && (rows.length || background || race))
    add(
      "source-disabled",
      "sources",
      "Le scelte SRD richiedono la fonte 2024 abilitata.",
      "SRD choices require the 2024 source to be enabled.",
    );
  const a = data.abilities ?? {},
    base = {},
    effective = {},
    abilityBreakdown = {},
    bonuses = data.origin?.backgroundBonuses ?? {},
    assignment = a.assignment ?? {};
  if (!["array", "point-buy", "roll", "manual"].includes(a.method))
    add(
      "ability-method",
      "abilities",
      "Scegli un metodo per le caratteristiche.",
      "Choose an ability score method.",
    );
  const assigned = new Set(),
    unassigned = [];
  let pointsSpent = 0;
  for (const key of ABILITY_IDS) {
    let value = null;
    if (["array", "roll"].includes(a.method)) {
      const index = assignment[key];
      if (integer(index, 0, 5) && !assigned.has(index)) {
        assigned.add(index);
        if (a.method === "array") value = STANDARD_ARRAY[index];
        else
          value =
            d.rolls
              .filter(
                (r) => r.kind === "abilities" && r.index === index && currentRoll(state, d, r.id),
              )
              .at(-1)?.total ?? null;
      }
    } else value = a.scores?.[key] ?? null;
    if (!integer(value, a.method === "point-buy" ? 8 : 1, a.method === "point-buy" ? 15 : 30)) {
      if (value !== null)
        add(
          "ability-range",
          "abilities",
          "Punteggio non valido per il metodo scelto.",
          "Invalid score for the chosen method.",
          key,
        );
      value = null;
    }
    if (value === null) unassigned.push(key);
    base[key] = value;
    if (a.method === "point-buy" && value !== null) pointsSpent += POINT_COST[value];
    const backgroundBonus = bonuses[key] ?? 0;
    if (
      !integer(backgroundBonus, 0, 2) ||
      (backgroundBonus > 0 && !background?.abilities.includes(key))
    )
      add(
        "background-bonus",
        "origin",
        "Gli aumenti devono usare le caratteristiche indicate dal background.",
        "Increases must use the background’s listed abilities.",
        "origin.backgroundBonuses." + key,
      );
    const featBonus = (data.features?.selected ?? [])
      .filter(
        (s) => typeof s === "object" && ["ability-score-improvement", "grappler"].includes(s.id),
      )
      .reduce((sum, s) => sum + (number(s.bonuses?.[key]) ? s.bonuses[key] : 0), 0);
    const calculated = value === null ? null : value + backgroundBonus + featBonus;
    if (calculated !== null && calculated > 20)
      add(
        "ability-cap",
        "abilities",
        "Questi aumenti non possono superare 20.",
        "These increases cannot exceed 20.",
      );
    const manual = a.manualTotals?.[key];
    if (manual !== undefined && (!integer(manual.value, 1, 30) || !manual.reason?.trim()))
      add(
        "manual-total",
        "abilities",
        "Il totale sostitutivo richiede un valore valido e un’origine dichiarata.",
        "A manual total needs a valid value and an explicit reason.",
      );
    effective[key] = manual && integer(manual.value, 1, 30) ? manual.value : calculated;
    abilityBreakdown[key] = {
      base: value,
      background: backgroundBonus,
      features: featBonus,
      calculated,
      manual: manual?.value ?? null,
      effective: effective[key],
      source: ruleSource(21, 83),
    };
  }
  // DDB (!) per section: one message for the section, pointing at the first empty field.
  if (unassigned.length)
    missing(
      "ability-missing",
      "abilities",
      "Assegna tutte le caratteristiche senza trasformare dati mancanti in zero.",
      "Assign every ability without treating missing data as zero.",
      (["array", "roll"].includes(a.method) ? "abilities.assignment." : "abilities.scores.") +
        unassigned[0],
    );
  if (a.method === "point-buy" && pointsSpent > 27)
    add(
      "point-buy-budget",
      "abilities",
      "La spesa supera i 27 punti disponibili.",
      "The cost exceeds the 27 available points.",
    );
  if (a.method === "point-buy" && pointsSpent < 27)
    warn(
      "unspent-points",
      "abilities",
      "Restano punti non assegnati.",
      "Some points remain unassigned.",
    );
  if (a.method === "manual" && !a.source?.trim())
    add(
      "manual-source",
      "abilities",
      "Dichiara l’origine dei valori manuali.",
      "State the origin of the manual scores.",
    );
  if (background?.homebrew && background.abilities.length !== 3)
    add(
      "homebrew-background",
      "origin",
      "Il background homebrew non indica le tre caratteristiche da aumentare: completalo nell’editor homebrew (Avanzamento).",
      "The homebrew background does not list its three abilities to increase: complete it in the homebrew editor (Advancement).",
    );
  else if (background) {
    const values = Object.values(bonuses)
      .filter((n) => n !== 0)
      .sort();
    if (JSON.stringify(values) !== "[1,2]" && JSON.stringify(values) !== "[1,1,1]")
      missing(
        "background-increases",
        "origin",
        "Aumenti del background da assegnare: +2 e +1 a due caratteristiche ammesse, oppure +1 a tutte e tre.",
        "Background increases to assign: +2 and +1 to two allowed abilities, or +1 to all three.",
        "origin.backgroundBonuses." +
          (background.abilities.find((key) => !bonuses[key]) ?? background.abilities[0]),
      );
  }
  if (rows.length > 1)
    for (const row of rows) {
      const c = classes.find((c) => c.id === row.classId);
      if (!c) continue;
      const valid =
        c.primaryMode === "any"
          ? c.primaryAbilities.some((k) => number(effective[k]) && effective[k] >= 13)
          : c.primaryAbilities.every((k) => number(effective[k]) && effective[k] >= 13);
      if (!valid)
        add(
          "multiclass-prerequisite",
          "class",
          "Il multiclasse richiede almeno 13 nelle caratteristiche primarie di tutte le classi; la deroga talenti non si applica.",
          "Multiclassing requires at least 13 in the primary abilities of all classes; feat overrides do not apply.",
        );
    }
  for (const row of rows)
    if (
      row.level >= 3 &&
      classes.find((c) => c.id === row.classId)?.subclasses.length &&
      !classes.find((c) => c.id === row.classId)?.subclasses.some((s) => s.id === row.subclassId)
    )
      missing(
        "subclass",
        "class",
        "Scegli la sottoclasse disponibile o registra quella mancante in ricostruzione.",
        "Choose an available subclass or retain the missing reconstruction choice.",
      );
  for (const choice of race?.choices ?? [])
    if (!choice.options.some((o) => o.id === data.origin.choices?.[choice.id]))
      missing(
        "species-choice",
        "origin",
        "Completa la scelta: " + choice.name.it,
        "Complete this choice: " + choice.name.en,
      );
  const selectedSkills = Array.isArray(data.skills?.selected) ? data.skills.selected : [],
    backgroundSkills = background?.skills ?? [];
  if (
    initial &&
    (selectedSkills.length !== initial.skillCount ||
      new Set(selectedSkills).size !== selectedSkills.length ||
      selectedSkills.some((id) => !initial.skills.includes(id)))
  )
    missing(
      "class-skills",
      "skills",
      "Seleziona le abilità richieste dalla classe iniziale, senza duplicati.",
      "Select the initial class’s required skills without duplicates.",
    );
  if (selectedSkills.some((id) => backgroundSkills.includes(id)))
    missing(
      "duplicate-skill",
      "skills",
      "Una competenza è già concessa dal background: scegli una competenza distinta.",
      "A skill is already granted by the background: choose a distinct proficiency.",
    );
  const selectedLanguages = data.skills?.languages ?? [];
  if (
    selectedLanguages.length !== 2 ||
    new Set(selectedLanguages).size !== 2 ||
    selectedLanguages.some((id) => id === "common" || !languages.some((l) => l.id === id))
  )
    missing(
      "languages",
      "skills",
      "Scegli due lingue standard oltre al Comune.",
      "Choose two standard languages in addition to Common.",
    );
  const grants = [
    ...requiredFeatureGrants(
      rows.filter((r) => !isHomebrewClass(r.classId)),
      race,
      [
        ...new Set([
          ...selectedSkills,
          ...backgroundSkills,
          ...(data.origin.choices?.skill ? [data.origin.choices.skill] : []),
        ]),
      ],
    ),
    ...rows.flatMap((r) => {
      const c = classes.find((row) => row.id === r.classId);
      const sub = c?.subclasses?.find((s) => s.homebrew && s.id === r.subclassId);
      return [
        ...(c?.homebrew ? homebrewGrants(c, r.level) : []),
        ...(sub ? homebrewGrants(sub, r.level) : []),
      ];
    }),
  ];
  const selections = data.features?.selected ?? [];
  if (
    rows.some((r) => ["druid", "ranger"].includes(r.classId)) ||
    selections.some((s) => ["thaumaturge", "magician"].includes(s.id))
  )
    warn(
      "catalogue-partial",
      "spells",
      "Le quote mostrate sono quelle della tabella di classe. Trucchetti aggiuntivi degli ordini e magie sempre preparate da altri privilegi richiedono ancora registrazione manuale separata, senza sottrarli dalla quota base.",
      "Displayed quotas are the class table’s base quotas. Order bonus cantrips and always-prepared feature spells still need separate manual recording without counting against the base quota.",
    );
  if (selections.some((s) => s.id === "skilled" || s.id?.startsWith("magic-initiate")))
    warn(
      "catalogue-partial",
      "features",
      "Le scelte interne a questo talento richiedono ancora registrazione manuale; il solo talento non completa competenze o magie.",
      "This feat’s internal choices still need manual recording; its name alone does not complete skills or spells.",
    );
  const grantIsNew = (grant) =>
    !levelUpOnly || grant.level > baseClassLevel(/^class:([^:]+)/.exec(grant.id)?.[1]);
  for (const grant of grants) {
    grant.selected = selections.filter((s) => s.grantId === grant.id).map(choiceId);
    if (!grantIsNew(grant)) continue;
    const valid =
      grant.selected.length === grant.count &&
      new Set(grant.selected).size === grant.selected.length &&
      grant.selected.every(
        (id) =>
          grant.options.some((o) => o.id === id) ||
          selections.some((s) => s.grantId === grant.id && s.id === id && hasProvenance(s)),
      );
    if (!valid) {
      const oldLevel =
        live?.characterBuild?.data.classes.find((c) => c.classId === grant.id.split(":")[1])
          ?.level ?? d.baseLevel;
      const report =
        (reconstruction && grant.level <= oldLevel) || d.kind === "reconstruct" ? missing : add;
      report(
        "required-feature-choice",
        "features",
        "Completa la scelta: " + grant.name.it,
        "Complete the choice: " + grant.name.en,
      );
    }
  }
  for (const selection of selections)
    if (!grants.some((g) => g.id === selection.grantId))
      add(
        "feature-grant",
        "features",
        "La scelta non ha una capacità attuale che la conceda.",
        "This choice has no current feature granting it.",
      );
  const featChoices = feats.map((f) => ({
    id: f.id,
    ...featEligibility(f, total, effective, rows),
  }));
  const featIds = [...(background ? [background.featId] : []), ...selections.map(choiceId)].filter(
    (id) => feats.some((f) => f.id === id),
  );
  for (const featId of new Set(featIds)) {
    if (
      !["ability-score-improvement", "skilled"].includes(featId) &&
      featIds.filter((id) => id === featId).length > 1
    )
      add(
        "nonrepeatable-feat",
        "features",
        "Lo stesso talento non ripetibile è già concesso da un’altra fonte.",
        "The same nonrepeatable feat is already granted by another source.",
      );
  }
  for (const selected of data.features?.selected ?? []) {
    const id = choiceId(selected),
      f = feats.find((f) => f.id === id);
    if (!f) {
      if (
        !grants.some((g) => g.id === selected.grantId && g.options.some((o) => o.id === id)) &&
        !hasProvenance(selected)
      )
        add(
          "unknown-feature",
          "features",
          "Una scelta non a catalogo richiede provenienza esplicita.",
          "An uncatalogued choice needs explicit provenance.",
        );
      continue;
    }
    const eligible = featChoices.find((e) => e.id === id).eligible;
    if (eligible !== true && !data.features.featOverride)
      add(
        "feat-prerequisite",
        "features",
        "Un talento ha requisiti mancanti o ignoti.",
        "A feat has unmet or unknown prerequisites.",
      );
    if (eligible !== true && data.features.featOverride)
      warn(
        "feat-override",
        "features",
        "Deroga ai requisiti del talento registrata.",
        "Feat prerequisite override recorded.",
      );
    if (["ability-score-improvement", "grappler"].includes(id)) {
      const bs = selected.bonuses ?? {},
        values = Object.values(bs);
      const required = id === "grappler" ? 1 : 2;
      if (
        values.some((n) => !integer(n, 0, 2)) ||
        values.reduce((n, v) => n + v, 0) !== required ||
        Object.keys(bs).some(
          (k) => !ABILITY_IDS.includes(k) || (id === "grappler" && !["str", "dex"].includes(k)),
        )
      )
        add(
          "feat-ability-choice",
          "features",
          "Definisci gli aumenti di caratteristica del talento.",
          "Specify the feat’s ability increases.",
        );
    }
  }
  if (!data.features?.confirmed)
    missing(
      "features-review",
      "features",
      "Rivedi capacità, scelte e limiti delle automazioni.",
      "Review features, choices and automation limits.",
    );
  const featureRecords = [
    ...rows.flatMap((row) => {
      const c = classes.find((entry) => entry.id === row.classId);
      const sub = c?.subclasses?.find((s) => s.homebrew && s.id === row.subclassId);
      return [
        ...(c?.homebrew
          ? homebrewFeaturesAt(c, row.level)
          : classFeaturesAt(row.classId, row.level)
        ).map((f) => ({ ...f, grantId: "class:" + row.classId })),
        ...(sub ? homebrewFeaturesAt(sub, row.level) : []).map((f) => ({
          ...f,
          grantId: "subclass:" + sub.id,
        })),
      ];
    }),
    ...(race?.features ?? []).map((f) => ({ ...copy(f), grantId: "species:" + race.id })),
    ...(background && feats.some((f) => f.id === background.featId)
      ? [
          {
            ...copy(feats.find((f) => f.id === background.featId)),
            grantId: "background:" + background.id,
          },
        ]
      : []),
    ...(background?.features ?? []).map((f) => ({
      ...copy(f),
      grantId: "background:" + background.id,
    })),
    ...(data.features?.selected ?? []).map((s) => ({
      ...copy(
        feats.find((f) => f.id === choiceId(s)) ??
          grants.find((g) => g.id === s.grantId)?.options.find((o) => o.id === choiceId(s)) ??
          s,
      ),
      grantId: s.grantId ?? "manual",
    })),
    ...(data.features?.custom ?? []),
  ].map((record) => {
    if (record.grantId && record.grantId !== "manual") {
      record.definitionId = record.id;
      record.id = record.grantId + ":" + record.definitionId;
    }
    return retainedInstanceEdits(record, live);
  });
  for (const f of data.features?.custom ?? [])
    if (!f.name || !hasProvenance(f))
      add(
        "custom-feature",
        "features",
        "Ogni capacità manuale richiede nome e provenienza.",
        "Every manual feature needs a name and provenance.",
      );
  const spellGrants = [];
  for (const row of rows) {
    const c = classes.find((c) => c.id === row.classId),
      progress = c && SPELL_PROGRESSION[c.id];
    if (!progress) continue;
    const own = calculateSpellSlots([row]),
      maxLevel =
        c.caster === "pact"
          ? own.pactSlots.level
          : Math.max(0, ...Object.keys(own.spellSlots).map(Number));
    const cantripCount = progress.cantrips[row.level - 1],
      preparedCount = progress.prepared[row.level - 1];
    if (cantripCount === undefined || preparedCount === undefined) {
      add(
        "spell-progression-missing",
        "spells",
        "La progressione di questa classe non è ancora verificata per quel livello.",
        "This class progression is not yet verified for that level.",
      );
      continue;
    }
    const knownCount = c.id === "wizard" ? 6 + 2 * (row.level - 1) : preparedCount;
    // Close review 01/10 (D&D Beyond level up: «Add 2 spells to your spellbook»): a level up
    // of a sheet the builder never recorded asks only the new level's spells; what the sheet
    // already has counts for the earlier levels.
    const base = levelUpOnly ? baseClassLevel(c.id) : 0;
    const baseCantrips = base ? (progress.cantrips[base - 1] ?? 0) : 0;
    const basePrepared = base ? (progress.prepared[base - 1] ?? 0) : 0;
    const baseKnown = base ? (c.id === "wizard" ? 6 + 2 * (base - 1) : basePrepared) : 0;
    spellGrants.push({
      id: "class:" + c.id,
      name: c.name,
      classId: c.id,
      spellcastingAbility: c.spellcastingAbility,
      cantripCount,
      preparedCount,
      knownCount,
      maxLevel,
      source: c.source,
      ...(levelUpOnly && base
        ? {
            levelUp: {
              from: base,
              to: row.level,
              cantrips: Math.max(0, cantripCount - baseCantrips),
              known: Math.max(0, knownCount - baseKnown),
              onSheet: (live?.spells ?? []).filter((spell) => !spell.buildManaged).length,
            },
          }
        : {}),
    });
  }
  if (background?.featId?.startsWith("magic-initiate")) {
    const classId = background.featId.slice("magic-initiate-".length);
    spellGrants.push({
      id: "background:magic-initiate",
      name: text("Iniziato alla Magia del background", "Background Magic Initiate"),
      classId,
      spellcastingAbility: data.origin?.choices?.magicInitiateAbility,
      cantripCount: 2,
      preparedCount: 1,
      knownCount: 1,
      maxLevel: 1,
      source: ruleSource(87),
    });
    if (!["int", "wis", "cha"].includes(data.origin?.choices?.magicInitiateAbility))
      missing(
        "magic-initiate-ability",
        "spells",
        "Scegli Intelligenza, Saggezza o Carisma per Iniziato alla Magia.",
        "Choose Intelligence, Wisdom or Charisma for Magic Initiate.",
      );
  }
  // SRD 5.2.1 Elven Lineage (EN 84): High Elf knows Prestidigitation, or another Wizard
  // cantrip chosen in its place; Wood Elf knows Druidcraft. DDB 2024 shows the picker inside
  // the species choice, so the selection lives in origin.choices.lineageCantrip.
  const lineage =
    race?.id === "elf"
      ? {
          high: { classId: "wizard", spellId: "prestidigitation", pick: true },
          wood: { classId: "druid", spellId: "druidcraft", pick: false },
        }[data.origin?.choices?.lineage]
      : null;
  if (lineage) {
    const chosen = lineage.pick
      ? data.origin?.choices?.lineageCantrip || lineage.spellId
      : lineage.spellId;
    const valid = spells.some(
      (spell) =>
        spell.id === chosen && spell.level === 0 && spell.classes.includes(lineage.classId),
    );
    if (!valid)
      add(
        "lineage-cantrip",
        "origin",
        "Scegli un trucchetto della lista del Mago per il Retaggio elfico.",
        "Choose a Wizard cantrip for Elven Lineage.",
        "origin.choices.lineageCantrip",
      );
    spellGrants.push({
      id: "species:elf:lineage",
      name: text("Retaggio elfico", "Elven Lineage"),
      classId: lineage.classId,
      spellcastingAbility: data.origin?.choices?.spellcastingAbility,
      cantripCount: 1,
      preparedCount: 0,
      knownCount: 0,
      maxLevel: 0,
      source: ruleSource(84),
      origin: true,
      spellId: valid ? chosen : null,
    });
  }
  const originGrants = spellGrants.filter((grant) => grant.origin);
  const defaultGrant = spellGrants.length === 1 ? spellGrants[0].id : null,
    selectedSpells = [
      ...(data.spells?.selected ?? [])
        .map((s) => normalizeSelection(s, defaultGrant))
        .filter((s) => !originGrants.some((grant) => grant.id === s.grantId)),
      ...originGrants
        .filter((grant) => grant.spellId)
        .map((grant) => ({ id: grant.spellId, grantId: grant.id })),
    ],
    preparedSpells = (
      live && d.basePreparedSelections
        ? mergePreparedSelections(
            d.basePreparedSelections,
            data.spells?.prepared ?? [],
            livePreparedSelections(live),
          )
        : (data.spells?.prepared ?? [])
    ).map((s) => normalizeSelection(s, defaultGrant)),
    customSpells = data.spells?.custom ?? [];
  const allSpells = [...spells, ...customSpells];
  for (const s of customSpells)
    if (!s.id || !s.name || !integer(s.level, 0, 9) || !hasProvenance(s))
      add(
        "custom-spell",
        "spells",
        "Ogni magia manuale richiede identità, livello e provenienza.",
        "Each manual spell needs an identity, level and provenance.",
      );
  const spellRecords = [];
  for (const grant of spellGrants) {
    const chosen = selectedSpells.filter((s) => s.grantId === grant.id),
      prepared = preparedSpells.filter((s) => s.grantId === grant.id),
      selectedDefs = chosen.map((s) => allSpells.find((e) => e.id === s.id));
    if (
      chosen.some(
        (s, i) =>
          !selectedDefs[i] ||
          selectedDefs[i].level > grant.maxLevel ||
          (selectedDefs[i].classes && !selectedDefs[i].classes.includes(grant.classId)),
      )
    )
      add(
        "spell-choice",
        "spells",
        "Una magia non appartiene alla lista o al livello concesso dalla sua fonte.",
        "A spell is outside its granting source’s list or level.",
      );
    if (new Set(chosen.map((s) => s.id)).size !== chosen.length)
      add(
        "duplicate-spell",
        "spells",
        "Non selezionare la stessa magia due volte per la stessa fonte.",
        "Do not select the same spell twice for one source.",
      );
    if (
      selectedDefs.filter((s) => s?.level === 0).length !== grant.cantripCount ||
      (grant.classId === "wizard" && grant.id === "class:wizard"
        ? selectedDefs.filter((s) => s?.level > 0).length < grant.knownCount
        : selectedDefs.filter((s) => s?.level > 0).length !== grant.knownCount)
    )
      missing(
        "spell-count",
        "spells",
        "Completa le magie concesse da " + grant.name.it + ".",
        "Complete spells granted by " + grant.name.en + ".",
      );
    if (grant.levelUp) {
      const cantrips = selectedDefs.filter((s) => s?.level === 0).length;
      const known = selectedDefs.filter((s) => s?.level > 0).length;
      const { cantrips: needC, known: needK, to } = grant.levelUp;
      if (cantrips < needC || known < needK)
        warn(
          "levelup-spells",
          "spells",
          `${grant.name.it} al livello ${to}: ${[
            needC
              ? `scegli ${needC} trucchett${needC === 1 ? "o" : "i"} nuov${needC === 1 ? "o" : "i"} (${cantrips}/${needC})`
              : "",
            needK
              ? `aggiungi ${needK} magi${needK === 1 ? "a" : "e"} al libro (${known}/${needK})`
              : "",
          ]
            .filter(Boolean)
            .join(" e ")}.`,
          `${grant.name.en} at level ${to}: ${[
            needC
              ? `choose ${needC} new cantrip${needC === 1 ? "" : "s"} (${cantrips}/${needC})`
              : "",
            needK
              ? `add ${needK} spell${needK === 1 ? "" : "s"} to the book (${known}/${needK})`
              : "",
          ]
            .filter(Boolean)
            .join(" and ")}.`,
        );
    }
    if (
      prepared.length > grant.preparedCount ||
      new Set(prepared.map((s) => s.id)).size !== prepared.length ||
      prepared.some(
        (s) => !chosen.some((c) => c.id === s.id) || !allSpells.find((e) => e.id === s.id)?.level,
      )
    )
      missing(
        "prepared-count",
        "spells",
        "Seleziona la preparazione distinta di " + grant.name.it + ".",
        "Select the separate prepared list for " + grant.name.en + ".",
      );
    else if (prepared.length < grant.preparedCount) {
      const report = live ? warn : missing;
      report(
        "prepared-underfilled",
        "spells",
        "Restano magie preparabili per " +
          grant.name.it +
          "; non ne vengono preparate automaticamente.",
        "Some preparation capacity remains for " +
          grant.name.en +
          "; no spells are prepared automatically.",
      );
    }
    for (const entry of chosen) {
      const def = allSpells.find((s) => s.id === entry.id);
      if (def) {
        const acquired = def.homebrewRef
          ? [...(live?.spells ?? []), ...Object.values(live?.spellUsageLedger ?? {})].find(
              (record) =>
                record.catalogId === def.id &&
                record.grantId === grant.id &&
                record.homebrewRef?.contentId === def.homebrewRef.contentId &&
                record.homebrewRef?.revisionId === def.homebrewRef.revisionId,
            )
          : null;
        const record = {
          ...copy(def),
          id: entry.instanceId ?? acquired?.id ?? grant.id + ":" + def.id,
          catalogId: def.id,
          grantId: grant.id,
          spellcastingAbility: grant.spellcastingAbility,
          prepared: def.level === 0 || prepared.some((p) => p.id === def.id),
          buildManaged: true,
        };
        spellRecords.push(def.homebrewRef ? retainedInstanceEdits(record, live, "spells") : record);
      }
    }
  }
  if (selectedSpells.some((s) => !spellGrants.some((g) => g.id === s.grantId)))
    add(
      "spell-source",
      "spells",
      "Ogni magia scelta deve conservare una fonte attuale.",
      "Every chosen spell must keep a current granting source.",
    );
  if (spellGrants.some((grant) => !grant.origin) && !data.spells?.confirmed)
    missing(
      "spells-review",
      "spells",
      "Rivedi le scelte magiche.",
      "Review your spell selections.",
    );
  const hpData = data.hp ?? {},
    con = number(effective.con) ? mod(effective.con) : null,
    hpParts = [];
  let calculatedMax = null;
  const dwarfBonus = race?.id === "dwarf" ? total : 0;
  if (con !== null && order.length === total) {
    let sum = 0,
      known = true;
    for (let i = 0; i < order.length; i++) {
      const c = classes.find((c) => c.id === order[i]);
      if (!c) {
        known = false;
        continue;
      }
      let natural = i === 0 ? c.hitDie : null;
      const choice = hpData.perLevel?.[i + 1];
      if (i > 0) {
        if (choice?.method === "fixed") natural = c.hitDie / 2 + 1;
        else if (choice?.method === "roll") {
          const roll = currentRoll(state, d, choice.rollId);
          if (roll?.kind === "hp" && roll.index === i + 1 && roll.dice[0].sides === c.hitDie)
            natural = roll.total;
        } else if (choice?.method === "manual" && integer(choice.value, 1, c.hitDie))
          natural = choice.value;
      }
      if (natural === null) {
        known = false;
        hpParts.push({
          level: i + 1,
          classId: c.id,
          die: c.hitDie,
          natural: null,
          modifier: con,
          total: null,
        });
      } else {
        const value = i === 0 ? Math.max(1, natural + con) : Math.max(1, natural + con);
        sum += value;
        hpParts.push({
          level: i + 1,
          classId: c.id,
          die: c.hitDie,
          natural,
          modifier: con,
          total: value,
          method: i === 0 ? "maximum" : choice.method,
        });
      }
    }
    if (known) calculatedMax = sum + dwarfBonus;
  }
  let maxHp = calculatedMax;
  if (hpData.mode === "manual") {
    if (!integer(hpData.maxHp, 1))
      add(
        "manual-hp",
        "class",
        "Inserisci un massimo PF manuale valido.",
        "Enter a valid manual HP maximum.",
      );
    maxHp = integer(hpData.maxHp, 1) ? hpData.maxHp : null;
  } else if (
    hpData.mode === "delta" &&
    live &&
    baseHpTable(state, live, d, classes) &&
    calculatedMax !== null
  ) {
    // dnd5e Level Down / BG3 respec: the sheet keeps what the level table does not explain
    // (a correction, a feat); every level added or removed changes it by that level's value.
    maxHp = d.baseMaxHp + calculatedMax - baseHpTable(state, live, d, classes);
  } else if (hpData.mode === "delta" && live && total < d.baseLevel) {
    add(
      "hp-delta-removed",
      "class",
      "Il valore PF dei livelli tolti non è registrato: scegli «Calcolo dalle scelte note» o indica il totale.",
      "The removed levels’ HP values are not recorded: choose «Calculate from known choices» or enter the total.",
      "hp.mode",
    );
  } else if (hpData.mode === "delta" && live) {
    const added = hpParts.filter((p) => p.level > d.baseLevel);
    if (
      !integer(d.baseMaxHp, 1) ||
      con === null ||
      !number(d.baseAbilities.con) ||
      added.length !== total - d.baseLevel ||
      added.some((p) => p.total === null)
    )
      add(
        "hp-delta",
        "class",
        "Definisci i PF dei nuovi livelli e i dati correnti prima di applicare.",
        "Define new-level HP and current data before applying.",
      );
    else
      maxHp =
        d.baseMaxHp +
        added.reduce((n, p) => n + p.total, 0) +
        d.baseLevel * (con - mod(d.baseAbilities.con)) +
        (race?.id === "dwarf" ? total - d.baseLevel : 0);
  } else if (hpData.mode !== "calculated")
    add(
      "hp-method",
      "class",
      "Scegli come determinare il massimo PF.",
      "Choose how to determine maximum HP.",
    );
  // Level 1 has no HP field: its maximum waits only for Constitution.
  const hpLevelMissing = hpParts.find((part) => part.total === null && part.level > 1);
  if (maxHp === null && hpData.mode === "calculated" && con === null && order.length === total)
    add(
      "hp-needs-con",
      "abilities",
      "I PF massimi dipendono dalla Costituzione: assegnala.",
      "Maximum HP depends on Constitution: assign it.",
      (["array", "roll"].includes(a.method) ? "abilities.assignment." : "abilities.scores.") +
        "con",
    );
  else if (maxHp === null && hpData.mode === "calculated")
    add(
      "hp-missing",
      "class",
      "Completa i PF di ogni livello; un totale manuale non inventa i tiri storici.",
      "Complete each level’s HP; a manual total does not invent historical rolls.",
      hpLevelMissing ? "hp.perLevel." + hpLevelMissing.level + ".method" : undefined,
    );
  const currentHp = live
    ? Math.min(live.hp, maxHp ?? live.hp)
    : d.kind === "reconstruct"
      ? hpData.currentHp
      : maxHp;
  if (
    d.kind === "reconstruct" &&
    (!hpData.currentKnown ||
      !integer(hpData.currentHp, 0) ||
      (maxHp !== null && hpData.currentHp > maxHp))
  )
    add(
      "current-hp",
      "class",
      "La ricostruzione richiede PF attuali espliciti entro il massimo.",
      "Reconstruction needs explicit current HP within the maximum.",
    );
  if (live && number(maxHp) && live.hp > maxHp)
    warn(
      "hp-clamp",
      "review",
      "I PF attuali saranno limitati al nuovo massimo; nessuna cura o danno retroattivo.",
      "Current HP will be limited to the new maximum; no retroactive healing or damage.",
    );
  let slotResult = { spellSlots: {}, pactSlots: null };
  const ruleRows = rows.filter((r) => !isHomebrewClass(r.classId));
  if (ruleRows.length && !errors.some((e) => e.code === "classes"))
    slotResult = calculateSpellSlots(ruleRows);
  if (rows.some((r) => classes.find((c) => c.id === r.classId)?.homebrewCaster))
    warn(
      "catalogue-partial",
      "spells",
      "Gli incantesimi della classe homebrew non hanno ancora una progressione: registra slot e magie a mano.",
      "The homebrew class's spells have no progression yet: record slots and spells by hand.",
    );
  const pools = {};
  for (const key of new Set([
    ...Object.keys(slotResult.spellSlots),
    ...Object.keys(live?.spellSlots ?? {}),
    ...(live?.slots ? ["1"] : []),
  ])) {
    const previous = live?.spellSlots?.[key] ?? (key === "1" ? live?.slots : null);
    const used = previous
      ? previous.used
      : d.kind === "reconstruct"
        ? data.spells?.slotUses?.[key]
        : 0;
    pools[key] = { max: slotResult.spellSlots[key] ?? 0, used: used ?? null };
    if (d.kind === "reconstruct" && pools[key].max > 0 && !integer(used, 0))
      add(
        "reconstructed-resource",
        "spells",
        "Registra gli slot già spesi per ogni livello.",
        "Record spent spell slots at every level.",
      );
  }
  if (!pools[1]) pools[1] = { max: 0, used: 0 };
  const pact = slotResult.pactSlots
    ? {
        ...slotResult.pactSlots,
        used: live?.pactSlots
          ? live.pactSlots.used
          : d.kind === "reconstruct"
            ? (data.spells?.pactUsed ?? null)
            : 0,
      }
    : live?.pactSlots
      ? { ...copy(live.pactSlots), max: 0 }
      : null;
  if (live?.pactSlots && pact && live.pactSlots.level !== pact.level && live.pactSlots.used > 0)
    add(
      "pact-reconciliation",
      "spells",
      "La riserva del Patto cambia livello: riconcilia esplicitamente gli usi prima di applicare.",
      "The Pact pool changes level: explicitly reconcile spent uses before applying.",
    );
  if (d.kind === "reconstruct" && pact && !integer(pact.used, 0))
    add(
      "reconstructed-resource",
      "spells",
      "Registra gli slot del Patto già spesi.",
      "Record spent Pact slots.",
    );
  const hitDice = {};
  for (const row of rows) {
    const c = classes.find((c) => c.id === row.classId);
    if (c) {
      const key = "d" + c.hitDie;
      hitDice[key] ??= {
        max: 0,
        used: live?.hitDice?.[key]
          ? live.hitDice[key].used
          : d.kind === "reconstruct"
            ? (data.hp?.hitDiceUsed?.[key] ?? null)
            : 0,
      };
      hitDice[key].max += row.level;
    }
  }
  for (const [key, value] of Object.entries(live?.hitDice ?? {}))
    if (!hitDice[key]) hitDice[key] = { max: 0, used: value.used };
  if (d.kind === "reconstruct" && Object.values(hitDice).some((pool) => !integer(pool.used, 0)))
    add(
      "reconstructed-resource",
      "class",
      "Registra i Dadi Vita già spesi per ogni tipo.",
      "Record spent Hit Dice of each type.",
    );
  const equipment = data.equipment ?? {},
    items = copy(equipment.items ?? []),
    currency = copy(equipment.currency ?? { gp: 0 });
  if (!live) {
    if (!equipment.confirmed)
      add(
        "equipment-review",
        "equipment",
        "Conferma dotazione o registrazione manuale, anche se vuota.",
        "Confirm equipment or manual entry, even if empty.",
      );
    if (!["manual", "starting-gold", "starting-pack"].includes(equipment.mode))
      add(
        "equipment-mode",
        "equipment",
        "Scegli un metodo per la dotazione.",
        "Choose an equipment method.",
      );
    if (d.kind === "reconstruct" && equipment.mode !== "manual")
      add(
        "reconstruction-equipment",
        "equipment",
        "Ricostruire registra i beni posseduti e non regala una dotazione iniziale.",
        "Reconstruction records owned items and does not grant starting equipment.",
      );
    if (equipment.mode !== "manual") {
      for (const optionId of [equipment.classOptionId, equipment.backgroundOptionId]) {
        const option = origins.equipmentOptions.find((e) => e.id === optionId);
        if (
          !option ||
          (option.classId && option.classId !== initial?.id) ||
          (option.backgroundId && option.backgroundId !== background?.id)
        ) {
          add(
            "starting-option",
            "equipment",
            "Scegli una dotazione valida per classe e background.",
            "Choose valid equipment for class and background.",
          );
          continue;
        }
        for (const item of option.items)
          items.push({ ...copy(item), id: id + ":" + option.id + ":" + item.id, equipped: false });
        for (const [coin, n] of Object.entries(option.currency))
          currency[coin] = (currency[coin] ?? 0) + n;
      }
    }
  }
  if (
    items.some(
      (i) =>
        !i.id ||
        !i.name ||
        !integer(i.quantity, 0) ||
        !number(i.weight) ||
        i.weight < 0 ||
        !hasProvenance(i),
    ) ||
    new Set(items.map((i) => i.id)).size !== items.length
  )
    add(
      "inventory-input",
      "equipment",
      "Oggetti manuali: nome, quantità, peso e provenienza devono essere validi.",
      "Manual items need valid names, quantities, weights and provenance.",
    );
  if (Object.values(currency).some((n) => !number(n) || n < 0))
    add(
      "currency",
      "equipment",
      "Le monete non possono essere negative o mancanti.",
      "Currency cannot be negative or missing.",
    );
  if (d.rolls.some((r) => r.status === "pending"))
    add(
      "pending-roll",
      "review",
      "Completa i dadi richiesti prima di applicare.",
      "Complete pending dice before applying.",
    );
  const speed = race
    ? race.id === "elf" && data.origin.choices?.lineage === "wood"
      ? 10.5
      : race.speed
    : (live?.speed ?? null);
  const proficiencyBonus = total ? 2 + Math.floor((total - 1) / 4) : null;
  const savingThrows = Object.fromEntries(
    ABILITY_IDS.map((key) => {
      const calculated = number(effective[key])
        ? mod(effective[key]) + (initial?.savingThrows.includes(key) ? proficiencyBonus : 0)
        : null;
      const prior = live?.characterBuild?.appliedValues?.savingThrows;
      const manual = live?.savingThrows?.[key];
      return [key, number(manual) && (!prior || manual !== prior[key]) ? manual : calculated];
    }),
  );
  // F1: a level up keeps what the sheet already records and adds the new level's features.
  const recordIsNew = (f) => {
    const classId = /^class:([^:]+)/.exec(f.grantId ?? "")?.[1];
    const level = f.level ?? grants.find((g) => g.id === f.grantId)?.level;
    return Boolean(classId) && Number.isInteger(level) && level > baseClassLevel(classId);
  };
  const sameClasses =
    levelUpOnly &&
    new Set(rows.map((r) => r.classId)).size ===
      new Set([
        ...rows.map((r) => r.classId),
        ...[...(live.characterBuild?.data?.classes ?? live.buildSeed?.classes ?? [])].map(
          (c) => c.classId,
        ),
      ]).size &&
    (live.characterBuild?.data?.classes ?? live.buildSeed?.classes ?? []).length === rows.length;
  const levelUpLanguages = () => {
    if (!selectedLanguages.length) return live.languages;
    return [...new Set([...(live.languages ?? ["common"]), ...selectedLanguages])];
  };
  const proposed = {
    name: data.identity.name.trim() || text("Personaggio senza nome", "Unnamed character"),
    visibility: live?.visibility ?? "private",
    story,
    level: total,
    classes: copy(rows),
    className:
      sameClasses && live.className
        ? copy(live.className)
        : text(
            rows
              .map((r) => (classes.find((c) => c.id === r.classId)?.name.it ?? "?") + " " + r.level)
              .join(" / "),
            rows
              .map((r) => (classes.find((c) => c.id === r.classId)?.name.en ?? "?") + " " + r.level)
              .join(" / "),
          ),
    abilities: effective,
    savingThrows,
    maxHp,
    hp: currentHp,
    tempHp: live?.tempHp ?? hpData.tempHp ?? 0,
    ac: live?.ac ?? (number(effective.dex) ? 10 + mod(effective.dex) : null),
    speed,
    proficiencyBonus,
    skills: [
      ...new Set([
        ...(levelUpOnly ? (live.skills ?? []) : []),
        ...selectedSkills,
        ...backgroundSkills,
        ...(data.origin.choices?.skill ? [data.origin.choices.skill] : []),
      ]),
    ],
    languages: levelUpOnly ? levelUpLanguages() : ["common", ...selectedLanguages],
    features: levelUpOnly
      ? [
          ...(live.features ?? []).filter((f) => f.buildManaged).map((f) => copy(f)),
          ...featureRecords.filter(
            (f) => recordIsNew(f) && !(live.features ?? []).some((old) => old.id === f.id),
          ),
        ]
      : featureRecords,
    spells: spellRecords,
    spellSlots: pools,
    pactSlots: pact,
    hitDice,
    inventory: live ? undefined : items,
    currency: live ? undefined : currency,
  };
  warn(
    "manual-feature-resolution",
    "features",
    "La scheda registra le capacità; quelle senza un comando al Tavolo richiedono risoluzione manuale.",
    "The sheet records features; those without a Table command require manual resolution.",
  );
  if (levelUpOnly) {
    // Choices the sheet made at earlier levels are not asked again (DDB Manage Level Up).
    const quiet = new Set([
      "background",
      "species",
      "class-skills",
      "duplicate-skill",
      "languages",
      "features-review",
      "spells-review",
      "spell-count",
      "prepared-count",
      "prepared-underfilled",
      "level-order",
    ]);
    for (let i = warnings.length - 1; i >= 0; i--)
      if (quiet.has(warnings[i].code)) warnings.splice(i, 1);
  }
  const sections = BUILD_SECTIONS.map((s) => ({
    ...s,
    errors: errors.filter((e) => e.section === s.id),
    // Close review 01/10: a section «Da rivedere» says why (its first check).
    warnings: warnings.filter((e) => e.section === s.id),
    status: errors.some((e) => e.section === s.id)
      ? "incomplete"
      : warnings.some((e) => e.section === s.id)
        ? "review"
        : s.id === "spells" && !spellGrants.length
          ? "not-applicable"
          : "complete",
  }));
  return {
    draft: copy(d),
    sections,
    errors,
    warnings,
    canApply: d.status === "active" && !errors.length,
    reviewKey: hash({
      id: d.id,
      revision: d.revision,
      data: d.data,
      base: structural(live),
      resources: currentResources(live),
      proposed,
      rolls: (state.characterBuildRolls ?? []).filter((r) => r.draftId === d.id),
    }),
    proposed,
    breakdown: {
      abilities: abilityBreakdown,
      pointsSpent,
      pointsRemaining: 27 - pointsSpent,
      hp: { parts: hpParts, calculated: calculatedMax, dwarfBonus, effective: maxHp },
      slots: slotResult,
    },
    choices: {
      classSkills: initial
        ? {
            count: initial.skillCount,
            options: skills.filter((s) => initial.skills.includes(s.id)),
            selected: selectedSkills,
          }
        : null,
      feats: featChoices,
      grants: grants.filter(grantIsNew),
      spellGrants,
    },
    levelUpOnly,
    incomplete:
      !levelUpOnly &&
      (warnings.some((w) => w.code === "catalogue-partial") ||
        (reconstruction && warnings.some((w) => w.code !== "manual-feature-resolution"))),
  };
}
export function applyCharacterDraft(
  state,
  id,
  { operationId, reviewKey, allowIncomplete = false },
  role,
) {
  const d = ownedDraft(state, id, role);
  if (d.status === "applied") return copy(d.result);
  if (d.status !== "active") throw Error("Draft is closed");
  if (!operationId || typeof operationId !== "string")
    throw Error("Apply operation identity is required");
  if (
    (state.characterBuildOperations ?? []).some(
      (o) => o.operationId === operationId && o.draftId !== id,
    )
  )
    throw Error("Apply operation already belongs to another draft");
  const p = previewCharacterDraft(state, id, role);
  if (!p.canApply)
    throw error(
      "build-incomplete",
      "Completa le scelte segnalate prima di applicare.",
      "Complete the reported choices before applying.",
    );
  if (p.reviewKey !== reviewKey)
    throw error(
      "stale-review",
      "La scheda o la bozza è cambiata: rivedi le differenze correnti.",
      "The sheet or draft changed: review the current differences.",
    );
  if (p.incomplete && !allowIncomplete)
    throw error(
      "unverified-reconstruction",
      "Conferma esplicitamente l’applicazione con dati da verificare.",
      "Explicitly confirm applying data that still needs verification.",
    );
  const proposed = p.proposed,
    actorId = d.actorId ?? "character-" + d.id;
  let actor = state.actors[actorId];
  if (!d.actorId && actor) throw Error("Character identity already exists");
  if (!actor) {
    actor = {
      id: actorId,
      kind: "character",
      owner: role,
      campaignIds: [],
      creationContext: d.data.identity.context,
      inventory: copy(proposed.inventory),
      currency: copy(proposed.currency),
      notes: "",
      movement: proposed.speed,
      action: true,
      bonus: true,
      reaction: true,
      conditions: [],
      concentration: null,
    };
    state.actors[actorId] = actor;
  }
  // The explicit 2024 zero-HP policy; a policy already recorded (for example a DM
  // correction) is never replaced by applying a later build.
  if (actor.kind === "character") actor.vitalityPolicy ??= characterZeroHpPolicy();
  const previousSpells = actor.spells ?? [],
    previousFeatures = actor.features ?? [];
  actor.featureUsageLedger ??= {};
  for (const feature of previousFeatures) {
    if (feature.buildManaged) actor.featureUsageLedger[feature.id] = copy(feature);
  }
  actor.spellUsageLedger ??= {};
  for (const spell of previousSpells) {
    if (spell.buildManaged && spell.homebrewRef) actor.spellUsageLedger[spell.id] = copy(spell);
  }
  Object.assign(actor, {
    name: typeof proposed.name === "string" ? proposed.name : proposed.name.it,
    visibility: d.actorId ? actor.visibility : "private",
    level: proposed.level,
    className: copy(proposed.className),
    abilities: copy(proposed.abilities),
    savingThrows: copy(proposed.savingThrows),
    maxHp: proposed.maxHp,
    hp: proposed.hp,
    tempHp: proposed.tempHp,
    ac: proposed.ac,
    speed: proposed.speed,
    spellSlots: copy(proposed.spellSlots),
    pactSlots: copy(proposed.pactSlots),
    hitDice: copy(proposed.hitDice),
    skills: copy(proposed.skills),
    ...(proposed.languages === undefined ? {} : { languages: copy(proposed.languages) }),
  });
  actor.slots = actor.spellSlots[1];
  actor.features = [
    ...previousFeatures.filter((f) => !f.buildManaged),
    ...proposed.features.map((f) => ({ ...copy(f), buildManaged: true })),
  ];
  actor.spells = [...previousSpells.filter((s) => !s.buildManaged), ...copy(proposed.spells)];
  const initial = classes.find((c) => c.id === levelOrder(d.data)[0]),
    casting = classes.find(
      (c) =>
        c.id ===
        d.data.classes.find((row) => classes.find((c) => c.id === row.classId)?.spellcastingAbility)
          ?.classId,
    );
  actor.combatProfile = {
    ...actor.combatProfile,
    proficiencyBonus: proposed.proficiencyBonus,
    weaponProficiencies:
      initial &&
      [
        "wizard",
        "fighter",
        "barbarian",
        "bard",
        "cleric",
        "druid",
        "monk",
        "paladin",
        "ranger",
        "rogue",
        "sorcerer",
        "warlock",
      ].includes(initial.id)
        ? ["quarterstaff"]
        : [],
    spellcastingAbility: casting?.spellcastingAbility ?? null,
    spells: actor.spells
      .filter(
        (s) =>
          s.combatActionId &&
          s.prepared &&
          (s.spellcastingAbility ?? casting?.spellcastingAbility) === casting?.spellcastingAbility,
      )
      .map((s) => s.combatActionId),
    componentsAvailable: actor.combatProfile?.componentsAvailable ?? true,
    team: actor.combatProfile?.team ?? "party",
  };
  actor.description = proposed.story.description;
  actor.backstory = proposed.story.backstory;
  actor.personality = normalizePersonality(proposed.story.personality);
  actor.characterBuild = {
    revision: operationId,
    data: copy(d.data),
    rolls: copy(d.rolls.filter((r) => r.status === "resolved")),
    appliedValues: {
      abilities: copy(proposed.abilities),
      savingThrows: copy(proposed.savingThrows),
      maxHp: proposed.maxHp,
    },
    source: ruleSource(19, 20, 21, 22, 23, 25, 26),
    verification: p.incomplete ? "partial" : "recorded",
    ...(p.levelUpOnly ? { levelUpOnly: true } : {}),
    manualGameplay: true,
    appliedAt: now(),
  };
  updateCharacterRestProfile(actor, d.data, {
    newCharacter: d.kind === "create",
    advancement: d.kind === "advance",
  });
  updateCharacterFormsProfile(actor, d.data, {
    newCharacter: d.kind === "create",
    advancement: d.kind === "advance",
  });
  d.status = "applied";
  d.updatedAt = now();
  d.result = { actorId, draftId: id, operationId, kind: d.kind };
  (state.characterBuildOperations ||= []).push({
    ...copy(d.result),
    owner: role,
    appliedAt: now(),
  });
  return copy(d.result);
}
export { getCharacterCatalog };
