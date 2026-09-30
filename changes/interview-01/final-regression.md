# Regressione finale sul candidato funzionale: prove

01/10/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, sopra il commit locale
`5b7223b`, lavoro non committato: il commit lo fa il coordinatore) · un solo esecutore (Claude Code,
Opus 5.5) · sessioni del browser `d20-close-regress` (giri completi e caricamenti puliti) e
`d20-close-probe` (sonde e ripetizioni) · server `http://127.0.0.1:8879/` senza cache · cartella
delle prove `~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/close-regress/` (fuori dal
checkout). Solo dati sintetici. Ruolo: regressione finale dopo le correzioni di chiusura, con
correzioni minime dell'app (partendo da un test rosso) o dei percorsi (senza togliere controlli).
Questa fase riguarda le funzioni: l'aspetto grafico non è stato valutato.

## In breve

- **Test Node:** `node --test design/blueprint/tests/*.test.mjs` **2659/2659** all'inizio (il
  compito diceva 2582: il numero precedeva i test delle correzioni finali e di chiusura) e
  **2662/2662** alla fine, con i 3 test nuovi di questa regressione in `tests/close-fixes.test.mjs`.
- **Percorsi nel browser:** tutti i **189** script del README dei controlli, nel suo ordine (18
  prima di 17, `measure` dopo `gestures-and-views`, poi audit, residui e `final-fixes`), uno per
  comando sotto un allarme di 200 s. Primo giro (`sweep1`) sul candidato così com'era:
  **183/189**. Giro finale (`final`), da solo, sul codice e sui percorsi finali: **189/189**, 1529
  esiti `passed`, nessun errore di pagina. Nessun percorso verde ha meno passi del giro completo
  dopo le correzioni finali (`2026-10-01/regress/`).
- **Due difetti reali dell'app**, corretti partendo da un test rosso:
  1. **Trascinare due volte di fila la stessa pedina apriva la scheda.** La correzione di chiusura
     TV-14 (doppio clic su una pedina = scheda, come Foundry e Roll20) contava anche una pressione
     diventata trascinamento. Esempio: trascino Livia, premo Esc (torna al suo posto), la riprendo
     subito per spostarla: si apriva la sua scheda e Livia restava ferma. Ora un trascinamento
     non conta come clic (come nel gestore del mouse di Foundry); il doppio clic apre ancora la
     scheda.
  2. **A 1440 × 900 una sezione della campagna non si raggiungeva senza scorrere.** Con «Entra al
     Tavolo» sopra la colonna (correzioni finali) e due gruppi aperti, l'intestazione
     «Ambientazione» finiva a y 909 (sotto la finestra) e «Tutte le sezioni» esisteva solo sul
     telefono. Ora «Tutte le sezioni» apre la colonna anche su computer (salto rapido di D&D
     Beyond, come «Tutti i pannelli» del Tavolo) e un gruppo aperto in fondo alla finestra scorre
     fino a mostrare le sue sezioni. Era il rosso «non ancora diagnosticato» di `w2a1-shell`.
- **Tre percorsi aggiornati** (controlli tenuti, commento datato «Close regression» in ogni file):
  `spells-plus` e `spells-plus-review` aprono «Perché?» prima di leggere la regola di una finestra
  di preparazione chiusa (UX F10 delle correzioni finali); `media-review2` aspetta e chiude la
  finestra del materiale che «Apri» mostra, invece di correrle davanti.
- **Caricamento pulito** (memoria del browser svuotata) a 1440 e 390, giocatore e DM: **0 errori
  di pagina, 0 errori in console, 0 avvisi**, nessuno scorrimento orizzontale, 35 viste per il
  giocatore e 42 per il DM.
- **Manifest** del candidato rigenerato per i 12 file cambiati, con i campi dei controlli
  aggiornati; controllo finale senza differenze.

## Giri eseguiti

| Giro         | Sessione            | Cosa                                                                                                                                                                                          | Esito                                                                                                                          |
| ------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `node-1`     | —                   | suite Node all'inizio                                                                                                                                                                         | **2659/2659**                                                                                                                  |
| `sweep1`     | `d20-close-regress` | i 189 percorsi di `scripts/order.txt` sul candidato intatto (13:51–14:38)                                                                                                                     | **183/189**; rossi `gestures-and-views`, `media-review2`, `spells-plus`, `spells-plus-review`, `w2a1-shell`, `p6-map-movement` |
| sonde        | `d20-close-probe`   | `probe/rail*.js`, `probe/reach.js`, diagnosi di `w2a1-shell` (dove stanno sezioni e gruppi a 1440), `probe/rerun/` (`media-review2` da solo sul candidato intatto)                            | «Ambientazione» a y 909–949, «Tutte le sezioni» `display: none`; `media-review2` da solo verde                                 |
| `s1`, `s2`   | `d20-close-probe`   | copia della app con le correzioni servita sulla porta 8880 (`stage/`), mentre `sweep1` girava sul candidato intatto: i sei rossi più `b62-ia`, `b61-review-fixes`, `w2a2-shell`, `w2b2-shell` | tutti verdi; `w2a1-shell` restava rosso con il solo scorrimento e passa con «Tutte le sezioni» su computer                     |
| sonde        | `d20-close-probe`   | `probe/dbl.js` (doppio clic e due clic a 150 ms su Livia dopo la correzione), `probe/railshot.js` (colonna a 1440 e 390, «Tutte» → 25 sezioni → «Mappa del mondo»)                            | la scheda si apre ancora; nessuno scorrimento orizzontale, nessun errore                                                       |
| `node-stage` | —                   | suite Node sulla copia con le correzioni                                                                                                                                                      | **2662/2662**                                                                                                                  |
| `node-final` | —                   | suite Node nel worktree dopo le correzioni                                                                                                                                                    | **2662/2662**                                                                                                                  |
| `final`      | `d20-close-regress` | di nuovo tutti i 189, stesso ordine, da solo, sul codice e sui percorsi finali (14:38–15:24)                                                                                                  | **189/189**, 1529 esiti `passed`                                                                                               |
| `fresh`      | `d20-close-regress` | caricamento pulito, una configurazione per comando (`scripts/fresh-load.sh`)                                                                                                                  | 0 errori di pagina, 0 in console (tabella sotto)                                                                               |

Il giro `sweep1` e le ripetizioni sulla copia sono girati insieme (due browser separati, due
porte): il carico in più è la spiegazione più probabile della corsa di `media-review2` (riga 4,
rosso alle 14:08:40, mentre la copia eseguiva `w2a1-shell`). Il giro `final` è girato da solo.

## Cosa si rompeva e cosa ho cambiato

| Riga | Percorso                                   | Che cosa si vedeva                                                                                                                                                                            | Causa                                                                                                                                                                                                                                                                                                                                                                                                                     | Correzione                                                                                                                                                                                                                                                                                                                                                                  | Tipo                                                           |
| ---- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1    | `gestures-and-views.js`, `p6-map-movement` | «Drag did not move token»: lo screenshot mostra la scheda di Livia aperta sopra il Tavolo. `p6-map-movement`: «Annulla ultima modifica» coperto dalla scheda dopo tre trascinamenti di Livia. | TV-14 della chiusura (`table.mjs`): due pressioni sulla stessa pedina entro 400 ms, al più un ridisegno e 12 px aprono la scheda. Un trascinamento annullato (Esc) o respinto da un muro riporta la pedina al punto di partenza, quindi la pressione successiva cade entro 12 px e veniva letta come la seconda metà di un doppio clic. Nel giro completo dopo le correzioni finali entrambi passavano.                   | Quando il trascinamento supera 5 px la pressione da cui è partito si dimentica (`lastTokenPress = null`): in Foundry un trascinamento esce dalla sequenza dei clic, come il doppio clic del browser. Test: «a press that became a drag never starts a double press». Sonda `dbl.js`: doppio clic e due clic a 150 ms aprono ancora la scheda.                               | **difetto dell'app** (introdotto dalle correzioni di chiusura) |
| 2    | `w2a1-shell-journey.js`                    | «`[data-campaign-sections]` is not visible» a 1440: attesa di 30 s su un bottone nascosto. Rosso anche nel giro completo precedente, non diagnosticato.                                       | Diagnosi: a 1440 × 900 il giocatore ha «Campagna» e «Racconto» aperti (ricordati per identità), l'intestazione «Ambientazione» sta a y 909–949 e la sezione «Mappa del mondo», una volta aperta, a y 994. «Tutte le sezioni» era `display: none` fuori dal telefono (revisione B61, quando la colonna stava nella finestra). «Entra al Tavolo» nella colonna (correzioni finali, `party`) l'ha spinta giù di circa 60 px. | `styles.css`: «Tutte le sezioni» è la prima voce della colonna su computer (`order: -1`), sul telefono resta in fondo alla striscia. `app.mjs`: un gruppo aperto scorre fino a mostrare le sue sezioni (`scrollIntoView` «nearest», come Finder e VS Code). Due test. Da solo lo scorrimento non bastava: con l'intestazione fuori dalla finestra serve «Tutte le sezioni». | **difetto dell'app** (esposto da uno spostamento voluto)       |
| 3    | `spells-plus`, `spells-plus-review`        | «closed message missing»; «the player is not told who can grant an exception».                                                                                                                | UX F10 delle correzioni finali (D&D Beyond: la lista delle magie subito sotto le schede): una finestra di preparazione chiusa è una riga, spiegazione e regola stanno in «Perché?» (un `<details>` chiuso, che il testo visibile non include).                                                                                                                                                                            | Il percorso apre «Perché?» della finestra chiusa, poi legge le stesse frasi. Il clic verifica anche che «Perché?» ci sia.                                                                                                                                                                                                                                                   | spostamento voluto (controllo tenuto)                          |
| 4    | `media-review2-journey.js`                 | Solo in `sweep1`: «Elimina» coperto da una finestra «La lettera». Da solo, sul candidato intatto, verde.                                                                                      | «Apri» su un uso del file porta a Materiali con l'id del materiale, e Materiali apre la sua finestra subito dopo il disegno. Il percorso andava alla pagina del file appena cambiava l'indirizzo: con la macchina carica la finestra si apriva dopo e restava sopra la pagina del file (un cambio d'indirizzo non chiude le finestre; la navigazione dell'app sì).                                                        | Il percorso aspetta la finestra «La lettera», la chiude con «Chiudi» e poi prosegue. Controllo rafforzato: ora verifica che «Apri» mostri proprio quel materiale.                                                                                                                                                                                                           | corsa del percorso (controllo rafforzato)                      |

Nessun controllo tolto. Prettier sui file cambiati. `spells-plus` e `spells-plus-review` non
hanno il punto e virgola finale del contenitore, come chiede il README: Prettier lo aggiungerebbe
ed è l'unica differenza che segnala (era così anche prima di questa regressione).

## Caricamento pulito

Contesto nuovo per ogni configurazione, memoria svuotata, poi ogni pagina principale dal suo
comando di navigazione, ogni sezione della campagna, la scheda di Livia, il Tavolo con ogni scheda
laterale e ogni sua sotto-scheda (script `scripts/fresh-load.js`, JSON e screenshot in `fresh/`).

| Configurazione         | Viste                                                      | Errori di pagina | Errori in console | Avvisi | Scorrimento orizzontale |
| ---------------------- | ---------------------------------------------------------- | ---------------- | ----------------- | ------ | ----------------------- |
| 1440, mouse, giocatore | 35 (7 pagine, 20 sezioni di campagna, 8 schede del Tavolo) | 0                | 0                 | 0      | nessuno                 |
| 1440, mouse, DM        | 42 (8 pagine, 25 sezioni di campagna, 9 schede del Tavolo) | 0                | 0                 | 0      | nessuno                 |
| 390, touch, giocatore  | 35                                                         | 0                | 0                 | 0      | nessuno                 |
| 390, touch, DM         | 42                                                         | 0                | 0                 | 0      | nessuno                 |

## File cambiati

- App: `design/blueprint/table.mjs` (riga 1), `design/blueprint/app.mjs` e
  `design/blueprint/styles.css` (riga 2).
- Test: `design/blueprint/tests/close-fixes.test.mjs` (3 test, tutti rossi prima delle
  correzioni e verdi dopo).
- Percorsi: `changes/interview-01/blueprint-checks/spells-plus-journey.js`,
  `spells-plus-review-journey.js`, `media-review2-journey.js`; paragrafo «Close regression» in
  `blueprint-checks/README.md`.
- Documenti allineati all'app: `design/blueprint/DESIGN.md` (riga «Tutte le sezioni in cima alla
  colonna della campagna» nella tabella «Elemento → prodotto copiato»),
  `docs/interview/NAVIGATION.md` (colonna della campagna).
- Stato allineato ai risultati: `docs/interview/BLUEPRINT_STATUS.md` (righe «Test Node» e
  «Percorsi del browser») e `docs/interview/CAPABILITY_CENSUS.md` (prove al 01/10). `docs/NEXT.md`
  dice ancora che i tre rossi sono da capire: lo aggiorna il coordinatore.
- `changes/interview-01/blueprint-candidate-manifest.json`: hash dei 12 file sopra, impronta e campi
  `checks` (test Node, percorsi, revisione indipendente ancora da fare) rigenerati con
  `scripts/manifest-check.py --write`; il controllo dopo la scrittura non trova differenze né file
  non elencati.

## Rimasto aperto

- Un cambio d'indirizzo del browser (per esempio Indietro) non chiude una finestra aperta: la
  navigazione dell'app lo fa, la cronologia no. Non l'ho cambiato qui: chiudere le finestre a ogni
  cambio d'indirizzo potrebbe chiudere quelle che un comando apre subito dopo aver navigato (prima
  che l'evento del cambio arrivi). Da decidere con una prova dedicata.
- `w2a1-shell` conta 2 clic anche nel ramo in cui apre un gruppo e poi usa «Tutte le sezioni»
  (sarebbero 3). Nel giro finale «Missioni» e «Mappa del mondo» risultano a 2 clic per giocatore e
  DM; con lo scorrimento dopo l'apertura del gruppo quel ramo non dovrebbe più servire, ma il
  percorso non registra quale ramo ha usato. Non l'ho cambiato: va reso esatto al prossimo
  aggiornamento del percorso.
- Copertura: questi percorsi sono una parte, non l'intero contratto; dati sintetici, nessun
  multigiocatore reale, nessuna prova con persone. L'aspetto grafico non fa parte di questa fase.

## Percorso per percorso (giro `final`)

«Passi» è il numero di esiti `passed` del giro finale; le colonne `sweep1` e `final` ricalcolano il
verdetto dal JSON di ogni giro con `scripts/verdict.py`.

| #   | Percorso                              | Passi (final) | `sweep1` | `final` | Note                                |
| --- | ------------------------------------- | ------------- | -------- | ------- | ----------------------------------- |
| 1   | `core-journey.js`                     | 13            | PASS     | PASS    |                                     |
| 2   | `preparation-journey.js`              | 9             | PASS     | PASS    |                                     |
| 3   | `gestures-and-views.js`               | 8             | FAIL     | PASS    | riga 1 (difetto dell'app, corretto) |
| 4   | `back-guard-journey.js`               | 4             | PASS     | PASS    |                                     |
| 5   | `measure-journey.js`                  | 2             | PASS     | PASS    |                                     |
| 6   | `visual-fixes-journey.js`             | 5             | PASS     | PASS    |                                     |
| 7   | `combat-journey.js`                   | 10            | PASS     | PASS    |                                     |
| 8   | `area-journey.js`                     | 9             | PASS     | PASS    |                                     |
| 9   | `multi-self-journey.js`               | 6             | PASS     | PASS    |                                     |
| 10  | `combat-mobile-journey.js`            | 10            | PASS     | PASS    |                                     |
| 11  | `encounter-lifecycle.js`              | 10            | PASS     | PASS    |                                     |
| 12  | `reactions-journey.js`                | 8             | PASS     | PASS    |                                     |
| 13  | `concentration-journey.js`            | 10            | PASS     | PASS    |                                     |
| 14  | `simultaneous-reactions-journey.js`   | 6             | PASS     | PASS    |                                     |
| 15  | `new-npc-reaction-journey.js`         | 4             | PASS     | PASS    |                                     |
| 16  | `spatial-journey.js`                  | 8             | PASS     | PASS    |                                     |
| 17  | `spatial-mobile-journey.js`           | 6             | PASS     | PASS    |                                     |
| 18  | `approach-journey.js`                 | 7             | PASS     | PASS    |                                     |
| 19  | `builder-journey.js`                  | 5             | PASS     | PASS    |                                     |
| 20  | `builder-advance-journey.js`          | 3             | PASS     | PASS    |                                     |
| 21  | `builder-reconstruction-journey.js`   | 3             | PASS     | PASS    |                                     |
| 22  | `builder-dice-journey.js`             | 5             | PASS     | PASS    |                                     |
| 23  | `builder-recovery-journey.js`         | 3             | PASS     | PASS    |                                     |
| 24  | `library-journey.js`                  | 3             | PASS     | PASS    |                                     |
| 25  | `library-builder-journey.js`          | 3             | PASS     | PASS    |                                     |
| 26  | `library-files-journey.js`            | 2             | PASS     | PASS    |                                     |
| 27  | `library-mobile-journey.js`           | 3             | PASS     | PASS    |                                     |
| 28  | `library-spell-recovery-journey.js`   | 2             | PASS     | PASS    |                                     |
| 29  | `library-import-recovery-journey.js`  | 2             | PASS     | PASS    |                                     |
| 30  | `campaign-notes-journey.js`           | 3             | PASS     | PASS    |                                     |
| 31  | `campaign-world-journey.js`           | 2             | PASS     | PASS    |                                     |
| 32  | `campaign-sessions-journey.js`        | 2             | PASS     | PASS    |                                     |
| 33  | `campaign-sharing-journey.js`         | 3             | PASS     | PASS    |                                     |
| 34  | `campaign-mobile-journey.js`          | 2             | PASS     | PASS    |                                     |
| 35  | `campaign-integration-journey.js`     | 2             | PASS     | PASS    |                                     |
| 36  | `rest-shared-journey.js`              | 3             | PASS     | PASS    |                                     |
| 37  | `rest-time-journey.js`                | 3             | PASS     | PASS    |                                     |
| 38  | `rest-mobile-personal-journey.js`     | 4             | PASS     | PASS    |                                     |
| 39  | `rest-reversed-journey.js`            | 1             | PASS     | PASS    |                                     |
| 40  | `companion-map-journey.js`            | 2             | PASS     | PASS    |                                     |
| 41  | `forms-journey.js`                    | 2             | PASS     | PASS    |                                     |
| 42  | `familiar-journey.js`                 | 3             | PASS     | PASS    |                                     |
| 43  | `forms-mobile-journey.js`             | 3             | PASS     | PASS    |                                     |
| 44  | `companion-personal-journey.js`       | 2             | PASS     | PASS    |                                     |
| 45  | `conditions-journey.js`               | 11            | PASS     | PASS    |                                     |
| 46  | `conditions-death-journey.js`         | 7             | PASS     | PASS    |                                     |
| 47  | `dice-correction-journey.js`          | 7             | PASS     | PASS    |                                     |
| 48  | `conditions-mobile-journey.js`        | 3             | PASS     | PASS    |                                     |
| 49  | `conditions-fixes-journey.js`         | 7             | PASS     | PASS    |                                     |
| 50  | `conditions-badges-journey.js`        | 2             | PASS     | PASS    |                                     |
| 51  | `registry-smoke-journey.js`           | 18            | PASS     | PASS    |                                     |
| 52  | `b11b-inc10-fixes-journey.js`         | 11            | PASS     | PASS    |                                     |
| 53  | `b61-table-structure-journey.js`      | 6             | PASS     | PASS    |                                     |
| 54  | `b61-review-fixes-journey.js`         | 6             | PASS     | PASS    |                                     |
| 55  | `token-menu-journey.js`               | 19            | PASS     | PASS    |                                     |
| 56  | `campaign-members-journey.js`         | 15            | PASS     | PASS    |                                     |
| 57  | `campaign-members-review-journey.js`  | 11            | PASS     | PASS    |                                     |
| 58  | `campaign-members-review2-journey.js` | 9             | PASS     | PASS    |                                     |
| 59  | `session-view-journey.js`             | 15            | PASS     | PASS    |                                     |
| 60  | `handouts-journey.js`                 | 15            | PASS     | PASS    |                                     |
| 61  | `compendium-journey.js`               | 15            | PASS     | PASS    |                                     |
| 62  | `chat-journey.js`                     | 13            | PASS     | PASS    |                                     |
| 63  | `chat-review-fixes-journey.js`        | 11            | PASS     | PASS    |                                     |
| 64  | `annotations-journey.js`              | 11            | PASS     | PASS    |                                     |
| 65  | `annotations-review-fixes-journey.js` | 10            | PASS     | PASS    |                                     |
| 66  | `encounter-builder-journey.js`        | 12            | PASS     | PASS    |                                     |
| 67  | `campaign-settings-journey.js`        | 15            | PASS     | PASS    |                                     |
| 68  | `character-library-journey.js`        | 17            | PASS     | PASS    |                                     |
| 69  | `character-library-review-journey.js` | 10            | PASS     | PASS    |                                     |
| 70  | `preferences-journey.js`              | 14            | PASS     | PASS    |                                     |
| 71  | `command-palette-journey.js`          | 13            | PASS     | PASS    |                                     |
| 72  | `notifications-journey.js`            | 25            | PASS     | PASS    |                                     |
| 73  | `random-tables-journey.js`            | 24            | PASS     | PASS    |                                     |
| 74  | `loot-journey.js`                     | 12            | PASS     | PASS    |                                     |
| 75  | `loot-review-journey.js`              | 7             | PASS     | PASS    |                                     |
| 76  | `loot-review2-journey.js`             | 6             | PASS     | PASS    |                                     |
| 77  | `safety-journey.js`                   | 17            | PASS     | PASS    |                                     |
| 78  | `media-journey.js`                    | 13            | PASS     | PASS    |                                     |
| 79  | `media-review-journey.js`             | 13            | PASS     | PASS    |                                     |
| 80  | `media-review2-journey.js`            | 7             | FAIL     | PASS    | riga 4 (corsa del percorso)         |
| 81  | `account-journey.js`                  | 10            | PASS     | PASS    |                                     |
| 82  | `home-journey.js`                     | 13            | PASS     | PASS    |                                     |
| 83  | `dice-3d-journey.js`                  | 18            | PASS     | PASS    |                                     |
| 84  | `community-journey.js`                | 22            | PASS     | PASS    |                                     |
| 85  | `assistant-journey.js`                | 14            | PASS     | PASS    |                                     |
| 86  | `assistant-review-fixes.js`           | 11            | PASS     | PASS    |                                     |
| 87  | `assistant-review-fixes-2.js`         | 9             | PASS     | PASS    |                                     |
| 88  | `w1b-shell-journey.js`                | 6             | PASS     | PASS    |                                     |
| 89  | `adventures-journey.js`               | 7             | PASS     | PASS    |                                     |
| 90  | `builder-plus-journey.js`             | 20            | PASS     | PASS    |                                     |
| 91  | `campaign-data-journey.js`            | 15            | PASS     | PASS    |                                     |
| 92  | `combat-tracker-journey.js`           | 19            | PASS     | PASS    |                                     |
| 93  | `combat-tracker-review-journey.js`    | 7             | PASS     | PASS    |                                     |
| 94  | `damage-tray-journey.js`              | 11            | PASS     | PASS    |                                     |
| 95  | `dice-tray-journey.js`                | 17            | PASS     | PASS    |                                     |
| 96  | `dice-tray-review-journey.js`         | 11            | PASS     | PASS    |                                     |
| 97  | `fog-vision-journey.js`               | 11            | PASS     | PASS    |                                     |
| 98  | `fog-vision-review-journey.js`        | 5             | PASS     | PASS    |                                     |
| 99  | `generators-journey.js`               | 11            | PASS     | PASS    |                                     |
| 100 | `homebrew-editor-journey.js`          | 12            | PASS     | PASS    |                                     |
| 101 | `homebrew-editor-review-journey.js`   | 5             | PASS     | PASS    |                                     |
| 102 | `integrations-journey.js`             | 9             | PASS     | PASS    |                                     |
| 103 | `inventory-plus-journey.js`           | 18            | PASS     | PASS    |                                     |
| 104 | `inventory-plus-review-journey.js`    | 6             | PASS     | PASS    |                                     |
| 105 | `knowledge-journey.js`                | 10            | PASS     | PASS    |                                     |
| 106 | `knowledge-review-journey.js`         | 8             | PASS     | PASS    |                                     |
| 107 | `offline-journey.js`                  | 9             | PASS     | PASS    |                                     |
| 108 | `party-journey.js`                    | 9             | PASS     | PASS    |                                     |
| 109 | `projects-journey.js`                 | 6             | PASS     | PASS    |                                     |
| 110 | `quests-journey.js`                   | 21            | PASS     | PASS    |                                     |
| 111 | `quests-review-journey.js`            | 7             | PASS     | PASS    |                                     |
| 112 | `quickbar-journey.js`                 | 9             | PASS     | PASS    |                                     |
| 113 | `quickbar-review-journey.js`          | 6             | PASS     | PASS    |                                     |
| 114 | `regions-journey.js`                  | 8             | PASS     | PASS    |                                     |
| 115 | `relations-graph-journey.js`          | 11            | PASS     | PASS    |                                     |
| 116 | `scene-assets-journey.js`             | 13            | PASS     | PASS    |                                     |
| 117 | `scene-assets-review-journey.js`      | 9             | PASS     | PASS    |                                     |
| 118 | `sessions-plus-journey.js`            | 15            | PASS     | PASS    |                                     |
| 119 | `sheet-plus-journey.js`               | 21            | PASS     | PASS    |                                     |
| 120 | `special-moves-journey.js`            | 22            | PASS     | PASS    |                                     |
| 121 | `spells-plus-journey.js`              | 12            | FAIL     | PASS    | riga 3 («Perché?» aperto)           |
| 122 | `spells-plus-review-journey.js`       | 10            | FAIL     | PASS    | riga 3 («Perché?» aperto)           |
| 123 | `travel-journey.js`                   | 12            | PASS     | PASS    |                                     |
| 124 | `travel-review-journey.js`            | 8             | PASS     | PASS    |                                     |
| 125 | `w2a1-shell-journey.js`               | 7             | FAIL     | PASS    | riga 2 (difetto dell'app, corretto) |
| 126 | `w2a2-shell-journey.js`               | 7             | PASS     | PASS    |                                     |
| 127 | `w2b1-shell-journey.js`               | 8             | PASS     | PASS    |                                     |
| 128 | `w2b2-cross-journey.js`               | 4             | PASS     | PASS    |                                     |
| 129 | `w2b2-shell-journey.js`               | 7             | PASS     | PASS    |                                     |
| 130 | `world-map-journey.js`                | 13            | PASS     | PASS    |                                     |
| 131 | `world-map-review-journey.js`         | 7             | PASS     | PASS    |                                     |
| 132 | `b62-ia-journey.js`                   | 10            | PASS     | PASS    |                                     |
| 133 | `b62-review-fixes-journey.js`         | 7             | PASS     | PASS    |                                     |
| 134 | `p1-first-use-journey.js`             | 5             | PASS     | PASS    |                                     |
| 135 | `p1-resume-touch-journey.js`          | 3             | PASS     | PASS    |                                     |
| 136 | `p1-builder-phone-journey.js`         | 4             | PASS     | PASS    |                                     |
| 137 | `p1-leveling-journey.js`              | 3             | PASS     | PASS    |                                     |
| 138 | `p1-foundry-import-journey.js`        | 4             | PASS     | PASS    |                                     |
| 139 | `p1-dm-map-journey.js`                | 2             | PASS     | PASS    |                                     |
| 140 | `p1-cross-tab-journey.js`             | 2             | PASS     | PASS    |                                     |
| 141 | `p3-hp-journey.js`                    | 10            | PASS     | PASS    |                                     |
| 142 | `p3-axe-hp-journey.js`                | 2             | PASS     | PASS    |                                     |
| 143 | `p3-privacy-journey.js`               | 7             | PASS     | PASS    |                                     |
| 144 | `p3-roll-engine-journey.js`           | 9             | PASS     | PASS    |                                     |
| 145 | `p4-campaign-journey.js`              | 11            | PASS     | PASS    |                                     |
| 146 | `p4-inventory-journey.js`             | 10            | PASS     | PASS    |                                     |
| 147 | `p4-prep-journey.js`                  | 6             | PASS     | PASS    |                                     |
| 148 | `p4-rest-journey.js`                  | 11            | PASS     | PASS    |                                     |
| 149 | `p4-shared-journey.js`                | 4             | PASS     | PASS    |                                     |
| 150 | `p4-shop-journey.js`                  | 10            | PASS     | PASS    |                                     |
| 151 | `p5-fix-journey.js`                   | 7             | PASS     | PASS    |                                     |
| 152 | `p5-fix-journey-2.js`                 | 4             | PASS     | PASS    |                                     |
| 153 | `p6-dm-table-journey.js`              | 6             | PASS     | PASS    |                                     |
| 154 | `p6-map-movement-journey.js`          | 7             | FAIL     | PASS    | riga 1 (stesso difetto)             |
| 155 | `p6-phone-map-journey.js`             | 8             | PASS     | PASS    |                                     |
| 156 | `p6-table-extras-journey.js`          | 11            | PASS     | PASS    |                                     |
| 157 | `p6-table-more-journey.js`            | 6             | PASS     | PASS    |                                     |
| 158 | `p8-library-journey.js`               | 6             | PASS     | PASS    |                                     |
| 159 | `p9-journal-journey.js`               | 10            | PASS     | PASS    |                                     |
| 160 | `p9-palette-journey.js`               | 7             | PASS     | PASS    |                                     |
| 161 | `p9-services-journey.js`              | 6             | PASS     | PASS    |                                     |
| 162 | `p9-sessions-journey.js`              | 7             | PASS     | PASS    |                                     |
| 163 | `p10-governance-journey.js`           | 12            | PASS     | PASS    |                                     |
| 164 | `r1-attack-journey.js`                | 3             | PASS     | PASS    |                                     |
| 165 | `r1-connected-journey.js`             | 2             | PASS     | PASS    |                                     |
| 166 | `r1-menu-journey.js`                  | 3             | PASS     | PASS    |                                     |
| 167 | `r1-privacy-journey.js`               | 2             | PASS     | PASS    |                                     |
| 168 | `r1-rules-journey.js`                 | 4             | PASS     | PASS    |                                     |
| 169 | `r2-connected-dice-journey.js`        | 5             | PASS     | PASS    |                                     |
| 170 | `r2-disclosure-journey.js`            | 3             | PASS     | PASS    |                                     |
| 171 | `r3-groups-journey.js`                | 3             | PASS     | PASS    |                                     |
| 172 | `r3-mount-journey.js`                 | 3             | PASS     | PASS    |                                     |
| 173 | `r3-phone-journey.js`                 | 4             | PASS     | PASS    |                                     |
| 174 | `r3-transform-journey.js`             | 3             | PASS     | PASS    |                                     |
| 175 | `r3-walls-journey.js`                 | 2             | PASS     | PASS    |                                     |
| 176 | `r5-encounters-journey.js`            | 7             | PASS     | PASS    |                                     |
| 177 | `r5-initiative-journey.js`            | 10            | PASS     | PASS    |                                     |
| 178 | `r6-builder-variant-journey.js`       | 2             | PASS     | PASS    |                                     |
| 179 | `r6-compat-packs-journey.js`          | 3             | PASS     | PASS    |                                     |
| 180 | `r7-governance-journey.js`            | 8             | PASS     | PASS    |                                     |
| 181 | `r8-copy-journey.js`                  | 5             | PASS     | PASS    |                                     |
| 182 | `r8-filter-journey.js`                | 3             | PASS     | PASS    |                                     |
| 183 | `r8-local-model-journey.js`           | 3             | PASS     | PASS    |                                     |
| 184 | `r8-modules-journey.js`               | 5             | PASS     | PASS    |                                     |
| 185 | `r8-palette-journey.js`               | 4             | PASS     | PASS    |                                     |
| 186 | `handoffs-journey.js`                 | 7             | PASS     | PASS    |                                     |
| 187 | `residuals-a-journey.js`              | 5             | PASS     | PASS    |                                     |
| 188 | `residuals-b-journey.js`              | 4             | PASS     | PASS    |                                     |
| 189 | `final-fixes-journey.js`              | 10            | PASS     | PASS    |                                     |

189/189 PASS in `final`, 1529 esiti `passed`.
