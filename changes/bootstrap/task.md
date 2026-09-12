# Public repository foundation — task and plan

**Goal:** Establish the new public working repository and a GPT-only process from the owner's
2026-09-12 instructions, ready for focused market/design research.

**Scope:** Initial repository documentation, exact source pointers, formatting-only CI, independent
review and the next-session handoff. No app framework, data import, Firebase write/deploy, paid
service, skill installation, final brand decision or subscription cancellation.

**Writer:** Coordinating GPT/Codex session. **Reviewer:** Separate session with requirements and
candidate only. **Reservation:** All files in this initial repository; no other writer is active.
The independent review's candidate SHA is recorded outside that candidate in its GitHub status.

**Model:** GPT-6 Astra; separate GPT-6 Astra reviewer. **Workspaces:** Initial repository at
`~/Workspace/Codex/d20-studio`; final handoff at
`~/Workspace/Codex/d20-studio-bootstrap-handoff`, branch `codex/bootstrap-handoff`.

**Design:** Public documentation foundation with a short router, decisions, roadmap, workflow,
research brief, evidence pointers and one handoff. Node/Prettier are development formatting tools,
not a decision on the future application stack. Standard Ubuntu CI needs no secrets or AI API.

**Plan:**

- [x] Create the bounded document/configuration set named above; retain actual skill incumbents.
- [x] Pin formatting dependencies and official GitHub actions; validate the exact files locally.
- [x] Obtain a separate read-only review of the initial foundation; no material findings remained.
- [x] Create the public repository, publish the reviewed candidate and observe its actual CI result.
- [x] Record review success on that SHA; require CI and review before future integration.
- [x] Publish the separately reviewed previous-repository handoff; provide the filled research-01 prompt.

**Validation:** Prettier check; local-link and source-pointer inspection; review of publication
contents and CI permissions; separate reviewer; observed GitHub CI/status and repository settings.
No application test is claimed by this documentation bootstrap.

**Evidence:** [Foundation and old-repository handoff receipt](../../evidence/reviews/bootstrap.md).
The public initial candidate passed both checks. The old planning branch now points to this repository.

**State at final candidate freeze:** Ready for separate review and fast-forward integration of this
handoff refresh. The coordinator must obtain green CI and `independent-review` for its exact SHA,
then integrate that same SHA into main. This task is complete once those external records confirm
integration; a further in-tree edit solely to claim its own approval would create another candidate.

**Next action after integration:** Start research-01 from [the filled prompt](../../docs/NEXT.md).
