# Residuals of re-audit 3 — closed by one writer (interview-01)

Date: 29/09/2026. Single writer for the residuals left by `reaudit3-a.md`, `reaudit3-b.md` and
`reaudit3-c.md` (Claude, subagent). Branch `codex/interview-01`, working tree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`, nothing committed. Browser session
`d20-residual`; evidence (one short script per check `*.src.js`, its output in `logs/<name>.log`,
screenshots `*.png` and `images/`, the journey runner `run.sh` and its `logs/summary.log`, the text
sweeps `logs/sweep-*.log` with `analyze.py`) in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-29/residual/`.

## In breve (IT)

Tutti gli otto residui sono chiusi e provati nel browser come farebbe chi apre l'app la prima volta,
più le tre piccole osservazioni del gruppo C.

- **Incantesimi 2014 da soli (PG-53).** Spegnendo «SRD 2024» e lasciando «Legacy 2014», la lista di
  classe mostra solo le versioni 2014 (4 per Livia), ognuna con «Impara/Prepara» e «Preferisci la
  2014». Prima diceva «Nessuna magia con questi filtri». Come i filtri delle fonti di D&D Beyond.
- **Arma forgiata (BI-24).** La Spada lunga +1 di Doran colpisce a **+3** (Forza +0, competenza +2,
  arma +1), non più a +1: la scheda legge «Tiro per colpire con Spada lunga +1 +3» e al Tavolo
  «Attacco 17 + 3 = 20».
- **Pacchetti di compatibilità (BI-45).** Un pacchetto abilitato dal DM ora si usa davvero: la
  «Lanterna vagante · GS 1 · pacchetto, p. 42» è nel bestiario del Tavolo e arriva sulla mappa con
  PF 22, CA 13 e il suo attacco «Vampata»; la ricerca della Biblioteca e la ricerca rapida trovano le
  voci e aprono il pacchetto; il costruttore offre «Custode del faro · pacchetto, p. 60» tra le
  sottoclassi del Mago. Come i pacchetti di compendio di Shard e Foundry. Resta aperta la decisione
  del proprietario sui contenuti veri (è una simulazione, I-233).
- **Attacco di gruppo (TV-59).** Se il DM attiva il «turno di gruppo» proprio durante il turno del
  primo goblin, vale subito: la finestra elenca entrambi i goblin, ciascuno attacca, e «Turno
  successivo» passa l'intero gruppo. Il secondo goblin non perde più il turno. Come Mob Attack Tool.
- **Goblin uguali (TV-52).** Nella finestra «Avvia combattimento» la riga «Goblin guerriero A, B» ha
  la spunta «Un solo tiro per il gruppo» con la fonte (SRD EN 13 / IT 14): togliendola i due goblin
  tirano separati, rimettendola tornano una riga. Come Improved Initiative e D&D Beyond.
- **«Applica a una scheda…» (X-A1).** Ogni scheda dice cosa manca: «Doran · prima: «Abilita in
  campagna» · «Condividi in lettura con i giocatori»». Se si prova lo stesso, il rifiuto è in una
  lingua sola e nomina gli stessi passi. Dopo i due pulsanti la scheda è «prerequisiti soddisfatti»
  e l'arma arriva. Come la condivisione homebrew con la campagna di D&D Beyond.
- **Inglese nell'interfaccia italiana (X-A2).** «Annulla anteprima», «Anteprima · nessun consumo»,
  «Gittata 1,5 m», la nota di Doran solo in italiano, la provenienza «Spada lunga + Arma +1», i
  nomi dei privilegi di classe dell'SRD italiano (Incantesimi, Adepto dei rituali, Recupero arcano…
  115 nomi), «Padronanza» per la weapon mastery (in italiano «Maestria» è Expertise), «Dispensa» al
  posto di «Handout», «Modello» al posto di «preset». Una scansione di circa 140 viste per lingua (DM e giocatore) non
  trova altre parole d'interfaccia nell'altra lingua: restano solo contenuti d'esempio scritti in
  italiano e il nome originale inglese che il Compendio mostra apposta sotto quello italiano.
- **Variante di classe (X-A3).** «Struttura del Mago (SRD)» parte con i nomi dei privilegi di ogni
  livello della tabella (solo nomi, niente testo SRD) e si salva al primo «Salva».
- **Piccole osservazioni.** La finestra per cedere il ruolo di DM dice «Livia, Mira · Giocatore»
  invece di «Giocatore · Giocatore»; le frecce disattivate a fine elenco mostrano il motivo anche al
  passaggio del mouse; nei materiali del DM la copia di una dispensa legge «Per: Tutto il gruppo ·
  mai mostrata».

Suite Node: **2558/2558** (erano 2543; 15 test nuovi). Percorsi nel browser: i due nuovi
`residuals-a` e `residuals-b` passano; quelli delle aree toccate sono elencati sotto.

## Results

For the eight residuals the test was written first and seen failing on the tree before the change;
then the browser check as a first-time user (visible labels only) in `d20-residual`. The X-A2
regression test and the CA-57 label test were written together with their change; the disabled-arrow
tooltips have no unit test (browser and markup only).

| ID    | Market pattern copied (census reference)                                                                                              | What changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Browser evidence                                                                                                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-53 | D&D Beyond «Manage Spells» source toggles, Legacy badge (DDB-043)                                                                     | `spells-plus.mjs` `classTab`: with «SRD 2024» off the 2014 rows are listed on their own (`.spl-legacy-row.is-alone`), each with the spell's own learn/prepare control and «Preferisci la 2014»; both chips off keeps the honest empty line.                                                                                                                                                                                                                                                                                                     | `logs/pg53.log`, `pg53-legacy-only.png`: 4 legacy rows, 0 SRD rows, «Dardo di fuoco … Conosciuto · Preferisci la 2014»                                                                                                                                                              |
| BI-24 | FG Forge / dnd5e Enchant; SRD 5.2.1 attack roll = ability + Proficiency Bonus + magic bonus                                           | `combat.mjs`: `profileFor` treats the always-present empty effective `combatProfile` as no profile (it hid the default `proficiencyBonus: 2`); an inventory weapon attack falls back to the sheet's Proficiency Bonus (recorded, else by level).                                                                                                                                                                                                                                                                                                | `logs/bi24.log`, `bi24b.log`, `bi24c.log`: sheet «Tiro per colpire con Spada lunga +1 +3», Table «Attacco 17 + 3 = 20», «Probabilità di colpire: 55%»                                                                                                                               |
| BI-45 | Shard compendium packs after the DDB import; Foundry compendium packs feed bestiary and builder (VTL-200)                             | New core `compat-packs.mjs` (read side of B49's slice). Consumers: `token-menu` bestiary (`creatureMatches(..., state)`, `addCreatureAt`), `compendium.addCreatureToScene` (pack creature → NPC with its numbers, flying speed, provenance `compat-pack`, first attack as the melee profile), `combat.isValidMeleeProfile` (accepts a `compat-pack` source), `character-build` subclasses, Library search rows `[data-library-pack]`, B49 palette source `adventures-packs`, the pack card's «Le creature sono nel bestiario del Tavolo…» line. | `logs/bi45a.log`, `bi45b.log`, `bi45-*.png`: bestiary «Lanterna vagante · GS 1 · pacchetto, p. 42» → token PF 22/22 with «Vampata»; Library row; palette «Custode del faro · Sottoclasse · … · p. 60»; builder «Invocatore \| Custode del faro · pacchetto, p. 60»                  |
| TV-59 | Mob Attack Tool (FVT-137): the group acts on the current group turn                                                                   | `combat-tracker-domain.setGroupTurns`: turned on during a group leader's turn, the group turn starts at once (`beginGroupTurn`, the same code as a turn start); on another creature's turn it starts at the leader's next turn.                                                                                                                                                                                                                                                                                                                 | `logs/tv59.log`, `tv59b.log`: «Ora agisce solo Goblin guerriero A … serve la regola della casa» before; after «Salva»: «Turno di gruppo (regola della casa) … Attaccanti Goblin guerriero A · Arco corto, Goblin guerriero B · Arco corto», both attack, «Turno successivo» → Doran |
| TV-52 | Improved Initiative «group initiative» toggle, DDB shared copies, dnd5e grouping (CMP-158, DDB-093, FVT-130); SRD 5.2.1 EN 13 / IT 14 | `encounter-builder-domain`: `copyKeyOf`, `setSharedInitiative` (an encounter row's `individualInitiative`, else the slice's `individualRows`, normalised); `initiativeKeyOf` reads both. `combat-tracker-domain`: start rows carry `shareKey`, `setShareInitiative`, `applyShareChoice` (joining rows with different d20s clears them: one roll for the group). `combat-tracker.mjs` start dialog: «Un solo tiro per il gruppo» switch on the row, the SRD source in the dialog note.                                                           | `logs/tv52.log`, `tv52-merged.png`, `tv52-split.png`: «Goblin guerriero A, B … Un solo tiro per il gruppo» → two rows → one row; focus stays on the switch                                                                                                                          |
| X-A1  | D&D Beyond homebrew shared with a campaign (the campaign's homebrew collection)                                                       | `homebrew.homebrewUseSteps` (enable / share / dependency, named as the button or who does it); `applyToSheet` refuses with those steps; the dialog lists them per sheet (ready sheets first) with a note on where the buttons are; `homebrew.mjs` refusals carry `it`/`en` so the shell shows one language.                                                                                                                                                                                                                                     | `logs/xa1a.log`, `xa1-dialog.png`, `xa1-refusal.png`: «Doran · prima: «Abilita in campagna» · «Condividi in lettura con i giocatori»», refusal «Prima di applicarla a Doran: …», after enable only «Condividi…», after sharing «prerequisiti soddisfatti», applied                  |
| X-A2  | Italian SRD 5.2.1 terms; the app's own Italian words already used elsewhere («anteprima», «Dispensa»)                                 | See «X-A2 sweep» below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `logs/sweep-*.log`, `logs/sweepsheet-*.log`, `logs/i18n-dm-en.txt`; `bi24b.log` «Anteprima · nessun consumo», «Gittata 1,5 m», «Padronanza: Fiaccare»                                                                                                                               |
| X-A3  | dnd5e class advancement; D&D Beyond homebrew class started from an existing class (names and numbers, never SRD text)                 | `homebrew-editor-domain.buildFromTemplate` «class-levels»: one grant per class-table level with the SRD feature names (Italian and English) and empty descriptions, plus the level-4 Ability Score Improvement.                                                                                                                                                                                                                                                                                                                                 | `logs/xa3.log`, `xa3-advancement.png`: «Livello 1: Incantesimi, Adepto dei rituali, Recupero arcano · Livello 2: Studioso…»; first «Salva» returns to `#builder…&tab=class` with «Mago delle lanterne»                                                                              |

### Minor observations of `reaudit3-c.md`

| Observation                   | Pattern                                                                        | Change                                                                                                                                                                                                 | Evidence                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| CA-57 «Giocatore · Giocatore» | Owlbear's player list: one name per player                                     | `campaign-members` hand-off/transfer select names the member by the characters they play (`playedBy`), with the role only when it differs.                                                             | `logs/minor.log`: «Livia, Mira · Giocatore (scelto)»                                                                    |
| SV-37 end-of-list arrows      | BG3 greyed actions and browser Back/Forward: the reason on hover               | `title` with the reason on the disabled quick-bar page arrows, the Archive tab bar Back/Forward (`journal-plus`) and the DM screen's «Sposta prima/dopo» (`compendium`); `aria-describedby` unchanged. | `logs/minor.log`: «Una sola pagina: aggiungine un’altra dal menu della barra. · disabled=true» (the other two: markup)  |
| CA-88 copied handout label    | Roll20 handout: «Can be viewed by» and «In the players’ journal» are two facts | The DM's material rows read «Per: <audience> · mai mostrata / mostrata <data>»; the Preparation card adds «mai mostrata / mostrata …» (its audience badge unchanged); kind «Dispensa» (was «Handout»). | `logs/minor2.log`: «Dispensa · Per: Tutto il gruppo · mostrata 17 set, 21:15», «Vignetta · Per: Solo DM · mai mostrata» |

## X-A2 sweep

**Static.** A script over every module's `(it, en)` string pairs (`t()`, `ctx.t()`, `L()`, `text()`,
`button(ctx, …)`) flagged English words on the Italian side and Italian words on the English side
(220 raw hits, most «creature» and «per», which are words of the other language too). Fixed:

- «preview» in Italian: `forms-ui` («Annulla anteprima», «Rivedi l’anteprima aggiornata.», «ripeti
  l’anteprima»), `rest-ui` (same three and «L’anteprima mostra…»), `combat` («aggiorna l’anteprima»,
  twice), `combat-ui` («Anteprima · nessun consumo»), `table` («un’anteprima»), `app` (what is ready).
- `character-rules`: every class-table feature had `name.it === name.en` (English). 115 names now
  come from the Italian SRD 5.2.1 chapter headings («Livello N: …», extracted from the owner's
  `IT_SRD_CC_v5.2.1.pdf` and paired with the English headings by class and level; ranger level 1 and
  six rogue names checked by hand because the Champion's features interleave the rogue pages; the
  one heading wrapped on two lines, «Esperto di sopravvivenza disciplinato», checked against the
  Compendium's own Italian class tables, which agree with every other name).
- Weapon mastery: the Italian SRD calls it «proprietà di padronanza» and the class feature
  «Padronanza d’armi»; «Maestria» is Expertise. `combat`, `special-moves`, `special-moves-domain`,
  `sheet-plus` now read «Padronanza».
- `quickbar-domain`: Doran's sample note was «… padronanza Fiaccare. / Longsword: Versatile 1d10;
  mastery Sap.»; a player's note is one language (the group's).
- `homebrew-editor-domain.forgeItem(baseId, templates, lang)`: «SRD 5.2.1 · Spada lunga + Arma +1
  (IT p.243 / EN p.253)» in Italian.
- Decimals: `combat-ui` range and `preparation` reach through `formatNumber` («1,5 m»).
- «Handout» → «Dispensa» (`handouts`, `media`), «Preset» → «Modello predefinito», «Scegli un
  modello…», «Applica il modello» (`homebrew-editor`).
- A regression test (`residuals.test.mjs`) keeps «preview» and «Handout» off the Italian side.

**In the browser.** `sweep.src.js` read the text of every page, Library collection, campaign section
(DM 25, player 20), Table sidebar tab and, in `sweepsheet.src.js`, every sheet category and
sub-section of Livia, Mira and Doran plus the Forms and Rest previews, as DM and player, in Italian
and in English (Preferences › Language). `analyze.py` lists lines with words of the other language.

- Italian: no interface leak left. Remaining hits: the Compendium's second line with the English
  original name under the Italian one («Raggio di gelo / Ray of Frost», deliberate), «FOR» (Forza),
  «round» (the Italian SRD's word).
- English: no interface leak left. Remaining hits are authored sample content in Italian (campaign,
  scenes, Archive pages, quests, chat, applicants, Doran's «Attacco con spada», the sample media
  credit «DM della campagna · Uso al tavolo della campagna») and the Compendium's Italian second name.

## Tests

`design/blueprint/tests/residuals.test.mjs` (15): PG-53, BI-24, TV-59 ×2, TV-52 ×2, X-A1 ×2, X-A3,
BI-45 ×3 (written first and seen failing; one TV-59 case, «turned on during another creature's
turn», guards behaviour that was already right), X-A2 ×2 and CA-57 (written with the change). Updated expectations that encoded the
old text: `builder-plus` («Privilegi rimossi … Incantesimi … Adepto dei rituali»), `p2-actions` and
`special-moves` («Padronanza»), `media` («Dispensa»). Suite: start 2543/2543
(`logs/suite-start.log`), end **2558/2558** (`logs/suite-7.log`, ~13 s).

## Journeys

New: `changes/interview-01/blueprint-checks/residuals-a-journey.js` (IT 1440: PG-53, X-A1, BI-24,
X-A3, CA-57) and `residuals-b-journey.js` (TV-52, TV-59, BI-45, phone 390 EN touch) — both PASS
(`logs/summary.log`, first run: `URL` is not defined in run-code and a tie put Livia before Doran
after the group turn; both were journey bugs, fixed).

Touched areas (runner `run.sh`, one per command with a 200 s alarm, «REGRESSION SWEEP» in
`logs/summary.log`):

| Journey                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Result             | Note                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spells-plus`, `spells-plus-review`, `homebrew-editor`, `homebrew-editor-review`, `r6-builder-variant`, `r5-encounters`, `r5-initiative`, `combat-tracker`, `combat-tracker-review`, `encounter-builder`, `handoffs`, `r1-attack`, `token-menu`, `compendium`, `builder`, `builder-advance` (after `builder`, as its README says), `forms`, `rest-time`, `p4-rest`, `sheet-plus`, `quickbar`, `quickbar-review`, `handouts`, `campaign-members-review2`, `library`, `p8-library`, `r8-copy`, `p9-journal`, `r3-transform` | PASS               | no change                                                                                                                                                                                          |
| `r6-compat-packs`, `media`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | PASS on rerun      | their upload fixtures (`r6-compat-pack-sample.json`, `fixtures/`) copied into this evidence folder, where the runner points the paths                                                              |
| `builder-plus`, `p1-leveling`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | PASS after refresh | they read the English feature names on the Italian page (the X-A2 defect): now «Incantesimi … Adepto dei rituali … Recupero arcano» and «Azione impetuosa», «Mente tattica» (comment in each file) |
| `special-moves`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | PASS after refresh | «Padronanza d’armi · 3/3» (was «Maestria nelle armi»)                                                                                                                                              |

Total: 36 journeys (2 new + 34 of the touched areas), 36 PASS in their final run.

Refreshed: `special-moves-journey.js`, `builder-plus-journey.js`, `p1-leveling-journey.js` (comment in each
file; their other pre-existing Prettier differences left as they were).

## Not done (with reason)

| Item                                                         | Status        | Reason                                                                                                                                                                                  |
| ------------------------------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real publisher content in compatibility packs                | OPEN (owner)  | The content and licensing decision stays with the owner (census «MISSING (decisione contenuti)»); the wiring works with the invented sample pack, labelled a simulation.                |
| Session zero sample text «Venerdì sera, ogni due settimane.» | NOT CHANGED   | Authored sample content, not interface; it disagrees with the Thursday weekly schedule the hand-offs set, and `sessions-plus.test` quotes it. A content choice for the sample's author. |
| Compendium's English original name under the Italian one     | NO CHANGE     | Deliberate second name (players who know the English books), not a leak.                                                                                                                |
| A pack subclass's features at levels 3, 6, 10, 14            | NOT AUTOMATED | Mechanics-only packs carry names and levels; the builder records the subclass by name and page, like an SRD subclass beyond level 3 («riconcilia come capacità manuali»).               |

## Files changed

App (`design/blueprint/`): `compat-packs.mjs` (new), `spells-plus.mjs`, `spells-plus.css`,
`combat.mjs`, `combat-ui.mjs`, `combat-tracker.mjs`, `combat-tracker.css`,
`combat-tracker-domain.mjs`, `encounter-builder-domain.mjs`, `homebrew.mjs`,
`homebrew-editor.mjs`, `homebrew-editor-domain.mjs`, `character-rules.mjs`,
`character-build.mjs`, `character-builder.mjs`, `token-menu.mjs`, `compendium.mjs`,
`library.mjs`, `adventures.mjs`, `forms-ui.mjs`, `rest-ui.mjs`, `table.mjs`, `app.mjs`,
`quickbar.mjs`, `quickbar-domain.mjs`, `special-moves.mjs`, `special-moves-domain.mjs`,
`sheet-plus.mjs`, `preparation.mjs`, `handouts.mjs`, `media.mjs`, `campaign-members.mjs`,
`journal-plus.mjs`. Contract: `DEVELOPMENT.md` («Residuals of re-audit 3»).

Tests: `tests/residuals.test.mjs` (new); updated `builder-plus`, `p2-actions`, `special-moves`,
`media`.

Journeys (`changes/interview-01/blueprint-checks/`): `residuals-a-journey.js`,
`residuals-b-journey.js` (new), `special-moves-journey.js`, `builder-plus-journey.js`,
`p1-leveling-journey.js` (refreshed), `README.md`.

Prettier on every changed module, test and new journey (journeys keep no final `;`).
