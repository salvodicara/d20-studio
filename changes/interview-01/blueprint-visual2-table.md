# Blueprint — passaggio visivo 2: HUD del Tavolo (BG3 + Owlbear)

30/09/2026 · worktree `d20-studio-interview-01` (ramo `codex/interview-01`) · un solo scrittore
(Claude Code, Opus 5.5) · indicazione dell'owner del 29/09: copiare «a mani basse», un
prodotto di riferimento per ogni scelta visiva. Superficie: **Tavolo**. Autorità visiva e
tabella «Elemento → prodotto copiato»: [DESIGN.md «Tavolo»](../../design/blueprint/DESIGN.md).

## Esito (prima → dopo)

| Misura (Chromium, dati di esempio)                   | Prima                                             | Dopo                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Mappa a 1440×900, quota della finestra               | 45 % in esplorazione, 39 % in combattimento       | **64 %** in entrambi (1044×794 px; con la barra laterale chiusa 1384×794 px)                                  |
| Scena alla vista «centra la scena», 1440×900         | scala 0,90 in esplorazione, 0,78 in combattimento | 0,88 in entrambi, inquadrata nello spazio libero fra i comandi (880×582 px); la tela prosegue sotto i comandi |
| Mappa a 1366×768                                     | non misurata prima                                | 970×662 px (61 %)                                                                                             |
| Mappa sul telefono 390×844 (dopo «Mappa»)            | 544 px sotto titolo e ordine di turno             | 600 px dal bordo alto; in vista 71 % sopra la hotbar (b62-ia: 74 % in inglese)                                |
| Hotbar a 1440×900 (limite dei test: 120 px)          | 115 px, a tutta larghezza sotto la mappa          | 118 px, sopra la mappa: lastra centrata + piede della barra laterale                                          |
| Hotbar sul telefono                                  | 173 px (esplorazione), 217 px (combattimento)     | 153 px in entrambi (tre righe corte)                                                                          |
| Comandi sopra la mappa (DM)                          | due file: 5 comandi di sessione + 3 di sicurezza  | una fila: «Sessione ▾», Stop, Rallenta, Nascondi interfaccia                                                  |
| Scorrimento della pagina a 1440/1366/1024/1920       | 0                                                 | 0 (la pagina del Tavolo è alta quanto la finestra)                                                            |
| Scorrimento orizzontale (1440 e 390, scuro e chiaro) | 0                                                 | 0                                                                                                             |

Disposizione (da DESIGN.md «Tavolo», ogni riga con la sua fonte):

- **Mappa a tutta altezza** (tela di Foundry v13): tutto il resto galleggia sopra. Il riquadro
  della mappa (vista «centra la scena», frecce verso i segnali fuori vista, strumenti delle aree
  sulla mappa) è lo spazio libero fra i comandi; spostando la vista la mappa passa sotto di essi.
  Onestamente: a 1440×900 in esplorazione la scena inquadrata resta grande quasi come prima
  (0,88 contro 0,90); cresce la tela e, in combattimento, la scena (0,88 contro 0,78).
- **In alto a sinistra** la targa della scena (navigazione delle scene di Foundry v13) con i
  comandi della scena; sotto, la colonna degli attrezzi (Owlbear).
- **In alto al centro, solo in combattimento**, l'ordine di turno a card-ritratto di BG3.
- **In alto a destra** una sola fila di icone (Owlbear): il DM ha il menu «Sessione» con
  Sessione, Pausa, Nascondi scena, Conto alla rovescia, Orologi di progresso e Gruppo.
- **In basso a sinistra** i ritratti del gruppo di BG3 (colonna verticale della Patch 7): barra
  PF per chi li controlla, cornice oro per il selezionato, badge dello stato della pedina.
- **In basso al centro** la hotbar di BG3 con la riga delle risorse sopra (Azione, Bonus,
  Reazione, Movimento, slot) e, sulla stessa riga a destra, modalità dei dadi e coda dei tiri;
  pagine «Azioni» e «Barra rapida».
- **In basso a destra** lo zoom (Owlbear) sopra la fascia; sotto la barra laterale i comandi del
  turno in icone e il **Fine turno tondo** di BG3.
- **Barra laterale**: schede invariate (Foundry v13 / Roll20), 340 px fino a 1599 px; la scheda
  Creatura non ripete PF e movimento (li mostra la hotbar): CA in uno scudo accanto al nome, la
  mossa in preparazione in cima, poi condizioni, forme, effetti e comandi della scheda.
- **Telefono**: la mappa prima (riempie lo schermo sopra la hotbar una volta in vista), ordine di
  turno sopra la mappa sotto i comandi, hotbar in tre righe corte (PF · simboli · pagine;
  azioni · Mosse · dadi; comandi · Fine turno), pannello come foglio con maniglia.

## Riferimenti copiati (sintesi; righe complete in DESIGN.md)

- **BG3**: ordine di turno in alto al centro e ritratti del gruppo verticali (note della Patch 7,
  lette tramite [GamingBolt](https://gamingbolt.com/baldurs-gate-3-patch-7-is-live-adds-barbarian-class-and-overhauls-hud-ui):
  «Turn Order UI … top-centre», «Vertically aligned the party member portraits»,
  «resource-based filtering»); hotbar, riga delle risorse, pagine, End Turn tondo e tasti
  piccoli accanto (ritagli `bg3-hotbar.jpg`, `bg3-hotbar-2.jpg`, `bg3-tabs-endturn.jpg`,
  `bg3-turn-order.jpg`, `bg3-resource-icons.png`).
- **Owlbear Rodeo 2**: fila di icone sopra la mappa, attrezzi arrotondati, zoom in basso a
  destra, pannelli MUI arrotondati (`owlbear-rings-initiative.jpg`, `PluginThemeProvider.tsx`).
- **Foundry v13**: tela a tutta finestra con controlli sospesi, navigazione delle scene in alto a
  sinistra, barra laterale stretta con la chat al piede (`foundry-v13-ui.jpg`).
- **D&D Beyond / Solasta**: CA nello scudo e riquadro CA nella scheda Creatura
  (`ddb-sheet-desktop.jpg`, `solasta-panels.jpg`).

Immagini di riferimento: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-29/visual/system/references/`
(nessun nuovo scaricamento in questa sessione; la ricerca web ha dato solo testo).

## Modifiche per file

- `table.mjs`: ritratti del gruppo (`<nav class="table-party">`, pulsanti `data-party-select`
  con `aria-pressed` e nome accessibile con PF per chi li controlla; `data-select` resta unico
  all'ordine di turno perché i percorsi lo premono); riga delle risorse `.hotbar-resources`
  all'inizio di `.hotbar-center` (parole in `.resource-word`); Muovi e Azioni della scheda come
  icone con `dock-text` e `title`; scheda Creatura compatta (riassunto delle condizioni
  «embedded» senza la riga PF, niente barra PF né riquadro Movimento, CA accanto al nome, anteprima
  della mossa in cima); `fitHud()` misura la targa (attrezzi e ordine di turno partono sotto),
  in un'interfaccia più grande limita la colonna degli attrezzi sopra la fascia, stringe o fa
  scorrere i ritratti se toccherebbero gli attrezzi, e segna la hotbar `is-tight` quando la riga
  delle risorse incontrerebbe i dadi; i livelli delle aree da 90 in su (velo di sicurezza, HUD di
  sessione e il suo menu, meteo, opzioni della nebbia) si disegnano sopra i pulsanti delle porte,
  che restano sopra gli altri livelli.
- `session-view.mjs`: menu «Sessione» del DM (`data-session-menu`, `aria-expanded`,
  `aria-controls`; gruppo `#session-view-menu` con gli stessi pulsanti `data-sv` /
  `data-table-drawer` di prima); `bindSessionMenu` (Esc, clic fuori, pannelli e Gruppo lo
  chiudono; Pausa e Nascondi scena lo lasciano aperto); `ui.menu` azzerato da `resetUI`.
- `styles.css` (solo sezioni del Tavolo): nuovo blocco «Visual pass 2: Table HUD» in fondo;
  nessuna regola esistente cambiata (le regole lette dai test restano, superate in cascata).
  Il riquadro della mappa (`#battle-map`) ha margini pari alle zone dei comandi (76 a destra
  per lo zoom, 152 in basso per la fascia, 88 a sinistra per attrezzi e ritratti; in alto no:
  la fila dei comandi della mappa vive nel riquadro, che prende i clic solo al suo interno) e
  `overflow: visible`: «centra la scena», le frecce verso i segnali fuori vista e gli HUD delle
  aree usano lo spazio libero; la tela e la mappa spostata restano visibili sotto i comandi (le
  taglia il contenitore della mappa). Sul telefono un margine interno di 120 px in basso
  (ritratti e zoom).
- `session-view.css`: fila di icone, menu (lastra `--raised`, filo bronzo, righe a tutta
  larghezza, stato acceso in oro), specificità sopra la regola del tema chiaro di
  `preferences.css`; le parole del consiglio in pausa lasciano passare i clic alla mappa, solo il
  suo bottone li prende; a interfaccia nascosta la mappa torna a tutto schermo senza margini e
  senza ritratti.
- `combat.css`: il palco si stende nella sua riga (supera le altezze `clamp()` lette da
  `ia-consolidation.test.mjs`, che restano nel file).
- `combat-tracker.css`: «Tocca a te» sotto targa e ordine di turno (margine; la posizione la
  scrive `combat-tracker.mjs`); sopra la mappa lascia passare clic e trascinamenti, i suoi
  bottoni restano.
- `quickbar.css`: nella hotbar gli attrezzi della barra rapida scorrono di lato invece di
  coprire le frecce di pagina (`justify-content: safe flex-end`).
- `DESIGN.md`: sottosezione «Tavolo (passaggio visivo 2, 30/09/2026)», 25 righe.
- `tests/visual2-table.test.mjs` (nuovo, 6 test): ritratti, riga delle risorse, scheda Creatura
  senza doppioni, menu «Sessione» del DM e fila dei giocatori, blocco CSS e ancoraggio del
  blocco telefono B61.

Non toccati: `safety-ui.mjs`, `safety.css`, `special-moves.css`, `token-menu.css` (le icone dei
segnali di sicurezza cambiano solo per il CSS della fila in `session-view.css`).

## Agganci e percorsi aggiornati

Agganci invariati: tutti i `data-*`, ruoli, nomi accessibili, id e collocazioni del registro.
Cambiano di posto (legittimamente) i comandi di sessione del DM, ora dentro il menu; e PF e
movimento, ora solo sulla hotbar. Percorsi aggiornati al minimo, senza togliere controlli:

| Percorso                      | Cambio                                                                                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session-view-journey.js`     | `sessionMenu(hud)` apre il menu prima di Nascondi/Mostra scena, Pausa/Riprendi, Sessione (desktop, pagina di prova, telefono, pagina inattiva)                                                                             |
| `p10-governance-journey.js`   | apre il menu prima di Pausa e Riprendi                                                                                                                                                                                     |
| `r7-governance-journey.js`    | apre il menu (se c'è: chi conduce la sessione) prima di Gruppo, desktop e telefono                                                                                                                                         |
| `residuals-a-journey.js`      | idem prima di Gruppo (DM)                                                                                                                                                                                                  |
| `b61-review-fixes-journey.js` | «B14 session HUD»: menu poi Sessione, due pressioni (il controllo ne ammette due)                                                                                                                                          |
| `b62-ia-journey.js`           | apre il menu prima di verificare che «Sessione» apra il pannello (prima la verifica era saltata: «not visible at this size»)                                                                                               |
| `forms-journey.js`            | velocità «12 m»/«9 m» letta dalla riga delle risorse; PF temporanei dal nome del pulsante PF della hotbar («3 temporanei»)                                                                                                 |
| `preferences-journey.js`      | movimento letto dalla riga delle risorse (valore dopo la parola) invece che dal riquadro della scheda Creatura                                                                                                             |
| `annotations-journey.js`      | un passo di zoom in più prima di contare le frecce verso i segnali fuori vista: il riquadro della mappa è ora più alto della scena, e dopo due passi un segnale è ancora in vista (il controllo, almeno due frecce, resta) |

## Verifiche

- **Suite**: `node --test design/blueprint/tests/*.test.mjs` → **2580/2580** (i 6
  nuovi inclusi; il numero cresce anche con i test di altri scrittori nello stesso worktree).
- **Prettier** sui file cambiati: conformi. **Rilevatore impeccable** (`detect.mjs --json`) sul
  blocco CSS nuovo, `table.mjs`, `session-view.css`, `combat-tracker.css`: nessun avviso.
- **Percorsi** (copie in `journeys/` con l'uscita spostata qui; uno per comando, `alarm 200`,
  sessione `d20-visual2-table`): 31 percorsi,
  tutti verdi nello stato finale — `b61-table-structure`, `b61-review-fixes`, `b62-ia`,
  `b62-review-fixes`, `combat-mobile`, `visual-fixes`, `session-view`, `safety`,
  `p10-governance`, `r7-governance`, `residuals-a`, `forms`, `preferences`, `quickbar`,
  `combat-tracker`, `special-moves`, `token-menu`, `damage-tray`, `conditions-badges`, `combat`,
  `fog-vision`, `annotations`, `regions`, `knowledge`, `area`, `reactions`, `gestures-and-views`,
  `measure`, `companion-map`, `spatial`, `spatial-mobile` (ultimo giro in due sessioni del
  browser in parallelo, `d20-visual2-table` e `d20-visual2-table-b`, log
  `journeys/final-*.log`; dopo le ultime due correzioni rieseguiti `session-view`,
  `combat-tracker`, `safety`, `p10-governance`, `annotations`, `reactions`, `combat-mobile`,
  `b62-review-fixes`, `combat`). Non eseguito `media-journey`: lo script di copia sposta anche
  il suo file di prova (`fixtures/appunti.txt`); la regola che tocca l'area (`.media-map-missing`)
  è stata poi tolta.
- **Misure** (`scripts/probe-sizes.js`, `probe-scaled.js`): nessuno scorrimento a 1366×768,
  1024×768, 1280×720, 1920×1080 e 1440×900 con interfaccia 125 % + testo 125 % e con testo
  150 %; hotbar 118 px; ritratti mai sopra gli attrezzi (a 1280×720 compatti, al 125 %
  compatti e scorrevoli).
- **Due giri di immagini** (impeccable: un giro, un lotto di correzioni, un giro di conferma):
  vedi «Difetti del primo giro».

## Difetti del primo giro (un lotto) e conferma

Trovati sulle immagini e nei percorsi dopo la prima versione, corretti insieme:

1. «Tocca a te» sopra la targa (la posizione la scrive `combat-tracker.mjs` a 12 px dal bordo
   della mappa) → margine sotto targa e ordine di turno.
2. A 1024 px la hotbar andava su due righe (regola B62 ≤ 1279 px) e la riga delle risorse
   usciva sulla barra laterale → lastra su una riga; sotto 1280 px e quando serve (`is-tight`)
   simboli e controlli senza parole.
3. Zoom e riga di stato sovrapposti → zoom impilato sopra la fascia, riga di stato più stretta.
4. Fine turno centrato: tre «righe» di comandi per `b61-review-fixes` → righe da 45 px, Fine turno
   alto quanto le due righe.
5. Stop a 39,99 px sul telefono (le icone della fila avevano 10 px di margine; la scala del
   livello HUD arrotonda sotto 40) → 12 px come prima: 42 px.
6. Ritratti sopra la colonna degli attrezzi con interfaccia al 125 % e in finestre corte
   (`b61-review-fixes`, `preferences-journey`) → `fitHud` (compatti, poi scorrevoli); palco
   non più limitato dall'altezza calcolata da `preferences.css`; targa che va a capo.
7. Barra rapida: gli attrezzi coprivano la freccia «pagina successiva» (`quickbar-journey`) →
   scorrono di lato.
8. Menu «Sessione» nel tema chiaro con righe a tessera (regola del tema chiaro di
   `preferences.css`) → specificità; con il menu aperto la riga di stato restava un riquadro
   vuoto → il messaggio si toglie finché il menu è aperto.
9. Telefono: «9 m» tagliato nella riga della hotbar → spazi dei simboli più stretti.
10. Telefono: il suggerimento del primo accesso sulla barra delle schede toccava il fondo della
    mappa (`b61-table-structure`) → mappa di 34 px più corta: sotto spunta la maniglia del
    pannello.

Giro di conferma (immagini rifatte, poi i percorsi delle aree sulla mappa): cinque difetti in
più, corretti insieme prima delle immagini finali:

11. Telefono: il pulsante di una porta disegnato sopra il menu «Sessione» aperto → i livelli
    HUD (da 90) sopra i pulsanti delle porte.
12. Con la scena a tutta tela, le opzioni degli strumenti delle aree (nebbia, disegno) e i punti
    vicino al bordo finivano sotto la hotbar e i ritratti (`fog-vision-journey`,
    `annotations-journey`); le frecce verso i segnali fuori vista non contavano i punti sotto i
    comandi → il riquadro della mappa è lo spazio libero fra i comandi (margini), la tela resta
    sotto. Un primo tentativo con il riquadro rientrato anche in alto spostava la fila dei
    comandi fuori dal riquadro, dove la mappa non prende i clic (`session-view-journey`,
    `p10-governance`): il riquadro tiene il bordo alto.
13. Il consiglio della pausa per i giocatori copriva le pedine al centro e ne prendeva i clic
    (`session-view-journey`: il rifiuto del trascinamento in pausa non arrivava) → solo il suo
    bottone prende il puntatore.
14. Con l'interfaccia nascosta (Ctrl+Maiusc+H) la mappa restava inquadrata fra comandi che non
    ci sono più (`session-view-journey`) → a interfaccia nascosta niente margini e niente
    ritratti.
15. «Tocca a te», ora sopra la mappa, prendeva il rilascio di un trascinamento
    (`reactions-journey`: il movimento non si fermava per l'attacco di opportunità) → la
    chiamata lascia passare clic e trascinamenti alla mappa, solo i suoi bottoni li prendono
    (come dice già il suo commento: «never holds the page's clicks»).

Immagini finali (`after/`, 36 viste, due temi, due dimensioni): nessun errore di pagina,
nessun passo saltato, nessuno scorrimento orizzontale; mappa 64 % a 1440×900 in tutte le viste,
71 % sul telefono una volta in vista; hotbar 117–118 px a 1440×900, 153 px sul telefono (197 px
con i collegamenti «Mappa»/«Dettagli mossa» di un'anteprima, 245 px sulla pagina della barra
rapida, prima 289 px).

## Immagini

Cartella `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual2/table/`:

- `before/`, `after/` (conferma) e `after-round1/` (primo giro): `explore-dm`, `session-menu`
  (solo dopo), `tracker-panel-dm`, `explore-player`, `combat-dm`, `combat-dm-creature`,
  `combat-player`, `combat-player-quickbar`, `combat-player-preview` × `1440x900`/`390x844` ×
  `dark`/`light`; `before.log`, `after.log` con le misure di ogni vista.
- `compare/`: prima | dopo affiancati (metà scala); `probe/`: sonde (dimensioni, interfaccia
  più grande, telefono).
- `scripts/`: `capture-template.js`, `make-captures.sh`, `run-all.sh`, `make-compare.sh`, sonde;
  `journeys/`: `prepare.sh`, `run.sh`, copie dei percorsi, log e immagini.

## Scostamenti e limiti dichiarati

- **Foglio sul telefono nella pagina, non sovrapposto**: un foglio fisso coprirebbe la mappa
  mentre si sceglie il bersaglio di una mossa (i percorsi del telefono toccano la mappa e poi i
  dettagli della mossa). Resta Owlbear nell'aspetto (angoli, maniglia), la pagina scorre.
- **Misure in JavaScript** (`fitHud`): la targa può andare a capo (interfaccia più grande,
  finestre strette) e il numero di ritratti varia; il CSS dà i valori iniziali, `fitHud` li
  corregge a ogni disegno e ridimensionamento. Scelta nostra, nessun prodotto.
- **Regole lette dai test lasciate nel file e superate in cascata**: `combat.css`
  (`.table-layout:has(> .initiative) .table-stage { height: clamp(…) }`) e `styles.css`
  (`[data-table="end-turn"] { grid-column: 4; grid-row: 1 / span 2 }`, il blocco del telefono
  B61 come ultimo `@media (max-width: 720px)`, per cui le regole nuove del telefono usano
  `@media screen and (max-width: 720px)`). I test non erano miei da cambiare.
- «noto», non riverificato in questa sessione: menu della stanza di Owlbear, tasti di zoom
  impilati di D&D Beyond Maps, suggerimenti di BG3 sopra la hotbar, versione da controller di BG3.
- Nel «prima» del telefono, `explore-player` mostra il pannello perché la vista precedente dello
  script aveva fatto scorrere la pagina; il «dopo» è preso con lo stesso script.
- Solo Chromium su macOS, finestre senza emulazione del tocco nelle catture (i percorsi del
  telefono usano contesti touch); nessun dispositivo reale; revisione in un solo contesto, da
  ripetere in un'altra sessione sulla SHA candidata.

## Consegne (fuori da questo passaggio)

1. `combat-tracker.mjs`: posiziona «Tocca a te» a 12 px dal bordo della mappa in JS; dovrebbe
   leggere il fondo dell'ordine di turno invece del margine CSS.
2. `preferences.css`: le regole del Tavolo senza mappa e dell'interfaccia più grande (altezza
   del palco da `--pref-table-chrome`) sono ora superate dal blocco HUD: da semplificare.
3. `tests/ia-consolidation.test.mjs`, `review-fixes-b62.test.mjs`: leggono regole geometriche
   ormai superate (altezze del palco, colonne della hotbar); da aggiornare dai loro autori.
4. `conditions-ui.mjs`: il riassunto «embedded» chiama il pulsante «Danni, cure e condizioni»;
   nella scheda Creatura si potrebbe tenere «Condizioni e stato».
5. `help.mjs`: il suggerimento del primo accesso sul telefono si posa sulla barra delle schede
   in base al fondo della mappa; con la mappa più alta serve margine (qui 3 px).
