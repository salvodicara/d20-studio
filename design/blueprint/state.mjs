import { seedDemoFormsActors } from "./forms-profile.mjs";
import { expireTurnEffects, knownEvidence } from "./combat.mjs";
import { getEffectiveSpeed, observeFormsEvent } from "./forms-companions.mjs";
import { hasCondition } from "./conditions.mjs";
import { canControlActor, isActorAvailable } from "./character-access.mjs";
import { tracePath, geometryKey } from "./spatial.mjs";
import { migrateCampaignContent } from "./campaign-content.mjs";
import { seedDemoRestResources } from "./rest-profile.mjs";
import { observeRestEvent, advanceRoundTime } from "./rest-time.mjs";
import { getById } from "./srd-sample.mjs";
import { npcFromCreature, srdMeleeProfile } from "./srd-compendium.mjs";
import { sampleSessions } from "./sample-clock.mjs";

const STORAGE_KEY = "d20-studio-blueprint-v1";
const copy = (value) => structuredClone(value);
const text = (it, en) => ({ it, en });
const srd = (en, it) => ({
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
const DEMO_SOURCE = {
  kind: "authored-demo",
  edition: "2024",
  revision: "blueprint-increment10-vitality",
  note: "Synthetic fixture facts: held items unknown for creatures with items until play records them (empty inventories hold nothing); sample creature sizes; no condition immunity (SRD 2024 species and Fighter/Wizard/Druid levels 1–3 grant none).",
};
const DEMO_CHARACTERS = ["livia", "doran", "mira"],
  DEMO_CREATURES = ["goblin-1", "goblin-2"];
// Explicit survival data for the sample actors only (increment 10); never inferred for
// other actors. Characters use death saves (SRD EN 17–18 / IT 19–20); the sample
// monsters die at 0 HP (EN 17 / IT 19). Also fills an older saved demo state.
export function seedDemoVitality(state) {
  for (const id of [...DEMO_CHARACTERS, ...DEMO_CREATURES]) {
    const actor = state.actors?.[id];
    if (!actor || actor.vitalityPolicy) continue;
    const character = DEMO_CHARACTERS.includes(id);
    actor.vitalityPolicy = character
      ? { zeroHp: "death-saves", source: srd([17, 18], [19, 20]) }
      : { zeroHp: "death", source: srd([17], [19]) };
    actor.conditionImmunities ??= [];
    actor.conditionImmunitiesSource ??= DEMO_SOURCE;
    // What a creature with items holds is unknown until play records it (a weapon
    // attack records the weapon); an empty inventory holds nothing.
    if (actor.heldItemIds === undefined)
      actor.heldItemIds = (actor.inventory ?? []).some((item) => item?.quantity > 0) ? null : [];
    actor.size ??= character ? "medium" : "small";
    if (character) actor.skills ??= [];
  }
}
// ---------------------------------------------------------------- sample spells and ambush

// TV-79 (dnd5e concentration request, Fantasy Grounds (C) effect): Mira, the sample Druid 3,
// prepares SRD 5.2.1 Druid spells for her level: 2 cantrips and 6 prepared spells (Druid
// table, EN 42 / IT 48), with Speak with Animals always prepared (Druidic). Faerie Fire,
// Entangle and Moonbeam need Concentration, so casting one from her sheet sets it and damage
// then asks the Constitution save. Her Druid 3 slots (four of level 1, two of level 2) come
// with her fixture. Filled only while she has no spell row.
const MIRA_SPELLS = Object.freeze([
  "druidcraft",
  "produce-flame",
  "cure-wounds",
  "entangle",
  "faerie-fire",
  "healing-word",
  "moonbeam",
  "lesser-restoration",
]);
export function seedDemoSpells(state) {
  const mira = state.actors?.mira;
  if (!mira || (mira.spells ?? []).length) return;
  const row = (slug, extra = {}) => {
    const entry = getById("srd2024:spell:" + slug);
    return {
      id: "mira-spell-" + slug,
      catalogId: slug,
      name: copy(entry.name),
      level: entry.level,
      prepared: entry.level > 0,
      description: copy(entry.summary),
      grantId: "class:druid",
      source: copy(entry.source),
      compendiumRef: { id: entry.id, revision: "5.2.1" },
      ...extra,
    };
  };
  mira.spells = [
    ...MIRA_SPELLS.map((slug) => row(slug)),
    row("speak-with-animals", {
      grantId: "class:druid:druidic",
      alwaysPrepared: true,
      alwaysSource: srd([42], [48]),
    }),
  ];
}

// TV-52/TV-59 (Improved Initiative plain labels, Mob Attack Tool): an additive sample scene,
// never the active one, so the default scene and the fixtures built on it stay as they are.
// The party meets two identical SRD Goblin Warriors (EN 290 / IT 340) carrying the stat
// block's attacks: the Scimitar as their structured melee attack, the Shortbow as an equipped
// ranged weapon with arrows, which the Inventory area turns into a Table attack (Dexterity
// plus proficiency: +4, 1d6 + 2 piercing, the block's own numbers). They share one row key,
// the key identical creatures use for one Initiative roll (SRD EN 13 / IT 14).
export const AMBUSH_SCENE_ID = "road-ambush";
export const AMBUSH_GOBLINS = Object.freeze(["goblin-warrior-a", "goblin-warrior-b"]);
const AMBUSH_ROW = "sample-road-goblins";
function goblinWarrior(id, name) {
  const entry = getById("srd2024:creature:goblin-warrior");
  const { input, patch } = npcFromCreature(entry, { id, name, team: "watch" });
  const bow = getById("srd2024:item:shortbow");
  return {
    id,
    name: input.name,
    kind: "npc",
    owner: "dm",
    hp: input.hp,
    maxHp: input.hp,
    ac: input.ac,
    speed: input.speed,
    movement: input.speed,
    action: true,
    bonus: true,
    reaction: true,
    level: 1,
    ...patch,
    className: copy(entry.name),
    size: "small",
    proficiencyBonus: entry.proficiencyBonus,
    slots: { used: 0, max: 0 },
    inventory: [
      {
        id: id + "-shortbow",
        srdId: bow.id,
        name: copy(bow.name),
        description: copy(bow.summary),
        kind: "weapon",
        category: bow.category,
        quantity: 1,
        weight: 1,
        equipped: true,
        weaponType: bow.slug,
        weapon: copy(bow.weapon),
        source: copy(bow.source),
      },
      {
        id: id + "-arrows",
        srdId: null,
        name: text("Frecce", "Arrows"),
        description: text("Munizioni per l’arco corto.", "Ammunition for the shortbow."),
        kind: "gear",
        quantity: 20,
        weight: 0.025,
        equipped: false,
        ammunition: "arrow",
        source: srd([96], [111]),
      },
    ],
    notes: "",
    combatProfile: {
      team: "watch",
      proficiencyBonus: entry.proficiencyBonus,
      weaponProficiencies: ["scimitar", "shortbow"],
      meleeAttack: srdMeleeProfile(entry),
    },
    encounterBlock: { creatureId: entry.id, encounterId: null, rowId: AMBUSH_ROW },
    vitalityPolicy: { zeroHp: "death", source: srd([17], [19]) },
    conditionImmunities: [],
    conditionImmunitiesSource: copy(entry.source),
    heldItemIds: null,
  };
}
export function seedDemoAmbush(state) {
  if (state.scenes.some((scene) => scene.id === AMBUSH_SCENE_ID)) return;
  if (AMBUSH_GOBLINS.some((id) => state.actors[id])) return;
  state.actors[AMBUSH_GOBLINS[0]] = goblinWarrior(AMBUSH_GOBLINS[0], "Goblin guerriero A");
  state.actors[AMBUSH_GOBLINS[1]] = goblinWarrior(AMBUSH_GOBLINS[1], "Goblin guerriero B");
  const party = [
    ["livia", 200, 330],
    ["doran", 250, 400],
    ["mira", 150, 420],
  ].filter(([id]) => state.actors[id]);
  state.scenes.push({
    id: AMBUSH_SCENE_ID,
    name: "Agguato sulla strada",
    description:
      "Scena d’esempio: due goblin guerrieri identici (SRD) aspettano dietro un carro rovesciato. Un solo tiro d’iniziativa per i due; «Attacco di gruppo» con scimitarra o arco corto.",
    publicDescription: "Un carro rovesciato blocca la strada tra i campi.",
    gridSize: 50,
    metersPerCell: 1.5,
    width: 1000,
    height: 650,
    gridVisible: true,
    gridSnap: false,
    background: null,
    revealed: true,
    template: "blank",
    tokens: [
      ...party.map(([id, x, y]) => ({ id: "ambush-" + id, actorId: id, x, y })),
      { id: "ambush-goblin-a", actorId: AMBUSH_GOBLINS[0], x: 700, y: 280 },
      { id: "ambush-goblin-b", actorId: AMBUSH_GOBLINS[1], x: 760, y: 360 },
    ],
    walls: [],
  });
}

const recordId = () =>
  globalThis.crypto?.randomUUID?.() ?? Date.now() + "-" + Math.random().toString(36).slice(2);

function preserveInitiativeResults(before, draft) {
  if (!before.initiativeRolls && !draft.initiativeRolls) return;
  const entries = copy(before.initiativeRolls || []);
  const ids = new Set(entries.map((entry) => entry.id));
  for (const entry of draft.initiativeRolls || []) {
    if (ids.has(entry.id)) continue;
    entries.push(copy(entry));
    ids.add(entry.id);
  }
  draft.initiativeRolls = entries;
}

function preserveBuildRolls(before, draft) {
  if (!before.characterBuildRolls && !draft.characterBuildRolls) return;
  const entries = copy(before.characterBuildRolls || []);
  const ids = new Set(entries.map((entry) => entry.id));
  for (const entry of draft.characterBuildRolls || []) {
    if (ids.has(entry.id)) continue;
    entries.push(copy(entry));
    ids.add(entry.id);
  }
  draft.characterBuildRolls = entries;
}

function preserveRestResults(before, draft) {
  for (const prior of before.restTime?.rolls ?? []) {
    const next = draft.restTime?.rolls.find((entry) => entry.id === prior.id);
    if (Number.isInteger(prior.acceptedFace) && next?.acceptedFace !== prior.acceptedFace)
      throw Error("An accepted Hit Die face cannot change or disappear");
  }
}

function restoreRestEvidence(current, restored, reversal) {
  if (!current?.rolls?.length) return;
  restored.restTime ??= { version: 1, clocks: {}, rests: [], rolls: [], events: [] };
  for (const roll of current.rolls) {
    const target = restored.restTime.rolls.find((entry) => entry.id === roll.id);
    if (target) {
      // The snapshot restores application state; the accepted face is never rerolled.
      if (Number.isInteger(roll.acceptedFace)) target.acceptedFace = roll.acceptedFace;
    } else {
      restored.restTime.rolls.push({ ...copy(roll), status: "reversed", ...reversal });
    }
  }
}

function restoreCombatEvidence(current, restored) {
  for (const attempt of current ?? []) {
    const target = restored.combatAttempts?.find((entry) => entry.id === attempt.id);
    if (!target) continue;
    target.rollEvidence = { ...copy(attempt.rollEvidence ?? {}), ...target.rollEvidence };
    for (const request of attempt.requests) {
      const values =
        request.acceptedValues ?? (request.status === "resolved" ? request.values : null);
      if (!Array.isArray(values)) continue;
      // The dice profile and audience travel with the faces, so a recreated request
      // can tell reusable evidence from a recomputed profile and keep private faces private.
      target.rollEvidence[request.id] = {
        acceptedValues: copy(values),
        dice: copy(request.dice),
        mode: request.mode ?? attempt.mode,
        personal: request.personal === true,
        owner: request.owner,
      };
      const pending = target.requests.find((entry) => entry.id === request.id);
      if (pending?.status === "pending") {
        delete pending.acceptedValues;
        delete pending.knownValues;
        Object.assign(pending, knownEvidence(target.rollEvidence[request.id], pending));
        // Undo withdrew this application: it waits for an explicit Reapply (or a reasoned
        // correction), digital or physical alike. No later automatic continuation, and no
        // other player's command, silently applies it again.
        pending.withdrawn = true;
      }
    }
  }
}

function acceptedRolls(before, draft, controller, visibility, commitId) {
  const rolls = [];
  const append = (entry) => rolls.push(copy({ id: commitId + ":" + rolls.length, ...entry }));
  for (const roll of draft.restTime?.rolls ?? []) {
    const previous = before.restTime?.rolls.find((entry) => entry.id === roll.id);
    if (!Number.isInteger(roll.acceptedFace) || Number.isInteger(previous?.acceptedFace)) continue;
    const actor = draft.actors[roll.actorId];
    append({
      source: "rest",
      kind: "hit-die",
      restRollId: roll.id,
      restId: roll.restId,
      actorId: roll.actorId,
      actorName: actor?.name,
      owner: roll.owner,
      controller,
      visibility:
        visibility === "private" ||
        roll.campaignId === null ||
        actor?.visibility === "private" ||
        actor?.hidden
          ? "private"
          : "shared",
      mode: roll.mode,
      dice: [{ count: 1, sides: roll.sides }],
      values: [roll.acceptedFace],
      natural: roll.acceptedFace,
      modifier: roll.modifier,
      total: roll.result?.total ?? Math.max(1, roll.acceptedFace + roll.modifier),
      ruleSource: roll.source,
      result: copy(roll.result),
    });
  }
  const previousBuild = new Set((before.characterBuildRolls || []).map((entry) => entry.id));
  for (const entry of draft.characterBuildRolls || []) {
    if (previousBuild.has(entry.id) || entry.status !== "resolved") continue;
    const { id: buildRollId, source: ruleSource, ...result } = entry;
    append({
      ...result,
      source: "character-build",
      ruleSource,
      buildRollId,
      visibility: "private",
    });
  }
  const previousInitiative = new Set((before.initiativeRolls || []).map((entry) => entry.id));
  for (const entry of draft.initiativeRolls || []) {
    if (!entry.id || previousInitiative.has(entry.id) || entry.status === "reversed") continue;
    append({
      source: "initiative",
      kind: "initiative",
      initiativeRollId: entry.id,
      sceneId: entry.sceneId,
      sceneName: entry.sceneName,
      actorId: entry.actorId,
      actorName: entry.actorName,
      controller,
      owner: entry.controller || controller,
      visibility: "private",
      mode: entry.mode,
      dice: [{ count: 1, sides: 20 }],
      values: [entry.natural],
      natural: entry.natural,
      modifier: entry.bonus,
      total: entry.total,
      rollMode: "normal",
    });
  }
  for (const attempt of draft.combatAttempts || []) {
    const previous = (before.combatAttempts || []).find((entry) => entry.id === attempt.id);
    const audience = (request, actor) => {
      const personal = request.personal ?? actor?.visibility === "private";
      const base = {
        owner: request.owner || actor?.owner,
        personal,
        visibility:
          personal || visibility === "private" || actor?.owner !== "player" || actor?.hidden
            ? "private"
            : "shared",
      };
      // TV-89 (Foundry roll modes, DDB «Roll to»; the dice tray's rollEvent rule): the
      // attack's audience travels with its faces, so the Registro, the 3D dice and every
      // other reader of the log apply combat.canSeeAttemptValues even after the attempt is
      // gone. A hidden audience is a private roll; «Io e il DM» and «Solo il DM» belong to
      // the DM (and whoever runs the session), and a blind roll's roller never sees its dice.
      if (personal || !["gm", "blind", "self"].includes(attempt.audience)) return base;
      return {
        ...base,
        visibility: "private",
        audience: attempt.audience,
        acceptedBy: attempt.acceptedBy ?? null,
        ...(attempt.audience === "self" ? {} : { owner: "dm" }),
        ...(attempt.audience === "blind" ? { controller: "dm" } : {}),
      };
    };
    // PG-47 and C1: the riders a D20 request rolled (Bless, Bane) and the DC it was rolled
    // against, so the Registro names «+ [3] (Benedizione)» and can hide a DM's DC.
    const riderEvidence = (request) => ({
      ...(Array.isArray(request.riders) && request.riders.length
        ? { riders: copy(request.riders) }
        : {}),
      ...(Array.isArray(request.riderRolls) && request.riderRolls.length
        ? { riderRolls: copy(request.riderRolls) }
        : {}),
      ...(Number.isFinite(request.dc) ? { dc: request.dc } : {}),
    });
    for (const request of attempt.requests || []) {
      const priorRequest = previous?.requests.find((entry) => entry.id === request.id);
      const recomputed = request.recomputedFrom;
      if (recomputed?.supersededValues.length && !priorRequest?.recomputedFrom) {
        // Faces that the recomputed dice profile cannot use stay in history as superseded.
        const actor = draft.actors[request.actorId];
        append({
          source: "combat",
          kind: request.kind,
          status: "superseded",
          reason: recomputed.reason,
          attemptId: attempt.id,
          requestId: request.id,
          actionName: attempt.actionName,
          actorId: request.actorId,
          actorName: actor?.name,
          controller,
          ...audience(request, actor),
          mode: recomputed.mode,
          dice: recomputed.dice,
          newDice: request.dice,
          values: recomputed.values,
          keptValues: recomputed.keptValues,
          supersededValues: recomputed.supersededValues,
        });
      }
      const priorValues =
        priorRequest?.acceptedValues ??
        (priorRequest?.status === "resolved" ? priorRequest.values : null) ??
        previous?.rollEvidence?.[request.id]?.acceptedValues;
      // A retry that reuses a withdrawn attempt's faces is a new application: the
      // history records it once, as "reused", instead of hiding it as a reapplication.
      const reusedPending =
        !!attempt.rollEvidence?.[request.id]?.reusedFrom && priorRequest?.status !== "resolved";
      // TV-83: a Heroic Inspiration reroll is a new roll even when it lands on the same face,
      // so the history keeps the first roll and the reroll (combat.useHeroicInspiration).
      const rerolled = !!request.inspirationReroll && !priorRequest?.inspirationReroll;
      if (
        request.status !== "resolved" ||
        !Array.isArray(request.values) ||
        (!reusedPending &&
          !rerolled &&
          Array.isArray(priorValues) &&
          JSON.stringify(priorValues) === JSON.stringify(request.values))
      )
        continue;
      const actor = draft.actors[request.actorId];
      // Faces reused from an attempt that Undo withdrew are the same roll, not a new one.
      const reused = attempt.rollEvidence?.[request.id];
      const reusedSame =
        reused?.reusedFrom &&
        JSON.stringify(reused.acceptedValues) === JSON.stringify(request.values);
      append({
        source: "combat",
        kind: request.kind,
        attemptId: attempt.id,
        requestId: request.id,
        retryKey: attempt.retryKey ?? null,
        ...(reusedSame ? { status: "reused", reusedFrom: reused.reusedFrom } : {}),
        actionName: attempt.actionName,
        actorId: request.actorId,
        actorName: actor?.name,
        controller: request.resolvedBy || controller,
        ...audience(request, actor),
        mode: request.mode ?? (request.actorId === attempt.actorId ? attempt.mode : null),
        ...(Array.isArray(request.faceModes) ? { faceModes: copy(request.faceModes) } : {}),
        dice: request.dice,
        values: request.values,
        modifier: request.modifier,
        natural: request.natural,
        total: request.total,
        rollMode: request.rollMode,
        ...riderEvidence(request),
        ...(request.correctionReason
          ? {
              correctionReason: request.correctionReason,
              previousValues: request.previousValues,
            }
          : {}),
        ...(recomputed
          ? {
              recomputedFrom: copy(recomputed),
              knownValues: copy(request.knownValues ?? []),
            }
          : {}),
      });
    }
  }
  return rolls;
}
export function createInitialState() {
  const actor = (id, name, kind, owner, hp, maxHp, ac, className) => ({
    id,
    name,
    kind,
    owner,
    hp,
    maxHp,
    ac,
    className,
    level: 3,
    speed: 9,
    movement: 9,
    action: true,
    bonus: true,
    reaction: true,
    abilities: { str: 10, dex: 14, con: 14, int: 16, wis: 12, cha: 10 },
    // Final review F13: only a spellcaster has spell slots (the wizard sets hers below).
    slots: { used: 0, max: 0 },
    inventory: [],
    notes: "",
  });
  const livia = actor("livia", "Livia", "character", "player", 18, 22, 12, text("Maga", "Wizard"));
  livia.slots = { used: 1, max: 4 };
  livia.buildSeed = {
    classes: [{ classId: "wizard", level: 3, subclassId: "evoker" }],
    levelOrder: ["wizard", "wizard", "wizard"],
    source: {
      kind: "authored",
      revision: "demo-1",
      title: text("Profilo sintetico di Livia", "Livia synthetic profile"),
    },
  };
  livia.combatProfile = {
    spellcastingAbility: "int",
    proficiencyBonus: 2,
    weaponProficiencies: ["quarterstaff"],
    spells: ["fire-bolt", "burning-hands", "magic-missile", "shield"],
    componentsAvailable: true,
    team: "party",
  };
  livia.spells = [
    {
      id: "sample-fire-bolt",
      combatActionId: "fire-bolt",
      name: text("Dardo di fuoco", "Fire Bolt"),
      level: 0,
      prepared: true,
      description: "",
      source: "SRD 5.2.1 · 2024 · sample spellcasting profile",
    },
    {
      id: "sample-burning-hands",
      combatActionId: "burning-hands",
      name: text("Mani brucianti", "Burning Hands"),
      level: 1,
      prepared: true,
      description: "",
      source: "SRD 5.2.1 · 2024 · sample spellcasting profile",
    },
    {
      id: "sample-magic-missile",
      combatActionId: "magic-missile",
      name: text("Dardo incantato", "Magic Missile"),
      level: 1,
      prepared: true,
      description: "",
      source: "SRD 5.2.1 · 2024 · sample spellcasting profile",
    },
    {
      id: "sample-shield",
      combatActionId: "shield",
      name: text("Scudo", "Shield"),
      level: 1,
      prepared: true,
      description: text(
        "Reazione quando vieni colpito o bersagliato da Dardo incantato. La scelta compare al momento dell’innesco.",
        "Reaction when hit or targeted by Magic Missile. The choice appears when triggered.",
      ),
      source: "SRD 5.2.1 · 2024 · EN161–162 / IT186 · sample spellcasting profile",
    },
  ];
  livia.inventory = [
    {
      id: "staff",
      name: text("Bastone", "Quarterstaff"),
      quantity: 1,
      weight: 2,
      equipped: true,
      kind: "weapon",
      description: text(
        "Bastone di legno chiaro, trovato al vecchio osservatorio.",
        "Pale wooden staff from the old observatory.",
      ),
    },
    {
      id: "potion",
      name: text("Pozione di guarigione", "Potion of healing"),
      quantity: 3,
      weight: 0.25,
      equipped: false,
      kind: "consumable",
      healing: 7,
      description: text("Recuperi 2d4 + 2 punti ferita.", "Regain 2d4 + 2 hit points."),
    },
    {
      id: "rope",
      name: text("Corda", "Rope"),
      quantity: 1,
      weight: 2.5,
      equipped: false,
      kind: "gear",
      description: text("15 metri, legata allo zaino.", "15 metres, tied to the backpack."),
    },
  ];
  const doran = actor(
    "doran",
    "Doran",
    "character",
    "dm",
    27,
    31,
    16,
    text("Guerriero", "Fighter"),
  );
  doran.buildSeed = {
    classes: [{ classId: "fighter", level: 3, subclassId: "champion" }],
    levelOrder: ["fighter", "fighter", "fighter"],
    source: {
      kind: "authored",
      revision: "demo-1",
      title: text("Profilo sintetico di Doran", "Doran synthetic profile"),
    },
  };
  const state = {
    version: 1,
    actors: {
      livia,
      doran,
      "goblin-1": actor(
        "goblin-1",
        "Sentinella",
        "npc",
        "dm",
        7,
        7,
        13,
        text("Creatura di esempio", "Sample creature"),
      ),
      "goblin-2": actor(
        "goblin-2",
        "Esploratore",
        "npc",
        "dm",
        9,
        9,
        12,
        text("Creatura di esempio", "Sample creature"),
      ),
    },
    campaign: {
      id: "lanterns",
      name: "Le lanterne di Bruma",
      summary:
        "Il gruppo ha raggiunto il vecchio osservatorio. Qualcuno ha riacceso la lanterna sulla torre.",
      journal: [],
      // Sample freshness: «Il sigillo della torre» is always the coming Thursday (sample-clock.mjs).
      sessions: sampleSessions(),
    },
    scenes: [
      {
        id: "old-watch",
        name: "Il cortile dell’osservatorio",
        description: "Un cortile aperto, senza ostacoli di regole nel primo scenario dimostrativo.",
        publicDescription: "Una lanterna illumina il vecchio osservatorio.",
        gridSize: 50,
        metersPerCell: 1.5,
        width: 1000,
        height: 650,
        gridVisible: true,
        gridSnap: false,
        background: null,
        revealed: true,
        template: "courtyard",
        tokens: [
          { id: "token-livia", actorId: "livia", x: 250, y: 380 },
          { id: "token-doran", actorId: "doran", x: 350, y: 450 },
          { id: "token-goblin-1", actorId: "goblin-1", x: 620, y: 250 },
          { id: "token-goblin-2", actorId: "goblin-2", x: 740, y: 340 },
        ],
        walls: [],
      },
    ],
    activeSceneId: "old-watch",
    combat: { active: false, round: 1, turn: 0, order: ["livia", "goblin-1", "doran", "goblin-2"] },
    log: [],
    notes: [],
    library: [],
  };
  seedDemoRestResources(state);
  seedDemoFormsActors(state);
  seedDemoSpells(state);
  seedDemoAmbush(state);
  seedDemoVitality(state);
  migrateCampaignContent(state);
  return state;
}
// ---------------------------------------------------------------- sandbox (IN-10)

// DDB Quickbuilder without login / the Forge sandbox: «Prova senza account» opens the sample
// campaign in a separate copy on this device. The signed-out account's data is untouched;
// closing the trial deletes the copy; «Crea un account per salvare» makes it the device data.
export const SANDBOX_FLAG = "d20-studio-sandbox";
export const SANDBOX_KEY = "d20-studio-sandbox-state-v1";
export function readSandbox(storage) {
  try {
    const value = JSON.parse(storage?.getItem(SANDBOX_FLAG) ?? "null");
    return value && ["player", "dm"].includes(value.role) ? value : null;
  } catch {
    return null;
  }
}
// The same storage with the blueprint state kept under the sandbox key.
export function sandboxStorage(storage) {
  const key = (name) => (name === STORAGE_KEY ? SANDBOX_KEY : name);
  return {
    getItem: (name) => storage.getItem(key(name)),
    setItem: (name, value) => storage.setItem(key(name), value),
    removeItem: (name) => storage.removeItem?.(key(name)),
  };
}
export function startSandbox(storage, role, now = Date.now()) {
  if (!["player", "dm"].includes(role)) throw Error("Unknown identity");
  storage.removeItem?.(SANDBOX_KEY);
  storage.setItem(SANDBOX_FLAG, JSON.stringify({ role, since: new Date(now).toISOString() }));
}
export function endSandbox(storage) {
  storage.removeItem?.(SANDBOX_FLAG);
  storage.removeItem?.(SANDBOX_KEY);
}
// The trial becomes this device's data (the signed-out account's copy is replaced).
export function promoteSandbox(storage) {
  const saved = storage.getItem(SANDBOX_KEY);
  if (!saved) throw Error("No trial data to keep");
  parseSaved(saved);
  storage.setItem(STORAGE_KEY, saved);
  endSandbox(storage);
}

// Parses saved data, or throws when it is not this blueprint's state.
function parseSaved(saved) {
  const parsed = JSON.parse(saved);
  if (
    parsed.version !== 1 ||
    !parsed.actors?.livia ||
    !Array.isArray(parsed.scenes) ||
    !parsed.scenes.length
  )
    throw Error("Invalid local data");
  migrateCampaignContent(parsed);
  seedDemoVitality(parsed);
  return parsed;
}
export function createStore({ storage } = {}) {
  let state = createInitialState();
  const history = [];
  let storageError = storage ? "" : "unavailable";
  // CA-10 (Foundry / LegendKeeper conflict detection): what the device storage held the
  // last time this tab looked. Another tab that saves changes it; this tab then reloads
  // before its next change, so a save never overwrites work it has not seen.
  let seen = null;
  const listeners = new Set();
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    seen = saved ?? null;
    if (saved) state = parseSaved(saved);
  } catch {
    storageError = "read";
  }
  function persist() {
    if (!storage) {
      storageError = "unavailable";
      return;
    }
    if (storageError === "read") return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      seen = storage.getItem(STORAGE_KEY) ?? null;
      storageError = "";
    } catch {
      storageError = "write";
    }
  }
  // Reloads the state another tab (or window) saved since this tab last looked. The undo
  // stack is dropped: undoing now would restore a state without the other tab's work.
  function sync() {
    if (!storage || storageError === "read") return false;
    let saved;
    try {
      saved = storage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
    if (!saved || saved === seen) return false;
    try {
      state = parseSaved(saved);
    } catch {
      return false;
    }
    seen = saved;
    history.length = 0;
    for (const listener of listeners) listener(state);
    return true;
  }
  const win = globalThis.window;
  if (storage && win?.addEventListener)
    win.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY || event.key === null) sync();
    });
  return {
    sync,
    // A listener runs after this tab reloaded another tab's saved state.
    onExternalChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get state() {
      return state;
    },
    get storageError() {
      return storageError;
    },
    get history() {
      return history;
    },
    commit(label, mutator, controller = "player", options = {}) {
      sync();
      const before = copy(state);
      const draft = copy(state);
      mutator(draft);
      const id = recordId();
      reconcileFormsAfterMutation(draft, id);
      const visibility =
        options.visibility === "private" || options.shared === false ? "private" : "shared";
      preserveInitiativeResults(before, draft);
      preserveBuildRolls(before, draft);
      preserveRestResults(before, draft);
      const rolls = acceptedRolls(before, draft, controller, visibility, id);
      if (options.undoable !== false)
        history.push({
          id,
          before,
          label,
          controller,
          shared: options.shared !== false,
          visibility,
          rolls: copy(rolls),
        });
      if (history.length > 40) history.shift();
      draft.log = [
        ...before.log,
        {
          id,
          time: new Date().toISOString(),
          label,
          controller,
          kind: "change",
          visibility,
          rolls,
        },
      ];
      state = draft;
      persist();
    },
    undo(controller = "player") {
      sync();
      const last = history.at(-1);
      if (!last) throw Error("No change to undo");
      if (last.controller !== controller) throw Error("Different controller");
      history.pop();
      const log = copy(state.log);
      const id = recordId();
      const time = new Date().toISOString();
      const reversedInitiative = new Set(
        (last.rolls || [])
          .filter((roll) => roll.source === "initiative")
          .map((roll) => roll.initiativeRollId),
      );
      const initiativeRolls = state.initiativeRolls?.map((entry) =>
        reversedInitiative.has(entry.id) && entry.status !== "reversed"
          ? {
              ...copy(entry),
              status: "reversed",
              reversedAt: time,
              reversedBy: controller,
              reversedByLogId: id,
            }
          : copy(entry),
      );
      const reversedBuild = new Set(
        (last.rolls || [])
          .filter((roll) => roll.source === "character-build")
          .map((roll) => roll.buildRollId),
      );
      const characterBuildRolls = state.characterBuildRolls?.map((entry) =>
        reversedBuild.has(entry.id) && entry.status !== "reversed"
          ? {
              ...copy(entry),
              status: "reversed",
              reversedAt: time,
              reversedBy: controller,
              reversedByLogId: id,
            }
          : copy(entry),
      );
      // Narrative history and access have their own explicit revision commands.
      // A gameplay correction must not roll back later writing or revocations.
      const currentNarrative = state.campaignContent && copy(state.campaignContent);
      const currentRestTime = state.restTime && copy(state.restTime);
      const currentCombatAttempts = state.combatAttempts && copy(state.combatAttempts);
      const campaignFields = ["sessions", "polls", "sessionDrafts", "members"];
      const currentCampaign = Object.fromEntries(
        campaignFields
          .filter((key) => Object.hasOwn(state.campaign, key))
          .map((key) => [key, copy(state.campaign[key])]),
      );
      state = copy(last.before);
      restoreCombatEvidence(currentCombatAttempts, state);
      restoreRestEvidence(currentRestTime, state, {
        reversedAt: time,
        reversedBy: controller,
        reversedByLogId: id,
      });
      if (currentNarrative) state.campaignContent = currentNarrative;
      for (const key of campaignFields) {
        if (Object.hasOwn(currentCampaign, key)) state.campaign[key] = currentCampaign[key];
        else delete state.campaign[key];
      }
      if (initiativeRolls) state.initiativeRolls = initiativeRolls;
      if (characterBuildRolls) {
        state.characterBuildRolls = characterBuildRolls;
        for (const draft of state.characterDrafts || []) {
          draft.rolls = (draft.rolls || []).map((roll) => {
            const record = characterBuildRolls.find((entry) => entry.id === roll.id);
            return record?.status === "reversed" ? copy(record) : roll;
          });
        }
      }
      state.log = [
        ...log,
        {
          id,
          time,
          label: last.label,
          controller,
          kind: "correction",
          revertsId: last.id,
          visibility: last.visibility || (last.shared ? "shared" : "private"),
          rolls: [],
        },
      ];
      persist();
    },
    reset() {
      state = createInitialState();
      history.length = 0;
      storageError = "";
      persist();
    },
    persist,
  };
}
export function previewMovement(state, actorId, point, options = {}) {
  const scene = state.scenes.find((s) => s.id === state.activeSceneId);
  const token = scene?.tokens.find((t) => t.actorId === actorId);
  const actor = state.actors[actorId];
  if (!token || !actor) throw Error("Missing creature");
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw Error("Invalid destination");
  if (scene.gridSnap === true) {
    const snap = (value, offset) =>
      Math.round((value - offset - scene.gridSize / 2) / scene.gridSize) * scene.gridSize +
      offset +
      scene.gridSize / 2;
    point = { x: snap(point.x, scene.gridOffsetX || 0), y: snap(point.y, scene.gridOffsetY || 0) };
  }
  const target = {
    x: Math.max(20, Math.min(scene.width - 20, point.x)),
    y: Math.max(20, Math.min(scene.height - 20, point.y)),
  };
  // A Prone creature that moves crawls: each metre costs one extra metre (SRD EN 179).
  return tracePath(scene, token, [...(options.waypoints ?? []), target], {
    role: options.role,
    budget: state.combat.active ? Math.max(0, actor.movement) : Infinity,
    crawling: hasCondition(actor, "prone"),
  });
}
function ensureMovementTracking(actor, speed) {
  actor.dashCount = Number.isInteger(actor.dashCount) && actor.dashCount >= 0 ? actor.dashCount : 0;
  if (!Number.isFinite(actor.movementSpent))
    actor.movementSpent = Math.max(0, speed * (1 + actor.dashCount) - actor.movement);
}
export function resetTurnMovement(actor, speed = getEffectiveSpeed(actor)) {
  actor.movement = Math.max(0, speed);
  actor.movementSpent = 0;
  actor.dashCount = 0;
}
export function spendMovement(actor, cost, speed = getEffectiveSpeed(actor)) {
  ensureMovementTracking(actor, speed);
  actor.movementSpent = Math.round((actor.movementSpent + cost) * 1e6) / 1e6;
  actor.movement = Math.max(0, Math.round((actor.movement - cost) * 1e6) / 1e6);
}
export function grantDash(actor, speed = getEffectiveSpeed(actor)) {
  ensureMovementTracking(actor, speed);
  actor.dashCount++;
  actor.movement += Math.max(0, speed);
}
export function moveActor(state, actorId, point, role, options = {}) {
  const actor = state.actors[actorId];
  if (!canControlActor(actor, role, state)) throw Error("Cannot control creature");
  if (!isActorAvailable(actor)) throw Error("This creature is not present");
  if (state.combat.active && state.combat.order[state.combat.turn] !== actorId)
    throw Error("Not this creature’s turn");
  const preview = previewMovement(state, actorId, point, { ...options, role: undefined });
  const scene = state.scenes.find((s) => s.id === state.activeSceneId);
  if (options.geometryKey && options.geometryKey !== geometryKey(scene))
    throw Error("Scene geometry changed: preview the movement again");
  if (preview.blocked) throw Error("The path is not available; ask the DM or choose another path");
  const token = scene.tokens.find((t) => t.actorId === actorId);
  Object.assign(token, preview.end);
  if (preview.distance > 0)
    observeRestEvent(state, { eventId: recordId(), actorIds: [actorId], cause: "movement" });
  if (state.combat.active) spendMovement(actor, preview.cost);
  return preview;
}
export function rollDie(sides) {
  const range = 0x100000000;
  const limit = range - (range % sides);
  const values = new Uint32Array(1);
  let value;
  do {
    globalThis.crypto.getRandomValues(values);
    value = values[0];
  } while (value >= limit);
  return (value % sides) + 1;
}

export function startCombat(state) {
  state.combat.active = true;
  state.combat.round = 1;
  state.combat.turn = 0;
  state.combat.encounterId = recordId();
  observeRestEvent(state, {
    eventId: state.combat.encounterId + ":initiative",
    actorIds: state.combat.order,
    cause: "initiative",
  });
  const first = state.actors[state.combat.order[0]];
  if (first) {
    resetTurnMovement(first);
    first.action = true;
    first.bonus = true;
    first.reaction = true;
  }
}

export function reconcileFormsAfterMutation(state, eventId) {
  const hasForms =
    Object.values(state.actors).some((a) => a.activeForm || a.companion) ||
    state.formsCompanions?.castings.some((c) => c.status === "casting");
  if (!hasForms && !state.combat.pendingTurnStart) return;
  observeFormsEvent(state, {
    eventId: eventId + ":status",
    cause: "actor-status",
    actorIds: Object.keys(state.actors),
  });
  const pending = state.combat.pendingTurnStart;
  if (!pending) return;
  delete state.combat.pendingTurnStart;
  const next = state.actors[pending.actorId];
  if (!state.combat.active || state.combat.order[state.combat.turn] !== next?.id) return;
  // The removed creature's turn ends under its own identity (older markers have none).
  expireTurnEffects(state, pending.previousActorId, "end", { turnKey: pending.previousTurnKey });
  if (pending.roundAdvanced)
    advanceRoundTime(state, { eventId: eventId + ":round", round: state.combat.round });
  expireTurnEffects(state, next.id, "start");
  resetTurnMovement(next);
  next.action = true;
  next.bonus = true;
  next.reaction = true;
  next.objectInteractionUsed = false;
}
