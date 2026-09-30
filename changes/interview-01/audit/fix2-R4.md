# Fix round 2, package R4: sheet, hotbar, inventory and sample data

Date: 27/09/2026 (machine clock 25/09). Fixer: R4 (Claude, subagent). Branch `codex/interview-01`,
working tree `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`, nothing committed.
Browser session `d20-fix2-r4`; evidence in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R4/` (`shots/`,
`logs/`, `probe-r4-phone.js`, `run.sh`, `copies/`, `images/`).

## In breve (IT)

Nell'esempio c'è una seconda scena, «Agguato sulla strada», che non è quella attiva: il cortile
dell'osservatorio resta com'era. Lì il gruppo incontra due Goblin guerrieri identici del SRD
(«Goblin guerriero A» e «B»), ciascuno con scimitarra e arco corto del proprio blocco: con la
regola della casa «turno di gruppo» il DM li fa attaccare insieme con «Attacco di gruppo», un tiro
ciascuno, frecce consumate. Mira (Druida 3) ha ora i suoi incantesimi preparati del SRD e gli slot
del livello 3: lanciare «Luminescenza» dalla scheda mette la concentrazione (chip «(C)») e un
danno chiede il tiro salvezza su Costituzione. Nella barra rapida c'è la casella «Forma
Selvatica» con gli usi rimasti; a lupo diventato si legge «Torna alla forma originale». La barra
rapida tira prove, tiri salvezza e abilità con lo stesso motore della scheda (Avvelenato = due d20
e vale il più basso, Indebolimento, Benedizione e Anatema). La finestra di tiro della scheda si
apre già con lo svantaggio quando serve. Cliccare l'Iniziativa della scheda mentre il combattimento
la aspetta la manda al tracker. Bere una pozione segue la regola della campagna (azione bonus o
azione) e il pulsante spento dice perché. «Apri un Bastione…» si trova cercando bastione, basi o
turno delle basi anche dalla Home. L'Inventario non esce più dal telefono con testo grande. I
pulsanti spenti dei miei file dicono causa e rimedio.

Resta aperto un punto che dipende da R5: nella finestra «Avvia combattimento» i due goblin sono
ancora due righe con due tiri; la chiave per un tiro solo c'è già nei dati (vedi sotto).

## Items

| ID             | Result            | What changed (market pattern)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TV-52          | PARTIAL (R5 part) | Improved Initiative plain labels. `state.mjs` `seedDemoAmbush`: additive scene `road-ambush` «Agguato sulla strada» (not active; `old-watch`, its tokens and `combat.order` unchanged) with Livia, Doran, Mira and two identical SRD Goblin Warriors `goblin-warrior-a/-b` («Goblin guerriero A/B», HP 10, AC 15, `compendiumRef` `srd2024:creature:goblin-warrior`, team watch, 0 HP → death). Both carry one shared row key (`encounterBlock.rowId` `sample-road-goblins`), so `encounter-builder-domain.initiativeKeyOf` gives them one key and `sortParticipants` keeps them together; the tracker groups them by plain name. **Not done:** the Table's «Avvia combattimento» dialog (`combat-tracker-domain.startCandidates/rollStartRows`, R5) still shows one row and one d20 per goblin: verified in the browser, «Tira tutti» rolled each separately. Fix for R5: merge start rows by `initiativeKeyOf` (one row «Goblin guerriero A, B», one d20 recorded for each member). |
| TV-59          | FIXED             | Mob Attack Tool. Each goblin has the stat block's Scimitar as its structured melee attack (`srdMeleeProfile`: +4, 1d6+2 slashing, SRD source) and an equipped SRD Shortbow with 20 arrows that the Inventory area turns into a Table attack (Dex + proficiency +4, 1d6+2 piercing, 24/96 m, ammunition spent). Browser (DM): activate «Agguato sulla strada», «Avvia combattimento», «Tira tutti», «Inizia»; on a goblin's turn the dialog explains the 2024 baseline and «Attiva il turno di gruppo…»; with the house rule on, the next goblin turn's «Attacco di gruppo» lists both («· Arco corto») and «Attacca» makes two attempts (17 hit → Livia's Shield offer; 10 miss), arrows 20 → 19 each (`shots/05–07`).                                                                                                                                                                                                                                                                |
| TV-79          | FIXED             | dnd5e concentration request + FG (C) effect. `state.mjs` `seedDemoSpells`: Mira (Druid 3) prepares 2 cantrips (Druidcraft, Produce Flame) and 6 spells (Cure Wounds, Entangle, Faerie Fire, Healing Word, Moonbeam, Lesser Restoration) plus Speak with Animals always prepared (Druidic, SRD EN 42 / IT 48), SRD rows with `compendiumRef`; her Druid 3 slots (4 × 1st, 2 × 2nd) and forms/companion fixtures unchanged. Browser (player): Magie › Luminescenza › «Lancia ▾» › 1° › «Lancia» → slot 3 → 2 and the «(C) Luminescenza ×» chip on the HP card; «Danno» 5 → a pending CON save DC 10 (`shots/08–11`).                                                                                                                                                                                                                                                                                                                                                                    |
| PG-77 (part)   | FIXED             | C9, BG3 class actions on the hotbar. New quick bar slot kind `feature` (`quickbar-domain`: `limitedFeature`, `isWildShapeSlot`, `featureReturns`, `featureUses`, `useFeature`; tray/add group «Capacità di classe»). Mira's bar seeds «Forma Selvatica» in slot 4 with «1/2» uses; click → `ctx.openForms(actorId, "forms")`; transformed → the slot reads «Torna alla forma originale» and runs `forms-ui.openFormReturn`. Second Wind / Action Surge spend one use of the sheet's counter (same `spendFeatureUse` as the sheet's «Usa»); spent → greyed with the reason. Browser: slot at 1440 (hotbar 113 px, also in combat) and 390 touch (`shots/12–15`, `21`).                                                                                                                                                                                                                                                                                                                 |
| TV-46 (part)   | FIXED             | C8, D&D Beyond sheet roll → tracker. `sheet-plus` loads `combat-tracker.rollOwnInitiative` + `combat-tracker-domain.awaitsInitiative` by dynamic import at registration (optional neighbour). While awaited, the Initiative pill opens the roll window («Il combattimento aspetta la tua iniziativa…», «Tira l’iniziativa»): digital, or physical with the kept d20 (`{mode, natural, advantage}` with the engine's mode, Poisoned included); a favourite Initiative rolls digitally into the tracker. Otherwise the pill keeps the details window. Tested with R5's real functions (roll call → Livia's sheet roll → participant natural 17).                                                                                                                                                                                                                                                                                                                                        |
| H-01 (part)    | FIXED             | C7 potions (BG3 Custom Mode, Solasta presets). `inventory-plus-domain.potionCost(state)` reads `campaign-settings-domain.policyOf(...).potions`; `beginHealing(..., {cost})` spends the Bonus Action (SRD) or the Action (house rule); the «Bevi» dialog says «1 pozione + azione» and names the house rule; `potionBlock` greys «Bevi» (inventory, sheet actions, legacy inventory) with «Azione già spesa in questo turno: per la regola della campagna…» / «Azione bonus già spesa…»; the sheet lists the potion under «Azione». Browser: DM sets «Bere una pozione» to Azione; Livia drinks on her turn → Action spent, Bonus kept, «Bevi» greyed with the sentence (`shots/16`). Export `characters.usePotion(ctx, actorId, itemId)`. R7 can now rewrite the rule's `consumer` text.                                                                                                                                                                                             |
| H-02           | FIXED             | D&D Beyond one engine. `quickbar-domain.stepPlan` builds check/save/skill steps from `sheet-plus-domain.rollProfile` + `effectiveRollMode` (Poisoned Disadvantage, Exhaustion in the modifier, roll policy, auto-fail refusals); Bless/Bane dice follow the d20s with their sign (`resolveStep`, `planText`); the physical faces dialog names the condition and the rider die. Saved formula slots («1d20+5») stay plain saved rolls.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| H-03           | FIXED             | The sheet's roll window opens on `effectiveRollMode(profile, "normal")`: under Poisoned «Svantaggio» is checked and both d20 fields show for physical dice, with «Scelto dalla scheda: svantaggio». The stat tooltip and window already listed `conditionParts` (Exhaustion) via P2's extra parts; now covered by a test.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| H-07 (part)    | FIXED             | Palette «Apri un Bastione…» (`sheet-plus.bastion`, keywords bastione, bastioni, basi, base, turno delle basi, strutture, ordini, fortezza) works with no character in context: the sheet in view with a Bastion tab, else the only such character, else a picker (`bastions.openBastion`, with «Basi del gruppo»), else the party «Basi e bastioni». DM from Home → party bases (Iria is private); player → Iria's Bastion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| X-04           | FIXED             | IA regression rule. `inventory-plus.css` ≤ 560 px: `.invp-cols` takes its own line (`flex: 1 1 100%`, `min-width: 0`, no 52 px margin, wraps), `.invp-col` `min-width: 0`. Probe 390 × 844 touch at 150 % text + 125 % interface: Inventory scrollWidth 390 for player and DM, IT and EN (`logs/probe-r4-phone.log`, `shots/20-*`). The 1440 columns keep 52 px (a percentage there clipped «Cariche»; caught and reverted).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| SV-37 (part)   | FIXED             | Roll20 cause + remedy. Every disabled command in `characters`, `sheet-plus`, `quickbar`, `inventory-plus`, `merchants`, `party-stash` (already), `projects`, `rest-ui`, `travel`, `generators` has an `aria-describedby` sentence («Livello massimo raggiunto (20)…», «Nessun uso rimasto…», «Tutta la quantità è già nel carrello…», «Nessun Dado Vita rimasto…», «Hai cambiato le scelte: rivedi l’anteprima…», «Razioni finite…», «L’incontro è vuoto…», «In corso…»); read-only viewers see Inspiration and effect switches as text. `tests/r4-reasons.test.mjs` scans the package's sources and renders disabled states.                                                                                                                                                                                                                                                                                                                                                         |
| Stale journeys | FIXED             | `sheet-plus-journey.js` (AC 13/14 with the cloak, DEX save +3, favourites roll at once PG-39, generic actions as one line of links, notes in «Note», Bless preview «d20 + 1d4 (Benedizione)» by hovering the target, «Forma Selvatica» entry, inline glossary terms exempt from the 40 px count) and `projects-journey.js` («Apri il Ricettario» page, trailing `;` removed): both PASS. Also `inventory-plus-journey.js` (new copy reason text) and `quickbar-review-journey.js` (Mira's slot 4 is Wild Shape).                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Tests

- New: `tests/r4-sample-data.test.mjs` (7), `r4-potions.test.mjs` (5), `r4-quickbar-engine.test.mjs`
  (7), `r4-sheet-rolls.test.mjs` (6, one with R5's real tracker), `r4-bastion-command.test.mjs` (3),
  `r4-reasons.test.mjs` (6), `r4-phone-fit.test.mjs` (1): 35 tests, all pass.
- Full suite (`logs/suite-final.log`): 2477 tests, 2461 pass, 16 fail. None fails in an R4-owned
  test. The 16:
  - **Caused by the new sample data, cross-cutting (owners must update the expectations):**
    `campaign-data.test.mjs` (R7) lines 118 (creatures add `goblin-warrior-a`, `goblin-warrior-b`),
    151 (`droppedTokens` 2 → 4), 231 (`copy.scenes.length` 1 → 2), 317 (`preview.counts.scenes`
    1 → 2), 370 and 516 (copies 3 → 5); `campaign-settings.test.mjs` (R7) 531 (changes add the two
    goblin warriors) and 1219 («4 creature cambieranno su 2 scene: Sentinella, Esploratore, Goblin
    guerriero A, Goblin guerriero B»); `media.test.mjs` (R3) 394 (Livia's token row «· Il cortile
    dell’osservatorio, Agguato sulla strada»); `party.test.mjs` (R7) 293–301 (levels `[0, 1, 2]`,
    `without` `["doran"]`: Mira now has spells, TV-79).
  - **Not R4:** `forms-ui.test.mjs` ×5 (`n.insertAdjacentHTML is not a function`, R3's in-flight
    SV-37 edit in `forms-ui.mjs`); `campaign-settings.test.mjs:221` (`legacy-2014` «available»,
    R7's in-flight C4).
- Journeys, own session, one per command with a 240 s alarm (`logs/summary.log`): PASS
  `sheet-plus`, `projects`, `p4-inventory`, `inventory-plus-review`, `p4-shared`, `p3-roll-engine`,
  `p4-shop`, `generators`, `p4-rest`, `rest-shared`, `rest-time`, `travel`, `loot`. Blocked by
  another package: `quickbar-journey`, `quickbar-review-journey` (past the R4 steps),
  `inventory-plus-journey` (step `combat-start`), `core-journey`, `travel-review-journey` all wait for
  Preparation's «Incontro preparato» / `[data-prep-include]` flow that R5 (PR-32) is changing;
  `party-journey` (R7) fails «Casters without spells not listed» because Mira now has spells.
- Browser as a first-time user (IT 1440 and 390 touch): the acceptance flows above; screenshots
  `shots/01–17`, `20–21`; no page errors in the probe.

## Notes for other packages and the coordinator

- **R5:** the Table start dialog should merge rows with the same
  `encounter-builder-domain.initiativeKeyOf` (SRD EN 13 / IT 14; Improved Initiative / Foundry
  group roll): the two sample goblins already share `sample-road-goblins`. Also: importing
  `encounter-builder-domain.mjs` before `preparation.mjs` now throws `Cannot access 'ID' before
initialization` (`encounter-builder.mjs:33`, cycle preparation ↔ encounter-builder);
  `r4-sample-data.test.mjs` imports the tracker first to avoid it.
- **R7:** C7 potions are now computed; the «Bere una pozione» rule's `consumer` text can name the
  engine. Update the expectations listed above in `campaign-data`, `campaign-settings`, `party`
  tests and `party-journey.js`.
- **R3:** `media.test.mjs` line 394 expectation (second scene with Livia's token).
- **Coordinator / DEVELOPMENT (not an R4 file):** new contracts: `state.AMBUSH_SCENE_ID`,
  `AMBUSH_GOBLINS`, `seedDemoSpells`, `seedDemoAmbush`; `inventory-plus-domain.potionCost/potionBlock`;
  `characters.beginHealing(..., {cost})`, `characters.usePotion`; `quickbar-domain` slot kind
  `feature`, `resolveStep`, `planText`, `limitedFeature`, `isWildShapeSlot`, `featureReturns`,
  `featureUses`, `useFeature`; `sheet-plus.neighboursReady()`; `bastions.bastionTargets/openBastion`.
  Saved local states made before this change keep their data (the scene and spells seed only a
  fresh or reset example).

## Files changed

`design/blueprint/`: `state.mjs`, `characters.mjs`, `characters.css`, `sheet-plus.mjs`,
`sheet-plus.css`, `quickbar.mjs`, `quickbar-domain.mjs`, `quickbar.css`, `bastions.mjs`, `projects.mjs`,
`inventory-plus.mjs`, `inventory-plus-domain.mjs`, `inventory-plus.css`, `merchants.mjs`, `loot.css`,
`rest-ui.mjs`, `rest-ui.css`, `travel.mjs`, `exploration.css`, `generators.mjs`, `generators.css`;
new tests `tests/r4-*.test.mjs` (7 files). Journeys in `changes/interview-01/blueprint-checks/`:
`sheet-plus-journey.js`, `projects-journey.js`, `inventory-plus-journey.js`,
`quickbar-review-journey.js`. Not touched: `crafting.mjs`, `party-stash.mjs`, `loot.mjs`, `camp.mjs`,
`rest-time.mjs`, `rest-profile.mjs`, `travel-domain.mjs`, `generators-domain.mjs`, `projects.css`.
