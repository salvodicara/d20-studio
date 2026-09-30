# Esperienza del prodotto — sito e tavolo di gioco

**Direzione prevalente D-013/I-218, 23/09/2026:** l'owner valuta un unico
[blueprint visuale navigabile](BLUEPRINT_CONTRACT.md) completo; il Markdown
rimane sincronizzato per gli agenti, senza lettura obbligatoria dell'owner.
Prototipo locale e codice dimostrativo sono ora autorizzati prima dell'accordo
sul contratto; l'implementazione reale segue la baseline approvata. Grafica
provvisoria consentita, copertura funzionale da verificare. I precedenti divieti
di prototipazione nei passaggi storici sotto sono superati in questo perimetro.
[NEXT](../NEXT.md) conserva il solo punto operativo e il Goal aggiornato.

**Raccordo I-215–I-217, 23/09/2026:** confronto aperto al mercato in
[REFERENCE_COVERAGE](REFERENCE_COVERAGE.md); [HB](HOMEBREW_FLOW.md) collega
contenuti riutilizzabili e partita senza aggiornamenti silenziosi. Nessuna
nuova illustrazione o stile approvato. Stato e prossimo lavoro soltanto in NEXT.

**Raccordo del personaggio I-213/I-214, 23/09/2026:**
[CRE](CHARACTER_CREATION.md)/[ADV](CHARACTER_ADVANCEMENT.md) dettagliano ingresso,
scelte e applicazione sulla scheda usata per giocare. Fonti e limiti registrati;
nessuna nuova illustrazione o approvazione estetica. Prossimo blocco solo in
[NEXT](../NEXT.md), senza riaprire i comandi ordinari già delegati.

**Composizione I-212, 23/09/2026:** [NAVIGATION](NAVIGATION.md) fissa il raccordo
ordinario fra accessi generali, campagna e Tavolo, con fonti e adattamenti.
Lo schema navigation-v1 mostra la gerarchia degli ingressi; i percorsi completi,
ritorni e servizi sono nel Markdown. Non è layout finale né contratto completo.

**I-209, 23/09/2026:** mostrare una scelta già istruita e adottata dall'agente
con precedente e motivo, non chiedere un giudizio ordinario. [DESIGN_SOURCES](DESIGN_SOURCES.md)
separa pattern verificati, composizione e lacune. Le visite storiche non
stabiliscono il layout finale e la loro consultazione non è approvazione.

**Priorità I-205/I-206:** la composizione corrente dell'intera app è in
[APP_BLUEPRINT](APP_BLUEPRINT.md). Le visite sotto sono prove parziali conservate,
non il piano completo. Per il prossimo lavoro leggere soltanto [NEXT](../NEXT.md);
le indicazioni di sequenza precedenti sotto sono storiche.

**Precedenza I-198/I-202, 22/09/2026:** l'owner conferma la delega; partecipare
alle interazioni principali non significa chiedergli un parere a ogni visita.
Se precedenti pertinenti e indicazioni precedenti chiariscono la direzione,
scegliere e avanzare. Per un dubbio sostanziale ancora aperto, spiegare cosa
provare e quale scelta chiarisce; distinguere interazione, contenuti e qualità grafica.
Una visita semplice non definisce il livello estetico finale. Le scorciatoie
a posizioni/direzioni fisse di movement-area-v1 non erano controlli di prodotto
e non permettevano di giudicare la libertà del gesto: il prossimo esempio la
rende provabile. Nessuno stile approvato, nessuna delega ordinaria revocata.

**Precisazione I-190:** l'owner delega esplicitamente le scelte UX ordinarie
e vuole che l'agente sintetizzi i riferimenti. Q163 è risolta dall'agente:
base A, scena protagonista, risorse/azioni essenziali visibili e dettagli
apribili/fissabili. Nessuna preferenza A attribuita all'owner, nessuna scelta B
ricavata dall'esplorazione del widget. Supporti visivi I-189 autorizzati;
contratto completo, stile definitivo e implementazione restano da approvare.

21/09/2026, I-188. Definizione UX in Markdown, non direzione visiva approvata.
L'owner vuole concentrarsi su come il sito appare e si usa: una combinazione
di sito e videogioco, comoda e intuitiva, con Foundry e BG3 come riferimenti.
L'inventario continua su delega I-180; non è più il centro della conversazione.

## Lettura della richiesta

La distinzione utile è fra preparare/consultare e giocare. Sono contesti
proposti dell'esperienza, non due app, due raccolte di personaggi o una
nuova navigazione già approvata.

- **Fuori dalla partita:** trovare personaggi e campagne, leggere, organizzare
  e modificare con spazio e chiarezza. Esempi: avanzare di livello, preparare
  una scena, scrivere il riepilogo della sessione.
- **Durante la partita:** mantenere il contesto di gioco mentre si sceglie
  una mossa, si controlla una risorsa o si risponde a una richiesta. Esempi:
  leggere una magia senza perdere il bersaglio, controllare l'inventario
  senza smarrire il punto della mappa, correggere un tiro dal relativo esito.

La sensazione di videogioco va definita attraverso la continuità delle
interazioni, il feedback e l'accesso immediato alle azioni. Non deduciamo
animazioni 3D, cineprese, attese reali, cosmetici o una grafica già scelta.

## Prima scelta di esperienza — Q163

**Risolta dall'agente su delega esplicita I-190 il 21/09/2026: opzione 1.**
Le alternative seguenti conservano la storia del confronto; non sono un voto
ancora richiesto all'owner.

1. **Scena protagonista — consigliata:** spazio ampio alla mappa; informazioni
   e comandi essenziali del personaggio sempre disponibili. Scheda, inventario
   e registro si aprono al bisogno e possono rimanere fissati.
2. **Postazione completa:** mappa, scheda sintetica e registro già affiancati
   all'ingresso. Più informazioni visibili contemporaneamente, meno spazio
   per la scena e maggiore densità iniziale.

Una sola dimensione: l'apertura predefinita dei contenuti durante la partita.
Non è una scelta di palette, decorazione, componenti, dimensioni in pixel o
funzioni da escludere. Entrambe mantengono accesso alla scheda completa.

**Decisione dell'agente:** prima opzione per la centralità del gioco
chiesta dall'owner e l'uso abituale da laptop; la verifica di comodità deve
avvenire in seguito. Foundry documenta scena, pannelli, accesso alla scheda
e comandi rapidi; Owlbear documenta strumenti di scena e pannelli contestuali,
R161. La composizione proposta è un nostro adattamento, non una replica
pixel per pixel già osservata. È un default adottato su delega, non una
composizione grafica approvata nell'interezza.

## Come procediamo dopo I-190

Metodo operativo dell'agente, derivato da I-180/I-188/I-189/I-190 e dalla
ricerca R160. Non richiede un altro sì dell'owner per iniziare.

**Precisazione I-191:** controllo operativo in [COVERAGE](COVERAGE.md), con
le voci F, le aree A e i lavori J già inventariati. Ogni lacuna rimane visibile;
una funzione nominata non è una funzione completamente definita. Fonti e
adattamenti restano separati, i pattern documentati non provano da soli l'ottimo.

1. **Comporre una base coerente.** L'agente sceglie layout e interazioni
   ordinarie da fonti verificate, dichiarando gli adattamenti. Le alternative
   servono quando chiariscono un vero problema, non come obbligo di voto.
2. **Mostrare situazioni complete.** Ogni blocco illustra cosa vede e fa una
   persona dall'ingresso al risultato. La spiegazione segue il percorso;
   niente inviti a leggere il ledger come prerequisito per capire l'app.
   Prima indicare in una o due frasi cosa mostra la visita. Richiedere un giudizio
   soltanto per un dubbio sostanziale, precisando gesto, informazioni o resa visiva
   da provare e la scelta da chiarire. Quando il gesto è sotto esame, riprodurne libertà e conferma;
   etichettare apertamente qualsiasi scorciatoia o parte non rappresentata.
3. **Controllare la copertura.** Collegare ogni funzione già confermata o
   adottata su delega a un percorso, una superficie e controlli raggiungibili.
   Dove manca la definizione, conservarla come lavoro aperto. Le capacità
   pertinenti scoperte nella ricerca seguono la stessa delega; nessuna
   promessa di avere già individuato ogni funzione possibile.
4. **Verificare la coerenza.** Ruoli, regole, dati condivisi, annullamento,
   correzioni, EN/IT, tastiera/touch e rete devono funzionare anche attraverso
   più aree. Distinguere descrizione, simulazione illustrativa e futura
   evidenza di un prodotto in esecuzione.
5. **Consolidare l'insieme.** L'agente mantiene il contratto Markdown e prepara
   una sintesi visiva leggibile dell'intero prodotto per la sua approvazione
   esplicita. Poi sviluppo per percorsi completi, prove di risultato e
   revisione distinta secondo WORKFLOW. Nessun avvio dell'implementazione ora.

**Ruolo dell'owner, precisato da I-198/I-202:** partecipa ai dubbi sostanziali
sui gesti principali e sulle informazioni attraverso situazioni concrete.
Quando precedenti e indicazioni chiariscono la direzione, l'agente prosegue
senza chiedere un parere. Arriva con ricerca e raccomandazione; non scarica sull'owner
completezza, verifiche, dettagli ordinari o scelta fra alternative equivalenti.
Restano le domande per scopo, autorità, privacy, costi e conflitti sostanziali.
La presenza di due layout plausibili non impone un voto; la delega non esclude
il confronto attivo su come si gioca. Clic e silenzio non sono approvazioni.

**Ordine di progettazione, non priorità di rilascio:** tavolo del giocatore
ed esplorazione/combattimento; scheda, inventario, magie, avanzamento e homebrew;
preparazione e conduzione del DM, scene/mappe e contenuti; campagne, gruppo,
diari e organizzazione; servizi trasversali e controllo finale di AGENDA/FEATURES.
L'ordine serve a stabilire una grammatica comune e provarla sulle altre aree.

**Quando coinvolgere l'owner, I-202:** una visita esplicativa non richiede
automaticamente un giudizio. Se resta un dubbio sostanziale, indicare quel dubbio
e la prova concreta utile a risolverlo, ad esempio quale gesto confrontare
o quale informazione cercare. Dire separatamente se la grafica è provvisoria.
L'owner non deve trovare tutti i bug o garantire che il contratto sia completo.
La qualità visiva richiede durante la progettazione un esempio sufficientemente
curato da valutarla: gerarchia, atmosfera, leggibilità e densità, con riferimenti
verificati. Un sì al gesto non approva automaticamente colori, grafica o stile.
Il feedback sui punti principali non sospende ricerca e lavoro indipendente.
Non esclude aree non nominate nella sintesi e non riduce lo scopo confermato.

### Prossimo blocco concreto: una visita del tavolo

La [prima visita scritta](COMBAT_EXPLORATION.md#prima-visita--preparare-iniziare-e-concludere-lo-scontro)
ora precisa preparazione, iniziativa, avvio e conclusione ordinari, I-192/R162.
Il raccordo dei turni di esplorazione è ora precisato da I-194/R163; table-v1
illustra il primo percorso qui sotto. Q163-v1 resta soltanto il confronto
storico di densità. I-196/I-197 e movement-area-v1, sotto, sviluppano movimento,
aree e azioni senza bersaglio; proseguire con reazioni/interruzioni e lacune
residue, senza un nuovo voto sul layout.

Usare il [tavolo concettuale](pages/game-table.md) e i riferimenti già conservati.
Mostrare la stessa situazione attraverso questi passaggi, con una sola base A:

- Ingresso nel tavolo ed esplorazione: scena, personaggio, dettagli raggiungibili.
- Passaggio al combattimento: ruolo del DM e ordine dei turni; verificare
  i dettagli ancora aperti prima di presentarli come comportamento acquisito.
- Scelta e ripensamento: movimento/azione, bersaglio o area, costo e preview.
- Tiro fisico o digitale, eventuali richieste e reazioni secondo i tempi pertinenti.
- Esito, breakdown e conseguenze; correzione del proprio errore dal risultato.

Aprire scheda, magia o inventario deve lasciare comprensibile il contesto.
Il racconto non deve far sembrare eseguita una preview o inventare regole
per riempire una figura. Pannelli fissabili sono nel comportamento adottato,
ma Q163-v1 illustra soltanto aperture/chiusure e non dimostra il fissaggio.
L'agente registra le lacune e le affronta; nessuna nuova domanda già prenotata.

### Visita illustrativa table-v1

21/09/2026, prodotta su autorizzazione I-189/I-190 e richiesta di proseguire
concretamente. Otto stati della stessa scena fittizia: esplorazione libera,
turni comuni, iniziativa, preview privata nel turno altrui, tiro nel proprio
turno, esito, correzione immediata, ritorno all'esplorazione dopo una tregua.
Il ruolo visibile cambia esplicitamente fra giocatrice e DM.

- **Interazioni illustrative:** passaggi avanti/indietro, scheda/inventario/
  registro apribili, chiusura con Escape, «Finito», confronto spada/arco,
  annullamento preview, viste del tiro fisico/digitale, anteprima e applicazione
  della correzione fittizia. La scelta dell'arma si conserva nei passaggi
  successivi: movimento, nome dell'attacco, freccia e cronologia coerenti.
- **Esempio dichiarato:** dado 14, modificatori +3/+2, totale 19, danni 4+3;
  correzione esemplificativa del dado a 8, nuovo totale 13 e rimozione dei
  danni nel caso immediato. Numeri, creature ed esiti sono fittizi; le caselle
  numeriche mostrano esempi fissi. Nessun generatore di dadi o motore di regole.
- **Limiti:** non prova persistenza di gioco, sincronizzazione, permessi,
  concorrenza o offline. Non consente mosse arbitrarie. Sagome d'area, reazioni,
  UI di correzioni tardive e pannelli fissati non sono rappresentati. Lo stile
  resta provvisorio; nessun contratto completo o app approvati.
- **Sorgente e prove:**
  `/Users/salvatoredicara/Workspace/Codex/d20-studio-visuals/table-walkthrough-v1/`.
  La copia identica `tavolo-in-azione.html` nella cartella visualizzazioni
  della conversazione è il percorso di consegna compatibile con l'host,
  già richiesto dal problema di lettura Q163-v1. Nessun artefatto in Documents.
- **Punto successivo:** aree e multibersaglio, azioni senza bersaglio, poi
  interruzioni/reazioni. Proseguire la stessa scena e i documenti del tavolo;
  non richiedere un altro sì su ogni capacità già delegata.

### Visita illustrativa movement-area-v1

21/09/2026. I-195 ribadisce la delega e richiede PNG mobili, profondità dei VTT,
semplicità BG3 e cura visiva. I-196/R164 e I-197/R165 precisano i casi ordinari
in [TABLE_MOVEMENT](TABLE_MOVEMENT.md) e [TABLE_ACTIONS](TABLE_ACTIONS.md).
La stessa base A di table-v1 mostra un nuovo episodio sintetico in quattro stati:

1. Il DM seleziona Goblin 1, trascina verso la destinazione indicata e rilascia
   per eseguire 3 m di movimento. Misura e costo visibili; alternativa clic/tastiera
   sulla destinazione e annullamento prima dell'esecuzione.
2. Livia prepara Mani brucianti: cono da sé di 4,5 m, due direzioni illustrative,
   elenco delle creature note e avviso sull'alleato. Ruotare esclude Doran;
   annullare non consuma; il comando di lancio avvia la risoluzione.
3. La visita mostra attese e modalità dei dadi. Un'azione e uno slot consumati
   nel caso ordinario illustrato; nessuna generalizzazione ai casi interrotti.
4. Tiro danni comune 11; TS dei goblin 10/16 contro CD 14, danni 11/5.
   Doran, se incluso, resta pendente fino alla risposta fisica di esempio.

**Limiti:** posizioni, orientamenti e numeri fissi, pedine schematiche senza
ingombro normativo. Nessun calcolo geometrico generale, pathfinding, IA, motore
di regole, sincronizzazione, salvataggio di partita o prova di permessi reali.
La navigazione fra stati è un comando della visita, non un modo per saltare
turni o consumi nel prodotto. I tiri di questa fixture sono condivisi; ciò non
stabilisce la visibilità generale. Stile provvisorio e contenuti fittizi.
Azioni senza bersaglio descritte nel Markdown, non ancora illustrate qui.

**Sorgente e prove:**
`/Users/salvatoredicara/Workspace/Codex/d20-studio-visuals/movement-area-v1/`.
Frammento `movimenti-e-aree.html`; wrapper di verifica `preview.html`.
**Copia di consegna inline**, regolare e identica al sorgente:
`/Users/salvatoredicara/.codex/visualizations/2026/09/12/01a0970e-5265-7b80-905c-4b4deb07eb8c/movimenti-e-aree.html`.
L'eccezione di consegna nel percorso host rimane limitata al frammento; prove
e memoria del progetto restano in Workspace. Q163-v1 e table-v1 conservati.

Prossimo blocco: reazioni/interruzioni, richieste concorrenti, consumo e ripresa
al momento specifico; poi geometrie e multibersaglio residui. Nessuna nuova
domanda attiva o approvazione globale implicita. Una vera eccezione verrà
sottoposta con fonti, conseguenze e raccomandazione.

### Visita illustrativa direct-table-v1

22/09/2026, risposta a I-198 e raccordo I-199/R166. Obiettivo del confronto:
riuscire a indicare liberamente la mossa sulla mappa, comprendendone costo e
coinvolti prima dell'esecuzione. L'owner valuta i gesti e le informazioni;
correttezza, copertura ed errori rimangono responsabilità dell'agente.
La grafica è provvisoria e non è oggetto di approvazione in questa visita.

- Movimento del PNG tramite trascinamento/rilascio o selezione e punto libero
  sulla mappa, con tragitto e costo nella preparazione e residuo aggiornato.
- Cono ancorato alla maga, orientabile liberamente mediante puntamento;
  elenco delle creature note e alleato coinvolto aggiornati. Il comando
  «Lancia Mani brucianti» resta distinto dalla regolazione dell'area.
- Vista spostabile e zoom senza eseguire mosse; alternative visibili e tastiera.
  Annullamento della preparazione e ripartenza dell'esempio riconoscibili.

Lo spazio di prova è privo di ostacoli; distanza euclidea e indicatori puntuali
rendono esaminabili i gesti. Non dimostrano collisioni, griglie normative,
taglie, pathfinding, animazioni finali, motore D&D o sincronizzazione di partita.
La conclusione del lancio chiude l'esempio: non inventa tiri, danni o risoluzioni.
Cambiare modalità della visita serve a esaminare due gesti, non definisce una
transizione di ruolo o una regola di recupero. La cronologia delle altre visite
resta disponibile; i relativi pulsanti fissi non erano comandi del prodotto.

**Sorgente e prove:**
`/Users/salvatoredicara/Workspace/Codex/d20-studio-visuals/direct-table-v1/`.
Frammento `tavolo-gesti-diretti.html`, con wrapper e prove nella stessa cartella.
**Copia di consegna inline** regolare e identica al sorgente, da usare nel riferimento:
`/Users/salvatoredicara/.codex/visualizations/2026/09/12/01a0970e-5265-7b80-905c-4b4deb07eb8c/tavolo-gesti-diretti.html`.
Verifiche e limiti effettivi sono registrati nel task. L'esplorazione salva
soltanto lo stato illustrativo e non costituisce scelta o approvazione owner.

Il riscontro ricevuto sui gesti principali non introduce un nuovo blocco:
I-202 precisa di non chiedere altri pareri sui punti già chiari; ricerca
e verifiche indipendenti su reazioni/interruzioni proseguono.

## Criteri per riconoscere un risultato riuscito

Proposta operativa derivata da I-058/I-113/I-188, da verificare nelle fasi autorizzate:

I-193 ribadisce la qualità visiva come parte dell'obiettivo principale:
curare gerarchia, leggibilità, coerenza e feedback insieme alla profondità
delle funzioni. I riferimenti guidano le soluzioni; uno stile specifico
non è ancora approvato. La bellezza deve convivere con semplicità e accessibilità.

- Dal tavolo si trova la mossa disponibile e se ne capiscono costo e bersaglio.
- Aprire informazioni non esegue azioni e non cancella la pianificazione.
- È riconoscibile ciò che è soltanto preview, ciò che aspetta un input e ciò
  che è già avvenuto, anche senza basarsi soltanto sul colore.
- Dopo la risoluzione si capisce cosa è cambiato e si raggiunge la correzione.
- Le funzioni avanzate non richiedono preparazione o pannelli inutili per il
  gioco ordinario. Rimangono raggiungibili con percorsi espliciti.
- Le informazioni del DM e le note personali rispettano i permessi in ogni vista.
- Non occorre chiudere e ricostruire il contesto per consultare una magia o
  un oggetto durante la partita.

Sono criteri di verifica, non risultati misurati o promesse di perfezione.
Pagine e comportamenti alimentano il contratto completo; non autorizzano mock.

## Dalla definizione al prodotto

La [ricerca sugli agenti](AGENT_DELIVERY_RESEARCH.md) documenta evidenze,
limiti e metodo consigliato. Ogni pagina deve portare a criteri osservabili
e prove: l'esistenza di documenti o screenshot non dimostra il funzionamento.
Nessuna nuova installazione o orchestrazione è necessaria per iniziare questa
definizione, e le skill esistenti restano conservate.

### Visita illustrativa direct-table-v2

22/09/2026, feedback I-200 e scelta delegata I-201, fonti R167/R168.
**Obiettivo da dichiarare:** capire dove si fermerà davvero la pedina prima
di confermare e riuscire ad annullare uno spostamento già eseguito.
Nessun nuovo giudizio su stile definitivo o contratto complessivo.

- Punto oltre il budget: linea consentita continua, eccedenza rossa/tratteggiata
  e sagoma alla fermata effettiva. La conferma esegue solo il tratto raggiungibile.
- Annulla spostamento/Ctrl+Z/⌘Z ripristina posizione e budget dell'esempio semplice.
  Esc elimina la preparazione, senza riavvolgere una mossa conclusa.
- Nessuno Scatto implicito, movimento residuo accodato o ripristino di danni fittizi.
  L'esempio non contiene reazioni, eventi condivisi o movimento animato da interrompere.
- Area e consultazione della vista conservano la libertà di direct-table-v1.
  Distanza euclidea su terreno libero: non prova costi generali, griglia,
  ostacoli, collisioni, autorità condivisa o annullamento di sequenze complesse.
- Limite osservato a 320 px: nella scena affollata nomi, pedine e indicatori
  possono sovrapporsi. La cattura su terreno libero rende leggibile il gesto,
  ma non risolve questo limite né approva una gestione generale delle sovrapposizioni.

**Sorgente e prove:**
`/Users/salvatoredicara/Workspace/Codex/d20-studio-visuals/direct-table-v2/`.
Frammento `tavolo-movimento-annullabile.html`; direct-table-v1 conservata.
**Copia di consegna inline:**
`/Users/salvatoredicara/.codex/visualizations/2026/09/12/01a0970e-5265-7b80-905c-4b4deb07eb8c/tavolo-movimento-annullabile.html`.
Verifiche e limiti effettivi nel task e in VERIFICATION.md della cartella sorgente.
Lo stato salvato dell'esempio non è una preferenza o approvazione dell'owner.

### Visita illustrativa reactions-v1

22/09/2026, I-203/I-204 e R169/R170. Mostra l'avanzamento del contratto,
non apre una richiesta di approvazione. Scopo: rendere visibili evento,
scelta, consumo e ripresa senza confondere chiusura del pannello e rinuncia.

La visita comincia quando il movimento è già interrotto: Livia ha percorso
3 m di 6 m preparati, restano 6 m di budget. Il Goblin guerriero ha usato
la propria reazione e colpito con 14+4=18 contro CA 14; nessun danno ancora.
Il totale nemico è pubblico soltanto nella fixture. I prerequisiti completi
sono in [TABLE_REACTIONS](TABLE_REACTIONS.md#visita-illustrativa--il-colpo-durante-il-movimento).

- Usa Scudo porta CA a 19, spende la reazione di Livia e uno slot; il colpo
  manca. Il percorso valido prosegue automaticamente per gli ultimi 3 m.
- Rinuncia conserva risorse di Livia. Il DM risolve il danno con d6 digitale
  dimostrativo 3+2=5 o input fisico valido. Poi Livia può continuare il
  percorso o cambiare mossa dalla posizione raggiunta, conservando danni e costi.
- Riduci/Esc conserva la richiesta pendente; riaprire ritrova il contesto.
  La bozza del dado fisico non diventa un risultato senza conferma.

La vista passa esplicitamente al DM per il tiro nemico, senza concedere
questo controllo al giocatore nel prodotto. Dati sintetici, tiro digitale
preimpostato dichiarato; niente prova di casualità, rete o sequenze generali.
Non ci sono concentrazione, Controincantesimo, richieste simultanee o geometria
normativa. La visita non torna a validare il gesto libero già mostrato in v2;
parte dall'interruzione per mostrare la richiesta. Stile ancora provvisorio.

**Sorgente e prove:**
`/Users/salvatoredicara/Workspace/Codex/d20-studio-visuals/reactions-v1/`.
Frammento `reazioni-e-ripresa.html`, evidenza effettiva in VERIFICATION.md e task.
**Copia di consegna inline:**
`/Users/salvatoredicara/.codex/visualizations/2026/09/12/01a0970e-5265-7b80-905c-4b4deb07eb8c/reazioni-e-ripresa.html`.
Stato del widget distinto da preferenze e approvazioni. Le visite precedenti restano conservate.

### Visita illustrativa app-journey-v1

22/09/2026, I-207/I-208. Prima visita collegata dopo APP_BLUEPRINT: Livia,
personaggio fittizio, apre Campagna, legge il riepilogo precedente, entra al
Tavolo, consulta inventario/nota e torna al gruppo o alla scheda. Le viste
conservano gli stessi dati di esempio; uscire dal Tavolo non conclude la
sessione. Le sei pagine concettuali iniziali sono ora indicizzate in PAGES,
ma questa visita ne rappresenta soltanto tre.

Scopo: vedere i collegamenti e la continuità del contesto. La nota è un mezzo
per rendere osservabili bozza, Salva e Annulla fra viste; non riapre l'intervista
sulle note o stabilisce da sola la politica universale di autosalvataggio.
Solo io è indicato anche dentro la Campagna. Una bozza conservata durante la
navigazione non sostituisce il testo salvato; il ritorno alla scheda la ritrova.

L'esempio usa Livia maga di livello 3, PF 20/20, CA 13 e movimento 9 m, senza
costruzione meccanica attestata. Inventario e valori sono fixture dimostrative;
non sono i dati della precedente visita sulle reazioni. La mappa è statica
con dicitura «qui esploriamo i collegamenti»: nessun gesto tattico illustrato,
regola risolta, dado tirato o geometria verificata.

Stile provvisorio; nessuna scelta estetica richiesta o approvata. Dati solo
nell'esempio: il ripristino nella prova browser usa il contenitore di test,
non un server dell'app. Non rappresentati login, creazione completa, inviti,
DM, Preparazione, Biblioteca, multiplayer, conflitti o protezione reale dei
segreti. Lo stato utile al modello contiene vista/stato della bozza e
`productChoiceConfirmed: false`, senza il testo della nota personale.

Sorgente e prove in
`/Users/salvatoredicara/Workspace/Codex/d20-studio-visuals/app-journey-v1/`.
Copia di consegna identica:
`/Users/salvatoredicara/.codex/visualizations/2026/09/12/01a0970e-5265-7b80-905c-4b4deb07eb8c/app-percorso-collegato.html`.
Risultati effettivi, hash e limiti nel task e in VERIFICATION della visita.
La consultazione del supporto non approva prodotto, stile o implementazione.
