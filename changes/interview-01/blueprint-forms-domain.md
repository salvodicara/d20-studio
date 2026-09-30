# Forme e compagni — dominio incremento 9

23/09/2026. Autore `/root/review_journey`, modello e sforzo ereditati. Worktree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`.
Ownership di questa tranche: `forms-companions.mjs`, `forms-profile.mjs`, test corrispondenti,
[API concordata](blueprint-forms-api.md), questo rapporto. Nessuna modifica
ai moduli esistenti del root o dell'autore UI; nessun browser condiviso usato.
Snapshot dirty verificato per contenuto, **non candidate commit SHA**.

## Risultato nel perimetro

Forma Selvatica usa lo stesso attore: overlay acquisito immutabile per i valori
della bestia, risorse vive e identità conservate, ritorno senza snapshot vecchio.
Il livello da druido e il featureId della risorsa sono espliciti. Bonus/uso,
forme note, durata, tempHP non cumulativi, equipaggiamento e correzioni CA/velocità
con motivo passano da preview pura a comando rivalidato. I tre profili SRD
sono gatto, topo e lupo; non rappresentano un catalogo completo.

Un compagno è un attore distinto, con copia delle statistiche e consumi propri.
Registrazione manuale, Compagno Selvatico e lancio di Trova Famiglio sono
percorsi separati. Nessun token/turno creato automaticamente. Congedo,
ricomparsa, scomparsa a0, rilascio e archivio non sono sinonimi; il famiglio
non acquisisce attacchi dal profilo. La sua concentrazione non è permanente.

Trova Famiglio richiede attività di 3600s, oppure 4200s come rituale,
concentrazione durante il lancio e Magic action a ogni proprio turno. Perdita
di concentrazione o turno senza prosecuzione fanno fallire il tentativo senza
spendere slot; ricomincia da zero. Slot e incenso già posseduto vengono
consumati al completamento, insieme alla comparsa, una sola volta. Non si
convertono automaticamente monete in materiali. Identità del tentativo e del
famiglio persistono al reload; retry non crea duplicati.

La comparsa usa attestazione nella finzione solo senza token accessibile del
genitore. Con mappa, il dominio rivalida `previewTokenPlacement` e gittata al
commit. La successiva posa è rappresentazione della creatura esistente, non
un nuovo lancio o teletrasporto. Controllori aggiuntivi condividono lo stato e
mantengono l'owner; revoca e membership vengono ricontrollate. Fonte/storico
personale restano privati dopo ingresso in campagna.

Clock narrativo riusato da `restTime.clocks`, comprese chiavi `personal:actorId`.
Nessun clock reale, secondo store, DSL o undo barrier. `movementSpent` e
`dashCount` conservano la distanza consumata anche dopo saturazione a zero.
Rimozione dell'attore attivo produce `pendingTurnStart`, consumato dal root con
l'avvio turno ordinario; il dominio non ricarica budget per conto proprio.

Il raccordo del builder usa un solo feature per gli usi di Forma Selvatica:
massimo 2/3/4 ai livelli 2/6/17, consumi conservati e recuperi breve/lungo che
puntano allo stesso feature. Rimozione e ritorno della classe conservano la
storia, compreso il dato ignoto. L'acquisizione di Trova Famiglio, la preparazione
e il libro sono letti dalle istanze correnti da una query pura: non basta un
nome di classe o il vecchio permesso memorizzato. Profili authored espliciti
restano distinti dal profilo derivato dal builder.

Fixture aggiunta: Mira è una Druida sintetica separata, con 12/24 PF, zero PF
temporanei, una delle due utilizzazioni spesa, tre forme note e una pedina
iniziale esplicita. Non entra automaticamente nell'iniziativa. Livia mantiene
la propria classe; riceve soltanto acquisizione/libro/Adepto dei rituali e
incenso dichiarati nella fixture. Il marker del seed impedisce la rigenerazione
di consumi e pedine dopo retry o reload.

## Fonti e adattamenti dichiarati

Ricerca [R193](blueprint-forms-companions-research.md), SRD 5.2.1 EN/IT ufficiali
riaperti il 23/09/2026; lettura degli estratti locali delle copie hashate già
conservate. URL, SHA-256 EN/IT e licenza CC BY 4.0 sono ripetuti nei record
normativi eseguibili; pagine EN/IT:

| Contenuto                                            | Pagine                         |
| ---------------------------------------------------- | ------------------------------ |
| Forma Selvatica, forme note, usi, Compagno Selvatico | EN42–43 / IT48–49              |
| TempHP e regola di mantenimento                      | EN18 / IT20                    |
| Lancio lungo, rituale, slot per turno                | EN104–105 / IT118–119          |
| Trova Famiglio e ciclo di vita                       | EN130 / IT198–199              |
| Adepto dei rituali                                   | EN78 / IT60                    |
| Mutamento e Scatto                                   | EN187/180; IT210 per mutamento |
| Gatto                                                | EN346 / IT391–392              |
| Topo                                                 | EN359 / IT405                  |
| Lupo                                                 | EN364 / IT394                  |

Il momento preciso di consumo del materiale è un adattamento dichiarato:
il testo dice consumato ma non fissa una fase distinta; l'app consuma al
completamento. Il requisito di non perdere slot per concentrazione spezzata
durante un lancio lungo è invece normativo. L'attestazione di spazio libero
senza mappa e il limite geometrico dei centri dei token sono adattamenti UI,
non nuove distanze SRD. `wearApproved` registra la decisione del DM al tavolo,
anche dal giocatore, senza introdurre un'approvazione digitale per ogni uso.

Nuovo lancio su famiglio vivente conserva l'identità, i consumi e i PF attuali
(limitati al nuovo massimo); non offre una cura gratuita per cambio profilo.
Nuovo lancio dopo scomparsa a0 ricrea i PF del profilo, conservando l'identità
documentale. Questa politica di riconciliazione è esplicita, non attribuita a
un motore concorrente osservato. Famiglio ordinario e Wild Companion
condividono il limite della stessa istanza; Wild Companion scade al lungo
del genitore che lo ha prodotto, non al lungo altrui.

## Verifica eseguita dall'autore

- **31/31 test dominio**: scritti e osservati rossi prima delle implementazioni
  pertinenti, poi verdi. Incluse regressioni su competenze acquisite con PB
  proprio, opportunità di forme note non duplicata con stesso restId,
  conservazione danni/usi, invalidità di input, revoca, privacy, tempo/azione,
  identità/collisione e correzione della forma separata dalla fonte.
- **7/7 test profilo/fixture**, da API assente a verde: saldo canonico, dati
  ignoti, rimozione/ritorno con ledger, fonti acquisite, profilo custom,
  preparazione/libro live, seed idempotente e pedina iniziale senza iniziativa.
- **137/137** nel gruppo dominio forme + profilo + stato + riposi + combattimento +
  reazioni. La prova di Undo/reload usa il vero `createStore`, con danni e
  slot consumati prima del ritorno: annullare quel ritorno non li riscrive.
- Prettier sui file codice/test/API e `git diff --check` del perimetro:
  passati. Il rapporto viene formattato al salvataggio.
- Un tentativo della suite completa durante la scrittura UI ha rilevato otto
  errori `bindCastingControls is not defined` nel modulo UI ancora WIP. Non è
  attestato un esito globale finale, né vengono nascosti questi errori come
  suite verde. Il root chiuderà la verifica integrata sul proprio snapshot.

Nessuna prova browser eseguita da questo autore. Browser, adattatori ai moduli
esistenti e review indipendente sono responsabilità separate. Questi test
non provano multiplayer reale, persistenza server o correttezza di ogni
combinazione di regole.

La review indipendente ha chiuso D1–D4 su uno snapshot precedente: componenti
V/S di Compagno Selvatico, divieto di saltare turni con tempo narrativo
personale, caratteristiche mentali ignote e convalida dei PF dopo fusione
dell'override. Le relative regressioni restano nel gruppo verde. Due delta
successivi sono stati inviati al reviewer sullo snapshot qui registrato:
rilascio/archiviazione già terminali e disponibilità corrente di preparazione
e libro. La review del nuovo profilo è separata; questo rapporto dell'autore
non la sostituisce.

## Limiti che restano visibili

Registrazione manuale parte dai tre profili con override espliciti; non è un
editor completo di qualsiasi mostro. Tre forme disponibili non riempiono
automaticamente i quattro posti iniziali. Catalogo completo, selezione
strutturata da altre fonti/homebrew e policy generali di revoca rimangono
obblighi ulteriori.

Scalata/salti/anatomia, sensi condivisi, consegna a contatto, cavalcature,
Metamorfosi, effetti intangibili, molteplici evocati e trasformazioni sovrapposte
non sono dichiarati automatizzati. Le descrizioni sourced non sono pulsanti
operativi fittizi. Rat Agile e Wolf Pack Tactics/Prone sono dati strutturati
trasmessi al root; il loro effettivo raccordo al combattimento necessita delle
prove del root. CA/velocità sono correggibili sulla forma con fonte authored;
non esiste un nuovo evaluator automatico per bonus magici di qualunque oggetto.

## Snapshot del dominio consegnato alla review

| File                                               | SHA-256                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/forms-companions.mjs`            | `5a8c21a84b6f2e2afc6e8a4ec3b2cfda1cb7d92407c88962fdcac04ffae89586` |
| `design/blueprint/tests/forms-companions.test.mjs` | `29b67a603b5381738647ac0d9a758171841c7e7567080275fcd67cea6434f054` |
| `design/blueprint/forms-profile.mjs`               | `cfc3056ef4cacda976e000867bad74ede0df59cb0231a5adeb00d05e59c87662` |
| `design/blueprint/tests/forms-profile.test.mjs`    | `a964c57769ebd5c1119167e814a31c9331db50c5bd86e77a8baa578e1d8e122e` |
| `changes/interview-01/blueprint-forms-api.md`      | `7b317d27808abcab7990580976e82b14852854e126913bc91f47b9d3f5d61c3c` |
