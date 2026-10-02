# Opzione 4 · Owlbear Rodeo — fonti, coppie e licenze

Direzione `owlbear` della «Scelta 1 — Direzione» (fase C, visual-01, I-248). Data: 30/09/2026
(ultima revisione: 01/10/2026 — cinque stati in più, scala unica di spazi e testi per I-250,
punti aperti della verifica indipendente, poi un giro di correzioni dopo la seconda critica
indipendente: spazi dell'app sulla scala, allineamenti, campi e pulsanti tutti uguali; poi il
giro di coerenza dopo la terza verifica; poi il secondo giro di rifinitura dopo la quarta
verifica; poi il terzo giro di rifinitura dopo la quinta verifica; poi il quarto giro di
rifinitura dopo la sesta verifica, vedi «Coerenza (I-250)» e «Controlli fatti»; infine il
marchio proprio della direzione per I-251, vedi «Marchio»; poi il giro dei dettagli dopo la
critica indipendente sui dettagli per I-252, vedi «Dettagli rifiniti»; poi il sesto giro di
rifinitura dopo la verifica del marchio e dei dettagli, vedi «Coerenza (I-250)» e «Controlli
fatti»).
Vale solo per il **tema scuro**: con il tema chiaro l'app resta com'è oggi (anche le icone). Le
immagini di riferimento stanno fuori dal repository, in
`~/Workspace/Codex/d20-studio-visual-assets/references/foundry-owlbear/` (solo consultazione): qui
dentro non c'è nessun pixel, carattere, texture o logo di Owlbear Rodeo.

## In tre righe

1. Copia Owlbear Rodeo 2: fondo blu notte (#1e2231), un solo accento lavanda (#bb99ff), pannelli
   «di vetro» che galleggiano sulla mappa senza bordi, angoli arrotondati a 16 px e il carattere
   Roboto, con pulsanti in maiuscoletto come in Material-UI; spazi, testi, angoli e altezze
   seguono una sola scala, quella di Material-UI che Owlbear usa.
2. Al Tavolo la mappa resta libera e tutto il resto fluttua: la colonna degli strumenti e i
   comandi della mappa come pillole di vetro, le pedine rotonde con anelli colorati, l'ordine dei
   turni come l'elenco «Initiative Tracker», la barra delle azioni come il «dock» e «Termina
   turno» come la pillola lavanda dei dadi.
3. Si sente leggera, tecnica e ordinata, più da strumento che da libro di fantasia: l'Inizio
   somiglia alla pagina «Rooms» di Owlbear; la Scheda, che Owlbear non ha, prende i suoi pannelli,
   elenchi, interruttori e gruppi di pulsanti.

## Elemento | Prodotto copiato | Fonte

Le fonti sono file della cartella di riferimento (URL originale tra parentesi, dal `manifest.md`)
oppure codice e documentazione citati nel `facts.md` della stessa cartella.

| Elemento                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Prodotto copiato                                                                                | Fonte                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colori di base: fondo #1e2231, carta #222639, schede #2d3142 (carta + 5 % di bianco), menu #3d4051 (+ 12 %)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Owlbear Rodeo 2, tema scuro                                                                     | `facts.md` 1B «Dark palette» (bundle di produzione `index-BXTDwbIo.js`, tema `ff`); campioni in `owlbear-home-rooms-list.jpg` (<https://docs.owlbear.rodeo/assets/images/section-28cdf5333088f556117554199ca624ad.jpg>) e `owlbear-map-colored-rings-extension.jpg` (<https://raw.githubusercontent.com/owlbear-rodeo/colored-rings/main/docs/header.jpg>)                                                                                                                        |
| Un solo accento lavanda #bb99ff (strumento attivo, schede, interruttori, pulsanti di testo e principali)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Owlbear Rodeo 2                                                                                 | `facts.md` 1B e 2B; `owlbear-dialog-grid-controls-popover.jpg` (<https://docs.owlbear.rodeo/assets/images/sceneControls-30b9def37cea885bb9f605e8a5bba59d.jpg>)                                                                                                                                                                                                                                                                                                                    |
| Testi: bianco, grigio al 70 %, divisori al 12 %                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Owlbear 2 (valori MUI predefiniti)                                                              | `facts.md` 1B «Text colours»                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Pannelli di vetro: navy traslucido (60–75 %), sfocatura 10–30 px, velo bianco 5–8 %, nessun bordo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Owlbear 2                                                                                       | `facts.md` 1B «Glass panels» (funzione `T7` del bundle)                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Ombre morbide (livelli MUI 1, 8, 24)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Owlbear 2 (Material-UI)                                                                         | `facts.md` 1B «Glass panels» (ombra = `shadows[elevation]`)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Raggio 16 px ovunque, pulsanti icona rotondi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Owlbear 2                                                                                       | `facts.md` 2B (`shape.borderRadius: 16`); `owlbear-map-room-players-toolbar-dock.jpg` (<https://docs.owlbear.rodeo/assets/images/encounter-93bc3afe3d522f59e3c1669c877ccaf9.jpg>)                                                                                                                                                                                                                                                                                                 |
| Carattere Roboto per tutto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Owlbear 2                                                                                       | `facts.md` «Typefaces» (Roboto 300–700 nel CSS dell'app)                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Pulsanti in maiuscoletto con spaziatura (come il maiuscolo di MUI; le parole restano scritte come sono)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Owlbear 2                                                                                       | `owlbear-dialog-join-request.jpg` (<https://docs.owlbear.rodeo/assets/images/joinRoom-82d340f00e2c8f65cfb887c48c509448.jpg>), `owlbear-dialog-player-permissions.jpg` (<https://docs.owlbear.rodeo/assets/images/dialog-a98a3928c12a900e7d0980f761c1282d.jpg>)                                                                                                                                                                                                                    |
| Tre pulsanti: principale pieno lavanda con il testo scuro, uno solo per superficie (dal giro dei dettagli); «a testo» (Riposa, Scene, Ultima mossa, + Condizione…) in lavanda; neutro contornato bianco                                                                                                                                                                                                                                                                                                                                                                                                                                        | Owlbear 2                                                                                       | `owlbear-dialog-join-request.jpg` (<https://docs.owlbear.rodeo/assets/images/joinRoom-82d340f00e2c8f65cfb887c48c509448.jpg>) (DENY ENTRY / ADMIT); `owlbear-dialog-extensions-modal.jpg` (<https://docs.owlbear.rodeo/assets/images/extensionsModal-729ece4cdde31e30a83bc70e30927e34.jpg>) (LEARN MORE + ADD); `owlbear-dialog-grid-controls-popover.jpg` (<https://docs.owlbear.rodeo/assets/images/sceneControls-30b9def37cea885bb9f605e8a5bba59d.jpg>) (RESET VIEW, SYNC VIEW) |
| Campi e menu a tendina a pillola contornati                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Owlbear 2                                                                                       | `owlbear-dialog-grid-controls-popover.jpg` (<https://docs.owlbear.rodeo/assets/images/sceneControls-30b9def37cea885bb9f605e8a5bba59d.jpg>); `owlbear-home-create-room-dialog.jpg` (<https://docs.owlbear.rodeo/assets/images/create-0b68e1c69fa996b82234d532de036b52.jpg>)                                                                                                                                                                                                        |
| Gruppi di pulsanti a segmenti (Gioco/Modifica, Dadi digitali/fisici, Indebolimento 1–6), segmento scelto più chiaro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Owlbear 2                                                                                       | `owlbear-dialog-grid-controls-popover.jpg` (Grid Type, Line Type)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Interruttori: uno solo ovunque (effetti, offline, ispirazione, «Il DM può modificare»): binario 42 × 26 con contorno di 1 px, pallino di 24 px alto quanto il binario; acceso, pallino lavanda su binario lavanda; etichetta 16 px regolare a 8 px dal binario                                                                                                                                                                                                                                                                                                                                                                                 | Owlbear 2 (MuiSwitch del bundle)                                                                | `owlbear-dialog-grid-controls-popover.jpg` (Snapping); `owlbear-home-create-room-dialog.jpg`                                                                                                                                                                                                                                                                                                                                                                                      |
| Pagine principali e schede come voci selezionabili: testo normale, voce aperta su pillola lavanda al 16 % con il testo lavanda chiaro #c9adff (un solo aspetto «scelto» anche per sotto-schede, pagine del dock, binario e chip)                                                                                                                                                                                                                                                                                                                                                                                                               | Owlbear 2                                                                                       | `owlbear-dialog-extensions-modal.jpg` (<https://docs.owlbear.rodeo/assets/images/extensionsModal-729ece4cdde31e30a83bc70e30927e34.jpg>) («All Extensions»); `owlbear-dialog-assets-manager.jpg` (<https://docs.owlbear.rodeo/assets/images/mapsTab-07063bfb5aafc814cd223fae12b1d414.jpg>) («Default», categorie)                                                                                                                                                                  |
| Etichette e piccoli numeri come «chip» (pillole su bianco 8–16 %)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Owlbear 2                                                                                       | `owlbear-dialog-player-permissions.jpg` (Create / Update / Delete)                                                                                                                                                                                                                                                                                                                                                                                                                |
| Finestre di dialogo: carta + 5 %, raggio 16, titolo grande bianco, nessuna riga                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Owlbear 2                                                                                       | `owlbear-dialog-player-permissions.jpg`, `owlbear-home-create-room-dialog.jpg`, `owlbear-dialog-join-request.jpg`                                                                                                                                                                                                                                                                                                                                                                 |
| Menu contestuali, menu della pedina e suggerimenti come vetro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Owlbear 2                                                                                       | `owlbear-map-token-context-menu.jpg` (<https://docs.owlbear.rodeo/assets/images/contextMenu-c627464eeb09225b41f0be495965d2e7.jpg>); `owlbear-map-colored-rings-extension.jpg` (<https://raw.githubusercontent.com/owlbear-rodeo/colored-rings/main/docs/header.jpg>)                                                                                                                                                                                                              |
| Avvisi (sessione non avviata, messaggi) come la «snackbar»: carta + 10 % neutra, raggio 16, messaggio e poi le azioni come pulsanti di testo lavanda su una riga; un piccolo punto ambra se è un avviso (lo dicono anche le parole)                                                                                                                                                                                                                                                                                                                                                                                                            | Owlbear 2                                                                                       | `facts.md` 2B «Snackbars»; azioni come in `owlbear-dialog-join-request.jpg`                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Inizio**: schede di sezione impilate su navy, titoli grandi bianchi non in grassetto, testo d'aiuto grigio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Owlbear 2, pagina Rooms                                                                         | `owlbear-home-rooms-list.jpg` (<https://docs.owlbear.rodeo/assets/images/section-28cdf5333088f556117554199ca624ad.jpg>)                                                                                                                                                                                                                                                                                                                                                           |
| **Inizio**: «Continua a giocare» nell'ordine della sezione Rooms: titolo (la scena), riga d'aiuto grigia, l'immagine della stanza che riempie tutto il riquadro (896 × 288, raggio 16), nome della campagna in basso a sinistra su sfumatura scura                                                                                                                                                                                                                                                                                                                                                                                             | Owlbear 2, pagina Rooms                                                                         | `owlbear-home-rooms-list.jpg` (Icewind Dale, Ravenloft, pozzo #232639); `facts.md` 4B (sfumatura, raggio 16)                                                                                                                                                                                                                                                                                                                                                                      |
| **Inizio**: «Entra al Tavolo» a tutta larghezza, pieno lavanda (l'unico principale della pagina); «Apri campagna» subito sotto come testo lavanda                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Owlbear 2 («CREATE A NEW ROOM»)                                                                 | `owlbear-home-rooms-list.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Inizio**: immagine del riquadro velata di blu-lavanda (l'ambra dell'immagine d'esempio diventa un crepuscolo freddo, come le stanze di Owlbear)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Owlbear 2 (un solo accento, toni freddi)                                                        | `owlbear-home-rooms-list.jpg`; `facts.md` 1B tratto 2                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Scheda**: caratteristiche in una sola striscia divisa in sei segmenti; riquadri come schede carta; numeri in chip                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Owlbear 2 (pannelli e moduli)                                                                   | `owlbear-dialog-player-permissions.jpg` (chip), `owlbear-dialog-grid-controls-popover.jpg`                                                                                                                                                                                                                                                                                                                                                                                        |
| **Scheda**: tutte le etichette grigie, stessa misura, senza maiuscoletto (anche FOR, DES, COS, INT, SAG, CAR)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Owlbear 2                                                                                       | `owlbear-dialog-grid-controls-popover.jpg` («Grid Size», «Line Width»)                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Scheda**: righe di Tiri salvezza e Abilità in un pozzo più scuro dentro la scheda, con divisori                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Owlbear 2                                                                                       | `owlbear-dialog-player-permissions.jpg` (<https://docs.owlbear.rodeo/assets/images/dialog-a98a3928c12a900e7d0980f761c1282d.jpg>) (pozzo dell'elenco)                                                                                                                                                                                                                                                                                                                              |
| **Scheda**: competenza come ✓ lavanda (Material «check»), maestria come doppio ✓ («done_all»), niente se non competente — una forma, non un pallino                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Owlbear 2 (chip con ✓)                                                                          | `owlbear-dialog-player-permissions.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Scheda**: barra dei punti ferita verde, come al Tavolo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Owlbear 2 (colore «success» di MUI)                                                             | `facts.md` 2B (tavolozza MUI, colore «success»); coerenza con le barre verdi del nostro Tavolo (dock, pedine, gruppo)                                                                                                                                                                                                                                                                                                                                                             |
| **Scheda**: ritratto rotondo con bordo scuro («pog»)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Owlbear 2 (pedine)                                                                              | `owlbear-map-room-players-toolbar-dock.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Tavolo**: colonna strumenti come la barra verticale di vetro, icone bianche, strumento attivo lavanda (con un cerchio chiaro, così non è solo colore)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Owlbear 2                                                                                       | `owlbear-map-room-players-toolbar-dock.jpg`; `owlbear-map-mobile-responsive-layout.jpg` (<https://www.owlbear.rodeo/assets/phone-ClMaMWZq.jpg>, via Wayback)                                                                                                                                                                                                                                                                                                                      |
| **Tavolo**: i comandi sulla mappa (sessione, carta X, rallenta, alza la mano, gruppo, interfaccia) in UNA sola pillola di vetro di pulsanti rotondi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Owlbear 2 (pillola in alto a sinistra; pillola di due pulsanti in alto a destra)                | `owlbear-map-room-players-toolbar-dock.jpg`, `owlbear-map-initiative-tracker-extension.jpg` (<https://raw.githubusercontent.com/owlbear-rodeo/initiative-tracker/main/docs/header.jpg>), `owlbear-map-mobile-responsive-layout.jpg`                                                                                                                                                                                                                                               |
| **Tavolo**: pedine rotonde con ombra e nome su pillola scura                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Owlbear 2                                                                                       | `owlbear-map-room-players-toolbar-dock.jpg` («Goblin 1»)                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Tavolo**: anelli colorati: azzurro per gli alleati, rosso e tratteggiato per i nemici, sulla mappa e nell'ordine dei turni (forma, non solo colore)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Owlbear 2 + estensione Colored Rings                                                            | `owlbear-map-colored-rings-extension.jpg`; `facts.md` 1B (colori #44e0f1 e #ff4d4d in `src/colors.ts`)                                                                                                                                                                                                                                                                                                                                                                            |
| **Tavolo**: selezione col mouse come anello blu sottile; il focus da tastiera sulla pedina resta l'anello tratteggiato nel colore di focus (lavanda chiaro, almeno 3:1 sulla pietra), perché in Owlbear le pedine non hanno focus da tastiera; maniglie di rotazione e dimensione come bolle rotonde scure #3E4050 con bordo bianco                                                                                                                                                                                                                                                                                                            | Owlbear 2                                                                                       | `owlbear-map-token-context-menu.jpg` (<https://docs.owlbear.rodeo/assets/images/contextMenu-c627464eeb09225b41f0be495965d2e7.jpg>); `owlbear-map-colored-rings-extension.jpg`; `facts.md` 1B «Transform handles» e #3869E7                                                                                                                                                                                                                                                        |
| **Tavolo**: segno del turno sotto la pedina ridotto a un anello lavanda sottile tratteggiato, senza alone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Owlbear 2 (il turno si vede solo nell'elenco Initiative)                                        | `owlbear-map-initiative-tracker-extension.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Tavolo**: griglia a linee bianche tratteggiate, bianco al 50 %                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Owlbear 2                                                                                       | `owlbear-map-room-players-toolbar-dock.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Tavolo**: muri quasi bianchi, porte lavanda, bordo della scena bianco tratteggiato (niente ambra: un solo accento)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Owlbear 2                                                                                       | `facts.md` 1B tratto 2                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Tavolo**: porte come maniglie rotonde scure con simbolo bianco                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Owlbear 2 (maniglie di rotazione e dimensione)                                                  | `owlbear-map-colored-rings-extension.jpg`; `facts.md` 1B «Transform handles»                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Tavolo**: ordine dei turni come l'elenco Initiative Tracker (vetro, righe da 40 px a tutta larghezza, divisori diritti, turno attuale su banda lavanda, scorre se i combattenti sono tanti) quando lo schermo è almeno 1440 × 860; sotto questa misura, la riga di schede dei turni in alto, come schede di vetro                                                                                                                                                                                                                                                                                                                            | Owlbear 2 + estensione Initiative Tracker                                                       | `owlbear-map-initiative-tracker-extension.jpg` (<https://raw.githubusercontent.com/owlbear-rodeo/initiative-tracker/main/docs/header.jpg>); `facts.md` 1B (riga «selected»)                                                                                                                                                                                                                                                                                                       |
| **Tavolo**: barra delle azioni come il «dock» in basso: un solo pannello di vetro, ritratto rotondo, pagine come il chip «Default», gruppi (armi, incantesimi, comuni) separati da una linea sottile                                                                                                                                                                                                                                                                                                                                                                                                                                           | Owlbear 2                                                                                       | `owlbear-map-room-players-toolbar-dock.jpg` (dock in basso)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Tavolo**: comandi del turno come pulsanti rotondi; «Termina turno» come pillola lavanda piena (56 px sul computer, 40 px sul telefono), su una riga                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Owlbear 2 + estensione Dice («ROLL»)                                                            | `owlbear-map-dice-extension-rolls.jpg` (<https://raw.githubusercontent.com/owlbear-rodeo/dice/main/docs/rolls.jpg>)                                                                                                                                                                                                                                                                                                                                                               |
| **Tavolo**: vassoio dei dadi (tasti dado rotondi, lancio lavanda, risultato su vassoio scuro con numero grande)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Owlbear 2 + estensione Dice                                                                     | `owlbear-map-dice-extension-tray.jpg` (<https://raw.githubusercontent.com/owlbear-rodeo/dice/main/docs/header.jpg>); `owlbear-map-room-scene-with-dice.jpg` (<https://docs.owlbear.rodeo/assets/images/final-5e5e1e955688c813dda5f82c12d370d7.jpg>)                                                                                                                                                                                                                               |
| **Tavolo**: scala e suggerimenti come il chip «5ft»                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Owlbear 2                                                                                       | `owlbear-map-room-players-toolbar-dock.jpg`; `owlbear-dialog-grid-controls-popover.jpg`                                                                                                                                                                                                                                                                                                                                                                                           |
| **Tavolo**: pannello laterale come scheda che galleggia; binario delle schede come pillola verticale al bordo destro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Owlbear 2 (popover e barra destra)                                                              | `owlbear-map-room-players-toolbar-dock.jpg`, `owlbear-dialog-extensions-modal.jpg`                                                                                                                                                                                                                                                                                                                                                                                                |
| **Tavolo, telefono**: gli stessi pezzi di vetro sopra la mappa; pulsante strumenti rotondo; avvisi ai piedi della mappa, sopra la pillola dello zoom (dal 01/10); barra in basso su carta con angoli superiori arrotondati                                                                                                                                                                                                                                                                                                                                                                                                                     | Owlbear 2                                                                                       | `owlbear-map-mobile-responsive-layout.jpg` (<https://www.owlbear.rodeo/assets/phone-ClMaMWZq.jpg>, via Wayback)                                                                                                                                                                                                                                                                                                                                                                   |
| Icone: glifi pieni arrotondati di Material, anche per i pochi disegnati dall'app (trova la mia pedina, centra, carta X, rallenta, alza la mano, «Mosse», freccia del menu)                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Owlbear 2 (icone MUI «Rounded»)                                                                 | `owlbear-map-room-players-toolbar-dock.jpg`, `owlbear-map-token-context-menu.jpg`; `facts.md` 1B; file `icons.mjs` e `assets/icons/`                                                                                                                                                                                                                                                                                                                                              |
| **Una sola scala (I-250)**: spazi 4/8/12/16/20/24/32/40/48 px, applicati anche alle imbottiture, ai margini e agli spazi dell'app sui pezzi che questa direzione veste (96 % dei valori misurati sulla griglia di 4 px); testi 12/14/16/18/20/24/34 px con interlinee intere (20/24/32/40 px); angoli 16 (righe dense 12, pillole, tondo; 2 per la casella di spunta); bordi 1/2/3 px; altezze 24/40/48/56 px. Anche le misure dell'app (`--text-*`, `--radius-*`) sono portate sulla stessa scala                                                                                                                                             | Owlbear Rodeo 2 (tema Material-UI: spaziatura 8 px, tipografia MUI v5, `shape.borderRadius` 16) | `facts.md` 1B, 2B, 4B; misure su `owlbear-dialog-assets-manager.jpg` (titolo h6, testo body2, pulsante 14 px), `owlbear-home-rooms-list.jpg` (titolo h5, aiuto body2), `owlbear-dialog-grid-controls-popover.jpg`                                                                                                                                                                                                                                                                 |
| Pulsanti tutti alti 40 px; una sola misura per larghezza: maiuscoletto 20 px (= maiuscole di 14 px come MUI) dal computer al tablet, 18 px sul telefono; solo due punti usano sempre il pulsante piccolo di MUI, come fa MUI: le azioni dello snackbar sulla mappa e «Tiri e risultati» nella pillola dei dadi sopra il dock. Pulsanti di testo con l'imbottitura di MUI (8 px per lato, nessun contorno) ovunque; quando aprono un blocco stanno 8 px fuori, così l'etichetta parte sul bordo del testo sopra. Campi a pillola alti 40 px (misura «small» di MUI), testo sempre 16 px (body1) con 12 px dentro; etichette delle caselle 16 px | Owlbear 2 (MUI)                                                                                 | `facts.md` 2B; `owlbear-dialog-grid-controls-popover.jpg`, `owlbear-dialog-join-request.jpg`                                                                                                                                                                                                                                                                                                                                                                                      |
| Elenchi dentro schede e finestre in un pozzo più scuro (#222639, raggio 16), righe divise dal divisore al 12 %, sottotitoli grigi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Owlbear 2                                                                                       | `owlbear-dialog-player-permissions.jpg`, `owlbear-map-initiative-tracker-extension.jpg`, `owlbear-dialog-assets-manager.jpg` («Collections»)                                                                                                                                                                                                                                                                                                                                      |
| Avvisi dentro schede e finestre come striscia informativa: un gradino più chiara, raggio 16, testo grigio, azione come pulsante di testo lavanda                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Owlbear 2, gestore Assets                                                                       | `owlbear-dialog-assets-manager.jpg` («Maps are the base layer… LEARN MORE»)                                                                                                                                                                                                                                                                                                                                                                                                       |
| Caselle di spunta MUI: quadrato con contorno bianco al 70 %, piene lavanda con spunta scura                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Owlbear 2 (MUI Checkbox)                                                                        | `facts.md` 2B; `owlbear-dialog-grid-controls-popover.jpg` (stesso accento)                                                                                                                                                                                                                                                                                                                                                                                                        |
| Filtri come chip pieni (pillola su bianco 8 %, quello scelto con il velo lavanda e la ✓ davanti), anche in Magie e Inventario                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Owlbear 2                                                                                       | `owlbear-dialog-player-permissions.jpg`, `owlbear-dialog-assets-manager.jpg`                                                                                                                                                                                                                                                                                                                                                                                                      |
| Etichette, intestazioni di tabella e numeri delle caselle come in MUI: etichette grigie (intestazioni bianche) in minuscolo, senza maiuscoletto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Owlbear 2 (MUI)                                                                                 | `owlbear-dialog-grid-controls-popover.jpg` («Grid Size», «Line Width»)                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Tavolo in esplorazione**: gli stessi pezzi di vetro del combattimento (scheda della scena, colonna strumenti, pillola dei comandi, zoom, chip della scala), il dock in basso, il pannello «Creatura» come scheda che galleggia                                                                                                                                                                                                                                                                                                                                                                                                               | Owlbear 2, stanza                                                                               | `owlbear-map-room-players-toolbar-dock.jpg`, `owlbear-map-room-scene-with-dice.jpg`, `owlbear-map-mobile-responsive-layout.jpg`                                                                                                                                                                                                                                                                                                                                                   |
| **Scheda · Magie**: numeri da incantatore in una striscia scura divisa; «Preparazione non modificabile ora» come striscia informativa; livelli come chip; ogni livello un sottotitolo grigio sopra il suo pozzo di righe; V/S e stato come chip piccoli; «Lancia» contornato, «Dettagli» e «Confronta» pulsanti di testo                                                                                                                                                                                                                                                                                                                       | Owlbear 2 (elenchi, finestre, gestore Assets)                                                   | `owlbear-dialog-player-permissions.jpg`, `owlbear-dialog-assets-manager.jpg`                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Scheda · Inventario**: come il gestore Assets — titolo, «Aggiungi oggetto» contornato come gli altri pulsanti (il principale della pagina è «Vai al Tavolo»), ricerca a pillola, filtri come chip; peso, sintonia, monete e set d'armi nella striscia divisa; «Addosso» come sottotitolo nel pozzo; righe con riquadro icona arrotondato (glifo bianco), chip e riga grigia; colonne Qtà, Peso e Cariche come didascalie grigie                                                                                                                                                                                                              | Owlbear 2, gestore Assets                                                                       | `owlbear-dialog-assets-manager.jpg`, `owlbear-dialog-player-permissions.jpg`                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Finestra dell'iniziativa**: finestra MUI (carta + 5 %, titolo h6, nessuna riga); partecipanti come l'elenco Initiative nel pozzo (nome a sinistra, totale in numeri bianchi a destra, righe divise); d20 in un campo a pillola; «Tira l'iniziativa» come testo lavanda; la chiamata ai giocatori come striscia informativa; sul telefono le due azioni a tutta larghezza, una per riga                                                                                                                                                                                                                                                       | Owlbear 2 + estensione Initiative Tracker                                                       | `owlbear-map-initiative-tracker-extension.jpg`, `owlbear-home-create-room-dialog.jpg`, `owlbear-dialog-join-request.jpg`                                                                                                                                                                                                                                                                                                                                                          |
| **Menu della pedina**: a due livelli — il nome della creatura sulla striscia scura (#1e2231), i comandi sulla superficie più chiara del menu (#3E404F), righe dense (raggio 12), contatori e tasti come chip, campo dei punti ferita a pillola                                                                                                                                                                                                                                                                                                                                                                                                 | Owlbear 2 + estensione Colored Rings                                                            | `owlbear-map-colored-rings-extension.jpg`, `owlbear-map-token-context-menu.jpg`; `facts.md` 1B «Token context menu»                                                                                                                                                                                                                                                                                                                                                               |
| **Tavolo, telefono**: l'avviso «Sessione non avviata» ai piedi della mappa, sopra la pillola dello zoom (dove Material mette lo snackbar su telefono): non copre più i ritratti dei turni né le pedine                                                                                                                                                                                                                                                                                                                                                                                                                                         | Owlbear 2 (MUI Snackbar)                                                                        | `facts.md` 2B «Snackbars»                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Tavolo (DM)**: i punti di viaggio come le porte — bolla rotonda scura con simbolo bianco e anello bianco (prima il simbolo aveva lo stesso colore della bolla)                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Owlbear 2 (maniglie)                                                                            | `owlbear-map-colored-rings-extension.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Scheda**: ogni casella della fascia (caratteristiche, Competenza, Movimento, Ispirazione) e del riepilogo (Iniziativa, CA, Difese) con la stessa grammatica: 12 px sopra, 8 px ai lati, etichetta sulla riga alta, numero al centro sulla stessa linea delle altre caselle, piede (punteggio, «Camminare») in basso; gruppi Gioco/Modifica e Dadi alti 40 px                                                                                                                                                                                                                                                                                 | Owlbear 2 (MUI: una sola grammatica per riquadri e gruppi)                                      | `owlbear-dialog-grid-controls-popover.jpg`; `facts.md` 2B                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Scheda**: righe di Tiri salvezza e Abilità con l'etichetta centrata nella riga; titoli, testi, pulsanti e valori a 16 px dal bordo della scheda (il pozzo sporge 8 px e rientra le righe di 8 px)                                                                                                                                                                                                                                                                                                                                                                                                                                            | Owlbear 2 (MUI List: ListItemButton margine 4px 8px, CardContent 16 px)                         | `owlbear-dialog-player-permissions.jpg`; `facts.md` 1B                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Scheda · Magie**: i numeri da incantatore come la striscia delle caratteristiche (centrati, quattro per riga, etichetta grigia 14 px, numero 24 px)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Owlbear 2                                                                                       | `owlbear-dialog-player-permissions.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Scheda · Inventario**: la striscia in due colonne, così «Gestisci sintonia», «Gestisci monete», «Cambia set» e «Regola d'ingombro» stanno su una riga                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Owlbear 2 (MUI: i pulsanti non vanno a capo)                                                    | `owlbear-dialog-assets-manager.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Tavolo**: nel pannello «Creatura» «Scheda completa», «Inventario» e «Riposa» come pulsanti contornati a tutta larghezza, uno per riga; «Cura»/«Danno» verdi e rossi e il campo dei punti ferita a pillola come sulla scheda                                                                                                                                                                                                                                                                                                                                                                                                                  | Owlbear 2 («CREATE» a tutta larghezza; campi O10)                                               | `owlbear-home-create-room-dialog.jpg`, `owlbear-dialog-grid-controls-popover.jpg`                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Tavolo**: chip del dock alti 40 px come le schede «Azioni»/«Barra rapida» accanto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Owlbear 2 (dock)                                                                                | `owlbear-map-room-players-toolbar-dock.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Menu della pedina**: largo 360 px, ogni voce su una riga sola anche con il tasto a destra                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Owlbear 2 (menu MUI)                                                                            | `owlbear-map-token-context-menu.jpg`; `facts.md` 1B                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Inizio**: un solo spazio di 24 px fra tutte le schede; «Prossimo appuntamento» alto quanto la scheda della stanza, con le azioni in fondo; sul telefono il nome della scena a 24 px come «Prossimo appuntamento» e il testo a 16 px dal bordo                                                                                                                                                                                                                                                                                                                                                                                                | Owlbear 2, pagina Rooms (MUI Card, CardActions)                                                 | `owlbear-home-rooms-list.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Ogni riepilogo a scomparsa (`summary`) e il valore dei punti ferita della scheda hanno l'anello di focus di 3 px; il pannello laterale lascia 16 px quando porta in vista un comando col tasto Tab                                                                                                                                                                                                                                                                                                                                                                                                                                             | regole del progetto (focus visibile di 3 px)                                                    | `code-map.md` §0.4                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Inizio e Scheda**: un solo spazio di 24 px fra le schede a ogni larghezza, anche sul telefono e sotto la piega (Inizio: stanza, appuntamento, personaggio, resoconto, campagne, discussioni, tavoli, «Primi passi»; Scheda: Azioni, offline, azioni personalizzate, Tiri, Reazioni, «Chi può modificare la scheda»); «Primi passi» chiuso è una scheda come le altre (senza bordo, ombra morbida, 32 px dal bordo), con l'etichetta grigia in minuscolo                                                                                                                                                                                      | Owlbear 2, pagina Rooms (MUI Card, Container)                                                   | `owlbear-home-rooms-list.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Un titolo per tipo di scheda: ogni scheda dell'Inizio e della Scheda h5 24/32 regolare, 16 px sopra il contenuto, qualunque sia il suo tag; le schede elenco della colonna sinistra e le sottosezioni dentro una scheda 18/24 medio; le etichette sopra i tratti della personalità e le note come sottotitoli grigi 14/20 medio; una sola riga per il testo medio a 14 px (interlinea 20: schede, chip, intestazioni di tabella, sottotitoli, segmenti dell'Indebolimento); nessun peso 600 (Novità precedenti, risorse del turno, scritte della mappa)                                                                                        | Owlbear 2 (tipografia MUI)                                                                      | `facts.md` 2B                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Inizio**, novità: i pulsanti contornati con l'imbottitura unica (15 px + 1 px di bordo) e 8 px fra i pulsanti                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Owlbear 2 (MUI CardActions)                                                                     | `owlbear-dialog-join-request.jpg`, `owlbear-home-rooms-list.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Scheda**: la formula libera e «Tira» sulla stessa riga, a 8 px (sul telefono «Tira» va sotto); «Politica dei tiri» e «Cambia…» centrati sulla riga; «Apri al Tavolo» sul bordo del testo                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Owlbear 2 (MUI TextField + Button, CardActions)                                                 | `owlbear-dialog-grid-controls-popover.jpg`, `owlbear-home-create-room-dialog.jpg`                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Tavolo**: le righe dell'ordine dei turni disegnano l'anello di focus di 3 px dentro la riga, come i chip del dock (l'elenco scorre e le righe sono a tutta larghezza)                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | regole del progetto (focus visibile di 3 px)                                                    | `code-map.md` §0.4                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Inizio**: «Accesso rapido» è una scheda come le altre (24/32 px dal bordo, 16 sul telefono, titolo h5 24/32, aiuto grigio 14/20); fino a 1100 px la scheda laterale sta a 24 px dalle altre; le azioni delle novità sempre su due righe                                                                                                                                                                                                                                                                                                                                                                                                      | Owlbear 2, pagina Rooms (MUI Card, CardHeader, CardActions)                                     | `owlbear-home-rooms-list.jpg`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Scheda**: ogni scheda finisce 24 px sotto l'ultima riga come comincia sopra la prima; le mosse speciali e le forme collegate sono schede come le vicine; sul telefono le schede hanno i 16 px di MUI; la tabella delle mosse speciali sul bordo del testo                                                                                                                                                                                                                                                                                                                                                                                    | Owlbear 2 (MUI Card, CardContent, Table)                                                        | `owlbear-home-rooms-list.jpg`, `owlbear-dialog-player-permissions.jpg`                                                                                                                                                                                                                                                                                                                                                                                                            |
| Le condizioni attive come i chip dei filtri (pillole alte 40 px su bianco 8 %, 14/20 medio; la concentrazione con l'anello lavanda dentro); i livelli d'Indebolimento raggiunti in ambra con l'inchiostro scuro; i menu a tendina con la ricetta dei campi (16/24, 12 px ai lati); i pulsanti delle borse dell'inventario come pulsanti icona da 40 px                                                                                                                                                                                                                                                                                         | Owlbear 2 (MUI Chip, OutlinedInput, IconButton)                                                 | `owlbear-dialog-player-permissions.jpg`, `owlbear-dialog-grid-controls-popover.jpg`                                                                                                                                                                                                                                                                                                                                                                                               |
| «Torna al Tavolo» come striscia informativa (bianco 5 %, didascalia grigia) con il pulsante di testo lavanda sul bordo della barra in alto; lo stato vitale («Cosciente») come le etichette di stato con il pallino (24 px, didascalia 12/20), uguale nella Scheda e al Tavolo; didascalie e piccole note sulla riga di 20 px; proprietà delle armi come chip contornati alti 40 px (14/20 medio); novità come righe d'elenco (8 px sopra e sotto); titoli dell'Inizio che vanno a capo a 8 px da ciò che segue; le due azioni dell'appuntamento a tutta larghezza, una sopra l'altra, con gli stessi bordi (dal giro dei dettagli)            | Owlbear 2 (striscia informativa, MUI Chip, List, CardActions)                                   | `owlbear-dialog-assets-manager.jpg`, `owlbear-dialog-player-permissions.jpg`, `owlbear-home-rooms-list.jpg`                                                                                                                                                                                                                                                                                                                                                                       |
| Marchio (I-251): un d20 originale come adesivo piatto a due toni (facce lavanda, faccia del «20» bianca, cuciture e bordo blu notte arrotondato, il taglio bianco dell'adesivo intorno, lucentezza di vetro; nella testata senza «20»), la scritta «d20» in Roboto grassetto bianco e «Studio» in Roboto normale lavanda, l'icona della scheda semplificata                                                                                                                                                                                                                                                                                    | Owlbear 2 (grammatica dei distintivi e dei titoli, mai il logo)                                 | `owlbear-map-room-players-toolbar-dock.jpg`, `owlbear-map-initiative-tracker-extension.jpg`, `owlbear-map-mobile-responsive-layout.jpg`; `facts.md` 1B; sezione «Marchio» qui sotto                                                                                                                                                                                                                                                                                               |
| **Tavolo, telefono** (sesto giro): «Mosse» come pulsante rotondo a sola icona, come gli altri comandi del dock (il nome resta «Mosse speciali»); le strisce del dock, delle schede in basso e delle sezioni della Scheda sfumano sugli ultimi 12 px, così il taglio cade sull'icona del chip o della scheda seguente e mai su una lettera sola; le schede in basso con 12 px per lato e 48 px di minimo                                                                                                                                                                                                                                        | Owlbear 2, telefono (MUI IconButton, BottomNavigationAction)                                    | `owlbear-map-mobile-responsive-layout.jpg`; `facts.md` 1B                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Tavolo** (sesto giro): la seconda colonna degli strumenti con la superficie della prima, opaca, senza giunta sul bordo della mappa; l'ordine dei turni 8 px dopo, la prima e l'ultima riga arrotondate a 12 px dentro l'elenco; le pagine del dock sulle due righe di chip; nel pannello le azioni impilate a tutta larghezza e la sezione dopo «Ultima mossa» a circa 30 px dall'inchiostro come le altre; la pedina in focus di «Pedine in scena» nell'unico aspetto «scelto»; i glifi della pillola dei comandi a 20 px; il contatore della campanella come Badge di MUI; la scala e il movimento sulla riga di 20 px                     | Owlbear 2 (barra verticale, Initiative, dock; MUI Button fullWidth, Badge)                      | `owlbear-map-room-players-toolbar-dock.jpg`, `owlbear-map-initiative-tracker-extension.jpg`, `owlbear-home-create-room-dialog.jpg` («CREATE»)                                                                                                                                                                                                                                                                                                                                     |

## Coppie per il confronto

Ogni coppia è un'immagine pronta per il proprietario in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round1/owlbear/_pairs/` (rifatte il
01/10/2026 alle 21:55–21:57, dopo il sesto giro di rifinitura, dalle schermate delle 21:53 prese
dopo l'ultima modifica di `direction.css` delle 21:49:02; nell'Inizio «Entra al Tavolo» è detto
pieno lavanda, nel Tavolo le righe citano la seconda colonna, le pagine del dock, le azioni del
pannello a tutta larghezza e la striscia del telefono; quelle del 30/09 sono in
`round1/owlbear/_previous-2026-09-30/pairs/`): titolo «4 · Owlbear Rodeo — <superficie>», il
nostro screenshot a grandezza reale a sinistra, il riferimento (a volte ritagliato) a destra,
sotto le righe «elemento → prodotto → fonte». Gli screenshot da soli sono nella cartella sopra
(`round1/owlbear/`).

| Superficie                        | Coppia                       | Nostro screenshot                         | Riferimento (cartella `references/foundry-owlbear/`)                                                                                                       | Viewport   |
| --------------------------------- | ---------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Inizio                            | `home-1440.png`              | `home-dark-1440-owlbear.png`              | `owlbear-home-rooms-list.jpg`, poi `owlbear-home-create-room-dialog.jpg`                                                                                   | 1440 × 900 |
| Inizio (telefono)                 | `home-390.png`               | `home-dark-390-owlbear.png`               | `owlbear-home-rooms-list.jpg` (Owlbear non mostra l'inizio su telefono)                                                                                    | 390 × 844  |
| Scheda · Azioni                   | `sheet-1440.png`             | `sheet-dark-1440-owlbear.png`             | `owlbear-dialog-player-permissions.jpg`, `owlbear-dialog-grid-controls-popover.jpg` (ritagli)                                                              | 1440 × 900 |
| Scheda (telefono)                 | `sheet-390.png`              | `sheet-dark-390-owlbear.png`              | `owlbear-dialog-player-permissions.jpg` (ritaglio della finestra)                                                                                          | 390 × 844  |
| Tavolo (giocatore)                | `table-1440.png`             | `table-combat-dark-1440-owlbear.png`      | `owlbear-map-room-players-toolbar-dock.jpg`, `owlbear-map-initiative-tracker-extension.jpg`                                                                | 1440 × 900 |
| Tavolo (DM)                       | `table-dm-1440.png`          | `table-combat-dm-dark-1440-owlbear.png`   | `owlbear-map-room-scene-with-dice.jpg`, `owlbear-map-colored-rings-extension.jpg`                                                                          | 1440 × 900 |
| Tavolo (telefono)                 | `table-390.png`              | `table-combat-dark-390-owlbear.png`       | `owlbear-map-mobile-responsive-layout.jpg`, ritagliato al solo schermo del telefono                                                                        | 390 × 844  |
| Tavolo (DM, tel.)                 | `table-dm-390.png`           | `table-combat-dm-dark-390-owlbear.png`    | `owlbear-map-mobile-responsive-layout.jpg`, ritagliato al solo schermo del telefono                                                                        | 390 × 844  |
| Tavolo in esplorazione            | `table-explore-1440.png`     | `table-explore-dark-1440-owlbear.png`     | `owlbear-map-room-players-toolbar-dock.jpg`, `owlbear-map-room-scene-with-dice.jpg`                                                                        | 1440 × 900 |
| Tavolo in esplorazione (telefono) | `table-explore-390.png`      | `table-explore-dark-390-owlbear.png`      | `owlbear-map-mobile-responsive-layout.jpg`, ritagliato al solo schermo del telefono                                                                        | 390 × 844  |
| Scheda · Magie                    | `sheet-spells-1440.png`      | `sheet-spells-dark-1440-owlbear.png`      | `owlbear-dialog-player-permissions.jpg` (ritaglio della finestra), `owlbear-dialog-assets-manager.jpg` (ritaglio: titolo, categorie, striscia informativa) | 1440 × 900 |
| Scheda · Magie (telefono)         | `sheet-spells-390.png`       | `sheet-spells-dark-390-owlbear.png`       | `owlbear-dialog-player-permissions.jpg` (ritaglio della finestra)                                                                                          | 390 × 844  |
| Scheda · Inventario               | `sheet-inventory-1440.png`   | `sheet-inventory-dark-1440-owlbear.png`   | `owlbear-dialog-assets-manager.jpg`, `owlbear-dialog-player-permissions.jpg` (ritaglio della finestra)                                                     | 1440 × 900 |
| Finestra dell'iniziativa          | `dialog-initiative-1440.png` | `dialog-initiative-dark-1440-owlbear.png` | `owlbear-map-initiative-tracker-extension.jpg` (ritaglio dell'elenco), `owlbear-home-create-room-dialog.jpg` (ritaglio della finestra)                     | 1440 × 900 |
| Menu della pedina                 | `token-menu-1440.png`        | `token-menu-dark-1440-owlbear.png`        | `owlbear-map-colored-rings-extension.jpg`, `owlbear-map-token-context-menu.jpg`                                                                            | 1440 × 900 |

## Differenze dichiarate

- **Scheda del personaggio.** Owlbear Rodeo non ha una scheda. La nostra usa il suo linguaggio
  di pannelli, finestre e moduli (schede carta, elenchi in un pozzo più scuro, chip, gruppi a
  segmenti, interruttori, etichette grigie in minuscolo, ✓ per la competenza). Le caratteristiche
  sono una sola striscia divisa, non sei riquadri separati, per non tornare all'aspetto «schede
  arrotondate con bordo sottile» e alle «righe a pallini» che il proprietario ha già scartato.
- **Pagina iniziale.** Owlbear ha solo l'elenco delle stanze. Una stanza corrisponde alla nostra
  campagna: «Continua a giocare» diventa la sezione della stanza, con un solo riquadro (abbiamo una
  sola campagna d'esempio). Le altre sezioni (prossima sessione, personaggio, novità) usano la
  stessa scheda di sezione. L'immagine del riquadro è una tavola d'esempio del proprietario
  (lanterna e mappa sul tavolo): nei suoi colori è ambra, qui è velata di blu-lavanda per stare
  nel tono di Owlbear. Una campagna con un'immagine propria la mostra senza velo.
- **Colonna degli strumenti a sinistra.** In Owlbear è a destra; il brief chiede di tenerla dove è
  oggi, quindi ne copiamo forma e comportamento, non la posizione.
- **Ordine dei turni.** In Owlbear l'Initiative Tracker è un riquadro che si apre e si chiude dal
  pulsante in alto a sinistra. Da noi è sempre visibile, quindi: da 1440 × 860 in su è l'elenco
  verticale sotto la scheda della scena (senza il titolo «Initiative» e senza i numeri
  d'iniziativa, che la nostra interfaccia non mostra lì), con righe basse e un'altezza massima
  (oltre scorre), così non copre le pedine; su schermi più piccoli (per esempio 1366 × 768,
  1280 × 800, 1024 × 800) torna la riga di schede in alto, come oggi, ma di vetro. Sul telefono
  resta la riga di ritratti.
- **Avviso «Sessione non avviata» su schermi medi.** Tra 721 e 1439 px (o sotto 860 px d'altezza)
  la riga dei turni in alto copre ancora in parte l'avviso del DM, esattamente come oggi con
  «Attuale»: non è un peggioramento di questa opzione. A 1440 × 900 l'avviso è libero e i due
  pulsanti si premono.
- **Avviso sul telefono.** Owlbear mette gli avvisi («snackbar») in alto al centro. Sul telefono,
  sotto i ritratti dei turni, l'avviso copriva la Sentinella; ora sta ai piedi della mappa, sopra
  la pillola dello zoom, dove Material mette gli avvisi su telefono: non copre né i ritratti né
  le pedine, resta a destra della colonna del gruppo, e «Avvia ora» e «Non ora» si premono (prova
  del punto premuto su entrambi i bordi).
- **Pannello laterale e barra delle azioni.** Owlbear non ha un pannello fisso né una barra delle
  azioni: il nostro pannello diventa una scheda che galleggia e la barra diventa il «dock».
- **Strumento attivo.** In Owlbear è solo l'icona lavanda; qui ha anche un cerchio chiaro dietro,
  perché lo stato non deve dipendere solo dal colore.
- **Pedine.** In Owlbear il bordo scuro della pedina fa parte dell'immagine; qui l'arte d'esempio è
  un ritratto, quindi l'anello colorato è il contorno e l'ombra dà il rilievo. Il nome sta sotto
  la pedina, dove l'app lo disegna già. Il segno del turno sotto la pedina non esiste in Owlbear:
  qui resta, ma sottile.
- **Telefono.** Owlbear mostra il telefono solo in un'immagine promozionale (O9): mappa a tutto
  schermo e il «dock» nascosto dietro ⌄. Da noi la barra delle azioni e le schede in basso restano
  quelle dell'app, perché «Termina turno», «Annulla» e «Annulla ultima modifica» devono restare
  sempre visibili e il binario delle schede deve restare attaccato sotto la barra; per questo la
  mappa non riempie lo schermo. Dal giro dei dettagli la mappa finisce 8 px sopra la barra: il
  gruppo, la pillola dello zoom e la riga della scala non stanno più sotto la barra. Owlbear non ha pagine
  Inizio o Scheda su telefono: lì valgono le stesse regole del computer.
- **Dadi 3D.** Il colore dei dadi 3D (oro, se non lo si cambia) è una scelta di ogni giocatore,
  salvata con i tiri e vista da tutti: questa opzione non lo cambia.
- **Maiuscoletto.** Owlbear scrive i pulsanti in maiuscolo; qui è maiuscoletto disegnato a 20 px,
  così le maiuscole sono alte come i 14 px dei pulsanti di Owlbear (il browser disegna il
  maiuscoletto finto al 70 %), e a 18 px sul telefono e nei due punti dove MUI usa il pulsante
  piccolo (azioni dello snackbar, «Tiri e risultati» nella pillola dei dadi: a 20 px la pillola
  toccherebbe la riga delle risorse e l'app ripiegherebbe entrambe in sole icone): le regole del
  progetto vietano la trasformazione del testo e Roboto non ha un maiuscoletto vero.
- **Magie e Inventario.** Owlbear non ha un libro degli incantesimi né un inventario. Le due schede
  prendono la grammatica dei suoi elenchi (pozzo scuro, righe divise, sottotitoli grigi), del
  gestore Assets (ricerca, chip, striscia informativa con il link lavanda) e delle sue finestre.
  Le strisce dei numeri hanno la stessa grammatica della striscia delle caratteristiche
  (etichetta 14 px, numero 24 px); in Magie le sette caselle stanno quattro per riga perché in una
  sola riga le etichette («Attacco con incantesimo») andrebbero a capo tre volte; in Inventario le
  caselle contengono frasi e comandi, quindi stanno due per riga e allineate a sinistra.
  L'icona di «Gestisci monete» resta quella dell'app: il set Material di questa direzione non ha
  il glifo per quel nome e non ne è stato aggiunto uno nuovo.
- **Menu della pedina.** Owlbear mostra una fila orizzontale di sole icone sotto la pedina, con il
  nome in basso. Qui il menu resta un elenco verticale con le parole (i comandi sono molti di più)
  e il nome sta in alto, sulla striscia scura; le icone delle voci restano i disegni a linee
  dell'app, perché il menu le prende da una funzione dell'app che una direzione non può
  sostituire (`directions/README.md`, «icons.mjs»): dal giro dei dettagli sono a 20 px con un
  tratto di 2 px, più vicine al peso delle icone piene (vedi «Dettagli rifiniti», scartati).
- **Finestre sul telefono.** Le azioni in fondo diventano pulsanti a tutta larghezza, uno per
  riga, come il «CREATE» di Owlbear, così nessuna etichetta va a capo dentro il pulsante.
- **«Ispirazione eroica».** La casella è larga quanto una caratteristica (97 px a 1440): le due
  parole non stanno su una riga nemmeno a 12 px, quindi l'etichetta va su due righe; la stella
  resta comunque sulla stessa linea dei numeri accanto.
- **«Punti ferita» nella fascia.** La casella tiene la sua disposizione (Cura, importo e Danno a
  sinistra, numeri a destra); dal giro dei dettagli la colonna dei numeri ha le tre zone delle
  altre caselle (etichetta in alto, numero al centro, «PF temporanei» e la barra in fondo), così
  «18 / 22» sta sulla stessa linea di «+2», «9 m» e della stella (prima 15 px più in alto).
- **Pulsanti contornati.** Hanno 15 px ai lati, il valore esatto di MUI (15 + 1 px di bordo = 16 px
  fino al testo). Una regola unica a 16 px avrebbe vinto anche sulle imbottiture strette che l'app
  dà ai pulsanti in punti precisi (barra delle azioni sul telefono): lì «Termina turno» andava a
  capo su una seconda riga.
- **«Avvia combattimento» / «Concludi incontro» sul telefono.** Nella scheda della scena il
  pulsante contornato tiene gli 8 px dell'app ai lati (15 px ovunque altrove): con 15 px «Tempo»
  andava su una terza riga e la mappa si accorciava.
- **Schede delle pagine della barra delle azioni sul telefono.** «Azioni» e «Barra rapida»
  scrivono a 12 px (14 px sul computer), come i chip del dock: così la riga delle risorse ha lo
  spazio per «■ 9 m» accanto a loro.
- **Bersagli piccoli ereditati.** I PF nel dock (119 × 28), «Reazioni» nel dock (36 × 40) e
  «Perché?» in Magie (51 × 32) sono così anche in «Attuale»: questa direzione non li cambia.
- **Azioni delle novità nella scheda laterale dell'Inizio.** La scheda è larga 360 px (296 px di
  testo): con l'imbottitura unica dei pulsanti contornati e gli 8 px fra i pulsanti, un pulsante
  lungo («Guarda il tour», «Apri Supporto», «Tour del Tavolo»…) e «Segna come letta» non stanno su
  una riga. Da 1101 px in su ogni novità li mette quindi sempre su due righe: il pulsante
  contornato sopra, «Segna come letta» sotto, in fondo a destra, come ogni azione secondaria delle
  schede (prima andava a capo in due novità su tre). Le novità sono righe d'elenco MUI (8 px sopra
  e sotto), così a 1440 × 900 la scheda sta nel suo riquadro fisso di 868 px con i suoi 24 px in
  fondo; con novità più lunghe scorre dentro il riquadro, come oggi, e un comando portato in vista
  col tasto Tab lascia 16 px dal bordo.
  Fino a 1100 px e sul telefono la scheda è larga e le azioni stanno su una riga. È sotto la piega
  a 1440 × 900.
- **«Torna al Tavolo».** Owlbear non ha una striscia sotto la barra in alto (la stanza è sempre
  aperta). Qui la striscia che compare dopo aver aperto il Tavolo prende la striscia informativa
  degli avvisi (bianco 5 % sulla pagina, didascalia grigia) sul bordo della barra in alto (24 px
  sul computer, 20 fino a 1100 px), con «Torna al Tavolo» come pulsante di testo lavanda; sul
  telefono la nota «La partita rimane aperta» resta nascosta, come oggi.
- **Marchio.** Owlbear non ha un dado come marchio: il nostro d20 e la scritta prendono la
  grammatica dei suoi distintivi e dei suoi titoli, non il suo logo (sezione «Marchio»).
- **Tema chiaro, alto contrasto, carattere leggibile, colori per daltonismo, movimento ridotto.**
  Non toccati: il tema chiaro resta quello di oggi e le preferenze di accessibilità vincono.

## Marchio (I-251, 01/10/2026)

Ogni direzione ha il suo marchio: il dado d20 e la scritta «d20 Studio» nella lingua visiva del
prodotto copiato, più l'icona della scheda del browser. Qui: `brand.mjs` (il dado della testata e
l'icona della scheda) e il blocco «brand (I-251)» in fondo a `direction.css` (la scritta e il
pulsante). Vale solo con il tema scuro: con il tema chiaro tornano il dado e l'icona di oggi.

### Cosa prende dalla grammatica di Owlbear Rodeo

Owlbear Rodeo 2 non ha oro, smalto, ferro o pergamena: il suo marchio nell'app è un **distintivo
piatto a due toni** (una forma piena di colore, una figura bianca, i dettagli scuri, gli angoli
arrotondati), dentro la pillola di vetro in alto a sinistra; lo stesso linguaggio ha il
distintivo «GM» bianco accanto ai giocatori. Il marchio della direzione parla così:

| Elemento           | Il nostro marchio                                                                                                                                                                                                                                                                                               | Da dove (Owlbear 2)                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Materia            | adesivo piatto: colori pieni, nessun rilievo né ombra; una leggera lucentezza bianca che sfuma verso il basso                                                                                                                                                                                                   | distintivo del lanciatore e distintivo «GM» (`owlbear-map-room-players-toolbar-dock.jpg`, `owlbear-map-initiative-tracker-extension.jpg`); il «vetro» dei pannelli (`facts.md` 1B, T7) |
| Colore             | un solo accento lavanda in quattro toni piatti (#dccbff, #bb99ff, #9a7be6, #7859c8); la faccia del «20» bianca; cuciture, bordo e numero blu notte (#171a26)                                                                                                                                                    | primary.main #bb99ff e il suo tono scuro MUI (#836bb2, misurato #856db5); background.default #1e2231 (`facts.md` 1B); il bianco delle figure dei distintivi                            |
| Linea              | bordo esterno pieno con gli angoli arrotondati (5 unità, circa 1,6 px a 32 px) e, fuori, il taglio bianco 28 % dell'adesivo (3 unità, 1 px a 32 px: il bordo blu notte da solo sulla testata #222639 stava a 1,14:1); cuciture di 3,2 unità (circa 1 px): poche linee, grosse, nitide da piccolo                | gli angoli arrotondati del distintivo e delle icone Material «Round» dell'app (O1, O3)                                                                                                 |
| Numero             | «20» in Roboto Black (900), blu notte sulla faccia bianca; nella testata (32 px) non c'è, perché sarebbe alto 6 px e una macchia: la faccia resta bianca; torna appena il dado è più grande (campionario, da 48 px)                                                                                             | Roboto, il carattere dell'app (già nel repository); i titoli bianchi in grassetto «Players» e «Initiative» (O1, O5)                                                                    |
| Scritta            | «d20» in Roboto grassetto bianco e «Studio» in Roboto normale lavanda, 20 px (h6) su una riga di 32 px; 8 px fra il riquadro del dado e la scritta, cioè 12 px fra il dado disegnato e «d20»; nessun maiuscolo                                                                                                  | i titoli in grassetto bianco dei pannelli (O1, O5); il lavanda come unico accento (`facts.md` 1B)                                                                                      |
| Pulsante           | al passaggio il riempimento bianco 8 % con raggio 16, alto come le pillole delle pagine (48 px; 40 al Tavolo e sul telefono); rientra nel margine come `edge="start"` di MUI, così il dado resta sul bordo della testata; sul telefono stretto è un tondo da 40 px come le altre icone; anello di focus di 3 px | MUI ButtonBase e IconButton (`facts.md` 1B, 2B)                                                                                                                                        |
| Icona della scheda | lo stesso dado in tre toni, la faccia bianca con il bordo più spesso dei raggi, un bordo blu notte di circa 1 px a 16 px; senza numero, che a 16 px diventa una macchia                                                                                                                                         | regola di leggibilità del contratto (`directions/README.md`)                                                                                                                           |

### Cosa è nostro

- **La forma.** L'icosaedro vero visto di faccia, dalla geometria comune `brand-geometry.mjs`
  (vertici non spostati): tutte le direzioni hanno lo stesso dado, cambia solo come è dipinto.
- **La luce.** Dieci facce in quattro toni lavanda secondo la luce dall'alto a sinistra
  (`shade()`): chiare in alto a sinistra, scure in basso a destra; le cuciture blu notte le
  staccano come i tagli di un adesivo; la faccia del «20» è la figura bianca.
- **La scritta.** La coppia grassetto bianco + normale lavanda per «d20 Studio».

### Perché non è una copia del logo di Owlbear

- Il logo di Owlbear è un esagono corallo pieno con la testa bianca di un gufo-orso con il
  cappello da ranger. Qui non c'è nessun animale, cappello o volto e nessun corallo: l'esagono è
  soltanto il contorno che ogni d20 vero mostra quando è visto di faccia, diviso in dieci facce.
- L'icona dell'estensione Dice è un d20 rosso con gli spigoli rosa chiaro e senza numero. Il
  nostro è lavanda, con cuciture scure, la faccia centrale bianca e il «20».
- La scritta non imita il logotipo «Owlbear Rodeo»: usa Roboto, il carattere dell'interfaccia
  (non un marchio), con i pesi e i colori di questa direzione.
- Nessun pixel, tracciato o carattere di Owlbear entra nel repository: il dado è disegnato nel
  codice (SVG); le immagini di riferimento restano in
  `~/Workspace/Codex/d20-studio-visual-assets/references/foundry-owlbear/` (sola consultazione).

### Prove scartate

- **«Studio» in maiuscoletto lavanda**, la voce dei pulsanti di testo: al Tavolo «STUDIO» si
  leggeva come un altro pulsante accanto a «APP» e «TORNA ALLA CAMPAGNA»
  (`wordmark-variants-2x.png`, variante a; scelta la b).
- **Icona della scheda senza raggi**: a 16 px esagono e triangolo sembravano un segnale di
  pericolo, non un dado (`fav-variants-1x-zoom.png`, variante A; scelta la C).

### Controlli fatti (01/10/2026)

- Altezza della testata invariata: 81 px (Inizio) e 63 px (Tavolo) a 1440, 81 e 67 a 1000, 105 a
  600 e a 390. Il dado resta sul bordo della testata (24 px a 1440, 20 a 1000, 12 sul telefono) e
  il suo centro sta sulla linea di mezzo della testata (entro mezzo pixel), come le pillole delle
  pagine; nessuno scorrimento orizzontale.
- Confronto pixel per pixel con le catture di prima: a 1440 cambia solo la riga della testata (le
  pagine si spostano di 11 px a sinistra perché la scritta in Roboto è più stretta); a 390 cambia
  solo il dado su Inizio e nulla al Tavolo, quindi «Entra al Tavolo», la testata del Tavolo su
  una riga e Termina turno / Annulla restano dove erano.
- Riposo, passaggio e focus a 1440 (Inizio e Tavolo), 1000 (Tavolo), 600 e 390 (Inizio): l'anello
  di 3 px è sempre intero, a 2 px dal bordo dello schermo sul telefono.
- Sezione «Marchio» del campionario, icona nella scheda del browser (16 e 32 px, striscia scura e
  chiara), confronto con i riferimenti di Owlbear (`compare-owlbear.png`).
- `tests/visual01-directions.test.mjs` (contratto di `brand.mjs`) verde; Prettier pulito.
- Prove: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/brand-owlbear/`.

## Dettagli rifiniti (I-252, 01/10/2026)

Dopo la critica indipendente sui dettagli (punti OB-01 … OB-18, prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/detail-owlbear/`), un solo giro di
correzioni: in `direction.css` il blocco «DETAIL ROUND» in fondo, più le regole cambiate dove sono
definite (pulsante principale, aspetto «scelto», vetro, immagine della stanza, marchio); in
`brand.mjs` il bordo bianco del dado. Misure in px CSS a 1440 × 900 e 390 × 844, tema scuro, stati
del kit di cattura: «prima» sono le misure della critica (sul `direction.css` delle 18:02),
«dopo» quelle del file finale (sha256
`b8ec71a6809259083cdc572b807c6c439d90962c383be27b69eff819bb040a04`; `brand.mjs` sha256
`c6a1f6fa2e035b6e0799b97c335f25b2c0eed5eb2b9dbc3375d5041d0ef59386`). Il file di partenza è
conservato in `…/visual-01/fix-owlbear/direction.before.css` e `brand.before.mjs`.

| Punto                                 | Prima                                                                                                                                                                         | Dopo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OB-01 Inizio, immagine della stanza   | un riquadro di 256 × 256 dentro un pozzo di 896 × 288: circa il 70 % del pozzo era blu vuoto                                                                                  | l'immagine riempie tutto il pozzo (896 × 288, ritagliata al centro, 40 % dall'alto); il nome della campagna a 24 px dal bordo in basso a sinistra                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| OB-02 Marchio nella testata           | bordo blu notte #171a26 sulla barra #222639 (1,14:1, il dado perdeva il contorno); 16 px fra il dado e «d20»; il «20» disegnato a circa 6 px                                  | un taglio bianco al 28 % fuori dal bordo, come il bordo di un adesivo (circa 2,5:1); 8 px fra il riquadro del dado e la scritta, cioè 12 px fra il dado e «d20»; nella testata la faccia resta bianca senza «20» (il numero torna quando il dado è più grande, nel campionario da 48 px); nessuna testata più alta                                                                                                                                                                                                                                                                                                                                                                               |
| OB-03 Pulsante principale e «scelto»  | il principale contornato lavanda ovunque, tranne «Termina turno» pieno; tre aspetti diversi per una voce scelta (lavanda pieno, velo con bordo, velo senza bordo)             | un solo pulsante pieno lavanda (testo scuro, 7,9:1) per superficie: «Entra al Tavolo» (48 px), «Vai al Tavolo», il principale di una finestra («Inizia combattimento»), «Termina turno». Gli altri principali sono contornati come i vicini («Cerca un tavolo», «Crea un personaggio», «Aggiungi oggetto», «Gestisci magie», «Bevi», «Usa», «Lancia dall'oggetto», «Invia la proposta», «Tira tutti»); disattivato è grigio, come in MUI. Un solo «scelto»: velo lavanda al 16 % con il testo #c9adff (5:1 sulle schede), senza bordo, per pagine, schede, sotto-schede («Creatura»), pagine del dock («Azioni»), binario e chip; il chip scelto ha la ✓ davanti (una forma, non solo un colore) |
| OB-04 Inizio, «Prossimo appuntamento» | «Aggiungi al calendario» 240 px e «Apri sessioni» 132,5 px, uno sotto l'altro, con i bordi destri a 1304 e 1196,5                                                             | tutti e due 296 × 40 (da 1064 a 1360), a 8 px l'uno dall'altro, in fondo alla scheda; sul telefono tutti e due 326 px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| OB-05 Scheda, «Punti ferita»          | «18 / 22» a 389–421, gli altri numeri della fascia a 404–436                                                                                                                  | «18 / 22» a 404–436 come «+2», «9 m» e la stella (sul telefono 734–766 come la stella); il valore è un pulsante di 40 px con i numeri al centro, la barra 4 px come al Tavolo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| OB-06 Testata del Tavolo              | 24 px fra la scritta e «App», 32 px fra «App» e «Torna alla campagna»; pulsanti icona 42 px accanto a pulsanti di 40                                                          | 24 e 24 px; ogni pulsante icona 40 px (anche la chiusura delle finestre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| OB-07 Colonne degli strumenti e vetro | seconda colonna a 7 px e 1 px più in alto; il suo fondo al 60 % mezzo sulla pagina e mezzo sulla mappa sembrava tagliato; pillola dei comandi a 116, scheda della scena a 114 | 8 px fra le colonne, bottoni sulle stesse righe (176, 220, 264); un solo vetro per tutto ciò che galleggia sulla mappa (blu notte al 72 %, sfocatura 20 px con saturazione 140 %, un filo bianco al 12 % dentro, ombra): la seconda colonna ora sfoca davvero la mappa dietro di sé (prima il suo contenitore lo impediva; lo stesso accorgimento vale per le pillole delle risorse e dei dadi sopra il dock); pillola dei comandi a 114 come la scheda della scena e il pannello                                                                                                                                                                                                                |
| OB-08 Ordine dei turni                | riga attuale di 40 px con due righe di testo, il nome attaccato al bordo e l'anello di focus sopra il nome                                                                    | riga attuale 56 px (8 px sopra e sotto), le altre 40 px con il nome a 10 px dai bordi; l'anello di focus non tocca più il testo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| OB-09 Pannello «Creatura»             | sezioni a 16 px, ma il titolo «Forme e creature collegate» cominciava 37 px dentro la sua sezione (circa 60 px vuoti); l'ultima riga tagliata a metà in fondo al pannello     | 24 px fra ogni sezione (condizioni 270, forme 531, mossa 683, pulsanti 783, pannelli aggiunti 943), titoli in cima alla sezione; gli ultimi 24 px del pannello sfumano invece di tagliare; con la tastiera dentro il pannello la sfumatura sparisce                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| OB-10 Chip del dock                   | pallino del costo sopra le ultime 3 px dell'etichetta; nomi dei gruppi a 9 px; la prima riga partiva a 448,7, la seconda a 400,7; passaggio del mouse lavanda come «scelto»   | pallino a destra a metà altezza, 5 px dopo l'etichetta; «ARMI», «INCANTESIMI», «COMUNI» a 12 px in maiuscoletto sopra l'inizio dell'etichetta; il filtro ✦ è un chip come gli altri, così le due righe partono entrambe a 400,7; passaggio neutro (bianco 16 %); tutte le icone del dock 20 × 20 (prima 21, 19 × 21, 17 × 17…); «Mosse» chip della stessa famiglia (12 px, minuscolo); a 1280 × 800 restano visibili cinque azioni come prima                                                                                                                                                                                                                                                    |
| OB-11 Comandi del turno               | cerchi a 790 e 843 (4 px dal bordo sopra, 9 sotto, 13 fra le righe; righe di 45 px); in esplorazione i cinque cerchi spinti a destra                                          | righe di 40 px a 796 e 844: 8 px sopra, fra le righe e sotto; «Termina turno» sulle due righe, centrato a 840 come il pannello; in esplorazione i cinque comandi al centro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| OB-12 Colonna del gruppo              | 88 / 80 / 88 px a 1440 (Doran senza barra), 48 / 40 / 48 sul telefono                                                                                                         | 88 / 88 / 88 (passo 96) a 1440 e 40 / 40 / 40 (passo 44) sul telefono: chi non mostra la barra tiene il suo posto vuoto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| OB-13 Tavolo sul telefono             | il ritratto di Mira 21 px sotto la barra delle azioni, lo zoom 9 px sotto; 70 px vuoti fra la scena e il gruppo                                                               | la mappa finisce 8 px sopra la barra (la riga della scala si vede, 581–621, la barra comincia a 628); gruppo (ritratti di 32 px) 441–569 e zoom 521–569 sulla stessa linea di fondo, subito sotto la scena, che non si sposta (182–435)                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| OB-14 Barra delle azioni sul telefono | icone schiacciate (19 × 21, 17 × 21, 17 × 17); un frammento di 3 px del divisore al bordo                                                                                     | icone 20 × 20; la striscia sfuma negli ultimi 24 px e li lascia liberi in fondo, così un chip tagliato si legge come «ce n'è ancora»; con la tastiera dentro la sfumatura sparisce                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| OB-15 Barra in basso sul telefono     | «Combatti…»; le schede 1 px più in alto di «Mappa» e «Tutti», l'anello di focus tagliato in alto                                                                              | «Combattimento» intero (etichette di 12 px, schede larghe quanto il nome, la striscia scorre e sfuma alla fine); riga di 52 px per tutti (il filo in alto è disegnato dentro la barra), schede a 786 come «Mappa» e «Tutti», anello intero                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| OB-16 Finestra «Avvia combattimento»  | quattro bordi sinistri per riga; sul telefono il totale da solo su una riga; «Tira tutti» lavanda, «Tira PNG» neutro                                                          | un solo bordo: nome, tipo, d20 e «Sorpreso» a 520 (a 1440) e a 111 (sul telefono); sul telefono campo, tiro e totale su una riga (il tiro mostra l'icona del dado e tiene il nome «Tira l'iniziativa di …» per chi usa un lettore di schermo); «Tira tutti» e «Tira PNG» uguali, contornati                                                                                                                                                                                                                                                                                                                                                                                                      |
| OB-17 Menu della pedina               | fondo trasparente al 95 % (sul telefono si vedevano la barra in basso e «Termina turno»); bordi sinistri a 358,6, 362,6 e 363,6; la lettera «L»; contatori 18 px e tasti 22   | fondo pieno; ritratto, «PF», aiuto e icone delle voci tutti a 362,6 (20 px dal bordo; sul telefono 20); il ritratto d'esempio della creatura come sulla pedina; contatori e tasti alti 20 px; icone delle voci 20 px con tratto di 2 px                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| OB-18 Magie, slot                     | «Correggi risorsa» a 1045,6 e a 1013,6 (dopo la lunghezza della riga)                                                                                                         | tutti e due a 1053,6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**Le tre proposte per «superare» Owlbear**, applicate: un solo pulsante pieno per superficie (più
rigoroso di Owlbear stesso); un solo vetro per tutti i pezzi sopra la mappa, con lo stesso bordo
in alto (114) e 8 px di margine; una barra delle azioni che si legge a colpo d'occhio (nomi dei
gruppi leggibili, il segno del costo sempre allo stesso posto, 8 px fra i chip di un gruppo e 16
fra i gruppi, i comandi del turno in una griglia centrata con «Termina turno» sulle due righe).

### Scartato o fatto in parte, con il perché

- **OB-03, raggio 999 del pulsante principale.** Resta il raggio 16 di tutti i pulsanti da 40 px
  (in MUI il pulsante pieno e quello contornato hanno lo stesso raggio): accanto a «Torna al
  Tavolo» o «Annulla» una pillola di 20 px contro 16 sembrava un errore. La pillola resta solo a
  «Termina turno», il tasto «ROLL» dell'estensione Dice.
- **OB-02, dado a 36 px.** No: la testata sarebbe cresciuta (da 48 a 52 px all'Inizio, da 40 a 44
  al Tavolo). Scelto lo spazio di 8 px, che dà lo stesso risultato visivo.
- **OB-04, scheda alta quanto il suo contenuto.** No: accanto alla scheda della stanza, più alta,
  avrebbe lasciato un buco sotto di sé; resta alta come la vicina, con le azioni in fondo (MUI
  CardActions).
- **OB-05, «Ispirazione eroica» su una riga.** La casella è larga 97 px: le due parole a 13 px ne
  chiedono circa 107 e la casella dovrebbe essere larga circa 131 px. L'etichetta resta su due
  righe (vedi «Differenze dichiarate»); la stella sta sulla linea degli altri numeri.
- **OB-10, nomi dei gruppi sopra i chip.** Nel dock (al massimo 120 px) non c'è una riga in più:
  il nome resta dentro il primo chip del gruppo, ma a 12 px e sopra l'etichetta, non sopra
  l'icona.
- **OB-14, menu «Digitali» a 14 px.** Resta a 16 px: sotto i 16 px Safari su iPhone ingrandisce la
  pagina quando si tocca il menu; per questo ogni campo di questa direzione scrive a 16 px (body1
  di MUI, vedi «Scala unica»).
- **OB-17, icone piene nel menu della pedina.** Il menu disegna le icone con una funzione dell'app
  che una direzione non sostituisce; con le maschere CSS servirebbero circa venti glifi nuovi da
  scaricare dal repository di Google e una regola per ogni voce, e finché non ci sono tutti il menu
  mescolerebbe icone piene e a linee. Fatto in parte: le icone a linee sono a 20 px con un tratto
  di 2 px, più vicine al peso delle icone piene accanto.
- **OB-18, resto del punto.** La critica è arrivata tagliata dopo «Correggi risorsa»: è stato
  corretto l'allineamento degli slot. «Lancia» contornato con «Dettagli» e «Confronta» come testo
  resta la gerarchia voluta (un comando, due azioni secondarie, come MUI CardActions).

### Controlli fatti (01/10/2026, giro dei dettagli)

- Garanzie (`round1/owlbear/final-guard.txt`, 24 combinazioni da 390 × 844 a 1920 × 1080): nessuno
  scorrimento orizzontale; testata del Tavolo su una riga sul telefono; dock alto 112 px a 1440
  (prima 114; massimo 120); «Termina turno», «Annulla» e «Annulla ultima modifica» sempre visibili;
  «Entra al Tavolo» a 629–677 sul telefono; nessuna etichetta di pulsante su due righe.
- Focus (`round1/owlbear/final-focus.txt`): l'anello di 3 px #e0d0ff intero su ogni controllo
  toccato (pulsanti dell'appuntamento, principale, marchio, righe dei turni, chip e filtro del
  dock, pagine del dock, «Mosse», «Termina turno», schede del binario, seconda colonna, pannello,
  gruppo, tiro e strumenti della finestra, voci del menu, chip e slot di Magie, punti ferita);
  nessuna sfumatura copre un anello (con la tastiera dentro, le sfumature spariscono); dentro le
  finestre un campo portato in vista lascia 16 px al bordo e la finestra stessa ha l'anello di
  3 px. Restano, uguali a prima di questo giro: l'anello tratteggiato delle pedine disegnato in
  SVG, e sul telefono la striscia delle sezioni della Scheda e tre termini delle regole nel testo
  che tagliano una parte dell'anello al bordo del loro contenitore.
- Valori di progetto (`round1/owlbear/final-audit.txt`, 20 stati): altezze dei controlli 18 → 16,
  misure del testo 14 → 13, interlinee 21 → 19, misure delle icone 11 → 7, colori dei bordi
  11 → 9, sfondi 27 → 26, varianti dei pulsanti 84 → 80; spazi sempre 24 valori, 97 % sulla
  griglia di 4 px; contrasto: 0 errori su 1185 testi (anche il testo #c9adff sul velo lavanda).
- Schermate: tutta la serie di round 1 rifatta dopo l'ultima modifica in
  `round1/owlbear/` (15 file più `contact-dark-owlbear.png`), tutte aperte e guardate; le coppie in
  `round1/owlbear/_pairs/` non sono state rifatte in questo giro (gli screenshot accanto sono più
  nuovi). Prova a 1280 × 800 e 360 × 740 prima e dopo in `…/visual-01/fix-owlbear/sizes*`.
- Telefoni diversi (`…/fix-owlbear/probe/phones-final`): a 390 × 844 e 412 × 915 la mappa
  finisce 8 px sopra la barra delle azioni, con la scala, il gruppo e lo zoom visibili. Sui
  telefoni stretti (360 × 740) «Termina turno» va su una riga sua e la barra cresce di 44 px: il
  gruppo e lo zoom restano visibili (prima erano coperti del tutto) e finiscono 3 px sotto il bordo
  della barra, la riga della scala resta sotto. Una regola che accorciava la mappa anche di quei
  48 px è stata provata e tolta: la scena saliva e il gruppo copriva una pedina. Sui telefoni bassi
  (375 × 667) la mappa tiene i 300 px minimi dell'app e il gruppo galleggia sull'angolo in basso a
  sinistra della scena.
- Campionario: sezione «Marchio» (dado da 16 a 160 px con il «20» da 48 px, testate senza) e
  «Pulsanti» in `…/visual-01/fix-owlbear/specimen/`.
- `node --test design/blueprint/tests/*.test.mjs`: 2694 su 2694; `tests/visual01-directions.test.mjs`
  13 su 13; Prettier pulito su `direction.css`, `brand.mjs` e questa pagina.
- Strumenti e misure: `…/visual-01/fix-owlbear/` (`tools/`, `probe/`, `before/`, `iter1-3/`,
  `guard/`, `focus/`).

## Scala unica (I-250)

Ogni spazio, testo, angolo e bordo che questa direzione imposta usa i valori dichiarati in cima a
`direction.css` (blocco «scale»), presi dal tema Material-UI di Owlbear Rodeo 2:

| Che cosa       | Valori                                                                                                                                                                                                                        | Da dove                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Spazi          | 4, 8, 12, 16, 20, 24, 32, 40, 48 px (`theme.spacing`, passo 8 con i mezzi passi dei componenti MUI); niente sotto i 4 px; anche le imbottiture, i margini e gli spazi dell'app sui pezzi vestiti (blocco «ONE SPACING SCALE») | `facts.md` 1B («List item buttons»), 2B                       |
| Testi          | 12 didascalia · 14 body2 · 16 body1 · 18 titolo dell'Initiative · 20 h6 · 24 h5 · 34 h4 (Roboto); interlinee 20/24/32/40 px                                                                                                   | tipografia MUI v5; misure su O14 e O15; `facts.md` 1B         |
| Pulsanti       | maiuscoletto 20 px (= maiuscole di 14 px); 18 px sul telefono e nei due punti piccoli (snackbar, pillola dei dadi); riga 22 px; alti 40 px; pulsanti di testo 8 px ai lati                                                    | pulsante MUI (14 px maiuscolo, «small» 13 px)                 |
| Angoli         | 16 ovunque; 12 righe dense; 20 pillole dei dadi; pillola; tondo; 2 la casella di spunta                                                                                                                                       | `shape.borderRadius` 16; `MuiListItemButton`; estensione Dice |
| Bordi          | 1 (campi, divisori), 2 (anelli, casella), 3 (bordo dei pog, anello del fuoco)                                                                                                                                                 | MUI; anello del fuoco dell'app                                |
| Altezze        | 24 chip piccoli · 40 pulsanti, campi, icone · 48 schede e pulsante grande · 56 «Termina turno» · 4 barre · interruttore 42 × 26 (quello di Owlbear)                                                                           | MUI (IconButton 40, Tab 48, campo 56, LinearProgress 4)       |
| Avatar e icone | pog 32/40/48/64/72 px; icone 24 e 20 px                                                                                                                                                                                       | MUI (Avatar, SvgIcon)                                         |

Le misure dell'app (`--text-*`, `--radius-*`, `--label-tracking`) sono portate sugli stessi
gradini, così anche le aree che questa direzione non ritocca leggono la stessa scala.

Misura con lo strumento `changes/visual-01/audit` (10 stati a 1440 e 390, 20 schermate, tema
scuro; ultimo giro 01/10/2026 dopo le correzioni; rapporto in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-owlbear/r3/audit-final/audit.md`;
`round1/owlbear/final-audit.md` ora contiene il rapporto del quarto giro di rifinitura, sezione
«Coerenza (I-250)»):

| Misura                                 | Opzione 4 (prima del giro) | Opzione 4 (ora) | «Attuale» |
| -------------------------------------- | -------------------------- | --------------- | --------- |
| Spazi diversi (imbottiture, margini)   | 42                         | 29              | 42        |
| Spazi sulla griglia di 4 px            | 54 %                       | 96 %            | 36 %      |
| Misure di testo diverse                | 15                         | 14              | 23        |
| Interlinee diverse                     | 29                         | 24              | 49        |
| Stili di testo diversi                 | 75                         | 71              | 101       |
| Raggi diversi                          | 4                          | 4               | 17        |
| Altezze di controllo diverse           | 23                         | 18              | 29        |
| Colori dei bordi diversi               | 11                         | 11              | 20        |
| Testi sotto il contrasto AA (su ~1200) | 0                          | 0               | 3         |

**Valori che restano fuori scala** (sono dell'app su pezzi che questa direzione non veste, o li
lascia per non rompere un vincolo; nessuno è stato introdotto da questa direzione):

- testi da 9 px (etichetta «ARMI» dentro i chip del dock: lo spazio del chip è fisso), 10 px
  (etichette della barra in basso sul telefono, scala della mappa sul telefono), 11 px (contatore
  delle notifiche, distanza sopra la pedina), 13 px (nome sotto la pedina: un test lo fissa a
  13 px), 17 px (simbolo dei biglietti sulla mappa), 19 px (stelle dei preferiti), 22 px («+» e
  «−» dello zoom);
- interlinee frazionarie dell'app (16,5 / 19,5 / 25,5 px) su testi della mappa che questa
  direzione non ridisegna;
- didascalie 12/18 al Tavolo (dal quarto giro non ce n'è più nessuna sull'Inizio e nella Scheda):
  le parole dei chip del dock e il movimento nella barra delle risorse, il sottotitolo della scheda
  della scena, la didascalia della mappa, la CA nel pannello «Creatura», il sottotitolo e l'aiuto
  dei punti ferita nel menu della pedina; restano sulla riga di 18 px perché stanno in pezzi ad
  altezza fissa (il dock entro i 120 px, la scheda della scena accanto all'ordine dei turni);
- spazi: i margini fissi della mappa (76/88/152 px e quelli che l'app calcola), l'imbottitura di
  15 px dei pulsanti contornati (valore MUI, vedi «Differenze dichiarate»), lo spazio di 2 px fra
  le schede del binario del Tavolo (con 4 px le 14 schede del DM non starebbero più in una
  finestra 1366 × 768), i 6 px sopra e sotto la barra delle schede in basso sul telefono (alta
  64 px: cambiarla sposterebbe mappa e barra delle azioni), i pulsanti icona dell'intestazione a
  42 px (garanzia dell'app), la striscia di prova;
- 11 misure di icone (21, 18, 24, 17, 20 px…): sono le scatole che l'app dà ai glifi nei vari
  punti; questa direzione cambia i glifi, non le scatole.

## Coerenza (I-250)

Giro di coerenza del 01/10/2026 dopo la terza verifica indipendente: un solo aspetto per ogni
tipo di pezzo (pulsanti, campi, schede, chip, pannelli), nessuno spazio o testo lasciato al valore
dell'app, anche sotto la piega (scheda intera, Inizio fatto scorrere). Misura con lo strumento
`changes/visual-01/audit` (10 stati a 1440 e 390, 20 schermate, tema scuro, Chromium 153):
«prima» è `direction.css` delle 03:18 (lo stato Inventario a 390 è stato rifatto, perché il primo
giro lo aveva catturato senza la direzione caricata), «dopo» è il file delle 04:45, senza modifiche
dopo. Rapporti: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-owlbear/r4/`
(`audit-before/`, `audit-after/`), copia del secondo in `round1/owlbear/final-audit.md`.

| Misura (numeri del titolo del rapporto)     | Prima               | Dopo                |
| ------------------------------------------- | ------------------- | ------------------- |
| Elementi visibili                           | 2503                | 2513                |
| Spazi diversi (imbottiture, margini, spazi) | 29 (20 fuori scala) | 23 (13 fuori scala) |
| Spazi sulla griglia di 4 px                 | 96 %                | 97 %                |
| Altezze di controllo diverse                | 18                  | 18                  |
| Famiglie · misure · pesi di testo           | 2 · 14 · 4          | 2 · 14 · 4          |
| Interlinee diverse                          | 24                  | 21                  |
| Stili di testo diversi                      | 71                  | 61                  |
| Raggi · spessori di bordo · ombre           | 4 · 3 · 11          | 4 · 3 · 12          |
| Colori testo · fondo · bordo                | 11 · 27 · 11        | 11 · 27 · 11        |
| Pulsanti: classi visive, varianti           | 22, 91              | 22, 84              |
| Schede (linguette): varianti                | 13                  | 12                  |
| Campi e menu a tendina: varianti            | 1 e 1               | 1 e 1               |
| Testi sotto il contrasto AA                 | 0 su 1176           | 0 su 1182           |

L'ombra in più è l'anello di 1 px del gruppo dei filtri nel dock, ora disegnato dentro la sua
scatola (prima era un bordo che faceva la prima riga di chip alta 42 px). Le altezze di controllo
restano 18: quelle fuori dai 40/48 px sono dell'app (PF nel dock 28, «Perché?» 32, pulsanti
icona dell'intestazione 42, «Addestrare Animali» su due righe 46) o di pezzi che si allungano
con la riga («Tutte» sulla striscia delle schede del telefono 57, caselle della fascia).

### Secondo giro di rifinitura (01/10/2026, dopo la quarta verifica)

Stesso strumento, stessi 20 stati; «prima» è il rapporto di `direction.css` delle 04:45 (l'«dopo»
del giro precedente), «dopo» è il file delle 11:20, senza modifiche dopo. Rapporti:
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-owlbear/r5/` (`audit-before/`,
`audit-after/`), copia del secondo in `round1/owlbear/final-audit.md`; numeri in
`round1/owlbear/final-audit.txt`.

| Misura (numeri del titolo del rapporto)     | Prima               | Dopo                |
| ------------------------------------------- | ------------------- | ------------------- |
| Elementi visibili                           | 2513                | 2513                |
| Spazi diversi (imbottiture, margini, spazi) | 23 (13 fuori scala) | 23 (13 fuori scala) |
| Spazi sulla griglia di 4 px                 | 97 %                | 97 %                |
| Altezze di controllo diverse                | 18                  | 18                  |
| Famiglie · misure · pesi di testo           | 2 · 14 · 4          | 2 · 14 · 3          |
| Interlinee diverse                          | 21                  | 21                  |
| Stili di testo diversi                      | 61                  | 58                  |
| Raggi · spessori di bordo · ombre           | 4 · 3 · 12          | 4 · 3 · 12          |
| Colori testo · fondo · bordo                | 11 · 27 · 11        | 11 · 27 · 11        |
| Pulsanti: classi visive, varianti           | 22, 84              | 22, 84              |
| Schede (linguette): varianti                | 12                  | 12                  |
| Campi e menu a tendina: varianti            | 1 e 1               | 1 e 1               |
| Testi sotto il contrasto AA                 | 0 su 1182           | 0 su 1183           |

Il peso 600 non c'è più (era su 26 testi); l'interlinea di 21 px passa da 215 a 76 testi (restano
solo testi dell'app a 14 px normale e le scritte SVG della mappa) e quella di 20 px da 169 a 333:
schede, chip, intestazioni di tabella, sottotitoli e segmenti scrivono tutti «14/20 medio» (129
testi). Il rapporto misura il primo schermo di ogni stato (e la scheda intera): gli spazi fra le
schede dell'Inizio sul telefono, sotto la piega, non entrano nel conteggio e sono misurati a parte
(sotto). Pulsanti col riempimento del browser (`1px 6px`, 13,33 px): nessuno, né nei 20 stati né
nell'Inizio e nella scheda fatti scorrere fino in fondo.

### Terzo giro di rifinitura (01/10/2026, dopo la quinta verifica)

Stesso strumento, stessi 20 stati; «prima» è il rapporto di `direction.css` delle 11:20:22 (quello
della quinta verifica, generato alle 11:57Z), «dopo» è il file delle 14:01:01, senza modifiche
dopo (rapporto generato alle 13:03Z, le 14:03 dell'orologio della macchina). Rapporti:
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-owlbear/r6/` (`audit-before/`,
`audit-after/`), copia del secondo in `round1/owlbear/final-audit.md`; numeri in
`round1/owlbear/final-audit.txt`.

| Misura (numeri del titolo del rapporto)     | Prima               | Dopo                |
| ------------------------------------------- | ------------------- | ------------------- |
| Elementi visibili                           | 2513                | 2517                |
| Spazi diversi (imbottiture, margini, spazi) | 23 (13 fuori scala) | 23 (13 fuori scala) |
| Spazi sulla griglia di 4 px                 | 97 %                | 97 %                |
| Altezze di controllo diverse                | 18                  | 18                  |
| Famiglie · misure · pesi di testo           | 2 · 14 · 3          | 2 · 14 · 3          |
| Interlinee diverse                          | 21                  | 21                  |
| Stili di testo diversi                      | 58                  | 57                  |
| Raggi · spessori di bordo · ombre           | 4 · 3 · 12          | 4 · 3 · 12          |
| Colori testo · fondo · bordo                | 11 · 27 · 11        | 11 · 27 · 11        |
| Pulsanti: classi visive, varianti           | 22, 84              | 22, 84              |
| Schede (linguette): varianti                | 12                  | 12                  |
| Campi e menu a tendina: varianti            | 1 e 1               | 1 e 1               |
| Pannelli: varianti                          | 43                  | 44                  |
| Testi sotto il contrasto AA                 | 0 su 1183           | 0 su 1184           |

I numeri del titolo cambiano poco perché questo giro corregge pezzi che stanno quasi tutti sotto la
piega o che il primo schermo non mostra (la scheda «Accesso rapido» compare solo dopo aver aperto
una scheda). Lo si vede negli usi: l'interlinea di 20 px passa da 333 a 441 testi, quella di 21 px
da 76 a 22 e quella di 18 px da 129 a 77 (testi 14 e 12 px della scheda e dell'Inizio sulla loro
riga di 20 px); lo stile «14/21 normale» passa da 52 a 12 testi, «12/18 normale» da 88 a 47. I
titoli delle schede sono 48 a 24/32 regolare e 26 a 18/24 medio (erano 42 e 30). Il pannello in
più è la scheda delle mosse speciali, che prima non era una scheda. Pulsanti col riempimento del
browser (`1px 6px`): nessuno nei 20 stati; sull'Inizio e sulle 7 schede della Scheda fatte
scorrere fino in fondo, a 1440 e 390, erano 2 (le borse dell'inventario), ora 0
(`probe-owlbear/r6/defaults/defaults.json`).

### Quarto giro di rifinitura (01/10/2026, dopo la sesta verifica)

Stesso strumento, stessi 20 stati; «prima» è il rapporto di `direction.css` delle 14:01:01 (quello
della sesta verifica, rapporto generato alle 14:01Z), «dopo» è il file delle 15:19:07, senza
modifiche dopo (rapporto generato alle 14:23Z, le 15:23 dell'orologio della macchina). Rapporti:
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-owlbear/r7/` (`audit-before/`,
`audit-after/`; differenze elemento per elemento in `rawdiff-before-after.txt`), copia del
secondo in `round1/owlbear/final-audit.md`; numeri in `round1/owlbear/final-audit.txt`.

| Misura (numeri del titolo del rapporto)     | Prima               | Dopo                |
| ------------------------------------------- | ------------------- | ------------------- |
| Elementi visibili                           | 2517                | 2517                |
| Spazi diversi (imbottiture, margini, spazi) | 23 (13 fuori scala) | 23 (13 fuori scala) |
| Spazi sulla griglia di 4 px                 | 97 %                | 97 %                |
| Altezze di controllo diverse                | 18                  | 18                  |
| Famiglie · misure · pesi di testo           | 2 · 14 · 3          | 2 · 14 · 3          |
| Interlinee diverse                          | 21                  | 21                  |
| Stili di testo diversi                      | 57                  | 55                  |
| Raggi · spessori di bordo · ombre           | 4 · 3 · 12          | 4 · 3 · 12          |
| Colori testo · fondo · bordo                | 11 · 27 · 11        | 11 · 27 · 11        |
| Pulsanti: classi visive, varianti           | 22, 84              | 22, 84              |
| Schede (linguette): varianti                | 12                  | 12                  |
| Chip ed etichette: varianti                 | 13                  | 12                  |
| Campi e menu a tendina: varianti            | 1 e 1               | 1 e 1               |
| Pannelli: varianti                          | 44                  | 44                  |
| Testi sotto il contrasto AA                 | 0 su 1184           | 0 su 1184           |

Anche qui il titolo del rapporto si muove poco: quasi tutto ciò che questo giro corregge compare
solo dopo aver aperto il Tavolo (la striscia «Torna al Tavolo»), sta sotto la piega (interruttori,
didascalie, chip delle proprietà) o fra 721 e 1100 px (l'appuntamento), che il rapporto non vede.
Negli usi: l'interlinea di 20 px passa da 441 a 465 testi e quella di 18 px da 77 a 61; lo stile
«12/18 normale» da 47 a 35 testi, tutti al Tavolo (vedi «Valori che restano fuori scala»); le
altezze delle etichette passano da 9 a 8 valori (nessuna etichetta alta 20 px; lo stato vitale e i
distintivi «Chiedi» sono alti 24 come le altre etichette); le caselle numeriche della Scheda sul
telefono passano da 100 a 96 px e i numeri grandi con la loro unità («9 m», «18 / 22», «/ 75 kg»,
«+6 scelte») stanno su una riga di 32 px invece di 35–36. L'altezza di controllo 22 diventa 26:
è l'interruttore unico, quello di Owlbear (42 × 26). Pulsanti col riempimento del browser
(`1px 6px`): nessuno nei 20 stati, e nessuno sull'Inizio e sulle 7 schede della Scheda fatte
scorrere fino in fondo, a 1440 e 390, dopo aver aperto il Tavolo (con la striscia «Torna al
Tavolo»: prima erano 1 per pagina).

### Sesto giro di rifinitura (01/10/2026, dopo la verifica del marchio e dei dettagli)

Stesso strumento, stessi 20 stati; «prima» è il rapporto di `direction.css` delle 19:44:31 (sha256
`b8ec71a6…`, il file della verifica indipendente; rapporto delle 20:22:29Z), «dopo» è il file delle
21:49:02 (sha256 `af55fc3248011b63ea9e7119240cfb0e8ede7504538889df269f6289b2f38c7d`), senza
modifiche dopo (rapporto delle 20:54:57Z, le 21:54:57 dell'orologio della macchina). Rapporti:
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/polish6-owlbear/` (`audit-before/`,
`audit-after/`; una corsa intermedia in `audit-iter1/`), copia del secondo in
`round1/owlbear/final-audit.md`; numeri in `round1/owlbear/final-audit.txt`.

| Misura (numeri del titolo del rapporto)     | Prima                      | Dopo                      |
| ------------------------------------------- | -------------------------- | ------------------------- |
| Elementi visibili                           | 2523                       | 2542                      |
| Spazi diversi (imbottiture, margini, spazi) | 24 (14 fuori scala)        | 24 (14 fuori scala)       |
| Spazi sulla griglia di 4 px                 | 97 %                       | 97 %                      |
| Altezze di controllo diverse                | 16                         | 16                        |
| Famiglie · misure · pesi di testo           | 1 · 13 · 3                 | 1 · 13 · 3                |
| Interlinee diverse                          | 19                         | 16                        |
| Stili di testo diversi                      | 55                         | 49                        |
| Misure delle icone                          | 7 (32 icone da 18 × 18 px) | 7 (4 icone da 18 × 18 px) |
| Raggi · spessori di bordo · ombre           | 4 · 3 · 12                 | 4 · 3 · 12                |
| Colori testo · fondo · bordo                | 9 · 26 · 9                 | 9 · 26 · 9                |
| Pulsanti: classi visive, varianti           | 23, 80                     | 23, 79                    |
| Schede · chip · voci di menu: varianti      | 12 · 12 · 2                | 12 · 12 · 2               |
| Campi e menu a tendina: varianti            | 1 e 1                      | 1 e 1                     |
| Pannelli: classi visive, varianti           | 13, 43                     | 12, 42                    |
| Testi sotto il contrasto AA                 | 0 su 1185                  | 0 su 1189                 |

Le interlinee scendono da 19 a 16 e gli stili di testo da 55 a 49: la scala sotto la mappa (12/18 sul
computer, 10/15 sul telefono), il movimento del dock (12/15,6) e l'etichetta «Formula libera» (14/21)
stanno ora sulla riga di 20 px. Le icone da 18 px passano da 32 a 4: i glifi della pillola dei
comandi della mappa sono a 20 px come quelli del dock, e i tre pulsanti di sicurezza sono 40 × 40
come gli altri (erano 42 × 40). Un pannello in meno: la seconda colonna degli strumenti ha la
superficie della prima. La corsa intermedia mostrava 25 spazi e 5 raggi: i 10 px di imbottitura di
«Mosse» e dei pulsanti di sicurezza e il raggio di 8 px delle righe dei turni, introdotti in questo
giro e riportati sulla scala (8 px di imbottitura con 40 px di larghezza minima, raggio denso di
12 px) prima delle schermate finali. Pulsanti col riempimento del browser (`1px 6px`): nessuno.
Contrasto: nessun errore, anche il #c9adff della pedina scelta sulla tinta lavanda.

## Controlli fatti (01/10/2026, sesto giro di rifinitura dopo la verifica del marchio e dei dettagli)

Punti aperti della verifica (`notes/open-items-round6.json`, «owlbear»; prove della verifica in
`…/visual-01/verify-brand-owlbear/`) e che cosa è cambiato. Tutto in `direction.css`: il blocco
«SIXTH POLISH ROUND» in fondo, più le regole del telefono cambiate dove sono definite (blocchi
OB-14 e OB-15 del giro dei dettagli), lo spostamento dell'ordine dei turni e due commenti. Misure in
px CSS, tema scuro, stati del kit di cattura; strumenti e prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/polish6-owlbear/`.

- **Striscia delle azioni sul telefono (medio, OB-14).** «Mosse» diventa un pulsante rotondo da
  40 px a sola icona, come gli altri comandi del dock sul telefono (l'app nasconde le loro parole
  allo stesso modo; il nome resta «Mosse speciali»): la striscia guadagna 38 px. La sfumatura copre
  gli ultimi 12 px (prima 24). A 390 px la striscia va da 8 a 184,7 (prima 146,6): il primo chip
  intero (8–138,3, il pallino del costo a 127,3–134,3 fuori dalla sfumatura, che parte a 172,7), il
  secondo tagliato sulla sua icona (icona 154,3–174,3, poi l'inizio delle parole sotto la
  sfumatura). A 360 px (8–154,7) il primo chip è intero e fuori dalla sfumatura, del secondo si
  vede l'inizio arrotondato; a 375 metà della sua icona; a 412 e 430 l'icona e parte delle parole
  (`p-rail-final/`, ritagli `table-combat-<larghezza>-owlbear-dock.png`).
- **Schede in basso (basso, OB-15).** Ogni scheda con i 12 px per lato di BottomNavigation e un
  minimo di 48 px (prima 8 px e i 58 dell'app), «Mappa» e «Tutti» attaccati alla striscia, la
  stessa sfumatura di 12 px. A 360 px «Combattimento» finisce intero prima della sfumatura (testo
  fino a 290,8, sfumatura da 292) e la scheda aperta resta libera; a 390 il taglio cade sull'icona
  di «Scena» con «Sc»; a 412 «Scena» si legge intera; a 375 e 430 il bordo cade nel margine vuoto
  della scheda seguente. Nessuna lettera isolata a nessuna di queste larghezze.
- **Pagine del dock (basso).** «Azioni» e «Barra rapida» a 796–836 e 844–884, le stesse righe dei
  chip (prima 798 e 842): 8 px fra le due pagine come fra le due righe.
- **Spazi sopra la mappa (basso).** L'ordine dei turni comincia a 128, 8 px dopo la seconda
  colonna (prima 132). La seconda colonna ha la superficie della prima, opaca: dove attraversa il
  bordo della mappa non si vede più la giunta fra pagina e disegno (`p-1440-a1/…-left.png`).
- **Pannello «Creatura» (basso).** «Danni, cure e condizioni», «Trasforma…» e «Creature collegate»
  a tutta larghezza (300 px, prima 218, 129 e 188), come «Scheda completa», «Inventario» e
  «Riposa». La sezione dopo la riga di «Ultima mossa» parte 16 px sotto il suo pulsante di testo e
  le condizioni perdono gli 8 px dell'app in alto: dall'inchiostro di «ULTIMA MOSSA» a «Cosciente»
  circa 29 px (prima circa 43), come fra le altre sezioni.
- **Angoli dell'anello sulla riga del turno (basso).** La prima e l'ultima riga dell'ordine dei
  turni hanno gli angoli esterni a 12 px (il raggio denso della scala): la tinta della riga attuale
  e l'anello di 3 px restano dentro gli angoli di 16 px dell'elenco (`p-initfocus/`, a 4×).
- **Striscia delle sezioni della Scheda sul telefono (basso).** La stessa sfumatura di 12 px del
  dock e delle schede in basso, che si toglie quando la tastiera è dentro: «Inv…» sfuma invece di
  tagliarsi di netto.
- **Un solo aspetto «scelto» (basso).** In «Pedine in scena» la pedina in focus è tinta lavanda al
  16 %, testo #c9adff, senza bordo (misurato aperto: `p-rows/`). Le regole del pulsante icona e del
  tasto (`kbd`) restano globali e sono documentate in `direction.css`: sono componenti, come i
  pulsanti; limitate alle superfici vestite, Campagne e Biblioteca mostrerebbero i quadrati da
  10 px dell'app sotto i pulsanti rotondi della barra in alto, e il campionario mostrerebbe due
  tasti diversi.

I-250, oltre ai punti sopra (rapporto e campionario, anche sotto la piega: scheda intera e Inizio
fatto scorrere): i pulsanti di sicurezza della pillola dei comandi 40 × 40 con glifi da 20 px come
il dock; il contatore della campanella come Badge di MUI (20 px, didascalia 12/20, peso 500; prima
17 px, 11 px grassetto); la scala sotto la mappa, il movimento del dock e «Formula libera» sulla
loro riga di 20 px. Campionario a metà giro e alla fine in `specimen-mid/` e `specimen-after/`
(1440 e 390): pannello «Creatura» con le azioni a tutta larghezza, ordine dei turni, dock. Nessun
pulsante col riempimento del browser negli stati del primo giro; contrasto AA senza errori.

Prove (cartelle sotto `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/`):

- Garanzie (`round1/owlbear/final-guard.txt`, 28 stati, tutti su `direction.css` delle 21:49:02):
  nessuno scorrimento orizzontale; testata del Tavolo su una riga a 390 e 412 (a 360 su due righe
  come in «Attuale»); dock alto 112 px a 1280 × 800, 1366 × 768 (fondo a 768), 1440 × 900,
  1500 × 900 e 1920 × 1080; «Termina turno» 148 × 56 (computer) e 150 × 40 (telefono);
  «Annulla preparazione» e «Annulla ultima modifica» visibili a 390; «Entra al Tavolo» a 629–677
  px a 390; nessuna etichetta di pulsante su due righe.
- Fuoco (`round1/owlbear/final-focus.txt`): anelli di 3 px #e0d0ff interi su «Mosse», le schede in
  basso, «Tutti», i pulsanti di sicurezza, le azioni del pannello, le righe dei turni (anche
  l'ultima), le righe di «Pedine in scena» (aperte), i pulsanti icona della barra; giro col tasto
  Tab su Inizio a 1440 e 390 e sulla Scheda a 1440 senza segnalazioni. Restano come nel giro dei
  dettagli: l'anello tratteggiato delle pedine in SVG; sul telefono la striscia delle sezioni e tre
  termini delle regole tagliano parte dell'anello quando Chrome lascia a metà un elemento già in
  parte visibile (`strip-focus/strip-focus.txt`: «Azioni» e «Note» non vengono fatte scorrere).
- `node --test design/blueprint/tests/*.test.mjs`: 2694 su 2694; `tests/visual01-directions.test.mjs`
  13 su 13; controllo statico (`polish6-owlbear/lint.json`): ogni regola col prefisso, nessun
  `!important`, nessun testo in `content`, nessuna trasformazione del testo, colori sotto la guardia
  del tema scuro; Prettier pulito su `direction.css` e questa pagina.
- Le 15 schermate del primo giro e il foglio dei contatti rifatti dopo l'ultima modifica (21:53,
  due processi alla volta) e aperti uno per uno; `manifest.json` 15/15 senza errori. Un primo giro
  di schermate (21:45) aveva due stati senza il foglio della direzione per un timeout di rete del
  server sotto carico: rifatti, poi tutta la serie rifatta dopo l'ultima modifica. Le 15 coppie in
  `round1/owlbear/_pairs/` rifatte alle 21:55–21:57 da quelle schermate, con le righe aggiornate
  (copia del generatore precedente in `_pairs/_work/build.before-r8.py`).

## Controlli fatti (01/10/2026, quarto giro di rifinitura dopo la sesta verifica)

Punti aperti della verifica (`notes/open-items-round4.json`, «owlbear») e che cosa è cambiato
(tutto in `direction.css`, blocco «FOURTH POLISH ROUND» in fondo, più un ritocco sul posto: la
regola degli spazi del gruppo offline non tocca più l'interruttore):

- **«Torna al Tavolo» senza vestito (medio).** Ora è la striscia informativa degli avvisi
  (bianco 5 % sulla pagina, didascalia grigia 12/20) sotto la barra in alto, sul suo stesso bordo
  (24 px sul computer, 20 fino a 1100 px); «Torna al Tavolo · Le lanterne di Bruma» è il pulsante
  di testo lavanda (maiuscoletto 20 px, 18 sul telefono, 8 px dentro e 8 fuori, peso 500, niente
  più riempimento del browser né peso 600); «La partita rimane aperta» è centrata sulla riga del
  pulsante (prima stava in alto nella fascia di 55 px). La fascia è alta 49 px
  (`probe-owlbear/r7/evidence/home-1440-tablereturn-before.png`, `-after.png`,
  `home-390-top-before.png`, `-after.png`).
- **Due disegni di interruttore (medio).** Ora uno solo, quello di Owlbear (MuiSwitch del
  bundle, O10): binario 42 × 26 con contorno di 1 px sulla carta scura, pallino di 24 px alto
  quanto il binario, 16 px di corsa; acceso, pallino lavanda su binario lavanda al 50 %. Vale per
  gli effetti (Benedizione, Anatema), «Disponibile offline», «Ispirazione eroica» in «Tiri», «Il
  DM può modificare questa scheda» e l'interruttore di base dell'app. Le etichette sono tutte 16 px
  regolari a 8 px dal binario (erano 400, 500 e 700, a 8, 12 e 16 px)
  (`evidence/switches-after.png`, `offline-block-after.png`; prima:
  `verify5-owlbear/sheet-1440-switches.png`).
- **Scheda laterale dell'Inizio a 1440 × 900 (basso).** Le novità sono righe d'elenco MUI (8 px
  sopra e sotto, la prima subito sotto la testata): il contenuto ora è alto 868 px come il
  riquadro fisso, quindi la scheda non scorre e i suoi 24 px in fondo si vedono
  (`evidence/home-1440-aside-before.png`, `-after.png`).
- **«Cosciente» in due misure (basso).** Lo stato vitale è un'etichetta di stato come «● Azione»
  accanto alle azioni: alta 24 px, 8 px dentro, pallino a 4 px, didascalia 12/20 regolare, uguale
  nella Scheda e al Tavolo (era 12/20 e 14/20 medio, alta 30 px)
  (`evidence/vital-sheet-after.png`).
- **Didascalie 12/18 sull'Inizio e nella Scheda (basso).** Tutte sulla riga di 20 px: «(la tua
  ora)», le righe dei personaggi e di «Accesso rapido», le righe delle discussioni, «al Tavolo
  (pedina)», «in mano», le fonti SRD, le note delle monete e dei PE; i distintivi V/S/M/C/R e
  «Chiedi» sono etichette piccole da 24 px; le proprietà delle armi («Versatile 1d8»,
  «Padronanza: Rovesciamento») sono chip contornati alti 40 px con 12 px dentro e testo 14/20
  medio (`evidence/badges-after.png`; prima: `shp-prop-before.png`, `ct-badge-before.png`,
  `spl-badge-before.png`). Sonda su Inizio e 7 schede, 1440 e 390: nessun testo 12/18
  (`cli/typo-sheet-owl7-final.json`, `typo-sheet-owl7ph-final.json`).
- **Titoli dell'Inizio che vanno a capo sul telefono (basso).** Uno spazio solo di 8 px fra il
  titolo e ciò che lo segue (erano 12, 8 e 0 px): «Accesso rapido», «Le tue campagne», «Ultime
  discussioni».
- **«Prossimo appuntamento» fra 721 e 1100 px (basso).** «Aggiungi al calendario» non ha più gli
  8 px di margine dell'app sopra il suo contenitore: a 800 e 1000 px i due pulsanti stanno sulla
  stessa linea; a 1440, dove sono uno sopra l'altro, li separa lo spazio di 8 px delle azioni.

I-250 sul campionario e sotto la piega (oltre ai punti sopra): campionario prima e dopo in
`probe-owlbear/r7/specimen-before/` e `specimen-after/` (1440 e 390): un solo interruttore, lo
stato vitale come le altre etichette accanto ai chip delle condizioni; i numeri grandi con la loro
unità nella fascia della Scheda, nelle strisce di Magie e Inventario stanno sulla loro riga di
32 px (la casella «Movimento» sul telefono passa da 100 a 96 px, sulla griglia di 8).

Prove (cartelle sotto `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/`):

- Garanzie (`round1/owlbear/final-guard.txt`, 28 stati e misure, tutti su `direction.css` delle
  15:19:07): nessuno scorrimento orizzontale; intestazione del Tavolo su una riga a 390; barra
  delle azioni alta 114 px a 1280 × 800, 1366 × 768 (fondo a 768), 1440 × 900, 1500 × 900 e
  1920 × 1080; «Termina turno» 148 × 56 (computer) e 150 × 40 (390); «Annulla preparazione» e
  «Annulla ultima modifica» visibili a 390; movimento intero nel dock; «Entra al Tavolo» fra 629 e
  677 px a 390 (678–726 con la striscia «Torna al Tavolo» aperta); nessuna etichetta di pulsante
  su due righe.
- Fuoco (`round1/owlbear/final-focus.txt`): i comandi toccati da questo giro (striscia, i cinque
  interruttori, chip delle proprietà, azioni dell'appuntamento e delle novità, azioni dei titoli)
  e il giro col tasto Tab su Inizio a 1440 e 390 e sulla scheda intera a 1440 (88, 88 e 90
  fermate): anelli da 3 px #e0d0ff, 0 segnalazioni; per gli interruttori con la casella nascosta
  l'anello sta sul binario, come nell'app.
- `tests/visual01-directions.test.mjs` 7/7; Prettier pulito su `direction.css`, `icons.mjs` e
  `SOURCES.md`; ogni regola con il prefisso della direzione e la guardia del tema scuro; nessun
  `!important`, nessun testo in `content`, nessuna trasformazione del testo.
- Le 15 schermate del primo giro e il foglio dei contatti rifatti dopo l'ultima modifica (15:21;
  la schermata dell'Inizio a 1440 rifatta alle 15:23 perché la prima aveva un'area aggiuntiva non
  caricata per un timeout di rete della macchina carica) e aperti uno per uno; `manifest.json`
  15/15 senza errori; le 15 coppie rifatte alle 15:24–15:27 da quelle schermate.

## Controlli fatti (01/10/2026, terzo giro di rifinitura dopo la quinta verifica)

Punti aperti della verifica (`notes/open-items-round3.json`, «owlbear») e che cosa è cambiato
(tutto in `direction.css`, blocco «THIRD POLISH ROUND» in fondo, più tre ritocchi sul posto):

- **«Accesso rapido» senza vestito (medio).** La scheda compare sull'Inizio dopo aver aperto una
  scheda personaggio. Ora ha la ricetta delle schede dell'Inizio: 24/32 px dal bordo (16 sul
  telefono), titolo h5 24/32 come le vicine, 16 px fra titolo e contenuto, l'aiuto grigio 14/20.
  Il testo parte a x = 80 come in ogni altra scheda a 1440 (era 72)
  (`probe-owlbear/r6/evidence/home-1440-recent.png`, `home-900-recent.png`, `home-390-recent.png`).
- **Due stili per i titoli delle schede (medio).** Ora la regola è per tipo di scheda, non per tag:
  ogni scheda della Scheda (un pannello di primo livello, le mosse speciali, le forme collegate) ha
  il titolo h5 24/32 regolare, come le schede dell'Inizio, 16 px sopra il contenuto; le schede
  elenco della colonna sinistra (Tiri salvezza, Sensi, Competenze, Abilità) e le sottosezioni
  dentro una scheda (Azione, Azione bonus, «Abilità aggiuntive», «Modifiche del DM…», «Movimento»
  delle mosse speciali) restano 18/24 medio; le etichette sopra i tratti della personalità e le
  note sono sottotitoli grigi 14/20 medio come «Trucchetti» e «Addosso» (erano maiuscoletto 16 px).
  Cambiano così «Tiri», «Reazioni», «Chi può modificare la scheda», «Dotazione iniziale», «Livelli
  e rifacimento», «Homebrew strutturato», «Forme e creature collegate»; «Reputazione e
  atteggiamenti» passa da 24/28,8 a 24/32. Le frasi dei giri precedenti che parlavano di «un solo
  stile per i titoli delle schede 18/24» erano false: corrette qui, nella tabella in alto e nella
  riga della scala delle 15 coppie.
- **Margine finale di 16 px (basso).** Ogni scheda finisce 24 px sotto l'ultima riga, come comincia
  sopra la prima (era 40 in «Azioni personalizzate», «Tiri», «Chi può modificare la scheda»,
  «Monete», «Esperienza», «Note», «Scelte future»…); «Dotazione iniziale» e «Livelli e
  rifacimento» avevano 16/18 px di imbottitura, ora 24 come le altre.
- **Spazio di 36 px fino a 1100 px (basso).** Ora 24 px fra la colonna e la scheda laterale (misurati a 900 e 390 px; la regola vale fino a 1100).
- **Azioni delle novità (basso, dichiarato).** Da 1101 px in su sempre su due righe, uguali in ogni
  novità; vedi «Differenze dichiarate».
- **Menu a tendina del Tavolo (basso).** Interlinea 24 e niente imbottitura sopra e sotto, come i
  campi di testo (erano «normal» e 4/12 px).
- **Coppie e schermate non aggiornate.** Le 15 schermate e il foglio dei contatti rifatti alle
  14:01–14:02, dopo l'ultima modifica delle 14:01:01; le 15 coppie rifatte alle 14:04–14:08 da
  quelle schermate (`_pairs/_work/build.py`, copia della versione precedente in
  `build.before-r6.py`).

I-250 sul campionario e sotto la piega (oltre ai punti sopra):

- le mosse speciali e le forme collegate stavano sulla pagina fra due schede, senza esserlo: ora
  sono schede come le vicine; la tabella delle mosse speciali ha la prima e l'ultima colonna sul
  bordo del testo della scheda, e sul telefono le schede della Scheda hanno i 16 px di MUI (con 24
  la tabella non ci stava e scorreva di lato dentro la scheda);
- «Apri al Tavolo» sotto le mosse speciali sta sempre su una riga sua (dentro la frase allungava
  l'ultima riga a 40 px); «Tiri» ha 16 px fra il titolo e il campo, come le altre schede;
- i pulsanti di testo che cominciano una riga nella Scheda stanno 8 px fuori, così l'etichetta è sul
  bordo del testo («Offline e sincronizzazione», «Annota magia concessa», «Impugna», «Registra
  materiale di valore», «Aggiungi» nella personalità, «Apri Appunti personali», «Apri la
  reputazione», «Vai alla campagna»): 8 righe che erano 8 px dentro;
- le condizioni attive (campionario; al Tavolo quando ce ne sono) erano tessere da 42 px con il
  bordo, 14/21 semigrassetto: ora i chip dei filtri, pillole alte 40 px, 14/20 medio, la
  concentrazione con l'anello lavanda dentro; la «×» per terminarla non ha più il riempimento del
  browser;
- **contrasto**: i livelli d'Indebolimento raggiunti avevano l'inchiostro scuro dell'app sulla
  carta della direzione (illeggibile; lo stato del campionario, non dei 20 stati del rapporto):
  ora ambra pieno con inchiostro scuro, come nell'app;
- i due pulsanti delle borse dell'inventario avevano il riempimento del browser e il bordo
  dell'app: ora pulsanti icona da 40 px senza bordo, come le altre azioni della riga;
- testi 14 e 12 px della Scheda e dell'Inizio sulla loro riga di 20 px (descrizioni delle azioni,
  etichette, righe dell'inventario, aiuti); il conteggio delle novità al peso medio.

Prove (cartelle sotto `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/`):

- Garanzie (`round1/owlbear/final-guard.txt`, 28 stati e misure, più la ripetuta dopo l'ultima
  modifica): nessuno scorrimento orizzontale; intestazione del Tavolo su una riga a 390; barra delle
  azioni alta 114 px a 1280 × 800, 1366 × 768 (fondo a 768), 1440 × 900, 1500 × 900 e
  1920 × 1080; «Termina turno» 148 × 56 (computer) e 150 × 40 (390); «Annulla preparazione» e
  «Annulla ultima modifica» visibili a 390; movimento intero nel dock; «Entra al Tavolo» fra 629 e
  677 px a 390; nessuna etichetta di pulsante su due righe.
- Fuoco (`round1/owlbear/final-focus.txt`): i comandi toccati da questo giro e 90 Tab su Inizio,
  scheda intera, inventario e Tavolo a 1440 e 390: anelli da 3 px #e0d0ff. Con le azioni delle
  novità su due righe la scheda laterale dell'Inizio scorre e due comandi al suo bordo perdevano un
  pezzo d'anello: ora 16 px di margine di scorrimento, 0 segnalazioni. Le segnalazioni rimaste
  (striscia delle schede che scorre sul telefono, termini delle regole nei paragrafi tagliati,
  pedine con l'anello SVG) sono le stesse di «Attuale» e dei giri precedenti.
- Campionario: `probe-owlbear/r6/specimen-before/` e `specimen-after/` (1440 e 390, 8 su 8 ok).
- Sonde della scheda (titoli, margini, spazi, pulsanti di testo, campi): `probe-owlbear/r6/cli/`
  (`*-before.json`, `*-after.json`, `*-final.json`).
- `tests/visual01-directions.test.mjs` 7/7; Prettier pulito su `direction.css`, `icons.mjs` e
  `SOURCES.md`; ogni regola con il prefisso della direzione e la guardia del tema scuro; nessun
  `!important`, nessun testo in `content`, nessuna trasformazione del testo.
- Le 15 schermate del primo giro e il foglio dei contatti rifatti dopo l'ultima modifica e aperti
  uno per uno; `manifest.json` 15/15 senza errori. Ogni sonda della scheda dà 16 px fra il titolo di una
  scheda e il suo contenuto, in tutte le 7 sezioni (`probe-owlbear/r6/cli/titlegap-1440-final.json`).

## Controlli fatti (01/10/2026, secondo giro di rifinitura dopo la quarta verifica)

Punti aperti della verifica e che cosa è cambiato (tutto in `direction.css`, blocco «SECOND
POLISH ROUND» in fondo, e l'interlinea dei sottotitoli sul posto):

- **Coppie per il proprietario non aggiornate (alto).** Rifatte tutte e 15 con
  `_pairs/_work/build.py` alle 11:25–11:28, dalle schermate delle 11:22 (dopo l'ultima modifica
  delle 11:20:22); ogni `_pairs/*.png` è più recente di `direction.css`. In `table-390.png` il
  movimento «■ 9 m» del dock ora si vede intero. Righe della scala aggiornate (97 %, un peso medio,
  un titolo di scheda) e una riga sul focus dell'ordine dei turni in `table-1440.png`.
- **Anello di focus tagliato nell'ordine dei turni (medio).** Da 721 px in su le righe
  disegnano l'anello di 3 px dentro (scostamento −3 px): intero su tutte e 5 le righe sia
  nell'elenco a 1440 × 900 sia nella riga di schede a 1280 × 800, nessun antenato lo taglia
  (`probe-owlbear/r5/focus-initiative-1440.png`, `focus-initiative-1280x800.png`). Correzione: la
  frase del giro precedente «nessuno tagliato dalla direzione» era sbagliata per queste righe.
- **Pulsanti delle novità nell'Inizio (basso).** 15 px + 1 px di bordo come ogni pulsante
  contornato (erano 12) e 8 px fra i pulsanti (erano 4/6); vedi «Differenze dichiarate» per
  «Segna come letta» che nella scheda stretta va sotto quando il pulsante è lungo.
- **I-250, sotto la piega.** Inizio sul telefono (e fino a 1100 px): le schede erano a 20, 20,
  16, 0, 28, 28, 28 px l'una dall'altra; ora tutte a 24 px, come sul computer. «Primi passi» era
  l'unica scheda con il bordo e senza ombra: ora come le altre, etichetta grigia in minuscolo.
  Scheda: le schede della colonna erano a 40–48 px l'una dall'altra (24 della griglia più il
  margine di ciascuna); ora 24 px. La scheda «Reazioni» aveva il titolo 40 px sotto il bordo: ora
  24 come le altre. Nella scheda «Tiri» il pulsante «Tira» toccava il campo: ora sta accanto a
  8 px (sotto, sul telefono); «Cambia…» è centrato sulla riga di «Politica dei tiri» (sul
  telefono sul bordo del testo, come «Apri al Tavolo»).
- **I-250, testi.** (Correzione del terzo giro: la frase che segue era falsa, le schede con il
  titolo in `h2` restavano 24/32 regolare; vedi «Terzo giro di rifinitura».) Un solo stile per i
  titoli delle schede (18/24 medio: Tiri salvezza, Sensi,
  Abilità, Tiri, Reazioni, «Chi può modificare la scheda», «Forme e creature collegate», il nome
  nel dock); 14/20 medio per schede, chip, intestazioni di tabella, sottotitoli («Trucchetti»,
  «Addosso»), segmenti dell'Indebolimento (ora medi come i gruppi a segmenti) e la pagina attiva sul
  telefono; il nome della stanza al peso dei titoli delle finestre (20/32 medio); 500 al posto di
  600 per «Novità precedenti», le risorse del turno e le scritte della mappa.

Prove (cartelle sotto `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/`):

- Garanzie (`round1/owlbear/final-guard.txt`, 28 stati e misure dopo l'ultima modifica): nessuno
  scorrimento orizzontale; intestazione del Tavolo su una riga a 390; barra delle azioni alta
  114 px a 1280 × 800, 1366 × 768 (fondo a 768), 1440 × 900, 1500 × 900 e 1920 × 1080, in
  combattimento e in esplorazione; «Termina turno» 148 × 56 (computer) e 150 × 40 (390);
  «Annulla preparazione» e «Annulla ultima modifica» visibili a 390; movimento intero nel dock;
  «Entra al Tavolo» fra 632 e 680 px a 390; nessuna etichetta di pulsante su due righe.
- Fuoco (`round1/owlbear/final-focus.txt`): Tab su Inizio, Scheda e Tavolo a 1440 e 390, i
  comandi del dock e le righe dell'ordine dei turni: anelli da 3 px #e0d0ff; gli unici casi
  segnalati (schede che la striscia del telefono fa scorrere, termini delle regole nei paragrafi
  tagliati) fanno lo stesso in «Attuale».
- Campionario: `probe-owlbear/r5/specimen-before/` e `specimen-after/` (1440 e 390).
- Inizio e scheda fatti scorrere fino in fondo: `probe-owlbear/r5/before-full/` e `iter4/`.
- `tests/visual01-directions.test.mjs` 7/7; Prettier pulito su `direction.css` e `SOURCES.md`;
  ogni regola con il prefisso della direzione e la guardia del tema scuro; nessun `!important`,
  nessun testo in `content`, nessuna trasformazione del testo.
- Le 15 schermate del primo giro e il foglio dei contatti rifatti dopo l'ultima modifica (11:22) in
  `round1/owlbear/` e aperti uno per uno; `manifest.json` 15/15 senza errori (la finestra
  dell'iniziativa rifatta una volta: il primo scatto aveva registrato un timeout di rete della
  macchina carica).

## Controlli fatti (01/10/2026, giro di coerenza dopo la terza verifica)

Punti aperti della verifica e che cosa è cambiato (tutto in `direction.css`, blocco «COHERENCE
ROUND» in fondo e pochi ritocchi sul posto):

- **Movimento nel dock a 390 (medio).** La riga delle risorse ora passa sotto l'inizio vuoto
  della cella delle schede «Azioni / Barra rapida» (che restano in fondo alla riga, a 12 px come
  i chip): «● ▲ ✦ ■ 9 m» si vede intero a 390 in combattimento, in esplorazione e da DM.
- **Dock oltre 120 px fuori da 1440 (medio).** Due righe di chip alte 40 px (la terza scorre dentro
  il dock, come le due righe da 44 px dell'app), il contorno del gruppo dei filtri disegnato dentro
  la sua scatola, e da 1500 px la scheda dell'identità si allarga del ritratto, così la riga sotto
  il nome resta una. Barra alta 114 px a 1280 × 800, 1366 × 768, 1440 × 900, 1500 × 900,
  1600 × 900 e 1920 × 1080, in combattimento e in esplorazione; fondo a 768 a 1366 × 768.
- **Intestazione del Tavolo su due righe a 390 (garanzia, trovato in questo giro).** Lo spazio di
  16 px fra «App», indietro e le icone valeva anche sul telefono e mandava le icone a capo; ora
  16 px solo dal computer, 4 px sul telefono: una riga (63 px) come «Attuale», in combattimento,
  esplorazione, da DM e con la finestra dell'iniziativa.
- **Pulsanti di testo che aprono una riga (basso).** Gli 8 px fuori anche per «Trova la mia
  pedina», gli oggetti da usare (ora uno per riga), «Cambia set» (sotto il set), «Monete e
  scorta» nel pannello, «Storico di condizioni e PF» e «Annulla ultima modifica» nella finestra
  delle condizioni, «Leggi il resoconto» e «Nascondi i primi passi» nell'Inizio; la riga d'aiuto
  delle pedine parte sul bordo del testo del pannello. Le azioni secondarie delle schede dell'Inizio
  («Tutte le campagne», «Segna tutte come lette», «Segna come letta») stanno sempre in fondo alla
  riga con l'etichetta sul bordo destro, anche quando vanno sotto il titolo, e non si spezzano più
  su due righe.
- **«Ispirazione eroica» su due righe (basso).** Lasciata (vedi «Differenze dichiarate»).
- **I-250, stessi pezzi uguali.** Una sola ricetta per le schede (48 px, 12/16 px, body2 medio,
  minuscolo) per Inizio, scheda e «Tutte»; i pulsanti contornati tutti a 15 px ai lati («Avvia
  combattimento» dal computer, «Applica» nel menu della pedina); il menu della pedina con un solo
  bordo del testo (PF, aiuto, voci a 12 px dal bordo); la scheda laterale dell'Inizio sul bordo del
  testo di 32 px delle schede accanto (16 sul telefono), con la prima linguetta allineata; le
  finestre sul telefono con titolo, testo e azioni a 16 px; un solo spazio di 24 px fra le schede
  dell'Inizio anche sul telefono e sotto i titoli di pagina e il percorso della scheda; pagine
  principali sul telefono a 14 px (erano 13).
- **I-250, testi.** Titoli di sezione 24/32, titolo della condivisione 18/24, nome della stanza
  20/32, PF nel dock 12/20 a ogni larghezza, parole delle risorse 12/20, un solo peso medio (500)
  dove l'app scriveva 600 (stato vitale, «Disponibile offline», tasti), «Addosso» come gli altri
  sottotitoli, numeri delle caselle di riepilogo 24/32 anche sul telefono, segmenti
  dell'Indebolimento a 14 px ovunque, celle delle tabelle della scheda in body2, la scheda di stato
  della finestra delle condizioni come il pozzo scuro delle finestre di Owlbear con le etichette
  grigie della scheda.
- **I-250, spazi.** Interruttori degli effetti alti 40 px senza i 6 px dell'app, termini delle
  regole senza 1 px ai lati, l'icona di «Offline e sincronizzazione» a 8 px dall'etichetta (non
  8 + 6), il pannello sul telefono 8 px sotto il dock (non 10), le parti dell'intestazione della
  scheda sul telefono a 16 px (non 10).
- **Fuoco.** Il filtro del dock e i pulsanti tondi del binario (comprimi, tutti i pannelli, vai
  alla mappa) disegnano l'anello di 3 px dentro, come i chip e le schede del binario, perché la
  scatola che scorre tagliava quello esterno.

Prove (cartelle sotto `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/`):

- Garanzie (`round1/owlbear/final-guard.txt`, 28 stati e misure dopo l'ultima modifica): nessuno
  scorrimento orizzontale; intestazione del Tavolo su una riga a 390; barra delle azioni alta
  114 px a ogni larghezza da 1280 a 1920; «Termina turno» 148 × 56 (computer) e 150 × 40 (390);
  «Annulla preparazione» e «Annulla ultima modifica» visibili a 390; movimento intero nel dock a
  390; «Entra al Tavolo» fra 632 e 680 px a 390; nessuna etichetta di pulsante su due righe.
- Fuoco (`round1/owlbear/final-focus.txt`): 88–90 pressioni di Tab su Inizio, Scheda e Tavolo a
  1440 e 390 e i controlli del dock: anelli da 3 px #e0d0ff, nessuno tagliato dalla direzione. Le
  schede della scheda a 390 che restano in parte fuori dalla loro striscia quando la si fa scorrere
  fanno lo stesso in «Attuale» (scorrimento dell'app).
- Campionario: `probe-owlbear/r4/specimen-before/` e `specimen-after/` (1440 e 390).
- `tests/visual01-directions.test.mjs` 7/7; Prettier pulito su `direction.css` e `SOURCES.md`;
  ogni regola con il prefisso della direzione e la guardia del tema scuro; nessun `!important`,
  nessun testo in `content`, nessuna trasformazione del testo.
- Le 15 schermate del primo giro e il foglio dei contatti rifatti dopo l'ultima modifica (04:45) in
  `round1/owlbear/` e aperti uno per uno; `manifest.json` senza errori.

## Controlli fatti (01/10/2026, giro di correzioni dopo la seconda critica)

Punti della critica indipendente e che cosa è cambiato (tutto in `direction.css`):

- **OB2-01 focus sulla pedina.** Il blu resta solo per la selezione col mouse; con il tasto Tab la
  pedina mostra l'anello tratteggiato da 3 px nel colore di focus (#e0d0ff) con un filo blu notte
  per le mappe chiare (misurato su Doran: tratto `rgb(224, 208, 255)`, 3 px, 5/3).
- **OB2-02 campo dei punti ferita nel pannello.** «Cura», importo e «Danno» non dipendono più
  dalla scheda: ovunque pulsanti contornati verde e rosso e campo a pillola da 16 px (niente più
  fondo #3b3b3b del browser).
- **OB2-03 etichette a capo.** Striscia dell'Inventario in due colonne (nessun comando su due
  righe, «Regola d'ingombro» su una riga); «Scheda completa», «Inventario», «Riposa» in colonna a
  tutta larghezza; menu della pedina largo 360 px (ogni voce alta 40 px). L'unica etichetta su due
  righe rimasta è «Ispirazione eroica» (vedi «Differenze dichiarate»).
- **OB2-04 righe degli elenchi.** L'etichetta è centrata nella riga (FOR, stella e valore sulla
  stessa linea); pozzo che sporge 8 px e rientra le righe di 8 px, così stelle, titoli e valori
  stanno a 16 px dai bordi; «Abilità aggiuntive» allineato al suo testo, 24 px sotto il pozzo.
- **OB2-05 scala degli spazi.** Imbottiture, margini e spazi dell'app sui pezzi vestiti portati
  sui gradini 4/8/12/16/24/32/40/48: da 42 valori (54 % sulla griglia di 4 px) a 29 valori (96 %).
- **OB2-06 pulsanti di testo.** Un'unica imbottitura (8 px, nessun contorno, larghezza minima
  40 px); quelli che aprono un blocco stanno 8 px fuori, così l'etichetta parte sul bordo del
  testo (← Personaggi, Ultima mossa, + Condizione, Registra concentrazione, Gestisci sensi, i
  comandi dell'Inventario, le azioni della scheda sul telefono, «Riposi» sul telefono). Una sola
  misura di pulsante per larghezza, più i due punti piccoli dichiarati.
- **OB2-07 campi.** Tutti i campi e i menu a tendina a 16 px con 12 px dentro (d20
  dell'iniziativa, formula, «Digitali», ricerca, importo); etichette delle caselle tutte a 16 px.
- **OB2-08 Inizio.** Un solo spazio di 24 px; «Prossimo appuntamento» alto quanto la stanza, con
  le azioni in fondo (sparito il vuoto di 185 px); sul telefono titolo della scena a 24 px e testo
  a 16 px dal bordo.
- **OB2-09 fascia della scheda.** Etichette tutte sulla stessa riga (370 px), numeri sulla stessa
  linea (inchiostro a 410 ± 2 px, stella compresa), gruppi Gioco/Modifica e Dadi alti 40 px,
  Iniziativa/CA/Difese con la stessa grammatica (CA senza il piede in più); striscia delle Magie
  come quella delle caratteristiche.
- Anche: chip del dock alti 40 px come le schede accanto; ogni `summary` e il valore dei punti
  ferita della scheda con l'anello di 3 px; il pannello laterale lascia 16 px quando porta in
  vista un comando.

Prove (cartelle sotto `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/`):

- Garanzie su tutti e 10 gli stati a 1440 e 390 (`round1/owlbear/final-guard.txt`): barra delle
  azioni alta 114 px a 1440 × 900; «Termina turno» 148 × 56 (1440) e 150 × 40 (390) su una riga;
  «Annulla preparazione» e «Annulla ultima modifica» visibili a 390; nessuno scorrimento
  orizzontale; «Entra al Tavolo» a 638–686 px a 390; la barra delle azioni non si ripiega (parole
  delle risorse e «Dadi» visibili) nei quattro stati del Tavolo a 1440.
- Focus (`round1/owlbear/final-focus.txt`): 70 pressioni di Tab su Scheda, Tavolo, Inizio e
  finestra dell'iniziativa: tutti gli anelli da 3 px #e0d0ff, nessuno tagliato.
- Misura della scala: tabella sopra (`probe-owlbear/r3/audit-final/`).
- Tema chiaro: Inizio e Scheda identici ad «Attuale» salvo la scritta del selettore «Direzione»;
  al Tavolo cambiano solo l'arte d'esempio condivisa (mappa e ritratti), non questa direzione
  (`probe-owlbear/r3/light/`).
- `tests/visual01-directions.test.mjs` 7/7; Prettier pulito su `direction.css` e `SOURCES.md`;
  ogni regola con il prefisso della direzione; nessun `!important`.
- Tutte le schermate rifatte e aperte una per una, coppie rifatte in `round1/owlbear/_pairs/`.

## Controlli fatti (01/10/2026, stati in più e scala unica)

- Barra delle azioni alta 116 px a 1440 × 900 (limite 120); «Termina turno» 148 × 56 px su una
  riga e visibile; a 390 «Termina turno» (150 × 40), «Annulla ultima modifica» e «Annulla
  preparazione» visibili, anche in esplorazione. Nessuno scorrimento orizzontale nei dieci stati a
  1440 e a 390 (finestra dell'iniziativa e menu della pedina compresi). «Entra al Tavolo» a
  645–693 px su 844 a 390.
- Avviso del DM: a 1440 × 900 300 × 120 px in alto a destra, nessuna pedina coperta; a 390
  318 × 100 px tra la fine della scena (429 px) e la pillola dello zoom (580 px), a destra della
  colonna del gruppo; «Avvia ora» e «Non ora» 40 px, prova del punto premuto «ok» su entrambi i
  bordi.
- Ordine dei turni a 1440 × 900: elenco 200 × 216 px, righe da 40 px, nessuna pedina coperta.
- Obiettivi sotto i 40 px: gli stessi di «Attuale» (controlli della striscia di prova, PF nel dock
  115 × 28, «Reazioni» 36 × 40, «Perché?» 51 × 32, caselle di spunta 20 × 20 dentro etichette alte
  40 px). Righe del menu della pedina 40 px (44 sul telefono), campo dei PF 40 px.
- Anello del fuoco 3 px #e0d0ff su tutti i controlli provati da tastiera: finestra dell'iniziativa
  (Tab), Magie, Inventario, voci del menu della pedina (frecce), riepiloghi «Visualizzazione…» e
  «Perché?».
- Contrasto (strumento di misura I-250): 0 testi sotto AA su 1180 misurati. Corretti in questo giro:
  la scheda «Azioni» aperta del dock (4,28:1 → lavanda più chiara) e il simbolo dei punti di
  viaggio del DM (era dello stesso colore della bolla).
- Test Node: 2688 su 2688 passano (anche quello delle direzioni: prefisso, niente `!important`).
- Tema chiaro, alto contrasto, carattere leggibile, colori per daltonismo, movimento ridotto: ogni
  regola nuova ha lo stesso prefisso «solo tema scuro» delle altre.
- Prove: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round1/owlbear/`
  (`final-guard.txt`, `final-focus.txt`, `final-audit.txt`, `manifest.json`) e
  `…/probe-owlbear/r2/`.

## Controlli fatti (30/09/2026, dopo le correzioni)

- Barra delle azioni alta 116 px a 1440 × 900 (limite 120); a 1366 × 768 finisce a 768.
  «Termina turno» su una riga (152 × 56 px) e visibile a 1440 × 900, 1440 × 800, 1366 × 768,
  1280 × 800 e 1024 × 800. «Termina turno», «Annulla ultima modifica» e «Annulla preparazione»
  visibili a 390; binario delle schede attaccato sotto la barra (628 + 152 = 780, fondo a 844).
  Nessuno scorrimento orizzontale a 390 su Inizio, Scheda e Tavolo. «Entra al Tavolo» a 653–701 px
  su 844 a 390. Obiettivi sotto i 40 px: gli stessi di oggi con «Attuale» (solo i controlli della
  striscia di prova e due già piccoli oggi).
- Ordine dei turni a 1440 × 900: elenco 200 × 216 px, nessuna pedina coperta, anche con la scheda
  della scena su due righe; con 11 combattenti finti l'elenco si ferma a 258 px e scorre; a
  1920 × 1080 nessuna pedina coperta. Sotto 1440 × 860 la riga in alto non copre pedine a
  1366 × 768, 1440 × 800 e 1024 × 800 (a 1280 × 800 tocca la Sentinella, come oggi).
- Avviso «Sessione non avviata» del DM a 390 (superato il 01/10: ora ai piedi della mappa): sotto i ritratti dei turni; la prova del punto
  premuto dà «ok» su entrambi i bordi di «Avvia ora» e «Non ora». A 1440 × 900 lo stesso.
- Anello del fuoco da tastiera: 3 px lavanda chiaro (#e0d0ff) sui controlli provati con Tab; sui
  pulsanti del dock (per esempio «Bastone ferrato») ora è disegnato dentro il pulsante e si vede
  intero.
- axe-core 4.13, sola regola `color-contrast`: 0 violazioni su 8 stati (tre superfici, giocatore e
  DM al Tavolo, 1440 e 390). Rapporti calcolati sui colori resi: azioni lavanda dell'avviso
  4,7–5,2:1, pulsanti di testo lavanda 5,4–6,5:1, riga del turno attuale 8,1:1 (bianco) e 5,7:1
  (#e0d0ff), inchiostro di «Termina turno» 7,9:1, ✓ della competenza 6,5:1.
- Prove e numeri: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-owlbear/fix/`
  (`guard-owlbear.txt`, `guard-current.txt`, `axe.txt`, `contrast.txt`, `tests.txt`).

## Licenze e attribuzioni

### Immagine della stanza (Inizio)

| File                                                  | Origine                                                                                                                                                                                                                                                          | Licenza                                  | Autore                                                                                                             | sha256                                                             | Modifiche                                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `assets/room-lanterns.webp` (1672 × 941, 98 712 byte) | `~/Workspace/Codex/d20-studio-visual-assets/candidates/plates/campaign-backdrop.webp`, a sua volta `~/Workspace/d20-folio/public/assets/backgrounds/campaign-backdrop.webp` (d20 Folio, main `5b7f2a8b`); riga 29 di `candidates/MANIFEST.md`, verdetto **SAFE** | Arte originale generata dal proprietario | Il proprietario, con gpt-image tramite ChatGPT (C2PA nel master `masters/d20-folio/images_d20folio/PROMPT_16.png`) | `025a6ad7d9ae94e705dd470f1ab3361634436a0ad8ed4bc8c8c226ae90b20e07` | Nessuna: copia identica, solo rinominata. Il ritaglio quadrato è fatto dal CSS |

### Carattere

Roboto è già nel repository (`assets/fonts/roboto/`, Fontsource 5.3.0, SIL Open Font License 1.1,
«Copyright 2011 The Roboto Project Authors», riga in `assets/ATTRIBUTION.md`). Questa direzione
lo dichiara con `@font-face` e non aggiunge altri caratteri.

### Icone

Glifi di Google «Material Icons Round» (24 px) e, per le spade, «Material Symbols Rounded»
(riempimento 1, peso 400), dal repository ufficiale
<https://github.com/google/material-design-icons> al commit
`bd8cb85bd4bad964fe6918f79665bb40c3a8efef` (25/09/2026). Licenza **Apache License 2.0**
(<https://github.com/google/material-design-icons/blob/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/LICENSE>,
sha256 `58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd`).

Attribuzione: «Material Icons e Material Symbols © Google LLC, Apache License 2.0».

Modifiche: tolti solo i tracciati invisibili del riquadro 24 × 24 e i gruppi vuoti; ogni tracciato
disegnato è identico all'originale. I glifi di `icon()` sono dentro `icons.mjs`; quelli usati come
maschera CSS sono file in `assets/icons/` (tabella più sotto).
`sword` e `swords` usano lo stesso glifo; `coins` e `image` tengono l'icona dell'app (non compaiono
su queste superfici).

| Nome nell'app | Glifo            | Set                               | Fonte (URL, commit fissato)                                                                                                                                               | sha256 del file sorgente                                           |
| ------------- | ---------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `home`        | `home`           | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/home/materialiconsround/24px.svg>                     | `f23b0d3af5857e4754dd2621201e3f71db1037754aacb28f4b32b8557f465f82` |
| `person`      | `person`         | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/social/person/materialiconsround/24px.svg>                   | `1515d7168025dcb3857eb3613a471727725023e47ae7882b5577f9af9d86db3c` |
| `campaign`    | `folder`         | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/file/folder/materialiconsround/24px.svg>                     | `c5b78ff2b10a4c79e291288dc8bac422904c23fa7dafa76e58f74de2bb22350c` |
| `book`        | `menu_book`      | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/maps/menu_book/materialiconsround/24px.svg>                  | `437da11a4f40e37f0dee2069dbad9a73191a2d9bc1da17edbd051ed571e0c5e0` |
| `search`      | `search`         | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/search/materialiconsround/24px.svg>                   | `5232ac9f70e85eb937491da68e4364f0e4b419603315084d728b554753ce4173` |
| `note`        | `sticky_note_2`  | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/sticky_note_2/materialiconsround/24px.svg>            | `c8a0cbd891939efc5eaad414531e3736c5eb46d7027cbce4957647df375c80ee` |
| `bell`        | `notifications`  | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/social/notifications/materialiconsround/24px.svg>            | `bb6532a6f92e2d811f8fad3ee25eaa92a0db7824b2028713fd63365b965deb1c` |
| `settings`    | `settings`       | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/settings/materialiconsround/24px.svg>                 | `eb96a784975ee5908f123ee3cefc9707f7f1b150c764fda77aaa6a2e144034ce` |
| `help`        | `help`           | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/help/materialiconsround/24px.svg>                     | `eef9203b3c19d2b583c5552fe3ff7e1deaa4bc7cce8bebf2db9b62472c992a79` |
| `check`       | `check`          | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/navigation/check/materialiconsround/24px.svg>                | `cf161a591c0e58fc7248ef0b74c08c53abb8805f519f4023658a4811b397b250` |
| `play`        | `play_arrow`     | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/av/play_arrow/materialiconsround/24px.svg>                   | `0d301d26b3fb2a480b8031d681e6854d4160cf5ba5b0505fe0ff32b24eb32abb` |
| `map`         | `map`            | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/maps/map/materialiconsround/24px.svg>                        | `4154a37b907e850fc230cb08a964f7bcfbd1cf5f85ada444d8a76d1da7bb9d58` |
| `clock`       | `schedule`       | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/schedule/materialiconsround/24px.svg>                 | `2e80aa02c4bdd45b90fe052812bc17c75e26640c0c525400b50b7b68661afb90` |
| `pen`         | `edit`           | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/image/edit/materialiconsround/24px.svg>                      | `6b8c622a369fa47afd0c5c4f97ca750f49a7ee5120ff08976662bdaebc7f074d` |
| `plus`        | `add`            | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/content/add/materialiconsround/24px.svg>                     | `a311382c00e237f57d27f61cfa440607d0a2acacd6cf0babfa6da230637b4f7a` |
| `dice`        | `casino`         | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/places/casino/materialiconsround/24px.svg>                   | `2b6bcf6132857fcd6716abccb41d9ef78a5b98e229af3d1287441b763ce5edd2` |
| `grid`        | `grid_view`      | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/file/grid_view/materialiconsround/24px.svg>                  | `6c72842e8d178bc1fc0f599e0445f35bd5a1a9a0d1ab613be0803bbc25c685f7` |
| `menu`        | `menu`           | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/navigation/menu/materialiconsround/24px.svg>                 | `3fd8c09c361e3a9a219ba77d43a81bc0b878ce2dd7fcf2319d16a279c2312d8d` |
| `arrow`       | `arrow_back`     | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/navigation/arrow_back/materialiconsround/24px.svg>           | `7a1e043518c090ca955c282d46416d69e2988c38bcc780a714174dfc4f258a51` |
| `move`        | `pan_tool`       | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/pan_tool/materialiconsround/24px.svg>                 | `c3b9f33c57777ad3af9c1d4322a9ed14b0760e0ab17b2b6c096a82edd61040e7` |
| `ruler`       | `square_foot`    | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/content/square_foot/materialiconsround/24px.svg>             | `d338eee7158a8aa0ad1c6470b78a7d0c869c9f430025a46794342086351b9248` |
| `eye`         | `visibility`     | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/visibility/materialiconsround/24px.svg>               | `70ac3541867449449fb9349f615fbd63efc74c49dfbdfa3e0036b84969201950` |
| `shape`       | `change_history` | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/change_history/materialiconsround/24px.svg>           | `d2b00c6516e02512841b7f521e907c810b3fb0a1373e01e2c0768c15dab91171` |
| `flag`        | `flag`           | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/content/flag/materialiconsround/24px.svg>                    | `e2518d8acb40c18340501ce90c646d344c0b88a55113004595208b0f139bdbe8` |
| `undo`        | `undo`           | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/content/undo/materialiconsround/24px.svg>                    | `ea13eda95cb98ca08336bacb503f7715ba951f513fbcf9911b7b93ca279490fe` |
| `bag`         | `backpack`       | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/places/backpack/materialiconsround/24px.svg>                 | `abb88e638331f13d63bfc3c2c233ef3bb452850f94ce670d37e107c821431cb2` |
| `light`       | `lightbulb`      | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/lightbulb/materialiconsround/24px.svg>                | `cfa70f27a11b5701f09b763691446c8b7c0ea131770ceda172bf69ea11b32e92` |
| `panel`       | `view_sidebar`   | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/view_sidebar/materialiconsround/24px.svg>             | `d032dffc49197c3464d5718cfd0f5ec402bf6e74064d0790ae42034a48848630` |
| `chat`        | `chat`           | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/communication/chat/materialiconsround/24px.svg>              | `79470e289efb7e77471527c854b544fa71d99e98b1aabeefe444fce0a32aaf7c` |
| `scroll`      | `history_edu`    | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/social/history_edu/materialiconsround/24px.svg>              | `aa315d70d9bc1fdf28fb63443559e4480b51ab20d8aede2e8f7d5fca3400be57` |
| `cards`       | `style`          | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/image/style/materialiconsround/24px.svg>                     | `d5f31245c347d75c3865099b6ce7b7b018cb67da141c81b8d18ccafb2b931078` |
| `close`       | `close`          | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/navigation/close/materialiconsround/24px.svg>                | `6fb01baa102914c6905e73f1adcd78a4409a0d8ea7873d6c23a573707231a837` |
| `fog`         | `cloud`          | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/file/cloud/materialiconsround/24px.svg>                      | `3d123c4af97beff4ce2ff047abee8aba4cf03816743c40b07d843d6a84aad601` |
| `wall`        | `fence`          | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/places/fence/materialiconsround/24px.svg>                    | `03c1d33f76be6f04814ad33577aa86b3b9c40626b2068a84d3045e25c07ebb76` |
| `shield`      | `shield`         | Material Icons Round              | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/content/shield/materialiconsround/24px.svg>                  | `55a95cce8e1672ed86f19fa22472e9c13c0b57ab7b186410e79ea1ca24e76179` |
| `swords`      | `swords`         | Material Symbols Rounded (fill 1) | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/symbols/web/swords/materialsymbolsrounded/swords_fill1_24px.svg> | `bf22a72dc7b0ea47f44d4dd554f71528a89d1968cc2e79bdba72530326c6f3c2` |
| `sword`       | `swords`         | Material Symbols Rounded (fill 1) | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/symbols/web/swords/materialsymbolsrounded/swords_fill1_24px.svg> | `bf22a72dc7b0ea47f44d4dd554f71528a89d1968cc2e79bdba72530326c6f3c2` |

### Glifi usati come maschera CSS (`assets/icons/`)

Per i pochi simboli che l'app disegna da sé (non passano da `icon()`), `direction.css` li
sostituisce con una maschera CSS: il pulsante resta lo stesso, cambia solo il disegno. I file sono
glifi «Material Icons Round» dallo stesso repository e commit, con la stessa licenza e le stesse
modifiche (tolti solo il riquadro invisibile e i gruppi vuoti).

| File                                   | Dove                                 | Glifo                 | Fonte (URL, commit fissato)                                                                                                                                           | sha256 del file sorgente                                           |
| -------------------------------------- | ------------------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `assets/icons/person_search.svg`       | mappa: «Trova la mia pedina»         | `person_search`       | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/communication/person_search/materialiconsround/24px.svg> | `3cc92028c6cef1d6c5efda09ae0bd167d01fe6c41753b29fae32ae21769dc24c` |
| `assets/icons/center_focus_strong.svg` | mappa: «Centra la scena»             | `center_focus_strong` | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/image/center_focus_strong/materialiconsround/24px.svg>   | `2942a1249e9a451e63ab53af4c58027fe4533a60d49c7ac4520ea36c7cd1f671` |
| `assets/icons/disabled_by_default.svg` | pillola: «Stop · carta X»            | `disabled_by_default` | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/disabled_by_default/materialiconsround/24px.svg>  | `a4f3db393b3f7351bda485698d801c63268840425d64bfb0c84fc102c60327c0` |
| `assets/icons/drag_handle.svg`         | pillola: «Rallenta»                  | `drag_handle`         | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/editor/drag_handle/materialiconsround/24px.svg>          | `8df79917244292ab660329cfeaafdf23e78f3747a235d020ef9496520e7bc310` |
| `assets/icons/back_hand.svg`           | pillola: «Alza la mano»              | `back_hand`           | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/social/back_hand/materialiconsround/24px.svg>            | `9049f4a67cae18975e8c41955c6a48bea7814b91b3485b44627efe5030f3bd52` |
| `assets/icons/expand_more.svg`         | pillola: freccia del menu «Sessione» | `expand_more`         | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/navigation/expand_more/materialiconsround/24px.svg>      | `d503ad25d88781121414e923f4dc1fe1148c674064988d3537ec246c86f9958b` |
| `assets/icons/sports_martial_arts.svg` | dock: «Mosse»                        | `sports_martial_arts` | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/social/sports_martial_arts/materialiconsround/24px.svg>  | `b7c0f801d1bcfe63af4dae58f5e5c2dc6b96769a798a5a6aee9103e7610ea817` |
| `assets/icons/check.svg`               | scheda: competenza                   | `check`               | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/navigation/check/materialiconsround/24px.svg>            | `cf161a591c0e58fc7248ef0b74c08c53abb8805f519f4023658a4811b397b250` |
| `assets/icons/done_all.svg`            | scheda: maestria                     | `done_all`            | <https://raw.githubusercontent.com/google/material-design-icons/bd8cb85bd4bad964fe6918f79665bb40c3a8efef/src/action/done_all/materialiconsround/24px.svg>             | `046866a06985e230d9e3841739c7a0b8e38cb721596f760f0c93047d90f8b7a5` |

**Testo della licenza nel repository.** `LICENSE-material-design-icons.txt` in questa cartella è
il file `LICENSE` del repository di Google allo stesso commit, copiato senza modifiche (sha256
`58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd`), come chiede la sezione 4(a)
della licenza Apache 2.0. La riga di attribuzione è in `design/blueprint/assets/ATTRIBUTION.md`
(tabella «Direction-specific files and icons», riga `owlbear`: «Google Material Symbols / Icons
(Apache-2.0)»), aggiunta dal coordinatore; questa pagina resta l'elenco completo dei glifi.
La casella di spunta della direzione usa lo stesso `assets/icons/check.svg` già elencato.
