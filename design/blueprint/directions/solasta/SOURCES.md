# Opzione 5 · Solasta — fonti, coppie e licenze

Direzione di prova della Fase C, giro 1 («Scelta 1 — Direzione», I-248), id `solasta`. Copia
_Solasta: Crown of the Magister_ (Tactical Adventures, versione 1.0 del 2021 e i suoi DLC);
_Solasta II_ non è usato. Si accende solo in locale con `?direction=solasta`; il tema chiaro
resta quello di oggi. Data: 01/10/2026.

## In tre righe

1. Copia l'interfaccia di Solasta, l'opposto di BG3: lastre piatte e opache con angoli vivi e
   senza ombre, linee sottili più chiare fra le parti, ardesia blu nel combattimento e
   carbone caldo nei menu, accenti rame, ghiaccio e verde acqua, nessun metallo né doratura.
2. Al Tavolo i turni sono una fila di grandi ritratti divisi da righe verde acqua (nemici su
   rosso sangue), le azioni sono grandi riquadri quadrati con un pittogramma bianco sopra
   un'etichetta in maiuscolo, colorati per famiglia, con «Termina turno» come riquadro verde.
3. Si sente come un gioco da tavolo con le miniature: ordinato, leggibile, poche cose grandi;
   i nomi propri in un serif grassetto in maiuscoletto, ogni comando e ogni titolo di sezione
   in maiuscolo spaziato, la pagina Inizio come «New Adventure» di Solasta (immagine della
   campagna col nome sul bordo, busto del personaggio) con la colonna di righe del menu.

## Elemento → prodotto copiato → fonte

Riferimenti fuori dal repository, in `~/Workspace/Codex/d20-studio-visual-assets/references/solasta/`
(`facts.md` per i valori misurati, `manifest.md` per gli indirizzi). Le immagini sono solo
riferimento: non sono nel repository.

| Elemento della nostra app                                                                                                                                                                                                                                                                                                                      | Prodotto copiato                                            | Fonte (file di riferimento · indirizzo originale, oppure misura)                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lastre piatte, opache, angoli a 0, nessuna ombra, linee di 1 px più chiare                                                                                                                                                                                                                                                                     | Solasta 1, tutta l'interfaccia                              | `solasta-table-combat-hud-bonus-other-pass-official.png` · https://www.solasta-game.com/storage/cms/yxD1KvLjRqgldUrwBDkAp3VXcOfIMaVweCuGxeGw.png (facts §1: raggio 0, nessuna ombra)                                                                                                                                                   |
| Pagina carbone caldo `#292525`, colonna `#30302F`, scheda `#2A2C29`                                                                                                                                                                                                                                                                            | Menu principale e scheda                                    | `solasta-home-main-menu-user-locations-official.png` · https://www.solasta-game.com/storage/cms/9S1XobaYAqAEtonUnvFnKGuiaPNqSYOYkdi8Ib59.png; `solasta-sheet-inventory-equipment-rpgwatch.jpg` · https://rpgwatch.com/files/Images/00-1593/Equipment.jpg                                                                               |
| Ardesia `#3B4B55` per le lastre di combattimento, fondo ritratto `#2F4047`, celle `#424545`                                                                                                                                                                                                                                                    | HUD di combattimento                                        | `solasta-table-combat-hud-bonus-other-pass-official.png` (campionato senza perdite, facts §1 e §4)                                                                                                                                                                                                                                     |
| Accenti rame `#F5B486` (testo), `#D69E76` (riempimento), `#B88C6F` (linea), `#EDB68D` (sottolineatura 4 px)                                                                                                                                                                                                                                    | Menu, schede, pulsanti                                      | `solasta-home-main-menu-user-locations-official.png`; `solasta-sheet-inventory-equipment-rpgwatch.jpg` (facts §1)                                                                                                                                                                                                                      |
| Inchiostri: ghiaccio `#B5D3DE`, cielo `#56BCF4`, verde acqua `#5BB59A` per i PF, menta `#98E7AA` su «Termina turno»                                                                                                                                                                                                                            | Riquadri delle azioni, numeri                               | `solasta-table-combat-hud-bonus-other-pass-official.png` (facts §1)                                                                                                                                                                                                                                                                    |
| Caratteri dell'interfaccia: Source Sans 3 in maiuscolo spaziato (maiuscoletto + 0,06 em, peso 500: le maiuscole di Solasta sono di peso normale)                                                                                                                                                                                               | Solasta 1, ogni comando                                     | `derived/solasta-type-sans-and-solasta2-candidates-specimen.png` (facts §2: Source Sans 3 è il più vicino); `solasta-sheet-spells-prepare-official.jpeg` (SPELLCASTING ABILITY, VALIDATE)                                                                                                                                              |
| Tre pesi con tre ruoli: 400 testo, 500 maiuscole dei comandi, 700 nomi e numeri; un solo stile per i numeri (24 px, interlinea 1,1), 32 px solo per i PF della scheda                                                                                                                                                                          | Celle AC / INIT / MOVE / HP                                 | `solasta-sheet-spells-prepare-official.jpeg` (una sola misura per i valori derivati)                                                                                                                                                                                                                                                   |
| Titoli di sezione («Prossimo appuntamento», «Il tuo personaggio», «Azioni») in maiuscolo spaziato senza grazie, chiari                                                                                                                                                                                                                         | GAMEPLAY, PERSONALITY, MAIN ACTIONS                         | `solasta-home-settings-game-official.png`; `solasta-sheet-spells-prepare-official.jpeg` (PERSONALITY)                                                                                                                                                                                                                                  |
| Nomi propri e titoli delle finestre: Crimson Pro 700 in maiuscolo e maiuscoletto (personaggi, scena, incantesimi, oggetti, combattenti della finestra dell'iniziativa)                                                                                                                                                                         | Nomi, incantesimi, titoli                                   | `derived/solasta-type-serif-candidates-specimen.png` (facts §2: scelta ①)                                                                                                                                                                                                                                                              |
| Righe di stato e frasi di colore in corsivo serif («Combattimento · Round 1», sottotitoli)                                                                                                                                                                                                                                                     | «Round 1», testi delle campagne                             | `solasta-home-new-adventure-empty-official.png` · https://www.solasta-game.com/storage/cms/olrufrvEa6cWAn3lXQAV8enWA8huHQy31HeIorXv.png                                                                                                                                                                                                |
| Intestazione dell'app = barra delle schede della scheda: nera, voci in maiuscolo rame, la voce aperta bianca con riga rame di 4 px                                                                                                                                                                                                             | Barra delle schede del personaggio                          | `solasta-sheet-inventory-equipment-rpgwatch.jpg`; `solasta-sheet-spells-prepare-official.jpeg` · https://www.solasta-game.com/storage/cms/6COKklLhTZz5uMUmg5g7g9ZbIAqXp0QxdxZjAvAa.jpeg                                                                                                                                                |
| Pulsanti piatti quadrati con linea rame; il principale pieno rame; «annulla» rosa; «Termina turno» verde                                                                                                                                                                                                                                       | Pulsanti dei menu e della creazione                         | `solasta-home-new-adventure-party-official.png` · https://www.solasta-game.com/storage/cms/KzaeJi7e2uW0QaOIQf5H4IZUlgZqbU8lW9uNjv85.png; `solasta-sheet-creation-identity-dragonborn-steam.jpg` · https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2100430/ss_24cedd346e44bc6cf60dcbd352ba1a53b9c80318.1920x1080.jpg |
| Campi: fondo scuro, linea rame, testo e freccia rame; tutti alti 40 px con testo da 15 px (anche i d20 della finestra dell'iniziativa e i PF del menu della pedina)                                                                                                                                                                            | Menu a tendina delle impostazioni                           | `solasta-home-settings-game-official.png` · https://www.solasta-game.com/storage/cms/Lpion6Gg6YyZCQapbIWowjMZjHoSWV8toyh6gPBd.png                                                                                                                                                                                                      |
| Ricerca («Cerca tra le magie», «Cerca nell'inventario»): nessun riquadro, solo una riga sottile sotto                                                                                                                                                                                                                                          | «Search by name»                                            | `solasta-sheet-spells-prepare-official.jpeg`                                                                                                                                                                                                                                                                                           |
| Comandi secondari (pulsanti «quieti», link di testo, «Perché?», «Visualizzazione…»): un solo stile, maiuscolo rame senza cornice, che parte dallo stesso bordo del contenuto                                                                                                                                                                   | CLOSE, comandi delle righe                                  | `solasta-sheet-spells-prepare-official.jpeg`; `solasta-home-settings-game-official.png`                                                                                                                                                                                                                                                |
| Etichette (chip) piatte verde-blu scuro in maiuscolo                                                                                                                                                                                                                                                                                           | Chip della personalità                                      | `crops/solasta-sheet-crop-creation-stat-panel-2022.jpg` (dal file Steam sopra)                                                                                                                                                                                                                                                         |
| Schede di sezione: maiuscolo rame, la scheda aperta bianca con riga rame                                                                                                                                                                                                                                                                       | Schede delle impostazioni                                   | `solasta-home-settings-game-official.png`                                                                                                                                                                                                                                                                                              |
| Finestre: lastra centrata, titolo in serif maiuscolo fra due righe sottili rosa-grigio, pulsanti piatti                                                                                                                                                                                                                                        | Finestra «Wild Shape», striscione «Legendary Action»        | `solasta-panels-wildshape-dialog-steam.jpg` · https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1722280/ss_fe48c4970212d2e912f7dd3790891323b4dfaabc.1920x1080.jpg; `crops/solasta-table-crop-legendary-action-banner-2021.png`                                                                                        |
| Scheda bicolore: testata grigio chiaro con il nome in serif scuro sopra il corpo ardesia (pannello laterale, menu della pedina, suggerimenti)                                                                                                                                                                                                  | Scheda del bersaglio, suggerimento degli oggetti            | `crops/solasta-table-crop-target-card-brown-bear.jpg` (da https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1722280/ss_7023092bea58a5cca51101c854add38b86e7ac92.1920x1080.jpg)                                                                                                                                        |
| Avviso (toast) sul corpo ardesia del suggerimento                                                                                                                                                                                                                                                                                              | Suggerimento di Solasta                                     | `solasta-home-settings-game-official.png` (riquadro d'aiuto in basso a sinistra)                                                                                                                                                                                                                                                       |
| Inizio: titolo enorme, tenue, in maiuscolo spaziato (filigrana)                                                                                                                                                                                                                                                                                | «USER LOCATIONS», «NEW ADVENTURE»                           | `solasta-home-main-menu-user-locations-official.png`; `solasta-home-new-adventure-party-official.png`                                                                                                                                                                                                                                  |
| Inizio: colonna destra di righe da 40 px con «‹», etichette rame centrate, riga aperta piena rame, contatore rosa come «BETA»                                                                                                                                                                                                                  | Menu principale                                             | `crops/solasta-home-crop-main-menu-column-2021.png`                                                                                                                                                                                                                                                                                    |
| Inizio: «Continua a giocare» come la scheda della campagna di New Adventure: immagine orizzontale in alto (192 px), il nome della campagna in sans normale da 24 px sul suo bordo inferiore, poi la riga in maiuscolo, la frase in corsivo e i pulsanti                                                                                        | «New Adventure» («Crown of the Magister», «STARTING LEVEL») | `solasta-home-new-adventure-party-official.png`                                                                                                                                                                                                                                                                                        |
| Inizio: «Il tuo personaggio» come ritratto del gruppo: busto alto 128 × 192 su ardesia, ai suoi piedi il nome in maiuscoletto, la classe azzurra, i PF verde acqua                                                                                                                                                                             | Ritratti del gruppo (ANTON, Rogue 1)                        | `solasta-home-new-adventure-party-official.png`                                                                                                                                                                                                                                                                                        |
| Inizio: un solo spazio fra colonne e schede (24 px)                                                                                                                                                                                                                                                                                            | Griglia del menu                                            | misura (I-250)                                                                                                                                                                                                                                                                                                                         |
| Scheda: fondo nero, pulsante «← Personaggi» grigio come «CLOSE», ritratto tondo (64 px) con anello grigio, nome in maiuscoletto spaziato                                                                                                                                                                                                       | Scheda del personaggio                                      | `solasta-sheet-inventory-equipment-rpgwatch.jpg`; `solasta-sheet-spells-prepare-official.jpeg`                                                                                                                                                                                                                                         |
| Scheda: caratteristiche nella cella dei valori derivati, il modificatore come numero grande e il punteggio in un chip il cui blu cresce col modificatore (quinto giro)                                                                                                                                                                         | Riquadri delle caratteristiche                              | `crops/solasta-sheet-crop-creation-stat-panel-2022.jpg` (facts §5: +0 grigio … +4 blu vivo)                                                                                                                                                                                                                                            |
| Scheda: valori derivati (Competenza, Movimento, CA, Iniziativa) in celle `#424545` con cifre azzurro cielo; ogni cella con lo stesso margine (12 / 8 px), etichetta in alto e valore subito sotto, così etichette e valori di una fila stanno su una sola linea                                                                                | Griglia AC / INIT / MOVE                                    | `crops/solasta-sheet-crop-creation-stat-panel-2022.jpg`; `solasta-sheet-spells-prepare-official.jpeg`                                                                                                                                                                                                                                  |
| Scheda: PF con cifre verde acqua e barra verde acqua; «Cura» verde-grigio e «Danno» rosa                                                                                                                                                                                                                                                       | Blocco ritratto; FINISH / CANCEL                            | `solasta-table-combat-hud-bonus-other-pass-official.png`; `solasta-sheet-creation-identity-dragonborn-steam.jpg`                                                                                                                                                                                                                       |
| Scheda · Magie: valori di lancio in celle; nomi degli incantesimi in serif grassetto maiuscoletto; filtri come chip con linea rame                                                                                                                                                                                                             | Scheda degli incantesimi                                    | `solasta-sheet-spells-prepare-official.jpeg`                                                                                                                                                                                                                                                                                           |
| Scheda · Inventario: icona dell'oggetto in una casella quadrata grigia, linea rame se indossato; barra del peso verde acqua                                                                                                                                                                                                                    | Inventario                                                  | `solasta-sheet-inventory-equipment-rpgwatch.jpg`                                                                                                                                                                                                                                                                                       |
| Tavolo: fila di ritratti dei turni (72 × 84, righe verde acqua di 5 px, alleati su ardesia, nemici su rosso sangue, il turno attuale più alto con nome azzurro)                                                                                                                                                                                | Barra dell'iniziativa                                       | `crops/solasta-table-crop-top-initiative-log-2021.png` (dal file ufficiale sopra)                                                                                                                                                                                                                                                      |
| Tavolo: riquadri delle azioni 76 × 84 con pittogramma sopra l'etichetta, colore per famiglia (principale ardesia, bonus rosa-rame, altre grigio), striscia col nome del gruppo sotto, il segno del costo nell'angolo di ogni riquadro                                                                                                          | Pannello delle azioni                                       | `crops/solasta-table-crop-bottom-hud-2021.png` (facts §4: riquadri 108 × 129 a 1080p, gruppi MAIN ACTIONS · BONUS · OTHER · PASS)                                                                                                                                                                                                      |
| Tavolo: «Termina turno» riquadro verde 76 × 84 come gli altri, con clessidra e lettere menta allo stesso posto; comandi del turno come celle ardesia da 40 px a 4 px l'una dall'altra, sul bordo superiore dei riquadri                                                                                                                        | «END TURN» / «PASS»                                         | `crops/solasta-table-crop-bottom-hud-2021.png`                                                                                                                                                                                                                                                                                         |
| Tavolo: blocco del personaggio con cella PF (cifre verde acqua grandi) e nome color ghiaccio                                                                                                                                                                                                                                                   | Blocco ritratto in basso a sinistra                         | `crops/solasta-table-crop-bottom-hud-2021.png`                                                                                                                                                                                                                                                                                         |
| Tavolo: pagine «Azioni / Barra rapida» come mezzo riquadro diviso in due celle                                                                                                                                                                                                                                                                 | Mezze caselle «disengage / dodge»                           | `crops/solasta-table-crop-bottom-hud-2021.png`                                                                                                                                                                                                                                                                                         |
| Tavolo: colonna del gruppo impilata senza spazi, bordo verde acqua, selezione azzurra                                                                                                                                                                                                                                                          | Colonna del gruppo in esplorazione                          | `solasta-table-exploration-party-column-palaceofice-steam.jpg` · https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2100431/ss_554b3df3f78bf0e678cbe9a19af5b0e5120e905f.1920x1080.jpg                                                                                                                                  |
| Tavolo: strumenti della mappa, zoom e comandi di sessione come celle ardesia; lo strumento scelto nel riempimento rame con linea rame                                                                                                                                                                                                          | Selettori del set d'armi                                    | `crops/solasta-table-crop-bottom-hud-2021.png`                                                                                                                                                                                                                                                                                         |
| Tavolo: riga di stato della mappa e piastre sopra la barra come il registro nero traslucido, con il chip scuro della scala; le piastre alte 40 px sui bordi della barra (la riga delle risorse parte dove partono le pagine, i dadi finiscono dove finiscono i riquadri e la colonna dello zoom), la riga di stato sullo stesso bordo sinistro | Registro di combattimento                                   | `crops/solasta-table-crop-log-fail-hit-chips-2022.png`; `crops/solasta-table-crop-top-initiative-log-2021.png`                                                                                                                                                                                                                         |
| Tavolo: targa della scena piatta con titolo in serif maiuscolo e stato in corsivo                                                                                                                                                                                                                                                              | Indicatore della missione                                   | `solasta-table-exploration-party-column-palaceofice-steam.jpg`                                                                                                                                                                                                                                                                         |
| Tavolo: griglia azzurra sottile                                                                                                                                                                                                                                                                                                                | Griglia del combattimento                                   | `solasta-table-combat-hud-bonus-other-pass-official.png`                                                                                                                                                                                                                                                                               |
| Tavolo: barra laterale e piede in ardesia scura; schede in nero con maiuscolo rame                                                                                                                                                                                                                                                             | Blocco ritratto; barra delle schede                         | `solasta-table-combat-hud-bonus-other-pass-official.png`; `solasta-sheet-inventory-equipment-rpgwatch.jpg`                                                                                                                                                                                                                             |
| Menu della pedina: scheda del bersaglio con testata grigio chiaro e corpo ardesia; righe piene con linee di 1 px più chiare, la riga indicata piena rame                                                                                                                                                                                       | Scheda del bersaglio; menu principale                       | `crops/solasta-table-crop-target-card-brown-bear.jpg`; `crops/solasta-home-crop-main-menu-column-2021.png`                                                                                                                                                                                                                             |
| Icone: pittogrammi pieni, bianchi, piatti, senza cornice (game-icons.net)                                                                                                                                                                                                                                                                      | Pittogrammi delle azioni                                    | facts §3; vedi «Licenze»                                                                                                                                                                                                                                                                                                               |
| Scale I-250 (spazi 1 · 2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64; testo 12 · 13 · 14 · 15 · 17 · 20 · 24 · 32 · 56; pesi 400 · 500 · 700; raggio 0; bordi 1 · 4 · 5; controlli 40, riquadri 76 × 84 + 20)                                                                                                                                        | Misure di Solasta a 1080p × 0,833                           | facts §1, §2, §4, §9                                                                                                                                                                                                                                                                                                                   |

## Coppie per il confronto

Le nostre schermate sono in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round1/solasta/`; le coppie già
montate (nostra app a sinistra, riferimento a destra) sono in `_pairs/`. Schermate, foglio
riassuntivo e coppie sono stati rifatti il 01/10/2026 alle 20:13–20:15, dopo l'ultima modifica
del quinto giro (`direction.css` delle 20:12:31; «Dettagli rifiniti»); le coppie si rifanno con
`…/visual-01/probe-solasta/pairs.sh`.

| Vista                    | Nostra schermata                                                               | Riferimenti migliori                                                                                       | Coppia montata                                                                    |
| ------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Inizio                   | `home-dark-1440-solasta.png`                                                   | `solasta-home-new-adventure-party-official.png`, `solasta-home-main-menu-user-locations-official.png`      | `_pairs/01-inizio-1440.jpg`                                                       |
| Inizio (telefono)        | `home-dark-390-solasta.png`                                                    | `crops/solasta-home-crop-main-menu-column-2021.png`                                                        | `_pairs/02-inizio-390.jpg`                                                        |
| Scheda                   | `sheet-dark-1440-solasta.png`                                                  | `solasta-sheet-spells-prepare-official.jpeg`, `solasta-sheet-inventory-equipment-rpgwatch.jpg`             | `_pairs/03-scheda-1440.jpg`                                                       |
| Scheda (telefono)        | `sheet-dark-390-solasta.png`                                                   | `crops/solasta-sheet-crop-creation-stat-panel-2022.jpg`                                                    | `_pairs/04-scheda-390.jpg`                                                        |
| Tavolo                   | `table-combat-dark-1440-solasta.png`                                           | `solasta-table-combat-hud-bonus-other-pass-official.png`                                                   | `_pairs/05-tavolo-1440.jpg`                                                       |
| Tavolo (DM)              | `table-combat-dm-dark-1440-solasta.png`                                        | `crops/solasta-table-crop-top-initiative-log-2021.png`, `crops/solasta-table-crop-bottom-hud-2021.png`     | `_pairs/06-tavolo-dm-1440.jpg`                                                    |
| Tavolo (telefono)        | `table-combat-dark-390-solasta.png` (e `table-combat-dm-dark-390-solasta.png`) | `crops/solasta-table-crop-bottom-hud-2021.png`                                                             | `_pairs/07-tavolo-390.jpg`                                                        |
| Tavolo in esplorazione   | `table-explore-dark-1440-solasta.png` (e `-390-`)                              | `solasta-table-exploration-party-column-palaceofice-steam.jpg`                                             | `_pairs/08-tavolo-esplorazione-1440.jpg`, `_pairs/13-tavolo-esplorazione-390.jpg` |
| Scheda · Magie           | `sheet-spells-dark-1440-solasta.png` (e `-390-`)                               | `solasta-sheet-spells-prepare-official.jpeg`                                                               | `_pairs/09-scheda-magie-1440.jpg`, `_pairs/14-scheda-magie-390.jpg`               |
| Scheda · Inventario      | `sheet-inventory-dark-1440-solasta.png`                                        | `solasta-sheet-inventory-equipment-rpgwatch.jpg`, `solasta-sheet-inventory-official.jpeg`                  | `_pairs/10-scheda-inventario-1440.jpg`                                            |
| Finestra dell'iniziativa | `dialog-initiative-dark-1440-solasta.png`                                      | `solasta-panels-wildshape-dialog-steam.jpg`, `crops/solasta-table-crop-legendary-action-banner-2021.png`   | `_pairs/11-finestra-iniziativa-1440.jpg`                                          |
| Menu della pedina        | `token-menu-dark-1440-solasta.png`                                             | `crops/solasta-table-crop-target-card-brown-bear.jpg`, `crops/solasta-home-crop-main-menu-column-2021.png` | `_pairs/12-menu-pedina-1440.jpg`                                                  |

## Differenze dichiarate

- **Contrasto.** Alcuni valori misurati sono stati schiariti o scuriti per arrivare a 4,5:1:
  il grigio tenue `#949494` diventa `#9B999A` (e `#B7C4D0` sulle celle e sull'ardesia); il
  titolo in filigrana dell'Inizio `#585656` diventa `#8E8A88`; le lettere di «annulla» sono
  `#FFC9C9` invece del corallo `#F16970`; i chip dei modificatori seguono la stessa scala di
  blu di Solasta ma più scura, perché le cifre bianche si leggano; la riga piena rame usa
  lettere scure invece che chiare.
- **Maiuscole.** Solasta scrive i comandi in maiuscolo; qui sono maiuscoletto con
  spaziatura (le parole restano scritte come sono, per la lettura e i nomi accessibili). Il
  maiuscoletto è sintetizzato dal browser (né Source Sans 3 né Crimson Pro hanno
  maiuscoletto vero): per questo le maiuscole dei comandi usano il peso 500, che a quella
  misura ha il tratto delle maiuscole normali di Solasta.
- **Il nome della campagna.** Nell'Inizio il nome della campagna è nel sans normale, come
  «Crown of the Magister» in New Adventure, non nel serif dei nomi propri; il serif resta ai
  personaggi, alla scena, agli incantesimi, agli oggetti e ai titoli delle finestre. Sul
  telefono l'app non mostra l'immagine della campagna, quindi il nome sta in cima alla scheda.
- **Riquadri più piccoli.** I riquadri delle azioni di Solasta sono 108 × 129 a 1080p (90 ×
  108 a 900); qui sono 76 × 84 con la striscia del gruppo di 20 px, perché la barra resti
  alta 112 px (≤ 120) e le sette azioni di Livia stiano in fila. Le etichette sono più
  piccole (14 px in maiuscoletto) e vanno su due righe.
- **Famiglie d'azione.** Il colore del riquadro viene dal costo che l'azione già mostra
  (azione, bonus, reazione) e il segno del costo resta nell'angolo; i gruppi sono quelli
  dell'app (Armi, Incantesimi, Comuni), non «MAIN ACTIONS · BONUS · OTHER · PASS». Sotto
  «Termina turno», la reazione e le pagine la striscia è vuota.
- **Niente quadrante, niente registro in alto a destra.** L'app non ha il quadrante con il
  round né il registro di combattimento sopra la mappa: il round sta nella targa della scena
  e la riga di stato della mappa prende l'aspetto del registro.
- **Ritratti dei turni senza PF.** Le carte dei turni di Solasta mostrano «25/25»; le nostre
  non hanno quel dato. I nemici hanno anche una linea tratteggiata, perché non si
  distinguano solo per colore.
- **Il busto nel blocco del personaggio.** A 1440 l'app nasconde il ritratto nella barra
  (spazio): il blocco mostra solo la cella dei PF e il nome; il ritratto è nella colonna del
  gruppo accanto.
- **Portatili (da 721 a 1439 px).** Perché ogni azione resti nella barra senza scorrere, i
  riquadri passano da 76 a 68 px di larghezza con etichette da 13 px (la parola più lunga,
  «Disimpegno», misura 57 px); sotto i 1366 px il blocco del personaggio tiene solo la cella
  dei PF, e il nome e «È il tuo turno» restano come testo per i lettori di schermo (la
  creatura è nominata dalla colonna del gruppo, dai turni e dal pannello Creatura). Sotto i
  1440 px la piastra dei dadi tiene solo la tendina e la campanella, come fa l'app.
- **Telefono.** Solasta non ha un'interfaccia per telefono: qui la stessa grammatica è
  compressa (carte dei turni piccole senza nome, riquadri bassi di 40 px con il pittogramma
  accanto all'etichetta, «Termina turno» verde in fondo alla riga dei comandi). La barra è
  di tre file da 40 px (149 px, oggi 153); la mappa è 20 px più alta di oggi, così la riga
  di stato sotto la mappa resta tutta coperta dalla barra anche con una targa della scena
  di una sola riga; lo zoom e la colonna del gruppo stanno 88 px sopra il piede della
  mappa, almeno 15 px sopra la barra. I nomi delle schede in basso sono in maiuscoletto da
  12 px; ogni scheda è larga quanto il suo nome, quindi «Combattimento» si legge intero
  (oggi «Combattim…»), e la fila sfuma verso «Tutti» (quinto giro).
- **Le figure degli incantesimi.** Le sette celle (classe, caratteristica, attacco, CD,
  preparate, trucchetti, libro) stanno su due file di almeno 140 px, perché le cifre da
  24 px («Mago 3») restino su una riga.
- **Glifi e scritte della mappa.** La stellina ☆ dei preferiti non esiste in Source Sans 3:
  il browser la disegna col carattere di sistema, a 20 px. Le scritte disegnate dalla mappa
  (stato «Illeso», quota «↑3 m», 11 px) restano dell'app, perché le loro etichette sono
  misurate sul testo; i nomi delle pedine e delle zone passano solo al peso 700.
- **Carattere di riserva.** Mentre Source Sans 3 si carica, il testo usa l'Arial installata
  ridimensionata alle misure di Source Sans 3 (92,5 %, 90 % in grassetto): nessun file è
  aggiunto, e la barra misura le stesse larghezze prima e dopo il caricamento.
- **Stati non osservati.** Solasta non mostra il passaggio del mouse: qui il riquadro si
  schiarisce di un gradino e i pulsanti prendono il fondo rame scuro. L'azione scelta ha la
  stessa riga rame di 4 px delle schede.
- **Anello del fuoco.** Solasta non ha un anello del fuoco: qui è bianco quasi puro
  (`#F4F4F4`), 3 px, distinto dal blu della selezione.
- **Marchio.** Dal 01/10/2026 la direzione ha il suo marchio (I-251): vedi «Marchio» più
  sotto.
- **Colori gemelli (terzo giro).** Tre valori misurati distano al massimo 6 unità per canale
  da un altro e a occhio non si distinguono: la colonna della scheda `#2A2C29`, il riquadro
  «altro» `#323232` e il corpo dei suggerimenti e del menu della pedina `#384D5E`. Sono
  disegnati con i loro gemelli `#30302F` e `#324D60`, così restano una sola lastra e un solo
  verde-ardesia; anche i testi azzurri (valori, nome del turno e della creatura scelta) sono
  un solo azzurro `#5AC1FA`.
- **Avviso «Sessione non avviata».** Scende sotto le carte dei turni, che sono più alte, così
  «Avvia ora / Non ora» si leggono (anche sul telefono, dove oggi è coperto).
- **Il modificatore è il numero grande (quinto giro).** Nelle caratteristiche Solasta scrive
  grande il punteggio («11») e mette il modificatore nel chip; qui è il contrario, perché il
  modificatore è il numero che si tira: «+2» è il numero da 24 px nell'azzurro dei valori
  derivati, «14» sta nel chip a gradini di blu. Le dieci celle della fascia sono una sola
  ricetta (`#424545`, 12 / 8 px), senza la striscia grigia in alto.
- **Chi viene dopo (quinto giro).** La carta dei turni che segue quella attiva ha una riga
  ghiaccio di 2 px in alto e il nome in bianco. Solasta segna solo la carta attiva.
- **Riquadri del telefono uno alla volta (quinto giro).** Al telefono la fila dei riquadri
  mostra un riquadro intero alla volta (largo quanto la sua finestra) e scorre a scatti di un
  riquadro: prima si vedeva una lama di 1 px del riquadro dopo.

## Correzioni dopo la revisione (01/10/2026)

La revisione indipendente ha segnalato i punti F1–F24. Il testo ricevuto era completo fino a
F14; F15–F18 e F24 sono applicati come li descrive il giudizio d'insieme della revisione,
F19–F23 non sono arrivati e restano da verificare. Nessun punto ricevuto è respinto. Le
misure sono in `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-solasta/fix1/`
e `…/probe-solasta/audit-fix-final/`.

| Punto | Cosa non andava                                                                        | Cosa è cambiato                                                                                                                                                   |
| ----- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1    | La barra perdeva le parole delle risorse in 5 catture su 7 (caricamento del carattere) | Carattere di riserva con le misure di Source Sans 3, riga più stretta (spazi 8 px, maiuscole 500 e 0,06 em): 5 su 5 con le parole, e anche col carattere bloccato |
| F2    | Al telefono lo zoom e la scheda di Mira finivano sotto la barra                        | Barra a 149 px, zoom e gruppo 88 px sopra il piede della mappa: tutti i bersagli liberi (9 punti su 9)                                                            |
| F3    | Le icone cambiavano anche nel tema chiaro                                              | `icons.mjs` restituisce le icone di oggi nel tema chiaro                                                                                                          |
| F4    | Al telefono il titolo dell'Inizio non era allineato alle schede                        | Allineato a sinistra con le schede                                                                                                                                |
| F5    | Nelle celle della scheda le etichette di una fila erano ad altezze diverse             | Stesso margine per tutte, etichetta in alto, valore subito sotto; il punto della CA nell'angolo                                                                   |
| F6    | Cinque misure e tre pesi per i numeri, misure fuori scala                              | Un solo stile per i numeri (24/1,1/700, 32 per i PF della scheda); 12 px per tasti, contatori, slot; 15 px per i campi; zoom 24 px                                |
| F7    | Maiuscole troppo pesanti                                                               | Peso 500 e 0,06 em; 700 solo per nomi e numeri                                                                                                                    |
| F8    | Piastre sopra la barra su bordi casuali                                                | Riga delle risorse, dadi, riga di stato e zoom sui bordi della barra, tutte alte 40 px                                                                            |
| F9    | Nella finestra dell'iniziativa i campi d20 e i nomi erano quelli di oggi               | Campi come gli altri (40 px), nomi nel serif dei nomi                                                                                                             |
| F10   | Titoli di sezione nel serif dei nomi (e simili all'opzione 3)                          | Maiuscolo spaziato senza grazie; il serif solo per i nomi propri                                                                                                  |
| F11   | L'Inizio non copiava davvero New Adventure                                             | Immagine orizzontale col nome sul bordo; busto alto del personaggio                                                                                               |
| F12   | Due stili per i comandi secondari, etichette rientrate di 16 px                        | Un solo stile (maiuscolo rame, senza margini laterali, 24 px fra due comandi vicini)                                                                              |
| F13   | Al telefono «9 m» diventava «9»                                                        | Spazi di 4 px: la riga si vede intera                                                                                                                             |
| F14   | Segni del costo posizionati per indice                                                 | Ogni riquadro porta il suo segno; solo il primo del gruppo è speciale                                                                                             |
| F15   | Al telefono i pulsanti tornavano a 42 px e 9/15 px                                     | 40 px e 8/16 px a ogni larghezza; le file compatte dell'app restano compatte                                                                                      |
| F16   | «Termina turno» 81 px contro 84 dei riquadri                                           | 76 × 84 come i riquadri                                                                                                                                           |
| F17   | Pulsanti uguali a 40 e 51 px                                                           | Una riga per comando nel pannello laterale; al telefono la finestra va a capo per pulsanti interi; schede della scheda a 40 px                                    |
| F18   | Spazi diversi fra colonne e righe dell'Inizio (28 / 24)                                | 24 px ovunque                                                                                                                                                     |
| F24   | Nomi delle schede in basso nel corpo di oggi (10 px)                                   | Maiuscoletto spaziato da 12 px                                                                                                                                    |

## Secondo giro (01/10/2026)

La seconda verifica indipendente (`notes/open-items-round2.json`) ha lasciato otto punti.
Misure, percorsi e registri sono in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/polish2-solasta/`.

| Punto                                                                          | Cosa è cambiato                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schermate vecchie (alto)                                                       | Tutte le 15 schermate, il foglio riassuntivo e le 14 coppie rifatte dopo l'ultima modifica (vedi «Coppie per il confronto»); 15 su 15 senza problemi nel `manifest.json`                                                                                                                                      |
| A 1366 × 768 «Disimpegno» nascosto nella barra; a 1280 anche «Schivata» (alto) | Riquadri da 68 px sotto i 1440 px, blocco del personaggio ridotto alla cella dei PF sotto i 1366 px (vedi «Portatili»): a 1366 e a 1280 la fila misura quanto il suo spazio (528 su 528 px), nessuno scorrimento; `b62-review-fixes` passa senza note, giocatore e DM                                         |
| Clic a vuoto nelle Novità dell'Inizio (medio)                                  | Una novità apre tutto il testo sotto il puntatore, sotto l'anello della tastiera o quando è lei ad avere il fuoco; non più per il fuoco lasciato da un clic del mouse su un suo comando, quindi la voce cliccata prima non cambia altezza mentre si preme la successiva; `home-journey` passa                 |
| Maiuscole ancora a 700 (F7, medio)                                             | Filtri di Azioni, Magie e Inventario, «Effetti», «★ Preferiti», «Risorse del turno», «Armi», le intestazioni della tabella delle mosse, i gruppi d'azione, «Movimento» e la «CA» del pannello: peso 500 e 0,06 em                                                                                             |
| Linguette della barra in minuscolo da 13 px (medio)                            | «Azioni» e «Barra rapida» in maiuscoletto spaziato da 15 px. Le linguette ora hanno due misure: principali (pagine dell'intestazione, schede della scheda) 20 px sul computer e 15 px sul telefono; tutte le altre (righe del menu dell'Inizio, sezioni, sotto-schede del pannello, pagine della barra) 15 px |
| Totali dell'iniziativa nel serif (F6, basso)                                   | 24 / 1,1 / 700 nel sans, cifre tabellari, come ogni altro numero                                                                                                                                                                                                                                              |
| Spazi fuori scala, pulsanti che vanno a capo (basso)                           | Spazi riportati sulla scala (vedi «Coerenza»); «Gestisci monete» e «Nuova azione personalizzata» restano su una riga (40 px)                                                                                                                                                                                  |
| Commento in testa al file, «Perché?» da 32 px (basso)                          | Il commento descrive i margini della mappa di oggi (0 80 168 88, riga di stato a x 272, zoom a 24 px dal bordo) e il comportamento sui portatili; «Perché?» è alto 40 px                                                                                                                                      |

Percorsi ripetuti con `?direction=solasta` (copie in `polish2-solasta/journeys/`):
`b62-review-fixes` (1366 × 768 e 1440 × 900, giocatore e DM: 17 comandi raggiungibili, barra
112 px, nessuna nota), `b62-ia`, `b61-review-fixes`, `p6-phone-map` e `home-journey` passano;
`b61-table-structure` (versione morbida) passa con la stessa nota di prima (il suggerimento
del DM a 390 sta 34 px sulla mappa, che qui è 20 px più alta; «Attuale» 13 px). A 390: nessuno
scorrimento laterale, intestazione del Tavolo su una riga, «Termina turno», «Annulla ultima
modifica» e «Annulla preparazione» visibili, «Entra al Tavolo» a 581 px; a 1440 la barra è alta 112 px.

## Terzo giro (01/10/2026)

La terza verifica indipendente (`notes/open-items-round3.json`) ha lasciato quattro punti
bassi, nessuno alto o medio. Misure, script e catture di prova sono in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/polish3-solasta/`.

| Punto                                                                               | Cosa è cambiato                                                                                                                                         |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Pedine in scena (5)» nel pannello laterale in minuscolo da 15 px a 400 (basso)     | Stesso maiuscoletto rame da 15 px a 500 e 0,06 em di ogni comando a scomparsa, 40 px                                                                    |
| «⚙ CAMBIA…» 5 px sopra la riga di «Politica dei tiri» (basso)                       | La frase e il comando stanno sullo stesso asse: le linee di base coincidono entro 1 px (prima 7 px); in una colonna stretta il comando intero va a capo |
| La tabella delle mosse e «Movimento» senza lastra sul fondo nero (basso)            | Sono su una lastra come le vicine, 24 px dentro; «Movimento» è un'etichetta di sottosezione rame da 15 px come «Azione» e «Modifiche del DM»            |
| Suggerimento del DM a 390 sulla mappa, fonte SRD da 287 × 37 (basso, già accettato) | Nessuna modifica, come chiesto                                                                                                                          |
| Schermate e coppie da rifare                                                        | Le 15 schermate, il foglio riassuntivo e le 14 coppie rifatti dopo l'ultima modifica (13:53–13:54), 15 su 15 senza problemi nel `manifest.json`         |

Le garanzie, rimisurate dopo l'ultima modifica (`polish3-solasta/guards/guards.json`, giocatore
e DM): barra alta 112 px a 1440 × 900, 1366 × 768 e 1280 × 800, nessun riquadro fuori dalla
barra; a 390 intestazione del Tavolo su una riga, «Termina turno», «Annulla ultima modifica» e
«Annulla preparazione» visibili, rotaia fissata a 844 px, nessuno scorrimento laterale su
Inizio, scheda e Tavolo; «Entra al Tavolo» finisce a 580 px; nessun comando sotto i 40 px
oltre al collegamento SRD dentro il testo, come prima.

## Quarto giro (01/10/2026)

La quarta verifica indipendente (`notes/open-items-round4.json`) ha lasciato cinque punti
bassi, nessuno alto o medio. Misure, script e catture di prova sono in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/polish4-solasta/`.

| Punto                                                                                                                    | Cosa è cambiato                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Homebrew strutturato», «Livelli e rifacimento» e «Dotazione iniziale» con l'etichetta rame da 15 px come titolo (basso) | Hanno il titolo di lastra da 17 px chiaro, come ogni altra lastra, a 16 px dal contenuto                                                                    |
| «Homebrew strutturato» 8 px sopra il suo comando «Aggiungi homebrew…» (basso)                                            | Titolo e comando sullo stesso asse (0,4 px, come le altre intestazioni)                                                                                     |
| La lastra «Note» con 40 px al piede invece di 24 (basso)                                                                 | 24 px al piede come ogni lastra; «Nessuna nota.» sta 8 px sotto la linea della sua sezione (la toccava)                                                     |
| La striscia «Risorse del turno» 12 px più a sinistra del contenuto delle lastre (basso)                                  | La striscia ha 8 / 24 px dentro: la sua etichetta parte a 25 px dal bordo come il contenuto di ogni lastra (anche la tabella delle mosse, che partiva a 24) |
| Due tendine alte 41 px (basso)                                                                                           | Tutte le tendine sono alte 40 px come i campi (oggetto dell'inventario, tipo di danno del DM, modalità dei dadi)                                            |
| Schermate e coppie da rifare                                                                                             | Le 15 schermate, il foglio riassuntivo e le 14 coppie rifatti dopo l'ultima modifica (15:39–15:40), 15 su 15 senza problemi nel `manifest.json`             |

Oltre ai punti della verifica, una ricetta per il ritmo verticale dentro lastre, pannelli e
finestre (I-250), misurata su tutte le 7 linguette della scheda a 1440 e a 390
(`polish4-solasta/rhythm-final.json`: nessuno spazio fra blocchi diverso da 16, 8 o 0 px):

- **Lastre della scheda**: titolo a 16 px dal contenuto (sotto «Tiri», «Chi può modificare la
  scheda» e le lastre del builder erano 8), blocchi a 16 px (le monete, la scorta, la lista
  delle capacità e le note avevano 10, 12, 14 e 18), un'etichetta di sottosezione 16 px sotto
  il blocco precedente e 8 px sopra il suo contenuto («Movimento», «Modifiche del DM»), una
  didascalia 8 px sotto il suo blocco (la barra dell'esperienza, il valore delle monete).
- **Magie**: la finestra chiusa, Concentrazione, gli slot, i filtri, la lista e il suo piede a
  16 px (erano 8, 8, 8, 24 e 12), le righe degli slot a 8 px (20), le sezioni sotto la lista a
  24 px sulla loro riga (26); ogni gruppo d'incantesimi pende dalla riga della sua etichetta,
  come i gruppi d'azione (la lista aggiungeva una seconda riga 8 px più in basso).
- **Pannello Creatura**: i blocchi a 16 px (l'ultima mossa 12, «Forme e creature collegate»
  28 sopra e 52 sotto), i pannelli sotto i pulsanti a 24 (25); «Indebolimento» è l'etichetta
  di campo tenue da 14 px in maiuscoletto sia nella scheda sia al Tavolo (era 12 e 14 px in
  minuscolo).
- **Finestra dell'iniziativa**: blocchi a 16 px (12, poi 10 e 4 sotto la lista); la riga
  «Personaggio · Iniziativa +2» parte sotto il nome (10 px più a sinistra), le caselle di
  spunta senza i 3 px del browser.
- **Menu della pedina**: un solo bordo sinistro e destro per medaglione, chiusura, riga dei PF,
  suggerimento e voci (erano a 13, 9 e 21 px dal bordo).
- **Caratteri**: tre pesi soli (400 testo, 500 maiuscoletti, 700 nomi e cifre): il 600
  dell'app (interruttore offline, distintivi di quota e salute sulla mappa) diventa 700; i nomi
  di incantesimi, oggetti e della pedina hanno l'interlinea 1,2 dei titoli, il suggerimento
  delle mosse l'1,45 del testo; «1 di 1» degli usi non va più a capo a metà.
- **Inizio**: l'etichetta del resoconto sta 8 px sopra il suo testo (16).
- **Campionario**: le condizioni composte «(C) Benedizione ×» e «Indebolimento 2» hanno la
  scritta al centro del loro riquadro da 40 px, come le condizioni-pulsante accanto (era in
  alto); la «×» perde i 6 px del browser.

Le garanzie, rimisurate dopo l'ultima modifica (`polish4-solasta/guards/guards.json`, giocatore
e DM): barra alta 112 px a 1440 × 900, 1366 × 768 e 1280 × 800, nessun riquadro fuori dalla
barra; a 390 intestazione del Tavolo e targa della scena su una riga, «Termina turno»,
«Annulla ultima modifica» e «Annulla preparazione» visibili, rotaia fissata a 844 px, nessuno
scorrimento laterale su Inizio, scheda e Tavolo; «Entra al Tavolo» finisce a 580 px (390) e a
597 px (1440); nessun comando sotto i 40 px oltre al collegamento SRD dentro il testo, come
prima. Controlli statici: 547 regole, tutte col prefisso, nessun `!important`, nessun
`text-transform`, nessun testo in `content`, ogni colore con la guardia del tema chiaro;
`tests/visual01-directions.test.mjs` 7 su 7; Prettier pulito.

## Dettagli rifiniti (quinto giro, 01/10/2026)

Il proprietario ha chiesto la perfezione nei dettagli (I-252: misure dei pulsanti, spazi fra i
pulsanti, margini). Una revisione indipendente ha misurato la direzione al pixel
(`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/detail-solasta/notes.txt`:
punti S1–S24, B1–B3 del marchio, tre idee per «superare» Solasta). Il testo ricevuto si
interrompeva a metà di S19: S19–S24 e B1–B3 sono presi dalle note della revisione. Tutti i
punti alti e medi sono applicati, e dei bassi quelli da una riga e qualcuno in più; i pochi
respinti hanno il motivo più sotto. Le misure (prima e dopo), gli script, gli anelli del fuoco
e i ritagli sono in `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/fix-solasta/`;
i file di prima sono in `fix-solasta/before/`.

Ogni regola nuova o cambiata è nel `direction.css`: quelle che cambiano una ricetta stanno con
la ricetta (righe della scheda, fascia delle statistiche, medaglione, targa della scena del
telefono, tasti, celle del telefono), le altre nell'ultima sezione prima del marchio,
«details (round 5)», con un commento per punto. Tutti i valori vengono dalle scale (I-250).

| Punto                                     | Prima                                                                                                                                                                               | Dopo                                                                                                                                                                                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 Tiri salvezza e abilità (alto)         | Il nome stava 4 px sotto il bordo della riga: la sua linea di base 7,2 px sopra quella del valore                                                                                   | Nome e sigla sulla linea centrale della riga, ognuno sulla sua linea di base: 0 px fra nome e valore in tutte le 24 righe, a 1440 e a 390; stella, casella e valore sullo stesso centro (0 px di scarto)                                                                   |
| S2 Fascia delle statistiche (alto)        | Due ricette di cella (`#292525` con striscia grigia, `#424545` senza); etichette su due linee di base (379,9 e 388,9), numeri su tre (412,3, 432,7, 441); 35 px vuoti sotto il chip | Una ricetta per tutte e dieci le celle (`#424545`, 12 / 8 px, etichetta con due righe riservate): etichette tutte a 388,9, numeri tutti a 432,7 (24 / 1,1 / 700); il chip 8 px sotto il numero. Il modificatore è il numero grande, il punteggio va nel chip (vedi «Idee») |
| S3 Spazi fra pulsanti (alto)              | 8 / 12 / 24 / 4 px per la stessa coppia di pulsanti da 40 px                                                                                                                        | Una regola: 8 px fra due pulsanti con cornice, 24 px prima di un comando senza cornice. «Trasforma… · Creature collegate» e «Gioco·Modifica · Dadi» 8 (erano 12), «Tira tutti · Tira PNG» 8 (era 24), «Nessuno» resta a 24; le celle ardesia del telefono 4 (S4)           |
| S4 Barra del telefono (alto)              | 1 / 1 / 4 / 6 / 9,2 / 29,5 px nello stesso blocco; la seconda fila a 684 e 685; «Termina turno» a x 241,48                                                                          | 4 px fra tutte le celle e i blocchi (comandi del turno, pagine, dadi, fila della sessione, zoom); seconda fila tutta a 684; «Termina turno» riempie la fila da 12 px dopo «Annulla» al bordo (x 236, 146 px, i 12 px del computer); la barra resta alta 149 px             |
| S5 Inventario (alto)                      | Colonne a x 987,8 / 969,7 / 1052,4, «Dettagli» a 1179,8 / 1161,7 / 1244,4: salivano e scendevano lungo la lista                                                                     | Righe su colonne fisse quando la lista è larga almeno 584 px: Qtà, Peso e Cariche a x 963 e «Dettagli» a 1155 in ogni riga, il menu a 1323                                                                                                                                 |
| S6 Medaglione (alto)                      | Un'ellisse: 52 × 68 px (44 × 56 al telefono)                                                                                                                                        | Un cerchio di 64 px a ogni larghezza, col volto che lo copre; il distintivo della piuma (24 px, quadrato) centrato sul punto a 45° dell'anello (101,9 / 290,8 contro 101,9 / 290,9)                                                                                        |
| S7 Icona della mappa (alto)               | La bussola nell'anello sembrava un cartello di divieto, ed era la stessa per Mappa, Scena, Sposta vista, Scene e Nascondi interfaccia                                               | Una mappa del tesoro per Mappa e Sposta vista; una torre con bandiera per la scheda Scena e il comando «Scene» del DM; un occhio per «Nascondi interfaccia». Nessun'icona uguale vicina a un'altra con un altro significato                                                |
| S8 Titoli a sinistra (medio)              | Cinque titoli da 15 px rame, centrati                                                                                                                                               | Titoli di lastra da 17 px chiari, a sinistra, 16 px sopra la lista; «Abilità aggiuntive» resta etichetta rame da 15 px, a sinistra, 16 px sotto la lista e 8 sopra il suo testo                                                                                            |
| S9 Pannello Creatura tagliato (medio)     | Il bordo della barra tagliava a metà «Inventario» (al DM «Scheda completa»); i comandi del turno finivano 8 px oltre il contenuto del pannello                                      | Gli ultimi 24 px del pannello sfumano, così il taglio si legge «continua sotto»; il blocco del turno finisce a x 1360, sul bordo del contenuto del pannello                                                                                                                |
| S10 Buco nel blocco del turno (medio)     | Tre celle sopra, due sotto, e il buco nell'angolo esterno accanto a «Termina turno»                                                                                                 | Le due celle tenui nelle colonne 2 e 3: il buco va sotto «Muovi» e il blocco chiude contro «Termina turno» (anche in esplorazione)                                                                                                                                         |
| S11 Ritmo dell'Inizio (medio)             | I due comandi dell'appuntamento (325 px in 312) andavano a capo storti; titolo → contenuto 8 px, testo → comandi 32,9                                                               | I due comandi a tutta larghezza, uno sotto l'altro, a 8 px; titolo 16 px sopra il contenuto e ultimo testo 24 px sopra i comandi (24,9: la lastra prende l'altezza di «Continua a giocare» accanto)                                                                        |
| S12 Finestra dell'iniziativa (medio)      | Casella di «Sorpreso» a x 458, sotto il numero; quella di inclusione a 486, il nome a 514. Al telefono i due pulsanti (306,5 px in 304) andavano a capo storti                      | «Sorpreso» con la casella a 486 sotto quella di inclusione e la parola a 514 sotto il nome. Al telefono i due pulsanti a tutta larghezza, il pieno in fondo; gli strumenti in una riga a ogni larghezza (8 px, poi 24 prima di «Nessuno»; righe a 8)                       |
| S13 Anello del fuoco tagliato (medio)     | 4 px tagliati in alto sulle carte dei turni; al telefono le celle vicine coprivano l'anello dei comandi del turno                                                                   | Dove la fila scorre o le celle sono a 4 px l'anello di 3 px sta 4 px dentro il controllo, come sui riquadri delle azioni; sul ritratto un alone scuro di 6 px. Provato con la tastiera: 0 tagli su carte, comandi del turno, «Termina turno», schede in basso              |
| S14 Strisce del telefono (medio)          | «Inventar» tagliato netto sotto «Tutte»; «Combattim…» coi puntini; 9 px fra «Scena» e «Tutti»                                                                                       | La striscia della scheda sfuma i suoi bordi (l'aria la decide l'app, non 16 px: vedi «Sesto giro»); le schede in basso sono larghe quanto il nome («Combattimento» intero, 79 px) e la fila sfuma verso «Tutti»                                                            |
| S15 Icona e parola (medio)                | 0 px su «Tiri e risultati», 4 su «Tira l'iniziativa», 8 altrove                                                                                                                     | 8 px su ogni comando con icona (tutti misurati), 12 solo nelle righe da 40 px del menu della pedina; «Digitali» in maiuscoletto come le parole vicine                                                                                                                      |
| S16 Menu della pedina (medio)             | La lettera «L» in un quadrato                                                                                                                                                       | Il ritratto dipinto della creatura, lo stesso del pannello Creatura                                                                                                                                                                                                        |
| S17 Targa della scena al telefono (medio) | Comandi da 12 px; «Riposi» a fine riga 1 in esplorazione, in riga 2 a sinistra in combattimento                                                                                     | Comandi da 15 px come ogni pulsante; «Riposi» sempre a fine riga 1 (in combattimento lo stato va sotto il titolo e la targa passa da 82,8 a 57,1 px); i comandi del DM sempre in riga 2. L'intestazione del Tavolo resta su una riga                                       |
| S18 Tasti (basso)                         | Due ricette (grigio pieno nel pannello, scuro con linea nel menu), alte 15,2 px                                                                                                     | Una: pozzo scuro con linea ardesia di 1 px, 12 px su riga da 16, alta 18 px; sulla riga rame del menu diventa una linea scura (prima le lettere scure finivano sul fondo scuro)                                                                                            |
| S19 Testata del Tavolo (basso)            | Dado di 34 px sopra una scritta di 20                                                                                                                                               | Dado di 28 px (la proporzione dell'Inizio, 34 su 24); 8 px sopra e sotto, la testata resta alta 63 px. Gli spazi e le linee di base: vedi «Respinti»                                                                                                                       |
| S20 Strumenti della mappa                 | La seconda colonna 1 px più alta, 15 px fra le celle; «Disegna» e «Pianifica percorso» due piume                                                                                    | Le due colonne sulla stessa riga (179 … 311), 8 px fra le lastre e 16 fra le celle; «Disegna» ha un pennello                                                                                                                                                               |
| S21 Passaggio del mouse                   | I comandi di testo si sottolineavano, quelli tenui no; le icone della fila della sessione non si schiarivano                                                                        | Nessuna sottolineatura: tutti i comandi senza cornice si schiariscono; le icone della sessione si schiariscono come gli strumenti; ogni cella cliccabile della fascia mostra la stessa linea rame interna                                                                  |
| S22 Valori fuori scala                    | Comandi a segmenti 42 px; chip 19,4; tasti 15,2; «Termina turno» a x 241,48; fila della sessione a 6 px; avviso «Sessione non avviata» 6 / 10 px                                    | 40; 20; 18; 236; 4; 8 / 12                                                                                                                                                                                                                                                 |
| S23 Inventario e scheda                   | La ricerca dell'inventario larga 460 px su 614; la riga dell'esperienza spinta a destra                                                                                             | La ricerca a tutta larghezza; la riga dell'esperienza a sinistra, sotto «Gioco»                                                                                                                                                                                            |
| S24 Inizio                                | Il contatore di «Novità» rosa sulla riga rame                                                                                                                                       | Un chip scuro con le cifre rame                                                                                                                                                                                                                                            |
| B3 Marchio                                | Cuciture ghiaccio a 2,4 unità al 75 % (0,8 px a 34 px): a 1× le quattro ardesie si confondevano                                                                                     | Cuciture piene da 3 unità (1 px)                                                                                                                                                                                                                                           |

**Le garanzie, rimisurate dopo l'ultima modifica** (`fix-solasta/guards/`): barra alta 112 px a
1440 × 900, 1366 × 768 e 1280 × 800, nessun riquadro fuori dalla barra; «Termina turno»,
«Annulla ultima modifica» e «Annulla preparazione» visibili a ogni larghezza; a 390 nessuno
scorrimento laterale su Inizio, scheda, magie, finestra dell'iniziativa e Tavolo (giocatore e
DM, combattimento ed esplorazione), intestazione del Tavolo su una riga, rotaia fissata a
844 px, barra alta 149 px; «Entra al Tavolo» finisce a 580 px; nessun comando sotto i 40 px
oltre ai collegamenti dentro il testo (fonte SRD, termini del glossario), come prima. Gli anelli
del fuoco sono in `fix-solasta/focus/`.

**Misura di coerenza** (`changes/visual-01/audit/audit.js --direction solasta`, 20 stati; prima
alle 18:36 sulla versione della revisione, copia in `fix-solasta/audit-before/`; dopo alle
20:13 sul `direction.css` delle 20:12:31, `audit/solasta/` e `fix-solasta/audit-after/`):

| Misura                             | Prima                  | Dopo                      |
| ---------------------------------- | ---------------------- | ------------------------- |
| Spazi fra elementi (gap): valori   | 10 (1 px ×4, 6 px ×22) | 9 (nessun 1 px, 6 px ×12) |
| Pulsanti: classi visive · varianti | 27 · 69                | 26 · 65                   |
| Chip: misure diverse               | 10 (19,5 px ×29)       | 9 (20 px ×35)             |
| Colori: testo · fondo · bordo      | 23 · 36 · 20           | 23 · 39 · 19              |
| Ombre                              | 7                      | 9                         |
| Contrasto AA: errori               | 0 su 1221              | 0 su 1221                 |

Lo strumento ora deduce un passo di 4 px invece di 2 (sono spariti i gap di 1 px), per questo
conta come «fuori passo» i 2, 6, 10 e 14 px dell'app che restano (geometria del Tavolo e
della mappa, come prima). I tre fondi in più sono il colore del testo dipinto dalle maschere
delle icone nuove e il chip scuro del contatore di «Novità»; le due ombre in più sono la riga
ghiaccio di chi viene dopo e la linea della rotaia disegnata dentro la barra. Il 28 px nuovo
nella scala è il rientro di «Sorpreso» (casella di 20 px + 8), lo stesso calcolo dei 56 px
della riga «Personaggio · Iniziativa» che c'era già.

### Idee per superare Solasta

1. **Chi viene dopo** (applicata). La carta dopo quella di turno ha una riga ghiaccio di 2 px
   in alto e il nome in bianco: il tavolo vede chi si prepara senza un comando in più.
2. **Il costo sul riquadro** (c'era già). Il segno nell'angolo di ogni riquadro è già la forma
   della legenda (● azione, ▲ bonus, ✦ reazione), negli stessi colori della riga delle
   risorse: nel combattimento d'esempio Livia ha solo azioni, per questo si vedono solo cerchi.
3. **Il modificatore come numero grande** (applicata, S2). È il numero che si tira; il
   punteggio va nel chip a gradini di blu e le dieci celle stanno su una linea di etichette e
   una di numeri, come né Solasta né D&D Beyond fanno.

### Respinti, con il motivo

- **S19, spazi della testata.** Fra le lettere lo spazio è già uguale: 17 px dalla fine di
  «Studio» all'icona di «App» e 17 px dalla fine di «App» all'icona di «Torna alla
  campagna». I 12 px misurati sono fra i riquadri: quello del marchio ha 4 px d'aria per
  l'anello del fuoco.
- **S19, linea di base della scritta.** Dado, scritta e comandi stanno sullo stesso centro
  (y 74): con misure diverse (20 e 15 px) le linee di base non possono coincidere senza
  staccare la scritta dal centro del dado.
- **S2, i PF.** Restano il numero da 32 px dichiarato (I-250), con la loro linea di base: la
  cella dei PF ha il campo e i due pulsanti a sinistra ed è lei a dare l'altezza alla fascia
  (137,6 px), perciò anche i 24–35 px sotto i chip delle altre celle restano.
- **S22, resti.** La cella PF della barra (103–104 px) è la geometria della barra; la x
  334,52 del menu della pedina è il punto del clic, calcolata dall'app; le pagine «Azioni /
  Barra rapida» alte 42 px sono metà di un riquadro da 84.
- **S23, il testo d'aiuto della ricerca.** Il campo non ha un testo d'aiuto nel markup, che
  una direzione non può cambiare.
- **S24, la riga del turno in esplorazione.** «Esplora la scena liberamente» va su tre righe
  nel blocco del personaggio: è il testo dell'app, sta nei suoi 84 px senza tagli, e a 13 px
  andrebbe comunque su due righe diventando l'unica riga di testo da 13 px della barra.
- **S20, la piuma di «Pianifica percorso».** Resta: è la stessa icona delle note
  nell'intestazione, e ora che «Disegna» ha il pennello non ce ne sono due uguali vicine.
- **B1, il «20» a 34 px su uno schermo 1×.** Il numero è alto 6,5 px (il massimo che la
  geometria comune concede, 19 unità su 100) e a 1× diventa una macchia; a 2× si legge. Il
  «20» sulla faccia rame è il marchio comune a tutte le direzioni (I-251), quindi resta.

## Sesto giro (01/10/2026)

La verifica indipendente dopo il marchio e i dettagli (`notes/open-items-round6.json`) ha
lasciato un punto medio e quattro bassi; il sesto giro li chiude tutti e unifica le ultime
differenze fra componenti dello stesso tipo segnalate dallo strumento di coerenza (I-250).
Misure, script, ritagli e catture di prova sono in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/polish6-solasta/` (i file di
prima in `before/`). Le regole nuove stanno con la loro ricetta (barra in basso e striscia
della scheda in «S14», righe dell'inventario in «S5», chip del punteggio con la fascia, blocco
del PF con la barra del telefono, finestra dell'iniziativa con «S12»), le unificazioni
nell'ultima sezione prima del marchio, «coherence (round 6)».

| Punto                                         | Prima                                                                                                                                                                                                                                                      | Dopo                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Barra in basso del Tavolo al telefono (medio) | Sfumatura fissa di 16 px in fondo: a riposo mangiava l'ultima lettera di «Scena» («SCEN·»); in fondo allo scorrimento sfumava la coda di «Consultazione» (la parola finiva a 312,2, la sfumatura partiva da 304) e all'inizio restava «ONE» tagliato netto | Sfumatura di 32 px, così la scheda tagliata sfuma tutta («Scena» dalla S alla A); la fila scatta all'inizio di una scheda intera, a filo del bordo vicino; 32 px d'aria in fondo: «Consultazione» finisce a 288,2, dove la sfumatura comincia. Misurata in 7 posizioni di scorrimento (0, 62, 124, 207, 269 e la fine, 350): mai un frammento al bordo vicino (`crops/rail2-a2-all.png`) |
| Striscia della scheda al telefono (basso)     | Sfumatura di 16 px; SOURCES diceva «16 px d'aria», ma l'aria la decide l'app (`scrollIntoStrip` in `ui.mjs`): «Azioni» a 7 px dal bordo e 9 px della sua riga rame sfumati                                                                                 | Sfumatura di 12 px, quanto il margine interno di una scheda: non tocca mai una lettera, nemmeno con la scheda a filo; con 7 px d'aria la riga rame sfuma per 5 px (fino a 0,58 invece di 0,44). La tastiera porta una scheda a 16 px dal bordo (`crops/stabs-final-all.png`)                                                                                                             |
| Prima fila della barra al telefono (basso)    | La cella dei PF finiva a 68,6 e la legenda delle risorse cominciava a 78,6: 10 px                                                                                                                                                                          | 4 px come ogni gruppo della barra (legenda a 72,6): la seconda colonna del blocco, vuota al telefono, non ha più il suo spazio di 6 px                                                                                                                                                                                                                                                   |
| Finestra dell'iniziativa al telefono (basso)  | Tre bordi sinistri in una riga: «Sorpreso» a 56, la casella d'inclusione a 85, la riga del d20 a 68,5                                                                                                                                                      | Un solo bordo, quello del numero d'ordine (56): la riga del tipo, la riga del d20 e «Sorpreso»; il totale resta sul bordo destro (334)                                                                                                                                                                                                                                                   |
| Resti frazionari (basso)                      | Il chip del punteggio alto 20,3 px (interlinea 1,45); nelle righe con «Equipaggia» «Dettagli» schiacciato a 53 px e il secondo comando a 1232 invece di 1233,6                                                                                             | Il chip ha la riga da 16 px dei chip e 2 px sopra e sotto: 20 px. La colonna dei comandi dell'inventario passa da 208 a 224 px (il gruppo più largo, Dettagli · Equipaggia · menu, è 209,6): «Dettagli» 54,6 px a x 1139 e il secondo comando a 1217,6 in tutte le 18 righe, il menu a 1323                                                                                              |
| Schermate e coppie                            | Fatte prima dell'ultima modifica                                                                                                                                                                                                                           | Le 15 schermate, il foglio riassuntivo e le 14 coppie rifatti alle 21:45–21:47, dopo l'ultima modifica del `direction.css` (21:43:30); `manifest.json` 15 su 15 senza errori                                                                                                                                                                                                             |

Unificazioni (I-250), una ricetta per tipo:

- **Icona e parola a 8 px** anche dove restavano i 6 px dell'app: le linguette del pannello
  laterale («Creatura», «Riepilogo del gruppo»), le righe del menu dell'Inizio, «Tutte» della
  scheda, i comandi della sessione sopra la mappa e la cella dei PF; 8 px anche fra i due
  pulsanti con cornice della fila rapida del pannello Creatura (S3), fra l'etichetta e il
  campo nella scheda e nelle righe delle mosse; l'avviso «Sessione non avviata» pende 8 px
  sotto la barra della sessione, come le lastre della mappa.
- **Righe di un elenco**: un solo margine di 8 px sopra e sotto in ogni elenco (magie 14,
  inventario 6 e la sua testata 10, azioni, reazioni e tabella delle mosse 6, discussioni
  dell'Inizio 10, con 16 px fra testo e «Apri» invece di 14). Una riga con un comando da
  40 px è alta 56 px ovunque.
- **Interruttori degli effetti** («Benedizione», «Anatema»): 8 px sopra e sotto come ogni
  pulsante con cornice (6), sempre alti 40.
- **Chip**: tutti alti 20 px, anche le componenti degli incantesimi («V», «S»: 22) e il
  chip del punteggio; i **contatori** («Novità» 7, i 4 e 8 del menu della pedina) una sola
  casella di 20 px con 4 px ai lati (6; quello del menu era alto 15,2).
- **Menu della pedina al telefono**: righe da 40 px come ogni riga e comando (l'app le fa da
  44 nel foglio del telefono).
- **Casella «Solo pronte al lancio»**: senza i 3 px del browser, come quelle
  dell'iniziativa.

Sotto la piega: lo strumento ha misurato anche l'Inizio intero (`home-full`, a 1440 e a
390, `polish6-solasta/audit-homefull/`): le righe delle discussioni erano le uniche fuori
scala (10 / 14 px), ora sulla ricetta; nessun errore di contrasto (un solo «incerto», il nome
della campagna sopra l'immagine nella cattura a pagina intera, che passa nello stato Inizio).
La scheda intera (`sheet-full`) è nei 20 stati della misura.

Le garanzie, rimisurate dopo le modifiche (`polish6-solasta/guards/`, giocatore e DM): barra
alta 112 px a 1440 × 900, 1366 × 768 e 1280 × 800, nessun riquadro fuori dalla barra,
«Termina turno», «Annulla ultima modifica» e «Annulla preparazione» visibili; a 390
intestazione del Tavolo su una riga (63 px), rotaia fissata a 844 px, barra alta 149 px,
nessuno scorrimento laterale su Inizio, scheda, magie, finestra dell'iniziativa e Tavolo
(combattimento ed esplorazione); «Entra al Tavolo» finisce a 580 px; nessun comando sotto i
40 px oltre ai collegamenti dentro il testo, come prima. Controlli statici:
`tests/visual01-directions.test.mjs` 13 su 13, nessun `!important`, nessun
`text-transform`, nessun testo in `content`; Prettier pulito.

Restano, di proposito: i 6 e 10 px della geometria del Tavolo al telefono (margini della
barra, della rotaia e della targa della scena, che portano le garanzie a 390), i 5 e 10 px
della testata e del marchio (giro del marchio), i 3 px dell'interruttore «Il DM può
modificare questa scheda» (l'app lo allinea alla prima riga del testo), le etichette da
11 px dei distintivi sulla mappa (dimensionati dall'app sulla pedina) e le pagine «Azioni /
Barra rapida» alte 42 px, metà di un riquadro da 84.

## Coerenza (I-250)

Misure dello strumento `changes/visual-01/audit/audit.js --direction solasta` sui 10 stati del
giro 1 a 1440 e a 390 (20 catture, tema scuro). Sesto giro: «prima» 01/10 alle 21:22 sul
`direction.css` delle 20:12:31 (copia in `polish6-solasta/audit-before/`), «dopo» alle 21:44
sul `direction.css` delle 21:43:30, l'ultima modifica (`audit/solasta/audit.md`, copia in
`polish6-solasta/audit-after/`):

| Misura (sesto giro)                      | Prima                                      | Dopo                                       |
| ---------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Elementi visibili                        | 2594                                       | 2602                                       |
| Spazi (padding, margini, gap)            | 27 valori, passo 4 px all'86 %, 17 anomali | 27 valori, passo 4 px al 90 %, 17 anomali  |
| Padding da 6 · 10 · 14 px (elementi)     | 90 · 3 · 5                                 | 4 · 1 · 1                                  |
| Gap da 6 px · margini da 3 px (elementi) | 12 · 4                                     | 4 · 2                                      |
| Altezze dei controlli                    | 17 (44 px ×13, 40 px ×558)                 | 17 (44 px ×3, 40 px ×570)                  |
| Altezze dei chip                         | 9 (22 px ×6, 20 px ×35)                    | 8 (20 px ×43)                              |
| Caratteri: misure · pesi · stili         | 10 · 3 · 70                                | 10 · 3 · 71 (il chip del punteggio, 14/16) |
| Voci di menu: varianti                   | 2 (40 e 44 px)                             | 1                                          |
| Pulsanti: classi visive · varianti       | 26 · 65 (10 classi con più varianti)       | 26 · 65 (10)                               |
| Lastre: classi visive · varianti         | 21 · 43                                    | 21 · 43                                    |
| Colori: testo · fondo · bordo            | 23 · 39 · 19 (2 coppie gemelle)            | 23 · 39 · 19 (2 coppie gemelle)            |
| Pulsanti col riempimento del browser     | 0                                          | 0                                          |
| Contrasto AA: errori su testi misurati   | 0 su 1221                                  | 0 su 1227                                  |

Le varianti dei pulsanti e delle lastre che restano sono geometria per larghezza (le celle
del telefono, la fila del gruppo alta 104 o 48 px, le linguette in basso da 52 px), il
marchio e componenti diversi con lo stesso aspetto (segmenti con la linea a sinistra, la
cella dei PF): nessuna è lo stesso componente disegnato in due modi.

Giri precedenti. Secondo giro: «prima» 01/10 alle 12:01, sul
`direction.css` delle 10:45 (copia in `polish2-solasta/audit-before/`); «dopo» sul
`direction.css` delle 12:30:19, rimisurato alle 12:58 come punto di partenza del terzo giro
(copia in `polish3-solasta/audit-before/`). Terzo giro: 01/10 alle 13:56, sul `direction.css`
delle 13:52:00 (copia in `polish3-solasta/audit-after/` e, come punto di partenza del quarto
giro, in `polish4-solasta/audit-before/`). Quarto giro: 01/10 alle 15:40, sul `direction.css`
delle 15:38:47 (copia in `polish4-solasta/audit-after/`).

| Misura                                 | Secondo giro, prima                       | Secondo giro, dopo (terzo, prima)         | Terzo giro, dopo                          | Quarto giro, dopo                          |
| -------------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Elementi visibili                      | 2612                                      | 2581                                      | 2581                                      | 2595                                       |
| Spazi (padding, margini, gap)          | 41 valori, passo 2 px al 94 %, 27 anomali | 31 valori, passo 2 px al 98 %, 20 anomali | 27 valori, passo 2 px al 99 %, 15 anomali | 26 valori, passo 2 px al 100 %, 13 anomali |
| Altezze dei controlli                  | 19                                        | 17                                        | 17                                        | 17                                         |
| Caratteri: misure · pesi · stili       | 11 · 4 · 78                               | 11 · 4 · 71                               | 11 · 4 · 71                               | 11 · 3 · 67                                |
| Raggi · spessori dei bordi · ombre     | 2 · 4 · 7                                 | 2 · 4 · 7                                 | 2 · 4 · 7                                 | 2 · 4 · 7                                  |
| Colori: testo · fondo · bordo          | 28 · 40 · 24                              | 28 · 40 · 23 (9 coppie gemelle)           | 25 · 36 · 20 (2 coppie gemelle)           | 25 · 36 · 20 (2 coppie gemelle)            |
| Pulsanti: classi visive · varianti     | 27 · 81 (12 classi con più varianti)      | 27 · 70 (11)                              | 27 · 69 (10)                              | 27 · 69 (10)                               |
| Etichette e filtri: classi · varianti  | 10 · 18 (4)                               | 8 · 12 (2)                                | 8 · 12 (2)                                | 8 · 12 (2)                                 |
| Lastre: classi visive · varianti       | —                                         | 21 · 42 (12)                              | 20 · 43 (10)                              | 20 · 44 (11)                               |
| Tendine: varianti                      | 2                                         | 1                                         | 1                                         | 1                                          |
| Pulsanti col riempimento del browser   | 0                                         | 0                                         | 0                                         | 0                                          |
| Contrasto AA: errori su testi misurati | 1 su 1230                                 | 0 su 1217                                 | 0 su 1217                                 | 0 su 1221                                  |

Quarto giro: i pesi scendono a tre e gli stili di carattere da 71 a 67; gli spazi tornano
tutti sul passo di 2 px (il rientro di 54,2 px e i margini di 3 px delle caselle
dell'iniziativa erano gli ultimi fuori passo). Le lastre contano una variante in più per
scelta: l'intestazione grigia del menu della pedina ha 12 / 20 px per allinearsi alle voci,
mentre la scheda grigia del pannello Creatura, che ha lo stesso colore ma è un altro
componente, resta a 12 px. Il campionario è stato fotografato prima e dopo, in
`polish4-solasta/specimen-before/` e `specimen-after/`.

Terzo giro, una ricetta per tipo (il campionario `directions/specimen.html?direction=solasta`
è stato fotografato prima e dopo, in `polish3-solasta/specimen-before/` e `specimen-after/`):

- **Lastre della scheda**: una sola colonna di lastre uguali, 24 px fra l'una e l'altra (erano
  40 e 48, per i margini dell'app sommati allo spazio della griglia), 24 px dentro su ogni lato
  (l'ultimo paragrafo aggiungeva 16 px al piede), piatte e senza linea come la fascia, la
  colonna delle statistiche e le lastre dell'Inizio; la striscia «Risorse del turno» è la
  stessa lastra. Le colonne delle statistiche hanno 12 px su ogni lato (prima 8 in alto).
- **Intestazioni delle lastre**: il comando va sotto il titolo quando la colonna è stretta (sul
  telefono «+ Nuova azione personalizzata» usciva dalla sua lastra); la tabella delle mosse
  comincia e finisce sul margine di 24 px della lastra, come ogni elenco (le celle esterne
  aggiungevano 8 px).
- **Titoli delle lastre**: «Tiri» e «Reazioni» (h3 nel codice) hanno lo stesso titolo da 17 px
  chiaro di «Azioni personalizzate» e «Chi può modificare la scheda» (h2); le sottosezioni
  restano in rame da 15 px.
- **Allineamenti**: «Condizioni» sta sulla linea di base di «Nessuna condizione» (prima 7 px
  più in basso), «Cambia…» su quella della sua frase; l'icona di «Offline e sincronizzazione»
  tiene gli 8 px di ogni comando (prima 14).
- **Inizio**: tutte le lastre hanno 24 px dentro (la campagna ne aveva 32, l'appuntamento 40
  sul telefono e il suo menu del calendario 8 px in più); i riquadri dei primi passi 16 px
  dentro e 12 px fra le righe (prima 18 e 10).
- **Margini della pagina**: 32 / 48 px sul computer, 32 sotto i 1000 px, 24 / 16 sul telefono
  (l'app usa 38 / 48, 28 e 25 / 18), solo per Inizio e scheda.
- **Pannello laterale del Tavolo**: 24 px dentro (l'app 23 / 20), linguette 8 / 12 px (l'app
  10 / 14 / 8), così la prima linguetta parte dal bordo del contenuto.
- **Icone**: la croce del menu della pedina ha i 21 px di ogni pulsante nudo con sola icona.
- **Colori**: tre gemelli uniti (vedi «Differenze dichiarate»), l'azzurro degli slot
  (`#57BCF4`) uguale all'azzurro di Solasta (`#56BCF4`), le cifre dei modificatori nel bianco
  del testo `#F5F5F5` (almeno 5:1 su ogni blu), la riga di stato della mappa nel grigio
  tenue, il bordo del comando «← Personaggi» trasparente sul suo fondo.

Secondo giro, che cosa è stato unificato, una ricetta per tipo:

- **Pulsanti**: contorno, pieno e discreto 40 px, 8 / 16 px, maiuscoletto da 15 px a 500;
  un solo aspetto disattivato (contorno neutro, lettere tenui) anche per il pulsante pieno e
  quello rosa; i comandi a scomparsa («Visualizzazione…», «Regola d'ingombro…», «Perché?», le
  voci del riquadro dei PF, «Novità precedenti») sono comandi discreti di 40 px.
- **Filtri**: Azioni, Magie e Inventario avevano tre spaziature e due colori per la scelta:
  ora 40 px, 8 / 12 px, 15 px a 500, la scelta nel rame scuro.
- **Etichette**: lo stato di un incantesimo («Trucchetto», «Preparata») e la politica delle
  reazioni («Chiedi») sono chip come «Equipaggiato».
- **Campi**: la modalità dei dadi è un campo come gli altri (15 px, 12 px dentro).
- **Celle e lastre**: le celle delle magie e dell'inventario hanno le stesse 12 / 8 px di quelle
  della scheda; le schede basse dell'Inizio (campagne, discussioni, tavoli pubblici, primi
  passi) sono lastre senza linea con 24 px dentro, come quelle sopra; al telefono 24 px fra
  tutte le schede dell'Inizio.
- **Icone**: 24 px nelle celle d'ardesia (strumenti, zoom, comandi del turno, la fila della
  sessione sopra la mappa), 21 px nei pulsanti nudi dell'intestazione, 18 px nelle righe del
  menu della pedina.
- **Spazi**: i margini del browser (1em, cioè 15 px sotto un testo da 15) diventano 16 px con
  uno strato a priorità minima, così i margini dell'app restano; i gap e i margini dell'app
  fra un passo e l'altro (3, 5, 6, 9, 10, 14, 18, 20, 22, 28, 30 px) sono riportati su
  4 · 8 · 12 · 16 · 24 · 32 nell'intestazione, nella scheda, nel pannello Creatura, nella
  finestra dell'iniziativa, nel menu della pedina e nell'Inizio.
- **Contrasto**: l'unico errore era il «✦» dorato di un punto di viaggio nascosto (solo DM)
  su un disco trasparente al 60 % sopra la mappa (3,3:1); il disco ora è scuro e pieno, il
  bordo tratteggiato dice ancora «nascosto».

Che cosa resta, di proposito:

- le file compatte del Tavolo sul telefono (targa della scena, intestazione) tenevano i
  comandi da 12 px per stare su una riga a 390 px (dal quinto giro sono da 15 px, S17, e
  l'intestazione resta su una riga);
- le misure fuori scala che rimangono sono la geometria della mappa e del Tavolo dell'app
  (margini 80 / 88 / 168, colonne, i 10 px delle file compatte del telefono, le righe di 1 px
  fra i riquadri), i margini di 3 px dell'interruttore «Il DM può modificare questa scheda»
  (un controllo del browser) e i 5 px sopra e sotto il marchio, quelli dell'app, che tengono
  l'altezza della testata del Tavolo;
- le altezze frazionarie (137,5, 103,5, 19,5 px) vengono dalle interlinee 1,1 e 1,45 sui testi
  da 14–24 px: mezzo pixel, invisibile;
- una coppia gemella resta: `#2A2C29` dell'app per le righe dentro le lastre (finestra
  dell'iniziativa, proprietà delle armi), che devono distinguersi dalla lastra (l'oro del
  vecchio marchio, gemello di un segno della mappa, non c'è più);
- le linguette contano ancora 12 varianti perché la barra in basso del telefono (52 px) e le
  celle delle pagine della barra seguono la loro geometria a ogni larghezza;
- i collegamenti e le caselle dentro il testo (fonti SRD, termini del glossario, caselle di
  spunta) sono sotto i 40 px come in «Attuale».

## Marchio (I-251, 01/10/2026)

Il dado e l'icona della scheda del browser sono in `brand.mjs`; la scritta «d20 Studio» è
l'ultima sezione di `direction.css`. Come il resto della direzione si vede solo con il tema
scuro: con il tema chiaro tornano il dado e l'icona di oggi. Riferimenti in
`~/Workspace/Codex/d20-studio-visual-assets/references/solasta/`, fuori dal repository.

### Che cosa prende dalla grammatica di Solasta

| Parte del marchio                                                                                                       | Da dove, in Solasta                                                  | Fonte                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Il dado disegnato piatto, con poche tinte piene e gli spigoli chiari (nessuna linea scura intorno, nessuna sfumatura)   | il dado «D20» del riquadro dei tiri                                  | SL10 `solasta-table-dice-roll-widget-d20-official.png`; ritaglio `crops/solasta-table-crop-roll-widget-d20-2022.png` |
| Le nove facce laterali in quattro ardesie piene `#222A2E` `#3B4B55` `#53656F` `#6C8089`, gli spigoli ghiaccio `#B5D3DE` | le lastre del combattimento e le loro linee di 1 px più chiare       | SL1 `solasta-table-combat-hud-bonus-other-pass-official.png`; facts §1, §4                                           |
| La faccia del «20» in rame pieno `#D69E76`, il numero nell'inchiostro scuro `#241A15`                                   | la riga attiva del menu principale, riempita di rame                 | SL32 `solasta-home-main-menu-user-locations-official.png`; facts §6                                                  |
| Il «20» in un serif grassetto con grazie (Crimson Pro 700, cifre allineate)                                             | i numeri sui dadi lanciati nel mondo                                 | SL20 `solasta-dice-inworld-initiative-rolls-official.jpg`                                                            |
| «Studio» in serif grassetto, maiuscola e maiuscoletto, rame `#F5B486`; «d20» nell'inchiostro dei nomi `#DEDCDC`         | i nomi propri («Spring Update Dungeon») e le etichette rame del menu | SL32; facts §2                                                                                                       |
| Nessuna ombra, nessun bagliore, nessun metallo                                                                          | l'interfaccia di gioco, piatta (non il logo, che è dorato)           | facts §0                                                                                                             |

### Che cosa è originale

- **Il disegno del dado.** Un vero icosaedro visto di fronte, dalla geometria comune
  `directions/brand-geometry.mjs`: è la stessa famiglia di dadi di tutte le direzioni. La luce
  viene dall'alto a sinistra ed è resa con quattro tinte piene, non con sfumature.
- **L'idea.** La faccia uscita è «la riga attiva»: rame su un corpo di ardesia, come la voce
  scelta nel menu di Solasta.
- **La scritta.** «d20» resta la notazione del dado, in minuscolo; «Studio» è scritto come un
  nome proprio di Solasta. Resta con le grazie perché in testata le pagine sono in maiuscolo
  spaziato senza grazie: una scritta in quello stile sembrerebbe una pagina in più.
- **L'icona della scheda.** Lo stesso dado senza numero (a 16 px sarebbero due pixel di
  rumore), con spigoli più spessi e un filo nero esterno che lo tiene nitido anche su una
  barra delle schede chiara.

### Perché non è una copia del logo di Solasta

Il logo di Solasta (SL32, SL20) è la parola «SOLASTA» in lettere dorate a cuneo, in rilievo,
attraversata da un anello d'oro con una coda, e sotto «Crown of the Magister» in maiuscole
rame con svolazzi. Il nostro marchio non ha oro, rilievo, anello, coda, lettere a cuneo né
svolazzi, e non usa nessuna lettera del logo: prende solo i colori e il modo di disegnare
dell'interfaccia di gioco. Non somiglia nemmeno al dado dell'editore Tactical Adventures (un
icosaedro a facce arancioni, rosse e gialle, SL61): qui il corpo è ardesia e una sola faccia è
rame. Nessun pixel, carattere o tracciato di Solasta è nel repository.

### Misure

- **Testata.** Dado 34 px (28 sul telefono e al Tavolo, dal quinto giro: 34 su una scritta
  di 20 era sproporzionato), scritta 24 px (20 al Tavolo e sotto i 720 px),
  8 px fra dado e scritta (12 visibili: il dado sta 4 px dentro il suo riquadro). Il centro
  delle cifre e delle maiuscole coincide con il centro del dado: la scritta è alzata di 1 px,
  misurata su catture a 2×.
- **Stati.** Al passaggio del mouse la scritta si schiarisce (`#F5F5F5`) e la faccia del dado
  passa al rame chiaro `#F5B486`. Con la tastiera resta l'anello di 3 px dell'app, a 11 px
  dal dado e dall'ultima lettera; al Tavolo 7 px a destra, così resta a 6 px da «App».
- **Altezze invariate.** Testata di Inizio 81 px, del Tavolo 63 px (col dado da 28 px il
  marchio ha 8 px sopra e sotto invece di 5), del telefono 109 px. A
  390 px resta solo il dado e la testata del Tavolo sul telefono non mostra il marchio, come
  oggi.
- **Spigoli.** Contorno 4,5 unità su 100 (1,5 px a 34 px), cuciture piene da 3 unità (1 px;
  fino al quarto giro 2,4 unità al 75 %, che a 1× confondevano le quattro ardesie vicine);
  l'icona della scheda 6 e 4 unità.

Prove in `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/brand-solasta/`:
`brand-solasta-montage.png` (il marchio accanto ai riferimenti di Solasta), `final/`
(testate a 1440 e 390 a 2×, sezione «Marchio» del campionario), `final/check/check-header.json`
(misure prima e dopo).

## Licenze e attribuzioni

### Icone (game-icons.net, CC BY 3.0)

Scaricate il 01/10/2026 dal repository <https://github.com/game-icons/icons> al commit
`82d948812bfe3f269ef8f731dcdb07b08160edc4` (percorso `<autore>/<nome>.svg`; copie e hash in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-solasta/game-icons/`).
Modifica: il tracciato è identico; il quadrato nero di sfondo è tolto e il riempimento
diventa `currentColor` (`icons.mjs`). Licenza: Creative Commons Attribution 3.0
(<https://creativecommons.org/licenses/by/3.0/>).

**Attribuzione:** icone di Lorc, Delapouite, sbed, Guard13007 e Quoting da game-icons.net, CC BY 3.0.

| Nome nell'app                                             | Icona game-icons                                         | Autore     | Pagina                                                              | sha256 del file scaricato                                                                                                                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------- | ---------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home`                                                    | `village`                                                | Delapouite | <https://game-icons.net/1x1/delapouite/village.html>                | `45805e2ba3ee12adcc1c67e8183e526831156a3fc9eba0595e687d79078c4048`                                                                                                                             |
| `person`                                                  | `hood`                                                   | Lorc       | <https://game-icons.net/1x1/lorc/hood.html>                         | `0b2b02bc124425c32e7c62b46c1a7bc3083d9cb2c0692797ca5f7f42dae7816a`                                                                                                                             |
| `campaign`                                                | `flying-flag`                                            | Lorc       | <https://game-icons.net/1x1/lorc/flying-flag.html>                  | `6c8494106cbf51024af8af4e6cb76c134df47dba7403f020681cc91e414ff7bb`                                                                                                                             |
| `book`                                                    | `open-book`                                              | Lorc       | <https://game-icons.net/1x1/lorc/open-book.html>                    | `fea1988dca10d827a6159328da655f9aaefcd642e2a08588d728424190fcd285`                                                                                                                             |
| `search`                                                  | `magnifying-glass`                                       | Lorc       | <https://game-icons.net/1x1/lorc/magnifying-glass.html>             | `089f628ebb75669198850f8a5caacb648f557e6844652709abcbd709f1f03037`                                                                                                                             |
| `note`                                                    | `quill-ink`                                              | Lorc       | <https://game-icons.net/1x1/lorc/quill-ink.html>                    | `6a43bf64d202adbb9a27b806c0a9891be31552399e2ebbc81a09531f2f13ea99`                                                                                                                             |
| `bell`                                                    | `ringing-bell`                                           | Lorc       | <https://game-icons.net/1x1/lorc/ringing-bell.html>                 | `af3c98f2179d59dab8396ad7f80eef7dff2819585af838e26b2b8c52e8b610de`                                                                                                                             |
| `settings`                                                | `gears`                                                  | Lorc       | <https://game-icons.net/1x1/lorc/gears.html>                        | `260ff96e39b1804e74072658cfa6cd382062826f6e8d40cb106fc530a6d38548`                                                                                                                             |
| `help`                                                    | `help`                                                   | sbed       | <https://game-icons.net/1x1/sbed/help.html>                         | `cd104a20e411728b4ce4e4acfd7aace96ead8f2731925cb4af3992e25df85cbb`                                                                                                                             |
| `check`                                                   | `check-mark`                                             | Delapouite | <https://game-icons.net/1x1/delapouite/check-mark.html>             | `ce5073c2fd9fec62ef11f6b3fd093e0a3bb6e28fd3dcf1fa2a4bfab282cb5e48`                                                                                                                             |
| `play`                                                    | `play-button`                                            | Guard13007 | <https://game-icons.net/1x1/guard13007/play-button.html>            | `f3cc25dc35d60ce4341e1e72dc0bf582100a7750e767455835fad3fd78c96f7a`                                                                                                                             |
| `map`                                                     | `treasure-map` (copia Iconify, vedi sotto)               | Lorc       | <https://game-icons.net/1x1/lorc/treasure-map.html>                 | `79a4552770bf03bbd68f33db8b6bf7f40a6a788a7a979f656e2206a22955ce37`                                                                                                                             |
| `clock`                                                   | `stopwatch`                                              | Lorc       | <https://game-icons.net/1x1/lorc/stopwatch.html>                    | `33b426a8eba3a34ee76b6d11865292a5f2e4db13dd0e6207f8f8277c0df6de20`                                                                                                                             |
| `pen`                                                     | `quill`                                                  | Lorc       | <https://game-icons.net/1x1/lorc/quill.html>                        | `3798e2034a4d7e2baef3dc7664ce9ccb30f4296c9f900cf94b3f8fcb7a0c0e5d`                                                                                                                             |
| `dice`                                                    | `rolling-dices`                                          | Delapouite | <https://game-icons.net/1x1/delapouite/rolling-dices.html>          | `876d2c2a2359d40d571a6f169db5a2d531e23beeed270b43247d63d227ad5a2c`                                                                                                                             |
| `move`                                                    | `sprint`                                                 | Lorc       | <https://game-icons.net/1x1/lorc/sprint.html>                       | `0c3c00ac8e9e9299c32ef5d5cc788d2d7c60614fdc382c3706d1d36783941c36`                                                                                                                             |
| `ruler`                                                   | `measure-tape`                                           | Delapouite | <https://game-icons.net/1x1/delapouite/measure-tape.html>           | `bd2ac6102895c2f51e080997a8305a1b77f927ee5aad073878609e0a93fad75d`                                                                                                                             |
| `flag`                                                    | `position-marker`                                        | Delapouite | <https://game-icons.net/1x1/delapouite/position-marker.html>        | `af3ed43cd81383f98e70e091bdd821f87c29c014ab04164c8c12f9d9343ba7bd`                                                                                                                             |
| `eye`                                                     | `semi-closed-eye`                                        | Lorc       | <https://game-icons.net/1x1/lorc/semi-closed-eye.html>              | `27eac39f0232eb9fd371d40fcd2f0be0e40883d854e697a573662ff8390dd312`                                                                                                                             |
| `shield`                                                  | `checked-shield`                                         | Lorc       | <https://game-icons.net/1x1/lorc/checked-shield.html>               | `9bbb465f5272eae12dfa536a31f0204eb6d65259607db5e86618d55881c945a0`                                                                                                                             |
| `chat`                                                    | `conversation`                                           | Lorc       | <https://game-icons.net/1x1/lorc/conversation.html>                 | `72ef567510df69d8b5f759cfe262bd483d55baee89e455ce2b87711847be50fc`                                                                                                                             |
| `swords`                                                  | `sword-clash`                                            | Lorc       | <https://game-icons.net/1x1/lorc/sword-clash.html>                  | `3539d083a42b5d81144efbd6807bd07523c3c0ef1144448d443aeb5561627679`                                                                                                                             |
| `sword`                                                   | `pointy-sword`                                           | Lorc       | <https://game-icons.net/1x1/lorc/pointy-sword.html>                 | `664296c33c4bcb0f913f8af02a29fa8bc6b555fff557a7fd786a2dc60f5decdb`                                                                                                                             |
| `light`                                                   | `lantern-flame`                                          | Lorc       | <https://game-icons.net/1x1/lorc/lantern-flame.html>                | `7161627a48ed29eae7f15c608010a20ead24977f8f67476c98f0f769a78c7986`                                                                                                                             |
| `scroll`                                                  | `tied-scroll`                                            | Lorc       | <https://game-icons.net/1x1/lorc/tied-scroll.html>                  | `8dec10d48e8c0012a30d7146b4187e8ed9aa016029de5f87cc254c129dc3c1d6`                                                                                                                             |
| `cards`                                                   | `card-play`                                              | Quoting    | <https://game-icons.net/1x1/quoting/card-play.html>                 | `3d3558b885175c7a1e5297a1e2762d71fcb609ab15db16d46c4b3ffc150102ec`                                                                                                                             |
| `bag`                                                     | `knapsack`                                               | Lorc       | <https://game-icons.net/1x1/lorc/knapsack.html>                     | `d5f3f1b087b23f8a1082674b9ac19f1530b936802f8f1bb2982d5f7e03547396`                                                                                                                             |
| `undo`                                                    | `anticlockwise-rotation`                                 | Delapouite | <https://game-icons.net/1x1/delapouite/anticlockwise-rotation.html> | `81bdef95c5974378ad186499b093331df5dc494b9ab314b622db093f7844b177`                                                                                                                             |
| `close`                                                   | `cancel`                                                 | sbed       | <https://game-icons.net/1x1/sbed/cancel.html>                       | `e8d3551075bea82946e201c20ac6958a6a150644a6e8010aeabecafdd86daa8a`                                                                                                                             |
| (maschera CSS di «Termina turno»)                         | `hourglass` → `assets/hourglass.svg`                     | Lorc       | <https://game-icons.net/1x1/lorc/hourglass.html>                    | file scaricato `38459facefd9e01b25f2ef5d490d6ac5ac49ae51441b15f7c140e389e7650959`; file nel repository `1c2efeff8a2062bd83a89ce6dec0cd8465aa0b4f66ef9c6f02055a76e40cc73d`                      |
| (maschera CSS di «Nascondi interfaccia»)                  | `semi-closed-eye` → `assets/semi-closed-eye.svg`         | Lorc       | <https://game-icons.net/1x1/lorc/semi-closed-eye.html>              | file scaricato `27eac39f0232eb9fd371d40fcd2f0be0e40883d854e697a573662ff8390dd312` (lo stesso di `eye`); file nel repository `fbcc3498330878b1ebece95cd7f6b219bd8cbc428d83c1a2aaf6c30a5989e8a9` |
| (maschera CSS della scheda «Scena» e del comando «Scene») | `tower-flag` → `assets/tower-flag.svg` (copia Iconify)   | Delapouite | <https://game-icons.net/1x1/delapouite/tower-flag.html>             | file scaricato `a0db7698c1f6a6bf5dd85e0ff8aa870addd363527445c08cc569ef4c33217e41`; file nel repository `9d88a03ce71fa852fcb69b250d9885614bd2c9eb85bcc50191caa7adf6c222e7`                      |
| (maschera CSS di «Disegna»)                               | `paint-brush` → `assets/paint-brush.svg` (copia Iconify) | Delapouite | <https://game-icons.net/1x1/delapouite/paint-brush.html>            | file scaricato `a4407ca65c072c88f16f05de802ac718dbeefa2221c825cce419970e68fa8f86`; file nel repository `7bd6e9696d34bab9df4e39282881f97f6cc5f5e614ae77358f5debf28301fee4`                      |

Quinto giro (01/10/2026): `treasure-map`, `tower-flag` e `paint-brush` non sono stati scaricati
di nuovo. Sono le copie già scaricate il 30/09–01/10 da `https://api.iconify.design/game-icons/<nome>.svg`
per le opzioni 1 e 7 (stessi sha256 delle loro righe in `bg3/SOURCES.md` e `owlcat/SOURCES.md`;
copie in `…/visual-01/probe-bg3/game-icons-fetched/` e `…/probe-owlcat/game-icons/`, autore
verificato sul repository game-icons). Il tracciato è quello di Iconify, invariato; nelle tre
maschere in `assets/` è tolto solo l'involucro. La bussola `lorc/compass` non è più usata: a
20–24 px sembrava un cartello di divieto.

Le icone generiche (più, frecce, menu, pannello, griglia) restano quelle dell'app, disegnate
con un tratto più spesso; le icone disegnate dall'app stessa (risorse del turno, pedina,
menu della pedina) non cambiano.

### Caratteri (SIL Open Font License 1.1)

File woff2 non modificati dai pacchetti Fontsource **5.3.0** (sottoinsiemi latin e latin-ext);
ogni cartella ha il suo `OFL.txt` preso da `google/fonts` al commit
`9710da1eacb3be272583c3224dcb70f9da6eadbb`. Riga aggiunta anche in `assets/ATTRIBUTION.md`.

| Cartella                      | Famiglia, file                                                                                                                                                                                                                                                             | Copyright                                                                                 | sha256                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `assets/fonts/source-sans-3/` | Source Sans 3, variabile 200–900, normale: `source-sans-3-latin-wght-normal.woff2`, `source-sans-3-latin-ext-wght-normal.woff2` (pacchetto `@fontsource-variable/source-sans-3@5.3.0`)                                                                                     | Copyright 2010-2020 Adobe, with Reserved Font Name «Source»                               | `7a19a7027e125257d310c6dbd78ae3a30b5ea1e3794d60b12bb28227a003bfda`, `a85a7459bdb3cdc1136751e151a506bae653fc29ada3ca86237477df6f1b59e6`; `OFL.txt` `09746787287a289323b0ec3cff4d1a4a801331b82b7207c1e186f5d26619a392`                                                                                                                                         |
| `assets/fonts/crimson-pro/`   | Crimson Pro, variabile 200–900, normale e corsivo: `crimson-pro-latin-wght-normal.woff2`, `crimson-pro-latin-ext-wght-normal.woff2`, `crimson-pro-latin-wght-italic.woff2`, `crimson-pro-latin-ext-wght-italic.woff2` (pacchetto `@fontsource-variable/crimson-pro@5.3.0`) | Copyright 2018 The Crimson Pro Project Authors (https://github.com/Fonthausen/CrimsonPro) | `20ce4189b9e41b3439a2a36dd63deff44b6d91182532202cb96b65521b4a3c23`, `ac89a08a6e022ad4f3af961eb95474b7d8531c67ff88b40194bb3569d2d64e1d`, `b3faa8f9ce36db53253e11fb107d77b983150c5c21dc8fcf3906234530ab69f2`, `01df7b443a6f81915a65df47439121da8307f8a574fadd7cde57c77d0b68c77b`; `OFL.txt` `1820869bd5baa1c2d88fa87c89eea532cf9442d841008acab720654b7f82823d` |

Il marchio usa gli stessi caratteri: Crimson Pro 700 per la scritta e per il «20» sul dado. La preferenza «carattere
leggibile» (Verdana) continua a valere sopra questi caratteri. «Source Sans 3 Fallback» non è
un file: è un nome dato all'Arial già installata (`local("Arial")`), ridimensionata, usata
solo finché Source Sans 3 non è caricato.

### Immagini

| File                                               | Da dove                                                                                                       | Autore e licenza                                                                                            | sha256                                                             | Modifiche                                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `assets/campaign-hall.webp` (1672 × 941, 87 072 B) | `~/Workspace/Codex/d20-studio-visual-assets/candidates/plates/compendium-scene.webp` (MANIFEST riga 31, SAFE) | Immagine generata dal proprietario (gpt-image via ChatGPT, C2PA nel master `images_d20folio/PROMPT_18.png`) | `4d71cd5ce9de6680b0ff7841c46f73c9d4245d9479fdfa80ff7fe2f5b211db07` | Nessuna (copia identica); immagine della campagna nell'Inizio («Continua a giocare»), come la miniatura della campagna di «New Adventure» |
| `assets/hourglass.svg`                             | game-icons.net `lorc/hourglass.svg` (vedi sopra)                                                              | Lorc, CC BY 3.0                                                                                             | `1c2efeff8a2062bd83a89ce6dec0cd8465aa0b4f66ef9c6f02055a76e40cc73d` | Tolto il quadrato di sfondo; usato solo come maschera                                                                                     |
| `assets/semi-closed-eye.svg`                       | game-icons.net `lorc/semi-closed-eye.svg` (vedi sopra)                                                        | Lorc, CC BY 3.0                                                                                             | `fbcc3498330878b1ebece95cd7f6b219bd8cbc428d83c1a2aaf6c30a5989e8a9` | Tolto il quadrato di sfondo; usato solo come maschera («Nascondi interfaccia»)                                                            |
| `assets/tower-flag.svg`                            | game-icons.net `delapouite/tower-flag` (copia Iconify, vedi sopra)                                            | Delapouite, CC BY 3.0                                                                                       | `9d88a03ce71fa852fcb69b250d9885614bd2c9eb85bcc50191caa7adf6c222e7` | Tolto l'involucro; usato solo come maschera (scheda «Scena», comando «Scene»)                                                             |
| `assets/paint-brush.svg`                           | game-icons.net `delapouite/paint-brush` (copia Iconify, vedi sopra)                                           | Delapouite, CC BY 3.0                                                                                       | `7bd6e9696d34bab9df4e39282881f97f6cc5f5e614ae77358f5debf28301fee4` | Tolto l'involucro; usato solo come maschera («Disegna»)                                                                                   |

I ritratti e la mappa dipinta sono quelli comuni a tutte le direzioni (`directions/sample.css`,
`assets/PROVENANCE.json`). Nessun pixel, carattere, texture, logo o cornice di Solasta è nel
repository: le immagini di Solasta servono solo come riferimento, fuori dal repository.
