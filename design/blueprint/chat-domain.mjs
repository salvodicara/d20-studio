// Chat, messages and archive (B17): pure domain, no DOM and no app imports.
//
// Adopted patterns (census IDs in changes/interview-01/blueprint-chat-evidence.md):
// Foundry chat message kinds /ic /ooc /em /w and whisper audience (FVT-065), Roll20 chat
// grammar /desc /as /emas, speak-as and whisper to a character (R20-145/146), Polyglot
// languages (FVT-067), Chat Images (FVT-068), Shard share-to-chat cards (VTL-158), Owlbear
// Theatre! audible range (VTL-168), Fantasy Grounds /vote and /mood (R20-171), Roll20
// chat archive with whisper privacy and typed "DELETE CHAT" (R20-065, SVC-081, R20-207),
// Foundry export/clear (FVT-066), Roll20 campaign forum with sticky/sink (R20-062,
// SVC-083), D&D Beyond roll notifications (DDB-153), BG3 photo mode as a snapshot (CRP-165).
//
// Identities are the demo roles ("player", "dm", or campaign member ids). The DM reads a
// whisper only when included (FVT-065); a whisper to a character reaches the identities
// assigned to it (R20-146), never the DM's universal control. Local visibility checks are
// not backend security: every browser holding the state could read the raw data.

import { campaignMembers } from "./campaign-content.mjs";
import { canViewActor, isActorAvailable, isCampaignActor } from "./character-access.mjs";
import { languages as LANGUAGE_CATALOG } from "./character-rules.mjs";
import { rollVisibleTo } from "./registry.mjs";
import { disguises, maskNames } from "./conditions.mjs";
import { canSeeAttemptValues } from "./combat.mjs";
import { SPELLS, LABELS, formatDistance } from "./srd-sample.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const CHAT_ID = "chat";
export const CHAT_VERSION = 1;
// Every chat commit label starts with this prefix, so the stream never repeats its own
// commits as events. "Chat" is the same word in Italian and English.
export const LABEL_PREFIX = "Chat · ";
export const MAX_TEXT = 2000;
export const MAX_NAME = 40;
export const MAX_QUESTION = 200;
export const MAX_REASON = 200;
export const MAX_TITLE = 120;
// Images live in the shared local state (localStorage), so each one stays small: the same
// per-file limit as the media library (media-domain LIMITS.image).
export const MAX_IMAGE_BYTES = 500 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const IMAGE_SRC = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/;
const SNAPSHOT_SRC = /^data:image\/svg\+xml;charset=utf-8,[^"'<>\s]+$/;
export const MAX_SNAPSHOT_CHARS = 1_500_000;
// Storage budget, like the media area's quota and browser total (media-domain checkRoom).
// The browser keeps about 5 million characters per site for the whole saved state, the
// media library may take about 2 million of them, and a message that does not fit would
// be lost on reload together with every later change. So every stored chat image and
// snapshot together (all identities) stays within ATTACHMENT_BUDGET characters, and the
// whole saved state after the new message stays within STATE_ROOM characters, leaving
// room for the rest of the game. Shown as MB of stored text (1 MB = 1,048,576 characters).
export const ATTACHMENT_BUDGET = 1.5 * 1048576;
export const STATE_ROOM = 4 * 1048576;
// Roll20 asks for the exact phrase before clearing the archive (R20-207).
export const CLEAR_PHRASE = Object.freeze({ it: "ELIMINA CHAT", en: "DELETE CHAT" });
export const MODES = Object.freeze(["ic", "emote", "ooc", "desc"]);
// Owlbear Theatre! offers whisper / talk / yell ranges (VTL-168). The distances are this
// app's defaults, not SRD rules; the SRD 2024 sets no hearing distance for speech.
export const RANGES = Object.freeze([
  { id: "all", meters: null, name: text("Tutti", "Everyone") },
  { id: "whisper", meters: 1.5, name: text("Sussurro · 1,5 m", "Whisper · 1.5 m") },
  { id: "talk", meters: 9, name: text("Voce · 9 m", "Talk · 9 m") },
  { id: "shout", meters: 30, name: text("Grido · 30 m", "Shout · 30 m") },
]);
export const RANGE_SOURCE = Object.freeze({
  kind: "app-default",
  revision: "blueprint-b17",
  note: "Theatre!-style presets (VTL-168); the SRD 2024 defines no speech range.",
});

function text(it, en) {
  return { it, en };
}
const copy = (value) => structuredClone(value);
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const str = (value) => (typeof value === "string" ? value : "");
// Same convention as campaign-content.mjs: the message carries both languages; the UI
// shows `it` or `en` from the error fields.
function fail(it, en) {
  throw Object.assign(new Error(`${it} / ${en}`), { it, en });
}
const pick = (value, lang) =>
  object(value) ? value[lang] || value.it || value.en || "" : String(value ?? "");
const iso = (value) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;

// ---------------------------------------------------------------- what players see (C1, C3)

// R7's «Cosa vedono i giocatori» (C1) and session hand-off (C3) are read through their own
// modules, loaded without a static import (the chat, the dice tray, requests and knowledge
// must not fail when those areas are absent). Until they load, today's behaviour holds:
// DCs shown, failed passive checks hidden, only the DM runs the session.
let settingsArea = null;
let sessionArea = null;
export const disclosureReady = Promise.all([
  import("./campaign-settings-domain.mjs").then(
    (module) => (settingsArea = module),
    () => null,
  ),
  import("./session-view.mjs").then(
    (module) => (sessionArea = module),
    () => null,
  ),
]);
// Test seam: a reader that stands in for `disclosureOf` (null restores the real one).
let disclosureReader = null;
export function useDisclosureReader(reader) {
  disclosureReader = typeof reader === "function" ? reader : null;
}
/**
 * C1: how DCs and failed passive checks reach players (BG3 DC display and passive rolls,
 * Fantasy Grounds hidden DC). `dc`: "shown" | "hidden"; `passiveFailures`: "hidden" | "shown".
 */
export function playerDisclosure(state) {
  let read = null;
  try {
    read = (disclosureReader ?? settingsArea?.disclosureOf)?.(state) ?? null;
  } catch {
    read = null;
  }
  return {
    dc: read?.dc === "hidden" ? "hidden" : "shown",
    passiveFailures: read?.passiveFailures === "shown" ? "shown" : "hidden",
  };
}
/** C3: the DM, or the member the DM handed the session to (Owlbear GM hand-off). */
export function runsSessionFor(state, role) {
  if (role === "dm") return true;
  if (!role || role === "spectator") return false;
  try {
    return sessionArea?.runsSession?.(state, role) === true;
  } catch {
    return false;
  }
}
/**
 * C1: whether `viewer` reads a DC. A DC the DM set (`setBy` "dm": requests, a DM creature's
 * save DC, the DM's own rolls, a roll written in the journal) follows the campaign's choice;
 * a DC the roller typed or a rule's fixed DC stays visible. Whoever runs the session reads it.
 */
export function dcVisibleTo(state, viewer, setBy = "dm") {
  if (setBy !== "dm" || runsSessionFor(state, viewer)) return true;
  return playerDisclosure(state).dc !== "hidden";
}
/**
 * Who set the DC of a combat queue attempt: the DM for a roll request and for a creature the
 * DM controls; the player for their own character's spell or feature (its DC is on their
 * sheet); a rule otherwise.
 */
export function dcSetterOf(state, attempt) {
  if (!attempt) return "rule";
  if (attempt.kind === "roll-request") return "dm";
  const source = state?.actors?.[attempt.actorId];
  if (!source) return "rule";
  return source.owner === "player" ? "player" : "dm";
}

// ---------------------------------------------------------------- languages (Polyglot)

// Synthetic fixture for the sample actors that have no recorded languages. A character
// built with the guided builder carries its own `languages` (Common plus two standard
// languages, the builder's validation); those always win over this fixture.
export const DEMO_LANGUAGES = Object.freeze({
  livia: ["common", "elvish", "draconic"],
  doran: ["common", "dwarvish", "giant"],
  mira: ["common", "gnomish", "halfling"],
  "goblin-1": ["common", "goblin"],
  "goblin-2": ["common", "goblin"],
});
export const DEMO_LANGUAGE_SOURCE = Object.freeze({
  kind: "authored-demo",
  edition: "2024",
  revision: "blueprint-b17-languages",
  note: "Synthetic choices for sample actors: Common plus two standard languages for characters; Common and Goblin for the sample goblins.",
});
const capital = (value) => value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
export const LANGUAGES = Object.freeze(
  LANGUAGE_CATALOG.map((entry) =>
    Object.freeze({ id: entry.id, name: text(entry.name.it, capital(entry.name.en)) }),
  ),
);
export const languageName = (id, lang = "it") =>
  pick(LANGUAGES.find((entry) => entry.id === id)?.name ?? id, lang);

/** Languages an actor knows, or null when nothing is recorded (never invented). */
export function knownLanguages(state, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor) return null;
  if (Array.isArray(actor.languages) && actor.languages.length)
    return actor.languages.filter((id) => LANGUAGES.some((entry) => entry.id === id));
  return DEMO_LANGUAGES[actorId] ? [...DEMO_LANGUAGES[actorId]] : null;
}

// Scrambled text keeps word lengths, spaces and punctuation only: the letters come from a
// generator seeded by the message, so the original cannot be decoded from them.
export function scramble(value, seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const next = () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const letters = "aeilnorsuvthdmkgzbyw";
  return [...String(value)]
    .map((ch) => {
      if (!/[\p{L}\p{N}]/u.test(ch)) return ch;
      const out = letters[Math.floor(next() * letters.length)];
      return ch === ch.toUpperCase() && ch !== ch.toLowerCase() ? out.toUpperCase() : out;
    })
    .join("");
}

// ---------------------------------------------------------------- identities and actors

export function identities(state) {
  const ids = campaignMembers(state).map((member) => member.id);
  return ids.length ? ids : ["player", "dm"];
}
/** The display name of a campaign identity ("Giocatore / Player" splits by language). */
// A published display name (B29 account, B13 members) wins; the defaults are the demo's.
export function memberName(state, id, lang = "it") {
  const member = campaignMembers(state).find((entry) => entry.id === id);
  const fallback = id === "player" ? "Giocatore / Player" : id === "dm" ? "DM" : String(id ?? "?");
  const name = (object(member?.name) ? pick(member.name, lang) : str(member?.name)) || fallback;
  if (!name.includes(" / ")) return name;
  const [it, en] = name.split(" / ");
  return lang === "en" ? en : it;
}
/**
 * Final review P3 (CA-57's playedBy, Owlbear's one name per player): a reader as the party
 * names them — the characters they play in the campaign in play, then the role when it adds
 * something («Livia, Mira · Giocatore»); the DM reads «DM».
 */
export function readerLabel(state, id, lang = "it") {
  const name = memberName(state, id, lang);
  if (id === "dm") return name;
  const cid = state.campaign?.id;
  const seats = state.ext?.["campaign-members"]?.campaigns?.[cid]?.seats ?? {};
  const seated = Object.entries(seats)
    .filter(([, seat]) => seat?.memberId === id && seat.status !== "inactive")
    .map(([actorId]) => actorId);
  const played = (
    seated.length
      ? seated
      : Object.values(state.actors ?? {})
          .filter(
            (a) =>
              a?.kind === "character" &&
              !a.companion &&
              a.owner === id &&
              a.visibility !== "private" &&
              (a.campaignIds === undefined || a.campaignIds.includes(cid)),
          )
          .map((a) => a.id)
  )
    .map((actorId) => state.actors?.[actorId]?.name)
    .filter(Boolean);
  return played.length ? `${played.join(", ")} · ${name}` : name;
}
// Assigned control: owner plus explicit controllers. The DM's universal control of every
// sheet is not an assignment, so a whisper to Mira does not reach the DM (FVT-065).
export function assignedIdentities(actor) {
  if (!actor) return [];
  return [
    ...new Set(
      [actor.owner, ...(Array.isArray(actor.controllers) ? actor.controllers : [])].filter(
        (id) => typeof id === "string" && id,
      ),
    ),
  ];
}
function campaignActors(state, role) {
  const campaignId = state.campaign?.id;
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor &&
      !actor.companion &&
      ["character", "npc"].includes(actor.kind) &&
      isActorAvailable(actor) &&
      actor.visibility !== "private" &&
      isCampaignActor(actor, campaignId) &&
      canViewActor(actor, role, state),
  );
}
/**
 * Who this identity can speak as (Roll20 speak-as, Quest Portal VTL-171): a player speaks as
 * the campaign characters assigned to them; the DM as any visible character or creature,
 * plus a named NPC without a sheet (Roll20 `/as "Guardia"`).
 */
export function speakerOptions(state, role) {
  const actors = campaignActors(state, role).filter(
    (actor) => role === "dm" || assignedIdentities(actor).includes(role),
  );
  const mine = (actor) => (assignedIdentities(actor).includes(role) ? 0 : 1);
  const list = actors
    .sort(
      (a, b) =>
        mine(a) - mine(b) ||
        (a.kind === b.kind ? 0 : a.kind === "character" ? -1 : 1) ||
        a.name.localeCompare(b.name),
    )
    .map((actor) => ({
      id: "actor:" + actor.id,
      type: "actor",
      actorId: actor.id,
      name: actor.name,
      kind: actor.kind,
    }));
  if (role === "dm") list.push({ id: "npc", type: "npc" });
  return list;
}
/** Whisper targets: the DM (from a player), "only me" (the DM), campaign characters. */
export function whisperTargets(state, role, speakerActorId = null) {
  const targets = [];
  if (role !== "dm") targets.push({ id: "dm", type: "dm" });
  else targets.push({ id: "self", type: "self" });
  for (const actor of campaignActors(state, role)
    .filter((actor) => actor.kind === "character" && actor.id !== speakerActorId)
    .sort((a, b) => a.name.localeCompare(b.name)))
    targets.push({ id: "actor:" + actor.id, type: "actor", actorId: actor.id, name: actor.name });
  return targets;
}
function resolveTarget(state, role, id, speakerActorId) {
  if (!id || id === "all") return null;
  const target = whisperTargets(state, role, speakerActorId).find((entry) => entry.id === id);
  if (!target) fail("Destinatario non disponibile.", "Recipient unavailable.");
  return target;
}
/** Identities that read a whisper: the author plus the recipient's assigned identities. */
export function whisperReaders(state, author, target) {
  const readers = new Set([author]);
  if (target.type === "dm") readers.add("dm");
  if (target.type === "actor")
    for (const id of assignedIdentities(state.actors[target.actorId])) readers.add(id);
  return [...readers];
}

// ---------------------------------------------------------------- slice

export function seedChat() {
  // Sample stamps follow the visit (sample-clock.mjs): authored in September 2026.
  const at = (day, time) => sampleDate(`2026-09-${day}T${time}:00.000Z`);
  const message = (seq, fields) => ({
    id: "m" + seq,
    seq,
    at: at("17", fields.time),
    author: fields.author,
    kind: fields.kind,
    speaker: fields.speaker,
    text: fields.text,
    language: fields.language ?? "common",
    mood: null,
    to: fields.to ?? null,
    readers: fields.readers ?? null,
    range: null,
    image: null,
    card: null,
    snapshot: null,
    vote: null,
    hidden: false,
    removed: null,
    system: null,
  });
  const livia = { type: "actor", actorId: "livia", name: "Livia" };
  const doran = { type: "actor", actorId: "doran", name: "Doran" };
  const messages = [
    message(1, {
      time: "19:02",
      author: "dm",
      kind: "desc",
      speaker: { type: "narrator" },
      text: "Al calar della sera il gruppo raggiunge il vecchio osservatorio. Sulla torre, una lanterna spenta da anni torna a brillare.",
    }),
    message(2, {
      time: "19:04",
      author: "player",
      kind: "ic",
      speaker: livia,
      text: "Qualcuno l’ha riaccesa. Restiamo uniti e non tocchiamo niente.",
    }),
    message(3, {
      time: "19:05",
      author: "dm",
      kind: "emote",
      speaker: doran,
      text: "controlla la corda e annuisce.",
    }),
    message(4, {
      time: "19:07",
      author: "player",
      kind: "ooc",
      speaker: { type: "user", id: "player" },
      text: "Stasera devo chiudere alle 23, va bene?",
    }),
    message(5, {
      time: "19:08",
      author: "dm",
      kind: "ooc",
      speaker: { type: "user", id: "dm" },
      text: "Va bene, ci fermiamo alle 23.",
    }),
    message(6, {
      time: "19:21",
      author: "dm",
      kind: "desc",
      speaker: { type: "narrator" },
      text: "Livia, sul portone noti un simbolo inciso di recente.",
      to: { type: "actor", actorId: "livia", name: "Livia" },
      readers: ["dm", "player"],
    }),
  ];
  return {
    seq: messages.length,
    messages,
    clearedAt: null,
    clearedBy: null,
    forum: {
      seq: 3,
      threads: [
        {
          id: "t1",
          title: "Calendario e regole del tavolo",
          author: "dm",
          at: at("10", "18:00"),
          lastAt: at("10", "18:00"),
          pinned: true,
          sunk: false,
          removed: null,
          posts: [
            {
              id: "p1",
              author: "dm",
              at: at("10", "18:00"),
              text: "Giochiamo il giovedì alle 21. Se non potete esserci, scrivetelo qui entro il mercoledì.",
              removed: null,
            },
          ],
        },
        {
          id: "t2",
          title: "Chi porta la corda nella cripta?",
          author: "player",
          at: at("18", "10:15"),
          lastAt: at("18", "12:40"),
          pinned: false,
          sunk: false,
          removed: null,
          posts: [
            {
              id: "p2",
              author: "player",
              at: at("18", "10:15"),
              text: "Livia ha 15 metri di corda. Serve altro prima di scendere?",
              removed: null,
            },
            {
              id: "p3",
              author: "dm",
              at: at("18", "12:40"),
              text: "Una lanterna in più non guasterebbe.",
              removed: null,
            },
          ],
        },
      ],
    },
  };
}

const KINDS = ["ic", "emote", "ooc", "desc", "share", "vote", "snapshot", "system"];
function normalizeMessage(raw) {
  if (!object(raw) || typeof raw.id !== "string" || !KINDS.includes(raw.kind)) return null;
  const at = iso(raw.at);
  if (!at) return null;
  const m = {
    id: raw.id,
    seq: Number.isInteger(raw.seq) ? raw.seq : 0,
    at,
    author: str(raw.author) || "dm",
    kind: raw.kind,
    speaker: object(raw.speaker) ? copy(raw.speaker) : { type: "narrator" },
    text: str(raw.text).slice(0, MAX_TEXT),
    language: LANGUAGES.some((l) => l.id === raw.language) ? raw.language : "common",
    mood: str(raw.mood).slice(0, MAX_NAME) || null,
    to: object(raw.to) ? copy(raw.to) : null,
    readers: Array.isArray(raw.readers) ? raw.readers.filter((id) => typeof id === "string") : null,
    range: object(raw.range) ? copy(raw.range) : null,
    image:
      object(raw.image) && IMAGE_SRC.test(str(raw.image.src))
        ? { src: raw.image.src, name: str(raw.image.name).slice(0, 120) }
        : null,
    card: object(raw.card) ? copy(raw.card) : null,
    snapshot:
      object(raw.snapshot) && SNAPSHOT_SRC.test(str(raw.snapshot.src)) ? copy(raw.snapshot) : null,
    vote: object(raw.vote) ? copy(raw.vote) : null,
    hidden: raw.hidden === true,
    removed: object(raw.removed) ? copy(raw.removed) : null,
    system: object(raw.system) ? copy(raw.system) : null,
  };
  // A whisper always names its readers; an empty list would hide it from everyone.
  if (m.to && (!m.readers || !m.readers.length)) return null;
  return m;
}
function normalizeThread(raw) {
  if (!object(raw) || typeof raw.id !== "string" || !iso(raw.at)) return null;
  return {
    id: raw.id,
    title: str(raw.title).slice(0, MAX_TITLE),
    author: str(raw.author) || "dm",
    at: raw.at,
    lastAt: iso(raw.lastAt) ?? raw.at,
    pinned: raw.pinned === true,
    sunk: raw.sunk === true,
    removed: object(raw.removed) ? copy(raw.removed) : null,
    posts: (Array.isArray(raw.posts) ? raw.posts : [])
      .filter((post) => object(post) && typeof post.id === "string" && iso(post.at))
      .map((post) => ({
        id: post.id,
        author: str(post.author) || "dm",
        at: post.at,
        text: str(post.text).slice(0, MAX_TEXT),
        removed: object(post.removed) ? copy(post.removed) : null,
      })),
  };
}
/** Idempotent normalization of saved chat data; a newer saved version is refused. */
export function normalizeChat(slice, fromVersion = CHAT_VERSION) {
  if (fromVersion > CHAT_VERSION) throw Error("Chat data comes from a newer version");
  const raw = object(slice) ? slice : {};
  const messages = (Array.isArray(raw.messages) ? raw.messages : [])
    .map(normalizeMessage)
    .filter(Boolean);
  const forum = object(raw.forum) ? raw.forum : {};
  const threads = (Array.isArray(forum.threads) ? forum.threads : [])
    .map(normalizeThread)
    .filter(Boolean);
  return {
    seq: Math.max(Number.isInteger(raw.seq) ? raw.seq : 0, ...messages.map((m) => m.seq), 0),
    messages,
    clearedAt: iso(raw.clearedAt),
    clearedBy: str(raw.clearedBy) || null,
    forum: {
      // One counter numbers threads and posts; it never falls below an existing id.
      seq: Math.max(
        Number.isInteger(forum.seq) ? forum.seq : 0,
        ...threads
          .flatMap((entry) => [entry.id, ...entry.posts.map((post) => post.id)])
          .map((id) => Number(id.slice(1)))
          .filter(Number.isInteger),
        0,
      ),
      threads,
    },
  };
}

// ---------------------------------------------------------------- slash commands

const unquote = (rest) => {
  const quoted = rest.match(/^"([^"]{1,40})"\s*([\s\S]*)$/);
  if (quoted) return [quoted[1].trim(), quoted[2]];
  const plain = rest.match(/^(\S{1,40})\s*([\s\S]*)$/);
  return plain ? [plain[1], plain[2]] : [null, rest];
};
/**
 * Parses the Foundry/Roll20/Fantasy Grounds chat grammar at the start of a message.
 * Returns overrides for the composer; `help` shows the command list without sending.
 */
export function parseCommand(input) {
  const raw = String(input ?? "");
  const match = raw.match(/^\/([a-z?]+)(?:\s+([\s\S]*))?$/i);
  if (!match) return { text: raw };
  const command = match[1].toLowerCase();
  const rest = match[2] ?? "";
  switch (command) {
    case "ic":
      return { mode: "ic", text: rest };
    case "ooc":
      return { mode: "ooc", text: rest };
    case "em":
    case "me":
      return { mode: "emote", text: rest };
    case "desc":
      return { mode: "desc", text: rest, speaker: "narrator" };
    case "as":
    case "emas": {
      const [name, body] = unquote(rest.trim());
      if (!name) fail("Scrivi il nome del PNG dopo /as.", "Write the NPC name after /as.");
      return { mode: command === "as" ? "ic" : "emote", speaker: "npc", npcName: name, text: body };
    }
    case "w":
    case "whisper": {
      const [name, body] = unquote(rest.trim());
      if (!name) fail("Scrivi il destinatario dopo /w.", "Write the recipient after /w.");
      return { whisperName: name, text: body };
    }
    case "mood": {
      const [mood, body] = unquote(rest.trim());
      if (!mood) fail("Scrivi il tono dopo /mood.", "Write the mood after /mood.");
      return { mode: "ic", mood, text: body };
    }
    case "vote":
      return { vote: true, text: rest };
    case "help":
    case "?":
      return { help: true, text: "" };
    case "r":
    case "roll":
      // Roll20/Foundry /r: here it opens the Table's own free roll, prefilled, where the
      // die is physical or digital; the chat never rolls with a second dice engine.
      return { roll: rest.trim(), text: "" };
    default:
      fail(
        `Comando /${command} sconosciuto. Comandi: /ic /ooc /em /w /mood /vote; DM: /desc /as /emas.`,
        `Unknown command /${command}. Commands: /ic /ooc /em /w /mood /vote; DM: /desc /as /emas.`,
      );
  }
  return { text: raw };
}
const ROLL_SIDES = [4, 6, 8, 10, 12, 20];
/** "/r d20+5" → {sides: 20, modifier: 5}: the one die and modifier of the free roll. */
export function parseRollFormula(input) {
  const match = String(input ?? "")
    .replace(/\s+/g, "")
    .replace(/−/g, "-")
    .toLowerCase()
    .match(/^1?d(\d+)(?:([+-])(\d+))?$/);
  const sides = Number(match?.[1]);
  const amount = Number(match?.[3] ?? 0);
  if (!match || !ROLL_SIDES.includes(sides) || amount > 30)
    fail(
      "Il tiro libero usa un dado (d4, d6, d8, d10, d12 o d20) più un modificatore fino a 30: per esempio /r d20+5.",
      "The free roll uses one die (d4, d6, d8, d10, d12 or d20) plus a modifier up to 30: for example /r d20+5.",
    );
  return { sides, modifier: match[2] === "-" ? -amount : amount };
}
const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
/**
 * Roll20 tab-complete for `/w` (R20-145): "/w Do" completes to "/w Doran ". Returns the
 * completed text, or null when nothing starts with the typed letters (Tab then moves on).
 */
export function completeWhisper(state, role, speakerActorId, value) {
  const match = String(value ?? "").match(/^\/(w|whisper)\s+"?([^"\s]+)$/i);
  if (!match) return null;
  const key = fold(match[2]);
  const names = [
    ...(role === "dm" ? [] : ["dm"]),
    ...whisperTargets(state, role, speakerActorId)
      .filter((target) => target.type === "actor")
      .map((target) => target.name),
  ];
  const hit = names.find((name) => fold(name).startsWith(key));
  if (!hit) return null;
  return `/${match[1]} ${/\s/.test(hit) ? `"${hit}"` : hit} `;
}
function targetByName(state, role, name, speakerActorId) {
  const key = fold(name);
  if (["dm", "gm"].includes(key)) return role === "dm" ? "self" : "dm";
  const target = whisperTargets(state, role, speakerActorId).find(
    (entry) => entry.type === "actor" && fold(entry.name) === key,
  );
  if (!target) fail(`Nessun destinatario chiamato «${name}».`, `No recipient called “${name}”.`);
  return target.id;
}

// ---------------------------------------------------------------- composing

function speakerFor(state, role, input) {
  if (input.mode === "desc") {
    if (role !== "dm") fail("Solo il DM può narrare.", "Only the DM can narrate.");
    return { type: "narrator" };
  }
  if (input.mode === "ooc") return { type: "user", id: role };
  if (input.speaker === "npc") {
    if (role !== "dm")
      fail("Solo il DM può parlare come un PNG.", "Only the DM can speak as an NPC.");
    const name = String(input.npcName ?? "").trim();
    if (!name || name.length > MAX_NAME)
      fail(
        "Scrivi il nome del PNG (massimo 40 caratteri).",
        "Write the NPC name (40 characters at most).",
      );
    return { type: "npc", name };
  }
  const option = speakerOptions(state, role).find((entry) => entry.id === input.speaker);
  if (!option || option.type !== "actor")
    fail("Scegli un personaggio che puoi interpretare.", "Choose a character you can speak as.");
  return { type: "actor", actorId: option.actorId, name: option.name };
}
function distanceMeters(scene, a, b) {
  const grid = Number(scene.gridSize) || 50;
  const meters = Number(scene.metersPerCell) || 1.5;
  return (Math.hypot(a.x - b.x, a.y - b.y) / grid) * meters;
}
/** Identities within an audible range of the speaker's token on the active scene. */
export function rangeAudience(state, speakerActorId, rangeId) {
  const range = RANGES.find((entry) => entry.id === rangeId);
  if (!range?.meters) return null;
  const scene = state.scenes?.find((entry) => entry.id === state.activeSceneId);
  const origin = scene?.tokens.find((token) => token.actorId === speakerActorId);
  if (!origin)
    fail(
      "La portata udibile richiede la pedina di chi parla sulla scena attiva.",
      "An audible range needs the speaker’s token on the active scene.",
    );
  // Only the campaign's characters hear it (the same roster the DM sees in the chat).
  const roster = new Set(
    campaignActors(state, "dm")
      .filter((actor) => actor.kind === "character")
      .map((actor) => actor.id),
  );
  const heard = scene.tokens
    .filter((token) => token.actorId !== speakerActorId)
    .filter((token) => roster.has(token.actorId))
    .filter((token) => distanceMeters(scene, origin, token) <= range.meters + 1e-9)
    .map((token) => token.actorId);
  const readers = new Set(["dm"]);
  for (const actorId of heard)
    for (const id of assignedIdentities(state.actors[actorId])) readers.add(id);
  return {
    range: { id: range.id, meters: range.meters, sceneId: scene.id, heard, source: RANGE_SOURCE },
    readers: [...readers],
  };
}

/**
 * Builds a validated message from composer input (`input.text` may start with a command).
 * Returns `{ help: true }` for /help. Throws {it, en} errors for invalid input.
 */
export function composeMessage(state, role, input, { now }) {
  const parsed = parseCommand(input.text ?? "");
  if (parsed.help) return { help: true };
  if (parsed.roll !== undefined) return { roll: parseRollFormula(parsed.roll) };
  const merged = { ...input, ...parsed };
  if (parsed.speaker === "narrator") merged.mode = "desc";
  if (parsed.vote) merged.kind = "vote";
  const mode = MODES.includes(merged.mode) ? merged.mode : "ic";
  const body = String(merged.text ?? "").trim();
  if (body.length > MAX_TEXT)
    fail("Il messaggio supera 2000 caratteri.", "The message exceeds 2000 characters.");
  const kind =
    merged.kind === "vote" ? "vote" : merged.card ? "share" : merged.snapshot ? "snapshot" : mode;
  if (kind === "vote" && (!body || body.length > MAX_QUESTION))
    fail(
      "Scrivi la domanda del voto (massimo 200 caratteri).",
      "Write the vote question (200 characters at most).",
    );
  if (["ic", "emote", "ooc", "desc"].includes(kind) && !body && !merged.image)
    fail("Scrivi un messaggio o allega un’immagine.", "Write a message or attach an image.");
  // A shared card speaks for the sheet it comes from; votes and snapshots for the person.
  let speaker;
  if (kind === "vote" || kind === "snapshot") speaker = { type: "user", id: role };
  else if (kind === "share") {
    const actor = state.actors?.[merged.card.actorId];
    if (!actor || !(role === "dm" || assignedIdentities(actor).includes(role)))
      fail(
        "Puoi condividere solo voci delle tue schede.",
        "You can share only entries of your sheets.",
      );
    speaker = { type: "actor", actorId: actor.id, name: actor.name };
  } else speaker = speakerFor(state, role, { ...merged, mode });
  const speakerActorId = speaker.type === "actor" ? speaker.actorId : null;
  let language = "common";
  if (kind === "ic" && merged.language && merged.language !== "common") {
    if (!LANGUAGES.some((entry) => entry.id === merged.language))
      fail("Lingua sconosciuta.", "Unknown language.");
    const known = speakerActorId ? knownLanguages(state, speakerActorId) : null;
    if (speakerActorId && !known?.includes(merged.language))
      fail(
        `${speaker.name} non conosce questa lingua.`,
        `${speaker.name} does not know this language.`,
      );
    language = merged.language;
  }
  let toId = merged.to ?? "all";
  if (merged.whisperName) toId = targetByName(state, role, merged.whisperName, speakerActorId);
  if (kind === "vote" && toId !== "all")
    fail("Il voto è aperto a tutto il gruppo.", "A vote is open to the whole group.");
  const target = resolveTarget(state, role, toId, speakerActorId);
  let readers = target ? whisperReaders(state, role, target) : null;
  let range = null;
  if (merged.range && merged.range !== "all") {
    if (role !== "dm")
      fail("Solo il DM sceglie la portata udibile.", "Only the DM sets an audible range.");
    if (target)
      fail(
        "Un sussurro ha già i suoi destinatari: scegli «Tutti» per usare la portata.",
        "A whisper already has recipients: choose “Everyone” to use a range.",
      );
    if (!["ic", "emote"].includes(kind) || !speakerActorId)
      fail(
        "La portata vale per dialoghi e azioni di una creatura sulla scena.",
        "A range applies to dialogue and actions of a creature on the scene.",
      );
    const audience = rangeAudience(state, speakerActorId, merged.range);
    range = audience.range;
    readers = audience.readers;
  }
  let image = null;
  if (merged.image) {
    if (!IMAGE_SRC.test(str(merged.image.src)))
      fail("Formato d’immagine non valido.", "Invalid image format.");
    if (merged.image.src.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 40)
      fail("Immagine troppo grande (massimo 500 KB).", "Image too large (500 KB at most).");
    image = { src: merged.image.src, name: str(merged.image.name).slice(0, 120) };
  }
  let snapshot = null;
  if (merged.snapshot) {
    const src = str(merged.snapshot.src);
    if (!SNAPSHOT_SRC.test(src) || src.length > MAX_SNAPSHOT_CHARS)
      fail("Istantanea non valida o troppo grande.", "Invalid or too large snapshot.");
    snapshot = copy(merged.snapshot);
  }
  return {
    at: now,
    author: role,
    kind,
    speaker,
    text: body,
    language,
    mood: merged.mood ? String(merged.mood).trim().slice(0, MAX_NAME) : null,
    to: target
      ? target.type === "actor"
        ? { type: "actor", actorId: target.actorId, name: target.name }
        : { type: target.type }
      : null,
    readers,
    range,
    image,
    card: merged.card ? copy(merged.card) : null,
    snapshot,
    vote:
      kind === "vote"
        ? { question: body, ballots: {}, closed: false, closedBy: null, closedAt: null }
        : null,
    hidden: false,
    removed: null,
    system: null,
  };
}
/** Characters the message's image and snapshot take in the saved state. */
export const attachmentSize = (message) =>
  str(message?.image?.src).length + str(message?.snapshot?.src).length;
/** Characters every stored chat image and snapshot takes (all identities). */
export const attachmentsUsed = (slice) =>
  (slice?.messages ?? []).reduce((sum, message) => sum + attachmentSize(message), 0);
const megabytes = (chars, lang) =>
  `${(chars / 1048576).toLocaleString(lang === "en" ? "en-GB" : "it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} MB`;
/**
 * Refuses an attachment that would not fit: in the chat's budget, or in the room the
 * saved state needs for the rest of the game. Checked when the file is attached or the
 * snapshot taken, and again inside the command (media-domain checkRoom does the same).
 */
export function checkAttachmentRoom(state, slice, extra) {
  if (!(extra > 0)) return;
  const used = attachmentsUsed(slice);
  if (used + extra > ATTACHMENT_BUDGET)
    fail(
      `Spazio della chat esaurito: immagini e istantanee occupano ${megabytes(used, "it")} su ${megabytes(ATTACHMENT_BUDGET, "it")} e questo allegato richiede ${megabytes(extra, "it")}. Elimina vecchie immagini dal registro (⋯ › Elimina), svuota l’archivio o scegli un file più piccolo.`,
      `Chat space is full: images and snapshots take ${megabytes(used, "en")} of ${megabytes(ATTACHMENT_BUDGET, "en")} and this attachment needs ${megabytes(extra, "en")}. Delete old images from the log (⋯ › Delete), clear the archive or choose a smaller file.`,
    );
  let total = 0;
  try {
    total = JSON.stringify(state).length;
  } catch {
    total = 0;
  }
  if (total + extra > STATE_ROOM)
    fail(
      `Memoria locale quasi piena: i dati della dimostrazione occupano ${megabytes(total, "it")} e con questo allegato supererebbero ${megabytes(STATE_ROOM, "it")}, lo spazio sicuro di questo browser. Elimina immagini dalla chat o dalla libreria dei file, oppure invia senza immagine.`,
      `Local storage is almost full: the demonstration data takes ${megabytes(total, "en")} and with this attachment would exceed ${megabytes(STATE_ROOM, "en")}, this browser’s safe space. Delete images from the chat or the file library, or send without an image.`,
    );
}
/** Appends a composed message with the next id; returns the stored message. */
export function postMessage(slice, message) {
  slice.seq = (slice.seq ?? 0) + 1;
  const stored = { id: "m" + slice.seq, seq: slice.seq, ...copy(message) };
  slice.messages.push(stored);
  return stored;
}

// ---------------------------------------------------------------- shared cards (Shard)

const spellFor = (entry) =>
  SPELLS.find(
    (spell) =>
      (entry.combatActionId && spell.slug === entry.combatActionId) ||
      (entry.srdId && spell.id === entry.srdId) ||
      (object(entry.name) && spell.name.en === entry.name.en),
  ) ?? null;
/** Entries an actor can share as a card: its spells and inventory items. */
export function shareableEntries(actor) {
  if (!actor) return [];
  return [
    ...(actor.spells ?? []).map((spell) => ({
      id: "spell:" + spell.id,
      type: "spell",
      name: object(spell.name) ? spell.name : text(str(spell.name), str(spell.name)),
      level: Number(spell.level ?? spellFor(spell)?.level ?? 0),
    })),
    ...(actor.inventory ?? [])
      .filter((item) => item && item.id)
      .map((item) => ({
        id: "item:" + item.id,
        type: "item",
        name: object(item.name) ? item.name : text(str(item.name), str(item.name)),
        quantity: item.quantity ?? 1,
      })),
  ];
}
/** A stable card snapshot of a spell or item, with its source; the sheet may change later. */
export function buildCard(state, role, actorId, entryId) {
  const actor = state.actors?.[actorId];
  if (!actor || !(role === "dm" || assignedIdentities(actor).includes(role)))
    fail(
      "Puoi condividere solo voci delle tue schede.",
      "You can share only entries of your sheets.",
    );
  const [type, id] = String(entryId).split(/:(.*)/s);
  if (type === "spell") {
    const entry = (actor.spells ?? []).find((spell) => spell.id === id);
    if (!entry) fail("Incantesimo non trovato.", "Spell not found.");
    const srd = spellFor(entry);
    return {
      type: "spell",
      actorId,
      entryId: id,
      name: object(entry.name) ? copy(entry.name) : text(str(entry.name), str(entry.name)),
      level: Number(entry.level ?? srd?.level ?? 0),
      srdId: srd?.id ?? null,
      school: srd?.school ?? null,
      castingTime: srd ? copy(srd.castingTime) : null,
      range: srd ? copy(srd.range) : null,
      area: srd?.area ? copy(srd.area) : null,
      components: srd ? copy(srd.components) : null,
      duration: srd ? copy(srd.duration) : null,
      concentration: srd?.concentration ?? false,
      save: srd?.save ? copy(srd.save) : null,
      damage: srd ? copy(srd.damage) : [],
      scaling: srd?.scaling ?? null,
      summary: srd
        ? copy(srd.summary)
        : object(entry.description)
          ? copy(entry.description)
          : text(str(entry.description), str(entry.description)),
      source: srd ? copy(srd.source) : { kind: "sheet", note: str(entry.source) },
    };
  }
  if (type === "item") {
    const item = (actor.inventory ?? []).find((entry) => entry.id === id);
    if (!item) fail("Oggetto non trovato.", "Item not found.");
    return {
      type: "item",
      actorId,
      entryId: id,
      name: object(item.name) ? copy(item.name) : text(str(item.name), str(item.name)),
      itemKind: str(item.kind) || "gear",
      quantity: item.quantity ?? 1,
      weight: Number.isFinite(item.weight) ? item.weight : null,
      summary: object(item.description)
        ? copy(item.description)
        : text(str(item.description), str(item.description)),
      source: { kind: "sheet", note: "inventory" },
    };
  }
  fail("Voce da condividere non valida.", "Invalid entry to share.");
}
const ORDINAL_IT = ["trucchetto", "1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º"];
const ORDINAL_EN = ["cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
/** Localized card lines for rendering (no HTML). */
export function cardLines(card, lang = "it") {
  const t = (it, en) => (lang === "en" ? en : it);
  if (card.type === "item") {
    return {
      title: pick(card.name, lang),
      subtitle: t("Oggetto", "Item") + (card.quantity > 1 ? ` · ×${card.quantity}` : ""),
      facts:
        card.weight !== null && card.weight !== undefined
          ? [
              [
                t("Peso", "Weight"),
                `${String(card.weight).replace(".", lang === "en" ? "." : ",")} kg`,
              ],
            ]
          : [],
      summary: pick(card.summary, lang),
      source: t("Dalla scheda del personaggio", "From the character sheet"),
    };
  }
  const level =
    card.level === 0
      ? t("Trucchetto", "Cantrip")
      : lang === "en"
        ? `${ORDINAL_EN[card.level]}-level spell`
        : `Incantesimo di ${ORDINAL_IT[card.level]} livello`;
  const school = card.school ? pick(LABELS.school?.[card.school] ?? card.school, lang) : "";
  const facts = [];
  if (card.castingTime)
    facts.push([
      t("Tempo di lancio", "Casting time"),
      {
        action: t("Azione", "Action"),
        "bonus-action": t("Azione bonus", "Bonus action"),
        reaction: t("Reazione", "Reaction"),
      }[card.castingTime.unit] ?? `${card.castingTime.amount} ${card.castingTime.unit}`,
    ]);
  if (card.range)
    facts.push([
      t("Gittata", "Range"),
      (card.range.kind === "self"
        ? t("Incantatore", "Self")
        : card.range.kind === "touch"
          ? t("Contatto", "Touch")
          : formatDistance(card.range.feet, lang)) +
        (card.area
          ? ` (${{ cone: t("cono", "cone"), sphere: t("sfera", "sphere"), cube: t("cubo", "cube"), line: t("linea", "line"), emanation: t("emanazione", "emanation"), cylinder: t("cilindro", "cylinder") }[card.area.shape] ?? card.area.shape} ${formatDistance(card.area.feet, lang)})`
          : ""),
    ]);
  if (card.components)
    facts.push([
      t("Componenti", "Components"),
      [
        card.components.verbal && "V",
        card.components.somatic && "S",
        card.components.material && "M",
      ]
        .filter(Boolean)
        .join(", "),
    ]);
  if (card.duration)
    facts.push([
      t("Durata", "Duration"),
      card.duration.kind === "instantaneous"
        ? t("Istantanea", "Instantaneous")
        : `${card.concentration ? t("Concentrazione, fino a ", "Concentration, up to ") : ""}${card.duration.amount} ${card.duration.unit}`,
    ]);
  if (card.save)
    facts.push([
      t("Tiro salvezza", "Saving throw"),
      pick(LABELS.ability?.[card.save.ability] ?? card.save.ability, lang) +
        (card.save.halfOnSuccess ? t(" · metà se riesce", " · half on a success") : ""),
    ]);
  if (card.damage?.length)
    facts.push([
      t("Danni", "Damage"),
      card.damage
        .map(
          (d) =>
            `${d.dice} ${d.types.map((type) => pick(LABELS.damageType?.[type] ?? type, lang).toLowerCase()).join("/")}`,
        )
        .join(", "),
    ]);
  const pages = card.source?.kind === "srd" ? card.source : null;
  return {
    title: pick(card.name, lang),
    subtitle: [level, school].filter(Boolean).join(" · "),
    facts,
    summary: pick(card.summary, lang),
    source: pages
      ? `SRD ${pages.revision} · ${pages.edition} · EN p. ${pages.en.pages.join(", ")} · IT p. ${pages.it.pages.join(", ")}`
      : t("Dalla scheda del personaggio", "From the character sheet"),
    sourceUrl: pages ? pages[lang === "en" ? "en" : "it"].url : null,
  };
}

// ---------------------------------------------------------------- projections

/** Whether `role` may see the message at all (whispers, audible range, hidden). */
export function canSee(message, role) {
  if (message.readers && !message.readers.includes(role)) return false;
  if (message.hidden && role !== "dm" && message.author !== role) return false;
  return true;
}
/**
 * Whether the reader understands the message language. The DM reads everything
 * (Polyglot); a player reads through the character they speak as (`perspective`).
 */
export function understands(state, message, role, perspective) {
  if (message.kind !== "ic" || !message.language || message.language === "common") return true;
  if (role === "dm") return true;
  if (!perspective) return false;
  return knownLanguages(state, perspective)?.includes(message.language) ?? false;
}
function speakerName(state, speaker, lang) {
  if (!speaker) return "?";
  if (speaker.type === "narrator") return lang === "en" ? "Narration" : "Narrazione";
  if (speaker.type === "user") return memberName(state, speaker.id, lang);
  if (speaker.type === "npc") return speaker.name;
  return state.actors?.[speaker.actorId]?.name ?? speaker.name ?? "?";
}
function recipientName(state, to, lang) {
  if (!to) return "";
  if (to.type === "dm") return "DM";
  if (to.type === "self") return lang === "en" ? "Only me (DM)" : "Solo io (DM)";
  return state.actors?.[to.actorId]?.name ?? to.name ?? "?";
}
/**
 * Who understands a language among the campaign characters (shown to the DM only). The
 * audience is the DM's campaign roster, the same as speak-as and whispers: a private
 * sheet or a sheet of another campaign is never named.
 */
export function understoodBy(state, languageId) {
  return campaignActors(state, "dm")
    .filter((actor) => actor.kind === "character")
    .filter((actor) => knownLanguages(state, actor.id)?.includes(languageId))
    .map((actor) => actor.name);
}
/**
 * The readable view of one message for `role`, or null when it is not visible. A
 * scrambled or removed message never carries its original text or attachments.
 */
export function projectMessage(state, message, role, { perspective = null, lang = "it" } = {}) {
  if (!canSee(message, role)) return null;
  const base = {
    type: "message",
    id: message.id,
    seq: message.seq,
    at: message.at,
    kind: message.kind,
    author: message.author,
    own: message.author === role,
    authorName: memberName(state, message.author, lang),
    speakerType: message.speaker?.type ?? "narrator",
    speakerName: speakerName(state, message.speaker, lang),
    speakerActorId: message.speaker?.actorId ?? null,
    speakerKind:
      message.speaker?.type === "actor"
        ? (state.actors?.[message.speaker.actorId]?.kind ?? null)
        : null,
    whisper: !!message.to,
    toName: recipientName(state, message.to, lang),
    readerNames: (message.readers ?? []).map((id) => readerLabel(state, id, lang)),
    range: message.range
      ? {
          meters: message.range.meters,
          heard: (message.range.heard ?? []).map((id) => state.actors?.[id]?.name ?? id),
        }
      : null,
    hidden: message.hidden,
    removed: message.removed
      ? {
          byName: memberName(state, message.removed.by, lang),
          by: message.removed.by,
          at: message.removed.at,
          reason: message.removed.reason ?? "",
        }
      : null,
    canHide: role === "dm" && !message.removed && message.kind !== "system",
    canRemove:
      !message.removed && message.kind !== "system" && (role === "dm" || message.author === role),
  };
  if (message.removed) return { ...base, text: "", scrambled: false };
  if (message.kind === "system") {
    const s = message.system ?? {};
    return {
      ...base,
      text:
        s.code === "cleared"
          ? lang === "en"
            ? `The DM cleared the chat archive (${s.count} messages). Roll and change history stays in the game records.`
            : `Il DM ha svuotato l’archivio della chat (${s.count} messaggi). La cronologia di tiri e modifiche resta nei registri di gioco.`
          : str(message.text),
      scrambled: false,
    };
  }
  const readable = understands(state, message, role, perspective);
  const language = message.language && message.language !== "common" ? message.language : null;
  const view = {
    ...base,
    text: readable ? message.text : scramble(message.text, message.id + ":" + message.language),
    scrambled: !readable,
    language,
    languageName: language ? languageName(language, lang) : "",
    understoodBy: role === "dm" && language ? understoodBy(state, language) : null,
    perspectiveName: perspective ? (state.actors?.[perspective]?.name ?? "") : "",
    mood: message.mood,
    image: readable && message.image ? { ...message.image } : null,
    card: message.card ? copy(message.card) : null,
    snapshot: message.snapshot ? copy(message.snapshot) : null,
  };
  if (message.vote) {
    const tally = voteTally(message.vote);
    view.vote = {
      question: message.vote.question,
      closed: message.vote.closed,
      mine: message.vote.ballots?.[role] ?? null,
      ballots: Object.entries(message.vote.ballots ?? {}).map(([id, choice]) => ({
        name: memberName(state, id, lang),
        choice,
      })),
      ...tally,
      canVote: !message.vote.closed,
      canClose: !message.vote.closed && (role === "dm" || message.author === role),
    };
  }
  return view;
}

// ---------------------------------------------------------------- the game log as cards

const KIND_NAMES = {
  attack: text("Attacco", "Attack"),
  damage: text("Danni", "Damage"),
  save: text("Tiro salvezza", "Saving throw"),
  check: text("Prova", "Check"), // B34: a check the DM requested
  skill: text("Prova di abilità", "Skill check"),
  rider: text("Dado dell’effetto", "Effect die"),
  concentration: text("Concentrazione", "Concentration"),
  "death-save": text("Tiro salvezza contro la morte", "Death saving throw"),
  medicine: text("Prova di Saggezza (Medicina)", "Wisdom (Medicine) check"),
  "stable-recovery": text("Recupero da stabile", "Stable recovery"),
  initiative: text("Iniziativa", "Initiative"),
  "hit-die": text("Dado Vita", "Hit Die"),
  free: text("Tiro libero", "Free roll"),
};
export const rollKindName = (kind, lang = "it") =>
  pick(KIND_NAMES[kind] ?? text(kind ?? "Tiro", kind ?? "Roll"), lang);
// The Table's free roll records only a formatted label ("Livia · d20: 14 + 3 = 17
// (fisico)"); it becomes a card from that label until a structured roll replaces it (B34).
const FREE_ROLL =
  /^(.+) · d(\d+): (\d+) ([+−]) (\d+) = (-?\d+) \((fisico|digitale|physical|digital)\)$/;
export function parseFreeRoll(label) {
  const match = String(label ?? "").match(FREE_ROLL);
  if (!match) return null;
  const modifier = Number(match[5]) * (match[4] === "−" ? -1 : 1);
  return {
    source: "free",
    kind: "free",
    actorName: match[1],
    dice: [{ count: 1, sides: Number(match[2]) }],
    values: [Number(match[3])],
    natural: Number(match[3]),
    modifier,
    total: Number(match[6]),
    mode: ["fisico", "physical"].includes(match[7]) ? "physical" : "digital",
    parsedFromLabel: true,
  };
}
// ---------------------------------------------------------------- privacy of the log

// TV-141: disguised names (conditions.mjs `disguises`, `maskNames`) are re-exported for the
// chat's callers.
export { disguises, maskNames };

/**
 * DM service events (X-02; the D&D Beyond game log shows table events only): settings,
 * countdowns, prepared modifiers, rest bookkeeping, hidden identities and roll policies
 * stay in the DM's log. A player's own line of the same kind stays theirs.
 */
export const SERVICE_LABELS = Object.freeze([
  "Conto alla rovescia",
  "Countdown",
  "Riposo aggiornato",
  "Rest updated",
  "Modificatore preparato",
  "Prepared modifier",
  "Modificatore visibile ai giocatori",
  "Modifier visible to players",
  "Modificatore nascosto ai giocatori",
  "Modifier hidden from players",
  "Identità nascosta",
  "Identity hidden",
  "Nome nascosto",
  "Name hidden",
  "Politica dei tiri",
  "Impostazioni",
  "Settings",
]);
// Lines the dice tray writes for a correction or a withdrawal: its card shows them (TV-87).
const FOLDED_LABELS = Object.freeze([
  "Correzione del tiro: ",
  "Roll correction: ",
  "Tiro ritirato: ",
  "Roll withdrawn: ",
]);
export const isServiceLabel = (label) => {
  const value = String(label ?? "").trim();
  return (
    SERVICE_LABELS.some((prefix) => value.startsWith(prefix)) || /['’]s roll policy$/.test(value)
  );
};

const AUDIENCE_TEXT = {
  gm: text("Io e il DM", "Me and the DM"),
  blind: text("Solo il DM", "DM only"),
  self: text("Solo io", "Only me"),
};
/** The privacy label of a roll card (TV-87): "Solo io", "Io e il DM", "Solo il DM"… */
function privacyOf(roll, lang) {
  const audience = roll.audience ?? (roll.visibility === "private" ? "self" : "public");
  if (!audience || audience === "public" || roll.reveal?.all) return "";
  if (audience === "self" && (roll.controller === "dm" || roll.owner === "dm"))
    return lang === "en" ? "DM only" : "Solo DM";
  return pick(AUDIENCE_TEXT[audience] ?? text("Riservato", "Private"), lang);
}
/**
 * Who set a log roll's DC: the dice tray says so (`dcBy`); a requested check or save and a
 * DM creature's save DC are the DM's (the combat queue attempt); anything else is a rule.
 */
function rollDcSetter(state, roll) {
  if (roll.dcBy) return roll.dcBy;
  if (!roll.attemptId || !["save", "check"].includes(roll.kind)) return "rule";
  return dcSetterOf(
    state,
    (state?.combatAttempts ?? []).find((a) => a.id === roll.attemptId),
  );
}
/** Names of the connected dice that reported a roll's faces (TV-95, Pixels): tray or request. */
function rollDevices(state, roll, lang) {
  const names = Array.isArray(roll.devices)
    ? roll.devices
    : roll.attemptId && roll.requestId
      ? ((state?.combatAttempts ?? [])
          .find((a) => a.id === roll.attemptId)
          ?.requests?.find((r) => r.id === roll.requestId)?.devices ?? [])
      : [];
  return (Array.isArray(names) ? names : []).map((n) => pick(n, lang)).filter(Boolean);
}
/**
 * PG-47: the faces of a combat roll that rolled riders (Bless, Bane), in the log card's
 * shape: the d20s first (the one kept with Advantage or Disadvantage), then each rider's
 * dice named. Null for any other roll (its values stay a plain list).
 */
function riderFaces(roll) {
  const riders = Array.isArray(roll.riderRolls) ? roll.riderRolls : [];
  if (!riders.length || !Array.isArray(roll.values)) return null;
  const main = roll.values.slice(0, roll.dice?.[0]?.count ?? 1);
  let keptOne = false;
  const d20s = main.map((value) => {
    const kept = main.length === 1 || (!keptOne && value === roll.natural);
    if (kept) keptOne = true;
    return { value, sides: roll.dice?.[0]?.sides ?? 20, kept };
  });
  return [
    ...d20s,
    ...riders.flatMap((rider, index) =>
      (rider.faces ?? []).map((value) => ({
        value,
        sides: roll.dice?.[index + 1]?.sides ?? null,
        kept: true,
        label: rider.name,
      })),
    ),
  ];
}
/** The dice of a log roll: «1d20 + 1d4 (Benedizione)», «1d20 − 1d4 (Anatema)» (PG-47). */
function diceText(roll, lang) {
  return (roll.dice ?? [])
    .filter((d) => Number.isInteger(d?.count) && Number.isInteger(d?.sides))
    .map((d, i) => {
      const label = d.label ? pick(d.label, lang) : "";
      const text = `${d.count}d${d.sides}${label ? ` (${label})` : ""}`;
      if (!i) return text;
      return `${roll.riders?.[i - 1]?.sign < 0 ? "−" : "+"} ${text}`;
    })
    .join(" ");
}
/**
 * TV-89 (Foundry roll modes, DDB «Roll to»): whether `role` reads a combat roll's values.
 * The evidence keeps its attack's audience and roller (state.mjs); the rule is combat's
 * `canSeeAttemptValues`, so a «Solo il DM» or «Solo io» roll never reaches the wrong viewer,
 * whoever runs the session included.
 */
function combatValuesVisible(state, roll, role) {
  if (roll?.source !== "combat" || !roll.audience || roll.audience === "public") return true;
  return !!state && canSeeAttemptValues(state, roll, role);
}
function projectRoll(roll, lang, mask = null, { state = null, role = null } = {}) {
  const hide = (value) => (mask?.length ? maskNames(value, mask) : value);
  // C1 (FG hidden DC): a DC the DM set reads «CD nascosta» for players; the result stays.
  const dcHidden =
    Number.isFinite(roll.dc) && state && role
      ? !dcVisibleTo(state, role, rollDcSetter(state, roll))
      : false;
  const rawFaces = Array.isArray(roll.faces) ? roll.faces : riderFaces(roll);
  const faces = Array.isArray(rawFaces)
    ? rawFaces
        .filter((f) => Number.isFinite(f?.value))
        .map((f) => ({
          value: f.value,
          sides: Number.isInteger(f.sides) ? f.sides : null,
          kept: f.kept !== false,
          label: f.label ? pick(f.label, lang) : "",
          ...(f.exploded ? { exploded: true } : {}),
          ...(f.rerolled ? { rerolled: true } : {}),
        }))
    : null;
  const correction = (roll.corrections ?? []).at(-1);
  return {
    id: roll.id ?? null,
    source: roll.source ?? null,
    attemptId: typeof roll.attemptId === "string" ? roll.attemptId : null,
    own: false,
    formula: typeof roll.formula === "string" ? roll.formula : "",
    faces,
    kept: Array.isArray(roll.kept) ? roll.kept.map((k) => k !== false) : null,
    successes: Number.isFinite(roll.successes) ? roll.successes : null,
    sources: (roll.sources ?? [])
      .filter((m) => Number.isFinite(m?.value) && m.value !== 0)
      .map((m) => ({ label: pick(m.label, lang), value: m.value })),
    notes: (roll.notes ?? []).map((n) => pick(n, lang)).filter(Boolean),
    privacy: privacyOf(roll, lang),
    correctedFrom: correction ? (correction.values ?? []) : null,
    correctionNote: correction?.reason ?? "",
    withdrawal: roll.withdrawal?.reason ?? "",
    damage: roll.damage
      ? {
          values: [...(roll.damage.values ?? [])],
          sides: [...(roll.damage.sides ?? [])],
          modifier: roll.damage.modifier ?? 0,
          total: roll.damage.total ?? null,
          critical: !!roll.damage.critical,
          type: roll.damage.type ?? null,
        }
      : null,
    dc: Number.isFinite(roll.dc) && !dcHidden ? roll.dc : null,
    dcHidden,
    success: typeof roll.success === "boolean" ? roll.success : null,
    devices: state ? rollDevices(state, roll, lang) : [],
    actorName: hide(roll.actorName ?? ""),
    actionName: roll.actionName ? pick(roll.actionName, lang) : (roll.sceneName ?? ""),
    kind: roll.kind,
    kindName: rollKindName(roll.kind, lang),
    dice: diceText(roll, lang),
    values: Array.isArray(roll.values) ? roll.values.filter(Number.isFinite) : [],
    modifier: Number.isFinite(roll.modifier) ? roll.modifier : 0,
    total: Number.isFinite(roll.total) ? roll.total : null,
    mode: roll.mode === "physical" ? "physical" : roll.mode === "digital" ? "digital" : "mixed",
    rollMode: roll.rollMode ?? "normal",
    status: roll.status ?? "recorded",
    correctionReason: roll.correctionReason ?? "",
    parsedFromLabel: !!roll.parsedFromLabel,
    controller: roll.controller ?? null,
  };
}
/**
 * The card a blind roll leaves its roller (Foundry blind roll «???», the dice tray's
 * «Tiro inviato al DM»): who rolled what, never a face, a total or an outcome.
 */
function hiddenRollView(view, audience) {
  return {
    ...view,
    formula: "",
    faces: null,
    kept: null,
    successes: null,
    sources: [],
    correctedFrom: null,
    correctionNote: "",
    damage: null,
    dc: null,
    dcHidden: false,
    success: null,
    values: [],
    total: null,
    hiddenResult: audience,
  };
}
/**
 * Game-log entries visible to `role`: roll cards and event lines, oldest first. A roll
 * whose change was undone keeps its card, marked reversed (status "reversed"), and the
 * correction line says what it reversed.
 */
// W2b1 integration (additive): `rollFor(entry, role)` lets the caller turn a label-only
// entry into its roll (the dice tray's rolls, B34), the way parseFreeRoll reads the old one.
export function projectLog(
  state,
  role,
  { clearedAt = null, lang = "it", rollFor = null, requestFor = null } = {},
) {
  const items = [];
  // C3 (Owlbear GM hand-off): whoever runs the session for the DM reads the session's hidden
  // rolls (the DM's creatures, initiative, requests) and true names, as the DM's Table
  // shows them; never a personal sheet's roll, a draft's roll or the DM's own lines.
  const runner = role !== "dm" && runsSessionFor(state, role);
  const sessionRoll = (roll) =>
    runner &&
    roll?.visibility === "private" &&
    roll.personal !== true &&
    roll.source !== "character-build" &&
    (roll.owner ?? roll.controller) === "dm";
  // A player reads hidden identities through their disguise, in old lines too (TV-141).
  const mask = role === "dm" || runner ? [] : disguises(state);
  const hide = (value) => (mask.length ? maskNames(value, mask) : value);
  const reverted = new Set(
    (state.log ?? [])
      .filter((entry) => entry?.kind === "correction" && entry.revertsId)
      .map((entry) => entry.revertsId),
  );
  for (const entry of state.log ?? []) {
    if (!entry || typeof entry.label !== "string" || entry.label.startsWith(LABEL_PREFIX)) continue;
    if (clearedAt && entry.time <= clearedAt) continue;
    // TV-87: a dice-tray correction or withdrawal is folded into its roll's card.
    if (rollFor && !entry.rolls?.length && FOLDED_LABELS.some((p) => entry.label.startsWith(p)))
      continue;
    // X-02: the DM's service bookkeeping is not a table event for the players.
    if (
      role !== "dm" &&
      entry.controller === "dm" &&
      !entry.rolls?.length &&
      isServiceLabel(entry.label)
    )
      continue;
    // TV-89: a combat roll's audience decides who reads its values; the roller of a
    // blind roll keeps a card without them.
    const blindToRoller = (roll) =>
      roll?.source === "combat" &&
      roll.audience === "blind" &&
      roll.acceptedBy === role &&
      !combatValuesVisible(state, roll, role);
    const rolls = (entry.rolls ?? []).filter(
      (roll) =>
        ((rollVisibleTo(roll, role) || sessionRoll(roll)) &&
          combatValuesVisible(state, roll, role)) ||
        blindToRoller(roll),
    );
    // The DM's private line of a hidden session roll is the runner's too; the DM's other
    // private lines (notes, plans, personal rolls) stay the DM's.
    const labelVisible =
      entry.visibility !== "private" ||
      entry.controller === role ||
      (runner && entry.controller === "dm" && rolls.some(sessionRoll));
    // TV-92: the DM's roll request line is its card, with «Tira» for whoever it asks.
    const asked =
      labelVisible && !rolls.length && entry.kind !== "correction" && requestFor
        ? requestFor(entry, role)
        : null;
    if (asked) {
      items.push({
        type: "request",
        id: "log:" + entry.id,
        at: entry.time,
        controller: entry.controller,
        controllerName: memberName(state, entry.controller, lang),
        request: asked,
      });
      continue;
    }
    // A correction repeats the label it reverses: it stays an event, never a new roll.
    const free =
      labelVisible && !rolls.length && entry.kind !== "correction"
        ? (parseFreeRoll(entry.label) ?? rollFor?.(entry, role) ?? null)
        : null;
    if (free) free.controller = entry.controller;
    const reversed = reverted.has(entry.id);
    if (rolls.length || free)
      items.push({
        type: "rolls",
        id: "log:" + entry.id,
        at: entry.time,
        controller: entry.controller,
        controllerName: memberName(state, entry.controller, lang),
        label: labelVisible ? hide(entry.label) : "",
        correction: entry.kind === "correction",
        reversed,
        rolls: (free ? [free] : rolls).map((roll) => {
          const projected = projectRoll(roll, lang, mask, { state, role });
          const view = blindToRoller(roll) ? hiddenRollView(projected, roll.audience) : projected;
          // An attack's roller owns its card even when its audience gave the roll to the DM.
          view.own =
            (roll.acceptedBy ?? roll.owner ?? roll.controller ?? entry.controller) === role;
          return reversed ? { ...view, status: "reversed" } : view;
        }),
      });
    else if (labelVisible)
      items.push({
        type: "event",
        id: "log:" + entry.id,
        at: entry.time,
        controller: entry.controller,
        controllerName: memberName(state, entry.controller, lang),
        label: hide(entry.label),
        correction: entry.kind === "correction",
        reverts: entry.kind === "correction" && !!entry.revertsId,
        reversed,
      });
  }
  return items;
}
/**
 * Messages and log items for `role`, merged by time (Foundry chat log). `options.extra`
 * adds items another area already projected for this role (revealed handouts as cards,
 * Shard VTL-158); those before the archive was cleared stay out, like the log.
 */
export function projectStream(state, slice, role, options = {}) {
  const lang = options.lang ?? "it";
  const messages = slice.messages
    .map((message) => projectMessage(state, message, role, options))
    .filter(Boolean);
  const log = projectLog(state, role, {
    clearedAt: slice.clearedAt,
    lang,
    rollFor: options.rollFor,
    requestFor: options.requestFor,
  });
  const extra = (options.extra ?? []).filter(
    (item) => item?.at && !(slice.clearedAt && item.at <= slice.clearedAt),
  );
  return [...messages, ...log, ...extra].sort(
    (a, b) => a.at.localeCompare(b.at) || (a.seq ?? 0) - (b.seq ?? 0),
  );
}
/** Items new to `role` since `since`: others' messages and others' rolls (DDB-153). */
export function unreadItems(state, slice, role, since, options = {}) {
  if (!since) return [];
  return projectStream(state, slice, role, options).filter(
    (item) =>
      item.at > since &&
      ((item.type === "message" && !item.own && !item.removed) ||
        (item.type === "rolls" && item.controller !== role)),
  );
}

// ---------------------------------------------------------------- moderation and votes

function findReadable(slice, id, role) {
  const message = slice.messages.find((entry) => entry.id === id);
  if (!message || !canSee(message, role))
    fail("Messaggio non disponibile.", "Message unavailable.");
  return message;
}
/** Roll20 hide/unhide: a hidden message stays with the DM (and a trace for its author). */
export function setHidden(slice, id, role, hidden) {
  if (role !== "dm") fail("Solo il DM nasconde i messaggi.", "Only the DM hides messages.");
  const message = findReadable(slice, id, role);
  if (message.removed || message.kind === "system")
    fail("Questo messaggio non si può nascondere.", "This message cannot be hidden.");
  message.hidden = !!hidden;
  return message;
}
/** Deletes the content permanently and leaves a trace with who removed it and why. */
export function removeMessage(slice, id, role, reason, now) {
  const message = findReadable(slice, id, role);
  if (message.removed) fail("Messaggio già eliminato.", "Message already deleted.");
  if (message.kind === "system") fail("Le tracce di sistema restano.", "System traces stay.");
  if (role !== "dm" && message.author !== role)
    fail("Puoi eliminare solo i tuoi messaggi.", "You can delete only your own messages.");
  const why = String(reason ?? "").trim();
  if (why.length > MAX_REASON)
    fail(
      "Motivo troppo lungo (massimo 200 caratteri).",
      "Reason too long (200 characters at most).",
    );
  Object.assign(message, {
    text: "",
    mood: null,
    image: null,
    card: null,
    snapshot: null,
    vote: null,
    hidden: false,
    removed: { by: role, at: now, reason: why },
  });
  return message;
}
export function voteTally(vote) {
  const values = Object.values(vote?.ballots ?? {});
  const yes = values.filter((value) => value === "yes").length;
  const no = values.filter((value) => value === "no").length;
  return {
    yes,
    no,
    total: yes + no,
    outcome: !vote?.closed ? null : yes > no ? "yes" : no > yes ? "no" : "tie",
  };
}
export function castVote(slice, id, role, choice) {
  if (!["yes", "no"].includes(choice)) fail("Scelta non valida.", "Invalid choice.");
  const message = findReadable(slice, id, role);
  if (!message.vote || message.removed) fail("Voto non disponibile.", "Vote unavailable.");
  if (message.vote.closed) fail("Il voto è chiuso.", "The vote is closed.");
  message.vote.ballots[role] = choice;
  return message;
}
export function closeVote(slice, id, role, now) {
  const message = findReadable(slice, id, role);
  if (!message.vote || message.removed) fail("Voto non disponibile.", "Vote unavailable.");
  if (message.vote.closed) fail("Il voto è già chiuso.", "The vote is already closed.");
  if (role !== "dm" && message.author !== role)
    fail(
      "Solo chi ha aperto il voto o il DM lo chiude.",
      "Only the vote’s author or the DM closes it.",
    );
  Object.assign(message.vote, { closed: true, closedBy: role, closedAt: now });
  return message;
}

// ---------------------------------------------------------------- archive

/** Roll20 "Clear Chat Archive": DM only, typed phrase, permanent, with a system trace. */
export function clearArchive(slice, role, phrase, now) {
  if (role !== "dm") fail("Solo il DM svuota l’archivio.", "Only the DM clears the archive.");
  const typed = String(phrase ?? "").trim();
  if (typed !== CLEAR_PHRASE.it && typed !== CLEAR_PHRASE.en)
    fail(
      `Scrivi esattamente «${CLEAR_PHRASE.it}» per confermare.`,
      `Type exactly “${CLEAR_PHRASE.en}” to confirm.`,
    );
  const count = slice.messages.filter((message) => message.kind !== "system").length;
  slice.messages = [];
  slice.clearedAt = now;
  slice.clearedBy = role;
  postMessage(slice, {
    at: now,
    author: role,
    kind: "system",
    speaker: { type: "narrator" },
    text: "",
    language: "common",
    mood: null,
    to: null,
    readers: null,
    range: null,
    image: null,
    card: null,
    snapshot: null,
    vote: null,
    hidden: false,
    removed: null,
    system: { code: "cleared", count },
  });
  return count;
}
const dayKey = (at) => at.slice(0, 10);
/** Items grouped by calendar day (UTC date of the stored instant), oldest first. */
export function groupByDay(items) {
  const groups = [];
  for (const item of items) {
    const key = dayKey(item.at);
    let group = groups.at(-1);
    if (!group || group.day !== key) groups.push((group = { day: key, items: [] }));
    group.items.push(item);
  }
  return groups;
}
function lineFor(item, lang) {
  const t = (it, en) => (lang === "en" ? en : it);
  const time = item.at.slice(11, 16);
  if (item.type === "event")
    return `[${time}] · ${item.correction ? t("Correzione", "Correction") + " · " : ""}${item.controllerName}: ${item.reverts ? t("Annullato", "Undone") + ": " : ""}${item.label}${item.reversed ? " · " + t("annullato", "undone") : ""}`;
  if (item.type === "rolls")
    return item.rolls
      .map(
        (roll) =>
          `[${time}] ${t("Tiro", "Roll")} · ${roll.actorName}${roll.actionName ? " · " + roll.actionName : ""} · ${roll.kindName}: ${roll.dice} [${roll.values.join(", ")}]${roll.modifier ? (roll.modifier < 0 ? " − " : " + ") + Math.abs(roll.modifier) : ""} = ${roll.total ?? "?"} (${roll.mode === "physical" ? t("fisico", "physical") : roll.mode === "digital" ? t("digitale", "digital") : t("misto", "mixed")})${roll.status === "reversed" ? " · " + t("annullato", "undone") : ""}`,
      )
      .join("\n");
  if (item.type === "handout")
    return `[${time}] ${t("Materiale mostrato", "Material shown")}: ${item.title}${item.text ? " — " + item.text : ""}`;
  if (item.removed)
    return `[${time}] ${item.removed.by === item.author && item.author !== "dm" ? t("Messaggio ritirato da", "Message retracted by") : t("Messaggio eliminato da", "Message deleted by")} ${item.removed.byName}${item.removed.reason ? " · " + t("motivo", "reason") + ": " + item.removed.reason : ""}`;
  const who =
    item.kind === "desc"
      ? t("Narrazione", "Narration")
      : item.kind === "ooc"
        ? `${item.speakerName} (${t("fuori personaggio", "out of character")})`
        : item.speakerName;
  const whisper = item.whisper ? ` → ${item.toName} (${t("sussurro", "whisper")})` : "";
  const language = item.language
    ? ` [${item.languageName}${item.scrambled ? t(", non compreso", ", not understood") : ""}]`
    : "";
  const body = item.scrambled
    ? t("(testo in una lingua che non capisci)", "(text in a language you do not understand)")
    : item.kind === "emote"
      ? `${item.speakerName} ${item.text}`
      : item.kind === "share" && item.card
        ? `${t("condivide", "shares")} ${pick(item.card.name, lang)}${item.text ? " — " + item.text : ""}`
        : item.kind === "vote" && item.vote
          ? `${t("Voto", "Vote")}: ${item.vote.question} · ${t("sì", "yes")} ${item.vote.yes}, no ${item.vote.no}${item.vote.closed ? " · " + t("chiuso", "closed") : ""}`
          : item.kind === "snapshot"
            ? `${t("Istantanea", "Snapshot")}: ${item.snapshot?.sceneName ?? ""}${item.text ? " — " + item.text : ""}`
            : item.text;
  const image = item.image ? ` [${t("immagine", "image")}: ${item.image.name || "—"}]` : "";
  return `[${time}] ${who}${whisper}${language}: ${body}${image}`;
}
/**
 * Plain-text export (Foundry "Export Chat Log", FVT-066) of exactly what `role` can read;
 * `includeWhispers: false` mirrors Roll20's "Hide Whispers" (SVC-081).
 */
export function exportTranscript(state, slice, role, options = {}) {
  const lang = options.lang ?? "it";
  const t = (it, en) => (lang === "en" ? en : it);
  const items = projectStream(state, slice, role, options).filter(
    (item) => options.includeWhispers !== false || !item.whisper,
  );
  const lines = [
    `d20 Studio — ${t("Archivio della chat", "Chat archive")} · ${state.campaign?.name ?? ""}`,
    `${t("Esportato da", "Exported by")}: ${memberName(state, role, lang)} · ${options.now ?? ""} · ${options.includeWhispers === false ? t("sussurri esclusi", "whispers excluded") : t("sussurri inclusi", "whispers included")}`,
    t("Orari in UTC.", "Times in UTC."),
  ];
  for (const group of groupByDay(items)) {
    lines.push("", `—— ${group.day} ——`);
    for (const item of group.items) lines.push(lineFor(item, lang));
  }
  return { text: lines.join("\n") + "\n", count: items.length };
}

// ---------------------------------------------------------------- campaign forum (Roll20)

function thread(slice, id) {
  const found = slice.forum.threads.find((entry) => entry.id === id);
  if (!found) fail("Discussione non trovata.", "Discussion not found.");
  return found;
}
const cleanText = (value, max, it, en) => {
  const out = String(value ?? "").trim();
  if (!out || out.length > max) fail(it, en);
  return out;
};
export function createThread(slice, role, { title, text: body }, now) {
  const name = cleanText(
    title,
    MAX_TITLE,
    "Scrivi un titolo (massimo 120 caratteri).",
    "Write a title (120 characters at most).",
  );
  const first = cleanText(
    body,
    MAX_TEXT,
    "Scrivi il primo messaggio (massimo 2000 caratteri).",
    "Write the first message (2000 characters at most).",
  );
  slice.forum.seq += 1;
  const id = "t" + slice.forum.seq;
  slice.forum.seq += 1;
  const created = {
    id,
    title: name,
    author: role,
    at: now,
    lastAt: now,
    pinned: false,
    sunk: false,
    removed: null,
    posts: [{ id: "p" + slice.forum.seq, author: role, at: now, text: first, removed: null }],
  };
  slice.forum.threads.push(created);
  return created;
}
export function replyThread(slice, role, threadId, body, now) {
  const target = thread(slice, threadId);
  if (target.removed) fail("Discussione rimossa.", "Discussion removed.");
  const value = cleanText(
    body,
    MAX_TEXT,
    "Scrivi una risposta (massimo 2000 caratteri).",
    "Write a reply (2000 characters at most).",
  );
  slice.forum.seq += 1;
  const post = { id: "p" + slice.forum.seq, author: role, at: now, text: value, removed: null };
  target.posts.push(post);
  target.lastAt = now;
  return post;
}
/** Roll20 GM tools: Sticky (pinned, first) and Sink (last). */
export function setThreadFlag(slice, role, threadId, flag, value) {
  if (role !== "dm")
    fail("Solo il DM gestisce le discussioni.", "Only the DM manages discussions.");
  if (!["pinned", "sunk"].includes(flag)) fail("Comando non valido.", "Invalid command.");
  const target = thread(slice, threadId);
  if (target.removed) fail("Discussione rimossa.", "Discussion removed.");
  target[flag] = !!value;
  if (value) target[flag === "pinned" ? "sunk" : "pinned"] = false;
  return target;
}
export function removeThread(slice, role, threadId, reason, now) {
  const target = thread(slice, threadId);
  if (target.removed) fail("Discussione già rimossa.", "Discussion already removed.");
  if (role !== "dm" && target.author !== role)
    fail("Puoi rimuovere solo le tue discussioni.", "You can remove only your own discussions.");
  const why = String(reason ?? "")
    .trim()
    .slice(0, MAX_REASON);
  target.removed = { by: role, at: now, reason: why };
  target.title = "";
  target.posts = [];
  target.pinned = false;
  return target;
}
export function removePost(slice, role, threadId, postId, reason, now) {
  const target = thread(slice, threadId);
  const post = target.posts.find((entry) => entry.id === postId);
  if (!post || post.removed) fail("Messaggio non disponibile.", "Post unavailable.");
  if (role !== "dm" && post.author !== role)
    fail("Puoi eliminare solo i tuoi messaggi.", "You can delete only your own posts.");
  post.text = "";
  post.removed = {
    by: role,
    at: now,
    reason: String(reason ?? "")
      .trim()
      .slice(0, MAX_REASON),
  };
  return post;
}
/** Threads in Roll20 order: pinned first, then by latest activity, sunk threads last. */
export function projectThreads(state, slice, role, lang = "it") {
  const rank = (entry) => (entry.pinned ? 0 : entry.sunk ? 2 : 1);
  return [...slice.forum.threads]
    .sort((a, b) => rank(a) - rank(b) || b.lastAt.localeCompare(a.lastAt))
    .map((entry) => ({
      ...copy(entry),
      authorName: memberName(state, entry.author, lang),
      replies: Math.max(0, entry.posts.filter((post) => !post.removed).length - 1),
      removed: entry.removed
        ? { ...entry.removed, byName: memberName(state, entry.removed.by, lang) }
        : null,
      posts: entry.posts.map((post) => ({
        ...copy(post),
        authorName: memberName(state, post.author, lang),
        own: post.author === role,
        removed: post.removed
          ? { ...post.removed, byName: memberName(state, post.removed.by, lang) }
          : null,
      })),
      own: entry.author === role,
    }));
}
/** Roll20's "latest posts" on the campaign page (R20-062): newest first, removed ones out. */
export function latestPosts(state, slice, role, { limit = 5, lang = "it" } = {}) {
  return slice.forum.threads
    .filter((entry) => !entry.removed)
    .flatMap((entry) =>
      entry.posts
        .filter((post) => !post.removed)
        .map((post) => ({
          threadId: entry.id,
          title: entry.title,
          postId: post.id,
          at: post.at,
          own: post.author === role,
          authorName: memberName(state, post.author, lang),
          text: post.text.length > 90 ? post.text.slice(0, 89) + "…" : post.text,
        })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
/** Forum posts by others after `since` (for the notification centre). */
export function unreadPosts(state, slice, role, since, lang = "it") {
  if (!since) return [];
  return slice.forum.threads.flatMap((entry) =>
    entry.removed
      ? []
      : entry.posts
          .filter((post) => !post.removed && post.author !== role && post.at > since)
          .map((post) => ({
            threadId: entry.id,
            title: entry.title,
            postId: post.id,
            at: post.at,
            authorName: memberName(state, post.author, lang),
            text: post.text,
          })),
  );
}

// ---------------------------------------------------------------- search

/** Readable, understood messages and forum threads matching `query` (at most 20). */
export function searchChat(state, slice, role, query, options = {}) {
  const key = fold(query);
  if (key.length < 2) return [];
  const lang = options.lang ?? "it";
  const results = [];
  for (const item of slice.messages
    .map((message) => projectMessage(state, message, role, options))
    .filter((item) => item && !item.scrambled && !item.removed)) {
    const hay = fold(
      `${item.speakerName} ${item.text} ${item.card ? pick(item.card.name, lang) : ""}`,
    );
    if (hay.includes(key))
      results.push({
        title: `${item.speakerName}: ${(item.text || (item.card ? pick(item.card.name, lang) : "")).slice(0, 60)}`,
        page: "campaign",
        params: { tab: "chat-archive", id: item.id },
      });
  }
  for (const entry of slice.forum.threads.filter((entry) => !entry.removed)) {
    const hay = fold(`${entry.title} ${entry.posts.map((post) => post.text).join(" ")}`);
    if (hay.includes(key))
      results.push({
        title: entry.title,
        page: "campaign",
        params: { tab: "chat-forum", id: entry.id },
      });
  }
  return results.slice(0, 20);
}
