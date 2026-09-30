// Compendium data and pure functions for B16 (Library: compendium, reader, glossary and
// attribution). Everything here derives from the verified SRD 5.2.1 sample in
// srd-sample.mjs and the class catalogue in character-rules.mjs: no rules text is
// copied, no new rule is invented. App-authored parts (chapter grouping, chapter intros,
// term inflections used to find glossary words in summaries) are labelled as such.
// No state, no DOM.

import * as srd from "./srd-sample.mjs";
import {
  classes as RULE_CLASSES,
  skills as RULE_SKILLS,
  SPELL_PROGRESSION,
  calculateSpellSlots,
} from "./character-rules.mjs";

const text = (it, en) => ({ it, en });
const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
};
const pick = (value, lang) =>
  value && typeof value === "object" ? value[lang] || value.it || value.en || "" : value || "";
const unique = (values) => [...new Set(values)];

export const EDITION = "2024";
export const REVISION = "5.2.1";
export { SRD_ATTRIBUTION, SRD_DOCUMENTS, SRD_LICENSE, SUMMARY_POLICY } from "./srd-sample.mjs";

// ---------------------------------------------------------------- classes as entries

// Classes join the browser as entries (dnd5e Compendium Browser "Classes" tab, FVT-170).
// Their Italian page numbers come from LABEL_SOURCES.spellClass where the SRD sample
// verified them; classes without a verified Italian page keep only the English page.
const CLASS_IT_PAGES = Object.fromEntries(
  Object.keys(srd.LABELS.spellClass).map((id, index) => [
    id,
    srd.LABEL_SOURCES.spellClass.it.pages[index],
  ]),
);
const CLASS_ENTRIES = RULE_CLASSES.map((c) => {
  const en = c.source.pages;
  const it = CLASS_IT_PAGES[c.id] ? [CLASS_IT_PAGES[c.id]] : [];
  const source = srd.srdSource(en, it);
  return {
    id: `srd2024:class:${c.id}`,
    kind: "class",
    slug: c.id,
    classId: c.id,
    name: c.name,
    translation: { it: "official" },
    caster: c.caster,
    hitDie: c.hitDie,
    summary: text(
      `Dado Vita d${c.hitDie}; caratteristica primaria ${c.primaryAbilities.map((a) => srd.LABELS.ability[a].it).join(" e ")}.`,
      `Hit Die d${c.hitDie}; primary ability ${c.primaryAbilities.map((a) => srd.LABELS.ability[a].en).join(" and ")}.`,
    ),
    tags: ["class", c.caster],
    source,
    itPageVerified: it.length > 0,
    aliases: [],
  };
});

const ALL = [...srd.ALL_ENTRIES, ...CLASS_ENTRIES];
const BY_ID = new Map(ALL.map((entry) => [entry.id, entry]));
export function getEntry(id) {
  return BY_ID.get(id) ?? srd.getById(id) ?? null;
}

// ---------------------------------------------------------------- categories and facets

export const CATEGORIES = freeze([
  { id: "spells", kind: "spell", label: text("Incantesimi", "Spells") },
  { id: "creatures", kind: "creature", label: text("Creature", "Creatures") },
  { id: "items", kind: "item", label: text("Oggetti", "Items") },
  { id: "rules", kind: "rule", label: text("Regole", "Rules") },
  { id: "conditions", kind: "condition", label: text("Condizioni", "Conditions") },
  { id: "classes", kind: "class", label: text("Classi", "Classes") },
]);
const NOUNS = {
  spells: [text("incantesimo", "spell"), text("incantesimi", "spells")],
  creatures: [text("creatura", "creature"), text("creature", "creatures")],
  items: [text("oggetto", "item"), text("oggetti", "items")],
  rules: [text("regola", "rule"), text("regole", "rules")],
  conditions: [text("condizione", "condition"), text("condizioni", "conditions")],
  classes: [text("classe", "class"), text("classi", "classes")],
};
export function categoryOf(entry) {
  return CATEGORIES.find((c) => c.kind === entry?.kind)?.id ?? null;
}
export function countLabel(categoryId, count, lang = "it") {
  const [one, many] = NOUNS[categoryId] ?? [text("voce", "entry"), text("voci", "entries")];
  return `${count} ${pick(count === 1 ? one : many, lang)}`;
}
export function categoryEntries(categoryId) {
  const kind = CATEGORIES.find((c) => c.id === categoryId)?.kind;
  return kind ? ALL.filter((entry) => entry.kind === kind) : [];
}

const yesNo = (yes, no) => ({ yes, no });
const CASTING = {
  action: text("1 azione", "1 action"),
  "bonus-action": text("1 azione bonus", "1 bonus action"),
  reaction: text("1 reazione", "1 reaction"),
  hour: text("1 ora", "1 hour"),
};
const RULE_TYPES = {
  action: text("Azione", "Action"),
  "area-of-effect": text("Area di effetto", "Area of effect"),
  general: text("Regola generale", "General rule"),
};
const CASTER_TYPES = {
  full: text("Incantatore completo", "Full caster"),
  half: text("Mezzo incantatore", "Half caster"),
  pact: text("Magia del patto", "Pact Magic"),
  none: text("Senza incantesimi", "No spellcasting"),
};
const rarities = (entry) =>
  entry.magic
    ? entry.magic.variants
      ? entry.magic.variants.map((v) => v.rarity)
      : [entry.magic.rarity]
    : [];

// Multi-select facets combine OR inside a facet and AND across facets, as D&D Beyond
// listings (DDB-162) and the dnd5e Compendium Browser (FVT-170) do. `cr` is a min/max
// range like D&D Beyond's monster listing and Kobold+ Fight Club (CMP-108).
const FACETS = {
  spells: [
    {
      id: "level",
      label: text("Livello", "Level"),
      values: (e) => [String(e.level)],
      option: (v) =>
        v === "0" ? text("Trucchetto", "Cantrip") : text(`Livello ${v}`, `Level ${v}`),
      order: (v) => Number(v),
    },
    {
      id: "school",
      label: text("Scuola", "School"),
      values: (e) => [e.school],
      option: (v) => srd.LABELS.school[v],
    },
    {
      id: "class",
      label: text("Classe", "Class"),
      values: (e) => e.classes,
      option: (v) => srd.LABELS.spellClass[v],
    },
    {
      id: "concentration",
      label: text("Concentrazione", "Concentration"),
      values: (e) => [e.concentration ? "yes" : "no"],
      option: (v) =>
        yesNo(
          text("Concentrazione", "Concentration"),
          text("Senza concentrazione", "No concentration"),
        )[v],
    },
    {
      id: "ritual",
      label: text("Rituale", "Ritual"),
      values: (e) => [e.ritual ? "yes" : "no"],
      option: (v) => yesNo(text("Rituale", "Ritual"), text("Non rituale", "Not a ritual"))[v],
    },
    {
      id: "casting",
      label: text("Tempo di lancio", "Casting time"),
      values: (e) => [e.castingTime.unit],
      option: (v) => CASTING[v] ?? text(v, v),
      order: (v) => Object.keys(CASTING).indexOf(v),
    },
    {
      id: "damage",
      label: text("Tipo di danno", "Damage type"),
      values: (e) => unique((e.damage ?? []).flatMap((d) => d.types ?? (d.type ? [d.type] : []))),
      option: (v) => srd.LABELS.damageType[v] ?? text(v, v),
    },
  ],
  creatures: [
    { id: "cr", kind: "range", label: text("Grado di sfida", "Challenge rating") },
    {
      id: "type",
      label: text("Tipo", "Type"),
      values: (e) => [e.type],
      option: (v) => srd.LABELS.creatureType[v],
    },
    {
      id: "size",
      label: text("Taglia", "Size"),
      values: (e) => e.size,
      option: (v) => srd.LABELS.size[v],
      order: (v) => Object.keys(srd.LABELS.size).indexOf(v),
    },
  ],
  items: [
    {
      id: "category",
      label: text("Categoria", "Category"),
      values: (e) => [e.category],
      option: (v) => srd.LABELS.itemCategory[v],
      order: (v) => Object.keys(srd.LABELS.itemCategory).indexOf(v),
    },
    {
      id: "rarity",
      label: text("Rarità", "Rarity"),
      values: rarities,
      option: (v) => srd.LABELS.rarity[v],
      order: (v) => Object.keys(srd.LABELS.rarity).indexOf(v),
    },
    {
      id: "attunement",
      label: text("Sintonia", "Attunement"),
      values: (e) => (e.magic ? [e.magic.attunement ? "yes" : "no"] : []),
      option: (v) =>
        yesNo(
          text("Richiede sintonia", "Requires attunement"),
          text("Senza sintonia", "No attunement"),
        )[v],
    },
  ],
  rules: [
    {
      id: "ruleType",
      label: text("Tipo di regola", "Rule type"),
      values: (e) => [e.tag ?? "general"],
      option: (v) => RULE_TYPES[v] ?? text(v, v),
    },
  ],
  conditions: [],
  classes: [
    {
      id: "caster",
      label: text("Incantesimi", "Spellcasting"),
      values: (e) => [e.caster],
      option: (v) => CASTER_TYPES[v],
      order: (v) => Object.keys(CASTER_TYPES).indexOf(v),
    },
  ],
};
export const CR_VALUES = freeze(srd.XP_BY_CR.map((row) => row.cr));
export function facetDefinitions(categoryId) {
  return FACETS[categoryId] ?? [];
}

// A filter is { q, facets: { <facetId>: [values] | { min, max } } }.
export function emptyFilter() {
  return { q: "", facets: {} };
}
function normalizedFilter(filter) {
  return {
    q: typeof filter?.q === "string" ? filter.q : "",
    facets: filter?.facets && typeof filter.facets === "object" ? filter.facets : {},
  };
}
function matchesText(entry, needle) {
  if (!needle) return true;
  const names = [
    entry.name.it,
    entry.name.en,
    ...(entry.altNames?.it ?? []),
    ...(entry.altNames?.en ?? []),
  ];
  return srd.normalizeSearchText(names.join(" \u0001 ")).includes(needle);
}
function matchesFacet(entry, facet, selection) {
  if (facet.kind === "range") {
    const min = selection?.min ? srd.crToNumber(selection.min) : null;
    const max = selection?.max ? srd.crToNumber(selection.max) : null;
    return (min == null || entry.crValue >= min) && (max == null || entry.crValue <= max);
  }
  if (!Array.isArray(selection) || !selection.length) return true;
  const values = facet.values(entry);
  return selection.some((value) => values.includes(value));
}
function sortKey(entry) {
  if (entry.kind === "spell") return entry.level;
  if (entry.kind === "creature") return entry.crValue;
  if (entry.kind === "item") return Object.keys(srd.LABELS.itemCategory).indexOf(entry.category);
  return 0;
}
function matching(categoryId, filter, skipFacet = null) {
  const f = normalizedFilter(filter);
  const needle = srd.normalizeSearchText(f.q);
  return categoryEntries(categoryId).filter(
    (entry) =>
      matchesText(entry, needle) &&
      facetDefinitions(categoryId).every(
        (facet) => facet.id === skipFacet || matchesFacet(entry, facet, f.facets[facet.id]),
      ),
  );
}
export function filterEntries(categoryId, filter = emptyFilter(), lang = "it") {
  return matching(categoryId, filter).sort(
    (a, b) => sortKey(a) - sortKey(b) || pick(a.name, lang).localeCompare(pick(b.name, lang), lang),
  );
}
// Options with counts: each count applies every other active facet (standard faceted
// navigation), so selecting a value never hides the alternatives of the same facet.
export function facetOptions(categoryId, filter = emptyFilter()) {
  const f = normalizedFilter(filter);
  return facetDefinitions(categoryId).map((facet) => {
    if (facet.kind === "range") {
      const present = new Set(categoryEntries(categoryId).map((e) => e.cr));
      return {
        id: facet.id,
        kind: "range",
        label: facet.label,
        values: CR_VALUES.filter((cr) => present.has(cr)),
        min: f.facets[facet.id]?.min ?? "",
        max: f.facets[facet.id]?.max ?? "",
      };
    }
    const base = matching(categoryId, f, facet.id);
    const all = unique(categoryEntries(categoryId).flatMap((e) => facet.values(e)));
    const selected = Array.isArray(f.facets[facet.id]) ? f.facets[facet.id] : [];
    const order = facet.order ?? ((v) => all.indexOf(v));
    return {
      id: facet.id,
      kind: "multi",
      label: facet.label,
      options: all
        .sort((a, b) => order(a) - order(b))
        .map((value) => ({
          value,
          label: facet.option(value),
          count: base.filter((e) => facet.values(e).includes(value)).length,
          selected: selected.includes(value),
        })),
    };
  });
}
export function toggleFacetValue(filter, facetId, value) {
  const f = normalizedFilter(structuredClone(filter ?? {}));
  const current = Array.isArray(f.facets[facetId]) ? f.facets[facetId] : [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  if (next.length) f.facets[facetId] = next;
  else delete f.facets[facetId];
  return f;
}
export function setRange(filter, facetId, bound, value) {
  const f = normalizedFilter(structuredClone(filter ?? {}));
  const range = { ...(f.facets[facetId] ?? {}) };
  if (value && CR_VALUES.includes(value)) range[bound] = value;
  else delete range[bound];
  if (range.min || range.max) f.facets[facetId] = range;
  else delete f.facets[facetId];
  return f;
}
// Removable chips for every active facet value (DDB-162 filter chips).
export function activeChips(categoryId, filter = emptyFilter()) {
  const f = normalizedFilter(filter);
  return facetDefinitions(categoryId).flatMap((facet) => {
    const selection = f.facets[facet.id];
    if (facet.kind === "range")
      return [
        ...(selection?.min
          ? [
              {
                facet: facet.id,
                value: "min",
                label: text(`GS ≥ ${selection.min}`, `CR ≥ ${selection.min}`),
              },
            ]
          : []),
        ...(selection?.max
          ? [
              {
                facet: facet.id,
                value: "max",
                label: text(`GS ≤ ${selection.max}`, `CR ≤ ${selection.max}`),
              },
            ]
          : []),
      ];
    return (Array.isArray(selection) ? selection : []).map((value) => ({
      facet: facet.id,
      value,
      label: facet.option(value),
    }));
  });
}
export function removeChip(categoryId, filter, facetId, value) {
  const facet = facetDefinitions(categoryId).find((entry) => entry.id === facetId);
  if (!facet) return normalizedFilter(filter);
  return facet.kind === "range"
    ? setRange(filter, facetId, value, "")
    : toggleFacetValue(filter, facetId, value);
}
// Short one-line description for listings (DDB list columns in a phone-friendly line).
export function entryMeta(entry, lang = "it") {
  const l = (value) => pick(value, lang);
  if (entry.kind === "spell")
    return [
      entry.level === 0
        ? l(text("Trucchetto", "Cantrip"))
        : l(text(`Livello ${entry.level}`, `Level ${entry.level}`)),
      l(srd.LABELS.school[entry.school]),
      l(CASTING[entry.castingTime.unit]),
      ...(entry.concentration ? [l(text("Concentrazione", "Concentration"))] : []),
      ...(entry.ritual ? [l(text("Rituale", "Ritual"))] : []),
    ].join(" · ");
  if (entry.kind === "creature")
    return [
      `${l(text("GS", "CR"))} ${entry.cr}`,
      l(srd.LABELS.creatureType[entry.type]),
      entry.size.map((s) => l(srd.LABELS.size[s])).join("/"),
    ].join(" · ");
  if (entry.kind === "item")
    return [
      l(srd.LABELS.itemCategory[entry.category]),
      ...rarities(entry).map((r) => l(srd.LABELS.rarity[r])),
      ...(entry.cost ? [srd.formatCost(entry.cost, lang)] : []),
    ].join(" · ");
  if (entry.kind === "rule") return l(RULE_TYPES[entry.tag ?? "general"]);
  if (entry.kind === "condition") return l(text("Condizione", "Condition"));
  if (entry.kind === "class") return `d${entry.hitDie} · ${l(CASTER_TYPES[entry.caster])}`;
  return "";
}
export function kindLabel(entry) {
  return (
    srd.LABELS.kind[entry?.kind] ??
    (entry?.kind === "class" ? text("Classe", "Class") : text("Voce", "Entry"))
  );
}

// ---------------------------------------------------------------- sources and editions

// Source line in the content language: document, page(s), edition, revision (BI-02,
// BI-06, BI-13; DDB-165 edition labels, R20-042 "2024" footer, SVC-128 per-language SRD).
export function sourceFor(entry, contentLang = "it") {
  const s = entry?.source;
  if (!s) return null;
  const doc = srd.SRD_DOCUMENTS[contentLang === "en" ? "en" : "it"];
  const side = s[contentLang === "en" ? "en" : "it"] ?? {};
  return {
    title: doc.title,
    edition: s.edition,
    revision: s.revision,
    pages: side.pages ?? [],
    url: side.url ?? doc.url,
    sha256: side.sha256 ?? doc.sha256,
    lang: contentLang === "en" ? "en" : "it",
  };
}
// The translation badge describes the text on screen: the official Italian translation
// only while the content is shown in Italian; in English, that it also exists in Italian.
export function translationLabel(entry, contentLang = "it") {
  const status = srd.translationStatus(entry);
  if (status !== "official")
    return text("Traduzione italiana non disponibile", "Italian translation unavailable");
  return contentLang === "en"
    ? text("Disponibile anche in italiano (SRD IT)", "Also available in Italian (IT SRD)")
    : text("Traduzione italiana ufficiale (SRD IT)", "Official Italian translation (IT SRD)");
}

// SRD reference tables that can be embedded in authored text (FVT-175 embeds tables too):
// the same tables the DM screen shows, with their SRD pages.
export const REFERENCE_TABLES = freeze([
  {
    id: "srd2024:table:xp-by-cr",
    name: text("PE per grado di sfida", "XP by Challenge Rating"),
    source: srd.XP_BY_CR_SOURCE,
  },
  {
    id: "srd2024:table:coins",
    name: text("Monete", "Coins"),
    source: srd.COINS[0].source,
  },
]);
export const referenceTable = (id) => REFERENCE_TABLES.find((table) => table.id === id) ?? null;
// Catalogue revision log (DDB-169 errata applied and logged). Only true facts: the
// documents in use and their hashes; no later official revision was imported.
export const CATALOG_REVISIONS = freeze([
  {
    id: "srd-5.2.1",
    revision: REVISION,
    edition: EDITION,
    date: "2026-09-24",
    documents: ["en", "it"],
    note: text(
      "Catalogo di esempio dal System Reference Document 5.2.1 (EN e IT). Nessuna revisione successiva è stata importata in questo prototipo.",
      "Sample catalogue from System Reference Document 5.2.1 (EN and IT). No later revision has been imported into this prototype.",
    ),
  },
]);

// ---------------------------------------------------------------- glossary terms

// Words that find glossary entries inside summaries (DDB tooltips DDB-166, dnd5e
// &Reference FVT-176). App-authored inflections of the official names; action names
// match only capitalised, as the 2024 SRD writes them ("the Disengage or Hide action").
const CONDITION_FORMS = {
  blinded: ["accecato accecata accecati accecate", "blinded"],
  charmed: ["affascinato affascinata affascinati affascinate", "charmed"],
  deafened: ["assordato assordata assordati assordate", "deafened"],
  exhaustion: ["indebolimento", "exhaustion"],
  frightened: ["spaventato spaventata spaventati spaventate", "frightened"],
  grappled: ["afferrato afferrata afferrati afferrate", "grappled"],
  incapacitated: ["incapacitato incapacitata incapacitati incapacitate", "incapacitated"],
  invisible: ["invisibile invisibili", "invisible"],
  paralyzed: ["paralizzato paralizzata paralizzati paralizzate", "paralyzed"],
  petrified: ["pietrificato pietrificata pietrificati pietrificate", "petrified"],
  poisoned: ["avvelenato avvelenata avvelenati avvelenate", "poisoned"],
  prone: ["prono prona proni prone", "prone"],
  restrained: ["trattenuto trattenuta trattenuti trattenute", "restrained"],
  stunned: ["stordito stordita storditi stordite", "stunned"],
  unconscious: ["privo di sensi|priva di sensi|privi di sensi", "unconscious"],
};
const RULE_FORMS = {
  advantage: ["vantaggio", "advantage"],
  disadvantage: ["svantaggio", "disadvantage"],
  "d20-test": ["prova con d20|prove con d20", "d20 test|d20 tests"],
  bloodied: ["sanguinante|sanguinanti", "bloodied"],
  concentration: ["concentrazione", "concentration"],
  "difficult-terrain": ["terreno difficile", "difficult terrain"],
  "opportunity-attacks": [
    "attacco di opportunità|attacchi di opportunità",
    "opportunity attack|opportunity attacks",
  ],
  "bonus-action": ["azione bonus|azioni bonus", "bonus action|bonus actions"],
  reaction: ["reazione|reazioni", "reaction|reactions"],
  "heroic-inspiration": ["ispirazione eroica", "heroic inspiration"],
  cover: ["copertura", "cover"],
  "critical-hit": ["colpo critico|colpi critici", "critical hit|critical hits"],
  "temporary-hit-points": [
    "punti ferita temporanei|PF temporanei",
    "temporary hit points|temporary HP",
  ],
  resistance: ["resistenza", "resistance"],
  vulnerability: ["vulnerabilità", "vulnerability"],
  immunity: ["immunità", "immunity"],
  "long-rest": ["riposo lungo|riposi lunghi", "long rest|long rests"],
  "short-rest": ["riposo breve|riposi brevi", "short rest|short rests"],
  initiative: ["iniziativa", "initiative"],
  "unarmed-strike": ["colpo senz'armi|colpi senz'armi|colpo senz’armi", "unarmed strike"],
  darkvision: ["scurovisione", "darkvision"],
  "passive-perception": ["percezione passiva", "passive perception"],
  "saving-throw": ["tiro salvezza|tiri salvezza", "saving throw|saving throws"],
  "hit-point-dice": ["dadi vita|dado vita", "hit point dice|hit dice"],
  emanation: ["emanazione", "emanation"],
};
// Case-sensitive forms (capitalised actions, the Italian "TS" abbreviation).
const CASED_FORMS = {
  dash: ["Scatto", "Dash"],
  disengage: ["Disimpegno", "Disengage"],
  dodge: ["Schivata", "Dodge"],
  hide: ["Nascondersi", "Hide"],
  "saving-throw": ["TS", ""],
};
const splitForms = (value) =>
  value ? (value.includes("|") ? value.split("|") : value.split(" ").filter(Boolean)) : [];
function buildTerms() {
  const rows = [];
  const add = (id, forms, lang, cased) => {
    for (const form of forms) if (form) rows.push({ id, form, lang, cased });
  };
  for (const [slug, [it, en]] of Object.entries(CONDITION_FORMS)) {
    add(`srd2024:condition:${slug}`, splitForms(it), "it", false);
    add(`srd2024:condition:${slug}`, splitForms(en), "en", false);
  }
  for (const [slug, [it, en]] of Object.entries(RULE_FORMS)) {
    add(`srd2024:rule:${slug}`, it.split("|"), "it", false);
    add(`srd2024:rule:${slug}`, en.split("|"), "en", false);
  }
  for (const [slug, [it, en]] of Object.entries(CASED_FORMS)) {
    add(`srd2024:rule:${slug}`, [it], "it", true);
    add(`srd2024:rule:${slug}`, [en], "en", true);
  }
  for (const row of rows) if (!getEntry(row.id)) throw new Error(`Unknown glossary term ${row.id}`);
  return rows;
}
export const TERMS = freeze(buildTerms());
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TERM_PATTERNS = {};
for (const lang of ["it", "en"]) {
  const pattern = (cased) => {
    const forms = TERMS.filter((t) => t.lang === lang && t.cased === cased)
      .map((t) => t.form)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex);
    return new RegExp(
      `(?<![\\p{L}\\p{N}])(${forms.join("|")})(?![\\p{L}\\p{N}])`,
      cased ? "gu" : "giu",
    );
  };
  TERM_PATTERNS[lang] = { plain: pattern(false), cased: pattern(true) };
}
function termFor(match, lang, cased) {
  const lower = match.toLocaleLowerCase(lang);
  return TERMS.find(
    (t) =>
      t.lang === lang &&
      t.cased === cased &&
      (cased ? t.form === match : t.form.toLocaleLowerCase(lang) === lower),
  )?.id;
}
// Splits text into plain and term segments. Each term links once per text, never to an
// excluded entry (the entry being read or an open ancestor tooltip).
export function linkTerms(value, lang = "it", { exclude = [] } = {}) {
  const source = String(value ?? "");
  const l = lang === "en" ? "en" : "it";
  const found = [];
  for (const cased of [false, true]) {
    const re = TERM_PATTERNS[l][cased ? "cased" : "plain"];
    re.lastIndex = 0;
    for (const m of source.matchAll(re)) {
      const id = termFor(m[0], l, cased);
      if (id) found.push({ start: m.index, end: m.index + m[0].length, id });
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const used = new Set(exclude);
  const segments = [];
  let cursor = 0;
  for (const hit of found) {
    if (hit.start < cursor || used.has(hit.id)) continue;
    used.add(hit.id);
    if (hit.start > cursor) segments.push({ text: source.slice(cursor, hit.start) });
    segments.push({ text: source.slice(hit.start, hit.end), term: hit.id });
    cursor = hit.end;
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor) });
  return segments;
}

// ---------------------------------------------------------------- reader

// Reading order of the rules glossary, grouped by the app (the SRD glossary itself is
// alphabetical). Each section is one glossary entry with its own SRD pages.
export const READER_CHAPTERS = freeze(
  [
    [
      "actions",
      text("Azioni", "Actions"),
      text(
        "Le dodici azioni che ogni creatura può compiere nel proprio turno.",
        "The twelve actions any creature can take on its turn.",
      ),
      "attack dash disengage dodge help hide influence magic ready search study utilize",
    ],
    [
      "d20",
      text("Prove con d20", "D20 Tests"),
      text(
        "Come si tirano e si modificano prove, attacchi e tiri salvezza.",
        "How checks, attacks and saving throws are rolled and modified.",
      ),
      "d20-test advantage disadvantage proficiency saving-throw heroic-inspiration",
    ],
    [
      "combat",
      text("Combattimento", "Combat"),
      text(
        "Ordine dei turni, azioni speciali, copertura e colpi critici.",
        "Turn order, special actions, cover and critical hits.",
      ),
      "initiative surprise bonus-action reaction opportunity-attacks cover critical-hit unarmed-strike difficult-terrain concentration emanation",
    ],
    [
      "health",
      text("Danni e salute", "Damage and health"),
      text(
        "Punti ferita, resistenze e come si recuperano.",
        "Hit points, resistances and how they are recovered.",
      ),
      "bloodied temporary-hit-points resistance vulnerability immunity hit-point-dice",
    ],
    [
      "rest-senses",
      text("Riposo e sensi", "Resting and senses"),
      text(
        "Riposi brevi e lunghi, vista e percezione.",
        "Short and long rests, sight and perception.",
      ),
      "short-rest long-rest darkvision passive-perception",
    ],
    [
      "conditions",
      text("Condizioni", "Conditions"),
      text(
        "Le quindici condizioni del glossario 2024.",
        "The fifteen conditions of the 2024 glossary.",
      ),
      null,
    ],
  ].map(([id, title, intro, slugs]) => ({
    id,
    title,
    intro,
    entries: slugs
      ? slugs.split(" ").map((slug) => `srd2024:rule:${slug}`)
      : srd.CONDITION_INDEX.map((entry) => entry.id),
  })),
);
for (const chapter of READER_CHAPTERS)
  for (const id of chapter.entries)
    if (!getEntry(id)) throw new Error(`Reader section ${id} is not in the catalogue`);
export function readerChapter(id) {
  return READER_CHAPTERS.find((chapter) => chapter.id === id) ?? null;
}
export function readerNeighbors(id) {
  const index = READER_CHAPTERS.findIndex((chapter) => chapter.id === id);
  return {
    previous: index > 0 ? READER_CHAPTERS[index - 1] : null,
    next: index >= 0 && index < READER_CHAPTERS.length - 1 ? READER_CHAPTERS[index + 1] : null,
  };
}
export function chapterOfEntry(entryId) {
  return READER_CHAPTERS.find((chapter) => chapter.entries.includes(entryId)) ?? null;
}

// ---------------------------------------------------------------- class pages

const pbForLevel = (level) => 2 + Math.floor((level - 1) / 4);
// Official Italian names of the level-1 class features, read from the "Livello 1: …"
// headings of each class in IT_SRD_CC_v5.2.1.pdf (the class catalogue in
// character-rules.mjs keeps the English names only). A name missing here is shown with
// an explicit "EN name" mark instead of an invented translation.
export const FEATURE_NAMES_IT = freeze({
  Rage: "Ira",
  "Unarmored Defense": "Difesa senza armatura",
  "Weapon Mastery": "Padronanza d’armi",
  "Bardic Inspiration": "Ispirazione bardica",
  Spellcasting: "Incantesimi",
  "Divine Order": "Ordine divino",
  Druidic: "Druidico",
  "Primal Order": "Ordine primordiale",
  "Fighting Style": "Stile di combattimento",
  "Second Wind": "Recuperare energie",
  "Martial Arts": "Arti marziali",
  "Lay On Hands": "Imposizione delle mani",
  "Favored Enemy": "Nemico prescelto",
  Expertise: "Maestria",
  "Sneak Attack": "Attacco furtivo",
  "Thieves’ Cant": "Gergo ladresco",
  "Innate Sorcery": "Stregoneria innata",
  "Eldritch Invocations": "Suppliche occulte",
  "Pact Magic": "Magia del patto",
  "Ritual Adept": "Adepto dei rituali",
  "Arcane Recovery": "Recupero arcano",
});
function featureName(name) {
  const en = pick(name, "en");
  const it = FEATURE_NAMES_IT[en];
  return { it: it ?? en, en, itVerified: Boolean(it) };
}
// BI-09 (dnd5e Class Summary): the Class Features column of each class table, levels 1–20,
// as printed in SRD_CC_v5.2.1.pdf (EN) and IT_SRD_CC_v5.2.1.pdf (IT); an empty string is a
// level with no new feature ("—"). Two IT cells follow the class's own level heading where
// the IT table differs from it: cleric 20 («Intervento divino superiore», the table cell
// is cut) and rogue 20 («Colpo di fortuna», the table cell reads «Pietra della buona
// fortuna»). Line-break hyphens of the PDF text are removed.
export const CLASS_FEATURE_TABLE = freeze({
  barbarian: [
    ["Rage, Unarmored Defense, Weapon Mastery","Difesa senza armatura, Ira, Padronanza d'armi"],
    ["Danger Sense, Reckless Attack","Attacco irruento, Percezione del pericolo"],
    ["Barbarian Subclass, Primal Knowledge","Conoscenza primordiale, sottoclasse del barbaro"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Extra Attack, Fast Movement","Attacco extra, Movimento veloce"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Feral Instinct, Instinctive Pounce","Balzo istintivo, Istinto ferino"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Brutal Strike","Colpo brutale"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Relentless Rage","Ira implacabile"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Improved Brutal Strike","Colpo brutale migliorato"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Persistent Rage","Ira persistente"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Improved Brutal Strike","Colpo brutale migliorato"],
    ["Indomitable Might","Potenza indomabile"],
    ["Epic Boon","Dono epico"],
    ["Primal Champion","Campione primordiale"],
  ],
  bard: [
    ["Bardic Inspiration, Spellcasting","Incantesimi, Ispirazione bardica"],
    ["Expertise, Jack of All Trades","Maestria, Factotum"],
    ["Bard Subclass","Sottoclasse del bardo"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Font of Inspiration","Fonte di ispirazione"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Countercharm","Controfascino"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Expertise","Maestria"],
    ["Magical Secrets","Segreti magici"],
    ["",""],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["",""],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Superior Inspiration","Ispirazione superiore"],
    ["Epic Boon","Dono epico"],
    ["Words of Creation","Parole della creazione"],
  ],
  cleric: [
    ["Spellcasting, Divine Order","Incantesimi, Ordine divino"],
    ["Channel Divinity","Incanalare divinità"],
    ["Cleric Subclass","Sottoclasse del chierico"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Sear Undead","Bruciare i non morti"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Blessed Strikes","Colpi benedetti"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Divine Intervention","Intervento divino"],
    ["",""],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Improved Blessed Strikes","Colpi benedetti migliorati"],
    ["",""],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["",""],
    ["Epic Boon","Dono epico"],
    ["Greater Divine Intervention","Intervento divino superiore"],
  ],
  druid: [
    ["Spellcasting, Druidic, Primal Order","Druidico, Incantesimi e Ordine primordiale"],
    ["Wild Shape, Wild Companion","Compagno selvatico, Forma selvatica"],
    ["Druid Subclass","Sottoclasse del druido"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Wild Resurgence","Rinascita selvatica"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Elemental Fury","Furia elementale"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["",""],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Improved Elemental Fury","Furia elementale migliorata"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Beast Spells","Incantesimi bestiali"],
    ["Epic Boon","Dono epico"],
    ["Archdruid","Arcidruido"],
  ],
  fighter: [
    ["Fighting Style, Second Wind, Weapon Mastery","Padronanza d'armi, Recuperare energie e Stile di combattimento"],
    ["Action Surge (one use), Tactical Mind","Azione impetuosa (un utilizzo), Mente tattica"],
    ["Fighter Subclass","Sottoclasse del guerriero"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Extra Attack, Tactical Shift","Attacco extra, Spostamento tattico"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Indomitable (one use), Tactical Master","Indomabile (un utilizzo), Signore delle tattiche"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Two Extra Attacks","Due attacchi extra"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Indomitable (two uses), Studied Attacks","Attacchi studiati, Indomabile (due utilizzi)"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Action Surge (two uses), Indomitable (three uses)","Azione impetuosa (due utilizzi), Indomabile (tre utilizzi)"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Epic Boon","Dono epico"],
    ["Three Extra Attacks","Tre attacchi extra"],
  ],
  monk: [
    ["Martial Arts, Unarmored Defense","Arti marziali, Difesa senza armatura"],
    ["Monk’s Focus, Unarmored Movement, Uncanny Metabolism","Concentrazione da monaco, Metabolismo straordinario, Movimento senza armatura"],
    ["Deflect Attacks, Monk Subclass","Devia attacchi, sottoclasse del monaco"],
    ["Ability Score Improvement, Slow Fall","Aumento dei punteggi di caratteristica, Caduta lenta"],
    ["Extra Attack, Stunning Strike","Attacco extra, Colpo stordente"],
    ["Empowered Strikes, Subclass feature","Colpi potenziati, privilegio della sottoclasse"],
    ["Evasion","Elusione"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Acrobatic Movement","Movimento acrobatico"],
    ["Heightened Focus, Self-Restoration","Autorigenerazione, Concentrazione superiore"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Deflect Energy","Deviare energia"],
    ["Disciplined Survivor","Esperto di sopravvivenza disciplinato"],
    ["Perfect Focus","Concentrazione perfetta"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Superior Defense","Difesa superiore"],
    ["Epic Boon","Dono epico"],
    ["Body and Mind","Corpo e mente"],
  ],
  paladin: [
    ["Lay On Hands, Spellcasting, Weapon Mastery","Imposizione delle mani, Incantesimi, Padronanza d'armi"],
    ["Fighting Style, Paladin’s Smite","Stile di combattimento, Punizione del paladino"],
    ["Channel Divinity, Paladin Subclass","Incanalare divinità, sottoclasse del paladino"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Extra Attack, Faithful Steed","Attacco extra, Fido destriero"],
    ["Aura of Protection","Aura di protezione"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Abjure Foes","Abiurare nemici"],
    ["Aura of Courage","Aura di coraggio"],
    ["Radiant Strikes","Colpi radiosi"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Restoring Touch","Tocco rigenerante"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Aura Expansion","Ampliamento dell'aura"],
    ["Epic Boon","Dono epico"],
    ["Subclass feature","Privilegio della sottoclasse"],
  ],
  ranger: [
    ["Spellcasting, Favored Enemy, Weapon Mastery","Incantesimi, Nemico prescelto, Padronanza d'armi"],
    ["Deft Explorer, Fighting Style","Esploratore esperto, Stile di combattimento"],
    ["Ranger Subclass","Sottoclasse del ranger"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Extra Attack","Attacco extra"],
    ["Roving","Girovago"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Expertise","Maestria"],
    ["Tireless","Instancabile"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Relentless Hunter","Cacciatore implacabile"],
    ["Nature’s Veil","Velo della natura"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Precise Hunter","Precisione del cacciatore"],
    ["Feral Senses","Sensi ferini"],
    ["Epic Boon","Dono epico"],
    ["Foe Slayer","Sterminatore di nemici"],
  ],
  rogue: [
    ["Expertise, Sneak Attack, Thieves’ Cant, Weapon Mastery","Maestria, Attacco furtivo, Gergo ladresco, Padronanza d'armi"],
    ["Cunning Action","Azione scaltra"],
    ["Rogue Subclass, Steady Aim","Sottoclasse del ladro, Mira ferma"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Cunning Strike, Uncanny Dodge","Colpo astuto, Schivata prodigiosa"],
    ["Expertise","Maestria"],
    ["Evasion, Reliable Talent","Elusione, Dote affidabile"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Improved Cunning Strike","Colpo astuto migliorato"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Devious Strikes","Colpi infidi"],
    ["Slippery Mind","Mente sfuggente"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Elusive","Inafferrabile"],
    ["Epic Boon","Dono epico"],
    ["Stroke of Luck","Colpo di fortuna"],
  ],
  sorcerer: [
    ["Spellcasting, Innate Sorcery","Incantesimi, Stregoneria innata"],
    ["Font of Magic, Metamagic","Fonte di magia, Metamagia"],
    ["Sorcerer Subclass","Sottoclasse dello stregone"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Sorcerous Restoration","Ripristino stregonesco"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Sorcery Incarnate","Stregoneria incarnata"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Metamagic","Metamagia"],
    ["",""],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["",""],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Metamagic","Metamagia"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Epic Boon","Dono epico"],
    ["Arcane Apotheosis","Apoteosi arcana"],
  ],
  warlock: [
    ["Eldritch Invocations, Pact Magic","Suppliche occulte, Magia del patto"],
    ["Magical Cunning","Scaltrezza magica"],
    ["Warlock Subclass","Sottoclasse del warlock"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["",""],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Contact Patron","Contatta patrono"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Mystic Arcanum (level 6 spell)","Arcanum mistico (incantesimo di 6º livello)"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Mystic Arcanum (level 7 spell)","Arcanum mistico (incantesimo di 7º livello)"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["Mystic Arcanum (level 8 spell)","Arcanum mistico (incantesimo di 8º livello)"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Mystic Arcanum (level 9 spell)","Arcanum mistico (incantesimo di 9º livello)"],
    ["",""],
    ["Epic Boon","Dono epico"],
    ["Eldritch Master","Maestro dell'occulto"],
  ],
  wizard: [
    ["Spellcasting, Ritual Adept, Arcane Recovery","Incantesimi, Adepto dei rituali, Recupero arcano"],
    ["Scholar","Studioso"],
    ["Wizard Subclass","Sottoclasse del mago"],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["Memorize Spell","Memorizzare incantesimi"],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["",""],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["",""],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Subclass feature","Privilegio della sottoclasse"],
    ["",""],
    ["Ability Score Improvement","Aumento dei punteggi di caratteristica"],
    ["",""],
    ["Spell Mastery","Maestria negli incantesimi"],
    ["Epic Boon","Dono epico"],
    ["Signature Spells","Incantesimi personali"],
  ],
});
// Class summary page (dnd5e Class Summary page, FVT-173): the level table is built from
// the verified class catalogue (level 1) and the SRD class tables above (levels 2–20).
export function classSummary(classId) {
  const c = RULE_CLASSES.find((entry) => entry.id === classId);
  if (!c) return null;
  const progression = SPELL_PROGRESSION[classId] ?? null;
  const levels = Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    const slots = c.caster === "none" ? null : calculateSpellSlots([{ classId, level }]);
    return {
      level,
      proficiencyBonus: pbForLevel(level),
      features:
        level === 1
          ? c.features.map((f) => featureName(f.name))
          : CLASS_FEATURE_TABLE[classId]?.[i]?.[0]
            ? [
                {
                  en: CLASS_FEATURE_TABLE[classId][i][0],
                  it: CLASS_FEATURE_TABLE[classId][i][1],
                  itVerified: true,
                },
              ]
            : [],
      cantrips: progression ? progression.cantrips[i] : null,
      prepared: progression ? progression.prepared[i] : null,
      spellSlots: slots && c.caster !== "pact" ? slots.spellSlots : null,
      pactSlots: slots?.pactSlots
        ? { level: slots.pactSlots.level, max: slots.pactSlots.max }
        : null,
    };
  });
  return {
    id: classId,
    entryId: `srd2024:class:${classId}`,
    name: c.name,
    hitDie: c.hitDie,
    caster: c.caster,
    primaryAbilities: c.primaryAbilities.map((a) => srd.LABELS.ability[a]),
    savingThrows: c.savingThrows.map((a) => srd.LABELS.ability[a]),
    skillCount: c.skillCount,
    skills: c.skills.map((id) => {
      const skill = RULE_SKILLS.find((s) => s.id === id);
      return skill ? skill.name : text(id, id);
    }),
    spellcastingAbility: c.spellcastingAbility ? srd.LABELS.ability[c.spellcastingAbility] : null,
    levels,
    // Paladins and Rangers prepare spells but learn no cantrips: a column that stays 0 at
    // every level is not shown (their SRD class tables have no such column either).
    hasCantrips: levels.some((row) => row.cantrips > 0),
    hasPrepared: levels.some((row) => row.prepared != null),
    maxSlotLevel: Math.max(0, ...levels.map((row) => Object.keys(row.spellSlots ?? {}).length)),
    source: getEntry(`srd2024:class:${classId}`).source,
    coverage: c.coverage,
  };
}
// Spell list page (dnd5e Spell List page, FVT-174): by level, school or alphabetically.
export function classSpellList(classId, groupBy = "level", lang = "it") {
  const spells = srd.SPELLS.filter((spell) => spell.classes.includes(classId)).sort(
    (a, b) => a.level - b.level || pick(a.name, lang).localeCompare(pick(b.name, lang), lang),
  );
  const keyOf =
    groupBy === "school"
      ? (s) => s.school
      : groupBy === "alpha"
        ? (s) => srd.normalizeSearchText(pick(s.name, lang))[0].toUpperCase()
        : (s) => String(s.level);
  const labelOf =
    groupBy === "school"
      ? (k) => srd.LABELS.school[k]
      : groupBy === "alpha"
        ? (k) => text(k, k)
        : (k) => (k === "0" ? text("Trucchetti", "Cantrips") : text(`Livello ${k}`, `Level ${k}`));
  const groups = new Map();
  for (const spell of spells) {
    const key = keyOf(spell);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(spell);
  }
  const keys = [...groups.keys()];
  if (groupBy !== "level")
    keys.sort((a, b) => pick(labelOf(a), lang).localeCompare(pick(labelOf(b), lang), lang));
  for (const key of keys)
    if (groupBy !== "level")
      groups.get(key).sort((a, b) => pick(a.name, lang).localeCompare(pick(b.name, lang), lang));
  return keys.map((key) => ({ key, label: labelOf(key), entries: groups.get(key) }));
}

// ---------------------------------------------------------------- stat blocks and dice

export const abilityModifier = (score) => Math.floor((Number(score) - 10) / 2);
export const signed = (value) => (value < 0 ? `−${Math.abs(value)}` : `+${value}`);
// "2d6+4", "1d4", "12d6", "1d6 - 1" -> { count, sides, modifier }.
export function parseDice(formula) {
  const m = /^\s*(\d{1,2})\s*d\s*(\d{1,3})\s*(?:([+\-−])\s*(\d{1,3}))?\s*$/i.exec(
    String(formula ?? ""),
  );
  if (!m) return null;
  const count = Number(m[1]),
    sides = Number(m[2]);
  if (count < 1 || count > 40 || ![4, 6, 8, 10, 12, 20, 100].includes(sides)) return null;
  const modifier = m[3] ? (m[3] === "+" ? 1 : -1) * Number(m[4]) : 0;
  return { count, sides, modifier };
}
// A roll plan lists every die to throw. d20 tests support Advantage/Disadvantage (two d20,
// keep one, 2024 D20 Test rules); a Critical Hit rolls the damage dice twice and adds
// the modifier once (2024 "Critical Hits", SRD EN p.179).
export function rollPlan(request) {
  if (request.kind === "d20") {
    const mode = ["advantage", "disadvantage"].includes(request.mode) ? request.mode : "normal";
    return {
      kind: "d20",
      mode,
      dice:
        mode === "normal"
          ? [{ sides: 20, group: 0 }]
          : [
              { sides: 20, group: 0 },
              { sides: 20, group: 0 },
            ],
      modifier: Number(request.bonus) || 0,
      groups: [{ id: 0, label: request.label ?? null }],
    };
  }
  const dice = [],
    groups = [];
  let modifier = 0;
  (request.terms ?? []).forEach((term, index) => {
    const parsed = typeof term.dice === "string" ? parseDice(term.dice) : null;
    if (!parsed) throw new Error(`Invalid damage dice: ${term.dice}`);
    const count = parsed.count * (request.critical ? 2 : 1);
    for (let i = 0; i < count; i++) dice.push({ sides: parsed.sides, group: index });
    modifier += parsed.modifier;
    groups.push({ id: index, type: term.type ?? null, modifier: parsed.modifier });
  });
  if (!dice.length) throw new Error("A damage roll needs at least one die");
  return { kind: "damage", critical: Boolean(request.critical), dice, modifier, groups };
}
export function validFace(face, sides) {
  return Number.isInteger(face) && face >= 1 && face <= sides;
}
// Total of accepted faces for a plan. For d20 with Advantage/Disadvantage the kept face
// is the higher/lower one; damage totals per group are also reported (never below 0).
export function resolvePlan(plan, faces) {
  if (!Array.isArray(faces) || faces.length !== plan.dice.length)
    throw new Error("Every die needs a face");
  plan.dice.forEach((die, i) => {
    if (!validFace(faces[i], die.sides)) throw new Error(`Invalid face for d${die.sides}`);
  });
  if (plan.kind === "d20") {
    const kept =
      plan.mode === "advantage"
        ? Math.max(...faces)
        : plan.mode === "disadvantage"
          ? Math.min(...faces)
          : faces[0];
    return { faces: [...faces], kept, natural: kept, total: kept + plan.modifier };
  }
  const byGroup = plan.groups.map((group) => ({
    type: group.type,
    total: Math.max(
      0,
      faces.filter((_, i) => plan.dice[i].group === group.id).reduce((a, b) => a + b, 0) +
        group.modifier,
    ),
  }));
  return { faces: [...faces], total: byGroup.reduce((a, g) => a + g.total, 0), byGroup };
}
export function formulaText(plan, lang = "it") {
  if (plan.kind === "d20") {
    const count = plan.dice.length;
    const mod = plan.modifier ? ` ${plan.modifier < 0 ? "−" : "+"} ${Math.abs(plan.modifier)}` : "";
    const mode =
      plan.mode === "advantage"
        ? pick(text(" (vantaggio)", " (advantage)"), lang)
        : plan.mode === "disadvantage"
          ? pick(text(" (svantaggio)", " (disadvantage)"), lang)
          : "";
    return `${count}d20${mod}${mode}`;
  }
  const counts = new Map();
  for (const die of plan.dice) {
    const key = `${die.group}:${die.sides}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const parts = [...counts.entries()].map(([key, count]) => `${count}d${key.split(":")[1]}`);
  const mod = plan.modifier ? ` ${plan.modifier < 0 ? "−" : "+"} ${Math.abs(plan.modifier)}` : "";
  return (
    parts.join(" + ") + mod + (plan.critical ? pick(text(" (critico)", " (critical)"), lang) : "")
  );
}

// ---------------------------------------------------------------- using entries elsewhere

// Row for a sheet's spells, in the same shape as the sheet's "Add spell" and the sample
// spells (recorded, not prepared, no automation implied by the name).
export function sheetSpellRow(entry, { id, grantName }) {
  if (entry?.kind !== "spell") throw new Error("Not a spell");
  return {
    id,
    name: { ...entry.name },
    level: entry.level,
    prepared: false,
    description: { ...entry.summary },
    grantName: grantName
      ? { it: grantName, en: grantName }
      : text("Annotata dal Compendio SRD", "Recorded from the SRD Compendium"),
    source: sheetSource(entry),
    compendiumRef: { id: entry.id, revision: REVISION },
  };
}
function sheetSource(entry) {
  return {
    ...structuredClone(entry.source),
    title: text("System Reference Document 5.2.1", "System Reference Document 5.2.1"),
  };
}
const ITEM_KIND = { weapon: "weapon", armor: "gear", gear: "gear", tool: "gear" };
// Row for a sheet's inventory: weight converted as the Italian SRD does (1 lb = 0,5 kg).
export function sheetItemRow(entry, { id, quantity = 1 }) {
  if (entry?.kind !== "item") throw new Error("Not an item");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999)
    throw new Error("Invalid quantity");
  const standardHealing = entry.slug === "potion-of-healing";
  return {
    id,
    name: { ...entry.name },
    quantity,
    weight: entry.weight == null ? 0 : srd.poundsToKg(entry.weight),
    equipped: false,
    kind: entry.magic?.consumable ? "consumable" : (ITEM_KIND[entry.category] ?? "gear"),
    description: { ...entry.summary },
    ...(standardHealing ? { healing: 2 } : {}),
    source: sheetSource(entry),
    compendiumRef: { id: entry.id, revision: REVISION },
  };
}
// Structured melee attack for the combat engine, only when the stat block's attack is
// one melee (or melee-or-ranged) attack with a single dice term: riders and extra damage
// stay in the text for the DM. Never inferred from prose.
export function srdMeleeProfile(creature, damageTypes = null) {
  const action = (creature?.actions ?? []).find(
    (a) =>
      a.kind === "attack" &&
      ["melee", "melee-or-ranged"].includes(a.attack?.type) &&
      a.damage?.length === 1 &&
      parseDice(a.damage[0].dice) &&
      (!damageTypes || damageTypes.includes(a.damage[0].type)),
  );
  if (!action) return null;
  const dice = parseDice(action.damage[0].dice);
  if (dice.count > 20 || ![4, 6, 8, 10, 12, 20].includes(dice.sides)) return null;
  return {
    name: { ...action.name },
    reachMeters: srd.feetToMeters(action.attack.reach ?? 5),
    attackBonus: action.attack.bonus,
    damageDice: [{ count: dice.count, sides: dice.sides }],
    damageModifier: dice.modifier,
    damageType: action.damage[0].type,
    source: {
      kind: "srd",
      edition: EDITION,
      revision: REVISION,
      sha256: creature.source.sha256,
      url: creature.source.url,
      pages: [...creature.source.pages],
      title: `SRD 5.2.1 · ${creature.name.en} · ${action.name.en}`,
    },
  };
}
// Input for preparation's createSceneNPC plus the stat block values it does not take.
export function npcFromCreature(creature, { id, name, team = "neutral" }) {
  if (creature?.kind !== "creature") throw new Error("Not a creature");
  return {
    input: {
      id,
      name: (name ?? creature.name.it).trim(),
      hp: creature.hp.average,
      ac: creature.ac,
      speed: srd.feetToMeters(creature.speed.walk ?? 0),
      team,
    },
    patch: {
      abilities: { ...creature.abilities },
      className: { ...srd.LABELS.creatureType[creature.type] },
      provenance: {
        kind: "srd",
        edition: EDITION,
        revision: REVISION,
        entryId: creature.id,
        sha256: creature.source.sha256,
        pages: [...creature.source.pages],
      },
      compendiumRef: { id: creature.id, revision: REVISION },
    },
  };
}

// Embed refs accepted in authored text (FVT-175): any catalogue entry id.
export function embedEntry(ref) {
  const entry = getEntry(ref);
  return entry && ["creature", "spell", "item", "rule", "condition"].includes(entry.kind)
    ? entry
    : null;
}
export function searchEntries(query, lang = "it", limit = 20) {
  const needle = srd.normalizeSearchText(query);
  if (needle.length < 2) return [];
  return ALL.filter((entry) => matchesText(entry, needle))
    .sort((a, b) => pick(a.name, lang).localeCompare(pick(b.name, lang), lang))
    .slice(0, limit);
}
