// B32 — Complete combat tracker: pure domain (no DOM). Every command mutates the draft
// state given by ctx.commit; nothing here renders or keeps viewer state.
//
// Patterns copied (census IDs in docs/interview/CAPABILITY_CENSUS.md and
// changes/interview-01/market-census/*.md):
// - D&D Beyond Maps combat: hidden combatants never leak (DDB-138), A–Z letters for
//   duplicates at Start Combat and for later additions (DDB-139), the Pending lane with
//   roll, Advantage/Disadvantage and Add (DDB-140), Remove from Combat vs delete (DDB-141),
//   manual tracker entries for lair and environment events (DDB-147);
// - Foundry VTT combatant context menu: hidden, defeated, initiative, remove (FVT-128);
//   animated turn marker under the active token (FVT-129);
// - dnd5e: NPC grouping (FVT-130), legendary actions and resistances (FVT-131), recharge
//   rolled at turn start (FVT-132); Monk's Combat Details turn alerts and "hidden until
//   their first turn" (FVT-133); Mob Attack Tool (FVT-137);
// - Roll20 custom turn items with a per-round formula (R20-141); Fantasy Grounds turn
//   automation: skip dead/hidden, stop at round start, turn sound (R20-165);
// - Owlbear Clash! Reset vs Clear (VTL-117); Shard "Finish encounter" (VTL-155);
//   Improved Initiative turn timer (VTL-128, CMP-161) and group-by-name (CMP-158);
// - BG3 reactions panel with "Ask" (CRP-138); Solasta II Ready (CRP-141).
//
// Rules: D&D 2024, SRD 5.2.1. Initiative: one roll for a group of identical creatures,
// ties decided by the GM (EN 13 / IT 14). Ready (EN 186–187 / IT 211). Legendary Actions
// and Recharge X–Y (EN 257 / IT 293); Legendary Resistance in stat blocks (e.g. EN 258 /
// IT 294). XP is awarded by the GM (EN 182 / IT 212). A shared turn for a group of
// creatures is not 2024 baseline: it is a house rule with its authored source (GAP-07).
import {
  advanceTurn,
  listActions,
  previewAction,
  beginAttempt,
  projectReactions,
  resolveReaction,
  resolveAutomaticRolls,
  isIncapacitated,
  hasBlockingConsequences,
  succeedFailedSave,
  visibleTurnActor,
  expireTurnEffects,
  holdReadiedSpell,
  readiedSpellHeld,
  releaseReadiedSpell,
} from "./combat.mjs";
import { rollDie, resetTurnMovement } from "./state.mjs";
import {
  canViewActor,
  canControlActor,
  isActorAvailable,
  isCampaignActor,
} from "./character-access.mjs";
import { combatTurnKey, applyVitalityEvent } from "./conditions.mjs";
import {
  recordInitiativeResult,
  removeSceneToken,
  startPreparedEncounter,
} from "./preparation.mjs";
import {
  copyKeyOf,
  initiativeKeyOf,
  joinCombat,
  setSharedInitiative,
  sortParticipants,
} from "./encounter-builder-domain.mjs";
import { observeRestEvent } from "./rest-time.mjs";
import { getById } from "./srd-sample.mjs";
import { initiativeProficiency } from "./character-rules.mjs";
// C3 (CA-57, Owlbear GM hand-off): the member the DM handed the role to runs the session.
import { runsSession } from "./session-view.mjs";

export const ID = "combat-tracker";
export const ROLLS = "combat-tracker-rolls";
export const VERSION = 1;

const L = (it, en) => Object.freeze({ it, en });
const copy = (value) => structuredClone(value);
const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36);
const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value : []);

/** A refusal with its message in both languages (shown by the shell, never a warning). */
export function refuse(it, en, code = "refused") {
  throw Object.assign(new Error(en), { it, en, code });
}
// C3: the DM, or the member running the session after a hand-off (runsSession).
const requireDM = (role, state = null) => {
  if (role !== "dm" && !(state && runsSession(state, role)))
    refuse("Solo il DM può farlo dal tracker.", "Only the DM can do this from the tracker.", "dm");
};

// ---------------------------------------------------------------- sources

const srd = (en, it) =>
  Object.freeze({
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    pages: Object.freeze({ en: Object.freeze(en), it: Object.freeze(it) }),
  });
export const SOURCES = Object.freeze({
  initiative: srd([13], [14]),
  ready: srd([186, 187], [211]),
  legendaryActions: srd([257], [293]),
  recharge: srd([257], [293]),
  legendaryResistance: srd([258], [294]),
  xp: srd([182], [212]),
});
export const pagesText = (source, lang = "it") =>
  `SRD 5.2.1 · ${lang === "it" ? "IT" : "EN"} ${(source?.pages?.[lang === "it" ? "it" : "en"] ?? []).join("–")}`;
// The app's own options (turn automation, alerts, timer) cite their market pattern.
export const APP_OPTION = Object.freeze({ kind: "app-option", edition: "2024", revision: "b32-1" });

// ---------------------------------------------------------------- state slices

export const DEFAULT_SETTINGS = Object.freeze({
  skipDefeated: false,
  skipHidden: false,
  revealAtFirstTurn: false,
  stopAtRoundStart: false,
  turnAlerts: true,
  timer: false,
  autoRecharge: true,
  groupTurns: null,
});
export const SETTING_KEYS = Object.freeze([
  "skipDefeated",
  "skipHidden",
  "revealAtFirstTurn",
  "stopAtRoundStart",
  "turnAlerts",
  "timer",
  "autoRecharge",
]);
export const freshCombat = (encounterId = null, round = 1) => ({
  encounterId,
  round,
  letters: {},
  pending: [],
  removed: [],
  defeated: {},
  turnStartedAt: null,
  turnStarts: {},
  lastEnded: null,
  roundHold: null,
  groupTurn: null,
  turned: {},
  legendaryLog: [],
  events: [],
});
export function seedSlice() {
  return {
    settings: { ...DEFAULT_SETTINGS },
    combat: freshCombat(),
    monsters: {},
    entries: [],
    readied: {},
    policies: {},
    history: [],
  };
}
function normalizeEntry(raw) {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  const rounds = Number.isInteger(raw.rounds) ? Math.max(0, Math.min(99, raw.rounds)) : null;
  return {
    id: raw.id,
    name: String(raw.name ?? "").slice(0, 80) || "—",
    init: Number.isInteger(raw.init) ? Math.max(-10, Math.min(40, raw.init)) : 20,
    kind: raw.kind === "reminder" ? "reminder" : "countdown",
    rounds,
    remaining: Number.isInteger(raw.remaining) ? Math.max(0, raw.remaining) : rounds,
    visibility: raw.visibility === "all" ? "all" : "dm",
    firedRound: Number.isInteger(raw.firedRound) ? raw.firedRound : null,
    note: String(raw.note ?? "").slice(0, 200),
  };
}
export function normalizeSlice(value, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error(`Unknown combat-tracker version ${fromVersion}`);
  const source = isObject(value) ? value : {};
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of SETTING_KEYS)
    if (typeof source.settings?.[key] === "boolean") settings[key] = source.settings[key];
  if (isObject(source.settings?.groupTurns)) settings.groupTurns = copy(source.settings.groupTurns);
  const combat = isObject(source.combat)
    ? { ...freshCombat(), ...copy(source.combat) }
    : freshCombat();
  for (const key of ["pending", "removed", "legendaryLog", "events"])
    combat[key] = list(combat[key]);
  for (const key of ["letters", "defeated", "turned", "turnStarts"])
    if (!isObject(combat[key])) combat[key] = {};
  return {
    settings,
    combat,
    monsters: isObject(source.monsters) ? copy(source.monsters) : {},
    entries: list(source.entries).map(normalizeEntry).filter(Boolean),
    readied: isObject(source.readied) ? copy(source.readied) : {},
    policies: isObject(source.policies) ? copy(source.policies) : {},
    history: list(source.history).slice(-20),
  };
}
export const seedRolls = () => ({ rolls: [] });
export function normalizeRolls(value, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error(`Unknown combat-tracker-rolls version ${fromVersion}`);
  return {
    rolls: list(value?.rolls)
      .filter((r) => isObject(r) && typeof r.id === "string")
      .slice(-80),
  };
}
export const sliceOf = (state) => (isObject(state?.ext?.[ID]) ? state.ext[ID] : null);
export const rollsOf = (state) => (isObject(state?.ext?.[ROLLS]) ? state.ext[ROLLS] : null);

// ---------------------------------------------------------------- scene and visibility

export const activeScene = (state) =>
  state.scenes?.find((scene) => scene.id === state.activeSceneId) ?? null;
export const tokenOf = (state, actorId) =>
  activeScene(state)?.tokens?.find((token) => token.actorId === actorId) ?? null;
/** Hidden from players: the actor or its token on the active scene (token menu, B12). */
export const hiddenFromPlayers = (state, actorId) => {
  const token = tokenOf(state, actorId);
  return Boolean(state.actors?.[actorId]?.hidden || token?.hidden || token?.visible === false);
};
/** The Table's own rule (table.mjs canObserve): the viewer sees this creature. */
export function viewerSees(state, actorId, role) {
  const subject = state.actors?.[actorId];
  return Boolean(
    isActorAvailable(subject) &&
    (!subject.companion || canViewActor(subject, role, state)) &&
    (subject.visibility !== "private" || canViewActor(subject, role, state)) &&
    (runsSession(state, role) ||
      canControlActor(subject, role, state) ||
      !hiddenFromPlayers(state, actorId)),
  );
}
export const currentId = (state) =>
  state.combat?.active ? (state.combat.order?.[state.combat.turn] ?? null) : null;
/** DDB-138: the combatant whose turn this viewer sees (the last visible one if hidden). */
export const shownCurrentId = (state, role) =>
  state.combat?.active ? visibleTurnActor(state, (id) => viewerSees(state, id, role)) : null;
/**
 * DDB-138: the turn this viewer sees — its creature, its round and its turn key (the
 * format of combatTurnKey). A hidden creature's turn keeps the previous visible turn,
 * even across a round boundary, so alerts, timer and round counter never move for it.
 */
export function shownTurn(state, role) {
  if (!state.combat?.active) return null;
  const order = list(state.combat.order);
  for (let back = 0; back < order.length; back++) {
    const raw = state.combat.turn - back;
    const id = order[((raw % order.length) + order.length) % order.length];
    if (!viewerSees(state, id, role)) continue;
    const round = state.combat.round - (raw < 0 ? 1 : 0);
    return { id, round, key: [state.combat.encounterId ?? "demo", round, id].join(":") };
  }
  return null;
}
/** When the turn this viewer sees started (turn timer), or null. */
export function turnStartedFor(state, slice, role) {
  const shown = shownTurn(state, role);
  if (!shown) return null;
  // Data saved before turnStarts existed: the current turn's own start still applies.
  const legacy = shown.key === combatTurnKey(state.combat) ? slice?.combat?.turnStartedAt : null;
  return slice?.combat?.turnStarts?.[shown.key] ?? legacy ?? null;
}
const markTurnStart = (slice, key) => {
  const now = new Date().toISOString();
  slice.combat.turnStartedAt = now;
  slice.combat.turnStarts[key] = now;
  const keys = Object.keys(slice.combat.turnStarts);
  for (const old of keys.slice(0, Math.max(0, keys.length - 40)))
    delete slice.combat.turnStarts[old];
};
const ALIAS = /^(?:Creatura sconosciuta|Unknown creature) \d+$/;
const LETTER = / ([A-Z])$/;
export const baseName = (name) =>
  String(name ?? "")
    .replace(LETTER, "")
    .trim();
export const letterOf = (name) => LETTER.exec(String(name ?? ""))?.[1] ?? null;
const NAME_MAX = 100;

/** Initiative total recorded for a combatant (prepared or joined), or null. */
export function initiativeOf(state, actorId) {
  const row = list(state.combat?.initiative).findLast((r) => r.actorId === actorId);
  return row && Number.isInteger(row.natural) && Number.isInteger(row.bonus)
    ? row.natural + row.bonus
    : null;
}
const abilityMod = (score) => (Number.isFinite(score) ? Math.floor((score - 10) / 2) : 0);
/** Initiative bonus: the SRD block's Initiative when linked, else the Dexterity modifier. */
export function initiativeBonus(state, actorId) {
  const actor = state.actors?.[actorId];
  const block = getById(actor?.compendiumRef?.id ?? actor?.encounterBlock?.creatureId ?? "");
  // B37 (sheet-plus, additive): a reasoned Initiative change on the sheet (e.g. the Alert
  // feat) is written to actor.initiativeBonus; without it nothing changes.
  if (Number.isInteger(actor?.initiativeBonus)) return actor.initiativeBonus;
  if (Number.isInteger(block?.initiative?.bonus)) return block.initiative.bonus;
  return abilityMod(actor?.abilities?.dex) + initiativeProficiency(actor);
}
/** Defeated (Foundry FVT-128; Monk's auto-defeat at 0 HP FVT-133): marked, dead or 0 HP NPC. */
export function isDefeated(state, slice, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor) return true;
  if (slice?.combat?.defeated?.[actorId]) return true;
  return Boolean(actor.dead || (actor.kind === "npc" && Number(actor.hp) <= 0));
}

// ---------------------------------------------------------------- letters (DDB-139)

/**
 * Duplicates among NPC combatants get A–Z suffixes on their name (token, order, log).
 * Hidden creatures are ignored until revealed; letters already in use are skipped, so a
 * later addition continues the sequence. Returns the renamed actor ids.
 */
export function assignLetters(state, slice) {
  const groups = new Map();
  const ids = [...list(state.combat?.order), ...list(slice?.combat?.pending).map((p) => p.actorId)];
  for (const id of ids) {
    const actor = state.actors?.[id];
    if (!actor || actor.kind !== "npc" || actor.companion || ALIAS.test(actor.name)) continue;
    const key = baseName(actor.name).toLocaleLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    if (!groups.get(key).includes(id)) groups.get(key).push(id);
  }
  const renamed = [];
  for (const members of groups.values()) {
    const counted = members.filter(
      (id) => !hiddenFromPlayers(state, id) || letterOf(state.actors[id].name),
    );
    if (counted.length < 2) continue;
    const used = new Set(members.map((id) => letterOf(state.actors[id].name)).filter(Boolean));
    for (const id of members) {
      const actor = state.actors[id];
      if (letterOf(actor.name) || hiddenFromPlayers(state, id)) continue;
      let code = 65;
      while (code <= 90 && used.has(String.fromCharCode(code))) code++;
      if (code > 90) break;
      const letter = String.fromCharCode(code);
      used.add(letter);
      const base = baseName(actor.name)
        .slice(0, NAME_MAX - 2)
        .trimEnd();
      actor.name = `${base} ${letter}`;
      if (slice) slice.combat.letters[id] = letter;
      renamed.push(id);
    }
  }
  return renamed;
}

// ---------------------------------------------------------------- group turns (house rule)

/** Members of the NPC group of `actorId` (same name without its letter), in turn order. */
export function groupMembers(state, slice, actorId) {
  if (!slice?.settings?.groupTurns) return [];
  const actor = state.actors?.[actorId];
  if (!actor || actor.kind !== "npc" || actor.companion) return [];
  // A hidden creature never joins a visible group: it keeps its own hidden turn, so the
  // group's turn cannot reveal it (DDB-138). Revealed, it joins the group.
  if (hiddenFromPlayers(state, actorId)) return [];
  const key = baseName(actor.name).toLocaleLowerCase();
  const members = list(state.combat?.order).filter((id) => {
    const other = state.actors?.[id];
    return (
      other?.kind === "npc" &&
      !other.companion &&
      !hiddenFromPlayers(state, id) &&
      baseName(other.name).toLocaleLowerCase() === key
    );
  });
  return members.length >= 2 ? members : [];
}
/** The group's leader: its first member in the order that is not defeated. */
export function groupLeader(state, slice, actorId) {
  const members = groupMembers(state, slice, actorId);
  return members.find((id) => !isDefeated(state, slice, id)) ?? null;
}
/** Groups shown together in the tracker (dnd5e grouping FVT-130), keyed by leader. */
export function groupsInOrder(state, slice) {
  const seen = new Set();
  const groups = [];
  for (const id of list(state.combat?.order)) {
    if (seen.has(id)) continue;
    const members = groupMembers(state, slice, id);
    if (!members.length) continue;
    members.forEach((m) => seen.add(m));
    groups.push({ leaderId: groupLeader(state, slice, id), memberIds: members });
  }
  return groups;
}

/**
 * The group turn in progress (house rule): its members act as on their own turn while the
 * leader holds it (combat.mjs shareCurrentTurn). Defeated members do not act.
 */
export function sharesGroupTurn(state, actorId) {
  const slice = sliceOf(state);
  const group = slice?.combat?.groupTurn;
  return Boolean(
    slice?.settings?.groupTurns &&
    state.combat?.active &&
    group &&
    group.round === state.combat.round &&
    group.leaderId === currentId(state) &&
    group.memberIds.includes(actorId) &&
    !isDefeated(state, slice, actorId),
  );
}

/**
 * A readied move (Ready: "move up to your Speed", SRD 5.2.1 EN 186–187 / IT 211): after
 * the Reaction the creature moves once, now, through the core movement; the window closes
 * with that move or when the turn changes. Actions stay "not your turn".
 */
export function readiedMoveOpen(state, actorId) {
  const readied = sliceOf(state)?.readied?.[actorId];
  if (readied?.status !== "moving" || !state.combat?.active) return false;
  const key = combatTurnKey(state.combat);
  if (readied.moveTurnKey !== key) return false;
  const prior = list(readied.priorMoves);
  return !list(state.movements).some(
    (m) => m.actorId === actorId && m.turnKey === key && !prior.includes(m.id),
  );
}
/** The predicate given to combat.mjs shareCurrentTurn: who acts now besides the current. */
export const sharesTurn = (state, actorId, purpose = "action") =>
  sharesGroupTurn(state, actorId) || (purpose === "movement" && readiedMoveOpen(state, actorId));

// ---------------------------------------------------------------- turn observer

// The leader's group turn: the other members act now, with their turn's resources.
function beginGroupTurn(state, slice, actorId) {
  const memberIds = groupMembers(state, slice, actorId);
  for (const id of memberIds)
    if (id !== actorId && state.actors[id]) refreshResources(state.actors[id]);
  slice.combat.groupTurn = { leaderId: actorId, memberIds, round: state.combat.round };
}
const refreshResources = (actor) => {
  resetTurnMovement(actor);
  Object.assign(actor, { action: true, bonus: true, reaction: true, objectInteractionUsed: false });
};
const pushEvent = (slice, event) => {
  slice.combat.events.push({ id: uid(), at: new Date().toISOString(), ...event });
  if (slice.combat.events.length > 30)
    slice.combat.events.splice(0, slice.combat.events.length - 30);
};
let skipping = 0;
/**
 * Runs inside every turn start/end of the engine (combat.mjs observeTurnPhases), in the
 * same transaction: encounter bookkeeping, letters, Monk's reveal at the first turn,
 * FG skips, the group turn, legendary refill, recharge, Ready expiry, round events and
 * the turn timer. Pure: state in, state out.
 */
export function onTurnPhase(state, { actorId, phase, turnKey, expired = [] }) {
  const slice = sliceOf(state);
  if (!slice || !state.combat?.active) return;
  if (slice.combat.encounterId !== (state.combat.encounterId ?? null)) {
    slice.combat = freshCombat(state.combat.encounterId ?? null, state.combat.round);
    for (const entry of slice.entries) {
      entry.remaining = entry.rounds;
      entry.firedRound = null;
    }
    for (const readied of Object.values(slice.readied))
      if (readied.status === "held") readied.status = "expired";
  }
  // TV-84 (FG duration anchors, Clash! expiry notice): each effect that ends at this turn
  // anchor waits to be announced once, in the log and with a toast.
  for (const effect of list(expired)) {
    slice.combat.expired = [
      ...list(slice.combat.expired),
      {
        id: uid(),
        actorId,
        type: effect.type,
        turnKey,
        hidden: hiddenFromPlayers(state, actorId),
        announced: false,
      },
    ].slice(-20);
  }
  for (const readied of Object.values(slice.readied))
    if (readied.status === "moving") readied.status = "used";
  if (phase === "end") {
    slice.combat.lastEnded = { actorId, turnKey, round: state.combat.round };
    return;
  }
  const actor = state.actors?.[actorId];
  if (!actor) return;
  // A new round: countdowns tick once, reminders fire, the DM's checkpoint opens.
  if (slice.combat.round !== state.combat.round) {
    slice.combat.round = state.combat.round;
    for (const entry of slice.entries) {
      if (entry.kind === "reminder") {
        pushEvent(slice, { kind: "reminder", entryId: entry.id, round: state.combat.round });
        continue;
      }
      if (!Number.isInteger(entry.remaining) || entry.remaining <= 0) continue;
      entry.remaining -= 1;
      if (entry.remaining === 0) {
        entry.firedRound = state.combat.round;
        pushEvent(slice, { kind: "countdown", entryId: entry.id, round: state.combat.round });
      }
    }
    if (slice.settings.stopAtRoundStart && state.combat.round > 1)
      slice.combat.roundHold = state.combat.round;
  }
  // Monk's Combat Details: a hidden enemy is revealed at its first turn (option).
  const token = tokenOf(state, actorId);
  const firstTurn = !slice.combat.turned[actorId];
  slice.combat.turned[actorId] = true;
  if (slice.settings.revealAtFirstTurn && firstTurn && actor.kind === "npc" && token?.hidden) {
    token.hidden = false;
    pushEvent(slice, { kind: "revealed", actorId, round: state.combat.round });
  }
  assignLetters(state, slice);
  const leader = groupLeader(state, slice, actorId);
  const skip =
    (leader && leader !== actorId) ||
    (slice.settings.skipDefeated && isDefeated(state, slice, actorId)) ||
    (slice.settings.skipHidden && hiddenFromPlayers(state, actorId));
  if (skip && skipping < list(state.combat.order).length - 1) {
    skipping++;
    try {
      advanceTurn(state, { eventId: "ct-skip:" + turnKey });
    } finally {
      skipping--;
    }
    return;
  }
  if (leader === actorId) beginGroupTurn(state, slice, actorId);
  else slice.combat.groupTurn = null;
  markTurnStart(slice, turnKey);
  const monster = slice.monsters[actorId];
  if (monster) {
    if (monster.legendary) monster.legendary.used = 0;
    for (const ability of list(monster.recharge)) {
      if (ability.available) continue;
      if (slice.settings.autoRecharge && monster.diceMode !== "physical")
        recordRecharge(state, slice, actorId, ability, {
          mode: "digital",
          turnKey,
          automatic: true,
        });
      else {
        ability.due = turnKey;
        pushEvent(slice, {
          kind: "recharge-due",
          actorId,
          abilityId: ability.id,
          round: state.combat.round,
        });
      }
    }
  }
  const readied = slice.readied[actorId];
  if (readied?.status === "held") {
    readied.status = "expired";
    readied.endedAt = turnKey;
    // TV-82: an unreleased readied spell dissipates with its held Concentration.
    const held = readied.response?.concentrationId;
    if (held && readiedSpellHeld(state, actorId, held)) actor.concentration.active = false;
    pushEvent(slice, { kind: "ready-expired", actorId, round: state.combat.round });
  }
}

// ---------------------------------------------------------------- viewer projection

/** The tracker's rows for one viewer: combatants and custom entries in initiative order. */
export function trackerRows(state, slice, role) {
  if (!state.combat?.active) return [];
  const current = currentId(state);
  const shown = shownCurrentId(state, role);
  const rows = list(state.combat.order)
    .map((id, index) => ({ id, index }))
    .filter(({ id }) => viewerSees(state, id, role))
    .map(({ id, index }) => {
      const actor = state.actors[id];
      return {
        kind: "combatant",
        id,
        index,
        name: actor.name,
        initiative: initiativeOf(state, id),
        current: id === shown,
        realCurrent: id === current,
        hidden: hiddenFromPlayers(state, id),
        defeated: isDefeated(state, slice, id),
        marked: Boolean(slice?.combat?.defeated?.[id]),
        npc: actor.kind === "npc",
      };
    });
  const entries = list(slice?.entries).filter(
    (e) => runsSession(state, role) || e.visibility === "all",
  );
  const out = [];
  const placed = new Set();
  for (const row of rows) {
    for (const entry of entries)
      if (!placed.has(entry.id) && (row.initiative === null || entry.init > row.initiative)) {
        placed.add(entry.id);
        out.push({ kind: "entry", id: entry.id, entry });
      }
    out.push(row);
  }
  for (const entry of entries)
    if (!placed.has(entry.id)) out.push({ kind: "entry", id: entry.id, entry });
  return out;
}
/** Monk's turn alerts: "your turn" for the shown current, "you're next" for the next one. */
export function turnAlertFor(state, slice, role) {
  if (!state.combat?.active || slice?.settings?.turnAlerts === false) return null;
  const order = list(state.combat.order);
  const shown = shownCurrentId(state, role);
  const current = currentId(state);
  const mine = (id) => {
    const actor = state.actors?.[id];
    return Boolean(
      actor &&
      actor.kind === "character" &&
      actor.owner === role &&
      canControlActor(actor, role, state),
    );
  };
  if (role === "dm") return null;
  // DDB-138: keyed on the turn the player sees, so a hidden turn never re-alerts.
  const key = shownTurn(state, role)?.key ?? combatTurnKey(state.combat);
  const hold = slice?.combat?.roundHold === state.combat.round;
  if (shown === current && mine(current))
    return { kind: hold ? "hold" : "turn", actorId: current, key };
  // The next creature this viewer will actually see act (hidden or skipped ones ignored).
  for (let step = 1; step < order.length; step++) {
    const id = order[(state.combat.turn + step) % order.length];
    if (!viewerSees(state, id, role)) continue;
    const leader = groupLeader(state, slice, id);
    if (leader && leader !== id) continue;
    if (slice?.settings?.skipDefeated && isDefeated(state, slice, id)) continue;
    return mine(id) ? { kind: "next", actorId: id, key } : null;
  }
  return null;
}

// ---------------------------------------------------------------- pending lane (DDB-140)

export const onScene = (state, actorId) => Boolean(tokenOf(state, actorId));
/** Tokens on the active scene that can join: not in the order and not already waiting. */
export function joinableActors(state, slice) {
  const scene = activeScene(state);
  const order = new Set(list(state.combat?.order));
  const waiting = new Set(list(slice?.combat?.pending).map((p) => p.actorId));
  return list(scene?.tokens)
    .map((token) => token.actorId)
    .filter(
      (id) =>
        !order.has(id) &&
        !waiting.has(id) &&
        isActorAvailable(state.actors?.[id]) &&
        isCampaignActor(state.actors[id], state.campaign?.id) &&
        state.actors[id].visibility !== "private",
    );
}
export function addPending(state, slice, actorIds, role) {
  requireDM(role, state);
  if (!state.combat?.active)
    refuse("Nessun combattimento in corso.", "No combat in progress.", "no-combat");
  const allowed = new Set(joinableActors(state, slice));
  const ids = [...new Set(actorIds)];
  if (!ids.length) refuse("Scegli almeno una pedina.", "Choose at least one token.", "none");
  for (const id of ids)
    if (!allowed.has(id))
      refuse(
        `${state.actors?.[id]?.name ?? id}: è già nell’ordine, in attesa o non è sulla scena.`,
        `${state.actors?.[id]?.name ?? id}: already in the order, waiting or not on the scene.`,
        "not-joinable",
      );
  for (const id of ids) {
    slice.combat.pending.push({ actorId: id, advantage: "normal", roll: null });
    slice.combat.removed = slice.combat.removed.filter((r) => r.actorId !== id);
  }
  return ids;
}
const pendingOf = (slice, actorId) => {
  const entry = slice.combat.pending.find((p) => p.actorId === actorId);
  if (!entry) refuse("La creatura non è in attesa.", "The creature is not waiting.", "not-pending");
  return entry;
};
// TV-46 (DDB sheet roll, Foundry's d20 on the player's own combatant row): the session
// runner acts on every waiting creature; a player only on a creature they control.
const requireRunnerOrController = (state, actorId, role) => {
  if (runsSession(state, role)) return true;
  if (canControlActor(state.actors?.[actorId], role, state)) return false;
  refuse(
    "Puoi tirare l’iniziativa solo per le creature che controlli.",
    "You can roll initiative only for the creatures you control.",
    "control",
  );
};
export function setPendingAdvantage(state, slice, actorId, advantage, role) {
  requireRunnerOrController(state, actorId, role);
  const entry = pendingOf(slice, actorId);
  if (entry.roll)
    refuse(
      "L’iniziativa è già tirata: correggila con il dado fisico e un motivo.",
      "Initiative is already rolled: correct it with the physical die and a reason.",
      "rolled",
    );
  entry.advantage = ["advantage", "disadvantage"].includes(advantage) ? advantage : "normal";
}
/**
 * Rolls a waiting creature's Initiative in the Preparation ledger (recordInitiativeResult):
 * digital dice rolled here (two with Advantage/Disadvantage, higher/lower kept) or a
 * physical face typed by the DM. A second result is a correction with its reason.
 */
export function rollPending(state, slice, actorId, input, role) {
  const runner = requireRunnerOrController(state, actorId, role);
  const entry = pendingOf(slice, actorId);
  if (entry.roll && !runner)
    refuse(
      "L’iniziativa è già tirata: solo il DM può correggerla.",
      "Initiative is already rolled: only the DM can correct it.",
      "rolled",
    );
  const actor = state.actors[actorId];
  const scene = activeScene(state);
  const mode = input?.mode === "physical" ? "physical" : "digital";
  const bonus =
    runner && Number.isInteger(input?.bonus) ? input.bonus : initiativeBonus(state, actorId);
  if (bonus < -100 || bonus > 100)
    refuse("Bonus d’iniziativa non valido.", "Invalid initiative bonus.", "bonus");
  const reason = String(input?.reason ?? "")
    .trim()
    .slice(0, 200);
  if (entry.roll && (mode !== "physical" || !reason))
    refuse(
      "Per cambiare un’iniziativa già tirata usa il dado fisico e scrivi il motivo.",
      "To change a rolled initiative use the physical die and write the reason.",
      "reason",
    );
  let faces = null;
  let natural;
  if (input?.shareWith && !runner)
    refuse(
      "Solo il DM decide chi condivide l’iniziativa.",
      "Only the DM decides who shares initiative.",
      "share",
    );
  if (input?.shareWith) {
    const other = list(state.combat.initiative).findLast((r) => r.actorId === input.shareWith);
    if (!other || !Number.isInteger(other.natural))
      refuse(
        "Quella creatura non ha un’iniziativa registrata.",
        "That creature has no recorded initiative.",
        "share",
      );
    natural = other.natural;
  } else if (mode === "digital") {
    faces = Array.from({ length: entry.advantage === "normal" ? 1 : 2 }, () => rollDie(20));
    natural = entry.advantage === "disadvantage" ? Math.min(...faces) : Math.max(...faces);
  } else natural = Number(input?.natural);
  if (!Number.isInteger(natural) || natural < 1 || natural > 20)
    refuse("Il d20 fisico va da 1 a 20.", "The physical d20 goes from 1 to 20.", "face");
  const shareRow = input?.shareWith
    ? list(state.combat.initiative).findLast((r) => r.actorId === input.shareWith)
    : null;
  const record = recordInitiativeResult(
    state,
    {
      sceneId: scene.id,
      sceneName: scene.name,
      actorId,
      actorName: actor.name,
      natural,
      bonus: shareRow ? shareRow.bonus : bonus,
      mode: shareRow ? shareRow.mode : mode,
      ...(entry.roll ? { kind: "correction" } : {}),
    },
    role,
  );
  if (reason) record.reason = reason;
  if (entry.advantage !== "normal" && faces) record.rollMode = entry.advantage;
  if (faces?.length > 1) record.faces = [...faces];
  if (shareRow) record.sharedWith = shareRow.rollId ?? input.shareWith;
  entry.roll = {
    natural,
    bonus: record.bonus,
    mode: record.mode,
    rollId: record.id,
    total: natural + record.bonus,
    ...(faces ? { faces } : {}),
  };
  return entry.roll;
}
export function removePending(state, slice, actorId, role) {
  requireDM(role, state);
  pendingOf(slice, actorId);
  slice.combat.pending = slice.combat.pending.filter((p) => p.actorId !== actorId);
}
/** DDB "Add": every rolled waiting creature enters the order by total; the turn is kept. */
export function addPendingToCombat(state, slice, role) {
  requireDM(role, state);
  const ready = slice.combat.pending.filter((p) => p.roll);
  if (!ready.length)
    refuse(
      "Tira l’iniziativa di almeno una creatura in attesa.",
      "Roll initiative for at least one waiting creature.",
      "no-roll",
    );
  return joinRolled(state, slice, ready);
}
// The rolled waiting creatures join the live order and the scene's prepared order, both
// sorted by total, with the current turn kept (joinCombat).
function joinRolled(state, slice, ready) {
  const entries = ready.map((p) => ({
    actorId: p.actorId,
    natural: p.roll.natural,
    bonus: p.roll.bonus,
    mode: p.roll.mode,
    rollId: p.roll.rollId,
  }));
  joinCombat(state, entries);
  const scene = activeScene(state);
  if (scene) {
    scene.encounter ||= { name: scene.name, participants: [] };
    for (const entry of entries)
      if (!scene.encounter.participants.some((p) => p.actorId === entry.actorId))
        scene.encounter.participants.push({ ...entry });
    // PR-32: the prepared order stays sorted by total on join, as the live order.
    sortParticipants(state, scene.encounter.participants);
  }
  observeRestEvent(state, {
    eventId: `${state.combat.encounterId}:ct-join:${entries.map((e) => e.actorId).join(",")}`,
    actorIds: entries.map((e) => e.actorId),
    cause: "initiative",
  });
  const joined = new Set(entries.map((e) => e.actorId));
  slice.combat.pending = slice.combat.pending.filter((p) => !joined.has(p.actorId));
  assignLetters(state, slice);
  return entries.map((e) => e.actorId);
}

// ---------------------------------------------------------------- start at the Table (TV-45)

// Foundry Combat Tracker and D&D Beyond Maps: the DM starts combat without leaving the
// Table. Tokens on the scene are the candidates (the prepared ones, else every visible
// one), «Tira tutti» / «Tira PNG» roll the missing d20s in the one initiative ledger,
// a physical d20 is typed in, and «Inizia» saves the order sorted by total (ties keep
// the DM's order, SRD EN 13 / IT 14) and starts. One bonus source: the sheet's
// Initiative (initiativeBonus); a result already recorded keeps its own bonus.
const sceneById = (state, sceneId) => list(state.scenes).find((s) => s.id === sceneId) ?? null;
export function startCandidates(state, sceneId) {
  const scene = sceneById(state, sceneId);
  if (!scene) return [];
  const prepared = list(scene.encounter?.participants);
  const ids = [...new Set(list(scene.tokens).map((t) => t.actorId))].filter((id) => {
    const actor = state.actors?.[id];
    return (
      isActorAvailable(actor) &&
      isCampaignActor(actor, state.campaign?.id) &&
      actor.visibility !== "private"
    );
  });
  const rows = ids.map((id) => {
    const actor = state.actors[id];
    const token = scene.tokens.find((t) => t.actorId === id);
    const row = prepared.find((p) => p.actorId === id);
    const hidden = Boolean(actor.hidden || token?.hidden || token?.visible === false);
    const rolled = Number.isInteger(row?.natural);
    return {
      actorId: id,
      name: actor.name,
      npc: actor.kind === "npc",
      // TV-52 (Improved Initiative, Foundry group roll; SRD EN 13 / IT 14): identical
      // creatures of one encounter row share one Initiative roll.
      groupKey: initiativeKeyOf(state, id),
      // The key the copies could share: the start dialog's «Un solo tiro» switch.
      shareKey: copyKeyOf(state, id),
      hidden,
      included: prepared.length ? Boolean(row) : !hidden,
      natural: rolled ? row.natural : null,
      bonus: rolled && Number.isInteger(row.bonus) ? row.bonus : initiativeBonus(state, id),
      mode: rolled ? (row.mode === "digital" ? "digital" : "physical") : "physical",
      ...(rolled && row.rollId ? { rollId: row.rollId } : {}),
      // Final review P2: Surprise (SRD 5.2.1 EN 189 / IT 216), saved with the encounter.
      surprised: row?.surprised === true,
    };
  });
  // Prepared participants first, in their order; then the other tokens.
  const rank = (row) => {
    const index = prepared.findIndex((p) => p.actorId === row.actorId);
    return index < 0 ? prepared.length + ids.indexOf(row.actorId) : index;
  };
  return rows.sort((a, b) => rank(a) - rank(b));
}
/**
 * TV-52 (Improved Initiative «group initiative»): the DM chooses one roll for identical
 * creatures (the SRD default, EN 13 / IT 14) or separate rolls; recorded for the scene's
 * copies, so the order, the tracker and the next start agree.
 */
export function setShareInitiative(state, shareKey, shared, role) {
  requireDM(role, state);
  return setSharedInitiative(state, shareKey, shared, role);
}
/**
 * The start dialog's rows after the switch: separate rows keep their d20; joined rows share
 * one roll, so members that rolled different d20s are cleared and roll once for the group.
 */
export function applyShareChoice(rows, shareKey, shared) {
  const members = rows.filter((row) => row.shareKey === shareKey);
  for (const row of members) row.groupKey = shared ? shareKey : `actor:${row.actorId}`;
  if (!shared) return members;
  const naturals = new Set(members.filter((r) => r.included).map((r) => r.natural ?? null));
  if (naturals.size > 1)
    for (const row of members) {
      row.natural = null;
      row.mode = "physical";
      delete row.rollId;
    }
  return members;
}
/** The shared-roll key of a start row, or null for a creature that rolls alone (TV-52). */
export const sharedKey = (row) =>
  typeof row?.groupKey === "string" && !row.groupKey.startsWith("actor:") ? row.groupKey : null;
const startTotal = (row) =>
  Number.isInteger(row?.natural) && Number.isInteger(row?.bonus) ? row.natural + row.bonus : null;
/** The rows the start dialog shows: included first by total (the order combat will use). */
export function sortStartRows(state, rows) {
  const included = rows.filter((r) => r.included);
  sortParticipants(state, included);
  return [...included, ...rows.filter((r) => !r.included)];
}
export const missingStartRolls = (rows) => rows.filter((r) => r.included && startTotal(r) === null);
const participantOf = (row) => ({
  actorId: row.actorId,
  natural: row.natural,
  bonus: row.bonus,
  mode: row.mode === "digital" ? "digital" : "physical",
  ...(row.rollId ? { rollId: row.rollId } : {}),
  ...(row.surprised ? { surprised: true } : {}),
});
/**
 * Final review P2 — Surprise (SRD 5.2.1 «Surprise», EN 189 / IT 216: a combatant surprised
 * when combat starts has Disadvantage on its Initiative roll; the ambushes of BG3 and
 * Solasta). Marks the start rows; a die already rolled digitally is cleared so it rolls
 * again with Disadvantage, a typed physical d20 stays (the DM typed the lower of two).
 */
export function markSurprised(rows, actorIds, surprised) {
  const changed = [];
  for (const row of rows) {
    if (!actorIds.includes(row.actorId) || Boolean(row.surprised) === Boolean(surprised)) continue;
    row.surprised = Boolean(surprised);
    if (row.mode === "digital" && Number.isInteger(row.natural)) {
      row.natural = null;
      row.mode = "physical";
      delete row.rollId;
    }
    changed.push(row.actorId);
  }
  return changed;
}
/**
 * TV-46: a roll recorded on the scene since the dialog read it (a player rolled their own
 * initiative) replaces a row the DM left empty, so a stale dialog never loses it. A value
 * the DM typed stays: it is a correction, recorded at the start. Returns the changed ids.
 */
export function mergeSavedRolls(state, sceneId, rows) {
  const saved = list(sceneById(state, sceneId)?.encounter?.participants);
  // The ledger is append-only: a later entry is a later roll.
  const ledger = list(state.initiativeRolls).map((r) => r.id);
  const changed = [];
  for (const row of rows) {
    const p = saved.find((x) => x.actorId === row.actorId);
    if (!p || !Number.isInteger(p.natural) || !p.rollId || p.rollId === row.rollId) continue;
    if (Number.isInteger(row.natural) && !row.rollId) continue;
    // The row's own roll is the newer one (just rolled or typed in this dialog): it stays.
    if (row.rollId && ledger.indexOf(p.rollId) < ledger.indexOf(row.rollId)) continue;
    Object.assign(row, {
      included: true,
      natural: p.natural,
      bonus: p.bonus,
      mode: p.mode === "digital" ? "digital" : "physical",
      rollId: p.rollId,
    });
    changed.push(row.actorId);
  }
  return changed;
}
/** Saves the included rows as the scene's prepared order, sorted by total. */
export function saveStartRows(state, sceneId, rows, role) {
  requireDM(role, state);
  const scene = sceneById(state, sceneId);
  if (!scene) refuse("Scena non trovata.", "Scene not found.", "scene");
  mergeSavedRolls(state, sceneId, rows);
  scene.encounter ||= { name: scene.name, participants: [] };
  const participants = rows.filter((r) => r.included).map(participantOf);
  sortParticipants(state, participants);
  scene.encounter.participants = participants;
  return participants;
}
/**
 * Foundry «Roll All» / «Roll NPCs»: a digital d20 for each chosen row still without a
 * result, recorded in the initiative ledger; the rows are saved at once (nothing to lose
 * if the dialog closes). `which` is "all", "npc" or an array of actor ids.
 */
export function rollStartRows(state, sceneId, rows, which, role) {
  requireDM(role, state);
  const scene = sceneById(state, sceneId);
  if (!scene) refuse("Scena non trovata.", "Scene not found.", "scene");
  // TV-52: a creature of a shared-roll group brings its group along, and the group rolls
  // one d20 (a member already rolled lends its die), recorded for each member.
  const chosen = new Set(
    rows
      .filter((row) => (Array.isArray(which) ? which.includes(row.actorId) : false))
      .map((row) => sharedKey(row))
      .filter(Boolean),
  );
  const wanted = (row) =>
    Array.isArray(which)
      ? which.includes(row.actorId) ||
        (chosen.has(sharedKey(row)) && row.included && row.natural === null)
      : row.included && row.natural === null && (which !== "npc" || row.npc);
  const groupDie = new Map();
  // A surprised creature (or shared-roll group) rolls two d20s and keeps the lower.
  const facesOf = new Map();
  const surprisedDie = (row) => {
    const key = sharedKey(row);
    const ambushed = key
      ? rows.some((other) => sharedKey(other) === key && other.included && other.surprised)
      : row.surprised === true;
    if (!ambushed) return rollDie(20);
    const faces = [rollDie(20), rollDie(20)];
    const natural = Math.min(...faces);
    facesOf.set(key ?? row.actorId, faces);
    return natural;
  };
  const dieFor = (row) => {
    const key = sharedKey(row);
    if (!key) return surprisedDie(row);
    if (!groupDie.has(key)) {
      const sibling = rows.find(
        (other) =>
          other !== row &&
          sharedKey(other) === key &&
          other.included &&
          Number.isInteger(other.natural) &&
          !(Array.isArray(which) && which.includes(other.actorId)),
      );
      groupDie.set(key, sibling ? sibling.natural : surprisedDie(row));
    }
    return groupDie.get(key);
  };
  const rolled = [];
  for (const row of rows.filter(wanted)) {
    const bonus = Number.isInteger(row.bonus) ? row.bonus : initiativeBonus(state, row.actorId);
    const record = recordInitiativeResult(
      state,
      {
        sceneId: scene.id,
        sceneName: scene.name,
        actorId: row.actorId,
        actorName: state.actors[row.actorId]?.name ?? row.actorId,
        natural: dieFor(row),
        bonus,
        mode: "digital",
      },
      role,
    );
    const faces = facesOf.get(sharedKey(row) ?? row.actorId);
    if (faces) {
      record.rollMode = "disadvantage";
      record.faces = [...faces];
      record.surprised = true;
    }
    Object.assign(row, {
      included: true,
      natural: record.natural,
      bonus,
      mode: "digital",
      rollId: record.id,
    });
    rolled.push(row.actorId);
  }
  if (!rolled.length)
    refuse(
      "Nessun tiro mancante tra i partecipanti scelti.",
      "No missing roll among the chosen participants.",
      "none",
    );
  saveStartRows(state, sceneId, rows, role);
  return rolled;
}
/** «Inizia»: names the missing rolls, records typed physical d20s, sorts and starts. */
export function startFromTable(state, sceneId, rows, role) {
  requireDM(role, state);
  const scene = sceneById(state, sceneId);
  if (!scene) refuse("Scena non trovata.", "Scene not found.", "scene");
  mergeSavedRolls(state, sceneId, rows);
  const included = rows.filter((r) => r.included);
  if (!included.length)
    refuse("Scegli almeno un partecipante.", "Choose at least one participant.", "none");
  const missing = missingStartRolls(rows);
  if (missing.length) {
    const names = missing.map((r) => state.actors[r.actorId]?.name ?? r.actorId).join(", ");
    refuse(
      `Manca il tiro d’iniziativa di: ${names}. Usa «Tira tutti» o scrivi il d20 fisico.`,
      `Initiative is missing for: ${names}. Use “Roll all” or type the physical d20.`,
      "missing",
    );
  }
  for (const row of included) {
    if (!Number.isInteger(row.natural) || row.natural < 1 || row.natural > 20)
      refuse("Il d20 va da 1 a 20.", "The d20 goes from 1 to 20.", "face");
    const recorded = list(state.initiativeRolls).find((r) => r.id === row.rollId);
    if (recorded && recorded.natural === row.natural && recorded.status !== "reversed") continue;
    const record = recordInitiativeResult(
      state,
      {
        sceneId: scene.id,
        sceneName: scene.name,
        actorId: row.actorId,
        actorName: state.actors[row.actorId]?.name ?? row.actorId,
        natural: row.natural,
        bonus: row.bonus,
        mode: "physical",
      },
      role,
    );
    Object.assign(row, { mode: "physical", rollId: record.id });
  }
  // A turn-based exploration (BG3) gives way to the real combat.
  if (state.combat?.active && state.combat.turnMode) endTurnMode(state, role);
  if (state.combat?.active)
    refuse("C’è già un combattimento in corso.", "A combat is already running.", "combat-active");
  saveStartRows(state, sceneId, rows, role);
  if (state.activeSceneId !== sceneId) state.activeSceneId = sceneId;
  startPreparedEncounter(state, sceneId, role);
  expireTurnEffects(state, state.combat.order[0], "start");
  return [...state.combat.order];
}

// ---------------------------------------------------------------- players' own rolls (TV-46, C8)

// D&D Beyond (the sheet's Initiative roll goes to the DM's tracker) and Foundry (each player
// rolls the d20 on their own combatant row, the order re-sorts, the GM can still correct):
// when the DM starts a combat on the active scene, the scene's saved participants are a
// "roll call" (Foundry's encounter created, not begun). A player rolls the initiative of a
// creature they control, digital or physical, into the one ledger; the DM's order re-sorts
// and «Inizia combattimento» uses it. In a running combat the same holds for a creature of
// theirs waiting in the pending lane (DDB-140): it joins the order once rolled.
export const rollCallOf = (state) => activeScene(state)?.encounter?.rollCall ?? null;
const startingCombat = (state) => !state.combat?.active || Boolean(state.combat.turnMode);
/** C8: the creature has an initiative roll to make now, in a starting or running combat. */
export function awaitsInitiative(state, actorId) {
  if (!state?.actors?.[actorId]) return false;
  if (!startingCombat(state))
    return list(sliceOf(state)?.combat?.pending).some((p) => p.actorId === actorId && !p.roll);
  if (!rollCallOf(state)) return false;
  const row = list(activeScene(state).encounter.participants).find((p) => p.actorId === actorId);
  const reversed = list(state.initiativeRolls).some(
    (roll) => roll.id === row?.rollId && roll.status === "reversed",
  );
  return Boolean(row) && (!Number.isInteger(row.natural) || reversed);
}
/** A player's creature (not the DM's own): its player may roll its initiative. */
export const rolledByPlayer = (state, actorId) => {
  const actor = state.actors?.[actorId];
  return Boolean(
    actor &&
    ((actor.owner && actor.owner !== "dm") ||
      list(actor.controllers).some((id) => id && id !== "dm")),
  );
};
/**
 * «Avvia combattimento» on the active scene: the chosen rows become the scene's saved
 * participants and the roll call opens, so the players of the creatures still without a
 * roll see «Tira l’iniziativa». Returns the ids a player can roll.
 */
export function openRollCall(state, sceneId, rows, role) {
  requireDM(role, state);
  if (state.activeSceneId !== sceneId)
    refuse(
      "I giocatori tirano l’iniziativa solo sulla scena attiva.",
      "Players roll initiative only on the active scene.",
      "scene",
    );
  if (!startingCombat(state))
    refuse("C’è già un combattimento in corso.", "A combat is already running.", "combat-active");
  saveStartRows(state, sceneId, rows, role);
  const scene = sceneById(state, sceneId);
  scene.encounter.rollCall = { openedAt: new Date().toISOString(), by: role };
  return scene.encounter.participants
    .filter((p) => !Number.isInteger(p.natural) && rolledByPlayer(state, p.actorId))
    .map((p) => p.actorId);
}
/** «Annulla l’avvio»: the players' prompts go; the saved participants and rolls stay. */
export function closeRollCall(state, sceneId, role) {
  requireDM(role, state);
  const scene = sceneById(state, sceneId);
  if (!scene?.encounter?.rollCall)
    refuse("Nessun avvio in corso.", "No combat start in progress.", "no-call");
  delete scene.encounter.rollCall;
}
/**
 * TV-46: the roll of a creature the roller controls (or any, for the session runner), in
 * the one ledger with the roller as controller; the sheet's Initiative is the bonus.
 * `input`: {mode: "digital"|"physical", natural?, advantage?}. Returns the result.
 */
export function rollOwn(state, slice, actorId, input, role) {
  const actor = state.actors?.[actorId];
  requireRunnerOrController(state, actorId, role);
  if (!awaitsInitiative(state, actorId))
    refuse(
      `${actor?.name ?? actorId}: nessun tiro d’iniziativa in attesa.`,
      `${actor?.name ?? actorId}: no initiative roll is waiting.`,
      "not-awaiting",
    );
  if (!startingCombat(state)) {
    const roll = rollPending(state, slice, actorId, input, role);
    const joined = joinRolled(
      state,
      slice,
      slice.combat.pending.filter((p) => p.actorId === actorId),
    );
    return { ...roll, joined: joined.includes(actorId) };
  }
  const scene = activeScene(state);
  const row = scene.encounter.participants.find((p) => p.actorId === actorId);
  const advantage = ["advantage", "disadvantage"].includes(input?.advantage)
    ? input.advantage
    : "normal";
  const mode = input?.mode === "physical" ? "physical" : "digital";
  let faces = null;
  let natural;
  if (mode === "digital") {
    faces = Array.from({ length: advantage === "normal" ? 1 : 2 }, () => rollDie(20));
    natural = advantage === "disadvantage" ? Math.min(...faces) : Math.max(...faces);
  } else natural = Number(input?.natural);
  if (!Number.isInteger(natural) || natural < 1 || natural > 20)
    refuse("Il d20 va da 1 a 20.", "The d20 goes from 1 to 20.", "face");
  const bonus = initiativeBonus(state, actorId);
  const record = recordInitiativeResult(
    state,
    {
      sceneId: scene.id,
      sceneName: scene.name,
      actorId,
      actorName: actor.name,
      natural,
      bonus,
      mode,
    },
    role,
  );
  if (advantage !== "normal" && faces) record.rollMode = advantage;
  if (faces?.length > 1) record.faces = [...faces];
  Object.assign(row, { natural, bonus, mode, rollId: record.id });
  sortParticipants(state, scene.encounter.participants);
  return {
    natural,
    bonus,
    mode,
    total: natural + bonus,
    rollId: record.id,
    ...(faces ? { faces } : {}),
  };
}

// ---------------------------------------------------------------- turn-based mode (TV-129)

// BG3 turn-based mode (Shift+Space): outside combat the party takes turns in a fixed order,
// without initiative, so a tense moment is played one character at a time. It reuses the
// turn engine (movement budget, Next turn) and ends by itself when a real combat starts.
export function turnModeCandidates(state) {
  const scene = activeScene(state);
  const ids = [...new Set(list(scene?.tokens).map((t) => t.actorId))];
  return ids.filter((id) => {
    const actor = state.actors?.[id];
    return (
      actor?.kind === "character" &&
      !actor.companion &&
      isActorAvailable(actor) &&
      isCampaignActor(actor, state.campaign?.id) &&
      actor.visibility !== "private"
    );
  });
}
export function startTurnMode(state, role, firstId = null) {
  if (state.combat?.active)
    refuse(
      "C’è già un combattimento o una modalità a turni.",
      "A combat or turn-based mode is already running.",
      "active",
    );
  const ids = turnModeCandidates(state);
  if (!ids.length)
    refuse("Nessun personaggio sulla scena attiva.", "No character on the active scene.", "none");
  if (
    !runsSession(state, role) &&
    !ids.some((id) => canControlActor(state.actors[id], role, state))
  )
    refuse(
      "Serve un tuo personaggio sulla scena.",
      "One of your characters must be on the scene.",
      "control",
    );
  const order = ids.includes(firstId) ? [firstId, ...ids.filter((id) => id !== firstId)] : ids;
  state.combat = {
    active: true,
    turnMode: true,
    sceneId: state.activeSceneId,
    encounterId: "turns-" + uid(),
    round: 1,
    turn: 0,
    order,
    initiative: [],
  };
  const first = state.actors[order[0]];
  refreshResources(first);
  expireTurnEffects(state, first.id, "start");
  return order;
}
export function endTurnMode(state, role) {
  if (!state.combat?.active || !state.combat.turnMode)
    refuse("La modalità a turni non è attiva.", "Turn-based mode is not on.", "inactive");
  if (
    !runsSession(state, role) &&
    !list(state.combat.order).some((id) => canControlActor(state.actors[id], role, state))
  )
    refuse(
      "Solo chi gioca a turni può uscirne.",
      "Only a player in the turns can end it.",
      "control",
    );
  const current = currentId(state);
  if (current) expireTurnEffects(state, current, "end");
  state.combat = { active: false, round: 1, turn: 0, order: [...list(state.combat.order)] };
}

// ---------------------------------------------------------------- hidden turns (TV-48)

/** D&D Beyond: the public log never narrates a hidden creature's turn. */
export function turnLogOptions(state) {
  const id = currentId(state);
  return id && hiddenFromPlayers(state, id) ? { visibility: "private" } : {};
}

// ---------------------------------------------------------------- context menu (FVT-128)

const requireCombatant = (state, actorId) => {
  if (!state.combat?.active || !list(state.combat.order).includes(actorId))
    refuse(
      "La creatura non è nell’ordine dei turni.",
      "The creature is not in the turn order.",
      "not-combatant",
    );
};
export function setHidden(state, slice, actorId, hidden, role, tokenMenu = null) {
  requireDM(role, state);
  const token = tokenOf(state, actorId);
  if (!token)
    refuse(
      "La creatura non ha una pedina sulla scena attiva.",
      "The creature has no token on the active scene.",
      "no-token",
    );
  if (tokenMenu?.setVisibility && tokenMenu.slice)
    tokenMenu.setVisibility(state, tokenMenu.slice, [token.id], hidden ? "dm" : "all", [], role);
  else token.hidden = Boolean(hidden);
  if (!hidden) assignLetters(state, slice);
}
export function setDefeated(state, slice, actorId, defeated, role) {
  requireDM(role, state);
  requireCombatant(state, actorId);
  if (defeated) slice.combat.defeated[actorId] = true;
  else delete slice.combat.defeated[actorId];
}
/**
 * DDB "Remove From Combat": the creature leaves the order and keeps its token, with a
 * marker. Removing the creature whose turn it is ends that turn under its own identity
 * and starts the next one (the forms/companions pattern, state.mjs pendingTurnStart).
 */
export function removeFromCombat(state, slice, actorId, role) {
  requireDM(role, state);
  requireCombatant(state, actorId);
  const combat = state.combat;
  const active = combat.order[combat.turn];
  if (active === actorId && hasBlockingConsequences(state, actorId))
    refuse(
      "Ci sono conseguenze ancora in attesa per questa creatura: risolvile prima.",
      "Consequences are still pending for this creature: resolve them first.",
      "blocking",
    );
  const previousTurn = combat.turn;
  const previousTurnKey = combatTurnKey(combat);
  combat.order = combat.order.filter((id) => id !== actorId);
  const index = combat.order.indexOf(active);
  const roundAdvanced = index < 0 && previousTurn >= combat.order.length && combat.order.length > 0;
  combat.turn =
    index >= 0
      ? index
      : roundAdvanced
        ? 0
        : Math.min(previousTurn, Math.max(0, combat.order.length - 1));
  if (!combat.order.length) {
    combat.active = false;
    delete combat.pendingTurnStart;
  } else if (index < 0) {
    if (roundAdvanced) combat.round += 1;
    combat.pendingTurnStart = {
      actorId: combat.order[combat.turn],
      previousActorId: actorId,
      previousTurnKey,
      reason: "combat-tracker-removed",
      roundAdvanced,
    };
  }
  delete slice.combat.defeated[actorId];
  slice.combat.removed = slice.combat.removed.filter((r) => r.actorId !== actorId);
  slice.combat.removed.push({ actorId, round: combat.round, at: new Date().toISOString() });
  if (["held", "moving"].includes(slice.readied[actorId]?.status))
    slice.readied[actorId].status = "expired";
}
/** Deleting the token removes it from map and order; the creature's sheet stays (DDB-141). */
export function deleteToken(state, slice, actorId, role, tokenMenu = null) {
  requireDM(role, state);
  const token = tokenOf(state, actorId);
  if (!token)
    refuse(
      "La creatura non ha una pedina sulla scena attiva.",
      "The creature has no token on the active scene.",
      "no-token",
    );
  if (list(state.combat?.order).includes(actorId) && state.combat.active)
    removeFromCombat(state, slice, actorId, role);
  slice.combat.pending = slice.combat.pending.filter((p) => p.actorId !== actorId);
  slice.combat.removed = slice.combat.removed.filter((r) => r.actorId !== actorId);
  if (tokenMenu?.removeTokens && tokenMenu.slice)
    tokenMenu.removeTokens(state, tokenMenu.slice, [token.id], role);
  else removeSceneToken(state, activeScene(state).id, token.id, role);
}
/** Foundry "update initiative": a reasoned physical correction; the order re-sorts. */
export function correctInitiative(state, slice, actorId, input, role) {
  requireDM(role, state);
  requireCombatant(state, actorId);
  const natural = Number(input?.natural);
  const bonus = Number.isInteger(input?.bonus) ? input.bonus : initiativeBonus(state, actorId);
  const reason = String(input?.reason ?? "")
    .trim()
    .slice(0, 200);
  if (!Number.isInteger(natural) || natural < 1 || natural > 20)
    refuse("Il d20 fisico va da 1 a 20.", "The physical d20 goes from 1 to 20.", "face");
  if (!reason)
    refuse("Scrivi il motivo della correzione.", "Write the reason for the correction.", "reason");
  const scene = activeScene(state);
  const record = recordInitiativeResult(
    state,
    {
      sceneId: scene.id,
      sceneName: scene.name,
      actorId,
      actorName: state.actors[actorId].name,
      natural,
      bonus,
      mode: "physical",
      kind: "correction",
    },
    role,
  );
  record.reason = reason;
  state.combat.initiative ||= [];
  state.combat.initiative.push({ actorId, natural, bonus, mode: "physical", rollId: record.id });
  // PR-32: the scene's saved order follows the correction, sorted like the live order.
  const saved = scene.encounter?.participants?.find((p) => p.actorId === actorId);
  if (saved) {
    Object.assign(saved, { natural, bonus, mode: "physical", rollId: record.id });
    sortParticipants(state, scene.encounter.participants);
  }
  const active = state.combat.order[state.combat.turn];
  const position = new Map(state.combat.order.map((id, i) => [id, i]));
  state.combat.order.sort(
    (a, b) =>
      (initiativeOf(state, b) ?? -Infinity) - (initiativeOf(state, a) ?? -Infinity) ||
      position.get(a) - position.get(b),
  );
  state.combat.turn = state.combat.order.indexOf(active);
  return record;
}

// ---------------------------------------------------------------- settings and house rule

export function setSetting(state, slice, key, value, role) {
  requireDM(role, state);
  if (!SETTING_KEYS.includes(key) || typeof value !== "boolean")
    refuse("Impostazione non valida.", "Invalid setting.", "setting");
  slice.settings[key] = value;
  if (key === "stopAtRoundStart" && !value) slice.combat.roundHold = null;
}
export const GROUP_RULE_TITLE = L(
  "Turno di gruppo per creature uguali",
  "Group turn for identical creatures",
);
export const GROUP_RULE_TEXT = L(
  "Le creature del DM con lo stesso nome (senza la lettera) agiscono insieme nel turno della prima: un solo «Termina turno» passa tutto il gruppo. Base 2024: stesso tiro d’iniziativa ma turni separati (SRD 5.2.1 EN 13 / IT 14).",
  "The DM’s creatures with the same name (without the letter) act together on the first one’s turn: one “End turn” passes the whole group. 2024 baseline: one shared Initiative roll but separate turns (SRD 5.2.1 EN 13 / IT 14).",
);
/**
 * Turns the group-turn house rule on (with its authored record in the campaign settings
 * when that area is present: addHouseRule) or off (retired with a reason).
 */
export function setGroupTurns(state, slice, enabled, input, role, houseRules = null) {
  requireDM(role, state);
  const now = new Date().toISOString();
  if (enabled) {
    if (slice.settings.groupTurns)
      refuse("La regola della casa è già attiva.", "The house rule is already on.", "same");
    const text = String(input?.text ?? "").trim();
    if (!text) refuse("Descrivi la regola della casa.", "Describe the house rule.", "text");
    let houseRuleId = null;
    let source = { kind: "house-rule", edition: "2024", authorId: role, decidedAt: now };
    if (houseRules?.add) {
      houseRuleId = houseRules.add(state, { title: input.title, text });
      source = houseRules.source?.(houseRuleId) ?? source;
    }
    slice.settings.groupTurns = {
      title: String(input?.title ?? "")
        .trim()
        .slice(0, 80),
      text: text.slice(0, 600),
      houseRuleId,
      source,
      at: now,
    };
    // TV-59 (Mob Attack Tool): turned on during a group leader's turn, the group turn
    // starts now, so the other members act in it instead of losing their turn to the
    // group's single «End turn». On any other turn it starts at the leader's next turn.
    const current = currentId(state);
    if (state.combat?.active && current && groupLeader(state, slice, current) === current)
      beginGroupTurn(state, slice, current);
    return slice.settings.groupTurns;
  }
  const rule = slice.settings.groupTurns;
  if (!rule) refuse("La regola della casa non è attiva.", "The house rule is not on.", "same");
  const reason = String(input?.reason ?? "").trim();
  if (!reason) refuse("Indica il motivo.", "Give the reason.", "reason");
  if (rule.houseRuleId && houseRules?.retire) houseRules.retire(state, rule.houseRuleId, reason);
  slice.settings.groupTurns = null;
  slice.combat.groupTurn = null;
  return rule;
}
/** The DM's round-start checkpoint (FG "stop at round start"): lifts the hold. */
export function startHeldRound(state, slice, role) {
  requireDM(role, state);
  if (slice.combat.roundHold !== state.combat?.round)
    refuse("Nessun round in attesa.", "No round is waiting.", "no-hold");
  slice.combat.roundHold = null;
  markTurnStart(slice, combatTurnKey(state.combat));
}

// ---------------------------------------------------------------- custom entries (R20-141)

export function saveEntry(state, slice, input, role) {
  requireDM(role, state);
  const name = String(input?.name ?? "").trim();
  if (!name || name.length > 80)
    refuse("Il nome deve avere da 1 a 80 caratteri.", "The name needs 1 to 80 characters.", "name");
  const init = Number(input?.init);
  if (!Number.isInteger(init) || init < -10 || init > 40)
    refuse(
      "Il conteggio d’iniziativa va da −10 a 40.",
      "The initiative count goes from −10 to 40.",
      "init",
    );
  const kind = input?.kind === "reminder" ? "reminder" : "countdown";
  const rounds = kind === "countdown" ? Number(input?.rounds) : null;
  if (kind === "countdown" && (!Number.isInteger(rounds) || rounds < 1 || rounds > 99))
    refuse("I round vanno da 1 a 99.", "Rounds go from 1 to 99.", "rounds");
  const existing = input?.id ? slice.entries.find((e) => e.id === input.id) : null;
  // Editing the text keeps the rounds already elapsed; a new length or kind restarts it.
  const same = existing && existing.kind === kind && existing.rounds === rounds;
  const entry = normalizeEntry({
    id: existing?.id ?? uid(),
    name,
    init,
    kind,
    rounds,
    remaining: same ? existing.remaining : rounds,
    firedRound: same ? existing.firedRound : null,
    visibility: input?.visibility === "all" ? "all" : "dm",
    note: input?.note,
  });
  if (existing) Object.assign(existing, entry);
  else slice.entries.push(entry);
  return existing ?? entry;
}
export function adjustEntry(state, slice, entryId, delta, role) {
  requireDM(role, state);
  const entry = slice.entries.find((e) => e.id === entryId);
  if (!entry) refuse("Voce non trovata.", "Entry not found.", "missing");
  if (entry.kind !== "countdown")
    refuse("Solo i conti alla rovescia cambiano.", "Only countdowns change.", "kind");
  entry.remaining = Math.max(0, Math.min(99, (entry.remaining ?? 0) + delta));
  entry.firedRound = entry.remaining === 0 ? (state.combat?.round ?? null) : null;
}
export function removeEntry(state, slice, entryId, role) {
  requireDM(role, state);
  if (!slice.entries.some((e) => e.id === entryId))
    refuse("Voce non trovata.", "Entry not found.", "missing");
  slice.entries = slice.entries.filter((e) => e.id !== entryId);
}

// ---------------------------------------------------------------- legendary and recharge

/** Recharge abilities written in the linked SRD block ("Recharge 5–6"). */
export function blockRecharges(state, actorId) {
  const actor = state.actors?.[actorId];
  const block = getById(actor?.compendiumRef?.id ?? actor?.encounterBlock?.creatureId ?? "");
  const sections = ["actions", "bonusActions", "reactions", "traits"];
  return sections
    .flatMap((section) => list(block?.[section]))
    .filter((part) => typeof part?.recharge === "string" && /^\d(-\d)?$/.test(part.recharge))
    .map((part) => {
      const [min, max] = part.recharge.split("-").map(Number);
      return { id: part.id, name: copy(part.name), min, max: max ?? min, fromBlock: true };
    });
}
/**
 * TV-54 (dnd5e prefills legendary uses from the stat block): Legendary Resistance (N/Day)
 * and Legendary Action uses read from the linked block, SRD or custom; null when the block
 * has none. The DM still confirms them in the dialog.
 */
export function blockLegendary(state, actorId) {
  const actor = state.actors?.[actorId];
  const custom = list(state.ext?.["encounter-builder"]?.blocks).find(
    (b) => b.id === actor?.encounterBlock?.blockId,
  );
  const block =
    custom ?? getById(actor?.compendiumRef?.id ?? actor?.encounterBlock?.creatureId ?? "");
  if (!block) return null;
  const words = ["traits", "actions", "bonusActions", "reactions", "legendaryActions"]
    .flatMap((section) => list(block[section]))
    .flatMap((part) => [part?.name, part?.summary, part?.text])
    .flatMap((value) => (isObject(value) ? Object.values(value) : [value]))
    .filter((value) => typeof value === "string");
  const first = (pattern) =>
    words.map((text) => pattern.exec(text)?.[1]).find((value) => value !== undefined);
  const resistance = first(/(?:legendary resistance|resistenza leggendaria)\s*\((\d)\s*\//i);
  const uses =
    first(/(?:legendary action uses|usi (?:delle )?azioni leggendarie)\s*:?\s*(\d)/i) ??
    (list(block.legendaryActions).length ? "3" : undefined);
  if (!resistance && !uses) return null;
  return { legendary: Number(uses ?? 0), resistance: Number(resistance ?? 0) };
}
/** TV-84: effects that ended and still wait for their log line and toast. */
export const pendingExpiries = (slice) =>
  list(slice?.combat?.expired).filter((entry) => !entry.announced);
export function markExpiriesAnnounced(slice, ids) {
  for (const entry of list(slice?.combat?.expired))
    if (ids.includes(entry.id)) entry.announced = true;
}
export function configureMonster(state, slice, actorId, input, role) {
  requireDM(role, state);
  const actor = state.actors?.[actorId];
  if (!actor || actor.kind !== "npc")
    refuse(
      "Solo le creature del DM hanno azioni leggendarie e ricariche.",
      "Only DM creatures have legendary actions and recharges.",
      "npc",
    );
  const count = (value, max) => {
    const n = Number(value ?? 0);
    if (!Number.isInteger(n) || n < 0 || n > max)
      refuse(`Un valore va da 0 a ${max}.`, `A value goes from 0 to ${max}.`, "count");
    return n;
  };
  const legendary = count(input?.legendary, 5);
  const resistance = count(input?.resistance, 5);
  const previous = slice.monsters[actorId];
  const recharge = list(input?.recharge).map((raw, index) => {
    const name = String(raw?.name ?? "").trim();
    const min = Number(raw?.min);
    if (!name || name.length > 60)
      refuse(
        "Dai un nome all’abilità con ricarica.",
        "Name the recharge ability.",
        "recharge-name",
      );
    if (!Number.isInteger(min) || min < 2 || min > 6)
      refuse("La ricarica va da 2–6 a 6.", "Recharge goes from 2–6 to 6.", "recharge-min");
    const id = raw.id || `recharge-${index + 1}`;
    const old = list(previous?.recharge).find((r) => r.id === id);
    return {
      id,
      name: L(name, raw?.nameEn ? String(raw.nameEn).trim().slice(0, 60) : name),
      min,
      max: 6,
      available: old ? old.available : true,
      fromBlock: raw.fromBlock === true,
    };
  });
  if (!legendary && !resistance && !recharge.length) {
    delete slice.monsters[actorId];
    return null;
  }
  const fromBlock = recharge.some((r) => r.fromBlock);
  slice.monsters[actorId] = {
    legendary: legendary
      ? { max: legendary, used: Math.min(previous?.legendary?.used ?? 0, legendary) }
      : null,
    resistance: resistance
      ? { max: resistance, used: Math.min(previous?.resistance?.used ?? 0, resistance) }
      : null,
    recharge,
    diceMode: input?.diceMode === "physical" ? "physical" : "digital",
    source:
      fromBlock && !legendary && !resistance
        ? { kind: "srd", entryId: state.actors[actorId].compendiumRef?.id ?? null }
        : { kind: "authored", by: role, at: new Date().toISOString() },
  };
  return slice.monsters[actorId];
}
/** Whether a Legendary Action can be spent now, with the reason when it cannot. */
export function legendaryState(state, slice, actorId) {
  const monster = slice?.monsters?.[actorId];
  const actor = state.actors?.[actorId];
  if (!monster?.legendary) return { can: false, reason: null };
  const left = monster.legendary.max - monster.legendary.used;
  const why = (it, en) => ({ can: false, left, reason: L(it, en) });
  if (!state.combat?.active || !list(state.combat.order).includes(actorId))
    return why("Solo in combattimento.", "Only in combat.");
  if (left <= 0)
    return why("Usi esauriti fino al suo prossimo turno.", "No uses left until its next turn.");
  if (currentId(state) === actorId)
    return why(
      "Si usa subito dopo il turno di un’altra creatura.",
      "It is used right after another creature’s turn.",
    );
  if (!slice.combat.lastEnded)
    return why(
      "Nessun turno di un’altra creatura è ancora finito.",
      "No other creature’s turn has ended yet.",
    );
  if (slice.combat.lastEnded.actorId === actorId)
    return why(
      "Si usa dopo il turno di un’altra creatura, non subito dopo il proprio.",
      "It is used after another creature’s turn, not right after its own turn.",
    );
  if (actor?.dead || Number(actor?.hp) <= 0 || isIncapacitated(actor))
    return why(
      "Non può agire (Incapacitato o a 0 PF).",
      "It cannot act (Incapacitated or at 0 HP).",
    );
  return { can: true, left, reason: null };
}
export function useLegendaryAction(state, slice, actorId, note, role) {
  requireDM(role, state);
  const check = legendaryState(state, slice, actorId);
  if (!check.can)
    refuse(check.reason?.it ?? "Non disponibile.", check.reason?.en ?? "Unavailable.", "legendary");
  slice.monsters[actorId].legendary.used += 1;
  slice.combat.legendaryLog.push({
    actorId,
    afterActorId: slice.combat.lastEnded.actorId,
    turnKey: slice.combat.lastEnded.turnKey,
    note: String(note ?? "")
      .trim()
      .slice(0, 120),
    at: new Date().toISOString(),
  });
  return slice.monsters[actorId].legendary;
}
/** Failed saves of this creature whose damage still waits for Apply (the dnd5e button). */
export function failedSaves(state, actorId) {
  return list(state.combatAttempts)
    .flatMap((attempt) =>
      list(attempt.outcomes)
        .filter((o) => o.actorId === actorId && o.saveSuccess === false && !o.legendaryResistance)
        .map((o) => ({
          attemptId: attempt.id,
          actionName: copy(attempt.actionName),
          sourceName: attempt.actorName,
          saveTotal: o.saveTotal ?? null,
          ready: o.status === "ready",
        })),
    )
    .slice(-3);
}
export function useLegendaryResistance(state, slice, actorId, attemptId, role) {
  requireDM(role, state);
  const monster = slice.monsters[actorId];
  if (!monster?.resistance || monster.resistance.used >= monster.resistance.max)
    refuse(
      "Nessuna resistenza leggendaria rimasta.",
      "No Legendary Resistance left.",
      "resistance",
    );
  const outcome = succeedFailedSave(state, attemptId, actorId, role);
  monster.resistance.used += 1;
  return outcome;
}
export function markRechargeUsed(state, slice, actorId, abilityId, role) {
  requireDM(role, state);
  const ability = list(slice.monsters[actorId]?.recharge).find((r) => r.id === abilityId);
  if (!ability) refuse("Abilità non trovata.", "Ability not found.", "missing");
  if (!ability.available) refuse("È già in ricarica.", "It is already recharging.", "spent");
  ability.available = false;
  delete ability.due;
}
// Undo never grants a free reroll (I-229): a digital recharge retried for the same turn
// reuses the withdrawn face once.
const retryKey = (actorId, abilityId, turnKey) => JSON.stringify([actorId, abilityId, turnKey]);
function recordRecharge(
  state,
  slice,
  actorId,
  ability,
  { mode, face, turnKey, automatic = false },
) {
  const rolls = rollsOf(state);
  const key = retryKey(actorId, ability.id, turnKey);
  const referenced = (roll) =>
    list(slice.monsters[roll.actorId]?.recharge).some((r) => r.lastRollId === roll.id);
  const withdrawn =
    mode === "digital"
      ? list(rolls?.rolls).find(
          (r) => r.retryKey === key && r.mode === "digital" && !r.reusedBy && !referenced(r),
        )
      : null;
  const value = mode === "digital" ? (withdrawn?.face ?? rollDie(6)) : Number(face);
  if (!Number.isInteger(value) || value < 1 || value > 6)
    refuse("Il d6 fisico va da 1 a 6.", "The physical d6 goes from 1 to 6.", "face");
  const success = value >= ability.min && value <= ability.max;
  const roll = {
    id: uid(),
    at: new Date().toISOString(),
    kind: "recharge",
    actorId,
    actorName: state.actors[actorId]?.name ?? actorId,
    abilityId: ability.id,
    name: copy(ability.name),
    range: `${ability.min}–${ability.max}`,
    sides: 6,
    face: value,
    mode,
    success,
    automatic,
    retryKey: key,
    encounterId: state.combat?.encounterId ?? null,
    ...(withdrawn ? { reusedFrom: withdrawn.id } : {}),
  };
  if (withdrawn) withdrawn.reusedBy = roll.id;
  if (rolls) {
    rolls.rolls.push(roll);
    if (rolls.rolls.length > 80) rolls.rolls.splice(0, rolls.rolls.length - 80);
  }
  ability.lastRollId = roll.id;
  ability.available = success;
  delete ability.due;
  pushEvent(slice, {
    kind: "recharge-rolled",
    actorId,
    abilityId: ability.id,
    rollId: roll.id,
    round: state.combat?.round ?? null,
  });
  return roll;
}
export function rollRecharge(state, slice, actorId, abilityId, input, role) {
  requireDM(role, state);
  const ability = list(slice.monsters[actorId]?.recharge).find((r) => r.id === abilityId);
  if (!ability) refuse("Abilità non trovata.", "Ability not found.", "missing");
  if (ability.available || !ability.due)
    refuse("Questa ricarica non è da tirare ora.", "This recharge is not due now.", "not-due");
  return recordRecharge(state, slice, actorId, ability, {
    mode: input?.mode === "physical" ? "physical" : "digital",
    face: input?.face,
    turnKey: ability.due,
  });
}
/** Roll history of the tracker; a roll whose effect was undone stays, marked reversed. */
export function rechargeHistory(state, slice) {
  return list(rollsOf(state)?.rolls)
    .filter((roll) => roll.kind === "recharge")
    .map((roll) => ({
      ...roll,
      status: list(slice?.monsters?.[roll.actorId]?.recharge).some((r) => r.lastRollId === roll.id)
        ? "applied"
        : "reversed",
    }));
}

// ---------------------------------------------------------------- Ready (Solasta II)

// TV-82: Solasta II suggests the usual triggers; «Altro» stays free text.
export const READY_TRIGGERS = Object.freeze([
  ["enters-reach", L("Una creatura entra nella mia portata", "A creature enters my reach")],
  ["enters-range", L("Un nemico entra nella gittata", "An enemy comes within range")],
  ["attacks-ally", L("Un nemico attacca un alleato", "An enemy attacks an ally")],
  ["casts", L("Un nemico lancia un incantesimo", "An enemy casts a spell")],
  ["opens-door", L("Qualcuno apre la porta", "Someone opens the door")],
  ["leaves-cover", L("Un nemico esce dal riparo", "An enemy leaves cover")],
  ["custom", L("Altro (scrivo l’innesco)", "Other (I write the trigger)")],
]);
/**
 * Actions a creature can ready: attacks and cantrips, spells with a slot aimed at one
 * target (TV-82: the slot is spent now and the spell held with Concentration), or moving.
 * An area spell stays out: its area would be aimed when the trigger happens.
 */
export function readyOptions(state, actorId) {
  const all = listActions(state, actorId);
  const actions = all
    .filter(
      (a) =>
        (a.kind === "attack" && a.targetMode === "single") ||
        (a.cost?.slotLevel && a.targetMode === "multiple"),
    )
    .map((a) => ({
      id: a.id,
      name: copy(a.name),
      spell: Boolean(a.spell),
      ...(a.cost?.slotLevel
        ? { slotLevels: copy(a.slotLevels ?? []).filter((s) => s.remaining !== 0) }
        : {}),
    }));
  const blocked = all
    .filter((a) => a.cost?.slotLevel && !actions.some((option) => option.id === a.id))
    .map((a) => ({ id: a.id, name: copy(a.name) }));
  return { actions, blocked };
}
export function readyAction(state, slice, actorId, input, role) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    refuse("Non controlli questa creatura.", "You do not control this creature.", "control");
  if (currentId(state) !== actorId)
    refuse(
      "Si prepara un’azione nel proprio turno.",
      "You ready an action on your own turn.",
      "turn",
    );
  if (!actor.action) refuse("Azione già spesa.", "Action already spent.", "action");
  const preset = READY_TRIGGERS.find(([id]) => id === input?.trigger)?.[0];
  if (!preset) refuse("Scegli l’innesco.", "Choose the trigger.", "trigger");
  const text = String(input?.text ?? "")
    .trim()
    .slice(0, 160);
  if (preset === "custom" && !text)
    refuse(
      "Scrivi la circostanza percepibile che fa scattare la reazione.",
      "Write the perceivable circumstance that triggers the reaction.",
      "trigger-text",
    );
  let response;
  const id = uid();
  if (input?.response === "move") response = { kind: "move" };
  else {
    const option = readyOptions(state, actorId).actions.find((a) => a.id === input?.response);
    if (!option) refuse("Scegli l’azione da preparare.", "Choose the action to ready.", "response");
    response = { kind: "action", actionId: option.id, name: option.name };
    if (option.slotLevels) {
      const level = Number(input?.slotLevel ?? option.slotLevels[0]?.level);
      if (!option.slotLevels.some((s) => s.level === level))
        refuse("Nessuno slot disponibile di quel livello.", "No slot left at that level.", "slot");
      response.slotLevel = level;
      response.concentrationId = holdReadiedSpell(state, actorId, {
        slotLevel: level,
        name: option.name,
        readyId: id,
      });
    }
  }
  actor.action = false;
  slice.readied[actorId] = {
    id,
    status: "held",
    trigger: preset,
    text,
    response,
    round: state.combat.round,
    turnKey: combatTurnKey(state.combat),
    by: role,
    at: new Date().toISOString(),
  };
  return slice.readied[actorId];
}
/**
 * The trigger happened: the controller takes the Reaction right after it (the readied
 * attack goes through the combat engine, dice digital or physical) or ignores it.
 */
export function resolveReady(state, slice, actorId, input, role) {
  const actor = state.actors?.[actorId];
  const readied = slice.readied[actorId];
  if (!actor || !canControlActor(actor, role, state))
    refuse("Non controlli questa creatura.", "You do not control this creature.", "control");
  if (readied?.status !== "held")
    refuse("Nessuna azione preparata in attesa.", "No readied action is waiting.", "none");
  const held = readied.response.concentrationId;
  if (input?.decision === "ignore") {
    readied.status = "ignored";
    readied.endedAt = combatTurnKey(state.combat);
    // The held magic dissipates; the slot stays spent (SRD Ready).
    if (held && readiedSpellHeld(state, actorId, held))
      state.actors[actorId].concentration.active = false;
    return { readied };
  }
  if (!actor.reaction) refuse("Reazione già spesa.", "Reaction already spent.", "reaction");
  if (held && !readiedSpellHeld(state, actorId, held)) {
    readied.status = "expired";
    readied.endedAt = combatTurnKey(state.combat);
    refuse(
      "La Concentrazione si è interrotta: l’incantesimo preparato è perso.",
      "Concentration was broken: the readied spell is lost.",
      "lost",
    );
  }
  let attemptId = null;
  if (readied.response.kind === "action") {
    const targetId = input?.targetId;
    if (!state.actors?.[targetId]) refuse("Scegli il bersaglio.", "Choose the target.", "target");
    attemptId = uid();
    const level = readied.response.slotLevel;
    const multi =
      listActions(state, actorId).find((a) => a.id === readied.response.actionId)?.targetMode ===
      "multiple";
    const selection = multi
      ? { allocations: [{ actorId: targetId, count: 2 + level }], slotLevel: level }
      : { targetIds: [targetId], allowApproach: false, ...(level ? { slotLevel: level } : {}) };
    withTurnOf(state, actorId, () => {
      actor.action = true;
      // The slot spent when readying is given back for this one cast (spent once).
      if (held) releaseReadiedSpell(state, actorId, held, level);
      try {
        beginAttempt(
          state,
          {
            id: attemptId,
            actorId,
            actionId: readied.response.actionId,
            selection,
            mode: input?.mode === "physical" ? "physical" : "digital",
            applyMode: input?.applyMode,
          },
          role,
        );
      } finally {
        actor.action = false;
      }
    });
  } else resetTurnMovement(actor);
  actor.reaction = false;
  readied.status = readied.response.kind === "move" ? "moving" : "used";
  readied.endedAt = combatTurnKey(state.combat);
  readied.attemptId = attemptId;
  if (readied.status === "moving") {
    readied.moveTurnKey = readied.endedAt;
    readied.priorMoves = list(state.movements)
      .filter((m) => m.actorId === actorId && m.turnKey === readied.endedAt)
      .map((m) => m.id);
  }
  return { readied, attemptId };
}
// Runs `fn` as if it were `actorId`'s turn (a readied reaction, a group turn): the engine
// validates the action as on that creature's own turn; the real turn is restored.
function withTurnOf(state, actorId, fn) {
  const saved = state.combat.turn;
  const index = state.combat.order.indexOf(actorId);
  if (index < 0)
    refuse(
      "La creatura non è nell’ordine dei turni.",
      "The creature is not in the turn order.",
      "not-combatant",
    );
  state.combat.turn = index;
  try {
    return fn();
  } finally {
    state.combat.turn = saved;
  }
}

// ---------------------------------------------------------------- mob attack (FVT-137)

/** Attackers the DM can command now: the current creature, or its whole group turn. */
export function mobCandidates(state, slice, role) {
  if (!runsSession(state, role) || !state.combat?.active) return { attackers: [], targets: [] };
  const current = currentId(state);
  const group =
    slice?.combat?.groupTurn?.leaderId === current ? slice.combat.groupTurn.memberIds : [current];
  const attackers = group
    .filter((id) => state.actors[id] && !isDefeated(state, slice, id))
    .map((id) => {
      const action = listActions(state, id).find(
        (a) => a.kind === "attack" && a.targetMode === "single",
      );
      const actor = state.actors[id];
      const reason = !action
        ? L("Nessun attacco in mischia registrato.", "No recorded melee attack.")
        : !actor.action
          ? L("Azione già spesa.", "Action already spent.")
          : null;
      return {
        actorId: id,
        name: actor.name,
        actionId: action?.id ?? null,
        actionName: action ? copy(action.name) : null,
        reason,
      };
    });
  const targets = list(state.combat.order).filter((id) => {
    const actor = state.actors[id];
    return actor && !group.includes(id) && !isDefeated(state, slice, id);
  });
  return { attackers, targets };
}
/** One command, one attack attempt per creature through the engine, distinct results. */
export function beginMobAttack(state, slice, input, role) {
  requireDM(role, state);
  const { attackers } = mobCandidates(state, slice, role);
  const chosen = [...new Set(list(input?.attackerIds))];
  if (!chosen.length)
    refuse("Scegli almeno un attaccante.", "Choose at least one attacker.", "attackers");
  const targetId = input?.targetId;
  if (!state.actors?.[targetId]) refuse("Scegli il bersaglio.", "Choose the target.", "target");
  const mode = input?.mode === "physical" ? "physical" : "digital";
  const results = [];
  for (const id of chosen) {
    const attacker = attackers.find((a) => a.actorId === id);
    if (!attacker)
      refuse(
        `${state.actors[id]?.name ?? id}: non agisce in questo turno.`,
        `${state.actors[id]?.name ?? id}: does not act on this turn.`,
        "not-acting",
      );
    if (attacker.reason)
      refuse(
        `${attacker.name}: ${attacker.reason.it}`,
        `${attacker.name}: ${attacker.reason.en}`,
        "attacker",
      );
    const attemptId = uid();
    // Members of the group turn act now (combat.mjs shareCurrentTurn): no swap needed.
    const attack = () => {
      const preview = previewAction(
        state,
        id,
        attacker.actionId,
        { targetIds: [targetId], allowApproach: false },
        role,
      );
      if (preview.approach?.required)
        refuse(
          `${attacker.name}: il bersaglio non è a portata.`,
          `${attacker.name}: the target is out of reach.`,
          "reach",
        );
      beginAttempt(
        state,
        {
          id: attemptId,
          actorId: id,
          actionId: attacker.actionId,
          selection: { targetIds: [targetId], allowApproach: false },
          mode,
          applyMode: input?.applyMode,
        },
        role,
      );
    };
    attack();
    results.push({ actorId: id, attemptId });
  }
  return results;
}

// ---------------------------------------------------------------- reaction policy (BG3)

export const REACTIONS = Object.freeze([
  ["shield", L("Scudo", "Shield")],
  ["opportunity", L("Attacco di opportunità", "Opportunity Attack")],
]);
export const POLICIES = Object.freeze(["ask", "auto", "off"]);
/** Reactions the engine manages for this creature (Shield spell, a melee weapon). */
export function reactionsOf(state, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor) return [];
  const actions = listActions(state, actorId);
  return REACTIONS.filter(([id]) =>
    id === "shield"
      ? (actor.combatProfile?.spells ?? []).includes("shield")
      : actions.some(
          (a) => a.attackType === "melee" || a.id === "quarterstaff" || a.id === "melee-attack",
        ),
  ).map(([id, name]) => ({ id, name, policy: policyOf(state, actorId, id) }));
}
export const policyOf = (state, actorId, reactionId) =>
  POLICIES.includes(sliceOf(state)?.policies?.[actorId]?.[reactionId])
    ? sliceOf(state).policies[actorId][reactionId]
    : "ask";
export function setPolicy(state, slice, actorId, reactionId, policy, role) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    refuse(
      "Solo chi controlla il personaggio sceglie le sue reazioni.",
      "Only whoever controls the character chooses its reactions.",
      "control",
    );
  if (!REACTIONS.some(([id]) => id === reactionId) || !POLICIES.includes(policy))
    refuse("Scelta non valida.", "Invalid choice.", "policy");
  slice.policies[actorId] ||= {};
  if (policy === "ask") delete slice.policies[actorId][reactionId];
  else slice.policies[actorId][reactionId] = policy;
  if (!Object.keys(slice.policies[actorId]).length) delete slice.policies[actorId];
}
/** Pending offers that a standing policy answers (auto: use; off: decline). */
export function policyDecisions(state) {
  const slice = sliceOf(state);
  if (!slice) return [];
  const out = [];
  for (const role of ["player", "dm"])
    for (const offer of projectReactions(state, role)) {
      if (offer.status !== "pending" || !offer.canRespond) continue;
      const actor = state.actors[offer.actorId];
      if (!actor || actor.owner !== role) continue;
      const policy = policyOf(state, offer.actorId, offer.type);
      if (policy === "ask") continue;
      if (policy === "auto" && !offer.canUse) continue;
      if (out.some((o) => o.id === offer.id)) continue;
      out.push({
        id: offer.id,
        actorId: offer.actorId,
        type: offer.type,
        policy,
        role,
        slotLevels: offer.slotLevels,
      });
    }
  return out;
}
/** Answers the offers of `policyDecisions` in one transaction; automatic dice are digital. */
export function applyPolicies(state) {
  const applied = [];
  for (let guard = 0; guard < 8; guard++) {
    const [decision] = policyDecisions(state);
    if (!decision) break;
    const slotLevel =
      decision.type === "shield"
        ? ((decision.slotLevels ?? []).find((pool) => pool.remaining > 0)?.level ?? 1)
        : undefined;
    resolveReaction(
      state,
      decision.id,
      decision.policy === "auto"
        ? { use: true, mode: "digital", ...(slotLevel ? { slotLevel } : {}) }
        : { use: false },
      decision.role,
    );
    applied.push(decision);
  }
  if (applied.some((d) => d.policy === "auto")) resolveAutomaticRolls(state, rollDie);
  return applied;
}

// ---------------------------------------------------------------- end, reset, clear

export function xpOfActor(state, actorId) {
  const actor = state.actors?.[actorId];
  const block = getById(actor?.compendiumRef?.id ?? actor?.encounterBlock?.creatureId ?? "");
  if (Number.isFinite(block?.xp)) return { xp: block.xp, cr: block.cr ?? null };
  const custom = list(state.ext?.["encounter-builder"]?.blocks).find(
    (b) => b.id === actor?.encounterBlock?.blockId,
  );
  if (Number.isFinite(custom?.xp)) return { xp: custom.xp, cr: custom.cr ?? null };
  return { xp: null, cr: null };
}
/** Shard "Finish encounter": defeated creatures, their XP, treasure parcels, the party. */
export function encounterSummary(state, slice, { lootSlice = null, party = [] } = {}) {
  const ids = new Set([
    ...list(state.combat?.order),
    ...list(slice?.combat?.removed).map((r) => r.actorId),
  ]);
  const defeated = [...ids]
    .filter((id) => state.actors?.[id]?.kind === "npc" && isDefeated(state, slice, id))
    .map((id) => ({ actorId: id, name: state.actors[id].name, ...xpOfActor(state, id) }));
  const xpTotal = defeated.reduce((sum, d) => sum + (d.xp ?? 0), 0);
  const scene = activeScene(state);
  const parcels = list(lootSlice?.parcels).filter(
    (p) =>
      defeated.some((d) => d.actorId === p.sourceActorId) && (!scene || p.sceneId === scene.id),
  );
  return {
    rounds: state.combat?.round ?? 0,
    defeated,
    unknownXp: defeated.filter((d) => d.xp === null),
    xpTotal,
    party: party.map((a) => a.id).filter((id) => ids.has(id)),
    parcels,
  };
}
export function finishEncounter(state, slice, input, role, services = {}) {
  requireDM(role, state);
  if (!state.combat?.active)
    refuse("Nessun combattimento in corso.", "No combat in progress.", "no-combat");
  if (Object.keys(state.actors).some((id) => hasBlockingConsequences(state, id)))
    refuse(
      "Risolvi i tiri ancora pendenti prima di concludere.",
      "Resolve pending rolls before ending the encounter.",
      "blocking",
    );
  const summary = encounterSummary(state, slice, services);
  const recipients = list(input?.recipients).filter((id) => state.actors?.[id]);
  let award = null;
  if (input?.awardXp && summary.xpTotal > 0) {
    if (!services.award)
      refuse(
        "I PE si assegnano con l’area Bottino, che ora non è disponibile.",
        "XP is awarded through the Loot area, unavailable now.",
        "loot",
      );
    if (!recipients.length)
      refuse("Scegli chi riceve i PE.", "Choose who receives the XP.", "recipients");
    award = services.award(state, { xp: summary.xpTotal, recipients, reason: input.reason });
  }
  const parcels = [];
  if (input?.prepareLoot && services.loot)
    for (const d of summary.defeated) {
      const parcel = services.loot(state, d.actorId);
      if (parcel) parcels.push(parcel.id ?? parcel);
    }
  const removedTokens = [];
  if (input?.removeDefeated)
    for (const d of summary.defeated) {
      const token = tokenOf(state, d.actorId);
      if (!token) continue;
      removeSceneToken(state, activeScene(state).id, token.id, role);
      removedTokens.push(d.actorId);
    }
  state.combat.active = false;
  delete state.combat.pendingTurnStart;
  const record = {
    id: uid(),
    at: new Date().toISOString(),
    sceneId: state.activeSceneId,
    rounds: summary.rounds,
    defeated: summary.defeated.map((d) => ({ actorId: d.actorId, name: d.name, xp: d.xp })),
    xpTotal: summary.xpTotal,
    xpAwarded: award ? summary.xpTotal : 0,
    recipients: award ? recipients : [],
    parcels,
    removedTokens,
  };
  slice.history.push(record);
  if (slice.history.length > 20) slice.history.splice(0, slice.history.length - 20);
  slice.combat = freshCombat(null);
  for (const readied of Object.values(slice.readied))
    if (["held", "moving"].includes(readied.status)) readied.status = "expired";
  return record;
}
/**
 * Clash! Reset: the same encounter again from round 1 (a new encounter identity), DM
 * creatures healed to their maximum through the vitality domain, legendary uses,
 * resistances, recharges and countdowns restored. The dead stay dead.
 */
export function resetEncounter(state, slice, role) {
  requireDM(role, state);
  if (!state.combat?.active)
    refuse("Nessun combattimento in corso.", "No combat in progress.", "no-combat");
  if (Object.keys(state.actors).some((id) => hasBlockingConsequences(state, id)))
    refuse(
      "Risolvi i tiri ancora pendenti prima di reimpostare.",
      "Resolve pending rolls before resetting.",
      "blocking",
    );
  const combat = state.combat;
  const current = combat.order[combat.turn];
  if (current) expireTurnEffects(state, current, "end");
  const stillDead = [];
  const eventId = uid();
  for (const id of combat.order) {
    const actor = state.actors[id];
    if (!actor || actor.kind !== "npc" || !Number.isFinite(actor.maxHp)) continue;
    if (actor.dead) {
      stillDead.push(id);
      continue;
    }
    const missing = actor.maxHp - actor.hp;
    if (missing > 0)
      applyVitalityEvent(state, {
        eventId: `${eventId}:ct-reset:${id}`,
        actorId: id,
        kind: "healing",
        amount: missing,
        source: { kind: "app-option", edition: "2024", revision: "b32-1", pattern: "VTL-117" },
      });
  }
  for (const monster of Object.values(slice.monsters)) {
    if (monster.legendary) monster.legendary.used = 0;
    if (monster.resistance) monster.resistance.used = 0;
    for (const ability of list(monster.recharge)) {
      ability.available = true;
      delete ability.due;
    }
  }
  for (const entry of slice.entries) {
    entry.remaining = entry.rounds;
    entry.firedRound = null;
  }
  combat.encounterId = uid();
  combat.round = 1;
  combat.turn = 0;
  slice.combat = freshCombat(combat.encounterId, 1);
  const first = state.actors[combat.order[0]];
  if (first) {
    expireTurnEffects(state, first.id, "start");
    refreshResources(first);
  }
  return { stillDead };
}
/** Clash! Clear: every combatant leaves the tracker and the scene's prepared order. */
export function clearEncounter(state, slice, role) {
  requireDM(role, state);
  if (Object.keys(state.actors).some((id) => hasBlockingConsequences(state, id)))
    refuse(
      "Risolvi i tiri ancora pendenti prima di svuotare.",
      "Resolve pending rolls before clearing.",
      "blocking",
    );
  state.combat.active = false;
  state.combat.order = [];
  state.combat.turn = 0;
  state.combat.round = 1;
  state.combat.initiative = [];
  delete state.combat.pendingTurnStart;
  const scene = activeScene(state);
  if (scene?.encounter) scene.encounter.participants = [];
  slice.combat = freshCombat(null);
  for (const readied of Object.values(slice.readied))
    if (["held", "moving"].includes(readied.status)) readied.status = "expired";
}
