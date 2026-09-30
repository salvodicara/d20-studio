// B43 factions: reputation of the party and of single characters with an organization or a
// person, SRD 2024 attitudes of important NPCs, relations between archive pages and
// characters with secret connections, and the relations projection B58 will draw. Pure
// domain functions first, then the panels and screens the archive renders.
//
// Adopted patterns (census IDs): DOS2 GM reputation screen where the GM sets attitudes
// (CRP-061); Bondsmith tiers, minus/plus editing and a history of reasoned changes with
// per-entry visibility (R118, Foundry module); Crash's Tracking faction standing on the
// sheet (FVT-042, as a box of the Story tab); dnd5e "important NPC" flag (FVT-091); Kanka
// relations listed on the entry (CMP-29, list only: no graph, boundary F-014); Scabard
// secret connections visible to the GM until revealed (CMP-83). Reputation has no
// mechanical effect (F-042): no automatic judgement, advantage, discount or decay.
// Attitudes follow SRD 5.2.1: Friendly, Indifferent or Hostile, Indifferent by default.

import {
  ARCHIVE,
  attempt,
  canReadPage,
  change,
  dataOf,
  dateText,
  fail,
  findPage,
  isDM,
  isMember,
  labelText,
  listPages,
  mutableData,
  newId,
  normalizeRecipients,
  partyCharacters,
  reaches,
  readRecipients,
  recipientsFields,
  refInfo,
  refReadable,
  requireDM,
} from "./journal-plus.mjs";
import { canViewActor } from "./character-access.mjs";

const L = (it, en) => Object.freeze({ it, en });
const now = () => new Date().toISOString();
const str = (value) => (typeof value === "string" ? value : "");
export const REP_MIN = -10;
export const REP_MAX = 10;
export const TIERS = Object.freeze([
  { id: "hostile", min: -10, max: -6, label: L("Ostile", "Hostile") },
  { id: "wary", min: -5, max: -2, label: L("Diffidente", "Wary") },
  { id: "neutral", min: -1, max: 1, label: L("Neutrale", "Neutral") },
  { id: "trusted", min: 2, max: 5, label: L("Fidato", "Trusted") },
  { id: "allied", min: 6, max: 10, label: L("Alleato", "Allied") },
]);
export const REPUTATION_SOURCE = Object.freeze({
  kind: "authored-demo",
  revision: "blueprint-b43-1",
  note: "Reputation bands modelled on Bondsmith tiers (R118); a tracking aid for the DM, not a D&D rule, with no mechanical effect.",
});
const SRD = {
  url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
  itUrl: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf",
};
export const ATTITUDE_SOURCE = Object.freeze({
  kind: "srd",
  edition: "2024",
  revision: "5.2.1",
  en: {
    url: SRD.url,
    sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
    pages: [10, 177, 182, 183, 184],
  },
  it: {
    url: SRD.itUrl,
    sha256: "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718",
    pages: [11, 203, 204, 208, 210],
  },
});
// Rules Glossary: Attitude EN 177 / IT 204, Friendly EN 182 / IT 203, Indifferent EN 184 /
// IT 208, Hostile EN 183 / IT 210; the attitude of an NPC in social interaction EN 10 / IT 11.
export const ATTITUDES = Object.freeze([
  {
    id: "friendly",
    label: L("Amichevole", "Friendly"),
    rule: L(
      "Vede il personaggio con favore: vantaggio alle prove per influenzarlo.",
      "Views the character favourably: Advantage on checks to influence it.",
    ),
  },
  {
    id: "indifferent",
    label: L("Indifferente", "Indifferent"),
    rule: L(
      "Nessun desiderio di aiutare o ostacolare: l’atteggiamento predefinito.",
      "No desire to help or hinder: the default attitude.",
    ),
  },
  {
    id: "hostile",
    label: L("Ostile", "Hostile"),
    rule: L(
      "Vede il personaggio con sfavore: svantaggio alle prove per influenzarlo.",
      "Views the character unfavourably: Disadvantage on checks to influence it.",
    ),
  },
]);
export const tierOf = (value) =>
  TIERS.find((tier) => value >= tier.min && value <= tier.max) ??
  (value < 0 ? TIERS[0] : TIERS.at(-1));
const attitudeOf = (id) => ATTITUDES.find((row) => row.id === id) ?? ATTITUDES[1];
const VISIBILITY = {
  reputation: ["hidden", "tier", "full"],
  attitude: ["hidden", "full"],
};

// ---------------------------------------------------------------------------------------
// Standings (reputation and attitude)

function subjectName(state, subject, lang = "it") {
  if (subject === "party") return lang === "it" ? "Il gruppo" : "The party";
  return state.actors?.[subject]?.name ?? subject;
}
function checkSubject(state, subject) {
  if (subject === "party") return subject;
  if (!partyCharacters(state).some((actor) => actor.id === subject))
    fail("Scegli il gruppo o un personaggio del gruppo.", "Choose the party or a party character.");
  return subject;
}
function checkTarget(data, targetId, kind) {
  const target =
    data.pages.find((page) => page.id === targetId) ??
    fail("Pagina non trovata.", "Page not found.");
  if (kind === "attitude" && target.type !== "person")
    fail(
      "L’atteggiamento (Amichevole, Indifferente, Ostile) riguarda una persona.",
      "An attitude (Friendly, Indifferent, Hostile) belongs to a person.",
    );
  if (kind === "reputation" && !["organization", "person"].includes(target.type))
    fail(
      "La reputazione si tiene presso un’organizzazione o una persona.",
      "Reputation is kept with an organization or a person.",
    );
  return target;
}
const reasonOf = (value) => {
  const text = str(value).trim();
  if (!text) fail("Scrivi il motivo del cambiamento.", "Write the reason for the change.");
  if (text.length > 300) fail("Motivo: massimo 300 caratteri.", "Reason: at most 300 characters.");
  return text;
};
export function changeStanding(state, role, input = {}) {
  requireDM(state, role);
  const data = mutableData(state);
  const kind = input.kind === "attitude" ? "attitude" : "reputation";
  checkTarget(data, input.targetId, kind);
  const subject = checkSubject(state, input.subject);
  const reason = reasonOf(input.reason);
  let to;
  if (kind === "reputation") {
    const number = Number(input.value);
    if (!Number.isFinite(number))
      fail("Il punteggio deve essere un numero.", "The score must be a number.");
    to = Math.max(REP_MIN, Math.min(REP_MAX, Math.round(number)));
  } else {
    if (!ATTITUDES.some((row) => row.id === input.value))
      fail("Atteggiamento non valido.", "Invalid attitude.");
    to = input.value;
  }
  let standing = data.standings.find(
    (row) => row.targetId === input.targetId && row.subject === subject && row.kind === kind,
  );
  if (!standing) {
    standing = {
      id: newId("st"),
      targetId: input.targetId,
      subject,
      kind,
      value: kind === "reputation" ? 0 : "indifferent",
      visibility: "hidden",
      history: [],
    };
    data.standings.push(standing);
  }
  if (input.visibility !== undefined) {
    if (!VISIBILITY[kind].includes(input.visibility))
      fail("Visibilità non valida.", "Invalid visibility.");
    standing.visibility = input.visibility;
  }
  if (standing.value === to)
    fail(
      "Il valore è già questo: scegline un altro.",
      "The value is already this one: choose another.",
    );
  standing.history.push({ id: newId("h"), at: now(), by: role, from: standing.value, to, reason });
  standing.value = to;
  return standing.id;
}
function standingIn(data, id) {
  return (
    data.standings.find((row) => row.id === id) ?? fail("Voce non trovata.", "Entry not found.")
  );
}
export function setStandingVisibility(state, role, id, visibility) {
  requireDM(state, role);
  const standing = standingIn(mutableData(state), id);
  if (!VISIBILITY[standing.kind].includes(visibility))
    fail("Visibilità non valida.", "Invalid visibility.");
  standing.visibility = visibility;
}
/** Reverts the latest change with a reason; both entries stay in the history. */
export function correctStanding(state, role, id, reason) {
  requireDM(state, role);
  const standing = standingIn(mutableData(state), id);
  const text = reasonOf(reason);
  const last =
    standing.history.at(-1) ?? fail("Non c’è nulla da correggere.", "There is nothing to correct.");
  standing.history.push({
    id: newId("h"),
    at: now(),
    by: role,
    from: standing.value,
    to: last.from,
    reason: text,
    correction: true,
    revertsId: last.id,
  });
  standing.value = last.from;
}
function projectStanding(state, standing, role, lang = "it") {
  const dm = isDM(state, role);
  const numbers = dm || standing.kind === "attitude" || standing.visibility === "full";
  const out = {
    id: standing.id,
    targetId: standing.targetId,
    subject: standing.subject,
    subjectName: subjectName(state, standing.subject, lang),
    kind: standing.kind,
    history: standing.history.map((entry) => ({
      id: entry.id,
      at: entry.at,
      reason: entry.reason,
      correction: entry.correction === true,
      ...(numbers
        ? { from: entry.from, to: entry.to }
        : { fromTier: tierOf(entry.from).id, toTier: tierOf(entry.to).id }),
    })),
  };
  if (standing.kind === "reputation") out.tier = tierOf(standing.value);
  if (numbers) out.value = standing.value;
  if (dm) out.visibility = standing.visibility;
  return out;
}
export function standingVisible(state, standing, role) {
  if (!canReadPage(state, findPage(state, standing.targetId), role)) return false;
  return isDM(state, role) || standing.visibility !== "hidden";
}
export function standingsFor(state, role, { targetId } = {}) {
  return dataOf(state)
    .standings.filter(
      (row) => (!targetId || row.targetId === targetId) && standingVisible(state, row, role),
    )
    .map((row) => projectStanding(state, row, role));
}
/** Shared standings of one character and of the party (Crash's Tracking on the sheet). */
export function standingsForActor(state, role, actorId) {
  return dataOf(state)
    .standings.filter(
      (row) =>
        (row.subject === actorId || row.subject === "party") && standingVisible(state, row, role),
    )
    .map((row) => projectStanding(state, row, role));
}
export function importantNpcs(state, role) {
  return listPages(state, role, { type: "person" }).filter((page) => page.important);
}

// ---------------------------------------------------------------------------------------
// Relations and secret connections

const checkEndpoint = (state, ref) => {
  if (
    !ref ||
    !["page", "actor"].includes(ref.kind) ||
    (ref.kind === "page" ? !findPage(state, ref.id) : !state.actors?.[ref.id])
  )
    fail("Scegli due voci esistenti da collegare.", "Choose two existing entries to connect.");
  return { kind: ref.kind, id: ref.id };
};
export function addRelation(state, role, { from, to, label, secret = false }) {
  requireDM(state, role);
  const data = mutableData(state);
  const a = checkEndpoint(state, from);
  const b = checkEndpoint(state, to);
  if (a.kind === b.kind && a.id === b.id)
    fail("Una voce non si collega a sé stessa.", "An entry does not connect to itself.");
  const text = str(label).trim();
  if (!text || text.length > 80)
    fail(
      "Descrivi la relazione (massimo 80 caratteri).",
      "Describe the relation (80 characters at most).",
    );
  const relation = {
    id: newId("rel"),
    from: a,
    to: b,
    label: text,
    secret: secret === true,
    reveal: { mode: "none", actorIds: [] },
    createdAt: now(),
  };
  data.relations.push(relation);
  return relation.id;
}
function relationIn(data, id) {
  return (
    data.relations.find((row) => row.id === id) ??
    fail("Relazione non trovata.", "Relation not found.")
  );
}
export function removeRelation(state, role, id) {
  requireDM(state, role);
  const data = mutableData(state);
  relationIn(data, id);
  data.relations = data.relations.filter((row) => row.id !== id);
}
export function revealRelation(state, role, id, recipients) {
  requireDM(state, role);
  const relation = relationIn(mutableData(state), id);
  if (!relation.secret)
    fail("La relazione è già nota al gruppo.", "The relation is already known to the party.");
  relation.reveal = normalizeRecipients(state, recipients, { allowNone: false });
  relation.revealedAt = now();
}
export function hideRelation(state, role, id) {
  requireDM(state, role);
  const relation = relationIn(mutableData(state), id);
  relation.reveal = { mode: "none", actorIds: [] };
  relation.revealedAt = null;
}
export function relationReadable(state, relation, role) {
  return (
    refReadable(state, relation.from, role) &&
    refReadable(state, relation.to, role) &&
    (!relation.secret || reaches(state, relation.reveal, role))
  );
}
function projectRelation(state, relation, role) {
  const dm = isDM(state, role);
  return {
    id: relation.id,
    from: refInfo(state, relation.from, role),
    to: refInfo(state, relation.to, role),
    label: relation.label,
    secret: relation.secret,
    revealed: relation.secret && relation.reveal.mode !== "none",
    ...(dm ? { reveal: structuredClone(relation.reveal) } : {}),
  };
}
export function listRelations(state, role) {
  return dataOf(state)
    .relations.filter((row) => relationReadable(state, row, role))
    .map((row) => projectRelation(state, row, role));
}
export function relationsFor(state, role, ref) {
  return listRelations(state, role).filter((row) =>
    [row.from, row.to].some((end) => end.kind === ref.kind && end.id === ref.id),
  );
}
/**
 * Relations as nodes and edges for the B58 graph (census CA-36; F-014 keeps B43 a list).
 * Only what this identity may read: unreadable pages, NPC sheets and unrevealed secret
 * connections are absent, not masked. Node ids are "<kind>:<id>".
 */
export function relationsGraph(state, role, lang = "it") {
  const nodes = new Map();
  const edges = listRelations(state, role).map((row) => {
    for (const end of [row.from, row.to])
      nodes.set(`${end.kind}:${end.id}`, {
        id: `${end.kind}:${end.id}`,
        kind: end.kind,
        ref: { kind: end.kind, id: end.id },
        label: typeof end.label === "string" ? end.label : (end.label?.[lang] ?? end.label?.it),
        type: end.type ?? (end.kind === "actor" ? "character" : null),
      });
    return {
      id: row.id,
      from: `${row.from.kind}:${row.from.id}`,
      to: `${row.to.kind}:${row.to.id}`,
      label: typeof row.label === "string" ? row.label : row.label[lang],
      secret: row.secret,
    };
  });
  return { nodes: [...nodes.values()], edges };
}

// =======================================================================================
// UI: standing and relation panels on a page, the DOS2-like screen, the sheet box.
// =======================================================================================

const subjects = (ctx) => [
  { id: "party", name: ctx.t("Il gruppo", "The party") },
  ...partyCharacters(ctx.state).map((actor) => ({ id: actor.id, name: actor.name })),
];
function valueText(ctx, row) {
  if (row.kind === "attitude") return ctx.label(attitudeOf(row.value).label);
  const tier = ctx.label(row.tier.label);
  return row.value === undefined ? tier : `${tier} (${row.value > 0 ? "+" : ""}${row.value})`;
}
const visibilityLabel = (ctx, value) =>
  ({
    hidden: ctx.t("Solo DM", "DM only"),
    tier: ctx.t("Condivisa: solo la fascia", "Shared: band only"),
    full: ctx.t("Condivisa: fascia e punteggio", "Shared: band and score"),
  })[value];
function historyList(ctx, row) {
  if (!row.history.length)
    return `<p class="campaign-meta">${ctx.t("Nessun cambiamento registrato.", "No change recorded.")}</p>`;
  const dm = isDM(ctx.state, ctx.role);
  const change = (entry) => {
    if (row.kind === "attitude")
      return `${ctx.label(attitudeOf(entry.from).label)} → ${ctx.label(attitudeOf(entry.to).label)}`;
    if (entry.from !== undefined)
      return `${entry.from > 0 ? "+" : ""}${entry.from} → ${entry.to > 0 ? "+" : ""}${entry.to}`;
    const tier = (id) => ctx.label(TIERS.find((t) => t.id === id).label);
    return entry.fromTier === entry.toTier
      ? tier(entry.toTier)
      : `${tier(entry.fromTier)} → ${tier(entry.toTier)}`;
  };
  return `<ol class="jp-history">${[...row.history]
    .reverse()
    .map(
      (entry, index) =>
        `<li><p><strong>${ctx.esc(change(entry))}</strong>${entry.correction ? ` <span class="badge">${ctx.t("Correzione", "Correction")}</span>` : ""} · <span class="campaign-meta">${ctx.esc(dateText(ctx, entry.at))}</span></p><p class="campaign-prose">${ctx.esc(entry.reason)}</p>${dm && index === 0 ? `<button type="button" class="button quiet" data-jp-standing-correct="${ctx.esc(row.id)}">${ctx.t("Correggi questo cambiamento", "Correct this change")}</button>` : ""}</li>`,
    )
    .join("")}</ol>`;
}
// The subject in the viewer's language ("Il gruppo" / "The party", or the character's name).
const whoOf = (ctx, row) =>
  row.subject === "party" ? ctx.t("Il gruppo", "The party") : row.subjectName;
function standingRow(ctx, row, { withTarget = false } = {}) {
  const dm = isDM(ctx.state, ctx.role);
  const target = findPage(ctx.state, row.targetId);
  const who = withTarget
    ? `<button type="button" class="jp-link" data-jp-open="${ctx.esc(row.targetId)}">${ctx.esc(target?.title ?? "")}</button> · ${ctx.esc(whoOf(ctx, row))}`
    : ctx.esc(whoOf(ctx, row));
  const attitude = row.kind === "attitude" ? attitudeOf(row.value) : null;
  return `<li class="jp-standing"><div class="jp-standing-head"><p><span class="jp-standing-who">${who}</span> <strong class="jp-tier jp-tier-${ctx.esc(row.kind === "attitude" ? row.value : row.tier.id)}">${ctx.esc(valueText(ctx, row))}</strong></p>${dm ? `<div class="jp-standing-tools"><label class="field jp-inline-field"><span class="jp-sr">${ctx.t("Chi la vede", "Who sees it")}</span><select data-jp-standing-visibility="${ctx.esc(row.id)}">${VISIBILITY[row.kind].map((value) => `<option value="${value}" ${row.visibility === value ? "selected" : ""}>${ctx.esc(value === "full" && row.kind === "attitude" ? ctx.t("Condivisa", "Shared") : visibilityLabel(ctx, value))}</option>`).join("")}</select></label><button type="button" class="button" data-jp-standing-change data-target="${ctx.esc(row.targetId)}" data-subject="${ctx.esc(row.subject)}" data-kind="${row.kind}">${ctx.t("Cambia…", "Change…")}</button></div>` : ""}</div>${attitude ? `<p class="campaign-meta">${ctx.esc(ctx.label(attitude.rule))} <span class="jp-source">SRD 5.2.1 · EN ${ATTITUDE_SOURCE.en.pages.join(", ")} / IT ${ATTITUDE_SOURCE.it.pages.join(", ")}</span></p>` : ""}<details class="jp-history-box"><summary>${ctx.t("Storico con i motivi", "History with reasons")} (${row.history.length})</summary>${historyList(ctx, row)}</details></li>`;
}
/** The standing panel of an organization or person page. */
export function standingPanel(ctx, page) {
  if (!["organization", "person"].includes(page.type)) return "";
  const dm = isDM(ctx.state, ctx.role);
  const kind = page.type === "person" ? "attitude" : "reputation";
  const rows = standingsFor(ctx.state, ctx.role, { targetId: page.id }).filter(
    (row) => row.kind === kind,
  );
  if (!rows.length && !dm) return "";
  const title =
    kind === "attitude"
      ? ctx.t("Atteggiamento verso il gruppo", "Attitude toward the party")
      : ctx.t("Reputazione presso", "Reputation with") + " " + ctx.esc(page.title);
  const missing = subjects(ctx).filter((s) => !rows.some((row) => row.subject === s.id));
  return `<section class="jp-panel jp-standings"><h3>${title}</h3>${kind === "reputation" ? `<p class="campaign-meta">${ctx.t("Da −10 a +10: Ostile, Diffidente, Neutrale, Fidato, Alleato. Serve a ricordare, non cambia i tiri.", "From −10 to +10: Hostile, Wary, Neutral, Trusted, Allied. It is a memory aid and never changes rolls.")}</p>` : ""}${rows.length ? `<ul class="jp-standing-list">${rows.map((row) => standingRow(ctx, row)).join("")}</ul>` : `<p class="campaign-meta">${ctx.t("Ancora nulla da ricordare.", "Nothing to remember yet.")}</p>`}${dm && missing.length ? `<div class="campaign-toolbar"><label class="field jp-inline-field">${ctx.t("Aggiungi per", "Add for")}<select data-jp-standing-subject="${ctx.esc(page.id)}">${missing.map((s) => `<option value="${ctx.esc(s.id)}">${ctx.esc(s.name)}</option>`).join("")}</select></label><button type="button" class="button" data-jp-standing-add="${ctx.esc(page.id)}" data-kind="${kind}">${kind === "attitude" ? ctx.t("Registra un atteggiamento", "Record an attitude") : ctx.t("Registra una reputazione", "Record a reputation")}</button></div>` : ""}</section>`;
}
function endpointButton(ctx, end) {
  if (end.kind === "page")
    return `<button type="button" class="jp-link" data-jp-open="${ctx.esc(end.id)}">${ctx.esc(end.label)}</button>`;
  return `<button type="button" class="jp-link" data-jp-route="${ctx.esc(JSON.stringify(end.route))}">${ctx.esc(ctx.label(end.label))}</button>`;
}
function relationRow(ctx, row) {
  const dm = isDM(ctx.state, ctx.role);
  const secretTag = row.secret
    ? dm
      ? row.revealed
        ? `<span class="badge jp-secret-tag">${ctx.t("Connessione segreta · rivelata", "Secret connection · revealed")}</span>`
        : `<span class="badge jp-secret-tag">${ctx.t("Connessione segreta · solo DM", "Secret connection · DM only")}</span>`
      : `<span class="badge jp-secret-tag">${ctx.t("Connessione segreta rivelata", "Secret connection revealed")}</span>`
    : "";
  return `<li class="jp-relation ${row.secret ? "is-secret" : ""}"><p>${endpointButton(ctx, row.from)} <em>${ctx.esc(labelText(ctx, row.label))}</em> ${endpointButton(ctx, row.to)} ${secretTag}</p>${dm ? `<div class="campaign-toolbar">${row.secret ? `<button type="button" class="button" data-jp-relation-reveal="${ctx.esc(row.id)}">${row.revealed ? ctx.t("Cambia a chi è rivelata", "Change who knows") : ctx.t("Rivela…", "Reveal…")}</button>${row.revealed ? `<button type="button" class="button quiet" data-jp-relation-hide="${ctx.esc(row.id)}">${ctx.t("Nascondi di nuovo", "Hide again")}</button>` : ""}` : ""}<button type="button" class="button quiet" data-jp-relation-remove="${ctx.esc(row.id)}">${ctx.t("Rimuovi relazione", "Remove relation")}</button></div>` : ""}</li>`;
}
function relationTargets(ctx, exclude) {
  return [
    ...listPages(ctx.state, ctx.role)
      .filter((page) => page.id !== exclude)
      .map((page) => [`page:${page.id}`, page.title]),
    ...Object.values(ctx.state.actors ?? {})
      .filter((actor) => canViewActor(actor, ctx.role, ctx.state))
      .map((actor) => [`actor:${actor.id}`, `${actor.name} · ${ctx.t("scheda", "sheet")}`]),
  ];
}
function relationForm(ctx, fromValue) {
  const options = relationTargets(ctx, fromValue?.slice(5));
  return `<form class="jp-relation-form" data-jp-relation-form>${fromValue ? `<input type="hidden" name="from" value="${ctx.esc(fromValue)}">` : `<label class="field">${ctx.t("Da", "From")}<select name="from" required>${options.map(([value, label]) => `<option value="${ctx.esc(value)}">${ctx.esc(label)}</option>`).join("")}</select></label>`}<label class="field">${ctx.t("Relazione", "Relation")}<input name="label" required maxlength="80" placeholder="${ctx.esc(ctx.t("es. deve un favore a", "e.g. owes a favour to"))}"></label><label class="field">${ctx.t("Con", "With")}<select name="to" required>${options.map(([value, label]) => `<option value="${ctx.esc(value)}">${ctx.esc(label)}</option>`).join("")}</select></label><label class="campaign-check"><input type="checkbox" name="secret">${ctx.t("Connessione segreta (solo DM finché non la riveli)", "Secret connection (DM only until you reveal it)")}</label><button type="submit" class="button">${ctx.t("Aggiungi relazione", "Add relation")}</button></form>`;
}
export function relationsPanel(ctx, page) {
  const rows = relationsFor(ctx.state, ctx.role, { kind: "page", id: page.id });
  const dm = isDM(ctx.state, ctx.role);
  if (!rows.length && !dm) return "";
  return `<section class="jp-panel jp-relations"><h3>${ctx.t("Relazioni", "Relations")} (${rows.length})</h3>${rows.length ? `<ul class="jp-relation-list">${rows.map((row) => relationRow(ctx, row)).join("")}</ul>` : `<p class="campaign-meta">${ctx.t("Nessuna relazione.", "No relations.")}</p>`}${dm ? `<details class="jp-add-relation"><summary>${ctx.t("Aggiungi una relazione", "Add a relation")}</summary>${relationForm(ctx, `page:${page.id}`)}</details>` : ""}</section>`;
}
export function reputationScreen(ctx) {
  const dm = isDM(ctx.state, ctx.role);
  const people = subjects(ctx);
  const organizations = listPages(ctx.state, ctx.role, { type: "organization" });
  const all = standingsFor(ctx.state, ctx.role);
  const cell = (targetId, subject, kind) => {
    const row = all.find(
      (s) => s.targetId === targetId && s.subject === subject && s.kind === kind,
    );
    const text = row ? valueText(ctx, row) : "—";
    const hiddenTag =
      dm && row?.visibility === "hidden"
        ? ` <span class="badge">${ctx.t("Solo DM", "DM only")}</span>`
        : "";
    return `<td>${dm ? `<button type="button" class="button quiet jp-cell-button" data-jp-standing-change data-target="${ctx.esc(targetId)}" data-subject="${ctx.esc(subject)}" data-kind="${kind}" aria-label="${ctx.esc(`${ctx.t("Cambia", "Change")}: ${findPage(ctx.state, targetId)?.title} · ${people.find((p) => p.id === subject)?.name}`)}">${ctx.esc(text)}</button>${hiddenTag}` : ctx.esc(text)}</td>`;
  };
  const table = (rows, kind, caption) =>
    `<div class="table-wrap jp-table-wrap"><table class="jp-table"><caption>${caption}</caption><thead><tr><th scope="col">${kind === "attitude" ? (dm ? ctx.t("PNG importante", "Important NPC") : ctx.t("PNG", "NPC")) : ctx.t("Organizzazione", "Organization")}</th>${people.map((p) => `<th scope="col">${ctx.esc(p.name)}</th>`).join("")}</tr></thead><tbody>${rows.map((page) => `<tr><th scope="row"><button type="button" class="jp-link" data-jp-open="${ctx.esc(page.id)}">${ctx.esc(page.title)}</button></th>${people.map((p) => cell(page.id, p.id, kind)).join("")}</tr>`).join("")}</tbody></table></div>`;
  // The DM tracks the NPCs flagged important; a player sees the NPCs whose attitude the DM
  // shared, without the flag.
  const npcs = dm
    ? importantNpcs(ctx.state, ctx.role)
    : listPages(ctx.state, ctx.role, { type: "person" }).filter((page) =>
        all.some((row) => row.targetId === page.id && row.kind === "attitude"),
      );
  const recent = all
    .flatMap((row) => row.history.map((entry) => ({ entry, row })))
    .sort((a, b) => str(b.entry.at).localeCompare(str(a.entry.at)))
    .slice(0, 8);
  return `<div class="jp-reputation"><p class="campaign-meta">${dm ? ctx.t("Come la schermata del GM di Divinity 2: scegli una casella per cambiare punteggio o atteggiamento, sempre con un motivo. Le righe «Solo DM» restano tue finché non le condividi.", "Like the Divinity 2 GM screen: choose a cell to change a score or attitude, always with a reason. “DM only” rows stay yours until you share them.") : ctx.t("Ciò che il DM ha condiviso sulla reputazione del gruppo e dei personaggi.", "What the DM shared about the reputation of the party and its characters.")}</p>${organizations.length ? table(organizations, "reputation", ctx.t("Reputazione presso le organizzazioni", "Reputation with organizations")) : ""}${npcs.length ? table(npcs, "attitude", dm ? ctx.t("Atteggiamento dei PNG importanti (SRD 5.2.1)", "Attitude of important NPCs (SRD 5.2.1)") : ctx.t("Atteggiamento dei PNG verso il gruppo (SRD 5.2.1)", "Attitude of NPCs toward the party (SRD 5.2.1)")) : ""}<section class="jp-panel"><h3>${ctx.t("Cambiamenti recenti", "Recent changes")}</h3>${recent.length ? `<ul class="jp-history">${recent.map(({ entry, row }) => `<li><p><strong>${ctx.esc(findPage(ctx.state, row.targetId)?.title ?? "")}</strong> · ${ctx.esc(whoOf(ctx, row))} · <span class="campaign-meta">${ctx.esc(dateText(ctx, entry.at))}</span></p><p class="campaign-prose">${ctx.esc(entry.reason)}</p></li>`).join("")}</ul>` : `<p class="campaign-meta">${ctx.t("Nessun cambiamento condiviso.", "No shared change.")}</p>`}</section></div>`;
}
export function relationsScreen(ctx) {
  const rows = listRelations(ctx.state, ctx.role);
  const dm = isDM(ctx.state, ctx.role);
  return `<div class="jp-relations-screen"><p class="campaign-meta">${ctx.t("Elenco delle relazioni fra persone, organizzazioni, luoghi e personaggi. Le connessioni segrete restano al DM finché non le rivela.", "List of relations between people, organizations, places and characters. Secret connections stay with the DM until revealed.")}</p>${rows.length ? `<ul class="jp-relation-list">${rows.map((row) => relationRow(ctx, row)).join("")}</ul>` : `<p class="campaign-empty">${ctx.t("Nessuna relazione che puoi leggere.", "No relation you can read.")}</p>`}${dm ? `<section class="jp-panel"><h3>${ctx.t("Aggiungi una relazione", "Add a relation")}</h3>${relationForm(ctx, null)}</section>` : ""}</div>`;
}
/** Sheet box (Story tab): reputation and attitudes shared about this character. */
export function sheetReputation(ctx, actor) {
  if (!actor || actor.kind !== "character" || !isMember(ctx.state, ctx.role)) return "";
  const rows = standingsForActor(ctx.state, ctx.role, actor.id);
  if (!rows.length) return "";
  return `<section class="panel jp-sheet-box"><h2>${ctx.t("Reputazione e atteggiamenti", "Reputation and attitudes")}</h2><ul class="jp-standing-list">${rows.map((row) => standingRow(ctx, row, { withTarget: true })).join("")}</ul><button type="button" class="button quiet" data-jp-route="${ctx.esc(JSON.stringify({ page: "campaign", tab: ARCHIVE, id: "reputation" }))}">${ctx.t("Apri la reputazione nell’archivio", "Open reputation in the archive")}</button></section>`;
}

// ---- Dialogs and handlers

function openStandingDialog(ctx, { targetId, subject, kind }) {
  const target = findPage(ctx.state, targetId);
  if (!target) return;
  const current = dataOf(ctx.state).standings.find(
    (row) => row.targetId === targetId && row.subject === subject && row.kind === kind,
  );
  const who =
    subject === "party" ? ctx.t("il gruppo", "the party") : subjectName(ctx.state, subject);
  const valueField =
    kind === "attitude"
      ? `<fieldset class="jp-recipients"><legend>${ctx.t("Atteggiamento (SRD 5.2.1)", "Attitude (SRD 5.2.1)")}</legend>${ATTITUDES.map((row) => `<label class="campaign-check"><input type="radio" name="value" value="${row.id}" ${(current?.value ?? "indifferent") === row.id ? "checked" : ""}>${ctx.esc(ctx.label(row.label))} · <span class="campaign-meta">${ctx.esc(ctx.label(row.rule))}</span></label>`).join("")}</fieldset>`
      : `<label class="field">${ctx.t("Nuovo punteggio, da −10 a +10", "New score, from −10 to +10")}<input type="number" name="value" min="${REP_MIN}" max="${REP_MAX}" step="1" value="${current?.value ?? 0}" required></label><p class="campaign-meta">${TIERS.map((tier) => `${ctx.esc(ctx.label(tier.label))} ${tier.min}…${tier.max}`).join(" · ")}</p>`;
  ctx.dialog(
    `${target.title} · ${who}`,
    `${valueField}<label class="field">${ctx.t("Motivo (resta nello storico)", "Reason (kept in the history)")}<textarea name="reason" rows="3" maxlength="300" required></textarea></label><label class="field">${ctx.t("Chi la vede", "Who sees it")}<select name="visibility">${VISIBILITY[kind].map((value) => `<option value="${value}" ${(current?.visibility ?? "hidden") === value ? "selected" : ""}>${ctx.esc(value === "full" && kind === "attitude" ? ctx.t("Condivisa con il gruppo", "Shared with the party") : visibilityLabel(ctx, value))}</option>`).join("")}</select></label>`,
    {
      submitLabel: ctx.t("Registra", "Record"),
      onSubmit: (formData) =>
        change(
          ctx,
          kind === "attitude"
            ? ctx.t("Atteggiamento registrato", "Attitude recorded")
            : ctx.t("Reputazione registrata", "Reputation recorded"),
          (draft) =>
            changeStanding(draft, ctx.role, {
              targetId,
              subject,
              kind,
              value:
                kind === "attitude"
                  ? String(formData.get("value") ?? "")
                  : Number(formData.get("value")),
              reason: String(formData.get("reason") ?? ""),
              visibility: String(formData.get("visibility") ?? "hidden"),
            }),
        ),
    },
  );
}
function openCorrection(ctx, id) {
  ctx.dialog(
    ctx.t("Correggi l’ultimo cambiamento", "Correct the latest change"),
    `<p>${ctx.t("Il valore torna quello precedente. Entrambe le righe restano nello storico.", "The value returns to the previous one. Both rows stay in the history.")}</p><label class="field">${ctx.t("Motivo della correzione", "Reason for the correction")}<textarea name="reason" rows="3" maxlength="300" required></textarea></label>`,
    {
      submitLabel: ctx.t("Correggi", "Correct"),
      onSubmit: (formData) =>
        change(ctx, ctx.t("Reputazione corretta", "Reputation corrected"), (draft) =>
          correctStanding(draft, ctx.role, id, String(formData.get("reason") ?? "")),
        ),
    },
  );
}
function openRelationReveal(ctx, id) {
  const relation = dataOf(ctx.state).relations.find((row) => row.id === id);
  if (!relation) return;
  ctx.dialog(
    ctx.t("Rivela la connessione segreta", "Reveal the secret connection"),
    `${recipientsFields(ctx, relation.reveal.mode === "none" ? { mode: "all", actorIds: [] } : relation.reveal, { allowNone: false, legend: ctx.t("A chi rivelarla", "Reveal it to") })}`,
    {
      submitLabel: ctx.t("Rivela", "Reveal"),
      onSubmit: (formData) =>
        change(ctx, ctx.t("Connessione rivelata", "Connection revealed"), (draft) =>
          revealRelation(draft, ctx.role, id, readRecipients(formData)),
        ),
    },
  );
}
const parseEnd = (value) => {
  const text = String(value ?? "");
  const split = text.indexOf(":");
  return split > 0 ? { kind: text.slice(0, split), id: text.slice(split + 1) } : null;
};
export function bindFactions(root, ctx) {
  root.querySelectorAll("[data-jp-standing-change]").forEach((button) => {
    button.onclick = () =>
      openStandingDialog(ctx, {
        targetId: button.dataset.target,
        subject: button.dataset.subject,
        kind: button.dataset.kind,
      });
  });
  root.querySelectorAll("[data-jp-standing-add]").forEach((button) => {
    button.onclick = () => {
      const select = root.querySelector(
        `[data-jp-standing-subject="${button.dataset.jpStandingAdd}"]`,
      );
      openStandingDialog(ctx, {
        targetId: button.dataset.jpStandingAdd,
        subject: select?.value || "party",
        kind: button.dataset.kind,
      });
    };
  });
  root.querySelectorAll("[data-jp-standing-visibility]").forEach((select) => {
    select.onchange = () =>
      attempt(ctx, () =>
        change(
          ctx,
          ctx.t("Visibilità della reputazione cambiata", "Reputation visibility changed"),
          (draft) =>
            setStandingVisibility(
              draft,
              ctx.role,
              select.dataset.jpStandingVisibility,
              select.value,
            ),
        ),
      );
  });
  root.querySelectorAll("[data-jp-standing-correct]").forEach((button) => {
    button.onclick = () => openCorrection(ctx, button.dataset.jpStandingCorrect);
  });
  root.querySelectorAll("[data-jp-relation-reveal]").forEach((button) => {
    button.onclick = () => openRelationReveal(ctx, button.dataset.jpRelationReveal);
  });
  root.querySelectorAll("[data-jp-relation-hide]").forEach((button) => {
    button.onclick = () =>
      attempt(ctx, () =>
        change(ctx, ctx.t("Connessione nascosta", "Connection hidden"), (draft) =>
          hideRelation(draft, ctx.role, button.dataset.jpRelationHide),
        ),
      );
  });
  root.querySelectorAll("[data-jp-relation-remove]").forEach((button) => {
    button.onclick = () =>
      attempt(ctx, () =>
        change(ctx, ctx.t("Relazione rimossa", "Relation removed"), (draft) =>
          removeRelation(draft, ctx.role, button.dataset.jpRelationRemove),
        ),
      );
  });
  root.querySelectorAll("[data-jp-relation-form]").forEach((form) => {
    form.onsubmit = (event) => {
      event.preventDefault();
      const data = new FormData(form);
      attempt(ctx, () =>
        change(ctx, ctx.t("Relazione aggiunta", "Relation added"), (draft) =>
          addRelation(draft, ctx.role, {
            from: parseEnd(data.get("from")),
            to: parseEnd(data.get("to")),
            label: String(data.get("label") ?? ""),
            secret: data.get("secret") === "on",
          }),
        ),
      );
    };
  });
}
