# Incremento 8 — contratto API riposi/tempo

23/09/2026. Autore `/root/review_journey`. Contratto del dominio consegnato per integrazione e review distinta; verifiche e limiti in [evidenza dominio](blueprint-rest-domain.md). Fonte: [R192](blueprint-rest-time-research.md). Unico modulo `design/blueprint/rest-time.mjs`; mutatori sullo store comune, preview pure. Nessun orario reale, calendario generico o secondo contatore delle risorse.

## Stato e autorità

`state.restTime = {version:1, clocks:{[campaignId]:{seconds,revision}}, rests:[], rolls:[], events:[]}`. Inizializzazione lazy tramite `initializeRestTime(state)`; clock narrativo relativo inizialmente zero, senza data reale inventata. Gli appuntamenti restano separati.

Rest `{id,kind,campaignId,owner,participants,revision}`. Partecipante `{actorId,status,elapsedSeconds,requiredSeconds,sleepSeconds,lightSeconds,tranceSeconds,tranceRequiredSeconds,activity,interruptions,benefits,lastLongCompletedAt}`. Status `resting|interrupted|completed|cancelled`. Beneficio `{id,kind,at,applied,closed,results}`: un lungo interrotto dopo un'ora applica subito un breve distinto identificato da `interruptionId`; non aspetta ripresa o conferma per i recuperi deterministici. Sono proiettati soltanto attori visibili; controllo tramite `canControlActor`, personale privato escluso dall'autorità universale DM. La membership corrente viene rivalidata nelle query e nei comandi di campagna, compresi retry e risoluzione HD. La storia personale rimane del proprietario originario anche quando la scheda viene successivamente condivisa.

Profilo eseguibile esplicito `actor.restProfile = {source, longRestSeconds?:14400|28800, sleepRequiredSeconds?:0|21600, trance?:boolean, recoveries?:[], arcaneRecovery?:{wizardLevel,featureId?,used?,source}}`. Non derivato da nome/specie/classe tradotti. Recovery `{id,target:{kind:'spellSlots'|'pactSlots'|'feature'|'spell'|'item',id?,resourceId?},trigger:'short'|'long'|'dawn',operation:'all'|'reduce-used',amount?,source}`. Gli ID puntano a istanze esistenti; `resourceId` deve corrispondere quando dichiarato. Fonti authored/house-rule esplicite sono ammesse, prosa non interpretata. HP/HD seguono SRD; non si creano pool mancanti o si ricaricano pool rimossi/max0. Le policy `dawn` sono conservate ma non eseguite da breve/lungo o da un salto di ore.

Quando `arcaneRecovery.featureId` esiste, max/used della feature sono l'unico saldo: getter, uso e lungo leggono/scrivono quel contatore e relativo ledger. `used` nel profilo serve soltanto alle fixture esplicite senza feature. Il getter espone il valore derivato `0|1|null`, oltre a `max` e `path`; livello mago0 rende la capacità inattiva e impedisce reset della sua storia.

Roll `{id,restId,campaignId,benefitId,actorId,owner,die,sides,mode,modifier,status,acceptedFace,source,result}`. `campaignId` conserva il contesto originale per la privacy anche dopo Undo del riposo. `acceptedFace` è immutabile, distinta da `status` e da applicazione. Undo di resolve riporta pending mantenendo la faccia: resolve la riusa e rifiuta una faccia diversa. Undo che elimina tentativo/riposo lascia evidenza reversed, non applicabile. Root integra la conservazione nello store, senza clear/history barrier. Tutti i comandi sono normalmente annullabili: `commit={local,visibility}` **senza** `undoable:false`.

## Firme fissate

I mutatori rivolti alla UI hanno `viewer` e ultimo `options={online?,reviewKey?}`; richiedono IDs di comando ove indicato. Gli adattatori interni in fondo sono distinti. `online:false` vieta mutazioni condivise, non personali. Errori: Error con `it`, `en`, `code`. Preview `{canApply,errors,warnings,reviewKey,commit,...}`; issue `{code,it,en}`. Revalidation su dati pertinenti, non note estranee. IDs/retry non duplicano effetti.

```js
initializeRestTime(state)
getRestRecoveryProfile(state, actorId, viewer)
listRests(state, viewer, {actorId?, campaignId?} = {})
getRest(state, restId, viewer)
getRestRolls(state, viewer, {actorId?, restId?} = {})
getGameTime(state, campaignId, viewer)

previewRest(state, input, viewer)
startRest(state, input, viewer, options)
// input {id, kind:'short'|'long', actorIds, campaignId:null|id,
//        activityByActor?:{[id]:'light'|'sleep'|'trance'}, elapsedSinceLastLongSeconds?}
// Il lungo segue l'ultima conclusione dell'attore, anche cambiando contesto.
// Stesso clock campagna: 16h misurate. Personale/clock diverso senza offset noto:
// attestazione elapsedSinceLastLongSeconds >=57600; errore 'long-context' se assente.

previewTimeAdvance(state, {campaignId, seconds}, viewer)
advanceGameTime(state, {id, campaignId, seconds}, viewer, options)
// DM del contesto; id identifica il singolo salto, anche round→6s.
recordPersonalRestTime(state, restId, {id, actorId, seconds}, viewer, options)
// Nessun clock condiviso per personale: durata realmente registrata, non attesa reale.
setRestActivity(state, restId, {actorId, activity}, viewer, options)
interruptRest(state, restId, {eventId, actorIds, cause}, viewer, options)
// cause 'initiative'|'damage'|'leveled-spell'|'exertion'; testo evento da solo non interrompe.
resumeRest(state, restId, {actorIds}, viewer, options)
cancelRest(state, restId, {actorIds, reason}, viewer, options)

previewRestCompletion(state, restId, {actorIds, benefitId?} = {}, viewer)
completeRest(state, restId, {id, actorIds, benefitId?}, viewer, options)
// breve: apre finestra HD; lungo: recuperi deterministici, no tiri impliciti.
finishRestRecovery(state, restId, {actorId, benefitId}, viewer, options)

beginHitDie(state, restId, {id, actorId, benefitId, die:'d8', mode:'physical'|'digital'}, viewer, options)
resolveHitDie(state, rollId, {face}, viewer, options)
// Digitale: UI genera face dentro commit e usa lo stesso resolve; nessun default fisico→digitale.
previewQuickRecovery(state, restId, {actorId, benefitId, diceOrder:['d8'], maxDice}, viewer)
// {canApply, nextDie, stopReason, average,...}; loop UI stesso begin/resolve, uno alla volta.
previewArcaneRecovery(state, restId, {actorId, benefitId, slots:{1:1,2:1}}, viewer)
applyArcaneRecovery(state, restId, {id, actorId, benefitId, slots}, viewer, options)

previewRestCorrection(state, {restId, actorId, reason, patch}, viewer)
correctRestResult(state, {id, restId, actorId, reason, patch}, viewer, options)
// patch consentita: hp, tempHp, exhaustion, hitDice/spellSlots {key:{used}}, pactSlots:{used}.
// Motivo obbligatorio, prima/dopo registrati; non sostituisce l'attore o inventario.

// Solo adapter root, dopo fatti già autorizzati dal dominio gioco: mai preview UI.
observeRestEvent(state, {eventId, actorIds, cause})
// cause anche 'activity'|'movement': chiude la finestra HD, non deduce un'interruzione.
advanceRoundTime(state, {eventId, round}, options)
// Verifica round corrente; +6 secondi una volta per ID di confine di round.
```

Risultati/preview di completamento e correzione: `rows:[{actorId,path,before,after,source,reason}]`. Rest proiettato contiene `permissions:{canControl}` per partecipante, `commit` derivato dai destinatari. Query senza accesso non rivelano nomi/pool o numero di attori nascosti. Tempo condiviso leggibile ai membri; modificabile da DM. Root adapter collega avvio iniziativa, danno e magie di livello alle interruzioni; nessun riconoscimento dal testo degli eventi.

`getRestRecoveryProfile` espone actorId/actorName, hp/maxHp/tempHp/exhaustion, hitDice, spellSlots, pactSlots, features ridotte a identità e max/used, recoveries, arcaneRecovery, source, trance/longRestSeconds/sleepRequiredSeconds/tranceRequiredSeconds, permissions e commit. `previewRest.participants[].source` attribuisce il requisito già prima dell'avvio. `getGameTime` espone seconds/revision e `permissions.canAdvance`. `previewTimeAdvance` include before/after e rows visibili; se negata restituisce before/after null, rows vuote e nessuna chiave derivata dal contesto. `resolveHitDie` restituisce `{rollId,face,modifier,rawTotal,healing,applied,overflow,before,after}`. Rapido include nextDie/stopReason/average/spentDice/remainingCap: maxDice è il massimo **totale** per quel beneficio, inclusi i dadi già spesi.

## Confini e dipendenze

- `hasBlockingConsequences`, `pendingHealing` e HD pendente impediscono applicazioni causalmente dipendenti. Nessun risultato fisico inventato. Combat attivo per l'attore impedisce avvio/completamento ordinari; una correzione autorevole è distinta.
- Attività sleep esplicita aggiunge inconscio con restId e termina concentrazione, mantenendo gli effetti collegati coerenti; avvio light non lo fa. Cambiare attività, interrompere o concludere rimuove solo la condizione di sonno di quel riposo, non un'altra causa di inconscio. Trance richiede profilo esplicito e quattro ore effettivamente trascorse in tale attività: due ore di Trance più due di attività leggera non bastano. Rimane disponibile il lungo ordinario di otto ore/sei di sonno. Attività non modellate non diventano sonno automaticamente.
- Breve: EN187/IT213. Lungo: EN185/IT213; tutti i HD, 16h tra conclusione e nuovo avvio. TempHP: EN18/IT20. Profili recupero specifico: R192, non nomi. Clock avanza riposi e scadenze temporali esplicite, non `expires:'start'|'end'` del combattimento. Alba è evento distinto, senza calendario inventato.
- Rapido richiede ordine/tetto espliciti e bonus noto; arresto quando PF mancanti < media del prossimo dado. Fisico rimane una faccia alla volta. La finestra HD si chiude esplicitamente o quando avanza tempo/inizia nuova attività incompatibile; non diventa diritto perpetuo a guarire dopo nuovi danni. Il breve maturato all'interruzione mantiene la scelta HD anche all'ingresso in iniziativa, risolte le conseguenze pendenti; una nuova azione/movimento/danno o avanzamento del tempo chiude la finestra. Tiri già iniziati si conservano.
- I recuperi del lungo interrotto seguono la lettura letterale del tempo di riposo cumulato; una nuova interruzione dopo ripresa effettiva è distinta da retry dello stesso evento. Il testo non definisce una sottrazione di ore per benefici precedenti: non viene inventata. Questo è dichiarato come interpretazione del caso ravvicinato, non osservazione di concorrenti, ed è correggibile dal controllore autorizzato.
- Root possiede store Undo/ledger e adapter combattimento/fixture; autore dominio non modifica quei moduli. Le capacità non modellate rimangono righe manuali/limiti dichiarati, non eliminate dal prodotto.
