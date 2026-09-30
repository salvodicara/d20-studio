// B34 — DM roll requests: pure domain on top of the existing request queue.
//
// The DM asks one or more creatures for a check or a saving throw (optionally against a
// DC), or two creatures for opposed checks. Each target becomes one attempt of kind
// "roll-request" in state.combatAttempts (combat.mjs enqueueRollRequest), so it shows in
// the bell, the "Rolls and results" dialog and the Table's dice tray alike, and whoever
// controls the creature answers with physical or digital dice through combat.mjs
// resolveRoll. The card sums up successes and failures; nothing is applied automatically.
//
// Patterns: dnd5e roll request enrichers `[[/save dex 15]]` with the request option
// (FVT-146); Monk's TokenBar request dialog, totals of successes and contested rolls
// (FVT-147); Fantasy Grounds party-sheet group rolls against a DC (R20-078); AboveVTT
// quick rolls for saves (VTL-164). Rules: SRD 5.2.1 "D20 Tests", "Ability Checks",
// "Saving Throws" (EN 6–7 / IT 6–7). SRD 5.2.1 has no general Contest rule: the opposed
// comparison is an authored aid and the DM decides (dice-tray-domain AUTHORED.contest).

import { enqueueRollRequest, resolveRoll, requestScore } from "./combat.mjs";
import { canControlActor, canViewActor, isActorAvailable } from "./character-access.mjs";
import {
  ABILITIES,
  SKILLS,
  AUTHORED,
  SOURCES,
  fail,
  testModifier,
  testTitle,
  hasInspiration,
  digitalFaces,
  stackTotal,
  conditionTest,
  combineModes,
  reasonNames,
  dcVisibleTo,
  runsSessionFor,
} from "./dice-tray-domain.mjs";
import { disguises, maskNames } from "./conditions.mjs";

const text = (it, en) => ({ it, en });
const copy = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
export const REQUEST_KINDS = Object.freeze(["save", "check", "skill", "contest"]);
export const MAX_TARGETS = 8;
const AUTO_FAIL = "auto-fail";

/** The test a request asks for: "save", "check" (an ability) or "skill". */
function testOf(input) {
  const kind = ["save", "check", "skill"].includes(input?.kind) ? input.kind : null;
  if (!kind) fail("Scegli il tipo di tiro da chiedere.", "Choose the kind of roll to request.");
  if (kind === "skill") {
    if (!SKILLS.some((s) => s.id === input.skill))
      fail("Scegli un'abilità.", "Choose a skill.", { code: "skill" });
    return { kind, skill: input.skill, ability: null };
  }
  if (!ABILITIES.includes(input.ability))
    fail("Scegli una caratteristica.", "Choose an ability.", { code: "ability" });
  return { kind, ability: input.ability, skill: null };
}
function dcOf(value) {
  if (value === "" || value === null || value === undefined) return null;
  const dc = Number(value);
  if (!Number.isInteger(dc) || dc < 1 || dc > 40)
    fail("La CD è un numero intero tra 1 e 40.", "The DC is a whole number from 1 to 40.", {
      code: "dc",
    });
  return dc;
}
/** Creatures the DM may ask: on the active scene or in the campaign, not personal sheets. */
export function requestableActors(state) {
  const scene = (state.scenes ?? []).find((s) => s.id === state.activeSceneId);
  const onScene = new Set((scene?.tokens ?? []).map((t) => t.actorId));
  return Object.values(state.actors ?? {})
    .filter(
      (actor) =>
        actor &&
        isActorAvailable(actor) &&
        actor.visibility !== "private" &&
        !actor.dead &&
        (onScene.has(actor.id) || actor.kind === "character"),
    )
    .sort(
      (a, b) =>
        (a.kind === "character" ? 0 : 1) - (b.kind === "character" ? 0 : 1) ||
        a.name.localeCompare(b.name),
    );
}
/** "Tiro salvezza su Destrezza · CD 13", or «CD nascosta» when the viewer may not read it. */
export const titleWithDc = (title, dc) =>
  dc === null || dc === undefined
    ? title
    : dc === "hidden"
      ? text(`${title.it} · CD nascosta`, `${title.en} · DC hidden`)
      : text(`${title.it} · CD ${dc}`, `${title.en} · DC ${dc}`);
/**
 * A request card's title for one viewer (C1, FG hidden DC): the DM's DC, or «CD nascosta»
 * for a player when the campaign hides DCs. `viewer` "player" gives the line everyone reads.
 */
export function requestTitle(state, meta, viewer) {
  if (!meta?.test || meta.kind === "contest" || !Number.isInteger(meta.dc)) return meta?.title;
  return titleWithDc(testTitle(meta.test), dcVisibleTo(state, viewer, "dm") ? meta.dc : "hidden");
}

/**
 * Creates one request card (a group of queue attempts). `input` is either
 * {kind: "save"|"check"|"skill", ability, skill, dc, rollMode, actorIds} or
 * {kind: "contest", sides: [{actorId, kind, ability, skill}, {…}]}. The DM asks, or the
 * member the DM handed the session to (C3, Owlbear GM hand-off).
 */
export function createRequest(
  state,
  input,
  role,
  { id, now, origin = null, logLabel = null } = {},
) {
  if (!runsSessionFor(state, role)) fail("Solo il DM chiede tiri.", "Only the DM requests rolls.");
  // The runner asks with the DM's authority for this session; the card remembers who asked.
  const authority = "dm";
  const groupId = id ?? globalThis.crypto.randomUUID();
  const allowed = new Set(requestableActors(state).map((a) => a.id));
  const rollMode = ["advantage", "disadvantage"].includes(input?.rollMode)
    ? input.rollMode
    : "normal";
  const created = [];
  const enqueue = (actorId, test, extra) => {
    if (!allowed.has(actorId))
      fail("Questa creatura non può ricevere la richiesta.", "This creature cannot be asked.", {
        code: "target",
      });
    const modifier = testModifier(state, actorId, test);
    const title = testTitle(test);
    // Each creature's conditions join the DM's mode (review P2-12), as in the core's saves.
    const effects = conditionTest(state, actorId, test);
    const mode = combineModes(
      rollMode,
      effects.advantage.length ? "advantage" : "normal",
      effects.disadvantage.length ? "disadvantage" : "normal",
    );
    const attempt = enqueueRollRequest(
      state,
      {
        id: `${groupId}:${actorId}`,
        actorId,
        kind: test.kind === "save" ? "save" : "check",
        ability: modifier.ability,
        skill: test.skill,
        dc: extra.dc,
        rollMode: mode,
        modifier: modifier.modifier,
        modifierSources: modifier.sources,
        label: text(`Richiesta del DM · ${title.it}`, `DM request · ${title.en}`),
        source: extra.contest
          ? AUTHORED.contest
          : test.kind === "save"
            ? SOURCES.save
            : SOURCES.d20,
        meta: {
          groupId,
          kind: extra.contest ? "contest" : test.kind,
          test: { kind: test.kind, ability: modifier.ability, skill: test.skill },
          title: extra.title,
          dc: extra.dc,
          side: extra.side ?? null,
          rollMode,
          createdAt: now ?? new Date().toISOString(),
          origin: copy(origin),
          requestedBy: role,
          // The log line the request wrote: the chat shows it as the request card (TV-92).
          ...(logLabel ? { logLabel: String(logLabel) } : {}),
        },
      },
      authority,
    );
    const request = attempt.requests[0];
    if (request.status === "pending" && (effects.advantage.length || effects.disadvantage.length))
      request.conditionReasons = {
        advantage: copy(effects.advantage),
        disadvantage: copy(effects.disadvantage),
      };
    // An automatic failure asks no die anywhere (bell, «Tiri e risultati», card): the row
    // is a failure with its reason, as the core's area saves record it.
    if (request.status === "pending" && test.kind === "save" && effects.autoFail.length) {
      request.status = "expired";
      request.reason = AUTO_FAIL;
      request.autoFail = copy(effects.autoFail);
      request.expiredReason = {
        code: AUTO_FAIL,
        it: `Fallimento automatico: ${reasonNames(effects.autoFail, "it")}.`,
        en: `Automatic failure: ${reasonNames(effects.autoFail, "en")}.`,
      };
      attempt.status = "resolved";
    }
    created.push(attempt.id);
  };
  if (input?.kind === "contest") {
    const sides = Array.isArray(input.sides) ? input.sides : [];
    if (sides.length !== 2 || !sides[0]?.actorId || !sides[1]?.actorId)
      fail("Un tiro contrapposto ha due creature.", "An opposed roll has two creatures.", {
        code: "contest-sides",
      });
    if (sides[0].actorId === sides[1].actorId)
      fail("Scegli due creature diverse.", "Choose two different creatures.", {
        code: "contest-same",
      });
    const tests = sides.map((side) => {
      const test = testOf(side);
      if (test.kind === "save")
        fail(
          "Il confronto è tra prove, non tiri salvezza.",
          "Opposed rolls compare checks, not saves.",
        );
      return test;
    });
    const names = sides.map((side) => state.actors[side.actorId]?.name ?? "");
    const a = testTitle(tests[0]);
    const b = testTitle(tests[1]);
    const title = text(
      `Contrapposto: ${names[0]} (${a.it}) contro ${names[1]} (${b.it})`,
      `Opposed: ${names[0]} (${a.en}) vs ${names[1]} (${b.en})`,
    );
    sides.forEach((side, index) =>
      enqueue(side.actorId, tests[index], {
        dc: null,
        contest: true,
        side: index ? "b" : "a",
        title,
      }),
    );
    return { groupId, attemptIds: created };
  }
  const test = testOf(input);
  const dc = dcOf(input?.dc);
  const actorIds = [...new Set(Array.isArray(input?.actorIds) ? input.actorIds : [])];
  if (!actorIds.length)
    fail(
      "Scegli almeno una creatura a cui chiedere il tiro.",
      "Choose at least one creature to ask.",
      {
        code: "targets",
      },
    );
  if (actorIds.length > MAX_TARGETS)
    fail(
      `Al massimo ${MAX_TARGETS} creature per richiesta.`,
      `At most ${MAX_TARGETS} creatures per request.`,
    );
  const title = titleWithDc(testTitle(test), dc);
  for (const actorId of actorIds) enqueue(actorId, test, { dc, title });
  return { groupId, attemptIds: created };
}

const rowResult = (request, reroll) => {
  if (reroll) return { values: reroll.values, natural: reroll.natural, total: reroll.total };
  return {
    values: request.values ?? null,
    natural: request.natural ?? null,
    total: request.total ?? null,
  };
};
/**
 * The request cards this viewer may see, newest first. The DM reads every row; another
 * identity reads the rows of creatures it plays and the shared results of player
 * characters (the core roll audience), never a DM creature's result.
 */
export function requestGroups(state, slice, role) {
  const groups = new Map();
  // C3: whoever runs the session reads every row as the DM does, except a personal sheet's
  // (identity-private data stays with its owner).
  const runner = role !== "dm" && runsSessionFor(state, role);
  // C1 (Fantasy Grounds hidden DC): a player reads «CD nascosta»; success still shows.
  const dcShown = dcVisibleTo(state, role, "dm");
  for (const attempt of state.combatAttempts ?? []) {
    if (attempt.kind !== "roll-request") continue;
    const meta = attempt.rollRequest ?? {};
    const request = attempt.requests?.[0];
    const actor = state.actors?.[attempt.actorId];
    if (!request || !actor) continue;
    const plays = canControlActor(actor, role, state);
    const readable =
      role === "dm" ||
      (request.personal === true
        ? request.owner === role
        : runner || plays || (actor.owner === "player" && actor.visibility !== "private"));
    const visibleName =
      role === "dm" ||
      canViewActor(actor, role, state) ||
      (runner && actor.visibility !== "private");
    // A Heroic Inspiration reroll counts while the faces it rerolled are the accepted
    // ones; a later correction of those faces voids it (review P3-11).
    const reroll = (slice?.requestRerolls ?? []).find(
      (r) =>
        r.requestId === request.id &&
        r.status !== "withdrawn" &&
        request.status === "resolved" &&
        Array.isArray(request.values) &&
        request.values.length === r.values?.length &&
        request.values.every((face, i) => (i === r.index ? face === r.from : face === r.values[i])),
    );
    const result = rowResult(request, reroll);
    const resolved = request.status === "resolved";
    const autoFail = request.reason === AUTO_FAIL ? copy(request.autoFail ?? []) : null;
    const row = {
      attemptId: attempt.id,
      requestId: request.id,
      actorId: actor.id,
      name: visibleName ? actor.name : text("Creatura", "Creature"),
      kind: actor.kind,
      owner: actor.owner,
      plays,
      side: meta.side ?? null,
      test: copy(meta.test ?? null),
      status: request.status,
      readable,
      canRoll:
        request.status === "pending" &&
        plays &&
        (request.personal !== true || request.owner === role),
      dice: copy(request.dice),
      modifier: readable ? request.modifier : null,
      modifierSources: readable ? copy(request.modifierSources ?? []) : [],
      rollMode: request.rollMode,
      dc: dcShown ? (request.dc ?? null) : null,
      dcHidden: !dcShown && Number.isInteger(request.dc),
      knownValues: Array.isArray(request.acceptedValues) ? [...request.acceptedValues] : null,
      withdrawn: request.withdrawn === true,
      mode: readable ? (request.mode ?? null) : null,
      // TV-95: the connected dice that answered, named on the card (Pixels).
      devices: readable && Array.isArray(request.devices) ? copy(request.devices) : null,
      values: readable && resolved ? result.values : null,
      natural: readable && resolved ? result.natural : null,
      total: readable && resolved ? result.total : null,
      reroll: readable && reroll ? copy(reroll) : null,
      // One Heroic Inspiration reroll per request, even when a correction voided it.
      rerolled: (slice?.requestRerolls ?? []).some(
        (r) => r.requestId === request.id && r.status !== "withdrawn",
      ),
      success: !readable
        ? null
        : autoFail
          ? false
          : resolved && Number.isInteger(request.dc)
            ? result.total >= request.dc
            : null,
      autoFail: readable ? autoFail : null,
      conditionReasons: readable ? copy(request.conditionReasons ?? null) : null,
      correctionReason: readable ? (request.correctionReason ?? null) : null,
    };
    if (!groups.has(meta.groupId))
      groups.set(meta.groupId, {
        groupId: meta.groupId,
        kind: meta.kind,
        title: copy(dcShown ? meta.title : (requestTitle(state, meta, role) ?? meta.title)),
        dc: dcShown ? (meta.dc ?? null) : null,
        dcHidden: !dcShown && Number.isInteger(meta.dc),
        rollMode: meta.rollMode ?? request.rollMode,
        createdAt: meta.createdAt ?? null,
        origin: copy(meta.origin ?? null),
        // Closed lives on the queue attempts, with the rolls it withdrew: one snapshot, so
        // an Undo never splits them (review P2-7b). Older saved cards: the slice list.
        closed:
          meta.closed === true ||
          (meta.closed === undefined && (slice?.closedRequests ?? []).includes(meta.groupId)),
        rows: [],
      });
    groups.get(meta.groupId).rows.push(row);
    if (meta.logLabel) groups.get(meta.groupId).logLabel = meta.logLabel;
  }
  const out = [];
  // A player reads hidden identities through their disguise, in old cards too (TV-141).
  const mask = role === "dm" || runner ? [] : disguises(state);
  for (const group of groups.values()) {
    const involved = role === "dm" || runner || group.rows.some((r) => r.plays || r.readable);
    if (!involved) continue;
    if (mask.length && group.title)
      group.title = { it: maskNames(group.title.it, mask), en: maskNames(group.title.en, mask) };
    const readableRows = group.rows.filter((r) => r.readable);
    group.summary = {
      success: readableRows.filter((r) => r.success === true).length,
      failure: readableRows.filter((r) => r.success === false).length,
      pending: group.rows.filter((r) => r.status === "pending").length,
      resolved: group.rows.filter((r) => r.status === "resolved").length,
      total: group.rows.length,
      hidden: group.rows.filter((r) => r.status === "resolved" && !r.readable).length,
    };
    group.verdict = group.kind === "contest" ? contestVerdict(group.rows) : null;
    out.push(group);
  }
  return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
/**
 * Opposed rolls (Monk's TokenBar): once both sides rolled and are readable, the higher
 * total is named; a tie is reported as a tie. The DM decides what happens (no SRD rule).
 */
export function contestVerdict(rows) {
  const [a, b] = ["a", "b"].map((side) => rows.find((r) => r.side === side));
  if (!a || !b || a.status !== "resolved" || b.status !== "resolved") return { state: "pending" };
  if (!a.readable || !b.readable) return { state: "hidden" };
  if (a.total === b.total) return { state: "tie", total: a.total };
  const winner = a.total > b.total ? a : b;
  const loser = winner === a ? b : a;
  return {
    state: "higher",
    actorId: winner.actorId,
    name: winner.name,
    a: a.total,
    b: b.total,
    winnerTotal: winner.total,
    loserTotal: loser.total,
  };
}

/**
 * Answers one request with faces (digital or physical) through the queue's resolveRoll.
 * The viewer's modifier stack (Fantasy Grounds, R20-174) is added to this roll only and
 * listed among its modifier sources.
 */
export function answerRequest(
  state,
  attemptId,
  requestId,
  faces,
  role,
  { mode, stack = [], correctionReason, devices = null } = {},
) {
  const attempt = (state.combatAttempts ?? []).find((a) => a.id === attemptId);
  const request = attempt?.requests.find((r) => r.id === requestId);
  if (!attempt || attempt.kind !== "roll-request" || !request)
    fail("Richiesta non trovata.", "Request not found.");
  const fresh = request.status === "pending" && !Array.isArray(request.acceptedValues);
  if (fresh && stack.length) {
    request.modifier += stackTotal(stack);
    request.modifierSources = [
      ...(request.modifierSources ?? []),
      ...stack.map((m) => ({ label: copy(m.label), value: m.value, stack: true })),
    ];
  }
  resolveRoll(state, attemptId, requestId, faces, role, { correctionReason });
  if (mode && fresh) request.mode = mode === "physical" ? "physical" : "digital";
  // TV-95: a connected die answered as a physical die; the log card names it (Pixels).
  if (fresh && request.mode === "physical" && Array.isArray(devices) && devices.length)
    request.devices = copy(devices);
  return request;
}
/** Digital faces for a request (the app's dice service), one per die of its profile. */
export const requestDigitalFaces = (request, draw) =>
  request.dice.flatMap((g) => Array.from({ length: g.count }, () => digitalFaces(draw)(g.sides)));

/**
 * Heroic Inspiration on a requested roll (SRD EN 8 / IT 8; BG3 "Roll Again" after a
 * failure, CRP-031): the player rerolls one d20 of the answered request and must use the
 * new face. The accepted request stays as evidence; the reroll is recorded beside it and
 * the character's inspiration is spent.
 */
export function rerollRequest(
  slice,
  state,
  attemptId,
  requestId,
  dieIndex,
  role,
  { draw, face, now } = {},
) {
  const attempt = (state.combatAttempts ?? []).find((a) => a.id === attemptId);
  const request = attempt?.requests.find((r) => r.id === requestId);
  if (!attempt || attempt.kind !== "roll-request" || !request)
    fail("Richiesta non trovata.", "Request not found.");
  const actor = state.actors?.[request.actorId];
  if (request.status !== "resolved")
    fail("Prima tira, poi puoi ripetere un dado.", "Roll first, then you can reroll a die.");
  if (!actor || actor.kind !== "character" || !canControlActor(actor, role, state))
    fail(
      "Ripete il dado chi gioca il personaggio.",
      "Whoever plays the character rerolls the die.",
    );
  if (!hasInspiration(slice, actor.id))
    fail(`${actor.name} non ha l'Ispirazione eroica.`, `${actor.name} has no Heroic Inspiration.`, {
      code: "no-inspiration",
    });
  if (
    (slice.requestRerolls ?? []).some((r) => r.requestId === requestId && r.status !== "withdrawn")
  )
    fail("Questo tiro è già stato ripetuto.", "This roll was already rerolled.");
  if (
    attempt.rollRequest?.closed === true ||
    (attempt.rollRequest?.closed === undefined &&
      (slice.closedRequests ?? []).includes(attempt.rollRequest?.groupId))
  )
    fail("La richiesta è conclusa.", "The request is closed.");
  const values = [...request.values];
  if (!Number.isInteger(dieIndex) || dieIndex < 0 || dieIndex >= values.length)
    fail("Scegli quale dado ripetere.", "Choose which die to reroll.");
  // SRD 5.2.1 Heroic Inspiration rerolls any die: the d20s first, then a rider's dice
  // (Bless d4), each within its own sides (PG-47).
  const sides =
    (request.dice ?? []).flatMap((group) => Array(group.count).fill(group.sides))[dieIndex] ?? 20;
  const physical = face !== undefined && face !== null && face !== "";
  const next = physical ? Number(face) : digitalFaces(draw)(sides);
  if (!Number.isInteger(next) || next < 1 || next > sides)
    fail(
      `La nuova faccia è un numero intero tra 1 e ${sides}.`,
      `The new face is a whole number from 1 to ${sides}.`,
    );
  const from = values[dieIndex];
  values[dieIndex] = next;
  // One reading of a request's faces with the combat engine (natural, riders, total).
  const score = requestScore(request, values);
  const natural = score.natural;
  const total = score.total;
  const reroll = {
    id: `reroll-${globalThis.crypto.randomUUID()}`,
    at: now ?? new Date().toISOString(),
    by: role,
    attemptId,
    requestId,
    actorId: actor.id,
    actorName: actor.name,
    index: dieIndex,
    from,
    to: next,
    values,
    natural,
    total,
    ...(score.riderRolls.length ? { riderRolls: score.riderRolls } : {}),
    previousTotal: request.total,
    dc: request.dc ?? null,
    success: Number.isInteger(request.dc) ? total >= request.dc : null,
    mode: physical ? "physical" : "digital",
    status: "accepted",
    source: SOURCES.inspiration,
  };
  (slice.requestRerolls ||= []).push(reroll);
  slice.inspiration[actor.id] = { active: false, at: reroll.at, by: role, spentOn: requestId };
  return reroll;
}
const CLOSED = "closed-by-dm";
const groupAttempts = (state, groupId) =>
  (state?.combatAttempts ?? []).filter(
    (attempt) => attempt.kind === "roll-request" && attempt.rollRequest?.groupId === groupId,
  );
/**
 * The DM closes a card (Monk's TokenBar ends a request): it leaves the open list, its rolls
 * stay in the log, and the rolls still pending leave the queue as "no longer applicable",
 * so the bell and «Tiri e risultati» stop asking for them (review P2-7). Pass the state
 * to reach the queue; the card alone closes without it.
 */
export function closeRequest(slice, groupId, role, state = null) {
  if (!(role === "dm" || (state && runsSessionFor(state, role))))
    fail("Solo il DM conclude una richiesta.", "Only the DM closes a request.");
  if (!groupId) fail("Richiesta non trovata.", "Request not found.");
  const attempts = groupAttempts(state, groupId);
  if (!attempts.length) {
    if (!(slice.closedRequests ||= []).includes(groupId)) slice.closedRequests.push(groupId);
    return;
  }
  slice.closedRequests = (slice.closedRequests ?? []).filter((id) => id !== groupId);
  for (const attempt of attempts) {
    attempt.rollRequest.closed = true;
    for (const request of attempt.requests)
      if (request.status === "pending") {
        request.status = "expired";
        request.reason = CLOSED;
        request.expiredReason = {
          code: CLOSED,
          it: "Richiesta conclusa dal DM.",
          en: "Request closed by the DM.",
        };
        attempt.status = "resolved";
      }
  }
}
/** Reopens a card: the rolls its closing withdrew are pending again (answered ones stay). */
export function reopenRequest(slice, groupId, role, state = null) {
  if (!(role === "dm" || (state && runsSessionFor(state, role))))
    fail("Solo il DM riapre una richiesta.", "Only the DM reopens a request.");
  slice.closedRequests = (slice.closedRequests ?? []).filter((id) => id !== groupId);
  for (const attempt of groupAttempts(state, groupId)) {
    attempt.rollRequest.closed = false;
    for (const request of attempt.requests)
      if (request.status === "expired" && request.reason === CLOSED) {
        request.status = "pending";
        delete request.reason;
        delete request.expiredReason;
        attempt.status = "pending";
      }
  }
}
/**
 * Whether a creature's answers stay private: the core shares accepted rolls of the
 * players' shared characters and keeps the DM's creatures (and personal sheets) private.
 * Its Heroic Inspiration reroll follows the same audience (review P2-4).
 */
export function requestIsPrivate(state, actorId) {
  const actor = state.actors?.[actorId];
  return !actor || actor.owner !== "player" || actor.visibility === "private";
}
/**
 * The open journal request this identity can answer for one creature from the text of
 * `ref` (dnd5e request enricher: the players' roll answers the request, FVT-146).
 */
export function openJournalRow(state, slice, ref, actorId, role) {
  for (const group of requestGroups(state, slice, role)) {
    if (group.closed || group.origin?.kind !== "journal" || group.origin.ref !== ref) continue;
    const row = group.rows.find((r) => r.actorId === actorId && r.canRoll);
    if (row) return { ...row, groupId: group.groupId };
  }
  return null;
}

// ---------------------------------------------------------------- journal text

/**
 * An executable roll in journal text (dnd5e `[[/save dex 15]]`, FVT-146; Quest Portal roll
 * buttons, VTL-051), written with the app's one embed marker: `@Embed[save:dex:13]`,
 * `@Embed[check:str]`, `@Embed[check:athletics:15]`. Null when the ref is not a roll.
 */
export function parseRollRef(ref) {
  const match = /^(save|check|skill):([a-z-]+)(?::(\d{1,2}))?$/.exec(String(ref ?? ""));
  if (!match) return null;
  const [, head, key, dcText] = match;
  const dc = dcText === undefined ? null : Number(dcText);
  if (dc !== null && (dc < 1 || dc > 40)) return null;
  if (head === "save")
    return ABILITIES.includes(key) ? { kind: "save", ability: key, skill: null, dc } : null;
  if (ABILITIES.includes(key))
    return head === "check" ? { kind: "check", ability: key, skill: null, dc } : null;
  if (SKILLS.some((s) => s.id === key)) return { kind: "skill", ability: null, skill: key, dc };
  return null;
}
/** The canonical ref of a request test, the inverse of parseRollRef. */
export const rollRef = ({ kind, ability, skill, dc }) =>
  `${kind === "save" ? "save" : "check"}:${kind === "skill" ? skill : ability}${Number.isInteger(dc) ? ":" + dc : ""}`;
