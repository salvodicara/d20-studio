# B43 — Missioni, fazioni, reputazione e diario strutturato: prove

24/09/2026 (cartella prove datata 2026-09-25). Area B43 del blueprint, costruita nel worktree
`codex/interview-01` in parallelo con le altre aree. Dati sintetici, simulazione locale a due
identità (giocatore e DM nello stesso browser): le proiezioni non sono un controllo d'accesso
di un server.

## File

Nuovi (tutti di B43): `design/blueprint/quests.mjs` (modulo d'ingresso: registrazione, regole
delle missioni, registro delle missioni, scheda del Tavolo, riquadro della scheda),
`design/blueprint/journal-plus.mjs` (pagine tipizzate, kit, blocchi segreti, collegamenti,
retro-collegamenti, menzioni, pagine annidate, viste, schede aperte, «Solo io», sezione
Archivio), `design/blueprint/factions.mjs` (reputazione, atteggiamenti SRD, relazioni e
connessioni segrete, dati per il grafo B58), `design/blueprint/journal-plus.css`,
`design/blueprint/tests/quests.test.mjs`, `tests/factions.test.mjs`,
`tests/journal-plus.test.mjs`, `changes/interview-01/blueprint-checks/quests-journey.js`.

**Nessun file condiviso modificato.** La scheda B43 prevedeva un'aggiunta al registro dei tipi
di voce di `campaign-content.mjs`: non è servita. Aggiungere tipi al Mondo del core avrebbe
rotto il suo editor (la tendina «Tipo di voce» ha valori fissi e riscriverebbe il tipo al
salvataggio). I tipi nuovi vivono nell'Archivio di B43, collegato alle voci del core (vedi
Limiti). Il percorso del browser si chiama `quests-journey.js` come chiesto dal compito (la
scheda diceva `quests-factions-journey.js`).

## Dove si trova (B61 e regola del registro §5.2)

| Punto              | Contributo                                                                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campagna, sezione  | **Missioni** (`quests`, ordine 42, dopo Diario): registro con schede In corso / Disponibili / Completate / Fallite, Nascoste solo DM, viste salvate come schede.                                                                    |
| Campagna, sezione  | **Archivio** (`quests-archive`, ordine 52, dopo Mondo): Pagine (indice ad albero + lettore con schede aperte), Reputazione, Relazioni, Viste.                                                                                       |
| Pagina di una voce | `quests.entry`: sulla pagina di una voce del Diario/Mondo del core, le pagine e missioni dell'archivio che la citano tra gli Elementi.                                                                                              |
| Tavolo             | Scheda della barra laterale **Missioni** (`quests-tracker`, icona spunta, ordine 35): missioni in corso e obiettivi; il DM spunta, il giocatore legge.                                                                              |
| Scheda personaggio | Riquadro nella scheda **Storia**: reputazione e atteggiamenti condivisi del personaggio e del gruppo.                                                                                                                               |
| Servizi            | Ricerca (proiettata per identità), tre comandi della palette (apri Missioni / Archivio / Reputazione), impostazione personale «Suggerisci collegamenti», protezione della bozza dell'editor. Nessun pulsante nuovo in intestazione. |

Raggiungibilità provata: Inizio → «Apri campagna» → Missioni → missione = 3 clic; Archivio e
Reputazione a 2–3 clic dalla campagna; su telefono dalla striscia delle sezioni.

## Capacità → percorso → prove

Comandi: `node --test design/blueprint/tests/journal-plus.test.mjs
design/blueprint/tests/factions.test.mjs design/blueprint/tests/quests.test.mjs` → **28/28**;
suite completa `node --test design/blueprint/tests/*.test.mjs` → **1540/1540** (24/09, dopo l’ultima modifica); percorso nel
browser (dalla cartella prove) `playwright-cli -s=d20-b43 --raw run-code
--filename=…/blueprint-checks/quests-journey.js` → `ok: true`, **21 controlli**, nessun
`pageerror` (esito salvato in `…/2026-09-25/B43/journey-result.json`). Chromium soltanto.

| Capacità (censimento)                                                         | Percorso nell'app                                                                                            | Esito provato (test Node · controllo del percorso)                                                                                                                                                                                                                                                                                                                                           | Regola / fonte                                                                                                                                                                                                                               | Pattern adottato (prodotto, ID)                                                                                                                                                                          | Prova visiva           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| CA-37 Missioni con obiettivi, stato, ricompense, committente (accettazione 1) | Campagna › Missioni › «Il sigillo spezzato»                                                                  | Obiettivi e sotto-obiettivi (un livello) spuntati dal DM, aggiunti con Invio; In corso → Completata, Annulla → In corso, Riapri con motivo obbligatorio (aggiornamento «Correzione»), Completata. Ricompensa segreta «Chiave d'ottone» mai proiettata al giocatore, anche dopo la chiusura. Monete consegnate a Livia: la scheda mostra 50 mo. · quests.test 2–4, 7; percorso A1, B1, B3, B4 | F-015: nessuna ricompensa automatica, nessun prossimo passo imposto; la consegna è un comando esplicito del DM (funzioni B26 `giveItemToActor`, `givePurse`)                                                                                 | Forien's Quest Log: schede per stato, Nascoste solo GM, obiettivi a spunta, committente, ricompense, note GM separate (FVT-058); diario BG3: elenco + dettaglio, aggiornamenti dal più recente (CRP-062) | b43-01, b43-03, b43-14 |
| CA-13 Blocchi segreti con rivelazione per blocco (accettazione 2)             | Missione o pagina › blocco «Segreto» › Rivela…                                                               | Rivelato a Doran: il giocatore non lo legge; a Livia: il suo giocatore lo legge marcato «Rivelato»; Nascondi di nuovo; a tutto il gruppo. Mai i destinatari al giocatore. · journal-plus.test 3; percorso B2                                                                                                                                                                                 | Destinatari = personaggi del gruppo; legge chi li controlla (`canControlActor`)                                                                                                                                                              | Foundry secret block + reveal (FVT-054) e «Show Players» a tutti o ai scelti (FVT-162, stessa finestra di B15); LegendKeeper /secret (CMP-56); post Kanka con visibilità (CMP-26)                        | b43-02                 |
| CA-38 Fazioni e reputazione per gruppo o personaggio (accettazione 3)         | Archivio › Reputazione (schermata DM) e pagina dell'organizzazione                                           | Livia presso Casa Varro −3 con motivo, nascosta; poi «Condivisa: solo la fascia» → il giocatore vede «Diffidente» e il motivo, mai il numero; gruppo +4 «Fidato» condiviso; Correggi con motivo riporta +3 lasciando entrambe le righe; riquadro sulla scheda Storia di Livia. · factions.test 2–4, 7; percorso E1, E2, E5                                                                   | Fasce −10…+10 (Ostile, Diffidente, Neutrale, Fidato, Alleato) autoriali, **non** regola D&D: nessun effetto sui tiri (F-042)                                                                                                                 | Schermata reputazione del GM di DOS2 (CRP-061); fasce, storia con motivi e visibilità di Bondsmith (R118, modulo Foundry); Crash's Tracking sulla scheda (FVT-042)                                       | b43-08, b43-09, b43-12 |
| CA-39 PNG importante con atteggiamento (accettazione 4, prima metà)           | Archivio › Tessa Varro (PNG importante) › Atteggiamento                                                      | Gruppo «Indifferente» condiviso; Livia «Ostile» con motivo, condiviso a scelta; tabella dei PNG importanti sulla schermata Reputazione. · factions.test 5; percorso E3                                                                                                                                                                                                                       | SRD 5.2.1 Amichevole/Indifferente/Ostile, EN 10, 177, 182–184 / IT 11, 203, 204, 208, 210 (PDF verificati con SHA-256; IT 202 corretto in 204 dalla review); effetto (vantaggio/svantaggio a influenzare) mostrato come testo, mai applicato | Flag «important NPC» di dnd5e (FVT-091), atteggiamenti del GM DOS2 (CRP-061)                                                                                                                             | b43-10                 |
| CA-40 Connessioni segrete rivelabili (accettazione 4, seconda metà)           | Pagina di Tessa › Relazioni › «paga in segreto» › Rivela…                                                    | Invisibile al giocatore finché il DM non la rivela a Livia; poi «Connessione segreta rivelata» sulla pagina e nei retro-collegamenti. · factions.test 6; percorso E3                                                                                                                                                                                                                         | —                                                                                                                                                                                                                                            | Scabard secret connections (CMP-83)                                                                                                                                                                      | b43-10, b43-15         |
| CA-14 / CA-15 Retro-collegamenti e suggerimenti confermati o disattivati (5)  | Pagina › «Collegamenti in entrata» e «Menzioni non collegate»                                                | Un link dentro un blocco segreto è retro-collegamento solo per chi lo legge; «Collega» trasforma «Casa Varro» dell'osservatorio in `[[Casa Varro]]`; «Ignora» ricordato per la coppia; interruttore personale che spegne ogni analisi. Suggerimenti solo al DM. · journal-plus.test 5–6, 13; percorso C2, C3                                                                                 | Conflitto S3: mai estrazione automatica, solo conferma dell'autore                                                                                                                                                                           | Obsidian backlinks con linked/unlinked mentions (CMP-88); sottolineatura LegendKeeper (CMP-59)                                                                                                           | b43-10                 |
| CA-24 Viste salvate (6, «Missioni aperte» a colonne)                          | Missioni › scheda «Missioni aperte»; Archivio › Viste                                                        | Tabella con colonne Titolo, Stato, Committente, Obiettivi, Ricompense, Aggiornata; il DM cambia lo stato nella cella; una vista personale del giocatore resta «Solo io». · journal-plus.test 9; percorso C1                                                                                                                                                                                  | —                                                                                                                                                                                                                                            | Obsidian Bases: viste tabella/schede, filtri, modifica in linea (CMP-91)                                                                                                                                 | b43-04                 |
| CA-17 / CA-19 Kit di proprietà e tipi persona, organizzazione, negozio (6)    | Archivio › Nuova pagina (tipo + kit)                                                                         | Negozio «Taverna del Gufo Stanco» con kit Taverna (Oste, Prezzo di una stanza, Specialità, Voci che girano solo DM); persona annidata; organizzazione solo DM; titoli unici; solo il DM crea. · journal-plus.test 7; percorso C2                                                                                                                                                             | Kit autoriali, non regole                                                                                                                                                                                                                    | Kanka Property Kits (CMP-27) e attributi privati; tipi di Monk's Enhanced Journal (FVT-057), Kanka (CMP-23)                                                                                              | b43-05                 |
| CA-16 Pagina annidata dal testo (7)                                           | Modifica › testo con `[[Cripta del custode]]` › link rosso › Crea; «Sposta la selezione in una nuova pagina» | Pagina creata dentro l'osservatorio (eredita chi legge); selezione spostata in «Storia della gilda» e sostituita dal link; testo tolto da un blocco segreto resta solo DM; niente cicli; rinomina aggiorna i link. · journal-plus.test 8–9; percorso C4, C5                                                                                                                                  | —                                                                                                                                                                                                                                            | LegendKeeper `[[nome]]` e Cut-to-New-Page (CMP-60)                                                                                                                                                       | b43-06                 |
| CA-20 Schede aperte con avanti e indietro (8)                                 | Archivio › Pagine › barra delle schede                                                                       | Indietro (clic), Avanti (Invio da tastiera), Ctrl/Cmd+clic apre una scheda nuova, chiudi, segnalibri; schede e segnalibri per identità sopravvivono al ricaricamento. · journal-plus.test 10, 12; percorso D                                                                                                                                                                                 | —                                                                                                                                                                                                                                            | Monk's Enhanced Journal: schede tipo browser e barra dei segnalibri (FVT-057)                                                                                                                            | b43-07                 |
| CA-36 Relazioni come elenco, niente grafo (9)                                 | Archivio › Relazioni; pannello Relazioni di ogni pagina                                                      | Elenco (giocatore 4, DM 5 con la connessione non rivelata); nuova relazione con la tastiera; nessun `svg`/`canvas` di grafo. `relationsGraph(state, role, lang)` esporta nodi e archi già proiettati per B58. · factions.test 6; percorso E4                                                                                                                                                 | Confine F-014                                                                                                                                                                                                                                | Relazioni Kanka elencate sulla voce (CMP-29), senza «View web»                                                                                                                                           | b43-11                 |
| Privacy «Solo io», DM e giocatore                                             | «Le mie note» su ogni missione e pagina                                                                      | La nota del giocatore non compare mai al DM e viceversa; salvataggio locale anche senza rete. · journal-plus.test 11; quests.test 5; percorso A2, G, H                                                                                                                                                                                                                                       | Regola del core: il DM non legge il «Solo io»                                                                                                                                                                                                | Note del giocatore separate da quelle del GM (Forien FVT-058)                                                                                                                                            | b43-14                 |
| Tavolo                                                                        | Tavolo › scheda laterale Missioni                                                                            | Il DM spunta «Trovare la chiave della torre», il giocatore la vede fatta in sola lettura. · quests.test 7; percorso F                                                                                                                                                                                                                                                                        | B61: pannello come scheda della barra destra                                                                                                                                                                                                 | Floating quest tracker di Forien (FVT-058)                                                                                                                                                               | b43-13                 |
| Offline, ricaricamento, telefono, 40 px                                       | Preferenze › «Senza rete»; ricarica; contesto 390×844 tattile in inglese                                     | Modifica condivisa rifiutata con messaggio, nota personale salvata; dopo il ricaricamento stati, pagine, reputazione e note restano; EN 390: nessun overflow, bersagli ≥ 40 px (link in linea nel testo esclusi, eccezione WCAG 2.5.8), nessun segreto. · percorso G, H, I                                                                                                                   | —                                                                                                                                                                                                                                            | —                                                                                                                                                                                                        | b43-14, b43-15         |

Screenshot (1440×900 salvo i telefoni) in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B43/`, controllati
uno per uno: `b43-01-player-quest-it`, `b43-02-dm-reveal-dialog-it`,
`b43-03-dm-quest-completed-it` (pagina intera), `b43-04-view-open-quests-it`,
`b43-05-archive-new-organization-it`, `b43-06-cut-to-new-page-it`, `b43-07-archive-tabs-it`,
`b43-08-reputation-dm-it`, `b43-09-reputation-player-band-it`, `b43-10-important-npc-dm-it`
(pagina intera), `b43-11-relations-list-it`, `b43-12-livia-sheet-reputation-it`,
`b43-13-table-quests-tab-dm-it`, `b43-14-phone-quest-en`, `b43-15-phone-archive-en`.
Correzioni fatte dopo l'ispezione: nomi delle schede al plurale (come Forien), `[[…]]` grezzo
nella finestra «Rivela», estratti che tagliavano un link a metà (test aggiunto), righe doppie
sotto gli storici, scheda attiva fuori vista sul telefono, «Il gruppo» nel riquadro della scheda.

## Dati e coerenza con le altre aree

Seme per la campagna `lanterns`, coerente con B15 (lettera sigillata, cripta, Taverna del Gufo
Stanco), preparazione di sessione (Maestro Oben scomparso, Tessa Varro «sorride troppo», i goblin
pagati da qualcuno in città, la chiave d'ottone) e B26: missioni «Il sigillo spezzato», «La
lanterna riaccesa», «Il carro rovesciato» (completata), «Il forziere che morde» (nascosta);
pagine Gilda delle lanterne, Casa Varro, Tessa Varro, Maestro Oben, Il vecchio osservatorio,
Goblin del cortile (con gli attori `goblin-1`, `goblin-2` come elementi). Stessi attori (Livia,
Doran, Mira), stessa scena `old-watch`, voce del core `legacy-recap-summary` collegata alla
missione della lanterna. Le monete consegnate finiscono in `actor.currency` e si vedono nella
borsa di Livia (B26); un oggetto finirebbe in `actor.inventory`.

Stato: `state.ext.quests.campaigns[<id campagna>]` (pagine, reputazioni, relazioni, viste, note
per identità, suggerimenti ignorati), versione 1, `undo: "snapshot"`: «Annulla ultima modifica»
ripristina anche l'archivio (e toglie una ricompensa consegnata). Note personali e viste
private sono commit locali e privati, non annullabili. Le schede aperte e i segnalibri stanno
in `localStorage` (`d20-studio-quests-tabs-v1`), per identità e campagna; «Ripristina esempio»
li cancella. I commit d'autore del DM hanno etichetta privata nel registro (nessun titolo
segreto nel registro condiviso).

API per altre aree: `relationsGraph(state, role, lang)`, `listRelations`, `standingsFor`
(riesportate da `quests.mjs`), `readPage`, `listPages`, `backlinks` da `journal-plus.mjs`.

## Limiti onesti

- **Due raccolte**: il Mondo del core (voci con bozze e condivisione per sezione) e l'Archivio di
  B43 (pagine tipizzate) convivono. L'Archivio collega voci del core come Elementi, la pagina di
  una voce del core mostra dove è citata, il registro delle missioni elenca in sola lettura gli
  «Obiettivi» del Diario del core con il loro stato; l'indice dell'Archivio però non elenca le
  voci del Mondo. Unificarle è una scelta di prodotto da fare con il proprietario.
- Solo il DM crea e modifica pagine, missioni, reputazioni e relazioni; i giocatori leggono,
  tengono note «Solo io» e viste personali. Chi altro possa aggiornare resta aperto (F-015).
- Nessun tiro in quest'area: gli atteggiamenti SRD indicano vantaggio o svantaggio alle prove per
  influenzare come testo; nessuna richiesta di prova di Influenza è collegata al servizio dei
  tiri. La reputazione ha una scala fissa −10…+10 non personalizzabile per campagna.
- «PNG importante» è un flag delle pagine persona (elenco e schermata degli atteggiamenti), non
  degli attori con statistiche: niente TS contro la morte o lealtà del modulo dnd5e (la lealtà
  non è nel SRD 2024).
- Menzioni non collegate: solo nei blocchi di testo (non nei valori delle proprietà), titoli di
  almeno 3 caratteri, prima occorrenza per pagina. Ogni pagina ha un titolo unico perché
  `[[Titolo]]` sia univoco.
- Consegnare una ricompensa segreta la rende visibile a chi la riceve tramite l'inventario:
  è una scelta del DM, non un'eccezione del sistema.
- Eliminare una pagina lascia le note «Solo io» altrui salvate ma irraggiungibili (nessuno cancella
  dati privati di un altro).
- Schede e segnalibri sono di questo dispositivo, non sincronizzati; Undo è quello del core a un
  passo, per l'identità che ha fatto l'ultima modifica.
- Nessuna notifica «Diario aggiornato» (BG3) per i giocatori; nessun grafo (B58 userà
  `relationsGraph`).
- L'indice dell'Archivio resta fisso durante lo scorrimento sul computer: nelle catture a pagina
  intera compare a metà pagina.
- Verificato solo in Chromium; nessun backend, nessuna sincronizzazione tra partecipanti.

## Review and fixes

24/09/2026, review indipendente di B43 (non ho costruito l'area) nel worktree `codex/interview-01`,
sessione browser `d20-b43-rf`, prove in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B43-rf/`. Ho controllato
la scheda B43 del censimento (capacità CA-13…CA-40, pattern, accettazione 1–9) nell'app in
esecuzione come giocatore e come DM, IT a 1440 e EN su telefono 390 tattile, da tastiera, senza
rete, e le citazioni SRD sui PDF locali (`pdftotext`, SHA-256 uguali a quelli dichiarati).

### Esito

Le nove accettazioni funzionano davvero; nessun pulsante finto; posizione conforme a B61
(Missioni e Archivio come sezioni della campagna, scheda **Missioni** nella barra destra del
Tavolo, riquadro nella scheda Storia, nessun pulsante in intestazione). Ho trovato sei difetti P2
e cinque P3, tutti corretti con prima un test che falliva, più un problema strutturale che resta
aperto (O1).

| ID  | Gravità | Riproduzione (prima della correzione)                                                                                                                                                                                                                                    | Esito                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | P2      | Pagina di Tessa: «IT 11, 202, 203, 208, 210». In `IT_SRD_CC_v5.2.1.pdf` p. 202 elenca solo i descrittori del glossario; la voce «Atteggiamento» (EN 177) è a p. **204**.                                                                                                 | **Corretto**: `ATTITUDE_SOURCE.it.pages` = 11, 203, 204, 208, 210 (EN invariato e verificato: 10, 177, 182, 183, 184). Test R1 e factions.test; percorso R-D; tabella sopra corretta.                                                                                                                                                                                                               |
| R2  | P2      | DM: nel blocco **segreto** dell'osservatorio scrive `[[La cella di Oben]]`, salva, clic sul link rosso, Crea → la pagina eredita «Tutto il gruppo» e il titolo del segreto compare nell'indice del giocatore.                                                            | **Corretto**: il link sa se sta in un testo segreto (blocco segreto o proprietà Solo DM); la finestra «Crea la pagina annidata» ora mostra «Chi può leggere» con **Solo DM** preselezionato in quel caso e i lettori della pagina madre altrimenti (nidificazione LegendKeeper, CMP-60). Test R5; percorso R-B.                                                                                     |
| R3  | P2      | Da tastiera: spunta di un obiettivo con Spazio, aggiunta con Invio, «Nascondi», consegna, finestre: dopo ogni comando il focus cade sul `body` e si ricomincia dall'inizio della pagina (anche al Tavolo). Arrivando in Missioni/Archivio nessun titolo riceve il focus. | **Corretto**: `manageFocus` (journal-plus) come le altre aree («lo stesso controllo dopo il re-render», B26): il controllo usato resta a fuoco; una finestra confermata restituisce il focus a chi l'ha aperta; un link nel testo porta al titolo della nuova pagina; indice, liste, schede e sotto-navigazione tengono il focus; Indietro disattivato passa ad Avanti. Test R9; percorso R-A, R-F. |
| R4  | P2      | Giocatore, scheda di **Iria** (privata, fuori campagna) › Storia: riquadro con le reputazioni del gruppo delle Lanterne (`rf-10-before-fix-iria-story-box.png`).                                                                                                         | **Corretto**: il riquadro compare solo sui personaggi del gruppo della campagna. Test R3; percorso R-E.                                                                                                                                                                                                                                                                                             |
| R5  | P2      | Il flag «PNG importante» (appunto di preparazione del DM, FVT-091 sta sulla scheda PNG che i giocatori non aprono) era mostrato al giocatore: badge sulla pagina di Tessa e didascalia «PNG importanti» nella sua Reputazione (il percorso lo verificava come atteso).   | **Corretto**: il flag è proiettato solo al DM; il giocatore vede «Atteggiamento dei PNG verso il gruppo» con i PNG il cui atteggiamento è condiviso. Test R4; percorso R-D; `quests-journey.js` (E3, I) aggiornato.                                                                                                                                                                                 |
| R6  | P2      | CA-19 chiede «persona, organizzazione, negozio, **evento, elenco**»: mancava il tipo Elenco (Checklist di Monk's Enhanced Journal, FVT-057, pattern già adottato dalla scheda) e l'evento non aveva campi.                                                               | **Corretto**: tipo **Elenco / Checklist** con voci che il DM aggiunge (Invio), spunta e rimuove, lette dal giocatore; `[[link]]` nelle voci con ricerca e retro-collegamenti; avanzamento `fatte/totali` nelle viste; kit **Evento** (Quando, Dove, Chi c'era, «Cosa è successo davvero» solo DM). Esempio «Preparativi per la torre» dentro l'osservatorio. Test R6; percorso R-C, R-G.            |
| R7  | P3      | Inglese, Reputazione › Recent changes: «Gilda delle lanterne · **Il gruppo** · …».                                                                                                                                                                                       | **Corretto**: etichetta nella lingua dell'interfaccia. Test R2; percorso R-F.                                                                                                                                                                                                                                                                                                                       |
| R8  | P3      | Le «Solo io» del DM dicevano «Nessun altro le legge, nemmeno il DM».                                                                                                                                                                                                     | **Corretto**: al DM «nemmeno i giocatori o un co-DM». Test R7.                                                                                                                                                                                                                                                                                                                                      |
| R9  | P3      | Tavolo › Missioni: oltre 10 obiettivi tagliati senza avviso; il DM non vedeva quali sono nascosti.                                                                                                                                                                       | **Corretto**: tutti gli obiettivi visibili (come il tracker di Forien); badge «Nascosto» per il DM. Test R8; percorso R-F.                                                                                                                                                                                                                                                                          |
| R10 | P3      | L'indice dell'Archivio non elencava le voci del Mondo del core (limite dichiarato).                                                                                                                                                                                      | **Mitigato**: gruppo «Dal Mondo» in sola lettura sotto l'albero, che apre la voce del core; rispetta chi può leggerla. Test R10. La scelta di fondo resta O1.                                                                                                                                                                                                                                       |
| R11 | P3      | Pagina Elenco senza testo: suggerimento «Ancora nessun testo: usa Modifica» sotto le voci.                                                                                                                                                                               | **Corretto**: il suggerimento vale per le pagine di testo.                                                                                                                                                                                                                                                                                                                                          |

### Aperti (non corretti, con motivo)

- **O1 (P2 strutturale, decisione del proprietario/coordinatore).** Due raccolte parallele: Diario e
  Mondo del core (con voci «missione») e Missioni/Archivio di B43. La scheda prevedeva un registro
  aggiuntivo dei tipi in `campaign-content.mjs`; unificarle vuol dire riscrivere file condivisi del
  core, fuori dal mio ruolo, ed è una scelta di prodotto. Mitigazioni presenti: il registro elenca
  gli obiettivi del Diario, l'indice le voci del Mondo (R10), la pagina di una voce del core mostra
  dove è citata. Conseguenza fra aree: l'Assistente legge solo le voci «missione» del core, quindi
  le missioni B43 non entrano nei suoi spunti.
- **O2 (P3).** Nessuna notifica «Diario aggiornato» (BG3) al giocatore: il punto `notifications`
  del registro esiste; non è nell'accettazione della scheda.
- **O3 (P3).** Una vista condivisa del DM con una colonna chiamata come una proprietà Solo DM mostra
  al giocatore l'intestazione (mai i valori). Scelta d'autore del DM.
- **O4 (P3).** Nella tabella «Missioni aperte» la tendina dello stato salva a ogni cambio; dove le
  frecce cambiano una tendina chiusa (Windows) ogni freccia è un cambio. Comportamento nativo della
  modifica in linea (Obsidian Bases); Annulla lo ripristina.

### Non difetti (verificati)

- Copia ed esportazione della campagna portano già missioni e archivio senza le «Solo io» altrui
  (`campaign-data.test`, «Review: missions…»); passano anche con il nuovo tipo Elenco.
- CA-17 «modelli di pagina»: la scheda ha adottato solo i Property Kits di Kanka (CMP-27); i modelli
  World Anvil/LegendKeeper non erano tra i suoi pattern.
- CA-39 lealtà e tiri salvezza contro la morte: non sono nel SRD 5.2.1, giustamente assenti.
- Il giocatore non spunta obiettivi né voci: F-015 aperto, autorità del DM coerente.
- Completata → Fallita/Nascosta senza motivo: discrezione del DM (Forien li sposta liberamente);
  riaprire, cioè correggere ciò che i giocatori sapevano, chiede il motivo.
- Caselle da 18 px dentro etichette alte ≥ 40 px: il bersaglio è l'etichetta (pattern del core).
- Pattern fedeli: schede Forien con Nascoste, dettaglio e aggiornamenti BG3, schede e segnalibri
  Monk's, kit e relazioni Kanka, retro-collegamenti e Bases Obsidian, nidificazione LegendKeeper,
  schermata GM DOS2, connessioni segrete Scabard. «Ignora» sulle menzioni non collegate viene dal
  conflitto S3 del censimento («solo con conferma», «disattivati»), non da un controllo Obsidian.
- Privacy: rifatti i controlli su proiezioni, ricerca, retro-collegamenti, schede, segnalibri,
  viste, grafo B58 e etichette del registro: nessun'altra fuga.

### File toccati dalla review (tutti di B43, nessun file condiviso)

`design/blueprint/quests.mjs`, `journal-plus.mjs`, `factions.mjs`, `journal-plus.css`;
`tests/quests-review.test.mjs` (nuovo, R1–R10); `tests/factions.test.mjs` (citazione IT);
`tests/journal-plus.test.mjs` (figli dell'osservatorio con l'Elenco d'esempio);
`blueprint-checks/quests-journey.js` (flag PNG importante non più atteso dal giocatore);
`blueprint-checks/quests-review-journey.js` (nuovo).

### Controlli rieseguiti

- `node --test design/blueprint/tests/quests-review.test.mjs` → **10/10**; le quattro suite B43
  (`quests-review`, `quests`, `factions`, `journal-plus`) → **38/38**.
- Suite completa `node --test design/blueprint/tests/*.test.mjs` → **1635/1635** dopo le
  correzioni; una riesecuzione ha mostrato 4 errori transitori solo in `world-map.test.mjs` (test
  «review:» di B42 in corso in parallelo, nessun file B43 coinvolto); ultima riesecuzione
  **1643/1643**.
- Percorso del costruttore `quests-journey.js` (copia con le immagini in `B43-rf/builder-journey/`)
  → `ok: true`, **21/21**, nessun `pageerror` (`builder-journey/result.json`).
- Percorso di review `quests-review-journey.js` → `ok: true`, **7/7** (R-A…R-G), nessun
  `pageerror` (`review-journey-result.json`).
- Immagini controllate: `rf-b-secret-nested-dialog-it`, `rf-c-checklist-dm-it`,
  `rf-c-checklist-backlink-player-it`, `rf-d-reputation-player-it`, `rf-f-table-tracker-dm-en`,
  `rf-g-phone-checklist-dm-en` (390 px); prima delle correzioni: `rf-03-before-fix-rep-dm-en`,
  `rf-10-before-fix-iria-story-box`; esplorazione: `rf-01`…`rf-09`. Solo Chromium.
