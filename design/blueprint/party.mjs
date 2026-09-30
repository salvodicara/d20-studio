// B44 — Party: the DM's party overview, shared spells, bases and bastions, the party's
// vehicles, the role dashboards of the campaign Overview and the session-start message.
// Copied patterns (census IDs):
// - Party overview: Foundry "Party Overview" module (FVT-071: HP, AC, passive Perception,
//   languages, saves; individual players can be hidden) and the Fantasy Grounds Party
//   Sheet (R20-078: summary with a visibility option for players), Shieldmaiden players
//   panel (CMP-180). Values come from the sheets, never typed twice (F-053).
// - Shared spells: F-046 (Spell Book Party Coordinator reference): who has which spell,
//   read-only, respecting sheet access.
// - Bases and bastions: dnd5e Bastion tab (FVT-037), Roll20 Bastion tracker (R20-033); the
//   domain and its UI are in bastions.mjs.
// - Vehicles: dnd5e group actor with a primary vehicle for speed and shared storage
//   (FVT-050); SRD 5.2.1 "Mounts and Vehicles" for the wagon, draft horses and the
//   five-times pulling rule (EN 100 / IT 113–114; Draft Horse EN 347 / IT 388).
// - Dashboard: Kanka dashboard setup with widgets and drag to reorder (CMP-21) and
//   dashboards per role (CMP-22). It replaces the campaign Overview and keeps its core
//   blocks (campaign.mjs campaignOverviewBlocks).
// - Session-start message: Fantasy Grounds Message of the Day shown to players at login
//   (R20-082), here when a player enters the Table.
// - Visual pass 2 (30/09/2026): the Overview opens with Kanka's campaign header (the
//   campaign image as its background, name, description, tags) and the members as avatars
//   (D&D Beyond campaign page, Roll20 game list R20-001); «Il gruppo» shows D&D Beyond's
//   character cards (portrait, name, class and level, player); «Collegamenti» lists the
//   latest readable entries (Kanka's recently modified widget). Sources in DESIGN.md «Pagine».
import { canControlActor, canViewActor, isCampaignActor } from "./character-access.mjs";
import { getCampaignMembers, isCampaignMember, listCampaignEntries } from "./campaign-content.mjs";
import { campaignOverviewBlocks } from "./campaign.mjs";
import { listCampaignSessions } from "./campaign-sessions.mjs";
import {
  campaignSummary,
  inviteButton,
  openInvite,
  personName,
  roleOf as memberRole,
} from "./campaign-members.mjs";
import { avatarHTML, publishedAvatar } from "./account-avatar.mjs";
import { isDataUrl, portraitArt } from "./media-domain.mjs";
import { statValue } from "./sheet-plus-domain.mjs";
import { classes as CLASSES } from "./character-rules.mjs";
import { knownLanguages, languageName } from "./chat-domain.mjs";
import { getEffectiveActor } from "./forms-companions.mjs";
import { hasInspiration } from "./dice-tray-domain.mjs";
import * as U from "./preferences-domain.mjs";
import * as B from "./bastions.mjs";

const ID = "party";
const VERSION = 1;
const L = (it, en) => ({ it, en });
const copy = (value) => structuredClone(value);
const uid = (prefix) =>
  prefix +
  "-" +
  (globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10));
const refuse = (it, en) => {
  throw Object.assign(new Error(it), { it, en });
};
const int = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const round2 = (n) => Math.round(n * 100) / 100;
const nameOf = (value, lang = "it") =>
  value && typeof value === "object"
    ? (value[lang] ?? value.it ?? value.en ?? "")
    : String(value ?? "");
export const isDm = B.isDm;

// ---------------------------------------------------------------- sources

const SRD = (en, it) => ({
  kind: "srd",
  edition: "2024",
  revision: "5.2.1",
  pages: { en, it },
});
export const SOURCES = Object.freeze({
  passive: SRD([21, 22], [23, 24]),
  proficiency: SRD([23], [25]),
  vehicles: SRD([100], [113, 114]),
  draftHorse: SRD([347], [388]),
});
const sourceText = (ctx, source) =>
  `SRD 5.2.1 EN ${source.pages.en.join("–")} / IT ${source.pages.it.join("–")}`;

// ---------------------------------------------------------------- dashboard catalogue

export const TILES = Object.freeze({
  motd: { label: L("Messaggio d’inizio sessione", "Session-start message"), hideWith: null },
  recap: { label: L("Dove eravamo rimasti", "Previously"), hideWith: "journal" },
  next: { label: L("Il prossimo appuntamento", "Next appointment"), hideWith: "sessions" },
  party: { label: L("Il gruppo", "The party"), hideWith: "group" },
  bases: { label: L("Basi e ordini", "Bases and orders"), hideWith: "group" },
  vehicle: { label: L("Veicolo del gruppo", "Party vehicle"), hideWith: "group" },
  spells: { label: L("Magie condivise", "Shared spells"), hideWith: "group" },
  revealed: { label: L("Materiale rivelato", "Revealed material"), hideWith: null },
  note: { label: L("Nota del DM", "DM note"), hideWith: null },
  links: { label: L("Collegamenti", "Links"), hideWith: null },
  // P10 CA-03 (Kanka dashboard widgets): configurable tiles, several of each allowed
  // (id "<type>:<n>"): a filtered entry list, the session calendar, an entry preview.
  list: { label: L("Elenco filtrato di voci", "Filtered entry list"), hideWith: null, many: true },
  calendar: {
    label: L("Calendario delle sessioni", "Session calendar"),
    hideWith: "sessions",
    many: true,
  },
  preview: { label: L("Anteprima di una voce", "Entry preview"), hideWith: null, many: true },
});
export const tileType = (id) => String(id ?? "").split(":")[0];
// What an "Elenco filtrato" tile lists (Kanka entity-list widget filters).
export const LIST_FILTERS = Object.freeze({
  world: L("Voci del Mondo", "World entries"),
  person: L("Persone", "People"),
  place: L("Luoghi", "Places"),
  faction: L("Fazioni", "Factions"),
  quest: L("Missioni", "Quests"),
  recap: L("Resoconti", "Recaps"),
});
export const DEFAULT_DASHBOARDS = Object.freeze({
  dm: [
    { id: "party", wide: true },
    { id: "next", wide: false },
    { id: "bases", wide: false },
    { id: "recap", wide: false },
    { id: "motd", wide: false },
    { id: "vehicle", wide: false },
    { id: "revealed", wide: true },
    { id: "links", wide: true },
  ],
  player: [
    { id: "motd", wide: true },
    { id: "recap", wide: false },
    { id: "next", wide: false },
    { id: "party", wide: true },
    { id: "revealed", wide: true },
    { id: "links", wide: true },
  ],
});
export const DASHBOARD_TARGETS = Object.freeze(["dm", "player"]);

// ---------------------------------------------------------------- state slice

function seedVehicle() {
  return {
    id: "wagon",
    name: L("Carro", "Wagon"),
    primary: true,
    vehicleWeightKg: 200,
    seats: 4,
    speedM: null,
    animals: [
      {
        id: "brina",
        name: "Brina",
        kind: L("Cavallo da tiro", "Draft horse"),
        capacityKg: 270,
        speedM: 12,
      },
      {
        id: "tizzone",
        name: "Tizzone",
        kind: L("Cavallo da tiro", "Draft horse"),
        capacityKg: 270,
        speedM: 12,
      },
    ],
    aboard: [{ actorId: "doran", role: "driver" }],
    cargo: [
      { id: "cargo-tents", name: L("Tenda", "Tent"), quantity: 2, weightKg: 10 },
      {
        id: "cargo-rations",
        name: L("Razioni (1 giorno)", "Rations (1 day)"),
        quantity: 10,
        weightKg: 1,
      },
      {
        id: "cargo-oil",
        name: L("Casse d’olio per lanterne", "Crates of lantern oil"),
        quantity: 4,
        weightKg: 12.5,
      },
    ],
    note: L(
      "Carro e cavalli da tiro dal SRD; nomi, posti a bordo e merci sono dati d’esempio.",
      "Wagon and draft horses from the SRD; names, seats and goods are sample data.",
    ),
  };
}
export function seedParty() {
  return {
    overview: { hidden: [], shareWithPlayers: false },
    dashboards: copy(DEFAULT_DASHBOARDS),
    notes: { dm: "", player: "" },
    motd: { enabled: false, text: "", revision: 0, updatedAt: null },
    vehicles: [seedVehicle()],
    bastions: B.seedBastions(),
  };
}
const tileConfig = (row) => {
  const type = tileType(row.id);
  const config = row.config && typeof row.config === "object" ? row.config : {};
  if (type === "list")
    return {
      filter: LIST_FILTERS[config.filter] ? config.filter : "world",
      tag: typeof config.tag === "string" ? config.tag.slice(0, 40) : "",
    };
  if (type === "preview")
    return { entryId: typeof config.entryId === "string" ? config.entryId : "" };
  return null;
};
const tileList = (list, fallback) => {
  const seen = new Set();
  const rows = (Array.isArray(list) ? list : [])
    .filter(
      (row) =>
        row &&
        typeof row.id === "string" &&
        TILES[tileType(row.id)] &&
        (TILES[tileType(row.id)].many || row.id === tileType(row.id)) &&
        !seen.has(row.id) &&
        seen.add(row.id),
    )
    .map((row) => {
      const config = tileConfig(row);
      return config
        ? { id: row.id, wide: row.wide === true, config }
        : { id: row.id, wide: row.wide === true };
    });
  return Array.isArray(list) ? rows : copy(fallback);
};
function normalizeVehicle(raw) {
  const animals = (Array.isArray(raw.animals) ? raw.animals : [])
    .filter((a) => a && typeof a.id === "string")
    .map((a) => ({
      id: a.id,
      name: String(a.name ?? ""),
      kind:
        a.kind && typeof a.kind === "object"
          ? a.kind
          : L(String(a.kind ?? ""), String(a.kind ?? "")),
      capacityKg: Number.isFinite(a.capacityKg) && a.capacityKg >= 0 ? a.capacityKg : 0,
      speedM: Number.isFinite(a.speedM) && a.speedM >= 0 ? a.speedM : 0,
    }));
  return {
    id: raw.id,
    name:
      raw.name && typeof raw.name === "object"
        ? raw.name
        : L(String(raw.name ?? ""), String(raw.name ?? "")),
    primary: raw.primary === true,
    vehicleWeightKg:
      Number.isFinite(raw.vehicleWeightKg) && raw.vehicleWeightKg >= 0 ? raw.vehicleWeightKg : 0,
    seats: int(raw.seats, 0, 500) ? raw.seats : 0,
    speedM: Number.isFinite(raw.speedM) && raw.speedM >= 0 ? raw.speedM : null,
    animals,
    aboard: (Array.isArray(raw.aboard) ? raw.aboard : []).filter(
      (row) => row && typeof row.actorId === "string" && ["driver", "passenger"].includes(row.role),
    ),
    cargo: (Array.isArray(raw.cargo) ? raw.cargo : []).filter(
      (row) => row && typeof row.id === "string" && int(row.quantity, 1, 100_000),
    ),
    ...(raw.note ? { note: raw.note } : {}),
  };
}
export function normalizeParty(raw, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Saved party data comes from a newer version");
  const seed = seedParty();
  if (!raw || typeof raw !== "object") return seed;
  const overview = raw.overview ?? {};
  const motd = raw.motd ?? {};
  const vehicles = (Array.isArray(raw.vehicles) ? raw.vehicles : seed.vehicles)
    .filter((v) => v && typeof v.id === "string")
    .map(normalizeVehicle);
  return {
    overview: {
      hidden: (Array.isArray(overview.hidden) ? overview.hidden : []).filter(
        (id) => typeof id === "string",
      ),
      shareWithPlayers: overview.shareWithPlayers === true,
    },
    dashboards: {
      dm: tileList(raw.dashboards?.dm, DEFAULT_DASHBOARDS.dm),
      player: tileList(raw.dashboards?.player, DEFAULT_DASHBOARDS.player),
    },
    notes: {
      dm: typeof raw.notes?.dm === "string" ? raw.notes.dm.slice(0, 600) : "",
      player: typeof raw.notes?.player === "string" ? raw.notes.player.slice(0, 600) : "",
    },
    motd: {
      enabled: motd.enabled === true && typeof motd.text === "string" && motd.text.trim() !== "",
      text: typeof motd.text === "string" ? motd.text.slice(0, 600) : "",
      revision: int(motd.revision, 0, 1_000_000) ? motd.revision : 0,
      updatedAt: typeof motd.updatedAt === "string" ? motd.updatedAt : null,
    },
    vehicles,
    bastions: B.normalizeBastions(raw.bastions),
  };
}
export const sliceOf = (state) => state?.ext?.[ID] ?? null;

// ---------------------------------------------------------------- party and derived values

// The party: the campaign's characters this viewer can read (companions stay on their own
// sheets); a sheet the DM deactivated in this campaign (B13 seat) is not in play.
export function partyMembers(state, viewer) {
  const campaignId = state.campaign?.id;
  if (!campaignId || !isCampaignMember(state, campaignId, viewer)) return [];
  const seats = state.ext?.["campaign-members"]?.campaigns?.[campaignId]?.seats ?? {};
  return Object.values(state.actors ?? {})
    .filter(
      (actor) =>
        actor.kind === "character" &&
        !actor.companion &&
        isCampaignActor(actor, campaignId) &&
        canViewActor(actor, viewer, state) &&
        seats[actor.id]?.status !== "inactive",
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}
const mod = (score) => Math.floor((score - 10) / 2);
export const ABILITIES = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);
const ABILITY_SHORT = {
  str: L("FOR", "STR"),
  dex: L("DES", "DEX"),
  con: L("COS", "CON"),
  int: L("INT", "INT"),
  wis: L("SAG", "WIS"),
  cha: L("CAR", "CHA"),
};
export const PASSIVES = Object.freeze([
  { id: "perception", ability: "wis", label: L("Percezione", "Perception"), short: L("PP", "PP") },
  { id: "insight", ability: "wis", label: L("Intuizione", "Insight"), short: L("Intuiz.", "Ins.") },
  {
    id: "investigation",
    ability: "int",
    label: L("Indagare", "Investigation"),
    short: L("Indag.", "Inv."),
  },
]);
// Proficiency Bonus: the sheet's value, else the Character Advancement table by level.
export function proficiencyBonus(actor) {
  if (Number.isInteger(actor?.proficiencyBonus)) return actor.proficiencyBonus;
  if (Number.isInteger(actor?.combatProfile?.proficiencyBonus))
    return actor.combatProfile.proficiencyBonus;
  return int(actor?.level, 1, 20) ? 2 + Math.floor((actor.level - 1) / 4) : null;
}
// A saving throw as the sheet records it; otherwise ability modifier plus Proficiency Bonus
// when the first class grants that save (same rule as the guided builder).
export function saveValue(actor, ability) {
  const first = actor?.buildSeed?.levelOrder?.[0] ?? actor?.buildSeed?.classes?.[0]?.classId;
  const klass = CLASSES.find((row) => row.id === first);
  const proficient = Boolean(klass?.savingThrows?.includes(ability));
  // A recorded value wins; the first class still says which saves are proficient.
  const recorded = actor?.savingThrows?.[ability];
  if (Number.isFinite(recorded)) return { value: recorded, source: "recorded", proficient };
  const score = actor?.abilities?.[ability];
  if (!Number.isFinite(score)) return { value: null, source: "missing", proficient };
  const pb = proficiencyBonus(actor) ?? 0;
  return {
    value: mod(score) + (proficient ? pb : 0),
    source: klass ? "class" : "ability",
    proficient,
  };
}
// Passive score = 10 + the check's modifier (SRD 5.2.1 EN 21–22 / IT 23–24).
export function passiveValue(actor, passive) {
  const recorded = actor?.skillModifiers?.[passive.id];
  if (Number.isFinite(recorded)) return { value: 10 + recorded, source: "recorded" };
  const score = actor?.abilities?.[passive.ability];
  if (!Number.isFinite(score)) return { value: null, source: "missing" };
  const proficient = (actor.skills ?? []).includes(passive.id);
  return {
    value: 10 + mod(score) + (proficient ? (proficiencyBonus(actor) ?? 0) : 0),
    source: "derived",
  };
}
// R7 PG-25 (contract C14; D&D Beyond shows one number everywhere): a save and a passive as
// the sheet shows them, worn items, conditions and Exhaustion included; the arithmetic above
// stays as the fallback for a sheet the stat engine cannot read.
function sheetSave(state, raw, actor, ability) {
  const fallback = saveValue(actor, ability);
  try {
    const stat = statValue(state, raw.id, `save:${ability}`);
    if (!Number.isFinite(stat.total)) return fallback;
    return {
      value: stat.total,
      source: "sheet",
      proficient: Boolean(stat.proficient ?? fallback.proficient),
    };
  } catch {
    return fallback;
  }
}
function sheetPassive(state, raw, actor, passive) {
  try {
    const total =
      passive.id === "perception"
        ? statValue(state, raw.id, "passive-perception").total
        : 10 + statValue(state, raw.id, `skill:${passive.id}`).total;
    return Number.isFinite(total)
      ? { value: total, source: "sheet" }
      : passiveValue(actor, passive);
  } catch {
    return passiveValue(actor, passive);
  }
}
export function partyRow(state, raw) {
  const actor = getEffectiveActor(raw);
  return {
    id: raw.id,
    name: raw.name,
    className: raw.className,
    level: raw.level,
    hp: actor.hp,
    maxHp: actor.maxHp,
    tempHp: Number.isFinite(actor.tempHp) ? actor.tempHp : 0,
    ac: actor.ac,
    form: raw.activeForm ? true : false,
    passives: Object.fromEntries(PASSIVES.map((p) => [p.id, sheetPassive(state, raw, actor, p)])),
    saves: Object.fromEntries(ABILITIES.map((a) => [a, sheetSave(state, raw, actor, a)])),
    languages: knownLanguages(state, raw.id),
    conditions: (raw.conditions ?? []).map((c) => c?.id ?? c?.conditionId).filter(Boolean),
  };
}

// ---------------------------------------------------------------- shared spells

const slug = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const spellKey = (spell) =>
  spell.catalogId ??
  spell.combatActionId ??
  slug(nameOf(spell.name, "en") || nameOf(spell.name, "it"));
// Who has which spell, grouped by level (F-046). Read-only: prepared is not castable now.
export function sharedSpells(state, viewer, lang = "it") {
  const map = new Map();
  const without = [];
  for (const actor of partyMembers(state, viewer)) {
    const spells = (actor.spells ?? []).filter((spell) => int(spell?.level, 0, 9));
    if (!spells.length) {
      without.push({ id: actor.id, name: actor.name });
      continue;
    }
    for (const spell of spells) {
      const key = spellKey(spell) + ":" + spell.level;
      if (!map.has(key)) map.set(key, { key, level: spell.level, name: spell.name, casters: [] });
      const entry = map.get(key);
      if (entry.casters.some((c) => c.actorId === actor.id)) continue;
      entry.casters.push({
        actorId: actor.id,
        name: actor.name,
        // Same reading as the sheet: only a recorded preparation counts.
        prepared: spell.level === 0 || spell.prepared === true,
      });
    }
  }
  const levels = [];
  for (const entry of map.values()) {
    let group = levels.find((row) => row.level === entry.level);
    if (!group) levels.push((group = { level: entry.level, spells: [] }));
    group.spells.push({ ...entry, shared: entry.casters.length > 1 });
  }
  levels.sort((a, b) => a.level - b.level);
  for (const group of levels)
    group.spells.sort((a, b) => nameOf(a.name, lang).localeCompare(nameOf(b.name, lang)));
  return { levels, without };
}

// ---------------------------------------------------------------- vehicles

// SRD 5.2.1 Mounts and Cargo: an animal pulling a vehicle moves up to five times its base
// carrying capacity, vehicle included; several animals add their capacities.
export const PULL_FACTOR = 5;
export function vehicleStats(vehicle) {
  const capacityKg = vehicle.animals.reduce((sum, a) => sum + a.capacityKg, 0);
  const pullKg = capacityKg * PULL_FACTOR;
  const cargoKg = round2(
    vehicle.cargo.reduce((sum, row) => sum + row.quantity * (row.weightKg ?? 0), 0),
  );
  const maxCargoKg = Math.max(0, pullKg - vehicle.vehicleWeightKg);
  const speedM = Number.isFinite(vehicle.speedM)
    ? vehicle.speedM
    : vehicle.animals.length
      ? Math.min(...vehicle.animals.map((a) => a.speedM))
      : 0;
  return {
    capacityKg,
    pullKg,
    cargoKg,
    maxCargoKg,
    over: cargoKg > maxCargoKg,
    speedM,
    speedFromAnimals: !Number.isFinite(vehicle.speedM),
    aboard: vehicle.aboard.length,
    seats: vehicle.seats,
  };
}
export const primaryVehicle = (slice) =>
  slice?.vehicles.find((v) => v.primary) ?? slice?.vehicles[0] ?? null;
const vehicleOf = (slice, id) =>
  slice.vehicles.find((v) => v.id === id) ?? refuse("Veicolo non trovato.", "Vehicle not found.");
function member(state, viewer) {
  if (!isCampaignMember(state, state.campaign?.id, viewer))
    refuse(
      "Solo i membri della campagna usano i veicoli del gruppo.",
      "Only campaign members use the party's vehicles.",
    );
}
function partyActor(state, viewer, actorId) {
  const actor = partyMembers(state, viewer).find((a) => a.id === actorId);
  if (!actor || !canControlActor(actor, viewer, state))
    refuse("Personaggio non disponibile per te.", "Character not available to you.");
  return state.actors[actorId];
}
const cargoName = (row) => row.name;
export function loadFromInventory(state, slice, viewer, { vehicleId, actorId, itemId, quantity }) {
  member(state, viewer);
  const vehicle = vehicleOf(slice, vehicleId);
  const actor = partyActor(state, viewer, actorId);
  const row = (actor.inventory ?? []).find((item) => item.id === itemId);
  if (!row) refuse("Oggetto non trovato nell’inventario.", "Item not found in the inventory.");
  if (row.equipped)
    refuse("Togli l’oggetto di dosso prima di caricarlo.", "Unequip the item before loading it.");
  const qty = Number(quantity);
  if (!int(qty, 1, row.quantity ?? 1))
    refuse(`Quantità da 1 a ${row.quantity ?? 1}.`, `Quantity 1 to ${row.quantity ?? 1}.`);
  const weightKg = Number.isFinite(row.weight) ? row.weight : 0;
  const existing = vehicle.cargo.find((c) => c.fromActorId === actor.id && c.item?.id === row.id);
  if (existing) existing.quantity += qty;
  else
    vehicle.cargo.push({
      id: uid("cargo"),
      name: copy(row.name),
      quantity: qty,
      weightKg,
      fromActorId: actor.id,
      item: { ...copy(row), quantity: 0 },
    });
  row.quantity = (row.quantity ?? 1) - qty;
  if (row.quantity <= 0) actor.inventory = actor.inventory.filter((item) => item !== row);
  if (Array.isArray(actor.heldItemIds))
    actor.heldItemIds = actor.heldItemIds.filter((id) => actor.inventory.some((i) => i.id === id));
}
export function unloadToInventory(state, slice, viewer, { vehicleId, cargoId, actorId, quantity }) {
  member(state, viewer);
  const vehicle = vehicleOf(slice, vehicleId);
  const row =
    vehicle.cargo.find((c) => c.id === cargoId) ?? refuse("Merce non trovata.", "Goods not found.");
  const actor = partyActor(state, viewer, actorId);
  const qty = Number(quantity);
  if (!int(qty, 1, row.quantity))
    refuse(`Quantità da 1 a ${row.quantity}.`, `Quantity 1 to ${row.quantity}.`);
  actor.inventory ??= [];
  const template = row.item
    ? copy(row.item)
    : {
        id: "cargo-" + row.id,
        name: copy(row.name),
        weight: row.weightKg,
        equipped: false,
        kind: "gear",
        description: "",
      };
  const same = actor.inventory.find((item) => item.id === template.id);
  if (same && !same.equipped) same.quantity = (same.quantity ?? 0) + qty;
  else
    actor.inventory.push({
      ...template,
      id: same ? uid(template.id) : template.id,
      quantity: qty,
      equipped: false,
    });
  row.quantity -= qty;
  if (row.quantity === 0) vehicle.cargo = vehicle.cargo.filter((c) => c !== row);
}
export function addGoods(state, slice, viewer, { vehicleId, name, quantity, weightKg }) {
  member(state, viewer);
  const vehicle = vehicleOf(slice, vehicleId);
  const title = String(name ?? "").trim();
  if (!title || title.length > 80)
    refuse(
      "Scrivi il nome della merce (fino a 80 caratteri).",
      "Write the goods' name (up to 80 characters).",
    );
  const qty = Number(quantity),
    kg = Number(weightKg);
  if (!int(qty, 1, 100_000)) refuse("Quantità da 1 in su.", "Quantity 1 or more.");
  if (!Number.isFinite(kg) || kg < 0 || kg > 100_000) refuse("Peso non valido.", "Invalid weight.");
  const row = { id: uid("cargo"), name: L(title, title), quantity: qty, weightKg: round2(kg) };
  vehicle.cargo.push(row);
  return row;
}
export function removeGoods(state, slice, viewer, { vehicleId, cargoId, reason }) {
  if (!isDm(state, viewer))
    refuse("Solo il DM toglie merci dal veicolo.", "Only the DM removes goods from the vehicle.");
  const vehicle = vehicleOf(slice, vehicleId);
  const why = String(reason ?? "").trim();
  if (!why) refuse("Scrivi il motivo.", "Write the reason.");
  const row =
    vehicle.cargo.find((c) => c.id === cargoId) ?? refuse("Merce non trovata.", "Goods not found.");
  vehicle.cargo = vehicle.cargo.filter((c) => c !== row);
  return { row, reason: why };
}
export function setAboard(state, slice, viewer, { vehicleId, actorId, role }) {
  member(state, viewer);
  const vehicle = vehicleOf(slice, vehicleId);
  const actor = partyMembers(state, viewer).find((a) => a.id === actorId);
  if (!actor) refuse("Personaggio non disponibile.", "Character unavailable.");
  if (!isDm(state, viewer) && !canControlActor(actor, viewer, state))
    refuse("Puoi far salire solo i tuoi personaggi.", "You can only board your own characters.");
  vehicle.aboard = vehicle.aboard.filter((row) => row.actorId !== actorId);
  if (!role) return;
  if (!["driver", "passenger"].includes(role)) refuse("Ruolo non valido.", "Invalid role.");
  if (role === "driver" && vehicle.aboard.some((row) => row.role === "driver"))
    refuse("C’è già un conducente.", "There is already a driver.");
  if (vehicle.aboard.length >= vehicle.seats)
    refuse(`Posti esauriti (${vehicle.seats}).`, `No seats left (${vehicle.seats}).`);
  vehicle.aboard.push({ actorId, role });
}
export function saveVehicle(state, slice, viewer, input) {
  if (!isDm(state, viewer)) refuse("Solo il DM modifica i veicoli.", "Only the DM edits vehicles.");
  const title = String(input.name ?? "").trim();
  if (!title || title.length > 80)
    refuse("Scrivi il nome del veicolo.", "Write the vehicle's name.");
  const weight = Number(input.vehicleWeightKg),
    seats = Number(input.seats),
    count = Number(input.animals),
    capacity = Number(input.animalCapacityKg),
    speed = Number(input.animalSpeedM);
  if (!Number.isFinite(weight) || weight < 0 || weight > 1_000_000)
    refuse("Peso del veicolo non valido.", "Invalid vehicle weight.");
  if (!int(seats, 0, 500)) refuse("Posti da 0 a 500.", "Seats 0 to 500.");
  if (!int(count, 0, 12)) refuse("Animali da traino da 0 a 12.", "Draft animals 0 to 12.");
  if (
    count &&
    (!Number.isFinite(capacity) || capacity <= 0 || !Number.isFinite(speed) || speed < 0)
  )
    refuse("Capacità e velocità dell’animale non valide.", "Invalid animal capacity or speed.");
  const override = input.speedM === "" || input.speedM == null ? null : Number(input.speedM);
  if (override !== null && (!Number.isFinite(override) || override < 0))
    refuse("Velocità non valida.", "Invalid speed.");
  let vehicle = input.vehicleId ? vehicleOf(slice, input.vehicleId) : null;
  if (!vehicle) {
    vehicle = normalizeVehicle({
      id: uid("vehicle"),
      name: L(title, title),
      primary: !slice.vehicles.length,
    });
    slice.vehicles.push(vehicle);
  }
  const kind =
    String(input.animalKind ?? "").trim() ||
    nameOf(vehicle.animals[0]?.kind, "it") ||
    "Animale da traino";
  vehicle.name = nameOf(vehicle.name, "it") === title ? vehicle.name : L(title, title);
  vehicle.vehicleWeightKg = round2(weight);
  vehicle.seats = seats;
  vehicle.speedM = override;
  const kept = vehicle.animals.slice(0, count);
  while (kept.length < count)
    kept.push({
      id: uid("animal"),
      name: `${kind} ${kept.length + 1}`,
      kind: L(kind, kind),
      capacityKg: 0,
      speedM: 0,
    });
  vehicle.animals = kept.map((a) => ({
    ...a,
    capacityKg: round2(capacity),
    speedM: round2(speed),
  }));
  if (vehicle.aboard.length > seats) vehicle.aboard = vehicle.aboard.slice(0, seats);
  return vehicle;
}
export function setPrimary(state, slice, viewer, vehicleId) {
  if (!isDm(state, viewer))
    refuse("Solo il DM sceglie il veicolo principale.", "Only the DM picks the primary vehicle.");
  vehicleOf(slice, vehicleId);
  for (const v of slice.vehicles) v.primary = v.id === vehicleId;
}

// ---------------------------------------------------------------- overview, dashboard, message

export function setHidden(state, slice, viewer, { actorId, hidden }) {
  if (!isDm(state, viewer))
    refuse(
      "Solo il DM nasconde un giocatore dal riepilogo.",
      "Only the DM hides a player from the overview.",
    );
  const list = slice.overview.hidden.filter((id) => id !== actorId);
  if (hidden) list.push(actorId);
  slice.overview.hidden = list;
}
export function setShare(state, slice, viewer, share) {
  if (!isDm(state, viewer))
    refuse(
      "Solo il DM decide chi vede il riepilogo.",
      "Only the DM decides who sees the overview.",
    );
  slice.overview.shareWithPlayers = share === true;
}
const targetOf = (target) =>
  DASHBOARD_TARGETS.includes(target)
    ? target
    : refuse("Cruscotto non valido.", "Invalid dashboard.");
function dashboardEditor(state, viewer) {
  if (!isDm(state, viewer))
    refuse("Solo il DM personalizza i cruscotti.", "Only the DM customises the dashboards.");
}
export function moveTile(state, slice, viewer, { target, id, to }) {
  dashboardEditor(state, viewer);
  const list = slice.dashboards[targetOf(target)];
  const from = list.findIndex((row) => row.id === id);
  if (from < 0) refuse("Riquadro non presente.", "Tile not on the dashboard.");
  const index = Math.max(0, Math.min(list.length - 1, Number(to)));
  const [row] = list.splice(from, 1);
  list.splice(index, 0, row);
}
export function setTileWidth(state, slice, viewer, { target, id, wide }) {
  dashboardEditor(state, viewer);
  const row =
    slice.dashboards[targetOf(target)].find((r) => r.id === id) ??
    refuse("Riquadro non presente.", "Tile not on the dashboard.");
  row.wide = wide === true;
}
export function removeTile(state, slice, viewer, { target, id }) {
  dashboardEditor(state, viewer);
  const list = slice.dashboards[targetOf(target)];
  if (!list.some((r) => r.id === id))
    refuse("Riquadro non presente.", "Tile not on the dashboard.");
  slice.dashboards[target] = list.filter((r) => r.id !== id);
}
export function addTile(state, slice, viewer, { target, id, config = null }) {
  dashboardEditor(state, viewer);
  if (!TILES[id]) refuse("Riquadro sconosciuto.", "Unknown tile.");
  const list = slice.dashboards[targetOf(target)];
  if (TILES[id].many) {
    // Kanka: as many list, calendar and preview widgets as the DM wants, each configured.
    let n = 1;
    while (list.some((r) => r.id === `${id}:${n}`)) n++;
    const row = { id: `${id}:${n}`, wide: id === "list" };
    const clean = tileConfig({ id, config });
    if (clean) row.config = clean;
    if (id === "preview" && !row.config.entryId)
      refuse("Scegli la voce da mostrare.", "Choose the entry to show.");
    list.push(row);
    return row.id;
  }
  if (list.some((r) => r.id === id))
    refuse("Il riquadro è già nel cruscotto.", "The tile is already on the dashboard.");
  list.push({ id, wide: false });
  return id;
}
export function resetDashboard(state, slice, viewer, { target }) {
  dashboardEditor(state, viewer);
  slice.dashboards[targetOf(target)] = copy(DEFAULT_DASHBOARDS[target]);
}
export function setNote(state, slice, viewer, { target, text }) {
  dashboardEditor(state, viewer);
  const value = String(text ?? "").trim();
  if (value.length > 600)
    refuse("La nota arriva a 600 caratteri.", "The note is up to 600 characters.");
  slice.notes[targetOf(target)] = value;
}
export function setMotd(state, slice, viewer, { enabled, text }) {
  if (!isDm(state, viewer))
    refuse(
      "Solo il DM scrive il messaggio d’inizio sessione.",
      "Only the DM writes the session-start message.",
    );
  const value = String(text ?? "").trim();
  if (value.length > 600)
    refuse("Il messaggio arriva a 600 caratteri.", "The message is up to 600 characters.");
  if (enabled && !value)
    refuse("Scrivi il messaggio prima di mostrarlo.", "Write the message before showing it.");
  slice.motd = {
    enabled: enabled === true,
    text: value,
    revision: slice.motd.revision + 1,
    updatedAt: new Date().toISOString(),
  };
}
// The message is due for a player member who has not seen this revision (FG shows it at
// every login; here once per revision per identity on this device).
export function motdDue(state, slice, viewer, seenRevision) {
  if (!slice?.motd?.enabled || !slice.motd.text) return false;
  if (isDm(state, viewer) || !isCampaignMember(state, state.campaign?.id, viewer)) return false;
  return seenRevision !== slice.motd.revision;
}
export const dashboardTarget = (state, viewer) => (isDm(state, viewer) ? "dm" : "player");

// ---------------------------------------------------------------- UI state and helpers

const ui = {
  setup: null, // {target} while the DM customises a dashboard
  spells: { shared: false, prepared: false },
  labels: new Set(), // commit labels of this area, for the Undo bar
};
let dragId = null;
export function resetPartyView() {
  ui.setup = null;
  ui.spells = { shared: false, prepared: false };
  dragId = null;
}
// FG shows the Message of the Day at every login: here once per load of the app (a login)
// for each identity and message revision, kept in memory only, never on the device.
const seenMemory = {};
const readSeen = () => seenMemory;
function markSeen(key, revision) {
  seenMemory[key] = revision;
}
export function forgetMotdSeen() {
  for (const key of Object.keys(seenMemory)) delete seenMemory[key];
}
const seenKey = (state, viewer) => `${state.campaign?.id}:${viewer}`;

const units = B.unitOf;
const weight = (ctx, kg) => U.formatWeight(kg, units(ctx), ctx.lang);
const distance = (ctx, m) => U.formatDistance(m, units(ctx), ctx.lang);
const weightUnit = (ctx) => (units(ctx) === "imperial" ? "lb" : "kg");
const toKg = (ctx, value) =>
  units(ctx) === "imperial" ? U.poundsToKg(Number(value)) : Number(value);
const toMetres = (ctx, value) =>
  units(ctx) === "imperial" ? U.feetToMeters(Number(value)) : Number(value);
const distanceUnit = (ctx) => (units(ctx) === "imperial" ? "ft" : "m");
const signed = (n) => (n === null || n === undefined ? "—" : n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const className = (ctx, actor) =>
  `${ctx.esc(ctx.label(actor.className ?? ""))}${actor.level ? ` ${actor.level}` : ""}`;

function commitParty(ctx, label, mutate, options = {}) {
  // Known before the commit renders, so the new page already offers its Undo.
  ui.labels.add(label);
  try {
    ctx.commit(
      label,
      (draft) => {
        const slice = sliceOf(draft);
        if (!slice) throw new Error("Party data unavailable");
        mutate(draft, slice);
      },
      options.privateBase ? { local: true, visibility: "private" } : {},
    );
    return true;
  } catch (error) {
    if (options.throwInDialog) throw error;
    ctx.toast(ctx.label(error.it ? { it: error.it, en: error.en } : error.message), true);
    return false;
  }
}
// The bastion binders work on the bastions sub-slice.
const api = {
  slice: (state) => sliceOf(state)?.bastions,
  commit: (ctx, label, mutate, options) =>
    commitParty(ctx, label, (draft, slice) => mutate(draft, slice.bastions), options),
};
function undoBar(ctx) {
  const last = ctx.undoLabel?.();
  return last && ui.labels.has(last)
    ? `<p class="party-undo"><button type="button" class="button quiet" data-party-undo>${ctx.icon?.("undo") ?? ""} ${ctx.t("Annulla", "Undo")}: ${ctx.esc(last)}</button></p>`
    : "";
}
const openSheetButton = (ctx, actor, tab = "actions", text = null) =>
  `<button type="button" class="button quiet" data-party-sheet="${ctx.esc(actor.id)}" data-tab="${ctx.esc(tab)}">${ctx.esc(text ?? ctx.t("Apri scheda", "Open sheet"))}</button>`;
const partyRoute = (ctx, tab, text, style = "") =>
  `<button type="button" class="button ${style}" data-party-route="${ctx.esc(tab)}">${ctx.esc(text)}</button>`;

// ---------------------------------------------------------------- party overview

function hpCell(ctx, row) {
  const pct =
    row.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((100 * row.hp) / row.maxHp))) : 0;
  return `<span class="party-hp"><strong>${row.hp ?? "?"}</strong> / ${row.maxHp ?? "?"}${row.tempHp ? ` <span class="badge">+${row.tempHp} ${ctx.t("temp.", "temp")}</span>` : ""}</span><span class="party-hpbar${pct <= 25 ? " is-low" : pct <= 50 ? " is-mid" : ""}" aria-hidden="true"><span style="width:${pct}%"></span></span>`;
}
function savesCell(ctx, row) {
  return `<span class="party-saves">${ABILITIES.map((a) => {
    const save = row.saves[a];
    return `<span class="party-save${save.proficient ? " is-proficient" : ""}" title="${ctx.esc(ctx.label(ABILITY_SHORT[a]))}${save.proficient ? " · " + ctx.t("competente", "proficient") : ""}"><abbr>${ctx.esc(ctx.label(ABILITY_SHORT[a]))}</abbr> ${signed(save.value)}</span>`;
  }).join("")}</span>`;
}
function languagesCell(ctx, row) {
  return row.languages?.length
    ? ctx.esc(row.languages.map((id) => languageName(id, ctx.lang)).join(", "))
    : `<span class="muted">${ctx.t("non registrate", "not recorded")}</span>`;
}
function overviewTable(ctx, rows, { dm }) {
  const heads = [
    ctx.t("Personaggio", "Character"),
    ctx.t("PF", "HP"),
    ctx.t("CA", "AC"),
    ...PASSIVES.map((p) => ctx.t(`${ctx.label(p.label)} passiva`, `Passive ${ctx.label(p.label)}`)),
    ctx.t("Tiri salvezza", "Saving throws"),
    ctx.t("Lingue", "Languages"),
    ctx.t("Comandi", "Commands"),
  ];
  return `<div class="table-wrap party-table-wrap"><table class="party-table"><thead><tr>${heads.map((h) => `<th scope="col">${ctx.esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr data-party-row="${ctx.esc(row.id)}"><th scope="row" data-label="${ctx.esc(heads[0])}"><span class="party-who"><strong>${ctx.esc(row.name)}</strong><span class="muted">${className(ctx, row)}${row.form ? " · " + ctx.t("in forma", "in a form") : ""}</span></span></th><td data-label="${ctx.esc(heads[1])}">${hpCell(ctx, row)}</td><td data-label="${ctx.esc(heads[2])}" data-party-ac><strong>${row.ac ?? "—"}</strong></td>${PASSIVES.map(
          (p, i) =>
            `<td data-label="${ctx.esc(heads[3 + i])}" data-party-passive="${p.id}"><strong>${row.passives[p.id].value ?? "—"}</strong></td>`,
        ).join(
          "",
        )}<td data-label="${ctx.esc(heads[6])}">${savesCell(ctx, row)}</td><td data-label="${ctx.esc(heads[7])}" data-party-languages>${languagesCell(ctx, row)}</td><td data-label="${ctx.esc(heads[8])}" class="party-row-commands">${openSheetButton(ctx, row)}${
          dm
            ? `<button type="button" class="button quiet" data-party-hide="${ctx.esc(row.id)}" aria-label="${ctx.t("Nascondi dal riepilogo", "Hide from the overview")}: ${ctx.esc(row.name)}">${ctx.t("Nascondi", "Hide")}</button>`
            : ""
        }</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
// Companions connected to the campaign (familiars, Wild Companions…): the core Party page
// listed them with their sheet; FG and Foundry party sheets hold only the characters, so
// they stay out of the table and are listed below it.
export function partyCompanions(state, viewer) {
  const campaignId = state.campaign?.id;
  if (!campaignId || !isCampaignMember(state, campaignId, viewer)) return [];
  return Object.values(state.actors ?? {})
    .filter(
      (actor) =>
        actor.companion && isCampaignActor(actor, campaignId) && canViewActor(actor, viewer, state),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}
function companionsBlock(ctx) {
  const list = partyCompanions(ctx.state, ctx.role);
  if (!list.length) return "";
  return `<section class="party-companions" data-party-companions><h3>${ctx.t("Compagni", "Companions")}</h3><ul class="party-chips">${list
    .map((actor) => {
      const parent = ctx.state.actors[actor.companion.parentActorId];
      const of =
        parent && canViewActor(parent, ctx.role, ctx.state)
          ? ` · ${ctx.t(`di ${parent.name}`, `${parent.name}’s`)}`
          : "";
      return `<li class="party-chip" data-party-companion="${ctx.esc(actor.id)}"><strong>${ctx.esc(actor.name)}</strong> <span class="muted">${ctx.esc(of)} · ${actor.hp ?? "?"} / ${actor.maxHp ?? "?"} ${ctx.t("PF", "HP")}</span> ${openSheetButton(ctx, actor)}</li>`;
    })
    .join("")}</ul></section>`;
}
function renderOverview(ctx) {
  const state = ctx.state,
    slice = sliceOf(state);
  const dm = isDm(state, ctx.role);
  const members = partyMembers(state, ctx.role);
  // Party Overview (FVT-071): hiding is the DM's filter on the DM's own overview; players
  // always keep every party character, also when the DM shares the table.
  const hidden = dm ? slice.overview.hidden : [];
  const visible = members.filter((a) => !hidden.includes(a.id));
  const rows = visible.map((actor) => partyRow(state, actor));
  const legend = `<p class="muted party-legend">${ctx.t("Valori letti dalle schede, gli stessi numeri della scheda: oggetti indossati (per esempio il Mantello della protezione), condizioni e Indebolimento compresi, aggiornati a ogni modifica; nessun dato da ricopiare.", "Values read from the sheets, the sheet’s own numbers: worn items (for example the Cloak of Protection), conditions and Exhaustion included, updated on every change; nothing to copy by hand.")} ${ctx.t("Passiva = 10 + modificatore della prova", "Passive = 10 + the check's modifier")} (${sourceText(ctx, SOURCES.passive)}); ${ctx.t("tiro salvezza = modificatore + bonus di competenza se la classe lo concede", "saving throw = modifier + Proficiency Bonus if the class grants it")} (${sourceText(ctx, SOURCES.proficiency)}). ${ctx.t("In evidenza i tiri salvezza con competenza.", "Proficient saves are highlighted.")}</p>`;
  if (!members.length)
    return `<p class="campaign-empty">${ctx.t("Nessun personaggio del gruppo disponibile.", "No party characters available.")}</p>`;
  if (!dm && !slice.overview.shareWithPlayers)
    return `<p class="muted" data-party-private-overview>${ctx.t("Il DM non ha condiviso il riepilogo completo: qui trovi i personaggi e i loro PF.", "The DM has not shared the full overview: here are the characters and their HP.")}</p>${visible
      .map(
        (actor) =>
          `<article class="campaign-row" data-party-row="${ctx.esc(actor.id)}"><div><h3>${ctx.esc(actor.name)}</h3><p>${className(ctx, actor)}</p><p class="campaign-meta">${actor.hp ?? "?"} / ${actor.maxHp ?? "?"} ${ctx.t("PF", "HP")}</p></div>${openSheetButton(ctx, actor)}</article>`,
      )
      .join("")}${companionsBlock(ctx)}`;
  const hiddenActors = members.filter((a) => hidden.includes(a.id));
  return `${
    dm
      ? `<div class="party-overview-tools"><label class="check-field"><input type="checkbox" data-party-share${slice.overview.shareWithPlayers ? " checked" : ""}> ${ctx.t("Mostra il riepilogo anche ai giocatori", "Also show the overview to players")}</label></div>`
      : ""
  }${rows.length ? overviewTable(ctx, rows, { dm }) : `<p class="muted">${ctx.t("Tutti i personaggi sono nascosti dal riepilogo.", "Every character is hidden from the overview.")}</p>`}${
    dm && hiddenActors.length
      ? `<p class="party-hidden" data-party-hidden-list>${ctx.t("Nascosti dal riepilogo", "Hidden from the overview")}: ${hiddenActors
          .map(
            (a) =>
              `<span class="party-hidden-item">${ctx.esc(a.name)} <button type="button" class="button quiet" data-party-show="${ctx.esc(a.id)}" aria-label="${ctx.t("Mostra nel riepilogo", "Show in the overview")}: ${ctx.esc(a.name)}">${ctx.t("Mostra", "Show")}</button></span>`,
          )
          .join(" ")}</p>`
      : ""
  }${companionsBlock(ctx)}${legend}`;
}

// ---------------------------------------------------------------- shared spells view

const levelName = (ctx, level) =>
  level === 0 ? ctx.t("Trucchetti", "Cantrips") : ctx.t(`${level}° livello`, `Level ${level}`);
function renderSpells(ctx) {
  const data = sharedSpells(ctx.state, ctx.role, ctx.lang);
  const f = ui.spells;
  const groups = data.levels
    .map((group) => ({
      level: group.level,
      spells: group.spells.filter(
        (s) => (!f.shared || s.shared) && (!f.prepared || s.casters.some((c) => c.prepared)),
      ),
    }))
    .filter((group) => group.spells.length);
  return `<div class="party-spell-tools" role="group" aria-label="${ctx.t("Filtri", "Filters")}"><label class="check-field"><input type="checkbox" data-party-spell-filter="shared"${f.shared ? " checked" : ""}> ${ctx.t("Solo magie in comune", "Only spells in common")}</label><label class="check-field"><input type="checkbox" data-party-spell-filter="prepared"${f.prepared ? " checked" : ""}> ${ctx.t("Solo preparate", "Only prepared")}</label></div><p class="muted">${ctx.t("Sola consultazione: ognuno prepara le magie dalla propria scheda. Preparata non vuol dire lanciabile ora (slot, componenti e condizioni restano sulla scheda e al Tavolo). Le schede private non compaiono.", "Read-only: each character prepares spells from their own sheet. Prepared does not mean castable now (slots, components and conditions stay on the sheet and at the Table). Private sheets do not appear.")}</p>${
    groups.length
      ? groups
          .map(
            (group) =>
              `<section class="party-spell-level" data-party-spell-level="${group.level}"><h3>${ctx.esc(levelName(ctx, group.level))}</h3><ul class="party-spell-list">${group.spells
                .map(
                  (spell) =>
                    `<li class="party-spell" data-party-spell="${ctx.esc(spell.key)}"><span class="party-spell-name">${ctx.esc(ctx.label(spell.name))}${spell.shared ? ` <span class="badge party-shared">${ctx.t("In comune", "In common")}</span>` : ""}</span><span class="party-casters">${spell.casters
                      .map(
                        (c) =>
                          `<button type="button" class="party-caster${c.prepared ? " is-prepared" : ""}" data-party-sheet="${ctx.esc(c.actorId)}" data-tab="spells" aria-label="${ctx.esc(c.name)}: ${c.prepared ? ctx.t("preparata", "prepared") : ctx.t("conosciuta, non preparata", "known, not prepared")} · ${ctx.t("apri le magie", "open spells")}">${ctx.esc(c.name)}<small>${c.prepared ? ctx.t("preparata", "prepared") : ctx.t("non preparata", "not prepared")}</small></button>`,
                      )
                      .join("")}</span></li>`,
                )
                .join("")}</ul></section>`,
          )
          .join("")
      : `<p class="campaign-empty">${ctx.t("Nessuna magia corrisponde ai filtri.", "No spell matches the filters.")}</p>`
  }${
    data.without.length
      ? `<p class="muted" data-party-without-spells>${ctx.t("Senza incantesimi registrati", "No spells recorded")}: ${ctx.esc(data.without.map((a) => a.name).join(", "))}</p>`
      : ""
  }`;
}

// ---------------------------------------------------------------- vehicles view

function loadBar(ctx, stats) {
  const pct =
    stats.maxCargoKg > 0
      ? Math.min(100, Math.round((100 * stats.cargoKg) / stats.maxCargoKg))
      : 100;
  return `<div class="party-load${stats.over ? " is-over" : ""}"><span class="party-load-bar" aria-hidden="true"><span style="width:${Math.max(pct, stats.cargoKg ? 2 : 0)}%"></span></span><p data-party-load-status>${
    stats.over
      ? `<strong class="error">${ctx.t("Oltre la capacità di", "Over capacity by")} ${ctx.esc(weight(ctx, round2(stats.cargoKg - stats.maxCargoKg)))}</strong> · ${ctx.t("il DM decide le conseguenze; nessuna penalità è applicata da sola.", "the DM decides the consequences; no penalty is applied automatically.")}`
      : `${ctx.t("Ancora", "Still")} ${ctx.esc(weight(ctx, round2(stats.maxCargoKg - stats.cargoKg)))} ${ctx.t("di carico disponibile.", "of load available.")}`
  }</p></div>`;
}
function renderVehicle(ctx, vehicle) {
  const state = ctx.state;
  const dm = isDm(state, ctx.role);
  const stats = vehicleStats(vehicle);
  const members = partyMembers(state, ctx.role);
  const controlled = members.filter((a) => canControlActor(a, ctx.role, state));
  const id = ctx.esc(vehicle.id);
  const aboard = vehicle.aboard
    .map((row) => {
      const actor = state.actors[row.actorId];
      if (!actor || !canViewActor(actor, ctx.role, state)) return "";
      const can = dm || canControlActor(actor, ctx.role, state);
      return `<li class="party-chip"><strong>${ctx.esc(actor.name)}</strong> <span class="muted">${row.role === "driver" ? ctx.t("conducente", "driver") : ctx.t("passeggero", "passenger")}</span>${
        can
          ? ` <button type="button" class="button quiet" data-party-vehicle="leave" data-vehicle="${id}" data-actor="${ctx.esc(actor.id)}" aria-label="${ctx.t("Fai scendere", "Get off")}: ${ctx.esc(actor.name)}">${ctx.t("Scendi", "Get off")}</button>`
          : ""
      }</li>`;
    })
    .join("");
  const boardable = (dm ? members : controlled).filter(
    (a) => !vehicle.aboard.some((row) => row.actorId === a.id),
  );
  const cargo = vehicle.cargo
    .map((row) => {
      const from = row.fromActorId ? state.actors[row.fromActorId] : null;
      return `<tr data-party-cargo="${ctx.esc(row.id)}"><th scope="row"><span class="party-who">${ctx.esc(ctx.label(cargoName(row)))}${from && canViewActor(from, ctx.role, state) ? `<span class="muted">${ctx.t("da", "from")} ${ctx.esc(from.name)}</span>` : ""}</span></th><td data-label="${ctx.t("Qtà", "Qty")}" data-party-qty>${row.quantity}</td><td data-label="${ctx.t("Peso", "Weight")}">${ctx.esc(weight(ctx, round2(row.quantity * row.weightKg)))}</td><td><div class="party-cargo-commands">${
        controlled.length
          ? `<form class="party-unload" data-party-form="unload" data-vehicle="${id}" data-cargo="${ctx.esc(row.id)}"><select name="actorId" aria-label="${ctx.t("Scarica a", "Unload to")}: ${ctx.esc(ctx.label(cargoName(row)))}">${controlled.map((a) => `<option value="${ctx.esc(a.id)}"${a.id === row.fromActorId ? " selected" : ""}>${ctx.esc(a.name)}</option>`).join("")}</select><input type="number" name="quantity" min="1" max="${row.quantity}" value="${row.quantity}" aria-label="${ctx.t("Quantità da scaricare", "Quantity to unload")}: ${ctx.esc(ctx.label(cargoName(row)))}"><button type="submit" class="button">${ctx.t("Scarica", "Unload")}</button></form>`
          : ""
      }${
        dm
          ? `<button type="button" class="button quiet" data-party-vehicle="remove-goods" data-vehicle="${id}" data-cargo="${ctx.esc(row.id)}">${ctx.t("Togli", "Remove")}</button>`
          : ""
      }</div></td></tr>`;
    })
    .join("");
  const loadable = controlled.flatMap((actor) =>
    (actor.inventory ?? [])
      .filter((item) => !item.equipped && (item.quantity ?? 1) > 0)
      .map((item) => ({ actor, item })),
  );
  const animals = vehicle.animals.length
    ? `${ctx.esc(vehicle.animals.map((a) => a.name).join(", "))} (${ctx.esc(ctx.label(vehicle.animals[0].kind))}, ${ctx.esc(weight(ctx, vehicle.animals[0].capacityKg))} ${ctx.t("di capacità di trasporto ciascuno", "carrying capacity each")})`
    : ctx.t("nessun animale da traino", "no draft animals");
  return `<article class="party-vehicle" data-vehicle="${id}"><header class="party-base-head"><div><h3>${ctx.esc(ctx.label(vehicle.name))}${vehicle.primary ? ` <span class="badge">${ctx.t("Veicolo principale", "Primary vehicle")}</span>` : ""}</h3><p class="muted">${ctx.t("Traino", "Pulled by")}: ${animals}</p></div><div class="toolbar">${
    dm && !vehicle.primary
      ? `<button type="button" class="button quiet" data-party-vehicle="primary" data-vehicle="${id}">${ctx.t("Rendi principale", "Make primary")}</button>`
      : ""
  }${dm ? `<button type="button" class="button" data-party-vehicle="edit" data-vehicle="${id}">${ctx.t("Modifica veicolo", "Edit vehicle")}</button>` : ""}</div></header><div class="stats party-vehicle-stats"><div class="stat"><strong data-party-speed>${ctx.esc(distance(ctx, stats.speedM))}</strong><span>${ctx.t("Velocità", "Speed")}</span></div><div class="stat"><strong data-party-load>${ctx.esc(weight(ctx, stats.cargoKg))} / ${ctx.esc(weight(ctx, stats.maxCargoKg))}</strong><span>${ctx.t("Carico", "Load")}</span></div><div class="stat"><strong data-party-aboard>${stats.aboard} / ${stats.seats}</strong><span>${ctx.t("A bordo", "Aboard")}</span></div></div>${loadBar(ctx, stats)}<p class="muted party-legend">${ctx.t("Capacità di traino", "Pulling capacity")} ${ctx.esc(weight(ctx, stats.pullKg))} = ${PULL_FACTOR} × ${ctx.esc(weight(ctx, stats.capacityKg))} ${ctx.t("degli animali, incluso il veicolo", "of the animals, vehicle included")} (${ctx.esc(weight(ctx, vehicle.vehicleWeightKg))}) · ${sourceText(ctx, SOURCES.vehicles)}. ${stats.speedFromAnimals ? `${ctx.t("Velocità dell’animale da traino più lento", "Speed of the slowest draft animal")} (${sourceText(ctx, SOURCES.draftHorse)}); ${ctx.t("scelta del tavolo, modificabile dal DM.", "a table choice the DM can change.")}` : ctx.t("Velocità indicata dal DM.", "Speed set by the DM.")} ${vehicle.note ? ctx.esc(ctx.label(vehicle.note)) : ""}</p><h4>${ctx.t("A bordo", "Aboard")}</h4>${aboard ? `<ul class="party-chips">${aboard}</ul>` : `<p class="muted">${ctx.t("Nessuno a bordo.", "Nobody aboard.")}</p>`}${
    boardable.length
      ? `<form class="party-inline-form" data-party-form="board" data-vehicle="${id}"><label class="field">${ctx.t("Personaggio", "Character")}<select name="actorId">${boardable.map((a) => `<option value="${ctx.esc(a.id)}">${ctx.esc(a.name)}</option>`).join("")}</select></label><label class="field">${ctx.t("Posto", "Seat")}<select name="role"><option value="passenger">${ctx.t("Passeggero", "Passenger")}</option><option value="driver">${ctx.t("Conducente", "Driver")}</option></select></label><button class="button" type="submit">${ctx.t("Sali a bordo", "Board")}</button></form>`
      : ""
  }<h4>${ctx.t("Carico", "Cargo")}</h4>${
    cargo
      ? `<div class="table-wrap"><table class="party-cargo"><thead><tr><th scope="col">${ctx.t("Merce", "Goods")}</th><th scope="col">${ctx.t("Qtà", "Qty")}</th><th scope="col">${ctx.t("Peso", "Weight")}</th><th scope="col">${ctx.t("Comandi", "Commands")}</th></tr></thead><tbody>${cargo}</tbody></table></div>`
      : `<p class="muted">${ctx.t("Il veicolo è vuoto.", "The vehicle is empty.")}</p>`
  }${
    loadable.length
      ? `<form class="party-inline-form" data-party-form="load" data-vehicle="${id}"><label class="field">${ctx.t("Carica dall’inventario", "Load from an inventory")}<select name="source">${loadable.map(({ actor, item }) => `<option value="${ctx.esc(actor.id)}|${ctx.esc(item.id)}">${ctx.esc(actor.name)} · ${ctx.esc(ctx.label(item.name))} (${item.quantity ?? 1})</option>`).join("")}</select></label><label class="field">${ctx.t("Quantità", "Quantity")}<input type="number" name="quantity" min="1" value="1"></label><button class="button" type="submit">${ctx.t("Carica", "Load")}</button></form>`
      : ""
  }<form class="party-inline-form" data-party-form="goods" data-vehicle="${id}"><label class="field">${ctx.t("Altra merce", "Other goods")}<input name="name" maxlength="80" required></label><label class="field">${ctx.t("Quantità", "Quantity")}<input type="number" name="quantity" min="1" value="1"></label><label class="field">${ctx.t("Peso unitario", "Unit weight")} (${weightUnit(ctx)})<input type="number" name="weight" min="0" step="0.5" value="1"></label><button class="button" type="submit">${ctx.t("Aggiungi merce", "Add goods")}</button></form></article>`;
}
function renderVehicles(ctx) {
  const slice = sliceOf(ctx.state);
  const dm = isDm(ctx.state, ctx.role);
  return `${
    slice.vehicles.length
      ? slice.vehicles.map((v) => renderVehicle(ctx, v)).join("")
      : `<p class="campaign-empty">${ctx.t("Il gruppo non ha veicoli.", "The party has no vehicles.")}</p>`
  }${dm ? `<p><button type="button" class="button" data-party-vehicle="new">${ctx.t("Nuovo veicolo", "New vehicle")}</button></p>` : ""}`;
}
function vehicleDialogBody(ctx, vehicle) {
  const animal = vehicle?.animals[0];
  const imperial = units(ctx) === "imperial";
  const w = (kg) => (imperial ? U.kgToPounds(kg) : kg);
  const d = (m) => (imperial ? U.metersToFeet(m) : m);
  const step = imperial ? 5 : 1.5;
  return `<div class="form-grid"><label class="field">${ctx.t("Nome", "Name")}<input name="name" maxlength="80" required value="${ctx.esc(vehicle ? ctx.label(vehicle.name) : "")}"></label><label class="field">${ctx.t("Peso del veicolo", "Vehicle weight")} (${weightUnit(ctx)})<input type="number" name="vehicleWeight" min="0" step="0.5" value="${w(vehicle?.vehicleWeightKg ?? 0)}"></label><label class="field">${ctx.t("Posti a bordo", "Seats")}<input type="number" name="seats" min="0" max="500" value="${vehicle?.seats ?? 2}"></label><label class="field">${ctx.t("Animali da traino", "Draft animals")}<input type="number" name="animals" min="0" max="12" value="${vehicle?.animals.length ?? 0}"></label><label class="field">${ctx.t("Tipo di animale", "Animal type")}<input name="animalKind" maxlength="40" value="${ctx.esc(animal ? ctx.label(animal.kind) : ctx.t("Cavallo da tiro", "Draft horse"))}"></label><label class="field">${ctx.t("Capacità di trasporto per animale", "Carrying capacity per animal")} (${weightUnit(ctx)})<input type="number" name="animalCapacity" min="0" step="0.5" value="${w(animal?.capacityKg ?? 270)}"></label><label class="field">${ctx.t("Velocità dell’animale", "Animal speed")} (${distanceUnit(ctx)})<input type="number" name="animalSpeedM" min="0" step="${step}" value="${d(animal?.speedM ?? 12)}"></label><label class="field">${ctx.t("Velocità del veicolo", "Vehicle speed")} (${distanceUnit(ctx)}, ${ctx.t("vuoto = dell’animale più lento", "empty = slowest animal")})<input type="number" name="speedM" min="0" step="${step}" value="${Number.isFinite(vehicle?.speedM) ? d(vehicle.speedM) : ""}"></label></div><p class="muted">${ctx.t("Riferimenti SRD: Carro 200 kg, Cavallo da tiro 270 kg di capacità e velocità 12 m", "SRD references: Wagon 400 lb, Draft Horse 540 lb carrying capacity and Speed 40 ft")} (${sourceText(ctx, SOURCES.vehicles)}; ${sourceText(ctx, SOURCES.draftHorse)}).</p>`;
}

// ---------------------------------------------------------------- party section

const PARTY_TABS = [
  ["overview", L("Riepilogo", "Overview")],
  ["spells", L("Magie condivise", "Shared spells")],
  ["bases", L("Basi e bastioni", "Bases and bastions")],
  ["vehicles", L("Veicoli", "Vehicles")],
];
const currentTab = (ctx) =>
  PARTY_TABS.some(([id]) => id === ctx.view.id) ? ctx.view.id : "overview";
// R7 PG-85 (C13; D&D Beyond «Join with this character») and PG-17 (C12; D&D Beyond Manage
// Experience, Fantasy Grounds party award): the Gruppo page's own commands. Each opens the
// owning area's dialog, loaded on demand so this page stays usable without that area.
export function openAddCharacter(ctx) {
  return import("./character-library.mjs")
    .then((module) => module.openLinkToCampaign(ctx, ctx.state.campaign?.id))
    .catch(() =>
      ctx.toast(
        ctx.t(
          "La libreria dei personaggi non è disponibile ora: riprova tra poco.",
          "The character library is not available now: try again shortly.",
        ),
        true,
      ),
    );
}
export function openPartyAward(ctx) {
  return import("./loot.mjs")
    .then((module) => module.openAward(ctx))
    .catch(() =>
      ctx.toast(
        ctx.t(
          "L’assegnazione di PE e monete non è disponibile ora: riprova tra poco.",
          "Awarding XP and coins is not available now: try again shortly.",
        ),
        true,
      ),
    );
}
function partyCommands(ctx) {
  const campaignId = ctx.state.campaign?.id;
  const role = campaignId ? memberRole(ctx.state, campaignId, ctx.role) : null;
  const add =
    role && role !== "observer" && ctx.registry?.get?.("route", "characters")
      ? `<button type="button" class="button" data-party-add-character>${ctx.icon?.("plus") ?? ""} ${ctx.t("Aggiungi un mio personaggio", "Add one of my characters")}</button>`
      : "";
  const award =
    isDm(ctx.state, ctx.role) && ctx.registry?.get?.("command", "loot-award", ctx)
      ? `<button type="button" class="button" data-party-award>${ctx.t("Assegna PE e monete", "Award XP and coins")}</button>`
      : "";
  return add || award ? `<div class="toolbar party-commands">${add}${award}</div>` : "";
}
export function renderPartySection(ctx) {
  const slice = sliceOf(ctx.state);
  if (!slice)
    return `<p class="campaign-empty">${ctx.t("Dati del gruppo non disponibili.", "Party data unavailable.")}</p>`;
  const tab = currentTab(ctx);
  const body =
    tab === "spells"
      ? renderSpells(ctx)
      : tab === "bases"
        ? B.renderBasesTab(ctx, ctx.state, slice.bastions)
        : tab === "vehicles"
          ? renderVehicles(ctx)
          : renderOverview(ctx);
  return `<div class="party-page" data-party-page="${tab}"><header class="campaign-heading"><div><h1 tabindex="-1" data-campaign-heading>${ctx.t("Gruppo", "Party")}</h1><p class="muted">${ctx.esc(ctx.label(ctx.state.campaign?.name ?? ""))}</p></div>${partyCommands(ctx)}</header><nav class="tabs party-tabs" aria-label="${ctx.t("Sezioni del gruppo", "Party sections")}">${PARTY_TABS.map(
    ([id, name]) =>
      `<button type="button" class="${id === tab ? "active" : ""}" data-party-tab="${id}"${id === tab ? ' aria-current="page"' : ""}>${ctx.esc(ctx.label(name))}</button>`,
  ).join("")}</nav>${undoBar(ctx)}<div class="party-body">${body}</div></div>`;
}

// ---------------------------------------------------------------- dashboard (Overview)

// D&D Beyond's campaign character card: the portrait (the sheet's own, from the media area,
// or the initial in the BG3 frame), the name that opens the sheet, class and level, the
// player; then the hit points and, where the DM shares them, AC and passive Perception.
function portraitStyle(state, actorId) {
  const url = portraitArt(state, actorId)?.asset?.dataUrl;
  return isDataUrl(url) && url.startsWith("data:image/")
    ? ` style="background:url('${url}') center / cover no-repeat"`
    : "";
}
function partyCard(ctx, actor, full) {
  const row = partyRow(ctx.state, actor);
  const art = portraitStyle(ctx.state, actor.id);
  const player = actor.owner ? personName(ctx.state, actor.owner, ctx.lang) : "";
  return `<li class="party-mini party-card" data-party-mini="${ctx.esc(actor.id)}"><span class="portrait party-card-portrait${art ? " has-art" : ""}"${art} aria-hidden="true">${ctx.esc(String(actor.name ?? "?").slice(0, 1))}</span><div class="party-card-body"><div class="party-mini-head"><button type="button" class="text-button" data-party-sheet="${ctx.esc(actor.id)}" data-tab="actions">${ctx.esc(actor.name)}</button><span class="muted">${className(ctx, actor)}</span></div>${player ? `<p class="party-card-player muted">${ctx.esc(ctx.t(`Giocato da ${player}`, `Played by ${player}`))}</p>` : ""}${hpCell(ctx, row)}${
    full
      ? `<span class="party-mini-stats"><span>${ctx.t("CA", "AC")} <strong>${row.ac ?? "—"}</strong></span><span>${ctx.t("PP", "PP")} <strong>${row.passives.perception.value ?? "—"}</strong></span></span>`
      : ""
  }</div></li>`;
}
function tileParty(ctx) {
  const state = ctx.state,
    slice = sliceOf(state);
  const dm = isDm(state, ctx.role);
  const members = partyMembers(state, ctx.role).filter(
    (a) => !dm || !slice.overview.hidden.includes(a.id),
  );
  const full = dm || slice.overview.shareWithPlayers;
  const companions = partyCompanions(state, ctx.role);
  return `<section><h2>${ctx.t("Il gruppo", "The party")}</h2>${
    members.length
      ? `<ul class="party-mini-list party-cards">${members.map((actor) => partyCard(ctx, actor, full)).join("")}</ul>`
      : `<p>${ctx.t("Nessuna scheda del gruppo disponibile.", "No available party sheets.")}</p>`
  }${
    companions.length
      ? `<p class="muted party-mini-companions">${ctx.t("Compagni", "Companions")}: ${companions
          .map(
            (actor) =>
              `<button type="button" class="text-button" data-party-sheet="${ctx.esc(actor.id)}" data-tab="actions">${ctx.esc(actor.name)}</button>`,
          )
          .join(", ")}</p>`
      : ""
  }${partyRoute(ctx, "overview", dm ? ctx.t("Apri il riepilogo del gruppo", "Open the party overview") : ctx.t("Apri il gruppo", "Open the party"))}</section>`;
}
function tileBases(ctx) {
  const state = ctx.state,
    slice = sliceOf(state).bastions;
  const dm = isDm(state, ctx.role);
  const bases = B.visibleBases(state, slice, ctx.role);
  if (!bases.length && !dm) return "";
  return `<section><h2>${ctx.t("Basi e ordini", "Bases and orders")}</h2><p class="muted">${ctx.t("Turno delle basi", "Bases turn")} ${slice.turn}</p>${
    bases.length
      ? `<ul class="party-mini-list">${bases
          .map((base) => {
            const pending = base.orders.filter((o) => o.status === "pending");
            return `<li class="party-mini"><strong>${ctx.esc(ctx.label(base.name))}</strong><span class="muted">${ctx.esc(B.fundsText(ctx, state, base))} · ${ctx.t("ordini in corso", "orders in progress")}: ${pending.length}</span></li>`;
          })
          .join("")}</ul>`
      : `<p>${ctx.t("Nessuna base in gioco.", "No base in play.")}</p>`
  }<div class="toolbar">${dm ? `<button type="button" class="button" data-bastion="advance">${ctx.t("Avanza il turno", "Advance the turn")}</button>` : ""}${partyRoute(ctx, "bases", ctx.t("Apri le basi", "Open the bases"))}</div></section>`;
}
function tileVehicle(ctx) {
  const vehicle = primaryVehicle(sliceOf(ctx.state));
  if (!vehicle) return "";
  const stats = vehicleStats(vehicle);
  return `<section><h2>${ctx.esc(ctx.label(vehicle.name))}</h2><p>${ctx.t("Velocità", "Speed")} <strong>${ctx.esc(distance(ctx, stats.speedM))}</strong> · ${ctx.t("carico", "load")} <strong>${ctx.esc(weight(ctx, stats.cargoKg))} / ${ctx.esc(weight(ctx, stats.maxCargoKg))}</strong> · ${ctx.t("a bordo", "aboard")} ${stats.aboard}/${stats.seats}</p>${loadBar(ctx, stats)}${partyRoute(ctx, "vehicles", ctx.t("Apri i veicoli", "Open the vehicles"))}</section>`;
}
function tileSpells(ctx) {
  const data = sharedSpells(ctx.state, ctx.role, ctx.lang);
  const total = data.levels.reduce((n, g) => n + g.spells.length, 0);
  const common = data.levels.reduce((n, g) => n + g.spells.filter((s) => s.shared).length, 0);
  return `<section><h2>${ctx.t("Magie condivise", "Shared spells")}</h2><p>${total} ${ctx.t("magie nel gruppo", "spells in the party")} · ${common} ${ctx.t("in comune", "in common")}</p>${partyRoute(ctx, "spells", ctx.t("Apri le magie condivise", "Open shared spells"))}</section>`;
}
function tileMotd(ctx) {
  const slice = sliceOf(ctx.state);
  const dm = isDm(ctx.state, ctx.role);
  const m = slice.motd;
  if (!dm)
    return m.enabled && m.text
      ? `<section class="party-motd"><h2>${ctx.t("Messaggio del DM", "Message from the DM")}</h2><p class="party-motd-text" data-party-motd-text>${ctx.esc(m.text)}</p></section>`
      : "";
  return `<section class="party-motd"><h2>${ctx.t("Messaggio d’inizio sessione", "Session-start message")}</h2>${
    m.text
      ? `<p class="party-motd-text" data-party-motd-text>${ctx.esc(m.text)}</p>`
      : `<p class="muted">${ctx.t("Nessun messaggio scritto.", "No message written.")}</p>`
  }<p class="muted" data-party-motd-state>${m.enabled ? ctx.t("Attivo: ogni giocatore lo vede una volta quando entra al Tavolo; resta qui nella sua Panoramica.", "On: each player sees it once when entering the Table; it stays here in their Overview.") : ctx.t("Spento: i giocatori non lo vedono.", "Off: players do not see it.")}</p><button type="button" class="button" data-party-motd="edit">${m.text ? ctx.t("Modifica messaggio", "Edit message") : ctx.t("Scrivi messaggio", "Write message")}</button></section>`;
}
function tileNote(ctx, target) {
  const text = sliceOf(ctx.state).notes[target];
  if (!text) return "";
  return `<section><h2>${target === "dm" ? ctx.t("Nota del DM", "DM note") : ctx.t("Avviso della campagna", "Campaign notice")}</h2><p class="party-motd-text">${ctx.esc(text)}</p></section>`;
}
// ---- P10 CA-03: Kanka widgets. Each shows only what the viewer may read.
function readableEntries(ctx) {
  try {
    return listCampaignEntries(ctx.state, { campaignId: ctx.state.campaign?.id }, ctx.role);
  } catch {
    return [];
  }
}
const entryMatches = (entry, filter) =>
  filter === "world"
    ? entry.kind === "world"
    : ["quest", "recap"].includes(filter)
      ? entry.kind === filter
      : entry.kind === "world" && entry.data?.worldType === filter;
function tileEntryList(ctx, row) {
  const config = row.config ?? { filter: "world", tag: "" };
  const tag = String(config.tag ?? "").toLocaleLowerCase();
  const rows = readableEntries(ctx)
    .filter((entry) => entryMatches(entry, config.filter))
    .filter(
      (entry) =>
        !tag ||
        `${entry.data?.title ?? ""} ${(entry.data?.tags ?? []).join(" ")}`
          .toLocaleLowerCase()
          .includes(tag),
    )
    .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))
    .slice(0, 6);
  const title = `${ctx.label(LIST_FILTERS[config.filter])}${config.tag ? ` · «${config.tag}»` : ""}`;
  return `<section class="party-widget" data-party-widget="list"><h2>${ctx.esc(title)}</h2>${
    rows.length
      ? `<ul class="party-widget-list">${rows.map((entry) => `<li><button type="button" class="text-button" data-campaign-open="${ctx.esc(entry.id)}">${ctx.esc(entry.data?.title || ctx.t("Senza titolo", "Untitled"))}</button>${entry.updatedAt ? ` <small class="muted">${ctx.esc(new Date(entry.updatedAt).toLocaleDateString(ctx.lang === "en" ? "en-GB" : "it-IT"))}</small>` : ""}</li>`).join("")}</ul>`
      : `<p class="muted">${ctx.t("Nessuna voce da mostrare.", "No entry to show.")}</p>`
  }</section>`;
}
function tileCalendar(ctx) {
  let sessions = [];
  try {
    sessions = listCampaignSessions(ctx.state, ctx.state.campaign?.id, ctx.role);
  } catch {
    sessions = [];
  }
  const now = new Date();
  const year = now.getFullYear(),
    month = now.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const dated = sessions.filter((row) => row.startsAt && row.status !== "cancelled");
  const onDay = (d) =>
    dated.filter((row) => {
      const at = new Date(row.startsAt);
      return at.getFullYear() === year && at.getMonth() === month && at.getDate() === d;
    });
  const locale = ctx.lang === "en" ? "en-GB" : "it-IT";
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "narrow" }),
  );
  const cells = [
    ...Array.from({ length: lead }, () => `<span class="party-cal-day is-empty"></span>`),
    ...Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      const hits = onDay(d);
      return `<span class="party-cal-day${hits.length ? " has-session" : ""}${d === now.getDate() ? " is-today" : ""}"${hits.length ? ` title="${ctx.esc(hits.map((h) => h.title || ctx.t("Sessione", "Session")).join(", "))}"` : ""}>${d}</span>`;
    }),
  ].join("");
  const upcoming = dated.filter((row) => row.startsAt >= now.toISOString()).slice(0, 3);
  return `<section class="party-widget" data-party-widget="calendar"><h2>${ctx.esc(now.toLocaleDateString(locale, { month: "long", year: "numeric" }))}</h2><div class="party-cal" role="img" aria-label="${ctx.esc(ctx.t(`Calendario: ${dated.length} sessioni in programma`, `Calendar: ${dated.length} sessions scheduled`))}">${weekdays.map((w) => `<span class="party-cal-head">${ctx.esc(w)}</span>`).join("")}${cells}</div>${upcoming.length ? `<ul class="party-widget-list">${upcoming.map((row) => `<li><strong>${ctx.esc(row.title || ctx.t("Sessione", "Session"))}</strong> <small class="muted">${ctx.esc(new Date(row.startsAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }))}</small></li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna data in programma.", "No date scheduled.")}</p>`}</section>`;
}
function tilePreview(ctx, row) {
  const entry = readableEntries(ctx).find((item) => item.id === row.config?.entryId);
  if (!entry) return "";
  return `<section class="party-widget" data-party-widget="preview"><h2>${ctx.esc(entry.data?.title || ctx.t("Senza titolo", "Untitled"))}</h2><p class="party-motd-text">${ctx.esc(String(entry.data?.body ?? "").slice(0, 320))}${String(entry.data?.body ?? "").length > 320 ? "…" : ""}</p><button type="button" class="button" data-campaign-open="${ctx.esc(entry.id)}">${ctx.t("Apri la voce", "Open the entry")}</button></section>`;
}
// Kanka's «recently modified» widget over the readable entries of the sections in use, then
// the World and personal-notes links the tile always carried.
const ENTRY_KINDS = {
  world: L("Mondo", "World"),
  quest: L("Obiettivo", "Objective"),
  recap: L("Resoconto", "Recap"),
};
function tileLinks(ctx, core) {
  const off = (kind) => core.hidden.includes(kind === "world" ? "world" : "journal");
  const rows = readableEntries(ctx)
    .filter((entry) => ENTRY_KINDS[entry.kind] && !off(entry.kind))
    .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))
    .slice(0, 5);
  const date = (value) =>
    new Date(value).toLocaleDateString(ctx.lang === "en" ? "en-GB" : "it-IT", {
      day: "numeric",
      month: "short",
    });
  // Type (unless it already stands in for a missing title) and date of the last change.
  const meta = (entry) => {
    const parts = [
      entry.data?.title ? ctx.label(ENTRY_KINDS[entry.kind]) : "",
      entry.updatedAt ? date(entry.updatedAt) : "",
    ].filter(Boolean);
    return parts.length ? `<small class="muted">${ctx.esc(parts.join(" · "))}</small>` : "";
  };
  return `<section class="party-recent" data-party-recent><h2>${ctx.t("Ultime voci", "Latest entries")}</h2>${
    rows.length
      ? `<ul class="party-widget-list party-recent-list">${rows
          .map(
            (entry) =>
              `<li><button type="button" class="text-button" data-campaign-open="${ctx.esc(entry.id)}">${ctx.esc(entry.data?.title || ctx.label(ENTRY_KINDS[entry.kind]))}</button>${meta(entry)}</li>`,
          )
          .join("")}</ul>`
      : `<p class="muted">${ctx.t("Nessuna voce da mostrare.", "No entry to show.")}</p>`
  }<div class="campaign-toolbar">${core.world}${core.notes}</div></section>`;
}
function tileHtml(ctx, id, core, target, row = { id }) {
  const type = tileType(id);
  if (TILES[type]?.hideWith && core.hidden.includes(TILES[type].hideWith)) return "";
  if (type === "list") return tileEntryList(ctx, row);
  if (type === "calendar") return tileCalendar(ctx);
  if (type === "preview") return tilePreview(ctx, row);
  switch (id) {
    case "recap":
      return core.recap;
    case "next":
      return core.next;
    case "revealed":
      return core.revealed;
    case "links":
      return core.world || core.notes ? tileLinks(ctx, core) : "";
    case "party":
      return tileParty(ctx);
    case "bases":
      return tileBases(ctx);
    case "vehicle":
      return tileVehicle(ctx);
    case "spells":
      return tileSpells(ctx);
    case "motd":
      return tileMotd(ctx);
    case "note":
      return tileNote(ctx, target);
    default:
      return "";
  }
}
function renderSetup(ctx, core) {
  const slice = sliceOf(ctx.state);
  const target = ui.setup.target;
  const list = slice.dashboards[target];
  const missing = Object.keys(TILES).filter(
    (id) => TILES[id].many || !list.some((row) => row.id === id),
  );
  const entries = readableEntries(ctx).filter((entry) => entry.kind !== "note");
  const name = (id) => {
    const row = list.find((r) => r.id === id);
    const base = ctx.label(TILES[tileType(id)].label);
    if (tileType(id) === "list" && row?.config)
      return ctx.esc(
        `${base} · ${ctx.label(LIST_FILTERS[row.config.filter])}${row.config.tag ? ` «${row.config.tag}»` : ""}`,
      );
    if (tileType(id) === "preview" && row?.config)
      return ctx.esc(
        `${base} · ${entries.find((e) => e.id === row.config.entryId)?.data?.title ?? "—"}`,
      );
    return ctx.esc(base);
  };
  return `${core.heading(`<div class="toolbar"><button type="button" class="button primary" data-party-dash="done">${ctx.t("Fine", "Done")}</button></div>`)}<section class="party-setup" data-party-setup="${target}"><h2>${ctx.t("Personalizza il cruscotto", "Customise the dashboard")}</h2><div class="party-segment" role="group" aria-label="${ctx.t("Cruscotto da modificare", "Dashboard to edit")}">${DASHBOARD_TARGETS.map(
    (t) =>
      `<button type="button" class="button${t === target ? " active" : ""}" data-party-dash-target="${t}" aria-pressed="${t === target}">${t === "dm" ? ctx.t("Cruscotto del DM", "DM dashboard") : ctx.t("Cruscotto dei giocatori", "Players' dashboard")}</button>`,
  ).join(
    "",
  )}</div><p class="muted">${ctx.t("Trascina un riquadro per riordinarlo, oppure usa Su e Giù (da tastiera o sul telefono). I giocatori vedono il loro cruscotto, tu quello del DM; ogni riquadro mostra solo ciò che quel ruolo può leggere.", "Drag a tile to reorder it, or use Up and Down (keyboard or phone). Players see their dashboard, you see the DM's; each tile shows only what that role may read.")}</p>${undoBar(ctx)}<ol class="party-dash-list" data-party-dash-list>${list
    .map(
      (row, i) =>
        `<li class="party-dash-item${row.wide ? " is-wide" : ""}" draggable="true" data-party-dash-item="${row.id}"><span class="party-drag" aria-hidden="true">⋮⋮</span><div class="party-dash-name"><strong>${name(row.id)}</strong><span class="muted">${row.wide ? ctx.t("Larghezza intera", "Full width") : ctx.t("Metà larghezza", "Half width")}</span></div><div class="party-dash-commands"><button type="button" class="button quiet" data-party-dash="up" data-tile="${row.id}"${i === 0 ? ' disabled aria-describedby="party-dash-top-why"' : ""} aria-label="${ctx.t("Sposta su", "Move up")}: ${name(row.id)}">↑ ${ctx.t("Su", "Up")}</button><button type="button" class="button quiet" data-party-dash="down" data-tile="${row.id}"${i === list.length - 1 ? ' disabled aria-describedby="party-dash-bottom-why"' : ""} aria-label="${ctx.t("Sposta giù", "Move down")}: ${name(row.id)}">↓ ${ctx.t("Giù", "Down")}</button><button type="button" class="button quiet" data-party-dash="width" data-tile="${row.id}" aria-label="${row.wide ? ctx.t("Metà larghezza", "Half width") : ctx.t("Larghezza intera", "Full width")}: ${name(row.id)}">${row.wide ? ctx.t("Metà", "Half") : ctx.t("Intera", "Full")}</button><button type="button" class="button quiet" data-party-dash="remove" data-tile="${row.id}" aria-label="${ctx.t("Rimuovi", "Remove")}: ${name(row.id)}">${ctx.t("Rimuovi", "Remove")}</button></div></li>`,
    )
    .join(
      "",
    )}</ol><p class="muted party-dash-why"><span id="party-dash-top-why">${ctx.t("Il primo riquadro non sale oltre: usa «Giù» per spostarlo.", "The first tile cannot go higher: use “Down” to move it.")}</span> <span id="party-dash-bottom-why">${ctx.t("L’ultimo non scende oltre: usa «Su».", "The last one cannot go lower: use “Up”.")}</span></p>${
    missing.length
      ? `<form class="party-inline-form party-add-tile" data-party-form="add-tile"><label class="field">${ctx.t("Aggiungi riquadro", "Add tile")}<select name="tile" data-party-add-type>${missing.map((id) => `<option value="${id}">${ctx.esc(ctx.label(TILES[id].label))}</option>`).join("")}</select></label><label class="field" data-party-add-for="list">${ctx.t("Elenco di", "List of")}<select name="filter">${Object.entries(
          LIST_FILTERS,
        )
          .map(([value, label]) => `<option value="${value}">${ctx.esc(ctx.label(label))}</option>`)
          .join(
            "",
          )}</select></label><label class="field" data-party-add-for="list">${ctx.t("Solo con la parola (facoltativo)", "Only with the word (optional)")}<input name="tag" maxlength="40" autocomplete="off"></label><label class="field" data-party-add-for="preview">${ctx.t("Voce da mostrare", "Entry to show")}<select name="entryId">${entries.map((entry) => `<option value="${ctx.esc(entry.id)}">${ctx.esc(entry.data?.title || entry.kind)}</option>`).join("") || `<option value="">${ctx.t("Nessuna voce", "No entries")}</option>`}</select></label><button class="button" type="submit">${ctx.t("Aggiungi", "Add")}</button></form>`
      : ""
  }<form class="party-inline-form" data-party-form="note"><label class="field">${target === "dm" ? ctx.t("Testo del riquadro «Nota del DM»", "Text of the “DM note” tile") : ctx.t("Testo del riquadro «Avviso della campagna»", "Text of the “Campaign notice” tile")}<textarea name="text" maxlength="600" rows="2">${ctx.esc(slice.notes[target])}</textarea></label><button class="button" type="submit">${ctx.t("Salva testo", "Save text")}</button></form><p><button type="button" class="button quiet" data-party-dash="reset">${ctx.t("Ripristina il cruscotto predefinito", "Restore the default dashboard")}</button></p></section>`;
}
// Kanka's campaign header widget («the campaign's name, short description, and dashboard
// image as a background») with the members as D&D Beyond's campaign page and Roll20's game
// list show them: avatar, name, role. Without an image the header stays a plain card.
const MEMBER_ROLES = {
  owner: L("DM", "DM"),
  "co-dm": L("Co-DM", "Co-DM"),
  player: L("Giocatore", "Player"),
  observer: L("Osservatore", "Observer"),
};
function billboard(ctx) {
  const campaignId = ctx.state.campaign?.id;
  let summary = null;
  try {
    summary = campaignId ? campaignSummary(ctx.state, campaignId, ctx.role) : null;
  } catch {
    summary = null;
  }
  const name = summary?.name ?? ctx.label(ctx.state.campaign?.name ?? "");
  const image =
    typeof summary?.image === "string" &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(summary.image)
      ? summary.image
      : null;
  const members = campaignId ? getCampaignMembers(ctx.state, campaignId, ctx.role) : [];
  const people = members
    .map((member) => {
      const person = personName(ctx.state, member.id, ctx.lang);
      const role = ctx.label(
        MEMBER_ROLES[memberRole(ctx.state, campaignId, member.id) ?? member.role] ??
          MEMBER_ROLES.player,
      );
      // The sample identities are named after their role («DM», «Giocatore»): once is enough.
      const same = role.toLocaleLowerCase() === String(person).toLocaleLowerCase();
      return `<li class="party-member"><span class="party-member-avatar" aria-hidden="true">${avatarHTML(publishedAvatar(ctx.state, member.id), person, { esc: ctx.esc })}</span><span class="party-member-text"><strong>${ctx.esc(person)}</strong>${same ? "" : `<small>${ctx.esc(role)}</small>`}</span></li>`;
    })
    .join("");
  const tags = (summary?.tags ?? []).filter((tag) => typeof tag === "string" && tag);
  return `<section class="party-billboard${image ? " has-art" : ""}" data-party-billboard${image ? ` style="--party-art:url('${image}')"` : ""} aria-labelledby="party-billboard-title"><div class="party-billboard-text"><h2 id="party-billboard-title">${ctx.esc(name)}</h2>${summary?.description ? `<p class="party-billboard-desc">${ctx.esc(summary.description)}</p>` : ""}${tags.length ? `<ul class="party-billboard-tags" aria-label="${ctx.t("Etichette", "Tags")}">${tags.map((tag) => `<li class="badge">${ctx.esc(tag)}</li>`).join("")}</ul>` : ""}</div>${people ? `<ul class="party-members" aria-label="${ctx.t("Membri della campagna", "Campaign members")}">${people}</ul>` : ""}</section>`;
}
/** Kanka «Dashboard setup»: the DM customises a dashboard (the Personalizza button). */
export function openDashboardSetup(ctx, target = "dm") {
  ui.setup = { target: DASHBOARD_TARGETS.includes(target) ? target : "dm" };
  ctx.render();
}
export function renderDashboard(ctx) {
  const core = campaignOverviewBlocks(ctx);
  const slice = sliceOf(ctx.state);
  const dm = isDm(ctx.state, ctx.role);
  if (!slice)
    return core.heading(core.enterTable) + core.recap + core.next + core.group + core.revealed;
  if (ui.setup && dm) return `<div class="party-dashboard">${renderSetup(ctx, core)}</div>`;
  const target = dashboardTarget(ctx.state, ctx.role);
  const tiles = slice.dashboards[target]
    .map((row) => ({ row, html: tileHtml(ctx, row.id, core, target, row) }))
    .filter((tile) => tile.html);
  // P10 CA-49 (Roll20 "Invite players", Owlbear "Share"): in the campaign's header.
  return `<div class="party-dashboard">${core.heading(
    // Final review F20 (Kanka): «Entra al Tavolo» stays in the campaign sidebar only.
    `<div class="toolbar">${dm ? `<button type="button" class="button" data-party-dash="setup">${ctx.t("Personalizza", "Customise")}</button>` : ""}${inviteButton(ctx)}</div>`,
    { subtitle: false },
  )}${billboard(ctx)}${undoBar(ctx)}<div class="party-dash-grid" data-party-dashboard="${target}">${tiles
    .map(
      ({ row, html }) =>
        `<div class="party-tile${row.wide ? " is-wide" : ""}" data-party-tile="${row.id}">${html}</div>`,
    )
    .join("")}</div></div>`;
}

// ---------------------------------------------------------------- Table panel (DM)

export function renderTablePanel(ctx) {
  const state = ctx.state,
    slice = sliceOf(state);
  const members = partyMembers(state, ctx.role).filter(
    (a) => !slice.overview.hidden.includes(a.id),
  );
  if (!members.length)
    return `<p class="muted">${ctx.t("Nessun personaggio nel riepilogo.", "No characters in the overview.")}</p>`;
  return `<div class="party-panel">${members
    .map((actor) => {
      const row = partyRow(state, actor);
      // PG-33 (P2 shared edit): the DM sees who holds Heroic Inspiration (dice tray state).
      const inspired = hasInspiration(state.ext?.["dice-tray"], actor.id)
        ? `<span class="badge party-inspiration" title="${ctx.t("Ha l’Ispirazione eroica", "Has Heroic Inspiration")}">★ ${ctx.t("Ispirazione", "Inspiration")}</span>`
        : "";
      return `<article class="party-panel-row" data-party-mini="${ctx.esc(actor.id)}"><div class="party-mini-head"><button type="button" class="text-button" data-party-select="${ctx.esc(actor.id)}" aria-label="${ctx.t("Seleziona sulla mappa", "Select on the map")}: ${ctx.esc(actor.name)}">${ctx.esc(actor.name)}</button><span class="muted">${className(ctx, actor)}</span>${inspired}</div>${hpCell(ctx, row)}<dl class="party-panel-stats"><div><dt>${ctx.t("CA", "AC")}</dt><dd>${row.ac ?? "—"}</dd></div>${PASSIVES.map((p) => `<div><dt title="${ctx.esc(ctx.label(p.label))}">${ctx.esc(ctx.label(p.short))}</dt><dd>${row.passives[p.id].value ?? "—"}</dd></div>`).join("")}</dl><details><summary>${ctx.t("Tiri salvezza e lingue", "Saves and languages")}</summary>${savesCell(ctx, row)}<p>${languagesCell(ctx, row)}</p></details><button type="button" class="button quiet" data-party-sheet="${ctx.esc(actor.id)}" data-tab="actions">${ctx.t("Scheda", "Sheet")}</button></article>`;
    })
    .join(
      "",
    )}<p class="muted">${ctx.t("PP = Percezione passiva; Intuiz. = Intuizione passiva; Indag. = Indagare passiva.", "PP = passive Perception; Ins. = passive Insight; Inv. = passive Investigation.")}</p></div>`;
}

// ---------------------------------------------------------------- binding

function onClick(el, selector, handler) {
  el.querySelectorAll(selector).forEach((node) => {
    node.addEventListener("click", (event) => handler(node, event));
  });
}
function bindCommon(el, ctx) {
  onClick(el, "[data-party-undo]", () => ctx.undo());
  onClick(el, "[data-party-sheet]", (node) =>
    ctx.openSheet
      ? ctx.openSheet(node.dataset.partySheet, node.dataset.tab || "actions")
      : ctx.navigate("characters", {
          id: node.dataset.partySheet,
          tab: node.dataset.tab || "actions",
        }),
  );
  onClick(el, "[data-party-route]", (node) =>
    ctx.navigate("campaign", { tab: "group", id: node.dataset.partyRoute }),
  );
}
function bindParty(el, ctx) {
  bindCommon(el, ctx);
  onClick(el, "[data-party-add-character]", () => openAddCharacter(ctx));
  onClick(el, "[data-party-award]", () => openPartyAward(ctx));
  onClick(el, "[data-party-tab]", (node) =>
    ctx.navigate("campaign", { tab: "group", id: node.dataset.partyTab }),
  );
  onClick(el, "[data-party-hide]", (node) => {
    const actor = ctx.state.actors[node.dataset.partyHide];
    commitParty(
      ctx,
      ctx.t(`${actor?.name} nascosto dal riepilogo`, `${actor?.name} hidden from the overview`),
      (draft, s) =>
        setHidden(draft, s, ctx.role, { actorId: node.dataset.partyHide, hidden: true }),
    );
  });
  onClick(el, "[data-party-show]", (node) => {
    const actor = ctx.state.actors[node.dataset.partyShow];
    commitParty(
      ctx,
      ctx.t(`${actor?.name} di nuovo nel riepilogo`, `${actor?.name} back in the overview`),
      (draft, s) =>
        setHidden(draft, s, ctx.role, { actorId: node.dataset.partyShow, hidden: false }),
    );
  });
  el.querySelectorAll("[data-party-share]").forEach((box) =>
    box.addEventListener("change", () => {
      const done = commitParty(
        ctx,
        box.checked
          ? ctx.t("Riepilogo del gruppo mostrato ai giocatori", "Party overview shown to players")
          : ctx.t("Riepilogo del gruppo riservato al DM", "Party overview kept for the DM"),
        (draft, s) => setShare(draft, s, ctx.role, box.checked),
      );
      // A refused change (offline) leaves the box as it was saved.
      if (!done) box.checked = !box.checked;
    }),
  );
  el.querySelectorAll("[data-party-spell-filter]").forEach((box) =>
    box.addEventListener("change", () => {
      ui.spells[box.dataset.partySpellFilter] = box.checked;
      ctx.render();
    }),
  );
  bindVehicles(el, ctx);
  B.bindBases(el, ctx, api);
}
function bindVehicles(el, ctx) {
  onClick(el, "[data-party-vehicle]", (node) => {
    const vehicleId = node.dataset.vehicle;
    const action = node.dataset.partyVehicle;
    const slice = sliceOf(ctx.state);
    const vehicle = slice.vehicles.find((v) => v.id === vehicleId);
    const vname = vehicle ? ctx.label(vehicle.name) : "";
    if (action === "leave") {
      const actor = ctx.state.actors[node.dataset.actor];
      commitParty(
        ctx,
        ctx.t(`${actor?.name} scende da ${vname}`, `${actor?.name} gets off ${vname}`),
        (draft, s) =>
          setAboard(draft, s, ctx.role, { vehicleId, actorId: node.dataset.actor, role: null }),
      );
    }
    if (action === "primary")
      commitParty(
        ctx,
        ctx.t(`${vname}: veicolo principale`, `${vname}: primary vehicle`),
        (draft, s) => setPrimary(draft, s, ctx.role, vehicleId),
      );
    if (action === "remove-goods") {
      const row = vehicle?.cargo.find((c) => c.id === node.dataset.cargo);
      ctx.dialog(
        ctx.t("Togli merce dal veicolo", "Remove goods from the vehicle"),
        `<p>${ctx.esc(row ? ctx.label(row.name) : "")} ×${row?.quantity ?? 0}</p><label class="field">${ctx.t("Motivo (venduta, consumata, persa…)", "Reason (sold, used, lost…)")}<input name="reason" maxlength="200" required></label>`,
        {
          submitLabel: ctx.t("Togli", "Remove"),
          onSubmit: (data) =>
            commitParty(
              ctx,
              ctx.t(
                `Merce tolta da ${vname}: ${row ? ctx.label(row.name) : ""} (${data.get("reason")})`,
                `Goods removed from ${vname}: ${row ? ctx.label(row.name) : ""} (${data.get("reason")})`,
              ),
              (draft, s) =>
                removeGoods(draft, s, ctx.role, {
                  vehicleId,
                  cargoId: node.dataset.cargo,
                  reason: data.get("reason"),
                }),
              { throwInDialog: true },
            ),
        },
      );
    }
    if (action === "edit" || action === "new")
      ctx.dialog(
        action === "new"
          ? ctx.t("Nuovo veicolo", "New vehicle")
          : ctx.t("Modifica veicolo", "Edit vehicle"),
        vehicleDialogBody(ctx, action === "new" ? null : vehicle),
        {
          submitLabel: ctx.t("Salva veicolo", "Save vehicle"),
          onSubmit: (data) =>
            commitParty(
              ctx,
              action === "new"
                ? ctx.t(`Nuovo veicolo: ${data.get("name")}`, `New vehicle: ${data.get("name")}`)
                : ctx.t(
                    `Veicolo modificato: ${data.get("name")}`,
                    `Vehicle edited: ${data.get("name")}`,
                  ),
              (draft, s) =>
                saveVehicle(draft, s, ctx.role, {
                  vehicleId: action === "new" ? null : vehicleId,
                  name: data.get("name"),
                  vehicleWeightKg: toKg(ctx, data.get("vehicleWeight")),
                  seats: Number(data.get("seats")),
                  animals: Number(data.get("animals")),
                  animalKind: data.get("animalKind"),
                  animalCapacityKg: toKg(ctx, data.get("animalCapacity")),
                  animalSpeedM: toMetres(ctx, data.get("animalSpeedM")),
                  speedM:
                    String(data.get("speedM") ?? "").trim() === ""
                      ? ""
                      : toMetres(ctx, data.get("speedM")),
                }),
              { throwInDialog: true },
            ),
        },
      );
  });
  el.querySelectorAll("form[data-party-form]").forEach((form) =>
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const vehicleId = form.dataset.vehicle;
      const vehicle = sliceOf(ctx.state).vehicles.find((v) => v.id === vehicleId);
      const vname = vehicle ? ctx.label(vehicle.name) : "";
      const kind = form.dataset.partyForm;
      if (kind === "board") {
        const actor = ctx.state.actors[data.get("actorId")];
        commitParty(
          ctx,
          ctx.t(`${actor?.name} sale su ${vname}`, `${actor?.name} boards ${vname}`),
          (draft, s) =>
            setAboard(draft, s, ctx.role, {
              vehicleId,
              actorId: data.get("actorId"),
              role: data.get("role"),
            }),
        );
      }
      if (kind === "load") {
        const [actorId, itemId] = String(data.get("source")).split("|");
        const actor = ctx.state.actors[actorId];
        const item = actor?.inventory?.find((i) => i.id === itemId);
        commitParty(
          ctx,
          ctx.t(
            `Caricato su ${vname}: ${item ? ctx.label(item.name) : ""} da ${actor?.name}`,
            `Loaded on ${vname}: ${item ? ctx.label(item.name) : ""} from ${actor?.name}`,
          ),
          (draft, s) =>
            loadFromInventory(draft, s, ctx.role, {
              vehicleId,
              actorId,
              itemId,
              quantity: Number(data.get("quantity")),
            }),
        );
      }
      if (kind === "unload") {
        const row = vehicle?.cargo.find((c) => c.id === form.dataset.cargo);
        const actor = ctx.state.actors[data.get("actorId")];
        commitParty(
          ctx,
          ctx.t(
            `Scaricato da ${vname}: ${row ? ctx.label(row.name) : ""} a ${actor?.name}`,
            `Unloaded from ${vname}: ${row ? ctx.label(row.name) : ""} to ${actor?.name}`,
          ),
          (draft, s) =>
            unloadToInventory(draft, s, ctx.role, {
              vehicleId,
              cargoId: form.dataset.cargo,
              actorId: data.get("actorId"),
              quantity: Number(data.get("quantity")),
            }),
        );
      }
      if (kind === "goods")
        commitParty(
          ctx,
          ctx.t(
            `Merce aggiunta a ${vname}: ${data.get("name")}`,
            `Goods added to ${vname}: ${data.get("name")}`,
          ),
          (draft, s) =>
            addGoods(draft, s, ctx.role, {
              vehicleId,
              name: data.get("name"),
              quantity: Number(data.get("quantity")),
              weightKg: toKg(ctx, data.get("weight")),
            }),
        );
    }),
  );
}
function bindDashboard(el, ctx) {
  bindCommon(el, ctx);
  B.bindBases(el, ctx, api);
  const target = () => ui.setup?.target ?? "dm";
  const tileName = (id) => ctx.label(TILES[tileType(id)]?.label ?? id);
  // Only the add form's fields for the chosen widget type are shown (Kanka widget form).
  const addType = el.querySelector("[data-party-add-type]");
  const syncAdd = () =>
    el.querySelectorAll("[data-party-add-for]").forEach((field) => {
      field.hidden = field.dataset.partyAddFor !== addType?.value;
    });
  if (addType) {
    addType.addEventListener("change", syncAdd);
    syncAdd();
  }
  el.querySelectorAll("[data-campaign-invite]").forEach(
    (button) => (button.onclick = () => openInvite(ctx)),
  );
  const dashLabel = () =>
    target() === "dm"
      ? ctx.t("Cruscotto del DM", "DM dashboard")
      : ctx.t("Cruscotto dei giocatori", "Players' dashboard");
  const indexOf = (id) => sliceOf(ctx.state).dashboards[target()].findIndex((r) => r.id === id);
  onClick(el, "[data-party-dash]", (node) => {
    const action = node.dataset.partyDash;
    const id = node.dataset.tile;
    if (action === "setup") {
      ui.setup = { target: "dm" };
      return ctx.render();
    }
    if (action === "done") {
      ui.setup = null;
      return ctx.render();
    }
    if (action === "up" || action === "down")
      return commitParty(
        ctx,
        ctx.t(
          `${dashLabel()}: «${tileName(id)}» spostato ${action === "up" ? "su" : "giù"}`,
          `${dashLabel()}: “${tileName(id)}” moved ${action}`,
        ),
        (draft, s) =>
          moveTile(draft, s, ctx.role, {
            target: target(),
            id,
            to: indexOf(id) + (action === "up" ? -1 : 1),
          }),
      );
    if (action === "width") {
      const row = sliceOf(ctx.state).dashboards[target()].find((r) => r.id === id);
      return commitParty(
        ctx,
        ctx.t(
          `${dashLabel()}: «${tileName(id)}» ${row?.wide ? "a metà larghezza" : "a larghezza intera"}`,
          `${dashLabel()}: “${tileName(id)}” ${row?.wide ? "half width" : "full width"}`,
        ),
        (draft, s) => setTileWidth(draft, s, ctx.role, { target: target(), id, wide: !row?.wide }),
      );
    }
    if (action === "remove")
      return commitParty(
        ctx,
        ctx.t(
          `${dashLabel()}: «${tileName(id)}» rimosso`,
          `${dashLabel()}: “${tileName(id)}” removed`,
        ),
        (draft, s) => removeTile(draft, s, ctx.role, { target: target(), id }),
      );
    if (action === "reset")
      return commitParty(
        ctx,
        ctx.t(`${dashLabel()}: ripristinato`, `${dashLabel()}: restored`),
        (draft, s) => resetDashboard(draft, s, ctx.role, { target: target() }),
      );
  });
  onClick(el, "[data-party-dash-target]", (node) => {
    ui.setup = { target: node.dataset.partyDashTarget };
    ctx.render();
  });
  el.querySelectorAll("form[data-party-form]").forEach((form) =>
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      if (form.dataset.partyForm === "add-tile") {
        const id = String(data.get("tile"));
        const config =
          id === "list"
            ? {
                filter: String(data.get("filter") ?? "world"),
                tag: String(data.get("tag") ?? "").trim(),
              }
            : id === "preview"
              ? { entryId: String(data.get("entryId") ?? "") }
              : null;
        commitParty(
          ctx,
          ctx.t(
            `${dashLabel()}: «${tileName(id)}» aggiunto`,
            `${dashLabel()}: “${tileName(id)}” added`,
          ),
          (draft, s) => addTile(draft, s, ctx.role, { target: target(), id, config }),
        );
      }
      if (form.dataset.partyForm === "note")
        commitParty(
          ctx,
          ctx.t(`${dashLabel()}: testo salvato`, `${dashLabel()}: text saved`),
          (draft, s) => setNote(draft, s, ctx.role, { target: target(), text: data.get("text") }),
        );
    }),
  );
  onClick(el, "[data-party-motd]", () => openMotdEditor(ctx));
  // Kanka: drag a widget to reorder it (HTML drag and drop; Up/Down stay for keyboard/touch).
  const list = el.querySelector("[data-party-dash-list]");
  if (!list) return;
  const clear = () =>
    list
      .querySelectorAll(".is-drop-before,.is-drop-after,.is-dragging")
      .forEach((n) => n.classList.remove("is-drop-before", "is-drop-after", "is-dragging"));
  list.addEventListener("dragstart", (event) => {
    const item = event.target.closest?.("[data-party-dash-item]");
    if (!item) return;
    dragId = item.dataset.partyDashItem;
    item.classList.add("is-dragging");
    try {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragId);
    } catch {
      /* some browsers refuse data on synthetic drags */
    }
  });
  list.addEventListener("dragover", (event) => {
    const over = event.target.closest?.("[data-party-dash-item]");
    if (!dragId || !over) return;
    event.preventDefault();
    list
      .querySelectorAll(".is-drop-before,.is-drop-after")
      .forEach((n) => n.classList.remove("is-drop-before", "is-drop-after"));
    const from = indexOf(dragId),
      to = indexOf(over.dataset.partyDashItem);
    if (from !== to) over.classList.add(from < to ? "is-drop-after" : "is-drop-before");
  });
  list.addEventListener("dragend", () => {
    dragId = null;
    clear();
  });
  list.addEventListener("drop", (event) => {
    const over = event.target.closest?.("[data-party-dash-item]");
    const id = dragId;
    dragId = null;
    clear();
    if (!id || !over) return;
    event.preventDefault();
    const to = indexOf(over.dataset.partyDashItem);
    if (to < 0 || to === indexOf(id)) return;
    commitParty(
      ctx,
      ctx.t(
        `${dashLabel()}: «${tileName(id)}» spostato`,
        `${dashLabel()}: “${tileName(id)}” moved`,
      ),
      (draft, s) => moveTile(draft, s, ctx.role, { target: target(), id, to }),
    );
  });
}
function openMotdEditor(ctx) {
  const m = sliceOf(ctx.state).motd;
  ctx.dialog(
    ctx.t("Messaggio d’inizio sessione", "Session-start message"),
    `<label class="field">${ctx.t("Messaggio per i giocatori", "Message for the players")}<textarea name="text" maxlength="600" rows="4">${ctx.esc(m.text)}</textarea></label><label class="check-field"><input type="checkbox" name="enabled"${m.enabled ? " checked" : ""}> ${ctx.t("Mostralo ai giocatori quando entrano al Tavolo", "Show it to players when they enter the Table")}</label><p class="muted">${ctx.t("Ogni giocatore lo vede una volta per versione; resta nella sua Panoramica finché è attivo. Salvare crea una nuova versione.", "Each player sees it once per version; it stays in their Overview while on. Saving creates a new version.")}</p>`,
    {
      submitLabel: ctx.t("Salva messaggio", "Save message"),
      onSubmit: (data) =>
        commitParty(
          ctx,
          ctx.t("Messaggio d’inizio sessione aggiornato", "Session-start message updated"),
          (draft, s) =>
            setMotd(draft, s, ctx.role, { enabled: data.has("enabled"), text: data.get("text") }),
          { throwInDialog: true },
        ),
    },
  );
}
function showMotdIfDue(ctx) {
  const slice = sliceOf(ctx.state);
  if (!slice || ctx.view?.page !== "table") return;
  const key = seenKey(ctx.state, ctx.role);
  if (!motdDue(ctx.state, slice, ctx.role, readSeen()[key])) return;
  if (globalThis.document?.querySelector("#dialog")?.open) return;
  markSeen(key, slice.motd.revision);
  ctx.dialog(
    ctx.t("Messaggio del DM", "Message from the DM"),
    `<div class="party-motd-dialog" data-party-motd-dialog><p class="party-motd-text">${ctx.esc(slice.motd.text)}</p><p class="muted">${ctx.t("Lo ritrovi nella Panoramica della campagna.", "You can find it again in the campaign Overview.")}</p></div>`,
    { cancelLabel: ctx.t("Ho letto", "Got it") },
  );
}
export { showMotdIfDue };
function scheduleMotd(ctx) {
  if (typeof globalThis.document === "undefined" || typeof setTimeout !== "function") return;
  setTimeout(() => showMotdIfDue(ctx), 0);
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  registry.registerStateSlice(ID, {
    version: VERSION,
    seed: seedParty,
    normalize: normalizeParty,
  });
  registry.registerStyles(new URL("./party.css", import.meta.url));
  // Kanka (CMP-21/22): the campaign's landing page is a dashboard of tiles, one per role.
  registry.add("campaign-section", {
    id: "overview",
    replaces: true,
    label: L("Panoramica", "Overview"),
    render: renderDashboard,
    bind: bindDashboard,
  });
  // FG Party Sheet / Foundry group actor: the campaign's "Party" becomes the party sheet.
  registry.add("campaign-section", {
    id: "group",
    replaces: true,
    label: L("Gruppo", "Party"),
    render: renderPartySection,
    bind: bindParty,
  });
  // dnd5e (FVT-037): characters from the DM's level get a Bastion tab.
  registry.add("sheet-tab", {
    id: "party-bastion",
    category: "extras",
    label: L("Bastione", "Bastion"),
    order: 70,
    when: (ctx, actor) => {
      const slice = sliceOf(ctx.state)?.bastions;
      return (
        Boolean(slice) &&
        actor?.kind === "character" &&
        !actor.companion &&
        (actor.level >= slice.rules.minLevel || Boolean(B.bastionOf(slice, actor.id)))
      );
    },
    render: (ctx, actor) => {
      const slice = sliceOf(ctx.state);
      return `<div class="party-page">${undoBar(ctx)}${B.renderBastionSheet(ctx, ctx.state, slice.bastions, ctx.state.actors[actor.id] ?? actor)}</div>`;
    },
    bind: (el, ctx) => {
      bindCommon(el, ctx);
      B.bindBases(el, ctx, api);
    },
  });
  // Party Overview at the Table (FVT-071): the DM's side tab, next to the DM screen.
  registry.add("table-panel", {
    id: "party",
    section: "creature",
    label: L("Riepilogo del gruppo", "Party overview"),
    placement: "sidebar-tab",
    icon: "person",
    order: 62,
    roles: ["dm"],
    when: (ctx) =>
      Boolean(sliceOf(ctx.state)) && isCampaignMember(ctx.state, ctx.state.campaign?.id, ctx.role),
    render: (ctx) => renderTablePanel(ctx),
    bind: (el, ctx, table) => {
      bindCommon(el, ctx);
      onClick(el, "[data-party-select]", (node) => {
        const id = node.dataset.partySelect;
        const onMap = table?.scene?.tokens?.some((token) => token.actorId === id);
        if (onMap) table.select(id);
        else
          ctx.toast(
            ctx.t(
              "Questo personaggio non ha una pedina nella scena.",
              "This character has no token in the scene.",
            ),
            true,
          );
      });
    },
  });
  // A Party section the DM turned off (B20, Kanka CMP-24) leaves the palette too.
  const groupOn = (ctx) =>
    !(
      ctx.state.ext?.["campaign-settings"]?.campaigns?.[ctx.state.campaign?.id]?.policy
        ?.hiddenSections ?? []
    ).includes("group");
  registry.add("command", {
    id: "party.overview",
    label: L("Apri il riepilogo del gruppo", "Open the party overview"),
    when: groupOn,
    run: (ctx) => ctx.navigate("campaign", { tab: "group", id: "overview" }),
  });
  registry.add("command", {
    id: "party.bases-turn",
    label: L("Avanza il turno delle basi", "Advance the bases turn"),
    roles: ["dm"],
    when: groupOn,
    run: (ctx) => {
      ctx.navigate("campaign", { tab: "group", id: "bases" });
      B.openAdvance(ctx, api);
    },
  });
  // Rule 8 of the Table structure: a pending action also reaches the bell (B24).
  registry.add("notifications", {
    id: "party-bases",
    label: L("Basi del gruppo", "Party bases"),
    collect: (ctx) => {
      const slice = sliceOf(ctx.state)?.bastions;
      if (!slice) return [];
      const out = [];
      const bases = B.visibleBases(ctx.state, slice, ctx.role);
      if (isDm(ctx.state, ctx.role)) {
        const pending = bases
          .filter((base) => B.inPlay(ctx.state, base))
          .reduce((n, base) => n + base.orders.filter((o) => o.status === "pending").length, 0);
        if (pending)
          out.push({
            id: `party-bases-pending-${slice.turn}-${pending}`,
            title: L(
              `Ordini delle basi in attesa del turno: ${pending}`,
              `Base orders waiting for the turn: ${pending}`,
            ),
            body: L(`Turno delle basi ${slice.turn}`, `Bases turn ${slice.turn}`),
            target: { page: "campaign", params: { tab: "group", id: "bases" } },
          });
      }
      for (const base of bases) {
        if (!B.canOrderBase(ctx.state, base, ctx.role) || isDm(ctx.state, ctx.role)) continue;
        for (const entry of base.log.filter((e) => e.kind === "outcome" && e.turn === slice.turn))
          out.push({
            id: `party-bases-outcome-${entry.id}`,
            title: L(
              `Esito del turno ${entry.turn}: ${nameOf(entry.order, "it")}`,
              `Turn ${entry.turn} outcome: ${nameOf(entry.order, "en")}`,
            ),
            body: L(nameOf(base.name, "it"), nameOf(base.name, "en")),
            target:
              base.owner.kind === "character"
                ? { page: "characters", params: { id: base.owner.actorId, tab: "party-bastion" } }
                : { page: "campaign", params: { tab: "group", id: "bases" } },
          });
      }
      return out;
    },
  });
  // FG Message of the Day (R20-082): shown to a player entering the Table.
  registry.on("navigate", (payload, { ctx }) => {
    if (payload?.page === "table" && payload.from !== "table") scheduleMotd(ctx);
  });
  registry.on("role-changed", (payload, { ctx }) => {
    resetPartyView();
    if (ctx?.view?.page === "table") scheduleMotd(ctx);
  });
  registry.on("reset", () => {
    resetPartyView();
    forgetMotdSeen();
  });
}
