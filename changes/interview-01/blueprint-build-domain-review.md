# Blueprint — review indipendente del dominio di costruzione

23/09/2026, `review_journey`, modello/sforzo ereditati. Review del candidato
dirty, non approvazione di un commit o completamento del Goal. Nessuna modifica
al codice, nessun browser condiviso: l'unico file scritto è questo report.

Perimetro: `character-build.mjs`, raccordi con `character-rules.mjs`, risorse
della scheda e test pertinenti. Riferimenti: [CRE](../../docs/interview/CHARACTER_CREATION.md),
[ADV](../../docs/interview/CHARACTER_ADVANCEMENT.md), [ricerca](blueprint-character-builder-research.md)
e [precedente review d'integrazione](blueprint-character-integration-review.md).
L'autore ha consegnato il dominio identificato dagli hash finali sotto. Questa
review verifica le invarianti di applicazione, non certifica l'intero catalogo.
Nessun P1/P2 resta aperto nel perimetro verificato; le cinque voci R2–R6 sono
state corrette e ricontrollate. La R1 precedente resta nel report d'integrazione.

## Finding riprodotti

### R2 — P2, avanzare ripristinava la vecchia visibilità — chiuso

Creazione personale → collegamento esplicito alla campagna → Avanza. La bozza
copiava `characterBuild.data.identity.visibility=private` e l'applicazione
rendeva privata la scheda già condivisa, lasciando l'appartenenza alla campagna.
La correzione preserva la visibilità corrente per una scheda esistente e crea
le nuove schede come private; il collegamento resta un comando distinto.

### R3 — P2, correzioni vive sostituite dalla vecchia costruzione — chiuso

Fighter1 creato con FOR15/maxPF12; correzione sulla scheda a FOR18/maxPF40 e nome
diverso; nuova bozza fighter2 con PF fissi. Prima la proposta era FOR15/maxPF20
e vecchio nome, `canApply=true`, senza riconciliazione. Non era un conflitto
durante la bozza: la modifica precedeva la sua apertura.

La correzione prende nome e valori correnti, conserva le correzioni alle
caratteristiche come totali sostitutivi espliciti e usa il massimo corrente
come base del delta. La regressione attuale propone FOR18/maxPF48, mantenendo
i PF attuali. Il nome è ora incluso fra i valori che rendono obsoleta una bozza.

### R4 — P2, nuova bozza perdeva i dadi accettati della costruzione — chiuso

Creazione tramite sei gruppi di dadi fisici accettati, applicazione, nuova
bozza Avanza: il metodo e le assegnazioni venivano copiati, ma `rolls=[]`.
La revisione restituiva sei `ability-missing` e `hp-missing`, sebbene il ledger
avesse tutti e sei i risultati. La stessa ricerca limitata alla bozza corrente
interessava i riferimenti ai PF storici.

La correzione conserva i risultati accettati nella costruzione e li riprende
nella bozza successiva; il ledger resta autorevole per i risultati `reversed`.
Non vengono inventati nuovi tiri. Verificate la regressione dei sei risultati
e una prova indipendente dei PF: fighter1 → tiro fisico7 al livello2 → JSON →
Avanza3 con PF calcolati. Il massimo proposto è29, il ledger contiene ancora
un solo risultato e la sua inversione rende il PF storico non utilizzabile.

### R5 — P2, capacità ricostruite cancellavano dati vivi — chiuso

Su una capacità concessa dal builder, il percorso reale di modifica della
scheda memorizza `max`/`used` nell'elemento di `actor.features`. Dopo aver
registrato max3/used2, aprire Avanza e registrare used3 non cambiava il
`reviewKey`: il dominio osservava invece `actor.featureUses`. Applica ricreava
la capacità e rimuoveva sia massimo sia consumi.

La correzione legge i contatori effettivi, conserva l'identità della concessione
separatamente dalla definizione e mantiene un ledger per la rimozione e
reintroduzione della stessa capacità. La regressione dell'autore verifica
contatori conservati e ritorno della medesima concessione. Prova indipendente:
consumi modificati da2 a4 su massimo3 dopo la revisione rendono obsoleto il
vecchio `reviewKey`; la revisione aggiornata e l'applicazione conservano4/3,
senza cancellare l'eccedenza.

Sottocaso successivo riprodotto nel medesimo raccordo: il dialogo reale
`editFeature` permette anche nome e descrizione della capacità. Queste
correzioni tornavano al testo generico del catalogo in Avanza, pur conservando
ormai i contatori. L'ultima correzione conserva `manualOverrides` con fonte
manuale distinta e `baseDefinition` separata. Ripetuta la riproduzione sul file
consegnato: nome, descrizione, contatori2/3 e provenienza manuale conservati;
la fonte della definizione SRD non viene attribuita alla modifica personale.

### R6 — P2, preparazione corrente sostituita dallo snapshot — chiuso

Una scheda ricostruita contiene Mani brucianti come magia gestita dal builder.
La preparazione viene poi registrata come `false` dalla scheda. Aprendo una
nuova bozza Rivedi senza cambiare quella scelta, la proposta e l'applicazione
la riportavano a `true`, recuperando il vecchio `characterBuild.data.spells`.
Riprodotto con API dominio reali, senza dipendere dalla UI simulata.

La correzione conserva la preparazione corrente quando la bozza non esprime
un cambiamento pertinente. Prova indipendente aggiuntiva: la bozza sostituisce
Mani brucianti con Armatura magica, mentre la scheda sostituisce Dardo incantato
con Sonno. La nuova proposta conserva entrambe le modifiche. I test eseguiti
verificano inoltre il rifiuto del `reviewKey` precedente a una correzione viva.

## Conseguenze pendenti e riscontri senza finding

- Prima della patch, una vera richiesta fisica Fire Bolt di Livia rimaneva
  aperta mentre Rivedi poteva applicare INT20. `hasBlockingConsequences` era
  vero ma `canApply` rimaneva vero. Il dominio ora restituisce
  `pending-consequences` per la scheda interessata, conserva la bozza e non
  risolve né consuma la richiesta. Questa scelta evita di cambiare la struttura
  sotto una risoluzione pendente; non introduce un'approvazione DM.
- Il caso legacy Livia wizard3 → wizard4 richiede la nuova ASI, mentre
  background, specie, libro e scelte storiche ignote restano avvisi espliciti.
  Dopo ASI INT+2 e PF fissi: maxPF22→28, PF attuali18→18, quattro magie e
  inventario invariati, slot1 usati1 conservati; slot2 usati0. Nessun riposo,
  dotazione o ricostruzione completa inventata.
- L'applicazione crea un solo attore personale, senza token o iniziativa.
  L'operazione è idempotente. PF correnti, note e inventario cambiati durante
  la bozza vengono preservati; una revisione divenuta materialmente obsoleta
  viene rifiutata prima dell'applicazione.
- Prova indipendente con PF attuali0, PF temporanei5, due contatori dei tiri
  contro morte, note e inventario: tutti preservati dopo l'avanzamento. Lo
  zero non viene trasformato in cura, riposo o risurrezione.
- L'adapter UI consegnato usa commit locale e privato per nuove schede e
  schede personali, condiviso per avanzamenti in campagna. Questo riscontro
  statico raccorda la precedente R1 d'integrazione; non sostituisce la prova
  browser del coordinatore.
- Il candidato finale include anche `pendingHealing` nel blocco strutturale
  della sola scheda interessata. Prova indipendente: quella bozza segnala
  `pending-consequences`, mentre una nuova bozza personale indipendente non lo
  segnala. La richiesta e il consumo della pozione restano invariati.
- La ricostruzione non può applicare PF attuali ignoti: `currentKnown` e un
  intero valido sono richiesti. Il dominio combattimento verifica inoltre
  `Number.isFinite(actor.hp)` per la risoluzione difensiva; un dato ignoto non
  viene qui interpretato come zero o morte.

## Verifiche e limiti del checkpoint

Ultimo gruppo eseguito: **58/58 test**, tutti verdi, comprendenti dominio,
adapter UI, integrazione Personaggi e stato. Il test UI di avanzamento che
inizialmente non accettava gli aspetti da verificare è stato riallineato
dall'autore attraverso il vero checkbox della UI, senza rimuovere la guardia.
Le riproduzioni Node indipendenti hanno usato lo stato iniziale, le API reali
di creazione/applicazione, combattimento e collegamento alla campagna; fixture
di completamento estratta dal test senza scrivere nuovi file sorgente.

Le riproduzioni delle correzioni e il gruppo58/58 sono stati rieseguiti dopo
la consegna finale. Anche il sottocaso descrittivo R5 è passato. Prettier sul
report passa. Nessun file dell'implementazione è stato scritto dal revisore.

## Hash finali del perimetro

Percorsi relativi a `design/blueprint/`. I primi tre file sono il dominio e
l'adapter letti; i restanti identificano il gruppo di verifiche eseguito e
lo store usato. Questi hash identificano un candidato dirty, non un commit,
una baseline approvata o una review completa di ogni file transitivamente
importato. Modifiche successive richiedono un controllo mirato.

| File                                   | SHA-256                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `character-build.mjs`                  | `83d53f49eaa6c278bfc67518aeedff93fff1f525b11f3ff47f2c7936b0f31d70` |
| `character-rules.mjs`                  | `ade09c26b6ca426fd2808521c71f41ed824bfe78f612c7cf056f43a0977fb969` |
| `character-builder.mjs`                | `e8fbcd022bffedea85ff50279e1159295b80f6c67ae13141c72de411d7ebdcfc` |
| `tests/character-build.test.mjs`       | `fcb01cee99cda3b0f2d25306174c93af0aeaaf3426828d0db6185c6c1527c978` |
| `tests/character-builder-ui.test.mjs`  | `270198dadc58b90c646c462ef5b8b183dff0171614b555697017d73c8e96e849` |
| `tests/character-integration.test.mjs` | `2b0f23fbf0efbfc341ba95a7ae19393d7c3c029d31b5d0ada0c6a5bba966f3b8` |
| `state.mjs`                            | `1f9f3152da9f5a685d197fc95ea7f48f193b6f95a1052705b849471329ee8a0b` |
| `tests/state.test.mjs`                 | `b447b718da8999bd457424c79bc17c4b360948ad7d703a4eaf1ed218ab8d03ce` |

Limiti: non riesaminati tutti i privilegi L1–20, ogni combinazione multiclasse,
il catalogo completo, UI mobile o multiplayer reale. Le lacune esplicitamente
dichiarate non sono state trasformate in difetti né in nuove esclusioni di
prodotto. Il cambio ruolo della demo non costituisce autenticazione server.
