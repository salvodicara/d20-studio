# B15 — Materiali, handout, spilli e scena senza mappa: prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`) · sessione
browser `d20-b15` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B15/` (fuori dal checkout).

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B15 (PR-07, PR-49…PR-53, TV-108, TV-109).
Righe di mercato lette: `market-census/vtt-light.md` (VTL-078, VTL-080, VTL-090, VTL-162),
`roll20-fgu.md` (R20-055, R20-056, R20-099, R20-139), `dndbeyond.md` (DDB-099, DDB-100,
DDB-101, DDB-129, DDB-130, DDB-131), `foundry.md` (FVT-087, FVT-088, FVT-162),
`campaign-tools.md` (CMP-34, CMP-94, CMP-124…CMP-128), `crpg.md` (CRP-072).

## File

Nuovi, tutti dell'area `handouts`:

- `design/blueprint/handouts.mjs` — modulo d'ingresso `register(registry)`: interfaccia,
  finestre di dialogo, contributi del registro (17, contando quelli della scheda di
  preparazione), eventi.
- `design/blueprint/handouts-domain.mjs` — dominio puro: materiali, accesso e destinatari,
  proiezioni per ruolo, spilli, scene senza mappa, rivelazioni, vignette, segni di lettura.
- `design/blueprint/session-prep.mjs` — scheda di preparazione (dominio e interfaccia),
  registrata dallo stesso modulo d'ingresso.
- `design/blueprint/handouts-art.mjs` — 7 illustrazioni vettoriali sintetiche disegnate per il
  prototipo (lettera, forziere-mimic, taverna, cripta, carro, avviso, goblin).
- `design/blueprint/handouts.css` — solo classi `.handouts-*` (più `dialog:has(...)` per
  allargare le finestre dell'area).
- `design/blueprint/tests/handouts.test.mjs` (23 test), `tests/session-prep.test.mjs` (13 test).
- `changes/interview-01/blueprint-checks/handouts-journey.js` — percorso nel browser.

File condivisi modificati: **nessuno**. `extensions.mjs` elencava già `handouts` (B15).

Stato: `state.ext.handouts` (materiali con etichette DM, spilli, scene senza mappa, immagini
caricate qui prima di B28, solo in lettura; `undo: "snapshot"`), `state.ext["handouts-seen"]` (segni "visto" per identità;
`undo: "preserve"`), `state.ext["handouts-prep"]` (schede di preparazione; `undo: "snapshot"`).
Impostazione di dispositivo `handouts-view.dim-pins` (spilli semitrasparenti).

## Dove si trova (≤ 3 clic)

| Superficie                                                                                                                        | Percorso                                        | Chi                                     |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------- |
| Preparazione › Materiali (sottoschede Materiali, Spilli, Scene senza mappa, Immagini)                                             | Campagna → Preparazione → Materiali             | DM                                      |
| Preparazione › Sessione (scheda in otto passi)                                                                                    | Campagna → Preparazione → Sessione              | DM                                      |
| Campagna › Materiali (riaprire ciò che è stato mostrato)                                                                          | Campagna → Materiali                            | tutti (proiezione per ruolo)            |
| Tavolo › pannello Materiali (Materiali di questa scena e altri · Spilli · Segreti per il DM; "Condivisi con te" per il giocatore) | Tavolo → Materiali                              | tutti                                   |
| Tavolo › strumento Spillo, livello spilli, palcoscenico senza mappa                                                               | Tavolo → barra della mappa                      | DM (strumento); spilli rivelati a tutti |
| Tavolo › ispettore "Aspetto" (Rivela aspetto…) e "Scena senza mappa"                                                              | seleziona una pedina / scena senza mappa attiva | DM; giocatore solo per riaprire         |
| Menu della pedina (B12) › Rivela aspetto…                                                                                         | clic destro sulla pedina                        | DM                                      |
| Finestra "Il DM ti mostra…"                                                                                                       | automatica sullo schermo del destinatario       | giocatore                               |
| Ricerca, notifiche, comando `L`, Preferenze › Spilli sulla mappa                                                                  | servizi della shell                             | secondo il ruolo                        |

## Capacità → prova

| Capacità (censimento)                                                 | Percorso                                                                                               | Comandi e risultato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Regola / fonte                                                                              | Pattern adottato (prodotto, ID)                                                                                                                                                                                                                                          | Prova                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PR-49** Handout con testo/immagine, parte giocatori e parte DM      | Preparazione › Materiali › Nuovo handout                                                               | Titolo, immagine dalle illustrazioni del prototipo o da Biblioteca › Immagini e file (B28: caricamento, provenienza e licenza; un file personale non condiviso è rifiutato con la regola), testo per i giocatori, nota del DM, intestazioni con estratto per i giocatori e nota DM, scene collegate (al Tavolo il materiale sta in cima, fra i "Materiali di questa scena"; il visore del DM nomina le scene), etichette solo DM e ricerca. Nasce "Solo DM". Modifica, Duplica, anteprima "Come lo vede un giocatore…" per personaggio, eliminazione annullabile                                                                                                                                                                                                                         | Nessuna regola SRD: contenuto narrativo del DM (`authored`)                                 | Alchemy handout con etichette (VTL-080) e note di scena (VTL-078); DDB Scene Prep (DDB-099); Roll20 GM Notes separate (R20-056)                                                                                                                                          | test "a handout shown only to Livia…", "authoring validation…", "linked scenes work on a map scene…", "materials search…"; percorso passi 2 e 6; `01-dm-new-handout.png`, `03-dm-materials-list.png`, `03b-dm-materials-search.png`, `08c-dm-drawer-scene-materials.png`, `08d-dm-viewer-linked-pins.png` |
| **TV-108** Mostrare a tutti o a scelti; riaprirlo dopo                | Materiali › Mostra… (anche dal pannello del Tavolo e da Campagna)                                      | "Tutto il gruppo" o "Solo alcuni personaggi" (Livia · giocatore, Doran · gestito dal DM, Mira · giocatore). Si apre subito come finestra sullo schermo dei destinatari; il segno "visto" si registra quando il giocatore la chiude (privato, locale, consentito offline, fuori dall'Undo). Riapertura da Campagna › Materiali, dal pannello del Tavolo e dal percorso diretto usato da ricerca e notifiche. Ritira accesso con motivo; Annulla ultima modifica ritira una mostra sbagliata                                                                                                                                                                                                                                                                                               | Nessuna regola SRD                                                                          | Foundry Show Players a tutti o scelti (FVT-162); Roll20 mostrare concede la lettura (R20-055); Alchemy pannello per riaprire (VTL-162)                                                                                                                                   | test "recipients are respected…", "seen marks are private…", "withdrawing access…"; percorso passi 2–4; `02-dm-show-players.png`, `04-player-popup-letter.png`, `05-player-campaign-materials.png`                                                                                                        |
| **PR-50** Spilli collegati a voce o intestazione, nascosti di default | Tavolo → strumento Spillo → clic sulla mappa (o Invio, o "Aggiungi spillo…" nel pannello)              | Collegamento a "Cripta sotto l'osservatorio › Ingresso": etichetta proposta dall'intestazione; spunta esplicita "Usa il testo per i giocatori dell'intestazione collegata" (estratto in sola lettura che segue la voce; senza spunta l'estratto resta fisso); nasce nascosto (tratteggiato). `L` sulla mappa o pulsante nel pannello → semitrasparenti, ricordato sul dispositivo. Trascinamento del DM (un commit al rilascio, trattenuto dentro la mappa), Invio da tastiera, "Collegato a" apre la voce all'intestazione evidenziata, "Vai allo spillo" dalla Preparazione e dal visore del materiale. L'icona del tipo è visibile ai giocatori una volta rivelato (detto nell'editor). Rivelato: il giocatore vede etichetta ed estratto, mai la nota DM né la voce se non condivisa | Nessuna regola SRD                                                                          | Roll20 Map Pins legati a handout/intestazione, nascosti di default, "use blockquote as player flavour text", Go to Pin dal menu dell'handout (R20-099); DDB spilli DM e tasto L semitrasparente (DDB-099); Foundry note su mappa (FVT-087, icona libro del livello Note) | test "pins: linked to an entry heading…", "pin editor: explicit 'use the heading text'…", "contributions: …L command"; percorso passi 5–6; `06-dm-new-pin.png`, `07-dm-pins-dim.png`, `08-player-pin-excerpt.png`, `21-phone-en-pin-touch.png`                                                            |
| **PR-51** Spilli come promemoria del DM                               | Tavolo / Preparazione › Spilli                                                                         | Tipi Luogo, Negozio, Trappola, Stranezza, Tesoro; spillo senza collegamento = promemoria (esempio seminato "Pozzo del cortile", mai visto dai giocatori)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Nessuna regola SRD                                                                          | DDB spilli come promemoria generali (DDB-100)                                                                                                                                                                                                                            | test "contributions…" (il pozzo non è nel livello del giocatore); percorso passo 5 (controllo sull'HTML del giocatore)                                                                                                                                                                                    |
| **PR-07** Scena senza mappa con materiali e note                      | Preparazione › Materiali › Scene senza mappa → Nuova scena senza mappa → Attiva al Tavolo…             | "Taverna": immagine di scena, descrizione per i giocatori, note DM, partecipanti in scena (Livia, Doran, Mira), handout appesi. Scena vera in `state.scenes` (`gridVisible: false`, base vuota), elencata anche fra le Scene del core; al Tavolo palcoscenico con immagine e titolo, nessuna griglia, pannello che spiega "nessuna griglia né misura" e i materiali della scena                                                                                                                                                                                                                                                                                                                                                                                                          | Nessuna regola SRD; nessuna misura applicata dall'area                                      | DDB Theater of the Mind organizer (DDB-101); Alchemy scena narrativa (VTL-078, senza musica: F-030)                                                                                                                                                                      | test "map-less Taverna…"; percorso passo 13; `15-dm-new-mapless.png`, `16-dm-taverna-table.png`, `16b-dm-taverna-drawer.png`, `17-player-taverna-table.png`, `19-phone-en-table-drawer.png`                                                                                                               |
| **TV-109** Rivelare l'arte di una creatura dalla pedina               | Tavolo → seleziona la pedina → ispettore "Aspetto" → Rivela aspetto… (anche dal menu della pedina B12) | Il Mimic creato in Preparazione (Crea PNG…) ha l'immagine "Un forziere con i denti" proposta per prima; ricerca per parole (anche parziali); anteprima; didascalia; destinatari. Ai giocatori arriva solo immagine e didascalia, mai nome o scheda; riapribile dall'ispettore selezionando la pedina                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Nessuna regola SRD (il Mimic è un PNG personalizzato della Preparazione, non il blocco SRD) | DDB Reveal accanto al blocco statistiche (DDB-130); Reveals browser con ricerca permissiva (DDB-129); immagini proprie caricate (DDB-131, con file e non con zona di trascinamento)                                                                                      | test "reveal from a token…", "English labels and the reveal panel…"; percorso passi 8–9; `09-dm-reveal-from-token.png`, `10-player-mimic-reveal.png`                                                                                                                                                      |
| **PR-53** Vignette con immagine e opzioni                             | Preparazione › Nuova vignetta (2–6 scelte) → Mostra…                                                   | "Il carro rovesciato", tre scelte: i giocatori indicano una scelta per ciascuno dei loro personaggi destinatari (Livia, Mira; non Doran). Il DM vede chi ha scelto cosa e decide l'esito con un racconto; l'esito (e ogni correzione) arriva ai destinatari come nuova finestra "Il DM ha deciso l'esito" e notifica; poi le scelte si bloccano. Correzione dell'esito solo con motivo, registrata; il giocatore vede "Corretto". Una scelta già votata non si può togliere. "Duplica" crea una copia riutilizzabile, solo DM, senza scelte                                                                                                                                                                                                                                              | Nessuna regola SRD; nessun tiro in quest'area                                               | DOS2 GM Vignettes, carte riutilizzabili e cercabili (CRP-072); Foundry Show Players (FVT-162) per l'esito                                                                                                                                                                | test "vignette: players see the options…", "a decided or corrected vignette outcome…", "duplicate…"; percorso passo 10; `11-player-vignette-choices.png`, `12a-player-outcome-popup.png`, `12-player-vignette-outcome.png`                                                                                |
| **PR-52** Scheda di preparazione con segreti riportati                | Preparazione › Sessione; Tavolo › Materiali › Segreti                                                  | Otto passi (personaggi, inizio forte, scene collegabili alle scene preparate, segreti, luoghi collegabili ai materiali, PNG, mostri collegabili alle creature, ricompense) con "Solo i passi essenziali" (tre). Ogni riga collegata ha "Apri": anteprima della scena, scheda della creatura, visore del materiale. Numerata dalla sessione del Tavolo (B14); finita la sessione, un solo "Chiudi la scheda…" nel riquadro che lo propone. Salvataggio automatico lasciando il campo, con fuoco conservato. Segreti spuntati in gioco dal Tavolo (mouse e Spazio), Undo di una spunta sbagliata. "Chiudi sessione…" rende la scheda di sola lettura e crea la successiva con i soli segreti non rivelati ("Riportato"); "Nuova scheda dal modello" con un clic                            | Metodo di preparazione d'autore (Sly Flourish, CMP-124), non una regola di gioco            | Lazy DM otto passi e tre essenziali (CMP-124/125), segreti riportati (CMP-126), non legati a un luogo, circa la metà (CMP-127), scheda da modello con un clic (CMP-128)                                                                                                  | 13 test di `session-prep.test.mjs`; percorso passo 11; `13-dm-table-secrets.png`, `14-dm-session-prep.png`, `14b-dm-session-ended-banner.png`, `14c-dm-prep-open-creature.png`, `20b-phone-en-session-prep.png`                                                                                           |

Dati coerenti con lo stato esistente: campagna `lanterns` ("Le lanterne di Bruma"), scena
`old-watch`, Livia/Mira (giocatore), Doran (gestito dal DM nel seme), Sentinella ed
Esploratore (goblin); la scheda di preparazione cita Maestro Oben, la cripta, il pozzo e la
pozione di guarigione già presente nell'inventario di Livia.

## Comandi eseguiti e risultati

```sh
node --test design/blueprint/tests/handouts.test.mjs design/blueprint/tests/session-prep.test.mjs
# 36/36 pass (24/09, dopo le correzioni della revisione)
node --test design/blueprint/tests/*.test.mjs
# vedi "Review fixes" in fondo: risultato dell'ultima esecuzione e fallimenti di altre aree
node /Users/salvatoredicara/Workspace/d20-studio/node_modules/prettier/bin/prettier.cjs --check \
  design/blueprint/handouts*.mjs design/blueprint/session-prep.mjs design/blueprint/handouts.css \
  design/blueprint/tests/handouts.test.mjs design/blueprint/tests/session-prep.test.mjs
# All matched files use Prettier code style (il percorso è formattato e poi privato del
# punto e virgola dell'espressione esterna, come richiede il README dei percorsi)
cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B15
playwright-cli -s=d20-b15 --raw run-code \
  --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/handouts-journey.js
# 15/15 passi, errors: [] (24/09, codice finale dopo le correzioni della revisione)
```

Passi del percorso (contesto nuovo 1440×900 in italiano, poi contesto touch 390×844 in inglese
con una copia dello stato sintetico):

1. "Cosa è pronto": `B15 · Materiali, handout, spilli e scena senza mappa — attiva · 17
contributi`, nessun avviso.
2. DM: Lettera sigillata con immagine, testo, nota DM ed etichette; Mostra solo a Livia; Cripta
   solo a Doran; ricerca "sigillo" (solo un'etichetta) lascia la lettera, il campo tiene il
   fuoco, "zzz" mostra il messaggio vuoto.
3. Giocatore: finestra con immagine e testo, Ingrandisci, nessuna nota DM né Cripta nell'HTML
   della pagina; dopo il reload nessuna seconda finestra; riaperta da Campagna, Tavolo e
   percorso diretto; chiusa, l'indirizzo perde l'`id`: né il reload né il passaggio al DM la
   riaprono.
4. DM: mostra sbagliata annullata (correzione nel registro); ritiro con motivo; anteprima per
   personaggio; offline la mostra è rifiutata con messaggio e nulla cambia.
5. Spillo: strumento, collegamento all'intestazione con la spunta esplicita (tolta rende
   l'estratto modificabile), nascosto, `L` (ricordato dopo il reload) e ripristino dal
   pannello, trascinamento, trascinamento fuori mappa trattenuto al bordo e annullato, Invio da
   tastiera, salto all'intestazione, rivelazione; il giocatore vede solo l'estratto.
6. Scena collegata: la Cripta in cima ai "Materiali di questa scena" del cortile; il visore del
   DM nomina la scena e lo spillo; "Vai allo spillo" lo evidenzia sulla mappa.
7. Spillo collegato a una voce del Mondo (sezione riservata mai proposta come estratto).
8. Mimic creato in Preparazione; Rivela aspetto dall'ispettore con ricerca e didascalia;
   finestra del giocatore senza il nome della creatura; riapertura dalla pedina.
9. Menu della pedina (clic destro) → Rivela aspetto… con l'immagine dei goblin per prima.
10. Vignetta: scelte di Livia e Mira, non di Doran; esito del DM arrivato al giocatore come
    finestra; scelte bloccate; correzione solo con motivo, anch'essa arrivata come finestra
    "Corretto"; Duplica crea una copia solo DM senza scelte.
11. Sessione: segreti spuntati al Tavolo (mouse e Spazio), Undo, inizio forte salvato, PNG
    aggiunto, passi essenziali; "Apri" sulle righe collegate (visore della Cripta, scheda della
    Sentinella, anteprima del cortile); sessione terminata con un solo "Chiudi la scheda…";
    chiusura con 5 segreti riportati, dopo reload.
12. Taverna senza mappa creata e attivata; nessuna griglia; palcoscenico e pannello per DM e
    giocatore; l'Avviso appeso in cima al pannello del DM; note DM private; presente fra le
    Scene del core.
13. Immagini B28: file personale rifiutato con la regola, file condiviso arrivato al giocatore.
14. Nessuno scorrimento orizzontale a 1440 sulle pagine dell'area.
15. Telefono EN 390 touch: materiali, visore, palcoscenico e pannello, pannello DM con i
    materiali della scena, pagine DM ed editor senza overflow; riga di mostro collegata aggiunta
    al tocco con "Open" (≥ 40 px); cortile riattivato dalle Scene del core; spillo rivelato
    toccato (area 44 px).

(La numerazione delle "Capacità" rimanda a questi passi; il percorso riporta 15 voci in
`passed`.)

Schermate (1440×900 salvo le `phone`), ispezionate una per una: `01`–`17b` desktop, `18`–`21`
telefono in inglese; tutte rigenerate il 24/09 alle 08:07–08:08 dal codice finale. Difetti trovati e corretti durante l'ispezione: righe vuote nella griglia
dei passi (allineamento in alto), evidenziazione blu del tocco sullo spillo, area di tocco
dello spillo troppo piccola sul telefono (ora ≥ 44 px a qualunque scala).

## Difetti trovati durante lo sviluppo

- Collisione di attributi: la scheda di preparazione usava `data-prep-*`; `bindPreparation`
  del core lega gli stessi selettori su tutta la pagina (errore `showEditorError` e il pulsante
  "nuova scheda" avrebbe aperto "Nuova scena"). Rinominati tutti in `data-hs-prep-*`. Nota per
  gli altri costruttori: dentro le pagine del core non usare i prefissi `data-prep-`,
  `data-table`, `data-campaign-` del core.
- La finestra "Il DM ti mostra…" segnava il materiale come visto all'apertura: una navigazione
  che la chiudeva (la shell chiude le finestre a ogni `navigate`) l'avrebbe persa. Ora il segno
  si registra solo quando il giocatore la chiude (pulsante o Esc).

## Limiti onesti

- Due identità locali in un solo browser. "Solo a Livia" raggiunge l'identità giocatore che
  controlla Livia (e anche Mira, stessa persona nel seme); Doran è gestito dal DM nel seme, quindi
  "solo a Doran" dimostra l'esclusione del giocatore ma non un terzo partecipante. Nessun
  backend, nessuna consegna in tempo reale: la finestra compare quando l'identità del giocatore
  è attiva (cambio di ruolo, caricamento, navigazione). Tutto lo stato, note DM comprese, resta nel
  `localStorage` di questo browser: la privacy è una proiezione dell'interfaccia, non un
  controllo d'accesso.
- Immagini: 7 illustrazioni sintetiche più le immagini di Biblioteca › Immagini e file (B28),
  dove avvengono caricamento, provenienza e licenza; quest'area non carica file. Le immagini
  caricate qui prima di B28 restano leggibili. Niente video, niente raccolta di migliaia di
  immagini (DDB-129). "Ingrandisci" apre lo schermo intero con trascinamento, rotella, pizzico e
  tastiera.
- Spilli: niente codici numerati di luogo (FVT-088), operazioni in blocco, dimensione/colore
  personalizzati, importazione/esportazione (VTL-090) né scorciatoia "mostra a tutti" Maiusc+Z
  (R20-139). Rivelato, lo spillo mostra ai giocatori l'icona del suo tipo (come l'icona di
  Roll20); l'editor lo dice. Si posano sulla scena attiva; la posizione di qualunque spillo si corregge da
  "Modifica…" con X/Y. Il collegamento punta ai materiali dell'area, non alle voci Mondo della
  campagna.
- Scena senza mappa: l'area nasconde griglia e scala e spiega che le distanze sono narrative,
  ma il movimento del core resta attivo sulle pedine in scena (spende metri in combattimento) e
  la didascalia del core mostra ancora la scala. Il Tavolo del core richiede almeno una pedina
  visibile, perciò la scena chiede almeno un partecipante. Nessuna mappa tattica annidata come in
  Alchemy (VTL-078).
- Rivelazione: il Mimic del percorso è un PNG personalizzato creato con la Preparazione; il blocco
  statistiche SRD 5.2.1 del Mimic non è implementato. Il nome sulla pedina resta gestito dal core
  e da B12 (nascondi nome).
- Vignette: nessuna prova o tiro richiesto da una scelta (DOS2 descrive prove decise dal GM);
  l'esito è un testo deciso dal DM. Riuso con "Duplica" e ricerca con etichette; nessuna
  cartella (CRP-072) né etichetta come filtro separato.
- Scheda di preparazione: non collegata agli appuntamenti di Sessioni né al diario/resoconto
  (CMP-94, CMP-34 solo in parte: lo storico delle schede chiuse). Il salvataggio automatico
  avviene lasciando il campo: un testo digitato e non confermato si perde con un reload.
- Ricerca e notifiche sono fornitori registrati; il percorso prova il loro percorso di
  destinazione (`#campaign?tab=handouts&id=…`), non l'interfaccia di B23/B24.
- Undo è quello globale a istantanee: annulla l'ultima modifica della stessa identità; i segni
  "visto" sono preservati.

## Review fixes

24/09/2026, 07:53–08:11 · sessione browser `d20-b15` · riproduzioni e verifiche in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B15/review-fix/` (`repro-route-drag.js`
prima delle correzioni, `verify-route-drag.js` dopo; `failure-before-fix-0504.png` è la
schermata di errore dell'ultima esecuzione del costruttore, spostata qui). Tutti i nove rilievi
sono stati riprodotti e sono difetti reali; il quarto punto dell'ultimo P3 è risolto con una
nota invece di cambiare il comportamento (motivo sotto).

| Grav. | Rilievo                                                                                                                         | Riproduzione                                                                                            | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Prova                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| P2    | Il percorso falliva al passo 9 (due "Chiudi la scheda…"); schermate 15–21 vecchie                                               | causa confermata dal test: con la sessione terminata la pagina aveva 2 `data-hs-prep-close`             | locatore limitato a `[data-hs-prep-ended] [data-hs-prep-close]` e causa tolta (P3 sotto); percorso rieseguito sul codice finale, tutte le schermate rigenerate (08:07–08:08)                                                                                                                                                                                                                                                                                                                                                                                                    | percorso 15/15, `errors: []`; `14b-dm-session-ended-banner.png`                                                         |
| P2    | "Scene collegate" senza effetto sulle scene con mappa                                                                           | nel pannello del Tavolo nessun gruppo per la scena; solo il palcoscenico senza mappa leggeva `sceneIds` | pannello Materiali del DM: "Materiali di questa scena · ‹scena›" in cima, poi "Altri materiali" (Alchemy VTL-078, DDB Scene Prep DDB-099); il visore del DM elenca "Scene collegate" (con "Attiva al Tavolo") e "Spilli collegati"; la scheda del materiale in Preparazione nomina la scena; l'editor spiega dove compare                                                                                                                                                                                                                                                       | test "linked scenes work on a map scene…"; percorso passi 6 e 12; `08c`, `08d`, `16b`, `19b-phone-en-dm-drawer.png`     |
| P3    | Due pulsanti identici a sessione terminata                                                                                      | test: 2 pulsanti                                                                                        | l'intestazione nasconde il suo pulsante quando il riquadro "sessione terminata" lo propone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | test "an ended Table session shows one…"; percorso passo 11 (conteggio = 1)                                             |
| P3    | Spillo trascinato fuori mappa disegnato fuori, posizione salvata diversa                                                        | riprodotto: `translate(-2935,266)` con spillo salvato a (560,290)                                       | trascinamento trattenuto fra 0 e larghezza/altezza della scena come il selettore; se il salvataggio è rifiutato (offline) lo spillo torna dov'è salvato                                                                                                                                                                                                                                                                                                                                                                                                                         | `verify-route-drag.js`: `translate(0,266)` = salvato (0,266); percorso passo 5 (bordo, poi Undo a 560)                  |
| P3    | Il collegamento diretto restava nell'indirizzo e riapriva il materiale                                                          | riprodotto: dopo la chiusura `&id=material-notice`, riaperto al passaggio al DM (con nota DM)           | alla chiusura (pulsante, Esc, cambio di ruolo) l'`id` è tolto con `history.replaceState`; l'apertura è legata alla navigazione (l'oggetto `view` della shell), non all'`id`: un nuovo clic sullo stesso collegamento riapre, un nuovo render o un cambio di ruolo no                                                                                                                                                                                                                                                                                                            | `verify-route-drag.js` (chiusura, Esc, cambio di ruolo con finestra aperta, reload); percorso passo 3                   |
| P3    | Estratto "collegato" per regola implicita; niente "Vai allo spillo" dall'handout                                                | riprodotto con `probe4.js` della revisione: `excerptLinked: true` senza alcun controllo                 | spunta esplicita "Usa il testo per i giocatori dell'intestazione collegata (si aggiorna quando la modifichi)" (R20-099 "use blockquote as player flavour text"): con la spunta l'estratto è in sola lettura e segue la voce, senza resta fisso anche se uguale; disabilitata se il testo collegato non ha parte per i giocatori. "Vai allo spillo" / "Vedi sulla mappa…" per ogni spillo nel visore del DM (R20-099 Go to Pin)                                                                                                                                                  | test "pin editor: explicit…", "linked scenes…"; percorso passi 5–6; `06-dm-new-pin.png`, `08d`                          |
| P3    | Righe collegate della scheda senza azione                                                                                       | test: nessun controllo oltre al select                                                                  | "Apri" accanto a ogni riga collegata, con nome accessibile "Apri: ‹bersaglio›": scena → anteprima "Apri per me" della Preparazione, creatura → scheda, materiale → visore                                                                                                                                                                                                                                                                                                                                                                                                       | test "linked prep rows can be opened…"; percorso passo 11 e telefono (tocco, ≥ 40 px); `14c`, `20b`                     |
| P3    | (1) esito della vignetta senza avviso; (2) niente riuso; (3) niente ricerca/etichette; (4) icona del tipo visibile ai giocatori | (1) nessuna finestra né notifica dopo la decisione (test rosso)                                         | (1) decidere o correggere l'esito aggiunge una "mostra" di tipo `outcome` agli attuali destinatari: finestra "Il DM ha deciso l'esito: …" e notifica "…: il DM ha deciso l'esito" (Foundry Show Players, FVT-162); nessuna se l'accesso è stato ritirato. (2) "Duplica" nel menu Altro: copia solo DM con nuovi id, senza mostre, scelte né esito (CRP-072). (3) campo "Cerca nei materiali" che filtra sul posto senza perdere il fuoco (titolo, testo, intestazioni, estratti; etichette solo per il DM) ed etichette DM nell'editor e sulle schede (VTL-080). (4) vedi sotto | test "a decided or corrected vignette outcome…", "duplicate…", "materials search…"; percorso passi 2 e 10; `03b`, `12a` |
| P3    | Prove non aggiornate                                                                                                            | confronto con il codice                                                                                 | righe File, Stato, Capacità, comandi, passi, schermate e Limiti aggiornati sopra                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | questo file                                                                                                             |

Non cambiato, con motivo: (4) l'icona del tipo resta visibile ai giocatori quando il DM rivela
lo spillo, come l'icona scelta dal GM in Roll20 Map Pins (R20-099); l'editor ora lo dice sotto il
campo Tipo ("L'icona del tipo è visibile ai giocatori quando riveli lo spillo; il nome del tipo
e la nota restano al DM"), e il menu mostra l'icona accanto a ciascun tipo. Il nome del tipo non compare nella vista del giocatore.

Dati: i materiali hanno `tags` (normalizzazione a `[]` per i salvataggi precedenti; i tre
materiali del seme ne hanno due ciascuno), una copia ha `duplicatedFrom`, una mostra può avere
`kind: "outcome"`; `unseenShows` restituisce anche `kind`. Nessun cambio di versione dello
slice. File modificati: solo quelli dell'area (`handouts.mjs`, `handouts-domain.mjs`,
`session-prep.mjs`, `handouts.css`, i due test, il percorso, questo file). Nessun file condiviso.

```sh
node /Users/salvatoredicara/Workspace/d20-studio/node_modules/prettier/bin/prettier.cjs --check \
  design/blueprint/handouts*.mjs design/blueprint/session-prep.mjs design/blueprint/handouts.css \
  design/blueprint/tests/handouts.test.mjs design/blueprint/tests/session-prep.test.mjs
# All matched files use Prettier code style!
node --test design/blueprint/tests/handouts.test.mjs design/blueprint/tests/session-prep.test.mjs
# 36/36 pass (7 nuovi test scritti prima delle correzioni: 7 rossi, poi verdi)
node --test design/blueprint/tests/*.test.mjs
# 08:11: 1225 test, 1214 pass, 11 fail, tutti in campaign-members.test.mjs (4) e media.test.mjs (7),
# file di altre aree modificati in quei minuti (campaign-members.mjs 08:09, media-domain.mjs
# 08:07); il test di campaign-members registra un proprio slice "handouts" finto e non usa
# codice B15. Esecuzioni precedenti: 3, poi 13 fallimenti in aree diverse (decks,
# random-tables) poi rientrati: transitori
cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B15
playwright-cli -s=d20-b15 --raw run-code \
  --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/handouts-journey.js
# 15/15 passi, errors: []
```

Schermate nuove ispezionate: `03b` (ricerca per etichetta), `06` (spunta esplicita e nota sul
tipo), `08c` (gruppo della scena nel pannello), `08d` (scene e spilli collegati con "Vai allo
spillo"), `12a` (finestra dell'esito), `14b` (un solo pulsante), `14c` (scheda della Sentinella
aperta dalla riga), `16b` (Avviso in cima al pannello della Taverna), `19b` e `20b` (telefono EN:
gruppo della scena e riga collegata con "Open", senza overflow).
