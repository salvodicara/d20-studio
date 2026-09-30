// B50 — Campaign data: copy, archive, snapshots, export and trash (domain).
//
// Patterns copied (IDs from docs/interview/CAPABILITY_CENSUS.md and
// changes/interview-01/market-census/*.md):
// - Copy Game with a checklist of components, rename, independent result (Roll20 R20-066,
//   SVC-077); the copy never carries other people's private notes (Quest Portal VTL-040).
// - Cold storage with the list of what stays blocked and "Restore Game" (Roll20 R20-206,
//   SVC-080); archive/restore commands are B13's setCampaignStatus.
// - Named snapshots kept per campaign, the last 14 (LegendKeeper CMP-216), "Show changes"
//   diff and restore as a copy (Obsidian CMP-221, Fantasy Grounds "Restore previous" as a
//   copy R20-083). Roll20's whole-game rollback (R20-068) is not adopted: nothing here
//   overwrites the campaign in play.
// - Export as re-importable JSON or readable Markdown, prepared on request, downloadable
//   for 120 minutes, managers only (Kanka SVC-084, CMP-210); World Anvil / LegendKeeper
//   whole-campaign export (CMP-220, CMP-217).
// - Delete by typing the name (Foundry FVT-003, Roll20 R20-207), recovery bin for 30 days
//   (Kanka CMP-212; Roll20 keeps deleted games 6 months, SVC-079).
// - Copy a scene into another own campaign with an overwrite warning by object ID; who
//   controls a token is not copied (Roll20 Transmogrifier R20-067).
//
// Rules baseline: every campaign is D&D 2024 (SRD 5.2.1, EN/IT), fixed at creation (B13).
// Synthetic data only. Everything is local: no server job, e-mail or cloud backup.

import * as cm from "./campaign-members.mjs";
import { getCampaignEntry, listCampaignEntries } from "./campaign-content.mjs";
import { campaignView } from "./adventures.mjs";
import { listHomebrew } from "./homebrew.mjs";
import { normalizeDeck } from "./decks.mjs";

export const ID = "campaign-data";
export const VERSION = 1;
export const FORMAT = "d20-studio-campaign";
export const FORMAT_VERSION = 1;
export const TRASH_DAYS = 30; // Kanka recovery window (CMP-212)
export const SNAPSHOT_KEEP = 14; // LegendKeeper keeps 14 snapshots (CMP-216)
export const EXPORT_MINUTES = 120; // Kanka export download window (SVC-084)
export const EXPORTS_KEPT = 3;
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const LOG_KEPT = 80;

const L = (it, en) => Object.freeze({ it, en });
const clone = (value) => structuredClone(value);
const iso = (ms) => new Date(ms).toISOString();
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const arrayOf = (value) => (Array.isArray(value) ? value : []);
const idOkay = (id) => typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(id);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const refuse = (it, en) => {
  throw Object.assign(new Error(en), { it, en });
};
function shortId() {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => "abcdefghjkmnpqrstuvwxyz23456789"[byte % 31]).join("");
}
const text = (value, lang = "it") =>
  isObject(value) ? String(value[lang] ?? value.it ?? value.en ?? "") : String(value ?? "");

// What a copy, snapshot, export or import can carry. `slices` are campaign-scoped area
// slices (B13 CAMPAIGN_SCOPED_SLICES) whose content is campaign material authored by the
// DM; they also decide whether the component has anything to carry. `areas` travel with
// the component without deciding that: the scenes' token settings (B12 ring, size,
// rotation, lock, groups, hidden names). Chat, annotations, read receipts and session view
// hold per-person or live-session data and are never carried.
export const COMPONENTS = Object.freeze([
  Object.freeze({
    id: "members",
    label: L("Giocatori e ruoli", "Players and roles"),
    importable: false,
  }),
  Object.freeze({
    id: "scenes",
    label: L("Scene e mappe", "Scenes and maps"),
    areas: Object.freeze(["token-menu"]),
  }),
  Object.freeze({
    id: "creatures",
    label: L("Creature e personaggi del DM", "DM creatures and characters"),
  }),
  Object.freeze({
    id: "journal",
    label: L("Diario, mondo e missioni", "Journal, world and quests"),
  }),
  Object.freeze({
    id: "handouts",
    label: L("Materiali e preparazione", "Materials and prep"),
    slices: Object.freeze(["handouts", "handouts-prep"]),
  }),
  Object.freeze({
    id: "tables",
    label: L("Tabelle casuali e mazzi", "Random tables and decks"),
    slices: Object.freeze(["random-tables"]),
  }),
  Object.freeze({
    id: "loot",
    label: L("Tesoro e scorta del gruppo", "Treasure and party stash"),
    slices: Object.freeze(["loot"]),
  }),
  Object.freeze({
    id: "encounters",
    label: L("Incontri preparati", "Prepared encounters"),
    slices: Object.freeze(["encounter-builder"]),
  }),
]);
export const COMPONENT_IDS = Object.freeze(COMPONENTS.map((c) => c.id));
const areasOf = (component) => [...(component.slices ?? []), ...(component.areas ?? [])];
export const AREA_SLICES = Object.freeze(COMPONENTS.flatMap(areasOf));
// Never copied, exported or imported, with the reason shown in every dialog.
export const NOT_CARRIED = Object.freeze([
  L(
    "Calendario delle sessioni: la copia parte senza appuntamenti.",
    "Session calendar: the copy starts with no appointments.",
  ),
  L(
    "Chat, registro del Tavolo, tiri e aree esplorate nella nebbia: restano la storia di questa campagna.",
    "Chat, Table log, rolls and areas explored in the fog: they stay this campaign's history.",
  ),
  L(
    "Schede dei giocatori: appartengono a loro; ognuno collega la propria alla copia.",
    "Players' sheets: they belong to them; each player connects their own to the copy.",
  ),
  L(
    "Note «Solo io» degli altri membri: mai copiate né esportate.",
    "Other members' “Only me” notes: never copied or exported.",
  ),
  L(
    "Regole della tavola, sicurezza, annotazioni personali e cronologia dell’assistente della campagna originale.",
    "The original campaign's table rules, safety tools, personal annotations and assistant history.",
  ),
]);
// What stays blocked while a campaign is archived (Roll20 cold storage R20-206 lists
// its own). Each line names the command that refuses it.
export const ARCHIVE_BLOCKS = Object.freeze([
  L("Avviare la campagna ed entrare al Tavolo", "Launching the campaign and entering the Table"), // B13 launchCampaign
  L(
    "Link d’invito, inviti diretti e richieste d’ingresso",
    "Invite links, direct invitations and join requests",
  ), // B13 createInviteLink, inviteIdentity, decideRequest
  L("Trasferimento della proprietà", "Ownership transfer"), // B13 proposeTransfer
  L("Copia, istantanee ed esportazione", "Copy, snapshots and export"), // B50 requireActive
  L("Ricevere scene copiate da altre campagne", "Receiving scenes copied from other campaigns"), // B50 copySceneTo
]);
export const ARCHIVE_KEEPS = Object.freeze([
  L(
    "Membri, personaggi e dettagli restano consultabili da Campagne.",
    "Members, characters and details stay readable from Campaigns.",
  ),
  L(
    "Si ripristina in un attimo, con tutto com’era.",
    "It is restored in a moment, with everything as it was.",
  ),
]);
// Campaign material that areas keep outside B13's parked record: per campaign id (B43
// missions and archive, B42 world map and calendar), per scene id (B35 fog, lights and
// vision; B28 scene image) or per creature id (B35 token vision; B28 token look). A copy
// writes it again under the copy's own ids, so each campaign then changes only its own
// (Roll20 copies pages "with lighting", R20-067). `local`: references into this account's
// media library, never written to a file. `carry: false`: only removed with the campaign.
export const LINKED = Object.freeze(
  [
    {
      slice: "quests",
      key: "campaigns",
      by: "campaign",
      component: "journal",
      label: L("Missioni e archivio", "Missions and archive"),
    },
    {
      slice: "world-map",
      key: "campaigns",
      by: "campaign",
      component: "journal",
      label: L("Mappa del mondo e calendario", "World map and calendar"),
    },
    {
      slice: "fog-vision",
      key: "scenes",
      by: "scene",
      component: "scenes",
      label: L("nebbia, luci o visione modificate", "fog, lights or vision changed"),
    },
    {
      slice: "fog-vision",
      key: "tokens",
      by: "actor",
      component: "creatures",
      label: L("visione della pedina cambiata", "token vision changed"),
    },
    {
      slice: "media",
      key: "scenes",
      by: "scene",
      component: "scenes",
      local: true,
      label: L("immagine della mappa cambiata", "map image changed"),
    },
    {
      slice: "media",
      key: "looks",
      by: "actor",
      component: "creatures",
      local: true,
      label: L("aspetto della pedina cambiato", "token look changed"),
    },
    { slice: "fog-vision", key: "memory", by: "scene", carry: false },
    { slice: "fog-vision", key: "positions", by: "scene", carry: false },
  ].map((spec) => Object.freeze({ carry: true, local: false, ...spec })),
);
const CARRIED = LINKED.filter((spec) => spec.carry);

// ---------------------------------------------------------------- state slice

export function seedSlice() {
  // missing (P10 CA-75): per campaign id, the homebrew references an imported file needed
  // that the Library did not hold (Fonti shows them as «mancante», one action each).
  return { snapshots: [], exports: [], log: [], missing: {} };
}
export function normalizeSlice(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Campaign data comes from a newer version");
  if (!isObject(slice)) return seedSlice();
  return {
    snapshots: arrayOf(slice.snapshots).filter(
      (row) => isObject(row) && typeof row.id === "string" && isObject(row.bundle),
    ),
    exports: arrayOf(slice.exports).filter(
      (row) => isObject(row) && typeof row.id === "string" && typeof row.content === "string",
    ),
    log: arrayOf(slice.log).filter(isObject),
    missing: Object.fromEntries(
      Object.entries(isObject(slice.missing) ? slice.missing : {})
        .filter(([id, refs]) => idOkay(id) && Array.isArray(refs))
        .map(([id, refs]) => [id, refs.filter(isRef).map(clone)]),
    ),
  };
}
const isRef = (ref) =>
  isObject(ref) && typeof ref.contentId === "string" && typeof ref.revisionId === "string";
function mine(state) {
  state.ext ??= {};
  const slice = (state.ext[ID] ??= seedSlice());
  slice.snapshots ??= [];
  slice.exports ??= [];
  slice.log ??= [];
  slice.missing ??= {};
  return slice;
}
const sliceOf = (state) => state?.ext?.[ID] ?? seedSlice();
function record(state, now, who, kind, campaignId, data = {}) {
  const slice = mine(state);
  slice.log.push({
    id: `cd-${shortId()}`,
    at: iso(now),
    by: who,
    kind,
    campaignId,
    campaignName: cm.coreCampaign(state, campaignId)?.name ?? data.campaignName ?? "",
    ...data,
  });
  if (slice.log.length > LOG_KEPT) slice.log.splice(0, slice.log.length - LOG_KEPT);
}

// ---------------------------------------------------------------- access

// Undefined campaignIds is legacy membership of the original campaign (B13).
export function inCampaign(actor, campaignId) {
  return Array.isArray(actor?.campaignIds)
    ? actor.campaignIds.includes(campaignId)
    : campaignId === cm.LEGACY_CAMPAIGN;
}
export const canUse = (state, who, campaignId = state?.campaign?.id) =>
  Boolean(campaignId) && cm.canManage(state, campaignId, who);
function requireManager(state, campaignId, who) {
  if (!cm.canManage(state, campaignId, who))
    refuse(
      "Solo il DM o un co-DM della campagna può farlo.",
      "Only the campaign's DM or a co-DM can do this.",
    );
}
function requireOwner(state, campaignId, who) {
  if (cm.roleOf(state, campaignId, who) !== "owner")
    refuse(
      "Solo il proprietario della campagna può farlo.",
      "Only the campaign owner can do this.",
    );
}
function requireActive(state, campaignId, target = false) {
  const meta = cm.metaOf(state, campaignId);
  if (!meta || !cm.coreCampaign(state, campaignId))
    refuse("Campagna non disponibile.", "Campaign unavailable.");
  if (meta.status === "archived")
    refuse(
      target
        ? "La campagna di destinazione è archiviata: ripristinala prima."
        : "La campagna è archiviata: ripristinala prima.",
      target
        ? "The destination campaign is archived: restore it first."
        : "The campaign is archived: restore it first.",
    );
  if (meta.status === "deleted")
    refuse(
      "La campagna è nel cestino: recuperala prima.",
      "The campaign is in the trash: recover it first.",
    );
}
// The campaign's data wherever it lives: the one in play in the core state, the others
// parked in B13's slice with their scenes and area data.
function sourceOf(state, campaignId) {
  if (state.campaign?.id === campaignId)
    return {
      current: true,
      campaign: state.campaign,
      scenes: state.scenes ?? [],
      activeSceneId: state.activeSceneId,
      area: (name) =>
        Object.hasOwn(state.ext ?? {}, name)
          ? { value: state.ext[name], version: state.extVersions?.[name] ?? null }
          : null,
      settings: state.ext?.["core-settings"]?.campaign ?? null,
    };
  const parked = state.ext?.["campaign-members"]?.parked?.[campaignId];
  if (!parked) return null;
  return {
    current: false,
    campaign: parked.campaign,
    scenes: parked.scenes ?? [],
    activeSceneId: parked.activeSceneId,
    area: (name) =>
      isObject(parked.ext?.[name])
        ? { value: parked.ext[name].value, version: parked.ext[name].version ?? null }
        : null,
    settings: parked.ext?.["core-settings"]?.value ?? null,
  };
}
const managerIds = (state, campaignId) =>
  new Set(
    cm
      .membersOf(state, campaignId)
      .filter((m) => cm.canManage(state, campaignId, m.id))
      .map((m) => m.id),
  );
// Creatures of the campaign: NPCs and the sheets of its DM/co-DMs. Players' sheets are
// theirs (DDB-075: the DM never seizes a sheet); private sheets are never read.
function isCreature(actor, managers) {
  return (
    Boolean(actor) &&
    actor.visibility !== "private" &&
    !actor.companion &&
    (actor.kind === "npc" || managers.has(actor.owner))
  );
}

// "Only me" content belongs to one identity: another identity's never travels (controlling
// a sheet is no authority to read its private fields, DEVELOPMENT.md), the capturer's own
// only when they ask. On a sheet: the "Future choices" plans per identity and the owner's
// legacy plan. In B43: page notes and private views; in B42: private calendar events.
const hasText = (value) => typeof value === "string" && value.trim().length > 0;
function ownSheetPrivate(actor, who) {
  return (
    Number(hasText(actor?.personalPlans?.[who])) +
    Number(actor?.owner === who && hasText(actor?.futurePlan))
  );
}
function projectSheet(actor, who, includeOwn) {
  const copy = clone(actor);
  const own = copy.personalPlans?.[who];
  delete copy.personalPlans;
  if (includeOwn && own !== undefined) copy.personalPlans = { [who]: own };
  if (!(includeOwn && actor.owner === who)) delete copy.futurePlan;
  return copy;
}
function ownKeyedPrivate(slice, value, who) {
  if (slice === "quests")
    return (
      Object.values(isObject(value?.notes?.[who]) ? value.notes[who] : {}).filter(Boolean).length +
      arrayOf(value?.views).filter((v) => v?.owner === who && v?.shared !== true).length
    );
  if (slice === "world-map")
    return arrayOf(value?.events).filter((e) => e?.visibility === "private" && e?.owner === who)
      .length;
  return 0;
}
function projectKeyed(slice, value, who, includeOwn) {
  const copy = clone(value);
  if (slice === "quests") {
    const own = copy.notes?.[who];
    copy.notes = includeOwn && isObject(own) ? { [who]: own } : {};
    copy.views = arrayOf(copy.views).filter(
      (v) => v?.shared === true || (includeOwn && v?.owner === who),
    );
  }
  if (slice === "world-map")
    copy.events = arrayOf(copy.events).filter(
      (e) => e?.visibility !== "private" || (includeOwn && e?.owner === who),
    );
  return copy;
}
const linkedRecords = (state, spec) => {
  const records = state?.ext?.[spec.slice]?.[spec.key];
  return isObject(records) ? records : null;
};
/** How many "Only me" items of `who` a copy or export of the campaign could carry. */
export function ownPrivateCount(state, campaignId, who) {
  let count = 0;
  for (const entry of state.campaignContent?.entries ?? [])
    if (
      entry?.campaignId === campaignId &&
      entry.access?.mode === "private" &&
      entry.ownerId === who
    )
      count++;
  const managers = managerIds(state, campaignId);
  for (const actor of Object.values(state.actors ?? {}))
    if (inCampaign(actor, campaignId) && isCreature(actor, managers))
      count += ownSheetPrivate(actor, who);
  for (const spec of CARRIED.filter((s) => s.by === "campaign"))
    count += ownKeyedPrivate(spec.slice, linkedRecords(state, spec)?.[campaignId], who);
  return count;
}

// ---------------------------------------------------------------- bundle

/**
 * Everything a copy, snapshot or export of `campaignId` carries for `who`, as one plain
 * object (also the JSON export format). Only managers of an active campaign capture.
 * `slices`: loaded area slices [{name, version}] (registry.slices()).
 */
export function captureBundle(
  state,
  campaignId,
  who,
  {
    components = COMPONENT_IDS,
    slices = [],
    includeOwnPrivate = false,
    now = Date.now(),
    purpose = "copy",
  } = {},
) {
  requireManager(state, campaignId, who);
  requireActive(state, campaignId);
  const source = sourceOf(state, campaignId);
  const meta = cm.metaOf(state, campaignId);
  const chosen = new Set(arrayOf(components).filter((id) => COMPONENT_IDS.includes(id)));
  const managers = managerIds(state, campaignId);
  const members = cm.membersOf(state, campaignId).map((m) => ({
    id: m.id,
    name: cm.personName(state, m.id, "it"),
    role: cm.roleOf(state, campaignId, m.id),
  }));
  const creatures = [];
  const characters = [];
  let companions = 0;
  let ownPrivate = 0;
  for (const actor of Object.values(state.actors ?? {})) {
    if (!actor || actor.visibility === "private" || !inCampaign(actor, campaignId)) continue;
    if (actor.companion) {
      companions++;
      continue;
    }
    if (isCreature(actor, managers)) {
      if (!chosen.has("creatures")) continue;
      creatures.push(projectSheet(actor, who, includeOwnPrivate));
      if (!includeOwnPrivate) ownPrivate += ownSheetPrivate(actor, who);
    } else if (actor.kind === "character")
      characters.push({
        id: actor.id,
        name: actor.name,
        ownerId: actor.owner,
        ownerName: cm.personName(state, actor.owner, "it"),
        className: clone(actor.className ?? ""),
        level: finite(actor.level) ? actor.level : null,
      });
  }
  // Journal: what `who` can read, projected (hidden sections removed). Another member's
  // "Only me" entry is not readable, so it can never enter the bundle.
  const entries = [];
  if (chosen.has("journal"))
    for (const entry of state.campaignContent?.entries ?? []) {
      if (entry?.campaignId !== campaignId) continue;
      let projected;
      try {
        projected = getCampaignEntry(state, entry.id, who);
      } catch {
        continue;
      }
      if (entry.access?.mode === "private") {
        if (entry.ownerId !== who) continue;
        if (!includeOwnPrivate) {
          ownPrivate++;
          continue;
        }
      }
      entries.push({
        id: entry.id,
        kind: entry.kind,
        ownerId: entry.ownerId,
        ownerName: cm.personName(state, entry.ownerId, "it"),
        access: clone(entry.access ?? { mode: "dms", grants: [] }),
        createdAt: entry.createdAt ?? null,
        updatedAt: projected.updatedAt ?? null,
        data: projected.data,
      });
    }
  const loaded = new Map(arrayOf(slices).map((spec) => [spec.name, spec.version]));
  const areas = {};
  for (const component of COMPONENTS)
    if (chosen.has(component.id))
      for (const name of areasOf(component)) {
        if (!loaded.has(name)) continue;
        const found = source.area(name);
        if (!found || found.value === undefined) continue;
        areas[name] = { version: found.version ?? loaded.get(name), value: clone(found.value) };
      }
  // Area data kept per campaign, scene or creature id (LINKED), for what was chosen.
  const linked = {};
  const idsBy = {
    campaign: [campaignId],
    scene: chosen.has("scenes") ? source.scenes.map((scene) => scene.id) : [],
    actor: creatures.map((actor) => actor.id),
  };
  for (const spec of CARRIED) {
    if (!chosen.has(spec.component) || !loaded.has(spec.slice)) continue;
    if (spec.local && purpose === "export") continue;
    const records = linkedRecords(state, spec);
    if (!records) continue;
    for (const id of idsBy[spec.by]) {
      if (!isObject(records[id])) continue;
      const entry = (linked[spec.slice] ??= {
        version: state.extVersions?.[spec.slice] ?? loaded.get(spec.slice),
      });
      entry[spec.key] ??= {};
      if (spec.by !== "campaign") entry[spec.key][id] = clone(records[id]);
      else {
        entry[spec.key][id] = projectKeyed(spec.slice, records[id], who, includeOwnPrivate);
        if (!includeOwnPrivate) ownPrivate += ownKeyedPrivate(spec.slice, records[id], who);
      }
    }
  }
  const sessions = (source.campaign?.sessions ?? []).length;
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    purpose,
    createdAt: iso(now),
    createdBy: who,
    createdByName: cm.personName(state, who, "it"),
    rules: { edition: "2024", srd: "5.2.1" },
    source: { campaignId, name: source.campaign?.name ?? "" },
    components: [...chosen],
    profile: {
      name: source.campaign?.name ?? "",
      description: meta.description ?? "",
      tags: clone(meta.tags ?? []),
      image: meta.image ?? null,
    },
    members: chosen.has("members") ? members : [],
    scenes: chosen.has("scenes") ? clone(source.scenes) : [],
    activeSceneId: chosen.has("scenes") ? (source.activeSceneId ?? null) : null,
    creatures,
    characters,
    entries,
    areas,
    linked,
    // Homebrew enabled for the campaign (its revisions live in this account's Library).
    homebrew: clone(arrayOf(source.campaign?.enabledContent)),
    settings: isObject(source.settings) ? clone(source.settings) : null,
    left: { sessions, ownPrivate, companions, characters: characters.length },
  };
}

// Counts shown next to each component in the dialogs.
export function summarizeBundle(bundle) {
  const scenes = arrayOf(bundle?.scenes);
  const tokens = scenes.reduce((n, scene) => n + arrayOf(scene.tokens).length, 0);
  const creatureIds = new Set(arrayOf(bundle?.creatures).map((a) => a.id));
  const creatureTokens = scenes.reduce(
    (n, scene) => n + arrayOf(scene.tokens).filter((t) => creatureIds.has(t.actorId)).length,
    0,
  );
  const areaCount = (name, key) => {
    const value = bundle?.areas?.[name]?.value;
    return Array.isArray(value?.[key]) ? value[key].length : 0;
  };
  return {
    members: arrayOf(bundle?.members).length,
    scenes: scenes.length,
    tokens,
    creatureTokens,
    creatures: arrayOf(bundle?.creatures).length,
    characters: arrayOf(bundle?.characters).length,
    entries: arrayOf(bundle?.entries).length,
    handouts: areaCount("handouts", "materials"),
    prep: areaCount("handouts-prep", "sheets"),
    tables: areaCount("random-tables", "tables"),
    loot:
      arrayOf(bundle?.areas?.loot?.value?.stash?.items).length +
      arrayOf(bundle?.areas?.loot?.value?.parcels).length,
    encounters: areaCount("encounter-builder", "encounters"),
    pages: linkedCampaigns(bundle, "quests").reduce((n, v) => n + arrayOf(v?.pages).length, 0),
    places: linkedCampaigns(bundle, "world-map").reduce((n, v) => n + arrayOf(v?.pins).length, 0),
  };
}
// The campaign-keyed records a bundle carries for one area (one, normally).
const linkedCampaigns = (bundle, slice) =>
  Object.values(isObject(bundle?.linked?.[slice]?.campaigns) ? bundle.linked[slice].campaigns : {});
// Whether the bundle carries anything for a component (dialogs disable empty ones).
export function componentPresent(bundle, id) {
  const component = COMPONENTS.find((c) => c.id === id);
  if (!component || !arrayOf(bundle?.components).includes(id)) return false;
  if (component.slices) return component.slices.some((name) => bundle.areas?.[name]);
  if (id === "members") return arrayOf(bundle.members).length > 0;
  if (id === "scenes") return arrayOf(bundle.scenes).length > 0;
  if (id === "creatures") return arrayOf(bundle.creatures).length > 0;
  if (id === "journal")
    return (
      arrayOf(bundle.entries).length > 0 ||
      linkedCampaigns(bundle, "quests").length > 0 ||
      linkedCampaigns(bundle, "world-map").length > 0
    );
  return false;
}

// ---------------------------------------------------------------- validation (import)

const IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_CHARS = Math.ceil((cm.MAX_IMAGE_BYTES * 4) / 3) + 100;
const MAX_BACKGROUND_CHARS = 12 * 1024 * 1024;
const ENTRY_KINDS = ["note", "world", "quest", "recap"];
const ACCESS_MODES = ["private", "dms", "selected", "campaign"];
const warn = (warnings, it, en) => warnings.push({ it, en });
function validScene(scene) {
  return (
    isObject(scene) &&
    idOkay(scene.id) &&
    typeof scene.name === "string" &&
    finite(scene.width) &&
    scene.width > 0 &&
    finite(scene.height) &&
    scene.height > 0 &&
    Array.isArray(scene.tokens) &&
    scene.tokens.every(
      (token) =>
        isObject(token) &&
        finite(token.x) &&
        finite(token.y) &&
        (token.actorId === undefined || idOkay(token.actorId)),
    ) &&
    (scene.walls === undefined || Array.isArray(scene.walls))
  );
}
function validCreature(actor) {
  return (
    isObject(actor) &&
    idOkay(actor.id) &&
    typeof actor.name === "string" &&
    actor.name.trim().length > 0 &&
    ["npc", "character"].includes(actor.kind) &&
    finite(actor.hp) &&
    finite(actor.maxHp) &&
    finite(actor.ac) &&
    isObject(actor.abilities) &&
    Object.values(actor.abilities).every(finite) &&
    (actor.inventory === undefined || Array.isArray(actor.inventory)) &&
    (actor.conditions === undefined || Array.isArray(actor.conditions))
  );
}
function validEntry(entry) {
  return (
    isObject(entry) &&
    idOkay(entry.id) &&
    ENTRY_KINDS.includes(entry.kind) &&
    isObject(entry.data) &&
    typeof (entry.data.title ?? "") === "string" &&
    typeof (entry.data.body ?? "") === "string" &&
    (entry.data.sections === undefined || Array.isArray(entry.data.sections))
  );
}

/**
 * Checks a campaign file (or a stored snapshot) and returns a normalized copy plus the
 * readable warnings of what will be left out. Throws a readable {it, en} refusal when the
 * file cannot be used at all.
 */
export function validateBundle(raw) {
  const unusable = () =>
    refuse(
      "Il file non è un’esportazione di campagna di d20 Studio (JSON).",
      "The file is not a d20 Studio campaign export (JSON).",
    );
  if (!isObject(raw) || raw.format !== FORMAT) unusable();
  if (!Number.isInteger(raw.formatVersion) || raw.formatVersion < 1) unusable();
  if (raw.formatVersion > FORMAT_VERSION)
    refuse(
      "Il file viene da una versione più recente dell’app: aggiornala per importarlo.",
      "The file comes from a newer version of the app: update it to import the file.",
    );
  const warnings = [];
  const profile = isObject(raw.profile) ? raw.profile : {};
  let name = typeof profile.name === "string" ? profile.name.trim() : "";
  if (!name) refuse("Nel file manca il nome della campagna.", "The file has no campaign name.");
  if (name.length > 80) {
    name = name.slice(0, 80);
    warn(warnings, "Nome accorciato a 80 caratteri.", "Name shortened to 80 characters.");
  }
  let description = typeof profile.description === "string" ? profile.description : "";
  if (description.length > 1000) {
    description = description.slice(0, 1000);
    warn(
      warnings,
      "Descrizione accorciata a 1000 caratteri.",
      "Description shortened to 1000 characters.",
    );
  }
  const allTags = arrayOf(profile.tags).filter((tag) => typeof tag === "string");
  const tags = [
    ...new Set(allTags.map((tag) => tag.trim()).filter((tag) => tag && tag.length <= 24)),
  ].slice(0, 8);
  if (tags.length < allTags.length)
    warn(
      warnings,
      "Alcune etichette non valide sono state tolte.",
      "Some invalid tags were removed.",
    );
  let image = profile.image ?? null;
  if (
    image !== null &&
    !(typeof image === "string" && IMAGE_PATTERN.test(image) && image.length <= MAX_IMAGE_CHARS)
  ) {
    image = null;
    warn(
      warnings,
      "Immagine della campagna non valida: importata senza immagine.",
      "Invalid campaign image: imported without an image.",
    );
  }
  const scenes = [];
  for (const scene of arrayOf(raw.scenes)) {
    if (!validScene(scene) || scenes.some((s) => s.id === scene.id)) {
      warn(
        warnings,
        `Scena «${text(scene?.name)}» non valida: esclusa.`,
        `Invalid scene “${text(scene?.name)}”: left out.`,
      );
      continue;
    }
    const copy = clone(scene);
    // Where the scene was copied from (its lineage root) is only kept when well formed.
    if (
      copy.dataCopy !== undefined &&
      !(isObject(copy.dataCopy) && (copy.dataCopy.root === undefined || idOkay(copy.dataCopy.root)))
    )
      delete copy.dataCopy;
    if (
      copy.background != null &&
      !(
        typeof copy.background === "string" &&
        /^data:image\/(png|jpeg|webp|gif);base64,/.test(copy.background) &&
        copy.background.length <= MAX_BACKGROUND_CHARS
      )
    ) {
      copy.background = null;
      warn(
        warnings,
        `Sfondo della scena «${copy.name}» non valido: importata senza sfondo.`,
        `Invalid background for scene “${copy.name}”: imported without it.`,
      );
    }
    scenes.push(copy);
  }
  const creatures = [];
  for (const actor of arrayOf(raw.creatures)) {
    if (!validCreature(actor) || creatures.some((a) => a.id === actor.id)) {
      warn(
        warnings,
        `Creatura «${text(actor?.name)}» non valida: esclusa.`,
        `Invalid creature “${text(actor?.name)}”: left out.`,
      );
      continue;
    }
    creatures.push(clone(actor));
  }
  const entries = [];
  for (const entry of arrayOf(raw.entries)) {
    if (!validEntry(entry) || entries.some((e) => e.id === entry.id)) {
      warn(
        warnings,
        `Voce «${text(entry?.data?.title)}» non valida: esclusa.`,
        `Invalid entry “${text(entry?.data?.title)}”: left out.`,
      );
      continue;
    }
    const copy = clone(entry);
    copy.data.title = copy.data.title ?? "";
    copy.data.body = copy.data.body ?? "";
    copy.data.sections = arrayOf(copy.data.sections).filter(
      (section) => isObject(section) && idOkay(section.id),
    );
    copy.data.links = arrayOf(copy.data.links).filter(isObject);
    if (!isObject(copy.access) || !ACCESS_MODES.includes(copy.access.mode))
      copy.access = { mode: "dms", grants: [] };
    copy.access.grants = arrayOf(copy.access.grants).filter((g) => isObject(g) && idOkay(g.id));
    entries.push(copy);
  }
  const areas = {};
  for (const [area, value] of Object.entries(isObject(raw.areas) ? raw.areas : {})) {
    if (!AREA_SLICES.includes(area)) {
      warn(warnings, `Dati «${area}» sconosciuti: ignorati.`, `Unknown “${area}” data: ignored.`);
      continue;
    }
    if (
      !isObject(value) ||
      !Number.isInteger(value.version) ||
      value.version < 1 ||
      !isObject(value.value)
    ) {
      warn(warnings, `Dati «${area}» non validi: ignorati.`, `Invalid “${area}” data: ignored.`);
      continue;
    }
    areas[area] = clone(value);
  }
  const linked = {};
  for (const [area, entry] of Object.entries(isObject(raw.linked) ? raw.linked : {})) {
    const specs = CARRIED.filter((spec) => spec.slice === area);
    if (!specs.length) {
      warn(warnings, `Dati «${area}» sconosciuti: ignorati.`, `Unknown “${area}” data: ignored.`);
      continue;
    }
    const out = {};
    let broken = !isObject(entry) || !Number.isInteger(entry.version) || entry.version < 1;
    for (const spec of broken ? [] : specs) {
      const records = entry[spec.key];
      if (records === undefined) continue;
      if (!isObject(records)) {
        broken = true;
        continue;
      }
      for (const [id, value] of Object.entries(records))
        if (idOkay(id) && isObject(value)) (out[spec.key] ??= {})[id] = clone(value);
        else broken = true;
    }
    if (broken)
      warn(
        warnings,
        `Dati «${area}» in parte non validi: ignorati.`,
        `Partly invalid “${area}” data: ignored.`,
      );
    if (Object.keys(out).length) linked[area] = { version: entry.version, ...out };
  }
  const members = arrayOf(raw.members)
    .filter((m) => isObject(m) && idOkay(m.id) && typeof m.name === "string")
    .map((m) => ({
      id: m.id,
      name: m.name,
      role: ["owner", "co-dm", "player", "observer"].includes(m.role) ? m.role : "player",
    }));
  const components = arrayOf(raw.components).filter((id) => COMPONENT_IDS.includes(id));
  return {
    bundle: {
      format: FORMAT,
      formatVersion: raw.formatVersion,
      purpose: typeof raw.purpose === "string" ? raw.purpose : "export",
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : null,
      createdBy: typeof raw.createdBy === "string" ? raw.createdBy : null,
      createdByName: typeof raw.createdByName === "string" ? raw.createdByName : "",
      rules: { edition: "2024", srd: "5.2.1" },
      source: {
        campaignId: typeof raw.source?.campaignId === "string" ? raw.source.campaignId : null,
        name: typeof raw.source?.name === "string" ? raw.source.name : name,
      },
      components: components.length ? components : COMPONENT_IDS.slice(),
      profile: { name, description, tags, image },
      members,
      scenes,
      activeSceneId:
        typeof raw.activeSceneId === "string" && scenes.some((s) => s.id === raw.activeSceneId)
          ? raw.activeSceneId
          : (scenes[0]?.id ?? null),
      creatures,
      characters: arrayOf(raw.characters).filter(isObject).map(clone),
      entries,
      areas,
      linked,
      homebrew: arrayOf(raw.homebrew).filter(isObject).map(clone),
      settings: isObject(raw.settings) ? clone(raw.settings) : null,
      left: isObject(raw.left) ? clone(raw.left) : {},
    },
    warnings,
  };
}

// ---------------------------------------------------------------- create from a bundle

// References inside carried data: `campaignId`, keys ending in actorId/sceneId/entryId
// (and their lists), and {kind: "actor" | "scene" | "entry", id} links (B42 pins, B43
// elements and givers, journal links). Best effort: ids outside the maps stay as they are.
const REF_KINDS = { actor: "actors", scene: "scenes", entry: "entries" };
const REF_KEYS = [
  [/actorId$/i, "actors"],
  [/sceneId$/i, "scenes"],
  [/entryId$/i, "entries"],
];
const REF_LISTS = [
  [/actorIds$/i, "actors"],
  [/sceneIds$/i, "scenes"],
  [/entryIds$/i, "entries"],
];
const mapFor = (rules, key) => rules.find(([pattern]) => pattern.test(key))?.[1];
function remapRefs(value, maps) {
  if (Array.isArray(value)) return value.map((item) => remapRefs(item, maps));
  if (!isObject(value)) return value;
  const link = typeof value.id === "string" ? maps[REF_KINDS[value.kind]] : null;
  const out = {};
  for (const [name, item] of Object.entries(value)) {
    // A record keyed by a copied creature or scene (B12 hidden names) follows it too.
    const key = maps.actors?.get(name) ?? maps.scenes?.get(name) ?? name;
    const single = mapFor(REF_KEYS, key);
    const list = mapFor(REF_LISTS, key);
    if (key === "id" && link?.has(item)) out[key] = link.get(item);
    else if (key === "campaignId" && maps.fromCampaign && item === maps.fromCampaign)
      out[key] = maps.toCampaign;
    else if (single && typeof item === "string" && maps[single]?.has(item))
      out[key] = maps[single].get(item);
    else if (list && Array.isArray(item))
      out[key] = item.map((ref) =>
        typeof ref === "string" && maps[list]?.has(ref) ? maps[list].get(ref) : ref,
      );
    else out[key] = remapRefs(item, maps);
  }
  return out;
}
function uniqueActorId(state, base) {
  const stem = String(base).slice(0, 180);
  let id = `${stem}-${shortId().slice(0, 4)}`;
  while (state.actors?.[id]) id = `${stem}-${shortId().slice(0, 4)}`;
  return id;
}
// An independent copy of a creature for another campaign. Who controls it is not copied
// (Transmogrifier R20-067); of its "Only me" plans only the creator's own travel.
function copyActor(actor, id, campaignId, who, now, origin) {
  const copy = clone(actor);
  copy.id = id;
  copy.owner = who;
  copy.controllers = [];
  copy.campaignIds = [campaignId];
  copy.visibility = "shared";
  if (isObject(copy.personalPlans))
    copy.personalPlans = copy.personalPlans[who] ? { [who]: copy.personalPlans[who] } : {};
  if (actor.owner !== who) delete copy.futurePlan;
  delete copy.companionIds;
  copy.dataCopy = { from: actor.id, campaignId, at: iso(now), origin };
  return copy;
}
function entryId(campaignId, oldId) {
  const id = `${campaignId}.${oldId}`.slice(0, 190);
  return idOkay(id) ? id : `${campaignId}.entry-${shortId()}`;
}
// Scene ids are global keys for other areas (B35 fog and lights, B28 map images), so a
// copied scene always gets its own id. `root` is the scene it descends from: a later copy
// of the same scene is recognised by it (Transmogrifier's overwrite warning, R20-067).
export const sceneRoot = (scene) =>
  idOkay(scene?.dataCopy?.root) ? scene.dataCopy.root : (scene?.id ?? null);
function sceneIdTaken(state, id) {
  if ((state.scenes ?? []).some((scene) => scene.id === id)) return true;
  return Object.values(state.ext?.["campaign-members"]?.parked ?? {}).some((row) =>
    arrayOf(row?.scenes).some((scene) => scene.id === id),
  );
}
function freshSceneId(state, campaignId, oldId, taken = new Set()) {
  const stem = `${campaignId}-${oldId}`.slice(0, 180);
  const base = idOkay(stem) ? stem : `${campaignId}-scene`;
  let id = base;
  for (let n = 2; taken.has(id) || sceneIdTaken(state, id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
}
// Writes carried area data (LINKED) under the new ids, only for areas loaded here in a
// version they read. Data from a file first passes the area's own normalize; references
// into the media library are never imported. Returns the areas written and skipped.
function writeLinked(state, bundle, { chosen, maps, who, origin, slices }) {
  const specs = new Map(arrayOf(slices).map((spec) => [spec.name, spec]));
  const written = new Set();
  const skipped = new Set();
  for (const spec of CARRIED) {
    const entry = bundle.linked?.[spec.slice];
    const records = entry?.[spec.key];
    if (!isObject(records) || !chosen.has(spec.component)) continue;
    if (spec.local && origin === "import") continue;
    const area = specs.get(spec.slice);
    const target = state.ext?.[spec.slice];
    if (!area || !isObject(target) || entry.version > area.version) {
      skipped.add(spec.slice);
      continue;
    }
    for (const [oldId, value] of Object.entries(records)) {
      const newId =
        spec.by === "campaign"
          ? maps.toCampaign
          : (spec.by === "scene" ? maps.scenes : maps.actors).get(oldId);
      if (!newId) continue;
      let next = remapRefs(clone(value), maps);
      // Whoever creates the campaign never receives someone else's "Only me" content.
      if (spec.by === "campaign") next = projectKeyed(spec.slice, next, who, true);
      if (origin === "import" && spec.slice === "world-map")
        for (const map of arrayOf(next.maps))
          if (isObject(map) && map.background != null && !IMAGE_PATTERN.test(map.background))
            map.background = null;
      if (origin === "import" || entry.version !== area.version) {
        try {
          const normalized = area.normalize?.({ [spec.key]: { [newId]: next } }, entry.version);
          next = normalized?.[spec.key]?.[newId];
        } catch {
          next = undefined;
        }
        if (!isObject(next)) {
          skipped.add(spec.slice);
          continue;
        }
      }
      if (!isObject(target[spec.key])) target[spec.key] = {};
      target[spec.key][newId] = next;
      written.add(spec.slice);
    }
  }
  return { written: [...written], skipped: [...skipped].filter((name) => !written.has(name)) };
}

/**
 * Creates a new, independent campaign owned by `who` from a bundle (copy, snapshot
 * restore or import). Uses B13's createCampaign for the record, then fills the parked
 * campaign with the chosen components and writes the carried area data under the new
 * ids. `slices`: loaded area slices [{name, version, normalize?}] (registry.slices()).
 * Returns {campaignId, report}.
 */
export function createFromBundle(
  state,
  input,
  { name, components, who, now = Date.now(), origin = "copy", slices = [] } = {},
) {
  const { bundle, warnings } = validateBundle(input);
  const chosen = new Set(
    arrayOf(components ?? bundle.components).filter((id) => bundle.components.includes(id)),
  );
  if (origin === "import") chosen.delete("members");
  const campaignName = String(name ?? bundle.profile.name).trim();
  const id = cm.createCampaign(
    state,
    {
      name: campaignName,
      description: bundle.profile.description,
      tags: bundle.profile.tags,
      image: bundle.profile.image,
    },
    who,
    now,
  );
  const b13 = state.ext["campaign-members"];
  const parked = b13.parked[id];
  const meta = b13.campaigns[id];
  const report = {
    members: 0,
    scenes: 0,
    tokens: 0,
    droppedTokens: 0,
    creatures: 0,
    entries: 0,
    skippedEntries: 0,
    areas: [],
    skippedAreas: [],
    warnings: clone(warnings),
  };
  // Homebrew enabled for the campaign: its revisions live in this account's Library, so a
  // copy keeps the list; a file does not carry the content (previewImport says so).
  if (origin !== "import" && bundle.homebrew.length)
    parked.campaign.enabledContent = clone(bundle.homebrew);
  // Players and roles: the creator owns the copy; the source owner becomes a co-DM.
  const copiedMembers = new Set([who]);
  if (chosen.has("members")) {
    for (const member of bundle.members) {
      if (member.id === who || !cm.IDENTITIES.includes(member.id)) continue;
      const role = ["owner", "co-dm"].includes(member.role) ? "co-dm" : member.role;
      parked.campaign.members.push({
        id: member.id,
        name: member.name,
        role,
        ...(role === "co-dm" ? { canOrganize: true } : {}),
      });
      meta.joined[member.id] = { at: iso(now), via: origin };
      copiedMembers.add(member.id);
      report.members++;
    }
  }
  // New ids for everything copied, so references can follow (remapRefs).
  const maps = {
    fromCampaign: bundle.source.campaignId,
    toCampaign: id,
    actors: new Map(),
    scenes: new Map(),
    entries: new Map(),
  };
  if (chosen.has("creatures"))
    for (const actor of bundle.creatures) maps.actors.set(actor.id, uniqueActorId(state, actor.id));
  if (chosen.has("scenes")) {
    const taken = new Set();
    for (const scene of bundle.scenes)
      maps.scenes.set(scene.id, freshSceneId(state, id, scene.id, taken));
  }
  // Who wrote what stays: another member's entry is copied only with that member. An
  // imported file has no members here, so its entries belong to whoever imports it.
  const entries = chosen.has("journal")
    ? bundle.entries.filter(
        (e) => origin === "import" || e.ownerId === who || copiedMembers.has(e.ownerId),
      )
    : [];
  for (const e of entries) maps.entries.set(e.id, entryId(id, e.id));
  report.skippedEntries = chosen.has("journal") ? bundle.entries.length - entries.length : 0;
  for (const actor of bundle.creatures) {
    const newId = maps.actors.get(actor.id);
    if (!newId) continue;
    state.actors[newId] = remapRefs(copyActor(actor, newId, id, who, now, origin), maps);
    report.creatures++;
  }
  if (maps.scenes.size) {
    parked.scenes = bundle.scenes.map((scene) => {
      const tokens = arrayOf(scene.tokens).filter(
        (token) => !token.actorId || maps.actors.has(token.actorId),
      );
      report.droppedTokens += arrayOf(scene.tokens).length - tokens.length;
      const copy = remapRefs({ ...clone(scene), tokens }, maps);
      copy.id = maps.scenes.get(scene.id);
      copy.dataCopy = {
        root: sceneRoot(scene),
        from: scene.id,
        campaignId: bundle.source.campaignId,
        at: iso(now),
        origin,
      };
      report.tokens += copy.tokens.length;
      if (Array.isArray(copy.revealedTo))
        copy.revealedTo = copy.revealedTo.filter((m) => copiedMembers.has(m));
      return copy;
    });
    parked.activeSceneId = maps.scenes.get(bundle.activeSceneId) ?? parked.scenes[0].id;
    report.scenes = parked.scenes.length;
  }
  if (entries.length) {
    const store = (state.campaignContent ??= { version: 1, entries: [], drafts: [] });
    const copiedEntryIds = new Set(maps.entries.values());
    for (const e of entries) {
      const ownerId = origin === "import" ? who : e.ownerId;
      const access = clone(e.access);
      access.grants = arrayOf(access.grants).filter(
        (g) => copiedMembers.has(g.id) && g.id !== ownerId,
      );
      if (access.mode === "private") access.grants = [];
      const data = remapRefs(clone(e.data), maps);
      // A link to an entry that did not travel would point back into the source campaign.
      data.links = arrayOf(data.links).filter(
        (link) => link?.kind !== "entry" || copiedEntryIds.has(link.id),
      );
      data.sections = arrayOf(data.sections).map((section) => ({
        ...section,
        access: isObject(section.access) ? section.access : clone(access),
      }));
      data.sessionId = null;
      const newId = maps.entries.get(e.id);
      const revisionId = `revision-${newId}`.slice(0, 200);
      store.entries.push({
        id: newId,
        kind: e.kind,
        campaignId: id,
        ownerId,
        access,
        accessRevision: 0,
        currentRevisionId: revisionId,
        revisions: [
          {
            id: revisionId,
            parentRevisionId: null,
            authorId: ownerId,
            createdAt: iso(now),
            data,
            audience: [ownerId],
            sectionAudience: {},
            provenance: { kind: origin, from: e.id, sourceCampaign: bundle.source.name },
          },
        ],
        historyAccess: {},
        createdAt: e.createdAt ?? iso(now),
        updatedAt: iso(now),
      });
      report.entries++;
    }
  }
  const loaded = new Map(arrayOf(slices).map((spec) => [spec.name, spec.version]));
  parked.ext ??= {};
  for (const component of COMPONENTS)
    if (chosen.has(component.id))
      for (const area of areasOf(component)) {
        const entry = bundle.areas[area];
        if (!entry) continue;
        const spec = arrayOf(slices).find((row) => row.name === area);
        if (!loaded.has(area) || entry.version > loaded.get(area)) {
          report.skippedAreas.push(area);
          continue;
        }
        let value = remapRefs(clone(entry.value), maps);
        // Data from a file passes the area's own normalize before it is parked.
        if (origin === "import" && typeof spec?.normalize === "function") {
          try {
            value = spec.normalize(value, entry.version);
          } catch {
            value = undefined;
          }
          if (!isObject(value)) {
            report.skippedAreas.push(area);
            continue;
          }
        }
        parked.ext[area] = { value, version: entry.version };
        report.areas.push(area);
      }
  const linked = writeLinked(state, bundle, { chosen, maps, who, origin, slices });
  report.areas.push(...linked.written);
  report.skippedAreas.push(...linked.skipped);
  if (bundle.settings) parked.ext["core-settings"] = { value: clone(bundle.settings) };
  return { campaignId: id, report };
}

// ---------------------------------------------------------------- copy (Roll20 Copy Game)

export function copyCampaign(
  state,
  campaignId,
  { name, components = COMPONENT_IDS, includeOwnPrivate = false } = {},
  who,
  now = Date.now(),
  { slices = [] } = {},
) {
  const bundle = captureBundle(state, campaignId, who, {
    components,
    slices,
    includeOwnPrivate,
    now,
    purpose: "copy",
  });
  const result = createFromBundle(state, bundle, {
    name,
    components,
    who,
    now,
    origin: "copy",
    slices,
  });
  record(state, now, who, "copy", campaignId, {
    targetId: result.campaignId,
    targetName: name ?? bundle.profile.name,
    components: bundle.components,
  });
  return result;
}

// ---------------------------------------------------------------- snapshots

// Newest first; equal times keep the most recent insertion first.
const newestFirst = (rows) =>
  rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => b.row.createdAt.localeCompare(a.row.createdAt) || b.index - a.index)
    .map(({ row }) => row);
export function listSnapshots(state, campaignId) {
  return newestFirst(sliceOf(state).snapshots.filter((row) => row.campaignId === campaignId));
}
export function takeSnapshot(
  state,
  campaignId,
  { name = "", label = null, kind = "manual" } = {},
  who,
  now = Date.now(),
  { slices = [] } = {},
) {
  const title = String(name ?? "").trim();
  if (kind === "manual" && !title) refuse("Dai un nome all’istantanea.", "Name the snapshot.");
  if (title.length > 80)
    refuse(
      "Il nome dell’istantanea supera gli 80 caratteri.",
      "The snapshot name is longer than 80 characters.",
    );
  // A snapshot lives in shared campaign data: nobody's "Only me" notes enter it.
  const bundle = captureBundle(state, campaignId, who, {
    slices,
    includeOwnPrivate: false,
    now,
    purpose: "snapshot",
  });
  const slice = mine(state);
  const snapshot = {
    id: `snapshot-${shortId()}`,
    campaignId,
    campaignName: bundle.profile.name,
    name: title,
    label: label ? clone(label) : null,
    kind,
    createdAt: iso(now),
    by: who,
    bytes: JSON.stringify(bundle).length,
    bundle,
  };
  slice.snapshots.push(snapshot);
  const own = slice.snapshots
    .filter((row) => row.campaignId === campaignId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const dropped = own.slice(0, Math.max(0, own.length - SNAPSHOT_KEEP));
  if (dropped.length) slice.snapshots = slice.snapshots.filter((row) => !dropped.includes(row));
  record(state, now, who, "snapshot", campaignId, {
    snapshotName: title || null,
    snapshotLabel: snapshot.label,
    dropped: dropped.length,
  });
  return { id: snapshot.id, dropped: dropped.map((row) => row.name || text(row.label)) };
}
function snapshotById(state, snapshotId) {
  const snapshot = sliceOf(state).snapshots.find((row) => row.id === snapshotId);
  if (!snapshot) refuse("Istantanea non disponibile.", "Snapshot unavailable.");
  return snapshot;
}
export function deleteSnapshot(state, snapshotId, who, now = Date.now()) {
  const snapshot = snapshotById(state, snapshotId);
  requireManager(state, snapshot.campaignId, who);
  const slice = mine(state);
  slice.snapshots = slice.snapshots.filter((row) => row.id !== snapshotId);
  record(state, now, who, "snapshot-deleted", snapshot.campaignId, {
    snapshotName: snapshot.name || null,
    snapshotLabel: snapshot.label,
  });
}
// Fantasy Grounds "Restore previous" (R20-083): the snapshot becomes a new campaign; the
// campaign it was taken from is never overwritten.
export function restoreSnapshotAsCopy(
  state,
  snapshotId,
  { name, components } = {},
  who,
  now = Date.now(),
  { slices = [] } = {},
) {
  const snapshot = snapshotById(state, snapshotId);
  requireManager(state, snapshot.campaignId, who);
  const result = createFromBundle(state, snapshot.bundle, {
    name,
    components: components ?? snapshot.bundle.components,
    who,
    now,
    origin: "snapshot",
    slices,
  });
  record(state, now, who, "restore-copy", snapshot.campaignId, {
    snapshotName: snapshot.name || null,
    snapshotLabel: snapshot.label,
    targetId: result.campaignId,
    targetName: name ?? snapshot.bundle.profile.name,
  });
  return result;
}
export function snapshotBundle(state, snapshotId) {
  return snapshotById(state, snapshotId).bundle;
}

// ---------------------------------------------------------------- diff ("Show changes")

const nameOfActor = (bundle, actorId) =>
  arrayOf(bundle?.creatures).find((a) => a.id === actorId)?.name ??
  arrayOf(bundle?.characters).find((a) => a.id === actorId)?.name ??
  actorId;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const change = (kind, it, en) => ({ kind, it, en });
/**
 * Differences between a snapshot (`before`) and the campaign now (`after`), as readable
 * rows {kind, it, en}. Only what a restore would bring back is compared.
 */
export function diffBundles(before, after) {
  const rows = [];
  if (before.profile?.name !== after.profile?.name)
    rows.push(
      change(
        "profile",
        `Nome: «${before.profile?.name}» → «${after.profile?.name}»`,
        `Name: “${before.profile?.name}” → “${after.profile?.name}”`,
      ),
    );
  if ((before.profile?.description ?? "") !== (after.profile?.description ?? ""))
    rows.push(change("profile", "Descrizione modificata", "Description changed"));
  const beforeMembers = new Map(arrayOf(before.members).map((m) => [m.id, m]));
  const afterMembers = new Map(arrayOf(after.members).map((m) => [m.id, m]));
  for (const [memberId, m] of afterMembers)
    if (!beforeMembers.has(memberId))
      rows.push(change("members", `Membro aggiunto: ${m.name}`, `Member added: ${m.name}`));
  for (const [memberId, m] of beforeMembers)
    if (!afterMembers.has(memberId))
      rows.push(change("members", `Membro uscito: ${m.name}`, `Member gone: ${m.name}`));
  const beforeScenes = new Map(arrayOf(before.scenes).map((s) => [s.id, s]));
  const afterScenes = new Map(arrayOf(after.scenes).map((s) => [s.id, s]));
  for (const [sceneId, scene] of afterScenes) {
    const old = beforeScenes.get(sceneId);
    if (!old) {
      rows.push(change("scenes", `Scena nuova: «${scene.name}»`, `New scene: “${scene.name}”`));
      continue;
    }
    if (old.name !== scene.name)
      rows.push(
        change(
          "scenes",
          `Scena rinominata: «${old.name}» → «${scene.name}»`,
          `Scene renamed: “${old.name}” → “${scene.name}”`,
        ),
      );
    const oldTokens = new Map(arrayOf(old.tokens).map((t) => [t.id ?? t.actorId, t]));
    const newTokens = new Map(arrayOf(scene.tokens).map((t) => [t.id ?? t.actorId, t]));
    for (const [key, token] of newTokens) {
      const was = oldTokens.get(key);
      const who = nameOfActor(after, token.actorId);
      if (!was)
        rows.push(
          change(
            "scenes",
            `«${scene.name}»: pedina aggiunta (${who})`,
            `“${scene.name}”: token added (${who})`,
          ),
        );
      else if (was.x !== token.x || was.y !== token.y)
        rows.push(
          change(
            "scenes",
            `«${scene.name}»: ${who} spostato (${Math.round(was.x)}, ${Math.round(was.y)}) → (${Math.round(token.x)}, ${Math.round(token.y)})`,
            `“${scene.name}”: ${who} moved (${Math.round(was.x)}, ${Math.round(was.y)}) → (${Math.round(token.x)}, ${Math.round(token.y)})`,
          ),
        );
    }
    for (const [key, token] of oldTokens)
      if (!newTokens.has(key)) {
        const who = nameOfActor(before, token.actorId);
        rows.push(
          change(
            "scenes",
            `«${scene.name}»: pedina tolta (${who})`,
            `“${scene.name}”: token removed (${who})`,
          ),
        );
      }
    if (!same(old.walls ?? [], scene.walls ?? []))
      rows.push(
        change(
          "scenes",
          `«${scene.name}»: muri e porte modificati`,
          `“${scene.name}”: walls and doors changed`,
        ),
      );
    if ((old.background ?? null) !== (scene.background ?? null))
      rows.push(
        change("scenes", `«${scene.name}»: sfondo cambiato`, `“${scene.name}”: background changed`),
      );
    if (Boolean(old.revealed) !== Boolean(scene.revealed))
      rows.push(
        change(
          "scenes",
          scene.revealed
            ? `«${scene.name}»: ora mostrata ai giocatori`
            : `«${scene.name}»: ora nascosta ai giocatori`,
          scene.revealed
            ? `“${scene.name}”: now shown to players`
            : `“${scene.name}”: now hidden from players`,
        ),
      );
  }
  for (const [sceneId, scene] of beforeScenes)
    if (!afterScenes.has(sceneId))
      rows.push(
        change("scenes", `Scena eliminata: «${scene.name}»`, `Scene deleted: “${scene.name}”`),
      );
  const beforeActors = new Map(arrayOf(before.creatures).map((a) => [a.id, a]));
  const afterActors = new Map(arrayOf(after.creatures).map((a) => [a.id, a]));
  for (const [actorId, actor] of afterActors) {
    const old = beforeActors.get(actorId);
    if (!old) {
      rows.push(
        change("creatures", `Creatura nuova: ${actor.name}`, `New creature: ${actor.name}`),
      );
      continue;
    }
    if (old.hp !== actor.hp || old.maxHp !== actor.maxHp)
      rows.push(
        change(
          "creatures",
          `${actor.name}: PF ${old.hp}/${old.maxHp} → ${actor.hp}/${actor.maxHp}`,
          `${actor.name}: HP ${old.hp}/${old.maxHp} → ${actor.hp}/${actor.maxHp}`,
        ),
      );
    if (!same(old.conditions ?? [], actor.conditions ?? []))
      rows.push(
        change(
          "creatures",
          `${actor.name}: condizioni cambiate`,
          `${actor.name}: conditions changed`,
        ),
      );
    if (old.name !== actor.name)
      rows.push(
        change(
          "creatures",
          `Rinominata: ${old.name} → ${actor.name}`,
          `Renamed: ${old.name} → ${actor.name}`,
        ),
      );
    if (!same(old.inventory ?? [], actor.inventory ?? []))
      rows.push(
        change(
          "creatures",
          `${actor.name}: inventario cambiato`,
          `${actor.name}: inventory changed`,
        ),
      );
  }
  for (const [actorId, actor] of beforeActors)
    if (!afterActors.has(actorId))
      rows.push(
        change("creatures", `Creatura tolta: ${actor.name}`, `Creature removed: ${actor.name}`),
      );
  const title = (e) => e.data?.title || text(e.data?.body).slice(0, 40) || e.id;
  const beforeEntries = new Map(arrayOf(before.entries).map((e) => [e.id, e]));
  const afterEntries = new Map(arrayOf(after.entries).map((e) => [e.id, e]));
  for (const [id, entry] of afterEntries) {
    const old = beforeEntries.get(id);
    if (!old)
      rows.push(change("journal", `Voce nuova: «${title(entry)}»`, `New entry: “${title(entry)}”`));
    else if (!same(old.data, entry.data))
      rows.push(
        change("journal", `Voce modificata: «${title(entry)}»`, `Entry changed: “${title(entry)}”`),
      );
  }
  for (const [id, entry] of beforeEntries)
    if (!afterEntries.has(id))
      rows.push(
        change("journal", `Voce tolta: «${title(entry)}»`, `Entry removed: “${title(entry)}”`),
      );
  const sceneName = (id) =>
    arrayOf(after.scenes).find((s) => s.id === id)?.name ??
    arrayOf(before.scenes).find((s) => s.id === id)?.name ??
    id;
  for (const spec of CARRIED) {
    const a = before.linked?.[spec.slice]?.[spec.key] ?? {};
    const b = after.linked?.[spec.slice]?.[spec.key] ?? {};
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (same(a[id], b[id])) continue;
      if (spec.by === "campaign")
        rows.push(
          change(spec.component, `${spec.label.it}: modificati`, `${spec.label.en}: changed`),
        );
      else if (spec.by === "scene") {
        const name = sceneName(id);
        rows.push(change("scenes", `«${name}»: ${spec.label.it}`, `“${name}”: ${spec.label.en}`));
      } else {
        const name =
          nameOfActor(after, id) === id ? nameOfActor(before, id) : nameOfActor(after, id);
        rows.push(change("creatures", `${name}: ${spec.label.it}`, `${name}: ${spec.label.en}`));
      }
    }
  }
  for (const component of COMPONENTS)
    for (const area of areasOf(component)) {
      const a = before.areas?.[area]?.value;
      const b = after.areas?.[area]?.value;
      if (a === undefined && b === undefined) continue;
      if (!same(a, b))
        rows.push(
          change(
            component.id,
            `${component.label.it}: modificati`,
            `${component.label.en}: changed`,
          ),
        );
    }
  return rows;
}

// ---------------------------------------------------------------- export (Kanka SVC-084)

export function slug(value) {
  return (
    String(value ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "campagna"
  );
}
const MD = {
  it: {
    exported: "Esportazione di d20 Studio",
    by: "a cura di",
    rules: "Regole",
    tags: "Etichette",
    members: "Giocatori e ruoli",
    roles: {
      owner: "proprietario",
      "co-dm": "co-DM",
      player: "giocatore",
      observer: "osservatore",
    },
    scenes: "Scene e mappe",
    active: "in uso",
    publicText: "Per i giocatori",
    dmText: "Note del DM",
    grid: "Griglia",
    cell: "m per casella",
    tokens: "Pedine",
    creatures: "Creature e personaggi del DM",
    header: "| Nome | Tipo | Livello | PF | CA |",
    npc: "PNG",
    pc: "Personaggio",
    characters: "Personaggi dei giocatori (solo elenco)",
    player: "giocatore",
    journal: "Diario, mondo e missioni",
    kinds: { note: "Nota", world: "Mondo", quest: "Missione", recap: "Riassunto" },
    audience: {
      private: "solo io",
      dms: "solo DM",
      selected: "persone scelte",
      campaign: "tutta la campagna",
    },
    writtenBy: "di",
    untitled: "Senza titolo",
    handouts: "Materiali",
    dmOnly: "Solo DM",
    prep: "Preparazione delle sessioni",
    tables: "Tabelle casuali",
    weight: "peso",
    encounters: "Incontri preparati",
    loot: "Tesoro e scorta del gruppo",
    coins: "Monete",
    notIncluded: "Non incluso",
    ownPrivate: "note «Solo io» tue non incluse",
    sessions: "sessioni in calendario non incluse",
    missions: "Missioni e archivio",
    world: "Mappa del mondo e calendario",
    places: "Luoghi",
    events: "Eventi",
    types: {
      quest: "Missione",
      person: "Persona",
      organization: "Organizzazione",
      shop: "Negozio",
      place: "Luogo",
      event: "Evento",
      page: "Pagina",
    },
    statuses: {
      active: "in corso",
      available: "disponibile",
      completed: "completata",
      failed: "fallita",
      hidden: "nascosta",
    },
    secret: "Segreto",
  },
  en: {
    exported: "d20 Studio export",
    by: "by",
    rules: "Rules",
    tags: "Tags",
    members: "Players and roles",
    roles: { owner: "owner", "co-dm": "co-DM", player: "player", observer: "observer" },
    scenes: "Scenes and maps",
    active: "in use",
    publicText: "For players",
    dmText: "DM notes",
    grid: "Grid",
    cell: "m per square",
    tokens: "Tokens",
    creatures: "DM creatures and characters",
    header: "| Name | Kind | Level | HP | AC |",
    npc: "NPC",
    pc: "Character",
    characters: "Players' characters (list only)",
    player: "player",
    journal: "Journal, world and quests",
    kinds: { note: "Note", world: "World", quest: "Quest", recap: "Recap" },
    audience: {
      private: "only me",
      dms: "DMs only",
      selected: "chosen people",
      campaign: "whole campaign",
    },
    writtenBy: "by",
    untitled: "Untitled",
    handouts: "Materials",
    dmOnly: "DM only",
    prep: "Session prep",
    tables: "Random tables",
    weight: "weight",
    encounters: "Prepared encounters",
    loot: "Treasure and party stash",
    coins: "Coins",
    notIncluded: "Not included",
    ownPrivate: "of your “Only me” notes not included",
    sessions: "scheduled sessions not included",
    missions: "Missions and archive",
    world: "World map and calendar",
    places: "Places",
    events: "Events",
    types: {
      quest: "Quest",
      person: "Person",
      organization: "Organization",
      shop: "Shop",
      place: "Place",
      event: "Event",
      page: "Page",
    },
    statuses: {
      active: "in progress",
      available: "available",
      completed: "completed",
      failed: "failed",
      hidden: "hidden",
    },
    secret: "Secret",
  },
};
const cell = (value) =>
  String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");
/** Readable Markdown of a bundle (Kanka's Markdown export, CMP-210). */
export function bundleToMarkdown(bundle, lang = "it") {
  const w = MD[lang] ?? MD.it;
  const out = [];
  const p = bundle.profile ?? {};
  out.push(`# ${p.name}`, "");
  const locale = lang === "en" ? "en-GB" : "it-IT";
  const number = (value) => Number(value).toLocaleString(locale);
  const stamp = bundle.createdAt
    ? new Date(bundle.createdAt).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" })
    : "";
  out.push(
    `> ${w.exported} · ${stamp} · ${w.by} ${bundle.createdByName ?? ""}`,
    `> ${w.rules}: D&D 2024 · SRD 5.2.1`,
    "",
  );
  if (p.description) out.push(p.description, "");
  if (arrayOf(p.tags).length) out.push(`${w.tags}: ${p.tags.map((t) => `#${t}`).join(" ")}`, "");
  if (arrayOf(bundle.members).length) {
    out.push(`## ${w.members}`, "");
    for (const m of bundle.members) out.push(`- ${m.name} — ${w.roles[m.role] ?? m.role}`);
    out.push("");
  }
  if (arrayOf(bundle.scenes).length) {
    out.push(`## ${w.scenes}`, "");
    for (const scene of bundle.scenes) {
      out.push(`### ${scene.name}${scene.id === bundle.activeSceneId ? ` (${w.active})` : ""}`, "");
      if (scene.publicDescription) out.push(`**${w.publicText}:** ${scene.publicDescription}`, "");
      if (scene.description) out.push(`**${w.dmText}:** ${scene.description}`, "");
      out.push(
        `${w.grid}: ${number(scene.gridSize ?? 50)} px · ${number(scene.metersPerCell ?? 1.5)} ${w.cell} · ${number(scene.width)} × ${number(scene.height)}`,
        "",
      );
      const tokens = arrayOf(scene.tokens);
      if (tokens.length)
        out.push(
          `${w.tokens}: ${tokens.map((t) => `${nameOfActor(bundle, t.actorId)} (${Math.round(t.x)}, ${Math.round(t.y)})`).join(", ")}`,
          "",
        );
    }
  }
  if (arrayOf(bundle.creatures).length) {
    out.push(`## ${w.creatures}`, "", w.header, "| --- | --- | --- | --- | --- |");
    for (const a of bundle.creatures)
      out.push(
        `| ${cell(a.name)} | ${a.kind === "npc" ? w.npc : w.pc} | ${cell(a.level ?? "")} | ${a.hp}/${a.maxHp} | ${a.ac} |`,
      );
    out.push("");
  }
  if (arrayOf(bundle.characters).length) {
    out.push(`## ${w.characters}`, "");
    for (const c of bundle.characters)
      out.push(
        `- ${c.name} · ${text(c.className, lang)} ${c.level ?? ""} · ${w.player}: ${c.ownerName}`,
      );
    out.push("");
  }
  if (arrayOf(bundle.entries).length) {
    out.push(`## ${w.journal}`, "");
    for (const e of bundle.entries) {
      out.push(
        `### ${w.kinds[e.kind] ?? e.kind}: ${e.data.title || w.untitled}`,
        "",
        `_${w.writtenBy} ${e.ownerName ?? e.ownerId} · ${w.audience[e.access?.mode] ?? ""}_`,
        "",
      );
      if (e.data.body) out.push(e.data.body, "");
      for (const section of arrayOf(e.data.sections)) {
        out.push(`#### ${section.title || w.untitled}`, "");
        if (section.body) out.push(section.body, "");
      }
    }
  }
  const handouts = arrayOf(bundle.areas?.handouts?.value?.materials);
  if (handouts.length) {
    out.push(`## ${w.handouts}`, "");
    for (const m of handouts) {
      out.push(`### ${text(m.title, lang) || w.untitled}`, "");
      if (m.playerText) out.push(text(m.playerText, lang), "");
      if (m.dmNote) out.push(`**${w.dmOnly}:** ${text(m.dmNote, lang)}`, "");
      for (const s of arrayOf(m.sections)) {
        out.push(`#### ${text(s.heading, lang) || w.untitled}`, "");
        if (s.playerText) out.push(text(s.playerText, lang), "");
        if (s.dmText) out.push(`**${w.dmOnly}:** ${text(s.dmText, lang)}`, "");
      }
    }
  }
  const prep = arrayOf(bundle.areas?.["handouts-prep"]?.value?.sheets);
  if (prep.length) {
    out.push(`## ${w.prep}`, "");
    for (const sheet of prep) {
      out.push(`### ${text(sheet.title, lang) || w.untitled}`, "");
      if (sheet.strongStart) out.push(text(sheet.strongStart, lang), "");
      for (const secret of arrayOf(sheet.lists?.secrets)) out.push(`- ${text(secret.text, lang)}`);
      out.push("");
    }
  }
  const tables = arrayOf(bundle.areas?.["random-tables"]?.value?.tables);
  if (tables.length) {
    out.push(`## ${w.tables}`, "");
    for (const table of tables) {
      out.push(`### ${text(table.name, lang)}${table.sides ? ` (d${table.sides})` : ""}`, "");
      arrayOf(table.results).forEach((row, i) =>
        out.push(
          `${i + 1}. ${text(row.text, lang)}${row.weight > 1 ? ` (${w.weight} ${row.weight})` : ""}`,
        ),
      );
      out.push("");
    }
  }
  const encounters = arrayOf(bundle.areas?.["encounter-builder"]?.value?.encounters);
  if (encounters.length) {
    out.push(`## ${w.encounters}`, "");
    for (const enc of encounters) {
      out.push(`### ${text(enc.name, lang)}`, "");
      for (const row of arrayOf(enc.rows))
        out.push(`- ${row.count ?? 1} × ${row.creatureId ?? row.name ?? ""}`);
      if (enc.notes?.summary) out.push("", text(enc.notes.summary, lang));
      out.push("");
    }
  }
  const stash = bundle.areas?.loot?.value?.stash;
  if (stash) {
    out.push(`## ${w.loot}`, "");
    const coins = Object.entries(stash.coins ?? {}).filter(([, n]) => n);
    if (coins.length) out.push(`${w.coins}: ${coins.map(([k, n]) => `${n} ${k}`).join(", ")}`, "");
    for (const item of arrayOf(stash.items))
      out.push(`- ${text(item.name, lang)} × ${item.quantity ?? 1}`);
    out.push("");
  }
  // B43 missions and archive pages; B42 world maps, places and calendar events.
  for (const archive of linkedCampaigns(bundle, "quests")) {
    const pages = arrayOf(archive?.pages);
    if (!pages.length) continue;
    out.push(`## ${w.missions}`, "");
    for (const page of pages) {
      const status =
        page.type === "quest" && page.status ? ` (${w.statuses[page.status] ?? page.status})` : "";
      out.push(
        `### ${w.types[page.type] ?? w.types.page}: ${page.title || w.untitled}${status}`,
        "",
      );
      for (const block of arrayOf(page.blocks))
        if (block?.text)
          out.push(block.kind === "secret" ? `**${w.secret}:** ${block.text}` : block.text, "");
      for (const goal of arrayOf(page.objectives))
        if (goal?.text) out.push(`- [${goal.done ? "x" : " "}] ${goal.text}`);
      if (arrayOf(page.objectives).length) out.push("");
      if (page.dmNotes) out.push(`**${w.dmOnly}:** ${page.dmNotes}`, "");
    }
  }
  for (const world of linkedCampaigns(bundle, "world-map")) {
    const maps = arrayOf(world?.maps);
    const events = arrayOf(world?.events);
    if (!maps.length && !events.length) continue;
    out.push(`## ${w.world}`, "");
    for (const map of maps) {
      out.push(`### ${text(map?.name, lang) || w.untitled}`, "");
      const pins = arrayOf(world.pins).filter((pin) => pin?.mapId === map?.id);
      if (pins.length)
        out.push(`${w.places}: ${pins.map((pin) => text(pin.name, lang)).join(", ")}`, "");
    }
    if (events.length) {
      out.push(`### ${w.events}`, "");
      for (const event of events) {
        const date = event?.date
          ? `${event.date.day ?? ""} ${event.date.month ?? ""} ${event.date.year ?? ""}`.trim()
          : "";
        out.push(`- ${date ? `${date} · ` : ""}${text(event?.title, lang)}`);
      }
      out.push("");
    }
  }
  out.push(`## ${w.notIncluded}`, "");
  for (const line of NOT_CARRIED) out.push(`- ${line[lang] ?? line.it}`);
  if (bundle.left?.ownPrivate) out.push(`- ${bundle.left.ownPrivate} ${w.ownPrivate}`);
  if (bundle.left?.sessions) out.push(`- ${bundle.left.sessions} ${w.sessions}`);
  out.push("");
  return out.join("\n");
}

export function prepareExport(
  state,
  campaignId,
  { format = "json", includeOwnPrivate = false, lang = "it" } = {},
  who,
  now = Date.now(),
  { slices = [] } = {},
) {
  if (!["json", "markdown"].includes(format)) refuse("Formato non valido.", "Invalid format.");
  const bundle = captureBundle(state, campaignId, who, {
    slices,
    includeOwnPrivate: Boolean(includeOwnPrivate),
    now,
    purpose: "export",
  });
  const content =
    format === "json" ? JSON.stringify(bundle, null, 2) : bundleToMarkdown(bundle, lang);
  const date = iso(now).slice(0, 10);
  const slice = mine(state);
  pruneExports(slice, now);
  const row = {
    id: `export-${shortId()}`,
    campaignId,
    campaignName: bundle.profile.name,
    format,
    fileName: `${slug(bundle.profile.name)}-${date}.${format === "json" ? "d20campaign.json" : "md"}`,
    mime: format === "json" ? "application/json" : "text/markdown",
    createdAt: iso(now),
    expiresAt: iso(now + EXPORT_MINUTES * MINUTE),
    by: who,
    bytes: new TextEncoder().encode(content).length,
    includeOwnPrivate: Boolean(includeOwnPrivate),
    counts: summarizeBundle(bundle),
    content,
  };
  slice.exports.push(row);
  const mineRows = slice.exports.filter((r) => r.by === who);
  if (mineRows.length > EXPORTS_KEPT) {
    const drop = new Set(mineRows.slice(0, mineRows.length - EXPORTS_KEPT));
    slice.exports = slice.exports.filter((r) => !drop.has(r));
  }
  record(state, now, who, "export", campaignId, { format });
  return { id: row.id, fileName: row.fileName };
}
function pruneExports(slice, now) {
  slice.exports = slice.exports.filter((row) => Date.parse(row.expiresAt) > now);
}
// The ready exports of this identity only (Kanka notifies the admin who asked).
export function readyExports(state, who, now = Date.now()) {
  return newestFirst(
    sliceOf(state).exports.filter((row) => row.by === who && Date.parse(row.expiresAt) > now),
  );
}
export function exportFile(state, exportId, who, now = Date.now()) {
  const row = sliceOf(state).exports.find((r) => r.id === exportId && r.by === who);
  if (!row) refuse("Esportazione non disponibile.", "Export unavailable.");
  if (Date.parse(row.expiresAt) <= now)
    refuse(
      "Il file è scaduto dopo 120 minuti: preparane uno nuovo.",
      "The file expired after 120 minutes: prepare a new one.",
    );
  return { name: row.fileName, type: row.mime, content: row.content };
}

// ---------------------------------------------------------------- import

export function parseImportText(value) {
  const raw = String(value ?? "");
  if (raw.length > MAX_IMPORT_BYTES)
    refuse("Il file supera 8 MB.", "The file is larger than 8 MB.");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    refuse(
      "Il file non è JSON leggibile: scegli un’esportazione JSON di d20 Studio (il Markdown serve solo da leggere).",
      "The file is not readable JSON: choose a d20 Studio JSON export (Markdown is for reading only).",
    );
  }
  return validateBundle(parsed);
}
export function previewImport(bundle, { slices = [] } = {}) {
  const { bundle: b, warnings } = validateBundle(bundle);
  const loaded = new Map(arrayOf(slices).map((spec) => [spec.name, spec.version]));
  const areaWarnings = [];
  for (const [area, entry] of Object.entries(b.areas))
    if (!loaded.has(area))
      areaWarnings.push(
        L(
          `Dati «${area}»: l’area non è disponibile, ignorati.`,
          `“${area}” data: the area is not available, ignored.`,
        ),
      );
    else if (entry.version > loaded.get(area))
      areaWarnings.push(
        L(
          `Dati «${area}» di una versione più recente: ignorati.`,
          `“${area}” data from a newer version: ignored.`,
        ),
      );
  for (const [area, entry] of Object.entries(b.linked)) {
    const local = CARRIED.some((spec) => spec.slice === area && spec.local);
    if (local) continue;
    if (!loaded.has(area))
      areaWarnings.push(
        L(
          `Dati «${area}»: l’area non è disponibile, ignorati.`,
          `“${area}” data: the area is not available, ignored.`,
        ),
      );
    else if (entry.version > loaded.get(area))
      areaWarnings.push(
        L(
          `Dati «${area}» di una versione più recente: ignorati.`,
          `“${area}” data from a newer version: ignored.`,
        ),
      );
  }
  if (b.homebrew.length)
    areaWarnings.push(
      L(
        `Homebrew attivato nella campagna originale (${b.homebrew.length}): il file non lo contiene, riattivalo dalla Biblioteca.`,
        `Homebrew enabled in the original campaign (${b.homebrew.length}): the file does not hold it, enable it again from the Library.`,
      ),
    );
  const warningsAll = [...warnings, ...areaWarnings];
  if (b.members.length)
    warningsAll.push(
      L(
        "I giocatori del file non entrano: invitali con un link da Campagne.",
        "The file's players do not join: invite them with a link from Campaigns.",
      ),
    );
  return { bundle: b, counts: summarizeBundle(b), warnings: warningsAll };
}
export function importCampaign(
  state,
  bundle,
  { name, components } = {},
  who,
  now = Date.now(),
  { slices = [] } = {},
) {
  if (!cm.IDENTITIES.includes(who)) refuse("Identità non valida.", "Invalid identity.");
  const result = createFromBundle(state, bundle, {
    name,
    components,
    who,
    now,
    origin: "import",
    slices,
  });
  record(state, now, who, "import", result.campaignId, {
    sourceName: text(bundle?.profile?.name),
  });
  // P10 CA-75 (BG3 mod verification): the file names the homebrew its campaign used but
  // never carries it. What the Library holds is enabled in the new campaign; the rest is
  // remembered as missing, shown in Fonti with its action.
  const refs = arrayOf(bundle?.homebrew).filter(isRef);
  if (refs.length) {
    const deps = importDependencies(state, refs, who);
    const parked = state.ext?.["campaign-members"]?.parked?.[result.campaignId];
    const ready = deps.filter((row) => row.status !== "missing" && row.status !== "outdated");
    if (parked?.campaign) parked.campaign.enabledContent = ready.map((row) => clone(row.ref));
    const missing = deps.filter((row) => !ready.includes(row)).map((row) => clone(row.ref));
    if (missing.length) mine(state).missing[result.campaignId] = missing;
    result.dependencies = deps;
  }
  return result;
}
/**
 * The homebrew an imported campaign needs, checked against this identity's Library (the
 * adventures checker's states: ready, missing, outdated): one row and one action each.
 */
export function importDependencies(state, refs, who) {
  const library = listHomebrew(state, who);
  return arrayOf(refs)
    .filter(isRef)
    .map((ref) => {
      const content = library.find((row) => row.id === ref.contentId);
      const has = Boolean(content?.revisions.some((r) => r.id === ref.revisionId));
      return {
        ref: clone(ref),
        name: content ? clone(content.name) : null,
        status: !content ? "missing" : has ? "ready" : "outdated",
        action: has ? null : "library",
      };
    });
}
/** Missing homebrew references remembered for a campaign (Fonti's «mancante»). */
export const missingDependencies = (state, campaignId) =>
  arrayOf(state?.ext?.[ID]?.missing?.[campaignId]).filter(isRef);
/** Drops a missing reference once the campaign has it (Fonti switch turned on). */
export function clearMissingDependency(state, campaignId, contentId) {
  const slice = state?.ext?.[ID];
  if (!slice?.missing?.[campaignId]) return;
  slice.missing[campaignId] = slice.missing[campaignId].filter(
    (ref) => ref.contentId !== contentId,
  );
  if (!slice.missing[campaignId].length) delete slice.missing[campaignId];
}

// ---------------------------------------------------------------- archive and trash

export function archiveCampaign(state, campaignId, who, now = Date.now()) {
  cm.setCampaignStatus(state, campaignId, "archived", who, now);
  record(state, now, who, "archived", campaignId);
}
export function restoreArchived(state, campaignId, who, now = Date.now()) {
  if (cm.metaOf(state, campaignId)?.status !== "archived")
    refuse("La campagna non è archiviata.", "The campaign is not archived.");
  cm.setCampaignStatus(state, campaignId, "active", who, now);
  record(state, now, who, "restored", campaignId);
}
export function trashInfo(meta, now = Date.now()) {
  const deletedAt = Date.parse(meta?.deletedAt ?? "");
  if (!Number.isFinite(deletedAt)) return null;
  const purgeAt = deletedAt + TRASH_DAYS * DAY;
  return {
    deletedAt: iso(deletedAt),
    purgeAt: iso(purgeAt),
    daysLeft: Math.max(0, Math.ceil((purgeAt - now) / DAY)),
    expired: now >= purgeAt,
  };
}
// The trash of this identity: deleted campaigns it owns, with the recovery window.
export function listTrash(state, who, now = Date.now()) {
  return cm
    .listCampaigns(state, who, { status: "deleted" }, now)
    .map((row) => ({ ...row, trash: trashInfo(cm.metaOf(state, row.id), now) }))
    .filter((row) => row.trash);
}
export function deleteCampaign(
  state,
  campaignId,
  confirmName,
  who,
  now = Date.now(),
  { closeCurrent = false } = {},
) {
  // P10 CA-85: the campaign in play is deleted after the explicit step of closing it
  // (archived first, in the same command, when the DM ticks "close the campaign in play").
  if (
    closeCurrent &&
    state.campaign?.id === campaignId &&
    cm.metaOf(state, campaignId)?.status === "active"
  ) {
    if (!cm.sameCampaignName(confirmName, cm.coreCampaign(state, campaignId)?.name ?? ""))
      refuse(
        "Scrivi esattamente il nome della campagna per confermare (trattini, virgolette, spazi e maiuscole non contano).",
        "Type the campaign name exactly to confirm (dashes, quotes, spaces and capitals do not matter).",
      );
    cm.setCampaignStatus(state, campaignId, "archived", who, now);
  }
  cm.setCampaignStatus(state, campaignId, "deleted", who, now, { confirmName });
  record(state, now, who, "deleted", campaignId);
}
export function recoverCampaign(state, campaignId, who, now = Date.now()) {
  const meta = cm.metaOf(state, campaignId);
  if (meta?.status !== "deleted")
    refuse("La campagna non è nel cestino.", "The campaign is not in the trash.");
  requireOwner(state, campaignId, who);
  if (trashInfo(meta, now)?.expired)
    refuse(
      "Il periodo di recupero di 30 giorni è scaduto.",
      "The 30-day recovery period has expired.",
    );
  cm.setCampaignStatus(state, campaignId, "active", who, now);
  record(state, now, who, "recovered", campaignId);
}
// Removes a campaign for good: its record, parked data, journal entries, snapshots and
// exports, and the creatures that belonged only to it. Players' sheets are kept and only
// leave the campaign (DDB: a character outlives the campaign).
function removeCampaign(state, campaignId) {
  const b13 = state.ext?.["campaign-members"];
  const meta = b13?.campaigns?.[campaignId];
  const ownerId = meta?.ownerId;
  let creatures = 0;
  const removedActors = [];
  for (const [actorId, actor] of Object.entries(state.actors ?? {})) {
    if (!actor || !Array.isArray(actor.campaignIds) || !actor.campaignIds.includes(campaignId))
      continue;
    const only = actor.campaignIds.length === 1;
    const campaignCreature =
      actor.owner === ownerId &&
      (actor.kind === "npc" || actor.dataCopy?.campaignId === campaignId);
    if (only && campaignCreature) {
      delete state.actors[actorId];
      removedActors.push(actorId);
      creatures++;
    } else actor.campaignIds = actor.campaignIds.filter((id) => id !== campaignId);
  }
  // Journal, world, quest and recap entries go with the campaign. A note is its author's
  // personal writing: it stays theirs, without campaign and private again ("Solo io").
  let notesKept = 0;
  if (state.campaignContent?.entries)
    state.campaignContent.entries = state.campaignContent.entries.filter((entry) => {
      if (entry.campaignId !== campaignId) return true;
      if (entry.kind !== "note") return false;
      entry.campaignId = null;
      if (entry.access?.mode !== "private" || entry.access.grants?.length) {
        entry.access = { mode: "private", grants: [] };
        entry.accessRevision = (entry.accessRevision ?? 0) + 1;
      }
      notesKept++;
      return true;
    });
  // Area data kept for this campaign, its scenes and its removed creatures (LINKED). A
  // scene id still used by another campaign (copies made before scenes had their own id)
  // keeps its data.
  const sceneIds = arrayOf(b13?.parked?.[campaignId]?.scenes).map((scene) => scene.id);
  if (b13) {
    delete b13.campaigns[campaignId];
    delete b13.parked[campaignId];
  }
  const removed = {
    campaign: [campaignId],
    scene: sceneIds.filter((id) => !sceneIdTaken(state, id)),
    actor: removedActors,
  };
  for (const spec of LINKED) {
    const records = linkedRecords(state, spec);
    if (records) for (const id of removed[spec.by]) delete records[id];
  }
  const slice = mine(state);
  slice.snapshots = slice.snapshots.filter((row) => row.campaignId !== campaignId);
  slice.exports = slice.exports.filter((row) => row.campaignId !== campaignId);
  return { creatures, notesKept };
}
export function purgeCampaign(state, campaignId, confirmName, who, now = Date.now()) {
  const meta = cm.metaOf(state, campaignId);
  if (meta?.status !== "deleted")
    refuse(
      "Solo una campagna nel cestino si elimina definitivamente.",
      "Only a campaign in the trash can be deleted for good.",
    );
  requireOwner(state, campaignId, who);
  if (state.campaign?.id === campaignId)
    refuse(
      "È la campagna in corso: avviane un’altra prima di eliminarla per sempre. Nel cestino resta recuperabile per 30 giorni.",
      "It is the campaign in play: launch another one before deleting it for good. In the trash it stays recoverable for 30 days.",
    );
  const name = cm.coreCampaign(state, campaignId)?.name ?? "";
  if (!cm.sameCampaignName(confirmName, name))
    refuse(
      "Scrivi esattamente il nome della campagna per confermare (trattini, virgolette, spazi e maiuscole non contano).",
      "Type the campaign name exactly to confirm (dashes, quotes, spaces and capitals do not matter).",
    );
  const result = removeCampaign(state, campaignId);
  record(state, now, who, "purged", campaignId, { campaignName: name });
  return result;
}
// Campaigns whose 30 days are over leave for good at the next data command.
export function purgeExpired(state, now = Date.now()) {
  const b13 = state.ext?.["campaign-members"];
  const names = [];
  for (const [campaignId, meta] of Object.entries(b13?.campaigns ?? {})) {
    if (meta?.status !== "deleted" || !trashInfo(meta, now)?.expired) continue;
    const name = cm.coreCampaign(state, campaignId)?.name ?? "";
    removeCampaign(state, campaignId);
    record(state, now, meta.ownerId, "purged-expired", campaignId, { campaignName: name });
    names.push(name);
  }
  return names;
}

// ---------------------------------------------------------------- copy between campaigns

// Own campaigns a scene can go to (Transmogrifier's destination picker): managed by
// `who`, not the source; archived ones are listed but refused.
export function copyTargets(state, who, sourceId = state.campaign?.id) {
  return ["active", "archived"]
    .flatMap((status) => cm.listCampaigns(state, who, { status }))
    .filter((row) => row.id !== sourceId && cm.canManage(state, row.id, who))
    .map((row) => ({ id: row.id, name: row.name, status: row.status }));
}
// The creature copy already in the target campaign for `actor`: found by its origin, as
// Transmogrifier recognises an object copied before (R20-067); otherwise a new id.
function creatureCopyIn(state, actor, targetId) {
  const origin = actor.dataCopy?.from ?? actor.id;
  const found = Object.values(state.actors ?? {}).find(
    (row) =>
      row &&
      row.id !== actor.id &&
      Array.isArray(row.campaignIds) &&
      row.campaignIds.includes(targetId) &&
      (row.dataCopy?.from ?? row.id) === origin,
  );
  if (found) return { copyId: found.id, exists: true };
  let copyId = `${actor.id}--${targetId}`.slice(0, 200);
  while (state.actors?.[copyId]) copyId = `${actor.id}--${targetId}-${shortId().slice(0, 4)}`;
  return { copyId, exists: false };
}
export function previewSceneCopy(state, { sceneId, targetId } = {}, who) {
  const sourceId = state.campaign?.id;
  requireManager(state, sourceId, who);
  requireActive(state, sourceId);
  const scene = (state.scenes ?? []).find((s) => s.id === sceneId);
  if (!scene) refuse("Scena non disponibile.", "Scene unavailable.");
  if (!targetId || targetId === sourceId)
    refuse("Scegli un’altra delle tue campagne.", "Choose another of your campaigns.");
  if (!cm.coreCampaign(state, targetId))
    refuse("Campagna non disponibile.", "Campaign unavailable.");
  requireManager(state, targetId, who);
  requireActive(state, targetId, true);
  const target = sourceOf(state, targetId);
  const managers = managerIds(state, sourceId);
  // The same scene: the same id (copies made before scenes had their own) or the same root.
  const root = sceneRoot(scene);
  const existing = target.scenes.find((s) => s.id === scene.id || sceneRoot(s) === root) ?? null;
  const kept = [];
  const dropped = [];
  const creatures = new Map();
  for (const token of arrayOf(scene.tokens)) {
    const actor = token.actorId ? state.actors?.[token.actorId] : null;
    if (token.actorId && !isCreature(actor, managers)) {
      dropped.push(actor && actor.visibility !== "private" ? actor.name : "—");
      continue;
    }
    kept.push(actor?.name ?? token.id);
    if (actor && !creatures.has(actor.id))
      creatures.set(actor.id, {
        from: actor.id,
        name: actor.name,
        ...creatureCopyIn(state, actor, targetId),
      });
  }
  return {
    scene: { id: scene.id, name: scene.name },
    target: { id: targetId, name: target.campaign?.name ?? "" },
    existing: existing
      ? { id: existing.id, name: existing.name, copiedAt: existing.dataCopy?.at ?? null }
      : null,
    kept,
    dropped,
    creatures: [...creatures.values()],
  };
}
// Carried area data (LINKED) of one scene or creature, written again under the copy's id.
function copyLinkedRecord(state, by, fromId, toId, slices) {
  const loaded = new Set(arrayOf(slices).map((spec) => spec.name));
  for (const spec of CARRIED.filter((s) => s.by === by)) {
    const records = linkedRecords(state, spec);
    if (!loaded.has(spec.slice) || !records) continue;
    if (isObject(records[fromId])) records[toId] = clone(records[fromId]);
    else delete records[toId];
  }
}
export function copySceneTo(
  state,
  { sceneId, targetId, mode = "replace" } = {},
  who,
  now = Date.now(),
  { slices = [] } = {},
) {
  const preview = previewSceneCopy(state, { sceneId, targetId }, who);
  if (!["replace", "new"].includes(mode))
    refuse(
      "Scegli se sostituire la scena o aggiungerla come nuova.",
      "Choose whether to replace the scene or add it as a new one.",
    );
  const replace = Boolean(preview.existing) && mode === "replace";
  // Roll20 advises copying before an overwrite (SVC-078): a snapshot of the destination
  // is taken first, restorable as a copy.
  if (replace)
    takeSnapshot(
      state,
      targetId,
      {
        kind: "auto",
        label: L(
          `Prima della copia di «${preview.scene.name}»`,
          `Before copying “${preview.scene.name}”`,
        ),
      },
      who,
      now,
      { slices },
    );
  const target = state.ext["campaign-members"].parked[targetId];
  const scene = state.scenes.find((s) => s.id === sceneId);
  const copy = clone(scene);
  // Replace in place (same id in the target); otherwise the scene's own new id. "Add it
  // as a new scene" starts a separate lineage, so it is not the same scene any more.
  if (replace) {
    copy.id = preview.existing.id;
    copy.dataCopy = { root: sceneRoot(scene), from: scene.id, fromCampaign: state.campaign.id };
  } else if (preview.existing) {
    let n = 2;
    while (target.scenes.some((s) => s.name === `${scene.name} (${n})`)) n++;
    copy.id = freshSceneId(state, targetId, `${scene.id}-${n}`);
    copy.name = `${scene.name} (${n})`;
    copy.dataCopy = { root: copy.id, from: scene.id, fromCampaign: state.campaign.id };
  } else {
    copy.id = freshSceneId(state, targetId, scene.id);
    copy.dataCopy = { root: sceneRoot(scene), from: scene.id, fromCampaign: state.campaign.id };
  }
  copy.dataCopy.at = iso(now);
  const map = new Map(preview.creatures.map((c) => [c.from, c.copyId]));
  copy.tokens = arrayOf(copy.tokens)
    .filter((token) => !token.actorId || map.has(token.actorId))
    .map((token) => (token.actorId ? { ...token, actorId: map.get(token.actorId) } : token));
  const members = new Set(cm.membersOf(state, targetId).map((m) => m.id));
  if (Array.isArray(copy.revealedTo))
    copy.revealedTo = copy.revealedTo.filter((m) => members.has(m));
  for (const creature of preview.creatures)
    if (!creature.exists || replace) {
      state.actors[creature.copyId] = copyActor(
        state.actors[creature.from],
        creature.copyId,
        targetId,
        who,
        now,
        "scene-copy",
      );
      copyLinkedRecord(state, "actor", creature.from, creature.copyId, slices);
    }
  copyLinkedRecord(state, "scene", scene.id, copy.id, slices);
  const index = target.scenes.findIndex((s) => s.id === copy.id);
  if (index >= 0) target.scenes[index] = copy;
  else target.scenes.push(copy);
  record(state, now, who, "scene-copy", state.campaign.id, {
    sceneName: scene.name,
    targetId,
    targetName: preview.target.name,
    replaced: replace,
  });
  return {
    sceneId: copy.id,
    replaced: replace,
    tokens: copy.tokens.length,
    dropped: preview.dropped.length,
  };
}

// ---------------------------------------------------------------- gameplay Undo

// Data commands are not undoable, but they write LINKED records into areas whose slices
// Undo restores ("snapshot"): the change is replayed on the snapshots still in the undo
// stack (like B13's membership delta), so an earlier Undo never takes a copy's missions,
// lights or looks away, nor brings a purged campaign's back.
// ---------------------------------------------------------------- copy any item (CA-88)

// Roll20 Transmogrifier (R20-067): any journal item goes to another own campaign, with a
// warning when a copy is already there. World and Journal entries, creatures, handouts,
// random tables, card decks and enabled homebrew; scenes keep their own flow above.
export const ITEM_KINDS = Object.freeze([
  Object.freeze({
    kind: "entry",
    label: L("Voce del Mondo o del Diario", "World or Journal entry"),
  }),
  Object.freeze({ kind: "creature", label: L("Creatura", "Creature") }),
  Object.freeze({ kind: "handout", label: L("Dispensa", "Handout") }),
  Object.freeze({ kind: "table", label: L("Tabella casuale", "Random table") }),
  Object.freeze({ kind: "deck", label: L("Mazzo di carte", "Card deck") }),
  Object.freeze({ kind: "homebrew", label: L("Contenuto homebrew", "Homebrew content") }),
  // R8 hand-off: the Archive's typed pages (B43 journal-plus, slice "quests" per campaign).
  Object.freeze({ kind: "page", label: L("Pagina dell’Archivio", "Archive page") }),
]);
const ARCHIVE_SLICE = "quests";
const archivePages = (ext, campaignId) =>
  arrayOf(ext?.[ARCHIVE_SLICE]?.campaigns?.[campaignId]?.pages);
const specMap = (slices) => Object.fromEntries(arrayOf(slices).map((spec) => [spec.name, spec]));
const titleOf = (value) => (isObject(value) ? (value.it ?? value.en ?? "") : String(value ?? ""));
/** What the campaign in play can send to another campaign, per kind, with a name. */
export function copyableItems(state, who) {
  const campaignId = state.campaign?.id;
  if (!canUse(state, who, campaignId)) return [];
  const items = [];
  for (const entry of listCampaignEntries(state, { campaignId }, who))
    if (["world", "recap", "quest"].includes(entry.kind) && entry.ownerId === who)
      items.push({
        kind: "entry",
        id: entry.id,
        name: text(entry.data?.title) || L("Voce senza titolo", "Untitled entry"),
      });
  const managers = managerIds(state, campaignId);
  for (const actor of Object.values(state.actors ?? {}))
    if (actor && inCampaign(actor, campaignId) && isCreature(actor, managers))
      items.push({ kind: "creature", id: actor.id, name: actor.name });
  for (const material of arrayOf(state.ext?.handouts?.materials))
    items.push({ kind: "handout", id: material.id, name: text(material.title) || material.id });
  for (const table of arrayOf(state.ext?.["random-tables"]?.tables))
    items.push({ kind: "table", id: table.id, name: titleOf(table.name) || table.id });
  for (const deck of arrayOf(state.ext?.["random-tables"]?.decks))
    items.push({ kind: "deck", id: deck.id, name: titleOf(deck.name) || deck.id });
  const library = listHomebrew(state, who);
  for (const ref of arrayOf(state.campaign?.enabledContent)) {
    const content = library.find((row) => row.id === ref.contentId);
    if (content) items.push({ kind: "homebrew", id: ref.contentId, name: titleOf(content.name) });
  }
  // The Archive is the DM's (journal-plus requireDM): its managers send its pages.
  if (managers.has(who))
    for (const page of archivePages(state.ext, campaignId))
      if (page && typeof page.id === "string")
        items.push({ kind: "page", id: page.id, name: String(page.title ?? page.id) });
  return items;
}
function sourceItem(state, kind, id, who) {
  const item = copyableItems(state, who).find((row) => row.kind === kind && row.id === id);
  if (!item) refuse("Elemento non disponibile.", "Item unavailable.");
  return item;
}
const sameOrigin = (row, id) => (row?.copiedFrom ?? row?.id) === id;
/** What a copy would do (Transmogrifier's warning when the target already has a copy). */
export function previewItemCopy(state, { kind, id, targetId } = {}, who, { slices = [] } = {}) {
  const item = sourceItem(state, kind, id, who);
  const target = copyTargets(state, who).find((row) => row.id === targetId);
  if (!target)
    refuse(
      "Scegli una tua campagna di destinazione.",
      "Choose one of your campaigns as destination.",
    );
  requireActive(state, targetId, true);
  const view = campaignView(state, targetId, specMap(slices));
  let exists = false;
  if (kind === "entry")
    exists = arrayOf(state.campaignContent?.entries).some(
      (entry) =>
        entry.campaignId === targetId &&
        entry.revisions?.some((revision) => (revision.data?.copiedFrom ?? null) === id),
    );
  else if (kind === "creature") exists = creatureCopyIn(state, state.actors[id], targetId).exists;
  else if (kind === "handout")
    exists = arrayOf(view?.read("handouts")?.materials).some((row) => sameOrigin(row, id));
  else if (kind === "table")
    exists = arrayOf(view?.read("random-tables")?.tables).some((row) => sameOrigin(row, id));
  else if (kind === "deck")
    exists = arrayOf(view?.read("random-tables")?.decks).some((row) => sameOrigin(row, id));
  else if (kind === "page")
    exists = arrayOf(view?.read(ARCHIVE_SLICE)?.campaigns?.[targetId]?.pages).some((row) =>
      sameOrigin(row, id),
    );
  else exists = arrayOf(view?.campaign?.enabledContent).some((ref) => ref.contentId === id);
  return { ...item, targetId, targetName: target.name, exists };
}
const freshId = (list, base) => {
  let id = `${base}-${shortId().slice(0, 5)}`;
  while (list.some((row) => row.id === id)) id = `${base}-${shortId().slice(0, 5)}`;
  return id;
};
/** Copies one item into another own campaign; an existing copy is kept, never overwritten. */
export function copyItemTo(
  state,
  { kind, id, targetId } = {},
  who,
  now = Date.now(),
  { slices = [] } = {},
) {
  const preview = previewItemCopy(state, { kind, id, targetId }, who, { slices });
  if (kind === "homebrew" && preview.exists)
    refuse("La campagna usa già questo contenuto.", "The campaign already uses this content.");
  const view = campaignView(state, targetId, specMap(slices));
  let copyId = null;
  if (kind === "entry") {
    // Written like a copied campaign's entries (createFromBundle): the copy is the DM's, in
    // the other campaign, with its campaign-wide or private access; no grants to people of
    // this campaign and no links back into it.
    const entry = getCampaignEntry(state, id, who);
    const store = (state.campaignContent ??= { version: 1, entries: [], drafts: [] });
    const access = clone(entry.access ?? { mode: "private", grants: [] });
    access.grants = [];
    const data = clone(entry.data);
    data.links = [];
    data.sessionId = null;
    data.copiedFrom = entry.data?.copiedFrom ?? entry.id;
    data.sections = arrayOf(data.sections).map((section) => ({
      ...section,
      access: isObject(section.access) ? { ...clone(section.access), grants: [] } : clone(access),
    }));
    copyId = entryId(targetId, `${entry.id}-${shortId().slice(0, 4)}`);
    const revisionId = `revision-${copyId}`.slice(0, 200);
    store.entries.push({
      id: copyId,
      kind: entry.kind,
      campaignId: targetId,
      ownerId: who,
      access,
      accessRevision: 0,
      currentRevisionId: revisionId,
      revisions: [
        {
          id: revisionId,
          parentRevisionId: null,
          authorId: who,
          createdAt: iso(now),
          data,
          audience: [who],
          sectionAudience: {},
          provenance: {
            kind: "item-copy",
            from: entry.id,
            sourceCampaign: state.campaign?.name ?? "",
          },
        },
      ],
      historyAccess: {},
      createdAt: iso(now),
      updatedAt: iso(now),
    });
  } else if (kind === "creature") {
    const actor = state.actors[id];
    const { copyId: newId, exists } = creatureCopyIn(state, actor, targetId);
    copyId = exists ? uniqueActorId(state, actor.id) : newId;
    state.actors[copyId] = copyActor(actor, copyId, targetId, who, now, "item-copy");
  } else if (kind === "handout") {
    const source = arrayOf(state.ext?.handouts?.materials).find((row) => row.id === id);
    const target = view.write("handouts");
    target.materials ??= [];
    const copy = clone(source);
    copy.id = freshId(target.materials, source.id);
    copy.copiedFrom = source.copiedFrom ?? source.id;
    // A copy starts unseen in the other campaign: no shows, answers or links to its scenes.
    Object.assign(copy, {
      shows: [],
      responses: [],
      outcome: null,
      corrections: [],
      sceneIds: [],
      actorId: null,
    });
    target.materials.push(copy);
    copyId = copy.id;
  } else if (kind === "table" || kind === "deck") {
    const list = kind === "table" ? "tables" : "decks";
    const source = arrayOf(state.ext?.["random-tables"]?.[list]).find((row) => row.id === id);
    const target = view.write("random-tables");
    target[list] ??= [];
    let copy = clone(source);
    copy.id = freshId(target[list], source.id);
    copy.copiedFrom = source.copiedFrom ?? source.id;
    if (kind === "deck")
      copy = {
        ...normalizeDeck({
          ...copy,
          pile: [],
          hands: {},
          table: [],
          discard: [],
          events: [],
          shuffled: false,
        }),
        copiedFrom: copy.copiedFrom,
      };
    target[list].push(copy);
    copyId = copy.id;
  } else if (kind === "page") {
    // Like a copied handout, the page starts unseen: readers chosen by character, revealed
    // secrets and links into this campaign (parent, elements, quest giver, deliveries) stay here.
    const source = archivePages(state.ext, state.campaign?.id).find((row) => row.id === id);
    const slice = view.write(ARCHIVE_SLICE);
    slice.campaigns ??= {};
    const archive = (slice.campaigns[targetId] ??= {
      pages: [],
      standings: [],
      relations: [],
      views: [],
      notes: {},
      dismissed: [],
    });
    archive.pages ??= [];
    const unseen = (recipients) =>
      recipients?.mode === "all" ? { mode: "all", actorIds: [] } : { mode: "none", actorIds: [] };
    const copy = clone(source);
    copy.id = freshId(archive.pages, source.id);
    copy.copiedFrom = source.copiedFrom ?? source.id;
    copy.parentId = null;
    copy.elements = [];
    copy.access = unseen(source.access);
    copy.blocks = arrayOf(copy.blocks).map((block) =>
      block.kind === "secret"
        ? { ...block, reveal: { mode: "none", actorIds: [] }, revealedAt: null }
        : block,
    );
    if (copy.type === "quest") {
      copy.giver = null;
      copy.rewards = arrayOf(copy.rewards).map((reward) => ({ ...reward, deliveries: [] }));
    }
    // Page titles are unique in an archive (journal-plus): a clash gets a number.
    const taken = new Set(archive.pages.map((row) => String(row.title).trim().toLowerCase()));
    let title = String(copy.title);
    for (let n = 2; taken.has(title.trim().toLowerCase()); n++) title = `${copy.title} (${n})`;
    copy.title = title;
    archive.pages.push(copy);
    copyId = copy.id;
  } else {
    const ref = arrayOf(state.campaign?.enabledContent).find((row) => row.contentId === id);
    view.campaign.enabledContent = [...arrayOf(view.campaign.enabledContent), clone(ref)];
    copyId = id;
  }
  record(state, now, who, "item-copy", state.campaign.id, {
    itemKind: kind,
    itemName: typeof preview.name === "object" ? preview.name.it : preview.name,
    targetName: preview.targetName,
  });
  return { ...preview, copyId };
}

export function linkedState(state) {
  const out = {};
  for (const spec of LINKED) {
    const records = linkedRecords(state, spec);
    if (records) (out[spec.slice] ??= {})[spec.key] = clone(records);
  }
  return out;
}
export function linkedDelta(before, after) {
  const changes = [];
  for (const spec of LINKED) {
    const a = before?.[spec.slice]?.[spec.key] ?? {};
    const b = linkedRecords(after, spec) ?? {};
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (same(a[id], b[id])) continue;
      changes.push(
        Object.hasOwn(b, id)
          ? { slice: spec.slice, key: spec.key, id, value: clone(b[id]) }
          : { slice: spec.slice, key: spec.key, id, deleted: true },
      );
    }
  }
  return changes;
}
export function applyLinkedDelta(snapshot, changes) {
  for (const change of arrayOf(changes)) {
    const area = snapshot?.ext?.[change.slice];
    if (!isObject(area)) continue;
    if (!isObject(area[change.key])) area[change.key] = {};
    if (change.deleted) delete area[change.key][change.id];
    else area[change.key][change.id] = clone(change.value);
  }
}

// ---------------------------------------------------------------- activity

// Data activity readable by this identity: its own commands and those on campaigns it
// manages now.
export function activityFor(state, who) {
  return sliceOf(state)
    .log.filter((row) => row.by === who || cm.canManage(state, row.campaignId, who))
    .slice()
    .reverse();
}
