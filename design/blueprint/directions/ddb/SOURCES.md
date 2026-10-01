# Opzione 2 · D&D Beyond — fonti e licenze

- **Data:** 30/09/2026; esteso il 01/10/2026 (nuovi stati, scale unificate, I-250); corretto lo
  stesso giorno dopo la seconda critica indipendente (pulsanti in tre soli tipi, colonne allineate,
  passaggio di chiusura sulle misure); rifinito il 01/10/2026 dopo la terza verifica (giro di cura
  I-250: una sola ricetta per ogni tipo di componente, vedi «Coerenza (I-250)»); secondo giro di
  cura lo stesso giorno, dopo la quarta verifica (vedi «Secondo giro»); terzo giro lo stesso
  giorno, dopo la quinta verifica (vedi «Terzo giro»); quarto giro lo stesso giorno, dopo la
  sesta verifica (vedi «Quarto giro»).
- **Direzione:** `ddb` («2 · D&D Beyond» nel selettore «Direzione»), Fase C, Scelta 1 — Direzione (I-248).
- **File di questa opzione:** `direction.css` (tutto l'aspetto), `icons.mjs` (le icone),
  `assets/campaign-backdrop.webp` e `assets/creation-scene.webp` (due illustrazioni tue).
- **Riferimenti:** le immagini e i fatti di D&D Beyond sono in
  `~/Workspace/Codex/d20-studio-visual-assets/references/ddb/` (`facts.md`, `manifest.md`). Sono
  **solo da guardare**: nessuna di quelle immagini, nessun font, logo, texture o cornice di D&D
  Beyond è entrato nel repository. Copiamo la «grammatica»: disposizione, proporzioni, tipi di
  elemento, comportamenti e i valori dei colori.
- **Schermate:** `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round1/ddb/` (15
  schermate; le coppie «nostra · riferimento» sono in `round1/ddb/_pairs/`). Schermate e coppie
  sono state rifatte dopo l'ultima modifica di `direction.css` (01/10/2026, 15:24; schermate
  15:25, coppie 15:27).

## In tre righe

1. Questa opzione copia D&D Beyond: le pagine scure del sito con l'intestazione a due fasce, i
   titoli in un grande carattere con le grazie e i pulsanti rettangolari rossi; la scheda del
   personaggio in modalità scura «Underdark» con il tema «DDB Red»; il tavolo come D&D Beyond Maps.
2. La scheda è fatta di cornici sottili rosse su fondo quasi nero sopra un'illustrazione
   scurita: gli «scudi» delle caratteristiche con il medaglione ovale, l'esagono
   dell'Iniziativa, lo scudo della CA, i numeri da tirare in piccoli riquadri.
3. Il Tavolo è sobrio e grigio ardesia, con la colonna degli strumenti scura e lo strumento attivo
   in un quadrato rosso, le pedine rotonde con l'anello e il nome in una targhetta scura: l'effetto
   è ordinato e «da app ufficiale», meno teatrale di BG3.
4. Tutto segue **una sola serie di misure** presa da D&D Beyond (I-250): spaziature, grandezze
   del testo con la loro interlinea, pesi, raggi, spessori, altezze dei comandi e **tre soli tipi
   di pulsante**, dichiarati in cima a `direction.css`. Ogni regola dell'opzione le usa; i valori
   dell'app che restavano (spaziature dispari, interlinee frazionarie, il peso 600) sono stati
   portati sulla scala nelle 20 schermate verificate e, con una prova a parte, in tutta la pagina
   Inizio (anche sotto la prima schermata). La verifica delle misure su 20 schermate (01/10, dopo
   il giro di cura) dà: 29 valori di spaziatura su un passo di 2 px (99 %), 11 grandezze di testo,
   4 pesi, 15 interlinee tutte intere, 72 stili di testo, 75 varianti di pulsante, nessun errore di
   contrasto (l'aspetto di oggi: 42, 23, 4, 49, 101, 108; prima del giro di cura: 31, 11, 4, 15,
   81, 84). Restano alcune misure dell'app che l'opzione non tocca: sono elencate qui sotto, in
   «Misure lasciate all'app».

## Elemento | Prodotto copiato | Fonte

«facts §n» indica la sezione di `references/ddb/facts.md`; i file immagine sono in
`references/ddb/`, con l'indirizzo originale preso da `manifest.md`.

| Elemento                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Prodotto copiato                                                                                                                                           | Fonte                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colori di base: pagina `#12181c`, barre e pannelli `#232b2f`, bordi `#525c63`, testo bianco, testo secondario `#a2acb2`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | D&D Beyond, token «ttui» del sito                                                                                                                          | facts §0.1; `ddb-code-css-tokens-homepage-2026-09-30.txt` (CSS di <https://www.dndbeyond.com/en>)                                                                                                                                                                                     |
| Rosso dei pulsanti principali, dello strumento attivo e delle sottolineature `#e40712`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | D&D Beyond, «red-500» (CREATE ACCOUNT, NEXT, strumento attivo di Maps)                                                                                     | facts §0.1, §3, §6; `ddb-home-live-anon-1440x900.png` (<https://www.dndbeyond.com/>)                                                                                                                                                                                                  |
| Colore del tema della scheda `#c53131` (cornici, schede attive, filtri attivi)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Scheda D&D Beyond, tema «DDB Red»                                                                                                                          | facts §1 «Theme variables», «Theme buttons»; `ddb-code-charapp-css-excerpts-2026-09-30.txt`; `ddb-sheet-desktop-customizations-ddbred-2021.jpg` (<https://www.dndbeyond.com/attachments/9/527/character-sheet-customizations-desktop.jpg>)                                            |
| Testi colorati schiariti per la leggibilità (rosso `#ff5a4a`, rosso tema `#f06a6a`, etichette `#8a979f`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Gli stessi colori di D&D Beyond, un gradino più chiari                                                                                                     | I valori originali sul fondo scuro stanno sotto il minimo di leggibilità (rosso 3,7:1, grigio etichette 3,7:1): vedi «Differenze dichiarate»                                                                                                                                          |
| Caratteri: Roboto per l'interfaccia e i numeri grandi, Roboto Condensed grassetto maiuscoletto per etichette, schede e filtri                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Sito e scheda D&D Beyond                                                                                                                                   | facts §0.2, §0.3                                                                                                                                                                                                                                                                      |
| Titoli del sito in Alegreya molto nero (800)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Sostituisce «Majesty», il carattere dei titoli di D&D Beyond (proprietario)                                                                                | facts §0.2; `ddb-home-live-anon-1440x900.png` («Every Adventure Starts With a Character»)                                                                                                                                                                                             |
| Numeri dei titoli «allineati» (lining: «tra 1 giorno», non un «1» che sembra una «I»)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Titoli Majesty di D&D Beyond (numeri allineati)                                                                                                            | `ddb-home-live-anon-1440x900.png`                                                                                                                                                                                                                                                     |
| Avvisi e riquadri informativi neutri (filo grigio `#525c63`, velo bianco al 5 %): il rosso resta solo a pulsanti principali, stati attivi, sottolineature e danni                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Uso del rosso in D&D Beyond                                                                                                                                | facts §0.1, §1; `ddb-sheet-desktop-underdark-inventory-2025-frame.png`                                                                                                                                                                                                                |
| Intestazione a due fasce: striscia `#12181c`, barra `#232b2f`, riga di 2 px `#525c63`, voci in maiuscoletto grigio chiaro, la voce aperta con il bagliore rosso sotto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Intestazione di dndbeyond.com                                                                                                                              | facts §3 «Nav bar», «Nav items»; `ddb-home-live-anon-1440x900.png`, `ddb-home-header-signed-in-2026-frame.png` (<https://www.dndbeyond.com/attachments/12/781/main-nav.gif>)                                                                                                          |
| Pulsanti rettangolari, raggio 4 px, maiuscoletto grassetto; principale rosso pieno; secondario con bordo grigio sottile. **Tre soli tipi, uguali ovunque** (I-250): pieno e con bordo alti 40 px con 12 px ai lati, «silenzioso» (solo parola) alto 40 px con 8 px ai lati, tutti nel maiuscoletto da 16 px su una riga di 20 px; solo il pulsante grande dell'Inizio e «Termina turno» (come NEXT) sono alti 48 px, con 24 px ai lati e il maiuscoletto da 18 px                                                                                                                                                                                                                                                                                                                                                                                                                | Pulsanti del sito e della scheda (CREATE ACCOUNT, DISMISS, SHORT REST, MANAGE, CAST: una sola grandezza e una sola altezza per tipo)                       | facts §0.3 «UI scale» (button 12/14/16), §1 «Theme buttons», §3 «Header CTA», «Outline button», §6 NEXT; `ddb-sheet-desktop-underdark-inventory-2025-frame.png` (<https://media.dndbeyond.com/compendium-images/marketing/changelog/party-inventory.gif>)                             |
| Schede (tab) in maiuscoletto con sottolineatura di 3 px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Schede della scheda personaggio                                                                                                                            | facts §1 «Tab row»                                                                                                                                                                                                                                                                    |
| Filtri a pillola: raggio 4, nero con testo grigio, quello scelto pieno nel colore del tema                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Filtri ALL / ATTACK / ACTION della scheda in modalità scura                                                                                                | facts §1 «Filter pills», «Filter pills in dark mode»; `ddb-sheet-desktop-underdark-inventory-2025-frame.png`                                                                                                                                                                          |
| Finestre: pannello quasi nero con angoli arrotondati di 8 px e un filo sottile, titolo nel carattere dei titoli molto nero, una riga oro `#d1b873` semplice (rientrata dai bordi) sotto il titolo e sopra il piede; i menu tengono la cornice oro sottile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Finestra Condizioni e menu della pedina di Maps (2026)                                                                                                     | facts §6 «Conditions modal», «Token menu»; `ddb-maps-conditions-modal-2026-frame.png` (<https://www.dndbeyond.com/attachments/13/47/conditiontracking.gif>), `ddb-maps-token-menu-2026-frame.png` (<https://www.dndbeyond.com/attachments/12/924/tokenmenu.gif>)                      |
| Inizio: la campagna da riprendere come fascia illustrata sulla larghezza del contenuto (angoli vivi, nessuna ombra), con il titolo più grande della pagina (≈64 px, molto nero), testo 16/28, il pulsante rosso alto 48 px con la freccia «→» dopo le parole e accanto «Apri campagna» della stessa misura, con il bordo; il titolo della pagina resta più piccolo (≤ 36 px)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Fascia principale di dndbeyond.com                                                                                                                         | facts §3 «Hero»; `ddb-home-live-anon-1440x900.png`, `ddb-home-live-anon-390x844.png` (<https://www.dndbeyond.com/>); freccia: glifo Lucide `arrow-right` (ISC); illustrazione: `assets/campaign-backdrop.webp` (tua)                                                                  |
| Inizio sul telefono: l'illustrazione da bordo a bordo e ben visibile in alto, che sfuma nel colore della pagina; titolo e testo centrati, i due pulsanti uno sotto l'altro su tutta la larghezza                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Fascia principale di dndbeyond.com sul telefono                                                                                                            | `ddb-home-live-anon-390x844.png` (<https://www.dndbeyond.com/>)                                                                                                                                                                                                                       |
| Inizio: «Il tuo personaggio» come riquadro illustrato «My Characters» dentro una scheda come le due vicine: il ritratto copre tutto il riquadro e si scurisce verso il basso a sinistra, nome grande nel carattere dei titoli e classe su una riga in basso a sinistra, punti ferita in una piccola etichetta scura in alto a destra. Le tre schede della riga (personaggio, resoconto, appuntamento) partono alla stessa altezza, con lo stesso margine interno (24 px; 16 sul telefono) e i titoli sulla stessa riga                                                                                                                                                                                                                                                                                                                                                           | Riquadri «Play D&D» della home («My Characters»), tutti con lo stesso bordo superiore e lo stesso margine interno                                          | facts §3 «My Characters tile»; `ddb-home-play-dnd-tiles-my-characters-2025-frame.png` (<https://www.dndbeyond.com/attachments/12/672/ddbhomepage.gif>)                                                                                                                                |
| Inizio: schede Novità / Guide / Supporto in maiuscoletto, conteggio e «Nuova» come piccoli bollini rossi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Schede del carosello e bollino «PLAY» della home                                                                                                           | facts §3 «Carousel tabs», «Hero»; `ddb-home-live-anon-1440x900.png`                                                                                                                                                                                                                   |
| Scheda: illustrazione di sfondo fissa e scurita dietro le cornici                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | «Backdrop» della scheda D&D Beyond                                                                                                                         | facts §1 «Theme customisation»; `ddb-sheet-desktop-customizations-ddbred-2021.jpg`; illustrazione: `assets/creation-scene.webp` (tua)                                                                                                                                                 |
| Scheda: fascia scura dell'intestazione, ritratto quadrato con bordo sottile nel colore del tema, nome in Roboto Condensed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Intestazione della scheda                                                                                                                                  | facts §1 «Character header»; `ddb-sheet-desktop-live-presto-light-1440x900.png` (<https://www.dndbeyond.com/characters/133058471>)                                                                                                                                                    |
| Scheda: «scudi» delle caratteristiche con angoli superiori incavati, modificatore grande in un riquadro, punteggio nel medaglione ovale in basso                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Riquadri delle caratteristiche                                                                                                                             | facts §1 «Ability box» (solo proporzioni: la cornice è disegnata qui in CSS, non è quella di D&D Beyond); `ddb-sheet-desktop-underdark-inventory-2025-frame.png`                                                                                                                      |
| Scheda: riquadri ad angoli smussati per Competenza, Movimento, Ispirazione eroica, Punti ferita e per i pannelli laterali. Competenza, Movimento e Ispirazione eroica hanno tre righe uguali: l'etichetta in alto (su una o due righe), il valore su **una sola riga comune** al centro, l'etichetta del piede (CAMMINARE) sotto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Riquadri PROFICIENCY / SPEED / HEROIC INSPIRATION / HIT POINTS (etichetta in alto, valore al centro, parola in fondo)                                      | facts §1 «Proficiency and Speed boxes», «Hit Points box»; `ddb-sheet-desktop-underdark-inventory-2025-frame.png`                                                                                                                                                                      |
| Scheda: Iniziativa nell'esagono, CA nello scudo, Difese e Condizioni in riquadri                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Riquadri INITIATIVE, ARMOR CLASS, DEFENSES, CONDITIONS                                                                                                     | facts §1 «Initiative box», «Armor Class box»                                                                                                                                                                                                                                          |
| Scheda: PUNTI FERITA come il riquadro di D&D Beyond: CURA, il numero e DANNO uno sopra l'altro a sinistra, attuali e massimi nello stesso carattere e della stessa grandezza (26 px, il massimo in grigio), l'etichetta in fondo; nessuna barra sul computer (resta per i lettori di schermo); CURA verde e DANNO rosso                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Riquadro HIT POINTS della scheda                                                                                                                           | facts §1 «Hit Points box»; `ddb-sheet-desktop-underdark-inventory-2025-frame.png`                                                                                                                                                                                                     |
| Scheda: etichette dei pannelli in fondo al riquadro (TIRI SALVEZZA, SENSI, COMPETENZE), Abilità con l'intestazione in alto e la sigla della caratteristica prima del nome («DES Acrobazia»), pallino bianco pieno per le competenze, ogni bonus nel suo piccolo riquadro da tirare                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Pannelli SAVING THROWS, SENSES, SKILLS                                                                                                                     | facts §1 «Saving throws panel», «Skills panel»                                                                                                                                                                                                                                        |
| Scheda: sensi passivi (PERCEZIONE, INDAGARE, INTUIZIONE, SCUROVISIONE) con il numero in un riquadro di 64 × 40 px **a sinistra** e l'etichetta dopo: tutti i numeri nella stessa colonna (quello da tirare resta il suo pulsante)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Scheda D&D Beyond, pannello SENSES (il punteggio passivo a sinistra, poi il nome)                                                                          | facts §1 «Senses panel» (il valore a sinistra, poi l'etichetta); `ddb-sheet-desktop-underdark-inventory-2025-frame.png`, `ddb-sheet-desktop-live-presto-light-1440x900.png`                                                                                                           |
| Scheda: TIRI SALVEZZA in due colonne di tre «pillole» sottili nel colore del tema (FOR, DES, COS · INT, SAG, CAR), ciascuna con il pallino della competenza, la sigla e il bonus in un tondo alla fine; il nome intero resta nel nome accessibile e nel suggerimento                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Pannello SAVING THROWS                                                                                                                                     | facts §1 «Saving throws panel»; `ddb-sheet-desktop-underdark-inventory-2025-frame.png`, `ddb-sheet-desktop-customizations-ddbred-2021.jpg`                                                                                                                                            |
| Scheda: il valore modificato segnato da un pallino blu `#1c9aef` (non rosso); chip e interruttori con angoli di 4 px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Pannello SKILLS («modified value»), filtri a pillola                                                                                                       | facts §1 «Skills panel», «Filter pills»; `ddb-code-charapp-css-excerpts-2026-09-30.txt` (`.ct-skills__col--modifier-modified`)                                                                                                                                                        |
| Scheda: Gioco / Modifica e Dadi digitali / fisici con il bordo nel colore del tema, quello premuto pieno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Pulsanti di sezione della scheda mobile                                                                                                                    | facts §2 «Mobile section buttons»                                                                                                                                                                                                                                                     |
| Scheda: la colonna destra apre con INIZIATIVA, CA e DIFESE, poi CONDIZIONI, e subito la «scatola principale» (schede e contenuto) disegnata come un unico riquadro ad angoli smussati nel colore del tema, come gli altri riquadri: la riga delle schede entra nella prima schermata a 1440 × 900; titoli di sezione («Azioni») nel colore del tema                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Colonna destra e primary box della scheda («ACTIONS • Attacks per Action»)                                                                                 | facts §1 «Primary box», «Tab row», «Section headings in the tab»; `ddb-sheet-desktop-underdark-inventory-2025-frame.png`, `ddb-sheet-desktop-customizations-ddbred-2021.jpg`                                                                                                          |
| Scheda sul telefono: intestazione scura a tutta larghezza (ritratto 48 px, nome, comandi) e subito sotto la striscia rapida piatta COMPETENZA · MOVIMENTO · INIZIATIVA · CA (valore sopra una piccola etichetta in maiuscoletto, tutte le etichette sulla stessa riga, l'iniziativa nel suo riquadrino, il pallino «modificato» accanto al valore, una riga del tema sotto), poi le schede; caratteristiche 3 × 2; contenuto in una scheda incorniciata                                                                                                                                                                                                                                                                                                                                                                                                                          | Scheda mobile                                                                                                                                              | facts §2; `ddb-sheet-mobile-live-presto-390x844.png` (<https://www.dndbeyond.com/characters/133058471>), `ddb-sheet-mobile-app-header-abilities-2026-frame.png` (<https://www.dndbeyond.com/attachments/12/938/shareddiceinmobile.gif>)                                               |
| Tavolo: colonna degli strumenti scura e arrotondata, icone bianche a tratto, strumento attivo come quadrato rosso pieno; gli strumenti del gruppo aperto in una seconda colonna                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Barra degli strumenti di D&D Beyond Maps e il suo sottomenu Disegno                                                                                        | facts §6 «Tool rail»; `ddb-maps-initiative-portrait-strip-frame.png` (<https://www.dndbeyond.com/attachments/11/669/flexible-initiative.gif>), `ddb-maps-toolbar-draw-flyout.jpg` (<https://www.dndbeyond.com/attachments/11/205/draw-menu-2.jpg>)                                    |
| Tavolo: ordine dei turni come le righe «Initiative Order» (riquadri `#232b2f`, ritratto rotondo con anello, nome in grassetto; il turno attuale su `#434b4e` con cornice di 2 px `#c8caca`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Pannello Initiative Order di Maps                                                                                                                          | facts §6 «Initiative rows»; `ddb-maps-initiative-order-2026-frame.png` (<https://www.dndbeyond.com/attachments/12/811/csim-encounter.gif>)                                                                                                                                            |
| Tavolo: pedine rotonde con anello di 4 px (grigio di base, rosso per i nemici), selezione verde, nome in una targhetta scura semitrasparente subito sotto l'anello (nessun anello di stato o segno attraversa le parole); la barra dei PF sopra la pedina                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Pedine di Maps (2026)                                                                                                                                      | facts §6 «Ring and selection», «Name pill»; `ddb-maps-tokens-nameplates-2026.png` (<https://www.dndbeyond.com/attachments/13/74/screenshot-2026-08-17-at-12-28-15.png>), `ddb-maps-token-menu-2026-frame.png`                                                                         |
| Tavolo: ritratti del gruppo rotondi con lo stesso anello, il nome in una targhetta grigia arrotondata sul piede dell'anello                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Pedine e targhette di Maps                                                                                                                                 | `ddb-maps-tokens-nameplates-2026.png`                                                                                                                                                                                                                                                 |
| Tavolo: gruppi di comandi scuri e arrotondati sopra la mappa (sessione, zoom, riga di stato, risorse, barra delle azioni); gli avvisi della sessione con angoli di 4 px, fondo `#232b2f` e filo oro per quello che chiede attenzione, mai sopra i ritratti dei turni                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Gruppi in basso a destra e barra superiore di Maps; menu 2026                                                                                              | facts §6 «Bottom-right cluster»; `ddb-maps-game-log-advantage-2025-frame.png` (<https://www.dndbeyond.com/attachments/11/864/ddb_maps_advantage_disadvantage_800x450.gif>), `ddb-maps-vtt-overview-annotated.jpg` (<https://www.dndbeyond.com/attachments/11/671/maps-dashboard.jpg>) |
| Tavolo: segni sulla mappa nei grigi neutri di D&D Beyond (muri 2 px grigio chiaro al 60 %, terreno difficile e zone di pericolo bianchi, tratteggio bianco tenue, etichette bianche); fuori dalla scena un fondo scuro piatto `#12181c` senza righe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Mappa e sovrapposizioni di Maps                                                                                                                            | facts §6; `ddb-maps-vtt-overview-annotated.jpg`, `ddb-maps-tokens-nameplates-2026.png`                                                                                                                                                                                                |
| Tavolo: piede del pannello come la barra in basso dell'Initiative Order (icone bianche in una riga, poi «Termina turno» rosso e largo come NEXT)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Barra in basso di Maps con NEXT rosso                                                                                                                      | facts §6 «Bottom bar»; `ddb-maps-initiative-order-2026-frame.png`                                                                                                                                                                                                                     |
| Tavolo: pannello laterale grigio `#232b2f`, sotto-schede come filtri, CA nel piccolo scudo scuro (`#3b4245`, disegnato qui come poligono)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Pannelli di Maps; distintivo CA delle pedine 2026                                                                                                          | facts §6 «Layout», «AC badge»; `ddb-maps-tokens-ac-conditions-2026.png` (<https://www.dndbeyond.com/attachments/13/145/acandconditions.png>)                                                                                                                                          |
| Tavolo: scheda aperta nel binario destro come riquadro grigio con la sottolineatura rossa di 2 px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Motivo «--ttui_underline» di D&D Beyond                                                                                                                    | facts §0.1 «Active-underline pattern»                                                                                                                                                                                                                                                 |
| Icone: glifi bianchi a tratto di 2 px, estremità arrotondate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Icone del sito e della barra di Maps                                                                                                                       | facts §6 «Tool rail»; set Lucide (vedi «Licenze»)                                                                                                                                                                                                                                     |
| Scale uniche (I-250): spaziature 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 px (e 128 per la fascia illustrata del telefono); testo 12 · 13 · 14 · 16 · 18 · 20 · 22 · 24 · 26 · 32 · 64 px (le scritte in maiuscolo sono maiuscoletto di un gradino più grande, perché le sue lettere sono 0,7 della grandezza); interlinee intere 16 · 18 · 20 · 24 · 28 · 32 · 40 · 72 px (ogni grandezza ha la sua); pesi 400 · 500 · 700 (800 solo per i titoli con le grazie); raggi 3 · 4 · 8 px, tondo, pillola; linee 1 · 2 · 3 · 4 px; comandi 40 · 44 · 48 · 64 px; i tre tipi di pulsante; ritratti 36 · 40 · 48 · 60 px; le colonne della tabella dell'inventario. Anche la scala del testo dell'app segue queste misure (14 px il testo normale)                                                                                                                        | D&D Beyond, scale «lexicon» e dell'interfaccia; misure della scheda e di Maps                                                                              | facts §0.1 «Content containers», §0.3 «Lexicon title/text scale», «UI scale», §1, §3, §6; `ddb-code-css-tokens-homepage-2026-09-30.txt`                                                                                                                                               |
| Passaggio di chiusura (I-250): i valori dell'app che l'opzione non aveva ancora toccato portati sulla scala — ogni testo con la sua interlinea intera (nessuna più «19,5» o «16,5»), il peso 600 dell'app diventato 700, le spaziature dispari (9 × 15, 10, 11, 14, 15, 18, 22, 23 px) passate ai gradini, il margine della pagina 40/48 px (16 sul telefono), i pulsanti delle finestre sul telefono che riempiono la riga invece di andare a capo dentro                                                                                                                                                                                                                                                                                                                                                                                                                       | D&D Beyond: un solo sistema di misure per sito, scheda e Maps                                                                                              | facts §0.1, §0.3, §1, §3, §6; verifica delle misure `probe-ddb/fix3/audit-final/audit.md` (strumento `changes/visual-01/audit/`)                                                                                                                                                      |
| Tavolo: testi sulla scala — nomi delle pedine e del gruppo in grassetto (700), testi secondari 12/16 o 13/18, avvisi della sessione 13/18, la scelta dei dadi 14 px, le etichette dei gruppi della barra delle azioni (ARMI, INCANTESIMI, COMUNI) nel maiuscoletto da 14 px invece che da 9, le schede in basso sul telefono 12/16                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | D&D Beyond Maps: nomi bianchi in grassetto, etichette in maiuscoletto grassetto, testo dell'interfaccia a 14 px                                            | facts §6; `ddb-maps-tokens-nameplates-2026.png`, `ddb-maps-token-menu-2026-frame.png`                                                                                                                                                                                                 |
| Campi, elenchi e menu ovunque (finestre, menu della pedina, schede): campi scuri `#10161a` col bordo grigio, il campo di ricerca con la lente dentro, righe divise da un filo punteggiato, etichettine di 3 px in maiuscoletto condensato; i pulsanti principali dentro le schede della scheda nel colore del tema `#c53131` (scuro `#9c2727` al passaggio)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Scheda D&D Beyond (Underdark): campi, «Search Spell Names…», tabelle, pulsanti del tema                                                                    | facts §1 «Underdark», «Theme buttons (DDB Red)»; `ddb-sheet-desktop-live-presto-spells-1440x900.png`; lente: glifo Lucide `search` (ISC)                                                                                                                                              |
| Scheda · Magie: i tre numeri dell'incantatore (e gli altri: classe, preparate, trucchetti, libro) in fila al centro, il valore grande sopra una piccola etichetta, senza riquadri, tutti sulla stessa riga; gli slot come quadratini (pieni nel colore del tema quelli ancora da spendere) su colonne comuni (etichetta · quadratini · «Spesi» · pulsante), così i due CORREGGI RISORSA stanno uno sotto l'altro; i gruppi «TRUCCHETTI», «LIVELLO 1» e anche «Incantesimi dagli oggetti» e «Focus e componenti» nello stesso maiuscoletto condensato del colore del tema, con un solo filo sotto; ogni magia una riga: nome in Roboto Condensed, dettagli su una riga grigia piccola, LANCIA e LANCIA DALL'OGGETTO pieni nel colore del tema e della stessa misura, DETTAGLI e CONFRONTA come parole grigie; il campo di ricerca largo quanto il contenuto, come nell'inventario | Scheda D&D Beyond, scheda SPELLS (MODIFIER · SPELL ATTACK · SAVE DC, SLOTS, CANTRIP / 1ST LEVEL, CAST)                                                     | `ddb-sheet-desktop-live-presto-spells-1440x900.png`, `ddb-sheet-mobile-live-presto-spells-390x844.png` (manifest #58, #59, misure DOM lette dal vivo il 01/10)                                                                                                                        |
| Scheda · Inventario: in testa una fascia piatta (peso trasportato, sintonia, monete, set d'armi) con fili sottili fra le voci al posto dei riquadri, i GESTISCI come piccoli pulsanti a bordo grigio, solo parole, su una riga e tutti alla stessa altezza in fondo alla loro colonna; il campo di ricerca largo quanto il contenuto; filtri neri a pillola; la tabella degli oggetti su fili punteggiati con **colonne fisse** (riquadro dell'oggetto · nome · QTÀ, PESO, CARICHE da 56 px ciascuna · comandi): ogni numero sta sotto la sua intestazione, allineato a destra; nomi condensati, gli oggetti magici col nome nel colore della rarità (la rarità resta scritta nell'etichetta)                                                                                                                                                                                    | Scheda D&D Beyond, scheda INVENTORY in modalità Underdark (WEIGHT CARRIED, MANAGE INVENTORY, filtri, tabella ACTIVE · NAME · WEIGHT · QTY a colonne fisse) | `ddb-sheet-desktop-underdark-inventory-2025-frame.png`, `ddb-sheet-desktop-underdark-party-inventory-2025-frame.png` (<https://media.dndbeyond.com/compendium-images/marketing/changelog/party-inventory.gif>)                                                                        |
| Finestra dell'iniziativa: i combattenti come righe piatte su un filo (niente riquadri), l'ordine in grigio, il nome in grassetto sopra una riga grigia piccola, il d20 in un campo scuro arrotondato, il totale come numero bianco; TIRA TUTTI e INIZIA COMBATTIMENTO rossi, TIRA PNG con il bordo; la finestra con il titolo nel carattere dei titoli e le righe oro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | D&D Beyond Maps, pannello «Combat Encounter» (4 PARTY MEMBERS, AUTO INITIATIVE, START COMBAT) nella finestra 2026                                          | `ddb-maps-combat-encounter-list-2024-frame.png` (manifest #60; <https://www.dndbeyond.com/posts/1841-roll-for-initiative-combat-tracking-comes-to-the>), `ddb-maps-conditions-modal-2026-frame.png`                                                                                   |
| Menu della pedina: angoli vivi e un filo oro sottile; una fascia di testa più scura (l'icona della pedina in un quadrato arrotondato a bordo grigio, il nome nel carattere dei titoli molto nero, i punti ferita piccoli e grigi) sopra la fascia delle azioni; ogni azione con l'icona bianca a tratto e una parola breve in maiuscoletto grassetto grigio chiaro; fili sottili fra i gruppi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | D&D Beyond Maps, menu della pedina 2026 (HP · ADD · ART · HIDE · RING · LOCK · MORE) e il suo pannello dei punti ferita                                    | `ddb-maps-token-menu-2026-frame.png`, `ddb-maps-token-hp-panel-2026-frame.png` (<https://www.dndbeyond.com/attachments/12/924/tokenmenu.gif>)                                                                                                                                         |
| Tavolo in esplorazione: le zone della mappa (Brace ardenti, Scale per la cripta, la trappola) come gli spilli di Maps: un **rombo** scuro con il bordo oro e il glifo bianco, il nome in grassetto su una targhetta scura a estremità squadrate attaccata al rombo; i nomi degli spilli del DM («Pozzo del cortile») sulla stessa targhetta, staccati dalla punta dello spillo; il resto del Tavolo fuori dal combattimento come in combattimento (barra degli strumenti, gruppi scuri, pannello)                                                                                                                                                                                                                                                                                                                                                                                | D&D Beyond Maps, Scene Prep e spilli della mappa («A1: Boulders», «A2: Ocean Bay»)                                                                         | `ddb-maps-scene-prep-2026-frame.png` (<https://www.dndbeyond.com/attachments/13/105/scene-prep-main.gif>), `ddb-maps-tokens-ac-conditions-2026.png`                                                                                                                                   |
| Quarto giro (I-250): un solo interruttore (40 × 22, rosso con il pallino bianco; nella scheda il rosso del tema), le abilità sulla riga di mezzo, i LANCIA tutti larghi uguali, ogni ritratto del gruppo alto uguale anche senza la barra dei punti ferita, i titoli dei riquadri dell'Inizio alla stessa altezza con o senza collegamento                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Scheda D&D Beyond (interruttori, SKILLS, CAST a larghezza fissa), riquadri della home, ritratti di Maps                                                    | facts §1, §3, §6; `ddb-sheet-desktop-live-presto-spells-1440x900.png`, `ddb-home-play-dnd-tiles-my-characters-2025-frame.png`, `ddb-maps-initiative-portrait-strip-frame.png`                                                                                                         |

## Coppie per il confronto

Ogni nostra schermata va messa accanto a questi riferimenti (tutti in
`~/Workspace/Codex/d20-studio-visual-assets/references/ddb/`). Le coppie già montate (a sinistra
la nostra, a destra i riferimenti, ciascuna con il nome del file) sono in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round1/ddb/_pairs/`.

| Superficie               | Nostra schermata                                                    | Riferimenti                                                                                                                                                                             | Vista      |
| ------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Inizio                   | `home-dark-1440-ddb.png`                                            | `ddb-home-live-anon-1440x900.png` (fascia illustrata, titolo, pulsante rosso, intestazione); `ddb-home-play-dnd-tiles-my-characters-2025-frame.png` (riquadro «My Characters»)          | 1440 × 900 |
| Inizio                   | `home-dark-390-ddb.png`                                             | `ddb-home-live-anon-390x844.png`                                                                                                                                                        | 390 × 844  |
| Scheda                   | `sheet-dark-1440-ddb.png`                                           | `ddb-sheet-desktop-underdark-inventory-2025-frame.png` (modalità scura, stessa disposizione); `ddb-sheet-desktop-customizations-ddbred-2021.jpg` (lo stesso tema rosso)                 | 1440 × 900 |
| Scheda                   | `sheet-dark-390-ddb.png`                                            | `ddb-sheet-mobile-live-presto-390x844.png`; `ddb-sheet-mobile-app-header-abilities-2026-frame.png` (versione scura 2026)                                                                | 390 × 844  |
| Tavolo                   | `table-combat-dm-dark-1440-ddb.png`                                 | `ddb-maps-initiative-order-2026-frame.png` (barra strumenti, pannello, NEXT rosso)                                                                                                      | 1440 × 900 |
| Tavolo                   | `table-combat-dark-1440-ddb.png`                                    | `ddb-maps-initiative-portrait-strip-frame.png` (vista giocatore: ritratti in fila, strumento attivo rosso); `ddb-maps-tokens-nameplates-2026.png` (pedine e targhette)                  | 1440 × 900 |
| Tavolo                   | `table-combat-dark-390-ddb.png`, `table-combat-dm-dark-390-ddb.png` | nessun riferimento per il telefono (vedi sotto); per i materiali `ddb-maps-tokens-nameplates-2026.png`                                                                                  | 390 × 844  |
| Tavolo in esplorazione   | `table-explore-dark-1440-ddb.png`                                   | `ddb-maps-scene-prep-2026-frame.png` (Maps fuori dal combattimento: mappa, strumenti, spilli con il nome); `ddb-maps-tokens-ac-conditions-2026.png` (spillo «A2: Ocean Bay», targhette) | 1440 × 900 |
| Tavolo in esplorazione   | `table-explore-dark-390-ddb.png`                                    | nessun riferimento per il telefono (Maps non ha il telefono); per i materiali `ddb-maps-tokens-ac-conditions-2026.png` (spilli e targhette)                                             | 390 × 844  |
| Scheda · Magie           | `sheet-spells-dark-1440-ddb.png`                                    | `ddb-sheet-desktop-live-presto-spells-1440x900.png` (scheda SPELLS, tema chiaro blu della demo: si confrontano disposizione e misure, non i colori)                                     | 1440 × 900 |
| Scheda · Magie           | `sheet-spells-dark-390-ddb.png`                                     | `ddb-sheet-mobile-live-presto-spells-390x844.png`                                                                                                                                       | 390 × 844  |
| Scheda · Inventario      | `sheet-inventory-dark-1440-ddb.png`                                 | `ddb-sheet-desktop-underdark-inventory-2025-frame.png`; `ddb-sheet-desktop-underdark-party-inventory-2025-frame.png` (da vicino)                                                        | 1440 × 900 |
| Finestra dell'iniziativa | `dialog-initiative-dark-1440-ddb.png`                               | `ddb-maps-combat-encounter-list-2024-frame.png` (righe dei combattenti, START COMBAT); `ddb-maps-conditions-modal-2026-frame.png` (la finestra)                                         | 1440 × 900 |
| Menu della pedina        | `token-menu-dark-1440-ddb.png`                                      | `ddb-maps-token-menu-2026-frame.png`; `ddb-maps-token-hp-panel-2026-frame.png`                                                                                                          | 1440 × 900 |

La parte bassa della scheda Magie («Incantesimi dagli oggetti», «Focus e componenti»), che la
schermata non mostra, è in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-ddb/fix3/spells-lower-1440.png`
(da confrontare con `ddb-sheet-desktop-live-presto-spells-1440x900.png`).

## Differenze dichiarate

- **Maps sul telefono non esiste.** D&D Beyond Maps non ha un'interfaccia per il telefono
  (facts, «Gaps»). Sul telefono il Tavolo tiene la disposizione di oggi (mappa in alto, barra
  delle azioni in tre righe, pannello sotto, barra delle schede in fondo) e prende solo i
  materiali di Maps: fondi ardesia, strumento attivo rosso, pedine con anello e targhetta,
  «Termina turno» rosso.
- **La colonna del gruppo e la barra delle azioni non esistono in D&D Beyond.** Sono funzioni
  nostre (dalla scelta BG3): restano, vestite con i materiali di Maps (riquadri scuri
  arrotondati, ritratti rotondi con l'anello, targhetta del nome).
- **L'ordine dei turni** in Maps è una colonna a sinistra (DM) o una fila di ritratti (giocatore).
  Da noi resta la fila in alto al centro (la struttura non cambia): le sue caselle prendono
  l'aspetto delle righe «Initiative Order».
- **Titoli:** «Majesty» è un carattere proprietario di D&D Beyond. Usiamo **Alegreya** molto
  nero (800), già nel repository e con licenza OFL: ha grazie a cuneo e un nero pesante simili.
  `facts.md` indicava come prima scelta **Fraunces** (OFL): sarebbe un po' più vicino, ma non è
  nel repository e scaricarlo richiede il tuo permesso; se lo vuoi, lo aggiungo in
  `assets/fonts/fraunces/` con la sua licenza.
- **Maiuscole:** D&D Beyond scrive voci, pulsanti, schede e filtri in MAIUSCOLO. Le regole del
  progetto vietano di trasformare il testo; usiamo il maiuscoletto (`font-variant-caps`), con
  la dimensione aumentata perché le lettere abbiano l'altezza delle maiuscole di D&D Beyond. Le
  parole restano scritte come prima (lettori di schermo, nomi accessibili).
- **Colori del testo:** il rosso `#e40712` e il grigio `#75838b` di D&D Beyond, come testo sul
  fondo scuro, non arrivano al minimo di leggibilità (4,5:1). Restano identici per i pieni, le
  linee e le cornici; dove sono testo usiamo il gradino più chiaro della stessa scala (`#ff5a4a`,
  `#f06a6a`, `#8a979f`). Il grigio `#75838b` resta dove il fondo è abbastanza scuro (etichette
  degli scudi, 4,67:1).
- **Misure minime:** i pulsanti di D&D Beyond sono spesso più piccoli di 40 px (Cura e Danno
  sono alti 21 px, i filtri circa 24 px). Da noi restano almeno 40 × 40 px, quindi la fascia
  delle caratteristiche è più alta di quella di D&D Beyond e gli scudi un po' più slanciati.
- **Cornici disegnate da noi:** le forme (scudo con angoli incavati, esagono, scudo della CA,
  angoli smussati) sono poligoni CSS scritti qui con le proporzioni misurate; i fregi delle
  cornici originali (lati ondulati, ornamenti) non sono copiati.
- **Comandi della scheda sul telefono:** D&D Beyond ha un solo pulsante rosso accanto al
  nome. Da noi i comandi (Riposa, Correggi valori, Avanza di livello, Rivedi scelte, Vai al
  Tavolo; Personaggi, Condividi, Gestisci personaggio) vanno a capo e restano tutti visibili:
  è una regola già decisa (revisione del 01/10, «exposure P2») e non li facciamo scorrere fuori
  dallo schermo. Sono gli stessi pulsanti del computer (16 px, 12 px ai lati) e occupano due righe
  per gruppo, così la striscia rapida e le schede entrano comunque nella prima schermata
  (striscia da ≈ 495 px, schede a ≈ 580 px, misurate il 01/10 dopo il giro di cura).
- **Ordine visivo della scheda:** sul computer INIZIATIVA, CA, DIFESE e CONDIZIONI vengono prima
  di Gioco/Modifica, effetti e preferiti; sul telefono la striscia rapida viene prima delle
  schede. Cambia solo la disposizione (CSS `order`): il testo e i controlli sono gli stessi.
- **Zoom della mappa:** in Maps è una fila orizzontale «− 77 % +»; da noi resta la colonna
  verticale di oggi (cambiarla sposterebbe le misure della mappa che l'app calcola da sola).
- **Barra dei punti ferita:** sul computer non si vede (D&D Beyond non ce l'ha), ma resta per i
  lettori di schermo; sul telefono resta visibile.
- **Avviso «Sessione non avviata» (solo DM):** in Maps non esiste. Durante il combattimento non
  copre più i ritratti dei turni: sul computer scende sotto la fila, sul telefono sta in basso
  sulla mappa, sopra i comandi dello zoom.
- **Magie in righe, non in colonne:** D&D Beyond mette ogni magia in una tabella (NAME · TIME ·
  RANGE · HIT/DC · EFFECT · NOTES) con CAST a sinistra. Da noi ogni magia resta una riga con il
  nome, i dettagli su una riga grigia e le etichette (componenti, stato), e i comandi (LANCIA,
  DETTAGLI, CONFRONTA) a destra: il testo e l'ordine dei controlli non cambiano. Prendiamo
  caratteri, misure, fili punteggiati, colori e il LANCIA pieno.
- **Slot degli incantesimi:** in D&D Beyond si spunta il quadratino quando si **spende** lo slot;
  da noi il quadratino pieno è quello **ancora disponibile** (come nell'app di oggi), e accanto
  restano le parole «3 / 4» e «Spesi: 1». I quadratini sono di 16 px invece di 20.
- **Numeri dell'incantatore:** D&D Beyond ne mostra tre (MODIFIER · SPELL ATTACK · SAVE DC); da noi
  sono sette (anche classe, preparate, trucchetti, libro), nella stessa forma e sulla stessa fila.
- **Riga degli oggetti:** in D&D Beyond la riga è una sola linea e i comandi si aprono nel
  pannello laterale; da noi DETTAGLI, RIPONI/BEVI e ☰ restano visibili (nessun comando nascosto)
  in una loro colonna fissa a destra, larga quanto i comandi più lunghi. Così QTÀ, PESO e CARICHE
  stanno sempre nella stessa colonna, ma il nome ha meno spazio e a volte va su due righe; le
  intestazioni restano ripetute su ogni riga (sono testo dell'app), sempre nella stessa posizione.
  Sul telefono le righe vanno a capo come prima.
- **Menu della pedina in colonna:** il menu 2026 di Maps mette sette azioni in **una riga** e il
  resto in MORE. Il nostro menu ha più comandi (condizioni, scheda, centra, selezione, punti ferita,
  cerca, azioni, aspetto, visione, scheda esterna) e nessuno va nascosto: restano in colonna, con
  la grafica delle azioni di Maps (icona bianca, parola breve in maiuscoletto). Mancano i piccoli
  intagli negli angoli della cornice oro (sono disegno di D&D Beyond).
- **Finestra dell'iniziativa:** Maps la mostra come pannello a sinistra, non come finestra; da noi
  resta la finestra di oggi, con «Sorpreso» e «Tira l'iniziativa» su ogni riga, nell'aspetto delle
  righe del pannello «Combat Encounter».
- **Testo un gradino più piccolo:** con la scala di D&D Beyond il testo normale dell'app passa da
  15 a 14 px e i titoli grandi da 38 a 32 px (i titoli dell'Inizio hanno le loro misure). La
  preferenza «grandezza del testo» continua a ingrandire tutto.
- **Misure lasciate all'app:** questa opzione non tocca alcune misure che appartengono alla
  disposizione dell'app o al marchio. Sono: i margini della mappa (76, 88 e 152 px sul computer,
  120 px sotto sul telefono), i 10 px dentro la barra delle azioni (che resta alta 116 px), i 10 px
  sopra la targa della scena e sopra il pannello del telefono, le parole del glossario nel testo
  (alte 22 px), il marchio «d20 Studio» (20/30 e 22/33, Fase D), l'interlinea delle tendine
  (decisa dal browser) e le caselle di spunta da 20 px dentro la loro etichetta. Restano sotto i
  40 px, come oggi, la pastiglia dei punti ferita nella barra delle azioni (28 px), il filtro
  «Reazioni» (36 px) e i punti di viaggio sulla mappa del DM. Sul telefono la pastiglia dei punti
  ferita tiene i 6 px ai lati dell'app (lì mostra solo «♥ 18/22») e le voci del menu della pedina
  restano alte 44 px, la misura comoda al tocco dell'app (40 sul computer). Il -1 px del tondo dei
  tiri salvezza è voluto: il tondo poggia sul bordo della pillola, così si vede una sola linea.
  Rapporto completo: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/audit/ddb/audit.md`.
- **Pillole più piccole solo nella barra delle azioni del telefono:** AZIONI e BARRA RAPIDA sono
  un gradino di maiuscoletto più piccole (14 px invece di 16), perché accanto ai punti ferita e
  ai segni delle risorse «9 m» resti intero. Tutte le altre pillole (filtri della scheda, pillole
  del pannello del Tavolo, le stesse due sul computer) sono una sola ricetta.
- **Pulsanti tutti uguali:** D&D Beyond usa 12, 14 o 16 px secondo il posto; da noi una sola misura
  (maiuscoletto da 16 px) per tutti i pulsanti, tranne i due da 48 px (il pulsante grande
  dell'Inizio e «Termina turno»). Le maiuscole di D&D Beyond restano un po' più alte delle nostre.
- **Sensi passivi:** in D&D Beyond ogni senso è una pillola con il numero in un cerchio a
  sinistra; da noi il numero sta in un riquadro di 64 × 40 px come gli altri valori della scheda
  («18 m» non entra in un cerchio da 40 px).
- **Targhetta delle zone sulla mappa:** in D&D Beyond è un rettangolo con angoli appena arrotondati;
  da noi è il tratto largo del nome stesso, con angoli vivi (in una mappa SVG il testo non ha uno
  sfondo proprio), quindi il bordo superiore segue di poco le lettere alte. Il rombo è il segno
  rotondo dell'app girato e ritagliato, con il bordo oro disegnato qui.
- **Finestre sul telefono:** i pulsanti del piede riempiono la riga e, se non stanno affiancati,
  vanno uno sotto l'altro: nessuna parola va a capo dentro un pulsante.
- **Fascia illustrata dell'Inizio:** in D&D Beyond va da bordo a bordo; sul computer da noi è larga
  quanto il contenuto, con i margini delle altre pagine (sul telefono va da bordo a bordo).
- **Linea della linguetta aperta:** una sola linguetta in tutta l'app (carattere condensato,
  48 px, 12 × 8 px), ma la linea sotto quella aperta ha il colore del posto, come in D&D Beyond:
  il rosso del sito (`#e40712`) sull'Inizio e nella campagna, il colore del tema del personaggio
  («DDB Red», `#c53131`) nella scheda. Cambiando tema, cambierebbe solo nella scheda.
- **Anello di messa a fuoco:** D&D Beyond usa un alone bianco semitrasparente di 2 px; noi
  teniamo l'anello bianco di 3 px del progetto, ben visibile.
- **Marchio:** il d20 e la scritta «d20 Studio» restano quelli di oggi (oro e grazie): il marchio
  si decide nella Fase D.
- **Illustrazioni:** D&D Beyond usa illustrazioni sue; noi usiamo due tue tavole già approvate
  (tono ambra, a lume di candela), scurite come fa D&D Beyond. Il risultato è più caldo
  dell'originale, che ha colori più vari.
- **Tema chiaro:** non cambia (il primo giro è solo scuro). Anche contrasto alto, palette per il
  daltonismo, carattere leggibile e movimento ridotto restano più forti di questa opzione.

## Coerenza (I-250)

Giro di cura del 01/10/2026, dopo la terza verifica indipendente: ogni tipo di componente ha
**una sola ricetta** (altezza, margini interni, carattere, raggio), in ogni superficie. Strumenti:
la verifica delle misure (`changes/visual-01/audit/`, 20 schermate a 1440 e 390), il campionario
dei componenti (`directions/specimen.html?direction=ddb`) e, perché la verifica guarda solo la
parte visibile, una prova a parte sull'Inizio intero (1440 e 390, anche sotto la prima
schermata).

| Misura (20 schermate, tema scuro)        | Prima del giro  | Dopo il giro    |
| ---------------------------------------- | --------------- | --------------- |
| Valori di spaziatura (fuori scala)       | 31 (14)         | 29 (11)         |
| Altezze dei comandi                      | 22              | 20              |
| Stili di testo                           | 81              | 72              |
| Grandezze · pesi · interlinee            | 11 · 4 · 15     | 11 · 4 · 15     |
| Raggi · spessori · ombre                 | 5 · 3 · 8       | 5 · 3 · 9       |
| Pulsanti: varianti (tipi con più di una) | 84 (17)         | 75 (14)         |
| Campi: varianti (tipi con più di una)    | 5 (2)           | 3 (1)           |
| Linguette · etichette: varianti          | 11 · 10         | 10 · 9          |
| Pulsanti con il riempimento del browser  | 0               | 0               |
| Contrasto AA: errori · incerti, su testi | 1 · 153 su 1243 | 0 · 151 su 1244 |

L'ombra in più è la riga sottile sotto le linguette della scheda, ora disegnata dentro la fila
(così la fila e «Tutte» sono alte 48 px come le linguette). I testi «incerti» sono quasi tutti
sotto la prima schermata della scheda intera, sopra l'illustrazione di fondo, dove la verifica
non ha pixel da misurare; gli stessi testi sono misurati, e passano, nelle altre schermate.

Che cosa è cambiato:

- **Linguette:** ogni fila (scheda, Inizio, campagna) è la stessa: 48 px, 12 px sopra e sotto,
  8 px ai lati, le linguette attaccate; l'anello di messa a fuoco non tocca più le lettere.
- **Pillole:** le pillole del pannello del Tavolo e le pagine della barra delle azioni hanno la
  ricetta dei filtri della scheda (40 px, 4 × 8 px, maiuscoletto condensato da 16 px).
- **Barra delle azioni:** ogni casella è alta 46 px, con le parole sulla stessa riga in tutte le
  caselle (prima 46 e 44); MOSSE è il pulsante normale (12 px ai lati, 8 dopo l'icona).
- **Campi:** alti 40 px come i pulsanti (prima 44); i numeri da scrivere (d20, punti ferita)
  16 px in tondo normale; la ricerca dell'inventario ha la lente come quella delle magie.
- **Etichette** (V, S, M, stato, rarità, equipaggiato): tutte alte 22 px sul fondo scuro delle
  etichette (prima 22 e 26, e V e S senza fondo sopra l'illustrazione).
- **Inizio:** ogni riquadro ha 24 px di margine interno (16 sul telefono; prima anche 22 e 18),
  il titolo nel carattere con le grazie 22/28 (prima 22 e 26) e la stessa distanza dal successivo
  (24 px, 16 sul telefono; prima sul telefono 0, 16, 20 e 28); le righe delle liste a 12 px;
  «Tutte le discussioni» è un collegamento rosso a filo del bordo come «Tutte le campagne» e
  «Tutti gli annunci»; «Novità precedenti» è un'apertura come le altre (13/18).
- **Scheda:** tutti i titoli dei pannelli dentro le linguette (Tiri, Movimento, Reazioni, Chi può
  modificare la scheda, Concentrazione…) sono le maiuscolette rosse di AZIONI; il nome resta 24/32
  anche sul telefono; un solo spazio tra le lettere per le etichette in maiuscoletto.
- **Tavolo:** sul telefono l'intestazione torna su **una riga** (64 px; prima andava su due righe,
  104 px), «9 m» è intero nella prima riga della barra delle azioni, i comandi a icona sono
  40 × 40 con il glifo da 21 px come sul computer; i ritratti del gruppo stanno sulla scala di 2 px
  (barra dei punti ferita da 4 px); i simboli dei punti di viaggio del DM hanno un alone scuro e
  si leggono anche sopra le pietre chiare.
- **Intestazioni:** 32 px ai lati sul computer in tutte e due (prima 30 e 32), 24 px tra il marchio
  e le voci.

Restano diverse, di proposito, solo le misure legate alla larghezza o al posto: le voci del menu
in alto (64 px sul computer, 44 sul telefono), le pagine della barra delle azioni sul telefono, le
voci del menu della pedina sul telefono (44 px), le caselle dell'ordine dei turni (80 e 56 px), la
barra delle linguette del Tavolo (colonna di icone sul computer, barra in fondo sul telefono) e il
marchio (Fase D). Rapporti: prima
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-ddb/polish-w4/audit-before/audit.md`,
dopo `…/visual-01/probe-ddb/polish-r2/audit-before/audit.md` (la copia del rapporto di fine giro,
prima del secondo); prove e campionario in `…/visual-01/probe-ddb/polish-w4/`.

### Secondo giro (01/10/2026)

Dopo la quarta verifica indipendente: sette punti aperti (le coppie per il confronto ferme a una
versione vecchia, quattro difetti sotto la prima schermata o sul telefono, tre dettagli) e un
altro passaggio sul campionario dei componenti e sulla verifica delle misure.

| Misura (20 schermate, tema scuro)        | Prima del giro  | Dopo il giro    |
| ---------------------------------------- | --------------- | --------------- |
| Valori di spaziatura (fuori scala)       | 29 (11)         | 29 (11)         |
| Altezze dei comandi                      | 20              | 19              |
| Stili di testo                           | 72              | 72              |
| Grandezze · pesi · interlinee            | 11 · 4 · 15     | 11 · 4 · 15     |
| Raggi · spessori · ombre                 | 5 · 3 · 9       | 5 · 3 · 9       |
| Pulsanti: varianti (tipi con più di una) | 75 (14)         | 74 (13)         |
| Campi · tendine: varianti                | 3 · 1           | 3 · 1           |
| Linguette · etichette: varianti          | 10 · 9          | 10 · 7          |
| Pulsanti con il riempimento del browser  | 0               | 0               |
| Contrasto AA: errori · incerti, su testi | 0 · 151 su 1244 | 0 · 151 su 1244 |

La verifica guarda solo ciò che sta nelle 20 schermate; quasi tutto ciò che questo giro ha
corretto sta più in basso (il pannello del Tavolo, l'Inizio intero, l'inventario, il telefono
scorso). Quelle parti sono state misurate a parte nella pagina vera, prima e dopo:

| Dove                                                      | Prima                                                                                        | Dopo                                                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Tavolo, pannello: quantità tra CURA e DANNO               | campo del browser (1 × 2 px, bordo incassato grigio, angoli vivi), CURA/DANNO bianchi        | il campo e i pulsanti della scheda: fondo `#10161a`, bordo grigio, 4 px, CURA verde e DANNO rosso |
| Inizio a 1440: spazio sopra le Novità                     | 217 px vuoti sotto «Prossimo appuntamento»                                                   | 24 px, come fra tutti gli altri riquadri                                                          |
| Inizio sul telefono: da «Primi passi» alle Novità         | 40 px                                                                                        | 16 px, come fra tutti gli altri riquadri                                                          |
| Tavolo sul telefono, esplorazione                         | targa alta 54 px; la riga della scala tagliata a metà sopra la barra (14 px visibili)        | targa alta 82 px come in combattimento; la riga della scala tutta sotto la barra, come oggi       |
| Tendine (inventario, scorta del gruppo, pannello)         | 40 o 43 px, margini 10 × 12 o 4 × 8                                                          | tutte 40 px, le parole a 12 px dal bordo come nei campi                                           |
| Anello di messa a fuoco, barra delle azioni sul telefono  | Annulla perdeva 2 px a destra sotto il fondo del vicino                                      | intero su tutti i lati, su ogni comando                                                           |
| Barra delle azioni a 1440 e 1366: seconda fila di caselle | tagliata di 4 px in basso (due file da 46 px in un riquadro di 98)                           | intera: due file da 44 px con i 6 px dell'app riempiono il riquadro                               |
| Scheda, riga Gioco / Modifica / Dadi / PE con «Annulla»   | la riga dei PE schiacciata sotto i vicini (166 px di altezza), «Gestisci PE» sopra «Annulla» | i PE scendono in una seconda riga, allineati a destra; nulla si sovrappone                        |
| Scheda, tiri salvezza con Benedizione attiva              | «+1d4 Benedizione» dentro ogni pillola copriva nome e bonus                                  | le pillole restano pulite; l'effetto è scritto sotto («Effetti attivi sui TS») come in D&D Beyond |

Che cosa è cambiato:

- **Etichette:** una sola etichetta in tutta l'app: 22 px, maiuscoletto condensato grassetto da
  14 px, 6 px ai lati, angoli di 3 px, sul fondo scuro. Ora la seguono anche i costi delle azioni
  della scheda (AZIONE, AZIONE BONUS…), «Solo campagna», «Chiedi» delle reazioni, «Attiva» negli
  elenchi, la rarità del contenitore (Borsa conservante) e «Nuova» dell'Inizio.
- **Tendine:** tutte alte 40 px, con le parole a 12 px dal bordo come nei campi di testo e la
  freccia a 4 px dal bordo; la tendina dei dadi nella barra delle azioni resta larga come prima,
  così sul telefono «9 m» resta intero. La tendina della striscia di prova («Direzione») non
  cambia, perché la striscia resti alta uguale in tutte le opzioni.
- **Ricerca:** i due campi di ricerca (magie e inventario) hanno la stessa interlinea di 24 px.
- **Punti ferita:** il gruppo CURA, quantità, DANNO è uno solo nella scheda, nel pannello del
  Tavolo e nella finestra del menu della pedina.
- **Inizio:** sul computer «Il tuo personaggio», «Dove eravamo rimasti» e «Prossimo appuntamento»
  sono una fila di tre riquadri alti uguali (l'illustrazione del personaggio cresce con il suo
  riquadro); le Novità partono 24 px sotto, alla pari con «Le tue campagne». «Aggiungi al
  calendario» sta sulla stessa riga di «Apri sessioni» (prima 4 px più in basso).
- **Scheda:** «Dotazione iniziale» ha il titolo rosso in maiuscoletto come gli altri pannelli
  dell'inventario.
- **Tavolo:** sul telefono la targa della scena ha sempre due righe, il nome con lo stato e sotto
  i comandi, dentro e fuori dal combattimento; il comando con l'anello di messa a fuoco passa
  sopra il vicino; la X del menu della pedina ha il glifo da 21 px come gli altri pulsanti a icona.
- **Barra delle azioni:** ogni casella è alta 44 px (prima 46, vedi «Coerenza»: due file da 46
  non entravano nel riquadro e la seconda era tagliata); il gruppo del filtro delle reazioni è alto
  come una casella.
- **Scheda, sotto la prima schermata:** con «Annulla ultima modifica» (o il suggerimento della
  modalità Modifica) la riga dei PE va a capo invece di schiacciarsi; con un effetto sui tiri
  salvezza (Benedizione, Anatema) l'etichetta dell'effetto non entra più nelle pillole: resta la
  riga «Effetti attivi sui TS» sotto le pillole, e il nome del bonus la legge.

Restano due tipi di campo, di proposito: i campi di testo (14 px, 12 px ai lati) e le caselle dei
numeri da scrivere (d20, quantità dei punti ferita: 16 px, centrati, 8 px ai lati, perché sono
strette). Le altre differenze che la verifica conta ancora sono legate alla larghezza o al posto,
come sopra. Garanzie controllate dopo l'ultima modifica: intestazione del Tavolo su una riga a 390
(64 px), Termina turno, Annulla ultima modifica e Annulla preparazione visibili a 390, nessuno scorrimento
laterale a 390, barra delle azioni alta 116 px a 1440, «Entra al Tavolo» entro i primi 844 px a
390 (finisce a 693), comandi di 40 px (sotto i 40 solo quelli che lo sono già oggi, vedi sopra).
Copie dei percorsi automatici dell'app con questa opzione (`?direction=ddb`, porta 8881): passano
p6 (mappa sul telefono), b61 (struttura del Tavolo; resta solo l'avviso già presente oggi sul
suggerimento del DM a 390), b61 e b62 (correzioni di revisione), b62 (architettura), Inizio,
scheda, inventario, magie, danni, punti ferita, bottino, menu della pedina, etichette delle
condizioni. Le preferenze non passano il controllo «testo al 125 %» perché il percorso passa al
tema chiaro, dove questa opzione non si applica (le misure tornano quelle di oggi); il percorso
delle integrazioni non parte nemmeno con «Attuale».
Rapporti: prima `…/visual-01/probe-ddb/polish-r2/audit-before/audit.md`, dopo
`…/visual-01/audit/ddb/audit.md`; prove, campionario e schermate intere in
`…/visual-01/probe-ddb/polish-r2/`.

### Terzo giro (01/10/2026)

Dopo la quinta verifica indipendente: un difetto grave (i preferiti tagliati), uno medio
(l'Inizio sui tablet), due dettagli (la riga dei PE, le linguette dell'Inizio) e un altro
passaggio sul campionario dei componenti, sulla verifica delle misure e sulle parti della scheda
sotto la prima schermata.

| Misura (20 schermate, tema scuro)        | Prima del giro  | Dopo il giro    |
| ---------------------------------------- | --------------- | --------------- |
| Valori di spaziatura (fuori scala)       | 29 (11)         | 28 (11)         |
| Spaziature sul passo di 2 px             | 99 %            | 100 %           |
| Altezze dei comandi                      | 19              | 19              |
| Stili di testo                           | 72              | 72              |
| Grandezze · pesi · interlinee            | 11 · 4 · 15     | 11 · 4 · 15     |
| Raggi · spessori · ombre                 | 5 · 3 · 9       | 5 · 3 · 9       |
| Pulsanti: varianti (tipi con più di una) | 74 (13)         | 74 (13)         |
| Campi · tendine: varianti                | 3 · 1           | 3 · 1           |
| Linguette · etichette: varianti          | 10 · 7          | 10 · 6          |
| Pulsanti con il riempimento del browser  | 0               | 0               |
| Contrasto AA: errori · incerti, su testi | 0 · 151 su 1244 | 0 · 151 su 1244 |

Il valore di spaziatura che manca è il 18 px sotto due titoli della scheda (Reazioni, Modifiche
del DM); la variante di etichetta in meno è l'avviso «Sessione non avviata», ora alto uguale (98
px) sul computer e sul telefono. Quasi tutto il resto di questo giro sta dove la
verifica non guarda (i preferiti, che l'esempio non ha; i tablet; le altre linguette della
scheda; le condizioni, che l'esempio non ha), ed è stato misurato a parte nella pagina vera:

| Dove                                                      | Prima                                                                                                | Dopo                                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Scheda a 1440, 1366 e 1280, con 1–4 preferiti             | i preferiti stretti accanto a «Effetti»: «Furtiv / +2», «Acroba / +2», «Fu» (tagliati)               | «Effetti» e «Preferiti» su due righe intere; ogni preferito alto 40 px su una riga («Furtività +2») |
| Inizio a 768 e 1024 px                                    | «Il tuo personaggio» attaccato a «Le tue campagne» (0 px); sopra 20 e 20 px; riquadri alti 294 e 232 | 24 px fra tutti i riquadri, come sul computer; i due riquadri alti uguali (294 px)                  |
| Scheda a 1440, riga dei PE                                | «Livello 3 · 900 / 2700 PE (dal» e sotto «livello)»                                                  | «Livello 3 · 900 / 2700 PE» e sotto, piccolo, «(dal livello)»; nessuna frase spezzata               |
| Scheda a 1280, riga dei PE                                | il testo in tre righe in 93 px                                                                       | la riga dei PE va sotto Gioco/Modifica e Dadi, come quando c'è «Annulla»                            |
| Inizio, linguette Novità / Guide / Supporto               | carattere Roboto (le altre linguette Roboto Condensed)                                               | Roboto Condensed come la scheda e la barra delle azioni                                             |
| «Cosciente» (stato vitale)                                | quadrato nella scheda, tondo nel pannello del Tavolo                                                 | angoli di 4 px ovunque                                                                              |
| Condizioni attive (Avvelenato, Prono, «(C) Benedizione»…) | alte 42 px; in alcune le parole in alto; la × della concentrazione con il riempimento del browser    | alte 40 px, parole centrate, fondo scuro dei campi con il bordo grigio; la × un quadrato di 32 px   |
| Titoli dei pannelli nelle linguette della scheda          | 8, 18, 21,6 o 24 px sopra il contenuto; «Reputazione» (26 px), «Forme» e «Homebrew» (16 px) bianchi  | tutti in maiuscoletto rosso, 16 px sopra il contenuto; «Homebrew» sulla riga del suo comando        |
| Reputazione (Fidato, Neutrale…)                           | pillole tonde da 26 px                                                                               | riquadri da 28 px con angoli di 4 px, come «Cosciente»                                              |
| Avviso «Sessione non avviata» sul telefono (DM)           | «Avvia ora» dentro la seconda riga del testo, «Non ora» su una terza                                 | il testo su due righe, i due comandi insieme sulla riga sotto                                       |
| Parole del glossario («TS», «azione bonus»)               | 1 px ai lati                                                                                         | la sottolineatura punteggiata a filo della parola                                                   |

Che cosa è cambiato, in breve:

- **Preferiti:** finché la striscia è vuota, il suggerimento resta accanto a «Effetti»; appena
  c'è un preferito, «Effetti» e «Preferiti» prendono una riga intera ciascuno e i preferiti vanno a
  capo. Ogni preferito ha la ricetta dei campi (fondo scuro, bordo grigio, 40 px, 12 px ai lati).
- **Inizio sui tablet:** la stessa distanza di 24 px fra tutti i riquadri e i due riquadri della
  fila alti uguali, come sul computer.
- **PE:** due righe intere sempre uguali; se la riga non le contiene, i PE scendono sotto.
- **Una sola linguetta:** stesso carattere, misure e spaziature sull'Inizio e nella scheda; cambia
  solo il colore della linea, di proposito (vedi «Differenze dichiarate»).
- **Condizioni:** una sola forma nella scheda, nel pannello del Tavolo e nella finestra dei punti
  ferita.
- **Titoli dei pannelli:** stessa forma e stessa distanza anche nelle linguette Capacità, Storia ed
  Extra, che la verifica non fotografa.

Garanzie controllate dopo l'ultima modifica: intestazione del Tavolo su una riga a 390 (64 px),
Termina turno (118 × 40), Annulla ultima modifica e Annulla preparazione (40 × 40) visibili a 390,
nessuno scorrimento laterale a 390 (Inizio, scheda, magie, inventario, Tavolo in esplorazione e in
combattimento, giocatore e DM), barra delle azioni alta 116 px a 1440 (giocatore e DM), «Entra al
Tavolo» fra 645 e 693 px a 390, comandi di 40 px (sotto i 40 solo quelli che lo sono già oggi:
parole del glossario, pastiglia dei punti ferita, filtro «Reazioni»), anello di messa a fuoco di
3 px anche sulle condizioni. Rapporti: prima
`…/visual-01/probe-ddb/polish-r3/audit-before/audit.md`, dopo `…/visual-01/audit/ddb/audit.md`;
prove, campionario prima e dopo, misure e ritagli in `…/visual-01/probe-ddb/polish-r3/`.

### Quarto giro (01/10/2026)

Dopo la sesta verifica indipendente: quattro dettagli (i preferiti alti 42 px, «Cosciente»
diverso nella finestra dei punti ferita, la × della concentrazione da 32 px, 8 px sotto due
titoli delle Magie) e un altro passaggio sul campionario, sulla verifica delle misure e sulle
parti sotto la prima schermata (scheda intera, Inizio scorso), che ha trovato altri sette
dettagli.

| Misura (20 schermate, tema scuro)        | Prima del giro  | Dopo il giro    |
| ---------------------------------------- | --------------- | --------------- |
| Valori di spaziatura (fuori scala)       | 28 (11)         | 29 (11)         |
| Spaziature sul passo di 2 px             | 100 %           | 100 %           |
| Altezze dei comandi                      | 19              | 17              |
| Stili di testo                           | 72              | 72              |
| Grandezze · pesi · interlinee            | 11 · 4 · 15     | 11 · 4 · 15     |
| Raggi · spessori · ombre                 | 5 · 3 · 9       | 5 · 3 · 9       |
| Colori: testo · fondo · bordo            | 15 · 33 · 25    | 15 · 32 · 25    |
| Pulsanti: varianti (tipi con più di una) | 74 (13)         | 72 (13)         |
| Campi · tendine: varianti                | 3 · 1           | 3 · 1           |
| Linguette · etichette: varianti          | 10 · 6          | 10 · 6          |
| Pulsanti con il riempimento del browser  | 0               | 0               |
| Contrasto AA: errori · incerti, su testi | 0 · 151 su 1244 | 0 · 151 su 1244 |

Le due altezze in meno sono la pastiglia dei punti ferita della barra delle azioni (28 px sul
computer, ora 40 come sul telefono) e il ritratto di Doran nella colonna del gruppo (70 px nella
vista del giocatore, ora 78 come gli altri); il colore di fondo in meno è il rosso chiaro
dell'interruttore «Il DM può modificare questa scheda». Il valore di spaziatura in più è il
−6 px con cui un collegamento alto 40 px sporge sopra e sotto una riga alta 28 (vedi sotto): è
il rovescio del passo di 6 px, e toglie 6 px di vuoto invece di aggiungerne. Il resto di questo
giro sta dove la verifica non guarda, ed è stato misurato a parte nella pagina vera:

| Dove                                                            | Prima                                                                                                           | Dopo                                                                                       |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Scheda, preferiti (con 1–2 preferiti)                           | ogni preferito alto 42 px (un bordo di 1 px intorno al pulsante di 40), parole 14/20                            | 40 px in tutto, come gli interruttori degli effetti sopra; parole 13/18 come loro          |
| Scheda, preferiti in modalità Modifica                          | l'anello di messa a fuoco del preferito tagliato dal riquadro                                                   | l'anello di 3 px intero (fotografato con la tastiera)                                      |
| Finestra «Condizioni e stato» (Danni, cure e condizioni)        | «Cosciente» alto 30 px, peso 600, 13/19,5, 11 px ai lati; grigio nella scheda                                   | 28 px, 700, 13/18, 12 px ai lati, bianco: uguale nella scheda, nel Tavolo e nella finestra |
| Condizione «(C) Benedizione», la ×                              | un quadrato di 32 px a 4 px dal bordo                                                                           | un quadrato di 40 px alla fine della condizione; al passaggio il bordo resta disegnato     |
| Magie, «Incantesimi dagli oggetti» e «Focus e componenti»       | 8 px sotto il titolo                                                                                            | 16 px, come sotto ogni altro titolo dei pannelli                                           |
| Scheda, ABILITÀ (anche nella prima schermata)                   | sigla e nome in alto nella riga, 8 px sopra stella, pallino e bonus                                             | sulla riga di mezzo, alla pari con stella, pallino e bonus                                 |
| Magie, colonna di LANCIA                                        | «Lancia» del trucchetto largo 67 px, «Lancia ▾» 83: la colonna sfalsata di 16 px                                | una sola larghezza (88 px): i LANCIA uno sotto l'altro                                     |
| Interruttori (offline, ispirazione eroica, regole della scheda) | tre aspetti «acceso» (rosso con pallino bianco, rosso chiaro con pallino scuro) e due misure (40 × 22, 44 × 26) | uno solo: 40 × 22, rosso con il pallino bianco (nella scheda il rosso del tema)            |
| Inizio, riquadri con un collegamento nel titolo                 | titolo 6 px più in basso e 22 px sopra il contenuto (la riga alta 40 per il collegamento)                       | ogni titolo a 24 px dal bordo e 16 px sopra il contenuto, con o senza collegamento         |
| Scheda, «Azioni in combattimento» e «Reazioni di tutti»         | i collegamenti che vanno a capo partono 6 px dentro il bordo del testo                                          | partono sul bordo del testo, come l'etichetta                                              |
| Tavolo, colonna del gruppo (vista del giocatore)                | Doran 70 px (8 px meno degli altri: il giocatore non vede i suoi punti ferita); 42 px sul telefono              | tutti 78 px (50 sul telefono): la riga della barra resta anche vuota                       |

Che cosa è cambiato, in breve:

- **Preferiti:** il bordo grigio è disegnato dentro il preferito, non intorno: tutto il preferito
  è alto 40 px; le parole hanno la misura degli interruttori della stessa striscia.
- **Uno stato vitale e una condizione:** «Cosciente» è lo stesso riquadro ovunque, la × della
  concentrazione è un comando da 40 px come gli altri.
- **Interruttori:** uno solo in tutta l'app, come i pulsanti principali: rosso fuori dalla
  scheda, rosso del tema dentro.
- **Allineamenti:** le abilità sulla riga di mezzo, i LANCIA in colonna, i titoli dei riquadri
  dell'Inizio alla stessa altezza, i collegamenti a capo sul bordo del testo.
- **Tavolo:** la pastiglia dei punti ferita alta 40 px anche sul computer; ogni ritratto del
  gruppo alto uguale.

Restano come prima, di proposito: il marchio (Fase D, «Iowan Old Style» nell'intestazione del
Tavolo), i due tipi di campo, le pagine della barra delle azioni un gradino più piccole sul
telefono, e le misure legate alla larghezza o al posto elencate in «Coerenza (I-250)». Il filtro
«Reazioni» (36 × 40 dentro un gruppo da 44) e le parole del glossario restano sotto i 40 px come
oggi. Garanzie controllate dopo l'ultima modifica: intestazione del Tavolo su una riga a 390
(64 px), Termina turno (118 × 40), Annulla ultima modifica e Annulla preparazione (40 × 40)
visibili a 390, nessuno scorrimento laterale a 390 (Inizio, scheda, magie, inventario, Tavolo in
esplorazione e in combattimento, giocatore e DM), barra delle azioni alta 116 px a 1440 (giocatore
e DM), «Entra al Tavolo» fra 645 e 693 px a 390, i test della direzione (7 su 7) e Prettier.
Rapporti: prima `…/visual-01/probe-ddb/polish-r4/audit-before/audit.md`, dopo
`…/visual-01/audit/ddb/audit.md` (copia in `…/polish-r4/audit-after/`); prove, campionario prima e
dopo, misure e ritagli in `…/visual-01/probe-ddb/polish-r4/`.

## Riferimenti aggiunti il 01/10/2026

Per i nuovi stati mancavano due viste; sono state aggiunte nella cartella dei riferimenti (fuori dal
repository, solo da guardare) con le loro righe in `manifest.md`:

- **#58** `ddb-sheet-desktop-live-presto-spells-1440x900.png` e **#59**
  `ddb-sheet-mobile-live-presto-spells-390x844.png`: la scheda pubblica della demo «Presto» sulla
  scheda SPELLS, fotografata da noi (cookie non essenziali rifiutati, nessun accesso; il riquadro
  pubblicitario «Create Account to Claim Character» nascosto nella nostra vista). Le misure (13 px
  i gruppi, 11 px le intestazioni, 14 px i nomi, righe da 40 px, CAST 30 × 21) sono state lette
  dalla pagina.
- **#60** `ddb-maps-combat-encounter-list-2024-frame.png`: un fotogramma dell'animazione ufficiale
  del pannello «Combat Encounter», fotografato com'era mostrato nella pagina del post (il file
  animato non è stato scaricato).

## Licenze e attribuzioni

### Illustrazioni (`assets/`)

| File                            | Byte   | Dimensioni | sha256                                                             | Origine                                                                                                                                                                                                                                                                                                                                  | Licenza                                                                                         | Modifiche                                         |
| ------------------------------- | ------ | ---------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `assets/campaign-backdrop.webp` | 98 712 | 1672 × 941 | `025a6ad7d9ae94e705dd470f1ab3361634436a0ad8ed4bc8c8c226ae90b20e07` | Copia identica di `~/Workspace/Codex/d20-studio-visual-assets/candidates/plates/campaign-backdrop.webp` (riga 29 di `candidates/MANIFEST.md`; a sua volta `~/Workspace/d20-folio/public/assets/backgrounds/campaign-backdrop.webp`, d20 Folio main 5b7f2a8b; originale `masters/d20-folio/images_d20folio/PROMPT_16.png`, C2PA presente) | Illustrazione generata dal proprietario (gpt-image via ChatGPT), SAFE; nessuna licenza di terzi | Nessuna: copia byte per byte. Scurita solo in CSS |
| `assets/creation-scene.webp`    | 96 948 | 1672 × 941 | `b8e0f8020bc0628b9360bbca292ee0ba347526d3be66f919281a140099907797` | Copia identica di `~/Workspace/Codex/d20-studio-visual-assets/candidates/plates/creation-scene.webp` (riga 33 di `candidates/MANIFEST.md`; a sua volta `~/Workspace/d20-folio/public/assets/backgrounds/creation-scene.webp`; originale `masters/d20-folio/images_d20folio/PROMPT_22.png`, C2PA presente)                                | Illustrazione generata dal proprietario (gpt-image via ChatGPT), SAFE; nessuna licenza di terzi | Nessuna: copia byte per byte. Scurita solo in CSS |

L'Inizio usa anche i ritratti di esempio condivisi (`design/blueprint/assets/portraits/sample/`,
righe in `assets/PROVENANCE.json`): nessun file nuovo.

### Caratteri

Nessun carattere nuovo. `direction.css` dichiara solo file già nel repository (Fontsource 5.3.0,
licenza SIL Open Font License 1.1, `OFL.txt` in ogni cartella; righe in
`directions/README.md`):

- **Roboto** — `assets/fonts/roboto/`: «Copyright 2011 The Roboto Project Authors», OFL 1.1.
- **Roboto Condensed** — `assets/fonts/roboto-condensed/`: «Copyright 2011 The Roboto Project
  Authors», OFL 1.1.
- **Alegreya** — `assets/fonts/alegreya/`: «Copyright 2011 The Alegreya Project Authors»
  (Huerta Tipográfica), OFL 1.1.

### Icone (`icons.mjs`)

Glifi di **Lucide 1.16.0** (<https://lucide.dev>, <https://github.com/lucide-icons/lucide>),
letti dai dati delle icone del pacchetto `lucide-react@1.16.0` già installato in
`~/Workspace/d20-folio/node_modules/.pnpm/lucide-react@1.16.0_react@19.2.6/` e copiati senza
modifiche (solo il contenitore `<svg class="icon" … aria-hidden="true">` è nostro).

- **Perché Lucide:** le icone di D&D Beyond e di Maps sono glifi bianchi a solo tratto, di circa
  2 px con le estremità arrotondate su una griglia di 24 px. Lucide ha esattamente questa voce
  (tratto 2 px, estremità e angoli arrotondati, 24 px) e le stesse forme della barra di Maps
  (freccia del puntatore, matita, righello, nuvola della nebbia, forme). Tabler ha la stessa
  griglia e lo stesso tratto, ma forme più geometriche e squadrate; Lucide inoltre è già sul
  computer, quindi nessun file è stato scaricato.
- **Licenza:** ISC, «Copyright (c) 2026 Lucide Icons and Contributors» (file `LICENSE` del
  pacchetto, sha256 `b495047bd93a9b06913511076f504daba17d5bbeb3e0650f3bb53a4220329c57`). I glifi
  derivati da Feather (qui `search`, `check`, `clock`, `plus`, `arrow-left`, `x`) sono anche MIT,
  «Copyright (c) 2013-present Cole Bemis».
- **Attribuzione:** «Icone: Lucide (ISC), © Lucide Icons and Contributors; parte derivata da
  Feather (MIT), © Cole Bemis».

| Nome nell'app | Glifo Lucide                                         |     | Nome nell'app | Glifo Lucide                   |
| ------------- | ---------------------------------------------------- | --- | ------------- | ------------------------------ |
| `home`        | `house`                                              |     | `ruler`       | `ruler`                        |
| `person`      | `user`                                               |     | `eye`         | `eye`                          |
| `campaign`    | `folder`                                             |     | `shape`       | `shapes`                       |
| `book`        | `book-open`                                          |     | `fog`         | `cloud`                        |
| `search`      | `search`                                             |     | `light`       | `flame`                        |
| `note`        | `notebook-text`                                      |     | `wall`        | `brick-wall`                   |
| `bell`        | `bell`                                               |     | `flag`        | `flag`                         |
| `settings`    | `settings`                                           |     | `shield`      | `shield`                       |
| `help`        | `circle-question-mark`                               |     | `sword`       | `sword`                        |
| `check`       | `check`                                              |     | `undo`        | `rotate-ccw`                   |
| `map`         | `map`                                                |     | `bag`         | `backpack`                     |
| `play`        | `play`                                               |     | `swords`      | `swords`                       |
| `clock`       | `clock`                                              |     | `panel`       | `panel-right`                  |
| `pen`         | `pencil`                                             |     | `chat`        | `message-square-text`          |
| `plus`        | `plus`                                               |     | `scroll`      | `scroll-text`                  |
| `grid`        | `layout-grid`                                        |     | `cards`       | `layers-2`                     |
| `menu`        | `menu`                                               |     | `close`       | `x`                            |
| `arrow`       | `arrow-left`                                         |     | `dice`        | nessuno: resta il d20 dell'app |
| `move`        | `mouse-pointer-2` (lo strumento «seleziona» di Maps) |     |               |                                |

La freccia «→» del pulsante rosso «Entra al Tavolo» è il glifo Lucide `arrow-right` (ISC; derivato
da Feather, MIT), scritto come maschera in `direction.css` al posto del triangolo «play»: nessun
file nuovo. Allo stesso modo la lente dentro i campi di ricerca delle Magie e dell'Inventario è il
glifo Lucide `search` (ISC; derivato da Feather, MIT), scritto come immagine di sfondo in
`direction.css`.

`dice` tiene il d20 dell'app, disegnato con lo stesso tratto di 2 px: Lucide non ha un d20 e
D&D Beyond tira con un d20. Le icone disegnate a mano dall'app (risorse del turno, «trova
pedina», barra della sessione, menu della pedina) restano le sue.
