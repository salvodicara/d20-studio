// B43 structured journal: the campaign archive of typed pages (quest, person, organization,
// shop, place, event, checklist, page) with property kits, secret blocks revealed per block, [[links]],
// backlinks and unlinked mentions, nested pages, cut-to-new-page, saved views, browser-like
// tabs and "Solo io" notes. Pure domain functions first, then the archive section's
// render/bind. Registration lives in quests.mjs, which also wires quests and factions.
//
// Adopted patterns (census IDs): Monk's Enhanced Journal typed pages, browser-like tabs with
// back/forward and a bookmark bar (FVT-057); Kanka Property Kits (CMP-27), Elements (CMP-32)
// and posts with their own visibility (CMP-26); Foundry secret blocks with reveal (FVT-054)
// and Show Players to everyone or selected users (FVT-162, same dialog as B15 handouts);
// LegendKeeper /secret blocks, [[name]] nested pages and Cut-to-New-Page (CMP-56, CMP-60);
// Obsidian backlinks with linked and unlinked mentions (CMP-88) and Bases saved views with a
// table or cards layout and inline property editing (CMP-91). Link suggestions are only
// confirmed or dismissed by the author, never applied automatically (census conflict S3).
// Local two-identity simulation: projections here are not backend access control.

import {
  campaignMembers,
  createCampaignEntryNow,
  editCampaignText,
  getCampaignEntry,
  isCampaignMember,
  isLocalEntry,
  listCampaignEntries,
  listEntryTemplates,
  resolveCampaignLinks,
  saveEntryTemplate,
  WORLD_TYPES as ENTRY_WORLD_TYPES,
} from "./campaign-content.mjs";
import * as srd from "./srd-compendium.mjs";
import { canCopyToCampaign, copyToCampaign, insertAtCaret, scrollIntoStrip } from "./ui.mjs";
// P8 CA-26: roll and reward buttons (@Embed markers) in Archive pages.
import {
  bindTextEmbeds,
  insertEmbed,
  openEmbedPicker,
  renderTextWithEmbeds,
} from "./text-embeds.mjs";
import {
  canControlActor,
  canViewActor,
  isActorAvailable,
  isCampaignActor,
} from "./character-access.mjs";
// H-05: entries and Archive pages through the viewer's own content filter (P10 CA-68 contract).
import { filterFor, topicById } from "./safety-domain.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const SLICE = "quests";
export const VERSION = 1;
export const SOURCE = Object.freeze({
  kind: "authored-demo",
  revision: "blueprint-b43-1",
  note: "Synthetic campaign archive, quests and factions for the prototype; not official adventure text.",
});
const L = (it, en) => Object.freeze({ it, en });
export const PAGE_TYPES = Object.freeze([
  "quest",
  "person",
  "organization",
  "shop",
  "place",
  "event",
  "checklist",
  "page",
]);
export const TYPE_LABELS = Object.freeze({
  quest: L("Missione", "Quest"),
  person: L("Persona", "Person"),
  organization: L("Organizzazione", "Organization"),
  shop: L("Negozio", "Shop"),
  place: L("Luogo", "Place"),
  event: L("Evento", "Event"),
  // Monk's Enhanced Journal Checklist (FVT-057): a list of items ticked off by the DM.
  checklist: L("Elenco", "Checklist"),
  page: L("Pagina", "Page"),
});
export const QUEST_STATUSES = Object.freeze([
  "active",
  "available",
  "completed",
  "failed",
  "hidden",
]);
export const STATUS_LABELS = Object.freeze({
  active: L("In corso", "In progress"),
  available: L("Disponibile", "Available"),
  completed: L("Completata", "Completed"),
  failed: L("Fallita", "Failed"),
  hidden: L("Nascosta", "Hidden"),
});
// Kanka Property Kits (CMP-27): named field sets added to a page; a secret field is the DM's
// (Kanka private attributes). Authored for the prototype, not a rule.
export const KITS = Object.freeze({
  tavern: {
    label: L("Taverna", "Tavern"),
    fields: [
      [L("Oste", "Innkeeper"), false],
      [L("Prezzo di una stanza", "Room price"), false],
      [L("Specialità della casa", "House special"), false],
      [L("Voci che girano", "Rumours"), true],
    ],
  },
  shop: {
    label: L("Negozio", "Shop"),
    fields: [
      [L("Proprietario", "Owner"), false],
      [L("Merce", "Wares"), false],
      [L("Orari", "Opening hours"), false],
      [L("Prezzi", "Prices"), false],
    ],
  },
  organization: {
    label: L("Organizzazione", "Organization"),
    fields: [
      [L("Sede", "Headquarters"), false],
      [L("Capo", "Leader"), false],
      [L("Obiettivo", "Goal"), false],
      [L("Simbolo", "Symbol"), false],
    ],
  },
  person: {
    label: L("Persona", "Person"),
    fields: [
      [L("Ruolo", "Role"), false],
      [L("Aspetto", "Appearance"), false],
      [L("Voce e modi", "Voice and manner"), false],
      [L("Desiderio", "Desire"), true],
    ],
  },
  place: {
    label: L("Luogo", "Place"),
    fields: [
      [L("Regione", "Region"), false],
      [L("Pericoli", "Dangers"), false],
      [L("Punti d’interesse", "Points of interest"), false],
    ],
  },
  event: {
    label: L("Evento", "Event"),
    fields: [
      [L("Quando", "When"), false],
      [L("Dove", "Where"), false],
      [L("Chi c’era", "Who was there"), false],
      [L("Cosa è successo davvero", "What really happened"), true],
    ],
  },
});
export const LIMITS = Object.freeze({
  title: 120,
  text: 4000,
  label: 80,
  value: 300,
  blocks: 30,
  properties: 30,
  objectives: 40,
  rewards: 20,
  updates: 200,
  note: 2000,
  viewName: 60,
  elements: 30,
  items: 60,
});
export const COLUMNS = Object.freeze([
  "title",
  "type",
  "status",
  "giver",
  "progress",
  "rewards",
  "parent",
  "updated",
]);
const NONE = Object.freeze({ mode: "none", actorIds: [] });
const ALL = Object.freeze({ mode: "all", actorIds: [] });
export const LINK_RE = /\[\[([^[\]\n]{1,120})\]\]/g;

const clone = (value) => structuredClone(value);
const now = () => new Date().toISOString();
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const str = (value) => (typeof value === "string" ? value : "");
const norm = (value) => str(value).trim().toLocaleLowerCase("it");
export const newId = (prefix) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`;

/** A refusal shown to the user in both languages (ctx.commit marks it as a refusal). */
export function fail(it, en) {
  throw Object.assign(new Error(it), { it, en });
}
const ownText = (value, max, it, en, { required = false } = {}) => {
  const result = str(value).trim();
  if (required && !result) fail(`${it}: campo obbligatorio.`, `${en}: required field.`);
  if (result.length > max)
    fail(`${it}: massimo ${max} caratteri.`, `${en}: at most ${max} characters.`);
  return result;
};

// ---------------------------------------------------------------------------------------
// Seed: the 'lanterns' campaign, coherent with the other areas (Maestro Oben, Tessa Varro,
// the lantern guild, the crypt, the goblins of the courtyard, the Weary Owl tavern).

// Sample stamps follow the visit (sample-clock.mjs), computed at seed time.
const sampleAt = () => sampleDate("2026-09-18T21:40:00.000Z");
const txt = (id, text) => ({ id, kind: "text", text });
const secret = (id, text) => ({
  id,
  kind: "secret",
  text,
  reveal: { mode: "none", actorIds: [] },
  revealedAt: null,
});
const prop = (id, label, value, isSecret = false) => ({ id, label, value, secret: isSecret });
function seedPage(id, type, title, extra = {}) {
  const page = {
    id,
    type,
    title,
    parentId: null,
    access: { mode: "all", actorIds: [] },
    blocks: [],
    properties: [],
    elements: [],
    important: false,
    createdAt: sampleDate("2026-09-15T18:00:00.000Z"),
    updatedAt: sampleAt(),
    createdBy: "dm",
    source: SOURCE,
  };
  if (type === "quest")
    Object.assign(page, {
      status: "available",
      giver: null,
      objectives: [],
      rewards: [],
      updates: [],
      dmNotes: "",
    });
  return Object.assign(page, extra);
}
const objective = (id, text, done = false, parentId = null, hidden = false) => ({
  id,
  text,
  done,
  parentId,
  hidden,
});
export function seedCampaign() {
  return {
    pages: [
      seedPage("quest-seal", "quest", "Il sigillo spezzato", {
        status: "active",
        giver: { kind: "page", id: "page-guild" },
        blocks: [
          txt(
            "seal-b1",
            "Nella cripta sotto l’osservatorio il gruppo ha trovato una lettera: il sigillo di cera è spezzato e lo stemma è consumato. Chi l’ha scritta sapeva della lanterna sulla torre.",
          ),
          secret(
            "seal-b2",
            "La lettera è di [[Tessa Varro]]: vuole che la torre resti al buio per comprarla dalla gilda.",
          ),
        ],
        objectives: [
          objective("o1", "Recuperare la lettera nella cripta", true),
          objective("o1a", "Evitare la lastra a pressione sul terzo gradino", true, "o1"),
          objective("o2", "Scoprire a chi appartiene lo stemma del sigillo"),
          objective("o2a", "Mostrare il sigillo a un mercante di Bruma", false, "o2"),
          objective("o2b", "Confrontarlo con i registri della gilda", false, "o2"),
          objective("o3", "Riferire alla gilda delle lanterne"),
          objective("o4", "Smascherare Tessa Varro davanti alla gilda", false, null, true),
        ],
        rewards: [
          {
            id: "r1",
            kind: "coins",
            text: "50 monete d’oro dalla gilda delle lanterne",
            quantity: 1,
            gp: 50,
            secret: false,
            deliveries: [],
          },
          {
            id: "r2",
            kind: "item",
            text: "Chiave d’ottone della torre",
            quantity: 1,
            gp: null,
            secret: true,
            deliveries: [],
          },
        ],
        updates: [
          {
            id: "u-seal-1",
            at: sampleDate("2026-09-18T21:30:00.000Z"),
            kind: "note",
            text: "Il gruppo ha trovato la lettera nella cripta.",
            visibility: "all",
          },
          {
            id: "u-seal-2",
            at: sampleDate("2026-09-18T21:35:00.000Z"),
            kind: "note",
            text: "Tessa sa che il gruppo ha la lettera.",
            visibility: "dm",
          },
        ],
        dmNotes: "Se il gruppo accusa Tessa senza prove, Casa Varro diventa ostile.",
        elements: [
          { kind: "scene", id: "old-watch" },
          { kind: "page", id: "page-observatory" },
        ],
      }),
      seedPage("quest-lantern", "quest", "La lanterna riaccesa", {
        status: "active",
        giver: { kind: "page", id: "page-guild" },
        blocks: [
          txt(
            "lantern-b1",
            "Qualcuno ha riacceso la lanterna sulla torre dell’osservatorio, chiusa da mesi.",
          ),
        ],
        objectives: [
          objective("l1", "Entrare nella torre"),
          objective("l1a", "Trovare la chiave della torre", false, "l1"),
          objective("l2", "Scoprire chi ha riacceso la lanterna"),
        ],
        rewards: [
          {
            id: "lr1",
            kind: "other",
            text: "Il favore della gilda delle lanterne",
            quantity: 1,
            gp: null,
            secret: false,
            deliveries: [],
          },
        ],
        updates: [
          {
            id: "u-lantern-1",
            at: sampleDate("2026-09-17T22:10:00.000Z"),
            kind: "note",
            text: "Dal cortile il gruppo ha visto la luce accendersi in cima alla torre.",
            visibility: "all",
          },
        ],
        elements: [{ kind: "entry", id: "legacy-recap-summary" }],
      }),
      seedPage("quest-wagon", "quest", "Il carro rovesciato", {
        status: "completed",
        blocks: [txt("wagon-b1", "Un mercante d’olio bloccato sulla strada per l’osservatorio.")],
        objectives: [objective("w1", "Aiutare il mercante a rialzare il carro", true)],
        updates: [
          {
            id: "u-wagon-1",
            at: sampleDate("2026-09-17T21:00:00.000Z"),
            kind: "status",
            text: "Il gruppo ha aiutato il mercante e riportato l’olio alla gilda.",
            visibility: "all",
          },
        ],
      }),
      seedPage("quest-mimic", "quest", "Il forziere che morde", {
        status: "hidden",
        blocks: [txt("mimic-b1", "Un mimic sorveglia la cripta, travestito da forziere.")],
        objectives: [objective("m1", "Sopravvivere al forziere")],
      }),
      seedPage("page-guild", "organization", "Gilda delle lanterne", {
        properties: [
          prop("guild-p1", L("Sede", "Headquarters"), "Torre dell’osservatorio"),
          prop("guild-p2", L("Capo", "Leader"), "[[Maestro Oben]] (scomparso)"),
          prop("guild-p3", L("Obiettivo", "Goal"), "Tenere accese le lanterne di Bruma"),
          prop("guild-p4", L("Simbolo", "Symbol"), "Una lanterna d’ottone"),
        ],
        blocks: [
          txt(
            "guild-b1",
            "Custodisce le lanterne di Bruma da tre generazioni. [[Maestro Oben]] ne è il custode.",
          ),
          secret("guild-b2", "La gilda è piena di debiti: qualcuno li ha comprati in segreto."),
        ],
      }),
      seedPage("page-varro", "organization", "Casa Varro", {
        properties: [
          prop("varro-p1", L("Sede", "Headquarters"), "Palazzo sul porto di Bruma"),
          prop("varro-p2", L("Capo", "Leader"), "[[Tessa Varro]]"),
          prop("varro-p3", L("Obiettivo", "Goal"), "Controllare il commercio dell’olio"),
          prop("varro-p4", L("Simbolo", "Symbol"), "Una goccia d’olio su campo rosso"),
        ],
        blocks: [
          txt("varro-b1", "Mercanti d’olio di Bruma: riforniscono le lanterne della città."),
        ],
      }),
      seedPage("page-tessa", "person", "Tessa Varro", {
        parentId: "page-varro",
        important: true,
        properties: [
          prop("tessa-p1", L("Ruolo", "Role"), "Erede di Casa Varro, mercante d’olio"),
          prop(
            "tessa-p2",
            L("Aspetto", "Appearance"),
            "Guanti di pelle, un anello con il sigillo di famiglia",
          ),
          prop("tessa-p3", L("Voce e modi", "Voice and manner"), "Sorride troppo"),
          prop("tessa-p4", L("Desiderio", "Desire"), "Comprare la torre dell’osservatorio", true),
        ],
        blocks: [
          txt(
            "tessa-b1",
            "Tratta l’olio delle lanterne con tutta Bruma e conosce ogni custode per nome.",
          ),
          secret("tessa-b2", "Ha scritto la lettera trovata nella cripta."),
        ],
      }),
      seedPage("page-oben", "person", "Maestro Oben", {
        parentId: "page-guild",
        important: true,
        properties: [
          prop("oben-p1", L("Ruolo", "Role"), "Custode della torre, maestro d’armi di Doran"),
          prop("oben-p2", L("Voce e modi", "Voice and manner"), "Parla per enigmi"),
        ],
        blocks: [
          txt("oben-b1", "Ha affisso l’avviso della gilda un mese fa, poi è scomparso."),
          secret(
            "oben-b2",
            "È prigioniero nella torre: la lanterna l’ha riaccesa lui per chiedere aiuto.",
          ),
        ],
      }),
      seedPage("page-observatory", "place", "Il vecchio osservatorio", {
        properties: [
          prop("obs-p1", L("Regione", "Region"), "Colline a nord di Bruma"),
          prop(
            "obs-p2",
            L("Pericoli", "Dangers"),
            "Goblin nel cortile, una cripta sotto il cortile",
          ),
        ],
        blocks: [
          txt(
            "obs-b1",
            "Torre e cortile ai margini di Bruma. [[Maestro Oben]] vi custodiva la lanterna. L’olio arriva da Casa Varro. Dopo la cripta il gruppo ha dormito alla Taverna del Gufo Stanco.",
          ),
        ],
        elements: [{ kind: "scene", id: "old-watch" }],
      }),
      seedPage("page-goblins", "organization", "Goblin del cortile", {
        blocks: [txt("gob-b1", "Una banda di goblin fa la guardia al cortile dell’osservatorio.")],
        elements: [
          { kind: "actor", id: "goblin-1" },
          { kind: "actor", id: "goblin-2" },
        ],
      }),
      seedPage("page-tower-prep", "checklist", "Preparativi per la torre", {
        parentId: "page-observatory",
        items: [
          { id: "prep-1", text: "Corde e rampini per il muro del cortile", done: true },
          { id: "prep-2", text: "Olio per le lanterne da [[Casa Varro]]", done: false },
          {
            id: "prep-3",
            text: "Chiedere alla [[Gilda delle lanterne]] la pianta della torre",
            done: false,
          },
        ],
      }),
    ],
    standings: [
      {
        id: "st-guild-party",
        targetId: "page-guild",
        subject: "party",
        kind: "reputation",
        value: 3,
        visibility: "full",
        history: [
          {
            id: "h-guild-1",
            at: sampleDate("2026-09-17T22:30:00.000Z"),
            by: "dm",
            from: 0,
            to: 2,
            reason: "Il gruppo ha riportato alla gilda l’olio del carro rovesciato.",
          },
          {
            id: "h-guild-2",
            at: sampleDate("2026-09-18T21:50:00.000Z"),
            by: "dm",
            from: 2,
            to: 3,
            reason: "Doran ha giurato di ritrovare Maestro Oben.",
          },
        ],
      },
      {
        id: "st-varro-party",
        targetId: "page-varro",
        subject: "party",
        kind: "reputation",
        value: 0,
        visibility: "tier",
        history: [],
      },
      {
        id: "st-tessa-party",
        targetId: "page-tessa",
        subject: "party",
        kind: "attitude",
        value: "indifferent",
        visibility: "full",
        history: [],
      },
      {
        id: "st-oben-party",
        targetId: "page-oben",
        subject: "party",
        kind: "attitude",
        value: "friendly",
        visibility: "full",
        history: [
          {
            id: "h-oben-1",
            at: sampleDate("2026-09-15T20:00:00.000Z"),
            by: "dm",
            from: "indifferent",
            to: "friendly",
            reason: "Doran è stato suo allievo.",
          },
        ],
      },
    ],
    relations: [
      {
        id: "rel-tessa-varro",
        from: { kind: "page", id: "page-tessa" },
        to: { kind: "page", id: "page-varro" },
        label: L("fa parte di", "is part of"),
        secret: false,
        reveal: { mode: "none", actorIds: [] },
      },
      {
        id: "rel-oben-guild",
        from: { kind: "page", id: "page-oben" },
        to: { kind: "page", id: "page-guild" },
        label: L("custode della", "keeper of"),
        secret: false,
        reveal: { mode: "none", actorIds: [] },
      },
      {
        id: "rel-oben-doran",
        from: { kind: "page", id: "page-oben" },
        to: { kind: "actor", id: "doran" },
        label: L("maestro d’armi di", "weapons master of"),
        secret: false,
        reveal: { mode: "none", actorIds: [] },
      },
      {
        id: "rel-tessa-goblins",
        from: { kind: "page", id: "page-tessa" },
        to: { kind: "page", id: "page-goblins" },
        label: L("paga in segreto", "secretly pays"),
        secret: true,
        reveal: { mode: "none", actorIds: [] },
      },
      {
        id: "rel-varro-guild",
        from: { kind: "page", id: "page-varro" },
        to: { kind: "page", id: "page-guild" },
        label: L("ha comprato i debiti della", "bought the debts of"),
        secret: true,
        reveal: { mode: "none", actorIds: [] },
      },
    ],
    views: [
      {
        id: "view-open-quests",
        name: L("Missioni aperte", "Open quests"),
        owner: "dm",
        shared: true,
        source: "quest",
        statuses: ["active", "available"],
        layout: "table",
        columns: ["title", "status", "giver", "progress", "rewards", "updated"],
        sort: "updated",
      },
    ],
    notes: {},
    dismissed: [],
  };
}
export function seedQuests() {
  return { campaigns: { lanterns: seedCampaign() } };
}
export const emptyData = () => ({
  pages: [],
  standings: [],
  relations: [],
  views: [],
  notes: {},
  dismissed: [],
});

// ---------------------------------------------------------------------------------------
// Normalize: keep valid records, drop malformed ones; a newer version is refused.

const recipientsOf = (value) => ({
  mode: ["none", "all", "some"].includes(value?.mode) ? value.mode : "none",
  actorIds: Array.isArray(value?.actorIds)
    ? value.actorIds.filter((id) => typeof id === "string")
    : [],
});
const validLabel = (value) =>
  typeof value === "string" ||
  (isObject(value) && typeof value.it === "string" && typeof value.en === "string");
const validRef = (value) =>
  isObject(value) &&
  ["page", "actor", "scene", "entry"].includes(value.kind) &&
  typeof value.id === "string";
const objects = (value) => (Array.isArray(value) ? value.filter(isObject) : []);
function normalizePage(raw) {
  if (
    !isObject(raw) ||
    typeof raw.id !== "string" ||
    !PAGE_TYPES.includes(raw.type) ||
    typeof raw.title !== "string"
  )
    return null;
  const page = {
    ...raw,
    parentId: typeof raw.parentId === "string" ? raw.parentId : null,
    access: recipientsOf(raw.access),
    blocks: objects(raw.blocks)
      .filter((b) => typeof b.id === "string" && ["text", "secret"].includes(b.kind))
      .map((b) =>
        b.kind === "secret"
          ? {
              ...b,
              text: str(b.text),
              reveal: recipientsOf(b.reveal),
              revealedAt: b.revealedAt ?? null,
            }
          : { id: b.id, kind: "text", text: str(b.text) },
      ),
    properties: objects(raw.properties)
      .filter((p) => typeof p.id === "string" && validLabel(p.label))
      .map((p) => ({ ...p, value: str(p.value), secret: p.secret === true })),
    elements: objects(raw.elements).filter(validRef),
    important: raw.important === true,
  };
  if (page.type === "quest") {
    page.status = QUEST_STATUSES.includes(raw.status) ? raw.status : "hidden";
    page.giver = validRef(raw.giver) ? raw.giver : null;
    page.objectives = objects(raw.objectives)
      .filter((o) => typeof o.id === "string")
      .map((o) => ({
        ...o,
        text: str(o.text),
        done: o.done === true,
        hidden: o.hidden === true,
        parentId: typeof o.parentId === "string" ? o.parentId : null,
      }));
    page.rewards = objects(raw.rewards)
      .filter((r) => typeof r.id === "string" && ["item", "coins", "other"].includes(r.kind))
      .map((r) => ({ ...r, secret: r.secret === true, deliveries: objects(r.deliveries) }));
    page.updates = objects(raw.updates).filter((u) => typeof u.id === "string");
    page.dmNotes = str(raw.dmNotes);
  }
  if (page.type === "checklist")
    page.items = objects(raw.items)
      .filter((item) => typeof item.id === "string" && typeof item.text === "string")
      .map((item) => ({ id: item.id, text: item.text, done: item.done === true }));
  return page;
}
function normalizeCampaign(raw) {
  const value = isObject(raw) ? raw : {};
  return {
    pages: (Array.isArray(value.pages) ? value.pages : []).map(normalizePage).filter(Boolean),
    standings: objects(value.standings).filter(
      (s) =>
        typeof s.id === "string" &&
        typeof s.targetId === "string" &&
        typeof s.subject === "string" &&
        ["reputation", "attitude"].includes(s.kind),
    ),
    relations: objects(value.relations)
      .filter((r) => typeof r.id === "string" && validRef(r.from) && validRef(r.to))
      .map((r) => ({ ...r, secret: r.secret === true, reveal: recipientsOf(r.reveal) })),
    views: objects(value.views).filter((v) => typeof v.id === "string"),
    notes: isObject(value.notes) ? value.notes : {},
    dismissed: objects(value.dismissed).filter(
      (d) => typeof d.sourceId === "string" && typeof d.targetId === "string",
    ),
  };
}
export function normalizeQuests(slice, fromVersion) {
  if (fromVersion > VERSION) throw Error("Saved quests and archive come from a newer version");
  const campaigns = isObject(slice?.campaigns) ? slice.campaigns : {};
  return {
    campaigns: Object.fromEntries(
      Object.entries(campaigns).map(([id, value]) => [id, normalizeCampaign(value)]),
    ),
  };
}

// ---------------------------------------------------------------------------------------
// Identities, audiences and projections

const EMPTY = Object.freeze(emptyData());
/** The archive of the campaign in play (read only; empty when none). */
export function dataOf(state, campaignId = state?.campaign?.id) {
  return state?.ext?.[SLICE]?.campaigns?.[campaignId] ?? EMPTY;
}
/** The mutable archive inside a commit draft, created on the first write. */
export function mutableData(state) {
  const slice = state?.ext?.[SLICE];
  if (!slice) fail("Archivio non disponibile.", "Archive unavailable.");
  const campaignId = state.campaign?.id;
  if (!campaignId) fail("Nessuna campagna in gioco.", "No campaign in play.");
  slice.campaigns ??= {};
  return (slice.campaigns[campaignId] ??= emptyData());
}
export function isMember(state, role) {
  return isCampaignMember(state, state?.campaign?.id, role);
}
export function isDM(state, role) {
  const member = campaignMembers(state).find((row) => row.id === role);
  return Boolean(member) && ["dm", "co-dm"].includes(member.role);
}
export function requireDM(state, role) {
  if (!isDM(state, role))
    fail(
      "Solo il DM può modificare missioni, archivio e reputazione.",
      "Only the DM can change quests, archive and reputation.",
    );
}
/** Party characters that can be named as recipients (like B15 handouts). */
export function partyCharacters(state) {
  const campaignId = state.campaign?.id;
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor?.kind === "character" &&
      !actor.companion &&
      isActorAvailable(actor) &&
      actor.visibility !== "private" &&
      isCampaignActor(actor, campaignId),
  );
}
/** Whether a recipients rule (none/all/some characters) reaches this identity. */
export function reaches(state, recipients, role) {
  if (isDM(state, role)) return true;
  if (!recipients || !isMember(state, role)) return false;
  if (recipients.mode === "all") return true;
  if (recipients.mode === "some")
    return recipients.actorIds.some((id) => canControlActor(state.actors?.[id], role, state));
  return false;
}
export function normalizeRecipients(state, input, { allowNone = true } = {}) {
  const mode = input?.mode;
  if (mode === "none" && allowNone) return { mode: "none", actorIds: [] };
  if (mode === "all") return { mode: "all", actorIds: [] };
  if (mode !== "some") fail("Scegli chi può leggere.", "Choose who can read.");
  const ids = [...new Set(Array.isArray(input.actorIds) ? input.actorIds : [])];
  if (!ids.length)
    fail("Scegli almeno un personaggio destinatario.", "Choose at least one recipient character.");
  const party = partyCharacters(state).map((actor) => actor.id);
  if (ids.some((id) => !party.includes(id)))
    fail(
      "Destinatario non valido: non fa parte del gruppo.",
      "Invalid recipient: not in the party.",
    );
  return { mode: "some", actorIds: ids };
}
export function findPage(state, id) {
  return dataOf(state).pages.find((page) => page.id === id) ?? null;
}
function pageIn(data, id) {
  return (
    data.pages.find((page) => page.id === id) ?? fail("Pagina non trovata.", "Page not found.")
  );
}
export function canReadPage(state, page, role) {
  if (!page) return false;
  if (isDM(state, role)) return true;
  if (!isMember(state, role)) return false;
  if (page.type === "quest" && page.status === "hidden") return false;
  return reaches(state, page.access, role);
}
/** Whether a reference (page, actor, scene, core entry) is readable by this identity. */
export function refReadable(state, ref, role) {
  if (!validRef(ref)) return false;
  if (ref.kind === "page") return canReadPage(state, findPage(state, ref.id), role);
  if (ref.kind === "actor") return canViewActor(state.actors?.[ref.id], role, state);
  return resolveCampaignLinks(state, [ref], role).length > 0;
}
/** Label and core route of a readable reference, or null. */
export function refInfo(state, ref, role) {
  if (!refReadable(state, ref, role)) return null;
  if (ref.kind === "page") {
    const page = findPage(state, ref.id);
    return { ...ref, label: page.title, type: page.type };
  }
  if (ref.kind === "actor") {
    const actor = state.actors[ref.id];
    return { ...ref, label: actor.name, route: { page: "characters", id: actor.id } };
  }
  const [link] = resolveCampaignLinks(state, [ref], role);
  return { ...ref, label: link.label, route: link.route };
}
const visibleObjectives = (page) => {
  const hidden = new Set(page.objectives.filter((o) => o.hidden).map((o) => o.id));
  return page.objectives.filter((o) => !o.hidden && !hidden.has(o.parentId));
};
/** The page as this identity may read it, or null. Secrets are removed, never masked. */
export function projectPage(state, page, role) {
  if (!canReadPage(state, page, role)) return null;
  const dm = isDM(state, role);
  const parent = page.parentId ? findPage(state, page.parentId) : null;
  const out = {
    id: page.id,
    type: page.type,
    title: page.title,
    parentId: parent && canReadPage(state, parent, role) ? parent.id : null,
    // "Important NPC" is the DM's prep flag (dnd5e FVT-091 lives on the NPC sheet players
    // never open): players read shared attitudes, never which NPCs the DM marked.
    important: dm && page.important === true,
    createdAt: page.createdAt ?? null,
    updatedAt: page.updatedAt ?? null,
    blocks: page.blocks
      .filter((b) => b.kind === "text" || reaches(state, b.reveal, role))
      .map((b) =>
        b.kind === "text"
          ? { id: b.id, kind: "text", text: b.text }
          : dm
            ? { ...clone(b), revealed: b.reveal.mode !== "none" }
            : { id: b.id, kind: "secret", text: b.text, revealed: true },
      ),
    properties: page.properties.filter((p) => dm || !p.secret).map(clone),
    elements: page.elements.filter((ref) => refReadable(state, ref, role)).map(clone),
  };
  if (dm) out.access = clone(page.access);
  if (page.type === "quest") {
    out.status = page.status;
    out.giver = page.giver && refReadable(state, page.giver, role) ? clone(page.giver) : null;
    out.objectives = (dm ? page.objectives : visibleObjectives(page)).map(clone);
    out.rewards = page.rewards.filter((r) => dm || !r.secret).map(clone);
    out.updates = page.updates
      .filter((u) => dm || u.visibility !== "dm")
      .map(clone)
      .sort((a, b) => str(b.at).localeCompare(str(a.at)));
    if (dm) out.dmNotes = page.dmNotes;
  }
  if (page.type === "checklist") out.items = (page.items ?? []).map(clone);
  return out;
}
export function readPage(state, id, role) {
  return projectPage(state, findPage(state, id), role);
}
/** Readable text pieces of a projected page (blocks, then property values). */
export function textPieces(projected) {
  return [
    ...projected.blocks.map((b) => ({ blockId: b.id, text: b.text })),
    ...projected.properties.map((p) => ({ propertyId: p.id, text: p.value })),
    ...(projected.items ?? []).map((item) => ({ itemId: item.id, text: item.text })),
  ];
}
export function listPages(state, role, { type, query } = {}) {
  const q = norm(query);
  return dataOf(state)
    .pages.map((page) => projectPage(state, page, role))
    .filter(
      (page) =>
        page &&
        (!type || page.type === type) &&
        (!q ||
          [page.title, ...textPieces(page).map((piece) => piece.text)]
            .join(" ")
            .toLocaleLowerCase("it")
            .includes(q)),
    )
    .sort((a, b) => a.title.localeCompare(b.title, "it"));
}
export function questProgress(projected) {
  const list = projected?.objectives ?? [];
  return { done: list.filter((o) => o.done).length, total: list.length };
}

// ---------------------------------------------------------------------------------------
// Links, backlinks and unlinked mentions (Obsidian CMP-88; LegendKeeper CMP-59)

export function resolveTitle(state, title, role) {
  const key = norm(title);
  if (!key) return null;
  const page = dataOf(state).pages.find((row) => norm(row.title) === key);
  return page && canReadPage(state, page, role)
    ? { id: page.id, title: page.title, type: page.type }
    : null;
}
/** Text with [[Title]] shown as Title, for plain-text places (dialogs, suggestions). */
export const plainText = (text) => str(text).replace(LINK_RE, (_, title) => title.trim());
const snippet = (text, index, length) => {
  let start = Math.max(0, index - 70);
  let end = Math.min(text.length, index + length + 70);
  // Never cut a [[link]] in half: widen to its brackets.
  for (const match of text.matchAll(LINK_RE)) {
    const from = match.index,
      to = match.index + match[0].length;
    if (start > from && start < to) start = from;
    if (end > from && end < to) end = to;
  }
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
};
/** Readable pages that link here, with the readable context of each link. */
export function backlinks(state, targetId, role) {
  const target = findPage(state, targetId);
  if (!canReadPage(state, target, role)) return [];
  const key = norm(target.title);
  return listPages(state, role).flatMap((page) => {
    if (page.id === targetId) return [];
    const snippets = [];
    for (const piece of textPieces(page))
      for (const match of piece.text.matchAll(LINK_RE))
        if (norm(match[1]) === key)
          snippets.push(snippet(piece.text, match.index, match[0].length));
    const byRef =
      page.elements.some((ref) => ref.kind === "page" && ref.id === targetId) ||
      (page.giver?.kind === "page" && page.giver.id === targetId);
    return snippets.length || byRef
      ? [{ id: page.id, title: page.title, type: page.type, snippets }]
      : [];
  });
}
const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mask = (text) => text.replace(LINK_RE, (match) => " ".repeat(match.length));
function mentionIndex(text, title) {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(title.trim())}(?![\\p{L}\\p{N}])`, "iu");
  const match = re.exec(mask(text));
  return match ? { index: match.index, length: match[0].length } : null;
}
const dismissed = (data, sourceId, targetId) =>
  data.dismissed.some((row) => row.sourceId === sourceId && row.targetId === targetId);
/** Pages mentioning this page's title without a link: suggestions for the DM only. */
export function unlinkedMentions(state, targetId, role) {
  if (!isDM(state, role)) return [];
  const data = dataOf(state);
  const target = findPage(state, targetId);
  if (!target || target.title.trim().length < 3) return [];
  return data.pages.flatMap((page) => {
    if (page.id === targetId || dismissed(data, page.id, targetId)) return [];
    for (const block of page.blocks) {
      const hit = mentionIndex(block.text, target.title);
      if (hit)
        return [
          {
            sourceId: page.id,
            sourceTitle: page.title,
            blockId: block.id,
            snippet: snippet(block.text, hit.index, hit.length),
          },
        ];
    }
    return [];
  });
}
export function linkMention(state, role, { sourceId, blockId, targetId }) {
  requireDM(state, role);
  const data = mutableData(state);
  const source = pageIn(data, sourceId);
  const target = pageIn(data, targetId);
  const block =
    source.blocks.find((b) => b.id === blockId) ?? fail("Blocco non trovato.", "Block not found.");
  const hit = mentionIndex(block.text, target.title);
  if (!hit) fail("La menzione non c’è più.", "The mention is no longer there.");
  block.text =
    block.text.slice(0, hit.index) +
    `[[${target.title}]]` +
    block.text.slice(hit.index + hit.length);
  source.updatedAt = now();
}
export function dismissMention(state, role, { sourceId, targetId }) {
  requireDM(state, role);
  const data = mutableData(state);
  pageIn(data, sourceId);
  pageIn(data, targetId);
  if (!dismissed(data, sourceId, targetId)) data.dismissed.push({ sourceId, targetId });
}

// ---------------------------------------------------------------------------------------
// Authoring (DM): pages, kits, blocks, nesting

const cleanTitle = (value) => ownText(value, LIMITS.title, "Titolo", "Title", { required: true });
function uniqueTitle(data, title, exceptId = null) {
  if (data.pages.some((page) => page.id !== exceptId && norm(page.title) === norm(title)))
    fail(
      `Esiste già una pagina «${title}»: i collegamenti [[nome]] richiedono titoli unici.`,
      `A page “${title}” already exists: [[name]] links need unique titles.`,
    );
}
function validParent(data, parentId, selfId) {
  if (!parentId) return null;
  pageIn(data, parentId);
  for (let id = parentId, guard = 0; id; guard++) {
    if (id === selfId || guard > 50)
      fail(
        "Una pagina non può stare dentro sé stessa o una sua pagina annidata.",
        "A page cannot sit inside itself or one of its nested pages.",
      );
    id = data.pages.find((page) => page.id === id)?.parentId ?? null;
  }
  return parentId;
}
function checkRef(state, ref) {
  if (ref == null) return null;
  if (!validRef(ref)) fail("Collegamento non valido.", "Invalid link.");
  const exists =
    ref.kind === "page"
      ? Boolean(findPage(state, ref.id))
      : ref.kind === "actor"
        ? Boolean(state.actors?.[ref.id])
        : resolveCampaignLinks(state, [ref], "dm").length > 0;
  if (!exists) fail("Il collegamento non esiste più.", "The link no longer exists.");
  return { kind: ref.kind, id: ref.id };
}
/** Adds the fields of a kit that the list does not have yet (Kanka Property Kits). */
export function applyKit(properties, kitId) {
  const kit = KITS[kitId] ?? fail("Kit di proprietà sconosciuto.", "Unknown property kit.");
  const has = new Set(
    properties.map((p) => norm(typeof p.label === "string" ? p.label : p.label.it)),
  );
  return [
    ...properties,
    ...kit.fields
      .filter(([label]) => !has.has(norm(label.it)))
      .map(([label, isSecret]) => ({
        id: newId("prop"),
        label: { ...label },
        value: "",
        secret: isSecret === true,
        kit: kitId,
      })),
  ];
}
function cleanBlocks(page, blocks) {
  if (!Array.isArray(blocks) || blocks.length > LIMITS.blocks)
    fail(`Massimo ${LIMITS.blocks} blocchi.`, `At most ${LIMITS.blocks} blocks.`);
  const ids = new Set();
  return blocks.map((input) => {
    const kind = input?.kind === "secret" ? "secret" : "text";
    const text = ownText(input?.text, LIMITS.text, "Testo", "Text");
    let id = typeof input?.id === "string" && input.id ? input.id : newId("block");
    if (ids.has(id)) id = newId("block");
    ids.add(id);
    if (kind === "text") return { id, kind, text };
    const previous = page?.blocks.find((b) => b.id === id && b.kind === "secret");
    return {
      id,
      kind,
      text,
      reveal: previous ? clone(previous.reveal) : { mode: "none", actorIds: [] },
      revealedAt: previous?.revealedAt ?? null,
    };
  });
}
function cleanProperties(properties) {
  if (!Array.isArray(properties) || properties.length > LIMITS.properties)
    fail(`Massimo ${LIMITS.properties} proprietà.`, `At most ${LIMITS.properties} properties.`);
  return properties
    .map((input) => {
      const label =
        isObject(input?.label) && validLabel(input.label)
          ? { it: input.label.it, en: input.label.en }
          : ownText(input?.label, LIMITS.label, "Nome della proprietà", "Property name");
      return {
        id: typeof input?.id === "string" && input.id ? input.id : newId("prop"),
        label,
        value: ownText(input?.value, LIMITS.value, "Valore", "Value"),
        secret: input?.secret === true,
        ...(input?.kit ? { kit: input.kit } : {}),
      };
    })
    .filter((p) => (typeof p.label === "string" ? p.label : p.label.it).trim() || p.value);
}
export function createPage(state, role, input = {}) {
  requireDM(state, role);
  const data = mutableData(state);
  if (!PAGE_TYPES.includes(input.type)) fail("Tipo di pagina non valido.", "Invalid page type.");
  const title = cleanTitle(input.title);
  uniqueTitle(data, title);
  const at = now();
  const page = {
    id: newId(input.type === "quest" ? "quest" : "page"),
    type: input.type,
    title,
    parentId: validParent(data, input.parentId ?? null, null),
    access: normalizeRecipients(state, input.access ?? (input.type === "quest" ? ALL : NONE)),
    blocks: cleanBlocks(
      null,
      input.blocks ??
        (input.text
          ? [{ kind: "text", text: input.text }]
          : input.template
            ? [
                ...(input.template.body ? [{ kind: "text", text: input.template.body }] : []),
                ...(input.template.sections ?? []).map((section) => ({
                  kind: section.secret ? "secret" : "text",
                  text: [section.title, section.body].filter(Boolean).join("\n"),
                })),
              ].filter((block) => block.text)
            : []),
    ),
    // P9 CA-17: a saved template (its fields and text) or a built-in kit.
    properties: input.kitId
      ? applyKit([], input.kitId)
      : (input.template?.fields ?? []).slice(0, LIMITS.properties).map((field) => ({
          id: newId("prop"),
          label: str(field.label).slice(0, LIMITS.label),
          value: "",
          secret: field.secret === true,
        })),
    elements: [],
    important: input.type === "person" && input.important === true,
    createdAt: at,
    updatedAt: at,
    createdBy: role,
  };
  if (input.type === "quest")
    Object.assign(page, {
      status: QUEST_STATUSES.includes(input.status) ? input.status : "hidden",
      giver: checkRef(state, input.giver ?? null),
      objectives: [],
      rewards: [],
      updates: [],
      dmNotes: "",
    });
  if (input.type === "checklist") page.items = [];
  data.pages.push(page);
  return page.id;
}
function renameLinks(data, before, after) {
  const key = norm(before);
  const replace = (text) =>
    text.replace(LINK_RE, (match, title) => (norm(title) === key ? `[[${after}]]` : match));
  for (const page of data.pages) {
    for (const block of page.blocks) block.text = replace(block.text);
    for (const property of page.properties) property.value = replace(property.value);
    for (const item of page.items ?? []) item.text = replace(item.text);
  }
}
export function updatePage(state, role, pageId, patch = {}) {
  requireDM(state, role);
  const data = mutableData(state);
  const page = pageIn(data, pageId);
  if (patch.title !== undefined) {
    const title = cleanTitle(patch.title);
    if (title !== page.title) {
      uniqueTitle(data, title, page.id);
      renameLinks(data, page.title, title);
      page.title = title;
    }
  }
  if (patch.type !== undefined && patch.type !== page.type) {
    if (!PAGE_TYPES.includes(patch.type) || patch.type === "quest" || page.type === "quest")
      fail(
        "Una missione resta una missione: crea una nuova pagina per cambiare tipo.",
        "A quest stays a quest: create a new page to change type.",
      );
    page.type = patch.type;
    if (page.type === "checklist") page.items ??= [];
  }
  if (patch.parentId !== undefined) page.parentId = validParent(data, patch.parentId, page.id);
  if (patch.access !== undefined) page.access = normalizeRecipients(state, patch.access);
  if (patch.blocks !== undefined) page.blocks = cleanBlocks(page, patch.blocks);
  if (patch.properties !== undefined) page.properties = cleanProperties(patch.properties);
  if (patch.important !== undefined) page.important = page.type === "person" && patch.important;
  if (patch.elements !== undefined) {
    if (!Array.isArray(patch.elements) || patch.elements.length > LIMITS.elements)
      fail("Troppi elementi collegati.", "Too many linked elements.");
    const seen = new Set();
    page.elements = patch.elements
      .map((ref) => checkRef(state, ref))
      .filter((ref) => {
        const key = ref.kind + ":" + ref.id;
        if (seen.has(key) || (ref.kind === "page" && ref.id === page.id)) return false;
        seen.add(key);
        return true;
      });
  }
  if (patch.giver !== undefined && page.type === "quest") page.giver = checkRef(state, patch.giver);
  page.updatedAt = now();
}
export function deletePage(state, role, pageId) {
  requireDM(state, role);
  const data = mutableData(state);
  const page = pageIn(data, pageId);
  data.pages = data.pages.filter((row) => row.id !== pageId);
  for (const row of data.pages) {
    if (row.parentId === pageId) row.parentId = page.parentId ?? null;
    row.elements = row.elements.filter((ref) => !(ref.kind === "page" && ref.id === pageId));
    if (row.giver?.kind === "page" && row.giver.id === pageId) row.giver = null;
  }
  data.relations = data.relations.filter(
    (rel) => ![rel.from, rel.to].some((ref) => ref.kind === "page" && ref.id === pageId),
  );
  data.standings = data.standings.filter((row) => row.targetId !== pageId);
  data.dismissed = data.dismissed.filter(
    (row) => row.sourceId !== pageId && row.targetId !== pageId,
  );
}
/** A nested page from a [[link]]: the parent's readers unless the DM chose others. */
export function createChildFromLink(state, role, { parentId, title, type = "page", access }) {
  requireDM(state, role);
  const parent = pageIn(mutableData(state), parentId);
  return createPage(state, role, {
    type: type === "quest" ? "page" : type,
    title,
    parentId,
    access: access ?? parent.access,
  });
}
/** LegendKeeper Cut-to-New-Page: the selection becomes a nested page, replaced by a link. */
export function moveSelectionToNewPage(state, role, { pageId, blockId, start, end, title }) {
  requireDM(state, role);
  const data = mutableData(state);
  const page = pageIn(data, pageId);
  const block =
    page.blocks.find((b) => b.id === blockId) ?? fail("Blocco non trovato.", "Block not found.");
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end > block.text.length ||
    start >= end ||
    !block.text.slice(start, end).trim()
  )
    fail("Seleziona prima del testo nel blocco.", "Select some text in the block first.");
  const name = cleanTitle(title);
  const id = createPage(state, role, {
    type: "page",
    title: name,
    parentId: page.id,
    // Text moved out of a secret block stays with the DM.
    access: block.kind === "secret" ? NONE : page.access,
    text: block.text.slice(start, end).trim(),
  });
  block.text = block.text.slice(0, start) + `[[${name}]]` + block.text.slice(end);
  page.updatedAt = now();
  return id;
}
export function revealBlock(state, role, pageId, blockId, recipients) {
  requireDM(state, role);
  const page = pageIn(mutableData(state), pageId);
  const block = page.blocks.find((b) => b.id === blockId && b.kind === "secret");
  if (!block) fail("Blocco segreto non trovato.", "Secret block not found.");
  block.reveal = normalizeRecipients(state, recipients, { allowNone: false });
  block.revealedAt = now();
}
export function hideBlock(state, role, pageId, blockId) {
  requireDM(state, role);
  const page = pageIn(mutableData(state), pageId);
  const block = page.blocks.find((b) => b.id === blockId && b.kind === "secret");
  if (!block) fail("Blocco segreto non trovato.", "Secret block not found.");
  block.reveal = { mode: "none", actorIds: [] };
  block.revealedAt = null;
}
// Checklist items (Monk's Checklist, FVT-057): the DM adds, ticks and removes them.
function checklistIn(state, role, pageId) {
  requireDM(state, role);
  const page = pageIn(mutableData(state), pageId);
  if (page.type !== "checklist")
    fail("Questa pagina non è un elenco.", "This page is not a checklist.");
  page.items ??= [];
  return page;
}
function itemIn(page, itemId) {
  return (
    page.items.find((item) => item.id === itemId) ??
    fail("Voce dell’elenco non trovata.", "Checklist item not found.")
  );
}
export function addChecklistItem(state, role, pageId, text) {
  const page = checklistIn(state, role, pageId);
  const value = ownText(text, LIMITS.value, "Voce dell’elenco", "Checklist item", {
    required: true,
  });
  if (page.items.length >= LIMITS.items)
    fail(`Massimo ${LIMITS.items} voci.`, `At most ${LIMITS.items} items.`);
  const id = newId("item");
  page.items.push({ id, text: value, done: false });
  page.updatedAt = now();
  return id;
}
export function toggleChecklistItem(state, role, pageId, itemId, done) {
  const page = checklistIn(state, role, pageId);
  itemIn(page, itemId).done = done === true;
  page.updatedAt = now();
}
export function removeChecklistItem(state, role, pageId, itemId) {
  const page = checklistIn(state, role, pageId);
  itemIn(page, itemId);
  page.items = page.items.filter((item) => item.id !== itemId);
  page.updatedAt = now();
}
export function children(state, pageId, role) {
  return listPages(state, role).filter((page) => page.parentId === pageId);
}
export function ancestors(state, pageId, role) {
  const chain = [];
  let page = readPage(state, pageId, role);
  for (let guard = 0; page?.parentId && guard < 50; guard++) {
    page = readPage(state, page.parentId, role);
    if (page) chain.unshift(page);
  }
  return chain;
}

// ---------------------------------------------------------------------------------------
// "Solo io" notes: each identity reads and writes only its own (local, private commits).

export function setPersonalNote(state, role, pageId, text) {
  if (!isMember(state, role)) fail("Non fai parte della campagna.", "You are not in the campaign.");
  const data = mutableData(state);
  if (!canReadPage(state, pageIn(data, pageId), role))
    fail("Pagina non disponibile.", "Page unavailable.");
  const value = ownText(text, LIMITS.note, "Nota", "Note");
  data.notes[role] ??= {};
  if (value) data.notes[role][pageId] = { text: value, at: now() };
  else delete data.notes[role][pageId];
}
export function personalNote(state, role, pageId) {
  return dataOf(state).notes?.[role]?.[pageId]?.text ?? "";
}

// ---------------------------------------------------------------------------------------
// Saved views (Obsidian Bases CMP-91): shared, or private to their owner.

export function listViews(state, role) {
  if (!isMember(state, role)) return [];
  return dataOf(state).views.filter((view) => view.owner === role || view.shared === true);
}
export function saveView(state, role, input = {}) {
  if (!isMember(state, role)) fail("Non fai parte della campagna.", "You are not in the campaign.");
  const data = mutableData(state);
  const source = VIEW_SOURCES.includes(input.source) ? input.source : "all";
  const columns = [...new Set(Array.isArray(input.columns) ? input.columns : [])].filter(
    (column) =>
      COLUMNS.includes(column) ||
      (typeof column === "string" &&
        column.startsWith("prop:") &&
        column.length > 5 &&
        column.length <= 5 + LIMITS.label),
  );
  const view = {
    id: input.id ?? newId("view"),
    name:
      isObject(input.name) && validLabel(input.name)
        ? { it: input.name.it, en: input.name.en }
        : ownText(input.name, LIMITS.viewName, "Nome della vista", "View name", {
            required: true,
          }),
    owner: role,
    shared: input.shared === true,
    source,
    statuses:
      source === "quest" && Array.isArray(input.statuses)
        ? input.statuses.filter((value) => QUEST_STATUSES.includes(value))
        : [],
    layout: input.layout === "cards" ? "cards" : "table",
    columns: columns.length ? columns : ["title", "type", "updated"],
    sort: input.sort === "title" ? "title" : "updated",
  };
  const existing = data.views.findIndex((row) => row.id === view.id);
  if (existing >= 0) {
    if (data.views[existing].owner !== role)
      fail("Solo chi l’ha creata modifica una vista.", "Only its creator changes a view.");
    data.views[existing] = view;
  } else data.views.push(view);
  return view.id;
}
export function deleteView(state, role, viewId) {
  const data = mutableData(state);
  const view =
    data.views.find((row) => row.id === viewId) ?? fail("Vista non trovata.", "View not found.");
  if (view.owner !== role)
    fail("Solo chi l’ha creata elimina una vista.", "Only its creator deletes a view.");
  data.views = data.views.filter((row) => row.id !== viewId);
}
// A view runs over Archive pages and Journal/World entries alike (P9 CA-24): the World's
// people and places, recaps and objectives are rows like pages, with their "Label: value"
// lines as properties.
export function runView(state, role, view) {
  const rows = viewRows(state, role, view.source ?? "all").filter(
    (page) =>
      page.entry ||
      page.type !== "quest" ||
      !view.statuses?.length ||
      view.statuses.includes(page.status),
  );
  return view.sort === "title"
    ? rows.sort((a, b) => str(a.title).localeCompare(str(b.title), "it"))
    : rows.sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt)));
}

// ---------------------------------------------------------------------------------------
// Tabs and bookmarks (Monk's Enhanced Journal FVT-057), remembered per identity on this
// device like the Table sidebar. Pure functions plus a guarded storage wrapper.

const TABS_KEY = "d20-studio-quests-tabs-v1";
let tabSeq = 0;
export const emptyTabs = () => ({ tabs: [], active: null, bookmarks: [] });
const tabId = () => `tab-${Date.now().toString(36)}-${++tabSeq}`;
const activeTab = (t) => t.tabs.find((tab) => tab.id === t.active) ?? null;
export function currentPageId(t) {
  const tab = activeTab(t);
  return tab && tab.index >= 0 ? (tab.history[tab.index] ?? null) : null;
}
export function visitPage(t, pageId, { newTab = false } = {}) {
  const next = clone(t);
  let tab = activeTab(next);
  if (newTab || !tab) {
    tab = { id: tabId(), history: [], index: -1 };
    next.tabs.push(tab);
    next.active = tab.id;
  }
  if (tab.history[tab.index] !== pageId) {
    tab.history = [...tab.history.slice(0, tab.index + 1), pageId].slice(-30);
    tab.index = tab.history.length - 1;
  }
  return next;
}
export function newBlankTab(t) {
  const next = clone(t);
  const tab = { id: tabId(), history: [], index: -1 };
  next.tabs.push(tab);
  next.active = tab.id;
  return next;
}
export function stepTab(t, delta) {
  const next = clone(t);
  const tab = activeTab(next);
  if (tab) tab.index = Math.max(0, Math.min(tab.history.length - 1, tab.index + delta));
  return next;
}
export function switchTab(t, id) {
  return t.tabs.some((tab) => tab.id === id) ? { ...clone(t), active: id } : clone(t);
}
export function closeTab(t, id) {
  const next = clone(t);
  const index = next.tabs.findIndex((tab) => tab.id === id);
  if (index < 0) return next;
  next.tabs.splice(index, 1);
  if (next.active === id) next.active = next.tabs[Math.max(0, index - 1)]?.id ?? null;
  return next;
}
export function toggleBookmark(t, pageId) {
  const next = clone(t);
  next.bookmarks = next.bookmarks.includes(pageId)
    ? next.bookmarks.filter((id) => id !== pageId)
    : [...next.bookmarks, pageId].slice(-12);
  return next;
}
const validTabs = (value) =>
  isObject(value) &&
  Array.isArray(value.tabs) &&
  value.tabs.every(
    (tab) =>
      isObject(tab) &&
      typeof tab.id === "string" &&
      Array.isArray(tab.history) &&
      tab.history.every((id) => typeof id === "string") &&
      Number.isInteger(tab.index),
  ) &&
  (value.active === null || typeof value.active === "string") &&
  Array.isArray(value.bookmarks) &&
  value.bookmarks.every((id) => typeof id === "string");
function readAll(storage) {
  try {
    const value = JSON.parse(storage?.getItem(TABS_KEY) ?? "{}");
    return isObject(value) ? value : {};
  } catch {
    return {};
  }
}
export function readTabs(storage, campaignId, role) {
  const value = readAll(storage)?.[campaignId]?.[role];
  return validTabs(value) ? clone(value) : emptyTabs();
}
export function writeTabs(storage, campaignId, role, value) {
  try {
    const all = readAll(storage);
    all[campaignId] = { ...(isObject(all[campaignId]) ? all[campaignId] : {}), [role]: value };
    storage?.setItem(TABS_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}
export function clearTabs(storage) {
  try {
    storage?.removeItem?.(TABS_KEY);
  } catch {
    /* A browser without storage keeps nothing to clear. */
  }
}
// This device's storage; a private window or blocked storage falls back to this tab.
const fallbackValues = new Map();
const fallback = {
  getItem: (key) => (fallbackValues.has(key) ? fallbackValues.get(key) : null),
  setItem: (key, value) => fallbackValues.set(key, String(value)),
  removeItem: (key) => fallbackValues.delete(key),
};
export function deviceStorage() {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return fallback;
    storage.getItem(TABS_KEY);
    return storage;
  } catch {
    return fallback;
  }
}

// =======================================================================================
// P9 — one journal engine for the whole campaign (triage CA-12…CA-24). Journal and World
// entries (campaign-content), personal notes and the Archive's pages share one [[link]]
// syntax with @ suggestions (Kanka @mentions, Roll20 [Name] links), backlinks with context
// and unlinked mentions (Obsidian), browser-like tabs and bookmarks (Monk's Enhanced
// Journal) and saved views (Obsidian Bases). Every projection goes through the reader's
// own permissions: a link to something this identity cannot read stays plain text.

// World entry types shown with the Archive's typed-page names (Monk's typed pages).
export const ENTRY_TYPES = Object.freeze({
  person: "person",
  place: "place",
  faction: "organization",
  shop: "shop",
  event: "event",
  list: "checklist",
  other: "page",
});
export const ENTRY_KIND_LABELS = Object.freeze({
  recap: L("Resoconto", "Recap"),
  quest: L("Obiettivo", "Objective"),
  note: L("Appunto", "Note"),
});
/** The typed-page type of a campaign entry (a World person is a Person page, and so on). */
export const entryType = (entry) =>
  entry.kind === "world" ? (ENTRY_TYPES[entry.data?.worldType] ?? "page") : entry.kind;
export const entryRoute = (entry) => ({
  page: entry.kind === "note" ? "notes" : "campaign",
  tab: "entry",
  id: entry.id,
});
/** "Label: value" lines at the start of a text: an entry's properties (kits as text). */
export function textProperties(text) {
  const out = [];
  for (const line of str(text).split("\n")) {
    const match = /^\s*([^:\n[\]]{1,80}):[ \t]*(.*)$/.exec(line);
    if (!match) {
      if (line.trim()) break;
      continue;
    }
    out.push({ label: match[1].trim(), value: match[2].trim() });
  }
  return out;
}
/** A readable campaign entry as a row shared with the Archive's pages (views, tabs). */
export function entryRow(entry) {
  const data = entry.data ?? {};
  return {
    key: "e:" + entry.id,
    id: "e:" + entry.id,
    entryId: entry.id,
    entry: true,
    kind: entry.kind,
    type: entryType(entry),
    title: data.title || "",
    status: entry.kind === "quest" ? data.questStatus : null,
    parentId: data.parentId ? "e:" + data.parentId : null,
    updatedAt: entry.updatedAt ?? null,
    properties: textProperties(data.body),
    texts: [
      { sectionId: null, text: str(data.body) },
      ...(data.sections ?? []).map((section) => ({
        sectionId: section.id,
        text: str(section.body),
        title: section.title,
      })),
    ],
    route: entryRoute(entry),
  };
}
/** Readable entries of the campaign in play plus this identity's own personal notes. */
export function readableEntries(state, role) {
  const campaignId = state?.campaign?.id ?? null;
  let entries = [];
  try {
    entries = listCampaignEntries(state, {}, role);
  } catch {
    entries = [];
  }
  return entries.filter(
    (entry) => entry.campaignId === campaignId || (entry.kind === "note" && entry.ownerId === role),
  );
}
const fold = (value) =>
  str(value).normalize("NFD").replace(/\p{M}/gu, "").trim().toLocaleLowerCase("it");
let srdIndex = null;
function srdByName() {
  if (srdIndex) return srdIndex;
  srdIndex = new Map();
  for (const category of srd.CATEGORIES)
    for (const entry of srd.categoryEntries(category.id))
      for (const name of [entry.name?.it, entry.name?.en])
        if (name && !srdIndex.has(fold(name))) srdIndex.set(fold(name), entry);
  return srdIndex;
}
const srdRoute = (entry) => ({
  page: "library",
  tab: "compendium",
  revision: entry.kind === "class" ? `class:${entry.classId}` : entry.id,
});
/**
 * Every link target this identity may read: Archive pages, campaign entries (and own
 * notes), characters and companions it can see. `srd: true` adds the SRD compendium.
 */
export function linkTargets(state, role, { srd: withSrd = false } = {}) {
  const out = [];
  if (isMember(state, role))
    for (const page of listPages(state, role))
      out.push({
        key: "page:" + page.id,
        kind: "page",
        id: page.id,
        title: page.title,
        type: page.type,
      });
  for (const entry of readableEntries(state, role))
    if (entry.data?.title)
      out.push({
        key: "entry:" + entry.id,
        kind: "entry",
        id: entry.id,
        title: entry.data.title,
        type: entryType(entry),
        route: entryRoute(entry),
      });
  for (const actor of Object.values(state?.actors ?? {}))
    if (actor?.name && canViewActor(actor, role, state))
      out.push({
        key: "actor:" + actor.id,
        kind: "actor",
        id: actor.id,
        title: actor.name,
        type: actor.kind === "npc" ? "npc" : "character",
        route: { page: "characters", id: actor.id },
      });
  if (withSrd)
    for (const [, entry] of srdByName())
      out.push({
        key: "srd:" + entry.id,
        kind: "srd",
        id: entry.id,
        title: entry.name.it,
        altTitle: entry.name.en,
        type: "srd",
        route: srdRoute(entry),
      });
  return out;
}
/**
 * What a [[Title]] names for this identity, or null: an Archive page first, then a
 * Journal/World entry or own note, a character it can see, then the SRD compendium.
 */
export function resolveLink(state, title, role) {
  const key = norm(title);
  if (!key || key.startsWith("/")) return null;
  const page = resolveTitle(state, title, role);
  if (page) return { kind: "page", ...page };
  const entry = readableEntries(state, role).find((row) => norm(row.data?.title) === key);
  if (entry)
    return {
      kind: "entry",
      id: entry.id,
      title: entry.data.title,
      type: entryType(entry),
      route: entryRoute(entry),
    };
  const actor = Object.values(state?.actors ?? {}).find(
    (row) => row?.name && norm(row.name) === key && canViewActor(row, role, state),
  );
  if (actor)
    return {
      kind: "actor",
      id: actor.id,
      title: actor.name,
      type: "character",
      route: { page: "characters", id: actor.id },
    };
  const rule = srdByName().get(fold(title));
  if (rule) return { kind: "srd", id: rule.id, title, type: "srd", route: srdRoute(rule) };
  return null;
}
/** Suggestions for a partial title typed after @ or [[ (Kanka @mentions), best first. */
export function linkSuggestions(state, role, query, { limit = 8, exclude = null } = {}) {
  const q = fold(query);
  const all = linkTargets(state, role, { srd: q.length >= 2 }).filter((row) => row.key !== exclude);
  const score = (row) => {
    const names = [row.title, row.altTitle].filter(Boolean).map(fold);
    if (!q) return row.kind === "srd" ? 0 : 1;
    if (names.some((name) => name === q)) return 5;
    if (names.some((name) => name.startsWith(q))) return 4;
    if (names.some((name) => name.split(/\s+/).some((word) => word.startsWith(q)))) return 3;
    if (q.length >= 3 && names.some((name) => name.includes(q))) return 2;
    return 0;
  };
  const rank = { page: 0, entry: 0, actor: 1, srd: 2 };
  return all
    .map((row) => ({ row, s: score(row) }))
    .filter((hit) => hit.s > 0)
    .sort(
      (a, b) =>
        b.s - a.s ||
        rank[a.row.kind] - rank[b.row.kind] ||
        a.row.title.localeCompare(b.row.title, "it"),
    )
    .slice(0, limit)
    .map((hit) => hit.row);
}
const linkRe = () => new RegExp(LINK_RE.source, "g");
const snippetAt = (text, index, length) => snippet(text, index, length);
/** Readable places that link to a target ({kind: "page"|"entry", id}), with context. */
export function allBacklinks(state, target, role) {
  const title =
    target.kind === "page"
      ? readPage(state, target.id, role)?.title
      : readableEntries(state, role).find((row) => row.id === target.id)?.data?.title;
  if (!title && target.kind === "page") return [];
  const key = norm(title);
  const out = [];
  const collect = (source, pieces, byRef) => {
    const snippets = [];
    if (key)
      for (const piece of pieces)
        for (const match of str(piece.text).matchAll(linkRe()))
          if (norm(match[1]) === key)
            snippets.push(snippetAt(piece.text, match.index, match[0].length));
    if (snippets.length || byRef) out.push({ ...source, snippets });
  };
  if (isMember(state, role))
    for (const page of listPages(state, role)) {
      if (target.kind === "page" && page.id === target.id) continue;
      collect(
        { kind: "page", id: page.id, title: page.title, type: page.type },
        textPieces(page),
        page.elements.some((ref) => ref.kind === target.kind && ref.id === target.id) ||
          (page.giver?.kind === target.kind && page.giver.id === target.id),
      );
    }
  for (const entry of readableEntries(state, role)) {
    if (target.kind === "entry" && entry.id === target.id) continue;
    const row = entryRow(entry);
    collect(
      { kind: "entry", id: entry.id, title: row.title, type: row.type, route: row.route },
      row.texts,
      (entry.data.links ?? []).some((ref) => ref.kind === target.kind && ref.id === target.id) ||
        (target.kind === "entry" && entry.data.parentId === target.id),
    );
  }
  return out;
}
const mentionHit = (text, title) => mentionIndex(str(text), title);
/**
 * Texts this identity may edit that name the target without a link (Obsidian unlinked
 * mentions): readable entries it can edit and, for the DM, Archive pages. A suggestion is
 * only a proposal: «Collega» writes the link, «Ignora» hides it (census conflict S3).
 */
export function allUnlinkedMentions(state, target, role, { dismissed: skip = [] } = {}) {
  const title =
    target.kind === "page"
      ? findPage(state, target.id)?.title
      : readableEntries(state, role).find((row) => row.id === target.id)?.data?.title;
  if (!title || title.trim().length < 3) return [];
  const out = [];
  if (target.kind === "page")
    out.push(...unlinkedMentions(state, target.id, role).map((row) => ({ ...row, kind: "page" })));
  else if (isDM(state, role)) {
    const data = dataOf(state);
    for (const page of data.pages) {
      if (skip.includes("page:" + page.id)) continue;
      for (const block of page.blocks) {
        const hit = mentionHit(block.text, title);
        if (hit) {
          out.push({
            kind: "page",
            sourceId: page.id,
            sourceTitle: page.title,
            blockId: block.id,
            index: hit.index,
            match: block.text.slice(hit.index, hit.index + hit.length),
            snippet: snippet(block.text, hit.index, hit.length),
          });
          break;
        }
      }
    }
  }
  for (const entry of readableEntries(state, role)) {
    if ((target.kind === "entry" && entry.id === target.id) || !entry.permissions?.canEdit)
      continue;
    if (skip.includes("entry:" + entry.id)) continue;
    for (const piece of entryRow(entry).texts) {
      const hit = mentionHit(piece.text, title);
      if (hit) {
        out.push({
          kind: "entry",
          sourceId: entry.id,
          sourceTitle: entry.data.title || "",
          sectionId: piece.sectionId,
          index: hit.index,
          match: piece.text.slice(hit.index, hit.index + hit.length),
          snippet: snippet(piece.text, hit.index, hit.length),
        });
        break;
      }
    }
  }
  return out;
}
/** Views run over Archive pages and campaign entries alike (Obsidian Bases over the vault). */
export const VIEW_SOURCES = Object.freeze(["all", "world", "journal", ...PAGE_TYPES]);
function viewRows(state, role, source) {
  const pages = isMember(state, role) ? listPages(state, role) : [];
  const entries = readableEntries(state, role)
    .filter((entry) => entry.kind !== "note")
    .map(entryRow);
  if (source === "world")
    return [
      ...entries.filter((row) => row.kind === "world"),
      ...pages.filter((page) => !["quest"].includes(page.type)),
    ];
  if (source === "journal") return entries.filter((row) => ["recap", "quest"].includes(row.kind));
  if (source === "all") return [...pages, ...entries];
  return [...pages, ...entries].filter((row) => row.type === source);
}

// ---- Tabs over the whole journal: a tab's history holds Archive page ids and "e:<id>" keys
// of campaign entries, so Back/Forward cross from the Archive to a World entry and back.
export const entryKey = (entryId) => "e:" + entryId;
export function tabItemTitle(state, key, role) {
  if (!key) return null;
  if (key.startsWith("e:"))
    try {
      return getCampaignEntry(state, key.slice(2), role).data.title || null;
    } catch {
      return null;
    }
  return readPage(state, key, role)?.title ?? null;
}
export function tabItemRoute(key) {
  if (!key) return { page: "campaign", tab: ARCHIVE, id: "" };
  if (key.startsWith("e:")) return { page: "campaign", tab: "entry", id: key.slice(2) };
  return { page: "campaign", tab: ARCHIVE, id: "p:" + key };
}

// =======================================================================================
// UI: the "Archivio" campaign section (render + bind), shared rendering helpers.
// =======================================================================================

const ui = { editing: null, typeFilter: new Map() };
export const ARCHIVE = "quests-archive";
const commonCommit = { visibility: "private" };
export const localCommit = { local: true, visibility: "private", undoable: false };

/** Runs a UI command and shows a refusal (offline, invalid operation) as a toast. */
export function attempt(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    if (error instanceof TypeError || error instanceof ReferenceError) throw error;
    ctx.toast(error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error), true);
    return false;
  }
}
/** A commit returning the mutator's result; DM authoring keeps its label private. */
export function change(ctx, label, mutator, options = commonCommit) {
  let result;
  ctx.commit(
    label,
    (draft) => {
      result = mutator(draft);
    },
    options,
  );
  return result;
}
export function dateText(ctx, value) {
  if (!value || Number.isNaN(new Date(value).getTime()))
    return ctx.t("Data sconosciuta", "Unknown date");
  return new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
const typeLabel = (ctx, type) => ctx.label(TYPE_LABELS[type] ?? TYPE_LABELS.page);
export const labelText = (ctx, value) => (typeof value === "string" ? value : ctx.label(value));
export function undoButton(ctx) {
  if (!ctx.canUndo?.()) return "";
  const label = ctx.undoLabel?.() ?? "";
  return `<button type="button" class="button quiet" data-jp-undo title="${ctx.esc(label)}">${ctx.icon("undo")}<span>${ctx.t("Annulla ultima modifica", "Undo last change")}</span></button>`;
}
/** A button that opens a resolved link target (an Archive page or any other route). */
export function targetButton(ctx, target, label = target.title) {
  return target.kind === "page"
    ? `<button type="button" class="jp-link" data-jp-open="${ctx.esc(target.id)}">${ctx.esc(label)}</button>`
    : `<button type="button" class="jp-link" data-jp-route="${ctx.esc(JSON.stringify(target.route))}">${ctx.esc(label)}</button>`;
}
/**
 * Text with [[links]] (one syntax everywhere, P9 CA-12): a readable target opens (Archive
 * page, Journal/World entry, character, SRD rule); an unresolved title offers a nested
 * page (DM, in the Archive) or a nested entry (in a Journal/World entry its author may
 * extend, `entryId` + `canCreate`). `embed` renders the plain text between links (text
 * embeds); `[[/…]]` is left to it (roll enrichers).
 */
export function linkedText(
  ctx,
  text,
  { sourceId = null, secret = false, entryId = null, canCreate = false, embed = null } = {},
) {
  const dm = isDM(ctx.state, ctx.role);
  const plain = (chunk) => (embed ? embed(chunk) : ctx.esc(chunk));
  const value = str(text);
  let out = "";
  let last = 0;
  for (const match of value.matchAll(LINK_RE)) {
    const title = match[1].trim();
    if (title.startsWith("/")) continue;
    out += plain(value.slice(last, match.index));
    const target = resolveLink(ctx.state, title, ctx.role);
    if (target) out += targetButton(ctx, target, title);
    else if (dm && sourceId && findPage(ctx.state, sourceId))
      out += `<button type="button" class="jp-link jp-missing" data-jp-create-child="${ctx.esc(title)}" data-jp-secret="${secret ? "true" : "false"}" data-jp-parent="${ctx.esc(sourceId)}" title="${ctx.esc(ctx.t("Crea la pagina annidata", "Create the nested page"))}">${ctx.esc(title)}<span class="jp-sr"> · ${ctx.t("pagina da creare", "page to create")}</span></button>`;
    else if (entryId && canCreate)
      out += `<button type="button" class="jp-link jp-missing" data-jp-create-entry="${ctx.esc(title)}" data-jp-secret="${secret ? "true" : "false"}" data-jp-parent-entry="${ctx.esc(entryId)}" title="${ctx.esc(ctx.t("Crea la voce annidata", "Create the nested entry"))}">${ctx.esc(title)}<span class="jp-sr"> · ${ctx.t("voce da creare", "entry to create")}</span></button>`;
    else out += ctx.esc(title);
    last = match.index + match[0].length;
  }
  return out + plain(value.slice(last));
}
/** Checkbox list of recipients used by page access and by reveal dialogs (FVT-162). */
export function recipientsFields(ctx, current = NONE, { allowNone = true, legend } = {}) {
  const party = partyCharacters(ctx.state);
  const radio = (mode, label) =>
    `<label class="campaign-check"><input type="radio" name="mode" value="${mode}" ${current.mode === mode ? "checked" : ""}>${label}</label>`;
  return `<fieldset class="jp-recipients"><legend>${ctx.esc(legend ?? ctx.t("Chi può leggere", "Who can read"))}</legend>${allowNone ? radio("none", ctx.t("Solo DM", "DM only")) : ""}${radio("all", ctx.t("Tutto il gruppo", "The whole party"))}${radio("some", ctx.t("Personaggi scelti", "Chosen characters"))}<div class="jp-recipient-list">${party.map((actor) => `<label class="campaign-check"><input type="checkbox" name="actor" value="${ctx.esc(actor.id)}" ${current.actorIds?.includes(actor.id) ? "checked" : ""}>${ctx.esc(actor.name)}</label>`).join("")}</div></fieldset>`;
}
export function readRecipients(formData) {
  const mode = formData.get("mode") || "none";
  return { mode, actorIds: mode === "some" ? formData.getAll("actor").map(String) : [] };
}
function recipientsText(ctx, recipients) {
  if (recipients.mode === "all") return ctx.t("Tutto il gruppo", "The whole party");
  if (recipients.mode === "some")
    return recipients.actorIds.map((id) => ctx.state.actors?.[id]?.name ?? id).join(", ");
  return ctx.t("Solo DM", "DM only");
}
export function openPage(ctx, pageId, { newTab = false } = {}) {
  const storage = deviceStorage();
  const campaignId = ctx.state.campaign?.id;
  writeTabs(
    storage,
    campaignId,
    ctx.role,
    visitPage(readTabs(storage, campaignId, ctx.role), pageId, { newTab }),
  );
  ctx.navigate("campaign", { tab: ARCHIVE, id: "p:" + pageId });
}
/** Blocks of a projected page; the DM sees secret blocks with their reveal controls. */
export function renderBlocks(ctx, page) {
  const dm = isDM(ctx.state, ctx.role);
  // A checklist's content is its items: the empty-text hint is for text pages only.
  if (!page.blocks.length)
    return dm && page.type !== "checklist"
      ? `<p class="campaign-meta">${ctx.t("Ancora nessun testo: usa Modifica per scriverlo.", "No text yet: use Edit to write it.")}</p>`
      : "";
  return `<div class="jp-blocks">${page.blocks
    .map((block) => {
      const body = `<div class="campaign-prose">${renderTextWithEmbeds(ctx, block.text, (part) => linkedText(ctx, part, { sourceId: page.id, secret: block.kind === "secret" }))}</div>`;
      if (block.kind === "text") return `<div class="jp-block">${body}</div>`;
      if (!dm)
        return `<div class="jp-block jp-revealed"><p class="jp-block-tag">${ctx.t("Rivelato", "Revealed")}</p>${body}</div>`;
      return `<div class="jp-block jp-secret ${block.revealed ? "is-revealed" : ""}"><p class="jp-block-tag">${ctx.icon("eye")}${block.revealed ? ctx.esc(ctx.t("Segreto rivelato a: ", "Secret revealed to: ") + recipientsText(ctx, block.reveal)) : ctx.t("Segreto · visibile solo al DM", "Secret · visible to the DM only")}</p>${body}<div class="jp-block-actions"><button type="button" class="button" data-jp-reveal="${ctx.esc(block.id)}" data-jp-page="${ctx.esc(page.id)}">${block.revealed ? ctx.t("Cambia destinatari", "Change recipients") : ctx.t("Rivela…", "Reveal…")}</button>${block.revealed ? `<button type="button" class="button quiet" data-jp-hide="${ctx.esc(block.id)}" data-jp-page="${ctx.esc(page.id)}">${ctx.t("Nascondi di nuovo", "Hide again")}</button>` : ""}</div></div>`;
    })
    .join("")}</div>`;
}
export function personalNotePanel(ctx, page) {
  if (!isMember(ctx.state, ctx.role)) return "";
  const value = personalNote(ctx.state, ctx.role, page.id);
  return `<section class="jp-panel jp-note"><h3>${ctx.t("Le mie note", "My notes")} <span class="badge">${ctx.t("Solo io", "Only me")}</span></h3><p class="campaign-meta">${
    isDM(ctx.state, ctx.role)
      ? ctx.t(
          "Nessun altro le legge, nemmeno i giocatori o un co-DM. Restano su questo dispositivo anche senza rete.",
          "Nobody else reads them, not even the players or a co-DM. They stay on this device even offline.",
        )
      : ctx.t(
          "Nessun altro le legge, nemmeno il DM. Restano su questo dispositivo anche senza rete.",
          "Nobody else reads them, not even the DM. They stay on this device even offline.",
        )
  }</p><label class="field"><span class="jp-sr">${ctx.t("Le mie note", "My notes")}</span><textarea rows="3" maxlength="${LIMITS.note}" data-jp-note="${ctx.esc(page.id)}">${ctx.esc(value)}</textarea></label><button type="button" class="button" data-jp-note-save="${ctx.esc(page.id)}">${ctx.t("Salva le mie note", "Save my notes")}</button></section>`;
}
function openReveal(ctx, pageId, blockId) {
  const block = findPage(ctx.state, pageId)?.blocks.find((b) => b.id === blockId);
  if (!block) return;
  ctx.dialog(
    ctx.t("Rivela il blocco segreto", "Reveal the secret block"),
    `<p class="campaign-prose">${ctx.esc(plainText(block.text))}</p>${recipientsFields(ctx, block.reveal.mode === "none" ? ALL : block.reveal, { allowNone: false, legend: ctx.t("A chi mostrarlo", "Show it to") })}<p class="campaign-meta">${ctx.t("Chi lo riceve lo legge nella pagina. Puoi nasconderlo di nuovo quando vuoi.", "Recipients read it on the page. You can hide it again whenever you want.")}</p>`,
    {
      submitLabel: ctx.t("Rivela", "Reveal"),
      onSubmit: (formData) =>
        change(ctx, ctx.t("Blocco segreto rivelato", "Secret block revealed"), (draft) =>
          revealBlock(draft, ctx.role, pageId, blockId, readRecipients(formData)),
        ),
    },
  );
}
function openCreateChild(ctx, parentId, title, secret = false) {
  const parent = findPage(ctx.state, parentId);
  // A link written in a secret block (or a DM-only property) names something the players
  // do not know yet: the new page starts DM only. Elsewhere it inherits the parent's
  // readers (LegendKeeper nesting, CMP-60). The DM can change either before creating it.
  const readers = secret ? NONE : (parent?.access ?? NONE);
  ctx.dialog(
    ctx.t("Crea la pagina annidata", "Create the nested page"),
    `<p>${ctx.t("Nuova pagina dentro", "New page inside")} «${ctx.esc(parent?.title ?? "")}».</p><label class="field">${ctx.t("Titolo", "Title")}<input name="title" required maxlength="${LIMITS.title}" value="${ctx.esc(title)}"></label><label class="field">${ctx.t("Tipo", "Type")}<select name="type">${PAGE_TYPES.filter(
      (type) => type !== "quest",
    )
      .map(
        (type) =>
          `<option value="${type}" ${type === "page" ? "selected" : ""}>${ctx.esc(typeLabel(ctx, type))}</option>`,
      )
      .join("")}</select></label>${recipientsFields(ctx, readers)}<p class="campaign-meta">${
      secret
        ? ctx.t(
            "Il collegamento è in un testo segreto: la pagina parte visibile solo al DM.",
            "The link is in secret text: the page starts visible to the DM only.",
          )
        : ctx.t(
            "Parte con gli stessi lettori della pagina che la contiene.",
            "It starts with the same readers as the page that holds it.",
          )
    }</p>`,
    {
      submitLabel: ctx.t("Crea pagina", "Create page"),
      onSubmit: (formData) => {
        const wanted = String(formData.get("title") ?? "");
        const id = change(ctx, ctx.t("Pagina annidata creata", "Nested page created"), (draft) => {
          const created = createChildFromLink(draft, ctx.role, {
            parentId,
            title: wanted,
            type: String(formData.get("type") || "page"),
            access: readRecipients(formData),
          });
          // The typed link keeps pointing at the page when the DM corrects its title.
          if (norm(wanted) !== norm(title)) renameLinks(mutableData(draft), title, wanted.trim());
          return created;
        });
        openPage(ctx, id);
      },
    },
  );
}
// ---- Keyboard focus across re-renders. A command re-renders its section and the focus
// would fall to the page body: like the other areas ("the same control after a
// re-render"), the control a person used keeps the focus when it is still there, a closed
// dialog returns to the control that opened it, and a navigation to another quest or page
// focuses its title once (the campaign shell does the same with its own headings).

// Attributes whose value flips with the command (Hide/Show, secret/shared) or is derived.
const VOLATILE = new Set(["data-hidden", "data-secret", "data-jp-title"]);
const attrValue = (value) => String(value).replace(/["\\]/g, "\\$&");
function ownKey(element) {
  const parts = [...(element.attributes ?? [])]
    .filter((attr) => attr.name.startsWith("data-") && !VOLATILE.has(attr.name))
    .map((attr) => `[${attr.name}="${attrValue(attr.value)}"]`);
  if (!parts.length) return null;
  // Stable area classes tell apart the same link in the index, the text and a list.
  const classes = String(element.className?.baseVal ?? element.className ?? "")
    .split(/\s+/)
    .filter((name) => name.startsWith("jp-"))
    .map((name) => "." + name)
    .join("");
  return element.tagName.toLowerCase() + classes + parts.join("");
}
/** A selector that finds "the same control" in the next render, or null. */
export function focusKey(element) {
  if (!element?.tagName || typeof element.getAttribute !== "function") return null;
  const own = ownKey(element);
  if (own) return own;
  const form = element.closest?.("form");
  const scope = form && form !== element ? ownKey(form) : null;
  if (!scope) return null;
  if (element.name) return `${scope} [name="${attrValue(element.name)}"]`;
  if (element.getAttribute("type") === "submit") return `${scope} [type="submit"]`;
  return null;
}
const focusMemory = { request: null, route: null };
function rememberControl(event) {
  const doc = globalThis.document;
  const control =
    event.type === "submit"
      ? doc?.activeElement
      : event.target?.closest?.("button, input, select, textarea, summary");
  const key = focusKey(control);
  // Controls in the index, tab bars, lists and sub-navigation stay after a navigation;
  // any other control (a link in the text, a chip) leaves with the page it was on.
  if (key)
    focusMemory.request = {
      key,
      at: Date.now(),
      keep: Boolean(control.closest?.("[data-jp-keep]")),
    };
}
function focusFirst(root, selectors, options) {
  for (const selector of selectors) {
    if (!selector) continue;
    let target = null;
    try {
      target = root.querySelector(selector);
    } catch {
      target = null;
    }
    if (target && !target.disabled && target.getClientRects?.().length !== 0) {
      target.focus(options);
      return true;
    }
  }
  return false;
}
/**
 * Called by every B43 bind: remembers the control used inside `root` (capture phase) and,
 * after a re-render, puts the focus back on it, else on the route's title (once per
 * route), else on a fallback. Does nothing when the focus is still somewhere on the page.
 */
export function manageFocus(root, ctx, { route = null, fallbacks = [] } = {}) {
  const doc = globalThis.document;
  if (!doc || typeof root?.addEventListener !== "function") return;
  if (!root.jpFocusBound) {
    root.jpFocusBound = true;
    for (const type of ["click", "change", "submit"])
      root.addEventListener(type, rememberControl, true);
  }
  const key = JSON.stringify([ctx.role, ctx.view?.page, ctx.view?.tab, ctx.view?.id]);
  const routeChanged = Boolean(route) && focusMemory.route !== key;
  if (route) focusMemory.route = key;
  const dialog = doc.querySelector("dialog[open]");
  // A control used long ago (and not waiting for a dialog) no longer says where to go.
  if (focusMemory.request && !dialog && Date.now() - focusMemory.request.at > 3000)
    focusMemory.request = null;
  const request = focusMemory.request;
  const settle = () => {
    if (focusMemory.request === request) focusMemory.request = null;
    const active = doc.activeElement;
    if (active && active !== doc.body && active.isConnected) return;
    const same = request && (request.keep || !routeChanged);
    // Back at the first page (or Forward at the last) is disabled: its twin takes the focus.
    const twin = request?.key.includes("[data-jp-back=")
      ? "[data-jp-forward]"
      : request?.key.includes("[data-jp-forward=")
        ? "[data-jp-back]"
        : null;
    if (same && focusFirst(root, [request.key, twin], { preventScroll: true })) return;
    if (routeChanged && focusFirst(root, [route])) return;
    if (request) focusFirst(root, fallbacks, { preventScroll: true });
  };
  // A command submitted from a dialog renders while the dialog is still open: the focus
  // goes back once the shell has closed it (Escape and Cancel close it natively).
  if (dialog && request)
    dialog.addEventListener("close", () => setTimeout(settle, 0), { once: true });
  else settle();
}
/** Brings the active tab of a strip into view (phone widths scroll the tab strip). */
export function showActiveTab(root) {
  const strip = root.querySelector("[data-jp-strip]");
  if (typeof strip?.querySelector === "function")
    scrollIntoStrip(strip, strip.querySelector(".active"));
}
/** Common handlers for rendered blocks, links, notes and undo inside any B43 surface. */
// ---------------------------------------------------------------- content filter (H-05)
// BG3 content toggles, as handouts and chat already do (P10 CA-68): a Journal or World entry
// and an Archive page render through the viewer's own filter. Swear words are masked,
// pictures start blurred and a topic the DM marked on the entry (safety «Marca una voce»,
// kind "entry") is veiled behind «Mostra» for whoever filters it. Only this viewer's screen
// changes; a reveal lasts for this visit, like maps and handouts, and the key carries the
// role, so another identity never inherits it.
const revealedContent = new Set();
let revealFocus = null;
export function resetContentFilter() {
  revealedContent.clear();
  revealFocus = null;
}
function contentTopics(ctx, filter, kind, id) {
  // Entries and Archive pages share the safety kind "entry" (their ids never collide).
  const rows = [filter.topicsFor("entry", id)];
  const topics = [];
  const seen = new Set();
  for (const row of rows)
    for (const topic of row.topics ?? []) {
      const key = topic.topic
        ? "t:" + topic.topic
        : "c:" + String(topic.custom ?? "").toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        topics.push(topic);
      }
    }
  const names = topics
    .map((topic) =>
      topic.topic
        ? ctx.label(topicById(topic.topic)?.label ?? topic.topic)
        : String(topic.custom ?? ""),
    )
    .sort((a, b) => a.localeCompare(b, ctx.lang));
  return { names, revision: rows.map((row) => row.revision ?? 0).join(".") };
}
/** The viewer's filter over an entry's or a page's trusted, escaped markup. */
export function filterContent(ctx, kind, id, markup) {
  const filter = filterFor(ctx.state, ctx.role);
  if (!filter.enabled) return markup;
  let html = filter.markup(markup);
  const { names, revision } = contentTopics(ctx, filter, kind, id);
  const key = `${ctx.role}:${kind}:${id}:${revision}`;
  if (filter.images && /<img\b/.test(html) && !revealedContent.has(key + ":img"))
    html = `${html.replace(/<img\b/g, "<img data-safety-blurred")}<button type="button" class="button quiet safety-show-image" data-jp-filter-show="${ctx.esc(key)}:img">${ctx.t("Mostra le immagini (sfumate dal tuo filtro)", "Show the pictures (blurred by your filter)")}</button>`;
  if (!names.length || revealedContent.has(key))
    return `<div class="safety-content" data-jp-filter="${ctx.esc(key)}" tabindex="-1">${html}</div>`;
  return `<div class="safety-content is-veiled" data-jp-filter="${ctx.esc(key)}" tabindex="-1"><div class="safety-content-cover"><p><strong>${ctx.t("Sfumata dal tuo filtro", "Blurred by your filter")}</strong> · ${ctx.esc(names.join(", "))}</p><button type="button" class="button" data-jp-filter-show="${ctx.esc(key)}">${ctx.t("Mostra", "Show")}</button></div><div class="safety-content-body" aria-hidden="true" inert>${html}</div></div>`;
}
/** A list excerpt through the same filter: masked words; nothing of a veiled entry. */
export function filterExcerpt(ctx, kind, id, text) {
  const filter = filterFor(ctx.state, ctx.role);
  if (!filter.enabled) return { text: String(text ?? ""), veiled: null };
  const { names, revision } = contentTopics(ctx, filter, kind, id);
  const key = `${ctx.role}:${kind}:${id}:${revision}`;
  if (names.length && !revealedContent.has(key))
    return {
      text: "",
      veiled: ctx.t(
        `Sfumata dal tuo filtro · ${names.join(", ")}`,
        `Blurred by your filter · ${names.join(", ")}`,
      ),
    };
  return { text: filter.text(text), veiled: null };
}
export function bindContentFilter(root, ctx) {
  root.querySelectorAll?.("[data-jp-filter-show]").forEach((button) => {
    button.onclick = (event) => {
      event?.preventDefault?.();
      const key = button.dataset.jpFilterShow;
      revealedContent.add(key);
      revealFocus = key.replace(/:img$/, "");
      ctx.render();
    };
  });
  if (revealFocus) {
    const box = [...(root.querySelectorAll?.("[data-jp-filter]") ?? [])].find(
      (el) => el.dataset?.jpFilter === revealFocus,
    );
    if (box) {
      revealFocus = null;
      box.focus?.({ preventScroll: false });
    }
  }
}
export function bindCommon(root, ctx) {
  bindTextEmbeds(root, ctx);
  bindContentFilter(root, ctx);
  root.querySelectorAll("[data-jp-open]").forEach((button) => {
    button.onclick = (event) =>
      openPage(ctx, button.dataset.jpOpen, { newTab: Boolean(event?.ctrlKey || event?.metaKey) });
  });
  root.querySelectorAll("[data-jp-open-new]").forEach((button) => {
    button.onclick = () => openPage(ctx, button.dataset.jpOpenNew, { newTab: true });
  });
  root.querySelectorAll("[data-jp-route]").forEach((button) => {
    button.onclick = () => {
      const { page, ...params } = JSON.parse(button.dataset.jpRoute);
      ctx.navigate(page, params);
    };
  });
  root.querySelectorAll("[data-jp-reveal]").forEach((button) => {
    button.onclick = () => openReveal(ctx, button.dataset.jpPage, button.dataset.jpReveal);
  });
  root.querySelectorAll("[data-jp-hide]").forEach((button) => {
    button.onclick = () =>
      attempt(ctx, () =>
        change(ctx, ctx.t("Blocco segreto nascosto", "Secret block hidden"), (draft) =>
          hideBlock(draft, ctx.role, button.dataset.jpPage, button.dataset.jpHide),
        ),
      );
  });
  root.querySelectorAll("[data-jp-create-child]").forEach((button) => {
    button.onclick = () =>
      openCreateChild(
        ctx,
        button.dataset.jpParent,
        button.dataset.jpCreateChild,
        button.dataset.jpSecret === "true",
      );
  });
  root.querySelectorAll("[data-jp-note-save]").forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.jpNoteSave;
      const field = root.querySelector(`[data-jp-note="${id}"]`);
      attempt(ctx, () => {
        change(
          ctx,
          ctx.t("Nota personale salvata", "Personal note saved"),
          (draft) => setPersonalNote(draft, ctx.role, id, field?.value ?? ""),
          localCommit,
        );
        ctx.toast(ctx.t("Note salvate: solo tu le leggi.", "Notes saved: only you read them."));
      });
    };
  });
  root.querySelectorAll("[data-jp-undo]").forEach((button) => {
    button.onclick = () => ctx.undo();
  });
  // P9: one links panel for pages and entries (CA-14, CA-15), nested entries (CA-16),
  // templates (CA-17).
  root.querySelectorAll("[data-jp-mention-link]").forEach((button) => {
    button.onclick = () => attempt(ctx, () => linkMentionNow(ctx, button.dataset));
  });
  root.querySelectorAll("[data-jp-mention-dismiss]").forEach((button) => {
    button.onclick = () =>
      attempt(ctx, () => {
        const source = button.dataset.jpMentionDismiss;
        if (button.dataset.jpTargetKind === "page" && source.startsWith("page:"))
          change(ctx, ctx.t("Suggerimento ignorato", "Suggestion dismissed"), (draft) =>
            dismissMention(draft, ctx.role, {
              sourceId: source.slice(5),
              targetId: button.dataset.jpTarget,
            }),
          );
        else {
          dismissFor(ctx, button.dataset.jpTargetKey, source);
          ctx.render();
        }
      });
  });
  root.querySelectorAll("[data-jp-create-entry]").forEach((button) => {
    button.onclick = () =>
      openCreateEntry(ctx, {
        title: button.dataset.jpCreateEntry,
        parentId: button.dataset.jpParentEntry,
        secret: button.dataset.jpSecret === "true",
      });
  });
  root.querySelectorAll("[data-jp-save-template]").forEach((button) => {
    button.onclick = () => openSaveTemplate(ctx, { pageId: button.dataset.jpSaveTemplate });
  });
}
function linkMentionNow(ctx, data) {
  const title = data.jpTitle;
  if (data.jpSourceKind === "page")
    return change(ctx, ctx.t("Menzione collegata", "Mention linked"), (draft) =>
      linkTitleInPage(draft, ctx.role, {
        sourceId: data.jpMentionLink,
        blockId: data.jpBlock,
        title,
      }),
    );
  const local = isLocalEntry(ctx.state, data.jpMentionLink);
  let result;
  ctx.commit(
    ctx.t("Menzione collegata", "Mention linked"),
    (draft) => {
      result = editCampaignText(
        draft,
        data.jpMentionLink,
        {
          sectionId: data.jpSection || null,
          index: Number(data.jpIndex),
          from: data.jpMatch,
          to: `[[${title}]]`,
          change: "link",
        },
        ctx.role,
        { online: !ctx.offline },
      );
    },
    { local, visibility: "private", undoable: false },
  );
  return result;
}

// ---------------------------------------------------------------------------------------
// Archive section

function subOf(id = "") {
  if (id === "reputation" || id === "relations") return id;
  if (id === "views" || id.startsWith("view:")) return "views";
  return "pages";
}
function heading(ctx, env) {
  const dm = isDM(ctx.state, ctx.role);
  return `<header class="campaign-heading jp-heading"><div><h1 tabindex="-1">${ctx.t("Archivio", "Archive")}</h1><p class="muted">${ctx.t("Persone, organizzazioni, negozi, luoghi e missioni con proprietà, segreti e relazioni.", "People, organizations, shops, places and quests with properties, secrets and relations.")}</p></div><div class="campaign-toolbar">${dm ? `<button type="button" class="button primary" data-jp-new-page>${ctx.icon("plus")}<span>${ctx.t("Nuova pagina", "New page")}</span></button>` : ""}${undoButton(ctx)}</div></header>`;
}
function subnav(ctx, env, current) {
  const items = [
    ["pages", ctx.t("Pagine", "Pages")],
    ["reputation", ctx.t("Reputazione", "Reputation")],
    ["relations", ctx.t("Relazioni", "Relations")],
    ["views", ctx.t("Viste", "Views")],
  ];
  return `<nav class="tabs jp-subnav" data-jp-strip data-jp-keep aria-label="${ctx.t("Parti dell’archivio", "Archive parts")}">${items.map(([id, label]) => `<button type="button" class="${id === current ? "active" : ""}" ${id === current ? 'aria-current="page"' : ""} data-jp-sub="${id}">${label}</button>`).join("")}</nav>`;
}
/** Applies a deep link (p:<id>) to the active tab and returns this identity's tabs. */
function syncTabs(ctx) {
  const storage = deviceStorage();
  const campaignId = ctx.state.campaign?.id;
  let tabs = readTabs(storage, campaignId, ctx.role);
  const id = ctx.view.id ?? "";
  const wanted = id.startsWith("p:") ? id.slice(2) : id.startsWith("edit:") ? id.slice(5) : null;
  if (wanted && currentPageId(tabs) !== wanted && findPage(ctx.state, wanted)) {
    tabs = visitPage(tabs, wanted);
    writeTabs(storage, campaignId, ctx.role, tabs);
  }
  return tabs;
}
// The core World entries this identity can read, listed read only under the archive tree
// so the index covers the whole campaign; they open on their own core entry page.
function worldRows(ctx) {
  const entries = listCampaignEntries(
    ctx.state,
    { campaignId: ctx.state.campaign?.id, kind: "world" },
    ctx.role,
  );
  if (!entries.length) return [];
  return [
    `<li class="jp-dir-group" role="presentation"><p class="jp-dir-heading">${ctx.t("Dal Mondo", "From the World")}</p></li>`,
    ...entries.map((entry) => {
      const title = entry.data.title || ctx.t("Voce senza titolo", "Untitled entry");
      return `<li><button type="button" class="jp-dir-item" data-jp-world-entry data-jp-title="${ctx.esc(title.toLocaleLowerCase("it"))}" data-jp-route="${ctx.esc(JSON.stringify({ page: "campaign", tab: "entry", id: entry.id }))}"><span class="jp-dir-title">${ctx.esc(title)}</span><span class="jp-dir-meta">${ctx.t("Mondo", "World")} · ${ctx.esc(ctx.label(WORLD_TYPE_LABELS[entry.data.worldType] ?? WORLD_TYPE_LABELS.other))}</span></button></li>`;
    }),
  ];
}
function directory(ctx, current) {
  const filter = ui.typeFilter.get(ctx.role) ?? "";
  const pages = listPages(ctx.state, ctx.role);
  const dm = isDM(ctx.state, ctx.role);
  const item = (page, depth) =>
    `<li><button type="button" class="jp-dir-item ${page.id === current ? "active" : ""}" style="--depth:${depth}" data-jp-open="${ctx.esc(page.id)}" data-jp-title="${ctx.esc(page.title.toLocaleLowerCase("it"))}" ${page.id === current ? 'aria-current="page"' : ""}><span class="jp-dir-title">${ctx.esc(page.title)}</span><span class="jp-dir-meta">${ctx.esc(typeLabel(ctx, page.type))}${dm && page.access?.mode === "none" ? " · " + ctx.t("Solo DM", "DM only") : ""}${page.type === "quest" ? " · " + ctx.esc(ctx.label(STATUS_LABELS[page.status])) : ""}</span></button></li>`;
  let rows;
  if (filter) rows = pages.filter((page) => page.type === filter).map((page) => item(page, 0));
  else {
    const byParent = new Map();
    for (const page of pages) {
      const key = page.parentId ?? "";
      byParent.set(key, [...(byParent.get(key) ?? []), page]);
    }
    const walk = (parentId, depth) =>
      (byParent.get(parentId) ?? []).flatMap((page) => [
        item(page, depth),
        ...walk(page.id, depth + 1),
      ]);
    rows = walk("", 0);
    rows.push(...worldRows(ctx));
  }
  return `<details class="jp-directory" open data-jp-directory data-jp-keep><summary>${ctx.t("Indice", "Index")} (${pages.length})</summary><div class="jp-dir-tools"><label class="field"><span>${ctx.t("Cerca un titolo", "Find a title")}</span><input type="search" data-jp-dir-search autocomplete="off"></label><label class="field"><span>${ctx.t("Tipo", "Type")}</span><select data-jp-type-filter><option value="">${ctx.t("Tutti, ad albero", "All, as a tree")}</option>${PAGE_TYPES.map((type) => `<option value="${type}" ${filter === type ? "selected" : ""}>${ctx.esc(typeLabel(ctx, type))}</option>`).join("")}</select></label></div><ul class="jp-dir-list">${rows.join("") || `<li class="campaign-meta">${ctx.t("Nessuna pagina.", "No pages.")}</li>`}</ul></details>`;
}
function propertiesList(ctx, page) {
  if (!page.properties.length) return "";
  return `<dl class="jp-props">${page.properties
    .map(
      (p) =>
        `<div class="jp-prop ${p.secret ? "jp-prop-secret" : ""}"><dt>${ctx.esc(labelText(ctx, p.label))}${p.secret ? ` <span class="badge">${ctx.t("Solo DM", "DM only")}</span>` : ""}</dt><dd>${p.value ? linkedText(ctx, p.value, { sourceId: page.id, secret: p.secret }) : `<span class="campaign-meta">—</span>`}</dd></div>`,
    )
    .join("")}</dl>`;
}
function refButton(ctx, info) {
  if (info.kind === "page")
    return `<button type="button" class="button quiet" data-jp-open="${ctx.esc(info.id)}">${ctx.esc(info.label)} <span class="campaign-meta">· ${ctx.esc(typeLabel(ctx, info.type))}</span></button>`;
  return `<button type="button" class="button quiet" data-jp-route="${ctx.esc(JSON.stringify(info.route))}">${ctx.esc(ctx.label(info.label))} <span class="campaign-meta">· ${ctx.esc(info.kind === "actor" ? ctx.t("Scheda", "Sheet") : info.kind === "scene" ? ctx.t("Scena", "Scene") : ctx.t("Diario", "Journal"))}</span></button>`;
}
function elementsPanel(ctx, page) {
  const refs = page.elements.map((ref) => refInfo(ctx.state, ref, ctx.role)).filter(Boolean);
  if (!refs.length) return "";
  return `<section class="jp-panel"><h3>${ctx.t("Elementi collegati", "Linked elements")}</h3><div class="jp-chips">${refs.map((info) => refButton(ctx, info)).join("")}</div></section>`;
}
function checklistPanel(ctx, page) {
  if (page.type !== "checklist") return "";
  const dm = isDM(ctx.state, ctx.role);
  const items = page.items ?? [];
  const done = items.filter((item) => item.done).length;
  const row = (item) =>
    dm
      ? `<li class="jp-objective ${item.done ? "is-done" : ""}"><div class="jp-objective-row"><label class="campaign-check jp-objective-check"><input type="checkbox" data-jp-item-toggle="${ctx.esc(item.id)}" data-jp-page="${ctx.esc(page.id)}" ${item.done ? "checked" : ""}><span>${ctx.esc(plainText(item.text))}</span></label><span class="jp-objective-tools"><button type="button" class="button quiet" data-jp-item-remove="${ctx.esc(item.id)}" data-jp-page="${ctx.esc(page.id)}" aria-label="${ctx.esc(ctx.t("Rimuovi la voce ", "Remove the item ") + plainText(item.text))}">${ctx.icon("close")}</button></span></div></li>`
      : `<li class="jp-objective ${item.done ? "is-done" : ""}"><p class="jp-objective-text"><span class="jp-mark" aria-hidden="true">${item.done ? ctx.icon("check") : ""}</span><span class="jp-sr">${item.done ? ctx.t("Fatto: ", "Done: ") : ctx.t("Da fare: ", "To do: ")}</span>${linkedText(ctx, item.text)}</p></li>`;
  return `<section class="jp-panel jp-checklist"><h3>${ctx.t("Voci", "Items")} <span class="campaign-meta">${done}/${items.length}</span></h3>${items.length ? `<ul class="jp-objective-list">${items.map(row).join("")}</ul>` : `<p class="campaign-meta">${ctx.t("Nessuna voce ancora.", "No items yet.")}</p>`}${dm ? `<form class="jp-inline-form" data-jp-add-item="${ctx.esc(page.id)}"><label class="field">${ctx.t("Nuova voce · [[Titolo]] collega una pagina", "New item · [[Title]] links a page")}<input name="text" maxlength="${LIMITS.value}" required autocomplete="off"></label><button type="submit" class="button">${ctx.t("Aggiungi voce", "Add item")}</button></form>` : ""}</section>`;
}
function mentionsPanel(ctx, env, page) {
  const dm = isDM(ctx.state, ctx.role);
  const suggest = dm && env.suggestionsOn(ctx);
  return journalLinksPanel(ctx, { kind: "page", id: page.id }, { suggest, canSuggest: dm });
}
function pageView(ctx, env, page, tabs) {
  const dm = isDM(ctx.state, ctx.role);
  const trail = ancestors(ctx.state, page.id, ctx.role);
  const kids = children(ctx.state, page.id, ctx.role);
  const marked = tabs.bookmarks.includes(page.id);
  return `<article class="jp-page" aria-labelledby="jp-page-title">${trail.length ? `<nav class="jp-breadcrumb" aria-label="${ctx.t("Percorso", "Path")}">${trail.map((row) => `<button type="button" class="jp-link" data-jp-open="${ctx.esc(row.id)}">${ctx.esc(row.title)}</button>`).join(" › ")} ›</nav>` : ""}<header class="jp-page-head"><div><p class="jp-kicker">${ctx.esc(typeLabel(ctx, page.type))}${page.important ? ` · <span class="badge jp-important">${ctx.t("PNG importante", "Important NPC")}</span>` : ""}${page.type === "quest" ? ` · <span class="badge jp-status jp-status-${page.status}">${ctx.esc(ctx.label(STATUS_LABELS[page.status]))}</span>` : ""}</p><h2 id="jp-page-title" tabindex="-1">${ctx.esc(page.title)}</h2>${dm ? `<p class="campaign-meta">${ctx.t("Chi può leggere", "Who can read")}: ${ctx.esc(recipientsText(ctx, page.access))}</p>` : ""}</div><div class="jp-page-actions">${dm ? `<button type="button" class="button" data-jp-edit="${ctx.esc(page.id)}">${ctx.icon("pen")}<span>${ctx.t("Modifica", "Edit")}</span></button>` : ""}<button type="button" class="button quiet" data-jp-bookmark="${ctx.esc(page.id)}" aria-pressed="${marked}">${marked ? ctx.t("Togli segnalibro", "Remove bookmark") : ctx.t("Segnalibro", "Bookmark")}</button><button type="button" class="button quiet" data-jp-open-new="${ctx.esc(page.id)}">${ctx.t("Apri in una nuova scheda", "Open in a new tab")}</button>${dm ? `<button type="button" class="button quiet" data-jp-save-template="${ctx.esc(page.id)}">${ctx.t("Salva come modello", "Save as template")}</button>` : ""}${dm && canCopyToCampaign(ctx) ? `<button type="button" class="button quiet" data-jp-copy-to="page:${ctx.esc(page.id)}">${ctx.t("Copia in un’altra campagna…", "Copy to another campaign…")}</button>` : ""}</div></header>${filterContent(ctx, "page", page.id, `${propertiesList(ctx, page)}${checklistPanel(ctx, page)}${env.pageExtras?.(ctx, page) ?? ""}${renderBlocks(ctx, page)}`)}${env.pagePanels?.(ctx, page) ?? ""}${pageBlocks(ctx, page)}${kids.length ? `<section class="jp-panel"><h3>${ctx.t("Pagine annidate", "Nested pages")}</h3><div class="jp-chips">${kids.map((row) => `<button type="button" class="button quiet" data-jp-open="${ctx.esc(row.id)}">${ctx.esc(row.title)} <span class="campaign-meta">· ${ctx.esc(typeLabel(ctx, row.type))}</span></button>`).join("")}</div></section>` : ""}${elementsPanel(ctx, page)}${mentionsPanel(ctx, env, page)}${personalNotePanel(ctx, page)}</article>`;
}

// ---- Editor (DM): a private working copy until Save; the draft guard protects it.

function workingFrom(page) {
  return {
    title: page.title,
    type: page.type,
    parentId: page.parentId ?? "",
    access: clone(page.access),
    important: page.important === true,
    giver: page.giver ? `${page.giver.kind}:${page.giver.id}` : "",
    blocks: page.blocks.map((b) => ({ id: b.id, kind: b.kind, text: b.text })),
    properties: page.properties.map((p) => clone(p)),
    elements: page.elements.map((ref) => `${ref.kind}:${ref.id}`),
  };
}
export function hasArchiveDraft(ctx, next) {
  const editing = ui.editing;
  if (!editing?.dirty || editing.role !== ctx.role) return false;
  return !(
    next &&
    next.page === "campaign" &&
    next.tab === ARCHIVE &&
    next.id === "edit:" + editing.pageId &&
    !next.role
  );
}
export function discardArchiveDraft() {
  ui.editing = null;
}
function editing(ctx, pageId) {
  const page = findPage(ctx.state, pageId);
  if (!page) return null;
  if (!ui.editing || ui.editing.pageId !== pageId || ui.editing.role !== ctx.role)
    ui.editing = { pageId, role: ctx.role, working: workingFrom(page), dirty: false };
  return ui.editing;
}
const refOptions = (ctx, selfId) => [
  ...listPages(ctx.state, ctx.role)
    .filter((page) => page.id !== selfId)
    .map((page) => [`page:${page.id}`, `${page.title} · ${typeLabel(ctx, page.type)}`]),
  ...Object.values(ctx.state.actors ?? {})
    .filter((actor) => canViewActor(actor, ctx.role, ctx.state))
    .map((actor) => [`actor:${actor.id}`, `${actor.name} · ${ctx.t("Scheda", "Sheet")}`]),
  ...(ctx.state.scenes ?? []).map((scene) => [
    `scene:${scene.id}`,
    `${scene.name} · ${ctx.t("Scena", "Scene")}`,
  ]),
  ...listCampaignEntries(ctx.state, { campaignId: ctx.state.campaign?.id }, ctx.role).map(
    (entry) => [
      `entry:${entry.id}`,
      `${entry.data.title || ctx.t("Voce senza titolo", "Untitled entry")} · ${ctx.t("Diario", "Journal")}`,
    ],
  ),
];
const parseRef = (value) => {
  const text = String(value ?? "");
  const split = text.indexOf(":");
  return split > 0 ? { kind: text.slice(0, split), id: text.slice(split + 1) } : null;
};
function editorView(ctx, env, page) {
  const state = editing(ctx, page.id);
  const w = state.working;
  const options = refOptions(ctx, page.id);
  const parents = listPages(ctx.state, ctx.role).filter((row) => row.id !== page.id);
  const block = (b, i) =>
    `<fieldset class="jp-edit-block ${b.kind === "secret" ? "jp-secret" : ""}"><legend>${ctx.t("Blocco", "Block")} ${i + 1}</legend><input type="hidden" name="block-id-${i}" value="${ctx.esc(b.id)}"><label class="field">${ctx.t("Tipo di blocco", "Block kind")}<select name="block-kind-${i}"><option value="text" ${b.kind === "text" ? "selected" : ""}>${ctx.t("Testo per chi legge la pagina", "Text for page readers")}</option><option value="secret" ${b.kind === "secret" ? "selected" : ""}>${ctx.t("Segreto (solo DM finché non lo riveli)", "Secret (DM only until revealed)")}</option></select></label><label class="field">${ctx.t("Testo · @ o [[ collega una voce", "Text · @ or [[ links an entry")}<textarea name="block-text-${i}" rows="4" maxlength="${LIMITS.text}" data-jp-block-text="${i}" data-link-suggest>${ctx.esc(b.text)}</textarea></label><div class="campaign-toolbar"><button type="button" class="button quiet" data-jp-insert-roll="${i}">${ctx.icon("dice")} ${ctx.t("Inserisci tiro…", "Insert roll…")}</button><button type="button" class="button" data-jp-cut="${i}">${ctx.t("Sposta la selezione in una nuova pagina", "Move the selection to a new page")}</button><button type="button" class="button quiet" data-jp-remove-block="${i}">${ctx.t("Rimuovi blocco", "Remove block")}</button></div></fieldset>`;
  const property = (p, i) =>
    `<div class="jp-edit-prop"><input type="hidden" name="prop-id-${i}" value="${ctx.esc(p.id)}"><label class="field">${ctx.t("Proprietà", "Property")}<input name="prop-label-${i}" maxlength="${LIMITS.label}" value="${ctx.esc(labelText(ctx, p.label))}"></label><label class="field">${ctx.t("Valore", "Value")}<input name="prop-value-${i}" maxlength="${LIMITS.value}" value="${ctx.esc(p.value)}"></label><label class="campaign-check"><input type="checkbox" name="prop-secret-${i}" ${p.secret ? "checked" : ""}>${ctx.t("Solo DM", "DM only")}</label><button type="button" class="button quiet" data-jp-remove-prop="${i}" aria-label="${ctx.esc(ctx.t("Rimuovi ", "Remove ") + labelText(ctx, p.label))}">${ctx.icon("close")}</button></div>`;
  return `<form class="jp-editor campaign-form" data-jp-editor="${ctx.esc(page.id)}"><h2 id="jp-page-title" tabindex="-1">${ctx.t("Modifica", "Edit")}: ${ctx.esc(page.title)}</h2><p data-jp-editor-status role="status" class="campaign-meta">${state.dirty ? ctx.t("Modifiche non salvate", "Unsaved changes") : ctx.t("Nessuna modifica da salvare", "No changes to save")}</p><div class="jp-edit-grid"><label class="field">${ctx.t("Titolo", "Title")}<input name="title" required maxlength="${LIMITS.title}" value="${ctx.esc(w.title)}"></label><label class="field">${ctx.t("Tipo", "Type")}<select name="type" ${page.type === "quest" ? 'disabled aria-describedby="jp-type-why"' : ""}>${PAGE_TYPES.filter(
    (type) => page.type === "quest" || type !== "quest",
  )
    .map(
      (type) =>
        `<option value="${type}" ${w.type === type ? "selected" : ""}>${ctx.esc(typeLabel(ctx, type))}</option>`,
    )
    .join(
      "",
    )}</select></label>${page.type === "quest" ? `<p class="campaign-meta" id="jp-type-why">${ctx.t("Il tipo di una missione non cambia: stato, obiettivi e ricompense andrebbero persi. Per un altro tipo crea una nuova pagina.", "A quest’s type does not change: status, objectives and rewards would be lost. For another type create a new page.")}</p>` : ""}<label class="field">${ctx.t("Dentro la pagina", "Inside the page")}<select name="parentId"><option value="">${ctx.t("Nessuna (livello principale)", "None (top level)")}</option>${parents.map((row) => `<option value="${ctx.esc(row.id)}" ${w.parentId === row.id ? "selected" : ""}>${ctx.esc(row.title)}</option>`).join("")}</select></label>${
    page.type === "quest"
      ? `<label class="field">${ctx.t("Committente", "Quest giver")}<select name="giver"><option value="">${ctx.t("Nessuno", "None")}</option>${options
          .filter(([value]) => !value.startsWith("scene:"))
          .map(
            ([value, label]) =>
              `<option value="${ctx.esc(value)}" ${w.giver === value ? "selected" : ""}>${ctx.esc(label)}</option>`,
          )
          .join("")}</select></label>`
      : ""
  }</div>${w.type === "person" ? `<label class="campaign-check"><input type="checkbox" name="important" ${w.important ? "checked" : ""}>${ctx.t("PNG importante: compare nella schermata degli atteggiamenti", "Important NPC: listed on the attitude screen")}</label>` : ""}${recipientsFields(ctx, w.access)}<section class="jp-edit-section"><h3>${ctx.t("Proprietà", "Properties")}</h3>${w.properties.map(property).join("") || `<p class="campaign-meta">${ctx.t("Nessuna proprietà.", "No properties.")}</p>`}<div class="campaign-toolbar"><button type="button" class="button" data-jp-add-prop>${ctx.t("Aggiungi proprietà", "Add property")}</button><label class="field jp-inline-field">${ctx.t("Kit di proprietà", "Property kit")}<select name="kit">${Object.entries(
    KITS,
  )
    .map(([id, kit]) => `<option value="${id}">${ctx.esc(ctx.label(kit.label))}</option>`)
    .join(
      "",
    )}</select></label><button type="button" class="button" data-jp-kit-apply>${ctx.t("Aggiungi i campi del kit", "Add the kit’s fields")}</button></div></section><section class="jp-edit-section"><h3>${ctx.t("Testo e blocchi segreti", "Text and secret blocks")}</h3>${w.blocks.map(block).join("")}<div class="campaign-toolbar"><button type="button" class="button" data-jp-add-block="text">${ctx.t("Aggiungi paragrafo", "Add paragraph")}</button><button type="button" class="button" data-jp-add-block="secret">${ctx.t("Aggiungi blocco segreto", "Add secret block")}</button></div></section><section class="jp-edit-section"><h3>${ctx.t("Elementi collegati", "Linked elements")}</h3><div class="jp-chips">${w.elements
    .map((value, i) => {
      const info = refInfo(ctx.state, parseRef(value), ctx.role);
      return `<span class="jp-chip">${ctx.esc(info ? ctx.label(info.label) : value)}<button type="button" class="button quiet" data-jp-el-remove="${i}" aria-label="${ctx.esc(ctx.t("Rimuovi ", "Remove ") + (info ? ctx.label(info.label) : value))}">${ctx.icon("close")}</button></span>`;
    })
    .join(
      "",
    )}</div><div class="campaign-toolbar"><label class="field jp-inline-field">${ctx.t("Collega", "Link")}<select name="element-add"><option value="">${ctx.t("Scegli…", "Choose…")}</option>${options.map(([value, label]) => `<option value="${ctx.esc(value)}">${ctx.esc(label)}</option>`).join("")}</select></label><button type="button" class="button" data-jp-el-add>${ctx.t("Aggiungi elemento", "Add element")}</button></div></section><div class="campaign-savebar jp-savebar"><button type="submit" class="button primary" data-jp-save>${ctx.t("Salva pagina", "Save page")}</button><button type="button" class="button" data-jp-cancel>${ctx.t("Annulla modifiche", "Discard changes")}</button><button type="button" class="button danger" data-jp-delete>${ctx.t("Elimina pagina", "Delete page")}</button></div></form>`;
}
function capture(ctx, form) {
  const w = ui.editing.working;
  const fd = new FormData(form);
  const keep = (name, fallbackValue) => (fd.has(name) ? String(fd.get(name)) : fallbackValue);
  w.title = keep("title", w.title);
  if (fd.has("type")) w.type = String(fd.get("type"));
  w.parentId = keep("parentId", w.parentId);
  if (fd.has("giver")) w.giver = String(fd.get("giver"));
  w.important = fd.get("important") === "on";
  w.access = readRecipients(fd);
  w.blocks = w.blocks.map((b, i) => ({
    id: keep(`block-id-${i}`, b.id),
    kind: keep(`block-kind-${i}`, b.kind),
    text: keep(`block-text-${i}`, b.text),
  }));
  w.properties = w.properties.map((p, i) => {
    const typed = keep(`prop-label-${i}`, labelText(ctx, p.label));
    return {
      ...p,
      label: typeof p.label !== "string" && typed === labelText(ctx, p.label) ? p.label : typed,
      value: keep(`prop-value-${i}`, p.value),
      secret: fd.get(`prop-secret-${i}`) === "on",
    };
  });
  return w;
}
function patchOf(w, page) {
  return {
    title: w.title,
    ...(page.type === "quest" ? { giver: parseRef(w.giver) } : { type: w.type }),
    parentId: w.parentId || null,
    access: w.access,
    important: w.important,
    blocks: w.blocks,
    properties: w.properties,
    elements: w.elements.map(parseRef).filter(Boolean),
  };
}
function bindEditor(root, ctx, env) {
  const form = root.querySelector("[data-jp-editor]");
  if (!form) return;
  const pageId = form.dataset?.jpEditor ?? form.getAttribute?.("data-jp-editor");
  const page = findPage(ctx.state, pageId);
  if (!page || !ui.editing) return;
  const dirty = () => {
    ui.editing.dirty = true;
    const status = root.querySelector("[data-jp-editor-status]");
    if (status) status.textContent = ctx.t("Modifiche non salvate", "Unsaved changes");
  };
  form.oninput = dirty;
  form.onchange = dirty;
  const redraw = (mutate) => {
    capture(ctx, form);
    mutate(ui.editing.working);
    ui.editing.dirty = true;
    ctx.render();
  };
  root.querySelectorAll("[data-jp-add-block]").forEach((button) => {
    button.onclick = () =>
      redraw((w) =>
        w.blocks.push({ id: newId("block"), kind: button.dataset.jpAddBlock, text: "" }),
      );
  });
  root.querySelectorAll("[data-jp-remove-block]").forEach((button) => {
    button.onclick = () => redraw((w) => w.blocks.splice(Number(button.dataset.jpRemoveBlock), 1));
  });
  root.querySelectorAll("[data-jp-add-prop]").forEach((button) => {
    button.onclick = () =>
      redraw((w) => w.properties.push({ id: newId("prop"), label: "", value: "", secret: false }));
  });
  root.querySelectorAll("[data-jp-remove-prop]").forEach((button) => {
    button.onclick = () =>
      redraw((w) => w.properties.splice(Number(button.dataset.jpRemoveProp), 1));
  });
  root.querySelectorAll("[data-jp-kit-apply]").forEach((button) => {
    button.onclick = () => {
      const kit = new FormData(form).get("kit");
      attempt(ctx, () => redraw((w) => (w.properties = applyKit(w.properties, String(kit)))));
    };
  });
  root.querySelectorAll("[data-jp-el-add]").forEach((button) => {
    button.onclick = () => {
      const value = String(new FormData(form).get("element-add") ?? "");
      if (!value)
        return ctx.toast(ctx.t("Scegli prima un elemento.", "Choose an element first."), true);
      redraw((w) => {
        if (!w.elements.includes(value)) w.elements.push(value);
      });
    };
  });
  root.querySelectorAll("[data-jp-el-remove]").forEach((button) => {
    button.onclick = () => redraw((w) => w.elements.splice(Number(button.dataset.jpElRemove), 1));
  });
  // P8 CA-26: a check, save, damage, reward or table roll button at the cursor.
  root.querySelectorAll("[data-jp-insert-roll]").forEach((button) => {
    button.onclick = () => {
      const area = root.querySelector(`[data-jp-block-text="${button.dataset.jpInsertRoll}"]`);
      if (area) openEmbedPicker(ctx, (marker) => insertEmbed(area, marker));
    };
  });
  root.querySelectorAll("[data-jp-cut]").forEach((button) => {
    button.onclick = () => {
      const index = Number(button.dataset.jpCut);
      const area = root.querySelector(`[data-jp-block-text="${index}"]`);
      const start = area?.selectionStart ?? 0;
      const end = area?.selectionEnd ?? 0;
      if (start === end)
        return ctx.toast(
          ctx.t("Seleziona prima del testo nel blocco.", "Select some text in the block first."),
          true,
        );
      const words = area.value.slice(start, end).trim().split(/\s+/).slice(0, 5).join(" ");
      ctx.dialog(
        ctx.t("Sposta in una nuova pagina", "Move to a new page"),
        `<p class="campaign-prose">${ctx.esc(area.value.slice(start, end))}</p><label class="field">${ctx.t("Titolo della nuova pagina", "Title of the new page")}<input name="title" required maxlength="${LIMITS.title}" value="${ctx.esc(words.replace(/[.,;:!?]+$/, ""))}"></label><p class="campaign-meta">${ctx.t("La pagina viene salvata con le modifiche correnti; al posto del testo resta un collegamento.", "The page is saved with the current changes; a link replaces the text.")}</p>`,
        {
          submitLabel: ctx.t("Crea e collega", "Create and link"),
          onSubmit: (formData) => {
            const w = capture(ctx, form);
            const blockId = w.blocks[index].id;
            change(
              ctx,
              ctx.t("Selezione spostata in una nuova pagina", "Selection moved to a new page"),
              (draft) => {
                updatePage(draft, ctx.role, pageId, patchOf(w, page));
                moveSelectionToNewPage(draft, ctx.role, {
                  pageId,
                  blockId,
                  start,
                  end,
                  title: String(formData.get("title") ?? ""),
                });
              },
            );
            ui.editing = null;
            ctx.render();
          },
        },
      );
    };
  });
  form.onsubmit = (event) => {
    event.preventDefault();
    const w = capture(ctx, form);
    attempt(ctx, () => {
      change(ctx, ctx.t("Pagina dell’archivio salvata", "Archive page saved"), (draft) =>
        updatePage(draft, ctx.role, pageId, patchOf(w, page)),
      );
      ui.editing = null;
      ctx.navigate("campaign", { tab: ARCHIVE, id: "p:" + pageId });
    });
  };
  root.querySelectorAll("[data-jp-cancel]").forEach((button) => {
    button.onclick = () => ctx.navigate("campaign", { tab: ARCHIVE, id: "p:" + pageId });
  });
  root.querySelectorAll("[data-jp-delete]").forEach((button) => {
    button.onclick = () =>
      ctx.dialog(
        ctx.t("Eliminare la pagina?", "Delete the page?"),
        `<p>${ctx.t("«", "“")}${ctx.esc(page.title)}${ctx.t("» sparisce dall’archivio con le sue relazioni e reputazioni. Le pagine annidate salgono di un livello. Puoi usare «Annulla ultima modifica».", "” leaves the archive with its relations and reputation. Nested pages move up one level. You can use “Undo last change”.")}</p>`,
        {
          submitLabel: ctx.t("Elimina", "Delete"),
          onSubmit: () => {
            change(ctx, ctx.t("Pagina dell’archivio eliminata", "Archive page deleted"), (draft) =>
              deletePage(draft, ctx.role, pageId),
            );
            ui.editing = null;
            ctx.navigate("campaign", { tab: ARCHIVE, id: "" });
          },
        },
      );
  });
}

function newPageDialog(ctx, { type = "person", parentId = "" } = {}) {
  const parents = listPages(ctx.state, ctx.role);
  // P9 CA-17: the DM's own templates (World Anvil / Kanka), besides the built-in kits.
  const templates = listEntryTemplates(ctx.state, ctx.role).filter((row) =>
    ["page", "world"].includes(row.kind),
  );
  ctx.dialog(
    ctx.t("Nuova pagina dell’archivio", "New archive page"),
    `<label class="field">${ctx.t("Tipo", "Type")}<select name="type">${PAGE_TYPES.map((value) => `<option value="${value}" ${value === type ? "selected" : ""}>${ctx.esc(typeLabel(ctx, value))}</option>`).join("")}</select></label><label class="field">${ctx.t("Titolo", "Title")}<input name="title" required maxlength="${LIMITS.title}" autocomplete="off"></label><label class="field">${ctx.t("Kit di proprietà", "Property kit")}<select name="kit"><option value="">${ctx.t("Nessuno", "None")}</option>${Object.entries(
      KITS,
    )
      .map(
        ([id, kit]) =>
          `<option value="${id}">${ctx.esc(ctx.label(kit.label))} · ${kit.fields.map(([label]) => ctx.esc(ctx.label(label))).join(", ")}</option>`,
      )
      .join(
        "",
      )}</select></label>${templates.length ? `<label class="field">${ctx.t("Parti da un modello", "Start from a template")}<select name="template"><option value="">${ctx.t("Nessuno", "None")}</option>${templates.map((row) => `<option value="${ctx.esc(row.id)}">${ctx.esc(row.name)}${row.fields.length ? " · " + ctx.esc(row.fields.map((f) => f.label).join(", ")) : ""}</option>`).join("")}</select></label>` : `<p class="campaign-meta">${ctx.t("Con «Salva come modello» su una pagina o una voce crei i tuoi modelli.", "Use “Save as template” on a page or an entry to make your own templates.")}</p>`}<label class="field">${ctx.t("Dentro la pagina", "Inside the page")}<select name="parentId"><option value="">${ctx.t("Nessuna (livello principale)", "None (top level)")}</option>${parents.map((row) => `<option value="${ctx.esc(row.id)}" ${row.id === parentId ? "selected" : ""}>${ctx.esc(row.title)}</option>`).join("")}</select></label>${recipientsFields(ctx, NONE)}<p class="campaign-meta">${ctx.t("Le missioni nuove partono Nascoste finché non le mostri ai giocatori.", "New quests start Hidden until you show them to the players.")}</p>`,
    {
      submitLabel: ctx.t("Crea pagina", "Create page"),
      onSubmit: (formData) => {
        const id = change(
          ctx,
          ctx.t("Pagina dell’archivio creata", "Archive page created"),
          (draft) =>
            createPage(draft, ctx.role, {
              type: String(formData.get("type")),
              title: String(formData.get("title") ?? ""),
              kitId: formData.get("kit") ? String(formData.get("kit")) : undefined,
              template: formData.get("template")
                ? templates.find((row) => row.id === String(formData.get("template")))
                : undefined,
              parentId: formData.get("parentId") ? String(formData.get("parentId")) : null,
              access: readRecipients(formData),
            }),
        );
        openPage(ctx, id);
      },
    },
  );
}

// ---- Views (Bases): table or cards over readable pages, inline quest status for the DM.

const ENTRY_STATUS = {
  open: L("Aperto", "Open"),
  completed: L("Completato", "Completed"),
  failed: L("Fallito", "Failed"),
  abandoned: L("Abbandonato", "Abandoned"),
};
function entryCell(ctx, row, column) {
  if (column === "title")
    return `<button type="button" class="jp-link" data-jp-route="${ctx.esc(JSON.stringify(row.route))}">${ctx.esc(row.title || ctx.t("Voce senza titolo", "Untitled entry"))}</button>`;
  if (column === "type") return ctx.esc(kindName(ctx, row));
  if (column === "status")
    return row.status ? ctx.esc(ctx.label(ENTRY_STATUS[row.status] ?? ENTRY_STATUS.open)) : "—";
  if (column === "progress") {
    if (row.type !== "checklist") return "—";
    const lines = row.texts[0].text.split("\n").filter((line) => /^\s*- \[[ xX]\]/.test(line));
    return `${lines.filter((line) => /^\s*- \[[xX]\]/.test(line)).length}/${lines.length}`;
  }
  if (column === "parent")
    return row.parentId ? ctx.esc(tabItemTitle(ctx.state, row.parentId, ctx.role) ?? "—") : "—";
  if (column === "updated") return ctx.esc(dateText(ctx, row.updatedAt));
  if (column.startsWith("prop:")) {
    const found = row.properties.find((p) => norm(p.label) === norm(column.slice(5)));
    return found?.value ? linkedText(ctx, found.value) : "—";
  }
  return "—";
}
function cell(ctx, page, column) {
  if (page.entry) return entryCell(ctx, page, column);
  if (column === "title")
    return `<button type="button" class="jp-link" data-jp-open="${ctx.esc(page.id)}">${ctx.esc(page.title)}</button>`;
  if (column === "type") return ctx.esc(typeLabel(ctx, page.type));
  if (column === "status") {
    if (page.type !== "quest") return "—";
    if (isDM(ctx.state, ctx.role))
      return `<label><span class="jp-sr">${ctx.t("Stato di ", "Status of ")}${ctx.esc(page.title)}</span><select data-jp-view-status="${ctx.esc(page.id)}">${QUEST_STATUSES.map((status) => `<option value="${status}" ${status === page.status ? "selected" : ""}>${ctx.esc(ctx.label(STATUS_LABELS[status]))}</option>`).join("")}</select></label>`;
    return ctx.esc(ctx.label(STATUS_LABELS[page.status]));
  }
  if (column === "giver") {
    const info = page.giver ? refInfo(ctx.state, page.giver, ctx.role) : null;
    return info ? ctx.esc(ctx.label(info.label)) : "—";
  }
  if (column === "progress") {
    if (page.type === "checklist")
      return `${(page.items ?? []).filter((item) => item.done).length}/${(page.items ?? []).length}`;
    if (page.type !== "quest") return "—";
    const { done, total } = questProgress(page);
    return `${done}/${total}`;
  }
  if (column === "rewards")
    return page.type === "quest" && page.rewards.length
      ? page.rewards.map((r) => ctx.esc(r.text)).join("; ")
      : "—";
  if (column === "parent")
    return page.parentId ? ctx.esc(findPage(ctx.state, page.parentId)?.title ?? "") : "—";
  if (column === "updated") return ctx.esc(dateText(ctx, page.updatedAt));
  if (column.startsWith("prop:")) {
    const key = norm(column.slice(5));
    const found = page.properties.find(
      (p) =>
        norm(typeof p.label === "string" ? p.label : p.label.it) === key ||
        norm(labelText(ctx, p.label)) === key,
    );
    return found?.value ? linkedText(ctx, found.value) : "—";
  }
  return "—";
}
export function columnLabel(ctx, column) {
  const names = {
    title: ctx.t("Titolo", "Title"),
    type: ctx.t("Tipo", "Type"),
    status: ctx.t("Stato", "Status"),
    giver: ctx.t("Committente", "Quest giver"),
    progress: ctx.t("Obiettivi", "Objectives"),
    rewards: ctx.t("Ricompense", "Rewards"),
    parent: ctx.t("Dentro", "Inside"),
    updated: ctx.t("Aggiornata", "Updated"),
  };
  return names[column] ?? ctx.esc(column.slice(5));
}
export function renderViewResult(ctx, view) {
  const rows = runView(ctx.state, ctx.role, view);
  if (!rows.length)
    return `<p class="campaign-empty">${ctx.t("Nessuna voce o pagina corrisponde a questa vista.", "No entry or page matches this view.")}</p>`;
  if (view.layout === "cards")
    return `<ul class="jp-cards">${rows
      .map(
        (page) =>
          `<li class="jp-card"><h3>${cell(ctx, page, "title")}</h3>${view.columns
            .filter((c) => c !== "title")
            .map(
              (c) =>
                `<p><span class="campaign-meta">${columnLabel(ctx, c)}:</span> ${cell(ctx, page, c)}</p>`,
            )
            .join("")}</li>`,
      )
      .join("")}</ul>`;
  return `<div class="table-wrap jp-table-wrap"><table class="jp-table"><caption class="jp-sr">${ctx.esc(labelText(ctx, view.name))}</caption><thead><tr>${view.columns.map((c) => `<th scope="col">${columnLabel(ctx, c)}</th>`).join("")}</tr></thead><tbody>${rows.map((page) => `<tr>${view.columns.map((c) => `<td>${cell(ctx, page, c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
export function openViewDialog(ctx, { source = "all", after } = {}) {
  const props = [
    ...new Set(
      viewRows(ctx.state, ctx.role, "all").flatMap((page) =>
        page.properties.map((p) => labelText(ctx, p.label)).filter(Boolean),
      ),
    ),
  ].slice(0, 24);
  const dm = isDM(ctx.state, ctx.role);
  ctx.dialog(
    ctx.t("Nuova vista salvata", "New saved view"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="${LIMITS.viewName}"></label><label class="field">${ctx.t("Voci e pagine", "Entries and pages")}<select name="source"><option value="all">${ctx.t("Tutto: Diario, Mondo e Archivio", "Everything: Journal, World and Archive")}</option><option value="world" ${source === "world" ? "selected" : ""}>${ctx.t("Mondo (voci e pagine)", "World (entries and pages)")}</option><option value="journal" ${source === "journal" ? "selected" : ""}>${ctx.t("Diario: resoconti e obiettivi", "Journal: recaps and objectives")}</option>${PAGE_TYPES.map((type) => `<option value="${type}" ${type === source ? "selected" : ""}>${ctx.esc(typeLabel(ctx, type))}</option>`).join("")}</select></label><fieldset class="jp-recipients"><legend>${ctx.t("Stati delle missioni (vuoto = tutti)", "Quest statuses (empty = all)")}</legend>${QUEST_STATUSES.filter(
      (status) => dm || status !== "hidden",
    )
      .map(
        (status) =>
          `<label class="campaign-check"><input type="checkbox" name="status" value="${status}">${ctx.esc(ctx.label(STATUS_LABELS[status]))}</label>`,
      )
      .join(
        "",
      )}</fieldset><fieldset class="jp-recipients"><legend>${ctx.t("Aspetto", "Layout")}</legend><label class="campaign-check"><input type="radio" name="layout" value="table" checked>${ctx.t("Tabella a colonne", "Table with columns")}</label><label class="campaign-check"><input type="radio" name="layout" value="cards">${ctx.t("Schede", "Cards")}</label></fieldset><fieldset class="jp-recipients"><legend>${ctx.t("Colonne", "Columns")}</legend>${[...COLUMNS.map((c) => [c, columnLabel(ctx, c)]), ...props.map((label) => ["prop:" + label, ctx.esc(label)])].map(([value, label]) => `<label class="campaign-check"><input type="checkbox" name="column" value="${ctx.esc(value)}" ${["title", "type", "updated"].includes(value) ? "checked" : ""}>${label}</label>`).join("")}</fieldset><label class="field">${ctx.t("Ordina per", "Sort by")}<select name="sort"><option value="updated">${ctx.t("Aggiornata di recente", "Recently updated")}</option><option value="title">${ctx.t("Titolo", "Title")}</option></select></label><label class="campaign-check"><input type="checkbox" name="shared">${ctx.t("Condividi con il gruppo (ognuno vede solo ciò che può leggere)", "Share with the party (each sees only what they can read)")}</label>`,
    {
      submitLabel: ctx.t("Salva vista", "Save view"),
      onSubmit: (formData) => {
        const shared = formData.get("shared") === "on";
        const id = change(
          ctx,
          ctx.t("Vista salvata", "View saved"),
          (draft) =>
            saveView(draft, ctx.role, {
              name: String(formData.get("name") ?? ""),
              source: String(formData.get("source") ?? "all"),
              statuses: formData.getAll("status").map(String),
              layout: String(formData.get("layout") ?? "table"),
              columns: formData.getAll("column").map(String),
              sort: String(formData.get("sort") ?? "updated"),
              shared,
            }),
          shared ? commonCommit : localCommit,
        );
        (after ?? ((viewId) => ctx.navigate("campaign", { tab: ARCHIVE, id: "view:" + viewId })))(
          id,
        );
      },
    },
  );
}
function viewsBody(ctx) {
  const views = listViews(ctx.state, ctx.role);
  const selectedId = (ctx.view.id ?? "").startsWith("view:") ? ctx.view.id.slice(5) : views[0]?.id;
  const view = views.find((row) => row.id === selectedId) ?? views[0];
  return `<div class="jp-views"><div class="campaign-toolbar" data-jp-keep>${views.map((row) => `<button type="button" class="button ${row.id === view?.id ? "active" : ""}" ${row.id === view?.id ? 'aria-current="true"' : ""} data-jp-view="${ctx.esc(row.id)}">${ctx.esc(labelText(ctx, row.name))}${row.shared ? "" : ` <span class="badge">${ctx.t("Solo io", "Only me")}</span>`}</button>`).join("")}<button type="button" class="button" data-jp-new-view>${ctx.icon("plus")}<span>${ctx.t("Nuova vista", "New view")}</span></button></div>${view ? `<h2>${ctx.esc(labelText(ctx, view.name))}</h2>${renderViewResult(ctx, view)}${view.owner === ctx.role ? `<button type="button" class="button quiet" data-jp-delete-view="${ctx.esc(view.id)}">${ctx.t("Elimina questa vista", "Delete this view")}</button>` : ""}` : `<p class="campaign-empty">${ctx.t("Nessuna vista salvata.", "No saved views.")}</p>`}</div>`;
}
export function bindViews(root, ctx, env, { stay } = {}) {
  root.querySelectorAll("[data-jp-view]").forEach((button) => {
    button.onclick = () =>
      ctx.navigate("campaign", { tab: stay ?? ARCHIVE, id: "view:" + button.dataset.jpView });
  });
  root.querySelectorAll("[data-jp-new-view]").forEach((button) => {
    button.onclick = () =>
      openViewDialog(ctx, {
        source: stay ? "quest" : "all",
        after: (id) => ctx.navigate("campaign", { tab: stay ?? ARCHIVE, id: "view:" + id }),
      });
  });
  root.querySelectorAll("[data-jp-delete-view]").forEach((button) => {
    button.onclick = () =>
      attempt(ctx, () => {
        const view = dataOf(ctx.state).views.find((row) => row.id === button.dataset.jpDeleteView);
        change(
          ctx,
          ctx.t("Vista eliminata", "View deleted"),
          (draft) => deleteView(draft, ctx.role, button.dataset.jpDeleteView),
          view?.shared ? commonCommit : localCommit,
        );
        ctx.navigate("campaign", { tab: stay ?? ARCHIVE, id: stay ? "" : "views" });
      });
  });
  root.querySelectorAll("[data-jp-view-status]").forEach((select) => {
    select.onchange = () =>
      attempt(ctx, () => env.setStatus(ctx, select.dataset.jpViewStatus, select.value));
  });
}

// B58 hook (additive): a ".relations" campaign-section block (the relationship graph) may
// present the Relations part; it receives this list's markup and keeps it as its list
// mode. With no such area the part is the list alone, exactly as before.
function relationsPart(ctx, list) {
  const arg = { kind: "relations", list };
  const [view] = (ctx.registry?.list("campaign-section", ctx, arg) ?? []).filter((c) =>
    c.id.endsWith(".relations"),
  );
  return view ? ctx.registry.slot("campaign-section", view, ctx, arg) : list;
}
// B58 hook (additive, review): ".archive-page" campaign-section blocks (the page's local
// relationship graph) render after the page's panels with {kind: "archive-page", page},
// like the ".entry" blocks of core entries. With no such area the page is unchanged.
function pageBlocks(ctx, page) {
  const arg = { kind: "archive-page", page };
  return (ctx.registry?.list("campaign-section", ctx, arg) ?? [])
    .filter((c) => c.id.endsWith(".archive-page"))
    .map((c) => ctx.registry.slot("campaign-section", c, ctx, arg))
    .join("");
}
export function renderArchive(ctx, env) {
  if (!isMember(ctx.state, ctx.role))
    return `<header class="campaign-heading"><h1>${ctx.t("Archivio non disponibile", "Archive unavailable")}</h1></header>`;
  const sub = subOf(ctx.view.id ?? "");
  let body;
  if (sub === "reputation") body = env.reputationScreen(ctx);
  else if (sub === "relations") body = relationsPart(ctx, env.relationsScreen(ctx));
  else if (sub === "views") body = viewsBody(ctx);
  else {
    const tabs = syncTabs(ctx);
    const current = currentPageId(tabs);
    const editId = (ctx.view.id ?? "").startsWith("edit:") ? ctx.view.id.slice(5) : null;
    // The active tab may hold a Journal/World entry (P9 CA-20): it opens on its own page.
    const page =
      current && !current.startsWith("e:") ? readPage(ctx.state, current, ctx.role) : null;
    let content;
    if (editId && isDM(ctx.state, ctx.role) && findPage(ctx.state, editId))
      content = editorView(ctx, env, readPage(ctx.state, editId, ctx.role));
    else if (page) content = pageView(ctx, env, page, tabs);
    else if (current?.startsWith("e:") && tabItemTitle(ctx.state, current, ctx.role))
      content = `<div class="campaign-empty"><h2 id="jp-page-title" tabindex="-1">${ctx.esc(tabItemTitle(ctx.state, current, ctx.role))}</h2><p>${ctx.t("Questa scheda contiene una voce del Diario o del Mondo.", "This tab holds a Journal or World entry.")}</p><button type="button" class="button primary" data-jp-route="${ctx.esc(JSON.stringify(tabItemRoute(current)))}">${ctx.t("Apri la voce", "Open the entry")}</button></div>`;
    else if (current)
      content = `<div class="campaign-empty"><h2 id="jp-page-title" tabindex="-1">${ctx.t("Pagina non disponibile", "Page unavailable")}</h2><p>${ctx.t("Questa pagina non esiste più o non è condivisa con te. Scegline un’altra dall’indice.", "This page no longer exists or is not shared with you. Choose another one from the index.")}</p></div>`;
    else
      content = `<div class="campaign-empty"><h2 id="jp-page-title" tabindex="-1">${ctx.t("Scegli una pagina", "Choose a page")}</h2><p>${ctx.t("Apri una pagina dall’indice: resta in questa scheda, con Indietro e Avanti. Ctrl o Cmd e clic la aprono in una scheda nuova.", "Open a page from the index: it stays in this tab, with Back and Forward. Ctrl or Cmd and click opens it in a new tab.")}</p></div>`;
    body = `<div class="jp-layout">${directory(ctx, current)}<section class="jp-reader" aria-label="${ctx.t("Lettore dell’archivio", "Archive reader")}">${journalTabBar(ctx, tabs)}${journalBookmarkBar(ctx, tabs)}${content}</section></div>`;
  }
  return `<div class="jp-archive">${heading(ctx, env)}${subnav(ctx, env, sub)}${body}</div>`;
}
export function bindArchive(root, ctx, env) {
  const storage = deviceStorage();
  const campaignId = ctx.state.campaign?.id;
  const tabs = () => readTabs(storage, campaignId, ctx.role);
  bindCommon(root, ctx);
  showActiveTab(root);
  root.querySelectorAll("[data-jp-sub]").forEach((button) => {
    button.onclick = () => {
      const sub = button.dataset.jpSub;
      const current = currentPageId(tabs());
      ctx.navigate("campaign", {
        tab: ARCHIVE,
        id: sub === "pages" ? (current ? "p:" + current : "") : sub,
      });
    };
  });
  bindJournalTabs(root, ctx);
  root.querySelectorAll("[data-jp-edit]").forEach((button) => {
    button.onclick = () =>
      ctx.navigate("campaign", { tab: ARCHIVE, id: "edit:" + button.dataset.jpEdit });
  });
  // CA-88 (Roll20 Transmogrifier, C5 «page»): the page goes to another campaign of the DM.
  root.querySelectorAll("[data-jp-copy-to]").forEach((button) => {
    button.onclick = () => copyToCampaign(ctx, button.dataset.jpCopyTo);
  });
  root.querySelectorAll("[data-jp-new-page]").forEach((button) => {
    button.onclick = () => newPageDialog(ctx);
  });
  root.querySelectorAll("[data-jp-type-filter]").forEach((select) => {
    select.onchange = () => {
      ui.typeFilter.set(ctx.role, select.value);
      ctx.render();
    };
  });
  // Title search filters the rendered index in place, so the field keeps its focus.
  root.querySelectorAll("[data-jp-dir-search]").forEach((input) => {
    input.oninput = () => {
      const query = input.value.trim().toLocaleLowerCase("it");
      root.querySelectorAll("[data-jp-title]").forEach((item) => {
        const row = item.closest?.("li");
        if (row) row.hidden = Boolean(query) && !item.dataset.jpTitle.includes(query);
      });
    };
  });
  const directoryBox = root.querySelector("[data-jp-directory]");
  if (
    directoryBox &&
    currentPageId(tabs()) &&
    globalThis.matchMedia?.("(max-width: 720px)").matches
  )
    directoryBox.open = false;
  root.querySelectorAll("[data-jp-suggest-toggle]").forEach((input) => {
    input.onchange = () => attempt(ctx, () => env.setSuggestions(ctx, input.checked));
  });
  root.querySelectorAll("[data-jp-item-toggle]").forEach((input) => {
    input.onchange = () =>
      attempt(ctx, () =>
        change(
          ctx,
          input.checked
            ? ctx.t("Voce dell’elenco fatta", "Checklist item done")
            : ctx.t("Voce dell’elenco riaperta", "Checklist item reopened"),
          (draft) =>
            toggleChecklistItem(
              draft,
              ctx.role,
              input.dataset.jpPage,
              input.dataset.jpItemToggle,
              input.checked,
            ),
        ),
      );
  });
  root.querySelectorAll("[data-jp-item-remove]").forEach((button) => {
    button.onclick = () =>
      attempt(ctx, () =>
        change(ctx, ctx.t("Voce dell’elenco rimossa", "Checklist item removed"), (draft) =>
          removeChecklistItem(draft, ctx.role, button.dataset.jpPage, button.dataset.jpItemRemove),
        ),
      );
  });
  root.querySelectorAll("[data-jp-add-item]").forEach((form) => {
    form.onsubmit = (event) => {
      event.preventDefault();
      if (typeof FormData !== "function" || !(form instanceof EventTarget)) return;
      const text = String(new FormData(form).get("text") ?? "");
      attempt(ctx, () =>
        change(ctx, ctx.t("Voce dell’elenco aggiunta", "Checklist item added"), (draft) =>
          addChecklistItem(draft, ctx.role, form.dataset.jpAddItem, text),
        ),
      );
    };
  });
  bindViews(root, ctx, env);
  bindEditor(root, ctx, env);
  bindLinkSuggest(root, ctx);
  env.bindPanels?.(root, ctx);
  const id = ctx.view.id ?? "";
  manageFocus(root, ctx, {
    route: id.startsWith("p:") || id.startsWith("edit:") ? "#jp-page-title" : ".jp-archive h1",
    fallbacks: ["#jp-page-title", ".jp-archive h1"],
  });
}

// =======================================================================================
// P9 — shared journal UI: one links panel, one tab bar, @ suggestions, nested entries,
// cut-to-new-entry and templates, used by the Archive and by Journal/World entries.

const DISMISS_KEY = "d20-studio-journal-dismissed-v1";
const icon = (ctx, name) => ctx.icon?.(name) ?? "";
function dismissedFor(ctx, targetKey) {
  try {
    const all = JSON.parse(deviceStorage().getItem(DISMISS_KEY) ?? "{}");
    const list = all?.[ctx.state.campaign?.id ?? "-"]?.[ctx.role]?.[targetKey];
    return Array.isArray(list) ? list.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}
function dismissFor(ctx, targetKey, sourceKey) {
  try {
    const storage = deviceStorage();
    const all = JSON.parse(storage.getItem(DISMISS_KEY) ?? "{}") ?? {};
    const campaign = (all[ctx.state.campaign?.id ?? "-"] ??= {});
    const mine = (campaign[ctx.role] ??= {});
    mine[targetKey] = [...new Set([...(mine[targetKey] ?? []), sourceKey])].slice(-200);
    storage.setItem(DISMISS_KEY, JSON.stringify(all));
  } catch {
    /* Without storage a dismissal lasts until the page is drawn again. */
  }
}
const sourceButton = (ctx, row) =>
  row.kind === "page"
    ? `<button type="button" class="button quiet" data-jp-open="${ctx.esc(row.id)}">${ctx.esc(row.title)}</button>`
    : `<button type="button" class="button quiet" data-jp-route="${ctx.esc(JSON.stringify(row.route))}">${ctx.esc(row.title || ctx.t("Voce senza titolo", "Untitled entry"))}</button>`;
const kindName = (ctx, row) =>
  ctx.label(
    (row.kind === "entry" && ENTRY_KIND_LABELS[row.type]) ||
      TYPE_LABELS[row.type] ||
      TYPE_LABELS.page,
  );
/**
 * «Collegamenti in entrata» with the context of each link and, for who can edit the
 * sources, «Menzioni non collegate» with «Collega» / «Ignora» (Obsidian's backlinks
 * panel; LegendKeeper's auto-link is only a proposal the author confirms).
 */
export function journalLinksPanel(ctx, target, { suggest = true, canSuggest = true } = {}) {
  const links = allBacklinks(ctx.state, target, ctx.role);
  const targetKey = `${target.kind}:${target.id}`;
  const skip = dismissedFor(ctx, targetKey);
  const mentions =
    canSuggest && suggest
      ? allUnlinkedMentions(ctx.state, target, ctx.role, { dismissed: skip })
      : [];
  const title =
    target.kind === "page"
      ? (readPage(ctx.state, target.id, ctx.role)?.title ?? "")
      : (readableEntries(ctx.state, ctx.role).find((row) => row.id === target.id)?.data?.title ??
        "");
  return `<section class="jp-panel jp-mentions" data-jp-links-panel><h3>${ctx.t("Collegamenti in entrata", "Linked mentions")} (${links.length})</h3>${
    links.length
      ? `<ul class="jp-backlinks">${links.map((row) => `<li>${sourceButton(ctx, row)} <span class="campaign-meta">· ${ctx.esc(kindName(ctx, row))}</span>${row.snippets.map((text) => `<p class="campaign-meta campaign-prose">${linkedText(ctx, text)}</p>`).join("")}</li>`).join("")}</ul>`
      : `<p class="campaign-meta">${ctx.t("Nessuna voce o pagina che puoi leggere porta qui. Scrivi [[" + title + "]] o @ in un testo per collegarla.", "No entry or page you can read links here. Type [[" + title + "]] or @ in a text to link it.")}</p>`
  }${
    canSuggest
      ? `<h3>${ctx.t("Menzioni non collegate", "Unlinked mentions")}${suggest ? ` (${mentions.length})` : ""}</h3>${
          target.kind === "page"
            ? `<label class="campaign-check jp-toggle"><input type="checkbox" data-jp-suggest-toggle ${suggest ? "checked" : ""}>${ctx.t("Suggerisci collegamenti dai titoli riconosciuti", "Suggest links from recognised titles")}</label>`
            : ""
        }${
          !suggest
            ? `<p class="campaign-meta">${ctx.t("Suggerimenti disattivati: nessun testo viene analizzato.", "Suggestions turned off: no text is scanned.")}</p>`
            : mentions.length
              ? `<ul class="jp-backlinks">${mentions
                  .map(
                    (row) =>
                      `<li><p><strong>${ctx.esc(row.sourceTitle || ctx.t("Voce senza titolo", "Untitled entry"))}</strong></p><p class="campaign-meta campaign-prose">${ctx.esc(plainText(row.snippet))}</p><div class="campaign-toolbar"><button type="button" class="button" data-jp-mention-link="${ctx.esc(row.sourceId)}" data-jp-source-kind="${row.kind}" data-jp-block="${ctx.esc(row.blockId ?? "")}" data-jp-section="${ctx.esc(row.sectionId ?? "")}" data-jp-index="${row.index ?? ""}" data-jp-match="${ctx.esc(row.match ?? "")}" data-jp-title="${ctx.esc(title)}" data-jp-target="${ctx.esc(target.id)}" data-jp-target-kind="${target.kind}">${ctx.t("Collega", "Link")}</button><button type="button" class="button quiet" data-jp-mention-dismiss="${ctx.esc(`${row.kind === "page" ? "page" : "entry"}:${row.sourceId}`)}" data-jp-target-key="${ctx.esc(targetKey)}" data-jp-target="${ctx.esc(target.id)}" data-jp-target-kind="${target.kind}">${ctx.t("Ignora", "Dismiss")}</button></div></li>`,
                  )
                  .join("")}</ul>`
              : `<p class="campaign-meta">${ctx.t("Nessuna menzione senza collegamento.", "No mention without a link.")}</p>`
        }`
      : ""
  }</section>`;
}
/** Links one mention of `title` in an Archive block (DM): the first unlinked occurrence. */
export function linkTitleInPage(state, role, { sourceId, blockId, title }) {
  requireDM(state, role);
  const data = mutableData(state);
  const source = pageIn(data, sourceId);
  const block =
    source.blocks.find((b) => b.id === blockId) ?? fail("Blocco non trovato.", "Block not found.");
  const hit = mentionIndex(block.text, title);
  if (!hit) fail("La menzione non c’è più.", "The mention is no longer there.");
  block.text =
    block.text.slice(0, hit.index) + `[[${title}]]` + block.text.slice(hit.index + hit.length);
  source.updatedAt = now();
}

// ---- Tabs and bookmarks for the whole journal (Monk's browser-like tabs, CA-20).

function journalTabBar(ctx, tabs) {
  const tab = activeTab(tabs);
  const title = (key) =>
    key
      ? (tabItemTitle(ctx.state, key, ctx.role) ??
        ctx.t("Pagina non disponibile", "Page unavailable"))
      : ctx.t("Nuova scheda", "New tab");
  const canBack = tab && tab.index > 0;
  const canForward = tab && tab.index < tab.history.length - 1;
  const why = `${canBack ? "" : `<span class="jp-sr" id="jp-back-why">${ctx.t("Sei alla prima pagina di questa scheda: apri un’altra pagina per tornarci.", "You are on this tab’s first page: open another page to come back to it.")}</span>`}${canForward ? "" : `<span class="jp-sr" id="jp-forward-why">${ctx.t("Sei all’ultima pagina di questa scheda: Avanti torna utile dopo Indietro.", "You are on this tab’s last page: Forward helps after Back.")}</span>`}`;
  return `<div class="jp-tabbar" data-jp-keep>${why}<button type="button" class="icon-button" data-jp-back aria-label="${ctx.t("Indietro nella scheda", "Back in this tab")}" title="${canBack ? ctx.t("Indietro", "Back") : ctx.t("Indietro: sei alla prima pagina di questa scheda", "Back: you are on this tab’s first page")}" ${canBack ? "" : 'disabled aria-describedby="jp-back-why"'}>${icon(ctx, "arrow")}</button><button type="button" class="icon-button jp-flip" data-jp-forward aria-label="${ctx.t("Avanti nella scheda", "Forward in this tab")}" title="${canForward ? ctx.t("Avanti", "Forward") : ctx.t("Avanti: sei all’ultima pagina di questa scheda", "Forward: you are on this tab’s last page")}" ${canForward ? "" : 'disabled aria-describedby="jp-forward-why"'}>${icon(ctx, "arrow")}</button><div class="jp-tabs" aria-label="${ctx.t("Schede aperte", "Open tabs")}">${tabs.tabs
    .map((row) => {
      const name = title(row.history[row.index]);
      const active = row.id === tabs.active;
      return `<div class="jp-tab ${active ? "active" : ""}"><button type="button" class="jp-tab-main" data-jp-tab="${ctx.esc(row.id)}" ${active ? 'aria-current="true"' : ""}>${ctx.esc(name)}</button><button type="button" class="jp-tab-close" data-jp-close-tab="${ctx.esc(row.id)}" aria-label="${ctx.esc(ctx.t("Chiudi la scheda ", "Close the tab ") + name)}">${icon(ctx, "close")}</button></div>`;
    })
    .join(
      "",
    )}</div><button type="button" class="icon-button" data-jp-new-tab aria-label="${ctx.t("Nuova scheda", "New tab")}" title="${ctx.t("Nuova scheda", "New tab")}">${icon(ctx, "plus")}</button></div>`;
}
function journalBookmarkBar(ctx, tabs) {
  const marks = tabs.bookmarks
    .map((key) => ({ key, title: tabItemTitle(ctx.state, key, ctx.role) }))
    .filter((row) => row.title);
  return `<div class="jp-bookmarks" data-jp-keep aria-label="${ctx.t("Segnalibri", "Bookmarks")}"><span class="jp-bookmarks-label">${ctx.t("Segnalibri", "Bookmarks")}</span>${marks.length ? marks.map((row) => (row.key.startsWith("e:") ? `<button type="button" class="button quiet" data-jp-route="${ctx.esc(JSON.stringify(tabItemRoute(row.key)))}">${ctx.esc(row.title)}</button>` : `<button type="button" class="button quiet" data-jp-open="${ctx.esc(row.key)}">${ctx.esc(row.title)}</button>`)).join("") : `<span class="campaign-meta">${ctx.t("Aggiungi una voce o una pagina con «Segnalibro».", "Add an entry or a page with “Bookmark”.")}</span>`}</div>`;
}
/** Records a visit to a Journal/World entry in the active tab (like opening a page). */
export function visitEntry(ctx, entryId, { newTab = false } = {}) {
  const storage = deviceStorage();
  const campaignId = ctx.state.campaign?.id;
  const tabs = readTabs(storage, campaignId, ctx.role);
  const next =
    currentPageId(tabs) === entryKey(entryId) && !newTab
      ? tabs
      : visitPage(tabs, entryKey(entryId), { newTab });
  if (next !== tabs) writeTabs(storage, campaignId, ctx.role, next);
  return next;
}
/** The tab bar and bookmarks shown above a Journal/World entry (the Archive's own bar). */
export function journalTabsHTML(ctx) {
  const tabs = readTabs(deviceStorage(), ctx.state.campaign?.id, ctx.role);
  return tabs.tabs.length || tabs.bookmarks.length
    ? `<div class="jp-reader jp-entry-tabs">${journalTabBar(ctx, tabs)}${journalBookmarkBar(ctx, tabs)}</div>`
    : "";
}
/** Handlers of the tab bar and bookmarks wherever they are drawn. */
export function bindJournalTabs(root, ctx) {
  const storage = deviceStorage();
  const campaignId = ctx.state.campaign?.id;
  const tabs = () => readTabs(storage, campaignId, ctx.role);
  const show = (next) => {
    writeTabs(storage, campaignId, ctx.role, next);
    const { page, ...params } = tabItemRoute(currentPageId(next));
    ctx.navigate(page, params);
  };
  root
    .querySelectorAll("[data-jp-back]")
    .forEach((button) => (button.onclick = () => show(stepTab(tabs(), -1))));
  root
    .querySelectorAll("[data-jp-forward]")
    .forEach((button) => (button.onclick = () => show(stepTab(tabs(), 1))));
  root.querySelectorAll("[data-jp-tab]").forEach((button) => {
    button.onclick = () => show(switchTab(tabs(), button.dataset.jpTab));
  });
  root.querySelectorAll("[data-jp-close-tab]").forEach((button) => {
    button.onclick = () => show(closeTab(tabs(), button.dataset.jpCloseTab));
  });
  root.querySelectorAll("[data-jp-new-tab]").forEach((button) => {
    button.onclick = () => show(newBlankTab(tabs()));
  });
  root.querySelectorAll("[data-jp-bookmark]").forEach((button) => {
    button.onclick = () => {
      writeTabs(storage, campaignId, ctx.role, toggleBookmark(tabs(), button.dataset.jpBookmark));
      ctx.render();
    };
  });
  root.querySelectorAll("[data-jp-open-entry-new]").forEach((button) => {
    button.onclick = () => {
      const next = visitPage(tabs(), entryKey(button.dataset.jpOpenEntryNew), { newTab: true });
      show(next);
    };
  });
}

// ---- @ and [[ suggestions while writing (Kanka @mentions, Roll20 [Name] links, CA-12).

/** The link being typed before the caret: {start, query, bracket} or null. */
export function typedLink(value, caret) {
  const before = str(value).slice(0, caret);
  const bracket = /\[\[([^[\]\n]{0,60})$/.exec(before);
  if (bracket) return { start: bracket.index, query: bracket[1], bracket: true };
  const at = /(^|[\s(«"])@([^\s@[\]]{0,40})$/u.exec(before);
  if (at && !/^Embed/i.test(at[2]))
    return { start: at.index + at[1].length, query: at[2], bracket: false };
  return null;
}
/** The text a chosen suggestion leaves in the field, and where the caret goes after it. */
export function completeLink(value, caret, typed, title) {
  const text = str(value);
  let end = caret;
  if (typed.bracket && text.slice(caret, caret + 2) === "]]") end += 2;
  const link = `[[${title}]]`;
  return {
    value: text.slice(0, typed.start) + link + text.slice(end),
    caret: typed.start + link.length,
    start: typed.start,
    end,
  };
}
let suggestSeq = 0;
/**
 * Attaches the suggestion list to every `[data-link-suggest]` field under root: typing @
 * or [[ lists readable titles (arrows, Enter or Tab, Esc; a tap works too) and the choice
 * becomes a [[link]]. A new title can be linked before its entry exists.
 */
export function bindLinkSuggest(root, ctx) {
  const doc = globalThis.document;
  if (!doc?.createElement) return;
  root.querySelectorAll("[data-link-suggest]").forEach((field) => {
    if (field.dataset.linkSuggestBound || typeof field.addEventListener !== "function") return;
    field.dataset.linkSuggestBound = "1";
    const id = `jp-suggest-${++suggestSeq}`;
    const list = doc.createElement("ul");
    list.className = "jp-suggest";
    list.id = id;
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", ctx.t("Collegamenti suggeriti", "Suggested links"));
    list.hidden = true;
    field.insertAdjacentElement?.("afterend", list);
    field.setAttribute("aria-autocomplete", "list");
    field.setAttribute("aria-controls", id);
    field.setAttribute("aria-expanded", "false");
    let state = null;
    const close = () => {
      state = null;
      list.hidden = true;
      list.innerHTML = "";
      field.setAttribute("aria-expanded", "false");
      field.removeAttribute("aria-activedescendant");
    };
    const draw = () => {
      list.innerHTML = state.options
        .map(
          (option, i) =>
            `<li role="option" id="${id}-${i}" class="jp-suggest-option" aria-selected="${i === state.active}" data-jp-suggest="${i}"><span>${ctx.esc(option.label)}</span><small>${ctx.esc(option.meta)}</small></li>`,
        )
        .join("");
      list.hidden = false;
      field.setAttribute("aria-expanded", "true");
      field.setAttribute("aria-activedescendant", `${id}-${state.active}`);
    };
    const choose = (index) => {
      const option = state?.options[index];
      if (!option) return close();
      const typed = state.typed;
      const done = completeLink(
        field.value,
        field.selectionStart ?? field.value.length,
        typed,
        option.title,
      );
      close();
      insertAtCaret(field, `[[${option.title}]]`, { start: done.start, end: done.end });
    };
    const update = () => {
      const caret = field.selectionStart ?? field.value.length;
      const typed = typedLink(field.value, caret);
      if (!typed) return close();
      const found = linkSuggestions(ctx.state, ctx.role, typed.query, { limit: 7 });
      const options = found.map((row) => ({
        title: row.title,
        label: row.title,
        meta:
          row.kind === "srd"
            ? "SRD"
            : row.kind === "actor"
              ? ctx.t("Scheda", "Sheet")
              : row.kind === "page"
                ? `${ctx.t("Archivio", "Archive")} · ${ctx.label(TYPE_LABELS[row.type] ?? TYPE_LABELS.page)}`
                : `${ctx.t("Voce", "Entry")} · ${kindName(ctx, row)}`,
      }));
      const q = typed.query.trim();
      if (q && !found.some((row) => norm(row.title) === norm(q)))
        options.push({
          title: q,
          label: ctx.t(`Collega «${q}» (da creare)`, `Link “${q}” (to create)`),
          meta: ctx.t("Diventa una voce quando la apri", "Becomes an entry when you open it"),
        });
      if (!options.length) return close();
      state = { typed, options, active: Math.min(state?.active ?? 0, options.length - 1) };
      draw();
    };
    field.addEventListener("input", update);
    field.addEventListener("click", update);
    field.addEventListener("blur", () => setTimeout(close, 150));
    field.addEventListener("keydown", (event) => {
      if (!state || event.isComposing) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const n = state.options.length;
        state.active = (state.active + (event.key === "ArrowDown" ? 1 : -1) + n) % n;
        draw();
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        choose(state.active);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    });
    list.addEventListener("pointerdown", (event) => {
      const option = event.target.closest?.("[data-jp-suggest]");
      if (!option) return;
      event.preventDefault();
      choose(Number(option.dataset.jpSuggest));
    });
  });
}

// ---- Nested entries and cut-to-new-entry (LegendKeeper [[name]] and Cut-to-New-Page, CA-16).

export const WORLD_TYPE_LABELS = Object.freeze({
  person: L("Persona", "Person"),
  place: L("Luogo", "Place"),
  faction: L("Fazione o organizzazione", "Faction or organization"),
  shop: L("Negozio", "Shop"),
  event: L("Evento", "Event"),
  list: L("Elenco", "Checklist"),
  other: L("Altra voce", "Other entry"),
});
const worldTypeOptions = (ctx, selected = "other") =>
  ENTRY_WORLD_TYPES.map(
    (type) =>
      `<option value="${type}" ${type === selected ? "selected" : ""}>${ctx.esc(ctx.label(WORLD_TYPE_LABELS[type]))}</option>`,
  ).join("");
/**
 * Creates a World entry inside another (or free-standing) in one step: from a [[link]] to
 * a missing title, or from text moved out of an editor. It starts with the same readers
 * as the entry that holds it when its author is the same; otherwise only you read it.
 */
export function openCreateEntry(
  ctx,
  { title = "", parentId = null, secret = false, body = "", onCreated = null } = {},
) {
  const parent = parentId
    ? readableEntries(ctx.state, ctx.role).find((row) => row.id === parentId)
    : null;
  const inherits = parent?.access && parent.ownerId === ctx.role && !secret;
  const access = inherits ? parent.access : { mode: "private", grants: [] };
  ctx.dialog(
    body
      ? ctx.t("Sposta in una nuova voce", "Move to a new entry")
      : ctx.t("Crea la voce annidata", "Create the nested entry"),
    `${parent ? `<p>${ctx.t("Nuova voce dentro", "New entry inside")} «${ctx.esc(parent.data.title || ctx.t("Voce senza titolo", "Untitled entry"))}».</p>` : ""}<label class="field">${ctx.t("Titolo", "Title")}<input name="title" required maxlength="200" value="${ctx.esc(title)}" autocomplete="off"></label><label class="field">${ctx.t("Tipo", "Type")}<select name="worldType">${worldTypeOptions(ctx)}</select></label>${body ? `<p class="campaign-meta">${ctx.t("Il testo selezionato diventa la nuova voce; al suo posto resta il collegamento.", "The selected text becomes the new entry; a link stays in its place.")}</p><blockquote class="jp-quote">${ctx.esc(body.length > 400 ? body.slice(0, 399) + "…" : body)}</blockquote>` : ""}<p class="campaign-meta">${
      inherits && access.mode !== "private"
        ? ctx.t(
            "Parte con gli stessi lettori della voce che la contiene. Puoi cambiarli dalla voce.",
            "It starts with the same readers as the entry that holds it. You can change them from the entry.",
          )
        : secret
          ? ctx.t(
              "Il collegamento è in un testo segreto: la voce parte visibile solo a te.",
              "The link is in secret text: the entry starts visible to you only.",
            )
          : ctx.t(
              "Parte visibile solo a te («Solo io»): la condividi dalla voce.",
              "It starts visible to you only (“Only me”): share it from the entry.",
            )
    }</p>`,
    {
      submitLabel: body
        ? ctx.t("Crea e collega", "Create and link")
        : ctx.t("Crea voce", "Create entry"),
      onSubmit: (formData) =>
        attempt(ctx, () => {
          const wanted = String(formData.get("title") ?? "").trim();
          if (!wanted)
            throw Object.assign(new Error("title"), {
              it: "Scrivi un titolo per la nuova voce.",
              en: "Write a title for the new entry.",
            });
          let result;
          ctx.commit(
            ctx.t("Voce creata", "Entry created"),
            (draft) => {
              result = createCampaignEntryNow(
                draft,
                {
                  kind: "world",
                  worldType: String(formData.get("worldType") || "other"),
                  title: wanted,
                  body,
                  parentId: parent?.id ?? null,
                  access,
                },
                ctx.role,
                { online: !ctx.offline },
              );
            },
            { local: access.mode === "private", visibility: "private", undoable: false },
          );
          if (onCreated) onCreated(wanted, result);
          else ctx.navigate("campaign", { tab: "entry", id: result.entryId });
          return result;
        }),
    },
  );
}
/** «Sposta la selezione in una nuova voce» for any text field (LegendKeeper Cut-to-New-Page). */
export function cutSelectionToEntry(ctx, field, { parentId = null, onLink = null } = {}) {
  if (!field || typeof field.value !== "string") return false;
  const start = field.selectionStart ?? 0;
  const end = field.selectionEnd ?? 0;
  const body = field.value.slice(start, end).trim();
  if (!body) {
    ctx.toast(
      ctx.t(
        "Seleziona prima il testo da spostare: trascina sul testo o tieni premuto Maiusc con le frecce.",
        "Select the text to move first: drag over it or hold Shift with the arrow keys.",
      ),
      true,
    );
    return false;
  }
  const title = body.split("\n")[0].replace(/[[\]]/g, "").trim().slice(0, 80);
  openCreateEntry(ctx, {
    title,
    parentId,
    body,
    // The editor may be drawn again by the creation: its owner puts the link in its own
    // working copy (onLink); a plain field gets it directly.
    onCreated: (wanted) =>
      onLink
        ? onLink(`[[${wanted}]]`, start, end)
        : insertAtCaret(field, `[[${wanted}]]`, { start, end }),
  });
  return true;
}

// ---- Templates and kits for every entry (Kanka Property Kits, World Anvil templates, CA-17).

/** Built-in kits and this identity's templates for an editor's «Modello» choice. */
export function templateChoices(ctx, kind = "world") {
  const own = listEntryTemplates(ctx.state, ctx.role).filter(
    (row) =>
      row.kind === kind ||
      (kind === "world" && row.kind === "page") ||
      (kind === "page" && row.kind === "world"),
  );
  return [
    ...own.map((row) => ({
      id: "tpl:" + row.id,
      label: row.name,
      template: row,
      mine: row.ownerId === ctx.role,
    })),
    ...Object.entries(KITS).map(([id, kit]) => ({
      id: "kit:" + id,
      label: `${ctx.label(kit.label)} · ${ctx.t("kit", "kit")}`,
      template: {
        name: ctx.label(kit.label),
        kind,
        worldType:
          {
            tavern: "place",
            shop: "shop",
            organization: "faction",
            person: "person",
            place: "place",
            event: "event",
          }[id] ?? "other",
        fields: kit.fields.map(([label, secret]) => ({ label: ctx.label(label), secret })),
        body: "",
        sections: [],
      },
    })),
  ];
}
/** What a chosen template adds to an entry being written: text lines and a DM-only section. */
export function templateForEntry(ctx, choice) {
  const tpl = choice?.template;
  if (!tpl) return null;
  const open = tpl.fields.filter((field) => !field.secret).map((field) => `${field.label}: `);
  const hidden = tpl.fields.filter((field) => field.secret).map((field) => `${field.label}: `);
  return {
    worldType: tpl.worldType,
    title: tpl.title || "",
    body: [...open, ...(tpl.body ? ["", tpl.body] : [])].join("\n"),
    sections: [
      ...(hidden.length
        ? [{ title: ctx.t("Segreti", "Secrets"), body: hidden.join("\n"), secret: true }]
        : []),
      ...(tpl.sections ?? []),
    ],
  };
}
/** «Salva come modello» for an Archive page or a Journal/World entry. */
export function openSaveTemplate(ctx, { pageId = null, entryId = null } = {}) {
  let input = null;
  if (pageId) {
    const page = readPage(ctx.state, pageId, ctx.role);
    if (!page) return;
    input = {
      name: page.title,
      kind: "page",
      pageType: page.type,
      worldType: Object.entries(ENTRY_TYPES).find(([, type]) => type === page.type)?.[0] ?? "other",
      fields: page.properties.map((p) => ({
        label: labelText(ctx, p.label),
        secret: p.secret === true,
      })),
      body: page.blocks
        .filter((b) => b.kind === "text")
        .map((b) => b.text)
        .join("\n\n"),
      sections: page.blocks
        .filter((b) => b.kind !== "text")
        .map((b) => ({ title: "", body: b.text, secret: true })),
    };
  } else {
    const entry = readableEntries(ctx.state, ctx.role).find((row) => row.id === entryId);
    if (!entry) return;
    const props = textProperties(entry.data.body);
    const rest = str(entry.data.body).split("\n").slice(props.length).join("\n").trim();
    input = {
      name: entry.data.title,
      kind: entry.kind,
      worldType: entry.data.worldType,
      fields: props.map((p) => ({ label: p.label, secret: false })),
      body: rest,
      sections: (entry.data.sections ?? []).map((section) => ({
        title: section.title,
        body: section.body,
        secret: Boolean(section.access && section.access.mode !== "campaign"),
      })),
    };
  }
  const dm = isDM(ctx.state, ctx.role);
  ctx.dialog(
    ctx.t("Salva come modello", "Save as template"),
    `<p class="campaign-meta">${ctx.t("Il modello conserva i campi, il testo e le sezioni segrete, senza i valori dei campi. Lo trovi in «Nuova voce» e in «Nuova pagina» come «Parti da un modello».", "The template keeps the fields, the text and the secret sections, without the field values. You find it in “New entry” and “New page” under “Start from a template”.")}</p><label class="field">${ctx.t("Nome del modello", "Template name")}<input name="name" required maxlength="80" value="${ctx.esc(input.name ? ctx.t(`${input.name} (modello)`, `${input.name} (template)`) : "")}"></label>${dm ? `<label class="campaign-check"><input type="checkbox" name="shared">${ctx.t("Condividi con il gruppo della campagna", "Share with the campaign group")}</label>` : ""}`,
    {
      submitLabel: ctx.t("Salva modello", "Save template"),
      onSubmit: (formData) =>
        attempt(ctx, () => {
          const shared = formData.get("shared") === "on";
          ctx.commit(
            ctx.t("Modello salvato", "Template saved"),
            (draft) =>
              saveEntryTemplate(
                draft,
                { ...input, name: String(formData.get("name") ?? ""), shared },
                ctx.role,
              ),
            { local: !shared, visibility: "private", undoable: false },
          );
          ctx.toast(
            ctx.t(
              "Modello salvato: lo trovi in «Nuova voce».",
              "Template saved: find it in “New entry”.",
            ),
          );
        }),
    },
  );
}
// Test seams (Node): the page view as rendered for one identity.
export const _test = { pageView };
