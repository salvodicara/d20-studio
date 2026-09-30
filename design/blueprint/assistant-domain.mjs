// B60 — Simulated AI assistant for DMs and players: pure domain rules.
//
// DECLARED SIMULATION (census SV-43…SV-46, GAP-18 stays an owner decision for the real
// product): no model, no network, no cost. Every answer is deterministic extraction
// from campaign data the reader may already read, with numbered citations.
//
// Adopted patterns (changes/interview-01/market-census/*.md):
// - Archivist "Ask", answers only from what the asker may see and never edits entries
//   (SVC-090); Session Review before sharing: summary, beats on three levels (Major,
//   Minor, Steps) and entities, the summary re-run with a custom prompt (SVC-086–089).
// - Quest Portal AI notes: theme + prompt + context, Keep / Try again / Discard
//   (VTL-217); generate a character from a prompt (VTL-218); Library Link answers that
//   cite the page used, a click opens it (VTL-197).
// - Saga20: in-character and out-of-character talk kept apart, narrative or quick
//   reference output (SVC-093), declared retention (SVC-155). Craig: visible consent
//   signal (SVC-096). Phil's AI Assistant: a prompt built from world data to paste into
//   the user's own model, with no API key (SVC-099).
//
// Sources: campaign entries (journal, world, objectives, shared notes) through the
// campaign-content projection; handouts through the handouts projection; chat messages
// and discussion posts (same reader rule as chat-domain canSee); shared, uncorrected
// Table log entries. Always excluded: "Only me" notes and sections, private log entries,
// actor sheets, content of members who have not given consent.

import {
  campaignMembers,
  getCampaignEntry,
  isCampaignMember,
  listCampaignEntries,
} from "./campaign-content.mjs";
import { isPlayEvent } from "./campaign-sessions.mjs";
import { canViewActor, isCampaignActor } from "./character-access.mjs";
import { canReadMaterial, projectMaterial } from "./handouts-domain.mjs";
import { getHomebrewRevision, getHomebrewTypes } from "./homebrew.mjs";
import {
  CATEGORIES,
  EDITION,
  REVISION,
  categoryEntries,
  getEntry,
  kindLabel,
  sourceFor,
} from "./srd-compendium.mjs";

export const SLICE = "assistant";
export const VERSION = 1;
export const MAX_QUESTION = 300;
export const MAX_PROMPT = 300;
export const MAX_HISTORY = 30;
export const MAX_EXTERNAL = 4000;
export const MAX_BEAT = 400;
export const MAX_SUMMARY = 2000;
export const MAX_REASON = 200;
export const LABEL_PREFIXES = Object.freeze(["Assistente · ", "Assistant · "]);
// Chat commits carry this prefix (chat-domain LABEL_PREFIX): they are messages, not events.
const CHAT_PREFIX = "Chat · ";
// B14 keeps the automatic story of an ended session here (session-view STORIES).
const STORIES = "session-view-stories";
export const SOURCE_KINDS = Object.freeze(["journal", "materials", "chat", "log", "rules"]);
// A member's choice; no record means "pending" (not asked yet).
export const CONSENT = Object.freeze(["given", "declined", "revoked"]);
// The personal engine setting (registry "core-settings", scope personal).
const ENGINE_KEY = "assistant-engine.engine";
export const THEMES = Object.freeze(["summary", "hook", "npc"]);
export const LEVELS = Object.freeze([0, 1, 2]);
export const ENTITY_KINDS = Object.freeze(["person", "place", "item", "other"]);
export const SIMULATION = Object.freeze({
  kind: "authored-demo",
  revision: "blueprint-b60-assistant-1",
  note: "Deterministic extractive templates; no model, no network.",
});

const L = (it, en) => ({ it, en });
const clone = (value) => structuredClone(value);
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const str = (value) => (typeof value === "string" ? value : "");
const uid = () => globalThis.crypto?.randomUUID?.() ?? `as-${Date.now()}-${Math.random()}`;
const iso = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
/** A refusal with its Italian and English text (the shell shows it as it is). */
export function fail(it, en) {
  throw Object.assign(new Error(en), { it, en });
}

// ------------------------------------------------------------------------ slice

const defaultSources = () => ({
  journal: true,
  materials: true,
  chat: true,
  log: true,
  rules: true,
});
const campaignSeed = () => ({
  enabled: false,
  enabledBy: null,
  enabledAt: null,
  sources: defaultSources(),
  consent: {},
  events: [],
});
export const seedAssistant = () => ({ campaigns: {}, history: {}, reviews: [] });

function normalizeCampaign(raw) {
  const base = campaignSeed();
  if (!object(raw)) return base;
  base.enabled = raw.enabled === true;
  base.enabledBy = str(raw.enabledBy) || null;
  base.enabledAt = iso(raw.enabledAt);
  for (const kind of SOURCE_KINDS) base.sources[kind] = raw.sources?.[kind] !== false;
  if (object(raw.consent))
    for (const [id, row] of Object.entries(raw.consent))
      if (object(row) && CONSENT.includes(row.status))
        base.consent[id] = {
          status: row.status,
          at: iso(row.at),
          ...(row.external === false ? { external: false } : {}),
          ...(str(row.reason) ? { reason: str(row.reason).slice(0, MAX_REASON) } : {}),
        };
  base.events = (Array.isArray(raw.events) ? raw.events : [])
    .filter((row) => object(row) && typeof row.kind === "string")
    .slice(-50)
    .map((row) => clone(row));
  return base;
}
/** Idempotent normalization; saved data from a newer version is refused. */
export function normalizeAssistant(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Assistant data comes from a newer version");
  const raw = object(slice) ? slice : {};
  const campaigns = {};
  if (object(raw.campaigns))
    for (const [id, row] of Object.entries(raw.campaigns)) campaigns[id] = normalizeCampaign(row);
  const history = {};
  if (object(raw.history))
    for (const [id, rows] of Object.entries(raw.history))
      if (Array.isArray(rows))
        history[id] = rows
          .filter((row) => object(row) && typeof row.id === "string" && row.kind)
          .slice(-MAX_HISTORY)
          .map((row) => clone(row));
  const reviews = (Array.isArray(raw.reviews) ? raw.reviews : [])
    .filter((row) => object(row) && typeof row.id === "string" && Array.isArray(row.beats))
    .map((row) => clone(row));
  // SV-46: each member's local model connection (only valid local addresses survive).
  const local = {};
  if (object(raw.local))
    for (const [id, row] of Object.entries(raw.local))
      if (object(row) && localEndpointCheck(row.endpoint).ok && typeof row.model === "string")
        local[id] = clone(row);
  return { campaigns, history, reviews, ...(Object.keys(local).length ? { local } : {}) };
}

export function campaignRecord(slice, campaignId) {
  return normalizeCampaign(slice?.campaigns?.[campaignId]);
}
function writableRecord(slice, campaignId) {
  slice.campaigns ??= {};
  slice.campaigns[campaignId] = normalizeCampaign(slice.campaigns[campaignId]);
  return slice.campaigns[campaignId];
}
function audit(record, kind, by, at, extra = {}) {
  record.events.push({ id: uid(), kind, by, at, ...extra });
  record.events = record.events.slice(-50);
}
function requireMember(state, viewer) {
  const campaignId = state.campaign?.id;
  if (!campaignId || !isCampaignMember(state, campaignId, viewer))
    fail(
      "Solo i membri della campagna usano l’assistente.",
      "Only campaign members use the assistant.",
    );
  return campaignId;
}
export function isDm(state, viewer) {
  return campaignMembers(state).some(
    (member) => member.id === viewer && ["dm", "co-dm"].includes(member.role),
  );
}
function requireDm(state, viewer) {
  if (!isDm(state, viewer)) fail("Solo il DM può farlo.", "Only the DM can do this.");
}
function requireEnabled(state, slice) {
  const campaignId = state.campaign?.id;
  if (!campaignRecord(slice, campaignId).enabled)
    fail(
      "L’assistente non è attivo in questa campagna: il DM può attivarlo in Consenso e dati.",
      "The assistant is not active in this campaign: the DM can turn it on in Consent and data.",
    );
  return campaignId;
}

// ---------------------------------------------------------------- consent (per campaign)

/** DM turns the assistant on for the campaign; enabling records the DM's own consent. */
export function enableAssistant(
  state,
  slice,
  viewer,
  { sources, at = new Date().toISOString() } = {},
) {
  const campaignId = requireMember(state, viewer);
  requireDm(state, viewer);
  const record = writableRecord(slice, campaignId);
  if (record.enabled) return clone(record);
  record.enabled = true;
  record.enabledBy = viewer;
  record.enabledAt = at;
  if (object(sources))
    for (const kind of SOURCE_KINDS) record.sources[kind] = sources[kind] !== false;
  record.consent[viewer] = { status: "given", at };
  audit(record, "enabled", viewer, at);
  return clone(record);
}
export function disableAssistant(
  state,
  slice,
  viewer,
  { reason = "", at = new Date().toISOString() } = {},
) {
  const campaignId = requireMember(state, viewer);
  requireDm(state, viewer);
  const record = writableRecord(slice, campaignId);
  if (!record.enabled) return clone(record);
  record.enabled = false;
  audit(
    record,
    "disabled",
    viewer,
    at,
    reason ? { reason: str(reason).trim().slice(0, MAX_REASON) } : {},
  );
  return clone(record);
}
export function setSources(state, slice, viewer, sources, at = new Date().toISOString()) {
  const campaignId = requireMember(state, viewer);
  requireDm(state, viewer);
  const record = writableRecord(slice, campaignId);
  if (!object(sources)) fail("Fonti non valide.", "Invalid sources.");
  const next = Object.fromEntries(SOURCE_KINDS.map((kind) => [kind, sources[kind] !== false]));
  if (!Object.values(next).some(Boolean))
    fail("Lascia almeno un tipo di fonte.", "Keep at least one kind of source.");
  record.sources = next;
  audit(record, "sources", viewer, at, { sources: clone(next) });
  return clone(record);
}
export function giveConsent(state, slice, viewer, at = new Date().toISOString()) {
  const campaignId = requireMember(state, viewer);
  const record = writableRecord(slice, campaignId);
  const external = record.consent[viewer]?.external;
  record.consent[viewer] = { status: "given", at, ...(external === false ? { external } : {}) };
  audit(record, "consent", viewer, at);
  return clone(record);
}
/**
 * "No" is as easy as "yes" (Craig's consent signal, SVC-096): the member's content stays
 * out, the prompt stops asking, and the choice can be changed later.
 */
export function declineConsent(state, slice, viewer, at = new Date().toISOString()) {
  const campaignId = requireMember(state, viewer);
  const record = writableRecord(slice, campaignId);
  const external = record.consent[viewer]?.external;
  record.consent[viewer] = { status: "declined", at, ...(external === false ? { external } : {}) };
  audit(record, "declined", viewer, at);
  return clone(record);
}
/**
 * Whether a member's consented content may also go into prompts that other members copy
 * into their own external model (SV-46). Included by default, as the consent text says.
 */
export function setExternalConsent(state, slice, viewer, allowed, at = new Date().toISOString()) {
  const campaignId = requireMember(state, viewer);
  const record = writableRecord(slice, campaignId);
  const row = record.consent[viewer];
  if (row?.status !== "given") fail("Prima dai il consenso.", "Give consent first.");
  if (allowed) delete row.external;
  else row.external = false;
  audit(record, "external", viewer, at, { allowed: Boolean(allowed) });
  return clone(record);
}
/** A member's answer engine (their personal setting): "demo", "external" or "local". */
export function engineOf(state, memberId) {
  const value = state?.ext?.["core-settings"]?.personal?.[memberId]?.[ENGINE_KEY];
  return value === "external" || value === "local" ? value : "demo";
}
/** Withdrawal applies to future answers and drafts; published recaps stay until withdrawn. */
export function revokeConsent(
  state,
  slice,
  viewer,
  { reason = "", at = new Date().toISOString() } = {},
) {
  const campaignId = requireMember(state, viewer);
  const record = writableRecord(slice, campaignId);
  const why = str(reason).trim().slice(0, MAX_REASON);
  const external = record.consent[viewer]?.external;
  record.consent[viewer] = {
    status: "revoked",
    at,
    ...(external === false ? { external } : {}),
    ...(why ? { reason: why } : {}),
  };
  audit(record, "revoked", viewer, at, why ? { reason: why } : {});
  return clone(record);
}
export function consentOf(slice, campaignId, memberId) {
  return campaignRecord(slice, campaignId).consent[memberId]?.status ?? "pending";
}
/** Every active member with their consent state, for the consent panel. */
export function consentList(state, slice) {
  const campaignId = state.campaign?.id;
  const record = campaignRecord(slice, campaignId);
  return campaignMembers(state, campaignId).map((member) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    status: record.consent[member.id]?.status ?? "pending",
    at: record.consent[member.id]?.at ?? null,
    external: record.consent[member.id]?.external !== false,
    engine: engineOf(state, member.id),
  }));
}

// ---------------------------------------------------------------- text utilities

const STOP = new Set(
  (
    "chi che cosa come dove quando perche quale quali quanto quanta il lo la gli le un uno una di da " +
    "in con su per tra fra non del della dello dei delle degli al allo alla ai alle dal dalla dai " +
    "dalle nel nella nei nelle sul sulla sui sulle era sono stato stata stati hanno abbiamo avete " +
    "noi voi loro lui lei questo questa questi queste quello quella quelli quelle cui sai sappiamo " +
    "detto dice fatto qual piu anche ancora gia poi ecco mio mia tuo tua suo sua nostro nostra " +
    "who what where when why how which the and but are was were been has have had does did " +
    "you they she this that these those about know known tell our from not any can could " +
    "would should there their them its his her"
  ).split(/\s+/),
);
/** Lowercase letters/digits without accents: "Perché l’ha" -> ["perche", "l", "ha"]. */
export function words(text) {
  return str(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
/** Content words cut to a short stem, so "lanterna" meets "lanterne" and "riaccesa" "riacceso". */
export function stems(text) {
  return [
    ...new Set(
      words(text)
        .filter((word) => word.length >= 3 && !STOP.has(word))
        .map((word) =>
          word.length >= 7 ? word.slice(0, 5) : word.length >= 5 ? word.slice(0, -1) : word,
        ),
    ),
  ];
}
/** Sentences of a text; a quotation («…», “…”) is never cut in the middle. */
export function sentences(text) {
  const rows = [];
  for (const line of str(text).split(/\n+/)) {
    let depth = 0;
    let start = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === "«" || ch === "“") depth++;
      else if ((ch === "»" || ch === "”") && depth > 0) depth--;
      else if (depth === 0 && /[.!?…]/.test(ch) && /\s/.test(line[i + 1] ?? "")) {
        rows.push(line.slice(start, i + 1));
        start = i + 1;
      }
    }
    rows.push(line.slice(start));
  }
  return rows
    .map((row) => row.trim())
    .filter((row) => row.length > 1)
    .map((row) => (row.length > 320 ? row.slice(0, 319).trimEnd() + "…" : row));
}
const labelOf = (value) => (object(value) ? value : L(str(value), str(value)));
const HEADINGS = new Set([
  "fonti",
  "sources",
  "momenti principali",
  "key moments",
  "riassunto:",
  "summary:",
]);
/**
 * Readable prose of an entry: an earlier answer or recap kept in the journal carries its
 * own [n] markers, bullets, source list and provenance line; they are not facts.
 */
export function entryText(text) {
  return str(text)
    .split(/\n/)
    .filter((line) => !/^\s*\[\d+\]\s/.test(line))
    .map((line) =>
      line
        .replace(/^\s*[•–·*-]\s+/, "")
        .replace(/\s*\[\d+\]/g, "")
        .trim(),
    )
    .filter(
      (line) =>
        line &&
        !HEADINGS.has(line.toLowerCase()) &&
        !/^(Persone, luoghi e cose|People, places and things):/.test(line) &&
        !/(assistente \(simulazione\)|assistant \(simulation\))/i.test(line),
    )
    .join("\n");
}

// ---------------------------------------------------------------- sources

const KIND_ORDER = { entry: 0, material: 1, chat: 2, forum: 3, log: 4, rule: 5 };
const ENTRY_TYPES = {
  note: L("Appunto condiviso", "Shared note"),
  world: L("Mondo", "World"),
  quest: L("Obiettivo", "Objective"),
  recap: L("Resoconto", "Recap"),
};
function memberLabel(state, id) {
  const member = campaignMembers(state).find((row) => row.id === id);
  if (!member) return L(str(id) || "?", str(id) || "?");
  if (["dm", "co-dm"].includes(member.role)) return L("DM", "DM");
  const [it, en] = str(member.name).includes(" / ")
    ? member.name.split(" / ")
    : [member.name, member.name];
  return L(it || id, en || id);
}
function speakerOf(state, message) {
  const speaker = message.speaker ?? {};
  if (speaker.type === "actor") return state.actors?.[speaker.actorId]?.name ?? speaker.name ?? "?";
  if (speaker.type === "npc") return str(speaker.name) || "?";
  if (speaker.type === "user") return memberLabel(state, speaker.id).it;
  return null;
}
function readableEntry(state, id, viewer) {
  try {
    return getCampaignEntry(state, id, viewer);
  } catch {
    return null;
  }
}
function dmMember(state) {
  return campaignMembers(state).find((member) => ["dm", "co-dm"].includes(member.role))?.id ?? "dm";
}

// ---------------------------------------------------------------- rules (SRD 5.2.1)

let srdCache = null;
/** Every compendium entry of the SRD 5.2.1 sample (B16), in catalogue order. */
function srdEntries() {
  srdCache ??= CATEGORIES.flatMap((category) => categoryEntries(category.id));
  return srdCache;
}
const pickLang = (value, lang) =>
  object(value) ? (lang === "en" ? value.en || value.it : value.it || value.en) || "" : str(value);
/** "SRD 5.2.1 IT p. 212", the official location of a compendium entry in that language. */
function srdLocation(entry, lang) {
  const at = sourceFor(entry, lang);
  const pages = at?.pages?.length ? ` p. ${at.pages.join(", ")}` : "";
  return lang === "en"
    ? `SRD ${REVISION} EN${pages} · app summary`
    : `SRD ${REVISION} IT${pages} · riassunto dell’app`;
}
/**
 * Rules sources (Quest Portal Library Link, VTL-197; SVC-097): SRD 5.2.1 compendium
 * entries with their official page, and homebrew the DM enabled in this campaign that
 * the viewer may read. A rules source answers only when the question names it.
 */
/** One SRD 5.2.1 compendium entry as a rules source (its official page, app summary). */
function srdRow(entry, lang) {
  const name = pickLang(entry.name, lang);
  const summary = pickLang(entry.summary, lang);
  if (!name || !summary) return null;
  const kind = kindLabel(entry);
  return {
    key: `rule:${entry.id}`,
    kind: "rule",
    id: entry.id,
    title: L(pickLang(entry.name, "it"), pickLang(entry.name, "en")),
    type: L(`Compendio SRD ${REVISION} · ${kind.it}`, `SRD ${REVISION} compendium · ${kind.en}`),
    text: `${name}: ${summary}`,
    at: null,
    author: null,
    restricted: null,
    recap: null,
    edition: entry.source?.edition ?? EDITION,
    location: L(srdLocation(entry, "it"), srdLocation(entry, "en")),
    route: { page: "library", tab: "compendium", revision: entry.id },
  };
}
function rulesSources(state, viewer, lang) {
  const rows = [];
  for (const entry of srdEntries()) {
    const row = srdRow(entry, lang);
    if (row) rows.push(row);
  }
  const types = new Map(getHomebrewTypes().map((type) => [type.id, type.name]));
  for (const ref of state.campaign?.enabledContent ?? []) {
    let revision = null;
    try {
      revision = getHomebrewRevision(state, ref, viewer);
    } catch {
      continue;
    }
    const name = pickLang(revision.data?.name, lang);
    const description = pickLang(revision.data?.description, lang);
    if (!name || !description) continue;
    const type = types.get(revision.type) ?? L("Contenuto", "Content");
    const origin = str(revision.data?.source?.label).trim();
    rows.push({
      key: `rule:homebrew:${ref.contentId}/${ref.revisionId}`,
      kind: "rule",
      id: ref.contentId,
      title: L(pickLang(revision.data.name, "it"), pickLang(revision.data.name, "en")),
      type: L(`Homebrew della campagna · ${type.it}`, `Campaign homebrew · ${type.en}`),
      text: `${name}: ${description}`,
      at: null,
      author: revision.owner ?? null,
      restricted: null,
      recap: null,
      edition: revision.data?.source?.edition ?? EDITION,
      location: L(
        `Homebrew · revisione abilitata nella campagna${origin ? ` · ${origin}` : ""}`,
        `Homebrew · revision enabled in the campaign${origin ? ` · ${origin}` : ""}`,
      ),
      route: {
        page: "library",
        tab: "campaign",
        id: ref.contentId,
        revision: ref.revisionId,
      },
    });
  }
  return rows;
}

/**
 * Sources the assistant may use. `audience: "self"` = what `viewer` may read (Ask,
 * assisted writing); `audience: "campaign"` = what every active member may read, public
 * and in character (a recap to share). Returns {sources, excluded, record}.
 * Sources are {key, kind, id, title, type, text, at, author, restricted, recap, route}.
 * `lang` picks the language of rules summaries (campaign text keeps its own language).
 */
export function collectSources(
  state,
  slice,
  viewer,
  { audience = "self", lang = "it", external = false } = {},
) {
  const campaignId = state.campaign?.id;
  const record = campaignRecord(slice, campaignId);
  const members = campaignMembers(state, campaignId);
  const memberIds = members.map((member) => member.id);
  const sources = [];
  const excluded = {
    personal: 0,
    restricted: 0,
    whisper: 0,
    offTable: 0,
    consent: {},
    external: {},
  };
  if (!campaignId || !memberIds.includes(viewer)) return { sources, excluded, record };
  const shared = audience === "campaign";
  // `external`: a prompt for the viewer's own model; authors who kept their content out
  // of external prompts are left out (and counted).
  const consented = (id) => {
    const row = record.consent[id];
    if (row?.status !== "given") return false;
    if (external && row.external === false) {
      excluded.external[id] = (excluded.external[id] ?? 0) + 1;
      return null;
    }
    return true;
  };
  const noConsent = (id) => (excluded.consent[id] = (excluded.consent[id] ?? 0) + 1);
  const add = (source) => sources.push(source);

  if (record.sources.journal)
    for (const entry of listCampaignEntries(state, { campaignId }, viewer)) {
      // "Only me" is never read, not even for its owner (card B60).
      if (entry.access?.mode === "private") {
        excluded.personal++;
        continue;
      }
      const views = memberIds.map((id) =>
        id === viewer ? entry : readableEntry(state, entry.id, id),
      );
      const everyone = views.every(Boolean);
      if (shared && !everyone) {
        excluded.restricted++;
        continue;
      }
      const allowed = consented(entry.ownerId);
      if (!allowed) {
        if (allowed === false) noConsent(entry.ownerId);
        continue;
      }
      const common = (section) =>
        section.access?.mode !== "private" &&
        (!shared || views.every((view) => view.data.sections.some((row) => row.id === section.id)));
      const sections = entry.data.sections.filter((section) => {
        if (section.access?.mode === "private") excluded.personal++;
        return common(section);
      });
      const text = [
        entryText(entry.data.body),
        ...sections.map((s) => [s.title, entryText(s.body)].filter(Boolean).join(". ")),
      ]
        .filter((row) => str(row).trim())
        .join("\n");
      add({
        key: `entry:${entry.id}`,
        kind: "entry",
        id: entry.id,
        title: entry.data.title ? L(entry.data.title, entry.data.title) : ENTRY_TYPES[entry.kind],
        type: ENTRY_TYPES[entry.kind] ?? ENTRY_TYPES.note,
        entryKind: entry.kind,
        worldType: entry.data.worldType,
        questStatus: entry.data.questStatus,
        text,
        at: iso(entry.updatedAt),
        author: entry.ownerId,
        restricted: everyone ? null : "some",
        // A recap is already a summary: it never feeds a later recap.
        recap: entry.kind === "recap" ? null : "minor",
        route: {
          page: entry.kind === "note" ? "notes" : "campaign",
          tab: "entry",
          id: entry.id,
        },
      });
    }

  if (record.sources.materials) {
    const dm = dmMember(state);
    for (const material of state.ext?.handouts?.materials ?? []) {
      const view = projectMaterial(state, material.id, viewer);
      if (!view) continue;
      const everyone = memberIds.every((id) => canReadMaterial(state, material, id));
      const dmParts = [
        material.dmNote,
        ...(material.sections ?? []).map((s) => (s.dmText ? `${s.heading}: ${s.dmText}` : "")),
      ].filter((row) => str(row).trim());
      if (shared && dmParts.length) excluded.restricted++;
      if (shared && !everyone) {
        excluded.restricted++;
        continue;
      }
      const allowed = consented(dm);
      if (!allowed) {
        if (allowed === false) noConsent(dm);
        continue;
      }
      const shows = (material.shows ?? []).map((show) => iso(show.at)).filter(Boolean);
      const playerText = [
        view.playerText,
        ...(view.sections ?? []).map((s) => (s.playerText ? `${s.heading}: ${s.playerText}` : "")),
      ].filter((row) => str(row).trim());
      if (playerText.length)
        add({
          key: `material:${material.id}`,
          kind: "material",
          id: material.id,
          title: L(material.title, material.title),
          type: L("Materiale", "Handout"),
          text: playerText.join("\n"),
          at: shows.at(-1) ?? iso(material.updatedAt),
          author: dm,
          restricted: everyone ? null : "some",
          recap: shows.length ? "major" : null,
          route: { page: "campaign", tab: "handouts", id: material.id },
        });
      if (!shared && viewer === dm && dmParts.length)
        add({
          key: `material:${material.id}:dm`,
          kind: "material",
          id: material.id,
          title: L(`${material.title} · note del DM`, `${material.title} · DM notes`),
          type: L("Nota del DM", "DM note"),
          text: dmParts.join("\n"),
          at: iso(material.updatedAt),
          author: dm,
          restricted: "dm",
          recap: null,
          route: { page: "campaign", tab: "handouts", id: material.id },
        });
    }
  }

  if (record.sources.chat) {
    const chat = state.ext?.chat;
    for (const message of chat?.messages ?? []) {
      if (message.removed || !["ic", "emote", "ooc", "desc"].includes(message.kind)) continue;
      if (!str(message.text).trim()) continue;
      // A message only its author reads ("Solo io (DM)", /w dm from the DM) is an "Only
      // me" note in the chat: never read, not even for its author (card B60).
      const selfOnly =
        message.to?.type === "self" ||
        (Array.isArray(message.readers) &&
          message.readers.length > 0 &&
          message.readers.every((id) => id === message.author));
      if (selfOnly) {
        if (message.author === viewer) excluded.personal++;
        continue;
      }
      // Same reader rule as chat-domain canSee: named readers, hidden only for DM and author.
      if (message.readers && !message.readers.includes(viewer)) continue;
      if (message.hidden && viewer !== "dm" && message.author !== viewer) continue;
      if (chat.clearedAt && message.at <= chat.clearedAt) continue;
      const whisper = Boolean(message.to || message.readers);
      const foreign = message.kind === "ic" && message.language && message.language !== "common";
      // A language the reader does not speak stays unreadable; only the DM reads them all.
      if (foreign && viewer !== "dm") continue;
      if (shared) {
        if (whisper || message.hidden || foreign) {
          excluded.whisper++;
          continue;
        }
        if (message.kind === "ooc") {
          excluded.offTable++;
          continue;
        }
      }
      const allowed = consented(message.author);
      if (!allowed) {
        if (allowed === false) noConsent(message.author);
        continue;
      }
      const speaker = speakerOf(state, message);
      const text =
        message.kind === "ic"
          ? `${speaker}: «${message.text}»`
          : message.kind === "emote"
            ? `${speaker} ${message.text}`
            : message.kind === "ooc"
              ? `${memberLabel(state, message.author).it}: ${message.text}`
              : message.text;
      const type =
        message.kind === "desc"
          ? L("Chat · narrazione", "Chat · narration")
          : message.kind === "ooc"
            ? L("Chat · fuori personaggio", "Chat · out of character")
            : L("Chat · in personaggio", "Chat · in character");
      add({
        key: `chat:${message.id}`,
        kind: "chat",
        id: message.id,
        title: speaker ? L(speaker, speaker) : type,
        type,
        chatKind: message.kind,
        text,
        at: iso(message.at),
        author: message.author,
        restricted: whisper ? "whisper" : message.hidden ? "dm" : null,
        recap: message.kind === "desc" ? "major" : message.kind === "ooc" ? null : "minor",
        // The archive scrolls to and highlights the message named by `id` (B17).
        route: { page: "campaign", tab: "chat-archive", id: message.id },
      });
    }
    for (const thread of chat?.forum?.threads ?? []) {
      if (thread.removed) continue;
      for (const post of thread.posts ?? []) {
        if (post.removed || !str(post.text).trim()) continue;
        if (shared) {
          excluded.offTable++;
          continue;
        }
        const allowed = consented(post.author);
        if (!allowed) {
          if (allowed === false) noConsent(post.author);
          continue;
        }
        add({
          key: `forum:${thread.id}:${post.id}`,
          kind: "forum",
          id: post.id,
          title: L(thread.title, thread.title),
          type: L("Discussione", "Discussion"),
          text: post.text,
          at: iso(post.at),
          author: post.author,
          restricted: null,
          recap: null,
          route: { page: "campaign", tab: "chat-forum", id: thread.id },
        });
      }
    }
  }

  if (record.sources.log) {
    const reverted = new Set(
      (state.log ?? [])
        .filter((entry) => entry?.kind === "correction")
        .map((entry) => entry.revertsId),
    );
    for (const entry of state.log ?? []) {
      if (!entry || entry.kind !== "change" || typeof entry.label !== "string") continue;
      if ([...LABEL_PREFIXES, CHAT_PREFIX].some((prefix) => entry.label.startsWith(prefix)))
        continue;
      // P9 SV-44: settings, integrations, account and drafts are not play: they never
      // become recap sources, moments or entities (Quest Portal recaps from play only).
      if (entry.visibility !== "private" && !isPlayEvent(entry)) continue;
      if (entry.visibility === "private") {
        if (entry.controller === viewer) excluded.personal++;
        continue;
      }
      if (reverted.has(entry.id)) continue;
      add({
        key: `log:${entry.id}`,
        kind: "log",
        id: entry.id,
        title: L("Registro del Tavolo", "Table log"),
        type: L("Registro del Tavolo", "Table log"),
        text: entry.label,
        at: iso(entry.time),
        author: entry.controller,
        restricted: null,
        recap: "step",
        route: { page: "table" },
      });
    }
  }
  // Rules are reference, not campaign events: they never enter a shared recap.
  if (record.sources.rules && !shared)
    for (const row of rulesSources(state, viewer, lang)) add(row);
  sources.sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      str(b.at).localeCompare(str(a.at)) ||
      a.key.localeCompare(b.key),
  );
  return { sources, excluded, record };
}
/** Whitespace-flattened text, so a quote spanning a line break still matches. */
const flat = (value) => str(value).replace(/\s+/g, " ").trim();
/**
 * Whether `text` still says `piece` (a sentence cut at 320 characters keeps its prefix).
 * Stored answers and recap drafts are re-checked with it: a sentence gone from its
 * source's current readable text is no longer shown, copied or published.
 */
export function says(text, piece) {
  const wanted = flat(piece).replace(/…$/, "").trim();
  return !wanted || flat(text).includes(wanted);
}
const readableText = (source) =>
  [source.title?.it, source.title?.en, source.text].filter(Boolean).join("\n");
/**
 * What the viewer may read right now, key -> current readable text (title included).
 * Stored answers are re-checked against it: a source gone hides its parts, and so does
 * a sentence the source no longer says to the viewer (a section made "Only me", a
 * handout text changed). SRD 5.2.1 entries are public reference in both languages.
 */
export function accessibleKeys(state, slice, viewer) {
  const { sources } = collectSources(state, slice, viewer);
  const map = new Map(sources.map((source) => [source.key, readableText(source)]));
  for (const lang of ["it", "en"])
    for (const row of rulesSources(state, viewer, lang)) {
      if (!row.key.startsWith("rule:srd") && !map.has(row.key)) continue;
      map.set(row.key, [map.get(row.key), readableText(row)].filter(Boolean).join("\n"));
    }
  return map;
}

// ---------------------------------------------------------------- extraction

function matchSentences(sources, queryStems) {
  const found = [];
  for (const source of sources) {
    const rule = source.kind === "rule";
    // A rules entry is named in both languages ("Prono" / "Prone").
    const titleStems = new Set(
      stems(
        rule ? `${source.title?.it ?? ""} ${source.title?.en ?? ""}` : (source.title?.it ?? ""),
      ),
    );
    const titleHits = queryStems.filter((q) => titleStems.has(q)).length;
    // Rules answer only when the question names the entry in full, in either language
    // ("Dardo incantato", "Prone"): a lookup, not a word hunt ("lanterna" alone does not
    // name "Lanterna schermabile").
    if (
      rule &&
      ![source.title?.it, source.title?.en].some((name) => {
        const own = stems(name);
        return own.length > 0 && own.every((s) => queryStems.includes(s));
      })
    )
      continue;
    sentences(source.text).forEach((sentence, index) => {
      const own = new Set(stems(sentence));
      const hits = queryStems.filter((q) => own.has(q)).length;
      if (!hits && !(titleHits && index === 0)) return;
      found.push({ source, sentence, index, score: hits * 2 + titleHits });
    });
  }
  return found.sort(
    (a, b) =>
      b.score - a.score ||
      KIND_ORDER[a.source.kind] - KIND_ORDER[b.source.kind] ||
      str(b.source.at).localeCompare(str(a.source.at)) ||
      a.source.key.localeCompare(b.source.key) ||
      a.index - b.index,
  );
}
/** Same word, or the same word with another ending (prono/prona, dardo/dardi). */
function sameWord(a, b) {
  if (a === b) return true;
  const min = Math.min(a.length, b.length);
  return (
    min >= 4 && Math.abs(a.length - b.length) <= 1 && a.slice(0, min - 1) === b.slice(0, min - 1)
  );
}
/**
 * Keeps a rules source only when the question names it word by word, in either language
 * ("Dardo incantato", "Prone"): stems are too loose for a lookup ("nascosto" is not
 * "Nascondersi"). Campaign sources pass unchanged.
 */
export function namedRules(sources, question) {
  const asked = words(question);
  return sources.filter((source) => {
    if (source.kind !== "rule") return true;
    return [source.title?.it, source.title?.en].some((name) => {
      const own = words(name).filter((word) => word.length >= 3 && !STOP.has(word));
      return own.length > 0 && own.every((word) => asked.some((other) => sameWord(word, other)));
    });
  });
}
/** Numbers sources in order of first use; returns {cite(source) -> n, citations}. */
function citer() {
  const citations = [];
  const cite = (source, excerpt) => {
    let row = citations.find((c) => c.key === source.key);
    if (!row) {
      row = {
        n: citations.length + 1,
        key: source.key,
        kind: source.kind,
        title: clone(labelOf(source.title)),
        type: clone(labelOf(source.type)),
        excerpt: [],
        at: source.at,
        restricted: source.restricted,
        ...(source.location ? { location: clone(source.location), edition: source.edition } : {}),
        route: clone(source.route),
      };
      citations.push(row);
    }
    if (excerpt && !row.excerpt.includes(excerpt) && row.excerpt.length < 3)
      row.excerpt.push(excerpt);
    return row.n;
  };
  return { cite, citations };
}
const quote = (text, cites) => ({ q: text, cites });
const said = (it, en) => ({ t: L(it, en) });

/**
 * Deterministic extractive answer. Try again (attempt > 0) prefers sentences not used
 * before; when there are none, the same substance comes back in a shorter form.
 */
export function answerFrom(sources, question, attempt = 0) {
  const q = stems(question);
  if (!q.length)
    fail(
      "Scrivi una domanda con almeno una parola significativa.",
      "Write a question with at least one meaningful word.",
    );
  const pool = matchSentences(namedRules(sources, question), q);
  const { cite, citations } = citer();
  if (!pool.length)
    return {
      found: false,
      parts: [
        said(
          "Non trovo nulla su questo nelle fonti che puoi leggere. L’assistente non inventa: prova con altre parole o chiedi al DM.",
          "I find nothing about this in the sources you can read. The assistant does not make things up: try other words or ask the DM.",
        ),
      ],
      citations,
      variant: "none",
    };
  const offset = attempt * 3;
  if (attempt > 0 && offset >= pool.length) {
    const [best, ...rest] = pool;
    const parts = [
      said("In breve:", "In short:"),
      quote(best.sentence, [cite(best.source, best.sentence)]),
    ];
    const also = [...new Set(rest.slice(0, 3).map((row) => cite(row.source, row.sentence)))].filter(
      (n) => n !== parts[1].cites[0],
    );
    if (also.length)
      parts.push(
        said(
          "Le fonti accessibili non dicono altro; vedi anche:",
          "The accessible sources say nothing more; see also:",
        ),
        { cites: also },
      );
    else
      parts.push(
        said(
          "Le fonti accessibili non contengono altro su questo.",
          "The accessible sources contain nothing more on this.",
        ),
      );
    return { found: true, parts, citations, variant: "short" };
  }
  const chosen = pool.slice(offset, offset + 3);
  const intro =
    attempt === 0
      ? said("Dalle fonti che puoi leggere:", "From the sources you can read:")
      : said("Altre fonti accessibili dicono:", "Other accessible sources say:");
  return {
    found: true,
    parts: [intro, ...chosen.map((row) => quote(row.sentence, [cite(row.source, row.sentence)]))],
    citations,
    variant: attempt === 0 ? "main" : "more",
  };
}

// ---------------------------------------------------------------- personal history

function historyOf(slice, viewer) {
  slice.history ??= {};
  return (slice.history[viewer] ??= []);
}
function pushHistory(slice, viewer, row) {
  const rows = historyOf(slice, viewer);
  rows.push(row);
  while (rows.length > MAX_HISTORY) rows.shift();
  return row;
}
export function findHistory(slice, viewer, id) {
  const row = slice?.history?.[viewer]?.find((entry) => entry.id === id);
  if (!row) fail("Risposta non trovata.", "Answer not found.");
  return row;
}
function cleanQuestion(question, max = MAX_QUESTION) {
  const text = str(question).replace(/\s+/g, " ").trim();
  if (!text) fail("Scrivi una domanda.", "Write a question.");
  if (text.length > max) fail(`Al massimo ${max} caratteri.`, `At most ${max} characters.`);
  return text;
}

/**
 * Ask (SVC-090): an answer only from sources the asker may read, stored privately. With
 * `engine: "local"` (SV-46) the asker's local model connection is required and the answer,
 * still made by the demo generator in this browser, is labelled as simulated; like any model
 * outside the app it leaves out authors who kept their content out of external prompts.
 */
export function ask(
  state,
  slice,
  viewer,
  question,
  { id = uid(), at = new Date().toISOString(), lang = "it", engine = "demo" } = {},
) {
  requireMember(state, viewer);
  const campaignId = requireEnabled(state, slice);
  const text = cleanQuestion(question);
  const local = engine === "local" ? requireLocalModel(slice, viewer) : null;
  const { sources } = collectSources(state, slice, viewer, { lang, external: Boolean(local) });
  const answer = answerFrom(sources, text, 0);
  return clone(
    pushHistory(slice, viewer, {
      id,
      kind: "ask",
      campaignId,
      engine: local ? "local" : "demo",
      ...(local ? { local: { endpoint: local.endpoint, model: local.model } } : {}),
      question: text,
      at,
      lang,
      attempt: 0,
      status: "proposed",
      answer: { found: answer.found, parts: answer.parts, variant: answer.variant },
      citations: answer.citations,
    }),
  );
}

/** Try again (VTL-217): a new deterministic attempt on the same request. */
export function retry(state, slice, viewer, id, { at = new Date().toISOString() } = {}) {
  requireMember(state, viewer);
  requireEnabled(state, slice);
  const row = findHistory(slice, viewer, id);
  if (row.status === "discarded")
    fail("Ripristina prima la proposta.", "Restore the proposal first.");
  if (row.engine !== "demo" && row.engine !== "local")
    fail("Questa risposta viene dal tuo modello.", "This answer comes from your own model.");
  if (row.engine === "local") requireLocalModel(slice, viewer);
  const attempt = (row.attempt ?? 0) + 1;
  const result =
    row.kind === "ask"
      ? answerFrom(
          collectSources(state, slice, viewer, {
            lang: row.lang,
            external: row.engine === "local",
          }).sources,
          row.question,
          attempt,
        )
      : compose(state, slice, viewer, row.request, attempt, row.lang);
  row.attempt = attempt;
  row.at = at;
  row.status = "proposed";
  row.answer = { found: result.found, parts: result.parts, variant: result.variant };
  row.citations = result.citations;
  if (result.npc) row.npc = result.npc;
  return clone(row);
}
/** Keep: `how` says whether it became a new note draft or was inserted into one. */
export function keep(
  slice,
  viewer,
  id,
  { draftId = null, how = "note", at = new Date().toISOString() } = {},
) {
  const row = findHistory(slice, viewer, id);
  if (row.status === "discarded")
    fail("Ripristina prima la proposta.", "Restore the proposal first.");
  if (row.engine === "external" && !row.answer)
    fail("Incolla prima la risposta del tuo modello.", "Paste your model’s answer first.");
  row.status = "kept";
  row.keptAt = at;
  row.keptHow = how === "inserted" ? "inserted" : "note";
  if (draftId) row.keptDraftId = draftId;
  return clone(row);
}
export function discard(slice, viewer, id, at = new Date().toISOString()) {
  const row = findHistory(slice, viewer, id);
  row.previousStatus = row.status === "discarded" ? row.previousStatus : row.status;
  row.status = "discarded";
  row.discardedAt = at;
  return clone(row);
}
export function restore(slice, viewer, id) {
  const row = findHistory(slice, viewer, id);
  if (row.status !== "discarded") return clone(row);
  row.status =
    row.previousStatus && row.previousStatus !== "discarded" ? row.previousStatus : "proposed";
  delete row.discardedAt;
  return clone(row);
}
/** Declared retention (SVC-155): the identity's history is deleted on request. */
export function clearHistory(slice, viewer) {
  const count = slice.history?.[viewer]?.length ?? 0;
  if (slice.history) delete slice.history[viewer];
  return count;
}

/**
 * The stored row as the viewer may see it now (no stale copy of revoked text):
 * - a citation whose source is no longer readable is replaced by "no longer accessible";
 * - an excerpt the source no longer says to the viewer is dropped (a citation left with
 *   none is marked `changed`);
 * - a quoted part is hidden unless one of its sources is readable and still says it;
 *   an answer pasted from the user's own model is hidden when any source it cites is
 *   gone or changed; link names survive only when a visible quote still names them;
 * - the prompt for the user's own model is withheld when any of its sources changed.
 * `allowed` is accessibleKeys() (key -> current text); a Set checks keys only.
 */
export function projectHistoryRow(row, allowed) {
  const textOf = (key) => (allowed instanceof Map ? allowed.get(key) : undefined);
  const readable = (key) => Boolean(key) && allowed.has(key);
  let changedAny = false;
  const shrunk = new Set();
  const citations = (row.citations ?? []).map((c) => {
    if (!readable(c.key)) {
      changedAny = true;
      return {
        n: c.n,
        gone: true,
        title: L("Fonte non più accessibile", "Source no longer accessible"),
      };
    }
    const text = textOf(c.key);
    const excerpt = (c.excerpt ?? []).filter((line) => text === undefined || says(text, line));
    const changed = excerpt.length < (c.excerpt ?? []).length;
    if (changed) {
      changedAny = true;
      shrunk.add(c.n);
    }
    return { ...clone(c), excerpt, ...(changed && !excerpt.length ? { changed: true } : {}) };
  });
  const byN = new Map(citations.map((c) => [c.n, c]));
  const open = (n) => byN.has(n) && !byN.get(n).gone;
  const still = (part) => {
    const pieces = part.src ?? [part.q];
    // SRD stat blocks proposed for an NPC are public reference: the key check suffices.
    if (part.sb) return part.cites.some(open);
    return part.cites.some((n) => {
      if (!open(n)) return false;
      const text = textOf(byN.get(n).key);
      return text === undefined || pieces.every((piece) => says(text, piece));
    });
  };
  let hidden = 0;
  const parts = [];
  for (const part of row.answer?.parts ?? []) {
    if (part.q === undefined) {
      parts.push(clone(part));
      continue;
    }
    if (part.names) {
      const quoted = parts
        .filter((p) => p.q !== undefined && p.cites?.length)
        .map((p) => p.q)
        .join("\n");
      const names = part.names.filter((name) => quoted.includes(name));
      if (!names.length) {
        if (parts.at(-1)?.t) parts.pop();
        continue;
      }
      parts.push({ ...clone(part), names, q: names.join(", ") });
      continue;
    }
    if (!part.cites?.length) {
      parts.push(clone(part));
      continue;
    }
    const visible = row.answer?.external
      ? part.cites.every((n) => open(n) && !shrunk.has(n))
      : still(part);
    if (!visible) {
      hidden++;
      continue;
    }
    parts.push(clone(part));
  }
  const out = {
    ...clone(row),
    answer: row.answer ? { ...clone(row.answer), parts, hidden } : null,
    citations,
  };
  if (row.prompt && changedAny) {
    out.prompt = null;
    out.promptWithheld = true;
  }
  return out;
}

// ---------------------------------------------------------------- local model (SV-46)

// Delegated simulation (I-233; GAP-18 stays open for the real product): the endpoint, model
// name and «Prova la connessione» panel of Foundry's LLM modules and SillyTavern's API
// connection, for a model on this computer or the local network (Ollama, LM Studio). Only
// local addresses are accepted, so notes are never pointed at an Internet service. Nothing
// is contacted: no request leaves the browser, the test and the answers are simulated.
export const LOCAL_EXAMPLE = "http://localhost:11434";
export const MAX_MODEL = 80;
const PRIVATE_V4 = [
  [[127, 0, 0, 0], 8],
  [[10, 0, 0, 0], 8],
  [[172, 16, 0, 0], 12],
  [[192, 168, 0, 0], 16],
  [[169, 254, 0, 0], 16],
];
function privateV4(host) {
  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255))
    return false;
  const value = parts.reduce((n, p) => n * 256 + Number(p), 0);
  return PRIVATE_V4.some(([base, bits]) => {
    const start = base.reduce((n, p) => n * 256 + p, 0);
    const size = 2 ** (32 - bits);
    return value >= start && value < start + size;
  });
}
// ::1, unique local fc00::/7 and link-local fe80::/10.
const privateV6 = (host) =>
  host === "::1" || /^f[cd][0-9a-f]{0,2}:/.test(host) || /^fe[89ab][0-9a-f]?:/.test(host);
/** Whether an address is this computer or the local network: {ok, endpoint} or {ok, reason}. */
export function localEndpointCheck(value) {
  const text = str(value).trim();
  const no = (it, en) => ({ ok: false, reason: { it, en } });
  if (!text)
    return no(
      `Scrivi l’indirizzo del modello, per esempio ${LOCAL_EXAMPLE}.`,
      `Write the model’s address, for example ${LOCAL_EXAMPLE}.`,
    );
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`);
  } catch {
    return no(
      `Indirizzo non valido: scrivilo come ${LOCAL_EXAMPLE}.`,
      `Invalid address: write it like ${LOCAL_EXAMPLE}.`,
    );
  }
  if (!["http:", "https:"].includes(url.protocol))
    return no("Serve un indirizzo http o https.", "An http or https address is needed.");
  if (url.username || url.password)
    return no(
      "Togli nome utente e password dall’indirizzo.",
      "Remove the user name and password from the address.",
    );
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const local =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".lan") ||
    host.endsWith(".home.arpa") ||
    privateV4(host) ||
    privateV6(host);
  if (!local)
    return no(
      `«${host}» non è un indirizzo di questo computer o della rete di casa: il modello locale accetta solo localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x o un nome .local. Un servizio su Internet riceverebbe le tue voci.`,
      `“${host}” is not an address of this computer or the home network: the local model accepts only localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x or a .local name. An Internet service would receive your entries.`,
    );
  const path = url.pathname.replace(/\/+$/, "");
  return { ok: true, endpoint: url.origin + path };
}
/** The viewer's own local model connection, or null. Private to that member. */
export function localModelOf(slice, viewer) {
  const row = slice?.local?.[viewer];
  return object(row) ? clone(row) : null;
}
function requireLocalModel(slice, viewer) {
  const row = slice?.local?.[viewer];
  if (!object(row) || !localEndpointCheck(row.endpoint).ok || !row.model)
    fail(
      "Collega prima il modello locale: indirizzo e nome in Consenso e dati.",
      "Connect the local model first: address and name in Consent and data.",
    );
  return row;
}
/** Saves the address and model name (validated); a new address needs a new test. */
export function setLocalModel(
  slice,
  viewer,
  { endpoint, model } = {},
  at = new Date().toISOString(),
) {
  const check = localEndpointCheck(endpoint);
  if (!check.ok) fail(check.reason.it, check.reason.en);
  const name = str(model).replace(/\s+/g, " ").trim();
  if (!name)
    fail(
      "Scrivi il nome del modello, per esempio llama3.1.",
      "Write the model name, for example llama3.1.",
    );
  if (name.length > MAX_MODEL)
    fail(`Al massimo ${MAX_MODEL} caratteri.`, `At most ${MAX_MODEL} characters.`);
  slice.local ??= {};
  slice.local[viewer] = { endpoint: check.endpoint, model: name, savedAt: at, test: null };
  return clone(slice.local[viewer]);
}
/**
 * «Prova la connessione», simulated: it never calls fetch or any network API. It records
 * that the saved address is local and says what a real model there would be asked.
 */
export function testLocalModel(slice, viewer, at = new Date().toISOString()) {
  const row = requireLocalModel(slice, viewer);
  row.test = { ok: true, simulated: true, at, endpoint: row.endpoint, model: row.model };
  return clone(row.test);
}

// ---------------------------------------------------------------- bring your own model

/** Phil's AI Assistant (SVC-099): a prompt with only accessible sources, no API key. */
export function buildPrompt(state, slice, viewer, question, { lang = "it" } = {}) {
  requireMember(state, viewer);
  requireEnabled(state, slice);
  const text = cleanQuestion(question);
  const { sources } = collectSources(state, slice, viewer, { lang, external: true });
  const q = stems(text);
  if (!q.length)
    fail(
      "Scrivi una domanda con almeno una parola significativa.",
      "Write a question with at least one meaningful word.",
    );
  const { cite, citations } = citer();
  const pool = matchSentences(namedRules(sources, text), q);
  const chosen = (pool.length ? pool : []).slice(0, 8);
  for (const row of chosen) cite(row.source, row.sentence);
  const it = lang !== "en";
  const lines = [
    it
      ? "Rispondi alla domanda usando SOLO le fonti numerate qui sotto. Cita ogni frase con [n]. Se le fonti non bastano, dillo e non inventare."
      : "Answer the question using ONLY the numbered sources below. Cite every sentence with [n]. If the sources are not enough, say so and do not invent.",
    "",
    (it ? "Domanda: " : "Question: ") + text,
    "",
    it ? "Fonti:" : "Sources:",
    ...citations.map(
      (c) =>
        `[${c.n}] ${it ? c.title.it : c.title.en}${c.location ? ` (${it ? c.location.it : c.location.en})` : ""} — ${c.excerpt.join(" ")}`,
    ),
  ];
  if (!citations.length)
    lines.push(it ? "(nessuna fonte accessibile corrisponde)" : "(no accessible source matches)");
  return { question: text, prompt: lines.join("\n"), citations };
}
export function startExternal(
  state,
  slice,
  viewer,
  question,
  { id = uid(), at = new Date().toISOString(), lang = "it" } = {},
) {
  const campaignId = requireEnabled(state, slice);
  const built = buildPrompt(state, slice, viewer, question, { lang });
  return clone(
    pushHistory(slice, viewer, {
      id,
      kind: "ask",
      campaignId,
      engine: "external",
      question: built.question,
      at,
      lang,
      attempt: 0,
      status: "proposed",
      prompt: built.prompt,
      answer: null,
      citations: built.citations,
    }),
  );
}
/** Records the pasted answer; citation numbers that match no source are flagged. */
export function recordExternal(slice, viewer, id, text, at = new Date().toISOString()) {
  const row = findHistory(slice, viewer, id);
  if (row.engine !== "external")
    fail("Questa risposta è del generatore.", "This answer comes from the generator.");
  const body = str(text).trim();
  if (!body) fail("Incolla la risposta del tuo modello.", "Paste your model’s answer.");
  if (body.length > MAX_EXTERNAL)
    fail(`Al massimo ${MAX_EXTERNAL} caratteri.`, `At most ${MAX_EXTERNAL} characters.`);
  const known = new Set(row.citations.map((c) => c.n));
  const used = [...body.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  const unknown = [...new Set(used.filter((n) => !known.has(n)))];
  const cites = [...new Set(used.filter((n) => known.has(n)))];
  row.answer = {
    found: true,
    external: true,
    parts: [quote(body, cites)],
    issues: [
      ...(unknown.length ? [{ code: "unknown", numbers: unknown }] : []),
      ...(!used.length ? [{ code: "uncited" }] : []),
    ],
  };
  row.at = at;
  return clone(row);
}

// ---------------------------------------------------------------- assisted writing

const THEME_LABELS = {
  summary: L("Riassunto delle fonti", "Summary of sources"),
  hook: L("Gancio per la prossima sessione", "Hook for the next session"),
  npc: L("PNG da un’idea", "NPC from an idea"),
};
export const themeLabel = (theme) => THEME_LABELS[theme] ?? THEME_LABELS.summary;

// Role words that suggest an SRD 5.2.1 NPC stat block of the B16 compendium. A proposal
// only: the DM confirms or changes it before the NPC is created.
const ROLE_BLOCKS = [
  [
    "guard",
    "guardia sentinella custode guardiano soldato vedetta carceriere guard sentry soldier watchman keeper warden guardian jailer",
  ],
  [
    "priest",
    "sacerdote sacerdotessa prete chierico frate monaco abate badessa acolito priest priestess cleric acolyte monk friar abbot",
  ],
  [
    "mage",
    "mago maga stregone strega incantatore arcanista alchimista negromante mage wizard sorcerer witch warlock alchemist necromancer",
  ],
  [
    "knight",
    "cavaliere paladino capitano comandante nobile knight paladin captain commander noble",
  ],
  [
    "scout",
    "esploratore esploratrice cacciatore cacciatrice guida ranger battitore scout hunter guide tracker",
  ],
  [
    "bandit",
    "bandito brigante ladro ladra fuorilegge tagliagole contrabbandiere bandit brigand thief outlaw cutthroat smuggler",
  ],
  ["cultist", "cultista fanatico fanatica adepto adepta settario cultist fanatic zealot"],
  [
    "commoner",
    "popolano popolana contadino contadina mercante locandiere locandiera oste servitore pescatore fabbro bottegaio commoner peasant farmer merchant innkeeper servant fisher smith shopkeeper",
  ],
];
export const NPC_DEFAULT_BLOCK = "srd2024:creature:commoner";
/** Every SRD 5.2.1 creature of the compendium as an NPC profile choice, people first. */
export function npcBlocks() {
  const creatures = srdEntries().filter((entry) => entry.kind === "creature");
  return [
    ...creatures.filter((entry) => entry.type === "humanoid"),
    ...creatures.filter((entry) => entry.type !== "humanoid"),
  ];
}
/**
 * The stat block an NPC idea suggests: a creature named in full ("goblin capo", "capo
 * dei banditi", the longest name wins), else a role word ("custode" -> Guard), else a
 * Commoner.
 */
export function proposeBlock(idea) {
  const asked = words(idea).filter((word) => word.length >= 3 && !STOP.has(word));
  const stemOf = (word) => stems(word)[0];
  const hit = (word) =>
    asked.some(
      (other) => sameWord(word, other) || (stemOf(word) && stemOf(word) === stemOf(other)),
    );
  let best = null;
  let size = 0;
  for (const entry of npcBlocks())
    for (const name of [entry.name?.it, entry.name?.en]) {
      const own = words(name).filter((word) => word.length >= 3 && !STOP.has(word));
      if (own.length > size && own.every(hit)) {
        best = entry;
        size = own.length;
      }
    }
  if (best) return best;
  for (const [id, list] of ROLE_BLOCKS)
    if (list.split(" ").some(hit)) return getEntry(`srd2024:creature:${id}`);
  return getEntry(NPC_DEFAULT_BLOCK);
}
/** "Guardia · GS 1/8 · CA 16 · PF 11" */
export function blockLine(entry, lang = "it") {
  const en = lang === "en";
  return `${pickLang(entry.name, lang)} · ${en ? "CR" : "GS"} ${entry.cr} · ${en ? "AC" : "CA"} ${entry.ac} · ${en ? "HP" : "PF"} ${entry.hp?.average ?? "?"}`;
}

/** Pure composition for a writing request (theme, prompt, context keys). */
export function compose(state, slice, viewer, request, attempt = 0, lang = "it") {
  const { theme, prompt = "", keys = [] } = request ?? {};
  if (!THEMES.includes(theme)) fail("Scegli un tema.", "Choose a theme.");
  const all = collectSources(state, slice, viewer, { lang }).sources;
  // Rules are looked up by name in Ask; writing starts from campaign text unless chosen.
  const picked = keys.length
    ? all.filter((source) => keys.includes(source.key))
    : all.filter((source) => source.kind !== "rule");
  if (keys.length && !picked.length)
    fail(
      "Le fonti scelte non sono più accessibili.",
      "The chosen sources are no longer accessible.",
    );
  const { cite, citations } = citer();
  const parts = [];
  let npc = null;
  const q = stems(prompt);
  const rotate = (list, by) =>
    list.length ? [...list.slice(by % list.length), ...list.slice(0, by % list.length)] : list;
  if (theme === "summary") {
    const base = picked.filter((source) => source.kind !== "log").slice(0, 12);
    // Chosen context: up to three sentences of each chosen source; otherwise the lead of each.
    let rows = q.length
      ? matchSentences(base, q)
      : base.flatMap((source) =>
          sentences(source.text)
            .slice(0, keys.length ? 3 : 1)
            .map((sentence) => ({ source, sentence })),
        );
    // A sentence repeated by several sources (a recap quoting a handout) is said once.
    rows = rotate(
      rows.filter(
        (row, index, all) =>
          row.sentence && all.findIndex((other) => other.sentence === row.sentence) === index,
      ),
      attempt,
    ).slice(0, 5);
    parts.push(said("Riassunto:", "Summary:"));
    if (!rows.length)
      parts.push(
        said(
          "Nessuna fonte accessibile corrisponde alla richiesta: nulla da riassumere.",
          "No accessible source matches the request: nothing to summarize.",
        ),
      );
    // Consecutive sentences of one source read as one quote with one marker.
    for (const row of rows) {
      const n = cite(row.source, row.sentence);
      const last = parts.at(-1);
      // `src` keeps each sentence, so a later re-check tests them one by one.
      if (last?.q !== undefined && last.cites[0] === n) {
        last.src = [...(last.src ?? [last.q]), row.sentence];
        last.q += " " + row.sentence;
      } else parts.push(quote(row.sentence, [n]));
    }
  } else if (theme === "hook") {
    const chosen = keys.length > 0;
    const openQuest = (source) => source.entryKind === "quest" && source.questStatus === "open";
    const recap = picked.find((source) => source.entryKind === "recap");
    let quests = picked.filter(openQuest);
    const scenes = picked.filter((source) => source.kind === "chat" && source.chatKind === "desc");
    const lead = q.length ? matchSentences(picked, q) : [];
    parts.push(said("Gancio proposto:", "Suggested hook:"));
    const recapLines = recap ? sentences(recap.text) : [];
    // A chosen entry (entry page, note editor, context boxes) is itself the starting point.
    const own = chosen
      ? picked.find((source) => source.kind !== "log" && sentences(source.text).length)
      : null;
    if (lead.length) {
      const row = rotate(lead, attempt)[0];
      parts.push(
        said("Si riparte da:", "Pick up from:"),
        quote(row.sentence, [cite(row.source, row.sentence)]),
      );
    } else if (recapLines.length) {
      const line = rotate(recapLines, attempt).at(-1);
      parts.push(said("Si riparte da:", "Pick up from:"), quote(line, [cite(recap, line)]));
    } else if (own) {
      const line = rotate(sentences(own.text), attempt).at(-1);
      parts.push(said("Si riparte da:", "Pick up from:"), quote(line, [cite(own, line)]));
    }
    if (chosen) {
      // Related material the reader can read: open objectives and recap lines that
      // name the chosen entry or share its words.
      const names = [...new Set(picked.flatMap((source) => stems(source.title?.it ?? "")))];
      const words = new Set(picked.flatMap((source) => stems(source.text)));
      const related = (source) => {
        const own = stems(`${source.title?.it ?? ""} ${source.text}`);
        return (
          own.some((word) => names.includes(word)) ||
          own.filter((word) => words.has(word)).length >= 2
        );
      };
      if (!quests.length)
        quests = all.filter(
          (source) => openQuest(source) && !picked.includes(source) && related(source),
        );
      const recaps = all.filter(
        (source) => source.entryKind === "recap" && !picked.includes(source),
      );
      const mention = names.length ? rotate(matchSentences(recaps, names), attempt)[0] : null;
      if (mention && !recap)
        parts.push(
          said("Nei resoconti:", "In the recaps:"),
          quote(mention.sentence, [cite(mention.source, mention.sentence)]),
        );
    }
    const quest = rotate(quests, attempt)[0];
    if (quest)
      parts.push(
        said("Questione aperta:", "Open question:"),
        quote(quest.title.it, [cite(quest, quest.title.it)]),
      );
    const scene = rotate(scenes, attempt)[0];
    if (scene) {
      const line = sentences(scene.text).at(-1);
      parts.push(
        said("Ultima immagine della scena:", "Last image of the scene:"),
        quote(line, [cite(scene, line)]),
      );
    }
    if (parts.length === 1)
      parts.push(
        said(
          "Non ci sono resoconti, obiettivi o narrazioni accessibili da cui partire.",
          "There are no accessible recaps, objectives or narration to start from.",
        ),
      );
    else
      parts.push(
        said(
          "Domanda per il tavolo: cosa fate adesso?",
          "Question for the table: what do you do now?",
        ),
      );
  } else {
    const idea = str(prompt).trim();
    if (!idea)
      fail(
        "Scrivi un nome e, dopo una virgola, un ruolo.",
        "Write a name and, after a comma, a role.",
      );
    const [name, ...roleParts] = idea.split(",");
    const role = roleParts.join(",").trim();
    const nameStems = stems(name);
    if (!nameStems.length) fail("Il nome è troppo corto.", "The name is too short.");
    const facts = rotate(
      matchSentences(picked, nameStems).filter((row) =>
        nameStems.every((s) => stems(row.sentence).includes(s)),
      ),
      attempt,
    ).slice(0, 4);
    parts.push(said("Nome:", "Name:"), { q: name.trim(), cites: [] });
    if (role)
      parts.push(said("Ruolo (dalla tua richiesta):", "Role (from your request):"), {
        q: role,
        cites: [],
      });
    parts.push(said("Cosa risulta dalle fonti:", "What the sources say:"));
    if (!facts.length)
      parts.push(said("Nessuna fonte accessibile lo nomina.", "No accessible source names them."));
    for (const row of facts) parts.push(quote(row.sentence, [cite(row.source, row.sentence)]));
    const linked = extractEntities(
      state,
      facts.map((row) => ({ ...row.source, text: row.sentence })),
      viewer,
    )
      .map((entity) => entity.name)
      .filter((value) => !nameStems.every((s) => stems(value).includes(s)));
    if (linked.length)
      parts.push(said("Collegamenti:", "Links:"), {
        q: linked.join(", "),
        cites: [],
        names: linked,
      });
    // A complete sheet usable as a quick NPC (Quest Portal VTL-218, SVC-023): an SRD
    // 5.2.1 stat block proposed from the role words, cited to its compendium page. The
    // DM confirms or changes it when creating the NPC; nothing is invented.
    const block = proposeBlock(idea);
    const row = srdRow(block, lang);
    parts.push(
      said(
        "Profilo di gioco proposto (SRD 5.2.1, da confermare):",
        "Suggested game profile (SRD 5.2.1, to confirm):",
      ),
      { q: blockLine(block, lang), cites: [cite(row, row.text)], sb: block.id },
      said(
        "Da decidere al tavolo: aspetto, voce e motivazioni. L’assistente non li inventa.",
        "Left to the table: looks, voice and motives. The assistant does not invent them.",
      ),
    );
    npc = { name: name.trim(), role, creatureId: block.id };
  }
  return {
    found: citations.length > 0,
    parts,
    citations,
    variant: `${theme}-${attempt}`,
    ...(npc ? { npc } : {}),
  };
}
export function write(
  state,
  slice,
  viewer,
  request,
  { id = uid(), at = new Date().toISOString(), lang = "it" } = {},
) {
  requireMember(state, viewer);
  const campaignId = requireEnabled(state, slice);
  const theme = THEMES.includes(request?.theme) ? request.theme : null;
  if (!theme) fail("Scegli un tema.", "Choose a theme.");
  const prompt = str(request.prompt).replace(/\s+/g, " ").trim();
  if (prompt.length > MAX_PROMPT)
    fail(`Al massimo ${MAX_PROMPT} caratteri.`, `At most ${MAX_PROMPT} characters.`);
  const keys = Array.isArray(request.keys)
    ? [...new Set(request.keys.filter((k) => typeof k === "string"))]
    : [];
  const clean = { theme, prompt, keys };
  const result = compose(state, slice, viewer, clean, 0, lang);
  return clone(
    pushHistory(slice, viewer, {
      id,
      kind: "write",
      campaignId,
      engine: "demo",
      request: clean,
      question: prompt,
      at,
      lang,
      attempt: 0,
      status: "proposed",
      answer: { found: result.found, parts: result.parts, variant: result.variant },
      citations: result.citations,
      ...(result.npc ? { npc: result.npc } : {}),
    }),
  );
}

/** "Type · Title" of a citation, without repeating a title equal to its type. */
export function sourceName(citation, lang = "it") {
  const pick = (value) => (lang === "en" ? value?.en : value?.it) ?? "";
  const type = pick(citation.type);
  const title = pick(citation.title);
  return !title || title === type || title.startsWith(`${type} · `)
    ? title || type
    : `${type} · ${title}`;
}
/** Plain text of a projected row, for a note draft (citations listed at the end). */
export function rowText(row, lang = "it") {
  const pick = (value) => (lang === "en" ? value.en : value.it);
  const lines = [];
  let line = [];
  for (const part of row.answer?.parts ?? []) {
    if (part.t) {
      if (line.length) lines.push(line.join(" "));
      line = [pick(part.t)];
    } else if (part.q !== undefined) {
      line.push(
        part.q + (part.cites?.length ? " " + part.cites.map((n) => `[${n}]`).join("") : ""),
      );
    } else if (part.cites) line.push(part.cites.map((n) => `[${n}]`).join(", "));
  }
  if (line.length) lines.push(line.join(" "));
  const cites = (row.citations ?? []).filter((c) => !c.gone);
  if (cites.length) {
    lines.push("", lang === "en" ? "Sources:" : "Fonti:");
    for (const c of cites)
      lines.push(`[${c.n}] ${sourceName(c, lang)}${c.location ? ` · ${pick(c.location)}` : ""}`);
  }
  lines.push(
    "",
    lang === "en"
      ? "Proposed by the assistant (simulation): review it before sharing."
      : "Proposto dall’assistente (simulazione): rivedilo prima di condividerlo.",
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------- entities

const NAME_STOP = new Set([
  "Il",
  "Lo",
  "La",
  "Le",
  "Gli",
  "Un",
  "Una",
  "The",
  "A",
  "An",
  "DM",
  "PF",
  "HP",
]);
/** Known names visible to the reader plus capitalized words inside a sentence. */
export function extractEntities(state, sources, viewer) {
  const known = [];
  const members = campaignMembers(state).map((member) => member.id);
  const visible = (actor) =>
    actor &&
    actor.visibility !== "private" &&
    !actor.companion &&
    isCampaignActor(actor, state.campaign?.id) &&
    (viewer
      ? canViewActor(actor, viewer, state)
      : members.every((id) => canViewActor(actor, id, state)));
  for (const actor of Object.values(state.actors ?? {}))
    if (visible(actor)) known.push({ name: actor.name, kind: "person" });
  for (const scene of state.scenes ?? [])
    if (scene.revealed) known.push({ name: scene.name, kind: "place" });
  const found = new Map();
  const add = (name, kind, source) => {
    const clean = name.replace(/[«»"“”.,;:!?]+$/g, "").trim();
    if (clean.length < 3) return;
    const id = words(clean).join("-");
    const row = found.get(id) ?? { id, name: clean, kind, keys: [] };
    if (source && !row.keys.includes(source.key)) row.keys.push(source.key);
    found.set(id, row);
  };
  for (const source of sources) {
    const text = str(source.text);
    for (const entry of known)
      if (entry.name && text.includes(entry.name)) add(entry.name, entry.kind, source);
    for (const sentence of sentences(text)) {
      const tokens = sentence.split(/\s+/);
      let run = [];
      const flush = () => {
        if (run.length) {
          const name = run.join(" ");
          if (!known.some((entry) => entry.name === name) && !NAME_STOP.has(name))
            add(name, "other", source);
        }
        run = [];
      };
      tokens.forEach((token, index) => {
        const bare = token.replace(/^[«"“(]+|[»"”),.;:!?]+$/g, "");
        const capital = /^\p{Lu}[\p{Ll}’']+$/u.test(bare) && !NAME_STOP.has(bare);
        // A word opening a quotation or following a colon starts a sentence: not a name.
        const opening =
          index === 0 || /^[«"“(]/.test(token) || /[:.!?]$/.test(tokens[index - 1] ?? "");
        if (!opening && capital) run.push(bare);
        else flush();
        if (/[,.;:!?»”)]$/.test(token)) flush();
      });
      flush();
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- session review (DM)

function dayKey(at) {
  const date = new Date(at);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/**
 * Periods to recap: ended/live Table sessions (B14 session-view), then each day with
 * shareable sources, then everything shared. Counts are recap-eligible sources.
 */
export function recapWindows(state, slice, viewer) {
  const { sources } = collectSources(state, slice, viewer, { audience: "campaign" });
  const timed = sources.filter((source) => source.at && source.recap);
  const windows = [];
  for (const session of state.ext?.["session-view"]?.sessions ?? []) {
    const from = iso(session.startedAt);
    if (!from) continue;
    const to = iso(session.endedAt);
    const count = timed.filter((s) => s.at >= from && (!to || s.at <= to)).length;
    windows.push({
      id: `session:${session.id}`,
      kind: "session",
      number: session.number,
      live: session.status === "live",
      recapped: sessionRecapped(state, slice, viewer, session.id),
      from,
      to,
      count,
    });
  }
  const days = new Map();
  for (const source of timed) days.set(dayKey(source.at), (days.get(dayKey(source.at)) ?? 0) + 1);
  for (const [day, count] of [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    const [y, m, d] = day.split("-").map(Number);
    windows.push({
      id: `day:${day}`,
      kind: "day",
      day,
      from: new Date(y, m - 1, d).toISOString(),
      to: new Date(y, m - 1, d + 1).toISOString(),
      count,
    });
  }
  windows.push({
    id: "all",
    kind: "all",
    from: null,
    to: null,
    count: sources.filter((s) => s.recap).length,
  });
  return windows;
}
function inWindow(source, window) {
  if (window.kind === "all") return true;
  return Boolean(source.at) && source.at >= window.from && (!window.to || source.at < window.to);
}
function recapSources(state, slice, viewer, windowId, excludedKeys = []) {
  const window = recapWindows(state, slice, viewer).find((row) => row.id === windowId);
  if (!window) fail("Periodo non disponibile.", "Period unavailable.");
  const { sources, excluded } = collectSources(state, slice, viewer, { audience: "campaign" });
  const eligible = sources
    .filter((source) => source.recap && inWindow(source, window))
    .sort((a, b) => str(a.at).localeCompare(str(b.at)) || a.key.localeCompare(b.key));
  return {
    window,
    excluded,
    eligible,
    used: eligible.filter((source) => !excludedKeys.includes(source.key)),
  };
}
const LEVEL_OF = { major: 0, minor: 1, step: 2 };
function beatText(source) {
  if (source.kind === "material")
    return `${source.title.it}: ${sentences(source.text)[0] ?? ""}`.trim();
  if (source.kind === "entry")
    return [source.title.it, ...sentences(source.text).slice(0, 2)].join(" — ").slice(0, MAX_BEAT);
  return str(source.text).slice(0, MAX_BEAT);
}
function summaryFrom(used, cite, { format, prompt, attempt, lang = "it" }) {
  const q = stems(prompt);
  const narrative = used.filter((source) => source.kind !== "log");
  const all = narrative.flatMap((source) =>
    sentences(source.text).map((sentence, index) => ({ source, sentence, index })),
  );
  const major = all.filter((row) => row.source.recap === "major");
  const minor = all.filter((row) => row.source.recap !== "major");
  const shift = minor.length ? attempt % minor.length : 0;
  const chrono = (list) =>
    [...list].sort((a, b) => str(a.source.at).localeCompare(str(b.source.at)) || a.index - b.index);
  const max = format === "quick" ? 6 : 4;
  const rest = chrono(
    [...major.slice(0, 3), ...minor.slice(shift), ...minor.slice(0, shift)].slice(0, max),
  );
  // A custom instruction (SVC-088) puts the matching sentences first, then the rest.
  const focus = q.length
    ? matchSentences(narrative, q)
        .slice(0, 2)
        .map(
          (row) => all.find((r) => r.source === row.source && r.sentence === row.sentence) ?? row,
        )
    : [];
  const rows = [
    ...chrono(focus),
    ...rest.filter(
      (row) => !focus.some((f) => f.sentence === row.sentence && f.source === row.source),
    ),
  ].slice(0, max);
  const cites = [];
  // Consecutive sentences of one source share a single citation marker.
  const groups = [];
  for (const row of rows) {
    const n = cite(row.source, row.sentence);
    if (!cites.includes(n)) cites.push(n);
    const last = groups.at(-1);
    if (format !== "quick" && last?.n === n) last.text.push(row.sentence);
    else groups.push({ n, text: [row.sentence] });
  }
  const lines = groups.map((group) =>
    format === "quick"
      ? `• ${group.text.join(" ")} [${group.n}]`
      : `${group.text.join(" ")} [${group.n}]`,
  );
  // Only Table steps (rolls, moves) in the period: they are the story (SV-44); none at all
  // says so plainly instead of an empty summary.
  if (!lines.length) {
    const steps = used.filter((source) => source.kind === "log").slice(0, 4);
    if (!steps.length)
      return { text: lang === "en" ? "No play event." : "Nessun evento di gioco.", cites: [] };
    for (const step of steps) {
      const n = cite(step, step.text);
      if (!cites.includes(n)) cites.push(n);
      lines.push(format === "quick" ? `• ${step.text} [${n}]` : `${step.text} [${n}].`);
    }
  }
  return {
    text: (format === "quick" ? lines.join("\n") : lines.join(" ")).slice(0, MAX_SUMMARY),
    cites,
  };
}
function reviewCiter(review) {
  const citations = review.sources ?? [];
  return (source, excerpt) => {
    let row = citations.find((c) => c.key === source.key);
    if (!row) {
      row = {
        n: citations.length + 1,
        key: source.key,
        kind: source.kind,
        title: clone(labelOf(source.title)),
        type: clone(labelOf(source.type)),
        excerpt: [],
        at: source.at,
        route: clone(source.route),
        // What the source said to the whole group when cited: publishing re-checks that
        // no sentence withdrawn since (a section made "Only me") is still in the draft.
        text: str(source.text),
      };
      citations.push(row);
    }
    if (excerpt && !row.excerpt.includes(excerpt) && row.excerpt.length < 3)
      row.excerpt.push(excerpt);
    review.sources = citations;
    return row.n;
  };
}
function fill(state, review, used, { summaryOnly = false } = {}) {
  if (!summaryOnly) review.sources = [];
  const cite = reviewCiter(review);
  if (!summaryOnly) {
    review.beats = used.slice(0, 24).map((source, index) => ({
      id: `beat-${index + 1}`,
      level: LEVEL_OF[source.recap] ?? 1,
      text: beatText(source),
      cites: [cite(source, beatText(source))],
    }));
    review.entities = extractEntities(state, used, null).map((entity) => ({
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      cites: entity.keys
        .map((key) => used.find((source) => source.key === key))
        .filter(Boolean)
        .map((source) => cite(source)),
    }));
  }
  review.summary = summaryFrom(used, cite, review);
}
function reviewOf(slice, id) {
  const review = slice.reviews?.find((row) => row.id === id);
  if (!review) fail("Bozza di resoconto non trovata.", "Recap draft not found.");
  return review;
}
export function listReviews(slice, viewer) {
  return (slice.reviews ?? []).filter((row) => row.owner === viewer).map((row) => clone(row));
}
/** Session Review draft (SVC-088), private to the DM until published. */
export function createReview(
  state,
  slice,
  viewer,
  { windowId, format = "narrative", id = uid(), at = new Date().toISOString(), lang = "it" } = {},
) {
  const campaignId = requireMember(state, viewer);
  requireDm(state, viewer);
  requireEnabled(state, slice);
  const { window, used, eligible } = recapSources(state, slice, viewer, windowId);
  if (!eligible.length)
    fail(
      "Nessun evento di gioco in questo periodo: niente da riassumere. Le impostazioni e gli altri eventi di sistema non contano.",
      "No play event in this period: nothing to recap. Settings and other system events do not count.",
    );
  const review = {
    id,
    campaignId,
    owner: viewer,
    windowId: window.id,
    window: clone(window),
    lang,
    format: format === "quick" ? "quick" : "narrative",
    prompt: "",
    attempt: 0,
    title: "",
    summary: { text: "", cites: [] },
    beats: [],
    entities: [],
    sources: [],
    excludedKeys: [],
    status: "draft",
    revision: 1,
    createdAt: at,
    updatedAt: at,
    publishedEntryId: null,
    publishedAt: null,
    withdrawn: null,
    history: [{ kind: "created", at }],
  };
  fill(state, review, used);
  slice.reviews ??= [];
  slice.reviews.push(review);
  return clone(review);
}
/** Re-runs only the summary with the DM's instruction (SVC-088), keeping edited beats. */
export function regenerateSummary(
  state,
  slice,
  viewer,
  id,
  { prompt = "", format, at = new Date().toISOString() } = {},
) {
  requireDm(state, viewer);
  requireEnabled(state, slice);
  const review = reviewOf(slice, id);
  if (review.owner !== viewer) fail("Bozza di un’altra persona.", "Someone else’s draft.");
  if (review.status !== "draft")
    fail("Il resoconto è già pubblicato.", "The recap is already published.");
  const text = str(prompt).replace(/\s+/g, " ").trim();
  if (text.length > MAX_PROMPT)
    fail(`Al massimo ${MAX_PROMPT} caratteri.`, `At most ${MAX_PROMPT} characters.`);
  review.prompt = text;
  if (format) review.format = format === "quick" ? "quick" : "narrative";
  review.attempt = (review.attempt ?? 0) + 1;
  const { used } = recapSources(state, slice, viewer, review.windowId, review.excludedKeys);
  fill(state, review, used, { summaryOnly: true });
  review.revision++;
  review.updatedAt = at;
  review.history.push({ kind: "summary", at, prompt: text });
  return clone(review);
}
/** Rebuilds beats, entities and summary from the sources, after exclusions changed. */
export function rebuildReview(
  state,
  slice,
  viewer,
  id,
  { excludedKeys, at = new Date().toISOString() } = {},
) {
  requireDm(state, viewer);
  requireEnabled(state, slice);
  const review = reviewOf(slice, id);
  if (review.owner !== viewer) fail("Bozza di un’altra persona.", "Someone else’s draft.");
  if (review.status !== "draft")
    fail("Il resoconto è già pubblicato.", "The recap is already published.");
  const keys = Array.isArray(excludedKeys)
    ? [...new Set(excludedKeys.filter((k) => typeof k === "string"))]
    : review.excludedKeys;
  const { used } = recapSources(state, slice, viewer, review.windowId, keys);
  if (!used.length) fail("Hai escluso tutte le fonti.", "You excluded every source.");
  review.excludedKeys = keys;
  fill(state, review, used);
  review.revision++;
  review.updatedAt = at;
  review.history.push({ kind: "rebuilt", at });
  return clone(review);
}
function cleanBeats(beats, known) {
  if (!Array.isArray(beats)) fail("Momenti non validi.", "Invalid beats.");
  return beats
    .map((beat, index) => ({
      id: typeof beat?.id === "string" && beat.id ? beat.id.slice(0, 60) : `beat-new-${index}`,
      level: LEVELS.includes(Number(beat?.level)) ? Number(beat.level) : 1,
      text: str(beat?.text).replace(/\s+/g, " ").trim().slice(0, MAX_BEAT),
      cites: (Array.isArray(beat?.cites) ? beat.cites : []).filter((n) => known.has(n)),
    }))
    .filter((beat) => beat.text);
}
/** Saves the DM's inline edits (title, summary, beats, entities, format). */
export function saveReview(
  slice,
  viewer,
  id,
  patch,
  { expectedRevision, at = new Date().toISOString() } = {},
) {
  const review = reviewOf(slice, id);
  if (review.owner !== viewer) fail("Bozza di un’altra persona.", "Someone else’s draft.");
  if (review.status !== "draft")
    fail("Il resoconto è già pubblicato.", "The recap is already published.");
  if (expectedRevision !== undefined && expectedRevision !== review.revision)
    fail("La bozza è cambiata: riaprila.", "The draft changed: reopen it.");
  const known = new Set(review.sources.map((c) => c.n));
  if (patch.title !== undefined) review.title = str(patch.title).trim().slice(0, 120);
  if (patch.format !== undefined) review.format = patch.format === "quick" ? "quick" : "narrative";
  if (patch.summary !== undefined) {
    const text = str(patch.summary).trim().slice(0, MAX_SUMMARY);
    const cites = [...text.matchAll(/\[(\d+)\]/g)]
      .map((m) => Number(m[1]))
      .filter((n) => known.has(n));
    review.summary = { text, cites: [...new Set(cites)] };
  }
  if (patch.beats !== undefined) review.beats = cleanBeats(patch.beats, known);
  // Exclusions are saved with the draft; publishing refuses while an excluded source is
  // still cited (the DM rebuilds the draft or removes that part).
  if (patch.excludedKeys !== undefined) {
    if (!Array.isArray(patch.excludedKeys)) fail("Esclusioni non valide.", "Invalid exclusions.");
    review.excludedKeys = [
      ...new Set(patch.excludedKeys.filter((key) => typeof key === "string" && key)),
    ];
  }
  if (patch.entities !== undefined) {
    if (!Array.isArray(patch.entities)) fail("Entità non valide.", "Invalid entities.");
    review.entities = patch.entities
      .map((entity) => ({
        id: str(entity?.id) || words(entity?.name).join("-"),
        name: str(entity?.name).replace(/\s+/g, " ").trim().slice(0, 80),
        kind: ENTITY_KINDS.includes(entity?.kind) ? entity.kind : "other",
        cites: (Array.isArray(entity?.cites) ? entity.cites : []).filter((n) => known.has(n)),
      }))
      .filter((entity) => entity.name);
  }
  if (!review.summary.text && !review.beats.length)
    fail("Il resoconto è vuoto.", "The recap is empty.");
  review.revision++;
  review.updatedAt = at;
  review.history.push({ kind: "saved", at });
  return clone(review);
}
export function discardReview(slice, viewer, id, at = new Date().toISOString()) {
  const review = reviewOf(slice, id);
  if (review.owner !== viewer) fail("Bozza di un’altra persona.", "Someone else’s draft.");
  if (review.status !== "draft")
    fail(
      "Un resoconto pubblicato si ritira, non si scarta.",
      "A published recap is withdrawn, not discarded.",
    );
  review.status = "discarded";
  review.history.push({ kind: "discarded", at });
  return clone(review);
}
export function restoreReview(slice, viewer, id, at = new Date().toISOString()) {
  const review = reviewOf(slice, id);
  if (review.owner !== viewer) fail("Bozza di un’altra persona.", "Someone else’s draft.");
  if (review.status === "discarded") {
    review.status = "draft";
    review.history.push({ kind: "restored", at });
  }
  return clone(review);
}
const KIND_TEXT = {
  person: L("Persona", "Person"),
  place: L("Luogo", "Place"),
  item: L("Oggetto", "Item"),
  other: L("Altro", "Other"),
};
export const entityKindLabel = (kind) => KIND_TEXT[kind] ?? KIND_TEXT.other;
export function reviewTitle(review, lang = "it") {
  if (review.title) return review.title;
  const w = review.window ?? {};
  const date = (value) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "it-IT", { dateStyle: "medium" }).format(
      new Date(value),
    );
  if (w.kind === "session")
    return lang === "en" ? `Recap — session ${w.number}` : `Resoconto — sessione ${w.number}`;
  if (w.kind === "day")
    return lang === "en" ? `Recap — ${date(w.from)}` : `Resoconto — ${date(w.from)}`;
  return lang === "en" ? "Campaign recap" : "Resoconto della campagna";
}
/**
 * The journal text players will read (plain text; the journal escapes it). It reads as
 * prose: inline [n] markers would show raw in the journal, the Home page and "Where we
 * left off", none of which renders them. The numbered source list closes the entry and
 * the entry page lists the same sources as links that open them (VTL-197).
 */
export function recapBody(review, lang = "it") {
  const en = lang === "en";
  const bare = (text) =>
    str(text)
      .replace(/[ \t]*\[\d+\]/g, "")
      .replace(/[ \t]+$/gm, "");
  const lines = [];
  if (review.summary.text) lines.push(bare(review.summary.text), "");
  if (review.beats.length) {
    lines.push(en ? "Key moments" : "Momenti principali");
    for (const beat of review.beats)
      lines.push(`${"  ".repeat(beat.level)}${["•", "–", "·"][beat.level]} ${bare(beat.text)}`);
    lines.push("");
  }
  if (review.entities.length) {
    lines.push(
      (en ? "People, places and things: " : "Persone, luoghi e cose: ") +
        review.entities
          .map(
            (e) =>
              `${e.name} (${(en ? entityKindLabel(e.kind).en : entityKindLabel(e.kind).it).toLowerCase()})`,
          )
          .join(", "),
      "",
    );
  }
  const used = new Set([
    ...review.summary.cites,
    ...review.beats.flatMap((beat) => beat.cites),
    ...review.entities.flatMap((entity) => entity.cites),
  ]);
  const cited = review.sources.filter((c) => used.has(c.n));
  if (cited.length) {
    lines.push(en ? "Sources" : "Fonti");
    const time = (at) =>
      at
        ? " · " +
          new Intl.DateTimeFormat(en ? "en-GB" : "it-IT", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(at))
        : "";
    for (const c of cited) lines.push(`[${c.n}] ${sourceName(c, lang)}${time(c.at)}`);
    lines.push("");
  }
  lines.push(
    en
      ? "Draft prepared by the assistant (simulation) and reviewed by the DM before sharing."
      : "Bozza preparata dall’assistente (simulazione) e rivista dal DM prima della condivisione.",
  );
  return lines.join("\n");
}
/** The cited sources of the recap published as this journal entry (for its page). */
export function publishedSources(slice, entryId) {
  const review = (slice?.reviews ?? []).find(
    (row) => row.publishedEntryId === entryId && row.status === "published",
  );
  if (!review) return [];
  const used = citedNumbers(review);
  return review.sources
    .filter((c) => used.has(c.n))
    .map((c) => ({ n: c.n, key: c.key, title: c.title, type: c.type, at: c.at, route: c.route }));
}
/** Citation numbers a recap uses in its summary, beats and entities. */
export function citedNumbers(review) {
  const summary = review.summary?.text ?? review.summary ?? "";
  return new Set([
    ...[...str(summary).matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])),
    ...(review.summary?.cites ?? []),
    ...(review.beats ?? []).flatMap((beat) => beat.cites ?? []),
    ...(review.entities ?? []).flatMap((entity) => entity.cites ?? []),
  ]);
}
/** Cited sources the DM excluded that are still in the text (not yet rebuilt away). */
export function excludedStillCited(review, excludedKeys = review.excludedKeys ?? []) {
  const used = citedNumbers(review);
  return (review.sources ?? []).filter((c) => used.has(c.n) && excludedKeys.includes(c.key));
}
/** Everything a recap would say: summary, beats and entity names, one per line. */
function draftWords(review) {
  return [
    str(review.summary?.text ?? review.summary),
    ...(review.beats ?? []).map((beat) => str(beat.text)),
    ...(review.entities ?? []).map((entity) => str(entity.name)),
  ].join("\n");
}
/** A withdrawn sentence counts when the draft still contains it (short ones included). */
const contains = (text, sentence) => {
  const wanted = flat(sentence).replace(/…$/, "").trim();
  return wanted.length > 1 && flat(text).includes(wanted);
};
/**
 * What a recap draft may no longer say to the whole group, re-checked on the text and
 * not only on the keys:
 * - `gone`: a cited source no longer readable by the whole group (hidden, restricted,
 *   removed, or its author withdrew consent);
 * - `changed`: a source still shared that no longer says a sentence the draft still
 *   contains (a section made "Only me", a handout text changed).
 * Returns {rows: [{...citation, reason, withdrawn}], gone: Set<n>, withdrawn: [sentence],
 * entities: Set<index>, current: Map<n, text>}. Rows block (re)publication; the editor
 * hides those parts.
 */
export function reviewStaleness(state, slice, viewer, review) {
  const current = new Map(
    collectSources(state, slice, viewer, { audience: "campaign" }).sources.map((source) => [
      source.key,
      str(source.text),
    ]),
  );
  const used = citedNumbers(review);
  const text = draftWords(review);
  const rows = [];
  const gone = new Set();
  const withdrawn = [];
  const byN = new Map();
  for (const c of review.sources ?? []) {
    const now = current.get(c.key);
    if (now === undefined) {
      gone.add(c.n);
      if (used.has(c.n)) rows.push({ ...clone(c), reason: "gone", withdrawn: [] });
      continue;
    }
    byN.set(c.n, now);
    // Older drafts kept no snapshot: their excerpts stand in for it.
    const before =
      typeof c.text === "string"
        ? sentences(c.text)
        : (c.excerpt ?? []).flatMap((line) => line.split(" — ")).flatMap(sentences);
    const lost = before.filter((line) => !says(now, line) && contains(text, line));
    if (lost.length) {
      rows.push({ ...clone(c), reason: "changed", withdrawn: lost });
      withdrawn.push(...lost);
    }
  }
  // A name taken from sources that changed and no longer name it to the whole group (a
  // name the DM edited while its source stayed the same is the DM's own writing).
  const changedSince = (n) => {
    if (gone.has(n)) return true;
    const c = (review.sources ?? []).find((row) => row.n === n);
    return typeof c?.text === "string" && flat(c.text) !== flat(byN.get(n));
  };
  const entities = new Set();
  (review.entities ?? []).forEach((entity, index) => {
    const cites = entity.cites ?? [];
    if (!cites.length || !cites.every(changedSince)) return;
    if (cites.some((n) => byN.has(n) && flat(byN.get(n)).includes(flat(entity.name)))) return;
    entities.add(index);
    for (const n of cites)
      if (!rows.some((row) => row.n === n)) {
        const c = (review.sources ?? []).find((row) => row.n === n);
        if (c) rows.push({ ...clone(c), reason: gone.has(n) ? "gone" : "changed", withdrawn: [] });
      }
  });
  return { rows, gone, withdrawn, entities, current: byN };
}
/** Whether a piece of a draft (summary, beat, entity) must stay hidden and unpublished. */
export function staleIn(staleness, piece, cites = []) {
  const markers = [...str(piece).matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  return (
    [...cites, ...markers].some((n) => staleness.gone.has(n)) ||
    staleness.withdrawn.some((line) => contains(piece, line))
  );
}
function staleCitations(state, slice, viewer, review) {
  return reviewStaleness(state, slice, viewer, review).rows;
}
const staleFail = (stale, again = false) => {
  const list = `[${stale.map((c) => c.n).join("], [")}]`;
  fail(
    again
      ? `Una fonte citata è cambiata, non è più leggibile da tutto il gruppo o non ha più il consenso di chi l’ha scritta (${list}): il resoconto non si ripubblica. Prepara una nuova bozza.`
      : `Una fonte citata è cambiata o non è più leggibile da tutto il gruppo (${list}): togli le parti nascoste, rigenera il riassunto o ricrea la bozza.`,
    again
      ? `A cited source changed, is no longer readable by the whole group or no longer has its author’s consent (${list}): the recap cannot be published again. Prepare a new draft.`
      : `A cited source changed or is no longer readable by the whole group (${list}): remove the hidden parts, re-run the summary or rebuild the draft.`,
  );
};
/**
 * Before sharing, every cited source must still be readable by the whole group: a
 * source hidden or revoked since the draft blocks publication (no leak through a recap).
 * An excluded source still cited also blocks it.
 */
export function publishCheck(state, slice, viewer, id) {
  requireDm(state, viewer);
  requireEnabled(state, slice);
  const review = reviewOf(slice, id);
  if (review.owner !== viewer) fail("Bozza di un’altra persona.", "Someone else’s draft.");
  if (review.status !== "draft")
    fail("Il resoconto è già pubblicato.", "The recap is already published.");
  if (!review.summary.text && !review.beats.length)
    fail("Il resoconto è vuoto.", "The recap is empty.");
  const excluded = excludedStillCited(review);
  if (excluded.length)
    fail(
      `Hai escluso [${excluded.map((c) => c.n).join("], [")}] ma è ancora nel testo: usa «Ricrea la bozza dalle fonti» o togli quella parte.`,
      `You excluded [${excluded.map((c) => c.n).join("], [")}] but it is still in the text: use “Rebuild the draft from the sources” or remove that part.`,
    );
  const stale = staleCitations(state, slice, viewer, review);
  if (stale.length) staleFail(stale);
  return {
    review: clone(review),
    audience: campaignMembers(state).map((member) => ({ id: member.id, name: member.name })),
    story: storyToAdopt(state, review, viewer),
  };
}
/** Publishing a withdrawn recap again runs the same checks as the first publication. */
export function republishCheck(state, slice, viewer, id) {
  requireDm(state, viewer);
  requireEnabled(state, slice);
  const review = reviewOf(slice, id);
  if (review.owner !== viewer) fail("Bozza di un’altra persona.", "Someone else’s draft.");
  if (review.status !== "withdrawn")
    fail("Il resoconto non è ritirato.", "The recap is not withdrawn.");
  const stale = staleCitations(state, slice, viewer, review);
  if (stale.length) staleFail(stale, true);
  return clone(review);
}
/**
 * Numbers a published or withdrawn recap cites that changed or are no longer shared:
 * a withdrawn recap may not be published again; a published one is flagged to the DM.
 */
export function republishBlockers(state, slice, viewer, review) {
  if (!["withdrawn", "published"].includes(review?.status)) return [];
  return staleCitations(state, slice, viewer, review).map((c) => c.n);
}
export function markPublished(slice, id, { entryId, at = new Date().toISOString() }) {
  const review = reviewOf(slice, id);
  review.status = "published";
  review.publishedEntryId = entryId;
  review.publishedAt = at;
  review.withdrawn = null;
  review.history.push({ kind: "published", at, entryId });
  return clone(review);
}
export function markWithdrawn(slice, id, { reason, at = new Date().toISOString() }) {
  const review = reviewOf(slice, id);
  if (review.status !== "published")
    fail("Il resoconto non è pubblicato.", "The recap is not published.");
  const why = str(reason).replace(/\s+/g, " ").trim();
  if (why.length < 3) fail("Scrivi il motivo del ritiro.", "Write the reason for withdrawing.");
  review.status = "withdrawn";
  review.withdrawn = { at, reason: why.slice(0, MAX_REASON) };
  review.history.push({ kind: "withdrawn", at, reason: why.slice(0, MAX_REASON) });
  return clone(review);
}
export function markRepublished(slice, id, at = new Date().toISOString()) {
  const review = reviewOf(slice, id);
  if (review.status !== "withdrawn")
    fail("Il resoconto non è ritirato.", "The recap is not withdrawn.");
  review.status = "published";
  review.history.push({ kind: "republished", at });
  return clone(review);
}
// ---------------------------------------------------------------- B14 session story

/**
 * The automatic story B14 wrote for an ended Table session (attendance, duration,
 * scenes, "What happened:"), as the DM sees it: {draftId, kind, status, entryId}.
 */
export function sessionStory(state, sessionId, viewer) {
  const row = (state.ext?.[STORIES]?.stories ?? []).find((story) => story.sessionId === sessionId);
  if (!row) return null;
  const draft = (state.campaignContent?.drafts ?? []).find(
    (d) => d.id === row.draftId && d.ownerId === viewer,
  );
  if (!draft) return null;
  return {
    draftId: draft.id,
    kind: draft.kind,
    status: draft.status,
    entryId: draft.result?.entryId ?? draft.entryId ?? null,
    title: str(draft.data?.title),
    body: str(draft.data?.body),
  };
}
/**
 * One recap per session (Archivist: /end opens the Session Review, SVC-086): a recap of
 * a Table session completes B14's story draft of that session when it is still an open
 * journal draft, instead of publishing a second recap.
 */
export function storyToAdopt(state, review, viewer) {
  if (review?.window?.kind !== "session") return null;
  const story = sessionStory(state, review.windowId.slice("session:".length), viewer);
  return story?.status === "active" && story.kind === "recap" ? story : null;
}
/** The ended Table session whose B14 story a draft is, or null. */
export function storyOfDraft(state, draftId) {
  const row = (state.ext?.[STORIES]?.stories ?? []).find((story) => story.draftId === draftId);
  if (!row) return null;
  const session = (state.ext?.["session-view"]?.sessions ?? []).find((s) => s.id === row.sessionId);
  return session ? { sessionId: session.id, number: session.number, status: session.status } : null;
}
/** Journal text of a completed story: B14's facts first, then the reviewed recap. */
export function storyBody(story, recap) {
  const facts = str(story?.body).replace(/\s+$/, "");
  return facts ? `${facts}\n${recap}` : recap;
}
/** Whether a session already has a shared recap (B14 story applied, or ours published). */
export function sessionRecapped(state, slice, viewer, sessionId) {
  const story = sessionStory(state, sessionId, viewer);
  if (story?.status === "applied" && story.kind === "recap") return true;
  return (slice?.reviews ?? []).some(
    (row) =>
      row.windowId === `session:${sessionId}` && ["published", "withdrawn"].includes(row.status),
  );
}
/** Ended Table sessions that still have no recap (Archivist: /end opens review). */
export function sessionsToReview(state, slice, viewer) {
  if (!isDm(state, viewer)) return [];
  const reviewed = new Set((slice.reviews ?? []).map((row) => row.windowId));
  return (state.ext?.["session-view"]?.sessions ?? [])
    .filter(
      (session) =>
        session.status === "ended" &&
        !reviewed.has(`session:${session.id}`) &&
        !sessionRecapped(state, slice, viewer, session.id),
    )
    .map((session) => ({
      id: `session:${session.id}`,
      sessionId: session.id,
      number: session.number,
      endedAt: iso(session.endedAt),
      story: sessionStory(state, session.id, viewer),
    }));
}
