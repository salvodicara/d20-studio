# Blueprint — dominio di combattimento, incremento verificabile

23/09/2026. Worker `blueprint_characters`; nessun cambio di modello/sforzo.
Solo `combat.mjs`, `tests/combat.test.mjs` e questa evidenza sono riservati al
worker. UI, Tavolo, store e documenti condivisi appartengono al coordinatore.
Questo è un caso eseguibile collegato, non il completamento dell'intero motore
2024, del blueprint o del Goal.

## API consegnata

Tutti gli export sono in `design/blueprint/combat.mjs` e non dipendono dal DOM.
Le mutazioni vanno eseguite nel `ctx.commit` comune: la simulazione persiste
così i tentativi insieme alla medesima scheda e al medesimo inventario.

- `listActions(state, actorId)` restituisce definizioni senza modificare dati:
  `id`, `name`/`shortDescription` EN/IT, `kind`, `targetMode`, `cost`,
  `rangeMeters`, `dice`, `source`; magie con slot espongono `slotLevels`.
- `previewAction(state, actorId, actionId, selection, role='player')` restituisce
  `action`, `available`, `reasons:[{code,it,en}]`, `targets:[{actorId,name,
distanceMeters}]`, `cost`, `geometry` e, quando pertinente, `movement` oppure
  `rollMode`. Per Scatto `effectiveDash` distingue il movimento normale
  (`cost.action:0`) da quello che richiede l'azione (`cost.action:1`).
  È una preview pura, ammessa anche quando il turno non consente
  l'esecuzione. Le ragioni non contengono numeri difensivi segreti.
- `beginAttempt(state, {id,actorId,actionId,selection,mode}, role)` valida la
  situazione corrente, spende al tentativo effettivo e salva in
  `state.combatAttempts[]`. `id` è obbligatorio e stabile per i retry: stesso
  payload ritrova il tentativo, payload diverso con stesso ID viene rifiutato.
- `resolveRoll(state, attemptId, requestId, values, role)` registra le facce
  naturali dopo controllo di quantità, intervallo e controllo corrente
  dell'attore. Risposta identica già registrata è idempotente; facce diverse
  richiedono una correzione esplicita. Nessun nuovo consumo o tiro sostitutivo.
- `projectAttempts(state, role)` costruisce una vista per UI; `waiting` conserva
  attore/responsabile noto, mentre `requests` non espone dadi pendenti di
  creature altrui. CA, soglie, modificatori e PF dei PNG non passano nella
  proiezione giocatore. I soggetti nascosti non trapelano neppure da selezioni,
  IDs, esiti, conteggi o richieste di salvezza. La proiezione locale non è una
  prova di sicurezza di un backend.
- `hasPendingForActor(state, actorId)` interroga lo stato completo: solo logica
  interna/DM, non un contatore pubblico di soggetti nascosti.
- `expireTurnEffects(state, actorId, phase='start')`: Disimpegno alla fine del
  medesimo turno, Schivata all'inizio del turno della creatura. All'inizio di
  un nuovo turno cancella anche i marcatori slot per turno di tutti gli attori.
  Root la integra nel cambio e nell'avvio dello scontro; nessun recupero di PF.

`selection` contiene `targetIds` per il singolo bersaglio, `point:{x,y}` per
cono/destinazione, `allocations:[{actorId,count}]` per i dardi, `slotLevel`
(default 1), `hands` (1 o 2), `rollMode` (normal/advantage/disadvantage).
La geometria del cono espone `origin`, tre `points` pronti per SVG,
`lengthMeters:4.5`, `angleRadians:2*atan(0.5)` e `inclusion:token-center-demo`.

Ogni richiesta mantiene `id`, `kind:attack|damage|save`, `actorId`, `owner`,
`dice:[{count,sides}]`, `modifier`, `rollMode`, `status:pending|resolved`, poi
`values`, `natural`, `total`, `resolvedBy`. **Count è già il numero effettivo
completo di facce:** un vantaggio/svantaggio chiede 2d20, non altri due dadi
moltiplicati dalla UI. I danni critici raddoppiano count, non modifier.

Esiti: `actorId`, `name`, `status:pending|applied|missed`, eventuali `hit`,
`critical`, `damage`, `hpBefore`, `hpAfter`, `hpLost`, `saveTotal`,
`saveSuccess`, oppure `darts`/`effect`/`movement`. La proiezione rimuove i campi
non consentiti. `waiting` comprende `actorId`, `name`, `owner`, `kind`,
`canRespond`; `requestId` soltanto per chi può rispondere.

## Scenari e regole applicate

| Mossa           | Comportamento nel caso eseguibile                                                                                                                                                                                                | Fonte normativa                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Bastone ferrato | Solo se equipaggiato e riconosciuto come `weaponType:quarterstaff` o oggetto campione `staff`. STR + competenza documentata all'attacco; 1d6/1d8 + STR al danno; niente maestria automaticamente.                                | SRD EN 5.2.1 pp.7,16,90–91; IT pp.8,18,102–103.                                                         |
| Dardo di fuoco  | Tiro per colpire a distanza entro 36 m; 1d10 al livello3, scala ai livelli5/11/17; nessun modificatore della caratteristica ai danni.                                                                                            | EN pp.7,15–16,132; IT p.140 per la magia.                                                               |
| Mani brucianti  | Cono da sé 4,5 m; include alleati; un danno comune 3d6, +1d6 per slot superiore; salvezze Destrezza distinte, metà per difetto se riesce.                                                                                        | EN pp.16,105,114,177,179; IT pp.18,120,163,203,206.                                                     |
| Dardo incantato | Assegnazione completa e immutabile prima del tiro; 3 dardi con slot1, +1 per slot superiore; ogni dardo d4+1 aggregato poi sul bersaglio. Nessun attacco, salvezza o critico.                                                    | EN pp.16,105,146; IT p.140. Il dado individuale per dardo è la lettura implementativa dichiarata sotto. |
| Scatto          | Se la destinazione supera il movimento normale residuo, spende l'azione e aggiunge Speed al budget, senza aumentare Speed. Entro il budget normale esegue movimento senza spendere l'azione. Si ferma alla tratta raggiungibile. | EN p.180; IT p.214. Gesto I-017/TABLE_ACTIONS.                                                          |
| Schivata        | Azione senza bersaglio/dado. Svantaggio all'attacco se il difensore vede l'attaccante; vantaggio TS DEX. Beneficio assente con incapacità o Speed0; durata al proprio inizio turno successivo.                                   | EN p.181; IT p.215.                                                                                     |
| Disimpegno      | Azione senza bersaglio/dado; registra effetto per il resto del turno senza movimento supplementare.                                                                                                                              | EN p.181; IT p.207. Attacchi di opportunità ancora da integrare.                                        |

La ricerca separata è [blueprint-combat-research](blueprint-combat-research.md):
PDF primari EN/IT verificati dal reviewer prima delle regole eseguibili.
Ogni definizione conserva `kind:srd`, `edition:2024`, `revision:5.2.1`, URL,
pagine e SHA256 EN
`8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`.

Per Magic Missile, la regola 2024 EN16 del danno comune riguarda effetti
simultanei con tiri salvezza: non è stata estesa per analogia a questa magia.
Un d4 per dardo è una lettura implementativa, non un chiarimento ufficiale
esplicito sul conteggio dei dadi. Il totale della richiesta mostra anche il
+1 per ogni dardo; l'esito conserva facce e assegnazioni individuali. Un effetto
Scudo già presente annulla questi danni (EN161/IT186); la proposta di reazione
Scudo al momento del lancio rimane un incremento successivo.

Nat1 e nat20 sono automatici soltanto per il tiro per colpire; TS confrontano
sempre il totale alla CD. Vantaggio/svantaggio si annullano fra loro.
La prossimità di un nemico entro1,5 m che vede il tiratore e non è incapacitato
impone svantaggio agli attacchi a distanza (EN15), anche se quel nemico non è
il bersaglio. Le squadre del caso sintetico sono esplicite; non si considera
nemico qualunque PNG arbitrario.

I lanci con slot consumano la riserva scelta; nel medesimo turno si può
spendere uno slot per lanciare, non una sola magia per round (EN105/IT119).
`actor.spellSlots[level] = {max,used}` permette riserve configurate; la vecchia
`actor.slots` vale solo come riserva di livello1, mai come slot superiore
inventato. Il cantrip non è vietato solo perché si è già speso uno slot.

Gli attacchi ostili fuori combattimento rimangono preview e chiedono di
preparare l'iniziativa: nessun colpo gratuito di apertura. Gli effetti senza
bersaglio fuori combattimento non consumano un'azione di un turno inesistente;
non simulano il trascorrere del tempo della finzione. I PF0 non concludono da
soli lo scontro e non decretano la morte generale di ogni creatura.

## Dati sintetici espliciti e confini

Il repertorio iniziale è solo quello di Livia, identificata dal fixture ID,
con INT e competenze del profilo dimostrativo. Non si deducono incantesimi dal
nome testuale della classe. `actor.combatProfile` può fornire caratteristiche,
competenze, elenco magie, disponibilità componenti e squadra in modo esplicito.
Le altre schede non ricevono automaticamente le sue magie. Fonti/privilegi del
builder completo e proficienze speciali dei mostri rimangono fuori da questo
caso. Modificatore TS DEX esplicito `actor.savingThrows.dex`, oppure caratteristica
base del soggetto di esempio; nessuna competenza ai TS viene inventata.

Scena aperta e piana; distanza in metri deriva dalla scala della stessa scena.
Cono usa **centro pedina** come criterio illustrativo dichiarato, non risolve
ingombri, bordi, altezze, coperture o collisioni normative. Una scena con muri
blocca l'automatismo, senza fingere un motore LOS. Le condizioni di visione
sono i flag espliciti del caso, non un motore luci/sensi. Non si modellano
ancora oggetti infiammabili, bersagli oggetto, resistenze/vulnerabilità,
componenti impedite dinamicamente o tutte le condizioni.

Reazioni, attacco d'opportunità, Scudo richiesto al trigger, Counterspell,
concentrazione, danno non letale, tiri morte, correzione selettiva delle
conseguenze, salvo-arbitraggio e dipendenze concorrenti restano lacune del
blueprint completo. Il dominio non le dichiara coperte con un menu o un flag.
L'undo comune è una correzione locale della simulazione, non la loro soluzione.

## Verifica

Test prima dell'implementazione: otto fallimenti iniziali sull'API vuota;
poi test aggiuntivi red → green su Missile, prossimità ranged, dati difensivi
mancanti e proiezione degli identificativi nascosti.

`node --test design/blueprint/tests/combat.test.mjs`: **15/15 pass** al controllo
corrente. Provati: purezza preview, gate turno/iniziativa, idempotenza tentativi,
serializzazione di attese fisiche, input non validi, critici, consumo singolo,
TS di altri controllori, danni comuni/individuali, attesa senza risposta,
scadenze, movimento Scatto, livello slot/limite turno, Dodge e prossimità,
assenza di dati e privacy di soggetti nascosti. Browser e integrazione dei
controlli sono responsabilità del coordinatore e non sono rivendicati qui.

Verifica integrata successiva: `node --test design/blueprint/tests/*.test.mjs`
**55/55 pass** nello stato condiviso del controllo, inclusi i nuovi test della
preparazione. Prettier sui tre file del worker, sintassi e diff-check passati.
Review separata di regole/proiezioni richiesta al reviewer delle fonti;
eventuali rilievi successivi saranno verificati sul codice corrente.

## Correzioni della review separata

Due rilievi P2 confermati dal coordinatore sono stati riprodotti prima della
correzione: caratteristica offensiva mancante con propagazione di NaN e
scomparsa delle richieste quando l'attore controllato diventa nascosto.

- Preview e avvio rivalidano dati offensivi numerici, competenza quando
  applicabile, PF e difesa pertinenti del bersaglio prima dei consumi. Anche
  stringhe/null non vengono convertiti implicitamente in caratteristiche o TS.
  Una snapshot conserva soltanto CA o TS/CD effettivamente necessari.
- L'autorità sulle proprie richieste non dipende dalla visibilità della pedina.
  Il controllore può ritrovare e completare un proprio tentativo nascosto.
  Un TS autorizzato causato da un incantatore nascosto resta raggiungibile:
  la proiezione usa `sourceHidden:true`, `actorId:null`, `actorName:null`,
  conserva ID della richiesta e del tentativo, ed elimina identità e dati del
  soggetto non rivelato. La UI può mostrare «Sorgente non rivelata».

Quattro test aggiuntivi red → green portano il dominio a **19/19 pass**:
validazione offensiva/proficiency, attore proprio nascosto, salvezza propria
contro fonte nascosta e rifiuto della conversione implicita dei dati difensivi.

Il controllo globale immediatamente dopo queste correzioni, mentre il worker
Preparazione scriveva nuovi test, ha rilevato **60/63 pass**: tre fallimenti
nei nuovi casi di iniziativa (`digital initiative and explicit rerolls survive
discarding scene organization`, `failed offline initiative commit produces no
roll and preserves the working draft`, `physical initiative becomes durable
on save without duplicate entries on metadata saves`). Segnalati al
coordinatore; quei file non sono stati modificati da questo worker.

## Correzione del gesto Scatto — I-017

La destinazione scelta determina il consumo. Se rientra nel movimento normale
residuo, preview e tentativo hanno `cost.action:0`, `effectiveDash:false` e
nome «Movimento». Il percorso resta disponibile anche dopo aver speso
l'azione; sottrae soltanto i metri percorsi. La velocità base non cambia.

Se la destinazione richiede Scatto, il tentativo spende l'azione e aggiunge
la velocità corrente al movimento residuo. Una destinazione ancora più
lontana si ferma alla fine di quel budget. L'azione già spesa impedisce questo
secondo caso, non il movimento normale.

Due regressioni aggiuntive verificano le destinazioni vicine con azione libera
o già usata e quelle oltre il budget normale/esteso. Il caso precedente di
Scatto ora usa una destinazione che richiede realmente l'azione. Dominio:
**21/21 pass**.

Ultimo controllo integrato dopo la correzione Scatto:
`node --test design/blueprint/tests/*.test.mjs` **67/67 pass**, compresi i
precedenti tre casi Preparazione corretti dal worker responsabile. Sintassi
di `combat.mjs`, formattazione dei file riservati e `git diff --check` passati.
I controlli browser restano al coordinatore.
