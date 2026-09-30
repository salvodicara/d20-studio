# Visual design phase: skills and tools evidence

Access date 2026-10-01. Prepared for d20 Studio phase C, the visual design of a dense web app
(BG3/Solasta-style Table, D&D Beyond-style sheets, Owlbear-style map tools, Kanka-style campaign pages).
Nothing was installed. All raw evidence is in `raw/` next to this file.

## Summary for the owner (Italian)

- **La skill di design migliore sul mercato è già installata.** Impeccable (72,9K stelle GitHub,
  303,7K installazioni) è la skill di design più affermata tra quelle verificabili, e copre direzione
  visiva, design system/token, critica, rifinitura, tipografia, colore, movimento e accessibilità.
  L'unica azione utile è **aggiornarla**: la copia installata risale al 24/08 (etichetta 4.1.1, identica
  byte per byte all'upstream di quel giorno) e oggi l'upstream è alla 4.4.0.
- **C'è una sola aggiunta consigliata:** `review-animations` di Emil Kowalski, il riferimento più noto per la
  qualità delle animazioni UI. Si attiva solo se la chiami esplicitamente, quindi non interferisce con Impeccable.
- **Le skill più scaricate non vanno bene per d20.** Diverse skill molto popolari si dichiarano "per landing
  page, non per dashboard" (taste-skill) oppure sono grandi database generici (ui-ux-pro-max). Alcune hanno
  numeri di installazione gonfiati (per esempio 526K installazioni con 7 stelle).
- **Non esiste una skill per l'aspetto "BG3".** Quel look nasce dallo studio dei riferimenti con Impeccable,
  non da una skill già pronta.
- **Le icone vanno prese da librerie esistenti, non disegnate da zero.** Per i simboli di gioco lo standard è
  game-icons.net (oltre 4.000 icone, CC BY 3.0 con obbligo di citazione; lo usa anche il sistema D&D 5e di
  Foundry VTT). Per l'interfaccia c'è Lucide (ISC).
- **Generare icone SVG con l'AI ha un costo.** I servizi disponibili (QuiverAI, Recraft) sono a pagamento o
  limitano l'uso commerciale nel piano gratuito, quindi serve una tua decisione esplicita di spesa.
- **Immagini raster:** vanno bene ChatGPT o Codex. Lo strumento `imagegen` di Codex è già presente come skill
  di sistema e non va installato nulla.

## Method

1. Read the find-skills skill at `~/.claude/skills/find-skills/SKILL.md`. It is an owner-customized copy: its
   tree hash `46d9e3c` differs from the upstream lock hash `76a98a2`. Followed its steps 2–6, including
   exact-artifact identity, umbrella minimization and the broad-database fit rule.
2. **Leaderboard.** Read skills.sh All-Time and Trending on 2026-10-01. The only design entries in the
   all-time top 80 are `anthropics/skills@frontend-design` (#7, 938.7K) and
   `vercel-labs/agent-skills@web-design-guidelines` (#50, 684.2K).
3. **Search.** Ran `npx skills@1.7.0 find` with a 90 s alarm for ui design, design system, design tokens, ux,
   frontend design, css, tailwind, accessibility, typography, color palette, motion animation, game ui, figma,
   icons, svg icon and design critique. Output is in `raw/find-*.txt`.
   **Hazard:** after about 20 queries the CLI silently returned "No skills found" for every query, a false
   negative caused by rate limiting. The remaining queries went to the same backend the CLI uses
   (`skills.sh/api/search`) with pauses between calls: animation, design review, wcag, a11y, fonts,
   micro interactions, ui polish, radix, game, fantasy, design md, web interface guidelines, oklch, motion,
   icon, storybook, penpot, recraft, svg, visual regression and rpg. Output is in `raw/api-*.json`.
4. **Per-artifact verification.**
   - Scraped each skills.sh skill page for installs, stars, first-seen date and the three security audits
     (Gen Agent Trust Hub, Socket, Snyk). See `raw/pages.json`.
   - Used the GitHub API for stars, last push, license and HEAD SHA (`raw/gh-repos.tsv`, `raw/skill-paths.txt`).
   - Read every shortlisted SKILL.md from GitHub HEAD (`raw/skillmd/`).
5. **Incumbent check.**
   - Recomputed the git tree hash of `~/.agents/skills/impeccable` and compared it with the lock.
   - Diffed the installed copy against tag `skill-v4.1.1` and against HEAD (4.4.0).
   - Read the 4.4.0 launcher (`raw/impeccable-launcher.sh`).
   - Diffed the installed `frontend-design` plugin cache against both upstream copies.
6. **Non-skill tools.** Checked licenses and freshness through the GitHub API and npm, plus official pages
   (game-icons.net, designtokens.org, gsap.com license, Figma MCP docs, Recraft pricing, QuiverAI blog).

**Limits.**
- Install counts are skills.sh telemetry and can be gamed (see the red flags below).
- Security audits are the third-party verdicts shown on skills.sh; I did not rerun them.
- No skill was executed, and I did not test any paid service.
- For shadcn, the skills.sh page (82.5K) and the search API (353,437) report different install counts.

## Baseline: what is installed today

| Item | Artifact and version | Evidence |
| --- | --- | --- |
| impeccable | `pbakaus/impeccable`, folder tree `97ed30b0b0681aeb8703e492c3c47b6098e070a4`, header `version: 4.1.1`, installed 2026-08-24 | The local tree hash equals the lock `skillFolderHash`, so the copy is **unmodified upstream**. It is newer than tag `skill-v4.1.1`: 27 files differ, for example Grok Build hooks and raster-provenance rules. So it is a main-branch snapshot. Owner additions are staged separately in `~/.agents/state/d20-folio/skill-updates/2026-09-03/impeccable-extras`. |
| frontend-design | Plugin `frontend-design@claude-plugins-official`, version "unknown", last updated 2026-09-09 | The cached SKILL.md text differs from both upstream copies at HEAD: `anthropics/skills` 41bbe19 (2026-09-03) and `claude-plugins-official` 44490cc (2026-09-01). The two upstream copies are identical to each other. |
| playwright-cli | `microsoft/playwright-cli` | Runtime verification is already covered. |
| Codex imagegen | `~/.codex/skills/.system/imagegen` (OpenAI system skill) | Built-in `image_gen` by default. The CLI fallback needs `OPENAI_API_KEY`. |
| claude-mem `design-is` | Plugin skill: Dieter Rams audit | This is extra design-critique trigger surface, and it overlaps impeccable critique. |
| ECC plugin | `ecc@ecc` 2.2.0, **disabled** | It contains design-system, accessibility and motion skills. Keep it disabled because of the overlap. |
| Previously installed, removed in the 2026-09-09 reset | taste-skill (design-taste-frontend, high-end-visual-design, image-to-code), web-design-guidelines, better-icons, open-pencil, podo/awesome-design-skills | These are still listed in `~/.agents/.skill-lock.json` but are absent from `~/.agents/skills`. The stale lock entries are a hygiene item. |

## Evidence table: skills

Columns:

- **Installs:** skills.sh page count.
- **Stars:** GitHub stargazers on 2026-10-01.
- **Push:** the repository's last push.
- **Audits:** Gen Agent Trust Hub / Socket / Snyk, as P (Pass) or W (Warn).

| # | Artifact (repo@slug, pinned) | Installs | Stars | First seen | Push | Audits | License | What it contains (read) | Overlap with catalogue | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `pbakaus/impeccable@impeccable`, HEAD `0d6b47e`, folder tree `98dc864`, **4.4.0**, engine `v0.1.8` | 303.7K | 72.9K | 2026-04-08 | 2026-09-30 | P/W/P | Apache-2.0 | 20+ commands: shape, critique, audit, polish, typeset, colorize, animate, layout, extract, document (writes DESIGN.md per the Google spec), live browser variants, and a detector hook. **4.4.0 change:** the scripts become a prebuilt engine binary. It is downloaded from GitHub Releases, checked against a sha256 sidecar, and cached in `~/.impeccable/bin/0.1.8`. It can call gpt-image ("Flare") when `OPENAI_API_KEY` is set, which is paid; the native image tool stays the first choice. | Incumbent | **install (update the incumbent)** |
| 2 | `anthropics/skills@frontend-design` (installed as the claude-plugins-official plugin) | 938.7K (anthropics/skills artifact; not transferable to the plugin) | 179.1K / 37.2K | 2026-01-19 | 2026-09-03 | P/P/P | Apache-2.0 (LICENSE.txt) | One page of aesthetic-direction guidance: subject grounding, typography, anti-template rules | Incumbent; overlaps impeccable new-work | **keep; refresh the plugin** |
| 3 | `vercel-labs/agent-skills@web-design-guidelines` | 684.2K | 31.8K | 2026-01-19 | 2026-08-28 | P/W/P | No LICENSE file in the repo | A 39-line wrapper that **fetches live rules from `web-interface-guidelines@main` on every run**. These are unpinned remote instructions, which makes an injection and drift surface. | impeccable audit and critique; installed and removed once already | **use-without-install:** read `vercel-labs/web-interface-guidelines` (MIT) pinned at `e3d624b` as a review checklist |
| 4 | `nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max` | 377.3K | 131.9K | 2026-01-19 | 2026-09-27 | P/P/P | MIT | A Python search over a CSV database: 79 styles, 192 palettes, 74 font pairings and 119 UX rules, plus a `--design-system` generator | The whole impeccable surface. It is the broad-database case in find-skills step 6: product-category recipes, not fit to BG3/DDB density. | **reject** |
| 5 | `leonxlnx/taste-skill@design-taste-frontend`, plus high-end-visual-design and redesign-existing-projects | 541.4K / 395.7K / 392.8K | 91.5K | Feb–Mar 2026 | 2026-09-26 | P/P/P | MIT | An anti-slop landing-page skill. It scopes itself: "Not dashboards, not data tables, not multi-step product UI." | frontend-design; installed and removed once already | **reject** (wrong category by its own scope) |
| 6 | `emilkowalski/skills@review-animations`, HEAD `d16ebe6`, folder tree `0e0d3cb`, last changed `85e8e23` (2026-09-15) | 189.9K | 42.4K | 2026-06-18 | 2026-09-23 | P/P/P | MIT | A **manual-only** motion reviewer (`disable-model-invocation: true`). It applies 10 non-negotiable standards, and STANDARDS.md gives exact easing curves, duration budgets, springs, gesture, clip-path, performance and reduced-motion values. Author: Emil Kowalski (Sonner, Vaul, animations.dev). | impeccable `animate` is an 89-line reference, so this adds depth without duplicating it. It has no ambient trigger. | **install** (the only new skill; use it once motion work starts) |
| 7 | `emilkowalski/skills@emil-design-eng`, `@animate`, `@improve-animations` | 310.4K / 107.1K / 160.7K | 42.4K | Mar–Aug 2026 | 2026-09-23 | P/P/P | MIT | Philosophy, construction and codebase-audit skills. All are model-invocable. | They would compete with impeccable polish and animate triggers | **maybe** (not now) |
| 8 | `addyosmani/web-quality-skills@accessibility`, HEAD `afa8da9`, folder tree `90b7b38` | 57.3K | 2.9K | 2026-01-20 | 2026-08-24 | P/P/P | MIT | A 464-line WCAG 2.2 criterion-by-criterion guide (focus not obscured, target size, dragging, accessible auth…). It uses an evidence-led Lighthouse/axe workflow. | impeccable `audit` is a 136-line scoring rubric, so this is deeper. Its trigger phrases collide with impeccable. | **use-without-install** as a pinned reference checklist; reconsider installing if audits show gaps |
| 9 | `jakubkrehel/skills` family: better-typography, better-colors, better-accessibility, better-ui, better-interface, plus 6 siblings | 26.2K / 24.6K / 22.1K / 29.5K / 22.7K | 7.4K | Jul 2026 | 2026-08-29 | P/P/P | MIT | 11 cross-routed skills with exact values; `better-interface` orchestrates a combined review | This is an umbrella, and each member overlaps an impeccable command | **maybe** (a candidate independent second-opinion lens; do not install the umbrella now) |
| 10 | `google-labs-code/stitch-skills@design-md` | 63.1K | 8.4K | 2026-01-22 | 2026-08-17 | P/P/W | Apache-2.0 | Requires the Stitch MCP and synthesizes DESIGN.md from Stitch projects | impeccable `document` already writes spec-compliant DESIGN.md | **reject** |
| 11 | `shadcn-ui/ui@shadcn`, folder tree `b579152` | 82.5K (API: 353,437) | 124.9K | 2026-03-06 | 2026-09-30 | P/W/P | MIT | Official. Auto-loads when `components.json` exists and runs `npx shadcn@latest info` on load. | Stack-specific; the d20 Studio stack is not yet decided (d20 Folio used Radix + CVA + Tailwind v4, shadcn-like) | **maybe** (install only if the stack adopts shadcn/ui) |
| 12 | `greensock/gsap-skills@gsap-core` | 61.2K | 15.8K | 2026-03-20 | 2026-07-29 | P/P/P | MIT (the skill) | Official GSAP API guide. It recommends GSAP by default for any JavaScript animation request. | Library bias; the library choice is still open | **maybe** (only if GSAP is adopted) |
| 13 | `better-auth/better-icons` | 5.3K | 1.3K | 2026-01-22 | 2026-04-02 (6 months stale) | P/P/W | MIT | An Iconify search wrapper that asks for a global npm install of its CLI | Installed and removed once already; `@iconify/*` or the Iconify API does the same thing directly | **reject** |
| 14 | `openai/skills@imagegen` (`.system`) | 5.1K | 27.8K | 2026-01-28 | 2026-09-08 | P/P/P | No repository license | Codex built-in image generation with prompt schema and asset taxonomy | Already present in Codex | **use-without-install** |
| 15 | `ChromeDevTools/chrome-devtools-mcp@a11y-debugging` | 2.8K | 52.8K | 2026-02-22 | 2026-09-30 | P/P/W | Apache-2.0 | Needs the Chrome DevTools MCP (Lighthouse, accessibility-tree snapshot) | playwright-cli plus `@axe-core/playwright` | **maybe** (add the MCP only if Lighthouse or performance traces are needed) |
| 16 | `ibelick/ui-skills@fixing-accessibility`, `@baseline-ui` | 19.4K / 21.3K | 9.3K | 2026-01-22 | 2026-09-30 | P/P/P | MIT | Short constraint lists | Overlaps #8 and impeccable | **reject** |
| 17 | `gamedev-skills/awesome-gamedev-agent-skills@game-ui-ux` | 5.3K | 1.3K | 2026-06-27 | 2026-09-27 | P/P/P | Apache-2.0 | Engine UI patterns: Godot 4.7 anchors, Unity CanvasScaler, gamepad focus | Wrong platform: a web app, not a game engine | **reject** |
| 18 | `bergside/awesome-design-skills@fantasy` | 1.5K | 3.0K | 2026-04-06 | 2026-06-28 | P/P/P | MIT | A generated typeui.sh template: primary `#0250CC`, font New Rocker, brand "the best game in the world" | Does not fit BG3 or Solasta | **reject** |
| 19 | `meodai/skill.color-expert` | 2.3K | 598 | 2026-03-22 | 2026-09-23 | P/P/P | CC-BY-4.0 | 140+ color references: OKLCH ramps, APCA/WCAG, Leonardo, Huetone | impeccable colorize | **maybe** (a reference only; low adoption) |
| 20 | `figma/mcp-server-guide` (figma-use, implement-design) | 7.7K / 6.0K | 2.0K | Jan–Mar 2026 | 2026-09-30 | P/P/P; P/W/W | No license | Needs Figma plus the Figma MCP | The owner's workflow does not use Figma | **reject** (unless Figma is adopted) |
| 21 | `penpot/penpot-ai-kit` (router, design-md…) | 86 | 90 | 2026-07-09 | 2026-09-11 | P/P/P | CC-BY-4.0 | Official Penpot skills | No Penpot in the workflow; too new | **reject** |
| 22 | `open-pencil/skills@open-pencil` | 2.1K | 16 (the editor repo has 8.7K) | 2026-03-07 | 2026-09-13 | P/P/P | MIT | OpenPencil editor skills | Installed and removed once already | **reject** |
| 23 | `anthropics/knowledge-work-plugins` design (design-critique, accessibility-review) | 4.8K / 3.7K | 25.9K | 2026-02-24 | 2026-09-30 | P/P/P; P/P/W | Apache-2.0 | Generic, Figma-oriented critique | Overlaps impeccable critique and audit | **reject** |
| 24 | `wshobson/agents@tailwind-design-system` | 66.6K | 40.1K | 2026-01-20 | 2026-09-29 | P/P/P | MIT | Generic Tailwind v4 design-system patterns | impeccable extract plus Tailwind docs | **reject** |
| 25 | `kylezantos/design-motion-principles` | 10.4K | 1.2K | 2026-01-19 | 2026-05-30 | P/P/P | MIT | Motion build and audit | Dominated by #6 | **reject** |
| 26 | `mattpocock/skills@design-an-interface` | 217.1K | 272K | 2026-02-13 | — | P/P/P | MIT | The slug is gone from HEAD, folded into `codebase-design`, which covers code-module interfaces, not UI | Out of scope | **reject** |

### Red flags (install inflation or unverifiable identity)

| Artifact | Signal |
| --- | --- |
| `designed-by-ai/skills@design-mobile-apps` | 526.4K installs against **7 stars**. First seen 2026-09-04, and #2 on Trending at 21.4K/day. It is a vendor client for Sleek.design that needs `SLEEK_API_KEY`. |
| `uizze.sh@ui-taste` | 298.1K installs, but there is no GitHub repository and the skills.sh page returns **404**. The content cannot be read, so it cannot be verified. |
| `arvindrk/extract-design-system` | 129.7K installs against 230 stars, with a Warn from both Gen Agent Trust Hub and Snyk. |
| `101-skills/superpowers`, `magentosh/superpowers` and similar | Name-squatting on `obra/superpowers` while holding top trending positions. They are not design skills, but they show the leaderboard is gamed. |

## Evidence table: non-skill tools and resources (market standard)

| Job | Tool | License | Evidence (2026-10-01) | Role for d20 |
| --- | --- | --- | --- | --- |
| Design-system file | DESIGN.md spec plus `@google/design.md` CLI 0.4.0 (lint, diff, export to Tailwind or W3C DTCG) | Apache-2.0 | `google-labs-code/design.md`: 28.2K stars, push 2026-09-14, alpha. impeccable's `document.md` already follows this spec. | Single source for tokens and rationale; the CLI validates it and exports it |
| Token interchange | W3C DTCG format **2025.10 (first stable)** | W3C CG | designtokens.org; supported by Style Dictionary, Tokens Studio, Figma and Penpot | Export target if tokens ever leave the web app |
| Token build | Style Dictionary | Apache-2.0 | 4.8K stars, push 2026-09-30 | Only if multi-platform output is needed; otherwise use Tailwind v4 `@theme` CSS variables (the ponytail choice) |
| Color | OKLCH (native in Tailwind v4); Adobe Leonardo for contrast-targeted ramps; Radix Colors as a scale reference | Leonardo Apache-2.0; Radix Colors MIT | Leonardo push 2026-07; Radix Colors push 2025-12 (mature and slow) | Ramps verified against real backgrounds, in both light and dark |
| Headless components | React Aria Components 1.21.1, Radix Primitives, Base UI 1.8.0 | Apache-2.0 / MIT / MIT | react-spectrum push 2026-09-30; Radix push 2026-08-08; Base UI push 2026-09-30. The shadcn repo now ships a `migrate-radix-to-base` skill. | Accessible primitives under the custom BG3/DDB skin. The stack decision is pending. |
| Motion | Motion (motion.dev) 13.4.6; GSAP | Motion MIT; GSAP **Standard License: free for commercial use, not OSI**, and it forbids competing visual no-code animation builders | Motion 33.8K stars; GSAP 28.7K | Motion for React UI; GSAP only for timeline-heavy moments such as dice or cinematic turn banners |
| Game icons | game-icons.net (4,100+ SVG) | **CC BY 3.0, attribution required** | 1.35K stars, push 2026-04. Foundry VTT's dnd5e system ships game-icons.net artwork under this license. | Conditions, damage types, actions and map tools |
| UI icons | Lucide 1.49; Tabler (6,200+); Iconify framework (`@iconify/react` 6.0.2) | ISC / MIT / MIT (each Iconify set keeps its own license) | Lucide 24.8K stars and already used by d20 Folio; Tabler 21.8K | App chrome. Iconify gives one API across sets. |
| AI SVG generation | QuiverAI MCP (hosted, OAuth, launched 2026-06-09); Recraft V4.x API; the official `recraft-ai/mcp-recraft-server` | Commercial services. Recraft: **free-plan output is owned by Recraft, public and non-commercial; paid plans grant commercial rights.** Quiver pricing is undisclosed. | Vendor pages | Only by an **explicit owner spending decision** (project rule: no new paid service implicitly). Output needs provenance records. |
| Raster art (painted BG3-style ability icons, portraits, textures) | ChatGPT / Codex `image_gen`, with impeccable's provenance scan (`embed-prompt.mjs`) | Subscription the owner already has | Codex system skill is present | Painted ability icons in BG3 style are raster, not line SVG |
| Fonts | Fontsource packages of OFL faces (d20 Folio used Cinzel and Alegreya) | OFL (fonts); Fontsource MIT | Fontsource push 2026-09-30 | Self-hosted, versioned fonts. Final pairing is a design decision. |
| Accessibility testing | Playwright plus `@axe-core/playwright` 4.13.0; manual keyboard, touch and screen-reader passes; optional Chrome DevTools MCP (Lighthouse) | Apache-2.0 / MPL-2.0 / Apache-2.0 | Already in the d20 Folio toolchain | Automated floor. Axe finds only a subset, so the manual passes remain mandatory. |
| Visual regression | Playwright `toHaveScreenshot`; Storybook (91K stars) if a component workshop is wanted | Apache-2.0 / MIT | — | Goldens for tokens and components. Storybook is optional, since it adds surface. |
| Design canvas | Claude Design (Anthropic Labs, launched 2026-04-17, research preview on Pro/Max/Team/Enterprise; this harness exposes `DesignSync` for design-system sync). Alternatives: Google Stitch, Penpot (MPL-2.0, 60.5K stars), Figma MCP. | First-party / various | Vendor pages | Optional for comps. It does not replace impeccable's code-first loop. |

## Recommendation

1. **Keep one design owner: impeccable.** Update it from the 2026-08-24 snapshot (labelled 4.1.1) to 4.4.0.
   - **Why:** it is the top-reputation design skill (72.9K stars), it is fresh (commits on 2026-09-29 and 2026-09-30, engine release 2026-09-29)
     and it covers every phase-C job. The local copy has no customizations: its tree hash equals the lock
     hash. Relevant gains since the snapshot include:
     - human component review, later replaced by a plan-and-asset review (#858)
     - a fix so DESIGN.md tokens are no longer flagged as the generic AI palette (#809)
     - transparent-background asset production
     - `generate` variants in live mode
     - `visualize.md` before decision comps (#880)
   - **Before updating:**
     - Accept that 4.4.0 runs a **prebuilt binary** (`engine-v0.1.8`). The launcher downloads it from
       `github.com/pbakaus/impeccable/releases` and fails closed on a sha256 mismatch, but the sidecar is
       same-origin, so this is integrity checking, not independent signing. It caches the binary in
       `~/.impeccable/bin/0.1.8` and will also execute any `impeccable` binary found on PATH that passes its probe.
     - Keep `OPENAI_API_KEY` unset so no paid gpt-image or "Flare" path runs implicitly.
     - Rerun `impeccable doctor` in the project after updating.
   - **Commands** (for the coordinator; not run here):
     - `npx skills add https://github.com/pbakaus/impeccable --skill impeccable -g -y`
     - then verify that `~/.agents/skills/impeccable` has tree `98dc8642f86c9778ef343627045c50c9032f305c` (or newer, re-audited)
     - check that the `~/.claude/skills` symlink still resolves
     - check that Codex discovers the skill
2. **Keep the `frontend-design` plugin and refresh it.**
   - Use the `/plugin` marketplace update for `claude-plugins-official`. The cached text differs from
     upstream HEAD, and a refresh is low stakes.
   - Keep its scope to aesthetic direction; impeccable owns the rest.
3. **Add exactly one skill: `emilkowalski/skills@review-animations`.**
   - Pin it at repo `d16ebe6`, folder tree `0e0d3cb`.
   - **Why:**
     - It is the market reference for UI-motion craft: 189.9K installs, 42.4K stars, 3/3 audits pass, MIT,
       fresh on 2026-09-23.
     - It gives exact values where impeccable's animate reference is thin.
     - It is manual-only, so it adds **zero ambient triggers**, which satisfies find-skills rule 5 and the
       small-catalogue rule.
   - Install it when motion work begins, with
     `npx skills add https://github.com/emilkowalski/skills --skill review-animations -g -y`, then verify the
     tree hash.
4. **Use without installing (pinned reading, no triggers):**
   - `addyosmani/web-quality-skills` `skills/accessibility` at `afa8da9`: the WCAG 2.2 checklist for impeccable audits.
   - `vercel-labs/web-interface-guidelines` at `e3d624b`: an interface-review checklist.
   - Codex `imagegen` for raster art.
5. **Revisit only on a trigger:**
   - `shadcn-ui/ui@shadcn`, if the stack adopts shadcn/ui.
   - `greensock/gsap-skills@gsap-core`, if GSAP is adopted.
   - `jakubkrehel/skills` (better-interface), if an independent second-opinion design lens is needed and
     impeccable critique misses defects.
   - Chrome DevTools MCP, if Lighthouse or performance traces are required.
6. **Reject everything else in the tables above.** Main reasons:
   - wrong product category (taste-skill, ui-ux-pro-max, the fantasy template, game-engine UI)
   - vendor or Figma lock-in (Stitch, Figma, Penpot, Sleek)
   - unpinned remote instructions (web-design-guidelines as installed)
   - staleness (better-icons)
   - inflated or unverifiable installs (design-mobile-apps, ui-taste, extract-design-system)
   - duplication of impeccable (ibelick, wshobson, Anthropic knowledge-work design, kylezantos)
7. **The BG3/Solasta, D&D Beyond, Owlbear and Kanka look has no skill shortcut.** It comes from:
   - the reference corpus analysed through impeccable `shape` and new-work, with owner-approved comps
   - DESIGN.md tokens
   - game-icons.net glyphs plus painted raster ability icons with provenance
   - OFL fantasy display type over a legible UI face
   - accessible headless primitives
8. **Governance reminder.**
   - D-012 in `d20-studio/CLAUDE.md` gates mockups and visual work on the owner's explicit approval of the
     product contract. The owner's message reads as approval of the feature map, but the coordinator should
     record that approval before visual work starts.
   - Install versions and any customizations belong in the repository (D-010) after install.
