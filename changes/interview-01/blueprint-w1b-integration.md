# Integrazione dell’ondata W1b (B24–B30, B56, B59, B60): prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · sessione browser `d20-w1b-integ` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/W1b-integ/` (fuori dal checkout).
Server locale `http://127.0.0.1:8879/` senza cache. Solo dati sintetici.

Aree dell’ondata: B24 notifiche, B25 tabelle casuali e mazzi, B26 tesori e mercanti,
B27 sicurezza del tavolo, B28 materiali multimediali, B29 account, B30 inizio e aiuto,
B56 dadi animati, B59 tavoli pubblici, B60 assistente simulato.

## Esito in breve

- **Test Node:** suite completa verde prima e dopo le correzioni: 1334/1334 all’inizio,
  **1343/1343** alla fine. Il numero è cresciuto perché altri builder hanno aggiunto test
  nel frattempo. I test delle aree W1b più `help.test.mjs` passano 314/314.
- **Percorsi nel browser:** **20/20 verdi**, due volte di seguito nella stessa sessione:
  - i 10 percorsi dell’ondata
  - le 6 regressioni richieste
  - 4 percorsi del core che l’ondata aveva rotto

  In tutto 242 esiti `passed`, senza errori di pagina. All’inizio fallivano quattro dei
  sedici percorsi richiesti e tutti e quattro quelli del core aggiunti (vedi sotto).

- **Caricamento pulito:** nessun errore di pagina e nessun errore o avviso in console.
  - Eccezione: 26 risposte 404, una per ciascuna area pianificata e non ancora costruita.
    È così per progetto (B11, `blueprint-registry-integration.md`: «risorse, non errori»).
  - Nessun’altra richiesta fallita.
  - 28 pagine visitate come giocatore e come DM: nessun errore, nessuno scorrimento
    orizzontale a 1440.
- **«Cosa è pronto»:** mostra il resoconto del registro: «22 pronte · 26 da costruire · 0 con
  errori». Le dieci aree W1b sono «attiva» e nessuna ha avvisi circoscritti. Contributi:
  - B24: 5
  - B25: 9
  - B26: 15
  - B27: 9
  - B28: 14
  - B29: 8
  - B30: 20
  - B56: 2
  - B59: 8
  - B60: 9
- **Intestazione e navigazione:**
  - A 1440 tutto sta su una riga: 11 comandi nella Home, 9 al Tavolo.
  - A 390 ogni comando è trovabile e ha un bersaglio di almeno 40 px.
  - Restano due punti di affollamento, da decidere (vedi «Aperti»).

## Cosa si rompeva tra aree e cosa ho corretto

Ogni correzione è minima, additiva o solo testuale, e non cambia il comportamento delle
aree.

| #   | Interazione                                              | Sintomo (riprodotto)                                                                                                                                                                                                                                                                                                                                                                                                                      | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | B56 × B24 (`notifications-journey.js`, passo 5)          | Dopo «Registra tiro» (TS di Concentrazione, faccia fisica 15) compare la schermata della prova in stile BG3 di B56. Dalla revisione r2 di B56 trattiene il clic di chiusura: «Torna al gioco» non chiudeva «Tiri e risultati» e il clic sulla campanella andava in timeout. Traccia: `showModal`/`close` intercettati nella pagina, nessuna chiamata a `close`.                                                                           | Nel percorso: Esc chiude i dadi, come farebbe chi gioca, prima di chiudere il dialogo. Il prodotto non cambia: il comportamento di B56 è voluto e già revisionato.                                                                                                                                                                                                                                                             |
| 2   | B56 × core (`rest-shared-journey.js`)                    | Il Dado Vita digitale anima i dadi sopra la finestra dei riposi. Il clic successivo su «Recupero arcano» salta l’animazione e non apre il riquadro, quindi il campo non risulta visibile.                                                                                                                                                                                                                                                 | `settleDice()` nel percorso: aspetta i dadi; se sono visibili, Esc li salta e poi li chiude.                                                                                                                                                                                                                                                                                                                                   |
| 3   | B24 × percorsi del core                                  | B24 sostituisce il servizio «Richieste» del core con la campanella «Notifiche e richieste». `getByRole('button', {name: 'Richieste'})` non esiste più: timeout in `combat-journey.js` (regressione richiesta), `area-journey.js`, `combat-mobile-journey.js`, `conditions-death-journey.js` e `dice-correction-journey.js`. Dopo la ricetta, in quattro di questi si fermava anche per il caso 2 (dadi animati sopra «Tiri e risultati»). | Ho applicato la ricetta lasciata da B24 per il coordinatore: campanella → «Apri tiri e risultati» (`[data-notifications-requests]`), con clic o tocco. Righe: combat 38, 54, 59; area 47; combat-mobile 55; conditions-death 116, 150, 235; dice-correction 117, 200, 239, 267. Ho aggiunto `__settleDice` dopo «Registra tiro»/«Record roll» e dopo gli attacchi digitali. Tutte le asserzioni sono rimaste invariate.        |
| 4   | B24 × B27 (`safety-journey.js`, telefono)                | «The X-card did not return to the map top» (top 56). Dopo l’ultima modifica di B24 (08:18) la pila degli avvisi parte sotto la riga dei servizi, calcolata sulla pagina: a pagina scorsa sta a 168 px. Così non toccava più la carta X agganciata a 56 px e il percorso non esercitava lo spostamento. Il prodotto era corretto.                                                                                                          | Nel percorso lo scorrimento porta l’aggancio (mappa + 56 px) sull’avviso reale. Il controllo originale resta: la carta scende sotto l’avviso, entrambi restano utilizzabili e la carta torna su quando l’avviso sparisce. 17/17.                                                                                                                                                                                               |
| 5   | B30 × Tavolo del core sul telefono (difetto di prodotto) | Il suggerimento in stile BG3, agganciato in basso, copriva il dock fisso del Tavolo («Map», «Move», «End turn»). `combat-mobile-journey.js` si fermava su «Map», intercettato da «Got it» (già segnalato da B24).                                                                                                                                                                                                                         | `help.mjs` `placePop`: sul telefono, se il dock fisso occupa il fondo dello schermo, la scheda agganciata si posa subito sopra. È la stessa regola che B27 applica alla carta X. Prova (`probe-tip-dock.js`, EN 390): scheda 471–729 px, dock 737–844 px, nessun pulsante del dock coperto, a inizio e a fine pagina. Il suggerimento resta agganciato e visibile: controllo di B30 verde (13/13).                             |
| 6   | Testi «Richieste» superati (P3 di B24)                   | Il servizio «Richieste» non esiste più nell’intestazione.                                                                                                                                                                                                                                                                                                                                                                                 | `help.mjs`, suggerimento «Tiri fisici o digitali»: «compare in «Richieste in attesa» di Notifiche e richieste, la campanella in alto, e in «Tiri e risultati» al Tavolo» (EN equivalente). Nella visita guidata del Tavolo il titolo del passo sulla campanella diventa «Notifiche e richieste». `combat-ui.mjs`: «i tiri necessari restano in Tiri e risultati» (era «in Richieste»). Nessun test dipendeva dai testi vecchi. |

Un’altra sessione, l’integratore W1a, ha portato in parallelo a 40 px le icone dei servizi
e i pulsanti del Tavolo sul telefono (in `styles.css`: 31 → 40 e 36/38 → 40). Il mio controllo
dell’intestazione vedeva proprio quei 31 px: dopo la sua modifica non ho toccato
`styles.css`.

## Percorsi: esito finale (seconda passata completa)

Copie dei percorsi originali, identiche tranne la cartella delle immagini (verificato con
`diff`), eseguite in sequenza in `d20-w1b-integ`. Risultati in `<percorso>/final.json` e
`final2.json`, riepiloghi in `results-final.txt` e `results-final2.txt`.

| Percorso                       | Esiti `passed` | Errori pagina | Note                                                     |
| ------------------------------ | -------------- | ------------- | -------------------------------------------------------- |
| notifications (B24)            | 25             | 0             | corretto (1)                                             |
| random-tables (B25)            | 24             | 0             | restituisce un testo; verifica gli errori al suo interno |
| loot (B26)                     | 12             | 0             |                                                          |
| safety (B27)                   | 17             | 0             | corretto (4), `findings: []`                             |
| media (B28)                    | 13             | 0             |                                                          |
| account (B29)                  | 10             | 0             |                                                          |
| home (B30)                     | 13             | 0             | con la correzione (5)                                    |
| dice-3d (B56)                  | 18             | 0             |                                                          |
| community (B59)                | 22             | 0             | `findings: []`                                           |
| assistant (B60)                | 14             | 0             |                                                          |
| core                           | 13             | 0             | regressione                                              |
| combat                         | 10             | 0             | regressione, corretto (3)                                |
| campaign-integration           | 2              | 0             | regressione                                              |
| library                        | 3              | 0             | regressione                                              |
| rest-shared                    | 3              | 0             | regressione, corretto (2)                                |
| conditions                     | 11             | 0             | regressione, `findings: []`                              |
| area                           | 8              | 0             | core, corretto (3)                                       |
| combat-mobile                  | 10             | 0             | core, corretto (3) e (5)                                 |
| conditions-death               | 7              | 0             | core, corretto (3)                                       |
| dice-correction                | 7              | 0             | core, corretto (3), `findings: []`                       |
| `w1b-shell-journey.js` (nuovo) | 6              | 0             | carico, pagine, «Cosa è pronto», intestazioni            |

Prima passata (`results-run1.txt`, prima di ogni correzione):

- **Percorsi richiesti:** 12 verdi su 16.
  - `random-tables` risultava rosso solo per il mio rilevatore (restituisce un testo): in
    realtà passava 24/24.
  - `campaign-integration` si è fermato alla prima esecuzione perché avevo dimenticato di
    creare la sua cartella delle immagini.
  - Rossi veri: notifications, safety, combat, rest-shared.
- **Percorsi del core aggiunti** (`results-run4.txt`): area, combat-mobile, conditions-death
  e dice-correction erano tutti rossi.

## Controlli dell’app (`w1b-shell-journey.js`)

- **Caricamento a 1440, in italiano:**
  - 0 errori di pagina.
  - 0 errori o avvisi in console, esclusi i 404 delle 26 aree pianificate non costruite:
    damage-tray, fog-vision, dice-tray, combat-tracker, inventory-plus, builder-plus,
    special-moves, sheet-plus, regions, quests, spells-plus, party, world-map, travel,
    scene-assets, adventures, homebrew-editor, campaign-data, knowledge, sessions-plus,
    projects, offline, quickbar, integrations, generators, relations-graph.
  - Nessun avviso d’area nella striscia della dimostrazione.
- **Pagine W1b, come giocatore e come DM:**
  - Tavolo.
  - Sezioni della campagna: Bottino, Sicurezza, Materiali, Tavoli pubblici, Assistente.
  - Profilo di sicurezza, file multimediali, account, tavoli pubblici.
  - Preparazione, Biblioteca, scheda di Livia, Home.

  In tutto 28 visite: 0 errori, 0 avvisi, nessuno scorrimento orizzontale.

- **«Cosa è pronto»:** 22 pronte · 26 da costruire · 0 con errori. Le dieci aree W1b sono
  «attiva», senza avvisi. Schermate: `shell/01-cosa-e-pronto-it-1440.png` e
  `shell/01b-report-it-1440.png`.
- **Intestazione a 1440:** una riga.
  - Home, 11 comandi: marchio, Inizio, Personaggi, Campagne, Biblioteca, Cerca, Appunti
    personali, Notifiche e richieste, Preferenze, Aiuto, Account e profilo.
  - Tavolo, 9 comandi.
  - Nessuna sovrapposizione né uscita dallo schermo.
- **Intestazione a 390, IT ed EN, tocco:**
  - Home: 3 righe, 157 px, tutti i bersagli di almeno 40 px.
  - Tavolo: 2 righe, 109 px.
  - Campanella, Account e Aiuto sono visibili.
  - Nessuna sovrapposizione né scorrimento orizzontale.
- **Barra in alto del Tavolo (cassetti):**
  - Giocatore: 8 comandi.
  - DM: 16 comandi; sei vengono da W1b (Bottino, Bottega, Tabelle e mazzi, Prova i dadi,
    Sicurezza, Immagini e file).
  - A 1440: 2 righe. A 390: 4 righe, 261 px prima della mappa.
  - Bersagli alti 40 px. In EN «Log» è largo 38 px.

## Aperti (non corretti qui, con motivo)

1. **L’intestazione del telefono passa da 2 a 3 righe.** B29 (Account) e B30 (Aiuto)
   aggiungono ciascuna un servizio: marchio 135 px + 8 px + 6 × 40 px = 383 px, contro i
   366 px disponibili a 390. Tutto resta trovabile, ma l’intestazione occupa 157 px.
   Proposte per il coordinatore o il proprietario:
   - solo il simbolo del marchio sotto i 420 px, come fa già l’intestazione del Tavolo;
   - oppure «Aiuto» nel menu App sul telefono.

   Tocca il marchio, che ha una fase dedicata, quindi non l’ho deciso io.

2. **La barra dei cassetti del DM sul telefono è affollata:** 16 comandi in 4 righe. Segue la
   collocazione del registro (`table-panel`, «cassetto aperto da un pulsante in alto»), ma
   il modello di mercato è un gruppo o un menu: la barra comprimibile di Owlbear, le schede
   della barra laterale di Foundry. È una scelta del core o di B11, non una correzione
   minima.
3. **B56 trattiene il primo clic o tocco dopo un tiro registrato sopra un dialogo.** La
   schermata della prova resta modale fino a 3 s; con i dadi in rotolamento il clic salta
   l’animazione. È voluto (revisione r2 di B56, BG3 CRP-131), ma ogni TS o prova in «Tiri e
   risultati» costa un tocco o un Esc in più: tutti i percorsi del core hanno dovuto
   aggiungerlo. Dice So Nice lascia passare i clic. Da confermare con il proprietario.
4. **`registry-smoke-journey.js` (B11) è superato.**
   - Presuppone zero aree costruite e si ferma alla riga 24 («Area stylesheet linked without
     a loaded area») da quando esistono aree W1a.
   - Il suo gruppo sulla campanella descrive ancora la campanella del core senza B24.
   - Va riscritto da B11 o dal coordinatore: una correzione minima non basta. Non incluso
     nei 20.
5. **«Log» in inglese è largo 38 px** sul telefono (cassetto di un’area W1a). Lo segnalo
   all’integratore W1a.
6. **Le proposte di B27 al coordinatore** restano aperte:
   - categoria «Sicurezza del tavolo» come avviso a comparsa predefinito in B24;
   - collegamento «Sicurezza» ed esportazione del profilo in B29;
   - avvisi di contenuto all’ingresso con invito (B13);
   - stelle e desideri a fine sessione (B14).

   Sono scelte di prodotto, non rotture tra aree.

7. **I percorsi scrivono le immagini nelle cartelle dei builder.** Io ho eseguito copie con la
   cartella reindirizzata, per non sovrascrivere le loro prove. Chi li rilancia dovrebbe fare
   lo stesso.

## File toccati

Nel checkout:

- **Prodotto:**
  - `design/blueprint/help.mjs` (B30): `placePop` posa il suggerimento sopra il dock del
    Tavolo sul telefono; testi «Richieste» nel suggerimento e nel passo della visita
    guidata.
  - `design/blueprint/combat-ui.mjs` (core): solo il testo del messaggio di lancio.
  - Entrambi già in stile Prettier (`--check` pulito).
- **Percorsi** (selettori, attese e scorrimento; nessuna asserzione rimossa):
  `changes/interview-01/blueprint-checks/`:
  - `notifications-journey.js`, `safety-journey.js`, `rest-shared-journey.js`
  - `combat-journey.js`, `area-journey.js`, `combat-mobile-journey.js`
  - `conditions-death-journey.js`, `dice-correction-journey.js`
- **Nuovo:** `changes/interview-01/blueprint-checks/w1b-shell-journey.js`, controllo di
  carico, pagine, «Cosa è pronto» e intestazioni (1440 e 390, IT/EN, giocatore/DM).
  Scrive in `…/W1b-integ/shell/`.
- **Questo documento.**

Fuori dal checkout, in `…/2026-09-24/W1b-integ/`:

- `scripts/`: copie dei percorsi, `wrap.sh` e `instrument.py`, che in caso di errore
  registrano il passo e salvano le schermate; `run-all.sh`, `shell-check-journey.js` e
  le sonde.
- Una cartella per percorso con `run*.json`, `final*.json` e le schermate.
- `shell/`: resoconto e schermate.
- `node-suite-final.log`.

Riproduzione, dalla cartella delle prove:

```sh
playwright-cli -s=d20-w1b-integ open http://127.0.0.1:8879/
TAG=final scripts/run-all.sh notifications random-tables loot safety media account home dice-3d community assistant core combat campaign-integration library rest-shared conditions area combat-mobile conditions-death dice-correction
playwright-cli -s=d20-w1b-integ --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/w1b-shell-journey.js
```
