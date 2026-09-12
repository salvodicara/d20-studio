# Workspace cleanup and next-session handoff

**Goal:** Apply the owner's 2026-09-12 follow-up: main clone at `~/Workspace/d20-studio`,
obsolete worktrees removed, existing production untouched, and a ready research prompt.

**Writer/model:** Coordinating GPT-6 Astra session. **Reviewer:** A separate session reviewing the
exact candidate. **Worktree:** `~/Workspace/Codex/d20-studio-workspace-cleanup`.
**Branch:** `codex/workspace-cleanup`. **Reserved files:** AGENTS.md, docs/DECISIONS.md,
docs/NEXT.md and this task record. No other writer is active on these paths.

**Plan and observed results:**

- [x] Inspect tracked, untracked and ignored files, remote ancestry and active worktree use.
- [x] Verify and preserve 36 small local configuration/work/review files in a private recovery
      archive under `~/Workspace/Codex/archives`; the archive is about 2.4 MB with owner-only access.
- [x] Remove the clean legacy restart-review and v2 worktrees using normal `git worktree remove`.
      Their commits remain in the original repository and remote branches. The external private
      content directory was not removed. Dependencies, build output and caches were disposable.
- [x] Remove the completed bootstrap-handoff worktree and relocate the existing clean main clone
      to the exact requested directory, preserving its Git history and origin.
- [x] Record the production hold, location exception, retained skills and next research session.

**Validation at handoff preparation:** No tracked/untracked worktree changes were discarded;
both removed legacy heads are ancestors of their fetched upstream branches. The recovery archive's
regular files were checked against source hashes. No Firebase operation occurred. The production
checkout retained main at `5b7f2a8bf30f172e31f4e154fa21a3a2fec85dd9` and its pre-existing untracked
`.playwright-cli/` directory. Application behavior did not change.

**Local documentation checks:** Prettier 3.8.3 passed under Node 24.16.0; all nineteen relative
links resolved and `git diff --check` passed. No application test is claimed for this documentation change.

**State at candidate freeze:** Ready for separate review and CI. Integrate
only the exact approved candidate with both required GitHub checks passing, then remove this
temporary worktree. External commit statuses and main establish completion without a recursive
in-tree approval edit.

**Next action after integration:** The owner opens a fresh research-01 task in `~/Workspace/d20-studio`
using [the complete prompt](../../docs/NEXT.md). No application or branding work starts in this cleanup.
