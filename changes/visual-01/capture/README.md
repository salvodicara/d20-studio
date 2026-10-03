# Capture kit — Phase C (visual-01)

`shoot.js` screenshots the **real** blueprint app in named states so that every visual option
(I-248) can be shown next to today's look and next to the product it copies. It is a plain Node
script using the worktree's Playwright library (`@playwright/test` 1.63.0, `node_modules` at the
worktree root; Chromium and WebKit installed with `npx playwright install`). One invocation
captures a whole matrix in parallel; the 26-file "before" matrix takes about 20 s.

## Commands

From the worktree root (`~/Workspace/Codex/d20-studio-visual-01`), with the no-cache server running
(`python3 changes/visual-01/serve.py` → <http://127.0.0.1:8881/>). Wrap every run in the 150 s alarm
(GNU `timeout` is not installed):

```sh
# The "before" matrix of today's look (both themes, desktop and phone, plus the full sheet)
B=~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/before
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/capture/shoot.js --out $B \
  --states home,sheet,sheet-full,table-combat,campaign,library --themes dark,light --widths 1440,390 --jobs 4
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/capture/shoot.js --out $B \
  --combo table-combat-dm:dark:1440 --combo table-combat-dm:dark:390 --contact

# Round 1 «Scelta 1 — Direzione» (I-248): every option in direction mode, «Attuale» included.
# Core states at 1440 and at 390, then the extended set; the four runs merge into one folder
# (150 shots and 10 contact sheets; on 30/09 they took 114 s for both core widths in one run,
# 54 s and 73 s for the extended ones, so the core is split to stay well inside the alarm).
O=<dir>
D=current,bg3,ddb,foundry,owlbear,solasta,roll20,owlcat,alchemy,demiplane
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/capture/shoot.js --out $O \
  --states home,sheet,table-combat,table-combat-dm --widths 1440 --directions $D --jobs 4
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/capture/shoot.js --out $O \
  --states home,sheet,table-combat,table-combat-dm --widths 390 --directions $D --jobs 4
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/capture/shoot.js --out $O \
  --states table-explore,sheet-spells --widths 1440,390 --directions $D --jobs 4
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/capture/shoot.js --out $O \
  --states sheet-inventory,dialog-initiative,token-menu --widths 1440 --directions $D --jobs 4 \
  --contact

# Kit check of the new states (30/09): both widths, «Attuale» and bg3 (20 shots, about 30 s)
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/capture/shoot.js \
  --out ~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/kit-check \
  --states table-explore,sheet-spells,sheet-inventory,dialog-initiative,token-menu \
  --widths 1440,390 --directions current,bg3 --jobs 4

# Round 2 (02/10/2026): one combination of numbered options inside the BG3 direction per run
# (directions/README.md «Variants»): colours 2 + fonts 3 → home-dark-1440-bg3+c2.t3.png, …
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/capture/shoot.js \
  --out ~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/round-2 \
  --states home,sheet,table-combat --widths 1440,390 --directions bg3 --variants c2,t3 --jobs 4

# Known states, full help
node changes/visual-01/capture/shoot.js --list
node changes/visual-01/capture/shoot.js --help
```

Runs into the same folder merge into its `manifest.json`; `--contact` (or `--contact-only`) builds
the contact sheets from every successful viewport shot listed there.

## Parameters

| Option                | Default                                    | Meaning                                                                                                                                        |
| --------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--out <dir>`         | required                                   | Output folder. Evidence of our app goes under `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/`.                                |
| `--base <url>`        | `http://127.0.0.1:8881/`                   | App URL. Port 8879 (frozen interview-01 copy) is refused.                                                                                      |
| `--states <list>`     | `home,sheet,table-combat,campaign,library` | States (below). Suffix `-dm` visits as DM (`dialog-initiative` always does), `-full` captures the full page (e.g. `sheet-full`).               |
| `--themes <list>`     | `dark`                                     | `dark`, `light`: the app's own device preference (see below).                                                                                  |
| `--widths <list>`     | `1440,390`                                 | `1440` → 1440×900, `390` → 390×844, or any `WxH`. Below 768 px: touch phone (`isMobile`, `hasTouch`).                                          |
| `--directions <list>` | `off`                                      | `off` removes `d20-dev-direction` (the plain app); `current` («Attuale») or an id (`[a-z0-9-]`) is written there before load (direction mode). |
| `--variants <list>`   | none                                       | Round 2: one combination (`c2,t3`) inside the run's one direction id; one per axis `c t b i`, the last wins (below).                           |
| `--combo <s:t:w[:d]>` | —                                          | Explicit combos, repeatable (`table-combat-dm:dark:390:bg3`; `d` defaults to `off`); replaces the cartesian product.                           |
| `--now <iso\|real>`   | `2026-09-30T19:00:00+02:00`                | Fixed `Date` for the page (Playwright `clock.setFixedTime`; timers keep running). `real` = live clock.                                         |
| `--dpr <n>`           | 1 desktop, 2 phone                         | Device pixel ratio. Phone shots are 780×1688 px at the default.                                                                                |
| `--reduced-motion`    | off                                        | Emulates `prefers-reduced-motion`. Off by default: the owner's view, with animations settled instead.                                          |
| `--browser <name>`    | `chromium`                                 | `chromium` or `webkit` (both checked on 30/09).                                                                                                |
| `--jobs <n>`          | `3`                                        | Groups captured in parallel (each in its own browser context).                                                                                 |
| `--contact`           | off                                        | Writes `contact-<theme>-<direction>.png` (`magick montage`, labels = file names, full pages excluded).                                         |
| `--contact-only`      | off                                        | Rebuilds the contact sheets only.                                                                                                              |

File names: `<state>-<theme>-<width>-<direction>.png`, e.g. `home-dark-1440-current.png`,
`table-combat-dark-390-bg3.png`, `sheet-dark-1440-off.png`. Each shot is the viewport only unless
the state ends in `-full`. A shot whose checks fail is written to `<out>/_failed/` instead, and the
exit code is 1. (The `before/` matrix of 30/09 predates this naming: its files carry no suffix and
were taken with no key, i.e. `off`.) With `--variants c2,t3` the direction gains
`+<list with dots>`: `home-dark-1440-bg3+c2.t3.png`; the manifest row carries `"variant": "c2,t3"`
and a re-run replaces only the row of the same state, theme, width, direction and list.

### Directions (the dev-only «Direzione» selector)

- **`off`**: no `d20-dev-direction` key. The plain app, byte-identical to the app before the
  selector existed: no «Direzione» control, no `data-direction`.
- **`current`**: key `current`. Direction mode with «Attuale»: today's look plus the «Direzione»
  control in the demo strip, so the strip has the same height as in every numbered option (96 px
  at 390, 43 px at 1440).
- **an id** (`bg3`, `ddb`, `foundry`, `owlbear`, `solasta`, `roll20`, `owlcat`, `alchemy`,
  `demiplane`; the last five are empty skeletons on 30/09): that direction's `direction.css`, the shared
  sample art (`directions/sample.css`) and, when present, the sample map. An id the app does not
  know shows «Attuale».
- Take every numbered I-248 screenshot with `current` and the ids, never `off`, so the options
  differ only by the direction.

### Variants (round 2, numbered options inside a direction)

- `--variants c2,t3` writes `d20-dev-variant` = `c2,t3` before every load; the loader links
  `directions/<id>/variants/c2.css` and `t3.css` after the direction sheet and sets
  `data-variant="c2 t3"` on `<html>`. Option 1 of an axis is the direction itself: shoot it
  without `--variants` (`home-dark-1440-bg3.png`).
- The check is strict: the shot fails (`_failed/`) unless the key and `data-variant` equal the
  requested list, so a variant with no file under `directions/<id>/variants/` cannot pass as the
  plain direction.
- One combination per run, so a matrix of combinations is a loop of runs into the same folder.
- Without `--variants` the kit is unchanged: on 02/10/2026 all 20 shots (home, sheet, Table in
  combat, campaign, library; 1440 and 390; `bg3` and `off`) of the new kit and loader were
  byte-identical to the old ones, with the same `#app` DOM, `<html>` attributes and `<head>`
  links (17 against the first old run; the other 3 against a second old run, because the first
  one had differed from itself there by anti-aliased pixels). Evidence:
  `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/variants-scaffold/`.
- A bad name, `off`/`current` or several directions are refused. Contact sheets of a variant
  run are `contact-<theme>-<direction>+<list with dots>.png`.
- The live guarantees take the same list (`--variant`, applied to every direction id, not to
  «Attuale»): `guarantees.js --directions current,bg3 --variant c2,t3` prints `ok bg3+c2.t3`.
  Its static check covers every `directions/<id>/variants/*.css` with the variant prefix.

## How each state is reached

Every group (state, role, theme, width, direction) runs in a **fresh browser context**: empty
storage, so the app seeds its own example. No fixture is injected.

1. **Before load** (init script): the theme is written to the app's own device setting
   `d20-studio-setting:preferences-look.theme` (`"dark"`/`"light"`, what Preferences → Aspetto →
   Tema stores); `d20-dev-direction` is set or removed. These are the only storage writes.
2. **Reset**: `#home`, then the demo strip's «Ripristina esempio», confirmed with «Ripristina».
3. **Combat** (`table-combat`, `token-menu`), at 1440×900: `#table`, «Visita come» → DM, the
   scene header's «Avvia combattimento» (`[data-table="combat"]`), typed d20s in the start dialog
   (Livia 18, Sentinella 15, Doran 12, Esploratore 10, Mira 8: the example's own turn order with
   Livia first), «Inizia combattimento». Combat on `old-watch`, round 1, Livia's turn.
4. **Final load**: the target viewport, then a full document load of the state's route (so role,
   language and open panels start clean; Italian is the app's default and is not stored). For
   `-dm` states and `dialog-initiative` «Visita come» → DM.
5. **State step**, at the target viewport:
   - player's Table in combat (`table-combat`, `token-menu`): the «Tocca a te, Livia!» banner is
     acknowledged with its own «Ho capito» (it covers the map otherwise);
   - `token-menu`: then the token's own gesture on Livia — right-click at 1440; on a phone a
     long-press (finger held until the menu shows, past the app's 520 ms timer);
   - `dialog-initiative`: «Avvia combattimento» and the same typed d20s as step 3, **not**
     submitted; the dialog is then scrolled back to its top (typing scrolled each row into view);
   - `sheet-spells`, `sheet-inventory`: the category's own tab in the sheet strip («Magie»,
     «Inventario», the same `#characters?id=livia&tab=…` route the app sets), then the page is
     scrolled as a reader does: down to the tab strip (it sticks at the top), and further only
     until the category's first row is wholly in view (at 1440 the strip sits at the top; on the
     phone the strip stays stuck above the first row).
6. **Settle**: network idle, fonts and images loaded (also the sample art in the direction
   sprite), focus and hover from the kit's own clicks removed (`token-menu` keeps the focus the
   app put in the menu: focus leaving the menu closes it), transient notices gone (core toast,
   pop-up notices, the phone map snackbar), then screenshots with Playwright
   `animations: "disabled"` until two consecutive frames are identical.
7. **Checks** (game state is read, never written): Italian, the requested theme, role and
   direction key, no open dialog (`dialog-initiative`: a dialog is open), the direction actually
   applied (`off`: no «Direzione» control and no `data-direction`; otherwise the control shows
   the requested option and `<html>` carries its `data-direction`, none for «Attuale»), plus per
   state —

| State               | Route                  | Role   | Check                                                                                                                                                                                             |
| ------------------- | ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home`              | `#home`                | Player | h1 «La prossima avventura»                                                                                                                                                                        |
| `sheet`             | `#characters?id=livia` | Player | h1 «Livia», open sheet tab «Azioni»                                                                                                                                                               |
| `sheet-spells`      | `#characters?id=livia` | Player | h1 «Livia», open tab «Magie» (`aria-current="page"`) on screen, the first spell row (`.spl-list .spl-row`) wholly in view below it                                                                |
| `sheet-inventory`   | `#characters?id=livia` | Player | h1 «Livia», open tab «Inventario» on screen, the first item row (`[data-invp-row]`) wholly in view below it                                                                                       |
| `campaign`          | `#campaign`            | Player | h1 «Panoramica»                                                                                                                                                                                   |
| `library`           | `#library`             | Player | h1 «Biblioteca» (tab Disponibili)                                                                                                                                                                 |
| `table-explore`     | `#table`               | Player | no combat, active scene `old-watch`, map visible, Livia's token selected, hotbar visible and showing Livia, «Esplorazione libera» line                                                            |
| `table-combat`      | `#table`               | Player | combat active on `old-watch`, current turn `livia`, map visible, «Round 1» line                                                                                                                   |
| `token-menu`        | `#table`               | Player | the `table-combat` checks, plus the token menu open and titled «Livia», Livia's token on screen; at 1440 the menu beside the token (either side), on a phone the app's sheet docked at the bottom |
| `dialog-initiative` | `#table`               | DM     | dialog open and titled «Avvia combattimento», the five typed d20s in their fields, Livia's row in view, combat not started, active scene `old-watch`, the Table under the dialog                  |

Routes are the app's own hash routes, the same its navigation sets. To add a state, add an entry
to `BASES` in `shoot.js` with `route`, `check` and, if needed, `combat: true`, `prepare`,
`role: "dm"` (a DM-only state), `dialog: true` (an open dialog is the point) or `keepFocus: true`
(the settle step must not blur the app's focus).

## Known limits (30/09/2026)

- **Deterministic, not byte-perfect.** A second run of the whole matrix was byte-identical for
  19 of 22 files; the other three differed by 49–58 anti-aliased pixels on rounded borders (the
  demo `<select>`, a badge, avatar circles). Compare runs with a small tolerance
  (`magick compare -metric AE`).
- **DM Table**: the chip «Sessione non avviata… Avvia ora / Non ora» is part of the DM's state and
  is captured as it is. It sits under the turn portraits at 1440 and is covered by them at 390:
  that overlap is a defect of today's look, not of the kit.
- **Phone Table**: on load the app itself scrolls the Table under the demo strip and header
  (`scrollY` 143 at 390×844), so phone Table shots start at the scene title.
- **Player Table**: the turn banner is acknowledged, so it isn't in the shot. The time-dependent
  countdown on Inizio («tra 1 giorno e 1 ora») follows `--now`.
- **Token menu on a phone**: the long-press is sent as Chromium touch events (CDP), so
  `token-menu` below 768 px needs `--browser chromium`; in WebKit it fails with «CDP session is
  only available in Chromium» (1440 works in both). At 390 the app's menu sheet is tall enough to
  cover the whole map, Livia's token included: that is today's look, not the kit.
- **Initiative dialog**: opening it as DM also opens the players' roll call (the dialog says so
  above the list); the d20s are typed, so nothing is rolled. At 1440 the list shows Livia to
  Doran, on a phone Livia only; Mira's typed 8 is checked but below the fold.
- **Second run (30/09, new states)**: 16 of the 20 kit-check files were byte-identical; the
  open-menu and open-dialog shots at 1440 differed by 20–77 anti-aliased pixels.
- **Directions**: a direction without `directions/<id>/icons.mjs` (today the five skeletons
  `solasta`, `roll20`, `owlcat`, `alchemy`, `demiplane`) makes the browser log one 404 per page
  load (two per shot; the loader's import is caught); the manifest row lists them under `errors`,
  and the shot is still ok. With `--variants`, each listed variant that lacks its `.css` or its
  `.icons.mjs` adds one 404 per load (the loader's HEAD probe), listed the same way.
- Italian only, Player or DM only; no English or signed-out states. Native `<select>` controls
  look different in Chromium and WebKit.
- `manifest.json` top-level fields (base, browser, `capturedAt`) describe the latest invocation;
  each shot row keeps its own route, role, checks and errors.
- `playwright-cli --raw run-code` was not used: a Node script takes parameters, runs contexts in
  parallel and needs no named session to close. Use `playwright-cli` for exploration if needed.
