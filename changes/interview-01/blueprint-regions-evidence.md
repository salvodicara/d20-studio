# B41 — Regioni, trappole e comportamenti: prove

24–25/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`) · sessione
browser `d20-b41` · cartella delle prove `~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B41/`
(fuori dal checkout).

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B41 (PR-27, PR-28, PR-29, PR-30, PR-31, TV-42).
Righe di mercato lette: `foundry.md` (FVT-082 Scene Regions, FVT-084 Monk's Active Tile
Triggers, FVT-086 Stairways, FVT-117 aree dnd5e 6.0; sintesi §14 «event → action behaviours»,
con il conflitto «script libero» contro «elenco curato»), `roll20-fgu.md` (R20-098 Reactions con
«Reaction ready», R20-164 effetti globali FG), `vtt-light.md` (VTL-100 Portals con conferma,
VTL-099 Causality, VTL-073 portali fra scene). Regole: SRD 5.2.1 EN (sha256 `8974902d…`) e IT
(sha256 `a7b88b0c…`), pagine verificate sul PDF.

## File

Nuovi, tutti dell'area `regions`:

- `design/blueprint/regions.mjs` — modulo d'ingresso `register(registry)`: strumento
  «Regioni e trappole» (gruppo Strumenti del DM), due livelli della mappa, sezione nella scheda
  Creatura, sezione di Preparazione, notifiche, voce del menu della pedina, comando della
  palette; finestre di configurazione, esecuzione, annullamento, prove e correzione.
- `design/blueprint/regions-domain.mjs` — dominio puro: sezione di stato, geometria, validazione,
  inneschi (movimento e turni), esecuzione, risolutore degli esiti, Cercare, disinnesco,
  correzione, passaggi, raccolta di trappole, proiezioni per ruolo.
- `design/blueprint/regions.css` — solo classi `.regions-*`.
- `design/blueprint/tests/regions.test.mjs` — 17 test (dominio e gestori dell'interfaccia).
- `changes/interview-01/blueprint-checks/regions-journey.js` — percorso nel browser.

File condiviso toccato (una sola modifica aggiuntiva, firme ed esiti esistenti invariati):

- `design/blueprint/combat.mjs` — due punti d'aggancio, accanto a `observeTurnPhases` (B32):
  - `observeMovementStops(observer)`: in `advanceMovement`, prima di ogni tratto rettilineo, un
    osservatore può indicare il primo punto del tratto dove succede qualcosa
    (`{fraction, stop, reason, apply}`); se viene prima di un attacco d'opportunità il
    movimento arriva lì, `apply` gira **nella stessa transazione** e, con `stop`, il movimento
    termina sul bordo (un avvicinamento per attaccare diventa «changed»). Massimo 32 fermate per
    movimento (nessun ciclo possibile). Senza osservatori il ciclo è identico a prima.
  - `resolveAttemptKind(kind, resolver)`: in `completeAvailableOutcomes`, un tentativo con un
    `kind` registrato da un'area chiama il suo risolutore con `applyDamage` del motore (stessa
    applicazione dei danni: PF temporanei, 0 PF, concentrazione, riposi, forme).
    Motivo: il movimento vive in `combat.mjs`, non in `table-spatial.mjs` (che ha solo le porte),
    e fermarsi sul bordo, chiedere il TS e applicare l'esito dopo il tiro devono stare nelle
    transazioni del movimento e del tiro, altrimenti Undo e ricarica li separano. Suite
    combattimento/reazioni/spaziali 128/128 dopo la modifica; suite completa verde (sotto).
- Non toccati: `spatial-editor.mjs`, `table-spatial.mjs`, `extensions.mjs` (l'area c'era già).
  L'editor delle regioni in Preparazione è una sezione registrata (`preparation-section`), non uno
  strumento dentro la bozza della scena: la bozza di `spatial-editor` si salva solo con «Salva
  preparazione» e non può portare lo stato vivo delle regioni (armata, scattata, individuata);
  Foundry stesso modifica le regioni sulla scena viva. `correctDoor` di `table-spatial.mjs` è
  riusata così com'è per l'azione «Porta».

Stato: `state.ext.regions` (`undo: "snapshot"`) = `{regions[], events[], checks[], library[]}` e
`state.ext["regions-rolls"]` (`undo: "preserve"`, i dadi accettati delle prove proprie restano dopo
Undo e si riusano una volta, I-229). Il TS e i danni stanno nella coda delle richieste esistente
(`state.combatAttempts`, `kind: "region"`); il Terreno difficile di una regione entra in
`scene.terrain` (righe con `regionId`) e quindi nel costo di movimento del core.

Seme sintetico coerente con lo stato: nel **Cortile dell'osservatorio** (`old-watch`) la
«Lastra a pressione» nascosta (400,350 · 50×60, fra Livia e la Sentinella), le «Brace ardenti»
visibili (200,480 · 100×80, terreno difficile, 1d4 fuoco a inizio turno), le «Scale per la
cripta» (860,520 · 80×80); nuova scena **La cripta sotto il cortile** (`old-watch-crypt`, muri
perimetrali e ossario) con le «Scale per il cortile» (80,80 · 80×80) collegate; nella raccolta
«Lastra a pressione» e «Rete che cade»; **Mira** riceve un set di Arnesi da scasso dal catalogo
SRD (`itemFromCatalog` + `giveItemToActor` di B26), unica modifica a un record esistente, fatta
solo alla prima creazione della sezione.

## Dove si trova (≤ 3 clic)

| Superficie                                                                                                                                                                              | Percorso                                                                                   | Chi                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------- |
| Strumento **Regioni e trappole**: trascina = nuova regione (si apre la configurazione); clic = scegli, secondo clic = configura; trascina una regione = spostala; frecce, Invio, Canc   | Tavolo → barra a sinistra → gruppo «Strumenti del DM» (scudo) → icona forma (2 clic)       | DM                                |
| **Configurazione** (identità, forma, terreno difficile, innesco, probabilità, una volta, ferma il movimento, elenco curato di azioni, trappola con CD, individuata/disinnescata)        | secondo clic sulla regione, Invio, «Configura…»                                            | DM                                |
| **Eventi in attesa** con anteprima, «Esegui…», «Annulla evento»; regione scelta con «Riarma», «Salva come trappola riutilizzabile», «Elimina…»; arrivi in un'altra scena con «Attiva…»  | Tavolo → scheda Creatura, sezione «Regioni e trappole» (0–1 clic); campana (B24)           | DM                                |
| **Conseguenze** della propria creatura (fermata, «Tira il tiro salvezza», «Prendi il passaggio» / «Resta qui», messaggi, ultimi eventi), **Cerca trappole**, **Disinnesca**, «Correggi» | Tavolo → scheda Creatura, sezione «Regioni e trappole»; menu della pedina «Cerca trappole» | giocatore (e DM con lo strumento) |
| **Regioni e trappole** in Preparazione: scena, mappa con «Disegna regione», elenco, «Trappole riutilizzabili» con «Piazza in questa scena», eventi recenti                              | Campagna → Preparazione → «Regioni e trappole» (2 clic)                                    | DM                                |

## Capacità → prova

| Capacità (censimento)                                                                                                                                      | Percorso                                                        | Comandi e risultato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Regola / fonte                                                                                                                                                                         | Pattern adottato                                                                                                                                                                                                                   | Prova                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-27 regioni con forma, eventi (entra/esce/inizio o fine turno) e visibilità                                                                              | strumento Regioni; Preparazione                                 | la «Lastra a pressione» si apre con «Una creatura entra», una volta, ferma il movimento; una regione trascinata apre la sua configurazione e diventa «Rete che cade»; i due commit sono **privati** nel Registro; Annulla ×2 la toglie; tastiera: Freccia giù sposta di una casella, Ctrl+Z la rimette, Invio configura, Esc chiude; il giocatore non vede né la lastra nascosta né lo strumento, vede le braci condivise                                                                                                                                                     | — (scelta d'interfaccia)                                                                                                                                                               | Scene Regions Foundry (FVT-082): forma, eventi enter/exit/turn start/turn end, visibilità; strumento nei controlli della scena (FVT-108, B61)                                                                                      | percorso (1), `01-dm-plate-config.png`, `02-player-map-hidden-plate.png`; test «registration…», «UI: config dialog…»                                                      |
| PR-28 elenco curato di azioni (costo movimento, testo, TS, condizione, teletrasporto, porta), probabilità, una volta                                       | Configurazione → «Azioni (in quest'ordine)»                     | caselle «Tiro salvezza» (caratteristica, CD, danni NdS+b e tipo, nulla/metà se riesce, condizione se fallisce), «Danni», «Condizione», «Porta» (porta della scena e stato), «Messaggio», «Scale o passaggio»; «Probabilità (%)»: il DM tira d100 all'esecuzione (80 > 50 % → «Non è scattato», nessun messaggio consegnato); «Una volta sola» → scattata finché «Riarma»                                                                                                                                                                                                      | TS, danni, condizioni SRD 5.2.1 (glossario); condizioni dall'elenco di `conditions.mjs`                                                                                                | Monk's Active Tile Triggers (FVT-084): elenco ordinato di azioni, probabilità, disattiva dopo l'innesco; Roll20 Reactions (R20-098): «Reaction ready» = **Riarma**; elenco curato al posto dello script (conflitto §14 foundry.md) | test «exit and message regions…», «validation…», «UI: config dialog…»; percorso (1) e (2)                                                                                 |
| Scheda (1)(2): «Lastra a pressione» su ingresso, TS Destrezza CD 13 poi 2d6 perforanti, una volta; Livia entra, si ferma, TS, esito dopo il tiro, «Riarma» | Tavolo, giocatore e DM                                          | Livia verso (550,380) si ferma a x 400 (bordo); il giocatore legge «si ferma: il DM sta decidendo», senza il nome della trappola, e non può proseguire; il DM vede «TS Destrezza CD 13 → 2d6 perforanti (nulla se riesce) · una volta», «Esegui…» con dadi fisici 4 + 5; Annulla ritira l'esecuzione e rieseguendo compaiono «Facce già registrate: 4, 5» (nessun nuovo tiro); il giocatore «Tira il tiro salvezza» nella finestra standard dei tiri, fisico 7 (+2) = 9: **9 danni dopo il tiro**, lastra «scattata» segnata sulla sua mappa; reload conserva; il DM «Riarma» | Trappole EN 199–200 / IT 227–228 (innesco «si muove su una piastra a pressione», Dardi avvelenati: TS Destrezza CD 13, durata istantanea); Livia +2 al TS Destrezza (mago: TS Int/Sag) | Stop token movement di Monk's (FVT-084); scheda con «Applica» dopo il tiro come le card dnd5e (FVT-138, già nel core B20)                                                                                                          | percorso (2), `03-player-stopped.png`, `04-dm-preview.png`, `05-player-result.png`, `06-dm-rearmed.png`; test «(1)(2)(6)…», «a successful save…», «Undo of the DM's run…» |
| PR-29 trappole riutilizzabili con rilevamento e disinnesco; scheda (3)                                                                                     | scheda Creatura di Mira; Preparazione → Trappole riutilizzabili | Mira (Percezione +5) «Cerca trappole» entro 3 m: fisico 3 → 8, «niente di sospetto»; «Correggi» con motivo «Letto male il dado» → 17: «Lastra a pressione» **individuata** e segnata sulla mappa del gruppo; «Disinnesca» con Arnesi da scasso (Destrezza +2) fisico 13 → 15: disinnescata, non scatta più; in Preparazione «Rete che cade» piazzata nella cripta dalla raccolta e configurata; «Salva come trappola riutilizzabile» toglie porte e passaggi (legati alla scena)                                                                                              | Ricerca [azione] EN 187 / IT 212; Dardi avvelenati: Percezione CD 15 EN 200 / IT 228; Arnesi da scasso «disattivare una trappola (CD 15)» EN 94 / IT 106                               | (nostra F-036) su regioni; dadi fisici/digitali e correzione con motivo come nel resto dell'app                                                                                                                                    | percorso (3) e Preparazione, `08-player-found.png`, `09-player-disarmed.png`, `12-dm-preparation.png`; test «(3) Search…», «(3) Disarming…», «reusable traps…»            |
| PR-31 effetti ambientali a ogni turno; TV-42 area che applica effetti; scheda (4) terreno difficile e 1d4 fuoco a inizio turno                             | Preparazione → iniziativa; Tavolo                               | combattimento Livia/Sentinella avviato dalla Preparazione; Livia entra nelle braci: 7,87 m spesi per 6,17 m (dentro costa il doppio), entrare non è l'innesco; all'inizio del suo turno successivo il DM vede «1d4 fuoco», «Esegui…» con fisico 3: PF 9 → 6; finché il DM non decide Livia non agisce; un solo evento per inizio turno                                                                                                                                                                                                                                        | In fiamme [pericolo] 1d4 fuoco all'inizio di ogni turno EN 178 / IT 208; Terreno difficile EN 14, 181 / IT 15, 217                                                                     | effetti globali FG a ogni inizio turno (R20-164); aree dnd5e con Difficult Terrain ed effetti (FVT-117)                                                                                                                            | percorso (4), `10-dm-embers.png`; test «(4) Difficult Terrain…»                                                                                                           |
| PR-30 scale e passaggi fra scene; scheda (5) Cortile ↔ Cripta con conferma                                                                                 | Tavolo, giocatore e DM                                          | Livia si ferma su «Scale per la cripta» (x 860): «Vuoi che Livia prenda…?»; «Resta qui» = rifiutato; uscire e rientrare chiede di nuovo; «Prendi il passaggio» porta la pedina alle scale della cripta (120,120); il DM «Attiva «La cripta sotto il cortile» al Tavolo»; ritorno dalle «Scale per il cortile» a (900,560) e riattivazione del cortile; durante il combattimento il passaggio verso un'altra scena attende la fine dello scontro                                                                                                                               | — (collegamento fra scene: scelta d'interfaccia)                                                                                                                                       | Stairways (FVT-086: coppie collegate anche fra scene); Owlbear Portals (VTL-100: conferma prima del teletrasporto); portali fra scene che tolgono la pedina dalla vecchia (VTL-073)                                                | percorso (5), `11-dm-crypt.png`; test «(5) stairs…», «moving on without answering…»                                                                                       |
| Scheda (6): il DM vede in anteprima e può annullare; nessuna esecuzione silenziosa                                                                         | scheda Creatura (DM), campana                                   | ogni innesco crea un evento «Da decidere (DM)» con l'anteprima e il segnale pulsante sulla regione; nulla cambia (PF, condizioni, porte, messaggi) finché il DM non esegue; Doran sulla lastra riarmata → «Annulla evento» con motivo «Doran la scavalca»: nessun danno, Doran di nuovo libero, lastra ancora armata; senza rete l'esecuzione è rifiutata                                                                                                                                                                                                                     | —                                                                                                                                                                                      | Roll20 Reactions «GM must be present» e prova con Player View (R20-098); conferma dei Portals (VTL-100)                                                                                                                            | percorso (6), `07-dm-cancelled.png`; test «(6) the DM cancels…», «UI: the DM previews…»                                                                                   |
| DM vs giocatore                                                                                                                                            | tutte                                                           | il giocatore riceve solo proiezioni (`visibleRegions`: nome pubblico, forma, stato; mai innesco, azioni, CD); prima dell'esecuzione l'evento si chiama «Evento della scena»; creazione, modifica, riarmo, spostamento, eliminazione sono commit privati nel Registro                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                      | «DM sees triggers, players only the consequences» (scheda B41)                                                                                                                                                                     | test «UI: the DM previews…», percorso (1)(2)                                                                                                                              |
| EN, telefono 390, tocco                                                                                                                                    | Tavolo su telefono                                              | scheda Creatura in inglese («Search for traps», «Latest events»), ricerca toccata e risultato, pulsanti ≥ 40 px, nessuno scorrimento orizzontale; il DM tocca lo strumento dal suo gruppo e poi le scale: scheda «Configure…» in inglese                                                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                      | barra dei pannelli B61 sul telefono                                                                                                                                                                                                | percorso (telefono), `13-phone-player-en.png`, `14-phone-dm-en.png`                                                                                                       |

## Come si vede (scelte copiate)

- **Strumento nel gruppo del DM** (Foundry Regions come controllo della scena, FVT-082/108): trascinare
  disegna un rettangolo e apre subito la configurazione, come Foundry apre la scheda della regione
  appena creata; una regione si sceglie con un clic e si configura con il secondo (Foundry: doppio
  clic), si sposta trascinandola; frecce, Invio e Canc la gestiscono da tastiera.
- **Configurazione a sezioni** come la finestra delle regioni di Foundry (Identità, Forma, Comportamenti)
  con l'**elenco curato** di Monk's al posto dello script (sintesi §14 di `foundry.md`: più sicuro per
  un DM che non programma).
- **Anteprima del DM prima dell'esecuzione** (scheda (6)): l'evento aspetta nella scheda Creatura, con
  il segnale pulsante sulla regione e la notifica nella campana; «Esegui…» è la carta con i dadi del DM
  (danni, d100 della probabilità), il TS va al giocatore nella coda dei tiri esistente: il giocatore lo
  trova anche in «Tiri e risultati» e nella campana (B24), con dadi digitali o fisici, «Riapplica
  risultato noto» dopo Undo, storico dei tiri.
- **Riarma** = «Reaction ready» di Roll20 (R20-098). **Passaggi**: la domanda al giocatore di
  Portals (VTL-100) e le coppie di Stairways (FVT-086); fra scene la pedina lascia la vecchia (VTL-073)
  e il DM attiva la nuova, perché nel prodotto il Tavolo mostra una sola scena condivisa.
- **Mappa**: un colore per tipo (trappola rossa, pericolo arancio, passaggio azzurro, area oro),
  tratteggio del terreno difficile (area dnd5e, FVT-117), bordo tratteggiato = nascosta ai giocatori,
  grigio = scattata o disinnescata, glifo e nome sopra le pedine (etichette del DM solo con lo strumento
  o con un evento in attesa).

## Comandi di verifica

```sh
cd ~/Workspace/Codex/d20-studio-interview-01
node --test design/blueprint/tests/regions.test.mjs          # 17/17
node --test design/blueprint/tests/*.test.mjs               # 1887/1887 (24/09, 17:25)
cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B41
playwright-cli -s=d20-b41 open http://127.0.0.1:8879/
playwright-cli -s=d20-b41 --raw run-code \
  --filename=~/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/regions-journey.js
```

Esito del percorso (Chromium, 1440 × 900 IT e 390 × 844 EN con tocco): 8 passi superati, nessun
errore di pagina, nessun avviso d'area in «Cosa è pronto». Immagini in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B41/`: `01-dm-plate-config.png` …
`14-phone-dm-en.png` (controllate: nessuna sovrapposizione né scorrimento orizzontale; il toast
visibile in alcune è quello del ruolo precedente, che resta qualche secondo).

## Limiti onesti

- Forme solo **rettangolari** (Foundry ha anche ellisse, poligono, buchi, quote). Una regione ha **un**
  innesco con il suo elenco di azioni (modello Monk's), non più comportamenti ognuno con i propri
  eventi (Foundry); l'ordine delle azioni è fisso per tipo e ogni tipo compare una volta.
- Gli inneschi di movimento usano il **centro della pedina** (geometria del core, euclidea e senza
  taglia); scattano solo con un movimento accettato: teletrasporto del DM (B35), piazzamento e
  passaggi non attivano «entra/esce». Inizio/fine turno solo in iniziativa.
- La probabilità si tira all'esecuzione del DM (d100 digitale o fisico), non in silenzio all'innesco
  come in Monk's: è la conseguenza della scheda (6).
- La Percezione passiva non individua da sola le trappole (il DM può spuntare «Già individuata»); lo
  spuntone di ferro della lastra (SRD) non è modellato; il disinnesco è con gli Arnesi da scasso
  (competenza letta da `toolProficiencies`, assente nei campioni). La ricerca esamina 3 m intorno
  alla creatura e il disinnesco chiede 1,5 m: adattamento del blueprint, non testo SRD.
- Le condizioni di una trappola hanno durata manuale; la prova per liberarsi (es. Atletica CD 10 della
  rete) e la «ricarica a inizio turno» dei Dardi avvelenati non sono automatiche. Il tipo di danno è
  registrato ma resistenze e immunità ai danni non sono applicate dal motore.
- Un passaggio verso un'altra scena è rifiutato durante il combattimento; il gruppo può restare diviso
  fra due scene e il Tavolo ne mostra una sola.
- Il Terreno difficile delle regioni vive in `scene.terrain` (righe con `regionId`): l'editor della
  scena in Preparazione le mostra come terreno ordinario; se il DM le modifica lì, il prossimo
  salvataggio della regione le riscrive. Una bozza di scena aperta mentre si cambia una regione con
  terreno difficile riceve il conflitto di geometria già previsto dal core.
- Il messaggio del core quando una creatura trattenuta prova a muoversi resta generico («Percorso non
  eseguibile…», `table.mjs`); la sezione della scheda Creatura spiega il motivo.
- Dimostrazione locale a due identità: la proiezione «solo conseguenze» e i commit privati non sono
  sicurezza (lo stato completo è nel `localStorage` di questo browser); nessuna sincronizzazione.
- Seme: gli Arnesi da scasso di Mira sono l'unico cambiamento a un personaggio esistente, fatto alla
  prima creazione della sezione (e dopo «Ripristina esempio»).

## Review and fixes (B41-rf, revisione indipendente)

24/09/2026 · revisore-correttore indipendente (non ha costruito B41) · stesso worktree · sessione
browser `d20-b41-rf` · prove in `~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B41-rf/`
(fuori dal checkout; `baseline/` = percorso del costruttore rieseguito prima delle correzioni).

Punto di partenza verificato: test dell'area 17/17, suite completa 1954/1954, percorso del
costruttore 8/8 (un primo tentativo si era fermato a «Doran did not trigger»: in quel momento
`special-moves.css` di B40, area in costruzione, rispondeva 404 e le etichette della fontana
catturavano il clic; al secondo giro il file c'era e il percorso è passato. Non è un difetto di
B41).

Controllato: (a) le sei verifiche della scheda nell'app vera, (b) fedeltà ai pattern citati,
(c) controlli inerti, (d) coerenza con scheda, campagna e Tavolo, (e) ruoli, privacy, senza
rete, Annulla e correzioni, errori, (f) IT/EN, tastiera, telefono 390 con tocco (anche il disegno
di una regione trascinando col dito, prova CDP), (g) test, (h) la modifica condivisa a
`combat.mjs`, (i) posizionamento B61 e registro.

### Risultati

| #   | Gravità       | Cosa succedeva (riproduzione)                                                                                                                                                                                                                                                                                                                                                                                                                                             | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | P2            | I tiri che B41 tiene nella propria sezione (Cercare, disinnesco, d100 della probabilità, correzione) non entravano nella voce del Registro e non erano annunciati con `roll-accepted` (piano del registro §2.6, come fanno B34/B46): Mira «Cerca trappole» → nessuna scheda del tiro in «Registro e chat», nessun dado animato (B56), nessuna traccia della correzione.                                                                                                   | **Corretto.** `commitRolls` in `regions.mjs` aggiunge i tiri alla voce del proprio commit (`afterCommit`) e li annuncia; `logRoll` in `regions-domain.mjs` usa i tipi condivisi (`check` per Cercare e disinnesco, `free` per il d100, con `actionName` «Cercare (trappole)»…) e mai la CD di una trappola nascosta; il d100 del DM e le prove delle creature del DM sono privati; la correzione esce come tiro `corrected` con il motivo. Nel browser: dado 3D animato, scheda «Mira · Cercare (trappole) · Prova 12» in chat, correzione «Letto male il dado» visibile. |
| F2  | P2            | Fonti dei campioni: la «Lastra a pressione» dichiarava `kind: "srd"` ma 2d6 perforanti e «una volta» vengono dalla scheda B41, non dall'SRD (i Dardi avvelenati fanno 1d3 dardi da 1d6 veleno); la «Rete che cade» citava le pagine dei Dardi e la CD 10 di disinnesco non è SRD (l'SRD dice che il filo individuato si taglia senza prova); le «Brace ardenti» citavano In fiamme come se fosse una regola d'area. Regola del progetto: mai una citazione SRD inventata. | **Corretto.** `SAMPLE_SOURCES` in `regions-domain.mjs`: ogni campione è `authored-demo` con revisione propria, dice cosa non è SRD e porta la base SRD in `basis` (Trappole EN 199–200 / IT 227–228; Rete in caduta EN 199 / IT 229, pagina verificata sul PDF IT; In fiamme EN 178 / IT 208). Nuova fonte `SOURCES.fallingNet`. I dati salvati prima restano come sono fino a «Ripristina esempio».                                                                                                                                                                      |
| F3  | P2 (fra aree) | Tre azioni Cercare separate nella scheda Creatura del giocatore, con tre tiri: B41 «Cerca trappole» (3 m, in combattimento spende l'azione), B45 «Cerca qui» (4,5 m, rifiutata in combattimento), B46 «Cerca…» (creature nascoste). Una prova di Cercare fatta con «Cerca qui» accanto alla lastra non la trova. L'SRD ha una sola azione Cercare; BG3 rivela trappole e oggetti con la stessa prova di Percezione.                                                       | **Non corretto in B41, inoltrato al coordinatore.** Serve un punto comune (una sola azione Cercare, un tiro, un raggio, a cui B41, B45 e B46 aggiungono ciò che trovano): tocca tre aree e un file condiviso, fuori dal perimetro di questo incremento. Proposta: un osservatore «search» nel dominio condiviso (come `observeTurnPhases`) chiamato dentro il commit dell'azione Cercare, con il totale e la posizione della pedina.                                                                                                                                      |
| F4  | P3            | Il giocatore leggeva «d100 30 / 50%» negli ultimi eventi di una regione eseguita: la probabilità è configurazione del DM e il d100 un tiro del DM.                                                                                                                                                                                                                                                                                                                        | **Corretto.** `resultText` mostra il d100 solo al DM.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| F5  | P3            | Dopo l'esecuzione la richiesta del TS proiettata al giocatore conteneva in `source.title` il nome del DM della regione (es. «Rete che cade» invece di «Rete»): non mostrato a schermo, ma presente nei dati proiettati.                                                                                                                                                                                                                                                   | **Corretto.** La fonte dell'evento usa il nome per il gruppo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| F6  | P3            | Al Tavolo un DM solo da tastiera non poteva scegliere una regione (selezione solo col puntatore; nessun elenco né Tab fra le regioni). Foundry ha la «Region Legend» accanto allo strumento Regioni (FVT-082).                                                                                                                                                                                                                                                            | **Corretto.** Con lo strumento attivo la scheda Creatura mostra «Regioni della scena (N)» (aperto se nessuna è scelta): Invio su una voce la sceglie e porta il fuoco su «Configura…»; poi Invio configura e le frecce sulla mappa la spostano. Provato nel percorso (passo 2) e su telefono EN.                                                                                                                                                                                                                                                                          |
| F7  | P3 (fra aree) | Il toast di B40 «Nuota per 1,56 m in acqua: 10,53 m di movimento» (percorso pianificato attraverso la fontana) sostituisce l'avviso di B41 «Livia si ferma…» anche se il movimento si è fermato sulla lastra prima dell'acqua: il testo di B40 descrive un nuoto che non è avvenuto.                                                                                                                                                                                      | **Non corretto in B41, segnalato a B40.** La scheda Creatura mostra comunque «Livia si ferma: qualcosa accade qui. Il DM sta decidendo.»; il percorso ora verifica quel testo invece del toast. Il movimento resta quello del core (`stoppedBy: region`): nessuna regressione della fermata.                                                                                                                                                                                                                                                                              |

### Non difetti (con motivo)

- **Secondo clic per configurare** invece del doppio clic di Foundry: un doppio clic fa proprio
  «scegli + configura», quindi il gesto Foundry funziona; il secondo clic lento è un'aggiunta.
- **`touch-action: none` sulla mappa di Preparazione**: è la stessa scelta di `#battle-map` nel
  core; toccare seleziona e disegna, la pagina scorre fuori dalla mappa.
- **L'anteprima del percorso non mostra la fermata**: corretto per una trappola nascosta (il
  giocatore non deve saperlo prima); la fermata avviene nel movimento accettato.
- **Modifica condivisa a `combat.mjs`** (`observeMovementStops`, `resolveAttemptKind`): letta
  riga per riga; senza osservatori il ciclo è quello di prima, il risolutore entra solo per tipi
  di tentativo sconosciuti al core, massimo 32 fermate. Suite completa verde prima e dopo.
- **Posizionamento B61**: strumento nel gruppo DM della barra a sinistra, sezione nella scheda
  Creatura, notifiche nella campana, sezione di Preparazione, voce del menu della pedina, comando
  della palette; nessun pulsante nuovo in testata, nessuna nuova scheda laterale.
- **Telefono 390**: Preparazione, finestra di configurazione (IT/EN) e disegno col dito senza
  scorrimento orizzontale; controlli ≥ 40 px.

### Limiti rimasti (non corretti)

- `actsNow` di B41 per Cercare e disinnescare in combattimento considera solo la creatura di
  turno, non i turni condivisi di B32 (`shareCurrentTurn`), perché `combat.mjs` non esporta la
  domanda «agisce ora?». P3, da aggiungere con il punto comune di F3.
- F3 e F7 restano aperti nelle rispettive aree (sopra).

### File toccati dalla revisione

Solo file dell'incremento: `design/blueprint/regions.mjs`, `design/blueprint/regions-domain.mjs`,
`design/blueprint/tests/regions.test.mjs` (armatura con `afterCommit` come `app.mjs` e un
ascoltatore `roll-accepted`; quattro test nuovi, uno aggiornato per F2),
`changes/interview-01/blueprint-checks/regions-journey.js` (cartella delle immagini `B41-rf/`;
controlli nuovi: tiri di Cercare e correzione nel Registro e in chat, elenco delle regioni da
tastiera; la fermata si verifica nel pannello invece che nel toast, vedi F7). Nessun file
condiviso modificato.

### Verifiche dopo le correzioni

```sh
cd ~/Workspace/Codex/d20-studio-interview-01
node --test design/blueprint/tests/regions.test.mjs     # 21/21
node --test design/blueprint/tests/*.test.mjs           # 1983/1983 (24/09, sera)
cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B41-rf
playwright-cli -s=d20-b41-rf --raw run-code \
  --filename=~/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/regions-journey.js
```

Percorso: 8 passi superati (1440 × 900 IT e 390 × 844 EN con tocco), nessun errore di pagina,
nessun avviso d'area. Immagini `01-…`–`14-…` in `B41-rf/`; prove mirate delle correzioni:
`p10-player-digital-search.png` (dado 3D della ricerca), `p10-player-chat.png` (scheda del tiro
in chat), `p10-dm-legend.png` e `p10-dm-legend-config.png` (elenco delle regioni da tastiera),
`p7-phone-prep.png`, `p7-phone-config.png`, `p8-phone-draw.png` (telefono).
