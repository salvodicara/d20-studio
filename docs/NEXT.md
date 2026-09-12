# Prossimo passo — esperienza e dominio

## Stato della ricerca

Il candidato `research-01` contiene i tre risultati richiesti:

- [Copertura](../evidence/research-01/coverage.md): prodotti, videogiochi, contesti, audit degli input e tutti i diciannove lavori, incluso il calendario condiviso.
- [Affermazioni e controprove](../evidence/research-01/claims.md): fonti, date, limiti e distinzione fra capacità pubblicate, esperienze e ipotesi.
- [Raccomandazione](../evidence/research-01/recommendation.md): progettare un incontro breve completo, «L'agguato al guado».

Il [registro del task](../changes/research-01/task.md) descrive piano e controlli. Questo handoff diventa operativo quando il candidato è integrato su main con `Documentation checks` e `independent-review` verdi sullo stesso SHA, secondo [WORKFLOW](WORKFLOW.md). Lo stato esterno attesta la revisione finale; questo documento non approva il commit che lo contiene.

La ricerca è documentale: nessun prodotto autenticato o videogioco è stato provato direttamente, nessun test umano o prototipo è stato eseguito. Le lacune sono esplicite e diventano criteri di progettazione. Le decisioni del proprietario restano in [DECISIONS](DECISIONS.md); app, branding, produzione e dati reali non sono stati modificati.

## Prossima sessione: experience-01

La [fase 2 della roadmap](ROADMAP.md) definisce l'esperienza complessiva e il primo scenario con i suoi oggetti, permessi, eventi e regole. Non inizia lo sviluppo dell'app o il branding. Le due direzioni visive e i prototipi appartengono alla fase successiva, dopo aver reso comprensibile lo scenario e le scelte sostanziali.

Modello consigliato: **GPT-6 Astra, high**. Alternativa: **GPT-5.6 Terra, high** per una parte delimitata; **Claude Fable 5.1, high** solo se già disponibile. È l'instradamento provvisorio del 12/09/2026, con fonti e limiti in [SOURCES](../evidence/SOURCES.md) e WORKFLOW, non una garanzia comparativa di qualità.

Prompt completo:

```text
Modello consigliato: GPT-6 Astra. Sforzo: high.
Alternativa GPT: GPT-5.6 Terra, high, per un controllo delimitato.
Alternativa Claude: Fable 5.1, high, solo se già disponibile; Claude non è un gate.
Base: instradamento provvisorio e limiti del 12/09/2026 in evidence/SOURCES.md e docs/WORKFLOW.md.
Strumenti: Git/GitHub, ricerca web e skill pertinenti già installate; nessun acquisto o nuovo servizio a pagamento.
Ripresa: ~/Workspace/d20-studio, origin/main aggiornato.

Leggi AGENTS.md, docs/NEXT.md, docs/DECISIONS.md, docs/ROADMAP.md, docs/WORKFLOW.md
ed evidence/research-01/recommendation.md, seguendo i collegamenti alle prove necessarie.
Verifica che research-01 sia integrato con entrambi i controlli sul candidato esatto.
Avvia o riprendi experience-01 senza duplicare task o worktree, in un worktree isolato
sotto ~/Workspace/Codex e sul branch codex/experience-01. Registra obiettivo, file riservati,
modello, stato, verifiche e prossima azione in changes/experience-01/task.md.

Descrivi brevemente l'intera esperienza del prodotto conservando tutti i diciannove lavori.
Definisci «L'agguato al guado»: un incontro completo con personaggi sintetici precompilati,
lettura della scheda, scelta dell'azione, dadi fisici/digitali, risoluzione automatica,
reazione accettata/rifiutata, correzione del DM, indizio privato/pubblico, bottino e riepilogo.
Collega la chiusura alla prossima data senza scambiare questo collegamento per il calendario completo.
Fissa ruoli, oggetti, permessi, eventi, costi e conseguenze; verifica le regole 2024
su fonti ufficiali EN/IT con revisione immutabile. Le regole originali citano la propria decisione.
Distingui Ready dalle altre reazioni e preserva il corretto confine di ripristino.

Produci un contratto di scenario comprensibile, esempi verificabili e una lista delle assunzioni
costose da provare: correzioni con effetti successivi, invii duplicati, segreti, recupero e
comportamento locale senza rete. Definisci percorsi telefono/desktop, tastiera/touch e EN/IT.
BG3 e D&D Beyond sono riferimenti principali: osserva sequenze accessibili o documentale tramite fonti pubblicate,
annotando versione e limiti senza fingere uso diretto. Usa altri prodotti per domande specifiche.

Lavora autonomamente e sottoponi il candidato a revisione separata, poi completa il task
secondo WORKFLOW. Chiedimi solo scelte sostanziali di prodotto mostrando esempi concreti.
Non imporre incontri periodici con DM/giocatori, non iniziare app o branding e non modificare,
deployare o migrare d20 Folio o i suoi dati. Non trasformare la prova locale in una promessa
di multiplayer offline né ridurre silenziosamente la portata del primo rilascio.
Spiegami i risultati in italiano semplice; termina con modello, sforzo e prompt per il passo successivo.
```

## Scelte da portare al proprietario quando diventano concrete

Nessuna risposta blocca lo studio del dominio. La definizione di offline per il primo rilascio, una variazione sostanziale dello scenario o dell'ambizione e la scelta fra due direzioni visive richiedono esempi concreti. Nome e branding restano una fase dedicata. Deployment, spesa, migrazione e impegni esterni richiedono autorizzazione specifica.
