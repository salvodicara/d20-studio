# Regressione completa dopo il round 2 dell'audit e i passaggi di consegne: prove

29/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · sessioni browser `d20-r2-regress` (giri completi) e `d20-r2-probe` (sonde e
ripetizioni dei singoli percorsi) · server `http://127.0.0.1:8879/` senza cache · cartella delle
prove `~/Workspace/Codex/d20-blueprint-evidence/2026-09-27/r2-regress/` (fuori dal checkout; le
cartelle dei pacchetti non sono toccate). Solo dati sintetici. Ruolo: esecutore della regressione
dopo i pacchetti R1–R8 ([triage 2](audit/triage2.md)) e i passaggi di consegne
([hand-offs](audit/handoffs.md)).

## In breve

- **Test Node:** `node --test design/blueprint/tests/*.test.mjs` **2541/2541** all'inizio (il
  compito diceva 2512: il numero precedeva i passaggi di consegne) e **2543/2543** alla fine,
  con i 2 test nuovi di questa regressione (`tests/r2-regression.test.mjs`).
- **Percorsi nel browser:** tutti i **186** script di `blueprint-checks/` (i 133 del README e i 53
  dei pacchetti P1–P10, R1–R8 e dei passaggi di consegne, ora elencati nel README), uno per
  comando, in sequenza nella stessa sessione, ciascuno limitato da un allarme di 240 s. Primo giro
  (`sweep1`): **178/186**, più 4 rossi trovati prima dalle sonde. Secondo giro (`final`): 184/186,
  con due rossi legati ai dadi casuali. Terzo giro (`final2`): 185/186, un rosso raro dei dadi
  (`p3-hp`, un 20 al tiro salvezza contro la morte). Giro finale (`final3`), sul codice e sugli
  script finali: **186/186**, 1487 esiti `passed`, nessun errore di pagina segnalato (nessun
  `errors`, `pageErrors` o `findings` non vuoto).
- **Il nuovo avvio del combattimento** (R5: la finestra di avvio al posto della lista «Incontro
  preparato») era già nei 26 percorsi che R5 aveva elencato: nessun percorso usa più la lista
  tolta, e i 24 blocchi migrati sono identici.
- **Due difetti reali dell'app**, corretti partendo da un test rosso. Una regressione: la finestra
  dei tiri della scheda (il motore unico dal round 1) si apriva sempre su «Digitali» e ignorava la
  scelta ricordata «Fisici: chiedi le facce»; chi gioca con dadi veri ora trova subito il campo
  della faccia, anche sul telefono in inglese, e «Digitali» resta a un clic. Un difetto di R1: una
  ritirata con Ispirazione eroica che esce con lo stesso numero spariva dal registro; ora il
  registro tiene sempre il primo tiro e la ritirata.
- **Tredici percorsi rimasti indietro** rispetto a cambiamenti voluti (la Biblioteca che crea con
  l'editor strutturato, la carta del tiro ritirato, le pedine grandi una cella sul telefono, la
  sessione d'esempio sempre al giovedì seguente, le date d'esempio spostate a settimane intere, le
  righe d'iniziativa condivise, i tiri salvezza sulla scheda e il Mantello della protezione, i
  personaggi pronti senza più aspetti da verificare, il motivo dei pulsanti disattivati) o al banco
  di prova e ai dadi casuali: aggiornati senza togliere controlli, spesso con un controllo in più
  (uno solo è spostato: la misura dei distintivi sul telefono, ora dopo l'ingrandimento).
- **Banco di prova più severo:** il service worker dell'app nascondeva ai percorsi le richieste
  che intercettano (aree di prova, guardie di rete), ora bloccato in quei contesti; una finestra
  «lasciare la pagina?» non blocca più il percorso seguente; un'uscita vuota, un rifiuto della CLI
  o un `{"result": "FAIL"}` non contano più come verdi (così sono emersi `builder-plus` e
  `spells-plus`, che il primo verdetto dava verdi).
- **Una scelta per il proprietario**, non un difetto: sul telefono, all'apertura della mappa, i
  distintivi di stato sono piccoli quanto le pedine (vedi «Limiti»).

## Il nuovo avvio del combattimento nei percorsi

R5 (PR-32) ha tolto dall'editor della scena la lista «Incontro preparato» (`[data-prep-include]`,
`[data-prep-initiative]`, «Ordina per iniziativa»): il combattimento parte dalla finestra di avvio
del Tavolo («Avvia combattimento», o «Avvia incontro salvato…» dall'editor), come l'appello
dell'iniziativa di Foundry. I 26 percorsi che R5 aveva elencato erano già stati migrati dal
passaggio di consegne (24 con lo stesso blocco, `campaign-settings` e `integrations` da R7 e R8).
Ho controllato che:

- nessun percorso usa più la lista tolta (`grep` di `data-prep-include`, `data-prep-initiative`,
  «Ordina per iniziativa» nei percorsi: nessun risultato, dopo che in `inventory-plus` è stato
  tolto un ciclo rimasto senza effetto sulle vecchie caselle, che non esistono più);
- i 24 blocchi sono identici riga per riga (a parte il rientro), salvo l'elenco `naturals` (chi
  combatte e il d20 scritto per ciascuno);
- un file di aiuto condiviso non si può usare: `playwright-cli run-code` valuta il file in una
  sandbox senza `require` né `import()` (sonda: «A dynamic import callback was not specified»).
  Il blocco è quindi scritto nel README dei controlli, da copiare così com'è.

## Giri eseguiti

| Giro                      | Sessione         | Cosa                                                                                        | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node-run1`               | —                | suite Node all'inizio                                                                       | **2541/2541** (il compito diceva 2512: il numero precedeva i passaggi di consegne)                                                                                                                                                                                                                                                                                                                                                          |
| `sweep1`                  | `d20-r2-regress` | i 186 percorsi di `scripts/order.txt`                                                       | **178/186** (esiti ricalcolati con il verdetto finale); rossi `library-mobile`, `conditions-badges`, `b11b-inc10-fixes`, `assistant`, `builder-plus`, `dice-tray-review`, `inventory-plus`, `spells-plus`. Più i rossi che le sonde avevano trovato prima che il giro li raggiungesse: `chat-review-fixes`, `integrations`, `p1-cross-tab`, `r5-encounters`                                                                                 |
| `audit1`                  | `d20-r2-probe`   | i 53 percorsi dei pacchetti in anticipo, in parallelo                                       | non valido dopo `p1-dm-map`: la sua finestra «lasciare la pagina?» bloccava i successivi e il primo verdetto li contava verdi; da qui la chiusura delle finestre modali nel runner e il verdetto più severo                                                                                                                                                                                                                                 |
| `audit2`                  | `d20-r2-probe`   | gli stessi 53 con il runner corretto                                                        | 51/53; rossi `p1-cross-tab` (dopo `p1-dm-map`) e `r5-encounters`                                                                                                                                                                                                                                                                                                                                                                            |
| `p1`–`p18`                | `d20-r2-probe`   | un percorso per volta dopo ciascuna correzione                                              | tutti verdi alla fine: `chat-review-fixes` 11, `builder-plus` 20, `spells-plus` 12, `conditions-badges` 2, `library-mobile` 3, `b11b-inc10-fixes` 11, `r8-local-model` 3, `integrations` 9, `p1-cross-tab`, `p1-dm-map`, `r5-encounters` 7, `assistant` 14, `dice-tray-review` 11, `inventory-plus` 18; `r1-attack` 4 volte e `r1-privacy` 5 volte di seguito, verdi; `p3-hp` 10 due volte con i dadi casuali e una con il d20 fissato a 20 |
| `node-run3`…`node-final2` | —                | suite Node dopo le correzioni dell'app                                                      | **2543/2543** alla fine (2542 dopo la prima correzione)                                                                                                                                                                                                                                                                                                                                                                                     |
| `final`                   | `d20-r2-regress` | di nuovo tutti i 186, nello stesso ordine, dopo le correzioni                               | **184/186**: rossi `r1-attack` (difetto dell'app, riga 14) e `r1-privacy` (dadi, riga 15), verdi in `sweep1` e nelle sonde                                                                                                                                                                                                                                                                                                                  |
| `final2`                  | `d20-r2-regress` | di nuovo tutti i 186, nello stesso ordine, dopo le correzioni di `r1-attack` e `r1-privacy` | 185/186, 1477 esiti `passed`: rosso `p3-hp` (dadi, riga 16), verde in `sweep1`, in `final` e nelle sonde; `compare.py`: nessun percorso verde con meno passi, salvo `encounter-lifecycle` (vedi «Limiti»)                                                                                                                                                                                                                                   |
| `final3`                  | `d20-r2-regress` | di nuovo tutti i 186, nello stesso ordine, sul codice e sui percorsi finali                 | **186/186**, 1487 esiti `passed`                                                                                                                                                                                                                                                                                                                                                                                                            |

Script di esecuzione (fuori dal repository, `scripts/`, stesso metodo della regressione IA del
26/09): `order.txt` elenca i 186 percorsi (i 133 del README nell'ordine del README, 18 prima di
17, `measure` dopo `gestures-and-views`, poi i 53 percorsi dei pacchetti P1–P10, R1–R8 e dei
passaggi di consegne); `prep.sh` copia un percorso, reindirizza le immagini in `runs/<percorso>/`,
copia i suoi file di prova e lo avvolge in modo che un errore restituisca il messaggio, gli ultimi
passi verdi e una schermata per pagina, poi chiude una finestra modale lasciata aperta dal percorso
precedente; `run.sh` esegue un percorso per comando con `perl -e 'alarm 240'`; `verdict.py` legge
l'esito (`FAILED`, `failed`, `errors`, `findings`, `ok:false`, `result: "FAIL"`, un rifiuto della
CLI, un'uscita vuota); `table.py` ricalcola ogni esito dal JSON salvato e produce la tabella in
fondo; `compare.py` confronta i passi di ogni percorso verde con la regressione IA del 26/09 e con
`sweep1`.

## Cosa si rompeva e cosa ho cambiato

Per ogni rosso ho letto l'errore restituito e la schermata e, dove serviva, ho scritto una sonda
(`probe/debug/*.js`) prima di toccare qualcosa. Due rossi erano **difetti reali dell'app**: una
regressione (riga 11) e un difetto di una funzione nuova di R1 (riga 14), corretti partendo da un
test rosso; gli altri erano percorsi rimasti indietro rispetto a un cambiamento voluto e
revisionato, o problemi del banco di prova. Ogni modifica è
commentata nel percorso («Refreshed by the round-2 regression (29/09/2026)» o «Round-2
regression») con la causa. Nessuna toglie un controllo senza mettere al suo posto quello sul
comportamento nuovo; l'unico requisito spostato è la misura dei distintivi sul telefono, ora chiesta
dopo l'ingrandimento e non all'apertura (riga 3, e «Limiti»).

| #   | Percorso                          | Sintomo                                                                                                                                | Causa (verificata)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Tipo                           | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `library-mobile`                  | `#dialog [name=type]` non compare dopo «Create content»                                                                                | P8 BI-15 (D&D Beyond «Create»): con l'editor strutturato costruito, «Crea contenuto» apre la sua finestra unica (tipo e modello). P8 aveva aggiornato `library-journey` e `library-builder-journey`, non questo.                                                                                                                                                                                                                                                                                                                                                        | Deriva (cambio voluto)         | Come `library-journey`: sul telefono il tocco su «Crea contenuto» apre la finestra dell'editor strutturato (`[name=kind]`, controllo nuovo); poi l'area è servita come mancante (404, service worker tolto) e il percorso prova l'editor della Biblioteca come prima. L'inglese si sceglie dopo il ricaricamento, perché la lingua vive solo in memoria.                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2   | `chat-review-fixes`               | P3 «undone roll marked»: la carta ritirata non dice «Annullato» e l'ultima riga del registro non è «Tiro ritirato»                     | P3 TV-87 (carta del registro di D&D Beyond): un ritiro dal vassoio si legge sulla carta stessa («Ritirato: <motivo>») e la riga separata «Tiro ritirato» è nascosta (`chat-domain` `FOLDED_LABELS`). Era nella lista «NOT DONE» dei passaggi di consegne.                                                                                                                                                                                                                                                                                                               | Deriva (cambio voluto)         | Per un tiro del vassoio: la carta segnata come annullata deve dire «Ritirato: Tiro di prova sbagliato» e nel registro non deve restare nessuna riga «Tiro ritirato». Il ramo della finestra di riserva mantiene i controlli di prima.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 3   | `conditions-badges`               | sul telefono 390 il distintivo misura 10,8 px (glifo 7 px), il percorso chiede ≥ 14 (≥ 9)                                              | P6 TV-06 (TouchVTT, tablet di Roll20): sul telefono una pedina media non è più larga della sua cella e la mappa si apre sull'intera scena (scala 0,39), quindi pedina, iniziale e distintivo sono piccoli insieme; prima la pedina si ingrandiva di 1/scala e il distintivo misurava 26 px (regressione IA del 26/09). Era nella lista «NOT DONE» dei passaggi di consegne come decisione di design.                                                                                                                                                                    | Deriva (cambio voluto)         | All'apertura: quattro distintivi, tutti sul bordo e mai sopra l'iniziale (controllo nuovo). Poi il giocatore ingrandisce con il «+» della mappa finché una cella è un bersaglio da 44 px (la misura che P6 dà al tocco): lì valgono le soglie di prima (≥ 14 px, glifo ≥ 9, fuori dall'iniziale); misurati 26 px e 17 px a 48,5 px per cella. Poi «Centra la scena» e il resto invariato. Misure all'apertura conservate in `measures.phoneWholeScene`.                                                                                                                                                                                                                                                                                                       |
| 4   | `b11b-inc10-fixes`                | «Area Mod+Z did not run outside a text field»                                                                                          | Banco di prova. Da P1 IN-11 l'app registra un service worker che passa tutto alla rete; una richiesta a cui risponde il service worker non arriva a `page.route`, quindi l'area usa e getta `fix-keys` (servita solo da `page.route`) veniva chiesta al server (404) e non si caricava. Sonda (`probe/debug/b11b-debug.js`): nel percorso la pagina è controllata dal service worker e `tests/fixtures/fix-keys.mjs` torna 404 («fetch»); in un contesto nuovo il Mod+Z dell'area funziona.                                                                             | Banco di prova                 | Contesto con `serviceWorkers: "block"`, come `registry-smoke`. 11/11.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 5   | `integrations`                    | «next session local time» (gruppo 3)                                                                                                   | Passaggi di consegne (dati sempre freschi): l'esempio ha sempre «Il sigillo della torre» il giovedì seguente alle 20:30, quindi la prossima sessione non è quella creata dal percorso a +10 giorni alle 21:00.                                                                                                                                                                                                                                                                                                                                                          | Deriva (dati)                  | Il DM annulla prima la sessione d'esempio, come fanno già `sessions-plus`, `session-view`, `p9-sessions` e `community`. In più il contesto blocca il service worker: altrimenti la guardia sulle richieste esterne (`context.route`) non vedrebbe una richiesta passata dal service worker. 9/9.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6   | `r8-local-model`                  | verde                                                                                                                                  | Stessa falla della guardia di rete del punto 5 («not one request leaves the local server»).                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Banco di prova (rinforzo)      | `serviceWorkers: "block"` sul contesto. 3/3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 7   | `p1-cross-tab` (dopo `p1-dm-map`) | uscita vuota; poi ogni percorso seguente «does not handle the modal state»                                                             | `p1-dm-map` finisce nell'editor della scena con la bozza non salvata (il flusso di Roll20: carichi la mappa, poi salvi); al ricaricamento di `p1-cross-tab` il browser chiede se lasciare la pagina e la finestra resta aperta. Il primo verdetto contava «uscita vuota» e «rifiuto della CLI» come verdi.                                                                                                                                                                                                                                                              | Banco di prova                 | `p1-dm-map` ora parte dall'esempio (azzera lo stato, come gli altri percorsi P1: dopo `handoffs` non trovava «Prepara una mappa»), salva la scena e controlla ciò che la sua intestazione promette ma non provava: «Salvare, condividere e attivare sono azioni separate.», «Attiva al Tavolo…» per quella scena, la mappa nella scena salvata. Il runner chiude una finestra modale rimasta aperta prima del percorso seguente (come il runner di triage2) e `verdict.py` segna rosso un rifiuto della CLI o un'uscita vuota.                                                                                                                                                                                                                                |
| 8   | `assistant`                       | «Default period is not the 17/09 evening»                                                                                              | Passaggi di consegne (dati sempre freschi): i timbri dell'esempio, scritti attorno a giovedì 17/09/2026, si spostano di settimane intere fino alla visita.                                                                                                                                                                                                                                                                                                                                                                                                              | Deriva (dati)                  | Il periodo atteso è `sampleDay("2026-09-17")` di `sample-clock.mjs`, letto nella pagina: la stessa sera spostata delle stesse settimane.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 9   | `inventory-plus`                  | verde nelle sonde; rosso in `sweep1` solo per la finestra con l'app rotta (vedi «Limiti»)                                              | Un ciclo sulle vecchie caselle `[data-prep-include]` era rimasto dopo la migrazione (senza effetto: le caselle non esistono più).                                                                                                                                                                                                                                                                                                                                                                                                                                       | Pulizia                        | Tolto il ciclo; chi combatte si sceglie nella finestra di avvio subito dopo (Doran e Mira restano fuori).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 10  | `r5-encounters`                   | «the start dialog does not list the prepared goblins» (`ok:false`)                                                                     | Passaggi di consegne, TV-52 (raggruppamento di Foundry, Improved Initiative): le creature che condividono un tiro d'iniziativa sono una riga sola («Goblin guerriero A, B, C», con `data-ct-start-group` che ne elenca i membri), quindi le righe sono meno delle creature.                                                                                                                                                                                                                                                                                             | Deriva (cambio voluto)         | Si contano le creature delle righe (i membri di `data-ct-start-group`, altrimenti 1), con la stessa soglia di prima (≥ pedine di prima + 3).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 11  | `dice-tray-review`                | attesa scaduta su `[data-dtray-sheet] … [data-kind="save"][data-ability="int"]` (il riquadro «Tiri» della scheda)                      | Tre cause. Due volute: P3 PG-23 (un solo motore dei tiri) ha tolto i tiri salvezza dal riquadro «Tiri» e li tira dall'elenco dei TS della scheda; P2 PG-25 ha messo in sintonia il Mantello della protezione di Livia (+1 ai TS: INT +6, Des +3, Sag +4). Una **regressione**: la finestra dei tiri della scheda, ora il motore unico, si apriva sempre su «Digitali» e ignorava la scelta ricordata «Fisici: chiedi le facce» dei tiri sul posto (revisione P2-6 di B34): chi tira dadi veri doveva cambiarla a ogni tiro. Sonda `probe/debug/sheet-rolls2.js`.        | **Regressione (app)** + deriva | App (prima il test rosso, `tests/r2-regression.test.mjs`): `sheet-plus.mjs` `rememberedDice` legge l'impostazione personale `dice-tray.dice` e la finestra si apre su «Fisici» con le facce visibili; «Digitali» resta a un clic; senza il vassoio resta digitale. Percorso: il TS di INT si legge sulla scheda (+6); i totali col mantello (12 + 3 = 15, 11 + 6 = 17); il TS di Sag della scheda si apre su «Fisici» (controllo nuovo) e registra 9 + 4 = 13 fra i tiri della scheda, che non contano più fra quelli del vassoio. Verificato anche su un telefono 390 in inglese, al tocco (`probe/debug/sheet-phone.js`, `sheet-roll-phone-en-physical.png`): «Physical: I enter the faces» già scelto, campo del d20 visibile, 9 + 4 = 13, nessuno sbordo. |
| 12  | `builder-plus`                    | verde per il primo verdetto; in realtà `{"result": "FAIL"}`: `#dialog input[name="confirm"]` non c'è nella finestra «Reclamare Kessa?» | P1: le tabelle di classe coprono ora Kessa (Guerriero 2 / Mago 1) per intero, quindi il suo reclamo e la sua discesa di livello non hanno più «aspetti da verificare» né la casella di conferma (P1 aveva spostato lo stesso controllo del test Node su Oren). Sonda `probe/debug/kessa.js`: la finestra ha solo «Annulla» e «Reclama personaggio».                                                                                                                                                                                                                     | Deriva (cambio voluto)         | Il reclamo e la discesa di livello di Kessa, e sul telefono il percorso rapido di un Mago Elfo dei boschi di livello 1 (P1 PG-05 applica i doni del lignaggio elfico), non devono elencare aspetti da verificare né chiedere conferma; il controllo della conferma passa a Oren (Druido 5): la finestra elenca gli aspetti, la casella è obbligatoria e senza spunta non nasce nessuna scheda; poi «Annulla» e il percorso torna alla scheda di Kessa come prima. 20 passi, come il 26/09.                                                                                                                                                                                                                                                                    |
| 13  | `spells-plus`                     | verde per il primo verdetto; in realtà `{"result": "FAIL"}`: «disabled toggle does not say why»                                        | SV-37 (round 2): un controllo disattivato dice causa e rimedio in una frase visibile collegata con `aria-describedby`, non più nel `title`.                                                                                                                                                                                                                                                                                                                                                                                                                             | Deriva (cambio voluto)         | Il motivo si legge nella frase indicata da `aria-describedby`: deve esserci, essere visibile e nominare il riposo lungo. 12 passi, come il 26/09.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 14  | `r1-attack`                       | solo nel giro `final`: «both faces in the log: 15+2» (una sola riga nel registro dopo la ritirata)                                     | **Difetto dell'app** (non una regressione: la ritirata con Ispirazione eroica è di R1). `state.mjs acceptedRolls` scarta un tiro combattimento se le sue facce sono uguali a quelle già accettate; una ritirata che esce con la stessa faccia del primo d20 (1 volta su 20 in digitale, e con i dadi fisici quando il giocatore ritira lo stesso numero) spariva dalla storia, contro ciò che `useHeroicInspiration` promette («il registro tiene il primo tiro e la ritirata»). Ripetuto quattro volte nelle sonde: verde (il caso è casuale); riprodotto con un test. | **Difetto (app)**              | Test prima (`tests/r2-regression.test.mjs`, rosso: `[[4]]` invece di `[[4], [4]]`): ritirata 4 → 4 con la faccia fisica. `state.mjs`: una richiesta che ha appena ricevuto `inspirationReroll` è sempre un tiro nuovo per il registro. Il percorso non cambia.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 15  | `r1-privacy`                      | solo nel giro `final`: `[data-dtray-rq-target][value="goblin-1"]` non c'è nella richiesta del DM                                       | Percorso dipendente dai dadi: il Dardo di fuoco digitale del passo 1 uccide la Sentinella (7 PF) quando fa 7 o più; una creatura morta, giustamente, non è fra i destinatari di un tiro salvezza, e il passo 2 la chiede. Schermata: la Sentinella con la croce. Nelle sonde 1 volta su 3.                                                                                                                                                                                                                                                                              | Banco di prova (dadi)          | Il passo 1 fissa per quel solo attacco la fonte casuale della pagina (15 per colpire, 1 di danno; stessa tecnica di `encounter-builder-journey`) e controlla che la Sentinella sia viva prima del passo 2. Controlli invariati.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 16  | `p3-hp`                           | solo nel giro `final2`: «Cannot read properties of undefined (reading 'successes')» dopo il tiro salvezza contro la morte              | Percorso dipendente dai dadi: il tiro salvezza contro la morte digitale ha fatto 20, che fa recuperare 1 PF (SRD 5.2.1) e non lascia nessun conteggio di successi o fallimenti (l'app lo legge come nessun conteggio, `conditions.mjs deathSavesOf`). Il percorso prevedeva già questo caso (`hp === 1`) ma leggeva prima `successes` di un valore assente. Schermata: «20 + 0 = 20», «Livia · Recupera 1 PF». Comportamento dell'app corretto.                                                                                                                         | Banco di prova (dadi)          | Il conteggio mancante vale zero, come per l'app; se il tiro ha riportato Livia a 1 PF, il percorso controlla in più che «Tiri e risultati» dica «Recupera 1 PF» (controllo nuovo); con ogni altra faccia serve ancora un successo o un fallimento. Verificati entrambi i rami nelle sonde: `p17` e `p18` con dadi casuali, e una copia con il d20 fissato a 20 (`probe/debug/p3-hp-nat20.js`): 10/10.                                                                                                                                                                                                                                                                                                                                                         |

## Correzioni dell'app, dai test

- `tests/r2-regression.test.mjs` (nuovo, 2 test). Primo test, **rosso prima** della modifica (la
  finestra offriva `digital*` con la scelta ricordata «Fisici»): senza impostazione la finestra dei
  tiri della scheda si apre su «Digitali» con le facce nascoste; con `dice-tray.dice = "physical"`
  si apre su «Fisici» con le facce visibili e registra un tiro fisico (9 → `values [9]`); «Digitali»
  resta a un clic per il singolo tiro.
- `sheet-plus.mjs`: `rememberedDice(ctx)` legge l'impostazione personale del vassoio dei dadi
  (lo stesso `getSetting` che usa `dice-tray.mjs`; senza il vassoio, digitale come prima) e
  `rollDialog` la usa per il pulsante scelto e per mostrare le facce. Modello copiato: l'opzione
  dei dadi di D&D Beyond vale per ogni tiro della scheda; i dadi manuali di Foundry valgono per
  ogni tiro.
- Verifica nel browser: `dice-tray-review` (desktop, IT, mouse) 11/11; sonda sul telefono 390 in
  inglese al tocco (riga 11).
- Secondo test, **rosso prima** della modifica (`[[4]]` invece di `[[4], [4]]`): un attacco di
  Livia trattenuto per l'Ispirazione eroica, ritirato con la stessa faccia fisica (4 → 4), lascia
  nel registro due tiri, il primo e la ritirata, e spende l'ispirazione.
- `state.mjs` `acceptedRolls`: una richiesta che ha appena ricevuto `inspirationReroll` è un tiro
  nuovo anche se le facce coincidono (prima il confronto delle facce la scartava come «lo stesso
  tiro»), come già promette `combat.useHeroicInspiration` («il registro tiene il primo tiro e la
  ritirata»). Verifica: `r1-attack` PASS (3 passi) nei giri `final2` e `final3`, e due volte
  nelle sonde dopo la correzione.

## Percorso → passi → esito

«Passi» = esiti `passed` del giro finale; «—» per i percorsi che restituiscono osservazioni invece
di un elenco `passed` (si fermano con un errore a ogni controllo mancato, quindi PASS vuol dire
che sono arrivati in fondo). `sweep1` = primo giro, con il verdetto finale ricalcolato sul suo JSON;
«Note» rimanda alle righe di «Cosa si rompeva e cosa ho cambiato».

| #   | Percorso                              | Passi (final) | `sweep1` | `final3` | Note                                                |
| --- | ------------------------------------- | ------------- | -------- | -------- | --------------------------------------------------- |
| 1   | `core-journey.js`                     | 13            | PASS     | PASS     |                                                     |
| 2   | `preparation-journey.js`              | 9             | PASS     | PASS     |                                                     |
| 3   | `gestures-and-views.js`               | 8             | PASS     | PASS     |                                                     |
| 4   | `back-guard-journey.js`               | 4             | PASS     | PASS     |                                                     |
| 5   | `measure-journey.js`                  | 2             | PASS     | PASS     |                                                     |
| 6   | `visual-fixes-journey.js`             | 5             | PASS     | PASS     |                                                     |
| 7   | `combat-journey.js`                   | 10            | PASS     | PASS     |                                                     |
| 8   | `area-journey.js`                     | 9             | PASS     | PASS     |                                                     |
| 9   | `multi-self-journey.js`               | 6             | PASS     | PASS     |                                                     |
| 10  | `combat-mobile-journey.js`            | 10            | PASS     | PASS     |                                                     |
| 11  | `encounter-lifecycle.js`              | 10            | PASS     | PASS     | 10 passi invece di 11 dal 26/09 (R5, vedi «Limiti») |
| 12  | `reactions-journey.js`                | 8             | PASS     | PASS     |                                                     |
| 13  | `concentration-journey.js`            | 10            | PASS     | PASS     |                                                     |
| 14  | `simultaneous-reactions-journey.js`   | 6             | PASS     | PASS     |                                                     |
| 15  | `new-npc-reaction-journey.js`         | 4             | PASS     | PASS     |                                                     |
| 16  | `spatial-journey.js`                  | 8             | PASS     | PASS     |                                                     |
| 17  | `spatial-mobile-journey.js`           | 6             | PASS     | PASS     |                                                     |
| 18  | `approach-journey.js`                 | 7             | PASS     | PASS     |                                                     |
| 19  | `builder-journey.js`                  | 5             | PASS     | PASS     |                                                     |
| 20  | `builder-advance-journey.js`          | 3             | PASS     | PASS     |                                                     |
| 21  | `builder-reconstruction-journey.js`   | 3             | PASS     | PASS     |                                                     |
| 22  | `builder-dice-journey.js`             | 5             | PASS     | PASS     |                                                     |
| 23  | `builder-recovery-journey.js`         | 3             | PASS     | PASS     |                                                     |
| 24  | `library-journey.js`                  | 3             | PASS     | PASS     |                                                     |
| 25  | `library-builder-journey.js`          | 3             | PASS     | PASS     |                                                     |
| 26  | `library-files-journey.js`            | 2             | PASS     | PASS     |                                                     |
| 27  | `library-mobile-journey.js`           | 3             | FAIL     | PASS     | riga 1                                              |
| 28  | `library-spell-recovery-journey.js`   | 2             | PASS     | PASS     |                                                     |
| 29  | `library-import-recovery-journey.js`  | 2             | PASS     | PASS     |                                                     |
| 30  | `campaign-notes-journey.js`           | 3             | PASS     | PASS     |                                                     |
| 31  | `campaign-world-journey.js`           | 2             | PASS     | PASS     |                                                     |
| 32  | `campaign-sessions-journey.js`        | 2             | PASS     | PASS     |                                                     |
| 33  | `campaign-sharing-journey.js`         | 3             | PASS     | PASS     |                                                     |
| 34  | `campaign-mobile-journey.js`          | 2             | PASS     | PASS     |                                                     |
| 35  | `campaign-integration-journey.js`     | 2             | PASS     | PASS     |                                                     |
| 36  | `rest-shared-journey.js`              | 3             | PASS     | PASS     |                                                     |
| 37  | `rest-time-journey.js`                | 3             | PASS     | PASS     |                                                     |
| 38  | `rest-mobile-personal-journey.js`     | 4             | PASS     | PASS     |                                                     |
| 39  | `rest-reversed-journey.js`            | 1             | PASS     | PASS     |                                                     |
| 40  | `companion-map-journey.js`            | 2             | PASS     | PASS     |                                                     |
| 41  | `forms-journey.js`                    | 2             | PASS     | PASS     |                                                     |
| 42  | `familiar-journey.js`                 | 3             | PASS     | PASS     |                                                     |
| 43  | `forms-mobile-journey.js`             | 3             | PASS     | PASS     |                                                     |
| 44  | `companion-personal-journey.js`       | 2             | PASS     | PASS     |                                                     |
| 45  | `conditions-journey.js`               | 11            | PASS     | PASS     |                                                     |
| 46  | `conditions-death-journey.js`         | 7             | PASS     | PASS     |                                                     |
| 47  | `dice-correction-journey.js`          | 7             | PASS     | PASS     |                                                     |
| 48  | `conditions-mobile-journey.js`        | 3             | PASS     | PASS     |                                                     |
| 49  | `conditions-fixes-journey.js`         | 7             | PASS     | PASS     |                                                     |
| 50  | `conditions-badges-journey.js`        | 2             | FAIL     | PASS     | riga 3                                              |
| 51  | `registry-smoke-journey.js`           | 18            | PASS     | PASS     |                                                     |
| 52  | `b11b-inc10-fixes-journey.js`         | 11            | FAIL     | PASS     | riga 4                                              |
| 53  | `b61-table-structure-journey.js`      | 6             | PASS     | PASS     |                                                     |
| 54  | `b61-review-fixes-journey.js`         | 6             | PASS     | PASS     |                                                     |
| 55  | `token-menu-journey.js`               | 19            | PASS     | PASS     |                                                     |
| 56  | `campaign-members-journey.js`         | 15            | PASS     | PASS     |                                                     |
| 57  | `campaign-members-review-journey.js`  | 11            | PASS     | PASS     |                                                     |
| 58  | `campaign-members-review2-journey.js` | 9             | PASS     | PASS     |                                                     |
| 59  | `session-view-journey.js`             | 15            | PASS     | PASS     |                                                     |
| 60  | `handouts-journey.js`                 | 15            | PASS     | PASS     |                                                     |
| 61  | `compendium-journey.js`               | 15            | PASS     | PASS     |                                                     |
| 62  | `chat-journey.js`                     | 13            | PASS     | PASS     |                                                     |
| 63  | `chat-review-fixes-journey.js`        | 11            | PASS     | PASS     | riga 2 (rosso nelle sonde)                          |
| 64  | `annotations-journey.js`              | 11            | PASS     | PASS     |                                                     |
| 65  | `annotations-review-fixes-journey.js` | 10            | PASS     | PASS     |                                                     |
| 66  | `encounter-builder-journey.js`        | 12            | PASS     | PASS     |                                                     |
| 67  | `campaign-settings-journey.js`        | 15            | PASS     | PASS     |                                                     |
| 68  | `character-library-journey.js`        | 17            | PASS     | PASS     |                                                     |
| 69  | `character-library-review-journey.js` | 10            | PASS     | PASS     |                                                     |
| 70  | `preferences-journey.js`              | 14            | PASS     | PASS     |                                                     |
| 71  | `command-palette-journey.js`          | 13            | PASS     | PASS     |                                                     |
| 72  | `notifications-journey.js`            | 25            | PASS     | PASS     |                                                     |
| 73  | `random-tables-journey.js`            | 24            | PASS     | PASS     |                                                     |
| 74  | `loot-journey.js`                     | 12            | PASS     | PASS     |                                                     |
| 75  | `loot-review-journey.js`              | 7             | PASS     | PASS     |                                                     |
| 76  | `loot-review2-journey.js`             | 6             | PASS     | PASS     |                                                     |
| 77  | `safety-journey.js`                   | 17            | PASS     | PASS     |                                                     |
| 78  | `media-journey.js`                    | 13            | PASS     | PASS     |                                                     |
| 79  | `media-review-journey.js`             | 13            | PASS     | PASS     |                                                     |
| 80  | `media-review2-journey.js`            | 7             | PASS     | PASS     |                                                     |
| 81  | `account-journey.js`                  | 10            | PASS     | PASS     |                                                     |
| 82  | `home-journey.js`                     | 13            | PASS     | PASS     |                                                     |
| 83  | `dice-3d-journey.js`                  | 18            | PASS     | PASS     |                                                     |
| 84  | `community-journey.js`                | 22            | PASS     | PASS     |                                                     |
| 85  | `assistant-journey.js`                | 14            | FAIL     | PASS     | riga 8                                              |
| 86  | `assistant-review-fixes.js`           | 11            | PASS     | PASS     |                                                     |
| 87  | `assistant-review-fixes-2.js`         | 9             | PASS     | PASS     |                                                     |
| 88  | `w1b-shell-journey.js`                | 6             | PASS     | PASS     |                                                     |
| 89  | `adventures-journey.js`               | 7             | PASS     | PASS     |                                                     |
| 90  | `builder-plus-journey.js`             | 20            | FAIL     | PASS     | riga 12                                             |
| 91  | `campaign-data-journey.js`            | 15            | PASS     | PASS     |                                                     |
| 92  | `combat-tracker-journey.js`           | 19            | PASS     | PASS     |                                                     |
| 93  | `combat-tracker-review-journey.js`    | 7             | PASS     | PASS     |                                                     |
| 94  | `damage-tray-journey.js`              | 11            | PASS     | PASS     |                                                     |
| 95  | `dice-tray-journey.js`                | 17            | PASS     | PASS     |                                                     |
| 96  | `dice-tray-review-journey.js`         | 11            | FAIL     | PASS     | riga 11 (regressione dell'app)                      |
| 97  | `fog-vision-journey.js`               | 11            | PASS     | PASS     |                                                     |
| 98  | `fog-vision-review-journey.js`        | 5             | PASS     | PASS     |                                                     |
| 99  | `generators-journey.js`               | 11            | PASS     | PASS     |                                                     |
| 100 | `homebrew-editor-journey.js`          | 12            | PASS     | PASS     |                                                     |
| 101 | `homebrew-editor-review-journey.js`   | 5             | PASS     | PASS     |                                                     |
| 102 | `integrations-journey.js`             | 9             | PASS     | PASS     | riga 5 (rosso nelle sonde)                          |
| 103 | `inventory-plus-journey.js`           | 18            | FAIL     | PASS     | riga 9                                              |
| 104 | `inventory-plus-review-journey.js`    | 6             | PASS     | PASS     |                                                     |
| 105 | `knowledge-journey.js`                | 10            | PASS     | PASS     |                                                     |
| 106 | `knowledge-review-journey.js`         | 8             | PASS     | PASS     |                                                     |
| 107 | `offline-journey.js`                  | 9             | PASS     | PASS     |                                                     |
| 108 | `party-journey.js`                    | 9             | PASS     | PASS     |                                                     |
| 109 | `projects-journey.js`                 | 6             | PASS     | PASS     |                                                     |
| 110 | `quests-journey.js`                   | 21            | PASS     | PASS     |                                                     |
| 111 | `quests-review-journey.js`            | 7             | PASS     | PASS     |                                                     |
| 112 | `quickbar-journey.js`                 | 9             | PASS     | PASS     |                                                     |
| 113 | `quickbar-review-journey.js`          | 6             | PASS     | PASS     |                                                     |
| 114 | `regions-journey.js`                  | 8             | PASS     | PASS     |                                                     |
| 115 | `relations-graph-journey.js`          | 11            | PASS     | PASS     |                                                     |
| 116 | `scene-assets-journey.js`             | 13            | PASS     | PASS     |                                                     |
| 117 | `scene-assets-review-journey.js`      | 9             | PASS     | PASS     |                                                     |
| 118 | `sessions-plus-journey.js`            | 15            | PASS     | PASS     |                                                     |
| 119 | `sheet-plus-journey.js`               | 21            | PASS     | PASS     |                                                     |
| 120 | `special-moves-journey.js`            | 22            | PASS     | PASS     |                                                     |
| 121 | `spells-plus-journey.js`              | 12            | FAIL     | PASS     | riga 13                                             |
| 122 | `spells-plus-review-journey.js`       | 10            | PASS     | PASS     |                                                     |
| 123 | `travel-journey.js`                   | 12            | PASS     | PASS     |                                                     |
| 124 | `travel-review-journey.js`            | 8             | PASS     | PASS     |                                                     |
| 125 | `w2a1-shell-journey.js`               | 7             | PASS     | PASS     |                                                     |
| 126 | `w2a2-shell-journey.js`               | 7             | PASS     | PASS     |                                                     |
| 127 | `w2b1-shell-journey.js`               | 8             | PASS     | PASS     |                                                     |
| 128 | `w2b2-cross-journey.js`               | 4             | PASS     | PASS     |                                                     |
| 129 | `w2b2-shell-journey.js`               | 7             | PASS     | PASS     |                                                     |
| 130 | `world-map-journey.js`                | 13            | PASS     | PASS     |                                                     |
| 131 | `world-map-review-journey.js`         | 7             | PASS     | PASS     |                                                     |
| 132 | `b62-ia-journey.js`                   | 10            | PASS     | PASS     |                                                     |
| 133 | `b62-review-fixes-journey.js`         | 7             | PASS     | PASS     |                                                     |
| 134 | `p1-first-use-journey.js`             | —             | PASS     | PASS     |                                                     |
| 135 | `p1-resume-touch-journey.js`          | —             | PASS     | PASS     |                                                     |
| 136 | `p1-builder-phone-journey.js`         | —             | PASS     | PASS     |                                                     |
| 137 | `p1-leveling-journey.js`              | —             | PASS     | PASS     |                                                     |
| 138 | `p1-foundry-import-journey.js`        | —             | PASS     | PASS     |                                                     |
| 139 | `p1-dm-map-journey.js`                | —             | PASS     | PASS     | riga 7                                              |
| 140 | `p1-cross-tab-journey.js`             | —             | PASS     | PASS     | riga 7 (rosso nelle sonde)                          |
| 141 | `p3-hp-journey.js`                    | 10            | PASS     | PASS     | riga 16 (rosso nel giro `final2`)                   |
| 142 | `p3-axe-hp-journey.js`                | 2             | PASS     | PASS     |                                                     |
| 143 | `p3-privacy-journey.js`               | 7             | PASS     | PASS     |                                                     |
| 144 | `p3-roll-engine-journey.js`           | 9             | PASS     | PASS     |                                                     |
| 145 | `p4-campaign-journey.js`              | 11            | PASS     | PASS     |                                                     |
| 146 | `p4-inventory-journey.js`             | 10            | PASS     | PASS     |                                                     |
| 147 | `p4-prep-journey.js`                  | 6             | PASS     | PASS     |                                                     |
| 148 | `p4-rest-journey.js`                  | 11            | PASS     | PASS     |                                                     |
| 149 | `p4-shared-journey.js`                | 4             | PASS     | PASS     |                                                     |
| 150 | `p4-shop-journey.js`                  | 10            | PASS     | PASS     |                                                     |
| 151 | `p5-fix-journey.js`                   | 7             | PASS     | PASS     |                                                     |
| 152 | `p5-fix-journey-2.js`                 | 4             | PASS     | PASS     |                                                     |
| 153 | `p6-dm-table-journey.js`              | 6             | PASS     | PASS     |                                                     |
| 154 | `p6-map-movement-journey.js`          | 7             | PASS     | PASS     |                                                     |
| 155 | `p6-phone-map-journey.js`             | 8             | PASS     | PASS     |                                                     |
| 156 | `p6-table-extras-journey.js`          | 11            | PASS     | PASS     |                                                     |
| 157 | `p6-table-more-journey.js`            | 6             | PASS     | PASS     |                                                     |
| 158 | `p8-library-journey.js`               | 6             | PASS     | PASS     |                                                     |
| 159 | `p9-journal-journey.js`               | 10            | PASS     | PASS     |                                                     |
| 160 | `p9-palette-journey.js`               | 7             | PASS     | PASS     |                                                     |
| 161 | `p9-services-journey.js`              | 6             | PASS     | PASS     |                                                     |
| 162 | `p9-sessions-journey.js`              | 7             | PASS     | PASS     |                                                     |
| 163 | `p10-governance-journey.js`           | 12            | PASS     | PASS     |                                                     |
| 164 | `r1-attack-journey.js`                | 3             | PASS     | PASS     | riga 14 (rosso nel giro `final`; difetto dell'app)  |
| 165 | `r1-connected-journey.js`             | 2             | PASS     | PASS     |                                                     |
| 166 | `r1-menu-journey.js`                  | 3             | PASS     | PASS     |                                                     |
| 167 | `r1-privacy-journey.js`               | 2             | PASS     | PASS     | riga 15 (rosso nel giro `final`)                    |
| 168 | `r1-rules-journey.js`                 | 4             | PASS     | PASS     |                                                     |
| 169 | `r2-connected-dice-journey.js`        | 5             | PASS     | PASS     |                                                     |
| 170 | `r2-disclosure-journey.js`            | 3             | PASS     | PASS     |                                                     |
| 171 | `r3-groups-journey.js`                | 3             | PASS     | PASS     |                                                     |
| 172 | `r3-mount-journey.js`                 | 3             | PASS     | PASS     |                                                     |
| 173 | `r3-phone-journey.js`                 | 4             | PASS     | PASS     |                                                     |
| 174 | `r3-transform-journey.js`             | 3             | PASS     | PASS     |                                                     |
| 175 | `r3-walls-journey.js`                 | 2             | PASS     | PASS     |                                                     |
| 176 | `r5-encounters-journey.js`            | 7             | PASS     | PASS     | riga 10 (rosso nelle sonde)                         |
| 177 | `r5-initiative-journey.js`            | 10            | PASS     | PASS     |                                                     |
| 178 | `r6-builder-variant-journey.js`       | 2             | PASS     | PASS     |                                                     |
| 179 | `r6-compat-packs-journey.js`          | 3             | PASS     | PASS     |                                                     |
| 180 | `r7-governance-journey.js`            | 8             | PASS     | PASS     |                                                     |
| 181 | `r8-copy-journey.js`                  | 5             | PASS     | PASS     |                                                     |
| 182 | `r8-filter-journey.js`                | 3             | PASS     | PASS     |                                                     |
| 183 | `r8-local-model-journey.js`           | 3             | PASS     | PASS     | riga 6                                              |
| 184 | `r8-modules-journey.js`               | 5             | PASS     | PASS     |                                                     |
| 185 | `r8-palette-journey.js`               | 4             | PASS     | PASS     |                                                     |
| 186 | `handoffs-journey.js`                 | 7             | PASS     | PASS     |                                                     |

186/186 PASS in `final3`, 1487 esiti `passed`.

## File toccati

- App (`design/blueprint/`): `sheet-plus.mjs` (`rememberedDice` e la finestra dei tiri che si apre
  sulla scelta ricordata), `state.mjs` (`acceptedRolls`: la ritirata con Ispirazione eroica è
  sempre un tiro nuovo). Test: `tests/r2-regression.test.mjs` (nuovo, 2 test, entrambi rossi prima
  della correzione). Contratto: `DEVELOPMENT.md`, sezione «Round-2 regression (29/09/2026)».
- Percorsi (`changes/interview-01/blueprint-checks/`): `library-mobile-journey.js`,
  `chat-review-fixes-journey.js`, `conditions-badges-journey.js`, `b11b-inc10-fixes-journey.js`,
  `integrations-journey.js`, `r8-local-model-journey.js`, `p1-dm-map-journey.js`,
  `assistant-journey.js`, `inventory-plus-journey.js`, `r5-encounters-journey.js`,
  `dice-tray-review-journey.js`, `builder-plus-journey.js`, `spells-plus-journey.js`,
  `r1-privacy-journey.js`, `p3-hp-journey.js`; `README.md`
  (i 53 percorsi dei pacchetti nell'ordine, il blocco dell'avvio del combattimento, il service
  worker, il paragrafo di questa regressione).
- Questo rapporto. Prettier sui file cambiati; i percorsi tengono la loro chiusura originale (con o
  senza `;` finale).
- Fuori dal repository (`r2-regress/`): `scripts/` (runner, verdetto, tabella, confronto), `probe/`
  (runner della sessione delle sonde e sonde `probe/debug/*.js`), `runs/<percorso>/` (immagini ed
  esiti), `logs/` (suite Node).

## Limiti

- Dati sintetici, Chrome di Playwright senza interfaccia, nessuna prova con persone reali.
- **Distintivi di stato sul telefono (decisione di design aperta).** All'apertura della mappa sul
  telefono l'intera scena sta nello schermo e i distintivi misurano 10,8 px con il glifo a 7 px
  (sotto i 14/9 px che il percorso chiedeva prima di P6); sono 26/17 px con la cella a 48,5 px, il
  primo ingrandimento oltre i 44 px. Il comportamento segue P6 TV-06 e il mercato (Foundry e Roll20
  scalano i segni di stato con la pedina). Se il proprietario vuole un minimo sullo schermo, come
  per i pulsanti delle porte, è una scelta del Tavolo, non un difetto: il percorso conserva le
  misure dell'apertura (`measures.phoneWholeScene`).
- **Finestra di 40 secondi con l'app rotta, durante `sweep1`.** Mentre correggevo `sheet-plus.mjs`
  una prima versione dichiarava due volte `dice`: il test l'ha segnalato subito e l'ho corretto in
  meno di un minuto, ma nel frattempo il server serviva il modulo rotto. In quella finestra girava
  `integrations` (verde) e partiva `inventory-plus`, che non ha trovato l'app avviata (rosso al
  primo giro, verde ripetuto e nel giro finale). Il giro finale gira tutto sul codice finale.
- I percorsi di P2 e P7 restano nelle loro cartelle delle prove (`fix-P2/journeys/`,
  `fix-P7/journeys/`) e non sono in questo giro: il README dei controlli non li elenca.
- Il verdetto automatico (`verdict.py`) conta come verde un percorso che arriva in fondo; per i
  percorsi che restituiscono osservazioni (colonna «—») la prova è che ogni controllo mancato
  interrompe il percorso con un errore.
- **`sweep1` non è una fotografia pulita di partenza.** Le correzioni sono arrivate mentre girava
  (una sessione di sonde lavorava in parallelo), quindi alcuni percorsi erano già aggiornati quando
  il giro li ha raggiunti: `chat-review-fixes`, `integrations`, `p1-cross-tab` (con `p1-dm-map`)
  e `r5-encounters` sono verdi in `sweep1` ma erano rossi nelle sonde (`p1`, `p6`, `audit2`). I
  rossi di partenza sono quindi l'unione dei rossi di `sweep1` e delle sonde, cioè le righe di
  «Cosa si rompeva e cosa ho cambiato».
- **Il primo verdetto era troppo indulgente.** Contava come verdi un'uscita vuota, un rifiuto della
  CLI e un percorso che restituisce `{"result": "FAIL"}` senza lanciare un errore (`builder-plus`,
  `spells-plus`). Dalle 18:48 il verdetto li segna rossi; la tabella «Percorso → passi → esito»
  ricalcola ogni esito dal JSON salvato con il verdetto finale.
- **Dadi digitali veri nei percorsi.** Molti percorsi tirano dadi digitali e controllano la
  conseguenza della faccia uscita (regola del README); un esito raro può quindi far cadere un
  percorso che di solito passa, come `r1-privacy` (1 volta su 3) o `p3-hp` (un 20 al tiro salvezza
  contro la morte, 1 volta su 20). `r1-attack` cadeva invece 1 volta
  su 20 per un difetto vero dell'app (riga 14): un rosso isolato va ripetuto nelle sonde e capito
  prima di concludere. Ho fissato i dadi solo dove il percorso ha bisogno di un esito preciso; ogni
  giro completo resta un campione.
- `encounter-lifecycle` ha un passo in meno rispetto al 26/09 (10 invece di 11): la migrazione di R5
  ha tolto «discard retains both results in UI», perché la finestra di avvio salva ogni tiro subito
  e non ha una bozza da scartare; la storia dei tiri conservata resta controllata dopo «Annulla».
  È una scelta di R5, segnalata qui perché riduce il conto.
