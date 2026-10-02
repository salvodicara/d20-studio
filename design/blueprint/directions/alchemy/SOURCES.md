# Opzione 8 · Alchemy RPG — da dove viene ogni scelta

Scelta 1 — Direzione, primo giro (I-248), 01/10/2026, resa coerente in ogni misura (I-250); giro
di correzioni dello stesso giorno sulle critiche A1–A8 (sezione «Risposte alla critica»), secondo,
terzo, quarto e quinto giro di rifinitura sui punti della verifica indipendente (sezioni «Risposte
alla verifica» e «Coerenza (I-250)»), giro dei dettagli sulla critica AL-D01…D16 (sezione «Dettagli
rifiniti»: distanze tra i pulsanti, allineamento ottico, carte uguali, fuoco, marchio), sesto giro
sui punti della verifica dopo il marchio (sezioni «Risposte alla verifica (sesto giro)» e «Coerenza
(I-250)», «Sesto giro»). Tema scuro, a 1440 × 900 e 390 × 844. Le schermate sono in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round1/alchemy/`; i confronti già
montati (nostra schermata a sinistra, riferimento a destra) in `round1/alchemy/_pairs/`. Le immagini
di riferimento sono in `~/Workspace/Codex/d20-studio-visual-assets/references/alchemy/`
(`facts.md`, `manifest.md`): restano lì, non entrano nel progetto.

## In tre righe

1. Questa opzione copia Alchemy, il tavolo virtuale «cinematografico»: la scena dipinta, sfocata e
   scurita, sta dietro tutto lo schermo, e l'interfaccia ci galleggia sopra in pezzi di vetro scuro
   traslucido, con pulsanti rotondi, pillole e bordi sottilissimi che sfumano dall'alto verso il
   basso.
2. All'Inizio non c'è una barra in alto: una colonnina di icone piene sta sul bordo sinistro (sul
   telefono diventa un dock in basso) e il contenuto sta in una colonna centrale con un grande
   riquadro illustrato e pulsanti bianchi a pillola. La Scheda si apre come una finestra alta sopra
   il tavolo oscurato: il ritratto riempie la testata e sfuma nel nero, il nome grande ci sta sopra.
3. I titoli usano una lettera larga (Unbounded, al posto di Nominee Extended), il testo una lettera
   rotonda e ariosa (Lexend, al posto di Nominee), con due soli pesi per carattere; nel gioco le
   icone sono a filo sottile. Fuori dal gioco l'accento è l'oro di Alchemy, dentro il gioco è il
   rosso del tema D&D 5e, come fa Alchemy: l'effetto è elegante, scuro, quasi da trailer.

## Elemento → prodotto copiato → fonte

Le sigle (T1, S1, H1, D1, P1…) sono le righe di `manifest.md` nella cartella dei riferimenti.
«[C]» indica un valore letto nel codice pubblico di Alchemy 1.38.0
(<https://app.alchemyrpg.com/assets/index-B1hJMbwH.css>,
<https://app.alchemyrpg.com/assets/index-CqbA3Ifk.js>), «[O]» un colore o una misura campionati
sull'immagine, «[D]» il centro d'aiuto ufficiale. Le misure sono in `facts.md`. Gli URL delle
immagini: T1–T5 e S1–S2 sono fotogrammi del video <https://cdn1.czepeku.com/alchemy-homepage/videos/gameplay.webm>
(pagina <https://alchemyrpg.com/>); H1–H3, D1, D6, P1, P5 sono catture della web app pubblica
<https://app.alchemyrpg.com/>; T16, T19, S3 sono immagini del negozio
(`https://cdn.alchemyrpg.com/users/6003d6b6708dcf0008912a72/media/…`, URL completi in `manifest.md`);
S10 e D7 vengono dal centro d'aiuto (<https://help.alchemyrpg.com/>).

### Tutte le pagine

| Elemento                                                                                                                                                                                                                 | Prodotto copiato                                               | Fonte                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Fondo quasi nero #101217, con un leggero alone chiaro in alto                                                                                                                                                            | Fondo dell'app Alchemy (`background`, `theme-color`)           | [C] tema `g5`; [O] H1 `alchemy-home-dashboard-1440.png` (#101218), <https://app.alchemyrpg.com/>                    |
| «Vetro»: bianco al 4 % sul fondo, sfocatura, bordo di 1 px bianco al 10 % che sfuma dall'alto verso il basso (qui come riflesso di 1 px in alto o bordo a gradiente)                                                     | Ricetta `.glass` di Alchemy                                    | [C] variabili `--glass-*` in `:root`; [O] H1 (#1B1E26), H2 (#191B20)                                                |
| Pannelli e avvisi sopra la scena: vetro scuro rgba(13 20 28 / .85)                                                                                                                                                       | `popoverBackground` di Alchemy                                 | [C]; [O] T4 `alchemy-table-5e-token-context-menu.png`                                                               |
| Raggi: 14 px fuori, 8 px dentro, 30 px le barre segmentate, pillole e cerchi                                                                                                                                             | `rounded-outer` / `rounded-inner` / AlchemyTabs                | [C]                                                                                                                 |
| Scala unica (I-250): spaziature 2·4·6·8·12·16·24·32·48·64·96; testo 10·12·14·16·18·20·24·30 con le loro interlinee; bordi 1 e 2 px; comandi 40 px (48 px rotaia, campi, FAB)                                             | Tema Tailwind di Alchemy (scala `a1…a24`, `text-2xs…3xl`)      | [C]; `facts.md` §0                                                                                                  |
| Due pesi per carattere: Lexend 400 e 600, Unbounded 700 e 900. I caratteri dichiarano solo questi pesi, quindi un peso diverso chiesto dall'app si disegna col più vicino                                                | Nominee Medium/Bold, Nominee Extended Bold/Black               | `facts.md` «Typography»                                                                                             |
| Tre spaziature delle lettere: 2 px le schede, 1 px le etichette, 0,4 px pulsanti e numeri delle statistiche                                                                                                              | `tabBars`, etichette, `AlchemyTabs.Trigger`, pulsanti          | [C]                                                                                                                 |
| Accento oro #8A6C3C fuori dal gioco (testo #C4B998)                                                                                                                                                                      | «Alchemy Gold», il tema predefinito                            | [C] `g5.accent`, `accentLight`; [D] articolo sui temi; [O] H1, D1                                                   |
| Accento rosso #D2232A dentro il gioco (Tavolo e Scheda; testo #F2676C)                                                                                                                                                   | Tema di universo D&D 5e (Alchemy ricolora tutto per gioco)     | [O] T1 `alchemy-table-5e-scene-story-mode-journal-party-scenes.png`, S1; [D] esempio #D2232A nell'articolo sui temi |
| Stato attivo bianco: pillole bianche con testo nel colore d'accento, etichette attive bianche, fondi attivi bianco al 10 %                                                                                               | Pulsante pieno bianco «CREATE», segmenti attivi di AlchemyTabs | [O] H1, H3 `alchemy-home-marketplace-1440.png`; [C]                                                                 |
| Lexend per il testo e per le etichette delle statistiche (maiuscoletto 600)                                                                                                                                              | Nominee; «ARMOR CLASS», «STR» in Nominee Bold                  | `facts.md` «Typography»; [O] S2 `alchemy-sheet-5e-modal-stats-tab.png`                                              |
| Unbounded per titoli, schede, etichette dei campi e pulsanti                                                                                                                                                             | Nominee Extended Bold / Black                                  | `facts.md` «Typography»; [O] H1 «Featured», D1 «v1.37.0»                                                            |
| Maiuscoletto solo dai passi da 14 e 16 px (maiuscole da 10 e 11 px); le etichette piccole nella barra («Armi») restano in minuscolo da 10 px                                                                             | Tab bar e pulsanti Alchemy a 10 px maiuscoli                   | [C] `tabBars`, `AlchemyTabs.Trigger`, pulsanti                                                                      |
| Schede (tab): parola bianca al 50 % → bianca, sotto quella aperta una barretta d'accento corta (14 × 3)                                                                                                                  | Linguette JOURNAL / PARTY / STATS                              | [O] T1, S1 `alchemy-sheet-5e-modal-portrait-header.png`                                                             |
| Barre segmentate di vetro (Gioco / Modifica, dadi digitali / fisici, linguette dell'Inizio)                                                                                                                              | AlchemyTabs: pillola di vetro alta 48, raggio 30               | [C]; [O] H3, T16                                                                                                    |
| Pulsante secondario: pillola scura (bianco al 5 %) con maiuscoletto esteso nero                                                                                                                                          | «ADD ANOTHER ACTION», «ADD ROLL»                               | [O] D7 `alchemy-dialog-action-editor-daggerheart.png`                                                               |
| Campi: bordo di 2 px bianco al 10 % che diventa d'accento al fuoco, fondo nero al 14 %, raggio 8; alti 48 nei moduli, 40 quelli in riga (il d20 dell'iniziativa, i punti ferita)                                         | Moduli di Alchemy                                              | [O] D6 `alchemy-dialog-signup-1440.png`, D7; [C] `formBackground`                                                   |
| Caselle da spuntare da 20 px: pozzetto scuro con bordo di 2 px; spuntate, piene d'accento con il segno bianco (lo stato si legge dal segno, non dal colore)                                                              | Interruttori e caselle dei moduli                              | [O] D7, S10 `alchemy-sheet-gold-edit-character-tab.png`                                                             |
| Interruttori da 40 × 24: spenti con la traccia traslucida e il pomello bianco a sinistra, accesi verdi #289C61 con il pomello a destra (lo stato si legge dalla posizione del pomello); uno solo in tutta l'app          | Interruttori iOS delle impostazioni                            | [O] D6, D9 `alchemy-dialog-profile-gameplay-settings.jpg`; [C] verde `--theme-color-green`; `facts.md` «Switch»     |
| Finestre: fondo scuro al 60 %, cornice di vetro di 6 px, corpo #101217, immagine in testa che sfuma nel corpo, titolo in nero esteso da 30 px, riga d'accento sotto, pulsante di chiusura rotondo fuori dal bordo destro | Finestra delle note di versione                                | [O] D1 `alchemy-dialog-release-notes-1440.png` (<https://app.alchemyrpg.com/?item=6aadcfb79acb983d9577897d>)        |
| Finestre sul telefono: foglio a tutto schermo, titolo centrato sull'immagine, chiusura rotonda in alto a destra, pulsanti a tutta larghezza uno sotto l'altro                                                            | Finestra sul telefono                                          | [O] P5 `alchemy-phone-dialog-release-notes-390.png`                                                                 |
| Menu: vetro scuro, raggio 14, righe da 40 px raggio 8 che si accendono al 10 %, icone al 50 %                                                                                                                            | Menu della pedina                                              | [O] T4; [C] stili delle voci di menu                                                                                |
| Righe vuote («Nessuna azione personalizzata») come riga di vetro, non come riquadro tratteggiato                                                                                                                         | Liste vuote di Alchemy                                         | [O] T5                                                                                                              |
| Icone nel gioco e nei pulsanti di servizio a filo sottile (spessore 1,5); icone della rotaia e del dock dell'Inizio piene                                                                                                | Rotaia degli strumenti (a filo) e rotaia della Home (piena)    | [O] T1, T2, H1; `facts.md` «Iconography»                                                                            |
| Marchio proprio (I-251): d20 di tessere d'oro piatte, faccia del «20» bianca; «d20» bianco in nero esteso e «Studio» in maiuscoletto d'oro, nella pillola di vetro con l'alone caldo                                     | Pillola del logo; logo del piè di pagina e dell'iscrizione     | [O] H1, H2, D6, T1, D1; sezione «Marchio (I-251)»                                                                   |
| Ritmo dei pulsanti: dove pulsanti pieni e parole senza fondo stanno su una riga, ogni distanza che si vede è 32 px (parola–parola, parola–pillola, pillola–parola), le pillole restano a 8 px                            | Nostro (Alchemy alterna 24 e 40 px nelle stesse righe)         | sezione «Dettagli rifiniti», AL-D02                                                                                 |
| Allineamento ottico: un pulsante senza fondo che apre o chiude una riga mette la parola (o il glifo) sul bordo del testo; il bersaglio da 40 px e la pillola al passaggio sporgono nel margine                           | Nostro (in Alchemy la parola rientra di 16 px)                 | sezione «Dettagli rifiniti», AL-D05                                                                                 |

### Inizio

| Elemento                                                                                                                                                                                    | Prodotto copiato                            | Fonte                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| Niente barra in alto: logo in pillola a sinistra, servizi in una pillola di vetro a destra                                                                                                  | Testata fluttuante della Home               | [O] H1 `alchemy-home-dashboard-1440.png`                                |
| Le quattro pagine come rotaia verticale di pulsanti rotondi da 48 px con icone piene, al centro del bordo sinistro; la pagina aperta su un disco #32353C                                    | Rotaia Home / Marketplace / Community / Lab | [O] H1 (pillola 60 × 240 a 16 px dal bordo)                             |
| Profilo in un cerchio separato in basso a sinistra                                                                                                                                          | Pulsante del profilo                        | [O] H1                                                                  |
| Contenuto in una colonna centrale dell'80 %                                                                                                                                                 | Colonna 144–1296 su 1440                    | [O] H2 `alchemy-home-dashboard-1440-full.png`                           |
| Titolo della pagina da 24 px e titoli delle schede da 18 px, larghi, in frase normale                                                                                                       | «Featured», «What's New» (circa 18 px)      | [O] H1, H2                                                              |
| «Continua a giocare» come il riquadro «Featured»: illustrazione a tutta larghezza in una cornice di vetro di 6 px, testo in basso a sinistra, pillola bianca e collegamento in maiuscoletto | Carosello «Featured»                        | [O] H1                                                                  |
| Schede con fondo #191B20 e raggio 14, metadati in piccolo maiuscoletto grigio                                                                                                               | Griglia «What's New»                        | [O] H2                                                                  |
| «Il tuo personaggio»: ritratto rotondo con anello d'accento                                                                                                                                 | Avatar della lista del gruppo               | [O] T1                                                                  |
| Telefono: dock di vetro in basso con i pulsanti rotondi, su una fascia del colore della pagina; il riquadro illustrato diventa verticale con il testo centrato                              | Home sul telefono                           | [O] P1 `alchemy-phone-home-390.png` (<https://app.alchemyrpg.com/home>) |

### Scheda

| Elemento                                                                                                                                                                                                                      | Prodotto copiato                               | Fonte                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| La scheda come finestra alta al centro, sopra il tavolo oscurato (la mappa d'esempio al 60 % di nero)                                                                                                                         | Finestra del personaggio aperta sul tavolo     | [O] S1 `alchemy-sheet-5e-modal-portrait-header.png`               |
| Cornice di vetro di 6 px, corpo #101217                                                                                                                                                                                       | Cornice delle finestre                         | [O] D1 (#18191C, riflesso #303133)                                |
| Il ritratto (è il pulsante «Aspetto») riempie tutta la larghezza della testata, ritagliato, e sfuma nel nero; il nome sale nella sfumatura                                                                                    | Testata con ritratto                           | [O] S1                                                            |
| Nome grande in nero esteso, sotto una riga d'accento (classe e livello)                                                                                                                                                       | «KALINA QUILL» + «LEVEL 5 KINDLED CORVUM BARD» | [O] S1                                                            |
| Riga d'accento di 1 px rientrata di 24 px                                                                                                                                                                                     | Divisore della finestra                        | [O] S1, D1                                                        |
| Pillola esterna di pulsanti rotondi a destra: chiudi (torna ai personaggi), condividi, gestisci                                                                                                                               | Pillola chiudi / modifica / apri               | [O] S1, D1                                                        |
| La visibilità («Solo campagna») come pillola di vetro con l'occhio e le sue parole, in alto a destra sull'immagine; la matita del ritratto in alto a sinistra                                                                 | Interruttore di visibilità della scheda        | [O] S10 `alchemy-sheet-gold-edit-character-tab.png`               |
| Caratteristiche in sei colonne e valori principali in fila, senza riquadri, tutti allineati in alto: etichetta in maiuscoletto bianco, valori in testo semplice («10 +0»)                                                     | Blocco statistiche 5e                          | [O] S1, S2 `alchemy-sheet-5e-modal-stats-tab.png`                 |
| Linguette corte e centrate, tutte e sette intere nella colonna; «Tutte» un pulsante rotondo da 40 px nella stessa riga; sulla scheda stretta la fila scorre, si ferma su una linguetta e sfuma dal lato dove ce ne sono altre | STATS / SPELLS / DESCRIPTION                   | [O] S1                                                            |
| Titoli di sezione nella lettera larga con una riga d'accento di 1 px sempre a tutta larghezza, anche quando il titolo divide la riga con dei comandi; 24 px sopra i titoli di gruppo                                          | «Actions»                                      | [O] S2                                                            |
| Azioni, magie e oggetti come righe di vetro (raggio 8, riflesso in alto)                                                                                                                                                      | Righe delle azioni del tavolo                  | [O] T5 `alchemy-table-5e-player-bar-actions-panel-playing-as.png` |
| Magie e Inventario: riquadri riassuntivi di vetro in una griglia che non stringe mai le etichette (almeno 128 px per le magie, 240 per l'inventario), valori in Lexend 600 da 18                                              | Righe AC / HP / SPEED e blocco del PNG         | [O] S2, S3 `alchemy-sheet-5e-npc-statblock-modal.webp`            |
| Pallini rotondi per slot e sintonia; i collegamenti «Perché?», «Regola d'ingombro…», «Visualizzazione…» nel colore d'accento chiaro                                                                                           | Tracciatori a pallini del layout Lumen         | [O] T16 `alchemy-table-lumen-daggerheart-story-dice-bar.webp`     |
| Telefono: la finestra diventa un foglio a tutto schermo; i pulsanti rotondi e la pillola della visibilità stanno in fila in alto                                                                                              | Finestra sul telefono                          | [O] P5 `alchemy-phone-dialog-release-notes-390.png`               |

### Tavolo

| Elemento                                                                                                                                                                                                       | Prodotto copiato                                                           | Fonte                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| La scena dietro tutto: la mappa dipinta, sfocata e scurita, riempie lo schermo intorno alla mappa viva (bordo sinistro, fascia sotto il titolo, testata); vignettatura sui bordi                               | Modalità «story» a tutto schermo                                           | [O] T1; `facts.md` §1 tratto 1                                                                      |
| Testata senza barra: solo pillole di vetro (logo, App, Torna alla campagna, servizi)                                                                                                                           | Pillola del logo del layout Lumen                                          | [O] T16 `alchemy-table-lumen-daggerheart-story-dice-bar.webp`                                       |
| Titolo della scena in alto al centro, sopra la mappa; sotto, in piccolo, lo stato                                                                                                                              | «River's Edge Tavern / ALCHEMY DISTRICT»                                   | [O] T1                                                                                              |
| Ordine dei turni: ritratti rotondi da 44 px sotto il titolo, quello di turno da 56 con anello d'accento e alone; nemici con anello rosso tratteggiato; nomi sempre interi                                      | Lista dell'incontro (resa in fila, come chiede il piano in `facts.md`)     | [C] pannello dell'incontro; [O] T19 `alchemy-table-lumen-alien-tactical-grid-turn-order-panel.webp` |
| Strumenti della mappa come colonna di pulsanti rotondi di vetro accanto alla colonna destra, icone a filo; lo strumento attivo è un disco bianco, il gruppo aperto un anello d'accento; zoom sullo stesso asse | Rotaia degli strumenti accanto al pannello del gruppo                      | [O] T1, T2 `alchemy-table-5e-tactical-map-tokens-tool-rail.png`                                     |
| Comandi della scena (DM: incontro, scene, riposi, tempo) in una colonna di pillole in alto a sinistra; sul telefono in due file di pillole uguali                                                              | Colonne d'angolo                                                           | [O] T1, T7                                                                                          |
| Colonna destra di vetro traslucido con sotto-linguette a barretta corta; ritratto rotondo con anello, nome nella lettera larga                                                                                 | Pannello del gruppo (PARTY / NPCS)                                         | [O] T1                                                                                              |
| Ritratti del gruppo rotondi, quello scelto con anello d'accento e alone                                                                                                                                        | Avatar del gruppo                                                          | [O] T1                                                                                              |
| Barra del giocatore: ritratto con anello d'accento accanto a una barra divisa con i punti ferita in verde; lo stato del turno sotto, su una riga                                                               | Player bar (XP / HP)                                                       | [O] T5 (#225A47)                                                                                    |
| Barra delle azioni come una pillola di vetro con le caselle in pillole più piccole; risorse e dadi in pillole di vetro sopra                                                                                   | Barra dei dadi del layout Lumen                                            | [O] T16                                                                                             |
| Il pulsante dei dadi come FAB: disco bianco con un anello bianco disegnato dentro il pulsante (48 px sul computer, 40 sul telefono) e il glifo d20 nel colore d'accento                                        | Trio in basso (impostazioni, FAB, microfono)                               | [O] T1, [C] `size-a12`                                                                              |
| «Termina turno» come pillola bianca con testo d'accento in maiuscoletto esteso, sulla stessa riga del FAB                                                                                                      | «✓ End Turn» e il piano della barra in `facts.md`                          | [C] notifiche di turno; `facts.md` §1                                                               |
| Avvisi della sessione («Sessione non avviata») in vetro scuro, filetto giallo a sinistra, pulsanti a pillola su una riga loro                                                                                  | Avvisi e popover di Alchemy                                                | [O] T4; [C] `popoverBackground`                                                                     |
| Menu della pedina in vetro scuro                                                                                                                                                                               | Menu contestuale della pedina                                              | [O] T4                                                                                              |
| Griglia sottile chiara, pedine rotonde con anello sottile                                                                                                                                                      | Mappa tattica                                                              | [O] T2                                                                                              |
| Telefono: barra e linguette in una lastra opaca; le risorse del turno in una pillola di vetro appena sopra la barra; zoom in una fila di vetro a destra                                                        | Estensione nella stessa grammatica (Alchemy non ha il tavolo sul telefono) | `facts.md` §5 piano per il telefono; [O] T16 (pallini sopra la barra dei dadi)                      |

## Coppie per il confronto

Le coppie già montate sono in `round1/alchemy/_pairs/` (01–12), rifatte dopo il sesto giro dalle
schermate nuove (05:34–05:39, script `polish6-alchemy/r5/pairs.py` tra le prove, copia di
`fix-alchemy/pairs.py` che accetta anche un elenco di coppie). Ogni
coppia mostra la nostra schermata e il primo riferimento della riga; gli altri restano nella
cartella dei riferimenti.

| Schermata                | Nostra schermata                          | Riferimento Alchemy                                                                                               |
| ------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Inizio                   | `home-dark-1440-alchemy.png`              | `alchemy-home-dashboard-1440.png`, `alchemy-home-dashboard-1440-full.png`                                         |
| Inizio (telefono)        | `home-dark-390-alchemy.png`               | `alchemy-phone-home-390.png`                                                                                      |
| Scheda                   | `sheet-dark-1440-alchemy.png`             | `alchemy-sheet-5e-modal-portrait-header.png`, `alchemy-sheet-5e-modal-stats-tab.png`                              |
| Scheda (telefono)        | `sheet-dark-390-alchemy.png`              | `alchemy-phone-dialog-release-notes-390.png`                                                                      |
| Tavolo                   | `table-combat-dark-1440-alchemy.png`      | `alchemy-table-5e-player-bar-actions-panel-playing-as.png`, `alchemy-table-lumen-daggerheart-story-dice-bar.webp` |
| Tavolo (DM)              | `table-combat-dm-dark-1440-alchemy.png`   | `alchemy-table-5e-tactical-map-tokens-tool-rail.png`, `alchemy-table-gold-default-gm-view-scenes.png`             |
| Tavolo (telefono)        | `table-combat-dark-390-alchemy.png`       | `alchemy-table-lumen-daggerheart-story-dice-bar.webp`, `alchemy-phone-home-390.png`                               |
| Tavolo in esplorazione   | `table-explore-dark-1440-alchemy.png`     | `alchemy-table-5e-scene-story-mode-journal-party-scenes.png`                                                      |
| Scheda · Magie           | `sheet-spells-dark-1440-alchemy.png`      | `alchemy-sheet-5e-modal-stats-tab.png`                                                                            |
| Scheda · Inventario      | `sheet-inventory-dark-1440-alchemy.png`   | `alchemy-sheet-5e-npc-statblock-modal.webp`, `alchemy-sheet-5e-modal-stats-tab.png`                               |
| Finestra dell'iniziativa | `dialog-initiative-dark-1440-alchemy.png` | `alchemy-dialog-release-notes-1440.png`, `alchemy-dialog-action-editor-daggerheart.png`                           |
| Menu della pedina        | `token-menu-dark-1440-alchemy.png`        | `alchemy-table-5e-token-context-menu.png`                                                                         |

## Differenze dichiarate

1. **Struttura fissa.** Teniamo la nostra struttura: testata, colonna destra con la rotaia e barra
   in basso. Alchemy ha quattro colonne negli angoli (diario, azioni, gruppo, scene). Le vestiamo
   da colonne d'angolo di vetro. Non abbiamo il diario dei tiri a sinistra, quindi non ci sono le
   schede dei tiri con i dadi in cerchi.
2. **La mappa resta nella sua cornice.** La mappa viva non va sotto i comandi, così «adatta» non
   la copre. Intorno, la stessa scena sfocata e scurita fa da sfondo cinematografico (ora si vede
   davvero: nel primo giro il fondo della pagina la copriva). La cornice della mappa parte 48 px più
   in basso, per lasciare il titolo libero sopra la scena. I pulsanti della sessione salgono accanto
   al titolo e gli avvisi della sessione scendono sotto i ritratti.
3. **Strumenti a destra.** La colonna degli strumenti passa da sinistra a destra, accanto al
   pannello, dove Alchemy tiene la sua rotaia. Usa lo stesso spazio di prima (76 px), quindi i
   margini della mappa non cambiano.
4. **Barra delle azioni.** Il classico Alchemy elenca le azioni in basso a sinistra. Qui usiamo la
   barra dei dadi del layout Lumen, una pillola di vetro, su due righe di caselle (la nostra
   barra ha più azioni). Il FAB e «Termina turno» stanno in basso a destra, ai piedi del pannello,
   sulla stessa riga; sotto, Annulla e Annulla ultima modifica. La barra è alta 108 px (limite 120) in ogni turno e in ogni pagina: le caselle stanno a 4 px l'una dall'altra, come le due
   linguette «Azioni» e «Barra rapida» accanto, così due righe di caselle sono alte quanto le due
   linguette (84 px).
5. **Ritratto nella barra.** Il ritratto nella barra del giocatore si vede da 1280 px; oggi si
   vede da 1500. Le sette azioni di Livia stanno comunque su due righe.
6. **Misure dei comandi.** Tutti i comandi sono alti almeno 40 px: le pillole di Alchemy da 32 e i
   pulsanti rotondi da 36 crescono. Il pulsante dei punti ferita nella barra diventa da 40 px
   (oggi è da 28). L'anello del FAB è disegnato dentro il pulsante, così non copre i vicini.
7. **Maiuscole.** Senza `text-transform` le maiuscole di Alchemy diventano maiuscoletto, solo dai
   passi da 14 e 16 px. Le righe con numeri («Maga · Livello 3», «Combattimento · Round 1»,
   «18/22») restano in minuscolo con la spaziatura, perché il maiuscoletto lascerebbe le cifre più
   grandi delle lettere. «Maga · Livello 3» sotto il nome e «Combattimento · Round 1» sotto il
   titolo della scena sono la stessa riga d'accento: Lexend 600 da 12 con la spaziatura di 1 px
   (prima 14 e 12, 600 e 400). Le etichette dei gruppi nella barra («Armi», «Incantesimi») stanno nel
   bordo alto della casella: lì il maiuscoletto da 14 px non entra, quindi sono in Lexend 600 da
   10 px, come «Turno attuale». La riga «PF temporanei» resta a 12 px (l'app la fissa con
   `!important`, characters.css:262, e un'opzione non può alzarla): è in Lexend 600 nel suo
   maiuscolo e minuscolo, non in un maiuscoletto da 8 px. Anche l'anteprima dei messaggi nelle
   «Ultime discussioni» resta nel suo maiuscolo e minuscolo: è testo dei giocatori, non un'etichetta.
8. **Statistiche.** Alchemy scrive «12 (+1)». Qui c'è «10 +0»: niente testo generato, quindi
   niente parentesi.
9. **Glifo sui divisori.** Alchemy mette il simbolo del sistema al centro delle righe d'accento.
   Qui la riga resta semplice: quell'ornamento (simbolo tra due fili) è della famiglia rifiutata
   nel registro, punto 3.
10. **Finestra della scheda.** È larga 1008 px (996 dentro), non 504 come in Alchemy. La nostra
    scheda 2024 ha due colonne e tiene il suo layout da tablet. Il ritratto d'esempio è quadrato:
    per riempire la testata come in Alchemy viene ingrandito e ritagliato sul volto.
11. **Pillola esterna.** Contiene «← Personaggi» (come ✕), «Condividi» e «Gestisci personaggio»
    come pulsanti rotondi: le parole restano i loro nomi accessibili, ma non si vedono, come in
    Alchemy. La visibilità («Solo campagna») invece si legge per intero: è una pillola con
    l'occhio in alto a destra sull'immagine (in Alchemy l'interruttore della visibilità sta in
    testa alla scheda, S10); la matita del ritratto passa in alto a sinistra. Sul telefono la
    pillola diventa una fila in alto, perché in basso c'è il dock. I glifi (✕, condividi, matita,
    occhio) sono le icone a filo del gioco, come la matita del ritratto. Lo stesso vale, sul telefono,
    per «App» e «Torna alla campagna» nella testata del Tavolo: diventano pulsanti rotondi da 40
    px come quelli dei servizi, così la testata resta su una riga sola (64 px; oggi 63).
12. **Due accenti.** L'oro vale per l'Inizio e la cornice dell'app, il rosso 5e per il Tavolo e la
    Scheda. Alchemy fa lo stesso: ogni universo ricolora tutto. Dove Alchemy scrive testo
    nell'accento, usiamo una tinta più chiara (#C4B998, #F2676C) per il contrasto AA. Il rosso dei
    nemici è il rosso di Alchemy per il pericolo, con anello tratteggiato.
13. **Caratteri.** Nominee e Nominee Extended sono commerciali. Li sostituiscono Lexend e Unbounded
    (OFL), con due soli pesi ciascuno. Il carattere stretto del tema 5e (titoli delle scene e nomi)
    non è stato identificato e non è copiato: i titoli usano il carattere esteso del tema
    predefinito. Il marchio «d20 Studio» ora ha la grafia della direzione (Unbounded, 18 px, sulla
    scala): sezione «Marchio (I-251)».
14. **Icone.** Le icone di Alchemy sono disegnate su misura e non hanno licenza. Nel gioco e nei
    pulsanti di servizio usiamo Lucide 1.49.0 a filo sottile (spessore 1,5), la serie aperta indicata
    in `facts.md`; anche l'opzione 2 usa Lucide (1.16.0, a filo pieno 2). Nella rotaia e nel dock
    dell'Inizio le icone sono piene (Font Awesome Free 7.3.1), come la rotaia della Home di Alchemy;
    il FAB tiene il d20 pieno. Restano a filo anche le icone dei servizi in testata e quelle della
    pillola della scheda (prima piene: due matite diverse sulla stessa schermata, AL-D13).
15. **Immagini.** L'illustrazione dell'Inizio è un'opera dell'owner (`assets/featured-hearth.webp`).
    La usiamo anche come «sfondo delle finestre», come fa il tema di Alchemy. La scena e i ritratti
    sono le immagini d'esempio comuni a tutte le opzioni.
16. **Tema chiaro.** Questa opzione non tocca il tema chiaro: colori, forme, misure, caratteri e
    icone valgono solo nel tema scuro (nel chiaro restano solo l'arte d'esempio comune a tutte le
    opzioni e la voce del selettore).
17. **Telefono, Tavolo.** La prima riga della barra non ha spazio per tutti i simboli delle risorse
    del turno: la pillola delle risorse sta appena sopra la barra, a destra dei ritratti del gruppo,
    come i pallini sopra la barra dei dadi di Lumen. Lo zoom è una fila di vetro in basso a
    destra, nella fascia che la scena lascia libera (come oggi), e con i ritratti del gruppo resta
    8 px sopra la barra fissa. Il DM ha quattro comandi di scena contro uno: sul telefono stanno in
    due file di pillole uguali, il comando dell'incontro («Avvia combattimento», «Concludi
    incontro»: troppo lunghi per mezza riga) su tutta la prima, Scene, Riposi e Tempo in tre terzi
    uguali sotto; la sua mappa è più bassa di una riga (48 px), così zoom e ritratti cadono nello
    stesso punto per entrambi i ruoli, mai sotto la barra. Aperta in cima alla pagina, la colonna
    degli strumenti della mappa ha passi da 4 px (8 sul computer) e finisce sopra la barra; anche il
    gruppo aperto accanto (per esempio gli strumenti del DM) ha passi da 4 px. Le opzioni dello
    strumento (nebbia e vista del DM, disegno) stanno 48 px più in alto di oggi: con la pagina
    ferma finiscono 18 px sopra la fila dello zoom invece di coprirla, e in cima alla pagina
    «▾ Riduci» resta sopra la pillola delle risorse; le opzioni del DM partono a destra della
    colonna aperta. La pagina finisce 32 px più in alto (l'altezza della pillola delle risorse più
    il suo spazio di 8 px), così l'ultima riga del pannello («Aspetto nella scheda») non passa
    sotto la pillola. La barra delle opzioni del disegno sta dentro la mappa, e la mappa disegna i
    suoi segni sopra di lei (è l'ordine dell'app, come oggi): nella vista d'esempio del DM, a
    pagina ferma, il segno della porta «Porta · Aperta» copre «Testo o nota sulla pedina», e un
    tocco lì apre la porta. Dipende da dove sta la vista: spostando la mappa lo strumento torna
    libero. In «Attuale», nella stessa vista, sono i pulsanti dello zoom a coprire due o tre
    strumenti della stessa barra.
18. **Dock del telefono.** Il dock di Alchemy galleggia sul contenuto. Qui sta su una fascia del
    colore della pagina, alta quanto il dock più 16 px sopra e sotto, che sfuma in 24 px: quello
    che scorre sotto il dock svanisce, invece di toccarlo o di leggersi attorno. Nella Scheda il
    ritratto sul telefono è alto 240 px (320 sul computer), così la fila delle linguette, con la
    linguetta aperta, si apre sopra la fascia. La fascia è solo decorazione: i tocchi la
    attraversano. Dock, rotaia, cerchio del profilo e fascia stanno sotto i livelli a tutto schermo
    dell'app (immagine a schermo intero delle dispense, registro e chat, scheda sulla mappa), che li
    coprono come coprono la testata di oggi. Nel lettore della Biblioteca «Torna su» sale 8 px
    sopra la fascia e prende il vetro del dock, così il testo sotto non si legge attraverso.
19. **Inizio, carte in fila.** Sotto il riquadro illustrato «Il tuo personaggio», «Dove eravamo
    rimasti» e «Prossimo appuntamento» sono una fila di tre carte alte uguali, come le file di
    carte di Alchemy; oggi la prima resta alta quanto il suo contenuto (scelta C2-5 della revisione
    finale), qui lascerebbe un vuoto di 150 px sotto le due carte di sinistra.
20. **Classi di pulsanti.** L'audit conta ancora 28 aspetti di pulsante (sfondo, bordo, contenuto):
    molte sono componenti diversi dell'app (stelle dei preferiti, nomi cliccabili delle abilità,
    valori da tirare, ritratti del gruppo) che hanno forme diverse anche in Alchemy. Non li abbiamo
    forzati in un'unica forma. Le barre segmentate (linguette dell'Inizio, «Azioni / Barra rapida»,
    «Gioco / Modifica», dadi digitali / fisici) hanno una sola ricetta: 40 px, rientro 12, maiuscoletto
    esteso da 10 px. Le sottolinguette del pannello del Tavolo («Creatura», «Riepilogo del gruppo»)
    restano da 40 px con rientro 8: con la misura delle linguette della Scheda (48, rientro 16,
    spaziatura 2) non entrano nei 308 px del pannello.
21. **Barra del giocatore sul computer.** Con il ritratto, accanto restano 122 px: «Esplora la scena
    liberamente» andava su due righe e alzava la barra a 126 px (limite 120). Ritratto e nome con
    la pillola dei punti ferita stanno sulla prima riga, lo stato del turno sotto entrambi, su una
    riga: la barra è alta 108 px in esplorazione e in combattimento, per il giocatore e per il DM,
    in ogni turno, da 1024 a 1440 px di larghezza. Lo stato del turno è nel passo da 10 px (come i
    metadati di Alchemy) a ogni larghezza del computer: «Puoi preparare una mossa fuori turno», la
    frase più lunga, occupa 182 dei 190 px della targa (a 12 px erano 219 e l'ultima lettera usciva
    dalla targa). Sotto 1280 px, senza ritratto, un nome lungo («Sentinella») manda la pillola dei
    punti ferita su una seconda riga: con lo stato a 12 px la targa era alta 102 e la barra 110 nel
    turno di quella creatura, 108 in quello di Livia. Allargare la targa di 29 px, come proponeva
    la verifica, toglieva lo stesso spazio alla pillola delle azioni: a 1440 due caselle uscivano
    dalla vista e la pillola si spostava a ogni cambio di turno.
22. **Oggetti da usare.** Nel pannello «Creatura» gli oggetti («Bacchetta di dardi incantati 3/7»)
    sono cose, non comandi: righe nel carattere dell'interfaccia (Lexend 600 da 14), come le caselle
    degli oggetti nella barra delle azioni, con le cariche subito dopo il nome. Nelle maiuscole
    estese il nome andava su due righe in una pillola da 42 px.
23. **«Tiri e risultati» nella barra.** «Tiri e risultati» resta nel carattere dell'interfaccia
    come «Dadi» e «Digitali» accanto: è una frase della stessa targa, non un comando a sé.
24. **«Barra rapida» nella barra.** Il nome della pagina («1/1 Combattimento») è nel carattere
    dell'interfaccia delle caselle (Lexend 600 da 14) e si legge per intero; le dieci caselle sono
    alte 40 px come ogni casella della barra e larghe 50, così a 1440 entrano tutte come oggi; le
    due righe stanno a 4 px come nella pagina «Azioni», così la barra resta alta 108 px quando si
    cambia pagina (prima 112 qui e 110 nell'altra). Gli strumenti della pagina scorrono di lato come oggi
    quando non entrano: a 1440 il menu del d20 si vede per 35 dei suoi 144 px (oggi per 114 dei
    134), perché la targa del giocatore e le linguette «Azioni / Barra rapida» lasciano alla pillola
    66 px meno di oggi. Farli entrare voleva dire rimpicciolire i menu a tendina sotto la loro
    ricetta unica.
25. **Interruttori.** Un solo interruttore ovunque, quello di Alchemy (D6, D9; `facts.md`
    «Switch»): pillola da 40 × 24, spento con la traccia traslucida e il pomello bianco, acceso
    verde #289C61 (il verde di Alchemy per «attivo») con il pomello a destra. È la posizione del
    pomello, non il colore, a dire se è acceso. Le caselle da spuntare restano nel colore
    d'accento (rosso nel gioco, oro fuori): in Alchemy gli interruttori sono verdi in ogni tema.
    L'app disegna i suoi interruttori in tre misure (40 × 22 con pomello da 12, 44 × 26 con
    pomello da 18) e, con il bianco come accento, acceso era una traccia bianca con il pomello
    rosso.

26. **Sfumature delle file che scorrono.** Ogni fila che scorre di lato sfuma dal lato dove ce n'è
    ancora, con una lunghezza scelta sulla sua fila: 72 px per le linguette della Scheda stretta,
    48 per le linguette del Tavolo sul telefono (quasi la linguetta più stretta, 58: a 390 px il
    pezzo di «Scena» accanto a «Tutti» resta un'ombra), 24 per la fila delle azioni (più lunga
    sbiadirebbe l'unica azione intera che il telefono mostra a 390). A 360 px, fuori dalle
    larghezze garantite, «Combattimento» finisce sul bordo della fila e la sfumatura ne scurisce
    le ultime lettere, e la fila delle azioni (122 px) non mostra un'azione intera.
27. **Colonna delle novità dell'Inizio.** Da 1101 px la colonna è una carta fissa alta quanto lo
    schermo e il pannello aperto scorre dentro di lei (sezione «Risposte alla verifica (sesto
    giro)»). Per tenere dentro il riquadro che scorre i comandi allineati otticamente e gli anelli
    del fuoco, la carta passa i suoi rientri laterali e inferiore alle linguette e al pannello: a
    vista sono i 24 px di ogni carta dell'Inizio, ma nel codice la carta ha il rientro «24 0 0 0» e
    l'audit dell'Inizio intero la conta come seconda variante di carta.

## Risposte alla critica (01/10/2026)

| Critica                                                                                      | Cosa è cambiato                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1 La scena dietro il Tavolo non si vedeva                                                   | Il fondo della pagina è trasparente sul Tavolo: la scena sfocata (ora un po' più chiara) si vede nel bordo sinistro, nella fascia sotto il titolo e dietro la testata.                                                                                                                                                                     |
| A2 Risorse del turno tagliate sul telefono («● ▲»)                                           | La pillola delle risorse esce dalla riga stretta e sta sopra la barra, intera: azione, bonus, reazione, movimento «9 m».                                                                                                                                                                                                                   |
| A3 Testi tagliati o che si toccano                                                           | Nomi dell'ordine dei turni interi (colonne da 80 e 96 px, niente spaziatura sul minuscolo); «Riepilogo del gruppo» intero; etichette delle magie in Lexend in una griglia da almeno 128 px; «Tutte» alto 48 px senza riquadro e la fila delle linguette che sfuma.                                                                         |
| A4 Fila in basso sul telefono trasparente, striscia di una linguetta, etichette disallineate | Barra e fila sono una lastra opaca; la fila sfuma a destra; Mappa, linguette e Tutti sulla stessa linea.                                                                                                                                                                                                                                   |
| A5 Finestra sul telefono: chiusura da 29 px, titolo e pulsanti spezzati                      | Foglio a tutto schermo, chiusura rotonda da 40 px in alto a destra, titolo centrato, pulsanti a tutta larghezza su una riga ciascuno, «Nessuno» accanto agli altri.                                                                                                                                                                        |
| A6 Parti lasciate all'aspetto del browser o di oggi                                          | Campi d20 e punti ferita con la ricetta dei campi; caselle da spuntare disegnate; avviso della sessione in vetro con i pulsanti a pillola; dischi dell'indebolimento e chiusura del menu senza il margine del browser; righe vuote in vetro; interni di Magie e Inventario rifatti. L'audit non elenca più nulla tra i «Browser defaults». |
| A7 Tipografia poco coerente                                                                  | Quattro pesi (Lexend 400/600, Unbounded 700/900), tre spaziature (0,4 · 1 · 2 px), maiuscoletto solo da 14 e 16 px, titolo della pagina 24, titoli delle schede 18. Audit: 48 stili di testo (prima 93), 9 grandezze (prima 12; l'unica fuori scala è il marchio da 22).                                                                   |
| A8 Scheda: spazio vuoto, righe disallineate, righe d'accento di tre lunghezze, margini       | Ritratto a tutta larghezza; caselle della seconda riga allineate in alto; ogni riga d'accento a tutta larghezza; 24 px sopra i gruppi; i riquadri dell'Inventario in due colonne con i pulsanti su una riga.                                                                                                                               |
| Tema chiaro toccato                                                                          | Ogni regola ora vale solo nel tema scuro, anche forme e caratteri; le icone tornano quelle di oggi nel tema chiaro.                                                                                                                                                                                                                        |
| FAB 24 px fuori riga, anello sopra «Annulla»                                                 | «Termina turno» sulla riga del FAB; l'anello del FAB è dentro il pulsante.                                                                                                                                                                                                                                                                 |
| Etichetta della visibilità nascosta                                                          | «Solo campagna» si legge per intero (Differenze, punto 11).                                                                                                                                                                                                                                                                                |
| Icone piene come l'opzione 3                                                                 | Nel gioco icone a filo sottile, come Alchemy (Differenze, punto 14).                                                                                                                                                                                                                                                                       |

## Risposte alla verifica (secondo giro, 01/10/2026)

Punti aperti della verifica indipendente (`notes/open-items-round2.json`, voce «alchemy») e
garanzie ricontrollate sulle schermate rifatte.

| Punto                                                                                                | Cosa è cambiato                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [alta] Tavolo del DM a 390: «Centra la scena» e Mira sotto la barra fissa                            | Lo zoom torna una fila di vetro in basso a destra, nella fascia libera sotto la scena; i quattro comandi del DM stanno in un blocco 2 × 2 e la sua mappa è più bassa di 48 px, così la base della mappa cade dove cade per il giocatore. Prova `elementFromPoint`: 4 pulsanti dello zoom e 3 ritratti liberi in combattimento, esplorazione e vista del DM. |
| [garanzia] Testata del Tavolo su due righe a 390 (124 px; oggi una riga da 63)                       | «App» e «Torna alla campagna» rotondi da 40 px, la pillola dei servizi senza margine interno, come nelle altre pagine: una riga da 64 px in tutti gli stati del Tavolo.                                                                                                                                                                                     |
| [garanzia] Striscia della dimostrazione alta 127 px a 390 (le altre opzioni 96)                      | La striscia (del blueprint, non di Alchemy) tiene il carattere di sistema di oggi: 96 px, come in ogni opzione.                                                                                                                                                                                                                                             |
| [media] Il dock del telefono copre il contenuto (Inizio, linguetta aperta della Scheda, prima magia) | Fascia del colore della pagina dietro il dock (Differenze, punto 18): sotto il dock il contenuto svanisce invece di toccarlo. Nella Scheda il ritratto sul telefono scende a 240 px: la fila delle linguette con «Azioni» aperta sta tra 684 e 732 px, sopra la fascia (che parte a 752).                                                                   |
| [bassa] «STO» e «INVEN» tagliati accanto a «Tutte»                                                   | La sfumatura della fila finisce del tutto 8 px prima del suo bordo, 20 px prima del simbolo di «Tutte»: la linguetta che non entra si legge come «c'è altro», non come una parola tagliata.                                                                                                                                                                 |
| [bassa] «PF temporanei» in maiuscoletto da 8 px                                                      | La regola delle etichette della banda la batteva (più specifica): ora la riga è Lexend 600 a 12 px nel suo maiuscolo e minuscolo (Differenze, punto 7).                                                                                                                                                                                                     |
| [bassa] Tavolo del giocatore a 390: la colonna dello zoom tocca la mappa e «Scale per la cripta»     | Risolto con la fila dello zoom sotto la scena (prima riga).                                                                                                                                                                                                                                                                                                 |
| Coppie `_pairs` vecchie                                                                              | Rifatte tutte e 12 dalle schermate nuove.                                                                                                                                                                                                                                                                                                                   |

## Risposte alla verifica (terzo giro, 01/10/2026)

Punti aperti della verifica indipendente (`notes/open-items-round3.json`, voce «alchemy»), più tre
difetti trovati in questo giro ricontrollando le garanzie, la Scheda intera e il campionario.

| Punto                                                                                                                                                  | Cosa è cambiato                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [alta] Lettore della Biblioteca a 390: «Torna su» sotto la fascia del dock, invisibile e non toccabile                                                 | La fascia non prende più i tocchi; dock, rotaia, profilo e fascia scendono sotto i livelli a tutto schermo dell'app (z 39 e 38, sotto il 40 di dispense a schermo intero, registro, scheda sulla mappa); «Torna su» sale 8 px sopra la fascia (704–744, la fascia parte a 752) con il vetro del dock. Prova `elementFromPoint`: il centro del pulsante è il pulsante (Differenze, punto 18).                                           |
| [garanzia, trovata qui] Barra delle azioni a 1440 × 900 alta 126 px in esplorazione (limite 120; b62 la misura così, DM in esplorazione)               | Stato del turno sotto ritratto e nome (Differenze, punto 21): 110 px in esplorazione e in combattimento, giocatore e DM, anche a 1366 × 768 (fondo a 768), 1280 e 1024.                                                                                                                                                                                                                                                                |
| [media] Pillole su due righe nel pannello «Creatura» («Scheda completa», «Bacchetta di dardi incantati 3/7»)                                           | «Scheda completa», «Inventario» e «Riposa» sono pillole larghe quanto le loro parole, su una riga, che vanno a capo come gruppo; gli oggetti da usare sono righe nel carattere dell'interfaccia con le cariche dopo il nome (Differenze, punto 22). Nessuna pillola del pannello o dei comandi della scena è più alta di 40 px, a 1440 e a 390.                                                                                        |
| [bassa] La fascia prende i tocchi anche nella sfumatura                                                                                                | `pointer-events: none`: a 24 px dal suo bordo un tocco arriva al testo della pagina.                                                                                                                                                                                                                                                                                                                                                   |
| [bassa] Comandi della scena del DM a 390 non uguali (181/177, 205/151)                                                                                 | Comando dell'incontro su tutta la riga (366 px), Scene, Riposi e Tempo da 117 px ciascuno, una riga di testo ciascuno (Differenze, punto 17). Con colonne da metà riga «Avvia combattimento» (206 px) e «Concludi incontro» (181) sarebbero andati su due righe.                                                                                                                                                                       |
| [bassa] Carte dell'Inizio a 48 px in verticale, 24 in orizzontale, a 1440                                                                              | Nessuno spazio tra le righe della griglia oltre al margine di 24 px di ogni carta: 24 px tra il riquadro illustrato e la fila di carte, tra le colonne e tra «Prossimo appuntamento» e le novità.                                                                                                                                                                                                                                      |
| [bassa] DM a 390, in cima alla pagina, colonna degli strumenti fino a 648 (barra a 631)                                                                | Passi da 4 px sul telefono: la colonna aperta finisce a 624, in combattimento e in esplorazione.                                                                                                                                                                                                                                                                                                                                       |
| [bassa] Icone da 18 px in «Menu di Livia» e «Trova la mia pedina»; rientri di 12 e 16 px nelle novità; «Cerca nella Biblioteca» con rientro nel titolo | Le icone del menu della pedina sono da 20 come ogni altra (pillole, righe del menu, chiusura; 16 restano le condizioni nei chip); i comandi delle novità hanno il rientro di 16 di ogni pillola (testo di «Segna come letta» allineato con «Segna tutte come lette»); «Cerca nella Biblioteca» è un collegamento senza rientro come gli altri comandi discreti dei titoli. «Difese» a 390 resta come oggi (riga della banda dell'app). |
| [info] Strumento del DM sotto la pedina di turno a 390                                                                                                 | Come in «Attuale» («Pianifica percorso» sotto il ritratto di turno, in cima alla pagina); nessuna modifica.                                                                                                                                                                                                                                                                                                                            |
| [trovato qui] Scheda a 390: tabella delle azioni generiche larga 405 px in 358, colonna «Regola» tagliata al bordo                                     | Testo delle celle a 14 px e «Tempo» che può andare a capo sul telefono: 358 px (colonne 121, 97, 141), nessun contenitore più largo del suo riquadro sulle pagine controllate.                                                                                                                                                                                                                                                         |
| [trovato qui, campionario] Condizioni attive come riquadri quadrati di tre altezze; «Chiedi» e «Trucchetto» fuori dalla ricetta delle etichette        | Condizioni e stato vitale («Cosciente») sono una sola pillola da 40 px (le condizioni del controllore restano pulsanti da 40); «Chiedi» (reazioni) e lo stato delle magie prendono forma e carattere delle etichette, con i loro colori di stato.                                                                                                                                                                                      |
| Schermate e coppie vecchie                                                                                                                             | Rifatte tutte (15 schermate più il foglio di contatto; il rapporto precedente diceva 16 per errore) dopo l'ultima modifica, e coppie 01–12.                                                                                                                                                                                                                                                                                            |

## Risposte alla verifica (quarto giro, 01/10/2026)

Punti aperti della verifica indipendente (`notes/open-items-round4.json`, voce «alchemy»), più due
difetti dello stesso genere trovati qui ricontrollando gli stati.

| Punto                                                                                                                                                                    | Cosa è cambiato                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [media] Giocatore fuori turno a 1440, 1366 e 1280: «Puoi preparare una mossa fuori turno» (219 px su una riga) usciva dalla targa da 210 e l'ultima lettera era tagliata | Lo stato del turno è nel passo da 10 px da 1280 in su: 182 px nei 190 della targa, 8 px di margine (Differenze, punto 21). La barra resta alta 110 px a 1440, 1366 (fondo a 768) e 1280, per giocatore di turno, fuori turno e in esplorazione e per il DM; nessun testo tagliato. Se una frase più lunga andasse a capo, le due righe da 12 px terrebbero la barra a 118. |
| [bassa] Pagina «Barra rapida» a 1440: «1/1 Comba…», il menu del d20 visibile per 12 px, la casella «0» tagliata                                                          | Nome della pagina in Lexend 600 da 14, intero (110 px su 110); caselle da 50 × 40, tutte e dieci nella pillola a 1440 (536 px su 555); barra a 112 px. Il menu del d20 resta nella fila degli strumenti che scorre (35 px visibili, oggi 114): Differenze, punto 24.                                                                                                       |
| [bassa] Telefono, DM, strumenti aperti in cima alla pagina: «▾ Riduci» sotto la pillola delle risorse e 10 px sotto la barra                                             | Le opzioni dello strumento stanno 48 px più in alto e partono a destra della colonna aperta: in cima alla pagina «▾ Riduci» è a 543–575 (pillola delle risorse da 600, barra da 631), libero in tutti e cinque i punti di prova; con la pagina ferma è a 383–415. Il gruppo aperto ha passi da 4 px come la colonna (Differenze, punto 17).                                |
| [bassa] Telefono, fondo della pagina: la pillola delle risorse copriva gli ultimi 7 px di «Aspetto nella scheda»                                                         | Il pannello finisce 32 px più in alto (altezza della pillola più il suo spazio): l'ultima riga è a 535–575, 25 px sopra la pillola, per giocatore e DM.                                                                                                                                                                                                                    |
| [trovato qui] Telefono, DM, pagina ferma: le opzioni del DM (fino a 599) coprivano la fila dello zoom (da 569)                                                           | Con le opzioni 48 px più in alto finiscono a 551, 18 px sopra lo zoom.                                                                                                                                                                                                                                                                                                     |
| [trovato qui] Telefono, strumenti di disegno, pagina ferma: la barra delle opzioni finiva a 657, sotto la barra fissa (da 631)                                           | Stessa regola delle opzioni del DM: finisce a 551.                                                                                                                                                                                                                                                                                                                         |
| Schermate e coppie vecchie                                                                                                                                               | Rifatte tutte (15 schermate e il foglio di contatto) dopo l'ultima modifica, e coppie 01–12.                                                                                                                                                                                                                                                                               |

## Risposte alla verifica (quinto giro, 01/10/2026)

Punti aperti della verifica indipendente (`notes/open-items-round5.json`, voce «alchemy»), più due
difetti trovati qui ricontrollando la Scheda intera e l'audit.

| Punto                                                                                                                                                      | Cosa è cambiato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [media] Tre misure di interruttore nella Scheda: «Il DM può modificare questa scheda» 40 × 24, «Disponibile offline» 40 × 22, «Ispirazione eroica» 44 × 26 | Un solo interruttore, quello di Alchemy (Differenze, punto 25): traccia da 40 × 24, pomello da 18 a 2 px dal bordo, 12 px tra traccia e nome, anello del fuoco da 3 px a 2 px, nome in Lexend 600 da 16 per tutti e tre (quello dell'Ispirazione era 400); acceso verde con il pomello bianco a destra, spento traslucido con il pomello a sinistra. La regola vale ovunque compaiano queste forme, non solo nella Scheda (controllata nella Scheda e nel campionario). Misure: `out/checks-final.json`. |
| [bassa] Telefono, DM, strumenti di disegno, pagina ferma: il segno della porta copre «Testo o nota sulla pedina»                                           | Dichiarato (Differenze, punto 17): la barra delle opzioni sta dentro la mappa, che disegna i suoi segni sopra di lei, e quale segno la copre dipende dalla vista. Nessuna posizione della barra evita ogni segno in ogni vista; questa evita la fila dello zoom e la barra fissa.                                                                                                                                                                                                                        |
| [bassa] «Cosciente» grigio nella Scheda, bianco nel pannello «Creatura»                                                                                    | Bianco in entrambi, come le condizioni accanto: la Scheda passava il suo grigio alla pillola.                                                                                                                                                                                                                                                                                                                                                                                                            |
| [info] Barra del DM alta 110 px nel turno di Livia, 108 in quello della Sentinella                                                                         | 108 px in ogni caso: caselle a 4 px come le linguette accanto (due righe di caselle sono alte quanto le due linguette, 84 px) e righe a 4 px anche nella pagina «Barra rapida» (era 112). Sotto 1280 px lo stato del turno è ora nel passo da 10 px, perché lì un nome lungo portava la barra a 110 solo nel turno di quella creatura (Differenze, punti 4, 21 e 24).                                                                                                                                    |
| [info] Anello del fuoco dei punti ferita della Scheda da 2 px                                                                                              | 3 px come ogni comando (l'app lo disegna da 2 in `damage.css`).                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [info] Interlinee calcolate 20,0004 / 15,9996 / 28,0008 px                                                                                                 | Le proporzioni sono rapporti esatti (`calc(20 / 14)` e così via): ogni passo dà pixel interi (20, 16, 28, 36).                                                                                                                                                                                                                                                                                                                                                                                           |
| [info] «Tiri e risultati» in Lexend, le parole cliccabili dell'Inizio in Unbounded                                                                         | Resta, dichiarato (Differenze, punto 23).                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [trovato qui] Scheda a 390, «Recupero arcano»: il contatore «1 di 1» andava a capo a metà («1 di» / «1»), anche oggi                                       | Il contatore è un gruppo unico: va a capo intero, allineato al nome (prima rientrava di 6 px); sul computer sta a 8 px dalla casella degli usi.                                                                                                                                                                                                                                                                                                                                                          |
| [trovato qui] Distanze da 10 px dell'app (barra della Scheda, riga dei PE, barre di Inventario e moduli, interruttore offline)                             | Sul passo da 8 (12 per l'interruttore, come gli altri): l'audit non conta più distanze da 10 px.                                                                                                                                                                                                                                                                                                                                                                                                         |
| Schermate e coppie vecchie                                                                                                                                 | Rifatte tutte (15 schermate e il foglio di contatto, 16:50) dopo l'ultima modifica del foglio di stile (16:49:51, solo il commento in testa; le regole sono delle 16:41), e coppie 01–12 (16:51).                                                                                                                                                                                                                                                                                                        |

## Dettagli rifiniti (01/10/2026)

Critica indipendente dei dettagli (AL-D01…D16 e tre proposte per superare Alchemy), applicata in un
solo giro: tutte le voci alte e medie, ognuna con i valori della scala (spaziature 4·8·12·16·24·32,
comandi 40/48, raggi della scala). Misure prima (della critica o nostre sul foglio di stile di
prima) e dopo (sonde `fix-alchemy/mods/*.js`, `out/`), a 1440 × 900 e 390 × 844, tema scuro.

| Punto                                                        | Prima                                                                                                                                                                                                                                                                                                       | Dopo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AL-D01 Carte dell'Inizio sotto il riquadro illustrato        | Larghe 372 · 372 · 360 px (l'appuntamento nella colonna da 360 dell'app); dal titolo al primo contenuto 64 · 33 · 16 px; «Il sigillo della / torre» con «torre» da sola; la riga di «Il tuo personaggio» larga 327 px in 322 (il libro 5 px nel margine)                                                    | Tre carte uguali a ogni larghezza del computer: la colonna destra è un terzo della riga meno i suoi spazi (368 · 368 · 368 a 1440, 325 · 325 · 325 a 1280). Un solo passo dal titolo al contenuto in ogni carta dell'Inizio: il margine del titolo (12), primo contenuto 15 px sotto il titolo in tutte (15 · 17 · 16 fino al ritratto, al sottotitolo e alla riga d'accento). Le due righe dell'appuntamento bilanciate. La riga del personaggio ha 12 px tra le parti, il nome può stringersi (va a capo il sottotitolo) e sta in 318 px su 318; tra 1101 e 1279 px i punti ferita e il libro passano sotto, allineati a destra                        |
| AL-D02 Distanze tra pulsanti pieni e parole senza fondo      | Testata della Scheda: 42 px tra le parole, 25 dalla parola alla pillola; righe delle magie 25 e 42; finestra dell'iniziativa 8 tra le pillole e 25 fino a «Nessuno»; «Gestisci magie» e «Cerca nella Biblioteca» a 9 px; sul telefono due righe centrate con colonne non allineate                          | Ogni distanza a vista è 32 px (misurata 33–34 con i margini delle lettere): 34 · 34 · 34 · 33 nella testata, 33 · 34 nelle magie, inventario, oggetti e tesoro, 33 nelle novità dell'Inizio e tra pillola e collegamento dei titoli; le pillole restano a 8. «Nessuno» è la pillola secondaria, 8 px dalle altre. Lo spazio sta dal lato di chi chiude la riga (o è lo spazio tra colonne), così una riga che va a capo non rientra. Dove la Scheda è stretta (telefono, finestra stretta, cassetto del Tavolo: sotto 760 px) le quattro parole sono due colonne uguali (centri a 105 e 284 px sul telefono, righe a 40 px), «Vai al Tavolo» 12 px sotto |
| AL-D03 Linguette della Scheda                                | Servivano 727 px in 507: «Storia» sfumata a «ST» accanto a «Tutte» (96 × 48); sul telefono «MAG» a metà                                                                                                                                                                                                     | Rientro 8, nessuno spazio tra le linguette, spaziatura delle lettere 1 px (quella delle sottolinguette del Tavolo): le sette linguette stanno in 523 px su 563, intere e centrate, senza sfumatura; «Tutte» è un pulsante rotondo da 40 px col glifo (la parola resta nel codice, nascosta alla vista; il nome è «Tutte le sezioni della scheda»). Sulla scheda stretta la fila scorre, si ferma sempre all'inizio di una linguetta e sfuma per 72 px dal lato dove ce ne sono altre: a riposo la fine, in fondo l'inizio (sezione «scroll fades» del foglio di stile)                                                                                   |
| AL-D04 Righe delle abilità e dei tiri salvezza               | Il nome 8 px più in alto della stella e del valore (centri 912 e 920)                                                                                                                                                                                                                                       | Il nome sulla stessa linea (centri 920 · 920 · 920)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| AL-D05 Bordi frastagliati dei pulsanti senza fondo           | «Gestisci sensi» col glifo a 262 su una colonna a 246; «Gestisci monete» a 622 su 606,6; «+ Condizione», «Ultima mossa», «Trova la mia pedina», gli oggetti da usare e «Aspetto nella scheda» a 1086 su 1069; «Registra concentrazione» e «Correggi risorsa» finivano a 1177 su una riga che finisce a 1194 | Allineamento ottico: la parola o il glifo stanno sul bordo del testo (246, 606,6, 1070, 1193; sul telefono 373 su 374, perché lì il bordo è quello dello schermo e il pulsante non deve uscirne); bersaglio e pillola al passaggio sporgono nel margine della colonna di 16 px più il bordo di 1                                                                                                                                                                                                                                                                                                                                                         |
| AL-D06 Targa dei dadi e pillola delle risorse sopra la barra | 42 e 26 px allineate in basso; «Tiri e risultati» a 2 px dalla fine tonda; il menu «Digitali» col suo bordo a pillola 1 px dentro la targa                                                                                                                                                                  | Due pillole di vetro da 40 px sulla stessa riga (746–786), la targa 12 px dentro entrambe le estremità e 8 px tra le parti; il menu senza bordo né fondo propri (resta l'anello del fuoco). Sul telefono la pillola delle risorse resta da 24: galleggia da sola sopra la barra e il fondo della pagina è calcolato su di lei (Differenze, punto 17)                                                                                                                                                                                                                                                                                                     |
| AL-D07 Fondo della colonna destra del Tavolo                 | L'ultima riga tagliata a metà delle lettere dove comincia la barra (792)                                                                                                                                                                                                                                    | Il contenuto sfuma negli ultimi 32 px e scorre fino a lasciare l'ultima riga 32 px sopra la sfumatura (pannello «Creatura» e cassetto; non la chat, che ha il campo in fondo; solo sul computer)                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| AL-D08 Fuoco tagliato                                        | Caselle della barra: 4 px dell'anello tagliati in alto; pulsanti della sessione sul bordo della cornice della mappa: 6 px tagliati                                                                                                                                                                          | Caselle: anello di 3 px dentro la casella (come le linguette), intero; pulsanti della sessione 6 px più in basso, centrati sulle due righe del titolo della scena (centri 133 e 133), anello intero (prove `out/guard*/focus-*.png`)                                                                                                                                                                                                                                                                                                                                                                                                                     |
| AL-D09 Telefono, barra e linguette in basso                  | Fila delle azioni 154 px su 824 senza sfumatura: una fetta di 18 px di «Incantesimi» tagliata sotto «Mosse»; «Combatti…» in 68 px                                                                                                                                                                           | La fila sfuma negli ultimi 24 px e si ferma all'inizio di una casella; ogni linguetta è larga quanto il suo nome intero («Combattimento» 94 px), 8 px dentro, 4 px dalla vicina, la fila si ferma su una linguetta e sfuma dal lato nascosto                                                                                                                                                                                                                                                                                                                                                                                                             |
| AL-D10 Testata                                               | Pillola del marchio 40 px accanto a quella dei servizi da 48; il dado a 36 px dal bordo, rotaia e profilo a 46                                                                                                                                                                                              | Inizio: pillola del marchio alta 48 come quella dei servizi, dado da 40 a 4 px dal bordo; dado, pulsanti della rotaia e cerchio del profilo tutti centrati a 40 px dal bordo (la rotaia a 10 px: 10 + 6 + 24). Tavolo: tutte le pillole da 40 (marchio, «App», «Torna alla campagna», servizi senza margine interno), testata da 72 a 64 px                                                                                                                                                                                                                                                                                                              |
| AL-D11 Il «20» del dado                                      | 14 unità in #8A6C3C (4,9:1), 4,5 px a 32 px: due macchie a 1×; tagli di 3,6 unità                                                                                                                                                                                                                           | 15 unità con spaziatura −1, in #6A5230 (7,3:1): 6 px all'Inizio (dado da 40), 4,8 al Tavolo; tagli di 4 unità                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| AL-D12 Pulsanti dell'Inizio                                  | «I tuoi personaggi» bianco come «Entra al Tavolo» e senza cambio al passaggio; «Apri campagna» parola senza margini a 25 px dalla pillola                                                                                                                                                                   | Una sola pillola bianca per vista: «I tuoi personaggi» è la pillola secondaria di vetro col suo passaggio; «Apri campagna» un pulsante senza fondo con il riquadro di ogni pulsante (40 px, 16 dentro), pillola al passaggio, 33 px dalla pillola bianca                                                                                                                                                                                                                                                                                                                                                                                                 |
| AL-D13 Icone della pillola della Scheda                      | Glifi pieni (✕ spesso, condividi, matita, occhio) accanto alla matita a filo del ritratto                                                                                                                                                                                                                   | Le stesse icone a filo 1,5 di Lucide, 16 px come la matita del ritratto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| AL-D14 Linguetta «Azioni» nella barra                        | Parola a 12 px da sinistra e 67 da destra nella pillola da 127                                                                                                                                                                                                                                              | Parola centrata (39,6 e 39,6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| AL-D15 Colonna degli strumenti                               | Gli strumenti del gruppo aperto 6 px più in basso del gruppo (due dischi bianchi); lo zoom su un asse 7 px a sinistra                                                                                                                                                                                       | Strumenti del gruppo sulle righe della colonna; lo zoom sullo stesso asse degli strumenti; il gruppo aperto è un anello d'accento di 2 px e solo lo strumento in uso è il disco bianco                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| AL-D16 Pulsanti della sessione sopra la mappa                | Segnali di sicurezza 46 × 40 (ovali) accanto a cerchi da 40; spazi di 6 px                                                                                                                                                                                                                                  | Cerchi da 40 (con un contatore diventano una pillola), 8 px tra tutti i pulsanti della fila                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Proposte per superare Alchemy:

- **Allineamento ottico** (AL-D05): applicato alla Scheda, all'Inventario, alle Magie e a tutto il
  pannello «Creatura» (anche «Trova la mia pedina», gli oggetti da usare, «Aspetto nella scheda»).
- **Ritmo per gruppi nella barra**: 4 px tra le caselle di un gruppo, 12 tra i gruppi («Armi»,
  «Incantesimi», «Comuni»), sempre su due righe (barra 108 px). Non applicato: sollevare
  l'etichetta del gruppo 14 px sopra la casella. Sopra la prima riga di caselle ci sono, 6 px più
  su, la pillola delle risorse e la targa dei dadi: l'etichetta ci finirebbe sopra.
- **Uno stato per strumento** (AL-D15): applicato.

Scelte diverse dalla critica, e perché:

- **AL-D11, «20» a 19 unità con spaziatura −0,5.** Misurato sul dado disegnato: a 19 unità
  l'inchiostro esce di 0,8 unità dai lati inclinati della faccia (a 16 unità resta a 2,3 dal bordo,
  cioè 0,3 dentro il taglio). Restano 15 unità: è la misura più grande che lascia 3,3 unità di
  faccia attorno alle cifre, come prima. Il guadagno vero viene dal colore più scuro e dal dado da
  40 px all'Inizio (`fix-alchemy/numeral.js`, `numeral-svg.js`). I tagli passano a 4 unità per
  essere più netti; a 32 px sono 1,3 px, non un numero intero di pixel: un taglio in diagonale non
  si può allineare ai pixel.
- **AL-D15, −7 px.** Le righe del gruppo aperto partivano 6 px più in basso (box a 170, bordo 1,
  margine 6: 177 contro 171): lo spostamento è di 6 px.
- **AL-D10.** All'Inizio la prima proposta (pillola da 48, dado da 40), così dado, rotaia e profilo
  hanno lo stesso asse a 16 px dal bordo come in Alchemy; al Tavolo la seconda (tutte da 40),
  perché lì ci sono anche «App» e «Torna alla campagna», pillole da 40.
- **AL-D05.** Non applicato a «Cambia set → Arco corto», «Monete e scorta» (seguono un testo sulla
  stessa riga e vanno a capo solo perché il pannello è stretto: dove ci stanno, un margine negativo
  li porterebbe sul testo) e a «Chi può vedere» (centrato, largo quanto la colonna).
- **AL-D12.** «Apri campagna» non apre mai una riga (sul computer segue la pillola, sul telefono è
  centrato): l'allineamento ottico non serve.
- **AL-D16.** La richiesta della critica è troncata dopo «Make icon-only safety»: letta come
  «segnali di sicurezza rotondi da 40 px, spazi di 8».

### Coerenza (I-250), giro dei dettagli

Audit dei valori (`changes/visual-01/audit/audit.js --direction alchemy`, 20 stati). Prima: il
foglio di stile e il marchio di prima del giro (copie in `fix-alchemy/before/`), audit in
`fix-alchemy/audit-before.md`. Dopo: i file finali (19:57), audit in `audit/alchemy/audit.md`
(copia in `fix-alchemy/audit-after.md`).

| Misura                                              | Prima                                    | Dopo                                    |
| --------------------------------------------------- | ---------------------------------------- | --------------------------------------- |
| Elementi visibili                                   | 2498                                     | 2495                                    |
| Spaziature (padding, margini, distanze)             | 24 valori; passo 2 px al 100 %; 14 fuori | 27 valori; passo 2 px al 99 %; 14 fuori |
| Altezze dei comandi                                 | 16                                       | 17                                      |
| Caratteri · grandezze · pesi · stili di testo       | 2 · 8 · 4 · 35                           | 2 · 8 · 4 · 34                          |
| Raggi · bordi · ombre                               | 7 · 2 · 19                               | 7 · 2 · 20                              |
| Colori (testo · sfondo · bordo)                     | 12 · 30 · 12                             | 12 · 30 · 12                            |
| Pulsanti: classi; varianti; classi con più varianti | 29; 64; 7                                | 29; 64; 8                               |
| Pulsanti rotondi di vetro (40 × 40, icona 20)       | i segnali di sicurezza a parte (46 × 40) | una sola variante per 58 pulsanti       |
| Contrasto AA                                        | 0 casi su 1155 testi                     | 0 casi su 1154 testi                    |

I valori nuovi sono voluti: i margini negativi −17 (16 di rientro più 1 di bordo: allineamento
ottico), −16 (lo stesso sul telefono), −8 (ritmo dei pulsanti) e −6 (strumenti del gruppo aperto);
l'altezza 72 è la riga di «Il tuo personaggio», ora alta quanto il ritratto (era 88); l'ombra in
più è l'anello d'accento del gruppo aperto; la classe in più con più varianti è il marchio
(pillola da 48 all'Inizio, da 40 al Tavolo, rotondo sul telefono: AL-D10).

## Risposte alla verifica (sesto giro, 01/10/2026)

Punti aperti della verifica indipendente dopo il marchio e i dettagli
(`notes/open-items-round6.json`, voce «alchemy»), tutti applicati in un solo giro, più due cose
trovate qui (l'allineamento ottico nelle carte delle Guide e il contatore delle novità). Prove in
`polish6-alchemy/r5/` (sonde `*.cjs`, misure in `*/result.json`, ritagli); i tentativi precedenti
di questo stesso giro sono in `polish6-alchemy/` (`before/` ha i file di partenza).

| Punto                                                                                                                                                                                              | Cosa è cambiato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [media] Colonna «Novità» dell'Inizio più alta dello schermo (917 su 866 a 1440 × 900, 965 su 766 a 1280 × 800): «Novità precedenti» nascosta e la terza notizia tagliata, senza segnale            | Il trattamento della colonna destra del Tavolo (AL-D07): da 1101 px, dove la colonna è una carta fissa alta quanto lo schermo, il pannello aperto scorre dentro la carta sotto le linguette, sfuma negli ultimi 24 px (il rientro inferiore di ogni carta dell'Inizio, invece dei 32 proposti) e scorre fino a lasciare l'ultima riga sopra la sfumatura; scorso, sfuma anche sotto le linguette, nei 16 px tra loro e il testo. La carta tiene tutto il suo bordo (Differenze, punto 27). Pannello e contenuto: 794 e 809 px a 1440 × 900, 662 e 857 a 1366 × 768, 694 e 885 a 1280 × 800, 694 e 905 a 1101 × 800; in fondo «Novità precedenti (4)» è intera (`r5/aside-*`, `r5/s0/`) |
| [media] «Il tuo personaggio» schiacciato tra 1280 e 1439 px (colonna del nome 50 px, «Maga · / Livello 3» a capo, «18 / 22» a 12 px da «Livia»; tra 1101 e 1279 i punti ferita in fondo alla riga) | Una sola forma a ogni larghezza, quella di una riga d'elenco con un corpo su due righe (griglia 72 · resto · 20, distanze 12 e 8): ritratto e libro centrati ai due capi; nel corpo il nome con la riga d'accento, sempre su una riga, e 8 px sotto i punti ferita, sul bordo del nome. Colonna del nome 202 px a 1440, 182 a 1366, 159 a 1280, 112 a 1101, 192 a 390; punti ferita allineati al nome a ogni larghezza (`r5/s1/`, `r5/s1b/`, `r5/charcard-s1-cmp.png`). La riga è alta 104 px ovunque (prima 72 a 1440 e 104 sotto). La frase «nessuna riga schiacciata» delle verifiche dopo i dettagli è corretta lì                                                                 |
| [media] Barra in esplorazione: il dado da 48 px in una colonna da 40 con distanze di 8, quindi 8 e 4 px a vista                                                                                    | In esplorazione la barra usa le colonne del combattimento senza «Termina turno» (40 · 40 · 48, distanze 12): 12 · 12 a vista, come 12 · 12 · 12 in combattimento; barra alta 108 px in ogni caso (`r5/dock-final/`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| [bassa] Ritmo 8 / 32: filtri delle magie a 6 px, pillola → ☰ «Altre azioni» 26 px, pillola → «+ Effetto» 25                                                                                       | I filtri di Magie, Azioni e Inventario tutti a 8 px; dopo una pillola il glifo ☰ e «+ Effetto» stanno a 32 e 33 px a vista come ogni comando discreto (`r5/sheet/result.json`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [bassa] Allineamento ottico assente sull'Inizio: «Segna tutte come lette» 17 px dentro il bordo del testo                                                                                          | «Segna tutte come lette» e «Segna come letta» sporgono di 17 px (16 di rientro più 1 di bordo): quando aprono una riga la prima lettera sta sul bordo del testo, accanto a «7 da leggere» il comando finisce sul bordo; «Segna come letta» accanto alla pillola resta a 32 px a vista. Esteso ai comandi discreti che aprono una riga nelle carte delle Guide («Ripristina tutti i tour», visibile nel campionario). «7 da leggere» passa a 14/20 come le altre righe sotto i titoli; il contatore della linguetta è quello delle notifiche (Lexend 600 10/12)                                                                                                                         |
| [bassa] Telefono, linguette in basso: un pezzo di 25 px di «Scena» («Sc») accanto a «Tutti» sotto una sfumatura di 24 px; a 360 px la fila delle azioni non mostra un'azione intera                | La fila delle linguette sfuma per 48 px: a 390 il pezzo di «Scena» sta tutto nella sfumatura e «Combattimento» resta intero e leggibile; a 412 «Scena» è sfumata, a 360 la sfumatura scurisce la fine di «Combattimento», che lì finisce sul bordo (Differenze, punto 26). La fila delle azioni a 360 px resta com'era (Differenze, punto 26)                                                                                                                                                                                                                                                                                                                                          |
| [bassa] Monete «30 mo · 45 ma · 120 mr · 12 sb» a capo tra «12» e «sb»                                                                                                                             | La riga delle monete è un passo più piccola (16/24 invece di 18/28: una lista di importi, non un numero solo) e sta su una riga a 1440 (266 px nella carta da 298) e a 390; in una carta più stretta va a capo bilanciata                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Schermate e coppie vecchie                                                                                                                                                                         | Rifatte tutte dopo l'ultima modifica del foglio di stile (sezione «Verifiche (01/10/2026, dopo il sesto giro)»)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Coerenza (I-250)

### Secondo giro

Audit dei valori (`changes/visual-01/audit/audit.js --direction alchemy`, 20 stati a 1440 e 390,
tema scuro). Prima: il foglio di stile delle 10:37 (audit delle 11:36). Dopo: il foglio di stile
finale delle 12:10 (audit delle 12:15). Rapporti: `probe-alchemy/round2/audit-before.md` e
`audit/alchemy/audit.md` (copia in `probe-alchemy/round2/audit-after.md`).

| Misura                                          | Prima                                   | Dopo                                     |
| ----------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| Elementi visibili                               | 2496                                    | 2499                                     |
| Spaziature (padding, margini, distanze)         | 30 valori; passo 2 px al 99 %; 16 fuori | 28 valori; passo 2 px al 100 %; 14 fuori |
| Altezze dei comandi                             | 18                                      | 18                                       |
| Caratteri · grandezze · pesi · interlinee       | 3 · 9 · 4 · 14                          | 3 · 9 · 4 · 14                           |
| Stili di testo                                  | 48                                      | 46                                       |
| Raggi · bordi · ombre                           | 7 · 2 · 19                              | 7 · 2 · 19                               |
| Colori (testo · sfondo · bordo)                 | 13 · 30 · 11                            | 13 · 30 · 11                             |
| Pulsanti: varianti; classi con più varianti     | 71; 9                                   | 65; 7                                    |
| Campi · menu a tendina: varianti                | 3 · 2                                   | 2 · 1                                    |
| Linguette · etichette · pannelli: varianti      | 11 · 12 · 38                            | 9 · 10 · 38                              |
| Grandezze delle icone                           | 6 (20, 16, 18, 17, 19 × 20, 14)         | 4 (20, 16, 18, 14)                       |
| Contrasto AA                                    | 0 casi su 1154 testi                    | 0 casi su 1155 testi                     |
| Pulsanti con il margine del browser (`1px 6px`) | nessuno                                 | nessuno                                  |

Cosa è stato reso uguale:

- **Pulsanti.** Un solo glifo da 20 px in ogni pulsante a pillola e rotondo (l'app ne rimpiccioliva
  alcuni a 18 e 19 px; gli strumenti della mappa erano a 16); 16 px dentro le caselle della barra
  delle azioni, in «Tutte» e nella matita del ritratto. Le caselle della barra sono tutte da 40 px
  (la prima fila era da 44 per il pozzetto di 1 px attorno al filtro). «Altro» dell'inventario è un
  pulsante rotondo da 40, non una pillola da 54 attorno a un glifo. Nella pillola della Scheda i
  glifi ✕, condividi e matita sono al centro del cerchio (prima stavano 8 px più in alto). Il
  comando discreto accanto a un titolo («Tutte le discussioni», «+ Azione personalizzata») è un
  collegamento in maiuscoletto senza rientro, come «Tutte le campagne»; il pulsante accanto a un
  titolo non va più a capo dentro la pillola.
- **Campi.** Due sole misure: 48 px nei moduli, 40 px per i numeri in riga (d20, danni, punti
  ferita del menu della pedina), sempre Lexend 14; il menu dei dadi nella barra è a 14 anche sul
  telefono. Le scelte singole sono tonde (una regola più forte le faceva quadrate come le caselle).
- **Linguette.** «Azioni» e «Barra rapida» hanno lo stesso margine (12 px) a ogni larghezza.
- **Carte e righe.** Ogni carta dell'Inizio è a 24 px dalla precedente (sul telefono l'app mescolava
  0, 20 e 28 px) e ha lo stesso bordo di vetro; sotto il riquadro illustrato tre carte alte uguali.
  Sul telefono Iniziativa, CA e Difese seguono la grammatica della banda in cui finiscono (niente
  riquadro, valore a 14 px, etichette in alto). Nelle Magie i comandi delle righe di
  concentrazione e degli slot stanno tutti sul bordo destro.
- **Fuori scala tolti.** Il rientro della targa dei dadi (10 → 12 px), la distanza dei pallini della
  sessione (3 → 4), il margine dell'interruttore delle impostazioni (3 → 2) e quello del pannello
  «Disponibilità offline» (20 → 24).

Restano, e perché: i margini fissi del Tavolo attorno alla mappa (76, 88, 152 px) e le bordature
dell'immagine dell'Inizio (−64, −24, −16) sono geometria della pagina; le parole cliccabili nel
testo delle azioni («TS», «azione bonus») sono alte 17 px con 1 px di margine perché sono parole
nella riga; le 28 classi di pulsante sono componenti diversi (Differenze, punto 20). (Le icone da
18 del menu della pedina sono passate a 20 nel terzo giro, sotto.)

### Terzo giro

Prima: il foglio di stile del secondo giro (12:10), audit della verifica delle 13:00 (copia in
`probe-alchemy/round3/audit-before.md`). Dopo: il foglio di stile finale delle 14:26, audit delle
14:28 (`audit/alchemy/audit.md`, copia in `probe-alchemy/round3/audit-after.md`). Campionario dei
componenti: `probe-alchemy/round3/specimen-after/`.

| Misura                                          | Prima                                     | Dopo                                          |
| ----------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| Elementi visibili                               | 2499                                      | 2497                                          |
| Spaziature (padding, margini, distanze)         | 28 valori; passo 2 px al 100 %; 14 fuori  | 25 valori; passo 2 px al 100 %; 14 fuori      |
| Margini (valori)                                | 22 (con 10, 14, 18, 22 fuori dalla scala) | 18 (10, 14, 18 e 22 tolti)                    |
| Altezze dei comandi                             | 18                                        | 18                                            |
| Caratteri · grandezze · pesi · interlinee       | 3 · 9 · 4 · 14                            | 3 · 9 · 4 · 14                                |
| Stili di testo                                  | 46                                        | 46                                            |
| Raggi · bordi · ombre                           | 7 · 2 · 19                                | 7 · 2 · 19                                    |
| Colori (testo · sfondo · bordo)                 | 13 · 30 · 11                              | 13 · 30 · 11                                  |
| Pulsanti: varianti; classi con più varianti     | 65; 7                                     | 67; 7                                         |
| Campi · menu a tendina: varianti                | 2 · 1                                     | 2 · 1                                         |
| Linguette · etichette · pannelli: varianti      | 9 · 10 · 38                               | 9 · 10 · 38                                   |
| Etichette: altezze                              | 7 (12, 20, 24, 26, 40, 74, 134)           | 6 («Chiedi» da 24 diventa un'etichetta da 26) |
| Grandezze delle icone                           | 4 (20, 16, 18, 14)                        | 3 (20, 16, 14)                                |
| Contrasto AA                                    | 0 casi su 1155 testi                      | 0 casi su 1155 testi                          |
| Pulsanti con il margine del browser (`1px 6px`) | nessuno                                   | nessuno                                       |

Cosa è stato reso uguale:

- **Barre segmentate.** «Azioni» e «Barra rapida» nella barra delle azioni prendono la ricetta delle
  altre barre segmentate (40 px, rientro 12, maiuscoletto esteso da 10 px) invece di Lexend 600 da
  12; «Gioco / Modifica» e i dadi digitali / fisici passano dal rientro 16 al 12 delle altre. I due
  pulsanti in più contati dall'audit (65 → 67) sono proprio questi quattro interruttori della
  Scheda: per l'audit sono «pulsanti» e prima coincidevano con la pillola comune da 16, mentre le
  linguette dell'Inizio e della barra, con lo stesso aspetto, le conta altrove. Le linguette della
  barra hanno ora una sola variante (prima due caratteri).
- **Pillole.** Nessuna pillola su due righe nei pannelli del Tavolo; «Termina turno» ha il bordo di
  1 px delle altre pillole principali (stessa misura, prima 0); i comandi delle novità hanno il
  rientro di 16 come ogni pillola; i collegamenti discreti dei titoli non hanno rientro anche
  accanto a una pillola.
- **Etichette e stati.** Condizioni attive e stato vitale sono una sola pillola da 40 px; «Chiedi»
  e lo stato delle magie («Trucchetto») hanno forma e carattere delle etichette.
- **Icone.** Le icone del menu della pedina (righe, chiusura, «Menu di Livia», «Trova la mia
  pedina») sono da 20 come ogni altra; restano 16 nei comandi compatti e 14 per i simboli delle
  risorse del turno nella Scheda, alti quanto il testo.
- **Spaziature.** I margini che l'app fissa a 10, 14, 18 e 22 px tornano sulla scala (8, 16, 16,
  24): condizioni e moduli del pannello «Creatura», dettaglio della mossa, piede delle azioni,
  barra dell'inventario, riquadro delle impostazioni della scheda, pannello del Tavolo sul
  telefono; l'ultima riga del dettaglio della mossa perde il margine di 1 em del browser. Inizio:
  24 px tra le carte in ogni direzione.
- **Caselle.** Le caselle da spuntare hanno un solo carattere (14) come gli altri campi.

Restano, e perché: le misure fisse del Tavolo attorno alla mappa (76, 88, 152), le bordature
dell'immagine dell'Inizio e le parole cliccabili nel testo delle azioni (sopra); i 28 aspetti di
pulsante (Differenze, punto 20); «Tiri e risultati» nel carattere della targa dei dadi (Differenze,
punto 23); le sottolinguette compatte del pannello del Tavolo (Differenze, punto 20).

### Quarto giro

Prima: il foglio di stile del terzo giro (14:26), audit delle 14:28 (copia in
`probe-alchemy/round4/audit-before.md`). Dopo: il foglio di stile finale delle 15:58, audit delle
16:03 (`audit/alchemy/audit.md`, copia in `probe-alchemy/round4/audit-after.md`). Campionario dei
componenti: `probe-alchemy/round4/specimen/`.

| Misura                                          | Prima                                    | Dopo                                     |
| ----------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Elementi visibili                               | 2497                                     | 2497                                     |
| Spaziature (padding, margini, distanze)         | 25 valori; passo 2 px al 100 %; 14 fuori | 25 valori; passo 2 px al 100 %; 14 fuori |
| Altezze dei comandi                             | 18                                       | 16 (tolti 22, 44 e 68)                   |
| Caratteri · grandezze · pesi · interlinee       | 3 · 9 · 4 · 14                           | 3 · 9 · 4 · 13                           |
| Stili di testo                                  | 46                                       | 37                                       |
| Raggi · bordi · ombre                           | 7 · 2 · 19                               | 7 · 2 · 19                               |
| Colori (testo · sfondo · bordo)                 | 13 · 30 · 11                             | 13 · 30 · 11                             |
| Pulsanti: varianti; classi con più varianti     | 67; 7                                    | 65; 7                                    |
| Campi · menu a tendina: varianti                | 2 · 1                                    | 2 · 1                                    |
| Linguette · etichette · pannelli: varianti      | 9 · 10 · 38                              | 9 · 10 · 38                              |
| Grandezze delle icone                           | 3 (20, 16, 14)                           | 3 (20, 16, 14)                           |
| Contrasto AA                                    | 0 casi su 1155 testi                     | 0 casi su 1155 testi                     |
| Pulsanti con il margine del browser (`1px 6px`) | nessuno                                  | nessuno                                  |

Cosa è stato reso uguale:

- **Interlinee.** Dove l'interlinea 1,5 dell'app arrivava a testi da 14 e 12 px (14/21, 12/18),
  ora c'è quella del passo, 14/20 e 12/16, come in ogni altra riga di quelle grandezze: valori e
  nomi delle righe della Scheda, filtri «Tutte / Attacco…» (come quelli di Magie e Inventario),
  collegamenti discreti, celle della tabella delle azioni, voci del menu della pedina, dischi
  dell'indebolimento, linguette della Scheda e del pannello del Tavolo, «Dadi» e il suo menu,
  risorse del turno della Scheda, riga dei PE, note sotto le azioni, «Sorpreso». L'interlinea è
  messa dove sta la grandezza: una proporzione messa sul contenitore avrebbe dato righe frazionarie
  (12/17,14) ai testi più piccoli dentro.
- **Stessi componenti, stesso carattere.** «Maga · Livello 3» e «Combattimento · Round 1» sono una
  sola riga d'accento (Differenze, punto 7); «Cosciente» è la stessa pillola da 14 nella Scheda e
  nel pannello «Creatura» (nella Scheda era da 12); «Indebolimento» è la stessa etichetta da 12
  nei due posti (nel pannello era da 14); «PF» nella pillola dei punti ferita ha la riga delle
  etichette; nome e punti ferita di «Il tuo personaggio» la riga del passo da 18.
- **Pesi dichiarati come disegnati.** Unbounded ha solo 700 e 900, Lexend solo 400 e 600: il nome
  della campagna nel prossimo appuntamento (chiesto 600), l'iniziale del ritratto nella rotaia
  (chiesto 400) e il titolo «Movimento» della scheda delle mosse (chiesto 700) dichiarano il peso
  che si vede. «/ 22» accanto ai punti ferita della Scheda è nelle cifre semplici del carattere
  dell'interfaccia, come i contatori nei filtri.
- **Misure.** I punti ferita della Scheda sono un comando da 40 px come gli altri (l'app li fa da
  44); l'interruttore delle impostazioni della scheda è alto 24 (l'app 22, fuori dal passo); ogni
  ritratto del gruppo ha la stessa casella (76 px sul computer, 60 sul telefono): chi non mostra
  la barra dei punti ferita ne tiene lo spazio, così la colonna ha passi uguali (prima 68 e 76).
- **Barra rapida.** Caselle alte 40 come ogni casella della barra (prima 44), nome della pagina nel
  carattere delle caselle (Differenze, punto 24).

Restano, e perché: le misure fisse del Tavolo attorno alla mappa, le bordature dell'immagine
dell'Inizio e le parole cliccabili nel testo delle azioni (secondo giro); i 28 aspetti di pulsante
(Differenze, punto 20); il nuovo stile Lexend 400 da 10 dello stato del turno (Differenze, punto
21); le etichette in SVG sulla mappa (nomi delle pedine, segni dei luoghi, «Illeso», maniglie delle
porte, nome dello spillo «Pozzo del cortile»), che l'audit conta con interlinee diverse ma che in
SVG non hanno righe; il menu dei dadi, che Chromium disegna sempre con l'interlinea normale; il
marchio nel suo carattere di oggi.

### Quinto giro

Prima: il foglio di stile del quarto giro (15:58), audit delle 16:03 (copia in
`probe-alchemy/round5/audit-before.md`; la verifica indipendente ha ottenuto gli stessi numeri).
Dopo: il foglio di stile finale delle 16:49, audit delle 16:51 (`audit/alchemy/audit.md`, copia in
`probe-alchemy/round5/audit-after.md`). Campionario dei componenti: `probe-alchemy/round5/specimen/`.

| Misura                                          | Prima                                                              | Dopo                                             |
| ----------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| Elementi visibili                               | 2497                                                               | 2498                                             |
| Spaziature (padding, margini, distanze)         | 25 valori; passo 2 px al 100 %; 14 fuori                           | 24 valori; passo 2 px al 100 %; 14 fuori         |
| Distanze tra elementi (gap)                     | 9 valori (10 px in 10 contenitori)                                 | 8 valori (10 tolto)                              |
| Altezze dei comandi                             | 16                                                                 | 16                                               |
| Caratteri · grandezze · pesi · interlinee       | 3 · 9 · 4 · 13                                                     | 3 · 9 · 4 · 13                                   |
| Interlinee calcolate                            | 20,0004 · 15,9996 · 28,0008 px                                     | 20 · 16 · 28 px (intere)                         |
| Stili di testo                                  | 37                                                                 | 37                                               |
| Raggi · bordi · ombre                           | 7 · 2 · 19                                                         | 7 · 2 · 19                                       |
| Colori (testo · sfondo · bordo)                 | 13 · 30 · 11                                                       | 13 · 30 · 12 (il verde dell'interruttore acceso) |
| Pulsanti: varianti; classi con più varianti     | 65; 7                                                              | 65; 7                                            |
| Campi · menu a tendina: varianti                | 2 · 1                                                              | 2 · 1                                            |
| Linguette · etichette · pannelli: varianti      | 9 · 10 · 38                                                        | 9 · 10 · 38                                      |
| Interruttori della Scheda: misure della traccia | 3 (40 × 24, 40 × 22, 44 × 26)                                      | 1 (40 × 24)                                      |
| Barra delle azioni a 1440 × 900                 | 110 · 108 · 112 (turno di Livia, della Sentinella, «Barra rapida») | 108 in ogni turno e pagina                       |
| Grandezze delle icone                           | 3 (20, 16, 14)                                                     | 3 (20, 16, 14)                                   |
| Contrasto AA                                    | 0 casi su 1155 testi                                               | 0 casi su 1155 testi                             |
| Pulsanti con il margine del browser (`1px 6px`) | nessuno                                                            | nessuno                                          |

Cosa è stato reso uguale:

- **Interruttori.** Una sola ricetta per le quattro forme dell'app (interruttore di base, riga
  delle impostazioni, «Disponibile offline», «Ispirazione eroica»): traccia, pomello, distanza dal
  nome, anello del fuoco e carattere del nome (Differenze, punto 25).
- **Barra delle azioni.** Una sola altezza (108 px) e una sola distanza tra le righe (4 px) per
  caselle, linguette e pagine; lo stato del turno in un solo passo (10 px) a ogni larghezza del
  computer.
- **Stati.** «Cosciente» ha lo stesso inchiostro bianco nella Scheda e nel pannello «Creatura».
- **Fuoco.** I punti ferita della Scheda hanno l'anello da 3 px di ogni comando.
- **Interlinee.** Ogni passo della scala dà pixel interi.
- **Spaziature.** Le distanze da 10 px dell'app passano al passo da 8 (12 per l'interruttore); il
  contatore degli usi non rientra più quando va a capo.

Restano, e perché: le misure fisse del Tavolo attorno alla mappa, le bordature dell'immagine
dell'Inizio e le parole cliccabili nel testo delle azioni (secondo giro); i 28 aspetti di
pulsante (Differenze, punto 20); «Tiri e risultati» nel carattere della targa dei dadi
(Differenze, punto 23); le etichette in SVG sulla mappa, il menu dei dadi e il marchio (quarto
giro); il segno della porta sopra la barra del disegno in una vista del DM (Differenze, punto 17).

### Sesto giro

Prima: il foglio di stile del giro dei dettagli, audit della verifica (`polish6-alchemy/audit-before/`;
un audit a metà giro, con la prima versione della riga del personaggio, è in
`polish6-alchemy/r4/audit-start.md`). Dopo: il foglio di stile finale (05:23:49), audit delle
05:39 (`audit/alchemy/audit.md`, copia in `polish6-alchemy/r5/audit-after.md`). Campionario dei
componenti: `polish6-alchemy/r5/specimen/` (1440 e 390, aperto per intero). Inizio intero sotto la
piega: `polish6-alchemy/r5/audit-homefull/`.

| Misura                                              | Prima                                   | Dopo                                    |
| --------------------------------------------------- | --------------------------------------- | --------------------------------------- |
| Elementi visibili                                   | 2495                                    | 2497                                    |
| Spaziature (padding, margini, distanze)             | 27 valori; passo 2 px al 99 %; 14 fuori | 27 valori; passo 2 px al 99 %; 14 fuori |
| Altezze dei comandi                                 | 17 (72 la riga di «Il tuo personaggio») | 17 (104 la stessa riga)                 |
| Caratteri · grandezze · pesi · interlinee           | 2 · 8 · 4 · 11                          | 2 · 8 · 4 · 11                          |
| Stili di testo                                      | 34                                      | 34                                      |
| Raggi · bordi · ombre                               | 7 · 2 · 20                              | 7 · 2 · 20                              |
| Colori (testo · sfondo · bordo)                     | 12 · 30 · 12                            | 12 · 30 · 12                            |
| Pulsanti: classi; varianti; classi con più varianti | 29; 64; 8                               | 29; 64; 8                               |
| Campi · menu a tendina: varianti                    | 2 · 1                                   | 2 · 1                                   |
| Linguette · etichette · pannelli: varianti          | 9 · 10 · 38                             | 9 · 10 · 38                             |
| Grandezze delle icone                               | 3 (20, 16, 14)                          | 3 (20, 16, 14)                          |
| Contrasto AA                                        | 0 casi su 1154 testi                    | 0 casi su 1157 testi                    |
| Pulsanti con il margine del browser (`1px 6px`)     | nessuno                                 | nessuno                                 |

A metà giro la prima versione della riga del personaggio (ritratto e libro in posizione assoluta
dentro rientri di 84 e 32 px) aveva aggiunto il valore 84 fuori scala (28 valori, 15 fuori): la
griglia finale non ha rientri e lo toglie.

Cosa è stato reso uguale:

- **«Il tuo personaggio».** Una sola forma a ogni larghezza, con le distanze della scala (12 tra le
  parti, 8 tra le righe del corpo).
- **Ritmo dei comandi.** Ogni fila di filtri della Scheda a 8 px; ogni comando discreto dopo una
  pillola a 32 px a vista, anche il glifo ☰ e «+ Effetto».
- **Allineamento ottico.** Anche sull'Inizio: testa e notizie della colonna «Novità», carte delle
  Guide.
- **Contatori e righe di testa.** Il contatore della linguetta «Novità» è quello delle notifiche
  (prima aveva l'interlinea 1,43 dell'etichetta: 14,29 px); «7 da leggere» è una riga da 14/20
  come le altre sotto i titoli.
- **Barra delle azioni.** In esplorazione le colonne e le distanze del combattimento.
- **Colonne che scorrono.** La colonna «Novità» scorre e sfuma come la colonna destra del Tavolo.

Sotto la piega. Inizio intero (`--states home-full`, 1440 e 390): 0 casi su 151 testi, 13
incerti. Sono il riquadro illustrato e il marchio, misurati sui pixel nello stato «home» (passano),
e «Guide» / «Supporto» (#8D8E93), che l'audit stima 3,46–4,74:1 dai colori del gradiente della
carta: sui pixel lo sfondo sotto le linguette è #222328 a 390 e a 1280, cioè 4,8:1, che passa
(`r5/tabsbg/`). Nessun valore fuori scala nuovo: −17 è l'allineamento ottico, il rientro «24 0 0 0»
della colonna è dichiarato (Differenze, punto 27). Scheda intera: è tra i 20 stati (0 casi).

Il campionario mostra due limiti suoi, non della direzione (uguali con «Attuale»): sul telefono le
celle «Scheda» e «Tavolo (pannello laterale)» hanno la catena della scheda larga 0 px, così i
pulsanti stanno in una colonna di 24 px e vanno a capo lettera per lettera; la cella della testata
dell'Inizio disegna dentro i suoi 64 px la rotaia, che nell'app è fissa sul bordo sinistro.

Restano, e perché: le misure fisse del Tavolo attorno alla mappa, le bordature dell'immagine
dell'Inizio e le parole cliccabili nel testo delle azioni (secondo giro); i 28 aspetti di
pulsante (Differenze, punto 20); «Tiri e risultati» nel carattere della targa dei dadi
(Differenze, punto 23); le etichette in SVG sulla mappa, il menu dei dadi e il marchio (quarto
giro); il segno della porta sopra la barra del disegno in una vista del DM (Differenze, punto 17);
le tre lunghezze delle sfumature (Differenze, punto 26) e il rientro della colonna delle novità
(Differenze, punto 27); l'altezza 104 della riga del personaggio, che è una sola.

## Marchio (I-251)

Il marchio di questa opzione è un **d20 fatto di tessere d'oro piatte**, separate da tagli veri
(attraverso i tagli si vede lo sfondo), con la faccia del «20» **bianca** e il numero in oro; accanto,
la scritta come Alchemy compone la sua: **«d20»** bianco nel carattere esteso più nero e
**«Studio»** in maiuscoletto d'oro spaziato, come le piccole righe d'accento sotto i titoli di
Alchemy. Il dado è disegnato in codice (`brand.mjs`, SVG) sulla geometria condivisa da tutte le
opzioni (`../brand-geometry.mjs`, un icosaedro vero visto di faccia); la scritta è il testo
dell'app con le regole della sezione «brand (I-251)» in fondo a `direction.css`. Nessuna immagine,
nessun file nuovo in `assets/`.

- **Dove si vede:** testata dell'Inizio (pillola di vetro alta 48 px come quella dei servizi,
  dado di 40 px, AL-D10), testata del Tavolo (pillola da 40 px come «App» e «Torna alla campagna»,
  dado di 32 px), scritta di 18 px in tutte e due, telefono (solo il dado, in un bottone rotondo di vetro da 40 px
  come i pulsanti dei servizi accanto; al Tavolo l'app lo nasconde già), icona della scheda del
  browser. Con il tema chiaro tornano il marchio e l'icona di oggi.
- **Campionario:** <http://127.0.0.1:8881/directions/specimen.html?direction=alchemy>, sezione
  «Marchio» (testate a 1× e 2×, il dado da 16 a 160 px su fondo scuro e chiaro, l'icona della
  scheda, il marchio completo a 3×).
- **Prove:** `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/brand-alchemy/`:
  `montage-brand-alchemy.png` (i riferimenti di Alchemy sopra, il nostro marchio sotto),
  `headers-1440-alchemy.png` e `headers-390-alchemy.png` (prima e dopo, puntatore sopra, fuoco da
  tastiera, a 2×), `v3/` (ritagli a 2× e `brand-report.json` con le misure), `spec-v1/` e `v3/`
  per il campionario, `webkit/` (la stessa testata in WebKit), `audit/` (audit dei valori di Inizio
  e Tavolo), `after/` (controlli del kit di cattura), gli script `brand-shots.mjs` e `spec-2x.mjs`.

### Cosa prende dalla grammatica di Alchemy

| Elemento del marchio                                                                                                                           | Da Alchemy                                                                                                                           | Fonte                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Il materiale: oro **piatto**, senza metallo né sfumature; quattro ori a tinta unita per dare il volume                                         | il logo è un unico oro pieno: #B68D50 nella pillola in alto a sinistra, #8A6C3C («Alchemy Gold») nel piè di pagina e nell'iscrizione | [O] H1 (campione 30 × 20 px), H2, D6; [C] `g5.accent` #8A6C3C |
| I tagli: gli spigoli del dado sono vuoti, non linee disegnate                                                                                  | la lettera del logo è attraversata da un taglio che lascia passare lo sfondo                                                         | [O] H1, D6                                                    |
| La faccia del «20» bianca con il numero nell'oro di Alchemy                                                                                    | il FAB: disco bianco con il glifo del sistema dentro; le pillole bianche delle azioni principali                                     | [O] T1; `facts.md` §1 tratto 2                                |
| «d20» bianco, Unbounded 900 (al posto di Nominee Extended Black), spaziatura di 1 px                                                           | la scritta «ALCHEMY»: bianca, larga, nerissima, accanto al segno d'oro                                                               | [O] H2, D6; `facts.md` «Typography»                           |
| «Studio» in maiuscoletto Unbounded 700, spaziatura di 2 px, oro #B68D50                                                                        | le righe d'accento sotto i titoli («RELEASE NOTES», «UNIVERSE»): maiuscole piccole, spaziate, nel colore del tema                    | [O] D1, H6; [C] `tabBars` 10 px / 2 px                        |
| La pillola di vetro (48 px all'Inizio, 40 al Tavolo) con una luce calda dietro il dado; al puntatore la luce cresce e la pillola si schiarisce | la pillola del logo (60 × 32) con l'alone d'oro dietro il segno; `gold-glow` 0 0 20px #C4B998 al 40 %                                | [O] H1; [C] `boxShadow` «gold-glow»                           |
| Sul telefono un bottone rotondo da 40 px                                                                                                       | tutto è vetro rotondo: pulsanti tondi della rotaia e del dock                                                                        | [O] P1, H1                                                    |

### Cosa è originale

- La forma: il dado a venti facce, lo stesso in tutte le opzioni; qui fatto di tessere d'oro piatte
  illuminate da sinistra in alto (i due ori di Alchemy, #B68D50 e #8A6C3C, più un oro chiaro e uno
  scuro nostri, #E2C48A e #6A5230, per le facce in luce e quella in ombra), con tagli di 4 unità
  (1,3 px a 32 px, 1,6 a 40) e la faccia del «20» bianca col numero in Unbounded 900 nell'oro più
  scuro #6A5230 (7,3:1 sul bianco), 15 unità con spaziatura −1: è la misura più grande che resta a
  3,3 unità dai bordi della faccia, perché le cifre di Unbounded sono larghe (AL-D11; prima 14
  unità in #8A6C3C, 4,9:1).
- La scritta su due livelli: «d20» come si scrive in notazione dei dadi (d minuscola, cifre
  allineate) e «Studio» come una riga d'accento accanto, non sotto.
- L'alone come luce sulla pillola, non come ombra del dado: un'ombra riempirebbe i tagli e li
  ingrigirebbe.
- L'icona della scheda: lo stesso dado in tre ori piatti con la faccia bianca, i tagli e un bordo
  nel nero della pagina (#101217, circa 1 px a 16 px), senza numero (a 16 px non si leggerebbe),
  chiara sia su una barra scura sia su una chiara.

### Perché non è una copia del logo di Alchemy

- Il logo di Alchemy è una **lettera «A» stilizzata, senza traversa, tagliata e prolungata da un
  colpo diagonale**, seguita dalla scritta «ALCHEMY» nel carattere commerciale Nominee Extended. Il
  nostro marchio non ha nessuna lettera disegnata, nessuna diagonale, nessun colpo di pennello: è
  un dado geometrico, e la scritta è un carattere libero (Unbounded, OFL) che dice «d20 Studio».
- Prende solo il **modo** di Alchemy (un oro solo e piatto, tagli di vuoto, bianco accanto all'oro,
  lettere larghe e nere, maiuscoletto spaziato, vetro con luce calda), cioè la grammatica di tutta
  la sua interfaccia, non un segno del suo logo.
- Non è nemmeno uno dei suoi glifi: i glifi dei sistemi (l'esagono rosso «5E» nel FAB, il doppio
  rombo dei divisori, gli emblemi degli universi) sono disegni diversi e non sono stati ripresi.
- Nessun pixel, carattere, tracciato o immagine di Alchemy; le immagini di riferimento sono state
  solo guardate e campionate per i colori, mai ricalcate né incluse.

### Misure e controlli (01/10/2026)

- **Altezze:** testata di Inizio a 1440 alta 80 px (come prima: la pillola del marchio ora è alta
  quanto quella dei servizi, 48); del Tavolo 64 px (prima 72: tutte le sue pillole sono da 40, la
  mappa guadagna 8 px); a 390 64 px su una sola riga in tutti e due. Nessuno scorrimento orizzontale a 390; il kit di cattura
  passa su Inizio, Tavolo e Tavolo del DM a 1440 e 390 (barra ≤ 120 px, «Termina turno», annulla e
  cancella visibili, «Entra al Tavolo» nei primi 844 px), e non ci sono più i due 404 per pagina
  (prima mancava `brand.mjs`).
- **Allineamento:** il centro del dado e il centro delle maiuscole coincidono (83 e 83 px
  all'Inizio, 75 e 75 px al Tavolo, misure del giro dei dettagli); all'Inizio il centro del dado
  sta a 40 px dal bordo, come i pulsanti della rotaia e il cerchio del profilo (prima 36 contro 46): la scritta è rifilata dall'altezza delle maiuscole alla
  linea di base (`text-box`), così il centro non dipende dall'ascendente alto di Unbounded. Il dado
  sta a 4 px dal bordo della pillola (in alto, in basso e a sinistra), concentrico con la sua
  estremità tonda; tra il dado
  e la scritta 8 px più il margine del dado (circa 12 px a vista, quanto le maiuscole); a destra
  16 px, restituita la spaziatura dell'ultima lettera. WebKit disegna lo stesso.
- **Contrasto:** «d20» bianco sul vetro 17:1; «Studio» #B68D50 sul vetro 5,6:1 (l'oro #8A6C3C dei
  titoletti di Alchemy farebbe 3,5:1, per questo la scritta usa l'oro più chiaro della pillola).
  Audit dei valori di Inizio e Tavolo: 0 contrasti insufficienti su 162 testi; la scritta da 18 px
  è sulla scala (8 grandezze; prima l'unica fuori scala era il marchio da 22).
- **Fuoco:** l'anello di 3 px dell'app è intero attorno alla pillola, non tagliato (oro chiaro
  all'Inizio, rosso del tema al Tavolo).
- **Larghezze intermedie:** la pillola è larga 196 px all'Inizio e 188 al Tavolo (prima 168); la testata del Tavolo sta su
  una riga da 882 px in su (prima da 874); più stretta va su due righe, come già prima. A 1440 e a
  390 nulla cambia.
- **Test:** `tests/visual01-directions.test.mjs` 13 su 13 (contratto di `brand.mjs`: classe,
  viewBox, `aria-hidden`, solo il testo «20», id della maschera diverso a ogni chiamata, icona con
  `xmlns` e colori scritti per esteso); Prettier senza rilievi.

## Licenze e attribuzioni

| File                                                                                                                       | Origine                                                                                                                                                                                                                                                                            | Licenza                                                                                                               | sha256                                                                                                                                                                                                                                                                                                                  | Modifiche                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `directions/alchemy/assets/featured-hearth.webp` (1672 × 941, 81 854 B)                                                    | `~/Workspace/Codex/d20-studio-visual-assets/candidates/plates/home-hero.webp`, a sua volta `~/Workspace/d20-folio/public/assets/backgrounds/home-hero.webp` (d20 Folio, main `5b7f2a8b`); riga 35 di `candidates/MANIFEST.md` (SAFE)                                               | Opera originale dell'owner (gpt-image via ChatGPT; C2PA nel master `masters/d20-folio/images_d20folio/PROMPT_12.png`) | `b8d037660f1dfb2ba3234c675b637f67a597949221567cecadf8de1ac022adea`                                                                                                                                                                                                                                                      | Nessuna (solo rinominato)                                                                                                                                            |
| `directions/alchemy/assets/icons/line-x.svg`, `line-eye.svg`, `line-share-2.svg`, `line-pencil.svg`                        | npm `lucide-static@1.49.0`, `icons/x.svg`, `eye.svg`, `share-2.svg`, `pencil.svg` (copia locale in `probe-alchemy/pkgs/lucide-static-1.49.0/`)                                                                                                                                     | ISC (commento di licenza nel file)                                                                                    | line-x `583fc67331ae55d0b083a5df1c6b40d3182c313291bfa28cc24a78db8da035fe`; line-eye `0a7c99edeff654ba8880840f7e19ce055bd32e3b048311e9de5cb27d5ad58a4b`; line-share-2 `c295dd030d8ccfe0833a28ac9630dc8b242353a9525f721132fec51984c1fda0`; line-pencil `eae72871da3ea1f96bbc279da350a571683cd883a20955181d472f09eaa5cab1` | Tratto 1,5 invece di 2, nero (maschere CSS della pillola della scheda); tolti i quattro glifi pieni di Font Awesome che c'erano prima (xmark, eye, pen, share-nodes) |
| `directions/alchemy/assets/icons/house.svg`, `user.svg`, `user-group.svg`, `book-open.svg`                                 | npm `@fortawesome/fontawesome-free@7.3.1`, `svgs/solid/`                                                                                                                                                                                                                           | Icone CC BY 4.0 (commento di licenza nel file)                                                                        | house `8b076b5846f917058aca54d8892168c9727aa2082e5d45d221f40bb1866d7c87`; user `146c9bcb1c6b1ed88cee37f21201b0b08129a6dbc139ef20672d4b2237a2c089`; user-group `469edc18d2c9312059c3bc91823d818f369f1cca5801b254f48777f1dc78db60`; book-open `3917194a5c71c27631f8abc49610e3b9d5bb5ff0a7b6341f5a75b6e2a3ef1478`          | Nessuna (maschere CSS della rotaia e del dock dell'Inizio)                                                                                                           |
| `directions/alchemy/icons.mjs`                                                                                             | npm `lucide-static@1.49.0`, `icons/` (tarball sha256 `c8c9d5dcbc50f388afea623ce2bcbef5788eb0b2d084081aa52d6adaae4ebba3`); `@fortawesome/fontawesome-free@7.3.1`, `svgs/solid/dice-d20.svg` (generato da `d20-blueprint-evidence/2026-09-30/visual-01/probe-alchemy/gen-icons2.py`) | Lucide: ISC (glifi derivati da Feather: MIT); Font Awesome: icone CC BY 4.0                                           | `f769b5ee72e2172d0b652277a81ec0f1ae745f6b8de68f13a8c421bd4a657c70`                                                                                                                                                                                                                                                      | Lucide: elementi copiati, spessore 1,5 invece di 2; d20: solo il viewBox                                                                                             |
| Segno di spunta delle caselle (dentro `direction.css`, immagine SVG in linea)                                              | Lucide 1.49.0 «check» (`M20 6 9 17l-5-5`)                                                                                                                                                                                                                                          | ISC                                                                                                                   | —                                                                                                                                                                                                                                                                                                                       | Tratto bianco, spessore 3                                                                                                                                            |
| `assets/fonts/lexend/lexend-latin-wght-normal.woff2` (39 680 B), `lexend-latin-ext-wght-normal.woff2` (34 476 B)           | npm `@fontsource-variable/lexend@5.3.0`, `files/` (asse wght 100–900)                                                                                                                                                                                                              | SIL Open Font License 1.1, © 2018 The Lexend Project Authors (<https://github.com/googlefonts/lexend>)                | latin `b7e7538f59bff1812841d7627f8e49e70fe86438f9f7b397a028c0d05301c874`; latin-ext `b5d815d42066da25e5894bdfe47a415e1f79ef436486e3f843b475806d2e613c`                                                                                                                                                                  | Nessuna                                                                                                                                                              |
| `assets/fonts/lexend/OFL.txt`                                                                                              | `google/fonts` @ `9710da1eacb3be272583c3224dcb70f9da6eadbb`, `ofl/lexend/OFL.txt`                                                                                                                                                                                                  | Testo della OFL 1.1                                                                                                   | `5da8505887d0fa7fe963445fd58852707fda34adfeb65af25c99d152bab285bd`                                                                                                                                                                                                                                                      | Nessuna                                                                                                                                                              |
| `assets/fonts/unbounded/unbounded-latin-wght-normal.woff2` (50 904 B), `unbounded-latin-ext-wght-normal.woff2` (118 348 B) | npm `@fontsource-variable/unbounded@5.3.0`, `files/` (asse wght 200–900)                                                                                                                                                                                                           | SIL Open Font License 1.1, © 2022 The Unbounded Project Authors (<https://github.com/googlefonts/unbounded>)          | latin `22f9b928aa3928a896340422b54d690fbb5875c30eae4c106f029c61f2289fd6`; latin-ext `845e1c9fe2e9a7bfbedfeb447fbeba4bc1b5ecd6246277910ccdaad35a7a532c`                                                                                                                                                                  | Nessuna                                                                                                                                                              |
| `assets/fonts/unbounded/OFL.txt`                                                                                           | `google/fonts` @ `9710da1eacb3be272583c3224dcb70f9da6eadbb`, `ofl/unbounded/OFL.txt`                                                                                                                                                                                               | Testo della OFL 1.1                                                                                                   | `31e5d4e83955e7103c34570dd49b0570ef490800bd65b42923c0dd02445263b3`                                                                                                                                                                                                                                                      | Nessuna                                                                                                                                                              |

Lexend e Unbounded sono nuovi e li usa solo questa opzione. Il browser scarica il file latin-ext
solo per i caratteri fuori dall'alfabeto latino di base. I file dei caratteri e la riga di questa
opzione sono elencati in `assets/ATTRIBUTION.md`. Mancano le righe in `assets/PROVENANCE.json`, che
è fuori dai file riservati a questa opzione: le deve aggiungere il coordinatore.

**Righe di attribuzione**

- Icone del gioco e della pillola della scheda: Lucide 1.49.0, © 2026 Lucide Icons and Contributors (<https://lucide.dev>),
  licenza ISC; parte dei glifi deriva da Feather (MIT). Modificato solo lo spessore del tratto.
- Icone della rotaia e del dock dell'Inizio e glifo d20: Font Awesome Free 7.3.1
  di Fonticons, Inc. (<https://fontawesome.com>), licenza CC BY 4.0
  (<https://creativecommons.org/licenses/by/4.0/>). Modificato solo il viewBox del d20.
- Carattere Lexend © 2018 The Lexend Project Authors, SIL Open Font License 1.1.
- Carattere Unbounded © 2022 The Unbounded Project Authors, SIL Open Font License 1.1.
- Illustrazione «featured-hearth»: opera originale dell'owner.
- Ritratti e mappa d'esempio: comuni a tutte le opzioni (`directions/sample.css`, `assets/ATTRIBUTION.md`).
- Nulla di Alchemy (pixel, immagini, cornici, dadi, logo, glifi, caratteri Nominee) è nel progetto.

**Icona per icona** (nome nell'app → glifo)

| Nome nell'app                                                            | Glifo                                                                                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| home, person, campaign, book, search, note, bell, settings               | Lucide house, user, users, book-open, search, file-text, bell, settings                                                      |
| arrow, play, plus, undo, map, move, sword, check, close                  | Lucide arrow-left, play, plus, undo-2, map, move, zap, check, x                                                              |
| menu, eye, bag, flag, clock, help, pen, shape, ruler, shield             | Lucide menu, eye, backpack, flag, clock, circle-question-mark, pencil, shapes, ruler, shield                                 |
| panel, chat, scroll, cards, swords, coins, image, grid, fog, light, wall | Lucide panel-right, message-circle, scroll-text, layers, swords, coins, image, layout-grid, cloud-fog, lightbulb, brick-wall |
| dice (il FAB)                                                            | Font Awesome dice-d20 (pieno)                                                                                                |
| rotaia e dock dell'Inizio (solo maschere CSS)                            | Font Awesome house, user, user-group, book-open (pieni)                                                                      |
| pillola esterna della scheda (solo maschere CSS)                         | Lucide x, eye, share-2, pencil (a filo 1,5)                                                                                  |

## Verifiche (01/10/2026, dopo il sesto giro)

- Orari: l'orologio della macchina (il giro è finito dopo la mezzanotte, il 02/10/2026).
- Schermate di `round1/alchemy/` rifatte tutte (15 più il foglio di contatto, 05:29–05:31) dopo
  l'ultima modifica del foglio di stile (05:23:49; marchio e icone invariati), `manifest.json`
  tutte «ok», nessuna in `_failed/`; aperte una per una, con il foglio di contatto. Copia delle
  schermate di prima: `polish6-alchemy/r5/round1-before/`. Coppie 01–12 rifatte (05:34–05:39),
  tutte leggibili (`magick identify`), 01 e 07 aperte.
- Garanzie (sonda `polish6-alchemy/r5/guard.cjs`, dopo l'ultima modifica): a 390 nessuno
  scorrimento orizzontale su Inizio, Scheda (Azioni, Magie, Inventario) e Tavolo (giocatore, DM,
  esplorazione); testata del Tavolo su una riga (64 px, ogni pezzo alla stessa altezza, l'ultimo
  finisce a 374); «Termina turno», «Annulla ultima modifica» e «Annulla» visibili e toccabili;
  «Entra al Tavolo» finisce a 654 px. Barra delle azioni a 1440 × 900 alta 108 px in
  combattimento (giocatore e DM) e in esplorazione (`r5/dock-final/`).
- Larghezze intermedie: riga di «Il tuo personaggio» a 1440, 1366, 1280, 1101 e 390 (sopra);
  colonna «Novità» a 1440 × 900, 1366 × 768, 1280 × 800, 1101 × 800; linguette del telefono a 360,
  390 e 412.
- Test `tests/visual01-directions.test.mjs`: 13 su 13. Prettier: file conformi.
- Prove: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/polish6-alchemy/r5/`.
- Ricontrollo a parte (02/10/2026, 05:56–06:05, nessuna modifica al foglio di stile, quindi
  schermate, coppie e audit restano quelli sopra): le sette voci rimisurate dal vivo, con le
  stesse cifre (colonna «Novità» 809 su 794 a 1440 × 900, 857 su 662 a 1366 × 768, 885 su 694 a
  1280 × 800, sfuma e in fondo mostra «Novità precedenti (4)»; colonna del nome 202 · 182 · 159
  · 112 · 192 px, sottotitolo su una riga; barra in esplorazione 40 · 40 · 48 a distanze 12, alta
  108; filtri a 8; pillola → comando discreto 32–33 px; monete su una riga a 1440 e a 390);
  garanzie a 390 (Inizio e Tavolo giocatore, DM, esplorazione: nessuno scorrimento orizzontale,
  testata su una riga da 64 px, «Termina turno», «Annulla ultima modifica» e «Annulla» toccabili,
  «Entra al Tavolo» fino a 654 px); anello del fuoco 3 px pieno su sette comandi di Inizio,
  Scheda e Tavolo; Scheda e Inizio interi sotto la piega e campionario a 1440 e 390 riaperti;
  0 regole senza prefisso. Prove in `polish6-alchemy/rerun/`.

## Verifiche (01/10/2026, dopo i dettagli)

- Schermate di `round1/alchemy/` rifatte tutte (15 e il foglio di contatto, 19:58:32–19:59:15)
  dopo l'ultima modifica del foglio di stile (19:57:20; marchio 19:50:59), `manifest.json` tutte
  «ok», nessuna in `_failed/`; aperte una per una, con il foglio di contatto. Coppie 01–12 rifatte
  alle 19:59. Copia delle schermate precedenti: `fix-alchemy/before/round1/`.
- Garanzie (sonda `fix-alchemy/mods/guard.js`, `out/guard-final2/`, dopo l'ultima modifica): barra
  delle azioni a 1440 × 900 alta 108 px per giocatore e DM, in combattimento e in esplorazione;
  testata del Tavolo su una riga (64 px a 1440 e a 390); «Termina turno», «Annulla ultima
  modifica» e «Annulla» visibili e toccabili a 390, anche per il DM; nessuno scorrimento
  orizzontale a 390 su Inizio, Scheda (Azioni, Magie, Inventario), Tavolo, finestra e menu della
  pedina; «Entra al Tavolo» a 390 finisce a 654 px. Fuoco a 1440: anello da 3 px intero sulle
  caselle (dentro), sui pulsanti della sessione e sugli strumenti (fuori).
- Marchio (sonda `mods/brand.js`): all'Inizio dado, rotaia e profilo centrati a 40 px; centro del
  dado e delle maiuscole 83 e 83; al Tavolo 75 e 75. Campionario «Marchio» e «Pulsanti»:
  `fix-alchemy/specimen/`. Il «20» dentro la faccia: 3,3 unità dal bordo, centrato a 49,9.
- Larghezze intermedie: carte dell'Inizio uguali a 1280 (325 px) e 1101 (278); testata della
  Scheda su una riga a 1024 e 1440, in due colonne a 900, 800 e 390. (Corretto nel sesto giro: qui
  c'era anche «nessuna riga schiacciata», ma tra 1280 e 1439 px la colonna del nome di «Il tuo
  personaggio» era larga 50 px e «Maga · Livello 3» andava a capo.)
- Regole del file: 0 senza prefisso (`notes/prefix-audit.js`), colori sotto la guardia del tema
  chiaro, nessun `!important`, `text-transform` o testo in `content`; l'unico `@keyframes`
  (`al-scroll-fade`) è un'animazione guidata dallo scorrimento, senza tempo, che con il movimento
  ridotto lascia la sfumatura ferma alla fine.
- Test `tests/visual01-directions.test.mjs`: 13 su 13. Prettier: file conformi.
- Prove: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/fix-alchemy/` (`probe.js`
  e `mods/` per le sonde, `out/` per le misure prima e dopo, `crops/`, `review1/`, `specimen/`,
  `audit-before*`, `audit-after.*`, `before/` con i file e le schermate di prima, `numeral*.js`).

## Verifiche (01/10/2026, dopo il quinto giro)

- Schermate di `round1/alchemy/` rifatte tutte (15 più il foglio di contatto, 16:50:04–16:50:34)
  dopo l'ultima modifica del foglio di stile (16:49:51), `manifest.json` tutte «ok», nessuna in
  `_failed/`; aperte una per una, con il foglio di contatto. Coppie 01–12 rifatte alle 16:51.
  Copia delle schermate precedenti: `probe-alchemy/round5/before-round1/`.
- Barra delle azioni (sonda `probe-alchemy/round5/hotbar2.js`, `out/hotbar2-final.json`, dopo
  l'ultima modifica): 108 px in combattimento (turno di Livia), fuori turno (turno della
  Sentinella) e in esplorazione, per giocatore e DM, a 1440 × 900, 1366 × 768 (fondo a 768),
  1280 × 800 e 1024 × 768, nella pagina «Azioni» e in «Barra rapida»: 48 misure, tutte 108; nessuno
  scorrimento orizzontale.
- Garanzie (sonda `probe-alchemy/round5/guard.js`, `guard/alchemy/guard.json`): testata del
  Tavolo a 390 su una riga da 64 px (1440: 72). «Termina turno» (233–382 a quota 732), «Annulla
  ultima modifica» e «Annulla» visibili e in cima a 390, anche per il DM; a 1440 «Termina turno»
  in cima. Nessuno scorrimento orizzontale a 390. «Entra al Tavolo» a 390 finisce a 654 px. Dock a
  390: i 4 pulsanti liberi, la fascia senza tocchi. Strumenti del DM a 390 in cima alla pagina:
  ultimo a 624, barra a 631 (resta «Pianifica percorso» sotto la pedina di turno, come oggi).
  A 390 la barra fissa resta alta 149 px, come nel quarto giro.
- Interruttori, «Cosciente», fuoco e interlinee (`probe-alchemy/round5/checks.js`,
  `out/checks-final.json`): tre tracce da 40 × 24 con pomello da 18, distanza 12; «Cosciente»
  bianco a 14 px nella Scheda e nel pannello; anello dei punti ferita 3 px; interlinee calcolate
  20, 16 e 36 px.
- Regole del file: tutte con il prefisso (`notes/prefix-audit.js`: 0 senza prefisso) e la guardia
  del tema scuro; 0 colori senza la guardia del tema chiaro, nessun token di contrasto senza la
  guardia del contrasto alto, nessun `--dur-*`; nessun `!important`, `text-transform` o testo in
  `content`.
- Contrasto: l'audit dei valori dà 0 casi su 1155 testi (sezione «Coerenza (I-250)»).
- Test `tests/visual01-directions.test.mjs`: 7 su 7 superati. Prettier: file conformi.
- Prove: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-alchemy/round5/`
  (`h.js` e le sonde `hotbar.js`, `hotbar2.js`, `hb1024.js`, `qbtree.js`, `checks.js`,
  `swlabels.js`, `recup.js`, `recup2.js`, `drawcover.js`, `guard.js`, `pairs.py`, `bystyle.py`;
  `out/` per misure e ritagli, `full/` per Inizio e Scheda interi, `specimen/` per il campionario,
  `audit-before.md` e `audit-after.md`, `direction.before-round5.css`, `SOURCES.before-round5.md`).

## Verifiche (01/10/2026, dopo il quarto giro)

- Schermate di `round1/alchemy/` rifatte tutte (15 più il foglio di contatto, 16:01–16:02) dopo
  l'ultima modifica del foglio di stile (15:58:52), `manifest.json` tutte «ok», nessuna in
  `_failed/`; aperte una per una, con il foglio di contatto. Coppie 01–12 rifatte alle 16:02–16:03.
  Copia delle schermate precedenti: `probe-alchemy/round4/before-round1/`.
- Garanzie (sonda `probe-alchemy/round4/guard.js`, `guard/alchemy/guard.json`, dopo l'ultima
  modifica): barra delle azioni a 1440 × 900 alta 110 px per giocatore e DM, in esplorazione, in
  combattimento e fuori turno, anche a 1366 × 768 (fondo a 768) e 1280 (`out/hotbar-final.txt`);
  pagina «Barra rapida» 112 px. Testata del Tavolo a 390 su una riga da 64 px in ogni stato (1440:
  72). «Termina turno» (233–382 a quota 732), «Annulla ultima modifica» e «Annulla» visibili e in
  cima a 390, anche per il DM. Nessuno scorrimento orizzontale a 390 su Inizio, Scheda (Azioni,
  Magie, Inventario), Tavolo, Campagne e Biblioteca (`out/overflow390-final.txt`). «Entra al
  Tavolo» a 390 finisce a 654 px. Dock a 390: i 4 pulsanti liberi, la fascia senza tocchi. Fila
  delle linguette della Scheda a 390 a 680–729 (la fascia parte a 752). Strumenti del DM a 390 in
  cima alla pagina: ultimo a 624, barra a 631; «▾ Riduci» libero (`out/dm390-final.txt`); fondo del
  pannello sopra la pillola delle risorse (`out/legend-final.txt`).
- Regole del file: tutte con il prefisso (`notes/prefix-audit.js`: 0 senza prefisso) e la guardia
  del tema scuro, 0 colori senza la guardia del tema chiaro, nessun token di contrasto senza la
  guardia del contrasto alto, nessun `--dur-*`; nessun `!important`, `text-transform` o testo in
  `content` (solo nei commenti).
- Contrasto: l'audit dei valori dà 0 casi su 1155 testi (sezione «Coerenza (I-250)»).
- Test `tests/visual01-directions.test.mjs`: 7 su 7 superati. Prettier: file conformi.
- Prove: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-alchemy/round4/`
  (`h.js`, `run.js` e le sonde `hotbar.js`, `qb.js`, `dm390.js`, `draw390.js`, `legend.js`,
  `overflow390.js`; `out/` per misure e ritagli, `cand*.css` per le prove iniettate prima di
  scrivere le regole, `full/` per Inizio e Scheda interi, `specimen/` per il campionario,
  `audit-before.md` e `audit-after.md`, `direction.before-round4.css`, `SOURCES.before-round4.md`).

## Verifiche (01/10/2026, dopo il terzo giro)

- Schermate di `round1/alchemy/` rifatte tutte (15 più il foglio di contatto) dopo l'ultima
  modifica del foglio di stile (14:26:24; schermate 14:27, `manifest.json` tutte «ok»), e aperte
  una per una; coppie 01–12 rifatte alle 14:31. Copia delle schermate precedenti:
  `probe-alchemy/round3/before-round1/`.
- Garanzie (sonda `probe-alchemy/round3/guard.js` sugli stati del kit, `guard/guard-final.txt`):
  barra delle azioni a 1440 × 900 alta 110 px per giocatore e DM, in esplorazione e in
  combattimento (prima 126 in esplorazione); a 1366 × 768 finisce a 768. Testata del Tavolo a 390
  su una riga da 64 px in ogni stato (1440: 72). «Termina turno» (233–382 a quota 732), «Annulla
  ultima modifica» e «Annulla» visibili e in cima a 390, anche per il DM. Nessuno scorrimento
  orizzontale a 390 su Inizio, Scheda (Azioni, Magie, Inventario), Tavolo e finestra; nessun
  contenitore più largo del suo riquadro oltre alle file che scorrono di proposito (linguette della
  Scheda e del Tavolo, caselle della barra), come in «Attuale». «Entra al Tavolo» a 390 tra 614 e
  654 px. Dock a 390: i 4 pulsanti liberi, la fascia senza tocchi. Strumenti del DM a 390 in cima
  alla pagina: ultimo a 624, barra a 631.
- Fuoco: anello pieno da 3 px sulle linguette della barra, le pillole e gli oggetti del pannello
  «Creatura», i comandi della scena, «Menu di Livia» e il dock (`out/focus.txt`).
- Regole del file: 676 regole, 690 selettori, tutti con il prefisso e la guardia del tema scuro
  (`notes/prefix-audit.js`: 0 senza prefisso); nessun `!important`, `text-transform` o testo in
  `content`.
- Contrasto: l'audit dei valori dà 0 casi su 1155 testi (sezione «Coerenza (I-250)»).
- Test `tests/visual01-directions.test.mjs`: 7 su 7 superati. Prettier: file conformi.
- Prove: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-alchemy/round3/`
  (`guard.js` e `guard/`, `scripts/` e `out/` per le misure e i ritagli, `full/` per Inizio e Scheda
  interi, `specimen-mid/` e `specimen-after/` per il campionario, `audit-before.md` e
  `audit-after.md`, `direction.before-round3.css`).

## Verifiche del secondo giro (01/10/2026)

- Schermate di `round1/alchemy/` rifatte tutte (16 più il foglio di contatto) dopo l'ultima
  modifica del foglio di stile (12:10:17), e aperte una per una; coppie 01–12 rifatte.
- Testata del Tavolo a 390: una riga da 64 px in combattimento, esplorazione e vista del DM (prima
  124 px su due righe; «Attuale» 63). A 1440: una riga da 72 px. Striscia della dimostrazione a
  390: 96 px, come in ogni opzione.
- Barra delle azioni a 1440 × 900: 110 px (limite 120). Nessuno scorrimento orizzontale a 390 su
  Inizio, Scheda, Magie, Tavolo e finestra. «Termina turno» (235–382), «Annulla ultima modifica»
  (184–224) e «Annulla» (140–180) si vedono e si toccano a 390, alla quota 732, anche per il DM.
  «Entra al Tavolo» a 390 sta tra 614 e 654 px (deve stare nei primi 844).
- Tavolo a 390, prova `elementFromPoint` al centro di ogni comando: i 4 pulsanti dello zoom
  (576–616) e i 3 ritratti del gruppo sono liberi per il giocatore e per il DM; la barra fissa
  parte a 631. Percorso «Strumenti del DM» sul telefono (b62, punto 3): 5 strumenti tra 326 e 558,
  tutti liberi, sopra la barra.
- Bersagli: i soli sotto i 40 px sono le caselle da 20 px dentro etichette alte 40 (il bersaglio è
  l'etichetta), come oggi. Anello del fuoco: 3 px pieno su fine turno, FAB, strumento della mappa,
  linguetta della rotaia, annulla, «Entra al Tavolo», dock, linguetta e comando principale della
  Scheda, a 390.
- Regole del file (css-tree): 640 regole, 654 selettori, tutti con il prefisso e la guardia del
  tema scuro; nessun `!important`, `text-transform` o testo in `content`.
- Contrasto: l'audit dei valori dà 0 casi su 1155 testi (sezione «Coerenza (I-250)»).
- Test `tests/visual01-directions.test.mjs`: 7 su 7 superati. Prettier: file conformi.
- Prove: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/probe-alchemy/round2/`
  (`probe.js` e `out/` per le misure, `focus/`, `specimen-before/` e `specimen-after/` per il
  campionario dei componenti, `audit-before.md` e `audit-after.md`).
