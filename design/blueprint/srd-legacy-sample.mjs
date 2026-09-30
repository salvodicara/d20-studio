// PG-53 (D&D Beyond «Manage Spells» with Legacy badges): the SRD 5.1 (2014) version of a
// few sample spells, shown beside their SRD 5.2.1 (2024) version only when the campaign's
// «Versioni legacy 2014» switch is on. The 2024 rules stay the default; a legacy row never
// replaces a 2024 one. Summaries are short, in our own words (as srd-sample.mjs does),
// with the section of the source named instead of an unverified page number.

const text = (it, en) => Object.freeze({ it, en });

export const LEGACY_SOURCE = Object.freeze({
  kind: "srd",
  edition: "2014",
  revision: "5.1",
  document: "System Reference Document 5.1",
  section: text("Incantesimi (A–Z), testo inglese", "Spells (A–Z)"),
  url: "https://dnd.wizards.com/resources/systems-reference-document",
  license: "CC BY 4.0",
});
// The attribution the SRD 5.1 licence asks for, shown wherever legacy rows appear.
export const LEGACY_ATTRIBUTION = text(
  "Contiene materiale del System Reference Document 5.1 («SRD 5.1») di Wizards of the Coast LLC, disponibile su https://dnd.wizards.com/resources/systems-reference-document, concesso con licenza Creative Commons Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/legalcode). Riassunti con parole nostre.",
  "This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode. Summaries in our own words.",
);

const entry = (slug, name, summary, changes) =>
  Object.freeze({
    id: `srd2014:spell:${slug}`,
    slug,
    name,
    summary,
    changes,
    source: LEGACY_SOURCE,
  });

// Keyed by the 2024 slug they sit beside.
export const LEGACY_SPELLS = Object.freeze(
  [
    entry(
      "fire-bolt",
      text("Dardo di fuoco", "Fire Bolt"),
      text(
        "Attacco con incantesimo a distanza (36 m): 1d10 danni da fuoco; un oggetto infiammabile non indossato né trasportato prende fuoco. Più dadi ai livelli 5, 11 e 17.",
        "Ranged spell attack (120 ft): 1d10 fire damage; a flammable object not worn or carried ignites. More dice at levels 5, 11 and 17.",
      ),
      text(
        "Nessuna differenza di meccanica: stessi dadi, gittata e aumenti.",
        "No mechanical difference: same dice, range and increases.",
      ),
    ),
    entry(
      "magic-missile",
      text("Dardo incantato", "Magic Missile"),
      text(
        "Tre dardi che colpiscono sempre: 1d4 + 1 danni da forza ciascuno. Un dardo in più per ogni livello dello slot oltre il 1°.",
        "Three darts that always hit: 1d4 + 1 force damage each. One more dart for each slot level above 1st.",
      ),
      text("Nessuna differenza di meccanica.", "No mechanical difference."),
    ),
    entry(
      "shield",
      text("Scudo", "Shield"),
      text(
        "Reazione quando vieni colpito o sei bersaglio di Dardo incantato: +5 alla CA fino all’inizio del tuo prossimo turno, anche contro l’attacco che l’ha attivata; nessun danno da Dardo incantato.",
        "Reaction when you are hit or targeted by Magic Missile: +5 AC until the start of your next turn, also against the triggering attack; no damage from Magic Missile.",
      ),
      text("Nessuna differenza di meccanica.", "No mechanical difference."),
    ),
    entry(
      "sleep",
      text("Sonno", "Sleep"),
      text(
        "Tira 5d8: le creature in una sfera di 6 m di raggio entro 27 m cadono prive di sensi, dalla più debole, finché i punti tirati bastano. Nessun tiro salvezza, niente concentrazione; 2d8 in più per livello dello slot oltre il 1°.",
        "Roll 5d8: creatures in a 20-foot-radius sphere within 90 feet fall unconscious, weakest first, while the rolled points last. No saving throw, no concentration; 2d8 more per slot level above 1st.",
      ),
      text(
        "La versione 2024 chiede un tiro salvezza su Saggezza in una sfera di 1,5 m (gittata 18 m): prima Incapacitato, poi Privo di sensi a un secondo fallimento; richiede concentrazione. La 2014 usa una riserva di punti ferita e nessun tiro salvezza.",
        "The 2024 version asks for a Wisdom saving throw in a 5-foot sphere (range 60 feet): first Incapacitated, then Unconscious on a second failure; it needs concentration. The 2014 one uses a hit point pool and no saving throw.",
      ),
    ),
    entry(
      "cure-wounds",
      text("Cura ferite", "Cure Wounds"),
      text(
        "Una creatura toccata recupera 1d8 + il tuo modificatore di incantatore; 1d8 in più per livello dello slot oltre il 1°. Nessun effetto su non morti e costrutti.",
        "A creature you touch regains 1d8 + your spellcasting modifier; 1d8 more per slot level above 1st. No effect on undead or constructs.",
      ),
      text(
        "2024: 2d8 + modificatore (2d8 in più per livello dello slot) e nessuna esclusione di non morti e costrutti. 2014: 1d8 per livello.",
        "2024: 2d8 + modifier (2d8 more per slot level) and no undead or construct exclusion. 2014: 1d8 per level.",
      ),
    ),
    entry(
      "healing-word",
      text("Parola guaritrice", "Healing Word"),
      text(
        "Azione bonus, 18 m: una creatura che vedi recupera 1d4 + il tuo modificatore di incantatore; 1d4 in più per livello dello slot oltre il 1°. Nessun effetto su non morti e costrutti.",
        "Bonus action, 60 feet: a creature you can see regains 1d4 + your spellcasting modifier; 1d4 more per slot level above 1st. No effect on undead or constructs.",
      ),
      text(
        "2024: 2d4 + modificatore (2d4 in più per livello dello slot). 2014: 1d4 per livello.",
        "2024: 2d4 + modifier (2d4 more per slot level). 2014: 1d4 per level.",
      ),
    ),
    entry(
      "hunters-mark",
      text("Marchio del cacciatore", "Hunter’s Mark"),
      text(
        "Azione bonus: marchi una creatura; i tuoi attacchi con arma che la colpiscono infliggono 1d6 danni in più e hai vantaggio alle prove per trovarla. Concentrazione.",
        "Bonus action: you mark a creature; your weapon attacks that hit it deal 1d6 extra damage and you have advantage on checks to find it. Concentration.",
      ),
      text(
        "2024: il danno extra è da forza e vale per ogni tiro per colpire. 2014: danno extra degli attacchi con arma.",
        "2024: the extra damage is force damage and applies to any attack roll. 2014: extra damage on weapon attacks.",
      ),
    ),
    entry(
      "spare-the-dying",
      text("Salvare i morenti", "Spare the Dying"),
      text(
        "Tocchi una creatura viva a 0 punti ferita: diventa stabile. Non ha effetto su non morti e costrutti.",
        "You touch a living creature at 0 hit points: it becomes stable. No effect on undead or constructs.",
      ),
      text(
        "2024: gittata 4,5 m, che raddoppia ai livelli 5, 11 e 17. 2014: a contatto.",
        "2024: range 15 feet, doubling at levels 5, 11 and 17. 2014: touch.",
      ),
    ),
  ].map((row) => [row.slug, row]),
);
const BY_SLUG = new Map(LEGACY_SPELLS);
export const legacySpell = (slug) => BY_SLUG.get(slug) ?? null;
