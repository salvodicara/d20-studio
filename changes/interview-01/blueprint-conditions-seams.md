# Incremento 10 — raccordi condizioni e sopravvivenza

Discovery in sola lettura, 23 settembre 2026, dopo l'incremento 9.
Nessuna nuova UI/API implementata e nessuna modifica alle forme. Questa è
una mappa del codice attuale, non una verifica delle regole da aggiungere.

## Punti esistenti

| Responsabilità         | Moduli e funzioni                                                                                                                                                                                                                                                                                                                                   | Comportamento attuale da raccordare                                                                                                                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stato delle condizioni | [combat.mjs](../../design/blueprint/combat.mjs): `isIncapacitated`, `canSee`, `opportunityEligible`, `rollModeFor`; [forms-companions.mjs](../../design/blueprint/forms-companions.mjs): `incapacitated`, `allowed`                                                                                                                                 | `conditions` accetta stringhe e oggetti con `id`; esistono anche i flag `incapacitated`, `blinded`, `dead`. I due helper di incapacità sono duplicati. Cecità cerca ancora `includes("blinded")`, oltre al flag: un oggetto equivalente non passa quel ramo.                                                                                    |
| Danni e PF temporanei  | `combat.mjs`: `applyDamage`, `completeAvailableOutcomes`, `resolveRoll`                                                                                                                                                                                                                                                                             | Applica una volta l'outcome, assorbe con PF temporanei, sottrae PF fino a zero; conserva danni e assorbimento nel breakdown. Poi interrompe riposo, richiede CON e notifica forme. Nessuno stato morente/stabile/morto viene creato qui.                                                                                                        |
| Cura e correzione      | [characters.mjs](../../design/blueprint/characters.mjs): `beginHealing`, `resolveHealing`, `editHitPoints`, `patchCharacter`; [rest-time.mjs](../../design/blueprint/rest-time.mjs): `resolveHitDie`, `recoveryRows`, `completeRest`, `correctRestResult`                                                                                           | Pozione: costo all'inizio, cura al risultato; Dado Vita analogo con `acceptedFace`. Riposo lungo scrive PF massimi, esaurimento ridotto e contatori. Correzioni PF scrivono direttamente; `patchCharacter` conserva esplicitamente zero PF quando cambia il massimo. Nessuno di questi è già un motore di stabilizzazione/risveglio da PF zero. |
| Sonno                  | `rest-time.mjs`: `activity`, `wake`, `setRestActivity`, `interrupt`, `resumeRest`, `cancelRest`, `completeRest`                                                                                                                                                                                                                                     | Sonno aggiunge `{id:"unconscious",restId,source}` e termina concentrazione. Risveglio rimuove solo la condizione di quel riposo. Il test `sleep has its own unconscious condition…` richiede due origini simultanee e conserva quella estranea al risveglio.                                                                                    |
| Concentrazione         | `combat.mjs`: `requestConcentration`, `concentrationCurrent`, `endConcentration`, `expireConcentrationRequests`, `refreshConsequences`; `rest-time.mjs`: `stopConcentration`; `characters.mjs`: helper `commit`                                                                                                                                     | Tre percorsi rimuovono effetti collegati tramite `concentrationId`. Combat termina su incapacità/morte esplicite, scade richieste vecchie e notifica le forme. Rest termina per sonno/scadenza. Il commit della scheda pulisce l'istanza sostituita e chiama `refreshConsequences` sui condivisi.                                               |
| Azioni e movimento     | `combat.mjs`: `previewAction`, `beginMovement`, `advanceMovement`, `shieldAvailable`, `opportunityEligible`; [table-spatial.mjs](../../design/blueprint/table-spatial.mjs): `previewDoorInteraction`; [state.mjs](../../design/blueprint/state.mjs): `moveActor`, `spendMovement`, `grantDash`, `resetTurnMovement`                                 | Le guardie sono distribuite: l'azione controlla anche `hp<=0`; movimento usa morte/incapacità in alcuni ingressi e velocità effettiva nel percorso pendente. Porte importano `isIncapacitated`. Budget conserva `movementSpent` e `dashCount`: nuove riduzioni non devono regalare movimento o perdere quello già speso.                        |
| Turni                  | `combat.mjs`: `expireTurnEffects`; [table.mjs](../../design/blueprint/table.mjs): handler `end-turn`; [app.mjs](../../design/blueprint/app.mjs): avvio incontro; `state.mjs`: `reconcileFormsAfterMutation`; [preparation.mjs](../../design/blueprint/preparation.mjs): `startPreparedEncounter`                                                    | Effetti `combatEffects` scadono per attore/fase start/end; forme osservano gli stessi eventi. Avvio incontro e rimozione di un compagno durante il suo turno hanno ingressi distinti. `pendingTurnStart` impedisce di avviare due volte il prossimo turno. I round avanzano di sei secondi, non ogni turno.                                     |
| Tempo                  | `rest-time.mjs`: `advanceRows`, `previewTimeAdvance`, `advance`, `advanceGameTime`, `advanceRoundTime`, `recordPersonalRestTime`; `forms-companions.mjs`: `recordPersonalFormsTime`, `observeFormsEvent`                                                                                                                                            | Clock condiviso e personale sono distinti. `combatEffects.expiresAtGameTime` e concentrazione hanno già preview/scadenza per clock di campagna; forme usano `clockId/expiresAt`. Non esiste ancora una scadenza generale di ogni `conditions[]`.                                                                                                |
| Dadi e attese          | `combat.mjs`: `requestFor`, `checkedFaces`, `resolveRoll`, `projectAttempts`, `resolveAutomaticRolls`, `hasBlockingConsequences`; [combat-ui.mjs](../../design/blueprint/combat-ui.mjs): `openRoll`, `openCombatRequests`, `renderRollHistory`; `characters.mjs`: `pendingHealing`; `rest-time.mjs`: `beginHitDie`, `resolveHitDie`, `getRestRolls` | Tre registri operativi distinti: richieste combat, pozione sull'attore, dadi riposo. Solo attacco/danno già autorizzati vengono completati automaticamente; salvezze/CON restano del controllore. `needsData`, privacy d'origine, reload ed Esc sono già gestiti ma non da un'interfaccia universale.                                           |
| Undo/persistenza       | `state.mjs`: `createStore.commit/undo`, `acceptedRolls`, `preserveRestResults`, `restoreRestEvidence`                                                                                                                                                                                                                                               | Snapshot atomico della partita, log conservato, correzione esplicita; dati narrativi/accessi non vengono riavvolti. Dadi Vita conservano la faccia anche se il riposo sparisce. Combat conserva i risultati nel log dopo Undo ma non ha l'equivalente generale di `acceptedFace` sulla richiesta ripristinata.                                  |
| Creazione/avanzamento  | [character-build.mjs](../../design/blueprint/character-build.mjs): `previewCharacterDraft`, `applyCharacterDraft`; `forms-companions.mjs`: creazione compagno                                                                                                                                                                                       | Nuove istanze inizializzano `conditions:[]`; ADV preserva condizioni/concentrazione dell'attore. Il builder blocca richieste combat, pozione e Dadi Vita pendenti. Nuovi registri di attese devono entrare negli stessi controlli.                                                                                                              |

## Pericoli concreti per l'integrazione

1. **Origini, non soli nomi.** La futura condizione da PF zero non deve
   sovrascrivere quella da sonno o magia. Curare/rimuovere una fonte non
   autorizza la rimozione delle altre; normalizzare stringhe legacy senza
   inventare fonte, durata o autore.
2. **Sequenza causale a zero PF.** Un probe attuale con danno 1 su PF 1
   restituisce PF 0, nessuna condizione/morte, concentrazione attiva e CON
   pendente. È un confine deliberato coperto da `reactions.test`, non una
   regola di sopravvivenza completa. La nuova policy PC/PNG/famiglio deve
   decidere lo stato prima delle richieste conseguenti; evitare un tiro CON
   impossibile seguito dalla fine automatica dello stesso effetto.
3. **Cura diversa da resurrezione o correzione.** Passare da 0 a PF positivi
   può chiudere una specifica causa/stato; scrivere semplicemente `hp` da
   pozione, Dado Vita, lungo, correzione o ADV oggi non ha questo raccordo.
   Nessun writer ordinario scrive attualmente `dead=true`: il flag è letto
   e i test lo impostano esplicitamente.
4. **Forma e famiglio non sono morti generici.** `observeFormsEvent` termina
   la forma per incapacità/morte, distrugge famigli non manuali a PF 0 e
   rimuove pedine/turni. Conservare l'attore canonico e la causalità; non
   creare poi un tiro morte di una creatura già scomparsa né duplicare il
   passaggio di turno. I compagni manuali non usano quel ramo automatico.
5. **Immunità/resistenze ancora assenti.** Nessuno schema eseguibile trovato
   per immunità alle condizioni, resistenze/vulnerabilità ai danni o tiri
   morte/stabilizzazione. `damageType` è già metadata del tentativo, ma
   `applyDamage` non lo usa per riduzioni. Non inferire immunità da testo,
   specie o nome della forma; distinguere l'immunità a una condizione da
   quella al danno e da una limitazione causale come il sonno magico.
6. **Dado naturale e risultato già noto.** Un nuovo tipo richiesta non può
   essere aggiunto soltanto come stringa: `resolveRoll.natural` enumera
   attack/save/concentration; il renderer tratta gli altri come danno.
   Un tiro morte non deve ereditare il modificatore generico né essere
   auto-lanciato da `resolveAutomaticRolls`. Dopo Undo/reload, una faccia
   già accettata deve restare evidenza; il modello dei Dadi Vita copre anche
   richieste annullate/orfane ed è più forte della sola conservazione log.
7. **Blocchi e scadenze.** Una nuova richiesta deve essere vista da
   `hasBlockingConsequences` e dai consumer builder, riposi, forme, porte,
   turni e salvataggio geometria. Allo stesso tempo richieste non più
   applicabili vanno scadute con causa, evitando attese insolubili. Start/end,
   round e avanzamento libero del tempo non sono eventi intercambiabili.
8. **Stesso commit e query pure.** Applicazione/rimozione condizione,
   risorse, interruzione riposo, fine concentrazione, forma, movimento e
   richieste pertinenti devono rientrare nel commit già autorizzato. La
   proiezione effettiva non deve persistere un attore derivato. Undo deve
   ripristinare la meccanica lasciando privacy/revoche e risultati noti nel
   loro regime già esistente; niente cancellazione globale della history.

## Verifica svolta

Ricerca/lettura dei moduli citati; probe Node del percorso danno→PF zero.
**12/12 test mirati PASS** su `rest-time`, `state`, `combat`, `reactions`,
filtrando sonno, danni/PF temporanei, concentrazione, morte esplicita e Undo.
Questi test attestano il confine corrente; quelli che negano inferenze a
PF zero dovranno essere aggiornati consapevolmente con la policy del nuovo
incremento. Nessun browser, nessuna nuova verifica di fonti normative,
nessun claim di implementazione delle condizioni.
