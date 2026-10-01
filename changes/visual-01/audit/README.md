# Design-value audit — Phase C (visual-01, I-250)

I-250 (01/10/2026) asks for **one** coherent professional design: «no padding, margin, button or
font left unattended». This tool measures how far a direction is from that. For one direction
(`off`, `current` or a direction id) it reaches the round-1 states of the **real** app, reads the
computed design values of every visible element, and reports:

1. a **histogram** of the distinct values of each property;
2. the **inferred scale** (values used by ≥ 3 elements) and the **outliers** (values used by 1–2
   elements, values off the base step, fractional pixels), each with its elements;
3. the **components** (buttons, inputs, selects, tabs, chips/badges, menu items, toggles,
   panels/cards) grouped by visual class, with every class that renders more than one variant;
4. the **typography** in use: font families (first available in each stack, and the platform
   fonts Chromium actually rendered), sizes, weights, line heights, type styles;
5. the **WCAG 2.x contrast** of every text against its effective background, with the failures.

It writes machine-readable JSON and a readable Markdown report.

## Command

From the worktree root (`~/Workspace/Codex/d20-studio-visual-01`), with the no-cache server running
(`python3 changes/visual-01/serve.py` → <http://127.0.0.1:8881/>). Wrap every run in the 150 s alarm
(GNU `timeout` is not installed). **One command per direction:**

```sh
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/audit/audit.js --direction current
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/audit/audit.js --direction bg3
```

Each run captures the 10 round-1 states at 1440×900 and 390×844, dark theme: 20 state shots.
On 01/10 the final runs took 53–74 s with three states in parallel, while other agents' captures
were running (load average 22–34 on 8 cores). The 150 s alarm leaves room for one retried state. Output goes to
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/audit/<direction>/`.

If a run must be split, or one state failed, run part of the matrix into the same folder. The
report is rebuilt from every raw file there:

```sh
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/audit/audit.js --direction bg3 \
  --states table-combat --widths 1440
node changes/visual-01/audit/audit.js --direction bg3 --report-only   # rebuild the report only
node changes/visual-01/audit/audit.js --help
```

| Option               | Default                                               | Meaning                                                                                                                       |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `--direction <name>` | required                                              | `off` (plain app), `current` («Attuale», direction mode) or a direction id, exactly as the capture kit's `--directions`.      |
| `--states <list>`    | the 10 round-1 states                                 | `home,sheet,sheet-full,table-combat,table-combat-dm,table-explore,sheet-spells,sheet-inventory,dialog-initiative,token-menu`. |
| `--widths <list>`    | `1440,390`                                            | As the capture kit.                                                                                                           |
| `--theme <name>`     | `dark`                                                | `dark` or `light`.                                                                                                            |
| `--out <dir>`        | `…/visual-01/audit/<direction>`                       | Output folder.                                                                                                                |
| `--base`, `--now`    | `http://127.0.0.1:8881/`, `2026-09-30T19:00:00+02:00` | As the capture kit. Port 8879 is refused.                                                                                     |
| `--jobs <n>`         | `3`                                                   | States in parallel (the kit's default; more parallelism hit the kit's 15 s boot wait on a busy machine).                      |
| `--report-only`      | off                                                   | Rebuild `audit.json` and `audit.md` from `raw/` only.                                                                         |

A state that throws (for example the kit's 15 s app-boot wait on a busy machine) or whose
inspection fails is **retried once**. If it still fails, the run exits with code 1 and that state's
old raw file is deleted, so an earlier run never stands in for it. A failed kit check is not
retried, because it is deterministic.

## Output

```
audit/<direction>/
  audit.md            the readable report (headline, sections 1–5)
  audit.json          the same, machine-readable: headline, steps, properties{histogram, scale,
                      outliers}, nearDuplicates, defaults, components{byLook, byClass}, typography,
                      contrast{failures, uncertainList}, inputs (state, width, capturedAt, shot)
  raw/<state>-<theme>-<width>.json   every audited element of one state shot (see below)
  shots/<state>-<theme>-<width>-<direction>.png   the capture kit's screenshot of that state
```

Each raw element row has: `path` (a short selector path), `key` (its position in the DOM, used to
recognise the same element across states), `role`, `name` (accessible name, approximated),
`kind`, `box` (page x, y, w, h), `pad`/`mar` (4 sides; `"auto"` margins kept as such), `gap`
(flex/grid only), `fam` (first available family) and `pfam`/`pf` (the platform fonts, by glyph
count), `fs`, `fw`, `lh`, `ls`, `caps`, `bw`/`bc` (border widths and colours of the 4 sides; a
transparent side has no colour), `br` (4 corners: px, `full` for a pill or circle, `rx/ry` when
elliptical), `shadow`, `c`/`bg`/`bgi` (text colour, background colour, gradient or image), `op`
(cumulative opacity), and for text `text`, `tbox` (ink box) and `contrast`.

## How it works

- **Reaching the states.** `audit.js` reuses the capture kit's state machine through the one
  additive change made to `changes/visual-01/capture/shoot.js`: `shootGroup` accepts an optional
  `opts.inspect(page, group)`, and the file exports its internals behind a `require.main` guard.
  The CLI, its options and its output names are unchanged. The kit reaches and checks each state
  (fresh context, «Ripristina esempio», combat via the app's own dialog, the kit's checks), takes its
  screenshot, then calls the hook on the same settled page. A state whose checks fail is not
  audited.
- **Collecting** (`collect.js`, in the page; read-only except `window.__d20AuditText`, deleted at
  once). One walk over the DOM. An element is audited when it is rendered (`display`, `visibility`,
  cumulative `opacity` > 0.01, `checkVisibility`, not clipped by the visually-hidden pattern or by
  an `overflow` ancestor), intersects the viewport (full-page states: the document), and is **not
  covered**. Covered means that at its centre and at four inner points another element that
  paints lies over it. SVG content counts only for icons (outermost `svg` or `svg.icon`) and
  `text`; HTML inside a `foreignObject` counts normally. **Excluded:** the dev-only demo strip
  (`.demo-strip`, with the «Direzione» selector) and the brand logo (`svg.logo`, waiting for
  Phase D).
- **Counting.** An element seen in several states counts once per width (its DOM position plus the
  width). Histograms count distinct elements (`×n`) and keep total uses in JSON. Typography and text
  colour count only visible text. Zero-size text, transparent text and a checkbox's `value` are not
  text.
- **Scale and outliers.** Spacing is padding, margin (not `auto`) and gap. Its base step is the
  largest of 8/6/5/4/3/2 px that covers ≥ 85 % of the element uses. If none does, the report says
  «no base step» and checks the conventional 4 px grid. Radii use 4/2 px, falling back to 2 px.
  The off-step check also applies to control heights.
- **Browser defaults.** The report lists controls that keep Chromium's defaults: button padding
  `1px 6px`, text-field padding `1px 2px`, the dark-scheme field background `#3b3b3b`, and the
  13.33 px control font.
- **Components.** `kind` comes from role and tag. `tab`: role tab or a `…-tab` class. `chip`: a
  `chip`/`badge`/`pill`/`tag`/`pip` class with a visible surface. `panel`: a surface ≥ 120×40 with
  a fill, gradient, image, 3+ borders or a shadow. A **visual class** is the fill (solid colour,
  tint, none, gradient, image), whether there is a visible border, and the content (text, icon,
  icon+text). A **variant** is height, padding, font, radius and border. Icon-only controls use box
  and glyph size instead of padding. Panels use radius, border and padding. The report also groups
  by CSS class signature (state classes such as `active`, `is-*` removed), which helps a builder
  fix them by selector.
- **Fonts.** For each computed stack, the first family that is generic, a loaded webfont, or
  installed (canvas width test). For each text element, the platform fonts Chromium used
  (CDP `CSS.getPlatformFontsForNode`), which also reveals glyph fallbacks such as Zapf Dingbats for
  ✦ or a CJK font for symbols.
- **Contrast.** The ink is `color`, or `fill` for SVG text. On a solid background the ratio is exact:
  the layers painted under the text centre (`elementsFromPoint`, falling back to ancestors) are
  composited with alpha and opacity, and SVG labels use their halo stroke. Over a gradient, an
  image or the map, the ratio is **measured in the screenshot**. Ring points 1–3 px around the
  text's ink box are kept only where the topmost element is the text's own background layer. For
  an HTML layer that means 1 px inside its padding box; for an SVG shape, its fill without the
  outline. So neighbouring icons, glows, borders and the map around a marker are left out. Pixels
  of the text's own colour are dropped unless they are most of the ring. The ratio shown is the
  10th percentile, then the median. AA thresholds: 4.5, or 3 for ≥ 24 px or ≥ 18.66 px bold.
  Disabled controls, content behind a modal dialog, and text whose centre is covered are listed as
  not measured. `uncertain` remains only where no pixel could be read: below the fold of a
  full-page state, or tiny map glyphs.

## Proof runs (01/10/2026, Chromium 153, both 20/20 state shots)

| Measure                                     | `current` (today's look)                                    | `bg3` (direction.css of 01:55)               |
| ------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| Visible elements (unique per width)         | 2583                                                        | 2592                                         |
| Spacing values (padding, margin, gap)       | 42; no base step (4 px grid fits 36 %); 35 outlier values   | 32; base step 2 px (92 %); 20 outlier values |
| Control heights                             | 29 distinct                                                 | 26 distinct                                  |
| Font families · platform fonts              | 3 · 8                                                       | 2 · 7 (Alegreya on 1242 of 1244 texts)       |
| Font sizes · weights · type styles          | 23 · 4 · 101                                                | 18 · 4 · 78                                  |
| Radii · border widths · shadows             | 17 · 2 · 16                                                 | 6 · 4 · 49                                   |
| Colours text · background · border          | 15 · 28 · 20 (13 near-duplicate pairs)                      | 22 · 28 · 34 (23 near-duplicate pairs)       |
| Buttons: elements, visual classes, variants | 567, 24, 108 (16 classes with > 1 variant)                  | 574, 13, 80 (12 classes with > 1 variant)    |
| Browser-default button padding `1px 6px`    | 143 buttons                                                 | 143 buttons                                  |
| Contrast (AA)                               | 3 failures of 1254 texts (DM-only travel glyphs on the map) | 48 failures, 10 uncertain, of 1212 texts     |

bg3's 48 failing text/background pairs come down to 9 kinds of text:

- the ☆ proficiency stars `#8a6a50` on the sheet (3.9:1);
- «Livia» and «Turno attuale» over the portrait in the current turn token (3.0);
- the HP «18/22» in white on the red bar (4.2);
- the token-menu counts (3.9–4.0);
- a DM-only travel glyph (2.3).

The bg3 numbers are a snapshot: its `direction.css` was being edited by its builder, and was
unchanged during this run (mtime 01:55:14 before and after). Re-run after every direction change.

## Known limits

- **Chromium only.** It needs CDP for the platform fonts and the touch gesture of `token-menu`.
  Results are for dark theme, Italian, and 100 % interface and text scale.
- **Static states.** Hover, focus and pressed styles are not audited, because the kit removes
  hover and focus before capture. Neither are pseudo-elements (`::before`/`::after`) and the
  inside of native controls.
- **Approximations.**
  - The accessible name is approximated: `aria-label`, `aria-labelledby`, `<label>`, `alt`, text,
    `title`.
  - The visual classes are a heuristic for «the same kind of control». The report lists the CSS
    classes behind every variant so a reader can judge.
  - Covered means painted over at the centre and at four inner points. An element covered by
    something with `pointer-events: none` cannot be detected.
- **Contrast.**
  - Text shadows and halos of HTML text are not counted as background (the WCAG reading), except
    through the pixels when the ring touches them.
  - In full-page states the text below the fold has no screenshot pixels. If its background varies
    it stays `uncertain` there; the same element is usually measured in another state.
- **Reading the numbers.** Margins include the HUD's fixed geometry (`76`, `88`, `152` px around
  the map), which is a layout choice. Layout `auto` margins are excluded.
