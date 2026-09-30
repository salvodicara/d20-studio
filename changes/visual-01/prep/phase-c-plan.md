# Phase C (visual design): operating plan

Date: 2026-10-01 evidence folder (checks run 2026-09-30 on the Mac).
Inputs: `skills-design.md`, `skills-assets.md`, `skills-qa.md` and `asset-inventory.md` in this folder, plus the
`codex/interview-01` worktree (ROADMAP D-014, I-243, I-245 and `changes/interview-01/visual-phase-backlog.md`).
This is a plan. **Update 2026-10-01 (coordinator):** installed with the evidence below — impeccable 4.4.0
(`npx skills add https://github.com/pbakaus/impeccable --skill impeccable -g -y`), review-animations
(`npx skills add https://github.com/emilkowalski/skills --skill review-animations -g -y`), and
`@playwright/cli` 0.1.22 with the refreshed playwright-cli skill and the owner's local «Audit hygiene»
section re-appended. Canonical layout kept: `~/.agents/skills/<name>` with `~/.claude/skills` symlinks;
backup in `~/Workspace/Codex/d20-blueprint-evidence/backups/agents-skills-before-phase-c-2026-10-01.tgz`.
Still to do at the start of Phase C: the frontend-design plugin refresh (optional, `/plugin marketplace
update claude-plugins-official` in an interactive terminal) and the repo dev tooling in the visual
worktree (§1). Nothing was generated.

**Re-verified for this plan (2026-09-30):**
- npm latest versions:
  - `@playwright/cli` 0.1.22
  - `@playwright/test` 1.63.0
  - `axe-core` and `@axe-core/playwright` 4.13.0
  - `svgo` 4.1.0
  - `@google/design.md` 0.4.0
  - `lighthouse` 13.5.0
  - `lucide-static` 1.49.0
  - `@iconify-json/game-icons` 1.2.4 (CC-BY-3.0)
  - `@phosphor-icons/core` 2.1.1
  - `@tabler/icons` 3.48.0
- **impeccable upstream moved after the evidence file.**
  - HEAD is now `f652bd4` (2026-09-30 18:03 UTC, "Sync generated provider output").
  - The skill folder tree is now `babc0b2`. The evidence file recorded `98dc864` at `0d6b47e`.
  - `metadata.version` is still 4.4.0.
- review-animations is unchanged: folder tree `0e0d3cb` at `d16ebe6`.
- Local state:
  - `playwright-cli` is 0.1.18, and its local "Audit hygiene" section is at SKILL.md line 410.
  - impeccable 4.1.1 is installed.
  - `OPENAI_API_KEY` is absent from the environment.
- Font licences come from the `google/fonts` repository at `9710da1`. They are listed in §2.

## In breve (per il proprietario)

- **Poche installazioni, tutte con prove.**
  - Si aggiornano le due skill che hai già: Impeccable, la skill di design migliore sul mercato, e playwright-cli
    per i controlli nel browser.
  - Se ne aggiunge una sola: `review-animations` di Emil Kowalski per le animazioni, che parte solo se la si chiama.
  - Nel progetto entrano quattro strumenti di test standard e gratuiti.
  - Nessuna spesa.
- **Icone:** si prendono da librerie esistenti, senza disegnarle da zero.
  - game-icons.net per i simboli di gioco. È la stessa libreria usata dal sistema D&D di Foundry VTT.
  - Lucide per i comandi dell'interfaccia.
  - Le citazioni degli autori vanno in un file e nella pagina «Fonti e attribuzione» dell'app.
- **Immagini:** le genera Codex con il tuo abbonamento ChatGPT, senza chiavi a pagamento.
  - Sono ritratti, mappa, sfondi e oggetti.
  - Si riusano subito i 330 ritratti SRD e le 12 scene di d20 Folio. d20 Folio non viene toccato.
- **Caratteri:** solo font con licenza libera OFL, salvati nel progetto (per esempio Roboto e Roboto Condensed,
  quelli di D&D Beyond).
- **Cosa vedrai tu:**
  1. le bacheche dei riferimenti;
  2. 2–3 direzioni vere sull'app (Home, Scheda, Tavolo), su telefono e computer;
  3. la tua scelta;
  4. aggiornamenti prima/dopo, area per area;
  5. alla fine l'app completa da approvare.
- **Decidi solo tu:** quale direzione, lo stile delle icone, i caratteri e l'approvazione finale.
  Tutto il resto lo decidono gli agenti.

## 0. Preconditions

1. **Freeze the functional version.**
   - Per I-245, first finish the calendar addition. It is currently uncommitted in `codex/interview-01`
     (`calendar-export.mjs` and its tests).
   - Complete the still-pending distinct review of the 01/10 closing fixes and the calendar change, on the exact candidate.
   - Then write a new manifest and a local tag.
   - Phase C branches from that tag: `codex/visual-01` in `~/Workspace/Codex/d20-studio-visual-01`.
2. **Entry-point text (coordinator only).**
   - The branch `AGENTS.md` still leads with D-013, and main `CLAUDE.md` still says D-012 "no mockups".
   - When integrating, add a "Phase C, D-014 / I-245" heading. Otherwise a fresh visual session will read the stale gate
     and refuse.
3. **Amend the blueprint contract.** `design/blueprint/DEVELOPMENT.md` says "No external assets/SDK", and DESIGN.md
   says "Nessun font scaricato". Record a delegated decision (I-2xx) that keeps these rules:
   - No remote asset, CDN or SDK at runtime.
   - Vendored local files with licence records are allowed.
   - The blueprint stays buildless and offline.
   - `sw.js` never caches, so no precache list needs updating.
4. **Harness: the author runs in Codex (ChatGPT app).**
   - Codex has native `image_gen` on the plan quota.
   - It reads `~/.agents/skills` natively.
   - Impeccable's asset producer is written for Codex `image_gen`.
   - Model and effort stay as in interview-01 (the owner's choice).
   - The reviewer is a separate session (Claude Code or another Codex) on the exact SHA.
   - If a Claude session authors instead, it writes the prompts and manifest, and Codex renders them. The owner allowed
     "apri Codex e gliele fai generare". Use the bundled binary `/Applications/ChatGPT.app/Contents/Resources/codex` by
     absolute path. Never use `npx @openai/codex` (a 332 MB download) or the paid API.

## 1. Final install list

The owner authorised installs in I-245 on find-skills evidence. The catalogue stays small:
- 2 incumbent updates
- 1 manual-only skill
- 1 plugin refresh
- 4 dev-only repo packages

After installing, record the tree hashes and versions in `changes/visual-01/tooling.md` (D-010).

| # | What | Exact command | Artifact identity | Why | Replaces / complements | Trigger overlap to watch |
|---|---|---|---|---|---|---|
| 1 | **impeccable** update 4.1.1 → 4.4.0 | `npx skills add https://github.com/pbakaus/impeccable --skill impeccable -g -y`, then `impeccable doctor` in the worktree | `pbakaus/impeccable` `.agents/skills/impeccable`: expected tree `babc0b2` @ `f652bd4`, `metadata.version: 4.4.0`, engine `v0.1.8` (binary downloaded to `~/.impeccable/bin/0.1.8`, sha256 same-origin); Apache-2.0; 72.9K★, 303.7K installs; audits P/W/P | The single design owner: shape, critique, audit, polish, typeset, colorize, animate, extract, `document` (DESIGN.md, Google spec), live variants, asset producer on Codex `image_gen`. New since the snapshot: plan/asset review, DESIGN.md-token false-positive fix, transparent assets, `generate` variants | Replaces its own 2026-08-24 snapshot (tree `97ed30b` = lock, unmodified, so nothing to re-apply). Owner extras in `~/.agents/state/d20-folio/skill-updates/2026-09-03/impeccable-extras` stay untouched | `frontend-design` (new work); claude-mem `design-is` (critique, Claude only); ECC plugin must stay **disabled**. Keep `OPENAI_API_KEY` unset (paid "Flare"/generate-image path). Make sure no stray `impeccable` binary is on PATH, because the launcher would execute it. If the installed tree ≠ `babc0b2`, diff and re-audit before use |
| 2 | **playwright-cli** update 0.1.18 → 0.1.22 | `npm i -g @playwright/cli@0.1.22`, then refresh `~/.agents/skills/playwright-cli/SKILL.md` from `microsoft/playwright-cli` `skills/playwright-cli` @ `83368cb3bf` and re-append the local "Audit hygiene" section | npm `@playwright/cli` 0.1.22 (Apache-2.0); 170.6K installs; audits P/W/W | One-command `set-color-scheme`, `set-reduced-motion`, `set-forced-colors` and `set-contrast` for the theme × motion × contrast matrix; `show --annotate` for owner feedback. The existing ~190 `run-code` journeys keep running | Updates the incumbent | Claude Browser pane / claude-in-chrome (Claude only). Anything recorded as evidence uses playwright-cli |
| 3 | **review-animations** (new) | `npx skills add https://github.com/emilkowalski/skills --skill review-animations -g -y` | `emilkowalski/skills` @ `d16ebe6`, folder tree `0e0d3cb`; MIT; 42.4K★, 189.9K installs; audits P/P/P | Exact easing, duration, spring and reduced-motion standards for dice, turn banner, weather, hotbar and toasts | Complements impeccable `animate` (89 lines), which it deepens without duplicating | None: `disable-model-invocation: true`. Invoke it explicitly in step 7 |
| 4 | **frontend-design** plugin refresh | Claude Code: `/plugin marketplace update claude-plugins-official` (and the Codex plugin equivalent if stale) | `anthropics/skills` `frontend-design` (upstream `41bbe19`); Apache-2.0 | The cached text differs from upstream. Low stakes | Keeps the incumbent; used only for aesthetic direction in step 3 | Overlaps impeccable `shape`; impeccable owns everything else |
| 5 | **Repo dev tooling** (worktree only; the blueprint runtime stays dependency-free) | `npm i -D -E @playwright/test@1.63.0 axe-core@4.13.0 @axe-core/playwright@4.13.0 svgo@4.1.0`, then `npx playwright install chromium webkit` | Apache-2.0 / MPL-2.0 / MPL-2.0 / MIT | `toHaveScreenshot` goldens and `toMatchAriaSnapshot` (structure and IT/EN text); a pinned axe engine; SVG optimisation for vendored icons | Replaces the borrowed axe 4.12.1 from `press-on-please/node_modules` | Separate job from playwright-cli (ad hoc journeys vs assertions) |

**On demand, no install:**
- `npx @google/design.md@0.4.0 lint design/blueprint/DESIGN.md`. The repository is Apache-2.0, but the npm `license`
  field is empty.
- `npx lighthouse@13.5.0 <url> --only-categories=accessibility,best-practices --no-enable-error-reporting`
  (optional; run from scratch).

**Pinned reading instead of installing** (no ambient triggers):
- `addyosmani/web-quality-skills` `skills/accessibility`: tree `90b7b38`, path commit `c6b06ad128`. It is the WCAG 2.2
  list, including 2.4.11, 2.5.7, 2.5.8, 3.3.7 and 3.3.8.
- `vercel-labs/web-interface-guidelines` @ `e3d624b`.
- `currents-dev/playwright-best-practices-skill` @ `283d5cbc5d`: `visual-regression.md`.
- jezweb `responsiveness-check` @ `589d793f96`: the 320–2560 sweep method.
- jezweb `icon-set-generator` @ `ee91a87a5c`: SVG rules.
- gamedev-skills `create-game-assets` @ `d4b0e35550`: the `references/provenance.md` field list.

**Rejected:**

| Candidate | Reason |
|---|---|
| ui-ux-pro-max | Broad database |
| taste-skill | Landing pages only, by its own scope |
| web-design-guidelines (as a skill) | Unpinned remote rules |
| Stitch `design-md` | Covered by impeccable `document` |
| better-icons | Stale; curl to Iconify does the same |
| Image-generation marketplace skills | Paid or inflated installs |
| agent-browser | No WebKit; would conflict with playwright-cli |
| Argos | Third-party upload; owner-gated |
| Recraft / QuiverAI | Paid; spending gate |
| OpenAI Images API | New spending |
| ComfyUI | Heavy setup; licence risk |

**Revisit only on a trigger:**
- `icon-set-generator` if a bespoke icon family is scheduled.
- `create-game-assets` if a large raster family (a full bestiary) is scheduled.
- `shadcn` or `gsap-core` only with the Phase E stack.
- jakubkrehel `better-*` as a second opinion if impeccable critique misses defects.

**Optional hygiene:** prune the stale entries in `~/.agents/.skill-lock.json` (skills removed in the 2026-09-09 cut).

## 2. Resources to vendor (files in the repo, with licences)

All paths are under `design/blueprint/assets/`. They are served by the existing local server
(`serve-nocache.py`, `127.0.0.1:8879`), not from `file://`, because external `<use>` references break there.

### Icons

| Role | Source (pinned) | Licence | How |
|---|---|---|---|
| **Domain glyphs**: weapons, dice, conditions, damage types, classes, map tools | game-icons.net: upstream `game-icons/icons` @ `82d948812b`; retrieval through the Iconify API (`curl "https://api.iconify.design/search?query=<q>&prefix=game-icons"`, then `…/game-icons/<name>.svg`, already `currentColor` with no black background); `@iconify-json/game-icons` 1.2.4 as the index | **CC BY 3.0**, credit per author (Lorc, Delapouite…) | `icons/game/<id>.svg` + one `<symbol>` sprite; take the author from the upstream folder path, not from Iconify metadata |
| **UI chrome** | Lucide 1.49.0 (`lucide-static`) | ISC (the Feather subset is MIT) | `icons/ui/<id>.svg`. Lucide replaces the ~45 hand-drawn, provenance-less paths in `ui.mjs` `paths` **behind the same `icon(name)` API** (no markup change). Alternatives, one chrome set only: Phosphor 2.1.1 (MIT, fill/duotone weights pair better with filled game glyphs) or Tabler 3.48.0 (MIT, the largest stroke set). The owner sees the icon voice in step 3 |
| **Starting set** | d20 Folio v2 `src/assets/icons/play-sprite.svg` (61 symbols; commit `22c6e9eb`: game-icons + Lucide + 5 own marks) and `fantasy-icons.tsx` / `folio-icons.tsx` / `folio-shell-icons.tsx` (26 + 32 + 4) | CC BY 3.0 + ISC (SAFE+ATTR) | Reuse the ids and attribution rows; re-fetch from Iconify to confirm each path and author |
| **Gaps only** | Hand-authored SVG on the chosen grid: BG3 action-economy marks (circle, triangle, star…), d20 glyph from d20 Folio's `D20Mark` geometry in code | Owner-authored | Rules from icon-set-generator: identical viewBox, `currentColor`, optical corrections. **No AI-generated SVG** (paid; the d20 "AI-slop" precedent) |

**Records:**
- `icons/ATTRIBUTION.md`, modelled on Foundry dnd5e `icons/LICENSE`: file → "Title" by Author, source URL, CC BY 3.0,
  changes made (currentColor, background removed, cropped).
- `icons/icons.manifest.json`: id, set, upstream path, author, licence, modified, sha256.
- Lucide `LICENSE` text copied.
- In the app, extend the **existing** Library page «Fonti e attribuzione» (`compendium.mjs`, `legal` tab) with an
  «Icone, caratteri e immagini» section. This is content, not a new function.

### Fonts: OFL only, files in the repo

Verified in `google/fonts` @ `9710da1` (2026-09-30):

| Family | Licence | Reference it copies |
|---|---|---|
| Roboto, Roboto Condensed | OFL | D&D Beyond's UI and small-caps labels, as cited in the provisional DESIGN.md |
| Signika | OFL | Foundry VTT's core UI (confirm the source row in step 2) |
| Alegreya, Alegreya SC, Alegreya Sans | OFL | Humanist book serif; d20 Folio used Alegreya |
| EB Garamond | OFL | — |
| Cormorant Garamond | OFL | — |
| Crimson Pro | OFL | — |
| Source Serif 4 | OFL | — |
| Cinzel | OFL | Inscriptional caps |
| Inter | OFL | — |
| Roboto Slab | **Apache-2.0** | Bundleable; keep its LICENSE |

- **Never bundle** BG3's Quadraat (commercial; the extracted copies are private study) or any Larian or WotC
  proprietary face.
- **Method:** step 4 chooses at most three roles: a display serif, a UI sans and condensed labels.
  - Vendor the **unmodified** woff2 files (variable where available) from `@fontsource-variable/<family>` pinned, or
    from `google/fonts` @ SHA.
  - Put them in `fonts/<family>/` next to the family's `OFL.txt`.
  - Use `@font-face` with `font-display: swap` and keep the current system stacks as fallbacks.
  - Use Latin and Latin-ext only (Italian accents).
  - Subset only if `OFL.txt` declares no Reserved Font Name.
  - Budget: about 300 KB of woff2 in total.

### Ornaments and frames: the legal route to BG3-like gilt framing

- `~/Workspace/bg3-ui-study/pd-ornaments/`: 66 CC0/PD SVGs, each with its own manifest row and licence evidence.
- d20 Folio `public/assets/ornaments/corner-{tl,tr,bl,br}.svg`: CC0-derived from Openclipart #282416 (GDJ).
- Commit only the pieces actually used, each with its source row in `ornaments/SOURCES.md`.

## 3. Raster image pipeline

1. **Tool.** Codex built-in `image_gen` (`$imagegen`, gpt-image-2) inside the Codex app.
   - It runs on the owner's ChatGPT plan: `auth_mode: chatgpt`, no key, 830 earlier images prove the route.
   - Cost: plan quota only, consumed about 3–5× faster than normal turns.
   - Fallback: the owner renders the same prompt file in ChatGPT chat and drops the PNGs into the masters folder.
   - If the tool fails (openai/codex#43250 404, #49214 false quota), **stop and tell the owner**. Never switch to the
     paid API or CLI. `OPENAI_API_KEY` stays unset, which also disables impeccable's paid fallback.
2. **What becomes raster.** Only what the copied products paint:
   - turn and sheet portraits (BG3, D&D Beyond avatars);
   - the battle map for the demo scene `old-watch` (maps uploaded to Owlbear or Foundry). No retired ford map;
   - Home and campaign header plates (D&D Beyond / Kanka headers);
   - item art;
   - painted hotbar action icons, only if the chosen direction copies BG3's painted icons.

   Never raster for:
   - small UI icons;
   - d20 geometry;
   - ornaments;
   - text.

   Image models failed at these before: PROMPT_24/25 were rejected, and the d20 came out as "AI-slop".
3. **Quota budget.**
   - Step 3 (directions): at most about 24 new images in total. Reuse d20 Folio plates and SRD portraits first.
   - Step 6 (families): batches of 12 or fewer, each checked on a contact sheet before the next.
   - Report quota use in each progress note.
4. **Prompts.** Use one prompt file per family in `design/blueprint/assets/prompts/<family>.md`, with accept/reject
   criteria like the d20 Folio batches.
   - Use the imagegen labelled fields: Use case / Asset type / Subject / Style / Composition / Lighting / Palette /
     Constraints / Avoid.
   - Always include "no text, no logos, no watermark".
   - Describe qualities rather than naming a game, studio or living artist.
   - Subjects: SRD creatures and fictitious demo characters only. No WotC Product Identity, no real players.
   - Reference images: only our own SAFE art, never BG3 or D&D Beyond pixels.
5. **Provenance.** Keep one row per shipped file in `design/blueprint/assets/PROVENANCE.json` with these fields:
   - id, repo path, sha256
   - master path
   - generator ("Codex built-in image_gen, gpt-image-2"), date, Codex session id
   - prompt reference, reference images
   - edits (crop, grade, resize)
   - licence note, owner-approval state

   Embed the prompt in the master with impeccable's embed-prompt step (`scripts/embed-prompt.mjs` in 4.1.1; use the
   4.4.0 engine equivalent). Keep C2PA in the masters. WebP derivatives lose it, so the JSON row is the record.
   Never strip or remove provider marks.
6. **Where files live.**
   - Raw output: `~/.codex/generated_images/<session>/`. This is account data: never commit it, and do not browse
     non-d20 sessions (they contain personal photographs).
   - Masters: `~/Workspace/Codex/d20-studio-visual-assets/masters/<family>/`, outside the repo and not synced.
   - Graded WebP: made with `magick`/`cwebp` (already installed) into `design/blueprint/assets/{portraits,maps,scenes,items,textures}/`.
   - Never overwrite a file; add `-v2` siblings.
   - Budgets are set before generating. Precedent: portraits 672×840 at 90 KB or less; plates under 320 KB.
7. **Public-repo licensing.**
   - OpenAI assigns the output to the owner (EU terms).
   - Output generated purely from a prompt is very likely **not copyrightable**: Italy Law 132/2025 art. 25; the US
     Copyright Office Part 2 report; *Thaler*. Anyone could reuse committed plates. That is acceptable for the
     blueprint; human compositing or editing adds authorship later (Phases D/E).
   - Game-icons need CC BY credit. Fonts ship with `OFL.txt`.
   - "Copy the product" means its UI grammar: layout, proportions, element types, behaviours, and sampled colour
     values as facts. It never means its pixels, textures, fonts, logos or frame artwork.

## 4. Reusable assets and reference-only material

All reuse copies files out. d20 Folio stays unchanged (D-009).
- Copy the masters out of `~/Documents` (which may be cloud-synced) into
  `~/Workspace/Codex/d20-studio-visual-assets/masters/d20-folio/` before any regrade.
- d20 Folio's earlier direction is retired, so these are placeholders and evidence, not the default look.

| Asset | Where | Verdict | Use in Phase C |
|---|---|---|---|
| 12 scene plates (6 day/night pairs) + 4 materials | d20 Folio `public/assets/backgrounds/`, `textures/`; masters `~/Documents/images_d20folio/PROMPT_*` (27 PNG, C2PA gpt-image) | SAFE | Placeholders for Home/campaign plates in step 3; regrade if the chosen direction keeps a painted world |
| 330 SRD monster portraits (672×840 WebP) | d20 Folio `assets/monsters/` (includes `goblin-warrior`, `goblin-boss`, `goblin-minion`, `bandit`, `guard`); raw masters in `~/.codex/generated_images/019fc2f7…`, `019fc324…` | SAFE | Demo `goblin-1`/`goblin-2` turn portraits and tokens right away; Library creature art |
| 5 item plates | d20 Folio `assets/items/` | SAFE | Style recipe for item art |
| Codex 09-01 session `01a049ab…` (74 PNG) | `~/.codex/generated_images/` | SAFE after a subject check (**exclude the beholder-like eye**) | 14 fictitious PC portraits as placeholders for the demo PCs (Livia, Doran); frame/alpha studies |
| Glyph sets and ornaments | See §2 | SAFE+ATTR / SAFE | Icon starting set; gilt framing |
| `D20Mark` in code | d20 Folio `src/components/ui/brand-mark.tsx` | SAFE geometry | Base for any d20 glyph; the brand itself waits for Phase D |
| Prompt documents | `~/Documents/d20-folio-asset-prompts-batch-1.md`, `…-batch-3-daylight.md`, `d20-folio-bg3-asset-prompts.md` | Owner-authored text | Prompt and acceptance patterns (copy them out) |
| Provenance models | Codex labs `PROVENANCE.json`, `ICON-LICENSES.md`, `CREDITS.md` | — | Templates for §2 and §3 records |
| Crest, favicon/PWA icons, OG cards | d20 Folio `public/` | COND (old brand baked in) | Wait for Phase D |

**Reference only.** Study locally, and never commit, trace, bundle or screenshot into the repo:
- `~/Workspace/bg3-ui-study/corpus/`: 45 BG3 screenshots with a manifest (hotbar, tooltips, sheet, dice, level-up,
  menus).
- `2026-09-29/visual/system/references/`: 15 crops (BG3 hotbar, slot and resource icons, panels; D&D Beyond).
- `bg3-ui-study/game-assets/`: extracted textures, XAML and fonts including Quadraat. **Private** study of proportions
  and states.
- `rejected-ledger.md`: the owner's five rejected looks, to avoid. They are a flat light stat strip, a washed ivory
  header plate, a chevron divider ornament, a muddy compendium and rounded ability cards.
- The Tactical Codex atlas boards (retired; they contain personal names).
- d20 Folio README screenshots and the combat-chronicle shots (the old look).
- The provisional blueprint `DESIGN.md`. Its token and source table is input, not approved.

**Never use:**
- the 173 private-pack portraits (WotC Product Identity);
- `~/Downloads/Character Images/` (the real group);
- the third-party packs in `d20-folio-asset-research/`, whose licences are unverified, and its `itch-cookies.txt`;
- the non-d20 Codex sessions;
- this folder's `thumbs/`.

## 5. Phase C method

**Surfaces for the directions:** Home, character sheet (Scheda) and Table (Tavolo).

**Constant rules at every step:**
- Every visual choice has a row "element → product copied → source".
- Functions never change.
- Required: WCAG AA contrast, visible focus, and no meaning carried by colour alone.
- Italian for the owner. The owner's phone sees screenshots through private pages, because `127.0.0.1` is not reachable
  from the phone.

**Step 1: Setup (agents).**
- **The agent does:**
  - completes §0;
  - runs the installs in §1;
  - creates the worktree;
  - copies the masters out of `~/Documents`;
  - captures a **"before" matrix** of the current look: Home, Sheet, Table, Campaign and Library × dark/light ×
    1440/390 × IT.
- **The owner sees:** a one-line «pronto».
- **Gate:** the functional version is frozen and tagged.

**Step 2: Reference moodboard per surface.**
- **The agent does:** 3–6 captures plus element rows for each surface:
  - Table (BG3/Solasta: turn portraits, hotbar, resources, end turn, dice);
  - Map and tools (Owlbear Rodeo 2, Foundry v13);
  - Sheet and Library (D&D Beyond);
  - Campaign and world (Kanka, World Anvil);
  - Dialogs and menus (BG3 frame + Owlbear/MUI shape);
  - Home.

  It then writes an impeccable `shape` brief. Captures stay outside the repo.
- **The owner sees:** one private page (a private Artifact, never shared and never in the repo) with one board per
  surface and two lines of Italian each.
- **Gate:** none. Comments are optional.

**Step 3: 2–3 directions on the real app.**
- **The agent does:** builds each direction as a token set plus skins for Home, Sheet and Table, at 390 and 1440,
  dark first.
  - The directions are switchable through a dev-only «Direzione» selector in the demo bar outside the app, next to
    «Visita come».
  - Each direction is copied end to end. It is visibly different from today's look and avoids the rejected-ledger
    items.
  - Starting hypotheses: **A** BG3 material (bronze frames, painted portraits and icons); **B** D&D Beyond sheet
    clarity (flat boxed stats, bold numbers, Roboto); **C** Foundry/Owlbear tool (neutral slate, floating rounded
    tools, glyph icons).
  - It runs impeccable `critique` on each and fixes the findings before showing.
  - It generates at most about 24 new rasters.
- **The owner sees:** a private comparison page with the same three screens per direction, on phone and desktop, and
  three lines each on what it copies. The page also shows:
  - the icon voice: filled game glyphs vs stroke chrome;
  - two type pairings in context.

  A local link lets the owner try each direction live.
- **Gate:** none yet.

**Step 4: Owner picks.**
- **The agent does:** records the choice verbatim as I-2xx. The choice can be one direction or an explicit mix per
  surface (e.g. «Tavolo di A, scheda di B»), plus the icon voice and the type pairing. Losing directions stay in
  evidence and history, not in the worktree.
- **The owner sees:** three concrete questions, answered in chat.
- **Gate:** an explicit choice. Silence or visiting does not count.

**Step 5: Design system.**
- **The agent does:**
  - runs impeccable `document` to write a new `DESIGN.md` in the Google DESIGN.md format (YAML tokens + rationale,
    kept with the element → product → source table), linted with `@google/design.md`;
  - sets the tokens in `styles.css` `:root` and `preferences.css`: dark, light, high contrast, reduced motion;
  - vendors fonts, icons and ornaments with ATTRIBUTION and the «Fonti e attribuzione» section;
  - builds a dev-only specimen page: colours, type, icons, buttons, fields, panels, hotbar slot, dialog, toast.
- **The owner sees:** a screenshot of the specimen page, for a glance.
- **Gate:** none unless something jars.

**Step 6: Apply to all areas.**
- **The agent does:** works area by area (about 60 CSS files):
  - replaces literals with tokens and swaps `ui.mjs` icons for the licensed set;
  - adds raster families in quota batches;
  - closes every `visual-phase-backlog` item (4 review findings + 13 minimal-style elements);
  - runs impeccable `polish` and `adapt` per area.

  After each area, the **2662 Node tests and 189 browser journeys stay green**. An appearance-only assertion is updated
  with a dated comment.
- **The owner sees:** short Italian progress notes with before/after pairs per group of areas, plus quota use.
- **Gate:** none. The owner is asked only if a reference conflict would change the chosen look.

**Step 7: Visual QA and regression.**
- **The agent does:**
  - runs impeccable `critique` and `audit` per surface;
  - runs `review-animations` on dice, turn banner, weather, toasts and reduced motion;
  - runs axe with the `wcag2a/2aa/21aa/22aa` tags and **`color-contrast` on**, plus the WCAG 2.2 checklist;
  - covers the matrix: surfaces × {dark, light, high contrast} × {390, 1440} × {IT, EN}, plus WebKit;
  - does manual keyboard and touch passes (screenshots do not prove interaction);
  - then commits `toHaveScreenshot` goldens (one pinned environment: this Mac with the Playwright 1.63.0 browsers) and
    `toMatchAriaSnapshot` for the key surfaces;
  - hands the exact SHA to a separate review session.
- **The owner sees:** an Italian report covering what passed and what was fixed, plus the final gallery.
- **Gate:** the review is approved on that SHA.

**Step 8: Owner approval.**
- **The agent does:** the owner uses the blueprint and the gallery, and corrections loop back to steps 6–7. After
  explicit approval, the agent freezes the look: manifest fingerprints, goldens and a tag. Then Phase D (name and
  brand) follows.
- **The owner sees:** the finished app, and one question: «Approvi l'aspetto?».
- **Gate:** explicit approval.

**Reserved to the owner:**
- the direction or mix;
- the icon voice;
- the type pairing;
- final approval;
- any spending (none planned);
- the push of the branch to the public GitHub repository (still open).

Everything else is delegated to the agents and recorded in `docs/interview/DECISIONS.md`.

## 6. Session prompt (filled, for the visual session)

```text
Progetto d20 Studio, Fase C «Design visivo» (ROADMAP D-014, I-243, I-245). Esegui in Codex (image_gen nativo),
modello e sforzo invariati rispetto a interview-01. Worktree nuovo ~/Workspace/Codex/d20-studio-visual-01, branch
codex/visual-01 dal tag della versione funzionale congelata. Leggi: AGENTS.md, docs/NEXT.md, docs/ROADMAP.md,
docs/interview/FEATURE_MAP.md, design/blueprint/DESIGN.md (provvisorio, sostituibile),
changes/interview-01/visual-phase-backlog.md, design/blueprint/DEVELOPMENT.md e
~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/phase-c-prep/phase-c-plan.md (questo piano: installazioni §1,
risorse §2, immagini §3, riuso §4, metodo §5). Segui i passi 1–8; chiedi all'owner solo al passo 4 (direzione, voce
delle icone, caratteri) e al passo 8 (approvazione). Non cambiare funzioni, percorsi, permessi o dati; test Node e
percorsi del browser verdi. Nessuna spesa, nessuna chiave API, niente pixel/font/texture di BG3 o D&D Beyond nel
repository. Spiega all'owner in italiano semplice, con immagini dell'app.
```
