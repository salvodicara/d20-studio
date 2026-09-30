# Tavolo — reazioni, richieste e interruzioni

22/09/2026. Definizione dell'agente su delega I-180/I-190/I-202, I-203/I-204.
Integra I-022–I-024, I-028–I-030, I-073/I-074 e I-147; fonti R169/R170.
Contratto parziale in Markdown, non implementazione o approvazione complessiva.

## Quando compare una reazione

La sequenza si arresta nel punto previsto dalla specifica capacità. Per un
attacco di opportunità, la creatura è ancora entro portata, prima di uscirne;
per Scudo, l'attacco ha colpito ma il suo danno non è ancora applicato.
Non usare una fase unica «dopo la mossa» per tutte le reazioni.

Quando il controllore deve scegliere, compare una richiesta collegata
all'evento, alla creatura e alla sequenza sospesa. Il default è **Chiedi**, I-022.
La richiesta mostra:

- creatura che può reagire e motivo noto dell'occasione;
- capacità disponibili, costo e risorse rimaste;
- effetto pertinente, durata e scelte ancora necessarie;
- parte già avvenuta e parte in attesa, distinguendo movimento residuo del
  percorso preparato da movimento totale ancora disponibile;
- dati del tiro che il destinatario è autorizzato a conoscere e collegamento
  al dettaglio della regola e del calcolo.

La richiesta non concede controllo di altre creature e non rivela una
capacità, un soggetto nascosto o un risultato riservato a chi non può conoscerli.
Scudo può essere offerto dopo un colpo anche se il totale nemico è nascosto:
si descrive il beneficio noto di +5 CA, senza promettere che farà mancare quel
colpo o svelarne indirettamente il totale. Un 20 naturale non viene annullato
semplicemente alzando la CA. Il caso di Dardo incantato ha il proprio effetto.

## Scegliere, ridurre e tornare alla richiesta

| Comando                       | Risultato e disponibilità                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usa [capacità]                | Conferma quella scelta per quella creatura e occasione, dopo le eventuali selezioni previste. Rivalida innesco, permessi e risorse; avvia l'uso, senza seconda approvazione DM ordinaria.   |
| Rinuncia per questa occasione | Risolve la scelta facoltativa di quella creatura per quell'evento senza usare la reazione o spendere lo slot. Non disattiva la capacità per il futuro e non rinuncia per le altre creature. |
| Dettagli                      | Mostra calcoli e regola consentiti; non usa la capacità né modifica la scelta.                                                                                                              |
| Riduci richiesta / Esc        | Chiude soltanto il dettaglio, lasciando una richiesta pendente riconoscibile sulla scena. Non significa rinuncia, risposta o ripresa della sequenza.                                        |
| Riapri richiesta              | Ritrova lo stesso evento e le selezioni ancora valide, senza creare una nuova richiesta o un secondo consumo.                                                                               |

La scelta iniziale di una capacità apre soltanto gli input che le servono:
bersaglio, slot o modalità quando previsti; Scudo nel caso semplice non chiede
un bersaglio o un dado artificiale. Mostrare le alternative dello stesso evento
nello stesso dettaglio evita una successione di finestre da rifiutare una a una.
La conferma esegue solo le scelte compatibili con regole e risorse disponibili.

Consultare mappa, scheda, registro e testo della capacità rimane possibile.
Le conseguenze dipendenti attendono la risposta; non si eseguono altre mosse
che presuppongono risolto quell'evento. Non è una pausa globale di ogni utente
o di ogni scena. Il ritorno conserva contesto e focus; un nuovo arrivo non
sostituisce il dettaglio o il campo di testo già in uso.

Non si applica un conto alla rovescia predefinito che rinuncia per il giocatore.
Il silenzio, la chiusura e la perdita di rete non autorizzano risposte. Il DM
può intervenire esplicitamente, con autore e conseguenze registrati.
Le impostazioni avanzate per singola capacità — disattivazione delle proposte,
uso automatico e relative condizioni — restano da specificare: il default
Chiedi non introduce una scelta tattica automatica.

## Richieste multiple e ordine degli eventi

La lista **Richieste** distingue le voci per creatura, causa e stato. Due eventi
diversi non si fondono perché arrivano alla stessa persona. Se un utente
controlla più creature, identifica sempre per chi risponde e quali risorse usa.
Il conteggio e i nomi rispettano i permessi; non includono richieste segrete altrui.

L'arrivo di una seconda richiesta viene segnalato senza rubare il dettaglio
aperto. Si può scegliere quale consultare, come il principio I-073/I-074;
questo non autorizza a risolvere gli eventi in ordine arbitrario.

- Eventi dipendenti seguono il loro ordine causale. Una reazione a una reazione
  è collegata al suo evento: il seguito esterno attende la risoluzione interna.
- Per effetti che accadono contemporaneamente durante un turno, la regola
  2024 affida l'ordine alla persona di cui è il turno, giocatore o DM. La
  priorità non deriva dal tempo di arrivo in rete o dalla rapidità del clic.
- Se per procedere serve stabilire quell'ordine, la persona pertinente lo
  sceglie su un riepilogo consentito. Non si divulgano effetti segreti a chi
  non può conoscerli: i dettagli di questa mediazione restano da definire.
- Azioni indipendenti possono restare consultabili mentre una richiesta
  aspetta. Le azioni che usano gli stessi dati o risorse in attesa non
  applicano risultati concorrenti incompatibili.
- Dopo ogni esito si ricontrollano le possibilità successive. Una reazione
  usata può rendere indisponibile l'altra; non addebitare due volte una sola
  reazione e non chiedere di rispondere a una possibilità ormai decaduta.
- Il DM può avviare più attacchi insieme, I-147, ma ogni colpo mantiene il
  proprio esito: Scudo sul primo va risolto prima di stabilire i successivi.

La lista con un dettaglio alla volta è il nostro raccordo delle decisioni
precedenti e dei prodotti. Non attribuirla come coda globale verificata a
Midi-QOL: il percorso letto apre dialoghi separati. L'ordine fuori da un turno,
le informazioni segrete negli effetti simultanei e gli eventi di scene diverse
rimangono da specificare con esempi propri, senza un FIFO inventato.

## Consumo, risultati e dadi

Offrire, consultare e rifiutare una reazione non la spendono. L'uso effettivo
registra le risorse pertinenti secondo la capacità. Disponibilità della
reazione e slot incantesimo sono contatori distinti; la reazione ordinaria
ritorna all'inizio del turno successivo della creatura, non alla fine del
proprio turno o al semplice avanzamento del round.

| Caso della baseline 2024 | Momento e conseguenza                                                                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attacco di opportunità   | Reazione per effettuare un attacco in mischia immediatamente prima dell'uscita dalla portata; anche se manca, la reazione è stata usata. Disimpegno e le altre eccezioni seguono la regola specifica.                                                                                       |
| Scudo                    | Reazione al colpo o a Dardo incantato; +5 CA fino all'inizio del turno successivo, anche contro l'attacco innescante, e protezione da Dardo incantato. Nessun tiro proprio e nessuna concentrazione. Slot quando il lancio lo usa.                                                          |
| Controincantesimo        | Nel testo 2024 il bersaglio effettua un TS Costituzione. Se fallisce, l'incantesimo è interrotto e l'azione/azione bonus/reazione usata per lanciarlo è spesa; lo slot del lancio interrotto non si consuma. Il controincantesimo conserva i propri costi. Non trasferire l'esito del 2014. |
| Preparare                | L'azione viene usata per prepararsi; la reazione eventuale avviene dopo il completamento dell'innesco. Una magia preparata usa già il proprio lancio/slot e richiede concentrazione mentre è trattenuta; ignorare l'innesco non equivale a rimborsarla.                                     |
| Danno e concentrazione   | Applicare il danno pertinente, poi risolvere il mantenimento secondo la regola. Se la concentrazione termina automaticamente, non chiedere un TS fittizio. Effetti dipendenti, compresa l'eventuale perdita di volo, si aggiornano prima di riprendere.                                     |

Reazioni, azioni leggendarie e tiri obbligatori non sono sinonimi. I-148
mantiene i promemoria delle azioni leggendarie separati. Una richiesta di
TS non offre una rinuncia tattica equivalente a non usare Scudo.

Ogni tiro richiesto supporta dadi digitali e fisici, con valori naturali,
modificatori e totale, secondo visibilità e autorità già acquisite. Nel caso
fisico mancante si conserva l'attesa; non attribuire zero, successo, fallimento
o un tiro digitale sostitutivo. Chiudere il dettaglio conserva il valore
digitato come bozza, distinto da un risultato registrato.

## Riprendere la sequenza o cambiare strategia

Si riprende soltanto la parte già confermata e ancora consentita, dopo le
richieste e conseguenze necessarie. I due casi già concordati rimangono distinti:

1. **Scudo evita il colpo, senza altri cambiamenti:** il percorso valido
   prosegue automaticamente, I-023. Non chiedere nuovamente il permesso per
   la stessa mossa e non scegliere un percorso o un bersaglio diverso.
2. **Il colpo infligge danni durante la mossa e la creatura può proseguire:**
   mostrare esito e posizione raggiunta; **Continua movimento** riprende il
   tratto rimasto, **Cambia mossa** lo abbandona e riapre le scelte dalla
   situazione attuale, I-024. Danni, metri e risorse già spesi rimangono.
3. **La mossa non è più lecita:** spiegare il motivo conoscibile e non
   eseguire il tratto incompatibile. Velocità ridotta, posizione cambiata
   e perdita di volo richiedono rivalutazione. Incapacitato impedisce azioni,
   azioni bonus e reazioni, ma non azzera da solo la velocità: verificare
   quali parti della sequenza restano consentite, senza vietare ogni movimento.

Un'altra scelta obbligatoria o una reazione annidata precede la ripresa.
La pausa dopo il danno non impone una soglia di PF e non azzera la velocità;
non viene qui generalizzata a ogni fonte di danno durante qualsiasi attività.
Il tasto Esc sulla richiesta pendente non è il comando Ferma movimento di
I-201: opera sul contesto aperto, senza rispondere alla richiesta.

## Correzioni, controllori e rete

- I-028/I-029 permettono sempre di correggere un errore. Dopo reazioni o danni,
  tornare a una posizione precedente non cancella silenziosamente quegli eventi.
  Il riepilogo separa dato corretto, conseguenze condivise e riavvolgimento del DM.
- La semplice consultazione della correzione non sospende tutto il tavolo,
  I-030; gli eventi che dipendono dai dati contestati richiedono gestione esplicita.
- Più controllori vedono lo stato corrente della stessa richiesta. Quando
  una risposta autorizzata è accettata, gli altri vedono chi ha risposto e
  l'esito consentito. Un invio tardivo non spende di nuovo né sovrascrive il
  risultato; permette di raggiungere la correzione se la risposta era errata.
- Questa accettazione unica evita duplicazioni e non determina l'ordine
  normativo tra effetti simultanei. Eventuali scelte incompatibili ancora
  pendenti vengono rivalidate prima di applicare conseguenze.
- La disconnessione lascia la richiesta pendente. Mostrare chi manca e
  consentire al DM di intervenire esplicitamente; non passargli automaticamente
  un tiro segreto o fingere una delega personale dell'assente.
- Se l'invio ha esito incerto, mostrare **Risposta da verificare** e recuperare
  lo stato condiviso prima di proporre un'altra esecuzione. Rientrare non
  rilancia dadi o consuma risorse; ritrovare il dettaglio resta possibile.
- Bozza fisica locale, risposta inviata e risultato accettato hanno stati
  distinguibili. Una richiesta divenuta non applicabile resta nel registro
  con il motivo visibile, senza continuare a chiedere una risposta impossibile.

## Visita illustrativa precedente — il colpo durante il movimento

Fixture sintetica, regole SRD 5.2.1/2024 e tiri nemici pubblici per questo caso.
Livia ha CA 14, 18 PF, velocità 9 m, reazione disponibile e due slot di 1º livello.
Scudo è utilizzabile, componenti V/S consentite; nessuno slot già speso per
lanciare un incantesimo nel turno. Non è concentrata e non ha usato Disimpegno.
Il Goblin guerriero vede Livia e poteva reagire; tiro normale, senza vantaggio
o svantaggio. La sua scimitarra usa +4 e 1d6+2; la fixture non applica
l'ulteriore danno che la sua capacità prevede con vantaggio.

- Livia ha percorso 3 m dei 6 m confermati. Restano 6 m di budget, di cui
  3 m appartengono al percorso ancora da eseguire. È ferma prima dell'uscita
  dalla portata del goblin; la geometria mostrata è schematica.
- Il goblin ha già usato la propria reazione e tirato 14+4=18, colpendo CA 14.
  I danni attendono: ora la richiesta di Scudo appartiene a Livia.
- **Usa Scudo:** CA 19, attacco mancato, PF 18, slot 2→1 e reazione di Livia
  usata. Il goblin non recupera la propria reazione. I 3 m residui vengono
  percorsi automaticamente: 6 m usati in totale, 3 m ancora disponibili.
- **Rinuncia:** slot 2 e reazione di Livia ancora disponibili. Il DM risolve
  il danno: digitale dimostrativo 3+2=5, oppure d6 fisico 1–6 con +2 visibile.
  Con il dato d'esempio, PF 18→13. Nessun nuovo tiro d'attacco o di Scudo.
- Dopo il danno, posizione ferma a 3 m e budget 6 m: continuare percorre i
  3 m rimasti, cambiare mossa conserva posizione e costi già avvenuti.

La visita passa esplicitamente al punto di vista DM per l'input del danno:
non concede al giocatore il controllo ordinario dei tiri nemici. Il valore
digitale è preimpostato e dichiarato dimostrativo, non prova di casualità.
Non simula richieste simultanee, rete, concentrazione, Controincantesimo o un
motore completo. Nessuna approvazione del prodotto dedotta dalle interazioni.

## Lavoro residuo

Configurazione automatica per capacità; scelte nascoste negli effetti simultanei;
ordine fuori iniziativa; Ready con più inneschi e magie trattenute; catene di
Controincantesimo e capacità speciali; geometria esatta del confine; concentrazione
e movimento su piani diversi; input fisico già tirato ma non registrato;
mediazione dei conflitti tra controllori; dettagli della riconciliazione e
trasferimento di controllo. Queste lacune non riaprono le scelte ordinarie
già definite né sono richieste automatiche di approvazione all'owner.

## Raccordo con l'app unica — incremento 3, 23/09/2026

La visita precedente resta evidenza di una singola illustrazione. Il blueprint
integrato in `design/blueprint` ora usa gli attacchi e i dadi dello stato
comune: niente risultato digitale prefissato, reazioni simultanee e
concentrazione collegate nei casi specificati da I-220/R187. Vedere
[BLUEPRINT_STATUS](BLUEPRINT_STATUS.md) per percorso, controlli e prove.
Il lavoro residuo sopra riguarda il contratto esteso, non una dichiarazione
che le richieste di concentrazione del nuovo campione siano ancora assenti.
