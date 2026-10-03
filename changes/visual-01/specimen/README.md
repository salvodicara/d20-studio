# Component specimen · «Campionario dei componenti» (Phase C, visual-01)

A dev-only page that shows every shared component of the blueprint, with the app's real markup
and stylesheets, skinned by any round-1 direction through the app's own loader. It serves
owner rules I-250 (one coherent system, «no padding, margin, button or font left unattended»)
and I-248 (numbered choices shown with screenshots): one page per direction puts every button,
field, tab and Table piece side by side.

| File                                            | Role                                                        |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `design/blueprint/directions/specimen.html`     | the page: root attributes, the 11 static links, the script  |
| `design/blueprint/directions/specimen.mjs`      | stylesheets, direction, markup of every cell, checks        |
| `design/blueprint/directions/specimen.css`      | layout of the page only, every rule under `.specimen-page`  |
| `changes/visual-01/specimen/shoot-specimen.mjs` | full-page captures at 1440 and 390, with checks             |
| `changes/visual-01/specimen/crop-specimen.mjs`  | section crops for the board (`spec-brand-…`, `spec-type-…`) |
| `changes/visual-01/specimen/check-brand.mjs`    | browser check of the loader's brand hook (I-251)            |

Nothing in the app links or imports these files; `index.html` never loads `specimen.css`.

## Opening it

Serve the worktree (`python3 changes/visual-01/serve.py`, port 8881) and open

```
http://127.0.0.1:8881/directions/specimen.html?direction=bg3
```

`?direction=` takes what the app's selector takes: `off` (no key: the plain app), `current`
(«Attuale», direction mode) or an id (`bg3 ddb foundry owlbear solasta roll20 owlcat alchemy
demiplane`). The page calls `startDirection()` from `directions/index.mjs`, so the value is
written to the same localStorage key `d20-dev-direction` as the app's selector: opening the
specimen with `?direction=bg3` also turns bg3 on for the app in that browser, and vice versa.
Like the loader, the page only works on `127.0.0.1`, `localhost` and `[::1]`; anywhere else it
shows one line and loads nothing else.

**Round 2 variants** (directions/README.md «Variants»): add `&variant=<list>`, e.g.
`specimen.html?direction=bg3&variant=c2,t3` (colours 2 + fonts 3; one per axis `c t b i`, the
last wins; `&variant=off` removes them). The list goes to the same key as the app's,
`d20-dev-variant`; the masthead then reads «Direzione: 1 · Baldur's Gate 3 · varianti c2 + t3»
and `specimenReport.variant` is `"c2 t3"`. With no variant the page is unchanged.

## What makes it faithful

**Stylesheets, in the app's order.** `specimen.html` carries the eleven static links of
`index.html` (same files, same order); a `<base href="../">` makes every relative URL resolve
from the app root, so the hrefs are identical and the loader's own document-relative paths
(`directions/<id>/direction.css`, `assets/maps/sample/old-watch.webp`, the sprite's portraits)
work unchanged. `specimen.mjs` then appends the 48 sheets that `registry.injectStyles`
(registry.mjs:1032-1041) appends at runtime, with the same element, absolute href and
`data-extension`, in registration order, and awaits them. Only then `startDirection()` runs,
which appends `dev.css`, `sample.css` and the direction sheet last, as `app.mjs:69-80` does. The
specimen's own `specimen.css` is linked first, before the app's sheets, so their relative order
is untouched and the direction sheet stays the last link in `<head>`.

The 48 are written out (`RUNTIME_STYLES`) rather than produced by importing the registry and the
area modules: `loadExtensions` would run every area's `register()`, which wires network and
install listeners and registers the service worker. Two checks catch drift instead:

- in the page, `checkSheets()` compares the static links with a fresh `index.html` and lists
  any app or direction sheet that did not load (no `sheet` or no rules); the result is in the
  masthead (red when something is wrong) and in `window.specimenReport`;
- the capture script loads a running app page first and fails the run (exit code 2) when the
  specimen's list of app sheets differs from the app's, file by file and in order.

**Root attributes.** `<html>` carries the attributes `preferences.mjs:119-147` sets on a default
page (code-map §b): `lang="it" data-pref-theme="dark" data-pref-font="standard"
data-pref-contrast="standard" data-pref-vision="standard" data-pref-names="outline"
data-pref-units="metric" data-pref-canvas="on"` and the three `--pref-*` scales at 1. The
loader adds `data-direction` and `data-sample-map` exactly as in the app.

**Markup.** Each fragment is the HTML its module renders, taken from the running app on 8881
(01/10/2026, the example after «Ripristina esempio», Player unless noted) and cited in the cell
caption and in the code (`file:line`). Icons and the logo are produced by `ui.mjs`'s own `icon()`
and `logo()` after the direction is applied, so a direction's `icons.mjs` and `brand.mjs` replace
them as in the app. Before the loader runs, the page copies `index.html`'s `<link rel="icon">`
into its head (the only head element it adds besides the sheets), so a direction's `favicon`
replaces it as in the app and the «Marchio» section shows whichever icon is in place. Inline styles that `table.mjs fitHud` adds after a render (`margin-top`, `top`,
`bottom`) are left out; the module renders none. Cells marked «composto» show a state the
example does not reach, written from the module's own template (the conditions chips, the token
and party statuses, the turn order mid-round, the later-turn hotbar, a few button variants).

**Context.** Directions scope their rules by surface (`.home-page`, `.character-sheet`,
`.table-layout`, child combinators such as `.table-layout > .initiative`, and `:has()` hooks such
as the sample art of the hotbar portrait). Every component therefore sits inside the ancestors it
has in the app (read from the running app), drawn as `display: contents` boxes: every selector
matches as in the app, while the specimen lays the cells out. The app itself wraps its extension
slots the same way. `<main id="content">` is a plain `<div>` here (no rule styles a component
through it; the id would wake page-level `:has()` rules). Exceptions, where the app's container
queries must measure a real box:

- `.table-inspector` is always a real box (a `table-panel` container, 340 px in the app, as in
  its cells); the sidebar cell lays panel and rail out as `.table-layout` does (a 340 px and a
  56 px column), with the height of the panel's content;
- `.character-sheet` and `.character-layout` are real boxes in the full-width sheet cells (about
  1340 px at 1440, like the app's 1344 px sheet, so `@container character-sheet (min-width:
900px)` rules of bg3, ddb and foundry match) and, on a phone, the whole sheet chain is (the
  phone sheet is laid out by `characters.css:888-1020` and `sheet-plus.css:1334` from its own
  width). In narrower desktop cells they draw nothing: no container, so the narrow-sheet queries
  match nothing, as on the app's desktop sheet;
- on a phone `.table-sidebar-panel` becomes a box (the app's bottom sheet, with its handle), and
  the party column moves from beside the hotbar to the map cell, where the app floats it.

Components sit on the app's page background (`:root` and `body`, plus any direction rule on
them). The specimen sets no inherited property on its own container, and its labels use their
own system face, so it never restyles a component.

## What it covers

| Section (on the page)      | Cells                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marchio                    | `header.app-header .brand` at 1× and 2× (CSS zoom) and the Table's at 1× (desktop); `logo()` alone at 16, 24, 32, 48, 96 and 160 px on the page background and on a light tile, in the `.app-header .brand` context; the `<link rel="icon">` at 16 px in a dark and a light browser tab and at 32 px; the lockup (mark and wordmark) at 3× (2× on a phone, mark only: the app hides the wordmark at ≤ 420 px)                                                                                                                                   |
| Tipografia                 | `.page-heading h1 + p` with its toolbar, `.section-heading h2`, `h3`, `p`, `p.muted`, `small`, `small.error`, `kbd`, `.stats > .stat` (small-caps label and numbers)                                                                                                                                                                                                                                                                                                                                                                            |
| Intestazione e navigazione | `header.app-header` (brand, `.nav-link.active`, `.service-nav .icon-button`, count badge) and `header.app-header.table-header`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Pulsanti                   | `.button`, `.primary`, `.quiet`, `.danger`, `.active`, `:disabled`, `.primary:disabled`, without and with an icon, in four surfaces (everywhere, Inizio, Scheda, Tavolo panel); `.icon-button`, `.icon-button.has-ext-count`, dialog close, `.text-button` with and without icon                                                                                                                                                                                                                                                                |
| Campi dei moduli           | `.field` text, empty with placeholder, `select`, `textarea`, search, number; `.check-field` checkbox on and off; `.account-choice` radio; the offline switch (`.offline-switch`, in its sheet panel); the core `.switch` off, on, disabled; a field with hint; a field with error (`aria-invalid` + `small.error`)                                                                                                                                                                                                                              |
| Schede (linguette)         | `nav.tabs` (campaign sections), `.character-tabs-bar nav.tabs.character-tabs`, `.table-subtabs > .table-subtab` pills                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Etichette                  | `.badge`, `.badge.home-badge-new`, `.badge.clib-privacy`, `.badge.shp-econ-{action,bonus,reaction,other}`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Pannelli e schede          | `section.panel`, sheet panel with `.section-heading` and `p.empty-state`, `section.home-card`, `button.character-resume`, `li.party-card`, `li.shp-action`                                                                                                                                                                                                                                                                                                                                                                                      |
| Riquadri numerici          | the whole `.character-band` (`.shp-ability-box` ×6, `.shp-pill`, `.stats.character-vitals .stat`, `.character-inspiration`, `.character-hp` with the compact `.dt-hp`), and plain `.stats > .stat`                                                                                                                                                                                                                                                                                                                                              |
| Tabella                    | `.table-wrap > table` with `thead th`, `tbody th[scope=row]`, `td` and source links                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Stato vuoto                | `.empty-state` with `h1` and a button, with `h2` and `p`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Finestre di dialogo        | `dialog` (heading, body, footer) and `dialog .dialog-menu`, open inline                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Avvisi e suggerimenti      | `#toast.shown`, `#toast.shown.error`, `.ui-tip` beside its trigger                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Tavolo                     | `.table-topline`; `.initiative` (already acted, current, ally, hostile); the hotbar with the party column, at the start of the turn (actions page) and later (Action spent, slots used, low and temporary HP, quick-bar page with `.qb-slot`s), End turn; the map with tokens (selected with HP bar, allies, hostile, conditions badge, dead); map tools and zoom; the Creature panel with sub-tabs, `.inspector-person`, `.inspector-ac`, conditions chips and Exhaustion segments, and the rail with the portrait tab; the HP widget `.dt-hp` |

Sample art appears where the app paints it under a direction: Livia's home card, the turn order,
the party column, the hotbar portrait, the inspector and rail portraits, the map tokens and the
old-watch scene (`directions/sample.css` and the loader's sprite; ids `livia`, `doran`, `mira`,
`goblin-1`, `goblin-2`).

## Capturing

```
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/specimen/shoot-specimen.mjs \
  --out ~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/specimen \
  --directions off,current,bg3,owlbear
```

(GNU `timeout` is not installed; `perl … alarm` bounds each command. About 2–3 s per shot with 3
jobs; split long direction lists over several commands.)

| Option         | Default                  | Meaning                                               |
| -------------- | ------------------------ | ----------------------------------------------------- |
| `--out`        | (required)               | output folder                                         |
| `--base`       | `http://127.0.0.1:8881/` | app URL; the page is `<base>directions/specimen.html` |
| `--directions` | `off`                    | `off`, `current` or direction ids, comma separated    |
| `--variants`   | none                     | round 2: one combination (`c2,t3`), one direction id  |
| `--widths`     | `1440,390`               | 1440 (desktop, 900 high) and/or 390 (phone, touch)    |
| `--dpr`        | `1`                      | device pixel ratio of every shot                      |
| `--jobs`       | `3`                      | shots in parallel                                     |

Chromium from the worktree's Playwright 1.63, dark colour scheme, Italian, service workers
blocked, a fresh context per shot. Files: `specimen-<direction>.png` (1440, full page) and
`specimen-<direction>-390.png`, plus `manifest.json` (one row per file: height, checks, sheet
counts, console noise). A shot that fails a check goes to `_failed/`. With `--variants c2,t3`
(one combination per run, exactly one direction id) the names gain `+<list with dots>`:
`specimen-bg3+c2.t3.png`, `specimen-bg3+c2.t3-390.png`, and the row carries `"variant"`.

Checks per shot: the page reports ready; `data-direction` is the requested id (none for `off`
and `current`); the key is removed for `off` and set otherwise; the direction sheet is linked;
every app and direction sheet loaded; with `--variants`, `data-variant` and the key equal the
requested list (a variant with no file fails); the static links match `index.html`; the app-sheet list
equals the running app's; no page error, console error or failed request; no sideways page
scroll. Known noise is recorded, not failed: the loader's 404 for a direction without
`icons.mjs` or `brand.mjs`, and an aborted request for `old-watch.webp` (the loader's HEAD probe);
with variants, the HEAD probes of `variants/<name>.css` and `.icons.mjs` (aborted when the file
exists, 404 when it does not).

Exit code: 0 every shot ok, 1 a shot failed, 2 the stylesheet list drifted from the app.

### Section crops for the board

```
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/specimen/crop-specimen.mjs \
  --specimen-out <dir> --shots-out <dir> --directions off,current,bg3 [--crops brand]
```

Loads the specimen at 1440 (dark, dpr 1) per direction, writes the full page and
`sections.json` (page boxes of every section) to `--specimen-out`, and crops sections by their
title, with a 16 px margin, into `--shots-out`: `spec-brand-dark-1440-<dir>.png` («Marchio»),
`spec-type-…` («Tipografia»), `spec-buttons-…` («Pulsanti»), `spec-fields-…` («Campi dei
moduli») and `spec-dialogs-…` («Finestre di dialogo» with «Avvisi e suggerimenti»). `--crops`
picks some (`brand,type,buttons,fields,dialogs`). `--variants c2,t3` (one direction id) loads
`?direction=<id>&variant=c2,t3` and names the files `specimen-bg3+c2.t3.png` and
`spec-buttons-dark-1440-bg3+c2.t3.png`; `sections.json` keeps one entry per direction and list.
When the variant did not apply (no file) it writes no image and fails. It refuses to write inside
the worktree. The
board's `…/visual-01/board/specimen/crop-specimen.mjs` is a shim that runs this file with the
board's folders as defaults.

### The brand hook

```
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/specimen/check-brand.mjs \
  --out <dir> [--before http://127.0.0.1:8886/] [--direction bg3] [--plain bg3]
```

Serves a test `brand.mjs` for `--direction` through Playwright (`page.route`; nothing is written
in a direction folder) and checks, in the app and in the specimen: the header mark and the tab
icon are the direction's; under the light theme both step aside and come back in dark; back to
«Attuale» the favicon href is restored byte for byte and `#app` is as before the switch; then
`off` equals a page with no key; a direction without `brand.mjs` (`--plain`) keeps today's mark
and icon with only the known 404; the «Marchio» section shows 16 marks with 16 distinct gradient
ids and the direction's favicon. With `--before` (the app before the hook, for example
`git archive HEAD design/blueprint` served on another port) it also compares `#home` and
`#table` with no key: `#app`, the whole `<html>` and the favicon href (origin and blob ids
normalised). Output: `check-brand.json`, a header and a «Marchio» screenshot; exit 1 on a failure.

## Validation, 01/10/2026

`off`, `current`, `bg3` and `owlbear` at 1440 and 390, into
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/specimen/` (exit 0, 8 of 8 ok;
59 app sheets in each, plus `dev.css`, `sample.css` and the direction sheet). Read against the
round-1 shots in `…/visual-01/round1/<id>/`: under bg3 the hex buttons, Alegreya type, framed
sheet band, turn-order cards with the «done» shading, hotbar, End turn medallion, party and
inspector portraits and the painted map match `table-combat-dark-1440-bg3.png` and
`sheet-dark-1440-bg3.png`; under owlbear the lavender accent, uppercase commands, the turn-order
list, pill End turn and circular tokens match `table-combat-dark-1440-owlbear.png`. A computed
style comparison (app page vs specimen, same direction: bg3 for the sheet band, ability box,
pill, HP box and tabs; bg3 and owlbear for the hotbar, party portrait, inspector, rail tab, map
tools and token) showed no difference other than widths that follow the cell or the state. A negative test (one sheet blocked, `index.html` altered) turned
the masthead red with both problems listed.

**«Marchio» (brand hook, 01/10/2026).** `check-brand.mjs --before` against the tag's blueprint
(`git archive HEAD`, port 8886): 26 of 26 checks, in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/brand/hook/`. `shoot-specimen.mjs`
for `off`, `current` and `bg3` at 1440 and 390 (6 of 6 ok, no sideways scroll; bg3 logs the
known 404 for its absent `brand.mjs`), in `…/brand/specimen-full/`; the crops
`spec-brand-dark-1440-{off,current,bg3}.png` in `…/brand/shots/` (`off` and `current` are
pixel-identical).

## Not reproduced, or not exactly

- **Dialogs** open inline (`open`, non-modal): no `::backdrop` scrim, and the dialog sits in its
  cell instead of the window's centre.
- **Surface backgrounds** painted on ancestors (the Inizio and sheet page backgrounds a
  direction draws on `#app:has(…)` or on `.character-sheet`, the map's canvas) are not painted:
  components stand on the page background, by design. The Table sidebar panel is the exception
  (a real box in its cell).
- **User art from the media area** (`body > style.media-paint`, blob URLs from IndexedDB) is not
  reproduced: under `off` and `current` tokens and portraits show initials where the app, after a
  reset, shows Doran's and the goblins' uploaded art.
- **Map layers of other areas** (health chips «Illeso», elevation «+3 m», hazards, doors, walls,
  regions, the scale caption `.map-caption`) are not in the map cell: only the core scene base,
  grid and tokens. The scene art spills into the map's HUD margins (the app clips it at the
  window).
- **JS-driven states**: `fitHud` positions, the phone tab strip scrolled to the open tab
  (`scrollIntoStrip`), hover, focus and pressed states are not shown; the page is static.
- **Duplicate ids** (`dialog`, `toast`, hotbar tabs) appear in more than one cell, because the
  directions select some of them by id.
- **The core `.switch`** (styles.css:544) has no markup in the app today; its cell is composed.
- Dark theme, standard contrast and 100 % scales only; Italian only.
