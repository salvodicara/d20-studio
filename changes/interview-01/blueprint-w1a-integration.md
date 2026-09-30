# Integrazione dell'ondata 1a (B12–B23)

24/09/2026, 09:20–09:45. Integratore dell'ondata W1a; non è una review indipendente.
Candidato dirty nel worktree `codex/interview-01`, nessun commit. L'integratore W1b lavorava
in parallelo nello stesso worktree.

Aree controllate, con il modulo d'ingresso e il numero di contributi nel report del registro:

| Area | Modulo              | Contributi |
| ---- | ------------------- | ---------: |
| B12  | `token-menu`        |         25 |
| B13  | `campaign-members`  |          9 |
| B14  | `session-view`      |         14 |
| B15  | `handouts`          |         17 |
| B16  | `compendium`        |          8 |
| B17  | `chat`              |         11 |
| B18  | `annotations`       |         20 |
| B19  | `encounter-builder` |          4 |
| B20  | `campaign-settings` |         13 |
| B21  | `character-library` |          7 |
| B22  | `preferences`       |         12 |
| B23  | `command-palette`   |         11 |

## Esito

- **Suite Node completa** (`node --test design/blueprint/tests/*.test.mjs`, 68 file): tre
  esecuzioni. La prima prima di ogni modifica, la seconda dopo la correzione CSS, la terza alla
  fine. Ogni volta **1343/1343**, 0 falliti. Nessun errore dovuto all'interazione tra le aree.
- **Test Node delle 12 aree W1a: 330/330.** Per area: token-menu 24, campaign-members 38,
  session-view 29, handouts 23, compendium 25, chat 30, annotations 28, encounter-builder 29,
  campaign-settings 28, character-library 29, preferences 23, command-palette 24.
- **Browser:**
  - 17 percorsi W1a (le 12 aree più 5 percorsi di review): **225/225 passi**.
  - 8 percorsi di regressione: **57/57 passi**.
  - In tutto 25 script verdi nell'ultima esecuzione e zero errori di pagina.
- **Caricamento dell'app:**
  - Zero errori di pagina.
  - Nessun errore in console a parte i 404 dei moduli non ancora costruiti: 26 per ogni
    caricamento, uno per area pianificata e mancante.
  - Nessuno dei 12 moduli W1a manca.
- **«Cosa è pronto»** mostra il report del registro: «22 pronte · 26 da costruire · 0 con
  errori». Tutte le 12 aree W1a risultano «attiva». Nessun avviso circoscritto, quindi anche
  nessun conflitto di scorciatoie.
- **Una correzione CSS**, piccola e circoscritta (vedi sotto): a 390 px la testata e la barra
  del Tavolo avevano bersagli sotto i 40 px.
- **Un rilievo aperto** che non è una correzione da integratore: la barra del Tavolo del DM ha
  16 pulsanti. La soluzione è già pianificata in B61.

## Browser

Sessione `d20-w1a-integ`, cwd `d20-blueprint-evidence/2026-09-24/W1a-integ/`.

Gli script girano in sequenza nella stessa sessione, da copie in `scripts/<nome>-journey.js`.
Le copie differiscono dall'originale solo nei percorsi delle immagini, spostati in
`W1a-integ/<nome>/`. Così le prove dei costruttori non vengono sovrascritte. Le fixture di
B13 e B17 sono state copiate lì.

Ogni copia è avvolta da `scripts/prep.sh` in `<nome>-wrapped.js`. Se fallisce, restituisce il
messaggio, gli ultimi passi superati e una schermata per pagina (`zz-failure-*.png`).
`scripts/run.sh` esegue gli script. Gli esiti sono in `results-run1.txt` (primo giro),
`results-run2.txt` (combat e rest-shared rieseguiti), `results-run3.txt` (giro completo dopo
la correzione CSS) e `results-run3b.txt` (campaign-members-review). Il JSON di ogni script è
in `<nome>/<giro>.json`.

Nelle tabelle, run1 è il giro prima della correzione CSS e run3 quello dopo.

### Percorsi dell'ondata W1a

| Script                             | run1                        | run3          |
| ---------------------------------- | --------------------------- | ------------- |
| `token-menu-journey`               | 19/19, `failedGroups` vuoto | 19/19         |
| `campaign-members-journey`         | 15/15                       | 15/15         |
| `campaign-members-review-journey`  | —                           | 11/11 (run3b) |
| `campaign-members-review2-journey` | 9/9                         | 9/9           |
| `session-view-journey`             | 15/15                       | 15/15         |
| `handouts-journey`                 | 15/15                       | 15/15         |
| `compendium-journey`               | 15/15                       | 15/15         |
| `chat-journey`                     | 13/13                       | 13/13         |
| `chat-review-fixes-journey`        | 11/11, 0 errori di pagina   | 11/11         |
| `annotations-journey`              | 11/11                       | 11/11         |
| `annotations-review-fixes-journey` | 10/10                       | 10/10         |
| `encounter-builder-journey`        | 12/12                       | 12/12         |
| `campaign-settings-journey`        | 15/15, 0 rilievi            | 15/15         |
| `character-library-journey`        | 17/17                       | 17/17         |
| `character-library-review-journey` | 10/10                       | 10/10         |
| `preferences-journey`              | 14/14                       | 14/14         |
| `command-palette-journey`          | 13/13                       | 13/13         |

### Regressioni

| Script                                                  | run1                                                             | run3  |
| ------------------------------------------------------- | ---------------------------------------------------------------- | ----- |
| `core-journey`                                          | 13/13                                                            | 13/13 |
| `combat-journey`                                        | **fallito al passo 0**: pulsante «Richieste» non trovato         | 10/10 |
| `campaign-integration-journey`                          | 2/2                                                              | 2/2   |
| `library-journey`                                       | 3/3                                                              | 3/3   |
| `rest-shared-journey`                                   | **fallito dopo 2 passi**: campo del Recupero arcano non visibile | 3/3   |
| `conditions-journey`                                    | 11/11, 0 rilievi                                                 | 11/11 |
| `visual-fixes-journey` (in più, per la correzione CSS)  | —                                                                | 5/5   |
| `combat-mobile-journey` (in più, per la correzione CSS) | —                                                                | 10/10 |

Le due regressioni fallite nel run1 non vengono dall'ondata W1a:

- **combat:** B24 ha rinominato la campanella in «Notifiche e richieste» e l'ha trasformata in
  un centro con una scheda Richieste.
- **rest-shared:** il velo dei dadi animati di B56 copre il dialogo dopo un tiro digitale.

Gli script condivisi `combat-journey.js` (09:24) e `rest-shared-journey.js` (09:25) sono stati
aggiornati mentre questa sessione lavorava. I commenti e la cartella `W1b-integ` indicano che
è stato l'integratore W1b. Anche `combat-ui.mjs` è cambiato alle 09:26: dai file non risulta
chi l'abbia modificato. Con gli script aggiornati, run2 e run3 passano. Questa sessione non ha
modificato nessuno di questi file.

## Caricamento, console e report

Il controllo usa `scripts/shell-probe.js`. Crea contesti nuovi a 1440×900 e a 390×844 al
tocco, con i dati di esempio ripristinati. Visita, come DM e come giocatore: Inizio,
Personaggi, scheda di Livia, Campagne, Campagna, Biblioteca e Tavolo; il DM visita anche
Preparazione. Poi ripete Inizio e Tavolo in inglese. Esito in `shell/probe-run2.json`.

- **Errori:**
  - 0 `pageerror` in entrambe le larghezze.
  - 52 voci d'errore in console per larghezza: sono i 404 delle richieste HEAD per 26 moduli
    non costruiti, contati per ciascuno dei due caricamenti.
  - Nessun altro errore in console.
  - I 26 moduli mancanti sono: adventures, builder-plus, campaign-data, combat-tracker,
    damage-tray, dice-tray, fog-vision, generators, homebrew-editor, integrations,
    inventory-plus, knowledge, offline, party, projects, quests, quickbar, regions,
    relations-graph, scene-assets, sessions-plus, sheet-plus, special-moves, spells-plus,
    travel, world-map.
  - Il comportamento è quello documentato in
    [integrazione del registro](blueprint-registry-integration.md): un 404 è una risorsa, non
    un errore della pagina. Sparisce quando l'area viene costruita.
- **Report:** la finestra «Cosa è pronto» contiene `.ext-report` con «22 pronte · 26 da
  costruire · 0 con errori». Ha una sola sezione, «Pronte», con le 22 righe «attiva · N
  contributi»; «Ancora da costruire (26)» è chiuso. Non ci sono le sezioni «Con errori» né
  «Avvisi circoscritti». Stesso risultato a 390 px. Immagini: `shell/ready-dialog-1440.png` e
  `shell/ready-dialog-390.png`.

## Testata e navigazione

- **Cosa aggiungono le aree W1a:** nessuna voce di navigazione e nessuna icona di servizio.
  - B23 sostituisce «Cerca» nella stessa posizione.
  - B13 e B21 sostituiscono Campagne e Personaggi nella stessa posizione.
  - Le sezioni d'area restano nelle loro pagine: campagna, scheda, Preparazione, Biblioteca.
    Al Tavolo compaiono come cassetti nella barra in alto e come voci del menu della pedina,
    come prevede il registro.
- **A 1440 px:**
  - Navigazione: Inizio, Personaggi, Campagne, Biblioteca.
  - Servizi: 6 icone (Cerca, Appunti personali, Notifiche e richieste, Preferenze, Aiuto,
    Account). Le ultime due sono delle aree W1b B30 e B29.
  - Nessuna sovrapposizione, nessun controllo fuori schermo e nessun overflow della pagina,
    su tutte le pagine visitate e con entrambi i ruoli. Testata alta 81 px, al Tavolo 63 px.
- **A 390 px fuori dal Tavolo:**
  - La testata è su tre righe (marchio, 6 icone, 4 voci) ed è alta 157 px.
  - Tutti i controlli misurano almeno 40 px. Nessuna sovrapposizione e nessun overflow, anche
    in inglese.
- **A 390 px al Tavolo, prima della correzione:**
  - «App» e «Torna alla campagna» erano alti 38 px.
  - Le 6 icone erano larghe 31 px: una regola del core le stringeva per farne stare 4 su una
    riga sola.
  - Nella barra del Tavolo tutti i pulsanti erano alti 36 px, compresi i cassetti delle aree.
    Faceva eccezione Sicurezza (40 px).
  - Misure in `shell/toolbar-measure.json` e `shell/probe-run1.json`.

### Correzione applicata (`design/blueprint/styles.css`, solo `@media (max-width: 720px)`)

Due regole esistenti cambiano solo nel valore, con un commento. Nessun markup, selettore o
comportamento cambia.

- `.table-header > .button`: `min-height` passa da 38 px a 40 px.
- `.table-header .service-nav .icon-button`: `width` passa da 31 px a 40 px. Con sei servizi
  le icone erano già su una riga propria, quindi il restringimento non serviva più.
- `.table-topline .button`: `min-height` passa da 36 px a 40 px.

Dopo la correzione (`shell/probe-run2.json`, `shell/toolbar-measure-run2.json`):

- 0 controlli sotto i 40 px nella testata e nella barra del Tavolo, con entrambi i ruoli, IT
  ed EN.
- Nessun overflow.
- Testata del Tavolo da 107 a 109 px. Barra del DM da 160 a 172 px; barra del giocatore da 80
  a 84 px.
- Prettier `--check` pulito.

Riverifica in run3: tutti i 25 script sono verdi, compresi `visual-fixes` e `combat-mobile`,
aggiunti proprio per questa modifica. Immagini: `shell/top-table-dm-390.png` e
`shell/top-home-player-390.png`.

## Rilievo aperto (per B61, non corretto qui)

La barra in alto del Tavolo è affollata. Le entrate restano reperibili, ma la gerarchia è
debole.

- **Il DM vede 16 pulsanti:**
  - 4 del core: Avvia combattimento, Scene, Riposi, Tempo.
  - 5 cassetti W1a: Incontro (B19), Annotazioni (B18), Materiali (B15), Schermo del DM (B16) e
    Sessione (B14).
  - Registro, sostituito da B17.
  - 6 cassetti W1b: Bottino, Bottega, Tabelle e mazzi, Prova i dadi, Sicurezza, Immagini e
    file.
- **Il giocatore ne vede 8.**
- **Ingombro:** a 1440 px la barra del DM occupa due righe (92 px). A 390 px occupa quattro
  righe (172 px) prima della mappa.

Accorparli in un menu «Altro» sposterebbe le entrate che gli script cercano direttamente. Non
è quindi una correzione minima da integratore. Il rimedio è l'incremento **B61** del
[censimento](../../docs/interview/CAPABILITY_CENSUS.md): barra laterale destra a schede, come
le schede della barra laterale di Foundry e di Roll20, e icone in alto solo per i servizi
globali, come in Owlbear. B61 porta con sé i criteri di accettazione a 1440 e 390 px. Le
misure sopra sono la base da cui partire.

## File toccati da questa sessione

- `design/blueprint/styles.css`: le tre modifiche di valore descritte sopra.
- `changes/interview-01/blueprint-w1a-integration.md`: questo rapporto.
- Le prove sono fuori dal checkout, in `d20-blueprint-evidence/2026-09-24/W1a-integ/`: copie
  degli script, `node-suite-run{1,2,3}.log`, `results-*.txt`, `shell/` e le cartelle dei
  singoli percorsi.
