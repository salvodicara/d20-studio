# Current handoff

## Current state

The public [d20 Studio repository](https://github.com/salvodicara/d20-studio) now contains the
foundation from the owner's 2026-09-12 steering. Its initial candidate passed separate review and
real GitHub CI; main requires documentation checks and a review status for each candidate.
See the [bootstrap receipt](../evidence/reviews/bootstrap.md) and
[task record](../changes/bootstrap/task.md) for the evidence and completion boundary.

When this handoff is on main with both checks passing, research-01 is ready to start. No owner
answer blocks it. The existing production app remains in d20 Folio; no new application
implementation has started and the brand name remains provisional.

The main local checkout is now `~/Workspace/d20-studio`. Obsolete legacy worktrees were removed;
unique small local files were preserved privately. The production app remains unchanged for the
owner's group until the replacement is released. See [the cleanup record](../changes/workspace-cleanup/task.md).

## Next focused session

Once this handoff is integrated, the setup conversation is complete. Add `~/Workspace/d20-studio`
as the Codex project and open a fresh task there. The next task coordinates research from the
repository contract and its focused objective. The agent can arrange
bounded review subagents through the applicable review skill; the owner need not create one
conversation for every implementation detail.

Use GPT-6 Astra at **high**. GPT-5.6 Terra at **high** can handle a bounded research subset if
needed; unresolved broad synthesis returns to Astra. This is a provisional route based on the
2026-09-12 evidence and task complexity, not a benchmark guarantee. Claude is not required.

Paste this complete prompt:

```text
Modello consigliato: GPT-6 Astra. Sforzo: high.
Alternativa disponibile: GPT-5.6 Terra, high, per un sottoinsieme delimitato della ricerca.
Base: indicazioni e limiti datati 2026-09-12 in docs/WORKFLOW.md ed evidence/SOURCES.md;
scelta provvisoria da verificare sugli esiti. Claude non è richiesto.
Strumenti: Git/GitHub, ricerca web e consultazione dei prodotti accessibili, nessun servizio a pagamento.
Riparti da ~/Workspace/d20-studio, repository https://github.com/salvodicara/d20-studio,
e dal suo origin/main aggiornato. d20 Folio resta intoccato in produzione fino al rilascio del nuovo prodotto.

Leggi AGENTS.md, docs/NEXT.md e docs/RESEARCH_BRIEF.md. Se bootstrap è concluso, avvia research-01
in un worktree isolato sul branch codex/research-01 e registra changes/research-01/task.md.
Controlla prima se il task esiste già e riprendilo senza duplicarlo. Svolgi la ricerca autorizzata
sui prodotti e sulle esperienze pubbliche di DM e giocatori, partendo dai report precedenti come
piste da verificare. Mantieni le decisioni in docs/DECISIONS.md. Distingui fatti, opinioni,
ipotesi, prove dirette e limiti di accesso; cerca anche opinioni contrarie.

Produci i tre risultati richiesti dal brief, fai verificare la proposta da una sessione separata
e porta il task alla conclusione secondo docs/WORKFLOW.md. Non iniziare l'app o il branding e
non chiedere incontri periodici con un DM. Aggiornami in italiano chiaro con risultati concreti;
al termine dammi la raccomandazione sul primo scenario e il prossimo passo con modello e sforzo.
```

## Decisions still requiring concrete evidence

No owner answer blocks research-01. Later, show the offline alternatives and their practical
consequences; show two coherent visual directions; then bring names and branding at the dedicated
stage. Deployment, new spending and real-data movement have their own explicit authorization.
