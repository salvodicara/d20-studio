# Integrazione dell’ondata W2b2 (B41, B46, B47, B53, B57, B58): prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · sessione browser `d20-w2b2-integ` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/W2b2-integ/` (fuori dal checkout).
Server locale `http://127.0.0.1:8879/` senza cache. Solo dati sintetici.

Aree dell’ondata:

- B41 regioni, trappole e comportamenti (`regions`)
- B46 conoscenza, esame, furtività e copertura (`knowledge`)
- B47 scene avanzate: livelli, varianti, oggetti, prefabbricati, UVTT (`scene-assets`)
- B53 comandi personali e barra rapida (`quickbar`)
- B57 generatori procedurali assistiti (`generators`)
- B58 grafo delle relazioni (`relations-graph`)

## Esito in breve

- **Test Node.** Suite completa verde all’inizio: **2024/2024**. Dopo le mie correzioni:
  **2035/2035**. Ultima esecuzione: **2037/2037**, compresi i 5 test nuovi di
  `w2b2-integration.test.mjs`. Gli altri test in più sono arrivati da altri builder nel
  frattempo. Nessun rosso in nessuna esecuzione.
- **Percorsi dell’ondata nel browser.** I 9 percorsi dell’ondata sono verdi due volte, prima e
  dopo le correzioni: 92 gruppi `passed` per passata, 0 errori di pagina.
- **Regressioni richieste.** Verdi: combat, campaign-integration, library, rest-shared e
  conditions.
  - `core-journey.js` è rosso, ma **non per quest’ondata**. Fallisce identico con i sei moduli
    W2b2 spenti. La causa è B34: da quando c’è il vassoio dei dadi, «Tira i dadi» apre la
    scheda Dadi invece della finestra «Tiro libero», che il percorso si aspetta.
  - Ho eseguito una copia del percorso che fa lo stesso tiro fisico (8 + 2) dal vassoio. È
    verde, 13/13: tutti gli altri passi del core passano con l’ondata caricata.
- **Caricamento pulito.**
  - 0 errori di pagina.
  - 0 errori o avvisi in console.
  - 0 richieste fallite. Le 48 aree pianificate sono tutte costruite, quindi i 404 «da
    costruire» delle ondate precedenti non ci sono più.
- **«Cosa è pronto».** Mostra il resoconto del registro: **«48 pronte · 0 da costruire · 0
  con errori»**. Le sei aree sono «attiva» e nessuna ha avvisi circoscritti. Contributi per
  area:

  | Area | Contributi |
  | ---- | ---------- |
  | B41  | 8          |
  | B46  | 15         |
  | B47  | 20         |
  | B53  | 18         |
  | B57  | 8          |
  | B58  | 4          |

- **Intestazione e navigazione.** L’ondata non aggiunge nulla all’intestazione né alla riga
  del titolo del Tavolo, e i numeri sono identici a W2a2:
  - a 1440 una riga, con 12 comandi nella Home e 10 al Tavolo;
  - nella riga del titolo del Tavolo solo i comandi del core: 4 per il DM, 1 per il giocatore;
  - a 390 l’intestazione della Home ha 2 righe (109 px) e quella del Tavolo 1 riga (63 px);
  - nessun comando fuori schermo, sovrapposto o sotto i 40 px.
- **Trovabilità.** Ogni ingresso dell’ondata è dove lo mette il registro, a ≤ 2 clic o tocchi
  (dettaglio sotto). Due difetti nascevano dall’incontro tra aree e li ho corretti:
  - la striscia delle sezioni della Preparazione, dove alcune sezioni erano irraggiungibili;
  - il passaggio verso una scena archiviata.

## Cosa si rompeva tra aree e cosa ho corretto

Correzioni minime e additive: firme ed esiti esistenti invariati. Per ognuna ho scritto prima
il test, l’ho visto fallire e poi ho corretto.

| #   | Interazione                                                              | Sintomo (riprodotto)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | B47 e B41 (e B40) nella striscia della Preparazione del core             | Con «Scene avanzate» (B47), «Regioni e trappole» (B41) e «Movimento e griglia» (B40) le sezioni sono 11, in una striscia larga 1237 px. A 1440 se ne vedono 9: «Movimento e griglia» e «Avventure» (B49) sono fuori, senza nessuna indicazione. A 390 se ne vedono 2 o 3, e «Regioni e trappole» è fuori. È la regola di B61 (una voce conta solo se nessuna striscia deve scorrere di lato per mostrarla), la stessa corretta per il Tavolo, per la campagna e (W2a2) per la scheda.                         | «Tutte le sezioni della preparazione» a fine striscia, con icona a griglia ed etichetta «Tutte» / «All». È il salto rapido di D&D Beyond (DDB-060), lo stesso controllo della campagna, della scheda e di «Tutti i pannelli» del Tavolo. Apre «Sezioni della preparazione» con tutte le 11 sezioni e segna quella aperta. Dopo la scelta, la sezione aperta resta in vista nella striscia ridisegnata. Esc chiude senza navigare e il fuoco torna al pulsante. Resta visibile a ogni larghezza, perché le sezioni non ci stanno nemmeno a 1440. |
| 2   | B47 (archivio delle scene, Roll20) e B41 (passaggi, Stairways e Portals) | Il DM archivia «La cripta sotto il cortile» da Preparazione › Scene avanzate. Livia che attraversa «Scale per la cripta» viene fermata sul bordo (x 860) e le si chiede «Prendi il passaggio / Resta qui». Se lo prende, il rifiuto dice «La creatura non è più sulla scena», ma lei è lì. Lo stesso messaggio compare se la domanda era già aperta quando la cripta è stata archiviata. Riprodotto in Node (`node/archive-passage.mjs`, prima della correzione); la correzione è poi verificata nel browser. | `regions-domain.mjs`: un passaggio puro (solo passaggio e messaggi) i cui arrivi stanno tutti su scene non più nell’elenco (archiviate o eliminate) non ferma e non chiede. Ripristinando la scena torna attivo. Se la domanda era già aperta, «Prendi il passaggio» è rifiutato con «La scena d’arrivo del passaggio non è disponibile: è archiviata o eliminata.». Nulla viene applicato e «Resta qui» chiude ancora la domanda. Le regioni miste (danno più passaggio) non cambiano: ricevono solo il messaggio giusto.                      |
| 3   | Seme di B41 e percorso di B15                                            | `handouts-journey.js` falliva al passo del telefono. `[data-prep-scene-name*="cortile"]` trovava due scene: il cortile e «La cripta sotto il cortile», che B41 aggiunge al seme. Senza i moduli W2b2 il percorso passa (15/15).                                                                                                                                                                                                                                                                               | Il percorso ora sceglie la riga del cortile (`.prep-scene-row` che contiene `[data-prep-activate="old-watch"]`). Asserzioni invariate. Verde: 15/15.                                                                                                                                                                                                                                                                                                                                                                                            |

Codice delle correzioni:

- `design/blueprint/preparation.mjs`:
  - import di `scrollIntoStrip` da `ui.mjs`;
  - `prepSections`: un contenitore `.prep-sections-bar` attorno alla striscia esistente, con il
    pulsante `[data-prep-sections-all]` dopo di essa. Non ha `data-prep-section`, quindi non
    conta come sezione. Senza sezioni d’area la pagina resta identica: niente striscia e niente
    pulsante (test «without area sections…» e `registry-shell` verdi);
  - `bindPreparation`: `scrollIntoStrip` sulla sezione aperta e il dialogo. Le voci del dialogo
    sono `[data-prep-section-jump]`, così i selettori `[data-prep-section]` dei percorsi
    esistenti trovano ancora solo la striscia.
- `design/blueprint/preparation.css`: il blocco `.prep-sections-bar` / `.prep-sections-all`,
  aggiunto in fondo.
- `design/blueprint/regions-domain.mjs`, tre aggiunte:
  - la funzione `leadsNowhere`;
  - un `continue` in `movementStop`;
  - un controllo in `answerPassage` prima di quello esistente, che non cambia.
- `changes/interview-01/blueprint-checks/handouts-journey.js`: un solo selettore.
- `design/blueprint/tests/w2b2-integration.test.mjs` (nuovo, 5 test):
  - il pulsante, unico e fuori dall’elenco delle sezioni;
  - le etichette in italiano e in inglese;
  - nessun pulsante senza sezioni d’area;
  - la scena archiviata: nessuna fermata né domanda; con Ripristina il passaggio porta di
    nuovo nella cripta;
  - la domanda già aperta: rifiuto motivato, nulla applicato, «Resta qui» funziona.
- Nel browser, `w2b2-cross-journey.js`, 4 gruppi verdi:
  - (1a) cripta archiviata dalla vera interfaccia di B47: Livia attraversa le scale, nessun
    evento, nessuna domanda;
  - (1b) la domanda è aperta e il DM archivia: rifiuto con il motivo e Livia resta; «Resta
    qui» chiude la domanda;
  - (1c) Ripristina: Livia prende le scale, arriva nella cripta a (120, 120) e ci resta dopo il
    ricaricamento;
  - (2) da tastiera: Invio apre «Tutte le sezioni» e il fuoco entra nel dialogo; Esc chiude
    senza navigare e riporta il fuoco al pulsante; «Avventure», fuori dalla striscia a 1440, si
    raggiunge in 2 passi e resta visibile nella striscia ridisegnata.

  Immagini: `runs/w2b2-cross/01…04`.

## Percorsi: esito

Metodo: le copie dei percorsi cambiano solo la cartella delle immagini. Sono eseguite in
sequenza nella sessione `d20-w2b2-integ` con `scripts/prep.sh` e `scripts/run.sh`, lo stesso
metodo degli integratori W1a, W1b, B61 e W2a. Risultati in `runs/<percorso>/<passata>.json` e
riepiloghi in `results-<passata>.txt`.

### Ondata e regressioni richieste

| Percorso                           | `run1` (prima delle correzioni) | `run2` (dopo) | Errori di pagina | Note                                                                                                                                                    |
| ---------------------------------- | ------------------------------- | ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| regions (B41)                      | 8                               | 8             | 0                |                                                                                                                                                         |
| knowledge (B46)                    | 10                              | 10            | 0                |                                                                                                                                                         |
| knowledge-review (B46-rf)          | 8                               | 8             | 0                |                                                                                                                                                         |
| scene-assets (B47)                 | 13                              | 13            | 0                | restituisce un testo; asserzioni interne                                                                                                                |
| scene-assets-review (B47-rf)       | 9                               | 9             | 0                | idem                                                                                                                                                    |
| quickbar (B53)                     | 9                               | 9             | 0                |                                                                                                                                                         |
| quickbar-review (B53-rf)           | 6                               | 6             | 0                |                                                                                                                                                         |
| generators (B57)                   | 11                              | 11            | 0                | idem                                                                                                                                                    |
| relations-graph (B58)              | 18                              | 18            | 0                |                                                                                                                                                         |
| core                               | rosso                           | rosso         | —                | non W2b2: fallisce identico senza i sei moduli (prova di controllo). È `[name=mode]` della finestra «Tiro libero», che B34 ha sostituito con il vassoio |
| core, copia con il vassoio (prova) | 13                              | 13            | 0                | stesso tiro fisico 8 + 2 = 10 registrato dal vassoio; gli altri 12 passi del core sono invariati                                                        |
| combat                             | 10                              | 10            | 0                |                                                                                                                                                         |
| campaign-integration               | 2                               | 2             | 0                |                                                                                                                                                         |
| library                            | 3                               | 3             | 0                |                                                                                                                                                         |
| rest-shared                        | 3                               | 3             | 0                |                                                                                                                                                         |
| conditions                         | 11                              | 11            | 0                | `findings: []`                                                                                                                                          |
| `w2b2-shell-journey.js` (nuovo)    | rosso (difetto n. 1)            | 7 (due volte) | 0                | caricamento, pagine, «Cosa è pronto», densità, trovabilità a 1440 e 390 IT/EN                                                                           |
| `w2b2-cross-journey.js` (nuovo)    | rosso (difetti n. 1 e 2)        | 4             | 0                | i due difetti corretti, nell’app vera                                                                                                                   |

### Regressioni aggiunte (aree che l’ondata tocca)

Le ho scelte perché passano dai file condivisi che le aree dell’ondata hanno esteso:

- gli agganci di B41 e B46 in `combat.mjs` e `combat-ui.mjs`;
- la fila `dock-row` di B53 in `table.mjs` e `registry.mjs`;
- l’aggancio di B57 in `preparation.mjs`;
- la parte «Relazioni» di B58 in `journal-plus.mjs`;
- la striscia della Preparazione che ho corretto io.

Verdi:

| Percorso               | Gruppi `passed` |
| ---------------------- | --------------- |
| preparation            | 9               |
| encounter-builder      | 12              |
| handouts               | 15              |
| random-tables          | 24              |
| adventures             | 7               |
| token-menu             | 19              |
| quests                 | 13              |
| quests-review          | 13              |
| spatial                | 8               |
| spatial-mobile         | 6               |
| approach               | 7               |
| reactions              | 8               |
| simultaneous-reactions | 6               |
| new-npc-reaction       | 4               |
| encounter-lifecycle    | 11              |
| combat-mobile          | 10              |
| concentration          | 10              |
| fog-vision             | 11              |
| combat-tracker         | 19              |
| conditions-mobile      | 3               |
| registry-smoke         | 18              |
| w1b-shell              | 6               |
| w2a1-shell             | 7               |
| w2a2-shell             | 7               |

Il percorso handouts è verde dopo la correzione n. 3.

Rossi che **non** dipendono da W2b2 (`scripts/without-w2b2.sh`: moduli dell’ondata risposti
404 in ogni contesto, anche nella pagina di partenza):

| Percorso            | Con W2b2 | Senza W2b2 | Senza B40 | Causa                                                                                 |
| ------------------- | -------- | ---------- | --------- | ------------------------------------------------------------------------------------- |
| core                | rosso    | rosso      | —         | B34: «Tira i dadi» apre il vassoio                                                    |
| b61-table-structure | rosso    | rosso      | —         | B34: stesso passo (`#dialog select[name="mode"]`)                                     |
| b61-review-fixes    | rosso    | rosso      | —         | B34: la scheda «Prova i dadi» di B56 è assorbita da «Dadi»; elenco fisso delle schede |
| area                | rosso    | rosso      | **verde** | B40 (movimenti speciali, in costruzione in parallelo): `.combat-targets` non compare  |
| multi-self          | rosso    | rosso      | rosso     | «Dash destination/resource mismatch»: né W2b2 né il solo B40                          |
| loot                | rosso    | rosso      | —         | «livia purse wrong»: la borsa iniziale di Livia è cambiata fuori da quest’ondata      |

### Audit di trovabilità di B61 con l’ondata

Ho eseguito una copia di `b61-review-fixes-journey.js`, `variants/b61-review-fixes-w2b2-journey.js`,
solo nella cartella delle prove. Cambia due cose:

- l’elenco delle schede attuali: «Dadi» di B34 al posto di «Prova i dadi», più «Regole di
  movimento» di B40 per il DM e «Scena» di B47;
- gli strumenti dell’ondata: «Linea di vista» per tutti, «Regioni e trappole» per il DM.

Ho registrato, senza verificarlo, il controllo «barra delle azioni in combattimento su una
riga»: a 1440 va su due righe per B40 (sotto).

Risultato: verde, 6 gruppi.

- La scheda «Scena» si apre in 1 clic a 1440, per il giocatore e per il DM, e in 2 tocchi a
  390 (barra più «Tutti i pannelli»).
- «Linea di vista» si raggiunge in 2 clic (gruppo Misura, poi strumento), «Regioni e
  trappole» del DM in ≤ 2 (gruppo Strumenti del DM).
- A 1440 × 900 il DM ha 21 schede. Ne restano fuori dalla barra 5, le stesse di W2a1 con
  «Dadi» al posto di «Prova i dadi»: Annotazioni, Visione, Dadi, Immagini e file, Sicurezza.
  Tutte sono a 2 clic da «Tutti i pannelli».
- A 1366 × 768 la barra ne mostra 16 su 21.
- Al 125 % di interfaccia e testo ogni strumento di ogni gruppo si raggiunge.

## Trovabilità degli ingressi dell’ondata (da `w2b2-shell-journey.js`)

| Ingresso (collocazione del registro)                                  | 1440 IT (mouse)                                                                                                                                                                                            | 390 IT ed EN (tocco)                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| B41 «Regioni e trappole», barra a sinistra › Strumenti del DM         | 2 clic (DM); il giocatore non lo vede                                                                                                                                                                      | 2 tocchi (DM)                                                                                |
| B46 «Linea di vista», barra a sinistra › Misura                       | 2 clic, entrambi i ruoli                                                                                                                                                                                   | 2 tocchi, entrambi i ruoli                                                                   |
| B47 scheda «Scena» della barra laterale                               | 1 clic, entrambi i ruoli                                                                                                                                                                                   | 2 tocchi. Dopo il salto restano sullo schermo la scheda aperta, «Mappa» e «Tutti i pannelli» |
| B53 barra rapida, fila della barra delle azioni                       | visibile senza clic: 10 caselle su 10, nessuna sotto i 40 px                                                                                                                                               | visibile: 6 caselle su 10, le altre nella sua striscia laterale (scelta documentata da B53)  |
| B46 «Conoscenza» nella scheda Creatura (goblin scelto)                | presente per giocatore e DM. Riquadri d’area sul goblin: 11 per il giocatore, 12 per il DM                                                                                                                 | —                                                                                            |
| Menu della pedina (B12)                                               | goblin: 5 voci per il giocatore (con «Esamina»), 29 per il DM. Livia: 17 per il giocatore, 23 per il DM, con «Nasconditi…», «Cerca…» e «Cerca trappole». Il menu sta nello schermo e scorre al suo interno | —                                                                                            |
| B47 e B41 sezioni della Preparazione                                  | «Scene avanzate» e «Regioni e trappole» nella striscia: 1 clic. «Movimento e griglia» e «Avventure» fuori striscia: 2 clic con «Tutte» (correzione n. 1)                                                   | «Scene avanzate» 1 tocco, «Regioni e trappole» 2 tocchi con «Tutte»                          |
| B57 «Genera…» accanto a «Nuova scena»; «Genera incontro…» in Incontri | presenti                                                                                                                                                                                                   | —                                                                                            |
| B58 Campagna › Archivio › Relazioni › «Elenco \| Grafo»               | 3 clic, giocatore e DM                                                                                                                                                                                     | il grafo si apre senza scorrimento orizzontale                                               |
| B53 «Azioni personalizzate» nella scheda Azioni del personaggio       | presente (Livia per il giocatore, Doran per il DM)                                                                                                                                                         | —                                                                                            |

Immagini: `runs/w2b2-shell/01…07`.

## Aperti (non corretti qui, con motivo)

1. **Percorsi di regressione superati da B34 (W2b1).**
   - `core-journey.js`, `b61-table-structure-journey.js` e `b61-review-fixes-journey.js`
     aspettano la finestra «Tiro libero» e la scheda «Prova i dadi», che B34 ha sostituito.
   - Il rapporto di B34 elenca gli effetti su `dice-3d-journey.js` e
     `chat-review-fixes-journey.js`, ma non su questi tre.
   - Non li ho modificati: B34 non è di quest’ondata, e il suo integratore o il coordinatore li
     aggiornerà.
   - Le mie copie in `variants/` mostrano cosa cambiare: il tiro fisico 8 + 2 dal vassoio
     (`[data-dtray-formula]`, `[data-dtray-mode][value=physical]`, `[data-dtray-face="0"]`); la
     riga del registro diventa «[8] + 2 = 10 · dado fisico»; «dice-tray» al posto di «dice-3d»
     nell’elenco delle schede.
2. **B40 in costruzione (W2b1).** Due problemi spariscono se si spegne il solo B40:
   - `area-journey.js`: `.combat-targets` non compare;
   - a 1440 × 900, in combattimento, «Termina turno» va su una seconda riga della barra delle
     azioni, che l’audit di B61 vuole su una riga.

   Da rivedere quando B40 sarà chiuso.

3. **`multi-self` e `loot` rossi fuori dall’ondata.** Falliscono anche senza W2b2, e
   `multi-self` anche senza B40. Vanno attribuiti dall’integratore di W2b1 o dal coordinatore.
4. **Due «Cerca» per la stessa azione (B41 × B46, regole, P2).**
   - Nel menu della pedina ci sono «Cerca…» di B46, che trova le creature nascoste, e «Cerca
     trappole» di B41, che trova le trappole entro 3 m.
   - Sono due azioni Cercare separate, ciascuna con il suo tiro di Saggezza (Percezione). In
     combattimento ognuna spende l’Azione, quindi se ne fa una sola per turno.
   - Nell’SRD 5.2.1 (EN 187 / IT 212) Cercare è **una** prova, e Percezione vale per una
     creatura o un oggetto nascosti. Con un solo tiro Mira dovrebbe poter trovare sia il goblin
     nascosto sia la piastra.
   - Oggi, in combattimento, sceglie l’uno o l’altro.
   - Correggerlo cambia il comportamento di due aree, quindi non è una correzione minima. Ne
     servirebbe una comune: una sola voce «Cerca…» che con lo stesso tiro risolve entrambe
     (evento condiviso o chiamata reciproca).
5. **Densità del menu della pedina (B12, P3).**
   - Sul goblin il DM ha 29 voci (altezza 1491 px in un pannello di 882), di cui 6 dell’ondata
     in fondo.
   - Per Livia le voci sono 23 per il DM e 17 per il giocatore.
   - Si raggiungono scorrendo il menu o con le frecce, ma sotto la piega.
   - Un raggruppamento in sottomenu come quello di Roll20 (voce «›», già usata da B12 per
     Condizioni e Colore) va deciso dal proprietario di B12.
6. **Barra delle azioni più alta con la barra rapida (B53, P3).**
   - A 390 × 844 la barra delle azioni fissata passa da 128 a 228 px. La mappa visibile sopra
     scende da 420 a 329 px.
   - A 1440 × 900 passa da 104 a 170 px: la pagina del Tavolo scorre di 4 px e la mappa
     visibile resta di 370 px.
   - Nessun comando è nascosto (verificato da B61 e dal mio percorso). Resta una scelta di
     densità per il proprietario di B53: per esempio, la barra rapida chiusa per impostazione
     predefinita sul telefono.
7. **La Preparazione ha 11 sezioni.** «Tutte le sezioni» le rende tutte raggiungibili in 2
   clic. Raggruppare quelle affini, come Tesori con Mercanti o Materiali con Sessione, è una
   scelta di struttura, come l’aperto n. 1 di W2a1 per la barra del Tavolo.

## File

Nuovi (miei):

- `design/blueprint/tests/w2b2-integration.test.mjs`
- `changes/interview-01/blueprint-checks/w2b2-shell-journey.js`
- `changes/interview-01/blueprint-checks/w2b2-cross-journey.js`
- questo rapporto

Modifiche additive a file condivisi:

- `design/blueprint/preparation.mjs`
- `design/blueprint/preparation.css`
- `design/blueprint/regions-domain.mjs` (area B41)
- `changes/interview-01/blueprint-checks/handouts-journey.js` (un selettore)
- `changes/interview-01/blueprint-checks/README.md` (un paragrafo in fondo)

Prettier passa su tutti. Nei percorsi manca il punto e virgola finale, come chiede il README.
Prove fuori dal checkout:

- `scripts/`: prep, run, verdict e controllo senza W2b2 o senza B40;
- `variants/`: copie di core e dell’audit di B61;
- `node/`: inventario dei contributi del registro e sonda archivio × passaggio;
- `probes/`, `runs/` e i file `node-run1…3.txt`.

Dall’inventario (`node/inventory.json`, tutte le 48 aree caricate in Node):

- nessuna scorciatoia in conflitto e nessuna etichetta del menu della pedina duplicata;
- 0 avvisi del registro;
- ordini uguali tra livelli della mappa, risolti dall’ordine di registrazione:
  - le forme delle regioni di B41 al 22, insieme al livello a terra di B40;
  - i segni delle regioni di B41 al 61, insieme ai tetti di B47 e agli stati di B33 (i segni
    finiscono sotto i tetti, come le pedine);
  - i segni di B46 al 72, insieme a B40.

  Non producono effetti visibili nei percorsi.
