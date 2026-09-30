# Fix P3: one roll engine, game log, HP and conditions

Date: 26/09/2026. Fixer: P3 (Claude, subagent). Branch `codex/interview-01`, working tree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`, nothing committed. Browser
session `d20-fix-p3`; evidence in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P3/`.

## Summary in plain words (IT)

Ora ogni numero cliccabile tira con lo stesso motore: la lista della scheda, i preferiti, il
vassoio dei dadi e il Tavolo applicano Avvelenato (2d20, tiene il più basso), Indebolimento
(−2 per livello, anche nel numero mostrato) e Benedizione (1d4 tirato e nominato). Ogni
personaggio ha una «Politica dei tiri». Il registro conserva la formula (4d6kh3, 10d6cs>=5),
barra i dadi scartati, dice chi vede il tiro e si apre in «Dettagli» con Correggi / Rivela /
Ritira. I tiri «Solo DM», i modificatori nascosti, le identità nascoste e gli eventi di servizio
del DM non lasciano più tracce nel registro dei giocatori. I PF hanno un solo controllo: si
cliccano i numeri per correggerli con il motivo; a 0 PF il riquadro diventa quello dei tiri
contro la morte, con «Riporta a 1 PF», «Morto» esplicito e «Riporta in vita…».

## Items

| ID | Result | What changed (market pattern) | Where |
| --- | --- | --- | --- |
| PG-23 | FIXED | One D20 Test engine (D&D Beyond). `sheet-plus-domain` gains `testConditions`, `testProfile`, `effectiveRollMode`, `combineModes`; `statValue().total` includes Exhaustion (`conditionParts`, never written through); `rollProfile` carries `conditionReasons`, `autoFail`, `policy`; `recordRoll` joins the conditions to the chosen mode, refuses automatic failures and physical faces that do not match the real mode. `dice-tray-domain.testModifier/conditionTest` now delegate to it, so the tray, the Table tray, requests, the quick bar's saves/skills (`checkBonus` reads `statValue`) and favourites share the maths. The tray's sheet «Tiri» box drops its duplicate saves/skills list and keeps Heroic Inspiration, a free formula and the policy. | `sheet-plus-domain.mjs`, `dice-tray-domain.mjs`, `dice-tray.mjs` |
| PG-47 | FIXED | Beyond20/AboveVTT toggles: the tray reads `activeRiders`, adds Bless/Bane dice to the test and flat riders to the named sources; the breakdown and the log card name the rider («+ [3] (Benedizione)»). The DM's roll requests and the Table's combat attacks still do not add the rider's die (combat engine, P5; the attack detail names it). | `dice-tray-domain.mjs`, `chat-domain.mjs`, `chat.mjs` |
| PG-48 | FIXED | Roll20 Manage Sheet / Beyond20 Type of Roll: per-character policy in the tray slice (`policies`, `setPolicy`, `policyOf`): d20 normal / ask / always advantage / always disadvantage, default audience, «Critico automatico» (a digital sheet attack also rolls its damage, dice doubled on a natural 20). Engine: `rollPolicy` in `sheet-plus-domain` (sheet list and favourites), `rollNumber` in the tray. Dialog from the sheet box («Politica dei tiri · Cambia…»), the tray's «Impostazioni» and the palette command «Politica dei tiri del personaggio…» (description: vantaggio, svantaggio, chiedi ogni volta, tiro nascosto o sussurrato al DM, chi vede i tiri, critico…). | `dice-tray*.mjs`, `sheet-plus-domain.mjs` |
| PG-21 | FIXED | DDB HP box: the sheet's HP numbers are a button (shared edit `characters.mjs renderVitals` + action `hp-correct`) that opens the HP widget with «Correggi i punti ferita» open (current, maximum, temporary, required reason) → `damage-domain.correctVitals`, one `vitality-correct` entry in the one HP log with Annulla. «Correggi valori» (shared edit `editCharacter`) shows HP read-only with «Correggi i PF…» and no longer writes `maxHp`. Palette command «Punti ferita: cura, danno, correggi…» (PF, punti ferita, correggi PF…). | `hp-widget.mjs`, `damage-domain.mjs`, `damage-tray.mjs`, `damage.css`, `characters.mjs` |
| PG-22 | FIXED | Roll20/DDB single HP control: the widget carries cause (kept in the HP log) and «Colpo critico» besides the damage type. With the HP area built the conditions panel replaces Danno / Cura / PF temporanei with «Punti ferita: cura, danno, temporanei…», which opens the widget (the panel's own forms stay only when the HP area is absent, e.g. in `conditions-ui.test`). | `hp-widget.mjs`, `conditions-ui.mjs` |
| PG-27 | FIXED | DDB death-save box + Roll20 Stabilize / Restore 1 HP: at 0 HP the sheet (and Table inspector) summary shows pips, «Tira il TS contro la morte» (primary; opens the pending in-combat request inline or starts one outside combat), «Stabilizza…» (Medicine aid), «Riporta a 1 PF»; Dead is an explicit «Morto» state with «Riporta in vita…» (Rinascita / Rianimare morti / other with a note; logged as a correction plus 1 HP healing). Disabling attacks while unconscious stays P5 TV-74. | `conditions-ui.mjs`, `conditions-ui.css` |
| PG-28 | FIXED | DDB conditions panel: «+ Condizione» → one click on the condition (2 clicks), Exhaustion 1–6 segments (the current level lowers by one; level 6 opens the panel preview). Effects reach every roll through PG-23. | `conditions-ui.mjs`, `conditions-ui.css` |
| TV-87 | FIXED | DDB game log card / BG3 hover: cards keep named bonuses, strike dropped dice, show the rule, a privacy tag («Solo io», «Io e il DM», «Solo il DM», «Solo DM»), fold a tray correction or withdrawal into the card (the separate lines are hidden), hover title with the plain breakdown and «Dettagli» with Correggi / Rivela / Ritira for the roller (run by the tray through `chat:roll-action`). | `chat-domain.mjs`, `chat.mjs`, `chat.css`, `dice-tray*.mjs`, `sheet-plus-domain.mjs logRollOf` |
| TV-90 | FIXED | Foundry roll mode: the tray's «Chi vede il risultato» applies to the listed checks too (`bindNumbers` audience); a character's policy audience is the default. The section «Aspetto e prova» is now «Impostazioni» with the character's policy first. | `dice-tray.mjs` |
| TV-92 | PARTIAL | dnd5e request card: the DM's request line is a chat card with each row's state and «Tira» (digital, or the physical faces dialog) for the rows the viewer rolls (`meta.logLabel`, `requestFor`). Not fixed here: the player's «Tiri e risultati» list still lists requests of DM creatures, and the «Risolvi tiro» dialog titles a plain bonus «Effetti delle condizioni»; both live in `combat.mjs projectAttempts` and `combat-ui.mjs conditionReasonsHTML` (P5). | `roll-requests.mjs`, `chat*.mjs`, `dice-tray.mjs` |
| TV-96 | FIXED | FG standard modifiers: adding, showing/hiding and deleting prepared modifiers are DM-only log lines. | `dice-tray.mjs` |
| TV-97 | FIXED | Foundry chat log: formula with rules (4d6kh3, 10d6cs>=5, 2d20kl1), struck dice, success count. | as TV-87 |
| TV-105 | FIXED | FG /mood with a visible selector: «Tono» (free text with suggestions) beside the message type for dialogue and action; one message at a time; `/mood` still works. | `chat.mjs` |
| TV-125 | FIXED | Automated Animations: any spell of a combat attempt plays an effect coloured by its damage type (projectile per target, darts for Magic Missile, cone, burst on an area point); a spell cast from the sheet outside combat glows on the caster's token. Toggle and Reduced motion respected. Verified by node test (`p3-hp-log.test.mjs`); the browser step of `dice-tray-journey.js` that plays Fire Bolt could not be reached (Scenes dialog changed by other packages). | `dice-tray.mjs`, `dice.css` |
| TV-141 | FIXED | FG ID / Foundry Anonymous: `conditions.disguises` + `maskNames` (core) mask true names in the players' log labels, roll cards, request titles and tray lists, retroactively. Shared edit `knowledge.mjs openIdentity`: «Identità nascosta» commits DM-only. Not covered: attempt names in P5's «Tiri e risultati» (`combat.mjs` stores `actorName` at creation). | `conditions.mjs`, `chat-domain.mjs`, `roll-requests.mjs`, `dice-tray.mjs`, `knowledge.mjs` |
| TV-68 | FIXED | dnd5e tray on the card: every damage card in the log has «Vassoio dei danni: moltiplicatori e difese…» for the DM; the global DM tray (dialog) lists pending applications and proposals, the already-applied targets with their HP dialog, and the campaign default «Applica subito (con Annulla)» / «Rivedi prima nel vassoio» (writes P10's `automation` rule through `campaign-settings-domain.setRule`, DM-only line). Browser: palette › «Vassoio dei danni…» › «Rivedi prima» sets `automation: assisted` with a DM-only line; the card button is covered by a node test. | `damage-tray.mjs`, `chat.mjs` |
| TV-69 | FIXED | Improved Initiative / Effective Tray: the bell's proposal notice has «Accetta e applica», «Rifiuta…», «Apri il vassoio» inline (notification `actions`); palette command «Vassoio dei danni e proposte dei giocatori». | `notifications.mjs`, `notifications.css`, `damage-tray.mjs` |
| TV-79 | PARTIAL | FG (C) effect / dnd5e request: «Concentrazione…» in «+ Condizione» records it (SRD concentration spells suggested), shows a «(C) Benedizione» chip with ×, and damage while concentrating asks the CON save at DC max(10, half) (combat engine, already there). Not done: the shared edit to make Benedizione castable by a sample caster. Bless is already `conc: true` in `srd-sample`, but no sample character can cast it (Bless is Cleric/Paladin; Livia is a Wizard, Mira a Druid with no spells); making it castable needs a sample actor's spell list in `state.mjs` (P1) or a product choice. | `conditions-ui.mjs`, `conditions-ui.css` |
| SV-24 | FIXED | WCAG labelling: every new HP field sits in its label; axe-core 4.12.1 (local install, injected only in the test page; WCAG 2 A/AA, contrast aside) reports no violation in the sheet HP dialog and the Table token HP dialog (the tracker opens the same dialog). A node test checks every widget input has a label. | `hp-widget.mjs`, `p3-hp-journey.js` |
| X-02 | FIXED | DDB game log: the DM's service lines (countdown, rest update, prepared modifiers, hidden identity, names, roll policy, settings) are hidden from players; a player's own line stays theirs. | `chat-domain.mjs` |

## Acceptance checks

- `node --test design/blueprint/tests/*.test.mjs`: see «Tests» below. New tests:
  `tests/p3-roll-engine.test.mjs` (Poisoned Athletics 2d20 keep-lowest from the sheet list,
  the tray and the Table tray; Exhaustion 2 INT save everywhere; Bless 1d4 everywhere; policy;
  automatic critical) and `tests/p3-hp-log.test.mjs` (log, requests, HP, death box, quick
  conditions, Concentration, bell, tray, spell effects).
- Running app, `p3-roll-engine-journey.js`: the same Athletics from the sheet list, the
  favourites strip and the Table tray: 2d20 keep-lowest, same parts (Forza, Avvelenato:
  svantaggio), same modifier; Exhaustion 2 INT save +6 → +2 (Livia's base is +6 with P2's
  attuned Cloak of Protection, so the acceptance's «+1» reads «+2» now) shown and rolled on the
  sheet and in the tray; Bless named in the tray breakdown; the 4d6kh3 card strikes 1 die.
- `p3-privacy-journey.js`: DM «Solo DM» + listed Stealth: nothing of it in the player's log;
  «Nebbia fitta» hidden modifier logged DM-only; the request card «Tira»; «Tono»; the bell's
  «Accetta e applica» applies the proposal in one click (Sentinella 7 → 4).
- `p3-hp-journey.js`: HP numbers › «Correggi»; «Correggi valori» link; one damage form with
  type and cause; 0 HP death box with the roll (primary), «Riporta a 1 PF»; massive damage →
  explicit «Morto» → «Riporta in vita…»; Concentration save DC 10; axe-core; EN phone 390 × 844
  with touch (tap on the HP numbers, «Correct hit points», no overflow).

## Tests

- `node --test design/blueprint/tests/*.test.mjs` (final run, 26/09): 2227 tests, 2226 pass,
  1 fail: `ia-consolidation.test.mjs` «sheet: D&D Beyond's seven sections…» expects no
  `sheet-plus-notes` tab, a sheet tab added by P2's concurrent work in `sheet-plus.mjs` (not a
  P3 file). Every P3 test passes; earlier runs also showed transient failures of other
  packages' work in progress (table, combat, character library, action bar).
- Own tests updated for intended changes: `dice-tray.test.mjs` (the tray's sources are the
  sheet's parts; slice gains `policies`; spell effect class carries the damage type),
  `dice-tray-review.test.mjs` (the sheet «Tiri» box no longer lists saves and skills).
- New journeys (all pass, run in session `d20-fix-p3`):
  `p3-roll-engine-journey.js` (9 checks, IT desktop + EN log card),
  `p3-privacy-journey.js` (7 checks: TV-90, TV-96, X-02, TV-92, TV-105, TV-69, TV-141),
  `p3-hp-journey.js` (10 checks incl. axe-core and EN phone 390 × 844 touch),
  `p3-axe-hp-journey.js` (axe-core on the Table inspector HP widget, DM and player: no
  violations).
- Regression journeys of the touched areas, run from copies whose screenshot paths point to
  `fix-P3/regress/` (so no earlier evidence was overwritten):
  - pass: `chat-journey.js`, `damage-tray-journey.js`, `dice-correction-journey.js`,
    `dice-tray-review-journey.js` (with the two intended adaptations below).
  - intended changes (assert the old behaviour): `conditions-journey.js`,
    `conditions-death-journey.js`, `conditions-fixes-journey.js`, `conditions-mobile-journey.js`
    and `notifications-journey.js` click the panel's «Danno» / «PF temporanei» commands, now
    replaced by the HP widget (PG-22); `chat-review-fixes-journey.js` expects a withdrawn tray
    roll's card to read «Annullato» and a separate «Tiro ritirato» line: the card now reads
    «Ritirato: <motivo>» and folds that line (TV-87); `dice-tray-review-journey.js` reads the
    INT save in the sheet's «Tiri» box, which no longer lists saves (PG-23).
  - cloak shift, not a regression: `dice-tray-journey.js` and `dice-tray-review-journey.js`
    hard-code Livia's saves (Dex +2, INT +5); with P2's attuned Cloak of Protection the one engine
    gives +3 / +6 on every surface (before, the tray ignored the cloak). With those numbers
    relaxed the tray journey passes 14 steps and stops at «Scene › Il cortile dell'osservatorio»
    (the Scenes dialog changed in P6/P7 work), as does `dice-3d-journey.js`.
  - unrelated to P3: `conditions-journey.js` stops earlier on «Sentinella not adjacent to
    Livia» (seed token positions); `concentration-journey.js` looks for «Vai al Tavolo» after
    «Scheda completa», which now opens the sheet over the map (P2 PG-20).
- Palette: the new commands are found by their labels («Politica dei tiri…», «Punti ferita:
  cura, danno, correggi…», «Vassoio dei danni…»); matching their descriptions (synonyms such as
  «tiro nascosto», «moltiplicatore», «correggi PF») waits for P9 SV-02 (checked: no result yet).

## Notes for other packages (not edited here)

- P2 `sheet-plus.mjs`: the roll dialog could preselect the engine's mode
  (`effectiveRollMode(profile, "normal")`) so a physical roll under Poisoned opens with two d20
  fields; today the engine refuses a mismatched physical roll with a message saying which mode to
  choose. The stat tooltip and dialog could list `stat.conditionParts` (Exhaustion) beside the
  steps; the total already includes it.
- P5 `quickbar-domain.mjs`: saves/skills already read the engine's `statValue` (Exhaustion
  included); plain checks, Poisoned Disadvantage and riders would follow if `stepPlan` used
  `rollProfile` + `effectiveRollMode`. `combat.mjs projectAttempts` / `combat-ui.mjs` for the
  TV-92 leftovers; roll requests and combat attacks do not add Bless's die (info only).
- P1 `state.mjs` / P2 `srd-sample.mjs`: a sample caster with a castable concentration spell
  (TV-79).
- Journeys whose steps assert the old behaviour on purpose changed by these fixes:
  `conditions-fixes-journey.js` (clicks the panel's «PF temporanei» / «Danno» commands: now
  «Punti ferita…» opens the widget), `dice-tray-journey.js` step (7) (expects Livia's Dex save
  +2: it is +3 with P2's cloak now that the tray reads the sheet's engine). Cross-cutting test
  `increment10-review.test.mjs` line 988 still expects «Danni, cure e condizioni» (kept).

## API changes

- `sheet-plus-domain`: `testAbility`, `testConditions`, `testProfile`, `combineModes`,
  `effectiveRollMode`, `rollPolicy`, `POLICY_D20`, `POLICY_AUDIENCES`, `riderKindOf`,
  `canReadRoll`; `statValue` → `conditionParts`; `rollProfile` → `conditionReasons`,
  `autoFail`, `policy`, attack `damage`; `recordRoll({audience})` → record `parts`,
  `chosenMode`, `conditionReasons`, `audience`, `damage`; `logRollOf` → `kept`, `faces`,
  `sources`, `notes`, `audience`, owner/controller by audience.
- `dice-tray-domain`: `setPolicy`, `policyOf`, slice `policies`, `riderOfGroup`; records carry
  `riders`; `rollEvent` adds `formula`, `faces`, `successes`, `sources`, `audience`,
  `corrections`, `withdrawal`, `reveal`, `rerolls`.
- `dice-tray.mjs`: `openPolicyDialog`, `runRollAction`, `rollRequestFromCard`; listens to
  `chat:roll-action` (correct / reveal / withdraw / request) and `commit` (cast effects).
- `roll-requests.createRequest(..., {logLabel})`; groups carry `logLabel`.
- `chat-domain`: `projectLog(..., {requestFor})`, `SERVICE_LABELS`, `isServiceLabel`,
  re-exports `disguises`, `maskNames`; roll views carry `formula`, `faces`, `successes`,
  `sources`, `notes`, `privacy`, `damage`, `attemptId`.
- `conditions`: `disguises(state)`, `maskNames(text, list)`.
- `damage-domain.correctVitals`; `damage-tray`: `openHpDialog(..., {correct})`,
  `acceptProposal`, `declineProposal`, `openDmTray`, commands `damage-tray.hp`,
  `damage-tray.global`; notification entries may carry `actions` (`{id, label, run, primary}`).
