// B55 — Simulated external integrations: pure domain, no DOM and no app imports.
//
// Every integration here is a DECLARED SIMULATION: nothing leaves the browser, no network
// call is made, every address uses the reserved `.example` domain (RFC 2606) and each real
// connection stays subject to an owner decision (GAP-17). Adopted patterns (census IDs in
// changes/interview-01/blueprint-integrations-evidence.md):
// - Foundry to Discord / Discord relay modules (SVC-121) and Owlbear Clash!/Rumble! webhooks
//   (VTL-225): paste a Discord webhook URL, mirror public rolls and game events, `/dnote`
//   timestamped notes, deletions synced (here: a note retracted with a reason).
// - Avrae `!campaign <url>` (SVC-116, DDB-195): the DM links a channel; linked channels are
//   listed and can be removed; public rolls appear there.
// - Sesh `/link` iCal feed (SVC-065) and opt-in reminders (SVC-064, kept in B24 settings).
// - «Aggiungi al calendario» (Eventbrite, AddEvent; owner request 01/10/2026): the one
//   exception to the reserved addresses. Its Google, Outlook, Microsoft 365 and Yahoo links
//   (calendar-export.mjs) are real: a person's own click opens that service in a new tab with
//   the session filled in, and saving there is theirs. Nothing is sent without that click.
// - Owlbear Sheet from Beyond / External Links (VTL-034): a sheet URL on a token, opened in
//   a new tab; nothing is imported.
// - Avrae `!import` / `!update` (DDB-194): a documented source format, preview, then import;
//   an update refreshes sheet numbers and keeps what the app owns.
// - Kanka API personal access tokens and campaign webhooks (CMP-213; DiceCloud API CMP-09).
// - Foundry Manage Modules per world with dependency prompts (FVT-197) and Owlbear
//   extensions switched on per room (VTL-206, SVC-135): here only integrated functions.

import { LABEL_PREFIX, parseFreeRoll, rollKindName } from "./chat-domain.mjs";
import { campaignMembers, isCampaignMember, listCampaignEntries } from "./campaign-content.mjs";
import { canControlActor, canViewActor, isCampaignActor } from "./character-access.mjs";
import { sampleDate } from "./sample-clock.mjs";
import * as CE from "./calendar-export.mjs";

export const ID = "integrations";
export const VERSION = 1;
export const HOST = "d20-studio.example"; // RFC 2606 reserved: never resolves
export const MAX_NOTE = 500;
export const MAX_REASON = 200;
export const MAX_URL = 500;
export const MAX_NAME = 60;
export const MAX_TEMPLATE = 300;
export const MAX_IMPORT_BYTES = 64 * 1024;
export const PREVIEW_LIMIT = 40;
export const HISTORY_LIMIT = 60;
// Every commit label of this area starts with this prefix, so the relay never mirrors the
// area's own configuration changes as game events (like B17's "Chat · ").
export const LABEL_PREFIXES = Object.freeze({ it: "Integrazioni · ", en: "Integrations · " });
const ownLabel = (label) =>
  label.startsWith(LABEL_PREFIX) ||
  label.startsWith(LABEL_PREFIXES.it) ||
  label.startsWith(LABEL_PREFIXES.en);

const L = (it, en) => Object.freeze({ it, en });
const isGap = (gap) =>
  isObject(gap) &&
  (gap.from === null || typeof gap.from === "string") &&
  (gap.to === null || typeof gap.to === "string");
/** Whether an instant falls inside one of these half-open periods [from, to). */
const inGap = (gaps, at) =>
  list(gaps).some(
    (gap) => (gap.from === null || at >= gap.from) && (gap.to === null || at < gap.to),
  );
const pick = (value, lang = "it") =>
  value && typeof value === "object" ? (value[lang] ?? value.it ?? "") : String(value ?? "");
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value : []);
const iso = (now) => new Date(now).toISOString();
const clean = (value, max) =>
  String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .trim()
    .slice(0, max);
const randomId = (prefix) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

/** A refusal with both languages, like the rest of the app. */
export function refuse(it, en) {
  throw Object.assign(new Error(en), { it, en });
}

// ---------------------------------------------------------------- modules (FVT-197, VTL-206)

const mod = (id, label, description, requires, patterns, enabled) =>
  Object.freeze({ id, label, description, requires, patterns, enabled });
export const MODULES = Object.freeze([
  mod(
    "relay",
    L("Inoltro a Discord", "Discord relay"),
    L(
      "Copia tiri pubblici e avvisi in un canale Discord tramite webhook.",
      "Mirrors public rolls and notices to a Discord channel through a webhook.",
    ),
    [],
    ["SVC-121", "VTL-225"],
    true,
  ),
  mod(
    "avrae",
    L("Collegamento Avrae", "Avrae link"),
    L(
      "Collega canali con il comando !campaign; usa le regole dell’inoltro (solo tiri pubblici).",
      "Links channels with the !campaign command; follows the relay rules (public rolls only).",
    ),
    ["relay"],
    ["SVC-116", "DDB-195"],
    true,
  ),
  mod(
    "calendar",
    L("Calendario e promemoria", "Calendar and reminders"),
    L(
      "File .ics della prossima sessione, feed personale e promemoria nell’app.",
      "Next session .ics file, personal feed and in-app reminders.",
    ),
    [],
    ["SVC-065", "SVC-064"],
    true,
  ),
  mod(
    "sheets",
    L("Schede esterne sulle pedine", "External sheets on tokens"),
    L(
      "Un link a una scheda su un altro sito, aperto in una nuova scheda del browser.",
      "A link to a sheet on another site, opened in a new browser tab.",
    ),
    [],
    ["VTL-034"],
    true,
  ),
  mod(
    "import",
    L("Import da formato documentato", "Import from a documented format"),
    L(
      "Crea o aggiorna un personaggio da un foglio con formato pubblicato.",
      "Creates or updates a character from a sheet in a published format.",
    ),
    [],
    ["DDB-194"],
    true,
  ),
  mod(
    "api",
    L("API e webhook", "API and webhooks"),
    L(
      "Token personali per l’API e webhook della campagna.",
      "Personal API tokens and campaign webhooks.",
    ),
    [],
    ["CMP-213", "CMP-09"],
    false,
  ),
]);
export const MODULE_IDS = MODULES.map((m) => m.id);
export const moduleOf = (id) => MODULES.find((m) => m.id === id) ?? null;

// SV-42 (delegated simulation, I-233): the app's optional feature areas beside the
// integrations, switched per campaign like Foundry's Manage Modules (FVT-197) and Owlbear's
// room extensions (VTL-206). Only functions integrated in this app, never third-party code.
// A switched-off area disappears for everyone in that campaign (the registry's module gate:
// sections, commands, panels, token-menu entries, sheet tabs); its data stays saved and
// comes back when it is switched on. Areas the game, safety or data need are protected.
const feature = (id, label, description, requires = []) =>
  Object.freeze({ id, label, description, requires: Object.freeze(requires) });
export const FEATURE_AREAS = Object.freeze([
  feature(
    "random-tables",
    L("Tabelle casuali e mazzi di carte", "Random tables and card decks"),
    L(
      "Tabelle da tirare, mazzi da mescolare e pescare, modelli di testo.",
      "Tables to roll on, decks to shuffle and draw, text templates.",
    ),
  ),
  feature(
    "handouts",
    L("Dispense e spilli", "Handouts and pins"),
    L(
      "Lettere, immagini e spilli sulla mappa da mostrare ai giocatori.",
      "Letters, pictures and map pins to show the players.",
    ),
  ),
  feature(
    "media",
    L("Materiali multimediali", "Media"),
    L("Immagini e audio della campagna.", "The campaign's pictures and audio."),
  ),
  feature(
    "loot",
    L("Tesori, bottino e mercanti", "Treasure, loot and merchants"),
    L(
      "Pacchetti di bottino, scorta del gruppo e botteghe.",
      "Loot parcels, the party stash and shops.",
    ),
  ),
  feature(
    "quests",
    L("Missioni, fazioni e archivio", "Quests, factions and archive"),
    L(
      "Pagine tipizzate dell’archivio, missioni e reputazione con le fazioni.",
      "Typed archive pages, quests and faction reputation.",
    ),
  ),
  feature(
    "relations-graph",
    L("Grafo delle relazioni", "Relationship graph"),
    L(
      "Chi conosce chi, tra personaggi, PNG e fazioni dell’archivio.",
      "Who knows whom among characters, NPCs and archive factions.",
    ),
    ["quests"],
  ),
  feature(
    "world-map",
    L("Mappa del mondo e calendario", "World map and calendar"),
    L("Mappa del mondo, calendario e cronologia.", "World map, calendar and timeline."),
  ),
  feature(
    "travel",
    L("Viaggio ed esplorazione", "Travel and exploration"),
    L("Ritmo di viaggio, turni di guardia e accampamento.", "Travel pace, watches and camping."),
  ),
  feature(
    "projects",
    L("Progetti e fabbricazione", "Projects and crafting"),
    L(
      "Progetti di tempo libero, ricette e progressioni non di classe.",
      "Downtime projects, recipes and non-class progressions.",
    ),
  ),
  feature(
    "generators",
    L("Generatori", "Generators"),
    L(
      "Nomi, incontri e tesori proposti per il DM.",
      "Names, encounters and treasure suggested for the DM.",
    ),
  ),
  feature(
    "sessions-plus",
    L("Ricorrenza e presenze delle sessioni", "Session recurrence and attendance"),
    L(
      "Sessioni ricorrenti, assenze annunciate, posti e presenze.",
      "Recurring sessions, announced absences, seats and attendance.",
    ),
  ),
  feature(
    "annotations",
    L("Disegni e annotazioni sulla mappa", "Map drawings and annotations"),
    L(
      "Disegni, sagome persistenti e segnali sulla mappa.",
      "Drawings, persistent templates and pings on the map.",
    ),
  ),
  feature(
    "dice-3d",
    L("Dadi animati", "Animated dice"),
    L(
      "I tiri digitali rotolano sullo schermo; senza, il risultato resta nel registro.",
      "Digital rolls tumble on screen; without it the result stays in the log.",
    ),
  ),
  feature(
    "community",
    L("Tavoli pubblici", "Public tables"),
    L(
      "Annunci del tavolo, ricerca di gruppo e moderazione.",
      "Table listings, group finder and moderation.",
    ),
  ),
  feature(
    "assistant",
    L("Assistente (simulazione)", "Assistant (simulation)"),
    L(
      "Risposte con citazioni dalle voci che puoi leggere.",
      "Answers citing the entries you can read.",
    ),
  ),
]);
export const FEATURE_AREA_IDS = Object.freeze(FEATURE_AREAS.map((area) => area.id));
export const featureOf = (id) => FEATURE_AREAS.find((area) => area.id === id) ?? null;
/** Whether a feature area is on in the campaign (every area starts on). */
export const areaOn = (slice, cid, id) =>
  !FEATURE_AREA_IDS.includes(id) || campaignOf(slice, cid).areas?.[id] !== false;
/** The feature areas switched off in the campaign: what the registry's module gate hides. */
export const disabledAreas = (slice, cid) =>
  FEATURE_AREA_IDS.filter((id) => campaignOf(slice, cid).areas?.[id] === false);
/** The same dependency prompt as the integration modules, for feature areas. Pure. */
export function areaDependencyChanges(areas, id, on) {
  const out = new Set();
  const visit = (current) => {
    const def = featureOf(current);
    if (!def) return;
    if (on)
      for (const req of def.requires)
        if (areas[req] === false && !out.has(req)) {
          out.add(req);
          visit(req);
        }
    if (!on)
      for (const other of FEATURE_AREAS)
        if (other.requires.includes(current) && areas[other.id] !== false && !out.has(other.id)) {
          out.add(other.id);
          visit(other.id);
        }
  };
  visit(id);
  return [...out];
}

export const RELAY_EVENTS = Object.freeze([
  { id: "rolls", label: L("Tiri pubblici", "Public rolls"), default: true },
  { id: "log", label: L("Eventi del registro di gioco", "Game log events"), default: true },
  { id: "sessions", label: L("Avvisi delle sessioni", "Session notices"), default: true },
  {
    id: "journal",
    label: L("Nuove voci condivise con tutti", "New entries shared with everyone"),
    default: false,
  },
]);
export const WEBHOOK_EVENTS = Object.freeze([
  { id: "journal", label: L("Voce condivisa con tutti", "Entry shared with everyone") },
  { id: "sessions", label: L("Sessione programmata o cambiata", "Session scheduled or changed") },
]);
export const WEBHOOK_FORMATS = Object.freeze([
  { id: "json", label: L("JSON", "JSON") },
  { id: "discord", label: L("Messaggio Discord", "Discord message") },
]);
export const ENDPOINTS = Object.freeze([
  { id: "characters", path: (cid) => `/api/1.0/campaigns/${cid}/characters` },
  { id: "sessions", path: (cid) => `/api/1.0/campaigns/${cid}/sessions` },
  { id: "me", path: () => "/api/1.0/me/characters" },
]);
export const DURATIONS = Object.freeze([2, 3, 4, 5, 6]);

// ---------------------------------------------------------------- slice

function defaultRelay() {
  return {
    webhook: "",
    channel: "",
    events: Object.fromEntries(RELAY_EVENTS.map((e) => [e.id, e.default])),
    since: null,
    notes: [],
    // Periods when a category was switched off: nothing from them is back-filled later.
    gaps: [],
  };
}
/** Defaults for a campaign this area has not configured yet (a new B13 campaign). */
export function defaultCampaign() {
  return {
    modules: Object.fromEntries(MODULES.map((m) => [m.id, m.enabled])),
    areas: Object.fromEntries(FEATURE_AREA_IDS.map((id) => [id, true])),
    relay: defaultRelay(),
    avrae: { links: [] },
    calendar: { durationHours: 3 },
    webhooks: [],
    history: [],
  };
}
export function seedSlice() {
  const lanterns = defaultCampaign();
  lanterns.relay = {
    ...lanterns.relay,
    webhook: "https://discord.com/api/webhooks/1187400000000000001/lanterne-demo-token-0001",
    channel: "tavolo-lanterne",
    since: sampleDate("2026-09-01T00:00:00.000Z"),
  };
  return { campaigns: { lanterns }, feeds: {}, tokens: {}, sheets: {}, imports: {} };
}
function normalizeCampaign(raw) {
  const base = defaultCampaign();
  if (!isObject(raw)) return base;
  const modules = { ...base.modules };
  for (const id of MODULE_IDS)
    if (typeof raw.modules?.[id] === "boolean") modules[id] = raw.modules[id];
  const areas = { ...base.areas };
  for (const id of FEATURE_AREA_IDS)
    if (typeof raw.areas?.[id] === "boolean") areas[id] = raw.areas[id];
  const relay = isObject(raw.relay) ? raw.relay : {};
  return {
    modules,
    areas,
    relay: {
      webhook: typeof relay.webhook === "string" ? relay.webhook : "",
      channel: typeof relay.channel === "string" ? relay.channel : "",
      events: Object.fromEntries(
        RELAY_EVENTS.map((e) => [
          e.id,
          typeof relay.events?.[e.id] === "boolean" ? relay.events[e.id] : e.default,
        ]),
      ),
      since: typeof relay.since === "string" ? relay.since : null,
      notes: list(relay.notes).filter((n) => isObject(n) && typeof n.id === "string"),
      gaps: list(relay.gaps).filter(isGap),
    },
    avrae: { links: list(raw.avrae?.links).filter((l) => isObject(l) && typeof l.id === "string") },
    calendar: {
      durationHours: DURATIONS.includes(raw.calendar?.durationHours)
        ? raw.calendar.durationHours
        : 3,
    },
    webhooks: list(raw.webhooks).filter((w) => isObject(w) && typeof w.id === "string"),
    history: list(raw.history).filter((h) => isObject(h) && typeof h.id === "string"),
  };
}
export function normalizeSlice(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error(`integrations slice version ${fromVersion} is newer`);
  if (!isObject(slice)) return seedSlice();
  const campaigns = {};
  for (const [cid, raw] of Object.entries(isObject(slice.campaigns) ? slice.campaigns : {}))
    campaigns[cid] = normalizeCampaign(raw);
  const byRole = (value, check) =>
    Object.fromEntries(Object.entries(isObject(value) ? value : {}).filter(([, v]) => check(v)));
  return {
    campaigns,
    feeds: byRole(slice.feeds, (v) => isObject(v) && typeof v.token === "string"),
    tokens: byRole(slice.tokens, Array.isArray),
    sheets: byRole(slice.sheets, (v) => isObject(v) && typeof v.url === "string"),
    imports: byRole(slice.imports, (v) => isObject(v) && typeof v.sourceId === "string"),
  };
}
/** The campaign record for reading (defaults when absent; never written). */
export function campaignOf(slice, cid) {
  return slice?.campaigns?.[cid] ?? defaultCampaign();
}
/** The campaign record inside a draft slice, created on first write. */
function writable(slice, cid) {
  if (!cid) refuse("Nessuna campagna aperta.", "No campaign is open.");
  slice.campaigns ??= {};
  slice.campaigns[cid] ??= defaultCampaign();
  return slice.campaigns[cid];
}
export const moduleOn = (slice, cid, id) => campaignOf(slice, cid).modules[id] === true;
function requireDm(viewer) {
  if (viewer !== "dm")
    refuse("Solo il DM gestisce le integrazioni.", "Only the DM manages integrations.");
}
function requireModule(slice, cid, id) {
  if (!moduleOn(slice, cid, id))
    refuse(
      `Il modulo «${moduleOf(id).label.it}» è spento in questa campagna.`,
      `The “${moduleOf(id).label.en}” module is off in this campaign.`,
    );
}
function record(rec, by, now, text) {
  rec.history.push({ id: randomId("history"), at: iso(now), by, it: text.it, en: text.en });
  if (rec.history.length > HISTORY_LIMIT) rec.history.splice(0, rec.history.length - HISTORY_LIMIT);
}

// ---------------------------------------------------------------- module management

/**
 * Foundry's dependency prompt: switching `id` to `on` also needs these modules switched
 * the same way (enable missing requirements, or disable dependents). Pure.
 */
export function dependencyChanges(modules, id, on) {
  const out = new Set();
  const visit = (current) => {
    const def = moduleOf(current);
    if (!def) return;
    if (on)
      for (const req of def.requires)
        if (!modules[req] && !out.has(req)) {
          out.add(req);
          visit(req);
        }
    if (!on)
      for (const other of MODULES)
        if (other.requires.includes(current) && modules[other.id] && !out.has(other.id)) {
          out.add(other.id);
          visit(other.id);
        }
  };
  visit(id);
  return [...out];
}
/** Saves the module switches (Foundry "Save Module Settings"). */
export function saveModules(slice, cid, next, viewer, now = Date.now()) {
  requireDm(viewer);
  const rec = writable(slice, cid);
  const target = {};
  for (const m of MODULES) target[m.id] = typeof next?.[m.id] === "boolean" ? next[m.id] : false;
  for (const m of MODULES)
    for (const req of m.requires)
      if (target[m.id] && !target[req])
        refuse(
          `«${m.label.it}» richiede «${moduleOf(req).label.it}».`,
          `“${m.label.en}” requires “${moduleOf(req).label.en}”.`,
        );
  const changed = MODULES.filter((m) => rec.modules[m.id] !== target[m.id]);
  if (!changed.length) refuse("Nessuna modifica da salvare.", "No change to save.");
  for (const m of changed) {
    rec.modules[m.id] = target[m.id];
    // A relay switched on mirrors from now, never the backlog (Foundry to Discord).
    if (m.id === "relay" && target.relay) rec.relay.since = iso(now);
    record(
      rec,
      viewer,
      now,
      target[m.id]
        ? L(`Modulo attivato: ${m.label.it}`, `Module enabled: ${m.label.en}`)
        : L(`Modulo spento: ${m.label.it}`, `Module disabled: ${m.label.en}`),
    );
  }
  return changed.map((m) => m.id);
}

/**
 * One save for the whole Modules page (Foundry "Save Module Settings"): the integration
 * modules and the feature areas, each with its requirements. Returns the changed ids.
 */
export function saveFeatures(
  slice,
  cid,
  { modules = {}, areas = {} } = {},
  viewer,
  now = Date.now(),
) {
  requireDm(viewer);
  const rec = writable(slice, cid);
  rec.areas ??= Object.fromEntries(FEATURE_AREA_IDS.map((id) => [id, true]));
  const targetModules = {};
  for (const m of MODULES)
    targetModules[m.id] = typeof modules?.[m.id] === "boolean" ? modules[m.id] : rec.modules[m.id];
  const targetAreas = {};
  for (const id of FEATURE_AREA_IDS)
    targetAreas[id] = typeof areas?.[id] === "boolean" ? areas[id] : rec.areas[id] !== false;
  for (const m of MODULES)
    for (const req of m.requires)
      if (targetModules[m.id] && !targetModules[req])
        refuse(
          `«${m.label.it}» richiede «${moduleOf(req).label.it}».`,
          `“${m.label.en}” requires “${moduleOf(req).label.en}”.`,
        );
  for (const area of FEATURE_AREAS)
    for (const req of area.requires)
      if (targetAreas[area.id] && !targetAreas[req])
        refuse(
          `«${area.label.it}» richiede «${featureOf(req).label.it}».`,
          `“${area.label.en}” requires “${featureOf(req).label.en}”.`,
        );
  const changedModules = MODULES.filter((m) => rec.modules[m.id] !== targetModules[m.id]);
  const changedAreas = FEATURE_AREAS.filter(
    (area) => (rec.areas[area.id] !== false) !== targetAreas[area.id],
  );
  if (!changedModules.length && !changedAreas.length)
    refuse("Nessuna modifica da salvare.", "No change to save.");
  for (const m of changedModules) {
    rec.modules[m.id] = targetModules[m.id];
    if (m.id === "relay" && targetModules.relay) rec.relay.since = iso(now);
    record(
      rec,
      viewer,
      now,
      targetModules[m.id]
        ? L(`Modulo attivato: ${m.label.it}`, `Module enabled: ${m.label.en}`)
        : L(`Modulo spento: ${m.label.it}`, `Module disabled: ${m.label.en}`),
    );
  }
  for (const area of changedAreas) {
    rec.areas[area.id] = targetAreas[area.id];
    record(
      rec,
      viewer,
      now,
      targetAreas[area.id]
        ? L(`Funzione attivata: ${area.label.it}`, `Feature enabled: ${area.label.en}`)
        : L(
            `Funzione spenta (dati conservati): ${area.label.it}`,
            `Feature switched off (data kept): ${area.label.en}`,
          ),
    );
  }
  return [...changedModules.map((m) => m.id), ...changedAreas.map((area) => area.id)];
}

// ---------------------------------------------------------------- Discord relay (SVC-121)

const WEBHOOK_URL =
  /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/(\d{5,25})\/([A-Za-z0-9_-]{8,100})$/;
/** Shows only the webhook id and the last four characters of its secret. */
export function maskWebhook(url) {
  const match = WEBHOOK_URL.exec(String(url ?? ""));
  if (!match) return "";
  return `discord.com/api/webhooks/${match[1]}/••••${match[2].slice(-4)}`;
}
export function normalizeChannel(value) {
  return clean(value, 100).replace(/^#/, "").toLowerCase().replace(/\s+/g, "-");
}
const CHANNEL = /^[\p{Ll}\p{N}_-]{1,100}$/u;
export function saveRelay(slice, cid, input, viewer, now = Date.now()) {
  requireDm(viewer);
  requireModule(slice, cid, "relay");
  const rec = writable(slice, cid);
  const webhook = clean(input?.webhook, MAX_URL);
  const keep = webhook === "" && input?.keepWebhook === true;
  if (!keep && webhook && !WEBHOOK_URL.test(webhook))
    refuse(
      "Indirizzo del webhook non valido: copialo da Discord › Impostazioni del server › Integrazioni › Webhook.",
      "Invalid webhook address: copy it from Discord › Server Settings › Integrations › Webhooks.",
    );
  const channel = normalizeChannel(input?.channel);
  if (!CHANNEL.test(channel))
    refuse(
      "Scrivi il nome del canale (lettere minuscole, numeri e trattini).",
      "Enter the channel name (lowercase letters, numbers and dashes).",
    );
  // A different webhook is a different channel: it starts empty (no back-fill).
  if (!keep && webhook !== rec.relay.webhook) {
    rec.relay.webhook = webhook;
    rec.relay.since = iso(now);
    rec.relay.gaps = [];
  }
  rec.relay.channel = channel;
  for (const e of RELAY_EVENTS) {
    const next = Boolean(input?.events?.[e.id]);
    const was = rec.relay.events[e.id];
    if (was && !next) rec.relay.gaps.push({ event: e.id, from: iso(now), to: null });
    if (!was && next) {
      const open = rec.relay.gaps.find((g) => g.event === e.id && g.to === null);
      if (open) open.to = iso(now);
      else rec.relay.gaps.push({ event: e.id, from: null, to: iso(now) });
    }
    rec.relay.events[e.id] = next;
  }
  rec.relay.since ??= iso(now);
  record(
    rec,
    viewer,
    now,
    L(`Inoltro a Discord aggiornato: #${channel}`, `Discord relay updated: #${channel}`),
  );
}
/** Discord's "Delete Webhook": the secret leaves the app; channel and categories stay. */
export function removeRelayWebhook(slice, cid, viewer, now = Date.now()) {
  requireDm(viewer);
  const rec = writable(slice, cid);
  if (!rec.relay.webhook) refuse("Nessun webhook da rimuovere.", "No webhook to remove.");
  rec.relay.webhook = "";
  record(rec, viewer, now, L("Webhook Discord rimosso", "Discord webhook removed"));
}
/** Foundry Discord `/dnote`: a timestamped note posted by the DM. */
export function addRelayNote(slice, cid, text, viewer, now = Date.now(), id = randomId("note")) {
  requireDm(viewer);
  requireModule(slice, cid, "relay");
  const rec = writable(slice, cid);
  const body = clean(text, MAX_NOTE + 1);
  if (!body) refuse("Scrivi il testo della nota.", "Enter the note text.");
  if (body.length > MAX_NOTE)
    refuse(`Al massimo ${MAX_NOTE} caratteri.`, `At most ${MAX_NOTE} characters.`);
  if (!rec.relay.webhook)
    refuse(
      "Configura prima il webhook: senza, la nota non avrebbe un canale.",
      "Set up the webhook first: without it the note would have no channel.",
    );
  rec.relay.notes.push({ id, text: body, at: iso(now), by: viewer, retracted: null });
  return id;
}
/** Deletions are synced (SVC-121): the note leaves the channel; the reason stays here. */
export function retractRelayNote(slice, cid, noteId, reason, viewer, now = Date.now()) {
  requireDm(viewer);
  const rec = writable(slice, cid);
  const note = rec.relay.notes.find((n) => n.id === noteId);
  if (!note || note.retracted) refuse("Nota non disponibile.", "Note unavailable.");
  const why = clean(reason, MAX_REASON);
  if (why.length < 3)
    refuse("Scrivi il motivo (almeno 3 caratteri).", "Enter the reason (at least 3 characters).");
  note.retracted = { at: iso(now), by: viewer, reason: why };
  record(
    rec,
    viewer,
    now,
    L(`Nota ritirata dal canale: ${why}`, `Note withdrawn from the channel: ${why}`),
  );
}

// ---------------------------------------------------------------- Avrae (SVC-116)

export const avraeCommand = (cid) => `!campaign https://${HOST}/campaigns/${cid}`;
export function linkAvrae(slice, cid, input, viewer, now = Date.now(), id = randomId("avrae")) {
  requireDm(viewer);
  requireModule(slice, cid, "avrae");
  const rec = writable(slice, cid);
  const server = clean(input?.server, 100);
  const channel = normalizeChannel(input?.channel);
  if (!server) refuse("Scrivi il nome del server Discord.", "Enter the Discord server name.");
  if (!CHANNEL.test(channel))
    refuse(
      "Scrivi il nome del canale (lettere minuscole, numeri e trattini).",
      "Enter the channel name (lowercase letters, numbers and dashes).",
    );
  if (rec.avrae.links.some((l) => l.server === server && l.channel === channel))
    refuse("Questo canale è già collegato.", "This channel is already linked.");
  rec.avrae.links.push({ id, server, channel, linkedAt: iso(now), by: viewer });
  record(
    rec,
    viewer,
    now,
    L(`Canale collegato con Avrae: #${channel}`, `Channel linked with Avrae: #${channel}`),
  );
  return id;
}
export function unlinkAvrae(slice, cid, linkId, viewer, now = Date.now()) {
  requireDm(viewer);
  const rec = writable(slice, cid);
  const link = rec.avrae.links.find((l) => l.id === linkId);
  if (!link) refuse("Collegamento non trovato.", "Link not found.");
  rec.avrae.links = rec.avrae.links.filter((l) => l.id !== linkId);
  record(
    rec,
    viewer,
    now,
    L(
      `Canale scollegato da Avrae: #${link.channel}`,
      `Channel unlinked from Avrae: #${link.channel}`,
    ),
  );
}

// ---------------------------------------------------------------- shared event sources

const signed = (n) => (n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`);
function rollText(roll, lang) {
  const who = roll.actorName || "?";
  const kind = rollKindName(roll.kind, lang);
  const action = roll.actionName ? ` (${pick(roll.actionName, lang)})` : "";
  const dice = list(roll.dice)
    .filter((d) => Number.isInteger(d?.count) && Number.isInteger(d?.sides))
    .map((d) => `${d.count}d${d.sides}`)
    .join(" + ");
  const values = list(roll.values).filter(Number.isFinite);
  const modifier =
    Number.isFinite(roll.modifier) && roll.modifier !== 0 ? ` ${signed(roll.modifier)}` : "";
  const total = Number.isFinite(roll.total) ? ` = ${roll.total}` : "";
  const mode =
    roll.mode === "physical"
      ? lang === "en"
        ? "physical dice"
        : "dadi fisici"
      : lang === "en"
        ? "digital dice"
        : "dadi digitali";
  return `${who} · ${kind}${action}: ${dice} [${values.join(", ")}]${modifier}${total} · ${mode}`;
}
const publicRoll = (roll) => roll?.visibility !== "private" && roll?.status !== "superseded";

/**
 * Public game log items for a channel everyone in it can read: rolls whose visibility is
 * not private and shared log labels. Private rolls and private labels are only counted,
 * and only those the viewer could read anyway (the chat log's own rule, rollVisibleTo):
 * another identity's "Just me" activity never shows up, not even as a number.
 */
export function logItems(state, since, lang = "it", viewer = null, rollFor = null) {
  const items = [];
  let privateRolls = 0,
    privateEvents = 0;
  const reverted = new Set(
    list(state.log)
      .filter((e) => e?.kind === "correction" && e.revertsId)
      .map((e) => e.revertsId),
  );
  for (const entry of list(state.log)) {
    if (!entry || typeof entry.label !== "string" || ownLabel(entry.label)) continue;
    if (since && !(entry.time >= since)) continue;
    const logged = list(entry.rolls).filter((r) => r?.status !== "superseded");
    // W2b1 integration: a dice-tray roll (B34) is a label-only line; `rollFor` returns it.
    const tray = !logged.length && entry.kind !== "correction" ? (rollFor?.(entry) ?? null) : null;
    const rolls = tray ? [tray] : logged;
    const shared = entry.visibility !== "private";
    const free =
      shared && !rolls.length && entry.kind !== "correction" ? parseFreeRoll(entry.label) : null;
    const open = free ? [free] : rolls.filter(publicRoll);
    const mine = Boolean(viewer) && entry.controller === viewer;
    privateRolls += rolls.filter(
      (r) => !publicRoll(r) && Boolean(viewer) && (r.owner === viewer || r.controller === viewer),
    ).length;
    if (open.length)
      for (const [i, roll] of open.entries())
        items.push({
          id: `log:${entry.id}:${i}`,
          kind: "roll",
          at: entry.time,
          text: rollText(roll, lang),
          // A tray roll withdrawn with «Ritira» (B34) is reversed like an undone one.
          reversed: reverted.has(entry.id) || roll.status === "withdrawn",
        });
    else if (!rolls.length && !free) {
      // A private free roll (a label only) counts as a roll, never as its text.
      if (!shared && entry.kind !== "correction" && parseFreeRoll(entry.label))
        privateRolls += mine ? 1 : 0;
      else if (!shared) privateEvents += mine ? 1 : 0;
      else
        items.push({
          id: `log:${entry.id}`,
          kind: "event",
          at: entry.time,
          text:
            entry.kind === "correction"
              ? `${lang === "en" ? "Correction" : "Correzione"}: ${entry.label}`
              : entry.label,
          reversed: reverted.has(entry.id),
        });
    }
  }
  return { items, privateRolls, privateEvents };
}
function formatSessionTime(session, lang) {
  if (!session?.startsAt) return lang === "en" ? "date to be agreed" : "data da concordare";
  try {
    const text = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "it-IT", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: session.timeZone || "UTC",
    }).format(new Date(session.startsAt));
    return `${text} (${session.timeZone || "UTC"})`;
  } catch {
    return session.startsAt;
  }
}
/** Session notices from each appointment's own history (scheduled, changed, cancelled). */
export function sessionItems(state, since, lang = "it") {
  const out = [];
  for (const session of list(state.campaign?.sessions))
    for (const snap of list(session.history)) {
      if (!snap?.createdAt || (since && !(snap.createdAt >= since))) continue;
      const what =
        snap.status === "cancelled"
          ? L("Sessione annullata", "Session cancelled")
          : snap.played
            ? L("Sessione giocata", "Session played")
            : snap.revision === 1
              ? L("Sessione programmata", "Session scheduled")
              : L("Sessione spostata", "Session moved");
      out.push({
        id: `session:${session.id}:${snap.revision}`,
        kind: "session",
        event: "sessions",
        at: snap.createdAt,
        title: snap.title || session.title || "",
        text: `${pick(what, lang)}: ${snap.title || session.title || ""} — ${formatSessionTime(snap, lang)}`,
      });
    }
  return out;
}
const KIND_NAMES = {
  note: L("Nota", "Note"),
  world: L("Voce del mondo", "World entry"),
  quest: L("Missione", "Quest"),
  recap: L("Resoconto", "Recap"),
};
/** Campaign entries every current member can read; never a private or partial one. */
export function sharedEntries(state) {
  const cid = state.campaign?.id;
  const members = campaignMembers(state, cid);
  if (!cid || !members.length) return [];
  let common = null;
  for (const member of members) {
    let ids;
    try {
      ids = new Set(listCampaignEntries(state, { campaignId: cid }, member.id).map((e) => e.id));
    } catch {
      ids = new Set();
    }
    common = common ? new Set([...common].filter((id) => ids.has(id))) : ids;
  }
  const first = members[0].id;
  return listCampaignEntries(state, { campaignId: cid }, first).filter((e) => common.has(e.id));
}
export function journalItems(state, since, lang = "it") {
  return sharedEntries(state)
    .filter((e) => e.createdAt && (!since || e.createdAt >= since))
    .map((e) => ({
      id: `entry:${e.id}`,
      kind: "journal",
      event: "journal",
      at: e.createdAt,
      title: e.data?.title || pick(KIND_NAMES[e.kind] ?? L("Voce", "Entry"), lang),
      text: `${lang === "en" ? "New entry" : "Nuova voce"} · ${pick(KIND_NAMES[e.kind] ?? L("Voce", "Entry"), lang)}: ${e.data?.title || "—"}`,
    }));
}

/**
 * The simulated channel for one destination ("webhook" or an Avrae link id): what the
 * relay would have posted, oldest first, plus how many private items were withheld.
 */
export function relayPreview(
  state,
  slice,
  cid,
  {
    destination = "webhook",
    lang = "it",
    limit = PREVIEW_LIMIT,
    viewer = null,
    rollFor = null,
  } = {},
) {
  const rec = campaignOf(slice, cid);
  const empty = { messages: [], privateRolls: 0, privateEvents: 0, configured: false };
  if (!rec.modules.relay) return empty;
  if (destination !== "webhook") {
    const link = rec.modules.avrae && rec.avrae.links.find((l) => l.id === destination);
    if (!link) return empty;
    // Avrae posts rolls only (SVC-116), from the moment the channel was linked.
    const log = logItems(state, link.linkedAt, lang, viewer, rollFor);
    return {
      messages: log.items.filter((i) => i.kind === "roll").slice(-limit),
      privateRolls: log.privateRolls,
      privateEvents: 0,
      configured: true,
    };
  }
  if (!rec.relay.webhook) return empty;
  const since = rec.relay.since;
  const log = logItems(state, since, lang, viewer, rollFor);
  const ev = rec.relay.events;
  // What a category switched off did not post is never posted later (no back-fill).
  const posted = (event) => (item) =>
    ev[event] &&
    !inGap(
      rec.relay.gaps.filter((g) => g.event === event),
      item.at,
    );
  const messages = [
    ...log.items.filter((i) => posted(i.kind === "roll" ? "rolls" : "log")(i)),
    ...(ev.sessions ? sessionItems(state, since, lang).filter(posted("sessions")) : []),
    ...(ev.journal ? journalItems(state, since, lang).filter(posted("journal")) : []),
    ...rec.relay.notes
      .filter((n) => !n.retracted && (!since || n.at >= since))
      .map((n) => ({ id: `note:${n.id}`, kind: "note", at: n.at, text: n.text, noteId: n.id })),
  ].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return {
    messages: messages.slice(-limit),
    privateRolls: ev.rolls ? log.privateRolls : 0,
    privateEvents: ev.log ? log.privateEvents : 0,
    configured: true,
  };
}

// ---------------------------------------------------------------- calendar (SVC-065)

export function setDuration(slice, cid, hours, viewer, now = Date.now()) {
  requireDm(viewer);
  requireModule(slice, cid, "calendar");
  const value = Number(hours);
  if (!DURATIONS.includes(value)) refuse("Durata non valida.", "Invalid duration.");
  const rec = writable(slice, cid);
  rec.calendar.durationHours = value;
  record(rec, viewer, now, L(`Durata nel calendario: ${value} h`, `Calendar duration: ${value} h`));
}
/** Future scheduled appointments this member can see, soonest first. */
export function upcomingSessions(state, viewer, now = Date.now()) {
  const cid = state.campaign?.id;
  if (!cid || !isCampaignMember(state, cid, viewer)) return [];
  return list(state.campaign.sessions)
    .filter(
      (s) =>
        s?.status === "scheduled" && typeof s.startsAt === "string" && Date.parse(s.startsAt) > now,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
export const nextSession = (state, viewer, now = Date.now()) =>
  upcomingSessions(state, viewer, now)[0] ?? null;

const icsDate = (ms) =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const icsText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
/** RFC 5545 line folding at 75 octets (continuation lines start with one space). */
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let current = "",
    size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join("\r\n ");
}
// «Aggiungi al calendario» (owner request 01/10/2026): one event model feeds the .ics file and
// the web-calendar links of calendar-export.mjs. Title «Campagna · sessione»; the description
// repeats the agreed local time and zone and carries the campaign link.
const sessionName = (session, lang) => session?.title || (lang === "en" ? "Session" : "Sessione");
/** Where the campaign's sessions open: the app's own address when the caller knows it. */
export const sessionLink = (state, session) =>
  `https://${HOST}/campaigns/${state.campaign?.id ?? "campaign"}/sessions/${session?.id ?? ""}`;
function eventDescription({ name, agreed, durationHours, link, lang }) {
  return lang === "en"
    ? `Campaign: ${name}\nAgreed time: ${agreed}\nPlanned duration: ${durationHours} h\nOpen the campaign: ${link}`
    : `Campagna: ${name}\nOra concordata: ${agreed}\nDurata prevista: ${durationHours} h\nApri la campagna: ${link}`;
}
/**
 * One session as a calendar event: {title, description, location, start, end, timeZone, link}.
 * Start and end are the session's explicit instant and that instant plus the duration; the
 * zone is the one agreed for the session.
 */
export function sessionEvent(state, session, { durationHours = 3, lang = "it", link = null } = {}) {
  const name = state.campaign?.name ?? "d20 Studio";
  const url = link || sessionLink(state, session);
  const start = Date.parse(session.startsAt);
  const timeZone = session.timeZone || "UTC";
  return {
    title: `${name} · ${sessionName(session, lang)}`,
    description: eventDescription({
      name,
      agreed: `${session.localTime?.replace("T", " ") ?? ""} (${timeZone})`.trim(),
      durationHours,
      link: url,
      lang,
    }),
    location: url,
    start,
    end: start + durationHours * 3600e3,
    timeZone,
    link: url,
  };
}
const icsHead = (name) => [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//d20 Studio//Blueprint B55//IT",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  `X-WR-CALNAME:${icsText(name)}`,
];
const icsDone = (lines) => lines.map(fold).join("\r\n") + "\r\n";
function singleEvent(state, session, { durationHours, now, lang, link }) {
  const cid = state.campaign?.id ?? "campaign";
  const event = sessionEvent(state, session, { durationHours, lang, link });
  return [
    "BEGIN:VEVENT",
    `UID:${session.id}@${cid}.${HOST}`,
    `SEQUENCE:${Math.max(0, (session.revision ?? 1) - 1)}`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(event.end)}`,
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText(event.description)}`,
    `URL:${event.link}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ];
}
/**
 * An iCalendar file (RFC 5545) with one VEVENT per appointment. Start and end are UTC
 * instants (the session's explicit instant); the agreed local time and zone are repeated
 * in the description, like the app shows them. `link` is the campaign address to carry.
 */
export function buildIcs(
  state,
  sessions,
  { durationHours = 3, now = Date.now(), lang = "it", link = null } = {},
) {
  const lines = icsHead(state.campaign?.name ?? "d20 Studio");
  for (const session of sessions)
    lines.push(...singleEvent(state, session, { durationHours, now, lang, link }));
  lines.push("END:VCALENDAR");
  return icsDone(lines);
}
/**
 * A B51 recurring series as seen by `seriesFor`: {id, title, frequency, stepDays, sessions}
 * (its upcoming scheduled dates, soonest first), read from that area's slice without
 * importing it. Null for a session outside a series or with fewer than two dates left.
 */
export function seriesFor(state, sessionId, now = Date.now()) {
  const slice = state.ext?.["sessions-plus"];
  const seriesId = slice?.sessionMeta?.[sessionId]?.seriesId;
  const series = list(slice?.series).find((row) => row?.id === seriesId);
  const stepDays = { weekly: 7, biweekly: 14 }[series?.frequency];
  if (!series || !stepDays) return null;
  const byId = new Map(list(state.campaign?.sessions).map((row) => [row?.id, row]));
  const sessions = list(series.sessionIds)
    .map((id) => byId.get(id))
    .filter(
      (row) =>
        row?.status === "scheduled" &&
        typeof row.startsAt === "string" &&
        Date.parse(row.startsAt) > now,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (sessions.length < 2) return null;
  return { id: series.id, title: series.title, frequency: series.frequency, stepDays, sessions };
}
/**
 * The whole series in one file: the dates that follow its cadence as one VEVENT with RRULE,
 * DTSTART/DTEND in the series zone (TZID and its VTIMEZONE) so every date keeps its local
 * time across a daylight-saving change, EXDATE for the missing steps; any other date (moved,
 * another zone) as its own VEVENT in UTC.
 */
export function buildSeriesIcs(
  state,
  series,
  { durationHours = 3, now = Date.now(), lang = "it", link = null } = {},
) {
  const rule = CE.recurrenceOf(series?.sessions ?? [], series?.stepDays);
  if (!rule) return buildIcs(state, series?.sessions ?? [], { durationHours, now, lang, link });
  const cid = state.campaign?.id ?? "campaign";
  const name = state.campaign?.name ?? "d20 Studio";
  const zone = rule.timeZone;
  const first = Date.parse(rule.anchor.startsAt);
  const last = Date.parse(rule.members.at(-1).startsAt);
  const end = first + durationHours * 3600e3;
  const url = link || sessionLink(state, rule.anchor);
  const time = rule.localTime.slice(11);
  const cadence =
    rule.interval === 1
      ? lang === "en"
        ? `every week at ${time}`
        : `ogni settimana alle ${time}`
      : lang === "en"
        ? `every ${rule.interval} weeks at ${time}`
        : `ogni ${rule.interval} settimane alle ${time}`;
  const lines = [
    ...icsHead(name),
    ...CE.vtimezoneLines(zone, first, last + durationHours * 3600e3),
    "BEGIN:VEVENT",
    `UID:${series.id}@${cid}.${HOST}`,
    `SEQUENCE:${rule.members.reduce((sum, s) => sum + Math.max(0, (s.revision ?? 1) - 1), 0)}`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART;TZID=${zone}:${CE.localStamp(rule.localTime)}`,
    `DTEND;TZID=${zone}:${CE.wallStamp(zone, end)}`,
    `RRULE:${CE.ruleText(rule)}`,
    ...(rule.exdates.length
      ? [`EXDATE;TZID=${zone}:${rule.exdates.map(CE.localStamp).join(",")}`]
      : []),
    `SUMMARY:${icsText(`${name} · ${series.title || sessionName(rule.anchor, lang)}`)}`,
    `DESCRIPTION:${icsText(eventDescription({ name, agreed: `${cadence} (${zone})`, durationHours, link: url, lang }))}`,
    `URL:${url}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ];
  for (const session of rule.singles)
    lines.push(...singleEvent(state, session, { durationHours, now, lang, link }));
  lines.push("END:VCALENDAR");
  return icsDone(lines);
}
export function icsFileName(state, session, { series = false } = {}) {
  const slug = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "sessione";
  const day = session?.startsAt ? session.startsAt.slice(0, 10) : "feed";
  return `${slug(state.campaign?.name)}-${series ? "serie-" : ""}${day}.ics`;
}
/** Sesh `/link`: each member's own feed address; rotating it retires the old one. */
export function feedOf(slice, viewer) {
  return slice?.feeds?.[viewer] ?? null;
}
export const feedUrl = (cid, token) => `webcal://${HOST}/feeds/${cid}/${token}.ics`;
export function rotateFeed(slice, viewer, now = Date.now(), token = secret(24)) {
  const previous = slice.feeds[viewer];
  slice.feeds[viewer] = {
    token,
    createdAt: iso(now),
    retired: [...list(previous?.retired), ...(previous ? [previous.token.slice(-4)] : [])].slice(
      -5,
    ),
  };
  return token;
}

// ---------------------------------------------------------------- external sheet (VTL-034)

export function checkSheetUrl(value) {
  const url = clean(value, MAX_URL + 1);
  if (!url) refuse("Incolla l’indirizzo della scheda.", "Paste the sheet address.");
  if (url.length > MAX_URL)
    refuse(
      `Indirizzo troppo lungo (massimo ${MAX_URL}).`,
      `Address too long (at most ${MAX_URL}).`,
    );
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    refuse("Indirizzo non valido.", "Invalid address.");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.includes("."))
    refuse(
      "Serve un indirizzo sicuro che inizia con https://.",
      "A secure address starting with https:// is needed.",
    );
  if (parsed.username || parsed.password)
    refuse("L’indirizzo non può contenere credenziali.", "The address cannot contain credentials.");
  return parsed.href;
}
/** The link this identity may read for an actor, or null. */
export function sheetLinkFor(state, slice, actorId, viewer) {
  const link = slice?.sheets?.[actorId];
  const actor = state.actors?.[actorId];
  if (!link || !actor) return null;
  if (canControlActor(actor, viewer, state)) return link;
  return link.shared && canViewActor(actor, viewer, state) ? link : null;
}
export function setSheetLink(state, slice, actorId, input, viewer, now = Date.now()) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, viewer, state))
    refuse(
      "Solo chi controlla la creatura collega una scheda esterna.",
      "Only whoever controls the creature links an external sheet.",
    );
  requireModule(slice, state.campaign?.id, "sheets");
  const url = checkSheetUrl(input?.url);
  slice.sheets[actorId] = { url, shared: Boolean(input?.shared), by: viewer, at: iso(now) };
  return slice.sheets[actorId];
}
export function removeSheetLink(state, slice, actorId, viewer) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, viewer, state))
    refuse(
      "Solo chi controlla la creatura rimuove la scheda esterna.",
      "Only whoever controls the creature removes the external sheet.",
    );
  if (!slice.sheets[actorId])
    refuse("Nessuna scheda esterna collegata.", "No external sheet linked.");
  delete slice.sheets[actorId];
}
export const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

// ---------------------------------------------------------------- documented import (DDB-194)

export const FORMAT = "d20-sheet-csv";
export const FORMAT_VERSION = 1;
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const field = (key, required, example, label, target) =>
  Object.freeze({ key, required, example, label, target });
/** The published field list (shown on the page and used by the parser). */
export const SHEET_FIELDS = Object.freeze([
  field("format", true, FORMAT, L("Nome del formato", "Format name"), L("controllo", "check")),
  field("version", true, "1", L("Versione del formato", "Format version"), L("controllo", "check")),
  field(
    "source_id",
    true,
    "tessa-001",
    L("Identità nella fonte", "Identity at the source"),
    L("aggiornamento", "update"),
  ),
  field("name", true, "Tessa", L("Nome", "Name"), L("nome", "name")),
  field("class", false, "Ladra", L("Classe (testo)", "Class (text)"), L("classe", "class")),
  field("level", true, "3", L("Livello 1–20", "Level 1–20"), L("livello", "level")),
  ...ABILITIES.map((a) =>
    field(
      a,
      true,
      "10",
      L(`Punteggio ${a.toUpperCase()} 1–30`, `${a.toUpperCase()} score 1–30`),
      L("caratteristiche", "abilities"),
    ),
  ),
  field("max_hp", true, "24", L("PF massimi 1–999", "Maximum HP 1–999"), L("PF", "HP")),
  field("hp", false, "24", L("PF attuali (≤ massimi)", "Current HP (≤ maximum)"), L("PF", "HP")),
  field("ac", false, "14", L("Classe Armatura 0–40", "Armor Class 0–40"), L("CA", "AC")),
  field("speed", false, "9", L("Velocità in metri", "Speed in metres"), L("velocità", "speed")),
  field(
    "item",
    false,
    "Pugnale;2",
    L("Oggetto;quantità (ripetibile)", "Item;quantity (repeatable)"),
    L("inventario (solo alla creazione)", "inventory (creation only)"),
  ),
  field(
    "notes",
    false,
    "…",
    L("Note (testo)", "Notes (text)"),
    L("note (solo alla creazione)", "notes (creation only)"),
  ),
]);
const FIELD_KEYS = new Set(SHEET_FIELDS.map((f) => f.key));
const REPEATABLE = new Set(["item"]);
export const EXAMPLE_CSV = [
  "campo,valore",
  `format,${FORMAT}`,
  "version,1",
  "source_id,tessa-001",
  "name,Tessa Pietralieve",
  "class,Ladra",
  "level,3",
  "str,8",
  "dex,16",
  "con,14",
  "int,12",
  "wis,10",
  "cha,13",
  "max_hp,24",
  "hp,24",
  "ac,14",
  "speed,9",
  "item,Pugnale;2",
  '"item","Arnesi da scasso;1"',
  '"notes","Esploratrice di Bruma, arrivata con la carovana del sale."',
  "",
].join("\n");

/** One CSV record into cells (RFC 4180 quotes; a quoted comma stays in its cell). */
function cells(line) {
  const out = [];
  let current = "",
    quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else current += ch;
    } else if (ch === '"' && current === "") quoted = true;
    else if (ch === ",") {
      out.push(current);
      current = "";
    } else current += ch;
  }
  out.push(current);
  return { cells: out, open: quoted };
}
const intIn = (value, min, max) => {
  if (!/^-?\d+$/.test(String(value).trim())) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
};

/**
 * Parses the documented two-column sheet (field,value). Returns every problem with its
 * line number; an unknown field is ignored and reported, never guessed.
 */
export function parseSheetCsv(text, { bytes = null } = {}) {
  const size = bytes ?? new TextEncoder().encode(String(text ?? "")).length;
  const errors = [],
    ignored = [];
  const err = (line, it, en) => errors.push({ line, it, en });
  if (size > MAX_IMPORT_BYTES)
    return {
      ok: false,
      errors: [{ line: 0, it: "Il file supera 64 KB.", en: "The file is larger than 64 KB." }],
      ignored,
    };
  const values = new Map(),
    items = [];
  const rows = String(text ?? "")
    .replace(/^﻿/, "")
    .split(/\r?\n/);
  rows.forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) return;
    const { cells: parts, open } = cells(raw);
    if (open) return err(line, "Virgolette non chiuse.", "Unclosed quotes.");
    const key = parts[0].trim().toLowerCase();
    const value = parts.slice(1).join(",").trim();
    if (line === 1 && ["campo", "field"].includes(key)) return;
    if (!FIELD_KEYS.has(key)) return ignored.push({ line, key: parts[0].trim().slice(0, 40) });
    if (REPEATABLE.has(key)) {
      const [name, qty = "1"] = value.split(";");
      const quantity = intIn(qty, 1, 999);
      if (!clean(name, 80) || quantity === null)
        return err(
          line,
          "Oggetto non valido: scrivi nome;quantità.",
          "Invalid item: write name;quantity.",
        );
      return items.push({ name: clean(name, 80), quantity });
    }
    if (values.has(key)) return err(line, `Campo «${key}» ripetuto.`, `Field “${key}” repeated.`);
    values.set(key, { value, line });
  });
  const get = (key) => values.get(key)?.value;
  const lineOf = (key) => values.get(key)?.line ?? 0;
  for (const f of SHEET_FIELDS)
    if (f.required && !values.has(f.key))
      err(0, `Manca il campo obbligatorio «${f.key}».`, `Required field “${f.key}” is missing.`);
  if (values.has("format") && get("format") !== FORMAT)
    err(
      lineOf("format"),
      `Formato sconosciuto: serve «${FORMAT}».`,
      `Unknown format: “${FORMAT}” is required.`,
    );
  if (values.has("version") && intIn(get("version"), 1, 1) === null)
    err(
      lineOf("version"),
      "Versione non supportata: serve 1.",
      "Unsupported version: 1 is required.",
    );
  const sheet = {
    sourceId: clean(get("source_id"), 60),
    name: clean(get("name"), MAX_NAME),
    className: clean(get("class"), 60),
    level: intIn(get("level"), 1, 20),
    abilities: Object.fromEntries(ABILITIES.map((a) => [a, intIn(get(a), 1, 30)])),
    maxHp: intIn(get("max_hp"), 1, 999),
    hp: values.has("hp") ? intIn(get("hp"), 0, 999) : null,
    ac: values.has("ac") ? intIn(get("ac"), 0, 40) : 10,
    speed: values.has("speed") ? intIn(get("speed"), 0, 100) : 9,
    items,
    notes: clean(get("notes"), 2000),
  };
  if (values.has("source_id") && !/^[A-Za-z0-9._-]{1,60}$/.test(sheet.sourceId))
    err(
      lineOf("source_id"),
      "source_id: solo lettere, numeri, punto, trattino.",
      "source_id: letters, numbers, dot and dash only.",
    );
  if (values.has("name") && !sheet.name)
    err(lineOf("name"), "Il nome è vuoto.", "The name is empty.");
  if (values.has("level") && sheet.level === null)
    err(lineOf("level"), "Livello: un intero fra 1 e 20.", "Level: a whole number from 1 to 20.");
  for (const a of ABILITIES)
    if (values.has(a) && sheet.abilities[a] === null)
      err(
        lineOf(a),
        `${a.toUpperCase()}: un intero fra 1 e 30.`,
        `${a.toUpperCase()}: a whole number from 1 to 30.`,
      );
  if (values.has("max_hp") && sheet.maxHp === null)
    err(
      lineOf("max_hp"),
      "PF massimi: un intero fra 1 e 999.",
      "Maximum HP: a whole number from 1 to 999.",
    );
  if (values.has("hp") && (sheet.hp === null || (sheet.maxHp && sheet.hp > sheet.maxHp)))
    err(lineOf("hp"), "PF attuali: fra 0 e i PF massimi.", "Current HP: from 0 to the maximum.");
  if (values.has("ac") && sheet.ac === null)
    err(lineOf("ac"), "CA: un intero fra 0 e 40.", "AC: a whole number from 0 to 40.");
  if (values.has("speed") && sheet.speed === null)
    err(
      lineOf("speed"),
      "Velocità: metri interi fra 0 e 100.",
      "Speed: whole metres from 0 to 100.",
    );
  errors.sort((a, b) => a.line - b.line);
  if (errors.length) return { ok: false, errors, ignored };
  if (sheet.hp === null) sheet.hp = sheet.maxHp;
  return { ok: true, sheet, errors: [], ignored };
}
/** The actor this identity imported earlier from the same source, if it still exists. */
export function importedFrom(state, slice, sourceId, viewer) {
  for (const [actorId, row] of Object.entries(slice?.imports ?? {}))
    if (row.sourceId === sourceId && row.by === viewer && state.actors?.[actorId]?.owner === viewer)
      return actorId;
  return null;
}
const UPDATED = [
  "className",
  "level",
  "maxHp",
  "ac",
  "speed",
  ...ABILITIES.map((a) => `abilities.${a}`),
];
const valueAt = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
/** Avrae `!update`: the numbers that would change; the rest stays as the app keeps it. */
export function importPlan(state, slice, parsed, viewer) {
  const actorId = importedFrom(state, slice, parsed.sheet.sourceId, viewer);
  if (!actorId) return { mode: "new", actorId: null, changes: [] };
  const actor = state.actors[actorId];
  const current = { ...actor, className: pick(actor.className, "it") };
  const changes = UPDATED.map((path) => ({
    path,
    from: valueAt(current, path) ?? null,
    to: valueAt(parsed.sheet, path) ?? null,
  })).filter((c) => (c.to ?? "") !== (c.from ?? "") && !(c.path === "className" && !c.to));
  return { mode: "update", actorId, changes };
}
/** The parsed shape the B21 library importer accepts (`importCharacter`). */
export function libraryParsed(sheet) {
  return {
    ok: true,
    character: {
      name: sheet.name,
      className: sheet.className,
      level: sheet.level,
      abilities: { ...sheet.abilities },
      maxHp: sheet.maxHp,
      hp: sheet.hp,
      tempHp: 0,
      ac: sheet.ac,
      speed: sheet.speed,
      inventory: sheet.items.map((item, i) => ({
        id: `import-${i + 1}`,
        name: item.name,
        quantity: item.quantity,
        weight: 0,
        equipped: false,
        description: "",
        kind: "gear",
      })),
      spells: [],
      features: [],
      description: "",
      backstory: "",
      notes: sheet.notes,
    },
    adventureLog: [],
  };
}
/** Marks a character created by the library importer with this format's provenance. */
export function recordImport(
  state,
  slice,
  actorId,
  sheet,
  viewer,
  { fileName = "", now = Date.now() } = {},
) {
  const actor = state.actors[actorId];
  actor.imported = {
    at: iso(now),
    fileName: clean(fileName, 120),
    format: FORMAT,
    version: FORMAT_VERSION,
  };
  actor.source = {
    kind: "imported-file",
    edition: "2024",
    revision: `${FORMAT}-${FORMAT_VERSION}`,
    note: "Imported from the documented example format d20-sheet-csv v1 (B55); no rule is inferred from the class text.",
  };
  slice.imports[actorId] = {
    sourceId: sheet.sourceId,
    format: FORMAT,
    by: viewer,
    fileName: clean(fileName, 120),
    importedAt: iso(now),
    updatedAt: null,
  };
}
export function applyUpdate(state, slice, parsed, viewer, { now = Date.now() } = {}) {
  const plan = importPlan(state, slice, parsed, viewer);
  if (plan.mode !== "update") refuse("Nessuna scheda da aggiornare.", "No sheet to update.");
  if (!plan.changes.length)
    refuse("La scheda è già aggiornata.", "The sheet is already up to date.");
  const actor = state.actors[plan.actorId];
  const s = parsed.sheet;
  if (s.className) actor.className = s.className;
  actor.level = s.level;
  actor.abilities = { ...actor.abilities, ...s.abilities };
  actor.ac = s.ac;
  actor.speed = s.speed;
  actor.maxHp = s.maxHp;
  actor.hp = Math.min(actor.hp ?? s.maxHp, s.maxHp);
  slice.imports[plan.actorId].updatedAt = iso(now);
  return plan;
}

// ---------------------------------------------------------------- API tokens (CMP-213)

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function secret(length = 32) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}
/** FNV-1a fingerprint: the full secret is never stored, only shown once (Kanka). */
export function fingerprint(value) {
  let h = 2166136261;
  for (const ch of String(value)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}
export const tokensOf = (slice, viewer) => list(slice?.tokens?.[viewer]);
export function createToken(
  slice,
  viewer,
  name,
  now = Date.now(),
  value = `d20_pat_${secret(32)}`,
  id = randomId("token"),
) {
  const label = clean(name, MAX_NAME);
  if (!label) refuse("Dai un nome al token.", "Name the token.");
  const mine = (slice.tokens[viewer] ??= []);
  if (mine.filter((t) => !t.revokedAt).length >= 5)
    refuse("Al massimo 5 token attivi: revocane uno.", "At most 5 active tokens: revoke one.");
  mine.push({
    id,
    name: label,
    last4: value.slice(-4),
    hash: fingerprint(value),
    createdAt: iso(now),
    revokedAt: null,
  });
  return { id, value };
}
export function revokeToken(slice, viewer, tokenId, now = Date.now()) {
  const token = tokensOf(slice, viewer).find((t) => t.id === tokenId);
  if (!token || token.revokedAt) refuse("Token non disponibile.", "Token unavailable.");
  token.revokedAt = iso(now);
}
/**
 * A simulated API call answered locally with the caller's own projection: the same
 * visibility rules as the app, so a private sheet of someone else never appears.
 */
export function apiRequest(
  state,
  slice,
  viewer,
  { tokenValue = "", endpoint = "characters" } = {},
  now = Date.now(),
) {
  const cid = state.campaign?.id;
  const def = ENDPOINTS.find((e) => e.id === endpoint) ?? ENDPOINTS[0];
  const path = def.path(cid);
  const token = tokensOf(slice, viewer).find(
    (t) => t.hash === fingerprint(tokenValue) && t.last4 === String(tokenValue).slice(-4),
  );
  const unauthorized = {
    status: 401,
    path,
    body: { error: "unauthenticated", message: "Invalid or revoked token." },
  };
  if (!moduleOn(slice, cid, "api"))
    return {
      status: 404,
      path,
      body: { error: "not_found", message: "API disabled for this campaign." },
    };
  if (!token || token.revokedAt) return unauthorized;
  if (endpoint === "me")
    return {
      status: 200,
      path,
      body: {
        data: Object.values(state.actors ?? {})
          .filter((a) => a?.kind === "character" && a.owner === viewer)
          .map((a) => ({
            id: a.id,
            name: a.name,
            level: a.level,
            private: a.visibility === "private",
          })),
      },
    };
  if (!isCampaignMember(state, cid, viewer))
    return { status: 403, path, body: { error: "forbidden" } };
  if (endpoint === "sessions")
    return {
      status: 200,
      path,
      body: {
        data: upcomingSessions(state, viewer, now).map((s) => ({
          id: s.id,
          title: s.title,
          starts_at: s.startsAt,
          time_zone: s.timeZone,
          status: s.status,
        })),
      },
    };
  return {
    status: 200,
    path,
    body: {
      data: Object.values(state.actors ?? {})
        .filter(
          (a) =>
            a?.kind === "character" &&
            a.visibility !== "private" &&
            isCampaignActor(a, cid) &&
            canViewActor(a, viewer, state),
        )
        .map((a) => ({
          id: a.id,
          name: a.name,
          class: pick(a.className, "en") || null,
          level: a.level,
        })),
    },
  };
}

// ---------------------------------------------------------------- webhooks (CMP-213)

export const TEMPLATE_KEYS = ["{name}", "{event}", "{url}", "{campaign}"];
export function saveWebhook(slice, cid, input, viewer, now = Date.now(), id = randomId("webhook")) {
  requireDm(viewer);
  requireModule(slice, cid, "api");
  const rec = writable(slice, cid);
  const name = clean(input?.name, MAX_NAME);
  if (!name) refuse("Dai un nome al webhook.", "Name the webhook.");
  const url = checkSheetUrl(input?.url);
  const event = WEBHOOK_EVENTS.some((e) => e.id === input?.event) ? input.event : null;
  if (!event) refuse("Scegli l’evento.", "Choose the event.");
  const format = WEBHOOK_FORMATS.some((f) => f.id === input?.format) ? input.format : "json";
  const template = clean(input?.template, MAX_TEMPLATE) || "{event}: {name}";
  const existing = input?.id ? rec.webhooks.find((w) => w.id === input.id) : null;
  if (input?.id && !existing) refuse("Webhook non trovato.", "Webhook not found.");
  if (existing) {
    setActive(existing, Boolean(input.active), now);
    Object.assign(existing, { name, url, event, format, template });
    record(rec, viewer, now, L(`Webhook modificato: ${name}`, `Webhook edited: ${name}`));
    return existing.id;
  }
  const active = Boolean(input?.active ?? true);
  rec.webhooks.push({
    id,
    name,
    url,
    event,
    format,
    template,
    active,
    // Paused periods [from, to): what happened then is never delivered afterwards.
    pauses: active ? [] : [{ from: iso(now), to: null }],
    createdAt: iso(now),
    by: viewer,
    tests: [],
  });
  record(rec, viewer, now, L(`Webhook creato: ${name}`, `Webhook created: ${name}`));
  return id;
}
function setActive(hook, active, now) {
  hook.pauses = list(hook.pauses).filter(isGap);
  if (hook.active && !active) hook.pauses.push({ from: iso(now), to: null });
  if (!hook.active && active) {
    const open = hook.pauses.find((p) => p.to === null);
    if (open) open.to = iso(now);
  }
  hook.active = active;
}
export function setWebhookActive(slice, cid, webhookId, active, viewer, now = Date.now()) {
  requireDm(viewer);
  const rec = writable(slice, cid);
  const hook = rec.webhooks.find((w) => w.id === webhookId);
  if (!hook) refuse("Webhook non trovato.", "Webhook not found.");
  setActive(hook, Boolean(active), now);
  record(
    rec,
    viewer,
    now,
    hook.active
      ? L(`Webhook attivato: ${hook.name}`, `Webhook enabled: ${hook.name}`)
      : L(`Webhook sospeso: ${hook.name}`, `Webhook paused: ${hook.name}`),
  );
}
export function deleteWebhook(slice, cid, webhookId, viewer, now = Date.now()) {
  requireDm(viewer);
  const rec = writable(slice, cid);
  const hook = rec.webhooks.find((w) => w.id === webhookId);
  if (!hook) refuse("Webhook non trovato.", "Webhook not found.");
  rec.webhooks = rec.webhooks.filter((w) => w.id !== webhookId);
  record(rec, viewer, now, L(`Webhook eliminato: ${hook.name}`, `Webhook deleted: ${hook.name}`));
}
export function testWebhook(slice, cid, webhookId, viewer, now = Date.now()) {
  requireDm(viewer);
  requireModule(slice, cid, "api");
  const hook = writable(slice, cid).webhooks.find((w) => w.id === webhookId);
  if (!hook) refuse("Webhook non trovato.", "Webhook not found.");
  hook.tests.push({ id: randomId("test"), at: iso(now) });
  hook.tests = hook.tests.slice(-5);
}
/** The body a webhook would send for one event, JSON or a Discord message. */
export function webhookPayload(state, hook, item, lang = "it") {
  const url = `https://${HOST}/campaigns/${state.campaign?.id}`;
  const text = hook.template
    .replaceAll("{name}", item.title ?? "")
    .replaceAll("{event}", item.eventName ?? "")
    .replaceAll("{url}", url)
    .replaceAll("{campaign}", state.campaign?.name ?? "");
  if (hook.format === "discord") return { content: text, username: "d20 Studio" };
  return {
    event: item.event,
    campaign: state.campaign?.id,
    title: item.title ?? "",
    at: item.at,
    message: text,
    url,
  };
}
/** Deliveries the webhook would have made since it was created (newest first), plus tests. */
export function webhookDeliveries(state, hook, lang = "it", limit = 5) {
  const names = {
    journal: pick(WEBHOOK_EVENTS[0].label, lang),
    sessions: pick(WEBHOOK_EVENTS[1].label, lang),
  };
  const source =
    hook.event === "sessions"
      ? sessionItems(state, hook.createdAt, lang)
      : journalItems(state, hook.createdAt, lang);
  const events = hook.active
    ? source
        .filter((item) => !inGap(hook.pauses, item.at))
        .map((item) => ({ ...item, event: hook.event, eventName: names[hook.event] }))
    : [];
  const tests = list(hook.tests).map((t) => ({
    id: t.id,
    at: t.at,
    event: "test",
    eventName: lang === "en" ? "Test" : "Prova",
    title: lang === "en" ? "Test delivery" : "Consegna di prova",
    test: true,
  }));
  return [...events, ...tests]
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit)
    .map((item) => ({ ...item, payload: webhookPayload(state, hook, item, lang) }));
}
