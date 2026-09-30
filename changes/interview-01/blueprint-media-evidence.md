# B28 — Materiali multimediali (immagini e file): prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`) · sessione
browser `d20-b28` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B28/` (fuori dal checkout).

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B28 (BI-29…BI-35, PG-44, CA-25, TV-28).
Righe di mercato lette: `market-census/foundry.md` (FVT-038, FVT-039, FVT-041, FVT-105,
FVT-179, FVT-185), `roll20-fgu.md` (R20-061, R20-189, R20-193), `vtt-light.md` (VTL-024,
VTL-061, VTL-062, VTL-104, VTL-108, VTL-194, VTL-240), `dndbeyond.md` (DDB-058, DDB-108),
`campaign-tools.md` (CMP-28, CMP-207, CMP-208), `community-services.md` (SVC-138).

## File

Nuovi, tutti dell'area `media`:

| File                                                     | Contenuto                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design/blueprint/media.mjs`                             | modulo d'ingresso `register(registry)`: 14 contributi (sezione della Biblioteca, pagina del file, scheda «Aspetto», 2 livelli di mappa, 2 pannelli del Tavolo, 2 sezioni di campagna, menu della pedina, notifiche, ricerca, comando, impostazione); gestori della pagina del file (`actions`) |
| `design/blueprint/media-domain.mjs`                      | dominio puro sulla sezione `state.ext.media`: controllo dei file, cartelle e tag, quota, provenienza e licenza, «usato in», ritratti, immagini della pedina e ritaglio, mappe di scena, allegati, riferimenti mancanti, note PDF                                                               |
| `design/blueprint/media-ui.mjs`                          | pezzi condivisi: sorgenti (URL `blob:` in cache), miniature, avvisi, lettura di un file locale, ruota d'importazione, selettore di file, visore, ritaglio circolare, finestra «File mancante», scelte delle immagini della pedina                                                              |
| `design/blueprint/media-table.mjs`                       | Tavolo: immagini sulle pedine, badge «mancante», pannello nell'ispettore, cassetto «Immagini e file», trascinamento su pedine e mappa                                                                                                                                                          |
| `design/blueprint/media-seed.mjs`                        | 8 immagini sintetiche disegnate per il prototipo (ritratti di Livia, Doran, Mira, due sentinelle goblin, mappa del cortile, lettera) e un PDF sintetico di 2 pagine                                                                                                                            |
| `design/blueprint/media.css`                             | solo classi `.media-*`, token di `styles.css`                                                                                                                                                                                                                                                  |
| `design/blueprint/tests/media.test.mjs`                  | 17 test Node con store e registro veri (dominio + gestori con DOM finto)                                                                                                                                                                                                                       |
| `changes/interview-01/blueprint-checks/media-journey.js` | percorso nel browser reale (IT 1440 giocatore/DM, EN 390 touch)                                                                                                                                                                                                                                |

Fuori dal checkout (cartella delle prove): `make-fixtures.mjs` crea in `fixtures/` i file
sintetici da caricare (`appunti.txt`, `finto.png`, `enorme.png` da 600 KB, due PNG 200×200,
`mira-bear.png`); `media-journey-result.json` è l'esito dell'ultima esecuzione.

### File condiviso toccato: un solo hook additivo, una riga

La pagina di una voce della campagna (`campaign.mjs`, `detail()`) non aveva un punto
d'estensione: gli allegati di una voce (Kanka CMP-28) devono comparire sulla voce stessa.
Dopo `${links(ctx, entry.data.links)}` è stata aggiunta una sola espressione:

```js
${ctx.registry?.list("campaign-section", ctx, entry).filter((c) => c.id.endsWith(".entry")).map((c) => ctx.registry.slot("campaign-section", c, ctx, entry)).join("") ?? ""}
```

Convenzione (da riportare in `DEVELOPMENT.md` dal coordinatore): una `campaign-section` il cui
id finisce in `.entry` è un riquadro della voce; riceve la voce proiettata come secondo
argomento di `when`/`render` e, con `when` che richiede la voce, non compare nella barra
laterale. Il `bind` esistente di `bindCampaign` la collega già. Nessuna firma cambiata; senza
registro o con registro vuoto la pagina è identica (test `registry-shell` verdi).
`extensions.mjs` elencava già `media`: nessun'altra modifica.

Stato: `state.ext.media` (versione 1, `undo: "snapshot"`: l'Undo di gioco ripristina file e
riferimenti). Impostazione di dispositivo `media.import-lock` (tipo bloccato della ruota
d'importazione), visibile anche in Preferenze.

## Dove si trova (≤ 3 clic)

| Superficie                      | Percorso                                                                 | Chi                                                     |
| ------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| Libreria «Immagini e file»      | Biblioteca › **Immagini e file** (2 clic)                                | ognuno la propria; «Condivisi nella campagna» per tutti |
| Pagina del file                 | clic su una scheda della libreria (`#media?id=…`), risultati di ricerca  | proprietario (modifica); altri solo se condiviso        |
| Aspetto del personaggio         | Personaggi › Apri scheda › **Aspetto** (2 clic)                          | chi controlla la scheda; gli altri in sola lettura      |
| Immagini della pedina al Tavolo | selezionare la pedina → riquadro «Immagine della pedina» nell'ispettore  | chi controlla la pedina                                 |
| Cassetto «Immagini e file»      | Tavolo › pulsante **Immagini e file** (1 clic)                           | tutti; «Usa come mappa» solo DM                         |
| Allegati della campagna         | Campagna › **Allegati** (1 clic); su ogni voce, riquadro «Allegati»      | chi legge la voce; allega chi può modificarla           |
| Avvisi                          | campanella (file mancanti), ricerca globale (file per nome/tag), palette | secondo accesso                                         |

## Capacità → percorso → prova

| Capacità (census)                                 | Percorso e comando                                                                                                                                          | Risultato verificato                                                                                                                                              | Regola / fonte                                 | Pattern adottato                                                                                                                 | Prova                                                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| BI-29 libreria con cartelle, tag, ricerca, upload | Biblioteca › Immagini e file: cartelle di sistema per tipo + «Nuova cartella», ricerca nome/tag, Griglia/Elenco, «Carica file» o trascinamento, quota       | upload in «Ritratti», tag salvati, ricerca «bosco» isola il file, cartella creata e (vuota) eliminata; quota 2 MB con misuratore; badge tipo/«Condiviso»/«In uso» | nessuna regola di gioco                        | Foundry File Picker FVT-185; Roll20 Art Library R20-189; FG Assets R20-193; Owlbear dock con badge VTL-061; LegendKeeper CMP-207 | journey passi 1; test «upload…», «folders…»; `02-library-ritratti.png`                        |
| BI-30 selettore negli editor e «usato in»         | «Scegli dalla libreria» (Aspetto, immagini della pedina, correzione del mancante, allegati); pagina del file › «Usato in» con «Apri»                        | il selettore filtra e carica (file preselezionato); «Usato in» elenca scheda e pedina con collegamenti; usi nascosti contati senza nome                           | —                                              | FVT-185 (selettore); Kanka «used in» CMP-208                                                                                     | journey passi 2–3; test «used in…», «private sheets…»; `06-used-in.png`                       |
| BI-31 risorsa mancante con azione                 | eliminare un file usato → pedina con bordo tratteggiato e badge «!» (clic o Invio), riquadro nell'ispettore, «Riferimenti mancanti» in libreria, campanella | la pedina segnala il file mancante; «Scegli un'altra immagine» o «Togli il riferimento»; una mappa mancante mostra un avviso sulla scena                          | —                                              | Owlbear missing-asset notice VTL-240; Scene Packer Asset Report FVT-179                                                          | journey passo 4; test «deleting…», «scene map…»; `09-table-missing-badge.png`                 |
| BI-32 ritaglio della pedina dal ritratto          | Aspetto › «Ritaglia per la pedina»: trascinamento, frecce, + e −, cursori; «Applica il ritaglio»                                                            | zoom 1,3 da tastiera e spostamento col mouse salvati; stesso ritaglio su pedina, ordine dei turni e anteprima                                                     | —                                              | Tokenizer FVT-039 (editor dal ritratto)                                                                                          | journey passo 2; test «circular crop…»; `03-crop-dialog.png`                                  |
| BI-33 tipo scelto all'importazione                | dopo il caricamento (o rilascio sulla mappa) la ruota chiede Mappa · Pedina · Ritratto · Oggetto; Maiusc+clic o casella bloccano la scelta                  | «Ritratto» → cartella Ritratti; file dal computer rilasciato sulla sentinella → «Pedina» → immagine della pedina; blocco salvato come impostazione di dispositivo | —                                              | Owlbear import wheel VTL-062 (Maiusc blocca)                                                                                     | journey passi 1 e DM; `01-import-wheel.png`                                                   |
| BI-34 provenienza e licenza                       | pagina del file › «Provenienza e licenza» (fonte, autore/credito, licenza, collegamento) › «Condividi con la campagna»; crediti mostrati negli allegati     | senza provenienza la condivisione è rifiutata con motivo; con i campi il file compare in «Condivisi» del giocatore; collegamento solo http(s)                     | responsabilità di chi carica (testo in pagina) | Roll20 asset ownership e acknowledgements SVC-138                                                                                | journey passo 6; test «sharing requires…»; `11-share-needs-provenance.png`                    |
| BI-35 PDF personali con annotazioni               | file PDF › «Mostra il PDF qui» (visore del browser, pagina scelta) › «Le mie annotazioni · Solo io» (pagina + nota)                                         | nota salvata anche senza rete (modifica locale); il DM non vede né il PDF personale né le note                                                                    | privacy «Solo io»                              | Owlbear PDF! VTL-194; Roll20 PDF nel diario R20-061 (come allegato)                                                              | journey passi PDF e DM; test «personal PDF notes…»; `18-pdf-personal-notes.png`               |
| PG-44 aspetto: ritratto, cornice, tema; pedina    | Aspetto: ritratto (libreria o caricamento diretto), «Colore della scheda», «Bordo della pedina», pedina dal ritratto                                        | ritratto su scheda (intestazione), elenco, Inizio e ispettore; tema smeraldo applicato alla scheda; bordo oro sulla pedina al Tavolo                              | —                                              | D&D Beyond Sheet Appearance DDB-058; PC token = ritratto DDB-108; bordo Quest Portal VTL-024; dnd5e FVT-038                      | journey passo 2; test «portrait from the library…»; `04-sheet-appearance.png`, `15-…`, `16-…` |
| CA-25 allegati per voce con visibilità            | voce › «Allegati» › «Allega un file»: file + «Chi può leggere la voce» / «Solo DM» / «Solo io»; Campagna › Allegati                                         | allegato «Solo DM» visibile al DM dopo reload; mai nella pagina del giocatore; «Lettera sigillata» visibile a tutti con crediti                                   | segreti del DM                                 | Kanka attachments con visibilità CMP-28; PDF nel diario Roll20 R20-061                                                           | journey passo 5; test «DM-only attachment…»; `10-entry-attachment-dm.png`, `17-…`             |
| TV-28 immagini alternative della pedina           | Aspetto › «Aggiungi un'immagine alternativa» (nome); scelta con miniature su scheda, ispettore del Tavolo o menu della pedina (B12)                         | la proprietaria sceglie «Cappuccio» dalla scheda e torna al ritratto dal Tavolo; il DM vede la stessa immagine; il DM cambia la sentinella in «Ferita»            | —                                              | Changr / Flip! VTL-104; Token Variant Art FVT-105 (pulsante di variante)                                                         | journey passo 7; test «owner picks…»; `07-table-dm-second-image.png`                          |
| Mappa di scena dalla libreria (card)              | cassetto del Tavolo (DM) › filtro Mappe › «Usa come mappa» (conferma) o pagina del file › «Mappa della scena»                                               | la scena mostra la mappa; l'editor di scena esistente la vede («cortile.jpg · 800 × 520 px») e la convalida; muri, porte e pedine invariati                       | —                                              | Owlbear dock: trascinare/usare una mappa VTL-061                                                                                 | journey passo DM; test «scene map…»; `12-dock-scene-map.png`                                  |

## Accettazione della scheda

1. **Ritratto locale, cartella «Ritratti», tag; file non valido rifiutato con motivo** —
   `appunti.txt` («non è un'immagine PNG, JPEG o WebP né un PDF»), `finto.png` («dichiara il
   formato PNG ma il contenuto non corrisponde»), `enorme.png` («pesa 600 KB: … il limite è
   500 KB per file»); `livia-bosco.png` → ruota «Ritratto» → «Ritratti», rinominato, tag
   `livia, bosco`, modifica privata locale.
2. **Scheda → Aspetto: ritratto dal selettore, ritaglio circolare, pedina aggiornata** —
   selettore con ricerca, ritaglio da tastiera e mouse, intestazione della scheda dipinta, al
   Tavolo il cerchio della pedina usa il ritratto e l'iniziale sparisce.
3. **«Usato in» elenca scheda e pedina; sostituire aggiorna entrambe** — «Ritratto nella
   scheda di Livia» e «Pedina di Livia (dal ritratto) · Il cortile dell'osservatorio»;
   «Sostituisci file» → «File sostituito: 2 usi mostrano ora «livia-bosco-2.png»», revisione 2,
   pedina e scheda cambiano immagine; il reload conserva tutto.
4. **Eliminare un'immagine usata mostra l'elenco; la pedina segnala il mancante con azione**
   — la conferma elenca i due usi; dopo, badge «!» sulla pedina e «Riferimenti mancanti (1)»;
   «Annulla ultima modifica» al Tavolo ripristina (correzione nel registro); eliminata di nuovo,
   il badge raggiunto con Invio apre «File mancante» → «Scegli un'altra immagine» → risolto.
5. **Allegato «solo DM» a una voce del diario** — il DM allega «Cortile al tramonto» al
   resoconto con «Solo DM»; il giocatore vede solo «Lettera sigillata», anche dopo reload.
6. **Provenienza e licenza richieste per condividere** — condivisione rifiutata con motivo,
   accettata con fonte, credito e licenza; il file compare fra i condivisi del giocatore.
7. **Seconda immagine della pedina selezionabile dal proprietario** — la giocatrice aggiunge
   «Cappuccio» e la sceglie; il riquadro del Tavolo mostra la scelta; il DM vede la stessa.

## Comandi ed esiti

- `node --test design/blueprint/tests/media.test.mjs` → **17/17**.
- `node --test design/blueprint/tests/*.test.mjs` → **863/863** all’ultima esecuzione (una prima esecuzione aveva 2
  errori transitori in `session-view`, area B14 in lavorazione; ripetuta, tutto verde).
- `prettier --check` sui file dell'area: conforme (il percorso è formattato e, come gli altri
  percorsi, senza il punto e virgola finale richiesto dalla CLI).
- Browser (server `http://127.0.0.1:8879/`, sessione `d20-b28`, cwd la cartella delle prove):
  `node make-fixtures.mjs`, poi
  `playwright-cli -s=d20-b28 --raw run-code --filename=…/blueprint-checks/media-journey.js`
  → 13 passi superati, `errors: []` (nessun `pageerror`), esito in `media-journey-result.json`.
  Il percorso verifica anche: modalità senza rete (nota personale salvata, modifica condivisa
  rifiutata con «Sei senza rete»), trascinamento HTML5 dal cassetto su una pedina, nessun
  overflow orizzontale a 1440 e 390, bersagli dell'area ≥ 40 px su telefono, inglese su
  telefono con tocco.
- «Cosa è pronto»: `B28 · Materiali multimediali — attiva · 14 contributi`, 0 aree con errori.

Schermate a 1440×900 (ispezionate): `01-import-wheel`, `02-library-ritratti`,
`03-crop-dialog`, `04-sheet-appearance`, `05-table-token-portrait`, `06-used-in`,
`07-table-dm-second-image`, `08-delete-uses`, `09-table-missing-badge`,
`10-entry-attachment-dm`, `11-share-needs-provenance`, `12-dock-scene-map`,
`15-character-list-portraits`, `16-sheet-header-portrait`, `17-campaign-attachments-player`,
`18-pdf-personal-notes`, `19-home-portrait`; telefono EN 390: `13-phone-appearance-en`,
`14-phone-table-en`.

## Scelte di prodotto dichiarate

- Ogni identità ha la propria libreria privata (Roll20); il DM non sfoglia i file personali del
  giocatore. Condividere con la campagna richiede provenienza e licenza (SVC-138).
- Usare un proprio file come ritratto o pedina del proprio personaggio non richiede la
  provenienza (modello D&D Beyond DDB-058): è visibile a chi vede la scheda o la pedina.
  Mostrare un file a tutti i lettori di una voce sì: il dialogo la chiede nello stesso passo.
- I riferimenti sono per identità del file: sostituire aggiorna ogni uso; eliminare lascia i
  riferimenti come «mancanti» con azione (VTL-240), mai uno spazio vuoto silenzioso. Una mappa
  eliminata viene tolta dalla scena, che torna al modello disegnato e mostra l'avviso.
- Smettere di condividere toglie il file dalla libreria degli altri; gli usi esistenti restano.
- Undo di gioco ripristina file e riferimenti (sezione `snapshot`).

## Limiti onesti

- I file restano nel `localStorage` di questo browser come base64: limite dimostrativo di 500 KB
  per immagine o PDF e 2 MB per identità; nessun server, CDN o sincronizzazione tra
  partecipanti. Formati: PNG, JPEG, WebP, PDF (niente GIF, SVG, video, audio).
- Il core non ha un hook per le immagini: ritratti e pedine sono dipinti da stili dell'area
  (livello di mappa per il Tavolo, un foglio di stile sotto `<body>` aggiornato sugli eventi
  per elenco, intestazione della scheda e Inizio). Se il markup del core cambia, si torna
  all'iniziale senza errori. Anteprime della Preparazione e altre aree mostrano ancora le
  iniziali.
- Il PDF usa il visore integrato del browser, caricato su richiesta; il browser senza
  interfaccia usato dai test non lo disegna, quindi la visualizzazione non è verificata a
  immagine. Le annotazioni sono note per pagina, non disegni sulla pagina (Owlbear PDF! li ha).
- Il file dal computer rilasciato sulla mappa è simulato nel percorso con un `DragEvent` e un
  `DataTransfer` reali nel browser (Playwright non trascina file del sistema operativo); il
  trascinamento dal cassetto è un vero drag HTML5 del mouse. Al tocco valgono i pulsanti.
- Non costruiti: azioni in blocco, preferiti e contenuti premium (Roll20), importazione da
  servizi web (LegendKeeper), generatore di pedine (VTL-108), immagini legate a uno stato
  (FVT-105), ricollegamento all'importazione (FVT-179), tipi Owlbear «cavalcatura/allegato».
- Il riquadro del menu della pedina (`token-menu` «Immagini della pedina…») compare solo quando
  il menu di B12 lo mostra; la stessa funzione è sempre nell'ispettore del Tavolo.
- Visibilità e permessi sono proiezioni locali a due identità, non un controllo d'accesso di un
  server. L'identità dimostrativa non sopravvive al reload (torna Giocatore), come nel resto
  della shell.
- Il pulsante del cassetto usa l'icona «eye»: `ui.mjs` non ha un'icona per le immagini.

## Note per il coordinatore

- Riportare in `DEVELOPMENT.md` la convenzione `campaign-section` `*.entry` (sopra).
- Aggiungere `media-journey.js` all'elenco di `blueprint-checks/README.md`, con i fixture
  creati da `make-fixtures.mjs` nella cartella delle prove.
- B15 (materiali/handout) usa proprie illustrazioni: potrebbe riusare il selettore di questa
  area (`openPicker` in `media-ui.mjs`, `visibleAssets`/`findAsset` in `media-domain.mjs`)
  per immagini caricate dal DM, con «usato in» e provenienza già gestiti.

## Review fixes

24/09/2026 · stessa worktree e sessione browser `d20-b28`; prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B28/review/` (fuori dal checkout).
Ogni rilievo è stato prima riprodotto (script `review/repro.js`, esito prima della correzione:
Risolvi coperto da `session-view-hud-button`, testo della mappa mancante 10 px, badge 10×10 px a
390 px, Undo dell'avviso che toglieva la cartella e non riportava il file, colore rifiutato
rimasto selezionato, valore del campo file conservato, bordo «Cremisi» di B28 contro il bordo
di B12), poi corretto con un test Node e un passo nel browser.

File toccati, tutti dell'area: `media.mjs`, `media-domain.mjs`, `media-ui.mjs`,
`media-table.mjs`, `media.css`, `tests/media.test.mjs`, `blueprint-checks/media-journey.js`
(bordo e selezione del file sul telefono, attesa della shell invece del titolo della home) e il
nuovo `blueprint-checks/media-review-journey.js`. **Nessun file condiviso modificato.**

| #   | Gravità | Esito                          | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Prova                                                                                                                                                                    |
| --- | ------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | P2      | corretto                       | «Chi può leggere la voce» condivide un file personale solo se **altri** leggono la voce (`otherEntryReaders`, `readersNeedShare`). Su una voce letta solo da chi allega l'allegato conserva quel pubblico (`audience`) e il file resta personale; se in seguito la voce viene condivisa, i nuovi lettori lo vedono solo dopo una condivisione esplicita del file (riga «Per ora lo vedi solo tu…»). Condividere richiede sempre la conferma nello stesso passo (`share: true`, casella «Condivido il file con la campagna»): la provenienza salvata riempie i campi ma non condivide mai da sola. Su una voce privata la visibilità predefinita è «Solo io» (pagina del file e finestra «Allega»), e l'allegato è una modifica locale.                                | test «review F1»; percorso F1 (nota «Solo io» creata dalla UI, DM senza il file)                                                                                         |
| F2  | P2      | corretto                       | Un solo modello di bordo: quello del menu della pedina (B12, DDB-117, per pedina). B28 toglie i propri colori del bordo (`FRAMES`/`setFrame`/`look.frame` e il tratto nel livello delle immagini); «Aspetto» mostra il bordo effettivo letto da B12 (anteprima compresa) e «Cambia il bordo al Tavolo», che apre al Tavolo il menu della pedina già sui colori del bordo (comando `token-menu.open` e voce `token-menu-ring` dal registro). La tavolozza resta per il «Colore della scheda» (`THEMES`, DDB-058).                                                                                                                                                                                                                                                      | test «review F2»; percorso F2 (standard → Blu; Tavolo e anteprima `#63a4e0`); `r3-one-border.png`, `r8-phone-ring.png`                                                   |
| F3  | P2      | corretto                       | L'avviso di eliminazione ricorda l'id del proprio commit: dopo un altro commit perde il pulsante Annulla (resta il testo), dopo una correzione sparisce; un pulsante rimasto sullo schermo rifiuta con un messaggio invece di annullare la modifica successiva.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | test «review F3»; percorso F3 (cartella «Prova undo» conservata)                                                                                                         |
| F4  | P2      | corretto                       | Quota da 1 MB per identità **e** 1,5 MB per tutti i file del browser (≈2 milioni di caratteri base64, accanto agli altri dati). Lo spazio è verificato prima della ruota. Se il browser non salva comunque il file (`persisted:false` con errore di scrittura) il caricamento viene annullato e l'avviso lo dice; con il salvataggio locale già assente il file resta nella scheda con un avviso, mai con il messaggio di successo. Il misuratore mostra entrambe le quote.                                                                                                                                                                                                                                                                                           | test «review F4 + F10»; percorso F4: 1 719 473 caratteri salvati, niente avviso di memoria piena, tutti i file accettati presenti dopo il reload; `r1-browser-quota.png` |
| F5  | P2      | corretto                       | L'avviso «Mappa mancante» è una striscia HTML (`foreignObject` riportato ai pixel dello schermo come l'HUD di B14) in basso sulla mappa, fuori dalla riga dell'HUD e dalla barra degli strumenti; testo 14 px e pulsante Risolvi da 40 px che riceve il mouse.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | test «review F5 + F6»; percorso F5: `elementFromPoint` sul pulsante, 75×40 px a 1440 e a 390, nessun overflow; `r5-missing-map.png`, `r6-phone-missing-map.png`          |
| F6  | P2      | corretto                       | Il badge «!» ha dimensione costante sullo schermo (controscalato con la matrice della mappa, ricalcolato al ridimensionamento): punto visibile da 24 px dentro un bersaglio da 40 px, spostato fuori dal cerchio della pedina; la pressione non avvia pan o movimento.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | percorso F6: 40×40 px a 390 e a 1440, clic del mouse apre «File mancante»; `r4-phone-badge.png`                                                                          |
| F7  | P2      | corretto                       | Un rifiuto conserva i valori scritti nei moduli della pagina del file (provenienza, dettagli, allega, nota: `ui.draft`, `submitForm`) e porta il fuoco sul campo da correggere (`field` nel rifiuto). Il salvataggio della provenienza dice «Per salvare la provenienza…».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | test «review F7»; percorso F7 (link ftp e rifiuto senza rete: campi conservati, fuoco sul collegamento); `r2-provenance-kept.png`                                        |
| F8  | P2      | fuori dall'area (coordinatore) | Le altre due raccolte d'immagini sono in file di altre aree (`handouts*.mjs` di B15, `preparation.mjs`): B28 non le riscrive. Stato al 24/09 04:55: B15 sta già leggendo la libreria (`handouts-domain.mjs` importa `canSeeAsset`, `findAsset`, `portraitArt`, `tokenArt`, `visibleAssets`); API invariate, salvo `tokenArt` che senza immagine ora restituisce `null` (chi usa `?.asset` non cambia). Da decidere dal coordinatore: un solo limite per file e un solo budget di memoria (la libreria resta a 500 KB per file perché i file stanno nella memoria locale, vedi F4), provenienza prima di mostrare ai giocatori (`checkProvenance`/`shareAsset`), una sola «Lettera sigillata» (`m-letter` di B28 o `art-letter` di B15), selettore unico `openPicker`. | —                                                                                                                                                                        |
| F9  | P3      | corretto                       | Un file già tra le immagini della pedina viene scelto invece di essere aggiunto di nuovo (Changr VTL-104): il ritratto diventa «Ritratto», un'immagine alternativa esistente diventa quella mostrata (`tokenImageOf`); l'avviso lo dice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | test «review F9»; percorso F9 (due trascinamenti, una sola immagine)                                                                                                     |
| F10 | P3      | corretto                       | Ogni campo file si svuota dopo la lettura (`takeFiles`): lo stesso file si può scegliere di nuovo; il controllo dello spazio precede la ruota.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | test «review F4 + F10»; percorso F10 (Esc, stesso file → la ruota si riapre)                                                                                             |
| F11 | P3      | corretto                       | Un colore della scheda rifiutato (senza rete, senza controllo) ridisegna i campioni dal valore salvato.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | test «review F11 + F12»; percorso F11                                                                                                                                    |
| F12 | P3      | corretto                       | «Creata da me» solo per chi ha caricato il file; per gli altri «Opera di chi l’ha caricata» (`sourceLabel`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | test «review F11 + F12»; percorso F12 (il giocatore legge «Opera di chi l’ha caricata · DM della campagna»)                                                              |
| F13 | P3      | corretto                       | Ogni allegato ha il suo menu «Chi vede» (Kanka CMP-28) per chi può toglierlo, con le stesse regole dell'allegare (`setAttachmentVisibility`): «Solo io» solo per chi l'ha allegato; mostrare ai lettori un file personale apre la conferma con provenienza e licenza.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | test «review F13»; percorso F13 (il DM nasconde e rimostra la lettera al giocatore); `r7-phone-attachment-visibility.png`                                                |
| F14 | P3      | corretto                       | Il caricamento dentro «Allega» riapre la finestra con il nuovo file preselezionato (come `openPicker`); gli ascoltatori stanno sul modulo della finestra, che la finestra successiva sostituisce, e non si accumulano più sull'elemento `#dialog`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | percorso F14 (finestra riaperta 4 volte, poi caricamento preselezionato e conferma di condivisione)                                                                      |

### Contratto cambiato (per chi usa l'area)

- `media-domain.mjs`: `LIMITS.quota` 1 MB, nuovo `LIMITS.total` 1,5 MB; `quota()` restituisce anche
  `browser:{used,limit}`; nuovo `checkRoom`. `FRAMES`/`setFrame` rimossi, `THEMES` per il colore
  della scheda; `tokenArt` non ha più `frame`. `attach(…, {provenance, share})` e nuovo
  `setAttachmentVisibility`; nuovi `otherEntryReaders`, `readersNeedShare`, `tokenImageOf`;
  `checkProvenance(value, {intent})`; i rifiuti possono avere `field`. `SOURCES.own` è neutro,
  `OWN_SOURCE_SELF` per chi carica. Un allegato «readers» può avere `audience` (pubblico trattenuto).
- `media-ui.mjs`: `setNotice(…, {undo, commitId})`, `noticeAfterCommit`, `lastCommitId`,
  `sourceLabel`, `tokenRing` (legge `RING_COLOURS` da `token-menu.mjs`, sola lettura), `takeFiles`,
  `tokenSvg(ctx, art, name, size, ringColor)`. `media.mjs`: `actions.attach(ctx, assetId, entryId,
visibility, {provenance, share})`, `submitForm`.
- Le frasi «2 MB per identità» e «bordo oro sulla pedina» delle sezioni precedenti sono superate
  da questa sezione.

### Comandi ed esiti

- `node --test design/blueprint/tests/media.test.mjs` → **26/26** (17 precedenti aggiornati + 9
  sui rilievi). Il banco di prova ora emette gli eventi di stato del registro come la shell.
- `node --test design/blueprint/tests/*.test.mjs` → **1172/1174** all'ultima esecuzione (04:59). I
  2 errori sono in `token-menu.test.mjs` (B12, `token-menu.mjs` salvato alle 04:59 con le nuove
  voci «rotate» e «remove» non ancora nel suo test); le esecuzioni precedenti avevano errori
  transitori in `assistant`, `dice-3d`, `handouts`, `help`, `home`, `session-prep`, tutti file
  salvati negli stessi minuti da altre aree e poi tornati verdi. Nessun errore in `media`.
- `prettier --check` sui file dell'area: conforme (i due percorsi senza il punto e virgola finale,
  come richiede la CLI).
- Browser (`d20-b28`): `media-review-journey.js` → **13 passi superati**, `errors: []`
  (`review/media-review-journey-result.json`); `media-journey.js` → **13 passi superati**,
  `errors: []` (`media-journey-result.json`). «Cosa è pronto»: `B28 · Materiali multimediali —
attiva · 14 contributi`, 0 aree con errori. Inglese verificato sul rendering dei nuovi testi.

### Limiti onesti (aggiornati)

- Il caso «il browser rifiuta il salvataggio» è verificato con il test Node (commit con
  `persisted:false`); nel browser le nuove quote impediscono di arrivarci con i soli file.
- Il collegamento «Cambia il bordo al Tavolo» dipende dal comando `token-menu.open` e dalla voce
  `token-menu-ring` di B12: senza B12 porta al Tavolo con la pedina selezionata.
- Un allegato trattenuto non segue da solo un file condiviso e poi ritirato: torna al pubblico
  iniziale, com'è giusto per un file di nuovo personale.

## Review fixes — seconda revisione

24/09/2026 · stessa worktree e sessione browser `d20-b28`; prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B28/review2/` (fuori dal checkout).
Ogni rilievo è stato prima riprodotto nel browser (`review2/repro.js`, esito in
`review2/repro-before.json`): cassetto «Mappe» con 5 file visibili su 5 e, cercando «goblin»,
5 file visibili accanto a «Nessun file di questo tipo»; selettore con «zzzz» che mostrava 5
schede; «Usato in» della lettera senza la rivelazione di B15 che la usava (e due «Lettera
sigillata» nel selettore di B15); allegato «Solo DM» registrato come riga condivisa
(`visibility: "shared"`); dopo Maiusc+clic su «Oggetto» nessuna ruota, nessuna indicazione e
la zona di rilascio che prometteva ancora la scelta; fuoco su `BODY` dopo la scelta
dell'immagine della pedina; titolo del cassetto coperto dalla barra `map-tool` (x = 26 px).
Poi corretto, con un test Node e un passo nel browser.

File toccati, tutti dell'area: `media.mjs`, `media-domain.mjs`, `media-ui.mjs`,
`media-table.mjs`, `media.css`, `tests/media.test.mjs`, `blueprint-checks/media-journey.js`
(verifica la visibilità disegnata invece dell'attributo `hidden`; etichetta «Oggetto di scena»
nella ruota) e il nuovo `blueprint-checks/media-review2-journey.js`. **Nessun file condiviso
modificato**; B28 legge B15 solo tramite le sue funzioni pure (vedi R2).

| #   | Gravità | Esito                                                   | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Prova                                                                                                                                                                                                                                                                                  |
| --- | ------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | P1      | corretto                                                | In `media.css` l'attributo `hidden` vince sulle regole `display` dell'area (`[class*="media-"][hidden]`, più gli elementi senza classe): schede filtrate del cassetto (`display:grid`), schede del selettore (`display:flex`), messaggi vuoti e riquadro PDF spariscono davvero. I percorsi verificano la visibilità disegnata (`checkVisibility`), non l'attributo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | test «review2 P1»; percorso R1: «Mappe» 1 su 5, «goblin» in Mappe 0 con il messaggio vuoto, in tutti i tipi 2; selettore «zzzz» 0, cartella Mappe 1 su 5; `r1-dock-filter.png`, `r2-picker-search.png`                                                                                 |
| R2  | P2      | corretto (B28); resto al coordinatore                   | Nuovo punto di aggancio del dominio, `addUsageProvider(id, {uses, missing})`: gli usi tenuti da altre aree entrano in «Usato in», nel conteggio «In uso», nella conferma di eliminazione, nei «Riferimenti mancanti» e nelle notifiche. B28 installa il lettore dei materiali di B15 (`handoutsUsage`: immagine di un materiale e figura di una scena senza mappa, `media:<id>`) caricando `handouts-domain.mjs` su richiesta (B28 funziona anche senza B15) e usando la regola di accesso di B15 (`canReadMaterial`); se B15 registra un proprio lettore con id `handouts`, vale il suo. La conferma separa gli usi di B28 («File mancante» con azione) da quelli «In altre sezioni» e dice cosa succede lì; l'avviso dopo l'eliminazione lo ripete. Il riferimento mancante di B15 compare solo al DM, con «Apri dove è usato» (Preparazione › Materiali) e senza «Togli il riferimento»: B28 non modifica i dati di un'altra area (`clearMissing` lo rifiuta). | test «review2 P2 … Used in, delete and missing references»; percorso R2 (rivelazione dal Tavolo → «Usato in» → Apri il materiale; eliminazione; Risolvi → Preparazione › Materiali; il giocatore non riceve il riferimento); `r3-delete-other-sections.png`, `r4-missing-external.png` |
| R3  | P2      | corretto                                                | Il tipo bloccato è visibile dove arrivano i file: riquadro «Tipo bloccato: Oggetto di scena · Sblocca» nella Biblioteca (e la zona di rilascio dice «Le immagini nuove diventano … (tipo bloccato)»), nel cassetto del Tavolo e nel selettore quando il caricamento segue il blocco; l'avviso del caricamento lo nomina con «Sblocca il tipo». Sbloccare rimette «Chiedi ogni volta». Un file rilasciato su una pedina ignora un blocco su Mappa o Oggetto di scena e apre la ruota.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | test «review2 P2: a locked import type…»; percorso R3 (Maiusc+clic, avviso, riquadro, secondo file senza ruota; file rilasciato sul goblin con blocco → ruota → Pedina → immagine; Sblocca nel cassetto → la ruota torna); `r5-lock-chip.png`; telefono EN `r8-phone-lock-en.png`      |
| R4  | P3      | corretto                                                | Riga di registro privata (`visibility:"private"`) per: allegato «Solo DM» (finestra «Allega», pagina del file), ogni cambio di visibilità da o verso «Solo DM», rimozione di un allegato «Solo DM», mappa di una scena non rivelata (pagina del file, cassetto, «Risolvi» della mappa mancante) e immagine della pedina di una creatura nascosta (`hiddenCreature`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | test «review2 P3: DM-secret media changes…»; percorso R4 (il Registro del giocatore mostra il cambio condiviso della pedina e non «File allegato alla voce»); `r6-player-log.png`                                                                                                      |
| R5  | P3      | corretto                                                | Eliminare un PDF non cancella più le note personali di nessuno (Owlbear PDF!, VTL-194): restano all'autore, elencate in Biblioteca come «Le mie note su PDF eliminati» con nome del file, pagina e «Elimina la nota»; la conferma dice che le note restano a chi le ha scritte; il DM non le vede. Annulla ripristina il file e le note tornano al loro posto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | test «review2 P3: deleting a shared PDF…»; percorso R5 (il DM condivide ed elimina un PDF annotato dal giocatore); `r7-notes-on-deleted-pdf.png`                                                                                                                                       |
| R6  | P3      | corretto                                                | Dopo ogni comando che ridisegna, il fuoco torna sullo stesso controllo (`refocus`, per attributo `data-`): scelta dell'immagine della pedina (scheda e ispettore; dalla finestra del menu della pedina torna alla pedina sulla mappa), rimozione di un'immagine (sulla scelta attiva), «Chi vede», Griglia/Elenco, cartelle, colore della scheda, note orfane, Sblocca.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | percorso R6: mouse e Invio sulla scelta, select «Chi vede», Elenco, cartella condivisa mantengono il fuoco; dalla finestra del menu della pedina (clic destro › «Immagini della pedina…») il fuoco torna sulla pedina                                                                  |
| R7  | P3      | in parte; resto dichiarato                              | Clic sul ritratto dell'intestazione della scheda: l'intestazione è del core e non ha un aggancio, e B28 tocca il DOM solo dentro i propri elementi → al coordinatore (aggancio «ritratto della scheda» che apre Aspetto). Bordo di una pedina non in scena: il bordo è del menu della pedina di B12 (un solo modello, rilievo F2) → al coordinatore un bordo predefinito per personaggio applicato da B12 alla creazione della pedina. Immagine di pedina o oggetto di scena rilasciata sulla mappa vuota: **deviazione dichiarata**, B28 non crea creature né oggetti liberi sulla mappa (le pedine sono creature con scheda, collocate da incontri e preparazione); il messaggio indica dove rilasciare.                                                                                                                                                                                                                                                        | —                                                                                                                                                                                                                                                                                      |
| R8  | P3      | corretto; un nome al coordinatore                       | «prop» è «Oggetto di scena» / «Prop» (la parola di Owlbear) in tipo, cartella, ruota e impostazione, non più «Handout» (i materiali di B15). Il cassetto usa l'icona `map` invece di `eye` (`ui.mjs` non ha un'icona per le immagini). «Usato in» e i riferimenti mancanti chiamano una voce senza titolo con il suo tipo (`ENTRY_KINDS`, anche per `entryLabel`). Il pannello «Aspetto» dell'ispettore è di B15 → al coordinatore.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | test «review2 P3: an untitled entry…», «review2 P2 lock» (Prop); percorso telefono EN (cartella «Props»)                                                                                                                                                                               |
| R9  | P3      | (a) non è un difetto; (b) corretto; (c) al coordinatore | (a) Il selettore `.character-card` serve l'elenco del core, che torna quando l'area che lo sostituisce (Personaggi, `character-library.mjs`) non è disponibile: resta, con un commento. (b) Il conteggio «in N contenuti che non puoi vedere» non compare più (pagina del file, badge «In uso», conferma, sostituzione): rivelava l'esistenza di contenuti privati di altri; come Kanka si elencano solo gli usi leggibili. Per un file condiviso la conferma dice che chi lo usa in contenuti non visibili vedrà «File mancante». (c) La barra `map-tool` copre il titolo dei cassetti del Tavolo a 1440 px (x = 26 px): è del Tavolo.                                                                                                                                                                                                                                                                                                                           | test «review2 P2» (nessun «non puoi vedere»); `repro-before.json` (`p3cRail: map-tool`)                                                                                                                                                                                                |

### Contratto cambiato (seconda revisione)

- `media-domain.mjs`: `addUsageProvider(id, provider, {ifAbsent})`, `removeUsageProvider`; le
  righe di altre aree hanno `kind: "external"` e `area`; `clearMissing` rifiuta `external`
  (codice `external`). Nuovi `sceneVisibleTo`, `hiddenCreature`, `orphanAnnotations`,
  `ENTRY_KINDS`. `deleteAsset` conserva le annotazioni. `USE_LABELS.prop` e la cartella
  `f-prop`: «Oggetto di scena» / «Prop(s)».
- `media-ui.mjs`: `lockChip`, `bindLock`, `unlockImport`, `refocus`, `byData`,
  `sceneOptions`; `setNotice(…, {unlock})`; `importFiles(…, {lock})`; `pickerBody(…, {use})`;
  `actorOptions` restituisce `{visibility:"private"}` per una creatura nascosta.
- `media.mjs`: `usageReady` (promessa del lettore di B15), `handoutsUsage(D)`.

### Comandi ed esiti

- `node --test design/blueprint/tests/media.test.mjs` → **32/32** (26 precedenti + 6 sulla
  seconda revisione).
- `node --test design/blueprint/tests/*.test.mjs` → **1248/1248** alla prima esecuzione dopo le
  correzioni. Le esecuzioni successive (08:25, 08:26, 08:29; ultima **1269/1277**) hanno errori
  solo in `campaign-settings`, `compendium`, `home` e `dice-3d`, i cui moduli
  (`campaign-settings-domain.mjs`, `compendium.mjs`, `home*.mjs`, `dice-3d*.mjs`) sono stati
  salvati da altre aree tra le 08:25 e le 08:29; nessun errore in `media`, 32/32 in ogni
  esecuzione.
- `prettier --check` sui file dell'area: conforme (i percorsi senza il punto e virgola finale).
- Browser (`d20-b28`): `media-review2-journey.js` → **7 passi superati**, `errors: []`
  (`review2/media-review2-journey-result.json`); `media-review-journey.js` → **13**,
  `errors: []`; `media-journey.js` → **13**, `errors: []`. «Cosa è pronto»: `B28 · Materiali
multimediali — attiva · 14 contributi`, 0 aree con errori.

### Note per il coordinatore (seconda revisione)

- B15: la finestra «Il DM ti mostra: La lettera» resta senza immagine e senza avviso quando il
  file della libreria è stato eliminato (`review2/r9-popup-1.png`): `projectMaterial` restituisce
  `image: null`. Serve un «Immagine non disponibile» lato B15; B28 elenca già il riferimento al
  DM con la via per correggerlo. B15 può anche registrare un proprio lettore
  (`addUsageProvider("handouts", …)`), che sostituisce quello di B28.
- Una sola «Lettera sigillata» (`m-letter` di B28 o `art-letter` di B15): decisione F8, ancora
  aperta; il selettore di B15 le mostra entrambe.
- Nome del pannello «Aspetto» dell'ispettore di B15 (uguale alla scheda «Aspetto» di B28).
- Aggancio per il ritratto dell'intestazione della scheda (clic → Aspetto) e bordo predefinito
  per personaggio in B12.
- Tavolo: la barra `map-tool` copre il titolo dei cassetti a 1440 px.
- `blueprint-checks/README.md`: aggiungere `media-review2-journey.js` (usa anche il nuovo
  fixture `regno.pdf` di `make-fixtures.mjs`).

### Limiti onesti (seconda revisione)

- Il lettore dei materiali di B15 legge la forma dei dati di B15 (`materials[].image.artId`,
  `stages[scena].artId`): se B15 la cambia senza registrare un proprio lettore, quegli usi
  spariscono dall'elenco senza errori.
- Il file rilasciato sulla mappa resta simulato con `DragEvent`/`DataTransfer` reali nel
  browser, come nel primo percorso.
