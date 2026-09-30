// B39 — Creation: quick paths, ready-made characters and checks (pure domain).
//
// Everything here drives the EXISTING builder (character-build.mjs): the quick path and the
// ready-made characters fill a normal private draft and apply it with applyCharacterDraft;
// level down and the full rebuild are "revise" drafts. Nothing here is a second character
// engine. Market patterns (census IDs): D&D Beyond Quickbuilder, Premade + Claim, name
// suggestions, prerequisites with bypass, duplicate proficiency release, starting equipment
// chooser, source categories (DDB-009/010/015/016/017/019/021), dnd5e Level Down (FVT-012),
// BG3 respec (CRP-014), Quest Portal co-building (VTL-022). Rules: SRD 5.2.1 (EN/IT).

import {
  ABILITY_IDS,
  STANDARD_ARRAY,
  SPELL_PROGRESSION,
  classes,
  backgrounds,
  species,
  skills,
  languages,
  feats,
  spells,
  equipmentOptions,
  requiredFeatureGrants,
  calculateSpellSlots,
} from "./character-rules.mjs";
import {
  createCharacterDraft,
  saveCharacterDraft,
  previewCharacterDraft,
  applyCharacterDraft,
  discardCharacterDraft,
} from "./character-build.mjs";
import { getById, poundsToKg, srdSource } from "./srd-sample.mjs";
import { canControlActor, isCampaignActor } from "./character-access.mjs";

export const ID = "builder-plus";
export const COBUILD_ID = "builder-plus-cobuild";
export const VERSION = 1;
const copy = (value) => (value === undefined ? undefined : structuredClone(value));
const L = (it, en) => ({ it, en });
const iso = (now = Date.now()) => new Date(now).toISOString();
const mod = (score) => Math.floor((score - 10) / 2);
const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
export function refuse(it, en, code = "refused") {
  return Object.assign(new Error(en), { it, en, code });
}
function hash(value) {
  const s = JSON.stringify(value) ?? "undefined";
  let n = 2166136261;
  for (let i = 0; i < s.length; i++) n = Math.imul(n ^ s.charCodeAt(i), 16777619);
  return (n >>> 0).toString(16);
}
const other = (role) => (role === "dm" ? "player" : "dm");
const classOf = (id) => classes.find((row) => row.id === id) ?? null;
const backgroundOf = (id) => backgrounds.find((row) => row.id === id) ?? null;
const speciesOf = (id) => species.find((row) => row.id === id) ?? null;
const featOf = (id) => feats.find((row) => row.id === id) ?? null;
const skillOf = (id) => skills.find((row) => row.id === id) ?? null;
const spellOf = (id) => spells.find((row) => row.id === id) ?? null;

// ---------------------------------------------------------------- sources

export const SRD = (en, it) => srdSource(en, it);
/** SRD 5.2.1 "Standard Array by Class" (EN 21 / IT 23): the suggestion the quick path uses. */
export const STANDARD_ARRAY_BY_CLASS = Object.freeze({
  barbarian: [15, 13, 14, 10, 12, 8],
  bard: [8, 14, 12, 13, 10, 15],
  cleric: [14, 8, 13, 10, 15, 12],
  druid: [8, 12, 14, 13, 15, 10],
  fighter: [15, 14, 13, 8, 10, 12],
  monk: [12, 15, 13, 10, 14, 8],
  paladin: [15, 10, 13, 8, 12, 14],
  ranger: [12, 15, 13, 8, 14, 10],
  rogue: [12, 15, 13, 14, 10, 8],
  sorcerer: [10, 13, 14, 8, 12, 15],
  warlock: [8, 14, 13, 12, 10, 15],
  wizard: [8, 12, 13, 15, 14, 10],
});
export const STANDARD_ARRAY_SOURCE = SRD([21], [23]);
export const arrayScores = (classId) =>
  Object.fromEntries(
    ABILITY_IDS.map((id, i) => [id, STANDARD_ARRAY_BY_CLASS[classId]?.[i] ?? STANDARD_ARRAY[i]]),
  );

// SRD 5.2.1 recommendations printed in each class ("… are recommended"). Spells missing from
// the builder catalogue are skipped; the rest is completed by the app and labelled as such.
export const RECOMMENDED = Object.freeze({
  bard: {
    cantrips: ["vicious-mockery"],
    spells: ["charm-person", "healing-word"],
    src: SRD([32], [36, 37]),
  },
  cleric: {
    cantrips: ["guidance", "sacred-flame"],
    spells: ["bless", "cure-wounds", "guiding-bolt"],
    src: SRD([36, 37], [41]),
  },
  druid: {
    cantrips: ["druidcraft", "produce-flame"],
    spells: ["cure-wounds", "faerie-fire", "thunderwave"],
    src: SRD([42], [47]),
  },
  fighter: { fightingStyle: "defense", src: SRD([47], [53]) },
  paladin: { spells: ["heroism", "searing-smite"], src: SRD([54], [71]) },
  ranger: { spells: ["cure-wounds"], src: SRD([58], [76]) },
  rogue: { expertise: ["sleight-of-hand", "stealth"], src: SRD([61], [55]) },
  sorcerer: {
    cantrips: ["light", "prestidigitation"],
    spells: ["burning-hands", "detect-magic"],
    src: SRD([64, 65], [79]),
  },
  warlock: {
    cantrips: ["eldritch-blast", "prestidigitation"],
    spells: ["charm-person", "hex"],
    src: SRD([71], [86, 87]),
  },
  wizard: {
    cantrips: ["light", "mage-hand", "ray-of-frost"],
    spells: ["detect-magic", "feather-fall", "mage-armor", "magic-missile", "sleep", "thunderwave"],
    src: SRD([77, 78], [60]),
  },
  human: { originFeat: "skilled", src: SRD([86], [97]) },
});
// Weapon Mastery has no printed recommendation: the app proposes the class package weapons.
const MASTERY_PICKS = {
  fighter: ["greatsword", "javelin", "longsword", "longbow"],
  barbarian: ["greataxe", "handaxe"],
  paladin: ["longsword", "javelin"],
  ranger: ["scimitar", "shortsword"],
  rogue: ["dagger", "shortsword"],
};
const LANGUAGE_PICKS = {
  dragonborn: ["draconic"],
  dwarf: ["dwarvish"],
  elf: ["elvish"],
  gnome: ["gnomish"],
  goliath: ["giant"],
  halfling: ["halfling"],
  orc: ["orc"],
};
const LANGUAGE_ORDER = [
  "elvish",
  "dwarvish",
  "halfling",
  "gnomish",
  "draconic",
  "giant",
  "goblin",
  "orc",
  "common-sign",
];

// ---------------------------------------------------------------- source categories (DDB-015)

// SRD 5.1 (the 2014 rules) under CC-BY-4.0, as published by Wizards of the Coast in 2023.
// Pages were not verified in this prototype and are left empty rather than guessed.
export const LEGACY_SOURCE = Object.freeze({
  kind: "srd",
  edition: "2014",
  revision: "5.1",
  url: "https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf",
  license: "CC-BY-4.0",
  pages: [],
  label: "SRD 5.1 (2014) · CC-BY-4.0",
});
export const SOURCE_CATEGORIES = Object.freeze([
  {
    id: "core-2024",
    name: L("Regole 2024 · SRD 5.2.1", "2024 rules · SRD 5.2.1"),
    description: L(
      "Classi, specie, background, talenti e incantesimi delle regole attuali: la base di ogni calcolo.",
      "Classes, species, backgrounds, feats and spells of the current rules: the base of every calculation.",
    ),
  },
  {
    id: "legacy-2014",
    name: L("Legacy 2014 · SRD 5.1", "Legacy 2014 · SRD 5.1"),
    description: L(
      "Opzioni delle regole 2014. Non si mescolano con i calcoli 2024: si registrano come capacità manuali con la loro fonte.",
      "Options from the 2014 rules. They are not mixed into 2024 calculations: they are recorded as manual features with their source.",
    ),
  },
  {
    id: "homebrew",
    name: L("Homebrew", "Homebrew"),
    description: L(
      "Contenuti creati da te o attivati dal DM nella Biblioteca; si scelgono dalle sezioni con «Cerca nella Biblioteca».",
      "Content made by you or enabled by the DM in the Library; picked from the sections with “Browse library”.",
    ),
  },
]);
export const LEGACY_OPTIONS = Object.freeze([
  {
    id: "legacy-2014:half-elf",
    section: "origin",
    kind: "species",
    name: L("Mezzelfo (2014)", "Half-Elf (2014)"),
    summary: L(
      "Specie delle regole 2014: nel 2024 i suoi tratti non esistono come specie.",
      "A 2014 species: in 2024 its traits do not exist as a species.",
    ),
  },
  {
    id: "legacy-2014:half-orc",
    section: "origin",
    kind: "species",
    name: L("Mezzorco (2014)", "Half-Orc (2014)"),
    summary: L(
      "Specie delle regole 2014: nel 2024 i suoi tratti non esistono come specie.",
      "A 2014 species: in 2024 its traits do not exist as a species.",
    ),
  },
  {
    id: "legacy-2014:grappler",
    section: "features",
    kind: "feat",
    name: L("Lottatore (2014)", "Grappler (2014)"),
    summary: L(
      "Versione 2014 del talento; la versione 2024 è già nel catalogo.",
      "The 2014 version of the feat; the 2024 version is already in the catalogue.",
    ),
  },
]);
const legacyOn = (data) => data?.sources?.legacy2014 === true;
/** Options hidden by a disabled source category, for a builder section or all of them. */
export function hiddenOptions(data, section = null) {
  if (legacyOn(data)) return [];
  return LEGACY_OPTIONS.filter((option) => !section || option.section === section);
}
const policyOf = (state) =>
  state.ext?.["campaign-settings"]?.campaigns?.[state.campaign?.id]?.policy ?? null;
/** Whether this draft may turn the legacy category on (a campaign that blocks it wins). */
export function legacyAccess(state, draft) {
  const actor = draft?.actorId ? state.actors?.[draft.actorId] : null;
  const blocked = policyOf(state)?.legacySources === "blocked";
  if (blocked && actor && isCampaignActor(actor, state.campaign?.id))
    return {
      allowed: false,
      reason: L(
        "Bloccata in questa campagna: le regole 2024 sono fissate alla creazione.",
        "Blocked in this campaign: the 2024 rules are fixed at creation.",
      ),
    };
  return {
    allowed: true,
    reason: blocked
      ? L(
          `La campagna «${state.campaign?.name ?? ""}» blocca il legacy: una scheda che lo usa resta personale finché lo conserva.`,
          `The campaign “${state.campaign?.name ?? ""}” blocks legacy content: a sheet that uses it stays personal while it keeps it.`,
        )
      : null,
  };
}
/** The manual feature a legacy option becomes (I-062/I-063: recreated, provenance kept). */
export function legacyRecord(optionId, now = Date.now()) {
  const option = LEGACY_OPTIONS.find((row) => row.id === optionId);
  if (!option) throw refuse("Opzione legacy sconosciuta.", "Unknown legacy option.");
  return {
    id: `${optionId}:${now.toString(36)}`,
    legacyId: option.id,
    name: copy(option.name),
    description: L(
      "Registrata dalle regole 2014: nessun calcolo 2024 la applica; risolvila a mano con il DM.",
      "Recorded from the 2014 rules: no 2024 calculation applies it; resolve it by hand with the DM.",
    ),
    automation: "manual",
    source: { ...copy(LEGACY_SOURCE), revision: "5.1", kind: "srd" },
  };
}
export const legacyRecords = (actorOrData) =>
  (actorOrData?.characterBuild?.data ?? actorOrData)?.features?.custom?.filter(
    (row) => row?.source?.edition === "2014",
  ) ?? [];

// ---------------------------------------------------------------- name suggestions (DDB-021)

// App-authored names (not taken from any rulebook list), six per page, stable for a page.
const NAMES = {
  dwarf: [
    "Brann",
    "Hedda",
    "Torvi",
    "Gudrik",
    "Marta",
    "Olgar",
    "Sigra",
    "Varn",
    "Ilsa",
    "Dorrik",
    "Ketta",
    "Harald",
  ],
  elf: [
    "Aelin",
    "Sariel",
    "Ithren",
    "Maelis",
    "Tavrin",
    "Elowen",
    "Caelith",
    "Nerys",
    "Faelan",
    "Lyssa",
    "Ardel",
    "Venna",
  ],
  halfling: [
    "Tamsin",
    "Pip",
    "Nella",
    "Corbin",
    "Wren",
    "Milo",
    "Rosie",
    "Jory",
    "Bree",
    "Tobin",
    "Lark",
    "Posy",
  ],
  human: [
    "Sefa",
    "Marco",
    "Ada",
    "Teo",
    "Irene",
    "Bruno",
    "Nadia",
    "Carlo",
    "Viola",
    "Emil",
    "Rhea",
    "Livio",
  ],
  orc: [
    "Kessa",
    "Grisha",
    "Durak",
    "Vosha",
    "Murra",
    "Thokk",
    "Ragna",
    "Ulka",
    "Borz",
    "Shava",
    "Kraag",
    "Ysolde",
  ],
  dragonborn: [
    "Vharos",
    "Kalya",
    "Drezzen",
    "Sorra",
    "Zareth",
    "Nyxa",
    "Korrim",
    "Belsa",
    "Taryx",
    "Irrin",
    "Vessa",
    "Draxil",
  ],
  gnome: [
    "Fizzel",
    "Nib",
    "Orla",
    "Quill",
    "Tinka",
    "Bodo",
    "Pell",
    "Zinnia",
    "Wix",
    "Marlo",
    "Fennick",
    "Dabble",
  ],
  goliath: [
    "Tharra",
    "Orun",
    "Kavi",
    "Mokra",
    "Seld",
    "Vothar",
    "Ilka",
    "Brom",
    "Garra",
    "Tekk",
    "Ulma",
    "Rask",
  ],
  tiefling: [
    "Lethe",
    "Sable",
    "Orrin",
    "Vesper",
    "Ash",
    "Mercy",
    "Riven",
    "Nyra",
    "Calix",
    "Thorne",
    "Ione",
    "Maren",
  ],
};
// ---------------------------------------------------------------- personality (PG-10)

// DDB «Suggest More» + Add / Random for traits, ideals, bonds and flaws. The 2024 SRD
// backgrounds print no personality tables, so these are original d20 Studio suggestions
// (authored for this prototype, not SRD text), grouped by background with a general set
// for any other background. Contract shared with the sheet (P2): the actor stores plain
// strings in actor.personality = {traits, ideals, bonds, flaws}.
export const PERSONALITY_SOURCE = Object.freeze({
  kind: "authored",
  label: L("Suggerimenti originali di d20 Studio", "Original d20 Studio suggestions"),
  revision: "personality-suggestions-2026-09-26",
});
export const PERSONALITY_SUGGESTIONS = Object.freeze({
  any: {
    traits: [
      L("Parlo poco, ma ricordo tutto.", "I speak little, but I remember everything."),
      L("Rido nei momenti peggiori.", "I laugh at the worst moments."),
      L("Offro da mangiare a chiunque incontri.", "I offer food to everyone I meet."),
      L("Colleziono piccoli oggetti da ogni luogo.", "I collect small keepsakes from every place."),
    ],
    ideals: [
      L("Libertà: nessuno dovrebbe vivere in catene.", "Freedom: no one should live in chains."),
      L("Lealtà: chi mi è vicino viene prima.", "Loyalty: those close to me come first."),
      L("Curiosità: ogni porta chiusa va aperta.", "Curiosity: every closed door must be opened."),
      L("Equità: le regole valgono per tutti.", "Fairness: the rules apply to everyone."),
    ],
    bonds: [
      L("Devo tutto a chi mi ha cresciuto.", "I owe everything to the one who raised me."),
      L("Cerco un fratello scomparso.", "I am searching for a missing sibling."),
      L("Il mio villaggio conta su di me.", "My village is counting on me."),
      L("Porto un oggetto che non è mio.", "I carry an object that is not mine."),
    ],
    flaws: [
      L("Non so tenere un segreto.", "I cannot keep a secret."),
      L("Mi fido troppo in fretta.", "I trust too quickly."),
      L("Non chiedo mai aiuto.", "I never ask for help."),
      L("Il denaro mi tenta più del dovuto.", "Money tempts me more than it should."),
    ],
  },
  acolyte: {
    traits: [
      L("Cito un testo sacro per ogni occasione.", "I quote a holy text for every occasion."),
      L("Accendo una candela prima di ogni viaggio.", "I light a candle before every journey."),
      L("Ascolto tutti con pazienza.", "I listen to everyone with patience."),
      L("Trovo un presagio in ogni cosa.", "I see an omen in everything."),
    ],
    ideals: [
      L("Fede: il mio dio mi guida.", "Faith: my god guides me."),
      L("Carità: aiuto chi ha bisogno.", "Charity: I help those in need."),
      L("Tradizione: i riti vanno custoditi.", "Tradition: the rites must be preserved."),
      L("Speranza: anche la notte più lunga finisce.", "Hope: even the longest night ends."),
    ],
    bonds: [
      L("Il mio tempio è la mia casa.", "My temple is my home."),
      L("Proteggo una reliquia a ogni costo.", "I guard a relic at any cost."),
      L("Il mio maestro mi ha salvato la vita.", "My mentor saved my life."),
      L("Cerco un testo perduto del mio ordine.", "I seek a lost text of my order."),
    ],
    flaws: [
      L("Giudico chi non condivide la mia fede.", "I judge those who do not share my faith."),
      L(
        "Obbedisco ai superiori senza chiedermi perché.",
        "I obey my superiors without asking why.",
      ),
      L("Temo di deludere il mio dio.", "I fear disappointing my god."),
      L("Credo a ogni profezia.", "I believe every prophecy."),
    ],
  },
  criminal: {
    traits: [
      L("Conto sempre le uscite di una stanza.", "I always count a room's exits."),
      L("Ho un soprannome per tutti.", "I have a nickname for everyone."),
      L("Resto calmo quando gli altri urlano.", "I stay calm when others shout."),
      L("Non siedo mai con le spalle alla porta.", "I never sit with my back to the door."),
    ],
    ideals: [
      L("Onore tra ladri: non tradisco i miei.", "Honor among thieves: I never betray my own."),
      L("Libertà: le catene si spezzano.", "Freedom: chains are made to be broken."),
      L("Ricchezza: un giorno non avrò più fame.", "Wealth: one day I will never be hungry again."),
      L("Riscatto: posso ancora cambiare.", "Redemption: I can still change."),
    ],
    bonds: [
      L("Ho un debito con la gilda.", "I owe a debt to the guild."),
      L("Qualcuno ha pagato al posto mio.", "Someone paid the price in my place."),
      L(
        "Proteggo i ragazzi di strada del mio quartiere.",
        "I protect the street kids of my district.",
      ),
      L("Un vecchio socio mi ha tradito.", "An old partner betrayed me."),
    ],
    flaws: [
      L("Non resisto a una serratura chiusa.", "I cannot resist a locked lock."),
      L("Scappo quando le cose si mettono male.", "I run when things go wrong."),
      L("Mento anche quando non serve.", "I lie even when there is no need."),
      L("Non dimentico un torto.", "I never forget a wrong."),
    ],
  },
  sage: {
    traits: [
      L(
        "Correggo gli errori altrui, anche quelli piccoli.",
        "I correct other people's mistakes, even small ones.",
      ),
      L("Prendo appunti su tutto.", "I take notes on everything."),
      L("Dimentico di mangiare quando studio.", "I forget to eat while studying."),
      L("Uso parole difficili senza accorgermene.", "I use long words without noticing."),
    ],
    ideals: [
      L("Conoscenza: capire è potere.", "Knowledge: understanding is power."),
      L("Verità: i fatti prima delle opinioni.", "Truth: facts before opinions."),
      L("Scoperta: il mondo è un libro da leggere.", "Discovery: the world is a book to read."),
      L("Condivisione: il sapere va insegnato.", "Sharing: knowledge must be taught."),
    ],
    bonds: [
      L("La mia biblioteca è tutto ciò che ho.", "My library is all I have."),
      L("Devo finire l'opera del mio maestro.", "I must finish my mentor's work."),
      L("Cerco la risposta a una sola domanda.", "I seek the answer to a single question."),
      L("Un rivale ha rubato la mia scoperta.", "A rival stole my discovery."),
    ],
    flaws: [
      L("Sottovaluto chi non ha studiato.", "I underestimate the unschooled."),
      L("Mi perdo nei dettagli.", "I get lost in details."),
      L("Rischio tutto per un segreto antico.", "I risk everything for an ancient secret."),
      L("Non ammetto di non sapere.", "I never admit I do not know."),
    ],
  },
  soldier: {
    traits: [
      L("Mi alzo prima dell'alba, sempre.", "I rise before dawn, always."),
      L(
        "Racconto le mie battaglie a chi non me le chiede.",
        "I tell my battle stories to anyone, asked or not.",
      ),
      L("Tengo l'equipaggiamento in ordine perfetto.", "I keep my gear in perfect order."),
      L("Parlo con franchezza, anche troppa.", "I speak bluntly, sometimes too bluntly."),
    ],
    ideals: [
      L("Dovere: gli ordini vanno eseguiti.", "Duty: orders must be carried out."),
      L("Protezione: difendo chi non può farlo.", "Protection: I defend those who cannot."),
      L("Onore: si combatte a viso aperto.", "Honor: one fights face to face."),
      L("Cameratismo: nessuno resta indietro.", "Comradeship: no one gets left behind."),
    ],
    bonds: [
      L("Non dimentico i compagni caduti.", "I never forget my fallen comrades."),
      L(
        "Il mio vecchio capitano mi ha dato una seconda possibilità.",
        "My old captain gave me a second chance.",
      ),
      L("Porto lo stendardo della mia compagnia.", "I carry my company's banner."),
      L("Ho giurato di proteggere una città.", "I swore to protect a city."),
    ],
    flaws: [
      L("Obbedisco anche agli ordini sbagliati.", "I follow orders even when they are wrong."),
      L("Gli incubi della guerra non mi lasciano.", "The nightmares of war never leave me."),
      L("Disprezzo chi non ha mai combattuto.", "I look down on those who have never fought."),
      L("Risolvo tutto con la forza.", "I solve everything with force."),
    ],
  },
});
/** Suggestions for one personality key and background (the general set as fallback). */
export function personalitySuggestions(backgroundId, key) {
  const own = PERSONALITY_SUGGESTIONS[backgroundId]?.[key] ?? [];
  return [...own, ...(PERSONALITY_SUGGESTIONS.any[key] ?? [])];
}
/** «Casuale»: one suggestion not already on the list, in the reader's language, or null. */
export function randomPersonality(
  backgroundId,
  key,
  current = [],
  lang = "it",
  random = Math.random,
) {
  const pool = personalitySuggestions(backgroundId, key)
    .map((entry) => entry[lang] ?? entry.it)
    .filter((entry) => !current.includes(entry));
  return pool.length ? pool[Math.floor(random() * pool.length)] : null;
}

export const NAMES_PER_PAGE = 6;
export function nameSuggestions(speciesId, page = 0) {
  const list = NAMES[speciesId] ?? NAMES.human;
  const start = ((Number(page) || 0) * NAMES_PER_PAGE) % list.length;
  return Array.from({ length: NAMES_PER_PAGE }, (_, i) => list[(start + i) % list.length]);
}

// ---------------------------------------------------------------- starting equipment (DDB-019)

// Items missing from the SRD sample catalogue: official EN/IT names, weights in kg as the
// Italian SRD prints them (the spellbook has no printed weight: 0 until recorded).
const EXTRA_ITEMS = {
  flail: ["Mazzafrusto", "Flail", 1, [91], [103], "weapon"],
  "dungeoneers-pack": [
    "Dotazione da avventuriero",
    "Dungeoneer’s Pack",
    27.5,
    [95, 97],
    [108, 109],
  ],
  arrows: ["Frecce", "Arrows", 0.025, [96], [111]],
  quiver: ["Faretra", "Quiver", 0.5, [95, 99], [108, 110]],
  robe: ["Tunica", "Robe", 2, [95, 99], [108, 113]],
  spellbook: ["Libro degli incantesimi", "Spellbook", 0, [77, 78], [59, 60]],
  "scholars-pack": ["Dotazione da studioso", "Scholar’s Pack", 11, [95, 99], [108, 109]],
  "priests-pack": ["Dotazione da sacerdote", "Priest’s Pack", 14, [95, 99], [108, 109]],
  "burglars-pack": ["Dotazione da scassinatore", "Burglar’s Pack", 19, [95, 96], [108, 109]],
  "holy-symbol": ["Simbolo sacro (amuleto)", "Holy Symbol (amulet)", 0.5, [97], [112]],
  "arcane-focus-staff": [
    "Focus arcano (bastone ferrato)",
    "Arcane Focus (Quarterstaff)",
    2,
    [96],
    [110],
    "staff",
  ],
  "druidic-focus-staff": [
    "Focus druidico (bastone ferrato)",
    "Druidic Focus (Quarterstaff)",
    2,
    [97],
    [110],
    "staff",
  ],
  "calligraphers-supplies": ["Scorte da calligrafo", "Calligrapher’s Supplies", 2.5, [93], [105]],
  "book-prayers": ["Libro (preghiere)", "Book (prayers)", 2.5, [95, 96], [108, 110]],
  "book-history": ["Libro (storia)", "Book (history)", 2.5, [95, 96], [108, 110]],
  parchment: ["Pergamena", "Parchment", 0, [95, 99], [108, 111]],
  pouch: ["Borsa", "Pouch", 0.5, [95, 99], [108]],
  "travelers-clothes": ["Abiti da viaggiatore", "Traveler’s Clothes", 2, [95, 97], [107, 108]],
  "gaming-set-dice": ["Gioco (dadi)", "Gaming Set (dice)", 0, [94], [106]],
};
const option = (id, items, gp) => ({ id, items, gp });
/** Class packages from each class table (SRD 5.2.1); other classes offer their gold only. */
export const CLASS_PACKAGES = Object.freeze({
  fighter: {
    src: SRD([47], [53]),
    options: [
      option(
        "A",
        [
          ["chain-mail", 1],
          ["greatsword", 1],
          ["flail", 1],
          ["javelin", 8],
          ["dungeoneers-pack", 1],
        ],
        4,
      ),
      option(
        "B",
        [
          ["studded-leather-armor", 1],
          ["scimitar", 1],
          ["shortsword", 1],
          ["longbow", 1],
          ["arrows", 20],
          ["quiver", 1],
          ["dungeoneers-pack", 1],
        ],
        11,
      ),
      option("C", [], 155),
    ],
  },
  wizard: {
    src: SRD([77], [59]),
    options: [
      option(
        "A",
        [
          ["dagger", 2],
          ["arcane-focus-staff", 1],
          ["robe", 1],
          ["spellbook", 1],
          ["scholars-pack", 1],
        ],
        5,
      ),
      option("B", [], 55),
    ],
  },
  cleric: {
    src: SRD([36], [41]),
    options: [
      option(
        "A",
        [
          ["chain-shirt", 1],
          ["shield", 1],
          ["mace", 1],
          ["holy-symbol", 1],
          ["priests-pack", 1],
        ],
        7,
      ),
      option("B", [], 110),
    ],
  },
  rogue: {
    src: SRD([61], [55]),
    options: [
      option(
        "A",
        [
          ["leather-armor", 1],
          ["dagger", 2],
          ["shortsword", 1],
          ["shortbow", 1],
          ["arrows", 20],
          ["quiver", 1],
          ["thieves-tools", 1],
          ["burglars-pack", 1],
        ],
        8,
      ),
      option("B", [], 100),
    ],
  },
  druid: {
    src: SRD([41], [46]),
    options: [
      option(
        "A",
        [
          ["leather-armor", 1],
          ["shield", 1],
          ["sickle", 1],
          ["druidic-focus-staff", 1],
          ["explorers-pack", 1],
          ["herbalism-kit", 1],
        ],
        9,
      ),
      option("B", [], 50),
    ],
  },
});
export const BACKGROUND_PACKAGES = Object.freeze({
  acolyte: {
    src: SRD([83], [93]),
    options: [
      option(
        "A",
        [
          ["calligraphers-supplies", 1],
          ["book-prayers", 1],
          ["holy-symbol", 1],
          ["parchment", 10],
          ["robe", 1],
        ],
        8,
      ),
      option("B", [], 50),
    ],
  },
  criminal: {
    src: SRD([83], [93]),
    options: [
      option(
        "A",
        [
          ["dagger", 2],
          ["thieves-tools", 1],
          ["crowbar", 1],
          ["pouch", 2],
          ["travelers-clothes", 1],
        ],
        16,
      ),
      option("B", [], 50),
    ],
  },
  sage: {
    src: SRD([83], [93]),
    options: [
      option(
        "A",
        [
          ["quarterstaff", 1],
          ["calligraphers-supplies", 1],
          ["book-history", 1],
          ["parchment", 8],
          ["robe", 1],
        ],
        8,
      ),
      option("B", [], 50),
    ],
  },
  soldier: {
    src: SRD([83], [93]),
    options: [
      option(
        "A",
        [
          ["spear", 1],
          ["shortbow", 1],
          ["arrows", 20],
          ["gaming-set-dice", 1],
          ["healers-kit", 1],
          ["quiver", 1],
          ["travelers-clothes", 1],
        ],
        14,
      ),
      option("B", [], 50),
    ],
  },
});
/** SRD 5.2.1 "Starting Equipment at Higher Levels" (EN 24 / IT 27): a guide for the DM. */
export const HIGHER_LEVEL_START = Object.freeze([
  { min: 2, max: 4, base: 0, multiplier: 0, magic: L("1 comune", "1 Common") },
  {
    min: 5,
    max: 10,
    base: 500,
    multiplier: 25,
    magic: L("1 comune, 1 non comune", "1 Common, 1 Uncommon"),
  },
  {
    min: 11,
    max: 16,
    base: 5000,
    multiplier: 250,
    magic: L("2 comuni, 3 non comuni, 1 raro", "2 Common, 3 Uncommon, 1 Rare"),
  },
  {
    min: 17,
    max: 20,
    base: 20000,
    multiplier: 250,
    magic: L(
      "2 comuni, 4 non comuni, 3 rari, 1 molto raro",
      "2 Common, 4 Uncommon, 3 Rare, 1 Very Rare",
    ),
  },
]);
export const HIGHER_LEVEL_SOURCE = SRD([24], [27]);
export const bandFor = (level) =>
  HIGHER_LEVEL_START.find((row) => level >= row.min && level <= row.max) ?? null;

/** One inventory row for a package item (same shape as the other SRD item rows). */
export function itemRow(slug, quantity, prefix) {
  const entry = getById(`srd2024:item:${slug}`);
  const id = `${prefix}:${slug}`;
  if (entry)
    return {
      id,
      srdId: entry.id,
      name: copy(entry.name),
      description: copy(entry.summary),
      kind: entry.category === "weapon" ? "weapon" : "gear",
      category: entry.category,
      quantity,
      weight: entry.weight == null ? 0 : poundsToKg(entry.weight),
      equipped: false,
      ...(entry.weapon ? { weaponType: entry.slug, weapon: copy(entry.weapon) } : {}),
      ...(entry.armor ? { armor: copy(entry.armor) } : {}),
      source: copy(entry.source),
    };
  const def = EXTRA_ITEMS[slug];
  if (!def) throw refuse(`Oggetto sconosciuto: ${slug}.`, `Unknown item: ${slug}.`);
  const [it, en, weight, pagesEn, pagesIt, kind] = def;
  const staff = kind === "staff" ? getById("srd2024:item:quarterstaff") : null;
  return {
    id,
    name: L(it, en),
    description:
      slug === "spellbook"
        ? L(
            "Peso non indicato nella SRD 5.2.1: registralo se il tavolo lo usa.",
            "Weight not printed in SRD 5.2.1: record it if the table uses it.",
          )
        : L("", ""),
    kind: kind === "weapon" || staff ? "weapon" : "gear",
    quantity,
    weight,
    equipped: false,
    ...(staff ? { weaponType: "quarterstaff", weapon: copy(staff.weapon) } : {}),
    source: SRD(pagesEn, pagesIt),
  };
}
const packageClassGold = (classId) =>
  equipmentOptions.find((row) => row.classId === classId)?.currency?.gp ?? 0;
/** The alternatives of a class and a background: packages when catalogued, gold always. */
export function startingOptions(classId, backgroundId) {
  const cls = classOf(classId),
    bg = backgroundOf(backgroundId);
  const classPack = CLASS_PACKAGES[classId];
  const bgPack = BACKGROUND_PACKAGES[backgroundId];
  return {
    class: cls
      ? {
          id: cls.id,
          name: copy(cls.name),
          source: classPack?.src ?? copy(cls.source),
          missing: !classPack,
          options: classPack
            ? classPack.options.map((row) => copy(row))
            : [option(classId === "fighter" ? "C" : "B", [], packageClassGold(classId))],
        }
      : null,
    background: bg
      ? {
          id: bg.id,
          name: copy(bg.name),
          source: bgPack?.src ?? copy(bg.source),
          missing: !bgPack,
          options: bgPack ? bgPack.options.map((row) => copy(row)) : [option("B", [], 50)],
        }
      : null,
  };
}
export const defaultOption = (group) => group?.options?.[0]?.id ?? null;
/** Items and gold of one choice: each origin gives its package OR its gold, never both. */
export function planStarting({ classId, backgroundId, classOption, backgroundOption, bonus = 0 }) {
  const options = startingOptions(classId, backgroundId);
  const items = [],
    gold = { class: 0, background: 0, bonus: Number(bonus) || 0 };
  for (const [origin, group, chosen] of [
    ["class", options.class, classOption],
    ["background", options.background, backgroundOption],
  ]) {
    if (!group) continue;
    const picked = group.options.find((row) => row.id === chosen);
    if (!picked)
      throw refuse(
        "Scegli un’alternativa valida per classe e background.",
        "Choose a valid alternative for class and background.",
      );
    for (const [slug, quantity] of picked.items)
      items.push(itemRow(slug, quantity, `bp-start:${origin}-${picked.id}`));
    gold[origin] = picked.gp;
  }
  return { items, gold, total: gold.class + gold.background + gold.bonus };
}

// ---------------------------------------------------------------- rules helpers

/** Same eligibility the builder applies (character-build featEligibility), for projections. */
export function featEligibility(feat, total, abilities, rows) {
  const req = feat?.requirements ?? {};
  if (req.level && total < req.level)
    return {
      eligible: false,
      reason: L("Livello richiesto non raggiunto.", "Required level not reached."),
    };
  if (req.anyAbility) {
    const values = req.anyAbility.map((id) => abilities?.[id]);
    if (values.some((v) => Number.isFinite(v) && v >= req.minimum)) return { eligible: true };
    if (values.some((v) => !Number.isFinite(v)))
      return {
        eligible: null,
        reason: L("Caratteristica richiesta ignota.", "Required ability is unknown."),
      };
    return {
      eligible: false,
      reason: L("Caratteristica richiesta troppo bassa.", "Required ability is too low."),
    };
  }
  if (
    req.feature &&
    !rows.some(
      (r) => r.classId === "fighter" || (["paladin", "ranger"].includes(r.classId) && r.level >= 2),
    )
  )
    return {
      eligible: false,
      reason: L(
        "Manca la capacità Stile di Combattimento.",
        "The Fighting Style feature is missing.",
      ),
    };
  return { eligible: true };
}
const ABILITY_NAMES = {
  str: L("Forza", "Strength"),
  dex: L("Destrezza", "Dexterity"),
  con: L("Costituzione", "Constitution"),
  int: L("Intelligenza", "Intelligence"),
  wis: L("Saggezza", "Wisdom"),
  cha: L("Carisma", "Charisma"),
};
export const abilityName = (id) => ABILITY_NAMES[id];
/** A readable requirement for a feat, with the character's current values. */
export function featRequirement(feat, abilities, total) {
  const req = feat?.requirements ?? {};
  const parts = [];
  if (req.level) parts.push(L(`livello ${req.level}+`, `level ${req.level}+`));
  if (req.anyAbility) {
    const it = req.anyAbility.map((id) => ABILITY_NAMES[id].it).join(" o ");
    const en = req.anyAbility.map((id) => ABILITY_NAMES[id].en).join(" or ");
    parts.push(L(`${it} ${req.minimum} o superiore`, `${en} ${req.minimum} or higher`));
  }
  if (req.feature) parts.push(L("capacità Stile di Combattimento", "Fighting Style feature"));
  const values = (req.anyAbility ?? []).map((id) => [id, abilities?.[id] ?? null]);
  return {
    text: L(parts.map((p) => p.it).join(", "), parts.map((p) => p.en).join(", ")),
    values,
    level: total,
    source: copy(feat?.source),
  };
}
/** SRD multiclass prerequisites (EN 24 / IT 27): 13 in every class's primary ability. */
export function multiclassRows(abilities, rows) {
  return (rows ?? [])
    .map((row) => {
      const cls = classOf(row.classId);
      if (!cls) return null;
      const values = cls.primaryAbilities.map((id) => [id, abilities?.[id] ?? null]);
      const met = (v) => Number.isFinite(v) && v >= 13;
      const ok =
        cls.primaryMode === "any"
          ? values.some(([, v]) => met(v))
          : values.every(([, v]) => met(v));
      const join = (lang, word) =>
        cls.primaryAbilities.map((id) => ABILITY_NAMES[id][lang]).join(word);
      return {
        classId: cls.id,
        name: copy(cls.name),
        level: row.level,
        requirement: L(
          `${join("it", cls.primaryMode === "any" ? " o " : " e ")} 13`,
          `${join("en", cls.primaryMode === "any" ? " or " : " and ")} 13`,
        ),
        values,
        ok,
      };
    })
    .filter(Boolean);
}
export const MULTICLASS_SOURCE = SRD([24], [27]);

/** Class and background skills already proficient, by who grants them. */
function grantedSkills(data) {
  const bg = backgroundOf(data?.origin?.backgroundId);
  return new Map(
    (bg?.skills ?? []).map((id) => [id, { kind: "background", id: bg.id, name: copy(bg.name) }]),
  );
}
// The species choice that grants a skill (Elf Keen Senses, Human Skillful), named after the
// species and its trait, so every notice says where the proficiency comes from.
export function speciesSkillSource(data) {
  const race = speciesOf(data?.origin?.speciesId);
  const choice = race?.choices?.find((row) => row.id === "skill");
  if (!race || !choice || !data?.origin?.choices?.skill) return null;
  return {
    kind: "species",
    id: race.id,
    name: L(`${race.name.it} (${choice.name.it})`, `${race.name.en} (${choice.name.en})`),
  };
}
const classSource = (data) => {
  const cls = classOf(data?.classes?.[0]?.classId);
  return cls ? { kind: "class", id: cls.id, name: copy(cls.name) } : null;
};
/**
 * Duplicate proficiencies (DDB-017): a skill chosen for the class or the species that the
 * background already grants is released automatically, with a notice (the background is
 * fixed). A skill chosen both for the class and for the species is a real choice: it is
 * listed with `ask: true` and nothing is cleared until the player says which to replace.
 */
export function duplicateSkills(data) {
  const granted = grantedSkills(data);
  const out = [];
  for (const id of data?.skills?.selected ?? [])
    if (granted.has(id)) out.push({ skillId: id, from: "class", grantedBy: granted.get(id) });
  const speciesSkill = data?.origin?.choices?.skill;
  if (speciesSkill && granted.has(speciesSkill))
    out.push({ skillId: speciesSkill, from: "species", grantedBy: granted.get(speciesSkill) });
  else if (speciesSkill && (data?.skills?.selected ?? []).includes(speciesSkill))
    out.push({
      skillId: speciesSkill,
      from: "species",
      ask: true,
      grantedBy: speciesSkillSource(data),
      alsoBy: classSource(data),
    });
  return out;
}
export function releaseDuplicates(data, { now = Date.now(), by = "player" } = {}) {
  const found = duplicateSkills(data).filter((row) => !row.ask);
  if (!found.length) return [];
  data.skills ??= {};
  data.skills.released = Array.isArray(data.skills.released) ? data.skills.released : [];
  for (const row of found) {
    if (row.from === "class") {
      data.skills.selected = data.skills.selected.filter((id) => id !== row.skillId);
      data.skills.confirmed = false;
    } else if (data.origin?.choices) delete data.origin.choices.skill;
    data.skills.released.push({
      id: `${row.from}:${row.skillId}:${now.toString(36)}`,
      skillId: row.skillId,
      from: row.from,
      grantedBy: row.grantedBy,
      at: iso(now),
      by,
    });
  }
  return found;
}
/** The player's answer to a class/species duplicate: `replace` is "class" or "species". */
export function replaceDuplicate(data, skillId, replace, { now = Date.now(), by = "player" } = {}) {
  const row = duplicateSkills(data).find((entry) => entry.ask && entry.skillId === skillId);
  if (!row || !["class", "species"].includes(replace)) return null;
  data.skills.released = Array.isArray(data.skills.released) ? data.skills.released : [];
  if (replace === "class") {
    data.skills.selected = data.skills.selected.filter((id) => id !== skillId);
    data.skills.confirmed = false;
  } else delete data.origin.choices.skill;
  data.skills.released.push({
    id: `${replace}:${skillId}:${now.toString(36)}`,
    skillId,
    from: replace,
    grantedBy: replace === "class" ? row.grantedBy : row.alsoBy,
    at: iso(now),
    by,
  });
  return row;
}
export const skillName = (id) => copy(skillOf(id)?.name) ?? L(id, id);

// ---------------------------------------------------------------- composing a full build

function spellGrantsFor(rows, background, originChoices) {
  const grants = [];
  for (const row of rows) {
    const cls = classOf(row.classId),
      progress = cls && SPELL_PROGRESSION[cls.id];
    if (!progress) continue;
    const own = calculateSpellSlots([row]);
    const maxLevel =
      cls.caster === "pact"
        ? own.pactSlots.level
        : Math.max(0, ...Object.keys(own.spellSlots).map(Number));
    const prepared = progress.prepared[row.level - 1];
    grants.push({
      id: "class:" + cls.id,
      classId: cls.id,
      cantripCount: progress.cantrips[row.level - 1],
      preparedCount: prepared,
      knownCount: cls.id === "wizard" ? 6 + 2 * (row.level - 1) : prepared,
      maxLevel,
    });
  }
  if (background?.featId?.startsWith("magic-initiate"))
    grants.push({
      id: "background:magic-initiate",
      classId: background.featId.slice("magic-initiate-".length),
      cantripCount: 2,
      preparedCount: 1,
      knownCount: 1,
      maxLevel: 1,
    });
  return grants;
}
function orderedSpells(classId, level, recommended = []) {
  const pool = spells.filter(
    (s) => s.classes.includes(classId) && (level === 0 ? s.level === 0 : s.level > 0),
  );
  const byId = new Map(pool.map((s) => [s.id, s]));
  const first = recommended.filter((id) => byId.has(id));
  // Then spells with a Table command, then the catalogue order (the app's own completion).
  const rest = pool
    .filter((s) => !first.includes(s.id))
    .sort((a, b) => Number(Boolean(b.combatActionId)) - Number(Boolean(a.combatActionId)));
  return [...first, ...rest.map((s) => s.id)];
}
function pickSkills(cls, abilities, taken, count) {
  return cls.skills
    .filter((id) => !taken.has(id))
    .map((id, index) => ({ id, index, score: abilities[skillOf(id)?.ability] ?? 10 }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map((row) => row.id);
}
export const SPECIES_DEFAULTS = Object.freeze({
  human: { size: "medium" },
  elf: { lineage: "high", skill: "perception" },
  gnome: { lineage: "rock" },
  tiefling: { size: "medium", legacy: "infernal" },
  dragonborn: { ancestry: "red" },
  goliath: { ancestry: "stone" },
});
/**
 * A complete draft data object for the existing builder from a short spec: the quick path
 * and every ready-made character use it. `spec`: {name, classes:[{classId, level,
 * subclassId?}], levelOrder?, backgroundId, speciesId, speciesChoices?, scores?, bonuses?,
 * feats?: {grantId: [id | {id, bonuses}]}, spells?: {grantId: {cantrips, spells, prepared}},
 * equipment?: {classOption, backgroundOption}, story?}. Every automatic pick is recorded in
 * `picks` with its origin: "srd" (a printed recommendation) or "app" (the app's completion).
 */
export function composeBuild(spec) {
  const picks = [];
  const note = (kind, id, from) => picks.push({ kind, id, from });
  const rows = (spec.classes ?? []).map((row) => ({
    classId: row.classId,
    level: row.level ?? 1,
    subclassId:
      row.subclassId ??
      ((row.level ?? 1) >= 3 ? (classOf(row.classId)?.subclasses?.[0]?.id ?? null) : null),
  }));
  const total = rows.reduce((sum, row) => sum + row.level, 0);
  const initial = classOf(spec.levelOrder?.[0] ?? rows[0]?.classId);
  if (!initial) throw refuse("Scegli una classe.", "Choose a class.");
  const levelOrder =
    spec.levelOrder ?? (rows.length === 1 ? Array(rows[0].level).fill(rows[0].classId) : []);
  const bg = backgroundOf(spec.backgroundId),
    race = speciesOf(spec.speciesId);
  if (!bg) throw refuse("Scegli un background.", "Choose a background.");
  if (!race) throw refuse("Scegli una specie.", "Choose a species.");
  // Abilities: the SRD Standard Array by Class, or the spec's own arrangement of the array.
  const scores = spec.scores ?? arrayScores(initial.id);
  if (!spec.scores) note("abilities", initial.id, "srd");
  const values = [...STANDARD_ARRAY];
  const assignment = {};
  for (const id of ABILITY_IDS) {
    const index = values.findIndex(
      (v, i) => v === scores[id] && !Object.values(assignment).includes(i),
    );
    if (index < 0)
      throw refuse(
        "I punteggi non sono la serie standard.",
        "The scores are not the standard array.",
      );
    assignment[id] = index;
  }
  // Background increases: +2 and +1 to the listed abilities that already score highest.
  let bonuses = spec.bonuses;
  if (!bonuses) {
    const ranked = [...bg.abilities].sort((a, b) => scores[b] - scores[a]);
    bonuses = { [ranked[0]]: 2, [ranked[1]]: 1 };
    note("background-bonuses", bg.id, "app");
  }
  const backgroundBonuses = Object.fromEntries(ABILITY_IDS.map((id) => [id, bonuses[id] ?? 0]));
  const effective = Object.fromEntries(
    ABILITY_IDS.map((id) => [id, scores[id] + (bonuses[id] ?? 0)]),
  );
  // Species sub-choices: the spec's, else the app's defaults.
  const choices = { ...(SPECIES_DEFAULTS[race.id] ?? {}), ...(spec.speciesChoices ?? {}) };
  const casting = initial.spellcastingAbility;
  if (["elf", "gnome", "tiefling"].includes(race.id))
    choices.spellcastingAbility ??= ["int", "wis", "cha"].includes(casting) ? casting : "int";
  if (bg.featId.startsWith("magic-initiate"))
    choices.magicInitiateAbility ??= ["int", "wis", "cha"].includes(casting)
      ? casting
      : bg.featId.endsWith("wizard")
        ? "int"
        : "wis";
  // Skills: the class's, by the character's best abilities, never a background duplicate.
  const taken = new Set(bg.skills);
  if (race.id === "elf") taken.add(choices.skill);
  const classSkills = spec.skills ?? pickSkills(initial, effective, taken, initial.skillCount);
  if (!spec.skills) note("skills", initial.id, "app");
  if (race.id === "human" && !choices.skill) {
    const pool = skills
      .map((s, index) => ({ id: s.id, index, score: effective[s.ability] ?? 10 }))
      .filter((s) => !taken.has(s.id) && !classSkills.includes(s.id))
      .sort((a, b) => b.score - a.score || a.index - b.index);
    choices.skill = pool[0]?.id;
  }
  const languageIds = [...new Set([...(LANGUAGE_PICKS[race.id] ?? []), ...LANGUAGE_ORDER])].slice(
    0,
    2,
  );
  const proficient = [
    ...new Set([...classSkills, ...bg.skills, ...(choices.skill ? [choices.skill] : [])]),
  ];
  // Feature choices: the spec's, else SRD recommendations, else the app's completion.
  const grants = requiredFeatureGrants(rows, race, proficient);
  const selected = [];
  for (const grant of grants) {
    const given = spec.feats?.[grant.id];
    if (given) {
      for (const entry of given)
        selected.push(
          typeof entry === "string"
            ? { id: entry, grantId: grant.id }
            : { ...copy(entry), grantId: grant.id },
        );
      continue;
    }
    const ids = grant.options.map((o) => o.id);
    let wanted = [];
    const cls = grant.id.split(":")[1];
    if (grant.id.endsWith(":fighting-style")) {
      wanted = ["defense"];
      note("fighting-style", "defense", cls === "fighter" ? "srd" : "app");
    } else if (grant.id.endsWith(":mastery")) {
      wanted = MASTERY_PICKS[cls] ?? [];
      note("mastery", cls, "app");
    } else if (grant.id.endsWith(":expertise")) {
      wanted = RECOMMENDED[cls]?.expertise ?? [];
      note("expertise", cls, RECOMMENDED[cls]?.expertise ? "srd" : "app");
    } else if (grant.id === "species:human:origin-feat") {
      wanted = [RECOMMENDED.human.originFeat];
      note("origin-feat", "skilled", "srd");
    } else if (grant.id.endsWith(":divine-order")) wanted = ["protector"];
    else if (grant.id.endsWith(":primal-order")) wanted = ["warden"];
    else if (grant.id.includes(":feat:")) {
      // Ability Score Improvement on the two highest abilities below 20.
      const best = [...ABILITY_IDS]
        .sort((a, b) => effective[b] - effective[a])
        .filter((id) => effective[id] < 20);
      selected.push({
        id: "ability-score-improvement",
        grantId: grant.id,
        bonuses: { [best[0]]: 1, [best[1]]: 1 },
      });
      note("feat", grant.id, "app");
      continue;
    }
    const chosen = [
      ...wanted.filter((id) => ids.includes(id)),
      ...ids.filter((id) => !wanted.includes(id)),
    ]
      .filter((id) => id !== bg.featId)
      .slice(0, grant.count);
    for (const id of chosen) selected.push({ id, grantId: grant.id });
  }
  // Spells: per granting source, recommended first.
  const spellSelected = [],
    spellPrepared = [];
  // A later source (Magic Initiate) prefers spells an earlier one did not already give.
  const fresh = (list) => [
    ...list.filter((id) => !spellSelected.some((s) => s.id === id)),
    ...list.filter((id) => spellSelected.some((s) => s.id === id)),
  ];
  for (const grant of spellGrantsFor(rows, bg, choices)) {
    const given = spec.spells?.[grant.id];
    const rec = grant.id.startsWith("class:") ? RECOMMENDED[grant.classId] : null;
    if (!given && rec) note("spells", grant.classId, "srd");
    const cantrips = (
      given?.cantrips ?? fresh(orderedSpells(grant.classId, 0, rec?.cantrips))
    ).slice(0, grant.cantripCount);
    const pool = fresh(orderedSpells(grant.classId, 1, rec?.spells)).filter(
      (id) => (spellOf(id)?.level ?? 9) <= grant.maxLevel,
    );
    const known = (given?.spells ?? pool).slice(0, grant.knownCount);
    const preparedPool = [...known].sort(
      (a, b) =>
        Number(Boolean(spellOf(b)?.combatActionId)) - Number(Boolean(spellOf(a)?.combatActionId)),
    );
    const prepared = (given?.prepared ?? preparedPool).slice(0, grant.preparedCount);
    for (const id of [...cantrips, ...known]) spellSelected.push({ id, grantId: grant.id });
    for (const id of prepared) spellPrepared.push({ id, grantId: grant.id });
  }
  // Hit points: the level 1 maximum, then the fixed value at every later level.
  const perLevel = {};
  for (let level = 2; level <= total; level++) perLevel[level] = { method: "fixed" };
  const classOption =
    spec.equipment?.classOption ?? defaultOption(startingOptions(initial.id, bg.id).class);
  const backgroundOption =
    spec.equipment?.backgroundOption ??
    defaultOption(startingOptions(initial.id, bg.id).background);
  const plan = planStarting({
    classId: initial.id,
    backgroundId: bg.id,
    classOption,
    backgroundOption,
  });
  return {
    picks,
    data: {
      identity: {
        name: String(spec.name ?? ""),
        visibility: "private",
        context: "personal",
        advancement: { method: "milestone", xp: 0, milestone: "" },
      },
      sources: { enabled: ["srd-2024"], manualReason: "", legacy2014: false },
      classes: rows,
      levelOrder: rows.length > 1 ? levelOrder : [],
      origin: {
        backgroundId: bg.id,
        speciesId: race.id,
        backgroundBonuses,
        choices,
      },
      abilities: {
        method: "array",
        assignment,
        scores: Object.fromEntries(ABILITY_IDS.map((id) => [id, null])),
        manualTotals: {},
        source: "",
      },
      skills: { selected: classSkills, languages: languageIds, tools: [], confirmed: true },
      features: { selected, custom: [], featOverride: false, confirmed: true },
      spells: { selected: spellSelected, prepared: spellPrepared, custom: [], confirmed: true },
      equipment: {
        mode: "manual",
        items: plan.items,
        currency: { gp: plan.total },
        confirmed: true,
        starting: {
          level: total,
          classId: initial.id,
          backgroundId: bg.id,
          classOption,
          backgroundOption,
          gold: plan.gold,
        },
      },
      hp: {
        mode: "calculated",
        maxHp: null,
        currentHp: null,
        tempHp: 0,
        perLevel,
        currentKnown: false,
      },
      story: { description: spec.story?.description ?? "", backstory: spec.story?.backstory ?? "" },
    },
  };
}
/** The builder's own preview of a data object, in a scratch state (never the live one). */
export function scratchPreview(data, role = "player") {
  const scratch = {
    actors: {},
    characterDrafts: [],
    characterBuildRolls: [],
    ext: {},
    campaign: { id: "bp-scratch" },
  };
  createCharacterDraft(scratch, { id: "bp-scratch", kind: "create" }, role);
  saveCharacterDraft(scratch, "bp-scratch", { data: copy(data) }, role);
  return previewCharacterDraft(scratch, "bp-scratch", role);
}

// ---------------------------------------------------------------- slice

export function seedSlice() {
  return { quick: {}, origins: {}, equipment: {}, rolls: [], respec: {}, levelDowns: [] };
}
export function normalizeSlice(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Future builder-plus data");
  const base = seedSlice();
  if (!isObject(slice)) return base;
  return {
    quick: isObject(slice.quick) ? slice.quick : {},
    origins: isObject(slice.origins) ? slice.origins : {},
    equipment: isObject(slice.equipment) ? slice.equipment : {},
    rolls: Array.isArray(slice.rolls) ? slice.rolls : [],
    respec: isObject(slice.respec) ? slice.respec : {},
    levelDowns: Array.isArray(slice.levelDowns) ? slice.levelDowns : [],
  };
}
export const sliceOf = (state) => state?.ext?.[ID] ?? null;
function mutable(state) {
  state.ext ??= {};
  state.ext[ID] = normalizeSlice(state.ext[ID]);
  return state.ext[ID];
}

// ---------------------------------------------------------------- quick path (DDB-010)

export const QUICK_STEPS = ["class", "background", "species", "identity", "review"];
function ownDraft(state, draftId, role) {
  const draft = (state.characterDrafts ?? []).find((row) => row.id === draftId);
  if (!draft || draft.owner !== role)
    throw refuse("Questa bozza non è tua.", "This draft is not yours.", "draft-private");
  if (draft.status !== "active")
    throw refuse("La bozza è già conclusa.", "The draft is already closed.", "closed");
  return draft;
}
export function quickOf(state, draftId, role) {
  const row = sliceOf(state)?.quick?.[draftId];
  return row && row.owner === role ? row : null;
}
/** Starts (or resumes) the quick path on an existing, untouched "create" draft. */
export function startQuick(state, draftId, role, now = Date.now()) {
  const draft = ownDraft(state, draftId, role);
  if (draft.kind !== "create" || draft.actorId)
    throw refuse(
      "Il percorso rapido crea solo personaggi nuovi.",
      "The quick path only creates new characters.",
    );
  const slice = mutable(state);
  slice.quick[draftId] ??= {
    owner: role,
    step: "class",
    classId: null,
    backgroundId: null,
    speciesId: null,
    speciesChoices: {},
    name: draft.data?.identity?.name ?? "",
    namePage: 0,
    portrait: null,
    status: "active",
    createdAt: iso(now),
    updatedAt: iso(now),
  };
  return slice.quick[draftId];
}
const QUICK_FIELDS = [
  "step",
  "classId",
  "backgroundId",
  "speciesId",
  "speciesChoices",
  "name",
  "namePage",
  "portrait",
  "equipment",
];
export function updateQuick(state, draftId, role, patch, now = Date.now()) {
  ownDraft(state, draftId, role);
  const row = quickOf(state, draftId, role);
  if (!row || row.status !== "active")
    throw refuse("Il percorso rapido non è attivo.", "The quick path is not active.");
  for (const key of Object.keys(patch))
    if (!QUICK_FIELDS.includes(key)) throw Error("Unknown quick path field " + key);
  if (patch.classId !== undefined && !classOf(patch.classId))
    throw refuse("Classe sconosciuta.", "Unknown class.");
  if (patch.backgroundId !== undefined && !backgroundOf(patch.backgroundId))
    throw refuse("Background sconosciuto.", "Unknown background.");
  if (patch.speciesId !== undefined && !speciesOf(patch.speciesId))
    throw refuse("Specie sconosciuta.", "Unknown species.");
  if (patch.step !== undefined) {
    if (!QUICK_STEPS.includes(patch.step)) throw Error("Unknown quick path step");
    const need = {
      background: "classId",
      species: "backgroundId",
      identity: "speciesId",
      review: "speciesId",
    };
    const merged = { ...row, ...patch };
    for (const step of QUICK_STEPS.slice(1, QUICK_STEPS.indexOf(patch.step) + 1))
      if (!merged[need[step]])
        throw refuse("Completa prima il passo precedente.", "Complete the previous step first.");
  }
  if (patch.name !== undefined) patch.name = String(patch.name).slice(0, 100);
  if (patch.equipment !== undefined && patch.equipment !== null) {
    const merged = { ...row, ...patch };
    planStarting({
      classId: merged.classId,
      backgroundId: merged.backgroundId,
      classOption: patch.equipment.classOption,
      backgroundOption: patch.equipment.backgroundOption,
    });
    patch.equipment = {
      classOption: patch.equipment.classOption,
      backgroundOption: patch.equipment.backgroundOption,
    };
  }
  // A new class or background resets a package chosen for the previous one.
  if (
    (patch.classId && patch.classId !== row.classId) ||
    (patch.backgroundId && patch.backgroundId !== row.backgroundId)
  )
    patch.equipment ??= null;
  if (patch.speciesId !== undefined && patch.speciesId !== row.speciesId && !patch.speciesChoices)
    patch.speciesChoices = {};
  if (patch.speciesChoices !== undefined) {
    const race = speciesOf(patch.speciesId ?? row.speciesId);
    for (const [key, value] of Object.entries(patch.speciesChoices)) {
      const choice = race?.choices?.find((c) => c.id === key);
      if (!choice || !choice.options.some((o) => o.id === value))
        throw refuse("Scelta della specie non valida.", "Invalid species choice.");
    }
  }
  Object.assign(row, copy(patch), { updatedAt: iso(now) });
  return row;
}
export function quickSpec(row) {
  return {
    name: row.name,
    classes: [{ classId: row.classId, level: 1 }],
    backgroundId: row.backgroundId,
    speciesId: row.speciesId,
    speciesChoices: row.speciesChoices,
    ...(row.equipment ? { equipment: row.equipment } : {}),
  };
}
/**
 * DDB: the quick path can hand its choices to the full builder instead of creating. Complete
 * choices arrive composed (review); partial ones carry what is chosen so far, and the builder
 * opens on the first section still to choose. Returns that section.
 */
export function moveQuickToBuilder(state, draftId, role, now = Date.now()) {
  const draft = ownDraft(state, draftId, role);
  const row = quickOf(state, draftId, role);
  if (!row || row.status !== "active")
    throw refuse("Il percorso rapido non è attivo.", "The quick path is not active.");
  let data, section;
  if (row.classId && row.backgroundId && row.speciesId) {
    ({ data } = composeBuild(quickSpec(row)));
    section = "review";
  } else {
    data = copy(draft.data);
    data.identity = { ...data.identity, name: row.name ?? "" };
    if (row.classId) data.classes = [{ classId: row.classId, level: 1, subclassId: null }];
    if (row.backgroundId) data.origin = { ...data.origin, backgroundId: row.backgroundId };
    section = row.classId ? "origin" : "class";
  }
  saveCharacterDraft(state, draftId, { data, section }, role);
  row.status = "moved";
  row.updatedAt = iso(now);
  return section;
}
/** Fills the draft with the quick choices and applies it: the sheet is a normal build. */
export function finishQuick(
  state,
  draftId,
  role,
  { operationId, allowIncomplete = false, now = Date.now() } = {},
) {
  const draft = ownDraft(state, draftId, role);
  const row = quickOf(state, draftId, role);
  if (!row || row.status !== "active")
    throw refuse("Il percorso rapido non è attivo.", "The quick path is not active.");
  if (!row.classId || !row.backgroundId || !row.speciesId)
    throw refuse("Scegli classe, background e specie.", "Choose class, background and species.");
  const { data } = composeBuild(quickSpec(row));
  saveCharacterDraft(state, draft.id, { data, section: "review" }, role);
  const preview = previewCharacterDraft(state, draft.id, role);
  if (!preview.canApply)
    throw refuse(
      preview.errors[0]?.it ?? "La costruzione non è completa.",
      preview.errors[0]?.en ?? "The build is not complete.",
      "build-incomplete",
    );
  const result = applyCharacterDraft(
    state,
    draft.id,
    {
      operationId: operationId ?? `bp-quick-${draft.id}`,
      reviewKey: preview.reviewKey,
      allowIncomplete,
    },
    role,
  );
  const slice = mutable(state);
  row.status = "done";
  row.actorId = result.actorId;
  row.updatedAt = iso(now);
  slice.origins[result.actorId] = { kind: "quick", draftId, by: role, at: iso(now) };
  return result.actorId;
}

// ---------------------------------------------------------------- ready-made characters (DDB-004/009, R20-020)

export const PREMADE_SOURCE = Object.freeze({
  kind: "authored-demo",
  edition: "2024",
  revision: "blueprint-b39-premades-1",
  note: "Synthetic ready-made characters built from SRD 5.2.1 options by this prototype; not official premades.",
});
export const PREMADES = Object.freeze([
  {
    id: "brann",
    revision: 1,
    name: "Brann",
    tagline: L("Nano guerriero, scudo del gruppo", "Dwarf fighter, the party’s shield"),
    spec: {
      name: "Brann",
      classes: [{ classId: "fighter", level: 1 }],
      backgroundId: "soldier",
      speciesId: "dwarf",
      story: {
        description: L(
          "Barba intrecciata con anelli di ferro; parla poco, ascolta tutto.",
          "Braided beard with iron rings; says little, hears everything.",
        ),
        backstory: L(
          "Ha lasciato la guardia di confine dopo una ritirata che non ha mai perdonato.",
          "Left the border guard after a retreat he never forgave.",
        ),
      },
    },
  },
  {
    id: "sefa",
    revision: 1,
    name: "Sefa",
    tagline: L("Umana chierica, cura e luce", "Human cleric, healing and light"),
    spec: {
      name: "Sefa",
      classes: [{ classId: "cleric", level: 1 }],
      backgroundId: "acolyte",
      speciesId: "human",
      feats: { "species:human:origin-feat": ["alert"] },
      story: {
        description: L(
          "Mantello grigio e un simbolo sacro di ottone consumato dalle preghiere.",
          "Grey cloak and a brass holy symbol worn smooth by prayer.",
        ),
        backstory: L(
          "Custodiva il faro del tempio di Bruma finché la lanterna non si è spenta.",
          "Kept the lighthouse of the temple of Bruma until its lantern went out.",
        ),
      },
    },
  },
  {
    id: "kessa",
    revision: 1,
    name: "Kessa",
    tagline: L("Orca guerriera 2 / maga 1", "Orc fighter 2 / wizard 1"),
    spec: {
      name: "Kessa",
      classes: [
        { classId: "fighter", level: 2 },
        { classId: "wizard", level: 1 },
      ],
      levelOrder: ["fighter", "fighter", "wizard"],
      backgroundId: "soldier",
      speciesId: "orc",
      scores: { str: 15, dex: 12, con: 14, int: 13, wis: 10, cha: 8 },
      bonuses: { str: 2, con: 1 },
      spells: {
        "class:wizard": {
          cantrips: ["fire-bolt", "mage-hand", "light"],
          spells: [
            "magic-missile",
            "shield",
            "burning-hands",
            "mage-armor",
            "detect-magic",
            "feather-fall",
          ],
          prepared: ["magic-missile", "shield", "burning-hands", "mage-armor"],
        },
      },
      story: {
        description: L(
          "Cicatrice sul sopracciglio, un grimorio legato alla cintura con una cinghia di cuoio.",
          "Scar across the brow, a grimoire strapped to her belt with a leather band.",
        ),
        backstory: L(
          "Veterana di una compagnia mercenaria, ha iniziato a studiare magia per capire chi le aveva bruciato la tenda.",
          "A veteran of a mercenary company, she took up magic to learn who burned her tent.",
        ),
      },
    },
  },
  {
    id: "oren",
    revision: 1,
    name: "Oren",
    tagline: L("Nano druido 5, custode dei boschi", "Dwarf druid 5, keeper of the woods"),
    spec: {
      name: "Oren",
      classes: [{ classId: "druid", level: 5 }],
      backgroundId: "sage",
      speciesId: "dwarf",
      bonuses: { wis: 2, con: 1 },
      feats: {
        "class:druid:feat:4": [{ id: "ability-score-improvement", bonuses: { wis: 1, con: 1 } }],
      },
      story: {
        description: L(
          "Pelle segnata dal sole, bastone di frassino con incisioni di rune.",
          "Sun-marked skin, an ash staff carved with runes.",
        ),
        backstory: L(
          "Ha catalogato le erbe della valle per quarant’anni prima che il bosco smettesse di rispondergli.",
          "Catalogued the valley’s herbs for forty years before the woods stopped answering him.",
        ),
      },
    },
  },
]);
export const premadeOf = (id) => PREMADES.find((row) => row.id === id) ?? null;
const premadeCache = new Map();
/**
 * A premade's full data (the builder's own format) and the builder's preview of it. Its
 * authored story is written in the reader's language (the claimed copy keeps that text).
 */
export function premadeBuild(id, lang = "it") {
  const premade = premadeOf(id);
  if (!premade) throw refuse("Personaggio pronto sconosciuto.", "Unknown ready-made character.");
  const language = lang === "en" ? "en" : "it";
  const key = `${id}:${language}`;
  if (!premadeCache.has(key)) {
    const text = (value) => (isObject(value) ? value[language] : (value ?? ""));
    const story = premade.spec.story ?? {};
    const { data, picks } = composeBuild({
      ...premade.spec,
      story: { description: text(story.description), backstory: text(story.backstory) },
    });
    premadeCache.set(key, { data, picks, preview: scratchPreview(data) });
  }
  const cached = premadeCache.get(key);
  return { premade, ...copy(cached) };
}
/**
 * Claim (DDB "Claim Character"): a personal, private copy made through a normal builder
 * draft, with the premade's provenance. Every claim is a new independent character.
 */
export function claimPremade(
  state,
  id,
  role,
  {
    operationId,
    allowIncomplete = false,
    now = Date.now(),
    discardDraftId = null,
    lang = "it",
  } = {},
) {
  if (!["player", "dm"].includes(role)) throw Error("Unknown identity");
  const { premade, data } = premadeBuild(id, lang);
  const draftId = `bp-premade-${premade.id}-${operationId ?? now.toString(36)}`;
  createCharacterDraft(state, { id: draftId, kind: "create" }, role);
  saveCharacterDraft(state, draftId, { data, section: "review" }, role);
  const preview = previewCharacterDraft(state, draftId, role);
  if (!preview.canApply)
    throw refuse(
      preview.errors[0]?.it ?? "Il personaggio pronto non è valido.",
      preview.errors[0]?.en ?? "The ready-made character is not valid.",
    );
  if (preview.incomplete && !allowIncomplete)
    throw refuse(
      "Conferma di aver visto gli aspetti da verificare prima di reclamarlo.",
      "Confirm you saw the aspects to verify before claiming it.",
      "unverified",
    );
  const result = applyCharacterDraft(
    state,
    draftId,
    { operationId: operationId ?? draftId, reviewKey: preview.reviewKey, allowIncomplete },
    role,
  );
  const actor = state.actors[result.actorId];
  actor.premade = {
    id: premade.id,
    revision: premade.revision,
    source: copy(PREMADE_SOURCE),
    claimedAt: iso(now),
  };
  const slice = mutable(state);
  slice.origins[result.actorId] = {
    kind: "premade",
    premadeId: premade.id,
    revision: premade.revision,
    by: role,
    at: iso(now),
  };
  // The empty draft that led here (Create character → Ready-made) is not left behind.
  if (discardDraftId) {
    const leftover = (state.characterDrafts ?? []).find((row) => row.id === discardDraftId);
    if (leftover?.owner === role && leftover.status === "active" && leftover.revision === 0)
      discardCharacterDraft(state, discardDraftId, role);
  }
  return result.actorId;
}

// ---------------------------------------------------------------- starting equipment on the sheet

/** The starting equipment recorded for a sheet: the reopened choice or the creation one. */
export function startingRecord(state, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor) return null;
  return (
    sliceOf(state)?.equipment?.[actorId] ??
    copy(actor.characterBuild?.data?.equipment?.starting) ??
    null
  );
}
export function startingContext(state, actorId) {
  const actor = state.actors?.[actorId];
  const build = actor?.characterBuild?.data;
  const record = startingRecord(state, actorId);
  const classId = record?.classId ?? (build?.levelOrder?.[0] || build?.classes?.[0]?.classId);
  const backgroundId = record?.backgroundId ?? build?.origin?.backgroundId;
  if (!actor || !classId || !backgroundId)
    return {
      available: false,
      reason: L(
        "Questa scheda non registra classe iniziale e background: gli oggetti si gestiscono dall’inventario.",
        "This sheet does not record its starting class and background: manage items from the inventory.",
      ),
    };
  const level = record?.level ?? actor.level ?? 1;
  return { available: true, actor, record, classId, backgroundId, level, band: bandFor(level) };
}
const bonusRoll = (state, actorId) =>
  (sliceOf(state)?.rolls ?? [])
    .filter((roll) => roll.actorId === actorId && roll.status === "accepted")
    .at(-1) ?? null;
export const startingBonusRoll = bonusRoll;
/** What reopening changes: rows removed (still on the sheet), rows added, gold difference. */
export function previewStarting(state, actorId, choice) {
  const context = startingContext(state, actorId);
  if (!context.available) throw refuse(context.reason.it, context.reason.en);
  const { actor, record, classId, backgroundId } = context;
  const roll = choice.useBonus ? bonusRoll(state, actorId) : null;
  const plan = planStarting({
    classId,
    backgroundId,
    classOption: choice.classOption,
    backgroundOption: choice.backgroundOption,
    bonus: roll?.total ?? 0,
  });
  // Rows of the package kept by the new choice stay as they are (quantity, equipped).
  const planIds = new Set(plan.items.map((item) => item.id));
  const existing = (actor.inventory ?? []).filter((item) =>
    String(item.id).startsWith("bp-start:"),
  );
  const removed = existing.filter((item) => !planIds.has(item.id));
  const kept = existing.filter((item) => planIds.has(item.id));
  const added = plan.items.filter((item) => !existing.some((row) => row.id === item.id));
  const before = record?.gold
    ? (record.gold.class ?? 0) + (record.gold.background ?? 0) + (record.gold.bonus ?? 0)
    : 0;
  const delta = plan.total - before;
  const gp = Number(actor.currency?.gp ?? 0);
  const errors = [];
  if (gp + delta < 0)
    errors.push(
      L(
        `Servono ${-delta} mo da restituire ma la scheda ne ha ${gp}: l’oro della dotazione è già stato speso.`,
        `${-delta} gp would be returned but the sheet has ${gp}: the equipment gold is already spent.`,
      ),
    );
  return {
    context,
    plan,
    removed,
    kept,
    added,
    delta,
    gpBefore: gp,
    gpAfter: gp + delta,
    roll,
    errors,
    key: hash([actorId, choice, record, existing.map((r) => [r.id, r.quantity]), gp, roll?.id]),
  };
}
export function applyStarting(state, actorId, choice, role, { key, now = Date.now() } = {}) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    throw refuse(
      "Solo chi controlla la scheda può cambiarne la dotazione.",
      "Only whoever controls the sheet can change its equipment.",
    );
  const preview = previewStarting(state, actorId, choice);
  if (key && preview.key !== key)
    throw refuse(
      "La scheda è cambiata: controlla di nuovo l’anteprima.",
      "The sheet changed: check the preview again.",
      "stale",
    );
  if (preview.errors.length) throw refuse(preview.errors[0].it, preview.errors[0].en);
  const gone = new Set(preview.removed.map((item) => item.id));
  actor.inventory = [
    ...(actor.inventory ?? []).filter((item) => !gone.has(item.id)),
    ...preview.added,
  ];
  actor.currency = { ...(actor.currency ?? {}), gp: preview.gpAfter };
  const slice = mutable(state);
  const previous = slice.equipment[actorId];
  slice.equipment[actorId] = {
    level: preview.context.level,
    classId: preview.context.classId,
    backgroundId: preview.context.backgroundId,
    classOption: choice.classOption,
    backgroundOption: choice.backgroundOption,
    gold: preview.plan.gold,
    rollId: preview.roll?.id ?? null,
    revision: (previous?.revision ?? 0) + 1,
    history: [
      ...(previous?.history ?? []),
      {
        at: iso(now),
        by: role,
        classOption: choice.classOption,
        backgroundOption: choice.backgroundOption,
        delta: preview.delta,
      },
    ],
  };
  return slice.equipment[actorId];
}
/**
 * The higher-level supplement roll (1d10 × multiplier, SRD EN 24 / IT 27), digital or
 * physical. One accepted roll per sheet; a correction keeps the previous value and a reason.
 * A digital retry after Undo reuses the withdrawn face once (I-229), found in the log.
 */
export function withdrawnFace(state, actorId) {
  const kept = new Set((sliceOf(state)?.rolls ?? []).map((roll) => roll.id));
  const used = new Set(
    (sliceOf(state)?.rolls ?? []).map((roll) => roll.reusedFrom).filter(Boolean),
  );
  for (const entry of [...(state.log ?? [])].reverse())
    for (const roll of entry.rolls ?? [])
      if (
        roll.source === ID &&
        roll.actorId === actorId &&
        roll.mode === "digital" &&
        !kept.has(roll.startingRollId) &&
        !used.has(roll.startingRollId)
      )
        return { value: roll.values[0], rollId: roll.startingRollId };
  return null;
}
export function recordStartingRoll(
  state,
  actorId,
  role,
  { id, mode, value, reason = "", correctionOf = null, now = Date.now(), reusedFrom = null },
) {
  const context = startingContext(state, actorId);
  if (!context.available) throw refuse(context.reason.it, context.reason.en);
  if (!canControlActor(context.actor, role, state))
    throw refuse(
      "Solo chi controlla la scheda può tirare.",
      "Only whoever controls the sheet can roll.",
    );
  const band = context.band;
  if (!band?.multiplier)
    throw refuse(
      "Nessun tiro previsto: l’oro extra esiste solo per chi parte dal 5º livello in su.",
      "No roll applies: extra gold exists only when starting at level 5 or higher.",
    );
  if (!["digital", "physical"].includes(mode)) throw Error("Unknown roll mode");
  if (!Number.isInteger(value) || value < 1 || value > 10)
    throw refuse("Inserisci la faccia del d10, da 1 a 10.", "Enter the d10 face, 1 to 10.");
  const slice = mutable(state);
  const current = bonusRoll(state, actorId);
  if (current && !correctionOf)
    throw refuse(
      "Il tiro è già registrato: usa «Correggi registrazione» con un motivo.",
      "The roll is already recorded: use “Correct record” with a reason.",
    );
  if (correctionOf) {
    if (!String(reason).trim())
      throw refuse("Indica il motivo della correzione.", "Give the reason for the correction.");
    const previous = slice.rolls.find(
      (roll) => roll.id === correctionOf && roll.status === "accepted",
    );
    if (!previous)
      throw refuse("Il tiro da correggere non c’è più.", "The roll to correct is gone.");
    previous.status = "corrected";
  }
  const roll = {
    id,
    actorId,
    kind: "starting-gold",
    band: { min: band.min, max: band.max },
    dice: [{ count: 1, sides: 10 }],
    values: [value],
    multiplier: band.multiplier,
    base: band.base,
    total: band.base + value * band.multiplier,
    mode,
    by: role,
    at: iso(now),
    status: "accepted",
    ...(correctionOf ? { correctionOf, reason: String(reason).trim() } : {}),
    ...(reusedFrom ? { reusedFrom } : {}),
  };
  slice.rolls.push(roll);
  return roll;
}
/** The log roll (append-only evidence) announced with "roll-accepted". */
export function logRoll(roll, actor) {
  return {
    id: roll.id,
    source: ID,
    kind: "starting-gold",
    startingRollId: roll.id,
    actorId: roll.actorId,
    actorName: actor?.name ?? "",
    controller: roll.by,
    owner: roll.by,
    visibility: actor?.visibility === "private" ? "private" : "shared",
    mode: roll.mode,
    dice: copy(roll.dice),
    values: [...roll.values],
    modifier: 0,
    total: roll.total,
    rollMode: "normal",
    status: "accepted",
    ...(roll.reason ? { correctionReason: roll.reason } : {}),
  };
}

// ---------------------------------------------------------------- level down (FVT-012)

function spellGrantIds(rows, bg) {
  return spellGrantsFor(rows, bg, {});
}
/** New build data with one level of `classId` removed (its last occurrence in the order). */
export function levelDownData(actor, classId) {
  const data = copy(actor?.characterBuild?.data);
  if (!data)
    throw refuse(
      "Questa scheda non ha una costruzione registrata.",
      "This sheet has no recorded build.",
    );
  const rows = data.classes ?? [];
  const total = rows.reduce((sum, row) => sum + row.level, 0);
  if (total <= 1) throw refuse("Il livello 1 è il minimo.", "Level 1 is the minimum.");
  const row = rows.find((entry) => entry.classId === classId);
  if (!row) throw refuse("Classe non presente.", "Class not present.");
  const order =
    rows.length === 1 ? Array(rows[0].level).fill(rows[0].classId) : [...(data.levelOrder ?? [])];
  const index = order.lastIndexOf(classId);
  if (index === 0)
    throw refuse(
      "La classe iniziale resta: scendi prima di livello nelle altre classi.",
      "The starting class stays: level down in the other classes first.",
    );
  const cls = classOf(classId);
  const removedLevel = index + 1;
  // Hit points of the removed level, from the recorded method; unknown stays unknown.
  const choice = data.hp?.perLevel?.[removedLevel];
  const con = mod(actor.abilities?.con ?? 10);
  let natural = null;
  if (choice?.method === "fixed") natural = cls.hitDie / 2 + 1;
  else if (choice?.method === "manual" && Number.isInteger(choice.value)) natural = choice.value;
  else if (choice?.method === "roll")
    natural =
      (actor.characterBuild.rolls ?? []).find((roll) => roll.id === choice.rollId)?.total ?? null;
  const hpRemoved =
    natural === null
      ? null
      : Math.max(1, natural + con) + (data.origin?.speciesId === "dwarf" ? 1 : 0);
  // Order and per-level records shift down after the removed level.
  order.splice(index, 1);
  const perLevel = {};
  for (const [key, value] of Object.entries(data.hp?.perLevel ?? {})) {
    const level = Number(key);
    if (level < removedLevel) perLevel[level] = value;
    else if (level > removedLevel) perLevel[level - 1] = value;
  }
  row.level -= 1;
  data.classes = rows.filter((entry) => entry.level > 0);
  for (const entry of data.classes) if (entry.level < 3) entry.subclassId = null;
  data.levelOrder = data.classes.length > 1 ? order : [];
  data.hp = {
    ...data.hp,
    perLevel,
    mode: "manual",
    maxHp: hpRemoved === null ? null : actor.maxHp - hpRemoved,
  };
  // Choices whose granting feature disappears, or beyond the new count, are released.
  const race = speciesOf(data.origin?.speciesId),
    bg = backgroundOf(data.origin?.backgroundId);
  const proficient = [
    ...new Set([
      ...(data.skills?.selected ?? []),
      ...(bg?.skills ?? []),
      ...(data.origin?.choices?.skill ? [data.origin.choices.skill] : []),
    ]),
  ];
  const grants = requiredFeatureGrants(data.classes, race, proficient);
  const released = [];
  const kept = [];
  for (const selection of data.features?.selected ?? []) {
    const grant = grants.find((g) => g.id === selection.grantId);
    const count = kept.filter((s) => s.grantId === selection.grantId).length;
    if (grant && count < grant.count) kept.push(selection);
    else
      released.push({ kind: "feature", id: selection.id ?? selection, grantId: selection.grantId });
  }
  data.features.selected = kept;
  const spellGrants = spellGrantIds(data.classes, bg);
  const selectedSpells = [];
  const preparedSpells = [];
  for (const grant of spellGrants) {
    const chosen = (data.spells?.selected ?? []).filter((s) => s.grantId === grant.id);
    const cantrips = chosen.filter(
      (s) =>
        spellOf(s.id)?.level === 0 ||
        (data.spells?.custom ?? []).find((c) => c.id === s.id)?.level === 0,
    );
    const leveled = chosen.filter((s) => !cantrips.includes(s));
    const keepLeveled =
      grant.classId === "wizard" && grant.id === "class:wizard"
        ? leveled
        : leveled.slice(0, grant.knownCount);
    selectedSpells.push(...cantrips.slice(0, grant.cantripCount), ...keepLeveled);
    const prepared = (data.spells?.prepared ?? []).filter(
      (s) => s.grantId === grant.id && keepLeveled.some((k) => k.id === s.id),
    );
    preparedSpells.push(...prepared.slice(0, grant.preparedCount));
  }
  for (const s of data.spells?.selected ?? [])
    if (!selectedSpells.includes(s)) released.push({ kind: "spell", id: s.id, grantId: s.grantId });
  for (const s of data.spells?.prepared ?? [])
    if (
      !preparedSpells.some((p) => p.id === s.id && p.grantId === s.grantId) &&
      selectedSpells.some((k) => k.id === s.id && k.grantId === s.grantId)
    )
      released.push({ kind: "unprepared", id: s.id, grantId: s.grantId });
  data.spells.selected = selectedSpells;
  data.spells.prepared = preparedSpells;
  return { data, removedLevel, hpRemoved, released, fromLevel: total, toLevel: total - 1 };
}
function names(list) {
  return list.map((row) => copy(row.name) ?? L(String(row.id), String(row.id)));
}
function planAgainst(state, actorId, draftId, data, role) {
  createCharacterDraft(state, { id: draftId, kind: "revise", actorId }, role);
  saveCharacterDraft(state, draftId, { data, section: "review" }, role);
  return previewCharacterDraft(state, draftId, role);
}
/** A preview of the level down: what the sheet loses, computed by the builder itself. */
export function levelDownPlan(state, actorId, classId, role, { manualMaxHp = null } = {}) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    throw refuse(
      "Solo chi controlla la scheda può scendere di livello.",
      "Only whoever controls the sheet can level down.",
    );
  const down = levelDownData(actor, classId);
  if (down.data.hp.maxHp === null && Number.isInteger(manualMaxHp))
    down.data.hp.maxHp = manualMaxHp;
  const scratch = structuredClone(state);
  const preview = planAgainst(scratch, actorId, "bp-level-down-preview", down.data, role);
  const after = preview.proposed ?? {};
  const managed = (actor.features ?? []).filter((f) => f.buildManaged);
  const removedFeatures = managed.filter((f) => !(after.features ?? []).some((n) => n.id === f.id));
  const removedSpells = (actor.spells ?? []).filter(
    (s) => s.buildManaged && !(after.spells ?? []).some((n) => n.id === s.id),
  );
  const slots = [];
  for (const level of new Set([
    ...Object.keys(actor.spellSlots ?? {}),
    ...Object.keys(after.spellSlots ?? {}),
  ])) {
    const from = actor.spellSlots?.[level]?.max ?? 0,
      to = after.spellSlots?.[level]?.max ?? 0;
    if (from !== to) slots.push({ level: Number(level), from, to });
  }
  const dice = [];
  for (const die of new Set([
    ...Object.keys(actor.hitDice ?? {}),
    ...Object.keys(after.hitDice ?? {}),
  ])) {
    const from = actor.hitDice?.[die]?.max ?? 0,
      to = after.hitDice?.[die]?.max ?? 0;
    if (from !== to) dice.push({ die, from, to });
  }
  return {
    actorId,
    classId,
    data: down.data,
    fromLevel: down.fromLevel,
    toLevel: down.toLevel,
    hpRemoved: down.hpRemoved,
    needsHp: down.data.hp.maxHp === null,
    before: { maxHp: actor.maxHp, hp: actor.hp, className: copy(actor.className) },
    after: { maxHp: after.maxHp ?? null, hp: after.hp ?? null, className: copy(after.className) },
    removed: {
      features: names(removedFeatures),
      spells: names(removedSpells),
      slots,
      hitDice: dice,
      choices: down.released,
    },
    errors: preview.errors ?? [],
    warnings: (preview.warnings ?? []).filter((w) => w.code !== "manual-feature-resolution"),
    incomplete: Boolean(preview.incomplete),
    canApply: Boolean(preview.canApply),
    key: hash([actorId, classId, down.data, actor.maxHp, actor.hp, actor.level]),
  };
}
export function applyLevelDown(
  state,
  actorId,
  classId,
  role,
  { key, operationId, allowIncomplete = false, manualMaxHp = null, now = Date.now() } = {},
) {
  const plan = levelDownPlan(state, actorId, classId, role, { manualMaxHp });
  if (key && plan.key !== key)
    throw refuse(
      "La scheda è cambiata: rivedi l’anteprima.",
      "The sheet changed: review the preview again.",
      "stale",
    );
  if (plan.needsHp)
    throw refuse(
      "Indica i PF massimi dopo la discesa: il valore del livello rimosso non è registrato.",
      "Enter the maximum HP after levelling down: the removed level’s value is not recorded.",
    );
  if (!plan.canApply)
    throw refuse(
      plan.errors[0]?.it ?? "La discesa non è applicabile.",
      plan.errors[0]?.en ?? "The level down cannot be applied.",
    );
  if (plan.incomplete && !allowIncomplete)
    throw refuse(
      "Conferma gli aspetti da verificare.",
      "Confirm the aspects to verify.",
      "unverified",
    );
  const draftId = `bp-level-down-${operationId ?? now.toString(36)}`;
  const preview = planAgainst(state, actorId, draftId, plan.data, role);
  applyCharacterDraft(
    state,
    draftId,
    { operationId: operationId ?? draftId, reviewKey: preview.reviewKey, allowIncomplete },
    role,
  );
  mutable(state).levelDowns.push({
    actorId,
    classId,
    from: plan.fromLevel,
    to: plan.toLevel,
    by: role,
    at: iso(now),
  });
  return plan;
}

// ---------------------------------------------------------------- full rebuild (CRP-014)

/** BG3 respec: class, abilities, skills, feats and spells are asked again; species,
 *  background, name, appearance, story, languages and items stay. */
export function respecData(actor) {
  const data = copy(actor?.characterBuild?.data);
  if (!data)
    throw refuse(
      "Questa scheda non ha una costruzione registrata.",
      "This sheet has no recorded build.",
    );
  data.classes = [];
  data.levelOrder = [];
  data.origin = { ...data.origin, backgroundBonuses: {} };
  data.abilities = {
    method: "array",
    assignment: {},
    scores: Object.fromEntries(ABILITY_IDS.map((id) => [id, null])),
    manualTotals: {},
    source: "",
  };
  data.skills = { ...data.skills, selected: [], confirmed: false, released: [] };
  data.features = { ...data.features, selected: [], featOverride: false, confirmed: false };
  data.spells = { ...data.spells, selected: [], prepared: [], confirmed: false };
  data.hp = {
    mode: "calculated",
    maxHp: null,
    currentHp: actor.hp,
    tempHp: actor.tempHp ?? 0,
    perLevel: {},
    currentKnown: true,
  };
  data.identity = { ...data.identity, name: actor.name };
  return data;
}
export function startRespec(state, actorId, role, { draftId, now = Date.now() } = {}) {
  const actor = state.actors?.[actorId];
  if (!actor || actor.kind !== "character" || !canControlActor(actor, role, state))
    throw refuse(
      "Solo chi controlla la scheda può rifarla.",
      "Only whoever controls the sheet can rebuild it.",
    );
  const data = respecData(actor);
  createCharacterDraft(state, { id: draftId, kind: "revise", actorId }, role);
  saveCharacterDraft(state, draftId, { data, section: "class" }, role);
  mutable(state).respec[draftId] = { actorId, targetLevel: actor.level, by: role, at: iso(now) };
  return draftId;
}
export const respecOf = (state, draftId) => sliceOf(state)?.respec?.[draftId] ?? null;

// ---------------------------------------------------------------- rule exceptions (DDB-016)

/** Scores before a feat's own increases: a prerequisite is met before taking the feat. */
export function scoresBefore(abilities, selection) {
  const out = { ...(abilities ?? {}) };
  for (const [id, value] of Object.entries(selection?.bonuses ?? {}))
    if (Number.isFinite(out[id]) && Number.isFinite(value)) out[id] -= value;
  return out;
}
/** Selected feats that bypass a prerequisite: the permanent warnings of a draft or sheet. */
export function ruleExceptions(data, { level, abilities } = {}) {
  const rows = data?.classes ?? [];
  const total = level ?? rows.reduce((sum, row) => sum + (row.level ?? 0), 0);
  const out = [];
  for (const selection of data?.features?.selected ?? []) {
    const feat = featOf(selection?.id);
    if (!feat) continue;
    const before = scoresBefore(abilities, selection);
    const eligibility = featEligibility(feat, total, before, rows);
    if (eligibility.eligible === true) continue;
    out.push({
      featId: feat.id,
      grantId: selection.grantId,
      name: copy(feat.name),
      requirement: featRequirement(feat, before, total),
      reason: selection.exception?.reason ?? "",
      by: selection.exception?.by ?? null,
      at: selection.exception?.at ?? null,
      overridden: Boolean(data.features?.featOverride),
    });
  }
  return out;
}
/** Allow one feat despite its prerequisite (per choice, with the reason on record). */
export function allowException(
  data,
  { grantId, featId, reason, by = "player", now = Date.now(), abilities = {} },
) {
  const feat = featOf(featId);
  if (!feat) throw refuse("Talento sconosciuto.", "Unknown feat.");
  const text = String(reason ?? "").trim();
  if (!text)
    throw refuse(
      "Scrivi il motivo dell’eccezione (per esempio l’accordo con il DM).",
      "Write the reason for the exception (for example the agreement with the DM).",
    );
  data.features ??= { selected: [], custom: [] };
  data.features.featOverride = true;
  const exception = { reason: text.slice(0, 300), by, at: iso(now) };
  const existing = data.features.selected.find((s) => s.id === featId && s.grantId === grantId);
  if (existing) existing.exception = exception;
  else {
    data.features.selected = data.features.selected.filter((s) => s.grantId !== grantId);
    const entry = { id: featId, grantId, exception };
    if (featId === "grappler") {
      const pick = (abilities.str ?? 0) >= (abilities.dex ?? 0) ? "str" : "dex";
      entry.bonuses = { [pick]: 1 };
    }
    data.features.selected.push(entry);
  }
  return data;
}
export function removeException(data, { grantId, featId }) {
  data.features.selected = (data.features?.selected ?? []).filter(
    (s) => !(s.id === featId && s.grantId === grantId),
  );
  if (!data.features.selected.some((s) => s.exception)) data.features.featOverride = false;
  return data;
}

// ---------------------------------------------------------------- co-building (VTL-022)

export const COBUILD_FIELDS = Object.freeze([
  { id: "name", kind: "text", label: L("Nome", "Name"), max: 100 },
  { id: "classId", kind: "select", label: L("Classe", "Class"), options: () => classes },
  { id: "speciesId", kind: "select", label: L("Specie", "Species"), options: () => species },
  {
    id: "backgroundId",
    kind: "select",
    label: L("Background", "Background"),
    options: () => backgrounds,
  },
  {
    id: "concept",
    kind: "textarea",
    label: L("Idea del personaggio", "Character concept"),
    max: 600,
  },
  { id: "description", kind: "textarea", label: L("Aspetto", "Appearance"), max: 1200 },
  { id: "backstory", kind: "textarea", label: L("Storia e legami", "Story and bonds"), max: 2000 },
  {
    id: "hooks",
    kind: "textarea",
    label: L("Agganci per la campagna", "Campaign hooks"),
    max: 1200,
  },
]);
const fieldOf = (id) => COBUILD_FIELDS.find((row) => row.id === id) ?? null;
export function seedCobuild() {
  return { sessions: {} };
}
export function normalizeCobuild(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Future co-build data");
  return { sessions: isObject(slice?.sessions) ? slice.sessions : {} };
}
export const cobuildOf = (state) => state?.ext?.[COBUILD_ID] ?? null;
function mutableCobuild(state) {
  state.ext ??= {};
  state.ext[COBUILD_ID] = normalizeCobuild(state.ext[COBUILD_ID]);
  return state.ext[COBUILD_ID];
}
function checkValue(field, value) {
  const def = fieldOf(field);
  if (!def) throw Error("Unknown co-build field " + field);
  const text = String(value ?? "");
  if (def.kind === "select" && text && !def.options().some((o) => o.id === text))
    throw refuse("Valore non disponibile.", "Value not available.");
  if (def.max && text.length > def.max)
    throw refuse(`Massimo ${def.max} caratteri.`, `At most ${def.max} characters.`);
  return text;
}
function session(state, id, role) {
  const row = cobuildOf(state)?.sessions?.[id];
  if (!row || !row.members.includes(role))
    throw refuse(
      "Questa bozza condivisa non è disponibile per te.",
      "This shared draft is not available to you.",
      "cobuild-private",
    );
  return row;
}
/** Shared drafts of this identity; closed ones (read-only, with their history) on request. */
export function cobuildSessions(state, role, { includeClosed = false } = {}) {
  return Object.values(cobuildOf(state)?.sessions ?? {})
    .filter((row) => row.members.includes(role) && (includeClosed || row.status !== "closed"))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
/** Starts co-building from one of the owner's drafts: the DM joins with an explicit disclosure. */
export function startCobuild(state, role, { id, draftId = null, now = Date.now() }) {
  if (!["player", "dm"].includes(role)) throw Error("Unknown identity");
  const draft = draftId ? ownDraft(state, draftId, role) : null;
  const data = draft?.data ?? {};
  const fields = {};
  const start = {
    name: data.identity?.name ?? "",
    classId: data.classes?.[0]?.classId ?? "",
    speciesId: data.origin?.speciesId ?? "",
    backgroundId: data.origin?.backgroundId ?? "",
    concept: "",
    description: data.story?.description ?? "",
    backstory: data.story?.backstory ?? "",
    hooks: "",
  };
  for (const def of COBUILD_FIELDS)
    fields[def.id] = { value: checkValue(def.id, start[def.id]), rev: 0, by: role, at: iso(now) };
  const slice = mutableCobuild(state);
  if (slice.sessions[id]) throw refuse("Esiste già.", "Already exists.");
  slice.sessions[id] = {
    id,
    owner: role,
    members: [role, other(role)],
    draftId,
    status: "open",
    createdAt: iso(now),
    updatedAt: iso(now),
    fields,
    history: [],
    local: { player: {}, dm: {} },
    conflicts: { player: [], dm: [] },
    seen: { [role]: 0, [other(role)]: 0 },
  };
  return slice.sessions[id];
}
/** What one identity sees: values, its own unpublished edits, the other's presence only. */
export function cobuildView(state, id, role) {
  const row = session(state, id, role);
  const mine = row.local?.[role] ?? {};
  const theirs = row.local?.[other(role)] ?? {};
  return {
    id: row.id,
    owner: row.owner,
    isOwner: row.owner === role,
    other: other(role),
    draftId: row.draftId,
    status: row.status,
    fields: COBUILD_FIELDS.map((def) => ({
      ...def,
      value: row.fields[def.id]?.value ?? "",
      rev: row.fields[def.id]?.rev ?? 0,
      by: row.fields[def.id]?.by ?? null,
      at: row.fields[def.id]?.at ?? null,
      mine: mine[def.id] ?? null,
      stale: Boolean(mine[def.id] && mine[def.id].baseRev !== (row.fields[def.id]?.rev ?? 0)),
      presence: theirs[def.id] ? { role: other(role), at: theirs[def.id].at } : null,
    })),
    conflicts: copy(row.conflicts?.[role] ?? []),
    history: copy(row.history).reverse(),
    unseen: row.history.filter((h) => h.by !== role).length - (row.seen?.[role] ?? 0),
    opened: row.owner === role || Boolean(row.opened?.[role]),
    pending: Object.keys(mine).length,
  };
}
export function editLocal(state, id, role, field, value, now = Date.now()) {
  const row = session(state, id, role);
  if (row.status !== "open")
    throw refuse("La bozza condivisa è chiusa.", "The shared draft is closed.");
  const text = checkValue(field, value);
  row.local[role] ??= {};
  if (text === row.fields[field].value && !row.conflicts[role]?.some((c) => c.field === field)) {
    delete row.local[role][field];
    return null;
  }
  const previous = row.local[role][field];
  row.local[role][field] = {
    value: text,
    baseRev: previous?.baseRev ?? row.fields[field].rev,
    at: iso(now),
  };
  return row.local[role][field];
}
export function discardLocal(state, id, role, field) {
  const row = session(state, id, role);
  delete row.local[role]?.[field];
  row.conflicts[role] = (row.conflicts[role] ?? []).filter((c) => c.field !== field);
}
function commitField(row, field, value, role, now, kind = "edit") {
  const previous = row.fields[field];
  row.fields[field] = { value, rev: previous.rev + 1, by: role, at: iso(now) };
  row.history.push({
    id: `${field}:${previous.rev + 1}:${now.toString(36)}`,
    field,
    value,
    previous: previous.value,
    rev: previous.rev + 1,
    by: role,
    at: iso(now),
    kind,
  });
  row.updatedAt = iso(now);
}
/** Publishes this identity's edits; an edit made on an older revision becomes a conflict. */
export function publish(state, id, role, now = Date.now()) {
  const row = session(state, id, role);
  if (row.status !== "open")
    throw refuse("La bozza condivisa è chiusa.", "The shared draft is closed.");
  const published = [],
    conflicts = [];
  for (const [field, edit] of Object.entries(row.local[role] ?? {})) {
    if (row.conflicts[role]?.some((c) => c.field === field)) {
      conflicts.push(field);
      continue;
    }
    if (edit.baseRev === row.fields[field].rev) {
      commitField(row, field, edit.value, role, now);
      delete row.local[role][field];
      published.push(field);
    } else {
      row.conflicts[role].push({
        field,
        mine: edit.value,
        theirs: row.fields[field].value,
        theirsRev: row.fields[field].rev,
        theirsBy: row.fields[field].by,
        at: iso(now),
      });
      conflicts.push(field);
    }
  }
  if (!published.length && !conflicts.length)
    throw refuse("Nessuna modifica da pubblicare.", "No change to publish.");
  return { published, conflicts };
}
/** Explicit resolution: keep mine (a new revision on top of theirs) or take theirs. */
export function resolveConflict(state, id, role, field, keep, now = Date.now()) {
  const row = session(state, id, role);
  const conflict = row.conflicts[role]?.find((c) => c.field === field);
  if (!conflict) throw refuse("Nessun conflitto su questo campo.", "No conflict on this field.");
  if (!["mine", "theirs"].includes(keep)) throw Error("Unknown resolution");
  if (keep === "mine")
    commitField(row, field, row.local[role][field]?.value ?? conflict.mine, role, now, "kept-mine");
  delete row.local[role][field];
  row.conflicts[role] = row.conflicts[role].filter((c) => c.field !== field);
  return row.fields[field];
}
/** Restores an earlier value as a new revision (a correction, never a rewrite of history). */
export function restoreValue(state, id, role, historyId, now = Date.now()) {
  const row = session(state, id, role);
  const entry = row.history.find((h) => h.id === historyId);
  if (!entry) throw refuse("Versione non trovata.", "Version not found.");
  if (row.fields[entry.field].value === entry.previous)
    throw refuse("Il campo ha già quel valore.", "The field already has that value.");
  commitField(row, entry.field, entry.previous, role, now, "restore");
  return row.fields[entry.field];
}
export function markSeen(state, id, role) {
  const row = session(state, id, role);
  row.seen ??= {};
  row.seen[role] = row.history.filter((h) => h.by !== role).length;
  row.opened ??= {};
  row.opened[role] = true;
}
/** The owner brings the agreed fields into their own builder draft (still a private draft). */
export function transferToDraft(state, id, role, { draftId, now = Date.now() }) {
  const row = session(state, id, role);
  if (row.owner !== role)
    throw refuse(
      "Solo chi ha avviato la bozza la porta nel proprio builder.",
      "Only whoever started the draft brings it into their builder.",
    );
  if (Object.keys(row.local[role] ?? {}).length || row.conflicts[role]?.length)
    throw refuse(
      "Pubblica o scarta prima le tue modifiche in sospeso.",
      "Publish or discard your pending edits first.",
    );
  const value = (field) => row.fields[field]?.value ?? "";
  let target = (state.characterDrafts ?? []).find(
    (d) => d.id === row.draftId && d.owner === role && d.status === "active",
  );
  if (!target) {
    createCharacterDraft(state, { id: draftId, kind: "create" }, role);
    target = state.characterDrafts.find((d) => d.id === draftId);
  }
  const data = copy(target.data);
  data.identity = { ...data.identity, name: value("name") };
  if (value("classId") && !(data.classes ?? []).some((c) => c.classId === value("classId")))
    data.classes = [{ classId: value("classId"), level: 1, subclassId: null }];
  data.origin = {
    ...data.origin,
    ...(value("speciesId") ? { speciesId: value("speciesId") } : {}),
    ...(value("backgroundId") ? { backgroundId: value("backgroundId") } : {}),
  };
  data.story = { description: value("description"), backstory: value("backstory") };
  saveCharacterDraft(state, target.id, { data }, role);
  row.draftId = target.id;
  row.transferredAt = iso(now);
  row.updatedAt = iso(now);
  return target.id;
}
export function closeCobuild(state, id, role, now = Date.now()) {
  const row = session(state, id, role);
  if (row.owner !== role)
    throw refuse("Solo chi l’ha avviata può chiuderla.", "Only whoever started it can close it.");
  row.status = "closed";
  row.updatedAt = iso(now);
}
