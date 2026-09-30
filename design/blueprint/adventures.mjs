// B49 — Adventures and reusable packages (Library).
//
// An adventure is a versioned package of a campaign's scenes (with pins), NPCs, handouts,
// random tables and encounters, copied from the campaign in play (Foundry Adventure
// documents, FVT-177; Module Maker FVT-178). Each version is an immutable snapshot of the
// initial state: full HP, hidden scenes, materials never shown. Import copies it into
// another campaign by type, with an overwrite warning (FVT-177) and the optional dnd5e
// actions "activate the start scene" and "show the introduction" (FVT-005). References are
// rebuilt on import (Scene Packer FVT-179): tokens to the imported NPCs, pins and handouts
// to scenes, subtables, encounter creatures. Every campaign plays its own copy (Alchemy
// universe vs in-game content, VTL-079). A new version is built with Foundry's Rebuild
// (added green, removed red, FVT-177) and patch notes; an update overwrites only entries
// the campaign did not change and offers a copy of the new version beside a changed one
// (Roll20 addon patches, R20-186 / SVC-132). Homebrew the package requires is checked on
// entry with one action per entry (BG3 mod verification window, CRP-171). "Create game
// with module" (Roll20 R20-187, Foundry quickstart FVT-004) starts a new campaign from the
// package, and a book export renders printable HTML (Shard, VTL-199).

import { isCampaignActor } from "./character-access.mjs";
import {
  applyHomebrewDraft,
  createHomebrewImportDraft,
  enableHomebrewRevision,
  exportHomebrewBundle,
  listHomebrew,
  previewHomebrewDraft,
} from "./homebrew.mjs";
import { builtInArt } from "./handouts-art.mjs";
import { CREATURES, SRD_ATTRIBUTION, LABELS as SRD_LABELS } from "./srd-sample.mjs";
import * as members from "./campaign-members.mjs";
import {
  WORLD_TYPES,
  applyCampaignDraft,
  createCampaignDraft,
  createCampaignEntryNow,
  getCampaignEntry,
  listCampaignEntries,
  previewCampaignDraft,
  saveCampaignDraft,
} from "./campaign-content.mjs";
import { sampleDate } from "./sample-clock.mjs";
import { searchPackEntries } from "./compat-packs.mjs";

export const ID = "adventures";
export const VERSION = 1;
const MEMBERS = "campaign-members";
const L = (it, en) => ({ it, en });
const clone = (value) => structuredClone(value);
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const arr = (value) => (Array.isArray(value) ? value : []);
const str = (value) => (typeof value === "string" ? value : "");
const nowIso = () => new Date().toISOString();
const rand = () => globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8);

/** A refusal shown in the current language (ctx.commit marks plain Errors as refusals). */
export function refuse(it, en) {
  throw Object.assign(new Error(en), { it, en });
}
function requireDM(role) {
  if (role !== "dm")
    refuse(
      "Solo il DM prepara, importa e aggiorna le avventure.",
      "Only the DM prepares, imports and updates adventures.",
    );
}
function cleanText(value, max, name, required = false) {
  const text = str(value).trim();
  if (required && !text) refuse(`${name.it}: campo obbligatorio.`, `${name.en}: required field.`);
  if (text.length > max)
    refuse(`${name.it}: massimo ${max} caratteri.`, `${name.en}: at most ${max} characters.`);
  return text;
}

// ---------------------------------------------------------------- types and keys

// BI-40 (Alchemy: world content beside the in-game content): "world" carries the campaign
// World's places, factions, events and other entries; it imports into the campaign in play.
export const TYPES = Object.freeze(["scene", "npc", "material", "table", "encounter", "world"]);
// The area slice a type is written into; scenes and NPCs are core records.
export const TYPE_SLICE = Object.freeze({
  scene: null,
  npc: null,
  material: "handouts",
  table: "random-tables",
  encounter: "encounter-builder",
  world: null,
});
export const TYPE_NAMES = Object.freeze({
  scene: [L("Scena", "Scene"), L("Scene", "Scenes")],
  npc: [L("PNG", "NPC"), L("PNG", "NPCs")],
  material: [L("Materiale", "Material"), L("Materiali", "Materials")],
  table: [L("Tabella", "Table"), L("Tabelle", "Tables")],
  encounter: [L("Incontro", "Encounter"), L("Incontri", "Encounters")],
  world: [L("Voce del mondo", "World entry"), L("Voci del mondo", "World entries")],
});
export const keyOf = (type, id) => `${type}:${id}`;
export function splitKey(key) {
  const text = str(key);
  const at = text.indexOf(":");
  return at < 0 ? ["", ""] : [text.slice(0, at), text.slice(at + 1)];
}
const labelText = (value, lang = "it") =>
  isObject(value) ? str(value[lang]) || str(value.it) || str(value.en) : str(value);
const suffixed = (name, suffix) =>
  !suffix
    ? name
    : isObject(name)
      ? Object.fromEntries(Object.entries(name).map(([k, v]) => [k, `${v}${suffix}`]))
      : `${str(name)}${suffix}`;

// ---------------------------------------------------------------- hashing

const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : isObject(value)
      ? Object.fromEntries(
          Object.keys(value)
            .filter((key) => value[key] !== undefined)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
/** Stable FNV-1a fingerprint of a JSON value (key order does not matter). */
export function hashOf(value) {
  let hash = 2166136261;
  for (const c of JSON.stringify(canonical(value ?? null)))
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}
const pick = (obj, keys) => Object.fromEntries(keys.map((key) => [key, obj?.[key]]));
// What counts as a change made in the campaign: authored values and play progress alike
// (a moved token or a damaged NPC is the group's progress, never overwritten by an update).
const PROJECTION = {
  scene: (s) => ({
    ...pick(s, [
      "name",
      "description",
      "publicDescription",
      "gridSize",
      "metersPerCell",
      "width",
      "height",
      "gridVisible",
      "gridSnap",
      "gridOffsetX",
      "gridOffsetY",
      "background",
      "template",
      "walls",
      "terrain",
      "revealed",
    ]),
    tokens: arr(s?.tokens).map((t) => [t.actorId, t.x, t.y]),
  }),
  npc: (a) =>
    pick(a, [
      "name",
      "className",
      "level",
      "hp",
      "maxHp",
      "ac",
      "speed",
      "abilities",
      "inventory",
      "notes",
      "conditions",
      "exhaustion",
      "dead",
      "tempHp",
      "combatProfile",
    ]),
  material: (m) => ({
    ...pick(m, [
      "kind",
      "title",
      "image",
      "playerText",
      "dmNote",
      "sections",
      "choices",
      "tags",
      "sceneIds",
      "access",
      "outcome",
    ]),
    shows: arr(m?.shows).length,
  }),
  table: (t) =>
    pick(t, [
      "name",
      "sides",
      "replacement",
      "playersCanUse",
      "variables",
      "mainColumn",
      "columns",
      "results",
    ]),
  encounter: (e) => pick(e, ["name", "party", "groups", "rows", "notes", "sceneId"]),
  world: (w) => pick(w, ["title", "body", "worldType", "sections"]),
};
export const localHash = (type, obj) => hashOf(PROJECTION[type](obj));

// ---------------------------------------------------------------- state slice

const HB_CONTENT = "content-faro-lanterna";
const HB_R1 = "revision-faro-lanterna-1";
const HB_R2 = "revision-faro-lanterna-2";
function lanternDefinition(revision) {
  return {
    name: L("Lanterna del faro", "Lighthouse lantern"),
    description: L(
      revision === 1
        ? "Lanterna d’ottone con lente verde: illumina come una lanterna schermata."
        : "Lanterna d’ottone con lente verde: illumina come una lanterna schermata. Una volta per riposo lungo la luce rivela per un minuto le impronte bagnate recenti.",
      revision === 1
        ? "Brass lantern with a green lens: it sheds light like a hooded lantern."
        : "Brass lantern with a green lens: it sheds light like a hooded lantern. Once per long rest its light reveals recent wet footprints for one minute.",
    ),
    source: {
      kind: "authored",
      edition: "2024",
      label: "Studio Brezza (pacchetto d’esempio sintetico)",
      reference: "Il faro sommerso, p. 3",
      rights: { modify: true, share: true, export: true },
    },
    fields: { level: 0, school: "", kind: "gear", weight: 1, value: 25 },
    resource: revision === 1 ? null : { id: "faro-light", max: 1, recovery: "long-rest" },
    activities:
      revision === 1
        ? []
        : [
            {
              id: "faro-reveal",
              kind: "manual",
              name: L("Rivela impronte", "Reveal footprints"),
              description: L(
                "Promemoria: il DM descrive le impronte bagnate.",
                "Reminder: the DM describes the wet footprints.",
              ),
            },
          ],
    dependencies: [],
  };
}
function seedLighthouse() {
  const at = sampleDate("2026-09-12T18:30:00.000Z");
  const lantern = {
    id: "faro-custode-lanterna",
    name: L("Lanterna del faro", "Lighthouse lantern"),
    description: lanternDefinition(2).description,
    source: {
      kind: "homebrew",
      contentId: HB_CONTENT,
      revision: HB_R2,
      originKind: "authored",
      edition: "2024",
      label: "Studio Brezza (pacchetto d’esempio sintetico)",
      reference: "Il faro sommerso, p. 3",
      rights: { modify: true, share: true, export: true },
    },
    activities: clone(lanternDefinition(2).activities),
    homebrewRef: { contentId: HB_CONTENT, revisionId: HB_R2 },
    kind: "gear",
    weight: 1,
    value: 25,
    quantity: 1,
    equipped: true,
    used: 0,
  };
  const items = [
    {
      key: "scene:faro-sala",
      type: "scene",
      sourceId: "faro-sala",
      name: "La sala della lanterna",
      data: {
        id: "faro-sala",
        name: "La sala della lanterna",
        description:
          "Sala circolare in cima al faro, allagata fino alle caviglie. Il custode annegato sorveglia la lente spenta.",
        publicDescription: "Acqua salmastra copre il pavimento; la grande lente è spenta.",
        gridSize: 50,
        metersPerCell: 1.5,
        width: 1000,
        height: 650,
        gridVisible: true,
        gridSnap: false,
        background: null,
        revealed: false,
        revealedTo: [],
        template: "blank",
        tokens: [{ id: "token-faro-custode", actorKey: "npc:faro-custode", x: 500, y: 300 }],
        walls: [],
        pins: [
          {
            id: "pin-faro-lente",
            x: 520,
            y: 200,
            label: "La grande lente",
            kind: "oddity",
            link: { materialKey: "material:faro-diario", sectionId: "faro-diario-lente" },
            excerpt: "",
            excerptLinked: true,
            fallbackExcerpt: "La lente è incrinata; qualcuno l’ha coperta con un telo cerato.",
            dmNote: "Riaccendere la lente scaccia il custode per un round.",
            visible: false,
            createdAt: at,
          },
        ],
        stage: null,
      },
    },
    {
      key: "npc:faro-custode",
      type: "npc",
      sourceId: "faro-custode",
      name: "Custode annegato",
      data: {
        id: "faro-custode",
        name: "Custode annegato",
        kind: "npc",
        owner: "dm",
        hp: 22,
        maxHp: 22,
        ac: 12,
        className: L("PNG del pacchetto", "Package NPC"),
        level: 2,
        speed: 6,
        movement: 6,
        action: true,
        bonus: true,
        reaction: true,
        abilities: { str: 14, dex: 8, con: 14, int: 6, wis: 10, cha: 5 },
        slots: { used: 0, max: 0 },
        inventory: [lantern],
        notes: "Non attacca chi porta una luce verde.",
        combatProfile: { team: "watch" },
        size: "medium",
        conditionImmunities: [],
        heldItemIds: [],
        provenance: { kind: "authored-demo", edition: "custom", revision: 1 },
      },
    },
    {
      key: "material:faro-diario",
      type: "material",
      sourceId: "faro-diario",
      name: "Diario del guardiano del faro",
      data: {
        id: "faro-diario",
        kind: "handout",
        title: "Diario del guardiano del faro",
        image: null,
        playerText:
          "Le ultime pagine sono gonfie d’acqua. Si legge ancora: «La luce verde li tiene lontani. Non lasciate spegnere la lanterna».",
        dmNote: "Introduzione: consegnala quando il gruppo trova la porta del faro.",
        sections: [
          {
            id: "faro-diario-lente",
            heading: "La lente",
            playerText: "La lente è incrinata; qualcuno l’ha coperta con un telo cerato.",
            dmText: "Sotto il telo c’è la lanterna verde di scorta.",
          },
        ],
        choices: [],
        tags: ["faro", "introduzione"],
        actorId: null,
        sceneKeys: ["scene:faro-sala"],
        access: { mode: "none", actorIds: [] },
        shows: [],
        responses: {},
        outcome: null,
        corrections: [],
        source: { kind: "authored", revision: "studio-brezza-1" },
        createdAt: at,
        updatedAt: at,
      },
    },
    {
      key: "table:faro-marea",
      type: "table",
      sourceId: "faro-marea",
      name: L("Cosa porta la marea", "What the tide brings"),
      data: {
        id: "faro-marea",
        name: L("Cosa porta la marea", "What the tide brings"),
        origin: "authored-demo",
        sides: 6,
        replacement: true,
        playersCanUse: false,
        variables: [],
        mainColumn: null,
        columns: [],
        results: [
          {
            id: "marea-rope",
            text: L("Una cima sfilacciata", "A frayed rope"),
            weight: 2,
            drawn: false,
            subtableKey: null,
            values: {},
            cells: {},
          },
          {
            id: "marea-bottle",
            text: L("Una bottiglia con un messaggio", "A bottle with a message"),
            weight: 2,
            drawn: false,
            subtableKey: null,
            values: {},
            cells: {},
          },
          {
            id: "marea-crab",
            text: L("Granchi giganti affamati", "Hungry giant crabs"),
            weight: 2,
            drawn: false,
            subtableKey: null,
            values: {},
            cells: {},
          },
        ],
      },
    },
  ];
  for (const item of items) item.dataHash = hashOf(item.data);
  const revision = (number) => ({
    id: number === 1 ? HB_R1 : HB_R2,
    contentId: HB_CONTENT,
    parentRevisionId: number === 1 ? null : HB_R1,
    author: "dm",
    createdAt:
      number === 1
        ? sampleDate("2026-08-20T10:00:00.000Z")
        : sampleDate("2026-09-10T10:00:00.000Z"),
    data: lanternDefinition(number),
  });
  return {
    id: "adv-faro",
    title: "Il faro sommerso",
    summary:
      "Breve avventura d’esempio per 3–4 personaggi di 3° livello: un faro allagato, il suo custode e una lanterna che tiene lontani i morti.",
    owner: "dm",
    origin: { kind: "package", publisher: "Studio Brezza (esempio sintetico)" },
    createdAt: at,
    updatedAt: at,
    versions: [
      {
        number: 1,
        createdAt: at,
        notes: "Prima versione del pacchetto.",
        items,
        external: [],
        requires: [
          {
            contentId: HB_CONTENT,
            revisionId: HB_R2,
            name: L("Lanterna del faro", "Lighthouse lantern"),
            via: "Custode annegato",
          },
        ],
        excluded: [],
        optional: [],
        homebrew: {
          format: "d20-studio-library",
          version: 1,
          contents: [
            {
              id: HB_CONTENT,
              type: "item",
              originRef: null,
              revisions: [revision(1), revision(2)],
            },
          ],
        },
        startSceneKey: "scene:faro-sala",
        introKey: "material:faro-diario",
      },
    ],
  };
}
export function seedSlice() {
  return { adventures: [seedLighthouse()], imports: {}, journal: [], universe: [] };
}
export function normalizeSlice(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Saved adventures come from a newer version");
  if (!isObject(slice)) return seedSlice();
  const adventures = arr(slice.adventures).filter(
    (a) => isObject(a) && typeof a.id === "string" && arr(a.versions).length,
  );
  const imports = {};
  for (const [campaignId, byAdventure] of Object.entries(
    isObject(slice.imports) ? slice.imports : {},
  ))
    if (isObject(byAdventure))
      imports[campaignId] = Object.fromEntries(
        Object.entries(byAdventure).filter(([, record]) => isObject(record?.items)),
      );
  return {
    adventures,
    imports,
    journal: arr(slice.journal).filter((entry) => isObject(entry) && typeof entry.id === "string"),
    universe: arr(slice.universe).filter(
      (entry) => isObject(entry) && typeof entry.id === "string" && str(entry.title).trim(),
    ),
  };
}
function sliceOf(state) {
  const slice = state?.ext?.[ID];
  if (!slice) refuse("Avventure non disponibili.", "Adventures unavailable.");
  return slice;
}
export const readSlice = (state) =>
  state?.ext?.[ID] ?? { adventures: [], imports: {}, journal: [], universe: [] };
export function adventureOf(state, id, strict = true) {
  const found = readSlice(state).adventures.find((a) => a.id === id) ?? null;
  if (!found && strict) refuse("Avventura non trovata.", "Adventure not found.");
  return found;
}
export const latest = (adventure) => arr(adventure?.versions).at(-1) ?? null;
export const recordOf = (state, campaignId, adventureId) =>
  readSlice(state).imports?.[campaignId]?.[adventureId] ?? null;
function journal(slice, entry) {
  const record = { id: `advlog-${rand()}`, at: nowIso(), ...entry };
  slice.journal.push(record);
  if (slice.journal.length > 200) slice.journal.splice(0, slice.journal.length - 200);
  return record;
}

// ---------------------------------------------------------------- campaigns

const parkedOf = (state, campaignId) => state?.ext?.[MEMBERS]?.parked?.[campaignId] ?? null;
/**
 * Read/write view of one campaign's records: the campaign in play lives in the state,
 * a parked one (B13) keeps its scenes and per-campaign area slices as {value, version}.
 * `specs` maps an area slice name to {version, normalize} (the registered definition).
 */
export function campaignView(state, campaignId, specs = {}) {
  if (!campaignId) return null;
  const current = state?.campaign?.id === campaignId;
  const parked = current ? null : parkedOf(state, campaignId);
  if (!current && !parked) return null;
  const home = current ? state : parked;
  return {
    id: campaignId,
    current,
    home,
    campaign: current ? state.campaign : parked.campaign,
    name: (current ? state.campaign?.name : parked.campaign?.name) ?? campaignId,
    get scenes() {
      return arr(home.scenes);
    },
    get combat() {
      return home.combat ?? null;
    },
    scenesMut() {
      home.scenes ??= [];
      return home.scenes;
    },
    read(name) {
      if (current) return state.ext?.[name] ?? null;
      const entry = parked.ext?.[name];
      if (!entry) return null;
      const spec = specs[name];
      return spec && entry.version !== spec.version
        ? spec.normalize(clone(entry.value), entry.version ?? 0)
        : entry.value;
    },
    has(name) {
      return current ? Boolean(state.ext?.[name] && specs[name]) : Boolean(specs[name]);
    },
    write(name) {
      const spec = specs[name];
      if (!spec || (current && !state.ext?.[name]))
        refuse(
          "Quest’area non è disponibile: il tipo non si può importare.",
          "This area is unavailable: the type cannot be imported.",
        );
      if (current) return state.ext[name];
      parked.ext ??= {};
      let entry = parked.ext[name];
      if (!entry)
        entry = parked.ext[name] = {
          value: spec.normalize({}, spec.version),
          version: spec.version,
        };
      else if (entry.version !== spec.version) {
        entry.value = spec.normalize(clone(entry.value), entry.version ?? 0);
        entry.version = spec.version;
      }
      return entry.value;
    },
    setActiveScene(id) {
      home.activeSceneId = id;
    },
  };
}
// World entries are written through the campaign journal, which serves the campaign in play.
export const typeAvailable = (view, type) =>
  type === "world" ? view.current : !TYPE_SLICE[type] || view.has(TYPE_SLICE[type]);
// A campaign World entry as a package item and as an import target (DM view).
function worldEntry(state, view, id) {
  if (!view?.current || !id) return null;
  try {
    const entry = getCampaignEntry(state, id, "dm");
    if (entry.kind !== "world" || entry.campaignId !== view.id) return null;
    return {
      id: entry.id,
      title: entry.data.title,
      body: entry.data.body,
      worldType: entry.data.worldType,
      sections: arr(entry.data.sections).map((s) => ({ title: s.title, body: s.body })),
    };
  } catch {
    return null;
  }
}

/** Whether this identity runs the campaign (owner or co-DM) and it is active. */
export function canManageCampaign(state, campaignId, role) {
  if (role !== "dm" || !campaignId) return false;
  if (!state?.ext?.[MEMBERS]) return state?.campaign?.id === campaignId;
  return (
    members.canManage(state, campaignId, role) &&
    members.metaOf(state, campaignId)?.status === "active"
  );
}
/** Campaigns this identity could import into (the origin campaign is marked). */
export function importTargets(state, role, adventure = null) {
  const rows = state?.ext?.[MEMBERS]
    ? members
        .listCampaigns(state, role)
        .filter((row) => canManageCampaign(state, row.id, role))
        .map((row) => ({ id: row.id, name: row.name, current: row.current }))
    : state?.campaign && role === "dm"
      ? [{ id: state.campaign.id, name: state.campaign.name, current: true }]
      : [];
  return rows.map((row) => ({ ...row, origin: adventure?.origin?.campaignId === row.id }));
}

// ---------------------------------------------------------------- source content

/** NPCs that can travel in a package: the DM's campaign creatures, never characters. */
export function eligibleNpc(actor, campaignId) {
  return (
    Boolean(actor) &&
    actor.kind === "npc" &&
    actor.owner === "dm" &&
    !actor.companion &&
    actor.visibility !== "private" &&
    isCampaignActor(actor, campaignId)
  );
}
/** What the campaign offers for a package, grouped by type. */
export function sourceCatalog(state, campaignId, specs = {}) {
  const view = campaignView(state, campaignId, specs);
  if (!view) return null;
  const handouts = view.read("handouts");
  const tables = view.read("random-tables");
  const encounters = view.read("encounter-builder");
  return {
    scene: view.scenes.map((s) => ({
      key: keyOf("scene", s.id),
      name: s.name,
      tokens: arr(s.tokens).length,
    })),
    npc: Object.values(state.actors ?? {})
      .filter((a) => eligibleNpc(a, campaignId))
      .map((a) => ({ key: keyOf("npc", a.id), name: a.name })),
    material: arr(handouts?.materials)
      .filter((m) => ["handout", "vignette"].includes(m.kind))
      .map((m) => ({ key: keyOf("material", m.id), name: m.title, kind: m.kind })),
    table: arr(tables?.tables).map((t) => ({ key: keyOf("table", t.id), name: t.name })),
    encounter: arr(encounters?.encounters)
      .filter((e) => !e.campaignId || e.campaignId === campaignId)
      .map((e) => ({ key: keyOf("encounter", e.id), name: e.name })),
    world: view.current
      ? listCampaignEntries(state, { campaignId, kind: "world" }, "dm").map((e) => ({
          key: keyOf("world", e.id),
          name: e.data.title,
          kind: e.data.worldType,
        }))
      : [],
  };
}
const PROGRESS_FIELDS = [
  "tempHp",
  "dead",
  "dashCount",
  "concentration",
  "combatEffects",
  "conditions",
  "movementSpent",
  "lastSlotTurn",
  "exhaustion",
  "deathSaves",
  "stable",
  "personalPlans",
  "futurePlan",
  "pendingHealing",
  "campaignIds",
  "visibility",
  "controllers",
  "adventure",
];
/** An NPC's initial state: full HP and actions, no conditions or turn records. */
export function stripActor(actor) {
  const copy = clone(actor);
  for (const key of PROGRESS_FIELDS) delete copy[key];
  if (Number.isFinite(copy.maxHp)) copy.hp = copy.maxHp;
  copy.action = copy.bonus = copy.reaction = true;
  if (Number.isFinite(copy.speed)) copy.movement = copy.speed;
  if (isObject(copy.slots)) copy.slots = { ...copy.slots, used: 0 };
  return copy;
}
// Optional scene fields filled with their defaults (preparation.mjs values()), so a scene
// saved once in the editor is not reported as changed by fields it merely wrote out.
const SCENE_DEFAULTS = Object.freeze({
  description: "",
  publicDescription: "",
  gridOffsetX: 0,
  gridOffsetY: 0,
  gridVisible: true,
  imageName: "",
  imageWidth: 0,
  imageHeight: 0,
  walls: [],
  terrain: [],
});
function excerptOf(material, sectionId) {
  if (!material) return "";
  const section = arr(material.sections).find((s) => s.id === sectionId);
  return str(section ? section.playerText : material.playerText);
}
function buildItem(state, view, key) {
  const [type, id] = splitKey(key);
  const links = [];
  const external = [];
  const excluded = [];
  const requires = [];
  let data;
  let name;
  if (type === "scene") {
    const scene = view.scenes.find((s) => s.id === id);
    if (!scene) return null;
    name = scene.name;
    data = clone(scene);
    delete data.adventure;
    for (const [field, value] of Object.entries(SCENE_DEFAULTS))
      if (data[field] === undefined || data[field] === null) data[field] = clone(value);
    data.revealed = false;
    data.revealedTo = [];
    data.tokens = arr(scene.tokens).flatMap((token) => {
      const actor = state.actors?.[token.actorId];
      if (eligibleNpc(actor, view.id)) {
        const npcKey = keyOf("npc", actor.id);
        links.push({ key: npcKey, required: true, kind: "token" });
        const { actorId, ...rest } = clone(token);
        return [{ ...rest, actorKey: npcKey }];
      }
      excluded.push({
        kind: actor?.kind === "character" ? "pc-token" : "token",
        name: actor?.name ?? token.actorId,
        from: scene.name,
      });
      return [];
    });
    const handouts = view.read("handouts");
    data.pins = arr(handouts?.pins)
      .filter((pin) => pin.sceneId === id)
      .map((pin) => {
        const copy = clone(pin);
        delete copy.sceneId;
        copy.visible = false;
        if (pin.link?.materialId) {
          const material = arr(handouts.materials).find((m) => m.id === pin.link.materialId);
          copy.link = {
            materialKey: keyOf("material", pin.link.materialId),
            sectionId: pin.link.sectionId ?? null,
          };
          copy.fallbackExcerpt = pin.excerptLinked
            ? excerptOf(material, pin.link.sectionId)
            : str(pin.excerpt);
          links.push({ key: copy.link.materialKey, required: false, kind: "pin" });
        } else {
          if (pin.link?.entryId)
            excluded.push({ kind: "archive-link", name: pin.label, from: scene.name });
          copy.link = null;
          copy.excerpt = pin.excerptLinked ? "" : str(pin.excerpt);
          copy.excerptLinked = false;
        }
        return copy;
      });
    data.stage = isObject(handouts?.stages?.[id]) ? clone(handouts.stages[id]) : null;
  } else if (type === "npc") {
    const actor = state.actors?.[id];
    if (!eligibleNpc(actor, view.id)) return null;
    name = actor.name;
    data = stripActor(actor);
    for (const row of arr(actor.inventory))
      if (row?.homebrewRef?.contentId && row.homebrewRef.revisionId)
        requires.push({
          contentId: row.homebrewRef.contentId,
          revisionId: row.homebrewRef.revisionId,
          name: row.name,
          via: actor.name,
        });
  } else if (type === "material") {
    const handouts = view.read("handouts");
    const material = arr(handouts?.materials).find(
      (m) => m.id === id && ["handout", "vignette"].includes(m.kind),
    );
    if (!material) return null;
    name = material.title;
    data = clone(material);
    delete data.adventure;
    Object.assign(data, {
      access: { mode: "none", actorIds: [] },
      shows: [],
      responses: {},
      outcome: null,
      corrections: [],
      actorId: null,
    });
    data.sceneKeys = arr(material.sceneIds).map((sceneId) => keyOf("scene", sceneId));
    delete data.sceneIds;
    for (const sceneKey of data.sceneKeys)
      links.push({ key: sceneKey, required: false, kind: "material-scene" });
    const artId = material.image?.artId;
    if (artId) {
      const art = builtInArt(artId);
      const upload = arr(handouts.uploads).find((u) => u.id === artId);
      if (art) external.push({ kind: "art", id: artId, name: art.title });
      else if (upload) data.upload = clone(upload);
      else external.push({ kind: "media", id: artId, name: artId });
    }
  } else if (type === "table") {
    const table = arr(view.read("random-tables")?.tables).find((t) => t.id === id);
    if (!table) return null;
    name = table.name;
    data = clone(table);
    delete data.adventure;
    data.results = arr(table.results).map((result) => {
      const copy = clone(result);
      copy.drawn = false;
      copy.subtableKey = result.subtableId ? keyOf("table", result.subtableId) : null;
      delete copy.subtableId;
      if (copy.subtableKey) links.push({ key: copy.subtableKey, required: true, kind: "subtable" });
      return copy;
    });
  } else if (type === "encounter") {
    const slice = view.read("encounter-builder");
    const encounter = arr(slice?.encounters).find((e) => e.id === id);
    if (!encounter) return null;
    name = encounter.name;
    data = clone(encounter);
    delete data.campaignId;
    delete data.adventure;
    data.handoff = null;
    data.sceneKey = encounter.sceneId ? keyOf("scene", encounter.sceneId) : null;
    delete data.sceneId;
    if (data.sceneKey) links.push({ key: data.sceneKey, required: false, kind: "encounter-scene" });
    data.blocks = [];
    data.rows = arr(encounter.rows).flatMap((row) => {
      const copy = clone(row);
      if (row.kind === "actor") {
        const actor = state.actors?.[row.actorId];
        if (!eligibleNpc(actor, view.id)) {
          excluded.push({
            kind: actor?.kind === "character" ? "pc-row" : "row",
            name: actor?.name ?? row.actorId,
            from: encounter.name,
          });
          return [];
        }
        copy.actorKey = keyOf("npc", actor.id);
        delete copy.actorId;
        links.push({ key: copy.actorKey, required: true, kind: "encounter-actor" });
        return [copy];
      }
      if (row.blockId) {
        const block = arr(slice.blocks).find((b) => b.id === row.blockId);
        if (block && !data.blocks.some((b) => b.id === block.id)) data.blocks.push(clone(block));
      } else if (row.creatureId) {
        const creature = CREATURES.find((c) => c.id === row.creatureId);
        external.push({
          kind: "srd",
          id: row.creatureId,
          name: creature?.name ?? row.creatureId,
          source: creature?.source ?? null,
        });
      }
      return [copy];
    });
  } else if (type === "world") {
    const entry = worldEntry(state, view, id);
    if (!entry) return null;
    name = entry.title;
    const { id: _id, ...rest } = entry;
    data = rest;
  } else return null;
  return {
    key,
    type,
    sourceId: id,
    name,
    data,
    dataHash: hashOf(data),
    links,
    external,
    excluded,
    requires,
  };
}
const typeRank = (item) => TYPES.indexOf(item.type);
const dedupe = (list, keyFn) => [...new Map(list.map((entry) => [keyFn(entry), entry])).values()];
/**
 * Everything a selection brings with it (Scene Packer, FVT-179): required links (NPC
 * tokens, encounter creatures, subtables) are added and explained; optional links (a
 * handout's scene, a pin's handout) are kept only when both ends travel.
 */
export function collectPackage(state, campaignId, picks, specs = {}, extra = {}) {
  const view = campaignView(state, campaignId, specs);
  if (!view)
    refuse("La campagna d’origine non è disponibile.", "The origin campaign is unavailable.");
  const chosen = [...new Set(arr(picks).filter((key) => TYPES.includes(splitKey(key)[0])))];
  const queue = chosen.map((key) => ({ key, because: null }));
  if (extra.startSceneKey) queue.push({ key: extra.startSceneKey, because: "start" });
  if (extra.introKey) queue.push({ key: extra.introKey, because: "intro" });
  const items = new Map();
  const auto = [];
  const missing = [];
  while (queue.length) {
    const { key, because } = queue.shift();
    if (items.has(key)) continue;
    const item = buildItem(state, view, key);
    if (!item) {
      missing.push({ key, because });
      continue;
    }
    items.set(key, item);
    if (because && !chosen.includes(key))
      auto.push({ key, name: item.name, type: item.type, because });
    for (const link of item.links) if (link.required) queue.push({ key: link.key, because: key });
  }
  const list = [...items.values()].sort((a, b) => typeRank(a) - typeRank(b));
  return {
    items: list,
    auto,
    missing,
    external: dedupe(
      list.flatMap((i) => i.external),
      (e) => `${e.kind}:${e.id}`,
    ),
    requires: dedupe(
      list.flatMap((i) => i.requires),
      (r) => `${r.contentId}/${r.revisionId}`,
    ),
    optional: list.flatMap((i) =>
      i.links
        .filter((link) => !link.required && !items.has(link.key))
        .map((link) => ({ ...link, from: i.name })),
    ),
    excluded: list.flatMap((i) => i.excluded),
  };
}
function makeVersion(state, number, pack, input, role, at) {
  const has = (key, type) => pack.items.some((i) => i.key === key && i.type === type);
  let homebrew = null;
  if (pack.requires.length)
    try {
      homebrew = exportHomebrewBundle(
        state,
        pack.requires.map((r) => ({ contentId: r.contentId, revisionId: r.revisionId })),
        role,
      );
    } catch {
      homebrew = null;
    }
  return {
    number,
    createdAt: at,
    notes: str(input.notes),
    items: pack.items.map(({ key, type, sourceId, name, data, dataHash }) => ({
      key,
      type,
      sourceId,
      name,
      data,
      dataHash,
    })),
    external: pack.external,
    requires: pack.requires,
    excluded: pack.excluded,
    optional: pack.optional,
    homebrew,
    startSceneKey: has(input.startSceneKey, "scene") ? input.startSceneKey : null,
    introKey: has(input.introKey, "material") ? input.introKey : null,
  };
}
const TITLE = L("Titolo", "Title");
const SUMMARY = L("Presentazione", "Summary");
const NOTES = L("Note della versione", "Version notes");
/** Create Adventure (FVT-177) from the campaign in play. Returns the adventure id. */
export function createAdventure(state, input, role, specs = {}, at = nowIso()) {
  requireDM(role);
  const title = cleanText(input.title, 80, TITLE, true);
  const summary = cleanText(input.summary, 1000, SUMMARY);
  const campaignId = state.campaign?.id;
  if (!canManageCampaign(state, campaignId, role))
    refuse(
      "Crei un’avventura dalla campagna in corso che guidi come DM.",
      "You create an adventure from the campaign in play that you run as DM.",
    );
  const picks = arr(input.picks);
  if (!picks.length)
    refuse("Scegli almeno un contenuto da includere.", "Choose at least one item to include.");
  const pack = collectPackage(state, campaignId, picks, specs, input);
  if (!pack.items.length)
    refuse("I contenuti scelti non esistono più.", "The chosen items no longer exist.");
  const slice = sliceOf(state);
  const id = `adv-${rand()}`;
  slice.adventures.push({
    id,
    title,
    summary,
    owner: role,
    origin: { kind: "campaign", campaignId, name: state.campaign.name },
    createdAt: at,
    updatedAt: at,
    versions: [makeVersion(state, 1, pack, { ...input, notes: "Prima versione." }, role, at)],
  });
  journal(slice, { kind: "create", adventureId: id, version: 1 });
  return id;
}
function changedFields(before, after) {
  return [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter(
    (key) => hashOf(before?.[key]) !== hashOf(after?.[key]),
  );
}
/** Foundry "Rebuild Adventure": added (green), removed (red), changed entries. */
export function diffItems(oldItems, newItems) {
  const before = new Map(arr(oldItems).map((i) => [i.key, i]));
  const after = new Map(arr(newItems).map((i) => [i.key, i]));
  const changed = [];
  const unchanged = [];
  for (const item of arr(newItems)) {
    const old = before.get(item.key);
    if (!old) continue;
    if (old.dataHash === item.dataHash) unchanged.push(item);
    else changed.push({ ...item, fields: changedFields(old.data, item.data) });
  }
  return {
    added: arr(newItems).filter((i) => !before.has(i.key)),
    removed: arr(oldItems).filter((i) => !after.has(i.key)),
    changed,
    unchanged,
  };
}
export function rebuildPreview(state, adventureId, input, specs = {}) {
  const adventure = adventureOf(state, adventureId);
  if (adventure.origin?.kind !== "campaign")
    refuse(
      "Questo pacchetto è stato ricevuto già pronto: non ha una campagna d’origine da cui ricostruirlo.",
      "This package was received ready-made: it has no origin campaign to rebuild from.",
    );
  const pack = collectPackage(state, adventure.origin.campaignId, input.picks, specs, input);
  const previous = latest(adventure);
  return {
    adventure,
    previous,
    pack,
    diff: diffItems(previous.items, pack.items),
    startChanged:
      (pack.items.some((i) => i.key === input.startSceneKey) ? input.startSceneKey : null) !==
      previous.startSceneKey,
    introChanged:
      (pack.items.some((i) => i.key === input.introKey) ? input.introKey : null) !==
      previous.introKey,
  };
}
/** Publishes the rebuilt package as a new immutable version with its notes. */
export function publishVersion(state, adventureId, input, role, specs = {}, at = nowIso()) {
  requireDM(role);
  const preview = rebuildPreview(state, adventureId, input, specs);
  const { adventure, previous, diff, pack } = preview;
  if (!canManageCampaign(state, adventure.origin.campaignId, role))
    refuse(
      "Solo chi guida la campagna d’origine pubblica una nuova versione.",
      "Only whoever runs the origin campaign publishes a new version.",
    );
  if (
    !diff.added.length &&
    !diff.removed.length &&
    !diff.changed.length &&
    !preview.startChanged &&
    !preview.introChanged
  )
    refuse(
      `Nessuna differenza dalla versione ${previous.number}: non c’è niente da pubblicare.`,
      `No difference from version ${previous.number}: there is nothing to publish.`,
    );
  if (!pack.items.length)
    refuse("Una versione deve contenere almeno una voce.", "A version needs at least one entry.");
  const notes = cleanText(input.notes, 600, NOTES, true);
  const summary = input.summary === undefined ? null : cleanText(input.summary, 1000, SUMMARY);
  // rebuildPreview read the adventure from this same state: it is the record to update.
  if (summary !== null) adventure.summary = summary;
  const number = previous.number + 1;
  adventure.versions.push(makeVersion(state, number, pack, { ...input, notes }, role, at));
  adventure.updatedAt = at;
  journal(sliceOf(state), { kind: "version", adventureId, version: number });
  return number;
}
export function deleteAdventure(state, adventureId, role) {
  requireDM(role);
  const slice = sliceOf(state);
  adventureOf(state, adventureId);
  slice.adventures = slice.adventures.filter((a) => a.id !== adventureId);
  journal(slice, { kind: "delete", adventureId });
}

// ---------------------------------------------------------------- required homebrew

const sameRef = (a, b) => a?.contentId === b?.contentId && a?.revisionId === b?.revisionId;
/**
 * BG3 mod verification (CRP-171): each homebrew revision the package needs, with its
 * state in the Library and in the target campaign, and the one action that fixes it.
 * `campaignId` null checks the Library only (a campaign that does not exist yet).
 */
export function requirementStatus(state, version, campaignId, role, specs = {}) {
  const view = campaignId ? campaignView(state, campaignId, specs) : null;
  const enabled = arr(view?.campaign?.enabledContent);
  const library = listHomebrew(state, role);
  return arr(version?.requires).map((req) => {
    const ref = { contentId: req.contentId, revisionId: req.revisionId };
    const entry = library.find((c) => c.id === ref.contentId);
    const has = Boolean(entry?.revisions.some((r) => r.id === ref.revisionId));
    const bundled = arr(version.homebrew?.contents).some(
      (c) => c.id === ref.contentId && arr(c.revisions).some((r) => r.id === ref.revisionId),
    );
    const on = enabled.some((r) => sameRef(r, ref));
    const status = !entry
      ? "missing"
      : !has
        ? "outdated"
        : campaignId && !on
          ? "disabled"
          : "ready";
    const action =
      status === "missing"
        ? bundled
          ? "install"
          : null
        : status === "outdated"
          ? bundled
            ? "upgrade"
            : null
          : status === "disabled"
            ? "enable"
            : null;
    const bundledRevisions =
      arr(version.homebrew?.contents).find((c) => c.id === ref.contentId)?.revisions ?? [];
    const at = bundledRevisions.findIndex((r) => r.id === ref.revisionId);
    return {
      ref,
      name: req.name,
      via: req.via ?? "",
      number: at >= 0 ? at + 1 : null,
      createdAt: at >= 0 ? bundledRevisions[at].createdAt : null,
      status,
      action,
      have: entry?.revisions.map((r) => r.id) ?? [],
    };
  });
}
/** The bundle entries one requirement needs: its own content and, transitively, the
 * contents its revisions depend on that travel in the same bundle. */
function bundleFor(bundle, contentId) {
  const contents = arr(bundle?.contents);
  const wanted = new Set([contentId]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const content of contents.filter((c) => wanted.has(c.id)))
      for (const revision of arr(content.revisions))
        for (const dep of arr(revision.data?.dependencies))
          if (!wanted.has(dep?.contentId) && contents.some((c) => c.id === dep?.contentId)) {
            wanted.add(dep.contentId);
            grew = true;
          }
  }
  return { ...bundle, contents: contents.filter((c) => wanted.has(c.id)) };
}
/** Install/Upgrade: adds the package's homebrew to the DM's Library through the Library's
 * own import review (homebrew.mjs), never by writing library records directly. With a
 * `ref`, only that entry (and what it depends on) is added: one action per entry (CRP-171). */
export function installRequirements(state, adventureId, role, ref = null) {
  requireDM(role);
  const packaged = latest(adventureOf(state, adventureId))?.homebrew;
  const bundle = ref && packaged ? bundleFor(packaged, ref.contentId) : packaged;
  if (!bundle?.contents?.length)
    refuse(
      "Il pacchetto non contiene questo contenuto: chiedilo a chi l’ha creato.",
      "The package does not contain this content: ask its author for it.",
    );
  const draftId = `adv-install-${rand()}`;
  createHomebrewImportDraft(state, { id: draftId, bundle: clone(bundle) }, role);
  const preview = previewHomebrewDraft(state, draftId, role);
  if (!preview.canApply)
    refuse(
      preview.errors[0]?.it ?? "Contenuto non installabile.",
      preview.errors[0]?.en ?? "Content cannot be installed.",
    );
  return applyHomebrewDraft(state, draftId, { reviewKey: preview.reviewKey }, role);
}
/** Enable: the campaign allows that exact revision (Library "enable in campaign"). */
export function enableRequirement(state, ref, campaignId, role, specs = {}, adventureId = null) {
  requireDM(role);
  if (!canManageCampaign(state, campaignId, role))
    refuse("Non guidi questa campagna.", "You do not run this campaign.");
  const entry = listHomebrew(state, role).find((c) => c.id === ref.contentId);
  if (!entry?.revisions.some((r) => r.id === ref.revisionId))
    refuse("Aggiungi prima il contenuto alla Biblioteca.", "Add the content to the Library first.");
  const view = campaignView(state, campaignId, specs);
  if (view.current) enableHomebrewRevision(state, ref, { enabled: true }, role);
  else
    view.campaign.enabledContent = [
      ...arr(view.campaign.enabledContent).filter((r) => !sameRef(r, ref)),
      { contentId: ref.contentId, revisionId: ref.revisionId },
    ];
  return journal(sliceOf(state), {
    kind: "enable",
    adventureId,
    campaignId,
    campaignName: view.name,
    parked: !view.current,
  });
}

// ---------------------------------------------------------------- import and update

function findTarget(state, view, type, id) {
  if (!id) return null;
  if (type === "world") return worldEntry(state, view, id);
  if (type === "npc") return state.actors?.[id] ?? null;
  if (type === "scene") return view.scenes.find((s) => s.id === id) ?? null;
  const value = view.read(TYPE_SLICE[type]);
  const list =
    type === "material" ? value?.materials : type === "table" ? value?.tables : value?.encounters;
  return arr(list).find((entry) => entry.id === id) ?? null;
}
const targetName = (type, obj) =>
  type === "material" || type === "world" ? obj?.title : obj?.name;
const nameForKey = (version, key) => version.items.find((i) => i.key === key)?.name ?? key;
/**
 * The preview of an import or update into one campaign: per entry the action (create,
 * overwrite an unchanged copy, keep a copy the campaign changed and offer a copy of the
 * package version, restore a deleted one), the Roll20 patch notes since the imported
 * version, the required homebrew and why the import is blocked, if it is.
 */
export function planImport(state, adventureId, options, role, specs = {}) {
  const adventure = adventureOf(state, adventureId);
  const version = latest(adventure);
  const view = campaignView(state, options.campaignId, specs);
  if (!view) refuse("Campagna non disponibile.", "Campaign unavailable.");
  const record = recordOf(state, view.id, adventureId);
  const types = TYPES.filter((type) => arr(options.types ?? TYPES).includes(type));
  const unavailable = TYPES.filter((type) => !typeAvailable(view, type));
  const rows = [];
  for (const item of version.items) {
    if (!types.includes(item.type)) continue;
    const base = { key: item.key, type: item.type, name: item.name };
    if (unavailable.includes(item.type)) {
      rows.push({ ...base, action: "unavailable" });
      continue;
    }
    const rec = record?.items?.[item.key] ?? null;
    const target = findTarget(state, view, item.type, rec?.targetId);
    const pkgChanged = Boolean(rec) && rec.dataHash !== item.dataHash;
    let action;
    let modified = false;
    if (!rec) action = "create";
    else if (!target) action = "restore";
    else {
      modified = localHash(item.type, target) !== rec.hash;
      action = modified ? "keep" : pkgChanged ? "update" : "same";
    }
    const copy = action === "keep" ? (options.copies?.[item.key] ?? pkgChanged) : false;
    rows.push({
      ...base,
      action,
      modified,
      pkgChanged,
      targetId: rec?.targetId ?? null,
      localName: target ? targetName(item.type, target) : null,
      copy: Boolean(copy),
    });
  }
  const orphans = Object.entries(record?.items ?? {})
    .filter(([key]) => !version.items.some((i) => i.key === key))
    .map(([key, rec]) => {
      const [type] = splitKey(key);
      const target = findTarget(state, view, type, rec.targetId);
      return { key, type, targetId: rec.targetId, name: target ? targetName(type, target) : null };
    })
    .filter((row) => row.name);
  const requirements = requirementStatus(state, version, view.id, role, specs);
  const notes = adventure.versions.filter((v) => v.number > (record?.version ?? v.number));
  let blocked = null;
  if (!canManageCampaign(state, view.id, role))
    blocked = L("Non guidi questa campagna.", "You do not run this campaign.");
  else if (adventure.origin?.campaignId === view.id)
    blocked = L(
      "È la campagna d’origine: i contenuti sono già qui. Per aggiornare l’avventura usa «Nuova versione».",
      "This is the origin campaign: the content is already here. To update the adventure use “New version”.",
    );
  else if (view.combat?.active)
    blocked = L(
      "Concludi il combattimento in corso in questa campagna prima di importare o aggiornare.",
      "End the current combat in this campaign before importing or updating.",
    );
  else if (requirements.some((r) => r.status !== "ready"))
    blocked = L(
      "Risolvi prima i contenuti richiesti: ogni voce ha la sua azione.",
      "Resolve the required content first: each entry has its own action.",
    );
  else if (
    !rows.some((r) => ["create", "restore", "update", "same"].includes(r.action) || r.copy) &&
    !(options.startScene && version.startSceneKey) &&
    !(options.intro && version.introKey)
  )
    blocked = L(
      "Niente da importare: scegli almeno un tipo o una copia da aggiungere.",
      "Nothing to import: choose at least one type or a copy to add.",
    );
  return {
    adventure,
    version,
    view,
    record,
    fromVersion: record?.version ?? null,
    notes,
    rows,
    orphans,
    requirements,
    unavailable,
    blocked,
    overwrite: rows.filter((r) => ["update", "same"].includes(r.action)).length,
    kept: rows.filter((r) => r.action === "keep").length,
  };
}
function replaceOrPush(list, entry) {
  const at = list.findIndex((x) => x.id === entry.id);
  if (at >= 0) list[at] = entry;
  else list.push(entry);
}
// A World entry imported private to the DM (the DM reveals it, as a new journal entry);
// an unchanged copy is updated as a new revision of the same entry.
function writeWorld(state, view, data, targetId, context, suffix) {
  if (!view.current)
    refuse(
      "Le voci del mondo si importano nella campagna in corso.",
      "World entries are imported into the campaign in play.",
    );
  const title = `${str(data.title)}${suffix}`;
  const worldType = WORLD_TYPES.includes(data.worldType) ? data.worldType : "other";
  if (context.replace && worldEntry(state, view, targetId)) {
    const draftId = `adv-${rand()}`;
    const d = createCampaignDraft(state, { id: draftId, entryId: targetId }, "dm");
    saveCampaignDraft(
      state,
      draftId,
      {
        data: {
          ...d.data,
          title,
          body: str(data.body),
          worldType,
          sections: arr(data.sections).map((s, i) => ({
            ...(d.data.sections[i] ?? {
              id: `${draftId}-s${i + 1}`,
              access: { mode: "private", grants: [] },
            }),
            title: str(s.title),
            body: str(s.body),
          })),
        },
        expectedDraftRevision: d.revision,
      },
      "dm",
    );
    const p = previewCampaignDraft(state, draftId, "dm");
    if (!p.canApply) refuse(p.errors[0].it, p.errors[0].en);
    applyCampaignDraft(state, draftId, { reviewKey: p.reviewKey }, "dm");
    return { obj: worldEntry(state, view, targetId), pins: [] };
  }
  const created = createCampaignEntryNow(
    state,
    {
      id: `adv-${rand()}`,
      kind: "world",
      worldType,
      title,
      body: str(data.body),
      campaignId: view.id,
      sections: arr(data.sections).map((s) => ({ title: str(s.title), body: str(s.body) })),
    },
    "dm",
  );
  return { obj: worldEntry(state, view, created.entryId), pins: [], targetId: created.entryId };
}
function writeItem(state, view, item, targetId, map, context) {
  const { adventure, version, replace, suffix, report, record, at } = context;
  const origin = { id: adventure.id, version: version.number };
  const data = clone(item.data);
  const resolve = (key, kind, from) => {
    const id = key ? (map.get(key) ?? null) : null;
    report.relinks.push({ kind, from, to: nameForKey(version, key), ok: Boolean(id) });
    return id;
  };
  if (item.type === "world") return writeWorld(state, view, data, targetId, context, suffix);
  if (item.type === "npc") {
    const existing = state.actors[targetId];
    const actor = {
      ...data,
      id: targetId,
      name: `${str(data.name)}${suffix}`,
      kind: "npc",
      owner: "dm",
      campaignIds:
        replace && existing ? [...new Set([...arr(existing.campaignIds), view.id])] : [view.id],
      adventure: origin,
    };
    if (replace && existing?.controllers) actor.controllers = clone(existing.controllers);
    state.actors[targetId] = actor;
    return { obj: actor, pins: [] };
  }
  if (item.type === "scene") {
    const { pins = [], stage = null, tokens = [], ...rest } = data;
    const scene = {
      ...rest,
      id: targetId,
      name: `${str(rest.name)}${suffix}`,
      adventure: origin,
      tokens: arr(tokens).flatMap((token) => {
        const actorId = resolve(token.actorKey, "token", rest.name);
        if (!actorId) return [];
        const { actorKey, ...copy } = token;
        return [{ ...copy, id: `token-${rand()}`, actorId }];
      }),
    };
    replaceOrPush(view.scenesMut(), scene);
    const pinIds = [];
    if (view.has("handouts")) {
      const handouts = view.write("handouts");
      // Rewriting the tracked copy (overwrite or restore) replaces the pins it brought.
      if (record.items[item.key]?.targetId === targetId) {
        const old = new Set(arr(record.items[item.key]?.pins));
        handouts.pins = handouts.pins.filter((pin) => !old.has(pin.id));
      }
      for (const pin of arr(pins)) {
        const { link, fallbackExcerpt, ...copy } = clone(pin);
        const materialId = link?.materialKey ? resolve(link.materialKey, "pin", pin.label) : null;
        const id = `pin-${rand()}`;
        handouts.pins.push({
          ...copy,
          id,
          sceneId: targetId,
          link: materialId ? { materialId, sectionId: link.sectionId ?? null } : null,
          excerpt: materialId ? str(copy.excerpt) : str(fallbackExcerpt ?? copy.excerpt),
          excerptLinked: materialId ? copy.excerptLinked === true : false,
        });
        pinIds.push(id);
      }
      if (stage) handouts.stages[targetId] = clone(stage);
    } else if (arr(pins).length)
      report.dropped.push({ kind: "pins", count: pins.length, from: rest.name });
    return { obj: scene, pins: pinIds };
  }
  if (item.type === "material") {
    const handouts = view.write("handouts");
    const { upload, sceneKeys = [], ...rest } = data;
    if (upload && !handouts.uploads.some((u) => u.id === upload.id))
      handouts.uploads.push(clone(upload));
    const material = {
      ...rest,
      id: targetId,
      title: `${str(rest.title)}${suffix}`,
      sceneIds: arr(sceneKeys)
        .map((key) => resolve(key, "material-scene", rest.title))
        .filter(Boolean),
      adventure: origin,
      createdAt: at,
      updatedAt: at,
    };
    replaceOrPush(handouts.materials, material);
    return { obj: material, pins: [] };
  }
  if (item.type === "table") {
    const slice = view.write("random-tables");
    const table = {
      ...data,
      id: targetId,
      name: suffixed(data.name, suffix),
      results: arr(data.results).map((result) => {
        const { subtableKey, ...copy } = result;
        return {
          ...copy,
          subtableId: subtableKey ? resolve(subtableKey, "subtable", data.name) : null,
        };
      }),
    };
    replaceOrPush(slice.tables, table);
    return { obj: table, pins: [] };
  }
  const slice = view.write("encounter-builder");
  const { blocks = [], sceneKey = null, ...rest } = data;
  for (const block of arr(blocks))
    if (!slice.blocks.some((b) => b.id === block.id)) slice.blocks.push(clone(block));
  const encounter = {
    ...rest,
    id: targetId,
    name: `${str(rest.name)}${suffix}`,
    campaignId: view.id,
    sceneId: sceneKey ? resolve(sceneKey, "encounter-scene", rest.name) : null,
    handoff: null,
    rows: arr(rest.rows).flatMap((row) => {
      if (!row.actorKey) return [row];
      const actorId = resolve(row.actorKey, "encounter-actor", rest.name);
      if (!actorId) return [];
      const { actorKey, ...copy } = row;
      return [{ ...copy, actorId }];
    }),
    adventure: origin,
    updatedAt: at,
  };
  replaceOrPush(slice.encounters, encounter);
  return { obj: encounter, pins: [] };
}
const WRITE_ORDER = ["npc", "scene", "material", "table", "encounter", "world"];
/**
 * Imports or updates the latest version into one campaign (see planImport). Never
 * overwrites an entry the campaign changed; options.copies[key] adds the package version
 * beside it. Returns a report of what was created, updated, kept, copied and relinked.
 */
export function applyImport(state, adventureId, options, role, specs = {}, at = nowIso()) {
  requireDM(role);
  const plan = planImport(state, adventureId, options, role, specs);
  if (plan.blocked && !options.dryRun) refuse(plan.blocked.it, plan.blocked.en);
  const { adventure, version, view } = plan;
  const slice = sliceOf(state);
  const byCampaign = (slice.imports[view.id] ??= {});
  const firstImport = !byCampaign[adventureId];
  const record = (byCampaign[adventureId] ??= {
    version: 0,
    importedAt: at,
    updatedAt: at,
    items: {},
    copies: [],
  });
  const map = new Map();
  for (const [key, rec] of Object.entries(record.items))
    if (findTarget(state, view, splitKey(key)[0], rec.targetId)) map.set(key, rec.targetId);
  const reserved = new Set();
  const freshId = (type, sourceId) => {
    let id;
    do id = `${sourceId}-${rand()}`;
    while (reserved.has(id) || findTarget(state, view, type, id));
    reserved.add(id);
    return id;
  };
  for (const row of plan.rows) {
    if (row.action === "create") map.set(row.key, freshId(row.type, splitKey(row.key)[1]));
    if (row.action === "restore") map.set(row.key, row.targetId);
  }
  const report = {
    campaignId: view.id,
    campaignName: view.name,
    version: version.number,
    fromVersion: plan.fromVersion,
    created: [],
    updated: [],
    restored: [],
    same: [],
    kept: [],
    copies: [],
    orphans: plan.orphans,
    relinks: [],
    dropped: [],
    startSceneId: null,
    introId: null,
  };
  const items = new Map(version.items.map((i) => [i.key, i]));
  const rows = [...plan.rows].sort(
    (a, b) => WRITE_ORDER.indexOf(a.type) - WRITE_ORDER.indexOf(b.type),
  );
  const context = { adventure, version, report, record, at };
  const entry = (row, targetId) => ({ key: row.key, type: row.type, name: row.name, targetId });
  for (const row of rows) {
    const item = items.get(row.key);
    if (["create", "restore", "update", "same"].includes(row.action)) {
      // An unchanged copy is overwritten with the package version (Foundry re-import).
      const targetId = map.get(row.key) ?? row.targetId;
      const written = writeItem(state, view, item, targetId, map, {
        ...context,
        replace: row.action === "update" || row.action === "same",
        suffix: "",
      });
      if (written.targetId) map.set(row.key, written.targetId);
      record.items[row.key] = {
        targetId: written.targetId ?? targetId,
        dataHash: item.dataHash,
        version: version.number,
        hash: localHash(item.type, written.obj),
        pins: written.pins,
      };
      const bucket = {
        create: "created",
        restore: "restored",
        update: "updated",
        same: "same",
      }[row.action];
      report[bucket].push(entry(row, written.targetId ?? targetId));
    } else if (row.action === "keep") {
      report.kept.push(entry(row, row.targetId));
      if (row.copy) {
        const copyId = freshId(row.type, splitKey(row.key)[1]);
        const copied = writeItem(state, view, item, copyId, map, {
          ...context,
          replace: false,
          suffix: ` (v${version.number})`,
        });
        const copyTarget = copied.targetId ?? copyId;
        record.copies.push({ key: row.key, targetId: copyTarget, version: version.number, at });
        record.items[row.key].dataHash = item.dataHash;
        report.copies.push(entry(row, copyTarget));
      }
    }
  }
  const rehash = (key, type, obj) => {
    if (record.items[key]) record.items[key].hash = localHash(type, obj);
  };
  if (options.startScene && version.startSceneKey) {
    const id = map.get(version.startSceneKey) ?? record.items[version.startSceneKey]?.targetId;
    const scene = view.scenes.find((s) => s.id === id);
    if (scene) {
      // dnd5e "activate the start scene": it becomes the scene in play, shown to the group.
      view.setActiveScene(id);
      scene.revealed = true;
      scene.revealedTo = ["all"];
      report.startSceneId = id;
      rehash(version.startSceneKey, "scene", scene);
    }
  }
  if (options.intro && version.introKey && view.has("handouts")) {
    const id = map.get(version.introKey) ?? record.items[version.introKey]?.targetId;
    const material = view.write("handouts").materials.find((m) => m.id === id);
    if (material) {
      // dnd5e "display an introduction": shown to every player (Foundry Show Players).
      material.access = { mode: "all", actorIds: [] };
      material.shows = [
        ...arr(material.shows),
        { id: `show-${rand()}`, at, recipients: { mode: "all", actorIds: [] } },
      ];
      report.introId = id;
      rehash(version.introKey, "material", material);
    }
  }
  record.version = version.number;
  record.updatedAt = at;
  const logged = journal(slice, {
    kind: firstImport ? "import" : "update",
    adventureId,
    campaignId: view.id,
    campaignName: view.name,
    version: version.number,
    parked: !view.current,
    counts: {
      created: report.created.length,
      updated: report.updated.length,
      restored: report.restored.length,
      kept: report.kept.length,
      copies: report.copies.length,
    },
  });
  report.journalId = logged.id;
  return report;
}
/** The relink report of an import without changing anything (a dry run on a copy). */
export function previewRelinks(state, adventureId, options, role, specs = {}) {
  try {
    return applyImport(clone(state), adventureId, { ...options, dryRun: true }, role, specs);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- new campaign

/**
 * "Create game with module" (Roll20 R20-187, Foundry quickstart FVT-004): a new campaign
 * (B13) populated with every entry of the latest version, the package's homebrew enabled,
 * and the optional start scene / introduction. The campaign is created parked, to launch
 * from Campaigns. Returns {campaignId, report}.
 */
export function createCampaignFromAdventure(state, adventureId, input, role, specs = {}, at) {
  requireDM(role);
  if (!state.ext?.[MEMBERS])
    refuse(
      "Serve l’area Campagne per creare una campagna.",
      "The Campaigns area is needed to create a campaign.",
    );
  const adventure = adventureOf(state, adventureId);
  const version = latest(adventure);
  const missing = requirementStatus(state, version, null, role, specs).filter(
    (r) => r.status !== "ready",
  );
  if (missing.length)
    refuse(
      "Aggiungi prima alla Biblioteca i contenuti richiesti.",
      "Add the required content to the Library first.",
    );
  const campaignId = members.createCampaign(
    state,
    {
      name: input.name,
      description: input.description ?? adventure.summary.slice(0, 1000),
      tags: ["2024"],
    },
    role,
  );
  const parked = parkedOf(state, campaignId);
  parked.campaign.enabledContent = arr(version.requires).map((r) => ({
    contentId: r.contentId,
    revisionId: r.revisionId,
  }));
  const starter = arr(parked.scenes).map((s) => s.id);
  const report = applyImport(
    state,
    adventureId,
    { campaignId, types: TYPES, startScene: input.startScene, intro: input.intro },
    role,
    specs,
    at ?? nowIso(),
  );
  // The empty starter scene is dropped once the adventure's start scene is in play.
  if (report.startSceneId) parked.scenes = parked.scenes.filter((s) => !starter.includes(s.id));
  const slice = sliceOf(state);
  const logged = slice.journal.at(-1);
  if (logged?.id === report.journalId) logged.kind = "campaign";
  return { campaignId, report };
}

// ---------------------------------------------------------------- universe (BI-40)

// Alchemy's Universe beside the in-game content: world entries (places, factions,
// history…) the DM keeps once and reuses in every campaign. «Usa in questa campagna»
// copies one into the World of the campaign in play, private to the DM until revealed.
export const UNIVERSE_LIMITS = Object.freeze({ entries: 300, title: 120, body: 20000 });
const clip = (value, max) => {
  const text = str(value).trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};
export function universeOf(state) {
  return arr(readSlice(state).universe);
}
export function addUniverseEntries(state, entries, role, at = nowIso()) {
  requireDM(role);
  const slice = sliceOf(state);
  slice.universe ??= [];
  const rows = arr(entries).filter((e) => str(e?.title).trim() || str(e?.body).trim());
  if (!rows.length) refuse("Niente da aggiungere.", "Nothing to add.");
  if (slice.universe.length + rows.length > UNIVERSE_LIMITS.entries)
    refuse(
      `L’Universo tiene al massimo ${UNIVERSE_LIMITS.entries} voci.`,
      `The Universe holds at most ${UNIVERSE_LIMITS.entries} entries.`,
    );
  const added = rows.map((e) => ({
    id: `uni-${rand()}`,
    worldType: WORLD_TYPES.includes(e.worldType) ? e.worldType : "other",
    title: clip(e.title, UNIVERSE_LIMITS.title) || clip(e.body, 60),
    body: clip(e.body, UNIVERSE_LIMITS.body),
    source: isObject(e.source) ? clone(e.source) : null,
    createdAt: at,
    updatedAt: at,
    usedIn: {},
  }));
  slice.universe.push(...added);
  return added;
}
// Keeps a World entry of the campaign in play in the Universe (its readable sections too).
export function universeFromCampaign(state, entryIds, role, at = nowIso()) {
  requireDM(role);
  const view = campaignView(state, state.campaign?.id);
  const rows = arr(entryIds).map((id) => {
    const entry = worldEntry(state, view, id);
    if (!entry) refuse("Voce del mondo non disponibile.", "World entry unavailable.");
    return {
      worldType: entry.worldType,
      title: entry.title,
      body: [entry.body, ...entry.sections.map((s) => `${s.title}\n${s.body}`)]
        .filter((part) => str(part).trim())
        .join("\n\n"),
      source: { campaignId: view.id, entryId: entry.id },
    };
  });
  return addUniverseEntries(state, rows, role, at);
}
export function useUniverseEntries(state, ids, role) {
  requireDM(role);
  const slice = sliceOf(state);
  const campaignId = state.campaign?.id;
  if (!campaignId) refuse("Nessuna campagna in corso.", "No campaign in play.");
  return arr(ids).map((id) => {
    const entry = arr(slice.universe).find((e) => e.id === id);
    if (!entry) refuse("Voce dell’Universo non trovata.", "Universe entry not found.");
    const created = createCampaignEntryNow(
      state,
      {
        id: `uni-${rand()}`,
        kind: "world",
        worldType: entry.worldType,
        title: entry.title,
        body: entry.body,
        campaignId,
      },
      "dm",
    );
    entry.usedIn = { ...(entry.usedIn ?? {}), [campaignId]: created.entryId };
    return created;
  });
}
export function removeUniverseEntry(state, id, role) {
  requireDM(role);
  const slice = sliceOf(state);
  const before = arr(slice.universe).length;
  slice.universe = arr(slice.universe).filter((e) => e.id !== id);
  if (slice.universe.length === before)
    refuse("Voce dell’Universo non trovata.", "Universe entry not found.");
}

// ---------------------------------------------------------------- document import (BI-44)

// Shard's import: a Markdown or HTML document (Word: «Salva con nome › Pagina Web») becomes
// one entry per heading. No script runs and nothing is fetched: the markup is read as text.
const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  laquo: "«",
  raquo: "»",
  deg: "°",
  copy: "©",
  ccedil: "ç",
  ntilde: "ñ",
  ...Object.fromEntries(
    [..."aeiouAEIOU"].flatMap((v) => [
      [`${v}grave`, `${v}\u0300`.normalize("NFC")],
      [`${v}acute`, `${v}\u0301`.normalize("NFC")],
    ]),
  ),
};
function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : all;
    }
    return ENTITIES[code] ?? ENTITIES[code.toLowerCase()] ?? all;
  });
}
function htmlToMarkdown(html) {
  return decodeEntities(
    str(html)
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|head|xml|template|noscript)\b[\s\S]*?<\/\1>/gi, "")
      .replace(
        /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
        (_, level, inner) =>
          `\n\n${"#".repeat(Number(level))} ${inner
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim()}\n\n`,
      )
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|li|tr|h[4-6]|blockquote|section|article)>/gi, "\n\n")
      .replace(/<[^>]+>/g, ""),
  );
}
function stripMarkdown(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export const DOCUMENT_LIMITS = Object.freeze({ bytes: 2 * 1024 * 1024, sections: 60 });
/** {title, sections: [{title, body}]} from a document's text; kind "html" or "markdown". */
export function parseDocument(text, kind = "markdown", fileName = "") {
  const markdown = kind === "html" ? htmlToMarkdown(text) : str(text).replace(/\r\n?/g, "\n");
  const htmlTitle =
    kind === "html"
      ? decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(str(text))?.[1] ?? "")
      : "";
  const sections = [];
  let current = null,
    title = htmlTitle.trim(),
    preface = [];
  for (const line of markdown.split("\n")) {
    const heading = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading && heading[1].length === 1 && !title && !sections.length && !current) {
      title = heading[2].trim();
      continue;
    }
    if (heading) {
      current = { title: stripMarkdown(heading[2]), lines: [] };
      sections.push(current);
    } else (current ? current.lines : preface).push(line);
  }
  const rows = sections
    .map((section) => ({ title: section.title, body: stripMarkdown(section.lines.join("\n")) }))
    .filter((row) => row.title || row.body);
  const intro = stripMarkdown(preface.join("\n"));
  const fallback = str(fileName).replace(/\.[^.]+$/, "");
  if (intro) rows.unshift({ title: title || fallback || "Introduzione", body: intro });
  if (!rows.length) refuse("Il documento non contiene testo.", "The document contains no text.");
  if (rows.length > DOCUMENT_LIMITS.sections)
    refuse(
      `Troppe sezioni (${rows.length}): al massimo ${DOCUMENT_LIMITS.sections}.`,
      `Too many sections (${rows.length}): at most ${DOCUMENT_LIMITS.sections}.`,
    );
  return {
    title: title || fallback,
    sections: rows.map((row) => ({
      title: clip(row.title, UNIVERSE_LIMITS.title) || clip(row.body, 60),
      body: clip(row.body, UNIVERSE_LIMITS.body),
    })),
  };
}
export function documentKind(fileName) {
  const ext = str(fileName).toLowerCase().split(".").at(-1);
  if (["html", "htm"].includes(ext)) return "html";
  if (["md", "markdown", "txt"].includes(ext)) return "markdown";
  if (ext === "docx")
    refuse(
      "Da Word: File › Salva con nome › Pagina Web (.htm), oppure salva come testo o Markdown, e importa quel file.",
      "From Word: File › Save As › Web Page (.htm), or save as text or Markdown, and import that file.",
    );
  refuse(
    "Scegli un file HTML (.html, .htm) o Markdown (.md, .txt).",
    "Choose an HTML (.html, .htm) or Markdown (.md, .txt) file.",
  );
}
/** Imported sections into the Universe or the World of the campaign in play. */
export function importDocument(state, doc, target, role, at = nowIso()) {
  requireDM(role);
  const rows = arr(doc?.sections).map((s) => ({
    worldType: "other",
    title: s.title,
    body: s.body,
  }));
  if (target === "universe") return addUniverseEntries(state, rows, role, at);
  const campaignId = state.campaign?.id;
  if (!campaignId) refuse("Nessuna campagna in corso.", "No campaign in play.");
  return rows.map((row) =>
    createCampaignEntryNow(
      state,
      {
        id: `doc-${rand()}`,
        kind: "world",
        worldType: "other",
        title: row.title,
        body: row.body,
        campaignId,
      },
      "dm",
    ),
  );
}

// ---------------------------------------------------------------- usage and undo

/** Per campaign: the version it plays, entries it changed, updates waiting. */
export function adventureUsage(state, adventure, specs = {}) {
  const version = latest(adventure);
  const rows = [];
  for (const [campaignId, byAdventure] of Object.entries(readSlice(state).imports)) {
    const record = byAdventure?.[adventure.id];
    if (!record) continue;
    const view = campaignView(state, campaignId, specs);
    if (!view) continue;
    let modified = 0;
    let missing = 0;
    for (const [key, rec] of Object.entries(record.items)) {
      const [type] = splitKey(key);
      const target = findTarget(state, view, type, rec.targetId);
      if (!target) missing++;
      else if (localHash(type, target) !== rec.hash) modified++;
    }
    rows.push({
      campaignId,
      name: view.name,
      current: view.current,
      version: record.version,
      entries: Object.keys(record.items).length,
      modified,
      missing,
      copies: arr(record.copies).length,
      updateAvailable: record.version < version.number,
      updatedAt: record.updatedAt,
    });
  }
  return rows;
}
/** Adventures used in (or created from) a campaign, for Preparation. */
export function campaignAdventures(state, campaignId, specs = {}) {
  return readSlice(state).adventures.flatMap((adventure) => {
    const usage = adventureUsage(state, adventure, specs).find((u) => u.campaignId === campaignId);
    const origin = adventure.origin?.campaignId === campaignId;
    return usage || origin ? [{ adventure, usage: usage ?? null, origin }] : [];
  });
}
/** The parked-campaign records an operation may write, for its Undo. */
export function captureParked(state, campaignId) {
  const parked = parkedOf(state, campaignId);
  if (!parked) return null;
  const ext = {};
  for (const name of ["handouts", "random-tables", "encounter-builder"])
    ext[name] = parked.ext?.[name] ? clone(parked.ext[name]) : null;
  return {
    campaignId,
    scenes: clone(parked.scenes ?? []),
    activeSceneId: parked.activeSceneId ?? null,
    enabledContent:
      parked.campaign?.enabledContent === undefined
        ? undefined
        : clone(parked.campaign.enabledContent),
    ext,
  };
}
/**
 * Registry afterUndo: the B13 slice holding parked campaigns survives gameplay Undo, so a
 * reverted operation on a parked campaign (its journal entry is gone from the restored
 * snapshot) puts back what that campaign held before, from the session's saved copy.
 */
export function revertParkedWrites(current, restored, saved) {
  const kept = new Set(arr(restored?.ext?.[ID]?.journal).map((e) => e.id));
  const undone = arr(current?.ext?.[ID]?.journal)
    .filter((e) => e.parked && !kept.has(e.id))
    .reverse();
  for (const entry of undone) {
    const before = saved.get(entry.id);
    const parked = restored?.ext?.[MEMBERS]?.parked?.[before?.campaignId];
    if (!before || !parked) continue;
    parked.scenes = clone(before.scenes);
    parked.activeSceneId = before.activeSceneId;
    if (parked.campaign) {
      if (before.enabledContent === undefined) delete parked.campaign.enabledContent;
      else parked.campaign.enabledContent = clone(before.enabledContent);
    }
    parked.ext ??= {};
    for (const [name, value] of Object.entries(before.ext))
      if (value === null) delete parked.ext[name];
      else parked.ext[name] = clone(value);
    saved.delete(entry.id);
  }
}

// ---------------------------------------------------------------- printable export

const escHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_NAMES = {
  it: ["FOR", "DES", "COS", "INT", "SAG", "CAR"],
  en: ["STR", "DEX", "CON", "INT", "WIS", "CHA"],
};
const mod = (score) => {
  const value = Math.floor((Number(score) - 10) / 2);
  return value >= 0 ? `+${value}` : `−${Math.abs(value)}`;
};
export function tableRanges(results) {
  let next = 1;
  return arr(results).map((result) => {
    const from = next;
    next += Number.isInteger(result.weight) && result.weight > 0 ? result.weight : 1;
    const to = next - 1;
    return from === to ? String(from) : `${from}–${to}`;
  });
}
/**
 * Shard's book export (VTL-199): the whole package as one standalone, printable HTML
 * document, plain enough to paste into Word or Docs. Without DM notes it keeps only what
 * players may read: public scene text, handout player text and player-usable tables.
 */
export function adventureHTML(
  adventure,
  version,
  { lang = "it", dmNotes = true, exportedAt = nowIso() } = {},
) {
  const t = (it, en) => (lang === "en" ? en : it);
  const lab = (value) => escHTML(labelText(value, lang));
  const byType = (type) => version.items.filter((i) => i.type === type);
  const name = (key) => lab(nameForKey(version, key));
  const sections = [];
  const scenes = byType("scene");
  if (scenes.length)
    sections.push([
      "scene",
      t("Scene", "Scenes"),
      scenes
        .map((item) => {
          const d = item.data;
          const pins = arr(d.pins);
          const tokens = arr(d.tokens).map((tk) => name(tk.actorKey));
          return `<article><h3>${lab(d.name)}${version.startSceneKey === item.key ? ` <small>· ${t("scena iniziale", "start scene")}</small>` : ""}</h3>${d.publicDescription ? `<p class="read">${escHTML(d.publicDescription)}</p>` : ""}${dmNotes && d.description ? `<p>${escHTML(d.description)}</p>` : ""}${dmNotes && tokens.length ? `<p><strong>${t("Pedine", "Tokens")}:</strong> ${tokens.join(", ")}</p>` : ""}${pins.length ? `<h4>${t("Spilli", "Pins")}</h4><ul>${pins.map((pin) => `<li><strong>${escHTML(pin.label)}</strong>${pin.excerpt || pin.fallbackExcerpt ? ` — ${escHTML(pin.excerptLinked ? pin.fallbackExcerpt : pin.excerpt)}` : ""}${dmNotes && pin.dmNote ? `<br><em>${t("Nota del DM", "DM note")}:</em> ${escHTML(pin.dmNote)}` : ""}</li>`).join("")}</ul>` : ""}</article>`;
        })
        .join(""),
    ]);
  const npcs = byType("npc");
  if (npcs.length && dmNotes)
    sections.push([
      "npc",
      t("PNG", "NPCs"),
      npcs
        .map((item) => {
          const d = item.data;
          const scores = ABILITIES.map((key) => Number(d.abilities?.[key] ?? 10));
          return `<article class="statblock"><h3>${lab(d.name)}</h3><p><em>${lab(d.className)}</em></p><p><strong>${t("CA", "AC")}</strong> ${escHTML(d.ac)} · <strong>${t("PF", "HP")}</strong> ${escHTML(d.maxHp)} · <strong>${t("Velocità", "Speed")}</strong> ${escHTML(d.speed)} m</p><table><tr>${ABILITY_NAMES[lang === "en" ? "en" : "it"].map((n) => `<th>${n}</th>`).join("")}</tr><tr>${scores.map((s) => `<td>${s} (${mod(s)})</td>`).join("")}</tr></table>${
            arr(d.inventory).length
              ? `<p><strong>${t("Equipaggiamento", "Equipment")}:</strong> ${arr(d.inventory)
                  .map((row) => lab(row.name))
                  .join(", ")}</p>`
              : ""
          }${d.notes ? `<p>${escHTML(d.notes)}</p>` : ""}</article>`;
        })
        .join(""),
    ]);
  const materials = byType("material");
  if (materials.length)
    sections.push([
      "material",
      t("Materiali", "Materials"),
      materials
        .map((item) => {
          const d = item.data;
          return `<article><h3>${escHTML(d.title)}${version.introKey === item.key ? ` <small>· ${t("introduzione", "introduction")}</small>` : ""}</h3>${d.playerText ? `<p class="read">${escHTML(d.playerText)}</p>` : ""}${arr(
            d.sections,
          )
            .map(
              (s) =>
                `<h4>${escHTML(s.heading)}</h4>${s.playerText ? `<p class="read">${escHTML(s.playerText)}</p>` : ""}${dmNotes && s.dmText ? `<p><em>${t("Per il DM", "For the DM")}:</em> ${escHTML(s.dmText)}</p>` : ""}`,
            )
            .join("")}${
            arr(d.choices).length
              ? `<ul>${arr(d.choices)
                  .map((c) => `<li>${escHTML(c.text)}</li>`)
                  .join("")}</ul>`
              : ""
          }${dmNotes && d.dmNote ? `<p><em>${t("Nota del DM", "DM note")}:</em> ${escHTML(d.dmNote)}</p>` : ""}</article>`;
        })
        .join(""),
    ]);
  const tables = byType("table").filter((item) => dmNotes || item.data.playersCanUse);
  if (tables.length)
    sections.push([
      "table",
      t("Tabelle", "Tables"),
      tables
        .map((item) => {
          const d = item.data;
          const ranges = tableRanges(d.results);
          return `<article><h3>${lab(d.name)} <small>· d${escHTML(d.sides)}</small></h3><table><tr><th>d${escHTML(d.sides)}</th><th>${t("Risultato", "Result")}</th></tr>${arr(
            d.results,
          )
            .map(
              (r, i) =>
                `<tr><td>${ranges[i]}</td><td>${lab(r.text)}${r.subtableKey ? ` → ${name(r.subtableKey)}` : ""}</td></tr>`,
            )
            .join("")}</table></article>`;
        })
        .join(""),
    ]);
  const encounters = byType("encounter");
  if (encounters.length && dmNotes)
    sections.push([
      "encounter",
      t("Incontri", "Encounters"),
      encounters
        .map((item) => {
          const d = item.data;
          const creature = (row) =>
            row.actorKey
              ? name(row.actorKey)
              : row.blockId
                ? lab(arr(d.blocks).find((b) => b.id === row.blockId)?.name ?? row.blockId)
                : lab(CREATURES.find((c) => c.id === row.creatureId)?.name ?? row.creatureId);
          return `<article><h3>${escHTML(d.name)}</h3><ul>${arr(d.rows)
            .map(
              (row) =>
                `<li>${creature(row)} × ${escHTML(row.count ?? 1)}${row.groupId && row.groupId !== "main" ? ` (${escHTML(arr(d.groups).find((g) => g.id === row.groupId)?.name ?? row.groupId)})` : ""}</li>`,
            )
            .join(
              "",
            )}</ul>${d.notes?.readAloud ? `<p class="read">${escHTML(d.notes.readAloud)}</p>` : ""}${d.notes?.summary ? `<p>${escHTML(d.notes.summary)}</p>` : ""}${d.notes?.treasure ? `<p><strong>${t("Tesoro", "Treasure")}:</strong> ${escHTML(d.notes.treasure)}</p>` : ""}</article>`;
        })
        .join(""),
    ]);
  const world = byType("world");
  if (world.length && dmNotes)
    sections.push([
      "world",
      t("Mondo", "World"),
      world
        .map(
          (item) =>
            `<article><h3>${escHTML(item.data.title)}</h3>${item.data.body ? `<p>${escHTML(item.data.body)}</p>` : ""}${arr(
              item.data.sections,
            )
              .map((s) => `<h4>${escHTML(s.title)}</h4><p>${escHTML(s.body)}</p>`)
              .join("")}</article>`,
        )
        .join(""),
    ]);
  const srd = arr(version.external).filter((e) => e.kind === "srd");
  const deps = [
    ...srd.map(
      (e) =>
        `${lab(e.name)} — SRD 5.2.1${e.source ? ` (EN p. ${arr(e.source.en?.pages).join(", ")} · IT p. ${arr(e.source.it?.pages).join(", ")})` : ""}`,
    ),
    ...arr(version.requires).map(
      (r) => `${lab(r.name)} — ${t("contenuto homebrew richiesto", "required homebrew content")}`,
    ),
  ];
  if (deps.length && dmNotes)
    sections.push([
      "deps",
      t("Contenuti richiesti", "Required content"),
      `<ul>${deps.map((d) => `<li>${d}</li>`).join("")}</ul>`,
    ]);
  const origin =
    adventure.origin?.kind === "campaign"
      ? `${t("Da", "From")} ${escHTML(adventure.origin.name)}`
      : escHTML(adventure.origin?.publisher ?? "");
  return `<!doctype html>
<html lang="${lang === "en" ? "en" : "it"}"><head><meta charset="utf-8"><title>${escHTML(adventure.title)} · v${version.number}</title>
<style>body{font:15px/1.55 Georgia,"Times New Roman",serif;color:#1b1b1b;background:#fff;max-width:760px;margin:32px auto;padding:0 24px}h1{font-size:34px;margin:0 0 8px}h2{border-bottom:2px solid #7a5c2e;margin-top:36px;padding-bottom:4px}h3{margin:22px 0 6px}small{font-weight:normal;color:#555}.kicker,.meta{color:#555;font-size:13px}.read{border-left:3px solid #b99a5b;padding-left:12px;font-style:italic}table{border-collapse:collapse;margin:8px 0;width:100%}th,td{border:1px solid #bbb;padding:4px 8px;text-align:left}.statblock{border:1px solid #b99a5b;padding:4px 14px 10px;margin:14px 0}footer{margin-top:40px;font-size:12px;color:#555;border-top:1px solid #ccc;padding-top:10px}@media print{body{margin:0}a{color:inherit;text-decoration:none}h2{break-after:avoid}article{break-inside:avoid}}</style></head>
<body><header><p class="kicker">${t("Avventura", "Adventure")} · ${t("versione", "version")} ${version.number}${dmNotes ? "" : ` · ${t("edizione per i giocatori", "players’ edition")}`}</p><h1>${escHTML(adventure.title)}</h1>${adventure.summary ? `<p>${escHTML(adventure.summary)}</p>` : ""}<p class="meta">${origin} · D&amp;D 2024 · SRD 5.2.1</p></header>
<nav><h2>${t("Indice", "Contents")}</h2><ol>${sections.map(([id, title]) => `<li><a href="#${id}">${title}</a></li>`).join("")}</ol></nav>
${sections.map(([id, title, body]) => `<section id="${id}"><h2>${title}</h2>${body}</section>`).join("\n")}
<footer>${srd.length ? `<p>${escHTML(SRD_ATTRIBUTION[lang === "en" ? "en" : "it"])}</p>` : ""}<p>${t("Esportato da d20 Studio (prototipo) il", "Exported from d20 Studio (prototype) on")} ${escHTML(exportedAt.slice(0, 10))}.</p></footer>
</body></html>`;
}
export const exportFileName = (adventure, version) =>
  `${
    str(adventure.title)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "avventura"
  }-v${version.number}.html`;

// ---------------------------------------------------------------- user interface

const ui = { forms: {}, dirty: false, report: null, focus: null, printDm: true, lastLabel: null };
const parkedBefore = new Map();
function resetUI() {
  ui.forms = {};
  ui.dirty = false;
  ui.report = null;
  ui.focus = null;
  ui.printDm = true;
  ui.lastLabel = null;
}
function specsOf(ctx) {
  return Object.fromEntries(
    (ctx.registry?.slices?.() ?? []).map((def) => [
      def.name,
      { version: def.version, normalize: def.normalize },
    ]),
  );
}
const typeName = (ctx, type, plural = true) => ctx.label(TYPE_NAMES[type][plural ? 1 : 0]);
function countText(ctx, items) {
  return TYPES.map((type) => [type, items.filter((i) => i.type === type).length])
    .filter(([, n]) => n)
    .map(([type, n]) => {
      const name = typeName(ctx, type, n !== 1);
      return `${n} ${type === "npc" ? name : name.toLowerCase()}`;
    })
    .join(" · ");
}
function dateText(ctx, iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(ctx.lang === "en" ? "en-GB" : "it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 10);
  }
}
function errorText(ctx, error) {
  return error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error);
}
/** Runs a command; a refusal (or an offline block) becomes a readable toast. */
function perform(ctx, run) {
  try {
    return run();
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return undefined;
  }
}
/** Commits and remembers the label, so the page can offer Undo for this change only. */
function commit(ctx, label, mutator, options) {
  ctx.commit(label, mutator, options);
  ui.lastLabel = options?.undoable === false ? null : label;
}
/** A shared campaign write; on a parked campaign it remembers what Undo must put back
 * (the parked campaign lives in the B13 slice, which gameplay Undo preserves). */
function campaignCommit(ctx, label, campaignId, mutator) {
  let result;
  let captured = null;
  let entryId = null;
  commit(
    ctx,
    label,
    (draft) => {
      captured = draft.campaign?.id === campaignId ? null : captureParked(draft, campaignId);
      const before = draft.ext?.[ID]?.journal?.length ?? 0;
      result = mutator(draft);
      const last = draft.ext?.[ID]?.journal?.at(-1);
      entryId = captured && last?.parked && draft.ext[ID].journal.length > before ? last.id : null;
    },
    { visibility: "private" },
  );
  if (entryId) parkedBefore.set(entryId, captured);
  return result;
}
function undoBar(ctx) {
  const label = ui.lastLabel;
  if (!label || !ctx.canUndo?.() || ctx.undoLabel?.() !== label) return "";
  return `<p class="adv-undo" role="status"><span>${ctx.t("Ultima modifica", "Last change")}: «${ctx.esc(label)}»</span><button type="button" class="button" data-adv-undo>${ctx.icon("undo")} ${ctx.t("Annulla", "Undo")}</button></p>`;
}
function bindUndo(el, ctx) {
  el.querySelector("[data-adv-undo]")?.addEventListener("click", () => {
    ui.lastLabel = null;
    ui.report = null;
    ctx.undo();
  });
}
function go(ctx, id, tab = "") {
  ctx.navigate("adventures", tab ? { id, tab } : { id });
}
function crumbs(ctx, adventure, here) {
  return `<nav class="adv-crumbs" aria-label="${ctx.t("Percorso", "Breadcrumb")}"><button type="button" class="text-button" data-adv-library>${ctx.t("Biblioteca › Avventure", "Library › Adventures")}</button>${adventure ? `<span aria-hidden="true">›</span>${here ? `<button type="button" class="text-button" data-adv-open="${ctx.esc(adventure.id)}">${ctx.esc(adventure.title)}</button><span aria-hidden="true">›</span><span>${ctx.esc(here)}</span>` : `<span>${ctx.esc(adventure.title)}</span>`}` : here ? `<span aria-hidden="true">›</span><span>${ctx.esc(here)}</span>` : ""}</nav>`;
}
function usageBadge(ctx, usage) {
  const updates = usage.filter((u) => u.updateAvailable).length;
  return updates
    ? `<span class="badge adv-badge-update">${ctx.t(`Aggiornamento disponibile in ${updates} campagn${updates === 1 ? "a" : "e"}`, `Update available in ${updates} campaign${updates === 1 ? "" : "s"}`)}</span>`
    : "";
}
function originText(ctx, adventure) {
  return adventure.origin?.kind === "campaign"
    ? ctx.t(`Da ${adventure.origin.name}`, `From ${adventure.origin.name}`)
    : ctx.t(
        `Pacchetto di ${adventure.origin?.publisher ?? "—"}`,
        `Package by ${adventure.origin?.publisher ?? "—"}`,
      );
}

// Library › Adventures: the collection.
function listBody(ctx) {
  const specs = specsOf(ctx);
  const adventures = readSlice(ctx.state).adventures;
  const cards = adventures
    .map((adventure) => {
      const version = latest(adventure);
      const usage = adventureUsage(ctx.state, adventure, specs);
      return `<li class="adv-card"><h3><button type="button" class="adv-card-open" data-adv-open="${ctx.esc(adventure.id)}">${ctx.esc(adventure.title)}</button></h3><p class="adv-card-meta"><span class="badge">v${version.number}</span> ${ctx.esc(originText(ctx, adventure))}</p>${adventure.summary ? `<p class="adv-card-summary">${ctx.esc(adventure.summary)}</p>` : ""}<p class="muted">${ctx.esc(countText(ctx, version.items))}</p><p class="muted">${usage.length ? ctx.t(`Usata in ${usage.length} campagn${usage.length === 1 ? "a" : "e"}`, `Used in ${usage.length} campaign${usage.length === 1 ? "" : "s"}`) : ctx.t("Non ancora importata", "Not imported yet")}</p>${usageBadge(ctx, usage)}</li>`;
    })
    .join("");
  return `<div class="adv-list">${undoBar(ctx)}<div class="adv-list-head"><div><h2>${ctx.t("Avventure", "Adventures")}</h2><p class="muted">${ctx.t("Scene, PNG, materiali, tabelle, incontri e voci del mondo da riusare in altre campagne. Ogni gruppo gioca la propria copia: ciò che accade al tavolo non cambia l’avventura.", "Scenes, NPCs, materials, tables, encounters and world entries to reuse in other campaigns. Each group plays its own copy: what happens at the table never changes the adventure.")}</p></div><div class="toolbar"><label class="button adv-file-button">${ctx.icon("scroll")} ${ctx.t("Importa documento…", "Import document…")}<input type="file" accept=".md,.markdown,.txt,.html,.htm,.docx,text/markdown,text/html,text/plain" data-adv-import-document class="adv-file-input"></label><button type="button" class="button primary" data-adv-new>${ctx.icon("plus")} ${ctx.t("Crea avventura", "Create adventure")}</button></div></div>${adventures.length ? `<ul class="adv-cards">${cards}</ul>` : `<p class="empty-state">${ctx.t("Nessuna avventura. Creane una dalla campagna in corso.", "No adventures yet. Create one from the campaign in play.")}</p>`}${universePanel(ctx)}</div>`;
}
// BI-40 (Alchemy Universe): the DM's world entries shared by every campaign.
function universePanel(ctx) {
  const entries = universeOf(ctx.state);
  const campaignId = ctx.state.campaign?.id;
  const type = (id) =>
    ({
      person: ctx.t("Persona", "Person"),
      place: ctx.t("Luogo", "Place"),
      faction: ctx.t("Fazione", "Faction"),
      shop: ctx.t("Negozio", "Shop"),
      event: ctx.t("Storia o evento", "History or event"),
      list: ctx.t("Elenco", "List"),
      other: ctx.t("Altro", "Other"),
    })[id] ?? id;
  return `<section class="adv-universe" aria-labelledby="adv-universe-title"><div class="adv-list-head"><div><h2 id="adv-universe-title">${ctx.t("Universo", "Universe")}</h2><p class="muted">${ctx.t("Luoghi, fazioni e storia del tuo mondo, validi in tutte le campagne. Ciò che accade in una partita resta nel Mondo di quella campagna.", "Places, factions and history of your world, valid in every campaign. What happens in a game stays in that campaign’s World.")}</p></div><div class="toolbar"><button type="button" class="button" data-adv-universe-add>${ctx.icon("plus")} ${ctx.t("Aggiungi voce…", "Add entry…")}</button><button type="button" class="button" data-adv-universe-from>${ctx.t("Dal Mondo della campagna…", "From the campaign World…")}</button></div></div>${
    entries.length
      ? `<ul class="item-list">${entries
          .map((e) => {
            const used = campaignId && e.usedIn?.[campaignId];
            return `<li class="item-row" data-adv-universe="${ctx.esc(e.id)}"><div><strong>${ctx.esc(e.title)}</strong><small>${ctx.esc(type(e.worldType))}${e.body ? ` · ${ctx.esc(e.body.slice(0, 120))}${e.body.length > 120 ? "…" : ""}` : ""}</small>${used ? `<small class="adv-update-note">${ctx.t("Già nel Mondo di questa campagna", "Already in this campaign’s World")}</small>` : ""}</div><div class="toolbar">${campaignId ? `<button type="button" class="button ${used ? "quiet" : "primary"}" data-adv-universe-use="${ctx.esc(e.id)}">${used ? ctx.t("Aggiungi di nuovo", "Add again") : ctx.t("Usa in questa campagna", "Use in this campaign")}</button>` : ""}<button type="button" class="button quiet" data-adv-universe-remove="${ctx.esc(e.id)}" aria-label="${ctx.esc(ctx.t(`Rimuovi ${e.title} dall’Universo`, `Remove ${e.title} from the Universe`))}">${ctx.t("Rimuovi", "Remove")}</button></div></li>`;
          })
          .join("")}</ul>`
      : `<p class="empty-state">${ctx.t("L’Universo è vuoto. Aggiungi una voce, prendila dal Mondo della campagna o importa un documento.", "The Universe is empty. Add an entry, take it from the campaign World or import a document.")}</p>`
  }</section>`;
}

// Create / rebuild: the package editor with its live preview.
function formState(key) {
  return ui.forms[key] ?? null;
}
function readForm(form) {
  const data = new FormData(form);
  return {
    title: data.get("title") ?? undefined,
    summary: data.get("summary") ?? undefined,
    notes: data.get("notes") ?? undefined,
    startSceneKey: data.get("startSceneKey") || null,
    introKey: data.get("introKey") || null,
    picks: data.getAll("pick"),
  };
}
function pickList(ctx, catalog, picked) {
  return TYPES.map((type) => {
    const entries = catalog?.[type] ?? [];
    return `<fieldset class="adv-pick-group"><legend>${typeName(ctx, type)} <span class="muted">(${entries.length})</span></legend>${
      entries.length
        ? entries
            .map(
              (entry) =>
                `<label class="adv-check"><input type="checkbox" name="pick" value="${ctx.esc(entry.key)}" ${picked.includes(entry.key) ? "checked" : ""}><span>${ctx.esc(labelText(entry.name, ctx.lang))}${entry.kind === "vignette" ? ` <small class="muted">· ${ctx.t("vignetta", "vignette")}</small>` : ""}${type === "scene" && entry.tokens ? ` <small class="muted">· ${ctx.t(`${entry.tokens} pedine`, `${entry.tokens} tokens`)}</small>` : ""}</span></label>`,
            )
            .join("")
        : `<p class="muted adv-none">${ctx.t("Nessuna voce in questa campagna.", "No entries in this campaign.")}</p>`
    }</fieldset>`;
  }).join("");
}
function becauseText(ctx, auto, items) {
  if (auto.because === "start") return ctx.t("scena iniziale", "start scene");
  if (auto.because === "intro") return ctx.t("introduzione", "introduction");
  const from = items.find((i) => i.key === auto.because);
  const fromName = labelText(from?.name, ctx.lang);
  if (auto.type === "npc" && from?.type === "scene")
    return ctx.t(`pedina in «${fromName}»`, `token in “${fromName}”`);
  if (auto.type === "npc") return ctx.t(`creatura di «${fromName}»`, `creature of “${fromName}”`);
  if (auto.type === "table")
    return ctx.t(`sottotabella di «${fromName}»`, `subtable of “${fromName}”`);
  return ctx.t(`richiesta da «${fromName}»`, `required by “${fromName}”`);
}
function externalText(ctx, e) {
  if (e.kind === "srd")
    return `${ctx.label(e.name)} · SRD 5.2.1${e.source ? ` (EN p. ${arr(e.source.en?.pages).join(", ")} · IT p. ${arr(e.source.it?.pages).join(", ")})` : ""}`;
  if (e.kind === "art")
    return `${ctx.label(e.name)} · ${ctx.t("immagine della raccolta dell’app: disponibile in ogni campagna", "app collection image: available in every campaign")}`;
  return `${e.name} · ${ctx.t("immagine della tua Biblioteca: non inclusa nel pacchetto", "image from your Library: not embedded in the package")}`;
}
function excludedText(ctx, e) {
  const from = ctx.esc(e.from ?? "");
  if (e.kind === "pc-token")
    return ctx.t(
      `Pedina di ${ctx.esc(e.name)} in «${from}»: i personaggi dei giocatori non entrano mai`,
      `${ctx.esc(e.name)}’s token in “${from}”: player characters never travel`,
    );
  if (e.kind === "pc-row")
    return ctx.t(
      `${ctx.esc(e.name)} in «${from}»: personaggio del gruppo`,
      `${ctx.esc(e.name)} in “${from}”: party character`,
    );
  if (e.kind === "archive-link")
    return ctx.t(
      `Collegamento all’archivio dello spillo «${ctx.esc(e.name)}»: resta nella campagna`,
      `Archive link of pin “${ctx.esc(e.name)}”: stays in the campaign`,
    );
  return ctx.t(
    `${ctx.esc(e.name)} in «${from}»: non disponibile`,
    `${ctx.esc(e.name)} in “${from}”: unavailable`,
  );
}
function packPreview(ctx, pack) {
  const items = pack.items;
  const group = (title, rows) =>
    rows.length ? `<h3>${title}</h3><ul class="adv-dep-list">${rows.join("")}</ul>` : "";
  return `<h2>${ctx.t("Nel pacchetto", "In the package")}</h2><p class="adv-total" data-adv-total>${items.length ? ctx.esc(countText(ctx, items)) : ctx.t("Ancora niente: scegli cosa includere.", "Nothing yet: choose what to include.")}</p>${group(
    ctx.t("Aggiunte perché richieste", "Added because required"),
    pack.auto.map(
      (a) =>
        `<li class="adv-dep-auto"><strong>${ctx.esc(labelText(a.name, ctx.lang))}</strong> <small>· ${ctx.esc(becauseText(ctx, a, items))}</small></li>`,
    ),
  )}${group(
    ctx.t("Dipendenze esterne", "External dependencies"),
    pack.external.map((e) => `<li>${ctx.esc(externalText(ctx, e))}</li>`),
  )}${group(
    ctx.t("Contenuti homebrew richiesti", "Required homebrew content"),
    pack.requires.map(
      (r) => `<li>${ctx.esc(ctx.label(r.name))} <small>· ${ctx.esc(r.via)}</small></li>`,
    ),
  )}${group(
    ctx.t("Collegamenti non inclusi", "Links not included"),
    pack.optional.map(
      (o) =>
        `<li>${ctx.esc(labelText(o.from, ctx.lang))} → ${ctx.esc(o.key)} <small>· ${ctx.t("si ricollega solo se entrambi viaggiano", "relinked only if both travel")}</small></li>`,
    ),
  )}${group(
    ctx.t("Esclusi", "Excluded"),
    pack.excluded.map((e) => `<li>${excludedText(ctx, e)}</li>`),
  )}<p class="muted adv-note">${ctx.t("Si conserva lo stato iniziale: PF pieni, scene nascoste, materiali mai mostrati. Note «Solo io» e schede dei giocatori non entrano mai.", "The initial state is kept: full HP, hidden scenes, materials never shown. “Only me” notes and player sheets never travel.")}</p>`;
}
const FIELD_NAMES = {
  name: L("nome", "name"),
  title: L("titolo", "title"),
  description: L("descrizione", "description"),
  publicDescription: L("descrizione per i giocatori", "player description"),
  tokens: L("pedine", "tokens"),
  pins: L("spilli", "pins"),
  playerText: L("testo per i giocatori", "player text"),
  dmNote: L("nota del DM", "DM note"),
  sections: L("sezioni", "sections"),
  choices: L("scelte", "choices"),
  results: L("voci", "entries"),
  sides: L("dado", "die"),
  hp: L("punti ferita", "hit points"),
  maxHp: L("punti ferita", "hit points"),
  ac: L("classe armatura", "armor class"),
  inventory: L("inventario", "inventory"),
  rows: L("creature", "creatures"),
  notes: L("note", "notes"),
  background: L("immagine di sfondo", "background image"),
  walls: L("muri", "walls"),
  terrain: L("terreno difficile", "difficult terrain"),
  width: L("dimensioni", "size"),
  height: L("dimensioni", "size"),
  gridSize: L("griglia", "grid"),
  metersPerCell: L("griglia", "grid"),
  gridOffsetX: L("griglia", "grid"),
  gridOffsetY: L("griglia", "grid"),
  gridVisible: L("griglia", "grid"),
  gridSnap: L("griglia", "grid"),
  template: L("base della mappa", "map base"),
  abilities: L("caratteristiche", "abilities"),
  speed: L("velocità", "speed"),
  image: L("immagine", "image"),
  tags: L("etichette", "tags"),
  groups: L("gruppi", "groups"),
  playersCanUse: L("uso dei giocatori", "player use"),
};
const OTHER_FIELDS = L("altre impostazioni", "other settings");
function diffPreview(ctx, preview) {
  const { diff, previous, pack } = preview;
  const row = (cls, sign, item, extra = "") =>
    `<li class="adv-diff ${cls}"><span class="adv-diff-sign" aria-hidden="true">${sign}</span><span><strong>${ctx.esc(labelText(item.name, ctx.lang))}</strong> <small>· ${ctx.esc(typeName(ctx, item.type, false))}${extra}</small></span></li>`;
  const fields = (item) =>
    ` · ${[...new Set(item.fields.map((f) => ctx.label(FIELD_NAMES[f] ?? OTHER_FIELDS)))].join(", ")}`;
  const list = [
    ...diff.added.map((i) => row("is-added", "+", i, ` · ${ctx.t("aggiunta", "added")}`)),
    ...diff.removed.map((i) => row("is-removed", "−", i, ` · ${ctx.t("rimossa", "removed")}`)),
    ...diff.changed.map((i) => row("is-changed", "~", i, fields(i))),
  ];
  return `<h2>${ctx.t(`Rispetto alla versione ${previous.number}`, `Compared with version ${previous.number}`)}</h2><p class="adv-total" data-adv-total>${ctx.t(`${diff.added.length} aggiunte · ${diff.removed.length} rimosse · ${diff.changed.length} modificate · ${diff.unchanged.length} invariate`, `${diff.added.length} added · ${diff.removed.length} removed · ${diff.changed.length} changed · ${diff.unchanged.length} unchanged`)}</p>${list.length ? `<ul class="adv-diff-list" data-adv-diff>${list.join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna differenza: la campagna d’origine è come la versione pubblicata.", "No difference: the origin campaign matches the published version.")}</p>`}${preview.startChanged ? `<p class="muted">${ctx.t("Cambia la scena iniziale.", "The start scene changes.")}</p>` : ""}${preview.introChanged ? `<p class="muted">${ctx.t("Cambia l’introduzione.", "The introduction changes.")}</p>` : ""}${pack.auto.length ? `<h3>${ctx.t("Aggiunte perché richieste", "Added because required")}</h3><ul class="adv-dep-list">${pack.auto.map((a) => `<li class="adv-dep-auto">${ctx.esc(labelText(a.name, ctx.lang))} <small>· ${ctx.esc(becauseText(ctx, a, pack.items))}</small></li>`).join("")}</ul>` : ""}<p class="muted adv-note">${ctx.t("Le campagne che usano l’avventura ricevono l’aggiornamento solo se lo accetti da lì: le voci che hanno cambiato non vengono sovrascritte.", "Campaigns using the adventure get the update only when accepted there: entries they changed are never overwritten.")}</p>`;
}
function editorPage(ctx, mode, adventure = null) {
  const specs = specsOf(ctx);
  const formKey = `${mode}:${adventure?.id ?? ""}`;
  const saved = formState(formKey);
  const campaignId = mode === "rebuild" ? adventure.origin?.campaignId : ctx.state.campaign?.id;
  const catalog = sourceCatalog(ctx.state, campaignId, specs);
  if (!catalog)
    return mode === "rebuild"
      ? `${crumbs(ctx, adventure, ctx.t("Nuova versione", "New version"))}<p class="empty-state">${ctx.t("La campagna d’origine non esiste più: non si può ricostruire.", "The origin campaign no longer exists: it cannot be rebuilt.")}</p>`
      : `${crumbs(ctx, null, ctx.t("Crea avventura", "Create adventure"))}<p class="empty-state">${ctx.t("Nessuna campagna in corso: avviane una da Campagne per crearne un’avventura.", "No campaign in play: launch one from Campaigns to make an adventure from it.")}</p>`;
  const previous = adventure ? latest(adventure) : null;
  const sourceIdsNow = new Set(TYPES.flatMap((type) => catalog[type].map((e) => e.key)));
  const picked =
    saved?.picks ??
    (previous ? previous.items.map((i) => i.key).filter((k) => sourceIdsNow.has(k)) : []);
  const input = {
    title: saved?.title ?? "",
    summary: saved?.summary ?? adventure?.summary ?? "",
    notes: saved?.notes ?? "",
    startSceneKey: saved ? saved.startSceneKey : (previous?.startSceneKey ?? null),
    introKey: saved ? saved.introKey : (previous?.introKey ?? null),
    picks: picked,
  };
  let preview;
  try {
    preview =
      mode === "rebuild"
        ? diffPreview(ctx, rebuildPreview(ctx.state, adventure.id, input, specs))
        : packPreview(ctx, collectPackage(ctx.state, campaignId, input.picks, specs, input));
  } catch (error) {
    preview = `<p class="error">${ctx.esc(errorText(ctx, error))}</p>`;
  }
  const option = (value, text, selected) =>
    `<option value="${ctx.esc(value)}" ${selected ? "selected" : ""}>${ctx.esc(text)}</option>`;
  const sourceName = mode === "rebuild" ? adventure.origin.name : ctx.state.campaign?.name;
  return `${crumbs(ctx, adventure, mode === "rebuild" ? ctx.t("Nuova versione", "New version") : ctx.t("Crea avventura", "Create adventure"))}<div class="page-heading"><div><h1>${mode === "rebuild" ? ctx.t(`Nuova versione di «${adventure.title}»`, `New version of “${adventure.title}”`) : ctx.t("Crea avventura", "Create adventure")}</h1><p>${mode === "rebuild" ? ctx.t(`Ricostruisci dalla campagna d’origine «${sourceName}»: vedi cosa si aggiunge, cosa si toglie e cosa cambia prima di pubblicare.`, `Rebuild from the origin campaign “${sourceName}”: see what is added, removed and changed before publishing.`) : ctx.t(`Dalla campagna in corso «${sourceName}»: scegli cosa includere. Ciò che serve si aggiunge da sé.`, `From the campaign in play “${sourceName}”: choose what to include. What it needs is added for you.`)}</p></div></div><form class="adv-editor" data-adv-form="${mode}" data-adv-form-key="${ctx.esc(formKey)}" novalidate><div class="adv-editor-main"><section class="panel"><h2>${ctx.t("Presentazione", "Overview")}</h2>${mode === "create" ? `<label class="field">${ctx.t("Titolo", "Title")}<input name="title" maxlength="80" required value="${ctx.esc(input.title)}" autocomplete="off"></label>` : ""}<label class="field">${ctx.t("Presentazione", "Summary")}<textarea name="summary" maxlength="1000" rows="3">${ctx.esc(input.summary)}</textarea></label><div class="form-grid"><label class="field">${ctx.t("Scena iniziale", "Start scene")}<select name="startSceneKey">${option("", ctx.t("Nessuna", "None"), !input.startSceneKey)}${catalog.scene.map((s) => option(s.key, s.name, input.startSceneKey === s.key)).join("")}</select></label><label class="field">${ctx.t("Introduzione per i giocatori", "Introduction for the players")}<select name="introKey">${option("", ctx.t("Nessuna", "None"), !input.introKey)}${catalog.material.map((m) => option(m.key, m.name, input.introKey === m.key)).join("")}</select></label></div>${mode === "rebuild" ? `<label class="field">${ctx.t("Note della versione (le leggono le campagne che la usano)", "Version notes (read by the campaigns using it)")}<textarea name="notes" maxlength="600" rows="3" required>${ctx.esc(input.notes)}</textarea></label>` : ""}</section><section class="panel"><h2>${ctx.t("Contenuti", "Contents")}</h2>${pickList(ctx, catalog, input.picks)}</section></div><aside class="panel adv-preview" data-adv-preview aria-live="polite">${preview}</aside><div class="toolbar adv-actions"><button type="button" class="button quiet" data-adv-cancel>${ctx.t("Annulla", "Cancel")}</button><button type="submit" class="button primary">${mode === "rebuild" ? ctx.t(`Pubblica versione ${previous.number + 1}`, `Publish version ${previous.number + 1}`) : ctx.t("Crea avventura", "Create adventure")}</button></div></form>`;
}
function refreshEditor(el, ctx, form) {
  const mode = form.dataset.advForm;
  const key = form.dataset.advFormKey;
  const input = readForm(form);
  ui.forms[key] = input;
  ui.dirty = true;
  const specs = specsOf(ctx);
  const aside = el.querySelector("[data-adv-preview]");
  if (!aside) return;
  try {
    if (mode === "rebuild") {
      const adventureId = key.split(":")[1];
      aside.innerHTML = diffPreview(ctx, rebuildPreview(ctx.state, adventureId, input, specs));
    } else
      aside.innerHTML = packPreview(
        ctx,
        collectPackage(ctx.state, ctx.state.campaign?.id, input.picks, specs, input),
      );
  } catch (error) {
    aside.innerHTML = `<p class="error">${ctx.esc(errorText(ctx, error))}</p>`;
  }
}

// Detail: the package, its dependencies, the campaigns playing it and its versions.
/** "Version 1 · 8 entries · 1 changed here · 1 copy" for a campaign playing the package. */
function usageText(ctx, u) {
  return [
    ctx.t(`Versione ${u.version}`, `Version ${u.version}`),
    plural(ctx, u.entries, ["voce", "voci"], ["entry", "entries"]),
    `${plural(ctx, u.modified, ["modificata", "modificate"], ["changed", "changed"])} ${ctx.t("in questa campagna", "in this campaign")}`,
    ...(u.missing
      ? [plural(ctx, u.missing, ["eliminata", "eliminate"], ["deleted", "deleted"])]
      : []),
    ...(u.copies ? [plural(ctx, u.copies, ["copia", "copie"], ["copy", "copies"])] : []),
  ].join(" · ");
}
const plural = (ctx, n, it, en) => `${n} ${ctx.t(it[n === 1 ? 0 : 1], en[n === 1 ? 0 : 1])}`;
function itemDetail(ctx, item, version) {
  const d = item.data;
  if (item.type === "scene")
    return [
      plural(ctx, arr(d.tokens).length, ["pedina", "pedine"], ["token", "tokens"]),
      plural(ctx, arr(d.pins).length, ["spillo", "spilli"], ["pin", "pins"]),
    ].join(" · ");
  if (item.type === "npc") return `${ctx.t("CA", "AC")} ${d.ac} · ${ctx.t("PF", "HP")} ${d.maxHp}`;
  if (item.type === "material")
    return `${d.kind === "vignette" ? ctx.t("vignetta", "vignette") : "handout"}${
      arr(d.sceneKeys).length
        ? ` · ${ctx.t("scena", "scene")} ${arr(d.sceneKeys)
            .map((k) => labelText(nameForKey(version, k), ctx.lang))
            .join(", ")}`
        : ""
    }`;
  if (item.type === "table")
    return `d${d.sides} · ${ctx.t(`${arr(d.results).length} voci`, `${arr(d.results).length} entries`)}${arr(d.results).some((r) => r.subtableKey) ? ` · ${ctx.t("con sottotabella", "with subtable")}` : ""}`;
  return arr(d.rows)
    .map(
      (row) =>
        `${row.actorKey ? labelText(nameForKey(version, row.actorKey), ctx.lang) : ctx.label(CREATURES.find((c) => c.id === row.creatureId)?.name ?? row.blockId ?? "?")} ×${row.count ?? 1}`,
    )
    .join(", ");
}
function detailPage(ctx, adventure) {
  const specs = specsOf(ctx);
  const version = latest(adventure);
  const usage = adventureUsage(ctx.state, adventure, specs);
  const requirements = requirementStatus(ctx.state, version, null, ctx.role, specs);
  const canRebuild = adventure.origin?.kind === "campaign";
  const contents = TYPES.map((type) => {
    const items = version.items.filter((i) => i.type === type);
    if (!items.length) return "";
    return `<h3>${typeName(ctx, type)} <span class="muted">(${items.length})</span></h3><ul class="item-list adv-items">${items.map((item) => `<li class="item-row" data-adv-item="${ctx.esc(item.key)}"><div><strong>${ctx.esc(labelText(item.name, ctx.lang))}</strong>${version.startSceneKey === item.key ? ` <span class="badge">${ctx.t("scena iniziale", "start scene")}</span>` : ""}${version.introKey === item.key ? ` <span class="badge">${ctx.t("introduzione", "introduction")}</span>` : ""}<small>${ctx.esc(itemDetail(ctx, item, version))}</small></div></li>`).join("")}</ul>`;
  }).join("");
  const deps = [
    ...arr(version.external).map((e) => `<li>${ctx.esc(externalText(ctx, e))}</li>`),
    ...requirements.map(
      (r) =>
        `<li>${ctx.esc(ctx.label(r.name))} · ${ctx.t("homebrew", "homebrew")} <span class="badge">${r.status === "ready" ? ctx.t("nella tua Biblioteca", "in your Library") : r.status === "outdated" ? ctx.t("revisione precedente in Biblioteca", "older revision in the Library") : ctx.t("non ancora in Biblioteca", "not in the Library yet")}</span></li>`,
    ),
    ...arr(version.excluded).map((e) => `<li class="muted">${excludedText(ctx, e)}</li>`),
  ];
  const report = ui.report?.adventureId === adventure.id ? reportPanel(ctx, ui.report) : "";
  const usageRows = usage
    .map(
      (u) =>
        `<li class="item-row adv-usage" data-adv-usage="${ctx.esc(u.campaignId)}"><div><strong>${ctx.esc(u.name)}</strong>${u.current ? ` <span class="badge">${ctx.t("in corso", "in play")}</span>` : ""}<small>${ctx.esc(usageText(ctx, u))}</small>${u.updateAvailable ? `<small class="adv-update-note">${ctx.t(`Aggiornamento disponibile: versione ${version.number}`, `Update available: version ${version.number}`)}</small>` : ""}</div><button type="button" class="button ${u.updateAvailable ? "primary" : ""}" data-adv-import-into="${ctx.esc(u.campaignId)}">${u.updateAvailable ? ctx.t("Rivedi aggiornamento", "Review update") : ctx.t("Importa di nuovo", "Import again")}</button></li>`,
    )
    .join("");
  const originRow =
    adventure.origin?.kind === "campaign"
      ? `<li class="item-row"><div><strong>${ctx.esc(adventure.origin.name)}</strong> <span class="badge">${ctx.t("origine", "origin")}</span><small>${ctx.t("Qui si modificano i contenuti; «Nuova versione» li ricostruisce.", "Content is edited here; “New version” rebuilds it.")}</small></div></li>`
      : "";
  const history = readSlice(ctx.state)
    .journal.filter((e) => e.adventureId === adventure.id)
    .slice(-6)
    .reverse()
    .map((e) => `<li>${ctx.esc(dateText(ctx, e.at))} · ${ctx.esc(journalText(ctx, e))}</li>`)
    .join("");
  return `${crumbs(ctx, adventure)}<div class="page-heading adv-detail-head"><div><h1>${ctx.esc(adventure.title)}</h1><p><span class="badge">v${version.number}</span> ${ctx.esc(originText(ctx, adventure))} · ${ctx.esc(dateText(ctx, version.createdAt))}</p>${adventure.summary ? `<p>${ctx.esc(adventure.summary)}</p>` : ""}</div></div>${undoBar(ctx)}<div class="toolbar adv-detail-actions"><button type="button" class="button primary" data-adv-go="import">${ctx.t("Importa in una campagna", "Import into a campaign")}</button>${ctx.state.ext?.[MEMBERS] ? `<button type="button" class="button" data-adv-go="campaign">${ctx.t("Crea campagna con l’avventura", "Create campaign with this adventure")}</button>` : ""}${canRebuild ? `<button type="button" class="button" data-adv-go="rebuild">${ctx.t("Nuova versione", "New version")}</button>` : ""}<button type="button" class="button" data-adv-go="print">${ctx.t("Esporta HTML", "Export HTML")}</button><button type="button" class="button quiet danger" data-adv-delete>${ctx.t("Elimina", "Delete")}</button></div>${report}<div class="adv-detail-grid"><section class="panel"><h2>${ctx.t("Contenuto", "Contents")}</h2><p class="muted">${ctx.esc(countText(ctx, version.items))}</p>${contents}</section><div class="adv-detail-side"><section class="panel"><h2>${ctx.t("Dipendenze", "Dependencies")}</h2>${deps.length ? `<ul class="adv-dep-list">${deps.join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna: il pacchetto è autonomo.", "None: the package is self-contained.")}</p>`}</section><section class="panel"><h2>${ctx.t("Campagne", "Campaigns")}</h2>${originRow || usageRows ? `<ul class="item-list adv-usage-list">${originRow}${usageRows}</ul>` : `<p class="muted">${ctx.t("Non ancora importata.", "Not imported yet.")}</p>`}</section><section class="panel"><h2>${ctx.t("Versioni", "Versions")}</h2><ol class="adv-versions" reversed>${[
    ...adventure.versions,
  ]
    .reverse()
    .map(
      (v) =>
        `<li><strong>v${v.number}</strong> · ${ctx.esc(dateText(ctx, v.createdAt))} · ${ctx.esc(countText(ctx, v.items))}${v.notes ? `<br><span class="muted">${ctx.esc(v.notes)}</span>` : ""}</li>`,
    )
    .join(
      "",
    )}</ol>${history ? `<h3>${ctx.t("Attività", "Activity")}</h3><ul class="adv-activity">${history}</ul>` : ""}</section></div></div>`;
}
function journalText(ctx, e) {
  const where = e.campaignName ? ` · ${e.campaignName}` : "";
  switch (e.kind) {
    case "create":
      return ctx.t("Avventura creata (v1)", "Adventure created (v1)");
    case "version":
      return ctx.t(`Pubblicata la versione ${e.version}`, `Version ${e.version} published`);
    case "import":
      return ctx.t(`Importata la v${e.version}${where}`, `v${e.version} imported${where}`);
    case "update":
      return ctx.t(`Aggiornata alla v${e.version}${where}`, `Updated to v${e.version}${where}`);
    case "campaign":
      return ctx.t(`Nuova campagna${where}`, `New campaign${where}`);
    case "enable":
      return ctx.t(`Contenuto richiesto abilitato${where}`, `Required content enabled${where}`);
    default:
      return e.kind;
  }
}
function reportPanel(ctx, report) {
  const n = (list) => list.length;
  const ok = report.relinks.filter((r) => r.ok).length;
  const lost = report.relinks.filter((r) => !r.ok);
  const summary = [
    [report.created, ["nuova", "nuove"], ["new", "new"]],
    [report.updated, ["aggiornata", "aggiornate"], ["updated", "updated"]],
    [report.same, ["sostituita", "sostituite"], ["replaced", "replaced"]],
    [report.restored, ["ripristinata", "ripristinate"], ["restored", "restored"]],
    [report.kept, ["conservata", "conservate"], ["kept", "kept"]],
    [report.copies, ["copia", "copie"], ["copy", "copies"]],
  ]
    .filter(([list]) => n(list))
    .map(([list, it, en]) => plural(ctx, n(list), it, en))
    .concat(
      ok
        ? [
            plural(
              ctx,
              ok,
              ["collegamento ricostruito", "collegamenti ricostruiti"],
              ["link rebuilt", "links rebuilt"],
            ),
          ]
        : [],
    )
    .join(" · ");
  return `<section class="panel adv-report" role="status" data-adv-report><h2>${report.fromVersion && report.fromVersion < report.version ? ctx.t(`Aggiornata alla versione ${report.version}`, `Updated to version ${report.version}`) : ctx.t(`Importata in «${report.campaignName}»`, `Imported into “${report.campaignName}”`)}</h2><p>${ctx.esc(summary)}</p>${lost.length ? `<p class="muted">${ctx.t("Collegamenti non ricostruiti", "Links not rebuilt")}: ${lost.map((r) => ctx.esc(`${labelText(r.from, ctx.lang)} → ${labelText(r.to, ctx.lang)}`)).join(", ")}</p>` : ""}<div class="toolbar">${report.current ? `<button type="button" class="button" data-adv-prep>${ctx.t("Apri Preparazione", "Open Preparation")}</button>` : `<button type="button" class="button" data-adv-campaigns="${ctx.esc(report.campaignId)}">${ctx.t("Vai alla campagna", "Go to the campaign")}</button>`}<button type="button" class="button quiet" data-adv-dismiss>${ctx.t("Chiudi", "Close")}</button></div></section>`;
}

// Import / update into a campaign.
function importDefaults(ctx, adventure, targets) {
  const saved = formState(`import:${adventure.id}`);
  const fallback = targets.find((t) => !t.origin && t.current) ?? targets.find((t) => !t.origin);
  const campaign = targets.some((t) => t.id === saved?.campaign && !t.origin)
    ? saved.campaign
    : (fallback?.id ?? "");
  const record = recordOf(ctx.state, campaign, adventure.id);
  return {
    campaign,
    types: saved?.types ?? TYPES,
    startScene: saved ? saved.startScene : !record,
    intro: saved ? saved.intro : !record,
    copies: saved?.copies ?? {},
  };
}
function readImportForm(form) {
  const data = new FormData(form);
  const copies = {};
  form.querySelectorAll("input[name='copy']").forEach((box) => (copies[box.value] = box.checked));
  return {
    campaign: data.get("campaign") ?? "",
    types: data.getAll("type"),
    startScene: data.get("startScene") === "on",
    intro: data.get("intro") === "on",
    copies,
  };
}
const ACTION_TEXT = {
  create: L("Nuova", "New"),
  restore: L("Ripristinata (era stata eliminata)", "Restored (it had been deleted)"),
  update: L("Sovrascritta con la nuova versione", "Overwritten with the new version"),
  same: L(
    "Già presente, sostituita: nessuna modifica locale",
    "Already here, replaced: no local change",
  ),
  keep: L(
    "Modificata in questa campagna: non verrà sovrascritta",
    "Changed in this campaign: it will not be overwritten",
  ),
  unavailable: L("Area non disponibile: non importata", "Area unavailable: not imported"),
};
function requirementsPanel(ctx, requirements, { newCampaign = false } = {}) {
  if (!requirements.length) return "";
  const status = (r) =>
    r.status === "ready"
      ? ctx.t("Pronto", "Ready")
      : r.status === "missing"
        ? ctx.t("Manca nella tua Biblioteca", "Missing from your Library")
        : r.status === "outdated"
          ? ctx.t("Revisione precedente", "Older revision")
          : ctx.t("Non abilitato in questa campagna", "Not enabled in this campaign");
  const action = (r) =>
    r.action === "install"
      ? ctx.t("Installa dal pacchetto", "Install from the package")
      : r.action === "upgrade"
        ? ctx.t("Aggiorna alla revisione richiesta", "Upgrade to the required revision")
        : r.action === "enable"
          ? ctx.t("Abilita nella campagna", "Enable in the campaign")
          : "";
  return `<section class="panel adv-reqs" data-adv-reqs><h2>${ctx.t("Contenuti richiesti", "Required content")}</h2><p class="muted">${newCampaign ? ctx.t("Aggiungili alla Biblioteca: la nuova campagna li abiliterà da sé.", "Add them to the Library: the new campaign enables them itself.") : ctx.t("Ogni voce mancante ha la sua azione; l’importazione si sblocca quando sono tutte pronte.", "Each missing entry has its own action; import unlocks when all are ready.")}</p><ul class="item-list">${requirements
    .map(
      (r) =>
        `<li class="item-row adv-req is-${r.status}" data-adv-req-row="${ctx.esc(r.ref.contentId)}"><div><strong>${ctx.esc(ctx.label(r.name))}</strong> <span class="badge adv-status-${r.status}">${status(r)}</span><small>${ctx.esc(r.via)} · ${r.number ? `${ctx.t("revisione", "revision")} ${r.number}${r.createdAt ? ` · ${ctx.esc(dateText(ctx, r.createdAt))}` : ""}` : ctx.esc(r.ref.revisionId)}</small></div>${r.action ? `<button type="button" class="button" data-adv-req="${r.action}" data-content="${ctx.esc(r.ref.contentId)}" data-revision="${ctx.esc(r.ref.revisionId)}">${action(r)}</button>` : r.status === "ready" ? "" : `<span class="muted">${ctx.t("Non incluso nel pacchetto: chiedilo a chi l’ha creato.", "Not in the package: ask its author.")}</span>`}</li>`,
    )
    .join("")}</ul></section>`;
}
function planPanel(ctx, plan, relinks) {
  const { version, rows } = plan;
  const notes = plan.fromVersion
    ? `<section class="panel adv-notes" data-adv-patch><h2>${plan.fromVersion < version.number ? ctx.t(`Aggiornamento dalla versione ${plan.fromVersion} alla ${version.number}`, `Update from version ${plan.fromVersion} to ${version.number}`) : ctx.t(`La campagna ha già la versione ${version.number}`, `The campaign already has version ${version.number}`)}</h2>${plan.notes.length ? `<ul>${plan.notes.map((v) => `<li><strong>v${v.number}</strong> · ${ctx.esc(v.notes)}</li>`).join("")}</ul>` : ""}</section>`
    : "";
  const warning = plan.overwrite
    ? `<p class="adv-warning" role="alert" data-adv-overwrite>${ctx.icon("flag")} ${ctx.t(`${plan.overwrite} ${plan.overwrite === 1 ? "voce è" : "voci sono"} già in questa campagna: se non le hai modificate vengono sovrascritte con la versione del pacchetto.`, `${plan.overwrite} ${plan.overwrite === 1 ? "entry is" : "entries are"} already in this campaign: if you did not change them they are overwritten with the package version.`)}${plan.kept ? ` ${ctx.t(plan.kept === 1 ? "Quella che hai modificato resta tua." : `Le ${plan.kept} che hai modificato restano tue.`, plan.kept === 1 ? "The one you changed stays yours." : `The ${plan.kept} you changed stay yours.`)}` : ""}</p>`
    : "";
  const rowHTML = (row) =>
    `<li class="item-row adv-plan-row is-${row.action}" data-adv-plan-row="${ctx.esc(row.key)}"><div><strong>${ctx.esc(labelText(row.name, ctx.lang))}</strong> <small class="adv-inline">· ${ctx.esc(typeName(ctx, row.type, false))}</small><small class="adv-plan-action">${ctx.label(ACTION_TEXT[row.action])}${row.action === "keep" && row.localName && labelText(row.localName, ctx.lang) !== labelText(row.name, ctx.lang) ? ` · ${ctx.t("ora", "now")} «${ctx.esc(labelText(row.localName, ctx.lang))}»` : ""}</small>${row.action === "keep" ? `<label class="adv-check adv-copy"><input type="checkbox" name="copy" value="${ctx.esc(row.key)}" ${row.copy ? "checked" : ""}><span>${ctx.t(`Aggiungi accanto una copia della versione ${version.number}`, `Add a copy of version ${version.number} beside it`)}</span></label>` : ""}</div></li>`;
  const kinds = {
    token: L("pedine → PNG", "tokens → NPCs"),
    pin: L("spilli → materiali", "pins → materials"),
    "material-scene": L("materiali → scene", "materials → scenes"),
    subtable: L("sottotabelle", "subtables"),
    "encounter-scene": L("incontri → scene", "encounters → scenes"),
    "encounter-actor": L("incontri → PNG", "encounters → NPCs"),
  };
  const relinkRows = relinks
    ? Object.entries(kinds)
        .map(([kind, name]) => {
          const list = relinks.relinks.filter((r) => r.kind === kind);
          if (!list.length) return "";
          const ok = list.filter((r) => r.ok).length;
          const lost = list.filter((r) => !r.ok);
          return `<li>${ctx.label(name)}: <strong>${ok}</strong>${lost.length ? ` · ${ctx.t("non ricollegati", "not relinked")}: ${lost.map((r) => ctx.esc(`${labelText(r.from, ctx.lang)} → ${labelText(r.to, ctx.lang)}`)).join(", ")}` : ""}</li>`;
        })
        .join("")
    : "";
  return `${notes}${warning}<section class="panel"><h2>${ctx.t("Cosa succede", "What happens")}</h2>${rows.length ? `<ul class="item-list">${rows.map(rowHTML).join("")}</ul>` : `<p class="muted">${ctx.t("Nessun tipo scelto.", "No type chosen.")}</p>`}${plan.orphans.length ? `<h3>${ctx.t("Non più nel pacchetto: restano nella campagna", "No longer in the package: they stay in the campaign")}</h3><ul class="adv-dep-list">${plan.orphans.map((o) => `<li>${ctx.esc(labelText(o.name, ctx.lang))} <small>· ${ctx.esc(typeName(ctx, o.type, false))}</small></li>`).join("")}</ul>` : ""}${relinkRows ? `<h3>${ctx.t("Collegamenti ricostruiti", "Links rebuilt")}</h3><ul class="adv-dep-list" data-adv-relinks>${relinkRows}</ul>` : ""}</section>${plan.blocked ? `<p class="adv-blocked" role="status" data-adv-blocked id="adv-submit-why">${ctx.label(plan.blocked)}</p>` : ""}`;
}
function importPlanHTML(ctx, adventure, values) {
  const specs = specsOf(ctx);
  if (!values.campaign)
    return {
      html: `<p class="adv-blocked" id="adv-submit-why">${ctx.t("Non guidi nessun’altra campagna: creane una da Campagne o con «Crea campagna con l’avventura».", "You run no other campaign: create one from Campaigns or with “Create campaign with this adventure”.")}</p>`,
      blocked: true,
    };
  const options = {
    campaignId: values.campaign,
    types: values.types,
    startScene: values.startScene,
    intro: values.intro,
    copies: values.copies,
  };
  const plan = planImport(ctx.state, adventure.id, options, ctx.role, specs);
  const relinks = previewRelinks(ctx.state, adventure.id, options, ctx.role, specs);
  return {
    html: requirementsPanel(ctx, plan.requirements) + planPanel(ctx, plan, relinks),
    blocked: Boolean(plan.blocked),
    plan,
  };
}
function importPage(ctx, adventure) {
  const version = latest(adventure);
  const targets = importTargets(ctx.state, ctx.role, adventure);
  const values = importDefaults(ctx, adventure, targets);
  const plan = importPlanHTML(ctx, adventure, values);
  const record = values.campaign ? recordOf(ctx.state, values.campaign, adventure.id) : null;
  const updating = record && record.version < version.number;
  const scene = version.startSceneKey ? nameForKey(version, version.startSceneKey) : null;
  const intro = version.introKey ? nameForKey(version, version.introKey) : null;
  return `${crumbs(ctx, adventure, updating ? ctx.t("Aggiorna", "Update") : ctx.t("Importa", "Import"))}<div class="page-heading"><div><h1>${updating ? ctx.t(`Aggiorna «${adventure.title}»`, `Update “${adventure.title}”`) : ctx.t(`Importa «${adventure.title}»`, `Import “${adventure.title}”`)}</h1><p>${ctx.t(`Versione ${version.number}. La campagna riceve una copia sua: le modifiche fatte lì non toccano l’avventura né le altre campagne.`, `Version ${version.number}. The campaign gets its own copy: changes made there never touch the adventure or other campaigns.`)}</p></div></div><form class="adv-import" data-adv-form="import" data-adv-form-key="import:${ctx.esc(adventure.id)}" data-adv-shown-campaign="${ctx.esc(values.campaign)}"><section class="panel adv-import-options"><label class="field">${ctx.t("Campagna di destinazione", "Target campaign")}<select name="campaign">${targets.map((t) => `<option value="${ctx.esc(t.id)}" ${t.id === values.campaign ? "selected" : ""} ${t.origin ? "disabled" : ""}>${ctx.esc(t.name)}${t.current ? ctx.t(" · in corso", " · in play") : ""}${t.origin ? ctx.t(" · origine", " · origin") : ""}</option>`).join("")}</select></label><fieldset class="adv-types"><legend>${ctx.t("Cosa importare", "What to import")}</legend>${TYPES.map(
    (type) => {
      const n = version.items.filter((i) => i.type === type).length;
      return n
        ? `<label class="adv-check"><input type="checkbox" name="type" value="${type}" ${values.types.includes(type) ? "checked" : ""}><span>${typeName(ctx, type)} <small class="muted">(${n})</small></span></label>`
        : "";
    },
  ).join(
    "",
  )}</fieldset><fieldset class="adv-types"><legend>${ctx.t("Azioni facoltative", "Optional actions")}</legend>${scene ? `<label class="adv-check"><input type="checkbox" name="startScene" ${values.startScene ? "checked" : ""}><span>${ctx.t(`Attiva e mostra la scena iniziale «${ctx.esc(labelText(scene, ctx.lang))}»`, `Activate and show the start scene “${ctx.esc(labelText(scene, ctx.lang))}”`)}</span></label>` : ""}${intro ? `<label class="adv-check"><input type="checkbox" name="intro" ${values.intro ? "checked" : ""}><span>${ctx.t(`Mostra ai giocatori l’introduzione «${ctx.esc(labelText(intro, ctx.lang))}»`, `Show the players the introduction “${ctx.esc(labelText(intro, ctx.lang))}”`)}</span></label>` : ""}${!scene && !intro ? `<p class="muted">${ctx.t("L’avventura non ha scena iniziale né introduzione.", "The adventure has no start scene or introduction.")}</p>` : ""}</fieldset></section><div data-adv-plan>${plan.html}</div><div class="toolbar adv-actions"><button type="button" class="button quiet" data-adv-open="${ctx.esc(adventure.id)}">${ctx.t("Annulla", "Cancel")}</button><button type="submit" class="button primary" data-adv-submit ${plan.blocked ? 'disabled aria-describedby="adv-submit-why"' : ""}>${updating ? ctx.t(`Aggiorna alla versione ${version.number}`, `Update to version ${version.number}`) : ctx.t("Importa", "Import")}</button></div></form>`;
}
/**
 * A change on the import form. Another target campaign brings its own defaults (optional
 * actions only on a first import, no copies) and re-renders the page; any other change,
 * the first one included, keeps the DM's choices exactly as made.
 */
export function importFormChange(state, adventureId, shownCampaign, values) {
  if (values.campaign === shownCampaign) return { rerender: false, values };
  const first = !recordOf(state, values.campaign, adventureId);
  return { rerender: true, values: { ...values, copies: {}, startScene: first, intro: first } };
}
function refreshImport(el, ctx, form, adventure) {
  const change = importFormChange(
    ctx.state,
    adventure.id,
    form.dataset.advShownCampaign ?? "",
    readImportForm(form),
  );
  ui.forms[`import:${adventure.id}`] = change.values;
  if (change.rerender) {
    ui.focus = ['select[name="campaign"]'];
    ctx.render();
    return;
  }
  // The plan is rebuilt in place; a copy box inside it keeps the keyboard focus.
  const holder = el.querySelector("[data-adv-plan]");
  const active = holder.contains(document.activeElement) ? document.activeElement : null;
  const plan = importPlanHTML(ctx, adventure, change.values);
  holder.innerHTML = plan.html;
  const submit = el.querySelector("[data-adv-submit]");
  submit.disabled = plan.blocked;
  if (plan.blocked) submit.setAttribute("aria-describedby", "adv-submit-why");
  else submit.removeAttribute("aria-describedby");
  if (active?.name === "copy")
    [...holder.querySelectorAll('input[name="copy"]')]
      .find((box) => box.value === active.value)
      ?.focus();
}

// New campaign from the adventure.
function campaignPage(ctx, adventure) {
  const specs = specsOf(ctx);
  const version = latest(adventure);
  const saved = formState(`campaign:${adventure.id}`) ?? {};
  const requirements = requirementStatus(ctx.state, version, null, ctx.role, specs);
  const blocked = requirements.some((r) => r.status !== "ready");
  const scene = version.startSceneKey ? nameForKey(version, version.startSceneKey) : null;
  const intro = version.introKey ? nameForKey(version, version.introKey) : null;
  return `${crumbs(ctx, adventure, ctx.t("Nuova campagna", "New campaign"))}<div class="page-heading"><div><h1>${ctx.t(`Nuova campagna con «${adventure.title}»`, `New campaign with “${adventure.title}”`)}</h1><p>${ctx.t("La campagna nasce con scene, PNG, materiali, tabelle e incontri della versione", "The campaign starts with the scenes, NPCs, materials, tables and encounters of version")} ${version.number}. ${ctx.t("Diventi il DM proprietario; la avvii da Campagne.", "You become its owner DM; launch it from Campaigns.")}</p></div></div><form class="adv-import" data-adv-form="campaign" data-adv-form-key="campaign:${ctx.esc(adventure.id)}"><section class="panel"><label class="field">${ctx.t("Nome della campagna", "Campaign name")}<input name="name" maxlength="80" required value="${ctx.esc(saved.name ?? adventure.title)}" autocomplete="off"></label><label class="field">${ctx.t("Descrizione", "Description")}<textarea name="description" maxlength="1000" rows="3">${ctx.esc(saved.description ?? adventure.summary)}</textarea></label><fieldset class="adv-types"><legend>${ctx.t("Azioni facoltative", "Optional actions")}</legend>${scene ? `<label class="adv-check"><input type="checkbox" name="startScene" ${(saved.startScene ?? true) ? "checked" : ""}><span>${ctx.t(`Parti dalla scena iniziale «${ctx.esc(labelText(scene, ctx.lang))}», già mostrata al gruppo`, `Start from the start scene “${ctx.esc(labelText(scene, ctx.lang))}”, already shown to the group`)}</span></label>` : ""}${intro ? `<label class="adv-check"><input type="checkbox" name="intro" ${(saved.intro ?? true) ? "checked" : ""}><span>${ctx.t(`Mostra ai giocatori l’introduzione «${ctx.esc(labelText(intro, ctx.lang))}» quando entrano`, `Show the players the introduction “${ctx.esc(labelText(intro, ctx.lang))}” when they join`)}</span></label>` : ""}</fieldset><p class="muted">${ctx.esc(countText(ctx, version.items))}</p></section>${requirementsPanel(ctx, requirements, { newCampaign: true })}${blocked ? `<p class="adv-blocked" data-adv-blocked>${ctx.t("Aggiungi prima alla Biblioteca i contenuti richiesti.", "Add the required content to the Library first.")}</p>` : ""}<div class="toolbar adv-actions"><button type="button" class="button quiet" data-adv-open="${ctx.esc(adventure.id)}">${ctx.t("Annulla", "Cancel")}</button><button type="submit" class="button primary" data-adv-submit ${blocked ? 'disabled aria-describedby="adv-campaign-why"' : ""}>${ctx.t("Crea campagna", "Create campaign")}</button></div>${blocked ? `<p class="adv-blocked" id="adv-campaign-why">${ctx.t("Mancano contenuti homebrew richiesti: aggiungili con le azioni in «Contenuti richiesti», poi crea la campagna.", "Required homebrew content is missing: add it with the actions in “Required content”, then create the campaign.")}</p>` : ""}</form>`;
}

// Printable export.
function printPage(ctx, adventure) {
  const version = latest(adventure);
  const html = adventureHTML(adventure, version, { lang: ctx.lang, dmNotes: ui.printDm });
  return `${crumbs(ctx, adventure, ctx.t("Esporta", "Export"))}<div class="page-heading"><div><h1>${ctx.t(`Esporta «${adventure.title}»`, `Export “${adventure.title}”`)}</h1><p>${ctx.t("Un unico file HTML stampabile, da aprire anche in Word o Docs. Senza le note del DM resta solo ciò che i giocatori possono leggere.", "One printable HTML file, which also opens in Word or Docs. Without DM notes only what players may read remains.")}</p></div></div><div class="toolbar adv-print-bar"><label class="adv-check"><input type="checkbox" data-adv-print-dm ${ui.printDm ? "checked" : ""}><span>${ctx.t("Includi note, statistiche e incontri del DM", "Include DM notes, stats and encounters")}</span></label><button type="button" class="button" data-adv-print>${ctx.t("Stampa", "Print")}</button><button type="button" class="button primary" data-adv-download>${ctx.t("Scarica HTML", "Download HTML")}</button></div><iframe class="adv-print-frame" title="${ctx.t("Anteprima di stampa", "Print preview")}" srcdoc="${ctx.esc(html)}"></iframe>`;
}

function routeRender(ctx) {
  const tab = ctx.view.tab;
  if (tab === "new") return `<div class="adv-root adv-page">${editorPage(ctx, "create")}</div>`;
  const adventure = ctx.view.id ? adventureOf(ctx.state, ctx.view.id, false) : null;
  if (!adventure)
    return `<div class="adv-root adv-page">${crumbs(ctx, null, "")}${ctx.view.id ? `<p class="empty-state">${ctx.t("Questa avventura non esiste più.", "This adventure no longer exists.")}</p>` : ""}${listBody(ctx)}</div>`;
  const body =
    tab === "rebuild" && adventure.origin?.kind === "campaign"
      ? editorPage(ctx, "rebuild", adventure)
      : tab === "import"
        ? importPage(ctx, adventure)
        : tab === "campaign"
          ? campaignPage(ctx, adventure)
          : tab === "print"
            ? printPage(ctx, adventure)
            : detailPage(ctx, adventure);
  return `<div class="adv-root adv-page">${body}</div>`;
}

/** Create adventure from the editor's values (the form's `pick`, title, summary...). */
export function submitCreate(ctx, input) {
  const specs = specsOf(ctx);
  let id;
  const done = perform(ctx, () => {
    commit(
      ctx,
      ctx.t(
        `Avventura creata · ${str(input.title).trim()}`,
        `Adventure created · ${str(input.title).trim()}`,
      ),
      (draft) => {
        id = createAdventure(draft, input, ctx.role, specs);
      },
      { local: true, visibility: "private" },
    );
    return true;
  });
  if (!done) return null;
  ui.forms = {};
  ui.dirty = false;
  ctx.toast(ctx.t("Avventura creata: versione 1.", "Adventure created: version 1."));
  go(ctx, id);
  return id;
}
/** Publish the rebuilt package as the next version. */
export function submitPublish(ctx, adventureId, input) {
  const specs = specsOf(ctx);
  let number;
  const done = perform(ctx, () => {
    commit(
      ctx,
      ctx.t("Nuova versione dell’avventura", "New adventure version"),
      (draft) => {
        number = publishVersion(draft, adventureId, input, ctx.role, specs);
      },
      { local: true, visibility: "private" },
    );
    return true;
  });
  if (!done) return null;
  ui.forms = {};
  ui.dirty = false;
  ctx.toast(ctx.t(`Versione ${number} pubblicata.`, `Version ${number} published.`));
  go(ctx, adventureId);
  return number;
}
/** Import or update with the values of the import form. */
export function submitImport(ctx, adventureId, values) {
  const adventure = adventureOf(ctx.state, adventureId);
  const specs = specsOf(ctx);
  const options = {
    campaignId: values.campaign,
    types: values.types,
    startScene: values.startScene,
    intro: values.intro,
    copies: values.copies,
  };
  let report;
  const done = perform(ctx, () => {
    report = campaignCommit(
      ctx,
      ctx.t(`Avventura importata · ${adventure.title}`, `Adventure imported · ${adventure.title}`),
      values.campaign,
      (draft) => applyImport(draft, adventureId, options, ctx.role, specs),
    );
    return true;
  });
  if (!done || !report) return null;
  ui.report = { ...report, adventureId, current: report.campaignId === ctx.state.campaign?.id };
  delete ui.forms[`import:${adventureId}`];
  ctx.toast(
    report.fromVersion && report.fromVersion < report.version
      ? ctx.t(
          `Aggiornata alla versione ${report.version}.`,
          `Updated to version ${report.version}.`,
        )
      : ctx.t(`Importata in ${report.campaignName}.`, `Imported into ${report.campaignName}.`),
  );
  go(ctx, adventureId);
  return report;
}
/** Create game with module: a new campaign populated with the adventure. */
export function submitCampaign(ctx, adventureId, input) {
  const specs = specsOf(ctx);
  let result;
  const done = perform(ctx, () => {
    const created = [];
    const legacy = {};
    let record;
    let entry;
    ctx.commit(
      ctx.t(
        `Campagna creata da un’avventura · ${str(input.name).trim()}`,
        `Campaign created from an adventure · ${str(input.name).trim()}`,
      ),
      (draft) => {
        const before = Object.fromEntries(
          Object.entries(draft.actors ?? {}).map(([id, a]) => [id, a.campaignIds]),
        );
        result = createCampaignFromAdventure(draft, adventureId, input, ctx.role, specs);
        for (const [id, actor] of Object.entries(draft.actors))
          if (!(id in before)) created.push([id, actor]);
          else if (before[id] === undefined && actor.campaignIds !== undefined)
            legacy[id] = actor.campaignIds;
        record = draft.ext[ID].imports[result.campaignId];
        entry = draft.ext[ID].journal.at(-1);
      },
      {
        // Campaign administration is not gameplay (B13): not undoable; the snapshots still
        // in the Undo stack receive the new NPCs and the import record, so an earlier Undo
        // never leaves the new campaign's tokens without their creatures.
        undoable: false,
        visibility: "private",
        rebaseHistory: (snapshot) => {
          snapshot.actors ??= {};
          for (const [id, actor] of created) snapshot.actors[id] = clone(actor);
          for (const [id, ids] of Object.entries(legacy))
            if (snapshot.actors[id] && snapshot.actors[id].campaignIds === undefined)
              snapshot.actors[id].campaignIds = clone(ids);
          const own = snapshot.ext?.[ID];
          if (own) {
            own.imports[result.campaignId] = clone(record);
            if (!own.journal.some((e) => e.id === entry.id)) own.journal.push(clone(entry));
          }
        },
      },
    );
    return true;
  });
  if (!done || !result) return null;
  ui.lastLabel = null;
  delete ui.forms[`campaign:${adventureId}`];
  ctx.toast(
    ctx.t(
      `Campagna «${str(input.name).trim()}» creata con l’avventura: avviala quando vuoi.`,
      `Campaign “${str(input.name).trim()}” created with the adventure: launch it when you like.`,
    ),
  );
  ctx.navigate("campaigns", { id: result.campaignId });
  return result;
}
/** One requirement action (BG3 verification): install/upgrade into the Library, or enable. */
export function runRequirement(ctx, adventureId, action, ref, campaignId) {
  const specs = specsOf(ctx);
  // The row's next action; once every entry is ready, the command it unlocked (BG3 flow).
  ui.focus = [
    `[data-adv-req-row="${ref.contentId}"] button`,
    "[data-adv-req]",
    "[data-adv-submit]:not([disabled])",
  ];
  return perform(ctx, () => {
    if (action === "enable")
      campaignCommit(
        ctx,
        ctx.t("Contenuto abilitato nella campagna", "Content enabled in the campaign"),
        campaignId,
        (draft) => enableRequirement(draft, ref, campaignId, ctx.role, specs, adventureId),
      );
    else
      commit(
        ctx,
        ctx.t("Contenuto aggiunto alla Biblioteca", "Content added to the Library"),
        (draft) => installRequirements(draft, adventureId, ctx.role, ref),
        { local: true, visibility: "private" },
      );
    ctx.toast(
      action === "enable"
        ? ctx.t("Abilitato nella campagna.", "Enabled in the campaign.")
        : ctx.t("Aggiunto alla tua Biblioteca.", "Added to your Library."),
    );
    return true;
  });
}
/** Test seam: the page state kept between renders. */
export function resetAdventuresUI() {
  resetUI();
  parkedBefore.clear();
}
export const adventuresUI = ui;
function download(el, ctx, adventure) {
  const version = latest(adventure);
  const html = adventureHTML(adventure, version, { lang: ctx.lang, dmNotes: ui.printDm });
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFileName(adventure, version);
  link.hidden = true;
  el.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function routeBind(el, ctx) {
  const adventure = ctx.view.id ? adventureOf(ctx.state, ctx.view.id, false) : null;
  bindCommon(el, ctx);
  const form = el.querySelector("form[data-adv-form]");
  if (form) {
    const mode = form.dataset.advForm;
    const refresh = (event) => {
      if (mode === "create" || mode === "rebuild") refreshEditor(el, ctx, form);
      else if (mode === "import") refreshImport(el, ctx, form, adventure);
      else if (mode === "campaign") {
        const data = new FormData(form);
        ui.forms[`campaign:${adventure.id}`] = {
          name: data.get("name"),
          description: data.get("description"),
          startScene: data.get("startScene") === "on",
          intro: data.get("intro") === "on",
        };
      }
    };
    form.addEventListener("change", refresh);
    if (mode !== "import")
      form.addEventListener("input", (event) => {
        if (event.target.matches("input[type=text], input:not([type]), textarea")) {
          if (mode === "campaign") refresh(event);
          else {
            ui.forms[form.dataset.advFormKey] = readForm(form);
            ui.dirty = true;
          }
        }
      });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (mode === "create") submitCreate(ctx, readForm(form));
      else if (mode === "rebuild") submitPublish(ctx, adventure.id, readForm(form));
      else if (mode === "import") submitImport(ctx, adventure.id, readImportForm(form));
      else if (mode === "campaign") {
        const data = new FormData(form);
        submitCampaign(ctx, adventure.id, {
          name: str(data.get("name")),
          description: str(data.get("description")),
          startScene: data.get("startScene") === "on",
          intro: data.get("intro") === "on",
        });
      }
    });
    el.querySelector("[data-adv-cancel]")?.addEventListener("click", () => {
      ui.dirty = false;
      delete ui.forms[form.dataset.advFormKey];
      if (adventure) go(ctx, adventure.id);
      else ctx.navigate("library", { tab: ID });
    });
    el.addEventListener("click", (event) => {
      const button = event.target.closest("[data-adv-req]");
      if (!button || !adventure) return;
      const campaignId = mode === "import" ? readImportForm(form).campaign : null;
      runRequirement(
        ctx,
        adventure.id,
        button.dataset.advReq,
        { contentId: button.dataset.content, revisionId: button.dataset.revision },
        campaignId,
      );
    });
  }
  el.querySelectorAll("[data-adv-go]").forEach((button) =>
    button.addEventListener("click", () => go(ctx, adventure.id, button.dataset.advGo)),
  );
  el.querySelectorAll("[data-adv-import-into]").forEach((button) =>
    button.addEventListener("click", () => {
      ui.forms[`import:${adventure.id}`] = {
        campaign: button.dataset.advImportInto,
        types: TYPES,
        startScene: false,
        intro: false,
        copies: {},
      };
      go(ctx, adventure.id, "import");
    }),
  );
  el.querySelector("[data-adv-delete]")?.addEventListener("click", () =>
    ctx.dialog(
      ctx.t(`Eliminare «${adventure.title}»?`, `Delete “${adventure.title}”?`),
      `<p>${ctx.t("Il pacchetto e le sue versioni spariscono dalla Biblioteca. Le campagne che l’hanno importato conservano le loro copie. Subito dopo puoi annullare dalla Biblioteca.", "The package and its versions leave the Library. Campaigns that imported it keep their copies. Right after, you can undo it from the Library.")}</p>`,
      {
        submitLabel: ctx.t("Elimina", "Delete"),
        onSubmit: () => {
          const done = perform(ctx, () => {
            commit(
              ctx,
              ctx.t(
                `Avventura eliminata · ${adventure.title}`,
                `Adventure deleted · ${adventure.title}`,
              ),
              (draft) => deleteAdventure(draft, adventure.id, ctx.role),
              { local: true, visibility: "private" },
            );
            return true;
          });
          if (done) ctx.navigate("library", { tab: ID });
        },
      },
    ),
  );
  el.querySelector("[data-adv-print-dm]")?.addEventListener("change", (event) => {
    ui.printDm = event.target.checked;
    ui.focus = ["[data-adv-print-dm]"];
    ctx.render();
  });
  el.querySelector("[data-adv-print]")?.addEventListener("click", () => {
    const frame = el.querySelector(".adv-print-frame");
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  });
  el.querySelector("[data-adv-download]")?.addEventListener("click", () => {
    download(el, ctx, adventure);
    ctx.toast(ctx.t("File HTML scaricato.", "HTML file downloaded."));
  });
  el.querySelector("[data-adv-dismiss]")?.addEventListener("click", () => {
    ui.report = null;
    ctx.render();
  });
  el.querySelector("[data-adv-prep]")?.addEventListener("click", () =>
    ctx.navigate("preparation", { tab: ID }),
  );
  el.querySelector("[data-adv-campaigns]")?.addEventListener("click", (event) =>
    ctx.navigate("campaigns", { id: event.currentTarget.dataset.advCampaigns }),
  );
  // Keyboard focus after a re-render: the first selector still on the page wins.
  if (ui.focus) {
    const target = ui.focus.map((selector) => el.querySelector(selector)).find(Boolean);
    ui.focus = null;
    target?.focus?.();
  }
}
function bindCommon(el, ctx) {
  bindUndo(el, ctx);
  el.querySelectorAll("[data-adv-open]").forEach((button) =>
    button.addEventListener("click", () => go(ctx, button.dataset.advOpen)),
  );
  el.querySelectorAll("[data-adv-new]").forEach((button) =>
    button.addEventListener("click", () => ctx.navigate("adventures", { tab: "new" })),
  );
  el.querySelectorAll("[data-adv-library]").forEach((button) =>
    button.addEventListener("click", () => ctx.navigate("library", { tab: ID })),
  );
  bindUniverse(el, ctx);
}
const WORLD_TYPE_OPTIONS = (ctx) =>
  [
    ["place", ctx.t("Luogo", "Place")],
    ["faction", ctx.t("Fazione", "Faction")],
    ["event", ctx.t("Storia o evento", "History or event")],
    ["person", ctx.t("Persona", "Person")],
    ["shop", ctx.t("Negozio", "Shop")],
    ["other", ctx.t("Altro", "Other")],
  ]
    .map(([id, label]) => `<option value="${id}">${label}</option>`)
    .join("");
export function openDocumentImport(ctx, doc, fileName) {
  const campaign = ctx.state.campaign;
  ctx.dialog(
    ctx.t("Importa documento", "Import document"),
    `<p>${ctx.t(`«${ctx.esc(fileName)}»: ${doc.sections.length} sezioni, una voce per titolo.`, `“${ctx.esc(fileName)}”: ${doc.sections.length} sections, one entry per heading.`)}</p><ol class="adv-doc-preview">${doc.sections
      .slice(0, 12)
      .map(
        (sec) =>
          `<li><strong>${ctx.esc(sec.title)}</strong>${sec.body ? ` <span class="muted">${ctx.esc(sec.body.slice(0, 80))}${sec.body.length > 80 ? "…" : ""}</span>` : ""}</li>`,
      )
      .join(
        "",
      )}${doc.sections.length > 12 ? `<li class="muted">${ctx.t(`…e altre ${doc.sections.length - 12}`, `…and ${doc.sections.length - 12} more`)}</li>` : ""}</ol><fieldset class="adv-types"><legend>${ctx.t("Dove", "Where")}</legend>${campaign ? `<label class="adv-check"><input type="radio" name="target" value="campaign" checked><span>${ctx.t(`Nel Mondo di «${ctx.esc(campaign.name)}» (solo DM finché non riveli)`, `In the World of “${ctx.esc(campaign.name)}” (DM only until you reveal)`)}</span></label>` : ""}<label class="adv-check"><input type="radio" name="target" value="universe" ${campaign ? "" : "checked"}><span>${ctx.t("Nell’Universo, per tutte le campagne", "In the Universe, for every campaign")}</span></label></fieldset><p class="muted">${ctx.t("Il testo viene letto come testo: immagini, script e link esterni non vengono importati.", "The text is read as text: images, scripts and external links are not imported.")}</p>`,
    {
      submitLabel: ctx.t("Importa", "Import"),
      onSubmit: (form) => {
        const target = form.get("target") === "universe" ? "universe" : "campaign";
        let rows = [];
        commit(
          ctx,
          ctx.t(`Documento importato: ${doc.title}`, `Document imported: ${doc.title}`),
          (draft) => (rows = importDocument(draft, doc, target, ctx.role)),
          { visibility: "private" },
        );
        ctx.toast(
          target === "universe"
            ? ctx.t(
                `${rows.length} voci aggiunte all’Universo.`,
                `${rows.length} entries added to the Universe.`,
              )
            : ctx.t(
                `${rows.length} voci aggiunte al Mondo della campagna.`,
                `${rows.length} entries added to the campaign World.`,
              ),
        );
        if (target === "campaign") ctx.navigate("campaign", { tab: "world" });
      },
    },
  );
}
function bindUniverse(el, ctx) {
  el.querySelector("[data-adv-import-document]")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const kind = perform(ctx, () => {
      if (file.size > DOCUMENT_LIMITS.bytes)
        refuse("Scegli un file fino a 2 MB.", "Choose a file up to 2 MB.");
      return documentKind(file.name);
    });
    if (kind)
      file
        .text()
        .then((text) =>
          perform(ctx, () =>
            openDocumentImport(ctx, parseDocument(text, kind, file.name), file.name),
          ),
        );
  });
  el.querySelector("[data-adv-universe-add]")?.addEventListener("click", () =>
    ctx.dialog(
      ctx.t("Nuova voce dell’Universo", "New Universe entry"),
      `<label class="field">${ctx.t("Tipo", "Type")}<select name="worldType">${WORLD_TYPE_OPTIONS(ctx)}</select></label><label class="field">${ctx.t("Titolo", "Title")}<input name="title" maxlength="${UNIVERSE_LIMITS.title}" required autocomplete="off"></label><label class="field">${ctx.t("Testo", "Text")}<textarea name="body" rows="6" maxlength="${UNIVERSE_LIMITS.body}"></textarea></label>`,
      {
        submitLabel: ctx.t("Aggiungi all’Universo", "Add to the Universe"),
        onSubmit: (form) =>
          commit(
            ctx,
            ctx.t("Voce aggiunta all’Universo", "Entry added to the Universe"),
            (draft) =>
              addUniverseEntries(
                draft,
                [
                  {
                    worldType: String(form.get("worldType")),
                    title: String(form.get("title") ?? ""),
                    body: String(form.get("body") ?? ""),
                  },
                ],
                ctx.role,
              ),
            { visibility: "private" },
          ),
      },
    ),
  );
  el.querySelector("[data-adv-universe-from]")?.addEventListener("click", () => {
    const campaignId = ctx.state.campaign?.id;
    const rows = campaignId
      ? listCampaignEntries(ctx.state, { campaignId, kind: "world" }, ctx.role)
      : [];
    if (!rows.length)
      return ctx.toast(
        ctx.t(
          "Il Mondo della campagna in corso non ha voci.",
          "The campaign in play has no World entries.",
        ),
        true,
      );
    ctx.dialog(
      ctx.t("Dal Mondo della campagna all’Universo", "From the campaign World to the Universe"),
      `<fieldset class="adv-types"><legend>${ctx.t("Voci da tenere per tutte le campagne", "Entries to keep for every campaign")}</legend>${rows.map((row) => `<label class="adv-check"><input type="checkbox" name="entry" value="${ctx.esc(row.id)}"><span>${ctx.esc(row.data.title || ctx.t("Senza titolo", "Untitled"))}</span></label>`).join("")}</fieldset>`,
      {
        submitLabel: ctx.t("Aggiungi all’Universo", "Add to the Universe"),
        onSubmit: (form) =>
          commit(
            ctx,
            ctx.t("Voci aggiunte all’Universo", "Entries added to the Universe"),
            (draft) => universeFromCampaign(draft, form.getAll("entry").map(String), ctx.role),
            { visibility: "private" },
          ),
      },
    );
  });
  el.querySelectorAll("[data-adv-universe-use]").forEach((button) =>
    button.addEventListener("click", () =>
      perform(ctx, () => {
        commit(
          ctx,
          ctx.t("Voce dell’Universo aggiunta al Mondo", "Universe entry added to the World"),
          (draft) => useUniverseEntries(draft, [button.dataset.advUniverseUse], ctx.role),
          { visibility: "private" },
        );
        ctx.toast(
          ctx.t(
            "Aggiunta al Mondo della campagna, solo per te finché non la riveli.",
            "Added to the campaign World, only for you until you reveal it.",
          ),
        );
      }),
    ),
  );
  el.querySelectorAll("[data-adv-universe-remove]").forEach((button) =>
    button.addEventListener("click", () =>
      perform(ctx, () =>
        commit(
          ctx,
          ctx.t("Voce rimossa dall’Universo", "Entry removed from the Universe"),
          (draft) => removeUniverseEntry(draft, button.dataset.advUniverseRemove, ctx.role),
          { visibility: "private" },
        ),
      ),
    ),
  );
}

// Preparation › Adventures: what this campaign plays, its local changes and updates.
function prepRender(ctx) {
  const specs = specsOf(ctx);
  const rows = campaignAdventures(ctx.state, ctx.state.campaign?.id, specs);
  const list = rows
    .map(({ adventure, usage, origin }) => {
      const version = latest(adventure);
      const text = origin
        ? ctx.t(
            `Creata da questa campagna · versione ${version.number}`,
            `Created from this campaign · version ${version.number}`,
          )
        : usageText(ctx, usage);
      return `<li class="item-row" data-adv-prep-row="${ctx.esc(adventure.id)}"><div><strong>${ctx.esc(adventure.title)}</strong><small>${ctx.esc(text)}</small>${usage?.updateAvailable ? `<small class="adv-update-note">${ctx.t(`Aggiornamento disponibile: versione ${version.number}`, `Update available: version ${version.number}`)}</small>` : ""}</div><div class="toolbar">${usage?.updateAvailable ? `<button type="button" class="button primary" data-adv-review="${ctx.esc(adventure.id)}">${ctx.t("Rivedi aggiornamento", "Review update")}</button>` : ""}<button type="button" class="button" data-adv-open="${ctx.esc(adventure.id)}">${ctx.t("Apri", "Open")}</button></div></li>`;
    })
    .join("");
  return `<div class="adv-root adv-prep"><div class="adv-list-head"><div><h2>${ctx.t("Avventure", "Adventures")}</h2><p class="muted">${ctx.t("Le voci importate da un’avventura sono copie di questa campagna: le puoi cambiare e un aggiornamento non le sovrascrive. Tutto il resto è solo di questa partita.", "Entries imported from an adventure are this campaign’s copies: you may change them and an update never overwrites them. Everything else belongs to this game only.")}</p></div><div class="toolbar"><button type="button" class="button" data-adv-library>${ctx.t("Importa un’avventura", "Import an adventure")}</button><button type="button" class="button" data-adv-new>${ctx.icon("plus")} ${ctx.t("Crea avventura", "Create adventure")}</button></div></div>${list ? `<ul class="item-list">${list}</ul>` : `<p class="empty-state">${ctx.t("Nessuna avventura in questa campagna.", "No adventure in this campaign.")}</p>`}</div>`;
}
function prepBind(el, ctx) {
  bindCommon(el, ctx);
  el.querySelectorAll("[data-adv-review]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.advReview;
      ui.forms[`import:${id}`] = {
        campaign: ctx.state.campaign?.id,
        types: TYPES,
        startScene: false,
        intro: false,
        copies: {},
      };
      go(ctx, id, "import");
    }),
  );
}

// ---------------------------------------------------------------- BI-45 compatibility packs

// Delegated simulation (I-233, B49). Shard's and Foundry's compendium packs carry
// structured data; D&D Beyond switches sources on per campaign. A compatibility pack holds
// only mechanics — names, numbers and the page of the group's own book — never the book's
// text. It follows the adventure-package path: install into the Library, enable per
// campaign, dependency check. File format: this app's JSON (`PACK_FORMAT`), not an
// importer for any publisher's format.
export const PACKS = "adventures-packs";
export const PACK_FORMAT = "d20-studio-compat-pack";
export const PACK_BASE = "srd-5.2.1";
export const PACK_TYPES = Object.freeze(["creature", "item", "spell", "subclass"]);
const PACK_TYPE_NAMES = Object.freeze({
  creature: [L("Creatura", "Creature"), L("Creature", "Creatures")],
  item: [L("Oggetto", "Item"), L("Oggetti", "Items")],
  spell: [L("Incantesimo", "Spell"), L("Incantesimi", "Spells")],
  subclass: [L("Sottoclasse", "Subclass"), L("Sottoclassi", "Subclasses")],
});
// Keys that would carry a book's prose, refused wherever they appear.
const PROSE_KEY = /^(description|desc|text|flavou?r|lore|body|summary|notes?|prose|details?)$/i;
const PACK_SHORT = 80;
const PACK_LIMITS = Object.freeze({ entries: 500, requires: 20, depth: 8 });
const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const DICE_TEXT = /^\d{1,2}d(4|6|8|10|12|20)([+-]\d{1,3})?$/;
const PACK_ID = /^[a-z0-9][a-z0-9-]{1,60}$/;
export const PACK_LICENCE = L(
  "Solo meccaniche: nomi, numeri e la pagina del vostro manuale. Il testo resta nel libro; i diritti restano all’editore.",
  "Mechanics only: names, numbers and the page of your own book. The text stays in the book; the rights stay with the publisher.",
);
const packRefusal = (it, en) => Object.assign(new Error(en), { it, en });

function proseIssues(value, path = "", depth = 0, out = []) {
  if (depth > PACK_LIMITS.depth) {
    out.push(L(`«${path}»: struttura troppo profonda.`, `“${path}”: structure too deep.`));
    return out;
  }
  if (typeof value === "string" && value.length > PACK_SHORT)
    out.push(
      L(
        `«${path}»: testo lungo (${value.length} caratteri). Un pacchetto di compatibilità porta solo nomi e numeri.`,
        `“${path}”: long text (${value.length} characters). A compatibility pack carries names and numbers only.`,
      ),
    );
  if (Array.isArray(value))
    value.forEach((item, i) => proseIssues(item, `${path}[${i}]`, depth + 1, out));
  else if (isObject(value))
    for (const [key, item] of Object.entries(value)) {
      const at = path ? `${path}.${key}` : key;
      if (PROSE_KEY.test(key))
        out.push(
          L(
            `«${at}»: testo descrittivo. Il pacchetto deve rimandare alla pagina del manuale.`,
            `“${at}”: descriptive text. The pack must point to the book’s page instead.`,
          ),
        );
      else proseIssues(item, at, depth + 1, out);
    }
  return out;
}
const packName = (value) =>
  isObject(value) && (str(value.it).trim() || str(value.en).trim())
    ? {
        it: str(value.it).trim() || str(value.en).trim(),
        en: str(value.en).trim() || str(value.it).trim(),
      }
    : null;
const intIn = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
function mechanicsIssues(type, m, at) {
  const bad = (it, en) => L(`${at}: ${it}`, `${at}: ${en}`);
  if (!isObject(m)) return [bad("meccaniche mancanti.", "mechanics missing.")];
  const out = [];
  if (type === "creature") {
    if (!intIn(m.ac, 1, 30)) out.push(bad("CA da 1 a 30.", "AC from 1 to 30."));
    if (!intIn(m.hp, 1, 999)) out.push(bad("PF da 1 a 999.", "HP from 1 to 999."));
    if (!isObject(m.abilities) || ABILITY_KEYS.some((k) => !intIn(m.abilities[k], 1, 30)))
      out.push(bad("sei caratteristiche da 1 a 30.", "six ability scores from 1 to 30."));
    if (m.hitDice !== undefined && !DICE_TEXT.test(str(m.hitDice)))
      out.push(bad("dadi vita non validi.", "invalid hit dice."));
    for (const attack of arr(m.attacks))
      if (
        !packName(attack?.name) ||
        !intIn(attack.toHit, -5, 20) ||
        !DICE_TEXT.test(str(attack.damage))
      )
        out.push(
          bad("ogni attacco ha nome, bonus e dadi.", "every attack needs name, bonus and dice."),
        );
  } else if (type === "item") {
    if (!["common", "uncommon", "rare", "very-rare", "legendary", "artifact"].includes(m.rarity))
      out.push(bad("rarità non valida.", "invalid rarity."));
    if (m.bonus !== undefined && !intIn(m.bonus, 0, 3))
      out.push(bad("bonus da 0 a 3.", "bonus from 0 to 3."));
  } else if (type === "spell") {
    if (!intIn(m.level, 0, 9)) out.push(bad("livello da 0 a 9.", "level from 0 to 9."));
    if (m.damage !== undefined && !DICE_TEXT.test(str(m.damage)))
      out.push(bad("dadi del danno non validi.", "invalid damage dice."));
  } else if (type === "subclass") {
    if (!SUBCLASS_CLASSES.includes(m.classId))
      out.push(
        bad("classe SRD della sottoclasse mancante.", "the subclass's SRD class is missing."),
      );
    if (!arr(m.levels).length || arr(m.levels).some((n) => !intIn(n, 1, 20)))
      out.push(bad("livelli della sottoclasse da 1 a 20.", "subclass levels from 1 to 20."));
  }
  return out;
}
const CLASS_NAMES = Object.freeze({
  barbarian: L("Barbaro", "Barbarian"),
  bard: L("Bardo", "Bard"),
  cleric: L("Chierico", "Cleric"),
  druid: L("Druido", "Druid"),
  fighter: L("Guerriero", "Fighter"),
  monk: L("Monaco", "Monk"),
  paladin: L("Paladino", "Paladin"),
  ranger: L("Ranger", "Ranger"),
  rogue: L("Ladro", "Rogue"),
  sorcerer: L("Stregone", "Sorcerer"),
  warlock: L("Warlock", "Warlock"),
  wizard: L("Mago", "Wizard"),
});
const SUBCLASS_CLASSES = [
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
];
/** Validates a pack file: `{ pack, errors }`, where `pack` is the clean copy to store. */
export function validatePack(raw) {
  const errors = [];
  const add = (issue) => errors.push(issue);
  if (!isObject(raw) || raw.format !== PACK_FORMAT || raw.formatVersion !== 1)
    return {
      pack: null,
      errors: [
        L(
          "Non è un pacchetto di compatibilità di questa app (formato «d20-studio-compat-pack», versione 1).",
          "Not a compatibility pack of this app (format “d20-studio-compat-pack”, version 1).",
        ),
      ],
    };
  proseIssues(raw).forEach(add);
  if (!PACK_ID.test(str(raw.id)))
    add(L("Identificativo del pacchetto non valido.", "Invalid pack identifier."));
  const title = packName(raw.title);
  if (!title) add(L("Il pacchetto ha bisogno di un titolo.", "The pack needs a title."));
  const book = isObject(raw.book) ? raw.book : {};
  if (!str(book.title).trim())
    add(L("Indica il manuale a cui rimandano le pagine.", "Name the book the pages refer to."));
  const requires = arr(raw.requires);
  if (requires.length > PACK_LIMITS.requires)
    add(L("Troppe dipendenze.", "Too many dependencies."));
  for (const req of requires)
    if (!PACK_ID.test(str(req?.id)) && str(req?.id) !== PACK_BASE)
      add(L("Dipendenza senza identificativo valido.", "Dependency without a valid identifier."));
  const entries = arr(raw.entries);
  if (!entries.length || entries.length > PACK_LIMITS.entries)
    add(L("Da 1 a 500 voci per pacchetto.", "From 1 to 500 entries per pack."));
  const seen = new Set();
  entries.forEach((entry, i) => {
    const at = `#${i + 1}`;
    if (!PACK_TYPES.includes(entry?.type))
      add(L(`${at}: tipo non supportato.`, `${at}: unsupported type.`));
    if (!PACK_ID.test(str(entry?.id)) || seen.has(`${entry?.type}:${entry?.id}`))
      add(
        L(`${at}: identificativo mancante o ripetuto.`, `${at}: missing or repeated identifier.`),
      );
    seen.add(`${entry?.type}:${entry?.id}`);
    if (!packName(entry?.name)) add(L(`${at}: nome mancante.`, `${at}: name missing.`));
    if (!intIn(entry?.page, 1, 2000))
      add(
        L(
          `${at}: indica la pagina del manuale (da 1 a 2000).`,
          `${at}: give the book page (1 to 2000).`,
        ),
      );
    if (PACK_TYPES.includes(entry?.type))
      mechanicsIssues(entry.type, entry.mechanics, at).forEach(add);
  });
  if (errors.length) return { pack: null, errors };
  return {
    pack: {
      format: PACK_FORMAT,
      formatVersion: 1,
      id: raw.id,
      version: str(raw.version).slice(0, 20) || "1",
      title,
      publisher: str(raw.publisher).trim(),
      book: { title: str(book.title).trim(), edition: str(book.edition).trim() },
      simulation: raw.simulation === true,
      requires: requires.map((req) => ({
        id: req.id,
        ...(packName(req.title) ? { title: packName(req.title) } : {}),
      })),
      entries: entries.map((entry) => ({
        type: entry.type,
        id: entry.id,
        name: packName(entry.name),
        page: entry.page,
        mechanics: clone(entry.mechanics),
      })),
    },
    errors: [],
  };
}
/** Our own invented sample (a simulation): no publisher's content, names or numbers. */
export function samplePack() {
  const n = (it, en) => ({ it, en });
  return {
    format: PACK_FORMAT,
    formatVersion: 1,
    id: "esempio-valle-di-bruma",
    version: "1.0",
    title: n("Valle di Bruma · esempio (simulazione)", "Bruma Vale · sample (simulation)"),
    publisher: "d20 Studio · contenuto inventato",
    book: { title: "Manuale del gruppo (esempio)", edition: "2024" },
    simulation: true,
    requires: [{ id: PACK_BASE, title: n("Regole SRD 5.2.1", "SRD 5.2.1 rules") }],
    entries: [
      {
        type: "creature",
        id: "lanterna-vagante",
        name: n("Lanterna vagante", "Wandering Lantern"),
        page: 42,
        mechanics: {
          size: "small",
          creatureType: "elemental",
          ac: 13,
          hp: 22,
          hitDice: "5d6+5",
          speed: { walk: 0, fly: 9 },
          abilities: { str: 6, dex: 16, con: 12, int: 6, wis: 12, cha: 8 },
          cr: "1",
          xp: 200,
          attacks: [
            {
              name: n("Vampata", "Flare"),
              toHit: 5,
              damage: "2d6+3",
              damageType: "fire",
              reach: 1.5,
            },
          ],
        },
      },
      {
        type: "creature",
        id: "custode-di-nebbia",
        name: n("Custode di nebbia", "Mist Warden"),
        page: 43,
        mechanics: {
          size: "medium",
          creatureType: "undead",
          ac: 12,
          hp: 45,
          hitDice: "7d8+14",
          speed: { walk: 9 },
          abilities: { str: 14, dex: 12, con: 14, int: 8, wis: 13, cha: 10 },
          cr: "2",
          xp: 450,
          attacks: [
            {
              name: n("Tocco gelido", "Chill Touch"),
              toHit: 4,
              damage: "2d8+2",
              damageType: "cold",
              reach: 1.5,
            },
          ],
        },
      },
      {
        type: "item",
        id: "lanterna-di-bruma",
        name: n("Lanterna di Bruma", "Bruma Lantern"),
        page: 88,
        mechanics: { rarity: "uncommon", attunement: false, charges: 3, weight: 1 },
      },
      {
        type: "spell",
        id: "fiamma-del-faro",
        name: n("Fiamma del faro", "Beacon Flame"),
        page: 120,
        mechanics: {
          level: 2,
          school: "evocation",
          castingTime: "action",
          rangeMeters: 18,
          save: "dex",
          damage: "3d6",
          damageType: "fire",
          concentration: false,
        },
      },
      {
        type: "subclass",
        id: "custode-del-faro",
        name: n("Custode del faro", "Lighthouse Keeper"),
        page: 60,
        mechanics: { classId: "wizard", levels: [3, 6, 10, 14] },
      },
    ],
  };
}
export const emptyPacks = () => ({ packs: [], enabled: {} });
export function normalizePacks(value) {
  if (!isObject(value)) return emptyPacks();
  return {
    packs: arr(value.packs).filter(
      (row) => isObject(row) && typeof row.owner === "string" && isObject(row.pack),
    ),
    enabled: Object.fromEntries(
      Object.entries(isObject(value.enabled) ? value.enabled : {}).map(([cid, ids]) => [
        cid,
        arr(ids).filter((id) => typeof id === "string"),
      ]),
    ),
  };
}
const packsSlice = (state) => {
  state.ext ??= {};
  state.ext[PACKS] = normalizePacks(state.ext[PACKS]);
  return state.ext[PACKS];
};
export const readPacks = (state) => normalizePacks(state?.ext?.[PACKS]);
/** The packs this identity installed in its own Library. */
export const installedPacks = (state, role) =>
  readPacks(state).packs.filter((row) => row.owner === role);
/** Packs enabled in a campaign (the DM's installs), readable by its members. */
export function campaignPacks(state, campaignId) {
  const { packs, enabled } = readPacks(state);
  return arr(enabled[campaignId])
    .map((id) => packs.find((row) => row.owner === "dm" && row.pack.id === id))
    .filter(Boolean);
}
/** One pack this identity may read: its own install or one enabled in the campaign. */
export function packFor(state, packId, role) {
  return (
    installedPacks(state, role).find((row) => row.pack.id === packId) ??
    campaignPacks(state, state?.campaign?.id).find((row) => row.pack.id === packId) ??
    null
  );
}
export function installPack(state, raw, role, at = nowIso()) {
  const { pack, errors } = validatePack(raw);
  if (!pack) throw packRefusal(errors[0].it, errors[0].en);
  const slice = packsSlice(state);
  const existing = slice.packs.find((row) => row.owner === role && row.pack.id === pack.id);
  if (existing && existing.pack.version === pack.version && hashOf(existing.pack) === hashOf(pack))
    throw packRefusal(
      `«${pack.title.it}» è già nella tua Biblioteca.`,
      `“${pack.title.en}” is already in your Library.`,
    );
  if (existing) Object.assign(existing, { pack, installedAt: at });
  else slice.packs.push({ owner: role, installedAt: at, pack });
  return { pack: clone(pack), updated: Boolean(existing) };
}
/** Dependency check (as adventure requirements): the base rules, then each required pack
 * installed by this identity and, for a campaign, enabled in it. */
export function packRequirements(state, packId, campaignId, role) {
  const row = packFor(state, packId, role);
  if (!row) return [];
  const mine = installedPacks(state, role);
  const on = new Set(readPacks(state).enabled[campaignId] ?? []);
  return row.pack.requires.map((req) => {
    if (req.id === PACK_BASE)
      return {
        id: req.id,
        title: req.title ?? L("Regole SRD 5.2.1", "SRD 5.2.1 rules"),
        status: "ready",
        action: null,
      };
    const installed = mine.find((other) => other.pack.id === req.id);
    const status = !installed ? "missing" : campaignId && !on.has(req.id) ? "disabled" : "ready";
    return {
      id: req.id,
      title: installed?.pack.title ?? req.title ?? L(req.id, req.id),
      status,
      action: status === "missing" ? "import" : status === "disabled" ? "enable" : null,
    };
  });
}
function packCampaigns(state, role) {
  return importTargets(state, role);
}
/** Enables a pack in a campaign the DM runs, with the installed packs it needs. */
export function enablePack(state, packId, campaignId, role) {
  requireDM(role);
  if (!packCampaigns(state, role).some((c) => c.id === campaignId))
    refuse("Non guidi questa campagna.", "You do not run this campaign.");
  const row = installedPacks(state, role).find((r) => r.pack.id === packId);
  if (!row)
    refuse(
      "Importa prima il pacchetto nella Biblioteca.",
      "Import the pack into the Library first.",
    );
  const missing = packRequirements(state, packId, campaignId, role).filter(
    (r) => r.status === "missing",
  );
  if (missing.length)
    refuse(
      `Manca il pacchetto richiesto «${missing[0].title.it}»: importalo, poi abilita questo.`,
      `The required pack “${missing[0].title.en}” is missing: import it, then enable this one.`,
    );
  const slice = packsSlice(state);
  const list = new Set(slice.enabled[campaignId] ?? []);
  const added = [];
  const visit = (id) => {
    const pack = installedPacks(state, role).find((r) => r.pack.id === id)?.pack;
    for (const req of pack?.requires ?? []) if (req.id !== PACK_BASE) visit(req.id);
    if (!list.has(id)) {
      list.add(id);
      added.push(id);
    }
  };
  visit(packId);
  slice.enabled[campaignId] = [...list];
  return added;
}
export function disablePack(state, packId, campaignId, role) {
  requireDM(role);
  const slice = packsSlice(state);
  const list = slice.enabled[campaignId] ?? [];
  const needed = list.filter((id) =>
    installedPacks(state, role)
      .find((r) => r.pack.id === id)
      ?.pack.requires.some((req) => req.id === packId),
  );
  if (needed.length)
    refuse(
      "Un altro pacchetto abilitato lo richiede: disabilita prima quello.",
      "Another enabled pack needs it: disable that one first.",
    );
  slice.enabled[campaignId] = list.filter((id) => id !== packId);
  if (!slice.enabled[campaignId].length) delete slice.enabled[campaignId];
}
export function removePack(state, packId, role) {
  const slice = packsSlice(state);
  if (!slice.packs.some((r) => r.owner === role && r.pack.id === packId))
    refuse("Pacchetto non trovato.", "Pack not found.");
  if (installedPacks(state, role).some((r) => r.pack.requires.some((req) => req.id === packId)))
    refuse(
      "Un altro pacchetto lo richiede: rimuovi prima quello.",
      "Another pack needs it: remove that one first.",
    );
  slice.packs = slice.packs.filter((r) => !(r.owner === role && r.pack.id === packId));
  if (role === "dm")
    for (const cid of Object.keys(slice.enabled)) {
      slice.enabled[cid] = slice.enabled[cid].filter((id) => id !== packId);
      if (!slice.enabled[cid].length) delete slice.enabled[cid];
    }
}
/** The file a pack is shared as: mechanics only, exactly what was validated. */
export function exportPack(state, packId, role) {
  const row = installedPacks(state, role).find((r) => r.pack.id === packId);
  if (!row) refuse("Pacchetto non trovato.", "Pack not found.");
  return JSON.stringify(row.pack, null, 2);
}

// Pack UI: a Library section; `?revision=pack:<id>` opens one pack.
const packUi = { error: null };
function packCounts(ctx, pack) {
  return PACK_TYPES.map((type) => [type, pack.entries.filter((e) => e.type === type).length])
    .filter(([, n]) => n)
    .map(([type, n]) => `${n} ${ctx.label(PACK_TYPE_NAMES[type][n === 1 ? 0 : 1]).toLowerCase()}`)
    .join(" · ");
}
const pageRef = (ctx, page) =>
  `<p class="adv-pack-page" data-adv-pack-page="${page}">${ctx.t(`Testo: nel vostro manuale, p. ${page}`, `Text: in your book, p. ${page}`)}</p>`;
const labelOf = (ctx, group, id) =>
  id && SRD_LABELS[group]?.[id] ? ctx.label(SRD_LABELS[group][id]) : id;
function mechanicsHTML(ctx, entry) {
  const m = entry.mechanics ?? {};
  const fact = (label, value) =>
    value === undefined || value === null || value === ""
      ? ""
      : `<div><dt>${label}</dt><dd>${ctx.esc(String(value))}</dd></div>`;
  const meters = (value) => `${String(value).replace(".", ctx.lang === "it" ? "," : ".")} m`;
  if (entry.type === "creature")
    return `<dl class="adv-pack-facts">${fact(ctx.t("CA", "AC"), m.ac)}${fact(ctx.t("PF", "HP"), m.hitDice ? `${m.hp} (${m.hitDice})` : m.hp)}${fact(
      ctx.t("Velocità", "Speed"),
      Object.entries(isObject(m.speed) ? m.speed : {})
        .map(
          ([kind, value]) =>
            `${kind === "walk" ? "" : `${ctx.t({ fly: "volo", swim: "nuoto", climb: "scalata", burrow: "scavo" }[kind] ?? kind, kind)} `}${meters(value)}`,
        )
        .join(", "),
    )}${ABILITY_KEYS.map((k) => fact(labelOf(ctx, "ability", k), m.abilities?.[k])).join("")}${fact(ctx.t("GS", "CR"), m.cr)}${fact(ctx.t("PE", "XP"), m.xp)}${arr(
      m.attacks,
    )
      .map((a) =>
        fact(
          ctx.label(a.name),
          `${a.toHit >= 0 ? "+" : ""}${a.toHit} · ${a.damage}${a.damageType ? ` ${labelOf(ctx, "damageType", a.damageType).toLowerCase()}` : ""}`,
        ),
      )
      .join("")}</dl>`;
  if (entry.type === "item")
    return `<dl class="adv-pack-facts">${fact(ctx.t("Rarità", "Rarity"), labelOf(ctx, "rarity", m.rarity))}${fact(ctx.t("Sintonia", "Attunement"), m.attunement === undefined ? null : m.attunement ? ctx.t("sì", "yes") : ctx.t("no", "no"))}${fact(ctx.t("Bonus", "Bonus"), m.bonus ? `+${m.bonus}` : null)}${fact(ctx.t("Cariche", "Charges"), m.charges)}${fact(ctx.t("Peso (kg)", "Weight (kg)"), m.weight)}</dl>`;
  if (entry.type === "spell")
    return `<dl class="adv-pack-facts">${fact(ctx.t("Livello", "Level"), m.level)}${fact(ctx.t("Scuola", "School"), labelOf(ctx, "school", m.school))}${fact(ctx.t("Gittata", "Range"), m.rangeMeters !== undefined ? meters(m.rangeMeters) : null)}${fact(ctx.t("Tiro salvezza", "Saving throw"), m.save ? labelOf(ctx, "ability", m.save) : null)}${fact(ctx.t("Danni", "Damage"), m.damage ? `${m.damage}${m.damageType ? ` ${labelOf(ctx, "damageType", m.damageType).toLowerCase()}` : ""}` : null)}${fact(ctx.t("Concentrazione", "Concentration"), m.concentration === undefined ? null : m.concentration ? ctx.t("sì", "yes") : ctx.t("no", "no"))}</dl>`;
  return `<dl class="adv-pack-facts">${fact(ctx.t("Classe", "Class"), CLASS_NAMES[m.classId] ? ctx.label(CLASS_NAMES[m.classId]) : m.classId)}${fact(ctx.t("Livelli", "Levels"), arr(m.levels).join(", "))}</dl>`;
}
function requirementsHTML(ctx, pack, campaignId) {
  const rows = packRequirements(ctx.state, pack.id, campaignId, ctx.role);
  if (!rows.length) return "";
  const label = {
    ready: ctx.t("pronto", "ready"),
    missing: ctx.t("manca: importalo", "missing: import it"),
    disabled: ctx.t("non abilitato: si abilita con questo", "not enabled: enabled with this one"),
  };
  return `<ul class="adv-pack-reqs" aria-label="${ctx.t("Dipendenze", "Dependencies")}">${rows.map((r) => `<li data-adv-pack-req="${ctx.esc(r.id)}" data-status="${r.status}">${ctx.esc(ctx.label(r.title))}: ${label[r.status]}</li>`).join("")}</ul>`;
}
function packCard(ctx, row, { mine }) {
  const pack = row.pack;
  const cid = ctx.state.campaign?.id;
  const on = arr(readPacks(ctx.state).enabled[cid]).includes(pack.id) && row.owner === "dm";
  const dm = ctx.role === "dm" && mine;
  const others = dm ? packCampaigns(ctx.state, ctx.role).filter((c) => !c.current) : [];
  const missing =
    dm && packRequirements(ctx.state, pack.id, cid, ctx.role).some((r) => r.status === "missing");
  const reasonId = `adv-pack-reason-${pack.id}`;
  return `<li class="adv-card adv-pack-card" data-adv-pack="${ctx.esc(pack.id)}"><h3><button type="button" class="adv-card-open" data-adv-pack-open="${ctx.esc(pack.id)}">${ctx.esc(ctx.label(pack.title))}</button></h3><p class="adv-card-meta"><span class="badge">v${ctx.esc(pack.version)}</span> ${pack.simulation ? `<span class="badge adv-pack-sim">${ctx.t("Simulazione", "Simulation")}</span> ` : ""}<span class="badge">${ctx.t("Solo meccaniche", "Mechanics only")}</span></p><p class="muted">${ctx.esc(pack.publisher)}${pack.publisher ? " · " : ""}${ctx.t("Manuale", "Book")}: ${ctx.esc(pack.book.title)}</p><p class="muted">${ctx.esc(packCounts(ctx, pack))}</p><p class="adv-pack-state" data-adv-pack-state="${on ? "on" : "off"}">${on ? ctx.t("Abilitato in questa campagna", "Enabled in this campaign") : mine ? ctx.t("Nella tua Biblioteca, non abilitato in questa campagna", "In your Library, not enabled in this campaign") : ""}</p>${on ? `<p class="muted adv-pack-where" data-adv-pack-where>${ctx.t("Le creature sono nel bestiario del Tavolo («Aggiungi creature»), le sottoclassi nel costruttore dei personaggi, ogni voce nella ricerca della Biblioteca.", "Creatures are in the Table’s bestiary (“Add creatures”), subclasses in the character builder, every entry in the Library search.")}</p>` : ""}${mine ? requirementsHTML(ctx, pack, dm ? cid : null) : ""}<div class="toolbar">${dm && cid ? (on ? `<button type="button" class="button" data-adv-pack-disable="${ctx.esc(pack.id)}">${ctx.t("Disabilita in questa campagna", "Disable in this campaign")}</button>` : `<button type="button" class="button primary" data-adv-pack-enable="${ctx.esc(pack.id)}" ${missing ? `disabled aria-describedby="${reasonId}"` : ""}>${ctx.t("Abilita in questa campagna", "Enable in this campaign")}</button>`) : ""}${others.length ? `<button type="button" class="button quiet" data-adv-pack-copy="${ctx.esc(pack.id)}">${ctx.t("Copia in un’altra campagna…", "Copy to another campaign…")}</button>` : ""}${mine ? `<button type="button" class="button quiet" data-adv-pack-export="${ctx.esc(pack.id)}">${ctx.t("Esporta JSON", "Export JSON")}</button><button type="button" class="button quiet danger" data-adv-pack-remove="${ctx.esc(pack.id)}">${ctx.t("Rimuovi", "Remove")}</button>` : ""}</div>${missing ? `<p class="adv-pack-reason" id="${reasonId}">${ctx.t("Manca un pacchetto richiesto: importalo qui sopra, poi abilita questo.", "A required pack is missing: import it above, then enable this one.")}</p>` : ""}</li>`;
}
function packsBody(ctx) {
  const open = str(ctx.view.revision).startsWith("pack:") ? str(ctx.view.revision).slice(5) : "";
  const row = open ? packFor(ctx.state, open, ctx.role) : null;
  if (row) return packDetail(ctx, row);
  const mine = installedPacks(ctx.state, ctx.role);
  const shared = ctx.role === "dm" ? [] : campaignPacks(ctx.state, ctx.state.campaign?.id);
  return `<div class="adv-list adv-packs" data-adv-packs>${undoBar(ctx)}<div class="adv-list-head"><div><h2>${ctx.t("Pacchetti di compatibilità (solo meccaniche)", "Compatibility packs (mechanics only)")}</h2><p class="muted">${ctx.t("Come i pacchetti di compendio di Foundry e Shard: creature, oggetti, incantesimi e sottoclassi con i loro numeri e la pagina del vostro manuale. Si importano, si abilitano nella campagna e si controllano le dipendenze come le avventure.", "Like Foundry and Shard compendium packs: creatures, items, spells and subclasses with their numbers and the page of your own book. Import them, enable them in the campaign and check dependencies as with adventures.")}</p></div><div class="toolbar"><label class="button adv-file-button">${ctx.icon("scroll")} ${ctx.t("Importa pacchetto (JSON)…", "Import pack (JSON)…")}<input type="file" accept=".json,application/json" data-adv-pack-import class="adv-file-input"></label><button type="button" class="button" data-adv-pack-sample>${ctx.t("Prova il pacchetto di esempio", "Try the sample pack")}</button></div></div><p class="adv-pack-licence" data-adv-pack-licence>${ctx.t("Licenza", "Licence")}: ${ctx.esc(ctx.label(PACK_LICENCE))}</p>${packUi.error ? `<p class="error" role="alert" data-adv-pack-error>${ctx.esc(ctx.label(packUi.error))}</p>` : ""}${mine.length ? `<ul class="adv-cards">${mine.map((r) => packCard(ctx, r, { mine: true })).join("")}</ul>` : `<p class="empty-state">${ctx.t("Nessun pacchetto nella tua Biblioteca. Importa un file JSON o prova quello di esempio (contenuto inventato).", "No pack in your Library. Import a JSON file or try the sample one (invented content).")}</p>`}${shared.length ? `<h3>${ctx.t("Abilitati dal DM in questa campagna", "Enabled by the DM in this campaign")}</h3><ul class="adv-cards">${shared.map((r) => packCard(ctx, r, { mine: false })).join("")}</ul>` : ""}</div>`;
}
function packDetail(ctx, row) {
  const pack = row.pack;
  return `<div class="adv-list adv-packs" data-adv-pack-detail="${ctx.esc(pack.id)}"><nav class="adv-crumbs" aria-label="${ctx.t("Percorso", "Breadcrumb")}"><button type="button" class="text-button" data-adv-pack-back>${ctx.t("Biblioteca › Pacchetti di compatibilità", "Library › Compatibility packs")}</button><span aria-hidden="true">›</span><span>${ctx.esc(ctx.label(pack.title))}</span></nav><div class="page-heading"><div><h2>${ctx.esc(ctx.label(pack.title))}</h2><p class="muted">${ctx.esc(pack.publisher)} · ${ctx.t("Manuale", "Book")}: ${ctx.esc(pack.book.title)}${pack.book.edition ? ` (${ctx.esc(pack.book.edition)})` : ""}${pack.simulation ? ` · <span class="badge adv-pack-sim">${ctx.t("Simulazione", "Simulation")}</span>` : ""}</p></div></div><p class="adv-pack-licence">${ctx.t("Licenza", "Licence")}: ${ctx.esc(ctx.label(PACK_LICENCE))}</p>${PACK_TYPES.map(
    (type) => {
      const entries = pack.entries.filter((e) => e.type === type);
      return entries.length
        ? `<section class="adv-pack-group"><h3>${ctx.esc(ctx.label(PACK_TYPE_NAMES[type][1]))}</h3><ul class="adv-pack-entries">${entries.map((e) => `<li class="adv-pack-entry" data-adv-pack-entry="${ctx.esc(e.id)}"><h4>${ctx.esc(ctx.label(e.name))}</h4>${mechanicsHTML(ctx, e)}${pageRef(ctx, e.page)}</li>`).join("")}</ul></section>`
        : "";
    },
  ).join("")}</div>`;
}
function packCommit(ctx, label, mutator, options) {
  return perform(ctx, () => {
    ctx.commit(label, mutator, options);
    packUi.error = null;
    return true;
  });
}
function installFromJson(ctx, raw, fileName = "") {
  const { pack, errors } = validatePack(raw);
  if (!pack) {
    packUi.error = errors[0];
    ctx.toast(ctx.label(errors[0]), true);
    return ctx.render();
  }
  const ok = packCommit(
    ctx,
    ctx.t(`Pacchetto importato · ${pack.title.it}`, `Pack imported · ${pack.title.en}`),
    (draft) => installPack(draft, raw, ctx.role),
    { local: true, visibility: "private", undoable: false },
  );
  if (ok)
    ctx.toast(
      ctx.t(
        `«${pack.title.it}» è nella tua Biblioteca${fileName ? ` (${fileName})` : ""}.${ctx.role === "dm" ? " Abilitalo nella campagna per usarlo." : ""}`,
        `“${pack.title.en}” is in your Library${fileName ? ` (${fileName})` : ""}.${ctx.role === "dm" ? " Enable it in the campaign to use it." : ""}`,
      ),
    );
}
export function importPackFile(ctx, text, fileName = "") {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    packUi.error = L("Il file non è JSON valido.", "The file is not valid JSON.");
    ctx.toast(ctx.label(packUi.error), true);
    return ctx.render();
  }
  return installFromJson(ctx, raw, fileName);
}
export function installSamplePack(ctx) {
  return installFromJson(ctx, samplePack());
}
export function runPackAction(ctx, action, packId, campaignId = ctx.state.campaign?.id) {
  const row = installedPacks(ctx.state, ctx.role).find((r) => r.pack.id === packId);
  const title = row ? ctx.label(row.pack.title) : packId;
  if (action === "enable")
    return packCommit(
      ctx,
      ctx.t(
        `Pacchetto abilitato nella campagna · ${title}`,
        `Pack enabled in the campaign · ${title}`,
      ),
      (draft) => enablePack(draft, packId, campaignId, ctx.role),
    );
  if (action === "disable")
    return packCommit(
      ctx,
      ctx.t(
        `Pacchetto disabilitato nella campagna · ${title}`,
        `Pack disabled in the campaign · ${title}`,
      ),
      (draft) => disablePack(draft, packId, campaignId, ctx.role),
    );
  if (action === "remove")
    return packCommit(
      ctx,
      ctx.t(`Pacchetto rimosso · ${title}`, `Pack removed · ${title}`),
      (draft) => removePack(draft, packId, ctx.role),
      ctx.role === "dm" ? {} : { local: true, visibility: "private" },
    );
  return null;
}
function openPackCopy(ctx, packId) {
  const others = packCampaigns(ctx.state, ctx.role).filter((c) => !c.current);
  const row = installedPacks(ctx.state, ctx.role).find((r) => r.pack.id === packId);
  if (!row || !others.length) return;
  ctx.dialog(
    ctx.t("Copia in un’altra campagna", "Copy to another campaign"),
    `<p>${ctx.t(`«${ctx.esc(ctx.label(row.pack.title))}» resta nella tua Biblioteca: la copia lo abilita anche nella campagna scelta, con i pacchetti che richiede.`, `“${ctx.esc(ctx.label(row.pack.title))}” stays in your Library: copying enables it in the chosen campaign too, with the packs it needs.`)}</p><label class="field">${ctx.t("Campagna", "Campaign")}<select name="campaign">${others.map((c) => `<option value="${ctx.esc(c.id)}">${ctx.esc(c.name)}</option>`).join("")}</select></label>`,
    {
      submitLabel: ctx.t("Abilita nella campagna", "Enable in the campaign"),
      onSubmit: (form) => {
        const target = String(form.get("campaign"));
        if (runPackAction(ctx, "enable", packId, target))
          ctx.toast(
            ctx.t(
              `Abilitato in «${others.find((c) => c.id === target)?.name ?? target}».`,
              `Enabled in “${others.find((c) => c.id === target)?.name ?? target}”.`,
            ),
          );
      },
    },
  );
}
function bindPacks(el, ctx) {
  bindUndo(el, ctx);
  const input = el.querySelector("[data-adv-pack-import]");
  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      packUi.error = L("File troppo grande (massimo 2 MB).", "File too large (2 MB at most).");
      return ctx.render();
    }
    importPackFile(ctx, await file.text(), file.name);
  });
  el.querySelector("[data-adv-pack-sample]")?.addEventListener("click", () =>
    installSamplePack(ctx),
  );
  el.querySelectorAll("[data-adv-pack-open]").forEach((button) =>
    button.addEventListener("click", () =>
      ctx.navigate("library", { tab: PACKS, revision: `pack:${button.dataset.advPackOpen}` }),
    ),
  );
  el.querySelector("[data-adv-pack-back]")?.addEventListener("click", () =>
    ctx.navigate("library", { tab: PACKS }),
  );
  for (const action of ["enable", "disable"])
    el.querySelectorAll(`[data-adv-pack-${action}]`).forEach((button) =>
      button.addEventListener("click", () =>
        runPackAction(ctx, action, button.getAttribute(`data-adv-pack-${action}`)),
      ),
    );
  el.querySelectorAll("[data-adv-pack-copy]").forEach((button) =>
    button.addEventListener("click", () => openPackCopy(ctx, button.dataset.advPackCopy)),
  );
  el.querySelectorAll("[data-adv-pack-remove]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.advPackRemove;
      ctx.dialog(
        ctx.t("Rimuovere il pacchetto?", "Remove the pack?"),
        `<p>${ctx.t("Esce dalla tua Biblioteca e dalle campagne in cui l’hai abilitato. Puoi reimportarlo dal file.", "It leaves your Library and the campaigns where you enabled it. You can import it again from the file.")}</p>`,
        {
          submitLabel: ctx.t("Rimuovi", "Remove"),
          onSubmit: () => runPackAction(ctx, "remove", id),
        },
      );
    }),
  );
  el.querySelectorAll("[data-adv-pack-export]").forEach((button) =>
    button.addEventListener("click", () =>
      perform(ctx, () => {
        const id = button.dataset.advPackExport;
        const json = exportPack(ctx.state, id, ctx.role);
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `${id}.json`;
        link.hidden = true;
        el.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
    ),
  );
}

export function register(registry) {
  registry.registerStateSlice(ID, {
    version: VERSION,
    seed: seedSlice,
    normalize: normalizeSlice,
    afterUndo: (current, restored) => revertParkedWrites(current, restored, parkedBefore),
  });
  registry.registerStateSlice(PACKS, {
    version: 1,
    seed: emptyPacks,
    normalize: (saved, fromVersion) => {
      if (fromVersion > 1) throw Error("Saved compatibility packs come from a newer version");
      return normalizePacks(saved);
    },
  });
  registry.registerStyles(new URL("./adventures.css", import.meta.url));
  // BI-45: compatibility packs, beside the adventure packages (same install → enable →
  // dependency path); both roles read it, only the DM enables packs in a campaign.
  registry.add("library-section", {
    id: PACKS,
    label: L("Pacchetti di compatibilità", "Compatibility packs"),
    description: L(
      "Solo meccaniche: creature, oggetti, incantesimi e sottoclassi con la pagina del vostro manuale",
      "Mechanics only: creatures, items, spells and subclasses with the page of your own book",
    ),
    order: 36,
    render: (ctx) => `<div class="adv-root">${packsBody(ctx)}</div>`,
    bind: (el, ctx) => bindPacks(el, ctx),
  });
  registry.add("command", {
    id: `${ID}.compat-packs`,
    label: L(
      "Pacchetti di compatibilità (solo meccaniche)…",
      "Compatibility packs (mechanics only)…",
    ),
    description: L(
      "Importa, abilita nella campagna ed esporta pacchetti di sole meccaniche con le pagine del vostro manuale",
      "Import, enable in the campaign and export mechanics-only packs with your book's pages",
    ),
    keywords: [
      L("compatibilità", "compatibility"),
      L("pacchetto", "pack"),
      L("solo meccaniche", "mechanics only"),
      L("compendio", "compendium"),
      L("manuale", "book"),
    ],
    group: "library",
    run: (ctx) => ctx.navigate("library", { tab: PACKS }),
  });
  registry.add("library-section", {
    id: ID,
    label: L("Avventure", "Adventures"),
    description: L(
      "Pacchetti riutilizzabili di scene e materiali",
      "Reusable packages of scenes and materials",
    ),
    order: 35,
    roles: ["dm"],
    render: (ctx) => `<div class="adv-root">${listBody(ctx)}</div>`,
    bind: (el, ctx) => bindCommon(el, ctx),
  });
  registry.add("route", {
    id: ID,
    label: L("Avventura", "Adventure"),
    icon: "book",
    roles: ["dm"],
    render: routeRender,
    bind: routeBind,
  });
  registry.add("preparation-section", {
    id: ID,
    group: "sessions",
    label: L("Avventure", "Adventures"),
    roles: ["dm"],
    order: 60,
    render: prepRender,
    bind: prepBind,
  });
  registry.add("notifications", {
    id: `${ID}-updates`,
    label: L("Aggiornamenti delle avventure", "Adventure updates"),
    roles: ["dm"],
    collect: (ctx) =>
      readSlice(ctx.state).adventures.flatMap((adventure) =>
        adventureUsage(ctx.state, adventure, specsOf(ctx))
          .filter((u) => u.updateAvailable)
          .map((u) => ({
            id: `${ID}-update-${u.campaignId}-${adventure.id}-${latest(adventure).number}`,
            title: L(
              `Aggiornamento disponibile: ${adventure.title} v${latest(adventure).number}`,
              `Update available: ${adventure.title} v${latest(adventure).number}`,
            ),
            body: L(
              `Per ${u.name}: ${latest(adventure).notes}`,
              `For ${u.name}: ${latest(adventure).notes}`,
            ),
            time: latest(adventure).createdAt,
            target: { page: ID, params: { id: adventure.id } },
          })),
      ),
  });
  registry.add("search", {
    id: ID,
    label: L("Avventure", "Adventures"),
    roles: ["dm"],
    search: (ctx, query) => {
      const q = str(query).toLowerCase().trim();
      if (!q) return [];
      return readSlice(ctx.state)
        .adventures.filter((a) => `${a.title} ${a.summary}`.toLowerCase().includes(q))
        .slice(0, 20)
        .map((a) => ({
          title: L(a.title, a.title),
          excerpt: L(`Avventura · v${latest(a).number}`, `Adventure · v${latest(a).number}`),
          page: ID,
          params: { id: a.id },
        }));
    },
  });
  // BI-45: the palette finds pack entries (Shard/Foundry compendium search) and opens the pack.
  registry.add("search", {
    id: PACKS,
    label: L("Pacchetti di compatibilità", "Compatibility packs"),
    search: (ctx, query) =>
      searchPackEntries(ctx.state, ctx.role, query)
        .slice(0, 20)
        .map((entry) => ({
          title: entry.name,
          excerpt: L(
            `${PACK_TYPE_NAMES[entry.type][0].it} · ${entry.packTitle.it} · p. ${entry.page}`,
            `${PACK_TYPE_NAMES[entry.type][0].en} · ${entry.packTitle.en} · p. ${entry.page}`,
          ),
          page: "library",
          params: { tab: PACKS, revision: `pack:${entry.packId}` },
        })),
  });
  registry.add("draft-guard", {
    id: `${ID}-editor`,
    label: L("Avventura in preparazione", "Adventure being prepared"),
    hasDraft: (ctx, next) =>
      ui.dirty &&
      ctx.view.page === ID &&
      ["new", "rebuild"].includes(ctx.view.tab) &&
      !(next && next.page === ID && next.tab === ctx.view.tab && next.id === ctx.view.id),
    confirm: (ctx, proceed) =>
      ctx.dialog(
        ctx.t("Scartare le scelte?", "Discard your choices?"),
        `<p>${ctx.t("Le scelte di questa avventura non sono ancora salvate.", "The choices for this adventure are not saved yet.")}</p>`,
        {
          submitLabel: ctx.t("Scarta", "Discard"),
          cancelLabel: ctx.t("Continua a modificare", "Keep editing"),
          onSubmit: () => {
            ui.dirty = false;
            ui.forms = {};
            proceed();
          },
        },
      ),
  });
  // BI-41 (Roll20 «Create game with module»): «Crea campagna» offers «Parti da
  // un’avventura» and runs this command; blocked homebrew opens the adventure's page.
  registry.add("command", {
    id: `${ID}.create-campaign`,
    label: L("Crea campagna da un’avventura…", "Create campaign from an adventure…"),
    description: L(
      "Nuova campagna che parte da un’avventura: scene, PNG, materiali, tabelle e incontri già pronti",
      "New campaign that starts from an adventure: scenes, NPCs, materials, tables and encounters ready",
    ),
    group: "library",
    roles: ["dm"],
    run: (ctx, input = {}) => startCampaignFromAdventure(ctx, input ?? {}),
  });
  registry.add("command", {
    id: `${ID}.universe`,
    label: L(
      "Universo: luoghi, fazioni e storia del mondo",
      "Universe: places, factions and world history",
    ),
    description: L(
      "Voci del mondo condivise da tutte le campagne; importa documento HTML o Markdown (Word: pagina web)",
      "World entries shared by every campaign; import an HTML or Markdown document (Word: web page)",
    ),
    group: "library",
    roles: ["dm"],
    run: (ctx) => ctx.navigate("library", { tab: ID }),
  });
  registry.on("role-changed", () => {
    resetUI();
    packUi.error = null;
  });
  registry.on("reset", () => {
    resetUI();
    packUi.error = null;
    parkedBefore.clear();
  });
}
/** The adventures a new campaign may start from (the create-campaign dialog lists them). */
export function campaignStartChoices(state) {
  return readSlice(state).adventures.map((a) => ({
    id: a.id,
    title: a.title,
    version: latest(a)?.number ?? 1,
  }));
}
export function startCampaignFromAdventure(ctx, { adventureId, name, description } = {}) {
  const adventure = adventureOf(ctx.state, adventureId, false);
  if (!adventure) return null;
  const version = latest(adventure);
  const input = {
    name: str(name).trim() || adventure.title,
    description: str(description).trim() || adventure.summary,
    startScene: Boolean(version.startSceneKey),
    intro: Boolean(version.introKey),
  };
  const blocked = requirementStatus(ctx.state, version, null, ctx.role, specsOf(ctx)).some(
    (r) => r.status !== "ready",
  );
  if (blocked) {
    // The adventure's own «Nuova campagna» page, with the name kept and one action per entry.
    ui.forms[`campaign:${adventureId}`] = { ...input };
    ctx.toast(
      ctx.t(
        "L’avventura richiede contenuti homebrew: aggiungili qui, poi crea la campagna.",
        "The adventure needs homebrew content: add it here, then create the campaign.",
      ),
    );
    go(ctx, adventureId, "campaign");
    return null;
  }
  return submitCampaign(ctx, adventureId, input);
}
