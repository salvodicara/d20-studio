# Regressione completa dopo il passaggio visivo: prove

30/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · sessioni browser `d20-visual-regress` (giri completi) e `d20-visual-probe`
(ripetizioni dei singoli percorsi e sonde) · server `http://127.0.0.1:8879/` senza cache ·
cartella delle prove `~/Workspace/Codex/d20-blueprint-evidence/2026-09-29/visual/regress/` (fuori
dal checkout). Solo dati sintetici. Ruolo: esecutore della regressione dopo il passaggio visivo
([prove del passaggio](blueprint-visual-evidence.md)), con correzioni minime dell'app o dei percorsi.

## In breve

- **Test Node:** `node --test design/blueprint/tests/*.test.mjs` **2558/2558** all'inizio (il
  compito diceva 2543: il numero precedeva i residui del 29/09) e **2562/2562** alla fine, con i 4
  test nuovi di questa regressione (`tests/visual-regression.test.mjs`).
- **Percorsi nel browser:** tutti i **188** script elencati nel README dei controlli (i 186 della
  regressione del round 2 più `residuals-a` e `residuals-b`), nell'ordine del README (18 prima di 17,
  `measure` dopo `gestures-and-views`), uno per comando, ciascuno limitato da un allarme di 200 s.
  Primo giro (`sweep1`): **181/188**. Giro finale (`final`), sul codice e sugli script finali:
  **188/188**, 1519 esiti `passed`, nessun errore di pagina (nessun `errors`, `pageErrors` o
  `findings` non vuoto). Nessun percorso verde ha meno passi che nel giro finale del round 2.
- **Il passaggio visivo non ha rotto nessun percorso per ragioni di aspetto**, tranne una misura:
  `spells-plus-review` leggeva come opaca la nuova tinta traslucida della finestra di preparazione
  (contrasto reale 12,51:1, il requisito ≥ 4,5:1 resta).
- **Due difetti reali dell'app**, corretti partendo da un test rosso:
  - **Iniziativa scritta dal DM ignorata all'avvio.** Nella finestra «Avvia combattimento», un d20
    fisico scritto sopra un tiro digitale già salvato finiva nel registro ma il combattimento
    partiva con il tiro vecchio (esempio: il Custode aveva 18 digitale, il DM scrive 11, il Custode
    agisce comunque per primo). Anche «Tira l'iniziativa» ripetuto nella finestra non aggiornava la
    riga salvata. Ora vale sempre il tiro più recente del registro: quello scritto o ritirato nella
    finestra resta, e un tiro fatto altrove dopo (un giocatore dalla sua scheda) entra ancora.
  - **Porta a portata esatta rifiutata.** Con la griglia libera, un clic sulla mappa porta con sé
    un errore di arrotondamento (Livia a x 299,99997 invece di 300): la finestra della porta
    mostrava «Distanza: 1,5 m · Portata: 1,5 m» e chiedeva comunque di camminare 0,3 m. Ora la
    portata tollera 1 cm, come già fa la portata delle porte nelle Regioni.
- **Due percorsi instabili per cause non visive**, resi robusti senza togliere controlli:
  `p1-cross-tab` (una corsa tra il controllo e il clic, 1 rosso su 9 esecuzioni) e `residuals-b` (dadi
  casuali: quando un goblin colpisce Livia, la sua offerta di Scudo blocca giustamente il turno
  successivo; 4 rossi su 5 esecuzioni).

## Giri eseguiti

| Giro         | Sessione             | Cosa                                                                                                               | Esito                                                                                                                                  |
| ------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `node-1`     | —                    | suite Node all'inizio                                                                                              | **2558/2558**                                                                                                                          |
| `sweep1`     | `d20-visual-regress` | i 188 percorsi di `scripts/order.txt`                                                                              | **181/188**; rossi `encounter-lifecycle`, `spatial`, `spatial-mobile`, `approach`, `spells-plus-review`, `p1-cross-tab`, `residuals-b` |
| `p1`         | `d20-visual-probe`   | i primi 11 percorsi di nuovo                                                                                       | `encounter-lifecycle` rosso anche qui (riproducibile, riga 1)                                                                          |
| `p2`         | `d20-visual-probe`   | `encounter-lifecycle`, `spatial`, `spatial-mobile`, `approach`                                                     | 4/4 dopo le due correzioni dell'app                                                                                                    |
| `p3`         | `d20-visual-probe`   | `spells-plus-review`                                                                                               | verde dopo l'aggiornamento della misura (12,51:1)                                                                                      |
| `p4`–`p6`    | `d20-visual-probe`   | `p1-cross-tab` da solo, dopo `p1-foundry-import` e `p1-dm-map`, 6 volte                                            | 8/8 verdi: il rosso di `sweep1` non si ripete (riga 4)                                                                                 |
| `p7`–`p8`    | `d20-visual-probe`   | `residuals-b` 4 volte                                                                                              | 3 rossi, 1 verde: dipende dai dadi (riga 5)                                                                                            |
| `p9`, sonde  | `d20-visual-probe`   | `residuals-b` 3 volte dopo l'aggiornamento, più 2 copie strumentate                                                | 3/3 verdi; le copie strumentate confermano che il ramo nuovo rifiuta 1 e 2 offerte di Scudo                                            |
| `p10`–`p11`  | `d20-visual-probe`   | `p1-cross-tab` 3 volte e `spells-plus-review` dopo Prettier; `residuals-b` dopo l'ultima modifica del suo commento | 5/5                                                                                                                                    |
| `node-final` | —                    | suite Node dopo le correzioni                                                                                      | **2562/2562**                                                                                                                          |
| `final`      | `d20-visual-regress` | di nuovo tutti i 188, nello stesso ordine, sul codice e sui percorsi finali                                        | **188/188**, 1519 esiti `passed`                                                                                                       |

Durante `sweep1` le sonde giravano in parallelo nell'altra sessione; il giro `final` è stato
eseguito da solo.

## Cosa si rompeva e cosa ho cambiato

| Riga | Percorso                                                | Che cosa si vedeva                                                                                                                                                                                                                                                                                                 | Causa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Tipo                                            |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1    | `encounter-lifecycle.js`                                | «Prepared encounter did not start with its explicit roster/order»: il DM scrive 11 per il Custode e 12 per Livia, «Attiva e avvia», e il Custode è primo. Stato salvato: nel registro c'è l'11 fisico, ma il partecipante della scena ha ancora il 18 digitale del primo tiro (sonda `probe/debug/el-journey.js`). | `saveStartRows` (chiamata da `startFromTable` dopo aver registrato l'11) richiama `mergeSavedRolls`, che sostituiva una riga con il partecipante salvato ogni volta che i due `rollId` erano diversi: il tiro appena registrato nella finestra perdeva contro quello vecchio. Stesso effetto su un secondo «Tira l'iniziativa» nella finestra. Non viene dal passaggio visivo (che non ha toccato questo file): resta nascosto quando il d20 digitale del Custode esce sotto 14, e nei giri di oggi è uscito 18.                                    | `combat-tracker-domain.mjs` `mergeSavedRolls`: prende il tiro salvato solo se nel registro (che si scrive solo in coda) viene dopo quello della riga. Un valore scritto dal DM resta (regola invariata), un tiro di un giocatore fatto dopo la lettura della finestra entra ancora (TV-46). Come Foundry, dove il valore d'iniziativa scritto nel tracker sostituisce quello tirato. Test: `visual-regression.test.mjs`, tre casi (valore scritto sopra un tiro digitale, ritiro nella finestra, tiro salvato altrove dopo). | **difetto dell'app** (non visivo)               |
| 2    | `spatial-journey.js` (poi `spatial-mobile`, `approach`) | «waiting for … Apri con Livia»: la finestra della porta offriva «Vai e apri con Livia» e diceva «Prima Livia cammina fino alla porta: 0,3 m», con «Distanza: 1,5 m · Portata: 1,5 m». `spatial-mobile` e `approach` partono dallo stato lasciato da `spatial` e cadevano di conseguenza.                           | Con lo snap della griglia spento, il percorso posa Livia a 1 casella dalla porta cliccando sulla mappa della Preparazione; dopo il passaggio visivo quei clic tornano in coordinate di scena con un errore di arrotondamento (Livia a x 299,99997, casella 50,00001 dopo la calibrazione: sonda `probe/debug/spatial-dbg.js`). La distanza diventa 1,5000009 m e il confronto esatto `distance > portata` la rifiutava. Che la scala della mappa sia cambiata con il passaggio visivo è un'inferenza: i valori sono misurati, la misura «prima» no. | `table-spatial.mjs` `previewDoorInteraction`: tolleranza di 1 cm sulla portata (`REACH_TOLERANCE_METERS`), lo stesso margine che `regions-domain` usa già per la portata delle porte; la distanza è mostrata a 0,1 m. Una distanza vera oltre la portata (1,8 m) resta rifiutata. Test: `visual-regression.test.mjs`. La finestra ora apre direttamente «Apri con Livia», come BG3 quando il personaggio è già accanto alla porta.                                                                                           | **difetto dell'app** (esposto dal nuovo layout) |
| 3    | `spells-plus-review-journey.js`                         | «light theme contrast … [".spl-warning, .spl-window p", 2.39]».                                                                                                                                                                                                                                                    | Il passaggio visivo ha dato alla finestra di preparazione aperta una tinta traslucida (`background: var(--positive-soft)`, cioè rgba(47, 107, 51, 0,12) sul pannello crema; prima c'era solo il filo a sinistra, `visual/characters/css-before/spells-plus.css`). La misura del percorso prendeva il primo sfondo non trasparente come opaco: verde scuro.                                                                                                                                                                                          | Il percorso fonde ogni sfondo traslucido con quelli sotto (commento nel file). Contrasto reale **12,51:1**; le altre cinque misure invariate (13,63; 13,63; 13,21; 5,48; 5,48). Soglia 4,5:1 invariata.                                                                                                                                                                                                                                                                                                                      | misura che codificava il vecchio aspetto        |
| 4    | `p1-cross-tab-journey.js`                               | «waiting for locator('[data-campaign-apply]') … element is not enabled» per 30 s; lo screenshot mostra ancora «Ho confrontato: usa questa base…» non premuto.                                                                                                                                                      | Corsa nel percorso: controlla `isEnabled()` di «Salva», poi clicca; se nel frattempo la scheda 1 riceve il salvataggio B della scheda 2, «Salva» si disattiva (il conflitto voluto) e il clic aspetta 30 s. Un rosso su 9 esecuzioni, con le due sessioni del browser attive insieme. `campaign.mjs` non è cambiato dal 25/09.                                                                                                                                                                                                                      | Quel clic facoltativo rinuncia dopo 2 s invece di 30 (commento nel file); poi il percorso controlla come prima il messaggio di conflitto, «Salva» disattivato, «Ho confrontato», il salvataggio di A e la cronologia con A e B.                                                                                                                                                                                                                                                                                              | percorso instabile                              |
| 5    | `residuals-b-journey.js`                                | «after the group: … Goblin guerriero A Turno attuale»: «Turno successivo» non passava il turno; avviso «Ci sono conseguenze ancora in attesa. Risolvile prima di avanzare.» e, aperta, «Reazioni da scegliere · Livia · Scudo».                                                                                    | Percorso nuovo dei residui (29/09, mai passato in una regressione completa). L'attacco di gruppo usa dadi digitali casuali: quando un goblin colpisce Livia, la sua reazione Scudo è un'offerta in sospeso e il turno giustamente non avanza finché qualcuno risponde (tempi delle reazioni, SRD). 4 rossi su 5 esecuzioni.                                                                                                                                                                                                                         | Dopo l'attacco il DM rifiuta ogni offerta di Scudo con «Scegli» → «Rinuncia per questa occasione» (rifiutare non spende nulla), come `simultaneous-reactions-journey.js`; poi il controllo resta: un solo «Turno successivo» passa l'intero gruppo al gruppo dei personaggi. Le copie strumentate hanno rifiutato 1 e 2 offerte.                                                                                                                                                                                             | percorso instabile (dadi)                       |

Nessun controllo tolto. Prettier sui file cambiati; i tre percorsi toccati non hanno il punto e
virgola finale (Prettier lo aggiunge, il README chiede di toglierlo).

## Percorso per percorso (giro `final`)

«Passi» è il numero di esiti `passed` restituiti dal percorso; per i percorsi P1, che restituiscono
le loro osservazioni invece di un elenco `passed`, è il numero di osservazioni (per questo
`p1-*` non mostra più 0 come nel round 2). Ogni percorso si ferma al primo controllo fallito:
PASS vuol dire arrivato in fondo. `sweep1` è il primo giro, `final` il giro finale.

| #   | Percorso                              | Passi (final) | `sweep1` | `final` | Note                                |
| --- | ------------------------------------- | ------------- | -------- | ------- | ----------------------------------- |
| 1   | `core-journey.js`                     | 13            | PASS     | PASS    |                                     |
| 2   | `preparation-journey.js`              | 9             | PASS     | PASS    |                                     |
| 3   | `gestures-and-views.js`               | 8             | PASS     | PASS    |                                     |
| 4   | `back-guard-journey.js`               | 4             | PASS     | PASS    |                                     |
| 5   | `measure-journey.js`                  | 2             | PASS     | PASS    |                                     |
| 6   | `visual-fixes-journey.js`             | 5             | PASS     | PASS    |                                     |
| 7   | `combat-journey.js`                   | 10            | PASS     | PASS    |                                     |
| 8   | `area-journey.js`                     | 9             | PASS     | PASS    |                                     |
| 9   | `multi-self-journey.js`               | 6             | PASS     | PASS    |                                     |
| 10  | `combat-mobile-journey.js`            | 10            | PASS     | PASS    |                                     |
| 11  | `encounter-lifecycle.js`              | 10            | FAIL     | PASS    | riga 1 (difetto dell'app, corretto) |
| 12  | `reactions-journey.js`                | 8             | PASS     | PASS    |                                     |
| 13  | `concentration-journey.js`            | 10            | PASS     | PASS    |                                     |
| 14  | `simultaneous-reactions-journey.js`   | 6             | PASS     | PASS    |                                     |
| 15  | `new-npc-reaction-journey.js`         | 4             | PASS     | PASS    |                                     |
| 16  | `spatial-journey.js`                  | 8             | FAIL     | PASS    | riga 2 (difetto dell'app, corretto) |
| 17  | `spatial-mobile-journey.js`           | 6             | FAIL     | PASS    | riga 2 (segue `spatial`)            |
| 18  | `approach-journey.js`                 | 7             | FAIL     | PASS    | riga 2 (segue `spatial`)            |
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
| 80  | `media-review2-journey.js`            | 7             | PASS     | PASS    |                                     |
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
| 121 | `spells-plus-journey.js`              | 12            | PASS     | PASS    |                                     |
| 122 | `spells-plus-review-journey.js`       | 10            | FAIL     | PASS    | riga 3 (misura aggiornata)          |
| 123 | `travel-journey.js`                   | 12            | PASS     | PASS    |                                     |
| 124 | `travel-review-journey.js`            | 8             | PASS     | PASS    |                                     |
| 125 | `w2a1-shell-journey.js`               | 7             | PASS     | PASS    |                                     |
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
| 140 | `p1-cross-tab-journey.js`             | 2             | FAIL     | PASS    | riga 4 (corsa nel percorso)         |
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
| 154 | `p6-map-movement-journey.js`          | 7             | PASS     | PASS    |                                     |
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
| 188 | `residuals-b-journey.js`              | 4             | FAIL     | PASS    | riga 5 (dadi casuali nel percorso)  |

188/188 PASS in `final`, 1519 esiti `passed`.

## Limiti

- Chromium di Playwright su macOS soltanto, dati sintetici, nessun dispositivo reale; i percorsi
  «telefono» usano i loro contesti a 390 px (con il tocco dove il percorso lo chiede).
- I dadi digitali sono casuali: `residuals-b` ora gestisce il colpo su Livia, ma un giro verde
  non prova ogni combinazione di facce di tutti i percorsi.
- `p1-cross-tab`: la corsa è stata vista una volta (con due browser attivi insieme) e non si è
  ripetuta nelle 8 esecuzioni successive prima dell'aggiornamento (né nelle 4 dopo); la spiegazione (controllo e clic separati) si ricava dal registro
  dell'errore e dallo screenshot, non da una riproduzione forzata.
- Riga 2: che la scala della mappa della Preparazione sia cambiata con il passaggio visivo è
  un'inferenza (le coordinate con l'errore di arrotondamento sono misurate, la misura «prima» no).
  La tolleranza di 1 cm corregge il confronto qualunque sia la scala.
- Questa è una regressione dei percorsi esistenti: non è una nuova revisione visiva. Le consegne
  aperte del passaggio visivo (per esempio le etichette in maiuscolo trasformato che alcuni
  percorsi leggono, consegna 8 dell'area «table») restano dove le ha scritte il passaggio.
- Da riportare, fuori da questo compito: il README dei controlli e `DEVELOPMENT.md` non hanno
  ancora un paragrafo su questa regressione (le due regole cambiate: `mergeSavedRolls` prende il
  tiro più recente del registro; la portata delle porte tollera 1 cm).

## File cambiati

- `design/blueprint/combat-tracker-domain.mjs` — `mergeSavedRolls`: il tiro salvato entra solo se
  è più recente, nel registro, di quello della riga.
- `design/blueprint/table-spatial.mjs` — `REACH_TOLERANCE_METERS` (1 cm) in
  `previewDoorInteraction`.
- `design/blueprint/tests/visual-regression.test.mjs` — nuovo, 4 test (rossi prima delle
  correzioni, verdi dopo).
- `changes/interview-01/blueprint-checks/spells-plus-review-journey.js`,
  `p1-cross-tab-journey.js`, `residuals-b-journey.js` — aggiornati con un commento datato
  30/09/2026.
- Questo rapporto.

## Come ripetere

Dalla cartella delle prove (fuori dal repository), con il server acceso:

```sh
cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-29/visual/regress
playwright-cli -s=d20-visual-regress open http://127.0.0.1:8879/
TAG=final nohup scripts/run.sh $(cat scripts/order.txt) > logs/final.out 2>&1 &
python3 scripts/table.py final sweep1
```

`scripts/prep.sh` copia ogni percorso, sposta le sue cartelle d'uscita in `runs/<nome>/` e lo
avvolge (errore, ultimi passi, uno screenshot per pagina); `scripts/run.sh` esegue un percorso per
comando con un allarme di 200 s; `scripts/verdict.py` decide PASS/FAIL come nel round 2 (errori,
`findings`, `result: "FAIL"`, rifiuto della CLI o risposta vuota sono rossi). `probe/` è lo stesso
runner nella sessione `d20-visual-probe`; `probe/debug/` contiene le sonde citate sopra. Risultati:
`results-sweep1.txt`, `results-final.txt`, `table-final.md`; suite Node: `logs/node-1.log`,
`logs/node-final.log`.
