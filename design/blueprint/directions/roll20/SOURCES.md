# Opzione 6 · Roll20 — da dove viene ogni scelta

Scelta 1 — Direzione, primo giro (I-248), 01/10/2026. Tema scuro, a 1440 × 900 e 390 × 844, con
ogni misura presa da una sola scala (I-250); secondo giro di rifinitura dopo la verifica
indipendente, vedi «Coerenza (I-250)» e «Secondo giro di rifinitura». Le schermate sono in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round1/roll20/`; i confronti già
montati (nostra schermata a sinistra, Roll20 a destra) in `round1/roll20/_pairs/`. Le immagini di
riferimento sono in `~/Workspace/Codex/d20-studio-visual-assets/references/roll20/`: restano lì,
non entrano nel progetto.

## In tre righe

1. Questa opzione copia Roll20 com'è nel 2025–2026: il tavolo virtuale «Jumpgate» (una colonna nera
   di strumenti incollata al bordo sinistro, la mappa che arriva fino al pannello laterale e al
   bordo in basso, piccoli comandi di vetro scuro che galleggiano sopra, il pannello laterale grigio
   scuro con la linguetta aperta lilla),
   l'ordine dei turni come la finestra «Turn Order» con la riga attiva verde e le azioni come i
   gettoni viola della barra delle macro.
2. La scheda copia la scheda D&D 2024 di Roll20 in versione scura: pagina nera con campi rossi che
   escono dai bordi, pannelli #171717 con un filo bruno-dorato, titoli d'oro in maiuscoletto,
   linguette inclinate per il modo dei tiri, competenze in rosso, la barra verde dei punti ferita.
   Dentro la scheda ci sono solo rosso, oro e grigi, come in Roll20: niente viola.
3. L'Inizio copia le nuove pagine «Grimoire» di Roll20 (Roll20 Characters, Le mie partite): fondo
   quasi nero, schede #1F1F1F con angoli da 8 px, titoli in Nunito nero pieno, il grande pulsante
   viola «▶ Entra al Tavolo». È l'opzione più «software» e meno fantasy: piatta, grigia e viola,
   con icone piene monocromatiche.

## Elemento → prodotto copiato → fonte

Le sigle (T6, S1, H13…) sono le righe di `manifest.md` nella cartella dei riferimenti. «[CSS]» è un
valore letto nel foglio di stile ufficiale di Roll20 (`roll20.net/v2/css/colors.css` e il foglio dei
componenti «Grimoire» `roll20.net/static-fallback/nav-bar/master/assets/main-DLmYOJ5a.css`; estratti
`roll20-code-grimoire-colors-2026-10-01.txt` e `roll20-code-grimoire-components-excerpts-2026-10-01.txt`);
«[O]» un colore campionato dall'immagine; «[D]» la documentazione ufficiale. Le misure sono in
`facts.md`.

### Tutte le pagine

| Elemento                                                                                                                                                                                                                                                                 | Prodotto copiato                                | Fonte                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titoli e pulsanti in Nunito (titolo di pagina 32 px, peso 900)                                                                                                                                                                                                           | Roll20, carattere dei titoli e dei pulsanti     | [CSS] `.grimoire__button{font-family:Nunito}`; facts.md §0.4                                                                                                                                                   |
| Testo dell'interfaccia in Figtree, al posto di proxima-nova (che è proprietario)                                                                                                                                                                                         | Roll20, carattere dell'interfaccia              | [CSS] kit Adobe Fonts di roll20.net; facts.md §0.4 (Figtree scelto per la stessa «a», la stessa «g» e terminali piatti)                                                                                        |
| Formule dei dadi in Roboto Mono                                                                                                                                                                                                                                          | Campo dell'espressione del tiro di Roll20       | [DOM] `tools.roll20.net/dice-roller` (roboto-mono 14 px); T49 `roll20-table-dice-roller-live-390x844.png` (<https://tools.roll20.net/dice-roller>)                                                             |
| Superfici quasi nere: pagina #0C0C0C, schede e pannelli #1F1F1F, righe in rilievo #353535, barra di navigazione #111111                                                                                                                                                  | Roll20 «Grimoire», tema scuro                   | [CSS] `--color-background`, surface 1/2, `--color-navbar-background`; [O] T6 `roll20-table-jumpgate-dark-blank-page-chat-2026.png` (<https://blog.roll20.net/posts/page-menu-updates/>)                        |
| Testo #E6E6E6, testo secondario #B3B3B3                                                                                                                                                                                                                                  | Roll20, scala dei grigi scura                   | [CSS] grayscale 1 e 2 (tema scuro)                                                                                                                                                                             |
| Pulsante principale viola pieno #702C91 (al passaggio #8D56A7); secondario scuro dentro un filo lilla #A980BD; terziario: sole parole lilla #BA9ACA                                                                                                                      | Pulsanti «Grimoire» di Roll20                   | [CSS] `--button-primary-bg`, `--button-secondary-border`, `--button-tertiary-fg` (scuro); [O] D1 `roll20-dialog-convert-to-jumpgate.png` (<https://help.roll20.net/hc/en-us/articles/21569402281495-Jumpgate>) |
| Pulsanti in Nunito 16 px pesante con 1 px di spaziatura tra le lettere, angoli da 8 px                                                                                                                                                                                   | `.grimoire__button`                             | [CSS] `border-radius:.5rem`, `letter-spacing` 50                                                                                                                                                               |
| Un solo aspetto per i comandi terziari (pulsante «quiet», pulsante di testo, sommario a scomparsa, «Annulla» delle finestre): parole lilla #BA9ACA in Nunito pesante. Quando aprono una riga, le parole stanno sul bordo della riga (il margine interno esce a sinistra) | `.grimoire__button--tertiary`                   | [CSS] `--button-tertiary-fg` #BA9ACA (scuro), estratto dei componenti                                                                                                                                          |
| Un solo gettone piccolo: 24 px, margini 2 × 8, 13 px grassetto, angoli da 4 px (etichette, V S M, tipi di azione, stato vitale, regole dell'iniziativa)                                                                                                                  | Gettoni della scheda e di «Grimoire»            | [O] S1 («Proficiency Bonus +3»), S14; [CSS] `--chip-*`                                                                                                                                                         |
| Collegamenti e parole interattive lilla #A980BD                                                                                                                                                                                                                          | Roll20, colore primario per il testo (scuro)    | [CSS] `--el-color-primary` #a980bd                                                                                                                                                                             |
| Campi: pozzo scuro dentro un filo grigio, angoli da 4 px; il filo diventa lilla al passaggio e al fuoco                                                                                                                                                                  | Campi «Grimoire» / Element Plus                 | [CSS] `.grimoire__input`; [O] D3 `roll20-dialog-scale-measurements-2026.png` (<https://blog.roll20.net/posts/align-to-grid-new/>)                                                                              |
| Interruttori: binario viola con pomello bianco quando è acceso, grigio quando è spento                                                                                                                                                                                   | Interruttori di Roll20                          | [O] T25 `roll20-table-token-context-menu-reactions-2025.png` (<https://help.roll20.net/hc/en-us/articles/32901366352919-Reactions>)                                                                            |
| Finestre: piatte #1F1F1F, nessun colore nella barra del titolo, titolo bianco, × grigia, grande ombra; in fondo «Annulla» in parole lilla e il viola pieno                                                                                                               | Finestre modali di Roll20                       | [O] D1; D8 `roll20-dialog-view-as-player-picker-2026.png` (<https://blog.roll20.net/posts/player-view-is-here/>)                                                                                               |
| Pagina aperta nella navigazione: linguetta piena #702C91 con parole bianche                                                                                                                                                                                              | Linguette «Grimoire» («lined»)                  | [CSS] `--tabs-button-lined-background-color` #702c91                                                                                                                                                           |
| Contatori di avvisi: pastiglia azzurra con il numero scuro                                                                                                                                                                                                               | Barra di navigazione di Roll20                  | [CSS] `--color-navbar-notification-badge`                                                                                                                                                                      |
| Anello del fuoco lilla chiaro #D1BBDC, 3 px (anche sui sommari a scomparsa)                                                                                                                                                                                              | Fuoco del pulsante principale di Roll20         | [CSS] `--button-primary-focus` (scuro); lo spessore resta quello dell'app                                                                                                                                      |
| Ombre a tre strati come Material                                                                                                                                                                                                                                         | Roll20, `--chat-shadow`, `--drop-shadow-xlarge` | [CSS]                                                                                                                                                                                                          |
| Icone piene monocromatiche (Font Awesome Free 6), ognuna scelta per lo strumento di Roll20 che rappresenta                                                                                                                                                               | Icone di Roll20 (Font Awesome e Pictos)         | [O] T6, T3; facts.md §0.6                                                                                                                                                                                      |
| Selezione del testo viola pieno, cursore lilla, barre di scorrimento grigie                                                                                                                                                                                              | Roll20, colore primario                         | [CSS]                                                                                                                                                                                                          |

### Inizio

| Elemento                                                                                                                        | Prodotto copiato                                   | Fonte                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pagina quasi nera, schede #1F1F1F con angoli da 8 px, un filo #2A2A2A e l'ombra della chat                                      | Roll20 Characters, «My Characters» (scuro)         | [O] H13 `roll20-home-characters-my-characters-dark.png` (<https://help.roll20.net/hc/en-us/articles/360037258594-Roll20-Characters>); [CSS] `--card-border` #2a2a2a                                                                                |
| «Continua a giocare» come riga di «Le mie partite» in grande: copertina a sinistra, titolo, il pulsante di avvio, un secondario | Roll20, «My Games» e pagina della partita          | [O] H5 `roll20-home-my-games-annotated-help.jpg` (<https://help.roll20.net/hc/en-us/articles/29619836768791-My-Games>); H6 `roll20-home-game-details-page-frame.png`                                                                               |
| «▶ Entra al Tavolo»: il pulsante «Launch Game» viola pieno con il triangolo di avvio, alto 46 px                                | «Launch Game» di Roll20; pulsante medio «Grimoire» | [O] H10 `roll20-home-launch-game-buttons-2025.png` (<https://help.roll20.net/hc/en-us/articles/29257513100183-1-Creating-your-game-lobby-on-Roll20>); H12 `roll20-home-jumpgate-choose-engine-2025.png`; [CSS] `.grimoire__button.medium` 2.875rem |
| Sotto il titolo, piccole maiuscole in grassetto grigio («IL CORTILE DELL'OSSERVATORIO», «MAGA · LIVELLO 3»)                     | Roll20 Characters («D&D 5E BY ROLL20»)             | [O] H13                                                                                                                                                                                                                                            |
| Il tuo personaggio: ritratto rotondo incorniciato, nome in Nunito                                                               | Roll20 Characters, schede dei personaggi           | [O] H13                                                                                                                                                                                                                                            |
| Pannello «Novità»: linguette lilla, quella aperta piena viola; «Nuova» come gettone lilla pieno con parole nere                 | Linguette e gettoni «Grimoire»                     | [CSS] tabs e `--chip-background-color` #a980bd / `--chip-text-color` #000                                                                                                                                                                          |
| Copertina: illustrazione dorata del proprietario (libro magico che brilla)                                                      | La fascia d'illustrazione del «campaign launcher»  | [O] H17 `roll20-home-dnd-campaign-launcher-2026.png` (<https://blog.roll20.net/posts/dnd-shops-and-treasure-out-now-for-everyone/>) per il ruolo e il tono; i pixel sono nostri (vedi Licenze)                                                     |

### Scheda (Azioni, Magie, Inventario)

| Elemento                                                                                                                                                                                                                                                                                                    | Prodotto copiato                                             | Fonte                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pagina nera con due campi rossi #A82020 che escono dai bordi dietro i pannelli (forme curve semplici nostre, non il drago)                                                                                                                                                                                  | Scheda D&D 2024 di Roll20, sfondo                            | [O] S1 `roll20-sheet-dnd2024-dark-new-layout-2025.png` (<https://blog.roll20.net/posts/dd-2024-updated-ui-and-layouts/>): rosso #A82020 = [CSS] `--compendium-strong` (scuro)                                               |
| Pannelli #171717 con un filo bruno-dorato #7B6342, angoli da 4 px, nessuna ombra                                                                                                                                                                                                                            | Scheda D&D 2024, pannelli                                    | [O] S1                                                                                                                                                                                                                      |
| Titoli dei pannelli d'oro #C7A16B in maiuscoletto grassetto, allineati a sinistra                                                                                                                                                                                                                           | Scheda D&D 2024 («ABILITIES», «SKILLS»)                      | [O] S1                                                                                                                                                                                                                      |
| Nome del personaggio d'oro in maiuscoletto; ritratto quadrato in una cornice rossa                                                                                                                                                                                                                          | Intestazione della scheda                                    | [O] S1; S7                                                                                                                                                                                                                  |
| Pulsanti della scheda in maiuscoletto: contornati scuri («Level Up»: anche Riposa, Correggi valori, Avanza di livello, Rivedi scelte), il principale rosso pieno #651313 («Initiative»)                                                                                                                     | Intestazione della scheda                                    | [O] S1                                                                                                                                                                                                                      |
| Comandi terziari, collegamenti e sommari della scheda in rosso chiaro #E16363 in maiuscoletto; interruttori, caselle di spunta e avvisi della scheda in rosso e oro (mai il lilla di «Grimoire»)                                                                                                            | «Sheet Settings», «Show More» della scheda                   | [O] S1, S16, S25                                                                                                                                                                                                            |
| Un solo titolo di pannello: oro 20 px in maiuscoletto (anche «Tiri» e «Chi può modificare la scheda»); 16 px per i titoli di gruppo dentro un pannello; 13 px per i titoli delle caselle della fascia (Competenza, Movimento, Ispirazione eroica, Punti ferita), con i quattro valori sulla stessa linea    | Titoli della scheda D&D 2024                                 | [O] S1                                                                                                                                                                                                                      |
| Caratteristiche in un solo pannello a sei colonne con divisori sottili; il modificatore in un quadrato #353535 nel filo #5D5D5D, il punteggio su un gettone scuro che morde il bordo                                                                                                                        | «ABILITIES»                                                  | [O] S9 `roll20-sheet-dnd2024-ability-scores-help.png` (<https://help.roll20.net/hc/en-us/articles/30748164251287-Dungeons-Dragons-2024-Character-Sheet>)                                                                    |
| Iniziativa come pulsante rosso pieno «INIZIATIVA +2»; la CA dentro il contorno di uno scudo                                                                                                                                                                                                                 | «Initiative +3», «AC/Speed»                                  | [O] S1; S10 `roll20-sheet-dnd2024-ac-speed-help.png`                                                                                                                                                                        |
| Punti ferita: numeri grandi, barra verde #1AAD5C sul binario verde chiaro #A3DEBE; Cura e Danno come quadrati #353535 con parole verdi e rosse                                                                                                                                                              | «Hit Points»                                                 | [O] S8 `roll20-sheet-dnd2024-hitpoints-help.png`; [CSS] `--color-hp-base` (scuro)                                                                                                                                           |
| Tiri salvezza e abilità: righe senza filetti, nome bianco, caratteristica come gettone scuro, bonus nudo — in una casella rossa #430D0D con filo #B52222 se c'è competenza — e il cerchio di competenza in fondo (pieno rosso #861A1A, tratteggiato se no)                                                  | «Skills», competenza rossa                                   | [O] S11 `roll20-sheet-dnd2024-skills-help.png`; S1                                                                                                                                                                          |
| «Gioco / Modifica» e «Dadi digitali / Dadi fisici» come linguette inclinate a parallelogramma, quella scelta piena #430D0D con un piede rosso chiaro da 3 px (si riconosce anche senza colori)                                                                                                              | Linguette del modo dei tiri («Public / Whisper / Automatic») | [O] S1; il piede è nostro, per la regola «mai solo il colore»                                                                                                                                                               |
| Effetti (Benedizione, Anatema): interruttori che diventano rossi                                                                                                                                                                                                                                            | Interruttore «preparato» della scheda                        | [O] S16 `roll20-sheet-dnd2024-spell-slot-diamonds-2025.png` (<https://blog.roll20.net/posts/roll20s-dd-spell-update-full-screen-and-new-features/>)                                                                         |
| Linguette delle sezioni in maiuscoletto, ognuna sul suo filo: la aperta d'oro sul filo #997C4F                                                                                                                                                                                                              | «COMBAT · SPELLS · INVENTORY»                                | [O] S1                                                                                                                                                                                                                      |
| Gruppi di azioni sotto una fascia #0C0C0C con il titolo d'oro; colpire in giallo pallido #FFEEA4; filtri come gettoni scuri, quello scelto rosso pieno #B52222 dentro un filo rosso chiaro da 2 px e con il pallino bianco della competenza davanti                                                         | Scheda, scheda «Combat»; competenza (S11)                    | [O] S13 `roll20-sheet-dnd2024-combat-tab-help.png`; S18 `roll20-sheet-dnd2024-phone-combat-mockup-2026.png` (<https://blog.roll20.net/posts/were-retiring-the-roll20-mobile-app-to-build-something-better-heres-why/>); S11 |
| Tiri salvezza, sensi e abilità come la lista fitta di S11: nome 14 px grassetto e caratteristica sulla stessa riga                                                                                                                                                                                          | «Skills»                                                     | [O] S11 (nome ≈ 15 px nel piano di copia; 14 è il passo della nostra scala)                                                                                                                                                 |
| Slot degli incantesimi (e sintonia) come rombi rossi, pieni finché sono disponibili; livelli sotto la fascia scura; V S M come gettoni scuri; «Preparata» come pastiglia rossa                                                                                                                              | Scheda, «Spells»                                             | [O] S16; S14 `roll20-sheet-dnd2024-spells-list-help.png`; S17                                                                                                                                                               |
| Inventario: cifre in pozzi scuri, set d'armi scelto in rosso, intestazioni delle colonne d'oro in maiuscoletto                                                                                                                                                                                              | Scheda, «Inventory»                                          | [O] S25 `roll20-sheet-dnd2024-inventory-shop-2026.png` (<https://blog.roll20.net/posts/dnd-shops-and-treasure-out-now-for-everyone/>); S1                                                                                   |
| Sotto-sezioni (Capacità, Storia, Note, Extra) come i filtri: gettoni scuri, quella aperta rossa piena con filo e pallino; caselle d'uso limitato con il filo rosso chiaro (piene rosse se spese); barra dei progressi d'oro; collegamenti della storia, segni dei progetti e cornice scelta in rosso chiaro | Scheda D&D 2024, filtri e caselle d'uso                      | [O] S1, S11, S16                                                                                                                                                                                                            |

### Tavolo

| Elemento                                                                                                                                                                                                                                                                                                                | Prodotto copiato                                    | Fonte                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colonna degli strumenti nera #0C0C0C, piena altezza, incollata al bordo sinistro (48 px, circa il 3 % dello schermo); glifi pieni #E6E6E6 senza piastra; lo strumento attivo su una casella #353535 con filo #5D5D5D e angoli da 12 px                                                                                  | Jumpgate, colonna degli strumenti                   | [O] T6; T3 `roll20-table-jumpgate-dark-hexmap-full-ui-2026.png` (<https://blog.roll20.net/posts/10x-vtt-performance-update/>)                                                |
| Il gruppo di strumenti aperto come pannello nero attaccato alla colonna                                                                                                                                                                                                                                                 | Menu a comparsa degli strumenti di Roll20           | [O] T6, T31 (crop numerato della colonna)                                                                                                                                    |
| Ritratti del gruppo come i pulsanti «LAYERS» in fondo alla colonna: quadrati arrotondati, quello scelto acceso del suo verde (#30673C, filo #598563), piccole maiuscole sotto                                                                                                                                           | Pulsanti dei livelli di Jumpgate («TOKENS», «GM»)   | [O] T6, T3                                                                                                                                                                   |
| La mappa dalla colonna degli strumenti fino al pannello laterale e al bordo in basso: lo zoom galleggia sull'illustrazione; la barra delle macro, i dadi e la targa galleggiano sulla mappa (si vede sotto di loro appena si ingrandisce o si sposta la vista); «Centra la scena» tiene la scena sopra la barra         | Jumpgate                                            | [O] T3, T4 `roll20-table-jumpgate-dark-map-pins-full-ui-2026.png` (<https://blog.roll20.net/posts/map-pins-customization/>)                                                  |
| Comandi galleggianti di vetro scuro rgba(0,0,0,.6) con un filo #A5A1A7: la riga della sessione in alto a destra, lo zoom verticale sotto di essa                                                                                                                                                                        | Pulsante delle pagine e zoom di Jumpgate            | [O] T6, T3                                                                                                                                                                   |
| Ordine dei turni come la finestra «Turn Order»: #1F1F1F galleggiante accanto alla colonna, una riga per creatura (gettone tondo, nome), la riga attuale verde #094424 con un filo più chiaro                                                                                                                            | «Turn Order» di Roll20                              | [O] T15 `roll20-table-turn-order-dark-active-row-frame.png` (<https://help.roll20.net/hc/en-us/articles/360039178634-Turn-Tracker>)                                          |
| Targa della scena come finestra opaca #1F1F1F con l'ombra delle finestre (come la Turn Order sotto di lei): i muri della mappa non passano più tra i comandi; nella vista del master il nome sta sopra i comandi e la targa è larga quanto la riga più lunga                                                            | Finestre galleggianti di Jumpgate («Turn Order»)    | [O] T15, T6                                                                                                                                                                  |
| Barra delle azioni come barra delle macro: un gettone viola #702C91 per azione, tutti alti 44 px (con o senza l'etichetta del gruppo), parole bianche, angoli piccoli; la targa del giocatore a sinistra; l'anello del fuoco disegnato dentro il gettone (e dentro le righe dei turni), come l'anello interno di Roll20 | Macro quick bar e player plate; fuoco di «Grimoire» | [O] T44 `roll20-table-macro-hotbar-token-actions-frame.png` (<https://blog.roll20.net/posts/what-you-missed-in-2025-on-roll20/>); T1; [CSS] `inset 0 0 0 4px` (facts §0.5)   |
| «Termina turno» come «next» della finestra Turn Order promosso a viola pieno, nel piede del pannello (dove Roll20 mette «Send»)                                                                                                                                                                                         | Turn Order e chat di Roll20                         | [O] T15; T6                                                                                                                                                                  |
| Pagine della barra («Azioni / Barra rapida») come gruppo segmentato grigio, la pagina aperta su una casella più chiara                                                                                                                                                                                                  | Controllo segmentato di Roll20                      | [O] D4 `roll20-dialog-grid-settings-2026.png` (<https://blog.roll20.net/posts/align-to-grid-new/>)                                                                           |
| Pannello laterale #1F1F1F dietro un divisorio nero; linguette a icona, la aperta piena lilla #8D56A7; sotto-linguette sulla fascia viola #2D123A                                                                                                                                                                        | Barra laterale di Jumpgate                          | [O] T6; T1 `roll20-table-jumpgate-dark-map-chat-rolltemplates-3ddice-2026.png` (<https://blog.roll20.net/posts/dd-sheet-now-on-phones/>)                                     |
| Classe armatura come «bolla» rotonda scura in un anello blu #7C9BC4                                                                                                                                                                                                                                                     | Bolle dei segnalini (Bar 2 = CA)                    | [O] T20 `roll20-table-token-hp-ac-bubbles-annotated-2025.png` (<https://help.roll20.net/hc/en-us/articles/29258224833431-10-Using-Roll20-to-play>); T22 (colori delle barre) |
| Segnalini: arte tonda in un filo chiaro su una linea nera; ostili in rosso Bar 3 #B31D1D (e tratteggio dell'app); selezione azzurra #5E85D4 con un filo nero (al fuoco da tastiera tratteggiata da 3 px, come oggi); punti ferita come pastiglia verde #7CC48A sopra il segnalino; nome bianco con contorno nero sotto  | Segnalini di Jumpgate                               | [O] T18 `roll20-table-token-bubbles-hpbar-nameplate-rolltemplate-frame.png` (<https://blog.roll20.net/posts/what-you-missed-in-2025-on-roll20/>); T22                        |
| Porte e finestre come quadrati bianchi incorniciati sul muro                                                                                                                                                                                                                                                            | Porte di Jumpgate                                   | [O] T44                                                                                                                                                                      |
| Punti di viaggio del master (forzieri, tracce, nascondigli) come le porte: disco nero, filo e glifo bianchi                                                                                                                                                                                                             | Porte di Jumpgate                                   | [O] T44                                                                                                                                                                      |
| Slot degli incantesimi nella barra come rombi rossi                                                                                                                                                                                                                                                                     | La stessa grammatica della scheda                   | [O] S16                                                                                                                                                                      |
| Griglia sottile chiara                                                                                                                                                                                                                                                                                                  | Griglia di Jumpgate                                 | [O] T6                                                                                                                                                                       |
| Finestra dell'iniziativa come finestra di Roll20 con righe di Turn Order (totale a destra in Nunito pieno)                                                                                                                                                                                                              | Finestre modali e Turn Order                        | [O] D1, D8, T15                                                                                                                                                              |
| Menu della pedina come il menu del tasto destro: lista scura arrotondata (12 px), righe con icona e parole in grassetto, la riga sotto il puntatore su #353535 con parole lilla                                                                                                                                         | Menu contestuale di Jumpgate                        | [O] T25                                                                                                                                                                      |
| Telefono: barre sotto la mappa come la barra dell'app di Roll20 Characters (#111111), linguette a icona con la aperta lilla                                                                                                                                                                                             | Roll20 Characters su telefono                       | [O] S18                                                                                                                                                                      |

## Misure coerenti (I-250)

Ogni margine, spaziatura, dimensione del testo, angolo e spessore di bordo del file viene da una di
queste scale, copiate dal CSS di Roll20:

- **Spaziature:** i quarti di rem di «Grimoire» → 2 · 4 · 6 · 8 · 12 · 16 · 24 · 32 · 48 px.
- **Testo:** 12 · 13 · 14 · 16 · 18 · 20 · 24 · 32 · 36 px (13 = `--el-font-size-base` di Roll20; 16 =
  il testo e i pulsanti; 32 = il titolo di pagina). Le misure dell'app (`--text-*`) sono spostate
  sulla stessa scala; le piccole maiuscole da 10 px di Roll20 sono il maiuscoletto del 13.
- **Interlinea:** 1 per i numeri, 1,2 per titoli e pulsanti, 1,375 per il testo (16/22 della chat).
- **Spaziatura delle lettere:** 0,0625 em su pulsanti e maiuscoletto, 0,1 em sulle piccole maiuscole.
- **Angoli:** 4 (campi, pannelli della scheda) · 8 (pulsanti, schede) · 12 (finestre, strumento
  attivo, menu) · 16 (foglio del telefono) · pastiglia.
- **Bordi:** 1 px; 2 px per le caselle di competenza e lo strumento attivo.
- **Comandi:** 40 px (il minimo dell'app), 44 px per i gettoni della barra delle macro, 46 px per il
  pulsante «Entra al Tavolo», 48 px per la colonna degli strumenti. Sul telefono e nelle caselle
  dell'inventario c'è la misura piccola di «Grimoire»: 14 px, 8 px ai lati.
- **Una forma per componente:** un solo comando terziario, un solo gettone piccolo (24 px), un solo
  titolo di pannello della scheda, un solo titolo di casella della fascia, una sola altezza per i
  gettoni della barra.

Risultato della verifica dei valori (`changes/visual-01/audit/audit.js --direction roll20`, 20 stati,
01/10/2026, dopo il secondo giro): spaziature su passo di 2 px nel 99 % dei casi; 12 dimensioni di
testo, tutte sulla scala tranne le etichette disegnate dentro la mappa (11 e 17 px, scalano con lo
zoom) e il marchio d20 Studio (fermo fino alla fase D); 6 rapporti d'interlinea; 6 raggi; 8 ombre;
90 varianti di pulsante, 14 classi con più di una variante; nessun pulsante con il margine
predefinito del browser; contrasto: nessun testo sotto AA su 1218. Le altre eccezioni sono la
geometria fissa del Tavolo (posizioni calcolate dal programma). Il confronto prima e dopo è in
«Coerenza (I-250)».

## Coerenza (I-250)

Secondo giro di rifinitura, 01/10/2026. Strumento di verifica (`changes/visual-01/audit/`) sui 20
stati del giro 1 (1440 e 390, tema scuro, compresa la scheda intera), prima
(`…/probe-roll20/r2/audit-before-r2.md`, `direction.css` delle 03:37) e dopo
(`…/visual-01/audit/roll20/audit.md`, `direction.css` delle 11:46). Sotto la piega: Inizio e Scheda a
pagina intera (`…/probe-roll20/r2/before-full/`, `after-full/`) e il campionario dei componenti
(`…/probe-roll20/r2/specimen/`, 1440 e 390), letti uno per uno.

| Misura (20 schermate del giro 1)                    | Prima             | Dopo              |
| --------------------------------------------------- | ----------------- | ----------------- |
| Elementi visibili                                   | 2569              | 2588              |
| Valori di spazio distinti (fuori scala)             | 32 (17)           | 31 (15)           |
| Spazi sul passo di 2 px                             | 98,2 %            | 99,2 %            |
| Altezze dei comandi                                 | 19                | 18                |
| Grandezze dei caratteri · interlinee · stili        | 12 · 26 · 90      | 12 · 26 · 90      |
| Raggi · spessori dei bordi · ombre                  | 6 · 3 · 8         | 6 · 3 · 8         |
| Colori (testo · fondo · bordo; coppie quasi uguali) | 26 · 28 · 22 (12) | 24 · 28 · 22 (11) |
| Pulsanti: classi visive, varianti (classi con più)  | 24, 96 (16)       | 24, 90 (14)       |
| Linguette · gettoni · pannelli: varianti            | 13 · 13 · 42      | 13 · 14 · 41      |
| Bottoni con il margine predefinito del browser      | 0                 | 0                 |
| Contrasto AA sotto soglia (incerti)                 | 2 su 1210 (1)     | 0 su 1218 (1)     |

- **Una ricetta per tipo.** Le icone dei comandi da 40 px (strumenti della mappa, zoom, linguette
  del pannello, comandi della barra) hanno tutte il glifo da 20 px, come i servizi
  dell'intestazione (prima 18, 19 o 21 px secondo la riga); il menu della pedina tiene i suoi glifi
  da 16 px, righe e chiusura uguali. Le sotto-sezioni della scheda sono i
  gettoni dei filtri (stessa altezza, angoli, carattere e stato scelto), non una pastiglia lilla. I
  pulsanti della scheda tengono il loro significato: pericolo in rosso chiaro, premuto come il
  filtro scelto, disattivato come ovunque (prima diventavano tutti contornati uguali). Sul telefono
  Iniziativa e CA sono la stessa casella di Competenza e Movimento (titolo da 13 px su due righe,
  valore sulla riga comune): «Iniziativa +2» usciva dalla sua casella.
- **Bordi delle righe.** I comandi terziari stanno con le parole sul bordo del testo quando aprono
  una riga (titoli delle schede dell'Inizio che vanno a capo, «Segna come letta», «Unisciti con un
  invito», «Nascondi i primi passi», «Cambia…», «Offline e sincronizzazione», «Correggi risorsa»
  sotto gli slot, «Aggiungi» della personalità, «Fabbrica», «Dettagli» delle righe
  dell'inventario e delle azioni sul telefono, dove anche il bonus parte sotto il nome); quando
  seguono altre parole nella stessa riga, la distanza è sempre 16 px.
- **Outlier tolti:** la spaziatura da 54,2 px (seconda riga delle righe della finestra
  dell'iniziativa, ora esattamente sotto il nome); le altezze da 52,5 px (bottoni
  del piede della finestra con le parole spezzate su due righe: ora va a capo il pulsante intero) e
  da 97 px (sul telefono le quattro caselle della fascia hanno un'unica altezza, 111 px); il
  carattere da 11 px della pastiglia dei PF e delle celle dei turni sul telefono (ora 12, sulla
  scala); i colori #B2A98C ed #E2C17B dei simboli di viaggio; l'interlinea del nastro dimostrativo
  (che a 390 era alto 94,5 px invece di 96 come in «Attuale»).
- **Contrasto:** i simboli di viaggio del master (⋯ 3,53 e ✦ 3,91, uguali in «Attuale») ora sono
  bianchi su un disco nero pieno, come le porte. Resta un solo testo «incerto», il 13 della CA dentro
  lo scudo nella scheda intera sul telefono: lo strumento non può leggere i pixel sotto la piega; è
  #E6E6E6 su #171717 (14,4:1) e lo scudo è solo un contorno.
- **Restano** (geometria dell'app, non di questa opzione): i margini fissi della mappa (48, 64, 108,
  120, 160 px), la casella «Ispirazione eroica» del telefono alta quanto i punti ferita accanto
  (135,5 px), la piccola cornice del marchio d20 Studio (fase D).

## Coppie per il confronto

Montaggi pronti in `round1/roll20/_pairs/` (nostra schermata a sinistra, riferimento a destra),
rifatti dopo l'ultima cattura del secondo giro con `…/probe-roll20/r2/pairs.py` (alti 700 px, sotto
ogni immagine chi è e il nome del file).

| Schermata                | Nostra schermata                         | Riferimenti Roll20                                                                                         |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Inizio                   | `home-dark-1440-roll20.png`              | `roll20-home-characters-my-characters-dark.png`, `roll20-home-my-games-annotated-help.jpg`                 |
| Inizio (telefono)        | `home-dark-390-roll20.png`               | `roll20-sheet-dnd2024-phone-combat-mockup-2026.png`, `roll20-home-characters-my-characters-dark.png`       |
| Scheda                   | `sheet-dark-1440-roll20.png`             | `roll20-sheet-dnd2024-dark-new-layout-2025.png`                                                            |
| Scheda (telefono)        | `sheet-dark-390-roll20.png`              | `roll20-sheet-dnd2024-phone-combat-mockup-2026.png`                                                        |
| Tavolo                   | `table-combat-dark-1440-roll20.png`      | `roll20-table-jumpgate-dark-hexmap-full-ui-2026.png`, `roll20-table-macro-hotbar-token-actions-frame.png`  |
| Tavolo (DM)              | `table-combat-dm-dark-1440-roll20.png`   | `roll20-table-turn-order-dark-active-row-frame.png`, `roll20-table-jumpgate-dark-blank-page-chat-2026.png` |
| Tavolo (telefono)        | `table-combat-dark-390-roll20.png`       | `roll20-sheet-dnd2024-phone-combat-mockup-2026.png`, `roll20-table-dice-roller-live-390x844.png`           |
| Tavolo in esplorazione   | `table-explore-dark-1440-roll20.png`     | `roll20-table-jumpgate-dark-map-pins-full-ui-2026.png`                                                     |
| Scheda · Magie           | `sheet-spells-dark-1440-roll20.png`      | `roll20-sheet-dnd2024-spell-slot-diamonds-2025.png`, `roll20-sheet-dnd2024-spells-fullscreen-2025.png`     |
| Scheda · Inventario      | `sheet-inventory-dark-1440-roll20.png`   | `roll20-sheet-dnd2024-inventory-shop-2026.png`                                                             |
| Finestra dell'iniziativa | `dialog-initiative-dark-1440-roll20.png` | `roll20-dialog-convert-to-jumpgate.png`, `roll20-table-turn-order-dark-active-row-frame.png`               |
| Menu della pedina        | `token-menu-dark-1440-roll20.png`        | `roll20-table-token-context-menu-reactions-2025.png`                                                       |

Altre schermate di questa opzione: `table-explore-dark-390-roll20.png`,
`sheet-spells-dark-390-roll20.png`, `contact-dark-roll20.png` (tutte insieme).

## Differenze dichiarate

Cose che Roll20 fa e noi no, o che facciamo diversamente, e perché.

1. **Roll20 non ha una barra delle azioni né un pulsante «Termina turno».** La nostra barra è
   disegnata come la targa del giocatore più la barra delle macro (gettoni viola); «Termina turno»
   è il pulsante «avanti» della finestra Turn Order, reso viola pieno e messo nel piede del pannello
   laterale, dove Roll20 ha «Send». È un adattamento, non una copia. Sul telefono «Termina turno»
   resta nella riga dei comandi, a destra delle cinque caselle, come in «Attuale».
2. **Le linguette del pannello laterale restano in colonna a destra.** In Roll20 sono una riga di
   icone sopra il pannello; il master ne ha fino a 14, che in una riga da 40 px non entrano. Hanno
   però l'aspetto di Roll20 (glifi pieni, la aperta piena lilla).
3. **La colonna degli strumenti non ha le scritte TOOLS / FX / LAYERS né il menu ≡ in cima**: le
   scritte sarebbero testo nuovo. La parte alta della colonna, sopra gli strumenti, resta nera (la
   targa della scena sta alla sua destra). I gruppi di strumenti di Roll20 si aprono e si chiudono;
   nell'app il gruppo attivo resta aperto, disegnato come pannello nero attaccato alla colonna, e la
   finestra dei turni si sposta alla sua destra.
4. **I ritratti del gruppo sono disegnati come i pulsanti dei livelli** (TOKENS, GM…), ma restano i
   personaggi: la scritta sotto è il nome, non un livello.
5. **La finestra dei turni non ha il titolo «Turn Order», la rotella, la freccia in fondo né i
   valori d'iniziativa**: l'app non li mostra in quella lista e non possiamo aggiungere testo. Non si
   trascina.
6. **Segnalini:** niente tre bolle colorate sopra il segnalino (l'app non ha altri valori da
   mostrare), la pastiglia dei punti ferita non ha il numero dentro, la selezione è un anello azzurro
   e non il riquadro con le maniglie quadrate. Gli ostili tengono il tratteggio dell'app (mai solo il
   colore).
7. **Lo zoom** sono i quattro pulsanti dell'app (trova, +, −, centra), in vetro come lo zoom di
   Roll20, non la barra con il valore. **La targa della scena** non esiste in Roll20: è disegnata come
   striscia di vetro.
   **La mappa e la barra:** in Roll20 la pagina si apre ingrandita e l'illustrazione passa sotto ogni
   comando. Da noi la mappa arriva al pannello laterale e al bordo in basso, e lo zoom galleggia
   sull'illustrazione; però «Centra la scena» tiene la scena sopra la barra delle azioni (è una
   garanzia dell'app: nessuna pedina sotto la barra). Quindi nella vista intera sotto la barra c'è il
   fondo scuro; appena si ingrandisce o si sposta la vista, la mappa scorre sotto la barra di vetro
   (prova: `probe-roll20/fix/table-zoomed-in-1440-roll20.png`).
8. **Scheda:** i titoli delle quattro caselle della fascia (Competenza, Movimento, Ispirazione
   eroica, Punti ferita) sono a 13 px e non a 16 come gli altri titoli di gruppo: a 16 px
   «COMPETENZA» non entra in una casella larga 100 px. Nessun drago (sono due campi rossi curvi
   nostri); nessun rombo con il livello sul
   ritratto (il numero sarebbe testo nuovo); le linguette inclinate sono «Gioco / Modifica» e «Dadi
   digitali / fisici», non «Public / Whisper». La disposizione resta quella dell'app (fascia delle
   caratteristiche, poi tiri salvezza e abilità a sinistra), non la griglia di Roll20 con i punti
   ferita accanto all'identità. Il maiuscoletto è sintetizzato: Figtree non ne ha uno vero e il
   carattere della scheda di Roll20 non è noto.
9. **Caratteri:** proxima-nova (proprietario) è sostituito da Figtree; Nunito e Roboto Mono sono gli
   stessi di Roll20.
10. **Inizio:** «Le mie partite» di Roll20 è una lista con la pastiglia «Creator» e gli avatar dei
    giocatori; l'Inizio dell'app ha una sola scheda «Continua a giocare», copiata come una riga in
    grande, senza quei dati. Il titolo resta bianco (come Roll20 Characters), non blu come la vecchia
    pagina chiara. Sul telefono la copertina non c'è (l'app la nasconde) e «Entra al Tavolo» resta
    nei primi 844 px (653–699 px).
11. **Telefono:** Roll20 non ha un tavolo per telefono («optimized for tablet, not phones», Help
    Center). Il nostro Tavolo su telefono tiene la disposizione dell'app nella grammatica di Roll20
    Characters; niente pulsante tondo del d20 in basso a destra (servirebbe nuovo codice). Nella
    vista del master su telefono i ritratti dei turni coprono ancora l'avviso «Sessione non avviata»:
    è un difetto di oggi, uguale in «Attuale».
12. **Finestra dell'iniziativa:** Roll20 tira l'iniziativa dalla chat dentro la Turn Order; la nostra
    finestra è dell'app, disegnata come finestra di Roll20 con righe da Turn Order.
13. **Menu della pedina:** le icone delle righe sono quelle dell'app a tratto (il programma non ci
    permette di cambiarle), non quelle piene di Roll20.
14. **Sul telefono** i comandi della scena («Concludi incontro · Scene · Riposi · Tempo») usano la
    misura piccola di «Grimoire» (14 px, senza spaziatura tra le lettere) e il titolo della scena è a
    16 px, così titolo e stato stanno su una riga e i quattro comandi su un'altra, come in «Attuale».
    Il pulsante «Seleziona tutti / Nessuno» della finestra dell'iniziativa ha la cornice del
    pulsante secondario, come i due vicini: senza cornice, quando va a capo sul telefono, restava
    rientrato di 16 px. L'intestazione del Tavolo resta su **una** riga come in «Attuale»: i due
    comandi («App», ritorno alla campagna) prendono la misura compatta (6 px, 12 px) e le sei icone
    dei servizi stanno affiancate, ognuna sempre 40 × 40.
15. **La barra in alto** non esiste nel Jumpgate (che è a tutto schermo): resta quella dell'app,
    disegnata come la barra di navigazione scura di Roll20. Il marchio d20 Studio resta com'è.
16. **Solo tema scuro:** con il tema chiaro questa opzione mostra l'aspetto di oggi. Roll20 chiaro
    (bianco e magenta #E10085) è nei riferimenti, non qui.

## Controlli fatti (01/10/2026, dopo il secondo giro di rifinitura)

- Barra delle azioni a 1440 × 900: **112 px** (il limite è 120); 112 px anche a 1366 × 768.
  «Termina turno» 96 × 86 px a schermo, Annulla e Annulla l'ultima mossa 40 × 40.
- Telefono (390 × 844, come un telefono vero): barra **153 px**, come «Attuale»; «Termina turno»
  146 × 40 nella riga dei comandi, Annulla e Annulla l'ultima mossa 40 × 40, tutti a schermo e non
  coperti (`elementFromPoint`, giocatore e master); intestazione del Tavolo su **una riga** (64 px;
  prima di questo giro andava su due, 105 px).
- «Entra al Tavolo» a 390: finisce a 645 px, dentro i primi 844.
- Nessuno scorrimento orizzontale a 390 e a 1440 su Inizio, Scheda (anche Magie e Inventario),
  Tavolo, finestra dell'iniziativa e menu della pedina; la tabella delle mosse della scheda ora sta
  nel suo pannello anche sul telefono (prima la colonna «Regola» usciva di 35 px e veniva tagliata).
- Bersagli: nessun comando sotto i 40 px nel Tavolo, sull'Inizio, in Magie; nella Scheda restano solo
  quelli che ha anche «Attuale» (parole del compendio dentro le frasi, collegamenti alle fonti), e
  sulla mappa del master i punti di viaggio e le porte, come in «Attuale».
- Fuoco da tastiera: anello pieno da 3 px #D1BBDC, dentro il controllo su gettoni e righe dei turni.
- Senza colori: la sotto-sezione aperta della scheda si distingue come il filtro scelto (fondo più
  chiaro, filo da 2 px, pallino).
- Verifica dei valori: **0 testi sotto AA** su 1218 (vedi «Coerenza (I-250)»).
- `node --test design/blueprint/tests/*.test.mjs`: 2688 su 2688; Prettier pulito sui file di questa
  opzione; nessun `!important`, nessun `text-transform`, solo `content: ""`; ogni selettore
  comincia con il prefisso dell'opzione.

## Giro di correzioni (01/10/2026)

Le osservazioni della revisione indipendente e cosa è stato fatto. Nessuna respinta.

| Sigla   | Osservazione                                                                          | Correzione                                                                                                                                                                                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R20-01  | Sul telefono «Termina turno» andava a capo: barra 201 px, zoom e due ritratti coperti | Caselle dei comandi a 4 px l'una dall'altra e «Termina turno» con 12 px ai lati: torna nella riga, barra 153 px, niente coperto. Il titolo della scena a 16 px rimette titolo e stato su una riga, come «Attuale».                                                                                                                                |
| R20-02  | Il filtro scelto della scheda si distingueva solo per la tinta                        | Rosso pieno #B52222, filo rosso chiaro #E16363 da 2 px, pallino bianco davanti; la linguetta inclinata scelta ha un piede rosso chiaro da 3 px.                                                                                                                                                                                                   |
| R20-03  | Anello del fuoco tagliato sulle righe dei turni e sulla seconda riga della barra      | Anello disegnato dentro il controllo (come l'anello interno di «Grimoire») su gettoni, «Mosse» e righe dei turni.                                                                                                                                                                                                                                 |
| R20-04  | La mappa non arrivava ai bordi: striscia nera a destra e fascia in basso              | La mappa va dalla colonna al pannello laterale e al bordo in basso; lo spazio per la barra è dentro la mappa, così «Centra la scena» la tiene libera. Gli avvisi della sessione si spostano a sinistra dello zoom. Vedi «Differenze dichiarate» 7.                                                                                                |
| R20-05  | Viola e lilla dentro la scheda rossa e oro                                            | Avviso delle magie, collegamenti, termini del compendio, sommari, caselle di spunta, interruttori, «Attacco / Scatto…», usi «×3», monete d'oro e glifi degli oggetti in rosso e oro.                                                                                                                                                              |
| R20-06  | Comandi senza cornice rientrati di 16 px rispetto al bordo                            | I comandi terziari che aprono una riga spostano il margine interno a sinistra (briciole, sensi e velocità, «+ Condizione», «Ultima mossa», «Riposi» sul telefono, «Registra concentrazione»…); i comandi dell'intestazione della scheda diventano pulsanti contornati come «Level Up»; nelle caselle dell'inventario le parole partono dal bordo. |
| R20-07  | Stessi elementi con misure diverse                                                    | Gettoni della barra tutti 44 px; margini simmetrici della barra e della riga dei dadi; tolta l'eccezione 14 px della targa della scena; un solo comando terziario; un solo gettone piccolo 24 px; un solo titolo di pannello 20 px; caselle della fascia su una griglia comune con i valori allineati.                                            |
| R20-08  | Parole che andavano a capo o tagliate                                                 | Pulsanti del pannello della creatura in una colonna; abilità su una riga; comandi dell'inventario su una riga; comandi della scena del master su una riga sul telefono; primo gettone della barra intero sul telefono.                                                                                                                            |
| Piccole | Interlinee e spaziature rimaste da oggi                                               | Interlinee portate sulla scala (6 rapporti invece di 10); «Tutte» accanto alle linguette con la stessa spaziatura.                                                                                                                                                                                                                                |

## Secondo giro di rifinitura (01/10/2026)

Le osservazioni della seconda verifica indipendente (`notes/open-items-round2.json`, voce `roll20`)
e il passaggio I-250 sullo strumento di verifica e sul campionario. Nessuna respinta.

| Voce                   | Osservazione                                                                                                                                   | Correzione                                                                                                                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prove vecchie          | 11 delle 18 schermate erano più vecchie di `direction.css`                                                                                     | Tutto il giro 1 (15 schermate e il foglio di contatto) rifatto dopo l'ultima modifica (11:46), e i 12 montaggi in `_pairs/`                                                                                                                                                                          |
| R20-05 (resto)         | Lilla rimasto nella scheda: caselle d'uso limitato, sotto-sezioni (pastiglia lilla), barra dei progressi, collegamenti della storia            | Caselle con il filo rosso chiaro e piene rosse se spese; sotto-sezioni come i filtri (rosso pieno, filo, pallino, angoli da 4 px); barra d'oro; collegamenti rossi; anche i segni dei progetti, il registro e la cornice scelta. Prova: nessun valore viola o lilla nelle sette sezioni della scheda |
| Linguette del telefono | «Tutti» e «Mappa» 5 px più in basso delle altre; un pezzo di «Esp» tagliato accanto a «Tutti»                                                  | La barra tiene la cornice dell'app (6 × 8 px) con il filo disegnato dentro: tutte le linguette alte 52 px sulla stessa riga (icona a 794, parola a 816); le linguette tengono i 6 px ai lati, così la striscia finisce oltre una linguetta intera                                                    |
| Targa del master       | Il muro della mappa passava tra «Scene · Riposi · Tempo» (3,2:1)                                                                               | La targa è una finestra opaca come la Turn Order; nella vista del master è larga quanto la sua riga più lunga e non passa più sotto l'avviso della sessione                                                                                                                                          |
| Difetti ereditati      | Nomi dei tiri salvezza 8 px sopra il valore; «Correggi risorsa» a due rientri; «Dettagli / Riponi» 17 px a destra; simboli di viaggio sotto AA | Nomi centrati sulla riga (stessa linea di valore e stella); «Correggi risorsa» sotto il suo slot con le parole sul bordo; comandi delle righe dell'inventario sul bordo; simboli di viaggio bianchi su disco nero                                                                                    |
| Garanzia (trovata ora) | Sul telefono l'intestazione del Tavolo andava su due righe (105 px)                                                                            | Una riga sola come «Attuale» (64 px): vedi «Differenze dichiarate» 14                                                                                                                                                                                                                                |
| I-250                  | Varianti e valori fuori scala (vedi «Coerenza»)                                                                                                | Glifi da 20 px, stati dei pulsanti della scheda, caselle della fascia sul telefono, riga della finestra dell'iniziativa allineata sotto il nome, piede delle finestre e titoli che vanno a capo per pulsanti interi, nastro dimostrativo a 96 px                                                     |

Restano come in «Attuale», perché sono della disposizione dell'app e non di questa opzione: le porte
e i punti di viaggio con un'area più piccola di 40 px sulla mappa del master; l'avviso «Sessione
non avviata» sotto i ritratti dei turni nella vista del master sul telefono; sul telefono la
striscia delle sezioni della scheda scorre e taglia la sezione vicina a quella aperta, come oggi.

## Licenze e attribuzioni

**Icone** (`icons.mjs`; percorsi copiati senza modifiche, cambia solo il riquadro, reso quadrato con
il 10 % di margine):

- Font Awesome Free 6.7.2 di Fonticons, Inc. (<https://fontawesome.com>), icone sotto licenza
  **CC BY 4.0** (<https://creativecommons.org/licenses/by/4.0/>), dal pacchetto npm
  `@fortawesome/fontawesome-free@6.7.2`, `svgs/solid/`: house, user, users, book-open,
  magnifying-glass, note-sticky, bell, gear, arrow-left, play, plus, rotate-left, map, dice-d20,
  arrow-pointer, check, xmark, bars, eye-slash, bag-shopping, location-dot, clock, circle-question,
  paintbrush, shapes, ruler-vertical, crown, table-columns, comments, scroll, clone, list-ol, coins,
  image, table-cells-large, cloud, dungeon, lightbulb.
- game-icons.net «gladius» di **Skoll** (<https://game-icons.net/1x1/skoll/gladius.html>), licenza
  **CC BY 3.0** (<https://creativecommons.org/licenses/by/3.0/>), dal pacchetto npm
  `@iconify-json/game-icons@1.2.4`: la spada (Font Awesome Free non ne ha una).
- Il file che genera `icons.mjs` è
  `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-roll20/gen-icons.py`.

**Caratteri** (SIL Open Font License 1.1; file woff2 senza modifiche, latin e latin-ext, dai
pacchetti npm `@fontsource-variable/*` alla versione **5.3.0**; ogni cartella ha il suo `OFL.txt` da
`google/fonts` al commit `9710da1eacb3be272583c3224dcb70f9da6eadbb`; righe in
`assets/ATTRIBUTION.md`):

| Cartella             | Carattere                             | Copyright                                                                                  |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `fonts/nunito/`      | Nunito (variabile, peso 200–1000)     | Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito)          |
| `fonts/figtree/`     | Figtree (variabile, peso 300–900)     | Copyright 2022 The Figtree Project Authors (https://github.com/erikdkennedy/figtree)       |
| `fonts/roboto-mono/` | Roboto Mono (variabile, peso 100–700) | Copyright 2015 The Roboto Mono Project Authors (https://github.com/googlefonts/robotomono) |

sha256: `nunito-latin-wght-normal.woff2` ba344451…cac793, `nunito-latin-ext-wght-normal.woff2`
2c8d7928…160960, `figtree-latin-wght-normal.woff2` 4ba7d3d0…6462dd,
`figtree-latin-ext-wght-normal.woff2` bf7828e2…f65965, `roboto-mono-latin-wght-normal.woff2`
b81cd551…631faf, `roboto-mono-latin-ext-wght-normal.woff2` 4cc0d52e…c43b922.

**Immagini:**

| File                     | Che cos'è                                                       | Origine                                                                                                                                                                                                                                   | Licenza                         | sha256                                                           | Modifiche |
| ------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------- | --------- |
| `assets/game-cover.webp` | Copertina della partita sull'Inizio: un libro magico che brilla | Tavola del proprietario `candidates/plates/login.webp` (riga 37 di `candidates/MANIFEST.md`, verdetto **SAFE**; generata dal proprietario con gpt-image via ChatGPT, C2PA nel master `PROMPT_14.png`; spedita da d20 Folio main 5b7f2a8b) | Arte originale del proprietario | 549bbbaa929d3666d3239b931093b5265b32874041595d21465bb71ec3324654 | nessuna   |

I ritratti e la mappa dipinta sono l'arte di esempio comune a tutte le opzioni
(`directions/sample.css`, `assets/ATTRIBUTION.md`). Le due forme rosse dietro la scheda e il
contorno dello scudo della CA sono figure geometriche disegnate per questa opzione dentro
`direction.css`. Nessun pixel, carattere, logo, mascotte o illustrazione di Roll20 è nel progetto.
