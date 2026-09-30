# Revisione di chiusura: riservatezza, ruoli e coerenza dei dati

30/09/2026 · worktree `d20-studio-interview-01`, branch `codex/interview-01`, candidato
`5b7223b` (albero pulito) · impronta dei 217 file `.mjs/.css/.html` di `design/blueprint`
(sha256 della lista ordinata di sha256): `a267a6c25d403306` · sessione browser
`d20-close-privacy` · server `http://127.0.0.1:8879/` · prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/close-privacy/` (fuori dal checkout). Solo
dati sintetici. Ruolo: revisore in sola lettura del codice; nessun file sorgente modificato. La
revisione precedente (mattina del 30/09) resta nel commit `5b7223b`.

## In breve

- **Le correzioni della revisione precedente reggono.** Chi viene espulso non legge più le
  schede della campagna: Doran dà «Scheda non disponibile», il Tavolo «Non fai parte di questa
  campagna», Livia resta in sola lettura. L'espulsione resta anche dopo l'Undo di un'azione
  precedente del DM. Il DM ora ritrova nei dadi 3D i tiri «Io e il DM» del giocatore.
- **Tengono anche tutte le altre prove.** Il DM non legge schede private né appunti «Solo io».
  Il giocatore non legge tiri nascosti, voci segrete, eventi del calendario solo DM, sezioni
  riservate né materiali ritirati. Il fuori rete blocca le scritture condivise e tiene quelle
  locali. PF, condizioni, inventario, slot, PE, monete, scorta, tempo di gioco e sessioni
  restano uguali su scheda, campagna e Tavolo, per giocatore e DM, dopo l'Undo e dopo il
  ricaricamento.
- **Tre rilievi P1, tutti su creature che il giocatore non deve conoscere:**
  1. l'«Istantanea» della chat ignora la nebbia e mostra al giocatore tutta la mappa con tutte le
     creature;
  2. l'elenco «Pedine in scena» nomina le creature sotto la nebbia e, se il giocatore ne sceglie
     una, ne dà quota e distanze;
  3. alcune azioni del DM su una creatura nascosta la nominano nel registro visibile a tutti:
     tiro dalla scheda, oggetto trascinato dal Compendio, richiesta di tiro.
- **Due P2 e un P3:** la richiesta dal diario mostra la CD anche quando la campagna la
  nasconde; la vista spettatore disegna sopra la nebbia la quota di una creatura nascosta;
  una visibilità di tiro non ammessa diventa «Tutti» invece di essere rifiutata.
- **Test Node:** `node --test design/blueprint/tests/*.test.mjs` **2628/2628** (`suite.log`).

## Metodo

1. **Canarini in Node** (`probes/c4-sweep.mjs`), con le funzioni di dominio delle aree sul vero
   store. Per il giocatore: una voce «Solo io», una nota personale, una nota «Solo io» sulla
   scheda, la scheda privata Iria, un suggerimento «Solo io», un tiro «Solo io», un evento
   privato del calendario e un tiro «Solo il DM». Per il DM: una voce «Solo io», una nota, un
   tiro nascosto, una creatura con pedina nascosta, una creatura privata e un evento solo DM.
   Si aggiungono i 60 testi segreti dell'esempio. Consumatori: palette, ricerca, notifiche,
   registro e chat, dadi 3D, inoltro delle integrazioni, assistente, grafo delle relazioni,
   comunità, esportazioni e ogni contributo del registro.
2. **Giri nel browser, uno per comando** (`probes/sweep-journey.js`), come giocatore e come DM.
   Visitano 58 pagine e sezioni, 90 viste di schede (7 categorie per 10 schede, stampa e link), le sezioni del Tavolo,
   tutte le 23 finestre staccate (`#table?tab=window:…`) e la vista spettatore. In più calendario
   e cronologia con ogni giorno aperto, voci con una sezione riservata e link diretti.
3. **Scenari nuovi:** DM che agisce su una creatura nascosta, richieste di tiro, nebbia di
   guerra su Istantanea, elenco delle pedine e vista spettatore, ritiro di un materiale,
   espulsione seguita da Undo.
4. **Coerenza con clic veri:** un giro per ogni dato, con azione, lettura su ogni superficie,
   Undo dal Tavolo, ricaricamento e vista del DM.

## Esito per requisito

| Requisito                               | Come                                                                                                                                        | Esito                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schede private e «Solo io» fuori dal DM | 8 canarini, tutti i consumatori Node, 204 viste come DM; controllo positivo come giocatore (8/8 visti)                                      | **Regge**: 0 occorrenze                                                                                                                                |
| Tiri nascosti del giocatore e del DM    | Tutte le combinazioni di pubblico × chi guarda: vassoio, registro, dadi 3D, notifiche, inoltro                                              | **Regge**. Corretto il P3 di prima: il DM vede nei dadi 3D sia «Io e il DM» sia «Solo il DM»                                                           |
| Creature con pedina nascosta            | Sweep; iniziativa con «Sorpreso» sulla creatura nascosta; azioni del DM su quella creatura                                                  | **Regge** finché il DM non agisce sulla creatura; **non regge** con tre azioni del DM (P1-3)                                                           |
| Creature sotto la nebbia                | Il DM copre tutto e scopre solo l'area di Livia; il giocatore usa Tavolo, Istantanea, elenco, spettatore                                    | **Regge sulla mappa** del Tavolo; **non regge** fuori dalla mappa (P1-1, P1-2, P2-5)                                                                   |
| Voci segrete                            | 60 segreti dell'esempio, voce con sezione solo DM, voce solo DM (lista, dettaglio, link diretto, cronologia), eventi del calendario solo DM | **Regge**: 0 occorrenze; il link diretto dice «Contenuto non disponibile»                                                                              |
| Revoca                                  | Voce condivisa poi limitata ai DM; materiale mostrato a tutti poi ritirato                                                                  | **Regge**: sparisce da palette, notifiche, assistente, chat e registro. La nota del DM del materiale non arriva mai                                    |
| Membro espulso                          | Sweep completo come espulso; espulsione, poi Undo di un danno precedente                                                                    | **Regge**: 0 occorrenze; l'Undo annulla il danno (14 → 18 PF) ma non l'espulsione                                                                      |
| Fuori rete                              | Clic veri: danno sulla scheda, nota personale, chat, Undo, tiri «Tutti» e «Solo io», ricaricamento                                          | **Regge**: danno, chat, Undo e tiro «Tutti» rifiutati con il motivo; bozza della chat conservata; nota e tiro «Solo io» restano; in rete la chat passa |
| PF                                      | Danno 5 dalla scheda, Undo dal Tavolo, danno 7, ricaricamento; scheda, hotbar, ritratti, Gruppo, Inizio, DM                                 | **Regge**: 18 → 13 → 18 → 11 ovunque                                                                                                                   |
| Inventario                              | «Bevi» una pozione, Undo, ricaricamento                                                                                                     | **Regge**: ×3/18 PF → ×2/22 PF → ×3/18 PF su scheda e Tavolo                                                                                           |
| Condizioni                              | «Avvelenato» dal Tavolo, Undo, di nuovo, ricaricamento, DM                                                                                  | **Regge** su scheda, scheda Creatura e pedina                                                                                                          |
| Slot                                    | «Lancia» Mani brucianti al 1° dalla scheda, Undo dal Tavolo, di nuovo, ricaricamento, DM                                                    | **Regge**: 3/4 → 2/4 → 3/4 → 2/4 su scheda, variante di lancio e barra risorse del Tavolo                                                              |
| PE e monete                             | Il DM assegna 300 PE e 30 mo divisi tra tre; Undo; di nuovo; ricaricamento                                                                  | **Regge**: Livia 900 → 1000 PE e 30 → 40 mo su scheda (giocatore e DM) e inventario del gruppo                                                         |
| Bottino e scorta                        | Livia prende una torcia dalla scorta; Undo; ricaricamento                                                                                   | **Regge**: scorta ×5 → ×4 con Livia ×1, su scheda, pannello Bottino e pagina del gruppo                                                                |
| Tempo e calendario                      | Il DM avanza di 50 ore al Tavolo; Undo; di nuovo; ricaricamento; giocatore                                                                  | **Regge**: «Alba 14 Nebbie 08:00» → «Fiera 16 Nebbie 10:00» su calendario della campagna e pannello del Tavolo                                         |
| Sessioni                                | Il DM sposta l'appuntamento; Undo globale; ricaricamento; giocatore                                                                         | **Regge**: 1 ott 20:30 → 8 ott 21:00 su Sessioni, Panoramica e Inizio. L'Undo del gioco non lo tocca, come dice il contratto                           |
| «Vedi come» ed esportazioni             | Impostazioni della campagna e Tavolo come Livia; export del DM con e senza i propri privati                                                 | **Regge**: 0 canarini del giocatore                                                                                                                    |

## Rilievi

### P1-1 · L'«Istantanea» mostra al giocatore quello che la nebbia nasconde

**Riproduzione.** Il DM copre la scena con la nebbia e scopre solo l'area di Livia (strumento
Nebbia: «Copri tutto», poi «Rivela»). Stato: `probes/fog-state.json` da `c10-snapshot.mjs`, con le
funzioni della nebbia. Il giocatore, al Tavolo, vede solo Livia e Mira
(`snapshot-fog-table-player.png`). Poi apre Registro e chat › «Istantanea». L'anteprima, «La
scena come la vedono i giocatori», mostra tutto il cortile con muri e porte, più Doran,
Sentinella ed Esploratore con posizione e nome (`snapshot-fog-preview-player.png`,
`logs/snapshot-fog.log`). «Condividi l'istantanea» la manda a tutti e la conserva nell'archivio.
Per costruzione vale anche per la visione dinamica, per esempio la torre al buio: il codice non
consulta la visione, ma non l'ho provato nel browser.

**Causa.** `snapshotSource` (`chat.mjs:1147`) filtra le pedine con `hidden` e i muri segreti, ma
non consulta mai la nebbia né la visione.

**Modello da copiare.** BG3 fotografa quello che vede la telecamera del giocatore. La regola
interna è già scritta in fog-vision: «Tokens … the viewer cannot see are not on screen» (Foundry
nasconde le pedine non viste). L'istantanea va costruita dalla stessa proiezione del Tavolo del
giocatore: via le pedine in `hiddenTokens` e la maschera di nebbia e memoria disegnata sopra la
mappa, come fa già la vista spettatore.

### P1-2 · L'elenco «Pedine in scena» nomina e localizza le creature sotto la nebbia

**Riproduzione.** Stesso stato. Il giocatore, al Tavolo › Creatura, apre «Pedine in scena (5)»:
compaiono Doran, Sentinella ed Esploratore, tutti sotto la nebbia
(`fog-token-list-player.png`). Sceglie Sentinella: la scheda Creatura scrive «Sentinella ·
quota 3 m», Livia a 12,1 m e Mira a 15,6 m (`fog-token-list-select-player.png`). Con due
distanze note la posizione è trovata. Si può anche mandare al DM una proposta di danno.

**Causa.** L'elenco (`token-menu.mjs:4307`) e la selezione (`table.mjs:338`, `canObserve`)
guardano solo `hidden`. La nebbia agisce solo come CSS dentro `#battle-map` (`fog-vision.mjs:438`).

**Modello da copiare.** Foundry: una pedina non vista non si elenca, non si seleziona e non si
prende come bersaglio. Lo stesso `hiddenTokens` di fog-vision va usato come filtro in
`observesToken` e in `canObserve`, per il giocatore che non guida la sessione.

### P1-3 · Azioni del DM su una creatura nascosta la nominano a tutti

**Riproduzione** (creatura «CNRYD4 Ombra» con pedina nascosta, stato `probes/sweep-state.json`).

- **Tiro dalla scheda.** Il DM apre la scheda della creatura e fa un clic su «Furtività +2»,
  cioè il tiro al clic (F10), con il pubblico predefinito «Tutti». Il giocatore legge in chat
  «CNRYD4 Ombra · Prova di Destrezza (Furtività) 10» (`sheet-roll-hidden-player-chat.png`). Lo
  stesso tiro arriva anche ai dadi 3D, alle notifiche e all'inoltro delle integrazioni
  (`c8-hidden-actions.mjs`).
- **Oggetto dal Compendio.** Il DM trascina una Pozione di guarigione sulla pedina nascosta
  (X-07) e conferma. Il giocatore legge «Oggetto aggiunto dal Compendio: Pozione di guarigione
  ×1 · CNRYD4 Ombra» (`drop-hidden-player-chat.png`). Stessa cosa per un incantesimo.
- **Richiesta dal diario.** Dal diario, il DM usa «Chiedi il tiro…» su un TS incorporato e
  sceglie Livia e la creatura. Il giocatore legge in chat «Richiesta del DM: Tiro salvezza su
  Destrezza · CD 13 → Livia, CNRYD4 Ombra» (`embed-request-player-chat-crop.png`).
- **Richiesta dal vassoio.** La carta in chat nasconde la riga della creatura. La riga del
  registro, però, la nomina ed esce con l'inoltro e fra le fonti dell'assistente del giocatore
  (`c12-request-consumers.mjs`).

**Causa.** Queste righe sono condivise e non controllano `hiddenFromPlayers`:
`defaultAudience` e `rollNumber` (`dice-tray.mjs:139`, `:338`), `sheetOptions` e `addToSheet`
(`compendium.mjs:1351`, `:1393`) e le etichette delle richieste (`dice-tray.mjs:2020`, `:3283`).
Il contratto dice invece «Shared audit labels must not reveal a hidden source». Danni e
condizioni sulla stessa creatura, invece, finiscono in righe private.

**Modello da copiare.** Serve la convenzione che il prodotto usa già: `commitByVisibility` e
`secretFor` del menu della pedina (`token-menu.mjs:1147`), `hiddenFromPlayers → private` del
combattimento (`combat-ui.mjs:39`), l'HP del DM (`hp-widget.mjs:440`). Per i tiri serve anche
un altro passo, come in Fantasy Grounds (tiri del GM nascosti di serie) e nell'opzione di Roll20
«Whisper rolls to GM» per i PNG: un tiro del DM per una creatura nascosta ai giocatori parte
«Solo DM». Nelle richieste, la riga condivisa nomina solo i destinatari che i giocatori vedono.

### P2-4 · La richiesta dal diario mostra la CD quando la campagna la nasconde

**Riproduzione.** Nelle impostazioni della campagna la CD è nascosta ai giocatori (C1). Il DM
chiede il tiro da `@Embed[save:dex:13]` (stato `probes/embed-state.json`). Il giocatore legge
«· CD 13» nella riga in chat (stessa prova di P1-3). La stessa riga esce con l'inoltro.

**Causa.** Il ramo del diario (`dice-tray.mjs:3268-3283`) mette `test.dc` nell'etichetta e non
passa `logLabel`, quindi la chat non la trasforma in carta. Il ramo del vassoio (`:2008-2020`)
usa invece `dcVisibleTo` e la carta.

**Modello da copiare.** Il ramo del vassoio dello stesso file: titolo con
`titleWithDc(…, dcVisibleTo(…) ? dc : "hidden")` e `logLabel` passato a `createRequest`.

### P2-5 · La vista spettatore disegna sopra la nebbia la quota di una creatura nascosta

**Riproduzione.** Stesso stato di P1-1. In «Vista spettatore» la nebbia copre il cortile, ma in
alto a destra resta la targhetta «↑3 m» della Sentinella: posizione e quota di una creatura che
nessuno deve vedere (`spectator-fog-player.png`). Al Tavolo la stessa targhetta è nascosta.

**Causa.** Le regole che nascondono le decorazioni delle pedine non viste valgono solo in
`#battle-map` (`fog-vision.mjs:438-455`). La mappa dello spettatore è `svg.session-view-map`.

**Modello da copiare.** La stessa lista del Tavolo, estesa alla mappa dello spettatore; meglio
non disegnare affatto le decorazioni delle pedine in `hiddenTokens`.

### P3-6 · Una visibilità di tiro non ammessa diventa «Tutti»

`prepareRoll` (`dice-tray-domain.mjs:1185`) trasforma in `"public"` un pubblico che il ruolo
non può usare. Per esempio, un «Io e il DM» chiesto dal DM diventa un tiro visibile a tutti
(sonda `c4-sweep`, tiro D7). Nessun comando dell'interfaccia lo passa oggi, perché
`defaultAudience` lo converte in «Solo DM». In un prodotto con più client però è un fallimento
aperto. Modello: le altre validazioni dello stesso dominio, che rifiutano con un messaggio
(`domain.fail`).

## Causa comune dei P1-1, P1-2 e P2-5

La nebbia oggi è solo un velo CSS sulla mappa del Tavolo. Tutto quello che sta fuori dalla
mappa (elenco, selezione, istantanea, decorazioni dello spettatore) non la conosce. Una sola
funzione di fog-vision, «pedine visibili a questa identità», usata da tutte queste superfici,
chiude i tre rilievi. È anche la regola «ogni identità riceve solo la propria proiezione» che
BLUEPRINT_CONTRACT fissa per il prodotto reale.

## Limiti

- Due sole identità, giocatore e DM: non si provano fra tre persone i sussurri tra giocatori
  né i materiali mostrati a un solo personaggio di un altro giocatore.
- Il fuori rete dimostrativo vale per scheda del browser: una finestra staccata aperta dopo
  parte in rete. Limite della simulazione, non del prodotto: la rete vera vale per tutto il
  dispositivo.
- Solo Chromium, IT, 1440 × 900. Nessuna prova su telefono o in inglese: la revisione riguarda i
  dati, non la presentazione.

## Prove

Cartella `~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/close-privacy/`:

- `suite.log`; `run-journey.sh`, che esegue un percorso per comando entro 200 s;
- sonde Node in `probes/` (`c1`–`c15`, `c-p9`, `c-p10`, `c-p14`, `c-p16`) e stati generati
  (`sweep-state.json`, `removed-state.json`, `fog-state.json`, `embed-state.json`,
  `sections-state.json`, `request-state.json`);
- percorsi `probes/*-journey.js` e script `probes/*.js`; esiti in `logs/` (sweep in 3 parti × 2 ruoli,
  `removed-*`, `world-views-*`, `sections-player`, `offline`, `online-chat`, `coh-*`,
  `removed-undo`, `snapshot-fog`, `sheet-roll-hidden`, `drop-hidden`, `request-hidden`,
  `embed-request`, `viewas`);
- immagini in `shots/`.
