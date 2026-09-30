# B61 — Regressione completa dopo la nuova struttura del Tavolo: prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · sessione browser `d20-b61-regress` · server `http://127.0.0.1:8879/` senza cache
· cartella delle prove `~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B61-regress/` (fuori
dal checkout). Solo dati sintetici. Ruolo: esecutore della regressione dopo B61 (costruzione e
revisione in [blueprint-table-structure-evidence.md](blueprint-table-structure-evidence.md)).

## In breve

- **Test Node:** `node --test design/blueprint/tests/*.test.mjs` **1348/1348** all'inizio e alla
  fine (erano 1343 al rapporto di B61: nel frattempo altri hanno aggiunto test). Log:
  `node-suite-run1.log`, `node-suite-final.log`.
- **Percorsi nel browser:** tutti gli **88** script di `blueprint-checks/`, in sequenza nella stessa
  sessione. Ultimo giro completo (`final2`): **88/88 verdi, 736 esiti `passed`**, nessun errore di
  pagina, nessun `findings` o `errors` non vuoto.
- **Nessuna regressione dell'app.** Tre percorsi si rompevano per deriva: `w1b-shell` e `core`
  per la nuova collocazione di B61; `b11b-inc10-fixes` per un conflitto tra la sua sonda e l'area
  B18 già costruita, e poi per il Registro spostato da B61. Li ho aggiornati in modo minimo,
  senza togliere asserzioni. Nessun file dell'app è cambiato.
- **Ordine del README:** `spatial-mobile` (n. 18) va eseguito subito dopo `spatial` (n. 16),
  prima di `approach` (n. 17). Era già noto a B61; ora è scritto nel README.

## Giri eseguiti

| Giro             | Cosa                                                                                                       | Esito                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `run1` / `run1b` | primo passaggio, a blocchi, nell'ordine del README (1–54) e poi i percorsi d'area W1a/W1b (B12–B60, W1b)   | 85 verdi; rossi `spatial-mobile` (ordine), `b11b-inc10-fixes`, `w1b-shell`. `run1b`: spatial → spatial-mobile → approach, verdi |
| `run2` / `run3`  | `b11b-inc10-fixes` e `w1b-shell` dopo ciascuna correzione                                                  | `b11b` si ferma poi al passo 8 (`run2`, 7 passi verdi), verde a `run3`; dopo Prettier entrambi verdi (`run2`, seconda riga)     |
| `final`          | tutti gli 88 in sequenza (`scripts/order.txt`)                                                             | 87/88: `core` rosso (vedi sotto, caso 3)                                                                                        |
| `final2`         | tutti gli 88 di nuovo, partendo dallo stato «sporco» lasciato da `final` (Registro ricordato per entrambi) | **88/88**                                                                                                                       |

## Cosa si rompeva e cosa ho cambiato

Per ogni rosso ho riprodotto la causa con una sonda (`scripts/probe-*.js`) prima di toccare
qualcosa. Tutti e quattro sono deriva dei percorsi, non difetti del prodotto.

| #   | Percorso                                       | Sintomo                                                                                                                               | Causa (verificata)                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Correzione nel percorso                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `b11b-inc10-fixes-journey.js`, passo 1         | Ctrl+Maiusc+J sulla Home non mostra il rifiuto: timeout su `#toast.shown.error`. Già rosso nel giro di B61 («da verificare a parte»). | Non è B61. L'area sonda `fix-probe` sostituisce lo strumento del core `measure` (`replaces: true`). Dall'ondata W1a l'area B18 (`annotations.mjs`) sostituisce già `measure` e `pointer`, gli unici due strumenti del core sostituibili. Il registro rifiuta la seconda sostituzione («table-tool "measure" is already registered»), come da progetto: l'intera sonda risulta «con errori» e i suoi comandi non esistono. In Node, senza B18, la stessa sonda si registra (8 contributi). | Le pagine che caricano `?fixture=…fix-probe` ricevono `annotations.mjs` come 404 (area «da costruire»), tramite `page.route` sulla sola cornice con quel parametro; tutte le altre pagine del percorso tengono B18. Asserzioni invariate: il passo 6 verifica ancora il chip sostituito «Righello». |
| 1b  | `b11b-inc10-fixes-journey.js`, passo 8         | Timeout su `getByRole('button', {name: 'Registro'})` nel Tavolo del DM a 390.                                                         | B61: il Registro non è più un pulsante in alto ma la seconda scheda della barra laterale (sul telefono la barra delle schede in basso).                                                                                                                                                                                                                                                                                                                                                   | «Registro» si cerca come `tab`; stesso controllo: dentro 0–390 px. Riposi e Tempo restano pulsanti in alto e restano controllati.                                                                                                                                                                   |
| 2   | `w1b-shell-journey.js`, passo 5 (390, EN e IT) | «header service home-help not visible» al Tavolo.                                                                                     | B61: al Tavolo, sul telefono, Aiuto è nel menu App (lo verifica anche `b61-table-structure`). Il controllo guardava l'intestazione mentre era già al Tavolo.                                                                                                                                                                                                                                                                                                                              | Campanella, Account e Aiuto: verificati visibili nell'intestazione della Home. Al Tavolo: campanella e Account nell'intestazione, Aiuto nel menu App (`[data-jump-service="home-help"]`). Il controllo è più largo di prima, non più stretto.                                                       |
| 3   | `core-journey.js`, all'inizio (giro `final`)   | Timeout su «Inventario» al Tavolo. Nei giri a browser nuovo era verde.                                                                | B61 ricorda l'ultima scheda della barra laterale per identità su questo dispositivo (`d20-studio-table-sidebar`, come Foundry). Il percorso azzerava solo lo stato della demo, non quel ricordo: dopo altri percorsi il giocatore ritrovava «Registro e chat» e il pulsante Inventario (scheda Creatura) non era a schermo. Sonda: `{"player":{"tab":"log"},"dm":{"tab":"log"}}`.                                                                                                         | L'azzeramento iniziale toglie anche `d20-studio-table-sidebar`, come fa «Ripristina esempio» nel prodotto (`resetTableView({ forget: true })`). Verificato in `final2`, partito proprio con Registro ricordato: 13/13.                                                                              |
| 4   | `spatial-mobile-journey.js`                    | «Run spatial journey first».                                                                                                          | Precondizione dello script: vuole il movimento e l'azione pieni di Livia, che `approach` spende. Il README li numerava 17 (approach) e 18 (spatial-mobile).                                                                                                                                                                                                                                                                                                                               | Nessuna modifica allo script. Nota nel README; `order.txt` esegue 16 → 18 → 17.                                                                                                                                                                                                                     |

Perché non sono regressioni dell'app: in 1 il registro fa esattamente quello che prevede
(contributo duplicato → area isolata e segnalata, il resto funziona); in 1b, 2 e 3 il prodotto fa
quello che B61 ha voluto e revisionato (Registro come scheda, Aiuto nel menu App sul telefono,
scheda ricordata per identità); in 4 è l'ordine di esecuzione.

## Percorso → passi → esito

«Passi» = esiti `passed` dell'ultimo giro (`final2`); per i due percorsi che restituiscono un
testo sono le righe. «Primo giro» = `run1`, con le riesecuzioni indicate da «→».

| #   | Percorso                              | Gruppo    | Passi (final2) | Primo giro         | `final` | `final2` | Note                                                                |
| --- | ------------------------------------- | --------- | -------------- | ------------------ | ------- | -------- | ------------------------------------------------------------------- |
| 1   | `core-journey.js`                     | README 1  | 13             | PASS               | FAIL    | PASS     | giro final FAIL (scheda Registro ricordata); percorso aggiornato    |
| 2   | `preparation-journey.js`              | README 2  | 9              | PASS               | PASS    | PASS     |                                                                     |
| 3   | `gestures-and-views.js`               | README 3  | 8              | PASS               | PASS    | PASS     |                                                                     |
| 4   | `back-guard-journey.js`               | README 4  | 4              | PASS               | PASS    | PASS     |                                                                     |
| 5   | `measure-journey.js`                  | README 5  | 2              | PASS               | PASS    | PASS     |                                                                     |
| 6   | `visual-fixes-journey.js`             | README 6  | 5              | PASS               | PASS    | PASS     |                                                                     |
| 7   | `combat-journey.js`                   | README 7  | 10             | PASS               | PASS    | PASS     |                                                                     |
| 8   | `area-journey.js`                     | README 8  | 8              | PASS               | PASS    | PASS     |                                                                     |
| 9   | `multi-self-journey.js`               | README 9  | 6              | PASS               | PASS    | PASS     |                                                                     |
| 10  | `combat-mobile-journey.js`            | README 10 | 10             | PASS               | PASS    | PASS     |                                                                     |
| 11  | `encounter-lifecycle.js`              | README 11 | 11             | PASS               | PASS    | PASS     |                                                                     |
| 12  | `reactions-journey.js`                | README 12 | 8              | PASS               | PASS    | PASS     |                                                                     |
| 13  | `concentration-journey.js`            | README 13 | 10             | PASS               | PASS    | PASS     |                                                                     |
| 14  | `simultaneous-reactions-journey.js`   | README 14 | 6              | PASS               | PASS    | PASS     |                                                                     |
| 15  | `new-npc-reaction-journey.js`         | README 15 | 4              | PASS               | PASS    | PASS     |                                                                     |
| 16  | `spatial-journey.js`                  | README 16 | 8              | PASS               | PASS    | PASS     |                                                                     |
| 17  | `spatial-mobile-journey.js`           | README 18 | 6              | FAIL → PASS        | PASS    | PASS     | 1° giro: FAIL per ordine (dopo approach); verde subito dopo spatial |
| 18  | `approach-journey.js`                 | README 17 | 7              | PASS → PASS        | PASS    | PASS     | rieseguito dopo spatial-mobile                                      |
| 19  | `builder-journey.js`                  | README 19 | 5              | PASS               | PASS    | PASS     |                                                                     |
| 20  | `builder-advance-journey.js`          | README 20 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 21  | `builder-reconstruction-journey.js`   | README 21 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 22  | `builder-dice-journey.js`             | README 22 | 5              | PASS               | PASS    | PASS     |                                                                     |
| 23  | `builder-recovery-journey.js`         | README 23 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 24  | `library-journey.js`                  | README 24 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 25  | `library-builder-journey.js`          | README 25 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 26  | `library-files-journey.js`            | README 26 | 2              | PASS               | PASS    | PASS     |                                                                     |
| 27  | `library-mobile-journey.js`           | README 27 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 28  | `library-spell-recovery-journey.js`   | README 28 | 2              | PASS               | PASS    | PASS     |                                                                     |
| 29  | `library-import-recovery-journey.js`  | README 29 | 2              | PASS               | PASS    | PASS     |                                                                     |
| 30  | `campaign-notes-journey.js`           | README 30 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 31  | `campaign-world-journey.js`           | README 31 | 2              | PASS               | PASS    | PASS     |                                                                     |
| 32  | `campaign-sessions-journey.js`        | README 32 | 2              | PASS               | PASS    | PASS     |                                                                     |
| 33  | `campaign-sharing-journey.js`         | README 33 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 34  | `campaign-mobile-journey.js`          | README 34 | 2              | PASS               | PASS    | PASS     |                                                                     |
| 35  | `campaign-integration-journey.js`     | README 35 | 2              | PASS               | PASS    | PASS     |                                                                     |
| 36  | `rest-shared-journey.js`              | README 36 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 37  | `rest-time-journey.js`                | README 37 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 38  | `rest-mobile-personal-journey.js`     | README 38 | 4              | PASS               | PASS    | PASS     |                                                                     |
| 39  | `rest-reversed-journey.js`            | README 39 | 1              | PASS               | PASS    | PASS     |                                                                     |
| 40  | `companion-map-journey.js`            | README 40 | 2              | PASS               | PASS    | PASS     |                                                                     |
| 41  | `forms-journey.js`                    | README 41 | 2              | PASS               | PASS    | PASS     |                                                                     |
| 42  | `familiar-journey.js`                 | README 42 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 43  | `forms-mobile-journey.js`             | README 43 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 44  | `companion-personal-journey.js`       | README 44 | 2              | PASS               | PASS    | PASS     |                                                                     |
| 45  | `conditions-journey.js`               | README 45 | 11             | PASS               | PASS    | PASS     |                                                                     |
| 46  | `conditions-death-journey.js`         | README 46 | 7              | PASS               | PASS    | PASS     |                                                                     |
| 47  | `dice-correction-journey.js`          | README 47 | 7              | PASS               | PASS    | PASS     |                                                                     |
| 48  | `conditions-mobile-journey.js`        | README 48 | 3              | PASS               | PASS    | PASS     |                                                                     |
| 49  | `conditions-fixes-journey.js`         | README 49 | 7              | PASS               | PASS    | PASS     |                                                                     |
| 50  | `conditions-badges-journey.js`        | README 50 | 2              | PASS               | PASS    | PASS     |                                                                     |
| 51  | `registry-smoke-journey.js`           | README 51 | 18             | PASS               | PASS    | PASS     |                                                                     |
| 52  | `b11b-inc10-fixes-journey.js`         | README 52 | 11             | FAIL → FAIL → PASS | PASS    | PASS     | percorso aggiornato (fix-probe × B18; Registro come scheda)         |
| 53  | `b61-table-structure-journey.js`      | README 53 | 6              | PASS               | PASS    | PASS     |                                                                     |
| 54  | `b61-review-fixes-journey.js`         | README 54 | 6              | PASS               | PASS    | PASS     |                                                                     |
| 55  | `token-menu-journey.js`               | B12       | 19             | PASS               | PASS    | PASS     |                                                                     |
| 56  | `campaign-members-journey.js`         | B13       | 15             | PASS               | PASS    | PASS     |                                                                     |
| 57  | `campaign-members-review-journey.js`  | B13       | 11             | PASS               | PASS    | PASS     |                                                                     |
| 58  | `campaign-members-review2-journey.js` | B13       | 9              | PASS               | PASS    | PASS     |                                                                     |
| 59  | `session-view-journey.js`             | B14       | 15             | PASS               | PASS    | PASS     |                                                                     |
| 60  | `handouts-journey.js`                 | B15       | 15             | PASS               | PASS    | PASS     |                                                                     |
| 61  | `compendium-journey.js`               | B16       | 15             | PASS               | PASS    | PASS     |                                                                     |
| 62  | `chat-journey.js`                     | B17       | 13             | PASS               | PASS    | PASS     |                                                                     |
| 63  | `chat-review-fixes-journey.js`        | B17       | 11             | PASS               | PASS    | PASS     |                                                                     |
| 64  | `annotations-journey.js`              | B18       | 11             | PASS               | PASS    | PASS     |                                                                     |
| 65  | `annotations-review-fixes-journey.js` | B18       | 10             | PASS               | PASS    | PASS     |                                                                     |
| 66  | `encounter-builder-journey.js`        | B19       | 12             | PASS               | PASS    | PASS     |                                                                     |
| 67  | `campaign-settings-journey.js`        | B20       | 15             | PASS               | PASS    | PASS     |                                                                     |
| 68  | `character-library-journey.js`        | B21       | 17             | PASS               | PASS    | PASS     |                                                                     |
| 69  | `character-library-review-journey.js` | B21       | 10             | PASS               | PASS    | PASS     |                                                                     |
| 70  | `preferences-journey.js`              | B22       | 14             | PASS               | PASS    | PASS     |                                                                     |
| 71  | `command-palette-journey.js`          | B23       | 13             | PASS               | PASS    | PASS     | restituisce testo: righe contate                                    |
| 72  | `notifications-journey.js`            | B24       | 25             | PASS               | PASS    | PASS     |                                                                     |
| 73  | `random-tables-journey.js`            | B25       | 24             | PASS               | PASS    | PASS     | restituisce testo: righe contate                                    |
| 74  | `loot-journey.js`                     | B26       | 12             | PASS               | PASS    | PASS     |                                                                     |
| 75  | `loot-review-journey.js`              | B26       | 7              | PASS               | PASS    | PASS     |                                                                     |
| 76  | `loot-review2-journey.js`             | B26       | 6              | PASS               | PASS    | PASS     |                                                                     |
| 77  | `safety-journey.js`                   | B27       | 17             | PASS               | PASS    | PASS     |                                                                     |
| 78  | `media-journey.js`                    | B28       | 13             | PASS               | PASS    | PASS     |                                                                     |
| 79  | `media-review-journey.js`             | B28       | 13             | PASS               | PASS    | PASS     |                                                                     |
| 80  | `media-review2-journey.js`            | B28       | 7              | PASS               | PASS    | PASS     |                                                                     |
| 81  | `account-journey.js`                  | B29       | 10             | PASS               | PASS    | PASS     |                                                                     |
| 82  | `home-journey.js`                     | B30       | 13             | PASS               | PASS    | PASS     |                                                                     |
| 83  | `dice-3d-journey.js`                  | B56       | 18             | PASS               | PASS    | PASS     |                                                                     |
| 84  | `community-journey.js`                | B59       | 22             | PASS               | PASS    | PASS     |                                                                     |
| 85  | `assistant-journey.js`                | B60       | 14             | PASS               | PASS    | PASS     |                                                                     |
| 86  | `assistant-review-fixes.js`           | B60       | 11             | PASS               | PASS    | PASS     |                                                                     |
| 87  | `assistant-review-fixes-2.js`         | B60       | 9              | PASS               | PASS    | PASS     |                                                                     |
| 88  | `w1b-shell-journey.js`                | W1b       | 6              | FAIL → PASS        | PASS    | PASS     | percorso aggiornato (Aiuto nel menu App al Tavolo)                  |

Totale `final2`: 88 percorsi, 736 esiti `passed`, 0 rossi. Risultati per giro in
`results-<giro>.txt`; JSON per percorso in `runs/<percorso>/<giro>.json`; immagini dei percorsi in
`runs/<percorso>/`.

## Metodo

Stesso metodo degli integratori W1a/W1b e della revisione B61
([blueprint-w1b-integration.md](blueprint-w1b-integration.md)): le prove dei costruttori non
vengono sovrascritte.

- `scripts/prep.sh <percorso>` copia lo script del checkout e reindirizza ogni cartella di prove
  (`2026-09-23/`, `B*`, `inc10-closure`, `maint`, `W1a/W1b-integ`) in `runs/<percorso>/`; copia i
  file d'ingresso (mappa non valida, JSON della Biblioteca, immagini di B13/B17/B29); avvolge lo
  script così che un errore restituisca il messaggio, gli ultimi passi verdi e una schermata per
  pagina. Rispetto alla revisione B61 aggiunge `maint` al reindirizzamento e fa leggere a
  `library-import-recovery` l'esportazione scaricata da `library-files` nello stesso giro.
- `scripts/run.sh` esegue in sequenza nella sessione `d20-b61-regress`; `scripts/verdict.py`
  segna rosso ogni `FAILED`, `errors`/`findings`/`pageErrors` non vuoti o `ok: false`.
- Riproduzione, dalla cartella delle prove:

```sh
playwright-cli -s=d20-b61-regress open http://127.0.0.1:8879/
TAG=final2 scripts/run.sh $(cat scripts/order.txt)
```

## File toccati

Nel checkout, solo percorsi e documenti (nessun file dell'app):

- `changes/interview-01/blueprint-checks/b11b-inc10-fixes-journey.js` (casi 1 e 1b)
- `changes/interview-01/blueprint-checks/w1b-shell-journey.js` (caso 2)
- `changes/interview-01/blueprint-checks/core-journey.js` (caso 3)
- `changes/interview-01/blueprint-checks/README.md`: nota sull'ordine 16 → 18 → 17 e paragrafo su
  questa regressione
- questo documento

I tre script sono passati per Prettier (`--write`); poi ho tolto il `;` finale che Prettier
aggiunge attorno all'espressione, perché la CLI lo rifiuta (README). Differenza residua rispetto
a Prettier: solo quel `;`. Per `b11b-inc10-fixes` e `core` Prettier ha riformattato l'intero file
(prima erano compatti): cambia solo la forma.

Fuori dal checkout, in `…/2026-09-24/B61-regress/`: `scripts/` (copie, `prep.sh`, `run.sh`,
`verdict.py`, `order.txt`, sonde), `runs/`, `results-*.txt`, `final*.log`, `node-suite-*.log`.

## Aperti e osservazioni

- **Due aree non possono sostituire lo stesso strumento del core.** Il piano (§2.3, «Un solo
  sostituto per id») assegna già `measure` e `pointer` a B18. Un'area futura che li sostituisse
  (per esempio un righello diverso) verrebbe isolata per intero, come la sonda di B11b: deve
  aggiungere uno strumento al gruppo «Misura e sagome», non sostituire. Nessun cambiamento
  necessario; lo segnalo perché la sonda di B11b era stata scritta prima di B18.
- **Il ricordo della scheda sopravvive agli azzeramenti parziali.** Solo «Ripristina esempio» lo
  cancella. È voluto (B61), ma ogni percorso che azzera togliendo solo `d20-studio-blueprint-v1` e
  poi cerca un comando della scheda Creatura dipende dall'ordine. In questi due giri completi
  l'unico colpito era `core`; altri potrebbero esserlo con un ordine diverso.
- **26 risposte 404** al caricamento: una per area pianificata non costruita, per progetto (B11).
- Il test Node instabile segnalato da B61 (`loot.test.mjs`, «INV-10 review») non si è presentato
  nei due giri completi.
