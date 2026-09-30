# B62 (parte A) — Dove stanno i comandi dopo le 48 aree: prove

25–26/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · sessioni browser `d20-ia` (misure e prove ad hoc) e `d20-ia-sweep` (percorsi) ·
server `http://127.0.0.1:8879/` senza cache · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-26/IA/` (fuori dal checkout). Solo dati
sintetici. Regola per chi costruisce: [piano del registro §5.3](blueprint-registry-plan.md).

Con tutte le aree costruite, i comandi erano cresciuti per somma: il DM aveva 21 schede nella
barra del Tavolo, 24 sezioni di campagna in fila, 11 sezioni di Preparazione, 11 schede nella
scheda personaggio, 29 voci nel menu della pedina e due barre in basso. B62 non cambia cosa fanno
le aree: cambia **dove** stanno, copiando come li raggruppano i prodotti di riferimento. Ogni
area dichiara il suo posto con un campo del registro, controllato da un elenco chiuso; il codice
dell'app disegna i gruppi.

## In breve

- **Tavolo, barra a destra**: da 21 schede (DM) e 14 (giocatore) a **9 e 7**, nell'ordine delle
  schede di Foundry: Creatura, Chat, Combattimento, Scena, Esplorazione, Diario, Oggetti, Tabelle
  e mazzi, Consultazione (revisione: Oggetti prima di Diario, come in Foundry; vedi R-5). I pannelli di una scheda sono sottoschede in alto (per esempio Chat →
  Registro | Dadi | Sicurezza). A 1366 × 768 tutte le schede stanno nella barra; «Tutti i
  pannelli» elenca tutto per gruppo e ha l'interruttore «Nella barra» per togliere una scheda
  (per identità). Ogni pannello resta a ≤ 2 clic.
- **Barra della campagna**: 5 gruppi richiudibili (Campagna, Racconto, Mondo, Gioco, Gestione
  DM — «Strumenti» per il giocatore). All'inizio è aperto solo «Campagna»: il DM vede **7**
  sezioni (erano 24 in fila, 9 sotto la piega a 1440), il giocatore **6** (erano 20). Lo stato
  dei gruppi è ricordato; il gruppo della sezione aperta è sempre aperto.
- **Preparazione**: 11 sezioni diventano **4 gruppi** (Scene, Incontri, Materiali, Sessioni e
  avventure) con le sezioni del gruppo aperto in una seconda striscia.
- **Scheda personaggio**: 11 schede diventano le **7 categorie di D&D Beyond** (Azioni, Magie,
  Inventario, Capacità, Storia, Note, Extra); le schede delle aree sono sottosezioni (per esempio
  Extra → Extra | Tempo libero | Bastione).
- **Menu della pedina**: da 29 voci (DM) e 17 (giocatore), con scorrimento, a **12 e 10 senza
  scorrimento**. In cima i comandi frequenti; il resto in sottomenu con nome: Azioni, Aspetto,
  Visibilità, Bottino, Strumenti DM («Altro» per il giocatore). Le scorciatoie restano.
- **In basso**: una sola barra alla BG3 invece di due. A sinistra ritratto e risorse, al centro
  le pagine «Azioni | Barra rapida», a destra i comandi del turno con Termina turno grande in
  fondo. A 1440 la zona in basso passa da **293 a 115 px** e la mappa da **418 a 586 px**. In
  combattimento il Tavolo sta tutto in 1440 × 900 senza scorrere la pagina. Sul telefono la
  mappa in vista è il **64 %** dello schermo.
- **Un solo «Cerca»** (SRD 5.2.1 «Ricerca [azione]», EN p. 187, IT p. 212): un tiro di Saggezza
  (Percezione) che trova creature nascoste, trappole entro 3 m e, in esplorazione, contenitori e
  oggetti entro 4,5 m. Prima c'erano tre pulsanti: «Cerca…», «Cerca trappole», «Cerca qui».
- **Suggerimenti del primo ingresso spenti** di default; l'aiuto resta su richiesta (Aiuto,
  giro guidato).

## Modelli copiati

Il censimento di mercato è in `changes/interview-01/market-census/`. Per ogni posto:

| Posto                | Modello                                                                                                                                                      | Voci del censimento                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Barra del Tavolo     | Le schede della barra laterale di Foundry (chat, combattimento, scene, attori, oggetti, diario, tabelle, compendi); la barra di Maps di D&D Beyond           | FVT-007, DDB-133, R20-053          |
| Sottoschede          | Le schede del documento di Foundry dentro la barra; l'elenco rapido di D&D Beyond accanto alle sezioni                                                       | FVT-007, DDB-060                   |
| «Nella barra»        | Le impostazioni personali di Roll20; le superfici fisse di Owlbear (le aggiunte si attaccano a posti noti, non creano barre)                                 | R20-195, VTL-231                   |
| Barra della campagna | L'elenco dei moduli nella barra laterale di Kanka e la scelta dei moduli per campagna; le liste a gruppi di Fantasy Grounds                                  | CMP-23, CMP-24, R20-071            |
| Preparazione         | Le cartelle della barra di Foundry; la barra delle pagine di Roll20                                                                                          | FVT-007, R20-127                   |
| Scheda personaggio   | Le sezioni della scheda di D&D Beyond e i filtri dentro una sezione (Capacità: Tutte, Classe, Specie, Talenti)                                               | DDB-027, DDB-053, DDB-026          |
| Menu della pedina    | Il Token HUD di Foundry (pochi comandi attorno alla pedina, il resto in pannelli) e il menu della pedina di D&D Beyond (sottomenu per colore, dimensione, …) | FVT-119, DDB-117                   |
| Barra in basso       | La barra delle azioni e la barra delle risorse di BG3; le pagine della barra delle macro di Foundry                                                          | CRP-098, CRP-099, FVT-194, FVT-195 |
| Barra del telefono   | La barra di navigazione in basso delle app per telefono                                                                                                      | VTL-008                            |
| Suggerimenti         | Roll20 ha tolto i pop-up delle novità per i nuovi utenti e li ha messi in una scheda; i giri guidati di Foundry partono su richiesta                         | R20-003, FVT-006                   |

Distinguo le fonti: le voci del censimento sono capacità pubblicate e documentate. Che i gruppi
di Kanka si possano richiudere e ricordare è una sua capacità pubblica, ma la riga CMP-23 cita
solo l'elenco dei moduli: quel dettaglio è una mia deduzione dal prodotto, non una voce del
censimento. Nessun gruppo inventato: dove un prodotto non ha un posto preciso, ho preso il più
vicino tra quelli citati.

## Prima e dopo

Misure con lo script `scripts/measure.js` della cartella delle prove (`before/`, `after/`):
stessi dati di esempio, primo ingresso, Livia selezionata. «Nella barra» = schede che la barra
mostra senza scorrere; «sopra la piega» = sezioni visibili senza scorrere né aprire nulla.

| Misura                                | 1440 × 900 prima | 1440 × 900 dopo | 1366 × 768 prima | 1366 × 768 dopo | 390 × 844 prima | 390 × 844 dopo         |
| ------------------------------------- | ---------------- | --------------- | ---------------- | --------------- | --------------- | ---------------------- |
| Schede del Tavolo, DM (nella barra)   | 21 (16)          | 9 (9)           | 21 (13)          | 9 (9)           | 21 (3 + Tutti)  | 9 (3 + Tutti)          |
| Schede del Tavolo, giocatore          | 14 (14)          | 7 (7)           | 14 (13)          | 7 (7)           | 14 (3 + Tutti)  | 7 (3 + Tutti)          |
| Barre in basso / altezza              | 2 / 293 px       | 1 / 115 px      | 2 / 341 px       | 1 / 115 px      | 2 / 262 px      | 1 / 153 px             |
| Mappa (quota della finestra)          | 418 px (46 %)    | 586 px (65 %)   | 358 px (47 %)    | 454 px (59 %)   | 460 px          | 544 px in vista (64 %) |
| Menu della pedina DM: voci, scorre?   | 29, sì           | 12, no          | 29, sì           | 12, no          | —               | 12, sì (sheet)         |
| Menu della pedina giocatore           | 17, sì           | 10, no          | 17, sì           | 10, no          | —               | 10, sì (sheet)         |
| Sezioni di campagna DM (sopra piega)  | 24 (15)          | 24 (7)          | 24 (13)          | 24 (7)          | 24 (3)          | 24 (1 + gruppi)        |
| Sezioni di campagna giocatore         | 20 (15)          | 20 (6)          | 20 (13)          | 20 (6)          | 20 (3)          | 20 (1 + gruppi)        |
| Preparazione (DM)                     | 11 sezioni       | 4 gruppi        | 11 sezioni       | 4 gruppi        | 11 sezioni      | 4 gruppi               |
| Scheda personaggio                    | 11 schede        | 7 categorie     | 11 schede        | 7 categorie     | 11 (3 in vista) | 7 (3 in vista)         |
| Suggerimento al primo ingresso        | sì               | no              | sì               | no              | sì              | no                     |
| Voci «Cerca» (menu / scheda Creatura) | 2 / 1–3          | 1 / 1           | 2 / 1–3          | 1 / 1           | — / 2–3         | 1 / 1                  |

Note sulle misure:

- «Menu della pedina, 390 prima»: lo script non apriva il menu con il clic destro simulato su un
  telefono; dopo sì (pressione lunga nel percorso B62). Sul telefono il menu è un foglio dal basso
  alto al massimo 606 px: con 12 voci scorre di 141 px (DM) e 53 px (giocatore).
- «Sezioni di campagna, 390»: sul telefono la barra è una striscia orizzontale e la pagina si
  apre sul titolo della sezione, sotto la striscia: i due numeri non sono confrontabili. Dopo,
  nella striscia i gruppi sono etichette che si aprono sul posto.
- In combattimento a 1440 × 900 (prova ad hoc con Livia al suo turno): la barra in basso è alta
  115–118 px qualunque creatura sia selezionata e la pagina non scorre (prima di B62 scorreva di
  82–106 px, misure di W2b1). La mappa in combattimento è alta 510 px (cede la riga dell'ordine
  dei turni).
- Schermate: `before/` e `after/` (Tavolo, menu della pedina, campagna, Preparazione, scheda per
  ogni dimensione e ruolo); percorso B62 in `runs/b62-ia/journey/`.

## Cosa cambia, posto per posto

1. **Barra del Tavolo** (`table-panel.section`). Ogni pannello d'area dichiara la sua scheda. La
   scheda della sezione apre l'ultimo pannello usato di quel gruppo; premuta di nuovo torna a
   Creatura. Le sottoschede sono vere schede (frecce, Home, Fine) e ricordano l'ultima scelta.
   Un pannello non mostrato come sottoscheda conserva una maniglia nascosta, quindi il codice
   d'area che apre `[data-table-drawer="<id>"]` funziona ancora. Sul telefono le sottoschede di
   Chat restano fissate sopra il foglio del Registro, così Dadi e Sicurezza sono a un tocco.
2. **Barra della campagna** (`campaign-section.group`, `rail-groups.mjs`). «Campagna» contiene
   Panoramica, Gruppo, Sessioni, Diario, Mondo, Archivio e (DM) Preparazione. L'Archivio sta qui
   perché è il wiki della campagna, usato ogni sessione: così il grafo delle relazioni di B58
   resta a tre clic da Campagna. Un gruppo si richiude e si riapre **sul posto**, senza
   ridisegnare la pagina: una bozza non salvata resta com'è (difetto trovato dal percorso delle
   missioni e corretto).
3. **Preparazione** (`preparation-section.group`). Prima striscia: i gruppi con il numero di
   sezioni; seconda: le sezioni del gruppo aperto. Un gruppo con una sola sezione la apre
   direttamente. «Tutte» elenca per gruppo. Con un solo gruppo resta la striscia di prima.
4. **Scheda personaggio** (`sheet-tab.category`). Sette categorie; una categoria con più membri
   mostra le sottosezioni. L'indirizzo `tab=` accetta la categoria o la sottosezione, quindi i
   collegamenti delle aree (per esempio `tab=party-bastion`) funzionano ancora.
5. **Menu della pedina** (`token-menu.submenu`). In cima: Condizioni, Apri la scheda, Centra,
   Aggiungi alla selezione, Punti ferita, Esamina, Cerca; poi i sottomenu con il numero di
   comandi. Un sottomenu con un solo comando mostra direttamente il comando (per esempio
   «Bottino»). Freccia destra apre, freccia sinistra ed Esc tornano indietro; un secondo Esc
   chiude il menu.
6. **In basso**. Una barra: identità e risorse; pagine «Azioni» (azioni della creatura, Scatto,
   Schivata, Disimpegno, «Mosse» di B40) e «Barra rapida» (B53), ricordate per identità; comandi
   del turno. Dal computer le azioni stanno in al massimo due righe (le altre scorrono dentro la
   barra) e Termina turno è alto quanto le due righe dei comandi: la barra non cambia altezza
   quando cambia la creatura selezionata, quindi niente salta sotto il puntatore (difetto trovato
   con il doppio clic sull'ordine dei turni). In combattimento la mappa cede l'altezza della riga
   dei turni. Sul telefono «Mosse» resta fissato alla fine della striscia con la sua etichetta.
7. **Un solo «Cerca»**. B46 tira una volta; lo stesso tiro è passato alle trappole di B41
   (`searchForTrapsWithRoll`, entro 3 m) e ai punti di ricerca di B45 (`searchPointsWithRoll`,
   solo in esplorazione). I pulsanti propri di B41 e B45 si nascondono quando B46 c'è. Il
   messaggio nomina solo ciò che questo tiro ha scoperto; «niente di sospetto» non dice se c'era
   qualcosa (come B41 e B45). Le contromisure di una trappola (Intelligenza (Indagare)) restano
   l'azione Studiare, come nell'SRD.
8. **Suggerimenti**: l'impostazione personale `home-tips.enabled` parte spenta; Aiuto e il giro
   guidato del Tavolo restano disponibili.

## Percorsi aggiornati per la collocazione

65 percorsi esistenti cambiano solo il modo di arrivare al comando: le attese su ciò che il
comando fa restano identiche. Tre attese di **misura** non avevano più senso con la nuova
collocazione: le dichiaro sotto, con quella che le sostituisce. Aiutanti in cima agli script
(vedi `blueprint-checks/README.md`): `openTablePanel`, `toggleLog`,
`menuPick`/`menuItemById`/`revealMenuItem`, `openCampaignSection`, `openPrepSection`,
`openSheetTab`, `showQuickbar`, `firePreview`.

- **Barra del Tavolo** (scheda, poi sottoscheda; Chat › Registro): account, annotations,
  annotations-review-fixes, assistant, assistant-review-fixes, b11b-inc10-fixes,
  b61-table-structure, b61-review-fixes, campaign-data, campaign-members-review,
  campaign-settings, chat, chat-review-fixes, combat-tracker, combat-tracker-review,
  compendium, damage-tray, dice-3d, dice-tray, dice-tray-review, encounter-builder, fog-vision,
  fog-vision-review, handouts, home, knowledge, knowledge-review, loot, loot-review,
  loot-review2, media, media-review, media-review2, party, preferences, quests, quests-review,
  random-tables, regions, safety, scene-assets, scene-assets-review, session-view,
  sessions-plus, special-moves, token-menu, travel, travel-review, w2a1-shell, w2b1-shell,
  w2b2-shell, world-map, world-map-review.
- **Menu della pedina** (il comando è nel suo sottomenu; Esc torna prima all'elenco, un secondo
  Esc chiude): annotations, annotations-review-fixes, fog-vision, handouts, integrations,
  knowledge, knowledge-review, loot, loot-review, loot-review2, media-review2, scene-assets,
  session-view, token-menu, w2b2-shell.
- **Barra della campagna** (si apre prima il gruppo chiuso): account, assistant,
  assistant-review-fixes, assistant-review-fixes-2, b61-review-fixes, campaign-data,
  campaign-settings, community, handouts, homebrew-editor, integrations, quests, safety,
  w2a1-shell, w2a2-shell, w2b2-shell, world-map. relations-graph non cambia: l'Archivio è nel
  gruppo aperto.
- **Preparazione** (gruppo, poi sezione, o «Tutte»): encounter-builder, handouts, loot,
  loot-review, random-tables, w2b2-cross.
- **Scheda** (categoria, poi sottosezione): character-library, character-library-review, home,
  media, party, projects, w2a2-shell.
- **Un solo «Cerca»**: knowledge-review, regions, travel, travel-review, w2b2-shell.
- **Barra in basso**: combat-mobile (la barra delle azioni è fissata in vista sopra le schede,
  invece che subito dopo la mappa), quickbar e quickbar-review (pagina «Barra rapida»;
  l'anteprima avviata da uno slot si legge dallo stato della barra, perché il pulsante premuto è
  nella pagina «Azioni»).
- **Geometria** (mappa più alta): annotations (il «ping» si sposta di 60 unità sullo stesso
  bordo: il punto di prima cade sotto i pulsanti dello zoom), handouts (sul telefono si tocca
  l'etichetta della puntina: il segnaposto cade sotto gli strumenti della mappa).
- **Attese di misura sostituite**, dichiarate:
  - w2b1-shell e b61-review-fixes: B61 chiedeva i comandi del dock «su una riga» di una barra a
    tutta larghezza, con la barra delle azioni sopra. Ora i comandi sono la colonna destra della
    barra unica. L'attesa diventa: una sola barra, al massimo 120 px (le due barre di B61
    facevano 293 px), al massimo due righe di comandi.
  - b61-review-fixes: dalla Home, una sezione di un gruppo chiuso costa un clic in più (Campagna,
    gruppo, sezione = 3); dentro la barra della campagna resta ≤ 2. È la conseguenza diretta dei
    gruppi richiudibili chiesti; vedi «Questioni aperte».
  - home: «Sali di livello» si cerca nella categoria Capacità di una seconda scheda del browser
    (stessi dati salvati, stessa identità), per non chiudere l'offerta del prossimo personaggio.
- Non B62: projects legge le righe dell'inventario come `.invp-row` (B36, ondata W2b1).
- **Nuovo**: `b62-ia-journey.js`, 4 gruppi: DM 1440, giocatore 1440, DM 1366 × 768, telefono EN
  390 al tocco.

## Esecuzioni

Tutte le esecuzioni usano copie reindirizzate (`scripts/prep.sh`, `scripts/run.sh`: ogni
percorso limitato da un allarme di 240 s) e scrivono in `runs/<percorso>/`; le cartelle dei
costruttori non sono toccate.

- **Giro 1** (`results-sweep1.txt`, durante l'adattamento): 86/131 verdi. I rossi erano quasi
  tutti percorsi non ancora adattati alla nuova collocazione; li ho aggiornati e rieseguiti uno
  per uno (`results-run2.txt` … `results-run5.txt`).
- **Giro finale** (`results-sweep2.txt`, tutti i 131 percorsi più `b62-ia`, nell'ordine del giro
  1): **126/132 verdi**, compreso `b62-ia` (10 gruppi di controlli). I 6 rossi **non dipendono da
  B62**: dati di esempio o comportamenti di altre ondate (W2b1, W2b2) che quei percorsi non
  seguono ancora; nessuno dei sei risultava verde dopo quelle ondate:

  | Percorso        | Dove si ferma                                                                                  | Causa (non B62)                                                                                                             | Verifica                                                                                                |
  | --------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
  | party           | «Monete di Iria 0 mo» sul Bastione                                                             | B38 (W2b1) dà a Iria 150 mo nei dati di esempio                                                                             | variante con la borsa di Iria svuotata all'inizio: **verde 9/9**, Extra › Bastione compreso             |
  | quests          | le monete della ricompensa (50 mo attese)                                                      | B36 (W2b1) dà a Livia 30 mo: la ricompensa porta a 80                                                                       | variante con 80: **verde 21/21**                                                                        |
  | travel          | «mangia una razione»: attesa una riga con 1                                                    | B36 (W2b1) dà a Livia 4 razioni nello zaino                                                                                 | variante che conta il totale (6 → 5) e la scheda «5 giorni»: **verde 12/12**, il «Cerca» unico compreso |
  | integrations    | il tiro libero dal Tavolo                                                                      | B34 (W2b1): «Tira i dadi» apre il vassoio, non la finestra del tiro libero; anche il testo inoltrato è cambiato             | variante con il vassoio: passa il tiro, si ferma sul testo per Avrae (formato di B34)                   |
  | homebrew-editor | Termina turno resta bloccato                                                                   | B41 (W2b2): all'inizio del turno della Sentinella un evento di regione attende la decisione del DM                          | nessuna variante; ultimo verde in W2a2, prima di B41                                                    |
  | preferences     | telefono 390 con testo 150 % e interfaccia 125 %: la scheda (Azioni, Storia) allarga la pagina | contenuti di B40 (tabella delle azioni generiche), B37 (note della scheda) e B43 (reputazione) troppo larghi a quella scala | il passo non era mai stato raggiunto dopo W2a2 (il percorso si fermava prima); ora ci arriva            |

- Varianti (non nel repository): `variants/*-variant-wrapped.js`, esiti in
  `results-variants.txt` e `runs/<percorso>-variant/`, rieseguite sul codice finale.
- Misure: `before/measure.json`, `after/measure.json` (ripetute sul codice finale, identiche).

## Test Node

Suite completa `node --test design/blueprint/tests/*.test.mjs`: **2059/2059** verdi (prima di
B62: 2046). Nuovo `tests/ia-consolidation.test.mjs` (13 test, con tutte le aree caricate come
nell'app): tassonomie chiuse e rifiuto dei valori sconosciuti; il posto dichiarato da ogni area;
9/7 schede con le sottoschede e le maniglie nascoste; la barra unica in basso; il menu della
pedina a ≤ 12 voci con i sottomenu e le scorciatoie; il «Cerca» unico (un tiro, una riga nel
registro, trappola e punto trovati con lo stesso totale, niente di già noto nel messaggio);
i gruppi della campagna, della Preparazione e della scheda; la geometria della barra in basso e
il gruppo che si richiude senza ridisegnare la pagina. Aggiornati per la collocazione:
`help` (suggerimenti spenti di default), `character-library`, `projects`, `token-menu`,
`w2a2-integration`, `w2b1-integration` e la fixture `sample-extension` (gruppo «campaign»).

## Questioni aperte e limiti

- **Sezioni della campagna dalla Home**: con i gruppi chiusi, una sezione di «Racconto»,
  «Mondo», «Gioco» o «Gestione DM» costa 3 clic dalla Home (Campagna, gruppo, sezione) invece dei
  2 di B61; dentro la barra della campagna resta ≤ 2, e il gruppo aperto è ricordato. Tenere 2
  dalla Home vuol dire gruppi aperti di default (24 voci in fila per il DM) oppure una scorciatoia
  nella Home: è una scelta di prodotto per il proprietario.
- **Azioni oltre due righe**: dal computer la barra in basso mostra al massimo due righe di
  azioni; con molte azioni (Livia in combattimento a 1366) «Mosse» finisce nella terza riga, che
  si raggiunge scorrendo la barra o con Tab. A 1440 le otto azioni di Livia stanno in due righe.
  (Revisione: corretto, R-1 — «Mosse» ha una colonna propria e a 1366 le azioni stanno in due
  righe.)
- **Barra rapida e pagina «Azioni»**: uno slot che avvia un'azione mostra l'anteprima sulla mappa
  e nella scheda Creatura, ma il pulsante premuto è nella pagina «Azioni», nascosta mentre si usa
  la barra rapida. I tasti 1–0 della barra rapida funzionano anche quando è aperta l'altra pagina
  (come le scorciatoie di BG3).
- **Telefono**: il Registro resta il foglio a tutto schermo di B17 (sopra le schede in basso);
  Dadi e Sicurezza sono raggiungibili dalle sottoschede fissate in alto, gli altri pannelli
  chiudendo il foglio. Il menu della pedina è un foglio dal basso e con 12 voci scorre un poco
  (revisione: corretto, R-2).
- **«Cerca»**: la correzione del tiro fatta dal pannello di B41 ricalcola solo la trappola, non
  creature e punti di ricerca; i punti di B45 si cercano solo in esplorazione (in combattimento
  «Cerca» è l'azione del turno per creature e trappole).
- **Non B62, da assegnare**: i 6 rossi della tabella sopra (dati di esempio di W2b1 che
  contraddicono tre percorsi, il vassoio dei dadi di B34 in integrations, l'evento di regione di
  B41 in homebrew-editor, la scheda troppo larga a 150 %/125 % sul telefono).
- **Limiti delle prove**: dati sintetici, un solo browser senza interfaccia (Chrome), nessuna
  prova con persone reali. Le misure sono del primo ingresso con i dati di esempio.

## File

Codice (`design/blueprint/`): `registry.mjs` (tassonomie e controlli), `table.mjs`,
`app.mjs`, `rail-groups.mjs` (nuovo), `preparation.mjs`, `session-prep.mjs`, `characters.mjs`,
`token-menu.mjs`, `knowledge.mjs`, `regions.mjs`, `regions-domain.mjs`, `travel.mjs`,
`travel-domain.mjs`, `home.mjs`, `help.mjs`, `styles.css`, `combat.css`, `characters.css`,
`preparation.css`, `token-menu.css`; metadati di collocazione nelle aree `adventures`,
`annotations`, `assistant`, `campaign-data`, `campaign-members`, `campaign-settings`,
`character-library`, `chat`, `combat-tracker`, `community`, `compendium`, `dice-3d`,
`dice-tray`, `encounter-builder`, `fog-vision`, `handouts`, `homebrew-editor`, `integrations`,
`loot`, `media`, `party`, `projects`, `quests`, `random-tables`, `safety`, `scene-assets`,
`session-view`, `special-moves`, `world-map`. Documenti: `DEVELOPMENT.md` («Information
architecture (B62)»), [piano del registro](blueprint-registry-plan.md) §2.2, §5.1–§5.3,
`blueprint-checks/README.md`. Test e percorsi: come sopra.

## Revisione e correzioni (review and fixes, revisione indipendente, 26/09/2026)

Revisore-correttore distinto dal costruttore · stesso worktree, nessun commit · sessione browser
`d20-ia-rf` · server `http://127.0.0.1:8879/` senza cache · prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-26/IA-rf/` (fuori dal checkout; le cartelle del
costruttore non sono toccate). Solo dati sintetici.

### Cosa ho controllato

- **Ogni punto d'ingresso delle 48 aree.** `scripts/inventory.mjs` carica le 48 aree come l'app
  e registra i 475 contributi (`inventory.json`). `scripts/audit.js` li cerca nell'app in 12
  configurazioni: 1440 × 900 e 1366 × 768 con il mouse, 390 × 844 al tocco, DM e giocatore,
  italiano e inglese. Gli esiti sono in `audit/*.json` (dopo le correzioni) e in
  `audit-before/*.json` (prima); la tabella per voce è `audit/summary.md`.
- **Regola severa**, come nella revisione di B61. Un comando conta come trovato solo se è
  disegnato, sta nello schermo in larghezza, nessuna striscia, barra, menu o colonna deve
  scorrere (di lato o in giù) per mostrarlo e niente lo copre al centro. Possono scorrere solo
  la pagina, il contenuto di un pannello e l'elenco di una finestra. Il clic cade al centro del
  controllo, senza l'aiuto di Playwright che porta in vista da solo.
- **Combattimento** a 1440 × 900, 1366 × 768 (e, fuori richiesta, 1280 × 720): ogni controllo
  della barra in basso, con Livia di turno, per giocatore e DM (`probes/combat*.js`).
- **Tastiera** (`probes/keyboard.js`, `probes/kb-rail.js`): barra del Tavolo, sottoschede,
  pagine della barra in basso, menu della pedina con i sottomenu, gruppi della campagna,
  strisce della Preparazione e della scheda; anello del fuoco; bersagli ≥ 40 px.
- **Un solo «Cerca»**: il codice (`knowledge.mjs` `openSearch`, `regions-domain.mjs`
  `searchForTrapsWithRoll`, `travel-domain.mjs` `searchPointsWithRoll`) confrontato con l'SRD
  5.2.1 nei PDF ufficiali (EN p. 187, IT p. 212).
- **Aderenza alle tassonomie citate**, voce per voce nel censimento.

### Problemi trovati e corretti

| #   | Gravità | Problema (prima della correzione)                                                                                                                                                                                                                                                                                                                             | Correzione (modello copiato)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1 | P2      | 1366 × 768 (il portatile più comune), in combattimento con Livia: **«Mosse» di B40** finiva nella terza riga delle azioni, che si vedeva solo scorrendo dentro la barra (`probes/combat.json`: «clipped-by .combat-actions»). A 1280 × 720 anche Schivata e Disimpegno. Era l'unico ingresso di B40 nella barra, ed era una questione aperta del costruttore. | «Mosse» sta in una **colonna propria accanto alle azioni** (`.combat-dock`), che non scorre mai: come le azioni comuni di BG3 (CRP-098), e come già sul telefono. Per non perdere righe, da 1280 a 1499 px il ritratto lascia la sua larghezza alle azioni (restano nome, turno e risorse) e sotto i 1440 px modalità dei dadi e «Tiri e risultati» mostrano solo il controllo e la campanella, come sul telefono (le parole restano il nome accessibile). A 1366 le sette azioni di Livia stanno in due righe, la barra resta alta 115–118 px e la pagina non scorre. |
| R-2 | P2      | Telefono: il **menu della pedina** era un foglio alto al massimo il 72 % dello schermo (606 px). Il DM sulla Sentinella aveva 747 px di voci: **Visibilità, Bottino e Strumenti DM** stavano sotto la piega; il DM su Livia perdeva Strumenti DM, il giocatore su Livia «Scheda esterna…».                                                                    | Il foglio cresce fino all'altezza dello schermo meno 24 px (i fogli dal basso di Material si allungano fino allo schermo quando il contenuto lo chiede). Le 12 voci del DM e le 10 del giocatore si vedono tutte, IT ed EN.                                                                                                                                                                                                                                                                                                                                            |
| R-3 | P2      | Telefono, DM: la colonna di **«Strumenti del DM»** partiva accanto al suo pulsante, l'ultimo del gruppo, e scendeva sotto la barra in basso che B62 ha fissato: **Regioni e trappole (B41)** e **Punto di ricerca (B45)** erano coperti finché non si scorreva la pagina.                                                                                     | La colonna degli strumenti del gruppo attivo parte dalla **cima della barra degli strumenti**, come i controlli di scena di Foundry. Sul telefono i cinque strumenti del DM stanno tra 287 e 495 px, sopra la barra in basso (che parte a 627). Sul computer la colonna è la stessa, solo più in alto per i gruppi in fondo.                                                                                                                                                                                                                                           |
| R-4 | P2      | Tastiera: nella scheda e in Preparazione, scegliere una categoria, una sottosezione, un gruppo, una sezione o una voce di «Tutte» ridisegnava la pagina e il **fuoco cadeva sul documento** (`probes/keyboard.json`: «BODY»). Con i due livelli di B62 chi usa la tastiera doveva ripartire dall'inizio della pagina per raggiungere le sottosezioni.         | Dopo il ridisegno il fuoco torna sul controllo scelto (dalla voce di «Tutte», sulla sezione aperta), con l'anello visibile, come già fanno le schede del Tavolo. Tab porta poi alla voce successiva.                                                                                                                                                                                                                                                                                                                                                                   |
| R-5 | P3      | La barra del Tavolo metteva Diario prima di Oggetti; il costruttore dichiarava l'ordine di Foundry, che (FVT-007: chat, combattimento, scene, attori, oggetti, diario, tabelle, compendi) ha Oggetti prima di Diario.                                                                                                                                         | Ordine corretto: Creatura, Chat, Combattimento, Scena, Esplorazione, **Oggetti, Diario**, Tabelle e mazzi, Consultazione.                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Le correzioni partono dai test. `tests/review-fixes-b62.test.mjs` ha 4 test, tutti rossi prima
delle modifiche: R-1 (colonna `.combat-dock` fuori dalle azioni che scorrono, nessuna colonna
vuota senza B40, regole del computer, del portatile e del telefono), R-2 (altezza del foglio),
R-3 (colonna ancorata alla barra), R-5 (ordine). R-4 vive nel ridisegno della pagina, che Node
non esegue: prima della correzione la sonda della tastiera trovava il fuoco su «BODY», dopo il
percorso nuovo lo trova sul controllo scelto.

### Conteggio dei clic dopo le correzioni

Clic o tocchi dal contesto naturale, il migliore per area (DM 1440 / 1366 / 390 · giocatore
1440 / 1366 / 390; «—» = non esiste per quel ruolo). Tavolo: dal Tavolo; campagna: dalla pagina
della campagna; Preparazione e scheda: dalla loro pagina; Biblioteca: dalla Biblioteca; servizi:
da qualsiasi pagina. Sul telefono le schede, i gruppi e le categorie fuori dalla striscia si
raggiungono con «Tutti i pannelli» / «Tutte le sezioni» / «Tutte» (sempre 2). IT ed EN danno gli
stessi numeri. La tabella completa, voce per voce, è `audit/summary.md`.

| Area                  | Ingresso migliore (e altri)                                                                                   | DM        | Giocatore |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| B12 menu della pedina | clic destro / pressione lunga; comandi in cima 2, nei sottomenu 3; «Pedine» nella scheda Creatura 1           | 1 · 1 · 1 | 1 · 1 · 1 |
| B13 membri            | Campagna › Gestione DM (Strumenti) › Membri; riquadro «Le tue campagne» in Inizio                             | 2 · 2 · 2 | 2 · 2 · 2 |
| B14 sessione          | Scena › Sessione (e il pulsante sulla mappa, 1)                                                               | 2 · 2 · 2 | —         |
| B15 materiali         | Diario › Materiali; Preparazione › Materiali 2; spillo 2                                                      | 1 · 1 · 2 | 1 · 1 · 2 |
| B16 compendio         | Biblioteca › Compendio SRD; Consultazione › Schermo del DM                                                    | 1 · 1 · 1 | 1 · 1 · 1 |
| B17 chat              | scheda Chat (Registro); Racconto › Discussioni, Archivio chat 2                                               | 1 · 1 · 1 | 1 · 1 · 1 |
| B18 annotazioni       | Puntatore 1; Disegna, Sagoma, Scena › Annotazioni 2; Aura e Quota nei sottomenu 3                             | 1 · 1 · 1 | 1 · 1 · 1 |
| B19 incontri          | Preparazione › Incontri; al Tavolo Combattimento › Incontro 2                                                 | 1 · 1 · 1 | —         |
| B20 impostazioni      | Gestione DM › Impostazioni; Gioco › Regole della tavola 2; «Chi può modificare la scheda» in Azioni 1         | 1 · 1 · 1 | 1 · 1 · 1 |
| B21 libreria pers.    | Personaggi nella navigazione; Note › Registro e Revisioni nella scheda 2                                      | 1 · 1 · 1 | 1 · 1 · 1 |
| B22 preferenze        | servizio Preferenze nell'intestazione                                                                         | 1 · 1 · 1 | 1 · 1 · 1 |
| B23 palette           | servizio Cerca (e Ctrl+K)                                                                                     | 1 · 1 · 1 | 1 · 1 · 1 |
| B24 notifiche         | campanella                                                                                                    | 1 · 1 · 1 | 1 · 1 · 1 |
| B25 tabelle e mazzi   | scheda Tabelle e mazzi; Preparazione 2; pedina a più facce 2                                                  | 1 · 1 · 2 | 1 · 1 · 2 |
| B26 bottino           | Oggetti › Bottino (DM); «Monete» nella scheda Creatura e Inventario 1; Gioco › Tesoro 2; Bottino nel menu 2   | 1 · 1 · 1 | 1 · 1 · 1 |
| B27 sicurezza         | Chat › Sicurezza; Gioco › Sicurezza                                                                           | 2 · 2 · 2 | 2 · 2 · 2 |
| B28 media             | «Immagine della pedina» nella scheda Creatura; Biblioteca 1; Diario › Immagini e file 2; Mondo › Allegati 2   | 1 · 1 · 1 | 1 · 1 · 1 |
| B29 account           | servizio Account                                                                                              | 1 · 1 · 1 | 1 · 1 · 1 |
| B30 Inizio e aiuto    | Inizio; Aiuto nell'intestazione (al Tavolo sul telefono nel menu App, 2); nessun suggerimento non chiesto     | 1 · 1 · 1 | 1 · 1 · 1 |
| B32 tracker           | scheda Combattimento                                                                                          | 1 · 1 · 1 | 1 · 1 · 1 |
| B33 danni             | PF nella scheda Creatura; «Punti ferita…» nel menu 2                                                          | 1 · 1 · 1 | 1 · 1 · 1 |
| B34 vassoio dei dadi  | «Tira i dadi» nella barra in basso; Chat › Dadi 2                                                             | 1 · 1 · 1 | 1 · 1 · 1 |
| B35 nebbia e visione  | gruppo Nebbia › strumento; Scena › Visione; «Visione e luce…» nel menu (giocatore 2, DM 3)                    | 2 · 2 · 2 | 2 · 2 · 2 |
| B36 inventario        | scheda › Inventario; «Armi e munizioni» nella scheda Creatura                                                 | 1 · 1 · 1 | 1 · 1 · 1 |
| B37 valori derivati   | scheda › Azioni; «Velocità ed effetti» nella scheda Creatura                                                  | 1 · 1 · 1 | 1 · 1 · 1 |
| B38 magie             | scheda › Magie                                                                                                | 1 · 1 · 1 | 1 · 1 · 1 |
| B39 creazione         | scheda › Inventario (dotazione) e Capacità (livelli); Personaggi › Nuovo                                      | 1 · 1 · 1 | 1 · 1 · 1 |
| B40 mosse speciali    | «Mosse» nella barra in basso (R-1); scheda Creatura 1; righello 2; Regole di movimento (DM) 2                 | 1 · 1 · 1 | 1 · 1 · 1 |
| B41 regioni           | Strumenti del DM › Regioni e trappole (R-3 sul telefono); Preparazione › Scene › Regioni 2; «Cerca» unico     | 2 · 2 · 2 | —         |
| B42 mappa del mondo   | Esplorazione › Mondo; Mondo › Mappa e calendario 2                                                            | 1 · 1 · 2 | 1 · 1 · 2 |
| B43 missioni          | Campagna › Archivio; Diario › Missioni 2; Racconto › Missioni 2                                               | 1 · 1 · 2 | 1 · 1 · 2 |
| B44 gruppo            | Campagna › Panoramica e Gruppo; Creatura › Riepilogo del gruppo (DM) 2; Extra › Bastione (con una base) 2     | 1 · 1 · 1 | 1 · 1 · 1 |
| B45 viaggio           | «Luce e ricerca» nella scheda Creatura; Esplorazione › Viaggio 2; strumenti del DM 2                          | 1 · 1 · 1 | 1 · 1 · 1 |
| B46 conoscenza        | scheda Creatura; Esamina e Cerca nel menu 2; Linea di vista 2; Nasconditi e Nascondi identità nei sottomenu 3 | 1 · 1 · 1 | 1 · 1 · 1 |
| B47 scene avanzate    | scheda Scena; Preparazione 2; «Metti fuori mappa» nel sottomenu 3                                             | 1 · 1 · 2 | 1 · 1 · 2 |
| B48 homebrew          | Biblioteca › Le mie creazioni; Gioco › Homebrew 2; scheda › Azioni 1                                          | 1 · 1 · 1 | 1 · 1 · 1 |
| B49 avventure         | Biblioteca › Avventure; Preparazione › Sessioni e avventure 2                                                 | 1 · 1 · 1 | —         |
| B50 dati              | Gestione DM › Dati della campagna                                                                             | 2 · 2 · 2 | —         |
| B51 sessioni          | Campagna › Sessioni (blocchi dentro la sezione)                                                               | 1 · 1 · 2 | 1 · 1 · 2 |
| B52 offline           | servizio Connessione e offline                                                                                | 1 · 1 · 1 | 1 · 1 · 1 |
| B53 barra rapida      | pagina «Barra rapida» della barra in basso; caselle 2 (sul telefono 7–0 scorrono: P3 di B53)                  | 1 · 1 · 1 | 1 · 1 · 1 |
| B54 progetti          | Extra › Tempo libero; Capacità › Doni; Gioco › Tempo libero                                                   | 2 · 2 · 2 | 2 · 2 · 2 |
| B55 integrazioni      | Gestione DM (Strumenti) › Integrazioni; «Scheda esterna…» nel menu (DM 3, giocatore 2)                        | 2 · 2 · 2 | 2 · 2 · 2 |
| B56 dadi 3D           | impostazioni dei dadi animati in Preferenze; la prova è nel vassoio di B34 (Chat › Dadi 2)                    | 1 · 1 · 1 | 1 · 1 · 1 |
| B57 generatori        | «Genera…» in Preparazione › Scene (la sezione di partenza); palette 2                                         | 1 · 1 · 1 | —         |
| B58 grafo             | Archivio › Relazioni › Grafo 3 dalla campagna (immutato da B62, P3); palette 2                                | 2 · 2 · 2 | 2 · 2 · 2 |
| B59 comunità          | «Trova un tavolo» in Inizio; Gestione DM › Reclutamento 2                                                     | 1 · 1 · 1 | 1 · 1 · 1 |
| B60 assistente        | Gestione DM (Strumenti) › Assistente; scheda del Tavolo solo se il DM lo attiva                               | 2 · 2 · 2 | 2 · 2 · 2 |

Voci che dipendono dallo stato (una selezione multipla, un appunto da incollare, una scena in
presentazione, danni da applicare, una base, una scala vicina, una trappola scoperta) non
compaiono con i dati di esempio: sono segnate «cond.» in `audit/summary.md`, non contate.

**Oltre 2**: solo i comandi dentro un sottomenu del menu della pedina (3: menu, sottomenu,
comando; 84 coppie voce-configurazione, per esempio Aura, Nascondi ai giocatori, Blocca) e il
grafo delle relazioni (3 dalla pagina della campagna, come prima di B62). Ogni area ha comunque
un ingresso a ≤ 2. Vedi «Aperti».

### Aderenza alle tassonomie citate (verificata nel censimento e nell'app)

- **Barra del Tavolo** (FVT-007): ora nell'ordine di Foundry (R-5). Due scostamenti dichiarati:
  Creatura per prima (scelta di B61: è l'ispettore della selezione) ed **Esplorazione**, che non
  ha una scheda in Foundry né negli altri prodotti citati (raccoglie viaggio, mappa del mondo e
  calendario; il nome viene dai tre pilastri del gioco, non da un prodotto). Lo segnalo come
  P3 per il proprietario, senza cambiarlo.
- **Scheda personaggio** (DDB-027/053): le sette categorie e il loro ordine sono quelli di D&D
  Beyond (Azioni, Magie, Inventario, Capacità e tratti, Storia/Background, Note, Extra). DDB-027
  però descrive i valori in cima alla scheda, non le sezioni: la fonte giusta è la pagina «Sheet
  Sections» che quella riga cita.
- **Menu della pedina** (FVT-119, DDB-117): pochi comandi in cima e il resto in sottomenu, come
  D&D Beyond (dimensioni e colori sono sottomenu); FVT-202 conferma «i comandi primari a un clic».
- **Barra in basso** (CRP-098/099): identità e risorse, azioni con le azioni comuni, Termina
  turno grande a destra. Dopo R-1 le azioni comuni d'area non scorrono mai via.
- **Barra della campagna** (CMP-23): l'elenco dei moduli di Kanka è in un gruppo per tema; che
  i gruppi si richiudano e si ricordino è una deduzione del costruttore, dichiarata come tale.
- **Suggerimenti** (R20-003, FVT-006): spenti di default in tutte le 12 configurazioni; Aiuto a
  1 clic (a 2 al Tavolo sul telefono, nel menu App).

### Un solo «Cerca» (SRD 5.2.1)

Verificato sui PDF: «Search [Action]» è a p. 187 dell'SRD inglese e «Ricerca [azione]» a p. 212
di quello italiano. L'azione è **una** prova di Saggezza; per una creatura o un oggetto nascosto
l'abilità è Percezione. `openSearch` tira una volta e passa lo stesso tiro accettato alle
trappole entro 3 m (`searchForTrapsWithRoll`, solo trappole non ancora scoperte né disinnescate)
e ai punti di ricerca entro 4,5 m (`searchPointsWithRoll`, solo fuori dall'iniziativa); una sola
azione spesa, una riga nel registro, il messaggio nomina solo ciò che il tiro ha scoperto. Le
contromisure restano l'azione Studiare (Intelligenza (Indagare)). Nessun difetto trovato.

### Tastiera, fuoco e bersagli

- Barra del Tavolo: frecce, Home e Fine spostano il fuoco, Invio apre (schede WAI-ARIA con
  attivazione manuale, `aria-orientation="vertical"`); Tab entra nelle sottoschede; Invio o Spazio
  sulla scheda aperta tornano a Creatura e il fuoco resta sulla scheda.
- Sottoschede e pagine della barra in basso: frecce e Invio; il fuoco resta sulla scelta.
- Menu della pedina: Maiusc+F10 apre sul primo comando; freccia destra o Invio aprono un
  sottomenu con il fuoco sul primo comando; freccia sinistra ed Esc tornano al sottomenu con il
  fuoco su di esso; un secondo Esc chiude e riporta il fuoco sulla pedina.
- Gruppi della campagna: Invio e Spazio aprono e chiudono sul posto, il fuoco resta; il gruppo
  della sezione aperta ha `aria-disabled`.
- Scheda e Preparazione: corretto con R-4.
- Anello del fuoco visibile (3 px) su ogni controllo provato. Nessun bersaglio sotto i 40 px in
  nessuna delle 12 configurazioni.

### Verifica

- **Test Node**: `node --test design/blueprint/tests/*.test.mjs` passa **2063 su 2063** (2059
  più i 4 nuovi).
- **Percorso della revisione**: `b62-review-fixes` passa 5 gruppi su 5 (7 controlli), senza
  errori di pagina (`runs/b62-review-fixes/`).
- **Verifica completa**: tutti i 132 percorsi del giro finale del costruttore, nello stesso
  ordine, più `b62-review-fixes`, come copie reindirizzate (`scripts/prep.sh`, `scripts/run.sh`,
  limite di 240 s ciascuno) sul codice finale: **127 su 133 verdi** (`results-sweep1.txt`). I 6
  rossi sono gli stessi del costruttore, per le stesse cause che non dipendono da B62 (party,
  quests, travel: dati di esempio di W2b1; integrations: il vassoio di B34; homebrew-editor:
  l'evento di regione di B41; preferences: la scheda troppo larga a 150 %/125 % sul telefono). Le
  varianti del costruttore per party, quests e travel, rieseguite qui, sono verdi (9/9, 21/21,
  12/12, `results-variants.txt`). Verdi, tra gli altri, `b62-ia` (10), `w2b1-shell` (8),
  `special-moves` (22), `quickbar`, `combat-mobile`, `token-menu` (19), `b61-table-structure`,
  `b61-review-fixes`, `annotations`, `regions`, `knowledge-review`, `w2b2-cross`,
  `character-library`, `projects` e `preparation`.
- **Prima e dopo**: `audit-before/` e `audit/` (12 configurazioni), `probes/combat.json` e
  `probes/combat-after.json`, `probes/keyboard.json`; schermate in `audit/`, `shots/` e
  `runs/b62-review-fixes/journey/`.

### Aperti (P3, non corretti)

- **Comandi nei sottomenu del menu della pedina a 3 clic** (menu, sottomenu, comando): Aura,
  Quota, Nasconditi, Visibilità, Blocca e simili. Prima di B62 erano a 2 ma in un menu che
  scorreva per 1491 px. D&D Beyond annida allo stesso modo dimensioni e colori; sul computer
  Roll20 e i menu di sistema aprono il sottomenu al passaggio del mouse, che toglierebbe un clic.
  Scelta per il proprietario.
- **Esplorazione** è una scheda senza modello di mercato (vedi sopra).
- **Grafo delle relazioni (B58)** a 3 clic dalla pagina della campagna (Archivio › Relazioni ›
  Grafo), come prima di B62; 2 con la palette.
- **Barra rapida sul telefono**: le caselle 7–0 scorrono di lato nella loro striscia (scelta di
  B53, non di B62).
- **1280 × 720** (fuori richiesta): con Livia in combattimento Schivata e Disimpegno restano in
  una terza riga che scorre e la pagina scorre di 25 px; «Mosse» ora è sempre in vista.
- **Suggerimento del turno di B32** («Tocca a te, Livia!» con «Ho capito»): è l'avviso del
  tracker, non un suggerimento del primo ingresso; resta.

### File toccati nella revisione

- `design/blueprint/combat-ui.mjs`: i comandi `dock` in `.combat-dock` accanto alle azioni.
- `design/blueprint/styles.css`: colonna `.combat-dock` (computer e telefono), ritratto e
  intestazione compatti da 1280 a 1499 / 1439 px, colonna degli strumenti ancorata alla barra.
- `design/blueprint/special-moves.css`: le regole di «Mosse» seguono la colonna.
- `design/blueprint/token-menu.css`: altezza del foglio sul telefono.
- `design/blueprint/registry.mjs`: Oggetti prima di Diario.
- `design/blueprint/characters.mjs`, `design/blueprint/preparation.mjs`: fuoco dopo la scelta.
- Test: `tests/review-fixes-b62.test.mjs` (nuovo, 4 test); `tests/ia-consolidation.test.mjs`
  (ordine) e `tests/w2b1-integration.test.mjs` («Mosse» nella colonna, non più «sticky»).
- Percorsi: `b62-review-fixes-journey.js` (nuovo); `b62-ia-journey.js` (ordine) e
  `w2b1-shell-journey.js` («Mosse» letto da `.combat-dock`).
- Documenti: questa sezione; `DEVELOPMENT.md` («Review fixes» in B62); [piano del registro](blueprint-registry-plan.md)
  §5.1 e §5.3; `blueprint-checks/README.md`.
