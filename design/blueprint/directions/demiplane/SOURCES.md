# Opzione 9 · Demiplane — fonti, coppie, differenze, licenze

Fase C, round 1 «Scelta 1 — Direzione» (I-248), 01/10/2026. Pelle di sviluppo attiva con
`http://127.0.0.1:8881/?direction=demiplane`. File: `direction.css` (solo regole con prefisso
`:root[data-direction="demiplane"]`, solo tema scuro), `icons.mjs`, `assets/`. Immagini di
riferimento (solo consultazione, mai nel repository):
`~/Workspace/Codex/d20-studio-visual-assets/references/demiplane/` (`facts.md`, `manifest.md`).
Schermate della nostra app: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round1/demiplane/`
(coppie affiancate in `_pairs/`, rifatte il 02/10 con `polish6-demiplane/tools/pairs.sh`).

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

| Scala                 | Valori                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spazi                 | 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px (griglia da 8 di MUI, la libreria di Demiplane)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Testo                 | 12 · 14 · 16 · 18 · 24 · 28 · 48 px (11 solo per le etichette della barra del Tavolo sul telefono, dell'app); interlinea 1 (etichette di una riga nelle tessere), 1,2 (titoli, etichette, valori), 1,5 (testo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Maiuscole             | Barlow Condensed in maiuscoletto (`all-small-caps`) un gradino sopra: micro-etichetta 14 (≈ 7 px, come le maiuscole da 10 px di Demiplane), etichetta-tag 16, pulsante e linguetta 18; Cinzel è già un carattere a sole maiuscole                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Voci dei pulsanti     | Due sole: il sito (Barlow 14/600 come scritto; #006FB8 l'unico pulsante d'azione) e il gioco (maiuscolo condensato; il primario è il blu dei dadi #3276B5; i pulsanti «fantasma» sono parole d'azione sul bordo della colonna)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Raggi                 | 4 (pulsanti, menu, etichette, tasselli) · 8 (riquadri, righe) · 10 (angoli alti della linguetta) · 12 (schede con immagine) · 16 (tooltip) · 24 (pillole) · cerchio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Bordi                 | 1 px linee (campi #8D8D8D, ≥ 3:1 sul fondo); 2 px sottolineatura attiva, cornice, ritratto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Altezze dei controlli | 24 (ogni etichetta-tag) · 40 (il nostro minimo tattile; il pulsante Demiplane è 38; campi, tasselli, righe dei menu, condizioni; dal giro dei dettagli anche le tessere della barra delle azioni, «Mosse» e la tendina dei dadi) · 44 (le righe del menu nel foglio del telefono, dell'app; il pulsante del marchio) · 48 (dado blu e cerchi dei dadi; la linguetta MUI dell'Inizio; la coppia eroica dell'Inizio) · 56 (barra delle schede) · 84 (riquadri dell'ordine dei turni, 104 quello di turno) · 96 (ritratti del gruppo) · 108 (ogni riquadro dei valori, fascia e riepilogo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Glifi                 | 20 px in ogni controllo da 40 (con le parole o da solo), 24 nei cerchi dei dadi da 48 (le icone «small» e «medium» di MUI); 8 px fra glifo e parole, 12 nelle righe dei menu (ListItemIcon di MUI)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Caratteri             | Barlow (cornice del sito), Roboto (testo e campi), Barlow Condensed 600/700 (etichette, pulsanti di gioco), Cinzel 700 (titoli dei riquadri e nome sulla Scheda, titolo della scena all'Inizio)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Una ricetta per tipo  | Pulsante di gioco 40 px, 18/700 maiuscoletto, 8 × 16 (anche i comandi del turno con le parole: «Rialzati», «Mappa», «Dettagli mossa»; solo i cinque comandi a icona sono cerchi); pulsante del sito Barlow 14/600, 8 × 16; azione di testo del sito: collegamento azzurro Barlow 14/600, 8 × 0, senza bordo (ogni pulsante leggero dell'Inizio); azione di testo e piega di gioco: maiuscoletto bianco 18/700 senza riquadro; linguetta 18/700 maiuscoletto con 12 px ai lati (56 px nella barra della Scheda, 40 nelle altre); etichetta-tag 24 px, 16/700, 0 × 8, raggio 4; campo di testo 40 px, Roboto 16, 0 × 12 (anche le tendine); campo numerico (d20 dell'iniziativa, ogni ±PF, anche quello del menu della pedina) Barlow Condensed 18/700 centrato, 0 × 8 (24 nel campo alto della fascia); interruttore MUI: pallino chiaro su binario bianco al 30 %, blu dei dadi quando è acceso; condizione attiva 40 px bordo compreso, 18/700 maiuscoletto, 0 × 12; riga di menu 40 px (44 nel foglio del telefono; anche il menu del calendario); titolo di voce dell'Inizio Barlow 16/700; titoletto di gruppo 18/700 grigio con filetto (anche «Abilità aggiuntive» e «Modifiche del DM») |

Verifica con lo strumento di audit (`changes/visual-01/audit`, 10 stati × 2 larghezze): numeri
prima e dopo il sesto giro di rifinitura in «Coerenza (I-250)» qui sotto. Restano fuori scala
solo i valori strutturali o vincolati dell'app elencati in «Differenze dichiarate».

## Coerenza (I-250)

Audit dei valori (`node changes/visual-01/audit/audit.js --direction demiplane`, 20 stati, tema
scuro). «Prima» è l'audit del 01/10 alle 20:42 su `direction.css` delle 20:40:55 (lo stato della
verifica indipendente del sesto giro), «dopo» quello del 02/10 alle 06:00, lanciato dopo l'ultima
modifica di `direction.css` (05:32:14). Rapporto completo:
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/audit/demiplane/audit.md`; copie in
`polish6-demiplane/audit-before.md` e `audit-after.md`. I giri precedenti avevano portato gli
spazi da 32 a 23 valori, i fuori scala da 20 a 11, le varianti dei pulsanti da 91 a 74 e gli stili
di testo da 88 a 80.

| Misura                                        | Prima (01/10, 20:42)                                                      | Dopo (02/10, 06:00)                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Elementi visibili                             | 2540                                                                      | 2540                                                                                                                                                       |
| Spazi (padding, margini, gap)                 | 24 valori; passo 4 px sul 100 %; 12 fuori scala                           | 25 valori; passo 4 px sul 99 %; 13 fuori scala (in più solo i −10 px del ✕, la geometria di MUI `edge="end"`: (20 − 40) / 2)                               |
| Altezze dei controlli                         | 13                                                                        | 14 («Termina turno» 100 px, era 104 come la colonna degli strumenti; la piega a due righe della regola d'ingombro 64 px)                                   |
| Caratteri                                     | 4 famiglie, 10 dimensioni, 3 pesi, 26 interlinee, 13 spaziature, 80 stili | 4 famiglie, 10 dimensioni, 3 pesi, 26 interlinee, 13 spaziature, 79 stili                                                                                  |
| Raggi · bordi · ombre                         | 7 · 2 · 16                                                                | 7 · 2 · 16                                                                                                                                                 |
| Colori (testo · fondo · bordo)                | 10 · 28 · 18                                                              | 10 · 28 · 18                                                                                                                                               |
| Pulsanti: varianti (classi con più varianti)  | 74 (15)                                                                   | 70 (14): «Tiri e risultati» e «Annulla l'avvio» una variante sola; i ritratti del gruppo sul telefono tutti da 48; le azioni di testo dei riquadri a 8 × 0 |
| Pulsanti con il padding di Chromium `1px 6px` | 0                                                                         | 0                                                                                                                                                          |
| Contrasto AA                                  | 0 errori, 0 incerti su 1192 testi                                         | 0 errori, 0 incerti su 1193 testi                                                                                                                          |

L'audit misura solo i dieci stati del round 1, senza passaggio del puntatore né fuoco: quelli del
sesto giro li ho misurati a parte (sezione «Sesto giro di rifinitura» qui sotto), anche sotto la
piega (Scheda intera, Inizio scorso fino in fondo a 1440 e 390).

Le varianti che restano sono livelli di misura voluti: telefono e computer (barra delle azioni,
ritratti del gruppo, schede del menu, tendina dei dadi 14/16 px, testa e piede del cassetto), il
pulsante tondo dei dadi, il grande «Termina turno», i riquadri dei valori da 108 px, il campo ±PF
da 84 px, le due voci dei pulsanti (sito e gioco), il numerico accanto ai campi di testo e le
correzioni ottiche del marchio (in em, sezione «Marchio (I-251)»). Il campionario dei componenti
(`directions/specimen.html?direction=demiplane`, rifatto il 02/10 in
`polish6-demiplane/specimen-final/`, 1440 e 390) mostra le stesse ricette, anche negli stati
composti che l'esempio non raggiunge (condizioni attive, tutte da 40 px; pagina «Barra rapida»;
pannello dei PF del Tavolo).

## Elemento → prodotto copiato → fonte

| Elemento della nostra app         | Cosa copia (prodotto)                                                                                                                                                                                                               | Fonte (file di riferimento · URL originale, o prova)                                                                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Barra in alto                     | Barra nera, filetto bianco al 12 %, voci Barlow 16/700 senza icone, pagina aperta con la riga #00ABFF di «All Games», hover #22B8CF (Demiplane)                                                                                     | `demiplane-home-live-anon-1440x900.png`, `demiplane-home-live-games-select-nexus-1440x900.png` · https://app.demiplane.com/home, https://app.demiplane.com/games; CSS `navigation.css` (`--top-nav-button-hover-color`) |
| Ricerca e account                 | Campo bianco con lente; un solo pulsante blu #006FB8 (Sign up / Sign in)                                                                                                                                                            | stessi file · https://app.demiplane.com/home                                                                                                                                                                            |
| Campi                             | Campo MUI «outlined» sul nero #0F0F0F, filo #8D8D8D, azzurro al fuoco; le ricerche della scheda con la lente Material a sinistra (Filter…)                                                                                          | `demiplane-sheet-cyberpunk-desktop-2025.png` · https://www.demiplane.com/blog/cyberpunk-red-character-tools                                                                                                             |
| Palette                           | Pagina #1B1C22, riquadri #202020, tasselli #0F0F0F, grigio dadi #3F3F3F, oro #F1CE86, bronzo #917B52, blu dadi #3276B5 (Demiplane PF2e)                                                                                             | `facts.md` §1.1 (conteggi nel CSS della scheda PF2e, campioni a deviazione 0) · https://resources.demiplane.com/hubfs/pathfinder-character-sheet-1%20copy.jpg                                                           |
| Pulsanti                          | Sito: Barlow 14/600, raggio 4, 40 px, #006FB8; gioco: lastre nere in maiuscole condensate (REST, REFOCUS), primario blu dei dadi #3276B5, azioni di testo senza riquadro (+ ADD, MANAGE XP)                                         | `demiplane-sheet-crop-pf2e-header-stat-panels.png`, `facts.md` §8 (`--primary:#3276B5`) · https://resources.demiplane.com/nexus/pathfinder/character-tools/faqs                                                         |
| Etichette (tag)                   | Tutte in maiuscole condensate 16 px, raggio 4, fondo nero (RULE, tratti PF2e): «Cosciente», «Equipaggiato», «Trucchetto», «Solo campagna»                                                                                           | `demiplane-dialog-live-daggerheart-rule-tooltip-1440x900.png`, `demiplane-sheet-crop-pf2e-rules-drawer.png`                                                                                                             |
| Riquadri con linguetta            | Corpo #202020 sotto la linguetta nera con angoli alti da 10 px e titolo centrato in maiuscole incise (Taroca → Cinzel)                                                                                                              | `demiplane-sheet-crop-pf2e-header-stat-panels.png`; CSS `.sheet-box-component-header{background:#000;border-radius:10px 10px 0 0}` (`demiplane-code-css-excerpts-2026-10-01.txt` §4)                                    |
| Tasselli dei valori               | Etichetta minuscola grigia in maiuscolo sopra un valore grande in un tassello nero (MOD, FORT/REFLEX/WILL)                                                                                                                          | `demiplane-sheet-crop-pf2e-header-stat-panels.png`, `demiplane-sheet-cyberpunk-desktop-2025.png` · https://www.demiplane.com/blog/cyberpunk-red-character-tools                                                         |
| Punti ferita                      | Grappolo PF: campo ±PF a sinistra, CURA verde #29AC5E sopra DANNO rosso #8A3D37, valore corrente nel tassello                                                                                                                       | `demiplane-sheet-crop-pf2e-header-stat-panels.png`                                                                                                                                                                      |
| Schede (tab)                      | Barra #202020 da 56 px, maiuscole condensate grigie, scheda aperta bianca su riga oro da 2 px                                                                                                                                       | `demiplane-sheet-pf2e-desktop-roll-toast-dice-tray-rules-drawer-official.jpg` · https://resources.demiplane.com/nexus/pathfinder/character-tools/faqs                                                                   |
| Filtri                            | Pillole scure, quella scelta piena (oro, come la scheda attiva gialla di Cyberpunk)                                                                                                                                                 | `demiplane-sheet-marvel-desktop-roll-result-power-drawer-2025.png`, `demiplane-sheet-cyberpunk-desktop-2025.png` · https://www.demiplane.com/blog/spider-verse-expansion-new-features                                   |
| Tipo d'azione                     | Etichetta di tratto PF2e: fondo #5E0000, filo oro, maiuscole (CONCENTRATE, EXPLORATION)                                                                                                                                             | `demiplane-sheet-crop-pf2e-rules-drawer.png`                                                                                                                                                                            |
| Parole di regola                  | Verde #00BE77 con sottolineatura a puntini da 1 px; tooltip blu notte #0A0F21, filo #F3C267, raggio 16                                                                                                                              | `demiplane-dialog-live-daggerheart-rule-tooltip-1440x900.png` · https://app.demiplane.com/nexus/daggerheart/adversaries/acid-burrower                                                                                   |
| Finestre                          | Cassetto a destra a tutta altezza: testa #0F0F0F con titolo in maiuscole condensate e ✕, corpo #202020, piede con le azioni                                                                                                         | `demiplane-sheet-crop-pf2e-rules-drawer.png`, `demiplane-sheet-marvel-desktop-select-maneuver-drawer-2025.png` · https://www.demiplane.com/blog/spider-verse-expansion-new-features                                     |
| Menu                              | Tendina Demiplane: #1B1C22, raggio 4, ombra MUI 8, righe Barlow 14/700                                                                                                                                                              | `demiplane-home-live-games-menu-open-1440x900.png` · https://app.demiplane.com/home                                                                                                                                     |
| Avviso (toast)                    | Scheda del tiro: grigio #3F3F3F, filo bronzo, raggio 8                                                                                                                                                                              | `demiplane-dice-crop-pf2e-roll-toast-dice-tray.png`                                                                                                                                                                     |
| Inizio: titolo                    | «Select a NEXUS»: Barlow 48/700 sopra la pagina #1B1C22, illustrazione dietro il titolo che sfuma nella pagina                                                                                                                      | `demiplane-home-live-games-select-nexus-1440x900.png` · https://app.demiplane.com/games                                                                                                                                 |
| Inizio: sezioni                   | Pagina piatta, niente riquadri: titolo Barlow 24/700 a sinistra, contenuto sotto, filo da 1 px tra le sezioni; collegamenti in azzurro #00ABFF                                                                                      | `demiplane-home-campaign-page-cyberpunk-2026.jpeg` (JOB DETAILS / CHARACTERS / MEMBERS), `demiplane-home-live-games-select-nexus-1440x900.png`                                                                          |
| Inizio: schede a destra           | La linguetta «All Games»: Barlow 16/700 come scritto, aperta bianca su riga #00ABFF da 2 px                                                                                                                                         | `demiplane-home-live-games-select-nexus-1440x900.png`                                                                                                                                                                   |
| Inizio: «Continua a giocare»      | Scheda quadrata 200×200, raggio 12, nome sotto in Barlow 14/700; accanto il titolo dell'eroe della Nexus (maiuscole incise) e i due pulsanti                                                                                        | `demiplane-home-live-games-select-nexus-1440x900.png`, `demiplane-home-live-pathfinder-nexus-1440x900.png` · https://app.demiplane.com/nexus/pathfinder2e                                                               |
| Inizio: «Il tuo personaggio»      | Riquadro obliquo VIEW MY CHARACTERS: rosso #661D16, nome in maiuscole condensate, ritratto che sfuma a destra                                                                                                                       | `demiplane-home-live-pathfinder-nexus-1440x900.png` · https://app.demiplane.com/nexus/pathfinder2e                                                                                                                      |
| Inizio: «Nuova»                   | Etichetta RULE: verde #48D18C, maiuscole                                                                                                                                                                                            | `demiplane-dialog-live-daggerheart-rule-tooltip-1440x900.png`                                                                                                                                                           |
| Scheda: fascia dei valori         | Ogni riquadro ha le stesse tre righe: micro-etichetta grigia su una riga, tassello nero 52×40, didascalia; tutti i valori (anche la stella dell'ispirazione e i PF) su una linea                                                    | `demiplane-sheet-crop-pf2e-header-stat-panels.png` (FORT / REFLEX / WILL)                                                                                                                                               |
| Scheda: colonna                   | Colonna centrata con cornice sopra l'illustrazione scurita a tutta larghezza                                                                                                                                                        | `demiplane-sheet-pf2e-desktop-roll-toast-dice-tray-rules-drawer-official.jpg`, `demiplane-sheet-cyberpunk-desktop-2025.png`                                                                                             |
| Scheda: intestazione              | Ritratto tondo con anello oro, nome in maiuscole incise 28 px, sottotitolo grigio in maiuscole, comandi come lastre nere                                                                                                            | `demiplane-sheet-crop-pf2e-header-stat-panels.png`                                                                                                                                                                      |
| Scheda: liste                     | Nome su una riga (16 px condensato) con la caratteristica grigia accanto, centrato sul tassello del valore; righe tutte da 44 px; sottogruppi grigi con filetto (TRAINED SKILL ACTIONS)                                             | `demiplane-sheet-pf2e-desktop-roll-toast-dice-tray-rules-drawer-official.jpg`, `demiplane-sheet-cyberpunk-desktop-2025.png` («ATHLETICS(DEX)»)                                                                          |
| Scheda: competenza                | Segno di grado PF2e: anello vuoto / disco oro / doppio anello                                                                                                                                                                       | `demiplane-sheet-crop-pf2e-header-stat-panels.png` (T/E sotto FORT/REFLEX/WILL)                                                                                                                                         |
| Scheda (telefono): colonna        | Una colonna a tutta larghezza con 8 px ai lati, senza cornice; intestazione compatta: ritratto 48 a sinistra, nome e righe accanto                                                                                                  | `facts.md` §3 (`.mobile-bottom-content{padding:8px}`), `demiplane-sheet-marvel-phone-official.png`                                                                                                                      |
| Scheda (telefono): schede         | Contenitore arrotondato da 56 px (raggio 24, #0F0F0F al 90 %) su una propria striscia opaca #202020: il contenuto scorre sotto, mai attraverso                                                                                      | `facts.md` §3 (CSS `border-radius:24px; background: rgba(15,15,15,.9)`), `demiplane-sheet-pf2e-desktop-and-phone-occult-theme-official.png`                                                                             |
| Tavolo: barra della scena         | Linguetta nera con il nome in maiuscole condensate (titolo del cassetto)                                                                                                                                                            | `demiplane-sheet-crop-pf2e-rules-drawer.png`                                                                                                                                                                            |
| Tavolo: barra laterale            | Il cassetto delle regole: testa #0F0F0F con la creatura, sezioni sotto micro-etichette grigie (NOTES, COMPENDIUM)                                                                                                                   | `demiplane-sheet-crop-pf2e-rules-drawer.png`, `demiplane-sheet-vampire-desktop-roll-history-rules-drawer-2025.png` · https://www.demiplane.com/blog/demiplane-q1-2025-review                                            |
| Tavolo: barra delle azioni        | Riquadro #202020; risorse e dadi come linguette nere sul bordo alto; azioni come tessere da 44 px con la micro-etichetta (14 px) in alto e il nome al piede; una sola voce condensata anche per «Dadi», la tendina e i PF           | `demiplane-table-dc20-sheet-in-roll20-action-points-2025.jpg` · https://www.demiplane.com/blog/dc20-nexus-now-available                                                                                                 |
| Tavolo: comandi del turno         | Fila dei dadi: cerchi grigi da 48 px, «Tira i dadi» come il pulsante tondo blu #3276B5 con alone; Termina turno lastra dello stesso blu (--primary)                                                                                 | `demiplane-dice-crop-pf2e-roll-toast-dice-tray.png`; CSS `.dice-roller__fab circle{fill:rgb(50,118,181)}`                                                                                                               |
| Tavolo: ordine dei turni e gruppo | Ritratti tondi con anello (party blu, nemici rossi e tratteggiati), turno attuale incorniciato d'oro                                                                                                                                | `demiplane-sheet-daggerheart-in-roll20-vtt-garrick-2025.jpeg` · https://www.demiplane.com/blog/new-update-for-daggerheart-vtt-experience                                                                                |
| Tavolo: strumenti mappa e zoom    | Riquadri #202020 con icone Material piene bianche, strumento scelto pieno di blu; il gruppo aperto con un filo blu da 2 px (un solo riquadro pieno per colonna); tre glifi propri sul reticolo Material (percorso, mano, selezione) | `facts.md` §7 («a thin left rail of Material icons»), `demiplane-sheet-daggerheart-in-roll20-vtt-garrick-2025.jpeg`                                                                                                     |
| Finestra dell'iniziativa          | Cassetto a destra largo 30 vw (440 px al massimo); righe scure (raggio 8); totale in Barlow Condensed 28 oro come «RESULT 25»; «Tira tutti» blu, «Tira PNG» e «Nessuno» la stessa lastra nera; avviso nel filo oro del tooltip      | `demiplane-sheet-marvel-desktop-select-maneuver-drawer-2025.png`, `demiplane-dice-crop-pf2e-roll-toast-dice-tray.png`                                                                                                   |
| Menu della pedina                 | Tendina #1B1C22 con testa #0F0F0F, ritratto ad anello e nome in maiuscole condensate (menu ≡ del personaggio)                                                                                                                       | `demiplane-home-live-games-menu-open-1440x900.png`, `demiplane-dialog-vampire-character-sharing-theme-picker-official.png` · https://resources.demiplane.com/nexus/vampire/tools/character-tools-overview               |
| Icone                             | Material Symbols piene (le icone MUI «Filled» di Demiplane); tre glifi della mappa disegnati per questa opzione nella stessa voce piena; «Scena» con il simbolo «image»                                                             | `facts.md` §1.5 (`data-testid="SearchIcon"`, `MenuIcon`, `HomeIcon` nel DOM)                                                                                                                                            |

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
    px, le correzioni ottiche del marchio (in em: sezione «Marchio (I-251)»), i margini della mappa (76/88/152 px sul
    computer, 120 px sul telefono) e lo scostamento di 56 px dei turni sul telefono (geometria
    dell'HUD), il millimetro di spazio attorno alle parole di regola nel testo, i 20 px ai lati
    della testa del menu della pedina (8 + 12: la fascia va da bordo a bordo con un margine di
    −8 px, come la colonna di destra dell'Inizio, perché l'anello del fuoco abbia spazio) e il
    filo trasparente di 1 px ai lati di testa, riga dei PF, aiuto e separatori del menu (lo
    stesso delle righe dell'app, tenuto per i colori forzati). Sul telefono la barra delle
    azioni parla un gradino sotto (PF, tendina dei dadi e «Dadi» a 14 px, 16 dal computer a
    1440 px), le righe del menu della pedina sono da 44 px (la regola tattile dell'app) e la fila
    delle tessere sfuma solo nei suoi ultimi 8 px, lo spazio dopo una tessera intera: la prima
    tessera resta intera con bordo e segno di costo, quella tagliata dopo si scioglie nel bordo;
    la tendina dei dadi accanto alle tessere è alta 40 px come loro.
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
18. **Difetti già presenti (dell'app).** Nelle schede Extra e Abilità i rimandi in riga «SRD 5.2.1
    IT p. N» restano sotto i 40 px come oggi (Fase D). La striscia delle schede della Scheda resta
    attaccata in alto mentre si scorre e l'app non ha `scroll-padding`: un controllo che le sta
    sotto (nella prova, «Aggiungi oggetto» e «Cerca nella Biblioteca» dell'Inventario) prende il
    fuoco senza uscirne. Va corretto nell'app, per tutte le direzioni. L'avviso «Sessione non
    avviata» del DM non copre più i ritratti dei turni, nemmeno sul telefono (sesto giro).
19. **Linguette dell'Inizio a 48 px.** Le schede «Novità · Guide · Supporto» sono la Tab MUI del
    sito (48 px, 16 px ai lati, Barlow 16/700 come scritto), non la linguetta di gioco da 40: due
    voci, come i pulsanti.
20. **Barra rapida.** Le due tendine della pagina «Barra rapida» parlano a 14 px anche a 1440 (la
    tendina dei dadi della testata è 16): così gli strumenti finiscono dentro la barra (oggi
    «Normale» e il pulsante delle opzioni restano tagliati).
21. **Regole valide in tutta l'app, di proposito.** Come i pulsanti, i campi, le linguette e i tag
    della sezione «controls» di `direction.css`, tre regole valgono ovunque e non solo su Inizio,
    Scheda e Tavolo. Sono `kbd`, il tasto scritto (palette dei comandi, scorciatoie, Tavolo,
    menu della pedina); il raggio di 4 px di `.text-button`, perché l'anello di fuoco segue gli
    stessi angoli in ogni pagina; il minimo di 40 px di `.clib-link`, i collegamenti dell'elenco
    Personaggi, una garanzia di bersaglio («Copia» era 30 px). Le regole di superficie
    (condizioni, interruttore offline, menu del calendario) restano limitate alle loro pagine.

## Sesto giro di rifinitura (02/10, verifica indipendente e I-250)

I dodici rilievi di Demiplane in `notes/open-items-round6.json` (la verifica indipendente del
01/10 sera, su `direction.css` delle 20:40:55) e il controllo I-250 di audit e campionario, in un
solo giro dentro `direction.css` (commenti «Round 6»). «Prima» è `direction.css` delle 20:40:55
(copia in `polish6-demiplane/before/`), «dopo» quello delle 05:32:14 del 02/10, l'ultima modifica.
Misure negli stati del kit a 1440 e 390 px, cartella
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/polish6-demiplane/` (sonde
`tools/p6.cjs`, `r3.cjs`, `ringshot.cjs`, `topcut.cjs`; risultati in `probe/`).

| Rilievo                                                 | Prima                                                                                                                                                  | Dopo                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Anelli tagliati dalla finestra a 1440 (alto)            | «Termina turno», «Annulla ultima modifica», «Annulla preparazione» finivano a 896: l'anello (3 px, 3 px fuori) arrivava a 902, sotto se ne vedeva 1 px | Le due file di comandi stanno 4 px l'una dall'altra e 8 px sopra il bordo: cerchi e «Termina turno» (100 px, era 104) finiscono a 892, l'anello a 898. A 2× sotto ogni comando ci sono 6 px di #00ABFF e poi 4 px della barra (`probe/resume3-ring/`). La barra resta 113 px. Il rapporto del fuoco ora conta anche i bordi della finestra |
| Sfumatura della fila delle tessere sul telefono (medio) | Trasparenza da 100 % − 32 a 100 % − 12 px, sulla prima tessera: «Bastone ferrato» perdeva il bordo destro, le ultime lettere e mezzo pallino verde     | Sfuma solo negli ultimi 8 px della fila (4–155,8), lo spazio dopo una tessera intera (8–147,8): la tessera è intera, con bordo e segno di costo                                                                                                                                                                                            |
| Avviso del DM sul telefono (medio)                      | «Sessione non avviata…» 56 px sotto il bordo della mappa, sotto i cinque ritratti dei turni: illeggibile                                               | In combattimento, fino a 720 px, parte 8 px sotto la fila dei turni (fila fino a 192, avviso da 200), come già sul computer                                                                                                                                                                                                                |
| Bordi di Magie (medio, D10)                             | Quattro bordi sinistri: 744, 748 (righe di «Incantesimi dagli oggetti»), 752 (parole nei tasselli), 756 (le quattro schede)                            | Due: le righe, anche quelle degli oggetti (12 × 0), a 744; le parole dei riquadri a 756 (i tasselli dei numeri ora 12 px tutt'intorno, come quelli dell'Inventario)                                                                                                                                                                        |
| Coppie in `_pairs/` vecchie (medio)                     | Delle 16:00 del 01/10: marchio e barra di prima                                                                                                        | Tutte e 16 rifatte (05:39–05:42) dalle schermate delle 05:35–05:38, prese dopo l'ultima modifica, con `polish6-demiplane/tools/pairs.sh` (stessa impaginazione)                                                                                                                                                                            |
| ✕, separatori e riga dei PF del menu (basso)            | Inchiostro del ✕ a circa 630 (frecce a 640,6), lo stesso nel cassetto dell'iniziativa; «Applica» 0,8 px più in basso del campo                         | Il ✕ è l'IconButton `edge="end"` di MUI: margine di −10 px, glifo fino a 640,6 come le frecce (anche nel cassetto). «Applica» centrato sul campo: tutti e due 349,8–389,8. Separatori: invariati, perché la linea dipinta va già da 364,6 a 640,6 (pixel 365–640 a 1×); i 363,6–641,6 misurati sono il filo trasparente di 1 px            |
| Avviso a 1440 (basso)                                   | «Avvia ora · Non ora» 4 px sotto le discendenti del testo                                                                                              | Un blocco flessibile con 8 px fra testo e pulsanti e fra i due pulsanti                                                                                                                                                                                                                                                                    |
| Spazi della barra laterale (basso)                      | 29, 52 e 48 px prima dei fili; pannelli delle estensioni a 25 px                                                                                       | 24 px prima di ogni filo (forme e creature, dettaglio del turno, comandi, pannelli delle estensioni), 16 px dal filo al titolo                                                                                                                                                                                                             |
| Riquadri del riepilogo (basso)                          | Iniziativa, CA, Difese: valori 17 px sotto il bordo alto e 36 sopra quello basso (riga della didascalia vuota)                                         | Senza la nota «base» (la scrive solo Modifica) etichetta e tassello sono un blocco centrato nei 108 px; i tre valori restano su una linea                                                                                                                                                                                                  |
| Passaggio del puntatore (basso)                         | Riga in fondo al riquadro da 40 px, 10–12 px sotto le parole e larga come il riquadro; gradini dell'indebolimento scuriti a #000                       | Sottolineatura vera, 1 px e 4 px sotto le parole, su nomi delle abilità e collegamenti; gradini, tessere, «Mosse», sottoschede e filtri si schiariscono a #202020 come ogni riquadro (premuto resta più scuro)                                                                                                                             |
| Barra del telefono, testata, regola d'ingombro (basso)  | «Creatura» 1 px più in basso; scarti d'inchiostro della testata 31 e 29 px; la regola d'ingombro su due righe 10 px fuori linea                        | Il ritratto di «Creatura» è da 20 px come i glifi: etichette tutte a 816. Testata: spostamenti ottici di 2 e 1 px, scarti 30,5 e 30,5. La regola in un riquadro da 64 px (40 + 24) con le righe al piede: l'ultima sta sulla linea di «Gestisci sintonia / monete» (306,4 e 306,2)                                                         |
| Debito di cascata (basso)                               | `--dp-h-tile` (44) sulle tessere e sulla tendina del telefono, poi riscritto a 40; commenti che dicevano 44                                            | Tessere e tendina dichiarano 40 una volta sola; il 44 resta solo dove vale (righe dei menu sul telefono, anche il calendario, e il pulsante del marchio); commenti corretti                                                                                                                                                                |

In più, dal controllo I-250 (audit, campionario e fuoco):

- **Ritratti del gruppo sul telefono.** Ogni tessera tiene la riga della barra dei PF (40 + 4 + 4 =
  48 px): Doran, di cui il giocatore non vede i PF, era alto 40 e tirava su Mira di 8 px; ora i
  ritratti hanno un passo solo di 56 px (sul computer era già così).
- **«Tiri e risultati».** La ricetta dell'azione di testo di gioco, 8 × 0 e interlinea 1,2 nel suo
  riquadro da 40 (era 0 × 0 su 1,5): una variante sola con «Annulla l'avvio».
- **«Tutte le sezioni della scheda».** L'anello va verso l'interno, con il filo del colore della
  pagina, come le linguette accanto (regola «Critique 29/09» di `styles.css`): con la striscia
  attaccata in alto l'anello esterno perdeva tutto il lato alto. L'ha trovato il nuovo controllo
  dei bordi della finestra.

Tenuto, con il motivo:

- **Raggio 10 della linguetta dei riquadri.** È fuori dal passo di 4, ma è copiato dal CSS di
  Demiplane (`.sheet-box-component-header`) ed è uno solo per tipo.
- **Regola d'ingombro su due righe.** Nella colonna stretta a 1440 non sta su una riga; ha la
  stessa ricetta delle altre pieghe (carattere, interlinea, margini interni), cresce solo l'altezza.
- **Glifi di ripiego.** ☆, ◎, ▣, ✦ e ⋯ sono testi dell'app che Barlow e Roboto non hanno (il
  browser usa altri caratteri di sistema). Per cambiarli servono contenuti o maschere: fuori da
  questo giro.
- **Tre anelli tagliati in alto in Scheda · Inventario a 1440.** Sono un effetto della posizione
  di scorrimento del kit, non della pelle. «Gestisci velocità» sta 1,6 px sotto il bordo della
  finestra; «Aggiungi oggetto» e «Cerca nella Biblioteca» stanno sotto la striscia attaccata
  dell'app (punto 18 delle differenze, `probe/resume3-topcut/`).

### Verifiche (02/10, dopo l'ultima modifica delle 05:32:14)

- Schermate del round 1 (15 e il foglio dei provini) rifatte fra le 05:35 e le 05:38 e aperte
  tutte, nessun errore nel manifesto. Le riprese precedenti di questo giro (05:17–05:19) sono
  state sostituite. Nelle garanzie tre stati del telefono sono andati in timeout sotto carico e
  sono stati ripresi una volta.
- Coppie: tutte e 16 rifatte dopo le schermate.
- Garanzie (`round1/demiplane/guarantees-demiplane.txt`, 20 stati, tutti ok):
  - a 1440 la barra delle azioni è 113 px, e «Termina turno», «Annulla» e «Annulla preparazione»
    stanno a 792–892;
  - a 390 nessuno scorrimento laterale e la barra del Tavolo è su una riga (63 px); i tre comandi
    stanno a 732–772 e «Entra al Tavolo» finisce a 733 px;
  - nessun bersaglio sotto i 40 px; il gruppo è a 471–631, sopra la barra (638).
- axe-core 4.13 `color-contrast`: 0 violazioni in 18 prove (`axe-demiplane.txt`).
- Fuoco (`focus-demiplane.txt`, 16 stati, ora con i bordi della finestra): 0 anelli tagliati, a
  parte i tre dovuti allo scorrimento del kit spiegati sopra.
- Audit: numeri in «Coerenza (I-250)». Campionario rifatto in `polish6-demiplane/specimen-final/`.
- `node --test design/blueprint/tests/visual01-directions.test.mjs`: 13 test superati. Prettier
  pulito su `directions/demiplane/`.

## Dettagli rifiniti (01/10, sera · critica indipendente dei dettagli, I-252)

La critica indipendente dei dettagli (venti rilievi D01–D20 e tre idee per superare il riferimento;
ritagli e misure in `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/detail-demiplane/`)
è applicata in un solo giro: una sezione nuova in fondo a `direction.css` («I-252, detail round»,
prima del Marchio), con valori presi solo dalle scale (I-250), più tre glifi propri e il simbolo
«image» in `assets/icons/`. «Prima» è `direction.css` delle 18:35, «dopo» quello delle 20:40:55
(l'ultima modifica). Misure negli stessi stati del kit, a 1440 e 390 px:
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/fix-demiplane/probe/before/` e
`probe/after/` (sonda `tools/detail.js`), anelli del fuoco in `probe/focus-before/` e in
`round1/demiplane/focus-demiplane.txt`; copie dei file di prima in `fix-demiplane/*-before.*`.

| Rilievo                                       | Prima                                                                                                                                                                                 | Dopo                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 seconda fila di tessere tagliata (alto)   | Tessere da 44 + 8 + 44 = 96 px in una fila che ne mostra 90: il bordo basso e l'anello della seconda fila tagliati di 2 px                                                            | Tessere e «Mosse» da 40 px (l'altezza dei controlli): 40 + 8 + 40 = 88, finiscono a 883,5 come lo spazio utile; la barra resta 113 px. L'etichetta del gruppo sta sopra il nome, sul suo bordo sinistro (8 + 20 + 8), e il nome ha interlinea 1,2: 8 px fra le due righe                                                                                                      |
| D02 «Tiri e risultati» (alto)                 | Campana attaccata alla T (0 px); 16 px a sinistra e 4 a destra nella linguetta; linguette alte 26 e 39 px                                                                             | Campana a 8 px dalle parole; 16 px ai due lati; le due linguette alte 40 px, tutte e due da y 748                                                                                                                                                                                                                                                                             |
| D03 ordine dei turni (alto)                   | Ritratto di turno 46 px, nome 7 px più in basso degli altri (265 contro 258); anelli del fuoco tagliati di 2 px (5 riquadri)                                                          | Ritratti tutti da 40, nomi tutti a 258; il riquadro di turno cresce solo verso il basso (104 px, era 112); la cornice d'oro di 2 px è un filo da 1 più un anello da 1, così il contenuto parte dove parte quello dei vicini; anelli disegnati verso l'interno (la fila scorre): 0 tagliati. L'avviso del DM resta 8 px sotto il riquadro di turno (201/249 px, erano 209/257) |
| D04 strumenti della mappa (alto)              | Gruppo «Seleziona e muovi» e strumento «Muovi» due quadrati blu uguali affiancati; «Pianifica percorso», «Sposta vista», «Seleziona più pedine» con i glifi di nota, mappa e spunta   | Il gruppo aperto è grigio #202020 dentro un filo blu da 2 px; pieno di blu solo lo strumento scelto. Tre glifi propri: percorso con due tappe, mano aperta, riquadro tratteggiato su due pedine                                                                                                                                                                               |
| D05 «Avvia ora · Non ora» (alto)              | Bordi attaccati (0 px, cucitura da 2 px); 16/700, 0 × 12                                                                                                                              | 8 px fra i due; la ricetta del pulsante di gioco: 18/700 maiuscoletto, interlinea 1,2, 0 × 16 (88 e 79 px)                                                                                                                                                                                                                                                                    |
| D06 due ricette secondarie (medio)            | Comandi della testata neri su nero senza bordo; «Condividi» #0F0F0F con filo #3A3A3A; «◎ Solo campagna» etichetta incorniciata da 24 px accanto a pulsanti da 40                      | Una sola ricetta: #0F0F0F con filo #3A3A3A, al passaggio #202020 / #686868. «◎ Solo campagna» è una scritta grigia senza riquadro, 16 px prima di «Condividi»                                                                                                                                                                                                                 |
| D07 riga dei PE (medio)                       | A capo a metà colonna (x 906); binario 72 × 4 #0F0F0F su #1B1C22 (≈ 1,1:1), invisibile                                                                                                | Riga propria sul bordo della colonna (x 728, larga 542); cifre tabellari; binario da 4 px #3F3F3F con il riempimento oro, raggio 2, lungo 250 px fino a «Gestisci PE»                                                                                                                                                                                                         |
| D08 altezze dei riquadri dei valori (medio)   | 123 px nella fascia, 88,8 nel riepilogo, 123 e 108 nelle file del telefono; spazio 16 e 12; «Camminare» a 16 px nel posto dei numeri                                                  | 108 px ovunque (fascia, riepilogo, telefono): etichetta, tassello, riga del piede anche quando è vuota. Il riquadro dei PF ci sta: la barra è un binario da 4 px ai piedi di «PF temporanei» (verde su grigio dadi). Riepilogo a 16 px come la fascia; «Camminare» è la micro-etichetta (14/700 maiuscoletto)                                                                 |
| D09 riepilogo dell'inventario (medio)         | Azioni a tre altezze (y 128, 153, 191); «Set d'armi» da solo in un terzo di riga                                                                                                      | Le tre azioni sul piede delle schede (tutte a y 277); «Set d'armi» a tutta riga con i set affiancati                                                                                                                                                                                                                                                                          |
| D10 bordi di Magie (medio)                    | Tre bordi sinistri (744, 748, 757); tasselli 99 e 78 px; schede 58, 65, 56, 56 px a 8, 8 e 12 px                                                                                      | Due bordi: le righe e tutto ciò che non ha riquadro a 744, le parole nei riquadri a 756. Tasselli tutti 99 px; le quattro schede 56 px (8 + 40 + 8), senza bordo, tutte a 8 px                                                                                                                                                                                                |
| D11 cassetto dell'iniziativa (medio)          | Titolo a 1032 e testo a 1024; piede a 1416 e righe a 1424; nota con passo di 33 px per il pulsante in riga; casella a 1067 e «Sorpreso» a 1037; 4 px dal dado a «Tira l'iniziativa»   | Testa e piede a 16 px come il corpo (1024 e 1424); «Annulla l'avvio» su una riga sua sotto la nota; la casella di inclusione nella colonna di «Sorpreso» (1037), il numero d'ordine dopo; 8 px dal dado                                                                                                                                                                       |
| D12 menu della pedina (medio)                 | Testa senza margini (ritratto e ✕ negli angoli); bordi a 351,6, 355,6 e 364,6; «/ 22» 2 px più alto di «18»; aiuto a capo con «· anche» in testa                                      | Testa a tutta larghezza con 8 × 20 px; ritratto, «PF», aiuto, separatori e glifi delle righe tutti a 364,6; ✕ sulla colonna delle frecce; riga dei PF su una linea di base (375,8); aiuto senza riga orfana. Righe nella voce del sito (Barlow 14/700), detto nel file                                                                                                        |
| D13 anelli del fuoco tagliati (medio)         | Tagliati: colonna di destra dell'Inizio (3, di 6 px), turni (5), filtro ✦ (1), barra del telefono (2). Scostamenti in uso +3, +2, −3, −4 e un anello oro da 2                         | 0 tagliati in 14 stati. Una regola: 3 px #00ABFF, 3 px fuori; 3 px verso l'interno solo dentro ciò che scorre o ritaglia (mappa, turni, barra, fila delle tessere). La colonna dell'Inizio ha 8 px di respiro su tre lati                                                                                                                                                     |
| D14 glifi e distanze (medio)                  | Glifi da 16, 17, 18, 20 e 21 px nello stesso pulsante da 40; distanze 0, 4 e 8                                                                                                        | 20 px in ogni controllo da 40, 24 nei cerchi da 48; 8 px dalle parole (12 nelle righe dei menu). L'audit conta 2 misure di glifo nei controlli (erano 9)                                                                                                                                                                                                                      |
| D15 distanze fra controlli (medio)            | Riquadro → azione di testo 20 px (fuori scala); filtro ✦ 42 × 44 incorniciato (9 px dalla prima tessera); cerchi del telefono a 4; testata del Tavolo con scarti d'inchiostro 42 e 58 | 16 px ovunque (8 di spazio e 8 di margine), anche fra due azioni di testo; ✦ è una tessera da 40 col suo filo, a 8 px; cerchi del telefono a 8; «App» e «Torna alla campagna» azioni di testo senza lati: scarti 26 e 26                                                                                                                                                      |
| D16 riga degli strumenti sul telefono (medio) | Strumenti ripiegati in un riquadro grigio 50 × 50 raggio 8, 1 px più in basso; lastre di sessione 44 × 40 accanto a una da 40 × 40                                                    | La stessa lastra nera 40 × 40 raggio 4 delle lastre di sessione, alla loro quota (y 89); lastre a icona tutte 40 × 40, solo «Gruppo» si allarga                                                                                                                                                                                                                               |
| D17 barra del telefono (medio)                | «Combattim…», «Tabelle e m…», «Consultazi…» tagliati in 64 px; «Mappa» e «Scena» con lo stesso glifo                                                                                  | Ogni linguetta larga quanto la parola (la striscia scorre già): nessun taglio; «Scena» con il paesaggio di Material «image»                                                                                                                                                                                                                                                   |
| D18 coppia di pulsanti dell'Inizio (medio)    | Da 16 a 362 px: 12 px prima del bordo destro (374)                                                                                                                                    | Riempie la riga da 16 a 374; restano tutte e due da 48 px, coppia eroica dichiarata                                                                                                                                                                                                                                                                                           |
| D19 doppio filo (basso)                       | Filo del dettaglio del turno 12 px sopra il filo del pannello dei comandi                                                                                                             | Il dettaglio non ha più il filo di chiusura: lo chiude quello che segue                                                                                                                                                                                                                                                                                                       |
| D20 passaggio del puntatore (basso)           | Linguette dell'Inizio ferme; interruttori degli effetti e nomi delle abilità fermi; tasselli dei valori che si scurivano                                                              | Ciò che ha un riquadro si schiarisce (#202020), ciò che è una parola si accende o si sottolinea: linguette dell'Inizio bianche, interruttori e tasselli #202020, nomi e collegamenti del sito sottolineati                                                                                                                                                                    |

### Per superare il riferimento (dalle idee della critica)

| Idea                         | Cosa fa ora                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Segni di costo delle tessere | Il segno di ogni tessera (● azione, ▲ bonus, ✦ reazione, la stessa forma della legenda) segue l'economia del turno: quando quella risorsa è spesa diventa grigio al 60 %, esattamente come il suo segno nella legenda (provato togliendo «available»: da #3F9B62 pieno a #6D7682 al 60 %). Demiplane stampa i costi; qui seguono anche il turno |
| Ordine dei turni             | Tutti i nomi su una linea con ritratti da 40; il riquadro di turno incorniciato d'oro cresce solo in basso per «Turno attuale»; chi agisce dopo ha il bordo alto oro da 1 px (anche quando si torna dal primo all'ultimo). Nei tracker di Roll20 e Foundry il riquadro di turno cambia misura e salta                                           |
| Avanzamento di livello       | «Livello 3 · 900 / 2700 PE» con cifre tabellari, un vero binario di avanzamento (4 px, grigio dadi, riempimento oro) e «Gestisci PE» in fondo alla riga. La testata di Demiplane mostra il livello, non quanto manca al prossimo                                                                                                                |

### Respinto o adattato, con il motivo

- **D01, misure della critica.** Proponeva tessere da 42 con 6 px fra le file, o una barra 6 px
  più alta: 42 e 6 sono fuori scala, e +6 px avrebbe spostato i margini della mappa (152 px) e le
  quote calcolate da `fitHud`. Scelto 40 + 8 + 40, tutti gettoni; l'etichetta del gruppo passa sopra
  il nome perché a 40 px non tocchi il glifo.
- **D08, «centrare il tassello quando manca il punteggio».** Respinto: i valori della fascia non
  starebbero più su una linea (rilievo DMP-03; FORT / REFLEX / WILL di PF2e). Al suo posto ogni
  riquadro ha la riga del piede anche vuota: il vuoto scende da 35 a 23 px, identico in ogni
  riquadro, e tutti i riquadri sono alti 108.
- **D12, voce delle righe del menu.** Tenuta quella del sito (Barlow 14/700): i menu di Demiplane
  sono cornice del sito; ora lo dice anche il commento in testa a `direction.css`.
- **D15, testata del Tavolo.** Con 8 px ai lati gli scarti restavano diversi (il marchio chiude con
  4 px); con 0 px ai lati (le azioni di testo del gioco) sono uguali, 26 e 26 px. Al passaggio il
  colore della navigazione del sito, #22B8CF.
- **D17, «etichette a 12 px».** Non serve: le linguette prendono la larghezza della parola.
- **D18, «48 solo per il pulsante principale».** Tenuta la coppia da 48 (dichiarata), ora a tutta
  riga.
- **D20, tasselli dei valori.** Al passaggio il fondo si schiarisce come i pulsanti; il filo resta
  bianco perché a riposo è già #686868.
- **Idea dei segni di costo, «contorno quando è speso».** Triangolo e stella sono ritagli
  (`clip-path`) e non prendono un contorno; il grigio al 60 % è lo stato «speso» della legenda, così
  tessera e legenda dicono la stessa cosa.

### Audit dei valori (stessi 20 stati)

| Misura                                     | Prima (18:35, audit 20:00)                                          | Dopo (20:40:55, audit 20:42)                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Elementi visibili                          | 2548                                                                | 2540                                                                                                                                                                                                                          |
| Spazi                                      | 23 valori; passo 4 px; 11 fuori scala                               | 24 valori; passo 4 px sul 100 %; 12 fuori scala (in più solo i 20 px della testa del menu della pedina, 8 + 12, un elemento)                                                                                                  |
| Altezze dei controlli                      | 14 (123 compreso)                                                   | 13 (123 sparito; 108 per i riquadri dei valori)                                                                                                                                                                               |
| Misure dei glifi                           | 11 (21, 18, 17, 20, 14, 19 × 21, 16, 18 × 21, 13, 17 × 20, 17 × 21) | 5: 20 nei controlli da 40 (217), 24 nei cerchi (10); fuori dai controlli restano 14 (segni delle risorse sulla Scheda), 13 (matita del ritratto) e 21 (scheda del personaggio dell'Inizio, icone delle righe dell'inventario) |
| Stili di testo · interlinee                | 81 · 26                                                             | 80 · 26                                                                                                                                                                                                                       |
| Raggi · ombre                              | 7 · 14                                                              | 7 · 16 (l'anello oro del riquadro di turno e il filo blu del gruppo di strumenti aperto)                                                                                                                                      |
| Colori (testo · fondo · bordo)             | 10 · 28 · 18                                                        | 10 · 28 · 18                                                                                                                                                                                                                  |
| Pulsanti: classi · varianti (più varianti) | 26 · 77 (16)                                                        | 27 · 74 (15)                                                                                                                                                                                                                  |
| Contrasto AA                               | 0 errori, 0 incerti su 1192                                         | 0 errori, 0 incerti su 1192                                                                                                                                                                                                   |

Rapporti: `fix-demiplane/audit-before/` e `audit-after/` (copia di `visual-01/audit/demiplane/`).

### Verifiche (01/10, dopo l'ultima modifica delle 20:40:55)

- Schermate del round 1 rifatte alle 20:41 (15 e il foglio dei provini, nessun errore nel
  manifesto) e aperte tutte; prima di quelle, due riprese scartate per un'immagine non caricata e
  una richiesta in timeout sotto carico (rifatte). Le coppie in `_pairs/` sono dei giri precedenti
  e non sono state rifatte.
- Garanzie (`round1/demiplane/guarantees-demiplane.txt`, 20 stati): barra delle azioni 113 px a
  1440; a 390 nessuno scorrimento laterale, barra del Tavolo su una riga (63 px), Termina turno,
  Annulla e Annulla preparazione visibili (732–772 px), «Entra al Tavolo» finisce a 733 px; nessun
  bersaglio sotto i 40 px; gruppo e zoom toccabili (coperti solo dal menu della pedina a 390 e dal
  cassetto dell'iniziativa, come prima).
- axe-core 4.13 `color-contrast`: 0 violazioni in 18 prove (`axe-demiplane.txt`).
- Fuoco: 0 anelli tagliati in 14 stati; solo +3 e −3 (`focus-demiplane.txt`).
- Fuori dagli stati del kit: la scelta di una mossa sul telefono (Mappa, Dettagli mossa, dadi,
  annulla) sta su una riga fino a 347 px su 382 con i cerchi a 8 px; il segno di costo speso è
  stato provato togliendo la classe; il passaggio del puntatore su Inizio e Scheda in
  `fix-demiplane/probe/hover/`. Con una creatura Prona la riga «Rialzati» a 390 misura per calcolo
  364 px su 382 (lo stato non si raggiunge con l'esempio di oggi).
- Campionario dei componenti rifatto (`fix-demiplane/specimen-after/`, 1440 e 390, nessun
  problema).
- `node --test design/blueprint/tests/visual01-directions.test.mjs`: 13 test superati. Prettier
  pulito su `directions/demiplane/`.

## Correzione del 01/10: l'avviso del DM sotto l'ordine dei turni

| Rilievo                                                                                                                                              | Causa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Cosa è cambiato                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tavolo del DM in combattimento a 1440×900: i riquadri dei turni (Livia … Mira) coprivano l'avviso «Sessione non avviata» e il suo «Avvia ora» (alto) | Gli avvisi di sessione stanno nello strato della mappa (`session-view.mjs`, `renderHud`), 60 px sotto il bordo alto della mappa come nell'app. Qui la targa nera della scena è alta 77 px e i riquadri dei turni 84 px (112 quello di turno): `fitHud` mette la fila 8 px sotto la targa, cioè fra 97 e 209 px dal bordo della mappa, e la fila centrata arriva fino alla colonna di destra larga 300 px dove sta l'avviso. Succedeva da 721 a 1600 px; a 1366 e a 1280 anche la targa copriva l'angolo sinistro dell'avviso. D&D Beyond, BG3 e Solasta avevano già spostato gli avvisi, Demiplane no | In combattimento, da 721 px in su, gli avvisi di sessione (avviso del DM, timer, orologio fissato) partono 8 px sotto il riquadro di turno: 217 px dal bordo alto della mappa con la targa su una riga, 265 px fino a 1365 px, dove la targa del DM va su due righe (sotto circa 1310 px). Fuori combattimento e sul telefono restano dove li mette l'app. Una sola regola di posizione, nessun cambio di misure, colori o testi |

Prove (01/10, 8881, tema scuro, DM in combattimento al turno di Livia): a 1440×900, 1366×768 e
1280×800 l'avviso sta a 323–427, 323–427 e 371–475 px dall'alto, non tocca né i riquadri dei turni
né la targa, e `document.elementFromPoint` al centro di «Avvia ora» e di «Non ora» restituisce il
pulsante stesso (prima, al centro di «Avvia ora» c'erano il ritratto di Mira a 1440, il riquadro di
Mira a 1366 e la targa a 1280). Pulsanti 72 × 40 e 64 × 40, anello di fuoco di 3 px #00ABFF, barra
delle azioni 113 px, nessuno scorrimento orizzontale. Scansione da 721 a 1920 px, DM e giocatore:
nessuna sovrapposizione; il giocatore non ha avvisi nell'esempio, e targa, fila dei turni e barra
restano come prima. Limiti rimasti: a 721×800 (mappa larga 200 px) «Non ora» finisce sotto la riga
dei dadi della barra, mentre prima era «Avvia ora» a finire sotto i turni; a 390 la regola non si
applica e i riquadri dei turni coprono ancora il testo dell'avviso, come oggi (limite già scritto nel
README del kit). «Avvia ora» e «Non ora» però restano toccabili. Schermate di Demiplane rifatte
con il kit in `board/shots/` e in `round1/demiplane/` (15 + 15, tutte ok, nessun errore in
console), dopo l'ultima modifica di `direction.css`. Il foglio dei provini è
`contact-dark-demiplane.png`, rifatto solo per Demiplane. La coppia `_pairs/06-tavolo-dm.png` non è
stata rifatta e mostra ancora l'avviso coperto.

## Quarto giro di rifinitura (01/10, verifica indipendente e I-250)

| Rilievo                                                          | Cosa è cambiato                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comandi con le parole schiacciati nei cerchi (alto, regressione) | Cerchi e misure fisse valgono solo per i cinque comandi a icona (Muovi, Azioni della scheda, Tira i dadi, Annulla preparazione, Annulla ultima modifica). «Rialzati · 4,5 m» e, sul telefono durante un'anteprima, «Mappa» e «Dettagli mossa» sono pulsanti di gioco: 40 px, 8 × 16, raggio 4, su una riga (116, 68 e 119 px a 390; «Rialzati» 160 × 40 a 1440, sulle tre colonne dell'app). Nessun testo esce dal suo riquadro |
| ±PF del menu della pedina in Roboto (basso)                      | Stessa ricetta del campo numerico (Barlow Condensed 18/700 centrato, 0 × 8). Anche il resto della riga è come sulla Scheda: «PF» è un'etichetta grigia in maiuscoletto (era oro Roboto) e «/ 22» il denominatore della fascia (14/600). Le condizioni attive nella testata del menu sono etichette-tag (erano pillole Roboto)                                                                                                   |
| Condizioni attive alte 42 px (basso)                             | Bordo e fondo passano dal contenitore al pulsante che gestisce la condizione: 40 px bordo compreso sulla Scheda, sul Tavolo e nel campionario. Il pulsante ha l'anello di fuoco da 3 px (quello dell'app era da 2)                                                                                                                                                                                                              |
| «Da dove vuoi iniziare?» in Roboto (basso)                       | Barlow 16/700, come gli altri titoli di voce dell'Inizio. Lo stesso vale per la campagna del prossimo appuntamento («Le lanterne di Bruma») e per i nomi in «Accesso rapido»: erano gli ultimi titoli in Roboto                                                                                                                                                                                                                 |
| Regole senza superficie (basso)                                  | Le condizioni ora valgono solo su Scheda, Tavolo e finestre; l'interruttore offline e il menu del calendario solo nelle loro pagine. `kbd`, il raggio di `.text-button` e il minimo di 40 px di `.clib-link` restano validi in tutta l'app, di proposito: vedi il punto 21 delle differenze                                                                                                                                     |
| «Tutte le discussioni» 1 px più a sinistra (nota)                | Nessun bordo: finisce a 1008 px come gli altri collegamenti «vedi tutto»                                                                                                                                                                                                                                                                                                                                                        |
| Barra con una creatura Prona (info)                              | Misurata dopo la correzione: 169 px a 1440 (oggi 168; la fila in più è quella di «Rialzati», come oggi, fuori dallo stato del kit). Termina turno, Annulla e Annulla preparazione restano visibili e non si sovrappongono a nulla, anche a 390                                                                                                                                                                                  |
| I-250: le azioni di testo dell'Inizio                            | Ogni pulsante leggero dell'Inizio è il collegamento azzurro del sito, 8 × 0, senza bordo: «Segna tutte come lette», «Segna come letta», «Unisciti con un invito», «Nascondi i primi passi». Prima erano pulsanti bianchi da 8 × 16 dentro un bordo trasparente da 1 px. Dopo un altro pulsante stanno a 12 px, come nella voce di gioco                                                                                         |
| I-250: le pieghe della Scheda                                    | «Perché?» (Magie), «Regola d'ingombro» e «Visualizzazione» (Inventario) sono azioni di testo di gioco in maiuscoletto bianco 18/700, come le pieghe del widget PF (erano in oro Roboto 14). La regola d'ingombro, che va su due righe, resta alta 40 px. Il rimando SRD del viaggio è grigio come quello delle mosse speciali (era oro)                                                                                         |
| I-250: Termina turno sul telefono                                | 18/700 come ogni pulsante di gioco da 40 px: la regola a 18 c'era già ma non vinceva, quindi restava 24. Ora è largo 114 px (prima 139)                                                                                                                                                                                                                                                                                         |
| I-250: il menu del calendario («Aggiungi al calendario»)         | Ha la superficie del menu della pedina (#1B1C22, filo da 1 px, raggio 4, elevazione 8; prima era la scheda #3F3F3F dell'app con angoli da 16) e righe Barlow 14/700 quadrate da 40 px (44 sul telefono)                                                                                                                                                                                                                         |

Prove: schermate del round 1 rifatte alle 15:58–15:59, dopo l'ultima modifica di `direction.css`
(15:58:39). Le ho aperte tutte e 15. Coppie rifatte alle 16:00 con `probe-demiplane/polish4/pairs.sh`.
Garanzie, axe e fuoco rifatti alle 16:01–16:02 (`round1/demiplane/*.txt`); audit delle 16:01.
Sonde dal vivo in `probe-demiplane/polish4/`: `hotbar-prone-live.txt` e `hotbar-noprone-live.txt`,
con le coppie oggi/Demiplane `*-pair-390.png` e `prone-pair-1440.png`; `chips-live.txt`,
`tm-live.txt`, `homefull-after.txt`, `calmenu-1440.png`, `fold-*.png`; il campionario in
`specimen-after/`.

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

## Verifiche (01/10/2026, dopo il quarto giro)

- Barra delle azioni 113 px a 1440×900 (limite 120) in combattimento, DM, esplorazione, menu della
  pedina e cassetto dell'iniziativa. Nessuno scorrimento orizzontale a 390 e a 1440 nei dieci
  stati, Scheda intera compresa. Termina turno, «Annulla preparazione» e «Annulla ultima modifica»
  sono visibili a 390: in basso arrivano a 772 px su 844; Termina turno è largo 114 px. «Entra al
  Tavolo» finisce a 733 px a 390. La barra del Tavolo a 390 sta su una riga (63 px).
- Fuori dagli stati del kit: con Livia Prona e con una mossa in anteprima («Schivata»), a 390 e a
  1440, i comandi con le parole sono riquadri da 40 px con il testo dentro (larghezza visibile =
  larghezza del testo) e nessun pulsante si sovrappone a un altro. Termina turno è a
  268–382 × 732–772. Con Livia Prona la barra a 1440 è alta 169 px (oggi 168).
- Zoom e gruppo: i quattro comandi di zoom e i tre ritratti del gruppo rispondono al tocco in
  combattimento, DM ed esplorazione. A 390 il gruppo finisce a y = 631 e la barra comincia a
  y = 634. Restano coperti solo dal menu della pedina aperto (390) e dal cassetto
  dell'iniziativa, come prima.
- Bersagli: nessun controllo sotto i 40 px negli stati provati. Le condizioni attive sono alte
  40 px e i loro pulsanti 40 px.
- Fuoco da tastiera: anello di 3 px #00ABFF su ogni controllo raggiunto con Tab su Inizio, Scheda e
  Tavolo (63 su 63). Lo stesso anello compare sul pulsante della condizione. La pedina mostra il
  suo anello tratteggiato dell'app.
- Contrasto: axe-core 4.13 (solo `color-contrast`) trova 0 violazioni in 18 prove (9 stati × 2
  larghezze). L'audit trova 0 testi sotto AA e 0 incerti su 1192. I bordi dei campi sono
  ≥ 3:1 (WCAG 1.4.11).
- `node --test design/blueprint/tests/visual01-directions.test.mjs`: 7 test superati. Le regole
  sono 683, tutte con il prefisso e con `:not([data-pref-theme="light"])`; nessun `!important`,
  `text-transform` o testo in `content` (`probe-demiplane/polish4/lint.txt`, `lint-full.txt`).
  Prettier è pulito.
- Prove: `round1/demiplane/guarantees-demiplane.txt`, `axe-demiplane.txt`, `focus-demiplane.txt`;
  audit in `visual-01/audit/demiplane/audit.md`; sonde in `probe-demiplane/polish4/`.

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
| `assets/icons/image.svg`               | «Scena» nella barra del Tavolo    | `a058794a3d5a1e73d6dafe4d9670c4fd7f8e72478c9f1f37dcf6363b335542f2` |

`image.svg` porta il tracciato del simbolo `image` già in `icons.mjs` (file sorgente
`8c52a2c10ff52376…`, stessa origine e licenza), invariato, nell'involucro dei file sorgente.

Glifi originali (giro dei dettagli, 01/10), disegnati in codice per questa opzione sul reticolo
24 × 24 di Material, pieni come il resto; nessun tracciato copiato, stessa licenza del progetto:

| File                                | Uso                                                          | sha256                                                             |
| ----------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `assets/icons/dp-route.svg`         | «Pianifica percorso» (due tappe e il tragitto)               | `2bade6df3bf34cd64e7e548f413db858beda26379fce01773ac280b5b6a21a4b` |
| `assets/icons/dp-pan.svg`           | «Sposta vista» (mano aperta)                                 | `b0ec2dc2b3d08ad3a4336e8b9a054cfc3feaf16e65bae22f898b6ff81a4630d1` |
| `assets/icons/dp-select-tokens.svg` | «Seleziona più pedine» (riquadro tratteggiato su due pedine) | `06dba3c66d1e9efc9a66d7c185fab0cc4272704d61e4488a2f62768d09be6e60` |

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

## Marchio (I-251)

Il marchio di questa opzione è un **d20 di vetro notturno dentro un filo azzurro elettrico**, con
la faccia del «20» accesa come una finestra nella sfumatura azzurro → blu del sito, e accanto la
scritta **«d20 STUDIO»** bianca in Barlow: «d20» in grassetto, «Studio» in maiuscoletto
spaziato. Il dado è disegnato in codice (`brand.mjs`, SVG) sulla geometria comune a tutte le
opzioni (`../brand-geometry.mjs`, un icosaedro vero visto di faccia); la scritta è il testo
dell'app con le regole della sezione «Marchio (I-251)» in fondo a `direction.css`. Nessuna
immagine, nessun file nuovo oltre a `brand.mjs` (Barlow è già nel repository e già caricato da
questa opzione).

- **Dove si vede:** testata di Inizio e del Tavolo (lo stesso marchio: dado di 32 px, scritta di
  24 px); telefono fra 421 e 720 px (dado di 28 px, scritta di 18 px); sotto i 421 px solo il
  dado, dentro il bersaglio di 40 px (al Tavolo l'app lo nasconde già sul telefono); l'icona
  della scheda del browser. Con il tema chiaro tornano il marchio, la scritta e l'icona di oggi.
- **Campionario:** <http://127.0.0.1:8881/directions/specimen.html?direction=demiplane>, sezione
  «Marchio» (le due testate, il dado da 16 a 160 px su fondo scuro e chiaro, l'icona della
  scheda a 16 e 32 px, il marchio completo a 3×).
- **Prove:** `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/brand-demiplane/`:
  `final/compare-brand-demiplane.png` (le testate di Demiplane accanto al marchio, a 2× e 3×),
  `final/hdr/` (le testate a 2× a 390, 600, 721, 881, 1150 e 1440 px), `final/states.png`
  (riposo, puntatore sopra, fuoco da tastiera), `final/shots/spec-brand-dark-1440-demiplane.png`
  (la sezione del campionario), `final/board-2x.png` e `final/board-1x.png` (il dado da 16 a 160
  px su nero, sul fondo della pagina e su chiaro; l'icona della scheda), le misure in
  `final/measure.json`; `before/` (prima), `refs/` (i ritagli delle testate di Demiplane, solo
  consultazione), le prove scartate (`board-v1.png`, `favtest-v1*.png`, `variants-wordmark.png`)
  e gli script in `tools/`.

### Cosa prende dalla grammatica di Demiplane

| Elemento del marchio                                                                                | Da Demiplane                                                                                                            | Fonte                                                                                   |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Il filo azzurro elettrico (#00ABFF) attorno al dado, con un alone azzurro di 3 px sul nero          | la linea luminosa del «portale» nel logo della testata, azzurra sul nero; lo stesso azzurro della linguetta «All Games» | `demiplane-home-live-anon-1440x900.png` (testata); facts §1.1                           |
| La luce sul filo: più chiaro in alto a sinistra (#5FD2FF), più profondo in basso a destra (#0A86FF) | il bagliore del portale, più forte da un lato                                                                           | `demiplane-home-live-anon-1440x900.png` (osservato)                                     |
| Il corpo del dado: vetro notturno, dal blu notte #050B13 a un blu acciaio, con un velo di riflesso  | il fondo della pagina d'ingresso, #050B13, quasi nero con il bagliore blu del portale                                   | facts §1.1 «Home hero background»                                                       |
| La faccia del «20» accesa: sfumatura da #00ABFF a #0D49FF, un bagliore bianco, il numero bianco     | il pulsante «Become member»: `linear-gradient(90deg, rgb(0,171,255), rgb(13,73,255))` sotto la scritta bianca           | facts §1.1 [CSS navigation.css]                                                         |
| Il «20» e la scritta in Barlow, bianchi                                                             | Barlow è il carattere del sito Demiplane (navigazione 16/700, pulsanti 14/600)                                          | facts §1.2                                                                              |
| La scritta bianca e piatta (niente ombre, contorni o sfumature), il colore solo nel simbolo         | il logotipo DEMIPLANE: lettere bianche piatte sul nero, l'azzurro solo nel simbolo                                      | `demiplane-home-live-anon-1440x900.png`                                                 |
| «Studio» in maiuscole aperte e spaziate                                                             | le maiuscole larghe e spaziate del logotipo, e «NEXUS» sotto il nome del gioco nelle testate delle Nexus                | `demiplane-home-live-pathfinder-nexus-1440x900.png`, `…-daggerheart-nexus-1440x900.png` |
| Al passaggio del puntatore il dado si accende (luminosità 1,2) e l'alone si allarga                 | le schede dei giochi e il pulsante dei membri: `filter: brightness(1.2)`                                                | facts §1.1, §1.4                                                                        |
| L'anello del fuoco azzurro (#00ABFF), 3 px                                                          | l'azzurro dei collegamenti di Demiplane, già il fuoco di tutta questa opzione                                           | facts §1.1; `direction.css` (`--focus`)                                                 |

### Cosa è originale

- La forma: il dado a venti facce, uguale in tutte le opzioni; qui fatto di vetro notturno, con
  le dieci facce calcolate una per una con la luce in alto a sinistra, tagli scuri fra le facce
  e un velo di riflesso sulla metà in alto a sinistra; la faccia del «20» è una finestra accesa,
  con il bordo azzurro chiaro (#8FDCFF) e un bagliore bianco che sale dal centro.
- La scritta «d20 Studio»: «d20» resta la notazione dei dadi (minuscola, grassetto), «Studio» in
  maiuscoletto spaziato (0,12 em), alto esattamente come la pancia della «d» e sulla stessa riga
  di base. Il maiuscoletto lo disegna il browser (Barlow non ne ha) con `font-variant-caps`: il
  testo resta «d20 Studio» e non c'è `text-transform`.
- L'icona della scheda: lo stesso dado con tre soli blu, tagli scuri più spessi, la finestra
  chiara (da #A6E6FF a #18A8FF) e il filo azzurro su un contorno blu notte, senza numero (a 16 px
  non si leggerebbe); si riconosce sulla barra scura (il filo) e su quella chiara (il contorno e
  il corpo blu notte).

### Perché non è una copia del logo di Demiplane

Il logo di Demiplane è un anello azzurro spezzato, come una pennellata che si assottiglia alle
estremità, attorno a una «D» bianca geometrica, seguito dalla parola «DEMIPLANE» in un carattere
disegnato apposta (con la A senza traversa). Qui non c'è nessun cerchio o arco, nessun tratto
spezzato o a pennellata, nessuna «D», nessuna lettera di quel carattere: il contorno è
l'esagono continuo di un dado vero, la parola è «d20 Studio» in Barlow (OFL, il carattere della
loro interfaccia, non quello del loro logo). Della loro grammatica prendiamo solo luce, colori e
materiali: l'azzurro elettrico luminoso sul nero, il blu notte della pagina d'ingresso, la
sfumatura del loro pulsante, il bianco piatto delle lettere. Nessun pixel, tracciato o carattere
di Demiplane è entrato nel repository; i riferimenti restano in
`~/Workspace/Codex/d20-studio-visual-assets/references/demiplane/`.

### Dettagli curati (misure a 2×)

- **Allineamento:** l'inchiostro di «d20» (dalla cima della «d» alla riga di base) ha il centro
  su quello del dado entro un quarto di pixel, e il dado sta sul centro della barra entro mezzo
  pixel, sull'Inizio e sul Tavolo; «STUDIO» sta sulla stessa riga di base di «d20».
- **Distanze:** 8 px fra il dado e le parole (12 px dall'inchiostro del dado, che sta 4 px dentro
  il suo quadrato); lo spazio fra «d20» e «STUDIO» aperto di un decimo di em, così resta più
  largo della spaziatura delle maiuscole; la spaziatura dopo la «O» è restituita e 4 px chiudono
  la scritta, così l'anello del fuoco sta a 7 px dall'inchiostro del dado a sinistra e a 7 px
  dalla «O» a destra.
- **Altezza:** la testata non cambia a nessuna larghezza (16 larghezze da 390 a 1440 px, Inizio
  e Tavolo: 81 e 63 px sul computer, 105 e 63 px a 390, 133 e 125 px fra 721 e 800 dove va già
  su due righe): il pulsante del marchio resta alto 44 px sul computer e 40 px sul telefono, come
  prima, mai sotto il bersaglio di 40 px.
- **Larghezza e spazio nella testata:** il marchio è largo 163 px sul computer (prima 152
  sull'Inizio, 142 al Tavolo) e 130 px sul telefono (prima 136). Prima di questo lavoro la
  testata dell'Inizio scorreva già di lato fra 881 e 909 px (fino a 27 px) e fra 1101 e 1124 px
  (fino a 23 px), e il margine destro si stringeva fino a circa 940 e 1155 px; con il marchio più
  largo sarebbe peggiorato di 11 px. Corretto in `direction.css`: fra 881 e 1100 px la testata
  dell'Inizio prende la stretta che l'app stessa fa sotto i 1100 px, sulle misure di questa
  opzione (16 px fra i gruppi e ai lati, 8 px ai lati delle voci di navigazione, che restano
  alte 40 px con la stessa sottolineatura); il campo bianco di ricerca compare da 1200 px (prima
  da 1101): sotto resta l'icona di 40 px, come a 1100. Ora nessuno scorrimento laterale e i due
  margini uguali a ogni larghezza da 881 px in su.
- **Puntatore e tastiera:** al passaggio il dado si accende e l'alone si allarga (180 ms; nessuna
  animazione con il movimento ridotto); con la tastiera l'anello azzurro di 3 px dell'app, con gli
  angoli di 4 px dei pulsanti, mai tagliato (3 px di margine dentro la testata del Tavolo, 2 px
  sul telefono).
- **Contrasto:** scritta bianca sul nero 21:1; il filo azzurro #00ABFF sul nero 8,3:1. L'analisi
  dei valori (`changes/visual-01/audit`, Inizio e Tavolo a 1440 e 390 px) non trova errori di
  contrasto; elenca come fuori scala solo le correzioni ottiche della scritta, volute e in em
  perché seguono la scritta a 24 e 18 px (2,4 px sotto le parole, 2,88 px di spaziatura,
  −2,88 px restituiti dopo la «O»).

### Strade scartate (le prove sono nella cartella delle prove)

- **«Studio» azzurro** (#00ABFF): più «tecnologico», ma faceva concorrenza al dado, e il logotipo
  di Demiplane è bianco.
- **«Studio» a peso 600:** a 1× era troppo sottile accanto a «d20» in grassetto.
- **Maiuscoletto su tutta la scritta:** Barlow non ha cifre da maiuscoletto, e il «20» restava
  più alto della «D».
- **Prima prova del dado** (filo di 5 unità, facce piatte): a 160 px sembrava un distintivo
  esagonale con dentro un dado; ora il filo è più sottile e prende la luce, e le facce hanno più
  stacco fra loro.
- **Icona della scheda senza tagli fra le facce:** a 16 px esagono e triangolo si leggevano come
  un segnale di pericolo, non come un dado.
