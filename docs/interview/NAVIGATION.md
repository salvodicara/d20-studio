# Navigazione — sintesi adottata dai riferimenti

23/09/2026, I-212 su delega I-209. Scelta dell'agente, basata su R176–R178 e
sulle decisioni già acquisite. Definisce accessi e comportamento; non è un
contratto completo approvato, un mock o un'app funzionante. I nomi italiani
identificano le funzioni; resa finale EN/IT e stile restano nel loro percorso.

**Candidata del 01/10/2026.** La navigazione descritta qui è costruita nel blueprint. La struttura
effettiva, letta nell'app in esecuzione, con il prodotto copiato per ogni struttura, è nella
sezione [Architettura dell'informazione della candidata](#architettura-dellinformazione-della-candidata):
dove i paragrafi NAV-01–NAV-11 dicono altro, vale quella sezione. Non è un'approvazione
dell'owner.

## Sintesi visibile

**Fuori dal gioco:** barra stabile **Inizio · Personaggi · Campagne · Biblioteca**.
**Dentro una campagna:** nome del gruppo, navigazione locale e **Entra al Tavolo**.
**Al Tavolo:** scena centrale, controlli di gioco, scheda e materiali apribili;
**Torna alla campagna** sempre raggiungibile senza concludere la sessione.

È la composizione di tre precedenti: destinazioni di gioco e raccolte Beyond,
organizzazione locale della campagna Kanka, tavolo e dettagli di Foundry/Maps.
Le quattro etichette globali e gli accorpamenti sotto sono adattamenti dichiarati,
non una barra che avremmo visto identica in un concorrente.

## NAV-01 — accessi globali stabili

Sul laptop, fuori dal Tavolo, la barra superiore conserva ordine e nomi dei
quattro accessi. Logo/nome torna a Inizio con etichetta comprensibile. La voce
corrente è riconoscibile anche senza colore; entrare in una campagna non
riordina il menu. Non c'è un interruttore globale «sono DM / sono giocatore»:
il ruolo dipende dalla campagna e dalla modalità autorizzata.

| Accesso    | Cosa apre                                                                                        | Azione diretta e ritorno                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Inizio     | Raccolte personali e ripresa del lavoro accessibile, inviti e prossima sessione quando esistono. | Apri personaggio/campagna, riprendi una bozza o torna al Tavolo pertinente. Nessuna adesione o sessione avviata automaticamente.  |
| Personaggi | Schede proprie/affidate, bozze e Archivio.                                                       | Apri scheda; Crea, Ricostruisci, Importa o scegli una base pronta. La scheda funziona senza campagna.                             |
| Campagne   | Gruppi di cui si fa parte e inviti riconoscibili.                                                | Apri una campagna oppure creane una; accettare l'invito resta un'azione esplicita distinta. Nessun reclutamento pubblico dedotto. |
| Biblioteca | Regole e contenuti consultabili, materiale personale e homebrew.                                 | Cerca, leggi, crea o riusa nel contesto indicato; nessuna pubblicazione o aggiunta a una scheda al semplice clic sul risultato.   |

**Cerca**, **Appunti**, **Richieste** e il menu personale sono accessi di servizio
riconoscibili, non altre quattro aree concorrenti. Richieste segnala ciò che
attende un intervento autorizzato; nessun badge di segreti. Il menu personale
contiene account, lingua, accessibilità, preferenze, aiuto e gestione dei propri
dati. Impostazioni della campagna rimangono invece nella campagna.

Inizio è un punto di ripresa; un link diretto a una scheda o al Tavolo non
obbliga a passare da lì. Recenza generale e priorità della ripresa sono il
raccordo I-208, non un comportamento integralmente verificato nella home Beyond.

## NAV-02 — campagna e persona sempre riconoscibili

Nella campagna compaiono nome del gruppo, ruolo/modo corrente e accesso ai
personaggi controllati. Il nome del gruppo offre **Cambia campagna**, con
elenco dei soli contesti accessibili e **Tutte le campagne**. Non si cambia
campagna automaticamente perché si apre un appunto o un contenuto di catalogo.

Il cambio del gruppo non copia o trasferisce il personaggio. Non implica una
regola «un personaggio, una sola campagna»: appartenenza/trasferimenti hanno
il proprio contratto. Se vi sono più personaggi controllabili si sceglie quale
scheda aprire; le azioni restano intestate alla creatura effettiva.
L'ospite invitato non deve creare un personaggio per trovare il Tavolo.

## NAV-03 — navigazione locale della campagna

Sul laptop una colonna laterale nominata con la campagna permette di cambiare
sezione senza tornare all'elenco dei gruppi. **Entra al Tavolo / Torna al Tavolo**
è l'azione evidente sopra le sezioni. Le sezioni sono:

| Sezione      | Dove si arriva e cosa si ritrova                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Panoramica   | Prossima sessione reale, ultimo riepilogo accessibile, personaggi e ripresa del gioco. Sono scorciatoie alle stesse voci delle sezioni sotto.                                                          |
| Gruppo       | Partecipanti, personaggi, inviti e assegnazioni consentite; bottino/beni comuni, veicoli, basi e magie condivise. Il riepilogo del DM è una vista autorizzata, le schede individuali restano apribili. |
| Sessioni     | Date reali, disponibilità/sondaggi facoltativi, storico degli incontri e accesso al resoconto corrispondente. Si può giocare senza programmare una data.                                               |
| Diario       | Riepiloghi, missioni/obiettivi e scene scritte fra sessioni, con collegamenti a persone e luoghi. Il resoconto aperto da Sessioni è lo stesso documento.                                               |
| Mondo        | PNG/luoghi/fazioni, mappa del mondo, reputazioni e calendario della finzione. Il calendario del mondo è nominato esplicitamente e non sostituisce le date reali.                                       |
| Preparazione | Scene/mappe, incontri, creature, tesori, trappole e avventure per chi ha l'autorità pertinente. Dettaglio in NAV-06.                                                                                   |
| Impostazioni | Accordi e contenuti abilitati; autorizzazioni, gestione e backup secondo i permessi. Le azioni amministrative non si concedono con il solo ruolo di co-DM.                                             |

Gruppo e Mondo possono offrire ingressi alla stessa creatura o proprietà,
con la stessa identità e gli stessi permessi. Le note «Solo io» non diventano
una sottosezione condivisa del Diario: si aprono da **Appunti** anche senza
campagna. Questa organizzazione accorpa funzioni già acquisite; non importa
le categorie, le quote premium o la personalizzazione globale di Kanka.

## NAV-04 — sezioni della scheda, azioni vicino al contenuto

Nome/ritratto, personaggio corrente, eventuale campagna e stato della scheda
precedono le sezioni. L'accesso **Modifica / Avanza / Rivedi scelte** è distinto
dai comandi di gioco; la modifica strutturale non si attiva cambiando tab.

**Azioni, Inventario, Magie, Capacità, Storia, Extra** sono sezioni locali,
ispirate alla scheda Beyond, non voci del menu globale. I dati essenziali di
gioco restano riconoscibili; ogni sezione raggiunge i propri comandi: gestione
inventario, preparazione delle magie, liste, confronto, creature e forme.
Magie senza contenuti mostra lo stato vuoto pertinente; non concede incantesimi
né nasconde una capacità accessibile tramite un oggetto. **Appunti personali**
resta distinto dai campi narrativi condivisi della scheda.

Una creatura collegata, un oggetto o una magia si apre dalla sezione pertinente.
Il dettaglio permette di tornare alla stessa lista e selezione. La navigazione
non equipaggia, prepara, lancia o salva per deduzione. INV/MAG restano autorità
sulle operazioni; la scheda completa è sempre raggiungibile dal Tavolo.

## NAV-05 — Biblioteca: categorie e raccolte, non una pagina per funzione

La destinazione stabile contiene ricerca e filtri per categoria/provenienza;
nomi omonimi con edizioni/revisioni diverse rimangono distinguibili.
**Contenuti disponibili**, **La mia libreria** e **Homebrew della comunità**
conservano gli ambiti già definiti. Dentro La mia libreria, **Creati da me**
ritrova l'authoring; non occorre ricordare un secondo menu globale.

Regole, magie, oggetti, creature, opzioni, mappe/scene, avventure, tabelle e
mazzi sono categorie o raccolte di materiale. Preferiti, recenti e cartelle
aiutano chi ne ha molto; consultare un contenuto non richiede configurarli.
**Usa nella campagna / Aggiungi al personaggio** indica la destinazione e segue
il flusso specifico. Il materiale privato resta consultabile/editabile senza
campagna; condividerlo, abilitarlo o pubblicarlo sono comandi distinti.

## NAV-06 — preparazione e scena corrente

In Preparazione, elenco/cartelle e ricerca precedono l'editor del materiale
scelto. **Scene e mappe**, **Incontri**, **Creature**, **Tesori e trappole**,
**Avventure** sono raccolte locali. I collegamenti alla Biblioteca permettono
di partire da materiale personale e conservarne versioni riutilizzabili.
È consentito iniziare da vuoto o improvvisare al Tavolo.

**Modifica**, **Apri per me**, **Rivela contenuto** e **Attiva al Tavolo…**
sono operazioni distinte. Rivela rende il materiale consultabile ai destinatari
consentiti senza cambiare la scena che stanno guardando. Attiva porta la scena
nel Tavolo dei partecipanti pertinenti, secondo autorità e destinatari I-165;
non importa Activate → tutti di Foundry senza adattamento. Salvare non rivela
né attiva una scena. Il Tavolo
indica la scena vista e offre **Trova nella raccolta** per gli autorizzati;
visitare un'altra scena come DM non trascina il gruppo né sposta le creature.
**Chiudi pannello** non è il Close Scene di Owlbear: chiudere una scena o
terminare un incontro conserva comandi espliciti e distinti.

## NAV-07 — entrare, restare e tornare dal Tavolo

Si entra dalla Campagna o dall'accesso contestuale nella scheda; il contesto
è noto prima dell'ingresso. Con un link diretto, gli accessi vengono verificati
prima di mostrare nomi, anteprime o stato di gioco. Nessuna scheda obbligatoria
per l'ospite già autorizzato. Il Tavolo funziona anche senza mappa.

Durante il gioco la navigazione generale è raccolta nel menu **App**, mentre
restano riconoscibili **Campagna**, scena corrente, creatura controllata e
**Torna alla campagna**. Il menu App conserva Inizio/Personaggi/Campagne/
Biblioteca e i servizi; non cambia i loro nomi. La barra del sito non sottrae
permanentemente spazio alla scena. Quando si apre una destinazione esterna al
Tavolo, **Torna al Tavolo · [campagna]** conserva il punto di rientro autorizzato.

Tornare alla campagna o alla scheda completa cambia vista; non termina turno,
scontro o sessione, non annulla richieste e non recupera risorse. Se l'accesso
al Tavolo è revocato nel frattempo, il ritorno mostra lo stato permesso, non
una vecchia scena privata conservata in un'anteprima.

## NAV-08 — pannelli del Tavolo

Il laptop mantiene scena al centro, selettore delle scene richiudibile,
strumenti pertinenti al contesto e accessi a **Scheda**, **Gruppo**, **Registro**,
**Materiali**, **Appunti**, **Richieste**. Il menu del Tavolo contiene inoltre
le viste consentite e le preferenze della sessione. Le azioni e risorse della creatura
attiva e l'ordine dei turni restano nel contesto di gioco, secondo I-190.

**Scheda** apre il personaggio in un pannello laterale, come Maps; Inventario,
Magie e dettaglio completo sono raggiungibili da lì. L'apertura avviene dal
controllo esplicito della creatura o dalla raccolta, senza riutilizzare il
clic destinato all'attacco I-016 per aprire incidentalmente una scheda.
**Gruppo** richiama riepilogo, ordine di marcia, riposo/guardie, viaggio e
provviste quando pertinenti, senza renderne obbligatoria la gestione.
**Materiali** raccoglie directory del contesto: creature, oggetti, diario,
scene, tabelle e mazzi secondo accesso. La Biblioteca rimane disponibile come
catalogo contestuale; leggere non cambia il personaggio controllato.

Il pannello normale occupa un'area laterale e può essere richiuso. **Fissa**
conserva il dettaglio scelto mentre si consultano altri contenuti, I-190;
quando lo spazio non basta si richiama dalla lista dei dettagli aperti invece
di coprire il comando di gioco o ridurre tutto a testo illeggibile. Numero,
dimensioni e disposizione simultanea si verificheranno nel progetto visivo.
Il fissaggio è un adattamento nostro; le fonti provano sidebar/pop-out/riduzione,
non questa precisa composizione o un ripristino universale delle finestre.

**Apri scheda completa** usa la vista piena con ritorno al Tavolo. **Apri in una
finestra separata** è un'opzione aggiuntiva ispirata a Foundry 14, con **Riporta
nel Tavolo**; il percorso ordinario resta completo sul singolo laptop.
Se il browser impedisce la finestra esterna, resta il pannello interno. Non
si promette compatibilità con tutte le finestre o continuità offline per il
solo fatto che il precedente esiste; quei dettagli richiedono verifica tecnica.

## NAV-09 — ricerca, appunti e richieste senza perdere il contesto

**Cerca** offre ricerca trasversale I-179, oltre ai filtri locali. Il risultato
indica ambito personale/campagna/Biblioteca e origine consentita; nessun titolo,
conteggio o estratto rivela contenuti non accessibili. Nel Tavolo si apre il
dettaglio contestuale quando possibile; **Apri pagina completa** e ritorno
rimangono disponibili. Da un'aggiunta INV/MAG conserva la destinazione iniziale.

**Appunti** ritrova note personali e quelle condivise con l'utente. Campagna o
personaggio sono filtri/collegamenti, non obblighi. Aprire una nota dal Tavolo
non ne cambia i destinatari. «Solo io» non è visibile neanche al DM per ruolo.

**Richieste** conserva tiri, reazioni e offerte pendenti consentite e il loro
contesto; inviti restano riconoscibili nel relativo percorso. Un arrivo non
sostituisce il campo in compilazione. Ridurre/chiudere il dettaglio conserva
la richiesta; rispondere, rifiutare o ritirare sono azioni specifiche. Cambiare
campagna può mostrare che c'è una richiesta nell'altro contesto, senza eseguirla
qui o spostare automaticamente l'utente. Autorità e temporizzazioni restano
nei contratti specifici, non vengono risolte dal contenitore di navigazione.

## NAV-10 — ritorni, bozze, errori e rete

Il percorso gerarchico, per esempio **Campagne › Il faro › Preparazione ›
Scena**, indica dove ci si trova; non finge che quella sia la storia dei clic.
**Indietro** del browser ritorna nella storia; **Torna a…** esplicita l'origine
contestuale. Le pagine complete sono raggiungibili con link diretto previo
controllo; filtri, selezione e posizione si conservano nel rientro della
sessione quando ancora validi. Nessuna garanzia universale fra dispositivi.

Aprire/chiudere un menu o dettaglio è navigazione, non Salva/Annulla/Undo.
**Esc** chiude lo strato attivo o annulla la preview secondo stato; con campo
in modifica non scarta la bozza in silenzio. Il focus torna al comando che ha
aperto il dettaglio. Se una bozza non può essere conservata, prima di perderla
si offrono **Resta** o **Scarta modifiche**; **Salva ed esci** solo se applicabile
a quei dati e permessi. Nessun nuovo salvataggio generale per ogni cambio tab.

Quando manca rete, si navigano soltanto dati disponibili e si riconoscono
bozza locale, invio incerto e stato condiviso non aggiornato, I-114. La
riconnessione non esegue la preview o accetta un'offerta. Su errore resta il
contesto recuperabile; una destinazione cancellata o revocata offre il ritorno
all'elenco accessibile senza rivelarne informazioni residue. Autenticazione
e recupero di credenziali restano da definire nel loro percorso.

## NAV-11 — disponibilità, dispositivi e accessibilità

La navigazione mostra destinazioni accessibili. Un comando pertinente ma
momentaneamente non disponibile spiega il requisito noto; non si mostra una
voce segreta disabilitata che ne riveli il nome. Invito, ospite, co-DM, controllo
condiviso e modalità giocatore seguono l'autorità già registrata; presenza di
un menu non concede nuovi poteri. Account/proprietà/gestione sono distinti.

Su schermo stretto, la barra generale diventa un **Menu** esplicito, e la
navigazione locale **Sezioni di [campagna/personaggio]**, mantenendo etichette
e ordine. Un dettaglio può occupare l'area disponibile con **Torna al Tavolo**;
non si impone una fila di finestre flottanti da trascinare sul telefono.
Sul laptop il secondo monitor resta facoltativo. Vista sullo schermo comune
mostra soltanto contenuti autorizzati I-101/F-016, mai menu o note private del DM.

Link di pagina, tab locali e comandi sono distinguibili con semantica e
comportamento da tastiera standard. Tab/Shift+Tab, attivazione, focus visibile,
chiusura/rientro e touch senza hover vanno verificati nell'app. WAI APG è fonte
per questi comportamenti accessibili, non un attestato di conformità. I limiti
mobile dichiarati da Maps e le API Foundry non dimostrano la nostra ergonomia.

## Da dove vengono le scelte

R176–R178 conservano date, versioni, accesso e contro-evidenza. Qui ogni gruppo
NAV ha il riferimento pertinente, il motivo e il confine dell'adattamento.

| ID     | Precedente puntuale                                                                                                         | Motivo / adattamento                                                                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NAV-01 | Beyond menu pubblico PLAY D&D, Creations e Library; changelog 05/03/2026 e 14/04/2026, R176.                                | Accessi riconoscibili a personaggi/campagne/contenuti; quattro link diretti e ripresa Inizio sono composizione nostra, non menu Collections storico.                                     |
| NAV-02 | Kanka Campaign Switcher, R178; Beyond Character Header e Party Inventory FAQ, R176.                                         | Cambiare contesto e raggiungere gruppo/scheda senza tornare alla home; ruolo e autorità dell'app restano separati.                                                                       |
| NAV-03 | Kanka dashboard/sidebar, R178; gruppo Beyond R176; pagine I-208.                                                            | Campagna come contesto con menu locale. Sezioni e accorpamenti adattano le funzioni dell'intervista, non copiano quote o categorie premium.                                              |
| NAV-04 | Beyond Sheet Sections/Header, guide 17/09/2025 con limiti editoriali; dnd5e 3.0.0 Play/Edit, R176/R177.                     | Sezioni locali e modifica distinta dall'uso. Note private e campo narrativo condiviso restano separati; non si replica il layout storico al pixel.                                       |
| NAV-05 | Beyond Creations/Library e aggiornamenti 2026, R176; Owlbear Atlas 2.1, R177.                                               | Ricerca/raccolte e authoring distinti, accesso autonomo; riuso e abilitazione con le autorità dell'app.                                                                                  |
| NAV-06 | Foundry core Scenes; Owlbear Atlas/current scene; Roll20 Party Toolbox 24/10/2023, R177.                                    | Preparazione, vista personale e gruppo distinti. Destinatari I-165 e ritorni sono adattamenti espliciti; Close Scene non è chiusura pannello.                                            |
| NAV-07 | Beyond Character Header, Accessing Maps 16/02/2026 e Maps 09/04/2026, R176; Foundry core13.341, R177.                       | Tavolo contestuale con scena protagonista. Menu App compatto e Torna alla campagna raccordano i due contesti, senza terminare la partita.                                                |
| NAV-08 | Beyond scheda nella sidebar Maps 09/04/2026; Foundry13.341,14.359/API14.365, R176/R177.                                     | Dettagli a lato, chiusura/riduzione e pop-out facoltativo. Fissaggio I-190 e gestione dello spazio sono adattamenti; nessuna replica delle vecchie barre scene.                          |
| NAV-09 | Beyond ricerca Library; Foundry directory/registro; fonti di ricerca/appunti/richieste già R030–036/R055–057/R156/R169–170. | Richiamo nel contesto e perdita minima di orientamento; il contenitore comune e i filtri privati sono nostra integrazione, non nuova autorizzazione o coda unica concorrente verificata. |
| NAV-10 | WAI Breadcrumb/Dialog/Disclosure, R178; Foundry minimize/maximize, R177; bozze e ritorni I-208/I-210/I-211.                 | Posizione e storia distinte, focus di ritorno, chiusura reversibile; conservazione bozza e rete sono requisiti dell'app, non garanzie dei riferimenti.                                   |
| NAV-11 | WAI APG Tabs/Disclosure/Dialog, R178; Maps ammette limiti mobile, R176.                                                     | Stessi nomi e comandi con menu richiudibili e dettagli a piena area; adattamento da validare sui dispositivi, non usabilità già provata.                                                 |

## Casi rappresentativi e lacune residue

1. **Gruppo su Discord/Owlbear:** Personaggi → scheda → Inventario; Appunti
   apre Solo io. Nessun obbligo di creare una campagna, nessuna sincronizzazione
   con gli strumenti esterni dichiarata.
2. **Giocatore invitato:** Campagne → gruppo → ultimo riepilogo → Tavolo →
   Scheda/Magie → chiudi dettaglio. Rimangono stessa scheda e scena corrente.
3. **DM prepara senza rivelare:** Campagna → Preparazione → scena → Apri per
   me; nessuno viene spostato. Rivela contenuto cambia l'accessibilità, mentre
   Attiva al Tavolo cambia la scena per i destinatari pertinenti; nessuno dei
   due coincide con Salva.
4. **Richiesta durante una consultazione:** nuovo TS mentre si legge un oggetto;
   richiesta raggiungibile, campo non sostituito, nessun tiro automatico.
5. **Cambio gruppo:** Campagna A → Cambia campagna → B; nessun trasferimento
   di personaggio o risoluzione della richiesta di A. Si può tornare al suo contesto.
6. **Uso condiviso e segreti:** il co-DM trova Preparazione consentita, non
   Solo io altrui; la sua modalità giocatore non revoca o assegna ruoli.
7. **Rientro con bozza/revoca:** la bozza resta distinguibile, un accesso revocato
   non riapre l'anteprima privata. Una ricerca non rivela nomi o conteggi segreti.
8. **Telefono/tastiera:** Menu → Campagne → Sezioni → Diario, poi Tavolo →
   Scheda → Torna al Tavolo; stessi dati e comandi, focus/leggibilità da testare.

Sono criteri concettuali, non test eseguiti sull'app. La copertura degli ingressi
è in [NAVIGATION_COVERAGE](NAVIGATION_COVERAGE.md), per tutte le 65 voci attuali.
Restano: contenuti/campi di ciascuna pagina, matrice completa di autorità,
account/inviti e gestione dati, layout responsive e pannelli simultanei,
bozze fra dispositivi e offline, tempi e casi delle azioni. Queste lacune sono
lavoro autonomo: nessun nuovo parere ordinario dell'owner richiesto.

## Estensione del censimento I-217

I comandi personali riutilizzabili F-064 hanno accessi contestuali dal Tavolo
e dai preferiti della scheda; la gestione non richiede una barra permanente.
I materiali multimediali F-065 si trovano in Biblioteca → La mia libreria,
con lo stesso selettore negli editor. I due percorsi completi restano da
specificare: l'ingresso non li dichiara completati. [REFERENCE_COVERAGE](REFERENCE_COVERAGE.md)
verifica anche le capacità esterne che non erano nella prima checklist.

## Architettura dell'informazione della candidata

Letta il 30/09/2026 nell'app in esecuzione (1440 × 900, italiano, come DM e come giocatore,
esempio appena ripristinato). Regole per chi aggiunge un comando:
[registry plan §5.2](../../changes/interview-01/blueprint-registry-plan.md#52-dove-mettere-un-comando-regola-per-chi-costruisce-unarea);
tassonomie chiuse e validate in `registry.mjs`:
[§5.3](../../changes/interview-01/blueprint-registry-plan.md#53-architettura-dellinformazione-dopo-le-48-aree-b62-2526092026);
aspetto e fonte di ogni scelta visiva: [DESIGN.md](../../design/blueprint/DESIGN.md) §1 e §4. Le
scelte da preservare sono registrate in [I-237](DECISIONS.md#i-237--architettura-dellinformazione-copiata-dai-leader).

### Intestazione (ogni pagina)

| Posto               | Contenuto                                                                                                                                                                            | Copiato da                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marchio             | «d20 Studio» torna a Inizio                                                                                                                                                          | D&D Beyond (intestazione del sito)                                                                                                                                |
| Navigazione globale | **Inizio · Personaggi · Campagne · Biblioteca**; «Campagne» resta attiva in campagna e in Preparazione, «Personaggi» nel costruttore                                                 | D&D Beyond (destinazioni, pagina aperta sottolineata, DESIGN §4), composizione NAV-01                                                                             |
| Servizi, a destra   | Cerca (⌘K: pagine, comandi, sinonimi), Appunti personali, Notifiche e richieste (campanella con conteggio), Preferenze, Aiuto («?» o F1), stato della connessione, Account e profilo | Owlbear (azioni in alto, VTL-231); Foundry Quick Insert e Alchemy OmniSearch (SV-02); Quest Portal (campanella, VTL-007); Foundry impostazioni per ambito (SV-10) |
| Solo al Tavolo      | «App» (menu con i servizi che non entrano) e «Torna alla campagna»                                                                                                                   | Owlbear; sul telefono ciò che non entra va nel menu App (registry plan §5.2, regola 6)                                                                            |

### Campagna

Colonna laterale a sinistra: nome della campagna, ruolo, **Entra al Tavolo**, poi i gruppi. I
gruppi si aprono e si chiudono, lo stato è ricordato per identità, il gruppo della sezione aperta
resta aperto; sul telefono «Tutte le sezioni» elenca tutto per gruppo. Copiato da Kanka (gruppi di
moduli, CMP-23; barra scura, voce aperta come riga piena) e dalle categorie di World Anvil.

| Gruppo                     | Sezioni (DM)                                                                              | Giocatore                                     |
| -------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| Campagna (aperto di serie) | Panoramica, Gruppo, Sessioni, Diario, Mondo, Archivio, Preparazione                       | uguale, senza Preparazione                    |
| Racconto                   | Missioni, Discussioni, Archivio chat                                                      | uguale                                        |
| Ambientazione              | Materiali, Allegati, Mappa e calendario                                                   | uguale                                        |
| Gioco                      | Tempo libero, Inventario del gruppo, Sicurezza, Regole della tavola, Homebrew             | uguale                                        |
| Gestione DM                | Membri, Reclutamento, Impostazioni, Integrazioni, Valute, Dati della campagna, Assistente | «Strumenti»: Membri, Integrazioni, Assistente |

### Preparazione (DM o chi conduce la sessione)

Prima striscia con i gruppi, seconda con le sezioni del gruppo aperto; «Tutte» le elenca per
gruppo. Copiato dalle cartelle di Foundry e dalla barra delle pagine di Roll20.

| Gruppo               | Sezioni                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| Scene                | Scene (editor: muri, porte, luci, oggetti, livelli, varianti), Regioni e trappole, Movimento e griglia |
| Incontri             | costruttore d'incontri 2024                                                                            |
| Materiali            | Materiali, Tabelle e mazzi, Tesori, Mercanti                                                           |
| Scaletta e avventure | Sessione, Avventure                                                                                    |

### Scheda del personaggio

Intestazione: «← Personaggi», Condividi (link e QR), Gestisci personaggio, Aspetto (ritratto,
pedina e ritaglio), Riposa, Correggi valori, Avanza di livello, Rivedi scelte, Vai al Tavolo.
Fascia: caratteristiche, competenza, movimento e sensi, Ispirazione eroica, Punti ferita (il numero
apre temporanei, massimo, registro e correzioni; il campo accetta `-5`, `+3`, `=12`), Cura, Danno,
tiri salvezza, sensi passivi. Un clic su un numero tira subito con i dadi digitali (con i dadi
fisici scelti nel vassoio o un dado connesso apre la finestra delle facce); clic destro o pressione
lunga aprono la finestra con vantaggio, svantaggio e dadi fisici (Q168). Le righe di
personaggi, inventario e incantesimi hanno il menu contestuale (clic destro, pressione lunga,
Maiusc+F10). Copiato da D&D Beyond (sezioni della scheda DDB-027/DDB-053, clic sul numero).

| Categoria  | Sotto-sezioni                                         |
| ---------- | ----------------------------------------------------- |
| Azioni     | —                                                     |
| Magie      | —                                                     |
| Inventario | —                                                     |
| Capacità   | Capacità, Doni                                        |
| Storia     | Storia, Aspetto                                       |
| Note       | Note, Registro, Revisioni                             |
| Extra      | Creature e piani, Progetti e tempo libero, Ricettario |

### Biblioteca

Schede: Disponibili, La mia Biblioteca, Campagna, Le mie creazioni, Pacchetti di compatibilità,
Compendio SRD, Immagini e file. Copiato da D&D Beyond «My Library» (BI-01) e dal browser del
compendio di dnd5e.

### Tavolo

Disposizione di consenso del mercato: attrezzi a sinistra, barra laterale a schede a destra,
azioni in basso, ordine dei turni in alto ([registry plan §5](../../changes/interview-01/blueprint-registry-plan.md#5-struttura-del-tavolo-e-dove-mettere-un-comando-b61-24092026)).

| Posto                      | Contenuto                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Copiato da                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Riga del titolo            | nome della scena e stato («Esplorazione libera», «Combattimento · Round N»); solo i comandi di scena del core: DM «Avvia combattimento»/«Concludi incontro», «Scene», «Riposi», «Tempo»; giocatore «Riposi»                                                                                                                                                                                                                                                                        | Foundry (controlli di scena), registry plan §5.2 regola 2                                                                      |
| In alto (in combattimento) | ritratti di turno: chi agisce con doppia cornice chiara, alleati teal, nemici cremisi; «Avvia combattimento» apre la finestra dell'iniziativa per riga (d20, «Sorpreso»)                                                                                                                                                                                                                                                                                                           | BG3 (CRP-090), Solasta, bandierine di D&D Beyond Maps (DDB-137); roll call di Foundry                                          |
| Attrezzi a sinistra        | gruppi: **Seleziona e muovi** (Muovi, Pianifica percorso, Sposta vista, Seleziona più pedine), **Misura e sagome** (Misura, Righello a due livelli, Linea di vista, Sagoma), **Disegna e annota** (Disegna, Spillo; il giocatore ha solo Disegna), **Nebbia e visione** (DM: Nebbia, Luci, Barriere), **Puntatore**, **Strumenti del DM** (Teletrasporta, Posiziona il gruppo, Pedina a più facce, Regioni e trappole, Punto di ricerca; in combattimento anche Attacco di gruppo) | Foundry scene controls (FVT-108), Roll20 (R20-127); aspetto Owlbear Rodeo 2                                                    |
| Zoom, in basso a destra    | Trova la pedina, Ingrandisci, Riduci, Centra la scena                                                                                                                                                                                                                                                                                                                                                                                                                              | D&D Beyond Maps (DDB-120), Owlbear                                                                                             |
| Menu «Sessione» (DM)       | in alto a destra della mappa, sopra l'ordine di turno: Sessione (apre il pannello), Pausa, Nascondi scena, Conto alla rovescia, Orologi di progresso, Gruppo; il pannello Scena › Sessione ha anche gruppo diviso, presenze, «Vedi come», vista spettatore e racconto di fine sessione                                                                                                                                                                                             | Owlbear (menu della stanza sopra l'HUD); Roll20 (nastri del gruppo diviso)                                                     |
| Barra laterale destra      | colonna di schede-icona, in cima «Comprimi» e «Tutti i pannelli» (elenco per sezione, interruttore «Nella barra», «Stacca» per aprire un pannello in una finestra propria); una scheda per sezione, i pannelli della sezione come sotto-schede su una riga che scorre; ultima scheda e sotto-scheda ricordate per identità                                                                                                                                                         | Foundry sidebar (FVT-007) e pop-out V14 (FVT-199), Roll20, D&D Beyond Maps (DDB-133); sotto-schede come i filtri di D&D Beyond |
| In basso: hotbar           | identità, PF, risorse (Azione, Bonus, Reazione, Movimento); pagine «Azioni» (Armi, Incantesimi, Comuni: Scatto, Schivata, Disimpegno; «Mosse speciali» accanto) e «Barra rapida»; modalità dei dadi, «Tiri e risultati», Reazioni; comandi Muovi, Rialzati (se prono), Azioni della scheda, Tira i dadi, Esc · Annulla preparazione, Annulla ultima modifica, **Termina turno** per ultimo; al turno di un'altra creatura del giocatore la hotbar passa a quella                   | BG3 (CRP-098/099) e HUD Argon per Foundry (FVT-135)                                                                            |
| Menu della pedina          | clic destro o pressione lunga; doppio clic apre la scheda. In cima: Condizioni, Apri la scheda, Centra sulla mappa, Aggiungi alla selezione, Punti ferita…, Esamina (DM), Cerca; poi i sottomenu (frecce destra/sinistra, Esc)                                                                                                                                                                                                                                                     | Foundry Token HUD (FVT-119), D&D Beyond (DDB-117), menu contestuale di Owlbear                                                 |
| Telefono (≤ 720 px)        | la mappa prima, il pannello dopo; le schede sono una barra fissata in basso con «Mappa» per prima e «Tutti i pannelli» per ultima; entrando la mappa viene in vista una volta                                                                                                                                                                                                                                                                                                      | Quest Portal (barra in basso, VTL-008), D&D Beyond mobile (DDB-060), Owlbear (VTL-010)                                         |

Sezioni della barra laterale (sotto-schede):

| Sezione         | DM                                                       | Giocatore                              |
| --------------- | -------------------------------------------------------- | -------------------------------------- |
| Creatura        | Creatura, Riepilogo del gruppo                           | Creatura                               |
| Chat            | Registro, Dadi, Sicurezza                                | uguale                                 |
| Combattimento   | Combattimento, Incontro, Regole di movimento             | Combattimento                          |
| Scena           | Aggiungi creature, Scena, Sessione, Annotazioni, Visione | Scena, Annotazioni, Visione            |
| Esplorazione    | Mondo, Viaggio e accampamento                            | uguale                                 |
| Oggetti         | Bottino, Bottega                                         | solo quando il DM li apre ai giocatori |
| Documenti       | Materiali, Missioni, Immagini e file                     | uguale                                 |
| Tabelle e mazzi | un pannello                                              | uguale                                 |
| Consultazione   | Compendio, Schermo del DM                                | Compendio                              |

Sottomenu del menu della pedina (un sottomenu con un solo comando visibile mostra il comando
stesso):

| Sottomenu    | Comandi (DM)                                                                                                                                                                  | Giocatore, sulla propria pedina               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Azioni       | Trasforma…, Quota…, Nasconditi…                                                                                                                                               | uguale                                        |
| Aspetto      | Colore del bordo, Dimensione, Ruota, Rivela aspetto…, Aura…, Nota sulla pedina…, Lati (pedina a più facce)…, Immagini della pedina…, Ritaglia il ritratto…, Ritratto e bordo… | senza Rivela aspetto, Lati e Ritaglia         |
| Visibilità   | Nascondi ai giocatori (Maiusc+H), Visibile solo a…, Rinomina…, Nascondi il nome ai giocatori, Visione e luce…, Nascondi identità…                                             | solo «Visione e luce…», mostrato direttamente |
| Bottino      | comando diretto                                                                                                                                                               | —                                             |
| Strumenti DM | Porta una cavalcatura qui, Blocca la posizione (Maiusc+L), Copia, Togli dalla scena (Canc), Metti fuori mappa, Copia in un'altra campagna…, Scheda esterna…                   | solo «Scheda esterna…», mostrato direttamente |

## Dove si trova ogni funzione nel blueprint — candidata del 01/10/2026

Una riga per funzione del [censimento](CAPABILITY_CENSUS.md): stato della candidata con il file di prova (PROVEN, PARTIAL, OPEN-DECISION, EXCLUDED: legenda del censimento) e posto naturale nel blueprint, come lo scrivono i controlli. Servizi trasversali costruiti: «Cerca» (⌘K) con i sinonimi naturali, Appunti personali, notifiche, Preferenze, Account, menu contestuale di ogni riga, finestre staccabili, trascinamento dal Compendio.

### Servizi e impostazioni

- **SV-01** Ricerca nell'app su personaggi e voci accessibili — PROVEN · [audit/services][ev-services]. Dove: Lente in alto (o ⌘K) › «livia» › Invio › scheda di Livia
- **SV-02** Palette di comandi con prefissi, filtro contestuale, inserimento — PROVEN · [final-fixes][ev-final-fixes]. Dove: Intestazione › «Cerca» (⌘K): comandi, pagine e sinonimi naturali (bottino, segreto, sintonia, sondaggio…)
- **SV-03** Ricerca con tolleranza ai refusi, gruppi per categoria, filtri — PROVEN · [final-fixes][ev-final-fixes]. Dove: Intestazione › «Cerca» (⌘K): risultati per tipo con filtri; sinonimi naturali per ogni funzione
- **SV-04** Creazione rapida di qualsiasi voce — PROVEN · [audit/reaudit][ev-reaudit]. Dove: K › Creazione rapida) › Persona › Titolo › Crea
- **SV-05** Appunti personali per identità, anche senza campagna — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Appunti personali» › Nuovo appunto › Contesto (predefinito «Le lanterne di Bruma», da cambiare in «Personale · senza campagna») ›…
- **SV-06** Richieste pendenti sempre raggiungibili — PROVEN · [audit/services][ev-services]. Dove: Da Campagne: campanella («4 notifiche») › «Richieste in attesa: 3 richieste…» › «Apri tiri e risultati» › Tavolo con «Risolvi tiro» per…
- **SV-07** Centro notifiche per categoria (inviti, sessioni, esportazioni, richieste) — PROVEN · [audit/services][ev-services]. Dove: Campanella › chip per categoria (Tutte, Non lette, Inviti, Richieste di tiro, Attività del gruppo, Chat e discussioni, Altre aree) ›…
- **SV-08** Avvisi di attività del gruppo — PROVEN · [audit/services][ev-services]. Dove: Giocatore: scheda › Inventario › Scorta del gruppo › Torcia «Prendi» › Conferma
- **SV-09** Lingua IT/EN dell'interfaccia — PROVEN · [audit/services][ev-services]. Dove: «Preferenze» › Lingua: English › Salva preferenze
- **SV-10** Preferenze con ambito dichiarato: dispositivo, personale, campagna — PROVEN · [audit/services][ev-services]. Dove: Preferenze: blocchi «Su questo dispositivo», «Personali · Il mio account», «Campagna · Questa campagna»
- **SV-11** Tema chiaro, scuro o di sistema — PROVEN · [final-review-completeness][ev-final-review]. Dove: Preferenze › Tema: Chiaro › Salva
- **SV-12** Dimensione del testo e scala dell'interfaccia — PROVEN · [audit/services][ev-services]. Dove: Preferenze › Dimensione del testo 125% (si vede subito) › Scala 110% › Salva
- **SV-13** Movimento ridotto e modalità fotosensibile — PROVEN · [final-review-completeness][ev-final-review]. Dove: Preferenze › Movimento ridotto «Sempre attivo» e «Modalità fotosensibile» › Salva
- **SV-14** Segnali mai solo colore; modalità per daltonismo — PROVEN · [final-review-completeness][ev-final-review]. Dove: Preferenze › Colori adatti a «Deuteranopia» e «Parole sulla mappa» › Salva
- **SV-15** Carattere per dislessia e contrasto elevato — PROVEN · [final-review-completeness][ev-final-review]. Dove: Preferenze › Carattere «Alta leggibilità (dislessia)» e Contrasto «Elevato» › Salva
- **SV-16** Unità metriche o imperiali, coerenti con la lingua — PROVEN · [final-review-completeness][ev-final-review]. Dove: Preferenze › Distanze e pesi «Piedi e libbre» › Salva
- **SV-17** Scorciatoie ricollegabili con conflitti e ripristino — PROVEN · [final-review-completeness][ev-final-review]. Dove: «?» › «Modifica le scorciatoie» › cerca «notifiche» › pulsante «—» › premo N
- **SV-18** Guida alle scorciatoie generata dal registro dei comandi — PROVEN · [audit/services][ev-services]. Dove: Tasto «?» sul Tavolo: guida generata dai comandi registrati, divisa in Ricerca, Ovunque e Sul Tavolo, con i conflitti e «55 comandi non…
- **SV-19** Modalità prestazioni o solo scheda per dispositivi deboli — PROVEN · [audit/services][ev-services]. Dove: Preferenze › «Modalità solo scheda» › Salva
- **SV-20** Schermo sempre acceso con la scheda aperta — PROVEN · [audit/services][ev-services]. Dove: Preferenze › «Tieni lo schermo acceso» › Salva
- **SV-21** Il DM aiuta a configurare le preferenze di un giocatore — PROVEN · [audit/services][ev-services]. Dove: Preferenze › «Proponi preferenze a un giocatore…» › Dimensione 125% e nota › Invia
- **SV-22** Ritardo dei tooltip e opacità dei pannelli — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Preferenze › «Opacità dei pannelli» 60% › Salva
- **SV-23** Tastiera nei percorsi, focus visibile, Esc coerente — PROVEN · [audit/services][ev-services]. Dove: Il focus è sempre visibile (contorno oro di 3 px)
- **SV-24** Prove con lettore di schermo (menu a frecce, caselle etichettate) — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Menu con role=menu e navigazione a frecce
- **SV-25** Profilo: nome visualizzato e avatar — PROVEN · [audit/services][ev-services]. Dove: Icona persona › Account e profilo › Profilo › «Salvo» › Salva nome
- **SV-26** Metodi d'accesso e servizi collegati, distinti dal login — PROVEN · [audit/services][ev-services]. Dove: Account › Accesso e servizi
- **SV-27** Esportare i propri dati; cancellare l'account con avviso delle conseguenze — PROVEN · [final-review-completeness][ev-final-review]. Dove: Account › I miei dati › «Esporta i miei dati» scarica un JSON solo con i miei dati
- **SV-28** Politica d'età e consenso dei genitori — OPEN-DECISION · requisito legale ([I-233][i-233]); oggi età dichiarata negli annunci e filtro 18+ · [audit/reaudit][ev-reaudit]. Dove: Negli annunci pubblici c'è «Età: Nessun limite dichiarato dal DM» e il filtro «Mostra annunci per adulti (18+)»
- **SV-29** Segnalare, bloccare, codice di condotta — PROVEN · simulazione · [audit/services][ev-services]. Dove: Tavoli pubblici › annuncio › «Segnala annuncio» (motivi, screenshot facoltativo) › Invia
- **SV-30** Offline simulato: privato locale, condiviso bloccato, stato visibile — PROVEN · [final-review-completeness][ev-final-review]. Dove: Preferenze › «Simula assenza di rete»
- **SV-31** Scegliere che cosa è disponibile offline — PROVEN · [audit/services][ev-services]. Dove: Icona nuvola › Offline e sincronizzazione › «Rendi disponibile» per voce o «Rendi disponibile tutto»
- **SV-32** Coda delle modifiche e conflitti alla riconnessione — PROVEN · [audit/services][ev-services]. Dove: Storia › «Storia e legami» modificata e messa in coda
- **SV-33** Archiviazione del browser non disponibile segnalata — PROVEN · [audit/services][ev-services]. Dove: Con localStorage e IndexedDB bloccati compare subito il banner «Salvataggio locale non disponibile… i dati precedenti non vengono…
- **SV-34** Stato della connessione e riconnessione automatica — PROVEN · [audit/reaudit][ev-reaudit]. Dove: setOffline → «Senza rete…», back → «In linea…».
- **SV-35** Undo locale con autore e registro — PROVEN · [audit/services][ev-services]. Dove: Danno 2 › «Annulla ultima modifica»
- **SV-36** Conferme proporzionate alle azioni distruttive — PROVEN · [audit/services][ev-services]. Dove: Personaggi › «Elimina Iria» › «Sposta nel cestino»
- **SV-37** Errori specifici con azione suggerita — PROVEN · [audit/reaudit3-c][ev-reaudit3-c]. Dove: Sweep of ~75 views (31 campaign-section views, 23 as DM and 8 as player; the 9 Settings tabs; the 5 Integrations tabs; every Table sidebar tab and bottom-bar page as DM and as player; Home,…
- **SV-38** Inoltro di tiri e avvisi a Discord — PROVEN · simulazione · [final-review-completeness][ev-final-review]. Dove: Integrazioni › Discord: webhook masked «••••0001», channel preview, private rolls not relayed
- **SV-39** Feed calendario delle sessioni — PROVEN · simulazione · [audit/reaudit][ev-reaudit]. Dove: Home «Prossimo appuntamento» offers «Aggiungi al calendario».
- **SV-40** Collegare una scheda esterna a una pedina — PROVEN · [audit/services][ev-services]. Dove: Clic destro o pressione lunga sulla pedina › «Scheda esterna…» › URL e visibilità › Salva il link
- **SV-41** API pubblica e connettori — PROVEN · simulazione · [audit/reaudit][ev-reaudit]. Dove: API token in two steps; palette «token API».
- **SV-42** Estensioni di terze parti per campagna — PROVEN · simulazione · [final-review-completeness][ev-final-review]. Dove: Integrazioni › Moduli with dependencies; disabled Save explains «Nessuna modifica da salvare»
- **SV-43** Assistente AI con citazioni su fonti autorizzate — PROVEN · simulazione · [audit/services][ev-services]. Dove: Apri campagna › GESTIONE DM › Assistente › Consenso e dati › «Attiva l'assistente…»
- **SV-44** Resoconto AI rivisto prima della condivisione, consenso alla registrazione — PROVEN · simulazione · solo test Node · [audit/reaudit][ev-reaudit]. Dove: (correzione, provata da test) Settings, preferences, integrations, account, drafts and similar events are never recap sources, moments or entities; a period with none says «Nessun evento di gioco…» (refusal) and a…
- **SV-45** Scrittura assistita nelle note e generazione di personaggi — PROVEN · simulazione · [audit/services][ev-services]. Dove: Assistente › Scrivi › Tema «PNG da un'idea» › Richiesta › Genera
- **SV-46** Modello proprio o locale — PROVEN · simulazione · [audit/reaudit3-c][ev-reaudit3-c]. Dove: Gestione DM › Assistente › «Consenso e dati» › «Attiva l’assistente…» (dialog lists what it reads and never reads) › «Motore delle risposte (solo per te)» › «Modello locale su questo…
- **SV-47** Aiuto contestuale "?" per pagina — PROVEN · [final-review-completeness][ev-final-review]. Dove: Icona «?» o F1 sul Tavolo: «Aiuto · Tavolo», cosa si fa qui, avvia il tour, segnala un problema, «Torna alla pagina»
- **SV-48** Suggerimenti alla prima occorrenza, archiviati e ripristinabili — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Si accendono da Aiuto › «Tour e suggerimenti» (porta a Inizio › Guide, fuori dal Tavolo) › casella
- **SV-49** Tour facoltativi ripristinabili — PROVEN · [final-review-completeness][ev-final-review]. Dove: Aiuto › «Avvia il tour «Il Tavolo»», 6 passi
- **SV-50** Suggerimenti durante l'attesa — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Pause overlay shows a tip or rule of the day.
- **SV-51** Stato del servizio, diagnostica e segnalazione di un problema — PROVEN · [final-review-completeness][ev-final-review]. Dove: Inizio › scheda Supporto: stato del servizio, incidenti, Diagnostica, «Segnala un problema» (toglie i dati personali, mostra…
- **SV-52** Anteprime facoltative di funzioni sperimentali — PROVEN · [audit/services][ev-services]. Dove: Inizio › Supporto › Anteprime delle funzioni › «Inizio compatto»
- **SV-53** Annunci pubblici e candidature per trovare un gruppo — PROVEN · simulazione · [audit/services][ev-services]. Dove: Inizio › «Cerca un tavolo» (filtri: lingua, formato, giorno e ora nel mio fuso, nuovi giocatori, 18+) › Apri annuncio › Candidati…
- **SV-54** Sessioni a pagamento con DM professionista — EXCLUDED · [I-233][i-233] · sessioni a pagamento. Dove: «pagamento» e «prezzo» non danno risultati
- **SV-55** AI come DM — EXCLUDED · [I-233][i-233] · IA come DM. Dove: L'assistente dice «Da decidere al tavolo… L'assistente non li inventa»
- **SV-56** Verifica in due passaggi dell'account — OPEN-DECISION · [Q167][q167] · capacità oltre il censimento. Dove: Account › Accesso e servizi ha le passkey, non un secondo fattore

### Trasversale

- **X-01** Una sola identità dei dati fra scheda, campagna e Tavolo — PROVEN · [final-review-completeness][ev-final-review]. Dove: Danno 3 sulla scheda: Tavolo «Livia · 15/22 PF», campagna «15 / 22», Inizio «15 / 22»
- **X-02** Pannelli consultabili mentre il gioco continua — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Player log has no preset/service line.
- **X-03** Correzioni per conseguenza registrate invece di un undo globale — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Ogni annullamento diventa una voce «Correzione … Annullato: …»
- **X-04** Salvataggio esplicito o automatico dichiarato per ogni editor — PROVEN · [audit/services][ev-services]. Dove: L'editor degli appunti dice «Bozza privata salvata su questo dispositivo» o «Modifiche non salvate»
- **X-05** Insieme fisso di superfici di comando (azione, strumento, menu, popover, modale, avviso) — PARTIAL · preferenze delle notifiche in due posti (campanella e Preferenze) · [final-fixes][ev-final-fixes]. Dove: Finestre: «Annulla» ed Esc tornano alla superficie d'origine (Preferenze › «Ripristina predefiniti…»); le preferenze delle notifiche restano sia nella campanella sia in Preferenze
- **X-06** Menu contestuale con equivalente touch e da tastiera per ogni oggetto — PROVEN · [final-fixes][ev-final-fixes]. Dove: Clic destro, pressione lunga o Maiusc+F10 su una scheda in Personaggi, una riga dell'inventario o un incantesimo: menu con i comandi della riga
- **X-07** Trascinamento come collegamento universale, sempre con alternativa accessibile — PROVEN · [final-fixes][ev-final-fixes]. Dove: Tavolo › Consultazione › Compendio: trascina una creatura sulla mappa (DM), un oggetto o un incantesimo su una pedina o sulla scheda; «Aggiungi…» resta l'alternativa da tastiera
- **X-08** Registro unico dei comandi → barra, riga, tooltip, scorciatoia — PROVEN · [audit/services][ev-services]. Dove: Riposi Y → J: il tooltip diventa «Riposi (J)», cambiano aria-keyshortcuts, la riga in ⌘K («…
- **X-09** Aritmetica nei campi numerici — PROVEN · [final-fixes][ev-final-fixes]. Dove: Scheda › Punti ferita: -5, +3, =12 o 25-3+2 e Invio; anche in «Correggi i punti ferita» e nel menu della pedina
- **X-10** Finestre staccabili per più schermi — PROVEN · [final-fixes][ev-final-fixes]. Dove: Tavolo › «Tutti i pannelli» › «Stacca» accanto a ogni pannello: finestra separata e sincronizzata
- **X-11** Comandi personali e sequenze riutilizzabili senza codice — PROVEN · [audit/services][ev-services]. Dove: Tavolo › scheda «Barra rapida» › casella «+» › Percezione (ci sono anche «Tiro salvato (formula)» e «Sequenza di passi») › Aggiungi ›…
- **X-12** Macro con codice o scripting — OPEN-DECISION · [GAP-01][gap-01] · script con codice non scelto ([I-233][i-233]). Dove: «macro» e «script» non danno risultati

<!-- Riferimenti delle prove (stato delle capacità) -->

[ev-campaign-hub-world]: ../../changes/interview-01/audit/campaign-hub-world.md
[ev-campaign-settings-data]: ../../changes/interview-01/audit/campaign-settings-data.md
[ev-features-management]: ../../changes/interview-01/audit/features-management.md
[ev-final-fixes]: ../../changes/interview-01/final-fixes.md
[ev-final-review]: ../../changes/interview-01/final-review-completeness.md
[ev-home-creation]: ../../changes/interview-01/audit/home-creation.md
[ev-library]: ../../changes/interview-01/audit/library.md
[ev-prep-encounters]: ../../changes/interview-01/audit/prep-encounters.md
[ev-prep-scenes]: ../../changes/interview-01/audit/prep-scenes.md
[ev-reaudit]: ../../changes/interview-01/audit/reaudit.md
[ev-reaudit3-a]: ../../changes/interview-01/audit/reaudit3-a.md
[ev-reaudit3-b]: ../../changes/interview-01/audit/reaudit3-b.md
[ev-reaudit3-c]: ../../changes/interview-01/audit/reaudit3-c.md
[ev-services]: ../../changes/interview-01/audit/services.md
[ev-sessions-members-safety]: ../../changes/interview-01/audit/sessions-members-safety.md
[ev-sheet]: ../../changes/interview-01/audit/sheet.md
[ev-spells-inventory]: ../../changes/interview-01/audit/spells-inventory.md
[ev-table-combat]: ../../changes/interview-01/audit/table-combat.md
[ev-table-dice-time]: ../../changes/interview-01/audit/table-dice-time.md
[ev-table-map-vision]: ../../changes/interview-01/audit/table-map-vision.md
[q166]: OPEN.md#q166--dadi-karmici
[q167]: OPEN.md#q167--capacità-dei-leader-oltre-il-censimento
[i-233]: DECISIONS.md#i-233--capacità-in-attesa-dellowner-incluse-come-simulazioni-dichiarate
[gap-01]: REFERENCE_COVERAGE.md
