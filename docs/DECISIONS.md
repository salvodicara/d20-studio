# Decisions

Dated owner direction is authoritative within its scope. New decisions explicitly identify what
they replace. The source for D-001–D-010 is the owner's 2026-09-12 restart steering and follow-ups in the Codex
conversation; these entries paraphrase product instructions without copying personal chat history.

| ID    | Decision                                                                                          | Effect                                                                                                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-001 | The project must be viable with Codex/GPT alone; Claude must not be required.                     | Supersedes the old vendor allocation and mandatory cross-provider review for this restart. Separate author/reviewer sessions remain required. Whether the owner cancels a subscription is theirs to execute.                                                           |
| D-002 | Start a new repository; the agent chooses public/private.                                         | Public `salvodicara/d20-studio`, chosen for standard hosted CI and a clean project context. Existing production remains in d20 Folio. Public visibility does not itself grant a code/content license.                                                                  |
| D-003 | Existing d20 Folio staging may support initial experiments.                                       | The old configuration maps `staging` to `d20-folio-staging`. Live access and sharing constraints must be checked before writes. No new Firebase project, deployment or migration is authorized by the repository bootstrap.                                            |
| D-004 | Invest seriously in coherent design, informed by videogames and web/tabletop products.            | Broad market coverage, task-specific deeper comparisons, visible alternative directions and repeated playable refinement. Time spent must produce new evidence or an improved experience.                                                                              |
| D-005 | Final naming, marketing position and branding happen at a defined stage once the design is clear. | `d20 Studio` is a working name. Explore alternatives, availability and positioning at ROADMAP stage 5; no domain purchases or launch announcements now.                                                                                                                |
| D-006 | Minimize demands on DM/player availability; work autonomously wherever possible.                  | Public community evidence, documented product comparisons and agent-run interaction tests are the normal path. Recurring participant sessions no longer block every slice. Human testing remains distinct evidence, not something AI can claim to simulate faithfully. |
| D-007 | Agents manage the project and guide a nontechnical owner in clear Italian.                        | The coordinator handles task boundaries, fresh review sessions, checks and handoffs. Ask only consequential product/taste, cost, external-authority or irreversible choices, with concrete alternatives.                                                               |
| D-008 | Put the main clone directly at `~/Workspace/d20-studio` and remove obsolete worktrees.            | This exact owner-selected location supersedes the bootstrap location under `~/Workspace/Codex`. Temporary worktrees and recovery files still use that Codex directory. Remove completed worktrees after integration; preserve unique local material before cleanup.    |
| D-009 | Keep the current d20 Folio site unchanged until the replacement is released.                      | The owner's group continues playing there. Restart work does not modify production code, deploy, merge into production or move its live data. Any later exception needs explicit owner steering.                                                                       |
| D-010 | Retain useful existing skills, including Impeccable, Ponytail, Grill-me and Superpowers.          | Keep the actual installed tools and personal customizations. The wider supporting catalogue remains available as appropriate; no dedicated icon skill is currently installed, and none is added merely to fill that label.                                             |

## Retained baseline

The reset retains the group-first D&D product ambition, a 2024 rules engine, EN/IT, physical and
digital dice, default full automation with visible results and DM corrections, private content
separation and preservation of existing players' data. BG3 and D&D Beyond are primary references.
Research inventories all nineteen previous jobs, including scheduling, before proposing a new
order. The first demonstrator is a complete short encounter, not a reduction of the eventual
whole-session ambition. No irreversible production transition is part of foundation work.

The inherited offline wording needs a concrete product definition. Use local one-device behavior
as the reversible first experiment; do not advertise synchronized offline multiplayer or silently
remove an existing promise. Return any first-release tradeoff to the owner with a demonstration.

## Consequences for the v3 review

| Review item                              | Restart treatment                                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| N01 — provider fallback rejected by gate | Provider equality is permitted. Different author/reviewer sessions, exact candidate identity and evidence govern approval. No Claude dependency.             |
| N02 — copied Git notes                   | Approval is a GitHub status attached to the exact candidate SHA. A repository report can cite an earlier reviewed SHA; it does not attest to its own commit. |
| N03 — reaction example                   | The invalid generic interrupt/spending example is not imported. Ability-specific timing and accept/decline cases are explicit in AGENTS.                     |
| N04 — custom rules cannot cite the SRD   | A source-kind policy covers SRD, original rules and permitted private extensions.                                                                            |
| N05 — conflicting executable prompts     | The new workflow and filled handoff share task isolation, one coordinator and approval-before-integration. Old templates are historical.                     |
| N06 — unsupported research conclusions   | Old reports supply research leads. Consequential claims are rechecked and labeled; there is no imported preference ranking or quota-free research claim.     |
| N07 — wrong skill incumbent              | Keep the actual personal incumbents and their customizations. No skill installation is required by this bootstrap.                                           |

These are design dispositions, not claims that an unbuilt application, comprehensive review
sandbox or runtime test suite has already passed. See WORKFLOW for the limits of local review.

## D-011 — passaggi autonomi fra sessioni (12/09/2026)

Fonte: autorizzazione esplicita del proprietario nel passaggio dal task Codex
«Completa research-01 sul mercato» a experience-01 il 12/09/2026. Il coordinatore può cercare
e avviare il prossimo task delimitato, impostare modello e sforzo e trasmettere il proprio vero
threadId; il successore può archiviare il predecessore dopo aver verificato la presa in carico
e la conclusione del suo turno. L'autorizzazione si conserva nei passaggi successivi.

Estende D-007 alla gestione operativa delle sessioni; non sostituisce D-001–D-010. Non richiedere
al proprietario di incollare prompt o riconfermare i passaggi ordinari già autorizzati. Cercare
prima task/branch/worktree esistenti; un successore per cambio di obiettivo, nessuna catena di
task vuoti. Conservare comunque nel repository il prompt completo per una ripresa manuale.

Resta possibile coinvolgere il proprietario in ogni momento. Le scelte sostanziali di prodotto,
la direzione visiva, offline del primo rilascio, spesa, deployment, rilascio, migrazione e impegni
esterni conservano i propri gate. L'autorizzazione non consente di modificare d20 Folio.
Se quota o accesso impediscono il lavoro, preservare stato reale e punto di ripresa, senza
dichiarare completamento o creare sessioni duplicate come espediente.

## D-012 — intervista completa prima dei mock (12/09/2026)

Fonte: correzione esplicita del proprietario nel task design-01. Vuole una lunga intervista
Grill-me su TUTTO il prodotto: feature, ruoli, percorsi, pagine concettuali, sezioni, informazioni,
pulsanti, regole di comportamento ed eccezioni. Una domanda alla volta, nessuna durata imposta;
risposte e punti aperti vivono nel repository. Sono ammessi documenti Markdown per descrivere le
pagine funzionalmente. Non sono autorizzati mock, wireframe visuali, UI grafica, demo, prototipi o
implementazione prima dell'approvazione esplicita del contratto complessivo.

Supersede la sequenza precedente che passava direttamente dalla ricerca al guado e alle due
direzioni. Le mappe scenario/accettazione e il prototipo design-01 vengono ritirati dagli input
attivi; non costituiscono preferenze confermate. Ricerca sui prodotti, fonti/regole verificate,
inventario dei diciannove lavori e skill con personalizzazioni restano disponibili. Non è un
reset delle conoscenze o dell'ambizione. I diciannove lavori non sono una mappa di pagine.

D-006 non esonera dall'intervista del proprietario: riguarda il reclutamento ricorrente di altri
DM/giocatori. D-007/D-011 consentono coordinamento operativo, non decisioni di prodotto implicite
né salti al design. Per questo passaggio il proprietario chiede un prompt per avviare la prossima
sessione; non avviare un successore automaticamente. Eventuali sessioni successive continuano
l'intervista dal punto registrato finché il gate rimane aperto.

Dopo l'approvazione, il contratto è la baseline dei mock e non si riapre per iniziativa arbitraria
dell'agente. Una contraddizione reale si presenta al proprietario con una proposta di modifica e
impatti; non si nasconde e non si cambia silenziosamente. Produzione, dati, spesa e pubblicazione
mantengono tutti i vincoli già stabiliti. Il nome resta provvisorio.
