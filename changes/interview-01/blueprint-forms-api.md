# Forme e compagni — API incremento 9

23/09/2026. Contratto concordato e implementato nel dominio; integrazione e UI
verificate separatamente. Autore dominio
`/root/review_journey`; source riservato `forms-companions.mjs` e relativo test.
Il root modifica i moduli esistenti; l'autore UI usa questo contratto. Nessun
browser o esito dell'incremento 9 viene attestato da questo documento.

Riferimenti: [piano](blueprint-build-plan.md), [R193 e fonti](blueprint-forms-companions-research.md),
[piano UI](blueprint-forms-ui-plan.md), [API riposi/tempo](blueprint-rest-api.md).

## Principio e stato canonico

Una forma è una sovrapposizione di statistiche dello stesso attore; un compagno
è un altro attore, con PF e risorse propri. Tutto vive nello store esistente:

```js
state.formsCompanions = { version: 1, castings: [], operations: [], events: [] };
actor.formsProfile = {
  druidLevel: 3,
  wildShapeFeatureId: "feature-instance-id", // actor.features: only canonical balance
  knownForms: ["srd2024:wolf", "srd2024:cat", "srd2024:rat"],
  knownFormsInitialized: true,
  knownFormReplacement: null, // { restId, used: false } after own long rest
  savingThrowProficiencies: ["int", "wis"],
  skillProficiencies: [], // { id, ability, multiplier: 1 | 2 }
  familiarCasting: {
    spellId: "find-familiar",
    prepared: true,
    ritualFromBook: false, // explicit Ritual Adept + owned readable spellbook
    source: {
      /* acquired spell / feature provenance */
    },
  },
  source: {
    /* immutable rule provenance */
  },
};
actor.activeForm = {
  id: "operation-id:form",
  kind: "wild-shape",
  profileId: "srd2024:wolf",
  profile: {
    /* acquired immutable creature profile, never entire actor */
  },
  source: {
    /* Wild Shape rule */
  },
  druidLevel: 3,
  clockId: "campaign-id",
  startedAt: 0,
  expiresAt: 3600,
  equipment: [{ itemId: "item-id", disposition: "merge" }],
};
actor.controllers = []; // additional authorized identities, owner is retained
actor.companion = {
  parentActorId: "character-id",
  kind: "manual" | "familiar" | "wild-companion",
  lifecycle: "available" | "dismissed" | "destroyed" | "released" | "expired" | "archived",
  profileId: "srd2024:cat",
  source: {},
  createdByOperationId: "operation-id",
  creatureType: "fey",
  initiativePolicy: "independent",
  attacksAllowed: false,
  expiresOnParentLongRest: true,
};
```

Compagni: `kind: "npc"`, proprietà/visibilità/campagne canoniche dell'attore,
`companion` come discriminante esplicito. Nessuna modifica all'accesso di tutti
i PNG. Il proprietario gestisce i controllori; DM/co-DM nel contesto condiviso
può correggere; nessun diritto universale sulle istanze personali altrui.
Il legame non concede lettura della scheda o dei piani privati del genitore.

`getEffectiveActor(actor)` è **puro e interno**, non concede autorizzazione:
restituisce una proiezione con CA, STR/DEX/CON, velocità, taglia, sensi,
modificatori di abilità/TS e `combatProfile` effettivi. HP/maxHP/HD/slot/usi,
INT/WIS/CHA, condizioni, concentrazione, note e identità rimangono quelli vivi.
Nessun consumer deve assegnare questa proiezione a `state.actors` o scriverci.
Il ritorno rimuove `activeForm`; non ripristina un vecchio snapshot dell'attore.
Correzioni ai valori base intervenute durante la forma sopravvivono.

Le competenze devono essere registrate esplicitamente. Non ricavarle dal nome
tradotto della classe o da un totale numerico ambiguo. Per dati legacy incompleti
la preview indica i modificatori non verificabili e il percorso di correzione;
non inventa competenza o azzera una correzione manuale.

## Convenzioni comuni

Tutte le query pubbliche ricevono `viewer`. Le mutazioni ricevono ultimo argomento
`options = { operationId, reviewKey, online }`. `operationId` è obbligatorio,
stabile nel tentativo e conservato al reload. Retry della stessa operazione
rivalida l'accesso corrente, poi restituisce il risultato senza rispendere.
Stesso ID con input diverso produce conflitto. Query/preview non mutano.

Ogni preview restituisce:

```js
{
  canApply, errors: [{ code, it, en }], warnings: [{ code, it, en }],
  reviewKey, commit: { local, visibility },
  actorId, actorName, selection, source,
  changes: [{ field, label, before, after, source }],
  costs: [{ actorId, kind, id, label, amount, before, after, phase, source }],
  retained: ["hp", "hitDice", "slots", "conditions", "concentration"],
}
```

Chiavi riferite a risorse/autorità/forma/attività/clock/equipaggiamento pertinenti;
nessun conflitto dovuto a una nota estranea. Input invalido, revoca, pendenza
causale o conflitto non applicano conseguenze parziali. Mutazioni condivise
negate se `online === false`; percorso personale locale e audit privato.
Comandi normalmente annullabili atomicamente dallo store: niente `undoBarrier`,
niente `undoable:false`. Stesso evento/operazione dopo reload non si duplica.

## Query e profili

```js
initializeFormsCompanions(state);
getEffectiveActor(actor); // internal read helper; raw in, projection out
getEffectiveMovementBudget(actor, beforeSpeed, afterSpeed); // pure number
getFormsOverview(state, actorId, viewer);
listCreatureProfiles(state, actorId, viewer, {
  purpose: "wild-shape" | "familiar" | "manual",
  query,
});
listCompanions(state, parentActorId, viewer);
getCompanion(state, companionActorId, viewer);
getFamiliarCasting(state, castingId, viewer);
getFormsHistory(state, actorId, viewer);
```

Overview: `{ actorId, actorName, effective, activeForm, profile, wildShapeResource,
slots, pactSlots, companions, castings, equipment, materials, concentrationActive,
appearanceContext, permissions, commit }`. `slots` è un array `{kind,level,max,used}`;
`pactSlots` è il pool distinto. `profile` contiene `knownFormsLimit` e il livello
pertinente, forme note/limite, opportunità di sostituzione e fonte. Catalogo:
`{ id, name:{it,en}, source, cr, size, speeds, eligible, known, recent, reasons }`.
Compagno proiettato: `{ actorId, name, hp, maxHp, tempHp, lifecycle, kind,
parentActorId, source, initiativePolicy, attacksAllowed, controllers,
placements, permissions, commit }`; parent/link/fonte/posizioni vengono omessi
se non leggibili. Nessun conteggio segreto restituito come errore di accesso.

Primi tre profili acquisiti: `srd2024:cat`, `srd2024:rat`, `srd2024:wolf`.
Profili con `source`, `abilities`, `savingThrows`, `skillModifiers`, `ac`,
`hp`, `hitDice`, `size`, `speeds:{walk,climb}`, `senses`, `melee`, `traits`.
`melee` usa il formato esistente più `fixedDamage:1` per gatto/topo, oppure
`damageDice:[{count:1,sides:6}], damageModifier:2` per lupo.
Tratti strutturati con fonte: `{id:"agile"}`, `{id:"pack-tactics"}`,
`{id:"jumper-dexterity"}`; `melee.onHitProneMaxSize:"medium"` per lupo.
Il famiglio nasconde/nega gli attacchi del profilo anche via API/OA.
Saltare/scalare/anatomie speciali non diventano automatismi per la sola
presenza della descrizione del profilo; la proiezione ne dichiara il limite.
Il profilo meccanico effettivo e il compagno canonico usano
`combatProfile.meleeAttack`, mentre il catalogo conserva `profile.melee`.
`controllerChoices:[{id,name,isOwner}]` identifica chi rimane proprietario;
solo membri attivi nel condiviso, solo owner per istanza personale. Permessi
proiettati: `canControl/canManage/canArchive/canPlace/canDismiss/canReappear/
canRelease/canCorrect`. Dalla overview si leggono anche
`canTransform/canCastFamiliar/canCreateCompanion/canManageKnownForms`.

## Forma Selvatica e ritorno

```js
previewWildShape(state, actorId, selection, viewer);
applyWildShape(state, actorId, selection, viewer, options);
previewFormReturn(state, actorId, selection, viewer);
returnToNormalForm(state, actorId, selection, viewer, options);
previewFormCorrection(state, actorId, selection, viewer);
applyFormCorrection(state, actorId, selection, viewer, options);
previewKnownForms(state, actorId, selection, viewer);
setKnownForms(state, actorId, selection, viewer, options);
```

Wild selection: `{ profileId, tempHpChoice:"keep"|"replace",
equipment:[{itemId,disposition:"drop"|"merge"|"wear",wearApproved:false}] }`.
TempHP già presenti richiedono scelta esplicita; niente somma. Nuovi TempHP
pari al livello da druido e `tempHpSource` con ID forma e regola; il normale
ritorno da Forma Selvatica **non li cancella** (non è Metamorfosi).
Oggetti fusi inoperanti solo finché la forma è attiva. Oggetti caduti registrati
come tali, non rimessi in mano al ritorno; quantità/sintonia non ripristinate.
Indossare richiede praticabilità decisa dal DM: `wearApproved` registra la
decisione al tavolo, anche dal giocatore, senza approvazione digitale a ogni uso.
Il confronto include `proposed` meccanico e righe CA/caratteristiche/TS/abilità/
sensi calcolate dal dominio, non dal renderer. Oggetti e bonus speciali non hanno
un nuovo evaluator automatico. `preview/applyFormCorrection` ricevono
`{patch:{ac?,speed?},reason}` e scrivono solo `activeForm.overrides`, con fonte
`authored` distinta dal profilo SRD immutabile. Ritorno elimina questi override
della forma e conserva le correzioni alla base viva.

Apply spende una bonus e un uso canonico. Bonus necessaria anche per ritorno
volontario. Fuori iniziativa non usa un budget turno inesistente. `selection`
del ritorno: `{ mode:"normal"|"correction", reason? }`; correzione con motivo
registra il fatto senza fingere spesa o rimborso. Un nuovo uso termina la forma
precedente e applica quella nuova in un unico comando, una sola spesa.

Known selection: `{ mode:"initial"|"replace"|"correction", profileIds,
reason? }`. Initial solo lista non inizializzata; replace usa una opportunità
del proprio lungo e cambia al massimo una forma; correction richiede motivo.
Tre profili nel catalogo non significano avere imparato tutto il catalogo;
posti liberi restano dichiarati, senza inventare una quarta forma.

Movimento: `getEffectiveMovementBudget` conserva la distanza già consumata;
usa `actor.dashCount` del turno (root lo incrementa/resetta) e ritorna
`max(0, afterSpeed*(1+dashCount)-movementSpent)`.
Questo non azzera azione/bonus/reazione o iniziativa. `movementSpent` conserva
la distanza anche quando il residuo viene saturato a zero. Solo legacy privo
del campo inferisce una prima volta la distanza dal budget precedente.

## Compagno manuale e Compagno Selvatico

```js
previewCompanionCreation(state, parentActorId, selection, viewer);
createCompanion(state, parentActorId, selection, viewer, options);
previewCompanionCommand(state, companionActorId, selection, viewer);
applyCompanionCommand(state, companionActorId, selection, viewer, options);
getCompanionPlacement(state, companionActorId, viewer);
```

Creation selection: `{ mode:"manual"|"wild-companion", profileId, name,
creatureType?, cost?:{kind:"wild-shape"|"slot"|"pact-slot",level?},
manual?:{hp,maxHp,ac,speed,abilities,source,reason}, appearance? }`.
Manual registra una creatura già esistente: nessun cast/costo inventato;
dati ignoti restano `null`. Wild Companion è Magic action, fonte druido2,
folletto, spende esattamente la scelta e ignora materiali. Slot usato per
lanciare rispetta `lastSlotTurn`; uso Forma non è uno slot. Regola un solo
famiglio applicata a entrambi i modi di lancio: se esiste, cambia la forma
della stessa identità, senza clonare creature o ricaricare risorse vissute.

Command selection: `{command:"dismiss"|"reappear"|"release"|"archive"|
"controllers"|"correct", ...}`. Reappear richiede congedato, mai distrutto;
dismiss/reappear costano Magic action del genitore. Distruzione a 0 richiede
nuovo lancio; archiviazione amministrativa non è morte. Inventario lasciato
tracciato senza clonare oggetti. `controllers` riceve identità esplicite,
mantiene owner e rivalida membership; non delega lettura del genitore.
`correct` riceve campi limitati del compagno e motivo, non codice/espressioni.
Shape concreti: `{command:"controllers",controllers:[id]}` e
`{command:"correct",patch:{name?,hp?,maxHp?,ac?,speed?,tempHp?},reason}`.
Manuale in questa fetta parte da uno dei tre profili, con override espliciti;
non è un editor completo di qualunque mostro. Una patch manuale richiede motivo;
eventuali caratteristiche dichiarano tutti i sei valori, anche ignoti `null`.
Rilascio già concluso, scadenza e archivio negano un nuovo rilascio; un compagno
già archiviato non può essere archiviato di nuovo. Il retry con lo stesso
operationId restituisce il risultato originario senza consumare un'altra azione.

La creazione non aggiunge token o iniziativa. Per un vero cast la comparsa
richiede spazio libero entro 3m; ricomparsa entro 9m. Root valida geometricamente
la posizione quando esiste una scena, oppure raccoglie attestazione esplicita
della posizione nella finzione. Registrare quella comparsa non obbliga a creare
il token: il successivo posizionamento raffigura la creatura già presente,
non la teletrasporta nuovamente entro il raggio iniziale e non paga due volte.
`getCompanionPlacement` espone `{canPlace,actorId,existingToken,restriction,
permissions,commit}`; root gestisce puntamento/occupazione/geometria/annullamento.
Selection comparsa: `{appearance:{kind:"map",sceneId,point:{x,y}}}` oppure
`{appearance:{kind:"attested",confirmed:true}}`. Attestazione solo quando il
genitore non ha token accessibile nella scena attiva. Il dominio richiama
`previewTokenPlacement` al commit; niente scorciatoia per eludere distanza,
occupazione o muri segreti. Con token esistente sono richiesti i dati della mappa.

## Trova Famiglio: attività lunga persistente

```js
previewFamiliarCasting(state, actorId, selection, viewer);
startFamiliarCasting(state, actorId, selection, viewer, options);
previewFamiliarCompletion(state, castingId, selection, viewer);
completeFamiliarCasting(state, castingId, selection, viewer, options);
continueFamiliarCasting(state, castingId, viewer, options);
cancelFamiliarCasting(state, castingId, reason, viewer, options);
recordPersonalFormsTime(state, actorId, seconds, reason, viewer, options);
```

Start selection: `{profileId,name,creatureType:"celestial"|"fey"|"fiend",
mode:"slot"|"ritual",slotLevel?, material:{itemId,quantity:1,
unitValueGp:10,incenseConfirmed:true},replaceConcentration:false}`.
Conferma provenienza/componente esplicita, non inferita dal nome dell'oggetto;
non compra automaticamente incenso usando `currency.gp`.

Casting: `{id,actorId,owner,campaignId,selection,status:"casting"|"completed"|
"failed"|"cancelled",clockId,startedAt,requiredSeconds,concentrationId,
lastMagicTurnKey,resultActorId?,failure?}`. Query espone `elapsedSeconds`,
`remainingSeconds`, `costs`,
fonte, costi per fase, permessi e commit. Richiede accesso verificato alla magia
(preparata per il rituale o capacità esplicita che lo consente) e componenti V/S.
Non deduce la magia dalla sola classe Wizard.

Avvio: 3600s normale, 4200s rituale; sostituzione della concentrazione precedente
solo esplicitamente accettata. Concentrazione **del lancio**, non durata del
famiglio. Slot/materiali disponibili rivalidati all'avvio e al completamento;
nessuna riserva aggiuntiva o spesa all'apertura della preview. Il completamento
spende slot e unità inventario in un solo evento e crea/aggiorna un solo famiglio.
Perdita concentrazione, incapacità o abbandono fanno fallire; nuova partenza
da zero. Nessuno slot speso per un lancio fallito. Consumo del materiale al
completamento è un **adattamento esplicito**, poiché il testo non ne fissa una
fase più precisa. Risorse mancanti alla fine lasciano un errore recuperabile,
non una creatura creata a metà o materiale negativo.

In iniziativa occorre una Magic action per ogni turno: start/continue la spendono
e marcano `lastMagicTurnKey`; root segnala fine turno, mancanza interrompe.
Fuori iniziativa l'avanzamento narrativo conferma la prosecuzione dell'attività;
non passa tempo reale. Clock campagna: `state.restTime.clocks[campaignId]`.
Personale: stessa tabella, chiave `personal:actorId`, solo proprietario,
registrazione esplicita; nessun secondo calendario o cronometro.
`recordPersonalFormsTime` è negato mentre l'attore partecipa all'iniziativa:
non può saltare i turni e le Magic action richieste. Il raccordo root dei round
avanza il clock originario di sei secondi quando quell'attore vi partecipa.
Il collegamento successivo a una campagna non trasferisce offsets impliciti.
Il completamento riceve solo `{appearance}`: profilo/nome/tipo/mode rimangono
quelli registrati all'avvio. Per cambiarli si interrompe e si ricomincia.
Continue/cancel/tempo personale sono comandi senza una preview separata: se
`reviewKey` è omessa rivalidano atomicamente input, stato e permessi correnti.

## Metadati builder e fixture dichiarate

Modulo `forms-profile.mjs`, senza importare lo store:

```js
updateCharacterFormsProfile(actor, data, { newCharacter, advancement });
getFamiliarCastingAccess(actor);
seedDemoFormsActors(state);
```

Il root chiama l'aggiornamento dopo `updateCharacterRestProfile` nell'Apply del
builder. I profili con `managedBy:"character-build"` derivano il livello da
druido e le competenze dalle scelte validate; profili authored espliciti non
vengono sovrascritti. Per multiclasse senza classe iniziale registrata i tiri
salvezza restano ignoti, senza assumerli dalla prima riga.

Forma Selvatica usa un solo feature canonical `definitionId:"druid:wild-shape"`,
2/3/4 usi massimi rispettivamente ai livelli 2/6/17. Usi spesi e ignoti sono
conservati anche attraverso rimozione/ritorno di classe e relativo ledger;
massimo zero rende inattiva la riserva rimossa. Recuperi strutturati con
`managedBy:"forms-profile"` puntano allo stesso feature: breve riduce gli usi
spesi di uno, lungo recupera tutti. Nessuna duplicazione di saldo sul profilo.

L'accesso a Trova Famiglio è una proiezione pura corrente: incantesimo acquisito
con identificatore e fonte SRD verificati, preparazione attuale; per il rituale
dal libro anche `wizard:ritual-adept` verificato e libro posseduto leggibile che
contiene la magia. Il dato memorizzato nel profilo non autorizza un lancio dopo
la rimozione della preparazione o del libro. Profili authored usano invece i
metadati espliciti. Overview e preview consumano la stessa query.

Il seed iniziale crea Mira come personaggio sintetico separato, Druida 3,
12/24 PF, zero PF temporanei, una delle due utilizzazioni già spesa e tre forme
note su quattro posti. La sua pedina iniziale è una fixture esplicita e non
un'iscrizione all'iniziativa. Livia mantiene la propria classe; acquisizione,
Adepto dei rituali, libro e una porzione di incenso già posseduta del valore di
10 mo sono fixture esplicite. `demoFormsSeeded` impedisce di rigenerare risorse,
personaggi o pedine al retry/reload. Non esiste una regola di acquisto implicito.

## Seam root: fatti già autorizzati, non nuove autorità

```js
observeFormsEvent(state, {eventId,cause,actorIds,restId?,turnKey?});
// cause: time | actor-status | concentration | long-rest | turn-end | turn-start
```

Hook interno idempotente da fatti applicati: termine per clock, morte/incapacità,
casting fallito se concentrazione persa, familiari a0 scomparsi, compagno
selvatico terminato SOLO lungo del genitore, opportunità forme note del lungo.
Non applicare questi effetti da preview. Auto-fine normativa non viene negata
da un tiro pendente: conserva ID/evidenza e root rivalida conseguenze pertinenti.
Comandi volontari strutturali invece bloccano solo pendenze del soggetto.
Se viene rimosso proprio l'attore attivo, il dominio registra
`combat.pendingTurnStart:{actorId,previousActorId,reason:"companion-removed",
roundAdvanced}`. Ultimo indice rimosso passa al primo e incrementa il round.
Il root consuma questo marcatore con l'avvio turno ordinario, senza concedere
reset nel dominio. Rimuovere un altro soggetto conserva l'identità del turno.

| Seam root            | Vincolo condiviso                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accesso              | `actor.controllers`/`actor.companion` espliciti, owner mantenuto, membership corrente; autorizzazione prima della proiezione.                                                                     |
| Combat               | Tutte le letture fisiche da profilo effettivo, tutte le scritture su attore canonico. Vecchia preview non bypassa forma/famiglio/controllore revocato.                                            |
| Danni/concentrazione | TempHP assorbono prima; concentrazione usa danno ricevuto, non solo HP persi. TS COS fotografa il modificatore effettivo nella fase corretta; cambio forma non rilancia il dado.                  |
| Movimento/turni      | Velocità effettiva, distanza/Dash preservati; inizio turno usa forma corrente. Compagno iniziativa/reazione proprie. Congedo/rimozione conserva identità dell'attore attivo quando cambia indice. |
| Riposi/tempo         | Un solo clock; root chiama hook dopo avanzamento/round, lungo e cambi stato. Usi Forma recuperati dalle regole strutturate `restProfile`, stesso featureId, niente secondo saldo.                 |
| Equipaggiamento      | Merge inoperante, drop conservato fuori inventario attivo, wear attestato; nessuna riassegnazione automatica delle quantità al ritorno.                                                           |
| Undo/reload          | Stato attori+forme+casting+clock atomico. Evidenze di dadi già conservate dallo store; nessun nuovo ledger di dadi introdotto da questa fetta.                                                    |

## Fonti verificate e limiti

SRD 5.2.1 EN/IT ufficiali riaperti il 23/09/2026; estratti locali già conservati.
URL e SHA-256 immutabili completi in R193. Licenza CC BY 4.0; attribuzione SRD
del progetto conservata. Regole: Forma Selvatica/Compagno Selvatico EN42–43,
IT48–49; PF temporanei EN18/IT20; lancio/rituale EN104–105/IT118–119;
Trova Famiglio EN130/IT198–199; mutaforma EN187/IT210; Scatto EN180.
Gatto EN346/IT391–392; topo EN359/IT405;
lupo EN364/IT394. Niente testi/asset commerciali importati.

Il catalogo di tre profili, le politiche Wild Shape e Familiar non completano
Metamorfosi, volo/quote/anatomie, cavalcature, effetti intangibili, evocazioni
multiple, sottoclassi o sensi condivisi. Telepatia, vista tramite famiglio e
consegna a contatto restano descrizioni sourced senza automatismo/accesso mappa
inventato finché i rispettivi comandi non hanno prova propria. Le trasformazioni
sovrapposte diverse da nuovo Wild Shape richiedono politica distinta.

Consegna del source: test RED→GREEN su preview pura, merge vivo/ritorno,
tempHP, costo condiviso, formazione note/long, casting interrotto/costi/durata,
identità/lifecycle, membership/privacy/controllori, stale review/retry/Undo JSON.
Il report dominio registrerà hash reali, esiti e limiti dopo l'implementazione.
