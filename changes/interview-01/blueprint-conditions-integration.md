# Condizioni e sopravvivenza — integrazione root, incremento 10

23–24/09/2026. Autore dell'integrazione root (worktree `d20-studio-interview-01`,
ramo `codex/interview-01`). Base: [API](blueprint-conditions-api.md),
[raccordi](blueprint-conditions-seams.md), [dominio](blueprint-conditions-domain.md),
[UI](blueprint-conditions-ui.md), [R194](blueprint-conditions-research.md).
Nessun commit. Nessun file fuori riserva modificato. `conditions.mjs` e
`conditions-ui.mjs` non toccati: nessun bug di integrazione trovato.

| File                                                     | SHA-256 (12)   |
| -------------------------------------------------------- | -------------- |
| `design/blueprint/combat.mjs`                            | `30441e1afcce` |
| `design/blueprint/combat-ui.mjs`                         | `b3a04fa44f5e` |
| `design/blueprint/table.mjs`                             | `ace7f2193d90` |
| `design/blueprint/characters.mjs`                        | `526ccad5c2c8` |
| `design/blueprint/app.mjs`                               | `7128c92ce748` |
| `design/blueprint/state.mjs`                             | `881a163416c5` |
| `design/blueprint/rest-time.mjs`                         | `aff245573635` |
| `design/blueprint/rest-ui.mjs`                           | `a2b6b9a32330` |
| `design/blueprint/forms-companions.mjs`                  | `2543409490cf` |
| `design/blueprint/index.html`                            | `bcf8cfc3307f` |
| `design/blueprint/tests/conditions-integration.test.mjs` | `580db33762d3` |

## Cosa funziona ora, dallo stesso stato

1. **Scheda e Tavolo.** Riepilogo `Condizioni e stato` sotto le statistiche vitali
   della scheda e al posto della riga PF nell'inspector del Tavolo (barra PF
   conservata). Il pulsante PF della scheda diventa `Danni, cure e correzioni` e
   apre lo stesso pannello sul comando Correggi: la vecchia correzione diretta di
   `hp` è rimossa, così danno, cura e correzione restano eventi distinti.
   Le pedine mostrano un badge (✝ morto, ♥ morente, ✚ stabile, numero di
   condizioni) con nome completo nel titolo e nell'etichetta accessibile; la
   pedina selezionata mostra anche il testo. Solo applicazioni condivise: una
   condizione privata di un'altra identità non compare. Per una creatura osservata
   ma non controllata l'inspector mostra `Stato visibile`, senza PF.
2. **Danni una volta sola.** `applyDamage` chiama `applyVitalityEvent`
   (PF temporanei, PF, politica a 0 PF, fallimenti, morte) e poi, in quest'ordine:
   interruzione dei riposi, follow-up (fine concentrazione con effetti collegati,
   riposo knockout, scadenza richieste vitali, budget di movimento), eventuale TS
   di Concentrazione solo se la concentrazione è ancora attiva, osservazione forme.
   Critico su bersaglio a 0 PF = 2 fallimenti; un colpo entro 1,5 m su Paralizzato
   o Privo di sensi è critico anche senza 20 naturale (`criticalOnHit` del dominio).
   Knockout: casella `Colpo non letale` nell'anteprima di ogni attacco in mischia;
   vale solo se il colpo porterebbe a 0 PF. Il riposo breve parte con l'id
   deterministico della causa (`startKnockoutRest`, nuovo in `rest-time`), dopo
   l'interruzione dovuta allo stesso danno; completarlo termina solo il knockout
   (Prono resta).
3. **TS contro la morte nella coda esistente.** A ogni inizio turno reale
   (`expireTurnEffects(...,"start")`, usato da Termina turno, avvio incontro e
   rimozione del compagno corrente) una creatura a 0 PF con politica `death-saves`
   riceve un tentativo `kind:"vitality"` in `state.combatAttempts`, con una sola
   richiesta `death-save` 1d20 CD 10. Stessa finestra `Risolvi tiro`, fisico o
   digitale, breakdown, correzione motivata, Undo che conserva la faccia accettata.
   Mai continuato automaticamente (`acceptedBy:null`). Il retry dello stesso inizio
   turno non crea un secondo tiro. 20 naturale → 1 PF; 1 naturale → due fallimenti;
   terzo fallimento → morto su pedina e scheda. Cura prima del tiro: richiesta
   `expired` con motivo, nessuna faccia inventata. Medicina (Aiuto) e recupero
   stabile 1d4 usano la stessa coda; il d4 non blocca i turni.
4. **Rialzati e strisciare.** `Rialzati · 4,5 m` nella barra azioni del Tavolo
   quando la creatura controllata è Prona: anteprima dominio con Velocità
   effettiva e richieste causali pendenti (`standContextFor`), commit con
   `reviewKey`, azione e Scatto invariati. Da Prono ogni percorso (anteprima,
   avvicinamento, esecuzione, ripresa) usa l'opzione spaziale `crawling`:
   3 m costano 6 m e la didascalia della mappa lo spiega.
5. **Morso del Lupo.** Colpo su bersaglio di taglia nota Media o inferiore →
   `applyConditionEvent` Prono con fonte SRD EN 364 / IT 394 e origine (lupo,
   tentativo). Taglia o immunità ignote: nessuna applicazione, riconciliazione
   visibile nel risultato. La nota «non automatizzato» è sostituita.
6. **Termini e cause.** Fine concentrazione (combat, riposo, sostituzione dalla
   scheda) → `concentration-end`; inizio/fine turno con la turnKey di combat;
   ogni avanzamento del clock di campagna e personale → `clock`; completamento
   del riposo → `rest` per tipo e partecipanti. Retry idempotenti. Il sonno del
   riposo resta sulla sua causa `restId` (vedi deviazioni).
7. **Attacchi e salvezze.** `conditionAttackRules` alla distanza reale (anche
   all'arrivo di un avvicinamento), vista dalle stesse verifiche della scena;
   Invisibile rende non visibile. L'anteprima mostra il tiro risultante e ogni
   motivo (vantaggio/svantaggio, requisiti da verificare, Indebolimento −2×L,
   critico ravvicinato); le richieste conservano motivi e fonti del modificatore.
   Affascinato non può attaccare chi l'ha affascinato. TS Destrezza: Trattenuto dà
   svantaggio; Incapacitato/Stordito/Paralizzato/Pietrificato/Privo di sensi
   falliscono senza dado e subiscono danno pieno. TS Concentrazione con
   Indebolimento. Le vecchie letture duplicate di incapacità e cecità usano
   `hasCondition` in combat e forme.
8. **Velocità e budget.** `getEffectiveSpeed` (forme, poi condizioni) dimensiona
   reset del turno, Scatto, avvicinamento, movimento e Schivata; Velocità 0 blocca
   il movimento. Un cambio di condizione ricalcola il movimento residuo da
   `movementSpent`/`dashCount`, senza regalare né perdere metri.
9. **Undo, permessi, offline.** Condizioni, PF, TS morte e `conditionEvents`
   tornano insieme con lo snapshot; le facce accettate restano nello storico e
   diventano `Riapplica risultato noto`. Tiri vitali: solo chi controlla il
   lanciatore; le richieste personali restano private. `beginConditionRoll` usa
   `local` solo per schede personali; le scritture condivise offline sono
   bloccate dal commit e il pannello conserva gli input.

Callback su `ctx` (app.mjs): `openConditions`, `conditionActor`,
`conditionBlocking`, `conditionRolls`, `beginConditionRoll`,
`openConditionRoll`, `applyConditionFollowUps` (con `manual:true`: il danno dal
pannello interrompe i riposi e chiede anche il TS di Concentrazione).
`refreshConditionsUI` in `render()`, `resetConditionsUI` su cambio ruolo e
ripristino. `conditions-ui.css` collegato in `index.html`. `Cosa è pronto`
aggiornato IT/EN. Fine turno del Tavolo unificato in `advanceTurn`.

## Fixture e dati

`seedDemoVitality` (state.mjs), anche per salvataggi demo precedenti, solo per
gli id demo: Livia, Doran, Mira `death-saves` (SRD EN 17–18 / IT 19–20);
sentinelle `death` (EN 17 / IT 19); `conditionImmunities: []` con fonte
`authored-demo` motivata; `heldItemIds: []`; taglia Media per i personaggi e
Piccola per le creature di esempio (fatti dichiarati della demo, non citazioni
SRD); `skills: []` per Medicina con la sola Saggezza. Compagni: famiglio e
Compagno Selvatico `disappear` (fonte Trova Famiglio), compagno manuale `manual`;
immunità vuote dalla scheda SRD del profilo.

## Deviazioni dichiarate

- **Sonno lasciato nella forma legacy** `{id:"unconscious",restId,source}`.
  Instradarlo con `applyConditionEvent` aggiungerebbe l'istanza Prona che resta
  al risveglio (2024: «When this condition ends, you remain Prone») e
  normalizzerebbe le altre voci: il test esistente di `rest-time.test.mjs`
  («sleep has its own unconscious condition…») confronta la forma legacy e non
  è nella mia riserva. Il dominio legge già quella voce come causa `sleep`
  vincolata al riposo.
- Il marker `pendingTurnStart` dei compagni non registra la turnKey del turno
  rimosso (un test di forme confronta l'oggetto esatto): un termine «fine del
  turno corrente» del compagno rimosso non scade automaticamente.
- Nessuna CSS nuova (file CSS fuori riserva): badge e opacità della pedina usano
  attributi SVG.

## Verifica

- TDD: `tests/conditions-integration.test.mjs` scritto prima, fallito per API
  assenti, ora **20/20 PASS** (fixture, danno unico, 0 PF prima di CON, critici,
  knockout e suo riposo, TS morte a inizio turno e retry, nat 1/terzo fallimento
  su pedina e scheda, cura che scade la richiesta, Undo/prova/riapplicazione,
  Rialzati e strisciare, blocco causale, velocità e Velocità 0, Morso del Lupo e
  taglia ignota, fine concentrazione, termini turno/clock/riposo, motivi negli
  attacchi, fallimento automatico DES, Medicina/stabile/d4, TS fuori iniziativa e
  autorità, danno manuale con TS Concentrazione).
- **Suite completa: 544 test, 543 PASS, 1 FAIL.** Il fallimento è il confine
  voluto segnalato nei raccordi: `reactions.test.mjs` «zero hit points alone do
  not invent concentration loss…» usa Livia, che ora ha una politica esplicita.
  Con la modifica proposta sotto (verificata su una copia in scratchpad:
  reactions 23/23) la suite diventa 544/544.
- Browser reale su `http://127.0.0.1:8879/`, script
  `d20-blueprint-evidence/2026-09-23/conditions-integration-journey.js`, esito
  `.result.json`, **9/9 passaggi, 0 errori di pagina**: danno dal pannello del
  DM; Bastone con knockout fisico 15/6 (1 PF, causa propria, riposo avviato,
  badge); Prono via pannello, anteprima strisciando 3 m → 6 m, `Rialzati · 4,5 m`;
  0 PF dal pannello, quattro Termina turno, un solo TS in coda; nat 1 fisico → 2
  fallimenti; terzo fallimento → Morto su pedina e scheda; Undo → vivo con faccia
  7 conservata; telefono 390 px senza overflow. Immagini `conditions-*.png`.
  Quattro avvisi console preesistenti «Form submission canceled…» (dialogo
  sostituito durante l'invio).

## Richieste fuori riserva

1. `tests/reactions.test.mjs`, test «zero hit points alone do not invent
   concentration loss; incapacitation ends it without a fake roll»: dopo
   `const state = fixture();` aggiungere `delete state.actors.livia.vitalityPolicy;`
   (il test torna a descrivere il confine senza politica; la regola con politica è
   coperta dal nuovo test di integrazione).
2. `tests/rest-time.test.mjs` + `rest-time.mjs` (coordinatore): se si accetta la
   regola 2024 del Prono residuo, instradare il sonno con
   `applyConditionEvent({kind:"apply",conditionId:"unconscious",restId,cause:"sleep"})`
   / `{kind:"end",restId}` e aggiornare l'ultima asserzione del test del sonno a
   «resta l'origine esterna e resta Prono».
3. `DEVELOPMENT.md` (coordinatore): sezione incremento 10 con le callback `ctx`,
   `advanceTurn`, `beginVitalityRoll`/`projectVitalityRolls`/`vitalityCommit`,
   `standContextFor`, `applyConditionFollowUps`, `observeConditionTerms`,
   `getEffectiveSpeed`, `startKnockoutRest`, `seedDemoVitality`; più la riga del
   fix dadi già richiesta (rollEvidence con dice/personal/owner, riuso per gruppo,
   `superseded`, nessun rilancio).
4. `character-build.mjs`: i personaggi creati dal builder dovrebbero ricevere
   `vitalityPolicy:{zeroHp:"death-saves",source:SRD EN 17–18 / IT 19–20}`,
   `conditionImmunities` e `heldItemIds` espliciti; oggi restano senza politica e
   il dominio mostra una riconciliazione a 0 PF.
5. `styles.css`/`combat.css`: stile dedicato per `.token-status`,
   `.token-status-label` e `.combat-conditions` (ora attributi SVG e stili ereditati).

## Limiti

PF dei riposi (Dadi Vita, lungo) scritti ancora da `rest-time`: non partono mai
da 0 PF, ma un Dado Vita di una creatura in knockout non chiude quella causa.
Nessuna geometria per la portata dell'Aiuto, nessun trascinamento di Afferrato,
nessuna immunità/resistenza ai danni, periodici o resurrezione. La domanda
«vuoi il knockout?» è dichiarata prima dell'attacco (modello BG3), non chiesta al
momento del colpo. Sicurezza e ruoli restano proiezioni locali a due identità.
