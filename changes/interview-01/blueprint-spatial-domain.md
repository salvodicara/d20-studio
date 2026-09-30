# Blueprint — dominio spaziale e avvicinamento

23/09/2026. Autore dell’incremento: `blueprint_characters`, modello e sforzo
ereditati invariati. Worktree `~/Workspace/Codex/d20-studio-interview-01`.
Nessun commit, installazione, servizio remoto o intervento nell’app di produzione.

## Perimetro e fonti

File riservati: `design/blueprint/spatial.mjs`, raccordi in `combat.mjs`,
soli `previewMovement`/`moveActor` e import in `state.mjs`, test di dominio.
UI, porte e preparazione hanno altri autori. Il coordinatore esegue le prove
browser: i test sotto non sono una prova di usabilità o una partita umana.

Il comportamento segue [TABLE_MOVEMENT](../../docs/interview/TABLE_MOVEMENT.md),
[TABLE_ACTIONS](../../docs/interview/TABLE_ACTIONS.md),
[TABLE_REACTIONS](../../docs/interview/TABLE_REACTIONS.md) e la
[ricerca spaziale indipendente](blueprint-spatial-research.md).
Questa separa fonti SRD, capacità pubblicate di Foundry/Owlbear/Roll20,
moduli, patch Larian e adattamenti adottati. Non si attribuisce ai concorrenti
la precisa combinazione del blueprint o un test runtime non svolto.

`SPATIAL_SOURCES` conserva fonte SRD 5.2.1 immutabile con SHA-256 per terreno
difficile e copertura/vista, e fonte originale `blueprint-euclidean-centerpoint-v1`
per la geometria del dimostratore. La fonte di ogni parete/rettangolo è distinta:
contenuto originale `authored-demo` con revisione obbligatoria.

## Comportamento eseguibile

- Pareti e porte dichiarano separatamente `blocksMovement`, `blocksSight`,
  `blocksEffect`. Una porta aperta non blocca nessuno dei tre canali; chiusa o
  bloccata applica i propri flag. `interactionRangeMeters` positivo è richiesto
  sulle porte; i comandi e la contabilità dell’interazione appartengono a root.
- Dimensioni, scala, segmenti, flag, revisioni, identità e rettangoli sono
  validati. Geometria sconosciuta o incompleta produce un motivo generico e
  impedisce esecuzione; non diventa una scena senza ostacoli.
- Distanza euclidea continua in 2D. La griglia è un aiuto visuale e di aggancio;
  **non** si dichiara la metrica diagonale della griglia quadrata SRD.
  I punti intermedi sono conservati nell’ordine scelto. La destinazione manuale
  conserva l’aggancio/clamp precedente; i punti intermedi rimangono espliciti.
- Il terreno difficile aggiunge costo 1 per ogni 1 percorso, quindi moltiplica
  per 2; sovrapposizioni non si accumulano. Il percorso viene diviso ai confini
  del terreno e al punto esatto di esaurimento del budget. Distanza e costo sono
  campi differenti, anche nelle interruzioni per opportunità.
- Una preview giocatore ignora le pareti segrete. L’esecuzione rivalida il
  percorso accettato con tutta la geometria e lo rifiuta interamente prima di
  consumare risorse se incontra un ostacolo non previsto. Non propone una
  deviazione basata sul segreto né si arresta alla sua coordinata per rivelarlo.
- `geometryKey` è una versione locale opaca. Una modifica di scala, geometria
  o stato della porta rende obsoleta la preview. Il movimento interrotto viene
  bloccato se la geometria cambia: non sostituisce di nascosto il percorso o
  il punto d’arrivo. La chiave non è un meccanismo di sicurezza crittografica.
- Le opportunità cercano l’uscita dalla portata su ogni segmento del percorso,
  prima dell’uscita, controllando vista e percorso dell’effetto al punto reale.
  Dopo un mancato colpo o Scudo si riprende il percorso originale; dopo danno
  restano Continua/Cambia e i costi già sostenuti.
- La copertura totale impedisce il bersaglio diretto e rimuove dall’area i
  centri-token senza percorso dell’effetto. Un semplice ostacolo alla vista
  non ferma un effetto. Non vedere il bersaglio dà svantaggio; essere un
  attaccante non visto dà vantaggio. Se entrambi valgono si annullano. Dardo
  incantato e opportunità continuano a richiedere la vista esplicitamente.

## Attacco in mischia con avvicinamento

Un bersaglio fuori portata produce una preview dell’intera sequenza. Il
percorso automatico aggira gli ostacoli conosciuti con un piccolo grafo di
visibilità e può conservare un prefisso di tappe manuali. Il budget include
il terreno difficile. Nessuno Scatto viene scelto automaticamente.

Se non si può raggiungere una posizione d’attacco col movimento corrente,
il clic non esegue uno spostamento parziale. Se una conseguenza interrompe
la sequenza, Cambia abbandona l’attacco residuo senza rimborsare movimento,
reazioni o danni già applicati. Continua conserva l’intento originale.

L’avvicinamento fisico termina in `awaiting-throw`: nessuna azione d’attacco
è stata consumata, nessun dado è stato inventato. Confermare il lancio fisico
crea la richiesta durevole per le facce e consuma una sola volta. Annullare
prima del lancio conserva il movimento già eseguito. Il digitale inizia il
tiro all’arrivo usando l’autorizzazione originaria, senza impersonare il DM.

All’arrivo e prima del lancio fisico si ricontrollano bersaglio, portata,
risorse, dati e percorso dell’effetto. Un bersaglio cambiato non avvia un
secondo inseguimento automatico. La preview dei vantaggi/svantaggi usa la
posizione proposta d’arrivo, non quella precedente allo spostamento.

## API per i moduli condivisi

`spatial.mjs` non importa stato, combattimento o UI:

- `validateSceneGeometry(scene)` → motivi `{code,it,en}` senza coordinate segrete.
- `geometryKey(scene)` → stringa opaca per confronto locale.
- `tracePath(scene,start,points,{budget,role})` → `start`, `target`, `end`,
  `path`, `reachablePath`, `segments`, `distance`, `totalCost`, `cost`,
  `limited`, `blocked`, `reasons`, `geometryKey`, `metric`, `sources`.
  Ogni segmento ha `from`, `to`, `distance`, `cost`, `multiplier`, `reachable`.
- `hasLineOfSight`, `hasLineOfEffect`, `isSegmentBlocked` tengono separati i canali.
- `findApproachPath(scene,start,target,reachPixels,{role,waypoints})` restituisce
  una sequenza o `null`; nessun effetto collaterale.

`previewMovement(state,actorId,point,{waypoints,role})` mantiene i campi
precedenti e delega a `tracePath`. Ruolo omesso significa geometria completa.
`beginMovement` accetta `waypoints` e `geometryKey`; le retry della stessa
identità conservano l’operazione, scelte differenti sono rifiutate.

`previewAction` aggiunge `approach:{required,movement,available}`.
`beginAttempt` crea il record condiviso e l’eventuale movimento associato;
le richieste rimangono vuote prima del vero tiro. `projectApproaches(state,role)`
restituisce solo le sequenze controllate dal ruolo: `id`, `actorId`,
`actorName`, `actionId`, `actionName`, `status`, `movementId`, `reason`,
`canRespond`. Stati: `moving`, `awaiting-throw`, `attacking`, `blocked`,
`cancelled`, `resolved`.

`confirmApproachAttack(state,id,role)` registra l’inizio fisico reale;
`cancelApproach`/`cancelApproachAttack` chiude il seguito pronto o bloccato
senza rimborsi. Durante un’interruzione del movimento si usano invece
`resumeMovement`/`changeMovement`. `projectMovements` aggiunge `traveledCost`
e `remainingPathCost`, preservando `traveledMeters` come distanza reale.
`isIncapacitated` espone lo stesso predicato già utilizzato dal combattimento.

## Verifiche e limiti

TDD: test introdotti e visti fallire prima del dominio per geometrie, tappe,
terreno, protezione dei segreti, avvicinamento e ciclo fisico/digitale. Nuove
regressioni viste rosse prima della correzione per vista simmetrica,
vantaggio calcolato dalla posizione d’arrivo e autorità nel vecchio delegate.

Ultima verifica dell’autore: **142 test globali verdi**, inclusi **19 test
spaziali dedicati**; formattazione Prettier completata. I test precedenti di
combattimento, reazioni, dadi durevoli e undo rimangono verdi. Le fixture di
due test privacy sono aggiornate a 2d20 perché l’attaccante nascosto riceve
ora il vantaggio normativo, preservando gli assert sulla non divulgazione.

Scenari coperti: sovrapposizione terreno, arresto cumulativo a budget,
parete/porta/vetro/fumo distinti, segreti, chiave obsoleta, opportunità su
tappe con costo reale, cambio geometria durante pausa, reload fisico,
retry, avvicinamento impossibile senza consumo, OA→danno→Continua/Cambia,
bersaglio spostato, velocità zero, annullamento e attacco digitale autorizzato.

Questo incremento usa centri-token, pareti lineari infinitamente sottili e
rettangoli di terreno: non è un motore di ingombri, visione speciale, nebbia
automatica, illuminazione, dislivello, salto, volo o copertura parziale.
Il grafo campiona 32 punti d’arrivo e deviazioni vicine agli estremi delle
pareti; non dimostra l’ottimo geometrico continuo e non genera deviazioni ai
soli confini del terreno. Le tappe manuali restano disponibili. L’immagine
della mappa non viene interpretata per inventare collisioni.

La chiave di geometria e la proiezione sono protezioni del dimostratore
locale, non sostituti dell’autorizzazione server futura. Le immagini e le
forme rivelate nella mappa non sono un sistema completo di fog of war.
Questi limiti non ritirano i requisiti del contratto complessivo.

Review indipendente e prove browser sono coordinate da root; questo file
non attribuisce esiti non ancora ricevuti né chiude il goal dell’intera app.
