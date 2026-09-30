# Reconcile after the audit fix packages (interview-01)

Date: 27/09/2026. Reconciler (single writer). Branch `codex/interview-01`, working tree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`. Nothing was committed.
Browser: playwright-cli session `d20-reconcile`, server `http://127.0.0.1:8879/`. Evidence,
runner and logs: `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/reconcile/`
(`run.sh` copies a journey with its images redirected to `images/`; `dbg.sh` runs a copy that returns
the steps passed when a step fails; `logs/summary.log`, `logs/<journey>.log`, `logs/node-suite.log`).

## In breve (IT)

I 4 test rossi e i percorsi rossi avevano due tipi di causa. **Cambi voluti e corretti** (copiano il
mercato): la sezione «Scene avanzate» è confluita nell’unico elenco ed editor delle scene (Foundry,
Roll20); la scheda «Note» del personaggio si apre sulle note per sezione (D&D Beyond); la copia di una
voce SRD apre l’editor homebrew strutturato; una tabella semplice si tira dentro la nota; la scheda dal
Tavolo si apre sopra la mappa; «Appunti personali» al Tavolo apre l’appunto rapido; sul telefono gli
strumenti della mappa sono raccolti in un pulsante. Qui ho aggiornato test e percorsi senza togliere
nulla di ciò che provavano (anzi aggiungendo il controllo positivo di dove è finito il contenuto).
**Regressioni vere**, corrette nell’app con un test scritto prima: il menu «Altre azioni» di una scena
usciva dallo schermo del telefono (e per questo l’attivazione non tornava al Tavolo); il filtro per costo
della barra delle azioni spingeva «Disimpegno» in una terza riga nascosta; la barra in basso era più alta
del limite e la pagina del Tavolo scorreva; i suggerimenti al primo incontro erano di nuovo accesi di
default, contro la decisione del proprietario I-236. Ora la suite è verde (2316/2316) e i sei percorsi
richiesti passano, più altri dieci di controllo.

## Node suite

Start: 2312 tests, 2308 pass, 4 fail. End: **2316 tests, 2316 pass, 0 fail** (7.6 s, `logs/node-suite.log`).
New: `tests/reconcile-ia.test.mjs` (4 tests). The fourth failure named in the brief («the Preparation
strip ends with one 'All sections' quick-jump») is in `tests/w2b2-integration.test.mjs`, not in
`ia-consolidation.test.mjs`.

## Decisions

### Intended product changes: tests and journeys updated (nothing weakened)

| Failure                                                                            | Cause                                                                                                | Verdict (pattern)                                                                                                                                           | Update                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ia-consolidation` «every area names where its commands live»                      | P7 PR-06/08/10: `scene-assets` no longer registers a Preparation section                             | Correct: one scene directory and one scene configuration (Foundry scene directory, Roll20 page menu); a second list of the same scenes was the anti-pattern | The `scene-assets` expectation is replaced by an assertion that it registers **no** Preparation section; `sheet-plus-notes → notes` added to the sheet categories                                                                                                      |
| `ia-consolidation` «Preparation: four groups…»                                     | same                                                                                                 | same                                                                                                                                                        | Scene group is `scenes, regions, special-moves`; new positive check: opening the «Scene» group shows exactly that second strip                                                                                                                                         |
| `ia-consolidation` «sheet: D&D Beyond's seven sections…»                           | P2 PG-43: section notes are the first page of «Note»                                                 | Correct: D&D Beyond's Notes tab (Organizations, Allies, Enemies…)                                                                                           | Notes members `sheet-plus-notes, character-library-log, character-library-revisions`; still seven categories                                                                                                                                                           |
| `w2b2-integration` «the Preparation strip ends with one 'All sections' quick-jump» | P7                                                                                                   | Correct (as above)                                                                                                                                          | «area sections stay in the strip» now asserted on Regions; `scene-assets` asserted absent                                                                                                                                                                              |
| `handouts-journey` step 12 «Map-less copy…»                                        | P7 PR-07 hides «Scala … / casella» on a map-less scene                                               | Correct: D&D Beyond Theater of the Mind has no grid or scale; the stage note keeps «contano comunque 1,5 m per casella»                                     | Asserts the stage note **and** the absence of the scale caption                                                                                                                                                                                                        |
| `compendium-journey` «Library copy»                                                | P8 BI-26/BI-23: «Crea una copia modificabile» opens the structured homebrew editor / monster creator | Correct: FG copy-from-module with Revert, DDB homebrew copy; one editor                                                                                     | New route and save (`[data-hbe="save-content"]`); checks the SRD source label, CC BY reference, casting data, «Copia modificabile di un modello SRD», the saved revision's credit and `structured.template.id`; the wolf copy still carries CA, PF, DES, Morso, +4, GS |
| `compendium-journey` XP-table embed                                                | P9 SV-05: a private note folds its preview (one save)                                                | Correct                                                                                                                                                     | Opens the folded «Anteprima» before reading the embedded table                                                                                                                                                                                                         |
| `compendium-journey` table draw                                                    | P8: a simple campaign table is drawn in place                                                        | Correct: Foundry roll table from a journal link, Roll20 inline table roll                                                                                   | Waits for the draw notice, asserts the entry stays open and the draw is in the Table log; the log is opened with `openTablePanel` (the old toggle closed it when the sidebar remembered the log)                                                                       |
| `core-journey` «Vai al Tavolo»                                                     | P2 PG-20: the Table's «Inventario» opens the sheet in a drawer over the map                          | Correct: Foundry sheet window over the canvas, D&D Beyond sheet inside Maps                                                                                 | Closes the drawer («Chiudi la scheda e torna alla mappa») and asserts the route is still `#table`                                                                                                                                                                      |
| `core-journey` private notes                                                       | P9 CA-11: at the Table «Appunti personali» opens «Appunto rapido»                                    | Correct: D&D Beyond Quick Jot                                                                                                                               | Writes the note in the jot (asserts the Table stays), then **adds** a positive control (the author sees it in `#notes`) before the DM leak check                                                                                                                       |
| `b62-review-fixes-journey` group 3                                                 | P6 TV-06: on a phone the tool columns fold into one «Strumenti della mappa» button                   | Correct: TouchVTT, Roll20 tablet                                                                                                                            | Unfolds with a tap, then the same «tools clear of the pinned hotbar» check (5 tools, all clear)                                                                                                                                                                        |

The brief's «two elements now match selectors that matched one» for the compendium journey did not
reproduce: every compendium failure was one of the three intended changes above.

### Regressions: app fixed, test first

1. **Phone «Altre azioni» off screen** (P7 × preparation.css). At 390 px the scene row menu hung from its
   summary's left edge (third button of a wrapped row) and ended at x = 495: the page widened, the phone
   zoomed out, and closing the menu on the tap re-zoomed, so the tap on «Attiva per il gruppo» missed and
   the scene never reached the Table. Fix (`preparation.css`, ≤ 760 px): the actions block is the menu's
   anchor and the menu spans it (x 32–372). Probe: activation now lands on `#table` with the map. Test:
   `reconcile-ia` «phone: … inside the screen»; the handouts journey now also asserts no overflow with the
   menu open.
2. **Disengage hidden in the hotbar** (P5 TV-67 × B62). The cost filter «Tutte · Solo azioni · Reazioni»
   took 111 px of the first row, so Livia's seven actions needed a third row that only scrolled into view
   (also in P5's own 1440 screenshot); «Solo azioni» filtered nothing, as every one of her actions costs
   an action (a control that does nothing). Fix (`combat-ui.mjs`): a cost filter only when it narrows the
   list, «Tutte» only beside two or more filters, a lone filter is a toggle, pressing the active filter
   returns to every action (D&D Beyond's action filters). Livia keeps the Reactions toggle and two rows at
   1366 and 1440. Tests: `reconcile-ia` (lone toggle; with a bonus action «Tutte», «Solo azioni», «Solo
   azioni bonus», «Reazioni» and the toggle-back), `p5-actionbar` TV-67 updated to the same rule.
3. **Hotbar too tall, Table scrolled** (P6 PG-46 × B62). HP row plus slot pips made the identity 104 px,
   the hotbar 125 px (limit 120) and the Table scrolled 4 px at 1440 × 900. Fix (`styles.css`, ≥ 721 px):
   the turn line, slot pips and resources keep their order at line height 1.3 with tighter spacing:
   identity 89 px, hotbar 115 px, no page scroll. Test: `reconcile-ia` «hotbar identity…».
4. **Tips on by default** (P1 SV-48 × owner decision I-236 point 3, registry plan §5.2 rule 9,
   DEVELOPMENT B62). Found by `b62-ia-journey` («a first-visit tip appeared although tips are off by
   default»). The owner's decision outranks the triage row, so `home-tips.enabled` defaults to off again
   (`home.mjs`, `help.mjs` fallback). SV-48's findability stays: «Mostra i suggerimenti» in the help of
   every page, «Non mostrare più», the archive and the reset. Tests: `help.test.mjs` (default off, nothing
   pops up while off); `p1-first-use-journey.js` now checks no tip on arrival, then turns tips on from the
   Table help and sees the tip with «Non mostrare più».

## Browser journeys (final run, each one command under a 240 s alarm)

Required, all green with `errors: []`: `handouts-journey` (15 steps), `compendium-journey` (15),
`preparation-journey` (9), `b62-review-fixes-journey` (7: hotbar 115 px, 17 controls reachable at 1366
and 1440 for player and DM), `token-menu-journey` (19), `core-journey` (13).

Also green after these changes: `b62-ia-journey` (10), `p1-first-use-journey`, `p5-fix-journey`,
`p5-fix-journey-2`, `p6-dm-table-journey`, `p6-phone-map-journey`, `p4-prep-journey`, and P7's
`p7-phone-prep`, `p7-delete-basement`, `p7-list` (run from `2026-09-26/fix-P7/journeys/`).

Screens: `images/1-combat-1366x768-player.png` (two rows, Disimpegno visible), `images/probe-menu-390.png`
(the phone menu inside the screen), `images/3-phone-dm-tools.png`.

## Still stale (not in this brief; causes are intended changes of other packages)

- `home-journey.js`: waits for the unfolded «Da dove vuoi iniziare?»; P1 IN-07 folds first steps for a
  known player (P1 already listed it).
- `w2b1-shell-journey.js`: taps a phone map-tool group inside the folded toolbar (P6 TV-06).
- `b61-review-fixes-journey.js`: the multi-sided token tool now opens P4's picker dialog, which covers
  the regions tool (reported by P6).
- `w2b2-shell-journey.js`, `w2b2-cross-journey.js`, `scene-assets-journey.js`,
  `scene-assets-review-journey.js`: still open the removed «Scene avanzate» section or `data-sa-tab`
  (P7 listed the scene-assets ones).

## Files changed

App: `design/blueprint/preparation.css`, `design/blueprint/combat-ui.mjs`, `design/blueprint/styles.css`,
`design/blueprint/home.mjs`, `design/blueprint/help.mjs`; contract: `design/blueprint/DEVELOPMENT.md`
(«Reconciliation after the audit fix packages»). Tests: `tests/reconcile-ia.test.mjs` (new),
`tests/ia-consolidation.test.mjs`, `tests/w2b2-integration.test.mjs`, `tests/p5-actionbar.test.mjs`,
`tests/help.test.mjs`. Journeys: `handouts-journey.js`, `compendium-journey.js`, `core-journey.js`,
`b62-review-fixes-journey.js`, `p1-first-use-journey.js` (formatted with Prettier; `core-journey.js` and
`p1-first-use-journey.js` keep no final semicolon, as the blueprint-checks README asks).
