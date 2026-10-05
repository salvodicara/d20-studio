# Opzione 1 · Baldur's Gate 3 — fonti, confronti e licenze

- **Data:** 30/09/2026 (giro di correzioni dopo la critica indipendente, stesso giorno);
  **01/10/2026** estensione a cinque stati in più (Tavolo in esplorazione, Magie, Inventario,
  finestra dell'iniziativa, menu della pedina), le tre correzioni chieste dalla verifica e la
  scala unica di I-250; **01/10/2026, secondo giro di correzioni** dopo la seconda critica
  indipendente (12 rilievi, tutti applicati; tre in parte, con il motivo in «Differenze
  dichiarate»); **01/10/2026, giro di rifinitura** dopo la terza verifica (i sei punti aperti, e
  la coerenza di I-250 misurata dallo strumento di verifica e dal campionario dei componenti,
  anche sotto la piega); **01/10/2026, secondo giro di rifinitura** dopo la quarta verifica
  (i quattro punti aperti e un secondo passaggio di I-250, vedi «Coerenza (I-250)»);
  **01/10/2026, terzo giro di rifinitura** dopo la quinta verifica (il punto medio e i bassi
  aperti, un terzo passaggio di I-250, vedi «Terzo giro di rifinitura»); **01/10/2026, quarto
  giro di rifinitura** dopo la sesta verifica (vedi «Quarto giro di rifinitura»); **01/10/2026,
  quinto giro di rifinitura** dopo la settima verifica (il punto medio, il basso e un quinto
  passaggio di I-250, vedi «Quinto giro di rifinitura»); **01/10/2026, marchio** proprio
  dell'opzione (I-251, vedi «Marchio»); **01/10/2026, dettagli rifiniti** dopo la critica
  indipendente dei dettagli (I-252: 22 rilievi, tutti applicati, quattro in parte con il motivo;
  vedi «Dettagli rifiniti»).
  **Direzione:** `bg3` (Fase C, giro 1, «Scelta 1 — Direzione», I-248).
- **Come vederla:** <http://127.0.0.1:8881/?direction=bg3#home> (poi `#characters?id=livia` e
  `#table`; nella scheda le schede «Magie» e «Inventario»; al Tavolo il tasto destro su una
  pedina e, da DM, «Avvia combattimento»). Solo tema scuro: con il tema chiaro l'app resta
  com'è oggi.
- **Screenshot:** `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round1/bg3/`
  (16 immagini, coppie affiancate in `_pairs/`); controlli in `…/visual-01/probe-bg3/` (quelli
  dell'estensione del 01/10 in `probe-bg3/ext/`, quelli del secondo giro di correzioni in
  `probe-bg3/fix2/`, quelli del giro di rifinitura in `probe-bg3/fix3/`, quelli del secondo giro
  di rifinitura in `probe-bg3/fix4/`, quelli del terzo in `probe-bg3/fix5/`, del quarto in
  `probe-bg3/fix6/`, del quinto in `probe-bg3/fix7/`, dei dettagli rifiniti in
  `…/visual-01/fix-bg3/`); misura dei valori
  in `…/visual-01/audit/bg3/audit.md` (prima della rifinitura: `probe-bg3/fix3/audit-before/`;
  prima del secondo giro: `probe-bg3/fix4/audit-before/`; prima del terzo:
  `probe-bg3/fix5/audit-before/`; prima del quarto: `probe-bg3/fix6/audit-before/`; prima del
  quinto: `probe-bg3/fix7/audit-before/`; prima dei dettagli: `fix-bg3/audit-before/`).
- **File di questa opzione:** `direction.css` (tutto l'aspetto), `icons.mjs` (icone), `brand.mjs`
  (il dado del marchio e l'icona della scheda del browser), `assets/`
  (cornice delle finestre, filetti dei titoli, riccioli della striscia dei turni, disegnati per
  questo progetto; due dipinti d'esempio). Nessun pixel, carattere, texture o logo di Larian.

## In tre righe

1. Copia l'interfaccia di gioco di Baldur's Gate 3: lastre quasi nere con un solo filo di bronzo,
   pulsanti a losanga con le punte e il filo d'oro, testo color bronzo e crema, un solo carattere
   con le grazie (Alegreya, quello che Larian usa col controller), mai tutto maiuscolo.
2. Al Tavolo la barra in basso è quella di BG3: il medaglione col ritratto e i punti ferita sopra,
   le due file di caselle con i separatori rossi, il disco «Termina turno» blu con l'anello
   azzurro; in alto i ritratti alti del turno uniti in una striscia con i riccioli d'oro ai lati.
3. Si sente come una schermata di BG3: Inizio è un menu su una scena fredda e scura, la scheda è
   il pannello «Esamina» con i numeri tutti sulla stessa riga, le finestre hanno la cornice a
   filo con le spine agli angoli e l'arco in alto, i menu sono il menu contestuale di BG3.
4. Un solo sistema (I-250): ogni spazio, carattere, interlinea, raggio, bordo e altezza dei
   comandi viene da una sola scala presa dalle misure di BG3 (vedi «Scala unica» più sotto).

## Elemento → prodotto copiato → fonte

Le immagini citate sono in `~/Workspace/Codex/d20-studio-visual-assets/references/bg3-solasta/`
(solo riferimento, mai nel repository). «facts» = `facts.md` della stessa cartella (valori misurati
dal codice XAML del gioco e dalle immagini); l'indirizzo è quello originale del `manifest.md`.

| Elemento                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Prodotto copiato                                                               | Fonte                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colori: lastre `#0c0c0c` al 90 %, bordo `#523c28`, bronzo `#77542C`, oro `#B17D44`; testo `#af8768` / `#cbac95` / `#E6DBC2`, luce `#fff2b3`, titoli `#fffced`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | BG3, tavolozza del gioco                                                       | facts A0 (XAML `DefaultTheme.Colours.xaml`)                                                                                                                                                                                                                                                                                                                       |
| Un solo carattere con le grazie, maiuscole solo nelle sigle brevi (FOR, DES, CA), numeri allineati; tutte le etichette scritte come parole («Competenza», «Effetti», «Armi»), senza maiuscoletto e senza spaziatura tra le lettere                                                                                                                                                                                                                                                                                                                                                                                                                                               | BG3, interfaccia col controller (Alegreya)                                     | facts A0.1 (`Controller.Fonts.xaml`, confronto metrico con Quadraat); `bg3-type-ofl-candidates-specimen.png` (composizione nostra da `bg3-panels-subclass-select-steam.jpg`)                                                                                                                                                                                      |
| Intestazione: fascia quasi nera chiusa da un filo di bronzo e uno d'oro; schede del menu in tondo, spente in bronzo, quella aperta chiara con la tacca d'oro sotto e la luce dal basso                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | BG3, schede dell'inventario (controller)                                       | `bg3-panels-context-menu-inventory.jpg` — <https://steamcommunity.com/sharedfiles/filedetails/?id=3760817633>                                                                                                                                                                                                                                                     |
| Pulsanti: losanga allungata con le punte corte, un filo d'oro che corre sopra, sotto e lungo le punte, corpo marrone scuro con la fascia centrale più chiara che si accende al passaggio; il principale blu-verde; le pillole piccole (pagine della barra, sotto-schede) restano pillole                                                                                                                                                                                                                                                                                                                                                                                         | BG3, menu principale e pulsanti «Edit Appearance» / «Proceed»                  | `bg3-home-main-menu-annotated.jpg` — <https://static0.gamerantimages.com/wordpress/wp-content/uploads/2025/04/how-to-use-cross-play-in-bg3.jpg>; `bg3-panels-subclass-select-steam.jpg` (indirizzo più sotto); facts A3 (TEX `Btn_big_brown_*`, `BigBlue`, `btn_pil`)                                                                                             |
| Campi, menu a tendina, caselle numeriche e di ricerca: un solo campo in tutta l'app — capsula scura col bordo di bronzo più chiaro in alto, alta 40 px, 16 px di margine interno, testo 16 medio, numeri centrati (prima erano sette varianti); dal 01/10 anche il menu dei dadi della barra sul computer                                                                                                                                                                                                                                                                                                                                                                        | BG3, ricerca dell'inventario («Showing All»)                                   | `bg3-panels-tooltip-skill.png` — <https://deltiasgaming.com/wp-content/uploads/2023/08/Baldurs-Gate-3-Athletics-skill-tooltip.png>; facts A3                                                                                                                                                                                                                      |
| Lastre (schede di Inizio, blocchi della scheda, pannello laterale): quasi nere con un solo filo di bronzo scuro, senza anello interno e senza ornamenti; il filo doppio (bronzo, spazio scuro, oro) resta solo alla barra delle azioni; una sola lastra (stesso fondo, filo, ombra, 24 px dentro) per Inizio e per ogni blocco della scheda, 24 px tra una lastra e l'altra, un solo titolo di lastra (22 px) e un solo comando nel titolo (il pulsante discreto, con le lettere sul filo della lastra)                                                                                                                                                                          | BG3, pannelli e finestra «Esamina»                                             | facts A3 («single thin bronze line», OBS B31), A1 (cornice della HotBar); `bg3-sheet-examine-enemy.jpg`                                                                                                                                                                                                                                                           |
| Finestre (dialoghi): il filo di bronzo è la cornice; a ogni angolo una spina con due uncini, dentro un arco a quarto di cerchio tra i due lati; in alto al centro un arco con un rombo; titolo centrato, niente righe divisorie                                                                                                                                                                                                                                                                                                                                                                                                                                                  | BG3, pannello «Select Subclass»                                                | `bg3-panels-subclass-select-steam.jpg` — <https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/ss_44d30da9c3e4622b46f2978e89bda0515856eaf4.1920x1080.jpg>; disegno nostro (`assets/frame-*.svg`, vedi licenze)                                                                                                                              |
| Suggerimenti (tooltip): lastra bruno-nera, bordo di bronzo di 2 px più chiaro in alto, raggio 8 px, ombra ampia                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | BG3, tooltip                                                                   | `bg3-panels-tooltip-skill.png` (indirizzo sopra); facts A3 (TEX `TT_full_bg`)                                                                                                                                                                                                                                                                                     |
| Inizio: una scena scura, fredda e cinematografica dietro a tutto, sfumata verso i bordi; il titolo su una macchia scura col contorno scuro del testo; al telefono il dipinto riempie la prima schermata                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | BG3, menu principale                                                           | `bg3-home-main-menu-annotated.jpg` (indirizzo sopra); dipinto d'esempio = `assets/home-hall.webp` (del proprietario), virato al freddo dal foglio di stile                                                                                                                                                                                                        |
| Inizio, «Le lanterne di Bruma» è il menu: immagine d'anteprima in cornice sottile accanto ai dati; losanghe una sotto l'altra, «Entra al Tavolo» blu per prima e staccata dalle altre; anche «Prossimo appuntamento» mette i suoi pulsanti in colonna e centra ogni riga; ogni losanga in colonna è larga 214 px come il pulsante grande di BG3; ogni lastra di Inizio ha lo stesso margine interno di 24 px                                                                                                                                                                                                                                                                     | BG3, «Save File Information» della schermata di caricamento + colonna del menu | `bg3-home-load-save-screen.jpg` — <https://static0.gamerantimages.com/wordpress/wp-content/uploads/2023/07/save-screen-baldur-s-gate-3.jpg>; `bg3-home-main-menu-annotated.jpg`; facts A3 (`Btn_big` 428 × 80 a 4K = 214 × 40), A5; anteprima d'esempio = `assets/campaign-plate.webp`                                                                            |
| Scheda: ritratto in cornice di bronzo, nome grande e chiaro, riga della classe crema, nota in bronzo aranciato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | BG3, finestra «Esamina»                                                        | `bg3-sheet-examine-enemy.jpg` — <https://deltiasgaming.com/wp-content/uploads/2023/12/Baldurs-Gate-3-Grym-Stats-Resistances.jpg>                                                                                                                                                                                                                                  |
| Scheda, fascia: un unico pannello a filo singolo (solo quando è davvero un riquadro, da 900 px in su); FOR–CAR senza riquadri (sigla in bronzo, numero grande crema, punteggio semplice sotto); ogni etichetta su una riga (14 seminegretto), ogni numero grande sulla stessa riga (28), ogni valore piccolo sotto sulla stessa riga (14); il comando dei PF (quantità, «Cura», «Danno») va dalla riga delle etichette alla barra dei PF; separatori sottili; Iniziativa, CA e Difese con le etichette sulla stessa riga                                                                                                                                                         | BG3, riga STR–CHA della finestra «Esamina»                                     | `bg3-sheet-examine-enemy.jpg` (indirizzo sopra); facts A4                                                                                                                                                                                                                                                                                                         |
| Scheda, tiri salvezza e abilità: una colonna incorniciata, titoli centrati tra due filetti sottili che si assottigliano e finiscono in un piccolo ricciolo, righe senza scatole con nome e valore sulla stessa riga, puntino chiaro solo se competente, riga illuminata dal basso                                                                                                                                                                                                                                                                                                                                                                                                | BG3, colonna delle abilità e titoli «~ Conditions ~»                           | `bg3-panels-tooltip-skill.png` (indirizzo sopra); `bg3-sheet-examine-enemy.jpg`; filetti: disegno nostro (`assets/rule-*.svg`)                                                                                                                                                                                                                                    |
| Scheda, «Benedizione» / «Anatema»: caselle rotonde con ghiera di bronzo e spunta d'oro quando attive (non interruttori a slitta)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | BG3, caselle di scelta rotonde                                                 | facts A3, A4                                                                                                                                                                                                                                                                                                                                                      |
| Scheda e Tavolo, stato «Cosciente» e «Indebolimento 1–6»: il primo come lastra del tooltip, i livelli come caselle quadrate della barra su fondo `#050D10`, accese in oro con un anello chiaro quando raggiunte                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | BG3, tooltip e caselle della HotBar                                            | facts A3 (TEX `TT_full_bg`), A1                                                                                                                                                                                                                                                                                                                                   |
| Scheda, Classe armatura: scudo a punta con «CA» piccolo e il numero grande                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | BG3, scudo «AC» del pannello personaggio                                       | `bg3-sheet-character-panel.png` — <https://bg3.wiki/w/images/0/08/Character_sheet.png>; facts A4                                                                                                                                                                                                                                                                  |
| Scheda, «Livello 3 · PE»: barra su fondo verde-azzurro scuro in cornice di bronzo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | BG3, «Level 12 [barra] XP»                                                     | `bg3-sheet-character-panel.png` (indirizzo sopra); facts A4 (traccia `#1C303E`)                                                                                                                                                                                                                                                                                   |
| Punti ferita sempre rossi (`#D6233C` su `#360C02`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | BG3, barra dei PF                                                              | facts A0 (`HPColour`, `HBBgColour`); `bg3-table-combat-hud-spectator-steam.jpg`                                                                                                                                                                                                                                                                                   |
| Tavolo, barra in basso: è incorniciato solo il deck (bordo di bronzo, spazio scuro, filo d'oro), che prosegue sotto i comandi del turno; il medaglione a sinistra e «Termina turno» a destra stanno liberi e coprono le due estremità della cornice                                                                                                                                                                                                                                                                                                                                                                                                                              | BG3, HotBar                                                                    | `bg3-table-crop-hotbar-4k.png` (ritaglio di `bg3-table-hud-4k-exploration.jpg` — <https://steamcommunity.com/sharedfiles/filedetails/?id=3771500339>); facts A1                                                                                                                                                                                                   |
| Tavolo, medaglione rotondo del ritratto (100 px) con anello d'oro, i punti ferita «18/22» su una fascia rossa nella sua parte bassa; nome e «È il tuo turno» alla sua sinistra                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | BG3, ritratto della HotBar (246 px a 4K) con «19/24»                           | `bg3-table-crop-hotbar-4k.png`; facts A1 (`Grid x:Name="Portrait"`)                                                                                                                                                                                                                                                                                               |
| Tavolo, azioni: due file di caselle quadrate 58 × 48 su campo `#050D10`, caselle vuote disegnate, separatori rossi `#AA0101` tra i gruppi (dentro l'ultima colonna del gruppo, così ogni colonna sta su un passo di 58 px e la finestra mostra caselle intere a ogni larghezza), riga rossa sotto; tessere tinte per famiglia (armi rosso-bruno, magie blu, «Mosse» viola); icona di 18 px e nome su due righe a 11 px (al telefono 12 px), con la stessa regola a ogni larghezza; al telefono la fila scorre e sfuma a destra; casella scelta con il bordo bianco luminoso                                                                                                      | BG3, deck della HotBar                                                         | `bg3-table-crop-hotbar-4k.png`; `bg3-table-combat-hud-spectator-steam.jpg` — <https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/ss_f8c7fcdeccbfe77e3fad33330a464fed30f781f0.1920x1080.jpg>; facts A1                                                                                                                                     |
| Tavolo, «Azioni» / «Barra rapida»: le pillole della barra (il componente unico «Pillole», più sotto), larghe uguali                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | BG3, pillole Common / Class / Items                                            | `bg3-table-crop-hotbar-4k.png`; facts A1 (`btn_pil`, testo `#fff2b3`)                                                                                                                                                                                                                                                                                             |
| Tavolo, risorse: piccola lastra sopra le azioni, una cella scura per risorsa: cerchio verde, triangolo arancio, stella magenta, barretta d'oro del movimento, quadratini azzurri degli slot sotto il loro livello                                                                                                                                                                                                                                                                                                                                                                                                                                                                | BG3, lastra delle risorse                                                      | `bg3-table-crop-hotbar-4k.png`; icone `bg3-icons-action-icon.png`, `bg3-icons-bonus-action-icon.png`, `bg3-icons-reaction-icon.png`, `bg3-icons-spell-slot-icon.png` (bg3.wiki, es. <https://bg3.wiki/w/images/f/f2/Action_Icon.png>); facts A1                                                                                                                   |
| Tavolo, comandi del turno (muovi, azioni, dadi, annulla): bottoni rotondi con la ghiera di bronzo; quello scelto azzurro acciaio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | BG3, colonna lucchetto / + / −                                                 | `bg3-table-crop-endturn.png` (ritaglio di `bg3-table-combat-hud-spectator-steam.jpg`); facts A1, A4                                                                                                                                                                                                                                                               |
| Tavolo, «Termina turno»: disco blu notte più chiaro verso il basso, ghiera di bronzo a tacche, anello azzurro luminoso                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | BG3, End Turn                                                                  | `bg3-table-crop-endturn.png`; facts A1 (TEX `btn_endTurn_scaled_d`)                                                                                                                                                                                                                                                                                               |
| Tavolo, ordine dei turni: carte-ritratto alte (≈ 0,68) che si toccano in un'unica striscia (le carte vicine dello stesso lato hanno una cornice unita), cornice a gradiente di squadra (gruppo blu→azzurro, ostili rosso), quella di turno più grande in bianco, chi ha già agito scolorito, frecce sotto, grandi riccioli d'oro a metà altezza alle due estremità, nome sotto la striscia; le carte ostili tengono anche il bordo tratteggiato dell'app                                                                                                                                                                                                                         | BG3, TurnOrder                                                                 | `bg3-table-crop-turn-order-strip.png` (ritaglio di `bg3-table-combat-hud-spectator-steam.jpg`); facts A1 (`TurnOrderLib.xaml`, `frameTint.*`, `DefaultFrameBegin/Middle/End`, `CmbtSideDecor*`); riccioli: disegno nostro (`assets/endcap-*.svg`)                                                                                                                 |
| Tavolo, gruppo: ritratti in cornice di bronzo impilati, il selezionato in argento, la fascia rossa del danno che sale dal basso, il nome in bianco col contorno scuro in fondo alla carta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | BG3, ritratti del gruppo                                                       | `bg3-table-crop-party-portraits-4k.png` (ritaglio di `bg3-table-hud-4k-exploration.jpg`); facts A1                                                                                                                                                                                                                                                                |
| Tavolo, strumenti della mappa, zoom, schede della barra laterale: medaglioni rotondi con ghiera di bronzo e pittogramma d'oro, quello aperto azzurro acciaio; un bottoncino d'oro sulla ghiera dice «ci sono altri strumenti»                                                                                                                                                                                                                                                                                                                                                                                                                                                    | BG3, bottoni rotondi e schede a medaglione del pannello personaggio            | `bg3-table-combat-hud-spectator-steam.jpg` (colonna sinistra), `bg3-sheet-character-panel.png` (schede in alto); facts A4                                                                                                                                                                                                                                         |
| Tavolo, nome della scena: piccola lastra nera col nome in tondo, come la didascalia della minimappa; i comandi sulla linea di base del nome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | BG3, minimappa («RUINED BATTLEFIELD»)                                          | `bg3-table-combat-hud-spectator-steam.jpg`                                                                                                                                                                                                                                                                                                                        |
| Tavolo, barra laterale e ispettore: pannello quasi nero col bordo di bronzo, scudo della CA, sotto-schede a pillola                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | BG3, finestra «Esamina» e pillole                                              | `bg3-sheet-examine-enemy.jpg`; facts A3, A4                                                                                                                                                                                                                                                                                                                       |
| Tavolo, messaggio della mappa: lastra del tooltip                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | BG3, tooltip                                                                   | facts A3                                                                                                                                                                                                                                                                                                                                                          |
| Tavolo (DM), avviso «Sessione non avviata… Avvia ora / Non ora»: spostato sotto la striscia dei turni, così resta leggibile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | nessun equivalente in BG3 (garanzia dell'app)                                  | codice: `session-view.css` (`.session-view-hud-stack`)                                                                                                                                                                                                                                                                                                            |
| Pedine: nomi chiari col contorno scuro, barre dei PF rosse                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | BG3, testo sulla scena e barra PF                                              | facts A0.1 (contorno del testo), A0 (colori PF)                                                                                                                                                                                                                                                                                                                   |
| Icone: glifi pieni per le cose del gioco, per il menu principale, per i servizi in alto (cerca, appunti, richieste, preferenze, aiuto, connessione, account) e per gli strumenti della mappa, una sola famiglia per riga; linea solo dentro i piccoli comandi (chiudi, annulla, frecce, pannello); disegna, pianifica e misura hanno tre forme diverse (matita, pergamena con penna, percorso tratteggiato)                                                                                                                                                                                                                                                                      | BG3, due famiglie di icone                                                     | facts A1 «Iconography»; glifi da game-icons.net (CC BY 3.0, vedi licenze); nuvola della connessione = quella dell'app, piena                                                                                                                                                                                                                                      |
| Telefono: testo un gradino più grande della scala di BG3, caselle 58 × 52 (la casella del computer, più alta per il dito: tre intere nella finestra a 390 px), bottoni rotondi 44 px; pillole a 14 px come sul computer; barra in basso con un'icona di 24 px per ogni scheda (ritratto compreso), fino a 720 px il nome (12 px) solo sotto la scheda aperta, come le barre del controller di BG3, e schede sempre intere nella finestra; «Scena» col suo disegno (un paesaggio in cornice), diverso dalla mappa di «Mappa»; la riga della scena resta su una sola fila di comandi (quello del giocatore accanto al nome); l'intestazione del Tavolo su una sola fila, come oggi | BG3, interfaccia col controller                                                | facts A1 «Mobile» (`*_c.xaml`: testo +33 %, slot 116 px)                                                                                                                                                                                                                                                                                                          |
| Scala unica: spazi a passi di 2 px (2 · 4 · 6 · 8 · 12 · 16 · 24 · 32 · 48), caratteri della scala di BG3 (11 · 12 · 14 · 15 · 16 · 18 · 19 · 20 · 22 · 24 · 26 · 28 · 35 · 40), interlinee 1 · 1,1 · 1,15 · 1,4, raggi 2 · 4 · 6 · 8, bordi 1 · 2 · 3 · 5 · 6, comandi alti 28 · 40 · 44                                                                                                                                                                                                                                                                                                                                                                                        | BG3, unità di progetto (4 unità a 4K = 2 px) e scala dei caratteri             | facts «BG3 design space», A0.1 (`DefaultTheme.Fonts.xaml`: grandezze e interlinee), A1, A3, A5                                                                                                                                                                                                                                                                    |
| Caselle di spunta: quadratino scuro con il filo di bronzo e la spunta oro chiaro (la forma, non solo il colore, dice «sì»); nella finestra dell'iniziativa la spunta di chi combatte è tonda, come quella a sinistra di ogni riga di BG3                                                                                                                                                                                                                                                                                                                                                                                                                                         | BG3, pannello «Reactions» («Ask ☑» a destra, spunta tonda a sinistra)          | `bg3-panels-reactions-menu.png` — <https://bg3.wiki/w/images/8/84/Reactions_menu.png>                                                                                                                                                                                                                                                                             |
| Campi numerici (d20, punti ferita della pedina): la stessa capsula dei campi, senza le frecce del browser                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | BG3, ricerca dell'inventario                                                   | facts A3 (OBS B41)                                                                                                                                                                                                                                                                                                                                                |
| Avvisi (preparazione delle magie non modificabile, chiamata all'iniziativa): lastra del tooltip                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | BG3, tooltip                                                                   | facts A3 (TEX `TT_full_bg`)                                                                                                                                                                                                                                                                                                                                       |
| Pillole, un solo componente (prima erano quattro): filtri delle Azioni, livelli delle magie, filtri e colonne dell'inventario, pagine della barra, sotto-schede del Tavolo («Creatura», «Riepilogo del gruppo») e della scheda, pulsanti degli avvisi della sessione — pillola marrone col filo d'oro, alta 40 px, testo 14 seminegretto; quella scelta accesa con il bordo d'oro e il bagliore                                                                                                                                                                                                                                                                                  | BG3, pillole della barra (Common / Class / Items)                              | `bg3-table-crop-hotbar-4k.png`; facts A1 (`btn_pil`)                                                                                                                                                                                                                                                                                                              |
| Etichette (Equipaggiato, Preparata, comune): parole nel colore dei tag di BG3 in una pillola sottile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | BG3, tag dei tooltip                                                           | facts A3 (`TooltipColor.Tags` `#e6d892`)                                                                                                                                                                                                                                                                                                                          |
| Righe di elenco (magie, oggetti): senza riquadri, un filo sottile tra le righe, la riga sotto il puntatore illuminata dal basso                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | BG3, selezione nelle liste                                                     | facts A3 («List-row selection» `#130F0B` → `#34312D`)                                                                                                                                                                                                                                                                                                             |
| Menu della pedina, menu contestuali, menu «Aggiungi al calendario» e menu «Sessione» del DM: lastra grigio-bruna `#3F3A37` piena (il testo sotto non traspare), una riga per comando nel carattere con le grazie, righe divise da fili tenui, un filo chiaro che sfuma in alto, la riga scelta illuminata dal basso fino a un bordo chiaro; tutte le righe dello stesso colore; le icone arretrano nel colore delle parole chiave; il pulsante che apre il menu non cambia forma; in testa al menu della pedina il gettone nel medaglione rotondo della barra e la chiusura rotonda                                                                                              | BG3, menu contestuale (tasto destro)                                           | `bg3-panels-context-menu-inventory.jpg` — <https://steamcommunity.com/sharedfiles/filedetails/?id=3760817633>; `bg3-panels-tooltip-skill.png` (bottoni rotondi in alto a destra)                                                                                                                                                                                  |
| Finestra dell'iniziativa (DM): la cornice delle finestre; ogni creatura una riga arrotondata col filo di bronzo `#AF8768`, la spunta tonda a sinistra, il nome chiaro sopra la riga in bronzo, dado e tiro a destra, il totale come il numero del risultato di un tiro (grande, chiaro, col bagliore d'oro); l'avviso «I giocatori vedono…» come lastra del tooltip                                                                                                                                                                                                                                                                                                              | BG3, pannello «Reactions» e tiro di caratteristica                             | `bg3-panels-reactions-menu.png`; `bg3-dice-crop-roll-panel-advantage.png` (ritaglio di `bg3-dice-check-advantage-two-d20.jpg` — <https://static0.thegamerimages.com/wordpress/wp-content/uploads/2023/07/20230725222048_1.jpg>); facts A0 (`TextGlow` `#df9800`), A2                                                                                              |
| Scheda · Magie: i dati dell'incantatore in un'unica striscia (classe, caratteristica, attacco, CD…) come la fascia della scheda; i livelli come titoli tra i filetti; gli slot quadratini azzurri, in una tabella a colonne (livello, quadratini, spesi, «Correggi risorsa»; al telefono su due righe); ogni magia come il tooltip di BG3: nome chiaro, riga di costo e gittata in bronzo, componenti V/S in caselline della barra, stato come etichetta                                                                                                                                                                                                                         | BG3, libro degli incantesimi e tooltip della magia                             | `bg3-panels-tooltip-spell.jpg` — <https://www.gameskinny.com/wp-content/uploads/2023/08/baldurs-gate-3-prepare-spells.jpg>; facts A1 (slot `#00d2ff`), A3                                                                                                                                                                                                         |
| Scheda · Inventario: peso, sintonia, monete e set d'armi sulla stessa striscia; il peso come la barra di BG3 (fondo scuro, riempimento crema, rosso oltre il limite); la ricerca a capsula; il gruppo «Addosso» come la banda di BG3 («Adrianna 1,340 91.3/260»); ogni oggetto in una casella quadrata bruno scuro col bordo che si illumina verso l'interno nel colore della rarità; ogni riga con la stessa forma: Qtà, Peso e Cariche allineati a destra su un solo bordo, i comandi su una riga propria sotto il nome                                                                                                                                                        | BG3, inventario                                                                | `bg3-panels-tooltip-skill.png` (barra del peso 79.7/160, griglia); `bg3-panels-context-menu-inventory.jpg` (banda del gruppo); `bg3-sheet-party-inventory-steam.jpg` — <https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/ss_3cc4e8cfcfb8a91d19d96f631f076d252ba2c0c4.1920x1080.jpg>; facts A0 (`ItemRarityColour`), A4 (barra del peso) |
| Tavolo in esplorazione: la stessa barra, gli stessi ritratti e strumenti del combattimento, senza la striscia dei turni e senza «Termina turno»                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | BG3, interfaccia in esplorazione                                               | `bg3-table-hud-4k-exploration.jpg` — <https://steamcommunity.com/sharedfiles/filedetails/?id=3771500339>                                                                                                                                                                                                                                                          |
| Targhetta del nome sotto la striscia dei turni: su un fondo scuro sfumato, così si legge su qualsiasi parte della mappa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | BG3, targhetta «Spectator Lv. 1»                                               | `bg3-table-crop-turn-order-strip.png`                                                                                                                                                                                                                                                                                                                             |
| Comandi della sessione sopra la mappa (menu «Sessione», Stop, Rallenta, «Nascondi interfaccia»): gli stessi bottoni rotondi degli strumenti, ghiera di bronzo di 2 px; quelli con la sola icona sono cerchi di 40 px; Stop resta rosso e Rallenta ambra (anche forma e icona li distinguono)                                                                                                                                                                                                                                                                                                                                                                                     | BG3, bottoni rotondi della barra                                               | `bg3-table-combat-hud-spectator-steam.jpg`; facts A1 «Iconography»                                                                                                                                                                                                                                                                                                |
| Avvisi della sessione sulla mappa («Sessione non avviata… Avvia ora / Non ora»): la lastra del tooltip, bordo ambra per l'avviso; i due pulsanti sono pillole                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | BG3, tooltip                                                                   | facts A3 (TEX `TT_full_bg`)                                                                                                                                                                                                                                                                                                                                       |
| Scelte a due («Gioco / Modifica», «Dadi digitali / fisici»): una pillola divisa in due, la parte scelta accesa in bronzo come ogni pillola scelta; il blu-verde resta solo per l'azione principale                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | BG3, pillole della barra e pulsante principale `BigBlue`                       | facts A1 (`btn_pil`), A3                                                                                                                                                                                                                                                                                                                                          |
| Pulsanti di testo dentro una frase («Annulla l'avvio», «Perché?»): restano nella riga senza allargarla (interlinea 1,4); l'area di tocco resta di oltre 40 px con un margine invisibile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | BG3, testo dei tooltip con le parole chiave                                    | facts A0.1 (interlinea), A3                                                                                                                                                                                                                                                                                                                                       |
| Comandi dell'ispettore del Tavolo («Scheda completa», «Inventario», «Riposa»): una colonna di losanghe larghe 214 px, ogni nome su una riga                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | BG3, colonna del menu (`Btn_big`)                                              | facts A3                                                                                                                                                                                                                                                                                                                                                          |

Solasta non è servito: BG3 copre ogni elemento usato, anche nei cinque stati aggiunti il 01/10.
Nessuna immagine nuova è stata scaricata: quelle della cartella bastavano.

## Coppie per il confronto

Le coppie già montate (nostro screenshot a sinistra, immagine del prodotto a destra, col nome del
file sotto) sono in `…/round1/bg3/_pairs/`.

| Superficie                | Nostro screenshot                                                                                              | Immagine del prodotto                                                                                                                                                                             | Viewport               | Coppia montata                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| Inizio                    | `home-dark-1440-bg3.png`                                                                                       | `bg3-home-main-menu-annotated.jpg` (scena, colonna di losanghe); `bg3-home-load-save-screen.jpg` (anteprima + dati)                                                                               | 1440 × 900             | `pair-home.png`                                                                                                 |
| Inizio                    | `home-dark-390-bg3.png`                                                                                        | `bg3-home-main-menu-annotated.jpg` (BG3 non ha il telefono)                                                                                                                                       | 390 × 844              | `pair-home-390.png`                                                                                             |
| Scheda                    | `sheet-dark-1440-bg3.png`                                                                                      | `bg3-sheet-examine-enemy.jpg` (riga FOR–CAR, scudo, titoli tra filetti); `bg3-panels-tooltip-skill.png` (colonna delle abilità)                                                                   | 1440 × 900             | `pair-sheet.png`                                                                                                |
| Scheda                    | `sheet-dark-390-bg3.png`                                                                                       | `bg3-sheet-inventory-equipment.jpg` (pannello col controller)                                                                                                                                     | 390 × 844              | `pair-sheet-390.png`                                                                                            |
| Tavolo                    | `table-combat-dark-1440-bg3.png`, `table-combat-dm-dark-1440-bg3.png`                                          | `bg3-table-combat-hud-spectator-steam.jpg`; dettagli `bg3-table-crop-hotbar-4k.png`, `bg3-table-crop-turn-order-strip.png`, `bg3-table-crop-party-portraits-4k.png`, `bg3-table-crop-endturn.png` | 1440 × 900             | `pair-table.png`, `pair-table-dm.png`, `pair-hotbar.png`, `pair-turn.png`, `pair-party.png`, `pair-endturn.png` |
| Tavolo                    | `table-combat-dark-390-bg3.png`, `table-combat-dm-dark-390-bg3.png`                                            | `bg3-table-crop-turn-order-strip.png`, `bg3-table-crop-endturn.png`                                                                                                                               | 390 × 844              | `pair-table-390.png`                                                                                            |
| Finestre                  | `dialog-initiative-dark-1440-bg3.png` (ritaglio della finestra)                                                | `bg3-panels-subclass-select-steam.jpg`                                                                                                                                                            | 1440 × 900             | `pair-dialog.png`                                                                                               |
| Tavolo in esplorazione    | `table-explore-dark-1440-bg3.png`                                                                              | `bg3-table-hud-4k-exploration.jpg` (barra, ritratti del gruppo, minimappa)                                                                                                                        | 1440 × 900             | `pair-explore.png`                                                                                              |
| Tavolo in esplorazione    | `table-explore-dark-390-bg3.png`                                                                               | `bg3-table-hud-4k-exploration.jpg` (BG3 non ha il telefono)                                                                                                                                       | 390 × 844              | `pair-explore-390.png`                                                                                          |
| Scheda · Magie            | `sheet-spells-dark-1440-bg3.png`                                                                               | `bg3-panels-tooltip-spell.jpg` (striscia in alto, livelli, tooltip della magia)                                                                                                                   | 1440 × 900             | `pair-spells.png`                                                                                               |
| Scheda · Magie            | `sheet-spells-dark-390-bg3.png`                                                                                | `bg3-panels-tooltip-spell.jpg`                                                                                                                                                                    | 390 × 844              | `pair-spells-390.png`                                                                                           |
| Scheda · Inventario       | `sheet-inventory-dark-1440-bg3.png`                                                                            | `bg3-panels-tooltip-skill.png` (barra del peso, griglia, ricerca); `bg3-panels-context-menu-inventory.jpg` (banda del gruppo «Adrianna»)                                                          | 1440 × 900             | `pair-inventory.png`                                                                                            |
| Finestra dell'iniziativa  | `dialog-initiative-dark-1440-bg3.png`                                                                          | `bg3-panels-reactions-menu.png` (righe con la spunta); `bg3-dice-crop-roll-panel-advantage.png` (numero del risultato); `bg3-panels-subclass-select-steam.jpg` (cornice)                          | 1440 × 900             | `pair-initiative.png`, `pair-dialog.png`                                                                        |
| Menu della pedina         | `token-menu-dark-1440-bg3.png`                                                                                 | `bg3-panels-context-menu-inventory.jpg` (ritaglio del menu)                                                                                                                                       | 1440 × 900             | `pair-token-menu.png`                                                                                           |
| Menu del calendario       | sonda `probe-bg3/fix7/cal-390.png`, `cal-1440.png` («Aggiungi al calendario» aperto, Inizio)                   | `bg3-panels-context-menu-inventory.jpg` (ritaglio del menu)                                                                                                                                       | 390 × 844 e 1440 × 900 | `pair-calendar-menu.png`                                                                                        |
| Fascia della scheda       | `sheet-dark-1440-bg3.png` (ritaglio della fascia)                                                              | `bg3-sheet-examine-enemy.jpg` (riga STR–CHA, scudo)                                                                                                                                               | 1440 × 900             | `pair-band.png`                                                                                                 |
| Finestra dei punti ferita | sonda `probe-bg3/fix7/items/hpdlg-*.png` («Punti ferita · Livia» aperta dalla barra del Tavolo e dalla scheda) | `bg3-panels-subclass-select-steam.jpg` (cornice)                                                                                                                                                  | 1440 × 900 e 390 × 844 | `pair-hp-dialog.png`                                                                                            |

## Differenze dichiarate

- **Telefono.** BG3 non ha un'interfaccia per telefono. Abbiamo seguito quella col controller:
  testo un gradino più grande, caselle più grandi, bottoni rotondi, stessi colori e cornici. Il disco
  «Termina turno» diventa una pillola blu con l'anello azzurro, perché nella riga dei comandi un
  disco non ci sta; «Termina turno», «Annulla» e «Esc · Annulla preparazione» restano visibili.
  Sotto la striscia dei turni non compare il nome (nessuno spazio); i nomi restano letti dallo
  screen reader. La barra è alta 167 px (oggi 153): i bottoni dello zoom e la colonna dei
  ritratti salgono con lei (78 px dal fondo della mappa con la lastra della scena del DM, 54 px
  con quella del giocatore) e restano interi, 8–12 px sopra la barra, da giocatore e da DM, in
  combattimento e in esplorazione. La lastra della scena tiene i comandi su una sola fila e sulla
  linea di base del nome (prima, da DM, «Tempo» andava a capo e spingeva la mappa sotto la
  barra); da giocatore «Riposi» resta accanto al nome e «Combattimento · Round 1» va sotto il
  nome: la lastra è alta 58 px invece di 85, senza la metà vuota. L'intestazione del Tavolo resta
  su una sola fila come oggi (63 px): «App» e la freccia di ritorno hanno il margine compatto di
  6 px, i sei servizi si toccano (prima andava su due file, 109 px).
- **Menu dei dadi della barra al telefono.** Sul computer è il campo unico (16 px dentro, testo
  16). Al telefono resta compatto (8 px dentro, testo 12; 4 px tra 375 e 383 px): il campo
  intero allargava la sua colonna di 28 px e tagliava la riga delle risorse («9 m» spariva).
  Dal 01/10 (dettagli) non ha più una pillola sua intorno: ha un solo bordo, il suo.
- **Tabella delle azioni generiche al telefono.** Dentro la lastra (24 px per lato) la terza
  colonna usciva dalla vista; al telefono la tabella arriva al filo della lastra e le sue celle
  tengono gli 8 px di margine, così sta tutta.
- **Nomi nelle caselle delle azioni.** In BG3 le caselle hanno solo l'icona (il nome è nel
  tooltip). Da noi le magie usano tutte la stessa icona del libro: senza il nome sarebbero
  indistinguibili. Il nome resta sotto l'icona su due righe (prima una, tagliata: «Dardo in…» e
  «Dardo di …» sembravano uguali), con la stessa regola sul computer e al telefono; il nome
  intero resta quello letto dallo screen reader e nel suggerimento.
- **Testo piccolo al telefono (in parte diverso da quanto chiesto).** La critica chiedeva 14 px
  per i nomi della barra in basso e delle caselle. Le pillole sono a 14 px; il nome della scheda
  aperta nella barra in basso è a 12 px. I nomi delle caselle sono a 11 px, come sul computer
  (dal 01/10, dettagli): la casella del telefono è quella del computer, 58 px, perché tre caselle
  intere entrino nella finestra a 390 px (con 64 px se ne vedevano 2,6 e «Mani brucianti» era
  tagliato a metà parola); a 12 px «Disimpegno» (60,6 px) non entra in 58. Fino a 420 px le
  schede chiuse della barra in basso mostrano solo l'icona (il nome resta il loro nome
  accessibile), come le barre del controller di BG3: nessun nome è tagliato e le schede nella
  finestra sono intere.
- **Ricerca dell'inventario senza testo d'esempio.** Il campo non ha un testo d'esempio («Cerca…»)
  nel markup dell'app; un foglio di stile non può aggiungerlo. L'etichetta «Cerca
  nell'inventario» resta sopra il campo.
- **Pulsanti di testo dentro una frase.** «Annulla l'avvio» e «Perché?» non hanno più un riquadro
  alto 40 px (allargava la riga: 31 px contro 22). L'area di tocco resta di 46 × la larghezza
  grazie a un margine invisibile; lo strumento di verifica li misura alti 19–25 px perché conta
  solo il testo visibile.
- **Pillole «Azioni» / «Barra rapida».** In BG3 stanno sotto la barra; da noi a sinistra delle
  azioni, perché sotto non c'è spazio senza superare i 120 px d'altezza della barra (limite dei
  controlli).
- **Numeri dei PF sui ritratti del gruppo.** BG3 scrive «19/24»; un foglio di stile non può
  aggiungere testo e la carta non contiene il numero. Resta la fascia rossa proporzionale e in
  fondo alla carta compare il nome; il numero è nel nome del pulsante e sul medaglione della
  barra. Nel gruppo compatto (schermi medi) e al telefono le carte sono troppo piccole: il nome
  resta solo per lo screen reader.
- **La barra continua nel piede della barra laterale.** BG3 centra la barra su una scena 3D aperta;
  il nostro Tavolo tiene la barra laterale (struttura fissa). Comandi e «Termina turno» vivono nel
  suo piede: la cornice del deck prosegue sotto i comandi e finisce sotto il disco, come in BG3.
- **Punti ferita sul medaglione.** Il pulsante dei PF sta sul medaglione: dal 01/10 (dettagli) è
  un bersaglio di 74 × 40 px con la fascia rossa di 28 px disegnata dentro (prima il pulsante
  stesso era alto 28, come oggi): la fascia resta dov'era, la barra resta di 114 px.
- **«Barra rapida» del DM a 1440.** Il DM ha un'icona in più («Tiri nascosti»): la fila degli
  strumenti chiede 452 px e ne ha 424, così «Opzioni della barra» resta mezza fuori (scorre;
  apre lo stesso menu del nome della pagina; «Attuale» ne taglia due). Accorciare la pillola
  del nome a 96 px non basta (mancano ancora 19 px); per farla stare bisognerebbe mandare la fila
  a capo (barra oltre i 120 px) o togliere la scritta «d20» del menu.
- **Schermi medi (721–1279 px).** Il deck è stretto: la lastra delle risorse perde le celle e si
  sposta sopra il nome; la scheda dei dadi («Digitali») la segue a 12 px, come a ogni larghezza.
- **Parti di BG3 senza equivalente nei nostri dati:** set d'armi, icona di classe, clessidra del
  turno a tempo, sedici colonne sempre visibili (da noi solo le caselle delle azioni reali più le
  vuote dei loro gruppi), paperdoll e inventario a griglia nella scheda.
- **Nome sotto la striscia dei turni.** BG3 mostra il nome della creatura puntata; noi quello
  della creatura di turno, perché la striscia non segue il puntatore.
- **Medaglione del ritratto** visibile da 1280 px in su; sotto, l'app lo nasconde già per spazio
  e i PF restano accanto al nome.
- **Avviso della sessione (DM).** In BG3 non esiste; da noi scende sotto la striscia dei turni
  invece di starci sotto coperto (difetto di oggi, qui corretto).
- **Esagoni dei punteggi.** BG3 mette l'esagono solo sui tiri salvezza in cui la creatura è
  competente; la fascia non mostra quella competenza, quindi niente esagoni.
- **Inizio.** Il menu di BG3 ha solo logo e pulsanti; la nostra Inizio ha delle schede. Abbiamo
  usato la grammatica di «Save File Information» (anteprima + dati) per «Le lanterne di Bruma» e i
  pulsanti in colonna del menu. I due dipinti sono dell'owner (vecchio d20 Folio), segnaposto: la
  sala d'armi è virata al freddo dal foglio di stile, l'anteprima resta calda. Dal 01/10 le ombre
  della sala sono schiarite (come un fotogramma «graduato») e la vignettatura è più leggera: la
  fascia sotto il titolo passa da 19 a 51 su 255 di luminosità media e l'architettura si vede
  dietro le schede, come la scena del menu di BG3.
- **Punti ferita sempre rossi** come in BG3: niente verde/giallo; lo stato si legge dal numero e
  dalla lunghezza della barra (mai il solo colore).
- **Niente maiuscoletto (cambiato il 01/10).** Prima le etichette piccole erano in maiuscoletto
  sintetizzato dal browser (COMPETENZA, MOVIMENTO…). BG3 scrive le etichette come parole e usa le
  maiuscole solo per le sigle brevi: ora «Competenza», «Movimento», «Effetti», «Armi», «Qtà»;
  restano maiuscole solo le parole che lo sono già (FOR, DES, CA). Nessuna spaziatura tra le
  lettere, tranne con la preferenza «carattere leggibile», che tiene la sua. Alegreya Sans non è
  usato: BG3 con mouse e tastiera non usa caratteri senza grazie.
- **Icone.** Cambiano 26 nomi (vedi licenze), più la nuvola della connessione (quella dell'app,
  piena); la lente e il «?» sono disegnati per questo progetto (pieni, 01/10). Le icone
  disegnate a mano dall'app (risorse del turno nella scheda, «trova pedina», controlli della
  sessione) e i piccoli pittogrammi a linea dentro i comandi restano quelli di oggi; le righe del
  menu della pedina non hanno icone (vedi sotto). Il marchio ha la sua sezione («Marchio»).
- **Contrasto alto.** Con la preferenza «contrasto alto» i pulsanti tornano rettangoli con il
  bordo pieno di 2 px nel colore delle linee di quella preferenza (`#9aa9b4`, circa 8:1 sul fondo):
  la losanga taglierebbe il bordo e l'anello di 4 px. Corretto il 01/10: prima un filo di bronzo
  di 1 px vinceva sul bordo di 2 px (verificato di nuovo: «Entra al Tavolo» ha 2 px pieni). Anche i
  bottoni rotondi del Tavolo prendono quel colore. Le caselle di spunta tornano quelle del
  browser.
- **Interruttori.** BG3 non ha interruttori a slitta: le sue scelte sì/no sono caselle. I tre
  interruttori della scheda («Il DM può modificare questa scheda», «Ispirazione eroica»,
  «Disponibile offline») e quello di base dell'app restano interruttori, nei colori di questa
  opzione (pozzetto scuro, filo e pomello di bronzo; acceso crema col pomello scuro a destra) e
  tutti della stessa misura (40 × 22 px, pomello di 12 px). Così un interruttore non si confonde
  con una casella di spunta, come oggi.
- **Menu della pedina.** Il menu contestuale di BG3 ha solo parole. Il nostro tiene in testa il
  gettone (col suo ritratto), il nome, i punti ferita modificabili e l'aiuto: sono dati e
  comandi che BG3 mette altrove. Dal 01/10 (dettagli) i comandi sono solo parole, come in BG3:
  le icone a linea dell'app erano l'unica famiglia a linea tra le icone piene di questa opzione.
  Il conteggio dei sottomenu sta in un pozzetto scuro (in BG3 non c'è).
- **Finestra dell'iniziativa.** BG3 tira l'iniziativa da solo e non ha una finestra per farlo:
  abbiamo preso le righe del pannello «Reactions» (una creatura per riga, la spunta tonda a
  sinistra, i controlli a destra) e il numero grande del risultato di un tiro. «Sorpreso» tiene la
  spunta quadrata come «Ask» di BG3.
- **Magie e inventario come elenchi.** BG3 mostra magie e oggetti come griglie di icone dipinte;
  i nostri dati non hanno icone per ogni magia o oggetto, e ogni riga porta comandi (Lancia,
  Dettagli, Riponi…). Restano elenchi, vestiti con la grammatica di BG3: nome come il titolo del
  tooltip, riga di costo in bronzo, casella quadrata dell'oggetto col bordo della rarità.
- **Colori della rarità.** Non comune, raro e leggendario prendono i colori di BG3 (`#00be3a`,
  `#00c0ff`, `#d18f00`). Il viola di BG3 per «molto raro» (`#d1007c`) è troppo scuro per una
  parola su fondo scuro (3,7:1): resta il viola chiaro dell'app nelle parole, e il viola di BG3
  solo sul bordo della casella.
- **Monete.** La riga «30 mo · 45 ma · 120 mr · 12 sb» va a capo in due metà simili («30 mo · 45
  ma» / «· 120 mr · 12 sb», dal 01/10): nessuna cifra resta senza la sua unità. Il punto in
  mezzo va a capo con la seconda riga perché lo spazio prima di lui è il solo punto di a capo del
  testo, che un foglio di stile non può cambiare.
- **Targhetta del nome sotto la striscia dei turni.** BG3 la scrive sulla scena col solo contorno
  scuro; da noi ha anche un fondo scuro sfumato, perché sulla mappa chiara il contorno non bastava
  a 4,5:1 (misura dello strumento di verifica).
- **Valori che restano fuori dalla scala** (vedi «Scala unica» qui sotto): geometria della
  striscia dei turni (94 px di spazio per i riccioli, 52 al telefono, −118 px di sovrapposizione
  al telefono), il medaglione che si sovrappone di 24 px al deck, l'altezza del disco «Termina
  turno» (98 px), quella della fascia dei PF sul medaglione (28 px, dentro un bersaglio di 40), i
  rientri di −16 px che portano l'inchiostro dei pulsanti senza riquadro sul bordo della colonna,
  e i valori dell'app che questa opzione non disegna (elenco in «Scala unica»).
- **Invariati:** tema chiaro, preferenze di contrasto alto, daltonismo, carattere leggibile e
  movimento ridotto (vincono sempre). Il marchio è dell'opzione (I-251, «Marchio»).

## Scala unica (I-250)

Ogni spazio, carattere, interlinea, raggio, bordo e altezza dei comandi che questa opzione decide
viene da una sola scala, presa dalle misure di BG3 (`direction.css`, blocco «scales», gettoni
`--bg3-*`). BG3 disegna la sua interfaccia su 3840 × 2160 a passi di 4 unità, cioè 2 px a 1080p.

| Cosa                               | Valori                                                                                                                                                                                                                                                                                                                                                                                      | Da dove viene                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Spazi (margini, rientri, distanze) | 2 · 4 · 6 · 8 · 12 · 16 · 24 · 32 · 48 px                                                                                                                                                                                                                                                                                                                                                   | passo di 4 unità a 4K; 12 unità tra i bottoni del menu (6 px) e il doppio tra i gruppi (facts A5)                       |
| Caratteri                          | 11 · 12 · 14 · 15 · 16 · 18 · 19 · 20 · 22 · 24 · 26 · 28 · 35 · 40 px (Tiny … Humongous)                                                                                                                                                                                                                                                                                                   | `DefaultTheme.Fonts.xaml` di BG3 (facts A0.1); al telefono ogni passo sale di uno, come nell'interfaccia col controller |
| Interlinee                         | 1 (numeri in un riquadro) · 1,1 · 1,15 · 1,4 (testo corrente)                                                                                                                                                                                                                                                                                                                               | rapporti di BG3: Humongous 88/80, Small 32/28 e Title 55/48, Intermediate 54/38                                         |
| Raggi                              | 2 (caselle, lastre e ogni pannello) · 4 (etichette) · 6 (cornici dei ritratti) · 8 (tooltip, carte dei turni) px, più pillola e cerchio                                                                                                                                                                                                                                                     | facts A1, A3                                                                                                            |
| Bordi                              | 1 (filo dei pannelli) · 2 (bevel dei tooltip, cornici, bottoni rotondi) · 3 (cornici dei ritratti) · 5 (ghiera di «Termina turno») · 6 (separatore rosso) px                                                                                                                                                                                                                                | facts A1, A3                                                                                                            |
| Altezze dei comandi                | 40 (bottone grande di BG3, anche minimo dell'app; anche il marchio e i PF della barra, la cui fascia di 28 px sta dentro il bersaglio) · 44 (casella della barra e schede, per il tocco) px                                                                                                                                                                                                 | facts A3 (`Btn_big` 428 × 80 a 4K), A1 (slot 88 a 4K)                                                                   |
| Geometria con nome                 | casella del deck 58 × 48 (telefono 58 × 52), deck 100 (due file e i due fili di 2 px), disco «Termina turno» 98, riccioli 88 (48 al telefono), etichetta 22, losanga in colonna 214, colonna numerica 64, icona della casella 18, icona dei comandi rotondi 20, icona della barra in basso 24 px                                                                                            | facts A1, A3                                                                                                            |
| Componenti                         | un solo campo (40 px, capsula, 16 px dentro, testo 16), una sola pillola (40 px, 4 · 16 px dentro, testo 14 seminegretto, scelta accesa in bronzo), una sola riga di menu (40 px, 4 · 8 px dentro, testo 16), una sola losanga (40 px, 24 px dentro; 16 al telefono), un solo bottone rotondo (40 px, ghiera di 2 px), un solo interruttore (40 × 22, pomello di 12 px, 12 px dalle parole) | BG3: ricerca dell'inventario, `btn_pil`, menu contestuale, `Btn_big`, bottoni rotondi (facts A1, A3)                    |

Controllo: lo strumento di verifica (`changes/visual-01/audit/`) sull'app vera, 20 schermate,
01/10/2026, dopo il secondo giro di correzioni (`…/probe-bg3/fix2/audit/audit.md`; prima, la
misura della critica in `…/critique2-bg3/audit/`):

| Misura                                         | Prima           | Dopo                               |
| ---------------------------------------------- | --------------- | ---------------------------------- |
| Spazi sul passo di 2 px                        | 93 %            | 99 %                               |
| Varianti dei campi                             | 7               | 1                                  |
| Varianti delle pillole                         | 15 (8 famiglie) | 9 (4 famiglie; la pillola: 1 sola) |
| Varianti delle schede                          | 11              | 9                                  |
| Grandezze dei caratteri                        | 17              | 16                                 |
| Raggi                                          | 6               | 5                                  |
| Bottoni con il margine predefinito del browser | 143 (+ 2 campi) | 0                                  |
| Contrasto AA sotto soglia                      | 2 su 1214       | 2 su 1217 (gli stessi)             |

Le varianti dei bottoni restano 84 (prima 80): lo strumento conta a parte ogni larghezza, e la
losanga al telefono ha 16 px dentro invece di 24 (così due losanghe stanno nel piede di una
finestra); in più ci sono i due pulsanti di testo dentro le frasi e i pulsanti senza riquadro che
iniziano una colonna. Le altezze dei comandi passano da 21 a 22 per gli stessi pulsanti di testo
(19, 22,5 e 25 px di testo visibile, 46 px di area di tocco).

I due testi sotto soglia erano il segno ✦ di un punto di viaggio nascosto, visibile solo al DM;
sono corretti nel giro di rifinitura, come buona parte dei valori fuori scala che restavano: vedi
«Coerenza (I-250)» qui sotto, con l'elenco aggiornato di quelli che restano.

## Coerenza (I-250)

Giro di rifinitura del 01/10/2026. Strumento di verifica (`changes/visual-01/audit/`) sui 20 stati
del giro 1 (1440 e 390, tema scuro), prima e dopo (`…/probe-bg3/fix3/audit-before/audit.md`,
`…/visual-01/audit/bg3/audit.md`); le stesse misure sotto la piega, su Inizio, Magie, Inventario e
Tavolo a pagina intera (`…/probe-bg3/fix3/audit-below-before/`, `audit-below-after/`); il
campionario dei componenti prima e dopo (`…/probe-bg3/fix3/specimen-before/`,
`specimen-after/`).

| Misura (20 schermate del giro 1)               | Prima        | Dopo                                               |
| ---------------------------------------------- | ------------ | -------------------------------------------------- |
| Valori di spazio distinti (fuori scala)        | 32 (18)      | 27 (13)                                            |
| Spazi sul passo di 2 px                        | 99,1 %       | 99,4 %                                             |
| Altezze dei comandi                            | 22           | 22                                                 |
| Grandezze dei caratteri · stili di testo       | 16 · 70      | 16 · 71                                            |
| Ombre                                          | 49           | 48                                                 |
| Colori (testo · fondo · bordo)                 | 21 · 29 · 34 | 21 · 28 · 33                                       |
| Varianti dei bottoni (classi con più varianti) | 84 (12)      | 81 (11)                                            |
| Varianti delle schede (linguette)              | 9            | 8                                                  |
| Varianti delle lastre e dei pannelli           | 45 (7)       | 42 (6)                                             |
| Varianti dei menu a tendina                    | 1            | 2 (campo unico sul computer, compatto al telefono) |
| Bottoni con il margine predefinito del browser | 0            | 0                                                  |
| Contrasto AA sotto soglia                      | 2 su 1217    | 0 su 1219                                          |

| Misura (8 schermate a pagina intera)           | Prima     | Dopo      |
| ---------------------------------------------- | --------- | --------- |
| Valori di spazio distinti (fuori scala)        | 30 (14)   | 27 (12)   |
| Varianti dei bottoni (classi con più varianti) | 78 (11)   | 77 (10)   |
| Varianti delle schede (linguette)              | 8         | 7         |
| Varianti delle lastre e dei pannelli           | 39 (7)    | 35 (4)    |
| Bottoni con il margine predefinito del browser | 4         | 0         |
| Contrasto AA sotto soglia                      | 0 su 1418 | 0 su 1416 |

Cosa è cambiato:

- **Tavolo al telefono.** L'intestazione torna su una sola fila (63 px come oggi, era 109): «App»
  e la freccia di ritorno col margine compatto di 6 px dei comandi della scena, i sei servizi
  attaccati. La lastra della scena tiene i comandi sulla linea di base del nome; da giocatore
  «Riposi» resta accanto al nome (58 px invece di 85); zoom e ritratti 8–12 px sopra la barra.
- **Menu.** La lastra `#3F3A37` è piena: sotto il menu della pedina e quello del calendario il
  testo non traspare più.
- **Campi.** Il menu dei dadi della barra è il campo unico sul computer (prima 8 px dentro e testo
  12); al telefono resta compatto (vedi «Differenze dichiarate»).
- **Inizio.** Un solo ritmo di 24 px tra le lastre (al telefono erano 16, 20, 0 e 28; sul computer
  48 in verticale, che lasciava circa 600 px vuoti in fondo alla pagina); un solo titolo di
  lastra (22 px: «Le tue campagne», «Ultime discussioni», «Trova un tavolo» e, al telefono,
  «Prossimo appuntamento» erano 28); un solo comando nei titoli («Tutte le campagne», «Tutte le
  discussioni», «Tutti gli annunci», «Segna tutte come lette»: il pulsante discreto, con le lettere
  sul filo della lastra); «Primi passi» con la stessa lastra delle altre; le schede «Novità ·
  Guide · Supporto» uguali alle schede di sezione (8 · 16 px dentro); le lastre affiancate alte
  uguali.
- **Scheda.** Ogni blocco è la stessa lastra, anche «Risorse del turno» e le azioni generiche
  (tabella e «Movimento», che stavano sul fondo della pagina); 24 px tra le lastre (prima 40–48);
  un solo titolo di lastra (22 px: «Azioni», «Magie», «Inventario» e «Azioni personalizzate» erano
  28, «Tiri», «Reazioni» e «Chi può modificare la scheda» 18) con 16 px sotto; la colonna delle
  abilità con i 24 px di ogni lastra (prima 16 · 16 · 12); «Tutte» con le parole e il margine delle
  schede; «Gestisci monete» e «Cambia set» col margine del pulsante discreto (prima 0); «Altre
  azioni» e la piega ▸ ▾ dei contenitori come il bottone-icona rotondo di 40 px (prima 55 px e il
  margine del browser); lo stato vuoto «Nessuna azione personalizzata» con 24 px dentro (prima
  45 · 20).
- **Tavolo.** La fascia dei punti ferita ha un solo raggio (4 px) e un solo margine (4 px) a ogni
  larghezza; la lastra della scena il raggio delle lastre (2 px); il segno ✦ dei punti di viaggio
  è color crema come le iniziali delle pedine (era bronzo su un disco trasparente, 2,3:1).

Restano, e sono dichiarati: le varianti che sono lo stesso componente a due larghezze (losanga
24 / 16 px dentro, righe dei menu 40 / 44 px, schede della barra laterale, collegamenti del menu,
fascia dei punti ferita 28 / 40 px, menu dei dadi); i valori dell'app in parti che questa opzione
non disegna: margini di 10 px (riga della scena a 1440, pannello laterale a 390), distanze di 3 px
(i puntini di presenza), 9 e 5 px (il logo, Fase D), 10 px (interruttore offline), 1 px e 20,5 px
(i termini del compendio dentro le frasi), i pulsanti di testo dentro le frasi (19, 22,5 e 25 px
di testo visibile, 46 px di area di tocco), «Tutte» al telefono (45 px: è una cella della striscia
delle schede e ne tiene il filo), le caselle della fascia al telefono (101,5 e 117,5 px), la
geometria della mappa (52 · 68 · 76 · 88 · 94 · 120 · 152 px, −118 px al telefono), l'iniziale
di 23 px sotto il ritratto dell'ispettore (coperta dal dipinto). Nel campionario restano due stati
composti che il giro 1 non mostra: il menu dei dadi della barra rapida e le condizioni come
riquadri (fatti nel secondo giro di rifinitura, qui sotto).

Verifiche dopo l'ultima modifica del foglio di stile (04:36:23): il percorso
`b61-table-structure` (copia in `…/probe-bg3/fix3/journeys/`) passa da giocatore e da DM, in
italiano e in inglese; l'unico rilievo è il suggerimento della prima visita del DM che copre
12,6 px della mappa, come in «Attuale» (13 px: dipende dalla striscia di sviluppo, punto del
coordinatore), non più 48. Sonda delle garanzie (`…/probe-bg3/fix3/probe.cjs`): intestazione del
Tavolo su una fila in tutti gli stati del Tavolo a 390, nessuno scorrimento laterale a 390,
«Termina turno» e «Annulla» visibili, «Entra al Tavolo» tra 556 e 600 px a 390, barra in basso
alta 114 px a 1440. Le 15 schermate del giro 1 e il foglio di contatto sono stati rifatti dopo
quell'ora (04:36–04:38) e aperti uno per uno; le coppie in `_pairs/` rifatte con
`…/probe-bg3/fix3/pairs.sh`.

### Secondo giro di rifinitura (01/10/2026)

Dopo la quarta verifica indipendente (`…/visual-01/notes/open-items-round2.json`, voce `bg3`: un
punto medio e tre bassi, tutti fatti) e un secondo passaggio di I-250 con lo strumento di
verifica e il campionario. Prove in `…/visual-01/probe-bg3/fix4/`: prima `audit-before/`,
`specimen-before/`, `before/`; dopo `…/visual-01/audit/bg3/audit.md`, `audit-below-after/`,
`audit-home-recent/`, `specimen-after/`, `after/`.

| Misura (20 schermate del giro 1)               | Prima        | Dopo         |
| ---------------------------------------------- | ------------ | ------------ |
| Valori di spazio distinti (fuori scala)        | 27 (13)      | 27 (14)      |
| Spazi sul passo di 2 px                        | 99,4 %       | 99,4 %       |
| Altezze dei comandi                            | 22           | 22           |
| Grandezze dei caratteri · stili di testo       | 16 · 71      | 16 · 71      |
| Ombre                                          | 48           | 48           |
| Colori (testo · fondo · bordo)                 | 21 · 28 · 33 | 21 · 28 · 33 |
| Varianti dei bottoni (classi con più varianti) | 81 (11)      | 77 (11)      |
| Varianti delle schede (linguette)              | 8            | 8            |
| Varianti delle lastre e dei pannelli           | 42 (6)       | 41 (6)       |
| Bottoni con il margine predefinito del browser | 0            | 0            |
| Contrasto AA sotto soglia                      | 0 su 1219    | 0 su 1221    |

| Misura (8 schermate a pagina intera)           | Prima     | Dopo      |
| ---------------------------------------------- | --------- | --------- |
| Valori di spazio distinti (fuori scala)        | 27 (12)   | 27 (12)   |
| Varianti dei bottoni (classi con più varianti) | 77 (10)   | 73 (10)   |
| Varianti delle lastre e dei pannelli           | 35 (4)    | 35 (4)    |
| Bottoni con il margine predefinito del browser | 0         | 0         |
| Contrasto AA sotto soglia                      | 0 su 1416 | 0 su 1416 |

Il nuovo valore fuori scala è il margine di −6 px del bottone dei punti ferita (sotto). Lo
strumento non raggiunge l'Inizio con «Accesso rapido», che compare appena si apre una scheda:
lo misura `fix4/home-recent.cjs` (lo stato `home` del kit, poi la scheda di Livia e ritorno),
4 schermate (1440 e 390, schermo e pagina intera, `audit-home-recent/`): le 16 lastre dell'Inizio
sono una sola variante (raggio 2, filo 1, 24 px dentro), contrasto 0 sotto soglia (38 incerti:
testo sul dipinto, senza misura sui pixel in questa sonda).

Cosa è cambiato:

- **Inizio, «Accesso rapido»** (punto medio). La lastra prende il rientro di 24 px delle altre
  (prima 18 · 16 al telefono, 22 · 24 sul computer: il titolo stava 8 px più a sinistra) e i
  24 px sopra di sé al telefono (prima 28). La didascalia «Schede aperte di recente…» va sotto il
  titolo a ogni larghezza (sul computer stava sul bordo destro, dove le altre lastre hanno un
  comando). La scheda recente è una carta sulla scala (12 · 16 px dentro, filo di bronzo, oro
  al passaggio del puntatore); al telefono occupa l'86 % della lastra, così «Maga · Livello 3 ·
  18/22 PF» resta su una riga e la carta seguente si vede ancora.
- **Inizio, «Prossimo appuntamento»** (basso). Il titolo parte dal filo del rientro (25 px dal
  bordo della lastra, prima 39 al telefono), 12 px sopra i dati; «Aggiungi al calendario» è
  largo 214 px come «Apri sessioni» (prima 190 al telefono); la colonna dei due bottoni sta una
  distanza di lastra sotto i dati (24 px, prima 32 al telefono) con 12 px tra le losanghe, come
  la colonna del menu.
- **Inizio, colonna del menu.** «Entra al Tavolo» e «Apri campagna» sono la losanga unica (40
  px, testo 14): erano alte 44 con testo 18, una seconda misura accanto alla colonna da 40
  dell'appuntamento. «Entra al Tavolo» è tra 556 e 596 px a 390.
- **Scheda, strisce** (basso). «Condizioni» e «Risorse del turno» sono le due strisce compatte
  della scheda, dichiarate tali: lo stesso rientro di 12 · 16 px (la seconda aveva 8 · 16); al
  telefono stanno 24 px una dall'altra e dai pezzi della fascia (prima 8).
- **Scheda, punti ferita** (basso). Il bottone del numero dei punti ferita è alto 40 px di suo
  (prima 28 più un'estensione invisibile): entra per 6 px nella riga dell'etichetta e in quella
  dei punti ferita temporanei, così il numero resta sulla stessa linea degli altri numeri e un
  controllo con `getBoundingClientRect` trova 40. Porta il margine di −6 px.
- **Scheda, «Difese» al telefono.** Etichetta e valore sulla stessa linea, 8 px tra loro
  (l'etichetta stava 9 px più in basso).
- **Scheda, Magie.** L'etichetta dello stato («Trucchetto», «Preparata») e le parole dopo
  («Aggiunta a mano») stanno 8 px una dall'altra (il bordo dell'etichetta toccava le parole).
- **Scheda, note in fondo alle lastre.** La nota delle azioni («Il tiro per colpire…»), la riga
  per aggiungere alla scorta del gruppo e la sua nota stanno un passo (16 px) sotto ciò che le
  precede (l'app: 14 e 15).
- **Stati composti del campionario** (rimandati nel giro precedente). Le condizioni di una
  creatura («Avvelenato», «(C) Benedizione») sono la stessa etichetta dello stato vitale
  accanto (filo, lastra, raggio 8, testo piccolo crema, 2 · 12 px dentro; erano riquadri con la
  scritta in alto); per chi controlla la creatura l'etichetta è un bottone di 40 px con la
  scritta al centro; «Indebolimento 2» riprende lo spazio. La pagina «Barra rapida» della barra
  in basso usa i pezzi della pagina delle azioni: frecce e strumenti come bottoni rotondi (40 px,
  44 al telefono), il nome della pagina come pillola (con i puntini oltre 120 px sul computer),
  i due menu dei dadi come il campo compatto. A 1440, da giocatore, la riga ora finisce dentro
  la barra (oggi, anche in «Attuale», il menu del d20 e «Opzioni della barra» sono tagliati dal
  bordo); da DM c'è un'icona in più («Tiri nascosti») e «Opzioni della barra» resta tagliata
  (apre lo stesso menu del nome della pagina; «Attuale» ne taglia due).

Restano, e sono dichiarati, oltre a quelli del giro precedente: il margine di −6 px del bottone
dei punti ferita della scheda; la fascia dei punti ferita della barra in basso, 28 px sul
computer come nell'app (ora è l'unico comando alto 28); al telefono, nel campionario, le
losanghe delle celle «Scheda» e «Tavolo» si stringono in colonne strette anche in «Attuale» e in
Owlbear: è la cella del campionario, non il foglio di stile.

Verifiche dopo l'ultima modifica del foglio di stile (11:46:37; l'ultima che cambia il disegno alle
11:34:45): sonda delle garanzie
(`…/probe-bg3/fix4/probe.cjs`, copia di quella del giro precedente): intestazione del Tavolo su
una fila (63 px) in tutti gli stati del Tavolo a 390, nessuno scorrimento laterale a 390 e a
1440, «Termina turno», «Annulla ultima modifica» ed «Esc · Annulla preparazione» interi sullo
schermo a 390 da giocatore e da DM (`fix4/q-cancel.js`), barra in basso alta 114 px a
1440 (anche sulla pagina «Barra rapida»), «Entra al Tavolo» tra 556 e 596 px a 390; sotto i
40 px restano solo i comandi della striscia di sviluppo e la fascia dei punti ferita della barra
(come nell'app). Le copie dei percorsi `b61-table-structure`, `sheet-plus` e `home`
(`…/probe-bg3/fix4/journeys/`) passano; l'unico rilievo resta il suggerimento della prima visita
del DM (12,6 px sulla mappa, come in «Attuale»). Strumento di verifica: 20 stati su 20 e 8 su 8
a pagina intera, nessun testo sotto soglia AA. Le 15 schermate del giro 1 e il foglio di
contatto sono stati rifatti dopo quell'ora (11:52) e aperti uno per uno; le 31 coppie in
`_pairs/` rifatte da capo con `…/probe-bg3/fix4/pairs.sh` (il menu del calendario aperto da
`fix4/cal.cjs`).

### Terzo giro di rifinitura (01/10/2026)

Dopo la quinta verifica indipendente (`…/visual-01/notes/open-items-round3.json`, voce `bg3`: un
punto medio e cinque bassi) e un terzo passaggio di I-250 con lo strumento di verifica, il
campionario e le pagine intere (scheda, Inizio scorso, Magie, Inventario, Tavolo). Prove in
`…/visual-01/probe-bg3/fix5/`: prima `audit-before/`, `audit-below/`, `specimen-before/`; dopo
`…/visual-01/audit/bg3/audit.md`, `audit-below-after/`, `specimen-after/`, `focus/`.

| Misura (20 schermate del giro 1)               | Prima        | Dopo         |
| ---------------------------------------------- | ------------ | ------------ |
| Valori di spazio distinti (fuori scala)        | 27 (14)      | 27 (14)      |
| Spazi sul passo di 2 px                        | 99,4 %       | 99,4 %       |
| Comandi discreti con le lettere sul filo       | 29           | 39           |
| Altezze dei comandi                            | 22           | 22           |
| Grandezze dei caratteri · stili di testo       | 16 · 71      | 16 · 71      |
| Ombre                                          | 48           | 48           |
| Colori (testo · fondo · bordo)                 | 21 · 28 · 33 | 21 · 28 · 33 |
| Varianti dei bottoni (classi con più varianti) | 77 (11)      | 77 (11)      |
| Varianti delle schede (linguette)              | 8            | 8            |
| Varianti delle lastre e dei pannelli           | 41 (6)       | 41 (6)       |
| Bottoni con il margine predefinito del browser | 0            | 0            |
| Contrasto AA sotto soglia                      | 0 su 1221    | 0 su 1219    |

| Misura (8 schermate a pagina intera)           | Prima     | Dopo      |
| ---------------------------------------------- | --------- | --------- |
| Valori di spazio distinti (fuori scala)        | 27 (12)   | 27 (12)   |
| Comandi discreti con le lettere sul filo       | 68        | 79        |
| Varianti dei bottoni (classi con più varianti) | 73 (10)   | 73 (10)   |
| Varianti delle lastre e dei pannelli           | 35 (4)    | 35 (4)    |
| Bottoni con il margine predefinito del browser | 0         | 0         |
| Contrasto AA sotto soglia                      | 0 su 1416 | 0 su 1416 |

Il giro non aggiunge valori: sposta comandi già sulla scala. La riga «comandi discreti con le
lettere sul filo» conta gli elementi col margine di −16 px. Lo strumento non misura gli anelli
del fuoco: li misura `fix5/p-focus.js`. La misura delle 12:54 dava 10 testi sotto soglia, tutti
nella scheda a 390. Era un errore di misura, non di questa opzione: in quella corsa la striscia
di sviluppo mostrava «Aree aggiuntive: 3 con avvisi» (aree lente sulla macchina carica), la
pagina era larga 518 px e i pixel venivano letti nel posto sbagliato. La corsa pulita delle
13:14 (`fix5/audit-before/`) dà 0 su 1221 con lo stesso foglio di stile.

Cosa è cambiato:

- **Anello del fuoco tagliato** (punto medio). I comandi discreti che partono sul filo della
  colonna hanno l'anello di 3 px dentro il bottone, come la losanga: «← Personaggi», «Riposa»,
  «Rivedi scelte» (e ogni comando discreto dell'intestazione della scheda al telefono), «Ultima
  mossa», «+ Condizione». Al telefono il loro bordo sta a x = 0; nel pannello del Tavolo lo
  taglia il bordo del pannello. La sonda `fix5/p-focus.js` trova l'anello intero in tutti, a
  1440 e a 390 (`fix5/focus/`, `fix5/focus-*.json`).
- **«Prossimo appuntamento» a 1440** (basso). La colonna dei due bottoni sta 24 px sotto i dati,
  come al telefono (era 16).
- **Punti ferita della scheda, fuoco** (basso). L'anello è quello della losanga (3 px, 6 px
  dentro): gira attorno ai numeri e non attraversa più «Punti ferita» né «PF temporanei».
- **Comandi discreti sul filo del testo** (I-250, sotto la piega). Valgono ora anche per «Gestisci
  sensi» e «Gestisci velocità», per il «+ Condizione» della scheda, per «Offline e
  sincronizzazione», per «Apri al Tavolo», per «Cambia…» della politica dei tiri, per «Annota
  magia concessa» e «Registra materiale di valore…». Nel pannello «Creatura» valgono per «Trova
  la mia pedina», per gli oggetti da usare e per «Cambia set». Prima queste lettere stavano
  16 px dentro rispetto al testo sopra. La regola resta F10 (critique). Ogni comando che la
  segue parte sempre a capo:
  - gli strumenti della colonna e gli oggetti da usare stanno in colonna;
  - il comando di una frase sta sotto la frase, 4 px più giù (prima era dopo la frase al
    telefono e andava a capo sul computer);
  - nella lista dei focus, «Impugna» resta in fondo alla riga a ogni larghezza e le parole
    vanno a capo accanto.

Restano, e sono dichiarati, oltre a quelli dei giri precedenti:

- «Opzioni della barra» del DM a 1440 (vedi «Differenze dichiarate», con la misura) e la fascia
  dei punti ferita della barra in basso.
- Al telefono, «Dettagli» delle azioni della scheda: le righe con e senza «+5» hanno la prima
  lettera allo stesso punto, 16 px dentro rispetto alla descrizione. Portarle sul filo
  disallineerebbe le une dalle altre.
- I comandi discreti che vanno a capo dentro una fila mista: «Cerca nella Biblioteca» e
  «Dividi tra il gruppo» al telefono, «Aspetto nella scheda», «Chi può vedere». Dipende dalla
  larghezza se aprono la riga: spostarli col margine li accavallerebbe dove non vanno a capo.
- Fuori da questa opzione, per il coordinatore: `directions/index.mjs` è cambiato alle 12:00
  (icone di riserva col tema chiaro); non tocca il tema scuro.

Verifiche dopo l'ultima modifica del foglio di stile (13:28:06):

- Sonda delle garanzie (`fix5/probe.cjs`, `fix5/probe/`):
  - intestazione del Tavolo su una fila (63 px) in combattimento, da DM e in esplorazione a 390;
  - nessuno scorrimento laterale a 390 e a 1440;
  - «Termina turno» e «Annulla» interi sullo schermo a 390;
  - barra in basso alta 114 px a 1440;
  - «Entra al Tavolo» tra 556 e 596 px a 390;
  - sotto i 40 px restano solo i comandi della striscia di sviluppo e la fascia dei punti ferita
    della barra.
- Il test `tests/visual01-directions.test.mjs` passa (7 su 7). Nessuna regola senza prefisso
  (`notes/prefix-audit.js`), nessun `!important`. Prettier passa.
- Strumento di verifica: 20 stati su 20 e 8 su 8 a pagina intera, nessun testo sotto soglia AA.
- Le 15 schermate del giro 1 e il foglio di contatto sono stati rifatti dopo quell'ora
  (13:33–13:34) e aperti uno per uno. Le 31 coppie in `_pairs/` sono state rifatte da capo con
  `fix5/pairs.sh` (13:35–13:37), col menu del calendario aperto da `fix5/cal.cjs`.

### Quarto giro di rifinitura (01/10/2026)

Dopo la sesta verifica indipendente (`…/visual-01/notes/open-items-round4.json`, voce `bg3`: un
punto medio e tre bassi, tutti fatti) e un quarto passaggio di I-250 con lo strumento di verifica,
il campionario e le pagine intere (scheda, Inizio scorso, Magie, Inventario, Tavolo). Prove in
`…/visual-01/probe-bg3/fix6/`: prima `audit-before/` (la misura delle 13:39, dopo l'ultima
modifica del giro precedente), `specimen-before/`, `before/` (le 15 schermate del giro 1),
`direction-before.css`; dopo `…/visual-01/audit/bg3/audit.md`, `audit-below-after/`,
`specimen-after/`, `items/` (`items.cjs`: i quattro punti misurati nell'app vera).

| Misura (20 schermate del giro 1)               | Prima        | Dopo         |
| ---------------------------------------------- | ------------ | ------------ |
| Valori di spazio distinti (fuori scala)        | 27 (14)      | 27 (14)      |
| Distanze tra gli elementi (gap) distinte       | 11           | 10           |
| Spazi sul passo di 2 px                        | 99,4 %       | 99,4 %       |
| Altezze dei comandi                            | 22           | 23           |
| Grandezze dei caratteri · stili di testo       | 16 · 71      | 16 · 71      |
| Ombre                                          | 48           | 48           |
| Colori (testo · fondo · bordo)                 | 21 · 28 · 33 | 21 · 28 · 33 |
| Varianti dei bottoni (classi con più varianti) | 77 (11)      | 77 (11)      |
| Varianti delle schede (linguette)              | 8            | 8            |
| Varianti delle lastre e dei pannelli           | 41 (6)       | 41 (6)       |
| Varianti di caselle e interruttori (classi)    | 6 (1)        | 8 (2)        |
| Bottoni con il margine predefinito del browser | 0            | 0            |
| Contrasto AA sotto soglia                      | 0 su 1219    | 0 su 1217    |

| Misura (8 schermate a pagina intera)           | Prima     | Dopo      |
| ---------------------------------------------- | --------- | --------- |
| Valori di spazio distinti (fuori scala)        | 27 (12)   | 27 (12)   |
| Varianti dei bottoni (classi con più varianti) | 73 (10)   | 73 (10)   |
| Varianti delle lastre e dei pannelli           | 35 (4)    | 35 (4)    |
| Bottoni con il margine predefinito del browser | 0         | 0         |
| Contrasto AA sotto soglia                      | 0 su 1416 | 0 su 1416 |

La misura a pagina intera «prima» è quella delle 13:39 (`fix5/audit-below-after/`, già dopo
l'ultima modifica del giro precedente). Le due righe che salgono vengono dall'interruttore
«Il DM può modificare questa scheda»: prima era disegnato come una casella di spunta (20 px),
ora è l'interruttore (22 px), un componente a sé che lo strumento conta tra le caselle; le sue
due varianti differiscono solo per la grandezza del testo ereditata a 1440 e a 390, che un
interruttore non mostra (lo stesso vale per le caselle «Attiva» e per la spunta tonda).

Cosa è cambiato:

- **Anello del fuoco di «Termina turno»** (punto medio). L'anello di 3 px sta a 3 px dal disco,
  come in «Attuale» (era a 7 px e usciva dalla finestra: in basso a 1440, a destra a 390). Ora
  arriva a 898,5 px su 900 a 1440 e a 388 su 390 a 390 (`items/items-bg3.json`,
  `items/endturn-focus-*.png`): copre il pixel esterno dell'anello azzurro e resta un anello
  oro chiaro attorno a quello azzurro.
- **Interruttori** (basso). La casella quadrata di bronzo non ridisegna più gli interruttori
  (`.switch`, `.cs-switch`, `.dtray-switch`, `.offline-switch`; con `:where()`, quindi la regola
  delle caselle pesa come prima). «Il DM può modificare questa scheda» torna un interruttore
  accanto agli altri due; i tre hanno la stessa traccia di 40 × 22 px, lo stesso pomello di
  12 px (quello di «Ispirazione eroica» era 44 × 26 con un pomello di 18) e le parole a 12 px
  (erano 12, 8 e 10: sparisce la distanza di 10 px fuori scala). La traccia della riga parte
  con la prima riga delle parole (il margine di 3 px dell'app la abbassava di 3 px).
- **«Aggiungi al calendario»** (basso). Il riepilogo disegnato come losanga ha il crema delle
  losanghe (`#e6dbc2`, come «Apri sessioni» sotto di lui); il giallo chiaro resta ai riepiloghi
  che aprono una sezione («Novità precedenti», «Primi passi», «Perché?»).
- **«Registra concentrazione»** (basso). Il blocco senza concentrazione è una colonna a ogni
  larghezza, come le frasi col loro comando: titolo, stato e comando uno sotto l'altro, il
  comando con le lettere sul filo del testo (a 1440 stava 12 px dopo «Nessun effetto in
  corso.», sopra i suoi ultimi 4 px).
- **Cura e Danno** (I-250, campionario). Nel riquadro dei punti ferita del Tavolo erano due
  losanghe di bronzo; ora sono la losanga blu-verde e quella rossa, come nella fascia della
  scheda.
- **Inizio scorso, «Primi passi»** (I-250, sotto la piega). Senza il maiuscoletto
  dell'app, «Primi passi» e «Da dove vuoi iniziare?» si leggevano come un'unica frase in
  grassetto dello stesso colore: l'etichetta prende il bronzo e il peso delle altre etichette
  (4,8:1 sul fondo, misura dello strumento).
- **Scheda sotto la piega, «Chi può modificare la scheda»** (I-250). Il sottotitolo «Modifiche
  del DM a questa scheda» sta 24 px sotto le parole dell'interruttore, la distanza tra i gruppi
  (era 8, attaccato alla riga).

Restano, e sono dichiarati, quelli dei giri precedenti. In più: l'interruttore conta come
comando alto 22 px (è l'interruttore, non un bersaglio: il bersaglio è la riga di 44 px).

Verifiche dopo l'ultima modifica del foglio di stile (15:11:09):

- Sonda delle garanzie (`fix6/probe.cjs`, copia di quella del giro precedente, `fix6/probe/`,
  `probe-390.txt`, `probe-1440.txt`; `fix6/cancel.cjs`, `cancel.txt`):
  - intestazione del Tavolo su una fila (63 px) in combattimento, da DM e in esplorazione a 390;
  - nessuno scorrimento laterale a 390 e a 1440;
  - «Termina turno», «Annulla ultima modifica» ed «Esc · Annulla preparazione» interi sullo
    schermo a 390, da giocatore e da DM;
  - barra in basso alta 114 px a 1440;
  - «Entra al Tavolo» tra 556 e 596 px a 390;
  - sotto i 40 px restano solo i comandi della striscia di sviluppo e la fascia dei punti ferita
    della barra.
- Il test `tests/visual01-directions.test.mjs` passa (7 su 7). Nessuna regola senza prefisso
  (`notes/prefix-audit.js`), nessun `!important`. Prettier passa.
- Strumento di verifica: 20 stati su 20 e 8 su 8 a pagina intera, nessun testo sotto soglia AA.
- Le 15 schermate del giro 1 e il foglio di contatto sono stati rifatti dopo quell'ora
  (15:15–15:17) e aperti uno per uno. Le 31 coppie in `_pairs/` sono state cancellate e rifatte
  da capo con `fix6/pairs.sh` (15:18–15:19), col menu del calendario aperto da `fix6/cal.cjs`.

### Quinto giro di rifinitura (01/10/2026)

Dopo la settima verifica indipendente (`…/visual-01/notes/open-items-round5.json`, voce `bg3`:
un punto medio e uno basso, tutti e due fatti; prove della verifica in `…/visual-01/verify6-bg3/`)
e un quinto passaggio di I-250 con lo strumento di verifica, il campionario e le pagine intere
(scheda, Inizio scorso, Magie, Inventario, Tavolo). Prove in `…/visual-01/probe-bg3/fix7/`:
prima `audit-before/` (la misura delle 15:14, dopo l'ultima modifica del giro precedente),
`audit-below-before/` (la stessa a pagina intera, 15:15), `specimen-before/`, `before/` (le 15
schermate del giro 1), `direction-before.css`, `SOURCES-before.md`; dopo
`…/visual-01/audit/bg3/audit.md`, `audit-below-after/`, `specimen-after/`, `items/`
(`items.cjs`: i due punti misurati nell'app vera, con le schermate della finestra dei punti
ferita); `samewidth.py` e `offscale.py` elencano i componenti con più varianti alla stessa
larghezza e i testi fuori dalla scala dei caratteri.

| Misura (20 schermate del giro 1)               | Prima        | Dopo         |
| ---------------------------------------------- | ------------ | ------------ |
| Valori di spazio distinti (fuori scala)        | 27 (14)      | 27 (14)      |
| Distanze tra gli elementi (gap) distinte       | 10           | 10           |
| Spazi sul passo di 2 px                        | 99,4 %       | 99,4 %       |
| Altezze dei comandi                            | 23           | 23           |
| Grandezze dei caratteri · stili di testo       | 16 · 71      | 16 · 71      |
| Ombre                                          | 48           | 48           |
| Colori (testo · fondo · bordo)                 | 21 · 28 · 33 | 21 · 28 · 33 |
| Varianti dei bottoni (classi con più varianti) | 77 (11)      | 77 (11)      |
| Varianti delle schede (linguette)              | 8            | 8            |
| Varianti delle lastre e dei pannelli           | 41 (6)       | 41 (6)       |
| Varianti di caselle e interruttori (classi)    | 8 (2)        | 8 (2)        |
| Bottoni con il margine predefinito del browser | 0            | 0            |
| Contrasto AA sotto soglia                      | 0 su 1217    | 0 su 1217    |

| Misura (8 schermate a pagina intera)                | Prima     | Dopo      |
| --------------------------------------------------- | --------- | --------- |
| Valori di spazio distinti (fuori scala)             | 27 (12)   | 27 (12)   |
| Varianti dei bottoni (classi con più varianti)      | 73 (10)   | 73 (10)   |
| Varianti delle lastre e dei pannelli                | 35 (4)    | 35 (4)    |
| Riepiloghi che aprono una sezione con un altro peso | 1         | 0         |
| Bottoni con il margine predefinito del browser      | 0         | 0         |
| Contrasto AA sotto soglia                           | 0 su 1416 | 0 su 1416 |

I numeri dei 20 stati non cambiano: la finestra dei punti ferita non è tra gli stati del giro 1,
l'interruttore invisibile non si vede e «Pedine in scena» sta sotto la piega. Le 15 schermate
rifatte sono identiche pixel per pixel a quelle di prima, salvo 8 pixel di contorno
antialiasato nella finestra dell'iniziativa (`magick compare -metric AE`); lo stesso per il
campionario (0 pixel diversi, a 1440 e a 390).

Cosa è cambiato:

- **Cura e Danno nella finestra dei punti ferita** (punto medio). La finestra «Punti ferita ·
  Livia», aperta dai PF 18/22 della scheda o dai PF della barra del Tavolo (la strada principale
  al Tavolo), mostrava Cura e Danno come due losanghe di bronzo uguali, mentre dietro di lei la
  fascia della scheda e il pannello del Tavolo li mostrano blu-verde e rosso (e «Attuale» li
  distingue in verde e rosso). Ora sono la losanga blu-verde e quella rossa anche nella
  finestra, a 1440 e a 390, aperta da tutte e due le strade (`items/items-bg3.json`,
  `items/hpdlg-*.png`). La finestra entra nelle stesse quattro regole con `:where()`, quindi il
  loro peso non cambia e con il contrasto alto vince ancora il filo del contrasto alto (2 px
  `#9aa9b4` nella finestra come nella scheda: `fix7/hc.cjs`, `hc.txt`).
- **Interruttore «Ispirazione eroica»** (basso). La casella invisibile teneva i 44 × 26 px
  dell'app sotto una traccia di 40 × 22 (4 px in più a destra, 2 sopra e sotto): ora ha la
  scatola della traccia, 40 × 22, nello stesso punto (`items`, `inspiration.same: true` a 1440 e
  a 390). Il bersaglio resta la riga intera di 40 px e l'anello del fuoco resta sulla traccia.
- **Riepiloghi** (I-250, sotto la piega). Ogni riepilogo che apre una sezione è color oro chiaro
  e seminegretto («Correggi i punti ferita», «PF temporanei e massimo», «Novità precedenti»):
  «Pedine in scena (5)», nel pannello del Tavolo, era l'unico a 500; ora è a 600 come gli altri.

Cercato e lasciato com'è, con il motivo:

- le varianti che lo strumento conta alla stessa larghezza sono componenti diversi o stati
  (la riga attiva delle schede col filo sotto, il controllo a due segmenti «Gioco · Modifica»
  col divisorio, «Termina turno», i bottoni rotondi della barra, il contatore delle notifiche),
  oppure geometria e stati composti già dichiarati sopra;
- la spunta tonda di chi combatte nella finestra dell'iniziativa accanto alla casella quadrata
  di «Sorpreso» è voluta: copia la riga del pannello Reazioni di BG3 (B30), vedi sopra;
- nel campionario a 390 le losanghe delle celle «Scheda» e «Tavolo (pannello laterale)» si
  stringono in colonna: succede uguale con «Attuale» (`…/visual-01/specimen/specimen-current-390.png`),
  perché in quelle celle la catena della scheda del telefono non ha una larghezza propria; nell'app
  le stesse losanghe sono intere (schermate del giro 1);
- i testi a 13, 17 e 23 px che lo strumento trova sono le etichette SVG della mappa (unità della
  mappa, non pixel dello schermo) e le iniziali coperte dai dipinti; le interlinee «normal» sono
  quelle stesse etichette, i ritratti coperti e il menu dei dadi nativo.

Restano, e sono dichiarati, quelli dei giri precedenti.

Verifiche dopo l'ultima modifica del foglio di stile (16:35:31):

- Sonda delle garanzie (`fix7/probe.cjs`, copia di quella del giro precedente, `fix7/probe/`,
  `fix7/probe1440/`, `probe-390.txt`, `probe-1440.txt`; `fix7/cancel.cjs`, `cancel.txt`), con
  gli stessi valori del giro precedente:
  - intestazione del Tavolo su una fila (63 px) in combattimento, da DM e in esplorazione a 390;
  - nessuno scorrimento laterale a 390 e a 1440;
  - «Termina turno», «Annulla ultima modifica» ed «Esc · Annulla preparazione» interi sullo
    schermo a 390, da giocatore e da DM;
  - barra in basso alta 114 px a 1440;
  - «Entra al Tavolo» tra 556 e 596 px a 390;
  - sotto i 40 px restano solo i comandi della striscia di sviluppo e la fascia dei punti ferita
    della barra.
- Il test `tests/visual01-directions.test.mjs` passa (7 su 7). Nessuna regola senza prefisso
  (`notes/prefix-audit.js`), nessun `!important`. Prettier passa.
- Strumento di verifica: 20 stati su 20 (16:36) e 8 su 8 a pagina intera (16:37), nessun testo
  sotto soglia AA; campionario a 1440 e a 390 (16:37), tutti i controlli passati.
- Le 15 schermate del giro 1 e il foglio di contatto sono stati rifatti dopo quell'ora
  (16:39–16:40) e aperti uno per uno. Le coppie in `_pairs/` sono state cancellate e rifatte da
  capo con `fix7/pairs.sh` (16:40–16:41), col menu del calendario aperto da `fix7/cal.cjs` e una
  coppia nuova, `pair-hp-dialog.png` (la finestra dei punti ferita dalla barra e dalla scheda a
  1440 e dalla barra a 390, accanto alla cornice di BG3): 34 file, 23 coppie montate e 11 ritagli.

### Dettagli rifiniti (01/10/2026, I-252)

L'owner vede dettagli fatti «con pochezza»: misure dei bottoni, spazi tra i bottoni, margini.
Una critica indipendente dei dettagli (`…/visual-01/detail-bg3/`: schermate, ritagli e misure
delle 18:12–18:30) ha trovato 22 rilievi (6 alti, 8 medi, 8 bassi) e tre idee per fare meglio di
BG3. Tutti i rilievi sono applicati in un solo giro, quattro in parte con il motivo qui sotto;
delle tre idee, una è applicata, una c'era già nell'app, una non si può fare.

Prove in `…/visual-01/fix-bg3/`: prima `before/` (le 15 schermate del giro 1 delle 16:39),
`audit-before/` (la misura delle 19:11, sullo stato dopo il marchio), `direction-before.css`,
`icons-before.mjs`, `SOURCES-before.md`, `notes/before-1440.json` e `notes/before-390.json`;
dopo `audit-after/` (19:42), `notes/after-1440.json`, `notes/after-390.json`,
`notes/after-inv-1440.json`, `probe/crops/` (ritagli del Tavolo e anello del fuoco sulle
losanghe, rifatti dopo l'ultima modifica) e `probe/` (il Tavolo a 360, 375, 380, 414, 430, 1024,
1280, 1366, 1400 e 1920 px). Gli strumenti: `notes/probe.js` (raggiunge uno stato col kit di
cattura e misura nella pagina), `notes/measure.js` (una misura per rilievo), `notes/act-*.js`
(fuoco, passaggio del puntatore, ritagli), `glyphs/make-glyphs.mjs` (la lente e il «?»).

| Rilievo                                 | Prima                                                                                                                           | Dopo                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| D01 · pannello tagliato dalla barra     | «Inventario» mostrava 8 px dei suoi 40 sul bordo della barra                                                                    | gli ultimi 40 px sfumano e gli ultimi 8 sono trasparenti: nessun comando tagliato in vista; 48 px liberi in fondo   |
| D02 · contatore sopra la campanella     | 17 × 17 px sul 27 % del riquadro dell'icona                                                                                     | 16 × 16 nell'angolo del cerchio di 40 px, anello nero di 2 px; copre il 9 % del riquadro, l'angolo vuoto            |
| D03 · menu dei dadi sopra la lastra     | pillola sovrapposta di 8 px, 9 px più alta, 6 px più corta, due bordi a 4 px                                                    | seconda scheda della lastra, 12 px dopo di lei, stessa cima e stessa base (Δ 0), 49 px tutte e due, un solo bordo   |
| D04 · icone delle caselle che saltano   | a 2 px (nomi su due righe) e a 8 px (una riga); «Mosse» a 7 px e 20 px                                                          | tutte a 2 px e 18 px sul computer, tutte a 4 px al telefono                                                         |
| D05 · lastra delle risorse al telefono  | 93 × 19 px, filo inferiore aperto e tagliato, forme a 2 px l'una dall'altra (righe 40/19/40)                                    | 101 × 40 chiusa, forme a 4 px con le misure del computer (13, 14, 17 px): righe 40/40/40                            |
| D06 · nomi tagliati al telefono         | deck: 2,6 caselle da 64 («Mani brucianti» tagliato a 39 px); barra in basso: «Scena» 33 di 58 px                                | deck: 3 caselle intere da 58 (174 px) che si agganciano; barra: schede chiuse solo icona, 5 schede intere su 250 px |
| D07 · lastra vuota in esplorazione      | 340 px, 179 vuoti                                                                                                               | 165 px: finisce dopo i comandi, come finisce sotto il disco in combattimento                                        |
| D08 · colonne di Inizio                 | 24 px dopo «Entra al Tavolo», 12 nell'altra; ultimi bottoni a 564,5 e 606,7 px                                                  | 12 e 12; tutti e due a 606,7 px, 25 px dal piede della lastra (titoli sulla stessa linea in alto)                   |
| D09 · titoli tra i filetti su due righe | «Competenze e addestramento», «Abilità aggiuntive»: 41 px (due righe)                                                           | 21 px (una riga): i filetti si accorciano dal ricciolo, fino a 16 px                                                |
| D10 · monete                            | «30 mo · 45 ma · 120» / «mr · 12 sb»                                                                                            | «30 mo · 45 ma» / «· 120 mr · 12 sb»                                                                                |
| D11 · spazi tra i bottoni               | Cura→Danno 4, piede delle finestre 12, comandi della scena 4, inventario 6, Novità 6, tiro 6, comandi del turno 12 in verticale | 8 px ovunque tra i bottoni di una fila (6 solo tra le pillole)                                                      |
| D12 · titolo della finestra fuori asse  | centro a 692 px, l'arco a 720                                                                                                   | 720 a 1440 (195 su 195 a 390, su una riga)                                                                          |
| D13 · marchio nella testata del Tavolo  | 141,7 × 38 px; poi 12 e 16 px                                                                                                   | 40 px di altezza; 16 e 16 px (a Inizio 24, come gli altri elementi della testata)                                   |
| D14 · anello del fuoco sulle losanghe   | 3 px dentro la losanga a −6 px, tagliato dalle punte: sembrava un secondo filo d'oro                                            | 3 px fuori dal filo d'oro, lungo le punte, con 2 px di filo scuro in mezzo (`probe/crops/*-focus-*.png`)            |
| D15 · strumenti della mappa             | la seconda colonna 1 px più su e a 7 px                                                                                         | stesse righe, 6 px                                                                                                  |
| D16 · numeri dei livelli degli slot     | coprivano di 6 px il filo della casella                                                                                         | 1 px sopra la casella, nella fascia alta della lastra                                                               |
| D17 · Magie                             | «Lancia» 88,6 e «Lancia ▾» 105,6 px (bordi a 17 px); «Trucchetto» 2,6 px sopra e 8,8 sotto; righe a 757 contro 753              | tutti 107 px, stesso bordo; maiuscole a 5,9 e 7,0 px; righe a 753                                                   |
| D18 · «Altre azioni» dell'inventario    | a 959, 961 e 880 px                                                                                                             | tutte a 1323 px, sul bordo destro della riga                                                                        |
| D19 · icone su mezzi pixel              | 41 icone su 46 del Tavolo a 1440; lente e «?» a contorno tra icone piene                                                        | 0 su 46; lente e «?» piene (disegnate per il progetto)                                                              |
| D20 · schede di Novità al passaggio     | cambiava solo il filo sotto                                                                                                     | testo crema e luce dal basso, come i link della testata                                                             |
| D21 · menu della pedina                 | righe a 18 px, passo 40 e 41 px, iniziale «L», icone a linea                                                                    | 16 px, passo 40 px, il ritratto, solo parole                                                                        |
| D22 · bersagli piccoli e margini        | PF della barra 74 × 28; colonna delle schede a 2 px; testata del telefono a 12 px dal bordo; «Riposa» a x 0                     | PF 74 × 40 (fascia di 28 dentro); 4 px; 16 px; x 10                                                                 |

Lo strumento di verifica (20 schermate; prima 19:11, dopo 19:42):

| Misura                                         | Prima        | Dopo         |
| ---------------------------------------------- | ------------ | ------------ |
| Valori di spazio distinti (fuori scala)        | 26 (13)      | 25 (11)      |
| Spazi sul passo di 2 px                        | 100 %        | 100 %        |
| Altezze dei comandi                            | 25           | 23           |
| Grandezze dei caratteri · stili di testo       | 16 · 70      | 16 · 69      |
| Ombre                                          | 48           | 50           |
| Colori (testo · fondo · bordo)                 | 19 · 28 · 33 | 19 · 26 · 34 |
| Varianti dei bottoni (classi con più varianti) | 77 (11)      | 77 (11)      |
| Contrasto AA sotto soglia                      | 0 su 1211    | 0 su 1203    |

Le due ombre in più sono il filo della colonna delle schede, ora disegnato dentro di lei (così i
medaglioni stanno su pixel interi), e la fascia dei PF al telefono, rimasta sola con la sua
ombra dopo che quella del computer è passata alla fascia disegnata; il colore di bordo in più è
il grigio dei separatori del menu della pedina, ora sulla riga che chiude il gruppo.

Cosa è cambiato, in breve:

- **La barra in basso.** La lastra delle risorse e il menu dei dadi sono due schede della stessa
  lastra, 12 px l'una dall'altra, alte 49 px; la coppia è centrata sulla barra. Dove il browser
  sa ancorare un elemento a un altro (Chromium, Safari 26), la scheda dei dadi segue la lastra a
  ogni larghezza (misurato a 1024, 1280, 1366, 1400, 1440 e 1920 px: sempre 12 px, mai oltre il
  deck); altrove resta all'estremo destro e la lastra, spostata a sinistra della metà della
  scheda, non la tocca. I numeri dei livelli stanno sopra le loro caselle. Ogni casella ha
  l'icona sulla stessa riga; il deck è alto 100 px, la colonna dei comandi non ha più il filo
  trasparente in alto e la colonna delle schede disegna il suo filo dentro di sé: icone, disco e
  medaglioni stanno su pixel interi a 1440. Fuori combattimento la cornice dei comandi finisce
  dopo i comandi. I due file di comandi rotondi sono a 8 px, come in orizzontale.
- **Il telefono.** La barra ha tre righe di 40 px; la casella è quella del computer (58 px) e
  la finestra del deck ne mostra tre intere a 390 px (anche a 375–430 px), agganciandosi alla
  casella quando scorre; il menu dei dadi prende il resto. La barra delle schede mostra solo
  icone, col nome sotto la scheda aperta. La testata ha 16 px di margine, come la pagina; i
  comandi del titolo della scheda hanno il margine compatto del telefono (6 px), così l'anello
  del fuoco non tocca il bordo dello schermo.
- **I bottoni.** 8 px tra i bottoni di una fila ovunque (6 tra le pillole); l'anello del fuoco
  delle losanghe segue le punte, fuori dal filo d'oro; il marchio è un bersaglio di 40 px; i
  comandi rotondi disegnano l'icona a 20 px.
- **Scheda, Inizio, finestre e menu.** Titoli tra i filetti su una riga; «Lancia» di una sola
  larghezza; etichette centrate; righe delle magie sul bordo del titolo; «Altre azioni» in
  colonna; monete in due metà; le due colonne di Inizio finiscono sulla stessa linea; il titolo
  delle finestre al centro dell'arco; il menu della pedina col ritratto, a 16 px, una riga ogni
  40 px, solo parole.

In parte, con il motivo:

- **D05.** La critica chiedeva celle quadrate di 24 px per ogni forma. A 390 px la riga ha 374 px
  per i PF (69), la lastra, le due pillole (184) e gli spazi: alla lastra ne restano 101, e con
  celle da 24 servirebbero 141. Restano le forme con le loro misure, a 4 px, in una lastra chiusa
  di 40 px. Sotto i 384 px le forme stanno a 2 px; a 360 px la lastra perde ancora 7 px a destra
  (oggi, con «Attuale», ne perde di più).
- **D10.** Le cifre restano con la loro unità, ma il «·» va a capo con la seconda metà: lo spazio
  prima del punto è l'unico punto di a capo e il testo non si tocca.
- **D21.** La critica chiedeva di sostituire le icone a linea con quelle piene di questa opzione.
  Le righe sono invece solo parole: il menu contestuale di BG3 (B35) non ha icone, e una
  maschera per ogni comando avrebbe aggiunto dieci disegni senza un riferimento.
- **D22.** Il testo del rilievo arrivava troncato dopo «Home resum…»: le parti leggibili (PF,
  colonna delle schede, margine della testata, «Riposa») sono fatte; la parte mancante non è
  arrivata.

Le idee per fare meglio di BG3:

- **Anello del fuoco lungo le punte** (D14): fatto.
- **Il costo dell'azione nell'angolo della casella**: c'era già. L'app mette in ogni casella la
  forma della risorsa che spende (cerchio verde per l'azione, triangolo arancio per l'azione
  bonus, stella magenta per la reazione), negli stessi colori della lastra, e spegne la casella
  quando la risorsa è spesa (le mosse di solo movimento restano accese, con l'avviso);
  nell'esempio tutte le azioni costano un'azione, per questo si vedono solo cerchi verdi.
- **I PF sulle carte della striscia dei turni**: non si può. La carta della striscia non contiene
  i punti ferita né un aggancio per leggerli; il foglio di stile non può portare la larghezza
  della fascia rossa del gruppo su un altro elemento.

Restano, e sono dichiarati, quelli dei giri precedenti. A 375 e 360 px l'intestazione del Tavolo
va su due file come con «Attuale» (il controllo è a 390 px, dove resta su una).

Verifiche dopo l'ultima modifica del foglio di stile (19:40:01; icone 19:30:01):

- Garanzie, misurate nell'app vera (`notes/after-1440.json`, `after-390.json`): barra in basso
  alta 114 px a 1440; nessuno scorrimento laterale a 390 e a 1440; intestazione del Tavolo su
  una fila (63 px) a 390, da giocatore e da DM, in combattimento e in esplorazione; «Termina
  turno», «Annulla ultima modifica» ed «Esc · Annulla preparazione» interi sullo schermo a 390;
  «Entra al Tavolo» tra 552 e 592 px a 390; sotto i 40 px restano solo i termini e le fonti dentro
  il testo e le caselle di spunta con la loro etichetta (il marchio e i PF della barra non più);
  anello del fuoco di 3 px visibile e non tagliato su losanghe, bottoni senza riquadro e marchio
  (`probe/crops/`).
- Il test `tests/visual01-directions.test.mjs` passa (13 su 13), nessun `!important`; Prettier
  passa su `direction.css`, `icons.mjs` e questo file.
- Strumento di verifica: 20 stati su 20 (19:42), nessun testo sotto soglia AA.
- Tema chiaro invariato: col tema chiaro questa opzione dà al Tavolo gli stessi valori di
  «Attuale» (icone di 21 px, colonne della barra a 1440 e a 390, posto del contatore;
  `probe/light/`).
- Le 15 schermate del giro 1 e il foglio di contatto rifatti dopo quell'ora (19:43–19:44) e
  aperti uno per uno; le coppie in `_pairs/` cancellate e rifatte da capo (19:47, 34 file) con
  `fix-bg3/pairs-kit/pairs.sh`, il menu del calendario e la finestra dei punti ferita rifotografati
  con `pairs-kit/cal.cjs` e `pairs-kit/items.cjs`; il ritaglio della barra ora comprende la
  lastra delle risorse.

### Sesto giro di rifinitura (01/10/2026)

Dopo la verifica indipendente del giro del marchio e dei dettagli
(`…/visual-01/notes/open-items-round6.json`, voce `bg3`: un punto alto, tre medi e quattro bassi;
prove della verifica in `…/visual-01/verify-brand-bg3/`) e un sesto passaggio di I-250 con lo
strumento di verifica, il campionario e le pagine intere (Inizio scorso, scheda intera, Magie,
Inventario, Tavolo). Prove in `…/visual-01/polish6-bg3/`: prima `before/` (`direction.css`,
`icons.mjs`, `brand.mjs` e questo file come li ha lasciati il giro precedente) e `audit-before/`
(la misura delle 19:42, l'ultima dopo la modifica delle 19:40); dopo `audit-after/` (21:55),
`audit-below-after/` (le 8 pagine intere), `specimen-after/` (campionario a 1440 e a 390),
`full/` (Inizio, scheda e Tavolo a pagina intera), `review/`, `hotbar-focus-pairs.png`,
`probe/` (misure nell'app vera, con gli strumenti in `tools/`: `probe.js` raggiunge uno stato col
kit di cattura e misura nella pagina; `sweep.cjs` è la prova del fuoco della verifica, rifatta qui
in `sweep/`), `glyph/` (il disegno di «Scena» a 20, 24 e 96 px) e `pairs-kit/`.

| Rilievo della verifica                                 | Prima                                                                                                          | Dopo                                                                                                                                                                                                                      |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| alto · fuoco invisibile su cinque comandi della barra  | «Termina turno», «Muovi», «Azioni della scheda», «Tira i dadi» e «Mosse»: nessun anello, a 1440 e a 390 (AE 0) | anello di 3 px nel colore del fuoco su tutti e cinque, 3 px fuori dai comandi rotondi e dal disco, 3 px dentro «Mosse» come le caselle (`hotbar-focus-pairs.png`; `sweep/`: nessun comando del Tavolo senza fuoco a 1440) |
| medio · deck a 1024 × 768                              | finestra di 158 px senza aggancio: «Dar… incar…» tagliati contro «Mosse»                                       | un solo passo di 58 px: la finestra tiene caselle intere (116 px a 1024, due caselle) e scorre una casella alla volta; a 1280 e a 1440 le sei colonne intere (348 px)                                                     |
| medio · barra delle schede del telefono                | intera solo a 390 px; a 375 e 384 la torcia tagliata di 15 e 6 px; a 720 «Consultazio»                         | intera a 360, 375, 384, 390, 430 e 720 px, anche dopo che l'app la fa scorrere fino alla scheda aperta («Combattimento», «Consultazione», «Tabelle e mazzi»)                                                              |
| medio · «Scena» e «Mappa» con la stessa icona          | la stessa mappa del tesoro, una con il nome e una senza                                                        | «Scena» ha il suo disegno, un paesaggio in cornice (`assets/scene.svg`, disegnato per questo progetto), anche nella barra laterale del computer                                                                           |
| basso · riga sotto l'ultima voce del menu della pedina | un filo 8 px sopra il piede del menu                                                                           | l'ultima riga del menu della pedina, del menu del calendario e dei menu contestuali non ha il filo (resta trasparente: il passo di 40 px non cambia)                                                                      |
| basso · monete (D10)                                   | «30 mo · 45 ma» / «· 120 mr · 12 sb»                                                                           | «30 mo · 45 ma ·» / «120 mr · 12 sb»: sulla scheda del computer al massimo 7 em per riga, riempite in ordine; al telefono una riga sola come prima                                                                        |
| basso · icone su mezzi pixel (D19)                     | icone di «App» e «Torna alla campagna» a y 63,5; icona della scheda dei dadi a x 929,25                        | le prime a y 64 (icona di 20 px); la seconda resta su un quarto di pixel (vedi sotto)                                                                                                                                     |
| basso · barra alta 114 px, 163 con la lastra sopra     | —                                                                                                              | nessun cambiamento, come chiede la verifica: il limite di 120 px riguarda la barra                                                                                                                                        |

Cosa è cambiato, in breve:

- **Il fuoco sulla barra.** La regola delle losanghe rende trasparente il contorno del browser e
  disegna l'anello lungo le punte con ombre e ritaglio; i comandi rotondi, il disco e «Mosse»
  sostituiscono ombre e ritaglio con i loro, così non restava niente. Ora quei comandi
  riprendono il contorno nel colore del fuoco: 3 px fuori, come oggi, per i comandi rotondi e
  il disco; 3 px dentro per «Mosse», come le caselle del deck che scorre.
- **Un solo passo nel deck.** Il separatore rosso di 6 px chiude ogni gruppo dentro la sua ultima
  colonna (52 px più il separatore), così ogni colonna comincia su un multiplo di 58 px. La
  finestra del computer è il numero intero di caselle che ci sta (la stessa regola del
  telefono), appoggiata a «Mosse», e si aggancia alle caselle quando scorre; i suoi ultimi 6 px
  sfumano come al telefono, e il separatore che chiude la finestra non raddoppia quello davanti a
  «Mosse». La colonna stretta è l'ultima del gruppo: «Disimpegno» (56 px di parola) resta in una
  colonna di 58.
- **La barra delle schede del telefono.** Le schede chiuse mostrano solo l'icona fino a 720 px; una
  scheda chiusa e il suo spazio fanno 48 px; la scheda aperta è larga 58 px più i passi interi
  che servono al nome (106 px per «Combattimento»: dove il browser sa misurarla, Chromium);
  la finestra è 58 px più i passi interi che stanno tra «Mappa» e «Tutti», e «Tutti» resta in
  fondo. A 390 px restano cinque schede intere, da 360 a 389 quattro. Scorrendo, a un capo può
  vedersi un margine vuoto di 10 px di una scheda chiusa (la sua icona sta 10 px dentro).
- **Una sola icona per i bottoni** (I-250). Ogni bottone con parole (losanghe, bottoni discreti e
  compatti, bottoni di testo, i collegamenti della testata) e la casella degli oggetti
  dell'inventario disegnano l'icona a 20 px, come i comandi rotondi: c'erano icone di 16, 19, 20
  e 21 px una accanto all'altra (lo strumento: 8 grandezze, ora 6: 13, 14, 16, 18, 20 e 24, cioè
  il ritocco del ritratto, la freccia del menu della sessione, le pillole, le caselle del deck,
  i comandi e la barra del telefono).

Lo strumento di verifica (20 schermate del giro 1; prima 19:42, dopo 21:55):

| Misura                                         | Prima        | Dopo         |
| ---------------------------------------------- | ------------ | ------------ |
| Valori di spazio distinti (fuori scala)        | 25 (11)      | 25 (11)      |
| Spazi sul passo di 2 px                        | 99,5 %       | 99,5 %       |
| Altezze dei comandi                            | 23           | 23           |
| Grandezze dei caratteri · stili di testo       | 16 · 69      | 16 · 69      |
| Grandezze delle icone                          | 8            | 6            |
| Ombre                                          | 50           | 50           |
| Colori (testo · fondo · bordo)                 | 19 · 26 · 34 | 19 · 27 · 34 |
| Varianti dei bottoni (classi con più varianti) | 77 (11)      | 76 (10)      |
| Varianti delle lastre e dei pannelli           | 42           | 41           |
| Varianti delle righe di menu                   | 2            | 4            |
| Bottoni con il margine predefinito del browser | 0            | 0            |
| Contrasto AA sotto soglia                      | 0 su 1203    | 0 su 1203    |

Le 8 pagine intere (Inizio, Magie, Inventario, Tavolo a 1440 e a 390; prima è la misura del
quinto giro, 16:37, perché il giro dei dettagli non l'ha rifatta):

| Misura                                         | Prima     | Dopo      |
| ---------------------------------------------- | --------- | --------- |
| Valori di spazio distinti (fuori scala)        | 27 (12)   | 26 (11)   |
| Grandezze delle icone                          | 9         | 6         |
| Varianti dei bottoni (classi con più varianti) | 73 (10)   | 70 (9)    |
| Varianti delle lastre e dei pannelli           | 35 (4)    | 35 (4)    |
| Bottoni con il margine predefinito del browser | 0         | 0         |
| Contrasto AA sotto soglia                      | 0 su 1416 | 0 su 1406 |

Due numeri salgono per scelta: le righe di menu passano da 2 a 4 varianti perché lo strumento
conta a parte l'ultima riga, il cui filo ora è trasparente (a 1440 e a 390); il colore di fondo in
più è `#d9b77a`, il colore del disegno di «Scena», che la maschera dipinge come fondo dell'icona.

In parte, con il motivo:

- **D19, la scheda dei dadi.** La sua icona sta a x 938,25 a 1440: la lastra delle risorse è
  centrata su una colonna della barra che comincia a x 463,31, perché le colonne prima di lei
  seguono la larghezza dei nomi. Per portarla su un pixel intero bisognerebbe arrotondare la
  posizione rispetto alla finestra, cosa che il foglio di stile non può misurare; cambiare la
  griglia della barra per questo sposterebbe tutto il resto.
- **D10, le monete.** La riga si spezza dopo l'unità e il suo punto per il borsellino dell'esempio
  e per quelli di lunghezza simile; il testo dell'app ha spazi normali, quindi un borsellino molto
  più lungo può ancora andare a capo tra una cifra e la sua unità.

Cercato e lasciato com'è: al telefono, da DM, il segnaposto «Cassa sfondata» (9 px) resta sotto il
cartello «Sessione non avviata» quando riceve il fuoco, e l'anello non si vede (il cartello è
dell'app; con «Attuale» il cartello è più piccolo e non lo copre); tra 721 e circa 900 px il deck
del computer non ha posto (a 800 px 2 px, a 900 una casella intera), come con «Attuale» (4 e
28 px). Restano, e sono dichiarati, quelli dei giri precedenti.

Verifiche dopo l'ultima modifica del foglio di stile (21:53:01; disegno di «Scena» 21:40:14):

- Garanzie, misurate nell'app vera (`probe/guarantees.json`): barra in basso alta 114 px a 1440
  in combattimento, da DM e in esplorazione; nessuno scorrimento laterale a 390 e a 1440 (Inizio,
  scheda, Tavolo); intestazione del Tavolo su una fila (63 px) a 390, da giocatore e da DM;
  «Termina turno», «Annulla ultima modifica» ed «Esc · Annulla preparazione» interi sullo schermo
  e in cima a 390; «Entra al Tavolo» finisce a 592 px a 390; nessun bersaglio sotto i 40 px negli
  stati misurati.
- Fuoco: `sweep/` (combattimento, DM ed esplorazione a 1440 e a 390): a 1440 nessun comando senza
  fuoco visibile; a 390 restano «Ultima mossa» e le due pillole del pannello del DM, come con
  «Attuale», e il segnaposto qui sopra. `probe/focus.json`: i cinque comandi della barra hanno
  `outline` 3 px pieno nel colore del fuoco.
- Il test `tests/visual01-directions.test.mjs` passa (13 su 13), tutti i test del blueprint pure
  (2694 su 2694); nessuna regola senza prefisso (`notes/prefix-audit.js`), nessun `!important`,
  nessun `text-transform`, `content` solo vuoto; Prettier passa su `direction.css`, `icons.mjs`
  e questo file.
- Strumento di verifica: 20 stati su 20 (21:55) e 8 pagine intere su 8, nessun testo sotto soglia
  AA; campionario a 1440 e a 390 (21:49), tutti i controlli passati.
- Le 15 schermate del giro 1 e il foglio di contatto rifatti dopo quell'ora (21:57) e aperti uno
  per uno; le coppie in `_pairs/` cancellate e rifatte da capo (21:58–21:59, 34 file) con
  `polish6-bg3/pairs-kit/pairs.sh`, il menu del calendario e la finestra dei punti ferita
  rifotografati con `pairs-kit/cal.cjs` e `pairs-kit/items.cjs`.

### Rifinitura premium del 02/10 (02/10/2026)

L'owner ha chiesto un'interfaccia «magica», «premium», «rifinita in ogni dettaglio» (I-248 →
I-254). La critica del 02/10 (`…/visual-01/round2/premium-critique/notes.md`) diceva: la
disposizione è quella di BG3, ma i materiali sono piatti, la luce c'è solo in tre punti e non si
muove niente. Questo giro aggiunge materiale, luce e un minimo di movimento, tutto in fondo a
`direction.css` (sezione «premium pass (02/10)»), senza toccare misure, testi o markup. Prova
prima/dopo: `…/visual-01/round2/premium/before/` e `…/round2/premium/after/`; le stesse foto
nuove sono anche in `…/visual-01/board/shots/`. Strumenti e misure di questo giro in
`…/round2/premium/b2/`.

Cosa è cambiato, nell'ordine della critica:

1. **Tavolo, il palco.** Prima la mappa era una scatola con bordi netti dentro fasce nere
   (#0b0a09): la colonna degli strumenti, lo spazio sotto la mappa e, a 390, una fascia vuota di
   circa 200 px. Ora il palco è «il buio dello stesso mondo»: una vignettatura nero-calda con una
   grana di pietra quasi invisibile, e i bordi della mappa sfumano nel buio (una maschera sulla
   sola immagine della scena). Margini della mappa, offset del sistema che sistema l'HUD e filtri
   su mappa e pedine sono rimasti identici; i nomi delle pedine restano a 13 px.
2. **La barra come un unico oggetto fuso.** Il bordo della barra ha le quattro linee di BG3
   (filo scuro, bronzo, marrone, oro) disegnate solo con ombre, quindi nessuna misura cresce
   (altezza 114 px a 1440, limite 120). La tavola delle risorse e la scheda «Digitali» poggiano
   su un arco rialzato (`assets/hotbar-arch.svg`) che entra nel bordo della barra. I due
   riccioli piccoli alle estremità della barra non ci sono: le estremità sono coperte dal
   medaglione del ritratto e da «Termina turno», come in BG3, e lì non si vedrebbero.
3. **Le caselle delle azioni.** Fondo quasi nero #050D10 con un bordo scuro sfumato; dietro
   ogni icona una luce del colore della famiglia (blu-grigio gli incantesimi, marrone le armi,
   blu le aree, viola le mosse) e l'icona stessa illuminata. Il pallino «disponibile» resta il
   segnale che non è solo un colore. **Non fatto:** l'icona non è salita a 22-24 px, perché i
   nomi su due righe riempiono già i 48 px della casella e verrebbero spinti fuori.
4. **Luce degli stati.** Passare col puntatore accende una banda calda dal basso con un bordo
   chiaro; lo stato scelto ha un cuore chiaro con un alone ambra sul bordo (mai fuori come
   l'anello del fuoco di 3 px); premere scurisce e abbassa di 1 px. Vale per i medaglioni
   rotondi (strumenti della mappa, schede laterali, comandi del turno), le pillole e le righe
   degli elenchi. Lo stato scelto conserva il suo bordo o il suo riempimento, non solo il colore.
5. **Movimento misurato.** Solo se il sistema non chiede movimento ridotto e la preferenza
   dell'app è spenta: 120 ms di transizione sulle luci, i suggerimenti salgono di 2 px in
   160 ms, i dialoghi si aprono da 0,98 a 1 in 180 ms, il bagliore di «Termina turno» «respira»
   in 2,8 s cambiando solo la trasparenza (l'alone non si allarga, così non tocca il bordo della
   finestra). Le durate `--dur-*` non sono toccate. **Non fatto:** il lampo ciano di BG3
   all'inizio del turno. L'app ridisegna la barra a ogni azione, quindi un'animazione «una
   volta sola» in CSS ripartirebbe a ogni clic; serve un aggancio al cambio di turno, fuori da
   uno skin solo CSS.
6. **Materiale delle tavole.** Su Inizio, nella scheda, nel pannello di destra del Tavolo, nel
   titolo della scena e nei dialoghi: ombreggiatura calda di BG3 (luce bruna dall'alto, bordi
   più scuri) e la stessa grana leggera, con un filo di luce interno in alto e un'ombra più
   profonda. Il colore di fondo «calcolato» resta lo stesso quasi-nero, così i controlli di
   contrasto leggono lo stesso valore. Nessun ornamento sulle tavole normali (regola di BG3).
7. **Pulsanti a losanga fusi.** Stesse punte, stessa altezza, stesso anello del fuoco; in più
   un filo scuro sotto ogni linea d'oro (doppia linea fusa), una luce in alto, un piede più
   scuro e le estremità più scure. Il primario blu-verde ha un riflesso ciano dal basso, della
   stessa famiglia del disco di fine turno. Al passaggio il testo prende il bagliore d'oro;
   premuto prende la banda #7D5838 e scende di 1 px; non disponibile è la banda spenta #322318.
8. **Titoli in oro fuso.** «La prossima avventura», «Le lanterne di Bruma», il nome nella
   scheda («Livia») e il titolo dei dialoghi («Avvia combattimento»): lo stesso oro del marchio
   ritagliato nelle lettere, un contorno scuro e un debole bagliore d'oro. Il colore resta la
   crema (i controlli di contrasto leggono un colore vero), il testo selezionato torna leggibile,
   l'alto contrasto mantiene i titoli semplici. **Non fatto** sul titolo della scena del Tavolo:
   è di 18-19 px, sotto la soglia dei 24 px.
9. **«Termina turno» vivo.** Un anello di rune tenui (`assets/endturn-runes.svg`, solo sul
   disco del desktop), il piccolo rombo ciano in fondo al bordo, lo stato premuto (un filo più
   piccolo, il pozzo più profondo) e lo stato non disponibile di BG3 (bordo grigio, centro
   rosso-nero). Il disco resta di 98 px e l'anello del fuoco non cresce. Sul telefono la pillola
   ha lo stesso rombo e gli stessi stati.
10. **Ordine dei turni in metallo.** Le cornici di squadra hanno un riflesso diagonale e un
    filo di luce in alto; il ritratto è seduto in un filo scuro con un'ombra interna; la carta
    del turno attuale è argento con un alone bianco. Dimensioni invariate, l'anello tratteggiato
    dei nemici resta, e con le tavolozze per il daltonismo valgono i colori di prima.
11. **Inizio: fuoco caldo contro pietra fredda.** Pozze di luce di torcia
    (`assets/home-torchlight.svg`) sopra il viraggio freddo della sala, sotto la vignettatura,
    più un debole nucleo caldo dietro il titolo.

Il testo della critica arrivato a questo giro si interrompe al punto 11 (di 24): i punti 12-24
non sono stati letti, quindi non sono stati fatti.

Controlli (02/10, `…/round2/premium/guarantees-after/`): barra 114 px a 1440; «Termina turno»
e i due comandi per annullare visibili a 1440 e a 390; nessuno scorrimento orizzontale a 390; testata
su una riga; «Entra al Tavolo» nei primi 844 px; gli unici due anelli del fuoco tagliati sono
gli stessi di «Attuale» (marchio a 390 sul Tavolo, schede della scheda a 1440).

### Correzioni di dettaglio del 02/10 (02/10/2026)

Una revisione indipendente del giro premium ha trovato 15 difetti di dettaglio (F1-F15: 2 alti, 8
medi, 5 bassi). Questo giro li corregge con i token di questa opzione, tutto in fondo a
`direction.css` (sezione «detail fixes (02/10)»), senza toccare testi o markup. Strumenti, ritagli
di prova e audit: `…/visual-01/round2/premium/fix/`; le foto nuove del giro 1 sono in
`…/visual-01/board/shots/`.

Fatto:

1. **F1 · Anello del fuoco nell'ordine dei turni (alto).** A 1440 l'anello del ritratto
   attivo perdeva 4 px in alto (la striscia scorre di lato e lo tagliava) e la carta accanto lo
   copriva a destra. Ora la striscia ha 8 px sopra le carte e sale degli stessi 6 px in più,
   quindi le carte restano dove erano; la carta col fuoco sta sopra le vicine. Misura: 0 px
   tagliati su tutte e cinque le carte, giocatore e DM, 1440 e 390.
2. **F2 · Caselle della barra tutte uguali (alto).** Prima «Mani brucianti» era larga 52 px
   accanto ai 58 di «Dardo incantato». Ora da 1280 px in su ogni casella è 58 × 48 e il
   separatore rosso di BG3 è una colonna sua di 10 px con il segno «II» (due tacche scure),
   come nel gioco. Le icone passano da 18 a 24 px; il nome sta su una riga con i puntini e,
   col puntatore o col fuoco, compare intero su una banda scura dentro la casella. Sotto i
   1280 px la barra è una finestra che scorre e tiene il passo unico di 58 px, così il bordo
   cade sempre tra due caselle intere (la verifica del 01/10 aveva bocciato «Dar… incar…»).
3. **F3 · Anello tagliato nella finestra dell'iniziativa a 390 (medio).** Lo scorrimento si
   ferma 8 px prima del bordo: il campo «d20 di Doran», le caselle «Sorpreso» e i pulsanti
   hanno l'anello intero (0 px tagliati su 23 controlli).
4. **F4 · Una sola distanza tra i pulsanti rotondi (medio).** 6 px ovunque (strumenti della
   mappa, comandi della sessione, comandi del turno accanto a «Termina turno», che erano a
   8 px, e la colonna di destra, che era a 4 px). Dopo «Tutti i pannelli» la pausa è di 12 px
   esatti con una linea di bronzo, non più 9 px.
5. **F5 · Tre forme di pulsante, una per ruolo (medio).** Losanga = comando, pillola = filtro o
   pagina, parole semplici solo dentro un testo. Diventano losanghe: «Riposa», «Correggi
   valori», «Avanza di livello», «Rivedi scelte» nella scheda; «Scene», «Riposi», «Tempo» del
   DM al Tavolo (sul computer: sul telefono restano parole, altrimenti vanno a capo e la
   targa copre 35 px di mappa in più); «Avvia ora» e «Non ora» dell'avviso di sessione. Il
   menu «Digitali» passa a 14 px seminerassetto, come le schede della barra.
6. **F6 · Menu contestuali come pannelli incorniciati (medio).** Il menu della pedina, quello
   delle righe e quello del calendario avevano una tavola grigio-bruna più chiara di tutto il
   resto (è il colore del menu di BG3 su PC, B35, ma qui stonava). Ora: tavola quasi nera
   traslucida (#0b0a09 al 92 %, al 97 % nel foglio del telefono, così sotto non si leggono le
   caselle), linea di bronzo #77542C con la linea d'oro #B17D44 subito dentro, una piccola
   losanga d'oro a ogni angolo. Sul telefono il suggerimento «Maiusc+Invio» esce dalla vista
   (resta nel nome della riga per i lettori di schermo).
7. **F7 · Mappa del telefono (medio, in parte).** I nomi delle pedine erano alti 7 px: ora sono
   disegnati 2,2 volte più grandi attorno al loro centro (circa 11 px sullo schermo; la loro
   dimensione resta 13, come chiede il test dei 13 px), e così lo stato dei nemici («Illeso»).
   I nomi delle zone stanno centrati sotto il segno, 1,5 volte, con l'alone scuro: «Scale per
   la cripta» non arriva più a 4 px dal bordo. Le porte tengono il bersaglio di 42 px ma hanno
   una tavola più leggera (fondo scuro trasparente, filo di bronzo, segno più piccolo).
8. **F8 · La tavola delle risorse (medio).** I pallini di azione, bonus e reazione non stanno più
   in scatole nere separate ma sulla tavola stessa, accesi dall'interno (un nucleo chiaro nel
   loro colore) con un alone dello stesso colore; un pallino usato resta spento, quindi lo
   stato non dipende solo dal colore. Celle di 36 px, la tavola con un'ombra interna; i numeri
   dei livelli degli incantesimi sopra un filo d'oro che copre i loro quadratini. La campanella
   «Tiri e risultati» è un pulsante rotondo di 40 px come gli strumenti della mappa.
9. **F9 · Schede della scheda a 390 (medio).** Una sola linea sotto tutta la fila (prima c'era
   un gradino di 1 px tra le schede e «Tutte»); «Tutte» è alta 44 px come le altre; le schede
   che scorrono sotto «Tutte» sfumano negli ultimi 24 px.
10. **F10 · Avviso «Sessione non avviata» (medio).** Non sta più al centro della mappa (a 1440
    copriva l'Esploratore, a 390 metà mappa): è un avviso basso al piede della mappa, sopra la
    riga di stato sul computer e sopra la riga dello zoom sul telefono, dove c'era la fascia
    vuota. Le parole e i due comandi stanno su una o due righe.
11. **F12 · Contrasto (basso).** I nomi piccoli di tiri salvezza e abilità passano da #9a7a60 a
    #a8876b; le etichette sulle tavole con la grana (stato della scena «Combattimento · Round
    1», etichette dell'inventario come «Set d'armi», i dati del libro come «Libro») passano al
    bronzo chiaro #cbac95; sul telefono la targa della scena ha un fondo pieno. I segni dei
    punti di viaggio del DM («⋯», «▣») hanno l'alone scuro.
12. **F13 · Carte dei nemici (basso).** Il rettangolo tratteggiato bianco sul ritratto è
    sostituito da angoli tagliati (un ottagono dentro la cornice rossa): resta un segnale di
    forma, non di colore. Sulla mappa la pedina tiene l'anello tratteggiato.
13. **F14 · Inventario e magie (basso, in parte).** L'icona dell'oggetto riempie la casella
    (28 px su un alone di bronzo); i filtri dell'inventario sono una riga sola che scorre, con
    la sfumatura finale; il filtro «1°» delle magie è una pillola, non un cerchio.
14. **F15 · Comandi della scheda a 390 (basso).** Griglia regolare: l'etichetta «Solo
    campagna» da sola, poi «Condividi» e «Gestisci personaggio» in due colonne uguali; sotto il
    nome le quattro losanghe due per due e «Vai al Tavolo» su tutta la larghezza.
15. **F11 · Punti ferita nella scheda (basso, in parte).** Lo «0» del campo è il suo segnaposto,
    ora nel bronzo di base; il segno che indica un suggerimento su una statistica (l'angolo
    dello scudo «CA») è una piccola losanga d'oro invece del puntino quasi bianco.

Non fatto, e perché:

- **Mappa del telefono che riempie l'altezza (F7).** La scena è orizzontale (1000 × 650) e l'app
  la adatta alla larghezza; la cornice (`viewBox`) la decide l'app, non il CSS. Riempire
  l'altezza richiede un adattamento iniziale nell'app (`table.mjs`). Nel frattempo la fascia
  vuota ospita l'avviso di sessione del DM.
- **Bordo sinistro del menu della pedina su un pixel intero (F6).** La posizione
  (`left: 342.64px`) la scrive l'app in linea (`token-menu.mjs:3358`); il CSS non può
  arrotondarla senza `!important`. Serve un `Math.round` nell'app.
- **«Cura» e «Danno» da 84 px (F11).** Non entrano: il campo sopra fissa la loro colonna a
  141 px e due losanghe da 84 finivano sulla barra dei punti ferita. Servirebbe cambiare le
  colonne della fascia. Restano anche la griglia a tre colonne uguali di Iniziativa, CA e
  Difese e le misure frazionarie dei riquadri delle caratteristiche.
- **Intestazioni delle statistiche del libro su due righe fisse e spazio del triangolino nei
  pulsanti «Lancia» (F14).** Nelle foto i valori stanno già su una riga comune; il resto non è
  stato toccato.
- **Il controllo automatico dell'anello sulle carte dei turni.** `guarantees.js` non controlla
  `.initiative-token`; il file è fuori dai file riservati a questo giro, quindi il controllo
  non è stato aggiunto (le misure sopra sono di `…/round2/premium/fix/focus.js`).

Controlli (02/10): `guarantees.js --directions current,bg3` stampa «ok bg3» (gli unici due
anelli tagliati sono gli stessi di «Attuale»); barra 114 px a 1440; a 1024 la finestra della
barra tiene due caselle intere; nessuno scorrimento orizzontale a 390 in nessuno stato;
`tests/visual01-directions.test.mjs` 20/20; Prettier pulito.

Audit dei valori (`changes/visual-01/audit/audit.js --direction bg3`, 03/10 04:30 UTC, 20 foto,
in `…/round2/premium/fix/audit-bg3/`):

| Misura                             | Valore                                                                |
| ---------------------------------- | --------------------------------------------------------------------- |
| Elementi visibili                  | 2569                                                                  |
| Spaziature                         | 26 valori; passo 2 px (copre il 99 %); 12 valori fuori scala          |
| Altezze dei controlli              | 22 valori                                                             |
| Tipografia                         | 1 famiglia (Alegreya), 16 dimensioni, 5 pesi, 34 interlinee, 66 stili |
| Raggi · spessori dei bordi · ombre | 5 · 4 · 53                                                            |
| Colori (testo · fondo · bordo)     | 19 · 29 · 32                                                          |
| Pulsanti                           | 575 elementi, 15 classi visive, 76 varianti                           |
| Contrasto AA                       | 1 errore, 339 incerti, su 1199 testi                                  |

L'unico errore rimasto è un artefatto della misura: «Nessun effetto sulla velocità» è una parola
dentro un paragrafo che va a capo, e l'anello di pixel attorno al suo riquadro prende le lettere
delle parole vicine (mediana 13,4:1; crema #e6dbc2 su #0c0c0c fa circa 14:1). Dei 339 incerti, 305
sono nella scheda intera sotto la piega (pixel non leggibili nella foto), gli altri sono piccoli
segni sulla mappa.

### Rifinitura premium, seconda parte (04/10)

Seconda parte della critica premium (`…/visual-01/round2/premium-critique/items-P12-P24.md`),
voci P12–P24, più una regressione; tutto in fondo a `direction.css` (sezione «premium pass, part
two (04/10)»), salvo la correzione dei nomi, fatta dove era nata (F2). Nessun testo, misura o
markup cambiato; il contrasto alto tiene le regole più semplici di prima.

- **Nomi delle caselle della barra di nuovo interi.** Dopo la prima rifinitura i nomi stavano su
  una riga e venivano tagliati («Dardo inc…», «Mani bruc…», «Disimp…»). Ora l'icona è di 20 px
  (era 24) a 2 px dal bordo alto, e sotto il nome va su due righe in corpo Tiny (11 px),
  centrato, su tutta la larghezza della casella, con il suo alone scuro. La casella resta
  58 × 48 e la barra non cresce (114 px a 1440 × 900, il limite è 120). Tolta la fascia scura
  che mostrava il nome intero solo al passaggio del puntatore: non serve più.
- **P12 · Pulsanti rotondi come medaglioni in rilievo** (strumenti della mappa, zoom e centra,
  medaglioni della colonna destra, comandi rotondi della barra). La cornice di bronzo è
  illuminata in alto a sinistra e in ombra in basso a destra (un gradiente conico), il fondo è
  un pozzetto scuro incavato; quello scelto è blu acciaio con una luce ciano tenue dentro. Al
  passaggio del puntatore la cornice si schiarisce e il simbolo prende il bagliore dorato.
  Misure (40 px), anello di fuoco e borchia «altri strumenti» invariati. Sul telefono la colonna
  destra è una barra di schede e resta com'era.
- **P13 · Ispettore e colonna destra come tavole sfumate.** Il nero quasi pieno si alleggerisce
  verso la mappa, con la grana; il bordo verso la mappa è un filo di 1 px, oro al centro e
  bronzo che svanisce alle estremità, con un piccolo stemma vicino all'alto (nuovo disegno
  `assets/edge-crest.svg`). Larghezza e posizione invariate.
- **P14 · Anatomia dei suggerimenti.** Una striscia più scura dietro il titolo (per i
  suggerimenti di una riga, dietro tutta la riga), una fascia più scura in fondo dove c'è la
  riga d'aiuto («Clic sul nome…»), una tinta viola verso il basso a destra solo sugli
  incantesimi, un'ombra morbida più ampia; anche l'avviso in basso (#toast) prende la tavola e
  l'ombra. Spaziature invariate (il posizionamento misura il riquadro); la dissolvenza di
  160 ms è quella della prima parte. Il bronzo della riga d'aiuto resta sopra 5,6:1.
- **P15 · Dialoghi su una tavola di fumo.** La tavola riempie solo l'interno della cornice
  disegnata: nera al 92 % al centro, all'86 % vicino al filo, e fuori dal filo non c'è più il
  rettangolo nero; dietro, una vignetta (dal 55 % all'85 % di nero) senza sfocatura, come in
  BG3. Cornice, stemma, misure e scorrimento invariati. Nell'appello dell'iniziativa ogni riga
  è una tavola con il solo filo in basso (tratteggiato se la creatura non combatte, come il
  bordo tratteggiato di prima), chi combatte è illuminato dal basso, e il totale del d20 ha il
  bagliore dorato.

- **P16 · Intestazione della scheda come il pannello del personaggio di BG3.** Il ritratto è
  ora il medaglione rotondo di bronzo della barra (88 px sul computer, 72 sul telefono, a passi
  di 4 px secondo la larghezza della scheda), con la cornice in rilievo e il pozzetto di P12;
  al passaggio del puntatore la cornice si schiarisce. Il bollino «modifica» è spostato dentro
  il cerchio, così non viene tagliato. Tra l'intestazione e la striscia delle caratteristiche
  c'è un filetto dorato a tutta larghezza con un nodo al centro (nuovo disegno
  `assets/rule-knot.svg`, 14 px), nello spazio che c'era già. La barra dei PE tiene la sua
  cornice e prende una luce interna (da #2D5568 a #1C303E) e un filo d'oro sotto. La scheda
  aperta non ha più la riga piatta: sotto il nome c'è una barra di luce di 2 px, chiara al
  centro, con il bagliore che sale dal basso (P4). Il nome aveva già l'oro di P8. Altezza
  dell'intestazione, a capo dei comandi e larghezza invariati a 1440 e a 390.
- **P17 · Segnalini che brillano.** Azione, azione bonus e reazione disponibili hanno un cuore
  bianco (al 30 %) nel loro colore e un alone di 3 px dello stesso colore; la barra del
  movimento va da #EAB94A a #FFC951 con un filo di luce in alto. Un segnalino speso tiene la
  sua forma nel suo colore al 30 %, senza cuore né alone: acceso e spento differiscono per il
  riempimento, non solo per il colore. Gli slot incantesimo, nella barra e nella scheda, hanno
  il cuore #85FDFF su #00D2FF; quelli spesi sono il solo contorno al 30 %. Altezza della barra
  invariata (114 px a 1440 × 900).
- **P18 · Accenti arcani (ciano e viola per la magia, l'oro per l'oro)**, solo nella scheda e
  al Tavolo. Ogni riga di incantesimo ha una tinta viola tenue sul bordo sinistro (anche sotto
  il puntatore); «Lancia», al passaggio del puntatore o con la tastiera, si accende di ciano;
  il riquadro della concentrazione sta sullo stesso viola (con una luce ciano quando è attiva);
  nella barra le caselle del gruppo «Incantesimi» hanno un fondo viola e il simbolo acceso di
  ciano; in «Avvia combattimento» la colonna del dado di ogni creatura (d20, tiro, totale) sta
  su un arco viola scuro (#0F0C15) bordato d'oro, con un anello di rune nostro all'8 % (nuovo
  disegno `assets/rune-ring.svg`). Il crema sul viola #271E2B resta circa 15:1. Nuovi gettoni
  `--bg3-arcane-cyan`, `--bg3-arcane-violet`, `--bg3-arcane-glow` e altri tre.
- **P19 · Numeri da eroe.** Cifre allineate e di larghezza fissa dove i numeri stanno in
  colonna (striscia, righe di tiri salvezza e abilità, sensi passivi, punti ferita, tabella
  degli slot, contatori della barra, totali d'iniziativa). Classe Armatura, punti ferita
  attuali e bonus d'iniziativa sono #FFFCED con il bagliore dorato di BG3 sopra il filo scuro;
  il massimo dopo «/» resta senza bagliore. «CA» sopra lo scudo è in maiuscoletto ricavato
  dalle sue maiuscole (font-variant-caps, nessuna trasformazione del testo); le altre
  etichette restano con l'iniziale maiuscola.
- **P20 · Simboli in rilievo.** Ogni simbolo dentro un comando (i servizi dell'intestazione, le
  schede in alto, i simboli dei pulsanti, i comandi rotondi) ha un filo scuro sotto e una luce
  chiara sopra, come le icone dorate di BG3; al passaggio del puntatore o con la tastiera prende
  anche il bagliore d'oro di P12. Solo CSS: la doratura vera dentro le icone (`icons.mjs`) è già
  la variante «i1 · Glifi dorati», e con le varianti di icone (i1–i3) il rilievo si spegne,
  perché quei simboli hanno già il loro contorno e la loro ombra. Le caselle della barra e il
  marchio tengono la loro luce.
- **P21 · Scudo della Classe Armatura con doppio filo.** Stessa forma e stessa misura (scheda
  78 × 88, ispettore 52 × 55). Il bordo di bronzo è acceso in alto a sinistra (#D9BD7C →
  #B17D44 → #77542C); dentro, un filo scuro #1A120B e un filo sottile di bronzo #77542C, poi un
  campo scuro radiale (#241A13 → #0B0908) con un velo di luce in alto a sinistra. I due fili
  stanno in un disegno nuovo (`assets/shield-keyline.svg`) che tiene lo spessore di 1 px a
  qualsiasi misura. Lo scudo della scheda, che è un pulsante, accende il bordo sotto il
  puntatore; il numero dello scudo nell'ispettore è ora #FFFCED con il bagliore di P19, come
  quello della scheda. Iniziativa e velocità non sono distintivi nel nostro tema (righe
  etichetta-sopra-valore, come la finestra di esame di BG3): restano come sono.
- **P22 · Filetti delle sezioni in oro, con una gemma.** I titoli centrati della scheda («Tiri
  salvezza», «Abilità», «Azione», «Trucchetti», «Livello 1»…) hanno lo stesso filetto con
  ricciolo, ora più visibile: va dal bronzo #B17D44 vicino al titolo all'oro chiaro #D9BD7C sul
  ricciolo, con un piccolo rombo-gemma alla punta esterna e un filo di luce sopra e uno scuro
  sotto. Disegni nuovi `assets/rule-gilt-left.svg` e `rule-gilt-right.svg`; i vecchi restano per
  il contrasto alto. Quando lo spazio manca, il filetto perde prima il ricciolo e la gemma, come
  prima. Le tavole della Home e i dialoghi restano senza filetti (P6: niente ornamenti sulle
  tavole normali).
- **P23 · Ritratti del gruppo incassati nella cornice.** Al Tavolo (colonna a sinistra e pila del
  telefono) la cornice tiene colore e spessore (bronzo, blu acciaio in una variante di colore,
  argento per chi è scelto) e ha sopra una smussatura: chiara in alto a sinistra, scura in basso
  (il bronzo #81572F si legge da #C9A56A a #5A3C20). Il ritratto sta più in fondo, con un'ombra
  interna sotto il filo scuro. Sotto il puntatore la smussatura si schiarisce; la cornice scelta
  ha una smussatura d'argento fredda e tiene il suo alone bianco. Misure invariate (60 × 84 a
  1440, 40 × 48 a 390); l'immagine del ritratto resta quella dell'app.
- **P24 · Intestazione con filo d'oro e profondità** (Home, scheda, Tavolo). Il fondo prende la
  luce calda delle tavole (P6) sullo stesso nero; il bordo in basso è un filo d'oro di 1 px che
  sfuma ai due capi, con una piccola gemma al centro (disegno nuovo `assets/header-node.svg`)
  sopra un filo scuro; sotto, un'ombra morbida sulla pagina, così la barra sta sopra di essa
  (l'intestazione è alzata di un livello; i suoi menu sono dialoghi, sempre sopra). Nessuna
  altezza aggiunta: 81 px sulla Home e sulla scheda a 1440, 63 px al Tavolo, che a 390 resta su
  una riga.
- **Coerenza della seconda parte.** Un solo gettone per il rilievo dell'oro (`--bg3-relief`), usato
  dai simboli e dai filetti; il bagliore dei comandi rotondi di P12 ora è lo stesso dei simboli
  (rilievo più bagliore). Il ciano e il viola arcani (`--bg3-arcane-cyan`, `--bg3-arcane-violet`)
  sono ora la sola fonte di quei colori: li usano la luce del comando scelto (P12), la tinta
  magica dei suggerimenti (P14), il bordo delle righe d'incantesimo, il riquadro della
  concentrazione (nuovo gettone `--bg3-arcane-wash`) e il bagliore delle caselle d'incantesimo
  (P18). Colori risultanti invariati.

Fonti: facts A3 («Iconography (UI chrome)», «Tooltip», «Modal dialog frame»), A4 («Medallion
tabs»), A0 e A3 (LeftSideSmoothShadingBrush); immagini `bg3-sheet-character-panel.png`,
`bg3-panels-subclass-select-steam.jpg`, `bg3-panels-tooltip-spell.jpg`; per P16–P19 facts A0.1
(«Casing», TextGlow), A1 («Resource pips row»), A2 («Roll frame»), A3 e A4; immagini
`bg3-sheet-character-panel.png` e `bg3-dice-crop-roll-panel-advantage.png`; per P20–P24 facts A1
(«Iconography», «Party frame colours»), A3 («Iconography (UI chrome)», «Elevation») e A4 («AC
badge»); immagini `bg3-panels-subclass-select-steam.jpg` (icona «Wild Magic»),
`bg3-sheet-examine-enemy.jpg`, `bg3-table-crop-party-portraits-4k.png` e
`bg3-sheet-character-panel.png`.

## Marchio (I-251)

Il marchio di questa opzione è un **d20 fuso in oro brunito**, con la faccia del «20» smaltata di
nero e il numero chiaro, e accanto la scritta **«d20 Studio»** nello stesso oro: un «d20» pesante
e uno «Studio» più leggero. Il dado è disegnato in codice (`brand.mjs`, SVG) sulla geometria
condivisa da tutte le opzioni (`../brand-geometry.mjs`, un icosaedro vero visto di faccia); la
scritta è il testo dell'app con le regole della sezione «brand (I-251)» in fondo a
`direction.css`. Nessuna immagine.

- **Dove si vede:** testata di Inizio (dado di 38 px, scritta di 24 px), testata del Tavolo
  (34 px e 22 px), telefono (solo il dado, 32 px, dentro il bersaglio di 40 px; al Tavolo l'app
  lo nasconde già), icona della scheda del browser. Con il tema chiaro tornano il marchio e
  l'icona di oggi.
- **Campionario:** <http://127.0.0.1:8881/directions/specimen.html?direction=bg3>, sezione
  «Marchio» (testate, il dado da 16 a 160 px, l'icona della scheda, il marchio completo a 3×).
- **Prove:** `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/brand-bg3/`:
  `montage-brand-bg3.png` (i riferimenti di BG3 accanto al marchio), `headers-1440-bg3.png` e
  `headers-390-bg3.png` (testate prima e dopo, puntatore sopra, fuoco da tastiera, a 2×),
  `specimen/spec-brand-dark-1440-bg3.png`, le misure in `checks/after-report.json`, le prove di
  disegno scartate in `lab/`.

### Cosa prende dalla grammatica di BG3

| Elemento del marchio                                                                     | Da BG3                                                                                                     | Fonte                                                         |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Il materiale: oro fuso, incavi bruno quasi nero, uno smusso chiaro sugli spigoli in alto | la scritta del titolo nel menu principale (metallo dorato, ombre profonde, luce dall'alto)                 | `bg3-home-main-menu-annotated.jpg` (B44)                      |
| I toni dell'oro, dal bronzo alla luce: #77542c, #b17d44, #d9bd7c, fino a #fff2b3         | la tavolozza dell'interfaccia                                                                              | facts A0 (colori XAML), A3 (filo d'oro dei pulsanti)          |
| La faccia del «20»: placca quasi nera dentro un filo d'oro, numero crema con alone oro   | il pannello del tiro: numero chiaro su placca scura dentro la cornice d'oro; l'alone oro #df9800 del gioco | `bg3-dice-crop-roll-panel-advantage.png`, facts A0 «TextGlow» |
| La scritta in Alegreya, maiuscole e minuscole, senza spaziatura, cifre allineate         | il carattere di BG3 col controller e le sue regole                                                         | facts A0.1 («Controller UI faces», «Casing»)                  |
| Un filo scuro di 1 px sotto le lettere d'oro                                             | il contorno scuro del testo di BG3                                                                         | facts A0.1 «Text stroke»                                      |
| Puntatore sopra e fuoco da tastiera: il dado e la scritta si accendono di alone oro      | l'alone oro del testo evidenziato                                                                          | facts A0 «TextGlow»; l'anello di 3 px resta quello dell'app   |

### Cosa è originale

- La forma: il dado a venti facce, uguale in tutte le opzioni; qui fuso in oro con la luce
  calcolata faccia per faccia, gli spigoli incisi, lo smusso in alto e la faccia del «20» come
  una piccola placca smaltata.
- La coppia di pesi della scritta: «d20» a 800 e «Studio» a 500, nello stesso oro, con il centro
  del dado allineato al centro delle maiuscole.
- L'icona della scheda: lo stesso dado in tre toni piatti con gli spigoli larghi e il bordo
  scuro, senza numero (a 16 px non si leggerebbe), chiara sia su una barra scura sia su una
  chiara.

### Perché non è una copia del logo di BG3

- Il logo di BG3 è una **scritta**, «Baldur's Gate», con lettere disegnate apposta (grazie a
  spina, svolazzi, la «d» e la «G» intrecciate) e al centro il numerale romano «III» trasformato
  in un emblema con punte e tentacoli. Il marchio bg3 non usa nessuna di queste cose: nessuna
  lettera ridisegnata (la scritta è Alegreya, un carattere libero OFL), nessun numerale romano,
  nessuna spina, nessun tentacolo, nessun emblema.
- Prende solo il **materiale e la luce** (oro fuso su nero), che sono la grammatica di tutta
  l'interfaccia del gioco, non un segno del suo logo.
- Anche il dado non è quello del gioco: i dadi di BG3 («Scuffed Metal», «Dragonflame Red»,
  «Behir Blue», `bg3-dice-design-picker.webp`) sono di metallo grigio-viola, rossi o blu, con i
  numeri su tutte le facce; il nostro è d'oro, con un solo numero e la faccia centrale nera.
- Nessun pixel, texture, carattere o tracciato di Larian; nessuna immagine di riferimento è
  stata ricalcata o inclusa.

### Misure e controlli (01/10/2026)

- **Altezze invariate:** testata di Inizio a 1440 alta 81 px, del Tavolo 63 px, come prima; a 390
  Inizio 105 px e Tavolo 63 px su una sola riga. Nessuno scorrimento orizzontale a 390;
  «Entra al Tavolo» nei primi 844 px, «Termina turno», annulla e cancella visibili.
- **Allineamento:** il centro del dado e il centro delle maiuscole coincidono (83,0 e 82,9 px
  nella testata di Inizio, 74,0 e 73,9 px in quella del Tavolo); tra il dado e la scritta si
  vedono 11 px (6 px di spazio più il margine del dado).
- **Contrasto:** il tono più scuro dell'oro della scritta (#a8763f) sul nero della testata è
  circa 5:1, quindi anche «Studio» a 22 px supera 4,5:1. Con l'alto contrasto la scritta torna ai
  colori del testo, senza sfumatura.
- **Fuoco:** l'anello di 3 px è visibile e non tagliato, con lo stesso spazio prima del dado e
  dopo la scritta (4 px di imbottitura a destra, resi dal margine, così nulla si sposta).
- **Movimento:** l'alone usa le durate dell'app (`--dur-base`), che diventano 0 con il
  movimento ridotto.
- **Test:** `tests/visual01-directions.test.mjs` 13 su 13 (contratto di `brand.mjs`: classe,
  viewBox, `aria-hidden`, solo il testo «20», id diversi a ogni chiamata, icona con `xmlns`,
  colori scritti per esteso, 1,4 KB); Prettier senza rilievi.

### Licenza del marchio

Disegnato per questo progetto il 01/10/2026: i tracciati sono generati in codice dalla geometria
condivisa, nessun disegno di terzi. Segue la licenza del repository. Il carattere è Alegreya
(OFL), già incluso.

## Licenze e attribuzioni

### Icone (game-icons.net, CC BY 3.0)

Licenza: Creative Commons Attribution 3.0 Unported, <https://creativecommons.org/licenses/by/3.0/>.
Scaricate il 30/09/2026 da `https://api.iconify.design/game-icons/<nome>.svg`; autore verificato
sul repository <https://github.com/game-icons/icons> (percorso `<autore>/<nome>.svg`, albero del
30/09/2026 in `…/probe-bg3/game-icons-tree-2026-09-30.json`; copie scaricate in
`…/probe-bg3/game-icons-fetched/`). Modifica: il tracciato è identico; l'involucro `<svg>` è
riscritto secondo il contratto dell'app (`class="icon"`, `fill="currentColor"`, `aria-hidden`).
Il colore segue il testo.

**Attribuzione:** icone di Lorc, Delapouite, sbed, Skoll e Faithtoken da game-icons.net, CC BY 3.0.

Dal 01/10/2026 (dettagli rifiniti) `search` e `help` non vengono più da game-icons: sono disegnati
per questo progetto (sotto). Le loro righe sono tolte dalla tabella; erano `magnifying-glass` di
Lorc e `help` di sbed.

Nuove in questo giro (30/09/2026): `home`, `search`, `bell`, `settings`, `help`, `check`; cambiate
`note` (era `quill-ink`), `pen` (era `quill`), `ruler` (era `measure-tape`), perché disegna,
pianifica e misura si confondevano. Per `pencil` e `scroll-quill` l'Iconify API riscrive i numeri
del tracciato: il confronto col file dell'autore dà la stessa figura (copie in
`…/probe-bg3/game-icons-fetched/upstream/`).

| Nome nell'app | Icona game-icons           | Autore     | Pagina                                                                | sha256 del file scaricato                                          |
| ------------- | -------------------------- | ---------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `home`        | `house`                    | Delapouite | <https://game-icons.net/1x1/delapouite/house.html>                    | `798497e678559499e514f99f37bf7597f5b34630beea216d4d19dfee31e67340` |
| `bell`        | `ringing-bell`             | Lorc       | <https://game-icons.net/1x1/lorc/ringing-bell.html>                   | `5b7f3115db94e9b6e39339784d687373ed871fa7d54a9f47a90e264fb1ccdc12` |
| `settings`    | `cog`                      | Lorc       | <https://game-icons.net/1x1/lorc/cog.html>                            | `f13a1b21ebc0f0c700d00bb114efe387e95d44bce8ba63888045a6d84358721b` |
| `check`       | `check-mark`               | Delapouite | <https://game-icons.net/1x1/delapouite/check-mark.html>               | `1a839f00340eeb68a4db830ad87b3a7f45e936b2c1bda74931d89c29dbd2c0b1` |
| `person`      | `visored-helm`             | Lorc       | <https://game-icons.net/1x1/lorc/visored-helm.html>                   | `5d20ee418964af8cb5ac03867cd2d4993474d642b3ffe55b7d4e3ca2e2c41e2c` |
| `campaign`    | `tower-flag`               | Delapouite | <https://game-icons.net/1x1/delapouite/tower-flag.html>               | `a0db7698c1f6a6bf5dd85e0ff8aa870addd363527445c08cc569ef4c33217e41` |
| `book`        | `spell-book`               | Delapouite | <https://game-icons.net/1x1/delapouite/spell-book.html>               | `a67743880cf838f85816fb0945be06cb64365a6b73b8173f38099b58163124fe` |
| `note`        | `scroll-quill`             | Delapouite | <https://game-icons.net/1x1/delapouite/scroll-quill.html>             | `845dfa7840c7455e19fc668296525b7b8f8fd052dac89fdcc46b9e7162b84879` |
| `map`         | `treasure-map`             | Lorc       | <https://game-icons.net/1x1/lorc/treasure-map.html>                   | `79a4552770bf03bbd68f33db8b6bf7f40a6a788a7a979f656e2206a22955ce37` |
| `clock`       | `hourglass`                | Lorc       | <https://game-icons.net/1x1/lorc/hourglass.html>                      | `c0b5fd8d9cd14a7a312e798b099b5802a37bd6f994afca250a27ec4966377e3e` |
| `pen`         | `pencil`                   | Delapouite | <https://game-icons.net/1x1/delapouite/pencil.html>                   | `2f2e61f94a554c6b626429515ca5dcce331f8a0db186ac3c5b9294cf1fd11fb2` |
| `dice`        | `dice-twenty-faces-twenty` | Delapouite | <https://game-icons.net/1x1/delapouite/dice-twenty-faces-twenty.html> | `dffcf539def7bf7ffd8a2842ea8ecbc7e19ade0562c87669028a26345d76e05e` |
| `move`        | `walking-boot`             | Lorc       | <https://game-icons.net/1x1/lorc/walking-boot.html>                   | `0bc8a6759617babf91b86996c402ed3c710f1039b052f560b4c0092a5138868e` |
| `ruler`       | `path-distance`            | Delapouite | <https://game-icons.net/1x1/delapouite/path-distance.html>            | `be4d146204852f00765ef68a8a0880081f8f7e2eac28b47df539fd2548985bd3` |
| `flag`        | `flag-objective`           | Delapouite | <https://game-icons.net/1x1/delapouite/flag-objective.html>           | `ed2f8a1b8faf2ac36e7669fa2dc53ff11101bccef8ffdb80f04466bc5f16de2a` |
| `eye`         | `eyeball`                  | Lorc       | <https://game-icons.net/1x1/lorc/eyeball.html>                        | `f81759d0da8de286bb6baa1bf657ad68f4de600870bd2c076de2c3530f3fde87` |
| `shield`      | `shield`                   | sbed       | <https://game-icons.net/1x1/sbed/shield.html>                         | `18f4576c2e39c259d9f9440417cb772312e862dc1d167eacb29935d228d9a8c9` |
| `chat`        | `talk`                     | Skoll      | <https://game-icons.net/1x1/skoll/talk.html>                          | `9d00b56e97e5cb1f9f5d70a5bb5dd2ee85512ea1f042720c8993220c0b6221cc` |
| `swords`      | `crossed-swords`           | Lorc       | <https://game-icons.net/1x1/lorc/crossed-swords.html>                 | `b200f7e28238a7ab852b06ca6230efee47465a15c52ef6391cff8d28591a6dcf` |
| `sword`       | `broadsword`               | Lorc       | <https://game-icons.net/1x1/lorc/broadsword.html>                     | `fe5ce872eb1ee018b2614cb60d81546a86463f07bbbb1bcaf7bc6a11c0561e8b` |
| `light`       | `torch`                    | Delapouite | <https://game-icons.net/1x1/delapouite/torch.html>                    | `fc203513ab987b9a563959f3c1543eb45b28813404922ae9ae48285dacf33166` |
| `scroll`      | `scroll-unfurled`          | Lorc       | <https://game-icons.net/1x1/lorc/scroll-unfurled.html>                | `c1376ae791f8d79aa9c1f4153307515b7c1e95ac0ac37d9f8ab257833fecb0c1` |
| `cards`       | `card-random`              | Faithtoken | <https://game-icons.net/1x1/faithtoken/card-random.html>              | `09f6ee7d7ddbf595334a2ffcd57047b5978bf9fa088eba0de7339b59777e34ed` |
| `bag`         | `swap-bag`                 | Lorc       | <https://game-icons.net/1x1/lorc/swap-bag.html>                       | `22b9c492c39a8b426fe187992cb3fec37d7370a35c4a78543481af848b3797f4` |

`shield` esiste da due autori nel repository (badges, sbed): il tracciato scaricato coincide con
quello di sbed (confronto numerico del 30/09/2026).

### Ornamenti (disegnati per questo progetto)

Gli ornamenti Openclipart del primo giro (angoli 281797 e svolazzi 308075) sono stati tolti: erano
timbri separati negli angoli, la famiglia che l'owner ha già scartato. Al loro posto, file SVG
disegnati a mano il 30/09/2026 per questo progetto (i quattro prima degli ultimi sei il 02/10/2026, gli ultimi sei il 04/10/2026) (tracciati scritti da zero, nessuna immagine di
riferimento ricalcata o inclusa): copiano solo la grammatica di BG3 (filo con spine agli angoli,
arco in alto, filetti che si assottigliano, riccioli ai lati della striscia). Nessun diritto di
terzi; seguono la licenza del repository.

| File                                                                  | Cosa disegna                                                                                                                                                                                    | Imitato da (solo grammatica)                                                  | sha256                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `assets/frame-tl.svg`, `frame-tr.svg`, `frame-bl.svg`, `frame-br.svg` | angolo della cornice: spina, due uncini, arco a quarto di cerchio (quattro orientamenti dello stesso disegno)                                                                                   | `bg3-panels-subclass-select-steam.jpg`                                        | `b478f87e3fc62cc302101cf0bbad4d419b78dc6d7b13ba0d10ed83a366732a6b`, `6b272f023e59fb3daa7682881962f77722e79adbcbf81f7ec9dbea60b9f61846`, `89925185dc2f12b23f3cd3587d46e179d894d7778384b5658900e8db9a1a8bcd`, `c6cd19fde712e3b32d8db2278f1340641ec0a3df4bda88d0987f8eb4682ea85a` |
| `assets/frame-crest.svg`                                              | arco in alto al centro con due rombi                                                                                                                                                            | `bg3-panels-subclass-select-steam.jpg`                                        | `2ffa552bc1c19d8e9b52afbeef3cf7837e883a1ef2c67981f274fd0eca4b815a`                                                                                                                                                                                                             |
| `assets/rule-left.svg`, `rule-right.svg`                              | filetto sottile che si assottiglia e finisce in un ricciolo                                                                                                                                     | `bg3-sheet-examine-enemy.jpg` («~ Conditions ~»)                              | `3bcf5b43f3576ff3b8b97420b8756f67fa1dcc12bc08a41156f138f0959168f6`, `f940b7d8a65ab0c554ac0bb9e2b878f2428630e700964b713138e905ba4f414b`                                                                                                                                         |
| `assets/endcap-left.svg`, `endcap-right.svg`                          | ricciolo d'oro a metà altezza ai lati della striscia dei turni                                                                                                                                  | `bg3-table-crop-turn-order-strip.png`                                         | `efb62bdfba761015a8642130119253135ead87c79f67318ec2e88f5ecf62feec`, `0b773bf3d4631d6204bebfd82e9f6946aa9160e379a3c28b75d64c3a32d90cdb`                                                                                                                                         |
| `assets/hotbar-arch.svg`                                              | arco rialzato che porta la tavola delle risorse e la scheda dei dadi fin dentro il bordo superiore della barra (a destra lo stesso disegno specchiato)                                          | `bg3-table-crop-hotbar-4k.png`                                                | `adfdd949bb868f7a75b1babecfba2cb6a380f7c017bc60f046f004ce3ca38a63`                                                                                                                                                                                                             |
| `assets/endturn-runes.svg`                                            | anello di diciotto rune inventate, molto tenue (10 % di crema), dentro il disco di «Termina turno»                                                                                              | `bg3-table-crop-endturn.png` (solo l'idea di un anello inciso)                | `bd4563ab9f4b96e4f0f7612f1acd99fbdd178afe64594409ad564bf4f1aa6d32`                                                                                                                                                                                                             |
| `assets/grain.svg`                                                    | grana di pietra calda (rumore `feTurbulence`, circa 3 % di opacità) per il palco del Tavolo, le tavole, la barra e i dialoghi                                                                   | `bg3-table-hud-4k-exploration.jpg` (nessun pixel: solo «niente tinta piatta») | `99ed31ad4a39003a1f9d0ffd33b88de93b15d58381bfc3114a0e1497432bf731`                                                                                                                                                                                                             |
| `assets/home-torchlight.svg`                                          | pozze di luce di torcia (gradienti radiali arancio) disegnate sul riquadro 1672 × 941 della sala d'esempio dell'owner                                                                           | `bg3-home-main-menu-annotated.jpg`                                            | `d5499f714fc2491d1a735a83a3873b25cc9f9920aa084981dd53c9f4d4b11391`                                                                                                                                                                                                             |
| `assets/edge-crest.svg`                                               | piccolo stemma seduto sul filo dell'ispettore verso la mappa: un arco scuro bordato di bronzo e un rombo d'oro tra due trattini (04/10/2026)                                                    | `bg3-panels-subclass-select-steam.jpg` (pannello di destra)                   | `093dc8dd72e1dda7aa8705ce519765f3c6289532dc077b7b943a0fec059907b0`                                                                                                                                                                                                             |
| `assets/rule-knot.svg`                                                | filetto dorato con un nodo al centro: due trecce che si incrociano due volte attorno a un piccolo rombo d'oro, tra l'intestazione della scheda e la striscia delle caratteristiche (04/10/2026) | `bg3-sheet-character-panel.png` (filetto sotto le schede rotonde)             | `966d943fd36dda2d5dea154515969c25fdc2bac74e0de17bb777e7d7b242bcdd`                                                                                                                                                                                                             |
| `assets/rune-ring.svg`                                                | anello di rune nostre (tre cerchi, 24 tacche, otto segni angolari inventati) all'8 %, dietro la colonna del dado nell'avvio del combattimento (04/10/2026)                                      | `bg3-dice-crop-roll-panel-advantage.png` (motivo radiale nell'arco del tiro)  | `67081e7436fbde48160b4449d234f9ace65251478562f351533276eb605e346a`                                                                                                                                                                                                             |
| `assets/rule-gilt-left.svg`, `rule-gilt-right.svg`                    | il filetto con ricciolo dei titoli della scheda in oro (dal bronzo #B17D44 all'oro chiaro #D9BD7C sul ricciolo), con un piccolo rombo-gemma alla punta esterna (04/10/2026)                     | `bg3-sheet-examine-enemy.jpg` (filetti dorati ai lati del titolo)             | `a9b7603ebbfd003703029bba1c076e52c3af1304ba8c9f150454f421efb00b2d`, `f8bb0d951376c0e59ee17e96f38b54b76c0b517e17c302543edd48ddec9a1b0e`                                                                                                                                         |
| `assets/shield-keyline.svg`                                           | i due fili interni dello scudo della Classe Armatura (scuro #1A120B, poi bronzo #77542C), di 1 px a qualsiasi misura (04/10/2026)                                                               | `bg3-sheet-character-panel.png` (scudo «AC»)                                  | `aa24fc293dbb60d95dedb0e904bbe89f9fc89f3d9f594baafe44c85595d0f37b`                                                                                                                                                                                                             |
| `assets/header-node.svg`                                              | piccola gemma d'oro tra due rombi minori, al centro del filo d'oro sotto l'intestazione (04/10/2026)                                                                                            | `bg3-sheet-character-panel.png` (nodo del filetto sotto le schede rotonde)    | `97e384a226df4a802e34914f254ad507db904eed6cf93a13bb8eb346641173d6`                                                                                                                                                                                                             |

### Dipinti d'esempio (dell'owner)

Segnaposto per il confronto, non la scelta definitiva: vengono dal vecchio d20 Folio. Generati
dall'owner con gpt-image (credenziali C2PA nei master
`~/Workspace/Codex/d20-studio-visual-assets/masters/d20-folio/images_d20folio/`), WebP di d20 Folio
(main `5b7f2a8b`). Righe 29 e 39 di `candidates/MANIFEST.md`, verdetto SAFE. Copiati senza
modifiche; la sala d'armi è virata al freddo solo dal foglio di stile. La scrivania a lume di
candela del primo giro (`home-plate.webp`) è stata tolta: con le schede sopra ricordava il vecchio
d20 Folio.

| File                         | Candidato                       | Prompt master   | Byte   | sha256                                                             |
| ---------------------------- | ------------------------------- | --------------- | ------ | ------------------------------------------------------------------ |
| `assets/home-hall.webp`      | `plates/roster-scene.webp`      | `PROMPT_20.png` | 83 860 | `3253af93fab9b4194236c2788c6cd8c639910517ac6f121041fe04324af36319` |
| `assets/campaign-plate.webp` | `plates/campaign-backdrop.webp` | `PROMPT_16.png` | 98 712 | `025a6ad7d9ae94e705dd470f1ab3361634436a0ad8ed4bc8c8c226ae90b20e07` |

I ritratti e la mappa d'esempio sono quelli condivisi (`directions/sample.css`,
`assets/PROVENANCE.json`): questa opzione ne disegna solo cornici, forme e colori.

### Icone disegnate per questo progetto

`search` (una lente piena con un riflesso inciso e il manico) e `help` (un disco pieno con il
«?» e il punto incisi) sono disegnati il 01/10/2026 per questo progetto, perché la fila dei
servizi della testata sia tutta di icone piene come la ruota dentata e l'elmo (rilievo D19 dei
dettagli). Tracciati calcolati da zero in codice (cerchi, un arco con un tratto di spessore
costante, il manico come rettangolo ruotato), nessuna immagine di riferimento ricalcata; il
generatore è `…/visual-01/fix-bg3/glyphs/make-glyphs.mjs` (sha256 `cf2ac82d0fc40c610e8cf16c90f801b8e30cf3b051c4a1855ca57ce954616d24`),
le prove a 20 e 160 px accanto. I buchi sono tagliati dal verso dei tracciati (regola nonzero),
in un solo `<path>` come le altre icone. Seguono la licenza del repository.

`assets/scene.svg` (293 byte, sha256 `38207410bddb014350b2a7f1ebbdd4a1eaea73b48754b64d00ff1cdf1cf8a811`)
è il disegno della scheda «Scena»: un paesaggio in una cornice piena (due monti e un sole), scritto
a mano il 01/10/2026 per questo progetto nel quadro di 512 unità delle altre icone (un rettangolo
arrotondato, il suo vano, un poligono e un cerchio, i buchi tagliati dal verso dei tracciati),
nessuna immagine di riferimento ricalcata; le prove a 20, 24 e 96 px in
`…/visual-01/polish6-bg3/glyph/`. Il foglio di stile lo usa come maschera nel colore del testo,
perché il gancio delle icone riceve solo il nome («map», lo stesso del collegamento «Mappa»).
Segue la licenza del repository.

### Disegni nel foglio di stile

La spunta delle caselle (un tracciato SVG di tre punti dentro `direction.css`) è disegnata per
questo progetto il 01/10/2026; segue la licenza del repository.

La losanga d'oro agli angoli dei menu contestuali (un tracciato SVG di quattro punti in
`--bg3-corner-gem`) e il segno «II» dei separatori della barra (due gradienti lineari) sono
disegnati per questo progetto il 02/10/2026 nello stesso file; seguono la licenza del
repository.

### Caratteri

Solo **Alegreya** (SIL Open Font License 1.1), già incluso in `design/blueprint/assets/fonts/alegreya/`
con il suo `OFL.txt` (Fontsource 5.3.0). Nessuna nuova famiglia aggiunta da questa opzione. Il browser
scarica solo i file latini (normale e corsivo) quando l'opzione è attiva.
