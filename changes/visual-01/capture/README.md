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

# Round 1 «Scelta 1 — Direzione» (I-248): every option in direction mode, «Attuale» included
perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/capture/shoot.js --out <dir> \
  --states home,sheet,table-combat --themes dark --widths 1440,390 \
  --directions current,bg3,ddb,foundry,owlbear --contact

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
| `--states <list>`     | `home,sheet,table-combat,campaign,library` | States (below). Suffix `-dm` visits as DM, `-full` captures the full page (e.g. `sheet-full`, `campaign-dm-full`).                             |
| `--themes <list>`     | `dark`                                     | `dark`, `light`: the app's own device preference (see below).                                                                                  |
| `--widths <list>`     | `1440,390`                                 | `1440` → 1440×900, `390` → 390×844, or any `WxH`. Below 768 px: touch phone (`isMobile`, `hasTouch`).                                          |
| `--directions <list>` | `off`                                      | `off` removes `d20-dev-direction` (the plain app); `current` («Attuale») or an id (`[a-z0-9-]`) is written there before load (direction mode). |
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
were taken with no key, i.e. `off`.)

### Directions (the dev-only «Direzione» selector)

- **`off`**: no `d20-dev-direction` key. The plain app, byte-identical to the app before the
  selector existed: no «Direzione» control, no `data-direction`.
- **`current`**: key `current`. Direction mode with «Attuale»: today's look plus the «Direzione»
  control in the demo strip, so the strip has the same height as in every numbered option (96 px
  at 390, 43 px at 1440).
- **an id** (`bg3`, `ddb`, `foundry`, `owlbear`): that direction's `direction.css`, the shared
  sample art (`directions/sample.css`) and, when present, the sample map. An id the app does not
  know shows «Attuale».
- Take every numbered I-248 screenshot with `current` and the ids, never `off`, so the options
  differ only by the direction.

## How each state is reached

Every group (state, role, theme, width, direction) runs in a **fresh browser context**: empty
storage, so the app seeds its own example. No fixture is injected.

1. **Before load** (init script): the theme is written to the app's own device setting
   `d20-studio-setting:preferences-look.theme` (`"dark"`/`"light"`, what Preferences → Aspetto →
   Tema stores); `d20-dev-direction` is set or removed. These are the only storage writes.
2. **Reset**: `#home`, then the demo strip's «Ripristina esempio», confirmed with «Ripristina».
3. **Combat** (Table states only), at 1440×900: `#table`, «Visita come» → DM, the scene header's
   «Avvia combattimento» (`[data-table="combat"]`), typed d20s in the start dialog (Livia 18,
   Sentinella 15, Doran 12, Esploratore 10, Mira 8: the example's own turn order with Livia
   first), «Inizia combattimento». Combat on `old-watch`, round 1, Livia's turn.
4. **Final load**: the target viewport, then a full document load of the state's route (so role,
   language and open panels start clean; Italian is the app's default and is not stored). For
   `-dm` states «Visita come» → DM.
5. **State step**: on the player's Table the «Tocca a te, Livia!» banner is acknowledged with its
   own «Ho capito» (it covers the map otherwise).
6. **Settle**: network idle, fonts and images loaded (also the sample art in the direction
   sprite), focus and hover from the kit's own clicks
   removed, transient notices gone (core toast, pop-up notices, the phone map snackbar), then
   screenshots with Playwright `animations: "disabled"` until two consecutive frames are identical.
7. **Checks** (game state is read, never written): Italian, the requested theme, role and
   direction key, no open dialog, the direction actually applied (`off`: no «Direzione» control
   and no `data-direction`; otherwise the control shows the requested option and `<html>` carries
   its `data-direction`, none for «Attuale»), plus per state —

| State          | Route                  | Check                                                                           |
| -------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `home`         | `#home`                | h1 «La prossima avventura»                                                      |
| `sheet`        | `#characters?id=livia` | h1 «Livia», open sheet tab «Azioni»                                             |
| `campaign`     | `#campaign`            | h1 «Panoramica»                                                                 |
| `library`      | `#library`             | h1 «Biblioteca» (tab Disponibili)                                               |
| `table-combat` | `#table`               | combat active on `old-watch`, current turn `livia`, map visible, «Round 1» line |

Routes are the app's own hash routes, the same its navigation sets. To add a state, add an entry
to `BASES` in `shoot.js` with `route`, `check` and, if needed, `combat: true` or `prepare`.

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
- **Directions**: a direction without `directions/<id>/icons.mjs` makes the browser log one 404
  for it (the loader's import is caught); the manifest row lists it under `errors`, and the shot
  is still ok.
- Italian only, Player or DM only; no English or signed-out states. Native `<select>` controls
  look different in Chromium and WebKit.
- `manifest.json` top-level fields (base, browser, `capturedAt`) describe the latest invocation;
  each shot row keeps its own route, role, checks and errors.
- `playwright-cli --raw run-code` was not used: a Node script takes parameters, runs contexts in
  parallel and needs no named session to close. Use `playwright-cli` for exploration if needed.
