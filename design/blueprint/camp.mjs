// B45 — Camp: watch shifts over the existing Long Rest engine (increment 8, rest-time.mjs).
//
// Adopted patterns (census IDs): Pathfinder WotR camp roles, Night Watch with Perception
// and a watch result that decides readiness (CRP-155); Fantasy Grounds Party Sheet
// numbered watch order (R20-080); BG3 camp as the place of the Long Rest (CRP-156).
// Rules (SRD 5.2.1): a Long Rest is at least 8 hours, 6 of sleep and no more than 2 of
// light activity such as standing watch; rolling Initiative interrupts it; resuming adds
// 1 hour per interruption (EN 185, IT 213). The camp never rolls or interrupts by itself:
// the DM asks the watchers' Perception checks and decides the outcome (F-055).

import * as D from "./travel-domain.mjs";
import * as R from "./rest-time.mjs";

const L = (it, en) => ({ it, en });
export const SHIFT_SECONDS = 2 * D.HOUR;
export const NIGHT_SECONDS = D.SHIFTS * SHIFT_SECONDS;
export const MAX_WATCH_SECONDS = 2 * D.HOUR; // light activity allowed in a Long Rest

const requireDm = (state, role) => {
  if (!D.isDm(state, role)) throw D.fail("Solo il DM può farlo.", "Only the DM can do this.");
};
const campaign = (state, slice) => D.ensureCampaign(slice, D.campaignIdOf(state));

export const watchSeconds = (shifts, actorId) =>
  shifts.filter((shift) => shift.includes(actorId)).length * SHIFT_SECONDS;
/** Plan warnings: more than 2 hours of watch for someone, or a shift nobody keeps. */
export function watchWarnings(state, shifts, participants = D.memberIds(state)) {
  const out = [];
  for (const actorId of participants) {
    const seconds = watchSeconds(shifts, actorId);
    if (seconds > MAX_WATCH_SECONDS)
      out.push({
        kind: "over",
        actorId,
        text: L(
          `${state.actors[actorId]?.name}: ${seconds / D.HOUR} ore di guardia. Il riposo lungo consente al massimo 2 ore di attività leggera: non potrà concluderlo.`,
          `${state.actors[actorId]?.name}: ${seconds / D.HOUR} hours of watch. A Long Rest allows at most 2 hours of light activity: they will not finish it.`,
        ),
        source: D.SOURCES.longRest,
      });
  }
  shifts.forEach((shift, i) => {
    if (!shift.some((id) => participants.includes(id)))
      out.push({
        kind: "uncovered",
        shift: i,
        text: L(
          `Turno ${i + 1} scoperto: nessuno di guardia.`,
          `Shift ${i + 1} uncovered: nobody on watch.`,
        ),
        source: null,
      });
  });
  return out;
}
/** First shift of the plan still editable (every one before the camp, the future during it). */
export const firstEditableShift = (c) =>
  c?.camp && ["active", "interrupted"].includes(c.camp.status) ? c.camp.shift + 1 : 0;
/** A character joins or leaves a shift; players for their own characters, the DM for all. */
export function setWatch(state, slice, { shift, actorId, on }, role) {
  const c = campaign(state, slice);
  if (!Number.isInteger(shift) || shift < 0 || shift >= D.SHIFTS)
    throw D.fail("Turno non valido.", "Invalid shift.");
  if (shift < firstEditableShift(c))
    throw D.fail("Quel turno è già iniziato.", "That shift has already started.");
  const actor = state.actors?.[actorId];
  if (!actor || !D.memberIds(state).includes(actorId))
    throw D.fail("Scegli un personaggio del gruppo.", "Choose a party character.");
  if (!D.isDm(state, role) && actor.owner !== role)
    throw D.fail(
      "Puoi mettere di guardia solo i tuoi personaggi.",
      "You can only put your own characters on watch.",
    );
  const list = c.watch.shifts[shift];
  const has = list.includes(actorId);
  if (on && !has) {
    if (list.length >= 4)
      throw D.fail("Al massimo 4 sentinelle per turno.", "At most 4 watchers per shift.");
    list.push(actorId);
  }
  if (!on && has) list.splice(list.indexOf(actorId), 1);
  return c.watch.shifts;
}
/** FG watch order: one watcher per shift following the marching order, 2 hours each. */
export function rotateWatch(state, slice, role) {
  requireDm(state, role);
  const c = campaign(state, slice);
  const from = firstEditableShift(c);
  const order = [...D.formationMembers(c.formation), ...D.unplaced(state, c.formation)];
  const shifts = c.watch.shifts.map((shift, i) => (i < from ? shift : []));
  let next = 0;
  for (let i = from; i < D.SHIFTS; i++) {
    for (let tries = 0; tries < order.length; tries++) {
      const actorId = order[next % order.length];
      next++;
      if (watchSeconds(shifts, actorId) + SHIFT_SECONDS <= MAX_WATCH_SECONDS) {
        shifts[i].push(actorId);
        break;
      }
    }
  }
  c.watch.shifts = shifts;
  return shifts;
}
const activityFor = (c, shift, actorId) =>
  (c.watch.shifts[shift] ?? []).includes(actorId) ? "light" : "sleep";
export const campRest = (state, camp) =>
  camp ? ((state.restTime?.rests ?? []).find((r) => r.id === camp.restId) ?? null) : null;
const participantsIn = (state, camp, statuses) =>
  (campRest(state, camp)?.participants ?? [])
    .filter((p) => statuses.includes(p.status))
    .map((p) => p.actorId);
/** Actors of the camp whose Long Rest is interrupted now (by the camp or by the Table). */
export const interruptedIn = (state, camp) => participantsIn(state, camp, ["interrupted"]);
/**
 * The camp as the rest engine sees it. Initiative rolled from the Table or damage also
 * interrupt the rests (increment 8): when nobody rests any more, the camp is interrupted
 * even if the camp itself did not decide it.
 */
export function campStatus(state, camp) {
  if (!camp) return null;
  if (camp.status !== "active") return camp.status;
  return !participantsIn(state, camp, ["resting"]).length && interruptedIn(state, camp).length
    ? "interrupted"
    : "active";
}
function requireResting(state, camp) {
  if (state.combat?.active)
    throw D.fail("Prima termina il combattimento.", "End the combat first.");
  if (!participantsIn(state, camp, ["resting"]).length)
    throw D.fail(
      "Nessuno sta riposando: riprendi il riposo o leva il campo.",
      "Nobody is resting: resume the rest or strike camp.",
    );
}
// TV-133 (Pathfinder WotR: the party camps at dusk): the next time the shared clock shows
// "HH:MM" (today if still ahead, else tomorrow). The watch plan starts there.
export const DEFAULT_CAMP_TIME = "20:00";
export function nextCampStart(state, hhmm = DEFAULT_CAMP_TIME) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
  const clock = D.clockSeconds(state, D.campaignIdOf(state));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return clock;
  const at = D.now(state, D.campaignIdOf(state), clock);
  const today = at.hour * D.HOUR + at.minute * 60 + (clock % 60);
  let delta = Number(match[1]) * D.HOUR + Number(match[2]) * 60 - today;
  if (delta < 0) delta += 24 * D.HOUR;
  return clock + delta;
}
/** BG3: the party camps. A Long Rest starts in the rest engine, watchers awake. */
export function startCamp(
  state,
  slice,
  { id, actorIds, startAt = null },
  role,
  { online = true } = {},
) {
  requireDm(state, role);
  const cid = D.campaignIdOf(state);
  const c = campaign(state, slice);
  if (c.camp && ["active", "interrupted"].includes(c.camp.status))
    throw D.fail("L’accampamento è già montato.", "The camp is already set up.");
  if (state.combat?.active)
    throw D.fail("Non ci si accampa durante un combattimento.", "No camping during combat.");
  const ids = D.memberIds(state);
  if (!Array.isArray(actorIds) || !actorIds.length || actorIds.some((a) => !ids.includes(a)))
    throw D.fail("Scegli chi riposa all’accampamento.", "Choose who rests at the camp.");
  // The camp's hour: the time until then passes first (WotR: the party camps at dusk).
  const clock = D.clockSeconds(state, cid);
  if (startAt !== null && startAt !== undefined) {
    if (!Number.isInteger(startAt) || startAt < clock || startAt - clock > 24 * D.HOUR)
      throw D.fail("Ora del campo non valida.", "Invalid camp time.");
    if (startAt > clock)
      R.advanceGameTime(
        state,
        { id: `camp:start:${id}`, campaignId: cid, seconds: startAt - clock },
        role,
        { online },
      );
  }
  const restId = `camp-${id}`;
  R.startRest(
    state,
    {
      id: restId,
      kind: "long",
      actorIds,
      campaignId: cid,
      activityByActor: Object.fromEntries(actorIds.map((a) => [a, activityFor(c, 0, a)])),
    },
    role,
    { online },
  );
  if (c.camp) c.campHistory = [...(c.campHistory ?? []), c.camp].slice(-10);
  c.camp = {
    id,
    restId,
    actorIds: [...actorIds],
    shift: 0,
    status: "active",
    startedAt: D.clockSeconds(state, cid),
    extraSeconds: 0,
    events: [],
  };
  return c.camp;
}
const openEvent = (camp) => camp.events.find((e) => e.status === "open") ?? null;
function applyShiftActivities(state, c, role, online) {
  const camp = c.camp;
  if (camp.shift >= D.SHIFTS) return;
  const rest = campRest(state, camp);
  for (const p of rest?.participants ?? []) {
    if (p.status !== "resting") continue;
    const next = activityFor(c, camp.shift, p.actorId);
    if (p.activity !== next)
      R.setRestActivity(state, camp.restId, { actorId: p.actorId, activity: next }, role, {
        online,
      });
  }
}
/** DM: the shift ends; the clock advances 2 hours and the next watchers wake. */
export function nextShift(state, slice, { id }, role, { online = true } = {}) {
  requireDm(state, role);
  const cid = D.campaignIdOf(state);
  const c = campaign(state, slice);
  const camp = c.camp;
  if (camp?.status !== "active")
    throw D.fail("Nessun accampamento in riposo.", "No camp resting now.");
  if (camp.shift >= D.SHIFTS)
    throw D.fail("La notte è finita: concludi il riposo.", "The night is over: finish the rest.");
  if (openEvent(camp))
    throw D.fail("Decidi prima l’evento del turno.", "Decide the shift’s event first.");
  requireResting(state, camp);
  R.advanceGameTime(state, { id: `camp:${id}`, campaignId: cid, seconds: SHIFT_SECONDS }, role, {
    online,
  });
  camp.shift += 1;
  applyShiftActivities(state, c, role, online);
  return camp;
}
/** Time still needed by the resting participants (1 hour more per interruption). */
export function remainingSeconds(state, camp) {
  const rest = campRest(state, camp);
  return Math.max(
    0,
    ...(rest?.participants ?? [])
      .filter((p) => p.status === "resting")
      .map((p) => p.requiredSeconds - p.elapsedSeconds),
  );
}
/** DM: after the four shifts, the extra hour an interrupted rest requires. */
export function extraHour(state, slice, { id }, role, { online = true } = {}) {
  requireDm(state, role);
  const cid = D.campaignIdOf(state);
  const camp = campaign(state, slice).camp;
  if (camp?.status !== "active" || camp.shift < D.SHIFTS)
    throw D.fail("Prima finiscono i turni della notte.", "The night’s shifts come first.");
  requireResting(state, camp);
  const need = remainingSeconds(state, camp);
  if (!need) throw D.fail("Il riposo non richiede altro tempo.", "The rest needs no more time.");
  const seconds = Math.min(need, D.HOUR);
  R.advanceGameTime(state, { id: `camp:${id}`, campaignId: cid, seconds }, role, { online });
  camp.extraSeconds += seconds;
  return camp;
}
// Authored demo camp events (d6); the DC is what the watchers must beat to notice.
export const CAMP_TABLE = Object.freeze({
  sides: 6,
  source: D.AUTHORED.camp,
  rows: [
    {
      faces: [1, 2],
      text: L("Solo il crepitio del fuoco.", "Only the crackle of the fire."),
      dc: null,
    },
    {
      faces: [3],
      text: L(
        "Passi leggeri tra le rocce: un gufo, o forse no.",
        "Light steps among the rocks: an owl, or maybe not.",
      ),
      dc: 10,
    },
    {
      faces: [4],
      text: L(
        "Un lupo attirato dall’odore delle razioni.",
        "A wolf drawn by the smell of the rations.",
      ),
      dc: 12,
    },
    {
      faces: [5],
      text: L(
        "Due goblin esploratori strisciano verso il campo.",
        "Two goblin scouts creep toward the camp.",
      ),
      dc: 13,
    },
    {
      faces: [6],
      text: L(
        "La lanterna sulla torre si riaccende da sola.",
        "The lantern on the tower lights up by itself.",
      ),
      dc: 8,
    },
  ],
});
export const campRow = (face) => CAMP_TABLE.rows.find((r) => r.faces.includes(face)) ?? null;
/**
 * DM: something happens during the current shift. Its watchers get a Wisdom (Perception)
 * check against the DC (Advantage/Disadvantage only from stated reasons). Nothing is
 * rolled or interrupted automatically.
 */
export function campEvent(state, slice, rolls, input, role, rng) {
  requireDm(state, role);
  const cid = D.campaignIdOf(state);
  const c = campaign(state, slice);
  const camp = c.camp;
  if (camp?.status !== "active" || camp.shift >= D.SHIFTS)
    throw D.fail(
      "L’evento avviene durante un turno di guardia.",
      "The event happens during a watch shift.",
    );
  if (openEvent(camp))
    throw D.fail("Decidi prima l’evento aperto.", "Decide the open event first.");
  requireResting(state, camp);
  let text = String(input.text ?? "")
    .trim()
    .slice(0, 200);
  let dc = input.dc === "" || input.dc === null || input.dc === undefined ? null : Number(input.dc);
  let rollId = null,
    face = null,
    roll = null;
  if (input.draw) {
    roll = D.acceptTableRoll(rolls, slice, {
      key: `camp:${camp.id}:${camp.shift}:${camp.events.length}`,
      sides: CAMP_TABLE.sides,
      mode: input.draw.mode,
      faces: input.draw.faces,
      rng,
      label: L("Evento dell’accampamento", "Camp event"),
      role,
    });
    const r = campRow(roll.values[0]);
    text = D.pick(r.text, input.lang ?? "it");
    dc = r.dc;
    rollId = roll.id;
    face = roll.values[0];
  }
  if (!text) throw D.fail("Descrivi che cosa succede.", "Describe what happens.");
  if (dc !== null && !(Number.isInteger(dc) && dc >= 1 && dc <= 30))
    throw D.fail("La CD va da 1 a 30.", "The DC ranges from 1 to 30.");
  const at = D.clockSeconds(state, cid);
  const watchers = (c.watch.shifts[camp.shift] ?? []).filter((id) =>
    participantsIn(state, camp, ["resting"]).includes(id),
  );
  const reasons = input.weather
    ? [
        {
          mode: "disadvantage",
          label: L("Meteo: visibilità ridotta", "Weather: reduced visibility"),
          source: D.SOURCES.environment,
        },
      ]
    : [];
  const event = {
    id: input.id,
    shift: camp.shift,
    text,
    dc,
    rollId,
    face,
    checkIds: [],
    status: "open",
    outcome: null,
    at,
  };
  if (dc !== null)
    for (const actorId of watchers) {
      const check = D.newCheck(
        {
          id: D.newId("check"),
          kind: "watch",
          actorId,
          ability: "wis",
          skill: "perception",
          dc,
          reasons,
          context: { campId: camp.id, eventId: event.id, shift: camp.shift },
        },
        role,
        at,
      );
      c.checks.push(check);
      event.checkIds.push(check.id);
    }
  camp.events.push(event);
  return { event, roll };
}
/**
 * TV-133 — the watch of the current shift (FG watch order, WotR night watch): an optional
 * encounter roll on the camp table, then the watchers' Wisdom (Perception), passive or
 * rolled. Something to notice opens the usual event (the DM decides what follows); a quiet
 * shift is logged at once with each watcher's passive Perception.
 */
export function checkWatch(state, slice, rolls, input, role, rng) {
  requireDm(state, role);
  const cid = D.campaignIdOf(state);
  const c = campaign(state, slice);
  const camp = c.camp;
  if (camp?.status !== "active" || camp.shift >= D.SHIFTS)
    throw D.fail(
      "La guardia si controlla durante un turno.",
      "The watch is checked during a shift.",
    );
  if (openEvent(camp))
    throw D.fail("Decidi prima l’evento aperto.", "Decide the open event first.");
  if (camp.events.some((e) => e.watch && e.shift === camp.shift))
    throw D.fail("Questo turno è già stato controllato.", "This shift was already checked.");
  requireResting(state, camp);
  let roll = null,
    row = null;
  if (input.encounter !== false) {
    roll = D.acceptTableRoll(rolls, slice, {
      key: `camp:${camp.id}:${camp.shift}:watch`,
      sides: CAMP_TABLE.sides,
      mode: input.mode === "physical" ? "physical" : "digital",
      faces: input.faces,
      rng,
      label: L("Guardia: incontro", "Watch: encounter"),
      role,
    });
    row = campRow(roll.values[0]);
  }
  if (row && row.dc !== null) {
    const { event } = campEvent(
      state,
      slice,
      rolls,
      {
        id: input.id,
        text: D.pick(row.text, input.lang ?? "it"),
        dc: row.dc,
        weather: input.weather,
      },
      role,
      rng,
    );
    Object.assign(event, { rollId: roll.id, face: roll.values[0], watch: true });
    if (input.passive !== false)
      for (const checkId of event.checkIds) D.usePassive(state, slice, { checkId }, role);
    return event;
  }
  const watchers = (c.watch.shifts[camp.shift] ?? []).filter((actorId) =>
    participantsIn(state, camp, ["resting"]).includes(actorId),
  );
  const event = {
    id: input.id,
    shift: camp.shift,
    text: row
      ? D.pick(row.text, input.lang ?? "it")
      : D.pick(L("Turno tranquillo.", "A quiet shift."), input.lang ?? "it"),
    dc: null,
    rollId: roll?.id ?? null,
    face: roll ? roll.values[0] : null,
    checkIds: [],
    status: "closed",
    outcome: "calm",
    watch: true,
    passives: watchers.map((actorId) => ({
      actorId,
      score: D.passiveScore(state.actors[actorId], { ability: "wis", skill: "perception" }),
    })),
    at: D.clockSeconds(state, cid),
  };
  camp.events.push(event);
  return event;
}
/** Who noticed: every watcher's result (passive or rolled) against the DC. */
export function eventNotice(c, event) {
  const checks = event.checkIds.map((id) => c.checks.find((x) => x.id === id)).filter(Boolean);
  return {
    checks,
    pending: checks.filter((x) => x.status === "pending").length,
    noticed: checks.filter((x) => x.success === true).map((x) => x.actorId),
  };
}
/** DM: calm (the rest continues) or Initiative, which interrupts the Long Rest (SRD). */
export function decideCampEvent(state, slice, { eventId, outcome }, role, { online = true } = {}) {
  requireDm(state, role);
  const c = campaign(state, slice);
  const camp = c.camp;
  const event = camp?.events.find((e) => e.id === eventId);
  if (!event || event.status !== "open")
    throw D.fail("L’evento non è più aperto.", "The event is no longer open.");
  if (!["calm", "initiative"].includes(outcome))
    throw D.fail("Esito non valido.", "Invalid outcome.");
  event.status = "closed";
  event.outcome = outcome;
  if (outcome === "initiative") {
    const actorIds = participantsIn(state, camp, ["resting"]);
    if (actorIds.length)
      R.interruptRest(
        state,
        camp.restId,
        { eventId: `camp-${eventId}`, actorIds, cause: "initiative" },
        role,
        { online },
      );
    camp.status = "interrupted";
  }
  return event;
}
/**
 * DM: whoever was interrupted goes back to rest (by the camp's Initiative, or by combat or
 * damage at the Table); each interruption adds 1 hour (SRD).
 */
export function resumeCamp(state, slice, role, { online = true } = {}) {
  requireDm(state, role);
  const c = campaign(state, slice);
  const camp = c.camp;
  const actorIds =
    camp && ["active", "interrupted"].includes(camp.status) ? interruptedIn(state, camp) : [];
  if (camp?.status !== "interrupted" && !actorIds.length)
    throw D.fail("Il riposo non è interrotto.", "The rest is not interrupted.");
  if (state.combat?.active)
    throw D.fail("Prima termina il combattimento.", "End the combat first.");
  if (actorIds.length) R.resumeRest(state, camp.restId, { actorIds }, role, { online });
  camp.status = "active";
  applyShiftActivities(state, c, role, online);
  return camp;
}
/** DM: the Long Rest ends through the rest engine (deterministic recoveries only). */
export function finishCamp(state, slice, { id }, role, { online = true } = {}) {
  requireDm(state, role);
  const c = campaign(state, slice);
  const camp = c.camp;
  if (camp?.status !== "active") throw D.fail("Nessun riposo da concludere.", "No rest to finish.");
  if (openEvent(camp))
    throw D.fail("Decidi prima l’evento aperto.", "Decide the open event first.");
  requireResting(state, camp);
  if (interruptedIn(state, camp).length)
    throw D.fail(
      "Qualcuno ha il riposo interrotto: riprendilo prima di concludere, o leva il campo.",
      "Someone’s rest is interrupted: resume it before finishing, or strike camp.",
    );
  const actorIds = participantsIn(state, camp, ["resting"]);
  const preview = R.previewRestCompletion(state, camp.restId, { actorIds }, role);
  if (!preview.canApply) {
    const e = preview.errors[0];
    throw D.fail(e.it, e.en);
  }
  R.completeRest(state, camp.restId, { id: `camp-end-${id}`, actorIds }, role, { online });
  camp.status = "done";
  camp.endedAt = D.clockSeconds(state, D.campaignIdOf(state));
  return camp;
}
/** DM: the camp is struck before the rest ends (the rest is stopped with a reason). */
export function breakCamp(state, slice, { reason }, role, { online = true } = {}) {
  requireDm(state, role);
  const c = campaign(state, slice);
  const camp = c.camp;
  if (!camp || !["active", "interrupted"].includes(camp.status))
    throw D.fail("Nessun accampamento montato.", "No camp is set up.");
  const why = String(reason ?? "")
    .trim()
    .slice(0, 200);
  if (!why) throw D.fail("Scrivi il motivo.", "Write the reason.");
  const actorIds = participantsIn(state, camp, ["resting", "interrupted"]);
  if (actorIds.length)
    R.cancelRest(state, camp.restId, { actorIds, reason: why }, role, { online });
  camp.status = "broken";
  camp.reason = why;
  return camp;
}
/** Shift times on the clock (a shift starts 2 hours after the previous one). */
export function shiftStart(camp, shift) {
  return camp.startedAt + shift * SHIFT_SECONDS;
}
