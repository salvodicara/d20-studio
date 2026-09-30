# Dai requisiti a un'app verificabile con agenti AI

Ricerca e raccomandazione del 21/09/2026, richiesta esplicita I-188.
Quindici fonti metodologiche e tecniche consultate, più due riferimenti UI
separati in R161. Documentazione, resoconti dei produttori, osservazioni di
una professionista e studi empirici sono distinti sotto. Ricerca estensiva
mirata, non rassegna sistematica di tutta la letteratura.

Nessuno strumento installato o benchmark riprodotto. Nessun cambio di modello,
spesa o implementazione. Il workflow vigente e il gate D-012 rimangono autorità.
Il testo propone come applicare le evidenze a questa app, senza dichiarare
che un processo possa eliminare allucinazioni, errori o cambiamenti futuri.

## Risposta alla domanda del proprietario

È ragionevole cominciare subito a definire l'esperienza concreta in Markdown:
schermate concettuali, contenuti, comandi e percorsi. L'inventario delle funzioni
serve per la copertura, ma non fa immaginare una partita. Continuare ad ampliarlo
senza comporre l'esperienza non risolverebbe il problema espresso dall'owner.

La raccomandazione è un percorso con quattro collegamenti sempre verificabili:
**decisione → esperienza dell'utente → criterio di riuscita → prova del risultato**.
Le implementazioni arriveranno negli stadi autorizzati. Ogni agente deve sapere
quale parte di questa catena possiede, cosa può modificare e come dimostrare
che ha rispettato il contratto. È una sintesi applicata al progetto, non il
nome di un framework né una promessa di generazione automatica perfetta.

I metodi attuali combinano specifiche, contesto persistente, lavoro delimitato
e verifica esterna al racconto dell'agente. Le fonti non dimostrano che una
particolare orchestrazione sia universalmente migliore: compiti, modelli,
strumenti e criteri di valutazione cambiano i risultati. [S01–S09 sotto.]

## Che cosa indicano le evidenze

### Specifiche utili e controllo del cambiamento

Spec Kit separa principi, comportamento, piano e task, includendo controlli
di coerenza; OpenSpec organizza modifiche e scenari; Kiro distingue requisiti,
design tecnico e lavoro eseguibile. Sono precedenti per collegare gli artefatti,
non prove che adottare un altro CLI renda affidabile la nostra app. [S06–S08.]

La critica di Böckeler documenta anche verbosità, duplicazioni e istruzioni
ignorate. La lezione applicata qui è tenere una descrizione corrente leggibile
e riferimenti precisi alla storia, evitando copie divergenti dello stesso
requisito in molte pagine. La storia non si cancella. [S09.]

### Il contesto va scelto, non accumulato indiscriminatamente

Anthropic propone recupero mirato dei documenti, note persistenti e compattazione
curata. I risultati empirici sui file AGENTS.md sono però misti: uno studio trova
costi maggiori senza un miglioramento generale della riuscita, un altro osserva
minore tempo e meno token in un campione diverso. Entrambi qui sono consultati
a livello di abstract, non replicati. Non ricaviamo una regola universale dalla
sola presenza del file. [S05, S14, S15.]

Per questa repository: AGENTS come ingresso e vincoli, uno stato corrente,
link ai soli requisiti del compito. Il lungo ledger resta consultabile.
L'efficacia si misura su compiti reali; non si presume dal numero di documenti.

### Le prove devono riguardare ciò che funziona

I resoconti di OpenAI e Anthropic descrivono applicazioni articolate generate
con controlli e stato persistente, ma riportano anche risultati non pronti
per la produzione e interazioni principali inizialmente mancanti. [S01–S03.]

Per noi un pulsante disegnato non dimostra un'azione funzionante. La verifica
deve osservare anche conseguenze condivise, salvataggio, permessi e ripresa.
Il valutatore legge il contratto e controlla lo stato finale; non basta che
il costruttore scriva «completato». Questo adatta evals e prove UI ai rischi
specifici di un tavolo multiplayer. [S04, S12.]

### Più agenti e più passaggi non sono una garanzia

Il resoconto Anthropic del marzo 2026 ha semplificato la propria orchestrazione
quando è cambiato il modello. Ha conservato una valutazione dove aggiungeva
valore, rilevando anche il rischio di complessità crescente nelle iterazioni.
È un esperimento del produttore, non una misura universale. [S03.]

Qui manteniamo un responsabile del risultato e una revisione distinta, come
richiede WORKFLOW. Eventuali lavori paralleli devono avere confini indipendenti
e un'integrazione precisa. Nessun nuovo agente o automatismo ricorrente è
avviato da questa ricerca. Il modello e lo sforzo scelti dall'owner restano.

### Capacità, velocità percepita e produttività sono misure diverse

METR ha aggiornato l'esperimento sui programmatori evidenziando effetti di
selezione che rendono debole la stima dell'accelerazione. La successiva indagine
su 349 lavoratori raccoglie benefici dichiarati, con limiti di selezione e
autovalutazione. Non usiamo né il vecchio rallentamento del 2025 né le stime
ottimistiche del 2026 come previsione di tempi per questo progetto. [S10–S11.]

## Percorso proposto per d20 Studio

Le fasi sotto mantengono l'ambizione intera e i gate già scelti. I blocchi di
lavoro servono a verificarne la realizzazione, non a cancellare funzioni o
imporre un MVP non concordato.

| Passo                 | Risultato concreto                                                                             | Criterio per proseguire                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1. Esperienza, adesso | Percorso dal sito alla partita; pagine concettuali e interazioni in Markdown.                  | Si capisce cosa vede e fa ogni ruolo; alternative rilevanti e lacune sono esplicite.       |
| 2. Contratto completo | Collegamenti tra decisioni, funzioni, pagine, stati, permessi e casi limite per tutte le aree. | Lacune critiche risolte e approvazione esplicita dell'owner sull'insieme.                  |
| 3. Direzione visiva   | Confronti autorizzati sullo stesso contenuto, poi sistema visuale e stati dei componenti.      | Scelta esplicita della direzione; ogni interazione rimane riconducibile al contratto.      |
| 4. Prove mirate       | Prototipi autorizzati per interazioni e rischi tecnici reali.                                  | Evidenze di funzionamento, limiti dichiarati e correzioni del contratto quando necessarie. |
| 5. Costruzione        | Incrementi che collegano interfaccia, regole, dati e conseguenze.                              | Controlli pertinenti, prove del percorso e revisione della revisione Git effettiva.        |
| 6. Rilascio           | Risultato integrato con recupero e transizione definiti.                                       | Autorizzazioni separate previste da WORKFLOW per rilascio, dati e spese.                   |

Durante 1–2 non occorre scegliere ogni algoritmo o libreria. Occorre sapere
come si comporta il prodotto. Se una scelta dipende dalla fattibilità, viene
identificata come rischio da verificare nello stadio autorizzato; il testo non
la trasforma in garanzia. La fase di branding già prevista resta nella roadmap.

## Pacchetto minimo per un futuro compito dell'agente

Proposta da adattare al task.md esistente, senza introdurre un secondo sistema:

- Obiettivo osservabile e persona che ne beneficia.
- Decisioni e pagine applicabili, con revisioni di riferimento.
- Inclusioni, esclusioni e comportamento che deve rimanere valido.
- File o responsabilità assegnati; dipendenze già disponibili.
- Stato iniziale, azione dell'utente e risultato atteso.
- Comandi di verifica e prova del percorso nell'app, quando esisterà.
- Casi di errore, permessi, concorrenza e perdita di rete pertinenti al compito.
- Stato effettivo, problemi aperti e prossima azione alla consegna.

Chi implementa può scegliere i dettagli tecnici ordinari e correggere i difetti.
Non può abbassare un requisito o eliminare una prova solo per rendere verde
il risultato. Se un test è sbagliato, la correzione deve essere motivata dal
contratto o dalla fonte della regola e restare reviewabile: i test possono
sbagliare quanto il codice. È un controllo proposto, non una prova già eseguita.

## Esempio di tracciabilità, senza codice

**Decisioni:** I-009, I-011, I-016, I-026/I-032 e I-028.

**Percorso:** un giocatore prepara movimento e attacco, sceglie dadi fisici,
inserisce il valore e corregge un errore di trascrizione.

**Criteri funzionali da derivare dalle decisioni:**

1. Prima della conferma, posizione, PF e risorse condivisi non cambiano.
2. Gli altri partecipanti non ricevono la preview privata.
3. La conferma esegue la sequenza autorizzata; eventuali interruzioni seguono
   la capacità applicabile e non una pausa generica inventata.
4. Per il dado fisico l'app aspetta l'input; mostra contributi e totale senza
   sostituire silenziosamente un lancio digitale.
5. Il risultato applicato è distinguibile da quello ancora in attesa.
6. La correzione conserva una traccia appropriata ai permessi e non duplica
   il danno. Le conseguenze dopo azioni altrui seguono I-029.

**Prova futura:** due sessioni autorizzate con dati sintetici, più una vista
senza permesso; azioni osservate nel browser e stato persistito verificato.
Ripetere il solo caso di ripresa pertinente dopo una perdita di connessione.
Un test dei calcoli, da solo, non verifica questa catena; uno screenshot
nemmeno. Non è un test scritto o eseguito durante questa fase Markdown.

## Controlli contro gli scostamenti dal progetto

| Rischio                                        | Controllo proposto                                                             | Evidenza richiesta                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Funzione inventata o tagliata                  | Collegare la modifica alla decisione o alla delega applicabile.                | Motivazione e impatto nel compito, senza consenso inventato.         |
| Regola D&D ricordata male                      | Fonte, edizione, revisione ed esempi prima della regola eseguibile.            | Risultato atteso indipendente dall'implementazione.                  |
| Schermata bella ma incompleta                  | Attraversare l'intero percorso con input e conseguenze.                        | Interazioni e dati finali, oltre alle immagini.                      |
| Stessa astrazione errata nei test e nel codice | Derivare i casi dal contratto e farli contestare in review distinta.           | Casi contrari e regressioni, non solo conferme dell'implementazione. |
| Vecchio stato dopo una nuova sessione          | Riprendere repository, revisione Git e handoff corrente.                       | Comando e risultato delle verifiche pertinenti.                      |
| Agenti che modificano la stessa responsabilità | Un writer per compito e ownership esplicita.                                   | Diff integrabile e controlli sul risultato unito.                    |
| Regressione di pubblico/privato                | Percorso positivo e negativo per i ruoli rilevanti.                            | Segreti assenti anche da risultati, notifiche e preview.             |
| Componenti incoerenti                          | Un vocabolario visuale e comportamentale condiviso dopo il gate.               | Stati documentati e verificati, senza componenti locali arbitrari.   |
| Revisione infinita o cosmetica                 | Raccolta dei difetti, correzione per blocchi e arresto quando manca progresso. | Difetti risolti/aperti e motivo del nuovo ciclo, se serve.           |

Questi controlli rendono gli scostamenti rilevabili e correggibili. Non provano
che non possano mai avvenire. Una revisione distinta con lo stesso modello
può condividere punti ciechi: regole, prove deterministiche, osservazione del
prodotto e giudizio dell'owner sull'esperienza rimangono complementari.

## Uso degli strumenti e skill già presenti

Superpowers conserva il ciclo di sviluppo. Grill-me chiarisce le eccezioni;
Impeccable e frontend-design guidano l'esperienza nelle fasi consentite;
Playwright verifica i percorsi dopo il gate; ponytail e ponytail-review
controllano la complessità; Task Observer raccoglie attriti di metodo.
Le altre skill e le ricerche restano disponibili secondo pertinenza.

**Raccomandazione:** riprendere i principi utili di Spec Kit, OpenSpec e Kiro
nel processo esistente. Non installarli tutti né sovrapporre tre fonti di
verità. Storybook è qui un precedente per gli stati riproducibili dei componenti,
non una dipendenza selezionata. Strumenti, sottoscrizioni e framework nuovi
richiedono una necessità dimostrata nel loro stadio.

## Fonti consultate e limiti

Tutte consultate il 21/09/2026. Le pagine senza versione immutabile sono
fotografie documentali alla data di lettura; ricontrollare le API prima dell'uso.
Non sono stati copiati asset, eseguiti esempi remoti o seguite istruzioni di installazione.

### S01 — OpenAI, lavoro lungo con Codex

[Run long horizon tasks with Codex](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex),
23/02/2026. Resoconto del produttore: obiettivo, milestone, verifiche e stato
persistente. L'esempio di circa 25 ore è dichiarato non pronto per produzione.
Informa la struttura di consegna, non una stima per questa app o un cambio di modello.

### S02 — Anthropic, continuità fra sessioni

[Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents),
26/11/2025. Resoconto tecnico: avanzamenti delimitati, artefatti persistenti e
verifica nel browser; segnala completamento dichiarato troppo presto.
Non importiamo i nomi/formati dei file come obbligo né assumiamo che la
compattazione risolva da sola continuità e correttezza.

### S03 — Anthropic, costruzione e valutazione separate

[Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps),
24/03/2026. Esperimenti su frontend e applicazioni complete. Valutazione del
prodotto in esecuzione; semplificazione del processo con modelli diversi;
interazioni mancanti rilevate anche dopo risultati apparentemente convincenti.
Le iterazioni possono aumentare complessità. Nessuna promessa di sostituire
prodotti professionali o di replicare tempi/costi degli esempi.

### S04 — Anthropic, valutare gli agenti

[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents),
09/01/2026. Distingue traccia e stato finale, prove di capacità e regressione,
valutatori deterministici, umani e basati su modelli. Questi ultimi richiedono
calibrazione. Applichiamo il principio al lavoro di sviluppo; non stiamo
aggiungendo un agente conversazionale al prodotto D&D.

### S05 — Anthropic, gestione del contesto

[Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents),
29/09/2025. Indicazioni del produttore su contesto mirato, riferimenti recuperati
quando servono e note strutturate; compattare può perdere dettagli importanti.
Non prova una dimensione ottimale universale del prompt o una superiorità di più agenti.

### S06 — GitHub Spec Kit

[Agentic SDD](https://github.github.com/spec-kit/reference/agentic-sdd.html),
documentazione corrente, revisione immutabile non esposta nella pagina letta.
Separa qualità dei requisiti e completamento dell'implementazione; analizza
coerenza fra specifica, piano e task. Le checklist del revisore non devono
essere autoapprovate da chi implementa. Nessuna installazione o esecuzione.

### S07 — Fission-AI OpenSpec

[Repository e README](https://github.com/Fission-AI/OpenSpec), ramo main mutabile,
commit non fissato in questa lettura. Proposte, scenari, design e task per
modifica, con aggiornamento delle specifiche. Il confronto commerciale con
concorrenti non è assunto come giudizio indipendente. Nessuna telemetria o
dipendenza aggiunta; non adottati i consigli di modello del README.

### S08 — Kiro

[Specs](https://kiro.dev/docs/specs/), pagina aggiornata 27/08/2026.
Requisiti, design tecnico, task e analisi delle ambiguità. La documentazione
attuale include percorsi diversi e generazione rapida: il prodotto del 2026
non va descritto soltanto attraverso una recensione del 2025. Nessuna migrazione
di ambiente, modello o abbonamento proposta.

### S09 — osservazione critica di Birgitta Böckeler

[Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html),
15/10/2025. Resoconto diretto di prove della professionista: distingue vari
usi della specifica, segnala verbosità e falsa sicurezza. Non è un trial
controllato e le versioni provate sono storiche; utile come rischio da verificare,
non verdetto sui tool attuali.

### S10 — METR, esperimento di produttività aggiornato

[We are Changing our Developer Productivity Experiment Design](https://metr.org/blog/2026-02-24-uplift-update/),
24/02/2026. Aggiornamento empirico con 57 sviluppatori, 143 repository e oltre
800 task; gli autori segnalano importanti effetti di selezione. Non trasferire
stime di accelerazione a un progetto diverso né usare il risultato 2025 come
affermazione generale sugli agenti di oggi.

### S11 — METR, produttività dichiarata

[Measuring the Self-Reported Impact of Early-2026 AI on Technical Worker Productivity](https://metr.org/blog/2026-05-11-ai-usage-survey/),
11/05/2026. Indagine su 349 lavoratori: aumento mediano di valore dichiarato
fra 1,4 e 2 volte, con problemi di selezione e stima soggettiva. È percezione
misurata tramite survey, non aumento causalmente dimostrato per questa app.

### S12 — Playwright

[Best Practices](https://playwright.dev/docs/best-practices), documentazione
corrente senza versione fissata. Prove del comportamento visibile, isolamento
dei test e selettori legati all'uso. Informa le verifiche future; nessun test
applicativo è stato scritto o eseguito in questa fase.

### S13 — Storybook

[How to write stories](https://storybook.js.org/docs/writing-stories),
documentazione corrente senza versione fissata. Gli stati di un componente
possono essere descritti con input riproducibili. Precedente utile per
confrontare normale, errore, attesa e varianti; non prova la correttezza di un
percorso multiplayer e non seleziona una libreria per il progetto.

### S14 — studio sui file di contesto: esito non generalmente positivo

[Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988v2), Gloaguen et al.,
prima versione 12/02/2026, v2 23/06/2026. Consultati abstract e metadati:
gli autori non trovano un miglioramento generale della riuscita e rilevano
un incremento medio dei costi di inferenza superiore al 20%; istruzioni per
pratiche non standard possono essere utili. Non letti integralmente protocolli
e appendici, nessuna replicazione; evitare generalizzazioni a tutti i modelli.

### S15 — studio sui file di contesto: beneficio di efficienza

[On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents](https://arxiv.org/abs/2601.20404v2),
prima versione 28/01/2026, v2 30/03/2026. Consultati abstract e metadati:
10 repository e 124 PR, associazione con minori tempi mediani e token di
output, a completamento comparabile. Misure e campioni diversi da S14;
non annulla il risultato dell'altro lavoro. Nessuna replicazione.

## Lacune dichiarate e prossimo passo

Questa ricerca non misura la velocità della nostra futura implementazione,
non confronta empiricamente tutti gli agenti e non dimostra usabilità con
giocatori reali. I due studi sui file di contesto meritano lettura integrale
prima di usarne le percentuali per una decisione quantitativa.

Aggiornamento I-190: Q163 risolta dall'agente su delega, base A. Adesso
mostrare il percorso visivo del tavolo, completarne la pagina concettuale
e collegarla a scheda e preparazione secondo EXPERIENCE. Definire lì i
criteri verificabili; proseguire sulle altre pagine e conservare la copertura
funzionale. Nessun salto a mock o codice per effetto di questa ricerca.
