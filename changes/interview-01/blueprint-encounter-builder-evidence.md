# B19 — Preparazione: costruttore d’incontri 2024 · evidenza

24/09/2026. Area `encounter-builder` (scheda B19 di `docs/interview/CAPABILITY_CENSUS.md`).
Dati solo sintetici (campagna `lanterns`, scena `old-watch`, Livia/Doran/Mira, Sentinella,
Esploratore). Regole: SRD 5.2.1 EN/IT, pagine stampate.

## In breve, per il proprietario

- **Dove:** Campagna → Preparazione → **Incontri** (2 clic dalla campagna; DM). Al Tavolo il
  DM ha il cassetto **Incontro** (lettura ad alta voce, gruppi in attesa, “Aggiungi tutte le
  pedine”). Nella palette: “Apri il costruttore d’incontri”.
- **Cosa fa:** scegli il gruppo (quello della campagna o un gruppo tipo), filtri le creature
  SRD per GS, tipo e taglia, le aggiungi con il contatore +/− (iniziativa condivisa) o con
  “Aggiungi di nuovo” (iniziativa separata). La difficoltà 2024 (Facile/Media/Difficile, nomi
  del SRD italiano) si aggiorna subito con budget e fonte. Un gruppo “Rinforzi” può restare in
  attesa e lo attivi al Tavolo, anche a combattimento iniziato.
- **Consegna alla scena:** “Prepara nella scena” usa gli stessi comandi della Preparazione:
  crea i PNG e le pedine numerate (o con aggettivi), nasconde i nomi ai giocatori, PF medi o
  tirati (dadi digitali o fisici) e scrive l’incontro preparato della scena. Poi tiri
  l’iniziativa (un solo tiro per gruppo di creature identiche) e “Avvia combattimento…” apre
  il dialogo di avvio che esisteva già.
- **Blocco 2024:** blocco completo, modificabile in linea; il testo cambiato diventa una
  proposta d’azione che conta solo dopo “Conferma azione”; i tiri hanno dado digitale o
  fisico e vanno nel registro dei tiri. L’attacco in mischia confermato diventa l’attacco
  della creatura al Tavolo.
- **Correzione dal card:** l’accettazione (1) chiede “GS ≤ 1 e Umanoide; quattro goblin”. Nel
  SRD 5.2.1 i goblin sono **Folletti (goblinoidi)**, non Umanoidi (EN p. 290 / IT p. 340). Il
  percorso prova il filtro Umanoide (5 umanoidi, nessun goblin) e poi aggiunge i goblin dal
  tipo Folletto. Non abbiamo sostituito la regola 2014.

## File

Nuovi (miei): `design/blueprint/encounter-builder.mjs` (registrazione e interfaccia),
`design/blueprint/encounter-builder-domain.mjs` (dominio puro, senza DOM),
`design/blueprint/encounter-builder.css` (prefisso `.eb-`),
`design/blueprint/tests/encounter-builder.test.mjs` (19 test),
`changes/interview-01/blueprint-checks/encounter-builder-journey.js`, questo rapporto.

Modifica condivisa (una sola, additiva): `design/blueprint/preparation.mjs` — aggiunta la
parola `export` (e un commento) a `recordInitiativeResult`, così il tiro di gruppo scrive nello
stesso registro dell’iniziativa della Preparazione invece di duplicarne il formato. Firma e
comportamento invariati. `extensions.mjs` elencava già l’area.

Integrazioni con altre aree, solo tramite le loro funzioni pubbliche e dentro lo stesso commit:
`token-menu.mjs` `setNameHidden` (B12, nomi nascosti), `loot.mjs` `createParcel` /
`addParcelItem` / `cleanGearFromStatBlock` / `updateParcel` (B26, bottino), `compendium.mjs`
`recordRoll` (B16, registro dei tiri), `party-stash.mjs` `partyMembers` (gruppo della
campagna), `srd-compendium.mjs` (piani dei dadi, `srdMeleeProfile`), `preparation.mjs`
`createSceneNPC` / `placeSceneToken` / `removeSceneToken` / `getPreparedEncounter` flow.

## Capacità → percorso → prova

| Capacità (censimento)                                    | Percorso nell’app                                                                                                                                                                             | Comandi e risultato                                                                                                                                                                                                                                                                                                                                                                        | Regola / fonte                                                                                                                                                  | Pattern adottato                                                                                                                          | Prova                                                                                                             |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PR-33 Difficoltà 2024 in tempo reale con budget e gruppo | Incontri → editor: pannelli Gruppo e Difficoltà 2024                                                                                                                                          | 4 Goblin guerriero vs Livia/Doran/Mira liv. 3 → **Facile**, 200 PE su 450/675/1.200; gruppo tipo 4×liv.1 → 200/300/400; rinforzi contati (225)                                                                                                                                                                                                                                             | Budget di PE per personaggio EN 202 / IT 230–231; PE per GS EN 256 / IT 291; la fascia “primo budget non superato” è una lettura dell’app, dichiarata a schermo | Kobold+ strategia 2024 e pannello gruppo (CMP-106, CMP-107); DDB Maps difficoltà 2024 (DDB-097); dnd5e Encounter (FVT-089)                | test “difficulty…”, “groups…”; percorso check 1; `b19-02-four-goblins-it-1440.png`                                |
| PR-34 Catalogo filtrabile con anteprima del blocco       | colonna Creature: ricerca, GS min/max, tipo, taglia, chip rimovibili, riga che si espande nel blocco, badge “Facile da sola”                                                                  | GS ≤ 1 + Umanoide = Popolano, Bandito, Cultista, Guardia, Esploratore; nessun goblin                                                                                                                                                                                                                                                                                                       | Tipi di creatura EN 179 / IT 218; goblin Folletti EN 290 / IT 340                                                                                               | DDB Monster picker (DDB-091) e chip dei filtri (DDB-092); filtri Kobold+ (CMP-108); anteprima DDB Token Browser (DDB-115)                 | test “picker…”; percorso check 1; `b19-01-filter-humanoid-it-1440.png`; telefono: tocco sulla riga apre il blocco |
| PR-35 Quantità con iniziativa condivisa o individuale    | riga con −/numero/+ e badge; pulsante “Aggiungi di nuovo”                                                                                                                                     | +×3 (clic), Invio su “+” e Spazio su “−”; “Aggiungi di nuovo” crea una riga “Iniziativa separata” (250 PE); Opzioni → Rimuovi                                                                                                                                                                                                                                                              | Un solo tiro per un gruppo di creature identiche EN 13 / IT 14                                                                                                  | DDB contatore +/- e “Add” di nuovo (DDB-093)                                                                                              | test “counter…”; percorso checks 1–2                                                                              |
| PR-36 Gruppi in attesa e rinforzi                        | “+ Gruppo” → “Rinforzi” in attesa; “Aggiungi al gruppo”; al Tavolo cassetto Incontro → “Attiva gruppo…”                                                                                       | pedine in attesa nascoste e fuori dall’ordine; attivazione con d20 fisico 18 (+1) → entra nell’ordine al posto giusto, il turno corrente non cambia, il giocatore ora la vede                                                                                                                                                                                                              | pareggi decisi dal GM (EN 13 / IT 14): i nuovi vanno dopo i pari                                                                                                | Battle Board gruppi “Staged” (VTL-085)                                                                                                    | test “staged reinforcements…”; percorso check 3/5; `b19-06-drawer-activated-it-1440.png`                          |
| PR-37 Libreria: duplica, riavvia, riprendi               | I miei incontri: ricerca, ordinamento, stato, Modifica, Avvia/Riprendi, Altre azioni (Duplica, Riavvia…, Elimina…), Cronologia; “Incontri preparati nelle scene” → “Riprendi nel costruttore” | l’incontro dell’Inc.2 (Livia 14+2, Sentinella 9+2, salvato dall’editor della scena) si riapre con i tiri intatti e li conserva dopo “Prepara nella scena”; “In corso” → Riprendi apre il Tavolo; Duplica → “(copia)”; Riavvia sostituisce le 5 creature, rimette in attesa i Rinforzi, conserva il registro dell’iniziativa; eliminati/riavviati in Cronologia con “Ripristina come copia” | —                                                                                                                                                               | DDB My Encounters Run/Resume/Duplicate/Restart (DDB-095, DDB-096); storico Kobold+ (CMP-111); 5e.tools salva/carica nel tracker (CMP-118) | test “increment-2…”, “library…”; percorso checks 4a e 4; `b19-07-library-it-1440.png`                             |
| PR-38 Note, lettura ad alta voce, tesoro                 | “Note, lettura ad alta voce e tesoro”; al Tavolo il testo da leggere nel cassetto; “Prepara il bottino”                                                                                       | 5 pacchetti di bottino nascosti, uno per creatura con equipaggiamento, legati alla pedina, con la nota del tesoro                                                                                                                                                                                                                                                                          | Gear dei mostri recuperabile EN 255 / IT 291 (regola di B26)                                                                                                    | DDB Summary/Treasure (DDB-094); Shieldmaiden promemoria bottino (CMP-120); pacchetti FG/Owlbear via B26                                   | test “treasure…”; percorso (lettura ad alta voce, bottino)                                                        |
| PR-39 Incontro dalle pedine con lati                     | cassetto Incontro → “Aggiungi tutte le pedine”; in libreria “Dalle pedine di una scena…”                                                                                                      | Gruppo (Livia, Doran, Mira; il budget usa loro), Nemici (Sentinella, creature del costruttore), PNG; il cestino (Elimina) conserva le pedine                                                                                                                                                                                                                                               | —                                                                                                                                                               | DDB “Add All Tokens” (DDB-134)                                                                                                            | test “Add All Tokens…”; percorso check 6; `b19-08-from-tokens-it-1440.png`                                        |
| PR-42 Blocco 2024 completo con modifica in linea e tiri  | nome della riga → Blocco statistiche → “Modifica in linea” (Invio salva, Esc annulla)                                                                                                         | CA, iniziativa, PF+formula, velocità (m in IT, ft in EN), caratteristiche con prova/TS cliccabili, GS (PE, BC); copia personalizzata rev. 1→2, la riga usa la copia; tiro fisico d20 12 → 17 nel registro dei tiri                                                                                                                                                                         | struttura del blocco EN 254–255 / IT 289–290                                                                                                                    | Roll20 NPC Stat Block 2024 in linea (R20-102); DDB blocco con tiri (DDB-146, DDB-168)                                                     | test “parser…”, “UI: stat block…”; percorso check 7; `b19-03-statblock-edit-roll-it-1440.png`                     |
| PR-43 Testo convertito in azioni cliccabili              | testo dell’azione cambiato o “Nuova azione dal testo” → “Riconosciuto dal testo” → “Conferma azione” / “Lascia come testo”                                                                    | “Tiro per colpire in mischia: +5, portata 1,5 m… 6 (1d8 + 2) danni taglienti” → proposta; niente tiri prima della conferma; dopo: “Colpire +5”, “Danni 1d8+2” e l’attacco “Falcetto” al Tavolo tra le azioni della creatura                                                                                                                                                                | formato SRD EN/IT e parafrasi dell’app; effetti aggiuntivi restano testo                                                                                        | FG parser (R20-113); Shard monster actions (VTL-089)                                                                                      | test “parser…”; percorso checks 7 e avvio                                                                         |
| PR-44 Pedine numerate, PF tirati, nomi nascosti          | “Al tavolo”: Numeri/Aggettivi, “Nascondi i nomi ai giocatori”, PF medi / dadi digitali / dadi fisici                                                                                          | “Goblin della lanterna 1–4”; i giocatori vedono “Creatura sconosciuta N” (il DM vede entrambi); PF fisici 4+4+4 = 12; digitali con facce registrate; Annulla ripristina la scena                                                                                                                                                                                                           | PF: media o formula, mai entrambi EN 255 / IT 290; morte del mostro a 0 PF EN 17 / IT 19                                                                        | Token Mold (FVT-094); aggettivi Clash! (VTL-120); nomi nascosti via B12                                                                   | test “hand-off…”, “hand-off HP…”; percorso checks 5 e giocatore; `b19-05-player-table-it-1440.png`                |
| PR-45 Pedina predefinita vs servitore                    | Opzioni della riga → “Creatura unica collegata”                                                                                                                                               | una sola pedina senza numero; al Riavvio torna lo **stesso** PNG (con il suo stato), le altre righe restano copie indipendenti                                                                                                                                                                                                                                                             | —                                                                                                                                                               | Roll20 barre collegate/non collegate (R20-101); Persistent Tokens (VTL-082)                                                               | test “unique linked creature…”                                                                                    |
| PR-46 Blocco caricato dal nome                           | righe da pedine o da incontro della scena; “Collega un blocco” / “Scollega”                                                                                                                   | “Esploratore” carica il blocco Esploratore (caricato dal nome); “Goblin guerriero 3” e “Daring Goblin Warrior” → Goblin guerriero; “Sentinella” resta senza GS e fuori dal totale finché il DM collega “Guardia”                                                                                                                                                                           | —                                                                                                                                                               | Clash! caricamento dal nome (VTL-083); Game Master’s Grimoire (VTL-084)                                                                   | test “Add All Tokens…”; percorso checks 4a e 6                                                                    |

Consegna al flusso esistente (non un sistema parallelo): `handOff` usa `createSceneNPC` +
`placeSceneToken` + `scene.encounter.participants` della Preparazione; il tiro di gruppo usa
`recordInitiativeResult` (una voce per creatura, stesso `sharedGroup`); “Avvia
combattimento…” chiama `ctx.startEncounter`, cioè lo stesso dialogo e `startPreparedEncounter`.
Il test prova anche che l’editor della scena accetta i tiri scritti dal costruttore senza
registrare correzioni (`saveSceneDraft`).

## Comandi ed esiti

- `node --test design/blueprint/tests/encounter-builder.test.mjs` → **19/19**.
- `node --test design/blueprint/tests/*.test.mjs` → **1071/1071** (suite completa, 24/09).
- Percorso nel browser (Playwright CLI, sessione `d20-b19`, cwd
  `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B19/`, server
  `http://127.0.0.1:8879/`):
  `playwright-cli -s=d20-b19 --raw run-code --filename=…/blueprint-checks/encounter-builder-journey.js`
  → **11/11 gruppi di controlli**, nessun `pageerror`. Contiene: preparazione Inc.2 con i
  controlli dell’editor della scena; filtri, clic, Invio/Spazio; blocco in linea con Esc e
  Invio; tiro fisico; consegna digitale → **Annulla** → consegna con dadi fisici; iniziativa di
  gruppo, correzione rifiutata senza motivo e accettata con motivo; **reload** (l’editor e i
  tiri restano; il ruolo demo riparte da giocatore); avvio; **vista giocatore** (alias, niente
  rinforzi, niente cassetto) e DM; attivazione; libreria; bottino; pedine → incontro; contesto
  isolato **EN 390 px con tocco** (libreria, nuovo incontro, ricerca, blocco, +, “Low”,
  consegna, Tavolo del giocatore) senza overflow orizzontale.
- Immagini 1440×900 (ispezionate): `b19-01-filter-humanoid-it-1440.png`,
  `b19-02-four-goblins-it-1440.png`, `b19-03-statblock-edit-roll-it-1440.png`,
  `b19-04-handoff-initiative-it-1440.png`, `b19-05-player-table-it-1440.png`,
  `b19-06-drawer-activated-it-1440.png`, `b19-07-library-it-1440.png`,
  `b19-08-from-tokens-it-1440.png`; telefono `b19-09-phone-en-390.png`, nella cartella di
  evidenza sopra. Sono prove di percorsi già verificati, non prova da sole. Dopo
  l’ispezione ho corretto: nomi delle abilità nel blocco (erano gli id inglesi), migliaia
  raggruppate come nel SRD (“1.200”), pedine automatiche distanziate di una casella per
  leggere le etichette, correzione dell’iniziativa raccolta in “Correggi con il dado fisico…”.

## Limiti onesti

- **Il card sbagliava il tipo dei goblin** (vedi sopra): il costruttore segue il SRD 5.2.1.
- Il catalogo è il campione SRD del blueprint (32 creature), non l’intero SRD; nessun
  generatore automatico (CMP-110/117 restano in conflitto, come nel censimento).
- Solo gli **attacchi in mischia** confermati diventano azioni del motore di combattimento del
  Tavolo (è l’unico profilo NPC che il motore accetta); attacchi a distanza e tiri salvezza del
  blocco si tirano dal blocco (registro dei tiri), senza applicare danni. Il parser riconosce
  tiro per colpire, portata/gittata e il primo termine di danno; effetti aggiuntivi,
  ricariche e incantesimi restano testo per il DM.
- Modificare un blocco **dopo** la consegna non aggiorna i PNG già creati (niente “Apply Token
  Defaults” di Roll20): servono Riavvia o nuove copie.
- Riavvia azzera l’iniziativa di **tutti** i partecipanti dell’incontro preparato della scena
  (anche i personaggi), perché la scena ha un solo ordine; il registro conserva ogni tiro.
- La fascia di difficoltà per un totale è una lettura dell’app, dichiarata a schermo; con
  livelli misti si somma il budget di ogni personaggio (come `srd-sample.mjs`).
- Il punteggio fisso d’iniziativa dei mostri (EN 254 / IT 290) non è offerto: il registro
  accetta solo tiri digitali o fisici e non vogliamo registrare un finto tiro.
- Le bozze degli incontri sono modifiche private del DM (funzionano senza rete); consegna,
  iniziativa, attivazione e bottino sono modifiche condivise e senza rete vengono rifiutate
  (provato nei test Node, non nel browser).
- Le pedine vengono posizionate automaticamente in una zona fissa della scena (nemici in alto a
  destra, rinforzi in basso a destra) e il DM le sposta poi con i comandi esistenti; il
  cortile ha muri, quindi un rinforzo può comparire sul bordo esterno.
- Nomi degli attori (compresi gli alias “Creatura sconosciuta N”) sono dati nella lingua in
  cui sono stati creati, come nel resto dell’app.
- Tavolo del DM a 390 px: l’overflow orizzontale preesistente della barra in alto (vedi
  rapporto B11b) cresce con ogni cassetto d’area, compreso “Incontro”; non corretto qui
  (`styles.css`). Il Tavolo del giocatore e le pagine del costruttore a 390 px non hanno
  overflow.
- Stato locale a questo browser: nessun backend, nessuna sincronizzazione tra DM e giocatori.

## Review fixes

24/09/2026, stessa area B19. Ho verificato ogni rilievo della revisione (codice, test o
browser), corretto tutti i P1 e P2 e i P3 economici. Ogni correzione copia il pattern già
citato dal rilievo; nessuna interazione inventata.

### In breve, per il proprietario

- **L’ordine d’iniziativa ora segue i totali.** Esempio della revisione: goblin 3+2, Livia
  14+2, Doran 20, Mira 12. Prima il combattimento partiva con i goblin; ora la lista del
  costruttore, il dialogo di avvio e il Tavolo mostrano Doran 20, Livia 16, Mira 12,
  Sentinella 11, goblin 5. I rinforzi attivati con un 18 (+1 = 19) entrano subito dopo Doran.
  A parità decide il DM con Anticipa/Posticipa, come in Preparazione.
- **“Aggiungi tutte le pedine” funziona davvero** (DDB-134): mette le creature visibili
  nell’ordine d’iniziativa della scena, resta sul Tavolo e mostra l’incontro nel cassetto. Un
  secondo clic aggiorna lo stesso incontro invece di crearne un doppione. Il pulsante è
  spento se la scena non ha pedine visibili.
- **Blocco 2024 completo**: vulnerabilità, resistenze, immunità (danni e condizioni) ed
  equipaggiamento, anche nel cassetto del Tavolo. La modifica in linea copre ora ogni
  sezione.
- **Fasce di difficoltà come Kobold+** (CMP-106): Banale, Facile, Media, Difficile, Mortale.
  Quattro goblin contro Livia, Doran e Mira sono **Banale**, non più “Facile”.
- **Riavvia** accetta anche i dadi fisici e riporta in forze le stesse creature al loro
  posto. I tiri dei personaggi restano, a meno che il DM non li azzeri.

### Rilievo → verifica → correzione → prova

| #     | Rilievo                                                          | Verifica                                                                                                                                                                                                                                                                                        | Correzione (pattern)                                                                                                                                                                                                                                                                                                                                                                                                 | Prova                                                                                                                                       |
| ----- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-1  | L’iniziativa preparata non veniva ordinata                       | Confermato nel codice: `handOff` aggiungeva i partecipanti in ordine di creazione, `recordGroupInitiative` non riordinava, e `startPreparedEncounter` usa l’ordine così com’è                                                                                                                   | `sortParticipants`: ordina per totale, stabile, con i gruppi a tiro condiviso uniti e i non tirati in fondo. Parte dopo ogni tiro o correzione, consegna, attivazione e riavvio. La lista mostra l’ordine della scena con posizione e totale. Anticipa/Posticipa valgono solo a parità (`moveTiedGroup`, SRD EN 13 / IT 14). “Ordina per iniziativa” compare se l’ordine è cambiato altrove, come nella Preparazione | test “builder rolls sort…” (scenario del revisore; bandito a indice 1), “ties…”; percorso: lista, dialogo di avvio `b19-10`, `combat.order` |
| P1-2  | L’incontro dalle pedine era “Preparato” ma non si poteva avviare | Confermato: `handoff {copies: []}` senza partecipanti                                                                                                                                                                                                                                           | `encounterFromTokens` scrive i partecipanti come `handOff` (`prepareActorRows`). Riusa l’incontro dalle pedine della scena. Esclude le pedine nascoste e le conta. Con un combattimento in corso cambia solo la lista. `encounterStatus` guarda i partecipanti reali. `initiativeGroups` raggruppa per riga d’origine: ogni incontro mostra le proprie creature, le altre sono segnate “altro incontro della scena”  | test “Add All Tokens: … rolls and start”, “… updates the scene’s one encounter”; percorso check 6                                           |
| P1-3  | Il blocco non era il 2024 completo                               | Confermato (Scheletro senza vulnerabilità, immunità, equipaggiamento)                                                                                                                                                                                                                           | `blockHTML` aggiunge Vulnerabilità, Resistenze, Immunità (danni; condizioni) ed Equipaggiamento con l’ordine e i nomi di `compendium.statBlock`. Aggiunge anche CD e ricarica “–”. Il PNG porta `damageDefenses`. Il cassetto “Incontro” mostra i blocchi, con tiri, e avvisa che le difese si applicano a mano                                                                                                      | test “stat block: 2024 defenses…”; percorso `b19-12`, cassetto `b19-11`                                                                     |
| P2-4  | Fasce diverse da Kobold+                                         | Confermato: Kobold+ `strategy.js` DnD2024 (letto oggi da GitHub) usa `< low` Trivial, `< moderate` Low, `< high` Moderate, `< 1,5×high` High, altrimenti Deadly                                                                                                                                 | `bandFor` con le stesse soglie. Etichette IT Banale/Mortale; Facile/Media/Difficile restano quelle del SRD. La nota a schermo cita CMP-106. Il misuratore ha il segno “Mortale ≥”                                                                                                                                                                                                                                    | test “difficulty…” (0, 449, 450, 525, 1.199, 1.200, 1.800); percorso check 1 “Banale”, telefono “Trivial”                                   |
| P2-5  | Riavvia senza dadi fisici                                        | Confermato                                                                                                                                                                                                                                                                                      | Il dialogo offre Medi / digitali / fisici. Con i fisici, `planRestart` elenca le creature da riportare in forze e quelle da creare, poi apre lo stesso dialogo dei PF usato dalla consegna                                                                                                                                                                                                                           | test “UI edit form … restart dialog”; percorso: 14 facce, `b19-13`                                                                          |
| P2-6  | Niente suggerimenti di condizione né vantaggio                   | Confermato                                                                                                                                                                                                                                                                                      | Riuso di `initiativeConditionHint` della Preparazione (esportata). Ogni gruppo sceglie Normale/Vantaggio/Svantaggio: col dado digitale tira 2d20 e tiene il più alto o il più basso; col fisico il DM inserisce il dado tenuto. Il registro salva `rollMode` e le facce. L’indebolimento resta nel bonus dichiarato, come in Preparazione                                                                            | test “ties…” (vantaggio), “UI initiative list…” (Invisibile → suggerimento, avviso toast)                                                   |
| P2-7  | “Aggiungi tutte le pedine” duplicava e portava via dal Tavolo    | Confermato                                                                                                                                                                                                                                                                                      | Dal cassetto resta sul Tavolo, aggiorna lo stesso incontro e dice cosa ha fatto. Un secondo clic senza novità viene rifiutato. Il pulsante è spento senza pedine visibili. “Apri nel costruttore” è un’azione separata                                                                                                                                                                                               | test “Table drawer: Add all tokens…”; percorso check 6                                                                                      |
| P2-8  | Il focus cadeva su `<body>`                                      | Confermato nel browser                                                                                                                                                                                                                                                                          | Dopo ogni nuovo disegno il focus torna allo stesso controllo, ritrovato dai suoi attributi (`focusSelector`); per chip e righe rimosse va al sostituto indicato. Opzioni restano aperte; i campi di testo salvano dopo che il focus è passato al controllo successivo. Trovato verificando: il timer della ricerca rubava il focus → ora lo rende solo a chi sta ancora scrivendo                                    | test “focus: …”; percorso: Invio su espandi/Aggiungi, filtro, Lato, chip, Tira d20, Aggiungi tutte le pedine                                |
| P2-9  | Modifica in linea parziale; lingua non allineata                 | Confermato (testo EN vecchio accanto ai nuovi tiri)                                                                                                                                                                                                                                             | Si modificano tratti, azioni, azioni bonus, reazioni, TS, abilità (“Furtività +6”), sensi, lingue, difese, immunità alle condizioni ed equipaggiamento (togliere un oggetto lo toglie anche dal bottino). Un testo cambiato vale per entrambe le lingue ed è marcato “testo in italiano” nell’altra                                                                                                                  | test “edit in place: every 2024 section…”, “UI edit form…”; percorso check 7 e telefono EN                                                  |
| P3-10 | Riavvio lasciava stato vecchio                                   | Confermato                                                                                                                                                                                                                                                                                      | Copia di DDB Restart: le stesse creature tornano in forze nello stesso posto, con lo stesso nome, alias e pedina. Nessun PNG orfano, gli alias non salgono, le righe dalle pedine restano valide. Quando una copia esce dalla mappa, il suo alias viene liberato. Una riga di pedina sparita è segnata “Non più sulla scena” e resta fuori dal totale                                                                | test “library… restart”; percorso check 4 (stessi id, 6 PF, alias uguali, tiri dei PG intatti)                                              |
| P3-11 | Etichetta danni incompleta                                       | Confermato (Mazza del Sacerdote)                                                                                                                                                                                                                                                                | L’etichetta mostra tutti i termini: “Danni 1d6+3 + 2d4”, come il compendio                                                                                                                                                                                                                                                                                                                                           | test “stat block…”                                                                                                                          |
| P3-12 | Etichette sovrapposte, pedina sul muro                           | Confermato; verificando ho visto anche una pedina fuori dal cortile                                                                                                                                                                                                                             | `freeCell` distanzia secondo la larghezza dell’etichetta e resta lontano dai muri (scena e disegno del cortile). Scarta anche le caselle oltre un muro, così le pedine restano nella stanza del punto d’arrivo. I rinforzi arrivano nella stanza laterale                                                                                                                                                            | test “placement…”; percorso (tutte dentro il cortile, etichette separate); `b19-05`                                                         |
| P3-13 | Nota sui goblin a schermo                                        | Confermato                                                                                                                                                                                                                                                                                      | Tolta dal prodotto (resta qui e nel test del filtro)                                                                                                                                                                                                                                                                                                                                                                 | test “stat block…”; percorso check 1                                                                                                        |
| P3-14 | Testo della scheda e del censimento                              | Confermato ma fuori dai miei file (`CAPABILITY_CENSUS.md` è del coordinatore). Proposta: accettazione 1 → “filtro GS ≤ 1 e Umanoide (nessun goblin: nel SRD 5.2.1 sono Folletti); quattro goblin dal tipo Folletto”; PR-33 → “(Facile/Media/Difficile nel SRD IT; Banale e Mortale di Kobold+)” | Non modificato: da applicare dal coordinatore                                                                                                                                                                                                                                                                                                                                                                        | —                                                                                                                                           |

Scelte e rilievi non presi alla lettera:

- **P1-3, riuso di `compendium.statBlock`/`openRollDialog`:** non l’ho fatto. Quelle
  funzioni cercano la voce SRD per id (`getEntry`), quindi non conoscono i blocchi
  personalizzati. Estenderle vorrebbe dire riscrivere un file condiviso di un’altra area.
  Ho aggiunto le righe mancanti con lo stesso ordine e le stesse etichette. I tiri usano già
  lo stesso servizio (`rollPlan`, `recordRoll`, un solo registro).
- **P2-6, indebolimento:** resta un suggerimento da includere nel bonus dichiarato, come nel
  flusso esistente della Preparazione. Il catalogo dichiara manuali queste condizioni.
- **Resistenze ai danni al Tavolo:** il motore di combattimento (`combat.mjs`, non mio) non
  le applica. Il cassetto lo dice e mostra il blocco.

Modifiche condivise, entrambe additive: `preparation.mjs` → aggiunta la parola `export` a
`initiativeConditionHint` (con un commento). Firma e comportamento invariati. Resta l’export
di `recordInitiativeResult` del primo giro.

Queste righe sostituiscono le parti già scritte sopra:

- “Facile/Media/Difficile … primo budget non superato” → ora valgono le fasce Kobold+.
- “Riavvia sostituisce le 5 creature” e “Riavvia azzera l’iniziativa di tutti i
  partecipanti” → ora le stesse creature tornano in forze e i PG tengono il loro tiro.
- “pedine … in una zona fissa … un rinforzo può comparire sul bordo esterno” → ora le pedine
  evitano i muri e restano nella stanza del punto d’arrivo.

### Comandi ed esiti

- `node --test design/blueprint/tests/encounter-builder.test.mjs` → **29/29** (9 nuovi
  test; 4 aggiornati alle nuove regole: difficoltà, “Add All Tokens”, riavvio).
- `node --test design/blueprint/tests/*.test.mjs` → **1343/1343** (suite completa, 24/09;
  il totale riflette anche i lavori paralleli delle altre aree).
- `prettier --check` sui miei file e su `preparation.mjs` → pulito.
- Percorso nel browser (sessione `d20-b19`, cwd
  `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B19/`):
  `encounter-builder-journey.js` aggiornato → **12/12 gruppi di controlli**, nessun
  `pageerror`. Due esecuzioni consecutive hanno passato tutti i controlli. Nuovi controlli:
  - focus dopo filtro, Invio su espandi e su Aggiungi, Opzioni → Lato, chip, Tira d20 e
    Aggiungi tutte le pedine;
  - blocco dello Scheletro, modifica di ogni sezione e resistenza al fuoco;
  - ordine della lista, dell’ordine preparato, del dialogo di avvio e di `combat.order`;
  - bandito subito dopo Doran e pedine nel cortile, lontane dai muri;
  - riavvio con dadi fisici;
  - cassetto “Aggiungi tutte le pedine”, secondo clic rifiutato e blocchi nel cassetto;
  - telefono EN: “Trivial” e “text in Italian”.
- Nuove immagini (ispezionate): `b19-10-start-dialog-sorted-it-1440.png`,
  `b19-11-drawer-from-tokens-it-1440.png`, `b19-12-skeleton-block-it-1440.png`,
  `b19-13-restart-physical-it-1440.png`. Rigenerate: da `b19-01` a `b19-09`. Da
  `b19-05` in poi le pedine sono tutte dentro il cortile.

### Limiti rimasti

- Nella stanza laterale del cortile c’è posto per un solo rinforzo con l’etichetta lontana
  dalle altre. Dal secondo rinforzo le pedine stanno in caselle vicine e le etichette possono
  toccarsi. Il DM le sposta con i comandi del Tavolo.
- L’attivazione dei rinforzi (“Attiva gruppo…”) offre ancora solo il tiro normale. Il
  rilievo sul vantaggio riguardava la lista d’iniziativa.
- Il riordino a parità lavora sull’ordine preparato, prima dell’avvio. A combattimento in
  corso l’ordine si cambia con i comandi del Tavolo.
