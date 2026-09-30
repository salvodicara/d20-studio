# B47 — Scene avanzate: livelli, varianti, oggetti, prefabbricati, UVTT: prove

25/09/2026 (lavoro del 24–25/09) · worktree `d20-studio-interview-01` (branch
`codex/interview-01`) · sessione browser `d20-b47` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B47/` (fuori dal checkout).

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B47 (PR-03, PR-06, PR-08, PR-09, PR-10,
PR-11, PR-12, PR-13, PR-14, PR-15, TV-13). Righe di mercato lette: `roll20-fgu.md`
(R20-084, R20-088, R20-089, R20-091, R20-097, R20-124), `vtt-light.md` (VTL-063, VTL-071,
VTL-075, VTL-077, VTL-081, VTL-101, VTL-107, VTL-109, VTL-165), `foundry.md` (FVT-078,
FVT-079, FVT-080, FVT-081, FVT-085, FVT-107), `dndbeyond.md` (DDB-102, DDB-107), `crpg.md`
(CRP-118), `campaign-tools.md` (CMP-147).

## File

Tutti nuovi, dell'area `scene-assets` (prefissi `scene-assets*`, `scene-levels`, `uvtt-*`):

- `design/blueprint/scene-assets.mjs` — modulo d'ingresso `register(registry)`: sezione di
  stato, stile, sezione di Preparazione «Scene avanzate», scheda «Scena» della barra laterale
  del Tavolo, tre livelli della mappa, due voci del menu della pedina, undici comandi, avvisi
  del DM, ricerca, fornitore «usato in» della libreria B28.
- `design/blueprint/scene-assets-domain.mjs` — dominio puro: cartelle e archivio, varianti,
  oggetti (adesivi, immagini, tetti), modifica in blocco ed elenco, prefabbricati, area fuori
  mappa, vista iniziale e viste salvate, allineamento della griglia, seme sintetico.
- `design/blueprint/scene-levels.mjs` — dominio puro dei piani: edificio, piani, scale,
  salita/discesa, cambio del piano al Tavolo, seme del piano superiore della torre.
- `design/blueprint/uvtt-import.mjs` — lettura e costruzione della scena da Universal VTT.
- `design/blueprint/uvtt-sample.mjs` — il file d'esempio `cripta-sotto-la-torre.dd2vtt`.
- `design/blueprint/scene-assets-prep.mjs` — pagina di Preparazione (menu delle scene e area
  di lavoro della scena o del prefabbricato), dialoghi, gestori, `prepActions`.
- `design/blueprint/scene-assets-table.mjs` — livelli della mappa, scheda «Scena», azioni
  del Tavolo, dialogo delle scale del menu della pedina.
- `design/blueprint/scene-assets-canvas.mjs` — disegno SVG condiviso (oggetti, scale, area
  fuori mappa, creature in attesa).
- `design/blueprint/scene-assets-art.mjs` — 16 adesivi SVG disegnati per il blueprint.
- `design/blueprint/scene-assets-images.mjs` — tre WebP sintetici (10–11 KB l'uno, disegnati
  con Python/PIL): piano superiore della torre, cortile di notte, immagine del file UVTT.
- `design/blueprint/scene-assets.css` — solo classi `.sa-*`.
- `design/blueprint/tests/scene-assets.test.mjs` (19 test) e
  `design/blueprint/tests/uvtt-import.test.mjs` (5 test).
- `changes/interview-01/blueprint-checks/scene-assets-journey.js` — percorso nel browser (la
  scheda lo chiamava `scene-advanced-journey.js`; il nome segue l'incarico ricevuto).
- `changes/interview-01/blueprint-checks/scene-assets-fixtures.mjs` — scrive nella cartella
  delle prove i tre file caricati dal percorso (il `.dd2vtt` d'esempio, un `.dd2vtt` rotto,
  una PNG con griglia disegnata di 56 px spostata di 20, 12).

**Nessun file condiviso modificato.** Le due modifiche previste dalla scheda
(`spatial-editor.mjs` «strumenti via registro», `preparation.mjs` «hook dell'elenco scene»)
non sono servite: tutto passa dai punti del registro esistenti (`preparation-section`,
`table-panel` `sidebar-tab`, `map-layer`, `token-menu`, `command`, `notifications`,
`search`) e da funzioni pure già esportate (`renderSceneBase`, `activateScene`,
`validateSceneDraft` di `preparation.mjs`; `renderSpatialOverlay` di `spatial-editor.mjs`;
`addLight` di `fog-vision-domain.mjs`; `visibleAssets`, `findAsset`, `addUsageProvider` di
`media-domain.mjs`; `canControlActor` e affini di `character-access.mjs`).

## Stato e dati sintetici

`state.ext["scene-assets"]` (versione 1, `undo: "snapshot"`): `folders[]`, `placement`
(scena → cartella), `archive[]` (record completo della scena con cartella e data),
`variants[sceneId] = {active, list[{id, name, look}]}`, `stacks[id] = {name, floors[{sceneId,
name, elevation}], stairs[{id, name, x, y, radius, floors[2]}]}`, `props[sceneId][]`
(adesivo o immagine della libreria, posizione, larghezza/altezza in pixel della scena,
rotazione, livello `map`/`foreground`, `hidden`, `locked`, `fade`, eventuale `prefab`),
`prefabs[]` (oggetti relativi al proprio riquadro), `staged[sceneId][]` (creature fuori
mappa), `views.default[sceneId]`, `views.saved[ruolo][sceneId][3]`, `prefs[ruolo]
.hideForeground`, `pendingLights[sceneId]` (luci UVTT in attesa se l'area B35 manca).

Le modifiche ai dati del core passano da comandi espliciti, dentro `ctx.commit` e quindi con
Annulla: la variante cambia `background`/`template`/`imageName` della scena; l'allineamento
cambia `gridSize`/`gridOffsetX/Y`; scale e area fuori mappa spostano `tokens`; il cambio di
piano cambia `activeSceneId`; archivio e importazione tolgono o aggiungono record in
`state.scenes`.

Seme coerente con lo stato esistente (aggiunto una sola volta, mai sostituito):

- Cartelle «Capitolo 1 · L’osservatorio» (con la sottocartella «La torre») e «Capitolo 2 ·
  Il bosco di Bruma».
- Il cortile dell’osservatorio (`old-watch`): varianti «Giorno» (la base del core) e «Notte»
  (WebP con la stessa geometria del modello «cortile»: muri, stanze e pozzo negli stessi punti).
- La torre della lanterna: il piano terra è la scena di B35 (`lantern-tower`); il piano
  superiore «cella della lanterna» (`lantern-tower-top`, stessa impronta 1000 × 650, muri e
  porta propri, oggetti: la grande lanterna, forziere, giaciglio, tavolo) e la «Scala a
  chiocciola» nello stesso punto dei due piani (770, 470, raggio 100 px). La Sentinella
  (goblin-1) sta già sulla scala. Il riassunto della campagna dice che qualcuno ha riacceso
  la lanterna: il piano superiore ha la luce B35 «La grande lanterna». Senza l'area B35 il
  piano superiore non viene inventato.
- La radura dei goblin (`forest-clearing`, nuova, riservata al DM): cinque alberi, la
  capanna del capo (muri con varco) coperta da un tetto di paglia in primo piano, una
  trappola a scatto nascosta e bloccata, l'accampamento (2 tende, fuoco, casse, barile,
  giaciglio), Livia/Doran/Mira sul sentiero, la Sentinella in attesa fuori mappa.
- Il prefabbricato «Accampamento goblin» (raccolta «Accampamenti»), ricavato dalla radura.

## Dove sta (regola B61)

- **Preparazione › Scene avanzate** (scheda di sezione subito dopo «Scene»): due clic dalla
  campagna (Preparazione, Scene avanzate). Menu delle scene come la Page Menu di Roll20;
  aprendo una scena, area di lavoro con canvas (mappa + area fuori mappa tratteggiata) e
  schede Oggetti / Livelli / Varianti / Griglia e vista. «Muri, porte e pedine…» apre
  l'editor del core della stessa scena.
- **Tavolo › scheda «Scena»** della barra laterale destra (icona casa, ordine 25): piani
  (DM: selettore e ▲/▼ con PagSu/PagGiù; giocatore: piano mostrato e dove sono le sue
  pedine), scale, aspetto (DM), vista iniziale e viste salvate, tetti (personale), fuori
  mappa (DM), oggetti con «Trova» (DM).
- **Mappa del Tavolo**: livello oggetti (ordine 12, sotto le pedine) con le scale; tetti
  (ordine 61, sopra le pedine, sotto spilli e nebbia); area fuori mappa del DM (ordine 63,
  interattivo per trascinare dentro le creature in attesa).
- **Menu della pedina (B12)**: «Scale: sali o scendi…» (chi controlla la pedina, quando è
  sulla scala) e «Metti fuori mappa» (DM, PNG fuori dall'iniziativa).
- **Tasti** (comandi della palette B23): PagSu/PagGiù piano al Tavolo (DM, solo in un
  edificio), F2–F4 vai alla vista salvata, Maiusc+F2–F4 salva; senza tasto: vista iniziale,
  tetti per me, importa Universal VTT.
- Nessun pulsante nuovo in intestazioni o nella riga del titolo del Tavolo.

## Capacità → percorso → comandi e risultato → regola → pattern → prova

| Capacità (censimento)                                                | Percorso                                                                                                                      | Comandi e risultato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Regola / fonte                                                                                                                                                                | Pattern adottato (prodotto, ID)                                                                                                                                                                                                                                                               | Prova                                                                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PR-06** Cartelle o capitoli, ricerca, archivio                     | Preparazione › Scene avanzate                                                                                                 | Crea › Cartella…; trascina una scheda su una cartella o sul percorso; ⋯ › Sposta in…; «Cerca in tutte le cartelle» (archivio escluso) con il percorso di ogni risultato; ⋯ › Archivia: la scena esce da `state.scenes` (quindi dall'elenco del core, dal Tavolo, dalle ricerche) con la sua cartella; Archivio › Ripristina; Annulla con nome; eliminare una cartella fa salire di un livello ciò che conteneva                                                                                                                                                             | Nessuna regola di gioco; limite: la scena al Tavolo e un piano di un edificio non si archiviano                                                                               | Roll20 Page Menu con cartelle annidate, percorso, ricerca che salta l'archivio, menu della scheda (R20-084); capitoli come cartelle (FVT-107); ordine per nome con numeri naturali «Capitolo 1/2/3» (DDB-102)                                                                                 | Test «folders…», «search looks in every folder…»; percorso (1); `01-page-menu-folders.png`, `01b-archive.png`                                                                          |
| **PR-08** Varianti della stessa scena                                | Area di lavoro › Varianti; Tavolo › Scena › Aspetto                                                                           | Nuova variante da file (PNG/JPG/WebP ≤ 1 MB), dalla libreria B28 o da una base geometrica; «Usa questa»; al Tavolo il DM preme «Notte»: cambia solo l'immagine, muri, porte, pedine, spilli B15, luci e nebbia restano (stessa scena); rinomina, elimina (non quella in uso); Annulla                                                                                                                                                                                                                                                                                       | Nessuna regola                                                                                                                                                                | Shard: immagini alternative con spilli ancorati (VTL-075); Quest Portal: selettore di varianti (VTL-077). Non adottato: stati per pedina per fase (VTL-101)                                                                                                                                   | Test «a variant changes only the look…», «a library image used as a variant…»; percorso (2), (2b); `02-night-variant-player.png`                                                       |
| **PR-09** Livelli 2D di un edificio                                  | Area di lavoro › Livelli; Tavolo › Scena › Piani; menu della pedina                                                           | Crea edificio; Aggiungi piano (scena nuova vuota con la stessa impronta o scena esistente con la stessa impronta; altezza in m); Aggiungi scala (clic sulla mappa, piano collegato, raggio in m), Sposta…, Elimina; al Tavolo: la Sentinella sulla scala › «Sali a Cella della lanterna … e mostra il piano»; PagGiù/PagSu; menu della pedina › «Scale: sali o scendi…» con scelta del piano; il DM è avvisato (scheda e campana) dei personaggi su un piano non mostrato; il giocatore vede «Il Tavolo mostra: Piano terra» e dove sono le sue pedine                      | Decisione del blueprint (authored-demo): la scala porta la pedina nello stesso punto dell'altro piano senza costo di movimento aggiuntivo; rifiutato durante un combattimento | Foundry V14 Scene Levels: livelli ad altezze definite, muri/luci/oggetti per livello, pedine che salgono (FVT-080); modulo Levels: selettore di piano del GM e scale (FVT-081); XCOM 2: tasti per il piano mostrato (CRP-118); vista del gruppo spostata dal DM come la page ribbon di Roll20 | Test «floors…», «a player takes their own character…», «building editing…»; percorso (3), (7) Livelli; `03a-tower-ground-floor.png`, `03b-tower-upper-floor.png`, `07c-levels-tab.png` |
| **PR-10** Oggetti di scena con blocco, visibilità, tetti che sfumano | Area di lavoro › Oggetti; Tavolo (livelli e scheda Scena)                                                                     | Adesivi con ricerca per nome o etichetta (IT/EN), «+» al centro o trascinamento sulla mappa; immagini della libreria B28; spostamento col trascinamento o le frecce, maniglia d'angolo con larghezza in metri dal vivo, maniglia di rotazione (passi di 15°, Maiusc libero); Visibile ai giocatori / Bloccato; un oggetto bloccato non si sposta, ridimensiona, ruota o elimina («Bloccato: … Sbloccalo»); livello Primo piano: il tetto sfuma (opacità impostabile) quando una pedina controllata da chi guarda ci sta sotto; ogni giocatore può nascondere i tetti per sé | Nessuna regola                                                                                                                                                                | Foundry tile con occlusione «fade», blocco (FVT-078); D&D Beyond Sticker Browser: ricerca, «+», larghezza in unità reali, visibilità, blocco, adesivi promemoria nascosti (DDB-107); Roll20 Foreground che sfuma e interruttore del giocatore (R20-097)                                       | Test «stickers: locked objects…», «roofs fade…»; percorso (4); `04a-clearing-workspace.png`, `04b-roof-faded-player.png`                                                               |
| **PR-11** Prefabbricati                                              | Area di lavoro › Oggetti › Selezione / Prefabbricati                                                                          | Selezione › «Crea prefabbricato…» (nome, raccolta); «Inserisci…» e clic sulla mappa, oppure clic destro (tocco lungo) su un punto vuoto › Inserisci prefabbricato; ogni inserimento è un'istanza a sé; «Modifica» apre il prefabbricato come piccola scena; Rinomina, Elimina (le copie già inserite restano)                                                                                                                                                                                                                                                               | Nessuna regola                                                                                                                                                                | Owlbear Prefabs: selezione → Create Prefab → nome/raccolta, inserimento col clic destro, il prefabbricato è una scena modificabile (VTL-081). Non adottato: attaccare oggetti a una pedina (FVT-085)                                                                                          | Test «the Goblin camp prefab…»; percorso (5); `05-prefab-in-courtyard.png`                                                                                                             |
| **PR-12** Modifica in blocco ed elenco                               | Area di lavoro › Oggetti › Elenco e Selezione; Tavolo › Scena › Oggetti                                                       | «Trova» filtra per nome o etichetta (anche inglese); gruppi Primo piano / Mappa / Fuori mappa; casella per selezionare, «Seleziona i risultati (5)»; la scheda Selezione applica larghezza, rotazione, livello, sfumatura, visibilità e blocco a tutti («Applica a 5 oggetti») o elimina; scegliere un nome evidenzia l'oggetto; al Tavolo «Trova» centra la vista sull'oggetto e lo fa lampeggiare; Ctrl/Cmd+Z sul canvas annulla                                                                                                                                          | Nessuna regola                                                                                                                                                                | Foundry V14 Placeables Palette e scheda con filtri (FVT-079); Owlbear Outliner: livelli, elementi, ricerca, doppio clic per trovare (VTL-107)                                                                                                                                                 | Test «five trees edited together…»; percorso (6); `06-bulk-five-trees.png`                                                                                                             |
| **PR-15** UVTT/dd2vtt con muri, porte e luci modificabili            | Preparazione › Scene avanzate › Crea › Scena da file Universal VTT… (anche dalla palette: «Importa una mappa Universal VTT…») | File `.uvtt`/`.dd2vtt`/`.df2vtt` o «Usa il file d'esempio»; anteprima con immagine, muri, porte, luci e conteggi; file errato rifiutato col motivo (JSON non valido, estensione, dimensioni mancanti, immagine mancante/di altro tipo/oltre 1 MB, forme non valide) e «Crea scena» bloccato; la scena nuova ha l'immagine, i muri e le porte del modello dell'incremento 4 (si modificano nell'editor del core) e le luci nell'area B35 (strumento Luci del Tavolo); mappe grandi ridotte a 4000 px                                                                         | Nessuna regola di gioco; luce del file (raggio in celle) = metà luce intensa e metà fioca, limite 36 m dello strumento Luci                                                   | Roll20 UVTT: caricamento dal menu delle pagine, tutto modificabile, conta solo l'immagine (R20-089); stessa famiglia in Fantasy Grounds (R20-124) e Smoke & Spectre (VTL-071); esportazione Dungeondraft (CMP-147)                                                                            | Test di `uvtt-import.test.mjs` (5); percorso (7); `07a-uvtt-preview.png`, `07b-uvtt-in-scene-editor.png`                                                                               |
| **PR-03** Allineamento guidato in tre passi con lente                | Crea › Scena da immagine… (si apre da sola), o Area di lavoro › Griglia e vista › Allinea la griglia…                         | 1 Àncora: la lente segue il puntatore con mirino; clic su un angolo di casella, «Avanti» compare subito sotto il punto; 2 Una cella: angolo opposto → misura la cella; 3 Rifinisci: griglia evidenziata, quattro viste degli angoli, − / + cella (0,5 px), frecce di scostamento (anche da tastiera, Maiusc = 10); «Applica alla scena» (Annulla lo riporta); sul telefono la lente si alza sopra il dito                                                                                                                                                                   | Nessuna regola                                                                                                                                                                | Owlbear: tre passi, lente con mirino a forma di griglia, «Avanti» sotto il cursore, lente lontana dal dito al tocco (VTL-063); Roll20 Anchor → Scale → Fine tune (R20-088)                                                                                                                    | Test «grid alignment result…»; percorso (8a) e telefono; `08a-align-refine.png`, `10b-phone-loupe-away-from-finger.png`                                                                |
| **PR-13** Area fuori mappa solo DM                                   | Area di lavoro (bordo tratteggiato); Tavolo › Scena › Fuori mappa                                                             | Oggetti e creature oltre i bordi: il DM li vede, i giocatori mai; «Metti una creatura fuori mappa…» o menu della pedina › «Metti fuori mappa»; «Mostra l'area fuori mappa» allarga la vista; trascinando la creatura sulla mappa diventa una pedina (Invio sulla creatura: entra dal bordo più vicino); non entra nell'iniziativa da sola; rifiutato per chi è nell'ordine d'iniziativa                                                                                                                                                                                     | Nessuna regola                                                                                                                                                                | Roll20: oggetti fuori pagina visibili solo al GM (R20-091)                                                                                                                                                                                                                                    | Test «off-map creatures…»; percorso (9); `09a-offmap-dm.png`                                                                                                                           |
| **PR-14** Vista iniziale della scena                                 | Tavolo › Scena › Viste                                                                                                        | Il DM inquadra e sceglie «Imposta questa come vista iniziale»; chiunque arrivi sulla scena parte lì; «Vista iniziale» ci torna; «Rimuovi» (anche da Griglia e vista)                                                                                                                                                                                                                                                                                                                                                                                                        | Nessuna regola                                                                                                                                                                | Owlbear Default View: usata all'ingresso e al «reset view» (VTL-109)                                                                                                                                                                                                                          | Test «starting view for everyone…»; percorso (9)                                                                                                                                       |
| **TV-13** Posizioni di camera salvate                                | Tavolo › Scena › Viste; tasti                                                                                                 | Tre viste personali per scena: Maiusc+F2–F4 (o «Salva qui») salva, F2–F4 (o «Vai») torna; per identità, locali (valgono anche senza rete), restano dopo il ricaricamento                                                                                                                                                                                                                                                                                                                                                                                                    | Nessuna regola                                                                                                                                                                | AboveVTT F1–F4 / Maiusc+F1–F4 e stati di camera di Tabletop Simulator (VTL-165) — da F2 perché F1 apre l'Aiuto qui                                                                                                                                                                            | Test «starting view for everyone…»; percorso (9); `09b-views-player.png`                                                                                                               |

## Correzioni, permessi, privacy, senza rete, lingue, accessibilità

- **Annulla**: ogni modifica condivisa è un commit con istantanea della sezione, quindi
  «Annulla ultima modifica» la corregge con un record di correzione. Nella pagina e
  nell'area di lavoro c'è il pulsante «Annulla: <modifica>» (come il pannello della sessione
  B14); Ctrl/Cmd+Z sul canvas fa lo stesso (Foundry). Viste salvate e tetti per me sono
  preferenze personali (`local`, non annullabili).
- **Permessi**: Preparazione e tutti i comandi di scena sono del DM (rifiuto con testo
  IT/EN). Il giocatore può: far salire o scendere le proprie creature (fuori combattimento),
  salvare e usare le proprie viste, nascondere i tetti per sé.
- **Cosa non vede il giocatore**: oggetti nascosti, oggetti e creature fuori mappa,
  cartelle, archivio, prefabbricati, varianti non attive, selettore di piano; dove sono le
  pedine altrui su altri piani (solo le proprie).
- **Senza rete (simulato)**: le modifiche condivise sono rifiutate con «Sei senza rete» e
  nulla cambia (percorso); viste e tetti personali restano possibili.
- **Lingue**: italiano predefinito, inglese completo (percorso sul telefono in EN). I nomi
  scritti dal DM (cartelle, scene, varianti, prefabbricati) restano come scritti.
- **Tastiera e tocco**: canvas focalizzabile (frecce spostano la selezione, Canc elimina,
  Esc annulla la scelta, Ctrl/Cmd+Z); elenco degli oggetti come percorso da tastiera;
  schede con frecce; creature fuori mappa con Invio. Tocco lungo sul canvas = menu
  d'inserimento (implementato, non provato dal percorso, che usa il clic destro). Pulsanti
  ≥ 40 px; telefono 390 senza scorrimento orizzontale (percorso).

## Verifiche eseguite

- `node --test design/blueprint/tests/scene-assets.test.mjs design/blueprint/tests/uvtt-import.test.mjs`
  → 24/24.
- `node --test design/blueprint/tests/*.test.mjs` → 1983/1983 a un giro completo del
  24/09. I giri successivi mostrano fallimenti solo in file di altre aree in costruzione in
  parallelo (`damage-tray`, `quickbar`, poi `dice-tray-review` e `sheet-plus`), senza
  riferimenti a questa area; rieseguiti uno per uno si risolvono man mano che quelle aree
  avanzano. I 24 test di questa area passano a ogni giro.
- Percorso nel browser (Chromium, playwright-cli, sessione `d20-b47`):
  `node changes/interview-01/blueprint-checks/scene-assets-fixtures.mjs` poi
  `playwright-cli -s=d20-b47 --raw run-code --filename=changes/interview-01/blueprint-checks/scene-assets-journey.js`
  → tutti i passi superati, nessun errore di pagina, nessun avviso d'area di `scene-assets`;
  esito in `journey-output.txt` nella cartella delle prove. Copre: IT desktop 1440 × 900 con
  clic, trascinamenti (schede HTML5, oggetti sul canvas, adesivo dalla tavolozza, maniglia,
  pedina al Tavolo, creatura fuori mappa), clic destro, tasti (PagSu/PagGiù, Maiusc+F2/F2,
  frecce, Ctrl+Z), caricamento di file; DM e giocatore; ricaricamento; senza rete; telefono EN
  390 × 844 con tocco.
- Schermate 1440 × 900 (controllate a vista): `01-page-menu-folders`, `01b-archive`,
  `02-night-variant-player`, `03a-tower-ground-floor`, `03b-tower-upper-floor`,
  `04a-clearing-workspace`, `04b-roof-faded-player`, `05-prefab-in-courtyard`,
  `06-bulk-five-trees`, `07a-uvtt-preview`, `07b-uvtt-in-scene-editor`, `07c-levels-tab`,
  `08a-align-refine`, `09a-offmap-dm`, `09b-views-player`; telefono: `10a-phone-menu-en`,
  `10b-phone-loupe-away-from-finger`, `10c-phone-scene-tab`. Problemi visti e corretti dopo
  la prima ispezione: attributo `hidden` annullato da `display` di classe (pulsante «Avanti» e
  menu d'inserimento sempre visibili), lente tagliata dal contenitore sul telefono, etichetta
  lunga della scheda nella barra del telefono, «Visibile ai giocatori» invertito nella
  selezione singola, prefabbricato d'esempio con oggetti fuori dal proprio riquadro, barra
  del menu squilibrata.

## Limiti onesti

1. **Un piano alla volta al Tavolo.** I piani sono scene distinte raggruppate in un
   edificio; il Tavolo mostra la scena attiva della campagna a tutti. Il DM sposta la vista
   del gruppo (selettore, PagSu/PagGiù, «… e mostra il piano»); la vista automatica per
   giocatore secondo il piano della propria pedina di Foundry V14 non è riprodotta. Cambio di
   piano e scale sono rifiutati durante un combattimento. Nessun buco tra i piani né vista
   verso il piano di sotto (FVT-081). La scala non costa movimento aggiuntivo (decisione del
   blueprint, non una regola SRD).
2. **Cartelle solo in «Scene avanzate».** La scheda «Scene» del core resta un elenco piatto
   (nessun file condiviso toccato); l'archivio però vale ovunque perché la scena esce da
   `state.scenes`. I dati di altre aree legati alla scena (spilli, nebbia, luci) restano e
   tornano col ripristino.
3. **Varianti**: cambiano immagine/modello della scena, non il momento del giorno di B35
   (la notte dell'immagine non accende da sola la fase notturna delle luci); niente stati per
   pedina per variante (VTL-101).
4. **Oggetti**: si spostano e ridimensionano in Preparazione; al Tavolo il DM ne cambia
   visibilità e blocco e li trova, ma non li trascina. Nessun ordine di sovrapposizione, tinta,
   altezza per oggetto o occlusione «radiale/visione» (solo sfumatura); il tetto sfuma se il
   centro della pedina è dentro il rettangolo ruotato. Le maniglie SVG sono più piccole di
   40 px (i campi numerici della selezione sono l'alternativa). Niente selezione a rettangolo
   (Maiusc+clic e caselle dell'elenco).
5. **Prefabbricati**: solo oggetti; niente muri, luci o creature (Token Attacher, FVT-085,
   non adottato).
6. **Universal VTT**: i muri importati hanno `source.kind = "authored-demo"` (l'unico tipo
   accettato dal validatore dell'incremento 4) con titolo e revisione dell'importazione; le
   finestre non sono distinte dai muri; `objects_line_of_sight` diventa muri; luce ambiente
   ignorata; conversione del raggio in metà intensa e metà fioca scelta dal blueprint; limite
   1 MB dell'immagine; massimo 40 luci (B35) e 3000 muri; senza l'area B35 le luci restano in
   attesa (`pendingLights`) e non si vedono.
7. **Allineamento**: celle quadrate; scostamenti in pixel interi (come l'editor del core).
8. **Vista iniziale**: all'arrivo prevale su «centra sulle mie pedine» di B14 (applicata
   dopo); il tasto Home di B14 ricentra poi sulle proprie pedine.
9. **Viste salvate**: tre posti (F2–F4, F1 è l'Aiuto); personali per identità in questa
   dimostrazione locale (stesso browser), non sincronizzate tra dispositivi.
10. **Fuori mappa**: attendono solo creature della campagna (PNG); al Tavolo l'area
    tratteggiata si vede solo ai lati della mappa e allargando la vista.
11. **Arte**: 16 adesivi SVG semplici più le immagini della libreria B28; nessun catalogo
    commerciale. Trascinare le schede nelle cartelle non funziona al tocco (c'è «Sposta in…»).
12. **Ricerca globale**: restituisce cartelle e prefabbricati; le scene archiviate restano
    fuori per scelta (come Roll20). Nessun backend: permessi e visibilità sono proiezioni
    locali per ruolo, non sicurezza.

## Review and fixes

25/09/2026 · revisione indipendente (revisore-correttore, non autore) · stesso worktree ·
sessione browser `d20-b47-rf` · prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B47-rf/` (fuori dal checkout).

### Come è stata fatta

- Letti la scheda B47 del censimento, le righe di mercato citate (R20-084/088/089/091/097,
  VTL-063/075/077/081/107/109/165, FVT-078/079/080/081/107, DDB-102/107), il rapporto del
  costruttore e tutti i file dell'area (dominio, piani, UVTT, Preparazione, Tavolo, disegno,
  CSS, test, percorso).
- Rieseguito il percorso del costruttore come riferimento (`baseline/`): tutti i passi
  superati. Poi prove esplorative con clic, clic destro, tastiera e tocco (`explore-1..4.js`):
  ogni controllo secondario (varianti da file e rifiutate, rinomina/elimina di varianti,
  prefabbricati e cartelle, crea edificio, aggiungi/modifica/togli piano, scale, duplica)
  cambia davvero lo stato; nessun errore di pagina.
- Nessun file condiviso modificato dal costruttore (solo `extensions.mjs` nomina l'area) e
  nessuno da questa revisione.

### Risultati

| ID  | Gravità | Riproduzione                                                                                                                                                                                                                                                                                                                  | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | P2      | DM: in Preparazione aggiunge un adesivo; al Tavolo Maiusc+F2 salva la vista 1; «Annulla: Adesivo aggiunto». La vista salvata sparisce (`views.saved` = `{}`); lo stesso per «tetti per me». Le preferenze personali «non annullabili» venivano cancellate dall'Annulla di una modifica precedente (istantanea della sezione). | **Corretto.** La sezione registra `afterUndo` (`keepPersonal` in `scene-assets-domain.mjs`): l'Annulla ripristina la modifica condivisa e porta nello stato ripristinato viste salvate e scelta dei tetti di adesso. Test «review: personal saved views…»; percorso di revisione F1.                                                                                                                                                                                |
| F2  | P2      | Solo tastiera: «Inserisci…» di un prefabbricato e «Aggiungi scala…»/«Sposta…» si armano ma poi chiedono un tocco sulla mappa: nessun modo di completarli senza puntatore. Inoltre una scala creata non si poteva più rinominare né cambiarne il raggio.                                                                       | **Corretto.** Con qualcosa armato, Invio (o Spazio) sul canvas fa ciò che farebbe il tocco al centro della mappa: il prefabbricato entra al centro, selezionato, e le frecce lo spostano; la scala apre il dialogo con la **posizione in metri modificabile** (precompilata dal tocco quando c'è). Nuovo «Modifica…» per ogni scala (nome, raggio, posizione). Armare dà il fuoco al canvas; le didascalie lo dicono. Test «review: keyboard places…»; percorso F2. |
| F3  | P3      | Clic destro su un oggetto nell'area di lavoro: niente (menu del browser). Il pattern citato per i prefabbricati è «seleziona → menu contestuale › Create Prefab» (Owlbear VTL-081) e Foundry apre l'HUD della tessera col clic destro (FVT-078); c'era solo il clic destro sul vuoto.                                         | **Corretto.** Clic destro (tocco lungo al telefono) su un oggetto: lo seleziona se non lo era e apre il menu «Crea prefabbricato…» (o «… con N oggetti…»), «Nascondi/Mostra ai giocatori», «Blocca/Sblocca», «Elimina (N)», «Chiudi»; Esc lo chiude e riporta il fuoco al canvas. Dentro un prefabbricato niente «Crea prefabbricato». Test «review: right-click…»; percorso F3 (mouse 1440 e tocco lungo a 390).                                                   |
| F4  | P3      | Giocatore: Livia sulla scala a chiocciola › «Sali a Cella della lanterna». Il Tavolo resta al piano terra (corretto, decide il DM) ma la scheda Scena non offre più nessuna scala: Livia resta bloccata di sopra finché il DM non mostra quel piano.                                                                          | **Corretto.** Per il giocatore la scheda elenca anche le proprie creature ferme su una scala di un piano non in vista («Livia · Scala a chiocciola (Cella della lanterna)» › «▼ Scendi a Piano terra»); il pulsante porta il piano di partenza (`data-sa-from`). Mai creature altrui. Test «review: a player's own token…»; percorso F4.                                                                                                                            |
| F5  | P3      | DM al piano terra: «▼ Piano sotto» attivo; il clic dà solo il rifiuto «Questo è il piano più basso».                                                                                                                                                                                                                          | **Corretto.** ▲/▼ disattivati al piano più alto/più basso (i tasti PagSu/PagGiù restano con il loro avviso). Test «review: the floor steps…»; percorso F5.                                                                                                                                                                                                                                                                                                          |
| F6  | P3      | Telefono 390, Varianti: i menu «libreria» e «base» sono alti 34 px, il campo file 23 px (< 40 px).                                                                                                                                                                                                                            | **Corretto** in `scene-assets.css` (`min-height: 40px`); misurati 40/40/40 px nel percorso.                                                                                                                                                                                                                                                                                                                                                                         |
| F7  | P3      | Spostare una cartella con sottocartelle sotto una cartella profonda superava il limite di quattro livelli (si controllava solo la profondità della destinazione).                                                                                                                                                             | **Corretto.** `moveFolder` conta anche l'altezza del ramo spostato. Test «review: moving a folder…».                                                                                                                                                                                                                                                                                                                                                                |
| F8  | P3      | Tavolo › Oggetti › nome: l'anello «trovato» lampeggiava tre volte e poi restava fisso fino al disegno successivo.                                                                                                                                                                                                             | **Corretto** (solo CSS): tre impulsi poi dissolvenza a 0; con «riduci movimento» nessuna animazione.                                                                                                                                                                                                                                                                                                                                                                |
| F9  | P3      | DM in inglese importa il file UVTT d'esempio: descrizione della scena e nomi delle luci generati sempre in italiano.                                                                                                                                                                                                          | **Corretto.** `buildUVTTScene(…, { lang })`; `loadUVTT` passa la lingua del DM. Test «review: the imported scene's generated texts…»; percorso F9.                                                                                                                                                                                                                                                                                                                  |
| F10 | P3      | Commento di `openClimb`: «un piano va diretto, più piani chiedono» ma il dialogo si apre sempre (serve anche per «mostra quel piano al Tavolo»).                                                                                                                                                                              | **Corretto** il commento.                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Non difetti (con motivo) e seguiti

- **Due elenchi di scene** (Preparazione › «Scene», piatto, e «Scene avanzate», con cartelle):
  la scheda prevedeva un hook in `preparation.mjs`; il costruttore non ha toccato file
  condivisi e l'archivio vale ovunque perché la scena esce da `state.scenes`. Unificare nel
  menu delle pagine di Roll20 (R20-084) richiede di modificare la scheda del core: seguito per
  il coordinatore, non corretto qui (P3 strutturale).
- **Etichette dei tasti** (`PagSu`, `F2`, `Maiusc+F2`) scritte nei pulsanti: se l'utente
  cambia la scorciatoia nella palette B23, `title` e `aria-keyshortcuts` (decorati da B23 via
  `data-command`) mostrano quella giusta, il `<kbd>` visibile quella predefinita. P3 non
  corretto per non legarsi agli interni di B23.
- **Oggetti non trascinabili al Tavolo**, **un piano alla volta**, **F2–F4 invece di F1–F4**:
  limiti già dichiarati (1, 4, 9) e motivati; la scelta esplicita «Sali/Scendi» corrisponde al
  cambio di livello con conferma di Foundry V14/Levels (FVT-080/081), non è inventata.
- **Tetti che sfumano per il DM sotto qualunque pedina**: il DM controlla tutte le pedine, come
  il GM di Roll20 (R20-097).
- **Tasto «menu contestuale»/Maiusc+F10 sul canvas** non collegato: da tastiera le stesse
  azioni stanno nella scheda Selezione (Applica, Crea prefabbricato…, Elimina).
- **Prettier sui percorsi**: `--check` segnala solo il punto e virgola finale assente, voluto
  dalla convenzione dei percorsi (`blueprint-checks/README.md`); vale anche per il percorso del
  costruttore.

### Controlli della revisione

- (a) Capacità: le nove accettazioni della scheda funzionano nel browser (percorso del
  costruttore rieseguito prima e dopo le correzioni). (b) Pattern: aderenza confermata; F3
  completa VTL-081/FVT-078. (c) Nessun controllo inerte trovato (i pulsanti ▲/▼ inutili ai
  limiti ora sono disattivati). (d) Coerenza: stessi attori, campagna `lanterns`, torre B35,
  libreria B28, spilli B15; la risalita del giocatore torna al piano mostrato. (e) Ruoli,
  privacy, senza rete, Annulla: nuovi comandi passano da `run`/`ctx.commit` (rifiuto senza
  rete, Annulla con nome); preferenze personali ora salve dall'Annulla. (f) IT/EN, tastiera
  (F2), 390 px senza scorrimento orizzontale, controlli ≥ 40 px (F6). (g) Test significativi,
  7 nuovi. (h) Nessuna modifica condivisa. (i) Collocazione B61 rispettata: scheda «Scena»
  della barra destra, livelli della mappa, menu della pedina, comandi; niente pulsanti nuovi
  nelle intestazioni.

### File toccati dalla revisione

Solo file dell'area: `scene-assets.mjs` (`afterUndo`), `scene-assets-domain.mjs`
(`keepPersonal`, altezza del ramo in `moveFolder`), `scene-assets-prep.mjs` (`propMenu`,
`prepActions.placeArmed`, `prepActions.propMenuAction`, menu degli oggetti con clic destro e
tocco lungo, Invio sul canvas, posizione in metri e «Modifica…» delle scale, lingua all'import
UVTT), `scene-assets-table.mjs` (via del ritorno del giocatore, ▲/▼ ai limiti, commento),
`uvtt-import.mjs` (`lang`), `scene-assets.css` (anello «trovato», 40 px),
`tests/scene-assets.test.mjs` (+6), `tests/uvtt-import.test.mjs` (+1), nuovo
`changes/interview-01/blueprint-checks/scene-assets-review-journey.js`.

### Verifiche dopo le correzioni

- Test prima rossi: i 7 nuovi test fallivano tutti prima delle correzioni.
- `node --test design/blueprint/tests/scene-assets.test.mjs design/blueprint/tests/uvtt-import.test.mjs`
  → 31/31.
- `node --test design/blueprint/tests/*.test.mjs` → 2021/2021.
- Percorso del costruttore (copia con cartella delle prove `B47-rf/after/`) → tutti i passi
  superati, nessun errore di pagina (`journey-after-output.txt`).
- Percorso di revisione
  `playwright-cli -s=d20-b47-rf --raw run-code --filename=changes/interview-01/blueprint-checks/scene-assets-review-journey.js`
  → F1–F9 superati, nessun errore di pagina (`review-journey-output.txt`). Schermate:
  `f3-object-context-menu.png`, `f3-phone-long-press-menu.png`, `f2-stair-dialog-position.png`,
  `f4-player-way-back.png`.
