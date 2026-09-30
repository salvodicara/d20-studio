// BI-45 — the read side of the compatibility packs (Shard's and Foundry's compendium packs:
// what a campaign enables reaches the bestiary, the character builder and the search).
// B49 (adventures.mjs) owns import, validation, enablement and the pack pages; this core
// helper only reads its slice, so the Table, the Library and the builder use an enabled
// pack without importing that area. Mechanics only: names, numbers and the book page.
// Delegated simulation (I-233): the owner's content and licensing decision stays open.

export const PACKS_SLICE = "adventures-packs";
const arr = (value) => (Array.isArray(value) ? value : []);
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const L = (it, en) => ({ it, en });
const copy = (value) => structuredClone(value);

const slice = (state) => (isObject(state?.ext?.[PACKS_SLICE]) ? state.ext[PACKS_SLICE] : {});
const rows = (state) =>
  arr(slice(state).packs).filter((row) => isObject(row) && isObject(row.pack));
/** Packs the DM enabled in `campaignId` (the campaign in play by default). */
export function enabledPacks(state, campaignId = state?.campaign?.id) {
  const on = arr(slice(state).enabled?.[campaignId]);
  return on
    .map((id) => rows(state).find((row) => row.owner === "dm" && row.pack.id === id)?.pack)
    .filter(Boolean);
}
/** Packs `role` may read: its own installs and those enabled in the campaign in play. */
export function readablePacks(state, role) {
  const out = new Map();
  for (const row of rows(state)) if (row.owner === role) out.set(row.pack.id, row.pack);
  for (const pack of enabledPacks(state)) if (!out.has(pack.id)) out.set(pack.id, pack);
  return [...out.values()];
}
export const packEntryId = (pack, entry) => `pack:${pack.id}:${entry.type}:${entry.id}`;

const CREATURE_TYPES = Object.freeze({
  aberration: L("Aberrazione", "Aberration"),
  beast: L("Bestia", "Beast"),
  celestial: L("Celestiale", "Celestial"),
  construct: L("Costrutto", "Construct"),
  dragon: L("Drago", "Dragon"),
  elemental: L("Elementale", "Elemental"),
  fey: L("Folletto", "Fey"),
  fiend: L("Immondo", "Fiend"),
  giant: L("Gigante", "Giant"),
  humanoid: L("Umanoide", "Humanoid"),
  monstrosity: L("Mostruosità", "Monstrosity"),
  ooze: L("Melma", "Ooze"),
  plant: L("Vegetale", "Plant"),
  undead: L("Non morto", "Undead"),
});
/** Where an entry comes from: the pack, its version and the page of the group's book. */
export const packSource = (pack, entry) => ({
  kind: "compat-pack",
  packId: pack.id,
  edition: pack.book?.edition === "2014" ? "2014" : "2024",
  revision: String(pack.version ?? "1"),
  label: pack.book?.title ?? "",
  title: `${pack.title?.en ?? pack.id} · ${entry.name?.en ?? entry.id}`,
  pages: [entry.page],
  simulation: pack.simulation === true,
});

/** An enabled pack creature shaped like a bestiary entry (search and «Aggiungi»). */
function creatureEntry(pack, entry) {
  const m = entry.mechanics ?? {};
  return {
    id: packEntryId(pack, entry),
    kind: "creature",
    pack: { id: pack.id, title: copy(pack.title), book: pack.book?.title ?? "", page: entry.page },
    name: copy(entry.name),
    cr: m.cr ?? null,
    xp: Number.isInteger(m.xp) ? m.xp : null,
    type:
      CREATURE_TYPES[m.creatureType] ??
      L(String(m.creatureType ?? ""), String(m.creatureType ?? "")),
    mechanics: copy(m),
    source: packSource(pack, entry),
  };
}
/** Creatures of the packs enabled in the campaign in play (the Table's bestiary). */
export function packCreatures(state) {
  return enabledPacks(state).flatMap((pack) =>
    arr(pack.entries)
      .filter((entry) => entry.type === "creature")
      .map((entry) => creatureEntry(pack, entry)),
  );
}
export const packCreature = (state, id) =>
  packCreatures(state).find((entry) => entry.id === id) ?? null;

const DICE = /^(\d{1,2})d(4|6|8|10|12|20)([+-]\d{1,3})?$/;
/**
 * The NPC a pack creature becomes on a scene: preparation's createSceneNPC input plus the
 * numbers it does not take, and its first attack as the melee profile the Table uses.
 * Speeds are in metres in the pack; a creature that only flies keeps its flying speed.
 */
export function packCreatureNpc(entry, { id, name, team = "neutral" }) {
  const m = entry.mechanics ?? {};
  const speeds = Object.fromEntries(
    Object.entries(isObject(m.speed) ? m.speed : {}).filter(
      ([, value]) => Number.isFinite(value) && value >= 0,
    ),
  );
  const speed = speeds.walk || Math.max(0, ...Object.values(speeds));
  const attack = arr(m.attacks).find((a) => DICE.test(String(a?.damage ?? "")));
  const dice = attack && DICE.exec(String(attack.damage));
  const melee = attack
    ? {
        name: copy(attack.name),
        reachMeters: Number.isFinite(attack.reach) && attack.reach > 0 ? attack.reach : 1.5,
        attackBonus: attack.toHit,
        damageDice: [{ count: Number(dice[1]), sides: Number(dice[2]) }],
        damageModifier: Number(dice[3] ?? 0),
        damageType: String(attack.damageType ?? "bludgeoning"),
        source: entry.source,
      }
    : null;
  return {
    input: { id, name: (name ?? entry.name.it).trim(), hp: m.hp, ac: m.ac, speed, team },
    patch: {
      abilities: { ...m.abilities },
      ...(Object.keys(speeds).length ? { speeds } : {}),
      className: copy(entry.type),
      provenance: { ...copy(entry.source), entryId: entry.id },
      packRef: { id: entry.id, packId: entry.pack.id, page: entry.pack.page },
    },
    melee,
  };
}

/** Subclasses of the enabled packs, as the builder lists them beside the SRD ones. */
export function packSubclasses(state) {
  return enabledPacks(state).flatMap((pack) =>
    arr(pack.entries)
      .filter((entry) => entry.type === "subclass" && entry.mechanics?.classId)
      .map((entry) => ({
        id: `pack-subclass:${pack.id}:${entry.id}`,
        pack: true,
        classId: entry.mechanics.classId,
        name: copy(entry.name),
        levels: arr(entry.mechanics.levels).filter(Number.isInteger),
        source: packSource(pack, entry),
      })),
  );
}

const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
/** Entries of the packs `role` reads whose name matches `query` (Library search, palette). */
export function searchPackEntries(state, role, query, type = "") {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length || fold(query).trim().length < 2) return [];
  return readablePacks(state, role).flatMap((pack) =>
    arr(pack.entries)
      .filter((entry) => !type || entry.type === type)
      .filter((entry) => {
        const hay = fold(`${entry.name?.it ?? ""} ${entry.name?.en ?? ""}`);
        return words.every((word) => hay.includes(word));
      })
      .map((entry) => ({
        id: packEntryId(pack, entry),
        type: entry.type,
        name: copy(entry.name),
        page: entry.page,
        packId: pack.id,
        packTitle: copy(pack.title),
        book: pack.book?.title ?? "",
        simulation: pack.simulation === true,
      })),
  );
}
