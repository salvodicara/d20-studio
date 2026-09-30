# Un'app intera: struttura proposta e percorso di costruzione

**Candidata funzionale del 01/10/2026, in attesa della valutazione dell'owner (Fase B del
[piano](../ROADMAP.md); non approvata).** L'app intera descritta qui è costruita come
[blueprint visuale navigabile](BLUEPRINT_CONTRACT.md) in `design/blueprint/`, con il Markdown
sincronizzato per gli agenti. L'owner la valuta con la [mappa breve delle funzioni](FEATURE_MAP.md);
sintesi, visita, numeri e limiti: [BLUEPRINT_STATUS](BLUEPRINT_STATUS.md); struttura effettiva e
prodotto copiato per ogni struttura: [NAVIGATION](NAVIGATION.md#architettura-dellinformazione-della-candidata);
passo operativo: [NEXT](../NEXT.md). Le sezioni sotto, dal 22/09, restano valide come intento; dove
descrivono uno stato di costruzione («non costruito», «parziale») sono storiche.

## La struttura realizzata

Architettura finale della candidata funzionale; l'aspetto è provvisorio e si rifà nella Fase C.

| Destinazione | Nella candidata                                                                                                                                                                                                  | Modello                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Intestazione | Inizio · Personaggi · Campagne · Biblioteca; a destra Cerca (⌘K), Appunti personali, Notifiche e richieste, Preferenze (tre ambiti), Aiuto, connessione, Account e profilo                                       | D&D Beyond, Owlbear, Foundry  |
| Inizio       | ripresa di personaggio, campagna e sessione; lavoro da riprendere; campagne, discussioni, «Trova un tavolo»; primi passi; Novità · Guide · Supporto; per il DM la prossima sessione e la Preparazione            | Roll20 «My Games», D&D Beyond |
| Personaggi   | elenco e creazione (a sezioni, rapida, pronti, con il DM); scheda a sette categorie (Azioni, Magie, Inventario, Capacità, Storia, Note, Extra), la stessa usata al Tavolo e in campagna                          | D&D Beyond                    |
| Campagna     | barra laterale a gruppi Campagna, Racconto, Ambientazione, Gioco, Gestione DM («Strumenti» per il giocatore) ed «Entra al Tavolo»                                                                                | Kanka, World Anvil            |
| Preparazione | gruppi Scene, Incontri, Materiali, Scaletta e avventure; salvare, rivelare e attivare restano comandi distinti                                                                                                   | Foundry, Roll20               |
| Tavolo       | attrezzi a sinistra, barra laterale a nove sezioni con sotto-schede a destra, barra delle azioni in basso, ritratti di turno in alto, menu della pedina a sottomenu, menu «Sessione» del DM, finestre staccabili | BG3, Owlbear, Foundry, Roll20 |
| Biblioteca   | contenuti disponibili, personali e di campagna, homebrew con revisioni, avventure, pacchetti di compatibilità, Compendio SRD 5.2.1, immagini e file                                                              | D&D Beyond, Foundry           |

Dove mettere un comando nuovo: [registry plan §5](../../changes/interview-01/blueprint-registry-plan.md#5-struttura-del-tavolo-e-dove-mettere-un-comando-b61-24092026); aspetto e fonte di ogni scelta visiva:
[DESIGN.md](../../design/blueprint/DESIGN.md); scelte da preservare: [I-237](DECISIONS.md#i-237--architettura-dellinformazione-copiata-dai-leader)
e [I-244](DECISIONS.md#i-244--chiusura-delle-funzioni-scelte-delegate-del-01102026); il sistema
visivo di [I-238](DECISIONS.md#i-238--sistema-visivo-del-blueprint-in-designmd) è provvisorio fino
alla Fase C ([I-243](DECISIONS.md#i-243--prima-le-funzioni-laspetto-in-una-fase-dedicata)).

I tre percorsi sotto (giocatore, DM, uso parziale) sono visitabili con i dati d'esempio: la stessa
Livia, gli stessi PF e oggetti fra Inizio, scheda, campagna e Tavolo (capacità X-01, PROVEN).

22/09/2026, I-205/I-206. Sintesi dell'agente sotto delega, correggibile e ancora
parziale. Non è il contratto completo approvato né una nuova lista di funzioni.
Deriva dall'intervista corrente; nessuna mappa ritirata è stata recuperata.

## Situazione reale e risultato da ottenere

Abbiamo 65 voci inventariate, con stato e lacune in [COVERAGE](COVERAGE.md),
ricerche e molte decisioni. Prima di questa sintesi [PAGES](PAGES.md) conteneva
soltanto il tavolo parziale. Le visite dimostrano alcuni gesti, non un'app
integrata, persistenza reale o multiplayer. Non usare il loro numero come
misura di avanzamento del prodotto.

Il prossimo risultato è un percorso riconoscibile attraverso l'intera app:
preparare il personaggio, entrare nella campagna, ritrovare la sessione,
giocare, conservare quanto successo e riprendere. La preparazione del DM e
l'uso individuale devono collegarsi allo stesso insieme. I dettagli tattici
già scritti restano validi; i loro casi residui rimangono nel registro.

## Avanzamento leggibile — 01/10/2026

| Passaggio                      | Dove siamo                                                                                                                                                                         | Risultato da raggiungere                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Copertura delle capacità       | 528 capacità nel [censimento](CAPABILITY_CENSUS.md#totali-dellelenco): 521 PROVEN, 1 PARTIAL, 0 OPEN-DECISION, 6 EXCLUDED; raggruppate in 119 righe nella [mappa](FEATURE_MAP.md). | Ogni capacità pertinente ha un trattamento esplicito, senza limitarsi ai marchi principali.                     |
| Visuale e Markdown collegati   | Candidata funzionale completa e sincronizzata con questo Markdown (Fase A in chiusura); prove in [BLUEPRINT_STATUS](BLUEPRINT_STATUS.md).                                          | Un unico artefatto navigabile con comandi, stati e risultati provati, allineato al Markdown.                    |
| Accordo sul contratto          | Fase B: candidata presentata, identificata dal manifest del 01/10/2026; nessuna approvazione.                                                                                      | L'owner visita, corregge e approva esplicitamente una versione; visuale e Markdown diventano una sola baseline. |
| Aspetto, nome e prodotto reale | Fasi C (design visivo), D (nome e brand), E (implementazione reale) del [piano](../ROADMAP.md); l'aspetto di [DESIGN.md](../../design/blueprint/DESIGN.md) è provvisorio.          | Rifinitura estetica e implementazione rispettano il contratto; prove reali prima del rilascio.                  |

La grafica provvisoria consente di costruire ora il blueprint. Non occorre
terminare o far leggere tutto il Markdown prima di mostrarlo. L'agente è
responsabile della copertura e comunica progressi brevi e visitabili.
[NEXT](../NEXT.md) resta l'unica istruzione operativa corrente.

## Una struttura, due contesti collegati

La provenienza delle scelte principali è ora esplicita in
[DESIGN_SOURCES](DESIGN_SOURCES.md), I-209. Il raggruppamento concettuale sotto
è precisato da [NAVIGATION](NAVIGATION.md), I-212: accessi globali,
navigazione locale e Tavolo hanno fonti e adattamenti espliciti; stile e
dimensioni visive restano da sviluppare.

Fuori dalla partita prevalgono lettura, organizzazione e preparazione.
Durante la partita prevale la scena con comandi e informazioni contestuali.
La scheda, gli oggetti e le note conservano identità e permessi passando
dall'uno all'altro. Non si ricopiano dati per entrare al tavolo.

Questa composizione è una sintesi nostra, non una struttura identica
attribuita a un concorrente. R037/R161/R171 sostengono i raccordi personaggio,
campagna, scena e dettagli; R094/R103 sostengono diario e biblioteca.

| Destinazione proposta | Che cosa vedo e faccio                                                                                                               | Collegamenti e confini                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inizio**            | Riprendo personaggi, campagne e lavoro personale recente; raggiungo inviti e sessioni previste.                                      | Quattro accessi globali proposti: Inizio, Personaggi, Campagne, Biblioteca. Non obbliga a creare una campagna.                                                                   |
| **Personaggi**        | Creo, ricostruisco o importo una scheda; apro inventario, magie, capacità, avanzamento e appunti accessibili.                        | Scheda completa autonoma; durante il gioco apro i dettagli pertinenti dello stesso personaggio. Copie e trasferimenti sono comandi distinti, non una sincronizzazione implicita. |
| **Campagna**          | Trovo gruppo, prossimo incontro reale, ultimo riepilogo, diario, missioni, mondo e beni comuni.                                      | Entrate a Tavolo e Preparazione. Calendario reale distinto dal tempo della finzione. Informazioni private non appaiono nella vista condivisa.                                    |
| **Preparazione**      | Il DM prepara o riusa scene, mappe, incontri, PNG, tesori, trappole e materiali; può iniziare anche con poco materiale.              | Area della campagna, con materiali riutilizzabili collegati alla Biblioteca. Preparare, rendere visibile e attivare al tavolo sono azioni diverse.                               |
| **Tavolo**            | Gioco esplorazione e combattimento, con o senza mappa; controllo le mie creature, scelgo azioni, tiro, leggo conseguenze e correggo. | Scena protagonista; scheda, inventario, note, registro e ricerca apribili/fissabili. Strumenti del DM secondo ruolo; uscire dalla vista non conclude da solo la sessione.        |
| **Biblioteca**        | Cerco regole, opzioni e materiali riutilizzabili; creo homebrew o copie personali e ritrovo le mie raccolte.                         | Consultare, aggiungere alla scheda, abilitare in campagna e pubblicare sono passaggi distinti. Il catalogo pubblico facoltativo non implica annunci per trovare gruppi.          |

Le sei righe non sono sei pulsanti obbligatori nello stesso menu. Diario e
mondo sono sezioni della campagna, non altre applicazioni. Preferenze, lingua,
accessibilità, account e gestione dei dati sono accessi di servizio da
descrivere; ricerca e richieste pendenti restano raggiungibili nel contesto.
Le note personali devono essere disponibili anche senza campagna.

## Tre percorsi che devono reggere l'insieme

Questi percorsi diventano ora pagine concettuali in [PAGES](PAGES.md).
La visita app-journey-v1 mostra il primo raccordo Personaggio/Campagna/Tavolo,
con una nota personale locale mantenuta fra le viste. Non rappresenta ancora
creazione completa, inviti, DM, Preparazione o Biblioteca, né la loro rete.
Il suo compito è rendere visibile la continuità; le parti non rappresentate
rimangono nel contratto, senza essere contate come realizzate.

### Giocatore: prima, durante e dopo la sessione

1. Da Inizio apro il personaggio, anche se il DM non usa l'app. Inventario,
   capacità e tiri sono utilizzabili senza preparare una mappa.
2. Se partecipo a una campagna nell'app, apro quella campagna, leggo il
   riepilogo precedente e raggiungo il tavolo. Un invito può farmi scegliere
   un personaggio esistente o crearne uno; assegnazioni e autorizzazioni sono
   visibili, non dedotte dal possesso del link.
3. Al tavolo esploro; quando inizia lo scontro ritrovo posizione, risorse e
   contenuti senza ricompilazioni. Preparo la mossa, posso cambiare idea,
   confermo e uso dadi digitali o fisici con calcoli leggibili.
4. Apro l'inventario per usare un oggetto e torno alla scena. Le risorse
   aggiornate sono le stesse della scheda; le correzioni conservano il registro.
5. A fine incontro il bottino, le missioni e gli appunti hanno collegamenti
   con la campagna. Il riepilogo di sessione è modificabile da chi autorizzato:
   non promettiamo una narrazione generata automaticamente.
6. Riapro la scheda più tardi e ritrovo lo stato salvato. Offline distinguo
   materiale disponibile, modifiche locali e attività condivise in attesa.

### DM: preparare, improvvisare e riutilizzare

1. Apro la campagna e il riepilogo del gruppo; scelgo una sessione da preparare.
2. In Preparazione parto da vuoto, modello o mappa caricata. Collego PNG,
   incontri, segreti, porte e tesori nei limiti effettivamente definiti.
3. Controllo che cosa vedranno i giocatori e attivo la scena con un'azione
   distinta dal salvataggio della preparazione. Il materiale non rivelato
   non entra in anteprime, ricerca o riepiloghi dei giocatori.
4. Conduco al tavolo: muovo PNG, avvio o termino i turni, improvviso creature
   e oggetti, correggo conseguenze. Nessuna preparazione completa obbligatoria.
5. Registro ciò che voglio conservare e preparo la prossima sessione. Posso
   riusare materiale senza copiare implicitamente i progressi di un altro gruppo.

### Uso parziale: il gruppo rimane su Discord/Owlbear

1. Creo o importo il mio personaggio e uso scheda, inventario, note e tiri.
2. Il resto del gruppo può usare strumenti esterni. Non serve popolare una
   campagna fittizia o inventare account per loro.
3. Posso registrare manualmente effetti o valori che arrivano dal tavolo
   esterno. Non è promessa una sincronizzazione con Discord, Owlbear o Beyond.
4. Se il gruppo adotta poi il tavolo dell'app, il percorso riusa personaggi
   e materiali secondo gli accessi, distinguendo collegamento da copia.

I percorsi sopra compongono requisiti acquisiti; non chiudono dettagli ancora
mancanti come conflitti offline, inviti revocati e operazioni concorrenti.

## Posto di ogni funzione inventariata

Assegnazione preliminare per progettare, non certificazione di completamento.
Ogni F compare una volta come responsabilità principale; le altre aree sono
accessi alla stessa funzione. COVERAGE conserva requisiti, fonti e lacune.

| Responsabilità principale | Funzioni                                                                                                                            | Raccordi indispensabili                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Personaggi                | F-003, F-008, F-020, F-023, F-024, F-041, F-044, F-045, F-057, F-058                                                                | Inventario e magie al tavolo; creazione e avanzamento dalla biblioteca; compagni e trasformazioni sulla scena.             |
| Campagna                  | F-006, F-007, F-011, F-014, F-015, F-025, F-029, F-032, F-034, F-035, F-039, F-040, F-042, F-046, F-053                             | Appunti anche personali; riepilogo prima di giocare; mondo/missioni al tavolo; preparazione e gruppo autorizzato.          |
| Preparazione              | F-012, F-013, F-018, F-036, F-038                                                                                                   | Materiali riutilizzabili dalla biblioteca; attivazione/rivelazione distinte; improvvisazione al tavolo.                    |
| Tavolo                    | F-001, F-005, F-010, F-016, F-019, F-021, F-022, F-037, F-047, F-048, F-049, F-050, F-051, F-052, F-054, F-055, F-056, F-060, F-064 | Mercanti, viaggi e riposi anche descrittivi; mappa facoltativa; modifiche leggibili in scheda e campagna.                  |
| Biblioteca                | F-009, F-033, F-043, F-059, F-065                                                                                                   | Homebrew e raccolte, tabelle e mazzi riutilizzabili; utilizzo contestuale senza pubblicazione obbligatoria.                |
| Trasversale               | F-002, F-004, F-026, F-027, F-028, F-031, F-061, F-062                                                                              | Dadi, spiegazioni, offline, import/export, aiuto, backup e ricerca nelle aree pertinenti; nessun menu per ogni capacità.   |
| Stato separato            | F-017, F-030, F-063                                                                                                                 | Chiamate escluse ora; musica esterna per ora; annunci pubblici ancora questione di scopo Q161. Nessuna inclusione dedotta. |

## Dal quadro al prodotto funzionante

D-013/I-218 aggiorna il metodo: costruire subito un unico prototipo visuale
navigabile e ampliare insieme quel prototipo e il Markdown, fino alla
copertura completa. Il [brief](BLUEPRINT_CONTRACT.md) definisce fedeltà,
simulazioni, verifica e approvazione; la [roadmap](../ROADMAP.md) conserva le
tappe successive. Non è più richiesta l'approvazione preventiva dell'intero
Markdown per iniziare il prototipo.

Ogni incremento deve collegarsi al medesimo stato e ai percorsi esistenti.
Il primo percorso prova che le parti si tengono insieme; non diventa un MVP
imposto o un taglio del perimetro. Un menu, un'etichetta o un pulsante inerte
non dimostrano la copertura di una funzione.

La candidata completa viene valutata navigandola. Dopo le correzioni e
l'approvazione esplicita dell'owner si fissano visuale, Markdown e prove come
un unico contratto identificabile. La grafica finale e il prodotto reale
seguiranno quella baseline: la simulazione locale non dimostra sicurezza,
multiplayer o persistenza di produzione.

Le precedenti alternative basate sul completamento documentale prima dei
mock sono superate dalla richiesta esplicita D-013. Restano la delega sulle
scelte ordinarie, il confronto con i prodotti e le domande soltanto sui dubbi
sostanziali irrisolti. Nessun voto A/B ordinario obbligatorio.

## Controllo del lavoro e prossimo risultato

Un coordinatore mantiene struttura, requisiti e stato corrente. I compiti
delegati hanno confini, fonti e risultato atteso; ogni modifica futura collega
requisito, percorso e prova. Un revisore distinto controlla il risultato reale.
Un agente che scrive "fatto" non chiude la verifica. Modello/sforzo invariati.

L'owner vede cosa è stato collegato, cosa manca e quale dubbio richiede il
suo giudizio. Gli agenti risolvono ricerca, dettagli ordinari e verifiche;
resta una sola domanda concreta per una scelta sostanziale ancora irrisolta.

### Come capire dove siamo

| Livello              | Stato reale al 22/09/2026                                                                              | Che cosa manca per chiuderlo                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Visione e ambito     | Destinatari, principi e capacità ampiamente raccolti; 63 voci inventariate con stati distinti.         | Eccezioni di scopo esplicite come Q161; nuove scoperte pertinenti da valutare senza riaprire tutto.    |
| Composizione         | Quadro unitario e tre percorsi; sei pagine concettuali iniziali presenti e collegate, ancora parziali. | Specificare tutti i comandi, stati e raccordi indicati come lacune.                                    |
| Direzione estetica   | Qualità visiva vincolante; esempi illustrativi provvisori.                                             | Confronto curato a parità di contenuti, scelta esplicita e linguaggio visivo comune dopo il contratto. |
| Prodotto funzionante | Nessuna implementazione di produzione attestata; prototipo locale ora autorizzato da D-013.            | Contratto approvato, lavoro tecnico, dati persistenti e ruoli reali, verifiche e integrazione.         |

Non ricavare percentuali di completamento dal numero di file o decisioni.
La presenza di un posto per ogni funzione non dimostra che tutti i suoi
comandi, dati e casi limite siano già definiti.

**Raccordo completato in prima forma, I-208:** cinque nuove pagine e Tavolo
collegati in PAGES; app-journey-v1 mostra tre viste del percorso del giocatore.
Inventario e magie sono stati raccordati in I-210/I-211; I-212 precisa la
navigazione e verifica gli ingressi di tutte le voci attualmente inventariate.
Le altre lacune rimangono in COVERAGE; la sequenza operativa vive solo in NEXT.

**Raccordo del personaggio, I-213/I-214:**
[creazione e ricostruzione](CHARACTER_CREATION.md) portano dalle sezioni alla
scheda; [avanzamento e revisione](CHARACTER_ADVANCEMENT.md) mostrano differenze
prima di applicarle. I percorsi riusano inventario e magie, conservano valori
manuali e separano bozze e risorse in gioco. Non chiudono trasferimenti,
importatori, tutti i contenuti homebrew o i casi speciali del personaggio.

## Dettaglio collegato e provenienza — 23/09/2026

I-209 rende esplicita l'origine di ogni scelta in [DESIGN_SOURCES](DESIGN_SOURCES.md).
I percorsi di [inventario](INVENTORY_FLOW.md) e [magie](SPELLCASTING_FLOW.md),
I-210/I-211, attraversano Biblioteca, Personaggi e Tavolo con gli stessi dati.
Non sono nuove pagine principali né specifiche complete di ogni caso D&D.
I dettagli ancora aperti restano in [COVERAGE](COVERAGE.md) e nei flussi.
