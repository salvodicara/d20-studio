# B21 — Personaggi: elenco, privacy, copia, esportazione e condivisione

24/09/2026. Area `character-library` (scheda B21 di
[CAPABILITY_CENSUS](../../docs/interview/CAPABILITY_CENSUS.md#b21--personaggi-elenco-privacy-copia-esportazione-e-condivisione-personaggi-m)).
Sessione browser `d20-b21`, evidenza in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B21/`.

## In breve, per il proprietario

- **Personaggi** (un clic dalla navigazione) è ora la libreria dei personaggi, come "My
  Characters" di D&D Beyond: ricerca immediata per nome, livello, classe, specie o campagna
  ("mago" trova Iria e Livia), ordinamento per creazione, nome, livello o ultima modifica,
  ricordato da questo dispositivo. Ogni scheda ha **Apri scheda**, **Copia**, **Elimina** e
  **Gestisci**; la scheda aperta ha **Gestisci personaggio** accanto al percorso.
- **Iria** (maga elfa di 5° livello) è il personaggio d'esempio che vive solo nella
  libreria, fuori dalla campagna: serve a provare copia, "porta una copia" e "collega".
- **Copia** crea una scheda indipendente; **Elimina** chiede conferma e sposta nel
  **Cestino**, da cui si ripristina (anche dopo un ricaricamento). Dopo copia, importazione
  e uscita dalla campagna l'avviso in alto offre **Annulla**.
- **Privacy** a tre livelli come D&D Beyond: _Solo campagna_ (iniziale), _Privata_ (tu e il
  DM; gli altri giocatori vedono solo nome, classe, livello e giocatore), _Pubblica con
  link_. Il dialogo mostra "chi vede cosa" e l'anteprima per un altro giocatore (per
  esempio chi gioca Doran). Il link e il **QR** aprono la scheda in sola lettura, senza
  comandi, senza piani privati né registro dei tiri; **Genera un nuovo link** disattiva il
  vecchio.
- **Esporta dati (JSON)** scarica un vero file; **Importa** lo rilegge con anteprima
  (riconosciuti, da completare, non importati) e crea sempre una **nuova** scheda. Un file
  rotto o di un altro programma viene rifiutato con il suo motivo, senza cambiare nulla.
- **Vista stampabile** e **PDF compilabile** con le colonne C (Concentrazione) e R
  (Rituale) prese dall'SRD 5.2.1.
- **Collega alla campagna** (la stessa scheda entra nella campagna) oppure **Porta una
  copia** (un'istantanea indipendente); **Rilascia** (la campagna tiene la scheda, non
  assegnata, e tu tieni una copia); **Trasferisci** a un'altra tua campagna: il DM di
  destinazione accetta dalla sua pagina Personaggi o dalla campanella.
- Nuove schede della scheda personaggio: **Registro** (registro delle avventure, come il
  foglio Adventurers League) e **Revisioni** (confronto e ripristino come nuova revisione).

## File

Nuovi (dell'area): `design/blueprint/character-library.mjs` (sezione di stato, comandi,
interfaccia, registrazione), `design/blueprint/character-export.mjs` (proiezione in sola
lettura, JSON, PDF, QR: funzioni pure), `design/blueprint/character-library.css`,
`design/blueprint/tests/character-library.test.mjs` (22 test),
`changes/interview-01/blueprint-checks/character-library-journey.js` (17 controlli), questo
rapporto.

**Una modifica additiva a un file condiviso**, `design/blueprint/registry.mjs`,
`initState()`: `slice.seed()` → `slice.seed(state)` (più un commento). Motivo: la scheda
nomina Iria fra i dati d'esempio, ma nessun seme la creava e una sezione d'area non poteva
aggiungere un attore d'esempio. Il seme riceve lo stato e aggiunge Iria **solo se assente**,
solo quando la sezione `character-library` nasce (primo avvio con l'area, stato precedente,
"Ripristina esempio"); non cambia record esistenti. Verificato che **tutti** i semi delle
altre aree sono funzioni senza parametri (l'argomento è ignorato). `extensions.mjs` non è
stato toccato (l'area era già elencata).

## Capacità, percorso, prova

| Capacità (censimento)                                        | Percorso nell'app                                                                                             | Comandi ed esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Regola / fonte                                                                                             | Pattern adottato (prodotto + ID)                                                                                                         | Prova                                                                                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-86 elenco con ricerca, ordinamento, Copia/Elimina/Lascia  | Navigazione → Personaggi (1 clic). Gruppi "Le mie schede" e "Della campagna e affidate"; Cestino richiudibile | Ricerca immediata su nome, classe (nome della scheda **e** nome del catalogo, IT/EN), "livello N", specie, campagna; 8 ordinamenti; impostazione `character-library.sort` con ambito dispositivo (anche in Preferenze); Elimina → conferma → Cestino → Ripristina / Elimina definitivamente; Lascia la campagna (pedine tolte, la scheda resta) con Annulla                                                                                                                                      | Classi e specie dal catalogo SRD 5.2.1 (`character-rules.mjs`)                                             | D&D Beyond My Characters (DDB-063, SVC-014); vault Roll20 con ricerca/duplica/elimina (R20-013)                                          | Test "search…", "rendered list…", "delete…", "link vs bring a copy; leave…"; percorso §1a–1c e "Leave campaign"                                                                        |
| PG-87 privacy campagna / privata / pubblica con link         | Gestisci → Privacy e condivisione → Cambia privacy; badge con parola e icona su scheda e card                 | Tre livelli; tabella "chi vede cosa" e anteprima per un altro giocatore aggiornate al cambio; solo il proprietario cambia; per una scheda della campagna è una modifica condivisa (rifiutata offline), per una personale è locale                                                                                                                                                                                                                                                                | Decisioni I-174 (link di sola lettura)                                                                     | DDB tre livelli (DDB-061), scheda in sola lettura per i non proprietari senza comandi né registro (DDB-062), permessi Demiplane (CMP-13) | Test "privacy…", "link page…", "UI: privacy dialog…"; percorso §2, §2b                                                                                                                 |
| PG-88 copia indipendente                                     | Card → Copia, oppure Gestisci → Copia                                                                         | Nome modificabile; copia personale, fuori dalle campagne, con `copiedFrom`; esclusi campagne, pedine, condizioni ed effetti in corso, compagni, piani privati; registro facoltativo; Annulla dall'avviso                                                                                                                                                                                                                                                                                         | I-125                                                                                                      | Roll20 Copy (R20-014); DDB "copia come migrazione" (DDB-064)                                                                             | Test "copy…"; percorso §1b (voce di registro sulla copia, Iria invariata)                                                                                                              |
| PG-89 collegamento vivo vs istantanea, rilascia, trasferisci | Gestisci → Campagna                                                                                           | **Collega**: la stessa scheda entra nella campagna (con i controlli homebrew esistenti `connectCharacterWithContent`); **Porta una copia**: istantanea nella campagna, originale invariato; **Rilascia**: la campagna tiene la scheda con posto non assegnato (B13 `unassignSeat`, poi reclamabile), tu tieni una copia; **Trasferisci**: richiesta in attesa, il DM di destinazione accetta o rifiuta (lista + campanella B24), l'accettazione sposta campagna e toglie le pedine dalla vecchia | I-176 (trasferimento fra campagne), I-125                                                                  | Roll20 Add to Game / Import / Transfer / Release (R20-013, R20-014, R20-015); raccolta Solasta (CRP-012)                                 | Test "release…", "transfer…", "UI: transfer…"; percorso §4a–4c                                                                                                                         |
| PG-90 PDF compilabile e stampa                               | Gestisci → Vista stampabile (Stampa, Scarica PDF compilabile) oppure Gestisci → Scarica PDF                   | Anteprima "carta"; in stampa restano solo i dati della scheda; PDF 1.4 generato nel browser con 15 campi AcroForm (nome, classe e livello, specie, CA, PF, velocità, bonus, sei caratteristiche), inventario, capacità, tabella incantesimi con C/R, storia e registro                                                                                                                                                                                                                           | Concentrazione e Rituale dal catalogo `srd-sample.mjs` (SRD 5.2.1, con pagine); nessuna deduzione dal nome | DDB Export to PDF compilabile con note, concentrazione e rituali (DDB-065); Fight Club (CMP-11); Demiplane (CMP-15)                      | Test "PDF…"; percorso §3b; `pdftotext`/`pypdf` sul file scaricato; `pdf-iria-page1.png`                                                                                                |
| PG-91 esporta/importa nel formato proprio                    | Gestisci → Esporta dati (JSON); Personaggi → Importa                                                          | File `d20-studio.character` v1 (dati durevoli + registro; esclusi identità, campagne, pedine, turno, piani privati, storia di creazione); importazione con anteprima; sempre nuova scheda personale; messaggi distinti: JSON illeggibile, altro formato (Foundry, altro servizio, file della Biblioteca), versione più recente, dati insufficienti, oltre 512 KB; campi sconosciuti elencati e ignorati; provenienza SRD delle righe conservata                                                  | F-027/F-028, I-116 (niente sostituzione silenziosa)                                                        | Foundry Export/Import Data (FVT-205); FG /exportchar (R20-047)                                                                           | Test "export JSON round-trips…", "UI: import preview…"; percorso §3a (file rotto e file Foundry senza effetti)                                                                         |
| PG-93 condivisione rapida (link o QR)                        | Gestisci → Link e QR (dopo "Pubblica con link")                                                               | Link da copiare, QR SVG generato localmente (QR modello 2, livello M, versioni 1–10), Apri il link, Genera un nuovo link                                                                                                                                                                                                                                                                                                                                                                         | I-174                                                                                                      | Demiplane QR del personaggio (CMP-14)                                                                                                    | Test "QR code…"; nel percorso il QR è decodificato con `BarcodeDetector` di Chromium e coincide con il link, anche dopo la rigenerazione; il telefono EN 390 apre il link decodificato |
| PG-95 storico delle revisioni                                | Scheda → Revisioni                                                                                            | Salva revisione (nome facoltativo); confronto fra due revisioni qualsiasi o con la scheda attuale; Ripristina: anteprima "Cosa cambia", salvataggio automatico dell'attuale, poi nuova revisione; restano PF attuali (entro il nuovo massimo), risorse spese (anche oltre un massimo ridotto), condizioni, concentrazione, usi delle capacità; nessuna revisione viene cancellata                                                                                                                | Risorse: contratto DEVELOPMENT (spesi oltre un massimo ridotto restano registrati)                         | FG Character Vault con revisioni (R20-046)                                                                                               | Test "revisions…", "UI: sheet tabs…"; percorso §6 (ripristino, Annulla, correzione ripristinando la revisione automatica, reload)                                                      |
| PG-96 registro Adventurers League                            | Scheda → Registro                                                                                             | Voci con data, avventura, DM, livelli, oro, tempo libero, oggetti, note; totali; aggiungi/correggi/elimina solo il proprietario, con Annulla dall'avviso; il DM legge; incluso in JSON, stampa, PDF e link pubblico                                                                                                                                                                                                                                                                              | — (registro narrativo, nessuna regola eseguibile)                                                          | FG 5E scheda Log (R20-044)                                                                                                               | Test "adventure log…", "UI: sheet tabs…"; percorso "Adventure log"                                                                                                                     |

### Controlli d'accettazione della scheda

1. "mago", ordina per livello (conservato), copia Iria, elimina con conferma e recupero dal
   cestino: §1a–1c del percorso.
2. Livia privata, Doran non la vede; pubblica, il link apre una scheda in sola lettura
   senza comandi: §2 e §2b (vedi limite 1).
3. Esporta JSON e reimporta con anteprima; file malformato senza effetti; vista stampabile e
   PDF con concentrazione e rituali: §3a, §3b.
4. "Collega alla campagna" vs "porta una copia"; rilascia; trasferisci con accettazione:
   §4a–4c.
5. Link o QR aperti su telefono in sola lettura: ultimo blocco (EN, 390 px, tocco).
6. Revisione, confronto e ripristino come nuova revisione: §6.

## Comandi ed esiti

- `node --test design/blueprint/tests/character-library.test.mjs`: **22/22**.
- `node --test design/blueprint/tests/*.test.mjs`: **1102/1102** all'ultima esecuzione
  (1083/1083 subito dopo la modifica di `registry.mjs`). Un'esecuzione intermedia aveva 16
  fallimenti transitori in `account.test.mjs` e `notifications.test.mjs` (fuso orario,
  avatar dei membri), file di altre aree in lavorazione che non importano B21; rieseguita,
  la suite è verde.
- Percorso browser, dalla cartella di evidenza:
  `playwright-cli -s=d20-b21 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/character-library-journey.js`
  → **17/17**, nessun `pageerror`, eseguito tre volte con lo stesso esito (esito in
  `journey-result.json`). Nota del percorso: la richiesta di trasferimento arriva al DM anche
  dal centro notifiche B24.
- Regressioni sulle schermate toccate dalla sostituzione della pagina Personaggi (copie in
  scratchpad con le sole immagini dirette in `B21/regression/`, per non sovrascrivere
  l'evidenza altrui): `core-journey` 13/13, `builder-journey` 5/5, `media-journey` 13/13,
  `campaign-members-journey` 15/15 (con Iria presente il cortile conserva le sue 5 pedine),
  sezione 5 di `b11b-inc10-fixes-journey` (Invio su "Apri scheda", seleziona-tutto e
  Annulla nel campo di ricerca `data-character-filter`) superata.
  `b11b-inc10-fixes-journey` completo si ferma al passo 1 (Ctrl+Shift+J della fixture non
  mostra il rifiuto): succede **anche bloccando** `character-library.mjs` (prova A/B
  eseguita), quindi non dipende da B21.
- PDF scaricato dal percorso: `pdftotext` legge testo e accenti italiani; `pypdf` trova 15
  campi compilati (`name: Iria`, `class_level: Maga 5`, `species: Elfo`, …); PyMuPDF lo
  rende in `pdf-iria-page1.png` e `pdf-iria-page2.png`.

## Immagini (1440×900 salvo indicazione, nella cartella di evidenza)

`list-search-mago-it-1440`, `list-sorted-by-level-it-1440`, `copy-created-notice-it-1440`,
`delete-confirm-it-1440`, `trash-open-it-1440`, `privacy-private-audience-it-1440`,
`dm-sheet-private-livia-it-1440`, `share-link-qr-it-1440`, `public-link-readonly-it-1440`,
`import-malformed-it-1440`, `import-preview-it-1440`, `print-view-it-1440`,
`print-media-it-1440` (pagina intera, media di stampa), `link-vs-copy-it-1440`,
`dm-transfer-request-it-1440`, `revisions-compare-it-1440`,
`revision-restore-confirm-it-1440`, `adventure-log-it-1440`,
`leave-campaign-notice-it-1440`, `library-final-it-1440` (pagina intera),
`phone-link-readonly-en-390`, `phone-library-en-390`, `phone-manage-en-390`,
`pdf-iria-page1/2`. File: `d20-studio-livia.json`, `d20-studio-iria.pdf`,
`broken-character.json`, `foundry-actor.json` (fixture scritte con un vero download).
Ispezionate: nessun overflow, testi completi; a 390 px le tabelle scorrono nel loro
contenitore.

## Scelte dell'agente (pattern adattati)

1. **Privata come D&D Beyond**: il DM della campagna vede sempre le schede della sua
   campagna; "Privata" nasconde la scheda completa agli **altri giocatori**. È un livello di
   lettura distinto dalla scheda personale del core (`visibility: "private"`, fuori dalla
   campagna), che resta com'era.
2. **Cestino**: D&D Beyond conferma e cancella; la scheda B21 chiede il recupero, quindi
   Elimina sposta nel cestino con pedine, ordine d'iniziativa inattivo e posto B13 da
   ripristinare; il link pubblico resta spento dopo il ripristino. Rifiutata durante un
   incontro in corso o con creature compagne ancora legate.
3. **Annulla accanto al cambiamento** (avviso in alto o nella scheda Registro/Revisioni):
   nell'app non c'è un Annulla globale fuori dal Tavolo; il pulsante compare solo finché
   quella modifica è l'ultima annullabile per questa identità.
4. **Ultima modifica e data di creazione**: le date d'esempio sono sintetiche; per le
   schede create altrove si usa l'applicazione del costruttore, la copia, l'import o la
   prima osservazione; "modificata" è l'ultima modifica osservata **su questo dispositivo**
   (come l'ordinamento DDB, ricordato per dispositivo), mai dati condivisi né Undo.
5. **Rilascia** segue Roll20: la campagna tiene la sua scheda (proprietario: il DM della
   campagna, posto non assegnato reclamabile) e la libreria tiene una copia indipendente.
   Nascosto per il DM proprietario della campagna.
6. **Trasferisci** è fra campagne (I-176) verso campagne in cui giochi (elenco B13), con
   accettazione del DM di destinazione; senza altre campagne il dialogo lo spiega e porta a
   Campagne. Accettare toglie il posto B13 nella campagna di origine (come fa B13 quando un
   membro esce con i suoi personaggi).
7. **Importa** crea sempre una nuova scheda personale; la provenienza SRD delle righe
   viaggia come dato; profili di riposo e forme non si importano (si ricalcolano dal seme di
   classe quando c'è).
8. **Pesi in kg e velocità in m** nel PDF, come la scheda del core; la conversione EN in
   piedi della pagina è di un'altra area e non si applica al PDF.
9. La pagina Personaggi conserva gli agganci del core (`data-character-card`,
   `data-character-filter`, pulsante "Apri scheda", bozze private, Crea/Ricostruisci) e
   delega la scheda aperta a `renderCharacters`/`bindCharacters`; il pulsante "Apri scheda"
   ha il nome del personaggio come descrizione accessibile.

## Limiti onesti

1. Due sole identità dimostrative: nessuno "gioca Doran" come terza persona (Doran è del
   DM). "Doran non la vede" è provato dalla proiezione "altri giocatori" (anteprima nel
   dialogo, funzione `audienceAccess`) e dal link, non da una terza identità. Le altre aree
   (chat, gruppo, token) non consultano ancora il livello di privacy B21.
2. Il link pubblico e il QR funzionano nello stesso browser (lo stato locale è la
   simulazione del servizio); sul "telefono" del percorso lo stato è copiato nella nuova
   sessione prima di aprire il link. Nessun backend, nessuna revoca distribuita.
3. PDF: testo Helvetica/WinAnsi (caratteri fuori da Latin-1 diventano "?"), impaginazione
   semplice, verificato con PyMuPDF/pdftotext/pypdf e Chromium, non con Acrobat o Anteprima.
   Stampa: provato il richiamo di `window.print()` e il foglio di stile di stampa, non una
   stampante reale.
4. QR decodificato dal `BarcodeDetector` di Chromium su macOS; non provato con una
   fotocamera reale.
5. La copia non copia il ritratto e le immagini B28 (dati di un'altra area); le revisioni
   non si copiano; il cestino non scade.
6. Le capacità di classe del catalogo hanno nomi inglesi anche in italiano (dato
   preesistente del catalogo).
7. Scratchpad condiviso: all'inizio ho scritto file di prova con nomi generici
   (`look.js`, `reg-core-journey.js`, …) nella radice della scratchpad, poi spostati in
   `scratchpad/b21/`; se un'altra area usava copie con lo stesso nome vanno rigenerate.

## Modifiche suggerite a file non riservati (per il coordinatore)

1. `design/blueprint/DEVELOPMENT.md`, sezione "Areas and registry": `seed(state)` riceve lo
   stato; un'area può aggiungere i propri record d'esempio **se assenti** (B21: Iria).
2. `changes/interview-01/blueprint-checks/README.md`: aggiungere
   `character-library-journey.js` (sessione propria, cartella `2026-09-24/B21/`).
3. `b11b-inc10-fixes-journey.js` passo 1 (Ctrl+Shift+J) da riesaminare: fallisce anche
   senza B21.

## Correzioni della revisione (24/09/2026)

Revisione di B21 (evidenza del revisore in `2026-09-24/B21-review/`). Ogni rilievo è stato
**riprodotto** prima della correzione: con un test che falliva sul codice di prima (8 test
nuovi o modificati, tutti rossi prima e verdi dopo) e con il percorso nel browser.
Nessun rilievo è stato respinto come falso: erano tutti difetti reali. L'elenco dei rilievi che
ho ricevuto si interrompe a metà dell'ultimo (P3 "Rilascia"); ho corretto quel rilievo per
tutto ciò che il testo arrivato descrive.

### In breve, per il proprietario

- **Una scheda riservata ora è davvero riservata.** Il livello di privacy "Privata" si chiama
  ora **"Solo giocatore e DM"**. Gli altri giocatori vedono solo nome, classe, livello e
  giocatore: nella libreria, se aprono l'indirizzo della scheda, nella vista stampabile, nei
  file e nelle revisioni. Esempio: il DM rende Doran "Solo giocatore e DM"; il giocatore vede
  la card "Doran · Guerriero · Livello 3 · Giocatore: DM", senza PF, CA o "Apri scheda".
- **Il blocco del giocatore vale anche per le revisioni.** Se chi gioca Livia toglie al DM il
  permesso di modificare la scheda (B20), il DM può ancora confrontare le revisioni ma non
  salvarle né ripristinarle. Il pulsante "Vai a «Modifiche del DM»" lo porta alla richiesta di
  autorizzazione.
- **Le revisioni vecchie restano tue.** Quando colleghi una scheda a una campagna, la
  trasferisci o la rilasci, il DM vede la cronologia solo da quel momento ("Collegata a Le
  lanterne di Bruma"). Il dialogo "Collega" lo dice prima di confermare.
- **Gestisci è solo del proprietario**, come su D&D Beyond: esporta, PDF, stampa, privacy,
  copia. Chi consulta la scheda di un altro la apre soltanto, e quindi non può più esportarla e
  reimportarla come propria.
- **Niente avvisi falsi.** Offline una modifica condivisa viene rifiutata e non compare più
  "Voce aggiunta".
- **Cambi minori:** "liv" nella ricerca trova solo Livia. Dopo Copia il fuoco va sulla nuova
  card, dopo Elimina su "Ripristina". La revisione di Livia al livello 2 non ha più la
  sottoclasse. Rilascia sposta i tuoi piani privati sulla copia, dà alla copia un nome
  distinto ("Mira (copia)") e scrive un avviso chiaro. Il badge "Rilasciata da" sparisce
  quando qualcuno reclama la scheda.

### Rilievi, verifica e correzione

| Rilievo                                                                                            | Verificato                                                                    | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Prova                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 Revisioni aggirano il blocco B20 (PG-94)                                                        | Test: `restoreRevision` come DM con `dmSheetEdit.livia=false` riusciva        | Il tab usa `ctx.canControl` (con il blocco B20) più il controllo di dominio. `saveRevision`/`restoreRevision` passano da `requireSheetEdit`: `canControlActor` più `sheetLockedFor(policyOf(…))` di B20, importati da `campaign-settings-domain.mjs` (nessuna copia della regola), per ogni campagna della scheda. Da bloccato il DM confronta; un avviso spiega il blocco e "Vai a «Modifiche del DM»" apre la scheda Azioni, dove B20 ha "Chiedi autorizzazione"                                                                          | Test "revisions follow the B20 lock…"; percorso revisione P1-B20; `p1-dm-revisions-locked-it-1440.png`                                                                                       |
| P1 "Privata" non applicata                                                                         | Test: il giocatore apriva scheda, stampa, esportazione e tab di Doran privato | Nuovo cancello di lettura `sheetAccess(state, actor, viewer)` → `full` / `read` / `summary` / `none` (proprietario, controllo, DM o co-DM della campagna = `full`). Lo applicano card e ricerca (senza PF, CA, specie né "Apri scheda"), la rotta `characters` (un lettore `summary` riceve una pagina riepilogo al posto della scheda, anche da URL o da un link del Tavolo), stampa, PDF, JSON e le tab Registro/Revisioni (`when`). `canViewActor` (condiviso) non è stato toccato: la presenza al Tavolo non è una lettura della scheda | Test "a 'player and DM only' sheet…" (ruoli scambiati); percorso P1-privacy; `p1-player-library-doran-summary-it-1440.png`, `p1-player-doran-summary-page-it-1440.png`, `phone-*-en-390.png` |
| P1 Revisioni precedenti al collegamento visibili al DM                                             | Test: dopo `linkToCampaign` il DM leggeva "bozza privata"                     | Ogni revisione registra `owner` e `campaignIds` al momento della creazione. `revisionReadable` le mostra a chi possedeva la scheda allora e ai lettori di una campagna di allora che la scheda ha ancora. Una revisione senza ambito (dato vecchio) resta del suo autore. Collega e trasferimento aggiungono una revisione di partenza condivisa ("Collegata a…", "Trasferita da… a…"). Elenco, confronto, ripristino e conteggio in Gestisci usano `visibleRevisions`. Avvisi nei dialoghi Collega, Trasferisci e Rilascia                 | Test "revisions saved before linking, transfer or release…"; percorso P1-storia; `p1-link-disclosure-it-1440.png`, `p1-dm-revisions-after-link-it-1440.png`                                  |
| P2 Esporta/PDF/stampa per i non proprietari (clonazione)                                           | Test: Gestisci Doran come giocatore offriva Esporta                           | Gestisci, Esporta JSON, PDF, vista stampabile e "Gestisci personaggio" nella barra della scheda sono del solo proprietario (DDB Manage, DDB-065; R20-014; I-174). Rifiuto con messaggio se chiamati comunque. Tolta la cancellazione incoerente di `notes` nell'esportazione                                                                                                                                                                                                                                                                | Test "only the owner manages…"; percorso P2-export; `p2-dm-library-manage-own-only-it-1440.png`                                                                                              |
| P2 Avviso di successo dopo un commit rifiutato                                                     | Test con dialogo che si comporta come `app.mjs` (try/catch): l'avviso restava | In Registro (aggiungi, correggi, elimina) e Revisioni (salva, ripristina) l'avviso si imposta solo dopo che `ctx.commit` ha accettato la modifica                                                                                                                                                                                                                                                                                                                                                                                           | Test "a refused commit (offline)…"; percorso P2-offline; `p2-offline-no-false-notice-it-1440.png`                                                                                            |
| P2 "Privata" indica due cose diverse; messaggio del link; esempio "chi gioca Doran" gestendo Doran | Test sulla resa di badge, dialogo e link                                      | Le etichette dicono chi legge: "Solo campagna", **"Solo giocatore e DM"**, "Pubblica con link". Una scheda fuori da ogni campagna mostra **"Personale"**, perché nessuno la legge e il livello vale solo quando entra in una campagna (il dialogo lo spiega). Il valore salvato resta `private`, lo stesso che usa l'area Home. Il link non più pubblico dice "non condivide più questa scheda con un link". L'esempio nomina un personaggio di un altro giocatore della stessa campagna                                                    | Test "only the owner manages…; names…"; percorso P1-privacy                                                                                                                                  |
| P2 Test insufficienti                                                                              | Letti harness e test                                                          | Harness: `canControl` come `app.mjs` (con blocco B20) e `submitLikeApp` (rifiuto con dialogo aperto). 7 test nuovi (sopra) più 3 asserzioni aggiornate (DM senza Gestisci su Livia, seme senza sottoclasse)                                                                                                                                                                                                                                                                                                                                 | 29/29                                                                                                                                                                                        |
| P3 Ricerca: "liv" trovava tutti                                                                    | Test                                                                          | Il livello non è più testo nel testo di ricerca. `matchesQuery`: ogni parola deve corrispondere; un numero corrisponde al livello; "livello 5", "level 5" e "liv 5" solo al livello. La stessa funzione filtra lista e DOM                                                                                                                                                                                                                                                                                                                  | Test "search matches a level…"; percorso P3-search; `p3-search-liv-it-1440.png`                                                                                                              |
| P3 Fuoco perso dopo Copia/Importa/Porta una copia/Elimina                                          | Browser: `activeElement` era `BODY`                                           | Il fuoco si applica dopo la chiusura del dialogo nativo (`setTimeout` 0): sulla nuova card, oppure su "Ripristina"/"Annulla" dell'avviso dopo Elimina, Lascia e Rilascia                                                                                                                                                                                                                                                                                                                                                                    | Percorso P3-focus (Invio nel nome → "Apri scheda" di "Livia (copia)"; Elimina → "Ripristina", Invio ripristina)                                                                              |
| P3 Revisione di Livia al livello 2 con sottoclasse                                                 | Test sul seme                                                                 | `liviaLevelTwo` toglie `subclassId` (nell'SRD 5.2.1 il Mago sceglie la sottoclasse al 3° livello)                                                                                                                                                                                                                                                                                                                                                                                                                                           | Test del seme; percorso                                                                                                                                                                      |
| P3 Rilascia: piani cancellati, badge dopo il reclamo, due "Livia", avviso povero                   | Test                                                                          | I piani privati di chi rilascia (`personalPlans[chi]`, `futurePlan`) passano alla copia; senza copia vengono eliminati, come dice il dialogo. I piani degli altri restano sulla scheda. La copia ha un nome modificabile (predefinito "Mira (copia)"). Avviso "Mira resta in … come personaggio non assegnato. La tua copia: Mira (copia)" con "Apri la copia" e "Annulla". "Rilasciata da" si vede solo finché il posto B13 è libero                                                                                                       | Test "release keeps the player's private plans…"; percorso P3-release (con "Reclama" di B13); `p3-release-*-it-1440.png`                                                                     |

### File

Solo file di B21: `design/blueprint/character-library.mjs`, `design/blueprint/character-library.css`
(regole per la pagina riepilogo e l'avviso di blocco), `design/blueprint/tests/character-library.test.mjs`,
`changes/interview-01/blueprint-checks/character-library-journey.js` (aggiornato: nuovo nome del
livello; il DM non ha Gestisci su Livia), **nuovo**
`changes/interview-01/blueprint-checks/character-library-review-journey.js`, questo rapporto.
**Nessuna modifica a file condivisi.** B21 usa `sheetLockedFor`/`policyOf` di B20 tramite import.

### Comandi ed esiti

- `node --test design/blueprint/tests/character-library.test.mjs`: **29/29** (7 test nuovi).
- `node --test design/blueprint/tests/*.test.mjs`: **1298/1302** all'ultima esecuzione. I 4
  fallimenti sono tutti in `assistant.test.mjs`, un'area in lavorazione (`assistant*.mjs`
  modificati alle 08:41) che non importa B21; nell'esecuzione precedente erano 2.
  Un'esecuzione ancora prima aveva un fallimento in `preferences.test.mjs` ("sheet-only
  panel", area modificata alle 08:37): rieseguito, passa 23/23. `character-library` e `home`
  (che importa B21) insieme: 53/53.
- Percorso principale (sessione `d20-b21`, cartella `2026-09-24/B21/`): **17/17**, nessun
  `pageerror`, eseguito due volte (`journey-result.json`).
- Percorso delle correzioni:
  `playwright-cli -s=d20-b21 --raw run-code --filename=…/character-library-review-journey.js`
  → **10/10**, nessun `pageerror`, eseguito due volte. Esito in
  `B21/review-fixes/review-journey-result.json`, immagini in `B21/review-fixes/`: IT 1440 con
  entrambe le identità, EN 390 con tocco, nessun overflow, controlli ≥ 40 px.

### Limiti onesti (aggiornati)

1. Con due sole identità, "un altro giocatore" è provato **a ruoli scambiati**: il DM
   possiede Doran e lo riserva, il giocatore lo legge. Altre aree mostrano ancora dati della
   scheda senza consultare il livello B21, per esempio i PF nel pannello "solo scheda" delle
   Preferenze e il Gruppo della campagna. Il cancello da usare è `sheetAccess` (esportato).
2. Il DM vede la cronologia condivisa con la numerazione globale: per esempio parte da
   "Revisione 3". Il numero rivela che esistono revisioni precedenti, ma non il loro
   contenuto.
3. Le revisioni salvate prima di questa correzione (stato locale di un browser) non hanno
   ambito e restano visibili al solo autore. "Ripristina esempio" rigenera i dati d'esempio
   con l'ambito.
