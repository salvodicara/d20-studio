# Opzione 7 · Pathfinder: Wrath of the Righteous — da dove viene ogni scelta

Direzione `owlcat` del primo giro di «Design visivo» (Scelta 1 — Direzione, I-248), costruita il
01/10/2026. Copia l'interfaccia di _Pathfinder: Wrath of the Righteous – Enhanced Edition_ di
Owlcat Games, in modalità a turni. Si copiano solo la disposizione, le proporzioni, i tipi di
elemento, i comportamenti e i colori campionati: nessun pixel, carattere, texture, logo o cornice
del gioco è nel repository. Misure e campioni: `facts.md` e `manifest.md` in
`~/Workspace/Codex/d20-studio-visual-assets/references/owlcat/` (fuori dal repository; «W1»,
«W12»… sono le righe del manifest). Le regole sono in `direction.css`; le icone in `icons.mjs`.

## In tre righe

1. Copia Wrath of the Righteous, il contrario di Baldur's Gate 3: tutto ciò che si legge sta su
   **pergamena opaca e fredda** con inchiostro blu-ardesia scuro, trattenuta da **ferro annerito**
   con piccole gemme viola agli angoli.
2. Il **prugna** è l'unico colore di ciò che è attivo o scelto; i titoli hanno la **capolettera
   rossa sangue di bue**, le etichette sono in **maiuscoletto**, gli angoli sono vivi e solo i
   medaglioni sono rotondi.
3. Si sente come un **libro di campagna sul tavolo a lume di candela**: la scheda è un libro
   aperto, l'Inizio è un menu scritto a mano sulla pagina, il Tavolo ha la barra delle azioni in
   ferro sopra una fila di caselle su una striscia di pergamena.

## Elemento → prodotto copiato → fonte

«Fonte» = l'immagine di riferimento (cartella sopra; indirizzi d'origine nella tabella «Immagini
di riferimento» in fondo) oppure la misura in `facts.md`.

### Tutte le pagine

| Elemento                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Prodotto copiato                                                            | Fonte                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Carattere unico per testi, titoli ed etichette: Vollkorn (pesi 400–700, cifre allineate)                                                                                                                                                                                                                                                                                                                                                                                                                    | WotR usa FF Nexus Serif (commerciale); Vollkorn ha le stesse proporzioni    | facts §0.6 (x/ascendente 0,642, larghezza 1,02 del riferimento); `wotr-sheet-levelup-deity-domain-official.png` (W19)     |
| Capolettera dei titoli in IM Fell English SC, rosso sangue di bue #6B2F36, 1,4 volte la riga (1,7 volte nelle righe del menu dell'Inizio)                                                                                                                                                                                                                                                                                                                                                                   | Iniziali lombarde rosse di WotR («Storandus», «Equipment», «Augmented»)     | `wotr-sheet-inventory-doll-1440.jpg` (W12), `wotr-table-tb-hud-inspect-fullattack-4k.jpg` (W1); facts §0.6                |
| Pergamena #D9D2CA con inchiostro #1E1E2C; testo secondario #444653; il bordo della pagina un po' più scuro (#A89F92)                                                                                                                                                                                                                                                                                                                                                                                        | Carta fredda e opaca di tutti i pannelli                                    | W19 (campioni senza perdita), facts §0.2 e §0.5                                                                           |
| Etichette color bronzo (#6A4A2C), scurite dal #8A5E37 misurato per arrivare a 4,5:1                                                                                                                                                                                                                                                                                                                                                                                                                         | Etichette dei campi «Casting time», «Damage Reduction»                      | `wotr-dialog-tooltip-spell-bless-fextralife.jpg` (W38), W1; facts §0.5                                                    |
| Parole chiave e collegamenti prugna #703465 (#4F1F47 sulle righe grigie); i collegamenti che si aprono sul posto («Novità precedenti», «Regola d'ingombro…», «Visualizzazione…», «Perché?») e i «vedi tutto» dei fogli dell'Inizio in una sola ricetta, 15 px, 600                                                                                                                                                                                                                                          | Parole chiave nel testo delle regole                                        | W19; facts §0.5                                                                                                           |
| Ferro annerito: barre #1A1A1C–#232026 con riflesso in alto, tessere #1C1C20, filo #5E5E6E                                                                                                                                                                                                                                                                                                                                                                                                                   | Cornici, piastre del piè di pagina, tessere degli strumenti                 | W1, W19; facts §0.3                                                                                                       |
| Cornice di ferro da 6 px con una gemma viola (#AB56B1 / #6B3A6B) e piccole spine a ogni angolo, disegnata qui come geometria (`assets/iron-frame.svg`)                                                                                                                                                                                                                                                                                                                                                      | Cornice in ferro con filigrana gotica e gemme viola                         | W12, W1; facts §0.7                                                                                                       |
| Prugna come unico colore attivo: linguetta aperta #36172C, cella disponibile #3C1129, pillole #5F485C, pulsante principale #60475C                                                                                                                                                                                                                                                                                                                                                                          | Scudo della linguetta aperta, celle d'azione, sottoschede, «CONTINUE»       | W12, W1, `wotr-sheet-character-summary-alignment-1440.jpg` (W15), `wotr-dialog-conversation-two-portraits-1080.jpg` (W34) |
| Intestazione dell'app come barra di linguette in ferro (#1C0E0D): parole in maiuscoletto bronzo-grigio senza icone; la pagina aperta è uno scudo prugna che pende dalla barra                                                                                                                                                                                                                                                                                                                               | Barra superiore INVENTORY · CHARACTER · … con lo scudo prugna               | W12, W15                                                                                                                  |
| Pulsanti dei servizi come tessere quadrate di ferro con il glifo chiaro, senza margini interni; passandoci sopra si accende solo il bordo (gemma), il prugna resta per ciò che è attivo                                                                                                                                                                                                                                                                                                                     | Griglia degli strumenti in basso a sinistra                                 | W1 (ritaglio degli strumenti); facts §0.7 (c)                                                                             |
| Pulsanti: piastre di ferro quadrate con scritta chiara in maiuscoletto spaziato; il principale prugna chiaro (#60475C); premuto = prugna scuro con l'anello crema. Una sola misura ovunque (anche sulla targa della scena e nel menu della pedina): 40 px, margini 8/16, 15 px, spaziatura 0,04 em                                                                                                                                                                                                          | «BACK · NEXT», «CONTINUE»                                                   | W19, W34                                                                                                                  |
| Campi piatti e quadrati sulla pergamena chiara dei riquadri (#F2EBE1: il grigio freddo #C8C8C8 di W19 sulla carta calda sembrava un buco), inchiostro scuro, filo di ferro (3:1 sulla carta) e un'ombra interna di 1 px; alti 40 px come i pulsanti e i cartellini accanto                                                                                                                                                                                                                                  | Campo di ricerca                                                            | W19; facts §0.2                                                                                                           |
| Finestre di dialogo: pergamena nella cornice di ferro, titolo con capolettera sopra la doppia riga da disegno (cerchio con mirino al centro), piede separato da una pennellata bronzo                                                                                                                                                                                                                                                                                                                       | Finestra del dialogo, scheda d'evento, suggerimento                         | W34, `wotr-dialog-global-map-event-card-1080.jpg` (W43), W38                                                              |
| Pulsante di chiusura rotondo in ferro, uguale nelle finestre e nel menu della pedina (croce da 21 px)                                                                                                                                                                                                                                                                                                                                                                                                       | «X» rotonda del libro                                                       | W12                                                                                                                       |
| Pennellate bronzo da 4 px fra le parti (#A68D79 → #876F57)                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Righe fra le voci del suggerimento                                          | W38; facts §0.7                                                                                                           |
| Filigrana da disegno sulla carta (cerchi di compasso, linee di costruzione) al 9 %, disegnata qui (`assets/drafting.svg`)                                                                                                                                                                                                                                                                                                                                                                                   | Cerchi di compasso e appunti in filigrana sulla carta                       | W12, W19; facts §0.7                                                                                                      |
| Angoli vivi ovunque; cerchi solo per i medaglioni (chiusura, Termina turno, totale d'iniziativa, contatori)                                                                                                                                                                                                                                                                                                                                                                                                 | «Corner radius = 0», medaglioni rotondi                                     | facts §0.7                                                                                                                |
| Sottoschede come pillole prugna rettangolari con filo chiaro interno; quella aperta più scura con una gemma a rombo sotto (forma, non solo colore)                                                                                                                                                                                                                                                                                                                                                          | SUMMARY · ABILITIES · MARTIAL …                                             | W15; tacca a gemma della barra dei passi W19                                                                              |
| Filtri come cartellini di carta in maiuscoletto; scelto = prugna con la riga gemma                                                                                                                                                                                                                                                                                                                                                                                                                          | Pulsanti di filtro con quello attivo prugna                                 | W12                                                                                                                       |
| Selezione del testo prugna, barre di scorrimento ferro / bronzo, anello del fuoco 3 px gemma sul ferro e prugna sulla carta; nelle barre di linguette l'anello è disegnato dentro la linguetta, sul ferro (3,4–3,9:1)                                                                                                                                                                                                                                                                                       | Palette del prodotto applicata alle superfici del browser                   | facts §0.3, §0.5                                                                                                          |
| Scale I-250: spazi 2 · 4 · 8 · 12 · 16 · 24 · 32 · 48; caratteri 11 · 12 · 13 · 15 · 16 · 18 · 21 · 28 · 36; pesi 400 · 600 · 700; interlinea 1 / 1,15 / 1,25 (1,25 impostata sulla radice, così anche il testo che l'app lasciava a 1,5 la segue); spaziatura delle lettere 0, 0,04 em, 0,08 em; raggio 0; bordi 1 · 2 · 4 · 6; altezze 24 (cartellini) / 40 / 44 / 48; ombre con nome: tre elevazioni (rilievo della tessera, piastra sulla mappa, alone della pagina) e sei filetti disegnati come ombre | Misure di WotR a 1080p riportate a 900 px di altezza                        | facts §0.6, §1, §6 (vedi l'intestazione di `direction.css`)                                                               |
| Elemento attivo sul ferro (strumento della mappa, colonna delle sezioni, comandi del turno, livelli di indebolimento, pulsante premuto): tessera prugna con un anello crema interno da 2 px, così si distingue per luminosità e forma, non solo per colore (il prugna sul ferro è 1,1:1)                                                                                                                                                                                                                    | Tessera della torre accesa in prugna; doppio filo crema del ritratto scelto | W1; facts §0.3                                                                                                            |
| Tasti («Maiusc+X», «Maiusc+Invio») in un solo stile: cartellino di carta con filo sottile e inchiostro grigio                                                                                                                                                                                                                                                                                                                                                                                               | Etichette dei comandi sulla carta                                           | W38                                                                                                                       |

### Inizio

| Elemento                                                                                                                                                                                                                                                                                                                         | Prodotto copiato                                        | Fonte                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| Scrivania a lume di candela dietro tutta la pagina, tinta di viola con una fusione «colore» (#623C8C) che tiene la luce della candela e prende la tinta di WotR; la zona del titolo è scurita (78 %), così il sottotitolo chiaro resta sopra 4,5:1 anche sulla fiamma: tavola dipinta dal proprietario `assets/desk-candle.webp` | Menu principale: natura morta 3D su una scrivania viola | `wotr-home-main-menu-book-1440.jpg` (W26); facts §3 |
| Tre nastri segnalibro (sangue di bue, prugna, cachi) con la coda di rondine in basso, appesi al bordo alto del libro «Continua a giocare» subito a destra del dorso: larghi 12 px, a 8 px l'uno dall'altro, lunghi 48 · 36 · 40 px, mai sopra la cornice del quadro; sul telefono spariscono col quadro                          | Nastri del libro del menu                               | W26                                                 |
| «Continua a giocare» come libro aperto: a sinistra il quadro incorniciato dell'ultima scena (la mappa del cortile), a destra la pagina con il dorso ombreggiato                                                                                                                                                                  | Libro aperto e specchio incorniciato                    | W26                                                 |
| «Entra al Tavolo» e «Apri campagna» scritti a mano sulla pagina: parole grandi viola-blu (#2C1E4E) con l'iniziale rossa grande; nessuna piastra, sottolineatura prugna al passaggio                                                                                                                                              | «Continue · New game · Load game …»                     | W26; facts §3 (colori del menu)                     |
| «Prossimo appuntamento» come lettera appoggiata di sbieco (−1,5°), con gli stessi margini interni degli altri fogli                                                                                                                                                                                                              | Lettera dello studio in basso a sinistra                | W26                                                 |
| Telefono: un solo ritmo lungo la colonna, 16 px fra un foglio e l'altro (anche «Accesso rapido») e 12/16/16 dentro ogni foglio                                                                                                                                                                                                   | Scale del prodotto (copy plan §6.5)                     | facts §6.5                                          |
| Tutti i riquadri come fogli di pergamena opachi, senza bordo, con un alone scuro sulla scena; «Accesso rapido» (compare dopo aver aperto una scheda sul dispositivo) è uno di questi fogli, con le schede recenti come righe grigie del registro e il ritratto nella cornice crema                                               | Carta opaca, alone sulla scena 3D; righe della lista    | facts §0.7 «Elevation»; W19                         |
| Titoli dei fogli con capolettera sopra la doppia riga da disegno                                                                                                                                                                                                                                                                 | Titoli dei pannelli                                     | W19                                                 |
| Novità · Guide · Supporto come pillole prugna                                                                                                                                                                                                                                                                                    | Sottoschede del personaggio                             | W15                                                 |
| «Il tuo personaggio»: ritratto in cornice crema dentro il ferro, punti ferita con il cuore                                                                                                                                                                                                                                       | Ritratto incorniciato con il cuore dei PF               | W12                                                 |

### Scheda (Azioni, Magie, Inventario)

| Elemento                                                                                                                                                                                                                                                                            | Prodotto copiato                                           | Fonte                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| La scheda è un solo libro di pergamena nella cornice di ferro con le gemme, sulla scrivania scura                                                                                                                                                                                   | Libro a tutto schermo                                      | W12, W15                                                 |
| Nome grande con capolettera; «Maga · Livello 3» in corsivo bronzo; ritratto con filo crema, ferro e oro                                                                                                                                                                             | Colonna d'identità («Storandus», «Experience · Level 16»)  | W12                                                      |
| Le caratteristiche come registro: abbreviazione color ruggine (#844833) in alto, modificatore grande, punteggio nella cella grigia, celle separate da righe puntinate bronzo, il registro chiuso da due fili                                                                        | Tabella STR / STRENGTH · valore · modificatore             | W12, W15; facts §2                                       |
| Tiri salvezza come il registro: «FOR» ruggine sopra il piccolo «Forza»; nella colonna Abilità il nome sta al centro della riga come nei tiri salvezza                                                                                                                               | «STR» sopra «STRENGTH»                                     | W12                                                      |
| Punti ferita: cuore rosso scuro prima di «18 / 22»; sulla pagina la barra nella rampa prugna delle barre di esperienza e di carico (il verde puro #03FB05 resta sui ritratti del Tavolo, dove lo mette WotR)                                                                        | Distintivo a cuore, barre verdi dei PF                     | W12, W1                                                  |
| «Cura» e «Danno» piastre di ferro come gli altri comandi, con un filo di 4 px a sinistra nel verde e nel rosso degli anelli della mappa e un glifo (cuore, lama); nella fascia impilati con la quantità in mezzo                                                                    | Verde «prerequisito soddisfatto», rosso delle iniziali     | W19                                                      |
| Gruppi (Tiri salvezza, Abilità, Azione, Trucchetti, Livello 1, Addosso…) sotto bande di pennello cachi (#C8B99D) con capolettera e due fili che sporgono                                                                                                                            | «ATTACK», «PREREQUISITES», «ARMOR CLASS AND SAVING THROWS» | W12, W19                                                 |
| Valori delle righe nel cartellino grigio (#BAB6B2), righe separate da puntini bronzo                                                                                                                                                                                                | Elenco delle abilità con il valore a sinistra              | W15, `wotr-sheet-skills-list-crop-fextralife.jpg` (W18)  |
| Competenza come rombo prugna pieno                                                                                                                                                                                                                                                  | Nodi e tacche a gemma                                      | W19                                                      |
| Gioco / Modifica e Dadi digitali / fisici come pillole prugna                                                                                                                                                                                                                       | Sottoschede prugna                                         | W15                                                      |
| Barra dei PE sottile con il prugna della barra di caricamento                                                                                                                                                                                                                       | Barra di caricamento #593155                               | `wotr-home-loading-screen-hint-1440.jpg` (W28)           |
| «Cosciente» su banda salvia con il dischetto verde                                                                                                                                                                                                                                  | Riga «prerequisito soddisfatto» #AFB2A6 / #607952          | W19                                                      |
| Indebolimento 1–6 come tessere di ferro con la cifra chiara; i livelli raggiunti prugna con l'anello crema                                                                                                                                                                          | Tessere degli strumenti                                    | W1                                                       |
| I quattro riquadri dell'inventario due per riga, così «Gestisci monete» e «Gestisci sintonia» stanno su una riga; i punti ferita «18 / 22» non vanno mai a capo                                                                                                                     | Statistiche del peso e delle monete                        | W12                                                      |
| Linguette delle sezioni: la barra di ferro del libro con lo scudo prugna e la gemma sotto                                                                                                                                                                                           | Barra superiore del libro                                  | W12, `wotr-sheet-spellbook-tooltip-fextralife.jpg` (W17) |
| Risorse del turno come celle d'azione prugna                                                                                                                                                                                                                                        | Celle della barra delle azioni                             | W1                                                       |
| Sezioni senza riquadro: ogni sezione si apre con una pennellata bronzo e il titolo sopra la doppia riga                                                                                                                                                                             | Pagine del libro                                           | W12, W19                                                 |
| Magie e oggetti come righe grigie (#BAB6B2) con filo sottile; l'icona dell'oggetto su tessera scura con cornice grigio-ferro da 2 px                                                                                                                                                | Tessere degli incantesimi, righe della lista               | W17, W19                                                 |
| Dati del lanciatore e i quattro riquadri dell'inventario come celle del registro con etichetta bronzo in maiuscoletto                                                                                                                                                               | Statistiche del lanciatore, peso e monete                  | W17, W12                                                 |
| Slot degli incantesimi come rombi prugna, pieni se disponibili                                                                                                                                                                                                                      | Dischi prugna dei livelli                                  | W17                                                      |
| Peso trasportato come linea sottile col carico in prugna; set d'armi attivo in cornice viola #54254E                                                                                                                                                                                | Barra del peso, set d'armi I–IV                            | W12                                                      |
| Un solo interruttore (Ispirazione eroica, effetti, «Disponibile offline», «Il DM può modificare»): pozzetto di ferro quadrato 40 × 22 con la manopola quadrata da 14 px; acceso, pozzetto prugna #3C1129 e manopola gemma all'altro capo (la posizione lo dice, non solo il colore) | Interruttori a passi prugna                                | W15 [I]                                                  |

### Tavolo

| Elemento                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Prodotto copiato                                      | Fonte                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Nome della scena su una targa di pergamena con capolettera                                                                                                                                                                                                                                                                                                                                                                                                | Targa dell'obiettivo                                  | `wotr-table-tb-hud-initiative-objective-gamerant.jpg` (W8)                                                  |
| Strumenti, zoom e comandi della sessione come tessere di ferro in una piastra di ferro; lo strumento attivo prugna                                                                                                                                                                                                                                                                                                                                        | Griglia degli strumenti con la torre accesa in prugna | W1                                                                                                          |
| Ordine di turno allineato a sinistra dal 28 % della mappa; carte quadrate col ritratto; chi agisce largo 88 px (circa 1,4 volte le altre, da 64) ma alto come le altre, in oro pallido #C1AE8D con una gemma viola in cima e «Turno attuale» su una targhetta ai piedi del ritratto; nemici in rosso scuro #510102 con il teschio; i nomi in maiuscoletto senza spaziatura, così «Esploratore» sta nella carta; sul telefono il ritratto riempie la carta | Fila d'iniziativa                                     | W1, W3; facts §1                                                                                            |
| Nomi su targhette di pergamena sotto le carte e sulla mappa (inchiostro con alone di carta, maiuscoletto, 13 px)                                                                                                                                                                                                                                                                                                                                          | Targhette dei nomi sulla mappa                        | W1 («ZHAKFAR»)                                                                                              |
| Anelli: alleati verde sottile (#4DE749), nemici rosso spesso (#BE3319, tratteggiato dall'app), selezione oro pallido                                                                                                                                                                                                                                                                                                                                      | Cerchi di selezione                                   | `wotr-table-selection-circles-steam.jpg` (W9)                                                               |
| Barra delle azioni: una sola barra di ferro appoggiata sulla cornice della barra rapida, larga quanto la striscia; le celle si dividono la larghezza come MOVE 39 · STANDARD 39 · SWIFT · FREE di WotR → Movimento 39 · Azione 39 · Bonus 11 · Reazione 11 (mai più strette delle loro parole), con le parole in maiuscoletto; prugna se disponibili, quasi nere se spese; gli slot degli incantesimi chiudono la barra come rombi                        | Barra 5 FT · MOVE · STANDARD · SWIFT · FREE           | W1, `wotr-table-tb-hud-actionbar-tutorial-fextralife.jpg` (W3); facts §1 (quote 11 / 39 / 39 / 5,5 / 5,5 %) |
| Dadi digitali/fisici e «Tiri e risultati» come estremità destra della barra, alta quanto la barra; «Tiri e risultati» è una tessera con un dado                                                                                                                                                                                                                                                                                                           | Disco della clessidra alla fine della barra           | W3                                                                                                          |
| Telefono: le quattro celle restano tutte visibili come celle da 16 px con il solo segno (le parole restano i nomi accessibili)                                                                                                                                                                                                                                                                                                                            | Barra intera nel layout per controller                | `wotr-sheet-controller-abilities-4k.jpg` (W23); facts §6.5                                                  |
| Una fila di caselle quadrate da 56 px con cornice grigio-ferro da 2 px, una sola linea di cornice fra vicine, su una striscia di pergamena; il nome intero sotto la casella dove WotR mette il numero, su due righe a 11 px (sillabato solo se una parola è più larga della casella, mai meno di quattro lettere a capo: «Disim-pegno»), mai troncato                                                                                                     | Barra rapida a 12 caselle con le monete numerate      | W1, W3; facts §1                                                                                            |
| Icona dell'azione chiara su tessera scura a gradiente radiale                                                                                                                                                                                                                                                                                                                                                                                             | Icone dipinte delle abilità                           | W1; facts §0.7 (a)                                                                                          |
| La striscia nella cornice di ferro con le gemme; il personaggio su piastra di ferro a sinistra                                                                                                                                                                                                                                                                                                                                                            | Cornice della barra d'azione                          | W1                                                                                                          |
| Pagine della barra (Azioni / Barra rapida) come pillole prugna                                                                                                                                                                                                                                                                                                                                                                                            | Sottoschede                                           | W15                                                                                                         |
| Termina turno: disco rotondo di ferro e prugna con la clessidra, le parole restano sul disco                                                                                                                                                                                                                                                                                                                                                              | Disco con la clessidra alla fine della barra          | W3                                                                                                          |
| Ritratti del gruppo come carte alte in ferro con la barra verde verticale dei PF sul bordo sinistro; il selezionato in cornice crema con la corona di gemma viola                                                                                                                                                                                                                                                                                         | Vassoio del gruppo                                    | W1                                                                                                          |
| Pannello laterale come scheda d'ispezione di pergamena tenuta da una barra di ferro; CA come cella del registro; «Scheda completa» e «Inventario» uno per riga                                                                                                                                                                                                                                                                                            | Scheda d'ispezione del nemico                         | W1, `wotr-table-tb-inspect-card-pcgamer.jpg` (W7)                                                           |
| Avviso «Sessione non avviata» del DM come la scheda dell'obiettivo: le parole in alto, sotto una fila con «Avvia ora» (il prugna di CONTINUE) e «Non ora», alla misura unica dei pulsanti (40 px, 8/16, 15 px); sul telefono sotto le carte del turno                                                                                                                                                                                                     | Scheda dell'obiettivo                                 | W8, W34                                                                                                     |
| Colonna delle sezioni come tessere di ferro, quella aperta prugna                                                                                                                                                                                                                                                                                                                                                                                         | Linguette del registro, tessere                       | W1                                                                                                          |
| Riga di stato della mappa su targa di pergamena, la scala in maiuscoletto bronzo                                                                                                                                                                                                                                                                                                                                                                          | Targa dell'obiettivo                                  | W8                                                                                                          |
| Finestra dell'iniziativa: righe del registro fra puntini bronzo, totale nel medaglione scuro #210A10 con cifre oro pallido                                                                                                                                                                                                                                                                                                                                | Contatore del round                                   | W1                                                                                                          |
| Menu della pedina: scheda di pergamena nella cornice di ferro, nome con capolettera, voci fra pennellate bronzo, scelta in prugna                                                                                                                                                                                                                                                                                                                         | Scheda d'ispezione e suggerimento                     | W1, W38                                                                                                     |

### Icone

| Elemento                                                                                                                                                                                                                      | Prodotto copiato                                                                                            | Fonte              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------ |
| Sagome piene di game-icons.net per navigazione, servizi, strumenti, colonna e barra (castello, incappucciato, cannocchiale, piuma e calamaio, sigillo di ceralacca, ingranaggi, mappa del tesoro, pennello, impronta, zaino…) | Sagome chiare incise sulle tessere di ferro (borsa, elmo, libro, pergamena, bussola, clessidra, ingranaggi) | facts §0.7 (c); W1 |
| I piccoli segni dentro i comandi (chiudi, annulla, più, frecce, menu, pannello, griglia) restano quelli dell'app                                                                                                              | Segni semplici incisi sui bottoni rotondi                                                                   | W12, W1            |

## Coppie per il confronto

Schermate nostre: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round1/owlcat/`;
le coppie già affiancate sono in `…/round1/owlcat/_pairs/` (rifatte il 01/10 alle 15:40–15:41, dopo il
quarto giro di rifinitura; ogni pannello alla sua larghezza, con il nome del file sopra).

| Coppia                   | Nostra schermata                                | Riferimento WotR                                                                                     |
| ------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Inizio                   | `home-dark-1440-owlcat.png`                     | `wotr-home-main-menu-book-1440.jpg`, `wotr-home-new-game-difficulty-1440.jpg`                        |
| Inizio (telefono)        | `home-dark-390-owlcat.png`                      | `wotr-home-main-menu-book-1440.jpg`                                                                  |
| Scheda                   | `sheet-dark-1440-owlcat.png`                    | `wotr-sheet-inventory-doll-1440.jpg`, `wotr-sheet-character-summary-alignment-1440.jpg`              |
| Scheda (telefono)        | `sheet-dark-390-owlcat.png`                     | `wotr-sheet-character-summary-alignment-1440.jpg`, `wotr-sheet-controller-abilities-4k.jpg`          |
| Tavolo                   | `table-combat-dark-1440-owlcat.png`             | `wotr-table-tb-hud-inspect-fullattack-4k.jpg`                                                        |
| Tavolo (DM)              | `table-combat-dm-dark-1440-owlcat.png`          | `wotr-table-tb-hud-actionbar-tutorial-fextralife.jpg`, `wotr-table-tb-hud-inspect-fullattack-4k.jpg` |
| Tavolo (telefono)        | `table-combat-dark-390-owlcat.png`              | `wotr-table-tb-hud-actionbar-tutorial-fextralife.jpg`                                                |
| Tavolo in esplorazione   | `table-explore-dark-1440-owlcat.png`            | `wotr-table-exploration-quickslots-pcgamer.jpg`                                                      |
| Scheda · Magie           | `sheet-spells-dark-1440-owlcat.png`             | `wotr-sheet-spellbook-tooltip-fextralife.jpg`                                                        |
| Scheda · Inventario      | `sheet-inventory-dark-1440-owlcat.png`          | `wotr-sheet-inventory-doll-1080.jpg`, `wotr-sheet-inventory-doll-1440.jpg`                           |
| Finestra dell'iniziativa | `dialog-initiative-dark-1440-owlcat.png`        | `wotr-dialog-conversation-two-portraits-1080.jpg`, `wotr-dialog-global-map-event-card-1080.jpg`      |
| Menu della pedina        | `token-menu-dark-1440-owlcat.png`               | `wotr-dialog-tooltip-spell-bless-fextralife.jpg`, `wotr-table-tb-hud-inspect-fullattack-4k.jpg`      |
| Barra delle azioni       | ritaglio di `table-combat-dark-1440-owlcat.png` | fascia in basso di `wotr-table-tb-hud-actionbar-tutorial-fextralife.jpg`                             |

I file delle coppie seguono l'ordine della tabella: da `pair-01-inizio.jpg` a
`pair-12-menu-pedina.jpg`, più `pair-13-barra.jpg`. Le coppie del telefono e delle magie e
dell'esplorazione mostrano anche la schermata a 390 px accanto a quella a 1440. Lo script che le
rifà è `probe-owlcat/fix4/pairs.sh` (fuori dal repository).

## Differenze dichiarate

1. **Il gruppo resta una colonna** in basso a sinistra della mappa: in WotR è un vassoio
   orizzontale sotto la barra rapida. La fascia in basso deve restare entro 118 px (garanzia
   dell'app), quindi si copiano la forma delle carte, la barra verde verticale e la corona di gemma,
   non la posizione.
2. **I nomi stanno sotto le caselle della barra rapida** dove WotR mette le monete numerate: le
   nostre icone non distinguono un incantesimo dall'altro e i numeri sarebbero testo inventato.
   Il nome sta intero su due righe a 11 px sotto la casella da 56 px, e una parola più larga
   della casella va a capo con il trattino, mai meno di quattro lettere sulla seconda riga
   («Disim-pegno»); non si tronca mai con «…». Il nome
   intero è anche quello letto dagli screen reader. Le caselle senza nome (le sole icone di
   WotR, con il nome nel suggerimento) non si possono copiare: «Bastone ferrato» e «Dardo di
   fuoco» hanno la stessa spada, e il suggerimento chiederebbe un `title` nel markup. Fra i
   gruppi (Armi, Incantesimi, Comuni) resta una fessura di 8 px; in WotR le caselle sono tutte
   attaccate.
3. **Icone dipinte**: WotR dipinge a colori ogni abilità e oggetto; non esiste un equivalente
   libero, quindi le stesse sagome game-icons stanno su tessere scure a gradiente.
4. **Celle d'azione oneste**: la barra di WotR ha 5 FT · MOVE · STANDARD · SWIFT · FREE; qui ci
   sono le risorse delle regole 2024 — Movimento (al posto di MOVE), Azione (STANDARD), Bonus
   (SWIFT) e Reazione (FREE) — e gli slot degli incantesimi come rombi. Le quote 39 · 39 · 11 · 11
   valgono finché le parole ci stanno: a 1440 px Movimento e Azione sono larghe 105 px, Bonus 60 e
   Reazione 77, perché una cella non diventa mai più stretta della sua parola. Il «5 FT» non ha una
   regola corrispondente e non c'è. Non c'è la fusione «FULL ROUND» né i medaglioni S · A · B, che
   non hanno funzioni corrispondenti. La barra lascia 8 px prima dei dadi, perché l'app nasconde le
   parole delle celle quando le due piastre si toccano.
5. **Ordine di turno**: chi agisce non viene spostato al primo posto (l'ordine resta quello del
   combattimento, anche per la tastiera); le carte hanno i nomi su una targhetta (WotR mostra solo
   i ritratti) e non hanno i PF, che la fila dell'app non porta.
6. **Termina turno** resta un disco di 96 px con le parole sopra la clessidra: in WotR è un
   piccolo disco senza scritta (ed è un'inferenza che chiuda il turno).
7. **Bronzo più scuro**: le etichette sono #6A4A2C invece del #8A5E37 misurato, per il contrasto
   AA sulla carta; sulle righe grigie diventano inchiostro #444653 e il prugna #4F1F47.
8. **Interlinea del testo 1,25** invece dell'1,15 di WotR, per i paragrafi più lunghi e gli
   accenti italiani.
9. **Il quadro dell'Inizio** mostra la mappa dipinta del cortile (l'ultima scena), non uno
   screenshot vero dell'ultima sessione.
10. **La lettera** è inclinata di −1,5° invece di circa −3°, perché contiene comandi; e dal giro
    dei dettagli è inclinato solo il foglio (uno strato sotto le parole): parole e pulsanti restano
    dritti, sulla griglia dei pixel.
11. **Telefono**: WotR non ha un'interfaccia per telefono; si usano gli stessi materiali nella
    struttura del telefono dell'app (dal layout per controller W23). La barra delle azioni mostra
    solo i segni delle celle (le parole restano i nomi accessibili): quattro celle da 16 px a 2 px
    l'una dall'altra, tutte visibili accanto ai punti ferita. Le colonne del telefono le decide la
    seconda fila (azioni, «Mosse», il campo dei dadi) e lasciano alle celle solo 71 px: le celle
    usano anche l'inizio libero della colonna delle pagine, che stanno in fondo alla fila. Sulla
    targa della scena del DM i
    quattro comandi, alla misura unica dei pulsanti, vanno su due righe (prima ne bastava una a
    13 px): i comandi restano su due righe al massimo, come chiede l'app.
12. **Alto contrasto**: con la preferenza «alto contrasto» la carta diventa ferro e l'inchiostro
    bianco, così il testo bianco della preferenza resta leggibile ovunque.
13. Il **marchio** (d20 Studio, logo) ha ora una versione propria di questa opzione (I-251,
    sezione «Marchio» qui sotto); la striscia dimostrativa resta del blueprint.
14. **Spaziatura dei pulsanti 0,04 em**, non 0,08 em: con 0,08 em le parole italiane a 15 px dei
    pulsanti affiancati («Gestisci personaggio», «Danni, cure e condizioni») vanno a capo. Lo
    0,08 em resta per le linguette e le pillole, che hanno parole corte.
15. **«Tiri e risultati»** sulla barra dei dadi è una tessera col dado: le sue parole restano il
    nome del pulsante, ritagliate dalla tessera (lo stesso ritaglio del modello «visivamente
    nascosto»), perché il pulsante non ha un elemento a parte per il testo e non si può
    cambiare il markup. «Dadi» resta scritto. Sul telefono le parole sono nascoste dall'app
    stessa (dimensione 0), come oggi.
16. **Ombre**: tre elevazioni (rilievo, piastra, alone) più sei filetti disegnati come ombre, che
    in WotR sono le cornici e i fili delle carte: 15 valori nel controllo, tutti con un nome nel
    file, nessuno scritto a mano.
17. **La tavola dell'Inizio** (`desk-candle.webp`) è la stessa immagine dell'opzione 8 (Alchimia,
    `featured-hearth.webp`): tutte le tavole scure sicure sono già usate da due o più opzioni, e
    questa è l'unica scrivania a lume di candela come quella di WotR. Qui è tinta di viola e
    porta i nastri del libro, quindi le due pagine non si confondono.

## Giro di correzioni del 01/10 (critica indipendente)

Ogni rilievo della critica, con l'esito. Le misure sono state rifatte dopo le correzioni
(sonda `probe-owlcat/probe2.js`, cartella `probe-owlcat/fix1/`; controllo dei valori
`audit/owlcat/audit.md`).

| Rilievo    | Cosa diceva                                                                             | Esito                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01 (alta) | Sul telefono Bonus e Reazione erano tagliate                                            | Applicato: celle da 16 px a 2 px, senza bordo; i margini del pannello e il selettore dei dadi sul passo della scala. Tutte e quattro le celle visibili al 100 % a 390 px in tutti gli stati del Tavolo                                                                                                                                                          |
| F02 (alta) | La scheda a 390 px usciva di lato («Nuova azione personalizzata»)                       | Applicato: titolo e comando della sezione vanno a capo; larghezza della pagina 390 su 390 (misurata contro la larghezza fissa, non contro `innerWidth`)                                                                                                                                                                                                         |
| F03        | Nomi delle abilità in alto, tiri salvezza al centro                                     | Applicato: nomi al centro della riga (centro del testo 20,6 px su una riga di 44)                                                                                                                                                                                                                                                                               |
| F04        | Inizio sul telefono senza ritmo (20, 20, 16, 0, 28, 28 px; 30 px dentro l'appuntamento) | Applicato: 16 px fra tutti i fogli, 12/16/16 dentro, anche nell'appuntamento; titolo della pagina a 24 px dai fogli                                                                                                                                                                                                                                             |
| F05        | Etichette che andavano a capo o venivano tagliate                                       | Applicato: nomi della barra rapida su una riga con «…»; «Scheda completa» e «Inventario» uno per riga; riquadri dell'inventario due per riga; «18 / 22» senza a capo; nomi del turno senza spaziatura («Esploratore» sta nella carta); comandi delle finestre in colonna sul telefono                                                                           |
| F06        | La barra delle azioni non era quella di WotR                                            | Applicato: una barra di ferro larga quanto la striscia, celle 39 · 39 · 11 · 11 con le parole, dadi all'estremità destra; barra rapida sempre 117 px                                                                                                                                                                                                            |
| F07        | Attivo sul ferro riconoscibile solo dal colore                                          | Applicato: anello crema interno su strumenti, colonna, comandi del turno, livelli di indebolimento e pulsanti premuti; il passaggio del mouse accende solo il bordo                                                                                                                                                                                             |
| F08        | Valori fuori scala                                                                      | Applicato: dimensioni del testo solo 11 · 12 · 13 · 15 · 16 · 18 · 21 · 28 · 36 (più il marchio, fermo fino alla fase D); interlinee solo 1 · 1,15 · 1,25 (più «normal» del testo della mappa); spaziature delle lettere solo 0 / 0,04 em / 0,08 em; un solo raggio (i medaglioni); ombre da 25 a 15, tutte con nome; nessun pulsante con i margini del browser |
| F09        | Controlli dello stesso tipo in misure diverse                                           | Applicato: un solo pulsante (40 px, 8/16, 15 px) anche sulla targa della scena e nel menu della pedina; «Avvia ora» e «Non ora» in maiuscoletto a 4 px; indebolimento come tessere di ferro; campi a 40 px; un solo stile per i tasti. In parte: spaziatura 0,04 em invece di 0,08 em (differenza 14)                                                           |
| F10        | Avviso della sessione del DM dietro l'ordine di turno sul telefono                      | Applicato: l'avviso parte sotto le carte del turno; «Avvia ora» e «Non ora» sono in cima e cliccabili                                                                                                                                                                                                                                                           |
| F11        | Carte del turno sul telefono con una fascia vuota                                       | Applicato: il ritratto riempie la carta                                                                                                                                                                                                                                                                                                                         |
| F12        | Icone poco leggibili                                                                    | Applicato: mappa del tesoro al posto della bussola, pennello al posto della seconda piuma, dado per «Tiri e risultati»                                                                                                                                                                                                                                          |
| F13        | Testo nascosto con dimensione 0                                                         | Applicato per le regole di questa opzione: «Dadi» resta scritto, «Tiri e risultati» è ritagliato dalla tessera (differenza 15). Il «title» chiesto non si può aggiungere senza cambiare il markup                                                                                                                                                               |
| F14        | `--focus` ridefinito senza la protezione dell'alto contrasto                            | Applicato: le quattro regole ora hanno la protezione; con l'alto contrasto l'anello è #FFE066 anche nelle linguette                                                                                                                                                                                                                                             |
| F16        | Inizio poco riconoscibile; tavola uguale all'opzione 8                                  | In parte: scrivania tinta di viola come W26 e nastri del libro; la tavola resta la stessa (differenza 17)                                                                                                                                                                                                                                                       |

## Secondo giro di rifinitura del 01/10 (verifica indipendente)

Ogni punto della verifica (`notes/open-items-round2.json`, voce `owlcat`), con l'esito. Misure:
sonda `probe-owlcat/fix2/scripts/verify-probe.js` (cartelle `final-a/`, `final-b/`), sonde mirate
in `probe-owlcat/fix2/q-*`; CSS di prima in `probe-owlcat/fix2/direction-before-fix2.css`.

| Punto       | Cosa diceva                                                                                          | Esito                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta        | Le schermate del giro 1 e le coppie erano più vecchie del CSS                                        | Applicato: le 16 schermate e il foglio dei provini rifatti alle 11:48 dopo l'ultima modifica (11:44:53), le 13 coppie rifatte alle 11:52 da quelle schermate; le coppie vecchie sostituite. Tutte aperte e guardate una per una                                                                                                                                                                                  |
| Media (F05) | Cinque nomi su sette della barra rapida finivano con «…»                                             | Applicato: il nome intero su due righe a 11 px (600) sotto la casella da 56 px, sillabato in italiano solo se una parola non ci sta («Disimpe-gno»); nessun nome troncato in nessuno stato a 1440. La barra resta 117 px a 1440, a 1366 × 768 e a 1280 × 800, senza scorrimento a 1440 e 1366 (a 1280 la fila scorre, come prima). Le sole icone di WotR non si possono copiare (vedi «Differenze dichiarate» 2) |
| Media (F04) | «Accesso rapido» era una carta scura senza pelle; a 390 px toccava «Le tue campagne»                 | Applicato: è un foglio come gli altri (pergamena, capolettera, riga da disegno, 16/24/24 dentro, 12/16/16 al telefono), le schede recenti come righe grigie con il ritratto in cornice crema; margine 0 0 16 a 390 (16 px sopra e sotto), 0 0 24 a 1440. Sonda: `q-recent-before/`, `q-recent-after/`                                                                                                            |
| Bassa       | L'avviso «Sessione non avviata» del DM a 390 px aveva «Avvia ora» dentro la frase e «Non ora» a capo | Applicato: le parole in alto, sotto una fila con i due pulsanti alla misura unica (40 px, 8/16, 15 px); «Avvia ora» prugna. A 390 parte a 255 px, sotto le carte del turno (246); entrambi i pulsanti in cima e cliccabili                                                                                                                                                                                       |
| Bassa       | Sottotitolo dell'Inizio a 4,47:1 sulla candela; «Digitali» con interlinea «normal»                   | Applicato il primo: velo del titolo dal 60 al 78 %, ora sopra 4,5:1. Il secondo no: Chromium tiene `line-height: normal` su ogni `select` (misurato anche con la regola di questa opzione; i `select` di tutte e dieci le opzioni hanno «normal»), quindi il campo ha l'altezza fissa di 40 px                                                                                                                   |
| Garanzia    | (trovata qui) A 390 px l'intestazione del Tavolo andava su due righe                                 | Applicato: i due comandi dell'intestazione del Tavolo tornano alla misura compatta dell'app sul telefono (12 px, 4 px intorno), le tessere dei servizi attaccate: una riga, 63 px come «Attuale», in tutti gli stati del Tavolo                                                                                                                                                                                  |

Garanzie ricontrollate dopo l'ultima modifica: barra 117 px a 1440 in ogni stato del Tavolo;
larghezza della pagina 390 su 390 in tutti gli stati; Termina turno, Annulla e Annulla
preparazione visibili e in cima a 390 (sotto il menu e la finestra solo quando sono aperti, come
oggi); «Entra al Tavolo» finisce a 543 px; nessun comando nuovo sotto i 40 px (restano le caselle
di spunta da 20 px dell'app, come in «Attuale»); 550 selettori tutti con il prefisso, nessun
`!important`, `text-transform` o testo in `content`; protezioni di tema chiaro, alto contrasto e
movimento senza eccezioni; `tests/visual01-directions.test.mjs` 7/7; Prettier pulito.

## Terzo giro di rifinitura del 01/10 (verifica indipendente)

Ogni punto della verifica (`notes/open-items-round3.json`, voce `owlcat`: quattro punti bassi),
con l'esito, più il controllo I-250 di questo giro. Misure: sonde in `probe-owlcat/fix3/`
(`scripts/m-check.cjs` sugli stati del kit, cartelle `q-final-390/` e `q-final-1440/`;
`scripts/recent.cjs` per «Accesso rapido», cartella `q-recent/`); CSS di prima in
`probe-owlcat/fix3/direction-before-fix3.css`.

| Punto         | Cosa diceva                                                                                                  | Esito                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bassa         | A 390 px l'alone di «Dove eravamo rimasti» scuriva i primi 20 px di «Accesso rapido»                         | Applicato: «Accesso rapido» è posizionato, quindi dipinge sopra l'alone del foglio di sopra come gli altri fogli. Misurato in una sessione con una scheda aperta (le schermate del giro 1 non hanno schede recenti): bordo superiore pulito, 16 px sotto il foglio a 390 e 24 a 1440 (`q-recent/recent-390.png`, `recent-1440.png`)                                                         |
| Bassa         | Il titolo «Accesso rapido» (148 px) tagliava a destra la riga da disegno di 160 px; il nodo era fuori centro | Applicato: ogni titolo dei fogli dell'Inizio è largo almeno quanto la sua riga (160 px). «Accesso rapido» e «Trova un tavolo» ora sono larghi 160 px, con la riga intera e il nodo al centro, a 390 e a 1440                                                                                                                                                                                |
| Bassa         | A 390 px la fila delle azioni finiva 4 px sotto il bordo di «Mosse», senza spazio                            | Applicato: la fila presta i suoi 8 px agli anelli di fuoco solo sopra, sotto e a sinistra; a destra si ferma alla sua cella. Fra la casella tagliata e «Mosse» restano 4 px, la distanza della barra, in tutti e tre gli stati del Tavolo                                                                                                                                                   |
| Bassa (I-250) | Sul Tavolo c'erano due ricette di menu a tendina: dadi 13 px/600 con 0/8; tipo di danno 15 px/400 con 0/12   | Applicato: il campo dei dadi segue la ricetta unica dei campi a ogni larghezza (15 px, peso 400, 12 px dentro, le parole come sono scritte). Nello strumento i menu a tendina visibili sono ora una sola variante; il tipo di danno, nel pannello sotto la piega, ha le stesse misure (sonda: 15 px, 400, 0/12). Sul telefono il campo si allarga di 26 px: vedi «Differenze dichiarate» 11 |

Controllo I-250 di questo giro (strumento, campionario `probe-owlcat/fix3/specimen-before/` e
`specimen-after/`, Inizio, Magie, Inventario e Tavolo anche a pagina intera):

- **Una ricetta per tipo, anche sul telefono.** Le pagine della barra (Azioni, Barra rapida) hanno
  12 px dentro e 0,08 em come a 1440 e come le sottoschede del pannello: prima erano 8 px e 0. La
  piastra dei PF ha 8 px dentro come a 1440 (prima 4). I comandi del turno sono una sola tessera da
  40 px: prima erano 41 e 40 px, con i 6/10 e 6/8 px dell'app. «Tutte» nella fila delle sezioni
  della scheda segue le linguette (15 px, 600, 12 px dentro; prima 16 px, 700, 10/12). Termina turno
  sul telefono ha il tipo del disco (13 px, 0,08 em; prima 12 px, 0,04 em).
- **Un solo segno sulle tessere di ferro:** 21 px, il quadrato dell'app, su strumenti, zoom,
  pulsanti della sessione sopra la mappa e comandi del turno. Prima c'erano anche 18 px (la sessione
  e gli strumenti sul telefono) e 19 px (i comandi sul telefono). Il triangolino del menu
  «Sessione» resta com'è.
- **Una sola casella di spunta da 20 px**, la misura dei controlli delle magie e dell'iniziativa,
  anche nel campo di spunta dell'app («Colpo critico» nel pannello dei PF). Prima era 18 px, con 9 px
  intorno e i 3 px del browser.
- **Spazi sul passo di 2 px.** Linguette dell'intestazione: 4 px fra l'una e l'altra e 8 px dentro
  (prima 5 e 9). Piastre della mappa: 4 px fra le tessere e 4 px dentro lo zoom (prima 5). Fra segno
  e parola nei cartellini: 4 px (prima 5). Sopra «Disponibilità offline»: 24 px (prima 20). Parti
  dell'ispettore: 24 px fra l'una e l'altra (prima 25). Barra delle forme: 16 px sopra e 24 sotto
  (prima 14/22). Paragrafi del bottino, delle sezioni delle magie e dei pannelli del Tavolo: 12 px
  sotto (prima 15). La carta di chi è di turno ha una targhetta di 28 px, così è alta 108 px intera
  (prima 107,5).
- **Il telefono, riga per riga:** le celle d'azione usano l'inizio libero della colonna delle
  pagine. Sono intere, a 47,8 px dalla prima linguetta, e la linguetta resta cliccabile fino al suo
  bordo sinistro.

Garanzie ricontrollate dopo l'ultima modifica (14:03:07):

- la barra è alta 117 px a 1440 in ogni stato del Tavolo, e a 1366 × 768 finisce a 768 px;
- a 390 px l'intestazione del Tavolo sta su una riga (63 px) in tutti gli stati;
- la larghezza della pagina è 390 su 390 in tutti gli stati;
- Termina turno, Annulla e Annulla preparazione sono visibili e in cima a 390;
- «Entra al Tavolo» finisce a 543 px;
- nessun comando sotto i 40 px nell'intestazione, nella targa, nella barra, negli strumenti e nella
  colonna;
- 531 regole con 564 selettori, tutti con il prefisso; nessun `!important`, `text-transform` o
  testo in `content`;
- `tests/visual01-directions.test.mjs` passa 7 test su 7; Prettier è pulito.

Le 15 schermate del giro 1 e il foglio dei provini sono stati rifatti alle 14:06–14:07, dopo
l'ultima modifica, e le 13 coppie alle 14:07–14:08. Tutti i file sono stati aperti e guardati uno
per uno.

## Quarto giro di rifinitura del 01/10 (verifica indipendente)

Ogni punto della verifica (`notes/open-items-round4.json`, voce `owlcat`: uno medio e tre bassi),
con l'esito, più il controllo I-250 di questo giro. Misure: sonde in `probe-owlcat/fix4/`
(`scripts/halo.cjs` per gli aloni dell'Inizio, cartella `halo/`; `scripts/switches.cjs` per gli
interruttori e l'anello dei punti ferita, cartella `switches/`; `scripts/d20.cjs` sugli stati del
kit, cartella `d20/`; `scripts/calmenu.cjs`, cartella `calmenu/`; `scripts/g-check.cjs` per le
garanzie, cartelle `g390/`, `g390d/`, `g1440/`); CSS di prima in
`probe-owlcat/fix4/direction-before-fix4.css`.

| Punto         | Cosa diceva                                                                                                                                                                                                                                                                                                                                                                     | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Media         | L'alone del foglio di sopra scuriva i primi 17–20 px di «Le tue campagne»: senza schede recenti quello di «Dove eravamo rimasti» (una casella della griglia, che si dipinge dopo i blocchi normali), con le schede recenti quello di «Accesso rapido», posizionato nel giro 3 (−32 livelli a 390, −14 a 1440). Il commento del CSS («come fanno gli altri fogli») era sbagliato | Applicato: tutti i fogli dell'Inizio sono posizionati, quindi si dipingono in un solo strato nell'ordine della pagina e ognuno copre l'alone di quello sopra. Il libro delle novità resta «sticky» sopra 1100 px (posizione dell'app); sotto entra nello strato, senza lo spostamento di 16 px che l'app gli dà per lo «sticky». Sonda a 390 e a 1440, con e senza schede recenti, confrontando ogni foglio con e senza ombre: il bordo superiore di ogni foglio scurito di 0 livelli in tutti e quattro i casi (prima −36 su «Le tue campagne» a 390 e −17 a 1440 con le schede recenti); nessun foglio spostato, i nastri e la lettera inclinata al loro posto. Il commento ora dice il motivo vero (`halo/halo-390-rec-before-after.png`, `halo-390-norec-before-after.png`) |
| Bassa         | I d20 della finestra dell'iniziativa (campi numerici) avevano le cifre circa 8 px a sinistra del centro, per lo spazio che Chromium tiene per le frecce                                                                                                                                                                                                                         | Applicato: i campi della ricetta numerica non tengono più quello spazio (`appearance: textfield`; le frecce senza aspetto e senza margine). Inchiostro a 23 px da entrambi i lati in tutti e cinque i campi (`d20/d20-row.png`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Bassa         | Due misure di interruttore sulla stessa riga della Scheda: 44 × 26 con la manopola da 18 px («Ispirazione eroica») e 40 × 22 con la manopola da 12 px («Disponibile offline», «Il DM può modificare»)                                                                                                                                                                           | Applicato: un solo interruttore anche per gli effetti (prima 28 × 16): pozzetto di ferro quadrato 40 × 22, manopola quadrata da 14 px a 4 px dal bordo; acceso, pozzetto prugna #3C1129 e manopola gemma all'altro capo. La riga dell'etichetta resta il bersaglio da 40 px; l'anello del fuoco sta a 3 px come gli altri (l'app lo metteva a 2). Misurato a 1440 e 390, spento e acceso (`switches/sw-1440-grid.png`, `sw-390-grid.png`)                                                                                                                                                                                                                                                                                                                                       |
| Bassa         | L'anello del fuoco dei punti ferita della scheda era di 2 px a 2 px, l'unico non curato                                                                                                                                                                                                                                                                                         | Applicato: 3 px a 3 px nel colore del fuoco, come ogni altro anello; misurato a 1440 e a 390 (`switches/hp-focus-*.png`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| (trovato qui) | A 1440 la lista «Aggiungi al calendario» aperta finiva sotto il libro delle novità: la lettera inclinata è uno strato a sé e la lista non poteva salire sopra i fogli che seguono                                                                                                                                                                                               | Applicato: mentre la lista è aperta la lettera passa davanti. La lista è in cima in tutti i punti misurati, a 1440 e a 390 (`calmenu/calmenu-1440.png`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Controllo I-250 di questo giro (strumento sugli stati del giro 1 e sotto la piega, campionario
`probe-owlcat/fix4/specimen-before/` e `specimen-after/`):

- **Una chiusura sola.** La chiusura del menu della pedina ha la croce da 21 px, l'ombra e il
  colore al passaggio della chiusura delle finestre (prima la croce era da 18 px, senza ombra).
- **«Altre azioni» sulle righe dell'inventario** è la tessera quadrata da 40 px degli altri
  comandi con il solo glifo (prima 55 × 40, con i margini di un pulsante con parole): 40 righe
  sotto la piega.
- **Collegamenti che si aprono sul posto**: «Regola d'ingombro…», «Visualizzazione…», «Perché?»,
  «Novità precedenti» e l'elenco delle pedine del menu hanno una sola ricetta, 15 px, 600,
  prugna (prima 13/400, 15/400 e 15/600). «Regola d'ingombro: standard (SRD 2024)» sta ancora su
  una riga a 1440.
- **«Tutte le discussioni»** è il «vedi tutto» del suo foglio, come «Tutte le campagne» e «Tutti
  gli annunci»: parole prugna a filo del foglio (prima maiuscoletto con 16 px di rientro).
- **Nessun colore nuovo:** il pozzetto acceso usa il prugna delle celle d'azione (#3C1129); con il
  prugna delle linguette (#36172C) lo strumento contava un colore di fondo in più e due coppie
  quasi uguali.

Garanzie ricontrollate dopo l'ultima modifica (15:39:07):

- la barra è alta 117 px a 1440 in ogni stato del Tavolo, anche con la finestra e il menu aperti;
- a 390 px l'intestazione del Tavolo sta su una riga (63 px) in tutti gli stati del Tavolo;
- la larghezza della pagina è 390 su 390 in tutti gli stati, finestra dell'iniziativa compresa;
- Termina turno, Annulla e Annulla preparazione sono visibili e in cima a 390 (sotto il menu e la
  finestra solo quando sono aperti, come oggi);
- «Entra al Tavolo» finisce a 543 px;
- nessun comando sotto i 40 px nell'intestazione, nella targa, nella barra, negli strumenti, nella
  colonna e nell'Inizio;
- 545 regole con 580 selettori, tutti con il prefisso; nessun `!important`, `text-transform` o
  testo in `content`;
- `tests/visual01-directions.test.mjs` passa 7 test su 7; Prettier è pulito.

Le 15 schermate del giro 1 e il foglio dei provini sono stati rifatti alle 15:39, dopo l'ultima
modifica, e le 13 coppie alle 15:40–15:41. Tutti i file sono stati aperti e guardati uno per uno.

## Dettagli rifiniti del 01/10 (critica dei dettagli, I-250 e I-252)

La critica indipendente dei dettagli (`detail-owlcat/`, 18 punti: 5 alti, 10 medi, 3 bassi) misurava
a 1440 e 390 i dettagli che il proprietario vede fatti con pochezza: misure dei pulsanti, spazi
fra i pulsanti, margini, linee di base. Tutti i punti alti e medi e i bassi da una riga sono
applicati in un solo giro, sui gettoni della direzione (spazi 2 · 4 · 8 · 12 · 16 · 24 · 32 · 48,
caratteri, raggi, fili); le parti respinte hanno il motivo qui sotto. «Prima» sono i numeri della
critica (CSS del giro 4), «dopo» le misure sulla pagina viva dopo l'ultima modifica (20:47): sonde
in `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/fix-owlcat/` (`tools/`, risultati
in `probe/final1440/`, `probe/final390/`, `probe/ring2/`; CSS, icone e schermate di prima in
`before/`).

| Punto     | Cosa diceva                                                                                                                                                                 | Esito, prima → dopo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 alta  | Intestazione: scritta 4,7 px sotto le linguette, bordi a 30 px contro i 48 della pagina, tessere da 42 px                                                                   | Applicato. Linea di base della scritta 89,8 → 87,8, delle linguette 85,1 → 87,1 (scarto 4,7 → 0,7 px). Bordo sinistro 30 → 48 e destro 1410 → 1392, uguali al titolo e alla colonna della pagina, sopra i 1100 px e anche oltre i 1440, dove la pagina si centra (le pagine con la barra della campagna tengono il loro bordo). Tessere di servizio 42 → 40 px. Intestazione del Tavolo: margine 16 px come il palco, 16 px fra marchio, «App» e «Torna alla campagna» (prima 18 e 14)                                                                                                                                                                                                                                                             |
| D02 media | Nastri dell'Inizio sopra la cornice e la mappa; al telefono sporgono dal foglio; un viola fuori tavolozza                                                                   | Applicato: tre nastri verticali appesi al bordo alto subito dopo il dorso (x 419–471, la cornice finisce a 411), 12 px di larghezza, 8 px di distanza, lunghi 48 · 36 · 40 px, la coda in basso; il prugna #5F485C al posto del pervinca. Sotto i 720 px spariscono con il quadro                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| D03 media | Lettera ruotata: pulsanti sfocati (219,6 × 45,7 e 120,8 × 43,1), larghezze diverse, «(Europe/Rome).» da solo, clessidra per il calendario                                   | Applicato: ruota solo il foglio (uno strato sotto); i due pulsanti dritti, 221,6 × 40 tutti e due, a 8 px; l'ultima riga va a capo bilanciata («fuso / orario (Europe/Rome).»); il calendario ha il suo glifo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D04 bassa | Filo sotto le pillole delle novità largo 360 px contro i 328 dei fili fra le notizie; 6 px fra «Guarda il tour» e «Segna come letta»                                        | Applicato: 328 px tutti e due; 8 px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D05 bassa | Due tessere di servizio a contorno fra le altre piene                                                                                                                       | Applicato: «Aiuto» è il disco pieno `help` (game-icons, sbed); la connessione è una nuvola piena con il segno dello stato ritagliato, nei quattro stati dell'app (disegnata qui)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D06 alta  | Fascia della scheda: etichette su tre linee di base (378,6–389,6), valori su cinque (427,3–452,6), «+2» tagliato, due caselle che sporgono                                  | Applicato, con l'idea «registro stampato» della critica: ogni casella ha le stesse tre righe (etichetta 32 px, valore 40, sotto-valore 20, a 8 px); un solo stile di etichetta (13 px maiuscoletto 700, il ruggine solo come inchiostro di FOR…CAR); i valori tagliati a maiuscole e linea di base (`text-box`), così il 18 dei punti ferita resta a 36 px e sta sulla stessa linea dei 28 px. Etichette tutte a 401,7 (per la seconda riga di «Ispirazione / eroica» misurata sul piede del testo, uguale a Competenza e Movimento), valori tutti a 454,6; «+2» senza ritaglio (`overflow: visible`). Gli 8 px «di troppo» di Movimento e Ispirazione erano il filo puntinato fra le caselle, disegnato fuori dalla casella: non è testo che esce |
| D07 alta  | Campi grigio freddo #C8C8C8; «Cura» e «Danno» unici pulsanti saturi e senza passaggio; barra verde neon sulla carta                                                         | Applicato: campi #F2EBE1 con filo #5E5E6E e ombra interna, segnaposto #6A4A2C. «Cura» e «Danno» piastre di ferro con un filo di 4 px (non 3: è la misura del filo dei messaggi d'errore della direzione) nel verde #4DE749 e nel rosso #BE3319 degli anelli della mappa, più il cuore e la lama; al passaggio il bordo #AB56B1 (misurato). Per farci stare glifo e parola sono impilati Cura · quantità · Danno, come in D&D Beyond. Barra dei PF sulla pagina nella rampa prugna; il #03FB05 resta sui ritratti del Tavolo                                                                                                                                                                                                                        |
| D08 alta  | I pulsanti senza bordo che aprono una colonna partivano 16–19 px dentro                                                                                                     | Applicato a briciole, «+ Condizione» (scheda e Tavolo), sensi e velocità, sintonia, monete, set, «Ultima mossa», gli elenchi dell'ispettore, «Nessuno»: inchiostro a filo della colonna (+1 px di margine del carattere). Nell'ispettore, che scorre, il loro anello sta dentro. Respinto dove il comando segue le parole sulla stessa riga («Registra concentrazione» a 1440, «Dettagli» degli oggetti a 1440): lì l'allineamento lo avvicinerebbe alle parole. Dove l'app andava a capo a seconda della larghezza, ora va a capo sempre («Nessuno» sotto i due tiri; sulla scheda stretta «Dettagli · Confronta» sotto «Lancia»), così il comando apre sempre la riga                                                                            |
| D09 media | «Difese» 6,1 px più in basso di Iniziativa e CA; 12 px fra le caselle                                                                                                       | Applicato: stesse due righe; etichette tutte a 752, valori tutti a 798,9; 16 px fra le caselle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D10 media | Otto coppie misura/distanza dei glifi; glifi su un solo pulsante di una coppia; «+» scritto contro il più disegnato                                                         | Applicato: 21 px nei comandi da 40, 16 px in «Tutte», sempre a 8 px. Nel controllo le misure dei glifi passano da 10 a 6 (21 × 21 da 160 a 190 elementi; 18, 17 e 18,5 px spariti). Tolti i glifi di «Gioco · Modifica», «Riepilogo del gruppo» e «Scene», i soli della loro fila. Il «+» di «+ Condizione» è disegnato come il più di «+ Effetto» (stessa geometria) sulla sua prima lettera                                                                                                                                                                                                                                                                                                                                                      |
| D11 media | Spazi fra pulsanti fuori scala: 6, 10, 14, 18, 20                                                                                                                           | Applicato tutto l'elenco (8 fra comandi, 16 fra gruppi, 4 fra tessere dello stesso tipo) e, nello stesso spirito, le file che la critica non nominava (effetti, preferiti, azioni delle righe, filtri delle magie, PE, intestazione 32, colonne dell'Inizio 24). Nel controllo i valori di distanza scendono da 13 a 10: 6 px da 60 a 15 elementi, 8 px da 178 a 248, spariti 9, 14, 18 e 28                                                                                                                                                                                                                                                                                                                                                       |
| D12 media | Caselle di spunta bianche con gli angoli tondi del browser                                                                                                                  | Applicato: 20 × 20, filo di 2 px #5E5E6E, fondo #F2EBE1, angoli vivi; spuntata, prugna #3C1129 con la spunta crema                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D13 bassa | Cella dei sensi 48 px contro 56; 24 px prima del «/» e 3 dopo; rombo a 2–3 px dalla parola                                                                                  | Applicato: tutte le celle 56 px; 8 px prima e dopo il «/» (9 con il margine del carattere); rombo a circa 10 px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D14 alta  | Anelli del fuoco tagliati di 6 px nella fila d'iniziativa; la carta di turno (88 × 108) copre il comando della porta                                                        | Applicato, con l'idea della critica: 6 px liberi su ogni lato (0 anelli tagliati su 5 fermate, a 1440 e a 390); la carta di turno 88 × 76 come altezza delle altre, con la gemma in cima e «Turno attuale» ai piedi del ritratto; tutte finiscono a 252. Il comando della porta (da 245,7) resta coperto per 6 px in alto, non più per intero                                                                                                                                                                                                                                                                                                                                                                                                      |
| D15 media | Cuciture doppie di 4 px fra le caselle; «Disimpe-gno»; tessera dei filtri 40 × 52, 2 px fuori linea                                                                         | Applicato: una sola linea di 2 px fra vicine (la casella indicata viene davanti); «Disim-pegno» (mai meno di quattro lettere a capo); filtro 56 × 56 alla stessa altezza delle caselle (793,5). Respinto il bilanciamento delle righe: in Chromium spegne la sillabazione e «Disimpegno» verrebbe tagliato; resta «Dardo di / fuoco». Respinta la gemma al posto del pallino verde: il pallino è il segno del costo (● azione, come nella barra delle risorse), cambiarne la forma romperebbe la corrispondenza                                                                                                                                                                                                                                    |
| D16 media | «Gruppo» con il glifo a 1 px dal bordo; 20 px fra le colonne degli strumenti; ritmo della colonna destra 4 · 9 · 2; icone solo su «Scene»                                   | Applicato: «Gruppo» 50 → 68 px, glifo e puntini a 8 px dal bordo; 8 px fra i pulsanti sopra la mappa; colonna 4 px fra le tessere (le linguette erano a 2), 8 px e il filo prima delle linguette; nessun glifo nella targa della scena. Colonne degli strumenti: le due piastre ora a 8 px (erano 6); fra le tessere restano 22 px, perché ogni colonna è una piastra a sé (8 px fra tessere vorrebbe piastre sovrapposte)                                                                                                                                                                                                                                                                                                                         |
| D17 media | Ritmo dell'ispettore 8 · 28 · 20 · 8 · 8; anelli tagliati in fondo; «Scheda completa» a 8 px dal filo                                                                       | Applicato: 8 px dentro un gruppo, 16 fra i gruppi (persona, «Ultima mossa», condizioni, forme, nota del turno, comandi); `scroll-padding` di 8 px e 16 px sotto i comandi. Tab da tastiera su 41 e 42 fermate (giocatore e DM), a 1440 e 390: nessun anello tagliato                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D18 media | Telefono: linguette della scheda, barra in basso, colonna del gruppo, barra rapida (il testo della critica è arrivato troncato: ricostruito misurando le quattro superfici) | Applicato: la linguetta tagliata sotto «Tutte» sfuma nel ferro (24 px); «Combattimento», «Esplorazione»… vanno a capo sillabati su due righe invece di «Combatti…», con i glifi tutti alla stessa altezza; colonna del gruppo e zoom stanno sul piede della scena (120 px dal fondo del palco: prima la barra copriva 22 px della terza carta del giocatore e, per il DM, la terza carta intera e 17 px della seconda); la casella successiva della barra rapida sfuma invece di mostrarsi a fette. Trovato qui: «Correggi risorsa» non è più centrato sotto le parole dello slot                                                                                                                                                                  |

Idee «superare» della critica: il registro unico della scheda e la carta di turno senza coprire la
mappa sono applicati (D06, D14); della barra rapida è applicata la linea di cornice unica, non la
gemma (D15).

Controllo I-250 (`changes/visual-01/audit/`, 20 stati del giro 1; prima: copia del giro 4 in
`fix-owlcat/audit-before/`):

| Misura                                     | Prima (giro 4) | Dopo (dettagli) |
| ------------------------------------------ | -------------- | --------------- |
| Valori di spazio distinti (fuori scala)    | 31 (20)        | 29 (17)         |
| Valori di distanza fra elementi            | 13             | 10              |
| Altezze dei comandi                        | 22             | 17              |
| Grandezze · pesi · stili di testo          | 11 · 3 · 72    | 9 · 3 · 72      |
| Interlinee                                 | 25             | 24              |
| Misure dei glifi                           | 10             | 6               |
| Ombre                                      | 15             | 18              |
| Colori (testo · fondo · bordo)             | 23 · 25 · 24   | 19 · 24 · 23    |
| Varianti dei bottoni (classi con più var.) | 67 (12)        | 63 (11)         |
| Contrasto AA sotto soglia                  | 0 su 1227      | 0 su 1224       |

Le tre ombre in più sono dichiarate: l'ombra interna dei campi e i fili di «Cura» e «Danno»
(disegnati come ombre, sopra il rilievo delle piastre), tutte con un nome nel file.

Garanzie ricontrollate dopo l'ultima modifica: barra del Tavolo alta 119 px a 1440 (≤ 120); a
390 px pagina larga 390, intestazione del Tavolo su una riga, Termina turno, Annulla e Annulla
preparazione visibili, «Entra al Tavolo» finisce a 542,7 px; nessun comando sotto i 40 px; anelli
del fuoco mai tagliati (fila d'iniziativa e ispettore, tastiera vera); 641 regole con 678
selettori, tutti con il prefisso; nessun `!important`, `text-transform` o testo in `content`;
`tests/visual01-directions.test.mjs` passa 13 test su 13; Prettier è pulito. Le 15 schermate del
giro 1 e il foglio dei provini sono stati rifatti alle 20:48, dopo l'ultima modifica, e aperti uno
per uno; le coppie in `_pairs/` non sono state rifatte in questo giro.

## Coerenza (I-250)

Strumento di verifica (`changes/visual-01/audit/`) sui 20 stati del giro 1 (1440 e 390, tema
scuro) e, sotto la piega, su Inizio, Magie, Inventario e Tavolo a pagina intera (8 schermate).
Quattro misure:

- **Giro 2, prima:** CSS delle 10:39, cartelle `verify-owlcat/audit/` e
  `probe-owlcat/fix2/audit-below-before/`.
- **Giro 3, prima:** CSS delle 11:44:53, cioè il «dopo» del giro 2. Lo strumento è stato rifatto
  alle 13:00 (copia in `probe-owlcat/fix3/audit-before/`) e sotto la piega si usa
  `probe-owlcat/fix2/audit-below-after/`. Le piccole differenze dal «dopo» scritto nel giro 2
  vengono dalla nuova misura, non dal CSS.
- **Giro 3, dopo:** CSS delle 14:03:07, cartelle `probe-owlcat/fix4/audit-before/` (la copia
  della misura del giro 3, che è anche il «prima» del giro 4: il CSS non era cambiato) e
  `probe-owlcat/fix3/audit-below-after/`.
- **Giro 4, dopo:** CSS delle 15:39:07, cartelle `audit/owlcat/` e
  `probe-owlcat/fix4/audit-below-after/`.

«—» vuol dire che quel valore non era stato annotato.

| Misura (20 schermate del giro 1)                   | Giro 2, prima | Giro 3, prima | Giro 3, dopo | Giro 4, dopo |
| -------------------------------------------------- | ------------- | ------------- | ------------ | ------------ |
| Valori di spazio distinti (fuori scala)            | 37 (25)       | 32 (20)       | 31 (20)      | 31 (20)      |
| Spazi sul passo di 2 px                            | 94,5 %        | 99,0 %        | 99,4 %       | 99,4 %       |
| Altezze dei comandi                                | 22            | 22            | 22           | 22           |
| Grandezze · pesi · stili di testo                  | 11 · 5 · 76   | 11 · 3 · 75   | 11 · 3 · 72  | 11 · 3 · 72  |
| Ombre                                              | 15            | 15            | 15           | 15           |
| Colori (testo · fondo · bordo)                     | 23 · 25 · 23  | 23 · 25 · 24  | 23 · 25 · 24 | 23 · 25 · 24 |
| Varianti dei bottoni                               | 77            | 76            | 69           | 67           |
| Varianti dei campi di testo e numerici             | 3             | 2             | 2            | 2            |
| Varianti dei menu a tendina                        | —             | 2             | 1            | 1            |
| Varianti delle linguette (classi con più varianti) | 12            | 10 (3)        | 8 (1)        | 8 (1)        |
| Varianti di etichette e pillole                    | 17            | 12            | 12           | 12           |
| Varianti degli interruttori e caselle di spunta    | 4             | 3             | 3            | 3            |
| Varianti delle lastre e dei pannelli               | 48            | 43            | 44           | 44           |
| Bottoni con il margine predefinito del browser     | 0             | 0             | 0            | 0            |
| Contrasto AA sotto soglia                          | 49 su 1230    | 0 su 1231     | 0 su 1227    | 0 su 1227    |

| Misura (8 schermate a pagina intera)            | Giro 2, prima | Giro 3, prima | Giro 3, dopo | Giro 4, dopo |
| ----------------------------------------------- | ------------- | ------------- | ------------ | ------------ |
| Valori di spazio distinti (fuori scala)         | 34 (23)       | 32 (21)       | 30 (19)      | 30 (19)      |
| Spazi sul passo di 2 px                         | 91,7 %        | 98,6 %        | 99,7 %       | 99,7 %       |
| Altezze dei comandi                             | 20            | 19            | 18           | 18           |
| Grandezze · pesi · stili di testo               | 12 · 5 · 74   | 11 · 3 · 72   | 11 · 3 · 68  | 11 · 3 · 68  |
| Varianti dei bottoni (classi con più varianti)  | —             | 75 (13)       | 68 (12)      | 66 (11)      |
| Varianti dei menu a tendina                     | —             | 3             | 2            | 2            |
| Varianti delle linguette                        | 11            | 9             | 7            | 7            |
| Varianti di etichette e pillole                 | 13            | 11            | 11           | 11           |
| Varianti degli interruttori e caselle di spunta | —             | 3             | 2            | 2            |
| Varianti delle lastre e dei pannelli            | 37            | 34            | 35           | 35           |
| Comandi e campi con i margini del browser       | 5             | 0             | 0            | 0            |
| Contrasto AA sotto soglia                       | 28 su 1423    | 0 su 1423     | 0 su 1421    | 0 su 1421    |

C'è una variante di lastra in più perché, sul telefono, la piastra dei dadi è ora larga 142 px:
lo strumento conta come lastra tutto ciò che supera i 120 px. Il disegno non cambia.

Nel giro 4 i numeri dello strumento cambiano poco perché i pezzi rifiniti sono quasi tutti sotto
la piega o non sono contati: le varianti dei bottoni scendono a 67 (12 classi) nel giro 1 e a 66
(11 classi) sotto la piega (la tessera «Altre azioni» e i collegamenti che si aprono sul posto).
Gli interruttori dell'Ispirazione, degli effetti e di «Disponibile offline» sono disegnati su uno
`span` e lo strumento non li conta: l'unica misura è quella della sonda (`switches/`). Il bordo
dei fogli dell'Inizio è misurato dalla sonda degli aloni (`halo/`).

Che cosa è cambiato nel giro 4: vedi «Quarto giro di rifinitura» qui sopra.

Che cosa è cambiato nel giro 3: vedi «Terzo giro di rifinitura» qui sopra.

Che cosa era cambiato nel giro 2:

- **Una ricetta per tipo.** Un solo cartellino (24 px, 8 px ai lati, 12 px in maiuscoletto) per
  `.badge`, componenti e stati delle magie, cartellini delle reazioni; un solo campo numerico (40
  px, 16 px grassetto al centro) per i PF della scheda e del Tavolo, i d20 dell'iniziativa e i PF
  del menu della pedina; le pagine della barra (Azioni, Barra rapida) a 13 px come le altre
  pillole; i collegamenti con 8 px sopra e sotto (erano 9); il riquadro CA con gli stessi margini
  di Iniziativa e Difese; i comandi dell'avviso della sessione alla misura unica dei pulsanti.
- **Browser.** Il ▾ dei contenitori dell'inventario (1 px 6 px del browser) è un cartellino di
  carta quadrato; le caselle di spunta senza i 3–4 px del browser (le distanzia l'etichetta);
  nessun peso 500 o 900 (le righe del menu dell'Inizio a 400 e alte 48 px, il `strong` dentro un
  nome in grassetto eredita il 700).
- **Spazi fuori scala tolti:** paragrafi a 12 px (erano 15), il titolo «Movimento» delle mosse a
  16 (19,95), la nota dell'ispettore a 12 (13), sezioni dell'ispettore a 16 (12 e 18), stati vuoti
  a 48 (45), le caselle della barra al telefono 4/8 (5/8), la riga di stato della mappa 8/12 a
  ogni larghezza, i termini delle regole 2 px ai lati (1).
- **Contrasto.** Le 30 letture «#333545 su #333545» della fascia delle caratteristiche venivano
  dalle sue due righe disegnate come sfondi a tutta altezza: ora sono bordi, lo stesso disegno, e
  la lettura è esatta (su pergamena: l'inchiostro 11:1, le etichette 8:1, le
  abbreviazioni ruggine 4,7:1). «Illeso» sotto le pedine e il «?» delle
  note del DM hanno l'alone di pergamena delle targhette, i segni di viaggio del DM un alone di
  ferro; la barra delle sezioni della scheda non getta più ombra sulla riga che le scorre sotto
  («Libro»); la banda «Concentrazione» ha la capolettera come le altre; la barra del peso ha il
  suo spazio, così «Peso incompleto…» non tocca la pennellata.

Restano, dichiarati:

- **Bottoni.** 12 classi hanno più di una variante. Quasi tutte sono componenti diversi che lo
  strumento mette nella stessa classe visiva: stelle dei preferiti, nomi delle righe, carte del
  gruppo, caselle delle caratteristiche, linguette dell'intestazione a 51 px come la barra di WotR,
  il disco di Termina turno da 96 px (le icone di servizio sono da 40 px dal giro dei dettagli).
  I nomi dei tiri
  salvezza (16 px grassetto ruggine, «FOR» sopra «Forza», come il registro delle caratteristiche)
  e quelli delle abilità (15 px) sono due disegni scelti, non una svista.
- **Tre interruttori, uno per tipo.** La casella di spunta da 20 px (magie, iniziativa, «Colpo
  critico»), la pillola dell'effetto (un pulsante da 40 px con l'interruttore dentro) e
  l'interruttore unico 40 × 22. Lo strumento conta il campo di «Il DM può modificare» (22 px) fra
  i comandi; gli altri interruttori sono disegnati su uno `span`. L'interruttore base `.switch`
  del sistema non ha markup nell'app e resta com'è (si vede solo nel campionario).
- **Due campi, non uno.** Il campo numerico (16 px grassetto al centro) e il campo di testo
  (15 px, 12 px dentro) sono due tipi diversi.
- **Misure del telefono decise dall'app.** Le voci del menu della pedina e le linguette della
  scheda sono alte 44 px invece di 40; le linguette della colonna del Tavolo sono alte 52 px.
- **Altezze 43 e 45,5 px** (fino al giro dei dettagli). Erano i riquadri esterni dei due
  pulsanti della lettera inclinata; ora è inclinato solo il foglio e i pulsanti misurano
  221,6 × 40 tutti e due.
- **Altezze con i decimali sulla fascia della scheda al telefono (87,5 e 130,5 px).** Seguono il
  contenuto, con interlinee di 1,25 e 1,15; succede anche in «Attuale».
- **Lastre.** 44 varianti, una per ruolo del HUD.
- **Spazi fissi dell'app.** Restano gli spazi della geometria della mappa (76 · 88 · 152 · 292 px e
  gli scostamenti che `fitHud` scrive nella pagina), del corpo della pagina (`main`) e
  dell'intestazione. Resta anche il rientro di 52,8 px dei dati sotto il nome nella finestra
  dell'iniziativa, che l'app calcola in em.
- **Altri valori fermi.** I puntini della sessione restano a 3 px, misura dell'app. Il marchio
  (I-251) usa la scala: scritta a 21 e 18 px, interlinea 1,15, iniziale 1,4×, spazio di 8 px,
  filo di 1 px; il dado misura 40 px (l'altezza dei comandi) e 32 px.
- **Testi incerti.** 213 testi sopra la mappa o sotto la piega restano «incerti»; sono misurati
  negli altri stati.

## Marchio (I-251)

Il marchio di questa opzione è un **d20 tagliato come una gemma viola e incastonato nel ferro
annerito**, con la faccia del «20» fatta di **pergamena** e il numero scritto nel **rosso sangue
di bue** delle capolettere. Accanto, la scritta **«d20 Studio»** come WotR scrive un nome:
maiuscole e minuscole in Vollkorn, color pergamena sul ferro, con la **S di «Studio» come
iniziale** più grande, nel carattere delle capolettere di questa opzione (IM Fell English SC) e
nel viola della gemma. Il dado è disegnato in codice (`brand.mjs`, SVG) sulla geometria comune a
tutte le opzioni (`../brand-geometry.mjs`, un icosaedro vero visto di faccia); la scritta è il
testo dell'app con le regole della sezione «brand (I-251)» in fondo a `direction.css`. Nessuna
immagine.

- **Dove si vede:** testata di Inizio (dado di 40 px, scritta di 21 px), testata del Tavolo
  (32 px e 18 px, le stesse proporzioni), telefono (solo il dado, 32 px dentro il bersaglio di
  40 px; al Tavolo l'app lo nasconde già), icona della scheda del browser. Con il tema chiaro
  tornano il marchio e l'icona di oggi.
- **Campionario:** <http://127.0.0.1:8881/directions/specimen.html?direction=owlcat>, sezione
  «Marchio» (testate, il dado da 16 a 160 px su scuro e su chiaro, l'icona della scheda, il
  marchio completo a 3×).
- **Prove:** `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/brand-owlcat/`:
  `montage-brand-owlcat.png` (i riferimenti di WotR accanto al marchio), `headers-1440-owlcat.png`
  e `headers-390-owlcat.png` (testate prima e dopo, puntatore sopra, fuoco da tastiera, a 2×),
  `specimen/spec-brand-dark-1440-owlcat.png`, le misure in `checks/`, l'analisi dei valori in
  `audit/audit.md`, le prove di disegno scartate in `lab/`.

### Cosa prende dalla grammatica di WotR

| Elemento del marchio                                                                                                                    | Da WotR                                                                                                   | Fonte                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Il corpo del dado: una gemma prugna-viola sfaccettata, dal quasi nero al viola acceso                                                   | le gemme sfaccettate ai lati della linguetta attiva e la gemma viola incastonata sopra il ritratto scelto | W12 (linguetta INVENTORY), W1 (gemma #AB56B1, ombra #6B3A6B), facts §0.3 |
| La montatura: un filo nero attorno, poi un bordo di ferro grigio satinato, luce in alto a sinistra; spigoli di ferro scuro tra le facce | il ferro annerito con i riflessi grigi delle cornici e degli artigli; le cornici delle caselle #5E5E6E    | W12, W1, facts §0.3                                                      |
| La faccia del «20»: pergamena chiara che scurisce verso il basso, con un bordo di ferro                                                 | la carta fredda delle pagine e dei suggerimenti (#F2EBE1, #D9D2CA, #C8C2B4), sempre tenuta dal ferro      | W19, W38, facts §0.2                                                     |
| Il numero «20» in Vollkorn 800 a cifre allineate, rosso sangue di bue #6B2F36                                                           | l'inchiostro delle capolettere; il carattere sostituto di Nexus Serif già usato in tutta l'opzione        | W1, W12, W19; facts §0.5, §0.6                                           |
| La scritta: maiuscole e minuscole con una sola iniziale più grande, in un altro inchiostro                                              | come WotR scrive i nomi e i titoli dei pannelli («Storandus»: capolettera rossa, resto in inchiostro)     | W12, facts §0.6 «Casing»                                                 |
| Testo chiaro con un'ombra scura sotto, sul ferro                                                                                        | le parole della barra delle linguette                                                                     | W12, facts §0.5 (inchiostri chiari sul ferro)                            |
| Puntatore sopra e fuoco: un alone viola attorno al dado, le parole si schiariscono                                                      | il passaggio del puntatore che accende il bordo; il viola è il colore di ciò che è attivo                 | W1, W12; l'anello di 3 px resta quello di tutta l'opzione                |

### Cosa è originale

- La forma: il dado a venti facce, uguale in tutte le opzioni; qui una gemma con la luce
  calcolata faccia per faccia, gli spigoli di ferro e la faccia del «20» come una finestra di
  pergamena incastonata.
- L'idea di unire i tre materiali del gioco (gemma, ferro, pergamena) in un solo oggetto, e di
  ripetere i colori nella scritta: pergamena per le parole, viola della gemma per l'iniziale.
- L'iniziale viola: nel gioco le capolettere sono rosso sangue di bue e stanno solo sulla carta;
  sul ferro il rosso non si leggerebbe (contrasto circa 1,5:1), quindi l'iniziale prende il viola
  della gemma (lo stesso tono delle facce illuminate del dado).
- L'icona della scheda: lo stesso dado in tre toni piatti di viola, spigoli larghi, bordo nero e
  bordo grigio (per le barre chiare e per quelle scure), la faccia di pergamena; senza numero, che
  a 16 px non si leggerebbe.
- Prove scartate (in `lab/`): una gemma lilla chiara (troppo zuccherosa rispetto alle gemme cupe
  del gioco); la scritta in maiuscoletto con le cifre antiche, che a 21 px si leggeva «D2O
  STUDIO» e somigliava alle linguette; la scritta a 28 px, che schiacciava il dado.

### Perché non è una copia del logo di WotR

- Il logo del gioco non è tra le immagini di riferimento (la cartella raccoglie solo
  l'interfaccia) e non è stato guardato né ricalcato: è una scritta, il logotipo «Pathfinder»
  della serie di Paizo con il sottotitolo «Wrath of the Righteous», e lo studio Owlcat firma con
  il suo gufo. Il marchio owlcat non usa nessuna lettera di quel logotipo (la scritta è
  Vollkorn e IM Fell English SC, caratteri liberi OFL), nessun emblema, nessun gufo.
- Non copia nemmeno i disegni della cornice: niente scudo della linguetta, niente artigli o
  spine, niente corona a losanga del ritratto. Dalla cornice prende solo i **materiali e i
  colori** (gemma viola, ferro annerito, pergamena, inchiostro sangue di bue), che sono la
  grammatica di tutta l'interfaccia del gioco, non un segno del suo logo.
- Nessun pixel, texture, carattere o tracciato di Owlcat o di Paizo; nessuna immagine di
  riferimento è stata ricalcata o inclusa.

### Misure e controlli (01/10/2026)

- **Altezze:** a 1440 la testata di Inizio resta alta 81 px e quella del Tavolo 63 px; a 390
  Inizio 110 px e Tavolo 63 px su una sola riga, come prima; a 600 px 110 px, come prima. Tra 421
  e circa 500 px la testata di Inizio cresce di 2 px (156 → 158 px a 430) perché il pulsante del
  marchio ora arriva al bersaglio di 40 px (prima 38). Nessuno scorrimento orizzontale a 390;
  «Entra al Tavolo» finisce a 543 px (entro 844); la barra del Tavolo a 1440 è alta 117 px.
- **Allineamento:** il centro del dado e il centro di «d20» (dalla linea di base alla cima della
  d) coincidono: 82,5 e 82,25 px nella testata di Inizio, 73,5 e 73,5 px in quella del Tavolo.
  Tra il dado e la scritta si vedono circa 13 px (8 px di spazio più il margine del dado).
- **Contrasto:** le parole (#E1D9CE) sul ferro della testata 12,0–13,4:1; l'iniziale viola
  (#AB56B1, 29 px) 3,8–4,2:1, sopra il 3:1 richiesto per un testo così grande. Il controllo dei
  valori (`audit/`) misura 188 testi su Inizio e Tavolo, 0 sotto la soglia. Con l'alto contrasto
  le parole e l'iniziale diventano bianche.
- **Fuoco:** l'anello di 3 px è visibile e non tagliato, con circa lo stesso spazio prima del
  dado (8 px) e dopo la scritta (7 px): 4 px di imbottitura a destra, resi dal margine, così nulla
  si sposta.
- **Movimento:** l'alone e il cambio di colore usano le durate dell'app (`--dur-base`), che
  diventano 0 con il movimento ridotto.
- **Test:** `tests/visual01-directions.test.mjs` 13 su 13 (contratto di `brand.mjs`: classe,
  viewBox, `aria-hidden`, solo il testo «20», id diversi a ogni chiamata, icona con `xmlns`,
  colori scritti per esteso, 1,5 KB); Prettier senza rilievi.

### Licenza del marchio

Disegnato per questo progetto il 01/10/2026: i tracciati sono generati in codice dalla geometria
condivisa, nessun disegno di terzi. Segue la licenza del repository. I caratteri sono Vollkorn e
IM Fell English SC (OFL), già inclusi.

## Licenze e attribuzioni

### Caratteri (SIL Open Font License 1.1)

File woff2 non modificati dai pacchetti Fontsource **5.3.0**, ciascuna cartella con il suo `OFL.txt`
da `google/fonts` al commit `9710da1eacb3be272583c3224dcb70f9da6eadbb`.

| File (`design/blueprint/assets/fonts/…`)                       | Pacchetto                                  | sha256                                                             |
| -------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| `vollkorn/vollkorn-latin-wght-normal.woff2`                    | `@fontsource-variable/vollkorn@5.3.0`      | `3d9ff812bd542e52bb7f0c204f3a21152e22aead4572ff09722c1b38f30d7567` |
| `vollkorn/vollkorn-latin-ext-wght-normal.woff2`                | `@fontsource-variable/vollkorn@5.3.0`      | `fd562f72811cac53a5bf14f86732e952a3f5cfd3c61896b7b809e164978fd7dd` |
| `vollkorn/vollkorn-latin-wght-italic.woff2`                    | `@fontsource-variable/vollkorn@5.3.0`      | `2b21f0fe01d929e246f513850bb1e2658eb77d9ab80c68a53a460725d66a5059` |
| `vollkorn/vollkorn-latin-ext-wght-italic.woff2`                | `@fontsource-variable/vollkorn@5.3.0`      | `5aff1d5511c936c03f1dbd2db0400e0d075b99a4417dcc2c5b11ca6fe8009325` |
| `vollkorn/OFL.txt`                                             | google/fonts `ofl/vollkorn/OFL.txt`        | `53f9c99fa3d47f7d632a42ee7bab4a834a60a744f6026d676c3a223cef2b2ef3` |
| `im-fell-english-sc/im-fell-english-sc-latin-400-normal.woff2` | `@fontsource/im-fell-english-sc@5.3.0`     | `f0f85c4edd2c3dc659db649e9fd0258951445d2fa0735eb43b44a1052ed3d2f5` |
| `im-fell-english-sc/OFL.txt`                                   | google/fonts `ofl/imfellenglishsc/OFL.txt` | `2a3ca501fc4d5efcad9798531e3e06962b1e20c60e464f6cbd6c17630112c773` |

Copyright: Vollkorn © 2017 The Vollkorn Project Authors (https://github.com/FAlthausen/Vollkorn-Typeface);
IM FELL English SC © 2010 Igino Marini (mail@iginomarini.com). IM FELL English SC non ha il
sottoinsieme latin-ext: un'iniziale accentata ricade su Vollkorn.

### Icone (game-icons.net, CC BY 3.0)

**Attribuzione:** icone di Lorc, Delapouite, Guard13007, Faithtoken, sbed e Skoll da
<https://game-icons.net>, licenza CC BY 3.0 (<https://creativecommons.org/licenses/by/3.0/>).
Scaricate il 01/10/2026 da `https://api.iconify.design/game-icons/<nome>.svg`; autore verificato sul
repository <https://github.com/game-icons/icons> (copie in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-owlcat/game-icons/`).
Modifica: il tracciato è quello di Iconify; l'involucro `<svg>` è riscritto con `class="icon"`,
`fill="currentColor"` e `aria-hidden="true"`. Il colore e la tessera li mette `direction.css`.

| Nome nell'app | Icona game-icons                    | Autore     | sha256 del file scaricato                                          |
| ------------- | ----------------------------------- | ---------- | ------------------------------------------------------------------ |
| `home`        | `castle`                            | Lorc       | `689cd4bc951c660bd2d1b972c80d25b21ebc8ef3e091bcf3753b6b5b9aa6f0d2` |
| `person`      | `cowled`                            | Lorc       | `a68b45c5520582126d92a90b74f59b4100b1ef5f5d495f51af4967ed269b0669` |
| `campaign`    | `tabletop-players`                  | Delapouite | `ce635bc6a711a8c9b647a82e4e3970d830fa7d030fcf1f4686c575e3e75df26b` |
| `book`        | `book-cover`                        | Lorc       | `772a6c1da0e1c0d9cbbc0ef285e9ac4c59561073d4cfeca30bfd5cf04e7f6266` |
| `search`      | `spyglass`                          | Lorc       | `e12ed565771decfc1acd56269decb41fc0b0b3f056008bbaa74bf909ee9ea35a` |
| `note`        | `quill-ink`                         | Lorc       | `542edab608b83537f71f9cbce6f7a915743b5eb6b62741a7b9f87b33257d0e6e` |
| `bell`        | `wax-seal`                          | Lorc       | `922872e10a130e1165be3602c8c2ef96495901c30ebe509a913fd4be344ff76f` |
| `settings`    | `gears`                             | Lorc       | `e5a10976563c6c06d21863d8715e24159261836a9a1b2c515bfbacae0208c8ab` |
| `help`        | `help`                              | sbed       | `08a87d18f38f96c746f307409f7e8d1e2ad0511b7d667a4e96ef868e1e0be416` |
| `check`       | `check-mark`                        | Delapouite | `1a839f00340eeb68a4db830ad87b3a7f45e936b2c1bda74931d89c29dbd2c0b1` |
| `play`        | `play-button`                       | Guard13007 | `0e33b61efa9cf8fd56179636fb28757fa53e138ccfe039e3b957354864505d7f` |
| `map`         | `treasure-map`                      | Lorc       | `79a4552770bf03bbd68f33db8b6bf7f40a6a788a7a979f656e2206a22955ce37` |
| `clock`       | `hourglass`                         | Lorc       | `c0b5fd8d9cd14a7a312e798b099b5802a37bd6f994afca250a27ec4966377e3e` |
| `pen`         | `paint-brush`                       | Delapouite | `a4407ca65c072c88f16f05de802ac718dbeefa2221c825cce419970e68fa8f86` |
| `dice`        | `perspective-dice-six-faces-random` | Delapouite | `7f54bae2e3dd60b443dd010c8135bac0ec1cbed987c62624f0e6bfe00497a9ac` |
| `move`        | `footprint`                         | Lorc       | `21c64a0e2aa6f7f9de811aac09a470e4def8a661d0d9cbd94619cb77f5c97864` |
| `ruler`       | `measure-tape`                      | Delapouite | `0fcd083cdf8b89d7768f01f266f4a6fb8ceb6f9ea5555e29e5d40d8de1ecb0d7` |
| `flag`        | `flag-objective`                    | Delapouite | `ed2f8a1b8faf2ac36e7669fa2dc53ff11101bccef8ffdb80f04466bc5f16de2a` |
| `eye`         | `eye-target`                        | Delapouite | `7e1aa5253e37980ef69764decf402e56ae87a02c5565ed6c739bf45827d54493` |
| `shield`      | `checked-shield`                    | Lorc       | `c24ed72f2624e7826ed5d10c46f901d6cbfb6d44ec5ac17ae811cc1a9fd879bd` |
| `chat`        | `conversation`                      | Lorc       | `9a4cca5db960eb28560d55486f93db2d1b8b6697ce3a8f58ca2b6c51b06f5664` |
| `swords`      | `crossed-swords`                    | Lorc       | `b200f7e28238a7ab852b06ca6230efee47465a15c52ef6391cff8d28591a6dcf` |
| `sword`       | `broadsword`                        | Lorc       | `fe5ce872eb1ee018b2614cb60d81546a86463f07bbbb1bcaf7bc6a11c0561e8b` |
| `light`       | `lantern-flame`                     | Lorc       | `9bc7db0d32cfeb3b5931b41b024570948c9b392e7c58cc31217189045164782e` |
| `scroll`      | `scroll-unfurled`                   | Lorc       | `c1376ae791f8d79aa9c1f4153307515b7c1e95ac0ac37d9f8ab257833fecb0c1` |
| `cards`       | `card-pick`                         | Faithtoken | `131bf58a80c534d8dabcecefa32b57895d0335b3c94987d1ecee88af82a52b45` |
| `bag`         | `knapsack`                          | Lorc       | `780ad5ade9831a9afcfa35ac0b0390b28e8511f3cbd5acb062df393eed18c961` |

Il 01/10 (giro di correzioni) `map` è passata da `compass` (a 21 px sembrava un divieto) a
`treasure-map`, e `pen` da `quill` (gemella della piuma di `note`) a `paint-brush`. Nel giro dei
dettagli `help` è passata da `uncertainty` (Lorc: un anello che a 21 px sembrava un contorno) al
disco pieno `help` di sbed, come le altre tessere.

Glifi disegnati dal CSS (in `direction.css`, come immagini dati): il dado di «Tiri e risultati»
(`dice-six-faces-four`, Delapouite, `2077c06493a052d2f78ebeb21e69dbd32d3860b996a038afb3a0b4f861309e3d`), la clessidra di Termina turno
(`hourglass`, Lorc), il teschio delle carte nemiche (`death-skull`, sbed,
`65cdc97cd392e0c1d68c336496d473d98edda365e817e84f32a6d549d1e19c8b`) e il cuore dei punti ferita
(`hearts`, Skoll, `0eaf42a4cbfb6774a74108f6fefe56689cd9a7a2d26457923a618f95ba9aafa5`); al teschio è
stato aggiunto solo il colore di riempimento (#F2EBE1). Dal giro dei dettagli anche il calendario di
«Aggiungi al calendario» (`calendar`, Delapouite,
`f34dd3da0556bdebd06c7ef51bcd082426d5cbaafd24a5e30a2cf8a010774e2f`) e la lama di «Danno»
(`broadsword`, Lorc, lo stesso file della spada qui sopra); il cuore di «Cura» è quello dei punti
ferita. Copie dei file in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/fix-owlcat/glyphs/`. Le quattro nuvole
piene della tessera della connessione (in linea, senza rete, riconnessione, da rivedere) sono
disegnate nel file come geometria semplice (tre archi e un segno ritagliato), originali del
progetto.

### Immagini e disegni (`directions/owlcat/assets/`)

| File               | Che cos'è                                                                    | Fatto da                                                                                             | Licenza                                  | sha256                                                             | Modifiche                                     |
| ------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| `desk-candle.webp` | Scrivania con candelabro e libri a lume di candela (fondo dell'Inizio)       | Il proprietario (gpt-image via ChatGPT; tavola `plates/home-hero.webp` dei candidati, riga 35, SAFE) | Arte originale generata dal proprietario | `b8d037660f1dfb2ba3234c675b637f67a597949221567cecadf8de1ac022adea` | Nessuna (copia identica); il velo viola è CSS |
| `iron-frame.svg`   | Cornice di ferro a nove parti con gemme e spine agli angoli (`border-image`) | Disegnata per d20 Studio, geometria semplice                                                         | Originale del progetto                   | `85f6256997073f7299f356a84a8d2258408673584a8b24de3c28d1e43487db68` | —                                             |
| `drafting.svg`     | Filigrana da disegno: cerchi di compasso, linee di costruzione, tacche       | Disegnata per d20 Studio, geometria semplice                                                         | Originale del progetto                   | `2c0587bee3b731bfa81e980aa87b3cb05d27e3aa978351abd731b2c81ba12892` | —                                             |
| `rule.svg`         | Doppia riga da disegno con il cerchio e il mirino al centro                  | Disegnata per d20 Studio, geometria semplice                                                         | Originale del progetto                   | `1a02c31011dc7b893b45ff58fbbae1bf971472c315758f3dd54f54328b0b22d9` | —                                             |

Il quadro dell'Inizio usa la mappa dipinta già condivisa (`assets/maps/sample/old-watch.webp`,
vedi `assets/ATTRIBUTION.md`); i ritratti e la mappa del Tavolo sono le opere di esempio comuni a
tutte le direzioni (`directions/sample.css`).

### Immagini di riferimento citate (solo consultazione, fuori dal repository)

| File                                                  | Riga | Pagina d'origine                                                                                       | Origine        |
| ----------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------ | -------------- |
| `wotr-table-tb-hud-inspect-fullattack-4k.jpg`         | W1   | <https://steamcommunity.com/sharedfiles/filedetails/?id=3739989774>                                    | Comunità Steam |
| `wotr-table-tb-hud-actionbar-tutorial-fextralife.jpg` | W3   | <https://fextralife.com/pathfinder-wrath-of-the-righteous-beginners-guide-tips-and-tricks-to-survive/> | Stampa         |
| `wotr-table-tb-inspect-card-pcgamer.jpg`              | W7   | <https://www.pcgamer.com/pathfinder-wrath-of-the-righteous-guide-tips/>                                | Stampa         |
| `wotr-table-tb-hud-initiative-objective-gamerant.jpg` | W8   | <https://gamerant.com/pathfinder-wrath-of-the-righteous-beginner-tips/>                                | Stampa         |
| `wotr-table-selection-circles-steam.jpg`              | W9   | <https://store.steampowered.com/app/1184370/>                                                          | Ufficiale      |
| `wotr-table-exploration-quickslots-pcgamer.jpg`       | W10  | <https://www.pcgamer.com/pathfinder-wrath-of-the-righteous-guide-tips/>                                | Stampa         |
| `wotr-sheet-inventory-doll-1440.jpg`                  | W12  | <https://steamcommunity.com/sharedfiles/filedetails/?id=2842495486>                                    | Comunità Steam |
| `wotr-sheet-inventory-doll-1080.jpg`                  | W13  | <https://steamcommunity.com/sharedfiles/filedetails/?id=2607268840>                                    | Comunità Steam |
| `wotr-sheet-character-summary-alignment-1440.jpg`     | W15  | <https://steamcommunity.com/sharedfiles/filedetails/?id=2606324637>                                    | Comunità Steam |
| `wotr-sheet-spellbook-tooltip-fextralife.jpg`         | W17  | <https://fextralife.com/pathfinder-wrath-of-the-righteous-beginners-guide-tips-and-tricks-to-survive/> | Stampa         |
| `wotr-sheet-skills-list-crop-fextralife.jpg`          | W18  | <https://fextralife.com/pathfinder-wrath-of-the-righteous-beginners-guide-tips-and-tricks-to-survive/> | Stampa         |
| `wotr-sheet-levelup-deity-domain-official.png`        | W19  | <https://store.steampowered.com/news/app/1184370/view/1783238125244690>                                | Ufficiale      |
| `wotr-sheet-controller-abilities-4k.jpg`              | W23  | <https://steamcommunity.com/sharedfiles/filedetails/?id=2869153696>                                    | Comunità Steam |
| `wotr-home-main-menu-book-1440.jpg`                   | W26  | <https://steamcommunity.com/sharedfiles/filedetails/?id=2601244564>                                    | Comunità Steam |
| `wotr-home-loading-screen-hint-1440.jpg`              | W28  | <https://steamcommunity.com/sharedfiles/filedetails/?id=3514173895>                                    | Comunità Steam |
| `wotr-home-new-game-difficulty-1440.jpg`              | W29  | <https://steamcommunity.com/sharedfiles/filedetails/?id=2979716678>                                    | Comunità Steam |
| `wotr-dialog-conversation-two-portraits-1080.jpg`     | W34  | <https://steamcommunity.com/sharedfiles/filedetails/?id=2736816815>                                    | Comunità Steam |
| `wotr-dialog-tooltip-spell-bless-fextralife.jpg`      | W38  | <https://fextralife.com/pathfinder-wrath-of-the-righteous-beginners-guide-tips-and-tricks-to-survive/> | Stampa         |
| `wotr-dialog-global-map-event-card-1080.jpg`          | W43  | <https://steamcommunity.com/sharedfiles/filedetails/?id=3664127242>                                    | Comunità Steam |
