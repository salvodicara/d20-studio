# Prossimo passo — due direzioni e prove del guado

## Risultato della fase 2

Experience-01 definisce [L'agguato al guado](../evidence/experience-01/scenario.md): due schede
sintetiche, un incontro dalla scelta dell'azione alla chiusura, tutti i diciannove lavori conservati.
Le [fonti EN/IT fissate](../evidence/experience-01/rules.md) distinguono Scudo, Prepararsi e
opportunità; i [casi verificabili](../evidence/experience-01/acceptance.md) coprono risorse,
correzioni, duplicati, segreti e recupero. I [riferimenti](../evidence/experience-01/references.md)
documentano sequenze pubblicate di BG3 e D&D Beyond con i limiti di accesso.

È un contratto da provare, non un'app o un playtest riuscito. Nessun prodotto autenticato provato,
nessuna scelta visiva approvata, nessuna promessa nuova di multiplayer offline. L'esperimento
locale resta su un dispositivo. La resa è un percorso narrativo di chiusura, non una regola che
azzera PF. Il calendario completo rimane nell'ambizione, oltre al collegamento dimostrativo.

Il [registro](../changes/experience-01/task.md) descrive piano e verifiche. Questo handoff è
operativo soltanto quando il candidato experience-01 è su main con `Documentation checks` e
`independent-review` verdi sullo stesso SHA secondo [WORKFLOW](WORKFLOW.md). Nessun documento
approva il commit che lo contiene. D-011 in [DECISIONS](DECISIONS.md) registra l'autorizzazione
al passaggio autonomo fra task senza copia manuale di prompt.

## Prossimo obiettivo: design-01, fase 3

Preparare **due direzioni visive coerenti e confrontabili** per gli stessi stati del guado,
con prototipi interattivi grezzi e prove usa-e-getta delle assunzioni costose. Consiglio iniziale:
una direzione centrata sulla scheda e una centrata sulla scena, entrambe capaci di spiegare costi,
reazioni e correzioni. Sono piste da esplorare, non una scelta estetica già attribuita al proprietario.

GPT-6 Astra, **high**; alternativa GPT-5.6 Terra, **high**, per controllo delimitato, Claude Fable
5.1/high solo se già disponibile. Instradamento provvisorio del 12/09/2026, fonti e limiti in
[SOURCES](../evidence/SOURCES.md) e WORKFLOW. Nessun acquisto implicito.

Prompt completo per avvio automatico o ripresa manuale:

```text
Modello: GPT-6 Astra. Sforzo: high.
Alternativa GPT: GPT-5.6 Terra, high, per una parte delimitata; Claude Fable 5.1/high solo se già disponibile, mai come gate.
Base: instradamento provvisorio del 12/09/2026 in evidence/SOURCES.md e docs/WORKFLOW.md.
Strumenti: Git/GitHub, web, strumenti Codex e skill pertinenti già installate. Nessun acquisto o nuovo servizio a pagamento.
Repository principale: /Users/salvatoredicara/Workspace/d20-studio.
Coordina dal progetto salvato e lavora in un solo worktree isolato sotto /Users/salvatoredicara/Workspace/Codex.

Sei il successore di experience-01, task Codex 01a096a7-26fd-7082-bed3-b32731579771, host local.
Il proprietario ha autorizzato il 12/09/2026 la successione autonoma, registrata in D-011:
aprire la prossima sessione, impostare modello/sforzo e far archiviare al successore il predecessore
soltanto quando il turno di passaggio è concluso. Verifica prima presa in carico, stato del predecessore
e base integrata; non interromperlo mentre ti avvia, non archiviare altri progetti.
Questa autorizzazione persiste nei successivi handoff e non richiede copia manuale del prompt.

Leggi AGENTS.md, docs/NEXT.md, docs/DECISIONS.md, docs/ROADMAP.md, docs/WORKFLOW.md,
evidence/experience-01/scenario.md, rules.md, acceptance.md e references.md.
Aggiorna origin/main e verifica che experience-01 sia integrato con entrambi gli status sullo SHA effettivo.
Non rifare la ricerca o il contratto già completati. Cerca task, branch e worktree esistenti prima di
avviare/riprendere design-01 sul branch codex/design-01, senza duplicati. Un autore responsabile,
un worktree; registra obiettivo, file riservati, modello, stato, verifiche e prossima azione in
changes/design-01/task.md. Solo il coordinatore modifica docs/NEXT.md.

Obiettivo delimitato: fase 3, due direzioni visive del guado e fattibilità delle assunzioni costose.
Usa Impeccable e frontend-design per la qualità UI/UX, Superpowers per piano/isolation/TDD/review,
Ponytail per la semplicità, playwright-cli per prove runtime e Task Observer. Archify se servono diagrammi.
Preserva le personalizzazioni delle skill; nessuna installazione o sostituzione per default.
Produci due direzioni coerenti sugli stessi stati: scheda, bersaglio/costo, risultato, Scudo offerto,
Scudo rifiutato e Prepararsi, correzione con effetti successivi, indizio privato/pubblico, bottino e riepilogo.
Usa dati sintetici e artefatti originali. BG3 e D&D Beyond restano primari; approfondisci altri prodotti
solo per domande precise, con fonte/versione e distinzione fra pubblicato, osservato e inferito.

Costruisci prototipi grezzi reversibili, non l'app di produzione. Verifica interazioni reali:
telefono/desktop, touch/tastiera, EN/IT e percorso senza mappa. Prova i casi di acceptance.md:
correzione con dipendenze e sospensione, duplicati, segreti anche nei payload/cache, recupero dopo
interruzione e un dispositivo senza rete con dati predisposti. Registra build, fixture, ruolo,
lingua, input e stato prima/dopo; screenshot da soli non provano un'interazione.
Le regole sono 2024: pin dei PDF EN/IT per digest; Prepararsi dopo il trigger, opportunità prima
dell'uscita, Scudo applicabile all'attacco innescante, reazione al prossimo proprio turno.
Nota la discrepanza editoriale italiana di Incapacitato e la regola 2024 di tramortire a1 PF.
Fissa la revisione Git immutabile delle decisioni originali e01-v1 nel consumatore.

Presenta al proprietario esempi affiancati e una raccomandazione chiara in italiano semplice:
la scelta della direzione visiva resta sua. Se emerge un tradeoff sostanziale sull'offline del primo
rilascio, prepara una dimostrazione concreta e chiedi la scelta; continua le prove indipendenti.
Non scambiare la prova su un dispositivo per multiplayer offline, non ridurre silenziosamente
nessuno dei diciannove lavori o il primo rilascio. Non imporre interviste ricorrenti con DM/giocatori;
non chiamare i test agentici playtest umani. Il branding rimane fase5.

A fine obiettivo ottieni revisione in una sessione distinta sul candidato SHA effettivo (subagente
separato consentito), risolvi i rilievi e richiedi nuova approvazione se cambia lo SHA. Verifica CI
e registra independent-review dopo il verdetto; integra lo stesso candidato secondo WORKFLOW.
Mantieni il proprietario unico autore Git; niente autocertificazione in-tree del proprio SHA.
Conserva gli artefatti unici prima di rimuovere il worktree. Prepara NEXT e prompt completo nel
candidato revisionato. Prima di avviare un solo successore per il prossimo obiettivo, verifica
che i gate sostanziali richiesti siano risolti. Attendi conferma di avvio, trasmetti il tuo vero
threadId e D-011 affinché il successore archivi questa sessione quando il turno è concluso.
Niente catene vuote o duplicati. Se quota/accesso mancano, conserva stato reale e punto di ripresa.
Nessun deployment, rilascio, spesa, migrazione o impegno esterno senza autorizzazione specifica.
Non modificare, deployare o migrare d20 Folio o i suoi dati.
```

## Scelte ancora del proprietario

La scelta fra direzioni richiede gli esempi visivi; non è risolta dal passaggio automatico.
L'offline del primo rilascio richiede una definizione concreta se la prova espone alternative.
Nome/branding hanno la fase 5. Deployment, spesa, release, dati reali e impegni esterni conservano
l'autorizzazione specifica per cambiamento. Nessuna di queste scelte blocca la preparazione
reversibile delle due direzioni e delle prove usa-e-getta.
