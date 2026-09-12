# How work is coordinated and checked

## Sessions and complete tasks

Keep one coordinating Codex session per phase. Start a fresh focused session when changing
objective, when the current context contains several abandoned approaches, or when work needs
independent review. Do not open a new session for every small edit. At a quota boundary, preserve
the worktree, dirty state and next action; another allowed model may resume, or the task waits.

Every task has one accountable writer, an isolated worktree and `changes/<task>/task.md`. Reserve
its affected paths and include the necessary tests and documentation in that ownership. Only the
coordinator edits shared NEXT. Parallel work is useful only for independent, bounded tasks.

A task is complete when the intended result exists, relevant checks pass, a different session has
approved the actual candidate, findings are resolved or explicitly dispositioned, and the
coordinator has integrated it and updated the shared handoff. Requesting a review is not completion.
An unclosed correctness defect cannot be relabeled a preference to pass a gate.

## One-provider review

The author and reviewer may both use GPT-6 Astra. The reviewer receives the task requirements,
base/candidate SHAs and relevant evidence, without the author's conversation or preferred verdict.
Review is read-only on the candidate checkout; the coordinator checks that its files and SHA have
not changed. A read-only instruction and a second session are workflow controls, not a proven
security sandbox or independent human judgment. They reduce context contamination, not every
shared-model failure mode. Runtime tests and primary rule sources supply additional evidence.

For ordinary work, one separate session reviews. For changes to permissions, persistence, rules
resolution or migration, add adversarial cases and deeper review; use a further fresh session only
when unresolved risk justifies it. A second paid provider is never required. If no independent
session or adequate evidence is available, report pending work instead of declaring approval.
Technical disputes use a reproduction, then a bounded second opinion. Only a material change to
product intent, settled taste, cost or external authority reaches the owner.

## Candidate approval and integration

Use two GitHub commit checks: `Documentation checks` (CI, currently formatting only) and
`independent-review` (recorded by the coordinator after a genuine separate review). Application
checks are added with implementation. The review status belongs to the exact reviewed commit SHA;
never infer approval from a note copied to another commit or from a report committed inside that
same candidate. Reports can cite earlier SHAs without circular attestation.

1. Rebase a task onto current `origin/main` before its final checks and review; freeze its candidate.
2. Run its checks and request a review with exact base/candidate SHAs. Store substantive findings
   and dispositions in the repository before the final pass; the final external status binds the
   complete candidate, including those records, to the review result.
3. The coordinating session records `independent-review` through GitHub's commit-status API on that
   exact SHA, with reviewer/model identity and a short verdict in the description. Never post success
   before the review returns. Failed or pending work gets the corresponding status.
4. Require green CI and `independent-review` before fast-forwarding main to that same SHA. If main
   moved, rebase and obtain checks/review for the new candidate. No force pushes to main.
5. A later handoff/report edit creates another candidate and follows the same rule. First-repository
   initialization is the sole bootstrap exception while the checks are being established; review
   the content before publishing it and enable the requirements after the first successful run.

These statuses are a workflow gate under one owner's GitHub credentials, not proof that the
coordinator could never forge a verdict. CI does not buy or call an AI API. The owner is not
required to supply a separate GitHub account or manually approve every pull request.

## Models and effort

Advice dated 2026-09-12; sources and limitations are in [the evidence register](../evidence/SOURCES.md).
No matched benchmark proves one best model/effort for this exact project. Start here, record actual
failures and consumption, and change a route when task evidence warrants it.

| Task                                                               | Recommended                                                                                  | Available alternative                                                               | Basis                                                                                                                             |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Research synthesis, product reasoning, design and implementation   | GPT-6 Astra, high                                                                            | GPT-5.6 Terra, high for a bounded task; return hard unresolved design work to Astra | Official general model guidance plus the provisional 2026-09-12 benchmark review; task judgment, not a claim of equal capability. |
| Difficult authority, rule-timing, recovery or adversarial analysis | GPT-6 Astra, high initially; xhigh when the unresolved problem benefits from deeper analysis | A later fresh Astra session; Terra may independently check a bounded case           | Consequence and observed uncertainty; record why extra effort is useful.                                                          |
| Routine corrections, evidence organization and simple checks       | GPT-6 Astra, medium                                                                          | GPT-5.6 Terra, medium                                                               | Lower effort for bounded work; verify outputs.                                                                                    |
| Independent review                                                 | Fresh GPT-6 Astra session, high; xhigh only for justified hard cases                         | Fresh Terra, high for a suitable bounded diff                                       | Different session, explicit checks; shared-provider limitations disclosed.                                                        |
| Optional cross-provider fallback if already available              | Claude Fable 5.1, high for the corresponding task                                            | Astra with the same task contract                                                   | Historical research offers a possible alternative; no subscription, purchase or provider change is required.                      |

Every generated prompt names the model, effort, alternative, evidence date or labeled preference,
required tools and resume location. Equal effort labels do not imply equal compute. Agent-led
research consumes context/quota; API prices are not converted into subscription messages.

## Owner communication

Lead with the result and the next useful action in plain Italian. Explain technical terms only
when they affect a choice. Show a small number of concrete visual alternatives, with a
recommendation; keep routine implementation decisions with the agents. Do not ask the owner to
reconfirm a dated choice or to read the whole repository. No surprise purchases, deployments,
messages to other people or migrations.
