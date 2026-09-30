# Blueprint — reazioni e movimento interrotto, dominio

23/09/2026. Worker `blueprint_characters`, modello/sforzo ereditati invariati.
File riservati: `design/blueprint/combat.mjs`, test dominio e questa evidenza.
Store, UI, schede, fixture iniziali, Preparazione e documenti condivisi restano
agli altri autori. Non è il completamento del motore 2024 o del Goal.

## Fonti e metodo

Contratto: [TABLE_REACTIONS](../../docs/interview/TABLE_REACTIONS.md), I-017,
I-022–I-024. Ricerca indipendente prima delle nuove regole:
[blueprint-reactions-research](blueprint-reactions-research.md), con fonti
primarie EN/IT, hash, pagine, differenza fra Foundry core, modulo Midi-QOL e BG3.
Le regole SRD conservano `kind:srd`, `edition:2024`, `revision:5.2.1`, URL,
pagine e SHA256 EN `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`.

Scudo: EN7/10/105/161–162; opportunità: EN10/15/185; concentrazione: EN179.
Nessuna regola BG3 o 2014 sostituisce questi riferimenti. Il default Chiedi,
Esc senza risposta, le dipendenze e Continua/Cambia sono il raccordo locale
del contratto; non vengono attribuiti come una coda globale verificata di Midi.

## API collegata

Gli export vivono in `combat.mjs`; tutte le mutazioni si eseguono nel commit
comune. Nessun nuovo store o salvataggio parallelo.

- `beginMovement(state,{id,actorId,point,dash?},role)` registra e percorre
  il tratto confermato fino all'eventuale uscita da una portata. Identità
  stabile e stesso payload ritrovano lo stesso movimento; un payload diverso
  con lo stesso ID è rifiutato. `beginAttempt` con `actionId:dash` usa lo stesso
  percorso, conservando il formato esiti/costo già esposto dalla UI.
- `projectMovements(state,role)` espone solo movimenti controllati: posizione,
  destinazione, metri percorsi, tratto residuo, budget corrente, `status`,
  `phase`, ragione del blocco, `canRespond` e `orderCandidates`.
- `projectReactions(state,role)` espone le offerte autorizzate con tipo,
  creatura, motivo consentito, costo, riserve slot e `canRespond`/`canUse`.
  `resolveReaction(state,id,{use,slotLevel?,mode?},role)` registra una risposta
  unica. La stessa risposta è idempotente; una risposta differente non
  sovrascrive quella già accettata.
- `setReactionOrder(state,movementId,reactionIds,role)` richiede tutti gli
  eventi simultanei una volta sola e l'autorità sul turno; conserva `orderBy`.
  Ogni candidato è `{reactionId,actorId,actorName}`. L'ordine di arrivo o clic
  non autorizza la risoluzione di un evento successivo.
- `resumeMovement(state,id,role)` continua il tratto confermato dopo il danno;
  `changeMovement(state,id,role)` lo abbandona dalla posizione raggiunta,
  senza restituire danni, movimento, azione o reazioni. Le opportunità ancora
  inutilizzate del tratto abbandonato diventano non più applicabili.
- `hasBlockingConsequences(state,actorId?)` considera le dipendenze della
  creatura indicata; per default usa quella del turno corrente. Non è un
  contatore pubblico delle richieste segrete di tutto il tavolo.
- `refreshConsequences(state)` segue correzioni esplicite: termina una
  concentrazione divenuta incompatibile, fa scadere richieste di un'istanza
  terminata/sostituita o reazioni non più utilizzabili e rivaluta i seguiti.
- `resolveAutomaticRolls(state,rollDie)` esegue soltanto attacco/danno del
  soggetto di un tentativo digitale già autorizzato (`acceptedBy`). Non
  sceglie reazioni, non tira TS o concentrazione e non concede a chi risponde
  a Scudo controllo manuale sui dadi nemici. Restituisce gli identificativi
  dei risultati generati; le facce passano dal normale `resolveRoll`/registro.

`state.movements[]` conserva `pending`, `awaiting-choice`, `resolved`,
`changed` o `blocked`; `phase` distingue `order`, `reaction`, `roll`, `choice`
e completamento. `state.combatReactions[]` conserva `pending`, `used`,
`declined` o `expired`. Le proiezioni non sono un confine di sicurezza di un
backend: il browser dimostrativo contiene ancora lo stato sintetico completo.

## Comportamenti eseguibili

Scudo compare dopo un attacco riuscito e prima della richiesta di danno, oppure
quando Dardo incantato prende di mira la creatura. Offerta, lettura e rinuncia
non consumano nulla. Usarlo spende reazione e slot una volta, rispettando il
limite di uno slot per lanciare nel medesimo turno. Il +5 è un effetto fino
all'inizio del prossimo turno della creatura, senza riscrivere la CA base.
Il colpo originario viene rivalutato senza un nuovo d20; un naturale20 resta
critico. Dardo incantato non applica danni alla creatura protetta. Se tutti i
dardi sono bloccati, la richiesta di danno non più necessaria scade senza
inventare facce.

Il movimento è un segmento rettilineo sul piano della scena. L'intersezione
con il cerchio della portata determina il punto prima dell'uscita, anche se
il percorso partiva fuori portata ed è passato al suo interno. Si spendono
solo i metri realmente percorsi. L'opportunità usa un attacco in mischia
documentato, la vista esplicita della fixture e squadre esplicite; Disimpegno
evita l'offerta. La reazione viene spesa all'attacco effettivo anche se manca.

Un mancato o Scudo che lo rende mancato riprende automaticamente lo stesso
percorso. Danno e richieste obbligatorie collegate si completano prima di
mostrare Continua/Cambia. Un cambio esterno di posizione, velocità, scena o
turno blocca la vecchia sequenza con motivo e possibilità di abbandonarla.
Incapacitato da solo non viene convertito in velocità zero.

Il TS concentrazione segue il danno effettivo: COS e
`min(30,max(10,floor(danno/2)))`. Naturali1/20 non sostituiscono il confronto
totale/CD. La richiesta conserva `concentrationId` e `damageInstanceId`;
nessun fallimento vecchio termina una nuova istanza. Incapacitato o morte
terminano direttamente l'istanza e i `combatEffects` collegati, senza un TS
fittizio. Zero PF da solo non inventa una condizione. Dati COS mancanti
producono `needsData:true`, senza convertire null in zero; una correzione
numerica e `refreshConsequences` rendono risolvibile la richiesta.

**Convenzione dichiarata per Dardo incantato:** un TS per dardo dannoso,
identificato individualmente, anche quando i PF mostrano il totale aggregato.
Il coordinatore ha accettato questa lettura nell'autonomia già delegata.
Non è un chiarimento ufficiale 2024 trovato nelle fonti; la provenienza della
richiesta espone `interpretation`. Dopo la perdita dell'istanza, gli altri
TS della stessa istanza scadono senza dadi. La correzione comune rimane
disponibile; un futuro arbitraggio esplicito del raggruppamento non è qui
spacciato per già implementato.

## Profilo in mischia originale

`combatProfile.meleeAttack` contiene `name:{it,en}`, `reachMeters`,
`attackBonus`, `damageDice:[{count,sides}]`, `damageModifier`, `damageType` e
`source:{kind:'authored-demo',edition:'2024',revision,title}`. La revisione è
quella della modifica esplicita; non si inventa una citazione SRD per il
profilo personalizzato. `isValidMeleeProfile` è condiviso con Preparazione.
Il repertorio espone `melee-attack`, usato anche nell'opportunità; il bastone
effettivamente equipaggiato conserva il proprio percorso verificato.

## Controlli e limiti

Test eseguibili in `tests/reactions.test.mjs`: fallimenti iniziali, poi
red→green sui casi di privacy, abbandono delle opportunità residue, dati COS
mancanti e richieste divenute impossibili. Attualmente **20 test reazioni**
verdi, oltre ai **21 test combattimento** già presenti. La review successiva
ha aggiunto tre regressioni: squadre neutrali, profili parziali dei campioni
e morte esplicita nel movimento; ora i test reazioni sono **23**.

Provati uso/rinuncia/permessi/retry, reload pendente, slot per turno,
nat20 e durata Scudo, immunità Missile, confine geometrico e percorso che
attraversa la portata, Disimpegno/Scatto, OA→Scudo, ripresa automatica,
Continua/Cambia, ordine simultaneo, concentrazione e dati mancanti,
decadimento, autorità dei dadi digitali, istanza sostituita, CD30 e privacy.
Browser, tastiera, dispositivi e raccordi UI sono verificati dal coordinatore.

Confini espliciti: centro delle pedine, piano uniforme e un profilo in mischia
configurato; muri impediscono l'automatismo. Non sono implementati collisioni,
ingombri completi, elevazione/volo, cadute, trascinamenti o teletrasporto.
Non si accetta un flag generico “forzato” per indovinare le eccezioni OA.
Le opportunità simultanee con soggetti segreti richiedono mediazione esplicita
DM; non rivelano nomi o statistiche al giocatore. Più armi con portate diverse,
colpi senz'armi completi, Ready, Counterspell, opzioni automatiche per capacità,
resistenze, PF temporanei, immunità e modificatori speciali restano incrementi
successivi. La perdita di effetti collegati non equivale ancora a un motore
di ricalcolo del volo o di ogni bonus possibile.

La disposizione usa `team:party` (alleato), `team:watch` (ostile nel caso
dimostrativo) o `team:neutral`. Solo party↔watch è una relazione ostile
configurata: due stringhe diverse non bastano. I quattro campioni già
dichiarati conservano la loro squadra quando si aggiunge un profilo parziale;
un PNG nuovo non riceve automaticamente ostilità. Preparazione espone la
scelta esplicita. Morte già dichiarata (`dead:true`) impedisce nuovi movimenti
e blocca il seguito, senza dedurla dai soli PF0.

Verifica finale del worker: `node --test design/blueprint/tests/*.test.mjs`
**103/103 pass**, più controllo sintassi, Prettier e `git diff --check`.
