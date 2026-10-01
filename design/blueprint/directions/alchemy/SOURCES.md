# Opzione 8 · Alchemy RPG — da dove viene ogni scelta

Scelta 1 — Direzione, primo giro (I-248), 01/10/2026, resa coerente in ogni misura (I-250); giro
di correzioni dello stesso giorno sulle critiche A1–A8 (sezione «Risposte alla critica»), secondo
e terzo giro di rifinitura sui punti della verifica indipendente (sezioni «Risposte alla verifica»
e «Coerenza (I-250)»). Tema scuro, a 1440 × 900 e 390 × 844. Le schermate sono in
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
| Finestre: fondo scuro al 60 %, cornice di vetro di 6 px, corpo #101217, immagine in testa che sfuma nel corpo, titolo in nero esteso da 30 px, riga d'accento sotto, pulsante di chiusura rotondo fuori dal bordo destro | Finestra delle note di versione                                | [O] D1 `alchemy-dialog-release-notes-1440.png` (<https://app.alchemyrpg.com/?item=6aadcfb79acb983d9577897d>)        |
| Finestre sul telefono: foglio a tutto schermo, titolo centrato sull'immagine, chiusura rotonda in alto a destra, pulsanti a tutta larghezza uno sotto l'altro                                                            | Finestra sul telefono                                          | [O] P5 `alchemy-phone-dialog-release-notes-390.png`                                                                 |
| Menu: vetro scuro, raggio 14, righe da 40 px raggio 8 che si accendono al 10 %, icone al 50 %                                                                                                                            | Menu della pedina                                              | [O] T4; [C] stili delle voci di menu                                                                                |
| Righe vuote («Nessuna azione personalizzata») come riga di vetro, non come riquadro tratteggiato                                                                                                                         | Liste vuote di Alchemy                                         | [O] T5                                                                                                              |
| Icone nel gioco e nei pulsanti di servizio a filo sottile (spessore 1,5); icone della rotaia e del dock dell'Inizio piene                                                                                                | Rotaia degli strumenti (a filo) e rotaia della Home (piena)    | [O] T1, T2, H1; `facts.md` «Iconography»                                                                            |
| Marchio d20 e scritta «d20 Studio» come oggi, chiusi in una piccola pillola di vetro                                                                                                                                     | Pillola del logo in alto a sinistra                            | [O] H1; code-map §0.5 (il marchio non si tocca)                                                                     |

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

| Elemento                                                                                                                                                                             | Prodotto copiato                               | Fonte                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------- |
| La scheda come finestra alta al centro, sopra il tavolo oscurato (la mappa d'esempio al 60 % di nero)                                                                                | Finestra del personaggio aperta sul tavolo     | [O] S1 `alchemy-sheet-5e-modal-portrait-header.png`               |
| Cornice di vetro di 6 px, corpo #101217                                                                                                                                              | Cornice delle finestre                         | [O] D1 (#18191C, riflesso #303133)                                |
| Il ritratto (è il pulsante «Aspetto») riempie tutta la larghezza della testata, ritagliato, e sfuma nel nero; il nome sale nella sfumatura                                           | Testata con ritratto                           | [O] S1                                                            |
| Nome grande in nero esteso, sotto una riga d'accento (classe e livello)                                                                                                              | «KALINA QUILL» + «LEVEL 5 KINDLED CORVUM BARD» | [O] S1                                                            |
| Riga d'accento di 1 px rientrata di 24 px                                                                                                                                            | Divisore della finestra                        | [O] S1, D1                                                        |
| Pillola esterna di pulsanti rotondi a destra: chiudi (torna ai personaggi), condividi, gestisci                                                                                      | Pillola chiudi / modifica / apri               | [O] S1, D1                                                        |
| La visibilità («Solo campagna») come pillola di vetro con l'occhio e le sue parole, in alto a destra sull'immagine; la matita del ritratto in alto a sinistra                        | Interruttore di visibilità della scheda        | [O] S10 `alchemy-sheet-gold-edit-character-tab.png`               |
| Caratteristiche in sei colonne e valori principali in fila, senza riquadri, tutti allineati in alto: etichetta in maiuscoletto bianco, valori in testo semplice («10 +0»)            | Blocco statistiche 5e                          | [O] S1, S2 `alchemy-sheet-5e-modal-stats-tab.png`                 |
| Linguette corte e centrate; «Tutte» nella stessa riga da 48 px; la fila sfuma a destra invece di tagliare una linguetta                                                              | STATS / SPELLS / DESCRIPTION                   | [O] S1                                                            |
| Titoli di sezione nella lettera larga con una riga d'accento di 1 px sempre a tutta larghezza, anche quando il titolo divide la riga con dei comandi; 24 px sopra i titoli di gruppo | «Actions»                                      | [O] S2                                                            |
| Azioni, magie e oggetti come righe di vetro (raggio 8, riflesso in alto)                                                                                                             | Righe delle azioni del tavolo                  | [O] T5 `alchemy-table-5e-player-bar-actions-panel-playing-as.png` |
| Magie e Inventario: riquadri riassuntivi di vetro in una griglia che non stringe mai le etichette (almeno 128 px per le magie, 240 per l'inventario), valori in Lexend 600 da 18     | Righe AC / HP / SPEED e blocco del PNG         | [O] S2, S3 `alchemy-sheet-5e-npc-statblock-modal.webp`            |
| Pallini rotondi per slot e sintonia; i collegamenti «Perché?», «Regola d'ingombro…», «Visualizzazione…» nel colore d'accento chiaro                                                  | Tracciatori a pallini del layout Lumen         | [O] T16 `alchemy-table-lumen-daggerheart-story-dice-bar.webp`     |
| Telefono: la finestra diventa un foglio a tutto schermo; i pulsanti rotondi e la pillola della visibilità stanno in fila in alto                                                     | Finestra sul telefono                          | [O] P5 `alchemy-phone-dialog-release-notes-390.png`               |

### Tavolo

| Elemento                                                                                                                                                                         | Prodotto copiato                                                           | Fonte                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| La scena dietro tutto: la mappa dipinta, sfocata e scurita, riempie lo schermo intorno alla mappa viva (bordo sinistro, fascia sotto il titolo, testata); vignettatura sui bordi | Modalità «story» a tutto schermo                                           | [O] T1; `facts.md` §1 tratto 1                                                                      |
| Testata senza barra: solo pillole di vetro (logo, App, Torna alla campagna, servizi)                                                                                             | Pillola del logo del layout Lumen                                          | [O] T16 `alchemy-table-lumen-daggerheart-story-dice-bar.webp`                                       |
| Titolo della scena in alto al centro, sopra la mappa; sotto, in piccolo, lo stato                                                                                                | «River's Edge Tavern / ALCHEMY DISTRICT»                                   | [O] T1                                                                                              |
| Ordine dei turni: ritratti rotondi da 44 px sotto il titolo, quello di turno da 56 con anello d'accento e alone; nemici con anello rosso tratteggiato; nomi sempre interi        | Lista dell'incontro (resa in fila, come chiede il piano in `facts.md`)     | [C] pannello dell'incontro; [O] T19 `alchemy-table-lumen-alien-tactical-grid-turn-order-panel.webp` |
| Strumenti della mappa come colonna di pulsanti rotondi di vetro accanto alla colonna destra, icone a filo; lo strumento attivo è un disco bianco                                 | Rotaia degli strumenti accanto al pannello del gruppo                      | [O] T1, T2 `alchemy-table-5e-tactical-map-tokens-tool-rail.png`                                     |
| Comandi della scena (DM: incontro, scene, riposi, tempo) in una colonna di pillole in alto a sinistra; sul telefono in due file di pillole uguali                                | Colonne d'angolo                                                           | [O] T1, T7                                                                                          |
| Colonna destra di vetro traslucido con sotto-linguette a barretta corta; ritratto rotondo con anello, nome nella lettera larga                                                   | Pannello del gruppo (PARTY / NPCS)                                         | [O] T1                                                                                              |
| Ritratti del gruppo rotondi, quello scelto con anello d'accento e alone                                                                                                          | Avatar del gruppo                                                          | [O] T1                                                                                              |
| Barra del giocatore: ritratto con anello d'accento accanto a una barra divisa con i punti ferita in verde; lo stato del turno sotto, su una riga                                 | Player bar (XP / HP)                                                       | [O] T5 (#225A47)                                                                                    |
| Barra delle azioni come una pillola di vetro con le caselle in pillole più piccole; risorse e dadi in pillole di vetro sopra                                                     | Barra dei dadi del layout Lumen                                            | [O] T16                                                                                             |
| Il pulsante dei dadi come FAB: disco bianco con un anello bianco disegnato dentro il pulsante (48 px sul computer, 40 sul telefono) e il glifo d20 nel colore d'accento          | Trio in basso (impostazioni, FAB, microfono)                               | [O] T1, [C] `size-a12`                                                                              |
| «Termina turno» come pillola bianca con testo d'accento in maiuscoletto esteso, sulla stessa riga del FAB                                                                        | «✓ End Turn» e il piano della barra in `facts.md`                          | [C] notifiche di turno; `facts.md` §1                                                               |
| Avvisi della sessione («Sessione non avviata») in vetro scuro, filetto giallo a sinistra, pulsanti a pillola su una riga loro                                                    | Avvisi e popover di Alchemy                                                | [O] T4; [C] `popoverBackground`                                                                     |
| Menu della pedina in vetro scuro                                                                                                                                                 | Menu contestuale della pedina                                              | [O] T4                                                                                              |
| Griglia sottile chiara, pedine rotonde con anello sottile                                                                                                                        | Mappa tattica                                                              | [O] T2                                                                                              |
| Telefono: barra e linguette in una lastra opaca; le risorse del turno in una pillola di vetro appena sopra la barra; zoom in una fila di vetro a destra                          | Estensione nella stessa grammatica (Alchemy non ha il tavolo sul telefono) | `facts.md` §5 piano per il telefono; [O] T16 (pallini sopra la barra dei dadi)                      |

## Coppie per il confronto

Le coppie già montate sono in `round1/alchemy/_pairs/` (01–12), rifatte il 01/10/2026 dopo il
terzo giro dalle schermate nuove (script `probe-alchemy/round3/pairs.py` tra le prove). Ogni
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
   sulla stessa riga; sotto, Annulla e Annulla ultima modifica. La barra resta alta 110 px (limite
   120).
5. **Ritratto nella barra.** Il ritratto nella barra del giocatore si vede da 1280 px; oggi si
   vede da 1500. Le sette azioni di Livia stanno comunque su due righe.
6. **Misure dei comandi.** Tutti i comandi sono alti almeno 40 px: le pillole di Alchemy da 32 e i
   pulsanti rotondi da 36 crescono. Il pulsante dei punti ferita nella barra diventa da 40 px
   (oggi è da 28). L'anello del FAB è disegnato dentro il pulsante, così non copre i vicini.
7. **Maiuscole.** Senza `text-transform` le maiuscole di Alchemy diventano maiuscoletto, solo dai
   passi da 14 e 16 px. Le righe con numeri («Maga · Livello 3», «Combattimento · Round 1»,
   «18/22») restano in minuscolo con la spaziatura, perché il maiuscoletto lascerebbe le cifre più
   grandi delle lettere. Le etichette dei gruppi nella barra («Armi», «Incantesimi») stanno nel
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
    pillola diventa una fila in alto, perché in basso c'è il dock. Lo stesso vale, sul telefono,
    per «App» e «Torna alla campagna» nella testata del Tavolo: diventano pulsanti rotondi da 40
    px come quelli dei servizi, così la testata resta su una riga sola (64 px; oggi 63).
12. **Due accenti.** L'oro vale per l'Inizio e la cornice dell'app, il rosso 5e per il Tavolo e la
    Scheda. Alchemy fa lo stesso: ogni universo ricolora tutto. Dove Alchemy scrive testo
    nell'accento, usiamo una tinta più chiara (#C4B998, #F2676C) per il contrasto AA. Il rosso dei
    nemici è il rosso di Alchemy per il pericolo, con anello tratteggiato.
13. **Caratteri.** Nominee e Nominee Extended sono commerciali. Li sostituiscono Lexend e Unbounded
    (OFL), con due soli pesi ciascuno. Il carattere stretto del tema 5e (titoli delle scene e nomi)
    non è stato identificato e non è copiato: i titoli usano il carattere esteso del tema
    predefinito. Il marchio «d20 Studio» resta nel suo carattere di oggi (22 px), come per tutte le
    opzioni.
14. **Icone.** Le icone di Alchemy sono disegnate su misura e non hanno licenza. Nel gioco e nei
    pulsanti di servizio usiamo Lucide 1.49.0 a filo sottile (spessore 1,5), la serie aperta indicata
    in `facts.md`; anche l'opzione 2 usa Lucide (1.16.0, a filo pieno 2). Nella rotaia e nel dock
    dell'Inizio le icone sono piene (Font Awesome Free 7.3.1), come la rotaia della Home di Alchemy;
    il FAB tiene il d20 pieno. Restano a filo anche le icone dei servizi in testata.
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
    degli strumenti della mappa ha passi da 4 px (8 sul computer) e finisce sopra la barra.
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
    riga: 110 px in esplorazione e in combattimento, da 1024 a 1440 px di larghezza.
22. **Oggetti da usare.** Nel pannello «Creatura» gli oggetti («Bacchetta di dardi incantati 3/7»)
    sono cose, non comandi: righe nel carattere dell'interfaccia (Lexend 600 da 14), come le caselle
    degli oggetti nella barra delle azioni, con le cariche subito dopo il nome. Nelle maiuscole
    estese il nome andava su due righe in una pillola da 42 px.
23. **«Tiri e risultati» nella barra.** «Tiri e risultati» resta nel carattere dell'interfaccia
    come «Dadi» e «Digitali» accanto: è una frase della stessa targa, non un comando a sé.

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

## Licenze e attribuzioni

| File                                                                                                                       | Origine                                                                                                                                                                                                                                                                            | Licenza                                                                                                               | sha256                                                                                                                                                                                                                                                                                                         | Modifiche                                                                |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `directions/alchemy/assets/featured-hearth.webp` (1672 × 941, 81 854 B)                                                    | `~/Workspace/Codex/d20-studio-visual-assets/candidates/plates/home-hero.webp`, a sua volta `~/Workspace/d20-folio/public/assets/backgrounds/home-hero.webp` (d20 Folio, main `5b7f2a8b`); riga 35 di `candidates/MANIFEST.md` (SAFE)                                               | Opera originale dell'owner (gpt-image via ChatGPT; C2PA nel master `masters/d20-folio/images_d20folio/PROMPT_12.png`) | `b8d037660f1dfb2ba3234c675b637f67a597949221567cecadf8de1ac022adea`                                                                                                                                                                                                                                             | Nessuna (solo rinominato)                                                |
| `directions/alchemy/assets/icons/xmark.svg`, `eye.svg`, `pen.svg`, `share-nodes.svg`                                       | npm `@fortawesome/fontawesome-free@7.3.1`, `svgs/solid/`                                                                                                                                                                                                                           | Icone CC BY 4.0 (commento di licenza nel file)                                                                        | xmark `910f3ba41ec9797aafa46d4cc42fa665ca84a1f24dce09b038772dc65336143c`; eye `a94501d439bb6bce10285d77816865a73ca3704804e80093965ba6d95d35102d`; pen `d49ec1d364ad829b896316f3953c98eda7b8a554fd288a8999b6e62a15809aa0`; share-nodes `6cc0f96ce9ed0d0db725ba06ebaf7899aa7117a938aabcf3b91a7cfa32808866`       | Nessuna (usate come maschere CSS)                                        |
| `directions/alchemy/assets/icons/house.svg`, `user.svg`, `user-group.svg`, `book-open.svg`                                 | npm `@fortawesome/fontawesome-free@7.3.1`, `svgs/solid/`                                                                                                                                                                                                                           | Icone CC BY 4.0 (commento di licenza nel file)                                                                        | house `8b076b5846f917058aca54d8892168c9727aa2082e5d45d221f40bb1866d7c87`; user `146c9bcb1c6b1ed88cee37f21201b0b08129a6dbc139ef20672d4b2237a2c089`; user-group `469edc18d2c9312059c3bc91823d818f369f1cca5801b254f48777f1dc78db60`; book-open `3917194a5c71c27631f8abc49610e3b9d5bb5ff0a7b6341f5a75b6e2a3ef1478` | Nessuna (maschere CSS della rotaia e del dock dell'Inizio)               |
| `directions/alchemy/icons.mjs`                                                                                             | npm `lucide-static@1.49.0`, `icons/` (tarball sha256 `c8c9d5dcbc50f388afea623ce2bcbef5788eb0b2d084081aa52d6adaae4ebba3`); `@fortawesome/fontawesome-free@7.3.1`, `svgs/solid/dice-d20.svg` (generato da `d20-blueprint-evidence/2026-09-30/visual-01/probe-alchemy/gen-icons2.py`) | Lucide: ISC (glifi derivati da Feather: MIT); Font Awesome: icone CC BY 4.0                                           | `f769b5ee72e2172d0b652277a81ec0f1ae745f6b8de68f13a8c421bd4a657c70`                                                                                                                                                                                                                                             | Lucide: elementi copiati, spessore 1,5 invece di 2; d20: solo il viewBox |
| Segno di spunta delle caselle (dentro `direction.css`, immagine SVG in linea)                                              | Lucide 1.49.0 «check» (`M20 6 9 17l-5-5`)                                                                                                                                                                                                                                          | ISC                                                                                                                   | —                                                                                                                                                                                                                                                                                                              | Tratto bianco, spessore 3                                                |
| `assets/fonts/lexend/lexend-latin-wght-normal.woff2` (39 680 B), `lexend-latin-ext-wght-normal.woff2` (34 476 B)           | npm `@fontsource-variable/lexend@5.3.0`, `files/` (asse wght 100–900)                                                                                                                                                                                                              | SIL Open Font License 1.1, © 2018 The Lexend Project Authors (<https://github.com/googlefonts/lexend>)                | latin `b7e7538f59bff1812841d7627f8e49e70fe86438f9f7b397a028c0d05301c874`; latin-ext `b5d815d42066da25e5894bdfe47a415e1f79ef436486e3f843b475806d2e613c`                                                                                                                                                         | Nessuna                                                                  |
| `assets/fonts/lexend/OFL.txt`                                                                                              | `google/fonts` @ `9710da1eacb3be272583c3224dcb70f9da6eadbb`, `ofl/lexend/OFL.txt`                                                                                                                                                                                                  | Testo della OFL 1.1                                                                                                   | `5da8505887d0fa7fe963445fd58852707fda34adfeb65af25c99d152bab285bd`                                                                                                                                                                                                                                             | Nessuna                                                                  |
| `assets/fonts/unbounded/unbounded-latin-wght-normal.woff2` (50 904 B), `unbounded-latin-ext-wght-normal.woff2` (118 348 B) | npm `@fontsource-variable/unbounded@5.3.0`, `files/` (asse wght 200–900)                                                                                                                                                                                                           | SIL Open Font License 1.1, © 2022 The Unbounded Project Authors (<https://github.com/googlefonts/unbounded>)          | latin `22f9b928aa3928a896340422b54d690fbb5875c30eae4c106f029c61f2289fd6`; latin-ext `845e1c9fe2e9a7bfbedfeb447fbeba4bc1b5ecd6246277910ccdaad35a7a532c`                                                                                                                                                         | Nessuna                                                                  |
| `assets/fonts/unbounded/OFL.txt`                                                                                           | `google/fonts` @ `9710da1eacb3be272583c3224dcb70f9da6eadbb`, `ofl/unbounded/OFL.txt`                                                                                                                                                                                               | Testo della OFL 1.1                                                                                                   | `31e5d4e83955e7103c34570dd49b0570ef490800bd65b42923c0dd02445263b3`                                                                                                                                                                                                                                             | Nessuna                                                                  |

Lexend e Unbounded sono nuovi e li usa solo questa opzione. Il browser scarica il file latin-ext
solo per i caratteri fuori dall'alfabeto latino di base. I file dei caratteri e la riga di questa
opzione sono elencati in `assets/ATTRIBUTION.md`. Mancano le righe in `assets/PROVENANCE.json`, che
è fuori dai file riservati a questa opzione: le deve aggiungere il coordinatore.

**Righe di attribuzione**

- Icone del gioco: Lucide 1.49.0, © 2026 Lucide Icons and Contributors (<https://lucide.dev>),
  licenza ISC; parte dei glifi deriva da Feather (MIT). Modificato solo lo spessore del tratto.
- Icone della rotaia dell'Inizio, della pillola della scheda e glifo d20: Font Awesome Free 7.3.1
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
| pillola esterna della scheda (solo maschere CSS)                         | Font Awesome xmark, eye, share-nodes, pen (pieni)                                                                            |

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
