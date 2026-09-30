# Regressione completa dopo il passaggio visivo 2: prove

30/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · un solo scrittore (Claude Code, Opus 5.5) · sessioni del browser `d20-visual2-regress`
(giri completi) e `d20-visual2-probe` (ripetizioni dei singoli percorsi e sonde) · server
`http://127.0.0.1:8879/` senza cache · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual2/regress/` (fuori dal checkout). Solo
dati sintetici. Ruolo: esecutore della regressione dopo il passaggio visivo 2 (pagine, scheda,
Tavolo: [pagine](blueprint-visual2-pages.md), [scheda](blueprint-visual2-sheet.md),
[Tavolo](blueprint-visual2-table.md)) e la sua critica
([«Critica 2»](blueprint-visual-evidence.md)), con correzioni minime dell'app o dei percorsi.

## In breve

- **Test Node:** `node --test design/blueprint/tests/*.test.mjs` **2580/2580** all'inizio (il
  compito diceva 2562: il numero precedeva i 18 test del passaggio visivo 2) e **2582/2582** alla
  fine, con i 2 test nuovi di questa regressione (`tests/visual2-regression.test.mjs`).
- **Percorsi nel browser:** tutti i **188** script elencati nel README dei controlli, nell'ordine
  del README (18 prima di 17, `measure` dopo `gestures-and-views`, poi i percorsi dell'audit e dei
  residui), uno per comando, ciascuno limitato da un allarme di 200 s. Primo giro (`sweep1`):
  **181/188**. Giro finale (`final`), da solo, sul codice e sugli script finali: **188/188**,
  1519 esiti `passed`, nessun errore di pagina (nessun `errors`, `pageErrors` o `findings` non
  vuoto). Ogni percorso restituisce gli stessi passi del giro finale della prima regressione
  visiva (1519 in tutto): nessun percorso verde ne ha di meno.
- **Sei rossi su sette sono spostamenti voluti dal passaggio visivo 2**, che i percorsi leggevano
  ancora al vecchio posto: PF e movimento del Tavolo ora sulla hotbar (`conditions-death`,
  `sheet-plus`), il prossimo appuntamento subito dopo «Continua a giocare» (`registry-smoke`), la
  barra laterale del Tavolo a 340 px (`chat`), la mappa del telefono che riempie lo schermo solo
  dopo «Mappa» (`p6-phone-map`), «Tiri e risultati» accanto alla hotbar sotto il menu della
  pedina rimasto aperto (`r1-privacy`). Aggiornati al minimo, ogni controllo tenuto (o
  rafforzato), un commento datato in ogni file.
- **Un difetto reale dell'app**, esposto dal nuovo layout e corretto partendo da un test rosso:
  **sul telefono il pan a due dita saltava**. Il passaggio del Tavolo dà alla mappa del telefono un
  margine interno di 120 px in basso (ritratti e zoom); il calcolo del pizzico e del pan
  (`token-menu.mjs`) usava il riquadro esterno dell'SVG invece del suo riquadro utile, quindi al
  primo movimento delle dita la vista scendeva di 61,5 unità di scena (esempio: dopo lo zoom a
  2,5× la vista parte da y 133,5 e al primo movimento salta a 190,9, poi prosegue nel verso giusto).
  Ora il calcolo usa il riquadro utile (`mapViewport`): le dita ferme lasciano la vista dov'è, come
  il pan a due dita di Roll20 e TouchVTT già citati per TV-06.
- **Nessun cambiamento visivo**: questa regressione non ha toccato CSS né markup, quindi nessuna
  riga nuova nella tabella «Elemento → prodotto copiato» di `DESIGN.md`.

## Giri eseguiti

| Giro         | Sessione              | Cosa                                                                         | Esito                                                                                                                     |
| ------------ | --------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `node-1`     | —                     | suite Node all'inizio                                                        | **2580/2580**                                                                                                             |
| `sweep1`     | `d20-visual2-regress` | i 188 percorsi di `scripts/order.txt`                                        | **181/188**; rossi `conditions-death`, `registry-smoke`, `token-menu`, `chat`, `sheet-plus`, `p6-phone-map`, `r1-privacy` |
| `p1`         | `d20-visual2-probe`   | `conditions-death`, `registry-smoke` aggiornati                              | 2/2                                                                                                                       |
| sonde        | `d20-visual2-probe`   | `debug/pan.js`, `debug/ctm.js`: pan a due dita passo per passo, CTM dell'SVG | salto di +57,4 al primo movimento; SVG 390 × 560 con `padding-bottom: 120px`, CTM `f` = 318,25 (riquadro utile 440)       |
| `p2`         | `d20-visual2-probe`   | `token-menu` dopo la correzione dell'app                                     | verde (19 gruppi)                                                                                                         |
| `p3`         | `d20-visual2-probe`   | `chat` aggiornato                                                            | verde                                                                                                                     |
| `p4`         | `d20-visual2-probe`   | `sheet-plus` aggiornato                                                      | verde (21)                                                                                                                |
| sonde, `p5`  | `d20-visual2-probe`   | `debug/phone-status*.js`: scorrimento e riga di stato; `p6-phone-map`        | senza «Mappa» la pagina scorre di 325 px e la riga di stato va a y −38; con «Mappa» 224 px e y 63; percorso verde         |
| `p6`         | `d20-visual2-probe`   | `r1-privacy` aggiornato                                                      | verde                                                                                                                     |
| `node-final` | —                     | suite Node dopo le correzioni                                                | **2582/2582**                                                                                                             |
| `final`      | `d20-visual2-regress` | di nuovo tutti i 188, nello stesso ordine, sul codice e sui percorsi finali  | **188/188**, 1519 esiti `passed` (42 min)                                                                                 |

Le ripetizioni nella sessione `d20-visual2-probe` sono state eseguite durante `sweep1`; il giro
`final` è stato eseguito da solo.

## Cosa si rompeva e cosa ho cambiato

| Riga | Percorso                      | Che cosa si vedeva                                                                                                                                                          | Causa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Correzione                                                                                                                                                                                                                                                                                                                                      | Tipo                                            |
| ---- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1    | `conditions-death-journey.js` | «player summary after reload wrong» all'ultimo passo: il riassunto di Livia nella scheda Creatura non contiene «PF 5»; lo screenshot mostra «Livia · PF 5/22» sulla hotbar. | Il passaggio del Tavolo usa nel pannello Creatura il riassunto delle condizioni «embedded» (senza la riga PF): PF e movimento stanno sulla hotbar (BG3), `table.mjs` riga 551. Stesso spostamento già seguito da `forms-journey`.                                                                                                                                                                                                                                                                                                                             | Il PF si legge dal nome accessibile del pulsante PF della hotbar («Punti ferita 5 su 22»); in più il riassunto deve dire «Cosciente» e avere il chip Prono (il messaggio del passo lo afferma già).                                                                                                                                             | spostamento voluto (controllo rafforzato)       |
| 2    | `registry-smoke-journey.js`   | «Home widget order: appointment, sample-extension-widget, campaign-members-home, …».                                                                                        | Il passaggio delle pagine dà al blocco «Prossimo appuntamento» `order: 11` (prima 30) per metterlo accanto a «Continua a giocare». Il riquadro di prova ha `order: 15`: il percorso codificava il vecchio 15 < 30.                                                                                                                                                                                                                                                                                                                                            | Stessa regola, valori nuovi: il riquadro di prova viene dopo l'appuntamento (11 < 15) e, in più, prima del riquadro dei Membri (15 < 35).                                                                                                                                                                                                       | spostamento voluto (controllo rafforzato)       |
| 3    | `token-menu-journey.js`       | Gruppo 16: «two-finger pan: 300,133.46,400,260 → 351.28,174.49,400,260» (le dita scendono, la vista deve salire).                                                           | Vedi «In breve». Sonda `debug/pan.js`: y 133,46 → **190,90** al primo movimento, poi −4,1 per passo (verso giusto). Sonda `debug/ctm.js`: `#battle-map` 390 × 560 con `padding: 0 0 120px` (`styles.css`, blocco del telefono del passaggio del Tavolo); il CTM del browser adatta la scena nei 440 px utili, `viewAround` la adattava nei 560 del riquadro esterno. Il margine interno è una modifica del passaggio del Tavolo (il suo rapporto: «Sul telefono un margine interno di 120 px in basso»); il gruppo 16 passava nella prima regressione visiva. | `token-menu.mjs`: `mapViewport(svg)` (riquadro utile: riquadro esterno meno margini interni e bordi) al posto di `getBoundingClientRect()` all'inizio del gesto. Test: `visual2-regression.test.mjs` (riquadro utile; nessun salto con le dita ferme, verso giusto con le dita che scendono); con il riquadro esterno la vista salta a y 195,0. | **difetto dell'app** (esposto dal nuovo layout) |
| 4    | `chat-journey.js`             | «Chat is not docked beside the Table: {"map":1044,"panel":1045,"width":339,…}».                                                                                             | Il passaggio del Tavolo porta la barra laterale a 340 px fino a 1599 px (DESIGN §4, Foundry v13); il percorso chiedeva almeno 360 px.                                                                                                                                                                                                                                                                                                                                                                                                                         | Soglia della larghezza a 338 px (la colonna di 340 px meno il suo filo di 1 px); invariati l'aggancio al bordo della mappa (< 3 px) e la mappa ≥ 600 px.                                                                                                                                                                                        | misura che codificava il vecchio aspetto        |
| 5    | `sheet-plus-journey.js`       | Passo J: «Table movement not the fly speed».                                                                                                                                | Il percorso leggeva «12 m Movimento» nella scheda Creatura, che non ripete più il movimento (riga 1). La consegna 1 della scheda lo segnalava; la copia locale `sheet-plus-tablefix` del passaggio della scheda accettava anche la frase del pannello dell'area.                                                                                                                                                                                                                                                                                              | Il movimento si legge dalla riga delle risorse della hotbar (`.resources .movement`, valore dopo la parola, come `preferences-journey`), con uguaglianza esatta: «12 m» in volo, «9 m» tornando a camminare. Il controllo del pannello («In uso: Volare · movimento 12 m») resta.                                                               | spostamento voluto                              |
| 6    | `p6-phone-map-journey.js`     | «Status line off screen: {"x":8,"y":-38,…}» durante il trascinamento di Livia sul telefono.                                                                                 | La mappa del telefono ora è alta 560 px e riempie lo schermo sopra la hotbar «una volta in vista»; in cima alla pagina (scorrimento 0) la fila dello zoom sta sotto la hotbar fissata (mappa 225–785, hotbar 627–780). Il tocco su «Centra la scena» fa quindi centrare il bottone al driver: la pagina scorre di 325 px, 100 px oltre il bordo alto della mappa, dove galleggia la riga di stato (sonda `debug/phone-status.js`).                                                                                                                            | Il percorso porta prima la mappa in vista con il bottone «Mappa» del Tavolo (`[data-table-map-link]`, il percorso previsto dal passaggio): scorrimento 224 px, riga di stato a y 63 anche durante il trascinamento (`debug/phone-status-maplink.js`). I controlli della riga di stato sono invariati.                                           | spostamento voluto (vedi Consegne 1)            |
| 7    | `r1-privacy-journey.js`       | Passo «disguise»: clic su `[data-combat-requests]` in attesa per 30 s; Playwright: la voce `category:dm` del menu della pedina (vista principale) intercetta il puntatore.  | Dopo «Nascondi il nome ai giocatori» un Esc riporta il menu alla vista principale senza chiuderlo; «Tiri e risultati» ora sta accanto alla hotbar, sotto il menu aperto. Che prima il menu restasse aperto ma lontano dal bottone è un'inferenza (il percorso passava).                                                                                                                                                                                                                                                                                       | Esc finché il menu è chiuso (al più 3), poi il controllo che sia chiuso; i controlli della privacy sono invariati.                                                                                                                                                                                                                              | spostamento voluto                              |

Nessun controllo tolto. Prettier sui file cambiati. Il punto e virgola finale del contenitore,
che Prettier aggiunge e il README chiede di togliere, è stato tolto da `registry-smoke`,
`r1-privacy` e `p6-phone-map` (che non lo avevano); `conditions-death`, `chat` e `sheet-plus` lo
avevano già e lo tengono (il runner li avvolge e passano). `p6-phone-map` non era mai passato da
Prettier: la formattazione ha riscritto il file su più righe senza cambiarne il codice.

## Percorso per percorso (giro `final`)

«Passi» è il numero di esiti `passed` restituiti dal percorso; per i percorsi P1, che restituiscono
le loro osservazioni invece di un elenco `passed`, è il numero di osservazioni. Ogni percorso si
ferma al primo controllo fallito: PASS vuol dire arrivato in fondo. `sweep1` è il primo giro,
`final` il giro finale.

| #   | Percorso                              | Passi (final) | `sweep1` | `final` | Note                                 |
| --- | ------------------------------------- | ------------- | -------- | ------- | ------------------------------------ |
| 1   | `core-journey.js`                     | 13            | PASS     | PASS    |                                      |
| 2   | `preparation-journey.js`              | 9             | PASS     | PASS    |                                      |
| 3   | `gestures-and-views.js`               | 8             | PASS     | PASS    |                                      |
| 4   | `back-guard-journey.js`               | 4             | PASS     | PASS    |                                      |
| 5   | `measure-journey.js`                  | 2             | PASS     | PASS    |                                      |
| 6   | `visual-fixes-journey.js`             | 5             | PASS     | PASS    |                                      |
| 7   | `combat-journey.js`                   | 10            | PASS     | PASS    |                                      |
| 8   | `area-journey.js`                     | 9             | PASS     | PASS    |                                      |
| 9   | `multi-self-journey.js`               | 6             | PASS     | PASS    |                                      |
| 10  | `combat-mobile-journey.js`            | 10            | PASS     | PASS    |                                      |
| 11  | `encounter-lifecycle.js`              | 10            | PASS     | PASS    |                                      |
| 12  | `reactions-journey.js`                | 8             | PASS     | PASS    |                                      |
| 13  | `concentration-journey.js`            | 10            | PASS     | PASS    |                                      |
| 14  | `simultaneous-reactions-journey.js`   | 6             | PASS     | PASS    |                                      |
| 15  | `new-npc-reaction-journey.js`         | 4             | PASS     | PASS    |                                      |
| 16  | `spatial-journey.js`                  | 8             | PASS     | PASS    |                                      |
| 17  | `spatial-mobile-journey.js`           | 6             | PASS     | PASS    |                                      |
| 18  | `approach-journey.js`                 | 7             | PASS     | PASS    |                                      |
| 19  | `builder-journey.js`                  | 5             | PASS     | PASS    |                                      |
| 20  | `builder-advance-journey.js`          | 3             | PASS     | PASS    |                                      |
| 21  | `builder-reconstruction-journey.js`   | 3             | PASS     | PASS    |                                      |
| 22  | `builder-dice-journey.js`             | 5             | PASS     | PASS    |                                      |
| 23  | `builder-recovery-journey.js`         | 3             | PASS     | PASS    |                                      |
| 24  | `library-journey.js`                  | 3             | PASS     | PASS    |                                      |
| 25  | `library-builder-journey.js`          | 3             | PASS     | PASS    |                                      |
| 26  | `library-files-journey.js`            | 2             | PASS     | PASS    |                                      |
| 27  | `library-mobile-journey.js`           | 3             | PASS     | PASS    |                                      |
| 28  | `library-spell-recovery-journey.js`   | 2             | PASS     | PASS    |                                      |
| 29  | `library-import-recovery-journey.js`  | 2             | PASS     | PASS    |                                      |
| 30  | `campaign-notes-journey.js`           | 3             | PASS     | PASS    |                                      |
| 31  | `campaign-world-journey.js`           | 2             | PASS     | PASS    |                                      |
| 32  | `campaign-sessions-journey.js`        | 2             | PASS     | PASS    |                                      |
| 33  | `campaign-sharing-journey.js`         | 3             | PASS     | PASS    |                                      |
| 34  | `campaign-mobile-journey.js`          | 2             | PASS     | PASS    |                                      |
| 35  | `campaign-integration-journey.js`     | 2             | PASS     | PASS    |                                      |
| 36  | `rest-shared-journey.js`              | 3             | PASS     | PASS    |                                      |
| 37  | `rest-time-journey.js`                | 3             | PASS     | PASS    |                                      |
| 38  | `rest-mobile-personal-journey.js`     | 4             | PASS     | PASS    |                                      |
| 39  | `rest-reversed-journey.js`            | 1             | PASS     | PASS    |                                      |
| 40  | `companion-map-journey.js`            | 2             | PASS     | PASS    |                                      |
| 41  | `forms-journey.js`                    | 2             | PASS     | PASS    |                                      |
| 42  | `familiar-journey.js`                 | 3             | PASS     | PASS    |                                      |
| 43  | `forms-mobile-journey.js`             | 3             | PASS     | PASS    |                                      |
| 44  | `companion-personal-journey.js`       | 2             | PASS     | PASS    |                                      |
| 45  | `conditions-journey.js`               | 11            | PASS     | PASS    |                                      |
| 46  | `conditions-death-journey.js`         | 7             | FAIL     | PASS    | riga 1 (PF sulla hotbar)             |
| 47  | `dice-correction-journey.js`          | 7             | PASS     | PASS    |                                      |
| 48  | `conditions-mobile-journey.js`        | 3             | PASS     | PASS    |                                      |
| 49  | `conditions-fixes-journey.js`         | 7             | PASS     | PASS    |                                      |
| 50  | `conditions-badges-journey.js`        | 2             | PASS     | PASS    |                                      |
| 51  | `registry-smoke-journey.js`           | 18            | FAIL     | PASS    | riga 2 (ordine dell'appuntamento)    |
| 52  | `b11b-inc10-fixes-journey.js`         | 11            | PASS     | PASS    |                                      |
| 53  | `b61-table-structure-journey.js`      | 6             | PASS     | PASS    |                                      |
| 54  | `b61-review-fixes-journey.js`         | 6             | PASS     | PASS    |                                      |
| 55  | `token-menu-journey.js`               | 19            | FAIL     | PASS    | riga 3 (difetto dell'app, corretto)  |
| 56  | `campaign-members-journey.js`         | 15            | PASS     | PASS    |                                      |
| 57  | `campaign-members-review-journey.js`  | 11            | PASS     | PASS    |                                      |
| 58  | `campaign-members-review2-journey.js` | 9             | PASS     | PASS    |                                      |
| 59  | `session-view-journey.js`             | 15            | PASS     | PASS    |                                      |
| 60  | `handouts-journey.js`                 | 15            | PASS     | PASS    |                                      |
| 61  | `compendium-journey.js`               | 15            | PASS     | PASS    |                                      |
| 62  | `chat-journey.js`                     | 13            | FAIL     | PASS    | riga 4 (barra laterale di 340 px)    |
| 63  | `chat-review-fixes-journey.js`        | 11            | PASS     | PASS    |                                      |
| 64  | `annotations-journey.js`              | 11            | PASS     | PASS    |                                      |
| 65  | `annotations-review-fixes-journey.js` | 10            | PASS     | PASS    |                                      |
| 66  | `encounter-builder-journey.js`        | 12            | PASS     | PASS    |                                      |
| 67  | `campaign-settings-journey.js`        | 15            | PASS     | PASS    |                                      |
| 68  | `character-library-journey.js`        | 17            | PASS     | PASS    |                                      |
| 69  | `character-library-review-journey.js` | 10            | PASS     | PASS    |                                      |
| 70  | `preferences-journey.js`              | 14            | PASS     | PASS    |                                      |
| 71  | `command-palette-journey.js`          | 13            | PASS     | PASS    |                                      |
| 72  | `notifications-journey.js`            | 25            | PASS     | PASS    |                                      |
| 73  | `random-tables-journey.js`            | 24            | PASS     | PASS    |                                      |
| 74  | `loot-journey.js`                     | 12            | PASS     | PASS    |                                      |
| 75  | `loot-review-journey.js`              | 7             | PASS     | PASS    |                                      |
| 76  | `loot-review2-journey.js`             | 6             | PASS     | PASS    |                                      |
| 77  | `safety-journey.js`                   | 17            | PASS     | PASS    |                                      |
| 78  | `media-journey.js`                    | 13            | PASS     | PASS    |                                      |
| 79  | `media-review-journey.js`             | 13            | PASS     | PASS    |                                      |
| 80  | `media-review2-journey.js`            | 7             | PASS     | PASS    |                                      |
| 81  | `account-journey.js`                  | 10            | PASS     | PASS    |                                      |
| 82  | `home-journey.js`                     | 13            | PASS     | PASS    |                                      |
| 83  | `dice-3d-journey.js`                  | 18            | PASS     | PASS    |                                      |
| 84  | `community-journey.js`                | 22            | PASS     | PASS    |                                      |
| 85  | `assistant-journey.js`                | 14            | PASS     | PASS    |                                      |
| 86  | `assistant-review-fixes.js`           | 11            | PASS     | PASS    |                                      |
| 87  | `assistant-review-fixes-2.js`         | 9             | PASS     | PASS    |                                      |
| 88  | `w1b-shell-journey.js`                | 6             | PASS     | PASS    |                                      |
| 89  | `adventures-journey.js`               | 7             | PASS     | PASS    |                                      |
| 90  | `builder-plus-journey.js`             | 20            | PASS     | PASS    |                                      |
| 91  | `campaign-data-journey.js`            | 15            | PASS     | PASS    |                                      |
| 92  | `combat-tracker-journey.js`           | 19            | PASS     | PASS    |                                      |
| 93  | `combat-tracker-review-journey.js`    | 7             | PASS     | PASS    |                                      |
| 94  | `damage-tray-journey.js`              | 11            | PASS     | PASS    |                                      |
| 95  | `dice-tray-journey.js`                | 17            | PASS     | PASS    |                                      |
| 96  | `dice-tray-review-journey.js`         | 11            | PASS     | PASS    |                                      |
| 97  | `fog-vision-journey.js`               | 11            | PASS     | PASS    |                                      |
| 98  | `fog-vision-review-journey.js`        | 5             | PASS     | PASS    |                                      |
| 99  | `generators-journey.js`               | 11            | PASS     | PASS    |                                      |
| 100 | `homebrew-editor-journey.js`          | 12            | PASS     | PASS    |                                      |
| 101 | `homebrew-editor-review-journey.js`   | 5             | PASS     | PASS    |                                      |
| 102 | `integrations-journey.js`             | 9             | PASS     | PASS    |                                      |
| 103 | `inventory-plus-journey.js`           | 18            | PASS     | PASS    |                                      |
| 104 | `inventory-plus-review-journey.js`    | 6             | PASS     | PASS    |                                      |
| 105 | `knowledge-journey.js`                | 10            | PASS     | PASS    |                                      |
| 106 | `knowledge-review-journey.js`         | 8             | PASS     | PASS    |                                      |
| 107 | `offline-journey.js`                  | 9             | PASS     | PASS    |                                      |
| 108 | `party-journey.js`                    | 9             | PASS     | PASS    |                                      |
| 109 | `projects-journey.js`                 | 6             | PASS     | PASS    |                                      |
| 110 | `quests-journey.js`                   | 21            | PASS     | PASS    |                                      |
| 111 | `quests-review-journey.js`            | 7             | PASS     | PASS    |                                      |
| 112 | `quickbar-journey.js`                 | 9             | PASS     | PASS    |                                      |
| 113 | `quickbar-review-journey.js`          | 6             | PASS     | PASS    |                                      |
| 114 | `regions-journey.js`                  | 8             | PASS     | PASS    |                                      |
| 115 | `relations-graph-journey.js`          | 11            | PASS     | PASS    |                                      |
| 116 | `scene-assets-journey.js`             | 13            | PASS     | PASS    |                                      |
| 117 | `scene-assets-review-journey.js`      | 9             | PASS     | PASS    |                                      |
| 118 | `sessions-plus-journey.js`            | 15            | PASS     | PASS    |                                      |
| 119 | `sheet-plus-journey.js`               | 21            | FAIL     | PASS    | riga 5 (movimento sulla hotbar)      |
| 120 | `special-moves-journey.js`            | 22            | PASS     | PASS    |                                      |
| 121 | `spells-plus-journey.js`              | 12            | PASS     | PASS    |                                      |
| 122 | `spells-plus-review-journey.js`       | 10            | PASS     | PASS    |                                      |
| 123 | `travel-journey.js`                   | 12            | PASS     | PASS    |                                      |
| 124 | `travel-review-journey.js`            | 8             | PASS     | PASS    |                                      |
| 125 | `w2a1-shell-journey.js`               | 7             | PASS     | PASS    |                                      |
| 126 | `w2a2-shell-journey.js`               | 7             | PASS     | PASS    |                                      |
| 127 | `w2b1-shell-journey.js`               | 8             | PASS     | PASS    |                                      |
| 128 | `w2b2-cross-journey.js`               | 4             | PASS     | PASS    |                                      |
| 129 | `w2b2-shell-journey.js`               | 7             | PASS     | PASS    |                                      |
| 130 | `world-map-journey.js`                | 13            | PASS     | PASS    |                                      |
| 131 | `world-map-review-journey.js`         | 7             | PASS     | PASS    |                                      |
| 132 | `b62-ia-journey.js`                   | 10            | PASS     | PASS    |                                      |
| 133 | `b62-review-fixes-journey.js`         | 7             | PASS     | PASS    |                                      |
| 134 | `p1-first-use-journey.js`             | 5             | PASS     | PASS    |                                      |
| 135 | `p1-resume-touch-journey.js`          | 3             | PASS     | PASS    |                                      |
| 136 | `p1-builder-phone-journey.js`         | 4             | PASS     | PASS    |                                      |
| 137 | `p1-leveling-journey.js`              | 3             | PASS     | PASS    |                                      |
| 138 | `p1-foundry-import-journey.js`        | 4             | PASS     | PASS    |                                      |
| 139 | `p1-dm-map-journey.js`                | 2             | PASS     | PASS    |                                      |
| 140 | `p1-cross-tab-journey.js`             | 2             | PASS     | PASS    |                                      |
| 141 | `p3-hp-journey.js`                    | 10            | PASS     | PASS    |                                      |
| 142 | `p3-axe-hp-journey.js`                | 2             | PASS     | PASS    |                                      |
| 143 | `p3-privacy-journey.js`               | 7             | PASS     | PASS    |                                      |
| 144 | `p3-roll-engine-journey.js`           | 9             | PASS     | PASS    |                                      |
| 145 | `p4-campaign-journey.js`              | 11            | PASS     | PASS    |                                      |
| 146 | `p4-inventory-journey.js`             | 10            | PASS     | PASS    |                                      |
| 147 | `p4-prep-journey.js`                  | 6             | PASS     | PASS    |                                      |
| 148 | `p4-rest-journey.js`                  | 11            | PASS     | PASS    |                                      |
| 149 | `p4-shared-journey.js`                | 4             | PASS     | PASS    |                                      |
| 150 | `p4-shop-journey.js`                  | 10            | PASS     | PASS    |                                      |
| 151 | `p5-fix-journey.js`                   | 7             | PASS     | PASS    |                                      |
| 152 | `p5-fix-journey-2.js`                 | 4             | PASS     | PASS    |                                      |
| 153 | `p6-dm-table-journey.js`              | 6             | PASS     | PASS    |                                      |
| 154 | `p6-map-movement-journey.js`          | 7             | PASS     | PASS    |                                      |
| 155 | `p6-phone-map-journey.js`             | 8             | FAIL     | PASS    | riga 6 (mappa del telefono in vista) |
| 156 | `p6-table-extras-journey.js`          | 11            | PASS     | PASS    |                                      |
| 157 | `p6-table-more-journey.js`            | 6             | PASS     | PASS    |                                      |
| 158 | `p8-library-journey.js`               | 6             | PASS     | PASS    |                                      |
| 159 | `p9-journal-journey.js`               | 10            | PASS     | PASS    |                                      |
| 160 | `p9-palette-journey.js`               | 7             | PASS     | PASS    |                                      |
| 161 | `p9-services-journey.js`              | 6             | PASS     | PASS    |                                      |
| 162 | `p9-sessions-journey.js`              | 7             | PASS     | PASS    |                                      |
| 163 | `p10-governance-journey.js`           | 12            | PASS     | PASS    |                                      |
| 164 | `r1-attack-journey.js`                | 3             | PASS     | PASS    |                                      |
| 165 | `r1-connected-journey.js`             | 2             | PASS     | PASS    |                                      |
| 166 | `r1-menu-journey.js`                  | 3             | PASS     | PASS    |                                      |
| 167 | `r1-privacy-journey.js`               | 2             | FAIL     | PASS    | riga 7 (menu della pedina chiuso)    |
| 168 | `r1-rules-journey.js`                 | 4             | PASS     | PASS    |                                      |
| 169 | `r2-connected-dice-journey.js`        | 5             | PASS     | PASS    |                                      |
| 170 | `r2-disclosure-journey.js`            | 3             | PASS     | PASS    |                                      |
| 171 | `r3-groups-journey.js`                | 3             | PASS     | PASS    |                                      |
| 172 | `r3-mount-journey.js`                 | 3             | PASS     | PASS    |                                      |
| 173 | `r3-phone-journey.js`                 | 4             | PASS     | PASS    |                                      |
| 174 | `r3-transform-journey.js`             | 3             | PASS     | PASS    |                                      |
| 175 | `r3-walls-journey.js`                 | 2             | PASS     | PASS    |                                      |
| 176 | `r5-encounters-journey.js`            | 7             | PASS     | PASS    |                                      |
| 177 | `r5-initiative-journey.js`            | 10            | PASS     | PASS    |                                      |
| 178 | `r6-builder-variant-journey.js`       | 2             | PASS     | PASS    |                                      |
| 179 | `r6-compat-packs-journey.js`          | 3             | PASS     | PASS    |                                      |
| 180 | `r7-governance-journey.js`            | 8             | PASS     | PASS    |                                      |
| 181 | `r8-copy-journey.js`                  | 5             | PASS     | PASS    |                                      |
| 182 | `r8-filter-journey.js`                | 3             | PASS     | PASS    |                                      |
| 183 | `r8-local-model-journey.js`           | 3             | PASS     | PASS    |                                      |
| 184 | `r8-modules-journey.js`               | 5             | PASS     | PASS    |                                      |
| 185 | `r8-palette-journey.js`               | 4             | PASS     | PASS    |                                      |
| 186 | `handoffs-journey.js`                 | 7             | PASS     | PASS    |                                      |
| 187 | `residuals-a-journey.js`              | 5             | PASS     | PASS    |                                      |
| 188 | `residuals-b-journey.js`              | 4             | PASS     | PASS    |                                      |

188/188 PASS in `final`, 1519 esiti `passed`.

## Consegne (fuori da questo compito)

1. **Telefono, Tavolo in cima alla pagina** (passaggio del Tavolo): prima di «Mappa» o di uno
   scorrimento la fila dello zoom («Centra la scena», +, −) e il fondo dei ritratti del gruppo
   stanno sotto la hotbar fissata; e se la pagina scorre oltre il bordo alto della mappa (per
   esempio verso il pannello sotto), la riga di stato di un trascinamento esce dallo schermo.
   Il percorso ora segue il flusso previsto («Mappa»); resta da decidere se la mappa debba
   entrare in vista da sola all'apertura del Tavolo sul telefono o se la riga di stato debba
   restare visibile (per esempio fissata in alto) — scelta di Tavolo, non di questa regressione.
2. **README dei controlli e `DEVELOPMENT.md`**: nessun paragrafo per questa regressione (né per la
   prima regressione visiva): la regola nuova da riportare è che i gesti sulla mappa leggono il
   riquadro utile dell'SVG (`token-menu.mjs mapViewport`), perché il telefono imbottisce la mappa.
   File condivisi del coordinatore.
3. Le altre letture della mappa in coordinate dello schermo (`annotations.mjs`,
   `lighting-editor.mjs`, `media-table.mjs`, `session-view.mjs` `layoutHud`) combinano il CTM con
   il riquadro esterno per coprire tutta la mappa con il loro HUD: coerenti con il margine
   interno, non toccate.
4. Restano aperte le consegne dei tre passaggi e della «Critica 2» (per esempio la fascia della
   scheda a 165 px, le sotto-schede su tre righe, i duplicati nascosti della scheda).

## Limiti

- Chromium di Playwright su macOS soltanto, dati sintetici, nessun dispositivo reale; i percorsi
  «telefono» usano i loro contesti a 390 px con il tocco (CDP dove il percorso lo chiede).
- I dadi digitali sono casuali: un giro verde non prova ogni combinazione di facce.
- Riga 7: la posizione precedente di «Tiri e risultati» rispetto al menu è un'inferenza dal fatto
  che il percorso passava; il blocco del clic è misurato (registro di Playwright).
- Questa è una regressione dei percorsi esistenti, non una nuova revisione visiva; revisione in un
  solo contesto, da ripetere in un'altra sessione sulla SHA candidata.

## File cambiati

- `design/blueprint/token-menu.mjs` — `mapViewport(svg)`; l'inizio del pizzico usa il riquadro utile.
- `design/blueprint/tests/visual2-regression.test.mjs` — nuovo, 2 test (rossi prima della
  correzione: l'export mancava e con il riquadro esterno la vista salta a y 195,0).
- `changes/interview-01/blueprint-checks/conditions-death-journey.js`,
  `registry-smoke-journey.js`, `chat-journey.js`, `sheet-plus-journey.js`,
  `p6-phone-map-journey.js`, `r1-privacy-journey.js` — aggiornati con un commento datato 30/09/2026.
- Questo rapporto.

## Come ripetere

Dalla cartella delle prove (fuori dal repository), con il server acceso:

```sh
cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual2/regress
playwright-cli -s=d20-visual2-regress open http://127.0.0.1:8879/
TAG=final nohup scripts/run.sh $(cat scripts/order.txt) > logs/final.out 2>&1 &
python3 scripts/table.py final sweep1
```

`scripts/` è il runner della prima regressione visiva con cartella e sessione nuove: `prep.sh`
copia ogni percorso, sposta le sue cartelle d'uscita in `runs/<nome>/` e lo avvolge (errore,
ultimi passi, uno screenshot per pagina); `run.sh` esegue un percorso per comando con un allarme di
200 s; `verdict.py` decide PASS/FAIL (errori, `findings`, `result: "FAIL"`, rifiuto della CLI o
risposta vuota sono rossi). `probe/` è lo stesso runner nella sessione `d20-visual2-probe`;
`probe/debug/` contiene le sonde citate sopra. Risultati: `results-sweep1.txt`,
`results-final.txt`, `table-final.md`; suite Node: `logs/node-1.log`, `logs/node-final.log`.
