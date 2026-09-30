# Fix P5 — Combat, encounters, initiative and the action bar

Date: 25/09/2026. Fixer session for package P5 of `triage.md`. Branch `codex/interview-01`,
working tree `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01` (uncommitted,
nothing committed). Browser session `d20-fix-p5`; evidence in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P5/`
(`01`–`17-*.png`: desktop 1440 × 900, `14`–`15` phone 390 × 844 with touch, `17` in English;
journey logs in `logs/`).

## In breve (IT)

Il DM avvia il combattimento dal Tavolo, senza passare dalla Preparazione: «Avvia combattimento»
apre una finestra con le pedine della scena (già scelte), «Tira tutti» / «Tira PNG» / «Seleziona
tutti», il d20 fisico da scrivere e «Inizia combattimento»: tre clic, l'ordine si ordina da solo
per totale, i tiri mancanti sono nominati e si salvano subito. Il bonus è quello della scheda
(Livia +2, anche in Preparazione). Chi entra a metà scontro (anche dopo «Correggi iniziativa»)
va al posto giusto. Fuori dal combattimento c'è la «Modalità a turni» di BG3 (Maiusc+Spazio).
Schivata, Scatto, Disimpegno e Scudo lasciano un'icona sulla pedina e una voce in «Effetti
attivi» con la durata; quando scadono lo dicono il registro e un avviso. Il turno di una
creatura nascosta non compare più nel registro dei giocatori. La barra delle azioni raggruppa
Armi, Incantesimi, Comuni con il segno del costo e un filtro (Azioni / Reazioni); le azioni
spese o impossibili (0 PF, Incapacitato, azione già usata) sono grigie con il motivo, prima di
qualsiasi clic; clic destro o pressione lunga su un attacco dà vantaggio/svantaggio. L'arco
tira anche fuori dal combattimento e consuma una freccia; «Regola e calcolo» non va più in
errore. Nel costruttore d'incontri le note non perdono più caratteri; ogni gruppo ha
«Iniziativa condivisa / individuale»; il PNG unico resta lo stesso tra incontri; una pedina
che si chiama come un blocco SRD offre «Carica statistiche» e ogni creatura del DM ha
«Incolla riga del blocco» nel pannello Creatura e sulla scheda.

## Summary

18 rows fixed, 6 partly fixed (TV-46, PR-32, TV-52, TV-59, TV-89, TV-83 — the missing part and its
reason are in each row), none left untouched. New tests: `tests/p5-initiative.test.mjs`,
`tests/p5-encounters.test.mjs`, `tests/p5-actionbar.test.mjs`, `tests/p5-reactions.test.mjs`
(harness `tests/p5-harness.mjs`), 26 tests; `tests/combat.test.mjs` now asserts that an attack
needs no initiative outside combat. New journeys: `blueprint-checks/p5-fix-journey.js` (7 checks)
and `blueprint-checks/p5-fix-journey-2.js` (4 checks, incl. phone 390 × 844 touch), both passing
with no page or console error.

## Rows

| ID     | Result       | What changed (pattern copied) |
| ------ | ------------ | ----------------------------- |
| TV-45  | Fixed        | `combat-tracker.mjs` exports `openTableInitiative(ctx, sceneId)` (Foundry Combat Tracker, D&D Beyond Maps): the tokens of the scene (the prepared ones, else every visible token; hidden ones unticked), «Tira tutti», «Tira PNG», «Seleziona tutti / Nessuno», a d20 field per row, «Inizia combattimento» («Attiva e avvia» for another scene). Domain in `combat-tracker-domain.mjs`: `startCandidates`, `rollStartRows`, `saveStartRows`, `startFromTable`. The tracker's «Avvia combattimento», the Table header and palette command «Avvia combattimento» (synonyms iniziativa, tira tutti) open it. Shared edit `app.mjs` `startEncounter`: every start (Table, Preparation «Avvia incontro salvato…», travel, builder) opens this dialog; «Apri preparazione» stays in it as a link. Checked: DM, 3 interactions, stays at `#table`, order sorted (journey 1, step 1). |
| TV-46  | Partly fixed | «Tira tutti», «Tira PNG», «Seleziona tutti» (Foundry Roll All / Roll NPCs). One bonus source: the sheet's Initiative (`initiativeBonus`) in the start dialog, the pending lane and «Correggi iniziativa»; shared edit `preparation.mjs` (the «include» handler of the prepared encounter): a new participant takes the sheet bonus (Livia +2, not 0). A result already recorded keeps its own bonus. Not fixed: a player rolling their own initiative from the sheet or the Table (DDB) — the one initiative ledger (`preparation.recordInitiativeResult`, P7) accepts only DM rolls; needs a ledger change for player-controlled rolls. |
| TV-50  | Fixed        | `encounter-builder-domain.joinCombat` reads the latest initiative row (`findLast`, like `initiativeOf`) and inserts by total. Test: Sentinella A corrected to 20 stays before Sentinella B 11. |
| PR-32  | Partly fixed | The order is sorted by total on start (`startFromTable` → `sortParticipants`), on join (live order and saved order) and after «Correggi iniziativa» (the scene's saved order follows the correction); ties keep the DM's order (SRD). The start dialog names the missing rolls («Mancano i tiri di: …») and saves each roll at once. Not fixed: one panel for the encounter builder and the scene's «Incontro preparato» — the latter is Preparation's own editor (`preparation.mjs`, P7), a layout change well beyond a one-function shared edit; the Table dialog now makes it unnecessary to start combat. |
| TV-52  | Partly fixed | Internal census codes removed from every tracker setting label and the group-turn house rule (plain labels, Improved Initiative). The shared seed was not changed: adding tokens or attacks to the sample creatures in `state.mjs` changes the fixtures of 68 test files and would make every move near them provoke opportunity attacks. Group initiative is verifiable with the seeded encounter «Chi ha riacceso la lanterna» (two identical cultists share one roll) and is covered by a test with two identical goblins. |
| TV-54  | Fixed        | `D.blockLegendary` prefills Legendary Actions and Legendary Resistance in «Leggendarie e ricarica…» from the linked block's traits («Legendary Resistance (3/Day)», «Legendary Action Uses: 2», SRD or custom), with «Valori letti dal blocco statistiche» (the SRD sample has no legendary creature, so this shows on custom blocks). The failed-save card in «Tiri e risultati» offers «Usa resistenza leggendaria (n/max)» to the DM (dnd5e), before the damage is applied. |
| TV-59  | Partly fixed | Mob attack explains the house rule in the dialog («Ora agisce solo Goblin A… per far attaccare insieme anche Goblin B serve la regola della casa») with «Attiva il turno di gruppo…» that opens the settings; an attacker without an attack says to add one with «Incolla riga del blocco». The sample creatures' SRD attacks were not seeded (same reason as TV-52); at the Table the DM gives one in two clicks (PR-43), and the Esploratore offers «Carica statistiche» (SRD Scout, PR-46). |
| PR-35  | Fixed        | Each creature row with copies shows a switch «Iniziativa condivisa / individuale» (DDB counter). `row.individualInitiative` makes each copy its own initiative group (`initiativeKeyOf`) and roll, also when a staged group arrives. |
| PR-38  | Fixed        | `encounter-builder.keepLiveText`: when leaving a note field saves and re-renders, every field typed into keeps its live text, caret and focus; a restored field still saves when left. Checked 3 times in the browser (Riassunto then Tesoro at once) and in a test. |
| PR-43  | Fixed        | «Incolla riga del blocco» on the Table's creature panel (registry `table-panel` inspector) and on the NPC sheet (`sheet-section`, Actions), DM only, with a live «Riconosciuto: …» preview and «Conferma l’attacco» (FG parser, Shard); palette command with synonyms. A ranged-only line is refused with the reason (Table creature attacks are melee). |
| PR-45  | Fixed        | A unique linked creature reuses the same NPC across encounters; one already on the scene keeps its token (Roll20 linked token). |
| PR-46  | Fixed        | `D.blockOffer` / `D.loadBlockStats`: a DM creature whose name matches an SRD or custom block offers «Carica statistiche» (creature panel and NPC sheet) that applies HP, AC, speed, abilities, defenses and the block's melee attack (Clash!). |
| TV-82  | Fixed        | Ready accepts a spell with a slot aimed at one target (Magic Missile: all darts at the target): the slot is spent now and the spell held with Concentration; on the trigger it is cast once without a second slot; a broken Concentration loses it; an ignored trigger or the next turn dissipates it (Solasta II; SRD Ready). Suggested triggers: enters reach, enters range, attacks an ally, casts a spell, opens the door, leaves cover, other. An area spell stays out with the reason. |
| TV-129 | Fixed        | «Modalità a turni» (BG3): tracker button for DM and players, palette command, Shift+Space on the Table. The party characters on the scene take turns without initiative (the chosen one first); «Termina turno» and «Esci dalla modalità a turni»; a real combat started from the Table replaces it. |
| PG-69  | Fixed        | `combat-ui.sourcePages` reads pages given as a list or per language: «Regola e calcolo» on the bow opens (no TypeError). Attacks need no initiative outside combat (dnd5e, DDB): the bow rolls and spends an arrow (journey: 20 → 19, no combat). The attack detail has the ammunition choice (the inventory's own `selectAmmo`) and «Aggiungi bonus». Shared edit `sheet-plus.mjs` (attack detail «Al Tavolo, contro un bersaglio»): the Table opens with that attack armed, waiting for the target. The «in costruzione» note lives in `characters.mjs` (P2, which removed that panel when sheet-plus is present). |
| TV-67  | Fixed        | The action bar groups Armi, Incantesimi, Oggetti, Comuni (the group's name sits in its first slot, no extra width) with BG3 cost marks (● action, ▲ bonus, ◆ reaction) and a cost filter (Tutte / Azioni / Bonus / Reazioni; Reazioni lists the creature's reactions and how each answers, opening the sheet box). Livia's actions keep two rows at 1440. The quick bar page keeps two rows in the hotbar (page and tools, then the ten slots): nothing cut at 1440 × 900 (`16-quickbar-1440.png`). On a phone the filter hides so the strip shows actions first. |
| TV-74  | Fixed        | `combat.actionBlockReason`: spent or impossible actions are greyed with the reason (title, `aria-description`) before any click: «Azione già spesa.», «A 0 punti ferita non puoi agire…», «Incapacitata…», no slot, no ammunition. A click or tap says why instead of opening a preview. Off turn stays a hint only (moves can be compared), and so does Dash with the action spent (it is still a move within the remaining movement). Checked at 0 HP in the browser. |
| TV-80  | Fixed        | «Reazioni da scegliere» shows one reaction at a time; the simultaneous ones wait in line, named (DDB). Reach follows the scene's distance rule like every range check: on the SRD grid a diagonal neighbour is within 1.5 m, so Mira, diagonal to the Esploratore, now gets her opportunity attack (exact polygon clipping per grid rule). Test with two simultaneous opportunity attacks (order, then one at a time). |
| TV-48  | Fixed        | `D.turnLogOptions`: the end of a hidden creature's turn is a DM-only log line, in the tracker's «Turno successivo» and in the Table's «Termina turno» (shared edit `table.mjs`, see below). Checked: DM 13 «Turno concluso», player 12. |
| TV-64  | Fixed        | Dodge, Disengage, Shield and (in combat) Dash leave a timed effect with an icon badge on the token (map layer) and a row in «Effetti attivi» with its duration. |
| TV-84  | Fixed        | `expireTurnEffects` hands the expired effects to the tracker, which announces each once: a log line «Schivata di Livia è terminata» (DM-only for a hidden creature) and a toast, in a follow-up transaction that Undo of the turn change also removes (FG duration anchors, Clash! notice). |
| TV-85  | Fixed        | `combat-ui.renderActiveEffects(ctx, actorId)`: icon, source (SRD page), remaining duration; Concentration too. Shared edit `table.mjs` (inspector): replaces the ad-hoc Shield and Concentration notes («Scudo: CA 12 + 5» stays readable). |
| TV-89  | Partly fixed | Right click and long press (500 ms) on every attack of the action bar open the dice tray's roll menu look: «Tira con vantaggio / svantaggio / normale», which opens the attack with that mode (DDB). Checked with mouse at 1440 and touch at 390. Not offered: «Critico» (the engine decides a critical from the natural 20) and «visibilità» (who sees a Table attack follows the hidden-creature rules); the bar has no separate damage buttons. |
| TV-83  | Partly fixed | «Aggiungi bonus al tiro per colpire» in the attack detail (dnd5e situational bonus, BG3 Add Bonus): the bonus is part of the attack roll with its own line («Bonus aggiunto +2»). Not fixed: «Ispirazione: ritira» after an attack — the engine resolves hit and damage as soon as the d20 is in, so a reroll needs a hold step in `combat.mjs` resolution; the dice tray's own «Ripeti un dado · Ispirazione eroica» already covers checks requested at the Table (P3). |

## Shared edits into other packages' files

- `app.mjs` (P1) `startEncounter`: now `openTableInitiative(ctx, sceneId)` for every start (listed, TV-45). One import added; `expireTurnEffects`, used only there, left the `combat.mjs` import.
- `preparation.mjs` (P7) prepared-encounter «include» handler: the new participant's bonus is `initiativeBonus` (listed, TV-46). One import added. Note for P7: the sentence «Il bonus è dichiarato, non ricavato da una scheda incompleta» under the list is now out of date.
- `table.mjs` (P6) inspector: `renderActiveEffects` replaces the Shield/Concentration notes (listed, TV-85). **Not pre-listed:** the Table's «Termina turno» commit passes `turnLogOptions(ctx.state)` (TV-48). Without it the acceptance «hidden turns never appear in the player's log» fails whenever the DM ends a turn from the hotbar; it is one argument on one call. Two names added to the existing `combat-ui` import.
- `sheet-plus.mjs` (P2) `actionDetail` «table» handler: `prepareCombatAction` before navigating (listed, PG-69). One import added.
- `state.mjs` (P1): not edited (see TV-52, TV-59).

## Verification

- `node --test design/blueprint/tests/*.test.mjs`: 2228 tests, 2227 pass, 1 fail — `ia-consolidation`
  «sheet: D&D Beyond's seven sections» expects no `sheet-plus-notes` tab, which P2 added (not a P5
  file). Earlier in the session other packages' in-progress edits (table.mjs, styles.css, home,
  sheet) failed 4–9 other tests; they cleared as those fixers finished. All P5 tests pass.
- Journeys (`fix-P5/logs/`, run one per command, in background with a time limit):
  - pass: `p5-fix-journey` 7/7, `p5-fix-journey-2` 4/4, `combat-journey` (start through
    Preparation and the new dialog), `combat-tracker-journey` (all 11 groups incl. EN phone),
    `encounter-builder-journey`, `quickbar-journey`, `encounter-lifecycle`.
  - fail for reasons outside P5: `core-journey` stops at the sheet's «Vai al Tavolo» (P2 sheet),
    before combat; `reactions-journey` expects a click on the empty map to move the selected token,
    which P6 TV-01 changed («a click on the empty map clears the selection; nobody moves»);
    `combat-mobile-journey`'s short Dash lands at 0.8 m instead of 1.5 m and `multi-self-journey`'s
    Dash destination differs — both map-click/tap positioning, probably the same P6 movement change
    (the Dash itself works: Movement, action kept). The P5 reach change is checked by
    `tests/reactions.test.mjs`, `spatial-combat`, `character-reactions` (all pass) and
    `tests/p5-reactions.test.mjs`.
  - `encounter-builder-journey.js` (not a P5-listed file): one assertion read the old start
    dialog's plain `<ol><li>` names; it now reads the new dialog's included rows
    (`[data-ct-start-row].is-included .ct-start-who strong`). The order check itself is unchanged.
- EN: `17-start-dialog-en.png` (Start combat, Roll all, Roll NPCs, All set); the effects list and
  the announcements are tested in EN; the combat-tracker journey's EN phone group passes.
- Phone 390 × 844 touch: long press on an attack opens the roll options; no page overflow
  (`14`, `15`). The cost filter hides on a phone so the strip shows actions first.
- Side effect to report: re-running the existing journeys regenerates their fixed-name images —
  `2026-09-23/combat-result-desktop.png` (combat-journey) and seven `2026-09-25/B32/b32-0*.png` from
  a first `combat-tracker-journey` run that I stopped; later runs write under
  `fix-P5/journey-images/` (the runner `fix-P5/run-journey.sh` redirects image paths and drops a
  trailing `};` that the CLI cannot evaluate).
