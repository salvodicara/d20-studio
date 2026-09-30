# Review indipendente — regole e conformità API dell'incremento 10

24/09/2026. Review avversaria in sola lettura: nessuna modifica ai sorgenti o ai test.
File riservato: questo rapporto. Oggetto: `design/blueprint/conditions.mjs` e la sua
integrazione in `combat.mjs`, `rest-time.mjs`, `forms-companions.mjs`, `table.mjs`,
più i raccordi usati dagli stessi percorsi (`characters.mjs`, `state.mjs`). Ho
controllato anche la correzione dei dadi: `requestFor`/`knownEvidence`/`resolveRoll`
in combat e l'evidenza conservata dall'Undo in `state.mjs`.

Stato esaminato: working tree non committato di `codex/interview-01`. Non c'è uno SHA:
il delta è tutto non tracciato e altri agenti lo stanno modificando. Orari dei file
letti: `conditions.mjs` 23/09 23:03, `combat.mjs` 23/09 23:51.

Riferimenti normativi:

- SRD 5.2.1 EN/IT dalle copie locali in
  `/Users/salvatoredicara/Workspace/Codex/d20-studio-experience-evidence/`
  (`en.txt`, che ho riletto per ogni punto dubbio);
- ricerca R194 in [blueprint-conditions-research.md](blueprint-conditions-research.md);
- API accettata in [blueprint-conditions-api.md](blueprint-conditions-api.md).

Le pagine EN del catalogo corrispondono ai piè di pagina del testo: 15 su 15.

## Esito in breve

La maggior parte delle regole 2024 è corretta e coperta dai test:

- danno a 0 PF, danno massiccio e colpo critico a 0 PF;
- TS contro la morte, stabilizzazione, recupero in 1d4 ore e knockout;
- Prono, Rialzati e strisciare;
- Indebolimento;
- fine della concentrazione per incapacità.

Restano però **1 P1, 4 P2 e 12 P3**. Tutti i P1 e P2 sono riprodotti con test Node
eseguiti sul working tree.

- **P1.** Una creatura Priva di sensi a 0 PF beve la propria pozione e si rialza da
  sola.
- **P2.**
  - `applyVitalityRoll` si fida di descrittori costruiti dal chiamante.
  - La `turnKey` basata sull'indice sposta le scadenze quando cambia l'ordine di
    iniziativa.
  - Il sonno del riposo non lascia Prono.
  - Spaventato non si applica mai in combattimento.

Suite al momento della review: **544 test, 543 PASS, 1 FAIL**
(`reactions.test.mjs:300`). Quel fallimento è il test superato già documentato in
[blueprint-conditions-ux-review.md](blueprint-conditions-ux-review.md) P2-1 e nella
richiesta 1 di [blueprint-conditions-integration.md](blueprint-conditions-integration.md).
Confermo in modo indipendente che il comportamento nuovo è quello corretto per il 2024:

- Falling Unconscious, EN 17 / IT 19;
- Incapacitated, «No Concentration», EN 184 / IT 208.

Non va quindi indebolito il dominio: va aggiornato il test.

## Findings

Severità:

- **P1**: regola centrale violata nel percorso principale;
- **P2**: da correggere prima del checkpoint 10;
- **P3**: coerenza, completezza dichiarata o rifinitura.

Ogni correzione proposta è **fuori dalla mia riserva**.

### P1-1 — Una creatura Privata di sensi beve la propria pozione e si risveglia

- **Dove.**
  - `characters.mjs:73-95`, `beginHealing`, non controlla incapacità o
    incoscienza.
  - Il dialogo in `characters.mjs:1365-1415` blocca solo il «non è il tuo turno» e
    l'azione bonus già spesa.
- **Regola.**
  - Incapacitated: «can't take any action, Bonus Action, or Reaction» (EN 184 /
    IT 208).
  - A 0 PF la creatura ha la condizione Unconscious (EN 17 / IT 19).
  - R194 lo chiedeva in modo esplicito, nella tabella dei raccordi: «La pozione su sé
    stessi non diventa utilizzabile da Privo di sensi».
- **Effetto.** Nel proprio turno una creatura morente ha di nuovo l'azione bonus,
  perché `advanceTurn` la ripristina. Beve la pozione, recupera PF e l'origine
  `zero-hp` si chiude. Il ramo TS contro la morte e stabilizzazione viene aggirato.
- **Riproduzione**, verificata:

  ```js
  import * as c from "../conditions.mjs";
  import { beginHealing, resolveHealing } from "../characters.mjs";
  const SRC = { kind: "t", edition: "2024", revision: "1" };
  const hero = {
    id: "hero",
    owner: "player",
    visibility: "shared",
    campaignIds: ["camp"],
    hp: 6,
    maxHp: 12,
    tempHp: 0,
    bonus: true,
    conditions: [],
    heldItemIds: [],
    vitalityPolicy: { zeroHp: "death-saves", source: SRC },
    deathSaves: { successes: 0, failures: 0, stable: false, recovery: null },
    inventory: [{ id: "potion", name: "Potion", quantity: 1, healing: true }],
  };
  const s = {
    campaign: { id: "camp" },
    actors: { hero },
    combat: { active: true, order: ["hero"], turn: 0, round: 1, encounterId: "enc" },
  };
  c.applyVitalityEvent(s, {
    eventId: "d1",
    actorId: "hero",
    kind: "damage",
    amount: 6,
    source: SRC,
  });
  assert.equal(c.hasCondition(hero, "incapacitated"), true);
  assert.throws(() => beginHealing(hero, "potion", { inCombat: true, canAct: true })); // FAILS today
  ```

- **Correzione.**
  - In `beginHealing` rifiutare se `hasCondition(actor, "incapacitated")` o se
    `actor.dead`.
  - Nel dialogo mostrare il motivo nella stessa riga di «non disponibile».
  - Aggiungere il test sopra.
  - Somministrare la pozione a un'altra creatura richiede un bersaglio distinto.
    Oggi manca ed è una lacuna di copertura, non questo bug.

### P2-1 — `applyVitalityRoll` accetta descrittori TS contro la morte o recupero costruiti dal chiamante

- **Dove.** `conditions.mjs`:
  - `trustedDescriptor`, righe 2652-2680;
  - `applyVitalityRoll`, righe 2704-2744;
  - `rollBlocker`, righe 2634-2651.
- **Problema.** Solo i descrittori Medicina vengono ricavati dal registro di
  emissione (`aid`). Per `death-save` e `stable-recovery` il dominio controlla solo la
  forma:
  - un d20 o un d4;
  - CD 10 o nulla;
  - il modificatore uguale alla somma delle fonti.

  Poi:
  - verifica il controllo di `actorId`, **non** di `targetId`;
  - non verifica che l'`id` sia `death-save:<actor>:<trigger>`;
  - non ricalcola il modificatore da `conditionSaveRules(target, "death")`;
  - non verifica che il tiro sia legato al turno che l'ha reso dovuto.

  L'API chiede che l'adapter «never trusts a UI-provided total» e che i modificatori
  abbiano una fonte applicabile. Oggi solo il root chiama la funzione, con il
  descrittore salvato nell'attempt. La funzione però è esportata, prende un
  `viewer` ed è il contratto che l'implementazione di produzione copierà.

- **Riproduzione**, verificata con la fixture `world()` di `conditions.test.mjs` più un
  `rival` con `owner: "other"`:

  ```js
  damage(s, "rival", 6); // rival dying, controlled only by "other"
  const forged = {
    id: "death-save:rival:x",
    kind: "death-save",
    actorId: "hero",
    targetId: "rival",
    dice: [{ count: 1, sides: 20 }],
    dc: 10,
    modifier: 0,
    modifierSources: [],
  };
  c.applyVitalityRoll(s, { eventId: "r1", descriptor: forged, values: [20] }, "player");
  assert.equal(s.actors.rival.hp, 1); // "player" healed a creature it does not control
  // Also accepted: modifier 9 with modifierSources [{kind:"invented",value:9}] -> 2+9 succeeds.
  ```

  Anche il test di dominio esistente, in `conditions.test.mjs:867-946`, risolve cinque
  TS nello stesso turno usando `triggerId` diversi.

- **Correzione.**
  - Nel ramo `death-save`:
    - richiedere `actorId === targetId`;
    - richiedere `canControl(target)`;
    - richiedere un `id` uguale a `death-save:${actorId}:${triggerId}`;
    - richiedere un modificatore uguale a quello ricalcolato allo stesso istante.
  - Con `turnKey` il `triggerId` deve essere `turn:<turnKey>`. In alternativa si
    registra l'emissione come per Medicina e si rilegge da lì.
  - Nel ramo `stable-recovery` richiedere `canControl(target)`.
  - Test: descrittore forgiato con bersaglio altrui, modificatore inventato, secondo
    TS nello stesso turno. Tutti e tre devono essere rifiutati.

### P2-2 — Una `turnKey` basata sull'indice fa scadere in anticipo i termini «prossimo turno» quando l'ordine cambia

- **Dove.**
  - `conditions.mjs:495-498` (`turnKeyOf`) e `combat.mjs:150-156` (`turnKey`), stessa
    formula `encounter:round:turnIndex:actor`;
  - `forms-companions.mjs:185-191`;
  - lo spostamento dell'indice in `forms-companions.mjs:1353-1380`
    (`removeRepresentations`). La funzione viene chiamata anche quando un famiglio o un
    compagno arriva a 0 PF (`1918-1926`, `dismiss(..., "destroyed")`).
- **Problema.** Durante il turno di X viene applicato un termine
  `{phase:"end",when:"next"}`, che salva `excludeTurnKey = enc:1:2:X`. Poi un compagno
  che sta prima nell'ordine scompare: l'indice di X scende e la fine del turno in corso
  produce `enc:1:1:X`. L'esclusione non corrisponde più e la condizione termina
  **alla fine del turno corrente**, non del prossimo.

  Specularmente, un termine `when:"current"` salva `turnKey` e con la chiave spostata
  non scade mai. R194 T02 e la seam dei turni chiedevano un evento di turno stabile.

- **Riproduzione**, verificata:

  ```js
  Object.assign(s.combat, { active: true, order: ["caster", "fam", "hero"], turn: 2 });
  // apply Poisoned to hero with term {kind:"turn",actorId:"hero",phase:"end",when:"next"}
  s.combat.order = ["caster", "hero"];
  s.combat.turn = 1; // fam removed; still hero's same turn
  const out = c.observeConditionEvent(s, {
    eventId: "turn:enc:1:1:hero:end",
    kind: "turn-end",
    actorIds: ["hero"],
    turnKey: "enc:1:1:hero",
  });
  assert.equal(out.expired.length, 1); // expected 0
  ```

- **Correzione.**
  - Serve un'identità di turno indipendente dall'indice. La più semplice è
    `encounter:round:actorId`: nelle regole core una creatura ha un solo turno per
    round.
  - In alternativa, un `combat.turnSeq` che cresce a ogni inizio turno.
  - Va applicata insieme a combat, conditions e forms, più la chiave del TS contro la
    morte (`turn:<key>`).
  - Test: rimozione di un compagno che precede nell'ordine durante il turno di X.

### P2-3 — Il sonno del riposo è un Privo di sensi che, finendo, non lascia Prono (deviazione dichiarata, ancora aperta)

- **Dove.** `rest-time.mjs`:
  - `activity`/`wake`, righe 227-252;
  - righe della preview, 391-398;
  - `interrupt` → `wake`, righe 774-800.
- **Regola.** Unconscious: «When this condition ends, you remain Prone» (EN 191 /
  IT 212). Anche «you drop whatever you're holding».
- **Problema.** Il blueprint modella il sonno come Privo di sensi (decisione R192).
  Però `wake` rimuove la voce legacy senza passare dal dominio, quindi:
  - al risveglio non resta Prono: su attività leggera, danno o iniziativa;
  - gli oggetti tenuti non cadono e non nasce una riconciliazione;
  - `conditionEvents` non ha storia.

  L'API lo vieta: «The trusted adapters must close instances through this domain».
  L'autore dell'integrazione l'ha dichiarato come deviazione e l'ha girato al
  coordinatore (richiesta 2). Resta una regola violata nel percorso reale: una
  sentinella svegliata dall'iniziativa si alza gratis.

- **Riproduzione**, verificata con `previewRest`/`startRest` long con
  `activityByActor: {hero: "sleep"}`:

  ```js
  assert.equal(c.hasCondition(s.actors.hero, "prone"), true); // while asleep
  r.setRestActivity(s, "rest", { actorId: "hero", activity: "light" }, "player");
  assert.equal(c.hasCondition(s.actors.hero, "prone"), false); // expected true
  ```

- **Correzione.** È la richiesta 2 del rapporto di integrazione:
  - addormentarsi con
    `applyConditionEvent({kind:"apply",conditionId:"unconscious",restId,cause:"sleep"})`;
  - svegliarsi con `{kind:"end",restId}`;
  - aggiornare l'ultima asserzione di `rest-time.test.mjs`, «sleep has its own
    unconscious condition…»;
  - nella preview del riposo mostrare anche la riga Prono.

### P2-4 — Spaventato non impone mai lo svantaggio negli attacchi, anche con la fonte in vista

- **Dove.**
  - `combat.mjs:407-413`: `conditionRulesFor` passa distanza e vista reciproca, **mai**
    `canSeeSource`.
  - `conditions.mjs:746-749`: senza quel fatto la regola resta `unresolved`.
  - `combat.mjs:974`: l'irrisolto è solo copiato nella richiesta. Non blocca e non
    cambia la modalità.
- **Regola.** Frightened: «Disadvantage on ability checks and attack rolls while the
  source of fear is within line of sight» (EN 182 / IT 216). Nel catalogo l'effetto è
  `supported`.
- **Riproduzione**, verificata:

  ```js
  const s = createInitialState(); // fire-bolt livia -> goblin-1 at 200 px, visible
  applyConditionEvent(s, {
    eventId: "fear",
    kind: "apply",
    actorId: "livia",
    conditionId: "frightened",
    source: SRC,
    origin: { actorId: "goblin-1" },
    immunityConfirmed: true,
  });
  const p = previewAction(s, "livia", "fire-bolt", { targetIds: ["goblin-1"] }, "player");
  assert.equal(p.rollMode, "normal"); // expected "disadvantage"
  assert.equal(p.available, true);
  ```

- **Correzione.**
  - In `conditionRulesFor` ricavare `canSeeSource` per ogni istanza Spaventato con
    `origin.actorId`, usando la stessa `canSee` e la linea di vista della scena.
  - Se l'origine è ignota, lasciare `unresolved` ma chiedere una scelta esplicita:
    «la fonte è in vista?». Il tiro non deve partire in modalità normale.
  - In alternativa dichiarare l'effetto `manual` nel catalogo finché non è collegato.
  - Stesso problema per le prove: Medicina oggi emette solo un avviso, ed è accettabile
    solo se l'effetto è dichiarato manuale.

### P3 — Coerenza, completezza dichiarata e rifinitura

1. **Dardo incantato: l'unità di danno è incoerente.**
   - `combat.mjs:1530-1542` applica un solo evento vitale per bersaglio, con la somma
     dei dardi. A 0 PF questo vale **1** fallimento.
   - La concentrazione dello stesso evento conta invece un TS per dardo, come
     convenzione dichiarata (`combat.mjs:1878-1905`).
   - R194 chiedeva di «precisare l'unità di danno nel nuovo adapter, con fonte o scelta
     dichiarata».
   - Correzione: scegliere un'unità sola e dichiararla con `interpretation`. Può essere
     un evento vitale per dardo, con fallimenti e danno massiccio per dardo, oppure la
     somma anche per la concentrazione.
2. **Una fonte nascosta si legge dal termine.**
   - `projectTerm` (`conditions.mjs:836-888`) proietta `term.actorId` e il nome
     nell'etichetta anche quando `projectInstance` ha nascosto `source` e `origin`.
   - Riprodotto con un termine di concentrazione su un lanciatore leggibile, cioè non
     `npc`: «While caster keeps Concentration».
   - Oggi i PNG non sono leggibili ai giocatori, quindi il caso reale è raro.
   - Correzione: passare `hidden` a `projectTerm` e anonimizzare `actorId` ed etichetta.
3. **Il DM perde la fonte del Morso del Lupo.**
   - `applyOnHitConditions` (`combat.mjs:1420-1428`) non passa `owner`. L'istanza ha
     `owner: "system"`, e con `sourceVisibility: "private"` la fonte è nascosta a
     **tutti**, anche al DM che controlla il lupo (`conditions.mjs:890`, `2357`,
     `2429`).
   - Correzione: `owner: state.actors[attempt.actorId]?.owner`.
4. **Il 20 naturale o il recupero da stabile con PF massimi ignoti non curano.**
   - Ignorano l'errore di `planHealing` (`conditions.mjs:2763`, `2795`, `2908`): l'esito
     dice `regain-hp`, ma PF e conteggi non cambiano e la creatura resta morente. È
     riprodotto.
   - Correzione: portare a 1 PF senza serve un massimo noto, perché da 0 PF 1 ≤ max, e
     azzerare i conteggi. In alternativa, non dichiarare `regain-hp` e mostrare la
     riconciliazione.
5. **Il ramo «expired» scrive senza autorità.**
   - `applyVitalityRoll` (`conditions.mjs:2727-2742`) registra un evento di tiro
     scaduto per chiunque possa **leggere** chi tira, senza `canControl` e senza
     controllo online. È riprodotto.
   - Correzione: verificare il controllo prima di registrare, oppure non registrare per
     chi non controlla.
6. **Una correzione a 3 fallimenti lascia la creatura «morente».**
   - `planCorrection` (`conditions.mjs:1540-1565`) accetta `failures: 3` senza morte e
     `successes: 3` senza stabilità. È riprodotto: `vitality: "dying"` con 3 fallimenti.
   - Correzione: rifiutare, oppure avvisare e chiedere `dead`/`stable` coerenti nello
     stesso comando.
7. **Pietrificato non neutralizza un Avvelenato già attivo.**
   - `immunities` (`conditions.mjs:1753-1757`) blocca solo le nuove applicazioni;
     `mechanicsFrom` continua a dare lo svantaggio alle prove.
   - Regola: Petrified, «Immunity to the Poisoned condition» (EN 186 / IT 211).
   - Correzione: in `effectiveIds` ignorare `poisoned` quando la creatura è
     pietrificata.
8. **Effetti di iniziativa dichiarati `supported` senza chi li usa.**
   - Riguarda lo svantaggio di Incapacitato, il vantaggio di Invisibile e il −2 per
     livello di Indebolimento alle prove con d20.
   - L'iniziativa in `preparation.mjs` usa un bonus inserito a mano.
   - Correzione: segnare questi effetti come `manual` nel catalogo, oppure passare
     `mechanics.initiative`/`d20Penalty` alla riga di iniziativa.
9. **La caduta degli oggetti tenuti non ha effetto.**
   - Le fixture dichiarano `heldItemIds: []` (`state.mjs:42-56`) e gli attacchi con arma
     non li aggiornano mai. Livia che colpisce col bastone e poi cade a 0 non lascia
     cadere nulla, e non nasce nemmeno una riconciliazione.
   - `droppedItemIds` non ha consumatori: l'oggetto resta equipaggiato e usabile.
   - Correzione: dopo un attacco con arma registrare l'arma tenuta, oppure tornare a
     `null`, cioè ignoto. Il root deve spostare a terra gli oggetti caduti.
10. **Un'applicazione privata dà due verità diverse.**
    - L'overview calcola `mechanics` solo sulle istanze visibili
      (`conditions.mjs:1008`).
    - `conditionAttackRules`/`conditionSaveRules` usano tutte le istanze e le nominano
      nei `conditionReasons` della richiesta.
    - Risultato: il controllore vede sulla scheda «nessuno svantaggio» e nel tiro
      «Avvelenato».
    - Serve una scelta esplicita, con motivo anonimo o effetto visibile, altrimenti
      scheda e Tavolo non coincidono.
11. **Il riposo lungo toglie Indebolimento fuori dal dominio.**
    - `rest-time.mjs:913-914` lo fa senza evento in `conditionEvents`, mentre l'API
      chiede «an event explaining each change».
    - È affine a P2-3 della UX review, dove però il percorso era quello della
      correzione.
12. **Audience dei valori vitali incoerente.**
    - `projectAttempts` toglie PF prima e dopo a chi non controlla la creatura, ma
      mostra:
      - `outcome.vitality`, con faccia naturale, totale e righe dei conteggi TS;
      - `deathSaveFailures` dell'attacco.
    - Li mostra a chiunque veda la pedina: riprodotto con un terzo membro `other`, che
      vede faccia 7 e fallimenti 0→1 di Livia.
    - Il dominio espone PF e conteggi a tutti i membri che leggono l'attore.
    - R194 avverte che rendere pubblici i conteggi è una scelta di privacy: va decisa e
      applicata in un solo modo.

Nota sull'API, senza bug di codice: il testo dice che fuori iniziativa Rialzati
«still respects actual speed zero and incapacity». Il codice, correttamente, non blocca
Incapacitato o Stordito con Velocità > 0, perché nel 2024 l'incapacità non impedisce il
movimento (EN 184 / IT 208). Va corretto il documento, non il codice.

## Controlli superati

- **Catalogo.**
  - 15 definizioni SRD, nomi IT ufficiali e pagine EN verificate sui piè di pagina.
  - Incapacitato e Stordito non azzerano la Velocità; Afferrato, Paralizzato,
    Pietrificato, Trattenuto e Privo di sensi sì.
  - Prono ha vantaggio entro 1,5 m reali e svantaggio oltre, non per categoria d'arma.
  - Fallimento automatico di FOR/DES per Paralizzato, Pietrificato, Stordito e Privo di
    sensi.
  - Critico entro 1,5 m solo per Paralizzato e Privo di sensi.
  - Privo di sensi oltre 1,5 m più Prono dà un tiro normale per annullamento, corretto.
  - Le etichette personalizzate non hanno effetti.
- **Indebolimento 2024.**
  - −2 per livello ad attacchi, TS (anche TS contro la morte e Concentrazione) e prova
    di Medicina.
  - −1,5 m di Velocità per livello; livello 6 = morte con evento; riposo lungo −1.
- **Danno.**
  - Prima i PF temporanei.
  - Esempio SRD PF 6/12: 17 danni → Privo di sensi e Prono; 18 → morte.
  - Cadere a 0 non aggiunge un fallimento.
  - A 0 PF: 1 fallimento, 2 se critico, anche quando assorbono i PF temporanei; danno ≥
    massimo = morte; la stabilità si perde.
  - La politica a 0 PF è risolta prima di qualsiasi richiesta di Concentrazione.
  - Retry idempotenti per `eventId`.
- **TS contro la morte.**
  - Dovuti solo all'inizio turno reale, o su richiesta esplicita fuori iniziativa.
  - d20 senza caratteristica, CD 10; il naturale è distinto dal totale.
  - 1 naturale = due fallimenti; 20 naturale = 1 PF.
  - Tre successi = stabile con conteggi azzerati; tre fallimenti = morte.
  - Una cura prima del tiro fa scadere la richiesta senza inventare facce.
- **Stabilizzazione.**
  - Aiuto con Medicina CD 10, azione spesa una sola volta al tentativo.
  - Stabile resta a 0 PF e Privo di sensi.
  - d4 di ore sul clock narrativo; un nuovo danno annulla il recupero.
- **Knockout 2024**, EN 17 e glossario.
  - Solo in mischia e solo se il colpo porterebbe a 0.
  - 1 PF, una causa Privo di sensi propria più Prono, riposo breve con `restId`
    deterministico, avviato dopo l'interruzione degli altri riposi.
  - Finisce con PF recuperati, con il primo soccorso o alla fine di quel riposo.
  - Nessun ramo di danno massiccio.
- **Cure.**
  - Non resuscitano.
  - Chiudono solo le cause `zero-hp`/`knockout`; Prono e le altre cause restano.
  - La correzione non si presenta come danno, cura o resurrezione.
- **Rialzati.**
  - Costo `floor(piedi/2)`: 9 m → 4,5 m, 7,5 m → 3,6 m.
  - Nessuna azione e nessuno Scatto; Velocità 0 blocca.
  - Il contesto dell'attore effettivo viene ricavato di nuovo al commit.
  - Strisciare costa 2× sul terreno normale e 3× sul difficile (`spatial.mjs:269`).
- **Termini.**
  - «Prossimo turno» esclude il turno in corso; «fine del turno corrente» solo per il
    turno in corso.
  - Il riposo si lega al `restId`; la fine della concentrazione chiude solo le sue
    condizioni.
  - Gli eventi osservati sono idempotenti.
- **Dadi.**
  - `conditions.mjs` non genera dadi: nessuna fonte casuale nel modulo.
  - Medicina è ricavata dal registro `aid`.
- **Correzione dei dadi.**
  - `sameDice` impedisce di riusare facce su un profilo diverso.
  - Critico ↔ normale: riuso per gruppo, facce sostituite registrate con la loro
    audience.
  - La correzione richiede un motivo e una richiesta pendente.
  - Undo conserva `acceptedValues`, dadi, audience e personale.
  - Limite noto e dichiarato: la mappatura per indice di gruppo sostituisce, senza
    riusarle, facce di un gruppo che cambia posizione. Oggi non è raggiungibile.
- **Autorità.**
  - I retry dei comandi rivalidano controllo e input.
  - Le scritture condivise offline vengono rifiutate.
  - Il DM non ha accesso universale agli attori personali.
  - Revocare la membership nega nuovi comandi.

## Richieste fuori riserva (sintesi per i responsabili)

1. `characters.mjs`: guardia contro l'incapacità in `beginHealing` più il motivo nel
   dialogo (P1-1).
2. `conditions.mjs`: rivalidare in `applyVitalityRoll` i descrittori `death-save` e
   `stable-recovery` (P2-1). Poi i P3 4-8 e 10.
3. `combat.mjs`, `conditions.mjs`, `forms-companions.mjs`: un'identità di turno stabile
   (P2-2).
4. `rest-time.mjs` e `rest-time.test.mjs`: il sonno instradato nel dominio con Prono
   residuo (P2-3, richiesta 2 dell'integrazione), più Indebolimento del riposo lungo
   come evento (P3-11).
5. `combat.mjs`: `canSeeSource` per Spaventato (P2-4), `owner` nel Morso del Lupo
   (P3-3), unità di danno di Dardo incantato (P3-1), audience di `outcome.vitality`
   (P3-12).
6. `tests/reactions.test.mjs:300`: applicare la richiesta 1 dell'integrazione. Il
   comportamento nuovo è quello del 2024.
7. `blueprint-conditions-api.md`: correggere la frase su Rialzati e incapacità (nota
   sopra).

## Limiti di questa review

- Nessun browser: la review è di regole e contratto, non di interazione.
- Le riproduzioni sono test Node eseguiti in un file temporaneo e riportati sopra per
  intero. Non ho aggiunto test al repository perché i file di test sono fuori dalla mia
  riserva.
- Non ho riletto le fonti IT oltre alle pagine già verificate da R194.
- Non ho esaminato `conditions-ui.mjs`, che è coperto dalla UX review.
