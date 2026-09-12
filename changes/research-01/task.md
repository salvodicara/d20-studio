# Research 01 — piano e registro del task

**Obiettivo:** verificare le piste precedenti, coprire prodotti e bisogni pubblici di DM/giocatori e raccomandare il primo scenario, secondo `docs/RESEARCH_BRIEF.md`.

**Autore responsabile:** sessione coordinatrice Codex, GPT-6 Astra, high (instradamento richiesto; nessun benchmark specifico rivendicato).
**Base:** `b41a569fae6a3e14625a315fbd128452dc874056`, origin/main aggiornato il 2026-09-12.
**Branch:** `codex/research-01`.
**Worktree:** `~/Workspace/Codex/d20-studio-research-01`.
**File riservati:** `evidence/research-01/{coverage,claims,recommendation}.md`, `changes/research-01/task.md`, eventuale registro di revisione in questa directory e `docs/NEXT.md` (solo coordinatore).

## Piano

- [x] Verificare task, branch, worktree e remote esistenti: nessun research-01 precedente; baseline pulita e `npm run check` superato.
- [x] Esaminare i sette report precedenti e i rilievi; recuperare i diciannove lavori senza importarne la graduatoria.
- [x] Verificare capacità da fonti ufficiali; cercare esperienze pubbliche favorevoli e contrarie, inglesi e italiane; annotare accesso/versione e lacune.
- [x] Scrivere i tre risultati e confrontarli con tutti i contesti del brief; approfondire solo ciò che può cambiare la scelta.
- [x] Eseguire controlli documentali, link interni e verifica dei contenuti pubblicabili; fissare il candidato aggiornato su origin/main.
- [ ] Far revisionare lo SHA da una sessione separata senza storia dell'autore; registrare rilievi e risolverli prima dell'ultimo passaggio.
- [ ] Richiedere CI e registrare independent-review soltanto dopo il verdetto; integrare lo stesso SHA, verificare main e rimuovere il worktree preservando file unici.

## Metodo e limiti

Ricerca documentale autorizzata, nessuna app o regola eseguibile: TDD e prove runtime dell'app non applicabili. La qualità si verifica tramite tracciabilità delle raccomandazioni, controprove, copertura del brief e revisione separata. Il piano breve adatta Superpowers al task di ricerca già autorizzato; non apre un nuovo ciclo di approvazione del prodotto.

Skill: Superpowers using-superpowers, brainstorming (sondaggio di ricerca autorizzato), writing-plans, using-git-worktrees, requesting-code-review e verification-before-completion; Task Observer attivo. Nessun grafo presente, nessuna generazione graphify necessaria. Nessuna skill installata, sostituita o modificata. Le personalizzazioni restano intatte.

**Stato al primo congelamento:** pronto per revisione separata e CI; non ancora integrato. **Prossima azione:** revisione dello SHA effettivo, risoluzione dei rilievi e verifica finale. Nessuna operazione Firebase, nessuna lettura dei dati reali o modifica al repository di produzione.

## Copertura del criterio di uscita

I tre documenti coprono categorie e contesti del brief, distinguono prodotti aggregati e versioni, mappano J01–J19 senza tagli e includono opinioni contrarie EN/IT. Le raccomandazioni rimandano a C01–C16 e alle decisioni già autorizzate. La copertura è adeguata a proporre il dominio, non a dichiarare usabilità provata. Accessi mancanti, estratti indicizzati e priorità poco documentate sono espliciti.

**Nessuna modifica all'app:** non esistono test applicativi pertinenti a questo diff documentale. Verifiche previste: formattazione, link locali e ancore, inventario dei diciannove lavori, provenienza dei passaggi materiali e controllo dei file effettivamente pubblicati. Nessun pacchetto, dato di personaggio o asset commerciale importato.

**Completamento:** dopo approvazione della sessione separata e CI, il coordinatore registra lo stato sul candidato esatto e integra quel commit. La presenza su main e i due controlli esterni costituiscono il riscontro conclusivo; non si aggiunge una dichiarazione ricorsiva di approvazione in-tree.

## Controlli sul primo candidato

- `npm ci --ignore-scripts --no-audit --no-fund` con cache sotto `~/Workspace/Codex`, Node 24.16.0 e Prettier 3.8.3.
- `npm run check` e `git diff --check`: superati.
- Controllo locale: 49 link relativi/ancore risolti, J01–J19 e C01–C16 presenti una sola volta come righe/sezioni.
- Controllo manuale dei nuovi testi e ricerca di pattern di credenziali: nessun segreto, fixture reale o contenuto privato trovato. Il controllo di pattern non è una certificazione universale.
- `git fetch origin`: base ancora `b41a569fae6a3e14625a315fbd128452dc874056`; il candidato nasce direttamente da quella base, nessun rebase necessario.

## Skill locali preservate

Superpowers proviene dal plugin installato **6.3.0**. Task Observer è letto dalla copia personale canonica. Graphify, Impeccable e Ponytail sono stati consultati per pertinenza; nessun grafo, UI o codice richiedeva i loro flussi di generazione. Non è stata valutata una sostituzione. Queste impronte registrano le copie effettivamente lette, senza copiarne il contenuto nel repository:

| Copia personale                           | Versione dichiarata / SHA-256                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `~/.agents/skills/task-observer/SKILL.md` | non esposta qui; `d045b01fee707799d25259cd57c7213ead577bc2f5d6c8adc3dd176baeb53d8e` |
| `~/.agents/skills/graphify/SKILL.md`      | non esposta qui; `a6e222912937b2b8df5d7e073a801b384226ac2f4ae8125baca89d22808a4136` |
| `~/.agents/skills/impeccable/SKILL.md`    | 4.1.1; `9d124382509eb15da0862f145bca0e53be00aaddb05272e4efc9a0832de048a9`           |
| `~/.agents/skills/ponytail/SKILL.md`      | non esposta qui; `d11df477b1a4e807155a7e578b135a4d9c52beef06eb3a44322940c331a06942` |
