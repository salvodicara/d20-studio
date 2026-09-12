# d20 Studio — agent entry point

Read [docs/NEXT.md](docs/NEXT.md), then only the documents needed for its current objective.

## Current owner gate — D-012 (12/09/2026)

The next work is a long Grill-me interview about the WHOLE product, with the owner answering
one concrete question at a time. Record functions, conceptual pages, contents, controls and behavior
in Markdown. No mockups, visual wireframes, demo, prototype, images or implementation until the
owner explicitly approves the complete product contract. Earlier scenario maps/design-01 are retired;
never retrieve them as a default design. Preserve research and all installed skills/customizations.
This explicit owner gate overrides earlier scenario-first sequencing, visual-probe skill defaults
and any interpretation of D-011 that would skip the interview. See docs/interview/README.md.

## Authority and product direction

- Owner decisions live in [docs/DECISIONS.md](docs/DECISIONS.md); the delivery sequence lives in
  [docs/ROADMAP.md](docs/ROADMAP.md). This repository governs the restart. Old d20 Folio documents
  are dated evidence and source material, not a second set of instructions.
- The owner currently directs the product through a detailed interview and conceptual Markdown pages. Explain outcomes in plain Italian, with short
  concrete examples. Do not ask them to read diffs, settle technical disagreements or approve
  routine implementation details. Provide filled next-session prompts and model/effort guidance.
- Codex/GPT can perform every development role. Claude is optional, never a gate. Another session
  reviews the author's work; session separation does not eliminate shared-model blind spots.
- Preserve the 2024-engine baseline, EN/IT support, physical and digital dice, logged consequences,
  DM discretion and private/public content separation. Inventory the previous nineteen jobs,
  including shared scheduling, in research; changes to product intent are explicit owner choices.
- BG3 and D&D Beyond remain primary references. Study the wider market broadly and select deeper
  comparisons by the task they illuminate. Familiarity or popularity is not proof of fit.
- Name and branding are a dedicated stage after the experience direction is clear. `d20-studio`
  is the temporary repository name, not a completed brand decision.
- The existing d20 Folio production app stays unchanged for the owner's playing group until the
  replacement is released. Restart tasks do not modify, merge into, deploy or migrate that app.

## Delivery

- Follow [docs/WORKFLOW.md](docs/WORKFLOW.md). One bounded objective, one accountable writer and
  one isolated worktree per active task. Each task includes its code, tests, documentation and evidence.
- Use the available Superpowers lifecycle proportionally: clarify intent, record a short plan,
  implement, verify and obtain a separate review. Existing owner authorization persists; do not
  add repeated approval requests for reversible work already inside the agreed scope.
- Complete tasks on `codex/<task>` branches. The coordinating session integrates only reviewed,
  verified candidates. Keep commits small and Conventional; preserve the owner as sole author.
- Each task records its objective, reserved files, worktree, model, state, checks and next action in
  `changes/<task>/task.md`. Dirty work may remain on disk at a quota boundary; never commit a lie
  to make a handoff look clean. Only the coordinator updates shared `docs/NEXT.md`.
- Review the actual candidate SHA in another session; write findings against that SHA. A changed
  candidate needs renewed approval. Follow the GitHub status protocol in WORKFLOW, not an
  in-tree document that attempts to attest to its own commit hash.
- Verify changed behavior in the running app as well as appropriate tests. Use keyboard, touch,
  phone/desktop and EN/IT checks when relevant. Screenshots alone do not prove interaction.
- Use installed skills when they fit: impeccable and frontend-design for UI/UX, archify for diagrams,
  graphify when a graph exists, ponytail and ponytail-review for simplicity, grill-me for consequential
  product choices, playwright-cli for runtime work, task-observer and find-skills for tooling upkeep.
  Imagegen remains available for raster art; no dedicated icon skill is currently installed. Keep the personal
  `~/.agents/skills/` layer canonical; record actual installed versions and local customizations
  before evaluating replacements. Do not install a new skill or duplicate the catalogue by default.
- Harness memories hold tool hazards and pointers only. Project decisions, evidence and handoffs
  remain in this repository. Task Observer process notes stay outside the checkout.

## Evidence and rules

- Separate observed behavior, published capabilities, community opinion, inference and owner taste.
  Preserve source, date, version, access limits and counter-evidence. Do not claim to have read every
  opinion, tested an inaccessible product or conducted a human playtest through simulated personas.
- Routine research and verification run autonomously. Recurring interviews with recruited DM/player participants are not a
  prerequisite. The owner’s requested product interview under D-012 is mandatory. Real table feedback is welcome when available; label its absence honestly.
- Every executable rule has a source kind, edition, immutable revision and examples. Use official
  EN/IT SRD locations where applicable; original house rules cite their authored decision; permitted
  private extensions retain private provenance. Never invent an SRD citation for a custom rule.
- Reaction timing follows the specific ability. Offering or declining a reaction does not spend it.
  Ready resolves after its trigger; reaction availability refreshes at the start of the next turn.
  Verify these and other timing boundaries from the official source before implementing them.

## Environments and publication

- The repository is public. Keep credentials, real character fixtures, private content and unlicensed
  reused text/assets out of every commit, screenshot, trace and CI log. `.gitignore` is not a scanner.
- Initial remote experiments may use the existing `d20-folio-staging` Firebase project. Confirm live
  access and existing staging use before writing; prefer local emulators for disposable experiments.
  No production project is a default target. Project rename/replacement is a later branding decision.
- Explicit per-change owner authorization is required for deployment, release, real-data migration,
  new spending and external commitments. Prepare the concrete result and evidence before asking.
- CI uses standard public GitHub runners. No paid AI API, larger runner, cloud service or storage
  expansion is introduced implicitly. A subscription quota problem does not authorize a purchase.
- The owner-selected main checkout is `~/Workspace/d20-studio`. Temporary worktrees, caches,
  recovery archives and artifacts stay physically under `~/Workspace/Codex`; remove completed
  worktrees after integration, preserving any unique local files before cleanup.
