# Visual QA skills and tools for the redesign

Evidence date 2026-10-01 (commands run 2026-09-30 by the local clock). Method: `~/.claude/skills/find-skills/SKILL.md`,
which covers the skills.sh leaderboard, `npx skills find` (CLI 1.7.0) plus the skills.sh search API, and a check of every
candidate's skills.sh page, GitHub repo, npm registry entry and SKILL.md text. I ran no installers and changed
nothing outside this folder. Raw evidence is in `skills-qa-raw/`.

## In breve (per il proprietario)

- **No new skill needs to be installed for visual QA.** The skills on the market in this area are
  mostly prose checklists that repeat what `impeccable` (critique/audit/harden/adapt) and
  `playwright-cli` already cover. Where they are good, it is cheaper to read them once at a pinned
  commit than to keep them always active.
- **The real gap is tooling.** The market standard is Playwright Test (`toHaveScreenshot` for
  pixel diffs, `toMatchAriaSnapshot` for structure) plus axe-core through `@axe-core/playwright`.
  Both are free and open source, and both belong in the redesign repository as devDependencies. A skill cannot do this job.
- **One incumbent needs an update.** `playwright-cli` 0.1.18 should go to 0.1.22 so it gets the one-command
  emulation for dark/light theme, reduced motion, forced colours and contrast. Local
  customisations need to be preserved.
- **Optional, needs owner approval:** Argos gives phone-viewable visual diffs as an external service with
  a free tier of 5,000 screenshots per month. It needs a CI secret and uploads screenshots to a third party.

## 1. What the job needs vs what is already installed

| Need during the redesign | Already covered by | Gap |
|---|---|---|
| Capture screens across viewports, themes, locales | `playwright-cli` 0.1.18 skill (`resize`, `open --device`, `run-code` with `page.emulateMedia`, named sessions), Claude-only Browser pane / Claude-in-Chrome (`resize_window` + `colorScheme`) | 0.1.18 lacks the one-shot `set-color-scheme` / `set-reduced-motion` / `set-forced-colors` / `set-contrast` / `set-media` added upstream (verified: absent from `playwright-cli --help` on 0.1.18). Workaround today: `run-code` + `page.emulateMedia`. |
| Pixel diff before/after, committed baselines | Nothing in the catalogue. The old d20 Folio had a `toHaveScreenshot` lane, but its baselines were uncommitted and platform-specific (research-tooling.md, 2026-09-02). | **Needs a harness:** Playwright Test in the redesign repo |
| Structural regression (roles, names, EN/IT text) | `playwright-cli snapshot` (ad hoc, no assertion) | `toMatchAriaSnapshot` (Playwright ≥ 1.49) in the harness |
| Automated a11y engine | Ad hoc: 2026-10-01 regress scripts inject axe from `…/press-on-please/node_modules/axe-core/axe.min.js`, which is **axe-core 4.12.1 from another project's node_modules** | Pin `axe-core`/`@axe-core/playwright` 4.13.0 in the harness instead of borrowing another repo's copy |
| Design critique from screenshots | `impeccable` 4.1.1 (`critique`, `audit`, `polish`, in-page browser detector), `frontend-design` plugin, `playwright-cli show --annotate` (owner draws on the live page and the agent receives the annotated screenshot) | none |
| Whole-page quality audit (a11y + best practices) | `impeccable audit` (qualitative 0–4 scores) | Optional Lighthouse 13.5.0 CLI run; no skill needed |
| Phone-viewable diff review for the owner | Playwright HTML report (expected/actual/diff viewer) if the harness exists | Hosted review only through a SaaS (Argos), owner-gated |

## 2. Recommended stack (in order)

1. **Update the incumbent `playwright-cli`.** Move `@playwright/cli` from 0.1.18 to **0.1.22**
   (Apache-2.0, published 2026-09-28; microsoft/playwright-cli 13.7K★). Move the SKILL.md to upstream
   path commit `83368cb3bf` (2026-09-28), and re-apply the local "Audit hygiene" section, which exists only
   locally. Upstream gained: `set-color-scheme`, `set-reduced-motion`, `set-forced-colors`,
   `set-contrast`, `set-media print`, `recording-start/stop`, `find --filename`, `open --mobile`, and a
   `pr-attachments` reference. It also narrowed `allowed-tools` from `Bash(npx:*) Bash(npm:*)` to `npx playwright`, which reduces
   the permissions the skill asks for. skills.sh: 170.6K installs; Gen Agent Trust Hub Pass, Socket Warn, Snyk Warn.
2. **Build the harness in the redesign worktree** once code exists (project devDependencies, not skills):
   - `@playwright/test` **1.63.0** (Apache-2.0; microsoft/playwright 96.9K★, pushed 2026-09-30).
     `toHaveScreenshot` uses pixelmatch internally. Defaults: `threshold 0.2`, `animations "disabled"`,
     `caret "hide"`, `scale "css"`, `maskColor #FF00FF`. It also supports `maxDiffPixels`, `maxDiffPixelRatio`, `mask` and
     `stylePath`. Playwright's docs warn that rendering varies with OS, version, hardware and headless mode, so
     generate and compare baselines in one pinned environment. For the public repo, the Playwright
     Docker image in CI is the usual answer; per-OS local baselines are the alternative.
   - `toMatchAriaSnapshot` for structure and EN/IT copy. It is YAML, reviewable in diffs and updated with `-u`.
   - `@axe-core/playwright` **4.13.0** + `axe-core` **4.13.0** (MPL-2.0; dequelabs/axe-core 7.6K★,
     pushed 2026-09-30). Use `withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa'])`. The 2026-10-01 regress
     script disabled `color-contrast`. Re-enable it for the redesign, because contrast is exactly what a
     visual redesign changes.
   - Matrix: every surface × {dark, light} × {phone ~390, desktop 1440} × {en, it}, plus WebKit for
     iPhone rendering. Playwright covers WebKit; CDP-only tools do not.
3. **Keep using `impeccable`** for critique and audit, with screenshots from `playwright-cli`. Use
   `playwright-cli show --annotate` for owner feedback on a live page.
4. **Optional, ad hoc: Lighthouse CLI 13.5.0** (Apache-2.0, published 2026-09-18; GoogleChrome/lighthouse
   30.8K★). Run `npx lighthouse@13.5.0 <url> --only-categories=accessibility,best-practices
   --no-enable-error-reporting` from a scratch directory. The CLI asks once about anonymous error reporting,
   so pass the flag explicitly.
5. **Optional, owner-gated: Argos** (`@argos-ci/playwright` 7.7.0, MIT, published 2026-09-30;
   argos-ci/argos 633★, pushed 2026-09-30). Hobby tier: up to 5,000 screenshots per month; Pro is $100/month
   (argos-ci.com/pricing, fetched today). It needs `ARGOS_TOKEN` as a CI secret and uploads screenshots.
   The zero-cost alternative is the local Playwright HTML report, which the owner can also see if it is published as a
   private Artifact.

The following skills are worth reading without installing, pinned so they cannot drift:
- `currents-dev/playwright-best-practices-skill` @ `283d5cbc5d`: `testing-patterns/visual-regression.md`
  (masking, animations, thresholds, CI/Docker, responsive, snapshot updates) and
  `testing-patterns/accessibility.md`. Read these while writing the harness.
- `addyosmani/web-quality-skills` @ `c6b06ad128`: `skills/accessibility/SKILL.md` + `references/WCAG.md`.
  This is a WCAG 2.2 checklist that includes 2.4.11 focus not obscured, 2.5.7 dragging, 2.5.8 target size,
  3.2.6, 3.3.7 and 3.3.8. impeccable does not enumerate these (grep of impeccable/reference found no 2.2
  criteria; `adapt.md` uses a 44 px target).
- `jezweb/claude-skills` responsiveness-check @ `589d793f96`: a breakpoint sweep and a transition-detection
  method (320…2560, adjacent-width comparison). It already prefers `playwright-cli`.

## 3. Skill candidates (exact artifacts)

skills.sh numbers come from each skill's page (Installs · GitHub stars · Gen Agent Trust Hub / Socket / Snyk).
"Path commit" is the last commit touching the skill folder.

| Artifact | Installs | Repo ★ · licence | Path commit (date) | Audits G/S/Sn | Contents | Overlap | Verdict |
|---|---|---|---|---|---|---|---|
| microsoft/playwright-cli@playwright-cli (incumbent) | 170.6K | 13.7K · Apache-2.0 | 83368cb3bf (2026-09-28) | Pass/Warn/Warn | CLI reference: snapshot refs, screenshots, devices, emulation, tracing, video, `show --annotate` | is the incumbent | **install (update 0.1.18→0.1.22)** |
| currents-dev/playwright-best-practices-skill@playwright-best-practices | 88.3K | 386 · MIT | 283d5cbc5d (2026-07-21) | Pass/Pass/Pass | ~770 KB of references on authoring Playwright tests; visual-regression.md is 634 lines | Trigger ("writing Playwright tests…") collides with playwright-cli's test references | **use-without-install** (read pinned files) |
| addyosmani/web-quality-skills@accessibility | 57.3K | 2.9K · MIT | c6b06ad128 (2026-08-24) | Pass/Pass/Pass | Evidence-led a11y workflow (Lighthouse → a11y tree → keyboard → fix → re-run); WCAG 2.2 SC list | Trigger words "accessibility/a11y audit" collide with impeccable audit/harden | **use-without-install** |
| addyosmani/web-quality-skills@web-quality-audit | 28.7K | 2.9K · MIT | c6b06ad128 (2026-08-24) | Pass/Pass/Pass | Lighthouse-style perf/a11y/SEO/best-practices audit | SEO/CWV focus fits public sites, not a local PWA redesign; overlaps impeccable audit | reject |
| vercel-labs/agent-browser@agent-browser (+ `dogfood` served by the CLI) | 987.5K | 43.4K · Apache-2.0 (npm 0.38.1, 2026-09-16) | 021d9255e5 (2026-08-24); dogfood 8c15ff9f71 (2026-09-10) | Pass/Pass/Warn | Rust CDP CLI: `screenshot --threshold/--if-changed`, `diff screenshot/snapshot/url` (baseline vs current, red diff image), embedded axe `a11y` (no CDN), device emulation, dogfood QA report template | Full duplicate of playwright-cli; its SKILL.md tells agents to "Prefer agent-browser over any built-in browser automation", which competes with playwright-cli and the Browser pane; CDP-only (no WebKit); existing `run-code` harness scripts would not port | reject as addition; not a proven replacement (see §5) |
| affaan-m/ecc@browser-qa | page 3.7K (search API 8.7K: inconsistent) | 269.7K · MIT | 0765f7a2ca (2026-09-27) | Pass/Pass/Warn | Prose 4-phase QA (smoke, interaction, 3-breakpoint visual, axe) → SHIP verdict | Previously installed (lock entry 2026-08-22) and removed in the 2026-09-09 catalogue cut; duplicates playwright-cli + impeccable | reject |
| github/awesome-copilot@web-design-reviewer | 13.8K | 39.5K · MIT | 4214189287 (2026-08-07) | Pass/Pass/Warn | Generic visual inspection → fix loop | Duplicates impeccable critique/polish | reject |
| jezweb/claude-skills@responsiveness-check | 1.7K | 1.0K · MIT | 589d793f96 (2026-02-26) | Pass/Pass/Warn | Breakpoint sweep, 8-check layout matrix, transition detection | Partially impeccable `adapt`; path 7 months stale | **use-without-install** (method only) |
| chromedevtools/chrome-devtools-mcp@a11y-debugging | 2.8K | 52.8K · Apache-2.0 (npm 1.10.1, 2026-09-23) | 50a16fae69 (2026-08-24) | Pass/Pass/Warn | Lighthouse a11y via MCP `lighthouse_audit`, a11y tree, native issues | Requires the MCP server; **Google usage statistics on by default** (`--no-usage-statistics`; off when `CI` is set); CrUX lookups; Lighthouse CLI gives the same audit without MCP | reject |
| jakubkrehel/skills@better-accessibility | 22.1K | 7.3K · MIT | 267330e1ad (2026-08-29) | Pass/Pass/Pass | Code-level a11y guidance | impeccable harden/audit; no engine | reject |
| ibelick/ui-skills@fixing-accessibility | 19.4K | 9.3K · MIT | df4eb34c5d (2026-02-19) | Pass/Pass/Pass | Code-level a11y fix rules | same | reject |
| wshobson/agents@screen-reader-testing | 10.1K | 40.1K · MIT | 47a5dbc3f9 (2026-03-07) | Pass/Pass/Pass | Manual VoiceOver/NVDA procedures | Not agent-automatable; human pass | reject |
| browserbase/skills@ui-test | 2.9K | 3.7K · repo no licence (skill says MIT) | b2ae728349 (2026-05-18) | Pass/Pass/Warn | Diff-driven adversarial UI testing via sub-agents | Needs a new `browse` CLI; remote mode needs `BROWSERBASE_API_KEY`; duplicates the stack | reject |
| anthropics/skills@webapp-testing | 167.4K | 179.0K · LICENSE.txt | b9e19e6f44 (2026-04-20) | Pass/Warn/Warn | Python Playwright scripts + server helper | Duplicates playwright-cli in a second language | reject |
| software-mansion/argent@argent-screenshot-diff | 19.3K | 2.9K · Apache-2.0 | 1e69c90981 (2026-09-03) | Pass/Pass/Pass | Screenshot diff for iOS/Android simulators and devices (`udid`) | Wrong platform (native RN, not web) | reject |
| alwaysmeticulous/skills@meticulous-simulate-and-diff | 7.5K | 11 · ISC | 50874d4d94 (2026-08-12) | Pass/Pass/Pass | Replays recorded sessions via the Meticulous SaaS | SaaS account, 11★ repo | reject |
| squirrelscan/skills@audit-website | 72.1K | 92 · "see LICENSE" | f4219bcd69 (2026-09-06) | Pass/Pass/Warn | squirrel CLI, 260+ rules, SEO-heavy | Needs a proprietary CLI; 92★ | reject |
| manutej/luxor-claude-marketplace@playwright-visual-testing | 1.3K | 62 · **no licence** | 05beeee8bd (2025-10-18) | Pass/Pass/Warn | Playwright-MCP tool reference | Stale, unlicensed | reject |
| accesslint/skills@accessibility-audit | 799 | 103 · none at root | 81a73749aa (2026-08-03) | Pass/Pass/Pass | WCAG-EM audit via its own MCP | < 1K installs; extra MCP | reject |
| vercel-labs/agent-skills@web-design-guidelines | 684.2K | 31.7K · none at root | ba46938889 (2026-01-16) | Pass/Warn/Pass | Fetches **unpinned remote rules** from GitHub at every run | Supply-chain drift; removed in the 2026-09-09 cut; duplicates impeccable | reject |

Searched but below the bar (< 1K installs, or off-topic): aj-geddes visual-regression-testing (712),
ruvnet browser-screenshot-diff (702), patricio0312rev visual-regression-tester (318),
dylanfeltus visual-qa (453), daymade frontend-visual-qa (464), spencerpauly visual-qa-testing (586),
Lighthouse skills (all ≤ 610: jeremylongshore 610, onnokh 499, googlechrome/lighthouse@lighthouse-verification 13).
The leaderboard's top ranks contain no dedicated visual-regression or a11y skill.

## 4. Non-skill tools (market standard)

| Tool | Version (publish date) | Licence · repo | Verdict / role |
|---|---|---|---|
| Playwright Test `toHaveScreenshot` + `toMatchAriaSnapshot` | 1.63.0 | Apache-2.0 · 96.9K★ | **install** as a repo devDependency (the harness) |
| axe-core + @axe-core/playwright | 4.13.0 (2026-08-05 / 2026-08-11) | MPL-2.0 · 7.6K★ / 726★ | **install** as a devDependency; replaces the borrowed 4.12.1 path |
| Lighthouse CLI | 13.5.0 (2026-09-18) | Apache-2.0 · 30.8K★ | use-without-install (npx, ad hoc, `--no-enable-error-reporting`) |
| pixelmatch | 7.2.0 (2026-04-29) | ISC · 7.0K★ | maybe: only for ad-hoc diffs of `playwright-cli` screenshots outside the harness (same engine as Playwright) |
| odiff (`odiff-bin`) | 4.5.0 (2026-07-23) | MIT · 3.2K★ | maybe: faster alternative to pixelmatch; not needed at this scale |
| Argos (`@argos-ci/playwright`) | 7.7.0 (2026-09-30) | MIT · 633★ + SaaS | maybe, **owner-gated** (secret + third-party upload; free ≤ 5,000/month) |
| reg-suit / reg-cli | 0.14.5 (2025-08-26) / 0.19.0-rc3 | MIT · 1.3K★ | reject: the Playwright HTML report already gives a local diff viewer |
| BackstopJS | 6.3.25 (**2024-09-07**) | MIT · 7.2K★ | reject: no npm release in two years, although the repo is still pushed |
| Lost Pixel | 3.22.0 (2024-11-14) | MIT · **archived 2026-04-22** | reject |
| pa11y / pa11y-ci | 10.0.0 / 4.1.1 | LGPL-3.0 · 4.6K★ | reject: second engine, redundant with axe |
| IBM accessibility-checker | 4.0.34 (2026-09-08) | Apache-2.0 · 779★ | reject: redundant engine |
| Unlighthouse | 0.19.0 (2026-09-29) | MIT · 4.9K★ | reject: site-crawl for public sites; hash-routed PWA |
| chrome-devtools-mcp | 1.10.1 (2026-09-23) | Apache-2.0 · 52.8K★ | reject: telemetry on by default; duplicates the Browser pane and the Lighthouse CLI |
| @playwright/mcp | 0.0.83 (2026-09-28) | Apache-2.0 · 37.7K★ | reject: duplicates playwright-cli |
| Chromatic / Percy / Applitools | SaaS | paid | reject. Chromatic needs Storybook. Prices per the 2026-09-02 research (Chromatic from $179/mo, Percy from $599/mo), **not re-verified today** |
| Vitest browser mode `toMatchScreenshot` | @vitest/browser 5.0.3 | MIT | maybe, only if the chosen stack is Vite and component-level screenshots are wanted; page-level Playwright covers the need |

## 5. Why agent-browser does not supersede playwright-cli (counter-evidence kept)

agent-browser is the most-installed browser skill (987.5K vs 170.6K). Its built-in `a11y` (vendored
axe) and `diff screenshot/snapshot/url` are exactly the redesign's QA verbs. It is **not** a proven
replacement for this job, for four reasons:
- It is CDP-only, so there is no WebKit rendering check for iPhone Safari. playwright-cli covers WebKit, Firefox and Chromium.
- The 2026-10-01 evidence harness is built on `playwright-cli run-code` journeys (close-regress, regress, review-ux)
  and would need rewriting.
- The diff and a11y features are reproducible with committed baselines in Playwright Test plus `@axe-core/playwright`.
  That is a stronger artifact, because it is versioned and CI-runnable, not session-local.
- Its SKILL.md tells the agent to prefer it over any other browser tool, which is an ambient-trigger conflict.

Revisit if the Playwright harness proves too heavy for quick agent loops.

## 6. Incumbent notes (not new installs)

- **impeccable:** 4.1.1 is installed (lock skillFolderHash `97ed30b0b0`, updatedAt 2026-08-24). Upstream `pbakaus/impeccable` skill path is now
  at `555e841dbb` (2026-09-30), SKILL `version: 4.4.0`, with a native detect engine (`@impeccable/cli-*` 0.1.8,
  2026-09-29, licence "SEE LICENSE IN LICENSE"). The 2026-10-01 `review-ux/logs/detect.err` shows the local static
  detector ran **DEGRADED** (htmlparser2/css-select/css-tree/domutils missing), so its findings were an undercount.
  The in-page browser detector was unaffected. I have not verified whether 4.4.0 fixes this. Handle it as
  a separate update task that diffs the local customisations first.
- **Skill lock hygiene:** `~/.agents/.skill-lock.json` still lists removed skills (for example `browser-qa`,
  `web-design-guidelines`, `design-taste-frontend`). The file is informational only; the installed catalogue is the 9 dirs under
  `~/.agents/skills`.
- Claude-only helpers (the Browser pane `resize_window` with `colorScheme`, and Claude-in-Chrome) do not exist in Codex. That is one more reason to keep QA
  on the harness-neutral CLI plus a repo test suite.

## 7. Limits

- I did not execute any candidate. Verdicts rest on SKILL.md text, registry and repo metadata, and docs.
- skills.sh install counts differ between the search API and the skill pages for `affaan-m/ecc@browser-qa`
  (8,705 vs 3.7K). I report both and transfer neither to sibling entries.
- Snyk "Warn" appears on most browser-driving skills, including the incumbent playwright-cli, and I did not open the
  individual audit reports.
- Two keyword searches returned empty through the API because of rate limiting. The CLI covered "visual regression"; see raw logs.

Raw evidence (this folder): `skills-qa-raw/find-2026-09-30.txt`, `api-search-2026-09-30.txt`,
`skills-sh-details-2026-09-30.txt`, `skill-path-commits-2026-09-30.tsv`, `npm-view-2026-09-30.tsv`,
`npm-publish-dates-2026-09-30.txt`, `gh-tools-2026-09-30.tsv`, `skillmd/*.md` (downloaded SKILL.md texts).
