# B57 — Generatori procedurali assistiti: prove

24/09/2026 (cartella prove datata 2026-09-25 come da incarico). Area `generators` (scheda
B57 in `docs/interview/CAPABILITY_CENSUS.md`, capacità CA-41, PR-17, PR-18, PR-40; inclusione
delegata 23/09/2026). Dati sintetici della campagna «Le lanterne di Bruma»: gruppo Livia,
Doran, Mira (livello 3), scena `old-watch` «Il cortile dell’osservatorio», incontro B19
«Chi ha riacceso la lanterna», tabella B25 «Voci alla Lanterna».

Regola della scheda rispettata ovunque: ogni generazione è una **bozza** con **seme
visibile** e **«Rigenera»**; niente entra in scena, incontro o mondo senza un salvataggio
esplicito; i muri proposti si confermano **uno per uno**.

## File

| File                                                          | Contenuto                                                                                                                                                                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design/blueprint/generators-domain.mjs`                      | dominio puro: semi e flussi deterministici, quantità FG `N*$PC` e intervalli Kobold+, Genera Kobold+ sul budget 2024, «Adatta» 5e.tools, dungeon a stanze e corridoi, rilevamento muri, tabelle/locande/centri/nomi via motore B25, voci del Mondo |
| `design/blueprint/generators.mjs`                             | `register`, pannello nel dialogo comune (sei generatori), comandi e scorciatoia, passaggi a B19, all’editor della Preparazione, al Mondo e a B25                                                                                                   |
| `design/blueprint/generators.css`                             | stili con prefisso `gen-` (più `.prep-create-actions` del gancio), caricati da `registerStyles`                                                                                                                                                    |
| `design/blueprint/tests/generators.test.mjs`                  | 23 test: dominio + gestori dell’interfaccia con store e registro veri (B12, B19, B25, B26, compendio)                                                                                                                                              |
| `changes/interview-01/blueprint-checks/generators-journey.js` | percorso nel browser reale (IT 1440 DM e giocatore, EN 390 touch)                                                                                                                                                                                  |

### Modifica additiva a un file condiviso (una, in `preparation.mjs`)

Mancava un modo di mettere un comando d’area **dentro** la Preparazione senza aggiungere una
scheda (la scheda chiede «entry points inside Preparation and the encounter builder, not new
tabs») e di aprire una bozza di scena nell’editor esistente. Aggiunte, nessuna firma cambiata,
markup identico quando nessuna area contribuisce (i test `registry-shell` restano verdi):

1. `prepCreateActions(ctx, own)`: accanto al pulsante di creazione della pagina mostra i
   `command` con `context: "preparation"` e `group: "preparation-create"` visibili (ruoli e
   `when`); legati da `[data-prep-command]` in `bindPreparation` con `registry.run`. Usato
   nell’intestazione della raccolta scene (prima di «Nuova scena») e in quella delle sezioni.
2. `export openSceneDraft(ctx, scene, patch)`: apre una scena nuova o una scena salvata con
   modifiche proposte come **bozza non salvata** dell’editor (`beginEditor` + patch); una bozza
   modificata dell’editor chiede prima «Scartare le modifiche?».

Nessun altro file condiviso toccato; `extensions.mjs` elencava già `generators`.

## Dove si trova (≤ 2–3 clic)

- **Preparazione › Scene** (DM): «**Genera…**» accanto a «Nuova scena» → pannello con le
  schede interne Dungeon · Incontro · Locanda · Centro abitato · Nomi · Muri da mappa
  (2 clic per ogni generatore, 3 per un tipo diverso da quello aperto).
- **Preparazione › Incontri** (costruttore B19): «**Genera incontro…**» nella stessa
  intestazione, oppure **Ctrl/Cmd+G** (scorciatoia di Kobold+); con un incontro aperto propone
  il suo gruppo e «Aggiungi a «…»».
- Dentro il dungeon, ogni stanza «Creature» ha «Genera incontro» (Owlbear Crawl popola le
  stanze, VTL-102).
- Palette (B23): «Genera: Dungeon / Locanda / Centro abitato / Nomi / Muri da mappa».
- Il giocatore non ha generatori (Preparazione riservata; comandi solo DM). Vede i risultati
  **dove contano**: muri e porte al Tavolo (porte segrete escluse), voci del Mondo condivise.

## Capacità → percorso → prova

| Capacità (census)                                         | Percorso e comandi                                                                                                                                                 | Risultato verificato                                                                                                                                                                                                                                                            | Regola / fonte                                                                                                                             | Pattern adottato (prodotto + ID)                                                                                                                    | Prova                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| PR-17 dungeon procedurale: seme, opzioni, Rigenera        | Preparazione › Genera… › Dungeon; seme «NEBBIA-4821» + Invio; Porte = robuste, Porte segrete; Rigenera; «Bozza precedente»; Ctrl+G                                 | 9 stanze · 70 muri · 20 porte; le opzioni cambiano porte (7 a chiave, 2 segrete) **con lo stesso seme**; Rigenera → seme nuovo; «Bozza precedente» e il seme riscritto riproducono lo stesso dungeon; badge «Bozza · non ancora in gioco»                                       | contenuto originale, griglia 50 px = 1,5 m come le scene esistenti                                                                         | donjon modulo e seme (CMP-137), uscite etichettate/non etichettate (CMP-138), Watabou reroll con Invio e seme (CMP-140/141)                         | journey (2); test «donjon/Watabou dungeon…», «dungeon options…»; `02-…png`                              |
| PR-17 bozza di scena con muri e porte (modello esistente) | «Apri come bozza di scena» → editor → «Salva preparazione» → reload                                                                                                | editor «Nuova bozza riservata» / «Modifiche non salvate», «Geometrie disegnate (90)», legenda e seme nelle note DM; **nessuna scena salvata** prima del clic; dopo: 90 muri/porte, immagine PNG, scena riservata; resta dopo il reload; ogni stanza raggiungibile dall’ingresso | geometria validata da `validateSceneGeometry`/`saveSceneDraft`; porte chiuse bloccano (`isSegmentBlocked`); fonte `authored-demo` per muro | donjon mappa + legenda (CMP-137/138); Owlbear Crawl salva e piazza la mappa con muri (VTL-102)                                                      | journey (3); test «dungeon hand-off…», connettività; `03-…png`                                          |
| PR-17 DM vs giocatore al Tavolo                           | «Altre azioni › Attiva al Tavolo…» → Tavolo DM, poi giocatore                                                                                                      | DM 90 geometrie, giocatore 88: le 2 porte segrete restano solo del DM                                                                                                                                                                                                           | visibilità `secret` del modello spaziale                                                                                                   | porte segrete donjon (CMP-137)                                                                                                                      | journey (4); `04-…png`                                                                                  |
| PR-40 incontro generato sul budget 2024                   | Preparazione › Incontri › Ctrl+G; Difficile, «Boss con seguaci», seme «GUADO-1234»                                                                                 | «Budget 2024 per 3 personaggi (3, 3, 3): Facile 450 · Media 675 · Difficile 1.200 PE. Obiettivo Kobold+: 1.200 × 1,15 = 1.380 PE»; modello scelto dal seme; nessuna creatura ripetuta; ordinate per GS                                                                          | SRD 5.2.1 XP Budget per Character e PE per GS (EN p. 202 / IT p. 230–231, `srd-sample.mjs`); fasce B19 Kobold+ (CMP-106)                   | Kobold+ Generate: fudge 1,15, modelli Random/Boss/Boss+seguaci/Coppia/Trio/Orda, GS più vicino e ricerca giù-su (CMP-110, sorgente osservata 24/09) | journey (5); test «Kobold+ Generate…»; `05-…png`                                                        |
| PR-40 scalatura sul gruppo e dadi fisici/digitali         | riga dei seguaci `$PC..2*$PC` (1d4+2): «Dado fisico» 4 → Registra; «+»; espressione `2*$PC` + Invio; «Tira 1d4» (digitale)                                         | 6 «dado fisico», 7 «scelta del DM», 6 «dal seme»; tiro digitale con `rollDie`; faccia fuori intervallo rifiutata; limite 1–20 (B19) segnalato                                                                                                                                   | contratto: dadi fisici e digitali ovunque ci sia un tiro                                                                                   | FG `N*$PC` e righe con espressione di dadi (R20-112); intervalli Kobold+ `players-players*2`                                                        | journey (5); test «FG N\*$PC…», «draft rows take…»                                                      |
| PR-40 adattare alla difficoltà                            | «Togli» il capo → «Adatta a «Difficile»»                                                                                                                           | da Media a Difficile (1.200 PE), righe segnate «adattata»                                                                                                                                                                                                                       | finestra della fascia = [budget, fascia successiva)                                                                                        | 5e.tools «Adjust to <Difficulty>» (CMP-117)                                                                                                         | journey (5); test «draft rows…»                                                                         |
| PR-40 consegna al costruttore B19, Undo                   | «Salva come nuovo incontro» → B19; «Annulla» di B19; «Genera incontro…» → salva di nuovo → reload                                                                  | B19 apre «Pattuglia al guado», Difficile 1.200 PE, riassunto con il seme; Undo lo toglie; la bozza resta nel pannello; il nuovo salvataggio sopravvive al reload; etichetta di registro privata; «Aggiungi a «…»» accoda righe a un incontro aperto                             | solo comandi di dominio B19 (`createEncounter`, `addCreature`, `changeCount`, `setParty`, `setNotes`)                                      | Kobold+ riempie l’incontro in modifica (CMP-110); consegna a B19 (scheda B57)                                                                       | journey (5); test «saving hands the draft to B19…», «encounter panel…»; `06-…png`                       |
| CA-41 locanda tramite tabelle casuali B25                 | Genera… › frecce → Locanda; seme «CANNETO-42»; «Tiri» › «Dado fisico» d8 = 1; titolo riscritto; «Gruppo della campagna» → Salva                                    | nome, oste, specialità, clientela, particolarità, voce che gira presa dalla tabella B25 **«Voci alla Lanterna»**; d8 1 → «zuppa d’anguilla» «dado fisico»; «modificato dal DM»; voce del Mondo aperta                                                                           | tabelle `authored-demo` nel formato B25; motore B25 (`beginSession`, `rollAll`, `resolveFace`)                                             | donjon inn generator (CMP-105); FG story templates e output al diario (R20-115/116); Foundry Roll Tables (FVT-097)                                  | journey (6); test «inns and settlements…», «settlement corrections…»; `07-…png`, `08-…png`              |
| CA-41 centri abitati, demografia e nomi                   | Centro abitato (dimensione con abitanti, tratto, chi comanda, guaio, PNG, locanda); Nomi (8, scelta con casella)                                                   | «Borgo · 74 abitanti» ecc.; al telefono 2 nomi su 8 salvati come persone nel Mondo                                                                                                                                                                                              | intervalli demografici dimostrativi, dichiarati non regola                                                                                 | donjon town/demographics (CMP-105)                                                                                                                  | journey (9); test «names panel…»; `12-…png`                                                             |
| CA-41 riservatezza (DM vs giocatore)                      | seconda locanda con «Io e i DM»; giocatore › Campagna › Mondo                                                                                                      | il giocatore legge «La Lanterna e il Salice», non «Il Corvo Segreto»; offline un salvataggio condiviso è rifiutato («La modifica condivisa richiede connessione»)                                                                                                               | accesso delle voci di campagna (`campaign-content`)                                                                                        | condivisione come il diario B25                                                                                                                     | journey (6); test «saved places reach the campaign World…», «World save from the panel…»                |
| CA-41 tabelle modificabili in B25                         | «Copia le tabelle in «Tabelle e mazzi» per modificarle»                                                                                                            | 14 tabelle copiate nella raccolta B25 (privata); la Preparazione apre la prima; una modifica del DM vale per le estrazioni successive                                                                                                                                           | —                                                                                                                                          | Foundry/Chartopia tabelle modificabili (FVT-097, CMP-129)                                                                                           | test «generator tables can be copied into B25…», «names panel…»                                         |
| PR-18 rilevamento muri con conferma singola               | Genera… › Muri da mappa › «Il cortile dell’osservatorio» › «Rileva i muri»; clic su una proposta nella mappa; Conferma ×4, Scarta ×1, Conferma ripremuto; Aggiungi | 10 proposte (i 4 lati del cortile e 6 pezzi della vasca); il clic sulla mappa seleziona la riga; ripremere «Conferma» torna a «da decidere»; «4 confermate · 1 scartate»; editor con «Modifiche non salvate» e scena invariata; dopo «Salva preparazione» e reload +4 muri      | muri nel modello esistente, fonte `authored-demo` per ogni muro; soglia di Otsu ± sensibilità                                              | Owlbear Forecast: analisi dell’immagine, può perdere stanze piccole, correzione del DM (VTL-065)                                                    | journey (7); test «Forecast-like detection…», «walls panel…», «luminance blocks…»; `09-…png`, `10-…png` |
| Tastiera, focus, 40 px, telefono, EN/IT                   | frecce tra i generatori, Invio su seme/espressione/testo, Ctrl+G; EN 390 touch                                                                                     | focus ripristinato dopo ogni aggiornamento; i sei generatori senza overflow e con controlli ≥ 40 px a 390 px; testi IT/EN                                                                                                                                                       | contratto accessibilità del blueprint                                                                                                      | Watabou Invio per rigenerare (CMP-140); Kobold+ Ctrl/Cmd+G (CMP-110)                                                                                | journey (5)(6)(9); `11-…png`, `12-…png`                                                                 |

## Comandi ed esiti

```sh
node --test design/blueprint/tests/generators.test.mjs
# 23/23 pass
node --test design/blueprint/tests/*.test.mjs
# 1802/1802 pass (24/09, con le aree parallele presenti in quel momento)
cd /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B57
playwright-cli -s=d20-b57 open http://127.0.0.1:8879/
playwright-cli -s=d20-b57 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/generators-journey.js
# blocchi (1)–(9) superati, nessun pageerror (eseguito 5 volte, ultima dopo le correzioni)
```

Il percorso azzera lo stato dimostrativo del proprio contesto (e la sessione della scheda),
usa clic, tasti (Invio, frecce, Ctrl+G) e tocco al telefono, ricarica quattro volte (il ruolo
dimostrativo torna al DM dal selettore), legge `localStorage` solo per verificare le
conseguenze dei comandi visibili e controlla che nessun avviso del registro venga da questa
area. Schermate 1440×900 (le ultime due a 390): `…/d20-blueprint-evidence/2026-09-25/B57/`
`01-prep-generate-entry` · `02-dungeon-draft` · `03-dungeon-in-editor` ·
`04-table-dungeon-player` · `05-encounter-draft` · `06-encounter-in-builder` ·
`07-inn-draft` · `08-inn-world-entry` · `09-walls-proposals` · `10-walls-in-editor` ·
`11-phone-en-dungeon-390` · `12-phone-en-names-390`, controllate una a una (piè di pagina del
dialogo visibile, legenda delle porte, righe scartate barrate, nessun testo tagliato).

## Limiti onesti

- **Seme e dadi.** Il seme guida un generatore pseudo-casuale deterministico (come donjon e
  Watabou): i valori «dal seme» sono etichettati così e non sono tiri registrati. Ogni tiro
  esplicito usa invece il servizio unico dell’app (`rollDie` di `state.mjs`, «dado digitale»)
  o una faccia fisica digitata («dado fisico»); il seme nuovo di «Rigenera» nasce da `rollDie`.
  I tiri di preparazione non entrano nel registro dei tiri: restano nella bozza.
- **Bozze per scheda del browser.** Bozza, seme e opzioni restano nella `sessionStorage` della
  scheda (sopravvivono al ricaricamento, non ad altri dispositivi); «Bozza precedente» tiene
  fino a 10 bozze in memoria. Le correzioni del DM (quantità, testi) si perdono solo se si
  rigenera, e «Bozza precedente» le riporta.
- **Kobold+.** Il catalogo è il campione SRD (32 creature) più i blocchi personalizzati di B19:
  niente filtro per ambiente (i dati non lo hanno). Un gruppo senza quota prende il resto delle
  quote esplicite (Kobold+ lo assegna nell’ordine di elaborazione e può superare il 100%:
  scelto di non copiare questo effetto). «Adatta» segue il principio di 5e.tools con un
  algoritmo proprio (la versione 2024 di 5e.tools non è stata osservata).
- **Dungeon.** Solo stanze rettangolari e corridoi di una cella su griglia quadrata; niente
  caverne, esagoni, scale come oggetti, luci o arredo automatico (Dungeon Alchemist CMP-148) e
  niente esportazione SVG/JSON/PDF (CMP-138/142). Due corridoi paralleli possono toccarsi e le
  porte possono essere vicine. Le «Creature» della legenda sono spunti: «Genera incontro»
  prepara un incontro B19, non lo mette in scena.
- **Rilevamento muri.** Confini tra zone chiare e scure su blocchi di mezza cella, solo
  orizzontali e verticali; perde linee sottili interne (i tramezzi del cortile) e propone
  contorni di oggetti (la vasca), che il DM scarta. Analizza la versione **salvata** della
  scena (un’immagine appena caricata va salvata prima); nessuno strumento «Slice»: i muri si
  correggono poi nell’editor (Seleziona, Muro, Annulla ultima modifica geometrica). Niente
  nebbia generata: la nebbia resta di B35 e usa questi muri.
- **Città e nomi.** Contenuti originali italiani (anche in EN i nomi propri restano quelli);
  intervalli di popolazione dimostrativi, non le formule di donjon; niente mappa della città.
- **Mondo.** Le voci salvate seguono le regole del contenuto di campagna: non si annullano con
  l’Undo di gioco, si correggono o si condividono da Campagna › Mondo.
- Dimostrazione locale a due identità: privatezza e permessi sono proiezioni nello stesso
  browser, non sicurezza di un server. `DEVELOPMENT.md` non è stato aggiornato (file del
  coordinatore): il gancio `prepCreateActions`/`openSceneDraft` è descritto qui sopra.

## Review and fixes (revisione indipendente, 24/09/2026)

Revisore-correttore indipendente di B57 (non ha costruito l’incremento). Sessione del browser
`d20-b57-rf`, cartella prove `…/d20-blueprint-evidence/2026-09-25/B57-rf/` (il percorso ora
scrive lì le schermate; quelle del costruttore in `…/B57/` restano intatte). Controllati: la
scheda B57 (CA-41, PR-17, PR-18, PR-40), i pattern citati nel census (CMP-105/110/117/137–142,
R20-112, VTL-065/102), controlli inerti, coerenza con B19/B25/Mondo/Tavolo, ruoli, offline,
correzioni, EN/IT, tastiera, telefono 390, test, file condivisi e posizione (B61).

Prima delle correzioni il percorso del costruttore passava per intero (blocchi 1–9) e i 23
test erano verdi: i difetti sotto sono casi che quei controlli non toccavano.

### Difetti trovati e correzioni

| #   | Gravità | Riproduzione (prima)                                                                                                                                                                                                                                                                                                               | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | P2      | Incontri › «Chi ha riacceso la lanterna» › Gruppo tipo 6, 6, 6, 6 › «Genera incontro…» (budget per 4 personaggi di livello 6) › «Salva come nuovo incontro»: il nuovo incontro in B19 usava il gruppo della campagna (3, 3, 3), quindi B19 mostrava una difficoltà diversa da quella del generatore.                               | **Corretto.** `saveEncounterDraft` passa a B19 i livelli del budget come «Gruppo tipo» quando la bozza non è per il gruppo della campagna (il gruppo della campagna resta vivo, non congelato). Test «a draft made for an open encounter’s own party…»; percorso (5b): B19 tiene 6, 6, 6, 6 e la stessa fascia.                                                                                                                           |
| R2  | P2      | Editor del cortile con modifiche non salvate (nome, un muro disegnato) › Genera: Muri da mappa › conferma › «Aggiungi … alla bozza»: compariva «Scartare le modifiche?». Confermando si perdevano le modifiche del DM; annullando si perdevano le proposte già confermate e il toast diceva comunque che i muri erano nella bozza. | **Corretto.** I muri confermati entrano nella bozza non salvata della **stessa** scena, che tiene le modifiche del DM (nessuna domanda, nessun doppione se si ripete). Per un’altra scena la domanda resta, ma decisioni e toast cambiano solo quando la bozza si apre davvero. Test «walls go into the editor’s unsaved draft…», «walls for another scene wait…»; percorso (7b).                                                         |
| R3  | P2      | Owlbear mette Forecast negli strumenti della mappa, sulla mappa che si sta modificando (VTL-065). Qui era solo nel pannello aperto dall’elenco delle scene, lontano dall’editor dove si carica la mappa, e analizzava solo la versione salvata: un’immagine appena caricata andava salvata prima.                                  | **Corretto.** «Rileva i muri…» sta sotto gli strumenti della mappa nell’editor della scena (non nell’anteprima né nelle sezioni). Analizza la bozza mostrata, anche una scena nuova non salvata (un dungeon generato); l’elenco la segna «bozza non salvata». Anche «Genera: Muri da mappa» della palette, aperto dall’editor, parte da quella scena. Test «Forecast from the scene editor…»; percorso (7b); telefono 390 senza overflow. |
| R4  | P3      | In inglese: «675 × 1,15» (virgola italiana) e «template 8 «Random»» con le virgolette italiane.                                                                                                                                                                                                                                    | **Corretto:** «× 1.15» e “Random” in EN, «× 1,15» e «Casuale» in IT. Test e percorso (9).                                                                                                                                                                                                                                                                                                                                                 |
| R5  | P3      | Porte → «robuste» (bozza nuova con lo stesso seme) → «Bozza precedente»: tornava la bozza con porte chiuse ma la scelta restava «robuste», e riscrivendo lo stesso seme usciva un dungeon diverso da quello mostrato.                                                                                                              | **Corretto:** «Bozza precedente» riporta anche le opzioni che l’hanno prodotta (dungeon; difficoltà, tipo e filtri dell’incontro). Test «EN budget line…».                                                                                                                                                                                                                                                                                |
| R6  | P3      | Le correzioni (+/−, dadi, testo) accumulavano bozze precedenti senza limite (il limite di 10 valeva solo per Rigenera).                                                                                                                                                                                                            | **Corretto:** 10 per entrambe. Test.                                                                                                                                                                                                                                                                                                                                                                                                      |
| R7  | P3      | Con 4 personaggi l’intervallo Kobold+ `$PC..2*$PC` (4–8) è «1d5+3»: «Dado fisico» chiedeva un d5, che non esiste come dado fisico (così d3, d7…).                                                                                                                                                                                  | **Corretto:** accanto a un dado non standard «(con un d6: ritira oltre 5)»: dado standard più piccolo, ritirando oltre il massimo (stesse probabilità). Vale anche per i tiri sulle tabelle B25 copiate e modificate. Test «a range whose die is not a standard one…».                                                                                                                                                                    |
| R8  | P3      | «1 muri nella bozza», «Aggiungi 1 muri confermati», «Salva 1 nomi come persone».                                                                                                                                                                                                                                                   | **Corretto:** singolare in IT e EN. Test.                                                                                                                                                                                                                                                                                                                                                                                                 |
| R9  | P3      | La persistenza di bozza, seme e nomi dopo il ricaricamento era provata solo nel browser.                                                                                                                                                                                                                                           | **Aggiunto** un test con una `sessionStorage` finta (anche: ogni ruolo ha la sua).                                                                                                                                                                                                                                                                                                                                                        |

### Verificato e non difetto (con motivo)

- **Ruoli e riservatezza:** il giocatore non ha comandi né pannello; porte segrete escluse al
  suo Tavolo (88 di 90); voci del Mondo «Io e i DM» e «Solo io» illeggibili dal giocatore;
  tabelle copiate private; etichette di registro private.
- **Offline (provato nel browser):** salvataggio nel Mondo per il gruppo rifiutato con
  «La modifica condivisa richiede connessione.» nel pannello; «Solo io» funziona e apre la
  voce; «Salva come nuovo incontro» funziona come in B19 (stessa opzione locale di B19).
- **Tastiera:** frecce/Home/End tra i generatori, Invio su seme ed espressioni, Ctrl/Cmd+G nel
  pannello (le scorciatoie globali sono spente con il dialogo aperto, nessun doppio comando),
  Esc chiude; «Genera incontro» di una stanza porta all’incontro con nome «Stanza N · …».
- **Kobold+ sostituisce l’incontro, qui si crea o si aggiunge:** scelta tenuta. L’incontro è
  di B19: sostituire le righe del DM distruggerebbe lavoro; «Aggiungi a …» più l’Annulla di B19
  coprono il caso.
- **Il seme non è un secondo motore di dadi:** i valori «dal seme» sono etichettati così
  (donjon/Watabou); ogni tiro esplicito usa `rollDie` o una faccia fisica.
- **Incontro generato sotto la fascia** (es. 3.600 PE «Facile» con obiettivo Media per 6, 6,
  6, 6): è il comportamento di Kobold+ (GS più vicino); c’è «Adatta a …».
- **Accettati come P3, non cambiati:** Invio sul seme applica il seme scritto (in Watabou
  Invio rigenera; qui rigenerano «Rigenera» e Ctrl/Cmd+G). «Genera incontro…» sta
  nell’intestazione della pagina Incontri, non accanto a «Nuovo incontro» di B19 (spostarlo
  richiede il file di B19; è un pulsante nell’intestazione esistente, non una riga nuova).
  Numeri delle stanze: una sola immagine con numeri facoltativi, non la coppia donjon con e
  senza numeri (servirebbe un livello di etichette solo DM).
- **Posizione (B61):** nessuno strumento al Tavolo; i generatori stanno in Preparazione, dove
  si preparano scene, incontri e tabelle; nessuna scheda nuova, nessuna riga nuova.

### Modifiche ai file condivisi (additive, solo sui ganci B57 di `preparation.mjs`)

1. `prepCreateActions(ctx, own, group = "preparation-create")`: gruppo facoltativo.
2. Editor della scena: `prepCreateActions(ctx, "", "preparation-scene-map")` subito dopo gli
   strumenti della mappa; senza comandi di quel gruppo restituisce "" (markup invariato).
3. `openSceneDraft(ctx, scene, patch)`: `patch` può essere una funzione della bozza, chiamata
   solo quando la bozza si apre davvero; con una funzione e una bozza non salvata della stessa
   scena, si applica a quella bozza senza scartarla. Le patch oggetto funzionano come prima.
4. `export currentSceneDraft()`: copia della bozza non salvata dell’editor, oppure `null`.

Nessun altro file condiviso toccato. `registry-shell` e i test della Preparazione restano
verdi (40/40).

### Superato nel testo sopra

- «Analizza la versione **salvata** della scena (un’immagine appena caricata va salvata
  prima)»: ora, con l’editor aperto, analizza la bozza mostrata (R3).
- «23 test»: ora 30. Dove si trova: in più «Rileva i muri…» nell’editor della scena, sotto gli
  strumenti della mappa (1 clic dall’editor).

### Comandi ed esiti dopo le correzioni

```sh
node --test design/blueprint/tests/generators.test.mjs
# 30/30 pass
node --test design/blueprint/tests/*.test.mjs
# 1968 test, 1954 pass, 14 fail: tutti in quickbar.test.mjs e damage-tray.test.mjs
# (test «review:» di altre revisioni in corso e registro PF del vassoio danni). Nessuno di
# generators o preparation. Esecuzioni precedenti: fallimenti passeggeri in dice-tray, loot,
# relations-graph, anche questi di altre aree.
cd /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B57-rf
playwright-cli -s=d20-b57-rf open http://127.0.0.1:8879/
playwright-cli -s=d20-b57-rf --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/generators-journey.js
# blocchi (1)–(9) più (5b) e (7b) superati, nessun pageerror; il (9) controlla anche «× 1.15»
```

Schermate nuove in `B57-rf/`: `10b-walls-from-editor-it-1440.png` (bozza rinominata con il
muro aggiunto e il toast), `y-phone-editor-detect-390.png` e `y-phone-walls-390.png`
(«Detect walls…» e il pannello a 390, senza overflow), `y-offline-world.png` (errore offline
nel pannello), più le schermate 01–12 del percorso rieseguito.
