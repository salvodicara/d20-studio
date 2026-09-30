# Catalogo SRD 5.2.1 d'esempio — B11 parte A

## Stato e perimetro

Lavoro del 24/09/2026 nel worktree `d20-studio-interview-01` (ramo `codex/interview-01`),
senza commit. File posseduti e creati: `design/blueprint/srd-sample.mjs`,
`design/blueprint/tests/srd-sample.test.mjs` e questo rapporto. Nessun file esistente
modificato; nessuna interfaccia, rotta o stato: il modulo è solo dati e funzioni pure,
senza import. Serve alle aree che dopo B11 costruiscono compendio, costruttore
d'incontri, bottino, generatori, magie e inventario (CAPABILITY_CENSUS, scheda B11).

## Fonti verificate

| ID   | Fonte                                                                                                  | SHA-256 del PDF scaricato e controllato il 24/09/2026              |
| ---- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| S-EN | [SRD 5.2.1 EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), 364 pagine    | `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87` |
| S-IT | [SRD 5.2.1 IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf), 405 pagine | `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718` |

Gli hash coincidono con quelli già registrati in `character-rules.mjs` e
`conditions.mjs`. Ogni voce usa lo stesso descrittore di `conditions.mjs`:
`{kind:"srd", edition:"2024", revision:"5.2.1", sha256, url, pages, en:{url,sha256,pages}, it:{url,sha256,pages}}`.
I numeri di pagina sono quelli stampati, che in entrambi i file coincidono con
l'indice della pagina PDF. Licenza CC-BY-4.0: `SRD_ATTRIBUTION` riporta le due
dichiarazioni di attribuzione ufficiali (pagina 1 di ciascun file) da mostrare
dove il contenuto compare. I PDF sono rimasti fuori dal repository.

## Contenuto

| Sezione             | Quantità | Note                                                                                                                                                                                                                                                                                                            |
| ------------------- | -------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Incantesimi         |       68 | Livelli 0–5, tutte le otto classi incantatrici; include i 34 già in `character-rules.mjs` più Trova famiglio, Aiuto, Palla di fuoco, Controincantesimo ecc. Scuola, classi, tempo di lancio, rituale, gittata, area, componenti (costo e consumo), durata, concentrazione, attacco, TS, dadi, cura, condizioni. |
| Creature            |       32 | GS 0–8 (almeno una per ogni GS da 0 a 8). Taglia, tipo, tag, allineamento, CA, iniziativa, PF e formula, velocità, caratteristiche, TS, abilità, sensi, lingue, GS/PE/BC, tratti, azioni, azioni bonus, reazioni con bonus, portata/gittata, dadi medi e CD. Include Goblin guerriero, Lupo, Gatto, Topo.       |
| Oggetti             |       71 | 23 armi con padronanza 2024, 9 armature e scudo, 16 oggetti d'avventura, 5 strumenti, 18 oggetti magici (comuni, non comuni, rari; sintonia, cariche, varianti +1/+2/+3).                                                                                                                                       |
| Glossario           |       39 | Le 12 azioni 2024 (Attacco, Scatto, Disimpegno, Schivata, Aiuto, Nascondersi, Influenza, Magia, Prepararsi, Ricerca, Studio, Utilizzo) e 27 regole (Vantaggio, Sanguinante, Concentrazione, Terreno difficile, Attacchi di opportunità…).                                                                       |
| Condizioni (indice) |       15 | Solo nome, pagina e riassunto; `links.conditions` rimanda a `conditions.mjs`, che resta l'unico proprietario delle meccaniche.                                                                                                                                                                                  |
| Tabelle             |        — | PE per GS completo (0–30, con 0 o 10 per GS 0) e bonus di competenza per GS; budget PE per personaggio 2024 (Facile/Media/Difficile, livelli 1–20); cinque monete con valore in mr.                                                                                                                             |

Ogni voce ha id stabile `srd2024:<tipo>:<slug>`, nome `{it,en}`, `translation.it`,
tag di categoria, fonte con pagine EN e IT, riassunto breve scritto per l'app
(`SUMMARY_POLICY`: parafrasi, mai testo delle regole). Le etichette condivise
(`LABELS`: scuole, classi, tipi di danno, taglie, tipi di creatura, allineamenti,
rarità, proprietà e padronanze, categorie) hanno la propria fonte in
`LABEL_SOURCES`; solo `LABELS.kind` è testo dell'app.

Collegamenti con i moduli esistenti: `links.characterRules` sugli incantesimi con lo
stesso slug in `character-rules.mjs`; alias `srd2024:cat|rat|wolf` (id dei profili di
`forms-companions.mjs`) risolti da `getById`.

## API

- Dati congelati: `SPELLS`, `CREATURES`, `ITEMS`, `RULES_GLOSSARY`, `CONDITION_INDEX`,
  `ALL_ENTRIES`, `COINS`, `XP_BY_CR`, `ENCOUNTER_XP_BUDGET`, `ENCOUNTER_DIFFICULTIES`,
  `LABELS`, `LABEL_SOURCES`, `SRD_DOCUMENTS`, `SRD_LICENSE`, `SRD_ATTRIBUTION`.
- `getById(id)` (id o alias), `translationStatus(entry)` (`official` o `missing`).
- `searchCatalog({text, kind, kinds, tags, level, minLevel, maxLevel, classId, school, cr, minCr, maxCr, type, size, category, rarity, attunement, includeSummary, lang})`:
  filtri in AND, testo senza accenti né maiuscole su nomi IT/EN e nomi alternativi
  (riassunti solo con `includeSummary`), rarità anche sulle varianti, ordine per tipo
  poi livello/GS/categoria poi nome; un filtro sconosciuto lancia un errore.
- `crToNumber`, `xpForCr`, `proficiencyBonusForCr`, `encounterBudget(levels)`,
  `encounterXp([{id,count}])`, `rateEncounter(levels, monsters)`.
- `feetToMeters` (5 ft = 1,5 m), `poundsToKg` (1 lb = 0,5 kg), `formatDistance`,
  `formatWeight`, `costInCp`, `formatCost` (migliaia come nei due SRD: "1.500 mo",
  "1,500 GP"), `srdSource(en, it)`, `normalizeSearchText`, `getCatalogSummary`.

I dadi macchina sono ASCII senza spazi (`1d6+2`, `1d4-1`); i riassunti li mostrano
come nel SRD. Le distanze sono in piedi e i pesi in libbre, convertiti con la
convenzione usata dal SRD italiano. `damageMode:"on-hit"` distingue i danni aggiunti
a un colpo (Marchio del cacciatore, Sortilegio, punizioni); i dadi degli incantesimi
sono per singola istanza (dardo, raggio). L'area riporta la misura come la dà il SRD
(raggio per sfera e cilindro, lunghezza per cono e linea, lato per cubo e quadrato).

## Verifica

1. Estrazione del testo di entrambi i PDF pagina per pagina (PyMuPDF) in una cartella
   temporanea fuori dal repository.
2. Controllo automatico, poi rieseguito dopo ogni modifica, con esito zero differenze:
   - nome EN e IT (o intestazione con tag) presente sulle pagine dichiarate, per tutte
     le 225 voci;
   - incantesimi: livello, scuola, classi EN/IT, tempo di lancio, rituale, gittata,
     componenti, costo e consumo, durata, concentrazione; dadi, tipi di danno, TS,
     attacco, condizioni e area presenti nel blocco dell'incantesimo;
   - creature: taglia, tipo, allineamento (EN e IT), CA, iniziativa, PF e formula,
     velocità, punteggi/modificatori/TS di tutte e sei le caratteristiche, abilità,
     sensi, riga GS/PE/BC, nomi EN e IT di tratti e azioni, bonus, portata, gittata,
     dadi medi, CD, vulnerabilità, resistenze, immunità. Una prova negativa (CA,
     Destrezza, dadi e TS alterati) viene rilevata;
   - armi (dadi, tipo, proprietà, versatile, gittata, munizioni, padronanza, peso,
     costo e riga IT), armature, oggetti d'avventura (peso e costo in tabella),
     strumenti (caratteristica, peso, costo), oggetti magici (rarità, varianti,
     sintonia, cariche; righe delle pozioni);
   - tabella PE per GS (EN p. 256, IT p. 291), bonus di competenza per GS, budget PE
     (EN p. 202, IT pp. 230–231), valori delle monete (EN p. 89, IT p. 101) e ogni
     etichetta di `LABELS` sulle pagine di `LABEL_SOURCES`.
3. Test Node `node --test design/blueprint/tests/srd-sample.test.mjs`: 13 test, 13
   superati. Coprono forma di ogni voce, id e alias unici, fonte e congelamento,
   copertura livelli/classi/GS, coerenza PF e dadi medi, Percezione passiva, PE e BC,
   riferimenti a oggetti, incantesimi e condizioni, tabella PE, esempi di budget del
   SRD (200, 1.125 e 46.800 PE), monete e unità, filtri di ricerca, confronto con
   `character-rules.mjs` (livello, classi, nome EN, pagina).
4. Suite completa `node --test design/blueprint/tests/*.test.mjs` il 24/09/2026:
   574 test, 573 superati; l'unico fallimento è in `reactions.test.mjs` ("zero hit
   points alone do not invent concentration loss…"), area in modifica da un altro
   agente e non toccata da questo lavoro.

## Divergenze osservate e limiti

- `character-rules.mjs` usa nomi italiani non ufficiali per due incantesimi:
  "Risparmiare i Morenti" (SRD IT: "Salvare i morenti", p. 182) e "Druidismo" (SRD IT:
  "Artificio druidico", p. 126). Usa inoltre le maiuscole a ogni parola ("Dardo
  Incantato"), mentre il SRD IT scrive "Dardo incantato". Questo catalogo segue il SRD;
  la correzione di `character-rules.mjs` spetta al suo proprietario. Il test esclude
  solo quei due nomi dal confronto e non fallirà se vengono corretti.
- Nel SRD IT l'acciarino compare come "Acciarino e pietra focaia" (tabella, p. 108) e
  "Acciarino con pietra focaia" (descrizione, p. 107): il nome usa la tabella e
  l'altro è in `altNames` per la ricerca.
- Differenze di traduzione nel SRD IT rispetto all'EN, non riprodotte nei dati: Troll,
  Arti abominevoli "più di 15 danni" (EN "15+"); lo Scheletro scrive "portata" per la
  gittata dell'arco corto. La base di regole resta l'EN 2024.
- `rateEncounter` assegna una fascia (`low`, `moderate`, `high`, `above-high`,
  `empty`) come inferenza dell'app (`inference: true`): il SRD descrive solo come
  spendere un budget scelto senza superarlo, senza moltiplicatori 2014.
- Campione, non SRD completo: 68 di 339 incantesimi, 32 di 330 schede, nessun
  incantesimo sopra il 5º livello, nessuna creatura sopra GS 8, niente azioni
  leggendarie. Le liste di incantesimi dei mostri citano per nome gli incantesimi
  fuori catalogo (Taumaturgia, Forma eterea). I contenuti delle dotazioni e i materiali
  degli incantesimi sono riassunti, non descritti. Nessuna automazione delle regole:
  i campi strutturati descrivono, non eseguono.
- Riassunti italiani e inglesi scritti per l'app e verificati a mano sul testo
  ufficiale; la loro esattezza non è certificata da un revisore umano esterno.

## Prossima azione

Revisione distinta del modulo e del test su questo stato del worktree; poi
integrazione da parte del coordinatore insieme alle altre parti di B11. Le aree
B16, B19, B25, B26, B36 e B38 possono importare `srd-sample.mjs` in sola lettura.
