// B59 — Public tables, group finder and moderation: pure domain (no DOM, no registry).
// Every command works on a plain state object (a commit draft in the app) and on this
// area's slice, state.ext.community. Delegated inclusion as a SIMULATION (census card B59,
// decision of 23/09/2026): listings and people outside the two demonstration identities
// are synthetic; nothing leaves this browser. Q161 (public recruiting and moderation) and
// SV-28 (age and parental consent) stay open for the real product.
//
// Patterns copied (IDs from docs/interview/CAPABILITY_CENSUS.md and
// changes/interview-01/market-census/*.md):
// - Join a Game search with keyword, language, day, start time in the viewer's time zone,
//   "welcomes new players" and a Mature (18+) box that hides adult listings unless ticked,
//   even the viewer's own (Roll20 R20-004, SVC-003, SVC-004).
// - A listing needs a next game date and an active campaign; the Listing Status box names
//   what is missing; Disable and Enable; the listing turns off by itself when full (Roll20
//   SVC-067). An archived or deleted campaign keeps its queue reachable until every
//   waiting applicant is answered (Kanka SVC-153).
// - Listing content rules: 18+ must be marked, no listing more than 3 months ahead, no
//   public payment or off-site community links (Roll20 SVC-069).
// - At least one safety tool and the content warnings on the listing, seen before
//   joining (StartPlaying SVC-070/SVC-071, Alchemy SVC-010), taken from the campaign's
//   expectations sheet of B27.
// - Applications with a message, editable or cancellable while pending; the admin
//   approves or rejects with a reply that reaches the applicant as a notification
//   (Kanka SVC-041, SVC-153). A private application, not a public thread (F-063).
// - Seat limit with a first-in-first-out waitlist that nobody can reorder: "Sign up"
//   becomes "Join waitlist" when full (Warhorn SVC-009). While anyone waits, a newcomer
//   joins the end of the line even if a seat is free, and nobody who arrived later is
//   accepted before the first person in line.
// - Player directory: a player lists themself (opt-in, opt-out), GMs filter and invite
//   (Roll20 R20-006, SVC-006); the private message becomes an invitation to apply, since
//   general messaging is outside F-063.
// - Report a user or listing with a reason, a description and an optional screenshot
//   (Roll20 SVC-148, DDB Report Image DDB-157: talk to the DM first, outcomes are not
//   disclosed); Block / Unblock in the same place
//   (Roll20 SVC-149); code of conduct with the moderation ladder (Roll20 SVC-150).
//   SVC-149 stops private messages and keeps LFG posts visible, so a block here stops the
//   private contact of this area (applications and invitations to apply, both ways) and
//   hides nothing: listings, directory rows and applications already received stay.
// - Read-only public campaign page with the "would show nothing" warning and its fix
//   (Kanka SVC-042, CMP-53), visitors read what is shared with all players (Roll20
//   SVC-032, R20-063), a shareable link (LegendKeeper CMP-58). Only entries a DM or co-DM
//   owns can go public: a player's entry keeps the audience its author chose.
// Not adopted, with reason: Pick-up games (R20-005/SVC-005) join at once, while F-063
// rules out automatic access; the public Listing Discussion (SVC-068) is replaced by the
// private application F-063 prefers; paid tables (SVC-002) are excluded (SV-54).
//
// Rules baseline: every listed table plays D&D 2024 (SRD 5.2.1, EN/IT), like B13.

import { resolveSessionTime } from "./campaign-sessions.mjs";
import {
  admitMember,
  canManage,
  coreCampaign,
  inviteIdentity,
  listCampaigns,
  memberOf,
  membersOf,
  metaOf,
  nextSessionOf,
  personName,
  roleOf,
} from "./campaign-members.mjs";
import {
  IMAGE_TYPES,
  LIMITS as MEDIA_LIMITS,
  dataBytes,
  isDataUrl,
  sniff,
} from "./media-domain.mjs";
import { SAFETY_TOOLS, SAFETY_TOPICS, topicById, toolById } from "./safety-domain.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const ID = "community";
export const VERSION = 1;
export const IDENTITIES = Object.freeze(["player", "dm"]);
export const FORMATS = Object.freeze(["campaign", "one-shot"]);
export const FREQUENCIES = Object.freeze(["weekly", "biweekly", "monthly", "once"]);
export const LANGUAGES = Object.freeze(["it", "en"]);
export const LIMITS = Object.freeze({
  title: 80,
  pitch: 800,
  message: 500,
  reply: 300,
  report: 600,
  availability: 120,
  intro: 300,
  seatsMin: 1,
  seatsMax: 8,
  // DDB-157 report screenshot: one image per report, checked like a media upload (B28:
  // PNG, JPEG or WebP, first bytes, 500 KB). All report images of this browser together
  // stay within the same 500 KB: they live in local storage with every other area's data.
  screenshot: MEDIA_LIMITS.image,
  screenshots: MEDIA_LIMITS.image,
  screenshotName: 120,
});
// Roll20 SVC-069: no listing more than 3 months ahead.
export const HORIZON_DAYS = 92;
// Revision of the code of conduct text; accepting an older one asks again.
export const CONDUCT_REVISION = 1;
export const RULES = Object.freeze({ edition: "2024", srd: "5.2.1" });
export const WEEKDAYS = Object.freeze(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
// Start-time bands for the search, in the viewer's time zone (Roll20 "approximate start").
export const TIME_BANDS = Object.freeze({
  morning: [6, 12],
  afternoon: [12, 18],
  evening: [18, 24],
  night: [0, 6],
});

const L = (it, en) => Object.freeze({ it, en });
// Roll20 report reasons adapted to a public table (SVC-148, SVC-069, DDB-157).
export const REPORT_REASONS = Object.freeze([
  { id: "harassment", label: L("Molestie o insulti", "Harassment or insults") },
  {
    id: "unmarked-mature",
    label: L("Contenuti per adulti non segnalati (18+)", "Unmarked adult content (18+)"),
  },
  {
    id: "links",
    label: L("Link esterni o richieste di pagamento", "Off-site links or payment requests"),
  },
  { id: "spam", label: L("Spam o annuncio ingannevole", "Spam or misleading listing") },
  { id: "safety", label: L("Mi sento in pericolo", "I feel unsafe") },
  { id: "other", label: L("Altro", "Other") },
]);
// Roll20 moderation ladder (SVC-150), shown as the declared reference, not a decided policy.
export const MODERATION_LADDER = Object.freeze([
  L("Avvertimento", "Warning"),
  L("Rimozione dell’annuncio o del messaggio", "Removal of the listing or message"),
  L(
    "Sospensione dalle aree pubbliche da 1 giorno a 1 anno",
    "Suspension from public areas, 1 day to 1 year",
  ),
  L("Esclusione permanente dalle aree pubbliche", "Permanent ban from public areas"),
]);

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const clone = (value) => structuredClone(value);
const iso = (ms) => new Date(ms).toISOString();
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const arrayOf = (value) => (Array.isArray(value) ? value : []);
const objectOf = (value) => (isObject(value) ? value : {});
const text = (value) => String(value ?? "").trim();
export function refuse(it, en) {
  throw Object.assign(new Error(en), { it, en });
}
function newId(prefix) {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return `${prefix}-${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

// Public text may not carry payment or off-site community links (Roll20 SVC-069).
const LINK_PATTERN =
  /(https?:\/\/|www\.|discord\.(gg|com)|paypal|patreon|ko-fi|buymeacoffee|t\.me\/|\b[a-z0-9-]+\.(com|it|net|org|gg|io|me)\b)/i;
export const hasExternalLink = (value) => LINK_PATTERN.test(String(value ?? ""));

// ---------------------------------------------------------------- seed

// Synthetic strangers. They are not identities of this demo: they cannot sign in.
const PEOPLE = {
  "sim-tomas": { name: "Tomas Ferri", languages: ["it"] },
  "sim-greta": { name: "Greta Lind", languages: ["it", "en"] },
  "sim-marta": { name: "Marta Riva", languages: ["it"] },
  "sim-owen": { name: "Owen Pryce", languages: ["en"] },
  "sim-chiara": { name: "Chiara Bassi", languages: ["it"] },
  "sim-sam": { name: "Sam Keller", languages: ["en"] },
  "sim-luca": { name: "Luca Dini", languages: ["it"] },
  "sim-ines": { name: "Ines Moretti", languages: ["it", "en"] },
  "sim-joel": { name: "Joel Park", languages: ["en"] },
  "sim-nadia": { name: "Nadia Rossi", languages: ["it"] },
  "sim-priya": { name: "Priya Shah", languages: ["en"] },
};
const external = (id, owner, data) => ({
  id,
  kind: "external",
  campaignId: null,
  ownerId: owner,
  status: "live",
  disabledReason: null,
  conductRevision: CONDUCT_REVISION,
  createdAt: sampleDate("2026-09-01T10:00:00.000Z"),
  updatedAt: sampleDate("2026-09-15T10:00:00.000Z"),
  publishedAt: sampleDate("2026-09-15T10:00:00.000Z"),
  newcomers: false,
  mature: false,
  waitlist: true,
  warnings: [],
  tools: ["stop", "lines"],
  ...data,
});
export function seedSlice() {
  return {
    people: clone(PEOPLE),
    listings: {
      // The DM's listing for the current campaign. It was visible while a session was
      // scheduled; with no next session it is hidden until one is scheduled (SVC-067).
      "listing-lanterns": {
        id: "listing-lanterns",
        kind: "campaign",
        campaignId: "lanterns",
        ownerId: "dm",
        title: "Le lanterne di Bruma cerca due giocatori",
        pitch:
          "Campagna D&D 2024 in corso da qualche mese, personaggi di 3° livello. Mistero e avventura intorno al vecchio osservatorio di Bruma: esplorazione, intrighi fra le famiglie, combattimenti tattici. Giochiamo online il giovedì sera, ogni settimana.",
        language: "it",
        format: "campaign",
        frequency: "weekly",
        seats: 3,
        newcomers: true,
        mature: false,
        waitlist: true,
        tools: ["stop", "pace", "hand", "lines", "stars"],
        warnings: ["spiders"],
        warningsFrom: sampleDate("2026-09-05T19:30:00.000Z"),
        status: "live",
        disabledReason: null,
        conductRevision: CONDUCT_REVISION,
        createdAt: sampleDate("2026-09-01T18:00:00.000Z"),
        updatedAt: sampleDate("2026-09-05T19:40:00.000Z"),
        publishedAt: sampleDate("2026-09-05T19:40:00.000Z"),
      },
      "listing-cripta": external("listing-cripta", "sim-marta", {
        title: "La Cripta di Vetro · one-shot per chi inizia",
        pitch:
          "Una serata sola, personaggi pronti di 1° livello e regole spiegate strada facendo. Esploriamo una cripta di cristallo sotto il lago: enigmi, un po’ di combattimento, niente orrore.",
        language: "it",
        format: "one-shot",
        frequency: "once",
        schedule: { weekday: 6, time: "15:00", timeZone: "Europe/Rome" },
        seats: 5,
        taken: 2,
        newcomers: true,
        tools: ["stop", "pace", "lines"],
      }),
      "listing-salt": external("listing-salt", "sim-owen", {
        title: "Salt Road Watch · weekly caravan campaign",
        pitch:
          "Guards on a desert caravan route, levels 4 to 10. Travel, negotiation and set-piece fights every Wednesday evening, UK time. The table is full: join the waitlist and we contact people in order.",
        language: "en",
        format: "campaign",
        frequency: "weekly",
        schedule: { weekday: 3, time: "19:30", timeZone: "Europe/London" },
        seats: 4,
        taken: 4,
        tools: ["stop", "hand", "lines", "stars"],
        warnings: ["gore"],
      }),
      "listing-paludi": external("listing-paludi", "sim-chiara", {
        title: "Le Paludi di Nebbiafonda",
        pitch:
          "Campagna di esplorazione e sopravvivenza nelle paludi, ogni due martedì. Cerchiamo giocatori con un po’ d’esperienza, disposti a tenere un diario del personaggio.",
        language: "it",
        format: "campaign",
        frequency: "biweekly",
        schedule: { weekday: 2, time: "21:00", timeZone: "Europe/Rome" },
        seats: 5,
        taken: 2,
        tools: ["stop", "pace", "lines", "stars"],
        warnings: ["drowning", "insects"],
      }),
      "listing-hymns": external("listing-hymns", "sim-sam", {
        title: "Midnight Hymns · horror one-shot (18+)",
        pitch:
          "A gothic horror night in a drowned chapel. Mature themes: body horror and graphic wounds, handled with lines and veils agreed at the start.",
        language: "en",
        format: "one-shot",
        frequency: "once",
        schedule: { weekday: 5, time: "22:00", timeZone: "America/New_York" },
        seats: 4,
        taken: 1,
        mature: true,
        tools: ["stop", "pace", "lines"],
        warnings: ["body-horror", "gore"],
      }),
      "listing-faro": external("listing-faro", "sim-luca", {
        title: "Il Faro Spento",
        pitch:
          "Campagna costiera con intrighi di contrabbandieri, ogni giovedì sera. Gruppo affiatato, cerchiamo una persona costante.",
        language: "it",
        format: "campaign",
        frequency: "weekly",
        schedule: { weekday: 4, time: "20:30", timeZone: "Europe/Rome" },
        seats: 4,
        taken: 3,
        waitlist: false,
        tools: ["stop", "lines"],
      }),
    },
    applications: [
      {
        id: "app-tomas",
        listingId: "listing-lanterns",
        who: "sim-tomas",
        message:
          "Ciao! Gioco dal 2019, soprattutto online. Mi piacerebbe un ladro o un bardo. Il giovedì sera sono libero.",
        status: "pending",
        reply: "",
        conduct: true,
        adult: false,
        createdAt: sampleDate("2026-09-08T19:12:00.000Z"),
        updatedAt: sampleDate("2026-09-08T19:12:00.000Z"),
        decidedAt: null,
        decidedBy: null,
      },
      {
        id: "app-greta",
        listingId: "listing-lanterns",
        who: "sim-greta",
        message:
          "Sono nuova alle regole 2024 ma ho giocato molto a Baldur’s Gate 3. Il giovedì dalle 21 ci sono.",
        status: "pending",
        reply: "",
        conduct: true,
        adult: false,
        createdAt: sampleDate("2026-09-09T08:40:00.000Z"),
        updatedAt: sampleDate("2026-09-09T08:40:00.000Z"),
        decidedAt: null,
        decidedBy: null,
      },
      {
        id: "app-ines",
        listingId: "listing-salt",
        who: "sim-ines",
        message: "Available every Wednesday, happy to play a support character.",
        status: "waitlisted",
        reply: "",
        conduct: true,
        adult: false,
        createdAt: sampleDate("2026-09-12T17:00:00.000Z"),
        updatedAt: sampleDate("2026-09-12T17:00:00.000Z"),
        decidedAt: null,
        decidedBy: null,
      },
      {
        id: "app-joel",
        listingId: "listing-salt",
        who: "sim-joel",
        message: "Long-time player, new to the 2024 rules.",
        status: "waitlisted",
        reply: "",
        conduct: true,
        adult: false,
        createdAt: sampleDate("2026-09-14T20:30:00.000Z"),
        updatedAt: sampleDate("2026-09-14T20:30:00.000Z"),
        decidedAt: null,
        decidedBy: null,
      },
      // An earlier application of the player, declined with a reply (Kanka SVC-041).
      {
        id: "app-player-faro",
        listingId: "listing-faro",
        who: "player",
        message: "Ciao, gioco il venerdì con un altro gruppo ma il giovedì sono libera.",
        status: "declined",
        reply:
          "Grazie! Per ora cerchiamo qualcuno libero anche il giovedì pomeriggio. Riprova a novembre.",
        conduct: true,
        adult: false,
        createdAt: sampleDate("2026-09-16T18:00:00.000Z"),
        updatedAt: sampleDate("2026-09-16T18:00:00.000Z"),
        decidedAt: sampleDate("2026-09-18T09:30:00.000Z"),
        decidedBy: "sim-luca",
      },
    ],
    // Player directory (R20-006): opt-in entries, keyed by identity or simulated person.
    directory: {
      "sim-nadia": {
        active: true,
        format: "any",
        language: "it",
        availability: "Sabato pomeriggio o domenica sera",
        intro: "Ho giocato due campagne con le regole 2014; cerco un gruppo stabile online.",
        updatedAt: sampleDate("2026-09-10T12:00:00.000Z"),
      },
      "sim-priya": {
        active: true,
        format: "one-shot",
        language: "en",
        availability: "Weekday evenings, UK time",
        intro: "New to D&D, looking for a friendly one-shot to learn.",
        updatedAt: sampleDate("2026-09-11T12:00:00.000Z"),
      },
    },
    invitations: [],
    blocks: {},
    reports: [],
    conduct: {},
    publicPages: {},
    audit: [],
  };
}
export function normalizeSlice(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Community data comes from a newer version");
  if (!isObject(slice)) return seedSlice();
  const listings = {};
  for (const [id, raw] of Object.entries(objectOf(slice.listings)))
    if (isObject(raw) && typeof raw.title === "string") listings[id] = { ...raw, id };
  return {
    people: objectOf(slice.people),
    listings,
    applications: arrayOf(slice.applications).filter(
      (row) => isObject(row) && typeof row.id === "string" && typeof row.listingId === "string",
    ),
    directory: objectOf(slice.directory),
    invitations: arrayOf(slice.invitations).filter(isObject),
    blocks: objectOf(slice.blocks),
    reports: arrayOf(slice.reports).filter(isObject),
    conduct: objectOf(slice.conduct),
    publicPages: objectOf(slice.publicPages),
    audit: arrayOf(slice.audit).filter(isObject),
  };
}
function audit(slice, now, by, kind, data = {}) {
  slice.audit.push({ id: newId("event"), at: iso(now), by, kind, data });
  if (slice.audit.length > 200) slice.audit.splice(0, slice.audit.length - 200);
}

// ---------------------------------------------------------------- people and access

export const isIdentity = (id) => IDENTITIES.includes(id);
export function personLabel(state, slice, id, lang = "it") {
  if (slice?.people?.[id]?.name) return slice.people[id].name;
  return personName(state, id, lang);
}
export function blockedBy(slice, who) {
  return arrayOf(slice?.blocks?.[who]).map((row) => row.personId);
}
export const hasBlocked = (slice, who, personId) => blockedBy(slice, who).includes(personId);

// Who manages a listing: the campaign's DM or co-DM (B13 roles). External listings
// belong to simulated people, never to an identity of this demo.
export function canManageListing(state, listing, who) {
  if (!listing || listing.kind !== "campaign") return false;
  return canManage(state, listing.campaignId, who);
}
export function campaignName(state, campaignId) {
  return coreCampaign(state, campaignId)?.name ?? "";
}
// Campaigns whose recruiting this identity manages: the active ones, then an archived or
// deleted one (B13) while its listing still has applications waiting, so every applicant
// still gets an answer (Kanka SVC-153) and every notice opens a queue the manager reaches.
// Deleted campaigns follow B13: only their owner still sees them.
export function managedCampaigns(state, slice, who, now = Date.now()) {
  const manages = (row) => canManage(state, row.id, who);
  const waiting = (row) => {
    const listing = listingForCampaign(slice, row.id);
    return Boolean(listing) && applicationsOf(slice, listing.id).some(isOpen);
  };
  return [
    ...listCampaigns(state, who, {}, now).filter(manages),
    ...["archived", "deleted"].flatMap((status) =>
      listCampaigns(state, who, { status }, now).filter((row) => manages(row) && waiting(row)),
    ),
  ];
}
// B13 status: listings of an archived or deleted campaign stay hidden until it is restored.
export function campaignActive(state, campaignId) {
  return metaOf(state, campaignId)?.status === "active";
}
export function listingForCampaign(slice, campaignId) {
  return Object.values(slice?.listings ?? {}).find(
    (row) => row.kind === "campaign" && row.campaignId === campaignId,
  );
}

// ---------------------------------------------------------------- time

function zoneParts(ms, timeZone) {
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    format.formatToParts(new Date(ms)).map((part) => [part.type, part.value]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}
export function viewerZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
// The next weekly occurrence of a simulated table, in its own time zone.
export function nextOccurrence(schedule, now = Date.now()) {
  if (!schedule?.timeZone || !/^\d{2}:\d{2}$/.test(schedule.time ?? "")) return null;
  for (let offset = 0; offset <= 8; offset++) {
    const day = zoneParts(now + offset * DAY, schedule.timeZone);
    if (day.weekday !== schedule.weekday) continue;
    const resolution = resolveSessionTime({
      localTime: `${day.year}-${day.month}-${day.day}T${schedule.time}`,
      timeZone: schedule.timeZone,
    });
    const startsAt = resolution.startsAt ?? resolution.candidates?.[0]?.startsAt;
    if (startsAt && Date.parse(startsAt) > now) return { startsAt, timeZone: schedule.timeZone };
  }
  return null;
}
// Roll20 SVC-067: the listing's next game date is the campaign's next scheduled session.
export function listingNextSession(state, listing, now = Date.now()) {
  if (!listing) return null;
  if (listing.kind === "external") return nextOccurrence(listing.schedule, now);
  const session = nextSessionOf(state, listing.campaignId, now);
  return session ? { startsAt: session.startsAt, timeZone: session.timeZone || "UTC" } : null;
}
export function localParts(startsAt, timeZone) {
  return zoneParts(Date.parse(startsAt), timeZone);
}

// ---------------------------------------------------------------- seats and state

const OPEN = ["pending", "waitlisted"];
export const isOpen = (application) => OPEN.includes(application?.status);
export function applicationsOf(slice, listingId) {
  return arrayOf(slice?.applications).filter((row) => row.listingId === listingId);
}
function inviteStatus(state, listing, application) {
  if (!application.inviteId) return null;
  return (
    metaOf(state, listing.campaignId)?.directInvites?.find((row) => row.id === application.inviteId)
      ?.status ?? null
  );
}
// Seats: players of the campaign (B13 roles) plus invitations still reserving a seat;
// simulated tables keep a fixed number of taken seats.
export function seatInfo(state, slice, listing) {
  const seats = Number(listing?.seats) || 0;
  let members = 0;
  let reserved = 0;
  if (listing?.kind === "campaign") {
    members = membersOf(state, listing.campaignId).filter(
      (member) => roleOf(state, listing.campaignId, member.id) === "player",
    ).length;
    reserved = applicationsOf(slice, listing.id).filter(
      (row) =>
        row.status === "approved" &&
        !memberOf(state, listing.campaignId, row.who) &&
        inviteStatus(state, listing, row) === "pending",
    ).length;
  } else members = Number(listing?.taken) || 0;
  const filled = members + reserved;
  const waiting = applicationsOf(slice, listing?.id).filter(
    (row) => row.status === "waitlisted",
  ).length;
  return {
    seats,
    filled,
    members,
    reserved,
    free: Math.max(0, seats - filled),
    full: filled >= seats,
    waiting,
  };
}
// Roll20 SVC-067 status box: every missing prerequisite, named, with where to fix it.
export function listingProblems(state, slice, listing, now = Date.now()) {
  if (!listing || listing.kind !== "campaign") return [];
  const problems = [];
  const add = (id, it, en, fix = null) => problems.push({ id, it, en, fix });
  // An archived or deleted campaign (B13) is restored on its Campaigns page.
  if (!campaignActive(state, listing.campaignId))
    add(
      "campaign",
      "Campagna attiva (non archiviata né eliminata)",
      "Campaign active (not archived or deleted)",
      { page: "campaigns", params: { id: listing.campaignId } },
    );
  if (!text(listing.title) || !text(listing.pitch))
    add(
      "text",
      "Titolo e presentazione pubblica",
      "Title and public presentation",
      formFix(state, listing, text(listing.title) ? "pitch" : "title"),
    );
  const next = listingNextSession(state, listing, now);
  const current = state?.campaign?.id === listing.campaignId;
  if (!next)
    add(
      "session",
      "Prossima sessione in programma",
      "Next session scheduled",
      current
        ? { page: "campaign", params: { tab: "sessions" } }
        : { page: "campaigns", params: { id: listing.campaignId } },
    );
  else if (Date.parse(next.startsAt) - now > HORIZON_DAYS * DAY)
    add(
      "horizon",
      "Prossima sessione entro 3 mesi",
      "Next session within 3 months",
      current ? { page: "campaign", params: { tab: "sessions" } } : null,
    );
  if (!arrayOf(listing.tools).length)
    add(
      "tools",
      "Almeno uno strumento di sicurezza dichiarato",
      "At least one safety tool declared",
      formFix(state, listing, "tools"),
    );
  if ([listing.title, listing.pitch].some(hasExternalLink))
    add(
      "links",
      "Nessun link esterno o di pagamento nel testo pubblico",
      "No off-site or payment links in the public text",
      formFix(state, listing, hasExternalLink(listing.title) ? "title" : "pitch"),
    );
  const seats = seatInfo(state, slice, listing);
  if (seats.full && !listing.waitlist)
    add(
      "full",
      "Un posto libero, oppure la lista d’attesa attiva",
      "A free seat, or the waitlist turned on",
      formFix(state, listing, "seats"),
    );
  if (listing.conductRevision !== CONDUCT_REVISION)
    add("conduct", "Codice di condotta accettato", "Code of conduct accepted");
  return problems;
}
// "draft" (never published), "disabled" (turned off by hand or when full), "hidden"
// (published, but a prerequisite is missing) or "live" (listed in the search).
export function listingState(state, slice, listing, now = Date.now()) {
  if (!listing) return "missing";
  if (listing.status === "draft") return "draft";
  if (listing.status === "disabled") return "disabled";
  if (listing.kind === "campaign") {
    // Every reason is named in the status box, the B13 campaign status included.
    if (listingProblems(state, slice, listing, now).length) return "hidden";
  } else {
    const seats = seatInfo(state, slice, listing);
    if (seats.full && !listing.waitlist) return "hidden";
  }
  return "live";
}
// A fix link for the listing form: the campaign section of the current campaign, or the
// "My listings" tab for another one; `field` is the form field to focus.
function formFix(state, listing, field) {
  return state?.campaign?.id === listing.campaignId
    ? { page: "campaign", params: { tab: "community", id: "listing" }, field }
    : { page: "community", params: { tab: "manage-listing", id: listing.campaignId }, field };
}

// ---------------------------------------------------------------- search (R20-004)

export function searchListings(
  state,
  slice,
  viewer,
  filters = {},
  now = Date.now(),
  zone = viewerZone(),
) {
  const blocked = blockedBy(slice, viewer);
  const query = text(filters.q).toLocaleLowerCase();
  let hiddenMature = 0;
  const rows = [];
  for (const listing of Object.values(slice?.listings ?? {})) {
    if (listingState(state, slice, listing, now) !== "live") continue;
    const next = listingNextSession(state, listing, now);
    if (!next) continue;
    // Roll20 SVC-004: adult listings stay hidden unless the box is ticked, even one's own.
    if (listing.mature && !filters.mature) {
      hiddenMature++;
      continue;
    }
    if (filters.language && filters.language !== "any" && listing.language !== filters.language)
      continue;
    if (filters.format && filters.format !== "any" && listing.format !== filters.format) continue;
    if (filters.newcomers && !listing.newcomers) continue;
    const local = localParts(next.startsAt, zone);
    if (
      filters.day !== undefined &&
      filters.day !== "" &&
      filters.day !== "any" &&
      Number(filters.day) !== local.weekday
    )
      continue;
    const band = TIME_BANDS[filters.band];
    if (band && !(local.hour >= band[0] && local.hour < band[1])) continue;
    const owner = personLabel(state, slice, listing.ownerId, "it");
    if (
      query &&
      ![listing.title, listing.pitch, owner, campaignName(state, listing.campaignId)]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query)
    )
      continue;
    // Roll20 SVC-149 keeps LFG posts visible after a block: the row is only marked.
    rows.push({
      listing: clone(listing),
      next,
      seats: seatInfo(state, slice, listing),
      local,
      blocked: blocked.includes(listing.ownerId),
    });
  }
  rows.sort((a, b) => a.next.startsAt.localeCompare(b.next.startsAt));
  return { rows, hiddenMature };
}

// ---------------------------------------------------------------- listing commands

function mutableListing(slice, listingId) {
  const listing = slice.listings?.[listingId];
  if (!listing) refuse("Annuncio non trovato.", "Listing not found.");
  return listing;
}
function requireListingManager(state, listing, who) {
  if (!canManageListing(state, listing, who))
    refuse(
      "Solo il DM o un co-DM della campagna gestisce questo annuncio.",
      "Only the campaign’s DM or a co-DM manages this listing.",
    );
}
// The campaign's expectations sheet (B27) as the listing's safety declaration.
export function campaignSafety(state, campaignId) {
  const expectations = state?.ext?.safety?.campaigns?.[campaignId]?.expectations;
  if (!expectations) return null;
  return {
    tools: arrayOf(expectations.tools).filter((id) => toolById(id)),
    warnings: arrayOf(expectations.warnings)
      .map((row) => row?.topic)
      .filter((id) => topicById(id)),
    shared: expectations.shared === true,
    updatedAt: expectations.updatedAt ?? null,
  };
}
// Roll20 "Looking for Players → Manage Listing → Create": a draft prefilled from the
// campaign profile (B13) and its safety sheet (B27).
export function createListing(state, slice, campaignId, who, now = Date.now()) {
  if (!canManage(state, campaignId, who))
    refuse(
      "Solo il DM o un co-DM può creare l’annuncio.",
      "Only the DM or a co-DM can create the listing.",
    );
  if (listingForCampaign(slice, campaignId))
    refuse("Questa campagna ha già un annuncio.", "This campaign already has a listing.");
  const meta = metaOf(state, campaignId);
  const safety = campaignSafety(state, campaignId);
  const listing = {
    id: newId("listing"),
    kind: "campaign",
    campaignId,
    ownerId: who,
    title: campaignName(state, campaignId).slice(0, LIMITS.title),
    pitch: text(meta?.description).slice(0, LIMITS.pitch),
    language: "it",
    format: "campaign",
    frequency: "weekly",
    seats: 4,
    newcomers: false,
    mature: false,
    waitlist: true,
    tools: safety?.tools ?? [],
    warnings: safety?.warnings ?? [],
    warningsFrom: safety?.updatedAt ?? null,
    status: "draft",
    disabledReason: null,
    conductRevision: null,
    createdAt: iso(now),
    updatedAt: iso(now),
    publishedAt: null,
  };
  slice.listings[listing.id] = listing;
  audit(slice, now, who, "listing-created", { listingId: listing.id, campaignId });
  return listing.id;
}
export function saveListing(state, slice, listingId, input, who, now = Date.now()) {
  const listing = mutableListing(slice, listingId);
  requireListingManager(state, listing, who);
  const title = text(input?.title);
  const pitch = text(input?.pitch);
  if (!title || title.length > LIMITS.title)
    refuse(
      `Scrivi un titolo (massimo ${LIMITS.title} caratteri).`,
      `Write a title (${LIMITS.title} characters at most).`,
    );
  if (!pitch || pitch.length > LIMITS.pitch)
    refuse(
      `Scrivi la presentazione pubblica (massimo ${LIMITS.pitch} caratteri).`,
      `Write the public presentation (${LIMITS.pitch} characters at most).`,
    );
  if (hasExternalLink(title) || hasExternalLink(pitch))
    refuse(
      "Niente link esterni o di pagamento nel testo pubblico: condividili in privato dopo l’approvazione.",
      "No off-site or payment links in the public text: share them privately after approval.",
    );
  if (!LANGUAGES.includes(input?.language))
    refuse("Scegli la lingua del tavolo.", "Choose the table language.");
  if (!FORMATS.includes(input?.format)) refuse("Scegli il formato.", "Choose the format.");
  if (!FREQUENCIES.includes(input?.frequency))
    refuse("Scegli la frequenza.", "Choose how often you play.");
  const seats = Number(input?.seats);
  if (!Number.isInteger(seats) || seats < LIMITS.seatsMin || seats > LIMITS.seatsMax)
    refuse(
      `I posti per giocatori vanno da ${LIMITS.seatsMin} a ${LIMITS.seatsMax}.`,
      `Player seats go from ${LIMITS.seatsMin} to ${LIMITS.seatsMax}.`,
    );
  const tools = [...new Set(arrayOf(input?.tools))];
  if (tools.some((id) => !toolById(id)))
    refuse("Strumento di sicurezza sconosciuto.", "Unknown safety tool.");
  const warnings = [...new Set(arrayOf(input?.warnings))];
  if (warnings.some((id) => !topicById(id)))
    refuse("Avviso di contenuto sconosciuto.", "Unknown content warning.");
  Object.assign(listing, {
    title,
    pitch,
    language: input.language,
    format: input.format,
    frequency: input.frequency,
    seats,
    newcomers: Boolean(input.newcomers),
    mature: Boolean(input.mature),
    waitlist: Boolean(input.waitlist),
    tools,
    warnings,
    updatedAt: iso(now),
  });
  // A seat freed by a larger table lets the first person on the waitlist be reviewed.
  if (
    listing.status === "disabled" &&
    listing.disabledReason === "full" &&
    !seatInfo(state, slice, listing).full
  )
    listing.disabledReason = "full-cleared";
  audit(slice, now, who, "listing-saved", { listingId });
  return clone(listing);
}
// Publish or Enable: only with every prerequisite and the code of conduct accepted.
export function publishListing(state, slice, listingId, { conduct } = {}, who, now = Date.now()) {
  const listing = mutableListing(slice, listingId);
  requireListingManager(state, listing, who);
  // Checked on a copy: a refused publish leaves the listing untouched.
  const conductRevision = conduct ? CONDUCT_REVISION : listing.conductRevision;
  const problems = listingProblems(state, slice, { ...listing, conductRevision }, now);
  if (problems.length) {
    const names = (lang) => problems.map((p) => p[lang]).join("; ");
    refuse(
      `Prima di pubblicare manca: ${names("it")}.`,
      `Missing before publishing: ${names("en")}.`,
    );
  }
  const first = !listing.publishedAt;
  listing.conductRevision = conductRevision;
  listing.status = "live";
  listing.disabledReason = null;
  listing.publishedAt ??= iso(now);
  listing.updatedAt = iso(now);
  audit(slice, now, who, first ? "listing-published" : "listing-enabled", { listingId });
}
export function disableListing(state, slice, listingId, who, now = Date.now()) {
  const listing = mutableListing(slice, listingId);
  requireListingManager(state, listing, who);
  if (listing.status !== "live") refuse("L’annuncio non è attivo.", "The listing is not active.");
  listing.status = "disabled";
  listing.disabledReason = "manual";
  listing.updatedAt = iso(now);
  audit(slice, now, who, "listing-disabled", { listingId });
}
// ---------------------------------------------------------------- applications (SVC-041)

// The open application, else the latest one: an old acceptance never hides what came after.
export function myApplication(slice, listingId, who) {
  const rows = applicationsOf(slice, listingId).filter((row) => row.who === who);
  return rows.find(isOpen) ?? rows.at(-1) ?? null;
}
// Warhorn SVC-009: first in, first out; nobody reorders it.
export function waitlist(slice, listingId) {
  return applicationsOf(slice, listingId)
    .filter((row) => row.status === "waitlisted")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
export function waitlistPosition(slice, application) {
  if (application?.status !== "waitlisted") return 0;
  return waitlist(slice, application.listingId).findIndex((row) => row.id === application.id) + 1;
}
// "Sign up" becomes "Join waitlist" when the table is full or someone already waits.
export function joinsWaitlist(state, slice, listing) {
  const seats = seatInfo(state, slice, listing);
  return seats.full || seats.waiting > 0;
}
// The first person in line when they arrived before this pending application: while they
// wait, the later application cannot be accepted first (SVC-009). Null otherwise.
export function waitingAhead(slice, application) {
  if (application?.status !== "pending") return null;
  const head = waitlist(slice, application.listingId)[0];
  return head && head.createdAt.localeCompare(application.createdAt) < 0 ? head : null;
}
// Why this identity cannot apply now, or null. Also used to explain the page state.
export function applyBlocker(state, slice, listing, who, now = Date.now()) {
  if (!listing) return { it: "Annuncio non trovato.", en: "Listing not found." };
  if (canManageListing(state, listing, who) || listing.ownerId === who)
    return { it: "È il tuo annuncio.", en: "This is your listing." };
  if (listing.kind === "campaign" && memberOf(state, listing.campaignId, who))
    return { it: "Fai già parte di questa campagna.", en: "You are already in this campaign." };
  if (listingState(state, slice, listing, now) !== "live")
    return {
      it: "L’annuncio non accetta candidature in questo momento.",
      en: "The listing is not taking applications right now.",
    };
  // A block stops applications both ways (the private contact of Roll20 SVC-149). The
  // owner's block is never named to the blocked person; one's own block is explained.
  if (hasBlocked(slice, who, listing.ownerId))
    return {
      it: "Hai bloccato chi ha pubblicato l’annuncio: sbloccalo per candidarti.",
      en: "You blocked who published this listing: unblock them to apply.",
    };
  if (hasBlocked(slice, listing.ownerId, who))
    return {
      it: "Questo annuncio non accetta la tua candidatura.",
      en: "This listing does not accept your application.",
    };
  const mine = myApplication(slice, listing.id, who);
  if (isOpen(mine))
    return {
      it: "Hai già una candidatura aperta per questo annuncio.",
      en: "You already have an open application for this listing.",
    };
  if (
    mine?.status === "approved" &&
    listing.kind === "campaign" &&
    inviteStatus(state, listing, mine) === "pending"
  )
    return {
      it: "Sei già stato accettato: accetta l’invito in Campagne.",
      en: "You were already accepted: accept the invitation in Campaigns.",
    };
  const seats = seatInfo(state, slice, listing);
  if (seats.full && !listing.waitlist)
    return { it: "Il tavolo è completo.", en: "The table is full." };
  return null;
}
function cleanMessage(value) {
  const message = text(value);
  if (!message || message.length > LIMITS.message)
    refuse(
      `Scrivi un messaggio per il DM (massimo ${LIMITS.message} caratteri).`,
      `Write a message for the DM (${LIMITS.message} characters at most).`,
    );
  return message;
}
export function applyToListing(state, slice, listingId, input, who, now = Date.now()) {
  const listing = mutableListing(slice, listingId);
  const blocker = applyBlocker(state, slice, listing, who, now);
  if (blocker) refuse(blocker.it, blocker.en);
  const message = cleanMessage(input?.message);
  if (!input?.conduct)
    refuse(
      "Conferma di aver letto il codice di condotta.",
      "Confirm that you read the code of conduct.",
    );
  if (listing.mature && !input?.adult)
    refuse(
      "Questo tavolo è per adulti: dichiara di avere almeno 18 anni.",
      "This table is for adults: declare that you are at least 18.",
    );
  // Warhorn SVC-009: while anyone waits, a newcomer queues behind them even for a free seat.
  const application = {
    id: newId("app"),
    listingId,
    who,
    message,
    status: joinsWaitlist(state, slice, listing) ? "waitlisted" : "pending",
    reply: "",
    conduct: true,
    adult: Boolean(listing.mature && input?.adult),
    createdAt: iso(now),
    updatedAt: iso(now),
    decidedAt: null,
    decidedBy: null,
  };
  slice.applications.push(application);
  // Accepting the code of conduct in the application counts as accepting it (SVC-150).
  slice.conduct[who] = { revision: CONDUCT_REVISION, at: iso(now) };
  for (const invitation of slice.invitations)
    if (invitation.listingId === listingId && invitation.to === who && invitation.status === "sent")
      invitation.status = "applied";
  audit(slice, now, who, "applied", {
    listingId,
    applicationId: application.id,
    status: application.status,
  });
  return clone(application);
}
function ownApplication(slice, applicationId, who) {
  const application = slice.applications.find((row) => row.id === applicationId);
  if (!application || application.who !== who)
    refuse("Candidatura non trovata.", "Application not found.");
  if (!isOpen(application))
    refuse("La candidatura non è più aperta.", "The application is no longer open.");
  return application;
}
// Kanka: the applicant edits or cancels the message while it waits.
export function editApplication(state, slice, applicationId, input, who, now = Date.now()) {
  const application = ownApplication(slice, applicationId, who);
  application.message = cleanMessage(input?.message);
  application.updatedAt = iso(now);
  audit(slice, now, who, "application-edited", { applicationId });
  return clone(application);
}
export function withdrawApplication(state, slice, applicationId, who, now = Date.now()) {
  const application = ownApplication(slice, applicationId, who);
  const wasWaiting = application.status === "waitlisted";
  application.status = "withdrawn";
  application.decidedAt = iso(now);
  application.decidedBy = who;
  audit(slice, now, who, wasWaiting ? "waitlist-left" : "application-withdrawn", { applicationId });
}
// The DM answers every application: approve (a seat must be free; from the waitlist
// only the first in line) or decline, each with an optional reply.
export function decideApplication(state, slice, applicationId, decision, who, now = Date.now()) {
  const application = slice.applications.find((row) => row.id === applicationId);
  if (!application || !isOpen(application))
    refuse("La candidatura non è più in attesa.", "The application is no longer waiting.");
  const listing = mutableListing(slice, application.listingId);
  requireListingManager(state, listing, who);
  const reply = text(decision?.reply);
  if (reply.length > LIMITS.reply)
    refuse(
      `La risposta supera i ${LIMITS.reply} caratteri.`,
      `The reply is longer than ${LIMITS.reply} characters.`,
    );
  if (decision?.approve) {
    // B13 admits nobody to an archived or deleted campaign; declining with a reply stays.
    if (!campaignActive(state, listing.campaignId))
      refuse(
        "La campagna è archiviata o eliminata: ripristinala in Campagne per accettare, oppure non accettare con una risposta.",
        "The campaign is archived or deleted: restore it in Campaigns to accept, or decline with a reply.",
      );
    const seats = seatInfo(state, slice, listing);
    if (seats.full)
      refuse(
        `Il tavolo è completo (${seats.filled}/${seats.seats}): aumenta i posti o rifiuta.`,
        `The table is full (${seats.filled}/${seats.seats}): add seats or decline.`,
      );
    if (
      application.status === "waitlisted" &&
      waitlist(slice, listing.id)[0]?.id !== application.id
    )
      refuse(
        "La lista d’attesa segue l’ordine d’arrivo: prima decidi chi è in testa.",
        "The waitlist keeps arrival order: decide on the first person in line first.",
      );
    if (waitingAhead(slice, application))
      refuse(
        "Chi è primo in lista d’attesa è arrivato prima: decidi prima sulla sua candidatura.",
        "The first person on the waitlist arrived earlier: decide on them first.",
      );
    if (hasBlocked(slice, who, application.who))
      refuse(
        "Hai bloccato questa persona: sbloccala per accettarla.",
        "You blocked this person: unblock them to accept.",
      );
    if (memberOf(state, listing.campaignId, application.who))
      refuse(
        "Questa persona fa già parte della campagna.",
        "This person is already in the campaign.",
      );
    if (isIdentity(application.who)) {
      // Roll20 LFG: the GM invites the applicant, who then joins with a character (B13).
      const invite = inviteIdentity(
        state,
        listing.campaignId,
        { to: application.who, role: "player" },
        who,
        now,
      );
      application.inviteId = invite.id;
      application.inviteCode = invite.code;
    } else {
      // Kanka: an approved application makes the person a member. A simulated person has
      // no sheet here, so they join as a player without an assigned character, recorded
      // by B13 like any other join (date, audit, organize flags).
      admitMember(
        state,
        listing.campaignId,
        {
          id: application.who,
          name: personLabel(state, slice, application.who),
          via: application.id,
        },
        who,
        now,
      );
    }
    application.status = "approved";
  } else application.status = "declined";
  application.reply = reply;
  application.decidedAt = iso(now);
  application.decidedBy = who;
  // Roll20 SVC-067: without a waitlist the listing turns off by itself once full.
  if (
    application.status === "approved" &&
    !listing.waitlist &&
    seatInfo(state, slice, listing).full
  ) {
    listing.status = "disabled";
    listing.disabledReason = "full";
    listing.updatedAt = iso(now);
  }
  audit(slice, now, who, `application-${application.status}`, {
    applicationId,
    listingId: listing.id,
  });
  return clone(application);
}
// Rows of the DM's queue: pending first (arrival order), then the waitlist in order.
// Applications from people the manager blocked stay (posts in one's own game and LFG are
// the SVC-149 exceptions), marked so the manager can decline or unblock.
export function queueFor(state, slice, listingId, who) {
  const listing = slice?.listings?.[listingId];
  if (!canManageListing(state, listing, who)) return { pending: [], waitlist: [], decided: [] };
  const blocked = blockedBy(slice, who);
  const mark = (row) => ({ ...row, blocked: blocked.includes(row.who) });
  const rows = applicationsOf(slice, listingId);
  return {
    pending: rows
      .filter((row) => row.status === "pending")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(mark),
    waitlist: waitlist(slice, listingId).map(mark),
    // "closed": applications closed by a block before this rule changed (older data).
    decided: rows
      .filter((row) => ["approved", "declined", "closed"].includes(row.status))
      .sort((a, b) => String(b.decidedAt).localeCompare(String(a.decidedAt)))
      .map(mark),
  };
}
export function applicationsFor(slice, who) {
  return arrayOf(slice?.applications)
    .filter((row) => row.who === who)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
// What an approved identity sees next: the B13 invitation, then membership.
export function approvalStage(state, slice, application) {
  const listing = slice?.listings?.[application?.listingId];
  if (application?.status !== "approved" || !listing || listing.kind !== "campaign") return null;
  if (memberOf(state, listing.campaignId, application.who)) return "joined";
  const status = inviteStatus(state, listing, application);
  return status === "pending" ? "invited" : status ? `invite-${status}` : "approved";
}

// ---------------------------------------------------------------- blocks and reports

export function blockPerson(state, slice, who, personId, now = Date.now()) {
  if (!personId || personId === who) refuse("Scegli chi bloccare.", "Choose who to block.");
  if (!slice.people?.[personId] && !isIdentity(personId))
    refuse("Persona sconosciuta.", "Unknown person.");
  if (hasBlocked(slice, who, personId))
    refuse("Hai già bloccato questa persona.", "You already blocked this person.");
  // Roll20 SVC-149: new private contact stops (applyBlocker, inviteToApply, invitationsFor);
  // nothing already received is closed or hidden, and nobody is told.
  slice.blocks[who] = [...arrayOf(slice.blocks[who]), { personId, at: iso(now) }];
  audit(slice, now, who, "blocked", { personId });
}
export function unblockPerson(state, slice, who, personId, now = Date.now()) {
  if (!hasBlocked(slice, who, personId))
    refuse("Questa persona non è bloccata.", "This person is not blocked.");
  slice.blocks[who] = arrayOf(slice.blocks[who]).filter((row) => row.personId !== personId);
  audit(slice, now, who, "unblocked", { personId });
}
// DDB-157 screenshot: an optional image read in this browser, re-checked here like a media
// upload (type, first bytes, size) and within the images budget of all reports.
function cleanScreenshot(slice, value) {
  if (value === undefined || value === null || value === "") return null;
  const src = String(value?.src ?? "");
  const mime = src.slice(5, src.indexOf(";"));
  let head = null;
  try {
    const b64 = src.slice(src.indexOf(",") + 1, src.indexOf(",") + 25);
    head = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    head = null;
  }
  const bytes = isDataUrl(src) ? dataBytes(src) : 0;
  if (
    !IMAGE_TYPES.includes(mime) ||
    !bytes ||
    bytes > LIMITS.screenshot ||
    !head ||
    sniff(head) !== mime
  )
    refuse(
      "Allega un’immagine PNG, JPEG o WebP di massimo 500 KB, oppure togli l’allegato.",
      "Attach a PNG, JPEG or WebP image up to 500 KB, or remove the attachment.",
    );
  const used = arrayOf(slice.reports).reduce(
    (sum, row) => sum + (isDataUrl(row.screenshot?.src) ? dataBytes(row.screenshot.src) : 0),
    0,
  );
  if (used + bytes > LIMITS.screenshots)
    refuse(
      "Le immagini delle segnalazioni di questo browser superano i 500 KB in tutto: invia la segnalazione senza immagine.",
      "The report images of this browser exceed 500 KB in total: send the report without an image.",
    );
  return { src, name: text(value?.name).slice(0, LIMITS.screenshotName) };
}
// Roll20 SVC-148 / DDB-157: a reason, a description and an optional screenshot; staff do
// not disclose outcomes.
// Simulation: the report stays in this browser and is visible only to its author.
export function reportContent(state, slice, who, input, now = Date.now()) {
  const targetId = text(input?.targetId);
  const known = (id) => Boolean(slice.people?.[id]) || isIdentity(id);
  const exists = {
    listing: () => Boolean(slice.listings?.[targetId]),
    person: () => known(targetId) && targetId !== who,
    application: () => slice.applications.some((row) => row.id === targetId),
    "public-page": () => Boolean(coreCampaign(state, targetId)),
  }[input?.kind];
  if (!exists || !targetId) refuse("Scegli cosa segnalare.", "Choose what to report.");
  if (!exists() || (text(input.personId) && !known(text(input.personId))))
    refuse("Ciò che vuoi segnalare non esiste più.", "What you want to report no longer exists.");
  if (!REPORT_REASONS.some((row) => row.id === input?.reason))
    refuse("Scegli un motivo.", "Choose a reason.");
  const details = text(input?.details);
  if (details.length > LIMITS.report)
    refuse(
      `La descrizione supera i ${LIMITS.report} caratteri.`,
      `The description is longer than ${LIMITS.report} characters.`,
    );
  if (input.reason === "other" && !details)
    refuse("Descrivi il problema.", "Describe the problem.");
  if (
    slice.reports.some(
      (row) =>
        row.by === who &&
        row.kind === input.kind &&
        row.targetId === targetId &&
        row.reason === input.reason,
    )
  )
    refuse("Hai già inviato questa segnalazione.", "You already sent this report.");
  const screenshot = cleanScreenshot(slice, input.screenshot);
  const report = {
    id: newId("report"),
    by: who,
    kind: input.kind,
    targetId,
    personId: text(input.personId) || (input.kind === "person" ? targetId : null),
    reason: input.reason,
    details,
    ...(screenshot ? { screenshot } : {}),
    at: iso(now),
    status: "received",
  };
  slice.reports.push(report);
  audit(slice, now, who, "reported", { kind: report.kind });
  return clone(report);
}
export const reportsBy = (slice, who) =>
  arrayOf(slice?.reports)
    .filter((row) => row.by === who)
    .sort((a, b) => b.at.localeCompare(a.at));

// ---------------------------------------------------------------- code of conduct

export function acceptConduct(state, slice, who, now = Date.now()) {
  slice.conduct[who] = { revision: CONDUCT_REVISION, at: iso(now) };
}
export const conductAccepted = (slice, who) => slice?.conduct?.[who]?.revision === CONDUCT_REVISION;

// ---------------------------------------------------------------- player directory (R20-006)

export function setDirectoryEntry(state, slice, who, input, now = Date.now()) {
  if (!isIdentity(who)) refuse("Identità non valida.", "Invalid identity.");
  const format = ["any", ...FORMATS].includes(input?.format) ? input.format : null;
  if (!format) refuse("Scegli il formato che cerchi.", "Choose the format you look for.");
  if (!LANGUAGES.includes(input?.language)) refuse("Scegli la lingua.", "Choose the language.");
  const availability = text(input?.availability);
  const intro = text(input?.intro);
  if (!availability || availability.length > LIMITS.availability)
    refuse(
      `Indica quando puoi giocare (massimo ${LIMITS.availability} caratteri).`,
      `Say when you can play (${LIMITS.availability} characters at most).`,
    );
  if (intro.length > LIMITS.intro)
    refuse(
      `La presentazione supera i ${LIMITS.intro} caratteri.`,
      `The introduction is longer than ${LIMITS.intro} characters.`,
    );
  if (hasExternalLink(availability) || hasExternalLink(intro))
    refuse(
      "Niente link esterni nell’elenco pubblico.",
      "No off-site links in the public directory.",
    );
  slice.directory[who] = {
    active: true,
    format,
    language: input.language,
    availability,
    intro,
    updatedAt: iso(now),
  };
  audit(slice, now, who, "directory-listed");
  return clone(slice.directory[who]);
}
export function leaveDirectory(state, slice, who, now = Date.now()) {
  if (!slice.directory[who]?.active)
    refuse("Non sei nell’elenco.", "You are not in the directory.");
  slice.directory[who] = { ...slice.directory[who], active: false, updatedAt: iso(now) };
  audit(slice, now, who, "directory-left");
}
// Directory rows stay visible after a block (LFG posts, SVC-149), marked `blocked`.
export function directoryFor(state, slice, who, filters = {}) {
  const blocked = blockedBy(slice, who);
  return Object.entries(objectOf(slice?.directory))
    .filter(([id, row]) => row?.active && id !== who)
    .filter(
      ([, row]) =>
        !filters.language || filters.language === "any" || row.language === filters.language,
    )
    .map(([id, row]) => ({ id, ...clone(row), blocked: blocked.includes(id) }))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
// The Roll20 private message becomes an invitation to apply to one live listing.
export function inviteToApply(state, slice, listingId, personId, who, now = Date.now()) {
  const listing = mutableListing(slice, listingId);
  requireListingManager(state, listing, who);
  if (!slice.directory?.[personId]?.active)
    refuse("Questa persona non è più nell’elenco.", "This person is no longer in the directory.");
  // One's own block is explained; the other person's block is not revealed: the invitation
  // is recorded but never reaches them (invitationsFor), like a blocked private message.
  if (hasBlocked(slice, who, personId))
    refuse(
      "Hai bloccato questa persona: sbloccala per invitarla.",
      "You blocked this person: unblock them to invite.",
    );
  if (listingState(state, slice, listing, now) !== "live")
    refuse("Pubblica l’annuncio prima di invitare.", "Publish the listing before inviting.");
  if (memberOf(state, listing.campaignId, personId))
    refuse(
      "Questa persona fa già parte della campagna.",
      "This person is already in the campaign.",
    );
  const application = myApplication(slice, listingId, personId);
  if (isOpen(application))
    refuse("Questa persona si è già candidata.", "This person already applied.");
  // Accepted and still holding the B13 invitation: nothing left to apply for.
  if (approvalStage(state, slice, application) === "invited")
    refuse(
      "Questa persona è già stata accettata: l’invito alla campagna aspetta la sua risposta.",
      "This person was already accepted: the campaign invitation awaits their answer.",
    );
  if (
    slice.invitations.some(
      (row) => row.listingId === listingId && row.to === personId && row.status === "sent",
    )
  )
    refuse("Hai già invitato questa persona.", "You already invited this person.");
  const invitation = {
    id: newId("ask"),
    listingId,
    to: personId,
    by: who,
    at: iso(now),
    status: "sent",
  };
  slice.invitations.push(invitation);
  audit(slice, now, who, "invited-to-apply", { listingId, personId });
  return clone(invitation);
}
export function dismissInvitation(state, slice, invitationId, who, now = Date.now()) {
  const invitation = slice.invitations.find((row) => row.id === invitationId && row.to === who);
  if (!invitation || invitation.status !== "sent")
    refuse("Invito non più attivo.", "Invitation no longer active.");
  invitation.status = "dismissed";
  invitation.answeredAt = iso(now);
}
// A block either way stops invitations to apply (SVC-149 private contact).
export const invitationsFor = (slice, who) =>
  arrayOf(slice?.invitations).filter(
    (row) =>
      row.to === who &&
      row.status === "sent" &&
      !hasBlocked(slice, who, row.by) &&
      !hasBlocked(slice, row.by, who),
  );

// ---------------------------------------------------------------- public page (CA-07)

// Visitors read only what every member reads (Roll20 SVC-032): entries shared with the
// whole campaign, and in them only the sections shared with the whole campaign. Only a
// DM or co-DM's own entries qualify: in campaign-content only the owner changes who reads
// an entry, so a player's entry never goes beyond the audience its author chose.
function campaignWide(access) {
  return access?.mode === "campaign";
}
export function publicEligibleEntries(state, campaignId) {
  return arrayOf(state?.campaignContent?.entries)
    .filter(
      (entry) =>
        entry.campaignId === campaignId &&
        entry.kind !== "note" &&
        campaignWide(entry.access) &&
        canManage(state, campaignId, entry.ownerId),
    )
    .map((entry) => {
      const revision = entry.revisions?.find((row) => row.id === entry.currentRevisionId);
      return revision ? { entry, data: revision.data } : null;
    })
    .filter(Boolean)
    .map(({ entry, data }) => ({
      id: entry.id,
      kind: entry.kind,
      ownerId: entry.ownerId,
      title: text(data.title),
      body: String(data.body ?? ""),
      sections: arrayOf(data.sections)
        .filter((section) => campaignWide(section.access ?? entry.access))
        .map((section) => ({
          id: section.id,
          title: String(section.title ?? ""),
          body: String(section.body ?? ""),
        })),
      updatedAt: revisionTime(entry),
    }))
    .concat(publicArchivePages(state, campaignId));
}
// P10 CA-07 (LegendKeeper public pages, Kanka public role): Archive pages (quests, people,
// places… of B43) that every party member can read are publishable too. Only what the
// whole group reads goes out: text blocks, secrets revealed to everyone, public properties;
// a hidden quest or a page for some characters only never does.
function publicArchivePages(state, campaignId) {
  const pages = arrayOf(state?.ext?.quests?.campaigns?.[campaignId]?.pages);
  return pages
    .filter(
      (page) =>
        page &&
        typeof page.id === "string" &&
        page.access?.mode === "all" &&
        !(page.type === "quest" && page.status === "hidden"),
    )
    .map((page) => ({
      id: `archive:${page.id}`,
      kind: "archive",
      ownerId: null,
      title: text(page.title),
      body: arrayOf(page.blocks)
        .filter((block) => block?.kind === "text" || block?.reveal?.mode === "all")
        .map((block) => String(block.text ?? ""))
        .join("\n\n"),
      sections: arrayOf(page.properties)
        .filter((property) => property && !property.secret && String(property.value ?? "").trim())
        .map((property) => ({
          id: String(property.id ?? ""),
          title: String(property.label ?? property.name ?? ""),
          body: String(property.value ?? ""),
        })),
      updatedAt: typeof page.updatedAt === "string" ? page.updatedAt : null,
    }));
}
function revisionTime(entry) {
  return entry.revisions?.find((row) => row.id === entry.currentRevisionId)?.createdAt ?? null;
}
export function publicPageOf(slice, campaignId) {
  const page = slice?.publicPages?.[campaignId];
  return {
    enabled: page?.enabled === true,
    entryIds: arrayOf(page?.entryIds),
    updatedAt: page?.updatedAt ?? null,
  };
}
export function setPublicPage(state, slice, campaignId, input, who, now = Date.now()) {
  if (!canManage(state, campaignId, who))
    refuse(
      "Solo il DM o un co-DM gestisce la pagina pubblica.",
      "Only the DM or a co-DM manages the public page.",
    );
  const eligible = new Set(publicEligibleEntries(state, campaignId).map((row) => row.id));
  const entryIds = [...new Set(arrayOf(input?.entryIds))];
  if (entryIds.some((id) => !eligible.has(id)))
    refuse(
      "Nella pagina pubblica vanno solo voci di un DM o co-DM condivise con tutta la campagna.",
      "Only a DM or co-DM’s entries shared with the whole campaign can go on the public page.",
    );
  slice.publicPages[campaignId] = {
    enabled: Boolean(input?.enabled),
    entryIds,
    updatedAt: iso(now),
  };
  audit(slice, now, who, "public-page", {
    campaignId,
    enabled: Boolean(input?.enabled),
    entries: entryIds.length,
  });
  return publicPageOf(slice, campaignId);
}
// What a visitor reads. Chosen entries that are no longer campaign-wide drop out.
export function publicPageView(state, slice, campaignId) {
  const page = publicPageOf(slice, campaignId);
  const eligible = publicEligibleEntries(state, campaignId);
  const entries = page.entryIds.map((id) => eligible.find((row) => row.id === id)).filter(Boolean);
  const meta = metaOf(state, campaignId);
  const listing = listingForCampaign(slice, campaignId);
  return {
    campaignId,
    enabled: page.enabled && Boolean(meta) && meta.status === "active",
    name: campaignName(state, campaignId),
    description: text(meta?.description),
    image: meta?.image ?? null,
    rules: clone(RULES),
    listingId: listing && listingState(state, slice, listing) === "live" ? listing.id : null,
    entries,
    dropped: page.entryIds.length - entries.length,
  };
}
// Kanka SVC-042: a public page with nothing public shows a warning with its fix.
export const publicPageEmpty = (state, slice, campaignId) =>
  publicPageOf(slice, campaignId).enabled &&
  publicPageView(state, slice, campaignId).entries.length === 0;

// ---------------------------------------------------------------- notifications

// Kanka SVC-153: the applicant hears the decision with the reply; the DM hears of new
// applications and of the first person on a waitlist when a seat frees.
export function noticesFor(state, slice, who, now = Date.now()) {
  const items = [];
  for (const application of applicationsFor(slice, who)) {
    if (!["approved", "declined"].includes(application.status)) continue;
    const listing = slice.listings[application.listingId];
    items.push({
      key: `decision:${application.id}:${application.status}`,
      kind: application.status,
      listingId: application.listingId,
      title: listing?.title ?? "",
      from: application.decidedBy,
      reply: application.reply,
      at: application.decidedAt,
    });
  }
  for (const invitation of invitationsFor(slice, who)) {
    const listing = slice.listings[invitation.listingId];
    items.push({
      key: `ask:${invitation.id}`,
      kind: "ask",
      listingId: invitation.listingId,
      title: listing?.title ?? "",
      from: invitation.by,
      at: invitation.at,
    });
  }
  // Only queues the manager can open (managedCampaigns): an archived campaign's listing
  // keeps its application notices until they are answered, never a "seat free" one, since
  // nobody can be accepted before the campaign is restored.
  for (const campaign of managedCampaigns(state, slice, who, now)) {
    const listing = listingForCampaign(slice, campaign.id);
    if (!listing) continue;
    const queue = queueFor(state, slice, listing.id, who);
    for (const application of queue.pending)
      items.push({
        key: `application:${application.id}`,
        kind: "application",
        listingId: listing.id,
        title: listing.title,
        from: application.who,
        at: application.createdAt,
      });
    const head = queue.waitlist[0];
    if (head && campaign.status === "active" && !seatInfo(state, slice, listing).full)
      items.push({
        key: `waitlist:${head.id}`,
        kind: "waitlist",
        listingId: listing.id,
        title: listing.title,
        from: head.who,
        at: head.createdAt,
      });
  }
  return items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export { SAFETY_TOOLS, SAFETY_TOPICS, topicById, toolById, canManage, memberOf };
