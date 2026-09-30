# Integrazione dell’ondata W2a1 (B32, B35, B39, B42–B45): prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · sessione browser `d20-w2a1-integ` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/W2a1-integ/` (fuori dal checkout).
Server locale `http://127.0.0.1:8879/` senza cache. Solo dati sintetici.

Aree dell’ondata:

- B32 tracker di combattimento completo (`combat-tracker`)
- B35 nebbia, luci e visione (`fog-vision`)
- B39 creazione: percorsi rapidi, personaggi pronti, controlli (`builder-plus`)
- B42 mondo: mappa, calendario, cronologia (`world-map`)
- B43 missioni, fazioni, reputazione e diario strutturato (`quests`)
- B44 gruppo: riepilogo del DM, magie condivise, basi, veicoli (`party`)
- B45 esplorazione, viaggio e accampamento (`travel`)

## Esito in breve

- **Test Node.** Suite completa verde all’inizio: **1710/1710**. Dopo le correzioni:
  **1712/1712** (94 file), compresi i 2 test nuovi di `w2a1-integration.test.mjs`. Nessun rosso
  in nessuna esecuzione.
- **Percorsi dell’ondata e regressioni richieste.** I 12 percorsi dell’ondata e le 6 regressioni
  richieste sono verdi prima e dopo le correzioni: **181 gruppi `passed`, 0 errori di pagina**
  per passata.
- **Sei percorsi rossi tra aree, ora verdi.**
  - I cinque rossi del rapporto W2a2 (notifications, character-library, campaign-settings,
    b61-review-fixes, b61-table-structure) erano rossi anche qui all’inizio. Un sesto,
    `session-view`, è emerso nelle regressioni aggiunte.
  - Quattro cause vengono dall’ondata: il doppione della notifica di turno di B32, la scena della
    torre seminata da B35 (tre percorsi) e le schede nuove nell’audit di B61.
  - La quinta è un difetto B27 × B61 già presente; con l’ondata caricata la gara di tempi si
    perde sempre.
  - Ho corretto 2 difetti nel prodotto (#1, #2) e aggiornato 4 percorsi alle aree nuove (#3–#5).
- **Tutti i 110 percorsi della cartella** eseguiti nella stessa sessione: tutti verdi, nell’ordine
  giusto (vedi «Regressioni aggiunte»).
- **Caricamento.**
  - 0 errori di pagina.
  - 0 errori o avvisi in console, tranne 12 risposte 404. Ciascuna è un’area pianificata e non
    ancora costruita, che il caricatore del registro prova a importare: è così per progetto (B11).
    Lo «zero errori» letterale quindi non c’è; vedi «Aperti».
  - Nessun’altra richiesta fallita, nessun avviso d’area nella striscia.
- **«Cosa è pronto».** Mostra il resoconto del registro: **«36 pronte · 12 da costruire · 0 con
  errori»**. Le sette aree sono «attiva», senza avvisi circoscritti:

  | Area | Contributi |
  | ---- | ---------- |
  | B32  | 7          |
  | B35  | 16         |
  | B39  | 8          |
  | B42  | 7          |
  | B43  | 11         |
  | B44  | 7          |
  | B45  | 9          |

- **Intestazione.** Nessun pulsante nuovo: l’ondata non aggiunge servizi all’intestazione, né
  pulsanti d’area nella riga in alto del Tavolo. Numeri uguali a W2a2:
  - a 1440: una riga, 12 comandi nella Home, 10 al Tavolo;
  - a 390: 2 righe (109 px) nella Home, una riga (63 px) al Tavolo, ogni bersaglio ≥ 40 px.
- **Barra laterale del Tavolo.** Resta un punto aperto di densità (P2, vedi «Aperti»). Il DM ha
  ora 19 schede. A 1440 × 900 ne vede 14; le altre 5 (Annotazioni, Visione, Prova i dadi,
  Immagini e file, Sicurezza) si aprono in 2 clic da «Tutti i pannelli». Tutto resta trovabile,
  ma la barra del DM non sta più in una finestra da portatile.

## Cosa si rompeva tra aree e cosa ho corretto

| #   | Interazione                               | Sintomo (riprodotto)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | B32 × B24 (campanella)                    | Al turno di Livia la campanella del giocatore ha **due** voci «È il tuo turno: Livia»: una del nucleo di B24 (categoria Turni), una di B32 (in «Altre aree»). Due voci per la stessa notizia, e due avvisi a comparsa se il giocatore attiva i Turni. Test nuovo, prima della correzione: `["È il tuo turno: Livia","È il tuo turno: Livia"]`. Percorso `notifications`: «strict mode violation … 2 elements».                                                                                                                                                                                                                                                                       | **Prodotto** (`combat-tracker.mjs`, `collectNotices`): B32 non ripete più «È il tuo turno». Nella campanella la notizia la dà B24, come negli avvisi di cambio turno di Fantasy Grounds (R20-176, fonte già citata da B24). B32 tiene il suo avviso sul Tavolo («Tocca a te, Livia!») e aggiunge alla campanella solo «Il prossimo turno è tuo», che B24 non ha. Test `w2a1-integration.test.mjs` (2): una sola voce di turno IT/EN; «prossimo turno» ancora presente.                                                      |
| 2   | B27 (Sicurezza) × B61 (schede del Tavolo) | Aprendo la scheda Sicurezza da tastiera (Invio), B27 sposta il fuoco sui «Segnali di sicurezza». Così Home e le frecce non funzionano più sulla scheda. Lo schema delle schede WAI-ARIA, adottato da B61, lascia il fuoco sulla scheda. Il difetto c’è anche senza W2a1: la sonda lo mostra in entrambi i casi (`probes/before-fix.txt`). Il percorso però passava o falliva per una gara di tempi: con W2a1 caricato, nelle mie esecuzioni e in quelle di W2a2, perdeva sempre; con i moduli W2a1 spenti passava. W2a2 l’aveva attribuito a B27 × B61, con ragione. Sotto c’era un secondo difetto: da una scheda, Tab saltava il pannello aperto e andava alla barra delle azioni. | **Prodotto**, due modifiche additive. `safety-ui.mjs`: le carte prendono il fuoco solo con un clic o un tocco (`event.detail !== 0`); il comportamento verificato dal percorso di B27 (clic e tocco) non cambia. `table.mjs`: nell’elenco delle schede, Tab entra nel pannello aperto (primo controllo), come vuole lo schema WAI-ARIA. Dalla scheda Sicurezza aperta da tastiera, Stop è a 2 Tab (prima «Chiudi pannello»). Controllo nel browser: `w2a1-shell` (sezione 4) e `probes/safety-keys-result.txt`, 1440 e 390. |
| 3   | B35 (seme della torre) × B21, B20         | B35 aggiunge alla campagna la scena «Torre della lanterna», con Mira e i due goblin. Così `character-library` legge «Pedine tolte dalle mappe della campagna: 2» e si aspettava 1. `campaign-settings` legge «2 creature cambieranno su 2 scene» e si aspettava «su 1 scena». I conteggi del prodotto sono giusti per i dati.                                                                                                                                                                                                                                                                                                                                                        | **Percorsi**: i due percorsi calcolano il numero atteso dalle scene salvate, non da un 1 fisso. Nessun cambio al prodotto.                                                                                                                                                                                                                                                                                                                                                                                                  |
| 4   | B35 (seme della torre) × B14 (sessione)   | Il pannello Sessione mostra «Crea un’altra scena in Preparazione» solo con una scena sola. Con la torre le scene sono due, il pulsante non c’è e `session-view` si fermava (timeout).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | **Percorso**: se la scorciatoia non c’è, la Preparazione si apre da «Scene» del Tavolo, il comando del DM già presente. Il prodotto di B14 non cambia: con due scene il pannello le elenca entrambe. Controllo: 15/15.                                                                                                                                                                                                                                                                                                      |
| 5   | Schede W2a1 × audit di B61                | `b61-review-fixes` aveva l’elenco fisso delle schede dell’ondata 1 («player: unexpected tabs»). Con le schede nuove, la verifica «tutte le 13 schede del DM stanno in 1366 × 768» non può più passare.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | **Percorso**: l’audit include le schede W2a1 (DM 17 schede d’area + Registro, giocatore 11 + Registro). Ogni scheda è raggiunta in ≤ 2 clic: 1 se la barra la mostra, 2 da «Tutti i pannelli». Le schede fuori dalla barra finiscono in `railOverflow` nel risultato, e a 1366 × 768 ognuna deve comparire in «Tutti i pannelli». Il problema di densità resta aperto (vedi «Aperti»): l’ho misurato, non nascosto.                                                                                                         |

## Percorsi: esito

Metodo degli integratori precedenti (W1a, W1b, B61, W2a2). Sono copie in
`scripts/<percorso>-wrapped.js` che cambiano solo la cartella delle immagini, eseguite in
sequenza nella sessione `d20-w2a1-integ` con `scripts/prep.sh` e `scripts/run.sh`. Risultati
in `runs/<percorso>/<passata>.json`, riepiloghi in `results-<passata>.txt`.

`scripts/verdict.py` ora decodifica anche i risultati restituiti come testo JSON. Per questo
alcuni conteggi di `results-run1.txt` erano sbagliati (righe di testo invece dei gruppi).
Ricalcolati su tutti i file in `results-all-rescored.txt`, sono quelli qui sotto.

### Ondata e regressioni richieste

| Percorso                    | `run1` (prima) | `final` (dopo) | Errori di pagina |
| --------------------------- | -------------- | -------------- | ---------------- |
| combat-tracker (B32)        | 19             | 19             | 0                |
| combat-tracker-review (B32) | 7              | 7              | 0                |
| fog-vision (B35)            | 11             | 11             | 0                |
| fog-vision-review (B35)     | 5              | 5              | 0                |
| builder-plus (B39)          | 20             | 20             | 0                |
| world-map (B42)             | 13             | 13             | 0                |
| world-map-review (B42)      | 7              | 7              | 0                |
| quests (B43)                | 21             | 21             | 0                |
| quests-review (B43)         | 7              | 7              | 0                |
| party (B44)                 | 9              | 9              | 0                |
| travel (B45)                | 12             | 12             | 0                |
| travel-review (B45)         | 8              | 8              | 0                |
| core                        | 13             | 13             | 0                |
| combat                      | 10             | 10             | 0                |
| campaign-integration        | 2              | 2              | 0                |
| library                     | 3              | 3              | 0                |
| rest-shared                 | 3              | 3              | 0                |
| conditions                  | 11             | 11             | 0                |

Totale: 181 gruppi per passata. `conditions` restituisce `findings: []`.

### I percorsi rossi tra aree

| Percorso            | `run1` | Senza W2a1 (controllo)    | Dopo (`final`) | Causa e correzione |
| ------------------- | ------ | ------------------------- | -------------- | ------------------ |
| notifications       | rosso  | —                         | 25             | #1                 |
| b61-table-structure | rosso  | 6 (verde per tempi)       | 6              | #2                 |
| character-library   | rosso  | —                         | 17             | #3                 |
| campaign-settings   | rosso  | —                         | 15             | #3                 |
| session-view        | rosso  | 15 (con lo stesso ordine) | 15             | #4                 |
| b61-review-fixes    | rosso  | —                         | 6              | #5                 |

Ho eseguito anche `safety` (17), perché la correzione #2 tocca B27: verde, con il fuoco sulle
carte dopo clic e tocco.

### Regressioni aggiunte

Ho eseguito tutti gli altri percorsi della cartella (86, passata `extra`), nell’ordine del README
dove conta. 83 erano verdi subito, con 677 gruppi `passed` in tutto; gli altri 3 così:

- **`session-view`**: difetto #4, corretto (verde 15/15).
- **`measure`**: rosso («Measure label missing») solo per l’ordine, non per W2a1.
  - Eseguito subito dopo `preparation`, la scena attiva è «Campo sul lago», senza la pedina di
    Livia. Fallisce così anche senza W2a1 (`control-order`).
  - Nell’ordine del README (`preparation` → `gestures-and-views` → `back-guard` → `measure`) è
    verde: 2/2.
- **`library-import-recovery`**: gli serve l’esportazione di `library-files` nella sua cartella.
  In catena `library` → `library-files` → `library-import-recovery`: 3, 2, 2, tutti verdi (come
  per W2a2).

Verdi, tra gli altri: token-menu 19, random-tables 24, dice-3d 18, registry-smoke 18,
community 22, compendium 15, handouts 15, encounter-builder 12, encounter-lifecycle 11,
spatial 8, spatial-mobile 6, approach 7, reactions 8, combat-mobile 10, loot 12, media 13,
chat 13, chat-review-fixes 11, preferences 14, home 13, command-palette 13, account 10,
w1b-shell 6, w2a2-shell 7, b11b-inc10-fixes 11, homebrew-editor 12, campaign-data 15,
sessions-plus 15, offline 9, integrations 9, campaign-members 15, builder 5, builder-dice 5.
Elenco completo in `results-extra.txt` e `results-all-rescored.txt`.

## Controlli dell’app (`w2a1-shell-journey.js`, nuovo)

7 gruppi `passed`, eseguito due volte. Immagini in `runs/w2a1-shell/`.

1. **Caricamento a 1440, in italiano.** 0 errori di pagina. 0 errori o avvisi in console, esclusi
   i 12 404 delle aree non costruite: damage-tray, dice-tray, inventory-plus, sheet-plus,
   special-moves, spells-plus, regions, knowledge, scene-assets, quickbar, generators,
   relations-graph. Nessun modulo W2a1 manca.
2. **Pagine e schede dell’ondata.** 32 visite, 0 errori, 0 avvisi, nessuno scorrimento
   orizzontale. Il giocatore visita 12 pagine e 5 schede del Tavolo, il DM 9 pagine e 6 schede:
   - campagna: Gruppo, Missioni, Archivio, Mappa e calendario;
   - `#builder-plus`, personaggi, scheda (Capacità, Inventario), Preparazione, appunti, Home;
   - Tavolo: Combattimento, Missioni, Mondo, Viaggio e accampamento, Visione e, per il DM,
     Riepilogo del gruppo. Ogni pannello mostra contenuto.
3. **«Cosa è pronto».** «36 pronte · 12 da costruire · 0 con errori». Le sette aree sono
   «attiva», nessun avviso circoscritto. Immagini `01-cosa-e-pronto-it-1440.png` e
   `01b-report-w2a1-rows-it-1440.png`.
4. **Intestazione a 1440.**
   - Una riga: Home 12 comandi (marchio, Inizio, Personaggi, Campagne, Biblioteca, Cerca,
     Appunti personali, Notifiche, Preferenze, Aiuto, In linea, Account), Tavolo 10.
   - La riga in alto del Tavolo ha solo i comandi del nucleo: il DM ne ha 4 (Avvia
     combattimento, Scene, Riposi, Tempo), il giocatore 1 (Riposi).
   - Nessun pulsante d’area nell’intestazione o nella riga in alto.
5. **Ingressi a 1440, secondo il registro.**
   - **Barra del Tavolo.** Il giocatore ha 13 schede, tutte visibili; le 5 dell’ondata sono a
     1 clic. Il DM ha 19 schede e ne vede 14; le 6 dell’ondata sono a 1 clic, tranne Visione (2,
     da «Tutti i pannelli»).
   - **Strumenti della mappa del DM**, ciascuno in ≤ 2 clic (gruppo, strumento):
     - gruppo «Nebbia e visione»: Nebbia, Luci, Barriere;
     - gruppo «Strumenti del DM»: Teletrasporta, Posiziona il gruppo, Punto di ricerca.

     Il giocatore non vede nessuno di questi strumenti.

   - **Campagna.** Il giocatore ha 20 sezioni, il DM 24; 15 stanno nei 900 px senza scorrere la
     pagina. Gruppo, Missioni, Archivio e Mappa e calendario sono nella colonna, a 1 clic.
   - **B39.** Home → Personaggi → Crea personaggio mostra i metodi («Percorso rapido»,
     «Personaggi pronti»).
   - **Tastiera (correzione #2).** Invio su Sicurezza lascia il fuoco sulla scheda, Home torna a
     Creatura, Tab entra nel pannello. Un clic su Sicurezza porta il fuoco sulle carte.

6. **Telefono 390, EN e IT, con tocco.**
   - Intestazione: 2 righe (109 px) nella Home, 1 riga (63 px) al Tavolo con 8 comandi (Aiuto è
     nel menu App, per B61). Nessun bersaglio sotto i 40 px, nessuna sovrapposizione, nessuno
     scorrimento orizzontale.
   - Schede dell’ondata: Combattimento a 1 tocco nella barra in basso, le altre a 2 tocchi da
     «Tutti». Dopo ogni salto restano sullo schermo la scheda aperta, Mappa e «Tutti».
   - Sezioni della campagna dell’ondata: 2 tocchi da «Tutte le sezioni».

## File toccati

Prodotto (modifiche minime e additive, firme invariate):

- `design/blueprint/combat-tracker.mjs`: in `collectNotices` la campanella riceve solo
  «Il prossimo turno è tuo» (#1).
- `design/blueprint/safety-ui.mjs`: nel gestore di clic, la condizione `event.detail !== 0` (#2).
- `design/blueprint/table.mjs`: un ramo per Tab nel gestore da tastiera dell’elenco delle
  schede (#2).

Test e prove:

- `design/blueprint/tests/w2a1-integration.test.mjs`: nuovo, 2 test.
- `changes/interview-01/blueprint-checks/w2a1-shell-journey.js`: nuovo.
- Percorsi aggiornati alle aree nuove:
  - `character-library-journey.js`, `campaign-settings-journey.js` e `session-view-journey.js`
    (#3, #4): asserzioni mantenute, con i numeri attesi calcolati dai dati;
  - `b61-review-fixes-journey.js` (#5): «1 clic a 1440» e «tutte le schede del DM visibili a
    1366 × 768» diventano una misura (`railOverflow`) più l’obbligo di ≤ 2 clic e della voce in
    «Tutti i pannelli». È un allentamento voluto, legato all’aperto n. 1.
- `changes/interview-01/blueprint-checks/README.md`: un paragrafo in fondo.
- Questo rapporto.

Prettier passa sui tre moduli e sul test. Nei percorsi manca il punto e virgola finale, come
chiede il README. In `b61-review-fixes` restano tre righe lunghe (sezione 125 %) che non ho
scritto io.

## Aperti (non corretti qui, con motivo)

1. **Densità della barra laterale del Tavolo per il DM (P2, trovabilità).**
   - L’ondata aggiunge 6 schede al DM (Combattimento, Missioni, Riepilogo del gruppo, Mondo,
     Viaggio e accampamento, Visione), che ora ne ha 19.
   - A 1440 × 900 la barra ne mostra 14. Fuori restano Annotazioni, Visione, Prova i dadi,
     Immagini e file e Sicurezza.
   - A 1366 × 768 ne mostra 13. Fuori resta anche Viaggio e accampamento.
   - Ognuna resta a 2 clic da «Tutti i pannelli», come vuole la regola di B61. Però Sicurezza
     finisce di nuovo sotto la piega: è proprio il difetto che la revisione di B61 aveva corretto.
   - Con bersagli da 40 px e 19 schede non c’è una correzione minima. Servono una scelta di
     struttura, del coordinatore o del proprietario, e prove dal censimento. Direzioni possibili:
     - unire le schede affini, per esempio Bottino con Bottega, o Mondo con Viaggio;
     - togliere dalla barra del DM la prova dei dadi (B56), che è una dimostrazione;
     - una barra personalizzabile (nascondi o fissa) con il resto in «Tutti i pannelli».
2. **I 12 404 in console.** Il caricatore di B11 importa ogni area pianificata e segna «da
   costruire» quelle che rispondono 404. Lo «zero errori in console» arriverà man mano che quelle
   aree saranno costruite. Evitarlo prima vuol dire un elenco delle aree costruite in un file
   condiviso, cosa che B11 ha evitato di proposito.
3. **Tastiera su Sicurezza.** Aperta da tastiera, la scheda lascia il fuoco sulla scheda, come
   le altre. Stop è a 2 Tab invece che a 1. Con clic e tocco non cambia nulla. In qualsiasi
   momento c’è anche il comando della palette «Invia Stop anonimo (carta X)».
4. **Ordine dei percorsi.** `measure` va eseguito dopo `gestures-and-views`, e
   `library-import-recovery` in catena dopo `library-files`. Non dipende dall’ondata; è annotato
   nel README.

## Come ripetere

Dalla cartella delle prove, con il server avviato:

```sh
playwright-cli -s=d20-w2a1-integ open http://127.0.0.1:8879/
TAG=final scripts/run.sh combat-tracker combat-tracker-review fog-vision fog-vision-review \
  builder-plus world-map world-map-review quests quests-review party travel travel-review \
  core combat campaign-integration library rest-shared conditions notifications \
  character-library campaign-settings b61-review-fixes b61-table-structure session-view \
  safety w2a1-shell
TAG=control scripts/without-w2a1.sh b61-table-structure        # moduli W2a1 a 404
node --test design/blueprint/tests/*.test.mjs                  # dal worktree
```

Sonde: `probes/table-keys.js`, `probes/safety-keys.js`, `probes/tab-order.js` (esiti in
`probes/*-result.txt`, prima delle correzioni in `probes/before-fix.txt`), `probes/tabs.js`,
`probes/measure*.js`.
