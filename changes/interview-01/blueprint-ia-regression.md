# Regressione completa dopo W2b1 e il consolidamento IA (B62): prove

26/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · sessioni browser `d20-ia-regress` (percorsi) e `d20-ia-probe` (sonde) · server
`http://127.0.0.1:8879/` senza cache · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-26/IA-regress/` (fuori dal checkout; le
cartelle dei costruttori non sono toccate). Solo dati sintetici. Ruolo: esecutore della
regressione dopo l'integrazione di W2b1 ([rapporto](blueprint-w2b1-integration.md)) e il
consolidamento IA con la sua revisione ([rapporto](blueprint-ia-consolidation-evidence.md)).

## In breve

- **Test Node:** `node --test design/blueprint/tests/*.test.mjs` **2063/2063** all'inizio (non
  2042: il numero del compito era precedente alla revisione di B62) e **2068/2068** alla fine,
  con i 5 test nuovi di questa regressione. Log: `node-run1.log`, `node-final.tap`.
- **Percorsi nel browser:** tutti i **133** script di `blueprint-checks/`, uno per comando, in
  sequenza nella stessa sessione, ciascuno limitato da un allarme di 240 s. Primo giro
  (`sweep1`): **127/133 verdi**. Giro finale (`final`), sul codice e sugli script finali:
  **133/133 verdi, 1216 esiti `passed`**, nessun errore di pagina, nessun `errors`, `findings`
  o `pageErrors` non vuoto.
- **I 6 rossi erano quelli già lasciati aperti da B62** («Non B62, da assegnare»). Li ho
  riprodotti uno per uno e divisi così:
  - **2 regressioni reali dell'app**, corrette partendo da test rossi: la scheda allargava la
    pagina sul telefono con testo 150 % e interfaccia 125 % (`preferences`); i tiri del vassoio
    dei dadi (B34) non arrivavano come tiri all'inoltro Discord né al canale Avrae (B55), che li
    trattava come righe del registro (`integrations`).
  - **4 derive dei percorsi** rispetto ai dati di esempio di W2b1/W2b2 (`homebrew-editor`,
    `quests`, `travel`, `party`) e una quinta nello stesso `integrations` (il tiro ora si fa
    nel vassoio). Aggiornati in modo minimo, senza togliere asserzioni.
- **Nessun'altra deriva:** gli altri 127 percorsi, compresi `b62-ia` e `b62-review-fixes`, erano
  verdi già al primo giro.

## Giri eseguiti

| Giro          | Cosa                                                                                                           | Esito                                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sweep1`      | i 133 percorsi in `scripts/order.txt` (ordine del README; 18 prima di 17; `measure` dopo `gestures-and-views`) | 127/133; rossi `preferences`, `homebrew-editor`, `integrations`, `party`, `quests`, `travel`                                                                                                 |
| `fix1`–`fix8` | un percorso per volta dopo ciascuna correzione                                                                 | `preferences` 14, `homebrew-editor` 12, `quests` 21, `travel` 12, `party` 9, `integrations` 9 (a `fix8`: `fix6` e `fix6b` mostravano il canale Avrae vuoto, `fix7` la scheda Dadi ricordata) |
| `final`       | di nuovo tutti i 133, nello stesso ordine, sul codice finale                                                   | **133/133**, 1216 esiti `passed`                                                                                                                                                             |

Script di esecuzione (fuori dal repository): `scripts/prep.sh` copia un percorso, reindirizza le
sue immagini in `runs/<percorso>/` e lo avvolge in modo che un errore restituisca il messaggio,
gli ultimi passi verdi e una schermata per pagina; `scripts/run.sh` lo esegue con
`perl -e 'alarm 240'` (macOS non ha `timeout`) e scrive una riga in `results-<giro>.txt`;
`scripts/verdict.py` legge l'esito (`FAILED`, `failed`, `errors`, `findings`, `ok:false`, …).
Stesso metodo degli integratori di W1a, W1b, B61 e W2.

## Cosa si rompeva e cosa ho cambiato

Per ogni rosso ho letto l'errore restituito, la schermata e, dove serviva, una sonda
(`probes/*.js`) prima di toccare qualcosa.

| #   | Percorso          | Sintomo (`sweep1`)                                                                                       | Causa (verificata)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Tipo                           | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `preferences`     | «overflow at 390 with 150% text + 125% interface»: Azioni e Storia della scheda di Livia, giocatore e DM | Sonde `probes/chain-390*.js`, `mincontent-390.js`: `.character-tab-content` è una griglia con una traccia automatica, che cresce fino al contenuto minimo più largo tra i suoi figli (tabella delle azioni generiche di B40, righe dei tiri di B34, menu della reputazione di B43): 437 px in Azioni, 423 in Storia, su 390. Tolta quella, restavano la griglia delle azioni generiche di B37 (`minmax(300px, 1fr)`, cioè 375 px al 125 % in un pannello di 337) e l'intestazione delle note di B37 («Organizzazioni» + «Aggiungi», 371 px). | **Regressione (app)**          | `characters.css`: `grid-template-columns: minmax(0, 1fr)`. `sheet-plus.css`: `.shp-generic` con `minmax(min(300px, 100%), 1fr)` (la griglia adattiva standard; le preferenze scalano ancora i 300 px) e `.shp-note-head` con `flex-wrap: wrap` (come la scheda fa già sotto i 720 px). Dopo: larghezza della pagina 390 in Azioni e Storia (`probes/chain-390-after.json`, `shots/`).                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2   | `integrations`    | prima il timeout sulla finestra del tiro libero; con il vassoio, «Avrae channel content» (canale vuoto)  | Deriva: da W2b1 «Tira i dadi» apre il vassoio di B34, non la finestra del tiro libero. Regressione: il vassoio scrive nel registro una riga di sola etichetta («Livia · 1d20 + 3: [14] + 3 = 17 · dado fisico»); la chat (B17) la riconosce come tiro (`rollFor`, integrazione W2b1), l'inoltro di B55 no. Prova senza la correzione (sonda Node): nel canale Discord la riga era un «event» sotto «Eventi del registro», su Avrae (solo tiri) **niente**, e i tiri nascosti comparivano come righe («Livia · tiro per sé e per il DM»).     | **Regressione (app)** + deriva | App: `integrations-domain.mjs` `logItems(…, rollFor)` e `relayPreview(…, { rollFor })`; `integrations.mjs` `trayRollFor(ctx)` (lo stesso abbinamento per `logLabel` della chat, senza dipendere da chi guarda) e `neighboursReady` (import dinamico: senza B34 resta tutto come prima). Un tiro pubblico del vassoio è un tiro (formato dell'inoltro «Livia · Tiro libero: 1d20 [14] + 3 = 17 · dadi fisici», interruttore «Tiri pubblici», canale Avrae); «Solo DM», alla cieca e «Solo io» restano fuori e si contano per chi li possiede; uno ritirato è segnato come annullato. Percorso: il tiro si fa nel vassoio (la finestra resta la riserva) e, prima della riga dell'ispettore, si riapre la scheda Creatura (B61 ricorda la scheda Dadi per identità). Le attese del testo inoltrato sono tornate **identiche** all'originale. |
| 3   | `homebrew-editor` | Termina turno resta fermo sulla Sentinella (timeout)                                                     | Deriva: il percorso porta la Sentinella in (420, 380); B41 (W2b2) ha messo lì una lastra a pressione nascosta (400–450 × 350–410). Entrarci crea un evento «decide il DM» che, come B41 prevede, blocca il turno della creatura finché non è risolto (schermata: «Sentinella · Evento della scena: decide il DM · In attesa»).                                                                                                                                                                                                               | Deriva (dati)                  | La Sentinella va in (420, 300): sempre 5,6 m da Livia, fuori dalla lastra e dalla fontana di B40. Asserzioni invariate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 4   | `quests`          | «Coins not in Livia's purse» (attesi 50 mo)                                                              | Deriva: B36 dà a Livia 30 mo nei dati di esempio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Deriva (dati)                  | Si legge la borsa prima della consegna e si attende quella + 50 (30 + 50 = 80), anche sulla scheda («80 mo»).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 5   | `travel`          | «mangia una razione»: attesa una riga con quantità 1                                                     | Deriva: B36 dà a Livia altre 4 razioni nello zaino.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Deriva (dati)                  | Si contano tutte le righe di Razioni: prima 6, dopo 5, e la scheda dice «Razioni: 5 (5 giorni di cibo)».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 6   | `party`           | «Bastion does not show Iria's coins» (attese 0 mo)                                                       | Deriva: B38 dà a Iria 150 mo nei dati di esempio, quindi l'ordine rifiutato a 0 mo non si poteva più provare.                                                                                                                                                                                                                                                                                                                                                                                                                                | Deriva (dati)                  | Il Bastione mostra le 150 mo di Iria (asserzione nuova); poi il giocatore svuota la borsa con «Correggi monete» di B26 (comando vero, con motivo) e il percorso prosegue identico: 0 mo, ordine rifiutato, 40 → 15 → 10 mo. Niente dati iniettati.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Perché 3–6 non sono regressioni: il prodotto fa quello che le ondate hanno voluto e revisionato
(la trappola di B41 che ferma il turno è la regola dichiarata di `triggerRegion`; le monete e le
razioni sono dati di esempio di B36/B38). Perché 1 e 2 lo sono: una persona con testo e
interfaccia al massimo sul telefono doveva scorrere la scheda di lato; un DM che collega Avrae non
vedeva arrivare nessun tiro fatto dal Tavolo, e i tiri pubblici finivano sotto l'interruttore
sbagliato.

## Correzioni dell'app, dai test

- `tests/phone-scale-fit.test.mjs` (nuovo, 3 test, **rossi prima** delle modifiche): la traccia
  unica `minmax(0, 1fr)` di `.character-tab-content`; la griglia delle azioni generiche di B37 con
  `min(300px, 100%)`, e il valore scalato dalle preferenze che mantiene il limite del 100 %;
  l'intestazione delle note che va a capo.
- `tests/w2b1-integration.test.mjs`, sezione «B34 × B55» (2 test, **rossi prima**): un tiro
  pubblico del vassoio è un tiro nel canale Discord e su Avrae, nel formato dell'inoltro;
  l'interruttore «Tiri pubblici» lo governa; ritirato con «Ritira» resta segnato come annullato;
  l'anteprima disegnata del DM lo mostra come messaggio di tiro. I tiri «Solo DM», alla cieca e
  «Solo io» non arrivano a nessun canale e contano per chi li possiede (il giocatore 1, il DM 2).
- Verifica nel browser: `preferences` 14/14 e `integrations` 9/9 (gruppo 9 compreso: conteggi
  privati, rimozione del webhook, pause senza recupero, tema chiaro).

## Percorso → passi → esito

«Passi» = esiti `passed` del giro finale. `sweep1` = primo giro, prima di ogni modifica; tra
parentesi i passi che il verdetto contava al momento dell'errore (un percorso che si ferma con
`FAILED` restituisce solo gli ultimi passi, quindi spesso 0).

| #   | Percorso                              | Passi (final) | `sweep1` | `final` | Note                                                                                        |
| --- | ------------------------------------- | ------------- | -------- | ------- | ------------------------------------------------------------------------------------------- |
| 1   | `core-journey.js`                     | 13            | PASS     | PASS    |                                                                                             |
| 2   | `preparation-journey.js`              | 9             | PASS     | PASS    |                                                                                             |
| 3   | `gestures-and-views.js`               | 8             | PASS     | PASS    |                                                                                             |
| 4   | `back-guard-journey.js`               | 4             | PASS     | PASS    |                                                                                             |
| 5   | `measure-journey.js`                  | 2             | PASS     | PASS    |                                                                                             |
| 6   | `visual-fixes-journey.js`             | 5             | PASS     | PASS    |                                                                                             |
| 7   | `combat-journey.js`                   | 10            | PASS     | PASS    |                                                                                             |
| 8   | `area-journey.js`                     | 8             | PASS     | PASS    |                                                                                             |
| 9   | `multi-self-journey.js`               | 6             | PASS     | PASS    |                                                                                             |
| 10  | `combat-mobile-journey.js`            | 10            | PASS     | PASS    |                                                                                             |
| 11  | `encounter-lifecycle.js`              | 11            | PASS     | PASS    |                                                                                             |
| 12  | `reactions-journey.js`                | 8             | PASS     | PASS    |                                                                                             |
| 13  | `concentration-journey.js`            | 10            | PASS     | PASS    |                                                                                             |
| 14  | `simultaneous-reactions-journey.js`   | 6             | PASS     | PASS    |                                                                                             |
| 15  | `new-npc-reaction-journey.js`         | 4             | PASS     | PASS    |                                                                                             |
| 16  | `spatial-journey.js`                  | 8             | PASS     | PASS    |                                                                                             |
| 17  | `spatial-mobile-journey.js`           | 6             | PASS     | PASS    |                                                                                             |
| 18  | `approach-journey.js`                 | 7             | PASS     | PASS    |                                                                                             |
| 19  | `builder-journey.js`                  | 5             | PASS     | PASS    |                                                                                             |
| 20  | `builder-advance-journey.js`          | 3             | PASS     | PASS    |                                                                                             |
| 21  | `builder-reconstruction-journey.js`   | 3             | PASS     | PASS    |                                                                                             |
| 22  | `builder-dice-journey.js`             | 5             | PASS     | PASS    |                                                                                             |
| 23  | `builder-recovery-journey.js`         | 3             | PASS     | PASS    |                                                                                             |
| 24  | `library-journey.js`                  | 3             | PASS     | PASS    |                                                                                             |
| 25  | `library-builder-journey.js`          | 3             | PASS     | PASS    |                                                                                             |
| 26  | `library-files-journey.js`            | 2             | PASS     | PASS    |                                                                                             |
| 27  | `library-mobile-journey.js`           | 3             | PASS     | PASS    |                                                                                             |
| 28  | `library-spell-recovery-journey.js`   | 2             | PASS     | PASS    |                                                                                             |
| 29  | `library-import-recovery-journey.js`  | 2             | PASS     | PASS    |                                                                                             |
| 30  | `campaign-notes-journey.js`           | 3             | PASS     | PASS    |                                                                                             |
| 31  | `campaign-world-journey.js`           | 2             | PASS     | PASS    |                                                                                             |
| 32  | `campaign-sessions-journey.js`        | 2             | PASS     | PASS    |                                                                                             |
| 33  | `campaign-sharing-journey.js`         | 3             | PASS     | PASS    |                                                                                             |
| 34  | `campaign-mobile-journey.js`          | 2             | PASS     | PASS    |                                                                                             |
| 35  | `campaign-integration-journey.js`     | 2             | PASS     | PASS    |                                                                                             |
| 36  | `rest-shared-journey.js`              | 3             | PASS     | PASS    |                                                                                             |
| 37  | `rest-time-journey.js`                | 3             | PASS     | PASS    |                                                                                             |
| 38  | `rest-mobile-personal-journey.js`     | 4             | PASS     | PASS    |                                                                                             |
| 39  | `rest-reversed-journey.js`            | 1             | PASS     | PASS    |                                                                                             |
| 40  | `companion-map-journey.js`            | 2             | PASS     | PASS    |                                                                                             |
| 41  | `forms-journey.js`                    | 2             | PASS     | PASS    |                                                                                             |
| 42  | `familiar-journey.js`                 | 3             | PASS     | PASS    |                                                                                             |
| 43  | `forms-mobile-journey.js`             | 3             | PASS     | PASS    |                                                                                             |
| 44  | `companion-personal-journey.js`       | 2             | PASS     | PASS    |                                                                                             |
| 45  | `conditions-journey.js`               | 11            | PASS     | PASS    |                                                                                             |
| 46  | `conditions-death-journey.js`         | 7             | PASS     | PASS    |                                                                                             |
| 47  | `dice-correction-journey.js`          | 7             | PASS     | PASS    |                                                                                             |
| 48  | `conditions-mobile-journey.js`        | 3             | PASS     | PASS    |                                                                                             |
| 49  | `conditions-fixes-journey.js`         | 7             | PASS     | PASS    |                                                                                             |
| 50  | `conditions-badges-journey.js`        | 2             | PASS     | PASS    |                                                                                             |
| 51  | `registry-smoke-journey.js`           | 18            | PASS     | PASS    |                                                                                             |
| 52  | `b11b-inc10-fixes-journey.js`         | 11            | PASS     | PASS    |                                                                                             |
| 53  | `b61-table-structure-journey.js`      | 6             | PASS     | PASS    |                                                                                             |
| 54  | `b61-review-fixes-journey.js`         | 6             | PASS     | PASS    |                                                                                             |
| 55  | `token-menu-journey.js`               | 19            | PASS     | PASS    |                                                                                             |
| 56  | `campaign-members-journey.js`         | 15            | PASS     | PASS    |                                                                                             |
| 57  | `campaign-members-review-journey.js`  | 11            | PASS     | PASS    |                                                                                             |
| 58  | `campaign-members-review2-journey.js` | 9             | PASS     | PASS    |                                                                                             |
| 59  | `session-view-journey.js`             | 15            | PASS     | PASS    |                                                                                             |
| 60  | `handouts-journey.js`                 | 15            | PASS     | PASS    |                                                                                             |
| 61  | `compendium-journey.js`               | 15            | PASS     | PASS    |                                                                                             |
| 62  | `chat-journey.js`                     | 13            | PASS     | PASS    |                                                                                             |
| 63  | `chat-review-fixes-journey.js`        | 11            | PASS     | PASS    |                                                                                             |
| 64  | `annotations-journey.js`              | 11            | PASS     | PASS    |                                                                                             |
| 65  | `annotations-review-fixes-journey.js` | 10            | PASS     | PASS    |                                                                                             |
| 66  | `encounter-builder-journey.js`        | 12            | PASS     | PASS    |                                                                                             |
| 67  | `campaign-settings-journey.js`        | 15            | PASS     | PASS    |                                                                                             |
| 68  | `character-library-journey.js`        | 17            | PASS     | PASS    |                                                                                             |
| 69  | `character-library-review-journey.js` | 10            | PASS     | PASS    |                                                                                             |
| 70  | `preferences-journey.js`              | 14            | FAIL (0) | PASS    | regressione app: scheda larga a 390 con 150 %/125 % (caso 1)                                |
| 71  | `command-palette-journey.js`          | 13            | PASS     | PASS    |                                                                                             |
| 72  | `notifications-journey.js`            | 25            | PASS     | PASS    |                                                                                             |
| 73  | `random-tables-journey.js`            | 24            | PASS     | PASS    |                                                                                             |
| 74  | `loot-journey.js`                     | 12            | PASS     | PASS    |                                                                                             |
| 75  | `loot-review-journey.js`              | 7             | PASS     | PASS    |                                                                                             |
| 76  | `loot-review2-journey.js`             | 6             | PASS     | PASS    |                                                                                             |
| 77  | `safety-journey.js`                   | 17            | PASS     | PASS    |                                                                                             |
| 78  | `media-journey.js`                    | 13            | PASS     | PASS    |                                                                                             |
| 79  | `media-review-journey.js`             | 13            | PASS     | PASS    |                                                                                             |
| 80  | `media-review2-journey.js`            | 7             | PASS     | PASS    |                                                                                             |
| 81  | `account-journey.js`                  | 10            | PASS     | PASS    |                                                                                             |
| 82  | `home-journey.js`                     | 13            | PASS     | PASS    |                                                                                             |
| 83  | `dice-3d-journey.js`                  | 18            | PASS     | PASS    |                                                                                             |
| 84  | `community-journey.js`                | 22            | PASS     | PASS    |                                                                                             |
| 85  | `assistant-journey.js`                | 14            | PASS     | PASS    |                                                                                             |
| 86  | `assistant-review-fixes.js`           | 11            | PASS     | PASS    |                                                                                             |
| 87  | `assistant-review-fixes-2.js`         | 9             | PASS     | PASS    |                                                                                             |
| 88  | `w1b-shell-journey.js`                | 6             | PASS     | PASS    |                                                                                             |
| 89  | `adventures-journey.js`               | 7             | PASS     | PASS    |                                                                                             |
| 90  | `builder-plus-journey.js`             | 20            | PASS     | PASS    |                                                                                             |
| 91  | `campaign-data-journey.js`            | 15            | PASS     | PASS    |                                                                                             |
| 92  | `combat-tracker-journey.js`           | 19            | PASS     | PASS    |                                                                                             |
| 93  | `combat-tracker-review-journey.js`    | 7             | PASS     | PASS    |                                                                                             |
| 94  | `damage-tray-journey.js`              | 11            | PASS     | PASS    |                                                                                             |
| 95  | `dice-tray-journey.js`                | 17            | PASS     | PASS    |                                                                                             |
| 96  | `dice-tray-review-journey.js`         | 11            | PASS     | PASS    |                                                                                             |
| 97  | `fog-vision-journey.js`               | 11            | PASS     | PASS    |                                                                                             |
| 98  | `fog-vision-review-journey.js`        | 5             | PASS     | PASS    |                                                                                             |
| 99  | `generators-journey.js`               | 11            | PASS     | PASS    |                                                                                             |
| 100 | `homebrew-editor-journey.js`          | 12            | FAIL (0) | PASS    | deriva: lastra a pressione di B41 sul punto d'arrivo (caso 3)                               |
| 101 | `homebrew-editor-review-journey.js`   | 5             | PASS     | PASS    |                                                                                             |
| 102 | `integrations-journey.js`             | 9             | FAIL (1) | PASS    | regressione app: inoltro dei tiri del vassoio (caso 2); percorso: vassoio e scheda Creatura |
| 103 | `inventory-plus-journey.js`           | 18            | PASS     | PASS    |                                                                                             |
| 104 | `inventory-plus-review-journey.js`    | 6             | PASS     | PASS    |                                                                                             |
| 105 | `knowledge-journey.js`                | 10            | PASS     | PASS    |                                                                                             |
| 106 | `knowledge-review-journey.js`         | 8             | PASS     | PASS    |                                                                                             |
| 107 | `offline-journey.js`                  | 9             | PASS     | PASS    |                                                                                             |
| 108 | `party-journey.js`                    | 9             | FAIL (0) | PASS    | deriva: 150 mo di Iria, svuotate con «Correggi monete» (caso 6)                             |
| 109 | `projects-journey.js`                 | 6             | PASS     | PASS    |                                                                                             |
| 110 | `quests-journey.js`                   | 21            | FAIL (5) | PASS    | deriva: borsa di Livia 30 mo (caso 4)                                                       |
| 111 | `quests-review-journey.js`            | 7             | PASS     | PASS    |                                                                                             |
| 112 | `quickbar-journey.js`                 | 9             | PASS     | PASS    |                                                                                             |
| 113 | `quickbar-review-journey.js`          | 6             | PASS     | PASS    |                                                                                             |
| 114 | `regions-journey.js`                  | 8             | PASS     | PASS    |                                                                                             |
| 115 | `relations-graph-journey.js`          | 11            | PASS     | PASS    |                                                                                             |
| 116 | `scene-assets-journey.js`             | 13            | PASS     | PASS    |                                                                                             |
| 117 | `scene-assets-review-journey.js`      | 9             | PASS     | PASS    |                                                                                             |
| 118 | `sessions-plus-journey.js`            | 15            | PASS     | PASS    |                                                                                             |
| 119 | `sheet-plus-journey.js`               | 21            | PASS     | PASS    |                                                                                             |
| 120 | `special-moves-journey.js`            | 22            | PASS     | PASS    |                                                                                             |
| 121 | `spells-plus-journey.js`              | 12            | PASS     | PASS    |                                                                                             |
| 122 | `spells-plus-review-journey.js`       | 10            | PASS     | PASS    |                                                                                             |
| 123 | `travel-journey.js`                   | 12            | FAIL (0) | PASS    | deriva: razioni di B36 (caso 5)                                                             |
| 124 | `travel-review-journey.js`            | 8             | PASS     | PASS    |                                                                                             |
| 125 | `w2a1-shell-journey.js`               | 7             | PASS     | PASS    |                                                                                             |
| 126 | `w2a2-shell-journey.js`               | 7             | PASS     | PASS    |                                                                                             |
| 127 | `w2b1-shell-journey.js`               | 8             | PASS     | PASS    |                                                                                             |
| 128 | `w2b2-cross-journey.js`               | 4             | PASS     | PASS    |                                                                                             |
| 129 | `w2b2-shell-journey.js`               | 7             | PASS     | PASS    |                                                                                             |
| 130 | `world-map-journey.js`                | 13            | PASS     | PASS    |                                                                                             |
| 131 | `world-map-review-journey.js`         | 7             | PASS     | PASS    |                                                                                             |
| 132 | `b62-ia-journey.js`                   | 10            | PASS     | PASS    |                                                                                             |
| 133 | `b62-review-fixes-journey.js`         | 7             | PASS     | PASS    |                                                                                             |

## File toccati

- App (`design/blueprint/`): `characters.css`, `sheet-plus.css`, `integrations.mjs`,
  `integrations-domain.mjs`.
- Test: `tests/phone-scale-fit.test.mjs` (nuovo), `tests/w2b1-integration.test.mjs`.
- Percorsi (`blueprint-checks/`): `homebrew-editor-journey.js`, `quests-journey.js`,
  `travel-journey.js`, `party-journey.js`, `integrations-journey.js`; `README.md` (paragrafo della
  regressione).
- Documenti: `design/blueprint/DEVELOPMENT.md` (inoltro B34 × B55 in «W2b1 integration», regola
  della scheda in «IA regression after W2b1 and B62»); questo rapporto. Prettier sui soli file
  cambiati.

## Limiti

- Dati sintetici, un solo browser senza interfaccia (Chrome di Playwright), nessuna prova con
  persone reali; l'inoltro Discord/Avrae resta una simulazione dichiarata (nessuna chiamata di
  rete: il percorso lo verifica).
- Le misure della scheda sul telefono sono della scheda di Livia con i dati di esempio; altre
  schede con contenuti più lunghi seguono la stessa regola ma non sono state misurate una per una.
- La correzione di `integrations` non cambia la chat (B17), che aveva già il suo abbinamento: i due
  abbinamenti per `logLabel` sono gemelli (quello dell'inoltro non dipende da chi guarda). Se in
  futuro servisse un terzo consumatore, conviene spostarli in `dice-tray-domain.mjs`.
