# B50 — Dati della campagna: copia, archivio, istantanee, export e cestino: prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`) · sessione
browser `d20-b50` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B50/` (fuori dal checkout).

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B50 (CA-83…CA-88). Righe di mercato lette:
`roll20-fgu.md` (R20-066, R20-067, R20-068, R20-069, R20-083, R20-206, R20-207),
`community-services.md` (SVC-077…SVC-080, SVC-084, SVC-153), `campaign-tools.md` (CMP-210,
CMP-212, CMP-216, CMP-217, CMP-220, CMP-221 e la nota 13 «safety net layering»),
`foundry.md` (FVT-003), `vtt-light.md` (VTL-040).

## File

Nuovi, tutti dell'area `campaign-data`:

- `design/blueprint/campaign-data.mjs` — modulo d'ingresso `register(registry)`: sezione di
  campagna «Dati della campagna», dialoghi, gestori, 5 contributi (sezione, notifica
  «Esportazione pronta», comandi «Crea un'istantanea della campagna», «Esporta la
  campagna», «Apri il cestino delle campagne») e la sezione di stato `campaign-data`.
- `design/blueprint/campaign-data-domain.mjs` — dominio puro: pacchetto della campagna,
  copia, istantanee con differenze e ripristino come copia, export JSON/Markdown, import con
  validazione e anteprima, archivio, cestino a 30 giorni, eliminazione definitiva, copia di
  una scena tra campagne.
- `design/blueprint/campaign-data.css` — solo classi `.cd-*` e token esistenti.
- `design/blueprint/tests/campaign-data.test.mjs` — 15 test (dominio, registro, store
  reale con Undo e reload, gestori dell'interfaccia).
- `changes/interview-01/blueprint-checks/campaign-data-journey.js` — percorso browser.

**Nessun file condiviso modificato.** `extensions.mjs` elencava già l'area; la voce «File
toccati: extensions.mjs» della scheda non è servita. L'area usa le funzioni di dominio
esportate da B13 (`createCampaign`, `setCampaignStatus`, `listCampaigns`, `roleOf`,
`canManage`, `membershipDelta`/`applyMembershipDelta`) e `getCampaignEntry` di
`campaign-content.mjs` per la proiezione di ciò che il DM può leggere.

## Dove sta e come ci si arriva

- **Campagna › barra laterale › «Dati della campagna»** (ordine 72, accanto a Impostazioni
  70): Kanka tiene Export e Recovery nelle impostazioni della campagna (CMP-210/212), Roll20
  tiene Copy Game e Roll Back Game nella pagina del gioco (R20-066/068). Da Inizio: «Apri
  campagna» → «Dati della campagna» = **2 clic**. Al telefono: «Tutte le sezioni» → «Dati
  della campagna» (2 tocchi dalla campagna). Nessun pulsante aggiunto a intestazioni.
- Visibile a **proprietario e co-DM della campagna in corso** (`when: canManage`), non a
  un ruolo fisso: un giocatore che crea la propria campagna la gestisce lì. Il giocatore
  non vede la voce; l'indirizzo diretto mostra «Sezione non disponibile per questo ruolo».
- Notifica «Esportazione pronta · …» nella campana (B24, categoria «Altre aree»), con
  destinazione la sezione (Kanka SVC-084/SVC-153).
- Tre comandi nella palette (B23): istantanea, esportazione, cestino.
- Le copie, i ripristini e gli import compaiono subito anche in **Campagne** (B13) e, se i
  giocatori sono stati copiati, nell'elenco Campagne del giocatore.

## Modello

- **Pacchetto** (`captureBundle`): un unico oggetto per copia, istantanea ed esportazione
  JSON (`format: "d20-studio-campaign"`, `formatVersion: 1`, regole 2024 / SRD 5.2.1):
  profilo, giocatori e ruoli, scene e mappe, creature e personaggi del DM (PNG e schede di
  DM/co-DM), elenco dei personaggi dei giocatori (solo nomi), voci di diario/mondo/missioni
  **leggibili da chi agisce** (proiettate: sezioni riservate tolte), dati d'area della
  campagna (Materiali e preparazione `handouts`/`handouts-prep`, Tabelle e mazzi
  `random-tables`, Tesoro `loot`, Incontri `encounter-builder`), impostazioni «campagna».
- **Mai inclusi** (detto in ogni dialogo): calendario delle sessioni; chat, registro del
  Tavolo e tiri; schede dei giocatori (restano loro, DDB-075); note «Solo io» degli altri
  membri (non leggibili, quindi mai nel pacchetto); regole della tavola (B20), sicurezza
  (B27) e annotazioni personali (B18) della campagna originale. Le proprie note «Solo io»
  entrano solo con la casella esplicita (copia ed esportazione), mai nelle istantanee.
- **Creazione da pacchetto** (`createFromBundle`): usa `createCampaign` di B13 (record,
  proprietario, regole fisse), poi riempie la campagna parcheggiata: scene con le sole
  pedine delle creature copiate, creature come **nuove schede indipendenti** (id nuovi,
  `campaignIds` della copia, nessun controllore: Transmogrifier R20-067), voci con il loro
  autore solo se l'autore viene copiato tra i membri, dati d'area con i riferimenti alla
  campagna e alle creature rimappati. Il proprietario della copia è chi la crea; il
  proprietario originale, se copiato, diventa co-DM.
- **Stato**: `state.ext["campaign-data"] = {snapshots, exports, log}`, `undo: "preserve"`.
  I comandi sono amministrazione come quelli di B13: `{undoable:false, visibility:"private"}`
  e `rebaseHistory` con `membershipDelta` per le schede create o tolte, così l'Undo di gioco
  di chiunque non li annulla. Ogni comando ha la sua correzione esplicita (eliminare la
  copia, recuperare dal cestino, ripristinare l'archivio, eliminare l'istantanea).
- **Cestino**: la finestra è `deletedAt` (scritto da B13) + 30 giorni; le campagne scadute
  escono al primo comando sui dati successivo (`purgeExpired`, dentro ogni commit dell'area).
  L'eliminazione definitiva toglie record, dati parcheggiati, voci, istantanee, esportazioni
  e le creature che appartenevano solo a quella campagna; le schede dei giocatori perdono
  solo il collegamento; gli **appunti** (voci «note») restano ai loro autori, senza campagna
  e di nuovo «Solo io».

## Capacità → percorso → prova

| Capacità (censimento)                                                        | Percorso nell'app                                                                                                     | Comandi e risultato                                                                                                                                                                                                                                                                                                                                             | Regola / fonte                                                                                                                                           | Pattern adottato                                                                                                                                                                                                      | Prova                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-83 Copia scegliendo i componenti                                          | Dati della campagna › «Copia la campagna…»                                                                            | Dialogo con nome e 8 caselle con conteggi («2 scene · 6 pedine di creature; le 4 dei giocatori restano fuori», «3 copie indipendenti: Doran, Sentinella, Esploratore»…), «Anche le mie note «Solo io» (1)», «Cosa non si copia mai». Risultato: campagna nuova, evidenziata, in Campagne anche per il giocatore                                                 | Regole fissate a D&D 2024 / SRD 5.2.1 alla creazione (B13)                                                                                               | Roll20 Copy Game con caselle (R20-066, SVC-077); note private non trasferite (Quest Portal VTL-040)                                                                                                                   | Test «Copy Game: chosen components…», «…without players or scenes…»; percorso passi 6–8: senza Tesoro, giocatori copiati, nessuna nota «Solo io» altrui; avviata la copia (3 pedine proprie), spostato il suo goblin a 570, l'originale resta a 620 con tutte le 10 pedine. `04-copy-dialog.png`, `14-phone-en-copy-dialog.png` |
| CA-84 Archivio con elenco dei blocchi; ripristino                            | Archivio e cestino › «Archivia…» / «Ripristina»                                                                       | Il dialogo elenca i 5 blocchi reali; la riga archiviata li ripete in «Bloccato finché non la ripristini (5)»; «Ripristina» la riporta attiva                                                                                                                                                                                                                    | Blocchi applicati: `launchCampaign`, `createInviteLink`/`inviteIdentity`/`decideRequest`, `proposeTransfer` (B13); `captureBundle` e `copySceneTo` (B50) | Roll20 cold storage con elenco e «Restore Game» (R20-206, SVC-080)                                                                                                                                                    | Test «Archive lists and enforces…» (avvio, link, copia, export e destinazione rifiutati); percorso passo 12: opzione di destinazione disabilitata «— archiviata». `09-archive-dialog.png`, `10-archived-row.png`                                                                                                                |
| CA-85 Eliminazione con nome digitato, cestino e recupero                     | «Elimina…» → cestino → «Recupera» / «Elimina definitivamente…»                                                        | Nome sbagliato: errore nel dialogo, nulla cambia; nome giusto: «Nel cestino · recuperabile fino al 24 ottobre 2026 (30 giorni)»; «Recupera»; eliminazione definitiva con nome digitato di nuovo                                                                                                                                                                 | Finestra 30 giorni; scaduta → recupero rifiutato, rimozione al comando successivo                                                                        | Foundry titolo da digitare (FVT-003), conferma digitata Roll20 (R20-207), Kanka recupero 30 giorni (CMP-212); Roll20 6 mesi (SVC-079, R20-069) non adottato                                                           | Test «Delete by typing the name…» (29 giorni dopo un giorno, scadenza a 33 giorni, `purgeExpired` a 31, appunti conservati). Percorso passo 13. `11-trash.png`                                                                                                                                                                  |
| CA-86 Istantanee e ripristino come copia                                     | Istantanee › «Crea istantanea…», «Mostra differenze», «Ripristina come copia…», «Elimina»                             | «Prima della battaglia» creata da tastiera (Invio); il goblin si muove al Tavolo; «Mostra differenze» elenca «Sentinella spostato (620, 250) → (570, 250)»; «Ripristina come copia» crea una campagna nuova con il goblin a 620; la campagna in corso resta a 570. Restano le ultime 14 per campagna                                                            | Nessuna sovrascrittura della campagna in gioco                                                                                                           | LegendKeeper istantanee (14) (CMP-216), Obsidian «Show changes» e copia (CMP-221), Fantasy Grounds «Restore previous» come copia (R20-083). Rollback Roll20 che sovrascrive tutto (R20-068, SVC-078) **non** adottato | Test «Snapshot before the battle…», «…keep the last 14…», «Real store…»; percorso passi 3–5 (e Undo del Tavolo che toglie solo lo spostamento). `02-snapshot-diff.png`, `03-restore-as-copy-dialog.png`                                                                                                                         |
| CA-87 Export JSON reimportabile e Markdown leggibile; reimport con anteprima | Esporta e importa › formato, «Includi le mie note «Solo io»», «Prepara l'esportazione», «Scarica», «Importa da file…» | File veri: `le-lanterne-di-bruma-2026-09-24.d20campaign.json` (76 KB) e `.md` (6 KB) salvati nella cartella delle prove; campana +1 «Esportazione pronta»; scaricabili 120 minuti; un Markdown come import → «non è JSON leggibile», nessun dialogo; il JSON → anteprima con avvisi («I giocatori del file non entrano…») → campagna nuova del solo importatore | La nota «Solo io» del giocatore non è mai nel file; quelle del DM solo con la casella                                                                    | Kanka export JSON/Markdown, solo admin, notifica di pronto, 120 minuti (SVC-084, SVC-153, CMP-210); export completo World Anvil / LegendKeeper (CMP-220, CMP-217)                                                     | Test «Export…», «Import…» (JSON non valido, formato estraneo, versione futura, immagine non valida, scena rotta, area sconosciuta o non caricata); percorso passi 9–10. `06-export-ready.png`, `07-import-preview.png`, `export-lanterns.*`                                                                                     |
| CA-88 Copia di elementi fra le proprie campagne con avviso                   | Copia in un'altra campagna › Scena + «Verso la campagna» › «Controlla e copia…»                                       | Anteprima: pedine copiate (Doran, Sentinella, Esploratore), pedine escluse (Livia, Mira: «ognuno aggiunge il proprio»), creature copiate; se la destinazione ha già la scena (stesso id) l'avviso chiede «Sostituiscila» (prima un'istantanea automatica della destinazione) o «Aggiungila come nuova scena»                                                    | Destinazioni: solo campagne gestite e attive; archiviate elencate ma disabilitate                                                                        | Roll20 Transmogrifier: due campagne, avviso di sovrascrittura per id, «controlled-by» non copiato (R20-067); copia prima di sovrascrivere (SVC-078)                                                                   | Test «Copy a scene to another own campaign…»; percorso passo 11 (scena sostituita, un solo `old-watch`, goblin tornato a 620, istantanea `auto`). `08-scene-copy-warning.png`                                                                                                                                                   |

Ruoli, privacy e offline: il giocatore non ha la sezione e il dominio rifiuta ogni cattura
(«Solo il DM o un co-DM…»); i comandi condivisi offline sono rifiutati con il messaggio della
shell (test UI), mentre i file già pronti si scaricano. Tastiera: dialoghi nativi, Invio
invia, frecce per il formato, Esc chiude. Telefono: 390 px senza scorrimento orizzontale,
tutti i controlli ≥ 40 px (`13-phone-en-section.png`, `15-phone-en-after.png`).

## Comandi eseguiti

```sh
node --test design/blueprint/tests/campaign-data.test.mjs      # 15/15
node --test design/blueprint/tests/*.test.mjs                  # 1485/1485 (ultima esecuzione)
cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B50
playwright-cli -s=d20-b50 --raw run-code \
  --filename=…/changes/interview-01/blueprint-checks/campaign-data-journey.js   # 15 passi, nessun errore di pagina
```

Una prima esecuzione della suite completa aveva 3 file falliti di altre aree in corso
(`factions`, `journal-plus`, `quests`: moduli non ancora presenti); la successiva è verde.
Il percorso ricava dai dati attuali numero di scene e pedine (un'altra area ha aggiunto
«La torre della lanterna» durante il lavoro) invece di assumere il seme originale; alla
fine controlla in «Cosa è pronto» che B50 sia attiva senza avvisi circoscritti.

Passi del percorso (Chromium, IT 1440 × 900 poi EN 390 × 844 con tocco): (1) giocatore e DM
scrivono una nota «Solo io»; (2) sezione in due clic; (3) istantanea da tastiera; (4) il
goblin si muove al Tavolo, differenze, ripristino come copia; (5) Undo del Tavolo annulla solo
lo spostamento; (6) copia senza Tesoro; (7) il giocatore vede la copia in Campagne ma non la
sezione; (8) indipendenza verificata avviando la copia e tornando all'originale; (9) export
JSON e Markdown scaricati e letti; (10) import rifiutato per il Markdown, anteprima e import
del JSON; (11) copia di scena con avviso e sostituzione; (12) archivio e ripristino;
(13) eliminazione con nome, cestino, recupero, eliminazione definitiva; (14) reload: restano
istantanee, esportazioni, copie e attività; (15) EN 390 al tocco: istantanea, dialogo di copia,
export.

Schermate (1440 × 900 salvo le 390): `01-section-it.png` … `15-phone-en-after.png` nella
cartella delle prove, ispezionate: nessuna sovrapposizione né testo tagliato; al telefono i
nomi lunghi dei file vanno a capo.

## Limiti onesti

- **Tutto locale**: nessun lavoro in background, e-mail, server o backup nel cloud. «Pronta»
  è immediata; il file è conservato nello stato locale per 120 minuti. Il limite Kanka di
  un'esportazione al giorno non è adottato (vincolo di costo del server, non di esperienza).
- **Istantanee solo manuali** (più quella automatica prima di una sostituzione di scena):
  l'istantanea giornaliera automatica di LegendKeeper/Roll20 non c'è. Il rollback che
  sovrascrive l'intera campagna (Roll20) non è adottato di proposito. Ogni istantanea pesa
  ~46 KB nello stato locale (14 per campagna ≈ 650 KB); sfondi di scena grandi la fanno
  crescere e un salvataggio che supera la memoria locale mostra l'avviso della shell.
- **Solo la campagna in corso** si copia, si fotografa e si esporta; per le altre si passa da
  «Avvia». La copia di scene va dalla campagna in corso verso un'altra (non il contrario) e
  copia solo scene, non materiali o tabelle singole come il Transmogrifier.
- **Cestino**: il filtro «Eliminate» di B13 non conosce la finestra di 30 giorni (il suo
  «Ripristina» funziona anche dopo), finché un comando di quest'area non rimuove la campagna
  scaduta. Nella dimostrazione i 30 giorni si provano solo nei test (orologio passato
  come parametro).
- **Riferimenti nei dati d'area**: la rimappatura di `campaignId` e dei campi `…actorId`
  è generica; riferimenti con altri nomi restano come sono. Regole della tavola (B20),
  sicurezza (B27), annotazioni (B18), chat (B17) e sessioni non viaggiano.
- **Import**: controllo strutturale (tipi e forme principali, immagini e sfondi solo
  `data:` raster, id validi), non uno schema completo di ogni area; campi sconosciuti delle
  creature passano come in un salvataggio locale. Solo il formato JSON di questa app, nessun
  importatore di altri prodotti. I giocatori del file non entrano mai.
- Proprietà e permessi sono le identità dimostrative del blueprint, senza autenticazione né
  autorizzazione lato server.

## Review and fixes

24/09/2026 · revisione indipendente B50-rf (chi rivede non ha costruito l'area) · stesso
worktree · sessione browser `d20-b50-rf` · prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B50-rf/` (fuori dal checkout). Da questa
revisione il percorso scrive le sue immagini in quella cartella.

Controllati: scheda del censimento (CA-83…CA-88), righe di mercato citate, app in esecuzione
(IT 1440 e EN 390 al tocco, tastiera, offline simulato, giocatore e DM), coerenza con scheda,
campagna e Tavolo, test, collocazione (sezione di campagna, campana, palette; nessun pulsante
in intestazione né al Tavolo, corretto per un'area di amministrazione). Nessun file condiviso
modificato né dalla costruzione né dalla revisione.

### Difetti trovati e corretti

| #   | Gravità | Difetto                                                                                                                                                                                                                                                                             | Riproduzione (prima della correzione)                                                                                                                                                                                              | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P1      | Privacy: le «Scelte future» «Solo io» di un'altra identità (`personalPlans`) e il vecchio piano del proprietario (`futurePlan`) finivano nell'esportazione JSON del DM, nelle istantanee e nella copia fatta da un co-DM. Il DM non li vede sulla scheda, ma li scaricava nel file. | Membri › Personaggi: Doran assegnato al giocatore; il giocatore scrive il suo piano su Doran; il DM prepara e scarica il JSON: `exportContainsPlayerPlan=true` (`repro-a.js`, `repro-a-export.json`).                              | Corretto. Nel pacchetto ogni scheda porta solo i contenuti «Solo io» di chi cattura, e solo con la casella; mai quelli altrui, mai nelle istantanee. Una copia non dà a un nuovo proprietario il piano di un altro. La casella conta anche questi («Includi le mie note «Solo io» (N)»). Dopo: `exportContainsPlayerPlan=false` (`after-a-export.json`); test «Review: another identity's Only me plans…»; percorso passi 1 e 9.                                                                                                                                                                                                                            |
| 2   | P2      | Indipendenza: copie, ripristini e import tenevano gli stessi id di scena dell'originale. Nebbia, luci e visione (B35), aree esplorate e immagine della mappa (B28) sono salvate per id di scena, quindi copia e originale le condividevano.                                         | Copia della campagna: scene della copia `old-watch, lantern-tower`, un solo record `fog-vision.scenes["lantern-tower"]` (`repro-b.js`). Test: spegnendo la torcia nella torre della copia si spegneva anche quella dell'originale. | Corretto. Ogni scena copiata ha un id suo (`<campagna>-<scena>`) e `dataCopy.root` con la scena da cui discende. Il riconoscimento «ha già questa scena» del Transmogrifier (R20-067) usa l'origine, non l'id; «Aggiungila come nuova scena» apre una linea nuova. Viaggiano sotto i nuovi id: configurazione di nebbia e luci, visione delle pedine, immagine della scena e aspetto delle pedine (Roll20 copia le pagine «with lighting»). Le copie delle creature si riconoscono dall'origine. Test «Review: copies get their own scene ids…»; percorso passo 8 (torcia della copia spenta, quella dell'originale accesa, `17-copy-tower-torch-out.png`). |
| 3   | P2      | Coerenza: la voce «Diario, mondo e missioni» non copiava Missioni e Archivio (B43) né Mappa e calendario (B42), che le aree salvano per id di campagna. La copia mostrava 0 missioni e «Nessuna mappa ancora». Mancavano anche nell'esportazione e nelle istantanee.                | Originale: Missioni «In corso (2) … Nascoste (1)»; copia: «In corso (0) … Nessuna missione in corso»; Mappa e calendario della copia: «Nessuna mappa ancora» (`repro-b-01/02-*.png`).                                              | Corretto. Pagine, missioni, reputazioni, relazioni, mappe, luoghi ed eventi viaggiano con copia, istantanea (con differenze), ripristino, JSON e Markdown. I riferimenti a creature, scene e voci seguono la copia. Note di pagina, viste private ed eventi «Solo io» altrui mai; i propri solo con la casella. L'import passa dal `normalize` dell'area. L'eliminazione definitiva li toglie. Un Undo di gioco successivo non li cancella. Test «Review: missions…», «Review: gameplay Undo…», «Review: purge…»; percorso passo 8 (`16-copy-missions-world.png`), 9.                                                                                       |
| 4   | P3      | I tre comandi della palette comparivano anche al giocatore e poi venivano rifiutati.                                                                                                                                                                                                | Palette del giocatore, «>Esporta la campagna»: voce presente.                                                                                                                                                                      | Corretto: `when` DM/co-DM della campagna, come la sezione. Test «Review: palette…»; percorso passo 7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 5   | P3      | L'homebrew attivato nella campagna (`campaign.enabledContent`) non passava alla copia: le creature copiate che lo usano restavano senza.                                                                                                                                            | Copia di una campagna con homebrew attivo: la copia non ne ha.                                                                                                                                                                     | Corretto per copie e ripristini (le revisioni sono nella Biblioteca dello stesso account). L'import avvisa: «il file non lo contiene, riattivalo dalla Biblioteca». Test «Review: the campaign's enabled homebrew…».                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 6   | P3      | Le impostazioni delle pedine (B12: anello, taglia, rotazione, blocco, gruppi, nome vero di un nome nascosto) non viaggiavano. La motivazione «dati personali» era inesatta: sono dati del DM sulla mappa.                                                                           | Anello rosso e nome nascosto sulla Sentinella; copia: persi.                                                                                                                                                                       | Corretto: viaggiano con «Scene e mappe»; i record per creatura seguono il nuovo id. Test nello stesso caso del punto 2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 7   | P3      | I dati d'area di un file importato venivano parcheggiati senza il `normalize` della loro area. I collegamenti del diario verso voci non copiate puntavano a id inesistenti.                                                                                                         | Lettura del codice.                                                                                                                                                                                                                | Corretto: normalize all'import (area saltata se lo rifiuta); collegamenti verso voci non copiate tolti.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

Tre test del costruttore affermavano il difetto 2 (id di scena uguali nella copia): ora
verificano la stessa cosa tramite l'origine (`dataCopy.root`). Il resto è invariato.

### Verificato senza difetti

Due clic da Inizio. Sezione rifiutata al giocatore anche da indirizzo diretto. Istantanea da
tastiera, differenze pulite (solo lo spostamento), ripristino come copia senza sovrascrivere.
L'Undo del Tavolo annulla solo il gioco. Archivio con i 5 blocchi applicati. Cestino con nome
digitato, recupero ed eliminazione definitiva. Offline: ogni comando condiviso è rifiutato con
il messaggio della shell dentro il dialogo, mentre il file già pronto si scarica
(`r06-offline.png`). Palette dal DM: «Crea un'istantanea della campagna» porta alla sezione con
il dialogo aperto. EN 390 al tocco senza scorrimento orizzontale, controlli ≥ 40 px. Nessun
errore di pagina. Import del JSON della costruzione (senza dati collegati) ancora accettato.

### Non difetti e limiti che restano (con motivo)

- **Istantanee automatiche giornaliere** (LegendKeeper CMP-216, Roll20 R20-068, Obsidian
  CMP-221 sono automatiche): non adottate, P3 aperto. Servirebbe un commit annidato dentro
  l'evento `commit` di ogni area, fuori dal contratto sicuro del registro. Restano le istantanee
  con nome e quella automatica prima di una sostituzione di scena. Proposta: un hook del core
  «dopo il primo commit del giorno» (B11).
- **Cestino in Campagne (B13)**: il suo «Ripristina» nel filtro «Eliminate» non conosce i 30
  giorni. In una sessione dimostrativa non può succedere (servono 30 giorni di orologio). Il
  cestino di B50 rifiuta già il recupero scaduto. File di B13, non modificato: P3 aperto per B13.
- **Rollback Roll20 che sovrascrive** e **limite Kanka di un export al giorno**: non adottati di
  proposito (sicurezza; costo del server). Non sono difetti.
- **Libreria immagini (B28)**: nel file JSON non ci sono i riferimenti alla libreria, perché
  i file non viaggiano nell'esportazione. Una campagna importata mostra pedine e mappe con
  l'aspetto predefinito. Copie e ripristini invece li conservano.
- **Consegne delle ricompense** (B43) viaggiano come sono, come nel Copy Game di Roll20.
  Gruppo, progetti e tracker di combattimento sono sezioni globali, non per campagna: il
  loro ambito è di B13, non di B50.

### Comandi eseguiti

```sh
node --test design/blueprint/tests/campaign-data.test.mjs     # 22/22 (15 + 7 della revisione)
node --test design/blueprint/tests/*.test.mjs                 # 1643/1643 (ultima esecuzione)
cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B50-rf
playwright-cli -s=d20-b50-rf --raw run-code \
  --filename=…/changes/interview-01/blueprint-checks/campaign-data-journey.js   # 15 passi, nessun errore
```

Nuovi controlli nel percorso: il piano «Solo io» del giocatore su Doran mai nel JSON né nel
Markdown; il giocatore non ha i comandi nella palette; la copia avviata ha le sue missioni e la
sua mappa del mondo; torcia della torre spenta nella copia e ancora accesa nell'originale; JSON
con missioni e senza riferimenti alla libreria. Una prima esecuzione della suite completa aveva 2
test falliti di B43 (`journal-plus`, `quests-review`), in lavorazione in quel momento da un'altra
area; la seconda esecuzione è verde.
