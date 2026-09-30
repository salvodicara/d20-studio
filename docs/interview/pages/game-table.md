# Tavolo di gioco — pagina concettuale iniziale

21/09/2026. Deriva da I-003/I-007/I-049/I-058/I-113/I-186/I-188, con raccordo I-194
e grammatica ordinaria I-196/I-197.

I-198/I-199 precisano libertà dei gesti e partecipazione dell'owner: destinazioni
e puntamento direttamente sulla mappa, vista consultabile senza muovere pedine.
Le due posizioni/direzioni della visita precedente non sono comandi di prodotto.
I-209 affida all'agente le scelte ordinarie dei gesti con fonte e motivo;
lo stile grafico resta da sviluppare nella fase autorizzata.
I-200/I-201 aggiungono fermata al budget visibile prima della conferma e
annullamento dello spostamento eseguito, distinti da cancellare una preview.
Dettagli e dipendenze in TABLE_MOVEMENT, fonti R167/R168.
I-203/I-204 definiscono richieste contestuali, ordine e ripresa ordinaria:
[reazioni e interruzioni](../TABLE_REACTIONS.md), R169/R170.
Stato: definizione parziale dell'agente su delega I-180. Nessuna pagina o
composizione completa approvata dall'owner. Q163 è risolta dall'agente su
delega I-190: scena protagonista e dettagli apribili/fissabili; non è
approvazione owner di ogni dettaglio grafico dell'illustrazione. Controlli nuovi sono etichette
funzionali proposte, non stringhe finali EN/IT o grafica già scelta.

## Navigazione comune — I-212, 23/09/2026

Menu generale App compatto, scena centrale, accessi Scheda/Gruppo/Registro/Materiali/Appunti/Richieste. Scheda laterale e completa, rientro nella campagna; chiudere un dettaglio non termina gioco o richieste.
Fonti, ritorni e comportamento trasversale in [NAVIGATION](../NAVIGATION.md);
gli [ingressi delle funzioni](../NAVIGATION_COVERAGE.md) non ne attestano la completezza.

## Scopo, persone e arrivo

Il tavolo ospita la partita. Giocatore, DM, co-DM e spettatore invitato vi
accedono secondo i permessi della campagna. La modalità giocatore del DM
conserva il percorso di ritorno I-039; la vista non concede nuovi privilegi.

Si arriva dalla campagna o dal percorso di accesso autorizzato alla sessione.
Il primo raccordo di invito, ingresso e rientro è descritto in
[Campagna](campaign.md); accesso e recupero account restano da completare.
Il giocatore usa le creature affidategli, anche più di una o condivise,
I-040/I-041. Lo spettatore non riceve automaticamente controlli sulle creature.

Il tavolo deve consentire di consultare scheda, inventario, magie e informazioni
accessibili della campagna senza perdere il contesto della partita. Il ritorno
alla campagna rimane distinguibile dalla conclusione della sessione per tutti:
uscire da una vista non è un comando implicito di chiusura del gioco.

## Raccordo con il resto dell'app — 22/09/2026

Da [Personaggi](characters.md) si apre la scheda anche senza campagna; il
collegamento al tavolo appare quando esiste un contesto autorizzato. Dalla
[Campagna](campaign.md) si legge il riepilogo precedente e si entra nel tavolo
attualmente disponibile. Aprire una scheda non seleziona un nuovo turno o
duplica un personaggio; un personaggio controllato e una pedina selezionata
rimangono concetti distinti.

Il pannello scheda e la pagina completa mostrano gli stessi dati autorizzati.
Una bozza di avanzamento non sostituisce il livello applicato e una nota
personale conserva il proprio accesso Solo io. Chiudere un pannello non
pubblica la nota né conferma una modifica: conservazione della bozza,
salvataggio e scarto sono espliciti nei rispettivi percorsi.

**Torna alla campagna** cambia vista senza concludere turno, scontro o
sessione. Al rientro, il tavolo riprende lo stato corrente autorizzato; non
restaura una vecchia scena o le risorse di quando si era usciti. Tiri e
reazioni pendenti non vengono risolti dal cambio di pagina. Con rete assente
o accesso revocato non si presenta una copia locale come partita sincronizzata.

Questo raccordo viene illustrato in app-journey-v1 con dati sintetici e una
nota locale. La scena statica di quella visita serve all'orientamento: non
sostituisce i gesti di movimento I-199/I-201 né prova salvataggio server,
multiplayer, permessi o correttezza delle regole del prodotto.

## Oggetti e magie nel percorso della scheda — 23/09/2026

[INVENTORY_FLOW](../INVENTORY_FLOW.md) e [SPELLCASTING_FLOW](../SPELLCASTING_FLOW.md)
collegano Biblioteca, scheda e mossa al Tavolo, I-210/I-211. Un oggetto nei
preferiti o una magia consultata non diventano usi separati: quantità, cariche,
slot ed effetti appartengono alla stessa creatura. Preparare una scelta non
spende, chiudere un dettaglio non rimborsa, tornare alla scheda non conclude
una richiesta pendente. I-016 mantiene il clic sul bersaglio per l'attacco
singolo con mouse; area e altre scelte usano la conferma pertinente.

[DESIGN_SOURCES](../DESIGN_SOURCES.md) collega impianto e comandi ai riferimenti.
Il dettaglio ordinario procede sotto delega I-209; nessun voto routinario
sui gesti o sui pannelli è richiesto.

## Informazioni e sezioni

- **Scena:** mappa assegnata, pedine e contenuti noti. Se non si usa mappa,
  partecipanti e contesto narrativo conservano accesso alle stesse azioni.
- **Contesto personale:** creatura controllata, risorse ed effetti rilevanti;
  collegamento alla sua scheda individuale, senza duplicarne i dati.
- **Azioni:** opzioni disponibili e preferiti I-159; accesso alle altre mosse,
  capacità, magie e oggetti. La quantità visibile richiede ancora definizione.
- **Turni:** quando pertinenti, chi agisce e ordine accessibile. Esplorazione
  libera, esplorazione a turni e combattimento rimangono distinguibili.
  Nei round comuni d'esplorazione si vedono partecipanti e stati «In corso»/
  «Finito» accessibili; l'ordine numerico appartiene al combattimento o
  all'arbitraggio esplicito del DM, non nasce da un'iniziativa obbligatoria.
- **Dettaglio della scelta:** testo utile, costi, bersaglio/destinazione e
  impedimenti noti; preview privata del giocatore I-011.
- **Richieste:** tiri e reazioni in attesa, con destinatario e motivo visibili
  secondo i permessi. Una richiesta non è ancora una risorsa consumata.
- **Esiti e cronologia:** ciò che è accaduto, contributi al risultato,
  conseguenze, collegamento alla correzione. Tiri segreti restano segreti.
- **Contenuti di supporto:** scheda completa, inventario, appunti e materiali
  consultabili; si aprono quando servono e possono restare fissati, I-190.
  All'ingresso la scena ha la priorità, senza pannelli completi obbligatori.
- **Stato della connessione:** distinguere presenza nel tavolo e lavoro locale;
  eventuali dati non ancora confermati non sono presentati come condivisi.

La disposizione spaziale precisa rimane da sviluppare dall'agente. Il default
I-190 non obbliga a chiudere pannelli utili e non seleziona il layout del telefono.
Apertura, fissaggio e richiamo devono conservare il contesto della partita;
le relative regole di persistenza restano da definire autonomamente.

## Percorso del giocatore

Il giocatore controlla il proprio personaggio e vede la scena accessibile.
Può aprire una magia, confrontarla con un'alternativa e tornare alla mappa.
Durante un altro turno può preparare una preview senza eseguire la mossa.
Nel proprio turno controlla la situazione, cambia liberamente strategia e
conferma attraverso il gesto previsto dalla famiglia dell'azione.

La conferma rende effettive le parti della sequenza via via eseguite, con
le interruzioni pertinenti. Il dado fisico richiede input; quello digitale
segue la preferenza scelta. Il risultato mostra il breakdown accessibile.
Il dettaglio dell'esito porta alla correzione, senza costringere a cercare
il valore in un'altra pagina. [Decisioni I-009–I-032 e raccordo](../COMBAT_EXPLORATION.md).

## Comandi principali e comportamento

Questa è una prima specifica del percorso comune. Dove manca una regola,
la lacuna è lavoro dell'agente: non è un comportamento approvato implicitamente.

| Comando o gesto                       | Chi e quando                                                                            | Input e risultato                                                                                               | Persistenza, annullamento e limiti                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Seleziona creatura                    | Chi può controllarla; per gli altri sola consultazione se autorizzata.                  | Cambia il contesto dei comandi senza concedere nuovi permessi.                                                  | Nessuna spesa o spostamento. Conservazione delle preview fra creature da definire.                                                        |
| Esplorazione a turni                  | DM/co-DM autorizzato nella scena.                                                       | Controlla i partecipanti proposti, aggiunge/esclude creature e avvia un round comune senza iniziativa.          | Schede e segreti conservati; non modifica implicitamente le altre scene né recupera risorse, I-194.                                       |
| Finito                                | Controllore di una creatura partecipante al round d'esplorazione.                       | Segnala che quella creatura ha finito; il DM vede chi è ancora in corso.                                        | Non esegue preview, spende risorse o avanza da solo il round. Ripensamento e controllori concorrenti da definire.                         |
| Avanza round                          | DM/co-DM autorizzato durante l'esplorazione a turni.                                    | Passa al round successivo quando la situazione è pronta, con richieste pendenti riconoscibili.                  | Non tratta azioni in corso come concluse; durata, forzatura e confini delle capacità ancora da specificare.                               |
| Riprendi esplorazione libera          | DM/co-DM autorizzato, quando la scansione a turni non serve più.                        | Conclude i turni d'esplorazione; dopo lo scontro è la destinazione normale del comando di conclusione.          | Posizioni, risorse, effetti pertinenti e storia conservati. Non chiude la sessione o annulla richieste pendenti.                          |
| Prepara combattimento                 | DM/co-DM autorizzato.                                                                   | Apre partecipanti, controllori, visibilità e iniziative; aggiunge/rimuove partecipanti.                         | Chiudere il pannello conserva la preparazione. Scartarla non elimina schede o tiri già registrati, I-192.                                 |
| Richiedi iniziativa / Correggi ordine | DM per le richieste; controllori per i propri tiri; autorità delle parità secondo R162. | Dadi fisici o digitali, breakdown e ordine; mancanti riconoscibili.                                             | Nessun tiro sostitutivo, zero o rilancio implicito. Visibilità individuale preservata.                                                    |
| Inizia combattimento                  | DM, dopo determinazione dell'ordine o sua correzione esplicita.                         | Avvia round e primo turno, conserva la scena.                                                                   | Stato condiviso; non avviabile offline come se fosse accettato dal tavolo. Nessun riposo implicito.                                       |
| Concludi combattimento                | DM/co-DM autorizzato.                                                                   | Mostra richieste aperte ed effetti da seguire, poi ritorna al contesto di esplorazione.                         | Conserva posizioni, risorse e cronologia. Non equivale a uscire dalla pagina o riavvolgere la partita.                                    |
| Apri scheda / Inventario / Magie      | Chi può accedere al contenuto.                                                          | Consulta il dettaglio, mantenendo un ritorno al tavolo.                                                         | Aprire non equipaggia, prepara o usa oggetti. Modifiche hanno i propri comandi e salvataggi.                                              |
| Scegli una mossa                      | Controllore autorizzato; preview anche fuori dal proprio turno dove già previsto.       | Mostra costi, input richiesti e impedimenti noti.                                                               | La consultazione non produce conseguenze; sostituire la scelta è libero prima della conferma.                                             |
| Conferma attacco singolo              | Nel proprio turno quando valido; mouse secondo I-016.                                   | Clic sul bersaglio mostrato in preview esegue la sequenza prevista.                                             | Nessuna seconda conferma obbligatoria; conseguenze già avvenute richiedono correzione, non cancellazione della preview.                   |
| Scattare / Tenta di nasconderti       | Creature autorizzate, disponibilità secondo regole e dati.                              | Percorsi distinti I-017/I-018/I-021/I-025.                                                                      | Nessun bersaglio artificiale; spesa nel momento già concordato.                                                                           |
| Annulla preview                       | Autore della preparazione, prima dell'esecuzione.                                       | Abbandona l'intenzione provvisoria.                                                                             | Esc nel contesto di preparazione; non riavvolge azioni confermate o movimento già effettuato, I-201.                                      |
| Muovi entro il budget                 | Controllore autorizzato, quando la mossa è eseguibile.                                  | Destinazione libera; se troppo lontana, preview del solo tratto consentito e fermata effettiva.                 | Conferma soltanto quanto mostrato; eccedenza rossa/tratteggiata, nessuno Scatto o accodamento automatico, I-201.                          |
| Ferma movimento                       | Controllore della mossa in corso.                                                       | Interrompe il tratto ancora da percorrere.                                                                      | Posizione raggiunta, consumo e conseguenze conservati; distinto da Annulla spostamento.                                                   |
| Annulla spostamento                   | Autore della mossa su creatura ancora controllabile; Ctrl+Z/⌘Z nel contesto mappa.      | Caso semplice: ripristina posizione e budget precedenti.                                                        | Correzione registrata; dipendenze successive aprono riepilogo e intervento pertinente, senza cancellazioni silenziose, I-028/I-029/I-201. |
| Tira / Inserisci dadi fisici          | Destinatario autorizzato della richiesta.                                               | Lancio digitale o risultati fisici; contributi e totale calcolati.                                              | Input mancante non autorizza tiro sostitutivo; correggibile secondo I-028.                                                                |
| Rispondi a reazione                   | Controllore autorizzato, all’innesco pertinente.                                        | Usa la capacità valida oppure rinuncia per quella creatura e occasione; evento, costo ed effetto noti visibili. | Offerta/rinuncia senza consumo; risorse e tempistica specifiche. Chiusura/Esc riduce e mantiene pendente, I-203/I-204.                    |
| Richieste / Riapri                    | Destinatario autorizzato di una richiesta.                                              | Elenca eventi distinti; apre un dettaglio senza sostituirlo quando arriva un’altra voce.                        | Consultazione distinta dall’ordine di risoluzione; cause e regole prevalgono sulla lista. Nessun timeout/rifiuto implicito.               |
| Continua movimento / Cambia mossa     | Controllore dopo danno durante la mossa, risolte le conseguenze obbligatorie.           | Riprende il tratto confermato ancora valido oppure lo abbandona dalla posizione attuale.                        | Metri, danni e costi già avvenuti conservati. Scudo che evita il colpo consente invece ripresa automatica se non occorrono altre scelte.  |
| Dettaglio esito / Correggi            | Visibilità e autorità secondo I-028/I-029 e permessi del contenuto.                     | Legge il calcolo o modifica il dato pertinente.                                                                 | Traccia della correzione; riavvolgimento distinto, non automatico.                                                                        |
| Fine turno                            | Persona autorizzata a concludere quel turno.                                            | Passaggio nella sequenza e applicazione dei confini temporali pertinenti.                                       | Casi con richieste aperte, ripensamento e deleghe richiedono ancora definizione.                                                          |
| Apri registro / Cerca                 | Chi ha accesso ai relativi contenuti.                                                   | Consulta esiti o trova informazioni, I-179/I-184.                                                               | Permessi conservati; nessun acquisto, lancio o rivelazione implicita.                                                                     |

## Percorso e poteri del DM

Per muovere un PNG il DM seleziona la pedina e la trascina con percorso e costo
visibili; il rilascio su una destinazione valida esegue. La preparazione con
tappe è facoltativa. Selezionare per controllare e indicare come bersaglio
restano distinti. [Movimento: comandi, correzione, permessi e rete](../TABLE_MOVEMENT.md).

Per una magia ad area il giocatore prepara la forma consentita, ne regola
origine/direzione e vede le creature note coinvolte, inclusi gli alleati.
«Lancia [incantesimo]» avvia la risoluzione; i risultati mancanti restano
pendenti. Schivata/Disimpegno evitano bersagli e dadi artificiali.
[Azioni: comandi, costi, annullamento ed esiti](../TABLE_ACTIONS.md).

[Prima visita I-192](../COMBAT_EXPLORATION.md#prima-visita--preparare-iniziare-e-concludere-lo-scontro):
dal tavolo prepara i partecipanti, richiede iniziativa, avvia e conclude lo
scontro. Nel [raccordo I-194](../COMBAT_EXPLORATION.md#raccordo--esplorazione-a-turni-e-combattimento)
attiva i turni d'esplorazione, controlla i partecipanti e avanza il round
comune dopo i rispettivi «Finito», senza imporre un tiro di iniziativa.
Il passaggio alla lotta segue comunque la preparazione I-192. Sono definiti
i comandi ordinari; eccezioni e transizioni residue
sono elencate nello stesso percorso, senza dichiarare completa la pagina.

Il DM accede a strumenti di scena, partecipanti, schede autorizzate, richieste,
esiti e correzioni. Materiale preparato e comandi per condurre devono restare
distinguibili, evitando che una modifica alla preparazione sembri già giocata.
DM e co-DM mantengono i poteri concordati; nomina e revoca non avvengono qui
senza il relativo percorso.

I-187 include la delega tattica facoltativa per PNG scelti: controllo manuale
normale, assegnazione esplicita e possibilità di riprenderlo. Il tavolo deve
rendere riconoscibile quali creature siano delegate. Configurazione dei
comportamenti, arresto/ripresa e limiti sono da definire; la pagina non
promette un sistema già funzionante. Nessuna pattuglia fuori combattimento
o narrazione autonoma deriva da questa scelta.

L'app risolve le azioni ordinarie già autorizzate senza chiedere al DM un
permesso per ogni gesto del giocatore. Quando mancano dati, non inventa
una regola o rivela segreti per giustificare un esito.

## Stati da rendere leggibili

| Stato                     | Esperienza richiesta                                                                | Specifica ancora da completare                                                |
| ------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Nessuna mappa             | Gioco senza mappa e personaggi disponibili; non un errore che impedisce la partita. | Ingresso e rappresentazione del contesto narrativo.                           |
| Scena in caricamento      | Stato distinto da scena vuota o invisibile per il personaggio.                      | Quali comandi rimangono disponibili e recupero del caricamento.               |
| Azione non disponibile    | Motivo accessibile, senza dettagli segreti gratuiti.                                | Priorità delle ragioni e casi di dati insufficienti.                          |
| Tiro o reazione in attesa | Destinatario, richiesta ed eventuali parti della sequenza sospese riconoscibili.    | Richieste concorrenti, assenti e limiti di attesa.                            |
| Errore di esecuzione      | Esito effettivo distinguibile da successo; possibilità di recupero coerente.        | Applicazione parziale, stato da consultare e ripetizione consentita.          |
| Permesso cambiato         | Contenuto o comando non più accessibile non rimane utilizzabile per inerzia.        | Revoca durante edit, tiro o delega di controllo.                              |
| Connessione persa         | Distinguere consultazione locale e azioni condivise non confermate.                 | Conflitti, riaggancio, input pendenti e prevenzione delle doppie conseguenze. |

Salvataggio delle risorse di gioco, preferenze locali di visualizzazione e
bozze di una mossa sono cose diverse. La loro politica completa non è ancora
definita: non promettere autosalvataggio universale o sincronizzazione offline.

## Accessibilità, dispositivi e lingua

Laptop come contesto principale dell'owner; telefono come obiettivo già
accettato con riserva di fattibilità. Lo stesso comando deve avere percorso
comprensibile con tastiera o touch, senza dipendere solo da hover, colore,
animazione o clic destro. Focus e ritorno al comando originario vanno
specificati quando si aprono dettagli o richieste. Testi EN/IT, nomi lunghi,
zoom, movimento ridotto e quantità elevate di contenuti fanno parte delle
verifiche future. Nessun layout responsive o livello di conformità dichiarato.

## Collegamenti e lacune

- [Brief di esperienza e Q163](../EXPERIENCE.md).
- [Percorso fra esplorazione e combattimento](../COMBAT_EXPLORATION.md).
- [Movimento e controllo dei PNG, I-196/R164](../TABLE_MOVEMENT.md).
- [Aree, più bersagli e azioni senza bersaglio, I-197/R165](../TABLE_ACTIONS.md).
- [Decisioni](../DECISIONS.md), F-001/F-002/F-003/F-004/F-005/F-006/F-008/F-060.
- [R161, evidenza dell'interfaccia](../RESEARCH.md#r161--scena-pannelli-e-controlli-per-la-partita).
- [Metodo di verifica proposto](../AGENT_DELIVERY_RESEARCH.md).
- [Copertura delle funzioni e lacune](../COVERAGE.md).
- [R162, flusso dello scontro e baseline](../RESEARCH.md#r162--avvio-e-conclusione-dello-scontro).
- [R163, turni di esplorazione e preview](../RESEARCH.md#r163--turni-di-esplorazione-passaggi-e-preview-sul-tavolo).

Mancano ancora composizione dettagliata, inventario completo dei comandi,
confini temporali residui fra modalità, geometrie e multibersaglio residui,
concorrenza, politica completa di persistenza e
adattamenti dei dispositivi. La pagina rende visibile il lavoro; non
dichiara chiuso il tavolo o il contratto.

### Raccordo visuale23/09/2026 — tempo e riposo del gruppo

**Riposi** nella barra del Tavolo permette partecipanti espliciti; **Riposa**
nell'ispettore parte dalla pedina controllata. **Tempo** per il DM registra
l'avanzamento del mondo con conseguenze leggibili. Il gruppo può riposare in
parte, mentre un round effettivo avanza sei secondi e gli eventi pertinenti
interrompono soltanto i partecipanti coinvolti. Il ritorno alla scheda mostra
le medesime risorse. Regole, fonti, Undo, rete e limiti in
[REST_TIME_FLOW](../REST_TIME_FLOW.md), I-225/R192; non un calendario completo.

## Dove si trova ogni funzione nel blueprint — candidata del 01/10/2026

Una riga per funzione del [censimento](../CAPABILITY_CENSUS.md): stato della candidata con il file di prova (PROVEN, PARTIAL, OPEN-DECISION, EXCLUDED: legenda del censimento) e posto naturale nel blueprint, come lo scrivono i controlli. Superfici costruite da nominare: il menu «Sessione» del DM (Pausa, Nascondi scena, Conto alla rovescia, Orologi, Gruppo), «Avvia combattimento» con «Tira tutti», «Tira PNG», «Sorpreso» e «Un solo tiro per il gruppo», «Attacco di gruppo» (turno di gruppo), la hotbar che passa alla creatura di turno, «Concludi incontro» con PE e bottino, «Tutti i pannelli» con «Stacca», «Consultazione › Compendio» da trascinare sulla mappa, «Chiedi un tiro» accanto alla chat, «Documenti» (dal 30/09; prima «Diario») con Materiali, Missioni, Immagini e file.

### Tavolo — strumenti della mappa e pedine

- **TV-01** Muovere con drag, clic o tastiera: anteprima gratuita, Esc, arresto al budget — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Walls block drag, routes through the open door, empty drag pans, empty click deselects.
- **TV-02** Tappe private modificabili ed eseguibili; costo del terreno distinto — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: «Seleziona e muovi» › «Pianifica percorso»
- **TV-03** Avvicinamento automatico al bersaglio in mischia, senza Scatto implicito — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: «Bastone ferrato» › clic sull'Esploratore
- **TV-04** Porte al Tavolo: portata, stato, costo della prima interazione — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Porta · Chiusa · Distanza 1,1 m · Portata 1.5 m» › «Apri con Livia»
- **TV-05** Pan, zoom, centra scena; tocco su telefono — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Seleziona e muovi» › «Sposta vista» sposta la vista
- **TV-06** Pinch, rotazione e gesti touch completi — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Phone: one-finger pan, tokens one cell, status above the bar.
- **TV-07** Righello a due livelli: entro velocità e con Scatto — PROVEN · [final-review-completeness][ev-final-review]. Dove: Stato: «Righello: blu con il movimento, giallo con lo Scatto, rosso fuori portata»
- **TV-08** Storico del movimento nel turno e "ultima mossa" — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Movimenti di questo turno (1) · Nuoto · 6,1 m · costo 9 m» › «Mostra l'ultima mossa»
- **TV-09** Movimento fuori turno bloccato o su approvazione del DM (modalità della mappa) — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: «Livia propone un movimento · 3,4 m» › «Approva»
- **TV-10** Geometria a griglia: diagonali, taglie, esagoni — PROVEN · [audit/reaudit][ev-reaudit]. Dove: SRD grid default; rule links to «Griglia e misure».
- **TV-11** Tenere premuto per mostrare etichette ed evidenziare pedine — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «?» shortcut guide lists Alt; status hint «tieni premuto Alt per le etichette».
- **TV-12** Centrarsi sulle proprie pedine all'arrivo; Home ricentra — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Il DM può impostare una «vista iniziale»
- **TV-13** Posizioni di camera salvate — PROVEN · [final-review-completeness][ev-final-review]. Dove: Pannello Scena › «Viste personali
- **TV-14** Selezionare una pedina e aprirne scheda o dettagli — PROVEN · [final-fixes][ev-final-fixes]. Dove: Tavolo: doppio clic sulla pedina apre la scheda completa (o la scheda Creatura se non la controlli)
- **TV-15** Selezione multipla a riquadro e con Shift, filtri per tipo — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Box select only enemies, all listed.
- **TV-16** Menu contestuale etichettato della pedina (clic destro, pressione lunga, tastiera) — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Clic destro: menu etichettato con campo PF, sottomenu numerati (Azioni 2, Aspetto 7, Visibilità 6, Strumenti DM 5) e scorciatoie
- **TV-17** PF in linea con aritmetica (+5, -3, =15) — PROVEN · [final-review-completeness][ev-final-review]. Dove: Ogni volta compare «PF 18 → 13 · Annulla»
- **TV-18** Nascondi/rivela pedina (il DM la vede sbiadita) — PROVEN · [final-review-completeness][ev-final-review]. Dove: Il DM la vede sbiadita con l'occhio barrato
- **TV-19** Rinomina, nascondi nome, colore del bordo, taglia, blocco maniglie — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Resize handle, fixed-size name.
- **TV-20** Raggruppare, bloccare, copiare e incollare elementi — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Ctrl+C/V after a click; grouped tokens move together.
- **TV-21** Aggiungere e togliere pedine; togliere la pedina conserva la scheda — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Ho trovato la strada solo con Cerca › «goblin» › Goblin guerriero (apre la Biblioteca) › «Aggiungi a una scena…» › «Continua» › clic…
- **TV-22** Visibilità per singolo giocatore — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Visibilità › «Visibile solo a…» › «Solo alcuni personaggi» › Doran › «Applica» → «Visibile solo a Doran»
- **TV-23** Aure ed emanazioni che seguono la pedina — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Aspetto › «Aura…»
- **TV-24** Icone di condizione sulla pedina, sincronizzate con la scheda — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Clic destro › Condizioni › Avvelenato → «Applicata · Annulla»
- **TV-25** Stati visivi Sanguinante/Morto con opzione di nasconderli ai giocatori — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Enemy health hidden from players.
- **TV-26** Trovare la propria pedina; riga dell'elenco ↔ pedina — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Trova la mia pedina» → «Pedina trovata: Livia».
- **TV-27** Scorrere le pedine da tastiera con nomi accessibili solo per il DM — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Il nome nascosto si legge «Creatura sconosciuta 1»
- **TV-28** Immagini alternative della pedina — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Aspetto › «Immagini della pedina…» › «Ferita»
- **TV-29** Pedine controllate sempre sopra oscurità e oggetti — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Own tokens keep initial and name above darkness.

### Tavolo — visione, misura e sagome

- **TV-30** Nebbia manuale: copri tutto, rivela a pennello o poligono, anteprima giocatore — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Fog polygon closes on double-click with no leftover outline; panel folds.
- **TV-31** Visione dinamica dai muri con i sensi della scheda — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Scena › Visione
- **TV-32** Memoria dell'esplorato per giocatore, modificabile e azzerabile — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: «Aree esplorate»: Livia 64% → «Azzera» → 31% (resta ciò che vede ora)
- **TV-33** Visione di gruppo condivisa o per giocatore — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Con «Visione condivisa dal gruppo» accesa la vede
- **TV-34** Aggiornare la visione solo al rilascio (un teletrasporto non rivela il percorso) — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Con l'opzione spenta l'esplorato di Livia va da 31% a 64%, con «Aggiorna la visione solo all'arrivo» accesa va a 60%
- **TV-35** Il DM controlla che cosa vede una pedina — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Banner «Vista di Doran: nebbia opaca come per il giocatore · Torna alla vista del DM»
- **TV-36** Misura separata dal movimento, privata — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Finger measure label above the finger.
- **TV-37** Misura con forme e condivisione attivabile; righello a segmenti — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: «Solo per te» diventa «Condivisa con il tavolo»: il DM vede «Livia: 15,2 m · 2 tratti»
- **TV-38** Anelli di gittata con temi per daltonismo — PROVEN · solo test Node · [audit/reaudit][ev-reaudit]. Dove: «Tema dei colori»: Deuteranopia, Protanopia, Tritanopia
- **TV-39** Elenco delle distanze con elevazione — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Pannello Creatura › «Distanze»
- **TV-40** Area d'effetto: posiziona, orienta, conferma, alleati inclusi — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Cono che segue il cursore, «Creature note coinvolte: Doran» (alleato incluso), «Riorienta area»
- **TV-41** Sagome persistenti con colore e motivo del tipo di danno, nascoste o bloccate — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: «Motivo» per tipo di danno (fiamme per il Fuoco), colore, «Nuove nascoste ai giocatori»
- **TV-42** Area che applica effetti a chi entra o esce — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Configurazione: «Quando» (entra, esce, inizio o fine del turno), chi, probabilità, una volta sola, azioni (TS, danni con tipo,…
- **TV-43** Anteprima di copertura e fiancheggiamento alla destinazione — PROVEN · [audit/table-map-vision][ev-table-map-vision]. Dove: Durante il trascinamento: «Copertura qui · Sentinella: ½ · Esploratore: scoperta»
- **TV-44** Verifica della linea di vista con copertura parziale — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Misura e sagome»: Misura, «Righello a due livelli», «Linea di vista», Sagoma

### Tavolo — combattimento, azioni e reazioni

- **TV-45** Avvio/fine combattimento, turni, round, termina turno — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Avvia combattimento» › «Tira tutti» › «Inizia combattimento» → combat active, order sorted
- **TV-46** Iniziativa digitale o fisica, ordina, rilancia, scarta, annulla, registro — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Avvia combattimento» › «Tira tutti» › «Inizia combattimento» → combat active, order sorted
- **TV-47** Ritratti dell'ordine d'iniziativa in alto — PROVEN · [audit/table-combat][ev-table-combat]. Dove: Barra dei ritratti sopra la mappa, con «Turno attuale» evidenziato
- **TV-48** Combattenti nascosti che non trapelano mai — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Hidden goblin's end of turn DM-only.
- **TV-49** Lettere automatiche per i duplicati — PROVEN · [audit/table-combat][ev-table-combat]. Dove: Clic destro sulla pedina › «Strumenti DM» › «Copia» › «Incolla qui»
- **TV-50** Arrivi a metà combattimento in corsia d'attesa — PROVEN · solo test Node · [audit/reaudit][ev-reaudit]. Dove: (correzione, provata da test) `encounter-builder-domain.joinCombat` reads the latest initiative row (`findLast`, like `initiativeOf`) and inserts by total. Test: Sentinella A corrected to 20 stays before Sentinella B 11.
- **TV-51** Togliere dal combattimento vs eliminare; sconfitto — PROVEN · [final-review-completeness][ev-final-review]. Dove: Tracker › «⋯» › «Segna sconfitta»
- **TV-52** Iniziativa di gruppo per PNG uguali come opzione con fonte — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Goblin guerriero A, B · Un solo tiro per il gruppo» splits and joins (`residuals-b`)
- **TV-53** Avvisi "tocca a te/sei il prossimo" e indicatore sotto la pedina — PROVEN · [final-fixes][ev-final-fixes]. Dove: Tavolo: all'inizio del turno la barra e la scheda Creatura passano alla creatura di turno che controlli
- **TV-54** Azioni e resistenze leggendarie con promemoria — PROVEN · solo test Node · [audit/reaudit][ev-reaudit]. Dove: (correzione, provata da test) `D.blockLegendary` prefills Legendary Actions and Legendary Resistance in «Leggendarie e ricarica…» from the linked block's traits («Legendary Resistance (3/Day)», «Legendary Action Uses:…
- **TV-55** Ricarica dei PNG a inizio turno e azioni di tana — PROVEN · [audit/table-combat][ev-table-combat]. Dove: «Voce del tracker…» › «Promemoria a ogni round» al conteggio 20
- **TV-56** Voci personalizzate nel tracker (conti alla rovescia, eventi) — PROVEN · [final-review-completeness][ev-final-review]. Dove: Tracker › «Voce del tracker…» › nome, conteggio, «Conto alla rovescia», «Fra quanti round», «Chi la vede» › «Salva la voce»
- **TV-57** Automatismi del turno: salta morti/nascosti, ferma a inizio round, suono — PROVEN · [audit/table-combat][ev-table-combat]. Dove: Tracker › «Impostazioni» › «Salta le creature sconfitte»
- **TV-58** Reset vs Svuota e procedura di fine incontro (XP, tesoro, registro) — PROVEN · [final-review-completeness][ev-final-review]. Dove: Tracker › «Reimposta…»
- **TV-59** Attacchi di più creature con un comando — PROVEN · [final-review-completeness][ev-final-review]. Dove: group turn enabled mid-turn lists both goblins; one «Turno successivo» passes the group
- **TV-60** Timer facoltativo del turno — PROVEN · [final-review-completeness][ev-final-review]. Dove: Tracker › «Impostazioni» › «Timer del turno»
- **TV-61** Politica delle reazioni per personaggio: attiva, Chiedi o Automatico — PROVEN · [audit/table-combat][ev-table-combat]. Dove: Tracker › «Le tue reazioni» › «Cambia nella scheda» (si esce dal Tavolo) › in fondo alla scheda: sezione «Reazioni» con «Attiva» e…
- **TV-62** Arma o trucchetto: anteprima, bersaglio, tiro digitale al clic o fisico dichiarato — PROVEN · [audit/table-combat][ev-table-combat]. Dove: Barra › «Dardo di fuoco» › pannello «Preparazione privata» (costo, gittata, dadi, circostanze) › passaggio sul bersaglio: «Mezza…
- **TV-63** Più bersagli con assegnazione (Dardo incantato) — PROVEN · [audit/table-combat][ev-table-combat]. Dove: «Dardo incantato» › clic sulle creature (± per ciascuna) › «Lancia Dardo incantato»
- **TV-64** Scatto, Schivata, Disimpegno — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Dodge icon and effects list.
- **TV-65** Carta di risultato con passo successivo, critici e dettaglio — PROVEN · [audit/table-combat][ev-table-combat]. Dove: «[20] + 2 = 22 Colpo critico» › prossimo passo «Risolvi tiro» con i dadi di danno raddoppiati (2d6) › dettaglio in «Tiri e risultati»
- **TV-66** Correzione che restituisce le conseguenze e riapre la richiesta — PROVEN · [audit/table-combat][ev-table-combat]. Dove: «Tiri e risultati» › «Annulla» (la Sentinella torna viva, la richiesta si riapre) › «Riapplica risultato noto» › «Correggi una…
- **TV-67** Barra delle azioni per tema e risorsa — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Action bar grouped ARMI / INCANTESIMI / COMUNI with cost filter.
- **TV-68** Anteprima dei danni per bersaglio con resistenze/immunità attivabili e moltiplicatori — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Oppure se Impostazioni della campagna › «Livello di automazione» = «Assistito»
- **TV-69** I giocatori propongono danni o condizioni, il DM accetta — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Bell «Accetta e applica» in one click (Sentinella 7 → 4).
- **TV-70** Oggetto con più attività e dialogo d'uso (consumo, livello, sagoma) — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Wand usable from the Table creature panel and the quick bar.
- **TV-71** Afferrare, spingere, saltare con anteprima, lanciare, arrampicarsi, volare, cadere — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Cadere» in Mosse speciali.
- **TV-72** Aiutare, Nascondersi, Cercare, Studiare, Influenzare, Usare — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Mosse» › «Azioni generiche 2024» › «Cerca» › tabella «Percezione» › «Esegui: Cerca» › «Registra tiro» › «Non trova nulla di nascosto…
- **TV-73** Knock-out non letale a 0 PF — PROVEN · [audit/table-combat][ev-table-combat]. Dove: «Bastone ferrato» › casella «Colpo non letale…» › clic sul bersaglio › «Knockout
- **TV-74** Motivo per cui un'azione non è disponibile — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Solo dopo il clic, nel pannello, compare «Azione già spesa.»
- **TV-75** Modificatori situazionali elencati sotto il bersaglio — PROVEN · [audit/table-combat][ev-table-combat]. Dove: Mentre punto: chip «Mezza copertura · CA +2» sotto la pedina ed elenco «Motivi del tiro»
- **TV-76** Probabilità di successo, solo se la campagna lo consente — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Sta in Preferenze (icona in alto) › «Conoscenza e probabilità (divulgazione)» › «Sempre (come BG3)» › «Salva preferenze»
- **TV-77** Opportunità lungo il percorso con richiesta al controllore — PROVEN · solo test Node · [audit/reaudit][ev-reaudit]. Dove: «Apri richieste · 1» › «Scegli» › «Effettua attacco»
- **TV-78** Scudo dopo il colpo, con rinuncia e costi solo all'uso — PROVEN · [audit/table-combat][ev-table-combat]. Dove: «Apri richieste · 1» › «Scegli» › «Livia · Scudo» (slot, «Rinuncia per questa occasione» che non spende) › «Usa Scudo» › «Livia · Mancato»
- **TV-79** Concentrazione su danno con TS — PROVEN · [audit/reaudit3-b][ev-reaudit3-b]. Dove: «Condizioni e stato» › «Aggiungi condizione» non offre «Concentrazione»
- **TV-80** Occasioni simultanee ordinate e risolte una alla volta — PROVEN · solo test Node · [audit/reaudit][ev-reaudit]. Dove: (correzione, provata da test) «Reazioni da scegliere» shows one reaction at a time; the simultaneous ones wait in line, named (DDB). Reach follows the scene's distance rule like every range check: on the SRD grid a…
- **TV-81** Nessun timeout implicito delle reazioni — PROVEN · [audit/table-combat][ev-table-combat]. Dove: «Esc o Riduci conserva la richiesta senza rispondere»
- **TV-82** Preparare un'azione (Ready) con innesco — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Ready Magic Missile with a slot and Concentration.
- **TV-83** Finestre pre-tiro e post-tiro per bonus (Ispirazione, Fortuna) — PROVEN · [audit/reaudit3-b][ev-reaudit3-b]. Dove: «Aggiungi bonus» before; with Heroic Inspiration the attack stops at «Usa Ispirazione eroica: ritira il d20» / «Continua»; reroll spends it, «Continua» keeps it.
- **TV-84** Durate degli effetti con scadenza e avviso a tutti — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Dodge expires at the next turn with a log line.
- **TV-85** Pannello effetti attivi della pedina selezionata — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Effects list in the creature panel.
- **TV-149** Sorpresa a inizio combattimento: il sorpreso tira l'iniziativa con svantaggio — PROVEN · [final-fixes][ev-final-fixes]. Dove: Tavolo › «Avvia combattimento» › «Sorpreso» su ogni riga (anche nell'incontro salvato)
- **TV-150** Bersaglio persistente visibile al gruppo, riusato da attacco, danno e aree — OPEN-DECISION · [Q167][q167] · capacità oltre il censimento. Dove: Oggi il bersaglio esiste solo dentro un attacco in preparazione
- **TV-151** Tiri dentro i messaggi di chat «[[1d8+3]]» — OPEN-DECISION · [Q167][q167] · capacità oltre il censimento. Dove: Chat: «/r» apre il vassoio dei dadi; il testo «[[…]]» resta testo
- **TV-152** Barre di risorse sulla pedina oltre ai PF — OPEN-DECISION · [Q167][q167] · capacità oltre il censimento. Dove: Menu della pedina › Aspetto non ha barre; le risorse sono nella hotbar

### Tavolo — dadi, registro, chat e presentazione

- **TV-86** Dado digitale o faccia fisica + modificatore, correzione motivata — PROVEN · [final-review-completeness][ev-final-review]. Dove: Tavolo › «Tira i dadi» (icona d20 nella barra) › «Dadi: Fisici» › «Arcano +3» › finestra «Facce del dado fisico» › 14 › «Registra il tiro»
- **TV-87** Registro persistente con dettaglio per dado e provenienza — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Log card keeps rule, strikes dropped die, «Dettagli» with Ritira.
- **TV-88** Vassoio dadi libero con formula, vantaggio, modificatori — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Tira i dadi» › Formula (pulsanti d4…d100, −1/+1, Svuota) › Modalità Normale/Vantaggio/Svantaggio/Critico › «Tira …» oppure Invio
- **TV-89** Menu del tiro: vantaggio, svantaggio, piatto, critico, con alternativa visibile — PROVEN · [final-review-completeness][ev-final-review]. Dove: right-click «Dardo di fuoco» → vantaggio/svantaggio/normale/«Danno critico», «Chi vede» with 4 audiences
- **TV-90** Destinatari del tiro: tutti, io, DM, io+DM, predefinito e per singolo tiro — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «…» › «Tira per
- **TV-91** Tiro nascosto che si annuncia; rivelazione successiva a tutti o a uno — PROVEN · [final-review-completeness][ev-final-review]. Dove: «…» › «Solo il DM»
- **TV-92** Richiesta di tiro del DM (prova/TS/CD) come carta con riepilogo dei risultati — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Tira i dadi» › «Richieste» › «Al gruppo», TS, Destrezza, CD 13, destinatari › «Invia la richiesta»
- **TV-93** Tiri contrapposti — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Richieste › «Contrapposto» › prima e seconda creatura con le abilità › «Invia la richiesta»
- **TV-94** Dadi animati condivisi e disattivabili; versione 2D leggera — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Dadi › «Aspetto e prova» › «3D condivisi / 2D leggeri
- **TV-95** Dadi intelligenti Bluetooth — PROVEN · simulazione · [audit/reaudit3-b][ev-reaudit3-b]. Dove: Simulated Pixels pairing, per-die method, tray roll and attack «Dado connesso» wait and land as a physical die named in the Registro (real Bluetooth: owner).
- **TV-96** Pila di modificatori situazionali preimpostati dal DM — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Hidden prepared modifier logged for the DM only.
- **TV-97** Sintassi dei dadi avanzata (tieni/scarta, esplode, successi) — PROVEN · [final-review-completeness][ev-final-review]. Dove: «10d6cs>=5» › Invio
- **TV-98** Avviso dei tiri altrui a registro chiuso — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Arrivano le notifiche «Novità nel registro» («Livia · Prova di Saggezza… 13 · Apri il registro») e un numero sull'icona della chat
- **TV-99** Messaggi in personaggio, fuori personaggio, azioni; parlare come personaggio — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Chat › «Dialogo / Azione / Fuori personaggio» + «Personaggio
- **TV-100** Sussurri a un utente o a un personaggio — PROVEN · [final-review-completeness][ev-final-review]. Dove: Chat › «A: Sussurro a DM / Doran / Mira» › Invia
- **TV-101** Lingue: testo illeggibile a chi non le conosce — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: «Parla come: Doran» › «Lingua
- **TV-102** Immagini in chat e condivisione di una voce come carta — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Chat › «Immagine» (file o incolla) › Invia · «Condividi» › voce della scheda › destinatari › «Condividi»
- **TV-103** Narrazione del DM e dialoghi dei PNG — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Chat DM › «Narrazione» (predefinita) oppure «Dialogo» › «Parla come: … / PNG con nome…» › «Si sente
- **TV-104** Il DM nasconde o elimina messaggi — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: «⋯» sul messaggio › «Nascondi ai giocatori» / «Elimina…»
- **TV-105** Voto rapido e stato d'animo — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Tono» selector beside the message type.
- **TV-106** Attivare la scena per i giocatori separatamente dal salvataggio — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Altre azioni» › «Attiva al Tavolo…» › «Attiva per il gruppo»
- **TV-107** Cancello di presentazione: messaggio d'attesa, pausa, fine — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: «Sessione» › messaggio d'attesa › «Salva messaggio» › «Avvia sessione» › «Metti in pausa» / «Termina sessione…»
- **TV-108** Mostrare un'immagine o un handout a tutti o a scelti; riaprirlo dopo — PROVEN · [final-review-completeness][ev-final-review]. Dove: Barra laterale › Diario › «Materiali» › «Mostra…» › «Solo alcuni personaggi: Livia» › «Mostra»
- **TV-109** Rivelare l'arte di una creatura dalla sua pedina — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Own art preselected, shared and revealed in one step.
- **TV-110** Vista spettatore o schermo condiviso senza interfaccia — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: «Sessione» › «Apri vista spettatore»
- **TV-111** Nascondere tutta l'interfaccia — PROVEN · [final-review-completeness][ev-final-review]. Dove: il nome «Nascondi interfaccia (Ctrl+Maiusc+H)» appare solo come descrizione) › «Mostra interfaccia» o la stessa scorciatoia
- **TV-112** Il DM vede e agisce come un giocatore specifico, con etichetta nel registro — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Gioca per un giocatore assente» → banner «Giochi per Livia».
- **TV-113** Giocatori connessi e presenza (qui, assente, messaggio) — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: «Gruppo ●●» sulla mappa › «Assente» + messaggio › «Aggiorna il mio stato»
- **TV-114** Pausa del gioco che blocca i movimenti — PROVEN · [final-review-completeness][ev-final-review]. Dove: Sessione › «Metti in pausa»)
- **TV-115** Gruppo diviso fra scene con nastri e "riunisci" — PROVEN · solo test Node · [audit/reaudit][ev-reaudit]. Dove: (correzione, provata da test) Roll20 party ribbons: while the party is split every group has a ribbon on the map (scene, «scena del gruppo», «al Tavolo», «tu», the characters); players see where the others are, and a…
- **TV-116** Posizionare il gruppo mantenendo la formazione — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Esplorazione › «Viaggio e accampamento» › Marcia › «Posiziona il gruppo sulla mappa» › clic
- **TV-117** Vista bloccata per schermo fisico con griglia in scala — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Screen diagonal/resolution and «Area della mappa mostrata».
- **TV-118** Richiamo della vista altrui solo su scelta esplicita — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: «Puntatore» › «Proponi la vista» (oppure Maiusc+clic) › clic sulla mappa
- **TV-119** Avviso d'inattività per sessioni lasciate aperte — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Dopo 55 minuti senza attività (orologio simulato): «Sei ancora al tavolo? … entro 5 minuti risulterai assente»
- **TV-120** Puntatore sulla mappa — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Strumento «Puntatore» (icona a bandierina) › tieni premuto e trascina
- **TV-121** Ping col colore dell'utente, ping d'allerta, freccia fuori schermo — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Puntatore › «Segnale» / «Allerta» (oppure Alt+clic) › clic
- **TV-122** Disegno libero, forme, testo; autore proprietario, "cancella i miei" — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: «Disegna» › mano libera / freccia / rettangolo / ellisse / testo / gomma, colore, spessore › «Cancella i miei»
- **TV-123** Note-suggerimento attaccate alle pedine — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Clic destro sulla pedina › «Nota sulla pedina…» › «Chi la vede: Tutto il tavolo / Solo io» › «Salva nota»
- **TV-124** Memoria degli strumenti (ultimo colore, forma, motivo) — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Disegna, anche dopo aver ricaricato la pagina
- **TV-125** Effetti visivi degli incantesimi, disattivabili — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Fire Bolt at the Sentinella outside combat draws a map effect ([data-dtray-fx-kind]).
- **TV-126** Istantanea della scena per il resoconto — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Chat › «Istantanea» › didascalia › «Condividi l'istantanea»

### Tavolo — tempo, esplorazione, audio

- **TV-127** Orologio della finzione, round di 6 secondi, requisiti di riposo — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: «Tempo» › «Avanza di 10 Minuti» › «Vedi conseguenze del tempo» › «Applica»
- **TV-128** Riposi di gruppo con partecipanti, attività, interruzione — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: «Riposi» › «Nuovo riposo» › Tipo, partecipanti › «Vedi inizio del riposo» › «Avvia riposo»
- **TV-129** Turni facoltativi fuori combattimento — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Shift+Space turn-based mode; palette «Modalità a turni».
- **TV-130** Conto alla rovescia reale facoltativo (enigmi, pause) — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Sessione» › «Conto alla rovescia» › +1m › Titolo › «Salva» › «Avvia»
- **TV-131** Orologi di progresso fissati sugli schermi — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Sessione» menu: Pausa, Nascondi scena, Conto alla rovescia, Orologi di progresso, Gruppo
- **TV-132** Ordine di marcia e formazione — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Esplorazione › «Viaggio e accampamento» › Marcia › «Livia» › casella «Coda»
- **TV-133** Turni di guardia con verifiche — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Camp at 20:00; watch Perception logged.
- **TV-134** Viaggio: passo, distanza, marcia forzata, eventi — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Esplorazione › Viaggio e accampamento › «Viaggio» › Passo, «Ore di viaggio» (anche «9 h · prolungato») › «Viaggia» › «Tira un evento» ›…
- **TV-135** Meteo per clima e stagione — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Viaggio › «Genera il meteo» (clima, stagione) › «Tira» › «Mostra ai giocatori»
- **TV-136** Provviste di cibo e acqua con consenso al consumo — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: DM: «Proponi il consumo di oggi»
- **TV-137** Luce portatile con durata e scorte — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Creatura › «Luce e ricerca» › «Accendi una torcia»
- **TV-138** Cercare con elenco dei ritrovamenti — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Finds kept in «Trovato»; log «Cerca · Percezione».
- **TV-139** Furtività e nascondersi con chi ti vede — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Creatura › «Conoscenza e furtività» › Furtività
- **TV-140** Conoscenza graduata delle creature ed Esamina — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: Clic destro sulla pedina › «Esamina»
- **TV-141** Identità nascosta dei PNG ("creatura non identificata") — PROVEN · [final-review-completeness][ev-final-review]. Dove: DM token menu › Visibilità › «Nascondi identità…»
- **TV-142** Borseggio e scambi di nascosto con decisione del DM — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Poi: seleziona il bersaglio › Creatura › «Borseggi» › «Decidi…» › CD › «Conferma»
- **TV-143** Bottino dopo lo scontro e distribuzione — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: DM: clic destro › «Bottino» › monete e oggetti SRD › «Salva monete» › «Mostra ai giocatori»
- **TV-144** Mercante al Tavolo: carrello, contrattazione, riacquisto — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Oggetti › «Bottega» › «Apri bottega»
- **TV-145** Volume per categoria (dadi, interfaccia) — PROVEN · [audit/table-dice-time][ev-table-dice-time]. Dove: «Preferenze» › «Suoni» › cursori «Volume dei dadi digitali», «Volume dell'interfaccia»
- **TV-146** Musica e ambienti sonori condivisi — EXCLUDED · [I-233][i-233] · musica ospitata (F-030). Dove: La ricerca «musica» non trova niente
- **TV-147** Voce e video integrati — EXCLUDED · [I-233][i-233] · voce e video (F-017). Dove: Nessun comando
- **TV-148** Vista 3D della scena — EXCLUDED · [I-233][i-233] · vista 3D (I-137). Dove: La ricerca «3D» trova solo aiuto e novità
- **TV-153** Sfondi di scena animati (video) — OPEN-DECISION · [Q167][q167] · capacità oltre il censimento. Dove: Caricamento della mappa: png, jpeg, webp
- **TV-154** Meteo animato sulla mappa — OPEN-DECISION · [Q167][q167] · capacità oltre il censimento. Dove: Il meteo esiste come dato (Esplorazione › Mondo), senza livello visivo
- **TV-155** Gioco su un solo dispositivo condiviso (a turno) — OPEN-DECISION · [Q167][q167] · capacità oltre il censimento. Dove: Solo «Visita come» della dimostrazione cambia identità
- **TV-156** Dadi «karmici» che correggono la sfortuna — OPEN-DECISION · [Q166][q166] · raccomandazione: escluderli. Dove: —

<!-- Riferimenti delle prove (stato delle capacità) -->

[ev-campaign-hub-world]: ../../../changes/interview-01/audit/campaign-hub-world.md
[ev-campaign-settings-data]: ../../../changes/interview-01/audit/campaign-settings-data.md
[ev-features-management]: ../../../changes/interview-01/audit/features-management.md
[ev-final-fixes]: ../../../changes/interview-01/final-fixes.md
[ev-final-review]: ../../../changes/interview-01/final-review-completeness.md
[ev-home-creation]: ../../../changes/interview-01/audit/home-creation.md
[ev-library]: ../../../changes/interview-01/audit/library.md
[ev-prep-encounters]: ../../../changes/interview-01/audit/prep-encounters.md
[ev-prep-scenes]: ../../../changes/interview-01/audit/prep-scenes.md
[ev-reaudit]: ../../../changes/interview-01/audit/reaudit.md
[ev-reaudit3-a]: ../../../changes/interview-01/audit/reaudit3-a.md
[ev-reaudit3-b]: ../../../changes/interview-01/audit/reaudit3-b.md
[ev-reaudit3-c]: ../../../changes/interview-01/audit/reaudit3-c.md
[ev-services]: ../../../changes/interview-01/audit/services.md
[ev-sessions-members-safety]: ../../../changes/interview-01/audit/sessions-members-safety.md
[ev-sheet]: ../../../changes/interview-01/audit/sheet.md
[ev-spells-inventory]: ../../../changes/interview-01/audit/spells-inventory.md
[ev-table-combat]: ../../../changes/interview-01/audit/table-combat.md
[ev-table-dice-time]: ../../../changes/interview-01/audit/table-dice-time.md
[ev-table-map-vision]: ../../../changes/interview-01/audit/table-map-vision.md
[q166]: ../OPEN.md#q166--dadi-karmici
[q167]: ../OPEN.md#q167--capacità-dei-leader-oltre-il-censimento
[i-233]: ../DECISIONS.md#i-233--capacità-in-attesa-dellowner-incluse-come-simulazioni-dichiarate
[gap-01]: ../REFERENCE_COVERAGE.md
