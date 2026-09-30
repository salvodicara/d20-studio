// Table safety (B27): pure domain for lines and veils, the campaign expectations sheet,
// the session-zero outline, in-play signals, the raise-hand queue, stars and wishes and
// personal content filters. No DOM, no registry: every function works on a plain state
// object and on the area's own slice (state.ext.safety).
//
// Patterns (docs/interview/CAPABILITY_CENSUS.md, card B27; market census rows):
// - Profile-level lines and veils, combined without names for the table: Alchemy Safety
//   tab (VTL-058, SVC-073).
// - Game Expectations sheet with hard and soft limits: D&D 2024 DMG (SVC-074); a shared
//   sheet always declares a safety tool, because the anonymous Stop can never be taken
//   out (Alchemy SVC-110, Roll20 R20-150; StartPlaying's tool checklist, SVC-070); free
//   session zero outline (SVC-072); topics reminded before each session, not logged:
//   Let's Role (VTL-059); content warnings before joining: Alchemy (SVC-010).
// - Graded anonymity: Stop fully anonymous, Raise Hand named (Owlbear "Rumble!", SVC-113);
//   Keep going / Slow down / Stop deck (Roll20, R20-150); X-Card flashing on the DM screen
//   (Alchemy, SVC-110); named hand-raise queue with front/back moves (Foundry module
//   "Safety and Communication", SVC-111; "Raise My Hand", FVT-069).
// - Stars and wishes after the session (StartPlaying, SVC-076).
// - Personal content filter switch (Baldur's Gate 3, CRP-183).
//
// Anonymity: an anonymous signal or an unsigned star/wish never stores who sent it. The
// combined lines/veils projection returns topics only (no member or entry ids).
// Withdrawal: sending returns a random token that only the sending device keeps; the
// shared record holds its SHA-256 hash, never returned by a projection. Withdrawing needs
// the token (or, for a signed entry, being its signer), so other members cannot remove it.

import { campaignMembers } from "./campaign-content.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const SAFETY_SLICE = "safety";
export const SAFETY_VERSION = 1;
export const TOPIC_MAX = 80;
export const TEXT_MAX = 600;
export const STAR_MAX = 300;
export const NOTE_MAX = 300;

const L = (it, en) => Object.freeze({ it, en });

// Preset topics a person can pick (or type a custom one), in our own words.
export const SAFETY_TOPICS = Object.freeze(
  [
    ["spiders", "Ragni", "Spiders"],
    ["insects", "Insetti e sciami", "Insects and swarms"],
    ["gore", "Sangue e ferite esplicite", "Graphic blood and wounds"],
    ["body-horror", "Orrore corporeo", "Body horror"],
    ["animal-harm", "Violenza sugli animali", "Harm to animals"],
    ["child-harm", "Violenza sui bambini", "Harm to children"],
    ["torture", "Tortura", "Torture"],
    ["sexual", "Contenuti sessuali", "Sexual content"],
    ["self-harm", "Autolesionismo", "Self-harm"],
    ["drowning", "Annegamento e soffocamento", "Drowning and suffocation"],
    ["slurs", "Linguaggio offensivo", "Slurs and offensive language"],
  ].map(([id, it, en]) => Object.freeze({ id, label: L(it, en) })),
);

// Tools the DM declares in the expectations sheet (StartPlaying checklist, SVC-070).
// The anonymous Stop is always available to everyone, as in Alchemy (SVC-110) and in
// Roll20's deck that anyone can play (R20-150): the sheet cannot remove it. Lines and
// veils always apply too: they live in each person's profile and always reach the table
// (Alchemy, SVC-073/VTL-058), so no sheet can hide a member's hard limit from the group.
export const ALWAYS_TOOLS = Object.freeze(["stop", "lines"]);
export const SAFETY_TOOLS = Object.freeze(
  [
    ["stop", "Stop (carta X)", "Stop (X-card)"],
    ["pace", "Rallenta e Continua", "Slow down and Keep going"],
    ["hand", "Alza la mano", "Raise hand"],
    ["lines", "Linee e veli", "Lines and veils"],
    ["stars", "Stelle e desideri", "Stars and wishes"],
  ].map(([id, it, en]) => Object.freeze({ id, label: L(it, en) })),
);

// Anonymous in-play signals (R20-150 deck, SVC-111 X/N/O cards). `tool` gates them.
export const SIGNAL_KINDS = Object.freeze({
  stop: Object.freeze({ tool: "stop", label: L("Stop (carta X)", "Stop (X-card)") }),
  pace: Object.freeze({ tool: "pace", label: L("Rallenta", "Slow down") }),
  go: Object.freeze({ tool: "pace", label: L("Continua", "Keep going") }),
});

// Session zero outline: optional topics from F-032 (adopted rules, agreed style, what
// happens when someone is missing) and the DMG 2024 session-zero guidance.
export const SESSION_ZERO_ITEMS = Object.freeze(
  [
    ["tone", "Tono e stile della campagna", "Campaign tone and style"],
    ["limits", "Linee e veli raccolti", "Lines and veils collected"],
    ["tools", "Strumenti di sicurezza spiegati", "Safety tools explained"],
    ["house-rules", "Regole della casa adottate", "House rules adopted"],
    ["absence", "Cosa succede quando manca qualcuno", "What happens when someone is missing"],
    ["schedule", "Frequenza e orario delle sessioni", "Session frequency and time"],
    ["party", "Legami e motivi del gruppo", "Party ties and motivations"],
  ].map(([id, it, en]) => Object.freeze({ id, label: L(it, en) })),
);

/** A refusal the host shows in the current language (ctx.commit keeps {it, en}). */
export function refusal(it, en) {
  return Object.assign(new Error(it), { it, en });
}

const copy = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value) => (typeof value === "string" ? value.trim() : "");
let counter = 0;
export function newId(prefix) {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${(++counter).toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}
const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------------
// Withdraw proof: SHA-256 (FIPS 180-4), synchronous because commits are synchronous.

const rotr = (x, n) => (x >>> n) | (x << (32 - n));
let SHA = null;
function shaConstants() {
  const primes = [];
  for (let n = 2; primes.length < 64; n++) if (primes.every((p) => n % p !== 0)) primes.push(n);
  const bits = (x) => ((x % 1) * 2 ** 32) | 0;
  return {
    k: primes.map((p) => bits(Math.cbrt(p))),
    h: primes.slice(0, 8).map((p) => bits(Math.sqrt(p))),
  };
}
/** Hex SHA-256 of a UTF-8 string. */
export function sha256(value) {
  SHA ??= shaConstants();
  const bytes = new TextEncoder().encode(String(value));
  const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bytes.length / 2 ** 29));
  view.setUint32(padded.length - 4, (bytes.length * 8) >>> 0);
  const h = [...SHA.h];
  const w = new Int32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getInt32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }
    let [a, b, c, d, e, f, g, k] = h;
    for (let i = 0; i < 64; i++) {
      const t1 =
        (k + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + SHA.k[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      [k, g, f, e, d, c, b, a] = [g, f, e, (d + t1) | 0, c, b, a, (t1 + t2) | 0];
    }
    [a, b, c, d, e, f, g, k].forEach((value, i) => (h[i] = (h[i] + value) | 0));
  }
  return h.map((value) => (value >>> 0).toString(16).padStart(8, "0")).join("");
}
/** 128 random bits as hex: the withdraw token kept by the sending device only. */
function withdrawToken() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
const HASH = /^[0-9a-f]{64}$/;
const proves = (record, token) =>
  typeof token === "string" &&
  token.length >= 16 &&
  HASH.test(record?.withdrawHash ?? "") &&
  sha256(token) === record.withdrawHash;
const withHash = (record, value) =>
  HASH.test(value ?? "") ? { ...record, withdrawHash: value } : record;

export const topicById = (id) => SAFETY_TOPICS.find((topic) => topic.id === id) ?? null;
export const toolById = (id) => SAFETY_TOOLS.find((tool) => tool.id === id) ?? null;

/** Stable comparison key of a topic entry: a preset id or the lower-case custom text. */
export function topicKey(entry) {
  if (entry?.topic) return "t:" + entry.topic;
  return "c:" + text(entry?.custom).toLocaleLowerCase("it");
}

/**
 * Reads a typed topic: a preset matches by id or by its Italian/English label (any
 * case); anything else is a custom topic. Refuses empty or too long text.
 */
export function parseTopic(value) {
  const raw = text(value).replace(/\s+/g, " ");
  if (!raw) throw refusal("Scrivi o scegli un argomento.", "Type or choose a topic.");
  if (raw.length > TOPIC_MAX)
    throw refusal(
      `Argomento troppo lungo (massimo ${TOPIC_MAX} caratteri).`,
      `Topic too long (${TOPIC_MAX} characters at most).`,
    );
  if (/[\u0000-\u001f<>]/.test(raw))
    throw refusal(
      "L’argomento contiene caratteri non ammessi.",
      "The topic has invalid characters.",
    );
  const lower = raw.toLocaleLowerCase("it");
  const preset = SAFETY_TOPICS.find(
    (topic) =>
      topic.id === lower ||
      topic.label.it.toLocaleLowerCase("it") === lower ||
      topic.label.en.toLocaleLowerCase("en") === lower,
  );
  return preset ? { topic: preset.id } : { custom: raw };
}

function validEntry(entry) {
  if (!isObject(entry) || typeof entry.id !== "string") return null;
  if (typeof entry.topic === "string" && topicById(entry.topic))
    return { id: entry.id, topic: entry.topic };
  const custom = text(entry.custom);
  return custom && custom.length <= TOPIC_MAX ? { id: entry.id, custom } : null;
}
const entries = (list) => (Array.isArray(list) ? list.map(validEntry).filter(Boolean) : []);
function dedupe(list) {
  const seen = new Set();
  return list.filter((entry) => {
    const key = topicKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------------
// Slice: seed and normalization (synthetic data coherent with the 'lanterns' campaign).

const emptyExpectations = () => ({
  tone: "",
  welcome: "",
  lines: [],
  veils: [],
  warnings: [],
  sessionWarnings: "",
  tools: SAFETY_TOOLS.map((tool) => tool.id),
  shared: false,
  remind: false,
  revision: 0,
  updatedAt: null,
});
const emptyCampaign = () => ({
  expectations: emptyExpectations(),
  checklist: {},
  marks: [],
  // P10 CA-68: handouts the DM marks with topics (scenes keep their own `marks`).
  contentMarks: [],
  signals: [],
  hands: [],
  rounds: [],
});
const emptyProfile = () => ({
  lines: [],
  veils: [],
  filter: { enabled: false, extra: [], profanity: false, images: false },
});

export function seedSafety() {
  return {
    // The DM keeps personal limits too; the player's profile starts empty.
    profiles: {
      dm: {
        lines: [{ id: "lim-dm-child-harm", topic: "child-harm" }],
        veils: [{ id: "lim-dm-torture", topic: "torture" }],
        filter: { enabled: false, extra: [] },
      },
    },
    campaigns: {
      lanterns: {
        // The DM started the sheet at session zero but has not shared it yet.
        expectations: {
          ...emptyExpectations(),
          tone: "Mistero e avventura, con qualche momento di orrore leggero.",
          welcome: "Esplorazione, intrighi fra le famiglie di Bruma, combattimenti tattici.",
          warnings: [{ id: "lim-warn-spiders", topic: "spiders" }],
          revision: 1,
          updatedAt: sampleDate("2026-09-05T19:30:00.000Z"),
        },
        checklist: {
          tone: { done: true, note: "Concordato alla prima sessione." },
          schedule: { done: true, note: "Venerdì sera, ogni due settimane." },
        },
        marks: [],
        signals: [],
        hands: [],
        rounds: [
          {
            id: "round-2026-09-12",
            openedAt: sampleDate("2026-09-12T21:40:00.000Z"),
            closedAt: sampleDate("2026-09-12T22:05:00.000Z"),
            entries: [
              {
                id: "sw-2026-09-12-a",
                star: "La lanterna che si riaccende sulla torre.",
                wish: "",
                signedBy: null,
                at: sampleDate("2026-09-12T21:44:00.000Z"),
              },
              {
                id: "sw-2026-09-12-b",
                star: "",
                wish: "Più tempo per esplorare l’osservatorio.",
                signedBy: "player",
                at: sampleDate("2026-09-12T21:47:00.000Z"),
              },
            ],
          },
        ],
      },
    },
  };
}

function normalizeExpectations(value) {
  const base = emptyExpectations();
  if (!isObject(value)) return base;
  return {
    tone: text(value.tone).slice(0, TEXT_MAX),
    welcome: text(value.welcome).slice(0, TEXT_MAX),
    lines: dedupe(entries(value.lines)),
    veils: dedupe(entries(value.veils)),
    warnings: dedupe(entries(value.warnings)),
    sessionWarnings: text(value.sessionWarnings).slice(0, TEXT_MAX),
    tools: Array.isArray(value.tools) ? withAlwaysTools(value.tools) : base.tools,
    shared: value.shared === true,
    remind: value.shared === true && value.remind === true,
    revision: Number.isInteger(value.revision) && value.revision >= 0 ? value.revision : 0,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  };
}
function normalizeCampaign(value) {
  if (!isObject(value)) return emptyCampaign();
  const checklist = {};
  for (const item of SESSION_ZERO_ITEMS) {
    const row = value.checklist?.[item.id];
    if (isObject(row))
      checklist[item.id] = { done: row.done === true, note: text(row.note).slice(0, NOTE_MAX) };
  }
  const list = (key, valid) => (Array.isArray(value[key]) ? value[key].filter(valid) : []);
  return {
    expectations: normalizeExpectations(value.expectations),
    checklist,
    marks: list(
      "marks",
      (mark) => isObject(mark) && typeof mark.id === "string" && typeof mark.sceneId === "string",
    ).map((mark) => ({
      id: mark.id,
      sceneId: mark.sceneId,
      topics: dedupe(entries(mark.topics)),
      revision: Number.isInteger(mark.revision) ? mark.revision : 1,
    })),
    contentMarks: list(
      "contentMarks",
      (mark) =>
        isObject(mark) &&
        typeof mark.id === "string" &&
        CONTENT_KINDS.includes(mark.kind) &&
        typeof mark.targetId === "string",
    ).map((mark) => ({
      id: mark.id,
      kind: mark.kind,
      targetId: mark.targetId,
      topics: dedupe(entries(mark.topics)),
      revision: Number.isInteger(mark.revision) ? mark.revision : 1,
    })),
    // Anonymous signals keep only id, kind, time and the withdraw hash, whatever older
    // data held.
    signals: list(
      "signals",
      (signal) => isObject(signal) && typeof signal.id === "string" && SIGNAL_KINDS[signal.kind],
    ).map((signal) =>
      withHash(
        { id: signal.id, kind: signal.kind, at: String(signal.at ?? "") },
        signal.withdrawHash,
      ),
    ),
    hands: list(
      "hands",
      (hand) => isObject(hand) && typeof hand.id === "string" && typeof hand.memberId === "string",
    ).map((hand) => ({ id: hand.id, memberId: hand.memberId, at: String(hand.at ?? "") })),
    rounds: list("rounds", (round) => isObject(round) && typeof round.id === "string").map(
      (round) => ({
        id: round.id,
        openedAt: String(round.openedAt ?? ""),
        closedAt: typeof round.closedAt === "string" ? round.closedAt : null,
        entries: (Array.isArray(round.entries) ? round.entries : [])
          .filter((entry) => isObject(entry) && typeof entry.id === "string")
          .map((entry) =>
            withHash(
              {
                id: entry.id,
                star: text(entry.star).slice(0, STAR_MAX),
                wish: text(entry.wish).slice(0, STAR_MAX),
                signedBy: typeof entry.signedBy === "string" ? entry.signedBy : null,
                at: String(entry.at ?? ""),
              },
              entry.withdrawHash,
            ),
          ),
      }),
    ),
  };
}

/** Registry normalize(): idempotent; refuses data saved by a newer version. */
export function normalizeSafety(slice, fromVersion = SAFETY_VERSION) {
  if (fromVersion > SAFETY_VERSION)
    throw Error("Safety data comes from a newer version of the app");
  if (!isObject(slice)) return seedSafety();
  const profiles = {};
  for (const [memberId, profile] of Object.entries(
    isObject(slice.profiles) ? slice.profiles : {},
  )) {
    if (!isObject(profile)) continue;
    profiles[memberId] = {
      lines: dedupe(entries(profile.lines)),
      veils: dedupe(entries(profile.veils)),
      filter: {
        enabled: profile.filter?.enabled === true,
        extra: Array.isArray(profile.filter?.extra)
          ? [...new Set(profile.filter.extra.filter((id) => topicById(id)))]
          : [],
        profanity: profile.filter?.profanity === true,
        images: profile.filter?.images === true,
      },
    };
    if (isObject(profile.held))
      profiles[memberId].held = {
        lines: dedupe(entries(profile.held.lines)),
        veils: dedupe(entries(profile.held.veils)),
      };
  }
  const campaigns = {};
  for (const [id, value] of Object.entries(isObject(slice.campaigns) ? slice.campaigns : {}))
    campaigns[id] = normalizeCampaign(value);
  return { profiles, campaigns };
}

// ---------------------------------------------------------------------------------
// Membership and roles (identities are the demo's campaign members: "player", "dm").

export function memberOf(state, campaignId, viewer) {
  return campaignMembers(state, campaignId).find((member) => member.id === viewer) ?? null;
}
export function isSafetyDm(state, campaignId, viewer) {
  return ["dm", "co-dm"].includes(memberOf(state, campaignId, viewer)?.role);
}
function requireMember(state, campaignId, viewer) {
  const member = memberOf(state, campaignId, viewer);
  if (!member)
    throw refusal(
      "Solo i membri della campagna usano questi strumenti.",
      "Only campaign members use these tools.",
    );
  return member;
}
function requireDm(state, campaignId, viewer) {
  requireMember(state, campaignId, viewer);
  if (!isSafetyDm(state, campaignId, viewer))
    throw refusal("Solo il DM può farlo.", "Only the DM can do this.");
}

/** Read-only view of a campaign's data (defaults when nothing is stored yet). */
export function campaignData(slice, campaignId) {
  return slice?.campaigns?.[campaignId] ?? emptyCampaign();
}
function mutableCampaign(slice, campaignId) {
  slice.campaigns ??= {};
  return (slice.campaigns[campaignId] ??= emptyCampaign());
}

// ---------------------------------------------------------------------------------
// Personal profile: lines, veils and the content filter (per identity, every campaign).

export function profileOf(slice, memberId) {
  const profile = slice?.profiles?.[memberId];
  return {
    lines: profile?.lines ?? [],
    veils: profile?.veils ?? [],
    filter: {
      enabled: profile?.filter?.enabled === true,
      extra: profile?.filter?.extra ?? [],
      profanity: profile?.filter?.profanity === true,
      images: profile?.filter?.images === true,
    },
  };
}
function mutableProfile(slice, memberId) {
  slice.profiles ??= {};
  return (slice.profiles[memberId] ??= emptyProfile());
}
const LIST_NAMES = {
  lines: L("tra le tue linee", "among your lines"),
  veils: L("tra i tuoi veli", "among your veils"),
};

/** Adds a line or a veil to the viewer's own profile; returns the new entry. */
export function addLimit(slice, memberId, list, value) {
  if (!LIST_NAMES[list]) throw refusal("Elenco non valido.", "Invalid list.");
  const topic = parseTopic(value);
  const profile = mutableProfile(slice, memberId);
  const key = topicKey(topic);
  if (profile[list].some((entry) => topicKey(entry) === key))
    throw refusal(`È già ${LIST_NAMES[list].it}.`, `It is already ${LIST_NAMES[list].en}.`);
  const other = list === "lines" ? "veils" : "lines";
  if (profile[other].some((entry) => topicKey(entry) === key))
    throw refusal(
      `È già ${LIST_NAMES[other].it}: toglilo da lì per spostarlo.`,
      `It is already ${LIST_NAMES[other].en}: remove it there to move it.`,
    );
  if (profile[list].length >= 40)
    throw refusal("Hai raggiunto il limite di 40 argomenti.", "You reached the 40-topic limit.");
  const entry = { id: newId("lim"), ...topic };
  profile[list].push(entry);
  return entry;
}
export function removeLimit(slice, memberId, list, entryId) {
  if (!LIST_NAMES[list]) throw refusal("Elenco non valido.", "Invalid list.");
  const profile = mutableProfile(slice, memberId);
  const index = profile[list].findIndex((entry) => entry.id === entryId);
  if (index < 0) throw refusal("Argomento già tolto.", "Topic already removed.");
  return profile[list].splice(index, 1)[0];
}
export function setContentFilter(slice, memberId, { enabled, extra, profanity, images } = {}) {
  const profile = mutableProfile(slice, memberId);
  if (enabled !== undefined) profile.filter.enabled = enabled === true;
  if (profanity !== undefined) profile.filter.profanity = profanity === true;
  if (images !== undefined) profile.filter.images = images === true;
  if (extra !== undefined) {
    if (!Array.isArray(extra) || extra.some((id) => !topicById(id)))
      throw refusal("Argomento del filtro non valido.", "Invalid filter topic.");
    profile.filter.extra = [...new Set(extra)];
  }
  return copy(profile.filter);
}

// Offline edits (simulated offline mode): the profile saves on the device at once, but
// the group keeps seeing the version sent before going offline (`held`) until this
// device is back online and sends it (releaseProfile). In the demo each identity is its
// own device.

/** Before an offline edit: keep what the group currently sees, once. */
export function holdProfile(slice, memberId) {
  const profile = mutableProfile(slice, memberId);
  profile.held ??= copy({ lines: profile.lines, veils: profile.veils });
}
/** Back online: the group sees the current profile. Returns false if nothing was held. */
export function releaseProfile(slice, memberId) {
  const profile = slice?.profiles?.[memberId];
  if (!profile?.held) return false;
  delete profile.held;
  return true;
}
export const profileHeld = (slice, memberId) => Boolean(slice?.profiles?.[memberId]?.held);

/**
 * The table's combined lines and veils: topics from every active member's profile as the
 * group last received it, deduplicated, with no member or entry ids. A topic someone
 * keeps as a line is a line.
 */
export function combinedLimits(state, slice, campaignId) {
  const lines = new Map();
  const veils = new Map();
  for (const member of campaignMembers(state, campaignId)) {
    const profile = slice?.profiles?.[member.id]?.held ?? profileOf(slice, member.id);
    for (const entry of profile.lines) lines.set(topicKey(entry), topicOnly(entry));
    for (const entry of profile.veils) veils.set(topicKey(entry), topicOnly(entry));
  }
  for (const key of lines.keys()) veils.delete(key);
  return { lines: [...lines.values()], veils: [...veils.values()] };
}
const topicOnly = (entry) => (entry.topic ? { topic: entry.topic } : { custom: entry.custom });

// ---------------------------------------------------------------------------------
// Expectations sheet (DM) and session-zero outline.

function topicList(values, field) {
  const list = [];
  for (const value of Array.isArray(values) ? values : []) {
    const topic = typeof value === "string" ? parseTopic(value) : value;
    if (!isObject(topic) || !(topic.topic ? topicById(topic.topic) : text(topic.custom)))
      throw refusal(`Argomento non valido in ${field.it}.`, `Invalid topic in ${field.en}.`);
    list.push({
      id: newId("lim"),
      ...(topic.topic ? { topic: topic.topic } : { custom: text(topic.custom) }),
    });
  }
  return dedupe(list);
}
function limitText(value, name) {
  const result = text(value);
  if (result.length > TEXT_MAX)
    throw refusal(
      `${name.it}: massimo ${TEXT_MAX} caratteri.`,
      `${name.en}: ${TEXT_MAX} characters at most.`,
    );
  return result;
}

/** Declared tools in catalogue order, the always-available Stop included. */
function withAlwaysTools(ids) {
  return SAFETY_TOOLS.map((tool) => tool.id).filter(
    (id) => ALWAYS_TOOLS.includes(id) || ids.includes(id),
  );
}

/**
 * Saves the DM's expectations sheet. A shared sheet always declares at least one tool
 * (SVC-070), because the anonymous Stop is always part of it.
 */
export function saveExpectations(state, slice, campaignId, viewer, data = {}) {
  requireDm(state, campaignId, viewer);
  const requested = Array.isArray(data.tools) ? data.tools : [];
  if (requested.some((id) => !toolById(id)))
    throw refusal("Strumento di sicurezza sconosciuto.", "Unknown safety tool.");
  const tools = withAlwaysTools(requested);
  const shared = data.shared === true;
  const remind = data.remind === true;
  if (remind && !shared)
    throw refusal(
      "Il promemoria prima della sessione richiede aspettative condivise.",
      "The pre-session reminder needs shared expectations.",
    );
  const lines = topicList(data.lines, L("Limiti rigidi", "Hard limits"));
  const veils = topicList(data.veils, L("Limiti morbidi", "Soft limits")).filter(
    (entry) => !lines.some((line) => topicKey(line) === topicKey(entry)),
  );
  const campaign = mutableCampaign(slice, campaignId);
  campaign.expectations = {
    tone: limitText(data.tone, L("Tono e stile", "Tone and style")),
    welcome: limitText(data.welcome, L("Temi benvenuti", "Welcome themes")),
    lines,
    veils,
    warnings: topicList(data.warnings, L("Avvisi di contenuto", "Content warnings")),
    sessionWarnings: limitText(
      data.sessionWarnings,
      L("Avvisi per la prossima sessione", "Next session warnings"),
    ),
    tools,
    shared,
    remind,
    revision: (campaign.expectations?.revision ?? 0) + 1,
    updatedAt: nowIso(),
  };
  return copy(campaign.expectations);
}

/** The sheet as this viewer may read it: the DM always, players once it is shared. */
export function expectationsFor(state, slice, campaignId, viewer) {
  if (!memberOf(state, campaignId, viewer)) return null;
  const expectations = campaignData(slice, campaignId).expectations;
  if (!expectations.shared && !isSafetyDm(state, campaignId, viewer)) return null;
  return copy(expectations);
}

export function saveChecklist(state, slice, campaignId, viewer, items = {}) {
  requireDm(state, campaignId, viewer);
  const checklist = {};
  for (const item of SESSION_ZERO_ITEMS) {
    const row = items[item.id];
    if (!isObject(row)) continue;
    const note = text(row.note);
    if (note.length > NOTE_MAX)
      throw refusal(
        `${item.label.it}: nota troppo lunga (massimo ${NOTE_MAX} caratteri).`,
        `${item.label.en}: note too long (${NOTE_MAX} characters at most).`,
      );
    if (row.done === true || note) checklist[item.id] = { done: row.done === true, note };
  }
  mutableCampaign(slice, campaignId).checklist = checklist;
  return copy(checklist);
}
/** The outline travels with the sheet: players read it once the sheet is shared. */
export function checklistFor(state, slice, campaignId, viewer) {
  return expectationsFor(state, slice, campaignId, viewer)
    ? copy(campaignData(slice, campaignId).checklist)
    : null;
}

/**
 * Tools available at the table: all before the sheet is shared; afterwards those it
 * declares, the anonymous Stop always included.
 */
export function enabledTools(slice, campaignId) {
  const expectations = campaignData(slice, campaignId).expectations;
  return expectations.shared
    ? withAlwaysTools(expectations.tools)
    : SAFETY_TOOLS.map((tool) => tool.id);
}

/**
 * What the pre-session reminder shows (Let's Role, VTL-059): welcome themes, the
 * combined limits, warnings and tools. Null when the DM has not enabled it. Reading it
 * leaves no trace in shared data; `key` changes when the DM updates the sheet.
 */
export function reminderFor(state, slice, campaignId, viewer) {
  const expectations = expectationsFor(state, slice, campaignId, viewer);
  if (!expectations?.shared || !expectations.remind) return null;
  const group = combinedLimits(state, slice, campaignId);
  const lines = dedupe([...expectations.lines, ...group.lines].map(topicOnly));
  const veils = dedupe([...expectations.veils, ...group.veils].map(topicOnly)).filter(
    (entry) => !lines.some((line) => topicKey(line) === topicKey(entry)),
  );
  return {
    key: `${campaignId}:${expectations.revision}`,
    tone: expectations.tone,
    welcome: expectations.welcome,
    lines,
    veils,
    warnings: expectations.warnings.map(topicOnly),
    sessionWarnings: expectations.sessionWarnings,
    tools: [...expectations.tools],
  };
}

// ---------------------------------------------------------------------------------
// Content marks and personal filters (BG3 content switch, CRP-183).

export function markScene(state, slice, campaignId, viewer, sceneId, topics) {
  requireDm(state, campaignId, viewer);
  if (!(state.scenes ?? []).some((scene) => scene.id === sceneId))
    throw refusal("Scena non trovata.", "Scene not found.");
  const list = topicList(topics, L("Contenuti marcati", "Marked content"));
  if (!list.length)
    throw refusal("Scegli almeno un argomento da marcare.", "Choose at least one topic to mark.");
  const campaign = mutableCampaign(slice, campaignId);
  const existing = campaign.marks.find((mark) => mark.sceneId === sceneId);
  if (existing) {
    existing.topics = list;
    existing.revision += 1;
    return copy(existing);
  }
  const mark = { id: newId("mark"), sceneId, topics: list, revision: 1 };
  campaign.marks.push(mark);
  return copy(mark);
}
export function unmarkScene(state, slice, campaignId, viewer, markId) {
  requireDm(state, campaignId, viewer);
  const campaign = mutableCampaign(slice, campaignId);
  const index = campaign.marks.findIndex((mark) => mark.id === markId);
  if (index < 0) throw refusal("Marcatura già tolta.", "Mark already removed.");
  campaign.marks.splice(index, 1);
}
/**
 * Marks this viewer may know about: the DM sees all; a player only the marks of scenes
 * already revealed or active (a mark never discloses an unrevealed scene).
 */
export function marksFor(state, slice, campaignId, viewer) {
  if (!memberOf(state, campaignId, viewer)) return [];
  const dm = isSafetyDm(state, campaignId, viewer);
  return campaignData(slice, campaignId)
    .marks.map((mark) => ({ mark, scene: (state.scenes ?? []).find((s) => s.id === mark.sceneId) }))
    .filter(
      ({ scene }) => scene && (dm || scene.revealed === true || scene.id === state.activeSceneId),
    )
    .map(({ mark, scene }) => ({ ...copy(mark), sceneName: scene.name }));
}
/** Topics of the viewer's own filter (own lines, own veils, extra presets) when enabled. */
export function filterKeys(slice, memberId) {
  const profile = profileOf(slice, memberId);
  if (!profile.filter.enabled) return new Set();
  return new Set([
    ...[...profile.lines, ...profile.veils].map(topicKey),
    ...profile.filter.extra.map((id) => "t:" + id),
  ]);
}
/** The marked topics of a scene that this viewer's filter blurs (empty: not blurred). */
export function filteredTopics(state, slice, campaignId, memberId, sceneId) {
  if (!memberOf(state, campaignId, memberId)) return { topics: [], revision: 0 };
  const keys = filterKeys(slice, memberId);
  const mark = campaignData(slice, campaignId).marks.find((entry) => entry.sceneId === sceneId);
  if (!mark || !keys.size) return { topics: [], revision: 0 };
  return {
    topics: mark.topics.filter((topic) => keys.has(topicKey(topic))).map(topicOnly),
    revision: mark.revision,
    markId: mark.id,
  };
}

// ---------------------------------------------------------------------------------
// P10 CA-68 (BG3 content toggles and profanity filter): the personal filter covers maps,
// handouts, images, chat and text, not only marked maps.

// R7 H-05: a World or Journal entry (campaign-content id) is marked like a handout; the
// journal and world readers (R8) veil it with filterFor(...).topicsFor("entry", id).
export const CONTENT_KINDS = Object.freeze(["handout", "entry"]);
/** The DM marks a handout or an entry with topics (like a map); the viewer's filter veils it. */
export function markContent(state, slice, campaignId, viewer, kind, targetId, topics) {
  requireDm(state, campaignId, viewer);
  if (!CONTENT_KINDS.includes(kind) || typeof targetId !== "string" || !targetId)
    throw refusal("Contenuto non valido.", "Invalid content.");
  const list = topicList(topics, L("Contenuti marcati", "Marked content"));
  const campaign = mutableCampaign(slice, campaignId);
  campaign.contentMarks ??= [];
  const existing = campaign.contentMarks.find(
    (mark) => mark.kind === kind && mark.targetId === targetId,
  );
  if (!list.length) {
    if (existing) campaign.contentMarks.splice(campaign.contentMarks.indexOf(existing), 1);
    return null;
  }
  if (existing) {
    existing.topics = list;
    existing.revision += 1;
    return copy(existing);
  }
  const mark = { id: newId("cmark"), kind, targetId, topics: list, revision: 1 };
  campaign.contentMarks.push(mark);
  return copy(mark);
}
export const contentMarkOf = (slice, campaignId, kind, targetId) =>
  (campaignData(slice, campaignId).contentMarks ?? []).find(
    (mark) => mark.kind === kind && mark.targetId === targetId,
  ) ?? null;
/** The marked topics of a handout that this viewer's filter veils (empty: not veiled). */
export function filteredContentTopics(state, slice, campaignId, memberId, kind, targetId) {
  if (!memberOf(state, campaignId, memberId)) return { topics: [], revision: 0 };
  const keys = filterKeys(slice, memberId);
  const mark = contentMarkOf(slice, campaignId, kind, targetId);
  if (!mark || !keys.size) return { topics: [], revision: 0 };
  return {
    topics: mark.topics.filter((topic) => keys.has(topicKey(topic))).map(topicOnly),
    revision: mark.revision,
  };
}
// A short list of strong swear words in Italian and English, masked as in BG3's profanity
// filter (first letter kept). It is a personal preference, applied only on this viewer's
// screen; the original text is never changed for anyone else.
export const PROFANITY = Object.freeze([
  "cazzo",
  "cazzi",
  "merda",
  "stronzo",
  "stronza",
  "stronzi",
  "vaffanculo",
  "fanculo",
  "puttana",
  "troia",
  "coglione",
  "coglioni",
  "minchia",
  "bastardo",
  "bastarda",
  "fuck",
  "fucking",
  "fucker",
  "shit",
  "bullshit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "cunt",
  "motherfucker",
]);
const PROFANITY_RE = new RegExp(`(^|[^\\p{L}])(${PROFANITY.join("|")})(?=$|[^\\p{L}])`, "giu");
export function maskProfanity(value) {
  return String(value ?? "").replace(
    PROFANITY_RE,
    (match, before, word) => before + word[0] + "•".repeat(Math.max(1, word.length - 1)),
  );
}
/** Masks only the text between tags of trusted, already-escaped markup. */
function maskMarkup(markup) {
  return String(markup ?? "")
    .split(/(<[^>]*>)/)
    .map((part) => (part.startsWith("<") ? part : maskProfanity(part)))
    .join("");
}
/**
 * The viewer's own content filter, for every area that renders shared content (the
 * «Contenuto filtrato» contract: chat.mjs, handouts.mjs). `text` masks swear words when
 * the viewer chose it; `topicsFor` names the marked topics that veil a handout; `images`
 * says whether shared pictures start blurred.
 */
export function filterFor(state, role, campaignId = state?.campaign?.id) {
  const slice = state?.ext?.[SAFETY_SLICE];
  const profile = profileOf(slice, role);
  const on = profile.filter.enabled;
  return {
    enabled: on,
    profanity: on && profile.filter.profanity,
    images: on && profile.filter.images,
    text: (value) => (on && profile.filter.profanity ? maskProfanity(value) : String(value ?? "")),
    markup: (value) => (on && profile.filter.profanity ? maskMarkup(value) : String(value ?? "")),
    topicsFor: (kind, targetId) =>
      slice && on
        ? filteredContentTopics(state, slice, campaignId, role, kind, targetId)
        : { topics: [], revision: 0 },
  };
}

// ---------------------------------------------------------------------------------
// In-play signals: anonymous Stop / Slow down / Keep going.

/**
 * Sends an anonymous signal. The record holds no sender, only the hash of a withdraw
 * token. Returns {id, token}: the caller keeps the token on the sending device only.
 */
export function sendSignal(state, slice, campaignId, viewer, kind) {
  requireMember(state, campaignId, viewer);
  const spec = SIGNAL_KINDS[kind];
  if (!spec) throw refusal("Segnale sconosciuto.", "Unknown signal.");
  if (!enabledTools(slice, campaignId).includes(spec.tool))
    throw refusal(
      "Questo strumento non è fra quelli concordati per la campagna.",
      "This tool is not among the campaign's agreed tools.",
    );
  const campaign = mutableCampaign(slice, campaignId);
  const token = withdrawToken();
  const signal = { id: newId("sig"), kind, at: nowIso(), withdrawHash: sha256(token) };
  campaign.signals.push(signal);
  if (campaign.signals.length > 50) campaign.signals.shift();
  return { id: signal.id, token };
}
/** The DM confirms a signal: it disappears for everyone (nothing kept afterwards). */
export function acknowledgeSignal(state, slice, campaignId, viewer, signalId) {
  requireDm(state, campaignId, viewer);
  return removeSignal(slice, campaignId, signalId);
}
/**
 * Withdraws a signal sent by mistake. Every member sees the signal id, so the id alone
 * proves nothing: the sending device presents the withdraw token returned by
 * sendSignal. No sender needs to be stored.
 */
export function withdrawSignal(state, slice, campaignId, viewer, signalId, token) {
  requireMember(state, campaignId, viewer);
  const signal = campaignData(slice, campaignId).signals.find((entry) => entry.id === signalId);
  if (signal && !proves(signal, token))
    throw refusal(
      "Solo chi ha inviato il segnale può ritirarlo, dal dispositivo da cui l’ha inviato.",
      "Only whoever sent the signal can withdraw it, from the device that sent it.",
    );
  return removeSignal(slice, campaignId, signalId);
}
function removeSignal(slice, campaignId, signalId) {
  const campaign = mutableCampaign(slice, campaignId);
  const index = campaign.signals.findIndex((signal) => signal.id === signalId);
  if (index < 0)
    throw refusal("Il segnale è già stato gestito.", "The signal was already handled.");
  return campaign.signals.splice(index, 1)[0].kind;
}
/** Active signals as every member may see them: id, kind and time only. */
export function activeSignals(state, slice, campaignId, viewer) {
  if (!memberOf(state, campaignId, viewer)) return [];
  return campaignData(slice, campaignId).signals.map(({ id, kind, at }) => ({ id, kind, at }));
}

// ---------------------------------------------------------------------------------
// Raise-hand queue (named).

export function raiseHand(state, slice, campaignId, viewer) {
  requireMember(state, campaignId, viewer);
  if (!enabledTools(slice, campaignId).includes("hand"))
    throw refusal(
      "Alza la mano non è fra gli strumenti concordati.",
      "Raise hand is not among the agreed tools.",
    );
  if (isSafetyDm(state, campaignId, viewer))
    throw refusal("Il DM gestisce la coda.", "The DM manages the queue.");
  const campaign = mutableCampaign(slice, campaignId);
  if (campaign.hands.some((hand) => hand.memberId === viewer))
    throw refusal("Hai già la mano alzata.", "Your hand is already raised.");
  const hand = { id: newId("hand"), memberId: viewer, at: nowIso() };
  campaign.hands.push(hand);
  return hand.id;
}
export function lowerHand(state, slice, campaignId, viewer) {
  requireMember(state, campaignId, viewer);
  const campaign = mutableCampaign(slice, campaignId);
  const index = campaign.hands.findIndex((hand) => hand.memberId === viewer);
  if (index < 0) throw refusal("La tua mano non è alzata.", "Your hand is not raised.");
  campaign.hands.splice(index, 1);
}
/** The DM gives the floor: the person leaves the queue. Returns their member id. */
export function giveFloor(state, slice, campaignId, viewer, handId) {
  requireDm(state, campaignId, viewer);
  const campaign = mutableCampaign(slice, campaignId);
  const index = campaign.hands.findIndex((hand) => hand.id === handId);
  if (index < 0) throw refusal("Non è più in coda.", "No longer in the queue.");
  return campaign.hands.splice(index, 1)[0].memberId;
}
/** DM discretion: move someone to the front or the back of the queue (SVC-111). */
export function moveHand(state, slice, campaignId, viewer, handId, where) {
  requireDm(state, campaignId, viewer);
  if (!["front", "back"].includes(where))
    throw refusal("Posizione non valida.", "Invalid position.");
  const campaign = mutableCampaign(slice, campaignId);
  const index = campaign.hands.findIndex((hand) => hand.id === handId);
  if (index < 0) throw refusal("Non è più in coda.", "No longer in the queue.");
  const [hand] = campaign.hands.splice(index, 1);
  if (where === "front") campaign.hands.unshift(hand);
  else campaign.hands.push(hand);
  return campaign.hands.map((entry) => entry.id);
}
export function handQueue(state, slice, campaignId, viewer) {
  if (!memberOf(state, campaignId, viewer)) return [];
  return copy(campaignData(slice, campaignId).hands);
}

// ---------------------------------------------------------------------------------
// Stars and wishes after the session (optional; anonymous unless signed).

export function openRound(state, slice, campaignId, viewer) {
  requireDm(state, campaignId, viewer);
  if (!enabledTools(slice, campaignId).includes("stars"))
    throw refusal(
      "Stelle e desideri non è fra gli strumenti concordati.",
      "Stars and wishes is not among the agreed tools.",
    );
  const campaign = mutableCampaign(slice, campaignId);
  if (campaign.rounds.some((round) => !round.closedAt))
    throw refusal("C’è già una raccolta aperta.", "A collection is already open.");
  const round = { id: newId("round"), openedAt: nowIso(), closedAt: null, entries: [] };
  campaign.rounds.push(round);
  return round.id;
}
export function closeRound(state, slice, campaignId, viewer, roundId) {
  requireDm(state, campaignId, viewer);
  const round = mutableCampaign(slice, campaignId).rounds.find((entry) => entry.id === roundId);
  if (!round || round.closedAt) throw refusal("Raccolta già chiusa.", "Collection already closed.");
  round.closedAt = nowIso();
}
export function openRoundOf(slice, campaignId) {
  return campaignData(slice, campaignId).rounds.find((round) => !round.closedAt) ?? null;
}
export function addStarWish(state, slice, campaignId, viewer, roundId, data = {}) {
  requireMember(state, campaignId, viewer);
  const round = mutableCampaign(slice, campaignId).rounds.find((entry) => entry.id === roundId);
  if (!round || round.closedAt) throw refusal("La raccolta è chiusa.", "The collection is closed.");
  const star = text(data.star);
  const wish = text(data.wish);
  if (!star && !wish)
    throw refusal(
      "Scrivi una stella, un desiderio o entrambi. Puoi anche non rispondere.",
      "Write a star, a wish or both. You may also not answer.",
    );
  if (star.length > STAR_MAX || wish.length > STAR_MAX)
    throw refusal(
      `Massimo ${STAR_MAX} caratteri per voce.`,
      `${STAR_MAX} characters at most per entry.`,
    );
  const token = withdrawToken();
  const entry = {
    id: newId("sw"),
    star,
    wish,
    signedBy: data.signed === true ? viewer : null,
    at: nowIso(),
    withdrawHash: sha256(token),
  };
  round.entries.push(entry);
  return { id: entry.id, token };
}
/**
 * Withdraws an own entry while the collection is open: the sending device presents the
 * withdraw token returned by addStarWish; a signed entry can also be withdrawn by its
 * signer.
 */
export function withdrawStarWish(state, slice, campaignId, viewer, roundId, entryId, token) {
  requireMember(state, campaignId, viewer);
  const round = mutableCampaign(slice, campaignId).rounds.find((entry) => entry.id === roundId);
  if (!round || round.closedAt) throw refusal("La raccolta è chiusa.", "The collection is closed.");
  const index = round.entries.findIndex((entry) => entry.id === entryId);
  if (index < 0) throw refusal("Voce già ritirata.", "Entry already withdrawn.");
  const entry = round.entries[index];
  if (!proves(entry, token) && !(entry.signedBy && entry.signedBy === viewer))
    throw refusal(
      "Solo chi ha scritto la voce può ritirarla, dal dispositivo da cui l’ha inviata.",
      "Only whoever wrote the entry can withdraw it, from the device that sent it.",
    );
  round.entries.splice(index, 1);
}
/** Collections as every member may see them (no withdraw hashes). */
export function roundsFor(state, slice, campaignId, viewer) {
  if (!memberOf(state, campaignId, viewer)) return [];
  return campaignData(slice, campaignId).rounds.map((round) => ({
    ...copy(round),
    entries: round.entries.map(({ id, star, wish, signedBy, at }) => ({
      id,
      star,
      wish,
      signedBy,
      at,
    })),
  }));
}
