# Fix P6 — Table map: movement, camera, tokens, measuring, cover and table knowledge

Date: 25/09/2026. Fixer session for package P6 of `triage.md`. Branch `codex/interview-01`, working
tree `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01` (nothing committed).
Evidence: `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P6/`
(playwright-cli session `d20-fix-p6`, desktop 1440×900 and phone 390×844 with CDP touch, IT and EN).

## Result

All 24 rows are fixed (X-03 by verification: no miss could be reproduced after the pointer rewrite).
Full suite: 2285 tests, 2280 pass, 5 fail — all five belong to other packages' work in progress
(P7 Preparation groups/scene-assets ×3, P2 `sheet-plus-notes`, P9 session timezone); every P6-owned
and new P6 test file passes (208/208, including the cross-cutting `registry-shell`,
`review-fixes-b61`, `review-fixes-b11b-inc10` that bind the Table).

## Items

| ID | Result | What changed (pattern copied) |
| -- | ------ | ----------------------------- |
| TV-01 | FIXED | Walls of every kind block walking and a move walks around them: A\* on a half-cell lattice with string pulling (`spatial.routePath`), used by drag, keyboard, Plan path, doors, swims and proposals (`table-spatial.plannedWaypoints`); a free leg stays straight. The courtyard now has its drawn walls as movement walls (curtain, north room with its climbable low wall, south-east room) and a door in each room (north closed, south-east open), seeded by `special-moves-domain` like its rubble. A drag on the empty map pans, a click there clears the map selection and moves nobody, no text selection while dragging, arrows + Enter move the focused token and keep the focus. Unreachable destinations are refused before any commit, with «Non c'è un passaggio a piedi…». (Foundry/Owlbear/DDB/BG3.) |
| TV-04 | FIXED | Clicking a door out of reach offers «Vai e apri con Livia»: the dialog shows the walk (metres) and the interaction cost, then walks there (routed) and opens in one change. The jargon sentence is gone. (BG3, Arms Reach.) |
| TV-05 | FIXED | Wheel (and trackpad pinch) zooms at the cursor; + and − keys zoom (commands «Ingrandisci/Riduci la mappa», in the «?» guide); the + and − buttons zoom around the centre; left-drag on the empty map pans; «Centra la scena» has a target icon. (DDB, Owlbear, Roll20.) |
| TV-06 | FIXED | Phone: one finger on the empty map pans, two fingers pinch (existing), a Medium token is drawn no wider than its cell with an invisible 44 px touch target, the tool columns fold into one «Strumenti della mappa» button, the live status message floats over the top of the map (never under the action bar), only your own tokens start a drag. Door buttons keep their finger size. (TouchVTT, Roll20 tablet.) |
| TV-10 | FIXED | Default distance rule is the SRD 2024 grid (diagonal = 1 square) for every scene without a rule; «Linea retta» is an explicit choice. On hexes the path walks through the hex centres and each hex step costs one hex. «Regole di movimento» links to «Griglia e misure della scena…» (scene editor). (Foundry, Solasta II.) |
| TV-11 | FIXED | Command «Etichette sulla mappa: tieni premuto Alt per vederle (Alt+L le lascia accese)» (shortcut Alt+L, listed in the «?» guide and found by «etichette»); the status line teaches «tieni premuto Alt per le etichette». (BG3.) |
| TV-15 | FIXED | Box select filters: Alt = only enemies, Ctrl/⌘ = only mine, or chips «Tutte · Solo nemici · Solo mie» while the select tool is on; the panel lists every selected token (HP and AC where the viewer may read them). (Roll20.) |
| TV-19 | FIXED | A larger token keeps its name and status label at the same size; the selected token you control shows a rotate handle and a resize handle (SRD sizes, 15° steps); a locked token shows none. (Foundry, Owlbear.) |
| TV-20 | FIXED | Dragging a grouped token moves the whole group by the same offset out of combat (each member routed; blocked ones stay and are named; one Undo). After a click the token keeps the focus, so Ctrl+C / Ctrl+V work at once; Shift+G acts on the multi-selection. (DDB token groups.) |
| TV-21 | FIXED | DM right-click on the map › «Aggiungi creatura qui…» › search › pick: the SRD creature lands there, hostile and visible (3 interactions). «Aggiungi creature» bestiary panel in the Scene tab with drag to the map and «Aggiungi»; command «Aggiungi creatura: una nuova pedina sulla scena» found by pedina, mostro, PNG, goblin. (DDB token browser, Foundry sidebar drag.) |
| TV-25 | FIXED | `tokenStatus` follows the campaign «Cosa vedono i giocatori» enemy-health policy: hidden = no vitality badge or text (Morto, Morente, Stabile) for players; the DM always sees it; conditions stay public. The damage-tray badges already read the policy. Grouping of the policy remains P10 CA-71. (DDB.) |
| TV-26 | FIXED | «Trova la mia pedina» button in the map's view group (DM: «Trova la pedina selezionata») and a command with synonyms; double-click on a roster/turn-order row already centred and selects. (Monk's, Clash!.) |
| TV-27 | FIXED | Tab to a token, arrows move one cell, Enter confirms, the focus stays on that token (also across the commit's re-renders), IT and EN; the map's accessible instructions say so. Map-layer labels under the fog or out of sight are hidden and leave the accessibility tree for players, including the Alt labels. (Owlbear 2.1.) |
| TV-36 | FIXED | Under a finger the measured distance floats about 70 px above it at a readable 16 px (measure tool and two-tier ruler); the status line is no longer under the bar. (Owlbear ruler.) |
| TV-38 | FIXED | Rings are drawn in the viewer's current colour theme, so changing it recolours rings already placed; a tap places them (the hint no longer asks for a long press). (Owlbear Ranges.) |
| TV-44 | FIXED | The line-of-sight result is written on the map by the target («Mezza copertura, +2 CA», «Copertura totale: non bersagliabile»…), with «Mostra a tutti» / «Solo per me» and a visible «Togli»; the status line keeps the result after the render. (Peekaboo.) |
| PG-46 | FIXED | The hotbar shows HP (bar + numbers, a button opening the HP widget), temporary HP and spell-slot pips; on a phone the HP is a 40 px chip beside the turn resources. Greying attacks at 0 HP is P5 TV-74. (Alchemy, BG3.) |
| TV-08 | FIXED | «Ultima mossa Maiusc+X» button at the top of the Creature panel (pressed state), command description with «ultima mossa, storico dei movimenti». (Roll20 X.) |
| TV-71 | FIXED | «Cadere» is always in Mosse speciali: airborne it falls from its altitude, on the ground it asks the height; 1d6 per 3 m (max 20d6), Prone on landing. (dnd5e falling.) |
| TV-77 | FIXED | In combat, a drag or keyboard path shows crossed swords where it leaves the reach of an enemy that can still react (engine's own reach rule), above the tokens, and the status line names it. (BG3.) |
| TV-138 | FIXED | Search finds stay listed in «Trovato in questa scena» (creatures, traps, search points, with finder and total) in the Creature panel; the log says «Cerca · Percezione: Livia». (BG3.) |
| TV-142 | FIXED | «Borseggia…» is in the token menu of any creature you could rob, greyed with «Avvicinati: serve un tuo personaggio adiacente (1,5 m).» when out of reach (a new token-menu reason hook, `setMenuReason`); also in Mosse speciali; the DM's bell entry opens the decision dialog (click, or its «Decidi…» action); command with synonyms. (BG3.) |
| TV-106 | FIXED | The header «Scene» opens the scene list over the map: «Attiva per il gruppo», «Apri per me» (private preview in Preparation), «Prepara le scene»; also a command. (Foundry scene navigation.) |
| X-03 | VERIFIED | Right-click on a selected token opened the menu 8/8 (DM) and 20/20 (player) after the pointer rewrite; no separate cause was found in the code. |

## Tests

- New: `tests/p6-movement.test.mjs` (SRD grid default, hex path, routing around walls, courtyard walls
  refused/routed in exploration and combat, zoom at the cursor, door approach),
  `tests/p6-table.test.mjs` (tokenStatus with hidden enemy health, hotbar vitals, idle hint, OA
  warnings, «Cadere», guide commands), `tests/p6-tokens.test.mjs` (box filters, selected list,
  label size and handles, group follow, add creature here, cover text, «Trovato», greyed pickpocket,
  «Scene»).
- Updated (owned): `special-moves.test.mjs` (default rule, hex walk), `token-menu.test.mjs` (new
  commands), `knowledge.test.mjs` (HUD layer, visible pickpocket), `annotations.test.mjs` (TV-38).

## Browser journeys (new, `changes/interview-01/blueprint-checks/`)

`p6-map-movement-journey.js` 7/7, `p6-phone-map-journey.js` 8/8, `p6-dm-table-journey.js` 6/6,
`p6-table-extras-journey.js` 11/11, `p6-table-more-journey.js` 6/6 (all pass). Plus spot checks:
OA mark on a combat drag, fog labels in the tower, + and − keys, EN keyboard move.

## Existing journeys of the touched areas (run one by one, 115 s timeout)

Pass unchanged: `measure-journey`, `spatial-journey`, `visual-fixes-journey` (44 px touch target
kept), `b61-table-structure-journey`, `annotations-review-fixes-journey`,
`knowledge-review-journey`, `token-menu-journey` (after removing its pre-existing trailing `;`).

Fail only because of an intended P6 change — the coordinator should update these lines (each was
re-run with the one-line adaptation, in the scratchpad, and then passed):

- `gestures-and-views.js` over-budget check uses the Euclidean `Math.hypot(…)-300`; with the SRD
  grid default (TV-10) use `Math.max(|dx|,|dy|)`. Its later «Inventario» step now meets P2's sheet
  overlay.
- `special-moves-journey.js` `clickMap` moves by clicking the empty map; click-to-move is gone
  (TV-01): drag from the selected token instead (adapter: 22/22 steps). It also still ends with a
  trailing `;` (pre-existing, breaks `run-code`).
- `spatial-mobile-journey.js` line 18 and `annotations-journey.js` `tool()`: on a phone tap
  `[data-map-tools-toggle]` first (TV-06) (adapters: 6/6 and 11/11).
- `knowledge-journey.js` line 172, `session-view-journey.js` lines 106 and 820, `area-journey.js`
  line 9: the header «Scene» opens the scene list (TV-106); Preparation is «Scene» › «Prepara le
  scene» (`[data-table-scene-prepare]`). After that, `knowledge-journey` stops on P7's new
  Preparation list (one activation button).

Fail for other packages' current work, not P6: `core-journey` («Vai al Tavolo» after P2's sheet
overlay; its keyboard move part passes), `approach-journey` (P5 action-bar dice select),
`b61-review-fixes-journey` (P4's picker now opens when the multi-sided token tool is chosen).

## Limits and notes for the coordinator

- The courtyard walls block movement only (sight and effects unchanged, so fog tests keep their
  data). Climbing still changes altitude on the same side; the north room is entered by its door.
  Walls exist in states seeded after this change («Ripristina esempio»).
- Routing never opens doors by itself and, for players, ignores secret walls they do not know
  (the commit still checks the full geometry).
- On hex scenes a token placed off a hex centre starts from where it stands; later steps go
  through centres and the move ends where it was released.
- Shared files: P2 made its PG-20 shared edit in `table.mjs` (import `openSheetOverlay`, sheet
  buttons) while this work ran; it is intact. P6 made no shared edit into other packages' files.
- New registry contributions: commands `special-moves.labels`, `token-menu.zoom-in/zoom-out`,
  `token-menu.find-mine`, `token-menu.scenes`, `token-menu.add-creature`, `knowledge.pickpocket`;
  panel `token-menu-creatures` (Scene tab, DM); map layers `token-menu-handles`,
  `knowledge-los-hud`. Only existing POINTS fields are used.
- Prettier (repo 3.8.3) is clean on every file P6 touched.
