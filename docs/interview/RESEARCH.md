# Ricerche a supporto dell'intervista

Confronti documentali, distinti dalle [decisioni del proprietario](DECISIONS.md).
Integrano la [ricerca conservata](../../evidence/research-01/coverage.md), senza sostituirla
o recuperare le vecchie strutture ritirate. Nessuna prova diretta dei prodotti in questa verifica.

## R001 — preview e aggiornamento durante i turni altrui

Consultazione: 13/09/2026. Origine: [Q009](OPEN.md#q009--aggiornamento-della-preview-quando-il-bersaglio-si-sposta).
All'avvio della ricerca il proprietario propendeva per l'aggiornamento automatico ma domandava
se stessimo complicando troppo e come funzionassero BG3 e altri strumenti. Dopo il confronto
ha confermato esplicitamente la 1: [I-013 e I-014](DECISIONS.md). La conferma non cambia i limiti
delle evidenze riportate sotto.

### Capacità pubblicate nelle fonti consultate

| Prodotto e fonte primaria                                                                                         | Riscontro pertinente                                                                                                                                                          | Versione e limite del confronto                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BG3 — Patch 2](https://baldursgate3.game/news/patch-2-now-live_89)                                               | Indicatore di movimento, dettagli del bersaglio e delle superfici sul cursore con controller; preview del danno da caduta quando si prepara un salto.                         | Note del 31/08/2023: documentano aiuti per valutare un'azione. Non dimostrano un piano privato conservato e ricalcolato durante i turni altrui.                                                                                     |
| [BG3 — combat & stealth](https://baldursgate3.game/news/a-little-about-combat-stealth_3)                          | Alleati consecutivi nell'ordine possono essere controllati contemporaneamente, anche in multiplayer.                                                                          | Articolo del 07/08/2020, precedente all'Early Access: fonte storica sul coordinamento, non verifica del comportamento attuale di Q009.                                                                                              |
| [Foundry — Measurement and Templates](https://foundryvtt.com/article/measurement/)                                | Misurazione del costo trascinando il token, tappe aggiungibili/rimovibili, conferma o annullamento del movimento, possibilità di nascondere la misurazione agli altri utenti. | Sezione esplicitamente riferita a V13; distingue i controlli da V12. Non dimostra un attacco pianificato che segua automaticamente un bersaglio mobile.                                                                             |
| [Crucible 0.9.0 — release ufficiale](https://github.com/foundryvtt/crucible/releases/tag/release-0.9.0)           | Per azioni con movimento si prepara un percorso entro la portata e si aggiorna il costo dell'azione. L'invio è bloccato finché il percorso non è stato confermato.            | Release etichettata V14 Alpha 1; le note descrivono V14 in User Testing al momento del rilascio. È il sistema Crucible, non una capacità D&D universale di Foundry; non si deduce lo stato di stabilità odierno. Non verifica Q009. |
| [Roll20 — Using Roll20 to play](https://help.roll20.net/hc/en-us/articles/29258224833431-10-Using-Roll20-to-play) | Misurazione di distanze e aree; tappe durante la misurazione o lo spostamento del token.                                                                                      | Guida pubblica senza build fissata; non dimostra un piano di attacco aggiornato rispetto a un nemico mobile.                                                                                                                        |
| [Owlbear — Segmentable Ruler](https://extensions.owlbear.rodeo/segmentable-ruler)                                 | Percorsi a segmenti, misure private, aggiunta/rimozione di segmenti e controlli sui permessi per muovere token.                                                               | Capacità dichiarate dall'autore di un'estensione, non attribuite al prodotto base. Versione non fissata nella pagina; non verifica Q009.                                                                                            |

### Valutazione dell'intervistatore, non decisione del prodotto

Le fonti sostengono diversi elementi della preview; non provano che l'intero comportamento
finora discusso sia «esattamente BG3». In particolare, non è stato verificato un equivalente
completo di Q009. Non trovare la funzione nelle fonti consultate non prova che nessun prodotto
o modulo la offra. Il dettaglio dei comandi e delle preview fuori turno di BG3 rimane da verificare
direttamente prima di attribuirgli quel comportamento.

La complessità aggiuntiva riguarda un piano che reagisce ai cambiamenti della scena: preservare
le tappe manuali, gestire un percorso divenuto impossibile e presentare chiaramente cosa cambia.
È un'inferenza sui comportamenti da definire, non una stima misurata di costo o prestazioni.
Per il giocatore il risultato potrebbe essere semplice: la linea e il costo si aggiornano da soli.
La sola complessità di realizzazione non basta a giudicare inutile una funzione.

La raccomandazione presentata era mantenere l'aggiornamento automatico se evita al giocatore
di riselezionare il bersaglio e ricostruire il percorso mentre aspetta. Il proprietario ha poi
confermato il valore della funzione e la libertà di cambiare strategia: I-013 e I-014.
Nessuna coda di azioni o esecuzione automatica è stata concordata; I-009–I-012 restano confermate.
La curiosità sulla complessità non ha autorizzato riduzioni dello scope.

## R002 — esplorare liberamente attacchi e bersagli

Consultazione: 13/09/2026, a seguito della risposta libera a Q011. Il proprietario chiede
fattibilità ed esempi di un'esperienza che permetta di valutare continuamente alternative,
anche durante i turni altrui. Si riutilizza R001 e si amplia il confronto pertinente.
Verifica documentale di fonti primarie; nessuna installazione o prova diretta.

| Fonte                                                                      | Capacità pertinente pubblicata                                                                                                                           | Limite                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BG3 — Patch 4](https://baldursgate3.game/news/patch-4-now-live_96)        | Le note documentano preview delle traiettorie dei proiettili e una correzione della loro corrispondenza con l'esecuzione.                                | Fonte storica del 02/11/2023. Supporta la distinzione preview/esecuzione; non prova l'intera interazione proposta o la sua disponibilità fuori turno.                                                                                 |
| [CRUX per Foundry/dnd5e](https://foundryvtt.com/packages/crux)             | Accesso rapido ad azioni, incantesimi, capacità e strumenti di bersaglio senza aprire la scheda.                                                         | Pagina dell'autore, versione elencata 2.2.5; verificata dall'autore per Foundry 14.364. Non dimostra da sola preview prive di effetti o tutti i comportamenti della nostra proposta.                                                  |
| [PF2e Combater per Foundry](https://foundryvtt.com/packages/pf2e-combater) | Il modulo documenta consultazione delle azioni, preview di movimento e portata/area quando si punta un incantesimo, preparazione ed esecuzione separate. | Dichiarazioni dell'autore, Foundry 14, Pathfinder 2e. È anche un pianificatore con funzioni ulteriori; queste non vengono adottate o attribuite al prodotto base. Nessuna prova della fluidità effettiva o dell'equivalenza completa. |

Crucible rimane un riferimento per movimento preparato dentro un'azione (R001). Le fonti
supportano componenti già realizzati di accesso alle scelte, feedback prima dell'esecuzione
e preparazione separata. Non dimostrano un unico prodotto identico alla combinazione richiesta.

**Valutazione di fattibilità dell'intervistatore:** l'esperienza è tecnicamente realizzabile
se la preview rappresenta una scelta modificabile e l'esecuzione resta distinta. Aggiornare i
calcoli è compito dell'app, senza richiedere al giocatore di gestire ricalcoli o un piano rigido.
L'estensione ai turni altrui deve usare la situazione corrente e non autorizzare esecuzioni
ordinarie fuori turno. Architettura, tempi di risposta, robustezza e dettagli del comportamento
devono essere verificati nella fase autorizzata, non promessi come già dimostrati.

La libertà continua richiesta è precisata in I-014. L'interazione concreta è proposta in OPEN;
Q012 isola il clic di conferma. Nessun requisito precedente viene ritirato e nessuna funzione
aggiuntiva dei prodotti confrontati viene approvata per deduzione.

## R003 — clic di conferma o passaggio aggiuntivo

Consultazione: 13/09/2026. In Q012 il proprietario chiede una raccomandazione fondata su prodotti
esistenti. La ricerca è documentale; nessuna prova diretta o installazione. R001/R002 rimangono
validi con i rispettivi limiti.

- [Foundry — Measurement and Templates](https://foundryvtt.com/article/measurement/): nella
  sezione V13, dopo aver preparato un percorso con CTRL e tappe, si rilascia CTRL e si clicca
  la destinazione per muovere il token; il clic destro annulla. È un precedente concreto di
  esecuzione diretta sulla scena dopo la preparazione. Riguarda il movimento, non prova un
  flusso universale degli attacchi per tutti i sistemi o moduli Foundry.
- [Solasta — Winter Update](https://www.solasta-game.com/solasta-crown-of-the-magister/news/110-solasta-winter-update-patch-notes):
  le note ufficiali del 14/12/2020 spiegano che selezionare Dash mostra l'estensione del movimento
  senza consumare subito l'azione; il movimento effettivo oltre la prima area la consuma.
  Descrivono anche una conferma con spiegazione per Dodge e Disengage contro i clic accidentali.
  Evidenza storica di conferme differenziate per azione, non verifica della build attuale.
- BG3: le note ufficiali conservate in R001/R002 sostengono la distinzione fra preview ed
  esecuzione. Non sono sufficienti per attribuire il flusso completo selezione/puntamento/clic
  a ogni azione nell'attuale versione. Le segnalazioni comunitarie emerse dalla ricerca non
  vengono usate come prova tecnica del comportamento corrente.

**Raccomandazione dell'intervistatore:** per un attacco ordinario a bersaglio singolo su desktop,
selezionare l'attacco prepara, puntare il bersaglio mostra la preview, cliccare quel bersaglio
conferma l'esecuzione. Non imporre un secondo pulsante per questo caso. La separazione tra
scelta dell'attacco e clic sul bersaglio fornisce già un confine comprensibile prima di agire;
questo è un giudizio progettuale da validare, non un risultato misurato con utenti.

Azioni prive di bersaglio, aree, bersagli multipli e touch richiedono definizioni proprie;
il consiglio non approva automaticamente un'unica interazione per tutte le funzioni.
La richiesta iniziale di una raccomandazione non confermava Q012. Dopo il confronto, il proprietario
ha approvato il clic diretto per il caso singolo su computer (I-016), chiedendo di approfondire
anche azioni senza bersaglio e attacchi a gruppo. Q013, poi confermata in I-017, usa il precedente
di Solasta per la preparazione di Scattare, senza attribuire a quella fonte la nostra economia
o tempistica delle azioni. Q014 propone una conferma esplicita per Nascondersi: il precedente
documentato riguarda Dodge e Disengage, non prova il comportamento di Hide in Solasta.

## R004 — Nascondersi: soglia, condizioni e visibilità dei tiri

Consultazione: 13/09/2026, dopo Q014. Il proprietario conferma l'interazione, indica dado digitale
visibile agli altri o fisico e chiede come stabilire la soglia, confrontando i prodotti.
Ricerca documentale e lettura delle copie ufficiali già fissate; nessuna prova in un'app o al tavolo.

### Regola della baseline conservata

Fonte normativa: SRD 5.2.1, kind `srd`, edizione 2024; voce Hide, EN p. 183, Nascondersi, IT p. 210.
Copie [EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=183)
e [IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf#page=210)
già conservate in `~/Workspace/Codex/d20-studio-experience-evidence`. Digest ricalcolati e coincidenti:

- EN: `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`.
- IT: `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.

Riscontro web: [D&D Beyond, glossario 2024 — Hide](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary#Hide).
La prova è Destrezza (Furtività), CD 15, con oscuramento pesante oppure copertura di tre quarti
o totale e fuori dalla linea di vista dei nemici. Chi vede una creatura può capire se essa lo vede.
Il totale della prova riuscita diventa la CD della prova di Saggezza (Percezione) per trovarlo.
La condizione ottenuta termina anche con rumore sopra un sussurro, un attacco, una componente
verbale o quando un nemico lo trova. Non è una garanzia di restare nascosti.

Esempio didattico, nessun personaggio reale: senza altri modificatori, con Furtività +5 serve
10 sul d20 per raggiungere 15; un totale di 18 stabilisce CD 18 per una successiva ricerca.
Non è una proposta di soglia personalizzata. Percezione passiva, sensi speciali e casi ambigui
richiedono la lettura delle voci pertinenti prima di definirne l'automazione.

Il materiale SRD è riassunto ai sensi di CC BY 4.0; attribuzione completa e provenienza in
[regole conservate](../../evidence/experience-01/rules.md#attribuzione-del-materiale-srd).
L'uso della fonte normativa non recupera scenari o mappe ritirati.

### Prodotti confrontati e limiti

- [BG3 — A little about Combat & Stealth](https://baldursgate3.game/news/a-little-about-combat-stealth_3),
  07/08/2020: Larian descrive rilevanza di coni visivi, illuminazione e scurovisione, con esiti
  differenti e prove in alcune condizioni. Fonte storica pre-release, non comportamento della
  build attuale verificato. Non fornisce una CD 2024 da importare né prova l'intera nostra preview.
- [Solasta — Winter Update](https://www.solasta-game.com/solasta-crown-of-the-magister/news/110-solasta-winter-update-patch-notes),
  14/12/2020: richiede interrompere la linea di vista prima di nascondersi; descrive rilevamento
  e prove legati a posizione/azioni. Permette di consultare i dettagli dei tiri nel registro e
  mostra la scheda di un mostro secondo il livello di conoscenza. Fonte storica Early Access;
  queste regole differiscono dalla baseline 2024 e non vengono adottate automaticamente.
- [Solasta — Dev Diary 3](https://www.solasta-game.com/solasta-crown-of-the-magister/news/10-dev-diary-3-let-there-be-light),
  2019: descrive feedback su luce e vantaggio/svantaggio al puntamento. Controevidenza temporale:
  l'aggiornamento del dicembre 2020 cambia il precedente trattamento di luce fioca e scurovisione.
  Non citare le vecchie penalità come regole correnti o come autorità per il nostro motore.
- [Foundry — Basic Dice](https://foundryvtt.com/article/dice/): distingue tiri pubblici,
  visibili a giocatore e GM, riservati al GM o personali; consente di espandere i dettagli del tiro.
  Non implica che un tiro pubblico riveli tutti i dati della scena o che tali modalità siano
  approvate per la nostra app. Non prova animazioni condivise o comportamento di uno specifico sistema.
- [Roll20 — Dice Reference](https://help.roll20.net/hc/en-us/articles/360037773133-Dice-Reference):
  documenta tiri riservati al GM e a chi tira. È un ulteriore precedente per la scelta dei
  destinatari, non una verifica dell'automazione di Nascondersi o della soglia applicata.

### Raccomandazione e domande conseguenti

Inferenza dell'intervistatore: spiegare condizioni e costo prima dell'esecuzione, rendere
comprensibile il risultato e trattare separatamente le informazioni riservate. La soglia viene
dalla regola pertinente; presentazione di CD, minimo sul dado, probabilità e dati dei nemici
resta una scelta da discutere. I-019 conferma il tiro digitale del giocatore visibile agli altri,
senza approvare una visibilità universale di ogni informazione o tiro.

Q015 isola l'impedimento evidente: allo scoperto davanti a un nemico visibile, senza eccezioni
di capacità, spiegare il problema e rendere indisponibile la conferma ordinaria senza costi o tiri.
La proposta è stata poi confermata in I-020 dopo R005. Un osservatore nascosto richiede una domanda distinta:
anche un pulsante disabilitato o un messaggio possono rivelare involontariamente informazioni.
Non risolvere tale caso scegliendo implicitamente fra rivelare segreti, consumare risorse o
chiedere l'intervento del DM. Il DM conserva la facoltà di correggere prevista da I-006.

## R005 — azione consultabile, impedimento spiegato, esecuzione bloccata

Consultazione: 13/09/2026. Dopo Q015 il proprietario esprime orientamento favorevole e chiede
nuovamente il pattern dei prodotti. R004 verificava soprattutto regole, visibilità e tiri;
questo approfondimento cerca evidenza più diretta sulla disponibilità dei comandi.
Fonti primarie documentali; nessuna prova della build attuale o verifica runtime.

- [BG3 — Patch 4](https://baldursgate3.game/news/patch-4-now-live_96), 02/11/2023: documenta
  su controller la consultazione dei gruppi di incantesimi anche quando indisponibili.
  Corregge avvisi errati sui requisiti nelle descrizioni delle pergamene e icone erroneamente
  indisponibili quando una variante è utilizzabile. Sostiene la distinzione fra consultare e
  usare, con motivazioni contestuali. Non dimostra un blocco preventivo identico per Nascondersi
  né una presentazione universale su tutti gli input. Fonte storica post-release.
- [Solasta — January Patch](https://www.solasta-game.com/solasta-crown-of-the-magister/news/113-solasta-january-patch-patch-notes),
  13/01/2021: il lancio richiede i componenti previsti dalle impostazioni; il silenzio impedisce
  incantesimi verbali e le aree non possono essere lanciate oltre la gittata massima.
  Sostiene il controllo dei prerequisiti, ma non documenta per questi casi posizione, testo e
  comportamento esatto del comando indisponibile. Early Access, regole non importate nel 2024.
- [Crucible 0.9.0 per Foundry](https://github.com/foundryvtt/crucible/releases/tag/release-0.9.0),
  release V14 Alpha 1: la preparazione resta disponibile mentre l'invio dell'azione è bloccato
  finché il percorso o l'area richiesti non sono definiti; i percorsi rispettano il limite di
  gittata e il costo mostrato segue la scelta. È un sistema specifico, non una capacità
  verificata di ogni sistema Foundry o di dnd5e, e non riguarda direttamente Nascondersi.

**Sintesi dell'intervistatore:** mantenere accessibile la spiegazione di una scelta, mostrare
il requisito mancante e autorizzare l'esecuzione quando quel requisito è soddisfatto. I precedenti
sostengono parti complementari del pattern; non dimostrano che tutti i concorrenti abbiano lo
stesso comportamento, né che un blocco sia sempre preferibile per ogni azione del prodotto.

**Applicazione proposta a Q015:** il giocatore allo scoperto davanti a un nemico visibile può
consultare Nascondersi, leggere l'impedimento e scegliere come risolverlo. La conferma ordinaria
rimane indisponibile, senza tiro o costo. Il dettaglio senza consumo è la nostra proposta sul
confine fra preparazione ed esecuzione, non una misura verificata nei tre concorrenti.

Non applicare questo ragionamento automaticamente a un osservatore nascosto, a una scelta
valida ma rischiosa o a un'interruzione dopo la conferma. Questi casi restano nel seguito
dell'intervista. Dopo il confronto, il proprietario ha confermato Q015 con «vai cosi allora»:
decisione I-020. Il caso degli osservatori nascosti rimane aperto.

## R006 — preparare movimento e Nascondersi insieme

Consultazione: 13/09/2026, preparazione di Q016 dopo la conferma di Q015. Riutilizzati e
ricontrollati i passaggi pertinenti di R001/R003/R005; nessuna nuova prova runtime.

- [Crucible 0.9.0](https://github.com/foundryvtt/crucible/releases/tag/release-0.9.0) documenta
  preparazione del movimento dentro l'uso delle azioni che lo prevedono, limiti del percorso
  e costo aggiornato. Sostiene il pattern della valutazione congiunta, non dimostra un comando
  specifico per muoversi e nascondersi. Sistema distinto da dnd5e, release V14 Alpha 1.
- [Solasta — Winter Update](https://www.solasta-game.com/solasta-crown-of-the-magister/news/110-solasta-winter-update-patch-notes)
  documenta la necessità di interrompere la linea di vista prima di nascondersi. Fonte storica
  del 14/12/2020, non prova di una preview combinata o di una conferma unica per movimento e Hide.

**Raccomandazione iniziale, poi approvata in I-021:** offrire una preview congiunta verso una copertura
scelta dal giocatore, mostrando movimento e azione prima della conferma della sequenza.
Il beneficio è poter valutare la scelta prima di spendere movimento, già richiesto per gli
attacchi in I-009. L'estensione a Nascondersi è proposta in Q016, senza precedente esatto verificato.
Gesti specifici e interruzioni non sono risolti dalla sola disponibilità della sequenza.

### Verifica dopo la conferma condizionata a Q016

Il 13/09/2026 il proprietario risponde: «Si, se vedi che altri prodotti lo adottano allora okay».
L'intervistatore ha interpretato la condizione come esigenza di un precedente identico.
Il proprietario ha poi corretto questa interpretazione: il pattern generale di Crucible è sufficiente.

La ricerca mirata su movimento più Hide, preview e conferma unica non ha fornito un riscontro
primario sufficiente per l'intera sequenza nei riferimenti consultati. L'assenza di un risultato
non dimostra l'assenza della funzione sul mercato. Nessuna prova runtime eseguita.

- Crucible 0.9.0 rimane evidenza per azioni che comprendono movimento; le note non documentano
  l'esatto caso proposto di movimento fino a copertura e successivo Nascondersi con una conferma.
- [PF2e Combater](https://foundryvtt.com/packages/pf2e-combater), descrizione dell'autore consultata
  il 13/09/2026, Foundry 14 / Pathfinder 2e: documenta piani di turno eseguiti per passi,
  preview del movimento e combinazioni Stride–Strike. La descrizione non verifica il caso
  Stride–Hide con la nostra preview e una conferma unica. Non dedurre il supporto dal richiamo
  generale alle azioni di abilità e non adottare il suo intero pianificatore.
- Le note Solasta già consultate stabiliscono che la linea di vista va interrotta prima
  di nascondersi; non documentano il comando combinato. La ricerca relativa a BG3 non ha
  aggiunto una prova primaria sufficiente. Segnalazioni comunitarie e giochi non pertinenti
  emersi dalla ricerca non sono stati usati per soddisfare artificialmente la condizione.

**Esito documentale:** l'esatta combinazione non è verificata. Questo non è un blocco alla
scelta del prodotto: il proprietario ha approvato esplicitamente l'adattamento del pattern
generale in I-021. Conservare il limite della fonte senza convertirlo in un requisito di replica.

**Raccomandazione intermedia, ritirata:** confermare il movimento, quindi valutare e confermare
Nascondersi dalla posizione raggiunta, secondo i comportamenti già concordati per il tentativo.
Il beneficio è valutare la situazione dopo lo spostamento e mantenere la libertà di scegliere.
Questa alternativa non è stata adottata; il proprietario conferma la sequenza combinata.

**Chiarimento definitivo Q016:** confrontare sistematicamente i prodotti e adattarne i pattern
con giudizio è cruciale; non serve una funzione identica per ogni caso. I-005 precisa il metodo,
I-021 conferma movimento e Nascondersi insieme. Non riaprire la scelta per la sola assenza di
un duplicato perfetto sul mercato, né attribuire al concorrente l'adattamento della nostra app.

## R007 — chiedere una reazione facoltativa nel momento pertinente

Consultazione: 13/09/2026, preparazione di Q017. Fonti primarie documentali; nessuna prova runtime.

- [BG3 — Patch 2](https://baldursgate3.game/news/patch-2-now-live_89), 31/08/2023: documenta
  la modalità Ask delle reazioni, modificabile quando la reazione è abilitata, e reazioni
  disattivate ancora consultabili. Sostiene la scelta fra disponibilità e richiesta al giocatore;
  non stabilisce da sola il default di tutte le capacità nella build corrente.
- [BG3 — Patch 5](https://baldursgate3.game/news/patch-5-now-live_99), 30/11/2023: documenta
  una finestra con reazioni possibili per più personaggi e la possibilità di cambiare scelta
  dopo averne selezionata una. È un precedente per decidere nel contesto, non approvazione
  delle nostre priorità fra più partecipanti o di un'identica finestra grafica.
- [Solasta — January Patch](https://www.solasta-game.com/solasta-crown-of-the-magister/news/113-solasta-january-patch-patch-notes),
  13/01/2021: perdita di concentrazione durante un volo, per esempio per un attacco di opportunità,
  produce subito la caduta invece di far raggiungere la destinazione. Riferimento conservato
  per il seguito sulle interruzioni: una sequenza deve rispettare le conseguenze sopraggiunte.
  Non dimostra una pausa volontaria dopo ogni danno; fonte storica, non regola 2024 importata.

Regola dell'esempio: Scudo e tempistica delle reazioni sono già verificate nelle fonti SRD
5.2.1 EN pp. 10, 161–162 e IT pp. 11, 186, con revisioni fissate in
[regole conservate](../../evidence/experience-01/rules.md). Offrire o rifiutare una reazione non
la spende. L'esempio assume un lancio consentito con reazione e slot disponibili; la possibilità
di usarlo sul colpo innescante non implica che debba rivelare tutti i dettagli del tiro nemico.

**Raccomandazione:** per la reazione facoltativa del giocatore, default con richiesta nel momento
pertinente, mostrando evento, costo ed effetto e consentendo uso o rinuncia. Il pattern Ask
viene adattato alla nostra sequenza movimento–Nascondersi secondo I-005. Confermata in Q017, I-022.
Automazione configurabile, dati visibili, più reazioni, scadenze e ripresa della sequenza restano aperti.

## R008 — riprendere un movimento già confermato dopo una reazione

Consultazione: 13/09/2026, preparazione di Q018 dopo la conferma di Q017. Fonti primarie
documentali; nessuna prova diretta delle interfacce o del loro comportamento corrente.

- [Foundry — Year in Review: Five-Year Anniversary Edition](https://foundryvtt.com/article/year-in-review-2025/),
  bilancio 2025, sezione Token Measurement and Movement dedicata a V13: il sistema di movimento
  supporta percorsi con più tappe che possono essere fermati, sospesi e ripresi. Documenta anche
  interventi automatici collegati alle regioni attraversate. È una capacità pubblicata, non una
  verifica che il sistema D&D riprenda automaticamente proprio movimento e Nascondersi dopo Scudo.
- R007 conserva il precedente BG3 per scegliere una reazione nel contesto e quello Solasta
  per interrompere subito un movimento quando un effetto ne impedisce la prosecuzione.
  Questi riferimenti sostengono parti del comportamento; non stabiliscono da soli il nostro default.

**Adattamento confermato in Q018, I-023:** se Scudo evita il colpo e percorso e tentativo
rimangono validi, riprendere la sequenza già confermata senza chiedere un ulteriore via libera.
Il beneficio è conservare la fluidità dopo una scelta esplicita del giocatore. Q018 riguarda
questo caso circoscritto; non approva cambi automatici di percorso, bersaglio o strategia,
né proseguimento attraverso impedimenti o nuove scelte necessarie. Danno subito, nuove minacce,
interruzione volontaria e rimborso dei costi restano temi distinti da approfondire.

Precisazione alla risposta Q018: «soprattutto se anche foundry fa così» non è una nuova evidenza
del comportamento del concorrente. Comunicato che la fonte documenta sospensione e ripresa,
mentre il default per Scudo resta il nostro adattamento; mantenuto il metodo I-005.

## R009 — rivalutare una mossa dopo aver subito danni

Consultazione: 13/09/2026, preparazione di Q019. Ricerca documentale, nessuna prova runtime.

- [Persistent Zones — scheda pubblicata dall'autore su Foundry](https://foundryvtt.com/packages/persistent-zones),
  versione elencata 0.2.0, Foundry 13+ verificato 13, sistema D&D5e: supporta zone persistenti
  con effetti, inclusi danni, attivati da ingresso, uscita e movimento. Documenta inoltre
  interruzioni del movimento secondo impostazioni globali. È un modulo aggiuntivo, non il
  comportamento universale di Foundry. Sostiene il pattern di fermare l'esecuzione in seguito
  a un evento, non prova un invito a riconsiderare la strategia dopo ogni attacco di opportunità.
- Foundry V13 in R008 documenta la possibilità di conservare e riprendere percorsi sospesi.
- Solasta in R007 documenta un arresto legato a un effetto che impedisce di proseguire, come
  perdere il volo. È un caso diverso dal danno senza impedimento e non risolve Q019.
- Le ricerche mirate nelle note BG3 e Solasta non hanno fornito una fonte primaria sufficiente
  per attribuire loro l'esatto default qui raccomandato. Non dedurlo da segnalazioni storiche
  di bug o da guide non verificate.

**Raccomandazione confermata in Q019, I-024:** dopo un attacco di opportunità che infligge danni durante la
sequenza, sospendere il seguito per lasciare al giocatore la scelta di riprendere o cambiare
mossa. Conservare la parte non eseguita, senza obbligare a prepararla da zero; danni e movimento
già effettuato rimangono. È una scelta d'interazione proposta, non una regola che azzera la velocità.
Motivo: un esito effettivo può cambiare la strategia desiderata anche quando la mossa resta legale.
Costo: una decisione aggiuntiva dopo il colpo; la continuazione automatica sarebbe più rapida.
Q019 usa questo caso circoscritto. Non stabilisce soglie di gravità, pause per ogni fonte di danno,
gestione di reazioni ulteriori, effetti che rendono la mossa impossibile o tempistiche di costo
di azioni ancora non eseguite. Il loro approfondimento rimane nell'intervista.

## R010 — costo dell'azione ancora da eseguire in una sequenza

Consultazione: 13/09/2026, preparazione di Q020. Fonti primarie documentali e baseline normativa
già conservata. Nessuna prova runtime dei prodotti.

- [BG3 — Patch 6](https://baldursgate3.game/news/patch-6-now-live_108), sezione Gameplay:
  Larian documenta la correzione di alcuni lanci che consumavano l'azione prima di lanciare
  effettivamente qualcosa. È un precedente concreto contro l'addebito prematuro della risorsa.
  La nota non definisce il momento di consumo di tutte le capacità né il caso movimento–Nascondersi.
- Solasta Winter Update, già in R003, distingue selezione informativa di Scattare e momento
  in cui il movimento ne richiede il costo. Sostiene la distinzione fra preparazione e uso;
  non sostituisce I-017, dove il proprietario ha già concordato quando si spende Scattare.
- [SRD 5.2.1 EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf),
  sezioni Your Turn, Movement and Position, Breaking Up Your Move e Hide [Action]: movimento
  e azione sono distinti; il movimento può essere suddiviso prima e dopo un'azione e le distanze
  percorse sono sottratte dalla disponibilità. Nascondersi è il tentativo mediante prova;
  riuscire nella prova è una condizione per ottenere il beneficio, non per aver usato l'azione.
  Riletta la copia EN già fissata nelle [regole conservate](../../evidence/experience-01/rules.md);
  nessuna nuova revisione normativa o regola dei videogiochi importata.

**Adattamento confermato in Q020, I-025:** nella sequenza movimento → Nascondersi, consumare
l'azione al lancio effettivo dei dadi, precisazione del proprietario all'avvio del tentativo
dopo l'avvicinamento; se il giocatore abbandona la sequenza
durante la pausa precedente, l'azione è ancora disponibile per un'altra scelta consentita.
Esempio senza terreno difficile o altre modifiche: 3 metri percorsi su 9 lasciano 6 metri;
rinunciare a Nascondersi prima del tentativo permette ancora un attacco valido con l'azione.
I danni rimangono secondo I-024. Un tentativo fallito resta un'azione usata.

Q020 non approva un rimborso di azioni già iniziate, slot o reazioni usati, né un'unica regola
di costo per tutte le capacità. Scattare già eseguito, incantesimi interrotti e relative regole,
segreti, prove fisiche e tempistiche di sincronizzazione richiedono il proprio approfondimento.

## R011 — inserire i valori dei dadi fisici mantenendo i calcoli automatici

Consultazione: 13/09/2026, preparazione di Q021. Fonti primarie documentali; nessuna prova runtime.

- [Foundry — Advanced Dice](https://foundryvtt.com/article/dice-advanced/), sezione Fulfilled Rolls:
  da V12 è documentata la scelta fra generazione digitale, input manuale e servizi esterni per
  i dadi. La stessa documentazione descrive formule che applicano i dati del personaggio.
  Il supporto manuale è una capacità del prodotto; la pagina non dettaglia il nostro percorso
  Nascondersi, il consumo dell'azione o le modalità di annullamento.
- [Physical Dice Rolls — scheda dell'autore](https://foundryvtt.com/packages/physical-dice-rolls),
  versione elencata 1.2.2, Foundry 11+ verificato 14: in modalità manuale, una richiesta di tiro
  apre una finestra in cui si inseriscono i risultati sulle facce dei dadi e si conferma.
  È un modulo aggiuntivo che fornisce un precedente esplicito per l'input dei singoli valori.
  La scheda descrive anche generazione automatica per campi lasciati vuoti e scorciatoie:
  questi comportamenti non sono adottati implicitamente nel nostro prodotto.

**Raccomandazione confermata in Q021, I-026:** per il primo caso di Nascondersi con un solo d20 fisico,
il giocatore inserisce il numero uscito sul dado; l'app applica il modificatore noto e mostra
il calcolo. Esempio: 12 sul dado, modificatore totale +5, risultato 17. Il vantaggio è mantenere
il gesto fisico e i calcoli automatici, evitando di applicare due volte i modificatori.
La possibilità alternativa di inserire direttamente un totale non è ancora concordata.

I-025 fissa il costo al lancio effettivo. Con dadi ordinari e senza un dispositivo di lettura,
l'app dipende dall'input del giocatore per registrare ciò che è avvenuto: Q021 affronta prima
il contenuto di quell'input. Comandi di avvio, attesa del risultato, annullamento prima/dopo il
lancio, correzioni, rete, tiri multipli e modificatori dipendenti da scelte successive rimangono
aperti. Nessun sensore, riconoscimento via fotocamera o nuovo acquisto è stato proposto o approvato.

La risposta a Q021 ribadisce il principio trasversale I-027: automatizzare al massimo rendendolo
visibile al giocatore. Le prossime ricerche sostengono decisioni reali, evitando di trasformare
calcoli già determinati dalle regole in nuove domande di approvazione.

## R012 — correggere un esito già registrato con una traccia leggibile

Consultazione: 13/09/2026, preparazione di Q022. Fonte primaria documentale; nessuna prova runtime.

- [Damage Log — scheda dell'autore su Foundry](https://foundryvtt.com/packages/damage-log),
  versione elencata 1.33.0, Foundry 10+ verificato 14, compatibile anche con D&D5e: registra
  modifiche ai punti ferita in chat e permette di annullarle o riapplicarle dal messaggio.
  Documenta visibilità configurabile dal GM e distingue informazioni complete da limitate.
  È un modulo aggiuntivo. Il precedente riguarda correzione e registrazione di conseguenze;
  non prova la correzione di un d20 fisico da parte del giocatore né la nostra politica di permessi.
- R011 conserva l'inserimento dei risultati fisici; I-006 conserva la facoltà del DM di correggere.
  Sono basi pertinenti, non risposte già date sui permessi di correzione del giocatore.

**Adattamento confermato e ampliato in Q022, I-028:** permettere al giocatore di correggere un
proprio risultato fisico già registrato. Nel caso immediato discusso, conservare nel registro
valore originario, nuovo valore e autore della modifica, visibili al tavolo per questo tiro.
Ricalcolare totale ed esito sullo stesso tentativo, senza nuovo tiro o un secondo consumo
dell'azione. Esempio: registrato 2 al posto di 12, modificatore +5, totale corretto da 7 a 17.
Il requisito normativo del tentativo rimane quello verificato in R004; niente nuovo tiro.

Il proprietario amplia la proposta: la libertà di correggere i propri errori deve rimanere sempre.
Il limite prima di altre azioni non viene adottato come scadenza. Esiti con conseguenze dipendenti,
dati riservati e regole della campagna restano da approfondire. La correzione del DM resta possibile.

## R013 — correzioni che coinvolgono conseguenze successive

Consultazione: 13/09/2026, preparazione di Q023. Fonti primarie documentali; nessuna prova runtime.

- [Fantasy Grounds Forge — 5e Undo Last Damage/Heal](https://forge.fantasygrounds.com/shop/items/719/view),
  estensione dell'autore Stv, UUID 46f2dfea-0b2a-11ed-8c52-0050562be458; la scheda consultata non
  espone una versione: annulla l'ultimo danno o cura su un personaggio e ripristina anche stati
  ed effetti, inclusi quelli rimossi sul personaggio o sui suoi bersagli per concentrazione persa
  a seguito del danno. È un precedente per considerare effetti collegati, non solo il numero
  dei punti ferita. Non documenta una ricostruzione arbitraria di tutte le azioni successive.
- [Crucible 0.9.0](https://github.com/foundryvtt/crucible/releases/tag/release-0.9.0), già in R001:
  le azioni con movimento pianificato possono essere annullate ripristinando la cronologia
  precedente del movimento durante il combattimento. È il sistema Crucible su Foundry, non il
  sistema D&D5e; la nota non prova un annullamento selettivo di tutte le dipendenze successive.
- R012 conserva Damage Log e i suoi comandi di annullamento/riapplicazione. Nessuna di queste
  fonti stabilisce da sola la nostra autorità di correzione dopo scelte compiute da altre persone.

**Raccomandazione da discutere:** la correzione del proprio dato resta accessibile secondo I-028.
Quando può cambiare azioni già svolte dagli altri, l'app ricostruisce gli effetti determinabili
e segnala al DM i passaggi da riesaminare; il DM decide come sistemare quelle conseguenze.
L'app aiuta nei calcoli e nelle modifiche concordate, secondo I-027. La scelta aperta riguarda
l'autorità sulle decisioni condivise, non il permesso di correggere il proprio numero.

Esempio: un valore errato fa risultare fallito Nascondersi; nel frattempo un nemico attacca
il personaggio e un compagno lo cura. Correggere la prova può modificare lo stato pertinente
all'attacco e le decisioni prese dopo. Non presumere che Nascondersi riuscito impedisca ogni
attacco o renda automaticamente illegittima una cura: il caso richiede verifiche contestuali.
Q023 non fissa un riavvolgimento generale, una pausa universale del tavolo, la politica sui dadi
già tirati o l'approvazione preventiva di tutte le correzioni. Questi dettagli restano aperti.

La risposta del proprietario a Q023 richiede un approfondimento prima di scegliere: questa
raccomandazione non è stata approvata. R014 integra l'evidenza su meccanismi e autorità e sostiene
la proposta più concreta conservata in OPEN.

## R014 — correzione locale, annullamento in ordine e autorità del DM

Consultazione: 13/09/2026. Origine: il proprietario non sa scegliere sulla Q023 iniziale e
richiede indagine dei concorrenti, pattern e consiglio, ribadendo che è il metodo atteso per
i casi complessi. Nessuna conferma di Q023 all'avvio della ricerca; la risposta successiva
accetta la raccomandazione e registra I-029. Verificati documentazione primaria e
codice pubblico; nessuna prova diretta nei prodotti o con un tavolo.

### Riscontri verificati

| Riferimento                                                                                                                                                                                                                                   | Comportamento documentato o letto nel codice                                                                                                                                                                                                                                                                                                                                                    | Limiti pertinenti                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Midi-QOL — catalogo Foundry](https://foundryvtt.com/packages/midi-qol), versione 14.0.12; [interfaccia di annullamento](https://gitlab.com/tposney/midi-qol/-/blob/2b10fec5d4062e4f8d1643ab78c65de4b3ac8ee8/src/module/apps/UndoWorkflow.ts) | Il GM apre l'elenco delle operazioni registrate con attore, azione, autore e bersagli. Può annullare la più recente o rimuoverla dalla lista senza annullarla. La funzione che apre l'interfaccia controlla `game.user.isGM`.                                                                                                                                                                   | Modulo di automazione D&D5e, distinto da Foundry base e dal sistema D&D5e. Il controllo letto prova l'accesso GM a questa interfaccia; non è un audit completo di ogni API o permesso del modulo.                                                                                                      |
| [Midi-QOL — meccanismo di annullamento](https://gitlab.com/tposney/midi-qol/-/blob/2b10fec5d4062e4f8d1643ab78c65de4b3ac8ee8/src/module/undo.ts)                                                                                               | Conserva fino a 15 operazioni, ordinate dalla più recente. L'annullamento dell'ultima include le reazioni recenti contrassegnate e la successiva operazione principale. La funzione per tornare a una certa operazione annulla prima quelle più recenti. Ripristina i dati catturati di attori, token, oggetti ed effetti e tratta sagome ed elementi della chat.                               | Ripristino di uno stato precedente, non correzione selettiva di un vecchio numero lasciando automaticamente coerenti tutte le azioni intermedie. Copertura limitata ai dati catturati; non prova il recupero di ogni cambiamento del mondo. Il limite di 15 è del concorrente, non adottato per l'app. |
| [Midi-QOL — changelog, sezione storica 11.3.18](https://gitlab.com/tposney/midi-qol/-/blob/2b10fec5d4062e4f8d1643ab78c65de4b3ac8ee8/Changelog.md)                                                                                             | Spiega che ripristinare gli attori coinvolti può annullare anche modifiche manuali successive, come punti ferita o oggetti aggiunti. Consiglia di tornare indietro fino al punto da correggere e poi effettuare modifiche o nuovi tiri. Rimuovere una voce dalla lista senza annullarla non protegge necessariamente i suoi effetti dal ripristino di una voce più vecchia sugli stessi attori. | Documentazione storica: la semantica centrale è corroborata dal codice 14.0.12 letto; non attribuire ogni dettaglio storico alla versione attuale senza verifica. Il changelog registra anche correzioni di bug del ripristino: non è una garanzia di completezza.                                     |
| [Fantasy Grounds — 5e Undo Last Damage/Heal](https://forge.fantasygrounds.com/shop/items/719/view), autore Stv, già in R013                                                                                                                   | Ripristina l'ultimo danno/cura di un personaggio e valori collegati, inclusi punti ferita temporanei, ferite, tiri contro la morte, stato ed effetti; comprende effetti rimossi per perdita di concentrazione, anche sui bersagli.                                                                                                                                                              | Estensione, non funzione universale del prodotto base. Versione non esposta nella scheda. Non documenta la ricostruzione di scelte autonome successive o un annullamento arbitrario di tutta la cronologia.                                                                                            |
| [Roll20 — Right-Click Menu](https://help.roll20.net/hc/en-us/articles/35999226799127-Right-Click-Menu), pagina datata 30/10/2025                                                                                                              | Annulla e ripete operazioni sul tavolo, come movimento, disegno e cancellazione, nell'ordine in cui sono state eseguite.                                                                                                                                                                                                                                                                        | Il contesto è la modifica della scena. Non dimostra che annullare uno spostamento ripristini anche tutte le regole, i tiri e le risorse D&D dipendenti.                                                                                                                                                |
| [Owlbear Rodeo — Scene History API](https://docs.owlbear.rodeo/extensions/apis/scene/history/)                                                                                                                                                | Espone annullamento dell'azione precedente, ripetizione e verifica della disponibilità nella cronologia della scena.                                                                                                                                                                                                                                                                            | Documentazione dell'API, senza build fissata; non prova autorità del DM, copertura delle estensioni o ripristino completo di un combattimento D&D.                                                                                                                                                     |

### Identificazione delle fonti di codice e accesso

Repository pubblico dell'autore Tim Posney, `tposney/midi-qol`. La revisione V14 verificata è
`2b10fec5d4062e4f8d1643ab78c65de4b3ac8ee8`, titolo `14.0.12 + pt-br`, datata
09/09/2026 nell'API GitLab. Il catalogo Foundry consultato elenca 14.0.12 per Foundry 14–14.999,
verificata 14.357. In `UndoWorkflow.ts`, righe 59–63 e 78–83, sono visibili i comandi e il controllo
sull'apertura per GM. In `undo.ts`, righe 246–304 e 376–492, sono visibili ordinamento, ritorno
all'operazione e ripristino. I link sono fissati alla revisione, non al ramo mobile.

Riscontrata anche la revisione V13 `6b10be53c140aea013f7ca130c35abf3e2c81e44`, titolo `13.0.65`,
del 02/09/2026, con lo stesso nucleo di annullamento. È distinta dall'ultima voce 13.0.64
elencata nel catalogo consultato; non confondere revisione del repository e release distribuita.
Le pagine HTML GitLab non esponevano il sorgente al lettore web: letti API e file pubblici raw
in memoria, senza installare o eseguire il modulo. Un tentativo di aprire un repository Codeberg
per Damage Log non ha restituito contenuto accessibile: nessuna deduzione dal suo codice.

È stata consultata anche [BG3 — Patch 5](https://baldursgate3.game/news/patch-5-now-live_99):
documenta il mantenimento del risultato caricando un salvataggio effettuato sulla schermata
dell'esito del tiro. Non chiarisce la correzione selettiva di un valore fisico in un VTT;
non viene usata per attribuire a BG3 il comportamento raccomandato. Nessuna prova pertinente
aggiuntiva su Solasta o Beyond in questo approfondimento; assenza di riscontro non significa
assenza della funzione. Nessuna opinione comunitaria usata come prova del comportamento.

### Pattern e raccomandazione — sintesi dell'intervistatore, poi accettata in I-029

I precedenti verificati distinguono operazioni con effetti collegati e cronologie da percorrere
all'indietro. Il GM ha controllo esplicito sull'interfaccia di ripristino complesso di Midi-QOL.
Non è dimostrata una soluzione che corregga arbitrariamente un vecchio tiro, ricostruisca in modo
selettivo tutte le dipendenze e indovini le nuove scelte delle persone lasciando intatto il resto.
Il rischio di sovrascrivere modifiche successive è descritto concretamente da Midi-QOL.

Raccomandazione per l'app: mantenere la correzione autonoma già confermata in I-028; quando il
gioco è proseguito, sistemare normalmente la situazione attuale con aiuto automatico e intervento
del DM sulle conseguenze condivise controverse. Offrire inoltre al DM un riavvolgimento esplicito
con elenco preventivo dei passaggi e degli effetti da annullare, per i casi in cui serve ripartire.
L'automazione deve applicare i calcoli e il ripristino coperto, non pretendere che il DM ricostruisca
tutto a mano. La cronologia deve conservare la correzione e l'eventuale ripristino.

Questo default è una sintesi progettuale per preservare il gioco già svolto, non una politica
identica osservata in tutti i concorrenti. Anche il riepilogo preventivo è una proposta dell'app;
l'elenco Midi-QOL mostra operazioni ma non prova una preview completa delle dipendenze come quella
qui consigliata. Copertura, consenso, dadi già noti, informazioni rivelate, concorrenza e recupero
senza rete richiedono dettagli successivi. Q023 in OPEN conserva la domanda e la conferma ricevuta
il 13/09/2026: «Eh si, ci sta. Se questo è il pattern che emerge dagli altri prodotti allora si».
Registrata I-029 senza modificare i limiti del confronto. La domanda corrente passa a Q024.

## R015 — pausa esplicita e prosecuzione durante una correzione da valutare

Consultazione: 13/09/2026, preparazione di Q024 dopo la conferma di I-029. Fonti primarie
documentali; nessuna prova runtime. La domanda riguarda l'attesa della decisione sulle conseguenze,
non l'intervallo in cui si applica un riavvolgimento.

- [Foundry — Game Controls](https://foundryvtt.com/article/controls/), aggiornato il 20/10/2025,
  versione 13.350: documenta il comando esplicito per attivare/disattivare la pausa, con barra
  spaziatrice come scorciatoia predefinita. Il [tutorial GM](https://foundryvtt.com/article/tutorial/)
  spiega che durante la pausa i giocatori non possono muovere token né manipolare porte e
  vedono un indicatore. Non documenta qui un blocco di tutte le schede, dei dadi o delle chat.
- [Foundry — API V12, Game.togglePause](https://foundryvtt.com/api/v12/classes/client.Game.html#togglePause):
  documenta che trasmettere il cambiamento di pausa agli altri client richiede un GM. È una
  fonte di versione precedente, distinta dalla guida 13.350. Un tentativo di aprire l'URL
  corrispondente V14 non ha restituito documentazione accessibile; non è una verifica dell'API V14.
- [Owlbear — Short Rest!](https://extensions.owlbear.rodeo/shortrest), estensione di Battle-System,
  versione non indicata nella scheda: documenta una pausa che lascia al GM il controllo di
  strumenti e token, un messaggio di pausa e persistenza dichiarata anche dopo un aggiornamento
  del client. È una capacità dell'estensione, non attribuita a Owlbear base. Funzioni aggiuntive
  come oscuramento, timer e minigioco non vengono proposte per deduzione.

**Pattern pertinente:** esiste un comando esplicito per limitare le interazioni del tavolo,
con indicazione visibile della pausa. Queste fonti non stabiliscono che un tiro corretto metta
automaticamente in pausa il combattimento, né documentano un percorso identico alla nostra
valutazione delle conseguenze. Non trovare quel collegamento non prova che nessun modulo lo offra.

**Raccomandazione da discutere:** la sola presenza di una correzione da valutare non ferma
automaticamente tutto il combattimento. L'app segnala la correzione al DM e distingue nel registro
il valore corretto dalle conseguenze ancora da sistemare; il DM può mettere esplicitamente
in pausa quando serve. Esempio: una compagna può continuare il suo turno contro un altro nemico
mentre il DM esamina la precedente sequenza attacco/cura interessata dall'errore.

È un adattamento per la fluidità coerente con I-029, non una politica identica verificata
nei concorrenti. Il costo è che possono aggiungersi azioni prima della decisione del DM;
il riepilogo di un eventuale ripristino deve tenerne conto. L'alternativa della pausa automatica
mantiene la situazione ferma ma impone un'attesa anche alle azioni non coinvolte. Q024 lascia
aperti azioni dipendenti dal dato contestato, stato condiviso, applicazione del ripristino,
permessi durante la pausa, informazioni riservate e perdita di rete. Dopo questa proposta il
proprietario ha richiesto il precedente sulla consultazione stessa, accettando Q024 se verificato.
R016 colma quel limite e sostiene I-030; R015 da sola non provava la corrispondenza richiesta.

## R016 — il pannello di correzione non attiva la pausa in Midi-QOL

Consultazione: 13/09/2026, dopo il richiamo di metodo e l'accettazione condizionata di Q024.
Ripresa mirata delle fonti R014, con lettura del percorso di apertura, aggiornamento e chiusura
del pannello, non soltanto ricerca della parola pausa nella documentazione generale.

- Prodotto: Midi-QOL 14.0.12 per Foundry, revisione
  `2b10fec5d4062e4f8d1643ab78c65de4b3ac8ee8`, già identificata in R014.
- [UndoWorkflow.ts](https://gitlab.com/tposney/midi-qol/-/blob/2b10fec5d4062e4f8d1643ab78c65de4b3ac8ee8/src/module/apps/UndoWorkflow.ts),
  letto integralmente, 84 righe: `showUndoWorkflowApp` apre l'applicazione al GM; costruttore,
  preparazione del contesto, rendering e chiusura non attivano la pausa del gioco. Il pannello
  usa ApplicationV2; le sottoscrizioni alle operazioni aggiunte e rimosse ne aggiornano l'elenco.
  Non imposta un'attesa di autorizzazione che congeli tutte le altre operazioni.
- [undo.ts](https://gitlab.com/tposney/midi-qol/-/blob/2b10fec5d4062e4f8d1643ab78c65de4b3ac8ee8/src/module/undo.ts),
  492 righe, già letto in R014 e ricontrollato nei percorsi pertinenti: registra nuove operazioni
  e notifica l'aggiornamento dell'elenco. Consultare quel registro è distinto dal comando di
  ripristino. Non viene aggiunta una pausa automatica in questi percorsi.
- Il comando esplicito di pausa di Foundry e la sua distinzione dall'undo sono documentati
  nelle fonti R015. Short Rest! rimane un precedente per la pausa, non per la consultazione
  di una correzione: non usarlo come prova sostitutiva di quest'ultima.

**Corrispondenza:** un DM può aprire ed esaminare le operazioni registrate senza che quel gesto
metta automaticamente in pausa la sessione; l'elenco può continuare a ricevere operazioni.
Questo è il comportamento pertinente a Q024. Non è dimostrata una richiesta di correzione
identica alla nostra, ma la scelta fra consultazione non bloccante e pausa globale è riscontrata
nel percorso effettivo di un prodotto. Nessuna prova runtime; altri moduli o personalizzazioni
non sono stati esaminati e non vengono coperti dall'affermazione.

**Esito:** seguire il precedente verificato: valutare la correzione non ferma automaticamente
il tavolo; il DM può usare la pausa esplicita. Il proprietario aveva autorizzato questo esito
se presente negli altri prodotti, quindi registrata I-030 senza ripetere Q024. Segnalazioni,
stato in attesa, nuove azioni sui dati contestati e applicazione del ripristino restano aperti.

## R017 — tiro digitale segreto al giocatore che lo effettua

Consultazione: 13/09/2026, preparazione di Q025. Approfondisce la visibilità già censita in R004;
proposta successivamente confermata con «Sisi ci sta», registrata I-031. Fonti primarie, senza prova runtime.

| Prodotto e fonte                                                                                                        | Comportamento verificato                                                                                                                                                                                                                                                     | Corrispondenza e limite                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Roll20 — Dice Reference](https://help.roll20.net/hc/en-us/articles/360037773133-Dice-Reference), aggiornata 13/08/2026 | La modalità Secret Roll mostra il risultato solo al GM; chi ha tirato riceve conferma dell'invio, senza il numero. La guida indica Percezione e Furtività come esempi. Distingue GM Roll, visibile anche all'autore, e Super-Secret Roll, senza neppure conferma all'autore. | Precedente diretto per «esegui il tiro e sai che è stato inviato, ma non conosci il risultato». Non importare Super-Secret o un default segreto per tutte le prove. La pagina aperta completa contiene dettagli assenti dall'estratto del motore di ricerca: prevale il testo consultato. |
| [Foundry — Basic Dice](https://foundryvtt.com/article/dice/), guida corrente senza build fissata                        | Blind Roll è visibile soltanto ai GM; il giocatore che effettua il tiro non vede il risultato. Solo un GM può rivelarlo. GM Roll, distinto, mostra il risultato anche al giocatore che tira.                                                                                 | Conferma il confine fra segreto agli altri e segreto anche all'autore. Non prova l'animazione, un flusso automatico di richiesta del DM o la medesima conferma di invio di Roll20.                                                                                                        |
| [D&D Beyond — Keep your rolls secret!](https://www.dndbeyond.com/old-changelog/1013-keep-your-rolls-secret), 02/06/2021 | Documenta scelta del destinatario predefinito e per singolo tiro: tutti, se stessi, oppure autore e DM.                                                                                                                                                                      | Precedente storico per la scelta della visibilità, non prova di un tiro cieco all'autore. Non attribuire a Beyond la modalità di Roll20/Foundry in assenza di una fonte pertinente.                                                                                                       |

**Raccomandazione fondata sul comportamento:** per una prova digitale che il DM vuole risolvere
senza far conoscere il risultato al giocatore, seguire Secret Roll di Roll20 e Blind Roll di
Foundry. Il giocatore avvia il tiro, riceve conferma che è stato eseguito/inviato e il risultato
numerico resta al DM. Il DM comunica cosa percepisce il personaggio. Esempio: esaminare una porta
per cercare trappole senza poter dedurre, dal numero basso, che un risultato negativo sia inaffidabile.

È una modalità esplicita, non il default approvato per tutte le prove o per Nascondersi.
L'alternativa già offerta dagli stessi prodotti mostra il risultato all'autore e al DM, nascondendolo
solo agli altri. Q025 ha confermato la modalità cieca nel caso digitale segreto concreto.
Il dado fisico ordinario rende visibile la faccia a chi lo tira: il suo percorso va discusso
separatamente. UI della richiesta, animazioni senza rivelazione, formula visibile, esito narrativo
automatico, correzioni, rivelazione successiva, autorità e rete non sono decisi dalla domanda.

## R018 — eccezione al tiro fisico per una prova cieca

Consultazione: 13/09/2026, preparazione di Q026 dopo I-031. Riutilizzata la fonte già conservata
in R011, verificando ora il comportamento specifico sui tiri ciechi. Documentazione e codice
pubblico; nessuna installazione, esecuzione del modulo o prova runtime.

- [Physical Dice Rolls — scheda Foundry](https://foundryvtt.com/packages/physical-dice-rolls),
  autore Rowiz, versione 1.2.2 per Foundry 11+, verificata 14 nella scheda: dichiara esplicitamente
  che l'inserimento manuale viene saltato in modalità Blind GM Roll. È una capacità del modulo,
  non una proprietà universale di tutti i metodi manuali di Foundry.
- [Sorgente del controllo](https://github.com/Rowiz49/physical-dice-rolls/blob/5c69fbcbb318f5c5c1e0659cd3b1c7f4d2cb894d/scripts/app.js):
  alla revisione `5c69fbcbb318f5c5c1e0659cd3b1c7f4d2cb894d`, risolta dal riferimento di release
  `1.2.2`, commit del 06/08/2026, `RealRoll.prompt` legge la modalità del tiro e ritorna prima
  della finestra manuale quando è BLIND, righe 42–53. Non cambia l'impostazione della modalità
  manuale. Il percorso è stato letto insieme a registrazione del modulo e wrapper di valutazione.
- [Wrapper di valutazione](https://github.com/Rowiz49/physical-dice-rolls/blob/5c69fbcbb318f5c5c1e0659cd3b1c7f4d2cb894d/scripts/evaluateRoll.js):
  dopo il passaggio precedente richiama il metodo di valutazione sottostante. Con il motore
  digitale ordinario questo lascia generare il tiro all'app; non dimostra un override universale
  di altri resolver manuali o servizi esterni eventualmente configurati. Il bypass del prompt
  del modulo e la conservazione della preferenza sono riscontri diretti, non dedotti dal nome.
- **Controevidenza al comportamento universale:** [PF2e — issue 15063](https://github.com/foundryvtt/pf2e/issues/15063),
  aperta il 12/06/2024 e chiusa come non pianificata, riporta un utente che riceveva il prompt
  manuale anche nelle prove segrete di PF2e su Foundry V12 e chiedeva il passaggio automatico
  al digitale. È una segnalazione/richiesta storica, non una funzione implementata né una prova
  del comportamento odierno. Impedisce di attribuire l'eccezione a tutto l'ecosistema Foundry.

**Raccomandazione iniziale per Q026, superata il 14/09/2026 da I-032:** seguire il bypass del manuale previsto da Physical Dice Rolls:
per una prova cieca usare il digitale, avviato dal giocatore con conferma senza risultato come
I-031; mantenere il fisico per gli altri tiri. La scelta tutela la segretezza anche quando il
giocatore preferisce dadi ordinari, dei quali vedrebbe necessariamente la faccia in un lancio
normale. È un'eccezione da approvare, non già implicata dall'accettazione del solo caso digitale.

Non si deduce un tiro fisico del DM, una torre o un dispositivo obbligatorio. I comportamenti
del modulo su campi vuoti, Escape e chiusura non vengono adottati con questa domanda. Non è
stato verificato un equivalente preciso di questo bypass in BG3, Beyond o Roll20; non occorre
attribuirglielo per seguire il precedente pertinente trovato.

**Esito Q026, 14/09/2026:** il proprietario mantiene il digitale ma richiede anche il tiro fisico
del DM e ribadisce il supporto di entrambi i metodi sempre. La proposta solo digitale è ritirata;
la capacità del modulo resta evidenza, senza imporre lo stesso limite al prodotto. Vedere I-032.

## R019 — due metodi di tiro e rivelazione successiva del risultato

Consultazione: 14/09/2026, risposta ampliata a Q026 e preparazione Q027. Documentazione primaria
pubblica; nessuna installazione o prova runtime. Si verificano due scelte distinte.

- [Fantasy Grounds — Options, Per User, Settings](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/3660185601):
  la sezione Dice: Manual Entry documenta una finestra con campo per il valore del dado.
  OK registra il valore inserito senza generare un dado digitale; Roll genera invece un
  risultato casuale e non usa quello inserito. Cancel rimuove il tiro. La pagina mostra
  «Updated Feb 04» senza anno nel testo estratto e non fissa una build. È un precedente
  concreto per offrire inserimento manuale o generazione digitale sul tiro, non una prova
  del passaggio automatico di una richiesta da un giocatore al DM. Faux Roll, anch'esso
  documentato, non viene proposto né adottato.
- [Fantasy Grounds — 5E Campaign Options](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996642014/5E%20Campaign%20Options):
  documenta Manual Entry fra le opzioni per utente e Show GM rolls fra quelle del GM;
  con quest'ultima disattivata i tiri del GM sono segreti e non condivisi coi giocatori.
  La pagina mostra «Updated Jan 22» senza anno nel testo estratto e non fissa una build.
  Conferma che generazione/input e visibilità sono controlli distinti; la combinazione
  completa richiesta dal proprietario non è stata provata nell'app.
- [Foundry — Basic Dice](https://foundryvtt.com/article/dice/), fonte R017 riletta:
  solo il GM può rivelare un Blind Roll. Il comando Reveal to Everyone nel registro rende
  pubblico un tiro privato; Make Private lo nasconde nuovamente. Nessuna versione fissata
  dalla pagina. Il precedente riguarda direttamente la facoltà del DM di rivelare un tiro
  già effettuato, oggetto della raccomandazione Q027. Non prova un controllo su ciò che
  altri ricordano e non determina quali dati del nostro prodotto rivelare insieme al numero.

**Applicazione:** Q026 è una scelta esplicita del proprietario: offrire anche il tiro fisico del
DM, preservando la segretezza e gli automatismi già concordati. Non serve un altro sì sui due
metodi. Per Q027 si raccomanda la rivelazione esplicita del singolo tiro da parte del DM come
in Foundry, applicabile a entrambi i metodi; confermata il 14/09/2026 con «Sisi ci sta», I-033.
Non si importa un default di fine scena, un insieme completo di permessi o i comandi adiacenti.

## R020 — più dadi fisici: risultati individuali o totale

Consultazione: 14/09/2026, preparazione Q028. Riutilizzate le fonti R011/R018 e aggiunto il
confronto con un modulo storico. Documentazione primaria; nessuna prova runtime o installazione.

- [Physical Dice Rolls](https://foundryvtt.com/packages/physical-dice-rolls), Rowiz, 1.2.2,
  Foundry 11+, verificata 14 nella scheda: la procedura documenta l'inserimento sulle singole
  facce dei dadi, seguito dalla conferma. È il precedente pertinente per raccogliere ciascun
  risultato. La generazione automatica dei campi lasciati vuoti e il bypass cieco sono capacità
  distinte: la prima non è proposta, il secondo non è adottato in base a I-032.
- [DF Manual Rolls](https://foundryvtt.com/packages/df-manual-rolls), flamewave000, 2.4.0,
  Foundry 10+, verificata 10.288: documenta input individuale e Manual Roll Total. Il totale
  inserito viene distribuito sui termini dei dadi e marcato diversamente nel registro.
  È un'alternativa pubblicata, non una prova di compatibilità attuale. La distribuzione non
  attesta le facce fisiche originali; non usarla per inventare la loro storia nel nostro prodotto.

**Raccomandazione Q028:** input dei singoli risultati come modalità normale, secondo il primo
modulo; somma e modificatori automatici sono già determinati da I-027. Il proprietario conferma
il 14/09/2026 delegando la scelta consigliata, I-034; accettato il carico d'inserimento con molti dadi. Il vantaggio di conservare le facce reali per correzioni
e capacità che dipendono da un singolo dado è una motivazione progettuale, non un risultato di
playtest. Il totale è una possibilità diversa, non un pattern inesistente; un'eventuale scorciatoia
coerente resta da concordare. Non si attribuisce il comportamento a tutti i VTT o a BG3.

## R021 — completamento parziale di un tiro con metodi diversi

Consultazione: 14/09/2026, dopo Q028 e per preparare Q029. Fonti primarie pubbliche, nessuna
installazione o prova runtime. Riutilizzata la fonte Physical Dice Rolls già raccolta in R020.

- [Physical Dice Rolls](https://foundryvtt.com/packages/physical-dice-rolls), Rowiz, 1.2.2,
  Foundry 11+, verificata 14: dopo l'inserimento manuale e la conferma, i dadi lasciati vuoti
  sono generati automaticamente. È il precedente diretto per mantenere una parte fisica e
  completare digitalmente il resto dello stesso tiro. Non dimostra che un campo vuoto
  corrisponda a un dado fisico non ancora lanciato.
- [Unfulfilled Rolls — README del team Foundry](https://github.com/foundryvtt/unfulfilled-rolls/blob/70d3653eb5bec9821a1be3074d0bf3c413867e84/README.md),
  revisione `70d3653eb5bec9821a1be3074d0bf3c413867e84` del 15/01/2024, manifest del repository
  verificato per Foundry 10: l'esempio combina d20/d8 esterni e d4 digitale nella stessa formula.
  È evidenza storica della combinazione di origini, non dello specifico gesto proposto né
  del comportamento di Foundry odierno. Non richiede di adottare dadi Bluetooth nel nostro prodotto.
- [Foundry RollResolver — API v14](https://foundryvtt.com/api/v14/classes/foundry.applications.dice.RollResolver.html),
  documentazione indicata come 14.365 Stable: gestisce risultati ancora da risolvere e documenta
  controlli di completamento. Le descrizioni API da sole non provano cosa faccia il pulsante
  dell'interfaccia con campi vuoti; non sono usate per attribuire quel comportamento al core.

**Raccomandazione Q029:** permettere sei risultati fisici e due digitali per completare un 8d6,
seguendo il precedente diretto del modulo. Il comando esplicito proposto «Tira i 2 dadi mancanti»
rende comprensibile la generazione; l'etichetta non è copiata dal modulo. Il caso riguarda dadi
ancora da tirare, non una sostituzione di risultati noti. Un campo vuoto da solo non autorizza
la generazione. Chiusura, timeout e indicazione dell'origine dei risultati non sono approvati.
Il proprietario conferma Q029 il 14/09/2026 a condizione del precedente, già verificato e
ricontrollato nella scheda del modulo. Registrata I-035 senza un'altra richiesta di conferma.
L'accettazione riguarda la combinazione proposta, non altri comportamenti accessori del modulo.

## R022 — origine manuale o digitale visibile per ogni dado

Consultazione: 14/09/2026, preparazione Q030 dopo I-035. Riutilizzata la fonte DF Manual Rolls,
ora verificata sulla visibilità dei singoli risultati. Documentazione primaria, nessun test runtime.

[DF Manual Rolls — Manual Roll Flagging in Chat](https://foundryvtt.com/packages/df-manual-rolls),
autore flamewave000, versione 2.4.0 verificata per Foundry 10.288: documenta indicatori sul tiro
contenente risultati manuali e su ciascun dado, distinguendo acquisizione manuale e generazione
casuale. L'ordine degli indicatori corrisponde ai risultati. Le sigle pubblicate includono MR,
MRT e RN; MRT riguarda il totale manuale distribuito sui termini, non adottato con questa proposta.
È un precedente storico preciso della distinzione per dado, non prova del core Foundry attuale.

**Raccomandazione Q030:** mostrare nel dettaglio, alle persone autorizzate a vedere il tiro,
l'origine dei singoli valori. Testi esemplificativi «inserito a mano» e «digitale», evitando di
fissare icone o layout. Corrisponde alla distinzione documentata; visibilità del tiro deriva
dalle decisioni già concordate. Utilità per rilettura e comprensione è la motivazione proposta,
non un esito misurato in playtest. Il 14/09/2026 il proprietario delega la scelta consigliata
su Q030: adottata e registrata I-036. Correzioni, riavvolgimenti e filtri rimangono aperti.

## R023 — più DM nella stessa campagna e confini del ruolo

Consultazione: 14/09/2026, preparazione Q031. Ripresa dell'inquadramento di persone e ruoli,
senza chiudere combattimento e dadi. Fonti primarie pubbliche; nessuna prova runtime.

- [Roll20 — Invite, Promote and Manage Players](https://help.roll20.net/hc/en-us/articles/29620515876375-Invite-Promote-and-Manage-Players),
  data 30/01/2025 nei risultati consultati inizialmente; l'apertura diretta successiva mostra
  28/07/2026 (R024). Il creatore può promuovere uno o più partecipanti a GM/Co-GM.
  Sono documentati gestione di pagine e token, creazione e modifica dei contenuti, accesso
  ai livelli della mappa e visione di tiri e messaggi dei GM. Il Creator resta distinto,
  con controllo completo delle impostazioni e alcune prerogative; è documentata anche la
  retrocessione a giocatore. Nessuna build fissata nella pagina. La fonte sostiene direttamente
  nomina del collaboratore, preparazione/conduzione e accesso ai dati dei GM. Non si adotta
  il modello a pagamento o una sua lista completa di permessi.
- [Foundry — Users and Permissions](https://foundryvtt.com/article/users/), aggiornata il
  20/10/2025 per 13.350: i ruoli sono assegnati agli utenti del mondo; il GM vede tutti i
  documenti e oggetti, mentre Assistant ha molti controlli di partita ma limiti amministrativi.
  La fonte conferma la distinzione dei ruoli e dei livelli di responsabilità. Non usarla per
  equiparare ogni permesso Assistant a quelli di Roll20 Co-GM o per adottare account per mondo.

**Raccomandazione Q031:** co-DM nominato dal DM che crea la campagna, capace di condividere
preparazione e conduzione e accedere ai contenuti riservati della campagna, seguendo il percorso
di Roll20. Questo accesso ai segreti è la conseguenza da concordare con il proprietario.
Proprietà, cancellazione, revoca, più collaboratori, materiale personale e conflitti sono assi
successivi, non impliciti. Il proprietario conferma esplicitamente Q031 il 14/09/2026 con
«Sisi ci sta assolutamente», I-037. L'accettazione non deriva dalla discrezionalità precedente.

## R024 — revoca del ruolo di co-DM e ritorno a giocatore

Consultazione: 14/09/2026, dopo Q031 e per preparare Q032. Fonti primarie documentali, nessun
accesso a una campagna reale o test runtime. Autorità sui ruoli e conseguenze della revoca
sono due scelte distinte: la domanda preparata riguarda le seconde.

- [Roll20 — Invite, Promote and Manage Players](https://help.roll20.net/hc/en-us/articles/29620515876375-Invite-Promote-and-Manage-Players),
  apertura diretta con data 28/07/2026: documenta Promote to GM/Demote to Player fra i comandi
  del creatore e distingue Kick from Game. La pagina aggiunge inviti diretti come GM e link
  dedicati rispetto al risultato indicizzato inizialmente in R023. Questo percorso non basta
  per affermare una regola universale di esclusività su ogni possibile assegnazione dei ruoli.
  Inviti, scadenze e permessi su tutti i percorsi restano da verificare per le rispettive domande.
- [Obsidian Portal — Demote a Player from Co-GM](https://help.obsidianportal.com/article/168-demote-a-player-from-co-gm),
  aggiornata 02/01/2020, senza build: descrive revoca in qualsiasi momento, ritorno a giocatore
  e perdita di accesso alle informazioni GM-only e alle impostazioni. Documenta anche una
  possibile successiva promozione. È il precedente diretto per l'effetto sul ruolo e sui segreti;
  non dimostra come vengano revocati dati già scaricati o accessi durante una disconnessione.
- [Foundry — Users and Permissions](https://foundryvtt.com/article/users/), 13.350,
  20/10/2025: distingue GM amministrativo e Assistant, con gestione di utenti e documenti.
  Non stabilisce un identico proprietario unico al modello di Roll20; non presentare consenso
  universale su chi possa promuovere o retrocedere altri DM.

**Raccomandazione Q032:** revocare i privilegi di co-DM mantenendo la persona come giocatore,
con perdita di accesso ai contenuti riservati ai DM. Segue direttamente i due percorsi di
retrocessione documentati. Non si deduce cancellazione di contenuti, espulsione, esclusività
amministrativa o possibilità di cancellare informazioni già apprese. Il proprietario conferma
Q032 il 14/09/2026 con «Sisi flessibilita massima», registrata I-038. L'indirizzo di flessibilità
non conferma i singoli permessi delle domande successive.

## R025 — passaggio temporaneo da DM a modalità giocatore e ritorno

Consultazione: 14/09/2026, preparazione Q033 dopo I-038. Fonte primaria documentale aperta;
nessun accesso a una campagna reale o prova runtime.

[Roll20 — My Settings](https://help.roll20.net/hc/en-us/articles/360039675153-My-Settings),
data della pagina aperta 20/07/2026, sezione Exiting and GM View Modes, senza build fissata:
un GM dispone del pulsante Re-Join as Player oppure Re-Join as GM. Può rientrare come giocatore
generico per verificare la prospettiva senza comandi GM o passare ad altri la conduzione, poi
ritornare come GM. La pagina distingue questa funzione da Player View, raccomandata per vedere
l'esperienza di uno specifico giocatore. Documenta anche un collegamento diretto all'ingresso
come giocatore; non si adotta per deduzione questa scorciatoia.

**Raccomandazione Q033:** DM e co-DM possono scegliere una modalità giocatore temporanea e
ritornare autonomamente alla modalità DM, senza essere nominati di nuovo. È un adattamento
del percorso reversibile documentato, distinto dalla revoca del ruolo di R024/I-038. Il caso
concreto è alternare chi conduce una scena e chi gioca il proprio personaggio. L'utilità per
questo caso è una motivazione progettuale, non un risultato misurato in playtest.

Le etichette italiane proposte sono esemplificative; non si fissa uscita/rientro o ricaricamento.
La fonte non basta per definire i nostri permessi durante il passaggio, l'assegnazione di un
personaggio, più dispositivi o comportamento senza rete. Non sostiene che una modalità volontaria
revocabile dall'interessato offra la stessa separazione dei segreti della perdita del ruolo.
Q033 confermata il 14/09/2026 con «Sisi vai, come ti dicevo flessibilità massima. Tutto ci sta
se gli altri prodotti lo fanno», I-039. Il precedente soddisfa la condizione espressa; non si
richiede una seconda conferma né si estende la risposta ai dettagli ancora aperti.

## R026 — più personaggi controllabili dallo stesso giocatore

Consultazione: 14/09/2026, preparazione Q034 dopo I-039. Fonti primarie aperte, nessuna prova
runtime. La ricerca riguarda il controllo dei personaggi, distinto dal ruolo nella campagna.

- [Foundry — Users and Permissions](https://foundryvtt.com/article/users/), aggiornata
  20/10/2025, versione documentata 13.350: in User Configuration / Select Character specifica
  che un utente può controllare più Actors, pur avendone uno solo predefinito. I permessi sui
  documenti sono separati dal ruolo dell'utente. È il precedente diretto per più personaggi
  controllati dallo stesso account; non si adotta l'obbligo di un personaggio predefinito.
- [Roll20 — How to Create a Character](https://help.roll20.net/hc/en-us/articles/360046574454-How-to-Create-a-Character),
  data della pagina aperta 27/10/2025, senza build fissata: Can be Edited & Controlled By
  documenta il GM che assegna a un altro giocatore il personaggio di chi non può partecipare.
  La visibilità dei contenuti e il controllo sono permessi distinti; le note GM restano ai GM.
  È il precedente per lo scenario dell'assente, non una decisione sui nostri consensi o sulle
  note personali. L'articolo Journal tentato inizialmente non è stato accessibile; non è usato
  come prova e non si deducono capacità dalla mancata apertura.

**Raccomandazione Q034:** il DM può assegnare più personaggi a uno stesso giocatore, controllabili
con il suo account e ruolo di giocatore. Il caso discusso assume l'accordo al tavolo per giocare
anche il personaggio di un assente. Il controllo dei personaggi non conferisce privilegi da DM.

La proposta combina il supporto esplicito a più personaggi di Foundry con l'assegnazione per
assenza descritta da Roll20. Non definisce proprietà, consenso nell'app, scadenza, controllo
simultaneo, note personali, cancellazione, selezione, visione o rete. Le regole d'azione restano
quelle della baseline concordata; non si adottano regole per compagni/evocazioni dalla documentazione
dei permessi VTT. Q034 confermata il 14/09/2026 con «Sisi ci sta», registrata I-040.
La conferma riguarda più personaggi per giocatore; il controllo condiviso dello stesso personaggio
rimane una scelta successiva.

## R027 — più giocatori autorizzati sullo stesso personaggio

Consultazione: 14/09/2026, preparazione Q035 dopo I-040. Fonti primarie aperte, nessuna prova
runtime. Verificata la coesistenza dei permessi; nessuna gestione della concorrenza dedotta.

- [Foundry — Actors](https://foundryvtt.com/article/actors/), sezione Actor Permission Levels,
  senza data di aggiornamento o build indicata nella pagina aperta: i permessi di ogni Actor
  sono assegnabili utente per utente o a tutti; più utenti possono vedere, modificare e controllare
  lo stesso Actor secondo il livello assegnato. Owner include controllo del token e modifica
  della scheda. È il precedente per aggiungere un utente mantenendo gli altri autorizzati;
  l'etichetta Owner non definisce la proprietà personale nel nostro prodotto.
- [Roll20 — How to Create a Character](https://help.roll20.net/hc/en-us/articles/360046574454-How-to-Create-a-Character),
  data verificata 27/10/2025, senza build fissata: Can be Edited & Controlled By permette
  l'assegnazione a un altro giocatore e include All Players. Il controllo della stessa scheda
  può quindi essere attribuito a più persone. Non si adotta All Players come default e non
  si deducono consenso del titolare, durata della delega o priorità fra due comandi.

**Raccomandazione Q035:** quando il DM affida il personaggio a un secondo giocatore, aggiungere
quel giocatore agli autorizzati conservando i permessi del giocatore abituale. I prodotti
supportano più autorizzati; il caso del rientro a metà sessione spiega l'utilità proposta senza
costituire un test di quel percorso. Revoche successive, comandi simultanei, note personali,
proprietà e rete restano aperti. Q035 confermata il 14/09/2026 con «Sisi ha senso», I-041.
La conferma non decide ancora la precedenza fra comandi impartiti contemporaneamente.

## R028 — un secondo movimento interrompe quello precedente ancora pendente

Consultazione: 14/09/2026, preparazione Q036 dopo I-041. Ricerca inizialmente rivolta ai conflitti
fra comandi sullo stesso personaggio; individuato un precedente preciso per il movimento.
Documentazione primaria, nessuna prova runtime o garanzia generale sulla concorrenza.

- [Foundry — Release 13.346](https://foundryvtt.com/releases/13.346), versione 13 Stable 5,
  26/06/2025, sezione The Game Canvas: quando un token già in movimento riceve un nuovo
  movimento, anche da un altro utente, il movimento pendente viene fermato. La nota descrive
  una correzione rilasciata. È un precedente storico sul caso preciso, non un benchmark
  della versione attuale né una regola valida per tutti i sistemi di combattimento.
- [Foundry — issue 13045](https://github.com/foundryvtt/foundryvtt/issues/13045), aperta
  18/06/2025, chiusa nel milestone V13 Stable 5: descrive un utente che muove un token già
  mosso da un altro e richiede l'arresto del movimento pendente prima di quello nuovo non
  concatenato. La release ne documenta la consegna; la sola apertura del bug non sarebbe bastata.
- [Foundry — TokenDocument API v14](https://foundryvtt.com/api/classes/foundry.documents.TokenDocument.html),
  consultata per startMovement e stopMovement: distingue avvio, pausa e arresto; l'arresto
  diretto è indicato per l'utente che ha iniziato il movimento. Questo non dimostra da solo
  l'interfaccia per il caso multiutente né annulla la distinzione fra arresto diretto e nuovo
  movimento. Non è usata per attribuire alla v14 l'intero comportamento storico senza test.

**Raccomandazione Q036:** per il movimento ordinario condiviso, un nuovo comando valido
confermato sostituisce il tratto precedente ancora da percorrere. Il caso esclude reazioni
in attesa o azioni composte da risolvere. Preview privata e conseguenze già applicate seguono
le decisioni esistenti; non si annullano spostamenti già avvenuti. La prova riguarda la
sostituzione del movimento pendente, non i nostri conteggi di risorse o la messaggistica.

Le ricerche su Roll20 e Midi-QOL non hanno fornito in questa consultazione una prova sufficiente
per la politica di conflitto fra attacchi o tiri. Correzioni di bug di modifica simultanea,
cronologia serializzata o generico supporto multiutente non sono usati come prova di quella
politica. Non inventare un consenso del mercato. Q036 confermata il 14/09/2026 con «Sisi ha
senso per me», I-042. La conferma è circoscritta al movimento discusso; gli altri conflitti
rimangono nella checklist.

## R029 — controllo del personaggio e modifica della scheda

Consultazione: 14/09/2026, preparazione Q037 dopo I-042. Ripresi i permessi della delega;
nessuna prova runtime. Fonti primarie, distinguendo modifica dei dati e proprietà del personaggio.

- [Foundry — Actors](https://foundryvtt.com/article/actors/), sezione Actor Permission Levels,
  senza data o build indicata nella pagina: Owner consente pieno controllo dell'Actor, apertura
  e modifica della scheda, controllo e visione del token. Il permesso standard abbina gioco e
  modifica. I singoli campi e le loro regole dipendono dal sistema; il termine Owner non viene
  adottato come modello di proprietà del nostro prodotto.
- [Roll20 — How to Create a Character](https://help.roll20.net/hc/en-us/articles/360046574454-How-to-Create-a-Character),
  pagina già aperta nelle consultazioni precedenti, 27/10/2025, senza build fissata; sezione
  Navigate Your Character Sheet ricontrollata nella ricerca: chi riceve Edit and Control può
  modificare la scheda. Il percorso per l'assente assegna questo stesso permesso. È il
  precedente diretto per abbinare controllo delegato e modifica, distinto dalla sola visibilità.
- [Roll20 — Demiplane integration, Beta](https://help.roll20.net/hc/en-us/articles/30050730960151-Demiplane-and-Roll20-Character-Sheet-Integration-Beta),
  aperta il 14/09/2026, data indicata 23/07/2025: la FAQ distingue permesso di modifica nella
  partita e titolarità della scheda Demiplane, che non si trasferisce. L'accesso dal sito
  Demiplane richiede un permesso distinto del titolare. Conservata come evidenza per il futuro
  approfondimento sulla proprietà; non si importano collegamento fra servizi, sistemi di gioco,
  limiti commerciali o sincronizzazione fra campagne. Non prova chi possa delegare nella nostra app.

**Raccomandazione Q037:** il controllo assegnato comprende la modifica della scheda di gioco
condivisa. Esempi di ambito proposti: caratteristiche, equipaggiamento e livello. Il secondo
giocatore modifica lo stesso personaggio, quindi i cambiamenti persistono nel suo stato condiviso.
Questo effetto deriva anche dall'unico stato concordato in I-041; non è una copia privata.

La scelta non determina note personali, segreti DM, proprietà, cancellazione, ulteriore delega,
consenso, durata o autorità di revoca. Permesso di modifica e condizioni di gioco per progredire
sono aspetti distinti. I due VTT supportano l'abbinamento standard; non si sostiene che tutti i
prodotti lo impongano o che non possano esistere permessi più granulari. Q037 confermata il
14/09/2026 con «Sisi ci sta, mi sembra ragionevole. Vai nella direzione di quello che fanno gli
altri prodotti», I-043. Note personali e altri poteri non sono approvati per deduzione.

## R030 — appunti dell'autore separati dal personaggio condiviso

Consultazione: 14/09/2026, preparazione Q038 dopo I-043. Fonti primarie aperte; nessuna prova
runtime. Si verifica la visibilità rispetto a persone e ruoli, senza dedurre garanzie tecniche.

- [Kanka — Articles](https://docs.kanka.io/en/latest/features/articles.html), documentazione
  intestata 1.0.0, senza data di aggiornamento o build applicativa fissata: a una voce possono
  essere collegati più testi, per esempio una storia personale al personaggio. Ogni testo può
  avere visibilità o permessi specifici, anche escludendo un membro o un ruolo. Il documento
  distingue modifica della voce, contributi e informazioni nascoste. Il nome Articles non
  vincola l'organizzazione o le etichette del nostro prodotto.
- [Kanka — Visibility](https://docs.kanka.io/en/latest/advanced/visibility.html), stessa
  intestazione documentale, nessuna build applicativa fissata: Only me rende visibile l'elemento
  solo al suo creatore, anche per mantenere segreti fra amministratori. Only me & Admins è una
  scelta distinta. È il precedente preciso per una visibilità basata sull'autore, non sul
  controllo di un personaggio. Non si importa l'intera matrice dei permessi Kanka.
- [Foundry — Journal Entries](https://foundryvtt.com/article/journal/), senza data o build
  indicata nella pagina aperta: i Journal hanno permessi propri e possono essere mostrati a
  giocatori scelti. Secret Text rimane visibile al GM o all'Owner del Journal: non è prova di
  note dell'autore nascoste anche al DM. La differenza va dichiarata; non attribuire a Foundry
  l'opzione Only me verificata in Kanka.

**Raccomandazione Q038:** offrire appunti personali «Solo io», leggibili soltanto dall'autore.
Condivisione del controllo del personaggio e ruolo DM/co-DM non concedono accesso a questi appunti.
L'adattamento usa la distinzione fra contenuto condiviso e contenuto a visibilità personale di
Kanka; non sostiene che Kanka simuli il nostro percorso di delega VTT. Il caso concreto riguarda
un sospetto o un'idea del giocatore, separato dalla scheda e dai segreti della campagna affidati ai DM.

Q038 non decide il default di tutte le note, la condivisione successiva, l'accesso DM+autore,
le autorizzazioni di modifica/cancellazione, la cifratura, i trasferimenti o la rete. Non è una
promessa di sicurezza misurata. Nessun requisito di spesa o installazione dei prodotti citati.
Q038 confermata il 14/09/2026, I-044: il proprietario accetta se aggiunge libertà senza toglierne
e segue un precedente. Le condizioni sono soddisfatte dall'opzione aggiuntiva e dalla fonte Kanka;
non si chiede un secondo sì. La conferma non determina le altre visibilità o i percorsi delle note.

## R031 — condivisione dell'appunto fra autore e chi conduce la campagna

Consultazione: 14/09/2026, preparazione Q039 dopo I-044. Riutilizzate e riaperte le fonti Kanka,
con un controllo aggiuntivo sulla visibilità personale. Documentazione primaria, nessun test runtime.

- [Kanka — Visibility](https://docs.kanka.io/en/latest/advanced/visibility.html), documentazione
  intestata 1.0.0, senza data di aggiornamento o build applicativa fissata: Only me & Admins
  combina autore e membri del ruolo amministratore; Only me rimane una scelta distinta.
  È il precedente diretto per condividere volontariamente con il gruppo che conduce.
- [Kanka — Testing permissions](https://docs.kanka.io/en/latest/guides/testing-permissions.html),
  stessa intestazione documentale, senza build fissata: la vista come altro membro non rivela
  agli amministratori gli elementi con visibilità self. Corrobora la separazione personale
  di R030/I-044; non si adotta per deduzione l'impersonazione o il relativo percorso Kanka.
- [Kanka — Articles](https://docs.kanka.io/en/latest/features/articles.html) e
  [Permissions](https://docs.kanka.io/en/latest/features/permissions.html), la seconda consultata
  nel risultato di ricerca: documentano anche configurazioni per membri/ruoli. Le regole generali
  di accesso degli amministratori non bastano a provare la privacy di ogni condivisione selettiva.
  Condivisione a una singola persona esclusi gli altri DM da verificare separatamente; non
  attribuire quel comportamento alla combinazione autore+amministratori.

**Raccomandazione Q039:** aggiungere «Io e i DM», leggibile dall'autore e da tutti i DM/co-DM
attuali della campagna, nascosto agli altri giocatori. Il gruppo amministratori di Kanka viene
adattato al gruppo di conduzione del nostro prodotto; non si trasferiscono poteri amministrativi.
Esempio: un obiettivo segreto del personaggio condiviso con chi prepara e conduce la storia.

L'opzione Solo io resta disponibile. Default, modifica da parte dei destinatari, notifiche,
revoca, nuove nomine/revoche, destinatari individuali e rete sono ancora aperti. La proposta
riguarda l'accesso in lettura, non un automatismo narrativo o una nuova regola di gioco.
Q039 confermata il 14/09/2026, I-045: «Sisi ci sta». Gli altri confini restano aperti.

## R032 — destinatari scelti per un appunto personale

Consultazione: 14/09/2026, preparazione Q040 dopo I-045. Documentazione aperta, nessun test
runtime. Cercato il caso preciso di condivisione individuale senza accesso implicito ai DM.

- [Apple — Share notes and collaborate on iPhone](https://support.apple.com/en-gb/guide/iphone/iphe4d04f674/ios),
  guida iPhone per iOS 26; pagina senza data di revisione o build minore fissata. Documenta
  l'accesso limitato alle persone invitate, separato dall'accesso tramite link. Distingue
  lettura e modifica e tratta separatamente la facoltà dei partecipanti di invitare altri.
  È un precedente diretto per scegliere i lettori di una nota, proveniente da un prodotto
  per appunti. Apple non ha ruoli DM/co-DM: la fonte non prova un sistema di permessi D&D.
- Le fonti Kanka/Foundry conservate in R030–R031 non dimostrano ogni combinazione di condivisione
  individuale escludendo gli amministratori. Non usare il generico supporto dei permessi
  come prova di questo comportamento preciso.
- Il [World Anvil Codex — Player Workflow](https://www.worldanvil.com/w/WorldAnvilCodex/a/player-workflow),
  pubblicato il 03/04/2020 e aggiornato il 27/11/2025, avverte che il Codex è mantenuto dalla
  comunità e può essere inesatto o superato; la documentazione è trasferita a Learn.
  Commenti storici e proposte di funzioni emersi nella ricerca non provano l'attuale supporto
  di note condivise selettivamente fra giocatori, nascoste al DM. Non sono adottati come prova.

**Raccomandazione Q040:** l'autore può scegliere una o più persone della campagna che possono
leggere l'appunto. DM/co-DM ricevono accesso solo se selezionati. L'adattamento combina il modello
Apple delle persone invitate con la separazione personale già concordata in I-044; non è
presentato come consenso uniforme del mercato VTT. Esempio: un indizio condiviso con un solo
compagno. Solo io e Io e i DM rimangono disponibili.

La proposta decide i destinatari della lettura. Permessi di modifica, ulteriori inviti,
default, notifiche, revoca, sincronizzazione delle modifiche rispetto a invio di copie,
condivisione esterna, uscita dalla campagna e rete restano aperti. Non si importano requisiti
Apple, acquisti o garanzie tecniche. Q040 confermata il 14/09/2026, I-046:
«Sisi ci può stare». Gli altri confini restano aperti.

## R033 — leggere un appunto o modificarlo insieme

Consultazione: 14/09/2026, preparazione Q041 dopo I-046. Documentazione primaria aperta;
nessuna prova runtime. Riutilizzata la fonte Apple di R032 sul nuovo asse dei permessi.

- [Roll20 — Journal, Handouts](https://help.roll20.net/hc/en-us/articles/360039675133-Journal),
  pagina aggiornata il 20/07/2026, 15:17; nessuna build applicativa fissata. Per gli handout
  distingue i destinatari che possono vedere il contenuto dai giocatori abilitati anche alla
  modifica. I campi documentati sono In Player's Journals e Can Be Edited By. Il testo condiviso
  segue quei permessi. In Roll20 li assegna il GM, che conserva il proprio accesso: questa
  autorità non è il modello delle nostre note personali e non viene trasferita.
- [Apple — Share notes and collaborate on iPhone](https://support.apple.com/en-gb/guide/iphone/iphe4d04f674/ios),
  guida iOS 26, senza data di revisione o build minore fissata. Distingue permessi di sola
  lettura e modifica; nella gestione della condivisione l'autore può cambiarli anche per una
  singola persona. Supporta quindi il caso dell'autore che assegna livelli differenti ai
  destinatari. La facoltà di invitare altre persone è trattata separatamente dalla fonte.

**Raccomandazione Q041:** permettere all'autore di scegliere, per ciascun destinatario, sola
lettura oppure anche modifica del testo dello stesso appunto. Esempio: un compagno consulta
l'elenco degli indizi mentre un altro aiuta ad aggiornarlo. Roll20 verifica la distinzione
nel contesto VTT; Apple Note verifica la gestione individuale da parte dell'autore.
Le visibilità I-044–I-046 restano valide: nessun accesso implicito dei DM importato da Roll20.

Non si propone qui un default: le fonti verificano la disponibilità dei permessi, non una
raccomandazione uniforme sul valore preselezionato. Proprietà, cancellazione, ulteriori inviti,
commenti, conflitti di modifica, cronologia, recupero, salvataggio, annullamento, revoca e rete
restano aperti. Nessuna scelta di editor o tecnologia.
Q041 confermata il 14/09/2026, I-047: «Sisi se gli altri prodotti lo fanno allora ci sta».
La condizione è soddisfatta dalle fonti sopra, senza richiedere una seconda approvazione.
Gli altri permessi e percorsi restano aperti.

## R034 — delegare gli inviti separatamente dalla modifica

Consultazione: 14/09/2026, preparazione Q042 dopo I-047. Riaperte le fonti primarie di R033
sull'asse specifico della condivisione delegata; nessun test runtime.

- [Apple — Share notes and collaborate on iPhone](https://support.apple.com/en-gb/guide/iphone/iphe4d04f674/ios),
  guida iOS 26, senza data di revisione o build minore fissata. Documenta l'opzione per consentire
  ai partecipanti di invitare nuove persone, disponibile quando hanno permesso di modifica.
  Il controllo è distinto dai permessi di lettura/modifica: un precedente diretto per
  l'autore che può autorizzare la condivisione da parte dei collaboratori. La fonte qui usata
  non determina per il nostro prodotto la granularità per nota/persona o i poteri dei nuovi invitati.
- [Roll20 — Journal, Handouts](https://help.roll20.net/hc/en-us/articles/360039675133-Journal),
  aggiornato il 20/07/2026, senza build fissata. La gestione dei destinatari degli handout è
  indicata come GM Only, mentre alcuni giocatori possono modificare il contenuto. Corrobora
  la distinzione fra scrittura e gestione degli accessi, ma non la delega volontaria di Apple.
  Non presentare i prodotti come identici e non trasferire l'autorità del GM alle note personali.

**Raccomandazione Q042:** l'autore può abilitare separatamente la facoltà di invitare altri
membri della campagna per chi modifica l'appunto. La modifica del testo da sola non autorizza
ulteriori inviti; una volta autorizzati, non serve far intervenire l'autore per ogni nuovo
partecipante. È l'adattamento dell'opzione Apple, mantenendo l'ambito dei membri della campagna.
Esempio: chi aiuta a scrivere gli indizi può coinvolgere un terzo compagno se l'autore lo consente.

Restano aperti granularità dell'opzione, livelli assegnabili ai nuovi invitati, inviti a catena,
notifiche, accettazione, revoca, inviti pendenti, condivisione esterna, inviti da parte di lettori
senza modifica, salvataggio e rete. Non si importa un divieto generale per i lettori dalla
condizione della fonte Apple. Proprietà e altri poteri non dedotti.
Q042 confermata il 14/09/2026, I-048. I-049 conserva la precisazione di riprendere anche la
UI/UX dei prodotti per esporre queste possibilità. Gli altri confini rimangono aperti.

## R035 — revoca individuale e percorso di gestione della condivisione

Consultazione: 14/09/2026, preparazione Q043 dopo I-048–I-049. Guida primaria consultata
in EN e IT; capacità e percorso documentati, senza prova runtime o ispezione visuale dell'app.

- [Apple — Condividere note e collaborare su iPhone](https://support.apple.com/it-it/guide/iphone/iphe4d04f674/ios),
  guida iOS 26, senza data di revisione o build minore fissata. Nella gestione della condivisione,
  la persona responsabile della nota può rimuovere singoli partecipanti. La procedura non
  pone come condizione che il destinatario non abbia mai contribuito al testo.
- Percorso documentato: pulsante Collabora, Gestisci nota condivisa, partecipante,
  Rimuovi accesso. È distinto dal comando che interrompe la condivisione con tutti.
  Conservato anche come riferimento d'interazione secondo I-049, senza trasformarlo in
  una pagina o un layout già approvato.
- [Versione inglese della guida](https://support.apple.com/en-gb/guide/iphone/iphe4d04f674/ios)
  corrobora la procedura. EN e IT sono due versioni della stessa fonte, non prove indipendenti
  né un consenso di più prodotti. Le fonti degli handout Roll20 non attestano lo stesso
  modello di autorità del giocatore autore; non vengono usate per attribuirglielo.

**Raccomandazione Q043:** l'autore può revocare l'accesso a un destinatario individuale della
nota, anche se aveva permesso di modifica e ha contribuito. Non serve il consenso del
destinatario o l'intervento del DM. Il caso riguarda la condivisione selettiva all'interno
della campagna, non la rimozione di un partecipante dalla campagna stessa.

Il trattamento dei contributi già scritti non viene dedotto dalla revoca dei permessi;
restano aperti anche modifiche pendenti, inviti a catena, notifiche, conferma e annullamento,
reinviti, accessi tramite gruppi, cronologia e rete. La fonte non è prova di cancellazione
istantanea da dispositivi offline o di copie esterne.
Q043 confermata il 14/09/2026, I-050: il proprietario accetta a condizione di copiare il pattern
esistente, senza reinventarlo. Il percorso Apple sopra verifica la condizione; non chiedere
un secondo sì. I-005 e I-049 ribadite; gli altri confini restano aperti.

## R036 — contributi già salvati dopo la rimozione di un collaboratore

Consultazione: 14/09/2026, preparazione Q044 dopo I-050. Documentazione primaria aperta;
nessuna prova runtime. Si verifica esplicitamente il mantenimento del contenuto già scritto,
che non era dimostrato dal solo comando di revoca in R035.

- [Fellow — Remove Teammate's Access to a Note](https://help.fellow.ai/en/articles/7179735-remove-teammate-s-access-to-a-note),
  datato 09/03/2026, senza build applicativa fissata; il vecchio URL help.fellow.app reindirizza
  a help.fellow.ai. La sezione sulle conseguenze della rimozione specifica che contenuti,
  commenti e modifiche della persona rimossa restano nella nota per gli altri collaboratori.
  Per cambiare o eliminare i suoi contributi si interviene esplicitamente sul contenuto.
  È un prodotto di note collaborative, non un VTT; questo è il precedente diretto per Q044.
- Percorso manuale documentato da Fellow: Share nella nota, scheda Share, elenco accessi,
  menu Can edit accanto alla persona, Remove. I vincoli legati ai calendari e alle serie di
  riunioni non si trasferiscono alla campagna. Per il nostro comando di revoca rimane il
  riferimento Apple già concordato in I-050; il confronto non aggiunge un secondo percorso.
- [Apple — Manage shared notes and folders in Notes on Mac](https://support.apple.com/en-gb/guide/notes/apd881ec5518/mac),
  guida macOS Tahoe 26, senza data di revisione o build minore fissata. Corrobora I-050:
  l'autore può rimuovere partecipanti in qualsiasi momento. Non offre la stessa affermazione
  esplicita di Fellow sulla conservazione di ogni contributo; non attribuirgliela per deduzione.
  Documenta inoltre controlli di condivisione anche per persona, incluso consentire nuovi
  inviti: evidenza disponibile per i futuri approfondimenti sulla granularità di I-048,
  non decisione aggiuntiva dell'intervista.

**Raccomandazione Q044:** la revoca conserva il testo già salvato nella nota, senza cancellare
il lavoro della persona rimossa o ripristinare automaticamente una versione precedente.
Gli editor ancora autorizzati possono modificarlo secondo I-047; i lettori lo consultano.
Esempio: nome del sospettato e indizio importante rimangono utilizzabili dopo la revoca.

Testo non sincronizzato, revoca durante la scrittura, annullamento, cronologia, attribuzione
storica, commenti, uscita/cancellazione dell'account e rete rimangono aperti. Le note Apple e
Fellow non approvano altre funzioni o restrizioni della nostra app.
Q044 confermata il 14/09/2026 tramite delega circoscritta, I-051: adottata la conservazione
consigliata. Nessuna approvazione automatica degli altri comportamenti.

## R037 — personaggio personale e campagna digitale distinta

Consultazione: 14/09/2026, preparazione Q045 dopo I-051 e richiesta di visibilità sull'agenda.
Fonti primarie aperte; nessuna prova runtime. Il confronto torna al contesto d'uso del giocatore,
come parte della copertura generale ancora aperta, senza ritirare l'ambito note.

- [D&D Beyond — Joining a Campaign](https://dndbeyond-support.wizards.com/hc/en-us/articles/14025808350612-Joining-a-D-D-Beyond-Campaign),
  aggiornato il 27/08/2025. Dall'invito si può scegliere un personaggio già presente in My Characters
  e usare Join with this character. Il personaggio può quindi precedere l'ingresso nella campagna.
- [D&D Beyond — Character Creation Methods](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193997716-Character-Creation-Methods),
  aggiornato il 24/03/2026. Documenta creazione standard, guidata rapida e personaggi pronti
  aggiunti all'account; modifica e progressione successive dalla scheda. Questi metodi sono
  evidenza disponibile per il ciclo del personaggio, non scelte già approvate nella nostra app.
- [D&D Beyond — Character Header](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193980820-Character-Header),
  aggiornato il 17/09/2025. Descrive comandi della scheda, ritorno al builder e PDF;
  il collegamento alla campagna è condizionato all'appartenenza del personaggio a una campagna.
- [D&D Beyond — Additional Content on the Character Sheet](https://dndbeyond-support.wizards.com/hc/en-us/articles/13625288445716-Additional-Content-on-the-Character-Sheet),
  aggiornato il 17/06/2025. Distingue esplicitamente la creazione dentro e fuori dalla campagna.
  Avverte che la documentazione non è ancora aggiornata rispetto alle modifiche del builder:
  usarla con questo limite, insieme alle altre fonti. Non importare acquisti, restrizioni dei
  contenuti o vecchi percorsi commerciali. Nessuna build applicativa fissata per queste pagine.

**Raccomandazione Q045:** un giocatore può creare e usare la propria scheda senza essere in
una campagna nell'app, anche se il suo gruppo gioca con carta e altri strumenti. Beyond fornisce
il precedente dei personaggi personali e del loro successivo ingresso in campagna. I comandi
My Characters, builder e scelta del personaggio dall'invito sono riferimenti documentati di UI/UX;
le nostre pagine, i loro nomi e i passaggi dettagliati restano da concordare.

Il caso decide il contesto individuale della scheda, non l'intero builder, una modalità di
avventura solitaria o un DM automatico. Trasferimenti/copie, condivisione, automatismi specifici
senza campagna, regole del tavolo, importazione, stampa e rete restano aperti. Il supporto a dadi
fisici e digitali rimane trasversale. Q045 confermata il 14/09/2026, I-052; le eventuali
limitazioni sono ancora da definire, non approvate per deduzione.

## R038 — ricostruire una scheda esistente tramite il builder

Consultazione: 14/09/2026, preparazione Q046 dopo I-052. Documentazione ufficiale aperta,
nessuna prova runtime, nessuna build dell'app fissata.

- [D&D Beyond — Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections),
  aggiornato il 27/08/2025. Class espone livello e scelte delle capacità; Abilities permette
  l'inserimento manuale dei punteggi; Equipment consente di aggiungere equipaggiamento senza
  usare la dotazione iniziale. Sono percorsi pertinenti per ricostruire dati di una scheda esistente.
  Il documento contiene anche un riferimento alla disponibilità futura dell'export durante la beta:
  non usarlo per affermare lo stato attuale dell'esportazione, già documentata separatamente in R037.
- [D&D Beyond — Character Creation Methods](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193997716-Character-Creation-Methods),
  aggiornato il 24/03/2026, già conservato in R037. Standard offre una procedura per passi e aiuto
  facoltativo. Quickbuilder produce un personaggio di primo livello; non confondere questo limite
  con le possibilità del builder completo.

**Raccomandazione Q046:** permettere di ricostruire manualmente un personaggio già giocato,
come un guerriero di 7° livello, usando classe/livello, scelte e dati attuali. L'uso per riportare
una scheda cartacea è la nostra applicazione delle capacità documentate; nessun importatore
automatico da carta o altro servizio è dimostrato o proposto in questa domanda.

Conservare Class, Abilities ed Equipment come riferimenti d'interazione, senza approvare nomi,
numero od ordine delle nostre pagine. Incoerenze, house rule, dati incompleti, stato delle risorse,
bozza, salvataggio e offline restano domande future. Q046 confermata il 14/09/2026, I-053:
ricostruzione assistita al livello attuale.

## R039 — sostituire un punteggio calcolato con un totale esplicito

Consultazione: 14/09/2026, preparazione Q047 dopo I-053. Documentazione primaria consultata;
nessuna prova runtime o build applicativa fissata. Il punto è la sostituzione del totale,
non il normale input manuale dei valori di partenza già documentato in R038.

- [Roll20 — 2024 Change Log](https://help.roll20.net/hc/en-us/articles/34086640235927-2024-Change-Log),
  voce del 02/08/2024, D&D 2024 Beta Sheet & Builder: documenta la sostituzione completa di
  punteggi e modificatori tramite Ability Score Edit Modal. È un precedente storico esplicito;
  la disponibilità puntuale in una build attuale non è stata provata in esecuzione.
- [Roll20 — Dungeons & Dragons 2024 Character Sheet](https://help.roll20.net/hc/en-us/articles/30748164251287-Dungeons-Dragons-2024-Character-Sheet),
  guida consultata il 14/09/2026: documenta il percorso Ability Scores, ingranaggio, impostazioni
  delle caratteristiche e dei tiri salvezza. Corrobora il percorso, non descrive nel testo tutti
  i campi di sostituzione. Le descrizioni delle regole, incluse ispirazione e recupero dei Dadi
  Vita, non sono verificate in questo confronto: usare la guida come fonte UI e verificare
  separatamente ogni regola nella baseline ufficiale. Data/build non fissate qui.
- [D&D Beyond — Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections),
  27/08/2025, già R038: il normale input manuale dei punteggi non dimostra da solo una
  sostituzione del totale. Non usare questa capacità adiacente come prova di Q047.

**Raccomandazione Q047:** consentire una sostituzione esplicita del totale quando sulla carta
si conosce, per esempio, Forza 18 ma non sono stati ricostruiti i suoi contributi. Riprendere
il controllo manuale documentato da Roll20; usarlo per questo contesto è il nostro adattamento.
Il totale imposto prevale sul calcolato finché la sostituzione è attiva. Distinguerlo nel dettaglio
è coerente con I-027; nessuna validazione delle scelte mancanti o provenienza inventata.

Ritorno al calcolo, nuovi aumenti, oggetti ed effetti temporanei restano da discutere. Non
attribuire ai riferimenti una politica verificata di riconciliazione con dati ricostruiti dopo.
Q047 confermata il 14/09/2026, I-054: totale manuale riconoscibile e prevalente finché impostato.

## R040 — revisione prima dell'applicazione del passaggio di livello

Consultazione: 14/09/2026, preparazione Q048 dopo I-054. Fonti primarie aperte, nessuna prova
runtime e nessuna build fissata. Ricerca iniziata dal nuovo aumento con totale manuale attivo:
non è stata verificata una riconciliazione automatica di quel caso. Si propone prima il percorso
di revisione, conservando la riconciliazione come ramo aperto.

- [Roll20 — D&D 5e Charactermancer](https://help.roll20.net/hc/en-us/articles/360039644133-D-D-5e-Charactermancer),
  10/11/2021. La guida riguarda creazione e avanzamento. Documenta Review con scelte e dati
  richiesti mancanti, e Apply Changes disponibile nel riepilogo; l'applicazione aggiorna la scheda.
  È il precedente diretto del percorso. Il testo riguarda la precedente generazione 5e OGL,
  non la scheda 2024; non importare restrizioni dei contenuti, campi obbligatori o sovrascrittura
  integrale della scheda come comportamenti approvati del nostro prodotto.
- [Roll20 — Play D&D 2024 Your Way](https://blog.roll20.net/posts/play-dd-2024-your-way-on-roll20/),
  17/09/2024. Il builder nuovo introduce un riepilogo delle scelte e delle omissioni; a quella
  data il passaggio di livello è ancora annunciato come futuro. Corrobora il pattern di review,
  ma da solo non prova l'applicazione finale dell'avanzamento o la gestione dei totali manuali.

**Raccomandazione Q048:** scegliere le opzioni del nuovo livello, rivedere le modifiche, poi
confermare l'aggiornamento della scheda attiva. Nel nostro adattamento, evidenziare anche un
totale manuale che resterebbe impostato, come Forza 18, senza fingersi un calcolo verificato.
Quest'ultimo richiamo è un adattamento a I-054/I-027, non un avviso identico osservato nei riferimenti.

Non è ancora decisa la gestione del successivo aumento sul totale manuale: aggiornamento
esplicito, ritorno al calcolo e dati storici rimangono aperti. La conferma di Q047 non richiede
un secondo sì. R040 non approva il flusso di salvataggio della bozza, gestione dei dadi,
conflitti, annullamento o blocchi di validazione. Q048 confermata il 14/09/2026, I-055,
tramite delega circoscritta e condizione del precedente soddisfatta; nessun secondo sì necessario.

## R041 — conservare le scelte incomplete senza applicare il livello

Consultazione: 14/09/2026, preparazione Q049 dopo I-055. Riutilizzata e verificata la fonte
primaria di R040; nessun test runtime o confronto fittizio con una build più recente.

[Roll20 — D&D 5e Charactermancer](https://help.roll20.net/hc/en-us/articles/360039644133-D-D-5e-Charactermancer),
10/11/2021, generazione 5e OGL. Cancel apre le opzioni di uscita; Save and Exit conserva le
scelte e, alla riapertura, riprende dal passaggio lasciato. Apply Changes resta il comando
separato per aggiornare la scheda. La fonte documenta anche Discard and Exit e Continue
Charactermancer: evidenza conservata per le successive domande, non approvazione automatica.

**Raccomandazione Q049:** permettere di salvare un avanzamento incompleto e riprenderlo più
tardi. La scheda continua a usare il livello già applicato secondo I-055. Il riferimento
fornisce il percorso di salvataggio/ripresa; le nostre etichette, collocazione e pagine restano
aperte. Non importare la perdita delle modifiche al passaggio corrente descritta dalla guida
quando si chiude con X, né dedurre un salvataggio automatico.

Limiti: fonte storica, nessuna garanzia qui su cloud, altri dispositivi, offline, conflitti,
dadi precedenti o ripresa dopo modifiche della scheda. Questi restano rami espliciti in OPEN.
Il caso Q049 riguarda un'interruzione volontaria con salvataggio riuscito, non un guasto.
Q049 confermata il 14/09/2026, I-056: salvataggio dell’avanzamento incompleto e ripresa successiva.

## R042 — preparare le scelte di livelli futuri e conservarle

Consultazione: 14/09/2026, preparazione Q050 dopo I-056. Fonte primaria aperta, nessun test
runtime o build fissata. Il confronto distingue un piano futuro dalla bozza del prossimo livello.

[Roll20 — D&D Homebrew Character Builder Is Here](https://blog.roll20.net/posts/dd-homebrew-character-builder-is-here/),
19/11/2025, sezione Plan For Retirement. Documenta il percorso: alzare il livello nel builder,
scegliere talenti, incantesimi e altre opzioni, poi abbassarlo. Le scelte restano conservate per
quando il personaggio raggiunge quei livelli e possono essere cambiate. L'articolo dichiara
le opzioni disponibili al momento della pubblicazione; non è una nostra prova runtime.

**Raccomandazione Q050:** offrire la preparazione di più livelli futuri, con scelte salvate e
modificabili, senza cambiare le capacità attuali del personaggio. Nel nostro adattamento le
scelte vengono riproposte nell'avanzamento effettivo e restano soggette al riepilogo/conferma I-055.
Il riferimento descrive lo sblocco delle scelte al raggiungimento dei livelli: non attribuirgli
la nostra esatta conferma finale o controlli sulle incongruenze che non sono stati verificati.

Conservare il percorso nel builder come riferimento UI/UX; nessun layout o gesto preciso già
approvato. L'articolo documenta anche homebrew, inserimento manuale da libri e template:
ricerca disponibile per A10/A2, non funzionalità automaticamente approvate da Q050.

Piani alternativi, prerequisiti, cambiamenti delle scelte precedenti, contenuti cambiati,
condivisione e rete restano da approfondire. Nessuna promessa di ottimizzazione della build o
simulazione di combattimento. Q050 confermata il 14/09/2026, I-057, sul precedente verificato;
I-058 aggiunge il vincolo esplicito di semplicità e intuitività. Il percorso non è già validato.

## R043 — filtro dei prerequisiti con possibilità di vedere le opzioni escluse

Consultazione: 14/09/2026, preparazione Q051 dopo I-057/I-058. Documentazione primaria aperta;
nessuna prova runtime o valutazione di usabilità effettuata. La semplicità richiesta dal proprietario
viene affrontata attraverso un caso di selezione concreto, senza riaprire l'ambizione funzionale.

[Demiplane — You Meet the Prerequisite for These Patch Notes (#15)](https://www.demiplane.com/blog/you-meet-the-prerequisite-for-these-patch-notes-15),
23/04/2025. Per i builder Pathfinder 2e e Starfinder 2e, i talenti con prerequisiti non soddisfatti
vengono filtrati. Un controllo permette di mostrarli; Getting Started / Preferences & Rules
consente anche una preferenza persistente. La pubblicazione documenta inoltre il raggruppamento
per livello: non adottare automaticamente raggruppamento o preferenza persistente da questo caso.

**Raccomandazione Q051:** nella scelta di un talento, mostrare inizialmente quelli con requisiti
soddisfatti e offrire la consultazione degli altri su richiesta. Il precedente è preciso per
la visibilità della lista; il trasferimento al D&D 2024 è il nostro adattamento. La possibilità
di vedere un'opzione non decide se il giocatore possa acquisirla senza requisiti.

R042 conserva il piano futuro Roll20. [D&D Beyond — Character Header](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193980820-Character-Header),
17/09/2025, consultato di nuovo: documenta accesso al builder dalla scheda, ma non un comando
identico «Pianifica livelli futuri». Non usarlo come prova di una separazione dei percorsi già
concordata. L'ingresso nella pianificazione rimane da descrivere, con il vincolo I-058.

Regole ufficiali, eccezioni del DM, requisiti ignoti, contenuti e livelli futuri restano da
approfondire; nessuna adozione delle regole Pathfinder o Starfinder. Q051 confermata il 14/09/2026, I-059: filtro iniziale e consultazione su richiesta.

## R044 — controllo dei requisiti disattivabile per il personaggio

Consultazione: 14/09/2026, preparazione Q052 dopo I-059. Fonte primaria storica recuperata
tramite l'indice di ricerca; l'apertura diretta restituisce un errore. Nessun test runtime o
build corrente fissata. Non trasformare il precedente in una verifica della UI attuale.

[D&D Beyond — Feat and Multiclassing Prerequisites](https://www.dndbeyond.com/old-changelog/381-feat-and-multiclassing-prerequisites),
29/11/2018, Pasquale Caiazzo. L'aggiornamento introduce controlli sui requisiti dei talenti,
attivi normalmente, e preferenze del personaggio per disattivarli e consentire eccezioni.
Documenta inoltre conservazione delle scelte pregresse e un controllo separato per il multiclasse;
questi dettagli non sono adottati automaticamente. Il percorso documentato arriva alle preferenze
del personaggio: non è una deroga per singolo talento né una richiesta inviata al DM.

**Raccomandazione Q052:** consentire al giocatore una deroga esplicita per recepire un accordo
con il DM già preso al tavolo, senza aggiungere un'approvazione digitale. Questa politica del
nostro prodotto è confermata in Q052/I-060, registrata il 15/09/2026. I-059 aveva confermato
soltanto la consultazione.

La guida [Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections),
27/08/2025, aperta nuovamente, non descrive questo specifico controllo: non usarla come conferma
aggiornata della deroga. R043 è stato riaperto e conserva il filtro Demiplane; non documenta
un riepilogo preciso dei requisiti mancanti, che rimane punto aperto.

I-058 richiede una presentazione comprensibile. Coordinamento con il filtro, ritorno ai controlli,
traccia della deroga e autorità nelle campagne restano da definire; nessuna regola 2014 importata
nella baseline 2024 e nessuna approvazione del multiclasse o di tutti i bypass. Q052 confermata;
l’ampliamento ai contenuti è registrato in I-061/I-062 e approfondito in R045/Q053.

## R045 — riuso delle opzioni precedenti e creazione di contenuti

Consultazione: 15/09/2026, dopo Q052. Fonti primarie documentali, nessun test runtime o build
fissata. Conservata la ricerca su scrittura e automazione in evidence/research-01/claims.md:
un editor non dimostra l'esecuzione di qualunque regola.

[D&D Beyond — Changelog](https://www.dndbeyond.com/changelog/), sezione Updating the D&D Beyond
Toolset for the 2024 Core Rulebooks aggiornata il 03/09/2024, aperta. Descrive sottoclassi
precedenti usabili con classi 2024 e restrizioni per quelle riscritte nel nuovo manuale.
L'esempio del Dominio della Conoscenza mostra selezione nel builder e progressione. Usare questa
sezione consolidata, non le comunicazioni precedenti ritirate. Non prova ogni combinazione;
le restrizioni del concorrente non sono decisioni del proprietario.

[D&D Beyond — Design Workshop: Feats](https://www.dndbeyond.com/posts/168-design-workshop-feats),
13/03/2018, James Introcaso, aperto. Percorso storico Characters / Feats / Create / Create from
Scratch; descrizione, prerequisiti ed elementi strutturati come modificatori, incantesimi e usi.
Non prova editor universali o importatori di sottoclassi; non adottarne i consigli di bilanciamento
come regole 2024. Percorso conservato come evidenza, non UI corrente testata.

[D&D Beyond — Player’s Handbook Playtest 6](https://www.dndbeyond.com/posts/1520-players-handbook-playtest-6-play-the-revised-monk),
articolo del 2023 recuperato nell'indice di ricerca; apertura diretta non riuscita. Elenca
Swashbuckler fra le sottoclassi del ladro. Usato soltanto per distinguere la categoria dal talento,
non per attribuire al tavolo regole di playtest, una fonte o una revisione particolare.

**Applicazione Q053:** distinguere riuso e personalizzazione delle regole. Chiedere quali
variazioni il tavolo abbia effettivamente fatto allo Spadaccino, senza suggerire che ne abbia
fatte. I-061 conferma i talenti custom anche se la sottoclasse fosse immutata. Fonte/revisione,
compatibilità effettiva, modalità di riuso e automazioni rimangono da approfondire.
Nessun catalogo, conversione universale o importatore dedotto. Q053 chiarita il 15/09/2026:
Spadaccino ricreato senza modifiche, I-063; homebrew fondamentale, I-064.

## R046 — creazioni riutilizzabili e inserimento di opzioni mancanti

Consultazione: 15/09/2026, dopo Q053. Fonti primarie aperte, nessun test runtime o build fissata.

[Shard — Create and Share](https://www.shardtabletop.com/blog/create-and-share), Hal Howard,
19 giugno, anno non esposto nel testo consultato. Reference apre le categorie con il comando
New; My Creations raccoglie le creazioni, accessibili nelle campagne dell'autore. Il post descrive
anche visibilità automatica dei contenuti rivolti ai giocatori: Q054 usa soltanto il precedente
sul riuso per l'autore, senza adottare quella condivisione o affermare un default privato di Shard.

[Shard — Can players contribute content to a campaign?](https://www.shardtabletop.com/howto/player-content-sharing),
Darren Shakib, 17 novembre, anno non esposto. Documenta Campaign menu / Share Library / Share,
revoca con Stop Sharing Library e controllo del GM sui pacchetti attivi. Condivisione delle
creazioni tramite pacchetti; limiti commerciali presenti, non adottati. Evidenza da riprendere
per i permessi, distinta dalla sola disponibilità all'autore oggetto di Q054.

[Roll20 — D&D Homebrew Character Builder Is Here](https://blog.roll20.net/posts/dd-homebrew-character-builder-is-here/),
19/11/2025, già conservato in R042 e riaperto. Documenta creazione guidata di classi, sottoclassi,
specie e background, capacità per livello e inserimento manuale da libri. I modelli descritti
sono duplicati di personaggi ancora nel builder: non equivalgono a una libreria di sottoclassi.
Conservare la distinzione; nessun importatore automatico o effetto arbitrario dimostrato.

**Raccomandazione Q054:** libreria personale per riutilizzare le proprie creazioni fra campagne,
come Shard. Riuso, condivisione e aggiornamento delle copie sono assi separati. Proprietà,
permessi, revisioni e UI restano da definire. Q054 confermata il 15/09/2026, I-065.

## R047 — condivisione del giocatore e abilitazione delle opzioni comuni

Consultazione: 15/09/2026, dopo Q054. Fonte primaria riaperta; nessun test runtime o build fissata.

[Shard — Can players contribute content to a campaign?](https://www.shardtabletop.com/howto/player-content-sharing),
Darren Shakib, 17 novembre, anno non esposto. Verificato il percorso Campaign menu / Share
Library / Share: il giocatore rende disponibile la libreria, mentre il GM decide i pacchetti
attivi nella campagna. Il precedente distingue disponibilità condivisa e attivazione.
L'unità documentata è il pacchetto, non una conferma per singola capacità o uso.

[Shard — Packaging Content for Sharing](https://www.shardtabletop.com/howto/packaging-content-for-sharing),
Hal Howard, 29 giugno, anno non esposto. My Packages / New / nome / Build / Pick Books assembla
libri e contenuti collegati; distingue contenuti incorporati e dipendenze. Prova come le
creazioni possono entrare nei pacchetti. Nessuna adozione di questo intero percorso o della
necessità di creare un libro nella nostra app. I limiti commerciali non sono trasferiti.

**Raccomandazione Q055:** lasciare al DM l'abilitazione dei contenuti condivisi fra le opzioni
comuni del tavolo, seguendo la distinzione di Shard. Granularità, condivisione, visibilità e
UI rimangono aperte. Non confondere abilitazione comune e deroghe individuali I-060: nessun
nuovo permesso per ogni azione. Q055 confermata il 15/09/2026 con delega circoscritta, I-066.

## R048 — modifica della definizione e aggiornamento delle schede esistenti

Consultazione: 15/09/2026, preparazione Q056 dopo I-066. Fonti primarie aperte; nessun test
runtime o stato corrente dell'app verificato. Le date dei documenti delimitano il precedente.

[Foundry D&D5e — Advancement User Guide](https://github.com/foundryvtt/dnd5e/wiki/Advancement-User-Guide#updating-advancements-for-an-owned-class-item),
wiki del progetto ufficiale, modificata il 31/01/2024, etichettata aggiornata a 3.0.0. La sezione
Updating Advancements for an owned Class item distingue la classe sul personaggio dalla copia
in compendio: aggiornare quest'ultima non porta i nuovi avanzamenti sulla scheda, nemmeno
trascinandola di nuovo. La guida richiede modifiche esplicite alla classe posseduta. Registra
anche un futuro aggiornamento dal modello, senza provarlo disponibile. Non importare limiti
storici di sottoclassi o un numero attuale di tipi di avanzamento dalle altre sezioni.

[D&D Beyond — How to Create a Homebrew Race](https://www.dndbeyond.com/posts/1182-how-to-create-a-homebrew-race-using-d-d-beyond),
05/03/2022, Mike Bernier. Per contenuto non pubblicato descrive Edit e rimozione/aggiornamento
sulla scheda; per contenuto pubblicato usa Create New Version, Edit, Save Changes. Non prova
una politica identica a Foundry né un nostro aggiornamento guidato con confronto delle differenze.
Conservare il confronto senza inventare consenso o adottare la pubblicazione come prerequisito.

**Raccomandazione Q056:** cambiare la definizione in libreria non cambia automaticamente i
personaggi esistenti; aggiornamento esplicito delle schede, trasferendo la separazione di Foundry.
Il caso di una capacità spostata dal terzo al quinto livello è inventato per rendere concreto
l'impatto. Non attribuirlo allo Spadaccino del proprietario. Autorità, avvisi, confronto e
applicazione delle modifiche restano aperti; nessun reinserimento manuale imposto. Q056 confermata il 15/09/2026, I-067.

## R049 — copie per creare varianti in libreria

Consultazione: 15/09/2026, dopo Q056. Fonte primaria aperta; data/versione non indicate,
nessuna verifica runtime.

[Foundry — Items](https://foundryvtt.com/article/items/) documenta Items Directory → menu
contestuale → Duplicate per creare una copia; clic sull'elemento riapre la scheda modificabile.
Il percorso mostrato è quello del GM. Documenta inoltre che l'elemento aggiunto al personaggio
è separato dall'originale e le modifiche non si propagano nei due sensi: riscontro per R048/I-067.

**Proposta Q057:** trasferire il principio alla libreria personale: duplicare un proprio talento
homebrew, modificare la copia e mantenere l'originale. Permessi dell'autore e collocazione del
comando sono un adattamento da definire. Non dedurre duplicazione di ogni categoria sulla
scheda, sincronizzazione fra varianti, pubblicazione o assegnazione doppia dei benefici.
Q057 confermata il 15/09/2026, I-068, con una risposta distinta da quella su I-067.

## R050 — modificatori condizionati e domanda al giocatore prima del tiro

Consultazione: 15/09/2026, dopo Q057. Fonte primaria riaperta; nessun test runtime.

[Roll20 — D&D Homebrew Character Builder Is Here](https://blog.roll20.net/posts/dd-homebrew-character-builder-is-here/),
19/11/2025. La sezione Feature and Modifier Builder documenta capacità, risorse, difese e
modificatori. In Query Mode la scheda può chiedere se applicare un modificatore al tiro scelto,
per verificare la situazione pertinente. Documenta anche configurazione tramite menu e scelte.
Non dimostra che Query Mode sia il default, né un riconoscimento automatico di qualsiasi testo.

**Proposta Q058:** adottare la richiesta prima del tiro per una condizione narrativa che l'app
non può verificare. Il caso inventato è vantaggio a Persuasione quando il personaggio fa leva
sulla reputazione della sua gilda. La domanda risolve chi fornisce il dato mancante, non riapre
I-027 sui calcoli automatici. Condizione verificata dal giocatore, modificatore applicato
automaticamente se confermato, nessuna approvazione digitale obbligatoria del DM. Quest'ultimo
mantiene la facoltà di correggere. Il default per questo caso è la proposta confermata il 15/09/2026, I-069; non generalizzarla a ogni tiro.

La guida [Beyond — Design Workshop: Feats](https://www.dndbeyond.com/posts/168-design-workshop-feats),
13/03/2018, già in R045, è stata riaperta: distingue descrizione e inserimento di modificatori,
incantesimi e usi limitati. Non prova questa specifica richiesta prima del tiro e non viene
usata come sostegno di Q058. Le indicazioni di bilanciamento del 2018 non sono regole 2024.

## R051 — dettaglio dei valori dei tiri

Consultazione: 15/09/2026, dopo Q058; documentazione del modulo aperta, nessuna prova runtime.

[Sephral's Roll Breakdown](https://foundryvtt.com/packages/sephrals-roll-breakdown), modulo
Foundry 1.0.0, compatibilità dichiarata v13–14, verificata v14; data assoluta non esposta.
Il pannello Breakdown nella scheda del messaggio separa dadi, modificatori e valori derivati;
mostra le cause di vantaggio/svantaggio solo quando i dati le espongono. Ha impostazioni di
visibilità ed espansione. È un modulo aggiuntivo, non il comportamento base di Foundry.
Non dimostra input fisico equivalente o copertura universale: quei requisiti provengono dal
proprietario, I-027 precisata, I-032/I-034. Nessuna adozione del limite ai soli tiri supportati,
di impostazioni che nascondano dettagli dovuti o di un layout specifico. Non inventare fonti.

La rilettura della guida Beyond già in R045/R050 distingue descrizione ed elementi della
scheda; non è stata usata per dedurre una decisione sull'homebrew parzialmente automatizzato.

## R052 — dare un oggetto a un altro giocatore con accettazione

Consultazione: 15/09/2026, preparazione Q059. Fonti primarie dei moduli aperte; nessun test runtime.

[Give Items Between Players](https://foundryvtt.com/packages/give-item-to-player), densimon,
versione 1.0.2; compatibilità Foundry 13.332–13.350, verificata 13.350, D&D5e 4.0.0+ dichiarata.
Date relative esposte, nessuna data assoluta fissata. Dal pulsante accanto all'oggetto si
sceglie destinatario e quantità. Il ricevente accetta o rifiuta; l'accettazione sottrae e
aggiunge agli inventari. Il passaggio non richiede intervento del GM. È un modulo aggiuntivo.

[Item Piles](https://foundryvtt.com/packages/item-piles), versione elencata 3.3.4, Foundry
13–14 verificata 14. Conferma commercio tra giocatori, ma la pagina letta non specifica
l'accettazione: non usarla da sola come prova della scelta Q059.

**Raccomandazione Q059:** offerta e accettazione del ricevente per il passaggio tra due giocatori
presenti, fuori combattimento e con personaggi vicini. Protegge la scelta su cosa entra nel
proprio inventario, lasciando automatico il trasferimento. Non approva restrizioni su utenti
assenti, eliminazione delle righe a zero, segnalazioni private al GM, distanze o costo in azioni
solo perché presenti o assenti nel riferimento. Nessun consenso universale di mercato dedotto.
Q059 confermata il 15/09/2026, I-070. Il proprietario suggerisce popup o controllo analogo
al riferimento. La finestra è documentata anche dal README del progetto, riaperto per R053.

## R053 — passaggio fra personaggi controllati dallo stesso utente

Consultazione: 15/09/2026, dopo Q059. Lettura di documentazione e codice pubblici; nessun test runtime.

[Item Piles — Trading](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/docs/trading.md),
revisione `85ab971406623fb1c5d01eb1f093fe4855ede6e4`, commit del 18/07/2026. La documentazione
conferma che trascinare un oggetto sul token di un altro giocatore gli propone accetta/rifiuta:
ulteriore riscontro della scelta I-070, non disponibile nella sola scheda del catalogo R052.

[Item Piles — gestione del passaggio](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/src/API/private-api.js#L1999),
stessa revisione, righe 1999–2086 lette. Dopo selezione/controlli di quantità, il ramo 2074–2080
esegue il trasferimento direttamente quando il destinatario risolto è l'utente corrente e
quest'ultimo ha proprietà su entrambi i personaggi. Il ramo successivo inoltra la richiesta
all'altro utente. Questo verifica l'assenza di una seconda accettazione nel caso Q060 con
un solo controllore per entrambi; non dimostra una regola universale per tutti i comproprietari.

Il [README di Give Items Between Players](https://github.com/simonvdv/FoundryVTT-giveitem)
è stato riaperto: finestra accetta/rifiuta e trasferimento automatico, ma non documenta questa
scorciatoia fra personaggi dello stesso utente. La pagina web Item Piles con route Trading
non esponeva testo; letta la documentazione nel repository alla revisione sopra.

**Raccomandazione Q060:** conservare il passaggio diretto fra i due propri personaggi, senza
accettare nuovamente come destinatario. Scelta/quantità rimangono esplicite. Controllo condiviso,
regole di distanza, azioni, annullamento e offline restano aperti. Fonte di un modulo aggiuntivo;
nessuna installazione, dipendenza o trasposizione del suo codice approvata. Q060 confermata
il 15/09/2026, I-071.

## R054 — più oggetti e monete nella stessa offerta

Consultazione: 15/09/2026, dopo Q060. Documentazione primaria riaperta; nessun test runtime.

[Item Piles — Trading](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/docs/trading.md),
revisione `85ab971406623fb1c5d01eb1f093fe4855ede6e4`, commit del 18/07/2026. La finestra di scambio
raccoglie gli oggetti trascinati dalle schede e le monete inserite con Add Currency. Le parti
approvano la proposta; aggiungere un oggetto dopo un'approvazione la azzera. Il documento
mantiene anche il percorso rapido per dare un solo oggetto tramite il token del destinatario.

**Raccomandazione Q061:** offrire due pozioni, una spada e monete come un unico insieme,
con riepilogo e accettazione complessiva del ricevente. È un uso del contenitore di scambio
per un'offerta in una sola direzione; non introduce ora baratto obbligatorio o contropartite.
La scelta aggiunge il passaggio multiplo, preservando quello singolo. Accettazione parziale,
controproposte e modifiche dopo un'approvazione rimangono punti da approfondire. Non dedurre
una garanzia tecnica di transazione atomica dal solo documento. Fonte di un modulo aggiuntivo.
Q061 confermata il 15/09/2026, I-072. Aggiunto il caso I-073 delle richieste ravvicinate.

## R055 — più richieste allo stesso destinatario

Consultazione: 15/09/2026, richiesta esplicita dopo Q061. Fonti primarie e codice letti;
nessuna prova runtime o osservazione delle finestre sullo schermo.

**Item Piles, revisione `85ab971406623fb1c5d01eb1f093fe4855ede6e4`, commit 18/07/2026.**
Nel [gestore degli scambi](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/src/API/trade-api.js#L169)
le richieste ricevono identificatori distinti; gli scambi avviati hanno dati separati in una
mappa per identificatore. Il percorso di risposta crea la richiesta e poi lo scambio pertinente.
La [finestra della richiesta](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/src/applications/trade-dialogs/trade-dialogs.js#L65)
crea una nuova istanza a ogni invocazione e annulla per identificatore. L'app di scambio mantiene
il proprio identificatore. Riscontro: richieste/scambi separati; nel percorso letto non compare
una coda di presentazione o un blocco globale quando il destinatario è occupato. Non attribuire
al modulo la nostra futura lista, un ordine di focus verificato o assenza di ogni possibile bug.
Questo esame riguarda l'avvio dello scambio completo, non prova tutti i percorsi di dono rapido.

**Steam.** [Annuncio Valve sulle Trade Offers](https://store.steampowered.com/oldnews/11395),
04/09/2013, aperto. Documenta notifiche, pagina delle offerte pendenti e risposte individuali;
più offerte possono coesistere. È un precedente pubblicato storico, non un test del client attuale.
La [documentazione Steamworks](https://partner.steamgames.com/doc/webapi/ieconservice?language=english)
conferma la lettura di offerte inviate/ricevute; non dimostra da sola la UI. Le FAQ Steam aperte
restituivano solo un'immagine, perciò non vengono dichiarate lette. Non adottare scadenza di due
settimane, vincoli economici, uso da offline o regole sugli oggetti contesi dall'annuncio.

**Raccomandazione Q062:** riprendere la raccolta di offerte pendenti di Steam, mantenendo
separate le richieste anche dallo stesso mittente. Per la nostra app proporre un solo dettaglio
aperto e una segnalazione delle nuove offerte: gli arrivi non sostituiscono né interrompono la
richiesta che si sta valutando. La persona sceglie quale aprire, senza obbligo di rispondere in
ordine d'arrivo. Lista + mancata interruzione è l'adattamento consigliato, non una replica della
UI Item Piles né un comportamento di focus dimostrato per Steam. Popup suggerito I-070 compatibile
con il dettaglio scelto; nessuna pagina approvata. Q062 confermata il 15/09/2026, I-074,
senza attribuire unanimità ai prodotti o trasformare la risposta in delega generale.

**Casi da approfondire:** offerte legittime ripetute distinte da reinvio dello stesso comando;
stesso oggetto o monete promessi più volte; doppia accettazione, modifica/revoca durante la lettura,
disconnessione, tempi e notifiche ai mittenti. L'annuncio Steam invalida offerte concorrenti con
oggetti già scambiati: è ricerca per il successivo confronto, non una decisione adottata qui.

## R056 — correggere un'offerta ancora pendente

Consultazione: 15/09/2026, dopo Q062. Documentazione primaria e codice letti; nessun test runtime.

[Item Piles — Trading](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/docs/trading.md),
revisione `85ab971406623fb1c5d01eb1f093fe4855ede6e4`, commit 18/07/2026, riaperta. Aggiungere un
oggetto allo scambio dopo un'approvazione azzera l'accordo. Nel [gestore dei contenuti dello
scambio](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/src/applications/trading-app/trade-store.js#L106),
righe 106–139 lette, gli aggiornamenti ricevuti su oggetti e monete azzerano entrambe le
accettazioni e aggiornano i contenuti dello stesso scambio. Verificata quindi anche la
variazione delle monete, oltre all'aggiunta descritta nella guida. Non prova una nostra UI che
evidenzi differenze né l'assenza di ogni race condition nell'intero modulo.

[EVE Online — Direct Trade](https://support.eveonline.com/hc/en-us/articles/14142146096412-Direct-Trade),
aggiornato il 03/07/2024. Documenta revisione dei contenuti e conferma di entrambi, ma non
specifica l'azzeramento al cambiamento: è un confronto adiacente, non la prova di Q063.
Non trasferire regole economiche o responsabilità dell'utente per frodi.

**Raccomandazione Q063:** il mittente può correggere la stessa proposta inviata finché è
pendente, aggiornando il contenuto mostrato al destinatario. L'accettazione deve riferirsi
al contenuto aggiornato; il sì precedente non vale per oggetti o importi diversi. Trasferire
il principio di Item Piles alla nostra offerta con un solo mittente, senza aggiungere una
seconda conferma ordinaria dopo quella che già conclude il passaggio. Segnalazione della
modifica ed esatto percorso rimangono da definire; nessuna seconda offerta creata implicitamente.
Il caso riguarda una richiesta esistente, non nuovi arrivi coperti da I-074. Q063 confermata
il 15/09/2026 tramite delega circoscritta, I-075; nessuna delega alle domande successive.

## R057 — stesso oggetto in più offerte ancora pendenti

Consultazione: 15/09/2026, dopo Q063. Fonte primaria pubblicata riletta; nessuna prova runtime.

[Valve — New Steam Trading Feature: Trade Offers](https://store.steampowered.com/oldnews/11395),
04/09/2013. La FAQ nell'annuncio permette esplicitamente di includere gli stessi oggetti in
più offerte. Quando una viene accettata, le altre offerte pendenti con gli stessi oggetti
scadono. È una prova diretta della scelta fra offerte concorrenti e riserva esclusiva, non
soltanto della possibilità di ricevere più richieste. Fonte storica, senza versione del client
specificata: non presentarla come verifica runtime dell'interfaccia attuale. Le FAQ correnti
non erano leggibili nell'accesso effettuato, come registrato in R055.

**Percorso documentato:** la pagina Trade Offers si raggiunge dall'inventario e raccoglie le
offerte pendenti; una notifica avvisa il destinatario, che può accettare o rifiutare. Questo
conserva il riferimento per I-049. L'annuncio non dimostra un avviso specifico quando un'altra
offerta rende indisponibile l'oggetto: non inventare testo, badge o ordine di aggiornamento.

**Raccomandazione Q064:** permettere di proporre la stessa singola pozione a due persone,
senza riservarla alla prima offerta inviata. La prima accettazione valida che conclude il
trasferimento assegna l'oggetto; le altre offerte incompatibili decadono. L'alternativa è
riservarlo e dover ritirare la prima proposta prima di offrirlo altrove. Il consiglio trasferisce
il pattern di disponibilità, senza importare il mercato Steam. Nessuna prova di consenso fra
tutti i VTT, né garanzia tecnica dedotta dall'annuncio. Non riaprire il requisito di evitare
trasferimenti duplicati: la scelta nuova è ammettere offerte concorrenti senza prenotazione.

**Confini:** I-072 conserva l'accettazione dell'intera offerta; non adottare trasferimenti
parziali impliciti. Quantità aggregate, monete, consumo dell'oggetto nel frattempo, notifiche,
recupero, conferme simultanee, controllori condivisi e offline rimangono da approfondire.
La scadenza generale di due settimane, le controproposte e i vincoli economici documentati
nell'annuncio non sono adottati. Q064 confermata il 15/09/2026, I-076, con la propria risposta.

## R058 — bottino comune prima dell'assegnazione ai personaggi

Consultazione: 15/09/2026, dopo Q064. Fonti primarie pubblicate; nessuna prova runtime.
Conservata la ricerca precedente sul bottino, senza riutilizzarne scenari o mappe come autorità.

[Shard — Using the Character Sheet](https://www.shardtabletop.com/howto/using-character-sheet),
Darren Shakib, data visibile 22 agosto senza anno nella pagina estratta; versione non indicata.
Nella sezione Equipment il pulsante Shared Treasure compare per personaggi in una campagna:
mostra il tesoro condiviso e permette di prenderlo. Le ricompense concesse dal DM sono aggiunte
lì. Documentato anche il ritorno di un oggetto al comune dall'equipaggiamento, tramite Trash;
questo percorso aggiuntivo non è adottato in Q065. Il riferimento sostiene una disponibilità
comune prima del passaggio alle schede, senza dimostrare peso, custodia o accesso da ogni luogo.

[Shard — DM Quick Start](https://www.shardtabletop.com/blog/building-quick-start) mostra un
comando per concedere le ricompense dal tracker e aggiungerle a Shared Treasure, ma dichiara
esplicitamente di essere superato da Quickstart Revisited. Non usarlo per attestare un controllo
attuale. La raccomandazione si fonda sulla guida alla scheda sopra, non sul vecchio quickstart.

[Item Piles — Creating item piles](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/docs/creating-item-piles.md),
revisione `85ab971406623fb1c5d01eb1f093fe4855ede6e4`, commit 18/07/2026. I giocatori aprono il
mucchio con doppio clic; occorre un token vicino, salvo diversa distanza configurata. Il DM
può ispezionare come un personaggio selezionato. I prelievi vanno al suo inventario. La guida
separa accesso agli oggetti e ripartizione delle monete configurabili. È un modulo aggiuntivo
Foundry: modello di bottino sulla scena, non prova di un deposito di campagna senza distanza.
Nessun default delle monete o controllo gestuale viene adottato da questa lettura.

**Raccomandazione Q065:** aggiungere il bottino condiviso come in Shard. Il DM rende disponibili
le ricompense al gruppo; restano da assegnare finché i giocatori prendono gli oggetti per il
proprio personaggio. L'alternativa è assegnare direttamente ogni oggetto a una scheda, senza
deposito comune. La possibilità proposta non obbliga ogni ricompensa a passare dalla lista.
Non è dimostrata una soluzione identica in tutti i VTT. Collocazione e comandi precisi saranno
definiti nelle pagine; conservati i percorsi delle fonti per I-049.

**Confini:** custodia, peso, contenitori, distanza, combattimento, segreti/identificazione,
monete e ripartizione, contributi dei giocatori, prelievi contemporanei e rete restano aperti.
I casi degli scambi non sono chiusi dal cambio di scenario. Q065 confermata il 15/09/2026
tramite delega circoscritta, I-077; ribadita la qualità della combinazione, I-058.

## R059 — chi trasporta gli oggetti dell'inventario condiviso

Consultazione: 15/09/2026, dopo Q065. Fonti primarie pubblicate; nessuna prova runtime.

[Adventure Codex — How to Track Party Loot as a Group](https://adventurecodex.app/guides/track-party-loot/),
aggiornata il 07/07/2026, versione non indicata. La guida descrive un inventario condiviso con
associazione dei singoli oggetti a personaggi specifici per sapere chi li porta, da aggiornare
quando cambiano mano. Presenta il servizio Table come spazio con bottino, monete e cronologia
comuni. Il riferimento è una guida di prodotto, non un'osservazione dell'interfaccia. Non
mostra i controlli esatti, due distinti campi proprietario/portatore, né un calcolo automatico
del peso sul portatore. La pagina Help non aggiunge questi dettagli e la homepage non restituiva
testo. Non attribuire funzioni non verificate al prodotto o un consenso di tutto il mercato.

[Fantasy Grounds Forge — Party Inventory Weight](https://forge.fantasygrounds.com/shop/items/18/view),
autore bmos; compatibilità dichiarata con FGU 4.5.0 del 21/02/2024, CoreRPG, Pathfinder 1e e
D&D 3.5E. L'estensione aggiunge peso totale a inventario del gruppo e pacchi di tesoro; una
capacità massima facoltativa permette di evidenziare le soglie del totale. Include peso delle
monete se attivato nelle opzioni. È un confronto sul carico complessivo, non prova che assegni
il peso a un portatore o supporti nel dettaglio il nostro motore 2024. Nessuna installazione.

**Raccomandazione Q066:** consentire di indicare il personaggio che porta un bene del gruppo,
lasciandolo riconoscibile nel bottino comune. La corda comune può essere nello zaino del
guerriero senza diventare un secondo oggetto. Si riprende il modello descritto da Adventure
Codex; la distinzione esplicita fra proprietà del gruppo e custodia è l'adattamento proposto,
non una UI a due campi attribuita alla fonte. L'alternativa è tenere solo l'elenco comune e
ricordare fuori dall'app chi trasporta cosa. Percorso e controllo precisi richiedono ulteriore
ricerca nella definizione delle pagine, secondo I-049.

**Confini:** nessun obbligo di assegnare subito un portatore, nessuna politica del peso o
limite all'uso deciso qui. Disponibilità a distanza, permessi, conferme, dati mancanti,
contenitori, carri/depositi, sincronizzazione e visibilità restano aperti. Q066 confermata
il 15/09/2026, I-078. BG3 ribadito come riferimento principale, senza attribuirgli questo
adattamento: R060 riprende il confronto diretto con Larian.

## R060 — BG3 e consultazione degli inventari degli altri giocatori

Consultazione: 15/09/2026, dopo Q066 e il richiamo a BG3 come riferimento principale.
Fonti ufficiali Larian lette; nessuna prova runtime, immagine prodotta o nuova UI approvata.

[Larian — Community Update 12, Patch 4: Nature's Power](https://baldursgate3.game/news/community-update-12-patch-4-nature-s-power_21),
25/02/2021, fase Early Access. La sezione sui miglioramenti di esperienza dichiara che nel
multiplayer si possono vedere equipaggiamento, inventario, incantesimi e schede degli altri
giocatori. È riscontro diretto per la consultazione dell'inventario personale di un compagno;
la raccomandazione non importa automaticamente gli altri dati elencati nella nota.

[Larian — Patch 3: Mac Support, Magic Mirror & More](https://baldursgate3.game/news/patch-3-mac-support-magic-mirror-more_93),
22/09/2023, versione completa. La sezione UI descrive la Party View delle schede, ordinata
come la Party Line; corregge filtri durante il trascinamento fra inventari e il peso massimo
mostrato nell'intestazione dell'inventario di ciascun personaggio. Sono precedenti per una
vista del gruppo che conserva gli inventari dei singoli, non prova che BG3 separi proprietà
collettiva e custodia come I-078. Il controllo preciso di apertura, ricerca e impaginazione
sui dispositivi richiede approfondimento nelle pagine. Nessuna asserzione di test sul client attuale.

**Raccomandazione Q067:** consentire normalmente a ogni giocatore di consultare gli inventari
personali dei personaggi del gruppo, oltre al bottino comune, per sapere chi ha una pozione.
Si segue il comportamento multiplayer pubblicato da Larian. L'alternativa è limitare la
consultazione ordinaria al proprio inventario e al comune. Consultare non autorizza prelievo,
uso o modifica: i relativi percorsi e permessi restano quelli concordati o da approfondire.
Non introdurre teletrasporto di risorse o deroghe alle azioni in combattimento dal solo riferimento.

**Confini:** eccezioni di riservatezza, oggetti non identificati, monete, proprietà dettagliate,
assenti, uscita dal gruppo, distanza e rete restano aperti. Nessuna visibilità di appunti privati,
altri gruppi o nemici adottata. La consultazione delle intere schede è fuori da questa domanda.
BG3 resta principale; gli altri confronti sono conservati. Q067 confermata il 15/09/2026, I-079.

## R061 — visibilità selettiva degli oggetti dell'inventario

Consultazione: 15/09/2026, dopo Q067. Fonti primarie, README e manifest letti; nessun test runtime.

[Larian — Patch 1](https://baldursgate3.game/news/patch-1-now-live_87), 25/08/2023, sezione
Usability: un inventario bloccato impedisce interazioni degli altri giocatori, fra cui uso e
invio di oggetti. È riscontro sui permessi di operazione, non prova che il contenuto sia
nascosto. Non usarlo per attribuire a BG3 una funzione di segretezza per oggetto.

[Party Inventory — scheda Foundry](https://foundryvtt.com/packages/party-inventory), autore
Whistler/Tero Parvinen. Il [README alla revisione b688b99c96bcd945365beaf808249e40ebcd10d1](https://github.com/teroparvinen/foundry-party-inventory/blob/b688b99c96bcd945365beaf808249e40ebcd10d1/README.md),
commit 10/07/2023, descrive un controllo per scegliere quali oggetti dei personaggi compaiono
nell'inventario del gruppo. Nella scheda dnd5e è un'icona di gruppo vicino al comando per
equipaggiare; in Tidy5e è nel menu dell'oggetto. L'elenco comune si apre dall'intestazione della
scheda o dai controlli dei token. Gli oggetti rimangono trasportati dal personaggio e viene
mostrato chi li possiede: ulteriore riscontro utile per I-078, senza modificare quella decisione.

Il manifest alla stessa revisione dichiara versione 11.0, compatibilità minima/verificata
Foundry 11. La scheda di catalogo presenta anche un campo latest non concordante: non dedurre
compatibilità attuale da quel campo. Precedente storico di un modulo aggiuntivo, non funzione
core. Escludere un oggetto dalla lista comune non prova protezione da ogni altra vista, API o
permesso della scheda: non affermare che sia un sistema completo di riservatezza.

**Raccomandazione Q068:** riprendere il controllo per singolo oggetto per consentire al
giocatore di nascondere ai compagni un oggetto personale, lasciando visibile il resto. Lo
vedono i controllori del personaggio e i DM. La coerenza della riservatezza nelle nostre viste
è l'adattamento proposto; I-079 resta la regola ordinaria. L'alternativa è non avere eccezioni
per oggetto. Non presentare come consenso del mercato né come identico comportamento BG3.

**Confini:** aggiunta riservata, rivelazione, cronologia, ricerca, conteggi/peso, contenitori,
uso e trasferimento, cambi di controllo e offline restano aperti. Non nascondere per deduzione
beni comuni o inventari interi. Nessuna nuova regola per occultare fisicamente oggetti nel
mondo di gioco. Q068 confermata il 15/09/2026, I-080; nessuna pagina approvata.

## R062 — presentazione di un oggetto non identificato

Consultazione: 15/09/2026, dopo Q068. Fonti primarie pubblicate; nessuna prova runtime.

[Fantasy Grounds — 5E Item Sheet and Treasure Parcels](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996641969/5E+Item+Sheet+and+Treasure+Parcels),
Derek Batting, aggiornato il 01/04/2025. Il DM apre Items, crea o modifica un oggetto e usa
il simbolo Identify per impostare Not Identified prima della consegna. Non-ID Name e Non-ID
Notes contengono nome e descrizione apparenti; la descrizione completa è mostrata ai giocatori
solo se l'oggetto è identificato. Il documento descrive anche il default Identified, che non
viene adottato da Q069. Versione del software non indicata. Riscontro diretto dei due livelli
di informazione e del comando del DM; nessuna regola 2024 dedotta dalla UI.

[Forien's Unidentified Items](https://foundryvtt.com/packages/forien-unidentified-items),
modulo aggiuntivo Foundry, versione elencata 1.0.3 per Foundry 10. Mystify si trova nel menu
contestuale o nell'intestazione della scheda; crea un oggetto apparentemente vuoto e modificabile.
Il GM può consultare l'originale e usare Identify per ripristinarne i dati. La descrizione
sostiene il doppio livello di informazione, ma non impone alla nostra app la creazione di una
copia o quella rappresentazione dei dati. Fonte storica; nessuna compatibilità attuale provata.

[Solasta — Sorcerer Update Patch Notes](https://www.solasta-game.com/solasta-crown-of-the-magister/news/131-sorcerer-update-patch-notes),
Tactical Adventures. La sezione Known Issues descrive il percorso dall'incantesimo Identify
all'inventario, con selezione dell'oggetto; cambiare scheda poteva interromperlo nella versione
trattata. È prova pubblicata del percorso, non dei nomi/descrizioni alternativi né di un bug
ancora presente. Data/versione non rilevate nel passaggio consultato. La ricerca ufficiale su
BG3 non ha fornito un riscontro pertinente: non affermare che lo stesso sistema vi esista o
che l'assenza del risultato ne dimostri l'assenza nel gioco.

**Raccomandazione Q069:** permettere al DM di consegnare un oggetto non identificato con nome
e aspetto visibili preparati, mantenendo riservate le proprietà ignote anche al possessore.
Riprendere Fantasy Grounds e Forien. L'alternativa è mostrare subito i dettagli registrati.
È distinta dalla riservatezza I-080: l'anello può essere visibile a tutti senza che nessuno
ne conosca ancora il vero effetto. Nessuna identificazione automatica o obbligatoria adottata.

**Confini:** modalità di scoperta e fonti 2024, effetti prima dell'identificazione, segreti che
possono rimanere tali, dati laterali che rivelano l'identità, conoscenze individuali, correzioni,
trasferimenti e rete restano da approfondire. Q069 confermata il 15/09/2026, I-081; nessuna pagina approvata.

## R063 — identificazione e condivisione delle proprietà scoperte

Consultazione: 15/09/2026, dopo Q069. Fonti primarie pubblicate, nessuna prova runtime.

### Precedente di prodotto per Q070

[Fantasy Grounds — 5E Item Sheet and Treasure Parcels](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996641969/5E+Item+Sheet+and+Treasure+Parcels),
Derek Batting, aggiornato 01/04/2025, fonte R062 ricontrollata. Il comando Identify cambia
lo stato dell'oggetto e la descrizione mostrata ai giocatori. La stessa guida documenta
separatamente la condivisione pubblica o con giocatori specifici: icona di gruppo/persona,
oppure collegamento trascinato sul ritratto. Versione applicativa non indicata. Precedente
per distinguere accesso al documento e stato identificato; non prova di un registro delle
conoscenze per ogni personaggio o dello stesso nostro inventario condiviso.

**Raccomandazione Q070:** col gruppo riunito e un oggetto del bottino comune identificato,
mostrare subito le proprietà scoperte a chi può consultarlo. Adattamento esplicito del
precedente al prodotto: la normale comunicazione al gruppo non richiede un comando aggiuntivo.
Alternativa: prima solo l'identificatore, poi condivisione esplicita. Questa politica non
è imposta dalle regole di D&D e rimane una proposta da sottoporre al proprietario.

### Contesto delle regole, distinto dalla scelta di prodotto

[Wizards/D&D Beyond — Equipment, Basic Rules 2024](https://www.dndbeyond.com/sources/dnd/br-2024/equipment),
sezioni Identifying a Magic Item e Attunement. L'identificazione non è automatica al possesso:
si può usare Identificare oppure studiare un oggetto a contatto durante un riposo breve,
scoprendone proprietà e uso alla fine. Le maledizioni non sono rivelate da quello studio.
L'assaggio identifica una pozione; sperimentare con altri oggetti può dare indizi.
Studiare e ottenere sintonia non usano lo stesso riposo breve. Esempi per i percorsi:
anello studiato e ancora non in sintonia; pozione assaggiata; scoperta incompleta da un indizio.

[Wizards/D&D Beyond — Identify, Basic Rules 2024](https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions#Identify):
incantesimo di livello 1, un minuto o rituale, contatto mantenuto durante il lancio, componenti
V/S/M con perla da almeno 100 mo. Rivela proprietà, uso, requisito di sintonia, cariche e
incantesimi pertinenti. Il testo non richiede una prova di abilità. Non inventare una CD.
[Magic Items — Cursed Items](https://www.dndbeyond.com/sources/dnd/br-2024/magic-items#CursedItems)
precisa che la maggior parte dei metodi, incluso Identificare, non rivela le maledizioni.
Non descrivere quindi Identificare come rivelazione di ogni dato privato del DM.

Fonti ufficiali web dell'edizione 2024, consultate come contesto dell'intervista; non sono
nuove regole eseguibili né revisioni immutabili. Il corpus SRD 5.2.1 EN/IT già fissato in
`evidence/experience-01/rules.md` resta la baseline: fissare riferimenti ed esempi pertinenti
quando si dettaglierà il contratto delle regole. Nessuna house rule o nuova CD scelta qui.

### Percorso adiacente conservato per le attività durante i riposi

[Ionrift Respite — catalogo Foundry](https://foundryvtt.com/packages/ionrift-respite), autore
IonRift, versione elencata 3.5.3, Foundry 12+ verificata 14 secondo l'autore; consultazione
15/09/2026, nessuna verifica locale della compatibilità. Descrive un flusso di riposo con
attività scelte dai giocatori e banco di lavoro per identificare gli oggetti del gruppo:
Identify rivela nome e proprietà. È un modulo aggiuntivo, non Foundry core. La scheda non
basta per stabilire destinatari esatti della rivelazione o fedeltà completa alle regole 2024.
Non adottare i suoi profili di riposo, house rule, costi di altre attività o controlli del DM
solo perché adiacenti. Conservare il precedente per I-049 e A5/A6/A7.

**Confini:** Q070 riguarda gruppo riunito e bottino visibile. Oggetti riservati I-080, maledizioni
non scoperte, gruppi separati, assenti, scelta di tenere una scoperta privata, rivelazione
parziale, cronologia, trasferimenti e rete restano aperti. I-006/I-027 già danno l'indirizzo
per le conseguenze automatiche determinabili; i dettagli dei metodi saranno approfonditi
senza chiedere un altro sì al principio. Q070 confermata il 15/09/2026, I-082; nessuna pagina approvata.

## R064 — confronto consultabile con l'oggetto equipaggiato

Consultazione: 15/09/2026, dopo Q070. Fonte primaria pubblicata; nessuna prova runtime.

[Larian — BG3 Patch 7](https://baldursgate3.game/news/patch-7-now-live_121), 05/09/2024,
sezione Controller: confronto fra oggetto esaminato e attualmente equipaggiato tramite tooltip,
ora attivabili/disattivabili. La nota cita anche un margine per non coprire i suggerimenti
sui comandi. Riscontro diretto della funzione e del controllo di visibilità, non del tasto
preciso o di ogni campo. La pagina contiene un aggiornamento successivo sulla disponibilità
Mac/console; non attribuirlo alla data iniziale. Nessuna verifica del client attuale.

**Raccomandazione Q071:** poter richiamare e nascondere il confronto con l'equipaggiamento
attuale mentre si esamina un nuovo oggetto, senza equipaggiarlo. Caso: armatura nello zaino
contro quella indossata. Riprendere BG3 per confrontare caratteristiche e requisiti noti,
lasciando il confronto disponibile quando serve. Alternativa: dettagli consultabili solo
separatamente. Questo sostiene I-003/I-049 e semplicità I-058; non è consenso unanime del mercato.

**Limiti:** la nota non dimostra una simulazione completa dei valori del personaggio, un
punteggio universale di convenienza, né il comportamento su oggetti con sintonia, due anelli,
mani/armi incompatibili o proprietà segrete. Non dedurre un gesto per mouse/tocco dal controller.
Il prossimo approfondimento deve distinguere confrontare, equipaggiare e ottenere sintonia,
con le regole 2024 già introdotte in R063. Campi, calcoli, scelta del termine di confronto,
negozi e bottino, altri personaggi, default e dispositivi/rete rimangono aperti.
Q071 confermata il 15/09/2026, I-083; nessuna pagina o sostituzione automatica approvate.

## R065 — cambiare il termine di confronto fra più oggetti equipaggiati

Consultazione: 15/09/2026, dopo Q071. Fonti primarie pubblicate; nessun test runtime.

[Eleventh Hour Games — Quality of Life, Dungeon & Other Improvements](https://forum.lastepoch.com/t/quality-of-life-dungeon-other-improvements-coming-to-last-epoch-april-17th/75217),
10/04/2025, annuncio ufficiale per Last Epoch Season 2: Tombs of the Erased, sezione Comparing
Off-hand Feature. Nel confronto con l'equipaggiamento, CTRL seguito da ALT cambia il termine
al secondo anello/arma secondaria. Pubblica anche un percorso con controller, L3 poi R3.

[Last Epoch — Tombs of the Erased Patch Notes, messaggio 9](https://forum.lastepoch.com/t/last-epoch-tombs-of-the-erased-patch-notes/75247/9),
11/04/2025, sezione Off-hand Weapon & Ring Comparison: conferma il confronto con l'oggetto
alternativo anziché quello ordinario e CTRL poi ALT. Per controller riporta R3 poi L3,
ordine opposto all'annuncio. Conservare il riscontro della capacità; ordine esatto dei tasti
non risolto né adottato. Non affermare di avere osservato il client attuale o i video incorporati.

**Raccomandazione Q072:** con due anelli indossati e un nuovo anello da esaminare, mantenere
il nuovo nel confronto e scegliere uno alla volta gli altri. Riprendere Last Epoch. Alternativa:
mostrare tutti e tre insieme. La leggibilità attesa del confronto limitato è motivazione
progettuale, non una prova di usabilità. BG3 resta il riferimento principale, R064; la ricerca
nelle sue fonti ufficiali non ha dato prova specifica di questo passaggio fra anelli.

**Confini:** due anelli sono un esempio, non un limite D&D. Nessuna scelta automatica di cosa
sostituire, nessun gesto/slot/limite importato dal videogioco. Campi, calcoli sul personaggio,
sintonia, numero maggiore di termini, primo mostrato, altri personaggi, controller/tastiera/tocco,
accessibilità e rete restano aperti. Q072 confermata il 15/09/2026, I-084; nessuna pagina approvata.

## R066 — selezione dei personaggi che partecipano a un riposo

Consultazione: 15/09/2026, dopo Q072. Documentazione primaria e codice pubblico letti, nessun
runtime. La dipendenza della sintonia dal riposo, R063, apre il ramo A6; non chiude A7/F-003.

[Rest Recovery 5e — catalogo Foundry](https://foundryvtt.com/packages/rest-recovery/), modulo
aggiuntivo mantenuto da Michael R., origine Fantasy Computerworks. La versione elencata 5.2.5
indica Foundry 13–14, verificata 14.366 dall'autore. La descrizione generale non basta da sola
per dimostrare la selezione dei partecipanti; verificati i documenti e il sorgente collegati.

[Documentazione API dell'autore](https://github.com/roth-michael/FoundryVTT-RestRecovery/blob/06febe73ce5c250e006381549be52362418725a8/docs/api.md)
e [pannello dei partecipanti](https://github.com/roth-michael/FoundryVTT-RestRecovery/blob/06febe73ce5c250e006381549be52362418725a8/templates/prompt-rest.hbs),
revisione `06febe73ce5c250e006381549be52362418725a8`, commit 03/09/2026. La funzione di richiesta
accetta i personaggi destinatari. Il pannello contiene selettori del personaggio, aggiunta e
rimozione dalla lista, comandi di riposo breve/lungo. Il codice
[`promptRest.js`](https://github.com/roth-michael/FoundryVTT-RestRecovery/blob/06febe73ce5c250e006381549be52362418725a8/scripts/apps/promptRest.js#L155)
indirizza la richiesta soltanto ai personaggi della selezione. È il precedente concreto per
un riposo che non coinvolge necessariamente tutta la compagnia.

**Versione e limiti:** il manifest del sorgente consultato ha versione `AUTOMATIC` e compatibilità
Foundry 14, verificata 14.367; non equipararlo alla release 5.2.5 del catalogo. Nessun file del
prodotto è stato installato o eseguito. Il percorso di apertura del pannello non è stato
verificato nella UI; sono verificati i controlli definiti nel template e il loro collegamento.
La fonte non prova un simulatore di attività contemporanee o il comportamento della nostra app.

[General Settings dell'autore](https://github.com/roth-michael/FoundryVTT-RestRecovery/wiki/general-settings),
aggiornato 07/05/2025: l'avanzamento automatico del tempo e il divieto per i giocatori di
avviare riposi sono impostazioni distinte. Non importare queste scelte o i default. Il codice
conferma che il passaggio del tempo è condizionato da un'impostazione: selezione dei partecipanti
e autorità sul tempo non sono la stessa decisione.

**Raccomandazione Q073:** permettere un riposo breve per parte del gruppo mentre gli altri
proseguono le proprie attività. Caso: guerriero e mago riposano, ladro e ranger esplorano.
Riprendere la selezione dei destinatari di Rest Recovery; la prosecuzione delle altre attività
nel nostro percorso è l'applicazione proposta, non una proprietà runtime dichiarata del modulo.
Alternativa: percorso guidato solo collettivo, casi parziali manuali. Nessun identico comportamento
attribuito a BG3 e nessuna adozione automatica di varianti dei riposi del modulo.

**Confini:** Q073 riguarda partecipazione al riposo breve. Autorità per avvio/conclusione,
tempo condiviso, interruzioni, recuperi, attività, Dadi Vita digitali/fisici, sintonia,
identificazione, riposi lunghi, stato degli assenti e rete restano aperti. I-006/I-027/I-032
conservati. Nessun nuovo motore temporale o pagina approvati. Q073 confermata il 15/09/2026, I-085; F-010 parziale. I-086 esplicita la massima flessibilità.

## R067 — avanzare un tempo di gioco condiviso

Consultazione: 15/09/2026, dopo la conferma di Q073. Documentazione primaria pubblicata,
nessun prodotto installato o provato in runtime.

[Seasons & Stars — guida dell'autore](https://docs.rayners.dev/seasons-and-stars/user-guide/),
sezioni Permissions, Calendar Views e Time Management: DM e assistenti possono cambiare
il tempo del mondo; i giocatori consultano un valore comune che si aggiorna. Un controllo
calendario nella barra della scena apre il pannello; pulsanti rapidi configurabili consentono
avanzamenti di minuti, ore e giorni. Esiste anche una modalità di scorrimento reale, distinta.
La guida non indica data di revisione o release puntuale. Il
[catalogo Foundry](https://foundryvtt.com/packages/seasons-and-stars/), autore David Raynes,
indica compatibilità Foundry 13 e conferma i pulsanti di avanzamento. Non attribuire al modulo
un percorso di riposo o una gestione completa delle interruzioni.

[Rest Recovery — General Settings](https://github.com/roth-michael/FoundryVTT-RestRecovery/wiki/general-settings),
aggiornato 07/05/2025, già conservato in R066: passaggio automatico del tempo su richiesta del
DM configurabile separatamente, con possibile scadenza di Effetti Attivi temporizzati.
Il codice fissato in R066 separa destinatari e avanzamento; non adottare il salto automatico
all'avvio del riposo, il divieto di avvio ai giocatori o i default del modulo.

**Proposta Q074:** offrire un tempo condiviso avanzabile dal DM. Caso: mentre il mago riposa e
il ladro esplora, il DM indica dieci minuti trascorsi; il tempo dei riposi e le durate note
si aggiornano insieme. Il precedente diretto è il tempo comune con controllo esplicito;
collegarlo ai nostri riposi è l'adattamento proposto. Alternativa: gestire le conclusioni
separatamente, senza orologio comune. Nessun comportamento identico attribuito a BG3.

**Limiti:** automatismi e breakdown già acquisiti, non nuova domanda di approvazione delle
regole. Restano aperti esclusività/delega del comando, eventi intermedi, completamento e
recuperi, correzioni temporali, assenti, gruppi separati e rete. Nessun timer reale obbligatorio,
calendario completo o esposizione dei segreti approvati. Q074 confermata il 15/09/2026, I-087; I-005 ribadita. I-085/I-086 conservate.

## R068 — eventi dei riposi e regole sulle interruzioni

Consultazione: 15/09/2026, dopo Q074. Documentazione primaria pubblicata, nessun runtime.

[Ionrift Respite — catalogo dell'autore su Foundry](https://foundryvtt.com/packages/ionrift-respite),
autore IonRift, versione elencata 3.5.3, Foundry 12+ verificata 14. Le sezioni How it works
ed Events descrivono una fase di eventi e i controlli Random, Improvise, Pick from pool:
il DM può estrarre, improvvisare o scegliere direttamente dalla raccolta. La descrizione
cita eventi narrativi e possibili incontri; i controlli sono documentati, non provati.
La data puntuale della descrizione non è indicata. Non copiare automaticamente le varianti
di comfort, le penalità alle sentinelle o i recuperi. L'autore descrive anche revisioni del
DM prima di perdite di oggetti/monete: ciò non approva nel nostro prodotto una nuova politica.

**Raccomandazione Q075:** rendere facoltativa, nel percorso del riposo, la scelta o estrazione
di un evento disponibile al tavolo, conservando l'improvvisazione. Esempi: visita inattesa,
rumore sospetto, imboscata. Riprendere il selettore documentato. I-032 impone il supporto
fisico/digitale quando c'è un tiro; il doppio metodo non è qui attribuito al modulo.
Alternativa: scelta degli eventi gestita fuori dal percorso del riposo.

**Regole, fonte distinta dal prodotto:**
[Basic Rules 2024 — Short Rest e Long Rest](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary).
Un riposo breve interrotto non dà benefici; tirare iniziativa, subire danni o lanciare un
incantesimo diverso da un trucchetto lo interrompono. Per il lungo contano anche un'ora di
cammino o altro sforzo fisico. Se preceduta da almeno un'ora di riposo, l'interruzione del lungo
dà i benefici del breve; è possibile riprendere subito il lungo con un'ora aggiuntiva per
interruzione. Queste sono regole 2024, non scelte da sottoporre nuovamente al proprietario.
Il verificarsi di un evento narrativo non equivale da solo a una causa di interruzione per
ogni personaggio. Restano da definire input, rilevamento, scelta di riprendere e correzioni.
La pagina web non sostituisce una revisione immutabile per regole eseguibili: preservare i
riferimenti SRD EN/IT di evidence/experience-01/rules.md; nessuna implementazione avviata.

**Limiti della proposta:** Q075 non approva cataloghi o testi da redistribuire, editor,
probabilità/CD, tempi degli eventi, effetti automatici o combattimenti creati dall'app.
Eventi per parte del gruppo, salti temporali, conclusione e recuperi, assenti, DM concorrenti
e rete rimangono aperti. Q075 confermata il 15/09/2026, I-088, con facoltatività esplicita; I-086 ribadita. Nessun identico comportamento
attribuito a BG3, nessuna conclusione tratta dai risultati secondari su Solasta.

## R069 — eventi preparati con riferimenti a creature e oggetti

Consultazione: 15/09/2026, dopo Q075. Documentazione primaria pubblicata, nessun runtime.

[Foundry — Rollable Tables](https://foundryvtt.com/article/roll-tables/), sezioni Key Features,
Result Configuration Sheet e Creating New Result Rows: un risultato può contenere testo
formattato e riferimenti a documenti, compresi Actors e Items. Si possono inserire più tipi
nello stesso testo; l'esempio dell'autore associa una creatura a un oggetto che porta.
Il percorso documentato è Rollable Tables → Create Table → aggiunta risultato → configurazione;
i riferimenti si inseriscono anche trascinando dal relativo elenco al testo o al campo dedicato.
La pagina distingue lettura e modifica e documenta conservazione nei compendi. Data di revisione
e versione puntuale della guida non dichiarate. Non attribuire al collegamento la creazione
di pedine o un trasferimento d'inventario; il controllo autorizzato delle schede resta distinto.

**Proposta Q076:** preparare un evento con testo e collegamenti facoltativi alle schede di
creature e oggetti da consultare. Caso: due goblin tentano di derubare il gruppo; il DM apre
le schede pertinenti dall'evento. Riprendere il riferimento apribile, senza imporre di strutturare
ogni improvvisazione. Alternativa: solo testo e ricerca separata delle schede. I-088/I-086
conservano uso facoltativo e libertà; I-058 richiede semplicità nella combinazione.

**Confini:** editor dettagliato, riuso fra campagne, copie/aggiornamenti, permessi, visibilità,
contenuti inclusi, riferimenti mancanti, salvataggio/annullamento, dispositivi e rete restano
aperti. Nessun catalogo del concorrente copiato, nessun comportamento attribuito a BG3 o
Ionrift, nessuna conseguenza automatica dedotta. Q076 confermata il 15/09/2026, I-089; I-058 precisa uso semplice con poco sforzo. I-088 conservata.

## R070 — comando facoltativo per recuperare PF spendendo più Dadi Vita

Consultazione: 15/09/2026, dopo Q076. Documentazione primaria e porzione di codice pubblico
letti, nessun runtime o file del prodotto installato.

[Rest Recovery — General Settings](https://github.com/roth-michael/FoundryVTT-RestRecovery/wiki/general-settings),
aggiornato 07/05/2025, sezione Enable hit dice auto roll button: l'impostazione aggiunge ai
riposi un pulsante per tirare automaticamente Dadi Vita fino a PF quasi pieni. R066 conserva
catalogo e distinzione di versione dal sorgente. Il frammento
[refreshHealthData](https://github.com/roth-michael/FoundryVTT-RestRecovery/blob/06febe73ce5c250e006381549be52362418725a8/scripts/rest-workflow.js#L437),
SHA già fissato in R066, usa PF mancanti, recupero medio e dadi disponibili per abilitare il
comando. Questo frammento non è una verifica dell'intero ciclo di tiri o dei suoi arresti;
non adottarne per deduzione soglia, ordine dei dadi o garanzie di ottimalità. Non importare
limiti obbligatori alle spese o varianti di riposo presenti nelle altre impostazioni.

**Proposta Q077:** dopo il completamento valido del riposo breve, offrire un comando facoltativo
per spendere e tirare progressivamente Dadi Vita e avvicinarsi ai PF massimi, conservando
il percorso dado per dado. La fonte documenta il comando e il suo scopo. Il giocatore autorizza
la spesa con la richiesta, non con il solo avvio del riposo. Alternativa: soltanto spesa
progressiva decisa dopo ogni dado. Regola del breve e benefici conservati in R068.

**Confini:** Q077 ha confermato la delega della risorsa, I-090; non è una nuova conferma
dell'automazione dei calcoli. I-032 impone fisici/digitali e I-027 il breakdown. Non attribuire
il doppio metodo al modulo; l'input reale dei fisici non può essere simulato. Soglia, limite,
ordine dei dadi, guida al percorso fisico, arresto, effetti concorrenti e rete vanno definiti.
Nessuna promessa di guarigione completa o spreco minimo; nessun recupero anticipato, variante
di regola o comportamento identico a BG3 adottato. Q077 confermata il 15/09/2026, I-090; I-089/I-058 conservate. R071 approfondisce il ciclo e il tetto di spesa.

## R071 — tetto di spesa nella sequenza automatica dei Dadi Vita

Consultazione: 15/09/2026, dopo Q077. Documentazione primaria e codice pubblico letti, nessun runtime.

[Rest Recovery — Short Rest Settings](https://github.com/roth-michael/FoundryVTT-RestRecovery/wiki/short-rest-settings),
aggiornato 07/05/2025, sezione Maximum short rest hit die spend: il massimo configurato blocca
ulteriori Dadi Vita dopo il raggiungimento del tetto. È un'impostazione del riposo, non un
limite personale per singola richiesta dimostrato dalla fonte.

Codice alla revisione già conservata in R066, `06febe73ce5c250e006381549be52362418725a8`:
[`autoSpendHitDice`](https://github.com/roth-michael/FoundryVTT-RestRecovery/blob/06febe73ce5c250e006381549be52362418725a8/scripts/rest-workflow.js#L664)
legge il tetto impostato, lo confronta con i dadi spesi e interrompe il ciclo prima di un tiro
ulteriore. Il
[pulsante del pannello](https://github.com/roth-michael/FoundryVTT-RestRecovery/blob/06febe73ce5c250e006381549be52362418725a8/templates/components/hit-die-roller.hbs)
richiama il comando automatico tramite
[`onAutoRollHitDice`](https://github.com/roth-michael/FoundryVTT-RestRecovery/blob/06febe73ce5c250e006381549be52362418725a8/scripts/apps/rest.js#L366).
Resta distinta la revisione del sorgente dalla release di catalogo, come in R066.

**Limite osservato:** il ciclo usa anche una stima di recupero medio e i dadi disponibili;
il commento cita una percentuale di PF, ma la condizione eseguibile letta non implementa
una semplice soglia percentuale. Non presentare quel commento come comportamento verificato
né trasferire l'algoritmo al prodotto. Non importare minimo obbligatorio o limiti di house rule.

**Proposta Q078:** mantenere il tetto come pattern e offrirlo al giocatore, facoltativamente,
per la singola richiesta rapida. Esempio: sei dadi disponibili, autorizzarne al massimo due.
Il recupero può terminare prima. La personalizzazione per richiesta è l'adattamento da
concordare. Alternativa: nessun limite personale del comando, dado per dado per dosare la spesa.

**Confini:** controllo, default, persistenza, contatori fra richieste, multiclassi, percorso
fisico, cambiamenti dei PF, arresto/correzioni e rete rimangono aperti. I-027/I-032/I-058/I-086
conservati. Nessun identico comportamento attribuito a BG3 o prova di usabilità dichiarata.
Q078 confermata il 16/09/2026, I-091: tetto verificato, adattamento personale dichiarato e accettato. I-090 conservata.

## R072 — arresto automatico quando rimangono pochi PF

Consultazione: 16/09/2026, dopo Q078. Riutilizzati sorgente fissato e verifica R071;
riconsultata la documentazione pubblicata, nessun runtime.

[Rest Recovery — General Settings](https://github.com/roth-michael/FoundryVTT-RestRecovery/wiki/general-settings),
aggiornato 07/05/2025, descrive il pulsante automatico come recupero fino a PF quasi pieni.
Nel sorgente già letto,
[`autoSpendHitDice`](https://github.com/roth-michael/FoundryVTT-RestRecovery/blob/06febe73ce5c250e006381549be52362418725a8/scripts/rest-workflow.js#L664),
la stima intera è ottenuta dividendo i PF mancanti per il recupero medio e arrotondando in basso.
Se è zero, il ciclo non parte o si ferma. Un tetto di spesa e la disponibilità dei dadi sono
altre condizioni distinte. Il commento sulla percentuale dei PF non descrive quella condizione;
non usarlo come soglia. R066 conserva provenienza, revisione e distinzione dalla release.

**Proposta Q079:** arrestare la serie automatica quando i PF mancanti sono inferiori al
recupero medio di un altro dado. Caso: mancano due PF, rimangono d10 con bonus +2 e capienza
nel limite autorizzato; la cura media non limitata dai PF massimi sarebbe 7,5. Il giocatore
può scegliere di continuare manualmente. Alternativa: perseguire PF pieni entro i limiti.
Il precedente riguarda proprio l'arresto; la motivazione di preservare una scelta sulla
risorsa è giudizio di prodotto, non una prova empirica di superiorità o consumo ottimale.

**Confini:** il caso usa dadi tutti uguali e bonus noto. Non adottare automaticamente la
media del modulo per multiclassi, capacità particolari, cura non quantificabile o dati incerti.
Il trattamento di questi casi, del percorso fisico e delle modifiche durante la serie resta
aperto. Nessun popup obbligatorio, cambio di regola o comportamento attribuito a BG3 approvato.
I-027/I-032/I-058/I-086/I-090/I-091 conservate. Q079 risolta per delega il 16/09/2026, I-092; I-093 corregge la granularità della conduzione.

## R073 — disponibilità per organizzare le sessioni reali

Consultazione: 16/09/2026, dopo la delega Q079 e la correzione di granularità I-093.
Riutilizzata la ricerca C07/J03 in evidence/research-01/claims.md e coverage.md. Le vecchie
inferenze sullo scenario fra sessioni non diventano una mappa approvata.

[WhenIsGood](https://whenisgood.net/), pagina primaria riconsultata: chi organizza propone
orari; gli invitati indicano quelli disponibili su una griglia; una pagina dei risultati
mostra quando il gruppo è libero. Pagina corrente senza data o versione dichiarata. Nessun
sondaggio creato e nessun invito inviato. Le opinioni della ricerca C07 non dimostrano che
uno strumento risolva da solo il problema di trovare tempo per giocare.

**Proposta Q080:** raccogliere facoltativamente le disponibilità in app, rendendo visibili le
sovrapposizioni; conservare l'inserimento diretto di una data già concordata. Il precedente
sostiene raccolta e confronto; l'uso facoltativo e il percorso diretto applicano I-058/I-086.
Alternativa: registrare soltanto la data concordata altrove. Il tema è A11/J03, calendario
reale distinto dal tempo fittizio di I-087. F-011 confermato nella direzione da Q080/I-094
il 16/09/2026; nessuna nuova pagina approvata.

**Confini:** proposta/conferma, assenze, fusi, ricorrenze, account, privacy, promemoria,
notifiche, cancellazioni, sincronizzazioni e rete restano da definire. Nessuna dipendenza
tecnica da WhenIsGood, integrazione esterna o pubblicazione decisa. Q080 confermata;
i dettagli restano aperti.

## R074 — preparare e conservare un combattimento prima della sessione

Consultazione: 16/09/2026, per Q081 dopo la conferma Q080. Riutilizzati C05 e J09 della
ricerca research-01: preparazione, riuso e carico del DM. Le vecchie inferenze sugli scenari
non diventano struttura approvata; il risparmio di tempo non è stato misurato.

[D&D Beyond, tutorial Encounters](https://www.dndbeyond.com/posts/1135-tutorial-how-to-build-encounters-and-run-them-on-d),
Davyd Barker, 15/12/2021: scegliere numero/livelli dei personaggi o una campagna; cercare
mostri, aggiungerli e variarne le quantità; consultare la difficoltà; nominare l'incontro,
aggiungere note e salvarlo. La raccolta consente poi avvio/ripresa, modifica e duplicazione.
È un percorso descritto dall'editore, non una prova runtime svolta dall'agente.

**Limite di versione:** il tutorial precede il 2024 e presenta la precedente matematica
della difficoltà. Non dimostra il comportamento attuale dei calcoli di Beyond. Non adottare
queste formule, collocazioni storiche dei menu, prezzi o limiti di account come attuali.
La baseline 2024 del progetto rimane vincolante; i calcoli saranno specificati sulle fonti
ufficiali già conservate. Una stima non garantisce l'esito o l'equilibrio al tavolo.

**Proposta Q081:** preparatore facoltativo con scelta di creature/quantità, stima e
salvataggio per la partita. L'improvvisazione rimane disponibile secondo I-058/I-086;
questa combinazione è il nostro adattamento, non una capacità identica verificata in ogni
riferimento. Alternativa: gestire il combattimento solo al tavolo senza preparatore dedicato.

**Esito:** Q081 confermata il 16/09/2026, I-095; A8/F-012 parziale.

**Confini:** nessuna generazione automatica, importazione,
assegnazione alla mappa, tabella dei premi o pagina approvata. Quantità, iniziativa di gruppo,
contenuti del bestiario e regole esatte non si adottano implicitamente dal tutorial.

## R075 — costruire mappe oppure preparare immagini e schizzi

Consultazione: 16/09/2026, per Q082 dopo la conferma Q081. Riutilizzati J05/J15 e C05/C08
in research-01: preparazione contenuta, scena e segnalini. Non recuperate vecchie mappe,
sequenze o demo; le inferenze della ricerca non sono risposte dell'owner.

- [Dungeon Scrawl](https://www.dungeonscrawl.com/), pagina primaria corrente senza versione
  dichiarata: forme per stanze e corridoi; oggetti e decorazioni; salvataggio/esportazione.
  [Roll20, What is Dungeon Scrawl?](https://help.roll20.net/hc/en-us/articles/16979743281943-What-is-Dungeon-Scrawl),
  pagina aperta aggiornata il **09/07/2026**: documenta costruzione e modifica delle mappe
  attraverso il collegamento con Roll20. L'indice mostrava 30/03/2026: prevale la data della
  pagina consultata. Nessuna prova runtime o prestazione temporale misurata.
- [Owlbear, Drawing](https://docs.owlbear.rodeo/docs/drawing/), senza data/versione dichiarata:
  disegno rapido delle mappe con forme e tratti, modificabili; documenta un approccio più
  generale del costruttore di dungeon. Non prova l'assenza di altri strumenti o estensioni.
- [Foundry, Scenes](https://foundryvtt.com/article/scenes/), senza data/versione dichiarata:
  Create Scene apre la configurazione; Background Image consente selezione/caricamento
  dell'immagine. Conferma il percorso con mappa già pronta, non l'esclusività di quel metodo.

**Proposta Q082:** costruzione facoltativa di mappe con strumenti per stanze/corridoi ed
altri elementi, conservando il caricamento di mappe già pronte. Il precedente specializzato
è Dungeon Scrawl con Roll20; semplicità e uso facoltativo applicano I-058/I-086. Aggiungere
questa capacità al nostro prodotto resta una scelta dell'owner. Alternativa: mappe esterne
e schizzi rapidi, senza editor dedicato. Non dichiarare un solo pattern comune al mercato.

**Esito:** Q082 confermata, I-096, il 16/09/2026; richiesta aggiuntiva sui modelli in I-097/R076.

**Confini:** A8/F-013 parziale. Nessuna integrazione concreta, licenza di
risorse, generazione automatica, forma della pagina o scelta 2D/3D approvata. Riprendere
percorsi e controlli pertinenti nella fase delle pagine, mantenendo distinti aspetto della
mappa, geometria delle regole, visibilità e permessi. Nessuna immagine o mock prodotto.

## R076 — partire da una mappa pronta e modificarne una copia

Consultazione: 16/09/2026, sulla precisazione dell'owner dopo Q082. Verificare mappe già
costruite e modificabili, non confondere questo requisito con preset di colori o stili.

- [Dungeon Scrawl, Map Showcase](https://blog.dungeonscrawl.com/map-showcase), annuncio del
  **18/08/2026**: galleria cercabile anche per tag; dettaglio della mappa e download.
  Per gli abbonati Pro è documentata l'apertura in Dungeon Scrawl e il salvataggio di una
  copia modificabile nella libreria. Il download gratuito dell'immagine non è la stessa cosa.
- [Dungeon Scrawl, Pricing](https://www.dungeonscrawl.com/pricing), pagina corrente senza data:
  documenta salvataggi caricabili e immagini proprie; i link di condivisione permettono al
  destinatario di vedere, modificare e salvare una copia. Non verificata l'interfaccia runtime.
- [Inkarnate, FAQ](https://inkarnate.com/faq), pagina corrente senza data/versione: il piano
  Creator include la clonazione di mappe altrui da Explore o dal profilo. È un secondo
  precedente di riuso; le condizioni di abbonamento non diventano vincoli del nostro prodotto.

**Esito I-097:** registrata la richiesta di modelli modificabili, mantenendo partenza vuota
ed elementi caricati dall'utente I-096. L'utilità attesa è partire da una base e adattarla;
è una valutazione di progetto, non una misura del tempo risparmiato o una prova di usabilità.
Il precedente verificato è la copia modificabile di una mappa. Offrire una selezione iniziale
di situazioni comuni è l'adattamento richiesto, non un identico catalogo fornito da quei prodotti.

**Confini:** categorie e quantità dei modelli, provenienza e aggiornamenti restano aperti.
Taverna, grotta e accampamento sono esempi dell'agente, non una lista confermata. Non copiare
risorse dei concorrenti, introdurre pagamenti, marketplace, pubblicazione o generazione.
Caricare un'immagine non dimostra di poter modificarne automaticamente muri e oggetti interni.
Nessuna mappa scaricata o creata, nessun login, acquisto o modifica a servizi esterni.

## R077 — archivio narrativo con voci e collegamenti

Consultazione: 16/09/2026, per Q083. Conservata la ricerca C08/C10, J02/J08/J10, su reperimento,
archivi e riservatezza. Ricerca avviata prima della precisazione sui modelli, poi conservata;
nessuna domanda su questo ambito era ancora stata posta o confermata.

- [Kanka, Entries](https://docs.kanka.io/en/latest/entries/overview.html), documentazione con
  etichetta 1.0.0, senza data: voci distinte per personaggi, luoghi e altri elementi, con
  campi comuni e specifici. I tipi sono fissi nel riferimento; non adottare questo limite.
- [Kanka, Entry Connections](https://docs.kanka.io/en/latest/features/connections.html), stessa
  etichetta documentale: sezione Connections con legami manuali, per esempio mentore o
  fazioni alleate; Related elements raccoglie riferimenti da altri campi/relazioni, non le
  menzioni nel testo. Il grafo premium non è necessario alla capacità qui discussa.
- [LegendKeeper](https://www.legendkeeper.com/), pagina primaria corrente senza data/versione:
  wiki collegata, organizzazione flessibile e segreti riservati. Corrobora l'archivio del
  mondo senza dimostrare identità con le categorie di Kanka. Nessuna prova runtime o del
  controllo accessi; non adottare automaticamente export, collaborazione o offline pubblicizzati.

**Proposta Q083:** archivio facoltativo di PNG, luoghi e fazioni con collegamenti, utile a
ritrovare informazioni fra sessioni. Gli appunti liberi rimangono sufficienti per chi li
preferisce, secondo I-058/I-086; conservati i permessi acquisiti, inclusa la riservatezza
personale I-044. Le voci sono contenuti concettuali, non pagine già approvate.

**Esito:** Q083 confermata il 16/09/2026, I-099; F-014 parziale.

**Confini:** categorie definitive, campi, autorità sulle
informazioni, contributi, conoscenze dei personaggi, legami con statistiche e mappe, riuso,
salvataggio, annullamento e rete restano aperti. Non dedurre un narratore automatico, un
sistema completo delle missioni o il trasferimento degli appunti privati nell'archivio.

## R078 — diario delle missioni con obiettivi e progressi

Consultazione: 16/09/2026 dopo Q083, per Q084. Riutilizzati C08/J02/J08 della ricerca:
ritrovare il contesto fra sessioni; un log meccanico non riassume da solo la storia.
Nessuna vecchia mappa o sequenza viene ripresa come progetto approvato.

- [BG3, Journal Design Guidelines](https://docs.baldursgate3.game/index.php?title=Journal_Design_Guidelines&oldid=3679),
  documentazione di modding sul dominio del prodotto, revisione 3679, senza data dichiarata:
  obiettivo successivo ed eventi rilevanti della missione; informazioni già note al giocatore.
  Gli aggiornamenti seguono azioni significative. Il documento tratta anche diramazioni.
- [BG3, Journal Structure Overview](https://docs.baldursgate3.game/index.php?title=Journal_Structure_Overview&oldid=3677),
  revisione 3677, stessa provenienza: elenco di missioni, dettaglio con obiettivi e passi,
  aggiornamenti più recenti prima; categoria delle missioni concluse. È una descrizione
  del prodotto, non una prova runtime svolta dall'agente o un layout già scelto per l'app.
- [Kanka, Features — Quests](https://kanka.io/features), pagina primaria corrente senza
  data/versione: preparare missioni, collegarne persone/luoghi e segnarle come concluse.
  Corrobora la gestione di missioni in una campagna da tavolo, senza gli script del videogioco.

**Proposta Q084:** diario facoltativo per ricordare obiettivi, progressi significativi e
conclusioni. Facoltatività e libertà del gruppo applicano I-058/I-086. Il confronto sostiene
l'esistenza e l'utilità prevista del supporto; il beneficio per il nostro tavolo non è misurato.

**Esito:** Q084 confermata il 16/09/2026, I-100; F-015 parziale.

**Confini:** non copiare implicitamente da BG3 il limite
all'obiettivo attivo, le priorità, gli script, le chiusure irreversibili, ricompense o marker.
Autori, autorità sugli aggiornamenti, eventi riconoscibili automaticamente e visibilità da
concordare. Una cronaca libera, il diario degli obiettivi e l'archivio del mondo hanno scopi
parzialmente diversi; non ne dedurre pagine separate o migrazioni degli appunti privati.

## R079 — vista per lo schermo condiviso in presenza

Consultazione: 16/09/2026 dopo Q084, per Q085. Riutilizzati C06/C10 e J05/J10 della ricerca
su Encounter+, separazione degli schermi e contenuti pubblici. Il vecchio scenario non
costituisce struttura approvata e la voce J05 non conferma da sola la funzione.

- [Owlbear, Casting](https://docs.owlbear.rodeo/docs/casting/), pagina primaria senza data o
  versione dichiarata: vista giocatore per il tavolo in presenza. Dal menu Extras si apre
  Cast, si sceglie lo schermo e lo si ammette alla stanza. Il dispositivo entra come nuovo
  giocatore, senza vedere oltre la nebbia o usare funzioni GM; interfaccia nascondibile.
  Sono descritti requisiti del browser e schermo esteso, oltre al controllo Sync View.
- [Encounter+, Player screen](https://www.encounter.plus/), pagina primaria corrente senza
  versione dichiarata: TV/proiettore con mappa, iniziativa e handout, senza note del DM;
  collegamento pubblicizzato via AirPlay o HDMI. Nessuna prova runtime, acquisto o test
  di riservatezza svolto dall'agente. L'offline dichiarato per il dispositivo non dimostra
  il funzionamento di ogni combinazione di più dispositivi scollegati.

**Proposta Q085:** vista facoltativa dedicata al tavolo comune; mantenere strumenti e
informazioni riservati separati. Si riprende il pattern verificato dei due riferimenti,
conservando semplicità, carta e dispositivi personali secondo i contesti già emersi.
Alternativa: sole viste personali, senza esperienza dedicata allo schermo comune.

**Esito:** Q085 confermata e precisata il 16/09/2026, I-101/R080: entrambi i contesti.

**Confini:** A1/A12/F-016 parziale. L’adattamento non determina l’identità
tecnica dello schermo, i permessi dei partecipanti, le conoscenze individuali condivise,
chi controlla zoom/token, i protocolli o il funzionamento offline. Non promettere supporto
universale né copiare automaticamente le restrizioni dei prodotti. Nessuna TV configurata,
trasmissione avviata o nuova pagina/immagine prodotta.

## R080 — supportare remoto e presenza nello stesso prodotto

Consultazione: 16/09/2026 sulla risposta Q085. Il proprietario chiarisce il contesto reale:
Discord da remoto, ciascuno sul proprio laptop. Riutilizzati C06/C10 e la ricerca R079.

- [Owlbear, Rooms](https://docs.owlbear.rodeo/docs/rooms/), pagina primaria senza data/versione:
  il GM crea una stanza e condivide il link; i giocatori la aprono nel browser e chiedono
  accesso. Non adottare automaticamente la sala d'attesa o le regole degli utenti anonimi.
- [Owlbear, Casting](https://docs.owlbear.rodeo/docs/casting/), stessa condizione documentale:
  presenta esplicitamente uso online e in presenza; lo schermo aggiuntivo entra nella stanza
  con una vista giocatore. Conferma la coesistenza, non la nostra gestione delle conoscenze.
- [Encounter+](https://www.encounter.plus/), pagina primaria corrente: Player screen per
  TV/proiettore e Remote play per giocatori nel browser con controllo dei token. Il remoto
  è pubblicizzato nel piano Premium; questo limite non è adottato nel progetto.

**Esito I-101:** accolta la richiesta di entrambi i contesti. L'uso reale remoto dell'owner
rimane un riferimento concreto per percorsi e pagine. È ragionevole mantenere stato del gioco
e permessi coerenti fra viste personali e comuni; architettura e prove sono future.
Nessuna promessa di qualità della sincronizzazione già verificata o di compatibilità totale.

**Confini:** la precisazione non approva chiamate native, bot o integrazioni Discord. Uso
ibrido simultaneo, persone senza dispositivo, visione individuale, connessione e recupero
restano aperti. Nessuna chiamata, stanza o trasmissione effettivamente avviata.

## R081 — chiamate integrate facoltative e servizi esterni

Consultazione: 16/09/2026, per Q086. Distinguere il tavolo condiviso in rete dalla voce/video;
I-101 non richiede di trasferire la conversazione attuale del gruppo fuori da Discord.

- [Foundry, Audio/Video Chat Integration](https://foundryvtt.com/article/audio-video/), pagina
  primaria corrente senza data/versione: chiamate integrate; A/V Configuration permette
  disattivazione, sola voce, solo video o entrambi. Controlli personali di microfono e
  videocamera; vengono discussi limiti di rete e alternative esterne. Nessuna prova runtime.
- [Roll20, Integrated Voice and Video](https://help.roll20.net/hc/en-us/articles/360041544734-Integrated-Voice-and-Video),
  pagina aperta aggiornata **20/07/2026**: ingresso in chiamata dal riquadro personale;
  invio e ricezione possono essere disattivati tramite None. La pagina è distinta dalla
  documentazione Legacy trovata nell'indice; non attribuire al prodotto attuale le istruzioni Legacy.
- [Roll20, Network Connection Troubleshooting](https://help.roll20.net/hc/en-us/articles/4404216545559-Network-Connection-Troubleshooting),
  **16/12/2025**, sezione Video Chat: contempla servizi dedicati esterni e nomina Discord.
  Conferma la convivenza dei flussi; non prova superiorità, stabilità o prestazioni per noi.

**Proposta Q086:** offrire voce/video integrati facoltativi, conservando l'uso di Discord o
altro servizio esterno. Il precedente è verificato; la motivazione è dare scelta ai gruppi,
coerentemente con I-058/I-086. Alternativa: solo chiamate esterne. F-017 proposto, non confermato.

**Confini:** modalità di accesso, privacy, controlli, conversazioni riservate, reti e gruppi
ibridi vanno approfonditi. Non adottare codice/fornitori/requisiti infrastrutturali dalla guida,
né attivazioni automatiche, registrazione, trascrizione, condivisione schermo, account Discord
collegati o spesa. I costi del servizio dovranno essere valutati rispetto alla gratuità;
questa domanda di scopo non autorizza acquisti. Q086 in attesa; nessuna chiamata avviata.

**Esito Q086, 16/09/2026:** il proprietario esclude le chiamate interne per ora, I-102.
La ricerca R081 resta valida ma non giustifica da sola la raccomandazione di aggiungerle.
Rilette le guide Foundry e Roll20: Foundry segnala banda/configurazione e Roll20 contempla
servizi esterni come Discord. La valutazione di complessità per il nostro prodotto è
un'inferenza di progetto, non una stima di costo o un benchmark contro Discord.

## R082 — estrazione facoltativa dei tesori

- **Consultazione:** 16/09/2026, documentazione primaria; nessuna prova nell'app.
- **Fonte:** [Foundry — Rollable Tables](https://foundryvtt.com/article/roll-tables/).
  Pagina senza data o versione esplicita; capacità presentate come prodotto base.
- **Pubblicato:** la guida cita tesori fra gli usi delle tabelle. Dalla scheda della tabella
  `Draw Result` estrae un esito; `Draw This Result` permette al GM di sceglierlo. I risultati
  possono contenere testo e riferimenti a oggetti. Le tabelle sono modificabili.
- **Corrispondenza Q087:** aiuto facoltativo per determinare un tesoro, conservando la scelta
  manuale. Beneficio proposto: ridurre preparazione ripetitiva e collegarla al bottino.
- **Limiti:** non prova tabelle D&D 2024 incluse, bilanciamento per gruppo o consegna automatica.
  Input fisico richiesto da I-032, non verificato qui; revisione prima della consegna è il
  raccordo proposto con discrezione e inventari già discussi. Nessun contenuto copiato.
- **Esito:** Q087 confermata il 16/09/2026, I-103; F-018 parziale. Tabelle e percorsi ancora aperti.

## R083 — mercanti e acquisti collegati alla scheda

**Consultazione:** 16/09/2026. Fonti primarie, nessuna prova runtime o transazione.

- [Item Piles — Merchants](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/docs/merchant.md):
  documentazione fissata alla revisione `85ab971406623fb1c5d01eb1f093fe4855ede6e4`.
  Configurato un attore come Merchant, apertura dalla barra laterale o dal token;
  merci aggiunte dal catalogo, acquisto col personaggio selezionato e valute visibili.
  Prezzi di acquisto/vendita modificabili, anche per oggetto. Modulo aggiuntivo, non Foundry base.
  Il [catalogo](https://foundryvtt.com/packages/item-piles) elenca 3.3.4 e gestione quantità;
  questo non identifica automaticamente la versione della documentazione su master.
- [Shard — Building Shops](https://www.shardtabletop.com/howto/building-shops): Darren
  Shakib, 12 maggio senza anno mostrato. Il DM seleziona un assortimento in una sezione,
  lo mostra come handout e i giocatori accedono tramite SHOP.
- [Shard — Buying Equipment](https://www.shardtabletop.com/howto/buying-equipment): stesso
  autore, 12 maggio senza anno. ADD → selezione oggetti/quantità → BUY; riepilogo e valute,
  calcolo del pagamento e possibilità di concordare un prezzo diverso.
- [Shard — Fun with Items](https://www.shardtabletop.com/blog/items): stesso autore e data
  senza anno; conferma strumenti di acquisto e vendita, con calcoli monetari.

**Corrispondenza Q088:** negozio consultabile e transazioni col personaggio; ridurre la
contabilità degli scambi. Scambi improvvisati conservati secondo I-058, non obbligo di
preparare un negozio completo. Non attribuire alla lista Shard scorte finite non documentate.

**Limiti:** nessuna adozione di tutta la configurabilità Item Piles, percentuali, servizi,
baratto, orari, accesso tra sessioni o rifornimenti. Il sito wiki non esponeva testo al lettore;
consultata la documentazione sorgente. La revisione comprende esempi storici, non è prova
che ogni dettaglio sia identico nella versione attuale. Nessuna immagine scaricata.
**Esito:** Q088 confermata il 16/09/2026, I-104; F-019 parziale e sempre facoltativo.

## R084 — fabbricazione assistita e facoltativa

**Consultazione:** 16/09/2026, fonti primarie. Nessuna prova runtime, installazione o codice.

- [D&D Beyond — Free Rules 2024, Equipment](https://www.dndbeyond.com/sources/dnd/br-2024/equipment#CraftingEquipment):
  sezione Crafting Equipment, edizione 2024; nessuna revisione immutabile dichiarata nella pagina.
  Descrive equipaggiamento non magico, pozioni di guarigione e pergamene, con strumenti,
  requisiti, materiali/costi e tempo di lavoro. È fonte di regole, non prova di UI assistita
  di Beyond. Prima di implementare: fissare la revisione ufficiale SRD applicabile e gli esempi.
- [Simple Shop & Craft 5e](https://foundryvtt.com/packages/simple-shop-craft-5e), autore
  Peterlankton; catalogo riletto con versione 0.5.0 per Foundry 14. La versione 6.0.2 mostrata
  sotto Supported Game Systems riguarda D&D5e, non il modulo. Documento corrente senza data
  assoluta; nessun benchmark di maturità o stabilità effettuato.
  La scheda Craft elenca ricette, requisiti, costo e durata. Il percorso sceglie materiali,
  registra un lavoro in corso e lo sostituisce con l'oggetto finito. Sono capacità dichiarate.

**Corrispondenza Q089:** aiutare il personaggio a seguire risorse, lavoro e risultato.
La facoltatività e il percorso libero derivano da I-058/I-086/I-104; non imporre un progetto
per poter continuare a giocare o registrare un oggetto concordato al tavolo.

**Contro-evidenza e limiti:** il modulo chiede conferma del GM prima di consumare materiali e
lega il progresso ai riposi. Non trasferire tali vincoli al prodotto. Regole, permessi e
momenti di consumo/completamento vanno verificati separatamente; nessuna adozione delle sue
altre funzioni, degli acquisti, dei rifornimenti o delle formule commerciali. Non dedurre che
ogni oggetto richieda una ricetta scoperta o un tiro. Il costo del progetto non è una spesa reale.
**Esito:** Q089 confermata il 16/09/2026, I-105; F-020 parziale. I-106 ribadisce aggiunta
diretta indipendente dalla fabbricazione; riletta la distinzione aggiunta/acquisto nella
guida Shard Buying Equipment di R083. Altre attività durature restano aperte.

## R085 — pianificazione e avanzamento dei viaggi

**Consultazione:** 16/09/2026, fonti primarie. Capacità pubblicate, nessuna prova runtime.

- [Travel Pace](https://foundryvtt.com/packages/travel-pace): modulo Foundry, autore Tyler,
  versione elencata 5.3.1, Foundry 14+ verificato 14.367. Selezione del gruppo, comando
  Travel Pace, input di distanza/terreno/velocità e stima del tempo, con dettaglio condivisibile.
  La descrizione richiama un SRD a pagina 84 e rapporti di velocità: non prova conformità
  alla baseline 2024 né autorizza a trasferirne tutte le formule.
- [Journeys & Jamborees — Travel System](https://docs.rayners.dev/journeys-and-jamborees/travel-system/):
  documentazione dell'autore senza data/versione esplicita. Dalla scheda del gruppo, Travel
  registra origine, destinazione, distanza totale, percorsa e terreno. Documenta anche
  attività e risorse: non sono adottate dalla domanda. La pagina generale non si è aperta;
  la guida specifica è stata letta, senza installazione o verifica della maturità.
- [D&D Beyond — Free Rules 2024, Travel](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game#Travel):
  il DM può riassumere il viaggio senza distanze/tempi esatti oppure usare le andature.
  È fonte di regole, non prova di una funzione di Beyond. Prima di implementare fissare
  revisione SRD ufficiale ed esempi; qui nessuna formula eseguibile è approvata.

**Corrispondenza Q090:** dati del tragitto, stima e progressi sono aiuti verificati. Il
beneficio proposto è ridurre conteggi e conservare il punto raggiunto, con narrazione libera.
**Limiti:** nessuna mappa o simulazione continua, consumo, meteo, incontro casuale o
regola specifica dei moduli adottati. Permessi e avanzamento effettivo del tempo restano
separati dalla stima. La scelta riguarda l'ambito funzionale, non un layout.
**Esito:** Q090 confermata il 16/09/2026, I-107; F-021 parziale, percorsi ancora aperti.

## R086 — provviste facoltative e consumi visibili

**Consultazione:** 16/09/2026. Fonti primarie, nessuna installazione o prova runtime.

- [Rest Recovery 5e](https://foundryvtt.com/packages/rest-recovery): modulo Foundry; il
  catalogo elenca 6.0.0 per Foundry 14, verificato 14.367. La descrizione include cibo/acqua,
  sazietà e privazione tra le funzioni completamente opzionali. Non assumere che ogni
  formula o vincolo del modulo coincida con le regole 2024.
- [Journeys & Jamborees — Resource Management](https://docs.rayners.dev/journeys-and-jamborees/resources/):
  guida senza data/versione esplicita. Contatori di razioni/acqua, modifica diretta e comandi
  +/−, avvisi di scarsità. **Contro-evidenza:** cita impostazioni di consumo automatico ma
  elenca consumo giornaliero e deduzione al riposo anche fra miglioramenti futuri. La guida
  Travel parla di consumo opzionale: lo stato effettivo non è verificato. Usare il precedente
  dei contatori/avvisi senza promettere automazioni già provate.
- [D&D Beyond — Free Rules 2024, Rules Glossary](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary):
  pubblicazione mostrata 01/09/2024; consultate Dehydration e Malnutrition. Fabbisogni per
  taglia, conseguenze e recupero distinti per cibo e acqua; niente identico consumo universale
  dedotto. Fonte di regole, non prova di funzioni di Beyond. Prima di implementare fissare
  revisione SRD ufficiale, eccezioni ed esempi.

**Corrispondenza Q091:** rendere scorte/consumi leggibili e correggibili per i tavoli che
vogliono gestirli; mantenere uso libero senza questa assistenza. I-027 guida i calcoli visibili.
**Limiti:** modalità e tempi degli automatismi da definire. Non trasferire inventario separato,
copie al posto dei trasferimenti, assenza di peso, default o ruoli J&J al nostro prodotto.
Nessuna approvazione implicita di altre risorse o raccolta automatica; nessun consumo in tempo reale.
**Esito:** Q091 confermata il 16/09/2026, I-108; F-022 parziale e facoltativo.

## R087 — visione individuale e rivelazione manuale della mappa

**Consultazione:** 16/09/2026. Documentazione primaria corrente senza data/versione unica;
nessuna prova runtime, immagini scaricate o layout prodotto. Sono capacità del prodotto base.

- [Foundry — Tokens](https://foundryvtt.com/article/tokens/), sezione Token Vision:
  visibilità dal token, configurazione della visione e rilevazione. Con più token controllabili
  esistono comportamenti di unione/selezione: non adottati dalla domanda.
- [Foundry — Lighting](https://foundryvtt.com/article/lighting/): luci e muri influenzano
  ciò che il personaggio può vedere. Comandi per posare luci e configurarne la portata.
- [Foundry — Scenes](https://foundryvtt.com/article/scenes/): impostazione Token Vision
  abilitabile/disabilitabile; Fog Exploration è separata e conserva aree esplorate per utente.
  Queste impostazioni non provano una politica di condivisione già scelta per il nostro tavolo.
- [Owlbear — Fog](https://docs.owlbear.rodeo/docs/fog/): Fog tool, forme sulle stanze,
  Fill Fog e Cut/Uncut per rivelare o ricoprire. Fog Preview mostra la vista del giocatore.
  È un precedente manuale verificato; non una dichiarazione che Owlbear non possa offrire
  altre possibilità tramite estensioni o altre funzioni.

**Corrispondenza Q092:** visione automatica individuale e rivelazione manuale sono pattern
pertinenti; combinarli come opzioni è la proposta. Beneficio: informazione legata al punto
di vista, con meno rivelazioni manuali se si prepara la scena. Costo per il DM: ostacoli e luci
vanno configurati; non promettere lettura automatica di qualunque immagine di mappa.

**Limiti:** niente scelta 2D/3D o grafica; niente adozione automatica di memoria esplorata,
condivisione di gruppo, sensi, porte o regole di percezione dei riferimenti. L'illuminazione
non prova il rilevamento di un nemico nascosto. Le regole 2024 vanno verificate per capacità.
**Esito:** Q092 confermata il 16/09/2026, I-109/F-005; raccordi F-013/F-016 e dettagli aperti conservati.

## R088 — creature collegate al personaggio e alla fonte dell'evocazione

**Consultazione:** 16/09/2026. Fonti primarie lette come documentazione; nessuna prova runtime,
account modificato, immagine scaricata o contenuto di gioco importato.

- [D&D Beyond — Adding Tokens](https://dndbeyond-support.wizards.com/hc/en-us/articles/46385049945492-Adding-Tokens),
  supporto ufficiale, 17/02/2026, nessuna versione indicata: gli Extras della scheda compaiono
  nel Token Browser sotto Companions; il pulsante + li aggiunge alla mappa. Esempio: cavalcatura.
- [D&D Beyond Maps — How to Start Playing Today](https://www.dndbeyond.com/posts/1570-d-d-beyond-maps-how-to-start-playing-today),
  Davyd Barker, data pagina 12/03/2025: nella sezione Inviting Players, il giocatore controlla
  i token associati alla sua scheda, compresi i compagni. Non dedurre piena automazione delle
  statistiche o copertura di ogni compagno di classe da questo collegamento.
- [Foundry D&D5e — Activity Type Summon](https://github.com/foundryvtt/dnd5e/wiki/Activity-Type-Summon),
  wiki del sistema, modificata 10/09/2026, indicata aggiornata a 6.0.0. Funzione del sistema
  D&D5e, non prova di una capacità universale del core Foundry. Uso della capacità/incantesimo
  → scelta del profilo quando disponibile → posizionamento; il comando Summon della scheda
  in chat permette anche il posizionamento successivo. La configurazione consente profili,
  quantità e adattamenti di PF, CA, attacchi e altri valori alla fonte. Richiede abilitazione
  e permessi in Foundry; non adottare automaticamente queste impostazioni nel nostro prodotto.

**Accesso e limiti:** la vecchia nota mobile Beyond v2.9 del 14/04/2022 è stata trovata,
inizialmente non caricata e poi aperta; documenta solo visualizzazione delle creature, quindi
non fonda la proposta. Le segnalazioni di utenti sui limiti degli Extras emerse nella ricerca
non sono state verificate come stato attuale: non usarle per affermare copertura completa
né assenza attuale di una funzione. Le fonti ufficiali sopra provano i singoli collegamenti.
Gli esempi di incantesimi della wiki Foundry includono fonti precedenti al 2024: non copiarne
regole o statistiche. Nessuna formula eseguibile fissata in questa domanda.

**Adattamento proposto Q093:** collegare famigli, compagni animali e creature evocate al
personaggio, con accesso ai propri dati e pedine, mantenendo aggiunta e correzione manuale.
Beneficio: meno schede da ritrovare e dati da ricopiare. Costo: distinguere i cicli di vita
e le regole di ciascuna fonte, senza attribuire a tutti turno, attacchi o durata uguali.
Il controllo multiplo I-040 non è in discussione; si chiede il collegamento specifico.

**Esito:** Q093 confermata il 16/09/2026, I-110/F-023, A3/A5; dettagli aperti. Dadi I-032, automazione I-027, correzioni I-028,
semplicità I-058 e flessibilità I-086 conservati; nessuna pagina o stile scelti.

## R089 — trasformare il personaggio e tornare alla forma originale

**Consultazione:** 16/09/2026. Documentazione primaria letta; nessuna prova runtime,
immagine scaricata, trasformazione eseguita o contenuto di gioco importato.

- [Foundry D&D5e — Activity Type Transform](https://github.com/foundryvtt/dnd5e/wiki/Activity-Type-Transform),
  wiki modificata 10/09/2026, indicata aggiornata a 6.0.0. Uso della capacità/incantesimo,
  scelta del profilo e della creatura quando necessaria, comando Transform sui token scelti.
  Supporta profili preparati e personalizzazione. Gli esempi distinguono 5e e 5.5e: non
  copiarne regole o liste come un'unica baseline del nostro prodotto.
- [Foundry D&D5e — Transformation](https://github.com/foundryvtt/dnd5e/wiki/Transformation),
  stessa data/versione dichiarata. Trasformazione tramite attività o trascinamento di una
  creatura sulla scheda; opzioni per dati mantenuti, uniti ed effetti. Revert Transformation
  riapre la scheda originale e ripristina il riferimento dei token. Secondo le opzioni,
  variazioni di PF e slot vengono riportate alla forma originale. La duplicazione interna
  e i permessi di creazione/pulizia sono vincoli Foundry, non requisiti per la nostra app.
- [Shard — Using the Character Sheet](https://www.shardtabletop.com/howto/using-character-sheet),
  Darren Shakib; pagina indica 22 agosto senza anno, nessuna versione. Sezione Character Menu:
  Change Shape apre la scelta; Pick e forme recenti aiutano a selezionare. La forma aggiorna
  dati e token; Revert Shape riporta al personaggio. La guida descrive anche PF separati
  della forma, ritorno a zero e danni residui: è comportamento documentato del riferimento,
  non una regola adottata per Forma Selvatica 2024. Il primo caricamento è fallito, il secondo
  ha restituito il testo. La sezione Companions conferma inoltre il precedente di creature
  collegate, già approvato in I-110; non amplia quella decisione.

**Adattamento Q094:** scelta e applicazione assistita della forma, dati pertinenti durante
l'uso e ritorno alla forma originale, mantenendo gestione e correzione manuale. Beneficio:
meno ricopiatura e meno consultazioni incrociate durante il turno. Costo: gestire correttamente
le differenze tra effetti, risorse e dati conservati, da specificare con fonti appropriate.
Non è una promessa di animazioni o una conferma del layout dei riferimenti.

**Limiti:** non usare guide UI come autorità sulle regole 2024. La forma originale non è
un salvataggio che cancella eventi già avvenuti; correzione I-028 e ripristino I-029 restano
distinti dalla fine ordinaria di una trasformazione. Ricerca Roll20 ha restituito soprattutto
script e discussioni storiche: non usati per dichiarare capacità native correnti.

**Esito:** Q094 confermata il 16/09/2026, I-111/F-024, A3/A5; dettagli aperti e principi I-027/I-032/I-058/I-086 conservati.

## R090 — gestione facoltativa di basi e bastioni

**Consultazione:** 16/09/2026. Documentazione primaria; nessuna prova runtime, installazione,
acquisto o importazione di contenuti. Distinguere strumenti, contenuti commerciali e regole.

- [Foundry D&D5e — release 4.1.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-4.1.0),
  precedente storico versionato, sezione Bastions: abilitazione nelle impostazioni, scheda
  Bastion del personaggio, aggiunta/configurazione di Facility, personale/difensori e ordini.
  Craft configura l'oggetto e calcola tempo/costo; pagamento automatico o manuale. L'avanzamento
  del turno aggiorna gli ordini e riepiloga quelli conclusi; la release descrive un comando
  del DM. Non adottare soglie, autorità esclusiva, collocazione del comando o intervalli come
  decisioni del nostro prodotto. Il percorso è prova pubblicata, non osservazione diretta.
- [Foundry — Dungeon Master's Guide (2024)](https://foundryvtt.com/packages/dnd-dungeon-masters-guide),
  catalogo corrente del modulo ufficiale commerciale WotC, ultima versione elencata 2.0.0,
  Foundry 13+ verificato 14. Descrive strutture e ordini per ricerca, fabbricazione e altre
  attività; contenuti configurati separati dal supporto del sistema. Non promette contenuti
  ridistribuibili gratuitamente né un nostro acquisto. Conferma la pertinenza del precedente.
- [Kanka — Bastion Sheet (D&D 5e – 2024)](https://plugins.kanka.io/plugins/ea36f0ee-c300-418e-a0a4-6752e180e7e4),
  plugin di April Pereira, versione 1.0 del 22/12/2025; compatibilità dichiarata Kanka 3.7.
  Scheda con strutture, personale, ordini, difese e note, senza automazioni di gioco.
  È una proposta di un autore terzo nel catalogo, non una funzione nativa o prova di ampia
  adozione. La descrizione attribuisce le regole al Player's Handbook: riferimento errato
  rispetto alla fonte DMG seguente, perciò non usarla come autorità normativa.
- [D&D Beyond — Exploring Bastions from the 2024 Dungeon Master's Guide](https://www.dndbeyond.com/posts/1828-exploring-bastions-from-the-2024-dungeon-masters),
  Davyd Barker, data pagina 12/11/2024, nota editoriale 02/03/2026 sul nome 5.5e. Spiega basi,
  strutture, personale, ordini e tempo di gioco. È contesto delle regole, non prova di un
  gestore digitale in Beyond. L'Unearthed Arcana 2023 emersa nella ricerca non viene adottata.

**Adattamento Q095:** una base facoltativa con strutture, personale, attività e risultati,
lasciando la gestione libera tramite appunti. L'estensione a basi personalizzate è proposta
nostra coerente con l'homebrew, non identità di ogni edificio con un bastione regolamentato.
Beneficio: conservare progetti e conseguenze mentre il gruppo è altrove; costo: contenuti,
permessi e avanzamento da specificare senza imporre contabilità alle campagne che non li usano.

**Limiti:** le regole eseguibili richiederanno fonte/edizione/revisione e casi verificati.
Non approvare cataloghi commerciali, simulazione economica generale, gestione di regni,
produzione in tempo reale o numeri delle strutture. Proprietà, eventi e autorità restano aperti.

**Esito:** Q095 confermata il 16/09/2026, I-112/F-025, A14; I-113 precisa integrazione. Dettagli aperti, principi conservati.

## R091 — consultare e modificare materiale personale senza rete

**Consultazione:** 16/09/2026. Fonti primarie, nessuna prova runtime o offline eseguita.
Nessun account, contenuto o stato di rete del proprietario modificati.

- [D&D Beyond — Mobile App: My Characters Tool](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747209378964-D-D-Beyond-Mobile-App-My-Characters-Tool),
  supporto ufficiale aggiornato 17/09/2025, senza versione app indicata. Offline mostra un
  avviso e la scheda nell'ultima versione aperta online; al ritorno della rete aggiorna
  l'elenco. Il testo sui comandi Edit/Copy/Delete non specifica disponibilità offline:
  non usarlo per affermare che ogni modifica o sincronizzazione della scheda sia supportata.
- [LegendKeeper — Imagine Huge Worlds](https://www.legendkeeper.com/features-worldbuilding/),
  pagina pubblica senza data/versione: documenta accesso e modifica offline dei progetti.
  È una capacità pubblicata, non una misura di affidabilità o una prova su questa app.
- [LegendKeeper 0.9: Hydra](https://www.legendkeeper.com/changelog/legendkeeper-0-9-0-0-hydra/),
  Braden Herndon, 28/05/2021, versione storica 0.9. La wiki si modifica offline e sincronizza
  dopo; la release descrive unione dei conflitti e limiti per dati non ancora scaricati,
  nuovi progetti, inviti e immagini. Sono precedenti di flusso, non restrizioni già adottate.
  **Controevidenza importante:** la stessa nota storica dichiara dati segreti presenti
  localmente e tecnicamente estraibili. Non trasferire quel compromesso: I-044 e la
  separazione privato/pubblico restano vincolanti. Non affermare che sia ancora così oggi.

**Ricerca esclusa:** vecchi post/forum Beyond non provano funzionalità offline correnti;
la nota ufficiale 2021 sull'app è solo un precedente dell'accesso. Risultati su PDF personali,
domini di staging o recensioni di altre app non sono stati usati per la raccomandazione.
Stampa/esportazione rimane un ramo distinto, senza PDF o file reali creati.

**Adattamento Q096:** consultare e modificare la propria scheda e gli appunti già disponibili
sul dispositivo, salvare localmente con stato chiaro e sincronizzare al ritorno della rete.
La modifica della scheda è la proposta nostra che combina i precedenti, non una capacità
attribuita senza prova a Beyond. Vantaggio: proseguire preparazione e note senza connessione;
costo: gestire dati disponibili, conflitti e permessi in modo comprensibile.

**Limiti:** non promettere una fusione automatica sempre corretta fra modifiche incompatibili,
segreti locali indiscriminati o stato condiviso aggiornato senza collegamento. Prima apertura,
nuovi contenuti, riconnessione, dati revocati e comportamenti specifici sono da definire.

**Esito:** Q096 confermata il 16/09/2026, I-114/F-026, A12; collegamenti F-006/F-007/F-008, I-058/I-113. Dettagli aperti.

## R092 — esportazione leggibile e dati riutilizzabili

**Consultazione:** 16/09/2026. Fonti primarie lette; capacità e percorsi pubblicati, nessuna
prova runtime, generazione di file, accesso ad account o trasferimento di dati personali.

- [D&D Beyond — Export Sheet](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747238449556-Export-Sheet),
  supporto aggiornato 17/09/2025, versione non indicata. Dal builder, What's Next, oppure
  dalla scheda, Manage accanto al nome → Export to PDF. Produce una scheda PDF compilabile,
  modificabile prima della stampa. Prova dell'uscita leggibile del personaggio, non di
  un'esportazione strutturata per altri VTT o di tutti i dati della campagna.
- [Kanka — Export](https://docs.kanka.io/en/latest/features/campaigns/export.html), documentazione
  senza data; intestazione 1.0.0 del sito, non versione corrente dell'app accertata.
  Settings → Export → elaborazione in background → download ZIP. Distingue JSON con dati
  e immagini da Markdown leggibile; il secondo non è reimportabile in Kanka. Avvio/download
  riservati agli amministratori; frequenza giornaliera e download temporaneo sono limiti del
  riferimento, non decisioni nostre. Il testo avverte di possibili incompletezze modificando
  la campagna durante la generazione.
- [Kanka — Import](https://docs.kanka.io/en/latest/features/campaigns/import.html), stessa
  documentazione senza data. L'import JSON richiede determinati abbonamenti; esclude vecchi
  export precedenti alla 2.1. Importazioni ripetute creano duplicati. Permessi e alcune altre
  categorie non sono esportati: controevidenza alla promessa di backup/ripristino completo.
  Nessun costo, limite o importatore adottato per deduzione.
- [LegendKeeper 0.16.1.0](https://www.legendkeeper.com/changelog/legendkeeper-0-16-1-0/),
  Braden Herndon, 27/08/2024: precedente storico versionato. Menu superiore per il progetto;
  menu dell'elemento o contestuale per una voce, con inclusione facoltativa delle sottovoci.
  LK/JSON conservano dati di pagine, mappe e board; HTML/Markdown offrono copie leggibili
  parziali. In questa release immagini ancora collegate al servizio e permessi esclusi.
  Reimportare crea copie: non equivale a ripristinare lo stato precedente. Non attribuire
  questi limiti storici alla versione corrente senza una nuova verifica.

**Adattamento Q097:** offrire copie leggibili/stampabili e dati esportabili del personaggio
e del materiale di campagna proprio o autorizzato. Beneficio: conservare il lavoro fuori
dall'app e facilitare un futuro riuso senza ricopiare ogni dato. Alternativa: sole copie
leggibili. La combinazione fra scheda e archivio è nostra; non tutti i riferimenti coprono
gli stessi materiali. Definire formati, copertura e collegamenti prima di promettere risultati.

**Limiti:** esportazione, importazione e ripristino sono capacità distinte. Nessuna compatibilità
universale, copia completa di ogni allegato o recupero di tutte le autorizzazioni dedotti.
Non adottare privilegi amministrativi che violino gli appunti Solo io, I-044; visibilità e
permesso di esportare materiale altrui richiedono specifica. Nessuna pubblicazione implicita.

**Esito:** Q097 confermata il 16/09/2026, I-115/F-027, A12. Formati e dettagli aperti;
I-114 conserva l'offline come ramo distinto. I-058/I-113 richiedono semplicità e integrazione.

## R093 — importazione assistita di personaggi e appunti

**Consultazione:** 16/09/2026. Fonti primarie; capacità e percorsi pubblicati, nessuna prova
runtime, installazione, credenziale inserita o materiale reale importato.

- [Foundry — DDB-Importer: A D&D Beyond Integrator](https://foundryvtt.com/packages/ddb-importer),
  catalogo del modulo di MrPrimate, versione più recente letta 7.5.4, per Foundry 14 e
  sistema D&D5e 6.0.x. Il 6.0.2 elencato tra i sistemi è la versione del sistema, non del
  modulo. Documenta import di personaggi Beyond con capacità, armi e incantesimi. È un
  componente aggiuntivo di terzi, non una funzione nativa di Foundry o un nostro connettore.
  Altre categorie hanno requisiti diversi; la matrice di compatibilità mostra che il supporto
  dipende dalle versioni. Non trasferire prezzi o promesse di completezza al nostro prodotto.
- [Alchemy — Importing a Character](https://help.alchemyrpg.com/en/articles/9833429-importing-a-character),
  guida del 06/09/2024, desktop 1.1.0+ richiesto per il percorso Beyond. Descrive personaggio
  reso pubblico alla fonte, link Share, Library → Characters → Import from Beyond → incolla
  link → Import Character; il personaggio appare nella libreria. La guida definisce la
  funzione sperimentale e non funzionante con tutti i personaggi. Documenta anche import
  JSON propri. È un precedente del percorso, non prova di copertura completa attuale.
  Requisito desktop e pubblicazione della scheda non sono decisioni nostre.
- [LegendKeeper — How to import your world](https://www.legendkeeper.com/import-world-legendkeeper/),
  Alex Meehan, 09/01/2026, nessuna versione indicata. Nuovo progetto → logo LK → Import →
  scegli origine/tipo → seleziona file o cartella locale. Documenta HTML, testo, Markdown,
  JSON, vault Obsidian e alcuni ZIP; per Google Docs usa file Markdown esportati.
  Dimostra importazione di documenti/archivi, non comprensione automatica di regole D&D o
  di qualsiasi file. Eventuali costi del prodotto d'origine non sono autorizzati per noi.

**Adattamento Q098:** importazione facoltativa da fonti/formati supportati per personaggi
e appunti, accanto alla ricostruzione manuale I-053. Recuperare ciò che si riconosce e
rendere visibili le parti da completare/correggere applica I-027/I-028: questo riepilogo è
proposta nostra, non un passaggio identico osservato nei tre riferimenti. Beneficio: iniziare
con il lavoro già fatto; costo: mantenere compatibilità e comunicare chiaramente i limiti.

**Controevidenza e limiti:** Alchemy avverte di risultati incompleti e il modulo Foundry
ha vincoli di versione. Non promettere qualsiasi personaggio, PDF, immagine o campagna.
La ricerca iniziale su Shard ha restituito riferimenti storici e una segnalazione di ritiro
dell'importatore, senza una pagina primaria verificata in questa consultazione: non è usata
per affermare che Shard offra oggi l'import da Beyond. Nessuna prova runtime dei concorrenti.
Importare non autorizza modifiche nella fonte, accesso a segreti, conversioni automatiche
fra edizioni o ridistribuzione di contenuti. Formati, fonti concrete, duplicati, permessi,
revisione, annullamento e rete da approfondire; il ripristino completo resta un ramo distinto.

**Esito:** Q098 confermata il 16/09/2026, I-116/F-028, A2/A9/A12; fonti e dettagli aperti.
I-115 conserva l'esportazione distinta e I-053 la ricostruzione manuale. Nessuna integrazione specifica approvata.

## R094 — diario e riepiloghi delle sessioni

**Consultazione:** 16/09/2026. Documentazione primaria e testimonianza storica pubblicata
dal prodotto; nessuna prova runtime o intervista svolta da noi con un tavolo di gioco.

- [Kanka — Journals](https://docs.kanka.io/en/latest/entries/journals.html), pagina senza
  data/versione applicativa; 1.0.0 è l'intestazione della documentazione. Journals per testi
  liberi di preparazione e riepilogo; l'autore può essere collegato al personaggio dal cui
  punto di vista si racconta. Non decide ruoli o permessi del nostro diario.
- [Kanka — How Do I Prep a Session in 30 Minutes?](https://kanka.io/learn/prep), Jon,
  10/04/2026. Descrive elenco dei diari recenti, apertura dell'ultimo resoconto, collegamenti
  tramite menzioni a personaggi/luoghi/missioni e passaggio alle voci pertinenti. Collega
  anche il diario alla data del mondo. È un percorso pubblicato e non una nostra prova.
  I tempi di preparazione dichiarati sono promozionali, non una misura verificata; numero
  di elementi, widget, calendario e sequenza fissa non vengono adottati implicitamente.
- [Obsidian Portal — sito ufficiale](https://www.obsidianportal.com/), pagina corrente senza
  data/versione: presenta Adventure Log per conservare la storia della campagna.
  Conferma l'esistenza della funzione, non l'intero percorso né una generazione automatica.
- [Obsidian Portal — Joining a Campaign](https://help.obsidianportal.com/article/118-joining-a-campaign),
  guida aggiornata 30/07/2020: partecipare permette di contribuire a wiki e Adventure Log.
  È precedente documentale del contributo dei giocatori; non assegna tutti i permessi
  di modifica o pubblicazione ai partecipanti del nostro prodotto.
- [Obsidian Portal — Campaign of the Month, June 2022: Baldur's Gate](https://blog.obsidianportal.com/obsidian-portal-campaign-of-the-month-june-2022-baldurs-gate/),
  01/06/2022. Testimonianza diretta di un gruppo sul blog del prodotto: un giocatore scrive
  il riepilogo e gli altri lo completano; collegamenti a PNG/luoghi aiutano la ripresa.
  Distinguono resoconti per sessione e obiettivi delle missioni. È un caso storico, non
  prova di uso universale, funzione nativa di assegnazione a rotazione o playtest nostro.
  Baldur's Gate è il nome della campagna: non attribuire questa funzione al videogioco BG3.

**Adattamento Q099:** riepiloghi facoltativi organizzati per sessione, anche molto brevi,
con collegamenti a personaggi, luoghi e missioni, consultabili secondo i permessi.
Beneficio: riprendere decisioni e contesto dopo una pausa o un'assenza. Costo: il gruppo
sceglie se e quanto scrivere; non imporre un resoconto per continuare a giocare.
F-007 conserva gli appunti liberi e F-015 gli obiettivi: nessuna separazione in pagine dedotta.

**Limiti:** nessuna registrazione/trascrizione Discord, generazione del racconto, riepilogo
esatto di tutto ciò che è successo o aggiornamento automatico delle missioni approvati.
Log di tiri e racconto non equivalgono. Collegamenti e contenuti rispettano la riservatezza;
contributori, visibilità, ordinamento, date, revisioni, salvataggio e rete da discutere.
Il tentativo di aprire un vecchio indirizzo ipotizzato dell'help Obsidian Portal non ha
restituito una pagina utilizzabile; le fonti effettivamente lette sono quelle elencate sopra.

**Esito:** Q099 confermata e precisata il 17/09/2026, I-117/F-029, A9/A11. L'owner legge
con il gruppo il riepilogo precedente all'avvio di ogni sessione. I-058/I-086/I-113 conservati;
dettagli ancora aperti e nessun ambito concluso.

## R095 — musica ed effetti ambientali per il tavolo remoto

**Consultazione:** 17/09/2026. Guide primarie lette, nessuna riproduzione, download, account
collegato o prova runtime. Distinguere file audio condivisi e chiamate vocali/video.

- [Foundry — Playlists](https://foundryvtt.com/article/playlists/), guida senza data/versione
  esplicita. Audio Playlists → Create Playlist → Add Sound → riproduzione; GM e Assistants
  gestiscono le raccolte. I giocatori vedono quanto è in riproduzione e regolano localmente
  Playlists, Ambient e Interface. Il volume della singola traccia influisce sul tavolo,
  quello globale personale solo sull'ascoltatore. Include file e URL diretti, pausa/arresto
  e modalità di riproduzione. Non dedurre una prova di sincronizzazione precisa: la guida
  parla di pre-caricamento per ridurre ritardi. Segnala inoltre nomi visibili ai giocatori:
  conservare il rischio di spoiler per la definizione della nostra visibilità.
- [Roll20 — Jukebox](https://help.roll20.net/hc/en-us/articles/360039178714-Jukebox), guida
  10/09/2025, versione applicativa non indicata. Manage Audio permette aggiunta/anteprima
  e organizzazione delle tracce. Play/Stop riproduce per tutti i giocatori della sessione;
  si possono sovrapporre atmosfera e musica. My Settings → Master Music Volume permette
  a ciascuno di regolare l'ascolto dal silenzio al volume massimo. Il catalogo e i limiti
  di caricamento appartengono al riferimento, non al nostro prodotto. La guida conserva
  anche tracce di servizi non più disponibili: non promettere qualunque fonte esterna.

**Adattamento Q100:** lettore condiviso facoltativo, controllabile dal DM, con volume
personale fino al silenzio; strumenti esterni sempre utilizzabili. Vantaggio: cambiare
atmosfera dall'ambiente di gioco mantenendo libera la scelta d'ascolto. Non è una prova
che lo sviluppo o i costi siano trascurabili. Sorgenti, archiviazione, caricamento, controlli,
deleghe e rete richiedono specifiche proporzionate al beneficio, secondo I-102/I-058.

**Limiti:** il supporto dei riferimenti non attribuisce diritti sui loro cataloghi e non
approva nostri acquisti. I-102 conserva le chiamate esterne e I-101 il tavolo su Discord.
Nessun bot, registrazione, collegamento a servizi musicali o sincronizzazione al millisecondo
promessi. Suoni spaziali, cambio automatico per scena, effetti dei dadi e segnali di UI
sono rami distinti, non approvati in blocco. Evitare che nomi di tracce svelino segreti.

**Esito:** Q100 risolta per delega il 17/09/2026, I-118/F-030: musica esterna per ora.
L'owner precisa il bot Discord già usato e richiede bassa complessità e semplicità per
un'eventuale inclusione. L'agente non ritiene dimostrata la condizione: la ricerca prova
capacità dei concorrenti, non un costo trascurabile per noi. Nessun divieto permanente,
rifiuto esplicito dell'owner, bot da configurare o acquisto dedotti.

## R096 — aiuti contestuali e guide facoltative per principianti

**Consultazione:** 17/09/2026. Fonti ufficiali, precedenti pubblicati; nessuna prova runtime,
mock o test didattico con persone eseguiti. Non trasferire le regole di BG3 nel motore 2024.

- [Larian — BG3, Patch 7](https://baldursgate3.game/news/patch-7-now-live_121), 05/09/2024,
  precedente versionato. Sezione UI: tutorial di Vantaggio/Svantaggio attivati anche fuori
  dai dialoghi, tutorial specifico per un tiro con svantaggio e consultazione nel Journal
  anche dei tutorial non ancora incontrati, tramite opzione. Prova di aiuto legato al
  contesto e reperibile; non dimostra identici trigger o priorità adatti a un VTT.
- [Larian — BG3, Patch 8](https://baldursgate3.game/news/the-final-patch-new-subclasses-photo-mode-and-cross-play_138),
  15/04/2025. Performance and Options: ripristinare i popup durante la creazione del
  personaggio riabilita anche la relativa impostazione. Documenta controllo dei tutorial
  nelle opzioni e ripristino; nessuna verifica diretta del layout o delle impostazioni correnti.
- [Foundry — Tours](https://foundryvtt.com/article/tours/), guida senza data/versione.
  Game Settings → Tour Management → avvio/ripresa. Breve testo con area pertinente
  evidenziata, passi avanti/indietro e chiusura; se interrotto conserva il progresso.
  Si possono consultare gli stati e ripristinare i percorsi. Alcuni tour sono avviati
  da criteri o comandi specifici. Prova di controllo dell'utente sulla guida, non di
  copertura nativa di tutte le regole D&D o di un catalogo didattico già disponibile per noi.

**Adattamento Q101:** aiuti facoltativi nel contesto e brevi guide richiamabili per imparare
meccaniche e funzioni; chiusura/disattivazione e ritorno alla consultazione, senza obbligo
prima della partita. Beneficio: un principiante riceve spiegazioni nel momento pertinente;
costo: contenuti e trigger da curare senza intralciare il tavolo. Sono una combinazione
proposta per DM e giocatori, non una copia dimostrata dell'intero percorso dei riferimenti.

**Alternativa:** aiuto solo su richiesta. In entrambe I-027 conserva descrizioni, costi,
calcoli e risultati: disattivare un tutorial non deve togliere la trasparenza dell'azione.

**Limiti:** non dedurre primo avvio obbligatorio, strategia suggerita, tutor AI, video,
partita dimostrativa, completa indipendenza dal DM o test di efficacia. Regole, fonti,
EN/IT, homebrew, permessi, accessibilità, memoria dei progressi e rete richiedono specifiche.
La ricerca ha anche restituito guide Beyond sui tooltip dei forum: non usate per sostenere
che lo stesso sistema didattico sia presente nella scheda del personaggio.

**Esito:** Q101 confermata il 17/09/2026, I-119/F-031, A10/A11/A12; I-027/I-058/I-086/I-098 conservati.
I-118 risolve la musica tramite delega e non approva altre funzioni.

## R097 — accordi iniziali della campagna in un appunto condiviso

**Consultazione:** 17/09/2026. Fonti primarie pubblicate; nessuna prova runtime o sessione
zero osservata. La domanda riguarda una traccia facoltativa, non nuovi obblighi per il tavolo.

- [Roll20 — How to Run a Session Zero](https://pages.roll20.net/how-to-run-session-zero),
  Kelly Stanze, 15/05/2026. Descrive un incontro prima dell'avventura e l'uso, da parte di
  alcuni gruppi, di un handout condiviso per conservare gli accordi e consultarli dopo.
  Argomenti suggeriti: premessa, tono, restrizioni del mondo, house rule, orari, assenze
  e comunicazioni. È un uso documentato degli appunti, non un editor guidato dedicato
  verificato. Non adottiamo soglie d'assenza, strumenti vocali o altre funzioni citate.
- [D&D Beyond — Creating Your First Campaign Using the 2024 Dungeon Master's Guide](https://www.dndbeyond.com/posts/1850-creating-your-first-campaign-using-the-2024),
  Riley Silverman, 07/11/2024. La sezione Campaign Start presenta la sessione zero come
  momento per chiarire aspettative, creare/finalizzare i personaggi e riunire il gruppo.
  È orientamento editoriale sul DMG 2024, non prova di un wizard nell'app o fonte di regole
  eseguibili. Non è stato letto o copiato il manuale commerciale completo.

**Adattamento Q102:** offrire negli appunti condivisi una traccia modificabile di argomenti
per gli accordi, consultabile anche dai nuovi partecipanti autorizzati. L'incontro iniziale
resta una conversazione del gruppo. Riusa F-007; non presuppone una nuova pagina o sistema.
Beneficio atteso: aiutare DM inesperti e rendere reperibile quanto deciso; semplicità da
verificare nei percorsi. Nessun risultato d'usabilità o costo d'implementazione misurato.

**Alternativa:** soli appunti liberi e conversazione esterna. Nessuna firma, ratifica
obbligatoria, blocco per iniziare, generazione AI o traduzione automatica del testo in
regole. House rule effettive, permessi, aggiornamenti e organizzazione rimangono da definire.
Il precedente non basta da solo a giustificare ogni funzione accessoria, I-102/I-118.

**Esito:** Q102 confermata il 17/09/2026, I-120/F-032, A11/A1/A10. Il proprietario accetta
a condizione di un precedente pertinente, soddisfatta dall'uso degli handout Roll20 sopra.
La traccia pronta era dichiarata come adattamento, non wizard verificato. Nessun altro sì richiesto.

## R098 — gestire il combattimento senza posizionare pedine su una mappa

**Consultazione:** 17/09/2026. Documentazione ufficiale, nessuna prova runtime o partita
osservata. Ripresa del punto aperto da Q004/I-007, senza cambiare la direzione tattica BG3.

- [Alchemy — Gamemaster Orientation](https://help.alchemyrpg.com/en/articles/9714185-gamemaster-orientation),
  04/09/2024, versione dell'app non indicata. Starting an Encounter: dal pannello NPC il
  comando Initiative apre l'ordine dei turni. Tactical Mode: un comando distinto apre
  mappa o griglia e permette di aggiungere le pedine. Schede e tracker sono raggiungibili
  dal pannello dei partecipanti; azioni e dadi compaiono nel Journal. Precedente pubblicato
  di separazione fra incontro e visualizzazione tattica, non prova del nostro motore 2024.
- [D&D Beyond — Tutorial: How to Build Encounters and Run Them](https://www.dndbeyond.com/posts/1135-tutorial-how-to-build-encounters-and-run-them-on-d),
  15/12/2021, Davyd Barker; precedente storico già utilizzato in R074, riletto per il ramo
  Running an encounter. My Encounters → Run Encounter: elenco, iniziativa automatica o
  inserita, PF/danni/cure, round e Next/Undo, schede mostri e ripresa. Il flusso pubblicato
  non richiede caricamento della mappa o posizionamento; questa conclusione deriva dal
  percorso documentato. Non è verifica del servizio corrente, delle condizioni commerciali
  o di tutte le automazioni e regole D&D 2024. Nessun Undo universale dedotto dal cambio turno.

**Adattamento Q103:** turni e azioni utilizzabili anche senza geometria della scena; il
DM e il tavolo forniscono le valutazioni spaziali necessarie. Conservare I-027/I-032 e
l'autonomia I-006. La copertura esatta delle automazioni non è provata dai riferimenti:
è lavoro aperto del contratto. Un dato spaziale mancante non equivale a verifica positiva.

**Beneficio e costo:** poter improvvisare uno scontro senza preparare una mappa; riuso di
partecipanti, schede e turni, con interazioni per i dati mancanti da specificare. Non è
una stima tecnica né promessa di assenza di complessità. Alternativa: mappa, anche vuota,
necessaria per il combattimento condiviso; resta comunque la scheda individuale I-052.

**Limiti e confronto escluso:** la guida [Foundry Combat Encounters](https://foundryvtt.com/article/combat/)
mostra Link Combat per scollegare un incontro dalla scena, ma descrive l'aggiunta tramite
pedine: quel comando da solo non prova un intero flusso senza mappa. La guida
[Shard Encounters](https://www.shardtabletop.com/howto/encounters) consultata descrive mappa
ed elenco; non usata per sostenere l'assenza della mappa. Le testimonianze promozionali
sulla homepage Alchemy non sostituiscono il percorso della guida.

**Esito:** Q103 confermata il 17/09/2026, I-121, A4/A8/F-001/F-005. Nessun nuovo ambito
numerato o pagina approvata; bersagli, aree, reazioni, transizioni, permessi, salvataggio e rete aperti.

## R099 — assegnare punti esperienza a più personaggi

**Consultazione:** 17/09/2026. Fonti ufficiali di prodotto, nessuna prova runtime o sessione
osservata. Tema: assegnazione condivisa facoltativa, non scelta del metodo di avanzamento
per tutti i gruppi o definizione delle soglie del motore 2024.

- [Foundry D&D — Awards](https://github.com/foundryvtt/dnd5e/wiki/Awards), pagina aggiornata
  il 10/09/2026, indicata per il sistema D&D 6.0.0. Comando Award dal gruppo oppure chat
  apre l'assegnazione; destinatari selezionati, totale diviso o quantità per persona.
  Può conservare PE nel gruppo per distribuirli dopo; i gruppi incontro sommano i PE dei
  PNG. Sono capacità documentate, non una politica obbligatoria da importare. Il limite
  al saldo del gruppo e i comandi testuali non vengono adottati automaticamente.
  Il risultato di ricerca riportava 5.3.0/31 marzo: il corpo della pagina aperta mostra
  6.0.0/10 settembre, usato qui come versione consultata.
- [Fantasy Grounds — 5E Party Sheet](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996641997/5E%2BParty%2BSheet),
  aggiornata il 23/09/2024. Party Sheet → XP → Encounters/Quests → Award: distribuisce
  il totale non ancora assegnato fra i PG della scheda gruppo, marca gli incontri assegnati
  e pubblica le quantità in chat. La stessa vista mostra PE correnti e al livello successivo;
  permette anche premi individuali trascinando un numero. La ripartizione sempre uguale,
  l'accesso solo DM a quella scheda e il gesto drag/drop sono del riferimento, non regole
  di prodotto adottate per deduzione.

**Adattamento Q104:** operazione facoltativa del DM per distribuire PE ai personaggi scelti,
aggiornare le schede e conservare traccia. Calcoli e correzioni seguono I-027/I-028/I-029.
Riusa F-008 e raccorda ricompense A7/preparazione A8. Beneficio: evitare modifiche ripetute;
costo: coerenza fra schede, correzioni e duplicazioni da specificare, senza stima tecnica.

**Alternativa:** aggiornamenti individuali. In entrambe resta l'avanzamento senza conteggio
PE su indicazione del DM e la conferma I-055 prima di applicare le scelte del nuovo livello.
Non si adotta un'impostazione denominata milestone né un pulsante che alza tutti i livelli.
Le ricerche Beyond hanno restituito soprattutto forum: non usati come prova di un comando
collettivo o di automatismi non documentati nei due riferimenti principali.

**Confini aperti:** metodi XP/senza punti e relativi controlli, destinatari, assenze, livelli
diversi, importi, arrotondamenti, premi narrativi o da incontri, soglie 2024 con fonte
immutabile, assegnazioni duplicate, rettifiche, visibilità e rete. Non ricavare PE dalle
uccisioni o dalla missione completata senza una scelta successiva sul relativo automatismo.

**Esito:** Q104 confermata e precisata il 17/09/2026: I-122 assegnazione PE facoltativa,
I-123 milestone senza PE e caso reale del gruppo. R100 approfondisce il secondo modo.
A2/A7/A8/F-008; nessun nuovo ambito numerato o pagina.

## R100 — avanzamento a milestone senza punti esperienza

**Consultazione:** 17/09/2026. La precisazione dell'owner a Q104 è autorità diretta sul
bisogno e sul caso reale; la ricerca verifica il precedente senza chiedere un secondo sì.
Nessuna prova runtime o verifica di una regola eseguibile effettuata.

- [D&D Beyond — Beta Release Notes, Phase 2 & 3](https://www.dndbeyond.com/forums/d-d-beyond-general/news-announcements/3653-updated-beta-release-notes-phase-2-3-character),
  annuncio del 30/06/2017 di BadEye, indicato come D&D Beyond Founders. Builder Sections →
  Home distingue Milestone e XP nelle preferenze. Precedente storico ufficiale, non prova
  che posizione, default o limitazioni della beta siano ancora attuali.
- [D&D Beyond — risposta del moderatore sul tipo di avanzamento](https://www.dndbeyond.com/forums/d-d-beyond-general/bugs-support/239031-cant-find-how-to-switch-to-experience-level-up),
  23/04/2026, risposta #2 di spamandtuna, identificato come D&D Beyond Moderator: rimanda
  alle impostazioni del personaggio e al cambio fra Milestone e XP. È assistenza del
  moderatore sul forum ufficiale, non prova diretta dell'interfaccia o di un comando del DM
  per alzare i livelli dell'intero gruppo. Non usati i dettagli aggiunti da altri utenti.

**Applicazione:** I-123 conserva il significato espresso dall'owner: niente PE, aumento di
livello ai traguardi stabiliti dal DM. Non trasferire il default storico di Beyond a tutte
le campagne; non richiedere PE fittizi o applicare le scelte del livello automaticamente.
Il termine milestone qui segue la pratica dichiarata, senza confonderla con premi in PE
per obiettivi. Comandi, segreti, collegamenti alle missioni e cambi di metodo restano aperti.

**Esito:** I-123/Q104/F-008 confermato; caso reale in AGENDA. Non è una nuova domanda.

## R101 — revisione guidata di un personaggio già in uso

**Consultazione:** 17/09/2026. Precedenti ufficiali pubblicati, senza prova runtime.
La domanda riguarda l'assistenza dedicata; il diritto di correggere I-028 è già acquisito.

- [Larian — Community Update 21, Forging Your Legacy](https://baldursgate3.game/news/community-update-21-forging-your-legacy_77),
  comunicazione pre-lancio di BG3. Respeccing Classes descrive un NPC che consente di
  rifare la costruzione dal primo livello, scegliendo nuovamente competenze, attributi
  e incantesimi. È un riferimento al percorso, non una regola D&D 2024 da importare.
- [Larian — Community Update 22](https://baldursgate3.game/news/community-update-22-wield-the-power-of-a-mind-flayer_75),
  comunicazione pre-lancio. Respec Your Party documenta cambiamenti di classe e combinazioni
  anche per compagni e personaggi Origin. Conferma la possibilità generale; non dimostra
  ogni nostra tutela sui dati, sulle risorse consumate o sugli effetti preesistenti.
- [Foundry D&D — Advancement User Guide](https://github.com/foundryvtt/dnd5e/wiki/Advancement-User-Guide),
  pagina aggiornata il 31/01/2024, badge 3.0.0 e testo con riferimenti a 1.6: precedente
  storico, non descrizione verificata della versione corrente. Features → modifica classe →
  Advancements → Modify Choices ripropone le scelte di un livello. Rimozione classe o
  riduzione livello mostra una conferma e un'opzione per rimuovere capacità assegnate.
  Il testo avverte che modifiche manuali durante l'avanzamento possono essere annullate:
  questo limite non viene adottato e richiede tutela nel nostro percorso.

**Adattamento Q105:** riaprire le scelte interessate, rendere visibili le conseguenze e
applicarle dopo revisione, mantenendo identità narrativa, appunti e inventario. Raccorda
I-055/I-056/I-057 e F-008; non importa costo, NPC obbligatorio, guarigione o altri vincoli
BG3. La conservazione dei dati e il riepilogo sono proposta nostra esplicita, non capacità
identiche provate in ciascun riferimento. Beneficio: ridurre modifiche ripetute e residui
delle vecchie capacità; costo: dipendenze e stato di gioco da gestire, senza stima misurata.

**Alternativa:** sole modifiche manuali, sempre correggibili. Rimangono da definire scelte
coinvolte, classe/sottoclasse, multiclasse, requisiti e deroghe, PF, slot già spesi, effetti,
contenuti personalizzati, autorizzazioni, bozza, annullamento e rete. Non trasforma la
possibilità tecnica in permesso narrativo automatico o approvazione digitale obbligatoria.

**Esito:** Q105 confermata il 17/09/2026, I-124, A2/F-008; nessun nuovo ambito numerato o pagina.

## R102 — copie indipendenti del personaggio

Verificato il 17/09/2026 per Q106, A2/A1/F-008/F-006. Capacità pubblicata, non osservazione
runtime; nessuna importazione di dati o copia eseguita.

- **Fonte primaria:** [Roll20 Characters](https://help.roll20.net/hc/en-us/articles/360037258594-Roll20-Characters),
  data mostrata 16/02/2024, versione applicativa non indicata. Corpo letto, in particolare
  Managing Characters, Copy Character, Add to Game e FAQ.
- **Precedente pertinente:** Copy Character crea una copia scollegata dalla partita;
  la guida lo raccomanda per usare versioni del personaggio in più partite contemporanee.
  Percorso pubblicato: Tools → Roll20 Characters → gestione del personaggio → Copy Character.
- **Distinzione:** Add to Game collega invece una scheda a una partita e ne sincronizza
  le modifiche. Import From Game crea una fotografia; Transfer to Game sposta la scheda.
  La frase generale sulla mancata sincronizzazione va letta insieme a queste sezioni:
  non significa che ogni modalità Roll20 sia sempre indipendente. Limiti commerciali non adottati.
- **Adattamento proposto:** comando facoltativo per una copia indipendente, utile per altre
  avventure o esperimenti. Dati copiati, permessi e contenuti privati da definire; non si
  assume di copiare tutto ciò che Roll20 include. Nessuna copia obbligatoria o limite a una
  sola campagna imposto al personaggio originale.
- **Controllo distinto:** [Joining a D&D Beyond Campaign](https://dndbeyond-support.wizards.com/hc/en-us/articles/14025808350612-Joining-a-D-D-Beyond-Campaign),
  aggiornato 27/08/2025, descrive ingresso tramite invito con personaggio esistente,
  nuovo, predefinito o da prendere in carico. Corpo letto; non prova una duplicazione
  indipendente né il comportamento dello stesso personaggio in campagne contemporanee.
- **Limiti:** nessuna prova d'uso, valutazione dei permessi effettivi o test della copia.
  Continuare lo stesso personaggio fra avventure, gestione di segreti e ripristino restano aperti.

**Esito:** Q106 confermata il 17/09/2026, I-125; nessun nuovo ambito numerato o pagina.

## R103 — consultazione autonoma di regole e contenuti

Verificato il 17/09/2026 per Q107, A10/F-033, checklist J06/J11. Conservate ricerca C11
(authoring distinto dagli effetti) e C14 (fonti e localizzazioni) in evidence/research-01/claims.md;
nessuna vecchia sequenza progettuale ripresa. Solo capacità pubblicate e pagine web lette;
nessun test dei controlli o prova d'uso dell'app.

- **Roll20, precedente pertinente:** [Compendium](https://help.roll20.net/hc/en-us/articles/360039178694-Compendium),
  pagina datata 05/09/2023, versione applicativa non indicata. Descrive consultazione
  esterna e interna al VTT. Percorso pubblicato: Tools → Compendium → raccolta → categoria
  o ricerca → voce. Categorie di regole, classi, oggetti, incantesimi e mostri; filtri
  specifici negli elenchi e accesso alla pagina della voce. Questo sostiene l'uso autonomo.
  La guida è storica: esempi sul vecchio SRD e licenze non definiscono il catalogo 2024
  dell'app. Non adottati acquisti, restrizioni commerciali o assenza di persistenza dei filtri.
- **Beyond, riscontro nelle pagine pubbliche:** [Spells](https://www.dndbeyond.com/spells)
  e [Magic Items](https://www.dndbeyond.com/magic-items), pagine correnti senza data/build
  esposta. Letti ricerca per nome, filtri di classe/livello/concentrazione/fonti per gli
  incantesimi e tipo/rarità/sintonia per gli oggetti. Non eseguiti filtri, accesso a contenuti
  riservati o prove della disponibilità di ogni voce senza account.
- **Foundry, ricerca generale e contestuale:** [Compendium Browser](https://github.com/foundryvtt/dnd5e/wiki/Compendium-Browser),
  revisione indicata 10/09/2026, sistema D&D 6.0.0. Apertura dal comando Open Compendium
  Browser nella sezione Compendium Packs; ricerca e filtri fra più raccolte, categorie
  ordinarie e modalità avanzata. Selettori contestuali possono restringere tipo e filtri.
  I risultati per i giocatori rispettano l'accesso alle raccolte. Non prova consultazione
  esterna al mondo Foundry: per quell'asse ci si basa su Roll20 e sugli elenchi Beyond.

**Raccomandazione:** consultazione autonoma facoltativa, oltre ai riferimenti nei percorsi
acquisiti. Beneficio: imparare, preparare scelte e cercare regole senza modificare una scheda.
Costo aggiunto da valutare nelle pagine: reperibilità, ricerca, filtri, gestione delle fonti
ed EN/IT; nessuna misura di semplicità o stima tecnica già dimostrata.

**Confini:** contenuti consultabili distinti da opzioni abilitate, capacità acquisite e
informazioni segrete della campagna. C11/C14 e permessi restano validi; nessun catalogo
universale, interpretazione automatica del testo libero o funzione editoriale pubblica dedotta.

**Esito:** Q107 confermata il 17/09/2026, I-126/F-033; nessuna pagina approvata.

## R104 — pubblicazione volontaria e catalogo comunitario di homebrew

Verificato il 17/09/2026 per Q108, A10/F-009/F-033. R046–R047 conservano riuso personale e
condivisione/abilitazione Shard, già confermati; qui si valuta la scoperta pubblica delle
creazioni altrui. C10/C11 della ricerca iniziale conservano destinatari e distinzione fra
contenuto ed effetti. Nessuna vecchia struttura recuperata.

- **Fonte primaria pertinente:** [Beyond — Sharing and Publishing Homebrew Content](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747210455828-Sharing-and-Publishing-Homebrew-Content),
  aggiornato 29/09/2025. Pubblicazione non necessaria per usare contenuti nel gruppo;
  pubblicare rende la creazione reperibile negli elenchi comunitari. Percorso documentato:
  dettaglio della creazione → Publish → revisione → elenco pubblico. Chi trova la voce
  può usare Add to Collection per aggiungerla alla propria libreria. La guida menziona
  abbonamenti, moderazione preventiva e limiti a modifica/rimozione delle versioni pubblicate.
  Questi vincoli non vengono proposti come parte automatica della nostra scelta.
- **Percorso del destinatario:** [Beyond — Homebrew Creation and Collection Basics](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747238519700-Homebrew-Creation-and-Collection-Basics),
  aggiornato 29/09/2025. Distingue My Homebrew Creations e My Homebrew Collection; elenchi
  pubblici → voce → Add to Collection, poi uso negli strumenti. Remove From Collection
  rimuove la voce dalla propria raccolta, non equivale al ritiro pubblico da parte dell'autore.
  La pagina contiene indicazioni commerciali non necessarie a questa raccomandazione;
  non si trae una politica corrente dei prezzi né si cambia la gratuità del nostro prodotto.
- **Controevidenza e limiti:** [Beyond — Homebrew Rules & Guidelines](https://www.dndbeyond.com/homebrew-rules-guidelines),
  pagina con data iniziale 20/06/2017, nessuna revisione recente esposta. Distingue uso privato
  e pubblico e prescrive criteri di ammissione, inclusi lingua e contenuti ammessi. Testo
  consultato come politica del prodotto, non consulenza legale o nostra politica approvata.
  I vincoli inglese soltanto e irreversibilità non sono compatibilità implicitamente richieste.

**Tipo di prova:** documentazione ufficiale letta; nessun account, pubblicazione, aggiunta
alla raccolta o prova di moderazione eseguiti. Nessuna stima del carico o numero di moderatori.

**Raccomandazione:** catalogo pubblico facoltativo per rendere scopribili e riutilizzabili
le creazioni originali, mantenendo uso personale/condivisione del tavolo senza pubblicazione.
Il beneficio è riusare lavoro di altri autori. Richiede anche gestione di pubblicazione,
moderazione, segnalazioni e revisioni; non è giustificato soltanto dall'esistenza in Beyond.
Forma, responsabilità e sostenibilità da discutere. Abilitazione comune I-066 e aggiornamenti
espliciti I-067 restano validi; Add to Collection non prova copie indipendenti o update automatici.

**Aggiornamento dopo Q108, 17/09/2026:** R105 conserva un changelog ufficiale Beyond del
2018 che descrive l'abbandono della revisione preventiva generalizzata. È in contrasto con
l'assistenza aggiornata nel 2025 citata sopra: il flusso di moderazione attuale non è verificato.
La separazione privato/pubblico e l'aggiunta alla raccolta restano sostenute dalle fonti.

**Esito:** Q108 confermata I-127, ramo di F-009/F-033; nessuna nuova pagina approvata.

## R105 — controlli automatici e ruolo dei moderatori nella pubblicazione

Verificato il 17/09/2026 per Q109, A10/A1/F-009/F-033. Approfondimento della responsabilità
operativa introdotta dal catalogo I-127, non micro-decisione sulle soglie. Nessuna prova
runtime, account creato, servizio integrato o contenuto inviato.

- **Controevidenza primaria Beyond:** [Homebrew Sharing Process Changes](https://www.dndbeyond.com/old-changelog/283-homebrew-sharing-process-changes),
  Dave Hartless, 31/07/2018, testo dell'annuncio letto. Descrive l'abbandono della revisione
  umana preventiva generalizzata per le code, sostituita da controlli automatici e
  pubblicazione immediata se superati; moderatori esaminano segnalazioni e successive
  ripresentazioni. È un precedente storico, non prova della modalità corrente. La guida
  di assistenza datata 29/09/2025 in R104 descrive invece una coda per ogni pubblicazione:
  fonti ufficiali discordanti, nessuna scelta arbitraria di quale rappresenti il runtime.
  Controlli specifici, restrizioni linguistiche, voti e politiche di sospensione non adottati.
- **Precedente corrente pubblicato, mod.io:** [Moderation](https://docs.mod.io/moderation)
  e [Content Approval](https://docs.mod.io/moderation/manual-curation/), documentazione
  corrente senza data/release esposta. Letti controlli automatici con esiti differenziati,
  regole configurabili, approvazione dei contenuti e segnalazioni. La modalità No Curation
  consente pubblicazione dopo i controlli senza approvazione umana per ogni elemento;
  la documentazione la raccomanda e distingue Full Curation, che mette tutto in attesa.
  Percorso pubblicato di configurazione: Game Admin → Settings → Content → Curation;
  casi da esaminare nella gestione della moderazione, operata da persone autorizzate.
  Non si adottano intera gerarchia dei ruoli, controlli antivirus per file non previsti,
  default specifici, automatismi di rimozione o affermazioni legali/promozionali del fornitore.

**Raccomandazione:** pubblicazione dopo controlli automatici con revisione umana mirata,
per evitare che ogni autore aspetti una persona. Criteri, capacità e fallimenti dei controlli
rimangono da definire; non possono garantire automaticamente diritti, qualità o bilanciamento.
La moderazione umana non sparisce: casi dubbi e segnalazioni richiedono responsabilità reali.

**Alternativa:** approvazione umana di ogni nuova pubblicazione, come Full Curation mod.io.
Controllo preventivo più esteso, con carico e attesa per ciascuna proposta; nessuna stima
misurata di tempi, persone o costo, né disponibilità dell'owner presupposta.

**Confini:** uso personale e condivisione nel gruppo non richiedono questa approvazione.
Requisiti di pubblicazione, gestione dei casi dubbi, segnalazioni, ricorsi, revisioni,
ritiro e contenuti già utilizzati sono punti di ritorno. Nessuna integrazione con mod.io,
nuovo servizio a pagamento o delega del ruolo globale ai DM della campagna.

**Esito:** Q109 risolta per delega il 17/09/2026, I-128: adottata la raccomandazione 1. Nessuna pagina.

## R106 — partecipare come giocatore da smartphone

Verificato il 17/09/2026 per Q110, A1/A12/F-016, raccordi F-001/F-002/F-005/F-008.
I-101/R079–R080 conservano laptop remoto e schermo condiviso; non avevano deciso l'ampiezza
funzionale da telefono. Documentazione primaria, nessuna sessione giocata o prova touch.

- [Shard — Playing a Character](https://www.shardtabletop.com/howto/playing-a-character),
  Darren Shakib, 23 agosto, anno e build non esposti nel testo. Documenta personaggi e
  campagne su desktop, laptop, tablet e telefono. Sugli schermi stretti scheda e mappa
  compaiono una alla volta; pulsanti in alto permettono di passare fra le viste.
- [Shard — Quickstart Revisited](https://www.shardtabletop.com/blog/quickstart-revisited),
  Hal Howard, 5 giugno, anno/build non esposti. Dichiara il telefono da sempre destinato
  ai giocatori e descrive estensione del supporto alla conduzione DM. Sostiene il contesto
  del telefono come dispositivo di gioco, non una garanzia di ogni funzione o prestazione.
  Il supporto DM del riferimento non diventa una scelta dell'owner in Q110.
- [Shard — Ping and Measure](https://www.shardtabletop.com/blog/ping-and-measure),
  Hal Howard, 11 settembre, anno/build non esposti. Pubblica pressione prolungata sul token
  seguita da trascinamento col dito per misurare senza muovere il token. Conservato come
  riferimento d'interazione touch; visibilità delle misure e gesto non adottati implicitamente.
- [Owlbear — Getting Started](https://docs.owlbear.rodeo/docs/getting-started/), documentazione
  corrente senza data/build esposta. Descrive VTT nel browser utilizzabile su mobile e
  desktop, centrato su mappe e token. Non prova parità della scheda D&D o tutte le nostre
  automazioni: il confronto sul rapporto scheda/mappa si basa su Shard.

**Raccomandazione:** esperienza completa del giocatore anche da smartphone, con comandi
adatti al touch e passaggio fra scheda e mappa. Il beneficio è poter partecipare senza
laptop; il costo riguarda progettazione e verifica dedicate su schermi piccoli. Alternativa:
telefono di supporto per scheda/dadi/appunti, computer per interagire con la mappa.

**Limiti:** nessuna prova runtime, prestazione minima, compatibilità Discord in contemporanea,
app nativa, accesso offline completo o usabilità equivalente già dimostrati. Comandi mouse
non trasferiti automaticamente al touch. Dadi fisici/digitali, rete, permessi e visibilità
rimangono requisiti e punti di verifica. Non importa i limiti di campagna, condivisione o
regole di morte descritti in altri paragrafi dei riferimenti Shard.

**Esito:** Q110 accettata il 17/09/2026 con riserva di fattibilità, I-129; laptop del gruppo ribaditi. Nessuna prova runtime o pagina approvata.

## R107 — richieste di tiro a più personaggi e risultati raccolti

Verificato il 17/09/2026 per Q111, A3/A6/A8/F-002. Ripresa della funzione dadi e conduzione
DM, con I-027/I-032 già vincolanti. Nessuna prova di gioco, installazione o lettura del
codice eseguibile: documentazione degli autori, non funzionalità native indistinte dei VTT.

- **Foundry, estensione:** [Monk's TokenBar](https://foundryvtt.com/packages/monks-tokenbar),
  autore Ironmonk, versione elencata 14.01 compatibile/verificata Foundry 14, aggiornamento
  indicato quattro mesi fa. Letto anche il [README dell'autore](https://github.com/ironmonk108/monks-tokenbar)
  sul ramo main, senza SHA fissato. Selezione dei token → dialogo del tiro → tipo e
  partecipanti → Request → richiesta in chat ai giocatori, con risultati nella scheda.
  CD facoltativa, esito calcolato e visibilità per modalità del tiro; documentate richieste
  di abilità e scheda dei risultati apribile separatamente per seguirli. Il riepilogo dei
  partecipanti ancora in attesa è il nostro adattamento del percorso; non una dicitura
  esatta verificata nella UI. Vecchi numeri di release nel testo non provano test su 14.01.
- **Fisico/digitale, estensione Fantasy Grounds:** [Requested Rolls](https://forge.fantasygrounds.com/shop/items/273/view),
  autore mccartysr, scheda corrente senza versione/data di revisione esposta. Documenta
  richieste dal DM per caratteristiche, abilità, tiri salvezza e altro; finestra dei tiri
  manuali con scelta fra dado fisico e lancio digitale. Verifica pertinente a I-032,
  non prova del riepilogo collettivo. Nessun acquisto o integrazione dell'estensione.

**Raccomandazione:** richiesta multipla facoltativa con raccolta dei risultati, mantenendo
risposta individuale e dadi fisici/digitali. Beneficio: distinguere chi ha risposto e
associare i risultati alla richiesta; costo: destinatari, attesa, sovrapposizioni e
correzioni da definire. Tiri ordinari restano possibili senza richiesta del DM.

**Confini:** raccolta di prove individuali distinta dalle regole per un esito collettivo.
Nessuna maggioranza automatica, CD pubblica o fissa, tiro sostitutivo forzato, blocco del
movimento, assegnazione PE o regola 2014 di lotta importati dalle altre funzioni dei moduli.
Concentrazione, bonus e richieste multiple richiedono percorsi dedicati; nessuna compatibilità
universale o equivalenza con tutte le automazioni 2024 dimostrata.

**Esito:** Q111 confermata il 17/09/2026, I-130; nessuna pagina approvata.

## R108 — gioco scritto fra sessioni e partecipazione in momenti diversi

Consultato il 17/09/2026 per Q112, A1/A9/A11/F-034. Confronto di contesti di gioco;
fonti primarie editoriali e di assistenza, nessuna prova runtime o integrazione verificata.

- [D&D Beyond — Play-by-Post: Playing Dungeons & Dragons in PbP Forums and Discord](https://www.dndbeyond.com/posts/1668-play-by-post-playing-dungeons-dragons-in-pbp),
  Michael Galvis, 24/02/2024. Descrive gioco scritto con post e tiri e riferisce un uso
  ibrido: chiamate periodiche e messaggi fra le sessioni. Documenta forum Beyond e Discord
  come alternative. Evidenza storica del formato, non verifica dell'accesso attuale al forum
  né di una funzione integrata nella pagina campagna. Le parti sulle regole non sono fonti
  del motore 2024; misure contro alterazioni dei tiri non annullano I-028/I-032.
- [StartPlaying — What is Play by Post?](https://intercom.help/startplaying/en/articles/14425612-what-is-play-by-post),
  Mandycore the Manticore, 01/04/2026. Descrive contributi in momenti diversi e Discord
  come sede usuale delle partite: l'alternativa esterna è un pattern praticato, non una
  rinuncia a giocare. StartPlaying organizza l'accesso ai gruppi, non offre qui la prova
  di un proprio motore narrativo o di tiri. Prezzi e ricerca di gruppi non adottati.

**Raccomandazione e adattamento:** scene scritte facoltative nella campagna per dialoghi
ed eventi fra sessioni. Il beneficio atteso è ritrovare testo e tiri pertinenti nello
stesso contesto, evitando ricostruzioni fra conversazione e scheda. La collocazione e il
collegamento dei dati sono proposta nostra, non UI identica attribuita a Beyond. Costo:
serve un percorso dedicato a risposte differite, visibilità e aggiornamenti; facoltativo
non significa privo di complessità. Alternativa valida: continuare questi scambi su Discord.

**Confini:** nuova scelta di scopo, non conseguenza automatica delle note condivise,
del diario o dell'uso senza tutto il gruppo. Nessuna approvazione di forum pubblico,
DM automatico, notifiche esterne, bot o combattimento interamente asincrono. Il contesto
asincrono riguarda orari diversi; la mancanza di rete rimane una questione distinta.

**Integrazione dopo la risposta Q112, 17/09/2026:**
[AnyTale — A Play by Post Roleplay Platform for RPG Campaigns](https://anytalerpg.com/play-by-post-rpg)
presenta scene asincrone con personaggi e tiri associati alla scena. Pagina del produttore,
priva di data/versione esposta; nessuna prova runtime, diffusione o qualità indipendente
verificate. Riscontro più diretto per il collegamento proposto, senza assumere identici
permessi, automazioni D&D o supporto dei dadi fisici.

**Esito:** Q112 confermata il 17/09/2026, I-131: precedente documentato, condizione soddisfatta.
L'owner prevede poco uso del proprio gruppo; nessuna rinuncia o priorità dedotta. Nessuna pagina approvata.

## R109 — veicoli con carico, equipaggio e collegamento al gruppo

Consultato il 17/09/2026 per Q113, A6/A7/A8/F-035. Capacità pubblicate del sistema D&D
per Foundry; nessuna installazione, prova runtime o lettura del codice eseguibile.

- [Foundry D&D5e — release 5.2.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-5.2.0),
  autore Fyorl; pagina con giorno 27 novembre, anno non esposto nel testo estratto;
  tag release-5.2.0 e commit breve 905c29b. Le sezioni Vehicle Sheets e Group Sheet
  Integration documentano equipaggio/passeggeri, animali da traino e capacità di carico;
  collegando il mezzo principale al gruppo si possono usare inventario e velocità di viaggio
  del veicolo. È una release storica specifica, non la versione attuale dichiarata.
- [Foundry — Premium Content Showcase 2026](https://foundryvtt.com/article/content-showcase-2026/),
  sezione D&D5e Content; anno nel titolo, data/build esatti non esposti. Riprende la scheda
  dei veicoli e il collegamento al gruppo, con carico e velocità. Conferma documentale
  successiva del pattern; pagina promozionale primaria, non prova di usabilità.

**Raccomandazione:** gestione facoltativa del veicolo con dati propri e collegamento al
gruppo, per chi utilizza carri o navi nell'avventura. Beneficio: sapere cosa trasporta
il mezzo e chi viaggia a bordo senza ricostruire più appunti. Alternativa: semplici note
e inventario ordinario. Carico, viaggi, controlli e permessi richiedono percorsi specifici;
nessuna semplicità o fattibilità già dimostrata per la nostra integrazione.

**Confini:** i diversi regolamenti veicolari offerti da Foundry non vengono approvati in
blocco. Combattimento navale, cavalcature, movimento simultaneo dei token, danni e riparazioni
rimangono rami aperti; nessun comportamento automatico dedotto dalla presenza della scheda.
Nessun contenuto commerciale riprodotto o acquisto implicito. F-003/F-021/F-023 conservati.

**Esito:** Q113 confermata il 18/09/2026, I-132; F-035 parziale, nessuna pagina approvata.

## R110 — preparazione e riuso delle trappole con risoluzione assistita

Consultato il 18/09/2026 per Q114, A6/A8/A10/F-036. Documentazione dei prodotti e degli
autori delle estensioni; nessuna prova runtime, installazione o lettura del codice eseguibile.

- [Roll20 — It's A Trap, README dello script](https://github.com/Roll20/roll20-api-scripts/blob/master/Its%20A%20Trap/README.md),
  repository Roll20/roll20-api-scripts, ramo master non fissato a SHA, intestazione v3.13;
  data di revisione non esposta. TrapMaker apre la configurazione in chat per un token
  selezionato; proprietà e note riservate vengono conservate. Sono documentati innesco
  sull'attraversamento e comando Activate Trap. I Trap Themes aggiungono effetti specifici
  del sistema; non assumere che il tema generico esegua ogni regola D&D 2024.
- [Foundry — Trapped Doors](https://foundryvtt.com/packages/trapped-doors), autore Echihl,
  versione 1.1.3 per Foundry 10, pagina aggiornata circa tre anni e otto mesi fa.
  Precedente storico: creare l'effetto, salvarlo nel compendio e sceglierlo per una porta;
  all'apertura, in dnd5e, la scheda dell'effetto permette al DM di tirare o chiedere un
  tiro salvezza. Supporta riarmo. Non prova compatibilità con Foundry 14 o la versione 6 del sistema dnd5e.
- [Foundry — Scene Regions](https://foundryvtt.com/article/scene-regions/), documentazione
  corrente senza revisione esposta, sezione A Simple Trap. Il caso nativo collega un'area
  a pausa e testo; danni e salvezza possono essere risolti separatamente. Controevidenza
  all'attribuzione di ogni automazione delle estensioni al nucleo Foundry.

**Raccomandazione:** preparare e riutilizzare facoltativamente descrizione, tiri ed effetti
per ritrovarli quando serve, lasciando libero il DM di improvvisare. È il pattern di
configurazione preventiva dei riferimenti, adattato ai nostri dadi fisici/digitali e alle
correzioni. Riduce la ricostruzione ripetuta durante la sessione; configurazione e integrazione
richiedono comunque percorsi dedicati, senza promessa di coprire ogni trappola automaticamente.

**Confini:** la domanda riguarda preparazione/riuso/risoluzione assistita. Trigger, ricerca,
percezione passiva, disinnesco, soluzioni creative, segreti, danni, reazioni e interruzioni
richiedono definizione distinta. Il precedente non prescrive tiro digitale automatico,
pausa globale, teletrasporto del token, cancellazione dopo cinque minuti o rivelazione.
Regole e fonti 2024 da verificare per il caso effettivo; nessuna regola numerica fissata.

**Esito:** Q114 confermata il 18/09/2026, I-133; F-036 parziale, nessuna pagina approvata.

## R111 — lingue dei personaggi e comprensione dei testi condivisi

Consultato il 18/09/2026 per Q115, A13/A9/A3/F-037. Documentazione dell'estensione e del
suo autore; nessuna prova runtime, installazione o lettura del codice eseguibile.

- [Foundry — Polyglot](https://foundryvtt.com/packages/polyglot), autore Matheus Clemente,
  versione elencata 2.10.2, Foundry 14+ verificato 14, aggiornamento indicato una settimana
  fa. Pubblica selezione della lingua in chat e comprensione dei testi Journal secondo
  le lingue note, incluse lingue custom; D&D 5e è fra i sistemi supportati.
- [Polyglot — Features](https://github.com/mclemente/fvtt-module-polyglot/wiki/Features),
  revisione mostrata 12/05/2024, senza SHA fissato. La selezione in chat comprende una
  casella per inviare testo normale; il proprietario di un Journal può rimuovere il
  mascheramento. Segnala che al caricamento tratta soltanto gli ultimi cento messaggi.
  Questi limiti non sono requisiti nostri né prova di tutela dei segreti.
- [Understanding Core Behavior](https://github.com/mclemente/fvtt-module-polyglot/wiki/Understanding-Core-Behavior),
  revisione 16/03/2024: personaggio assegnato e token selezionato influenzano lettura e
  identità dei messaggi. Non importare questi default senza definire i nostri casi con
  più personaggi, deleghe e assenza di mappa.
- [FAQ](https://github.com/mclemente/fvtt-module-polyglot/wiki/FAQ), revisione 16/03/2024:
  per testi sugli oggetti descrive limiti di integrazione e modifica da parte dell'owner;
  propone un Journal collegato. Controevidenza alla copertura automatica di ogni superficie.

**Raccomandazione:** funzione facoltativa che associa una lingua narrativa al testo e ne
mostra il senso secondo le conoscenze del personaggio; il DM può condividere liberamente
il testo di cui dispone. Beneficio: evita versioni e invii separati per un'iscrizione o
un messaggio. Alternativa: testo leggibile e gestione manuale/interpretata delle lingue.
Il nostro adattamento conserva i permessi già concordati; il mascheramento del riferimento
non basta a definirli. Aspetto dei caratteri e controllo puntuale di rivelazione restano aperti.

**Confini:** nessuna traduzione reale del Draconico, localizzazione EN/IT sostituita o
analisi dell'audio. Le specifiche capacità magiche si verificano sulle regole applicabili,
non si appiattiscono sulla conoscenza di tutte le lingue. Nessuna esposizione di note private,
nessuna promessa di protezione tecnica o comportamento retroattivo basata su questa ricerca.

**Esito:** Q115 accettata concettualmente il 18/09/2026, I-134; opzione 1 adottata su delega
circoscritta. I-113 ribadita sulla fattibilità dell'insieme; nessuna pagina o prova runtime.

## R112 — assistere al tavolo senza controllare il gioco

Consultato il 18/09/2026 per Q116, A1/F-006. Documentazione primaria; nessuna sessione
osservata, prova runtime, invito inviato o trasmissione avviata.

- [Foundry — Users and Permissions](https://foundryvtt.com/article/users/), aggiornamento
  20/10/2025, versione documentata 13.350. Distingue ruoli utente e permessi sui documenti;
  Observer consente normalmente lettura senza modifica. Non è un ruolo globale Spettatore:
  un nostro profilo che raggruppi questi limiti è un adattamento. Accesso ai documenti e
  comandi generali richiedono permessi coerenti, non basta assegnare Observer a una scheda.
- [Alchemy — Player Orientation](https://help.alchemyrpg.com/en/articles/9821384-player-orientation),
  guida del settembre 2024. Documenta spettatori e un elenco visibile di chi assiste.
  Non stabilisce da sola la matrice completa dei loro permessi o un invito privato dedicato.
- [Alchemy — Creating a Game](https://help.alchemyrpg.com/en/articles/9820808-creating-a-game),
  04/09/2024. L'impostazione Spectators governa la presenza in Live Games: controevidenza
  a una replica indistinta nel nostro caso privato. Non si propone discovery pubblica,
  streaming o riattivazione delle chiamate interne escluse I-102.

**Raccomandazione e adattamento:** ammettere facoltativamente un ospite invitato che segue
contenuti condivisi senza controllare il gioco. Aiuta chi vuole capire come si gioca o
assistere prima di partecipare; evita di creare un personaggio fittizio o dipendere dalla
condivisione dello schermo di un giocatore. Alternativa esterna valida: Discord. Il profilo
privato combina osservazione e permessi verificati, non è una funzione identica provata
in entrambi i riferimenti. Comporta verifica dedicata di ciò che può vedere e fare l'ospite.

**Confini:** nessuna vista DM, concessione automatica di tutte le schede, unione delle
visioni dei personaggi, chat/dadi o accesso storico dedotti. La domanda non approva
registrazioni, pubblicazione della partita, accesso anonimo o nuovi poteri d'invito.
F-016 resta distinta: schermo condiviso in presenza non equivale a una persona invitata.

**Esito:** Q116 confermata il 18/09/2026, I-135/F-006; nessuna pagina approvata.

## R113 — riusare insieme i materiali di un’avventura

Consultato il 18/09/2026 per Q117, A8/A9/F-038. Documentazione primaria; nessuna prova
runtime, avventura creata, importazione o modifica di contenuti reali.

- **Foundry, [Adventure Documents](https://foundryvtt.com/article/adventure/):** intestazione
  20/10/2025, versione 13.350, ma testo aggiornato anche con riferimenti V14: non attribuire
  tutto alla stessa versione. Raccoglie documenti diversi, conserva collegamenti e cartelle;
  il DM seleziona contenuti, costruisce l’avventura e la importa. Reimportare può sovrascrivere
  contenuti. I media restano riferimenti da predisporre separatamente. Il documento conserva
  lo stato preparato, non promette di annullare automaticamente ciò che è già stato giocato.
- **Foundry, [Compendium Packs](https://foundryvtt.com/article/compendium/):** una volta
  importato, il materiale diventa locale al mondo; le modifiche non riscrivono il compendio
  senza un’esportazione esplicita. Precedente per conservare originali riusabili e separare
  il modello dalla partita. Import singolo e import completo hanno comportamenti diversi
  sugli identificativi e sulle sovrascritture: nessun riuso universale senza conflitti dimostrato.
- **Foundry, [Content Packaging Guide](https://foundryvtt.com/article/packaging-guide/):**
  descrive moduli con compendi utilizzabili in più mondi e il Module Maker introdotto in V11;
  contiene anche istruzioni storiche V10. Sostiene il riuso fra mondi, non impone al nostro
  utente passaggi tecnici, moduli o manipolazione di file. Allegati richiedono preparazione.

**Proposta nostra:** un’avventura preparata riutilizzabile facoltativa, distinta sia da un
singolo incontro I-095 sia dalla biblioteca homebrew I-065. Un secondo gruppo parte dal
materiale iniziale conservato e mantiene progressi propri. Il beneficio è recuperare anche
l’organizzazione del lavoro; il costo è gestire collegamenti, dipendenze, stato iniziale e
aggiornamenti. I-113 richiede verificarne l’integrazione, non assumere fattibilità dimostrata.

**Confini:** modello preparato e stato di gioco vanno distinti esplicitamente; ricostruire
un modello dopo una partita non implica reset intelligente. Selezione, revisioni, conflitti,
permessi e contenuti privati, allegati, annullamento e rete restano aperti. Nessun marketplace,
importatore universale, sincronizzazione fra gruppi o garanzia di backup completo.

**Esito:** Q117 risolta per delega circoscritta il 18/09/2026, I-136/F-038; adottata l’opzione 1, dettagli aperti e nessuna pagina approvata.

## R114 — mappe con verticalità in 2D oppure anche ambienti 3D

Consultato il 18/09/2026 per Q118, A4/A6/A8/A12/F-005/F-013. Fonti primarie pubbliche;
nessun runtime, benchmark, immagine o mock. La scelta 2D/3D era esplicitamente aperta in
F-005/F-013: il riferimento a BG3 non l'aveva già risolta.

- **Foundry, [Year in Review: Sixth Anniversary Edition](https://foundryvtt.com/article/year-in-review-2026/):**
  bilancio del maggio 2026, sezione V14. Scene Levels raccoglie mappe sovrapposte con quote
  in una scena 2D e permette transizioni fra piani. Precedente concreto per la prima
  alternativa: verticalità senza un ambiente tridimensionale navigabile. Non prova che
  ogni regola D&D di volo, distanza o copertura sia automatizzata correttamente.
- **Owlbear, [Scenes](https://docs.owlbear.rodeo/docs/scenes/):** documentazione senza
  data/versione puntuale. Scena con immagini, pedine e disegni; esempio di piani di un
  edificio collocati affiancati. Percorso: importare una mappa o creare una scena vuota,
  aggiungere immagini e posizionarle. Precedente per la preparazione semplice con mappe,
  non per calcoli automatici fra quote o equivalenza con Scene Levels di Foundry.
- **TheRipper93, [3D Canvas nel catalogo Foundry](https://foundryvtt.com/packages/levels-3d-preview):**
  versione 9.0.34 per Foundry 14, verificata 14, aggiornamento relativo circa due giorni.
  Modulo aggiuntivo: scene 3D, modelli, illuminazione e figure ricavate da token 2D.
  Documenta la possibilità della seconda alternativa, senza provare qualità BG3 o prestazioni
  del nostro prodotto. Non è una capacità core di Foundry né un modulo scelto da installare.
- **Autore, [3D Canvas Wiki](https://wiki.theripper93.com/levels-3d-preview):** intestazione
  V14, nessuna data puntuale. Controlli per rotazione, spostamento e zoom della camera;
  costruzione di pareti/pavimenti/soffitti tramite elementi 3D, impostazioni grafiche con
  impatto sulle prestazioni e requisiti dipendenti dal contenuto. I controlli sono documentati,
  non provati qui. Le dichiarazioni di compatibilità non sono verifiche della nostra combinazione.

**Raccomandazione dell'agente, ancora proposta:** 2D con piani e quote come perimetro
attuale, usando immagini e schemi già ammessi. Affronta la verticalità senza aggiungere
anche creazione e navigazione di ambienti 3D. Il 3D può offrire una lettura spaziale più
immediata per alcuni casi, ma richiede un insieme aggiuntivo di materiali e interazioni:
questa valutazione di integrazione è nostra, non un consenso fra tutti i prodotti.
Nessuna impossibilità del 3D o superiorità universale del 2D dichiarata. I-058/I-101/I-113
motivano la raccomandazione, non autorizzano un taglio automatico delle aspirazioni dell'owner.

**Confini:** scelta funzionale di portata, non estetica. Altezze, piani, volo, distanze,
visibilità, copertura e transizioni richiederanno regole/fonti specifiche. Dadi F-002 distinti;
nessuna conversione automatica immagini→3D, animazione obbligatoria, compatibilità universale,
prestazione garantita, integrazione con moduli o rinuncia permanente dedotte. Telefono e
laptop restano requisiti con le riserve già registrate. Scelte visuali dopo il gate D-012.

**Esito:** Q118 confermata il 18/09/2026, I-137/F-005/F-013: 2D con quote/piani, ambienti 3D esclusi per complessità non giustificata dall’owner. Nessuna pagina approvata.

## R115 — luoghi consultabili da una mappa del mondo

Consultato il 18/09/2026 per Q119, A6/A8/A9/F-039. Conservati archivio I-099/R077,
viaggi I-107/R085 e perimetro 2D I-137/R114. Documentazione primaria, nessuna prova
runtime, contenuto creato o immagine scaricata.

- **Kanka, [Map Markers](https://docs.kanka.io/en/latest/entries/maps/markers.html):**
  documentazione latest con etichetta 1.0.0, non una versione del servizio verificata;
  data puntuale non indicata. Map Explorer permette di collocare un punto, collegarlo
  a una voce e controllarne la visibilità. Selezionarlo mostra descrizione e anteprima
  della voce collegata. È il precedente diretto per posizione e informazioni consultabili
  insieme; la documentazione distingue il percorso di creazione dall'antica scheda Markers.
- **Kanka, [Maps](https://docs.kanka.io/en/latest/entries/maps.html):** distingue Map
  Explorer come mappa del mondo dalla battaglia con movimento in tempo reale. Sostiene
  il confine della domanda; nessuna nuova automazione di viaggio attribuita a questo strumento.
- **LegendKeeper, [Make detailed Maps](https://www.legendkeeper.com/features-maps/):**
  pagina delle capacità pubblicate, senza versione/data puntuale. Caricamento di immagini,
  punti per i luoghi, mappe collegate alle pagine del mondo e condivisione. Riscontro
  più ampio; non prova da solo la stessa matrice di permessi o ogni passaggio di Kanka.
  Limiti di immagini, piani commerciali e dichiarazioni offline non adottati implicitamente.

**Proposta:** una mappa 2D facoltativa del mondo/regione collegata all'archivio già
concordato. Il beneficio è orientarsi e ritrovare informazioni nello stesso percorso;
richiede collegamenti e autorizzazioni coerenti, senza duplicare o esporre segreti.
Alternativa valida: immagini e archivio separati. Le immagini senza punti e gli appunti
restano utilizzabili; la funzione non obbliga a costruire un atlante prima di giocare.

**Adattamento e limiti:** i nostri permessi I-044–I-048 restano autorità. Un punto
visibile non implica automaticamente accesso all'intera voce e l'accesso a una voce
non risolve da solo la visibilità del punto: rapporto da definire nei percorsi.
Regole di creazione, rivelazione, collegamenti, filtri, salvataggio, annullamento,
errori e rete restano aperte. Nessuna mappa del mondo inclusa, generazione automatica,
tracciamento degli spostamenti, itinerario automatico o pubblicazione dedotti.
Nessun test della fattibilità della combinazione, I-113.

**Esito:** Q119 accettata con riserva di fattibilità il 18/09/2026, I-138/F-039; direzione acquisita, dettagli e integrazione da verificare. Nessuna pagina approvata.

## R116 — calendario della finzione e promemoria degli eventi

Consultato il 18/09/2026 per Q120, A6/A9/F-040. Conservati tempo condiviso I-087/R067,
viaggi I-107, basi I-112 e organizzazione delle sessioni I-094. Fonti primarie;
nessun runtime, calendario configurato, evento o automazione reale creati.

- **[Mini Calendar](https://foundryvtt.com/packages/wgtgm-mini-calendar), xthesaintx:**
  versione 10.1.2, Foundry 13+, verificata 14; aggiornamento relativo circa tre giorni.
  Descrive note associate ai giorni e messaggi riservati in chat al raggiungimento della
  data, oltre a controlli del tempo e calendari personalizzati. È il precedente diretto
  per ricordare eventi secondo il tempo della finzione. La pagina non verifica tutti
  i casi di salti temporali, destinatari o correzioni.
- **[Calendaria](https://foundryvtt.com/packages/calendaria), Tyler:** versione 1.4.2,
  Foundry 14+, verificata 14.367; aggiornamento relativo circa un giorno. Descrive note
  datate, promemoria e calendari propri. Il percorso documentato passa dalla selezione
  di un giorno alla nota. Il prodotto contiene molte funzioni ulteriori che non diventano
  requisiti della nostra domanda.
- **Autore, [Reminders](https://wiki.3deathsaves.com/calendaria/reminders/):** dalla nota
  si impostano tipo di avviso, destinatari e anticipo; zero corrisponde all'evento, None
  disattiva il promemoria. Documenta chat, avviso breve e dialogo. La home della wiki
  indica aggiornamento 1.4.1, settembre 2026, mentre il catalogo è a 1.4.2: non dedurre
  identità di tutte le revisioni. Non trasferire i default dei permessi al nostro prodotto,
  soprattutto eventuali accessi del GM alle note personali riservate.
- **[Calendar, wiki del sistema DnD5e per Foundry](https://github.com/foundryvtt/dnd5e/wiki/Calendar):**
  consultazione corrente senza revisione immutabile fissata. Documenta impostazione della
  data e avanzamento/arretramento del tempo, oltre a integrazioni specifiche con bastioni.
  Riferimento adiacente per il tempo comune; non prova da solo i promemoria narrativi
  generici. Nessun aggiornamento automatico dei bastioni adottato da questa domanda.

**Raccomandazione:** calendario della finzione facoltativo con eventi datati e promemoria.
Riduce il carico di ricordare appuntamenti e scadenze mentre avanzano viaggi e riposi.
Richiede integrazione con tempo condiviso, permessi e correzioni; l'esistenza nei moduli
non dimostra fattibilità o semplicità della nostra combinazione I-113. Restano appunti
liberi e uso del tempo senza calendario dettagliato.

**Confini:** destinatari, calendario iniziale/custom, ricorrenze, avvisi anticipati,
attraversamento di più eventi in un salto, ritorni indietro e assenti da definire.
Promemoria distinto da esecuzione dell'evento, fallimento automatico di missione o pausa
globale. Nessun tempo reale, notifica esterna, meteo, astronomia o scena cinematica
approvati. Le date delle sessioni reali F-011 restano una funzione distinta.

**Esito:** Q120 confermata il 18/09/2026, I-139/F-040; dettagli aperti, nessuna pagina approvata.

## R117 — seguire ricerche e altri progetti personali duraturi

Consultato il 18/09/2026 per Q121, A2/A6/A9/F-041. Restano acquisiti fabbricazione
I-105/F-020 e basi I-112/F-025; la domanda estende la copertura ad altri lavori personali.
Fonti primarie pubbliche; nessun runtime, acquisto, installazione o attività creata.

- **[Downtime Dnd5e](https://foundryvtt.com/packages/downtime-dnd5e), Naito:** versione
  13.0.9, Foundry 13–14, verificata 14; aggiornamento relativo circa tre mesi. Documenta
  una sezione delle schede per creare attività e seguirne il progresso numerico, anche
  duraturo. Esempi di addestramento e tracciamento generico, non prove di regole ufficiali 2024. Nessuna conclusione sulla compatibilità con tutti i fogli personaggio o moduli.
- **[Universal Downtime Engine](https://foundryvtt.com/packages/thefehrs-learning-manager),
  TheFehr:** versione 5.1.0, Foundry 13+, verificata 14; aggiornamento relativo circa tre
  mesi. Il progetto viene configurato con obiettivo e requisiti; il giocatore usa un'attività
  dalla scheda per dedicargli tempo. Descrive costi, avanzamento e correzioni manuali del GM.
  Molte automazioni ulteriori sono specifiche del modulo: non adottare consumo automatico
  del tempo, assegnazione di capacità o risoluzione statistica come nostre regole.
- **[Mad Nomad's Downtime Tracker](https://forge.fantasygrounds.com/shop/items/663/view):**
  pagina dell'autore sullo store Fantasy Grounds Forge; versione e data puntuale non indicate.
  Documenta obiettivi/attività collegati ai personaggi, progresso e note; include ricerche
  fra gli esempi. Capacità pubblicata, non percorso provato. Accesso pubblico senza login;
  contenuto acquistabile non aperto o testato. Nessun modello commerciale adottato.

**Raccomandazione:** progetti personali facoltativi con obiettivo, tempo dedicato, eventuali
costi, progresso e note; utili per riprendere ricerche o addestramenti dopo un'interruzione.
Raccordare queste informazioni alla scheda e al tempo condiviso è un obiettivo nostro,
non una combinazione già verificata. Appunti liberi sempre disponibili, I-058; integrazione I-113.

**Confini:** il passare dei giorni non significa che il personaggio abbia lavorato per
quei giorni. Regole, tempi e benefici richiedono fonti 2024 o provenienza privata/homebrew;
nessun diritto generico ad apprendere talenti, competenze o lingue deriva dai riferimenti.
Progetti simultanei, collaboratori, tiri, disponibilità di risorse, autorità sul risultato,
permessi, correzioni e rete restano da definire. Dadi fisici/digitali I-032, breakdown I-027
ed errori correggibili I-028 restano vincolanti. Non è una nuova conferma di craft o bastioni.

**Esito:** Q121 confermata il 18/09/2026, I-140/F-041; dettagli aperti, nessuna pagina approvata.

## R118 — seguire la reputazione presso PNG e fazioni

Consultato il 18/09/2026 per Q122, A13/A9/F-042. Fonti primarie pubbliche; capacità
pubblicate e documentazione, senza prova runtime, acquisto o installazione.

- **Bondsmith, catalogo Foundry, 3 Death Saves:**
  <https://foundryvtt.com/packages/bondsmith>. Versione corrente indicata 1.4.2, Foundry
  14+ verificata 14.367, aggiornata «1 day, 15 hours ago»; l'intestazione generale riporta
  13+ per il modulo, non per quella release. Documenta reputazioni individuali verso PNG
  e fazioni, fasce personalizzate, slider/input numerico, storia con motivi e controlli
  per nascondere entità o valori. Distingue cambiamenti decisi manualmente da decadimento
  ed eventi automatici. Supporta la funzione proposta, non prova utilità o facilità della
  nostra combinazione. Le ulteriori capacità pubblicizzate non vengono adottate in blocco.
- **Bondsmith, guida Reputation and Tiers:**
  <https://wiki.3deathsaves.com/bondsmith/reputation-and-tiers/>. Wiki dichiarata aggiornata
  a 1.4.1, settembre 2026, quindi non attestazione della release 1.4.2. Il percorso descritto
  distingue riepilogo da righe individuali: modalità modifica, cursore/campo e pulsanti
  meno/più. Ogni cambio produce una voce storica; notifiche dipendono dalle impostazioni.
  La fonte consente al giocatore di modificare la relazione del personaggio controllato:
  non attribuirle un divieto universale riservato al GM. Media del gruppo, fasce, tabelle,
  sincronizzazione con negozi e calendario sono capacità ulteriori, non scelte nostre.
  La direzione precisa della relazione va chiarita nei percorsi; nessuna equivalenza
  automatica fra reputazione, amicizia soggettiva e condizione meccanica di D&D.
- **Bondsmith, Visibility and Player Knowledge:**
  <https://wiki.3deathsaves.com/bondsmith/visibility-and-players/>. La riapertura ha restituito
  la wiki aggiornata a 1.4.1, settembre 2026, mentre la prima risposta indicava una copia
  precedente. Verificato l'accesso del GM dall'icona occhio o dal menu Visibility, con
  comandi per mostrare/nascondere l'entità; il catalogo e la guida sui punteggi documentano
  anche la distinzione fra nome della fascia e numero. Nessuna prova della protezione
  effettiva dei dati; nessuna estensione ai nostri appunti Solo io.
- **Kanka, relazioni e accesso:**
  <https://docs.kanka.io/en/latest/features/connections.html> e
  <https://app.kanka.io/api-docs/1.0/entities/connections>. Il primo conserva il precedente
  R077 dei legami nell'archivio; il secondo espone descrizione, atteggiamento numerico e
  visibilità, confermando che si può rappresentare un legame oltre al semplice riferimento.
  API 1.0 e documentazione 1.0 non sono la versione del servizio; nessuna data di pubblicazione
  affidabile o prova UI. Non dedurre dal contratto API il percorso dei controlli nell'app.

**Raccomandazione e adattamento:** la reputazione facoltativa aiuta a ritrovare conseguenze
sociali durante campagne lunghe. Il DM conserva la conduzione narrativa; appunti liberi
rimangono sufficienti per chi non vuole mantenerla. Alternativa concreta: usare solo le
note e i collegamenti già concordati. Il supporto richiede raccordare archivio, personaggi,
storia e permessi senza duplicazioni: I-113 aperta, nessuna garanzia di semplicità già provata.
Non si propone di copiare decadimento, automazioni, grafi o formule dei riferimenti.

**Esito:** Q122 confermata il 18/09/2026, I-141/F-042; fedeltà ai riferimenti Foundry e aspettativa di riuscita ribadite I-005/I-049/I-113. Dettagli aperti, nessuna pagina approvata.

## R119 — creare e riutilizzare tabelle casuali oltre ai tesori

Consultato il 18/09/2026 per Q123, A8/A6/A9/F-043. Riprende R082, già usata per
I-103/F-018, e verifica la creazione di tabelle generali. Fonti primarie pubbliche,
nessuna prova nell'app o installazione; nessuna tabella commerciale importata.

- **Foundry, Rollable Tables:** <https://foundryvtt.com/article/roll-tables/>.
  Nessuna data o versione esplicita accertata nella pagina; capacità del prodotto base.
  Documenta liste estraibili per incontri, tesori e altri esiti; creazione dalla sezione
  Rollable Tables tramite Create Table, aggiunta e compilazione delle righe. Separa
  consultazione e modifica. Draw Result estrae, Draw This Result sceglie una voce;
  i risultati possono contenere testo e riferimenti. Sono previsti probabilità diverse,
  riuso nei compendi, ripetizioni controllabili e sotto-tabelle.
  La descrizione dei permessi Observer è internamente incoerente con il paragrafo
  successivo sull'estrazione senza reinserimento: non adottarla come matrice certa dei
  permessi. Nessun supporto all'input fisico provato da questa guida.
- **Roll20, Collections:**
  <https://help.roll20.net/hc/en-us/articles/360039178754-Collections>.
  Data e versione del servizio non accertate; guida pubblica consultata nella sezione
  Rollable Tables. Descrive Add, nome della tabella, Add Item, testo degli esiti e pesi;
  Roll estrae un risultato. L'accesso dei giocatori è configurabile. Le sezioni citano
  sia Collection sia Decks & Tables: il percorso attuale va verificato prima di una
  replica dell'interfaccia. Conferma editor e uso generale; non prova input fisico,
  riuso universale fra campagne o equivalenza completa con Foundry.

**Proposta e motivazione:** supporto facoltativo per preparare e riutilizzare incontri,
voci di taverna e altri spunti. Si estende l'uso oltre ai tesori già confermati, senza
riaprire I-103. Il tavolo sceglie quando estrarre e come usare il risultato; dadi fisici,
digitali e breakdown rispettano I-027/I-032. L'alternativa mantiene questi altri spunti
negli appunti e conserva i tesori. L'integrazione con preparazione, dadi, archivio e
permessi resta da verificare I-113. Tabelle annidate, automazioni e cataloghi precisi
restano aperti; la presenza nei due prodotti non approva tutti i loro dettagli.

**Esito:** Q123 risolta il 18/09/2026 per delega circoscritta, I-142/F-043; opzione 1 adottata dall’agente, dettagli aperti e nessuna pagina approvata.

## R120 — salvare e richiamare liste di incantesimi preparati

Consultato il 18/09/2026 per Q124, A5/A2/A3/F-044. Fonti primarie dell'autore, capacità
pubblicate e percorsi documentati; nessuna prova runtime, installazione o acquisto.

- **Spell Book, catalogo Foundry:** <https://foundryvtt.com/packages/spell-book>.
  Autore Tyler/Sayshal; modulo aggiuntivo, non funzione attribuita al prodotto base.
  Release indicata 2.5.1, Foundry 14+ verificata 14.367; l'intestazione generale 12+
  riguarda lo storico del modulo. La data relativa varia fra indice e apertura e non
  viene convertita in data di rilascio certa. Documenta insiemi nominati per classe,
  salvataggio delle selezioni e richiamo; espone anche impostazioni distinte per il
  momento di cambio. Il supporto dichiarato 2014/2024 non prova correttezza di ogni regola.
- **Spell Loadouts, wiki dell'autore:**
  <https://wiki.3deathsaves.com/spell-book/spell-loadouts/>.
  Wiki aggiornata a 2.4.0, settembre 2026, diversa dalla release elencata nel catalogo.
  Loadouts apre le liste della classe corrente; Save Current Configuration conserva
  le caselle selezionate con un nome, comprese modifiche ancora non salvate. Apply applica
  e salva subito sul personaggio; Overwrite aggiorna la lista, Delete chiede conferma.
  Documenta anche il richiamo rapido tramite menu contestuale e l'elenco degli incantesimi.
  Limiti osservabili nel testo: applicare scarta le modifiche pendenti, esclude gli
  incantesimi non presenti nella lista e salta quelli non più trovati; non invia la
  notifica GM prevista da altri cambi. Questi comportamenti non sono adottati per deduzione.

**Raccomandazione:** liste facoltative nominate aiutano chi ripete combinazioni per
esplorazione o combattimento; la scelta singola rimane sufficiente. Non promettere
strategie ottimali o risparmio misurato. Il costo è raccordare le liste alla disponibilità
attuale e alle regole del personaggio senza perdere scelte; I-113 rimane aperta.
La proposta distingue il salvataggio del piano dall'applicazione effettiva. Momenti di
preparazione, classi, limite, incantesimi sempre preparati e deroghe saranno verificati
nelle fonti ufficiali e nelle regole private pertinenti prima di specificarli.
Non adottare per analogia la libertà di cambio di BG3 o tutte le opzioni dell'estensione.

**Esito:** Q124 confermata il 18/09/2026, I-143/F-044; dettagli aperti, nessuna pagina approvata.

## R121 — confronto facoltativo fra incantesimi

Consultato il 18/09/2026 per Q125, A5/A2/A3/A10/F-045. Estende la ricerca R120
sullo stesso modulo alla funzione di confronto. Fonti primarie, nessuna prova runtime.

- **Spell Book, catalogo Foundry:** <https://foundryvtt.com/packages/spell-book>.
  Autore Tyler/Sayshal, release indicata 2.5.1 per Foundry 14+, verificata 14.367;
  intestazione 12+ riferita allo storico. La data relativa non è una data di rilascio
  certa. La sezione Spell Comparison documenta confronto fra più magie con livello,
  scuola, tempo, portata, durata, componenti e danni. Evidenzia la formula con più dadi:
  questo criterio non viene adottato come giudizio di utilità o danno atteso.
- **Spell Book Interface Overview, guida dell'autore:**
  <https://wiki.3deathsaves.com/spell-book/spellbook-interface-overview/>.
  Versione/data specifiche della pagina non accertate; il recupero indica una copia
  indicizzata due mesi prima, non la data di pubblicazione. La sezione Comparison
  descrive il controllo su ogni magia per aggiungerla/toglierla dall'insieme. Con almeno
  due magie si apre il confronto, che si chiude sotto due; il modulo non impone un
  massimo e affianca i dati. Questi dettagli documentano un percorso, non approvano
  limite, gesto, layout o apertura automatica per il nostro prodotto.

**Proposta e motivazione:** confronto facoltativo per valutare magie prima di prepararle
o usarle. Dati raccolti insieme riducono la necessità di ricordarli passando fra schede;
la lettura singola rimane. La nostra applicazione ai diversi punti del prodotto è da
specificare, non è provata da questa sola guida. Non è un simulatore di danno atteso
né un consigliere automatico: descrizioni, effetti e contesto possono contare più dei
dadi. I-113 richiede integrazione con biblioteca, scheda, liste, varianti e permessi.
Non sono stati verificati gli stessi controlli in BG3 o Beyond; nessuna equivalenza dichiarata.

**Esito:** Q125 confermata il 18/09/2026, I-144/F-045; dettagli aperti, nessuna pagina approvata.

## R122 — coordinare le magie condivise dal gruppo

Consultato il 18/09/2026 per Q126, A5/A1/A3/F-046. Prosegue R120/R121 sulla capacità
di coordinamento del modulo. Fonti primarie pubbliche; nessuna prova runtime o installazione.

- **Spell Book, catalogo Foundry:** <https://foundryvtt.com/packages/spell-book>.
  Autore Tyler/Sayshal, modulo 2.5.1 per Foundry 14+, verificato 14.367; 12+ nell'intestazione
  si riferisce allo storico. La sezione Party Coordination descrive il riepilogo delle
  magie preparate dagli incantatori, l'indicazione dei personaggi e filtri per membro.
  Documenta anche analisi di sinergia: è capacità aggiuntiva, non oggetto della proposta.
- **Party Spells Interface Overview, wiki dell'autore:**
  <https://wiki.3deathsaves.com/spell-book/partyspells-interface-overview/>.
  Wiki dichiarata aggiornata a 2.4.0, settembre 2026, distinta dal catalogo 2.5.1.
  Accessi dal gruppo o da Party Spells nel libro. Party Mode indica i compagni che
  hanno preparato una magia; il riepilogo distingue conosciuti e preparati e si aggiorna
  quando cambiano gli incantesimi. Cambiare membri richiede riaprire la finestra.
  Mostra i dettagli solo con permesso Observer sul personaggio; gli altri membri
  mantengono una scheda riassuntiva senza dettagli magici. Aprire la scheda richiede
  Limited. L'analisi di sinergia è separata; non importarne giudizi sui doppioni.
  Composizione del gruppo, nome dei permessi e loro reale applicazione non testati.

**Raccomandazione e adattamento:** riepilogo facoltativo delle magie condivise per
coordinarsi mantenendo le scelte individuali. Consultazione permessa non implica controllo
e non autorizza ad aprire contenuti privati. Il percorso di condivisione e la granularità
restano da concordare; il riferimento prova la possibilità di filtrare per permesso,
non una nostra politica già definita. Accordi a voce e note rimangono sufficienti.
L'utilità è evitare di ricostruire ripetutamente chi ha preparato cosa; il costo riguarda
aggiornamento, permessi e chiarezza del riepilogo, I-113. Distinguere preparazione da
lanciabilità attuale; niente risorse, consiglio tattico o cambiamenti automatici dedotti.

**Esito:** Q126 confermata il 18/09/2026, I-145/F-046; dettagli aperti, nessuna pagina approvata.

## R123 — meteo scelto o generato durante il viaggio

Verifica documentale del 18/09/2026 per Q127, A6/A8/A9/F-047. Fonti primarie di autori
ed ecosistema Foundry; nessuna installazione o osservazione runtime. R116 già conserva
Calendaria per il calendario; qui si verifica la scelta specifica sul meteo.

- [Simple Weather](https://foundryvtt.com/packages/simple-weather), autore phloro:
  catalogo 2.2.2, Foundry 13+, verificata 13.351; intestazione generale 10+.
  Generazione secondo stagione e ambiente, anche senza calendario. Per scelta manuale:
  aprire gli strumenti manuali, selezionare condizione e temperatura, inviare; sospendere
  gli aggiornamenti conserva la scelta. Condivisione in chat o dialogo configurabile;
  registrazione facoltativa sul calendario. Non dedurre automazione meccanica dai testi
  aggiuntivi sulle condizioni. La pagina segnala dipendenze dai calendari e conflitti con
  cambiamenti manuali della scena; descrizioni discordanti dell'effetto manuale sulle
  previsioni. Nessuna compatibilità Foundry 14 verificata da questa scheda.
- [Calendaria — Weather Picker](https://wiki.3deathsaves.com/calendaria/weather-picker/):
  wiki dichiarata 1.4.1, settembre 2026; catalogo 1.4.2 già verificato R116. Accesso
  dall'indicatore meteo, con permesso appropriato; scelta di preset e modifica di campi.
  Salvataggio applica la configurazione; Randomize genera secondo zona climatica.
  Attenzione: Randomize e Clear applicano subito; chiudere scarta i campi ancora in
  modifica. Il documento segnala che un nome custom vuoto può chiudere senza applicare
  né avvisare. Questi comportamenti non sono adottati automaticamente nella proposta.

**Corrispondenza:** esiste un percorso documentato per scegliere o generare condizioni
con controllo umano. Consiglio lo strumento facoltativo per preparazione e continuità
del viaggio; l'alternativa è affidarsi a narrazione e appunti già disponibili.

**Adattamento e limiti:** dadi fisici e digitali I-032, permessi e correzioni restano
vincoli nostri. Generare meteo non decide da solo effetti D&D: regole e conseguenze da
specificare. Non si propone qui simulazione completa, previsione, audiovisivo o avanzamento
automatico. Nessuna stima di semplicità o fattibilità dimostrata dalla presenza dei moduli;
integrazione I-113 ancora aperta. Contenuti e tabelle riutilizzabili da verificare.

**Esito:** Q127 risolta per delega il 18/09/2026, I-146/F-047; dettagli aperti, nessuna pagina approvata.

## R124 — risolvere gli attacchi di più creature con meno comandi

Verifica documentale del 18/09/2026 per Q128, A4/A8/F-048. Fonti primarie; nessuna
installazione o prova runtime. Non riguarda la richiesta di prove ai giocatori già
concordata I-130, né la risoluzione di un'area con più bersagli.

- [Catalogo Mob Attack Tool](https://foundryvtt.com/packages/mob-attack-tool): estensione
  Foundry mantenuta da Dafto, versione 0.18.0, Foundry 12+, verificata 14; intestazione
  generale 0.7.6–14. Documenta un comando dalla barra dei token dopo la selezione delle
  creature e dei bersagli, elenco delle armi da scegliere, invio con Mob Attack e
  risultato in chat. Non attribuire questa capacità al solo prodotto Foundry base.
- [README del manutentore](https://github.com/daft-develop/mob-attack-tool): consultato
  sul ramo main, senza SHA della documentazione verificato. Individual Attack Rolls
  distingue i tiri dalla modalità con tabella; danni individuali configurabili.
  Visibilità GM predefinita modificabile. Il dialogo segue selezione e bersagli.
  Limiti dichiarati: effetti secondari non risolti, danni raggruppati che possono
  alterare le CD di concentrazione, possibili controlli mancati durante attese o
  integrazioni; compatibilità con iniziativa raggruppata non testata recentemente.
  Esempi animati dichiarati obsoleti: non usati come prova attuale.

**Raccomandazione:** aiuto facoltativo al DM per avviare più attacchi con meno comandi,
conservando esiti distinti e il percorso individuale. Beneficio concreto: evitare
aperture e selezioni ripetitive con molti nemici. L'alternativa mantiene l'avvio separato.

**Adattamento e limiti:** dadi fisici I-032, breakdown I-027, correzioni I-028/I-029,
ordine e reazioni I-022 sono requisiti nostri. Il precedente non dimostra una sequenza
corretta in tutti i casi: gestione di interruzioni, concentrazione e bersagli cambiati
è dipendenza sostanziale I-113. Nessuna scelta automatica delle armi, tabella sostitutiva,
regola d'iniziativa, danno unico o estensione ai giocatori adottate per deduzione.

**Esito:** Q128 confermata il 18/09/2026, I-147/F-048; dettagli aperti, nessuna pagina approvata.

## R125 — ricordare al DM le azioni leggendarie disponibili

Verifica documentale del 18/09/2026 per Q129, A4/A8/F-049. Fonti primarie; nessuna
installazione, prova runtime o esecuzione di regole nell'app.

- [Dorman Lakely's Legendary Actions](https://foundryvtt.com/packages/dormanlakely-legendary-actions):
  estensione Foundry 2.1.1, requisito dichiarato Foundry 13+ e sistema D&D 5e 4.0+,
  verificata per Foundry 13. Dopo un turno mostra al GM le altre creature con azioni
  leggendarie residue, azioni e utilizzi; il clic usa la capacità e aggiorna il contatore.
  Il promemoria è disattivabile nelle impostazioni. Il sistema gestisce il recupero
  all'inizio del turno della creatura. Nessuna prova di compatibilità Foundry 14 ricavata
  da questa scheda; non confondere la versione del modulo con quella del sistema collegato.
- [5e Legendary Assistant](https://forge.fantasygrounds.com/shop/items/590/view), Stv:
  estensione Fantasy Grounds; versione e data di rilascio non esposte nella descrizione
  consultata. Comando nella barra laterale per consultare creature e risorse; accesso
  anche dal tracker, campi e caselle per tracciare gli utilizzi. Avvisi ed evidenziazione
  facoltativi configurabili. Contempla anche resistenze e tana, non adottate da Q129.
  Il limite numerico a sei e il riconoscimento della tana dal nome non sono requisiti nostri.
- **Regola verificata:** [SRD 5.2.1 EN, p. 257](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=257)
  e [IT, p. 293](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf#page=293),
  kind `srd`, edizione 2024, revisione 5.2.1; corpus e hash già fissati in
  [rules.md](../../evidence/experience-01/rules.md). Un'azione leggendaria avviene subito
  dopo il turno di un'altra creatura, una alla volta; non è consentita se incapacitata
  o impossibilitata ad agire. Utilizzi definiti dalla scheda, spesa quando si agisce e
  recupero all'inizio del proprio turno. La sezione è distinta dalle reazioni.
  Esempio: alla fine del turno del personaggio, il DM sceglie una capacità disponibile;
  consultarla senza usarla non ne consuma l'utilizzo. Abilità precedenti e homebrew
  mantengono fonte e revisione proprie; non generalizzare il costo 2024 ad altre versioni.

**Corrispondenza e raccomandazione:** promemoria facoltativo al DM con scelta umana
dell'azione; alternativa con sola consultazione manuale. Il bisogno è ricordare una
capacità fuori dal normale turno del mostro. Il costo riguarda avvisi ripetitivi,
più creature, conduzione condivisa e corretta sequenza degli eventi, I-113.

**Limiti:** i riferimenti non concordano da soli il nostro default, la presentazione,
la pausa del tavolo o le priorità. Non dedurre comportamento universale dal filtro
su PF del modulo. Contatori, automazione e correzioni conservano i principi acquisiti;
la nuova scelta riguarda gli avvisi proattivi. Nessuna IA tattica o nuova regola proposta.

**Esito:** Q129 confermata il 19/09/2026, I-148/F-049; dettagli aperti, nessuna pagina approvata.

## R126 — rendere leggibile la salute dei nemici secondo la scelta del DM

Verifica documentale del 19/09/2026 per Q130, A4/A8/F-050. Fonti primarie; nessuna
installazione, prova runtime o verifica grafica. Solo definizione funzionale in Markdown.

- [Health Estimate](https://foundryvtt.com/packages/healthEstimate), Matheus Clemente:
  estensione Foundry 35.2.0, Foundry 14+, verificata 14; intestazione generale 9–14.
  Stima della salute al passaggio sul token, configurazione di quando mostrarla e
  indicazioni diverse per tipi di creatura. Il catalogo segnala dipendenza dall'attributo
  PF del sistema e non applica da solo la condizione di sconfitto.
- [FAQ del manutentore](https://github.com/mclemente/healthEstimate/wiki/FAQ), aggiornamento
  dichiarato 25/05/2023: Configure Controls → Health Estimate → Hide Estimates permette
  di nascondere la stima dei token selezionati e ripristinarla con lo stesso comando.
  [Estimation Settings](https://github.com/mclemente/healthEstimate/wiki/Estimation-Settings),
  aggiornamento 31/12/2023: regole di stima personalizzabili per tipi ed effetti, fasce
  ordinate al salvataggio. Percorsi documentali storici, non verificati nella versione attuale.
  Non adottare un obbligo di scrivere espressioni tecniche per il normale uso del DM.
- [Roll20 — Token Features](https://help.roll20.net/hc/en-us/articles/360039674573-Token-Features),
  aggiornamento esposto 04/09/2026: impostazioni del token riservate al GM, barre con
  valori correnti/massimi e permessi di visibilità/modifica distinti. Stile Standard
  con testo e Compact senza; impostazione per consultazione al passaggio del mouse.
  Collegamento all'attributo può aggiornare più copie: non assumere PF condivisi fra
  mostri uguali. Posizione, stile e comandi non adottati automaticamente.

**Corrispondenza e raccomandazione:** indicatore facoltativo per sapere quanto appare
ferito un nemico; DM libero di scegliere descrizione, barra, PF numerici o nulla.
Si combinano la stima del modulo e la visibilità configurabile di Roll20. Non attribuire
l'intera combinazione a uno dei due prodotti. Alternativa: descrizione a voce e PF del DM.
Il beneficio è ridurre richieste ripetitive; il costo riguarda aggiornamento e riservatezza,
visione individuale e creature con caratteristiche particolari, I-113.

**Limiti:** “ferito” e “gravemente ferito” sono esempi di etichette, non soglie o condizioni
normative fissate. Nessuna completezza della scheda, probabilità d'attacco o informazione
sulle resistenze dedotte. Default, policy per destinatari, eccezioni, vita apparente/reale,
perdita di visibilità e percorsi senza mouse restano da concordare. Nessun layout approvato.

**Esito:** Q130 confermata il 19/09/2026, I-149/F-050; dettagli aperti, nessuna pagina approvata.

## R127 — indicare un punto della mappa mentre si parla

Verifica documentale del 19/09/2026 per Q131, A4/A6/A8/F-051. Fonti primarie; nessuna
prova runtime, installazione o immagine prodotta. Caso reale: tavolo remoto su Discord
con laptop individuali, I-101. Il riferimento Shard già conservato per il touch viene
riutilizzato per la scelta specifica sui segnali.

- [Foundry — Pings](https://foundryvtt.com/article/pings/): guida aggiornata 27/10/2025,
  versione 13.350. Pressione prolungata sul canvas genera un segnale; gli utenti della
  scena lo vedono, con indicazione di direzione se fuori inquadratura. Variante Warning
  e variante Drag per ricentrare le viste, quest'ultima riservata a GM/assistenti.
  La proposta riguarda il segnale ordinario; il ricentramento rimane da discutere.
- [Roll20 — Tabletop Overview](https://help.roll20.net/hc/en-us/articles/360039734913-Tabletop-Overview),
  data esposta 15/04/2026: pressione prolungata genera un ping. Pointer si attiva tenendo
  premuto B e si spegne al rilascio; mostra autore e colore, utilizzabile da GM e giocatori.
  Si nasconde anche dopo inattività. Shift+Ping del GM ricentra le viste: comportamento
  distinto, non approvato per deduzione. Scorciatoie e resa grafica sono riferimenti, non
  decisioni sull'interfaccia. Non trasferire la visibilità indiscriminata ai nostri segreti.
- [Shard — Ping and Measure](https://www.shardtabletop.com/blog/ping-and-measure), Hal Howard:
  data visibile “Sep 11”, anno/versione non fissati nella pagina. Pressione prolungata
  crea un segnale sulle viste altrui; descrive anche un trascinamento col dito dopo il
  segnale per misurare senza spostare token. Non dedurne il nostro gesto touch o la
  condivisione automatica delle misure/preview.

**Raccomandazione:** segnali brevi e puntatore temporaneo su attivazione volontaria,
per indicare una porta o un punto mentre si parla. Riduce ambiguità spaziali; l'alternativa
resta descrivere tutto a voce. I due strumenti sono documentati insieme da Roll20.

**Raccordi e limiti:** comunicare è distinto da muovere, scegliere un bersaglio o lanciare
una magia. I-011 mantiene private le preview; I-109 mantiene la visione individuale.
Destinatari, scene/piani diversi, punti nascosti, più segnali e accessibilità richiedono
specifiche. Nessun ricentramento forzato, cursore pubblico continuo, pin o disegno persistente
adottati. Presenza nei prodotti non prova semplicità della combinazione, I-113.

**Integrazione dopo la risposta a Q131, 19/09/2026:** il proprietario indica Owlbear.

- [Owlbear — Dev Log 3](https://blog.owlbear.rodeo/owlbear-rodeo-2-0-dev-log-3/),
  pubblicato il 14/03/2022, originariamente 27/01/2022: descrive il puntatore condiviso,
  identificazione dell'autore e indicazione direzionale quando fuori inquadratura.
  È documentazione storica di sviluppo 2.0, non verifica dell'interfaccia odierna.
- [Owlbear — Pointer](https://docs.owlbear.rodeo/extensions/reference/items/pointer/),
  riferimento SDK senza versione/data esposta, consultato il 19/09/2026: elemento
  circolare che lascia una scia quando si muove. Conferma una capacità del modello,
  non il gesto di attivazione del prodotto base o tutti i dettagli del Dev Log.

**Esito:** Q131 confermata il 19/09/2026, I-150/F-051, con Owlbear esplicitamente richiesto.
Gestualità, grafica, visibilità e altri dettagli aperti; nessuna pagina approvata.

## R128 — disegnare indicazioni condivise mentre si discute una tattica

Verifica documentale del 19/09/2026 per Q132, A4/A6/A8/F-052. Fonti primarie;
nessuna prova runtime, installazione o produzione visuale. Ripresa mirata della
fonte Owlbear già conservata in R075, ora per l'uso condiviso in sessione.

- [Owlbear — Drawing](https://docs.owlbear.rodeo/docs/drawing/), guida senza data o
  versione esposta: cita espressamente la pianificazione tattica. Nello strumento
  Drawing, Marker traccia a mano libera, Line e Circle producono linee e cerchi;
  Grab seleziona e sposta gli elementi esistenti. Gli oggetti possono essere modificati
  e hanno un livello sopra mappa/griglia. Il percorso documentale non è una prova del layout.
- [Owlbear — Permissions](https://docs.owlbear.rodeo/docs/permissions/), senza data o
  versione esposta: Player Permissions apre il controllo dei permessi. Per ogni livello
  si può consentire o impedire ai giocatori di creare, aggiornare ed eliminare elementi;
  la guida menziona esplicitamente il disegno nella scena. L'esatta politica per autore
  delle nostre annotazioni rimane aperta, non dedotta da quella dei personaggi.
- Il [Dev Log 3 del 2022](https://blog.owlbear.rodeo/owlbear-rodeo-2-0-dev-log-3/),
  già in R127, descrive la sincronizzazione dei disegni fra giocatori connessi:
  riscontro storico per l'aspetto collaborativo, distinto dall'uso corrente osservato.

**Corrispondenza e raccomandazione:** disegni tattici condivisi e cancellabili, che
rimangono mentre il gruppo discute. Uso diverso dalla preparazione della mappa F-013
e dal puntatore F-051. Consigliati perché rendono visibili più riferimenti della
conversazione; alternativa sufficiente per chi preferisce semplicità: voce e puntatore.
Il costo riguarda affollamento, autorizzazioni e cancellazioni concorrenti.

**Confini:** non attribuire ai disegni movimento, collisioni o risoluzione di incantesimi;
le funzioni del riferimento non decidono la grammatica della nostra app. I-011 mantiene
private le preview. Permessi precisi, durata fra sessioni, salvataggio, annullamento,
visibilità, accessi, EN/IT, touch ed errori di rete richiedono i percorsi successivi.
Nessun obbligo di un editor separato, nuova pagina o prova di fattibilità dell'insieme I-113.

**Esito:** Q132 confermata il 19/09/2026, I-151/F-052; dettagli aperti, nessuna pagina approvata.

## R129 — consultare insieme i dati di gioco del gruppo

Verifica documentale del 19/09/2026 per Q133, A8/A3/A1/F-053. Fonti primarie;
nessuna installazione, prova runtime o verifica visuale. La Party Sheet già in R099
per i PE viene riletta qui per la consultazione del gruppo, non per riaprire i PE.

- [Fantasy Grounds — 5E Party Sheet](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996641997/5E%2BParty%2BSheet),
  guida di Derek Batting, aggiornata 23/09/2024, versione applicativa non esposta.
  Sidebar → TOOL → Party Sheet → Main: il DM aggiunge personaggi dai ritratti o
  dall'elenco Characters. Riepiloga PF, CA, Percezione passiva, difese e sensi.
  I valori in quella vista non sono modificabili; la visibilità ai giocatori è un'opzione
  separata. Le funzioni di tiro della stessa schermata non sono adottate da Q133.
- [Foundry — Party Overview](https://foundryvtt.com/packages/party-overview), Matheus
  Clemente, modulo 2.20.3 per Foundry 13+, verificato 14; intestazione generale 0.8.9+.
  D&D 5e fra i sistemi supportati. Riepilogo dei personaggi con token nella scena attiva.
- [README del manutentore](https://github.com/mclemente/party-overview), ramo master
  consultato senza SHA immutabile: salute, difese e lingue, con filtri sui personaggi.
  Richiede token con proprietario giocatore e cambia elenco passando di scena.
  Percorso documentato per l'inclusione: Actor nella sidebar → Permissions → Owner.
  Il README non precisa il comando attuale di apertura: non inventarlo.

**Corrispondenza e raccomandazione:** riepilogo facoltativo per il DM, derivato dai
valori delle schede che può consultare. Riduce l'apertura ripetuta delle schede per
controllare salute e capacità percettive. Alternativa: continuare con le schede individuali.
L'aggiornamento dai dati registrati segue il nostro principio I-027; non dichiarare
verificata la sincronizzazione di ogni campo nelle versioni attuali dei concorrenti.

**Differenze e limiti:** Fantasy Grounds compone esplicitamente il gruppo, Party Overview
lo lega ai token della scena; il nostro criterio non è ancora scelto. Gli esempi del
README sono multisistema, non tutti regole D&D. Nessun nuovo permesso ai giocatori,
accesso a note private, tiro automatico o scoperta di segreti dedotti. Dati mancanti,
coerenza, densità e visibilità vanno definiti nei percorsi; presenza sul mercato non
prova la fattibilità della nostra combinazione I-113. Nessuna formula o regola eseguibile creata.

**Esito:** Q133 confermata il 19/09/2026, I-152/F-053. Schede individuali sempre disponibili,
condizione ribadita dal proprietario e già prevista; dettagli aperti, nessuna pagina approvata.

## R130 — ricordare l'ordine di marcia durante l'esplorazione

Verifica documentale del 19/09/2026 per Q134, A6/A8/A1/F-054. Fonti primarie;
nessuna installazione, prova runtime o produzione visuale. Il riferimento Fantasy
Grounds già usato in R099/R129 è qui verificato per la formazione, non per i PE o il riepilogo.

- [Foundry — Marching Order](https://foundryvtt.com/packages/marching-order), kerplunk177,
  modulo 1.0, Foundry 13–13, verificato 13. Il GM apre l'icona delle impronte in Token
  Controls, oppure una scorciatoia configurabile, e sposta i personaggi da Available
  a Marching Order, riordinandoli. I giocatori aprono dalla stessa icona un elenco
  in sola lettura. Rileva i personaggi con proprietario giocatore; pubblicazione in
  chat tramite macro documentata. Permessi e criteri di inclusione non adottati implicitamente.
- [Fantasy Grounds — 5E Party Sheet](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996641997/5E%2BParty%2BSheet),
  guida aggiornata 23/09/2024, versione applicativa non esposta: Party Sheet → Order
  permette a giocatori e DM di disporre i ritratti nella formazione e modificarla.
  Sono documentati comandi per colonne, rotazione, cancellazione e collocamento dei
  token sulla mappa. Quest'ultimo è una capacità distinta, non approvata dalla proposta.
- [Realm VTT — New User Tour](https://www.realmvtt.com/wiki/new-user-tour), data esposta
  «Updated 6/11/2026», versione applicativa assente: View → Party Sheet → Formation
  per l'ordine di marcia e trascinamento della formazione su una scena; scorciatoia P
  con area di gioco a fuoco. La guida contiene anche riferimenti storici allo SRD non
  ancora rilasciato: non usarla come prova della copertura corrente delle regole 2024.

**Corrispondenza e raccomandazione:** traccia condivisa e modificabile dell'ordine
concordato dal tavolo. Il precedente Foundry copre esattamente l'elenco consultabile;
Fantasy Grounds e Realm mostrano anche la formazione spaziale. Consigliata per sapere
chi precedeva il gruppo senza ricostruirlo durante un incontro; voce e normali appunti
restano un'alternativa sufficiente. Costo: mantenere coerenti ordine, partecipanti e mappa.

**Differenze e limiti:** Foundry riserva la modifica al GM, Fantasy Grounds descrive
anche modifiche dei giocatori: autorità nostra ancora da definire. Persistenza fra
sessioni, concorrenza, correzioni e gruppo diviso non risultano verificati dalle fonti.
Nessuna automazione di movimento, cambio d'iniziativa, turni di guardia, formula di
sorpresa o scoperta automatica dedotti. Collocare pedine in formazione è distinto
dal farle seguire un capofila. Nessuna pagina approvata o fattibilità complessiva provata, I-113.

**Integrazione dopo la risposta a Q134, 19/09/2026:** il proprietario dichiara l'uso
corrente di Owlbear e propone la disposizione delle pedine come riferimento dell'ordine.
[Owlbear — Images](https://docs.owlbear.rodeo/docs/images/), guida senza data/versione
esposta, documenta Character per le pedine e Move → trascinamento alla posizione scelta,
con aggancio alla griglia configurabile. Mostra il normale posizionamento, non un
algoritmo di riconoscimento dell'ordine di marcia. La lettura della disposizione è
il caso d'uso del proprietario, non una funzione automatica attribuita a Owlbear.
L'elenco separato resta facoltativo; nessuna doppia compilazione obbligatoria.

**Esito:** Q134 confermata e precisata il 19/09/2026, I-153/F-054. Uso diretto delle
pedine conservato; raccordo automatico e casi di conflitto aperti, nessuna pagina approvata.

## R131 — pianificare chi fa la guardia durante il riposo

Verifica documentale del 19/09/2026 per Q135, A6/A8/A1/F-055. Fonti primarie;
nessuna installazione, prova runtime, immagine o nuova regola eseguibile.

- [Foundry — Party Operations](https://foundryvtt.com/packages/party-operations), Helios:
  versione del modulo 2.2.33, Foundry 12+, verificato 14. Rest Watch Management dichiara
  assegnazioni, attività, salvataggio dei piani e riepiloghi condivisibili. I numeri
  6.0.x mostrati sotto Supported Game Systems si riferiscono al sistema D&D, non al modulo.
- [Guida dell'autore — Rest Watch](https://github.com/Heliosiv/Forge-Operational-Improvements-Mod/blob/main/HOW_TO_USE.md),
  ramo main consultato senza SHA immutabile: apertura dai controlli scena, launcher o
  sidebar; poi Rest Watch. Si aggiungono i personaggi dal gruppo o manualmente,
  assegnano turni, intervalli e note, regolano visibilità e salvano un'istantanea.
  Impostazioni di automazione e apertura automatica ai giocatori sono separate;
  non adottare quei default. Guida e catalogo non sono una prova della stessa build runtime.
- [Fantasy Grounds — 5E Party Sheet](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996641997/5E%2BParty%2BSheet),
  guida aggiornata 23/09/2024 già consultata in R130: Party Sheet → Order registra
  numeri di turno di guardia decisi dai giocatori e inseriti dal DM; ammette più
  personaggi con lo stesso numero. È un ordine, non prova di fasce orarie automatiche.

**Corrispondenza e raccomandazione:** piano facoltativo dei turni di guardia con nomi
e intervalli, seguendo il percorso Rest Watch. Consigliato per sapere a chi era
assegnata la sorveglianza quando si narra un evento. Alternativa: accordi a voce o note.
Il costo riguarda aggiornamenti, permessi e distinzione fra pianificazione e attività svolte.

**Limiti:** le guide non fissano le nostre autorizzazioni, notifiche o regole di riposo.
Non importare il complesso sistema logistico di Party Operations con l'accettazione
di questa funzione. R068 conserva le regole di riposo da approfondire; nessuna durata
fissa, successo di Percezione, generazione di incontri o recupero automatico dedotti
dal piano. Il tempo della finzione I-087 rimane distinto dall'orologio reale.

**Esito:** Q135 confermata il 19/09/2026, I-154/F-055; dettagli aperti, nessuna pagina approvata, integrazione I-113 aperta.

## R132 — collegare una fonte di luce a inventario e tempo della finzione

Verifica documentale del 19/09/2026 per Q136, A6/A7/A5/F-056. Fonti primarie;
nessuna installazione, prova runtime, immagine o nuova regola eseguibile.

- [Foundry — Torch](https://foundryvtt.com/packages/torch/), Lupestro, modulo 3.3.0,
  Foundry 13–14, verificato 14.363: controllo nel Token HUD per accendere/spegnere
  luci secondo equipaggiamento e incantesimi. Il catalogo non prova da solo conteggi
  di durata o tutte le regole D&D; è il precedente più semplice di controllo della luce.
- [Foundry — Light Sources](https://foundryvtt.com/packages/light-sources), Mestre Digital,
  modulo 0.0.8, Foundry 14, verificato 14. Token selezionato → pulsante fiamma → fonte;
  stesso menu per Extinguish Light, passaggio sul controllo per durata residua.
  Collegamento all'inventario, consumo configurabile, durata e spegnimento documentati.
  Game Settings → Configure Settings → Light Sources → Configure Light Sources →
  modifica fonte → Consumption regola conteggio e tipo di orologio. Supporta anche
  modalità senza consumo o senza scadenza; usiamo il tempo della finzione I-087.

**Corrispondenza e raccomandazione:** gestione assistita facoltativa di luce portatile,
durata e scorte, con alternativa semplice di sola accensione/spegnimento. Il beneficio
è collegare informazioni che altrimenti andrebbero aggiornate separatamente; il costo
riguarda risorse, tempo, più fonti e visibilità. L'aggiornamento visibile e la correzione
seguono I-027/I-028, non richiedono un altro voto sul principio di automazione.

**Limiti e differenze:** Light Sources è un modulo generico recente, non prova di una
soluzione matura o di copertura 2024. Il supporto pubblicato non dimostra l'integrazione
nella nostra app I-113. Il timer reale offerto dal modulo non è adottato. Non dedurre
che torce, lanterne a combustibile e magia consumino lo stesso oggetto allo stesso
momento. Campi di compatibilità tecnici richiesti dal modulo non sono un requisito per
il giocatore. Lasciare/raccogliere luci, fonti ambientali interattive, avvisi e ripristino
delle impostazioni sono capacità ulteriori del riferimento, non tutte approvate da Q136.
Raggi, durate, risorse e azioni richiedono le rispettive fonti prima di essere specificati.

**Esito:** Q136 confermata il 19/09/2026, I-155/F-056; dettagli aperti, nessuna pagina approvata.

## R133 — scelta delle munizioni e aggiornamento della faretra

Verifica documentale del 19/09/2026 per Q137, A4/A7/F-057. Fonti primarie;
nessuna installazione, prova runtime o nuova regola eseguibile.

- [Foundry D&D5e — Activity Type Attack](https://github.com/foundryvtt/dnd5e/wiki/Activity-Type-Attack),
  aggiornata 10/09/2026, dichiarata aggiornata a 6.0.0: attività → scheda in chat →
  Attack → finestra del tiro → Ammunition. Per armi con la proprietà pertinente si
  sceglie la munizione; il suo bonus magico influisce sull'attacco e sui danni successivi
  della stessa scheda. La guida non prova da sola tutti i confini temporali del consumo.
- [Roll20 — D&D 5E by Roll20](https://help.roll20.net/hc/en-us/articles/360037773573-D-D-5E-by-Roll20),
  data della guida EN 04/09/2023: precedente storico della scheda OGL, non guida della
  nuova scheda 2024. Automatic Ammunition Tracking richiede il Companion API Script,
  funzionalità Pro nella guida. Settings → General Options → Ammo Tracking, risorsa
  nell'inventario e campo Ammunition dell'attacco collegano arma e quantità; quando
  si esegue il tiro dell'arma il conteggio cala e la chat lo segnala. Il comando
  ammotracking offre on/off/quiet. Non trasferire costo, script o compilazione di ID
  al nostro percorso ordinario; il riferimento prova consumo assistito disattivabile.
- [Foundry — issue 1239](https://github.com/foundryvtt/dnd5e/issues/1239), aperta
  14/08/2021 e chiusa: segnalazione storica di doppio consumo con cariche più munizioni.
  Conservata come caso da verificare nei percorsi, non affermazione di un bug attuale.

**Corrispondenza e raccomandazione:** collegare scelta della munizione e attacco alla
quantità posseduta, con tracciamento facoltativo. Combina selezione documentata da Foundry
e conteggio disattivabile documentato da Roll20; non attribuire la combinazione completa
alla sola guida Foundry. Il beneficio è ridurre contabilità e usi involontari di risorse;
il costo è garantire una sola spesa per l'attacco e correzioni coerenti.

**Limiti:** nessuna prova che i riferimenti coprano allo stesso modo dadi fisici,
interruzioni e recupero; I-032/I-027/I-028 restano i nostri requisiti. Non importare
un default di scelta, consumo al danno, recupero, munizioni illimitate o divieto a zero.
Preview senza effetti e consumo alla reale esecuzione conservano i principi acquisiti;
quantità, proprietà e momento preciso richiedono regole e percorsi pertinenti.
Presenza nei concorrenti non prova l'integrazione I-113.

**Esito:** Q137 confermata il 19/09/2026, I-156/F-057; dettagli aperti, nessuna pagina approvata.

## R134 — peso trasportato, capacità e conseguenze facoltative

Verifica documentale del 19/09/2026 per Q138, A7/A6/A3/F-058. Fonti primarie;
nessuna installazione, prova runtime o nuova regola eseguibile.

- [Roll20 — D&D 5E by Roll20](https://help.roll20.net/hc/en-us/articles/360037773573-D-D-5E-by-Roll20),
  guida EN del 04/09/2023, già usata in R133: precedente storico della scheda OGL.
  Equipment in modalità Compendium Compatible somma pesi e quantità; Total Weight
  mostra il carico, con segnalazioni di ingombro. Settings → General Options →
  Encumbrance permette Simple, Variant oppure Off. La scelta Inventory permette
  anche la lista semplice. Non è documentazione della nuova scheda 2024.
- [Foundry — Variant Encumbrance + Midi](https://foundryvtt.com/packages/variant-encumbrance-dnd5e),
  autore 4535992: catalogo con compatibilità Foundry 0.7.5–12, verificato 11;
  versione puntuale del modulo non rilevata. Precedente storico: i pulsanti nella
  testata della scheda selezionano conteggio con effetti, conteggio senza effetti,
  oppure entrambi disattivati. Quest'ultima modalità può lasciare il dato fermo,
  salvo ritorno al calcolo standard. La pagina contiene una frase introduttiva
  ambigua sugli effetti solo visivi; qui si usa la descrizione specifica dei comandi,
  senza attestare funzionamento attuale. Non adottiamo il dato fermo come comportamento.

**Corrispondenza e raccomandazione:** gestione facoltativa del peso e della capacità,
con contributi leggibili dall'inventario e scelta fra conseguenze assistite, sola
consultazione e nessuna gestione. Riprende totale e disattivazione di Roll20, più la
separazione esplicita fra conteggio ed effetti del modulo Foundry. Riduce somme
manuali; richiede qualità dei pesi, quantità, contenitori e trasportatore corretto.
L'alternativa è valutare il carico a voce o manualmente senza un sistema dedicato.

**Limiti:** riferimenti storici, non prova di compatibilità attuale o del contratto 2024. Le formule di ingombro della variante 2014, i moltiplicatori homebrew e gli
espedienti sulle unità metriche del modulo non diventano regole del prodotto.
Conseguenze, capacità e unità richiedono fonti e revisione pertinenti; il dettaglio
dei contributi e la correggibilità seguono I-027/I-028. Nessun default, blocco assoluto,
nuovo privilegio o distribuzione automatica del bottino dedotti. Non confondere
proprietario e trasportatore I-078. Nessuna prova di integrazione dell'insieme I-113.

**Esito:** Q138 confermata il 19/09/2026, I-157/F-058; dettagli aperti, nessuna pagina approvata.

## R135 — organizzare e trasferire borse con il contenuto

Verifica documentale del 19/09/2026 per Q139, A7/F-003. Fonti primarie;
nessuna installazione, prova runtime o nuova regola eseguibile.

- [Foundry — Dungeons & Dragons Fifth Edition](https://foundryvtt.com/packages/dnd5e),
  catalogo corrente, editore Wizards of the Coast; ultima versione elencata 6.0.3,
  Foundry 14.367+, verificato 14. Item Containers permette di raggruppare oggetti
  e monete in contenitori per organizzare l'inventario. Il catalogo non documenta
  tutti i comandi della versione elencata; non è prova runtime.
- [D&D5e — release 3.0.0, Containers](https://github.com/foundryvtt/dnd5e/releases/tag/release-3.0.0),
  tag storico release-3.0.0, commit mostrato 075dd2e, Foundry 11+: schede dei contenitori
  e del personaggio permettono trascinamento di oggetti; il contenitore si muove con
  il contenuto, anche annidato. Le note documentano cinque livelli e distinguono
  spostamento nella sidebar da copia tra contenitori di attori diversi. Questi limiti
  e la copia implicita non sono adottati. L'icona delle monete accanto ai campi valuta
  apre il trasferimento del denaro: percorso di riferimento, non nostro layout approvato.

**Corrispondenza e raccomandazione:** contenitori apribili per consultare e organizzare
oggetti e monete, inserimento/rimozione e passaggio della borsa con ciò che contiene.
È un ramo di F-003, non una nuova pagina. Consigliato per trovare e passare insieme
un insieme già raccolto, mantenendo facoltativa l'organizzazione; alternativa elenco
unico con posizione descritta nelle note. Il costo riguarda coerenza fra contenuto,
quantità, custodia, peso e visibilità durante spostamenti e correzioni.

**Limiti:** il catalogo attuale conferma la capacità generale; il percorso dettagliato
proviene dalla release storica e andrà verificato nella UI pertinente prima del contratto
di pagina. I-070–I-076 governano gli scambi: l'accettazione del ricevente e la prevenzione
dei duplicati non vengono sostituite dai comportamenti di copia documentati nel riferimento.
I-078 distingue proprietà e trasporto, I-080 protegge gli oggetti riservati, I-157 mantiene
il peso facoltativo. Contenitori annidati, capacità, borse magiche, tempi di accesso,
cancellazione, permessi e rete richiedono approfondimenti; nessuna regola dedotta dalla
struttura dell'inventario. L'esistenza nei concorrenti non prova l'integrazione I-113.

**Esito:** Q139 confermata il 19/09/2026, I-158/F-003; dettagli aperti, nessuna pagina approvata.

## R136 — preferiti personali e richiamo rapido delle opzioni di gioco

Verifica documentale del 19/09/2026 per Q140, A3/A4/A5/F-008. Fonti primarie;
nessuna installazione, prova runtime, mock o codice.

- [Foundry — D&D5e](https://foundryvtt.com/packages/dnd5e), catalogo corrente già
  verificato in R135, ultima versione elencata 6.0.3, Foundry 14.367+, verificato 14:
  la scheda include una lista personalizzabile di preferiti. Non prova ogni comando
  o stato di disponibilità della versione corrente.
- [D&D5e — release 3.0.0, Favourites](https://github.com/foundryvtt/dnd5e/releases/tag/release-3.0.0#favourites),
  tag storico release-3.0.0, commit mostrato 075dd2e, Foundry 11+: trascinamento
  dalla scheda alla sezione Favourites. Esempi: armi, incantesimi, capacità, abilità,
  oggetti e risorse; la lista dei tipi comprende effetti, strumenti e slot.
  La posizione in basso a sinistra e i dettagli storici sulle risorse non sono
  decisioni di layout o di funzionamento del nostro prodotto.
- [Roll20 — Macro Quick Bar](https://help.roll20.net/hc/en-us/articles/360039178674-Macro-Quick-Bar),
  guida EN aggiornata 29/08/2024, versione dell'app non indicata. Collections →
  Show Macro Quick Bar e In Bar abilitano i comandi; trascinare un roll button dalla
  scheda crea l'accesso rapido senza riscrivere la formula. La maniglia permette
  riordino e rimozione; il menu contestuale modifica nome/colore per l'utente locale.
  La guida avverte che altri tipi di pulsante potrebbero non funzionare. Non adottiamo
  queste limitazioni, sintassi di macro o collocazione grafica come nostro contratto.

**Corrispondenza e raccomandazione:** una raccolta personale facoltativa per richiamare
le opzioni usate spesso, aggiungendo, ordinando e rimuovendo collegamenti. Foundry
fornisce il precedente per tipi di elementi e Roll20 per accessi rapidi personalizzabili.
Consigliata per trovare più rapidamente arco, incantesimo o pozione; liste complete
sempre disponibili. Il costo riguarda collegamenti, risorse e cambiamenti di personaggio.

**Limiti:** non attribuire il comportamento completo a un solo riferimento o all'intera
UI attuale. Il confronto non decide collocazione, hotkey, azione al clic o visibilità
a ogni momento. I nostri percorsi di selezione/preview e conferma, dadi fisici/digitali,
permessi e correzioni restano vincolanti. Preferito non significa preparato, equipaggiato,
utilizzabile o consumato; rimuovere un collegamento non elimina il contenuto originale.
Nessuna macro programmabile o sequenza di azioni automaticamente eseguite proposta.
I risultati su BG3 non hanno fornito una guida primaria sufficiente alla personalizzazione:
non attribuirgli qui comandi specifici. Presenza nei concorrenti non prova l'integrazione I-113.

**Esito:** Q140 confermata il 19/09/2026, I-159/F-008; dettagli aperti, nessuna pagina approvata.

## R137 — contatori ad hoc e distinzione dalle risorse strutturate

Verifica documentale del 19/09/2026 per Q141, A3/A10/F-008. Fonti primarie;
nessuna installazione, prova runtime o nuova regola eseguibile.

- [Roll20 — D&D 5E by Roll20, Class & Other Resources](https://help.roll20.net/hc/en-us/articles/360037773573-D-D-5E-by-Roll20),
  guida EN del 04/09/2023: scheda OGL storica, non scheda 2024. La sezione presenta
  nome modificabile cliccando Other Resource, valore numerico modificabile direttamente
  o incrementabile/decrementabile e campo Max testuale. Passaggio sulla sezione →
  Add (+) aggiunge altri blocchi. Il conteggio può anche collegarsi alla quantità di
  un oggetto con Use As A Resource; tale collegamento è distinto dal contatore libero.
  Non adottiamo un numero iniziale di riquadri o gli esempi di regole storiche.
- [Foundry D&D5e — Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities),
  wiki aggiornata 10/09/2026, dichiarata aggiornata a 6.0.0. Item → Activities → +
  crea un'attività; Activation → Consumption configura risorse e quantità consumate,
  Usage e Recovery definiscono usi e recupero. Gli usi dell'attività sono distinti
  da quelli dell'oggetto; per consumarli serve il collegamento appropriato. È un
  precedente per risorse strutturate e automazioni, non prova di contatori liberi
  direttamente nella scheda. I dettagli di configurazione non sono imposti al giocatore.

**Corrispondenza e raccomandazione:** aggiunta facoltativa di contatori con nome e
valore direttamente nella scheda, senza dover creare prima una capacità completa.
Riprende i campi liberi di Roll20; il massimo quando utile è coerente con la semplicità
richiesta I-058, senza imporre una validazione universale. Esempio inventato: tre
«gettoni del destino», poi due dopo una spesa. L'alternativa è tenerne traccia nelle note.
Beneficio: meno preparazione per una risorsa del tavolo; costo: distinguere contatori
ad hoc da quantità e risorse già collegate evitando copie divergenti.

**Applicazione dei principi acquisiti:** consumo e recupero delle risorse dotate di
regole strutturate seguono I-027/I-028, con fonti, costi e tempi pertinenti da specificare.
Non si chiede un altro sì all'automazione. Il contatore libero non acquisisce regole
per il solo nome: eventuali collegamenti, trigger e recuperi richiedono definizione.
Nessun azzeramento al riposo o all'alba, conferimento di poteri o massimale universale
dedotti. Permessi già concordati e supporto fisico/digitale dei recuperi con dadi
restano vincolanti. Il riferimento storico non prova UI attuale o integrazione I-113.

**Esito:** Q141 confermata il 19/09/2026, I-160/F-008; massima libertà ribadita, dettagli aperti, nessuna pagina approvata.

## R138 — abilità personalizzate utilizzabili dalla scheda

Verifica documentale del 19/09/2026 per Q142, A3/A10/F-008. Fonti primarie;
nessuna installazione, prova runtime o nuova regola eseguibile.

- [Roll20 — D&D 5E by Roll20](https://help.roll20.net/hc/en-us/articles/360037773573-D-D-5E-by-Roll20),
  guida EN del 04/09/2023, scheda OGL storica: Core → Tool Proficiencies & Custom Skills
  → Add (+). La voce permette nome, livello di competenza, caratteristica e modificatori;
  la rotella chiude la modifica e lascia il comando per tirare. Custom Skills and Stats
  documenta esplicitamente prove aggiuntive per l'ambientazione o le house rule.
  Il menu della caratteristica offre anche Query Attribute; non si sceglie qui quel default.
- [Roll20 — 2024 Change Log](https://help.roll20.net/hc/en-us/articles/34086640235927-2024-Change-Log),
  registrazioni D&D 2024 del 18/09/2024 e 26/11/2024: riferimenti alle custom skills
  nelle macro e rimozione dal dettaglio dell'abilità, Advanced Options. Conferma
  che esistono anche nella scheda 2024; non prova che la creazione segua la UI OGL.
  Le note del 29/04/2024 sulle custom skills appartengono invece a Pathfinder:
  non usarle come prova per D&D. Macro e rimozione di abilità standard non sono adottate.
- [Foundry — dnd5e-custom-skills, README dell'autore](https://github.com/misthero/dnd5e-custom-skills),
  misthero, ramo consultato senza revisione immutabile fissata; release e compatibilità
  attuale non verificate. Module configuration → Skill Name → Activated → Save;
  scelta della caratteristica associata, poi tiro e competenza dalla scheda. Le note
  richiedono salvataggio ulteriore per nuovi personaggi e più passaggi per rinominare;
  non adottiamo questi attriti. Il modulo supporta anche nuove caratteristiche e
  nascondere quelle standard: capacità ulteriori non proposte in Q142.

**Corrispondenza e raccomandazione:** una voce personalizzata richiamabile dalla scheda
per prove ricorrenti, con contributi legati al personaggio. Esempio ipotetico:
«Tecnologia antica» in un'ambientazione del tavolo, non nuova regola ufficiale.
Consigliata per non ricostruire i modificatori ogni volta; alternativa tiri al momento
con descrizione negli appunti. Uso facoltativo e correzioni seguono i principi acquisiti.
Il costo riguarda definizione, autorità, competenza, aggiornamenti e modificatori.

**Limiti:** riprendere il comportamento, senza garantire compatibilità dei moduli,
UI corrente o integrazione I-113. Dadi fisici/digitali e breakdown I-027/I-032 restano
requisiti nostri; non dedurli dal solo comando di tiro digitale dei riferimenti.
Una voce creata non concede competenza gratuita o autorizza da sola una house rule.
Non implica nuove caratteristiche di base, rimozione delle abilità standard, nuove
formule universali, macro o propagazione automatica a tutte le schede. I percorsi di
authoring e abilitazione della campagna devono conservare I-064/I-066 e le relative
questioni aperte. Nessuna decisione su abilità alternative per un singolo tiro dedotta.

**Esito:** Q142 confermata il 19/09/2026, I-161/F-008; libertà e flessibilità ribadite, dettagli aperti, nessuna pagina approvata.

## R139 — stati e promemoria personalizzati collegati alle creature

Verifica documentale del 19/09/2026 per Q143, A3/A4/A10/F-008/F-005. Fonti primarie;
nessuna installazione, immagine prodotta, prova runtime o nuova regola eseguibile.

- [Roll20 — Token Marker Sets](https://help.roll20.net/hc/en-us/articles/360041536313-Token-Marker-Sets),
  guida EN del 20/02/2024, versione dell'app non indicata. Tools → Token Marker Library
  → Create Set → Add Images → rinomina → Save; nella campagna Token Marker Sets → +
  aggiunge la raccolta. Il menu della pedina rende disponibili i marcatori. La guida
  distingue questi segni dalle sole condizioni: possono ricordare altre cose.
  Il limite al creatore della partita, il reload dei giocatori e l'upload obbligatorio
  non sono decisioni del nostro percorso. Non prova effetti meccanici o scheda aggiornata.
- [Owlbear Rodeo — Images](https://docs.owlbear.rodeo/docs/images/), documentazione
  senza data o versione esposte, già usata in R130: gli Attachments sono usati anche
  per gli stati e si agganciano trascinandoli dal Dock su un personaggio. Il menu
  dell'immagine offre Attach/Detach, testo e rimozione. È un riferimento per il
  promemoria sulla pedina del prodotto già usato dal gruppo, non per regole automatiche.
- [Foundry — Side Effects](https://foundryvtt.com/packages/side-effects), Autumn225,
  modulo 0.0.4, Foundry 14–14, verificato 14; [README dell'autore](https://github.com/Autumn225/side-effects).
  La directory degli effetti si apre dalla sidebar; creazione/modifica di stati
  personalizzati e aggiunta temporanea al Token HUD sono capacità documentate.
  I comandi successivi non sono descritti nel dettaglio. La versione indicata sotto
  Supported Game Systems riguarda D&D5e, non il modulo; il modulo è recente e la
  documentazione non dimostra maturità o copertura delle nostre integrazioni.

**Corrispondenza e raccomandazione:** stati e promemoria riutilizzabili con nome e
significato, applicati alle creature autorizzate e rimossi quando non servono.
Esempio narrativo: due personaggi con «Marchio del culto». Consigliato per ricordare
a chi si riferisce l'informazione senza cercarla negli appunti; uso facoltativo.
Il raccordo fra scheda e pedina è il nostro adattamento ai percorsi con e senza mappa,
non una capacità attribuita ai soli marcatori Roll20/Owlbear. Il costo è mantenere
significato, identità della creatura, visibilità e istanze coerenti.

**Limiti:** un promemoria descrittivo non introduce penalità, scadenze o tiri da solo;
eventuali effetti strutturati seguono I-027 e F-009. Non importa automaticamente
rimozione delle condizioni standard, disattivazione della visione, librerie pubbliche,
nuovi permessi, immagini o funzioni ulteriori dei riferimenti. La scelta grafica rimane
vietata in questa fase D-012. Riuso, segreti, più pedine, durata, sostituzione/rimozione,
log e rete da approfondire; presenza nei prodotti non prova l'integrazione I-113.

**Esito:** Q143 confermata il 19/09/2026, I-162/F-008/F-005; ampiezza delle situazioni
rappresentabili ribadita, dettagli aperti, nessuna pagina approvata.

## R140 — mazzi personalizzati, mani e scarti

Verifica documentale del 19/09/2026 per Q144, A8/A9/A10/F-059. Fonti primarie;
nessuna installazione, prova runtime, visione di video o creazione di carte/immagini.

- [Foundry — Cards](https://foundryvtt.com/article/cards/), guida del nucleo senza
  data o versione applicativa esposte. Cards Directory → Create Card Stack → nome
  e tipo Deck/Hand/Pile → Create New Card Stack; Add Card crea le carte. Deck,
  Hand e Pile distinguono mazzo, mano e raccolta come gli scarti. Deal distribuisce,
  Draw pesca; Play/Pass trasferiscono verso una mano o pila, Shuffle mescola,
  Reset restituisce le carte al mazzo d'origine. Configure Permission regola
  visione/modifica dello stack. La guida espone funzionalità di base: sistemi/moduli
  possono cambiarle. Face Down mostra il dorso anche al destinatario, non equivale
  a una mano privata con faccia leggibile dal proprietario. Nessun default adottato.
- [Roll20 — Collections](https://help.roll20.net/hc/en-us/articles/360039178754-Collections),
  guida EN del 05/09/2023, versione dell'app non indicata. Collections ospita Card
  Decks; Show rende il mazzo disponibile, il menu offre Deal, Recall e Shuffle.
  Nelle impostazioni della raccolta Add crea una carta. L'icona sopra l'avatar
  apre la mano; trascinare una carta sul tavolo la gioca. Le impostazioni In other's
  hands distinguono visibilità del numero e delle facce per giocatori e GM; la
  guida documenta mani altrui coperte per default. Descrive anche scarti e scambi.
  Alcuni riferimenti interni alla scheda My Settings sono discordanti con Collections:
  percorso storico documentale, non UI corrente verificata.

**Corrispondenza e raccomandazione:** mazzi personalizzati facoltativi da creare e
riusare; mescolare, pescare/distribuire, conservare carte nelle mani, mostrarle/giocarle
e scartarle. Esempio ipotetico: una carta di un mazzo di presagi da rivelare più avanti.
La permanenza nelle mani e la composizione del mazzo distinguono il bisogno dalle
tabelle casuali F-043. Consigliato per rappresentare quel tipo di gioco anche a distanza;
nessun mazzo da preparare se il tavolo non lo usa. Alternativa: tabelle, appunti,
carte fisiche o servizi esterni. Costo: stato persistente, visibilità, trasferimenti,
correzioni e sincronizzazione delle operazioni nell'app.

**Limiti:** la presenza nei due VTT non dimostra semplicità o fattibilità dell'insieme
I-113. Non ereditiamo preset di poker, contenuti commerciali, iniziativa di altri
regolamenti, obbligo di immagini, limiti o default dei permessi. Nessun effetto
automatico dedotto dalla carta, motore universale di giochi di carte o sincronizzazione
con mazzi fisici approvati. Mani riservate e carte coperte sono concetti distinti:
definire accesso del destinatario, degli altri e del DM. Le regole private del tavolo
e i contenuti pubblici restano separati. Il Crash Course ufficiale ha portato alla
guida Collections; la pagina wiki Cards ha restituito 403 e non è usata come prova.

**Esito:** Q144 risolta il 19/09/2026 per delega circoscritta, I-163: l'agente adotta
l'opzione 1, mazzi facoltativi F-059. Dettagli aperti, nessuna pagina approvata.

## R141 — turni durante l'esplorazione, senza uno scontro

Verifica documentale del 19/09/2026 per Q145, A6/A4/A8/F-060. Fonti primarie;
nessuna installazione, prova runtime, video visionato o nuova regola eseguibile.

- [Larian — A little about combat & stealth](https://baldursgate3.game/news/a-little-about-combat-stealth_3),
  07/08/2020, spiegazione precedente all'Early Access, senza numero di build.
  Il Forced Turn-Based consente di passare a turni durante l'esplorazione: trappole,
  pattuglie, furti e problemi di navigazione. L'autore descrive intervalli di sei
  secondi. La fonte prova l'intento e il comportamento pubblicato storico; non
  verifica la UI attuale né stabilisce il nostro ordine di gioco o la baseline 2024.
  I passaggi del comando d'attivazione non sono descritti qui nel dettaglio.
- [Larian — Patch 8](https://baldursgate3.game/news/the-final-patch-new-subclasses-photo-mode-and-cross-play_138),
  15/04/2025: le note distinguono combattimento e Turn-Based Mode nel comando
  Move To del menu contestuale su controller; correggono consumo di movimento
  all'ingresso e problemi in split screen quando un partecipante entra nella modalità.
  Riscontro dopo il lancio della presenza della modalità e di confini delicati;
  non una prova runtime, una guida completa o conferma di bug tuttora presenti.
- [Foundry — Mindful Encounters](https://foundryvtt.com/packages/mindful-encounters),
  3 Death Saves, modulo 1.3.2, Foundry 14+, verificato 14.367. Pagina consultata
  indica aggiornamento relativo di due giorni e sedici ore; lo snippet di ricerca
  era meno recente. Estensione a pagamento, non funzione del nucleo Foundry.
  Abilitazione per scena; pannello dei partecipanti con budget di movimento e Done,
  azioni d'esplorazione conteggiabili. Quando tutti hanno concluso avanza il tempo
  configurato; il GM può includere/escludere pedine, ripristinare o avanzare.
  Turni simultanei senza iniziativa; durante il combattimento l'estensione si sospende.
  Questi controlli sono documentati nel catalogo; percorso completo d'abilitazione
  non verificato, nessun acquisto o requisito a pagamento adottato.

**Corrispondenza e raccomandazione:** turni facoltativi anche senza nemici, per
coordinare azioni, movimento e tempo in un passaggio pericoloso o furtivo.
Riferimento principale BG3; il modulo mostra un'applicazione al tavolo virtuale,
ma usa budget e intervalli diversi dall'iniziativa di uno scontro. Proporre il
bisogno comune, lasciando ordine, durata e attivazione da definire. L'esplorazione
libera rimane disponibile. Alternativa: il DM scandisce la sequenza a voce usando
strumenti ordinari già previsti. Beneficio: capire chi ha agito e quanto tempo è
trascorso; costo: coerenza di partecipanti, risorse, durate e cambio di modalità.

**Limiti:** nessun automatismo di pattuglie/trappole ricavato dalla sola modalità,
nessuna nuova regola d'iniziativa, scala fissa universale, budget del modulo,
blocco rigido dei movimenti o turni simultanei già adottati. L'orologio rimane quello
della finzione I-087; non imporre attese reali. Entrare e uscire non autorizza recuperi
gratuiti o azzeramenti di risorse. Dati e regole 2024 da verificare prima di definire
conseguenze eseguibili. Raccordo con F-001/F-005/F-010/F-036/F-056, autorizzazioni,
correzioni e uso senza mappa restano aperti; I-113 non dimostrata dai concorrenti.

**Esito:** Q145 risolta il 19/09/2026 per delega circoscritta, I-164: l'agente adotta
l'opzione 1, turni fuori combattimento F-060. Dettagli aperti, nessuna pagina approvata.

## R142 — dividere e riunire le viste dei giocatori fra scene

Verifica documentale del 19/09/2026 per Q146, A1/A4/A6/A8/F-005/F-006. Fonti
primarie; nessuna installazione, prova runtime, immagine o nuova regola eseguibile.

- [Roll20 — Introducing Page Folders & the Party Toolbox](https://blog.roll20.net/posts/introducing-page-folders-the-party-toolbox/),
  Riley Dutton, 24/10/2023, versione applicativa non esposta. Aprire Party Toolbox,
  trascinare un giocatore su una pagina crea un Breakout Group; altri giocatori
  possono essere aggiunti al gruppo. L'elenco mostra dove si trovano anche gli
  assenti; Regroup All riunisce tutti nel gruppo della Party Ribbon.
  È un percorso documentato per distribuire e riunire le viste, non un modello
  di isolamento delle conversazioni o delle regole nelle diverse scene.
- [Roll20 — 2024 Change Log](https://help.roll20.net/hc/en-us/articles/34086640235927-2024-Change-Log),
  voci del 14/08/2024 e 09/12/2024. La prima attesta la sostituzione della vecchia
  Page Toolbar con Page Folders e Party Toolbox per tutte le campagne, superando
  l'opt-in indicato nell'annuncio 2023. La seconda rinomina Move Party Here in
  Move Party Ribbon Here per chiarire che le pedine non vengono copiate
  automaticamente. Distinguere vista del giocatore, posizione e identità della
  creatura. Non dedurre un limite nostro al trasferimento delle pedine.
- [Foundry — Scenes](https://foundryvtt.com/article/scenes/), guida senza data o
  versione esposte. Distingue una scena attiva comune e una scena vista per utente.
  Sidebar Scenes → menu contestuale → View Scene carica soltanto per chi la apre;
  Activate richiama tutti. La sezione Permissions documenta GM Only, All Players
  e Pull to Scene per il singolo giocatore. Il punto di accesso a quest'ultimo
  comando non è dettagliato nella guida letta. Riferimento per la distinzione
  tra consultare una scena e portarvi il gruppo; nessuna UI corrente provata.

**Corrispondenza e raccomandazione:** viste separate facoltative nella medesima
sessione, quando il gruppo si divide. Esempio: ladro nella villa e compagni in
taverna, ciascuno dal proprio laptop. Il DM passa fra le scene e può riunire le
viste; scena condivisa sempre disponibile. Si segue il bisogno coperto da Party
Toolbox e Scenes, senza replicare alla cieca gestione delle autorizzazioni o
terminologia. Beneficio: mantenere il contesto per ciascuna parte del gruppo.
Alternativa: un'unica scena condivisa alla volta, con il resto raccontato a voce.
Costo: navigazione, permessi, coerenza di personaggi, tempo e azioni fra scene.

**Limiti:** una vista diversa non teletrasporta il personaggio, crea copie o concede
accesso a un luogo segreto. Non dimostra gestione integrata di combattimenti
simultanei, cronologie separate, log o conversazioni riservate. Chat, tiri, più
personaggi/controllori, ospiti, assenti, DM/co-DM, scene senza mappa, schermo comune
e riconnessione restano da approfondire. Le chiamate rimangono esterne I-102;
nessuna conduzione autonoma dei gruppi. Raccordi con F-016/F-060 e tempo I-087,
integrazione I-113 aperta. Nessun limite tratto da opinioni della community adottato.

**Esito:** Q146 confermata il 19/09/2026, I-165/F-005/F-006; scene separate facoltative,
dettagli aperti, nessuna pagina approvata.

## R143 — passaggi riutilizzabili fra punti e mappe

Verifica documentale del 19/09/2026 per Q147, A4/A6/A8/F-005/F-013. Fonti primarie;
nessuna installazione, immagine prodotta, prova runtime o nuova regola eseguibile.

- [Foundry — Scene Regions, Stairways](https://foundryvtt.com/article/scene-regions/),
  guida senza data/versione esposte. Il tutorial crea prima la zona d'arrivo, poi
  quella d'ingresso; Behaviors → Teleport Token → Destination → Add Document →
  Update Region Behavior. L'esempio collega anche scene diverse. La destinazione
  viene identificata nella guida copiando il Document UUID; il gesto tecnico è
  evidenza della fonte, non il percorso di authoring scelto per il nostro prodotto.
  Allow Choice offre una domanda prima del trasferimento quando si entra nella
  zona; i comportamenti possono essere abilitati/disabilitati. Non importare
  trigger, scelte predefinite o altri comportamenti delle Regions automaticamente.
- [Owlbear — Portals](https://extensions.owlbear.rodeo/portals), resident-uhlig,
  estensione terza nel catalogo, senza data/versione esposte. Attach Teleport to
  Token collega due pedine già presenti scegliendo origine e destinazione; Add
  Teleport Token to Map ne colloca due nuove. All'ingresso della pedina nel portale
  avviene il trasferimento e la vista di chi la muove viene centrata su di essa.
  Menu contestuale: Disable/Enable Teleport, Confirm Teleport o Automagic Teleport.
  I collegamenti possono essere in una o due direzioni; il GM li configura e chi
  può muovere la pedina può attraversarli. La fonte descrive una singola mappa:
  non prova il trasferimento fra scene, documentato invece da Foundry.

**Corrispondenza e raccomandazione:** collegamenti facoltativi preparati fra un
punto d'ingresso e un punto d'uscita, anche su mappe diverse. Esempio: salire dalla
taverna alla mappa del piano superiore. Usare il passaggio porta la pedina nel
punto previsto; preparazione riutilizzabile e correzione/spostamento manuale
sempre disponibili. Si segue il comportamento Stairways Foundry, confrontando
Portals per configurazione e interazione. Beneficio: evitare di ricollocare ogni
volta le pedine a mano. Alternativa: cambio mappa e posizionamento manuali del DM.
Costo: mantenere identità, destinazione, posizione, visuale e regole coerenti.

**Limiti:** non concede teletrasporto libero né identifica un passaggio segreto;
non deduce costo zero o superamento di porte bloccate. Le conferme per passaggio
sono un'opzione documentata, non una scelta predefinita già approvata. Definire
consenso al movimento, attivazione, destinazione occupata/mancante, più creature,
collegamenti circolari, direzioni, quote, risorse, reazioni, turno in corso e cambio
vista. Il ricentramento Owlbear nella stessa mappa non prova la gestione di tutti
i controllori dopo un cambio scena; il nostro raccordo va specificato. Mappe 2D
I-137, scene separate I-165 e automazione/correzioni I-027/I-028 restano acquisiti.
Nessun editor universale di automazioni, scripting, animazione o nuova grafica
approvati; rete e integrazione I-113 aperte.

**Esito:** Q147 confermata il 19/09/2026, I-166/F-005/F-013; passaggi collegati facoltativi,
dettagli aperti, nessuna pagina approvata.

## R144 — aprire e chiudere porte dalla mappa

Verifica documentale del 19/09/2026 per Q148, A4/A6/A8/F-005/F-013. Fonti primarie;
nessuna installazione, prova runtime, immagine o nuova regola eseguibile.

- [Foundry — Walls](https://foundryvtt.com/article/walls/), guida senza data/versione
  esposte. Wall Controls → Draw Door/Draw Secret Door; doppio clic sul segmento
  apre la configurazione. Is Door distingue porta e segreto; Door State aperta,
  chiusa o bloccata. Clic sull'icona apre/chiude se permesso; il GM blocca/sblocca
  con clic destro. Open and Close Doors è un permesso configurabile per ruolo.
  Aprire rimuove le restrizioni della porta su movimento e percezione; chiudere
  le ripristina. Le porte segrete non espongono l'icona ai normali giocatori.
  Il nucleo descritto richiede lo sblocco del GM, non prova scasso o uso automatico
  di chiavi; non adottiamo quel limite come regola del nostro prodotto.
- [Roll20 — Placing Doors & Windows](https://help.roll20.net/hc/en-us/articles/11462645998999-Placing-Doors-Windows),
  guida EN del 27/10/2025, versione applicativa non esposta. Toolbar → icona torcia
  → Door → opzioni → clic sulla mappa; modifica dalla Dynamic Lighting layer.
  Secret, Locked Door e Opened sono distinti. La guida richiede Restrict Movement
  e documenta che una porta bloccata non si apre semplicemente cliccandola.
  Preparazione e visione automatica nel nostro prodotto rimangono facoltative.
- [Roll20 — Using Dynamic Lighting As A Player](https://help.roll20.net/hc/en-us/articles/11786989363479-Using-Dynamic-Lighting-As-A-Player),
  guida EN del 25/03/2024. Clic sinistro su porte/finestre predisposte dal DM per
  aprire; da aperte consentono il passaggio. Incrociata con la guida di preparazione
  per non trattare il clic come capace di aprire anche serrature o porte segrete.
  Fonte documentale, non prova dell'interazione corrente su ogni dispositivo.

**Corrispondenza e raccomandazione:** porte/cancelli facoltativi che il giocatore
apre o chiude quando consentito, con stato coerente fra passaggio e visuale.
Esempio: accanto a una porta di legno non bloccata, aprirla rende visibile quanto
la visione del personaggio consente oltre la soglia, se il tavolo usa quel sistema.
Seguire l'interazione diretta dei due VTT; il DM può preparare blocchi e segreti
e correggere. Nessun obbligo di configurare ogni apertura. Alternativa: descrizione
e aggiornamento manuale del DM. Beneficio: interazione ordinaria autonoma e mappa
coerente; costo: collegare persona, stato, permessi, visibilità e conseguenze.

**Limiti:** l'esistenza del comando non prova distanza, costo in azioni, scasso,
sfondamento, chiavi o scoperta automatica di segreti. Questi percorsi restano da
definire secondo regole 2024, homebrew e I-027. La configurazione del DM non è
un'approvazione richiesta per ogni apertura ordinaria I-006. Nessuna manipolazione
a distanza o rivelazione gratuita; un cancello trasparente non diventa opaco solo
perché chiuso. Non importare suoni, animazioni, grafica, gesti o default nascosti
come scelte approvate. I-109 conserva visione facoltativa e rivelazione manuale.
Trappole F-036, passaggi I-166, reazioni, correzioni I-028, accessi simultanei,
EN/IT, salvataggio, errori/rete e integrazione I-113 rimangono aperti.

**Esito:** Q148 confermata il 20/09/2026, I-167/F-005/F-013; porte interattive facoltative,
richiesta di spiegazione sul raccordo con mappe proprie e modelli in R145. Dettagli aperti, nessuna pagina approvata.

## R145 — immagini, mappe preparate e importazione dei dati interattivi

Verifica documentale del 20/09/2026 per la precisazione Q148/I-167 e la proposta
Q149, A8/A12/F-013/F-028. Riutilizzati R075/R076 sui modelli e R144 sulle porte;
nessuna mappa scaricata/prodotta, installazione, prova runtime o immagine generata.

- [Foundry — Scenes](https://foundryvtt.com/article/scenes/), guida senza data/versione
  esposte, riletta: Create Scene → Background Image → file picker e Save Changes;
  le scene preparate possono arrivare da un compendio o da dati esportati.
  Incrociata con Walls R144: l'immagine non è il dato interattivo di muro o porta.
  Conservare immagine e preparazione insieme per un modello è il raccordo ai
  requisiti acquisiti, non la promessa di un catalogo o di immagini tutte scomponibili.
- [Foundry — Universal Battlemap Importer](https://foundryvtt.com/packages/dd-import),
  Moo Man, versione 6.1.1 per Foundry 14–14, verificato 14. Il riepilogo generale
  0.6.6–14 include versioni storiche; non è la compatibilità della sola release corrente.
  Il catalogo indica esportazioni Dungeondraft, DungeonFog e Arkenforge.
  [README dell'autore](https://github.com/moo-man/FVTT-DD-Import), ramo master senza
  SHA verificato: esportare Universal VTT, scheda Scenes → Universal Battlemap
  import → nome scena, destinazione immagine e opzioni di fedeltà/allineamento.
  Non adottare gestione dei percorsi di file, S3 o complessità della finestra come
  requisiti del nostro percorso; è evidenza dei dati importabili e dei controlli.
- [Owlbear — Smoke & Spectre](https://extensions.owlbear.rodeo/smoke), estensione
  terza, guida che richiama S&S3.0 senza numero completo di release o data esposti.
  Settings → Import: selezionare il file UVTT crea una scena con immagine,
  ostacoli, porte e luci. La sezione Importing Fog Files distingue il caso completo
  dai file che richiedono una mappa già presente e selezione Alignment; possono
  servire correzioni di allineamento. Porte da linee di ostacolo e aperture sono
  documentate separatamente. Non prova interpretazione automatica di una fotografia
  né una conversione perfetta di tutti i file; non importare i default di visibilità.

**Spiegazione della precisazione:** immagini proprie e modelli modificabili sono
entrambi acquisiti I-096/I-097. L'immagine fa da sfondo; il DM aggiunge muri, porte,
luci e passaggi interattivi quando servono. Si può giocare con pedine e gestione
manuale senza completare tutta la preparazione. Un modello strutturato può già
conservarla e restare modificabile. È un'applicazione dei requisiti acquisiti e
del pattern Foundry, non una nuova alternativa fra immagini e modelli né un
riconoscimento automatico promesso per ogni JPG/PNG. Categorie/provenienza dei
modelli e integrazione I-113 restano aperte.

**Raccomandazione Q149:** importazione assistita di dati interattivi già presenti
in formati esterni supportati, così da riusare il lavoro fatto. UVTT è un esempio
verificato, non la lista finale dei formati approvati. Recuperare ciò che è
supportato, permettere correzioni e indicare parti mancanti: gli ultimi aspetti
applicano I-116/I-027/I-028, non sono attribuiti identici ai due importatori.
Alternativa: immagini esterne con preparazione manuale nell'app. Beneficio:
ridurre lavoro ripetuto; costo: conversione, qualità, versioni e dati incompleti.

**Limiti:** supportare file con dati non equivale a ricostruirli da un'immagine.
Formati/revisioni, scala, porte e segreti, luci e visione, livelli e passaggi,
controllo del risultato, permessi, duplicati, aggiornamenti, annullamento e rete
richiedono definizione. Non copiare come nostro default la sovrascrittura di
Import Data Foundry. Nessuna importazione universale, generazione AI, lettura di
intere campagne, sincronizzazione esterna, acquisto o obbligo di configurare la
visione automatica. L'intera combinazione deve ancora essere resa verificabile I-113.

**Esito:** Q148 confermata I-167 e raccordo spiegato; Q149 confermata I-168
il 20/09/2026, estensione acquisita in F-013/F-028. Nessuna pagina approvata.

## R146 — scegliere una classe durante l'avanzamento

Verifica documentale del 20/09/2026 per Q150, A2/A3/A5/F-008. Riutilizzati i
confini I-055–I-057 e R044 sui prerequisiti: il multiclasse era ancora aperto.
Nessun account, partita, editor, installazione o prova runtime usati.

- [Larian — Community Update #21](https://baldursgate3.game/news/community-update-21-forging-your-legacy_77),
  12/07/2023, annuncio prima del lancio, senza build precisa: a ogni livello si
  può scegliere una classe differente. Il testo dichiara anche la rimozione dei
  requisiti di caratteristica nel videogioco. È evidenza del percorso previsto
  e di una differenza da conservare, non una fonte delle nostre regole 2024.
- [Larian — Adding Classes and Subclasses](https://docs.baldursgate3.game/Adding_Classes_and_Subclasses),
  documentazione ufficiale del modding consultabile, senza data/versione esposte
  nel testo letto. Quick-Testing descrive il percorso in Game Mode: aprire Level
  Up → Add Class → selezionare una classe → completare l'avanzamento. Mostra
  descrizione e capacità iniziali della classe di esempio. Il comando di debug
  per concedere livelli e la classe fittizia del tutorial non sono requisiti
  del nostro prodotto. Riscontro del comando concreto, non prova dell'interfaccia
  corrente in tutti i dispositivi o verifica runtime del gioco.
- [D&D Beyond — How to Multiclass in D&D for Beginners](https://www.dndbeyond.com/posts/947-how-to-multiclass-in-d-d-for-beginners),
  Saige Ryan, 08/03/2021, guida storica antecedente alle regole 2024. Indica di
  aggiungere una classe dalla pagina Edit Character e descrive un personaggio
  con livelli distinti in più classi. Il testo editoriale è usato come riscontro
  del percorso, non come prova degli attuali controlli, formule 2024 o preferenze
  della comunità; commenti e consigli sulle build non adottati.

**Raccomandazione Q150:** multiclasse guidato nello stesso percorso di avanzamento,
con scelta della classe da aumentare/aggiungere e livelli distinguibili. Il
calcolo visibile segue I-027, la revisione e conferma I-055, la bozza/piano I-056/I-057:
raccordo nostro esplicito, non un'identica sequenza attribuita ai concorrenti.
Alternativa: mantenere le combinazioni attraverso modifiche manuali della scheda.
Beneficio: ridurre conteggi e ricostruzioni del giocatore; costo: progressioni,
competenze, PF/Dadi Vita, magie e risorse con interazioni da definire e verificare.

**Controevidenza e limiti:** BG3 rimuove requisiti che la guida Beyond 2021 descrive.
Non copiare tale regola come default del motore 2024. Requisiti, accordi e deroghe
restano aperti; I-060 riguarda i talenti e non approva ogni bypass. Nessun numero,
formula, ordine dei livelli o limite al catalogo fissato da questa ricerca. Fonti
2024 EN/IT e revisioni dovranno sostenere le singole regole nei percorsi pertinenti.
Homebrew, magie condivise/separate, risorse spese, respec, permessi, salvataggio,
annullamento, accessibilità, EN/IT, rete e integrazione I-113 restano da definire.

**Esito:** Q150 confermata I-169 il 20/09/2026; dettagli aperti, nessuna pagina approvata.
Riscontro aggiuntivo nella guida ufficiale Beyond del 17/10/2024, consultata per
R147: Choose a Class → Add Another Class. Rafforza il percorso già verificato;
non cambia i confini delle regole o approva nuove deroghe.

## R147 — partire da un personaggio pronto e modificarlo

Verifica documentale del 20/09/2026 per Q151, A2/A11/F-008. Riutilizzati R037/R038:
avevano censito i metodi del builder, senza approvarli tutti. La copia I-125
riguarda personaggi già posseduti; la raccolta fornita dall'app è una scelta nuova.

- [D&D Beyond — Character Creation Methods](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193997716-Character-Creation-Methods),
  aggiornato il 24/03/2026, senza build applicativa. Standard offre creazione per
  passi; Premade permette di sfogliare e vedere in anteprima personaggi di vari
  livelli, aggiungerne uno all'account con Claim Character e modificarlo. La guida
  descrive Quickbuilder separatamente come creazione guidata di primo livello;
  non autorizza ad attribuire al flusso attuale tutti i dettagli della vecchia guida.
- [D&D Beyond — How to Create Your First Dungeons & Dragons Character](https://www.dndbeyond.com/posts/1059-how-to-create-your-first-dungeons-dragons),
  Andrew Strother, 17/10/2024. Premade: scegliere un eroe già compilato con capacità,
  background ed equipaggiamento, aggiungerlo all'account e modificarne la scheda.
  La descrizione di Quick Build con specie/classe/nome e di Randomize è datata:
  la guida di assistenza 2026 non elenca Randomize e descrive diversamente
  Quickbuilder. Non dedurre rimozione o identità dell'esperienza attuale.
  Come riscontro aggiuntivo a R146, Choose a Class espone Add Another Class.

**Raccomandazione Q151:** raccolta facoltativa di personaggi pronti come punto di
partenza personale modificabile, accanto alla creazione completa già prevista.
Beneficio: ridurre decisioni iniziali per principianti e partite occasionali;
costo: preparare e mantenere esempi coerenti con regole, fonti e disponibilità.
Alternativa: nessuna raccolta fornita, conservando creazione, importazione e riuso.
L'anteprima e l'aggiunta personale seguono Premade; nomi dei nostri comandi,
pagine, catalogo e criteri di selezione non sono ancora concordati.

**Limiti:** evidenza documentale, nessun account, scheda o gioco provati. Nessun
personaggio, testo o immagine del concorrente scaricato o copiato come nostro
contenuto. Provenienza dei nostri esempi, revisioni 2024 EN/IT, livelli, scelta e
personalizzazione, accordi della campagna, permessi, aggiornamenti, salvataggio,
annullamento e rete rimangono aperti. Nessuna generazione casuale o AI proposta,
nessuna equivalenza fra esempio pronto e build ottimale; I-113 ancora da verificare.

**Esito:** Q151 confermata I-170 il 20/09/2026; catalogo e dettagli in F-008
restano aperti. Nessuna pagina o implementazione approvate.

## R148 — metodi assistiti per i punteggi delle caratteristiche

Verifica documentale del 20/09/2026 per Q152, A2/A3/F-008. Riutilizzati R038/R039
su inserimento e totali manuali, distinti dall'assistenza ai metodi iniziali.
Nessuna prova runtime o creazione di schede.

- [D&D Beyond — How to Create Your First Dungeons & Dragons Character](https://www.dndbeyond.com/posts/1059-how-to-create-your-first-dungeons-dragons),
  Andrew Strother, 17/10/2024: Step 4, Set Your Ability Scores → selettore del
  metodo → Standard Array, Manual/Rolled o Point Buy. Rimanda al metodo indicato
  dal DM; non prova un blocco digitale o autorizzazione a ogni modifica.
- [D&D Beyond — Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections),
  aggiornato il 27/08/2025, nessuna build: Abilities conferma serie standard,
  acquisto a punti e inserimento manuale. Riferimenti storici alla beta altrove
  nella guida non provano lo stato corrente dell'intero builder; i testi
  concordano sull'asse pertinente. Posizione grafica del menu non adottata.
- [Roll20 — 2024 Change Log](https://help.roll20.net/hc/en-us/articles/34086640235927-2024-Change-Log),
  voce del 17/09/2024: Point Buy, Roll e Manual aggiunti a Standard Array nel
  builder 2024. Il builder allora restava beta mentre la scheda ne usciva:
  non attribuire questo stato al prodotto corrente. Evidenza delle opzioni,
  non del gesto preciso di ogni controllo.

**Raccomandazione Q152:** metodi assistiti nella creazione: assegnare una serie
pronta, distribuire un budget di punti, ottenere valori con dadi o inserirli.
Fisici con registrazione, digitali, breakdown e correzioni seguono I-032/I-027/I-028:
non nuova scelta o identica interazione verificata in ogni concorrente. I-054
resta acquisito. Alternativa: solo inserimento con dadi generici disponibili.
Beneficio: meno conteggi esterni; costo: coerenza fra metodo, valori base,
assegnazione, bonus e successive modifiche.

**Limiti:** nessun numero della serie, budget, costo, formula, rilancio, default,
autorità digitale del DM o metodo homebrew deciso. Regole eseguibili richiederanno
fonti 2024 EN/IT e revisioni pertinenti. Il fisico non presume rilevamento del
lancio; registrazione e scarti da definire. Bozza, visibilità, permessi,
salvataggio, annullamento, accessibilità e rete restano aperti. Nessuna generazione
casuale dell'intero personaggio o build ottimale dedotta; integrazione I-113 aperta.

**Esito:** Q152 confermata I-171 il 20/09/2026, dettagli aperti in F-008.
Nessuna pagina o implementazione approvate.

## R149 — dotazione iniziale e acquisti durante la creazione

Verifica documentale del 20/09/2026 per Q153, A2/A7/F-008/F-003. R038 già censiva
Starting Equipment, senza approvare l'intero percorso. Aggiunta diretta I-106
e mercanti I-104 sono acquisiti; un mercante non è necessario per il caso iniziale.

- [D&D Beyond — guida alla prima creazione](https://www.dndbeyond.com/posts/1059-how-to-create-your-first-dungeons-dragons),
  Andrew Strother, 17/10/2024: Step 5, Select Your Starting Equipment presenta
  opzioni secondo la classe, poi Add Starting Equipment.
  [Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections),
  27/08/2025, Equipment consente di saltare la dotazione e aggiungere oggetti
  manualmente. Nessuna build fissata; riferimenti storici alla beta nella guida
  impediscono di trattarla come verifica dell'interfaccia corrente completa.
- [Character Builder (DnD 5e - 2024), catalogo Foundry](https://foundryvtt.com/packages/dnd5e-character-builder),
  modulo terzo di Hammer/Raphael Andrade. La descrizione colloca Starting Equipment
  and Shop nella creazione e documenta budget iniziali, quantità, contenitori,
  restituzioni e monete di classe/background. Catalogo: v0.9.9t per Foundry 14,
  verificato 14; contiene anche 0.9.9w3, senza assumere dall'ordine quale sia
  l'ultima build. Il 6.0.3 esposto sotto Supported Game Systems è del sistema
  D&D5e, non del modulo. Nessuna versione installata o provata. La descrizione
  riguarda equipaggiamento ordinario di primo livello: non dedurre un limite
  equivalente per il nostro prodotto.
- [Actor Studio — README dell'autore](https://github.com/geoidesic/foundryvtt-actor-studio),
  ramo main senza SHA/data di revisione fissati. Dichiara Foundry 12/13 e D&D5e
  3/4/5; Create Actor → scelte → Create Character → avanzamenti → scelta
  equipaggiamento/oro → Equipment Shop per spendere l'oro iniziale.
  [Guida Starting Equipment](https://github.com/geoidesic/foundryvtt-actor-studio/blob/main/docs/player/starting_equipment.md)
  è meno precisa: parla di eventuali opzioni e acquisti anche manuali, senza
  descrivere il negozio del README. Non attribuirle un'interazione verificata
  di carrello o assenza di attriti. Il richiamo a oro spesso tirato non è
  adottato come regola della baseline 2024.

**Raccomandazione Q153:** scelta guidata delle dotazioni disponibili o acquisti
con il budget iniziale previsto, riepilogando oggetti/quantità/monete prima
dell'aggiunta all'inventario. Combinazione esplicita dei riferimenti e di
automazione visibile/correzioni I-027/I-028, non identico percorso attribuito
a ogni prodotto. Alternativa: dotazione e conti determinati fuori dal percorso,
poi inseriti manualmente; l'aggiunta diretta rimane disponibile in entrambi i casi.
Beneficio: ridurre conteggi separati, senza creare un PNG mercante; costo:
coerenza fra scelte, budget, inventario e modifiche della bozza.

**Limiti:** documentazione pubblica, nessun runtime, account, installazione,
scheda o acquisto effettuati. Non adottare i blocchi, default o altre house rule
dei moduli. Fonti/versioni 2024 EN/IT, opzioni classe/background, livelli,
combinazioni dotazione/oro, importi, prezzi, disponibilità/homebrew, quantità,
contenitori, equipaggiamento, scelte modificate, salvataggio, annullamento,
permessi, accessibilità e rete restano da definire. Nessuna somma universale,
oro tirato obbligatorio, auto-equipaggiamento o competenza concessa dall'acquisto.
I-113 rimane aperta; la presenza dei moduli non prova la riuscita dell'insieme.

**Esito:** Q153 confermata I-172 il 20/09/2026; dettagli F-008/F-003 aperti,
nessuna pagina o implementazione approvate.

## R150 — mettere da parte schede senza cancellarle

Verifica documentale del 20/09/2026 per Q154, A1/A2/A12/F-008. La copertura
precedente non aveva deciso l'archiviazione dei personaggi. Nessuna scheda
archiviata, account usato, installazione o prova runtime.

- [Roll20 — Journal](https://help.roll20.net/hc/en-us/articles/360039675133-Journal),
  aggiornato il 20/07/2026, nessuna build. Journal → clic destro sul nome del
  personaggio → Archive Item; il personaggio scompare dalla lista ordinaria
  e si trova nell'Archive in fondo al Journal. Il comando Archive è disponibile
  anche nella modifica della scheda. Il contenitore conserva schede PG e PNG.
  Il testo precisa che gli archiviati vengono ancora caricati all'avvio:
  non usare l'archivio come promessa di minore occupazione o migliori prestazioni.
  Il ripristino è descritto espressamente per gli handout, non con un gesto
  altrettanto preciso nella sezione personaggi. Non fingere una prova di tale UI.
- [Tavern — User Guide](https://how.tavern.works/guide.html),
  nessuna data/versione esposta. Character Cards: i supporting characters
  hanno un comando archive che li sposta in Archived Characters e un comando
  unarchive per riportarli indietro. La guida associa all'archiviazione anche la
  rimozione della pedina: non adottata automaticamente. Il riferimento riguarda
  personaggi secondari, non dimostra la stessa facoltà sui lead characters/PG.
  Non si importa la disposizione grafica del pannello o il modello dei permessi.

**Raccomandazione Q154:** archivio facoltativo per personaggi non più usati,
con scheda consultabile e ripristino nell'elenco ordinario; mantenere appunti
e riferimenti nei permessi già acquisiti. Roll20 verifica l'archiviazione delle
schede PG; Tavern chiarisce il comando inverso su personaggi secondari.
Adattamento esplicito al nostro ciclo del personaggio, non identità universale.
Alternativa: unico elenco senza funzione archivio. Beneficio: ritrovare il
materiale precedente senza affollare l'uso quotidiano; costo: raccordare
elenchi, ricerca, personaggi condivisi e campagna senza perdere collegamenti.

**Confini:** l'esempio di ritiro è ipotetico. Non decidere che morire o ritirarsi
archivi automaticamente, né che ripristinare riporti in vita. Autorità e ambito
personale/condiviso restano aperti; non adottare il possesso GM di Roll20 come
risposta alle nostre questioni sui ruoli. Nessuna rimozione token, revoca o
ampliamento di permessi, cancellazione, immutabilità, capienza illimitata o
ottimizzazione promessa. Consultazione/modifica, incontri, risorse, note,
collegamenti, filtri/ricerca, copie, cancellazione distinta, salvataggio,
annullamento, EN/IT, accessibilità e rete devono essere definiti nei percorsi.
Fonti comunitarie emerse nella ricerca non usate come prova del comportamento;
nessun consenso di mercato o test utente simulato. Integrazione I-113 aperta.

**Esito:** Q154 risolta per delega circoscritta I-173 il 20/09/2026; archivio facoltativo adottato, dettagli F-008 aperti. Nessuna pagina o implementazione approvate.

## R151 — mostrare una scheda fuori dalla campagna

Verifica documentale del 20/09/2026 per Q155, A1/A2/A12/F-008.
La condivisione tramite link della scheda non era decisa. R093 riguardava
l'importazione; I-044–I-048 gli appunti, I-135 lo spettatore invitato e
I-127 il catalogo homebrew: nessuno di questi approva una scheda pubblica.
Nessun account, scheda reale o runtime usati; nessun link generato.

- [D&D Beyond — How to Create Your First Dungeons & Dragons Character](https://www.dndbeyond.com/posts/1059-how-to-create-your-first-dungeons-dragons),
  Andrew Strother, aggiornato da Mike Bernier il 17/10/2024, nessuna build.
  Step 0, Character Privacy: scelta fra personaggio consultabile pubblicamente
  e visibile solo al proprietario. Prova del modello di visibilità, non dei
  campi inclusi o dell'esatto gesto di condivisione oggi.
- [Alchemy — Importing a Character](https://help.alchemyrpg.com/en/articles/9833429-importing-a-character),
  06/09/2024, riutilizza R093. Scheda Beyond → Manage → Character Settings →
  Character Privacy: Public → SHARE in alto → copia del link nella sidebar,
  distinto da URL della pagina e PDF. Documentazione primaria dell'integrazione
  Alchemy, descrizione esterna e datata dell'interfaccia Beyond. Il requisito
  desktop Alchemy v1.1.0+ riguarda l'importazione, non la nostra condivisione.
- [Dungeon Manager — Character Sharing & Portability](https://sitemaps.dungeonmanager.co/help/characters/character-sharing),
  aggiornato il 31/05/2026, nessuna build. Header della scheda → Share →
  Private, Unlisted o Public. Unlisted: consultazione da chi possiede il link;
  Public: personaggio anche elencato nel profilo. Con Unlisted/Public si genera
  un link copiabile a una vista di sola lettura. Journal separato dichiarato
  privato, invisibile a DM e altri giocatori. Prova documentale dei comandi,
  non test del prodotto o garanzia della riservatezza effettiva dei dati.
- **Limite del confronto Beyond:** [Character Header](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193980820-Character-Header),
  aggiornato il 17/09/2025, elenca menu del personaggio e PDF senza descrivere
  Share. Questa omissione non dimostra rimozione del comando, ma non consente
  di spacciare il percorso Alchemy del 2024 per interfaccia corrente verificata.
  Risultati comunitari non usati per chiudere la discrepanza.

**Raccomandazione Q155:** link volontario, non elencato pubblicamente, di
sola lettura alla propria scheda. Il percorso più direttamente documentato è
Share → Unlisted → copia link di Dungeon Manager; Beyond è il precedente
primario di consultabilità esterna. Appunti privati e segreti esclusi per
raccordo con la separazione acquisita nel nostro prodotto, non un nuovo
consenso da richiedere né un'identità di tutti i campi dei concorrenti.
Alternativa: accesso in app tramite persone già autorizzate, esportazione
F-027 per gli esterni. Beneficio: mostrare il personaggio e chiedere un parere
senza invitare in campagna; costo: definire accessi esterni e contenuti visibili.

**Da definire:** autorità su schede condivise, contenuti e anteprima, account
richiesto o meno, inoltro dei link, revoca e sostituzione, dati correnti o
copia datata, archivio/cancellazione/trasferimento, contenuti riservati e diritti,
salvataggio, annullamento, EN/IT, accessibilità, errori e rete.
Non promettere revoca di copie già ottenute. Nessuna galleria pubblica di PG,
controllo del personaggio, commenti, copia tramite link, ricerca di gruppi
o accesso a contenuti a pagamento dedotti. Nessun consenso di mercato o
fattibilità dell'insieme dimostrati; I-113 rimane aperta.

**Esito:** Q155 confermata I-174 il 20/09/2026. La risposta «Sisi, specialmente
se lo fanno gli altri prodotti» trova riscontro nel percorso Dungeon Manager,
ricontrollato nello stesso giorno. Condizione soddisfatta, nessun nuovo sì
richiesto; dettagli F-008 aperti, nessuna pagina o implementazione approvate.

## R152 — spunti selezionabili per personalità e storia

Verifica del 20/09/2026 per Q156, A2/A9/A13/F-008. Le note, il catalogo dei
personaggi pronti e le tabelle casuali erano già trattati; non era deciso
un aiuto narrativo specifico durante la creazione del proprio personaggio.
Nessuna scheda, immagine o contenuto di gioco creati; nessuna prova runtime.

- [D&D Beyond — Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections),
  aggiornato il 27/08/2025, nessuna build. Builder → Background: oltre alla
  scelta del background, Character Details, Physical Characteristics,
  Personal Characteristics e Notes per organizzazioni, alleati, nemici e passato.
  Verifica l'organizzazione narrativa, non pulsanti di estrazione casuale.
- [Roll20 — D&D 5e Charactermancer](https://help.roll20.net/hc/en-us/articles/360039644133-D-D-5e-Charactermancer),
  pagina EN datata 10/11/2021; data diversa da localizzazioni indicizzate.
  Journal → Character Sheet → Charactermancer; per schede esistenti Settings →
  Launch Charactermancer. Background e Bio sono tappe distinte; la descrizione
  fisica Bio è facoltativa. Review → Apply Changes conclude il percorso.
  La guida descrive il builder classico e una sovrascrittura dei dati: non
  adottare questa perdita dei dati o attribuirla al builder 2024 corrente.
- [Roll20 — sorgente della scheda D&D 5th Edition Legacy](https://github.com/Roll20/roll20-character-sheets/blob/93a40a9e6e18d7f21b8f15c98a3b241205854393/DD5thEditionLegacy/5th%20Edition%20Legacy.html#L18106),
  repository ufficiale, revisione 93a40a9e6e18d7f21b8f15c98a3b241205854393,
  ultimo commit sul file verificato via API: 13/03/2026, 17:09:51 UTC.
  Sorgente raw letta, non eseguita né copiata nel progetto. Righe 18106–18148:
  Background espone menu Choose e pulsanti Roll per Personality Traits,
  Ideal, Bond e Flaw, con input testuali per custom background.
  Righe 12753–12784 popolano le scelte dai dati del background; 13513–13522
  applicano il risultato del tiro alla selezione. Prova diretta dei controlli
  del codice Legacy, non della loro disponibilità con ogni fonte o di un
  test dell'interfaccia in produzione.

**Raccomandazione Q156:** spunti facoltativi da scegliere o tirare per
personalità, ideali, legami e difetti, modificabili e affiancati alla storia
libera. Riprendere le scelte/Roll di Roll20 e l'organizzazione narrativa di
Beyond; la libertà di riscrivere anche lo spunto selezionato e rimandare la
compilazione applica I-028/I-058/I-086. Non sostenere che Roll20 offra identico
editing in tutti i contesti. Alternativa: solo campi liberi.
Beneficio: punto di partenza per chi non ha ancora un'idea del personaggio;
costo: raccolte pertinenti, modifiche e raccordo con campagna e segreti.

**Confini:** nessuna imposizione di tratti, quantità o regole 2014 alla baseline 2024. Il background meccanico e la biografia sono distinti; nessun bonus o
ispirazione assegnati leggendo un testo. Raccolte/licenze, homebrew, campi,
pertinenza al background, dadi fisici/digitali I-032 e breakdown I-027,
visibilità, rilanci, bozza, cambio background, legami narrativi, condivisione
I-174, salvataggio, annullamento, EN/IT, accessibilità e rete da definire.
Non approvare un autore AI, dialoghi automatici, questionario obbligatorio
o catalogo copiato da manuali. I-113 aperta, nessuna fattibilità garantita.

**Esito:** Q156 confermata I-175 il 21/09/2026; spunti narrativi facoltativi, dettagli F-008 aperti. Nessuna pagina o implementazione approvate.

## R153 — continuare con lo stesso personaggio in un'altra campagna

Verifica documentale del 21/09/2026 per Q157, A1/A2/A12/F-008/F-006.
Riutilizza i riferimenti di R102, che sosteneva le copie indipendenti I-125:
quel sì non approvava il trasferimento dell'originale. R151 aveva consultato
Dungeon Manager per la condivisione, non per il trasferimento.
Nessun account o runtime usati, nessun personaggio reale consultato/spostato.

- [Roll20 — Roll20 Characters](https://help.roll20.net/hc/en-us/articles/360037258594-Roll20-Characters),
  pagina EN datata 16/02/2024, nessuna build. Per una scheda collegata a una
  partita, Transfer to Game la sposta in un'altra rimuovendola dalla precedente.
  Copy Character crea invece una scheda indipendente; il testo consiglia copie
  per usare il personaggio in più partite contemporaneamente. Remove From Game
  conserva la scheda in Roll20 Characters. Non importare automaticamente
  titolarità del GM, limiti commerciali, sincronizzazione, cancellazione o
  visibilità della cronologia nel nostro prodotto.
- [Dungeon Manager — Character Sharing & Portability](https://sitemaps.dungeonmanager.co/help/characters/character-sharing),
  aggiornato il 31/05/2026, nessuna build. Character Management in fondo alla
  scheda → Transfer to Campaign → selezione della destinazione → Transfer.
  Il testo dichiara conservazione dei dati e cambio dell'associazione alla
  campagna. Non documenta in questo passaggio conflitti, autorizzazioni,
  conversioni di regole o contenuti riservati; non dedurli.
- **Contesto e limite della pagina Roll20 del 2024:**
  [It’s now SIMPLE to get your character out of the VTT](https://blog.roll20.net/posts/its-now-simple-to-get-your-character-out-of-the-vtt/),
  Dean Bigbee, 28/05/2026. Il nuovo Fetch collega la scheda al VTT con
  sincronizzazione; Copy Character produce invece una copia scollegata.
  La parte storica della guida su Import/snapshot non va presentata come
  descrizione universale dell'esperienza corrente. Questo articolo non
  verifica ogni controllo del trasferimento e non approva Fetch per noi.

**Raccomandazione Q157:** trasferimento facoltativo dello stesso personaggio
nella campagna in cui continua a giocare, conservando progressi, inventario
e storia personale. Riprendere la distinzione Transfer/Copy; I-125 rimane
disponibile. Alternativa: solo copie per la nuova campagna.
Beneficio: proseguire con la stessa scheda; costo: risolvere accessi,
contenuti e riferimenti quando cambia il tavolo. La conservazione dei nostri
legami narrativi e permessi è un raccordo da definire, non una capacità
completamente verificata in entrambi i concorrenti.

**Confini:** campagne ammesse e autorità, ingresso/uscita, controllo condiviso,
regole e homebrew diversi, inventario comune, creature collegate, risorse,
note e autori, tracce storiche nella vecchia campagna, link esterno,
archiviazione/cancellazione, annullamento, salvataggio, EN/IT, accessibilità,
errori e offline da definire. Non approvare accesso automatico del nuovo
DM ai segreti, ammissione automatica, cancellazione della storia precedente,
conversioni, fusioni o sincronizzazione fra campagne simultanee.
Nessun limite universale a una campagna deciso, nessuna copia obbligatoria.
I-113 rimane aperta; nessuna promessa di integrazione già risolta.

**Esito:** Q157 risolta per delega circoscritta I-176 il 21/09/2026; trasferimento facoltativo adottato, dettagli F-008/F-006 aperti. Nessuna pagina o implementazione approvate.

## R154 — passaggio di gestione e uscita del creatore della campagna

Verifica documentale del 21/09/2026 per Q158, A1/A8/A12/F-006.
I-037 permette il co-DM per preparazione/conduzione ma esclude l'attribuzione
implicita di proprietà o poteri amministrativi. I-038/I-039 non risolvono
la continuità quando esce il creatore. Nessuna campagna o ruolo modificati.

- [Kanka — Leaving a campaign](https://docs.kanka.io/en/latest/features/campaigns/leaving.html),
  nessuna data di aggiornamento; intestazione documentale 1.0.0, non versione
  dell'app verificata. Settings → Leave campaign: si può uscire quando vi sono
  altri membri, ma non se si è l'unico amministratore. Precedente del mantenere
  almeno un responsabile mentre il creatore lascia; non prova di proprietà unica.
- [Kanka — Removing Admins](https://docs.kanka.io/en/latest/guides/removing-admins.html),
  nessuna data, stessa intestazione documentale. Cita anche il caso di chi ha
  preparato la campagna e la affida al proprio DM. Settings → Roles → ruolo
  admin → rimuovi se stesso → conferma. La rinuncia al ruolo e l'uscita dalla
  campagna sono operazioni distinte. La protezione contro la rimozione di altri
  admin e l'eccezione dei 15 minuti non sono adottate automaticamente per noi.
  Il supporto per account compromessi non decide il caso di assenza/inattività.
- [Roll20 — Transferring Game Ownership](https://help.roll20.net/hc/en-us/articles/30963241719575-Transferring-Game-Ownership),
  datato 27/03/2025, nessuna build. Il creatore/proprietario attuale raccoglie
  link della partita e profilo del destinatario, poi usa Game Transfer Request.
  Richieste da altri non ammesse. Verifica la possibilità e l'autorità del
  titolare attuale, ma è un passaggio tramite assistenza, non un controllo
  autonomo della campagna. Non contattata l'assistenza né aperta una richiesta.

**Raccomandazione Q158:** passaggio volontario della gestione a un altro
membro e uscita del creatore, continuando nella stessa campagna. Seguire
l'autonomia documentata in Kanka; Roll20 è un riscontro della possibilità
con un percorso diverso. L'adattamento al nostro prodotto non fissa il
numero di amministratori o confonde il ruolo DM con proprietà amministrativa.
Alternativa: soli co-DM di conduzione, responsabilità amministrativa legata
al creatore. Beneficio: il gruppo prosegue anche quando il creatore lascia;
costo: definire passaggio di poteri, accessi e continuità dei contenuti.

**Limiti:** documentazione pubblica, nessun test runtime o account utilizzato.
La sopravvivenza di tutti i nostri riferimenti, schede, permessi e diario va
specificata, non è dimostrata dalla presenza della funzione nei concorrenti.
Presa in carico del successore, destinatari idonei, ruoli prima/dopo, ultimo
responsabile, uscita/reingresso, note personali, contenuti condivisi, proprietà
delle schede, homebrew, cronologia, inviti, link, archivio/cancellazione,
annullamento, salvataggio, EN/IT, accessibilità, errori e rete rimangono aperti.
Nessun trasferimento di account, licenze o abbonamenti; nessun subentro per
inattività, espulsione del creatore o accesso agli appunti Solo io approvati.
Il caso di creatore irraggiungibile rimane distinto. I-113 resta aperta.

**Esito:** Q158 risolta per delega circoscritta I-177 il 21/09/2026; passaggio volontario della gestione adottato, dettagli F-006 aperti. Nessuna pagina o implementazione approvate.

## R155 — backup e recupero di uno stato precedente della campagna

Verifica documentale del 21/09/2026 per Q159, A12/A8/A1/F-061.
Fonti primarie; nessuna prova runtime, accesso a campagne o ripristino reale.

- **Foundry, [Backups and Snapshots](https://foundryvtt.com/article/backups/):**
  articolo senza data/versione editoriale; funzionalità indicate da 11.311,
  con possibili differenze presso gli hosting. Percorso: Setup → clic destro
  sul World → Take Backup; Restore Latest oppure Manage Backups per una
  versione precedente. Sono disponibili nota facoltativa, dimensione e
  informazioni di compatibilità. Limite: i contenuti esterni alle cartelle
  dei pacchetti, comprese immagini e suoni, non sono inclusi.
- **Foundry, [14.366 — Version 14 Stable 8](https://foundryvtt.com/releases/14.366),
  14/08/2026:** prima del ripristino viene proposta la creazione di un backup
  dello stato corrente. È una scelta offerta, non una protezione automatica
  universale. Precedente da valutare nel futuro percorso di conferma.
- **Roll20, [Game Details Page (GM Only)](https://help.roll20.net/hc/en-us/articles/29620064514071-Game-Details-Page-GM-Only),
  28/10/2025:** Game Details → Settings → Roll Back Game → data → Rollback →
  indicazione di completamento. Richiede il creatore Pro; stati giornalieri
  conservati sette giorni. Il documento descrive il ripristino come non
  annullabile, pur consentendo di scegliere poi un altro stato disponibile.
  Non prova la creazione manuale di backup a richiesta.

**Raccomandazione Q159:** funzione facoltativa per creare punti di recupero
e ripristinarli nell'app; creazione volontaria ispirata a Foundry. Il bisogno
di recupero ha precedenti pertinenti in entrambi i prodotti, ma non un percorso
identico. La proposta resta distinta dall'esportazione F-027/I-115,
dall'importazione F-028/I-116, dal riuso di avventure F-038 e dal riavvolgimento
di eventi durante il gioco I-029. Non dedurre che le approvazioni precedenti
comprendessero un ripristino della campagna.

**Adattamento e limiti:** la nostra copertura va definita esplicitamente
prima di usare la parola «completo»; media, schede personali, note private,
homebrew e riferimenti richiedono un contratto coerente. Non adottare per
analogia abbonamenti Pro, conservazione di sette giorni, cancellazione dello
stato attuale senza recupero, gestione del software Foundry, spazio illimitato
o nuovi servizi cloud. Permessi, ripristino in sede/copia, preavviso al gruppo,
protezione del presente, annullamento, conflitti ed errori rimangono domande
di percorso, senza moltiplicare ora le domande sul principio generale.
I-113 rimane aperta: documentazione di funzioni separate non prova la
fattibilità o la semplicità dell'insieme in d20 Studio.

**Esito:** Q159 confermata I-178 il 21/09/2026; backup ripristinabili adottati, dettagli F-061 aperti. Nessuna pagina o implementazione approvate.

## R156 — ricerca trasversale nei contenuti di gioco e campagna

Verifica documentale del 21/09/2026 per Q160, A9/A10/A8/A3/A12/F-062.
Fonti primarie; nessuna prova runtime, installazione o accesso a dati privati.

- **[Quick Insert — Search Widget](https://foundryvtt.com/packages/quick-insert):**
  modulo di terzi di Sunspots, non funzionalità di base Foundry. Versione
  elencata 3.7.8, Foundry 13.341+, verificata 14.364; data precisa di
  pubblicazione non verificata. Percorso documentato: Ctrl+Space → testo →
  risultati → scelta con mouse o tastiera; filtri disponibili. Cerca
  personaggi, oggetti e incantesimi e offre anche azioni contestuali.
  Inserimento, macro e cambio scena non vengono proposti da Q160.
- **Kanka, [Search](https://docs.kanka.io/en/latest/features/search.html):**
  documentazione senza data editoriale; intestazione 1.0.0 del sito, non
  versione verificata dell'app. Campo presente sulle pagine, Ctrl+K,
  ricerca per nome; comando everywhere per estendere ai testi.
  La pagina aperta aggiornata differisce dallo snippet indicizzato che
  descriveva clic su immagine/nome: non adottare quel dettaglio come attuale.
- **Kanka, [Full-text search](https://docs.kanka.io/en/latest/advanced/fulltext-search.html):**
  dal pannello di ricerca → everywhere → risultati collegati alle voci,
  termine evidenziato e filtro per categoria. Il documento indica fino
  a dieci risultati, ordinati per rilevanza. Tale limite non è un requisito
  del nostro prodotto, e non prova il comportamento a runtime.

**Raccomandazione Q160:** un unico accesso per cercare e aprire contenuti
di categorie diverse; navigazione e ricerche delle singole sezioni conservate.
Esempio nostro: trovare un luogo e gli appunti pertinenti, poi consultare
un incantesimo dallo stesso accesso. Combinare campagna e biblioteca è un
adattamento alla direzione già scelta, non una capacità identica verificata
in Kanka e Quick Insert. Campi, categorie e ampiezza della ricerca devono
essere definiti senza promettere che ogni parola di ogni contenuto sia
sempre ricercabile. Il precedente pertinente è l'accesso trasversale.

**Confini e integrazione:** I-099/I-126 avevano approvato archivio del mondo
e consultazione autonoma, non questo punto unico di accesso. La ricerca
rispetta le autorizzazioni già definite: titoli, anteprime e risultati non
devono rivelare contenuti altrimenti inaccessibili; non attribuire al DM
gli appunti Solo io. Questo è un vincolo del nostro contratto, non una
verifica esaustiva del modello di permessi dei prodotti citati.
Consultazione e abilitazione/acquisizione restano distinte I-066/I-126.
Nessuna AI, azione eseguita dalla ricerca, scorciatoia precisa, layout,
ricerca web, intera libreria commerciale o visibilità fra campagne
dedotti. Prestazioni, accessibilità, EN/IT e offline da definire;
I-113 aperta, nessuna garanzia di integrazione basata sulla sola parità.

**Esito:** Q160 confermata I-179 il 21/09/2026; ricerca unica adottata, dettagli F-062 aperti. Nessuna pagina o implementazione approvate.

## R157 — trovare un gruppo mediante annunci e candidature

Verifica documentale del 21/09/2026 per Q161, A1/A11/A12/F-063.
Fonti primarie; nessuna prova runtime, annuncio, candidatura o messaggio inviati.

- **Roll20, [Using Our Looking for Group Tool](https://help.roll20.net/hc/en-us/articles/360037774473-Using-Our-Looking-for-Group-Tool),
  17/11/2025:** Game Details → Looking for Players → Manage Listing →
  Create LFG Listing; disattivazione con Disable Listing. Per chi cerca:
  Join A Game → filtri → annuncio → Listing Discussion per chiedere
  di partecipare; invito dal pulsante accanto al candidato. La discussione
  dell'annuncio è pubblica e distinta dal forum privato del gruppo.
  I Pick Up Games con ingresso immediato sono una modalità separata,
  non attiva per ogni annuncio e non proposta qui.
- **Kanka, [Applications](https://docs.kanka.io/en/latest/features/campaigns/applications.html):**
  Settings → Applications per apertura/chiusura e valutazione;
  dashboard → Apply per candidatura modificabile/ritirabile. Il messaggio
  è visibile agli amministratori, che approvano o rifiutano. Campagne
  aperte alle candidature ricercabili nell'elenco pubblico.
- **Kanka, [Apply to an open campaign](https://docs.kanka.io/en/latest/features/campaigns/join.html):**
  elenco pubblico → campagna → Apply → modulo → Apply; stato in attesa,
  accettato o rifiutato. La guida descrive disponibilità, esperienza
  e preferenze; tali campi non sono già il nostro modulo approvato.
  Entrambe le pagine Kanka non indicano una data editoriale; 1.0.0
  è l'intestazione del sito documentale, non versione verificata dell'app.

**Raccomandazione Q161:** pubblicazione volontaria di un annuncio di
campagna, reperibile da chi cerca un gruppo, e candidatura valutata prima
dell'ingresso. Si segue Roll20 per la scoperta e l'attivazione facoltativa,
Kanka per la richiesta rivolta ai responsabili. Le due modalità di
comunicazione differiscono; non attribuire a Roll20 una candidatura
necessariamente privata. Non adottare ingresso immediato, forum pubblico
obbligatorio, catalogo di persone o matchmaking automatico.
La presentazione pubblica separata dai contenuti privati della campagna
è il nostro raccordo con i permessi già stabiliti.

**Perché è una domanda nuova:** I-001 permette a gruppi esterni di creare
campagne e invitare persone; non aveva deciso di aiutarli a conoscersi.
Questo amplia il contesto d'uso a persone senza gruppo e campagne che
cercano membri. Inviti semplici sempre disponibili; nessuna pubblicazione
automatica del gruppo dell'owner. L'intenzione iniziale di non pubblicizzare
l'app non equivale a esclusione o approvazione di una funzione futura.

**Costo e confini:** servono scelte su autorità, annunci visibili,
candidature, segnalazioni, blocchi, privacy e moderazione. I-128 sulla
moderazione homebrew non risolve automaticamente queste responsabilità.
Nessuna conversazione esterna, account pubblico obbligatorio, spesa,
pagamento per sessioni, verifica d'identità, profilazione o promessa
di trovare compagni approvati. I-113 aperta: il precedente documentato
non prova costi, fattibilità o semplicità dell'insieme.

**Esito dopo I-180:** Q161 resta eccezione di scopo, senza bloccare la definizione autonoma. Nessuna bacheca, pagina o implementazione approvate.

## R158 — primo blocco autonomo dopo I-180

Verifica documentale del 21/09/2026 per I-181–I-185; nessun runtime o codice.

- **[Foundry dnd5e 6.0.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-6.0.0):**
  tag release-6.0.0, commit abbreviato 2e913fb, 10/09/2026, Foundry 14.
  Documenta risultati e correzioni dei danni per bersaglio, scelta della
  migliore formula CA valida, scadenze rispetto a turni specifici e
  descrizione/cambiamenti degli effetti espandibili nella scheda.
- **[Nik's DnD5e Tweaks, README](https://github.com/nschoenwald/niks-dnd5e-tweaks):**
  main consultato senza fissare revisione immutabile; compatibilità dichiarata
  Foundry 14/dnd5e 6.0.0. Modulo di terzi con tiro di concentrazione automatico
  opzionale e comando per terminarla. Il nostro percorso conserva fisico
  e digitale: non importiamo il suo default. Il catalogo rimanda al README;
  non usare lo snippet indicizzato precedente come prova della versione.
- **Regole D&D 2024, [Playing the Game](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game)
  e [Rules Glossary](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary):**
  una sola formula base CA; concentrazione con cause e tiri specifici.
  Il glossario include un tetto alla CD non esplicitato nel riepilogo del
  modulo: la fonte normativa prevale. Revisione immutabile e casi numerici
  del futuro motore da fissare prima dell'implementazione.
- **[Kanka full-text search](https://docs.kanka.io/en/latest/advanced/fulltext-search.html):**
  R156 riletto: filtro categoria e termine evidenziato. Non adottati i dieci
  risultati massimi; ritorno con ricerca conservata è adattamento dichiarato.
- **[Foundry Backups](https://foundryvtt.com/article/backups/)
  e [14.366, 14/08/2026](https://foundryvtt.com/releases/14.366):**
  R155 riletto: selezione dei backup e offerta di salvare lo stato attuale
  prima del recupero. Non prova copertura universale dei media esterni.

**Esito:** I-181–I-185 adottate su delega; percorsi in DELEGATED. Nessun
nuovo Q ordinario, domanda proprietario solo per vere eccezioni.
Fonti pubblicate distinte da uso osservato; I-113 e D-012 aperti.

## R159 — chi sceglie le mosse dei nemici

Verifica documentale del 21/09/2026 per Q162 e I-186, F-001/A4/A8.
Fonti primarie pubblicate; nessuna installazione, acquisto o prova runtime.

- **[Foundry — Combat Encounters](https://foundryvtt.com/article/combat/):**
  guida corrente senza data/revisione immutabile esposta. Il GM seleziona
  partecipanti, avvia lo scontro e gestisce i turni dei PNG. I giocatori possono
  concludere i propri turni. È il precedente per la conduzione umana assistita,
  non una prova che ogni estensione Foundry escluda decisioni automatiche.
- **[Smart Combat NPC](https://foundryvtt.com/packages/smart-combat-npc):**
  scheda dell'editore AtranonStudios nel catalogo Foundry. Modulo 1.0.0,
  Foundry 13–14, verificato 14; data relativa mostrata: un mese e due settimane.
  Il 6.0.3 indicato sotto Supported Game Systems appartiene a D&D5e, non al modulo.
  Dichiara selezione del bersaglio, movimento e attacchi automatici, configurati
  per singola pedina. Accesso: selezionare pedina, comando Robot, impostazioni.
  Documenta limiti di preparazione: zone impraticabili richiedono muri e
  impostazioni incoerenti possono produrre comportamenti inattesi. Collegamento
  commerciale all'editore; non adottati acquisto, codice o dipendenze. Documentazione
  tecnica collegata non letta; affidabilità e compatibilità reale non verificate.
- **[Larian — Patch 7](https://baldursgate3.game/news/patch-7-now-live_121):**
  note della Patch 7, comportamento pubblicato e datato per versione, non
  osservazione della build corrente. Descrivono scelte contestuali dei nemici
  e correzioni al percorso dell'AI. BG3 comprende quindi decisioni delle
  creature, oltre ai calcoli conseguenti alle mosse umane.
- **[Larian — Combat & stealth](https://baldursgate3.game/news/a-little-about-combat-stealth_3):**
  07/08/2020, fonte storica già conservata in R141. Riletta per distinguere
  esplorazione, turni facoltativi e combattimento. Non trasferisce automaticamente
  al prodotto simultaneità, sorpresa, pattuglie o regole del videogioco.

**Corrispondenza:** le fonti documentano sia conduzione umana sia delega
tattica per creature. Non dimostrano consenso universale, semplicità della
combinazione o equivalenza fra modulo, nucleo Foundry e BG3.

**Raccomandazione proposta in Q162:** controllo manuale normale, con delega
tattica facoltativa per PNG scelti dal DM, revocabile. Si riprende la
granularità per pedina del modulo; controllo, correzione, dadi fisici e
limiti informativi derivano dai nostri requisiti. Motivo: alleggerire le
creature secondarie mantenendo conduzione del DM. Estendere la delega
dalla risoluzione alle scelte di gioco è una decisione sostanziale di
autorità; I-180 richiede l'owner. La presenza del precedente non la risolve.
Nessuna funzione adottata prima della risposta.

## R160 — dai requisiti al prodotto con agenti AI

Ricerca estensiva mirata del 21/09/2026, richiesta I-188. Rapporto completo:
[AGENT_DELIVERY_RESEARCH](AGENT_DELIVERY_RESEARCH.md), con registro S01–S15,
URL, date, natura delle prove, limiti e applicazione proposta al progetto.

Quindici fonti: OpenAI, Anthropic, Spec Kit, OpenSpec, Kiro, esperienza critica
di Birgitta Böckeler, due ricerche METR, Playwright, Storybook e due studi
empirici sui file AGENTS consultati soltanto a livello di abstract/metadata.
Distinguere documentazione, resoconti dei fornitori, opinioni e studi; nessun
benchmark riprodotto o confronto completo di tutti gli strumenti esistenti.

**Sintesi applicata:** decisione → esperienza → criterio di riuscita → prova.
Contesto mirato, compiti delimitati, prove di esito e revisione distinta;
più testo o più agenti non dimostrano maggiore affidabilità. Risultati misti
sui file di contesto e limiti metodologici delle misure di produttività
impediscono promesse generali di velocità o assenza di errori.

**Percorso proposto:** pagine concettuali adesso, contratto completo approvato,
direzione visiva autorizzata, prove mirate, incrementi funzionanti e rilascio
con i gate già vigenti. Conservare WORKFLOW e skill; nessuna installazione,
nuova orchestrazione, spesa, modello, mock, prototipo o codice introdotti.

## R161 — scena, pannelli e controlli per la partita

Verifica documentale del 21/09/2026 per I-188/Q163. Due fonti ufficiali:

- [Foundry, Player Orientation](https://foundryvtt.com/article/player-orientation/):
  scena, sidebar, accesso alla scheda dall'elenco degli attori, controlli della
  pedina e macro hotbar. Dimostra la convivenza di scena e accessi al dettaglio,
  non una prova che il nostro default esatto sia già quello del prodotto.
- [Owlbear Rodeo, Getting Started per le estensioni](https://docs.owlbear.rodeo/extensions/getting-started/):
  documenta action/popover, context menu, toolbar e strumenti della scena.
  È documentazione delle superfici UI disponibili alle estensioni; non una
  prova runtime della disposizione o della comprensibilità per utenti inesperti.

**Accesso e limiti:** documenti correnti senza revisione immutabile o versione
puntuale del client registrata. Nessuna sessione di gioco, screenshot o test
umano eseguiti. Le fonti sostengono pattern di accesso contestuale e dettaglio;
non certificano ogni comportamento proposto né la nostra usabilità.

**Raccomandazione Q163:** scena protagonista, risorse/azioni essenziali sempre
accessibili, dettaglio apribile e fissabile. È un adattamento dichiarato dei
pattern alla preferenza dell'owner per laptop, BG3 e semplicità. Alternativa
reale: più pannelli affiancati già all'ingresso, con meno spazio per la scena.
La scelta riguarda il default; entrambe conservano accesso alla scheda e
possibilità di consultare i contenuti. Nessun colore o layout finale approvato.

## R162 — avvio e conclusione dello scontro

Verifica del 21/09/2026 per I-192. Documentazione, non prova in una partita reale.

- [Foundry, Combat Encounters](https://foundryvtt.com/article/combat/): separa
  partecipanti preparati, iniziativa, avvio, turni e conclusione. Permette di
  nascondere combattenti ai giocatori, modificare l'iniziativa e concludere il
  proprio turno quando si controlla la pedina corrente. «End Combat» cancella
  l'incontro dal tracker; la guida lo descrive come irreversibile e richiede
  conferma. Pagina corrente, versione precisa del client non registrata.
- [D&D Beyond, Playing the Game 2024](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game):
  riscontro ufficiale del ciclo posizioni → iniziativa → turni. Il combattimento
  può finire anche con resa o fuga; non dipende soltanto dai PF.
- **Fonte normativa immutabile:** `srd`, edizione `2024`, revisione `5.2.1`,
  [SRD EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf),
  pp. 13–14; [SRD IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf),
  pp. 14–15. Copie locali già raccolte, hash riverificati:
  EN `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`;
  IT `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.
  Iniziativa come prova di Destrezza; gruppo di creature identiche con un tiro
  del DM; sorpresa come svantaggio all'iniziativa. Parità tra PG ai giocatori,
  tra mostri o PG/mostro al DM. Ordine conservato tra round.

**Esempi di controllo:** creatura sorpresa → svantaggio all'iniziativa, non
salto automatico del primo turno; due PG pari → scelta dell'ordine fra loro;
resa → il DM può concludere anche con avversari ancora vivi.

**Sintesi adottata:** flusso di Foundry con richieste fisiche/digitali già
concordate e cronologia conservata. Non copiare la cancellazione del tracker
come cancellazione della storia. Questo adattamento risponde alle decisioni
precedenti; non è attribuito al comportamento di Foundry. Interazioni precise,
usabilità, concorrenza e affidabilità non sono dimostrate dalle fonti.

## R163 — turni di esplorazione, passaggi e preview sul tavolo

Verifica documentale del 21/09/2026 per I-194, F-001/F-060, A4/A6.
Cinque pagine primarie consultate pubblicamente; nessuna installazione,
sessione dei prodotti, acquisto, prova runtime o test con persone.

- [Larian — ForceTurnBasedMode, revisione 2055](https://docs.baldursgate3.game/index.php?title=ForceTurnBasedMode&oldid=2055):
  documentazione tecnica del sito ufficiale, senza data di pubblicazione
  o build del gioco esposta. La pagina corrente consultata rinvia a questa
  revisione. Descrive la creazione/rimozione di una zona di turni attorno
  a un personaggio, comprendendo creature e oggetti vicini; l'esempio
  distingue stato di combattimento e turni forzati. Non documenta il nostro
  controllo DM, una UI completa o l'ordine preciso dei turni.
- [Larian — Patch 8](https://baldursgate3.game/news/the-final-patch-new-subclasses-photo-mode-and-cross-play_138),
  15/04/2025: distingue combattimento e Turn-Based Mode nel comando
  controller «Move To» e corregge un consumo di movimento all'ingresso.
  Conferma pubblicata dopo il lancio; non prova la build corrente né autorizza
  a importare iniziativa, sorpresa o recuperi BG3 nelle regole 2024.
- [Foundry — Mindful Encounters](https://foundryvtt.com/packages/mindful-encounters),
  editore 3 Death Saves, modulo 1.3.2, Foundry 14+, verificato 14.367.
  Il catalogo consultato mostra aggiornamento relativo di due giorni e
  sedici ore; non ricavarne una data assoluta più precisa. Descrive turni
  d'esplorazione simultanei senza iniziativa, Done per partecipante,
  inclusione/esclusione e avanzamento manuale del GM. Quando tutti hanno
  finito il modulo avanza il tempo configurato e ripristina i suoi budget;
  si sospende durante il combattimento. È un'estensione a pagamento,
  non una funzione Foundry core. Nessun acquisto o dipendenza introdotti.
- [Foundry — Combat Encounters](https://foundryvtt.com/article/combat/):
  guida corrente senza data o versione puntuale esposte, riletta per il
  passaggio partecipanti → iniziativa → avvio e per Fine turno/conclusione.
  Il GM può modificare ordine e visibilità; il controllore corrente conclude
  il proprio turno. Il tracker serve anche per incontri non bellici.
  Non dimostra un passaggio automatico fra le nostre tre modalità.
- [Foundry — Measurement and Templates](https://foundryvtt.com/article/measurement/):
  guida corrente che identifica i comandi di movimento descritti con V13,
  senza una build più precisa. Distingue distanza e costo di movimento;
  documenta tappe, conferma/cancellazione e movimento nascosto con Alt.
  Le sagome d'area si collocano, spostano e orientano sulla scena.
  Non dimostra da sola una mossa unica movimento+attacco, preview privata
  di qualsiasi azione o consumo automatico della capacità associata.

**Sintesi adottata I-194:** round comuni d'esplorazione senza iniziativa,
partecipanti controllati dal DM e «Finito» individuale. L'avanzamento normale
esplicito del DM, al posto del passaggio automatico quando tutti hanno finito,
è un nostro adattamento: mantiene arbitraggio sul tempo della finzione e sulle
azioni pendenti. La durata precisa e i conflitti simultanei restano aperti.
I budget e i recuperi del modulo non sono adottati. Per iniziare uno scontro
si applicano I-192 e la baseline immutabile R162, conservando quanto accaduto
e senza eseguire le preview in attesa. La conclusione preserva storia ed
effetti secondo le nostre decisioni, invece di copiare la cancellazione
dell'incontro Foundry.

**Preview nella visita:** azione scelta, bersaglio/destinazione e percorso
con costo restano distinguibili dall'esecuzione. La composizione segue le
decisioni già acquisite I-009–I-016; le fonti sostengono parti del pattern,
non dimostrano tutta la combinazione. Le aree hanno un precedente per
posizionamento/orientamento, ma la loro grammatica completa resta da definire.

**Limiti:** comportamento pubblicato distinto da uso osservato; nessuna
affermazione di superiorità o prova di usabilità. Gruppi separati, interruzioni,
rete e capacità sui confini temporali richiedono ulteriore specifica.

## R164 — movimento dei PNG, misura durante il gesto e tappe

21/09/2026. Ricerca primaria documentale, senza partita o prova runtime dei concorrenti.
Sostiene I-196 e [TABLE_MOVEMENT](TABLE_MOVEMENT.md).

- [Foundry Measurement](https://foundryvtt.com/article/measurement/), testo V13:
  percorso misurato, distanza e costo distinti, tappe, quota e movimento nascosto.
  Il percorso preparato con CTRL si esegue con un clic finale sulla destinazione;
  non dimostra regole D&D complete, rimborsi o ricerca automatica del tragitto.
- [Foundry Controls](https://foundryvtt.com/article/controls/), intestazione
  13.350 del 20/10/2025: selezione, selezione multipla e drag-and-drop.
  Scorciatoie e incrementi di quota non concordano ovunque con Measurement:
  non fissarli come contratto senza prova. Undo sul canvas non è rewind dello scontro.
- [Foundry Tokens](https://foundryvtt.com/article/tokens/), pagina senza revisione
  immutabile fissata: controllo dei token, selezione multipla e dati distinti.
  La descrizione del righello conserva indicazioni che Measurement attribuisce a V12.
- [Owlbear Measure](https://docs.owlbear.rodeo/docs/measure/), build non dichiarata:
  righello durante il trascinamento del personaggio, rimosso al termine;
  misura autonoma e permanente. Non documenta una seconda conferma ordinaria,
  costi D&D automatici, collisioni o tappe equivalenti a Foundry.
- [Owlbear 2.0 Beta Patch 6](https://blog.owlbear.rodeo/owlbear-rodeo-2-0-beta-patch-6/),
  17/11/2022: righello nascosto insieme al personaggio. Precedente storico pubblicato,
  non verifica dell'attuale implementazione o prova di tutte le nostre regole di segretezza.

**Adattamento adottato:** drag con misura e rilascio che esegue; percorso a tappe
facoltativo con comando finale distinto. L'alternativa senza trascinamento,
la preview privata, i controlli di autorità e la continuità I-042 raccordano
questi precedenti con i requisiti acquisiti. Selezione multipla non significa
formazione intelligente né movimento concorrente già risolto. La normale
conduzione manuale non autorizza implicitamente a ignorare le regole.

## R165 — sagome, azioni e regole dell'esempio Mani brucianti

21/09/2026. Fonti primarie documentali, senza test runtime dei concorrenti.
Sostiene I-197 e [TABLE_ACTIONS](TABLE_ACTIONS.md).

- [Foundry Measurement](https://foundryvtt.com/article/measurement/), testo V13:
  sagome posizionabili e orientabili, regolazione fine e caselle evidenziate.
  La geometria del core non è di per sé la regola D&D né prova preview privata,
  individuazione autorizzata dei bersagli o automazione di tutti gli effetti.
- Wiki ufficiale DnD5e: [Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities),
  [Save](https://github.com/foundryvtt/dnd5e/wiki/Activity-Type-Save),
  [Use](https://github.com/foundryvtt/dnd5e/wiki/Activity-Type-Utility).
  Dichiarate allineate a 6.0.0, aggiornate il 10/09/2026; SHA wiki non fissato.
  Distinguono attivazione, consumo, gittata, bersagli/area, TS/CD e attività senza
  tiro obbligatorio. «Damage on Save» è descritto come informativo: non usarlo
  per attestare applicazione automatica dei danni per creatura.
- Fonte normativa `srd`, edizione `2024`, revisione immutabile `5.2.1`:
  [PDF EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf)
  e [PDF IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf).
  Hash locali riverificati come R162: EN
  `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`, IT
  `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.
  Mani brucianti EN p.114 / IT p.163; origine da sé EN p.105 / IT p.120;
  aree/coni EN pp.177/179 / IT pp.203/206; danno comune e metà per difetto
  EN p.16 / IT p.18. Schivata e Disimpegno EN pp.180–181 / IT pp.215/207;
  Scatto IT p.214. Nomi ufficiali distinti dai verbi dei pulsanti.

**Regole verificate:** Mani brucianti usa un'azione, componenti V/S, cono da sé
di 15 piedi/4,5 m, TS Destrezza, 3d6 fuoco o metà; +1d6 per livello aggiuntivo
dello slot. Incendia oggetti infiammabili non indossati/trasportati. Il cono
esclude normalmente l'origine salvo scelta del creatore; la sua larghezza
cresce con la distanza. La copertura totale che blocca tutte le linee dall'origine
esclude dall'area. Non ricavare da ciò una soglia arbitraria per intersezioni parziali.

**Fixture illustrativa:** CD 14; danni 4+4+3=11; TS 8+2=10 e 14+2=16,
rispettivamente 11 e 5 danni. Doran, se incluso, resta pendente; risposta fisica
12+1=13, 11 danni. Tutti dati sintetici e tiri condivisi per l'esempio, senza
copertura, resistenza, reazione pertinente o oggetti infiammabili. Il caso
non approva la stessa visibilità per qualsiasi tiro del prodotto.

**Adattamenti e limiti:** elenco delle creature note, avviso sull'alleato,
conferma unica, attese e conservazione dei risultati applicano le decisioni
già acquisite; non attribuirli integralmente al core Foundry. Le azioni senza
bersaglio saltano passaggi artificiali, conservando i diversi consumi. Restano
aperti geometria sui bordi, elevazione, reazioni, consumo nelle eccezioni
(incluso Controincantesimo 2024), input fisico non registrato e concorrenza.

## R166 — manipolazione diretta e navigazione della vista

22/09/2026. Verifica documentale primaria per I-198/I-199, senza prova runtime
dei prodotti o nuova verifica delle regole normative già conservate in R165.

- [Owlbear, Getting Started](https://docs.owlbear.rodeo/docs/getting-started/),
  guida corrente senza build: spostare i goblin nella scena mediante drag-and-drop.
  [Measure](https://docs.owlbear.rodeo/docs/measure/) documenta misura durante
  il movimento, rimossa al termine, e diversi metodi di distanza configurabili.
  Non documenta destinazioni fisse, conferme doppie o il nostro consumo D&D.
- [Foundry, Game Controls](https://foundryvtt.com/article/controls/), intestazione
  13.350, 20/10/2025: trascinamento destro per muovere la vista, rotella per zoom;
  trascinamento sinistro e rilascio per gli oggetti controllati. Contiene anche
  comandi di tastiera per movimento, vista e zoom. Le discrepanze del righello
  già rilevate in R164 restano; non fissare tutte le scorciatoie per deduzione.
- [Foundry, Measurement](https://foundryvtt.com/article/measurement/), testo V13:
  collocazione delle sagome sulla scena, trascinamento e rotazione continua/fine.
  Il gesto documentato per ruotare una sagoma esistente usa modificatore e rotella;
  puntare il cono direttamente verso il cursore è il nostro raccordo con I-197,
  non un comportamento identico attestato da quella pagina.

**Adottato su delega:** indicazione libera delle posizioni e delle direzioni,
misura contestuale e consultazione della vista distinta dalle mosse. L'esempio
propone alternative visibili e tastiera; non prova la stessa interazione su
ogni dispositivo o la politica finale di focus/trackpad. La documentazione
dei concorrenti sostiene i gesti, non dimostra bellezza finale o usabilità
del nostro raccordo. Il nuovo confronto esplicita cosa può valutare l'owner.

## R167 — percorso oltre il movimento disponibile: colore e arresto sono distinti

22/09/2026. Fonti primarie documentali; nessun test runtime dei concorrenti.
Sostiene I-200/I-201. Separare la prova della preview dalla prova dell'esecuzione.

- [DnD5e per Foundry 5.1.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-5.1.0),
  13/08/2025, Foundry 13+: righello verde entro la velocità, giallo per Scattare,
  rosso oltre. [Codice immutabile](https://github.com/foundryvtt/dnd5e/blob/8bc7100e7a6f83ef5820d60c3939c065fe021368/module/canvas/ruler.mjs#L86-L108)
  confronta costo e velocità per lo stile. Non prova cosa faccia il rilascio.
- [Mindful Encounters](https://foundryvtt.com/packages/mindful-encounters),
  catalogo corrente 1.3.2, Foundry 14+, verificato 14.367: distingue Veto
  (rifiuta tutta la mossa eccessiva) da Clamp (percorre quanto consente il budget,
  fermandosi sulla griglia). È un modulo a pagamento di terzi per esplorazione
  a turni, che si sospende durante il combattimento: precedente del gesto,
  non automazione D&D in combattimento già dimostrata. Il sito non specifica
  l'esatto gesto clic/rilascio. Non sono stati acquistati o installati componenti.
- [Drag Ruler, README](https://github.com/manuelVo/foundryvtt-drag-ruler):
  segmentazione verde/giallo/rosso e supporto senza griglia; nessuna prova
  del comportamento al rilascio. Compatibilità dichiarata fino a V12 con avvertenze,
  non riferimento a una build corrente verificata interattivamente.
- [Crucible 0.9.0](https://github.com/foundryvtt/crucible/releases/tag/release-0.9.0),
  14/03/2026: pianificazione limitata alla portata dell'azione; non è prova del
  clic oltre limite seguito da movimento parziale. Regole distinte da D&D.
- [Solasta Winter Update](https://www.solasta-game.com/solasta-crown-of-the-magister/news/110-solasta-winter-update-patch-notes),
  14/12/2020, Early Access: selezionare Scattare mostra la portata; l'azione
  si spende muovendo oltre la portata normale. Precedente storico per I-017,
  non prova di Scatto automatico senza selezione o di arresto parziale.

**Raccordo adottato:** preview segmentata e fermata esplicita, esecuzione del solo
prefisso raggiungibile per il movimento semplice. Scattare non è automatico,
il residuo non si accoda. Il nostro rosso indica ciò che non si eseguirà con
la scelta attuale; non è copia integrale della scala verde/giallo/rosso DnD5e.
Nessuna fonte primaria verificata per attribuire questo preciso clic a BG3
o al titolo ambiguo ricordato dall'owner. Ostacoli e costo seguono R164.

## R168 — annullare preparazione, fermare e ripristinare il movimento

22/09/2026. Verifica primaria documentale per I-201; nessun test runtime
dei prodotti. Il ripristino del token non prova il riavvolgimento dello scontro.

- [Foundry 13.344](https://foundryvtt.com/releases/13.344), 21/05/2025,
  introduce l'annullamento del movimento registrato.
  [API corrente V14](https://foundryvtt.com/api/classes/foundry.documents.TokenDocument.html#revertRecordedMovement)
  descrive ripristino della posizione precedente e arretramento della cronologia.
  Non dimostra il rimborso di tutte le risorse né tutta la politica dei permessi.
- [Game Controls](https://foundryvtt.com/article/controls/), intestazione
  13.350 del 20/10/2025: Esc cancella operazioni/chiude finestre; Ctrl+Z annulla
  sul canvas, Command su macOS. [12.323](https://foundryvtt.com/releases/12.323)
  vieta l'undo ai non-GM durante la pausa: precedente di controllo dell'autorità,
  non regola trasferita automaticamente al nostro prodotto.
- [Crucible 0.9.2](https://github.com/foundryvtt/crucible/releases/tag/release-0.9.2),
  04/05/2026: Ctrl+Z sul movimento restituisce Action Points e Free Movement
  e rimuove l'azione originale. È una capacità del sistema Crucible, non del
  core Foundry o di DnD5e; non attesta ripristino di ogni evento intervenuto.
- [Owlbear Scene History](https://docs.owlbear.rodeo/extensions/apis/scene/history/):
  API di annullamento/ripetizione e disponibilità dell'undo. Non definisce
  rimborso di risorse D&D, scorciatoia corrente, durata o tutti i permessi.
- Ispezione circoscritta DnD5e 6.0.3, 17/09/2026,
  [revisione 63e3769](https://github.com/foundryvtt/dnd5e/tree/63e3769b87871f4d8ad56b454e1da68a7068432d):
  token, HUD e impostazioni non hanno fornito una procedura distinta con rimborsi.
  Non è prova dell'assenza della funzione. Nessuna prova primaria sufficiente
  del rimborso dopo movimento già eseguito in BG3.

**Raccordo adottato:** Esc annulla la preparazione o ferma il resto della mossa
nel contesto pertinente; Annulla spostamento/Ctrl+Z/⌘Z ripristina il caso semplice.
Posizione e budget tornano indietro insieme; conseguenze dipendenti e autorità
seguono I-028/I-029. Correzione sempre raggiungibile, senza rimborso universale
o pretesa di far dimenticare informazioni rivelate. Distinzione nostra, esplicita.

## R169 — tempi delle reazioni e risorse nella baseline 2024

22/09/2026. Lettura diretta dei PDF ufficiali locali EN/IT; hash riverificati
identici a R165. `source kind=srd`, edizione `2024`, revisione immutabile `5.2.1`.
[EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf),
[IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf).
Sostiene I-203/I-204 e TABLE_REACTIONS; nessuna prova runtime di un motore.

| Regola                  | Verifica                                                                                                                                                                                                                                       | Pagine EN / IT                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Reazione                | Segue immediatamente l'innesco salvo testo specifico; dopo l'uso torna all'inizio del proprio prossimo turno. Offerta/rinuncia non sono uso.                                                                                                   | 10, 186 / 11–12, 212                    |
| Opportunità             | Una creatura visibile esce dalla portata: un attacco in mischia con arma o senz'armi, prima dell'uscita. Disimpegno, teletrasporto e spostamenti senza impiegare movimento/azione/azione bonus/reazione hanno le eccezioni indicate dal testo. | 15, 185 / 17–18, 204                    |
| Scudo                   | Reazione al colpo o a Dardo incantato; +5 CA anche contro il colpo innescante fino al prossimo inizio turno; niente danni da Dardo incantato. V/S, nessuna concentrazione. Un 20 naturale continua a colpire.                                  | 161–162 / 186; tiro per colpire 14 / 17 |
| Slot nello stesso turno | Un solo slot speso per lanciare durante un turno: uno slot/reazione disponibili non bastano a rendere sempre lanciabile Scudo sul proprio turno.                                                                                               | 105 / 119                               |
| Controincantesimo       | Creatura visibile entro 18 m che lancia con V/S/M; TS Costituzione del bersaglio. Fallimento: incantesimo senza effetto, azione/azione bonus/reazione spesa; slot del lancio interrotto non consumato.                                         | 120 / 136                               |
| Prepararsi              | Azione sul proprio turno, innesco percepibile, reazione dopo che termina; magia con tempo di lancio un'azione lanciata e pagata subito, trattenuta con concentrazione. Non rimborsata normalmente se persa.                                    | 186–187 / 211                           |
| Concentrazione          | Dopo danno, TS Costituzione CD maggiore tra 10 e metà danno per difetto, massimo 30. Incapacitazione o morte terminano direttamente. Incapacitato da solo non azzera la velocità.                                                              | 179, 184 / 206, 208                     |
| Effetti simultanei      | Nello stesso momento durante un turno, l'ordine spetta alla persona di cui è il turno. Non determina tutta la concorrenza dell'app o l'ordine fuori dai turni.                                                                                 | 187 / 207                               |
| Goblin guerriero        | Scimitarra +4, portata 1,5 m, 1d6+2 taglienti; aggiunge 1d4 quando il tiro ha vantaggio. La fixture usa tiro normale.                                                                                                                          | 290 / 340                               |

**Fixture verificata:** Livia CA 14/PF 18, velocità 9 m, due slot di 1º livello,
reazione e Scudo disponibili, V/S consentite, nessuno slot già speso nel turno;
nessuna concentrazione/Disimpegno. Il goblin vede Livia e disponeva della reazione.
Dopo 3 m su 6 preparati, l'opportunità avviene ancora entro portata: 14+4=18.
Scudo→CA 19, manca, PF invariati, slot 2→1 e entrambe le reazioni usate;
rinuncia→d6=3,+2=5, PF 13, reazione/slot di Livia intatti. Prima della ripresa
restano 6 m di budget, di cui 3 m del percorso; all'arrivo restano 3 m.

**Controesempio utile:** con concentrazione e 5 danni, TS CD 10 prima della
ripresa. Se si perde conoscenza a 0 PF, l'incapacitazione termina la concentrazione
e privo di sensi porta velocità 0; non è un TS riuscito a evitarlo. EN 17/191,
IT 212. IT p.208 apre Incapacitato usando erroneamente «paralizzato»: refuso
conservato nella provenienza, letto insieme a EN p.184 e IT p.206, non nuova regola.

**Limiti:** la pausa per riconsiderare dopo il danno è il raccordo UX I-024/I-204,
non prescrizione SRD. I-023/I-024 erano nati nel caso movimento–Nascondersi;
I-204 ne registra l'estensione delegata al movimento semplice. Tiro nemico
pubblico nell'esempio non approva visibilità universale. Nuove fonti normative
e varianti devono conservare la propria revisione, senza sovrascrivere il 2024.

## R170 — richieste contestuali, alternative e limiti dei concorrenti

22/09/2026. Fonti primarie pubblicate e codice; nessun test runtime dei prodotti.
Sostiene I-203/I-204. R007–R009 restano ricerca storica, con le precisazioni sotto.

- [BG3 Patch 2](https://baldursgate3.game/news/patch-2-now-live_89): la pagina
  letta ora mostra 03/09/2023, mentre R007 conserva 31/08/2023 come data del
  rilascio. Documenta stato abilitato, Ask configurabile per reazione e risorsa
  indicata. Non prova il default corrente di ogni capacità o la nostra politica di attesa.
- [BG3 Patch 7](https://baldursgate3.game/news/patch-7-now-live_121), 05/09/2024:
  selezione delle reazioni desiderate e conferma insieme, evitando rifiuti
  ripetuti di ogni altra voce. Sostiene alternative riunite. La specifica
  affermazione storica di R007 su Patch 5/multipersonaggio non è stata
  riconfermata nell'estrazione corrente: non usarla come nuova prova.
- [Solasta Dev Diary 1](https://www.solasta-game.com/solasta-crown-of-the-magister/news/7-dev-diary-1-reaction-system),
  12/07/2019: popup e countdown che cancella la reazione; precedente storico,
  non il nostro default senza scadenza. [Dev Update 26](https://www.solasta-game.com/solasta-crown-of-the-magister/news/112-dev-update-26-welcome-2021-community-feedback-2),
  06/01/2021, sostiene la scelta esplicita tramite popup rispetto al toggle
  automatico. Non prova una coda multipersonaggio attuale.
- **Midi-QOL**, linea v13, package 13.0.65, revisione immutabile
  `6b10be53c140aea013f7ca130c35abf3e2c81e44`, commit 02/09/2026; non dichiarata
  l'ultima versione di tutte le linee. [utils.ts](https://gitlab.com/tposney/midi-qol/-/blob/6b10be53c140aea013f7ca130c35abf3e2c81e44/src/module/utils.ts#L5485)
  filtra reazioni utilizzabili, passa al GM se il proprietario non è attivo
  e apre ReactionDialog; timeout e chiusura producono nessuna reazione.
  [GMAction.ts](https://gitlab.com/tposney/midi-qol/-/blob/6b10be53c140aea013f7ca130c35abf3e2c81e44/src/module/GMAction.ts#L707)
  inoltra alla richiesta locale. L'attesa della singola risposta non prova
  una coda globale o mancata sovrapposizione dei dialoghi.
  [MidiActivityMixin.ts](https://gitlab.com/tposney/midi-qol/-/blob/6b10be53c140aea013f7ca130c35abf3e2c81e44/src/module/activities/MidiActivityMixin.ts#L749)
  marca la reazione dopo l'uso; l'offerta non la spende. Sono comportamenti
  del modulo, non garanzie del core Foundry/DnD5e.
- **DnD5e 6.0.3**, 17/09/2026, SHA `63e3769b87871f4d8ad56b454e1da68a7068432d`:
  [request-message-data.mjs](https://github.com/foundryvtt/dnd5e/blob/63e3769b87871f4d8ad56b454e1da68a7068432d/module/data/chat-message/request-message-data.mjs#L123)
  collega risultato, identificatore della richiesta e creatura. Sostiene
  identità distinte, non una coda UI di reazioni o tutti i nostri permessi.
- [Foundry, bilancio 2025](https://foundryvtt.com/article/year-in-review-2025/),
  già R008: percorsi V13 sospendibili e riprendibili. Non prova la nostra
  ripresa automatica dopo Scudo o la pausa strategica dopo danno.

**Adattamento dichiarato:** Chiedi e alternative contestuali dai precedenti;
lista di richieste distinta e dettaglio non sostituito raccordano I-073/I-074.
Riduci/Esc mantiene l'attesa; niente rinuncia per timeout o passaggio automatico
al DM in assenza. Queste scelte preservano controllo esplicito e dadi fisici
richiesti dall'owner, invece di fingere una copia identica di Midi-QOL/Solasta.
Risoluzione causale/normativa distinta dall'ordine visivo della lista; nessuna
deduzione di FIFO da await. Ripresa e correzioni applicano I-023/I-024/I-029.

## R171 — collegamenti fra personaggio, campagna, tavolo e contenuti

Riconsultazione di fonti primarie il 22/09/2026 per I-205/I-206.
Nessuna prova runtime dei concorrenti; composizione proposta in APP_BLUEPRINT.

- [D&D Beyond — Joining a Campaign](https://dndbeyond-support.wizards.com/hc/en-us/articles/14025808350612-Joining-a-D-D-Beyond-Campaign),
  aggiornato il 27/08/2025: dall'invito si sceglie un personaggio proprio,
  uno assegnato oppure se ne crea uno. Sostiene il raccordo personaggio/campagna,
  non una specifica dei nostri permessi o l'intera navigazione proposta.
- [Foundry — Player Orientation](https://foundryvtt.com/article/player-orientation/),
  pagina corrente senza build unica indicata: scena attiva, sidebar per attori,
  oggetti e diario, scheda apribile/modificabile mantenendo aperta la scena.
  Sostiene scena e dettagli collegati. Non prova salvataggio o sincronizzazione
  della nostra app, né giustifica l'inclusione della musica esclusa per ora.
- [Roll20 — Compendium](https://help.roll20.net/hc/en-us/articles/360039178694-Compendium),
  documentazione corrente: consultazione del compendio anche fuori dal tavolo
  e disponibilità nel VTT. Sostiene accesso autonomo e contestuale, non
  pubblicazione automatica dei contenuti personali.
- [Kanka — Journals](https://docs.kanka.io/en/latest/entries/journals.html),
  documentazione senza versione applicativa verificata: diario per preparazione
  e riepiloghi, collegabile a un autore/personaggio. Sostiene la continuità
  prima/dopo la sessione, non un riassunto generato automaticamente.

R037/R094/R103/R161 conservano le ricerche precedenti. La divisione proposta
fra organizzazione e gioco, i nomi delle destinazioni e il loro accorpamento
sono una sintesi dell'agente compatibile con l'intervista, non un consenso
universale documentato o una nuova preferenza espressa dal proprietario.
La sequenza di consegna riusa R160: nessuna nuova ricerca generale sugli
agenti, installazione o dichiarazione di eliminare gli errori dei modelli.

## R172 — dalle raccolte personali alla preparazione e al tavolo

Verifiche documentali mirate del 22/09/2026 per I-208. Nessun account,
invito reale, installazione o test runtime dei concorrenti. I file sotto
conservano URL, date editoriali, versione quando disponibile, comportamento
sostenuto e differenze della nostra composizione.

| Pagina e fonti primarie rilette                                                                                                                           | Che cosa sostiene la verifica                                                                                         | Limiti pertinenti                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Inizio](pages/start.md): Beyond Creations, 17/02/2019 con navigazione corrente                                                                           | Raccolte personali distinte per personaggi, campagne e homebrew.                                                      | Non prova priorità dei recenti, bozze in home, offline o autenticazione del nostro prodotto.                                                                                    |
| [Personaggi](pages/characters.md): Beyond Character Creation Methods 24/03/2026, Builder Sections e Joining 27/08/2025; Roll20 Charactermancer 10/11/2021 | Creazione per sezioni, personaggio pronto, raccordo scheda/campagna; revisione e bozza riprendibile.                  | Charactermancer storico OGL, non builder 2024. Perdita della sezione alla chiusura e sovrascrittura non adottate.                                                               |
| [Campagna](pages/campaign.md): Beyond Joining, Kanka Prep 10/04/2026, Roll20 Invite/Promote/Manage 28/07/2026                                             | Invito e scelta personaggio; diario recente e collegamenti; invito, ruolo e rimozione distinti.                       | Non importa poteri del Creator/GM, durata degli inviti o griglia di widget; nostre autorità ancora parziali.                                                                    |
| [Preparazione](pages/preparation.md): Foundry Scenes, Adventure Documents e Compendium Packs                                                              | Configurazione, vista e attivazione distinte; materiali con collegamenti; copie di gioco separate dal compendio.      | Adventure mostra 20/10/2025/13.350 ma testo V14, non snapshot uniforme. Media e reimport possono richiedere interventi o sovrascrivere; nessun ripristino intelligente dedotto. |
| [Biblioteca](pages/library.md): Foundry Items, Shard Player Content Sharing, Beyond Creation/Collection e Sharing/Publishing 29/09/2025                   | Definizione/copia sulla scheda, creazione/raccolta, condivisione nel gruppo/abilitazione/pubblicazione distinguibili. | Anno Shard non esposto; niente condivisione globale obbligatoria. Discordanza storica sulla moderazione Beyond conservata in R105; runtime corrente non verificato.             |

La struttura e i raccordi sono adattamenti espliciti a decisioni già acquisite,
non un'unica architettura copiata o un consenso universale. Le ricerche precedenti
richiamate dalle pagine rimangono datate; non sono tutte dichiarate rilette oggi.
La visita locale mostra soltanto tre viste e la continuità di dati sintetici.
Le sue prove browser verificano l'esempio, non questi prodotti o l'app futura.

## R173 — inventario collegato e provenienza dei gruppi INV

23/09/2026, letture documentali primarie per I-210 e
[INVENTORY_FLOW](INVENTORY_FLOW.md). Nessun account, acquisto, installazione
concorrente o test runtime. La matrice INV-01–INV-11 conserva comportamento,
URL/data/versione, motivo e adattamento per ogni gruppo di comandi.

Nuove letture dell'autore:

- [Beyond — Sheet Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193946388-Sheet-Sections),
  17/09/2025: aggiunta, equipaggiamento, sintonia e armi fra le azioni. La
  guida avverte possibili differenze con la UI corrente: non prova il layout attuale.
- [Foundry core — Items](https://foundryvtt.com/article/items/), senza build/data
  unica: oggetti e definizioni, ricerca e creazione. Distinzione di copia e
  oggetto posseduto; non prova sincronizzazione delle revisioni dell'app.
- [DnD5e 3.0.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-3.0.0),
  storico, commit 075dd2e, Foundry 11+: inventario in gioco e contenitori.
  [DnD5e 6.0.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-6.0.0),
  10/09/2026, Foundry 14: separazione pile #5156, protezione della sintonia
  degli oggetti non identificati #3993, applicazione di effetti/danni propri
  #3300/#4529/#5934. Sistema dnd5e, non core o undo universale.
- [DnD5e Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities),
  wiki 10/09/2026, dichiara 6.0.0: attività, tempi, bersagli, consumi e recuperi.
  Documento mutabile senza SHA fissato; non una revisione normativa del motore.
- SRD EN/IT **5.2.1**, edizione 2024, PDF locali già acquisiti in R165:
  EN p.92 armature/scudo, p.99 pozione, pp.102–103 sintonia. URL e hash in
  INVENTORY_FLOW. L'esempio 2d4+2 usa dati sintetici, non tiri misurati.

Riutilizzate senza dichiararle tutte riverificate oggi: R052–R065 per offerte,
consenso, inventari del gruppo, identificazione e confronto; R135/R149 per
contenitori/dotazione iniziale. Core, sistema e moduli sono distinti. Il ramo
manuale, la privacy trasversale e la coerenza delle operazioni condivise sono
raccordi con decisioni dell'owner, non garanzie attribuite ai prodotti fonte.

## R174 — gestione e lancio delle magie, gruppi MAG

23/09/2026, ricerca documentale per I-211 e
[SPELLCASTING_FLOW](SPELLCASTING_FLOW.md). Dieci gruppi MAG con fonti e limiti;
nessun test runtime, build installata o prova di superiorità empirica.

- [Beyond — Sheet Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193946388-Sheet-Sections),
  17/09/2025, riletta: gestione magie, dettaglio, preparazione e slot. Avviso
  di documentazione non allineata a ogni comportamento attuale conservato.
- [DnD5e Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities),
  6.0.0, wiki 10/09/2026 riletta: attività, risorse, input, attacchi/TS/cure/
  utilità ed effetti. Non decide privacy, conferma o coda globale di richieste.
- [Larian — Patch 3](https://baldursgate3.game/news/patch-3-mac-support-magic-mirror-more_93),
  22/09/2023 riletta: avviso di concentrazione contestuale, rimosso dalla
  consultazione durante avanzamento. Sostiene MAG-09, non il timing 2024.
  Patch 2 e risorse hotbar rimangono evidenza storica R169 citata dal flusso.
- R120–R122 conservano liste, confronto e magie del gruppo del modulo **Spell
  Book**, non Foundry core. La wiki loadouts oggi non è stata recuperata:
  nessuna riconferma della versione o runtime correnti. Limiti di accesso e
  date esatte sono nella matrice MAG-03–MAG-05.
- SRD **5.2.1** EN/IT, edizione 2024, hash locali ricalcolati dall'autore:
  accesso/preparazione/slot EN104/IT118–119, tempo/componenti EN105–106/IT119–120,
  bersagli invalidi EN106, concentrazione EN179/IT206. Fonti e hash nel flusso.
  Un solo slot speso per lanciare nel medesimo turno non significa una sola
  magia universale; rituali, capacità e reazioni restano specifici.

La revisione separa pattern di UI da regole: BG3 non autorizza modifiche alla
baseline 2024. Liste richiamate come proposta, conservazione della bozza,
dadi fisici e correzioni sono adattamenti dichiarati a requisiti acquisiti.

## R175 — provenienza dell'impianto comune delle pagine

23/09/2026, verifica primaria del coordinatore a supporto di I-209 e
[DESIGN_SOURCES](DESIGN_SOURCES.md), gruppi UI. Solo lettura della documentazione,
nessun account o test delle interfacce autentiche.

- [Beyond Creations](https://www.dndbeyond.com/creations), contenuto 17/02/2019
  con navigazione corrente: raccolte personali distinte di personaggi, campagne,
  raccolta e creazioni homebrew. Non conferma gli esatti nomi/ordine del nostro menu.
- [Beyond Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections),
  27/08/2025: creazione per sezioni e passaggio alla scheda/campagna. Non
  stabilisce i nostri campi, salvataggi o requisiti delle opzioni 2024.
- [Foundry Player Orientation](https://foundryvtt.com/article/player-orientation/),
  senza build/data unica: scena, sidebar, directory/registro/turni e scheda
  apribile/modificabile mantenendo aperta la scena. Non prova un pannello
  universale fissabile, continuità su telefono o persistenza delle bozze.
- [Foundry Scenes](https://foundryvtt.com/article/scenes/), senza build/data
  unica: configurare/salvare, vedere e attivare distinti. Non equivale alla
  nostra selezione dei sottogruppi, privacy Solo io o simulazione di permessi.

Le altre righe UI conservano le ricerche precedenti, nominate e datate;
non sono tutte dichiarate rilette. L'audit separato ha confermato che raggruppamento
delle destinazioni, continuità delle bozze e anteprima dei destinatari sono
composizioni/adattamenti, non una stessa architettura presente in tutti i
prodotti. Layout preciso dell'Inizio, ordine del menu e gestione completa dei
pannelli/dispositivi restano da confrontare autonomamente prima di consolidarli.

## R176 — navigazione Beyond attuale e scheda dentro Maps

23/09/2026, I-212/NAVIGATION. Ricerca primaria di table_patterns: documentazione
pubblica e menu della pagina Creations osservato nel browser. Non sono stati
aperti personaggi, campagne o contenuti privati; nessun invito reale o test
funzionale di Maps. Fonti senza build immutabile, salvo date dei rilasci citati.

- [Creations](https://www.dndbeyond.com/creations), origine 17/02/2019, e
  [changelog](https://www.dndbeyond.com/changelog), 05/03/2026: menu pubblico
  PLAY D&D con My Characters, My Campaigns, Maps VTT; Rules, Library e altri
  ambiti separati. Collections delle guide storiche non è il menu attuale.
  Creations mantiene accessi a schede, campagne, raccolta e creazioni homebrew;
  non dimostra che sia l'home autenticata corrente.
- [My Library](https://www.dndbeyond.com/en/library) e changelog 05/03/2026,
  14/04/2026: ricerca/filtri e accessi a recenti/preferiti. Consultazione del
  catalogo pubblico; preferiti personali non aperti. Non importare quote o
  etichette commerciali, né attribuire a questa fonte i recenti di tutta l'app.
- [Joining a Campaign](https://dndbeyond-support.wizards.com/hc/en-us/articles/14025808350612-Joining-a-D-D-Beyond-Campaign),
  27/08/2025: scelta del personaggio nell'invito. Sostiene contesto e raccordo,
  non autorità dei nostri ospiti/co-DM o trasferimenti fra gruppi.
- [Character Header](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193980820-Character-Header),
  17/09/2025, con immagini: campagna, Launch game, Go to builder e menu della
  scheda. [Shared Party Inventory FAQ](https://dndbeyond-support.wizards.com/hc/en-us/articles/40964522619540-Shared-Party-Inventory-FAQ),
  09/09/2025: nome campagna apre sidebar con pagina del gruppo, avvio Maps e
  personaggi. Non provata posizione attuale nell'area privata né ritorno da Maps.
- [Accessing Maps](https://dndbeyond-support.wizards.com/hc/en-us/articles/46363319527828-Accessing-Maps),
  16/02/2026: selezione campagna prima dell'ingresso; Beta e limiti mobile
  espliciti. Nessuna equivalenza fra quest'accesso e attivare/spostare il gruppo.
- Changelog **09/04/2026, Character Sheet in Maps**, con GIF ufficiali:
  scheda dentro la sidebar aprendo il token, accesso ad azioni/inventario e
  aggiornamenti collegati. Capacità pubblicata, non prova runtime nostra.
- [Sheet Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193946388-Sheet-Sections),
  17/09/2025: sezioni locali e gestione pertinente al contenuto. La guida
  avverte parti non aggiornate: fonte concettuale, non layout al pixel corrente.

NAV adotta destinazioni globali, sezioni locali e scheda contestuale. Barra
semplificata, Torna alla campagna, privacy, bozze e ripresa sono adattamenti
espliciti. I nuovi dati precisano R175/UI-01/UI-05; le ricerche datate restano
conservate senza trattare un menu storico come versione corrente.

## R177 — navigazione della scena, raccolte e finestre nei VTT

23/09/2026, I-212. Ricerca primaria di npc_movement: letture pubbliche, API
ufficiali e ispezione delle due immagini ufficiali Owlbear sotto. Nessun account,
installazione o prova funzionale dei VTT. Core, sistema e modulo distinti.

- [Owlbear Rooms](https://docs.owlbear.rodeo/docs/rooms/), data/build non
  esposte: stanze nel profilo; scene/immagini dell'utente non dipendono dalla
  permanenza della stanza. Sostiene materiale autonomo, non una scheda D&D.
- [Foundry Scenes](https://foundryvtt.com/article/scenes/), senza build unica:
  configurazione, View Scene personale e Activate per tutti distinti. In NAV
  destinatari I-165 sono adattamento; non copiare il trascinamento generale.
- [Roll20 Page Folders / Party Toolbox](https://blog.roll20.net/posts/introducing-page-folders-the-party-toolbox/),
  24/10/2023: giocatori nelle pagine, Breakout Groups e Regroup All. Fonte
  storica primaria, non stato runtime corrente o controllo sui ruoli co-DM.
- [Foundry core 13.341](https://foundryvtt.com/releases/13.341), 27/04/2025,
  con immagini: menu scene collassato e sidebar verticale richiusa di default.
  Le barre scene orizzontali delle guide generiche non provano questo layout.
  Sostiene scena protagonista e richiamo, non il nostro preciso fissaggio.
- [Owlbear 2.1](https://blog.owlbear.rodeo/owlbear-rodeo-2-1-release-notes/),
  14/11/2023: Atlas con Scenes/Maps distinto dal Token Manager; indicatore scena,
  Find e Close. Ispezionati screenshot [Atlas](https://storage.ghost.io/c/a3/5f/a35f80a3-60fc-4957-9ba2-1ab03d072a28/content/images/2023/11/atlas.jpg)
  e [indicatore](https://storage.ghost.io/c/a3/5f/a35f80a3-60fc-4957-9ba2-1ab03d072a28/content/images/2023/11/scene-pill.jpg):
  raccolte laterali, ricerca/Add e riferimento alla scena. Le docs Assets
  mostrano ancora il Dock precedente: discontinuità conservata. Close chiude
  la scena; non è «chiudi dettaglio». Il rilascio rimuove un nome dal menu rapido
  per evitare spoiler, non dimostra da solo la privacy dell'intero prodotto.
- [Foundry Controls](https://foundryvtt.com/article/controls/), 20/10/2025,
  13.350: apertura scheda dal token/doppio clic e tasto C. [DnD5e 3.0.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-3.0.0)
  documenta Play/Edit e preferiti: riferimento storico del sistema, non layout
  6.x. NAV non sovrappone quel doppio clic all'attacco I-016.
- [ApplicationV2 API14.365](https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html):
  minimize/maximize/bringToFront, detachWindow/attachWindow. Le API documentano
  operazioni, non ogni gesto, ergonomia, persistenza o ripristino dopo refresh.
  [12.322](https://foundryvtt.com/releases/12.322) conserva un gesto storico
  di riduzione tramite intestazione; non prova gesto corrente universale.
- [Foundry core14.359](https://foundryvtt.com/releases/14.359), 01/04/2026,
  conferma finestre browser separate native. [14.349](https://foundryvtt.com/releases/14.349/),
  prototype 26/09/2025, precisa ApplicationV2 e riconosce il precedente PopOut!.
  Non attribuirle oggi soltanto al modulo o prometterle per ogni UI legacy.

NAV sceglie scheda laterale ordinaria, finestra separata aggiuntiva e ritorni
riconoscibili. Pannello fissato I-190, richieste ridotte ma pendenti, autorità
trasversali e conservazione del contesto rimangono adattamenti nostri.

## R178 — contesto della campagna e navigazione accessibile

23/09/2026, letture primarie del coordinatore. Documentazione pubblicata,
non uso di un account Kanka, test di tecnologie assistive o prova di conformità.

- [Kanka Campaign Switcher](https://docs.kanka.io/en/latest/features/campaign-switcher.html):
  controllo in alto a destra, gruppi di appartenenza/seguiti e creazione.
  [Dashboard](https://docs.kanka.io/en/latest/guides/dashboard.html) documenta
  punto d'arrivo della campagna e avverte sul sovraccarico di widget; non
  dimostra il nostro calendario reale. [Sidebar](https://docs.kanka.io/en/latest/features/campaigns/sidebar.html)
  documenta navigazione locale e personalizzazioni premium. Fonti senza data
  applicativa; «1.0.0» è etichetta della documentazione, non build verificata.
  NAV riprende contesto e accessi, non limiti commerciali o una home modulare obbligatoria.
- [WAI Breadcrumb](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/):
  posizione gerarchica, distinta dalla storia del browser. [Disclosure Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/),
  aggiornato 20/01/2026: link e sezioni espandibili, chiusura/focus da tastiera;
  menu di sito non equivale per forza al widget ARIA menu.
- [WAI Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) e
  [Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): selezione
  di sezioni, movimento del focus, chiusura e ritorno pertinenti. Documenti
  correnti senza build applicativa; gli esempi richiedono test reali prima
  dell'uso in produzione e non sono codice pronto da copiare ciecamente.

Queste fonti sostengono gerarchia e interazioni convenzionali. L'accorpamento
Diario/Mondo/Sessioni, il menu compatto sul telefono e gli ingressi di servizio
sono sintesi dei bisogni e dei pattern, non architettura Kanka riprodotta.

## R179 — creazione, ricostruzione e versioni dei contenuti

23/09/2026, I-213. Ricerca primaria dell'autore table_patterns, con lettura
S3/S4 del coordinatore e controllo normativo locale condiviso con l'autore
ADV. [CHARACTER_CREATION](CHARACTER_CREATION.md) conserva undici fonti S1–S11,
date, limiti e tredici gruppi CRE con motivo/adattamento. Nessun account,
import reale, installazione o test runtime dei builder.

- Beyond [Creation Methods](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193997716-Character-Creation-Methods),
  24/03/2026, e [Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections),
  27/08/2025: guida, sezioni, basi pronte modificabili. Testi storici residui
  non attestano ogni comportamento attuale.
- Beyond [Content Categories](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747201820948-Enabling-Content-Categories-for-your-Character-Sheet),
  11/11/2025: scelta delle fonti nel builder e nella gestione della scheda.
  Tutte attive per default nel suo Standard: non importato nella nostra
  baseline e negli accordi della campagna. [Aggiornamento del 26/08/2024](https://www.dndbeyond.com/posts/1806-2024-d-d-beyond-ruleset-changelog-update)
  conserva opzioni2014 dopo feedback sulla migrazione: precedente contro
  sostituzioni implicite, non dimostrazione che ogni scelta concorrente sia ottima.
- Roll20 [builder2024](https://blog.roll20.net/posts/play-dd-2024-your-way-on-roll20/),
  17/09/2024, e [Change Log2024](https://help.roll20.net/hc/en-us/articles/34086640235927-2024-Change-Log):
  metodi dei punteggi, omissioni nel riepilogo, avanzamento/dotazione dal
  10/10/2024. La guida OGL2021 conserva il precedente Save and Exit/Review;
  non le sue perdite alla chiusura o una sovrascrittura indiscriminata.
- Beyond [Changelog](https://www.dndbeyond.com/changelog), 14/04/2026: la
  casella Beginner è rimossa, l'aiuto resta. Autoequipaggiamento Quickbuilder
  non adottato. [Behind the Screen](https://www.dndbeyond.com/posts/2135-behind-the-screen-the-new-quickbuilder-and-future),
  24/03/2026, distingue Quickbuilder rilasciato e concetti del builder futuro.
- Roll20 [Homebrew Character Builder](https://blog.roll20.net/posts/dd-homebrew-character-builder-is-here/),
  19/11/2025: opzioni manuali e capacità per livello. Precedente di flessibilità,
  non prova di conversione automatica o compatibilità universale.
- SRD5.2.1 EN/IT, edizione2024: metodi numerici, contributi del background,
  primo livello e dati di partenza; pagine e hash nell'appendice S10. Fonte
  normativa distinta dalle guide di interazione e dai dati manuali dichiarati.

Ricerca R038–R044/R093/R147–R149/R152 riutilizzata con la sua data;
R152 mantiene gli spunti narrativi scegli/tiro/riscrittura I-175, dal sorgente
Roll20 Legacy a revisione fissata, non dal builder2024. Importatori e
moduli non attribuiti al core Foundry. Conservazione delle bozze, dati ignoti,
conferma unica, permessi e rete sono raccordi delle decisioni dell'app.

## R180 — avanzamento, multiclasse e continuità delle risorse

23/09/2026, I-214. Ricerca documentale primaria di npc_movement:
[CHARACTER_ADVANCEMENT](CHARACTER_ADVANCEMENT.md) conserva dieci gruppi ADV
con comandi, fonte, data/versione, motivo e adattamento. Nessun login,
installazione, personaggio reale o test dei prodotti concorrenti.

- Beyond [Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections),
  27/08/2025: PE/milestone, PF Fixed/Manual, livelli, multiclasse e scelte
  associate. Nessuna build immutabile o UI autenticata verificata.
- Sistema Foundry **dnd5e**, [Advancement](https://github.com/foundryvtt/dnd5e/wiki/Advancement)
  e [Awards](https://github.com/foundryvtt/dnd5e/wiki/Awards), wiki aggiornate
  10/09/2026, dichiarano6.0.0: contributi PF per livello, scelte/concessioni/
  valori dipendenti dal livello; premi divisi o per destinatario. Non core,
  non prova della nostra gestione di un resto o della fusione delle bozze.
- [Advancement User Guide](https://github.com/foundryvtt/dnd5e/wiki/Advancement-User-Guide),
  31/01/2024, badge3.0.0 e richiami interni1.6: Modify Choices come precedente
  storico. Avverte che modifiche manuali durante il percorso possono essere
  annullate; questa perdita è controevidenza e non viene adottata.
- Roll20 [Charactermancer](https://help.roll20.net/hc/en-us/articles/360039644133-D-D-5e-Charactermancer),
  10/11/2021, OGL: Save and Exit, Review e Apply. Perdita alla X e
  sovrascrittura descritte non importate. [Builder Homebrew](https://blog.roll20.net/posts/dd-homebrew-character-builder-is-here/),
  19/11/2025, builder2024: scelte future conservate dopo aver abbassato il
  livello. Il nostro piano separato preserva la scheda realmente giocata.
- Fonte normativa `srd`, edizione2024, revisione5.2.1: EN23–26 / IT25–29,
  PDF/hash in ADV e R165. Soglie/livelli, PF, Costituzione retroattiva,
  requisiti multiclass delle classi attuali e nuova, competenze, Dadi Vita e
  slot. Metà livelli paladino/ranger arrotondata per eccesso: non2014.
- Verifica aggiuntiva in review, SRD EN5 / IT6: arrotondamento generale per
  difetto salvo eccezione. Per50PE/3, proposta16/16/16 e resto2 dichiarato;
  eventuale distribuzione manuale del DM resta esplicita. Awards non prova
  questa UI del resto, che è adattamento dell'app.

Il respec, la conservazione dei PF attuali, il confronto dei consumi e la
riconciliazione con la scheda viva sono politiche esplicite dell'app secondo
le decisioni acquisite. Le pagine SRD non stabiliscono un riposo automatico,
un rimborso o un protocollo di conflitto. Le regole di riserve non equivalenti,
contenuti speciali e autorità trasversali restano lacune nominate.

## R181 — Beyond: inventario dai suoi indici verso il contratto

23/09/2026, evidenza primaria pubblica, senza account/runtime. L'audit
[Beyond](reference-audits/beyond.md) conserva 25 famiglie, URL, date e limiti,
partendo da Tools and Features, changelog e guide recenti. Distinti scheda,
Maps, preparazione, homebrew, mobile e integrazioni; legacy Encounters 2014
non fuso con Maps 2024. Custom Reveals pubblicato il 22/09/2026 è distinto
dalle funzionalità future annunciate. Il documento espone ciò che manca
nel nostro contratto e non attesta parità o ogni comando Beyond.

## R182 — Foundry: core, sistema e moduli separati

23/09/2026, fonti primarie pubbliche, nessuna installazione/runtime. L'audit
[Foundry](reference-audits/foundry.md) conserva 30 famiglie e riferimenti
versionati: core, dnd5e e moduli distinti. Le wiki del 10/09/2026 dichiarano
6.0.0; release 6.0.2 pubblicata il 15/09/2026, perciò 6.0.0 non è l'ultima
patch. Trovati raccordi mancanti per macro, regioni, asset, composizione di
scene e impostazioni. Copie di Item indipendenti non provano un aggiornamento
guidato dei consumi. Catalogo estensioni e singole API restano aperti.

## R183 — BG3 e Solasta: interazioni tattiche e confini delle regole

23/09/2026, fonti primarie Larian/Tactical Adventures e articolo firmato Larian
su PlayStation Blog. [Audit](reference-audits/bg3-solasta.md): 18 famiglie BG3,
3 confronti Solasta, date/versioni/limiti per ogni fonte. Le fonti Early Access
sono storiche, patch correttive provano solo il comportamento pertinente;
nessuna prova runtime o copertura di tutte le capacità del gioco. Turni
condivisi, armi, esame, furtività e movimento speciale restano raccordi aperti.
Le regole dei videogiochi non sostituiscono lo SRD 2024 dell'app.

## R184 — authoring homebrew e aggiornamento esplicito delle copie

23/09/2026. [HOMEBREW_FLOW](HOMEBREW_FLOW.md) conserva dodici gruppi HB con
fonti puntuali e adattamenti. Tutorial primari Beyond: sottoclasse 11/07/2020,
oggetto 06/11/2021, nuove versioni pubblicate 10/11/2021; Sharing aggiornato
29/09/2025. Sono precedenti storici di editor, non regole 2024. Shard Create
illustra tipi 5e e copie; Foundry Items distingue modello/copia sulla scheda;
wiki dnd5e Activities, Advancement e Active Effects 10/09/2026 documentano
parti meccaniche distinte. I dettagli e controevidenze sono in R181/R182.

Nessuna fonte dimostra insieme confronto, aggiornamento privato universale,
conservazione dei consumi, concorrenza e revoche: questi sono adattamenti
espliciti per le decisioni I-067/I-114. Versione fissata non significa valore
numerico sempre statico. Nessuna trascrizione dello Spadaccino o fonte
precisa attribuita all'owner. Il caso gilda è regola di casa già richiesta.

## R185 — mercato più largo e controllo delle omissioni

23/09/2026. [REFERENCE_COVERAGE](REFERENCE_COVERAGE.md) raccoglie fonti primarie
puntuali e ricerche precedenti per Owlbear, Roll20, Fantasy Grounds, Shard,
Alchemy, Demiplane, Kanka, LegendKeeper, World Anvil, Dungeon Manager,
Dungeondraft, DungeonFog, Quest Portal ed ecosistemi di estensioni. Conserva
quali pagine sono lette oggi, quali risultano da ricerca primaria e quali
sono solo riuso di evidenza datata. Nessun accesso autenticato/runtime.

La passata apre venti lacune di lavoro, non venti esclusioni o domande.
Macro/comandi e asset diventano F-064/F-065 su delega I-217. Altri casi
estendono sottofunzioni esistenti o richiedono ancora analisi: soprattutto
sequenze regionali, editor scene, mondo/collaborazione, servizi e integrazioni.
AI, API, commercio e reclutamento non vengono autorizzati in blocco dalla
presenza in un catalogo. Non è possibile attestare «ogni tool e ogni feature»
con questo censimento: gli indici esterni restano ingressi di verifica continui.

## R186 — regole e interazioni dei primi attacchi eseguibili

23/09/2026. [Ricerca normativa e fonti](../../changes/interview-01/blueprint-combat-research.md)
con SRD 5.2.1 EN/IT riaperti e hash identici a R165. Conserva pagine per
arma, critico, attacchi magici, cono, dardi, azioni senza bersaglio e limite
2024 di slot per turno. Distingue la lettura implementativa dei dadi di
Dardo incantato dal testo normativo certo e dai chiarimenti non reperiti.

Riaperta documentazione primaria Foundry **sistema dnd5e 6.0.0** Activities,
Save e Use/Utility, modificata 10/09/2026, senza SHA wiki fissato. Attività,
consumo, bersagli e danni separati; non prova automazione completa del core.
Per BG3 riusata evidenza primaria storica già datata nelle ricerche: varianti,
preview di aree e conferme pertinenti. Nessuna nuova prova runtime dei concorrenti.

L'adozione circoscritta è I-219; implementazione ed evidenze dell'app sono
separate in BLUEPRINT_STATUS. Il criterio centro-pedina del cono rimane una
semplificazione dichiarata dell'esempio, non una decisione finale sulle aree.

## R187 — reazioni, danno e attacchi PNG collegati

23/09/2026. [Ricerca primaria](../../changes/interview-01/blueprint-reactions-research.md)
riapre SRD 5.2.1 EN/IT con hash invariati, pagine e limiti espliciti:
Scudo, opportunità prima dell'uscita, eccezioni specifiche, ordine simultaneo,
concentrazione per istanza e CD massima 30, condizioni e scadenze al proprio turno.
La convenzione di più TS per i dardi è distinta dal testo ufficiale verificato.

Foundry sistema dnd5e 6.0.0/config `63e3769` distingue attivazione Reazione,
non una nuova categoria di Activity; Midi-QOL 13.0.65 `6b10be53` mostra
prompt atteso prima della continuazione. La sua chiusura/timeout non viene
spacciata per il nostro Esc persistente, che deriva dal contratto. Larian
Patch 2/7 conferma Ask e scelte pertinenti; non si importano le sue regole
al posto del 2024. Nessuna nuova prova runtime dei prodotti esterni.

[Attacchi PNG](../../changes/interview-01/blueprint-creature-actions-evidence.md)
confronta attività configurabili Foundry dnd5e 6 e authoring creature Beyond,
con accesso/data/versione distinti. Il nostro profilo personalizzato ha
provenienza authored-demo e revisione propria, non una citazione SRD inventata.
Adozione circoscritta I-220; prove dell'artefatto in BLUEPRINT_STATUS.

## R188 — geometrie, percorsi, porte e calibrazione

23/09/2026. [Ricerca primaria](../../changes/interview-01/blueprint-spatial-research.md)
conserva 17 fonti d’interazione, otto vincoli SRD 5.2.1 EN/IT, versioni,
pagine, hash, limiti d’accesso e adattamenti. Foundry distingue restrizioni
spaziali e porte; Measurement espone tappe/costi. Arms Reach 14.0.0 è un
**modulo**, non il core: sostiene la distanza configurabile e il bypass GM,
non prova un default universale di 1,5 m o la nostra geometria.

Owlbear Aligning a Map, Roll20 allineamento beta del 19/08/2026 e Grid Scaler
mostrano calibrazione guidata. Il nostro tratto a due punti con distanza nota
è un adattamento dichiarato. Larian documenta traiettorie/indicatori e
interruzioni: la sequenza completa clic→avvicinamento→attacco non viene
spacciata per una nuova osservazione runtime di BG3; I-016 ne autorizza il
raccordo di prodotto. SRD distingue interazione gratuita/Utilizzare, terreno,
vista, bersagli ed effetto. Nessun test runtime dei concorrenti inventato.

I-221 registra l’adozione circoscritta; [dominio](../../changes/interview-01/blueprint-spatial-domain.md)
e [editor](../../changes/interview-01/blueprint-spatial-editor-evidence.md)
separano comportamento costruito, prove e approssimazioni.

## R189 — creazione, ricostruzione e avanzamento guidati

23/09/2026. [Ricerca primaria](../../changes/interview-01/blueprint-character-builder-research.md)
riusa CRE/ADV e verifica quindici fonti di Beyond, Foundry dnd5e, Roll20,
Shard e Demiplane, distinguendo pubblicazione, versione e limiti. Beyond
supporta sezioni guidate e ingressi distinti; Foundry espone scelte concesse,
incrementi e PF per livello. Il suo User Guide storico non è prova della
versione6. Beyond ha rimosso la casella Beginner nel14/04/2026; l’aiuto non
viene quindi modellato come una preferenza corrente verificata.

Shard distingue condivisione della libreria e attivazione nella campagna;
Demiplane offre precedenti di filtro dei prerequisiti, senza trasferire
regole PF2e nel 2024. L’autoequip di un concorrente e la riproposta di una
dotazione con inventario vuoto sono controesempi rispetto ai nostri I-172/ADV,
non pattern da adottare indiscriminatamente. La conservazione di danni e
consumi durante l’avanzamento deriva dal contratto, non da una prova runtime
su questi prodotti.

SRD5.2.1 EN/IT riaperti e hash ricalcolati sul corpus conservato: serie/27
punti/4d6, aumenti del background, PF, classi, prerequisiti multiclasse,
progressioni e riserve distinte hanno pagine nel report. I cataloghi
commerciali e ogni capacità1–20 non sono certificati da questa ricerca.
Nessun accesso autenticato o test dei concorrenti inventato; i risultati
costruiti e ancora mancanti sono separati in BLUEPRINT_STATUS.

## R190 — Biblioteca, homebrew e aggiornamenti espliciti

23/09/2026. [Ricerca increment6](../../changes/interview-01/blueprint-homebrew-research.md)
riapre 20 fonti primarie di Beyond, Foundry core/sistema dnd5e, Shard, Roll20
e Fantasy Grounds, conservando date/versioni. Documentazione letta, nessun
runtime concorrente o accesso privato dichiarato.

Crea, usa come base, nuova revisione, raccolta, condivisione e abilitazione
hanno precedenti distinti. Foundry distingue modello e copia posseduta;
il suo Import Data può sovrascrivere. Beyond documenta versioni del pubblicato
nella fonte storica 2021; non prova revisioni private immutabili. Shard separa
libreria accessibile e pacchetti attivati dal GM. Il formato export HTML e
reimport DOCX documentato non equivale a un JSON condiviso con Beyond/Foundry.
Fantasy Grounds documenta revert che rimuove personalizzazioni: controesempio
rispetto al nostro mantenimento delle correzioni, non fusione da copiare.

Il confronto fra revisione precedente, proposta e istanza corrente, con
consumi e override conservati, è adattamento esplicito I-067/HB-09–10.
Non viene attribuito come comportamento universale verificato dei concorrenti.
Il formato locale dell'app, con anteprima import e dipendenze/accessi validati,
non dichiara interoperabilità esterna. Le azioni eseguibili richiedono campi
supportati e fonte originale; nessuna automazione desunta dalla prosa.
Revoche sulle copie già usate, risorse non equivalenti, revisioni annidate,
moderazione e formati restano approfondimenti distinti, senza esclusioni.

## R191 — campagna, diario, mondo e sessioni

23/09/2026. [Ricerca primaria](../../changes/interview-01/blueprint-campaign-research.md)
riusa le decisioni e riconsulta13 gruppi di fonti: Foundry, Kanka,
LegendKeeper, World Anvil, Beyond, Roll20, Obsidian Portal, WhenIsGood e Apple.
Date/versioni, pagine storiche e limiti di accesso sono nel report. Nessuna
prova runtime dei concorrenti, calendario esterno o invito creato.

Il raccordo proposto parte dall'ultimo resoconto leggibile, collega voci del
mondo e Tavolo, permette un nuovo resoconto e una data diretta o un sondaggio
facoltativo. Lettura, modifica e invito rimangono poteri distinti. Il ruolo
DM non apre Solo io; ricerca, snippet e link applicano gli stessi accessi.
Ripristinare un testo crea una nuova revisione, senza riportare indietro la
partita. Fusi dell'appuntamento reale e tempo narrativo restano separati.

Controevidenze esplicite: poteri GM Foundry non equivalgono alle nostre note
private; snapshot locali storici LegendKeeper non dimostrano backup durevole;
calendari di finzione non provano scheduling reale; la nuova documentazione
Apple Co-Owner non sostituisce la delega limitata degli inviti già acquisita.
Il report propone sei percorsi e dodici prove browser ancora da eseguire;
non dichiara già costruite le sezioni Mondo o Sessioni.

## R192 — riposi, tempo narrativo e recuperi specifici

23/09/2026, ricerca dell'agente `blueprint_characters`, modello e sforzo
ereditati. [Rapporto completo](../../changes/interview-01/blueprint-rest-time-research.md)
conserva fonti, versioni, limiti, raccordi locali e dieci percorsi da verificare.
Non è implementazione né osservazione runtime dei concorrenti. Prepara il
blocco successivo senza scavalcare le verifiche dell'incremento7.

- SRD5.2.1 EN/IT con hash e pagine: avvio/durata/interruzione/ripresa,
  recuperi2024, Dadi Vita, Trance, Patto, Second Wind e Recupero Arcano.
  Distinguere quantità e condizioni per risorsa; nessun reset universale.
- Beyond per l'ingresso dalla scheda, Foundry dnd5e6.0.0 a commit immutabile
  per pannello, durata e risultati; moduli di gruppo/tempo con provenienza
  distinta dal core. BG3 e Solasta illuminano i gesti, non sostituiscono
  automaticamente l'economia e le regole del tabletop2024.
- I-085–092 già acquisiscono riposo parziale del gruppo, tempo condiviso
  esplicito, eventi facoltativi e recupero rapido con tetto personale e
  arresto sotto media nel caso precisato. Non riproporre quelle domande.
- Proposta: un percorso riusabile da scheda e Tavolo sullo stesso stato,
  preview e risultati per risorsa, tiri fisici/digitali persistenti, correzioni
  registrate. Data reale della prossima partita, tempo del mondo e completamento
  di un riposo restano distinti. Altri cataloghi/eventi/calendari sono obblighi
  ancora aperti, non esclusioni introdotte da questa sequenza.


## R193 — forme, compagni ed evocazioni: preparazione della famiglia successiva

23/09/2026; ricerca documentale di blueprint_characters, modello/sforzo
ereditati. [Rapporto completo](../../changes/interview-01/blueprint-forms-companions-research.md)
conserva tredici vincoli normativi e fonti primarie di mercato, raccordi letti
e quattordici prove proposte. Fonti SRD5.2.1 EN/IT con gli hash già fissati;
nessuna prova runtime dei prodotti o codice aggiunto da questa ricerca.

Si distinguono forma dello stesso soggetto, creatura collegata con identità
propria ed effetto posizionato che non è una creatura. I-040/041/110/111 restano
acquisiti. Le regole2024 su PF/Dadi Vita, PF temporanei, forme note, equipaggiamento,
concentrazione, fine/ritorno e iniziativa non si deducono dagli esempi2014
presenti nella documentazione di un VTT. Foundry/Beyond/Shard/BG3/Solasta e
Roll20/Owlbear illuminano interazioni differenti, con limiti dichiarati.

La sintesi propone ingresso da Extra/capacità/Tavolo sul medesimo stato,
preview della forma, controlli distinti da visibilità e chiaro soggetto
selezionato. GAP-13 rimane aperto: la ricerca prepara il seguito, non scavalca
le verifiche dei riposi né dichiara già costruite trasformazioni o evocazioni.


## R194 — condizioni e sopravvivenza nello stesso Tavolo e scheda

Consultazione del23/09/2026. [Ricerca dettagliata](../../changes/interview-01/blueprint-conditions-research.md)
conserva SRD5.2.1 EN/IT immutabile,17 vincoli,15 condizioni, fonti/limiti e16
prove proposte. Non sono prove eseguite o un nuovo consenso dell’owner.

Pattern pubblicati: [Foundry Active Effects](https://foundryvtt.com/article/active-effects/)
separa base ed effetti; [D&D5e6.0.0](https://github.com/foundryvtt/dnd5e/wiki/Active-Effects)
lega scadenze a fonte/bersaglio e riposo; [Beyond Maps](https://www.dndbeyond.com/posts/2212-condition-tracking-comes-to-the-maps-vtt)
collega condizioni di token e scheda. Roll20 Header/Sidebars e Fantasy Grounds
forniscono pannello vitale, fonti/visibilità e dettaglio espandibile; BG3 Patch1
e Solasta forniscono precedenti di persistenza/feedback, con differenze dalle
regole da tavolo documentate nel rapporto. Nessun runtime concorrente provato.

Sintesi delegata: stato vicino ai PF, dettaglio contestuale unico, origine e
termine espliciti, fonti simultanee distinte, richieste fisiche/digitali e
correzioni persistenti. Strisciare2×/3×, Prono residuo dopo risveglio, politica0PF,
concentrazione e knockout2024 sono vincoli diversi. Non copiare Incapacitato
immobile da Solasta né il knockout2014 a0PF. Le scadenze non sono fine-round
universale; nessun timer reale sostituisce il tempo narrativo.

Normalizzazione del costo di rialzata e raccordi di eventi sono dettagli
tecnici da fissare nel piano, non quesiti da delegare all’owner. Fonti private,
modifiche di autorità, cataloghi completi e casi non automatizzati restano
espliciti; non si dichiara completa la famiglia da un elenco di condizioni.
