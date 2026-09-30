# Visual asset inventory: phase C prep

Date: 2026-09-30 (evidence folder 2026-10-01). Read-only survey. No file in any surveyed repo or folder was
modified. Thumbnails and contact sheets were generated only into `./thumbs/` (sips + ImageMagick `montage`).

Provenance was checked in three ways: (a) repo docs, manifests, commit messages and license files;
(b) embedded C2PA metadata in PNG originals (`strings` shows `OpenAI Media Service`, `gpt-image`,
`trainedAlgorithmicMedia`); (c) the Codex session `cwd` that produced each `~/.codex/generated_images/<session>`
folder. WebP derivatives have no C2PA metadata, so their provenance depends on the repo records plus
the PNG originals.

Verdict key for reuse in the **public** d20-studio repo:

- **SAFE**: owner-generated or owner-authored, or openly licensed (CC0/PD). Safe to commit with a provenance line.
- **SAFE+ATTR**: openly licensed and requires attribution (CC BY 3.0, ISC). Needs a credits/legal entry.
- **COND**: owner-owned, but blocked by something else: old brand, retired direction, personal names, or the pending brand stage.
- **PRIVATE**: never in a public repo (private content pack, non-SRD/WotC Product Identity, real-player data).
- **REF-ONLY**: third-party copyrighted material. Can be studied locally, but must never be committed, traced, bundled or screenshotted into the repo.

---

## 0. Short answer

- The GPT-generated rasters the owner remembers are real and well documented. There are **27 owner-generated
  gpt-image PNG originals** in `~/Documents/images_d20folio/` (PROMPT_1–29; the C2PA metadata says OpenAI gpt-image).
  They were delivered through ChatGPT and the prompt documents live in `~/Documents/`. d20 Folio ships
  their graded WebP derivatives: **12 scene plates in day/night pairs, 4 materials and 1 crest**. Codex
  `image_gen` separately produced **330 public and 173 private monster portraits, 5 item plates, the 18 Tactical
  Codex atlas boards, and about 90 later lab images** (portraits, icon sheets, frames, ford map). Their raw PNGs sit in
  `~/.codex/generated_images/`.
- The largest reusable set for a public repo is the **12 scene plates + 4 materials + crest**, the **330 SRD monster
  portraits**, the **5 item plates**, the **CC0 ornament library** and the **Game Icons / Lucide glyph sets** (with attribution).
- **Never reuse publicly:**
  - the 173 private-pack portraits (they include WotC Product Identity: beholder, mind flayer, githyanki, displacer beast, umber hulk…)
  - the BG3 screenshots
  - the extracted BG3 game textures and fonts
  - real-player character material
- The whole existing visual language is the "candlelit gilt scriptorium" of d20 Folio. The owner says the current look
  is poor, and d20-studio's CLAUDE.md retires the earlier design directions. Treat everything below as **candidate
  material**, never as the default design.

---

## 1. d20 Folio: `~/Workspace/d20-folio` (GitHub **PUBLIC**, code AGPL-3.0; checked on `main` 5b7f2a8b and `v2` aac3e5fe)

On `main`, git tracks 395 image files; `v2` has 418. No untracked images exist outside build output
(`dist/`, `coverage/`, `dev-dist/`, `node_modules/`).
The repo has no separate asset license. DESIGN.md §13 ("Asset Contract") is the provenance record: "Every shipped
image is original or carries repository-safe provenance; BG3 assets remain private study material".

### 1a. Scene plates and materials (owner-generated in ChatGPT/gpt-image, graded by agents)

| Path (public/assets/…) | Dims | Size | Subject | Source PNG | Verdict |
| --- | --- | --- | --- | --- | --- |
| backgrounds/home-hero.webp / -light | 1672×941 | 82 / 115 KB | Candlelit study: candelabrum, shelves, orrery; calm dark centre / same room at morning | PROMPT_12 / PROMPT_13 | SAFE |
| backgrounds/login.webp / -light | 1672×941 | 80 / 95 KB | Glowing grimoire altar, empty left third for sign-in / dawn twin | PROMPT_14 / PROMPT_15 | SAFE |
| backgrounds/campaign-backdrop.webp / -light | 1672×941 | 99 / 177 KB | War table with blank map, astrolabe, lapis banner / daylight | PROMPT_16 / PROMPT_17 (runner recoloured, AI "signature squiggle" patched) | SAFE |
| backgrounds/compendium-scene.webp / -light | 1672×941 | 87 / 76 KB | "Grand Library" hall / morning | PROMPT_18 / PROMPT_19 | SAFE |
| backgrounds/roster-scene.webp / -light | 1672×941 | 84 / 179 KB | "Hall of Heroes", armour stands / morning | PROMPT_20 / PROMPT_21 | SAFE |
| backgrounds/creation-scene.webp / -light | 1672×941 | 97 / 156 KB | "Ritual of Making": lectern, floor circle / dawn | PROMPT_22 / PROMPT_23 | SAFE |
| textures/panel-leather.webp | 1024×1024 | 32 KB | Tileable dark leather grain | PROMPT_1 | SAFE |
| textures/panel-light.webp | 1024×1024 | 25 KB | Tileable cream leather grain | PROMPT_8 | SAFE |
| textures/parchment.webp | 1672×941 | 18 KB | Pale parchment leaf | PROMPT_28 | SAFE |
| textures/vellum-dark.webp | 1672×941 | 82 KB | Dark umber vellum | PROMPT_29 | SAFE |
| brand/crest.webp | 349×384 | 30 KB | Engraved d20 in a laurel/acanthus wreath, alpha mask | PROMPT_6 | COND (tied to the brand; the brand stage is pending) |

Earlier or unused originals, all in `~/Documents/images_d20folio/`:
- PROMPT_2, 4, 5: first-generation study, login and war table, superseded by the v2 plates.
- PROMPT_3: leather variant.
- PROMPT_7: ornament style board, reference only.
- PROMPT_9–11: first daylight set.
- PROMPT_24–25: rejected corner/flourish masks.

The prompts, with accept/reject criteria, are in `~/Documents/d20-folio-asset-prompts-batch-1.md`,
`…-batch-3-daylight.md` and `~/Documents/d20-folio-bg3-asset-prompts.md` (Batch 4, "FULL BG3").
Art direction rules were: warm amber/umber, one lapis accent, no text, no faces, calm low-contrast centre, edges receding.

### 1b. Canonical monster portraits (Codex image_gen, 2026-08-02)

| Path | Count | Dims / budget | Subjects | Verdict |
| --- | --- | --- | --- | --- |
| `assets/monsters/*.webp` | 330 (21 MB) | 672×840 (4:5), ≤90 KB each | Every SRD 5.2.1 creature: dragons, fiends, beasts, NPCs (knight, mage, scout…), "Living Bestiary" dark painterly style | SAFE: original generated art for SRD (CC-BY-4.0) subjects, already published |

- Raw originals: `~/.codex/generated_images/019fc2f7…`, `019fc324-3c53…`, `019fc324-5e3e…`, `019fc324-85ac…`.
  These are 557 PNGs at 1122×1402 or 1003×1568, about 1.3 GB, C2PA gpt-image. The Codex session cwd was `d20-folio`.
- The records are the 2026-08-02 entries in PROGRESS.md and `docs/POSITIONING.md` ("original generated art made for
  this project, partitioned public/private"). The id-to-art manifest is `src/data/monster-art.ts`.

### 1c. Item art calibration set (Codex image_gen, 2026-08-04)

| Path | Dims | Subject | Verdict |
| --- | --- | --- | --- |
| `assets/items/equipment/equipment--{acid,club,longsword,plate-armor}.webp`, `assets/items/magic/magic--ring-of-protection.webp` | 672×840, 16–43 KB | Single object on dark stone, low-key light | SAFE. The set was dormant: the "all-or-none" corpus of 563 items was never generated |

Raw originals are in `~/.codex/generated_images/019fc4b2…` and `019fca4b…` (8 PNGs at 1122×1402).

### 1d. Brand and app icons (hand-authored SVG)

| Path | Notes | Verdict |
| --- | --- | --- |
| `public/favicon.svg`, `public/favicon.ico` | Gilt d20 with an enlarged "20" face | COND (brand pending) |
| `public/icons/{icon-192,icon-512,icon-512-maskable,apple-touch-icon}.{svg,png}` | PWA icons on an umber tile | COND (brand pending) |
| `src/components/ui/brand-mark.tsx` `D20Mark`; v2 `src/features/identity/assets/d20-mark.svg` | Geometrically correct icosahedron drawn in code. DESIGN.md notes that image models produced wrong "AI-slop" d20s | SAFE geometry; reuse is a useful lesson for any d20 mark |

### 1e. Vector glyphs (third-party, openly licensed)

| Location | Content | License | Verdict |
| --- | --- | --- | --- |
| `src/components/shared/fantasy-icons.tsx` (26), `folio-icons.tsx` (32), `folio-shell-icons.tsx` (4) | Inline 512-unit paths from game-icons.net: broadsword, hatchet, bow, spell book, campfire, lyre… by Lorc, Delapouite, Skoll, Carl Olsen, John Colburn | CC BY 3.0, credited in each comment and on `/legal` (EN/IT) | SAFE+ATTR |
| v2 `src/assets/icons/play-sprite.svg` (61 KB, 61 `<symbol>`s) | Action-economy marks (own design) plus damage types, conditions and UI glyphs normalised from Game Icons + Lucide | CC BY 3.0 + ISC. The commit 22c6e9eb message counted "63 game-icons.net + 39 Lucide + 5 marks" | SAFE+ATTR |
| `lucide-react` dependency; v2 `src/features/identity/assets/{arrow-left,circle-user-round,list}.svg` | Lucide outline icons | ISC | SAFE+ATTR |

There is no custom-drawn icon family. The Tactical Codex B00 board specified "an original 24 px outline icon grammar",
but that grammar was never produced.

### 1f. Ornaments

| Path | Notes | Verdict |
| --- | --- | --- |
| `public/assets/ornaments/corner-{tl,tr,bl,br}.svg` (≈8 KB each) | Filigree spandrel corner masks, "CC0-derived" (commit 8c6981be); match `bg3-ui-study/pd-ornaments/derived/mask-spandrel-*` from Openclipart #282416 (GDJ, CC0) | SAFE |

### 1g. Design reference boards: Tactical Codex atlas (Codex image_gen, 2026-08-25)

| Path | Count | Dims | Notes | Verdict |
| --- | --- | --- | --- | --- |
| `docs/design/tactical-codex-atlas/boards/*.png` (main); `docs/archive/v1/design/…` (v2) | 18 (32 MB) | 1536×1024 (B00 1024×1536, S01 1586×992) | Generated full-screen UI concept boards: A00 shell … A16 overlays, B00 Asset Bible, B01 Motion Bible, S01 session planner/calendar, S02 Homebrew Studio. C2PA gpt-image. Raw set in `~/.codex/generated_images/01a03109…` (49 PNGs) | COND / REF-ONLY. The direction is retired. The boards contain the owner's first name and a real group character name ("Catalion") in A00. Useful as a record of layout ideas, not as a design source |

### 1h. Screenshots and social cards (d20 Folio's own UI)

| Path | Count | Notes | Verdict |
| --- | --- | --- | --- |
| `docs/assets/*.webp` | 6 | README screenshots 1440×900: cockpit dark/light, compendium dark/light, roster, campaign | REF-ONLY (old look) |
| v2 `docs/program/reference/screenshots/*.webp` | 14 | Campaign, character, inventory, target, applied, correction, DM workspace, calendar, HUD slots IT, phone nav, account IT dark | REF-ONLY (old look) |
| `public/og-card{,-character,-campaign}.jpg`, `functions/cards/*.jpg` | 3 (+2 copies) | 1200×630 cards with the "D20 Folio" wordmark over scene art | COND: the old brand is baked in. Rebuild the cards from the plates instead |
| `tests/e2e/fixtures/portrait.png` | 1 | 80×120 test fixture | not an asset |
| v2 `docs/diagrams/*.svg` | 5 | Architecture/flow diagrams (≈150 KB each) | not visual-identity material |

Fonts used by d20 Folio (via `@fontsource`, OFL): Cinzel (variable), Alegreya (variable), Source Serif 4.
The Tactical Codex B00 board had proposed Newsreader + Inter instead.

---

## 2. d20-folio-content (+ `d20-folio-content-v2` worktree on branch `v2`): GitHub **PRIVATE**, "no license"

| Path | Count | Dims | Subjects | Verdict |
| --- | --- | --- | --- | --- |
| `content-pack/assets/monsters/*.webp` (both checkouts; same file names) | 173 (10 MB) | 672×840 | Non-SRD 2024 Monster Manual creatures. They include WotC Product Identity: beholder, beholder-zombie, death-tyrant, spectator, mind-flayer(+arcanist), intellect-devourer, githyanki ×3, githzerai ×3, displacer-beast, umber-hulk, carrion-crawler, kuo-toa ×4, slaadi ×6, yuan-ti ×5, myconids, flumph, aarakocra… | PRIVATE. Original pixels, but the subjects are non-SRD WotC designs and the file names disclose the private pack |
| `previews/folio_design/_shots/*.png` (untracked, 16 MB, June 2026) | 29 | – | Screenshots of pre-split HTML prototypes (home, combat, spells, wizard…, dark/light) | REF-ONLY (obsolete) |

The only other content-pack assets are data (no images).

---

## 3. Originals and generations outside the repos

| Location | What | Verdict / note |
| --- | --- | --- |
| `~/Documents/images_d20folio/PROMPT_{1–25,28,29}.png` | 27 owner-delivered gpt-image PNGs (48 MB). Sizes 1672×941, 1254×1254, 1122×1402. These are the masters for §1a | SAFE (owner-generated). **Hazard:** they live under `~/Documents`, which the global rules treat as possibly cloud-synced. Copy them to `~/Workspace/Codex/…` before a visual session regrades them |
| `~/Documents/d20-folio-asset-prompts-batch-1.md`, `…-batch-3-daylight.md`, `d20-folio-bg3-asset-prompts.md` | Full prompt texts, accept/reject criteria, shipped status P1–P29 | Reusable prompt patterns (safe text, owner-authored) |
| `~/.codex/generated_images/` (31 session folders, 830 files, 1.7 GB) | Mixed projects. **16 sessions are d20** (sorted by session cwd): monsters 08-02; items 08-04; atlas boards 08-25; portraits, icons and comps 08-27 … 09-05; one d20-studio image on 09-12. The others belong to press-on-please (nail designs), realtime-voice-chat, inferno-documentation and one personal photo edit | d20 folders are SAFE as owner generations, but they are unsorted raw output. **Do not browse the non-d20 folders.** One contains personal photographs |
| Codex 09-01 session `01a049ab…` (74 PNGs) | Most useful unshipped d20 raster set: 14 fictitious PC portraits (1254×1254, painterly, e.g. "Lyra Voss"), dark and parchment UI comps, element/spell icon sheets (fire, radiant crescent, nature, sword, crown, potion, shield, flaming sword…), frame/border PNGs with alpha, 2 dark textures, landscape vistas | SAFE as owner generations. The icons are raster sheets, not production SVG. Subject check needed: one icon is a beholder-like eye (WotC PI), so exclude it |
| Codex 09-05 sessions `01a06f91…`, `01a071f4…`, `01a07287…`, `01a072b4…` | Ford/river-crossing tactical map (1499×1049), battle map, Lyra portrait, weapon/spell/item icon sheet (crossbow, rapier, fireball, lute, potion, shield, scroll, music spell) | SAFE generations, but tied to the **retired design-01 / ford scenario**. Mood reference only, not a default |
| `~/Workspace/Codex/v2-html-design-lab/atlas/assets/` + `ASSETS.md`; `d20-design-dialogue/*/assets/` + `CREDITS.md`, `ICON-LICENSES.md`; `d20-folio-design-20260905/assets/PROVENANCE.json`; `d20-folio-research-reset-20260905/lab/assets/PROVENANCE.json` | Lab copies (folio-world 1536×1024, lyra-portrait 1024×1536, raven-ford 1499×1049, action-art sheets) with sha256 + source path; 32 Iconify-fetched Game Icons/Lucide SVGs with a per-file license list | Good provenance model to copy. All of it is labelled "lab only; runtime needs separate verification" |
| `~/Workspace/Codex/d20-folio-asset-research/` (2026-08-26) | Third-party portrait packs: itch.io "FantasyPortraitSet1" zip, "oicaroh" free portraits, OGA RPG portraits, Wesnoth portraits, Ravenmore preview. Also contains `itch-cookies.txt` (session cookies, not opened) | REF-ONLY until each pack's license is verified. **Never copy the cookies file** |
| `~/Downloads/Character Images/` (6 files) | Portraits of the owner's real group characters (Bo, Catalion, Mandorlino, Briox, Chiaviddu, Santaera) | PRIVATE (real-player data; never in the public repo) |

---

## 4. `~/Workspace/bg3-ui-study` (created 2026-07-30; not a git repo)

| Folder | Content | Value for the visual phase | Verdict |
| --- | --- | --- | --- |
| `corpus/` (23 MB) + `manifest.md` | 45 BG3 screenshots with source URL, resolution and surface tags: char creation ×9, char sheet ×3, hotbar/HUD ×5, inventory ×2, spellbook ×3, tooltips ×5, dice roll ×2, level-up ×3, journal ×2, map ×2, main menu ×4, options, dialogue, container, context/radial menu, trade. Sources: Steam store, bg3.wiki, GameRant, TheGamer, Deltia's, eip.gg, Destructoid, PC Gamer | Best local reference for "copy BG3's UI grammar": panel framing, tooltip anatomy, hotbar/economy layout, dice ceremony, level-up flow | REF-ONLY (Larian/WotC plus publisher captures). Never commit, trace or screenshot into the repo |
| `game-assets/` (956 MB) + `EXTRACTION-NOTES.md` | 6,297 DDS textures + 310 Noesis XAML files extracted from the owner's licensed `Game.pak` (`Public/Game/GUI/`), 23 font files including commercial Quadraat Offc Pro, and `_png-preview/` with 29 chrome textures (dialog box, tooltip plates, dividers, button decor, XP frame, portrait frame, scroll) | Very precise reference for BG3 chrome proportions and states (the XAML maps which texture sits where) | PRIVATE study only. Copyright Larian/WotC; the fonts are commercially licensed. Never ship, trace or embed |
| `pd-ornaments/` (67 MB) + `manifest.md`, `solid-corners/manifest.md`, `derived/README*.md` | 66 SVGs (dividers ×18, corners ×9, finials/tailpieces, frames ×6, Celtic knots ×9, derived gold frames, lily/missal/spandrel corner masks) + 24 JPG/1 TIF PD photos of medieval book-corner fittings (Rijksmuseum, UB Heidelberg, BL, etc.), each with its license evidence | Ready-to-use ornament vocabulary for a BG3-like gilt frame language without touching BG3 assets | SAFE (CC0 / PD). Keep the per-item source row when committing |
| `rejected-ledger.md` | Owner's 2026-07-30 list of five rejected d20 Folio looks (flat light stat strip, washed ivory header plate, chevron divider ornament, muddy compendium, rounded ability cards) | Direct taste evidence: patterns to avoid | Text evidence (safe to cite) |

---

## 5. `~/Workspace/combat-chronicle-shots` (2026-08-02; not a git repo)

18 PNGs, 1280 px wide × 2676–3818 px tall, about 16 MB. They are full-page screenshots of d20 Folio's combat chronicle in
dark/light pairs: A1–A3 action banners (weapon, magic missile, fireball) and B1–B6 feed round 2/3, end entry, saved chapter,
applied hit, DM undo. The fixture character is "Pyra, Evoker Wizard". Value: flow and state evidence for the chronicle/undo
design. It is not visual material. Verdict: REF-ONLY (old look; do not commit).

## 6. `~/Workspace/dnd-sheets` (GitHub **PUBLIC**; last commit 2026-05-11)

This is the single-file vanilla HTML/CSS/JS predecessor (gold/navy palette, system-ui font). It has **no raster or SVG asset
files**, only two inline `<svg>` per HTML file. `DESIGN.md` covers the auto-compute and override principle, not visuals.
Nothing reusable visually.
**Privacy flag (outside this task, the owner decides):** the public repo tracks `examples/` with a real group character
("Catalion") as PDF and JSON.

---

## 7. Contact sheet: best candidates (`./thumbs/`)

| # | Sheet | What to look at |
| --- | --- | --- |
| 1 | `01-folio-scene-plates.jpg` | **Top raster candidate.** The 6 day/night scene pairs are coherent, calm-centre and painterly (SAFE) |
| 2 | `02-folio-textures-crest-items-og.jpg` | 4 materials, the crest mask, 5 item plates, 3 OG cards (brand-baked) |
| 3 | `03-folio-monsters-public-sample.jpg` | 24 of 330 SRD monster portraits. Strong, consistent "Living Bestiary" style (SAFE) |
| 4 | `04-pack-monsters-private-sample.jpg` | Private pack sample (PRIVATE: for owner review only) |
| 5 | `05-folio-tactical-codex-atlas-boards.jpg` | 18 retired generated UI concept boards (reference) |
| 6 | `06-owner-gpt-image-sources-PROMPT.jpg` | All 27 owner PROMPT_* masters, including rejected ornaments and the style board |
| 7 | `07-folio-readme-app-screenshots.jpg` | What d20 Folio actually looked like (the look to move past) |
| 8 | `08-codex-d20-nonmonster-generations.jpg` | 154 unshipped d20 Codex generations. The best unused material is the PC portraits and icon sheets from 09-01 |
| 9 | `09-REFERENCE-ONLY-bg3-corpus-screenshots.jpg` | BG3 UI corpus (REF-ONLY) |
| 10 | `10-PRIVATE-bg3-extracted-chrome-preview.jpg` | BG3 chrome textures (PRIVATE study) |
| 11 | `11-combat-chronicle-shots.jpg` | Old combat chronicle screens |
| 12 | `12-cc0-pd-ornaments-svg.jpg` | 70 CC0/PD ornament SVGs + the 4 shipped corner masks (SAFE) |

The thumbs are local evidence only. Several show personal names or third-party art, so **never commit `thumbs/`**.

Best candidates, ranked for the visual session:

1. **Scene plates (12) + materials (4)**: the ready day/night world, with 1672×941 masters available for regrading.
2. **SRD monster portraits (330)**: one consistent art direction at production size, with raw 1122×1402 masters.
3. **CC0 ornament library + derived corner masks**: the legal route to BG3-like gilt framing.
4. **Game Icons + Lucide glyph sets** (≈120 glyphs with attribution records): the base for an SVG icon system until a
   custom family is drawn.
5. **Codex 09-01 PC portraits and spell/element icon sheets**: demo fixtures and style exploration. They need subject checks
   and are raster only.
6. **Item calibration plates (5)**: a proven style recipe for a future item corpus.
7. **BG3 corpus + extracted XAML/chrome**: the anatomy reference for "copy BG3". Study only.

## 8. Rules for the next visual session

- Before any art enters d20-studio, write a provenance row for it: source file, generator (gpt-image, C2PA), date,
  prompt reference, owner, and license or attribution. `PROVENANCE.json` with sha256 (as in the Codex labs) is a
  working pattern.
- Keep masters outside the repo (under `~/Workspace/Codex/…`). Commit only graded, budgeted derivatives.
- Public/private partition: SRD subjects may be public. Anything from the private pack, any WotC Product Identity
  subject, and any real group character or player name stays out.
- Never ship BG3 screenshots, textures or fonts, and never trace them. The CC0 ornaments and original generations are the legal
  substitutes.
- Rebuild brand items (favicon, crest, OG cards) after the naming/brand stage. The d20 geometry in code is the proven base.
- AI image models failed at d20 geometry and small ornaments before (PROMPT_24/25 were rejected; "AI-slop"
  d20). Draw icons, marks and ornaments as code/SVG, and use raster generation for scenes, portraits and objects.
