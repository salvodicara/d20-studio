# B42 — Mondo: mappa del mondo, calendario e cronologia · prove

24/09/2026 (cartella prove datata 2026-09-25). Area `world-map` del registro (B11), costruita
senza modificare file condivisi. Tempo del mondo = orologio della campagna di `rest-time.mjs`
(`restTime.clocks[campaignId].seconds`): il calendario non ha un orologio proprio (C24, I-087).

## File

| File                                                         | Contenuto                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design/blueprint/world-map.mjs`                             | `register(registry)`: sezione di campagna, riquadro sulle voci del Mondo, scheda «Mondo» del Tavolo, notifiche (B24), ricerca, due comandi (B23); interfaccia, gesti, dialoghi, azioni (`runAction`, `submit*` esportati). |
| `design/blueprint/world-map-domain.mjs`                      | Modello puro: seme «Le lanterne di Bruma», normalizzazione, visibilità per identità, comandi su mappe/spilli/gruppi/eventi/calendario/ere, misura e stima del viaggio 2024, cronaca, ricerca, promemoria.                  |
| `design/blueprint/world-calendar.mjs`                        | Motore del calendario: mesi di lunghezza libera, settimana personalizzata, lune con fasi, stagioni, ere, data dall'orologio, griglia del mese, ricorrenze, promemoria raggiunti dal tempo di gioco, validazione.           |
| `design/blueprint/world.css`                                 | Stili con prefisso `.wm`, registrati da `registerStyles`.                                                                                                                                                                  |
| `design/blueprint/tests/world-calendar.test.mjs`             | 7 test del motore.                                                                                                                                                                                                         |
| `design/blueprint/tests/world-map.test.mjs`                  | 14 test di dominio + integrazione con store e registro veri + gestori dell'interfaccia (render, azioni, invii di dialogo).                                                                                                 |
| `changes/interview-01/blueprint-checks/world-map-journey.js` | Percorso nel browser reale (IT 1440 × 900 mouse/tastiera, EN 390 × 844 touch).                                                                                                                                             |
| `changes/interview-01/blueprint-world-map-evidence.md`       | Questo rapporto.                                                                                                                                                                                                           |

Nessun file condiviso toccato (`app.mjs`, `campaign.mjs`, `table.mjs`, `rest-time.mjs`,
`extensions.mjs`, `state.mjs`, `styles.css` invariati): l'orologio si legge dallo stato, il
tempo si avanza con il servizio esistente `ctx.openGameTime()`, le voci si creano con le API
pubbliche di `campaign-content.mjs`, le unità con `resolveUnits` di `preferences-domain.mjs`.

## Dove sta (B61)

- **Campagna → «Mappa e calendario»** (voce della barra laterale subito dopo «Mondo», ordine 51):
  schede «Mappa del mondo · Calendario · Cronologia». Da Inizio: «Apri campagna» → voce = **2 clic**
  (misurato dal percorso). Il core non ha un aggancio per sotto-sezioni dentro «Mondo», quindi
  l'area non sostituisce la sezione del core (resta l'elenco delle voci).
- **Voce del Mondo** collegata a uno spillo: riquadro «Sulla mappa» con «Mostra sulla mappa» e
  «Storia del luogo» (`campaign-section` `world-map.entry`).
- **Tavolo**: scheda della barra laterale destra «Mondo» (icona mappa, ordine 72): data, ora,
  stagione, lune, promemoria arrivati, eventi di oggi e prossimi, «Avanza il tempo» (DM, stesso
  dialogo «Tempo» del Tavolo), «Apri il calendario», «Mappa del mondo». Nessun pulsante nella riga
  del titolo del Tavolo.
- **Campanella (B24)**: promemoria in categoria «Promemoria»; **ricerca**: luoghi, mappe, eventi
  visibili; **palette (B23)**: «Apri la mappa del mondo», «Apri il calendario del mondo».

## Capacità → prova

| Capacità (censimento)                                         | Percorso                                                                          | Comandi e risultato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Regola / fonte                                                                                                                                                                    | Pattern adottato (prodotto + ID)                                                                                                                                                                      | Prova                                                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| CA-28 mappa con spilli collegati, gruppi, livelli, visibilità | Campagna → Mappa e calendario → Mappa del mondo                                   | «Valle di Bruma»: spillo «Porto Grigio» nel gruppo «Città»; «Tana dei goblin» solo DM (bordo tratteggiato, «solo DM»; assente dal DOM del giocatore). Legenda in alto a sinistra con ricerca («port» → solo Porto Grigio, la vista non si sposta) e gruppi attivabili/disattivabili (filtro di visualizzazione). Pannello laterale: gruppo, descrizione, voce, mappa, storia; DM: Centra, Modifica, Duplica, Mostra/Nascondi ai giocatori, Elimina (con conferma e Annulla).                                                                                                      | Visibilità per identità (F-039: nessuna rivelazione per il solo collegamento). Etichette d'audit private per contenuti solo DM.                                                   | Kanka Map Explorer senza modalità separata, legenda con ricerca, pannello dettagli, gruppi e visibilità (CMP-41, CMP-43, CMP-44, CMP-48); World Anvil pin/visibilità (CMP-78); nota Foundry (FVT-087) | Percorso A–B; test «regional map…», «DM pins…»; `b42-01`, `b42-02`                                                      |
| CA-28 spillo collegato alla voce                              | Pannello dello spillo → «Crea la voce del luogo» / «Collega a una voce del Mondo» | Un comando crea la voce «Luogo» (campagna o solo DM) con le API di `campaign-content` e la collega; «Apri la voce» porta al dettaglio con ritorno allo spillo; la voce mostra «Sulla mappa» + storia; «Mostra sulla mappa» seleziona lo spillo; la voce compare nell'elenco del core «Mondo». Voce solo DM su spillo pubblico: il giocatore legge «Nessuna voce collegata.» (il solo collegamento non rivela nulla, F-039; revisione).                                                                                                                                            | Permessi delle voci di `campaign-content` (lettura rivalutata a ogni rendering).                                                                                                  | LegendKeeper: pagina creata dalla mappa (CMP-67), spilli che collegano elementi (CMP-64)                                                                                                              | Percorso B; test «creating the place entry…»; `b42-02`                                                                  |
| CA-28 spilli: creazione, trascinamento, correzione            | Strumento «Spillo» (clic, Invio al centro), clic destro, «Nuovo spillo al centro» | Clic destro sulla mappa (DM) → «Nuovo spillo» nel punto; «Rapido» mantiene lo strumento; trascinamento dello spillo salva la posizione; «Annulla «Spillo spostato»» la ripristina; campi X/Y nel dialogo per la tastiera.                                                                                                                                                                                                                                                                                                                                                         | Undo del core (`snapshot` della sezione).                                                                                                                                         | Kanka Rapid (CMP-42), marcatori trascinabili con salvataggio (CMP-47); LegendKeeper clic destro (CMP-65, CMP-244)                                                                                     | Percorso D; test «DM pins…»                                                                                             |
| CA-29 mappe annidate mondo → regione → città → sotterraneo    | Spillo «Porto Grigio» → «Apri la mappa «Porto Grigio»» o doppio clic/doppio tocco | Città «Porto Grigio» con «Ingresso delle cripte» (solo DM) che apre «Cripte del faro» (mappa solo DM); percorso «Valle di Bruma › Porto Grigio» con ritorno; il giocatore che apre l'indirizzo delle cripte legge «Mappa non disponibile». DM: «Crea la mappa collegata» da uno spillo, «Nuova mappa» con disegno d'esempio o immagine caricata (PNG/JPEG/WebP ≤ 2 MB, errore leggibile), «Rendi mappa principale», «Elimina la mappa» (principale rifiutata).                                                                                                                    | Cicli rifiutati («non può aprire la sua mappa o una mappa che la contiene»).                                                                                                      | LegendKeeper mappe annidate (CMP-64); Kanka impostazioni della mappa e caricamento (CMP-46, CMP-49 senza tassellatura); doppio clic Foundry (FVT-087)                                                 | Percorso C, K; test «a pin opens the city map…», «groups, maps and search…»; `b42-03`                                   |
| CA-30 misurare distanze                                       | Strumento «Misura»; tastiera: spilli con Invio o legenda                          | Bruma → Ponte di pietra → Porto Grigio: tappe 48 km + 64 km, totale 112 km; doppio clic o Esc termina, Backspace toglie l'ultima tappa; tabella per passo (8 h al giorno): Veloce 45 km 2 giorni e 3,5 h, **Normale 36 km 3 giorni e 1 h**, Lento 27 km 4 giorni e 1 h (giorni interi dalla colonna Giorno, il resto dalla colonna Ora; revisione) con gli effetti del passo; «Collina» blocca Veloce, «Strada in buone condizioni» lo riconsente. EN: 74 miles, 24 miles/day. Il tempo condiviso non cambia.                                                                     | SRD 5.2.1 Passo di viaggio EN p. 12 / IT p. 13 (30/24/18 mi = 45/36/27 km al giorno); Terreno di viaggio e Strade EN p. 192 / IT p. 220; 1 miglio = 1,5 km come nel SRD italiano. | Kanka misura con tappe, Esc/doppio clic (CMP-45); LegendKeeper «fantasy navigation» (CMP-68)                                                                                                          | Percorso E, M; test «measure with waypoints…»; `b42-04`, `b42-09`                                                       |
| CA-31/C24 orologio comune avanzato solo da gioco o DM         | Tavolo → «Tempo» (8 ore) o Calendario/Tavolo «Avanza il tempo» (DM)               | Prima 08:00, dopo 8 ore al Tavolo il calendario e la scheda «Mondo» mostrano 16:00 (orologio 28800 s); la data non avanza da sola; un round (6 s) non cambia i minuti. Il giocatore non vede «Avanza il tempo».                                                                                                                                                                                                                                                                                                                                                                   | Tempo della finzione avanzato da gioco o DM (I-087); calendario reale delle sessioni separato (F-011).                                                                            | dnd5e avanzamento solo DM (FVT-060); Owlbear OwlClock (VTL-056). Non copiato: avanzamento automatico Kanka (CMP-37)                                                                                   | Percorso G; test «the calendar date is the Table clock…»; `b42-06`                                                      |
| CA-32 calendario personalizzabile (mesi, lune, stagioni, ere) | Calendario; DM «Impostazioni del calendario», Cronologia «Modifica le ere»        | «Calendario di Bruma»: 10 mesi di 30/31 giorni, settimana di 6 giorni, lune «Vela» (28 g) e «Cinerea» (11 g) con fase in ogni giorno, stagioni, ere con sigla (E.S., E.L.); frecce e Invio sulla griglia, Ctrl+← / Ctrl+→ tra i mesi, «Oggi». Righe aggiungibili/rimovibili; togliere un mese usato da un evento è rifiutato citando l'evento; cambiare la data d'inizio richiede un motivo, registrato.                                                                                                                                                                          | Correzione con motivo.                                                                                                                                                            | Fantasy Calendar (CMP-98); LegendKeeper lune (CMP-70); formato con era Kanka (CMP-38); tasti Kanka (CMP-39)                                                                                           | Percorso F; test «calendar settings…», test del motore; `b42-05`                                                        |
| CA-33 eventi datati con visibilità, ricorrenza e promemoria   | Calendario → «Nuovo evento», giorno selezionato, «Evento qui» da uno spillo       | DM crea «Eclissi» (14 Nebbie 15:00, solo DM, promemoria «quando arriva», luogo Vecchio osservatorio): il giocatore non la vede; dopo 8 ore al Tavolo il DM ha «Promemoria arrivati» (calendario, scheda «Mondo», campanella «Promemoria: Eclissi»); «Rivela ai giocatori» → il giocatore la legge senza promemoria retroattivo; «Visto» la toglie (anche dalla campanella). «Fiera delle lanterne» ogni anno; spostarne la data già visibile senza motivo è rifiutato, il motivo compare a chi legge. Evento privato del giocatore «Solo io» (anche senza rete) mai letto dal DM. | Il DM decide che cosa accade (I-139); nessuna notifica esterna.                                                                                                                   | Calendaria: note Visibili/Nascoste/Private, rivelazione GM, promemoria (FVT-062); Kanka promemoria (CMP-35); Fantasy Calendar ricorrenze (CMP-100); FG registro per giorno (R20-077)                  | Percorso F–I, M; test «DM-only 'Eclissi'…», «a player's private event…», «editing a date…»; `b42-05`–`b42-07`, `b42-10` |
| CA-34 cronologie con ere e viste cronaca/calendario           | Cronologia (vista cronaca) e Calendario (vista calendario) sugli stessi eventi    | «Età del Silenzio» e «Età delle Lanterne» con anni e sigla, marcatore «Adesso» nella posizione della data corrente; eventi storici solo DM nascosti al giocatore; filtro per luogo.                                                                                                                                                                                                                                                                                                                                                                                               | —                                                                                                                                                                                 | LegendKeeper cronologia con viste (CMP-69); Kanka ere ed elementi (CMP-40)                                                                                                                            | Percorso J; test «chronicle with eras…»; `b42-08`                                                                       |
| CA-35 storia di un luogo dallo spillo                         | Pannello dello spillo → «Storia del luogo», «Apri nella cronologia»               | Porto Grigio: Fondazione (1034), Grande incendio (1201), Fiera delle lanterne; «Apri nella cronologia» → «Storia di «Porto Grigio»» senza gli altri eventi; la voce collegata mostra la stessa storia.                                                                                                                                                                                                                                                                                                                                                                            | —                                                                                                                                                                                 | World Anvil Chronicles: il marcatore mostra la storia del luogo (CMP-79)                                                                                                                              | Percorso B, J; test «regional map…», «chronicle…»                                                                       |

Altre verifiche del percorso: ricarica della pagina (spillo, evento rivelato, collegamento alla
voce restano); senza rete «Nascondi ai giocatori» è rifiutato con il messaggio della shell e
nulla cambia; tutti i controlli dell'area ≥ 40 px e nessuno scorrimento orizzontale a 1440 nelle
tre viste e a 390 (mappa e calendario); nessun `pageerror`.

## Comandi eseguiti e risultati

- `node --test design/blueprint/tests/world-calendar.test.mjs design/blueprint/tests/world-map.test.mjs`
  → 21/21.
- `node --test design/blueprint/tests/*.test.mjs` → 1540/1540 (24/09, con le aree degli altri
  costruttori presenti in quel momento).
- Dalla cartella `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B42/`:
  `playwright-cli -s=d20-b42 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/world-map-journey.js`
  → 13 gruppi di verifiche superati, `errors: []` (Chromium, server `http://127.0.0.1:8879/`).
  File di prova per il caricamento in `B42/fixtures/` (`note.txt`, `mulino.png` sintetico).
- Formattazione: prettier su tutti i file dell'area (il punto e virgola finale del percorso è
  tolto a mano, come richiede `run-code`).

Immagini (1440 × 900 salvo il telefono, ispezionate): `b42-01-player-map-legend.png`,
`b42-02-dm-pin-entry.png`, `b42-03-city-map-breadcrumb.png`, `b42-04-measure-pace.png`,
`b42-05-calendar-dm-eclipse.png`, `b42-06-table-world-tab-reminder.png`,
`b42-07-player-eclipse-revealed.png`, `b42-08-timeline-eras.png`, `b42-09-phone-en-pin.png`,
`b42-10-phone-en-calendar-private.png`.

## Dati e API per altre aree

- Sezione `state.ext["world-map"]` = `{ campaigns: { <campaignId>: { rootMapId, maps[], groups[], pins[], calendar, events[] } } }`
  (versione 1, Undo `snapshot`; tutti i comandi sono annullabili). Promemoria «visti»: per
  dispositivo e identità in `localStorage` (`d20-studio-world-map:acks:v1`), come le letture
  della campanella B24; «Ripristina esempio» li dimentica.
- Funzioni pure riutilizzabili (per esempio da B45 viaggi): `routeLegs`, `travelEstimate`,
  `PACES`, `TERRAINS`, `SOURCES` in `world-map-domain.mjs`; `nowFromClock`, `formatDate`,
  `occurrences`, `firedReminder` in `world-calendar.mjs`; `worldNow(state, world)`.
- Visibilità: `canSeeMap`, `canSeePin`, `canSeeEvent`, `visibleEvents`, `dueReminders`.

## Limiti onesti

- Strumenti della mappa: spilli e misura. Etichette di testo, cerchi, aree, percorsi disegnati
  e pagine separate dei livelli di Kanka non ci sono; i gruppi fanno da livelli filtrabili.
  Niente cursori multipli (LegendKeeper), niente posizione del gruppo sulla mappa, niente
  tassellatura delle immagini grandi: l'immagine caricata resta nello stato locale (≤ 2 MB).
- I giocatori consultano e misurano ma non aggiungono spilli; possono creare eventi propri
  («Solo io» o «Il gruppo e il DM»). Il DM non modifica gli eventi dei giocatori.
- Cronologia solo come cronaca verticale (niente vista Gantt né corsie parallele di World Anvil).
- Calendario: giorno fisso di 24 ore (lo stesso orologio dei riposi), niente anni bisestili,
  meteo (F-047), alba/tramonto, oscurità della scena o salto temporale cinematografico.
  Cambiare la data d'inizio sposta «oggi» senza far passare tempo: è una correzione del DM con
  motivo, registrata e visibile al DM.
- Promemoria solo nell'app (calendario, scheda «Mondo», campanella): nessuna notifica esterna
  (confine I-139). Un promemoria scatta solo se il tempo lo attraversa dopo che è stato impostato
  e dopo che chi legge poteva vedere l'evento; «Visto» vale per quel dispositivo.
- Stima del viaggio: passo, terreno prevalente e strade; non applica cavalcature, veicoli,
  viaggiatori più lenti, viaggio prolungato né lo svolgimento del viaggio (B45).
- Annullare «Voce creata dal luogo della mappa» scollega lo spillo ma lascia la voce: per regola
  del core le voci narrative non si cancellano con l'Undo di gioco.
- La sezione è una voce propria della barra laterale accanto a «Mondo», non una sotto-scheda:
  il core non offre un aggancio dentro l'elenco del Mondo e non l'ho aggiunto.
- Nessuna mini-mappa dentro la scheda «Mondo» del Tavolo: il pulsante porta alla mappa della
  campagna (un clic).
- Il doppio clic sugli spilli è riconosciuto dall'area (450 ms), perché ogni tocco ridisegna la
  mappa. Verificato solo in Chromium; sicurezza e visibilità sono proiezioni locali per le due
  identità dimostrative, non un controllo d'accesso reale.

## Review and fixes (revisione indipendente, 24/09/2026)

Revisore-correttore separato dal costruttore. Sessione `d20-b42-rf`, prove in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B42-rf/`. Il revisore
ha controllato ogni capacità della scheda nell'app in esecuzione, i pattern citati, i controlli
inerti, la coerenza con Tavolo/voci/orologio, ruoli e riservatezza, rete, annullamento, EN/IT,
tastiera, telefono a 390 px e posizione (B61). Tutte le correzioni sono state scritte prima come
test che fallivano. Nessun file condiviso è stato modificato; nemmeno i file del percorso del
costruttore.

### Difetti trovati e corretti

| #   | Gravità | Riproduzione (prima)                                                                                                                                                                                                                                                                 | Esito (dopo)                                                                                                                                                                                                                                                               |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P1      | Il DM apre «Impostazioni del calendario» e porta Nebbie a 15 giorni. Il rifiuto elenca «Fiera delle lanterne, **Incontro con la capitana del porto**»: il titolo dell'evento «Solo io» di Livia arriva al DM (`rf-02`).                                                              | `datedRows(world, role)` passa solo i titoli leggibili. `validateCalendar` conta gli altri: «Fiera delle lanterne; 1 evento privato di un giocatore … (un evento privato lo sposta chi lo ha creato)». Il rifiuto resta; il titolo non arriva mai al DM (`rf-10`).         |
| 2   | P1      | Il DM apre la cronologia di «Tana dei goblin» (`timeline.tana-goblin`), poi passa a Giocatore (o apre lo stesso collegamento). Il giocatore legge «Storia di «Tana dei goblin»», il nome di un luogo solo DM (`rf-01`).                                                              | Il filtro del luogo vale solo se chi legge vede lo spillo (`placeFilter`). Altrimenti torna «Tutti i luoghi»: niente nome e niente eventi pubblici raggruppati sotto quel luogo (`rf-12`).                                                                                 |
| 3   | P2      | Uno spillo pubblico è collegato a una voce solo DM. Il giocatore legge «La voce di questo luogo non è condivisa con te»: il solo collegamento rivela che esiste un segreto (confine F-039).                                                                                          | Il giocatore legge «Nessuna voce collegata.», come per uno spillo senza voce.                                                                                                                                                                                              |
| 4   | P2      | Misura di 112 km. Veloce mostra «45 km al giorno · 2 giorni e 2,5 h» e Lento «27 km · 4 giorni e 5 h». Il tempo usava 8 × la colonna Ora (48 e 24 km al giorno), non la colonna Giorno mostrata accanto (SRD 5.2.1 EN p. 12 / IT p. 13) (`b42-04`).                                  | `travelEstimate`: i giorni interi usano la colonna Giorno e il resto la colonna Ora. Un resto che supererebbe 8 ore occupa un giorno in più. Risultato: Veloce 2 giorni e 3,5 h, Normale 3 giorni e 1 h (invariato), Lento 4 giorni e 1 h (`rf-13`).                       |
| 5   | P2      | Il DM crea «Eclissi» (14 Nebbie 15:00, promemoria), poi toglie un giorno a Lunganotte. Dopo 8 ore al Tavolo il promemoria non arriva più. Gli istanti salvati (`armedAt`, `openedAt`) restavano nella vecchia numerazione: accorciare un mese li spostava di 1286 giorni nel futuro. | `saveCalendar` sposta gli istanti salvati (promemoria, apertura ai giocatori, correzioni) della stessa differenza della data d'inizio, così restano sull'orologio. Modificare i mesi non fa scattare né blocca promemoria; le 8 ore al Tavolo portano «Eclissi» (`rf-11`). |
| 6   | P2      | Senza rete, il DM trascina «Bruma». Il rifiuto compare, ma lo spillo resta disegnato nel nuovo punto (con `is-dragging`) anche se la posizione salvata è 420,380 (`rf-03`).                                                                                                          | Un trascinamento rifiutato ridisegna la mappa: lo spillo torna dov'è salvato.                                                                                                                                                                                              |
| 7   | P3      | EN con miglia: «Impostazioni della mappa» chiede la larghezza in km, mentre ogni distanza è mostrata in miglia.                                                                                                                                                                      | Il campo `width` usa l'unità di chi legge, con `unit` nascosto: 240 km diventano 160 miglia, e 100 miglia salvano 150 km. `widthKm` è ancora accettato (`rf-14`).                                                                                                          |
| 8   | P3      | Sul telefono il suggerimento dello strumento Spillo dice «Clic destro funziona con ogni strumento» e quello della misura nomina Esc e Backspace.                                                                                                                                     | Con un puntatore «coarse» i suggerimenti parlano di tocchi e dei pulsanti del pannello (`rf-15`).                                                                                                                                                                          |
| 9   | P3      | A 390 px la scheda «Cronologia» / «Timeline» era tagliata a destra (`rf-08`).                                                                                                                                                                                                        | Sotto 720 px le tre schede si dividono la riga: tutte e tre stanno nello schermo (`rf-15`).                                                                                                                                                                                |

### Verificato senza difetti

- Prove (1)–(6) della scheda. Il percorso del costruttore rieseguito dopo le correzioni passa 13
  gruppi su 13, con `errors: []` (immagini in `B42-rf/after/`).
- Tavolo: la scheda «Mondo» è nella barra destra e usa lo stesso orologio di «Tempo». Non c'è
  nessun pulsante nella riga del titolo.
- Campanella: la categoria «Promemoria» esiste in B24. Palette e ricerca rispettano la
  visibilità. Gli indirizzi `map.<id>.<spillo>` e `calendar.<evento>` controllano già la
  visibilità.
- Nessun controllo inerte trovato fra tutti i pulsanti delle tre viste, del pannello, dei
  dialoghi e della scheda del Tavolo.

### Scelte registrate, non difetti

- **Strumenti sotto la mappa.** La colonna a sinistra di B61 è la regola del Tavolo. Qui, in una
  pagina della campagna, vale il Map Explorer di Kanka (CMP-41): barra in basso e legenda in alto
  a sinistra. Zoom e adatta stanno in basso a destra, come al Tavolo.
- **Giorno della settimana e fasi delle lune.** Si ricalcolano quando cambia la lunghezza dei
  mesi, perché entrambi derivano dal conteggio dei giorni, come in Fantasy Calendar (CMP-98). La
  data di oggi resta la stessa.
- **Data d'inizio.** Spostarla è una correzione: non passa tempo. Un evento che lo spostamento
  scavalca non fa scattare il promemoria, coerente con «un promemoria scatta solo se il tempo lo
  attraversa». Prima della revisione, spostarla indietro sopprimeva invece i promemoria.
- **Eventi privati nel rifiuto.** Il DM ne vede il numero, non il contenuto. È l'informazione
  minima per capire perché la modifica è rifiutata. Lasciar passare la modifica avrebbe reso
  invalida la data di un evento del giocatore.
- **Stessa icona per «Mappa» e «Mondo».** Nella barra del telefono le due schede hanno la stessa
  icona, ma nomi diversi. In `ui.mjs` non esiste un'icona di calendario o di globo, e
  aggiungerla richiede un file condiviso. Resta aperto (P3).

### Aperti per altre aree o per il coordinatore

- **B45 viaggi.** `travel-domain.mjs` avanza il viaggio a ore con la colonna Ora: 8 ore a passo
  Veloce fanno 48 km. La stima di B42 ora usa la colonna Giorno: 45 km al giorno. Da allineare in
  B45 (non modificato qui).
- **Limiti onesti già dichiarati, invariati:** «livelli» Kanka resi come gruppi filtrabili;
  niente strumenti testo/area/percorso; nessuna tassellatura.
- **Errore del dominio sulla larghezza massima.** Il messaggio «fino a 100000 km» resta in km
  anche in modalità miglia (P3).

### Comandi eseguiti e risultati (dopo le correzioni)

- `node --test design/blueprint/tests/world-calendar.test.mjs design/blueprint/tests/world-map.test.mjs`
  → 28/28: i 21 test precedenti più 7 test «review:» in `world-map.test.mjs`. Due asserzioni del
  costruttore sono state aggiornate al nuovo comportamento (voce non leggibile, larghezza).
- `node --test design/blueprint/tests/*.test.mjs` → 1644/1644. Una prima esecuzione aveva 1
  fallimento in `projects.test.mjs`, un'area che un altro costruttore stava modificando in quel
  momento e che non dipende da B42. Rieseguita: 1644/1644.
- Dalla cartella delle prove, con la sessione `d20-b42-rf`:
  - Il percorso del costruttore, con le immagini dirottate in `B42-rf/after/`: 13/13,
    `errors: []`.
  - `playwright-cli -s=d20-b42-rf --raw run-code --filename=…/blueprint-checks/world-map-review-journey.js`:
    7/7 (R1–R7), `errors: []`.
- Prettier su tutti i file dell'area. Il punto e virgola finale dei due percorsi è tolto a mano,
  come richiede `run-code`.

File toccati dalla revisione (tutti dell'area B42):

- `world-map.mjs`, `world-map-domain.mjs`, `world-calendar.mjs`, `world.css`
- `tests/world-map.test.mjs`
- `blueprint-checks/world-map-journey.js` (campo `width`)
- nuovo `blueprint-checks/world-map-review-journey.js`
- questo rapporto

Immagini: `rf-01`/`rf-02`/`rf-03`/`rf-08` (prima), `rf-10`–`rf-15` (dopo), in `B42-rf/`.
