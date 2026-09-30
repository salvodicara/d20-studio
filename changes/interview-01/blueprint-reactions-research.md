# Reazioni — evidenza per il terzo incremento del blueprint

23/09/2026. Ricerca primaria circoscritta di `review_journey`; nessuna modifica
al dominio, ai registri condivisi o al prodotto in esercizio. Fonti rilette,
non test runtime dei concorrenti. Questo documento sostiene l'incremento locale,
non attesta il completamento del blueprint o l'approvazione della baseline.

Il contratto rimane [TABLE_REACTIONS](../../docs/interview/TABLE_REACTIONS.md),
con R169/R170 in [RESEARCH](../../docs/interview/RESEARCH.md). Si raccorda alla
[ricerca del combattimento](blueprint-combat-research.md), senza importare regole
BG3 o del 2014 nella baseline 2024.

## Revisione normativa verificata

`source kind=srd`, `edition=2024`, `revision=5.2.1`. Riaperti entrambi gli URL
ufficiali il 23/09/2026 e ricalcolati gli SHA-256 dei PDF locali conservati in
`/Users/salvatoredicara/Workspace/Codex/d20-studio-experience-evidence/`:

| Lingua | Fonte ufficiale                                                                                  | SHA-256 locale                                                     |
| ------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| EN     | [SRD 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf)             | `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87` |
| IT     | [SRD 5.2.1 italiano](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf) | `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718` |

Le pagine sotto sono quelle stampate, coincidenti con l'indice PDF a base uno.
Lettura delle voci pertinenti EN/IT e dei testi locali estratti; nessuna nuova
versione dell'SRD dedotta dal solo fatto di aver riaperto l'URL.

This work includes material from the System Reference Document 5.2.1
(“SRD 5.2.1”) by Wizards of the Coast LLC, available at
<https://www.dndbeyond.com/srd>. The SRD 5.2.1 is licensed under the Creative
Commons Attribution 4.0 International License, available at
<https://creativecommons.org/licenses/by/4.0/legalcode>.

## Regole e confini di esecuzione

| Caso                                    | Comportamento della baseline e conseguenza per il dominio                                                                                                                                                                                                                                                                                                                        | Pagine EN / IT                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Reazione ordinaria                      | Risposta all'innesco, immediatamente dopo salvo eccezione specifica. Può avvenire nel proprio turno o in quello altrui; dopo l'uso torna disponibile all'inizio del prossimo turno della creatura. Offerta, lettura e rinuncia non sono uso.                                                                                                                                     | 10, 186 / 11–12, 212                                              |
| Scudo: innesco                          | Incantesimo di 1º livello, reazione quando l'incantatore è colpito da un tiro per colpire **oppure** bersagliato da Dardo incantato. Portata personale, componenti V/S. Non richiede vedere l'attaccante nel testo della magia. Disponibilità effettiva di magia, componenti, reazione e slot deve essere verificata, senza inferirla dal solo nome della classe.                | 161–162 / 186                                                     |
| Scudo: effetto                          | +5 CA anche contro l'attacco innescante; nessun danno da Dardo incantato. Termina all'inizio del proprio prossimo turno, non alla fine del turno corrente o al cambio del round. Nessuna concentrazione e nessun tiro proprio. Il +5 è un effetto temporaneo, non una riscrittura permanente della CA base.                                                                      | 161–162 / 186                                                     |
| Scudo: colpo e danno                    | Il colpo accertato apre la scelta prima dell'applicazione del danno. Rivalutare quel colpo con la CA modificata senza ritirare l'attacco; applicare il danno solo dopo la scelta e le eventuali dipendenze. Un 20 naturale continua a colpire a prescindere dalla CA: Scudo può ancora avere benefici successivi, ma non annulla quel critico.                                   | Scudo 161–162 / 186; nat. 20 e 1: 7 / 8                           |
| Scudo: costo                            | Lanciarlo usa la reazione e lo slot pertinente una volta. Uno slot disponibile non supera il limite 2024: un solo slot speso per lanciare incantesimi nel medesimo **turno**, anche se il secondo lancio sarebbe una reazione. Il contatore non è globale fra creature e non dura l'intero round.                                                                                | 10, 105 / 11–12, 119                                              |
| Opportunità: innesco e portata          | Quando una creatura che il reagente può vedere esce dalla sua portata usando movimento/una velocità, azione, azione bonus o reazione. La portata è quella pertinente all'attacco: non fissare universalmente 1,5 m se l'arma o la creatura specificano altro. Il normale spostamento all'interno della portata non è già un'uscita.                                              | 15, 185; proprietà Portata 90 / 17–18, 204; proprietà Portata 102 |
| Opportunità: risoluzione                | Una reazione per **un** attacco in mischia con un'arma o un colpo senz'armi, immediatamente prima dell'uscita. Non è automaticamente l'azione Attacco, Attacco Extra o Multiattacco; non è un generico attacco con incantesimo. La reazione è spesa anche se l'attacco manca. L'attacco può a sua volta innescare Scudo.                                                         | 15, 185 / 17–18, 204                                              |
| Opportunità: eccezioni                  | Disimpegno evita le opportunità provocate dal movimento per il resto del turno. Non provocano il teletrasporto e lo spostamento senza usare movimento, azione, azione bonus o reazione: il testo cita esplosione e caduta. Un generico flag “forzato” non basta; un effetto può far usare la reazione o il movimento della creatura. Le eccezioni specifiche restano specifiche. | 15, 181, 185 / 17–18, 207, 204                                    |
| Concentrazione dopo danno               | Per mantenere l'effetto, TS Costituzione con `CD = min(30, max(10, floor(dannoSubito / 2)))`. Usare il danno effettivamente subito, non il danno grezzo prima delle riduzioni. La richiesta segue il danno, non è una reazione e non ne spende la disponibilità. Il limite CD 30 è esplicito nel 2024.                                                                           | 179; riduzioni 17 / 206; riduzioni 19                             |
| Concentrazione che termina direttamente | Incapacitato o morto: interrompere la concentrazione senza inventare un TS. Perdere concentrazione termina l'effetto pertinente. Iniziare un altro lancio che richiede concentrazione, o attivare un altro effetto che la richiede, termina il precedente; il creatore può inoltre terminarla volontariamente senza azione.                                                      | 179, 184 / 206, 208                                               |
| Condizioni e 0 PF                       | Incapacitato impedisce azioni, azioni bonus e reazioni e interrompe concentrazione; da solo non impone velocità 0. Privo di sensi include Incapacitato e velocità 0. Non sostituire questi nessi con un ipotetico “TS concentrazione automaticamente fallito”: conta la condizione risultante e le eventuali eccezioni della creatura a 0 PF.                                    | 17, 184, 191 / 19–20, 208, 212                                    |
| Effetti simultanei                      | Durante un turno, l'ordine di eventi davvero simultanei spetta alla persona del tavolo di cui è il turno. Non è la prima risposta di rete e non autorizza una coda FIFO globale. Dipendenze causali, come Scudo interno all'opportunità, non diventano riordinabili arbitrariamente.                                                                                             | 187 / 207                                                         |

Il testo IT di Incapacitato, p.208, apre con il termine errato «paralizzato»:
il refuso già registrato in R169 rimane nella provenienza. La lettura con EN184
e IT206 conferma la condizione corretta; non crea una regola italiana diversa.

La concentrazione non usa l'automatico successo/fallimento dei naturali 20/1
degli **attacchi**. Applicare modificatore, competenza e vantaggi pertinenti
al TS. Eventuali eccezioni provengono dalla capacità specifica, non dal modello
della reazione. Non attribuire a Scudo un test o una concentrazione inesistenti.

### Limite da mantenere esplicito: fonti di danno multiple

Mantenere l'identità dell'istanza di danno e della richiesta di concentrazione.
Una somma unica mostrata nei PF non prova che più cause debbano diventare un
solo TS. In particolare, EN179/IT206 non risolve con una frase specifica quanti
TS derivino dai dardi simultanei di Dardo incantato. Questo controllo non ha
verificato un chiarimento ufficiale 2024 aggiuntivo su quel caso: non importare
automaticamente un'interpretazione 2014 o la convenzione del videogioco.
L'immunità di Scudo a quel danno, invece, è esplicita. La lettura normativa
di questo caso deve restare distinta dalla convenzione dei dadi per dardo
già dichiarata nella ricerca del combattimento.

## Precedenti di interazione: fonte, versione e limite

| Fonte primaria riaperta il 23/09/2026                                                                                                                                                                                                                                                                   | Quanto sostiene                                                                                                                                                                      | Quanto non dimostra / adattamento nostro                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [DnD5e Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities), wiki dichiarata aggiornata a 6.0.0, modifica 10/09/2026; [config.mjs](https://github.com/foundryvtt/dnd5e/blob/63e3769b87871f4d8ad56b454e1da68a7068432d/module/config.mjs#L998), revisione 6.0.3 già fissata in R170           | Separazione tra attivazione, durata, consumo e bersagli. `reaction` è un tipo di attivazione configurato.                                                                            | Non è una prova di un tipo di attività autonomo “Activity Reaction” né di un orchestratore globale di prompt. La wiki elenca attività quali Attack, Save e Use; non attribuire a Foundry una funzione separata non documentata. Wiki pubblicata, non runtime osservato.                                                                                      |
| [DnD5e request-message-data.mjs](https://github.com/foundryvtt/dnd5e/blob/63e3769b87871f4d8ad56b454e1da68a7068432d/module/data/chat-message/request-message-data.mjs), SHA `63e3769b87871f4d8ad56b454e1da68a7068432d`                                                                                   | Collega una risposta al messaggio richiesto e alla creatura tramite `actorUuid` e `requestId`; aggiorna il risultato del bersaglio corrispondente.                                   | Sostiene identità e correlazione, non FIFO, assenza di sovrapposizione dei dialoghi o tutti i permessi del blueprint.                                                                                                                                                                                                                                        |
| [Midi-QOL utils.ts](https://gitlab.com/tposney/midi-qol/-/blob/6b10be53c140aea013f7ca130c35abf3e2c81e44/src/module/utils.ts), SHA `6b10be53c140aea013f7ca130c35abf3e2c81e44`; `package.json` riletto: 13.0.65                                                                                           | `requestReactions` inoltra la scelta al GM o all'utente pertinente; `promptReactions` filtra attività e attende `reactionDialog`. Il dialogo presenta le alternative della creatura. | L'attesa della singola promessa non prova una coda globale. Il codice usa timeout; la chiusura risolve senza reazione. Il nostro Esc che conserva la richiesta e l'assenza di timeout implicito provengono da TABLE_REACTIONS, non da Midi-QOL. Il primo recupero web della vista blob falliva; il contenuto raw allo stesso SHA è stato recuperato e letto. |
| [Midi-QOL GMAction.ts](https://gitlab.com/tposney/midi-qol/-/blob/6b10be53c140aea013f7ca130c35abf3e2c81e44/src/module/GMAction.ts) e [MidiActivityMixin.ts](https://gitlab.com/tposney/midi-qol/-/blob/6b10be53c140aea013f7ca130c35abf3e2c81e44/src/module/activities/MidiActivityMixin.ts), stesso SHA | Registra `chooseReactions` verso il gestore locale; dopo il completamento dell'uso, il mixin marca la reazione usata quando pertinente.                                              | Comportamento del modulo, non del core Foundry. Non dedurre consumo all'apertura del prompt o un blocco globale di tutta la partita.                                                                                                                                                                                                                         |
| [Larian Patch 2](https://baldursgate3.game/news/patch-2-now-live_89), pagina 03/09/2023; R170 distingue il rilascio storico 31/08/2023                                                                                                                                                                  | Tooltip con stato abilitato, scelta Ask e risorsa della reazione; Ask modificabile se la reazione è abilitata.                                                                       | Non prova il default corrente di ogni capacità. Il default Chiedi del blueprint è I-022; nessuna regola BG3 sostituisce SRD2024.                                                                                                                                                                                                                             |
| [Larian Patch 7](https://baldursgate3.game/news/patch-7-now-live_121), 05/09/2024                                                                                                                                                                                                                       | Interfaccia che permette selezionare le reazioni volute e confermarle insieme, riducendo rifiuti ripetuti; costi più leggibili.                                                      | Precedente per alternative presentate insieme, non prova di FIFO, autorità multipersonaggio universale o compatibilità automatica fra tutte le scelte.                                                                                                                                                                                                       |

## Invarianti per API e UI del blueprint

Sono raccordi applicativi del contratto già deciso, non nuove API attribuite
ai concorrenti né nomi obbligatori per l'implementazione.

1. Ogni richiesta conserva identità, creatura/controllore, evento innescante,
   sequenza sospesa e stato. Riaprire e ricaricare ritrovano quella richiesta;
   una seconda risposta non ripete consumo, danno o estrazione.
2. Esporre soltanto i dati consentiti. Con tiro nemico privato, l'offerta Scudo
   può spiegare il +5 CA ma non promettere il mancato colpo o svelare il totale.
   Il costo va distinto dall'aspettativa di successo.
3. Offerta, Dettagli, Esc e Rinuncia non consumano. Esc conserva il pendente;
   Rinuncia risolve solo quella scelta per quell'evento. Conferma rivalida
   autorità, trigger, risorse, componenti e limite slot/turno.
4. Un attacco di opportunità sospende prima dell'uscita: posizione e movimento
   già speso restano acquisiti, percorso residuo e budget residuo sono distinti.
   Risolvere Scudo/danno/concentrazione prima della continuazione dipendente.
5. Conservare le risposte ai TS come richieste obbligatorie di regola, senza
   trasformarle in reazioni facoltative. Se la concentrazione termina direttamente,
   non creare una richiesta finta; aggiornarne gli effetti dipendenti.
6. Risoluzioni dipendenti seguono causa ed effetto. Una seconda notifica non
   sostituisce il dettaglio aperto. Non sospendere automaticamente altre scene
   o attività indipendenti e non imporre un ordinamento globale non deciso.
7. Rifiuto offline o input fisico incompleto non producono esiti confermati.
   Registrazione e dadi avvengono nel comando autorizzato, conservando modalità,
   facce, modificatori, autore e visibilità; correzione/undo conserva evidenza.
8. La scadenza di Scudo e il recupero della reazione usano l'inizio del turno
   della stessa creatura. Né una preview, né il cambio round, né un salvataggio
   della scena devono anticipare questi eventi.

## Esempi attesi per la verifica dell'autore

Questi sono casi di accettazione ricavati dalle fonti, **non test eseguiti**.

| Caso                                                                            | Esito atteso                                                                                                                                                                     |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA14, tiro totale18, Scudo utilizzabile                                         | Usa: CA19 fino al prossimo inizio turno, colpo mancato, nessun danno; reazione e slot spesi una volta. Rinuncia: CA14 e risorse intatte, danno ancora da risolvere.              |
| CA14, naturale20, Scudo                                                         | L'attacco rimane critico; niente promessa di annullarlo. L'effetto di Scudo resta pertinente fino alla propria scadenza.                                                         |
| Bersaglio di Dardo incantato con Scudo                                          | Nessun danno da quel lancio al bersaglio protetto; gli altri bersagli restano distinti. Nessun tiro per Scudo.                                                                   |
| Slot già speso nel proprio turno, reazione disponibile                          | Scudo che richiede un altro slot non diventa utilizzabile solo perché la reazione è disponibile. Su un successivo turno altrui la verifica del limite riguarda quel nuovo turno. |
| Uscita visibile dalla portata, Disimpegno assente                               | Richiesta prima dell'uscita. Usa produce un solo attacco in mischia e spende reazione anche se manca; Rinuncia non la spende.                                                    |
| Teletrasporto / spinta senza risorse del mosso / movimento tramite sua reazione | I primi due non provocano l'opportunità ordinaria; il terzo non è escluso dal solo fatto di essere imposto da un effetto.                                                        |
| Danni subiti 5, 21, 22, 59, 60, 100                                             | CD rispettivamente 10, 10, 11, 29, 30, 30. TS COS distinto dalla reazione, dopo il danno.                                                                                        |
| Danno rende Privo di sensi o morto                                              | Concentrazione termina direttamente; nessun tiro per mantenerla. La perdita di effetti dipendenti precede la ripresa.                                                            |
| Riduci / ricarica / doppia risposta / correzione                                | Stessa richiesta pendente o già risolta; nessun costo doppio; vecchi risultati consultabili con corretta visibilità e stato di correzione.                                       |

Non coperti da questo controllo: implementazione geometrica completa delle
uscite, catene generali di Controincantesimo, Ready, ordine fuori turno, ogni
abilità/modulo disponibile e tutte le interazioni fra istanze simultanee di danno.
Sono limiti dell'evidenza circoscritta, non esclusioni di prodotto.
