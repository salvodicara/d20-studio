// B15 domain: materials (handouts, location entries with headings, vignettes, revealed
// art), map pins, map-less scenes and the per-identity "seen" marks. Pure functions over a
// state (or a commit draft); UI and registration live in handouts.mjs.
//
// Adopted patterns (census IDs): Alchemy handout with image, text and a panel to reopen
// (VTL-080/162); Roll20 GM Notes kept apart from the player part (R20-056); Foundry "Show
// Players" to everyone or to selected users (FVT-162) and Roll20 "show grants view"
// (R20-055); Roll20 pins linked to a handout heading, hidden by default, excerpt only
// (R20-099); D&D Beyond DM pins and Theater of the Mind organizer (DDB-099/100/101);
// D&D Beyond Reveal from a token and Reveals browser (DDB-129/130/131); DOS2 vignettes
// (CRP-072). Local two-identity simulation: no backend access control.
//
// Other areas, read only: pins may link to Campaign › World entries through the
// campaign-content projection (per-section audience kept); images come from the B28 media
// library (Library › Images and files) as well as the built-in synthetic art, and a
// personal library file is shown to players only once B28 shares it with the campaign
// (provenance and licence required there, Roll20 SVC-138).

import { canControlActor, isActorAvailable, isCampaignActor } from "./character-access.mjs";
import {
  campaignMembers,
  getCampaignEntry,
  isCampaignMember,
  listCampaignEntries,
} from "./campaign-content.mjs";
import {
  canSeeAsset,
  findAsset,
  portraitArt,
  tokenArt,
  visibleAssets,
  shareAsset,
} from "./media-domain.mjs";
import { ART, builtInArt } from "./handouts-art.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const SLICE = "handouts";
export const SEEN_SLICE = "handouts-seen";
const PREP_SLICE = "handouts-prep";
export const VERSION = 1;
export const SOURCE = Object.freeze({
  kind: "authored-demo",
  revision: "blueprint-b15-1",
  note: "Synthetic campaign material for the prototype; not official adventure text.",
});
// Images uploaded here before B28 existed stay readable; new uploads go to B28.
export const IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
export const MEDIA_PREFIX = "media:";
export const PIN_KINDS = Object.freeze(["location", "shop", "trap", "oddity", "treasure"]);
export const LIMITS = Object.freeze({
  title: 120,
  text: 4000,
  heading: 120,
  sections: 12,
  choice: 200,
  choices: 6,
  label: 80,
  excerpt: 600,
  reason: 300,
  scene: 100,
  // DM-only organising tags (Alchemy handout metadata tags, VTL-080).
  tags: 12,
  tag: 40,
});

const clone = (value) => structuredClone(value);
const now = () => new Date().toISOString();
const newId = (prefix) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const str = (value) => (typeof value === "string" ? value : "");

/** A refusal shown to the user in both languages (ctx.commit marks it as a refusal). */
export function fail(it, en) {
  throw Object.assign(new Error(it), { it, en });
}
function requireDM(role) {
  if (role !== "dm")
    fail(
      "Solo il DM può gestire materiali e spilli.",
      "Only the DM can manage materials and pins.",
    );
}
function text(value, max, it, en, { required = false } = {}) {
  const result = str(value).trim();
  if (required && !result) fail(`${it}: campo obbligatorio.`, `${en}: required field.`);
  if (result.length > max)
    fail(`${it}: massimo ${max} caratteri.`, `${en}: at most ${max} characters.`);
  return result;
}

// ---------------------------------------------------------------------------------------
// Slices: seed and normalize

export function seedHandouts() {
  const at = sampleDate("2026-09-17T20:40:00.000Z");
  return {
    materials: [
      {
        id: "material-crypt",
        kind: "handout",
        title: "Cripta sotto l’osservatorio",
        image: { artId: "art-crypt" },
        playerText: "",
        dmNote:
          "Voce di preparazione: le intestazioni servono da chiave per gli spilli sulla mappa del cortile.",
        sections: [
          {
            id: "crypt-entrance",
            heading: "Ingresso",
            playerText:
              "Una scala di pietra scende sotto il cortile. L’aria sa di cera fredda e di ferro.",
            dmText:
              "Lastra a pressione sul terzo gradino: chi la calpesta fa suonare la campana nella torre.",
          },
          {
            id: "crypt-sarcophagus",
            heading: "Sarcofago del custode",
            playerText: "Un sarcofago di pietra, il coperchio spostato di un palmo.",
            dmText:
              "È vuoto: il corpo di Maestro Oben è stato portato nella torre. Il forziere accanto è un mimic.",
          },
          {
            id: "crypt-passage",
            heading: "Passaggio della lanterna",
            playerText: "Un filo d’aria muove la polvere verso la parete nord.",
            dmText: "Porta segreta verso la base della torre: si apre ruotando il braciere spento.",
          },
        ],
        choices: [],
        tags: ["cripta", "osservatorio"],
        actorId: null,
        sceneIds: ["old-watch"],
        access: { mode: "none", actorIds: [] },
        shows: [],
        responses: {},
        outcome: null,
        corrections: [],
        source: SOURCE,
        createdAt: at,
        updatedAt: at,
      },
      {
        id: "material-notice",
        kind: "handout",
        title: "Avviso della gilda delle lanterne",
        image: { artId: "art-notice" },
        playerText:
          "Cercasi custodi per la lanterna del vecchio osservatorio. Paga: 10 monete d’oro a notte. Rivolgersi a Maestro Oben, alla torre.",
        dmNote: "L’avviso è vecchio di un mese: Oben è scomparso da tre giorni.",
        sections: [],
        choices: [],
        tags: ["gilda", "Oben"],
        actorId: null,
        sceneIds: [],
        access: { mode: "all", actorIds: [] },
        shows: [
          {
            id: "show-seed-notice",
            at: sampleDate("2026-09-10T20:15:00.000Z"),
            recipients: { mode: "all", actorIds: [] },
          },
        ],
        responses: {},
        outcome: null,
        corrections: [],
        source: SOURCE,
        createdAt: sampleDate("2026-09-10T19:30:00.000Z"),
        updatedAt: sampleDate("2026-09-10T20:15:00.000Z"),
      },
      {
        id: "material-wagon",
        kind: "vignette",
        title: "Il carro rovesciato",
        image: { artId: "art-wagon" },
        playerText:
          "Sulla strada per l’osservatorio un carro giace su un fianco. Il mercante si tiene la gamba; tracce di piedi piccoli e nudi portano verso il bosco.",
        dmNote:
          "Il mercante trasportava olio per la lanterna. Le tracce sono dei goblin del cortile.",
        sections: [],
        choices: [
          { id: "wagon-help", text: "Aiutare il mercante a rialzare il carro" },
          { id: "wagon-tracks", text: "Seguire le tracce verso il bosco" },
          { id: "wagon-tower", text: "Proseguire subito verso la torre" },
        ],
        tags: ["strada", "goblin"],
        actorId: null,
        sceneIds: [],
        access: { mode: "none", actorIds: [] },
        shows: [],
        responses: {},
        outcome: null,
        corrections: [],
        source: SOURCE,
        createdAt: at,
        updatedAt: at,
      },
    ],
    pins: [
      {
        id: "pin-well",
        sceneId: "old-watch",
        x: 560,
        y: 290,
        label: "Pozzo del cortile",
        kind: "oddity",
        link: null,
        excerpt: "",
        excerptLinked: false,
        dmNote: "Sul fondo luccica una chiave d’ottone: apre la porta della torre.",
        visible: false,
        createdAt: at,
      },
    ],
    stages: {},
    uploads: [],
  };
}

const MATERIAL_KINDS = ["handout", "vignette", "art"];
function normalizeMaterial(raw) {
  if (!isObject(raw) || typeof raw.id !== "string" || !MATERIAL_KINDS.includes(raw.kind))
    return null;
  const access = isObject(raw.access) ? raw.access : {};
  return {
    ...raw,
    title: str(raw.title),
    image:
      isObject(raw.image) && typeof raw.image.artId === "string"
        ? { artId: raw.image.artId }
        : null,
    playerText: str(raw.playerText),
    dmNote: str(raw.dmNote),
    sections: Array.isArray(raw.sections) ? raw.sections.filter(isObject) : [],
    choices: Array.isArray(raw.choices) ? raw.choices.filter(isObject) : [],
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag) => typeof tag === "string") : [],
    actorId: typeof raw.actorId === "string" ? raw.actorId : null,
    sceneIds: Array.isArray(raw.sceneIds)
      ? raw.sceneIds.filter((id) => typeof id === "string")
      : [],
    access: {
      mode: ["none", "all", "some"].includes(access.mode) ? access.mode : "none",
      actorIds: Array.isArray(access.actorIds)
        ? access.actorIds.filter((id) => typeof id === "string")
        : [],
    },
    shows: Array.isArray(raw.shows) ? raw.shows.filter(isObject) : [],
    responses: isObject(raw.responses) ? raw.responses : {},
    outcome: isObject(raw.outcome) ? raw.outcome : null,
    corrections: Array.isArray(raw.corrections) ? raw.corrections.filter(isObject) : [],
  };
}
export function normalizeHandouts(slice, fromVersion) {
  if (fromVersion > VERSION) throw Error("Saved handouts come from a newer version");
  const value = isObject(slice) ? slice : {};
  return {
    materials: (Array.isArray(value.materials) ? value.materials : [])
      .map(normalizeMaterial)
      .filter(Boolean),
    pins: (Array.isArray(value.pins) ? value.pins : []).filter(
      (pin) => isObject(pin) && typeof pin.id === "string" && typeof pin.sceneId === "string",
    ),
    stages: isObject(value.stages) ? value.stages : {},
    uploads: (Array.isArray(value.uploads) ? value.uploads : []).filter(
      (upload) =>
        isObject(upload) && typeof upload.id === "string" && IMAGE_PATTERN.test(str(upload.image)),
    ),
  };
}
// The seeded notice was shown in an earlier session and already read by the player.
export const seedSeen = () => ({ player: ["show-seed-notice"], dm: [] });
export function normalizeSeen(slice, fromVersion) {
  if (fromVersion > VERSION) throw Error("Saved read marks come from a newer version");
  const result = {};
  for (const [role, ids] of Object.entries(isObject(slice) ? slice : {}))
    if (Array.isArray(ids)) result[role] = ids.filter((id) => typeof id === "string");
  result.player ??= [];
  result.dm ??= [];
  return result;
}

function sliceOf(state) {
  const value = state?.ext?.[SLICE];
  if (!value) fail("Materiali non disponibili.", "Materials unavailable.");
  return value;
}
function seenOf(state) {
  return (state.ext[SEEN_SLICE] ??= { player: [], dm: [] });
}
function findMaterial(state, id) {
  return (
    sliceOf(state).materials.find((m) => m.id === id) ??
    fail("Materiale non trovato.", "Material not found.")
  );
}
function findPin(state, id) {
  return (
    sliceOf(state).pins.find((p) => p.id === id) ?? fail("Spillo non trovato.", "Pin not found.")
  );
}
function findScene(state, id) {
  return state.scenes?.find((s) => s.id === id) ?? fail("Scena non trovata.", "Scene not found.");
}

// ---------------------------------------------------------------------------------------
// Party, recipients and access

/** Party characters that can receive material, with the identity that plays them. */
export function partyCharacters(state) {
  const campaignId = state.campaign?.id;
  return Object.values(state.actors ?? {})
    .filter(
      (actor) =>
        actor?.kind === "character" &&
        !actor.companion &&
        isActorAvailable(actor) &&
        actor.visibility !== "private" &&
        isCampaignActor(actor, campaignId),
    )
    .map((actor) => ({ id: actor.id, name: actor.name, controller: actor.owner }));
}
export function controlsActor(state, actorId, role) {
  return canControlActor(state.actors?.[actorId], role, state);
}
function recipientIncludes(state, recipients, role) {
  if (!recipients) return false;
  if (recipients.mode === "all") return isCampaignMember(state, state.campaign?.id, role);
  if (recipients.mode === "some")
    return recipients.actorIds.some((id) => role !== "dm" && controlsActor(state, id, role));
  return false;
}
/** Whether this identity may open the player part of a material. The DM reads everything. */
export function canReadMaterial(state, material, role) {
  if (!material) return false;
  if (role === "dm") return true;
  if (!isCampaignMember(state, state.campaign?.id, role)) return false;
  return recipientIncludes(state, material.access, role);
}
/** Characters of this identity that are among the material's recipients. */
export function recipientActors(state, material, role) {
  if (role === "dm") return [];
  return partyCharacters(state)
    .filter((c) => controlsActor(state, c.id, role))
    .filter((c) => material.access.mode === "all" || material.access.actorIds.includes(c.id))
    .map((c) => c.id);
}
function normalizeRecipients(state, input) {
  const party = partyCharacters(state).map((c) => c.id);
  if (input?.mode === "all") return { mode: "all", actorIds: [] };
  const ids = [...new Set(Array.isArray(input?.actorIds) ? input.actorIds : [])];
  if (!ids.length)
    fail("Scegli almeno un personaggio destinatario.", "Choose at least one recipient character.");
  if (ids.some((id) => !party.includes(id)))
    fail(
      "Destinatario non valido: non fa parte del gruppo.",
      "Invalid recipient: not in the party.",
    );
  return { mode: "some", actorIds: ids };
}

// ---------------------------------------------------------------------------------------
// Images: built-in art, legacy uploads and the B28 media library (read only)

function mediaAsset(state, artId) {
  if (typeof artId !== "string" || !artId.startsWith(MEDIA_PREFIX)) return null;
  const asset = findAsset(state, artId.slice(MEDIA_PREFIX.length));
  return asset?.kind === "image" ? asset : null;
}
const mediaArt = (asset) => ({
  id: MEDIA_PREFIX + asset.id,
  title: { it: asset.name, en: asset.name },
  tags: Array.isArray(asset.tags) ? asset.tags : [],
  image: asset.dataUrl,
  uploaded: false,
  media: true,
  shared: Boolean(asset.shared),
});
/** Every image this identity (the DM, by default) may pick: built-in art first, then any
 * image uploaded here earlier, then the B28 library images it can see. */
export function artList(state, viewer = "dm") {
  const uploads = viewer === "dm" ? (state?.ext?.[SLICE]?.uploads ?? []) : [];
  return [
    ...ART.map((art) => ({
      id: art.id,
      title: art.title,
      tags: art.tags,
      image: art.image,
      uploaded: false,
    })),
    ...uploads.map((u) => ({
      id: u.id,
      title: { it: u.title, en: u.title },
      tags: [],
      image: u.image,
      uploaded: true,
    })),
    ...visibleAssets(state, viewer)
      .filter((asset) => asset.kind === "image")
      .map(mediaArt),
  ];
}
/** The image behind an art id as this identity may see it, or null. A library image the
 * viewer cannot see (a personal file not shared) resolves to nothing. */
export function resolveArt(state, artId, viewer = "dm") {
  if (!artId) return null;
  const builtIn = builtInArt(artId);
  if (builtIn)
    return { id: builtIn.id, title: builtIn.title, image: builtIn.image, tags: builtIn.tags };
  const asset = mediaAsset(state, artId);
  if (asset) return canSeeAsset(state, asset, viewer) ? mediaArt(asset) : null;
  const upload = state?.ext?.[SLICE]?.uploads?.find((u) => u.id === artId);
  return upload && IMAGE_PATTERN.test(upload.image)
    ? {
        id: upload.id,
        title: { it: upload.title, en: upload.title },
        image: upload.image,
        tags: [],
      }
    : null;
}
/** B28 rule: a personal library file reaches other people only once its owner shares it
 * with the campaign, with provenance and licence (Library › Images and files). */
export function shareRefusal(state, artId) {
  const asset = mediaAsset(state, artId);
  if (!asset || asset.shared) return null;
  return {
    it: `«${asset.name}» è nella tua libreria personale: condividila con la campagna da Biblioteca › Immagini e file, con provenienza e licenza, prima di mostrarla.`,
    en: `“${asset.name}” is in your personal library: share it with the campaign from Library › Images and files, with its source and licence, before showing it.`,
  };
}
function requireShareable(state, artId) {
  const refusal = shareRefusal(state, artId);
  if (refusal) fail(refusal.it, refusal.en);
}
/** Search the image library, fuzzy and recall-biased (DDB-129): every word may match. */
export function searchArt(state, query, lang = "it") {
  const words = str(query).toLowerCase().split(/\s+/).filter(Boolean);
  const all = artList(state);
  if (!words.length) return all;
  const score = (art) => {
    const hay = [art.title.it, art.title.en, ...art.tags].join(" ").toLowerCase();
    return words.filter((w) => hay.includes(w) || hay.includes(w.slice(0, 4))).length;
  };
  return all
    .map((art) => ({ art, score: score(art) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.art.title[lang].localeCompare(b.art.title[lang]))
    .map((row) => row.art);
}
/** Art that really belongs to a creature (DDB-130 reveals the token's own art): its B28
 * portrait and token image when the DM can see them, then built-in art whose tags match
 * its id or name (a "Mimic" token → the chest with teeth). Empty when nothing matches. */
export function matchArt(state, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor) return [];
  const own = [portraitArt(state, actorId)?.asset, tokenArt(state, actorId)?.asset]
    .filter((asset) => asset?.kind === "image" && canSeeAsset(state, asset, "dm"))
    .filter((asset, i, rows) => rows.findIndex((row) => row.id === asset.id) === i)
    .map(mediaArt);
  const words = `${actor.id} ${actor.name}`
    .toLowerCase()
    .split(/[^a-zà-ù0-9]+/)
    .filter((w) => w.length > 2);
  const tagged = ART.filter((art) =>
    words.some((w) => art.tags.some((tag) => tag.startsWith(w) || w.startsWith(tag))),
  ).map((art) => ({ id: art.id, title: art.title, tags: art.tags, image: art.image }));
  return [...own, ...tagged];
}
/** The matched art to preselect (TV-109, D&D Beyond Reveal): the creature's own art first,
 *  even a personal image (the reveal dialog shares it inline), then matching built-in art. */
export function preferredArt(state, actorId) {
  return matchArt(state, actorId)[0] ?? null;
}
/** The personal image behind an art id that must be shared before players see it. */
export function personalMedia(state, artId) {
  const asset = mediaAsset(state, artId);
  return asset && !asset.shared ? asset : null;
}
/** Matches first, then the rest of the library. */
export function suggestArt(state, actorId) {
  const matched = matchArt(state, actorId);
  if (!state.actors?.[actorId]) return [];
  return [...matched, ...artList(state).filter((art) => !matched.some((m) => m.id === art.id))];
}

// ---------------------------------------------------------------------------------------
// Materials: authoring

function cleanSections(state, input, previous = []) {
  const rows = Array.isArray(input) ? input : [];
  if (rows.length > LIMITS.sections)
    fail(`Massimo ${LIMITS.sections} intestazioni.`, `At most ${LIMITS.sections} headings.`);
  return rows
    .map((row) => ({
      id: previous.some((p) => p.id === row?.id) ? row.id : newId("heading"),
      heading: text(row?.heading, LIMITS.heading, "Intestazione", "Heading"),
      playerText: text(
        row?.playerText,
        LIMITS.excerpt,
        "Estratto per i giocatori",
        "Player excerpt",
      ),
      dmText: text(row?.dmText, LIMITS.text, "Nota del DM dell’intestazione", "Heading DM note"),
    }))
    .filter((row) => row.heading || row.playerText || row.dmText)
    .map((row) => {
      if (!row.heading)
        fail("Ogni sezione ha bisogno di un’intestazione.", "Every section needs a heading.");
      return row;
    });
}
function cleanChoices(input, material) {
  const rows = (Array.isArray(input) ? input : [])
    .map((row) => ({
      id: material?.choices.some((c) => c.id === row?.id) ? row.id : newId("choice"),
      text: text(row?.text, LIMITS.choice, "Scelta", "Choice"),
    }))
    .filter((row) => row.text);
  if (rows.length < 2 || rows.length > LIMITS.choices)
    fail("Una vignetta ha da 2 a 6 scelte.", "A vignette has 2 to 6 choices.");
  const used = new Set(Object.values(material?.responses ?? {}).map((r) => r.choiceId));
  if (material?.outcome) used.add(material.outcome.choiceId);
  for (const id of used)
    if (!rows.some((row) => row.id === id))
      fail(
        "Una scelta già votata o decisa non si può togliere: modificane il testo.",
        "A choice already picked or decided cannot be removed: edit its text instead.",
      );
  return rows;
}
function cleanTags(input) {
  const tags = [];
  for (const raw of Array.isArray(input) ? input : []) {
    const tag = text(raw, LIMITS.tag, "Etichetta", "Tag");
    if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  if (tags.length > LIMITS.tags)
    fail(`Massimo ${LIMITS.tags} etichette.`, `At most ${LIMITS.tags} tags.`);
  return tags;
}
/** A pin whose live excerpt is about to lose its source keeps the text it showed. */
function freezeExcerpt(state, pin) {
  if (!pin.excerptLinked) return;
  pin.excerpt = linkExcerpt(state, pin.link);
  pin.excerptLinked = false;
}
/** Creates or updates a handout or vignette. Returns its id. */
export function saveMaterial(state, input, role) {
  requireDM(role);
  const slice = sliceOf(state);
  const existing = input.id ? findMaterial(state, input.id) : null;
  const kind = existing?.kind ?? input.kind;
  if (!["handout", "vignette"].includes(kind))
    fail("Tipo di materiale non valido.", "Invalid material kind.");
  const artId = input.image?.artId ?? null;
  if (artId && !resolveArt(state, artId)) fail("Immagine non trovata.", "Image not found.");
  const sceneIds = [...new Set(Array.isArray(input.sceneIds) ? input.sceneIds : [])];
  for (const id of sceneIds) findScene(state, id);
  const values = {
    title: text(input.title, LIMITS.title, "Titolo", "Title", { required: true }),
    image: artId ? { artId } : null,
    playerText: text(input.playerText, LIMITS.text, "Testo per i giocatori", "Player text"),
    dmNote: text(input.dmNote, LIMITS.text, "Nota del DM", "DM note"),
    sections: cleanSections(state, input.sections, existing?.sections),
    choices: kind === "vignette" ? cleanChoices(input.choices, existing) : [],
    tags: input.tags === undefined ? [...(existing?.tags ?? [])] : cleanTags(input.tags),
    sceneIds,
    updatedAt: now(),
  };
  if (existing) {
    // A removed heading unlinks its pins instead of leaving a dangling anchor.
    const orphans = slice.pins.filter(
      (pin) =>
        pin.link?.materialId === existing.id &&
        pin.link.sectionId &&
        !values.sections.some((s) => s.id === pin.link.sectionId),
    );
    for (const pin of orphans) freezeExcerpt(state, pin);
    Object.assign(existing, values);
    for (const pin of orphans) pin.link = { materialId: existing.id, sectionId: null };
    return existing.id;
  }
  const material = {
    id: newId("material"),
    kind,
    ...values,
    actorId: null,
    access: { mode: "none", actorIds: [] },
    shows: [],
    responses: {},
    outcome: null,
    corrections: [],
    source: { kind: "authored", revision: "dm" },
    createdAt: values.updatedAt,
  };
  slice.materials.push(material);
  return material.id;
}
/** A reusable copy of a handout or vignette (DOS2 vignette cards kept for reuse, CRP-072):
 * same text, image, headings, choices, tags and linked scenes; new ids; DM-only again, with
 * no shows, picks, outcome or corrections. Returns the copy's id. */
export function duplicateMaterial(state, id, role, { suffix = "(copia)" } = {}) {
  requireDM(role);
  const source = findMaterial(state, id);
  if (!["handout", "vignette"].includes(source.kind))
    fail("Si duplicano solo handout e vignette.", "Only handouts and vignettes can be duplicated.");
  const tail = ` ${suffix}`;
  const at = now();
  const copy = {
    ...clone(source),
    id: newId("material"),
    title: source.title.slice(0, LIMITS.title - tail.length) + tail,
    sections: source.sections.map((s) => ({ ...clone(s), id: newId("heading") })),
    choices: source.choices.map((c) => ({ ...clone(c), id: newId("choice") })),
    actorId: null,
    access: { mode: "none", actorIds: [] },
    shows: [],
    responses: {},
    outcome: null,
    corrections: [],
    source: { kind: "authored", revision: "dm" },
    duplicatedFrom: source.id,
    createdAt: at,
    updatedAt: at,
  };
  sliceOf(state).materials.push(copy);
  return copy.id;
}
/** Deletes a material; its pins keep their text without the link and prep-sheet rows that
 * pointed at it drop the link (one Undo restores all of it). */
export function deleteMaterial(state, id, role) {
  requireDM(role);
  const slice = sliceOf(state);
  findMaterial(state, id);
  for (const pin of slice.pins)
    if (pin.link?.materialId === id) {
      freezeExcerpt(state, pin);
      pin.link = null;
    }
  slice.materials = slice.materials.filter((m) => m.id !== id);
  for (const sheet of state.ext?.[PREP_SLICE]?.sheets ?? [])
    for (const row of sheet.lists?.locations ?? [])
      if (row.materialId === id) row.materialId = null;
}

// ---------------------------------------------------------------------------------------
// Show, withdraw, seen

/** Foundry "Show Players": pushes the material to everyone or to chosen characters and
 * grants them reopening (Roll20 R20-055). Returns the new show id. */
export function showMaterial(state, id, recipients, role, at = now()) {
  requireDM(role);
  const material = findMaterial(state, id);
  requireShareable(state, material.image?.artId);
  const target = normalizeRecipients(state, recipients);
  const previous = material.access;
  material.access =
    previous.mode === "all" || target.mode === "all"
      ? { mode: "all", actorIds: [] }
      : {
          mode: "some",
          actorIds: [
            ...new Set([
              ...(previous.mode === "some" ? previous.actorIds : []),
              ...target.actorIds,
            ]),
          ],
        };
  const show = { id: newId("show"), at, recipients: target };
  material.shows.push(show);
  return show.id;
}
/** Withdraws reading access (all, or some characters). A correction: the reason is
 * required and kept with the material. */
export function withdrawMaterial(
  state,
  id,
  { actorIds = null, reason = "" } = {},
  role,
  at = now(),
) {
  requireDM(role);
  const material = findMaterial(state, id);
  const before = clone(material.access);
  if (before.mode === "none") fail("Il materiale non è condiviso.", "The material is not shared.");
  const why = text(reason, LIMITS.reason, "Motivo", "Reason", { required: true });
  if (!actorIds) material.access = { mode: "none", actorIds: [] };
  else {
    if (!actorIds.length)
      fail("Scegli da quali personaggi ritirarlo.", "Choose which characters to withdraw it from.");
    const keep =
      before.mode === "all"
        ? partyCharacters(state)
            .map((c) => c.id)
            .filter((c) => !actorIds.includes(c))
        : before.actorIds.filter((c) => !actorIds.includes(c));
    material.access = keep.length
      ? { mode: "some", actorIds: keep }
      : { mode: "none", actorIds: [] };
  }
  material.corrections.push({
    id: newId("correction"),
    kind: "access",
    at,
    from: before,
    to: clone(material.access),
    reason: why,
  });
}
/** Shows this identity has not seen yet, for materials it can still read. */
export function unseenShows(state, role) {
  if (role === "dm") return [];
  const seen = new Set(state.ext?.[SEEN_SLICE]?.[role] ?? []);
  const rows = [];
  for (const material of state.ext?.[SLICE]?.materials ?? []) {
    if (!canReadMaterial(state, material, role)) continue;
    for (const show of material.shows)
      if (!seen.has(show.id) && recipientIncludes(state, show.recipients, role))
        rows.push({
          showId: show.id,
          materialId: material.id,
          at: show.at,
          kind: show.kind === "outcome" ? "outcome" : "show",
        });
  }
  return rows;
}
export function markSeen(state, showIds, role) {
  const seen = seenOf(state);
  const list = (seen[role] ??= []);
  for (const id of showIds) if (!list.includes(id)) list.push(id);
}

// ---------------------------------------------------------------------------------------
// Vignettes (DOS2 GM Vignettes): players see the options, the DM decides the outcome

export function chooseVignette(state, id, actorId, choiceId, role, at = now()) {
  const material = findMaterial(state, id);
  if (material.kind !== "vignette") fail("Non è una vignetta.", "Not a vignette.");
  if (!canReadMaterial(state, material, role) || role === "dm")
    fail("Questa vignetta non è stata mostrata a te.", "This vignette was not shown to you.");
  if (!recipientActors(state, material, role).includes(actorId))
    fail(
      "Puoi scegliere solo per i tuoi personaggi destinatari.",
      "You can choose only for your recipient characters.",
    );
  if (material.outcome)
    fail("Il DM ha già deciso l’esito.", "The DM has already decided the outcome.");
  if (!material.choices.some((c) => c.id === choiceId))
    fail("Scelta non valida.", "Invalid choice.");
  material.responses[actorId] = { choiceId, at };
}
export function decideVignette(state, id, { choiceId, note = "", reason = "" }, role, at = now()) {
  requireDM(role);
  const material = findMaterial(state, id);
  if (material.kind !== "vignette") fail("Non è una vignetta.", "Not a vignette.");
  if (!material.choices.some((c) => c.id === choiceId))
    fail("Scegli l’esito.", "Choose the outcome.");
  const outcome = { choiceId, note: text(note, LIMITS.text, "Esito", "Outcome"), at };
  if (material.outcome) {
    const why = text(reason, LIMITS.reason, "Motivo della correzione", "Correction reason", {
      required: true,
    });
    material.corrections.push({
      id: newId("correction"),
      kind: "outcome",
      at,
      from: clone(material.outcome),
      to: clone(outcome),
      reason: why,
    });
    outcome.corrected = true;
  }
  material.outcome = outcome;
  // The recipients learn the outcome the way they received the vignette: a new show opens it
  // on their screens (Foundry Show Players) and notifies them. Withdrawn: nobody to tell.
  if (material.access.mode !== "none")
    material.shows.push({
      id: newId("show"),
      at,
      recipients: clone(material.access),
      kind: "outcome",
    });
}
export function vignetteTally(material) {
  return material.choices.map((choice) => ({
    ...choice,
    actorIds: Object.entries(material.responses)
      .filter(([, r]) => r.choiceId === choice.id)
      .map(([actorId]) => actorId),
  }));
}

// ---------------------------------------------------------------------------------------
// Reveal art from a token (DDB-130) or from the image library (DDB-129)

export function revealArt(
  state,
  { actorId = null, artId, caption, recipients, share = null },
  role,
  at = now(),
) {
  requireDM(role);
  const art = resolveArt(state, artId) ?? fail("Immagine non trovata.", "Image not found.");
  // TV-109: a personal image is shared with the campaign here, with its provenance and
  // licence (the Library's own rule), in the same step as the reveal.
  const personal = personalMedia(state, art.id);
  if (personal && share) shareAsset(state, role, personal.id, true, share);
  requireShareable(state, art.id);
  if (actorId && !state.actors?.[actorId]) fail("Creatura non trovata.", "Creature not found.");
  const title = text(caption, LIMITS.title, "Didascalia", "Caption", { required: true });
  const slice = sliceOf(state);
  let material = slice.materials.find(
    (m) => m.kind === "art" && m.image?.artId === art.id && m.actorId === actorId,
  );
  if (!material) {
    material = {
      id: newId("material"),
      kind: "art",
      title,
      image: { artId: art.id },
      playerText: "",
      dmNote: "",
      sections: [],
      choices: [],
      tags: [],
      actorId,
      sceneIds: [],
      access: { mode: "none", actorIds: [] },
      shows: [],
      responses: {},
      outcome: null,
      corrections: [],
      source: { kind: "authored", revision: "dm" },
      createdAt: at,
      updatedAt: at,
    };
    slice.materials.push(material);
  } else material.title = title;
  showMaterial(state, material.id, recipients, role, at);
  return material.id;
}
export function revealedArtFor(state, actorId, role) {
  return (state.ext?.[SLICE]?.materials ?? []).filter(
    (m) => m.kind === "art" && m.actorId === actorId && canReadMaterial(state, m, role),
  );
}

// ---------------------------------------------------------------------------------------
// Projections: the only data a view may render

function playerSections(material) {
  return material.sections.map((s) => ({ id: s.id, heading: s.heading, playerText: s.playerText }));
}
// Players get the picture and its caption only: no art id (ids like "art-mimic" name what
// the picture is), and no library file they cannot see.
const playerImage = (art) => (art ? { src: art.image, title: art.title } : null);
/** What this identity may see of a material, or null. The DM note and heading DM texts are
 * included only for the DM: a player projection never carries them. */
export function projectMaterial(state, id, role) {
  const material = state.ext?.[SLICE]?.materials?.find((m) => m.id === id);
  if (!material || !canReadMaterial(state, material, role)) return null;
  const art = resolveArt(state, material.image?.artId, role);
  const base = {
    id: material.id,
    kind: material.kind,
    title: material.title,
    image:
      role === "dm" && art ? { id: art.id, src: art.image, title: art.title } : playerImage(art),
    playerText: material.playerText,
    sections: playerSections(material),
    choices:
      material.kind === "vignette"
        ? vignetteTally(material).map(({ id: cid, text: t }) => ({ id: cid, text: t }))
        : [],
    outcome: material.outcome
      ? {
          choiceId: material.outcome.choiceId,
          note: material.outcome.note,
          corrected: Boolean(material.outcome.corrected),
        }
      : null,
    lastShown:
      material.shows
        .filter((s) => role === "dm" || recipientIncludes(state, s.recipients, role))
        .at(-1)?.at ?? null,
  };
  if (role !== "dm") {
    const mine = recipientActors(state, material, role);
    return {
      ...base,
      myActors: mine,
      myChoices: Object.fromEntries(
        mine.filter((a) => material.responses[a]).map((a) => [a, material.responses[a].choiceId]),
      ),
    };
  }
  return {
    ...base,
    dmNote: material.dmNote,
    dmSections: material.sections.map((s) => ({ id: s.id, dmText: s.dmText })),
    access: clone(material.access),
    shows: clone(material.shows),
    tally: material.kind === "vignette" ? vignetteTally(material) : [],
    corrections: clone(material.corrections),
    sceneIds: [...material.sceneIds],
    tags: [...(material.tags ?? [])],
    actorId: material.actorId,
  };
}
/** What a given character's player would see (DM preview), without the DM parts. */
export function previewForActor(state, id, actorId) {
  const material = findMaterial(state, id);
  const reached =
    material.access.mode === "all" ||
    (material.access.mode === "some" && material.access.actorIds.includes(actorId));
  if (!reached) return null;
  // The image as that character's controller would see it (a personal library file shows
  // only to its owner).
  const art = resolveArt(state, material.image?.artId, state.actors?.[actorId]?.owner ?? "player");
  return {
    id: material.id,
    kind: material.kind,
    title: material.title,
    image: playerImage(art),
    playerText: material.playerText,
    sections: playerSections(material),
    choices: material.choices.map((c) => ({ id: c.id, text: c.text })),
    outcome: material.outcome
      ? { choiceId: material.outcome.choiceId, note: material.outcome.note }
      : null,
    myActors: [],
    myChoices: {},
  };
}
/** Materials this identity can read. `query` matches the title, the player text and the
 * headings with their player excerpts; for the DM also the tags (DM organisation, never
 * matched for players). */
export function listMaterials(state, role, { kind = "all", query = "" } = {}) {
  const words = str(query).toLowerCase().trim();
  const matches = (m) =>
    [
      m.title,
      m.playerText,
      ...m.sections.flatMap((s) => [s.heading, s.playerText]),
      ...(role === "dm" ? (m.tags ?? []) : []),
    ].some((value) => str(value).toLowerCase().includes(words));
  return (state.ext?.[SLICE]?.materials ?? [])
    .filter((m) => canReadMaterial(state, m, role))
    .filter((m) => kind === "all" || m.kind === kind)
    .filter((m) => !words || matches(m))
    .map((m) => projectMaterial(state, m.id, role));
}

// ---------------------------------------------------------------------------------------
// Campaign › World entries (campaign-content projection, read only)

/** A world entry as this identity may read it (sections filtered by their audience). */
export function worldEntry(state, entryId, viewer) {
  try {
    const entry = getCampaignEntry(state, entryId, viewer);
    return entry.kind === "world" ? entry : null;
  } catch {
    return null;
  }
}
/** World entries of the campaign the DM can link a pin to. */
export function worldEntries(state) {
  try {
    return listCampaignEntries(state, { campaignId: state.campaign?.id, kind: "world" }, "dm");
  } catch {
    return [];
  }
}
// Everyone at the table who is not a DM: an excerpt taken from an entry must be readable
// by all of them, or it would reveal what the entry keeps from some players.
const playerMembers = (state) =>
  campaignMembers(state).filter((member) => !["dm", "co-dm"].includes(member.role));

// ---------------------------------------------------------------------------------------
// Pins (Roll20 Map Pins, DDB scene pins)

function cleanLink(state, link) {
  if (link?.entryId) {
    const entry =
      worldEntry(state, link.entryId, "dm") ??
      fail("Voce del Mondo non trovata.", "World entry not found.");
    if (link.sectionId && !entry.data.sections.some((s) => s.id === link.sectionId))
      fail("Sezione non trovata.", "Section not found.");
    return { entryId: entry.id, sectionId: link.sectionId || null };
  }
  if (!link?.materialId) return null;
  const material = findMaterial(state, link.materialId);
  if (link.sectionId && !material.sections.some((s) => s.id === link.sectionId))
    fail("Intestazione non trovata.", "Heading not found.");
  return { materialId: material.id, sectionId: link.sectionId || null };
}
export function savePin(state, input, role) {
  requireDM(role);
  const scene = findScene(state, input.sceneId);
  const x = Number(input.x),
    y = Number(input.y);
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    y < 0 ||
    x > scene.width ||
    y > scene.height
  )
    fail("Lo spillo deve stare dentro la mappa.", "The pin must be inside the map.");
  const kind = PIN_KINDS.includes(input.kind) ? input.kind : "location";
  const link = cleanLink(state, input.link);
  const values = {
    sceneId: scene.id,
    x: Math.round(x),
    y: Math.round(y),
    label: text(input.label, LIMITS.label, "Etichetta", "Label", { required: true }),
    kind,
    link,
    excerpt: text(input.excerpt, LIMITS.excerpt, "Estratto per i giocatori", "Player excerpt"),
    // Roll20 "use blockquote as player flavour": the excerpt follows the linked text.
    excerptLinked: Boolean(link && input.excerptLinked === true),
    dmNote: text(input.dmNote, LIMITS.text, "Nota del DM", "DM note"),
    visible: input.visible === true,
  };
  const slice = sliceOf(state);
  if (input.id) {
    Object.assign(findPin(state, input.id), values);
    return input.id;
  }
  const pin = { id: newId("pin"), ...values, createdAt: now() };
  slice.pins.push(pin);
  return pin.id;
}
export function movePin(state, id, x, y, role) {
  requireDM(role);
  const pin = findPin(state, id);
  savePin(state, { ...pin, x, y }, role);
}
export function setPinVisible(state, id, visible, role) {
  requireDM(role);
  findPin(state, id).visible = Boolean(visible);
}
export function deletePin(state, id, role) {
  requireDM(role);
  findPin(state, id);
  sliceOf(state).pins = sliceOf(state).pins.filter((p) => p.id !== id);
}
/** Default excerpt for a link, safe for players (Roll20 blockquote as flavour): a heading's
 * player text, or the text of a world entry section every player can read. */
export function linkExcerpt(state, link) {
  if (link?.entryId) {
    const players = playerMembers(state);
    const views = players.map((member) => worldEntry(state, link.entryId, member.id));
    if (!players.length || views.some((view) => !view)) return "";
    if (!link.sectionId) return str(views[0].data.body);
    const sections = views.map((view) => view.data.sections.find((s) => s.id === link.sectionId));
    return sections.every(Boolean) ? str(sections[0].body) : "";
  }
  const material = state.ext?.[SLICE]?.materials?.find((m) => m.id === link?.materialId);
  if (!material) return "";
  const section = material.sections.find((s) => s.id === link.sectionId);
  return section ? section.playerText : material.playerText;
}
export function linkLabel(state, link) {
  if (link?.entryId) {
    const entry = worldEntry(state, link.entryId, "dm");
    if (!entry) return "";
    const title = entry.data.title || entry.id;
    const section = entry.data.sections.find((s) => s.id === link.sectionId);
    return section ? `${title} › ${section.title}` : title;
  }
  const material = state.ext?.[SLICE]?.materials?.find((m) => m.id === link?.materialId);
  if (!material) return "";
  const section = material.sections.find((s) => s.id === link.sectionId);
  return section ? `${material.title} › ${section.heading}` : material.title;
}
/** The excerpt players read on a pin: live from its link, or the text written for it. */
export function pinExcerpt(state, pin) {
  return pin.excerptLinked && pin.link ? linkExcerpt(state, pin.link) : str(pin.excerpt);
}
/** DM: the pins linked to a material (Roll20 "Go to Pin" from the handout menu, R20-099). */
export function pinsForMaterial(state, materialId) {
  return (state.ext?.[SLICE]?.pins ?? [])
    .filter((p) => p.link?.materialId === materialId)
    .map((p) => ({
      id: p.id,
      label: p.label,
      sceneId: p.sceneId,
      sectionId: p.link.sectionId ?? null,
      visible: Boolean(p.visible),
    }));
}
/** Pins on a scene as this identity may see them. Players get visible pins with label and
 * excerpt only: never the DM note or the linked entry (R20-099). */
export function projectPins(state, sceneId, role) {
  const pins = (state.ext?.[SLICE]?.pins ?? []).filter((p) => p.sceneId === sceneId);
  if (role === "dm") return clone(pins);
  return pins
    .filter((p) => p.visible)
    .map((p) => {
      const material = state.ext[SLICE].materials.find((m) => m.id === p.link?.materialId);
      const entry = p.link?.entryId ? worldEntry(state, p.link.entryId, role) : null;
      return {
        id: p.id,
        sceneId: p.sceneId,
        x: p.x,
        y: p.y,
        label: p.label,
        kind: p.kind,
        excerpt: pinExcerpt(state, p),
        visible: true,
        // Only what this identity can already read can be opened from its pin.
        materialId: material && canReadMaterial(state, material, role) ? material.id : null,
        entryId: entry ? entry.id : null,
      };
    });
}

// ---------------------------------------------------------------------------------------
// Map-less scenes (DDB Theater of the Mind organizer; Foundry gridless scene, FVT-072)

export function stageFor(state, sceneId) {
  return state?.ext?.[SLICE]?.stages?.[sceneId] ?? null;
}
export function createMaplessScene(state, input, role) {
  requireDM(role);
  const name = text(input.name, LIMITS.scene, "Nome", "Name", { required: true });
  const artId = input.artId || null;
  if (artId && !resolveArt(state, artId)) fail("Immagine non trovata.", "Image not found.");
  requireShareable(state, artId);
  const party = partyCharacters(state).map((c) => c.id);
  const participants = [...new Set(input.participantIds ?? [])];
  if (!participants.length)
    fail(
      "Scegli almeno un partecipante: il Tavolo mostra la scena a chi vi prende parte.",
      "Choose at least one participant: the Table shows the scene to those taking part.",
    );
  if (participants.some((id) => !party.includes(id)))
    fail("Partecipante non valido.", "Invalid participant.");
  const id = input.id || newId("scene");
  if (state.scenes.some((s) => s.id === id)) fail("Scena già esistente.", "Scene already exists.");
  const spacing = Math.min(170, 800 / Math.max(1, participants.length));
  const start = 500 - (spacing * (participants.length - 1)) / 2;
  state.scenes.push({
    id,
    name,
    description: text(input.description, LIMITS.text, "Note del DM", "DM notes"),
    publicDescription: text(
      input.publicDescription,
      LIMITS.text,
      "Descrizione per i giocatori",
      "Player description",
    ),
    gridSize: 50,
    metersPerCell: 1.5,
    width: 1000,
    height: 650,
    gridVisible: false,
    gridSnap: false,
    background: null,
    revealed: false,
    revealedTo: [],
    template: "blank",
    mapless: true,
    tokens: participants.map((actorId, i) => ({
      id: `token-${actorId}-${id}`,
      actorId,
      x: Math.round(start + i * spacing),
      y: 575,
    })),
    walls: [],
    terrain: [],
  });
  sliceOf(state).stages[id] = { artId, createdAt: now() };
  for (const materialId of input.materialIds ?? []) {
    const material = findMaterial(state, materialId);
    if (!material.sceneIds.includes(id)) material.sceneIds.push(id);
  }
  return id;
}
export function updateStage(state, sceneId, { artId, publicDescription }, role) {
  requireDM(role);
  const scene = findScene(state, sceneId);
  const stage =
    stageFor(state, sceneId) ?? fail("Non è una scena senza mappa.", "Not a map-less scene.");
  if (artId && !resolveArt(state, artId)) fail("Immagine non trovata.", "Image not found.");
  requireShareable(state, artId);
  stage.artId = artId || null;
  scene.publicDescription = text(
    publicDescription,
    LIMITS.text,
    "Descrizione per i giocatori",
    "Player description",
  );
}
/** Materials hung on a scene that this identity can read. */
export function sceneMaterials(state, sceneId, role) {
  return (state.ext?.[SLICE]?.materials ?? [])
    .filter((m) => m.sceneIds.includes(sceneId) && canReadMaterial(state, m, role))
    .map((m) => projectMaterial(state, m.id, role));
}
