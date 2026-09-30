# Tavolo — aree, più bersagli e azioni senza bersaglio

**Stato:** adottato su delega I-180/I-190/I-195, 21/09/2026; decisione I-197, ricerca R165.
Definizione concettuale dell'agente, non nuova conferma dell'owner né contratto completo approvato.
Continua [il raccordo del tavolo](COMBAT_EXPLORATION.md) e I-016–I-025/I-182.
Fonti documentali; nessuna prova dei prodotti in una partita reale o implementazione dimostrata.

## Grammatica comune

Scegliere una mossa apre una preparazione privata con requisiti, costo, gittata e risultato atteso.
Prima di eseguire si possono cambiare mossa, percorso, area e scelte consentite oppure annullare.
La preparazione non consuma risorse, non pubblica intenzioni e non esegue automaticamente al proprio turno.
Il comando finale descrive l'azione concreta; non aggiungere una seconda conferma ordinaria.
I-016 conserva il clic sul bersaglio per l'attacco singolo con mouse; non estenderlo a ogni gesto.
I momenti di consumo dipendono dalla capacità: selezione, conferma, movimento, tiro ed effetto sono eventi distinti.
Interruzioni e regole specifiche possono modificarli; nessuna regola universale di addebito o rimborso.

## Area — posizionare, orientare, confermare

Precisazione I-198/I-199: direzione e punti consentiti sono indicati liberamente
sulla mappa. I pulsanti delle due direzioni in movement-area-v1 erano scorciatoie
dell'esempio, non la grammatica finale. Per valutare il gesto occorre provarne
il puntamento continuo; forma, origine e dimensioni restano vincolate dalla capacità.

Selezionare la capacità prepara la forma e le dimensioni previste dalla sua revisione di regola.
La sagoma segue il puntamento; trascinare l'origine e ruotare sono operazioni di preparazione riconoscibili.
Il punto d'origine è mobile solo quando l'effetto lo permette, entro gittata e altri vincoli applicabili.
Per un cono che parte dall'incantatore si cambia direzione; l'origine segue la sua posizione prevista.
Un movimento preparato aggiorna insieme percorso, costo e area dalla destinazione, senza garantire l'arrivo.
Il rilascio dopo una regolazione della sagoma non lancia da solo: il comando esplicito è «Lancia [incantesimo]».
Mouse, tastiera e touch devono permettere le stesse scelte; tasti, maniglie e tolleranze restano da verificare.

Le creature note nell'area sono evidenziate sulla scena e raccolte in un elenco sincronizzato.
Per un effetto che coinvolge ogni creatura, l'elenco comprende amici e nemici: nessun filtro automatico agli alleati.
Il riepilogo dice «creature note», senza rivelare presenza, numero, statistiche o posizione dei soggetti nascosti.
Cambiare area aggiorna l'elenco; non sostituisce l'area con una scelta tattica automatica dell'app.
Una posizione invalida per un motivo noto mostra il motivo e impedisce l'esecuzione ordinaria.
Un alleato nell'area o l'assenza di creature note non costituiscono, da soli, un divieto della regola.
Gli ostacoli noti sono considerati secondo l'effetto; l'interfaccia non svela impedimenti segreti attraverso la preview.
Alla conferma si ricontrollano stato e scelte: se non sono più realizzabili, si conserva la preparazione e si spiega il problema consentito.
La correzione o deroga del DM resta disponibile e tracciata; non serve il suo permesso per ogni azione ordinaria.

Il precedente è [Foundry, Measurement and Templates](https://foundryvtt.com/article/measurement/),
pagina corrente consultata il 21/09/2026, con riferimenti a V13 ma senza build client verificata:
spostamento, rotazione e regolazione fine delle sagome, caselle evidenziate su griglia.
La preview privata, i vincoli della capacità, l'elenco noto e la conferma unica sono il nostro raccordo.
Il default geometrico del prodotto non viene assunto come regola normativa D&D.

## Esempio illustrativo — Livia e Mani brucianti

Scenario sintetico: Livia può lanciare l'incantesimo di 1º livello; CD 14, componenti e risorse disponibili.
Due goblin e Doran, suo alleato, sono visibili. Nessuna copertura, resistenza, reazione pertinente o oggetto infiammabile.
Le posizioni dell'esempio sono considerate dentro o fuori dal cono; le pedine
sono indicatori schematici, non ingombri normativi. Nessuna disputa geometrica simulata.
Livia seleziona «Mani brucianti»: cono di 4,5 m ancorato a lei, azione, slot di 1º livello, TS Destrezza, 3d6 fuoco.
La prima direzione comprende anche Doran; l'elenco lo mostra insieme ai goblin e segnala che sarà coinvolto.
Livia ruota il cono fino a includere i due goblin ed escludere Doran, poi usa «Lancia Mani brucianti».
Il lancio avvia una risoluzione con due richieste di TS e un tiro danni comune, non due danni indipendenti.
Ogni tiro supporta dadi digitali o fisici con valori naturali, modificatori e totale leggibili secondo I-026/I-027.
Nello stato intermedio i due TS dei goblin attendono il DM; la visita ne mostra
poi i risultati digitali. L'eventuale tiro fisico pendente appartiene a Doran,
nel ramo che lo include: nessun successo o fallimento viene dedotto dal silenzio.

| Creatura | TS Destrezza contro CD 14 | Esito    | Danni dal tiro comune 4 + 4 + 3 = 11 |
| -------- | ------------------------- | -------- | ------------------------------------ |
| Goblin 1 | 8 + 2 = 10                | Fallito  | 11 fuoco                             |
| Goblin 2 | 14 + 2 = 16               | Riuscito | 5 fuoco                              |

Se Livia conferma una direzione che include Doran, anche lui riceve il proprio TS: resta pendente finché risponde.
Non attribuirgli automaticamente successo, danni zero o esclusione perché alleato; il DM può intervenire esplicitamente.
Il dettaglio separa tiro comune, risultato del singolo TS e conseguenza per creatura, come I-182.
Se la scena contiene oggetti infiammabili non indossati o trasportati, l'incantesimo li incendia: questa conseguenza resta nel perimetro.
La visita li omette soltanto per rendere leggibile il caso; non definisce danni o propagazione del fuoco non indicati dalla fonte.

Fonte normativa `srd`, edizione `2024`, revisione immutabile `5.2.1`, hash dei PDF verificati come R162:
[EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), p.114 incantesimo, p.105 gittata incantatore,
pp.177/179 area e cono, p.16 tiro danni comune e metà arrotondata per difetto;
[IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf), pp.163/120/203/206/18 rispettivamente.
Il cono esclude normalmente il punto d'origine, salvo scelta del creatore; larghezza e lunghezza seguono il glossario.
Cambiare livello dello slot aggiorna costo e danni: +1d6 per livello sopra il primo, senza ingrandire automaticamente il cono.

## Più bersagli scelti — distinto dall'area

Una capacità che permette di scegliere più bersagli apre una selezione progressiva con elenco e limiti pertinenti.
Clic o tocco aggiungono/rimuovono i soggetti durante la preparazione; il comando finale esegue l'insieme mostrato.
Una sagoma non sostituisce questa scelta e la vicinanza fra creature non le rende automaticamente bersagli.
Numero, distanza, ripetizione dello stesso bersaglio, ordine e distribuzione degli effetti dipendono dalla capacità.
Mostrare soltanto i vincoli verificati; una scelta divenuta invalida non viene sostituita con un'altra creatura.
Esiti e correzioni restano individuali anche quando la presentazione li raggruppa.
Il tiro danni comune verificato per i TS simultanei non autorizza un unico tiro per qualsiasi attacco multibersaglio.
Il caso concreto selezionato in I-219/R186 è Dardo incantato: distribuzione completa prima del tiro, anche più dardi sullo stesso bersaglio, poi applicazione simultanea. Nel caso 2024 si usa un d4+1 per dardo, come lettura implementativa esplicita conservata nella ricerca, senza trasferire automaticamente convenzioni 2014. Le sequenze di attacchi successivi restano un caso distinto da completare.

## Azioni senza bersaglio

Non richiedere un clic su una creatura o un dado quando la mossa non li prevede.
**Scattare:** conserva I-017; selezione mostra movimento aggiuntivo e costo, il clic su una destinazione valida
che richiede Scattare conferma l'azione, la consuma e avvia il movimento. Eccezioni e interruzioni non sono chiuse qui.
**Nascondersi:** conserva I-018/I-020/I-021/I-025; requisiti noti, costo e tiro sono visibili prima di «Tenta di nasconderti».
Può seguire movimento preparato; l'azione si consuma al tiro effettivo, non all'apertura o all'inserimento tardivo del risultato fisico.
Un impedimento evidente rende il tentativo indisponibile con spiegazione; non si tira né si consuma per quel tentativo impedito.
**Schivata:** selezione spiega beneficio e durata, «Schiva» esegue l'azione e registra l'effetto senza un tiro o bersaglio artificiale.
Fino all'inizio del turno successivo, gli attacchi contro il personaggio hanno svantaggio se vede l'attaccante;
i suoi TS Destrezza hanno vantaggio. I benefici si perdono se è incapacitato o la sua velocità è 0.
**Disimpegno:** selezione spiega l'effetto, «Disimpegnati» esegue l'azione; il suo movimento non provoca attacchi
di opportunità per il resto del turno. Non conferisce movimento extra né neutralizza ogni altro pericolo.
SRD 5.2.1/2024: EN pp.180–181; IT Scatto p.214, Schivata p.215, Disimpegno p.207, ai link normativi sopra.
I verbi dei pulsanti non cambiano i nomi ufficiali IT delle azioni. Le versioni da capacità speciali conservano i propri costi.

## Stato, salvataggio, annullamento e ripresa

| Stato visibile                       | Comportamento                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Preparazione privata                 | Si modifica o annulla senza conseguenze. «Salvata» compare solo quando la conservazione è confermata; non significa eseguita.   |
| Invio in corso / esito da verificare | Mostrare che la conferma non è ancora riscontrata. Non inviare una seconda esecuzione come tentativo di recupero.               |
| In attesa di un tiro o scelta        | Conservare la richiesta, il responsabile autorizzato e i risultati già ricevuti; consultare il tavolo rimane possibile.         |
| Risolta                              | Mostrare conseguenze e dettaglio per creatura; una correzione è un nuovo evento tracciato, non un annullamento silenzioso.      |
| Interrotta                           | Conservare movimento ed effetti già avvenuti; ripresa o nuova scelta dipendono dall'interruzione e dalle decisioni I-023/I-024. |

Chiudere un pannello non annulla una mossa confermata, non cancella un tiro effettuato e non rimborsa risorse.
Una richiesta appartiene a chi controlla legittimamente la creatura; visibilità del tiro e autorità di rispondere sono distinte.
Il DM mantiene correzione e arbitraggio; gli osservatori non ottengono controllo aprendo il dettaglio.
Con connessione assente o dubbia, una bozza non diventa una mossa accettata: mostrare ciò che è locale e ciò che è confermato.
Al ritorno confrontare lo stato corrente, ritrovare le richieste pendenti ed evitare duplicati di tiri, consumi e conseguenze.
Non rilanciare automaticamente una bozza; una richiesta già accettata riprende dal proprio stato verificato.
Le conseguenze dipendenti da un dato mancante restano pendenti; questo non congela indiscriminatamente ogni consultazione.
Persistenza fra dispositivi, durata delle bozze e riconciliazione dei conflitti richiedono ancora una definizione verificabile.

## Fonti di interazione e confini aperti

[DnD5e Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities) distingue tempo, consumo, gittata, bersagli e area;
[Save](https://github.com/foundryvtt/dnd5e/wiki/Activity-Type-Save) documenta TS/CD, danni e visibilità del comando;
[Use](https://github.com/foundryvtt/dnd5e/wiki/Activity-Type-Utility) comprende effetti e attività senza tiro obbligatorio.
Pagine consultate il 21/09/2026, aggiornate il 10/09/2026 e dichiarate allineate a DnD5e 6.0.0; SHA delle wiki non fissato.
Non dimostrano da sole automazione completa, permessi, affidabilità di rete o il nostro raccordo con la preview privata.
Restano aperti bordi, intersezioni parziali, origine nello spazio della creatura, elevazione, volume, griglie e ostacoli incompleti;
nessuna soglia geometrica viene ricavata dal solo core Foundry. Conservare la discrezione del DM.
[TABLE_REACTIONS](TABLE_REACTIONS.md), I-203/I-204, precisa richieste ordinarie,
ordine degli effetti simultanei durante un turno, ripresa e alcune eccezioni di consumo.
Restano da precisare catene speciali, mediazione dei segreti nell’ordine simultaneo,
input fisico già lanciato ma non registrato, correzioni concorrenti e prosecuzione del turno con conseguenze ancora pendenti.
La regola 2024 di Controincantesimo è verificata in R169/TABLE_REACTIONS:
slot del lancio interrotto non consumato sul fallimento, azione usata spesa.
Le catene e i casi particolari richiedono ancora specifica; non generalizzare un rimborso.

## Raccordo con inventario e magie — 23/09/2026

[INVENTORY_FLOW](INVENTORY_FLOW.md) e [SPELLCASTING_FLOW](SPELLCASTING_FLOW.md)
descrivono da dove arrivano oggetti, modalità e risorse prima dell'azione,
e come si ritrovano conseguenze e richieste tornando alla scheda. Non
sostituiscono la grammatica di questo documento o il clic diretto I-016.
Fonti e adattamenti sono separati per gruppo INV/MAG, I-210/I-211.

## Raccordo eseguibile — 23/09/2026, incremento 2

Il Tavolo del [blueprint](BLUEPRINT_STATUS.md) mostra sette mosse del campione
Livia: arma, trucchetto, cono, distribuzione e tre azioni senza bersaglio.
Selezione e preview non consumano; il cono resta fermo dopo il posizionamento.
Per il bersaglio singolo digitale il clic esegue senza un'altra conferma.
Per un attacco fisico, «Ho lanciato i dadi» dichiara il tentativo già effettuato;
le facce possono arrivare dopo senza rimborsare o consumare nuovamente l'azione.

Tiri e risultati conserva richieste, responsabili, risultati e storico delle
correzioni, con visibilità distinta per i dati privati. Una correzione del
danno può ripristinare i PF e riaprire quel tiro, lasciando speso il tentativo;
il vecchio risultato resta leggibile come annullato. La prova locale non
attesta ancora correzioni selettive distribuite o riconciliazione fra dispositivi.

La selezione della mossa usa il pannello contestuale; su telefono la barra
è accanto alla mappa e i collegamenti Mappa/Dettagli mossa restano accessibili
mentre si prepara. È un adattamento responsive dell'artefatto, non un gesto
mobile attribuito senza prova a Foundry o BG3. Regole, costi e grammatica
restano gli stessi nelle due lingue e nei due metodi dei dadi.

[Dominio ed esempi](../../changes/interview-01/blueprint-combat-domain.md) e
[ricerca](../../changes/interview-01/blueprint-combat-research.md) precisano
fonti e limiti. Nessuna dichiarazione di copertura completa di TABLE/MAG.
