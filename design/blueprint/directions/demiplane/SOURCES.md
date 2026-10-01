# Opzione 9 · Demiplane — fonti, coppie, differenze, licenze

Fase C, round 1 «Scelta 1 — Direzione» (I-248), 01/10/2026. Pelle di sviluppo attiva con
`http://127.0.0.1:8881/?direction=demiplane`. File: `direction.css` (solo regole con prefisso
`:root[data-direction="demiplane"]`, solo tema scuro), `icons.mjs`, `assets/`. Immagini di
riferimento (solo consultazione, mai nel repository):
`~/Workspace/Codex/d20-studio-visual-assets/references/demiplane/` (`facts.md`, `manifest.md`).
Schermate della nostra app: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round1/demiplane/`
(coppie affiancate in `_pairs/`, rifatte con `probe-demiplane/polish3/pairs.sh`).

## In tre righe

1. Copia la scheda digitale di Demiplane (le «Nexus» di Pathfinder 2e, Cyberpunk RED, Vampire,
   Marvel): colonna incorniciata al centro sopra un'illustrazione scurita, riquadri grigio antracite
   con la linguetta nera del titolo in maiuscole incise, valori grandi dentro piccoli tasselli neri.
2. Intorno c'è il sito Demiplane: barra nera alta 80 px con il campo di ricerca bianco e un solo
   pulsante blu; l'Inizio è una pagina piatta come le Nexus (illustrazione dietro il titolo,
   sezioni divise da un filo, titoli Barlow, scheda quadrata con il nome sotto, linguetta «All
   Games» in azzurro); le finestre si aprono come un cassetto da destra.
3. Si sente come uno strumento digitale moderno e ordinato, più «app» che «libro»: nero, blu, oro e
   un tocco di verde; Demiplane non ha un tavolo virtuale, quindi il nostro Tavolo indossa la
   grammatica della sua scheda, come quando la scheda Demiplane si apre dentro Roll20.

## Sistema unico (I-250)

Ogni valore viene da queste scale, copiate dal prodotto (fonti in `facts.md` §1.3–1.4 e nel
foglio CSS pubblico estratto in `demiplane-code-css-excerpts-2026-10-01.txt`):

| Scala                 | Valori                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spazi                 | 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px (griglia da 8 di MUI, la libreria di Demiplane)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Testo                 | 12 · 14 · 16 · 18 · 24 · 28 · 48 px (11 solo per le etichette della barra del Tavolo sul telefono, dell'app); interlinea 1 (etichette di una riga nelle tessere), 1,2 (titoli, etichette, valori), 1,5 (testo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Maiuscole             | Barlow Condensed in maiuscoletto (`all-small-caps`) un gradino sopra: micro-etichetta 14 (≈ 7 px, come le maiuscole da 10 px di Demiplane), etichetta-tag 16, pulsante e linguetta 18; Cinzel è già un carattere a sole maiuscole                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Voci dei pulsanti     | Due sole: il sito (Barlow 14/600 come scritto; #006FB8 l'unico pulsante d'azione) e il gioco (maiuscolo condensato; il primario è il blu dei dadi #3276B5; i pulsanti «fantasma» sono parole d'azione sul bordo della colonna)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Raggi                 | 4 (pulsanti, menu, etichette, tasselli) · 8 (riquadri, righe) · 10 (angoli alti della linguetta) · 12 (schede con immagine) · 16 (tooltip) · 24 (pillole) · cerchio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Bordi                 | 1 px linee (campi #8D8D8D, ≥ 3:1 sul fondo); 2 px sottolineatura attiva, cornice, ritratto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Altezze dei controlli | 24 (ogni etichetta-tag) · 40 (il nostro minimo tattile; il pulsante Demiplane è 38; campi, tasselli, righe dei menu, condizioni) · 44 (la tessera della barra delle azioni, «Mosse» e, sul telefono, la tendina dei dadi accanto a loro; le righe del menu nel foglio del telefono, dell'app) · 48 (dado blu e cerchi dei dadi; la linguetta MUI dell'Inizio) · 56 (barra delle schede) · 84 (riquadri dell'ordine dei turni, 112 quello di turno) · 96 (ritratti del gruppo)                                                                                                                                                                                                                                                                                  |
| Caratteri             | Barlow (cornice del sito), Roboto (testo e campi), Barlow Condensed 600/700 (etichette, pulsanti di gioco), Cinzel 700 (titoli dei riquadri e nome sulla Scheda, titolo della scena all'Inizio)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Una ricetta per tipo  | Pulsante di gioco 40 px, 18/700 maiuscoletto, 8 × 16; pulsante del sito Barlow 14/600, 8 × 16 (anche i collegamenti azzurri); linguetta 18/700 maiuscoletto con 12 px ai lati (56 px nella barra della Scheda, 40 nelle altre); etichetta-tag 24 px, 16/700, 0 × 8, raggio 4; campo di testo 40 px, Roboto 16, 0 × 12 (anche le tendine); campo numerico (d20 dell'iniziativa, ±PF) Barlow Condensed 18/700 centrato, 0 × 8 (24 nel campo alto della fascia); interruttore MUI: pallino chiaro su binario bianco al 30 %, blu dei dadi quando è acceso; condizione attiva 40 px, 18/700 maiuscoletto, 0 × 12; riga di menu 40 px (44 nel foglio del telefono); titoletto di gruppo 18/700 grigio con filetto (anche «Abilità aggiuntive» e «Modifiche del DM») |

Verifica con lo strumento di audit (`changes/visual-01/audit`, 10 stati × 2 larghezze): numeri
prima e dopo il terzo giro di rifinitura in «Coerenza (I-250)» qui sotto. Restano fuori scala
solo i valori strutturali o vincolati dell'app elencati in «Differenze dichiarate».

## Coerenza (I-250)

Audit dei valori (`node changes/visual-01/audit/audit.js --direction demiplane`, 20 stati, tema
scuro). «Prima» è l'audit delle 13:01 del 01/10 (rilanciato dalla verifica indipendente dopo il
secondo giro; `direction.css` delle 12:29), «dopo» quello delle 14:18, lanciato dopo l'ultima
modifica di `direction.css` (14:11). Rapporto completo:
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/audit/demiplane/audit.md`; copia del
«prima» in `probe-demiplane/polish3/audit-before.md`. Il secondo giro aveva già portato gli spazi
da 32 a 23 valori, i fuori scala da 20 a 11 e le varianti dei pulsanti da 91 a 82.

| Misura                                        | Prima (13:01)                                                             | Dopo (14:18)                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Elementi visibili                             | 2548                                                                      | 2548                                                                                            |
| Spazi (padding, margini, gap)                 | 23 valori; passo 4 px sul 100 %; 11 fuori scala                           | 23 valori; passo 4 px sul 100 %; 11 fuori scala (geometria dell'HUD, marchio, parole di regola) |
| Altezze dei controlli                         | 16 (83 e 87 fuori griglia: turni e ritratto di Doran)                     | 14 (turni 84, ritratti 96)                                                                      |
| Caratteri                                     | 5 famiglie, 12 dimensioni, 3 pesi, 27 interlinee, 16 spaziature, 88 stili | 5 famiglie, 12 dimensioni, 3 pesi, 28 interlinee, 14 spaziature, 82 stili                       |
| Raggi · bordi · ombre                         | 7 · 2 · 14                                                                | 7 · 2 · 14                                                                                      |
| Colori (testo · fondo · bordo)                | 12 · 28 · 18                                                              | 12 · 28 · 18                                                                                    |
| Pulsanti: varianti (classi con più varianti)  | 82 (16)                                                                   | 79 (16)                                                                                         |
| Campi · tendine · linguette · righe di menu   | 4 · 2 · 10 · 2                                                            | 4 · 2 · 10 · 2 (un tipo per variante: numerico, testo, ricerca, ±PF alto)                       |
| Pulsanti con il padding di Chromium `1px 6px` | 0                                                                         | 0                                                                                               |
| Contrasto AA                                  | 0 errori, 0 incerti su 1192 testi                                         | 0 errori, 0 incerti su 1192 testi                                                               |

Le varianti che restano sono livelli di misura voluti: telefono e computer (barra delle azioni,
ritratti del gruppo, schede del menu, tendina dei dadi 14/16 px), il pulsante tondo dei dadi, il
grande «Termina turno», i riquadri della fascia (123 px, decisi dal riquadro dei PF), il campo ±PF
da 84 px, le due voci dei pulsanti (sito e gioco) e il marchio d20 (Fase D). Il campionario dei
componenti (`directions/specimen.html?direction=demiplane`, prove in
`probe-demiplane/polish3/specimen-before/` e `specimen-after/`) mostra le stesse ricette, anche
negli stati composti che l'esempio non raggiunge (condizioni attive, pagina «Barra rapida»,
pannello dei PF del Tavolo).

## Elemento → prodotto copiato → fonte

| Elemento della nostra app         | Cosa copia (prodotto)                                                                                                                                                                                                          | Fonte (file di riferimento · URL originale, o prova)                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Barra in alto                     | Barra nera, filetto bianco al 12 %, voci Barlow 16/700 senza icone, pagina aperta con la riga #00ABFF di «All Games», hover #22B8CF (Demiplane)                                                                                | `demiplane-home-live-anon-1440x900.png`, `demiplane-home-live-games-select-nexus-1440x900.png` · https://app.demiplane.com/home, https://app.demiplane.com/games; CSS `navigation.css` (`--top-nav-button-hover-color`) |
| Ricerca e account                 | Campo bianco con lente; un solo pulsante blu #006FB8 (Sign up / Sign in)                                                                                                                                                       | stessi file · https://app.demiplane.com/home                                                                                                                                                                            |
| Campi                             | Campo MUI «outlined» sul nero #0F0F0F, filo #8D8D8D, azzurro al fuoco; le ricerche della scheda con la lente Material a sinistra (Filter…)                                                                                     | `demiplane-sheet-cyberpunk-desktop-2025.png` · https://www.demiplane.com/blog/cyberpunk-red-character-tools                                                                                                             |
| Palette                           | Pagina #1B1C22, riquadri #202020, tasselli #0F0F0F, grigio dadi #3F3F3F, oro #F1CE86, bronzo #917B52, blu dadi #3276B5 (Demiplane PF2e)                                                                                        | `facts.md` §1.1 (conteggi nel CSS della scheda PF2e, campioni a deviazione 0) · https://resources.demiplane.com/hubfs/pathfinder-character-sheet-1%20copy.jpg                                                           |
| Pulsanti                          | Sito: Barlow 14/600, raggio 4, 40 px, #006FB8; gioco: lastre nere in maiuscole condensate (REST, REFOCUS), primario blu dei dadi #3276B5, azioni di testo senza riquadro (+ ADD, MANAGE XP)                                    | `demiplane-sheet-crop-pf2e-header-stat-panels.png`, `facts.md` §8 (`--primary:#3276B5`) · https://resources.demiplane.com/nexus/pathfinder/character-tools/faqs                                                         |
| Etichette (tag)                   | Tutte in maiuscole condensate 16 px, raggio 4, fondo nero (RULE, tratti PF2e): «Cosciente», «Equipaggiato», «Trucchetto», «Solo campagna»                                                                                      | `demiplane-dialog-live-daggerheart-rule-tooltip-1440x900.png`, `demiplane-sheet-crop-pf2e-rules-drawer.png`                                                                                                             |
| Riquadri con linguetta            | Corpo #202020 sotto la linguetta nera con angoli alti da 10 px e titolo centrato in maiuscole incise (Taroca → Cinzel)                                                                                                         | `demiplane-sheet-crop-pf2e-header-stat-panels.png`; CSS `.sheet-box-component-header{background:#000;border-radius:10px 10px 0 0}` (`demiplane-code-css-excerpts-2026-10-01.txt` §4)                                    |
| Tasselli dei valori               | Etichetta minuscola grigia in maiuscolo sopra un valore grande in un tassello nero (MOD, FORT/REFLEX/WILL)                                                                                                                     | `demiplane-sheet-crop-pf2e-header-stat-panels.png`, `demiplane-sheet-cyberpunk-desktop-2025.png` · https://www.demiplane.com/blog/cyberpunk-red-character-tools                                                         |
| Punti ferita                      | Grappolo PF: campo ±PF a sinistra, CURA verde #29AC5E sopra DANNO rosso #8A3D37, valore corrente nel tassello                                                                                                                  | `demiplane-sheet-crop-pf2e-header-stat-panels.png`                                                                                                                                                                      |
| Schede (tab)                      | Barra #202020 da 56 px, maiuscole condensate grigie, scheda aperta bianca su riga oro da 2 px                                                                                                                                  | `demiplane-sheet-pf2e-desktop-roll-toast-dice-tray-rules-drawer-official.jpg` · https://resources.demiplane.com/nexus/pathfinder/character-tools/faqs                                                                   |
| Filtri                            | Pillole scure, quella scelta piena (oro, come la scheda attiva gialla di Cyberpunk)                                                                                                                                            | `demiplane-sheet-marvel-desktop-roll-result-power-drawer-2025.png`, `demiplane-sheet-cyberpunk-desktop-2025.png` · https://www.demiplane.com/blog/spider-verse-expansion-new-features                                   |
| Tipo d'azione                     | Etichetta di tratto PF2e: fondo #5E0000, filo oro, maiuscole (CONCENTRATE, EXPLORATION)                                                                                                                                        | `demiplane-sheet-crop-pf2e-rules-drawer.png`                                                                                                                                                                            |
| Parole di regola                  | Verde #00BE77 con sottolineatura a puntini da 1 px; tooltip blu notte #0A0F21, filo #F3C267, raggio 16                                                                                                                         | `demiplane-dialog-live-daggerheart-rule-tooltip-1440x900.png` · https://app.demiplane.com/nexus/daggerheart/adversaries/acid-burrower                                                                                   |
| Finestre                          | Cassetto a destra a tutta altezza: testa #0F0F0F con titolo in maiuscole condensate e ✕, corpo #202020, piede con le azioni                                                                                                    | `demiplane-sheet-crop-pf2e-rules-drawer.png`, `demiplane-sheet-marvel-desktop-select-maneuver-drawer-2025.png` · https://www.demiplane.com/blog/spider-verse-expansion-new-features                                     |
| Menu                              | Tendina Demiplane: #1B1C22, raggio 4, ombra MUI 8, righe Barlow 14/700                                                                                                                                                         | `demiplane-home-live-games-menu-open-1440x900.png` · https://app.demiplane.com/home                                                                                                                                     |
| Avviso (toast)                    | Scheda del tiro: grigio #3F3F3F, filo bronzo, raggio 8                                                                                                                                                                         | `demiplane-dice-crop-pf2e-roll-toast-dice-tray.png`                                                                                                                                                                     |
| Inizio: titolo                    | «Select a NEXUS»: Barlow 48/700 sopra la pagina #1B1C22, illustrazione dietro il titolo che sfuma nella pagina                                                                                                                 | `demiplane-home-live-games-select-nexus-1440x900.png` · https://app.demiplane.com/games                                                                                                                                 |
| Inizio: sezioni                   | Pagina piatta, niente riquadri: titolo Barlow 24/700 a sinistra, contenuto sotto, filo da 1 px tra le sezioni; collegamenti in azzurro #00ABFF                                                                                 | `demiplane-home-campaign-page-cyberpunk-2026.jpeg` (JOB DETAILS / CHARACTERS / MEMBERS), `demiplane-home-live-games-select-nexus-1440x900.png`                                                                          |
| Inizio: schede a destra           | La linguetta «All Games»: Barlow 16/700 come scritto, aperta bianca su riga #00ABFF da 2 px                                                                                                                                    | `demiplane-home-live-games-select-nexus-1440x900.png`                                                                                                                                                                   |
| Inizio: «Continua a giocare»      | Scheda quadrata 200×200, raggio 12, nome sotto in Barlow 14/700; accanto il titolo dell'eroe della Nexus (maiuscole incise) e i due pulsanti                                                                                   | `demiplane-home-live-games-select-nexus-1440x900.png`, `demiplane-home-live-pathfinder-nexus-1440x900.png` · https://app.demiplane.com/nexus/pathfinder2e                                                               |
| Inizio: «Il tuo personaggio»      | Riquadro obliquo VIEW MY CHARACTERS: rosso #661D16, nome in maiuscole condensate, ritratto che sfuma a destra                                                                                                                  | `demiplane-home-live-pathfinder-nexus-1440x900.png` · https://app.demiplane.com/nexus/pathfinder2e                                                                                                                      |
| Inizio: «Nuova»                   | Etichetta RULE: verde #48D18C, maiuscole                                                                                                                                                                                       | `demiplane-dialog-live-daggerheart-rule-tooltip-1440x900.png`                                                                                                                                                           |
| Scheda: fascia dei valori         | Ogni riquadro ha le stesse tre righe: micro-etichetta grigia su una riga, tassello nero 52×40, didascalia; tutti i valori (anche la stella dell'ispirazione e i PF) su una linea                                               | `demiplane-sheet-crop-pf2e-header-stat-panels.png` (FORT / REFLEX / WILL)                                                                                                                                               |
| Scheda: colonna                   | Colonna centrata con cornice sopra l'illustrazione scurita a tutta larghezza                                                                                                                                                   | `demiplane-sheet-pf2e-desktop-roll-toast-dice-tray-rules-drawer-official.jpg`, `demiplane-sheet-cyberpunk-desktop-2025.png`                                                                                             |
| Scheda: intestazione              | Ritratto tondo con anello oro, nome in maiuscole incise 28 px, sottotitolo grigio in maiuscole, comandi come lastre nere                                                                                                       | `demiplane-sheet-crop-pf2e-header-stat-panels.png`                                                                                                                                                                      |
| Scheda: liste                     | Nome su una riga (16 px condensato) con la caratteristica grigia accanto, centrato sul tassello del valore; righe tutte da 44 px; sottogruppi grigi con filetto (TRAINED SKILL ACTIONS)                                        | `demiplane-sheet-pf2e-desktop-roll-toast-dice-tray-rules-drawer-official.jpg`, `demiplane-sheet-cyberpunk-desktop-2025.png` («ATHLETICS(DEX)»)                                                                          |
| Scheda: competenza                | Segno di grado PF2e: anello vuoto / disco oro / doppio anello                                                                                                                                                                  | `demiplane-sheet-crop-pf2e-header-stat-panels.png` (T/E sotto FORT/REFLEX/WILL)                                                                                                                                         |
| Scheda (telefono): colonna        | Una colonna a tutta larghezza con 8 px ai lati, senza cornice; intestazione compatta: ritratto 48 a sinistra, nome e righe accanto                                                                                             | `facts.md` §3 (`.mobile-bottom-content{padding:8px}`), `demiplane-sheet-marvel-phone-official.png`                                                                                                                      |
| Scheda (telefono): schede         | Contenitore arrotondato da 56 px (raggio 24, #0F0F0F al 90 %) su una propria striscia opaca #202020: il contenuto scorre sotto, mai attraverso                                                                                 | `facts.md` §3 (CSS `border-radius:24px; background: rgba(15,15,15,.9)`), `demiplane-sheet-pf2e-desktop-and-phone-occult-theme-official.png`                                                                             |
| Tavolo: barra della scena         | Linguetta nera con il nome in maiuscole condensate (titolo del cassetto)                                                                                                                                                       | `demiplane-sheet-crop-pf2e-rules-drawer.png`                                                                                                                                                                            |
| Tavolo: barra laterale            | Il cassetto delle regole: testa #0F0F0F con la creatura, sezioni sotto micro-etichette grigie (NOTES, COMPENDIUM)                                                                                                              | `demiplane-sheet-crop-pf2e-rules-drawer.png`, `demiplane-sheet-vampire-desktop-roll-history-rules-drawer-2025.png` · https://www.demiplane.com/blog/demiplane-q1-2025-review                                            |
| Tavolo: barra delle azioni        | Riquadro #202020; risorse e dadi come linguette nere sul bordo alto; azioni come tessere da 44 px con la micro-etichetta (14 px) in alto e il nome al piede; una sola voce condensata anche per «Dadi», la tendina e i PF      | `demiplane-table-dc20-sheet-in-roll20-action-points-2025.jpg` · https://www.demiplane.com/blog/dc20-nexus-now-available                                                                                                 |
| Tavolo: comandi del turno         | Fila dei dadi: cerchi grigi da 48 px, «Tira i dadi» come il pulsante tondo blu #3276B5 con alone; Termina turno lastra dello stesso blu (--primary)                                                                            | `demiplane-dice-crop-pf2e-roll-toast-dice-tray.png`; CSS `.dice-roller__fab circle{fill:rgb(50,118,181)}`                                                                                                               |
| Tavolo: ordine dei turni e gruppo | Ritratti tondi con anello (party blu, nemici rossi e tratteggiati), turno attuale incorniciato d'oro                                                                                                                           | `demiplane-sheet-daggerheart-in-roll20-vtt-garrick-2025.jpeg` · https://www.demiplane.com/blog/new-update-for-daggerheart-vtt-experience                                                                                |
| Tavolo: strumenti mappa e zoom    | Riquadri #202020 con icone Material piene bianche, strumento scelto pieno di blu                                                                                                                                               | `facts.md` §7 («a thin left rail of Material icons»), `demiplane-sheet-daggerheart-in-roll20-vtt-garrick-2025.jpeg`                                                                                                     |
| Finestra dell'iniziativa          | Cassetto a destra largo 30 vw (440 px al massimo); righe scure (raggio 8); totale in Barlow Condensed 28 oro come «RESULT 25»; «Tira tutti» blu, «Tira PNG» e «Nessuno» la stessa lastra nera; avviso nel filo oro del tooltip | `demiplane-sheet-marvel-desktop-select-maneuver-drawer-2025.png`, `demiplane-dice-crop-pf2e-roll-toast-dice-tray.png`                                                                                                   |
| Menu della pedina                 | Tendina #1B1C22 con testa #0F0F0F, ritratto ad anello e nome in maiuscole condensate (menu ≡ del personaggio)                                                                                                                  | `demiplane-home-live-games-menu-open-1440x900.png`, `demiplane-dialog-vampire-character-sharing-theme-picker-official.png` · https://resources.demiplane.com/nexus/vampire/tools/character-tools-overview               |
| Icone                             | Material Symbols piene (le icone MUI «Filled» di Demiplane)                                                                                                                                                                    | `facts.md` §1.5 (`data-testid="SearchIcon"`, `MenuIcon`, `HomeIcon` nel DOM)                                                                                                                                            |

## Coppie per il confronto

Ogni coppia è un montaggio in `round1/demiplane/_pairs/` (la nostra schermata a sinistra).

| Stato                    | Nostra schermata                                | Riferimenti migliori                                                                                                                            |
| ------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Inizio                   | `home-dark-1440-demiplane.png`                  | `demiplane-home-live-games-select-nexus-1440x900.png`, `demiplane-home-campaign-page-cyberpunk-2026.jpeg`                                       |
| Inizio (telefono)        | `home-dark-390-demiplane.png`                   | `demiplane-home-live-games-select-nexus-390x844.png`, `demiplane-home-live-anon-390x844.png`                                                    |
| Scheda                   | `sheet-dark-1440-demiplane.png`                 | `demiplane-sheet-pf2e-desktop-roll-toast-dice-tray-rules-drawer-official.jpg`, `demiplane-sheet-crop-pf2e-header-stat-panels.png`               |
| Scheda (telefono)        | `sheet-dark-390-demiplane.png`                  | `demiplane-sheet-pf2e-desktop-and-phone-occult-theme-official.png`, `demiplane-sheet-marvel-phone-official.png`                                 |
| Tavolo                   | `table-combat-dark-1440-demiplane.png`          | `demiplane-sheet-daggerheart-in-roll20-vtt-garrick-2025.jpeg`, `demiplane-dice-crop-pf2e-roll-toast-dice-tray.png`                              |
| Tavolo (DM)              | `table-combat-dm-dark-1440-demiplane.png`       | `demiplane-table-daggerheart-adversary-sheet-and-compendium-in-roll20-2025.jpeg`, `demiplane-table-dc20-sheet-in-roll20-action-points-2025.jpg` |
| Tavolo (telefono)        | `table-combat-dark-390-demiplane.png`           | `demiplane-sheet-marvel-phone-official.png`, `demiplane-dice-crop-pf2e-roll-toast-dice-tray.png`                                                |
| Tavolo in esplorazione   | `table-explore-dark-1440-demiplane.png` (e 390) | `demiplane-sheet-crop-pf2e-rules-drawer.png`, `demiplane-sheet-daggerheart-in-roll20-vtt-garrick-2025.jpeg`                                     |
| Scheda · Magie           | `sheet-spells-dark-1440-demiplane.png` (e 390)  | `demiplane-sheet-vampire-desktop-roll-history-rules-drawer-2025.png`, `demiplane-sheet-cyberpunk-desktop-2025.png`                              |
| Scheda · Inventario      | `sheet-inventory-dark-1440-demiplane.png`       | `demiplane-sheet-cyberpunk-desktop-2025.png`, `demiplane-sheet-marvel-desktop-roll-result-power-drawer-2025.png`                                |
| Finestra dell'iniziativa | `dialog-initiative-dark-1440-demiplane.png`     | `demiplane-sheet-marvel-desktop-select-maneuver-drawer-2025.png`, `demiplane-sheet-crop-pf2e-rules-drawer.png`                                  |
| Menu della pedina        | `token-menu-dark-1440-demiplane.png`            | `demiplane-home-live-games-menu-open-1440x900.png`, `demiplane-dialog-vampire-character-sharing-theme-picker-official.png`                      |

In più: `_pairs/08b-…` e `09b-…` (le stesse coppie sul telefono), `_pairs/13-tooltip-e-dadi.png`
(parole di regola, tooltip e cronologia dei tiri:
`demiplane-dialog-live-daggerheart-rule-tooltip-1440x900.png`,
`demiplane-dice-crop-vampire-roll-history-pool.png`) e `_pairs/14-campagna-nexus.png` (l'Inizio
piatto accanto a `demiplane-home-campaign-page-cyberpunk-2026.jpeg` e
`demiplane-home-live-pathfinder-nexus-1440x900.png`).

## Differenze dichiarate

1. **Demiplane non ha un tavolo virtuale.** Pedine, ordine dei turni, colonna degli strumenti e
   zoom nei riferimenti sono di Roll20, non di Demiplane. Il nostro Tavolo usa la grammatica della
   scheda Demiplane (riquadri con linguetta, tasselli, cassetto, fila dei dadi), come quando la
   scheda Demiplane si apre dentro Roll20; non è una copia di un tavolo Demiplane.
2. **Dadi e cronologia dei tiri.** Nessuna funzione aggiunta e nessun elemento spostato: «Tira i
   dadi» resta tra i comandi del turno, in basso a destra (in Demiplane il dock è in basso a
   sinistra); prende l'aspetto del pulsante tondo blu e gli altri comandi quello dei cerchi grigi
   dei dadi; «Termina turno» è la lastra dello stesso blu (il `--primary` del piano di copia). Sulla
   Scheda non esiste un dock fisso, quindi non c'è. Il pannello dei tiri e il risultato hanno lo
   stile della scheda del tiro, ma nessuno degli stati fotografati mostra un tiro aperto.
3. **Linguette nere, non blu notte.** Il CSS pubblico di Demiplane dà `#000` alla linguetta; la
   foto ufficiale PF2e mostra un tema blu notte (#1F2639 campionato). Si segue il CSS.
4. **Niente cornici ornate.** Le cornici dorate di Demiplane sono immagini proprietarie
   (`border-image`): qui sono un filo bronzo da 2 px (solo sul computer).
5. **Niente ≡ dopo il nome.** In Demiplane apre temi e condivisione; da noi lì non c'è un comando, e
   un ≡ disegnato sarebbe un falso pulsante. «Gestisci personaggio» resta in alto.
6. **CURA con la scritta nera.** Il verde campionato #29AC5E con la scritta bianca dà 2,9:1 (sotto
   AA); la scritta è #0F0F0F (6,5:1).
7. **Maiuscole sintetizzate.** Senza `text-transform` le maiuscole sono maiuscoletto
   (`all-small-caps`); Barlow Condensed non ha il maiuscoletto vero, quindi il browser lo ricava
   dalle maiuscole. Per questo ogni etichetta sta un gradino sopra la misura di Demiplane (la
   micro-etichetta a 14 px dà maiuscole da circa 7 px, come le sue da 10 px).
8. **Ricerca.** Il campo bianco della barra è il nostro pulsante di ricerca allargato (non vi è
   scritto nulla, apre la stessa ricerca); manca il selettore «All ▾».
9. **Altezze della cornice.** Barra 81 px a Inizio e Scheda e 63 px al Tavolo (Demiplane 80 e,
   sul telefono, 71): restano le nostre perché il Tavolo e i test ne dipendono; sul telefono la
   barra del Tavolo resta su una riga sola (63 px) come oggi, con 8 px ai lati. La colonna della
   Scheda è larga 1100 px (Demiplane ≈ 1030) perché sotto i 1100 px la scheda passa al layout
   stretto. Sul telefono la Scheda è su fondo scuro pieno, senza illustrazione (il testo fuori dai
   riquadri resta così sempre leggibile).
10. **Icone non sostituibili (limite noto).** Le icone delle righe del menu della pedina sono
    disegnate dall'app (`MENU_ICONS` in `token-menu.mjs`, fuori dalla portata di `icons.mjs`) e
    restano a tratto accanto ai glifi Material pieni: due famiglie nello stesso menu. Una maschera
    per riga si può fare (ogni riga ha il suo `data-token-menu-item`), ma serve un file Material per
    ciascuna delle dieci righe (cuore, fulmine, tavolozza, …) che questo giro non ha aggiunto al
    repository; resta per il round delle icone (Scelta 4). Quelle dei controlli di sessione, dello
    zoom e di «Mosse» sono già sostituite con maschere Material piene.
11. **Valori fuori scala lasciati di proposito (dell'app).** Nomi delle pedine a 13 px (fissati da
    una journey), segni sulla mappa (11–17 px), etichette della barra del Tavolo sul telefono a 11
    px, il marchio d20 (font, misure e colori: Fase D), i margini della mappa (76/88/152 px sul
    computer, 120 px sul telefono) e lo scostamento di 56 px dei turni sul telefono (geometria
    dell'HUD), la tessera da 44 px della barra delle azioni (due righe restano sotto i 120 px), il
    millimetro di spazio attorno alle parole di regola nel testo, i riquadri della fascia alti
    123 px (li decide il riquadro dei PF con il campo ±PF da 84 px). Sul telefono la barra delle
    azioni parla un gradino sotto (PF, tendina dei dadi e «Dadi» a 14 px, 16 dal computer a
    1440 px), le righe del menu della pedina sono da 44 px (la regola tattile dell'app) e la fila
    delle tessere si schiarisce del tutto negli ultimi 12 px (sfuma dai 24): della tessera tagliata
    dopo la prima resta solo un filo, mai lettere; la tendina dei dadi accanto alle tessere è alta
    44 px come loro.
12. **Cassetto solo da 721 px.** Sul telefono le finestre restano quelle dell'app (ricolorate). Il
    cassetto dell'iniziativa è largo 30 vw (al massimo 440 px, Demiplane 300–385): così ogni
    riga tiene nome, d20, tiro e totale; per starci la riga va su tre righe (chi, tiro, sorpresa)
    come sul telefono. Gli altri cassetti tengono la larghezza dell'app.
13. **Riquadro obliquo rosso.** Le tessere di Demiplane prendono il colore del gioco; qui il rosso
    della Nexus di Pathfinder (#661D16), l'unico rosso oltre alle etichette di tratto.
14. **Inventario.** Con la colonna più stretta le quattro caselle in alto vanno su due righe (lo
    fa il layout dell'app).
15. **Nomi lunghi nelle liste.** Le abilità stanno su una riga; un nome che non ci sta finisce con
    «…» (il nome intero resta nel nome accessibile del pulsante e nel suo tooltip). Con le misure
    di oggi nessun nome viene tagliato.
16. **Ispirazione eroica.** Perché la sua etichetta stia su una riga, nella fascia del computer il
    riquadro prende mezza colonna in più, tolta in parti uguali agli altri.
17. **Fuori ambito.** Il tema chiaro resta quello di oggi; contrasto elevato, palette per il
    daltonismo, carattere leggibile e movimento ridotto vincono sulla direzione. Demiplane non ha
    una scheda D&D: gli schemi d20 vengono da Pathfinder 2e, Cyberpunk RED e DC20.
18. **Difetto già presente.** Nel Tavolo del DM l'avviso «Sessione non avviata» copre in parte i
    ritratti dei turni, come nelle altre direzioni. Nelle schede Extra e Abilità i rimandi in riga
    «SRD 5.2.1 IT p. N» restano sotto i 40 px come oggi (Fase D, dell'app).
19. **Linguette dell'Inizio a 48 px.** Le schede «Novità · Guide · Supporto» sono la Tab MUI del
    sito (48 px, 16 px ai lati, Barlow 16/700 come scritto), non la linguetta di gioco da 40: due
    voci, come i pulsanti.
20. **Barra rapida.** Le due tendine della pagina «Barra rapida» parlano a 14 px anche a 1440 (la
    tendina dei dadi della testata è 16): così gli strumenti finiscono dentro la barra (oggi
    «Normale» e il pulsante delle opzioni restano tagliati).

## Terzo giro di rifinitura (01/10, verifica indipendente e I-250)

| Rilievo                                                      | Cosa è cambiato                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Copia» 30 px nell'elenco Personaggi (garanzia)              | Le azioni di testo hanno un minimo di 40 px e i collegamenti delle schede personaggio tengono i loro 8 × 12: «Copia» torna 54 × 44 a 1440 e a 390; nessun bersaglio sotto i 40 px in `#characters` (`probe-demiplane/polish3/chars-live.txt`)                                                     |
| ±PF del pannello Creatura con il padding di Chromium (basso) | Ricetta unica del campo numerico: d20 dell'iniziativa e ±PF (scheda, pannello Creatura, cassetti) in Barlow Condensed 700 centrato, 0 × 8; le tendine hanno lo 0 × 12 dei campi di testo                                                                                                          |
| Altezze miste nella fila del telefono (basso)                | La tendina dei dadi è alta 44 px come le tessere e «Mosse»; la fila delle tessere si schiarisce del tutto negli ultimi 12 px, così della tessera tagliata non restano lettere                                                                                                                     |
| I-250: ritratti del gruppo e turni                           | Ogni ritratto del gruppo 96 px (la barra dei PF tiene il suo posto anche quando il giocatore non la vede: Doran era 87); i riquadri dell'ordine dei turni 84 px (erano 83)                                                                                                                        |
| I-250: Inizio sotto la piega                                 | «Tutte le discussioni» è il collegamento azzurro come «Tutte le campagne» e «Tutti gli annunci» (era un pulsante bianco rientrato); «Novità precedenti» e le altre pieghe in azzurro (erano oro Roboto); «Accesso rapido» è una sezione piatta come le vicine (era un riquadro con titolo Cinzel) |
| I-250: Scheda sotto la piega                                 | «Abilità aggiuntive» e «Modifiche del DM» come titoletto di gruppo (erano in Barlow); i due interruttori uguali (Roboto 16/700, binario MUI, blu se acceso: quello del DM era oro); risorse del turno nella voce della barra delle azioni; testo «offline» allineato sulla riga                   |
| I-250: componenti composti del campionario                   | Condizioni attive come chip di gioco 40 px (erano la lastra bronzo dell'app in Roboto); pieghe del widget PF in maiuscoletto di gioco; pagina «Barra rapida» con pillola, lastre e tendine della barra delle azioni (era una pillola Cinzel e tendine Roboto 16 che uscivano dalla barra)         |
| I-250: dettagli tipografici                                  | Spaziatura impostata dove si imposta la misura (abilità nelle righe, colonne dell'inventario, conteggi dei filtri, tasti), unità e denominatori nel peso 600 che il carattere usa davvero, tutti i titoli Cinzel a 0,04 em; 88 → 82 stili                                                         |

Prove: schermate del round 1 rifatte alle 14:11–14:13 dopo l'ultima modifica di `direction.css`
(14:11:20; tutte aperte; due stati ripresi una volta per l'attesa di avvio del kit), coppie rifatte
alle 14:14 con `probe-demiplane/polish3/pairs.sh`, garanzie, axe e fuoco rifatti
(`round1/demiplane/*.txt`), audit delle 14:18, campionario prima e dopo.

## Secondo giro di rifinitura (01/10, verifica indipendente e I-250)

| Rilievo                                        | Cosa è cambiato                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schede della Scheda a 1440 (medio)             | Una sola ricetta per le linguette: 18/700 maiuscoletto con 12 px ai lati (erano 24 e 16): le sette categorie stanno nei 449 px accanto a «Tutte» (438 px), nessuna «N» tagliata; la stessa misura sul telefono                                                                                                                                                                                                                                 |
| `icons.mjs` nel tema chiaro (medio)            | `directionIcon` restituisce `null` con `data-pref-theme="light"`: nel tema chiaro 0 glifi Material su Inizio e Tavolo (prova in `probe-demiplane/polish2/shots-light/`)                                                                                                                                                                                                                                                                        |
| Barra del Tavolo su due righe a 390 (garanzia) | Era 105 px su due righe (l'«App» e la freccia con i 16 px del sito, 4 px tra le icone); ora 63 px su una riga come oggi: 8 px ai lati della barra e dei due pulsanti di testo, icone accostate                                                                                                                                                                                                                                                 |
| Icone del menu della pedina (basso)            | Limite noto, spiegato al punto 10 delle differenze                                                                                                                                                                                                                                                                                                                                                                                             |
| Scheggia di tessera nella barra a 390 (basso)  | La fila delle tessere sfuma negli ultimi 24 px: la tessera tagliata è un'ombra, la prima resta nitida                                                                                                                                                                                                                                                                                                                                          |
| Misure diverse dalle dichiarate (basso)        | Tendina dei dadi a 14 px sotto 1440 come i PF; ogni etichetta-tag 24 px, 0 × 8, raggio 4 (tratti compresi, prima raggio 0 e altezze 21/22/26); valore PF centrato sulla linea della fascia (434,4 come gli altri); righe del menu 40 px (44 sul telefono), mai 45                                                                                                                                                                              |
| Ritratto di Mira sotto la barra a 390 (basso)  | La colonna del gruppo finisce a y = 631, sopra la barra (634): la barra dei PF di Mira si vede                                                                                                                                                                                                                                                                                                                                                 |
| I-250: componenti dello stesso tipo            | Campi tutti da 40 px (ricerche, formula, PF del menu: erano 42); comandi del pannello Creatura in una colonna da 40 px (era un pulsante da 61 su due righe); nomi delle azioni 40 px come quelli dei tiri; pulsanti della testata sul telefono e delle novità con 16 px ai lati; collegamenti del sito 14/600 come i pulsanti; «Movimento» come gli altri titoletti di gruppo; linguette di sezione (Campagna) 18/700 come quelle della Scheda |
| I-250: margini fuori scala                     | 2 · 3 · 5 · 6 · 10 · 14 · 18 · 21 · 22 px dell'app portati sulla scala da 4 (caselle di spunta senza il margine di Chromium, separatori del menu, piede delle azioni, riquadri di Magie, barra della scena)                                                                                                                                                                                                                                    |

Prove: schermate del round 1 rifatte alle 12:29–12:30 dopo l'ultima modifica (tutte aperte),
coppie rifatte con `probe-demiplane/polish2/pairs.sh`, garanzie, axe e fuoco rifatti
(`round1/demiplane/*.txt`), audit delle 12:34.

## Correzioni del giro di revisione (01/10)

| Rilievo                            | Cosa è cambiato                                                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DMP-01 zoom coperto (telefono)     | Barra della scena 80 px (era 101), barra delle azioni 146 px (era 158), colonna del gruppo come l'app: i quattro comandi di zoom e Mira si toccano sopra la barra in tutti e tre gli stati |
| DMP-02 righe delle liste           | Nome su una riga a 16 px, caratteristica grigia a 14 px accanto, centrati sul tassello; tutte le righe 44 px                                                                               |
| DMP-03 valori della fascia         | Tre righe uguali in ogni riquadro; tutti i tasselli 52×40 centrati a y = 438 (a 1440), stella dell'ispirazione nel suo tassello                                                            |
| DMP-04 micro-etichette             | Un'unica micro-etichetta a 14 px in maiuscoletto (ARMI, INCANTESIMI, CA, PF TEMPORANEI, SOTTO IL TUO CONTROLLO, TURNO ATTUALE); nella barra il nome scende al piede della tessera          |
| DMP-05 schede sul telefono         | Striscia opaca #202020 dietro la pillola, schede a 16 px, la sottolineatura resta dentro la pillola                                                                                        |
| DMP-06 Scheda sul telefono         | Colonna a tutta larghezza (8 px), senza cornice; ritratto 48 a sinistra; le schede passano da y = 709 a y = 554                                                                            |
| DMP-07 barra delle azioni          | «Mosse» 44 px come le tessere; «Dadi», tendina e PF in Barlow Condensed; Termina turno nel blu #3276B5                                                                                     |
| DMP-08 bordi dei campi             | Filo #8D8D8D (4,9:1 su #202020); niente più grigio di Chromium nei d20; lente nelle ricerche                                                                                               |
| DMP-09 Inizio                      | Pagina piatta del sito (niente linguette nere né Cinzel nei titoli di sezione), schede in azzurro, immagini nuove non usate da altre opzioni                                               |
| DMP-10 cassetto dell'iniziativa    | 432 px a 1440 (era 600), totali Barlow Condensed oro, tre comandi coerenti, avviso blu notte con filo oro                                                                                  |
| DMP-11 pulsanti fantasma           | Senza riquadro né rientro: la parola parte dal bordo della colonna; dopo un altro comando 12 px di stacco                                                                                  |
| DMP-12 bordi dei riquadri fratelli | Riquadri degli slot a tutta larghezza; ricerche di Magie e Inventario a tutta riga; sul telefono il contenuto degli slot a sinistra                                                        |
| Voci dei pulsanti e tag (verdetto) | Due voci di pulsante; tutti i tag in maiuscole condensate 16 px; anche segmenti di indebolimento, proprietà delle armi, azioni generiche e comandi di sessione nella voce di gioco         |
| Bersagli sotto 40 px (verdetto)    | Il chip PF della barra, il filtro «Reazioni» e «Perché?» ora sono da 40 px                                                                                                                 |

Nessun rilievo respinto.

## Verifiche (01/10/2026, dopo il terzo giro)

- Barra delle azioni 113 px a 1440×900 (limite 120) in combattimento, DM ed esplorazione; nessuno
  scorrimento orizzontale a 390 e a 1440 in tutti i dieci stati (anche Scheda intera) e
  nell'elenco Personaggi; Termina turno, «Annulla preparazione» e «Annulla ultima modifica»
  visibili a 390 (in basso a 772 px su 844); «Entra al Tavolo» finisce a 733 px a 390; barra del
  Tavolo a 390 su una riga (63 px).
- Zoom e gruppo: i quattro comandi di zoom e i tre ritratti del gruppo rispondono al tocco in
  combattimento, DM ed esplorazione (a 1440 i ritratti a y = 580, 684, 788; a 390 il gruppo finisce
  a y = 631, la barra comincia a y = 634); coperti solo dal menu della pedina aperto (390) e dal
  cassetto dell'iniziativa, come prima.
- Bersagli: nessun controllo sotto i 40 px negli stati provati né in `#characters` («Copia»
  54 × 44).
- Fuoco da tastiera: anello di 3 px #00ABFF su ogni controllo raggiunto con Tab su Inizio, Scheda e
  Tavolo (63 su 63); la pedina mostra il suo anello tratteggiato dell'app.
- Contrasto: axe-core 4.13 (solo `color-contrast`) 0 violazioni in 18 prove (9 stati × 2
  larghezze); audit 0 testi sotto AA e 0 incerti su 1192; bordi dei campi ≥ 3:1 (WCAG 1.4.11).
- `node --test design/blueprint/tests/visual01-directions.test.mjs`: 7 superati; 667 regole, tutte
  con il prefisso e `:not([data-pref-theme="light"])`, nessun `!important`, `text-transform` o testo
  in `content` (`probe-demiplane/polish3/lint.txt`); Prettier pulito.
- Prove: `round1/demiplane/guarantees-demiplane.txt`, `axe-demiplane.txt`, `focus-demiplane.txt`;
  audit in `visual-01/audit/demiplane/audit.md`; sonde in `probe-demiplane/polish3/`.

## Licenze e attribuzioni

### Icone (`icons.mjs` e `assets/icons/`)

Google **Material Symbols Outlined**, riempimento 1, peso 400, 24 px, da
`github.com/google/material-design-icons` al commit `bd8cb85bd4bad964fe6918f79665bb40c3a8efef`
(`symbols/web/<nome>/materialsymbolsoutlined/<nome>_fill1_24px.svg`). Licenza **Apache 2.0**,
Copyright Google LLC: testo completo in `LICENSE-material-design-icons.txt` (sha256
`58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd`). Tracciati invariati; in
`icons.mjs` cambia solo l'involucro `<svg>` (contratto dell'app).

| Nome nell'app     | Simbolo                 | sha256 del file sorgente (inizio) |
| ----------------- | ----------------------- | --------------------------------- |
| `home`            | `home`                  | `620b857521b7a935…`               |
| `person`          | `person`                | `b65d8fd7c253e35a…`               |
| `campaign`        | `groups`                | `eefd1b20a6297b6d…`               |
| `book`            | `menu_book`             | `16265257ba0ad789…`               |
| `search`          | `search`                | `46d4ab85eba6eb4f…`               |
| `note`            | `description`           | `42697373fd050683…`               |
| `bell`            | `notifications`         | `f4b6af23e11cd4c2…`               |
| `settings`        | `settings`              | `e1e14b7ed71c13c9…`               |
| `arrow`           | `arrow_back`            | `bf55d4c9579f814d…`               |
| `play`            | `play_arrow`            | `49839f252bb80a61…`               |
| `plus`            | `add`                   | `e9532de2b9be01ce…`               |
| `undo`            | `undo`                  | `ed40d5c1ea954d7b…`               |
| `map`             | `map`                   | `2d7175be80c8f282…`               |
| `dice`            | `casino`                | `0667472f376358fb…`               |
| `move`            | `open_with`             | `f33774507ce9f034…`               |
| `sword`, `swords` | `swords`                | `975ecad4e590c731…`               |
| `check`           | `check`                 | `01edd53418816632…`               |
| `close`           | `close`                 | `a82592b0faa0b104…`               |
| `menu`            | `menu`                  | `30f1250c0ee5bfc0…`               |
| `eye`             | `visibility`            | `8cb10600688c2bbf…`               |
| `bag`             | `backpack`              | `f114545dd1fa99bc…`               |
| `flag`            | `flag`                  | `0e1df01995845fce…`               |
| `clock`           | `schedule`              | `a5221277f1863971…`               |
| `help`            | `help`                  | `c150a8294e9f63dc…`               |
| `pen`             | `edit`                  | `89aa5277c052286f…`               |
| `shape`           | `category`              | `006cf5efc2bc6c2a…`               |
| `ruler`           | `straighten`            | `17d2071deecc8b58…`               |
| `shield`          | `shield`                | `0e53c22070e96c95…`               |
| `panel`           | `view_sidebar`          | `af65e8421cdc0459…`               |
| `chat`            | `chat`                  | `8182a43fc015d417…`               |
| `scroll`          | `history_edu`           | `6028206a41baf5b6…`               |
| `cards`           | `style`                 | `609a236731ba9587…`               |
| `coins`           | `monetization_on`       | `6fb6068b498c05a7…`               |
| `image`           | `image`                 | `8c52a2c10ff52376…`               |
| `grid`            | `grid_view`             | `cec50e5b43006e08…`               |
| `fog`             | `cloud`                 | `bf80e3ef84946bee…`               |
| `light`           | `local_fire_department` | `cd58fa5af014bdd3…`               |
| `wall`            | `fence`                 | `1a06fb1be36ade8b…`               |

Maschere CSS (file copiati invariati, stessa origine e licenza):

| File                                   | Uso                               | sha256                                                             |
| -------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| `assets/icons/disabled_by_default.svg` | X-card (controlli di sessione)    | `a1ae6550f011afaea263ac1fc7b00af8e969e347baacb816dc332c904844e08f` |
| `assets/icons/drag_handle.svg`         | «Rallenta»                        | `f901fac8e2b6f9ec67c88e1bd02c7256c61f697c45eed29b9fb00e7da29abb56` |
| `assets/icons/back_hand.svg`           | «Alza la mano»                    | `10ea949dc79585509efd1c4163e9c3e8e8022b08f1d02ba1e130e7b6b4de44d4` |
| `assets/icons/expand_more.svg`         | freccia del menu di sessione      | `6760bd2307f7ec3c1a5f2905af907aa7a12ad5ad7448289c8624f5d5ec6057e4` |
| `assets/icons/person_search.svg`       | «Trova la mia pedina»             | `b222ba577d1af6abe1bc24d8d3e84925cd2c947af5f99f9c5641d4d419c2cf76` |
| `assets/icons/center_focus_strong.svg` | «Centra la scena»                 | `80225fb945f887697422afc77adcb418548fc96c67cebe9a4b6238289aab238c` |
| `assets/icons/sports_martial_arts.svg` | «Mosse»                           | `9491517a0d30c8fdc0648e3dffc57883f28890610c5292ee1373c68cf03131e5` |
| `assets/icons/search.svg`              | lente nelle ricerche della Scheda | `46d4ab85eba6eb4fe7c9a9a4c4db2fdf8fa9cc74c1f398ac72e7d872d490dd4c` |

### Caratteri (SIL Open Font License 1.1)

File woff2 invariati dai pacchetti Fontsource **5.3.0** (sottoinsiemi latin e latin-ext), ciascuna
cartella con il suo `OFL.txt` da `google/fonts` al commit
`9710da1eacb3be272583c3224dcb70f9da6eadbb`; riga aggiunta in `assets/ATTRIBUTION.md`. Nessun'altra
direzione li aveva già.

| Cartella                         | Pacchetto                                                                        | File · sha256                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `assets/fonts/barlow/`           | `@fontsource/barlow@5.3.0` — Copyright 2017 The Barlow Project Authors           | `barlow-latin-600-normal.woff2` `4b52ddd4836b592df0e4832b8286956883cdc651b015126bdd18f184b7f90cc3` · `barlow-latin-ext-600-normal.woff2` `b7f099c421968b583734bc631e6706bff8fc23908112a219f5f0e37f59b03b32` · `barlow-latin-700-normal.woff2` `2d797dd8b35dcb3413e1af9d7052b3f4f8c341a147cdcb01f4f06af80db53289` · `barlow-latin-ext-700-normal.woff2` `88c786d5fa8700a201615bc7b8ede09d209ec5d08cc3dd0a30ea1c4baff3476f` · `OFL.txt` `186d750eb496a4c17a76385f82be6aea2ac1cf2de074a811d63786cf374ea73f`                                         |
| `assets/fonts/barlow-condensed/` | `@fontsource/barlow-condensed@5.3.0` — Copyright 2017 The Barlow Project Authors | `barlow-condensed-latin-600-normal.woff2` `215a93c696f442034a46fbb382958f753fda60e30490683aeea6b235fcbb2b66` · `barlow-condensed-latin-ext-600-normal.woff2` `aef7edf54f79a5329fbca9c065b56dcec3852c680d58cf89a9ef2db6940ca4b3` · `barlow-condensed-latin-700-normal.woff2` `3787a5a419171630e6890cfa47c4da067474d005cd0ff8dc11ec090fdc3ee2b8` · `barlow-condensed-latin-ext-700-normal.woff2` `9d351bd9222bfab90f943850f8039aa73cdb40e0a6cfe4127308a48bef59d5f5` · `OFL.txt` `186d750eb496a4c17a76385f82be6aea2ac1cf2de074a811d63786cf374ea73f` |
| `assets/fonts/cinzel/`           | `@fontsource-variable/cinzel@5.3.0` — Copyright 2020 The Cinzel Project Authors  | `cinzel-latin-wght-normal.woff2` `09941fb1c169c38fd414536b37690057fc01b3117a5c63dd6571186540c8f370` · `cinzel-latin-ext-wght-normal.woff2` `8fc2606f8ae6c569f444e138dba052d9a6e3f0657f9031796503bbb94eced600` · `OFL.txt` `f2b3029aba64c378bf0963b62945eee15e564fe4330b934c8f2eb058282b5e83`                                                                                                                                                                                                                                                     |
| `assets/fonts/roboto/`           | già presente (riusato)                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Le righe per file in `assets/PROVENANCE.json` non sono state aggiunte (file condiviso, fuori dai
percorsi riservati): da fare al momento dell'integrazione.

### Immagini (`assets/`)

| File                               | Origine                                                                                                                                                                       | Licenza                                                                     | sha256                                                             | Modifiche                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| `assets/backdrop-library-day.webp` | copia identica di `~/Workspace/Codex/d20-studio-visual-assets/candidates/plates/compendium-scene-light.webp` (master `PROMPT_19.png`, gpt-image via ChatGPT, C2PA nel master) | arte generata dal proprietario, **SAFE** (`candidates/MANIFEST.md` riga 30) | `ac7a0061f3acac625f9513099a83827856788418a8db8a68979999b89ff8eae8` | nessuna; scurita e ritagliata solo via CSS |
| `assets/card-observatory-day.webp` | copia identica di `candidates/plates/creation-scene-light.webp` (master `PROMPT_23.png`)                                                                                      | arte generata dal proprietario, **SAFE** (`candidates/MANIFEST.md` riga 32) | `9c9c6a38eba9f49c7aafae86cad7207c4450161aaf3d53f51ba6961b232fe215` | nessuna; inquadratura solo via CSS         |

Nessun'altra opzione usa questi due file (le due immagini di prima erano le stesse di Roll20 e
Solasta e sono state tolte). Ritratti delle pedine e mappa: arte condivisa di `directions/sample.css` (record in
`assets/PROVENANCE.json` e `assets/ATTRIBUTION.md`). Nessun pixel, carattere, texture, logo o
ornamento di Demiplane è nel repository.
