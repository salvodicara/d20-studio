# B35 — Tavolo: nebbia, luci e visione: prove

25/09/2026 (lavoro del 24–25/09) · worktree `d20-studio-interview-01` (branch
`codex/interview-01`) · sessione browser `d20-b35` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B35/` (fuori dal checkout).

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B35 (PR-22, PR-23, PR-24, PR-25, PR-26,
TV-29, TV-30, TV-31, TV-32, TV-33, TV-34, TV-35) e scelta C7 (memoria per giocatore di
default, condivisa come opzione della campagna). Righe di mercato lette: `dndbeyond.md`
(DDB-121), `vtt-light.md` (VTL-066, VTL-067, VTL-070, VTL-071, VTL-073, VTL-074, VTL-142,
VTL-144), `foundry.md` (FVT-075, FVT-077, FVT-101, FVT-121, FVT-159, FVT-160),
`roll20-fgu.md` (R20-093, R20-094, R20-095, R20-096, R20-120, R20-121, R20-122, R20-153,
R20-169). Confini: F-005 (visione individuale automatica **facoltativa**: il tavolo usa la
mappa anche senza prepararla; il DM conserva rivelazione manuale e correzioni) e F-013.

## File

Nuovi, tutti dell'area `fog-vision` (i primi cinque sono quelli della scheda):

- `design/blueprint/fog-vision.mjs` — modulo d'ingresso `register(registry)`: strumenti
  Nebbia, Barriere, Teletrasporta (DM); tre livelli della mappa; scheda «Visione» della barra
  laterale; due voci del menu della pedina; tre comandi; due gruppi di impostazioni; il
  seguito "aree esplorate" sull'evento `commit`.
- `design/blueprint/lighting-editor.mjs` — strumento Luci, barra HUD condivisa dagli
  strumenti, diagnostica delle luci del pannello.
- `design/blueprint/fog-vision.css` — solo classi `.fv-*`.
- `design/blueprint/tests/fog-vision.test.mjs` — 16 test (dominio e gestori).
- `design/blueprint/tests/lighting.test.mjs` — 7 test (luci, oscurità, strumento, diagnostica).
- `changes/interview-01/blueprint-checks/fog-vision-journey.js` — percorso nel browser.
- In più (nuovi, stesso prefisso): `design/blueprint/fog-vision-domain.mjs` (dominio puro:
  sezione di stato, nebbia, luci, sensi, visibilità, memoria, barriere, diagnostica) e
  `design/blueprint/fog-vision-seed.mjs` (la scena sintetica «La torre della lanterna» con la
  sua pianta WebP da 10 KB disegnata per il blueprint).

File condivisi toccati (solo aggiunte, firme ed esiti esistenti invariati):

- `design/blueprint/spatial.mjs` — previsto dalla scheda. `validateSceneGeometry` accetta il
  campo facoltativo `blockSide` ("left"/"right") e rifiuta altri valori; nuove esportazioni
  `wallSide`, `blocksFrom`, `visibilityPolygon(scene, origin, {channel})`;
  `isSegmentBlocked` rispetta `blockSide` **solo sul canale vista**. Muri senza `blockSide`
  (tutti quelli esistenti) si comportano come prima: le suite `spatial`, `spatial-combat`,
  `doors`, `spatial-editor` restano verdi (36/36) e `spatial-journey.js` passa.
- `design/blueprint/ui.mjs` — tre tracciati d'icona `fog`, `light`, `wall` (la barra della
  mappa disegna solo icone di `ui.mjs`), come B18 e B32.
- `design/blueprint/annotations.mjs` (B18) — un attributo `data-token-for="<actorId>"` sui due
  distintivi per pedina (quota e punto della nota) disegnati sopra la nebbia: senza, la quota
  «↑3 m» della Sentinella nascosta compariva sul nero. `annotations.test.mjs` (28/28) e
  `annotations-journey.js` passano. Convenzione proposta per ogni decorazione di pedina
  disegnata sopra l'ordine 68: `data-token-for`.
- `table-spatial.mjs` non è stato modificato: i comandi delle porte fuori vista si nascondono
  con lo stile del livello della nebbia (sotto).

Stato: `state.ext["fog-vision"]` (`undo: "snapshot"`), con `scenes[sceneId]` = `{fog[],
vision, phase, ambient, updateOnDrop, lights[]}`, `tokens[actorId]` (sensi impostati sulla
pedina), `memory[sceneId][actorId]` (aree esplorate, bitset in base64 su celle di 1/4 di
quadretto) e `positions` (ultima posizione registrata). Seme sintetico coerente con lo stato:
la scena **La torre della lanterna** (piano terra della torre dell'osservatorio, di notte:
ingresso con torcia a muro, magazzino buio con la lanterna spenta, scala con torcia; porta
del magazzino chiusa, porta della scala chiusa a chiave, grata = finestra, specchio
unidirezionale tra scala e ingresso) con le pedine di Livia, Doran, Mira, dell'Esploratore
(magazzino) e della Sentinella (scala). Viene aggiunta in fondo a `state.scenes` (come B21
aggiunge Iria), una sola volta: `scenes[0]` resta il cortile, che non ha visione né nebbia
(nessun cambiamento per gli altri percorsi). Livia ha scurovisione 18 m come impostazione
della pedina dell'esempio (la sua scheda d'esempio non indica una specie).
Impostazioni: campagna `fog-vision.shared-memory` e `fog-vision.shared-vision` (solo DM),
personale `fog-vision-view.controlled-on-top` (predefinito sì).

## Dove si trova (≤ 3 clic)

| Superficie                                                                                                                                                                                                                                                                                                                                                                                                                              | Percorso                                                                | Chi                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| Strumento **Nebbia** (Rivela/Copri, Pennello cerchio o quadrato per taglia di creatura, Poligono, Rettangolo, Alt inverte; Copri tutto, Rivela tutto; «Su»: nebbia della scena o aree esplorate di un personaggio; Anteprima giocatori; Annulla)                                                                                                                                                                                        | Tavolo → barra a sinistra → gruppo «Nebbia e visione» (occhio) → nuvola | DM                                               |
| Strumento **Luci** (tipo SRD da posare; luce selezionata: accendi/spegni, raggi, colore, direzione del cono, segue la pedina, elimina; trascina; clic destro accende/spegne; frecce + Invio, Canc)                                                                                                                                                                                                                                      | stesso gruppo → fiamma                                                  | DM                                               |
| Strumento **Barriere** (Muro, Finestra, Unidirezionale + Inverti lato, Illusoria, Invisibile; `[` `]`)                                                                                                                                                                                                                                                                                                                                  | stesso gruppo → mattoni                                                 | DM                                               |
| Strumento **Teletrasporta (DM)** (pedina → arrivo, anche oltre i muri; frecce + Invio; interruttore «Aggiorna la visione solo all'arrivo»)                                                                                                                                                                                                                                                                                              | gruppo «Strumenti del DM» (scudo)                                       | DM                                               |
| Scheda **Visione** della barra laterale: DM = stato, Nebbia, Visione e luce (visione dinamica, Giorno/Crepuscolo/Notte/Alba, momento successivo, aggiorna all'arrivo, memoria e visione condivise, pedine sopra l'oscurità), Vedi con la pedina, Diagnostica luci, Aree esplorate (Modifica, Azzera, Azzera tutte), Sensi delle pedine (Visione e luce…); giocatore = cosa vedono i suoi personaggi, luce portata, preferenza personale | Tavolo → icona occhio nella barra destra (1 clic)                       | tutti (proiezione per ruolo)                     |
| **Visione e luce…**, **Vedi con questa pedina**                                                                                                                                                                                                                                                                                                                                                                                         | clic destro / pressione lunga sulla pedina (menu B12)                   | DM; il giocatore legge e accende la propria luce |
| **Maiusc+V** (verifica della visione della pedina selezionata), «Anteprima giocatori», «Momento del giorno successivo»                                                                                                                                                                                                                                                                                                                  | tastiera / palette dei comandi (B23)                                    | DM                                               |
| La torre come scena attiva                                                                                                                                                                                                                                                                                                                                                                                                              | Tavolo → Scene → Altre azioni → Attiva al Tavolo                        | DM                                               |

## Capacità → prova

| Capacità (censimento)                                                                  | Percorso                                                              | Comandi e risultato                                                                                                                                                                                                                                                                                                                                                                                  | Regola / fonte                                                                                                                                         | Pattern adottato                                                                                                                                                     | Prova                                                                                                                                                        |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TV-30 nebbia manuale: copri tutto, rivela a poligono e a pennello, anteprima giocatore | Nebbia (cortile)                                                      | «Copri tutto» → 1 area; Rivela + Poligono, 4 clic + clic sul primo punto → stanza in alto a sinistra rivelata; Pennello «Media · 1,5 m» trascinato lungo il cortile → tratto densificato; il DM vede attraverso (tratteggio al 50%); «Anteprima giocatori» → goblin nascosti, Livia visibile; Annulla toglie il tratto (correzione nel registro); reload conserva 3 aree; il giocatore la vede opaca | Taglie SRD 5.2.1 (EN p. 14 / IT p. 16) per i pennelli                                                                                                  | Pennelli per taglia, Copri/Rivela tutto, poligono chiuso con clic o doppio clic (DDB-121); Rivela/Copri, Alt = taglia, anteprima (VTL-066/067); rettangolo (R20-096) | journey (1), `01-dm-fog-see-through.png`, `02-dm-player-preview.png`, `03-player-fog-opaque.png`; test «manual fog…», «fog tool handlers…»                   |
| PR-23 luci con raggio luminoso/fioco, colore, cono, accensione                         | Luci (torre)                                                          | Torcia a muro 6 + 6 m (sorgente mostrata «SRD 5.2.1 · IT p. 113»), Spegni → diagnostica «(1 accese)», Accendi; clic destro sulla maniglia spegne; da tastiera «Modifica» nella diagnostica seleziona la lanterna, frecce + Invio la spostano, Annulla la rimette                                                                                                                                     | Torcia EN p. 100 / IT p. 113; Lampada, Lanterna schermabile, Lanterna a lente (cono) EN p. 98 / IT p. 110; Cono EN p. 179 / IT p. 206                  | Luci Foundry (FVT-077: posa, raggi, angolo, colore, clic destro accende/spegne); preset Roll20 (R20-094); luce che segue la pedina (R20-121)                         | journey (2), `05-dm-torch-out.png`; test «a torch lights 6 m…», «bullseye lantern…», «a carried light follows its token…», «Lights tool…»                    |
| PR-24 oscurità magica come fonte                                                       | Luci → tipo «Oscurità (incantesimo) · 4,5 m» → clic sulla torcia      | la torcia risulta «Soppressa», la zona è oscurità magica: la scurovisione non la attraversa, la vista pura sì; eliminata                                                                                                                                                                                                                                                                             | Oscurità EN p. 122 / IT p. 170 («la luce non magica non può illuminarla»)                                                                              | Darkness source Foundry (FVT-077)                                                                                                                                    | journey (2), `06-dm-darkness-suppresses-torch.png`; test «magical darkness suppresses…»                                                                      |
| PR-25 luce ambientale e ciclo giorno/notte                                             | pannello Visione                                                      | Giorno → il velo della notte sfuma in 1,2 s (transizione a tempo verificata, poi opacità 0), «Passa al momento successivo» → Crepuscolo, Notte                                                                                                                                                                                                                                                       | Luce intensa/fioca/oscurità, crepuscolo e alba = luce fioca, notte = oscurità (EN p. 11 / IT p. 12)                                                    | Transizioni giorno/notte Foundry (FVT-159), preset ambientali FG (R20-121)                                                                                           | journey (2), `07-dm-day.png`; test «day and night cycle…»                                                                                                    |
| TV-31 visione dai muri con i sensi della scheda                                        | Visione → Vedi come Livia / Doran (porta del magazzino aperta dal DM) | Livia (scurovisione 18 m) vede l'Esploratore nel magazzino buio oltre la porta aperta, non la Sentinella oltre il muro; Doran (senza) non vede l'Esploratore                                                                                                                                                                                                                                         | Visione e luce EN p. 11 / IT p. 12; Scurovisione EN p. 180 / IT p. 215 (in grigio); specie EN pp. 84–86 / IT pp. 94–97; Accecato EN p. 177 / IT p. 202 | Visione dai sensi della scheda (R20-122), modalità di visione (FVT-121), visione per pedina (VTL-142)                                                                | journey (3), `08-as-livia-darkvision-open-door.png`, `09-as-doran-no-darkvision.png`; test «SRD vision…», «senses from the sheet…»                           |
| TV-32 memoria dell'esplorato per giocatore, modificabile e azzerabile                  | automatica; pannello → Aree esplorate                                 | dopo la visita Livia ricorda il magazzino, Doran no; il giocatore vede la memoria di Livia + Mira come mappa ricordata (disegno e muri in grigio, senza creature né segni del presente); il DM rivela il magazzino nella memoria di Doran con un rettangolo e azzera quella di Livia                                                                                                                 | —                                                                                                                                                      | Explorer mode (R20-095), persistenza con reset (VTL-142)                                                                                                             | journey (4), `10-player-explored-memory.png`; test «explored memory…», «the exploration follow-up…»                                                          |
| TV-33 / C7 visione e memoria condivise                                                 | pannello → interruttori della campagna                                | «Memoria dell'esplorato condivisa» → la verifica di Doran usa la memoria del gruppo; «Visione condivisa» → ogni giocatore vede ciò che vede il gruppo                                                                                                                                                                                                                                                | —                                                                                                                                                      | Opzione Shard (VTL-074), party vision FG (R20-169), shared fog Foundry V14 (FVT-160)                                                                                 | journey (4), `11-as-doran-shared-memory.png`; test «view as a token…»                                                                                        |
| TV-34 aggiornare la visione solo al rilascio                                           | Teletrasporta (DM) → interruttore                                     | con l'opzione attiva il teletrasporto dall'ingresso alla scala non rivela il magazzino attraversato; Annulla; senza l'opzione lo stesso teletrasporto lo rivela                                                                                                                                                                                                                                      | —                                                                                                                                                      | «Only update on drop» Roll20 (R20-095)                                                                                                                               | journey (5); test «update on drop at night…»                                                                                                                 |
| TV-35 / PR-26 il DM controlla che cosa vede una pedina                                 | pannello «Vedi come…», Maiusc+V, menu della pedina                    | vista opaca come per il giocatore con striscia «Vista di …» e «Torna alla vista del DM»                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                      | Maiusc+V AboveVTT con nebbia opaca (VTL-144), preview as token Roll20 (R20-093)                                                                                      | journey (6); test «view as a token…»                                                                                                                         |
| PR-22 tipi di barriera                                                                 | Barriere                                                              | il muro sotto la porta del magazzino diventa Finestra → Livia vede il magazzino; Annulla; lo specchio unidirezionale fa vedere Doran alla Sentinella ma non la Sentinella a Doran; non si attraversa da nessun lato                                                                                                                                                                                  | — (tipi di barriera: scelta d'interfaccia del mercato, nessuna regola SRD)                                                                             | Tipi di muro Foundry (FVT-075), modi LOS FG (R20-120), linee a uno/due lati Smoke (VTL-071)                                                                          | journey (7), `12-as-livia-through-window.png`, `13-as-sentinella-one-way-mirror.png`; test «visibility polygon and barrier types…», «DM sets barrier types…» |
| PR-26 diagnostica delle luci                                                           | pannello → Diagnostica luci                                           | «Pedine con visione: 3 · Fonti di luce: 3 (2 accese) · Oscurità magiche: 0», righe per pedina (sensi, luce dove sta, quota vista) e per luce (stato, Accendi/Spegni, Modifica); passare sopra una riga accende il suo anello sulla mappa; avvisi «Doran è al buio…», «soppressa»                                                                                                                     | —                                                                                                                                                      | Footer del pannello luci Roll20 con conteggi ed evidenziazione (R20-093)                                                                                             | journey (8), `04-dm-tower-diagnostics.png`, `18-phone-en-dm-diagnostics.png`; test «lighting layer and diagnostics section…»                                 |
| TV-29 pedine controllate sopra l'oscurità                                              | automatica; pannello → interruttore personale                         | Mira al buio fuori dalla vista di Livia è disegnata sopra l'oscurità; l'interruttore la toglie, resta dopo il reload                                                                                                                                                                                                                                                                                 | —                                                                                                                                                      | «Always display controlled tokens on top» Roll20 (R20-153)                                                                                                           | journey (9), `14-player-controlled-on-top.png`; test «controlled tokens stay above…»                                                                         |

Trasversali: offline la modifica condivisa è rifiutata con «senza rete»; da tastiera frecce +
Invio posano il pennello, Maiusc+Invio chiude il poligono, Backspace toglie un vertice, Esc
annulla; la mappa resta a fuoco dopo ogni azione da tastiera; i controlli della barra sono ≥
40 px; nessun trabocco a 1440 e a 390; EN su telefono con tocco (strumento aperto dal suo
gruppo, barra in una striscia scorrevole, tratto di pennello registrato); nessun avviso d'area
dopo ogni passo (`15-dm-fog-bar.png`, `16-phone-en-player-vision.png`,
`17-phone-en-dm-fog-bar.png`).

## Come si vede (scelte copiate)

- DM: la nebbia manuale è tratteggiata e traslucida (Owlbear); la notte è un velo leggero con
  le luci che lo bucano; la visione dinamica non limita il DM finché non sceglie «Anteprima
  giocatori» o «Vedi come …».
- Giocatore: fuori vista tutto è nero; le aree esplorate mostrano solo la mappa ricordata in
  grigio (Roll20 Explorer); in vista la notte resta scura, la scurovisione in grigio.
- Pedine, porte e decorazioni di pedina che il giocatore non vede non sono sullo schermo, né
  nell'albero di accessibilità, né nell'ordine di tabulazione (stile generato dal livello).
- Ordine dei livelli: luci 30 (sotto le pedine); nebbia e visione 68 (sopra le decorazioni
  delle altre aree: parole di salute 64, segni 65, fumetti 66, bottino 67); strumenti e HUD
  69; restano sopra i segnali (70) e la barra di sessione (95).

## Comandi di verifica

```sh
cd /Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/design/blueprint
node --test tests/fog-vision.test.mjs tests/lighting.test.mjs   # 23/23
node --test tests/*.test.mjs   # 1643 test, 1637 verdi; 6 rossi di world-map (B42, in corso) — prima un giro con 2 rossi di adventures (B49, in corso); nessuno di B35
cd /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B35
playwright-cli -s=d20-b35 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/fog-vision-journey.js
```

Esito del percorso: 11 gruppi superati, 0 errori di pagina (`journey-result.json` nella
cartella delle prove). Regressioni eseguite con copie che scrivono in `B35/regression/`:
`spatial-journey.js`, `annotations-journey.js`, `registry-smoke-journey.js` passano;
`b61-table-structure-journey.js` si ferma a «Home did not move to the Creature tab» perché
l'ultima scheda della barra (Sicurezza, B27) prende il fuoco quando si apre: non dipende da
B35 (la scheda Visione non sposta il fuoco).

## Limiti onesti

- Le aree esplorate si registrano su celle di 12,5 px (1/4 di quadretto), sfumate; la vista
  attuale è invece il poligono esatto. La registrazione avviene dopo ogni modifica accettata
  sulla scena attiva con visione (un commit privato non annullabile di per sé, «Aree esplorate
  aggiornate»); annullare una mossa annulla anche ciò che aveva rivelato.
- «Aggiorna solo all'arrivo»: la visione del Tavolo si aggiorna comunque quando la mossa è
  confermata (non durante il trascinamento); l'opzione decide se il percorso fatto entra nella
  memoria. Il percorso è quello della mossa registrata o, senza, la linea retta.
- La luce passa dove passa la vista (nessun canale "luce" separato); muri di terreno (vedo
  dentro ma non oltre) e restrizioni di prossimità non ci sono. L'unidirezionale vale solo per
  la vista: movimento e linea d'effetto restano bloccati da entrambi i lati.
- Una luce la cui sorgente è dentro l'oscurità magica non illumina nulla: è un'inferenza da
  «la luce non magica non può illuminarla» (SRD), dichiarata come tale. Non è gestita la
  dissoluzione di luci di incantesimi di livello ≤ 2.
- Le conseguenze di regola non sono dedotte dalla luce: nessuno svantaggio automatico alla
  Percezione in luce fioca, nessun "attaccante non visto" derivato; il bersaglio del combattimento
  usa ancora solo i muri. Accecato viene dalle condizioni (B10). Vista cieca e vista pura sono
  impostabili; percezione tellurica no.
- I sensi dalla scheda si leggono solo dalla specie del costruttore (tabella SRD); gli altri
  sensi sono impostazioni della pedina fatte dal DM. La luce portata non è collegata a un
  oggetto dell'inventario né alla durata (torcia 1 ora).
- Il ciclo giorno/notte è manuale, non legato all'orologio di gioco.
- La barra degli strumenti sta dentro la mappa: i simboli delle porte (disegnati dal core
  per ultimi) possono sovrapporsi; su telefono la barra è una striscia scorrevole sopra lo zoom.
- Nascondere le decorazioni di altre aree sopra la nebbia richiede `data-token-for` (fatto per
  B18); un'area futura sopra l'ordine 68 dovrà usarlo.
- Dimostrazione locale a due identità: la memoria "per giocatore" è per personaggio (il
  giocatore = Livia + Mira; Doran è giocato dall'identità DM). Nessuna sincronizzazione reale;
  la visibilità è una proiezione locale, non sicurezza lato server.

## Review and fixes

25/09/2026 · revisore indipendente (non ha costruito B35) · stesso worktree · sessione browser
`d20-b35-rf` · prove in `~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B35-rf/` (fuori dal
checkout). Riletti la scheda B35, le righe del censimento citate (DDB-121, VTL-066/067/071/142/144,
FVT-075/077/159/160, R20-093–096/120–122/153/169), il piano del registro §5 (B61) e il codice di
`fog-vision*.mjs`, `lighting-editor.mjs`, `fog-vision.css`, test e percorso. Prima delle modifiche
il percorso del costruttore passava (11/11) e i 23 test erano verdi: i difetti sotto sono stati
trovati con sonde nel browser (vista del giocatore, albero di accessibilità, controlli non toccati
dal percorso) e rileggendo le regole SRD e la forma reale dei dati delle altre aree.

### Difetti trovati e corretti (prima il test che fallisce, poi la correzione)

| #   | Gravità | Difetto e riproduzione                                                                                                                                                                                                                                                                                                                                                                                                    | Correzione                                                                                                                                                                                                                                                                                                                                                                     | Esito e prova                                                                                                                           |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P2      | **La scurovisione "dalla scheda" non funzionava per nessun personaggio fatto con il costruttore.** `resolveSenses` leggeva `actor.speciesId`, che hanno solo i campioni della Biblioteca (Iria); il costruttore salva la specie in `characterBuild.data.origin.speciesId`. Il personaggio pronto Brann (nano) risultava «Vista normale, senza scurovisione». Il test inventava `speciesId`. Mancava anche il Drow (36 m). | Il dominio legge la specie dalla costruzione (o dal campo della Biblioteca) e il retaggio elfico: Drow 36 m (SRD 5.2.1, specie EN pp. 84–86 / IT pp. 94–97, la stessa fonte del dominio), altri elfi 18 m.                                                                                                                                                                     | Corretto. Test con il costruttore vero (`claimPremade` di Brann, elfo drow ed elfo alto applicati da bozza); percorso di revisione (5). |
| 2   | P2      | **L'oscurità magica era trasparente.** Oscurità (4,5 m) posata tra Doran e la porta del magazzino: «Vedi come Doran» mostrava ancora la porta e tutto ciò che sta dietro la sfera; anche la scurovisione vedeva oltre. SRD 5.2.1: area pesantemente oscurata, «la scurovisione non può vedere attraverso di essa» (Oscurità EN p. 122 / IT p. 170; Visione e luce EN p. 11 / IT p. 12).                                   | `throughDarkness` nel dominio: chi sta fuori dalla sfera non vede ciò la cui linea di vista la attraversa (solo dove l'oscurità arriva: i muri la tagliano); la vista pura entro il suo raggio vede oltre; la vista cieca resta. Sulla mappa, il cono d'ombra dietro la sfera (tangenti) nella maschera della visione. Lettura dichiarata: chi sta dentro la sfera vede fuori. | Corretto. Test «magical darkness is opaque…»; percorso di revisione (2), `rf-01-as-doran-darkness-opaque.png`.                          |
| 3   | P2      | **La scheda Creatura del giocatore nominava le creature nascoste.** Con i goblin nascosti dalla visione, le Distanze di B18 elencavano «Sentinella 13,5 m» ed «Esploratore 16,6 m»; parole di salute, segni di condizione e marcatore «fuori combattimento» delle pedine nascoste restavano nell'albero di accessibilità sotto la nebbia.                                                                                 | Lo stile di proiezione del livello nebbia nasconde anche `[data-cs-health]`, `[data-token-menu-deco]`, `[data-ct-out]` della pedina e la riga `li` delle distanze (`[data-annot-dist]`), come già faceva per `data-token-for`.                                                                                                                                                 | Corretto. Test «the player's view also hides…»; percorso (4) con l'istantanea di accessibilità di `#content`.                           |
| 4   | P2      | **La barriera «Invisibile» si vedeva.** Il core disegna ogni muro non segreto anche per il giocatore, quindi il tipo prometteva «Non si vede» ma il giocatore vedeva la linea.                                                                                                                                                                                                                                            | Modifica condivisa minima e aggiuntiva in `spatial-editor.mjs`: `renderSpatialOverlay` dà a ogni muro `data-spatial-wall="<id>"` (nessun comportamento). B35 nasconde i muri invisibili nella vista del giocatore, nell'anteprima e in «Vedi come», anche senza nebbia né visione; il DM li vede.                                                                              | Corretto. Test «an invisible barrier is not drawn…»; percorso (3), `rf-02-player-invisible-barrier.png`.                                |
| 5   | P3      | Fedeltà: lo strumento Nebbia di D&D Beyond si apre con **F** (DDB-121); gli altri strumenti del Tavolo hanno già R, X, O, V.                                                                                                                                                                                                                                                                                              | Comando `fog-vision.fog-tool` (solo DM, contesto Tavolo, `F`), nella palette B23.                                                                                                                                                                                                                                                                                              | Corretto. Test; percorso (1).                                                                                                           |
| 6   | P3      | Fedeltà: in Smoke & Spectre **Z** toglie l'ultimo punto del poligono (VTL-071); qui solo Backspace.                                                                                                                                                                                                                                                                                                                       | Z semplice (Mod+Z resta Annulla) o Backspace; il pulsante «Togli ultimo punto» dichiara `aria-keyshortcuts`.                                                                                                                                                                                                                                                                   | Corretto. Test; percorso (1) (3 → 2 punti).                                                                                             |
| 7   | P3      | Il primo angolo di un rettangolo fatto da tastiera sopravviveva a Esc, al cambio di forma e al cambio di strumento: l'Invio successivo completava un rettangolo non voluto.                                                                                                                                                                                                                                               | `cancelGestures()` (usato da Esc) azzera anche il primo angolo; lo azzerano il cambio di forma, `deactivate` e il ripristino della vista.                                                                                                                                                                                                                                      | Corretto. Test; percorso (1) (nessun rettangolo dipinto).                                                                               |
| 8   | P3      | Un muro unidirezionale reso trasparente nell'editor della scena («Blocca vista» tolto, `blockSide` rimasto) era ancora chiamato «Unidirezionale».                                                                                                                                                                                                                                                                         | `barrierType` riconosce l'unidirezionale solo se il muro blocca la vista.                                                                                                                                                                                                                                                                                                      | Corretto. Test.                                                                                                                         |

### Rilevati e non corretti qui (motivo)

- **P2, tra aree, rinviato — serve un aggancio del core.** Le altre aree decidono «visibile ai
  giocatori» solo da `token.hidden`/`visible`: l'anteprima di un'area di combattimento puntata nel
  buio elenca le «Creature note coinvolte» anche se il giocatore non le vede; righe di aure e note
  di B18, menzioni della chat; le parole di disposizione di B22 (spente per impostazione) non hanno
  l'attributo dell'attore. Una correzione vera richiede un servizio comune (per esempio
  `ctx.canSeeToken(actorId)` alimentato dal modello di B35) letto da `combat.mjs`, annotazioni e
  chat: file condivisi di più aree, oltre la "piccola modifica aggiuntiva" consentita. Le proiezioni
  di B35 coprono ciò che il Tavolo mostra senza azioni (mappa, distanze, distintivi).
- **P3, impaginazione del Tavolo.** A 1440×900 la mappa è alta circa 370 px e la barra delle opzioni
  la copre in basso (Teletrasporta circa 90 px, Nebbia circa 140 px): con Teletrasporta, Doran e
  Mira in fondo alla torre non si cliccano senza spostare la vista (sonda `probe13`, `probe/p13-teleport.png`).
  È la stessa convenzione delle barre di B18 (in basso a sinistra, come il menu a comparsa di D&D
  Beyond Maps); rimedi oggi: spostare o ingrandire la vista, comprimere la barra laterale, oppure
  da tastiera (seleziona la pedina, frecce e Invio). Da decidere insieme per tutte le barre (opzioni
  a icone come Owlbear, o fuori dalla mappa).
- **P3, Registro.** In «Eventi» chi agisce vede le proprie voci «Aree esplorate aggiornate»: il
  negozio scrive una voce per ogni modifica e non ha un'opzione silenziosa (Foundry e Roll20 non
  registrano l'esplorazione). Richiede un'opzione del core.

### Controllati, non difetti

- Ritratti dei turni: mostrano anche chi è nascosto solo dalla visione, come il tracker di Foundry
  (che esclude solo i nascosti dal DM).
- Barra delle opzioni in basso a sinistra: convenzione già adottata da B18 (menu a comparsa DDB).
- Maiusc+V scritto in un campo non attiva la verifica (la shell ignora i comandi d'area mentre si scrive).
- Il giocatore seleziona e trascina la propria pedina al buio: il livello nebbia non riceve il
  puntatore (sonda `probe6`).
- Controlli non toccati dal percorso, provati nel browser e salvati: «Azzera tutte le aree
  esplorate» (finestra), «Inverti lato», «Deseleziona», colore, «Fai seguire Livia» e «stacca»,
  direzione del cono, torcia portata assegnata dalla finestra dei sensi e spenta dal giocatore dal
  suo pannello (`probe13`).
- `innerText` conta anche il testo SVG sotto `display:none` (particolarità del browser); l'albero
  di accessibilità no: la promessa del costruttore sulle pedine nascoste regge.
- Annulla dopo il seguito dell'esplorazione: ripristina anche la memoria (istantanea), confermato.

### File toccati dalla revisione

- Propri dell'area: `fog-vision.mjs`, `fog-vision-domain.mjs`, `tests/fog-vision.test.mjs`
  (+6 test), `tests/lighting.test.mjs` (+1 test).
- Condiviso, solo aggiunta: `spatial-editor.mjs` — attributo `data-spatial-wall` sui muri di
  `renderSpatialOverlay` (convenzione per le proiezioni di vista; `spatial-editor.test.mjs` verde).
- Nuovo: `changes/interview-01/blueprint-checks/fog-vision-review-journey.js`.

### Verifica dopo le correzioni

```sh
cd /Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/design/blueprint
node --test tests/fog-vision.test.mjs tests/lighting.test.mjs   # 30/30
node --test tests/*.test.mjs                                    # 1698/1698
cd /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B35-rf
playwright-cli -s=d20-b35-rf --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/fog-vision-review-journey.js
```

Esiti: percorso di revisione 5/5 senza errori di pagina; percorso del costruttore (copia che scrive
in `B35-rf/after/`) 11/11, `errors: []`; regressioni `spatial-journey.js` 8/8 e
`registry-smoke-journey.js` superati (copie che scrivono in `B35-rf/`). Un primo giro della suite
completa aveva 6 rossi in `combat-tracker.test.mjs` (area in lavorazione in quel momento, file
modificati pochi minuti prima); il giro successivo è tutto verde.
