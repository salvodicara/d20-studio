# Phase C prep: skills and tools for icons and images

Access date: 2026-10-01 (the task's evidence date; commands ran on the Mac on 2026-09-30, around 17:45–18:45 GMT).
Scope: SVG icons (curation and generation), SVG optimisation, raster art (portraits, maps, backgrounds, textures), cost model,
use of the owner's ChatGPT/Codex subscription, and rights in a public repository.
Method: `find-skills` (skills.sh leaderboard, `npx skills find`, then the skills.sh search API
at 30 requests/min). Each candidate was then resolved to repo@commit, installs, stars, freshness, skills.sh audits,
license and the SKILL.md text read from GitHub. Nothing was installed. Codex was not run.
Raw evidence (this task's files inside the shared `raw/` folder): `api-icons.txt`, `api-images.txt`, `api-extra.txt`
(skills.sh search dumps), `openai-imagegen-SKILL.md`, `taste-imagegen-web.md`,
`gamedev-skills_awesome-gamedev-agent-skills-create-game-assets.md`, `0x0funky_agent-sprite-forge-generate2dmap.md`,
`JimLiu_baoyu-skills-baoyu-image-gen.md`, `anthropics_skills-canvas-design.md` (copied SKILL.md files).

Evidence labels: **[observed]** checked on this Mac or through an API/repo during this session ·
**[published]** vendor documentation · **[third-party]** secondary source · **[inference]** reasoning from the above.

---

## In breve (for the owner, in Italian)

- **Immagini raster: non serve installare niente e non serve spendere.** Codex (dentro l'app ChatGPT che hai già)
  ha un generatore di immagini integrato (`$imagegen`, modello gpt-image-2). Usa i limiti del tuo abbonamento
  ChatGPT, non una chiave API a pagamento. Sul tuo Mac sono già state generate così circa 830 immagini
  (agosto–settembre 2026), probabilmente anche i ritratti dei mostri di d20 Folio. Il costo è che ogni immagine
  consuma i limiti 3–5 volte più in fretta di un messaggio normale.
- **Impeccable, la skill di design che hai già, sa usare quel generatore.** Il suo "asset producer" è scritto per Codex.
  La sessione grafica dovrebbe quindi girare in **Codex**. Claude Code da solo non ha un generatore di immagini:
  gli servirebbe una chiave API OpenAI a pagamento.
- **Icone: si parte da librerie gratuite già pronte, senza farle generare all'AI.** game-icons.net ha 4.133 icone
  fantasy (spade, dadi, mostri, condizioni) e le usa anche il sistema D&D 5e di Foundry VTT. A queste si aggiunge una
  libreria per i comandi dell'interfaccia (Lucide, che d20 Folio usa già, oppure Phosphor o Tabler). Le icone si
  copiano nel repository con un file dei crediti, quindi funzionano anche offline.
- **Solo le icone che mancano davvero si disegnano su misura**, a mano in SVG con regole fisse. Servizi come
  Recraft producono SVG ma sono a pagamento: nel piano gratuito le immagini sono di Recraft e non si possono usare
  in un prodotto.
- **Skill in più: nessuna da installare adesso.** Ce ne sono tre "di riserva", da valutare solo se servono:
  un generatore di set di icone su misura, un flusso "asset di gioco" con registro della provenienza e un
  cercatore di icone. Le skill più installate per le immagini risultano gonfiate o portano a servizi a
  pagamento: scartate.
- **Diritti:** OpenAI ti assegna i diritti sulle immagini generate. Un'immagine prodotta solo con un prompt però
  quasi certamente non è protetta da copyright, né in Italia (Legge 132/2025) né negli USA. In un repository
  pubblico chiunque potrebbe riusarla. Per un prototipo va bene. Per il prodotto finale conviene aggiungere un
  intervento umano, per esempio ritocchi e composizione, e registrare la provenienza di ogni file.

---

## 1. What the owner already has (the incumbent)

| Item | Evidence | Relevance |
|---|---|---|
| ChatGPT desktop app 26.917.71314 with a bundled Codex CLI binary `/Applications/ChatGPT.app/Contents/Resources/codex` (Mach-O arm64, 235 MB, file dated 2026-09-24) | [observed] `file`, `ls` | Codex is **installed**. It is not on PATH, which is why `which codex` fails. The binary was not executed. |
| `~/.codex/auth.json` → `auth_mode: chatgpt`, `OPENAI_API_KEY` empty; no `OPENAI_API_KEY` in the shell env | [observed] only the key names and auth mode were printed | Codex runs on the ChatGPT subscription and has no API billing path configured. |
| Codex system skill `~/.codex/skills/.system/imagegen` (Apache-2.0, marker `8bcfb84cfbe4722a`) | [observed] full SKILL.md read | Built-in `image_gen` tool, **"Does not require `OPENAI_API_KEY`"**. It is a newer revision than `openai/skills@49f948faa9` on GitHub (diff: transparent-background and batch rules added). |
| `~/.codex/generated_images/`: 830 files (805 in Aug 2026, 25 in Sep 2026); 821 named `exec-*.png`; sample 1122×1402 PNG | [observed] | This account has already produced raster art through the built-in path without API spend. 1122×1402 is the same 4:5 ratio as d20 Folio's 672×840 monster portraits. [inference] That is probably where the monster portraits came from. |
| Codex config enables `frontend-design`, `superpowers`, `claude-mem` plugins; Codex reads `~/.agents/skills` natively (impeccable, archify, …) | [observed] `~/.codex/config.toml` plugin table | A Codex session has the full design catalogue **plus** native image generation. |
| **impeccable 4.1.1** (`~/.agents/skills/impeccable`) | [observed] | It already contains an image pipeline. `agents/impeccable_asset_producer.toml` routes generation to "the imagegen skill's built-in `image_gen` path" in Codex and embeds the prompt in each asset (`scripts/embed-prompt.mjs`). It falls back to `scripts/generate-image.mjs` (gpt-image-2 on the user's own API key, "roughly $0.05-0.25 per image") only when an `OPENAI_API_KEY` exists. Its detector flags "shape-assembled illustration" (AI-drawn SVG scenes) as an anti-pattern and routes icons and logos to "inline SVG/vector or icon-library". |
| Claude Code plugins: `frontend-design` (on), `superpowers` 6.3.0 (on), `claude-mem` 13.15.3 (on), **`ecc` 2.2.0 installed but disabled** | [observed] `~/.claude/settings.json` | ecc ships `fal-ai-media` (paid fal.ai) and `ios-icon-gen`. It is disabled and should stay disabled for this phase. |
| Local tools: ImageMagick (`magick`), `cwebp`, `potrace` via Homebrew; Node 24.16.0; Apple M1 Pro, 32 GB | [observed] | Enough for WebP compression, resizing and raster-to-vector tracing without new installs. `svgo`, `vips` and `vtracer` are not installed. |

**Consequence:** a Codex session already covers the image job end to end: art direction (impeccable, frontend-design),
generation (built-in `image_gen`) and asset clean-up and provenance (impeccable asset producer). No marketplace skill
improves on this for the owner's constraints of no new spending, a small catalogue and a public repo.

---

## 2. Raster images: routes, cost and how an agent drives them

### 2.1 Route comparison

| Route | Cost to owner | Access on this Mac | Quality / fit | Verdict |
|---|---|---|---|---|
| **Codex built-in `image_gen` (`$imagegen`, gpt-image-2)** in the ChatGPT desktop app | Included in the ChatGPT plan. "Built-in image generation uses `gpt-image-2` and counts toward your general Codex usage limits". Images "use included limits 3–5x faster on average" [published, learn.chatgpt.com/docs/image-generation and /docs/pricing]. Available on Plus, Pro and Business, not Free [published]. | Ready [observed: auth_mode chatgpt, 830 prior images] | Reference images, edits, transparent background (built-in path), 4K sizes | **Primary route** |
| ChatGPT chat (web or desktop) image generation | Same plan pool [published] | Ready | Same model; manual download | Owner's manual fallback |
| Bundled Codex CLI by absolute path (`/Applications/ChatGPT.app/Contents/Resources/codex`) | Same plan pool | Present, not on PATH, **not executed** | The docs say the CLI accepts `$imagegen` and `-i/--image` references [published] | Possible agent-driven route. Confirm with the owner before the first run, because it spends plan quota. |
| `npx @openai/codex` (v0.159.2, Apache-2.0, Node ≥16) | Same plan pool once signed in | Would download the `@openai/codex@0.159.2-darwin-arm64` payload (**~332 MB unpacked**) into the npm cache [observed: `npm view`]; reuses `~/.codex/auth.json` or asks for `codex login` | Newer than the app build; there is a risk of version skew with the app's `~/.codex` state [inference] | **Not needed**: the bundled binary already exists. The download would need explicit owner permission. |
| OpenAI API (`OPENAI_API_KEY`, imagegen CLI fallback or impeccable `generate-image.mjs`) | Pay per token: gpt-image-2 $5/M text in, $8/M image in, $30/M image out; Batch −50% [published, developers.openai.com/api/docs/pricing]. About $0.006 low, $0.053 medium, $0.211 high per 1024² [third-party calculators] | No key configured | Same model, scriptable batches | **New spending, needs owner authorisation.** Only for very large batches. |
| Gemini / "Nano Banana Pro" API skills | `GEMINI_API_KEY` billing | Not configured | Strong editing model | Reject: new spending, and a second vendor adds nothing here |
| Aggregators (RunComfy, inference.sh, fal.ai, Pilio, Replicate) | Paid credits | none | Many models | Reject: new spending plus third-party data flow |
| Recraft (native SVG/vector generation) | Free plan: images "remain the property of Recraft", are public and "not licensed for commercial use"; paid from about $12/mo [published, recraft.ai docs; third-party pricing] | none | Real SVG output | Reject for now: the free tier is unusable for a product, and paid means new spending |
| Local Stable Diffusion / FLUX via ComfyUI (GPL-3.0, ★135.6K) | $0 cash; heavy setup; slow on an M1 Pro | not installed | Model licences vary (e.g. FLUX.1 [schnell] Apache-2.0; FLUX.1 [dev] non-commercial) | Reject: setup cost and licence risk, while a paid-for route already works |

### 2.2 How to drive the primary route

1. **Recommended:** run the visual-phase session **in Codex** (ChatGPT app → Codex, new task on a worktree under
   `~/Workspace/Codex`). Invoke `$imagegen` explicitly or let impeccable's asset producer call it.
   The imagegen skill's own rules: outputs land in `$CODEX_HOME/generated_images/…`. They must be **copied into the
   worktree** before they are referenced ("Never leave a project-referenced asset only at the default … path"),
   and existing files are never overwritten (`hero-v2.png` style siblings).
2. If a Claude session leads art direction, Claude writes the prompt set and asset manifest. Codex (or the owner in
   ChatGPT) renders them. Claude Code has no native image tool, and impeccable's fallback would bill an API key.
3. Prompt scaffold: use the imagegen skill's labelled spec (`Use case / Asset type / Subject / Style / Composition /
   Lighting / Palette / Constraints / Avoid`) with the `stylized-concept` or `illustration-story` slugs. Always
   include "no text, no logos, no watermark". d20 Folio's DESIGN.md already records a working art brief (BG3 menu /
   D&D Beyond splash grammar, calm centre, receding edges, day/night sibling plates). Use it as evidence, not as a
   default direction, because D-012 retired earlier design directions.
4. Post-processing with tools already present: `cwebp`/`magick` for WebP q75–80 and size budgets; alpha check;
   imagegen's `scripts/remove_chroma_key.py` for chroma-key cut-outs.
5. Known hazards [observed, GitHub]: openai/codex#43250 (open, 2026-09-06, built-in imagegen returns HTTP 404) and
   openai/codex#49214 (open, 2026-09-29, `usage_limit_reached` with quota left, on Windows). If the built-in tool
   fails, the skill says to *tell the user* and not to switch to the paid CLI on its own.

---

## 3. Icons: resources (the market standard is curated libraries, not skills)

| Resource | Size (Iconify, 2026-09-30) | Licence | Style | Freshness / reputation | Role for a D&D product |
|---|---|---|---|---|---|
| **game-icons.net** (`game-icons/icons`, Iconify prefix `game-icons`, npm `@iconify-json/game-icons` 1.2.4) | 4,133 | **CC BY 3.0** (a few CC0), **attribution to each author** (Lorc, Delapouite, …) | Filled silhouettes on a 512 grid | Last commit 82d948812b, 2026-04-23; ★1.35K | **Domain iconography**: weapons, dice, monsters, conditions, damage types, classes, spells |
| **Lucide** (`lucide` 1.49.0) | 1,856 (+373 lucide-lab) | ISC; the Feather-derived subset is MIT | 24 grid, 2 px stroke | Pushed 2026-09-29; ★24.8K | UI chrome. d20 Folio already uses `lucide-react` ^1.16.0. |
| **Phosphor** (`ph`, `@phosphor-icons/core` 2.1.1) | 9,072 (1,512 × 6 weights incl. *fill* and *duotone*) | MIT | Six weights | Core package last published 2024-03 (★382); homepage repo pushed 2026-08 (★7.6K) | UI chrome if filled or duotone weights must sit beside filled game-icons |
| **Tabler** (`@tabler/icons` 3.48.0) | 6,220 | MIT | 24 grid stroke (+ filled subset) | Pushed 2026-09-28; ★21.8K | Largest MIT stroke set; alternative to Lucide |
| Material Symbols | 15,717 | Apache-2.0 | Variable weight/fill | ★54K | Generic; less character |
| Font Awesome Free | fa7-solid 2,000 | Icons CC BY 4.0 | Solid | ★76.9K | No advantage over the above |
| **RPG Awesome** (`nagoshiashumari/Rpg-Awesome`) | 495 | Font OFL 1.1, CSS MIT, docs CC BY 3.0, but the icons *derive from game-icons* | Icon font | **Last commit 2018-06-14**; not in Iconify | **Reject**: stale, font-based and a subset of game-icons. Use game-icons directly. |
| **Iconify** (API `api.iconify.design`, `@iconify/json` 2.2.536 MIT, `@iconify/utils` 3.1.7, `@iconify/tools` 5.0.14, `unplugin-icons` 24.0.0 MIT) | 200K+ across 150+ sets | Tooling MIT; each set keeps its own licence | n/a | Pushed 2026-09-29/30; ★6.3K (iconify), ★4.9K (unplugin-icons) | **Search and retrieval layer.** Its copy of game-icons is already cleaned (`fill="currentColor"`, no black background) [observed]. |

**Industry precedent [observed]:** Foundry VTT's official `foundryvtt/dnd5e` system (MIT, ★596) vendors game-icons
SVGs in `icons/svg/` with an `icons/LICENSE` that credits each file, e.g.
`/svg/monster.svg - "Spiked dragon head" by Delapouite under CC BY 3.0`. That file is the model to copy.

### 3.1 Offline recipe for a static prototype (no build step, no runtime CDN)

1. Search: `curl "https://api.iconify.design/search?query=dice&prefix=game-icons&limit=20"` [observed working].
   No skill or install is needed.
2. Fetch the cleaned body once: `curl https://api.iconify.design/game-icons/dice-target.svg` (or the JSON
   `…/game-icons.json?icons=a,b`). Take the **author** from the upstream repo folder (`game-icons/icons/<author>/<name>.svg`),
   because Iconify's collection metadata only says "GameIcons". A raw upstream SVG carries a black
   `<path d="M0 0h512v512H0z"/>` background and `fill="#fff"`. Strip these, or use the Iconify copy.
3. Commit the SVGs under e.g. `prototype/assets/icons/{game,ui}/` together with:
   - `ATTRIBUTION.md` in dnd5e style: file → "Title" by Author, source URL, licence, **changes made**
     (recoloured to currentColor, background removed, cropped);
   - a machine-readable `icons.manifest.json` (id, source set, upstream path, author, licence, modified);
   - an in-app Credits entry, required for CC BY in a published product.
4. Delivery: inline `<svg>` or a single `<symbol>` sprite with `<use href="sprite.svg#id">`. [inference] Serve the
   prototype over a local HTTP server: Chromium restricts external `<use>` references from `file://` pages.
5. Optimise with **svgo** (`svgo` 4.1.0, MIT, ★22.7K, pushed 2026-08-27) as a dev dependency or through `npx svgo`.
   No SVGO skill exists on skills.sh (queries "svgo", "svg optimize": no relevant hits) [observed].
6. Visual rule for the design session to decide, not prescribed here: game-icons are *filled* 512-grid silhouettes,
   while Lucide and Tabler are *2 px strokes*. Mixing them needs a declared split: domain glyphs vs chrome, sizes and
   containers. Phosphor's fill and duotone weights pair more naturally [inference].

### 3.2 Custom SVG icons (only for gaps)

- **Agent-authored SVG in code** against a fixed style spec (grid, stroke, caps, padding, currentColor, optical
  corrections). d20 Folio already did this for its brand mark and favicons ("Brand mark = in-code SVG, not an AI
  raster"). jezweb's `icon-set-generator` rules (section 4) are a good public checklist and can be read without
  installing the skill.
- **Raster → vector** for emblem-like marks: generate with `$imagegen`, then trace with `potrace` (already installed,
  GPL-2.0, run as a tool so the licence does not reach outputs) or `vtracer` (MIT, ★7.2K, not installed). This is
  worse than hand-authored SVG for small UI icons [inference].
- **Recraft** vector generation: see section 2.1. It needs a paid plan to own the output.

---

## 4. Skill candidates (verified)

Installed-catalogue overlap is judged against: archify, find-skills, graphify, grill-me, impeccable,
playwright-cli, ponytail, ponytail-review, task-observer, and the plugins superpowers, claude-mem and frontend-design.
Installs, first-seen dates and audit verdicts come from skills.sh on the access date.

| Candidate (exact artifact) | Installs | Repo ★ / licence / last change | skills.sh audits (GenAgent / Socket / Snyk) | What it actually is | Verdict |
|---|---|---|---|---|---|
| `openai/skills@imagegen` (`skills/.system/imagegen`, @49f948faa9; path last changed e6afb0d74c 2026-04-15) | 5.1K | ★27.8K / Apache-2.0 per the skill's LICENSE.txt, no repo licence / Apr 2026 | Pass / Pass / Pass | Codex's image skill. Its built-in path only works **inside Codex**; elsewhere only the paid API CLI is available. | **use-without-install**: already present as a *newer* Codex system skill. Installing it into Claude would add a paid-only path. |
| `jezweb/claude-skills@icon-set-generator` (`plugins/design-assets/skills/icon-set-generator`, @ee91a87a5c; last change 795984271c 2026-05-13) | 1.8K | ★1.0K / MIT / fresh | Pass / Pass / Pass | A substantive workflow for bespoke icon sets: presets, hard SVG rules, optical corrections, `style-spec.json`, preview page. Marked `compatibility: claude-code-only`. | **maybe**: only if phase C schedules a bespoke icon family. Its triggers ("icons for", "SVG icons", "make me icons") are broad and would fire on routine icon talk alongside impeccable. |
| `gamedev-skills/awesome-gamedev-agent-skills@create-game-assets` (`skills/disciplines/create-game-assets`, @d4b0e35550; last change 3727d02499 2026-08-08) | 3.0K (first seen 2026-08-08) | ★1.25K / Apache-2.0 / pushed 2026-09-27 | Pass / Pass / **Warn** | Art brief, asset manifest **with licence and provenance fields**, "approve one visual target", Pillow QA scripts (`asset_report.py`, `build_preview_sheet.py`; read: no network calls). Explicitly delegates generation to an `imagegen` skill. | **maybe**: overlaps impeccable's asset producer. Its manifest and provenance templates can be read and copied without installing. Install only if a large raster family, such as a full bestiary, becomes a task. |
| `better-auth/better-icons@better-icons` (`skills/SKILL.md`, @033316ecb8; npm `better-icons` 1.0.4, 2026-01-22; 2,164 dl/month) | 5.3K | ★1.3K / MIT / pushed 2026-04-02 | Pass / Pass / **Warn** | A wrapper over the Iconify API (search/get, MCP server). Asks for `npm install -g better-icons` and MCP setup. | **maybe (low)**: `curl api.iconify.design` does the same with zero install. Consider only if icon search becomes a recurring friction. |
| `0x0funky/agent-sprite-forge@generate2dmap` (@64fd0b57d3) | 220 | ★4.2K / MIT / pushed 2026-07-12 | Pass / Pass / Pass | Codex `image_gen`-first 2D map and battle-background pipeline | reject for now: under 1K installs, and battle maps are not yet in the product contract. Revisit if tactical maps enter scope. |
| `leonxlnx/taste-skill@imagegen-frontend-web` (@ce26fc25c0) | 324K | ★91.2K / MIT / pushed 2026-09-26 | Pass / Pass / Pass | Generates **landing-page mock images**, one per section (987-line prompt) | reject: wrong job (marketing mocks, not game art). It overlaps impeccable and frontend-design and conflicts with the D-012 sequencing. |
| `genmedia-labs/skills@ai-image-generation` (@c163a9fd3a) | 743K | **★24–25** / MIT / created 2026-08-12 | Pass / Pass / Warn | RunComfy paid CLI router with UTM links | reject: installs are anomalous against the stars, it is a paid service, and it is marketing |
| `101-skills/superpowers@ai-image-generation` (@becc256497), plus clones `qu-skills/…`, `magentosh/…`, `bankai-skills/…` | 143K–586K | **★5**, no licence, created 2026-08-31 | not checked | inference.sh paid CLI (`belt`). **The name "superpowers" is unrelated to obra/superpowers.** | reject: anomalous installs, a name collision with the owner's plugin, paid |
| `pilioai/skills@gpt-image-2` (@1a9a4516b4) | 20.3K | ★43 / MIT | not checked | Pilio paid API (`PILIO_API_KEY`) | reject: paid, low reputation |
| `JimLiu/baoyu-skills@baoyu-image-gen` (@1567581c26) | 33K | ★26.2K / MIT / pushed 2026-09-10 | not checked | Multi-provider generator. Has a `codex-cli` provider that "uses logged-in Codex subscription … requires `codex` on PATH". | reject: duplicates the built-in imagegen, mostly paid providers, Chinese-social-media focus |
| `coreyhaines31/marketingskills@image` (@5b2c000776) | 75K | ★52K / MIT | not checked | Marketing image advice; asks for Gemini, Replicate or Ideogram keys | reject: marketing scope, paid APIs |
| `intellectronica/agent-skills@nano-banana-pro` (@9b0e00ad1b) · `ReScienceLab/opc-skills@nanobanana` (@f79569f1ee) | 3.2K · 2.9K | ★294 CC0 · ★1.8K Apache-2.0 | not checked | Gemini image API (`GEMINI_API_KEY`) | reject: new spending |
| `Owl-Listener/designer-skills@icon-system` (@9a6930cf84) | 2.0K | ★2.8K / MIT | not checked | About 30 lines of generic icon-system bullets | reject: no content beyond impeccable |
| `jeremylongshore/tons-of-skills-marketplace@svg-icon-generator` (@0e2cabe39a) | 1.3K | ★2.8K / MIT | not checked | Auto-generated boilerplate with no real instructions | reject |
| `antvis/chart-visualization-skills@icon-retrieval` (@a105fa12a9) | 1.5K | ★506 / MIT | not checked | curl to `weavefox.cn` icon API with undocumented icon licensing | reject: unknown provenance |
| `rknall/claude-skills@SVG Logo Designer` | 7.3K | ★79 / **no licence** / **pushed 2025-10-20** | not checked | Logo design | reject: stale, unlicensed, and branding is a later stage (D-005) |
| `anthropics/skills@canvas-design` / `@algorithmic-art` (@8a1541c4a3) | 112.5K / 83.8K | ★179K | not checked | Posters and generative art as PNG/PDF from code | reject: not game art or icons; overlaps frontend-design |
| `leonxlnx/taste-skill@brandkit` | 331.6K | ★91.2K | not checked | Brand kit | reject for now: branding stage (D-005) |
| Vendor icon skills: `hugeicons/hugeicons` (231), `fortawesome/…@add-icon` (509, ★4), `nweii/…@suggest-lucide-icons` (586, ★10), `bingal/iconify-skill` (67, ★4) | under 1K | — | not checked | Library-specific lookups | reject: adoption below threshold; Iconify covers them |
| ComfyUI skills `MCKRUZ/ComfyUI-Expert` (top 1.9K), `black-forest-labs/skills` (≤867), `fal-ai-community/skills` (≤919), `scenario-labs/skills` | ≤1.9K | ★91–790 | not checked | Local or paid model pipelines | reject: see section 2.1 |
| `gargantuax/gemini-watermark-remover` | 12.8K | — | not checked | Removes provider watermarks | reject: defeats provenance marking, so it is an ethics and rights risk |

**Install recommendation: none.** Leaderboard popularity in this category is dominated by paid-service funnels and
anomalous install counts (hundreds of thousands of installs on repositories with under 30 stars). The capability the
owner wants, state-of-the-art raster generation without new spending, is already installed as the Codex system
`imagegen` skill orchestrated by impeccable. This matches D-010 ("no dedicated icon skill … none is added merely to
fill that label") and the find-skills rule that a skill is added only on evidence.

---

## 5. Rights and licensing for a public repository

- **OpenAI output terms [third-party quote of the published terms, consistent across Rest-of-World, EU and Services
  Agreement]:** "As between you and OpenAI, and to the extent permitted by applicable law, you (a) retain your
  ownership rights in Input and (b) own the Output. We hereby assign to you all our right, title, and interest, if
  any, in and to Output." The owner is in Italy, so the EU Terms apply. The openai.com page returned HTTP 403 to the
  fetcher; the quote comes from the search index.
- **Copyrightability:** Italy's Law 132/2025, art. 25 (in force 2025-10-10) amends art. 1 of Law 633/1941. Protected
  works are "works of human intellect", including those made with AI assistance *if they result from the author's
  intellectual work*. Purely generated output is not protected. In the USA, the Copyright Office's Part 2 report
  (Jan 2025) says "prompts alone" are not sufficient. *Thaler v. Perlmutter* (D.C. Cir., Mar 2025) requires a human
  author, and the Supreme Court declined review on 2026-03-02. **Practical effect:** committed AI plates are
  effectively reusable by anyone. The owner can use them freely, but should not expect exclusivity unless human
  edits or compositing add authorship.
- **Content hygiene:** no WotC logos or trade dress, no D&D Beyond or BG3 art copies (they stay as *references*),
  no living-artist names in prompts, no non-SRD Product Identity creatures. Keep "no text, no logos, no watermark" in
  every prompt. Do not remove provider watermarks or metadata.
- **Provenance per shipped raster:** asset id, path, tool and model (Codex built-in `image_gen`, gpt-image-2), date,
  prompt (embedded via impeccable's `embed-prompt.mjs`), reference images, edits, licence note and approval.
  create-game-assets' `references/provenance.md` field list is a good template.
- **Icons:** CC BY 3.0 requires credit (author, title, source, licence) and identification of adaptations. ISC and
  MIT sets need their licence text kept in the repo (Lucide's LICENSE also covers the MIT Feather subset). Keep
  credits in `ATTRIBUTION.md` plus an in-app Credits entry.
- **Repo weight:** d20 Folio carries 21 MB of monster WebPs. Set per-asset budgets (it used 672×840 WebP ≤ 90 KB
  portraits and < 320 KB scene plates) before generating families [observed, d20 Folio DESIGN.md / ARCHITECTURE.md].
- **Never commit** `~/.codex` content other than the selected, copied finals: session folders are account data.

---

## 6. Existing raster assets in d20 Folio (read-only inventory)

[observed] `~/Workspace/d20-folio` (branch `main`, not modified):
- `assets/monsters/`: 330 WebP public SRD portraits (672×840; private ones live in `content-pack/`).
- `public/assets/backgrounds/`: 12 scene plates, day and night pairs (home-hero, login, campaign, compendium,
  creation, roster).
- `public/assets/textures/`: 4 (leather, light panel, parchment, dark vellum). `public/assets/brand/crest.webp`:
  alpha-mask crest. `assets/items/`: 5 item illustrations.
- Provenance per DESIGN.md: "owner-generated from orchestrator-authored prompts" (batches P1–P14). The prompt file
  lives at `~/Documents/d20-folio-bg3-asset-prompts.md`, which is outside the repo and inside a synced folder.
- Brand mark, favicon and PWA icons are **hand-authored SVG**, not AI raster.

These are the owner's own outputs and may be copied into d20 Studio as mood references or placeholders (copying out
does not modify d20 Folio, D-009). Under D-012 the earlier design direction is retired, so the phase-C session should
treat them as *evidence of what the pipeline can produce*, not as the default look.

---

## 7. Recommended setup for the phase-C (visual) session

1. **Harness:** Codex task (ChatGPT app), which has native `image_gen` plus impeccable, frontend-design and
   superpowers. Claude may review or art-direct from another session (the CLAUDE.md "Claude is optional" rule).
2. **Installs:** none. Optional dev dependency inside the prototype: `svgo`. The only data dependency is
   game-icons (plus one UI set), fetched once and vendored with attribution.
3. **Owner questions that genuinely need him** (product or cost, per D-007):
   (a) Is spending plan quota on image batches acceptable? Rendering many plates may exhaust the 5-hour or weekly
   window. (b) Should any API budget exist for very large batches? Default: no.
   (c) The icon voice: filled "game" glyphs everywhere, or game glyphs for domain concepts and a stroke set for
   chrome? Show both before asking.
4. **Gates to respect:** D-012 still says no mocks until the full product contract is approved. The owner's
   2026-10-01 message asks to start the visual look now. The coordinator should record that change as an explicit
   decision before any image or mock is produced.

---

## Sources

- skills.sh leaderboard and search API (`/api/search`, 30 req/min limit), skill pages for better-icons, imagegen,
  icon-set-generator, create-game-assets, ai-image-generation (genmedia-labs), generate2dmap, imagegen-frontend-web:
  https://skills.sh/
- GitHub repos and commits read through `gh api` (see the table in section 4 for repo@commit).
- Codex image generation: https://learn.chatgpt.com/docs/image-generation (redirect from
  developers.openai.com/codex/image-generation); pricing: https://learn.chatgpt.com/docs/pricing
- OpenAI API pricing: https://developers.openai.com/api/docs/pricing
- Third-party per-image cost estimates: https://costgoat.com/pricing/openai-images ,
  https://wavespeed.ai/blog/posts/gpt-image-2-pricing-2026/
- Codex issues: https://github.com/openai/codex/issues/43250 , https://github.com/openai/codex/issues/49214
- game-icons licence and attribution guidance: https://game-icons.net/about.html ;
  https://github.com/game-icons/icons/blob/master/license.txt
- Foundry dnd5e attribution precedent: https://github.com/foundryvtt/dnd5e/blob/6.0.x/icons/LICENSE
- Iconify API: https://api.iconify.design/collections ; Lucide licence: https://github.com/lucide-icons/lucide/blob/main/LICENSE
- RPG Awesome: https://github.com/nagoshiashumari/Rpg-Awesome
- Recraft rights: https://www.recraft.ai/docs/plans-and-billing/commercial-rights-ownership-and-copyright
- OpenAI terms (quoted through the search index; the page returns 403 to the fetcher): https://openai.com/policies/eu-terms-of-use/
- US Copyright Office Part 2 summary: https://www.sidley.com/en/insights/newsupdates/2025/02/us-copyright-office-issues-report-on-artificial-intelligence-and-copyrightability ;
  Thaler cert denial: https://copyrightlately.com/thaler-is-dead-ai-copyright-questions/
- Italy Law 132/2025 art. 25: https://www.doctrine.it/norms/laws/itatextks0w8oah02nn2t/articles/itaartdowg001injsjlo ;
  https://www.osservatorio-ip.it/2025/10/02/intelligenza-artificiale-e-diritto-dautore-la-legge-132-2025-traccia-i-confini-della-nuova-creativita-umana/

Limits: no image was generated and Codex was not executed, so the claim that the built-in route works rests on
documentation plus 830 historical files. The owner's exact ChatGPT plan tier was not read, because doing so would
mean decoding auth tokens. Security audits marked "not checked" were not fetched for rejected candidates. Install
counts are skills.sh's own and can be inflated, as noted.
