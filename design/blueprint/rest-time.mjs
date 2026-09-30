import { getEffectiveActor, observeFormsEvent } from "./forms-companions.mjs";
import { canControlActor, canViewActor, isCampaignActor } from "./character-access.mjs";
import { campaignMembers, isCampaignMember, campaignReviewKey } from "./campaign-content.mjs";
import {
  hasBlockingConsequences,
  observeConditionTerms,
  observeConcentrationEnd,
  applyConditionFollowUps,
} from "./combat.mjs";
import { applyConditionEvent, applyVitalityEvent, hasCondition } from "./conditions.mjs";

const copy = (v) => structuredClone(v);
const HOUR = 3600;
const integer = (v, min = 0) => Number.isSafeInteger(v) && v >= min;
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const validId = (v) => typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(v);
const issue = (code, it, en) => ({ code, it, en });
const fail = (code = "unavailable", it = "Riposo non disponibile.", en = "Rest unavailable.") => {
  throw Object.assign(new Error(`${it} / ${en}`), { code, it, en });
};
const source = (en, it) => ({
  kind: "srd",
  edition: "2024",
  revision: "5.2.1",
  en: {
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
    sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
    pages: [en],
  },
  it: {
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf",
    sha256: "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718",
    pages: [it],
  },
});
const SHORT = source(187, 213),
  LONG = source(185, 213);
const hasSource = (s) =>
  object(s) && typeof s.kind === "string" && typeof s.revision === "string" && !!s.revision;
const data = (s) => s.restTime ?? { version: 1, clocks: {}, rests: [], rolls: [], events: [] };
export function initializeRestTime(state) {
  if (!state.restTime)
    state.restTime = { version: 1, clocks: {}, rests: [], rolls: [], events: [] };
  if (
    state.restTime.version !== 1 ||
    !object(state.restTime.clocks) ||
    !["rests", "rolls", "events"].every((k) => Array.isArray(state.restTime[k]))
  )
    fail("schema", "Dati dei riposi non riconosciuti.", "Unrecognized rest data.");
  return state.restTime;
}
const clock = (s, id) => data(s).clocks[id] ?? { seconds: 0, revision: 0 };
const actorFor = (s, id, v, control = false) => {
  const a = s.actors?.[id];
  if (!canReadActor(s, a, v) || (control && !canControlActor(a, v))) fail();
  return a;
};
const restFor = (s, id) => {
  const r = data(s).rests.find((x) => x.id === id);
  if (!r) fail();
  return r;
};
const member = (s, id, v) => isCampaignMember(s, id, v);
const canAdvance = (s, id, v) =>
  campaignMembers(s, id).some((m) => m.id === v && ["dm", "co-dm"].includes(m.role));
const localActor = (a) =>
  a.visibility === "private" || (Array.isArray(a.campaignIds) && a.campaignIds.length === 0);
function canReadActor(s, a, v) {
  return (
    canViewActor(a, v) &&
    (localActor(a)
      ? a.owner === v
      : member(s, s.campaign?.id, v) && isCampaignActor(a, s.campaign?.id))
  );
}
function canReadRestContext(s, r, v) {
  return r.campaignId === null ? r.owner === v : member(s, r.campaignId, v);
}
function canReadRestActor(s, r, p, v) {
  const a = s.actors[p.actorId];
  return (
    canReadRestContext(s, r, v) &&
    canViewActor(a, v) &&
    (r.campaignId === null ? a.owner === v : isCampaignActor(a, r.campaignId))
  );
}
const commitFor = (s, ids) => {
  const local = ids.length > 0 && ids.every((id) => localActor(s.actors[id]));
  return { local, visibility: local ? "private" : "shared" };
};
const commitForRest = (s, r, ids) => ({
  ...commitFor(s, ids),
  ...(r.campaignId === null ? { visibility: "private" } : {}),
});
const online = (options, commit) => {
  if (options?.online === false && !commit.local)
    fail(
      "offline",
      "Riconnettiti prima di modificare il gioco condiviso.",
      "Reconnect before changing shared gameplay.",
    );
};
const inCombat = (s, id) => !!s.combat?.active && s.combat.order?.includes(id);
const pendingRoll = (s, id) =>
  data(s).rolls.some((r) => r.actorId === id && r.status === "pending");
const blocked = (s, id, includeRoll = true) =>
  !!s.actors[id]?.pendingHealing ||
  hasBlockingConsequences({ ...s, combat: s.combat ?? { order: [], turn: 0 } }, id) ||
  (includeRoll && pendingRoll(s, id));
function relevantActor(a) {
  return {
    owner: a.owner,
    visibility: a.visibility,
    campaignIds: a.campaignIds,
    hp: a.hp,
    maxHp: a.maxHp,
    tempHp: a.tempHp,
    exhaustion: a.exhaustion,
    dead: a.dead,
    abilities: a.abilities,
    hitDice: a.hitDice,
    spellSlots: a.spellSlots ?? { 1: a.slots },
    pactSlots: a.pactSlots,
    features: a.features?.map(({ id, resourceId, max, used }) => ({ id, resourceId, max, used })),
    spells: a.spells?.map(({ id, resourceId, max, used }) => ({ id, resourceId, max, used })),
    inventory: a.inventory?.map(({ id, resourceId, max, used }) => ({ id, resourceId, max, used })),
    restProfile: a.restProfile,
    pendingHealing: a.pendingHealing,
    combatEffects: a.combatEffects,
    conditions: a.conditions,
    concentration: a.concentration,
    malnutrition: a.malnutrition,
  };
}
function review(state, payload, ids, extra) {
  return campaignReviewKey({
    payload,
    actors: ids.map((id) => [id, relevantActor(state.actors[id])]),
    pending: ids.map((id) => [id, blocked(state, id), inCombat(state, id)]),
    extra,
  });
}
function base(errors = [], warnings = [], more = {}) {
  return { canApply: errors.length === 0, errors, warnings, ...more };
}
function validatePreview(p, options = {}) {
  if (!p.canApply) {
    const e = p.errors[0];
    fail(e.code, e.it, e.en);
  }
  if (options.reviewKey !== undefined && options.reviewKey !== p.reviewKey)
    fail(
      "conflict",
      "I dati sono cambiati: rivedi il confronto.",
      "Data changed: review the comparison again.",
    );
  online(options, p.commit);
}
function retry(s, id, kind, payload, viewer) {
  if (!validId(id)) fail("id", "Identificatore richiesto.", "An identifier is required.");
  const e = data(s).events.find((x) => x.id === id);
  if (!e) return null;
  if (e.kind !== kind || e.owner !== viewer || e.inputKey !== campaignReviewKey(payload))
    fail(
      "id-conflict",
      "Identificatore già usato per un’altra operazione.",
      "Identifier already used for another operation.",
    );
  return copy(e.result);
}
function event(s, id, kind, payload, owner, result) {
  initializeRestTime(s).events.push({
    id,
    kind,
    owner,
    inputKey: campaignReviewKey(payload),
    result: copy(result),
  });
  return copy(result);
}
function selected(s, r, args, v) {
  if (!canReadRestContext(s, r, v)) fail();
  const ids =
    args?.actorIds ??
    r.participants.filter((p) => canControlActor(s.actors[p.actorId], v)).map((p) => p.actorId);
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) fail();
  return ids.map((id) => {
    actorFor(s, id, v, true);
    const p = r.participants.find((p) => p.actorId === id);
    if (!p || !canReadRestActor(s, r, p, v)) fail();
    return p;
  });
}
function profile(a) {
  return hasSource(a.restProfile?.source) ? a.restProfile : {};
}
function arcaneFor(a) {
  const arc = profile(a).arcaneRecovery;
  if (!arc) return null;
  if (!arc.featureId) return { ...copy(arc), max: 1, path: "restProfile.arcaneRecovery.used" };
  const feature = a.features?.find((f) => f.id === arc.featureId);
  return {
    ...copy(arc),
    max: feature?.max ?? 0,
    used: feature?.used ?? null,
    path: `features.${arc.featureId}.used`,
  };
}
function sleepRequirements(a) {
  const p = profile(a),
    trance = p.trance === true && p.longRestSeconds === 14400 && p.sleepRequiredSeconds === 0;
  return {
    requiredSeconds: trance ? 14400 : 28800,
    sleepRequiredSeconds: trance ? 0 : 21600,
    tranceRequiredSeconds: trance ? 14400 : 0,
    trance,
  };
}
function stopConcentration(s, a, reason) {
  if (!a.concentration?.active) return;
  const id = a.concentration.id;
  a.concentration.active = false;
  a.concentration.endedReason = reason;
  for (const target of Object.values(s.actors))
    if (target.combatEffects)
      target.combatEffects = target.combatEffects.filter((e) => e.concentrationId !== id);
  observeConcentrationEnd(s, a.id, id);
}
function activity(s, r, p, next) {
  if (
    !["light", "sleep", "trance"].includes(next) ||
    (next === "trance" && !sleepRequirements(s.actors[p.actorId]).trance)
  )
    fail(
      "activity",
      "Attività non supportata dal profilo.",
      "Activity is not supported by this profile.",
    );
  const a = s.actors[p.actorId];
  p.activity = next;
  if (next === "sleep") {
    // Sleep is Unconscious through the conditions domain, bound to this rest: it adds a
    // distinct Prone, ends Concentration with its linked effects, drops known held items
    // and records the event (SRD Unconscious, EN 191 / IT 212).
    if (!sleeping(a, r)) {
      p.sleepApplications = (p.sleepApplications ?? 0) + 1;
      const result = applyConditionEvent(s, {
        eventId: `${r.id}:${a.id}:sleep-${p.sleepApplications}`,
        kind: "apply",
        actorId: a.id,
        conditionId: "unconscious",
        restId: r.id,
        cause: "sleep",
        source: LONG,
        owner: a.owner ?? null,
        immunityConfirmed: true,
        term: { kind: "rest", actorId: a.id, restKind: r.kind, restId: r.id },
      });
      applyConditionFollowUps(s, result);
    }
    stopConcentration(s, a, "rest-sleep");
  } else wake(s, r, p);
}
const sleeping = (a, r) =>
  (a.conditions ?? []).some((c) => object(c) && c.id === "unconscious" && c.restId === r.id);
// Waking ends only this rest's sleep, through the domain: Prone remains, as it does when
// any Unconscious ends, and unrelated causes of Unconscious stay.
function wake(s, r, p) {
  const a = s.actors[p.actorId];
  if (!sleeping(a, r)) return;
  p.wakes = (p.wakes ?? 0) + 1;
  const result = applyConditionEvent(s, {
    eventId: `${r.id}:${a.id}:wake-${p.wakes}`,
    kind: "end",
    actorId: a.id,
    restId: r.id,
    reason: "woke",
    source: LONG,
  });
  applyConditionFollowUps(s, result);
}
function projectRest(s, r, v) {
  if (!canReadRestContext(s, r, v)) fail();
  const participants = r.participants
    .filter((p) => canReadRestActor(s, r, p, v))
    .map((p) => ({
      ...copy(p),
      actorName: copy(s.actors[p.actorId].name),
      permissions: {
        canControl:
          canReadActor(s, s.actors[p.actorId], v) && canControlActor(s.actors[p.actorId], v),
      },
    }));
  if (!participants.length) fail();
  return {
    ...copy(r),
    participants,
    commit: commitForRest(
      s,
      r,
      participants.map((p) => p.actorId),
    ),
  };
}
export function getRest(s, id, v) {
  return projectRest(s, restFor(s, id), v);
}
export function listRests(s, v, filter = {}) {
  return data(s)
    .rests.filter(
      (r) =>
        (filter.campaignId === undefined || r.campaignId === filter.campaignId) &&
        (!filter.actorId || r.participants.some((p) => p.actorId === filter.actorId)),
    )
    .flatMap((r) => {
      try {
        const projected = projectRest(s, r, v);
        return !filter.actorId || projected.participants.some((p) => p.actorId === filter.actorId)
          ? [projected]
          : [];
      } catch {
        return [];
      }
    });
}
export function getRestRolls(s, v, filter = {}) {
  return copy(
    data(s).rolls.filter(
      (r) =>
        canReadRoll(s, r, v) &&
        (!filter.actorId || r.actorId === filter.actorId) &&
        (!filter.restId || r.restId === filter.restId),
    ),
  );
}
function canReadRoll(s, roll, v) {
  const rest = data(s).rests.find((r) => r.id === roll.restId);
  const context = Object.hasOwn(roll, "campaignId")
    ? { campaignId: roll.campaignId, owner: roll.owner }
    : rest;
  return context
    ? canReadRestActor(s, context, { actorId: roll.actorId }, v)
    : roll.owner === v && canReadActor(s, s.actors[roll.actorId], v);
}
export function getGameTime(s, id, v) {
  if (!member(s, id, v)) fail();
  return {
    campaignId: id,
    ...copy(clock(s, id)),
    permissions: { canAdvance: canAdvance(s, id, v) },
  };
}
export function getRestRecoveryProfile(s, id, v) {
  const a = actorFor(s, id, v),
    p = profile(a),
    requirements = sleepRequirements(a);
  return {
    actorId: id,
    actorName: copy(a.name),
    hp: a.hp,
    maxHp: a.maxHp,
    tempHp: a.tempHp,
    exhaustion: a.exhaustion,
    trance: requirements.trance,
    longRestSeconds: requirements.requiredSeconds,
    sleepRequiredSeconds: requirements.sleepRequiredSeconds,
    tranceRequiredSeconds: requirements.tranceRequiredSeconds,
    hitDice: copy(a.hitDice ?? {}),
    spellSlots: copy(a.spellSlots ?? (a.slots ? { 1: a.slots } : {})),
    pactSlots: copy(a.pactSlots ?? null),
    features: (a.features ?? []).map(({ id, name, resourceId, max, used }) => ({
      id,
      name: copy(name),
      resourceId,
      max,
      used,
    })),
    recoveries: copy(p.recoveries ?? []),
    arcaneRecovery: arcaneFor(a),
    source: copy(p.source ?? null),
    permissions: { canControl: canControlActor(a, v) },
    commit: commitFor(s, [id]),
  };
}
export function previewRest(s, input, v) {
  const errors = [],
    participants = [],
    ids = [],
    rows = [];
  if (
    !validId(input?.id) ||
    !["short", "long"].includes(input?.kind) ||
    !Array.isArray(input?.actorIds) ||
    !input.actorIds.length ||
    new Set(input.actorIds).size !== input.actorIds.length
  )
    errors.push(
      issue("input", "Scegli tipo e partecipanti.", "Choose a rest type and participants."),
    );
  else
    for (const id of input.actorIds) {
      const a = s.actors?.[id];
      if (!canReadActor(s, a, v) || !canControlActor(a, v)) {
        errors.push(
          issue("unavailable", "Partecipante non disponibile.", "Participant unavailable."),
        );
        continue;
      }
      ids.push(id);
      const req = sleepRequirements(a),
        act = input.activityByActor?.[id] ?? "light";
      participants.push({
        actorId: id,
        actorName: copy(a.name),
        requiredSeconds: input.kind === "short" ? HOUR : req.requiredSeconds,
        source: copy(input.kind === "short" ? SHORT : req.trance ? profile(a).source : LONG),
        activity: act,
      });
      if (act === "sleep") {
        rows.push({
          actorId: id,
          path: "conditions",
          before: copy(a.conditions ?? []),
          after: [
            ...copy(a.conditions ?? []),
            { id: "unconscious", restId: input.id, source: LONG },
          ],
          source: LONG,
          reason: "sleep",
        });
        // Unconscious includes Prone, which remains on waking (SRD EN 191 / IT 212).
        rows.push({
          actorId: id,
          path: "conditions.prone",
          before: hasCondition(a, "prone"),
          after: true,
          source: source(191, 212),
          reason: "sleep",
        });
        if (a.concentration?.active)
          rows.push({
            actorId: id,
            path: "concentration.active",
            before: true,
            after: false,
            source: source(179, 206),
            reason: "sleep",
          });
      }
      if (
        input.campaignId !== null &&
        (!member(s, input.campaignId, v) || !isCampaignActor(a, input.campaignId) || localActor(a))
      )
        errors.push(
          issue("campaign", "Contesto campagna non disponibile.", "Campaign context unavailable."),
        );
      if (input.campaignId === null && !localActor(a))
        errors.push(
          issue(
            "context",
            "Usa il contesto della campagna per questa scheda condivisa.",
            "Use the campaign context for this shared sheet.",
          ),
        );
      if (!Number.isFinite(a.hp) || a.hp < 1 || a.dead)
        errors.push(
          issue(
            "hp",
            "Servono almeno 1 PF registrato e un personaggio vivo.",
            "A living character with at least 1 recorded HP is required.",
          ),
        );
      if (blocked(s, id) || inCombat(s, id))
        errors.push(
          issue(
            "pending",
            "Risolvi le conseguenze e il combattimento del partecipante.",
            "Resolve the participant’s consequences and combat.",
          ),
        );
      if (
        data(s).rests.some((r) =>
          r.participants.some(
            (p) => p.actorId === id && ["resting", "interrupted"].includes(p.status),
          ),
        )
      )
        errors.push(issue("active", "Un riposo è già in corso.", "A rest is already in progress."));
      if (!["light", "sleep", "trance"].includes(act) || (act === "trance" && !req.trance))
        errors.push(
          issue(
            "activity",
            "Attività non supportata dal profilo.",
            "Activity is not supported by this profile.",
          ),
        );
      if (input.kind === "long") {
        // An actor cannot have overlapping rests, so creation order also orders its completions.
        const last = data(s)
          .rests.slice()
          .reverse()
          .find((r) =>
            r.participants.some((p) => p.actorId === id && p.lastLongCompletedAt !== undefined),
          );
        const prior = last?.participants.find((p) => p.actorId === id);
        if (last) {
          const sameClock = input.campaignId !== null && last.campaignId === input.campaignId;
          if (
            sameClock &&
            clock(s, input.campaignId).seconds - prior.lastLongCompletedAt < 16 * HOUR
          )
            errors.push(
              issue(
                "long-cooldown",
                "Attendi 16 ore dalla conclusione del lungo precedente.",
                "Wait 16 hours after the previous Long Rest ended.",
              ),
            );
          else if (!sameClock && !integer(input.elapsedSinceLastLongSeconds, 16 * HOUR))
            errors.push(
              issue(
                "long-context",
                "Il tempo tra questi contesti non è collegato: registra almeno 16 ore trascorse dal lungo precedente.",
                "Time in these contexts is not linked: record at least 16 elapsed hours since the previous Long Rest.",
              ),
            );
        }
      }
    }
  return base(errors, [], {
    participants,
    rows,
    commit: commitFor(s, ids),
    reviewKey: review(s, input, ids, {
      rests: data(s).rests.filter((r) => r.participants.some((p) => ids.includes(p.actorId))),
      clock:
        input?.campaignId && member(s, input.campaignId, v) ? clock(s, input.campaignId) : null,
    }),
  });
}
export function startRest(s, input, v, options = {}) {
  const existing = data(s).rests.find((r) => r.id === input.id);
  if (existing) {
    if (existing.owner !== v || existing.inputKey !== campaignReviewKey(input)) fail("id-conflict");
    for (const p of existing.participants) actorFor(s, p.actorId, v, true);
    return getRest(s, existing.id, v);
  }
  const p = previewRest(s, input, v);
  validatePreview(p, options);
  const r = {
    id: input.id,
    kind: input.kind,
    campaignId: input.campaignId,
    owner: v,
    inputKey: campaignReviewKey(input),
    revision: 1,
    participants: input.actorIds.map((id) => ({
      actorId: id,
      status: "resting",
      elapsedSeconds: 0,
      sleepSeconds: 0,
      tranceSeconds: 0,
      lightSeconds: 0,
      requiredSeconds:
        input.kind === "short" ? HOUR : sleepRequirements(s.actors[id]).requiredSeconds,
      sleepRequiredSeconds:
        input.kind === "short" ? 0 : sleepRequirements(s.actors[id]).sleepRequiredSeconds,
      tranceRequiredSeconds:
        input.kind === "short" ? 0 : sleepRequirements(s.actors[id]).tranceRequiredSeconds,
      activity: "light",
      interruptions: [],
      benefits: [],
    })),
  };
  initializeRestTime(s).rests.push(r);
  for (const part of r.participants) {
    closeWindows(s, part.actorId);
    activity(s, r, part, input.activityByActor?.[part.actorId] ?? "light");
  }
  return getRest(s, r.id, v);
}
function closeWindows(s, id) {
  for (const r of data(s).rests)
    for (const p of r.participants)
      if (p.actorId === id) for (const b of p.benefits) if (b.applied) b.closed = true;
}
function elapsed(p, seconds) {
  if (p.status !== "resting") return;
  p.elapsedSeconds += seconds;
  if (p.activity === "sleep") p.sleepSeconds += seconds;
  if (p.activity === "trance") p.tranceSeconds = (p.tranceSeconds ?? 0) + seconds;
  if (p.activity === "light") p.lightSeconds += seconds;
}
// PG-35 (dnd5e recovery at dawn from the calendar): a dawn is 06:00 of game time. Only the
// calendar's starting hour matters (08:00 without a calendar), as for charged items
// (inventory-plus dawnIndex): editing the calendar's date never invents a dawn.
export const RECOVERY_TRIGGERS = Object.freeze(["short", "long", "dawn"]);
const DAY = 24 * HOUR,
  DAWN_HOUR = 6;
export function dawnIndexAt(s, campaignId, seconds) {
  const epoch = s?.ext?.["world-map"]?.campaigns?.[campaignId]?.calendar?.epoch;
  const start = epoch ? (epoch.hour ?? 0) * HOUR + (epoch.minute ?? 0) * 60 : 8 * HOUR;
  return Math.floor((start + (Number(seconds) || 0) - DAWN_HOUR * HOUR) / DAY);
}
const DAWN_SOURCE = Object.freeze({
  kind: "authored",
  revision: "feature-recovery-dawn",
  title: { it: "Recupero all’alba della capacità", en: "The feature's dawn recovery" },
});
// Features that recover at dawn (a custom feature's «all’alba», or a rest-profile rule with
// the «dawn» trigger): fully restored once for any number of dawns crossed.
function dawnRows(s, campaignId, before, after) {
  if (dawnIndexAt(s, campaignId, after) <= dawnIndexAt(s, campaignId, before)) return [];
  const rows = [];
  for (const a of Object.values(s.actors ?? {})) {
    if (!isCampaignActor(a, campaignId) || localActor(a)) continue;
    const seen = new Set();
    for (const f of a.features ?? []) {
      if (f?.recovery !== "dawn" || !integer(f.max, 1) || !integer(f.used, 1)) continue;
      const path = `features.${f.id}.used`;
      seen.add(path);
      rows.push({
        actorId: a.id,
        path,
        before: f.used,
        after: 0,
        source: copy(hasSource(f.source) ? f.source : DAWN_SOURCE),
        reason: "dawn-recovery",
      });
    }
    for (const policy of profile(a).recoveries ?? []) {
      if (policy.trigger !== "dawn" || !hasSource(policy.source)) continue;
      if (!["all", "reduce-used"].includes(policy.operation)) continue;
      for (const { path, pool } of resources(a, policy)) {
        if (seen.has(path) || !integer(pool.max, 1) || !integer(pool.used, 1)) continue;
        if (policy.operation === "reduce-used" && !integer(policy.amount, 1)) continue;
        seen.add(path);
        rows.push({
          actorId: a.id,
          path,
          before: pool.used,
          after: policy.operation === "all" ? 0 : Math.max(0, pool.used - policy.amount),
          source: copy(policy.source),
          reason: "dawn-recovery",
        });
      }
    }
  }
  return rows;
}
function advanceRows(s, campaignId, seconds) {
  const rows = [],
    before = clock(s, campaignId).seconds,
    after = before + seconds;
  rows.push(...dawnRows(s, campaignId, before, after));
  for (const r of data(s).rests.filter((r) => r.campaignId === campaignId))
    for (const p of r.participants)
      if (p.status === "resting")
        rows.push({
          actorId: p.actorId,
          path: "elapsedSeconds",
          before: p.elapsedSeconds,
          after: p.elapsedSeconds + seconds,
          source: r.kind === "short" ? SHORT : LONG,
          reason: "elapsed",
        });
  for (const a of Object.values(s.actors))
    if (isCampaignActor(a, campaignId) && !localActor(a))
      for (const e of a.combatEffects ?? [])
        if (
          e.expiresAtGameTime?.campaignId === campaignId &&
          integer(e.expiresAtGameTime.seconds) &&
          e.expiresAtGameTime.seconds <= after
        )
          rows.push({
            actorId: a.id,
            path: `combatEffects.${e.id ?? "timed"}`,
            before: copy(e),
            after: null,
            source: copy(e.source ?? { kind: "authored", revision: "explicit-duration" }),
            reason: "elapsed-expiry",
          });
  for (const a of Object.values(s.actors))
    if (
      isCampaignActor(a, campaignId) &&
      !localActor(a) &&
      a.concentration?.active &&
      a.concentration.expiresAtGameTime?.campaignId === campaignId &&
      integer(a.concentration.expiresAtGameTime.seconds) &&
      a.concentration.expiresAtGameTime.seconds <= after
    )
      rows.push({
        actorId: a.id,
        path: "concentration.active",
        before: true,
        after: false,
        source: copy(a.concentration.source ?? { kind: "authored", revision: "explicit-duration" }),
        reason: "elapsed-expiry",
      });
  return rows;
}
export function previewTimeAdvance(s, input, v) {
  const errors = [];
  if (!canAdvance(s, input?.campaignId, v))
    return base(
      [
        issue(
          "permission",
          "Solo il DM del contesto avanza il tempo condiviso.",
          "Only this context’s DM advances shared time.",
        ),
      ],
      [],
      {
        before: null,
        after: null,
        rows: [],
        reviewKey: "",
        commit: { local: false, visibility: "shared" },
      },
    );
  if (!integer(input?.seconds, 1) || !integer(clock(s, input?.campaignId).seconds + input.seconds))
    errors.push(
      issue(
        "duration",
        "Inserisci una durata positiva in secondi.",
        "Enter a positive duration in seconds.",
      ),
    );
  const rows = errors.length ? [] : advanceRows(s, input.campaignId, input.seconds),
    ids = [...new Set(rows.map((r) => r.actorId))];
  const pendingIds = data(s)
    .rests.filter((r) => r.campaignId === input.campaignId)
    .flatMap((r) =>
      r.participants
        .filter((p) => p.status === "resting" || p.benefits.some((b) => b.applied && !b.closed))
        .map((p) => p.actorId),
    );
  if ([...new Set([...ids, ...pendingIds])].some((id) => blocked(s, id)))
    errors.push(
      issue(
        "pending",
        "Una conseguenza pertinente è ancora in attesa.",
        "A relevant consequence is still pending.",
      ),
    );
  const before = clock(s, input?.campaignId).seconds;
  return base(errors, [], {
    before,
    after: before + (integer(input?.seconds, 1) ? input.seconds : 0),
    rows: rows.filter((r) => canViewActor(s.actors[r.actorId], v)),
    commit: { local: false, visibility: "shared" },
    reviewKey: review(
      s,
      { campaignId: input?.campaignId, seconds: input?.seconds },
      [...new Set([...ids, ...pendingIds])],
      {
        clock: clock(s, input?.campaignId),
        rests: data(s).rests.filter((r) => r.campaignId === input?.campaignId),
      },
    ),
  });
}
function advance(s, campaignId, seconds) {
  const d = initializeRestTime(s),
    c = (d.clocks[campaignId] ??= { seconds: 0, revision: 0 });
  for (const row of dawnRows(s, campaignId, c.seconds, c.seconds + seconds))
    setRow(s.actors[row.actorId], row);
  c.seconds += seconds;
  c.revision++;
  for (const r of d.rests.filter((r) => r.campaignId === campaignId)) {
    for (const p of r.participants) {
      for (const b of p.benefits) if (b.applied) b.closed = true;
      elapsed(p, seconds);
    }
    r.revision++;
  }
  for (const a of Object.values(s.actors))
    if (isCampaignActor(a, campaignId) && !localActor(a) && a.combatEffects)
      a.combatEffects = a.combatEffects.filter(
        (e) =>
          !(
            e.expiresAtGameTime?.campaignId === campaignId &&
            integer(e.expiresAtGameTime.seconds) &&
            e.expiresAtGameTime.seconds <= c.seconds
          ),
      );
  for (const a of Object.values(s.actors))
    if (
      isCampaignActor(a, campaignId) &&
      !localActor(a) &&
      a.concentration?.active &&
      a.concentration.expiresAtGameTime?.campaignId === campaignId &&
      integer(a.concentration.expiresAtGameTime.seconds) &&
      a.concentration.expiresAtGameTime.seconds <= c.seconds
    )
      stopConcentration(s, a, "elapsed-duration");
  observeConditionTerms(s, {
    eventId: "clock:" + campaignId + ":" + c.revision + ":conditions",
    kind: "clock",
    clockId: campaignId,
  });
  if (s.formsCompanions || Object.values(s.actors).some((a) => a.activeForm))
    observeFormsEvent(s, {
      eventId: "clock:" + campaignId + ":" + c.revision,
      cause: "time",
      actorIds: Object.values(s.actors)
        .filter((a) => isCampaignActor(a, campaignId) && !localActor(a))
        .map((a) => a.id),
    });
  return { campaignId, ...copy(c) };
}
export function advanceGameTime(s, input, v, options = {}) {
  if (!canAdvance(s, input.campaignId, v)) fail();
  const payload = { campaignId: input.campaignId, seconds: input.seconds },
    old = retry(s, input.id, "advance", payload, v);
  if (old) return old;
  const p = previewTimeAdvance(s, payload, v);
  validatePreview(p, options);
  return event(s, input.id, "advance", payload, v, advance(s, input.campaignId, input.seconds));
}
export function recordPersonalRestTime(s, id, input, v, options = {}) {
  const r = restFor(s, id),
    p = selected(s, r, { actorIds: [input.actorId] }, v)[0];
  if (r.campaignId !== null || !integer(input.seconds, 1)) fail();
  const payload = { restId: id, actorId: input.actorId, seconds: input.seconds },
    old = retry(s, input.id, "personal-time", payload, v);
  if (old) return old;
  online(options, commitFor(s, [p.actorId]));
  if (blocked(s, p.actorId)) fail("pending");
  elapsed(p, input.seconds);
  const personalClockId = "personal:" + p.actorId;
  if (
    s.actors[p.actorId].activeForm?.clockId === personalClockId ||
    s.formsCompanions?.castings.some(
      (c) => c.actorId === p.actorId && c.campaignId === null && c.status === "casting",
    )
  ) {
    const personalClock = (initializeRestTime(s).clocks[personalClockId] ??= {
      seconds: 0,
      revision: 0,
    });
    personalClock.seconds += input.seconds;
    personalClock.revision++;
    observeConditionTerms(s, {
      eventId: input.id + ":conditions-time",
      kind: "clock",
      clockId: personalClockId,
    });
    observeFormsEvent(s, {
      eventId: input.id + ":forms-time",
      cause: "time",
      actorIds: [p.actorId],
    });
  }
  r.revision++;
  return event(s, input.id, "personal-time", payload, v, {
    restId: id,
    actorId: p.actorId,
    elapsedSeconds: p.elapsedSeconds,
  });
}
export function setRestActivity(s, id, input, v, options = {}) {
  const r = restFor(s, id),
    p = selected(s, r, { actorIds: [input.actorId] }, v)[0];
  online(options, commitFor(s, [p.actorId]));
  if (p.status !== "resting" || blocked(s, p.actorId)) fail("pending");
  activity(s, r, p, input.activity);
  r.revision++;
  return getRest(s, id, v);
}
function interrupt(s, r, parts, eventId, cause) {
  for (const p of parts) {
    if (p.interruptions.some((e) => e.id === eventId)) continue;
    closeWindows(s, p.actorId);
    if (p.status !== "resting") continue;
    wake(s, r, p);
    p.interruptions.push({ id: eventId, cause, elapsedSeconds: p.elapsedSeconds });
    if (r.kind === "long") {
      p.requiredSeconds += HOUR;
      if (p.elapsedSeconds >= HOUR) {
        const recovery = recoveryRows(s.actors[p.actorId], "short");
        for (const row of recovery.rows) setRow(s.actors[p.actorId], row);
        p.benefits.push({
          id: `${r.id}:${p.actorId}:${eventId}`,
          kind: "short",
          interruptionId: eventId,
          at: r.campaignId ? clock(s, r.campaignId).seconds : p.elapsedSeconds,
          applied: true,
          closed: false,
          results: recovery.rows,
          warnings: recovery.warnings,
        });
      }
      p.status = "interrupted";
    } else p.status = "cancelled";
  }
  r.revision++;
}
export function interruptRest(s, id, input, v, options = {}) {
  const r = restFor(s, id),
    parts = selected(s, r, input, v);
  online(
    options,
    commitFor(
      s,
      parts.map((p) => p.actorId),
    ),
  );
  if (
    !validId(input.eventId) ||
    !["initiative", "damage", "leveled-spell", "exertion"].includes(input.cause)
  )
    fail("cause");
  interrupt(s, r, parts, input.eventId, input.cause);
  return getRest(s, id, v);
}
export function resumeRest(s, id, input, v, options = {}) {
  const r = restFor(s, id),
    parts = selected(s, r, input, v);
  online(
    options,
    commitFor(
      s,
      parts.map((p) => p.actorId),
    ),
  );
  if (
    r.kind !== "long" ||
    parts.some(
      (p) =>
        !["interrupted", "resting"].includes(p.status) ||
        blocked(s, p.actorId) ||
        inCombat(s, p.actorId) ||
        s.actors[p.actorId].dead,
    )
  )
    fail("pending");
  for (const p of parts) {
    p.status = "resting";
    closeWindows(s, p.actorId);
    activity(s, r, p, p.activity);
  }
  r.revision++;
  return getRest(s, id, v);
}
export function cancelRest(s, id, input, v, options = {}) {
  const r = restFor(s, id),
    parts = selected(s, r, input, v);
  online(
    options,
    commitFor(
      s,
      parts.map((p) => p.actorId),
    ),
  );
  if (typeof input.reason !== "string" || !input.reason.trim()) fail("reason");
  for (const p of parts) {
    p.status = "cancelled";
    p.cancelReason = input.reason.trim();
    wake(s, r, p);
    closeWindows(s, p.actorId);
  }
  r.revision++;
  return getRest(s, id, v);
}
function resources(a, policy) {
  const t = policy.target;
  if (!object(t)) return [];
  if (t.kind === "spellSlots")
    return Object.entries(a.spellSlots ?? (a.slots ? { 1: a.slots } : {})).map(([k, pool]) => ({
      path: `spellSlots.${k}.used`,
      pool,
    }));
  if (t.kind === "pactSlots")
    return a.pactSlots ? [{ path: "pactSlots.used", pool: a.pactSlots }] : [];
  const key = { feature: "features", spell: "spells", item: "inventory" }[t.kind],
    entry =
      key &&
      (a[key] ?? []).find((e) => e.id === t.id && (!t.resourceId || t.resourceId === e.resourceId));
  return entry ? [{ path: `${key}.${entry.id}.used`, pool: entry }] : [];
}
function recoveryRows(a, kind) {
  const rows = [],
    warnings = [],
    add = (path, before, after, src, reason) => {
      if (before !== after)
        rows.push({
          actorId: a.id,
          path,
          before: copy(before ?? null),
          after: copy(after),
          source: copy(src),
          reason,
        });
    };
  if (kind === "long") {
    if (Number.isFinite(a.maxHp) && a.maxHp > 0) add("hp", a.hp, a.maxHp, LONG, "full-recovery");
    else
      warnings.push(
        issue(
          "max-hp",
          "PF massimi non registrati: cura da verificare.",
          "Maximum HP is unrecorded: verify healing.",
        ),
      );
    if (Number.isFinite(a.tempHp) && a.tempHp > 0 && !a.restProfile?.keepTempHpOnLongRest)
      add("tempHp", a.tempHp, 0, source(18, 20), "long-rest-expiry");
    for (const [die, pool] of Object.entries(a.hitDice ?? {}))
      if (integer(pool.max, 1)) add(`hitDice.${die}.used`, pool.used, 0, LONG, "full-recovery");
    if (integer(a.exhaustion, 1) && a.malnutrition !== true)
      add("exhaustion", a.exhaustion, a.exhaustion - 1, LONG, "long-rest-recovery");
    const arc = arcaneFor(a);
    if (hasSource(arc?.source) && integer(arc.wizardLevel, 1) && integer(arc.max, 1))
      add(arc.path, arc.used, 0, source(78, 60), "long-rest-recovery");
  }
  for (const policy of profile(a).recoveries ?? []) {
    if (
      policy.trigger !== kind ||
      !hasSource(policy.source) ||
      !["all", "reduce-used"].includes(policy.operation)
    )
      continue;
    for (const { path, pool } of resources(a, policy)) {
      if (!integer(pool.max, 1)) continue;
      if (
        policy.operation === "reduce-used" &&
        (!integer(policy.amount, 1) || !integer(pool.used))
      ) {
        warnings.push(
          issue(
            "unknown-used",
            "Recupero parziale da riconciliare: consumo non registrato.",
            "Reconcile partial recovery: spent uses are unrecorded.",
          ),
        );
        continue;
      }
      const after = policy.operation === "all" ? 0 : Math.max(0, pool.used - policy.amount);
      if (rows.some((r) => r.path === path)) {
        warnings.push(
          issue(
            "duplicate-policy",
            "Più regole riguardano la stessa risorsa: controlla il profilo.",
            "Multiple rules target the same resource: check the profile.",
          ),
        );
        continue;
      }
      add(
        path,
        pool.used,
        after,
        policy.source,
        policy.operation === "all" ? "full-recovery" : "partial-recovery",
      );
    }
  }
  return { rows, warnings };
}
function setRow(a, row) {
  const bits = row.path.split(".");
  if (["features", "spells", "inventory"].includes(bits[0])) {
    const item = a[bits[0]].find((x) => x.id === bits.slice(1, -1).join("."));
    item[bits.at(-1)] = copy(row.after);
    if (bits[0] === "features" && a.featureUsageLedger?.[item.id])
      a.featureUsageLedger[item.id] = { ...a.featureUsageLedger[item.id], used: item.used };
    if (bits[0] === "spells" && a.spellUsageLedger?.[item.id])
      a.spellUsageLedger[item.id] = { ...a.spellUsageLedger[item.id], used: item.used };
  } else {
    if (bits[0] === "spellSlots") {
      a.spellSlots ??= a.slots ? { 1: a.slots } : {};
    }
    let at = a;
    for (const key of bits.slice(0, -1)) at = at[key];
    at[bits.at(-1)] = copy(row.after);
  }
  if (a.spellSlots?.[1]) a.slots = a.spellSlots[1];
}
function completionContext(s, id, input, v) {
  const r = restFor(s, id),
    parts = selected(s, r, input, v);
  return { r, parts, ids: parts.map((p) => p.actorId) };
}
export function previewRestCompletion(s, id, input = {}, v) {
  const errors = [],
    warnings = [],
    rows = [];
  let ctx;
  try {
    ctx = completionContext(s, id, input, v);
  } catch {
    return base([issue("unavailable", "Riposo non disponibile.", "Rest unavailable.")], [], {
      rows: [],
      commit: { local: true, visibility: "private" },
      reviewKey: "",
    });
  }
  const { r, parts, ids } = ctx;
  for (const p of parts) {
    const a = s.actors[p.actorId],
      b = input.benefitId ? p.benefits.find((b) => b.id === input.benefitId) : null,
      kind = b?.kind ?? r.kind;
    if (blocked(s, p.actorId) || inCombat(s, p.actorId))
      errors.push(
        issue(
          "pending",
          "Risolvi le conseguenze del partecipante.",
          "Resolve the participant’s pending consequences.",
        ),
      );
    if (a.dead)
      errors.push(
        issue(
          "dead",
          "Un riposo non resuscita un personaggio.",
          "A rest does not resurrect a character.",
        ),
      );
    if (
      input.benefitId
        ? !b || b.applied || b.closed
        : p.status !== "resting" || p.elapsedSeconds < p.requiredSeconds
    )
      errors.push(
        issue(
          "duration",
          "Questo beneficio non è ancora disponibile.",
          "This benefit is not available yet.",
        ),
      );
    const tranceRequired = p.tranceRequiredSeconds ?? (p.sleepRequiredSeconds === 0 ? 4 * HOUR : 0);
    const tranceMet = tranceRequired > 0 && (p.tranceSeconds ?? 0) >= tranceRequired;
    const normalSleepMet =
      p.sleepSeconds >= 6 * HOUR && p.elapsedSeconds >= 8 * HOUR + p.interruptions.length * HOUR;
    if (
      !input.benefitId &&
      r.kind === "long" &&
      (!(tranceMet || normalSleepMet) || p.lightSeconds > 2 * HOUR)
    )
      errors.push(
        issue(
          "sleep",
          "Servono 6 ore di sonno nel lungo ordinario o 4 ore effettive di Trance, oltre alle attività compatibili.",
          "The ordinary Long Rest requires 6 hours of sleep, or 4 actual hours of Trance, plus compatible activities.",
        ),
      );
    const result = recoveryRows(a, kind);
    rows.push(...result.rows);
    warnings.push(...result.warnings);
  }
  return base(errors, warnings, {
    rows,
    commit: commitForRest(s, r, ids),
    reviewKey: review(s, { restId: id, actorIds: ids, benefitId: input.benefitId ?? null }, ids, {
      rest: r,
      clock: r.campaignId ? clock(s, r.campaignId) : null,
    }),
  });
}
export function completeRest(s, id, input, v, options = {}) {
  const { r, parts, ids } = completionContext(s, id, input, v),
    payload = { restId: id, actorIds: ids, benefitId: input.benefitId ?? null },
    old = retry(s, input.id, "complete", payload, v);
  if (old) return old;
  const p = previewRestCompletion(s, id, input, v);
  validatePreview(p, options);
  for (const row of p.rows)
    if (row.path === "exhaustion")
      // Long-rest Exhaustion recovery is a recorded conditions event, not a bare write.
      applyConditionFollowUps(
        s,
        applyConditionEvent(s, {
          eventId: `${input.id}:${row.actorId}:exhaustion`,
          kind: "exhaustion",
          actorId: row.actorId,
          level: row.after,
          reason: "long-rest-recovery",
          source: row.source,
        }),
      );
    else if (row.path === "hp" && Number.isInteger(row.before) && row.after > row.before)
      // Long-rest HP recovery is healing through the vitality domain: it ends a knockout
      // like any regained HP and records the event.
      applyConditionFollowUps(
        s,
        applyVitalityEvent(s, {
          eventId: `${input.id}:${row.actorId}:hp`,
          kind: "healing",
          actorId: row.actorId,
          amount: row.after - row.before,
          source: row.source,
        }),
      );
    else setRow(s.actors[row.actorId], row);
  for (const part of parts) {
    let b = input.benefitId ? part.benefits.find((b) => b.id === input.benefitId) : null;
    if (!b) {
      b = {
        id: `${r.id}:${part.actorId}:complete`,
        kind: r.kind,
        at: r.campaignId ? clock(s, r.campaignId).seconds : part.elapsedSeconds,
        applied: false,
        closed: false,
        results: [],
      };
      part.benefits.push(b);
      part.status = "completed";
      wake(s, r, part);
    }
    b.applied = true;
    b.closed = b.kind === "long";
    b.results = copy(p.rows.filter((row) => row.actorId === part.actorId));
    if (b.kind === "long") part.lastLongCompletedAt = b.at;
  }
  r.revision++;
  const longIds = parts
    .filter(
      (p) =>
        (input.benefitId ? p.benefits.find((b) => b.id === input.benefitId) : p.benefits.at(-1))
          ?.kind === "long",
    )
    .map((p) => p.actorId);
  // Conditions that last until a rest end once, for the creatures that completed it.
  for (const restKind of ["short", "long"]) {
    const actorIds = parts
      .filter(
        (p) =>
          (input.benefitId ? p.benefits.find((b) => b.id === input.benefitId) : p.benefits.at(-1))
            ?.kind === restKind,
      )
      .map((p) => p.actorId);
    if (actorIds.length)
      observeConditionTerms(s, {
        eventId: input.id + ":conditions-" + restKind,
        kind: "rest",
        restId: id,
        restKind,
        actorIds,
      });
  }
  if (longIds.length)
    observeFormsEvent(s, {
      eventId: input.id + ":forms-long",
      cause: "long-rest",
      restId: id,
      actorIds: longIds,
    });
  return event(s, input.id, "complete", payload, v, {
    restId: id,
    rows: p.rows,
    benefitIds: parts.map((p) => input.benefitId ?? p.benefits.at(-1).id),
  });
}
function windowFor(s, id, input, v) {
  const r = restFor(s, id),
    p = selected(s, r, { actorIds: [input.actorId] }, v)[0],
    b = p.benefits.find((b) => b.id === input.benefitId);
  if (
    !b?.applied ||
    b.kind !== "short" ||
    b.closed ||
    (inCombat(s, p.actorId) && !b.interruptionId)
  )
    fail(
      "window",
      "Il recupero di questo breve è concluso o non disponibile.",
      "This Short Rest’s recovery is closed or unavailable.",
    );
  return { r, p, b, a: s.actors[p.actorId] };
}
export function finishRestRecovery(s, id, input, v, options = {}) {
  const { r, p, b } = windowFor(s, id, input, v);
  online(options, commitFor(s, [p.actorId]));
  if (pendingRoll(s, p.actorId)) fail("pending");
  b.closed = true;
  r.revision++;
  return getRest(s, id, v);
}
export function beginHitDie(s, id, input, v, options = {}) {
  const existing = data(s).rolls.find((r) => r.id === input.id);
  if (existing) {
    actorFor(s, existing.actorId, v, true);
    selected(s, restFor(s, existing.restId), { actorIds: [existing.actorId] }, v);
    if (
      existing.restId !== id ||
      existing.actorId !== input.actorId ||
      existing.benefitId !== input.benefitId ||
      existing.die !== input.die ||
      existing.mode !== input.mode ||
      existing.status === "reversed"
    )
      fail("id-conflict");
    return copy(existing);
  }
  const { a, b } = windowFor(s, id, input, v);
  online(options, commitFor(s, [a.id]));
  const match = /^d(6|8|10|12)$/.exec(input.die),
    pool = a.hitDice?.[input.die],
    modifier = Number.isFinite(getEffectiveActor(a).abilities?.con)
      ? Math.floor((getEffectiveActor(a).abilities.con - 10) / 2)
      : null;
  if (
    !validId(input.id) ||
    !match ||
    !["physical", "digital"].includes(input.mode) ||
    !integer(pool?.used) ||
    !integer(pool?.max, 1) ||
    pool.used >= pool.max ||
    modifier === null ||
    !Number.isFinite(a.hp) ||
    !Number.isFinite(a.maxHp) ||
    a.hp >= a.maxHp ||
    a.dead ||
    blocked(s, a.id)
  )
    fail(
      "hit-die",
      "Registra PF, COS e Dadi Vita disponibili e risolvi le attese.",
      "Record HP, Constitution and available Hit Dice, then resolve pending consequences.",
    );
  pool.used++;
  const roll = {
    id: input.id,
    restId: id,
    campaignId: restFor(s, id).campaignId,
    benefitId: b.id,
    actorId: a.id,
    owner: a.owner,
    die: input.die,
    sides: Number(match[1]),
    mode: input.mode,
    modifier,
    status: "pending",
    acceptedFace: null,
    source: SHORT,
    result: null,
  };
  initializeRestTime(s).rolls.push(roll);
  return copy(roll);
}
export function resolveHitDie(s, id, { face } = {}, v, options = {}) {
  const roll = data(s).rolls.find((r) => r.id === id);
  if (!roll) fail();
  const a = actorFor(s, roll.actorId, v, true);
  online(options, commitFor(s, [a.id]));
  if (roll.status === "reversed" || !data(s).rests.some((r) => r.id === roll.restId))
    fail("reversed", "Questo tiro è stato annullato.", "This roll has been reversed.");
  selected(s, restFor(s, roll.restId), { actorIds: [roll.actorId] }, v);
  if (roll.acceptedFace !== null && roll.acceptedFace !== undefined) {
    if (face !== undefined && face !== roll.acceptedFace)
      fail(
        "immutable-face",
        "La faccia già accettata non può essere rilanciata.",
        "An accepted face cannot be rerolled.",
      );
    face = roll.acceptedFace;
  }
  if (!integer(face, 1) || face > roll.sides)
    fail("face", "Inserisci una faccia naturale valida.", "Enter a valid natural die face.");
  if (roll.status === "resolved") return copy(roll.result);
  if (!Number.isFinite(a.hp) || !Number.isFinite(a.maxHp) || a.dead || blocked(s, a.id, false))
    fail(
      "pending",
      "Risolvi i dati o le conseguenze prima di applicare la cura.",
      "Resolve data or consequences before applying healing.",
    );
  const rawTotal = face + roll.modifier,
    healing = Math.max(1, rawTotal);
  roll.acceptedFace = face;
  roll.status = "resolved";
  // Regaining HP is a vitality event, like any healing: it ends a melee knockout and
  // other causes bound to regaining HP (SRD EN 17 / IT 19) and records the change.
  const healed = applyVitalityEvent(s, {
    eventId: `${id}:healing`,
    actorId: a.id,
    kind: "healing",
    amount: healing,
    source: SHORT,
  });
  applyConditionFollowUps(s, healed);
  const { hpBefore: before, hpAfter: after } = healed.breakdown;
  roll.result = {
    rollId: id,
    face,
    modifier: roll.modifier,
    rawTotal,
    healing,
    applied: after - before,
    overflow: healing - (after - before),
    before,
    after,
  };
  return copy(roll.result);
}
export function previewQuickRecovery(s, id, input, v) {
  const errors = [];
  let ctx;
  try {
    ctx = windowFor(s, id, input, v);
  } catch {
    return base([issue("window", "Recupero non disponibile.", "Recovery unavailable.")], [], {
      nextDie: null,
      stopReason: "closed",
    });
  }
  const { a, b } = ctx,
    used = data(s).rolls.filter((r) => r.benefitId === b.id && r.status !== "reversed").length;
  if (
    !integer(input.maxDice, 1) ||
    !Array.isArray(input.diceOrder) ||
    !input.diceOrder.length ||
    new Set(input.diceOrder).size !== input.diceOrder.length
  )
    errors.push(
      issue(
        "quick-input",
        "Scegli ordine dei dadi e massimo totale.",
        "Choose dice order and total maximum.",
      ),
    );
  let nextDie =
    (input.diceOrder ?? []).find(
      (die) => integer(a.hitDice?.[die]?.used) && a.hitDice[die].used < a.hitDice[die].max,
    ) ?? null;
  const modifier = Number.isFinite(getEffectiveActor(a).abilities?.con)
    ? Math.floor((getEffectiveActor(a).abilities.con - 10) / 2)
    : null;
  const sides = Number(nextDie?.slice(1)),
    average =
      nextDie && modifier !== null
        ? Array.from({ length: sides }, (_, i) => Math.max(1, i + 1 + modifier)).reduce(
            (x, y) => x + y,
            0,
          ) / sides
        : null;
  let stopReason = errors.length
    ? "input"
    : used >= input.maxDice
      ? "cap"
      : blocked(s, a.id)
        ? "pending"
        : !Number.isFinite(a.hp) || !Number.isFinite(a.maxHp) || modifier === null
          ? "unknown"
          : a.hp >= a.maxHp
            ? "full"
            : !nextDie
              ? "no-dice"
              : a.maxHp - a.hp < average
                ? "below-average"
                : null;
  if (stopReason) nextDie = null;
  return base(errors, [], {
    nextDie,
    stopReason,
    average,
    spentDice: used,
    remainingCap: Math.max(0, input.maxDice - used),
    commit: commitForRest(s, ctx.r, [a.id]),
  });
}
export function previewArcaneRecovery(s, id, input, v) {
  const errors = [],
    rows = [];
  let ctx;
  try {
    ctx = windowFor(s, id, input, v);
  } catch {
    return base([issue("window", "Recupero non disponibile.", "Recovery unavailable.")], [], {
      rows,
      reviewKey: "",
      commit: { local: true, visibility: "private" },
    });
  }
  const { a, b } = ctx,
    arc = arcaneFor(a);
  if (
    !hasSource(arc?.source) ||
    !integer(arc.wizardLevel, 1) ||
    arc.wizardLevel > 20 ||
    !integer(arc.max, 1) ||
    arc.used !== 0
  )
    errors.push(
      issue(
        "arcane",
        "Recupero Arcano non disponibile o da verificare.",
        "Arcane Recovery is unavailable or unverified.",
      ),
    );
  let total = 0;
  if (!object(input.slots) || !Object.keys(input.slots).length)
    errors.push(issue("slots", "Scegli gli slot da recuperare.", "Choose slots to recover."));
  else
    for (const [key, count] of Object.entries(input.slots)) {
      const level = Number(key),
        pool = a.spellSlots?.[key] ?? (key === "1" ? a.slots : null);
      if (
        !integer(level, 1) ||
        level > 5 ||
        !integer(count, 1) ||
        !integer(pool?.used) ||
        count > pool.used ||
        !integer(pool.max, 1)
      )
        errors.push(issue("slots", "Scelta di slot non valida.", "Invalid slot selection."));
      else {
        total += level * count;
        rows.push({
          actorId: a.id,
          path: `spellSlots.${key}.used`,
          before: pool.used,
          after: pool.used - count,
          source: copy(arc?.source ?? SHORT),
          reason: "arcane-recovery",
        });
      }
    }
  if (total > Math.ceil((arc?.wizardLevel ?? 0) / 2))
    errors.push(
      issue(
        "arcane-budget",
        "La somma dei livelli supera il limite.",
        "The sum of slot levels exceeds the limit.",
      ),
    );
  if (blocked(s, a.id))
    errors.push(
      issue(
        "pending",
        "Risolvi prima le conseguenze pendenti.",
        "Resolve pending consequences first.",
      ),
    );
  return base(errors, [], {
    rows,
    commit: commitForRest(s, ctx.r, [a.id]),
    reviewKey: review(
      s,
      { restId: id, actorId: a.id, benefitId: b.id, slots: input.slots },
      [a.id],
      { benefit: b },
    ),
  });
}
export function applyArcaneRecovery(s, id, input, v, options = {}) {
  actorFor(s, input.actorId, v, true);
  selected(s, restFor(s, id), { actorIds: [input.actorId] }, v);
  const payload = {
      restId: id,
      actorId: input.actorId,
      benefitId: input.benefitId,
      slots: input.slots,
    },
    old = retry(s, input.id, "arcane", payload, v);
  if (old) return old;
  const p = previewArcaneRecovery(s, id, input, v);
  validatePreview(p, options);
  for (const row of p.rows) setRow(s.actors[row.actorId], row);
  setRow(s.actors[input.actorId], { path: arcaneFor(s.actors[input.actorId]).path, after: 1 });
  return event(s, input.id, "arcane", payload, v, {
    restId: id,
    actorId: input.actorId,
    rows: p.rows,
  });
}
export function previewRestCorrection(s, input, v) {
  const errors = [],
    rows = [];
  let a;
  try {
    a = actorFor(s, input.actorId, v, true);
    const r = restFor(s, input.restId);
    selected(s, r, { actorIds: [a.id] }, v);
  } catch {
    return base(
      [issue("unavailable", "Correzione non disponibile.", "Correction unavailable.")],
      [],
      { rows, reviewKey: "", commit: { local: true, visibility: "private" } },
    );
  }
  if (typeof input.reason !== "string" || !input.reason.trim())
    errors.push(
      issue("reason", "Indica il motivo della correzione.", "Give a reason for the correction."),
    );
  const add = (path, before, after) =>
    rows.push({
      actorId: a.id,
      path,
      before: copy(before ?? null),
      after,
      source: { kind: "authored", revision: "explicit-correction" },
      reason: input.reason,
    });
  if (!object(input.patch) || !Object.keys(input.patch).length)
    errors.push(issue("patch", "Scegli una correzione.", "Choose a correction."));
  else
    for (const [key, value] of Object.entries(input.patch)) {
      // 0 HP and Exhaustion carry vitality consequences (Unconscious, death saves, death
      // at level 6): only the conditions panel changes them, with their own events.
      if (key === "exhaustion")
        errors.push(
          issue(
            "vitality",
            "L’Indebolimento si corregge da Condizioni e stato, che ne registra l’evento.",
            "Exhaustion is corrected from Conditions and status, which records its event.",
          ),
        );
      else if (key === "hp" && integer(value) && (value === 0 || a.hp === 0))
        errors.push(
          issue(
            "vitality",
            "Da o verso 0 PF usa Condizioni e stato: cambia coscienza e tiri contro la morte.",
            "To or from 0 HP use Conditions and status: it changes consciousness and death saves.",
          ),
        );
      else if (
        ["hp", "tempHp"].includes(key) &&
        integer(value) &&
        (!(key === "hp") || (Number.isFinite(a.maxHp) && value <= a.maxHp))
      )
        add(key, a[key], value);
      else if (["hitDice", "spellSlots"].includes(key) && object(value)) {
        for (const [poolId, patch] of Object.entries(value)) {
          const pool =
            a[key]?.[poolId] ?? (key === "spellSlots" && poolId === "1" ? a.slots : null);
          if (
            !pool ||
            !object(patch) ||
            Object.keys(patch).some((k) => k !== "used") ||
            !integer(patch.used)
          )
            errors.push(issue("patch", "Contatore non valido.", "Invalid counter."));
          else add(`${key}.${poolId}.used`, pool.used, patch.used);
        }
      } else if (
        key === "pactSlots" &&
        a.pactSlots &&
        object(value) &&
        Object.keys(value).length === 1 &&
        integer(value.used)
      )
        add("pactSlots.used", a.pactSlots.used, value.used);
      else
        errors.push(
          issue(
            "patch",
            "Questa proprietà non è correggibile qui.",
            "This property cannot be corrected here.",
          ),
        );
    }
  if (blocked(s, a.id))
    errors.push(
      issue(
        "pending",
        "Risolvi la richiesta pendente prima della correzione.",
        "Resolve the pending request before correcting.",
      ),
    );
  return base(errors, [], {
    rows,
    commit: commitForRest(s, restFor(s, input.restId), [a.id]),
    reviewKey: review(
      s,
      { restId: input.restId, actorId: a.id, patch: input.patch, reason: input.reason },
      [a.id],
      null,
    ),
  });
}
export function correctRestResult(s, input, v, options = {}) {
  actorFor(s, input.actorId, v, true);
  selected(s, restFor(s, input.restId), { actorIds: [input.actorId] }, v);
  const payload = {
      restId: input.restId,
      actorId: input.actorId,
      patch: input.patch,
      reason: input.reason,
    },
    old = retry(s, input.id, "correction", payload, v);
  if (old) return old;
  const p = previewRestCorrection(s, input, v);
  validatePreview(p, options);
  for (const row of p.rows) setRow(s.actors[row.actorId], row);
  return event(s, input.id, "correction", payload, v, {
    restId: input.restId,
    actorId: input.actorId,
    rows: p.rows,
    reason: input.reason,
  });
}

// Trusted seam for the 2024 melee knockout: the creature starts its own Short Rest with
// the deterministic id carried by its Unconscious cause (SRD EN 17 / IT 19). Combat has
// already interrupted any earlier rest with the same damage; retries are idempotent.
export function startKnockoutRest(s, { actorId, restId, clockId }) {
  const a = s.actors?.[actorId];
  if (!a || !validId(restId)) fail("event");
  if (data(s).rests.some((r) => r.id === restId)) return getRestRecord(s, restId);
  const campaignId =
    typeof clockId === "string" && clockId.startsWith("personal:")
      ? null
      : (clockId ?? s.campaign?.id ?? null);
  const r = {
    id: restId,
    kind: "short",
    campaignId,
    owner: a.owner,
    cause: "knockout",
    inputKey: campaignReviewKey({ knockout: restId, actorId }),
    revision: 1,
    participants: [
      {
        actorId,
        status: "resting",
        elapsedSeconds: 0,
        sleepSeconds: 0,
        tranceSeconds: 0,
        lightSeconds: 0,
        requiredSeconds: HOUR,
        sleepRequiredSeconds: 0,
        tranceRequiredSeconds: 0,
        activity: "light",
        interruptions: [],
        benefits: [],
      },
    ],
  };
  initializeRestTime(s).rests.push(r);
  closeWindows(s, actorId);
  return getRestRecord(s, restId);
}
const getRestRecord = (s, id) => copy(restFor(s, id));
// Trusted integration seam: callers supply facts already authorized/applied by combat,
// never an event from a UI preview. It does not borrow another controller's identity.
export function observeRestEvent(s, { eventId, actorIds, cause }) {
  if (
    !validId(eventId) ||
    !Array.isArray(actorIds) ||
    !actorIds.every((id) => s.actors[id]) ||
    !["initiative", "damage", "leveled-spell", "exertion", "activity", "movement"].includes(cause)
  )
    fail("event");
  const payload = { actorIds: [...new Set(actorIds)].sort(), cause },
    old = retry(s, eventId, "observed", payload, "system");
  if (old) return old;
  for (const id of payload.actorIds) closeWindows(s, id);
  if (!["activity", "movement"].includes(cause))
    for (const r of data(s).rests) {
      const parts = r.participants.filter((p) => payload.actorIds.includes(p.actorId));
      if (parts.length) interrupt(s, r, parts, eventId, cause);
    }
  return event(s, eventId, "observed", payload, "system", { actorIds: payload.actorIds, cause });
}
// Root calls this exactly at an actual round boundary; six seconds is per round.
export function advanceRoundTime(s, { eventId, round }, options = {}) {
  if (!s.combat?.active || !integer(round, 1) || round !== s.combat.round || !s.campaign?.id)
    fail("round");
  online(options, { local: false });
  const payload = { campaignId: s.campaign.id, round },
    old = retry(s, eventId, "round-time", payload, "system");
  if (old) return old;
  const affected = data(s)
    .rests.filter((r) => r.campaignId === s.campaign.id)
    .flatMap((r) =>
      r.participants
        .filter((p) => p.status === "resting" || p.benefits.some((b) => b.applied && !b.closed))
        .map((p) => p.actorId),
    );
  if (affected.some((id) => blocked(s, id)))
    fail(
      "pending",
      "Una conseguenza temporale pertinente è ancora in attesa.",
      "A relevant time-dependent consequence is pending.",
    );
  const personalClockIds = new Set();
  for (const actorId of s.combat.order) {
    const a = s.actors[actorId];
    if (a?.activeForm?.clockId?.startsWith("personal:")) personalClockIds.add(a.activeForm.clockId);
    for (const c of s.formsCompanions?.castings ?? [])
      if (c.actorId === actorId && c.campaignId === null && c.status === "casting")
        personalClockIds.add("personal:" + actorId);
  }
  for (const id of personalClockIds) {
    const c = (initializeRestTime(s).clocks[id] ??= { seconds: 0, revision: 0 });
    c.seconds += 6;
    c.revision++;
    observeConditionTerms(s, {
      eventId: "clock:" + id + ":" + c.revision + ":conditions",
      kind: "clock",
      clockId: id,
    });
  }
  return event(s, eventId, "round-time", payload, "system", advance(s, s.campaign.id, 6));
}
