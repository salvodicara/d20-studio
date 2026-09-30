# Condizioni e vitalità — rapporto dominio incremento 10

23/09/2026. Autore del dominio (worktree `d20-studio-interview-01`, ramo
`codex/interview-01`). Contratto: [API accettata](blueprint-conditions-api.md);
regole: [R194](blueprint-conditions-research.md); raccordi:
[seams](blueprint-conditions-seams.md). Nessun file fuori riserva modificato,
nessun commit, nessun browser.

| File                                         | SHA-256 al rapporto                                                |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/conditions.mjs`            | `eaccc01bc499fd6c3da999190164a42f02c32a90262414d0943a6fea6e73bbd7` |
| `design/blueprint/tests/conditions.test.mjs` | `05a8bd0dc2b1ea17204395f15f3a46bf693bd7cf126fa1acbf6d248afcc91260` |

## Cosa esiste ora

Modulo ES puro, senza dipendenze nuove. Importa solo helper puri da
`character-access.mjs` e `campaign-content.mjs`; **non importa Forms né
combat**, quindi Forms/combat possono importare `hasCondition` e le proiezioni.
Non genera dadi e non conserva tiri pendenti: restituisce descrittori e applica
facce già accettate dalla coda root.

Export: `listConditionDefinitions`, `hasCondition`, `getConditionMechanics`,
`conditionAttackRules`, `conditionSaveRules`, `getConditionOverview`,
`getConditionHistory`, `previewConditionChange`, `applyConditionChange`,
`previewStand`, `standUp`, `previewVitalityChange`, `applyVitalityChange`,
`applyVitalityEvent`, `describeDeathSave`, `describeStableRecovery`,
`previewAid`, `beginAid`, `getVitalityRollState`, `applyVitalityRoll`,
`observeConditionEvent` (tutti dall’API) più **`applyConditionEvent`** (aggiunta,
vedi sotto).

Regole coperte con fonte SRD 5.2.1 EN/IT immutabile (URL, SHA-256, pagine):

- Catalogo completo delle 15 condizioni, nomi ufficiali IT/EN, effetti
  `supported` (calcolati dalla proiezione) e `manual` (dichiarati, non eseguiti).
  Le etichette manuali (`custom`) non acquisiscono regole dal nome.
- Più origini della stessa condizione: una sola meccanica, istanze distinte;
  terminarne una conserva le altre (N01). Storia e idempotenza in
  `state.conditionEvents`.
- Stringhe e oggetti legacy leggibili con ID stabili (`legacy:<id>:<n>`,
  `rest:<restId>:<id>`), senza autore/fonte inventati; il primo comando
  normalizza l’attore conservando `restId`, quindi `rest-time` continua a funzionare.
- Termini manual/clock/turn/rest/concentration osservati da
  `observeConditionEvent`; «prossimo turno» esclude il turno in corso, «turno
  corrente» vale solo per la fine del turno in corso; retry dello stesso evento
  non scade due volte; uscire dall’iniziativa non inventa turni.
- Incapacitato e Stordito 2024 non azzerano la Velocità; Paralizzato, Pietrificato,
  Afferrato, Trattenuto e Privo di sensi sì (N02, T05). Indebolimento: −2 per
  livello ai d20, −1,5 m per livello, morte a 6 (N16).
- Prono: vantaggio/svantaggio per distanza reale 1,5 m, non per categoria d’arma
  (N05); critico entro 1,5 m su Paralizzato/Privo di sensi; requisiti ignoti di
  vista/fonte/distanza restano `unresolved`.
- Rialzarsi: metà Velocità effettiva arrotondata in piedi (9 m → 4,5; 7,5 m → 3,6),
  solo movimento, `dashCount` e azione invariati; fuori iniziativa nessun budget
  speso (N03).
- Privo di sensi: Prono distinto, fine concentrazione (follow-up), caduta dei soli
  oggetti tenuti noti; ignoti → riconciliazione `held-items` (N06).
- Danno: PF temporanei prima, politica esplicita a 0 PF, danno massiccio sul
  residuo, danno a 0 = 1 fallimento (critico 2) anche se assorbito dai temporanei,
  stabilità persa col danno (N07–N13). Cura: niente resurrezione, termina solo le
  cause `zero-hp` e `knockout`, Prono resta (N13–N14). Knockout 2024 a 1 PF con
  propria causa e riposo breve deterministico (N15).
- TS contro la morte: dovuto solo a inizio turno reale o richiesta esplicita fuori
  iniziativa; 1d20 senza caratteristica, CD 10; naturale 1 = due fallimenti,
  naturale 20 = 1 PF; tre successi → stabile con periodo 1d4 ore narrative; tre
  fallimenti → morte (N09–N12). Cura prima del tiro → esito `expired` senza faccia.
- Aiuto con Medicina CD 10: consuma l’azione solo nel turno reale in iniziativa;
  stabilizza senza curare; pronto soccorso termina solo il knockout.

## Deviazioni e aggiunte rispetto all’API (esplicite)

1. **`applyConditionEvent(state, event)` — nuovo adapter fidato.** L’API non aveva
   un ingresso per conseguenze già autorizzate (Morso del Lupo che rende Prono un
   PNG non controllato dal giocatore; sonno del riposo chiuso tramite dominio).
   `{eventId, kind:"apply", actorId, conditionId, source, origin?, term?, restId?, cause?, owner?, visibility?, sourceVisibility?, immunityConfirmed?}` applica con le
   stesse conseguenze dei comandi (Privo di sensi → Prono, concentrazione, oggetti);
   `{eventId, kind:"end", actorId, instanceId|restId|cause, source, reason}` chiude
   le istanze. Immunità nota → non applicata; immunità ignota senza conferma → non
   applicata e `reconciliation: immunity-unknown` (non si dichiara la regola
   applicata). Il root può ignorarlo, ma evita di scrivere istanze a mano.
2. **Rialzarsi con Incapacitato/Stordito puro è consentito.** La frase API «respects
   actual speed zero and incapacity» è letta come incapacità che implica Velocità 0
   (Privo di sensi, Paralizzato, Pietrificato). SRD 2024 EN184/IT208 vieta azioni,
   non movimento; R194 N02/T05 lo conferma. Se il coordinatore preferisce bloccare,
   è una riga in `standPlan`. Morto o compagno non disponibile bloccano sempre.
3. **Blocchi causali di Stand come input root.** Il dominio non importa combat:
   `previewStand`/`standUp` accettano `blocking` (esito di
   `hasBlockingConsequences` calcolato dal root nello stesso commit), incluso nel
   `reviewKey` insieme alla Velocità effettiva.
4. **Knockout e danno massiccio.** Il knockout sostituisce la riduzione a 0 PF
   («invece», N15), quindi il ramo danno massiccio non si attiva. È una lettura
   combinata, dichiarata nel test.
5. **Forma di alcune proiezioni.** Catalogo: `supported/manual` sono oggetti
   `{code,it,en}`. Meccaniche: `attackDisadvantage`, `attacksAgainstAdvantage`,
   `checkDisadvantage` ecc. sono liste di motivi `{conditionId,name,requires?}`
   invece di booleani; campi extra `cannotSee`, `cannotHear`, `attackAdvantage`,
   `attacksAgainstDisadvantage`, `attacksAgainstByDistance`, `dexSaveDisadvantage`,
   `initiative`, `dead`. `d20Penalty` e `speedPenalty` sono importi positivi da
   sottrarre. `conditionAttackRules` accetta anche `targetCanSeeAttacker` e
   `attackerCanSeeTarget` (`canSeeSource` riguarda la fonte di Spaventato) e
   restituisce `{mode,advantage,disadvantage,modifier,modifierSources,criticalOnHit,canAttack,unresolved}`. `conditionSaveRules` accetta `"death"` per applicare
   l’Indebolimento al TS contro la morte.
6. **Overview.** Campo extra `vitality` (`conscious|knocked-out|dying|stable|dead|zero-hp|gone|unknown`). Le meccaniche dell’overview usano solo le istanze visibili
   al richiedente; `getConditionMechanics` sul dato grezzo le vede tutte.
   `canRequestDeathSave` è vero solo fuori iniziativa: in combattimento la richiesta
   nasce dall’hook di inizio turno del root.
7. **Descrittori.** `describeDeathSave`/`describeStableRecovery` richiedono il
   controllore e lanciano `not-due`, `resolved`, `not-stable` invece di restituire
   `null`. Medicina: modificatore da `skillModifiers.medicine` oppure SAG +
   competenza (`skills`, `expertise`, `proficiencyBonus`); altrimenti
   `medicine-unknown`. Avvelenato → svantaggio (`dice.count` 2, `context.rollMode`);
   Spaventato → avviso. La portata del soccorso non è verificata dal dominio.
8. **Comandi e storia.** `reviewKey` obbligatorio come in Forms.
   `applyVitalityEvent` accetta `sourceVisibility`/`sourceOwner` facoltativi per la
   privacy della storia. `observeConditionEvent` registra ogni `eventId` osservato,
   anche senza effetti, per l’idempotenza; le sue righe sono per il root, non
   filtrate per ruolo. Le etichette manuali sono `{id:"custom",custom:true,label}`.
   Il termine clock deve usare il clock del soggetto (`<campaignId>` o
   `personal:<actorId>`), mai ribasato.
9. **Correzioni.** `stable:true` corretto crea un periodo di recupero con follow-up
   `request-stable-recovery`; `dead:false` avvisa che non è una resurrezione; PF
   corretti sopra 0 lasciano l’incoscienza `zero-hp` con avviso e riconciliazione,
   terminabile esplicitamente. Nessuna correzione produce danno, cura o TS.
10. **Recupero da stabile.** Se al momento del d4 il clock ha già superato la
    scadenza, il PF viene recuperato nello stesso esito.

## Obblighi del root (fuori dalla mia riserva)

- `combat.mjs`: in `applyDamage` usare `applyVitalityEvent` (non sottrarre di nuovo i PF),
  propagare `critical` e la scelta knockout in mischia, poi eseguire i follow-up;
  sostituire `incapacitated`/`canSee` duplicati con `hasCondition` o
  `getConditionMechanics`; attacchi con `conditionAttackRules` e distanza reale;
  `hasBlockingConsequences` deve vedere le nuove richieste vitali.
- `rest-time.mjs`: sonno tramite `applyConditionEvent` (`restId`, `cause:"sleep"`)
  e risveglio con `kind:"end"`; completamento dei riposi →
  `observeConditionEvent({kind:"rest"})`; avvio del riposo knockout dal follow-up.
- `state.mjs`/`table.mjs`/`app.mjs`: emettere `turn-start`/`turn-end` con la turnKey
  di combat, `clock` dopo ogni avanzamento di tempo, `concentration-end` alla fine
  della concentrazione; a inizio turno chiamare `describeDeathSave` e accodare la
  richiesta; budget di movimento con la Velocità di `getConditionMechanics`;
  percorso strisciando per Prono.
- `forms-companions.mjs`: usare `hasCondition` per l’incapacità; politica
  `disappear` per i famigli; `getEffectiveActor` passato come `effectiveActor`.
- Undo: `conditionEvents` torna indietro con lo snapshot; le facce accettate dei
  tiri vitali restano nel registro dadi del root, come per gli altri tiri.
- Fixture: assegnare `vitalityPolicy` esplicite ai personaggi/PNG demo e
  `conditionImmunities` verificate; senza politica il dominio riconcilia a 0 PF.
- `DEVELOPMENT.md`: sezione incremento 10 (coordinatore).

## Verifica

- `node --test design/blueprint/tests/conditions.test.mjs`: **29/29 PASS**
  (catalogo, legacy, origini multiple, parità preview/apply, retry e conflitti,
  reviewKey vs note, offline/locale, autorità, privacy di fonti e applicazioni,
  termini turn/clock/rest/concentration, meccaniche 2024, attacchi e TS, Rialzati,
  Privo di sensi, immunità, danno/massiccio/politiche, danno a 0, TS morte 1/20,
  cura durante richiesta, stabilità e d4, knockout, correzioni, Medicina, pronto
  soccorso, Indebolimento 6, etichette manuali, adapter fidato).
- Mutazioni mirate (arrotondamento metrico di Rialzati, Stordito a Velocità 0,
  massiccio off-by-one, fallimento alla caduta, turno corrente non escluso, cura che
  sveglia il sonno, naturale 1 singolo, Prono per arma, origine privata esposta,
  memo retry rimosso, stamping privato, azione spesa fuori iniziativa, knockout
  mortale, stabilità non persa, caduta di tutto l’inventario, replay osservazione):
  ciascuna fa fallire almeno un test.
- Probe su `createStore()` reale: overview, preview/apply in `store.commit`, cura,
  PNG nascosto al giocatore, danno massiccio e reload JSON coerenti.
- Suite completa: **511 test, 505 PASS, 6 FAIL**; i 6 sono
  `tests/conditions-ui.test.mjs`, che attende il modulo UI non ancora presente.

## Limiti dichiarati

Nessuna geometria (portata dell’Aiuto, trascinamento di Afferrato, percorso
strisciando), nessuna resistenza/immunità ai danni, resurrezione, danni periodici,
TS ripetuti o effetti specifici di capacità. Vista, fonte della paura, chi afferra
o affascina restano requisiti espliciti quando ignoti. Sicurezza e ruoli sono
proiezioni locali a due identità, non un ACL di backend.

Attribuzione: materiale del _System Reference Document 5.2.1_ di Wizards of the
Coast LLC ([D&D Beyond SRD](https://www.dndbeyond.com/srd)), licenza
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Sintesi e codice sono
originali del progetto.
