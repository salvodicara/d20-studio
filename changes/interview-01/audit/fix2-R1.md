# Fix R1 (round 2): attack resolution at the Table — one roll engine for attacks, requests and campaign rules

Date: 27/09/2026. Fixer: R1 (Claude, subagent). Branch `codex/interview-01`, working tree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`, nothing committed. Browser
session `d20-fix2-r1`; evidence (screenshots, logs, journey copies, runner `run.sh`, summary
`sum.mjs`, copies of the owned files before the change in `before/`) in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R1/`.

## In breve (IT)

Al Tavolo un attacco ora tira davvero tutto quello che la scheda dice. Con Benedizione attiva il
d4 si lancia insieme al d20 ed entra nel totale, scritto nella carta («11 + [2] (Benedizione) + 5 =
18»); Anatema lo sottrae; vale anche per i tiri salvezza che il DM chiede e per quelli dentro un
incantesimo ad area. Se il personaggio ha l’Ispirazione eroica, l’attacco si ferma dopo il d20:
«Usa Ispirazione eroica: ritira il d20» oppure «Continua»; niente colpisce prima della scelta, il
ritiro spende l’ispirazione e il registro conserva entrambe le facce. Il clic destro (o la
pressione lunga sul telefono) su un attacco offre anche «Danno critico» (con il motivo che legge il
DM) e «Chi vede» (Tutti, Io e il DM, Solo il DM, Solo io): chi non può vedere legge «Risultato
riservato al DM». Il giocatore in «Tiri e risultati» vede solo i propri tiri e quelli che lo
riguardano, mai le richieste fatte alle creature del DM, e mai il vero nome di una creatura
travestita (anche nei tiri di prima). Un’arma forgiata +1 nell’inventario attacca con +1 al colpire
e ai danni, nominato. Il vantaggio homebrew (per esempio alle prove di Percezione) entra nel tiro
con il suo nome. Le regole della campagna ora si calcolano: con «Tattico» due alleati ai lati
opposti danno «Vantaggio: Fiancheggiamento (regola della campagna)»; con «massimo più un tiro» il
critico vale dadi al massimo più un tiro. Una cavalcatura controllata può solo Scattare,
Disimpegnarsi o Schivare nel turno di chi la cavalca. Il dado connesso (Pixels simulato) risponde
anche alla finestra dei tiri d’attacco. Chi guida la sessione al posto del DM chiede tiri e vede il
tavolo come il DM. Restano da fare altrove: il nome della Benedizione nel Registro, il «Solo il DM»
nel Registro e nei dadi 3D, e il testo ormai vecchio della scheda (vedi «Consegne»).

## Items

| ID              | Result                                                   | What changed (market pattern copied)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Where                                                                    |
| --------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| PG-47           | FIXED (Registro naming handed off)                       | Beyond20 per-character toggles, AboveVTT buff menu: the rider is in the roll, never a note. `ridersFor(state, actorId, kind)` reads `sheet-plus-domain.activeRiders`; `d20Fields` puts the d20s first, then each rider's dice (`dice[i].label` = rider name, `request.riders`), flat riders into the modifier as named sources. `requestScore(request, faces)` (exported) gives natural, `riderRolls` and total; `resolveRoll` uses it. Applied to Table attacks (`initializeAttack`), saves inside area attempts, DM requests (`enqueueRollRequest`, unless the caller passes `riders`) and Concentration saves (a saving throw). Card and history: «11 + [2] (Benedizione) + 5 = 18» (`renderBreakdown`); roll dialog: «d20 + d4 (Benedizione)» and one field «Dado 2 · d4 (Benedizione)»; the physical pre-dialog says «Lancia con il d20 anche: 1d4 (Benedizione)»; the detail formula «Tiro per colpire: d20 + 1d4 (Benedizione)»; `attackRiderRows` now says «Benedizione +1d4: si somma al tiro per colpire».                                                                                                                           | `combat.mjs`, `combat-ui.mjs`, `sheet-plus-domain.mjs`                   |
| TV-92           | FIXED                                                    | dnd5e request card (each row names its source). `projectAttempts` marks `own` (the viewer plays the attacker, a request's creature or a target; the session runner owns all); «Tiri e risultati» and its count list only `own` attempts, so a request to a DM creature never appears for the player. `conditionReasonsHTML`: «Effetti delle condizioni» only for condition rows (Exhaustion sources, condition Advantage/Disadvantage); plain bonuses (added bonus, a weapon's +1, flat riders, the sheet's parts, the critical maximum) are a list titled «Bonus» with rows «Bonus: Bonus aggiunto + 2»; homebrew modes go under «Motivi del tiro». The read-only `increment10-review` test keeps a visible DM creature's attempt in the projection (not `own`), so it was not weakened.                                                                                                                                                                                                                                                                                                                                                      | `combat.mjs`, `combat-ui.mjs`                                            |
| TV-141          | FIXED                                                    | Fantasy Grounds ID toggle, Foundry Anonymous. Attempts store the true name (`trueNameOf` through `conditions.disguises`) for actor, targets and outcomes; `projectAttempts` masks `actorName`, outcome and waiting names with `maskNames` for whoever does not run the session, retroactively; `displayName(state, actorId, role)` and `maskedFor` render request rows, roll dialogs, preview targets and the roll history. The DM keeps the true name.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `combat.mjs`, `combat-ui.mjs`                                            |
| TV-83           | FIXED                                                    | BG3 reroll with Inspiration; SRD 5.2.1 Heroic Inspiration (EN 8 / IT 8). `resolveRoll` sets `request.hold = "inspiration"` on an attack or a save inside a combat attempt when the roller has Heroic Inspiration (read from the dice tray's slice, the record `setInspiration` writes); `completeAvailableOutcomes` waits: no hit, no damage request. `useHeroicInspiration(state, attemptId, requestId, role, {face \| rollDie})` rerolls the lowest d20, keeps the new face, spends the inspiration (`{active:false, spentOn}`), records `inspirationReroll {from, to}` and releases; `continueWithoutInspiration` releases. The card opens by itself with «Usa Ispirazione eroica: ritira il d20» / «Continua» (physical: a dialog asks the new face), badge «Scegli: ritira o continua», the bar count includes the hold; the card reads «… · ritirato con Ispirazione eroica: 7 → 1». The log keeps both faces (two accepted rolls). Without inspiration nothing waits. DM requests (`roll-request`) keep R2's post-roll «Ripeti un dado».                                                                                                | `combat.mjs`, `combat-ui.mjs`, `combat.css`                              |
| TV-89           | FIXED (Registro/3D audience handed off)                  | D&D Beyond right-click on every roll («Crit», «Roll to»), Foundry roll modes. The action bar's right-click / long press menu (the tray's `dtray-menu` look) adds «Danno critico: i danni come colpo critico» and «Chi vede» with the tray's audiences (`audiencesFor`, `audienceName`: player Tutti · Io e il DM · Solo il DM · Solo io; DM Tutti · Solo DM); choices combine in the open preview, which mirrors them («Danno critico» switch with «Motivo del critico (lo legge il DM)», «Chi vede il risultato»). `selection.forceCritical`/`criticalReason`/`audience`; `attempt.audience`; a declared hit is a Critical Hit (`criticalReasons: ["declared"]`), the log label reads «Tentativo registrato · danno critico dichiarato: <motivo>». `canSeeAttemptValues(state, attempt, role)` (public all; gm roller + runner; blind runner; self roller): projections and the roll history drop faces and totals («Risultato riservato al DM», «Tiro privato di chi tira»), outcomes keep what happened to the viewer's own creature; «Solo io» commits privately (log label and rolls stay with the roller); the card shows «Chi vede: …». | `combat.mjs`, `combat-ui.mjs`, `combat.css`                              |
| BI-24           | FIXED (C11 engine side; forged ranged weapons not yet)   | FG Forge, dnd5e Enchant, dnd5e «each weapon item carries its attack». `srd-sample.rowWeapon(row, library)` resolves an inventory row's weapon (SRD row, or a forged homebrew copy's revision over its SRD base); `activeItemModifiers(actor, library)` adds `attack`/`damage` targets (a row's own modifiers or the forge's +N). `listActions` builds an attack for every equipped melee weapon no area lists (`item-attack.<row>`: Strength or the better of Str/Dex with Finesse, Proficiency by class table, Versatile grip, active mastery via `special-moves-domain.masteryOf`, `attackParts`), and gives every item attack its `itemBonuses`; `initializeAttack` adds them to attack and damage, named as `kind:"item"` sources («Bonus: Spada lunga +1 + 1»); the detail formula «1d8 + 1 (Spada lunga +1)»; the sheet's `sheetAttacks` shows the same to-hit and damage. The configured profile stays (beside inventory weapons, as before).                                                                                                                                                                                           | `srd-sample.mjs`, `combat.mjs`, `combat-ui.mjs`, `sheet-plus-domain.mjs` |
| BI-18           | FIXED (C11 engine side)                                  | Roll20 Modifier Builder, DDB modifiers. `sheet-plus-domain.homebrewRollModes(state, actorId, test)` reads the homebrew area's applied entries (slice read, as `conditions.disguises` does): mode advantage/disadvantage on `skill:<id>`, `check:<ability>` (skills and Initiative included), `save:<ability>`, `saves`, `initiative`, `attack`; skips entries suspended by the campaign's safe mode, modifiers with a written condition, timed ones not active. Merged into `testConditions` and the sheet's attack conditions (so tray, sheet, quick bar and DM requests combine them with `combineModes`) and into the Table's attack reasons and area saves («Svantaggio: Occhio di falco (homebrew)»).                                                                                                                                                                                                                                                                                                                                                                                                                                     | `sheet-plus-domain.mjs`, `combat.mjs`, `combat-ui.mjs`                   |
| H-01 (R1 part)  | FIXED                                                    | BG3 Custom Mode, Solasta presets, computed by the engine (C7, `policyOf`). `criticals: "max"`: one set of damage dice plus their maximum (`kind:"critical-max"` source «Colpo critico: dadi al massimo (regola della campagna)»), card «Critico (…) · dadi al massimo più un tiro (regola della campagna)». `flanking: "advantage"`: a melee attacker has Advantage when a conscious (not Incapacitated, HP > 0) ally of its team stands adjacent to the target and the line between the two centres crosses opposite sides or corners of the target's space (`flankingAlly`, `oppositeSides`), reason «Fiancheggiamento (regola della campagna)». House-rule source, no SRD page.                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `combat.mjs`, `combat-ui.mjs`                                            |
| CA-71 (R1 part) | PARTLY FIXED (C1 consumed; R7's `dc` switch not present) | FG hidden DC. `dcShownTo(state, role)` reads `disclosureOf(state).dc`; for players with `"hidden"` `projectAttempts` removes `dc` and sets `dcHidden`; cards and roll dialogs read «CD nascosta» (or «CD 12»), success or failure still shown; the DM request's roll dialog now names its card and DC. B40's own `dcHidden` requests use the same text. Until R7 adds the `dc` row the default «shown» holds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `combat.mjs`, `combat-ui.mjs`                                            |
| TV-95 (R1 part) | FIXED (C6 consumed)                                      | Foundry roll resolver with Pixels. The attempt's «Risolvi tiro» offers «Dado connesso» when `dice-tray.hasConnectedDie` holds for every die; submitting keeps the dialog, shows «In attesa del dado connesso…» and awaits `awaitConnectedFaces` group by group (d20, then a rider's die); the faces land physical with `faceModes` and `devices` (the die names itself); a silent die says «scegli «Fisici» e inserisci le facce».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `combat-ui.mjs`                                                          |
| PG-79 (R1 part) | FIXED (C10 consumed)                                     | SRD 5.2.1 Mounted Combat (EN 15–16 / IT 17), BG3 greyed actions. With `special-moves-domain.mountControl(state, mountId).controlled` the mount acts on its rider's turn (`actsNow`) and every action but Dash, Disengage and Dodge is greyed before any click with «Cavalcatura controllata: nel turno di chi la cavalca può solo Scattare, Disimpegnarsi o Schivare (Combattimento in sella). Per agire da sola, rendila indipendente.»; an independent mount keeps its turn and all actions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `combat.mjs`                                                             |
| CA-57 (R1 part) | FIXED (C3 consumed)                                      | Owlbear GM hand-off. `sessionAuthority(state, role)` (= `session-view.runsSession`, default `role === "dm"`) replaces the DM-power checks: projections of hidden creatures (`visible`; the rules' sight uses `publicly`, so a hand-off never changes who can see whom), roll requests (`enqueueRollRequest`, `acceptedBy` = the runner), simultaneous reaction order, legendary resistance on the card, the roll history, DC and names. Identity checks unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `combat.mjs`, `combat-ui.mjs`                                            |
| SV-37 (R1 part) | FIXED                                                    | Roll20 errors that name cause and fix. The detail's disabled «Lancia …» points (`aria-describedby="combat-execute-reason"`) at the reasons list (or «La mossa non è ancora pronta: completa la scelta nella mappa o qui sopra.»); the movement buttons of a creature the viewer does not control and the order's first «Anticipa» / last «Posticipa» carry a linked sentence (reaction-ui). Test `r1-reasons`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `combat-ui.mjs`, `reaction-ui.mjs`                                       |

## Contracts

- **Provided C11 (engine side)**: homebrew Advantage/Disadvantage (BI-18) and a forged weapon's
  attack and damage bonus (BI-24) are applied by the engine; R6 can now declare both
  «Automazione completa» in `homebrew-editor-domain` (remove «scegli Vantaggio o Svantaggio quando
  tiri» and «Bonus dell’arma: aggiungili al tiro al Tavolo»).
- **Provided C14**: `sheet-plus-domain.statValue` unchanged (signature and `total`).
- **New exports** (for other packages): `combat.mjs` `neighboursReady`, `sessionAuthority`,
  `campaignRules`, `dcShownTo`, `displayName`, `maskedFor`, `requestScore`, `hasHeroicInspiration`,
  `useHeroicInspiration`, `continueWithoutInspiration`, `canSeeAttemptValues`, `ROLL_AUDIENCES`;
  projection fields `own`, `audience`, `declaredCritical`, request `riders`/`riderRolls`/`hold`/
  `inspirationReroll`/`hiddenResult`/`dcHidden`, dice group `label`. `combat-ui.mjs`
  `neighboursReady`. `srd-sample.mjs` `rowWeapon`, `activeItemModifiers(actor, library)`.
  `sheet-plus-domain.mjs` `homebrewRollModes`.
- **Consumed**: C1 `campaign-settings-domain.disclosureOf(state).dc` (present function, `dc` row
  not yet: default shown); C3 `session-view.runsSession`; C6 `dice-tray.awaitConnectedFaces`,
  `hasConnectedDie`; C7 `campaign-settings-domain.policyOf` (`criticals`, `flanking`); C10
  `special-moves-domain.mountControl`. All are areas: `combat.mjs` and `combat-ui.mjs` load them by
  dynamic import with the stated defaults (DEVELOPMENT.md, W2b1), never statically.

## Consegne (outside R1's files)

- **R4 `state.mjs`**: the combat roll evidence should copy `request.riders`/`riderRolls` (PG-47:
  «+ [3] (Benedizione)» in the Registro card) and `attempt.audience` (TV-89: the Registro and the 3D
  dice can then hide a «Solo il DM» roll from its roller; today a blind roll's faces reach the
  roller's Registro, and «Io e il DM» is shared in the log — equal in the two-identity demo).
- **R2 `chat-domain.mjs` / `dice-3d*.mjs`**: render a dice group's `label` («1d20 + 1d4
  (Benedizione)») and hide combat rolls by `combat.canSeeAttemptValues`. **R2 `roll-requests.mjs`**
  `rerollRequest` must score with `combat.requestScore` (the d20s are `dice[0]`, rider faces
  follow); **R2 `dice-tray.mjs` `askRequestFaces`** labels every face «d20»: with Bless the second
  field is a d4 (`row.dice[i].sides`, `label`).
- **R4 `sheet-plus.mjs`**: the Table panel's «Il motore del Tavolo non somma ancora il dado
  dell’effetto: tiralo qui e il DM lo conta.» is now false; also `sheet-plus-journey.js` (R4, stale)
  expects the old rider row text at line 728.
- **R6 `homebrew.mjs` `rowDefinition`**: a forged weapon row could carry its `weapon` data and base
  `srdId`, so B36/B40 list forged ranged and thrown weapons with ammunition and throws (the core
  builds forged melee weapons only; a forged bow is not an attack yet). Then C11 labels.
- **Palette (triage rule 3)**: R1's files are core modules without a registry `register`, so no
  palette command was added; «Danno critico» and «Chi vede» are also visible fields of every attack
  detail (the right-click menu mirrors them), the Heroic Inspiration choice opens by itself. A
  command «Danno critico / Chi vede» would belong to an area (for example B23's palette owner).
- **Coordinator (DEVELOPMENT.md)**: the contract lines above; «Tiri e risultati» lists `own`
  attempts; the hold step; audiences; neighbours of `combat.mjs`. Observed, pre-existing and not
  changed: with an attack preview open, clicking one's own token targets oneself.

## Tests

- New: `tests/r1-attack-engine.test.mjs` (14: Bless/Bane in attack totals and with Advantage;
  Bless in a requested save, not in a check; TV-92 `own`; disguised Sentinella before and after;
  hold, reroll, both faces in the log; «Continua» and no hold without inspiration; declared critical
  and blind projection; forged +1 longsword attack, damage, sheet; homebrew Advantage on Perception,
  attack Disadvantage, safe mode; criticals max; flanking on, off, not opposite, unconscious ally; C1
  default; C3 runner; C10 controlled mount), `tests/r1-table-ui.test.mjs` (9: card and dialog
  riders, «Bonus» list, hold buttons, right-click menu and detail, blind card, player's list without
  DM requests, «CD nascosta» card and dialog, forged sword formula and Versatile grip, EN texts),
  `tests/r1-reasons.test.mjs` (2: SV-37 detail and order dialog).
- Existing R1-owned tests unchanged and green (`combat`, `combat-ui`, `combat-evidence`,
  `reactions`, `character-reactions`, `p5-reactions`, `p5-actionbar`, `p3-roll-engine`,
  `srd-sample`, `cover`); read-only cross-cutting tests green (`increment10-review` included).
- Full suite (`logs/suite-final.log`, 200 s alarm, 17 s): **2472 tests, 2457 pass, 15 fail**. The 15
  failures are other packages' work in progress (`campaign-data` 6, `campaign-settings` 2, `media`
  1, `party` 1: R4's new sample creatures, scene and spells; `forms-ui` 5: `insertAdjacentHTML` in
  R3's `forms-ui.mjs`). The same 15 fail in a scratch copy of the tree with R1's seven files
  restored from `before/` (`logs/others-with-R1-reverted.log`), so none comes from R1.

## Journeys (browser, `d20-fix2-r1`, one per command, 240 s alarm)

- `r1-attack-journey.js` — PASS: Bless on in Livia's sheet; Fire Bolt on the Sentinella: detail «Tiro
  per colpire: d20 + 1d4 (Benedizione)», card «11 + [2] (Benedizione) + 5 = 18»; Livia's actions in
  2 rows at 1440 and 1366, IT and EN; Heroic Inspiration: the attack stops after the d20 (no hit, no
  damage), the card opens by itself with «Usa Ispirazione eroica: ritira il d20» and «Continua», the
  reroll keeps the new face, spends the inspiration, the log holds both faces.
- `r1-privacy-journey.js` — PASS: Livia hits the Sentinella; the DM hides its name from the token
  menu; the player's list reads «Creatura sconosciuta 1» on the older card, the DM's «Sentinella»;
  the DM asks the Sentinella and Livia for a DEX save (DC 12): the DM's list has 2 request cards,
  the player's only «Livia · Richiesta del DM · Tiro salvezza su Destrezza» (· CD 12).
- `r1-menu-journey.js` — PASS: 1440 right-click on Fire Bolt: 3 modes, «Danno critico», «Chi vede»
  (Tutti, Io e il DM, Solo il DM, Solo io); «Solo il DM» + «Danno critico» («Colpo alle spalle»):
  player card «Risultato riservato al DM», DM card with the d20, log label with the reason; the DM's
  «Solo DM» shortbow attack of Goblin guerriero A on Livia: no roll in the player's Registro, the
  player's card without dice; 390 touch long press: the same menu inside the screen, «Danno critico»
  ticks the detail, page width 390.
- `r1-rules-journey.js` — PASS: DM picks «Tattico»; Sentinella between Livia and Doran (positions set
  in the saved example): «Tiro con vantaggio · Vantaggio: Fiancheggiamento (regola della campagna)»;
  EN «Advantage: Flanking (campaign rule)»; Doran beside, not opposite: no reason.
- `r1-connected-journey.js` — PASS: palette «pixels», pair Onice; Fire Bolt with physical dice; «Risolvi
  tiro» offers «Dado connesso», R2's resolver waits, «Simula il lancio»: card «N + 5 = T», mode
  physical, face origin connected, device «Pixels d20 Onice».
- Existing journeys of the touched areas: `p5-fix-journey` (7), `p5-fix-journey-2` (4),
  `p3-roll-engine-journey` (9), `p3-privacy-journey` (7) PASS. `combat-journey`,
  `concentration-journey`, `dice-correction-journey` stop at «Incontro preparato» (P5's start
  dialog replaced that path; many other journeys use it); `inventory-plus-journey` stops at «Copy
  reason» (its own dialog text) after 4 passed steps; `special-moves-journey` at «walked next to the
  fountain» (scene data). The four stale journeys triage2 assigned to R1 (`reactions`,
  `combat-mobile`, `multi-self`, `approach`) were not edited: this run's reserved files exclude them.

Screenshots: `images/r1-01-bless-card-it-1440.png` … `images/r1-15-connected-recorded-it-1440.png`
(hold `r1-03`, reroll `r1-04`, disguise `r1-05`, requests `r1-06`, menu `r1-07`, blind card `r1-08`,
DM-only log `r1-09`, long press `r1-10`, flanking `r1-11`, phone detail `r1-12`, connected die
`r1-13`–`r1-15`); superseded attempts in `images/earlier-attempts/`.
