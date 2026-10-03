# Directions · the dev-only «Direzione» selector (Phase C, visual-01)

Round 1 of Phase C («Scelta 1 — Direzione», I-248) shows the owner the real app skinned as nine
numbered directions, next to today's look («Attuale»):

| Option | id          | Label in the selector |
| ------ | ----------- | --------------------- |
| —      | `current`   | «Attuale» / «Current» |
| 1      | `bg3`       | 1 · Baldur's Gate 3   |
| 2      | `ddb`       | 2 · D&D Beyond        |
| 3      | `foundry`   | 3 · Foundry VTT       |
| 4      | `owlbear`   | 4 · Owlbear Rodeo     |
| 5      | `solasta`   | 5 · Solasta           |
| 6      | `roll20`    | 6 · Roll20            |
| 7      | `owlcat`    | 7 · Pathfinder WotR   |
| 8      | `alchemy`   | 8 · Alchemy RPG       |
| 9      | `demiplane` | 9 · Demiplane         |

The full brief (selectors, tokens, risks) is `changes/visual-01/code-map.md`. This page is the
contract between the loader and the builders of each direction.

## Using it

- `http://127.0.0.1:8881/?direction=bg3#table` turns a direction on. The value persists in
  localStorage under `d20-dev-direction`.
- `?direction=current` shows the selector with «Attuale» (direction mode, today's look).
- `?direction=off` removes the key, and with it the selector: the plain app.
- Any other value means «Attuale». Only loopback hosts (`127.0.0.1`, `localhost`, `[::1]`) read the
  key or the query; anywhere else nothing happens.
- In direction mode the demo strip gains «Direzione» (`select#demo-direction`) after «Visita
  come». Changing it applies the direction and re-renders (so `fitHud` measures the new HUD); it
  never touches the role, the language, the route or the simulation data.
- Take every numbered screenshot in direction mode, «Attuale» included, so all options share the
  same strip height (96 px on the phone). The capture kit does this:
  `changes/visual-01/capture/shoot.js --directions current,bg3,ddb,foundry,owlbear`.

## How it works

`app.mjs` imports `startDirection`, `directionControl` and `bindDirection` from `index.mjs` (three
insertion points: the import, `await startDirection()` right after `loadExtensions`, the control
after «Visita come» and `bindDirection(render)` in `bindShell`). `ui.mjs` exposes
`setIconOverride(fn)` and `setLogoOverride(fn)`.

`applyDirection(id)` (chained, so quick changes never interleave):

1. **Direction mode** (loopback and key present): `<link id="dev-direction-ui">` →
   `directions/dev.css` (only the strip wrap at ≤ 720 px). Removed outside direction mode.
2. **Any direction id active:**
   - `<link id="dev-direction-sample">` → `directions/sample.css` (the shared sample art);
   - `<link id="dev-direction-css">` → `directions/<id>/direction.css`, appended **last** in
     `<head>` (after the 59 area stylesheets). On a switch the new link is awaited (load or error,
     at most 3 s) before the old one is removed;
   - a HEAD request for `assets/maps/sample/old-watch.webp`: present → `data-sample-map="on"` on
     `<html>`, absent → the attribute is removed;
   - the hidden sprite `svg#direction-defs` (outside `#app`, so renders keep it) with the pattern
     fills listed below;
   - then `data-direction="<id>"` on `<html>`.
3. **Icons:** `import("./<id>/icons.mjs")`; if it exists and exports `directionIcon`, it becomes
   the icon override, otherwise `setIconOverride(null)`.
4. **Brand (I-251):** `import("./<id>/brand.mjs")`; if it exports `directionLogo`, it becomes the
   logo override (`logo()` returns its string), otherwise `setLogoOverride(null)`. If it exports
   `favicon`, the page's `<link rel="icon">` href becomes `data:image/svg+xml,<encoded favicon>`;
   the original href is kept and put back, byte for byte, when the direction goes. Under the
   light theme both step aside (today's mark and tab icon), like the icons: the logo is checked
   at render time and a `MutationObserver` on `data-pref-theme` swaps the tab icon.
5. **«Attuale» or off:** attribute, links, sprite, `data-sample-map`, the icon and logo overrides
   and the favicon swap are all removed: the page is exactly as before.

**Zero effect with no key.** No attribute, no link, no sprite, no strip control, `icon()` and
`logo()` output byte-identical, favicon href untouched. The only difference is one extra
same-origin GET for this module. Proof for the scaffold:
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/scaffold/`; for the brand hook:
`…/visual-01/brand/`.

**Known noise.** A direction without `icons.mjs` or `brand.mjs` makes the browser log one 404 for
each (the import is caught). The same holds for the sample map HEAD request when the file is
absent.

## Contract for a direction builder

Write only in `directions/<id>/` (plus assets with provenance). Never edit an existing `.css` or
markup: about 15 Node tests read their source text (code-map §f1).

### `direction.css`

- **Every style rule starts with `:root[data-direction="<id>"]`**, also inside `@media`,
  `@supports` and `@container`. Copy the **full** existing selector after the prefix; that is what
  makes it win (code-map §c). `@font-face` and `@keyframes` are the only unprefixed blocks.
  `tests/visual01-directions.test.mjs` fails on any other selector and on `!important`.
- **Colour tokens and anything that paints colour or texture:**
  `:root[data-direction="<id>"]:not([data-pref-theme="light"])` (dark first; light keeps today's
  palette).
- **The eight contrast-sensitive tokens** (`--text --muted --line --focus --line-strong --frame
--frame-soft --placeholder`): also `:not([data-pref-contrast="high"])`.
- **Fonts, radii, spacing:** `:root[data-direction="<id>"]`. Override `--font-display`,
  `--font-ui`, `--font-label` only. Keep `--text-*` in the `calc(Npx * var(--pref-text-scale,1) *
var(--pref-ui-scale,1))` form.
- **Motion:** never redefine `--dur-*` (if you must: only inside
  `@media (prefers-reduced-motion: no-preference)` with `:not([data-motion="reduced"])`).
- **Tokens that colour map tokens:** guard with
  `:not([data-pref-vision]:not([data-pref-vision="standard"]))`.
- **Scope surface rules** with `.home-page`, `.character-sheet` or `.table-layout` /
  `.workspace.is-table`, so Campaign, Library and dialogs are not skinned by accident.
- **No** markup, text, `content:` text, `text-transform`, `display: none` on named text or
  controls (use the visually-hidden pattern), `!important`, or un-hiding hidden hooks and fitter
  classes. Keep 40 px targets, the visible focus ring, the hotbar ≤ 120 px at 1440 and AA
  contrast. If you change the tool column, the hotbar height or the party column, adjust the map
  box margin and the caption/zoom offsets in the same file (code-map §b6, §f4).
- At the top, a comment table **«elemento → prodotto → fonte»** for every rule group: the I-248
  comparison page reuses it.
- It may re-crop or restyle the sample art: it loads after `sample.css` with the same selectors.

### `icons.mjs` (optional)

```js
// directions/<id>/icons.mjs
export function directionIcon(name) {
  // A full string, or null to keep the core icon for that name.
  return name === "ruler"
    ? '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="…"/></svg>'
    : null;
}
```

- Return the whole `<svg class="icon" viewBox="0 0 24 24" … aria-hidden="true">…</svg>` (any
  **square** viewBox), with `class="icon"` and `aria-hidden="true"`; filled glyphs say
  `fill="currentColor" stroke="none"`. Anything that is not a string starting with `<svg`, or a
  throw, falls back to the core icon.
- Names in use per surface: code-map §d. `iconPath()` (token-menu rows) is not overridden. Own-SVG
  icons (turn resources, find-token, session HUD, token menu) are reachable only with CSS masks
  from `direction.css`; the logo has its own hook, `brand.mjs` below.

### `brand.mjs` (optional, I-251): the direction's own d20 mark

Each direction has its own brand: a d20 mark and the «d20 Studio» wordmark in the direction's
language, plus the browser-tab icon. The mark is original: it follows the copied product's
visual language (material, palette, line, light) but never copies its logo. The die is always a
**true icosahedron seen face-on**, drawn as SVG in code from `directions/brand-geometry.mjs`:
never a raster, never a generated image, never a pentagon or a six-spoke ring.

```js
// directions/<id>/brand.mjs
import * as g from "../brand-geometry.mjs";

export function directionLogo(className) {
  const lit = `lit-${g.uniqueSuffix()}`; // a fresh id per call: the logo can render twice
  const faces = g.svgFaces((face) =>
    face.role === "front"
      ? { fill: `url(#${lit})` }
      : { fill: "currentColor", "fill-opacity": (0.42 + 0.58 * face.tone).toFixed(2) },
  );
  return g.logoSvg(
    className,
    `<defs><linearGradient id="${lit}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf0d4"/><stop offset="1" stop-color="#e9d29c"/></linearGradient></defs>` +
      `<g stroke="var(--logo-edge, #12171d)" stroke-width="1.8" stroke-linejoin="round">${faces}</g>` +
      g.numeral('font-family="Georgia, serif" font-weight="700" fill="#2a2116"'),
  );
}

// A standalone document for the browser tab: xmlns, literal colours, legible at 16 and 32 px.
export const favicon = g.faviconSvg(
  `<polygon points="${g.OUTLINE}" fill="#dfbd78" stroke="#12171d" stroke-width="4" stroke-linejoin="round"/>` +
    `<polygon points="${g.CENTER_FACE}" fill="#f7e6bd" stroke="#12171d" stroke-width="4" stroke-linejoin="round"/>`,
);
```

**`directionLogo(className)`** returns the whole mark:
`<svg class="${className}" viewBox="…" … aria-hidden="true">…</svg>`, class first (the
`logoSvg(className, inner, attrs)` helper writes this shape). Anything that is not a string
starting with `<svg`, or a throw, falls back to today's mark.

- **Sizes.** The header draws it at 34 px (28 px at ≤ 720 px; `.brand .logo` in `styles.css`);
  it must stay crisp at 24–32 px and scale cleanly to 160 px. Check both in the specimen's
  «Marchio» section. At small sizes fewer, bolder strokes win: seams ≥ 1.6 units, the outline
  ≥ 3, no hairline detail that only shows at 160 px.
- **Geometry.** Use `brand-geometry.mjs`: `VIEWBOX` (`0 0 100 100`), `OUTLINE` (the hexagon),
  `CENTER_FACE` (the «20» face), `FACES` (the ten visible faces, each `{ id, role:
'top'|'front'|'flank'|'bottom', vertices, points, normal, tone }`), `SEAMS` (the twelve inner
  edges, a path), `V` (named vertices), `shade(light)` (tones 0..1 for another light;
  `LIGHT` is from the upper left), `svgFaces(style)` and `numeral(attrs, size)`. Restyle it
  freely (fills, gradients, strokes, bevels, line-only, engraved); do not move vertices.
- **The numeral.** The only text allowed is «20» in the front face, written with `numeral()`:
  baseline at y 60, `NUMERAL.size` 18, at most `NUMERAL.max` 19 for a «20» up to 1.15 em wide.
  Fonts with old-style figures (Alegreya, Georgia) need `style="font-variant-numeric:
lining-nums"` so both digits stand on the baseline. A direction may leave it out at 16 px.
- **Ids.** Gradients, filters, masks and clip paths get a per-call suffix (`uniqueSuffix()`):
  the logo renders more than once on a page. Every `url(#…)` points inside the same mark.
- **No** external images, `<image>`, `<use>`, `href`, `<foreignObject>` or scripts; **no** text
  other than the numeral. Colours may use `currentColor` and the direction's custom properties
  (`var(--accent)`, `var(--logo-edge)`), since the mark is inline in the page.

**`favicon`** (optional) is a standalone SVG document: `<svg xmlns="http://www.w3.org/2000/svg"
viewBox="…">…</svg>` (`faviconSvg(inner, attrs)`), with literal colours only (no
`currentColor`, no `var()`: a tab icon has no page CSS), under 8 KB, legible at 16 and 32 px on
both a dark and a light tab strip (a silhouette and the front face with a dark edge read best;
the numeral rarely survives at 16 px).

**The wordmark** is styled in `direction.css` on the existing header markup (`app.mjs:759`,
unchanged): `<button class="brand" data-nav="home" aria-label="d20 Studio"><svg class="logo">…</svg><span>d20 <b>Studio</b></span></button>`.
Prefixed rules on `.brand` (gap, padding, font), `.brand span` (the whole wordmark), `.brand b`
(«Studio»; today it is the accent colour at weight 400) and `.brand .logo` (mark size, colour,
shadow); `.table-header .brand` is the Table's 20 px variant; at ≤ 420 px the wordmark is hidden
and the mark alone stays a 40 px target. Same rules as the rest of `direction.css`: colours under
the light guard, no `content:` text, no `text-transform`, the text stays «d20 Studio» (case,
spacing and letter-spacing are the style, not the words), the 3 px focus ring stays visible.

`tests/visual01-directions.test.mjs` checks every `brand.mjs` it finds: the export, the root's
class, viewBox and `aria-hidden`, no external reference or other text, ids unique across two
calls and resolved inside the mark, the favicon's `xmlns`, literal colours and size.

### Direction assets

Per-direction files go in `directions/<id>/assets/` and are listed, one row per file (source,
licence, author, sha256, edits), in `directions/<id>/SOURCES.md`. Shared files go in
`design/blueprint/assets/` with a row in `assets/PROVENANCE.json`. Never third-party pixels,
fonts, textures, logos or frame art; reference images stay in
`~/Workspace/Codex/d20-studio-visual-assets/references/`.

## Variants (round 2): numbered options inside a direction

Round 2 (02/10/2026, I-248…I-254) shows the owner numbered options **inside** the chosen
direction on four axes, and any combination of them (colours 2 + fonts 3):

| Axis letter | Axis               | Example names |
| ----------- | ------------------ | ------------- |
| `c`         | colours            | `c1`, `c2`, … |
| `t`         | fonts (type)       | `t1`, `t2`, … |
| `b`         | buttons and fields | `b1`, `b2`, … |
| `i`         | icons              | `i1`, `i2`, … |

A variant name is the axis letter and a number (`^[ctbi]\d{1,2}$`). Option 1 of an axis is
normally the direction as it is (no file); `c2`, `c3`… are the alternatives.

### Using variants

- `http://127.0.0.1:8881/?direction=bg3&variant=c2,t3#table` applies colours 2 and fonts 3 of
  BG3. The list persists in localStorage under `d20-dev-variant` (canonical form `c2,t3`);
  `?variant=off` removes it. A later `?variant=` replaces the whole list.
- **One per axis, the last wins:** `?variant=c2,t3,c4` means `c4,t3`. Names are applied in axis
  order **c, t, b, i**, whatever order they were typed in. Invalid names are ignored; a list with
  no valid name removes the key.
- Variants apply only while a direction id is active (never with «Attuale» or off) and only on
  loopback, like the direction. Switching direction keeps the key: the new direction's own
  `variants/` folder answers (usually nothing).
- The specimen takes the same query:
  `http://127.0.0.1:8881/directions/specimen.html?direction=bg3&variant=c2,t3`; its masthead
  names the applied variants.
- Captures (one combination per run, one direction id):
  `shoot.js --directions bg3 --variants c2,t3` writes `home-dark-1440-bg3+c2.t3.png`; the
  specimen tools take `--variants` too (`spec-buttons-dark-1440-bg3+c2.t3.png`); and
  `guarantees.js --directions current,bg3 --variant c2,t3` measures the combination
  (`ok bg3+c2.t3`). All three live in `changes/visual-01/`.

### How variants are applied

After the direction's sheets, sprite and sample-map probe (step 2 above), `applyDirection(id)`:

1. reads the list (`activeVariants()`, empty unless a direction id is active on loopback);
2. sends a HEAD request for `directions/<id>/variants/<name>.css` and
   `directions/<id>/variants/<name>.icons.mjs` of each listed name (no request at all when the
   list is empty);
3. appends one `<link rel="stylesheet" data-direction-sheet="dev-direction-variant">` per
   existing `.css`, **after** `directions/<id>/direction.css`, in axis order: they are the last
   links in `<head>`. A change appends the new links, awaits them (load or error, at most 3 s)
   and only then removes the old ones;
4. sets `data-variant="c2 t3"` on `<html>` (space-separated, axis order) with the names that have
   at least one file, together with `data-direction`. A name with no file is not applied and not
   named, so captures of a typo fail instead of showing the plain direction;
5. **icons:** if one or more listed variants have an `.icons.mjs` exporting `directionIcon`, the
   **last** of them (axis order) is asked first; its `null` (or anything that is not an `<svg…`
   string, or a throw) falls back to the direction's `icons.mjs`, then to the core icon. Under the
   light theme every override steps aside, as for the direction.

`?variant=off`, an empty list, «Attuale», off or another direction remove the variant links and
`data-variant`: the page is exactly the direction-only page (or the plain app).

**Zero effect with no variant.** No key → no HEAD request, no link, no attribute, the same icon
and logo output: the direction is byte-for-byte as before the variant layer. Proof:
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/variants-scaffold/`.

**Known noise.** Each listed variant without one of its two files logs one 404 for the HEAD probe
(nothing is imported or linked).

### Contract for a variant builder

Write only `directions/<id>/variants/<name>.css` and, for the icon axis, optionally
`directions/<id>/variants/<name>.icons.mjs` (plus assets with provenance, as for the direction).
Never edit `direction.css`, `icons.mjs` or `brand.mjs` to make a variant: the variant is a layer on
top, and it must work combined with every option of the other axes.

- **Every style rule starts with `:root[data-direction="<id>"][data-variant~="<name>"]`**, also
  inside `@media`, `@supports` and `@container`; `@font-face` and `@keyframes` are the only
  unprefixed blocks. Write the direction's own selector with the variant attribute inserted right
  after `[data-direction="<id>"]`, **keeping every guard the direction rule has**:

  ```css
  /* direction.css */
  :root[data-direction="bg3"]:not([data-pref-theme="light"]) {
    --accent: #c9a25e;
  }
  /* variants/c2.css */
  :root[data-direction="bg3"][data-variant~="c2"]:not([data-pref-theme="light"]) {
    --accent: #b8863b;
  }
  ```

  The extra attribute makes the variant rule more specific than the direction rule it copies, and
  it loads later, so it wins without `!important`.

- **The same guards as the direction:** colours and textures under
  `:not([data-pref-theme="light"])`; the eight contrast-sensitive tokens also under
  `:not([data-pref-contrast="high"])`; map-colour tokens under
  `:not([data-pref-vision]:not([data-pref-vision="standard"]))`; never `--dur-*`.
- **Tokens first, then components.** Override the direction's custom properties (`--accent`,
  `--surface`, `--font-display`, `--font-ui`, `--font-label`, the radius and frame tokens…) before
  any component rule; write a component rule only where the direction paints a literal value
  that no token reaches, and copy that direction rule's full selector.
- **Stay on your axis:** `c` colours and textures only; `t` font families, weights, sizes in the
  `calc(Npx * var(--pref-text-scale,1) * var(--pref-ui-scale,1))` form, letter-spacing and
  `font-variant-caps`; `b` buttons, fields, tabs and their states; `i` icons (`.icons.mjs`) and
  icon CSS (sizes, masks). Two variants of different axes must combine without fighting.
- **The same bans and guarantees as `direction.css`:** no `!important`, no `text-transform` (small
  caps via `font-variant-caps`), no `content:` text, no markup, no `display: none` on named text
  or controls; 40 px targets, the 3 px focus ring never clipped, never colour alone, AA contrast,
  the hotbar ≤ 120 px at 1440×900, at 390 no sideways scroll, the Table header on one row and End
  turn / Undo / Cancel visible.
- **`<name>.icons.mjs`** follows the `icons.mjs` contract above: it exports
  `directionIcon(name)`, which returns a full `<svg class="icon" … aria-hidden="true">…</svg>`
  or `null` (then the direction's icon, then the core icon).
- At the top, the same comment table **«elemento → prodotto → fonte»**, for the numbered choice.

`tests/visual01-directions.test.mjs` checks every file in every `directions/<id>/variants/`: the
name (`<c|t|b|i><n>.css` or `.icons.mjs`), the prefix of every selector, no `!important`, no
`text-transform`, and the `directionIcon` export. `guarantees.js` repeats the static check and
measures the live guarantees with `--variant`.

## Shared sample art

`sample.css` paints the same owner-generated art under every direction (records:
`assets/PROVENANCE.json`, `assets/ATTRIBUTION.md`):

| Actor      | File                                    | Hooks                                                                                                                                                                                                   |
| ---------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `livia`    | `assets/portraits/sample/livia.webp`    | Home «Il tuo personaggio» and recent chips; sheet heading portrait (also over an `<img>`); party portrait; turn-order dot; map token; hotbar, inspector and rail-tab portraits of the selected creature |
| `doran`    | `assets/portraits/sample/doran.webp`    | same                                                                                                                                                                                                    |
| `mira`     | `assets/portraits/sample/mira.webp`     | same (provisional stand-in)                                                                                                                                                                             |
| `goblin-1` | `assets/portraits/sample/goblin-1.webp` | same; 4:5 figure shown through a 370 px face square                                                                                                                                                     |
| `goblin-2` | `assets/portraits/sample/goblin-2.webp` | same; 4:5 figure shown through a 370 px face square                                                                                                                                                     |

**Sprite pattern ids** (in `svg#direction-defs`, for SVG `fill: url(#…)`):

- `dir-sample-livia`, `dir-sample-doran`, `dir-sample-mira`, `dir-sample-goblin-1`,
  `dir-sample-goblin-2` (`objectBoundingBox`, one token);
- `dir-sample-scene` (`userSpaceOnUse`, 1000×650: the old-watch scene; pans and zooms with it),
  present only when the map file exists.

**`data-sample-map="on"`** on `<html>` means `assets/maps/sample/old-watch.webp` exists. Then
`sample.css` fills `#battle-map:not(:has(> image, > foreignObject)) > rect:first-of-type` with
`#dir-sample-scene` and hides the template `> svg`. Walls, doors, grid and measurements stay live
data; an uploaded background keeps priority. A direction may restyle the grid
(`#map-grid path { stroke… }`) under its own prefix.

## Fonts

Vendored unmodified from Fontsource **5.3.0** (latin + latin-ext), each folder with its `OFL.txt`
(`google/fonts` @ `9710da1eacb3be272583c3224dcb70f9da6eadbb`). No `@font-face` exists outside a
`direction.css`, so no font file loads without a direction.

| Folder (`assets/fonts/…`) | Files                                                                                                                                                                  | Axis / weights |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `alegreya/`               | `alegreya-latin-wght-normal.woff2`, `alegreya-latin-ext-wght-normal.woff2`, `alegreya-latin-wght-italic.woff2`, `alegreya-latin-ext-wght-italic.woff2`                 | wght 400–900   |
| `alegreya-sc/`            | `alegreya-sc-latin-400-normal.woff2`, `alegreya-sc-latin-ext-400-normal.woff2`, `alegreya-sc-latin-700-normal.woff2`, `alegreya-sc-latin-ext-700-normal.woff2`         | 400, 700       |
| `alegreya-sans/`          | `alegreya-sans-latin-400-normal.woff2`, `alegreya-sans-latin-ext-400-normal.woff2`, `alegreya-sans-latin-700-normal.woff2`, `alegreya-sans-latin-ext-700-normal.woff2` | 400, 700       |
| `roboto/`                 | `roboto-latin-wght-normal.woff2`, `roboto-latin-ext-wght-normal.woff2`                                                                                                 | wght 100–900   |
| `roboto-condensed/`       | `roboto-condensed-latin-wght-normal.woff2`, `roboto-condensed-latin-ext-wght-normal.woff2`                                                                             | wght 100–900   |
| `signika/`                | `signika-latin-wght-normal.woff2`, `signika-latin-ext-wght-normal.woff2`                                                                                               | wght 300–700   |

About 614 KB in the repository; a direction fetches only the faces its text uses (the latin file
of each, 23–51 KB). Need another weight or style? Fetch it from the same package version, add it
unmodified with a `PROVENANCE.json` row, and list it here.

`@font-face` snippet for a `direction.css` (URLs are relative to `directions/<id>/`; keep the
system stack as fallback):

```css
@font-face {
  font-family: "Alegreya";
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
  src: url("../../assets/fonts/alegreya/alegreya-latin-wght-normal.woff2") format("woff2");
  unicode-range:
    U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
    U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: "Alegreya";
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
  src: url("../../assets/fonts/alegreya/alegreya-latin-ext-wght-normal.woff2") format("woff2");
  unicode-range:
    U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329,
    U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F,
    U+A720-A7FF;
}
:root[data-direction="bg3"] {
  --font-display:
    "Alegreya", "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
}
```

Static faces (Alegreya SC, Alegreya Sans) declare one `@font-face` per weight
(`font-weight: 400` / `700`) and file. Today's stacks already name `Roboto` (`--font-ui`) and
`Roboto Condensed` (`--font-label`) as installed fonts: a direction that declares a web font with
that family name replaces the installed one while it is active. The legible-font preference
(Verdana, `!important`) still wins over any direction font, by design.
