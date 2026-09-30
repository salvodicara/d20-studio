# Re-audit after the fix packages (interview-01)

Date: 25/09/2026. Re-auditor (read-only session). Branch `codex/interview-01`, working tree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01` (nothing committed, no file of the product changed).
Browser: playwright-cli sessions `d20-reaudit` (first-time-user checks) and `d20-reaudit-j` (re-run of the fixers' journeys),
server `http://127.0.0.1:8879/`. Evidence, scripts and logs: `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/reaudit/`
(`*.src.js` first-time checks, `logs/summary.log` and `logs/*.log` journey re-runs, `journey-images/`, `node-suite.log`).

## In breve (IT)

Su 231 capacità che non funzionavano nell’audit (229 righe più le due osservazioni X-02 e X-03), ora **192 funzionano**,
**32 sono parziali** e **7 mancano**; nessuna è più rotta o difficile da trovare. Dei 221 punti affidati ai
pacchetti di correzione ne funzionano 192; restano 28 parziali e 1 mancante (PG-79: metamorfosi generica e cavalcature). I 10
punti non affidati (esclusioni e decisioni del proprietario) restano com’erano. Tutti i percorsi di prova dei correttori, rilanciati
sull’insieme integrato, passano tranne due vecchi percorsi da aggiornare: il comportamento che controllano funziona se provato a mano.
La suite Node ha 2312 test: 2308 passano, 4 falliscono perché si aspettano ancora la vecchia struttura (sezione «Scene avanzate» e
le sezioni della scheda prima della scheda «Note»).

## Method

Every row that was not WORKS in the 14 audit files, plus X-02 and X-03 (231 rows), was re-checked against the running app after the
ten fix reports. Verification codes in the tables:

- **M**: re-checked by hand as a first-time user in `d20-reaudit` (visible labels, clicks, keys; scripts `reaudit/*.src.js`).
- **J**: the fixer's own browser journey, re-run by the re-auditor on the integrated tree in `d20-reaudit-j`, passing now.
- **P**: found through the command palette (search sweeps as DM and player, `pal.src.js`, `pal2.src.js`).
- **T**: only a Node test covers it; it was not driven in the browser in this re-audit (stated honestly).
- **-**: not packaged (owner exclusion or owner decision); not rebuilt and not re-checked.

A HARD_TO_FIND row counts as fixed only when the natural first place (the page where a new user looks, or a search with their
words) works. The status is the re-auditor's, not the fixer's: rows a fixer called «Fixed» are PARTIAL here when a named part of
the triage fix is missing (PG-25, PG-47, TV-141, SV-37), and rows a fixer called partial are WORKS only when the re-check passed.

## Node suite

`node --test design/blueprint/tests/*.test.mjs` (run under a 600 s alarm, 7.6 s): **2312 tests, 2308 pass, 4 fail** (log
`reaudit/node-suite.log`). The four failures are cross-cutting tests that assert the structure before the intended P2/P7 changes, for
the coordinator to update (their owners were told not to edit them):

- `ia-consolidation.test.mjs:161` «every area names where its commands live»: expects a Preparation section `scene-assets` (P7 folded «Scene avanzate» into the scene list and editor).
- `ia-consolidation.test.mjs:581` «Preparation: four groups…»: expects `["scenes", "scene-assets", "regions", "special-moves"]` (same P7 change).
- `ia-consolidation.test.mjs:605/625` «sheet: D&D Beyond’s seven sections…»: does not expect the `sheet-plus-notes` tab (P2 PG-43).
- `w2b2-integration.test.mjs:56/62` «the Preparation strip ends with one ‘All sections’ quick-jump»: expects `data-prep-section="scene-assets"` (P7).

## Fixer journeys re-run on the integrated tree

48 journeys (P1 7, P2 4, P3 4, P4 6, P5 2, P6 5, P7 14, P8 1, P9 4, P10 1), images redirected to `reaudit/journey-images/`,
a `beforeunload` guard accepted automatically. **46 pass. 2 fail, both stale scripts, not product failures:**

- `p1-cross-tab-journey.js` clicks «Nuovo voce del mondo» (now «Nuova voce del mondo», P9 CA-19) and uses the old two-step save; the
  new one-save flow was driven by hand (`ca10.src.js`, `ca10b.src.js`): the conflict is detected and both versions are kept.
- `fix-P2/journeys/p2-companion.js` does not reset the example and clicks the cell right of Mira, which the map now refuses
  («Questo spazio non è disponibile»); `p2-companion-2.js` (cell on the left) passes and the token appears on the chosen point.

Also run with fixtures copied into the evidence folder: `p1-foundry-import` (Foundry JSON) and `p7-misc` (oversize map): both pass.

## Counts

| Status | Before (all 231) | After (all 231) | Before (221 packaged) | After (221 packaged) |
| --- | --- | --- | --- | --- |
| WORKS | 0 | 192 | 0 | 192 |
| PARTIAL | 135 | 32 | 131 | 28 |
| HARD_TO_FIND | 65 | 0 | 65 | 0 |
| MISSING | 15 | 7 | 9 | 1 |
| BROKEN | 14 | 0 | 14 | 0 |
| EXTRA | 2 | 0 | 2 | 0 |

The 2 EXTRA rows are the audit observations X-02 and X-03 (both WORKS now).

## Status per ID

### P1 — Characters and first use

| ID | Audit | Fixer said | Re-audit | How | What the re-audit saw |
| --- | --- | --- | --- | --- | --- |
| PG-16 | BROKEN | Fixed | **WORKS** | J | Fighter 1→2→1: 13→22→13 HP, derived, Action Surge removed (p1-leveling). |
| PG-03 | PARTIAL | Fixed | **WORKS** | J | Empty +2/+1 is one (!) error; «Correggi sezione» focuses origin.backgroundBonuses.str (p1-builder-phone). |
| PG-05 | PARTIAL | Fixed | **WORKS** | M | Soldato shows only FOR/DES/COS with the reason, origin feat «Aggressore selvaggio», (!) da assegnare; Elf lineage choice listed. |
| PG-08 | PARTIAL | Fixed | **WORKS** | J | Home «Avanza» → review 13→22, Action Surge, Tactical Mind, 3 interactions. |
| PG-10 | PARTIAL | Fixed | **WORKS** | M | Storia: Tratti/Ideali/Legami/Difetti with «+ Aggiungi», «Casuale» and idea chips. |
| PG-12 | PARTIAL | Fixed | **WORKS** | T | Covered by P1-builder-origin tests; not re-driven in the browser. |
| PG-06 | HARD_TO_FIND | Partly fixed | **PARTIAL** | M | «Sfoglia le classi…» picker with search, filters, preview; no raw revision ids. «Crea variante» does not come back with the new class/species/background selected. |
| PG-19 | HARD_TO_FIND | Fixed | **WORKS** | M | Player «Costruisci con il DM…» → DM Home «Da riprendere: Bozza condivisa con te», bell +1, palette «Bozze condivise». |
| IN-06 | PARTIAL | Fixed | **WORKS** | J | Quick-path draft resumes at step 2 with Guerriero, desktop and 390 touch. |
| BI-21 | PARTIAL | Fixed | **WORKS** | T | Homebrew class advancement covered by P1-homebrew-class tests; not re-driven. |
| BI-22 | PARTIAL | Partly fixed | **PARTIAL** | M | Class picker has a Homebrew filter; homebrew subclasses are still not offered by the builder. |
| PG-85 | PARTIAL | Partly fixed | **PARTIAL** | M | «Collega alla campagna…» asks which campaign; the campaign Gruppo page still has no «Aggiungi un mio personaggio». |
| PG-88 | PARTIAL | Fixed | **WORKS** | M | Copy dialog: «Regole di destinazione» and «Cosa cambia». |
| PG-89 | PARTIAL | Fixed | **WORKS** | M | Link/copy through a campaign picker (only one sample campaign to pick). |
| PG-92 | MISSING | Fixed | **WORKS** | J | Foundry actor preview (mapped/not imported) and import, level 3, 28 HP. |
| PG-93 | HARD_TO_FIND | Fixed | **WORKS** | M+P | Header «Condividi»: link and QR in one tap; palette «QR», «condividi scheda». |
| PG-94 | PARTIAL | Fixed | **WORKS** | M | DM header «Scheda di Giocatore · il giocatore ti consente di modificarla»; player «Scheda controllata da te». |
| IN-07 | PARTIAL | Fixed (DM path without the Preparation shared edit) | **WORKS** | J | First steps fold with «Unisciti con un invito»; DM map path opens a new scene in Preparazione. |
| IN-10 | MISSING | Fixed | **WORKS** | J | «Prova senza account» sandbox banner with «Crea un account per salvare». |
| IN-11 | PARTIAL | Fixed | **WORKS** | J+P | Install card/iOS steps; palette «installa». |
| SV-34 | PARTIAL | Fixed | **WORKS** | J | setOffline → «Senza rete…», back → «In linea…». |
| CA-10 | BROKEN | Fixed (conflict); resume not done | **PARTIAL** | M | Two tabs: tab 1 keeps its text, save is blocked with «Qualcuno ha cambiato la voce…», «Ho confrontato: usa questa base…» saves A after B (ORIGINALE, B, A). «Modifica» still does not resume a pending draft. The fixer journey p1-cross-tab is stale (old label and two-step save). |
| SV-48 | HARD_TO_FIND | Fixed | **WORKS** | J | Table tip on by default with «Non mostrare più»; reset/archive in help. |

### P2 — Character sheet and Extra

| ID | Audit | Fixer said | Re-audit | How | What the re-audit saw |
| --- | --- | --- | --- | --- | --- |
| PG-20 | PARTIAL | Fixed | **WORKS** | M | «Azioni della scheda» opens the sheet drawer over the map; URL stays #table; close returns focus. |
| PG-25 | BROKEN | Fixed | **PARTIAL** | M | Sheet AC 13 with «12 base · Mantello della protezione +1»; «Correggi valori» has no AC field. But the campaign Gruppo summary still shows Livia's saves without the cloak (INT +5, DES +2 vs sheet +6, +3). |
| PG-30 | PARTIAL | Fixed | **WORKS** | M | One «Velocità e sensi» dialog with shown speed and shown sense. |
| PG-32 | HARD_TO_FIND | Fixed | **WORKS** | M | «Aggiungi abilità» visible in Gioco mode. |
| PG-33 | PARTIAL | Fixed | **WORKS** | M | ☆ Ispirazione eroica toggle in the header. |
| PG-34 | PARTIAL | Fixed | **WORKS** | M+J | Limited uses with «Usa»; pips focusable (p2-focus). |
| PG-37 | PARTIAL | Fixed | **WORKS** | M | Bastone ferrato: «Versatile 1d8», «Maestria: Rovesciamento» chips. |
| PG-38 | PARTIAL | Fixed | **WORKS** | M+T | «Azione personalizzata» on the sheet opens the quick-bar action dialog; list inclusion by p2-actions tests. |
| PG-39 | PARTIAL | Fixed | **WORKS** | M+J | Favourite chip rolls with no dialog; Atletica appears on the Table «Barra rapida» page. |
| PG-40 | PARTIAL | Fixed | **WORKS** | M | Every save/skill has «dettagli, clic per fissarli». |
| PG-41 | PARTIAL | Fixed | **WORKS** | M | «SRD 5.2.1 · p. 77–78» inline, filter chips Classe/Specie, «Recupero arcano» on Livia. |
| PG-42 | PARTIAL | Fixed | **WORKS** | M | Storia › Personalità: four lists with «Aggiungi»/«Casuale», biography separate. |
| PG-43 | HARD_TO_FIND | Fixed | **WORKS** | M | «Note» tab opens on chips Organizzazioni/Alleati/Nemici; Storia links to it. |
| PG-44 | HARD_TO_FIND | Fixed | **WORKS** | M+J | Header portrait button «Aspetto di Livia: ritratto, pedina e ritaglio». |
| PG-45 | PARTIAL | Fixed | **WORKS** | J | Phone: bar at 581 px in the first screen, sticky at 0 when scrolling. |
| PG-70 | PARTIAL | Fixed | **WORKS** | J | Movement shows the effective speed with «−3 m ingombro» (p4-inventory). |
| BI-05 | PARTIAL | Fixed | **WORKS** | M | Glossary terms rendered inside sheet texts. |
| BI-32 | HARD_TO_FIND | Fixed | **WORKS** | M+P | Header portrait crop, token menu Aspetto, palette «ritaglia ritratto». |
| PG-77 | HARD_TO_FIND | Partly fixed | **PARTIAL** | M+J | Sheet «Trasformati» → Lupo → Applica in 3 steps; token menu › Azioni › «Forma Selvatica…». No hotbar slot and the token art does not swap. |
| PG-78 | BROKEN | Fixed | **WORKS** | J | Companion token appears at the chosen point (p2-companion-2). The older p2-companion journey now picks a cell the map refuses («Questo spazio non è disponibile»), with a clear message. |
| PG-79 | MISSING | Not fixed | **MISSING** | P | No generic transformation or mount; palette «cavalcatura», «trasformazione» find nothing. |
| PG-82 | HARD_TO_FIND | Fixed | **WORKS** | M+P | Iria (level 5) has a top-level «Bastione» section; palette «bastione» finds it from the sheet or as the player. From the DM's Home the command is not offered. |
| PG-83 | HARD_TO_FIND | Fixed | **WORKS** | M | Extra sub-pages «Creature e piani», «Progetti e tempo libero», «Ricettario». The progress meter cannot be seen with the sample data (no active project). |
| PG-84 | HARD_TO_FIND | Fixed | **WORKS** | M+P | «Ricettario» sub-page; palette «fabbrica», «ricetta». |

### P3 — Roll engine, log, HP, conditions

| ID | Audit | Fixer said | Re-audit | How | What the re-audit saw |
| --- | --- | --- | --- | --- | --- |
| PG-23 | BROKEN | FIXED | **WORKS** | J+M | Poisoned Atletica is 2d20 keep-lowest from the sheet list, favourites and Table tray; Exhaustion 2 everywhere. |
| PG-47 | BROKEN | FIXED | **PARTIAL** | J | Bless d4 is rolled and named in the dice tray and Table tray; Table combat attacks and DM roll requests still do not add the rider die (fixer's own limit). |
| PG-48 | PARTIAL | FIXED | **WORKS** | J+P | «Politica dei tiri» from the sheet box; palette «tiro nascosto». |
| PG-21 | HARD_TO_FIND | FIXED | **WORKS** | M+J | HP numbers open the widget with «Correggi i punti ferita» and a reason. |
| PG-22 | PARTIAL | FIXED | **WORKS** | M+J | One HP widget with damage type, cause and «Colpo critico»; the conditions panel links to it. |
| PG-27 | PARTIAL | FIXED | **WORKS** | J | 0 HP death box, «Riporta a 1 PF», explicit «Morto» and «Riporta in vita…». |
| PG-28 | PARTIAL | FIXED | **WORKS** | M+J | «+ Condizione» › «Avvelenato»: 2 clicks; exhaustion segments 1–6. |
| TV-87 | PARTIAL | FIXED | **WORKS** | J | Log card keeps rule, strikes dropped die, «Dettagli» with Ritira. |
| TV-90 | BROKEN | FIXED | **WORKS** | J | «Solo DM» covers the listed check. |
| TV-92 | PARTIAL | PARTIAL | **PARTIAL** | J | Request card with «Tira» works; the player's list still shows requests of DM creatures and «Effetti delle condizioni» titles a plain bonus (combat.mjs/combat-ui.mjs). |
| TV-96 | BROKEN | FIXED | **WORKS** | J | Hidden prepared modifier logged for the DM only. |
| TV-97 | PARTIAL | FIXED | **WORKS** | J | 4d6kh3 card with the rule and struck die. |
| TV-105 | HARD_TO_FIND | FIXED | **WORKS** | J | «Tono» selector beside the message type. |
| TV-125 | PARTIAL | FIXED | **WORKS** | M | Fire Bolt at the Sentinella outside combat draws a map effect ([data-dtray-fx-kind]). |
| TV-141 | PARTIAL | FIXED | **PARTIAL** | J | Log and requests use the disguise retroactively; combat attempt names in «Tiri e risultati» keep the true name (fixer's own limit, combat.mjs). |
| TV-68 | PARTIAL | FIXED | **WORKS** | T+P | Palette «vassoio dei danni»; card button covered by node test. |
| TV-69 | HARD_TO_FIND | FIXED | **WORKS** | J | Bell «Accetta e applica» in one click (Sentinella 7 → 4). |
| TV-79 | MISSING | PARTIAL | **PARTIAL** | J | Concentration can be added by hand and damage asks the CON save DC 10; no sample caster can cast a concentration spell, so casting never sets it. |
| SV-24 | PARTIAL | FIXED | **WORKS** | J | axe-core: no violations on sheet and Table HP dialogs. |
| X-02 | EXTRA | FIXED | **WORKS** | J | Player log has no preset/service line. |

### P4 — Inventory, spells, loot, rests, travel, generators

| ID | Audit | Fixer said | Re-audit | How | What the re-audit saw |
| --- | --- | --- | --- | --- | --- |
| PG-53 | PARTIAL | PARTIAL | **PARTIAL** | T | Source chips; legacy 2014 side by side still absent (no 2014 data, campaign blocks legacy). |
| PG-62 | HARD_TO_FIND | FIXED | **WORKS** | J+M | SRD dagger added in 3 interactions; «Aggiungi oggetto» in the Inventory tab. |
| PG-64 | PARTIAL | FIXED | **WORKS** | J | Sort by weight, value column. |
| PG-72 | HARD_TO_FIND | FIXED | **WORKS** | J+P | «Inventario del gruppo» with «equipaggiato da» portraits. |
| PG-74 | PARTIAL | FIXED | **WORKS** | J | «Cambia set» stows the blocker. |
| PG-75 | HARD_TO_FIND | FIXED | **WORKS** | J+P | Palette «valuta» → campaign currencies. |
| TV-144 | PARTIAL | FIXED | **WORKS** | J | Cart bar in view, haggle offer to the DM, agreed price. |
| PR-56 | PARTIAL | FIXED | **WORKS** | J | «Compra» ×3 → bar «3» in view at once. |
| PG-17 | HARD_TO_FIND | PARTIAL | **PARTIAL** | J+P | Palette «PE», «Inventario del gruppo» button and end-of-encounter bell work; the Gruppo page still has no award button. |
| PG-35 | PARTIAL | FIXED | **WORKS** | T | Dawn recovery of features covered by p4-rest tests; not re-driven. |
| PG-80 | MISSING | FIXED | **WORKS** | J | After a Long Rest: spells and masteries offered. |
| PG-81 | HARD_TO_FIND | FIXED | **WORKS** | J | Hit Dice at the start, HP from Hit Dice in the summary. |
| CA-77 | PARTIAL | FIXED | **WORKS** | J | Group rest preselects the party; «Completa per tutti». |
| TV-133 | PARTIAL | FIXED | **WORKS** | J | Camp at 20:00; watch Perception logged. |
| PR-17 | PARTIAL | FIXED | **WORKS** | J | Generated dungeon saved with furniture objects. |
| PR-55 | PARTIAL | FIXED | **WORKS** | J+P | CR 5 hoard into a hidden Treasure parcel; palette «tesoro», «bottino». |
| PR-62 | HARD_TO_FIND | FIXED | **WORKS** | J+M | Tool opens the table picker; token menu › Aspetto › «Lati (pedina a più facce)…». |
| TV-109 | PARTIAL | FIXED | **WORKS** | J | Own art preselected, shared and revealed in one step. |
| TV-70 | PARTIAL | FIXED | **WORKS** | M+J | Wand usable from the Table creature panel and the quick bar. |

### P5 — Combat, encounters, initiative, action bar

| ID | Audit | Fixer said | Re-audit | How | What the re-audit saw |
| --- | --- | --- | --- | --- | --- |
| TV-45 | HARD_TO_FIND | Fixed | **WORKS** | J | «Avvia combattimento» → «Tira tutti» → «Inizia»: 3 clicks, stays at the Table, sorted. |
| TV-46 | PARTIAL | Partly fixed | **PARTIAL** | J | Roll all / NPCs / select all and one bonus source; players still cannot roll their own initiative. |
| TV-50 | BROKEN | Fixed | **WORKS** | T | joinCombat after a correction covered by p5-initiative tests. |
| PR-32 | BROKEN | Partly fixed | **PARTIAL** | J | Sorted on start/join/correction, missing rolls named; the encounter builder and the scene's «Incontro preparato» are still two panels. |
| TV-52 | PARTIAL | Partly fixed | **PARTIAL** | T | Census codes removed from labels; no two identical goblins seeded (cultists used instead). |
| TV-54 | PARTIAL | Fixed | **WORKS** | T | Legendary prefill works on custom blocks; the SRD sample has no legendary creature to see it with. |
| TV-59 | PARTIAL | Partly fixed | **PARTIAL** | T | The house rule is explained; sample creatures still have no SRD attacks seeded. |
| PR-35 | PARTIAL | Fixed | **WORKS** | M | «Iniziativa condivisa» switch in the encounter builder. |
| PR-38 | BROKEN | Fixed | **WORKS** | J | Riassunto then Tesoro, 3 times: no character lost. |
| PR-43 | HARD_TO_FIND | Fixed | **WORKS** | J+M | «Incolla riga del blocco» in the Table creature panel. |
| PR-45 | PARTIAL | Fixed | **WORKS** | T | Unique linked creature reuse covered by p5-encounters tests. |
| PR-46 | PARTIAL | Fixed | **WORKS** | M | «Carica statistiche» on the Esploratore. |
| TV-82 | PARTIAL | Fixed | **WORKS** | J | Ready Magic Missile with a slot and Concentration. |
| TV-129 | MISSING | Fixed | **WORKS** | J+P | Shift+Space turn-based mode; palette «Modalità a turni». |
| PG-69 | PARTIAL | Fixed | **WORKS** | J | Bow outside combat rolls and spends an arrow; «Regola e calcolo» opens. |
| TV-67 | PARTIAL | Fixed | **WORKS** | M | Action bar grouped ARMI / INCANTESIMI / COMUNI with cost filter. |
| TV-74 | PARTIAL | Fixed | **WORKS** | J | At 0 HP attacks greyed with the reason. |
| TV-80 | PARTIAL | Fixed | **WORKS** | T | One reaction at a time covered by p5-reactions tests. |
| TV-48 | PARTIAL | Fixed | **WORKS** | J | Hidden goblin's end of turn DM-only. |
| TV-64 | PARTIAL | Fixed | **WORKS** | J | Dodge icon and effects list. |
| TV-84 | MISSING | Fixed | **WORKS** | J | Dodge expires at the next turn with a log line. |
| TV-85 | PARTIAL | Fixed | **WORKS** | J | Effects list in the creature panel. |
| TV-89 | PARTIAL | Partly fixed | **PARTIAL** | M+J | Right-click/long press on action-bar attacks: vantaggio/svantaggio/normale. No «visibilità» (who sees) and no critical choice, which the triage asked for. |
| TV-83 | PARTIAL | Partly fixed | **PARTIAL** | J | «Aggiungi bonus» before the attack; no «Ispirazione: ritira» after an attack. |

### P6 — Table map

| ID | Audit | Fixer said | Re-audit | How | What the re-audit saw |
| --- | --- | --- | --- | --- | --- |
| TV-01 | BROKEN | FIXED | **WORKS** | J | Walls block drag, routes through the open door, empty drag pans, empty click deselects. |
| TV-04 | PARTIAL | FIXED | **WORKS** | J | Far door: walk and open. |
| TV-05 | PARTIAL | FIXED | **WORKS** | J | Wheel zoom at the cursor; +/− buttons. |
| TV-06 | PARTIAL | FIXED | **WORKS** | J | Phone: one-finger pan, tokens one cell, status above the bar. |
| TV-10 | PARTIAL | FIXED | **WORKS** | J | SRD grid default; rule links to «Griglia e misure». |
| TV-11 | HARD_TO_FIND | FIXED | **WORKS** | M | «?» shortcut guide lists Alt; status hint «tieni premuto Alt per le etichette». |
| TV-15 | PARTIAL | FIXED | **WORKS** | J | Box select only enemies, all listed. |
| TV-19 | PARTIAL | FIXED | **WORKS** | J | Resize handle, fixed-size name. |
| TV-20 | PARTIAL | FIXED | **WORKS** | J | Ctrl+C/V after a click; grouped tokens move together. |
| TV-21 | HARD_TO_FIND | FIXED | **WORKS** | J+P | Right-click add goblin in 3 interactions; palette «pedina», «mostro». |
| TV-25 | PARTIAL | FIXED | **WORKS** | J | Enemy health hidden from players. |
| TV-26 | HARD_TO_FIND | FIXED | **WORKS** | M | «Trova la mia pedina» → «Pedina trovata: Livia». |
| TV-27 | PARTIAL | FIXED | **WORKS** | J | Keyboard move one cell, focus kept. |
| TV-36 | PARTIAL | FIXED | **WORKS** | J | Finger measure label above the finger. |
| TV-38 | PARTIAL | FIXED | **WORKS** | T | Ring recolour and tap placement covered by annotations tests; not re-driven. |
| TV-44 | PARTIAL | FIXED | **WORKS** | J | Cover chip, switch and «Togli». |
| PG-46 | PARTIAL | FIXED | **WORKS** | M+J | Hotbar «Livia PF 18/22» opens the HP widget. |
| TV-08 | HARD_TO_FIND | FIXED | **WORKS** | M | «Ultima mossa Maiusc+X» at the top of the creature panel. |
| TV-71 | PARTIAL | FIXED | **WORKS** | M+J | «Cadere» in Mosse speciali. |
| TV-77 | PARTIAL | FIXED | **WORKS** | T | OA mark covered by p6-table tests and the fixer's spot check; not re-driven. |
| TV-138 | PARTIAL | FIXED | **WORKS** | J | Finds kept in «Trovato»; log «Cerca · Percezione». |
| TV-142 | HARD_TO_FIND | FIXED | **WORKS** | M+J | «Borseggia…» greyed with «Avvicinati: serve un tuo personaggio adiacente (1,5 m)». |
| TV-106 | HARD_TO_FIND | FIXED | **WORKS** | J | Header «Scene» opens the scene list over the map. |
| X-03 | EXTRA | VERIFIED | **WORKS** | J | Right-click menu 8 of 8. |

### P7 — Preparation

| ID | Audit | Fixer said | Re-audit | How | What the re-audit saw |
| --- | --- | --- | --- | --- | --- |
| PR-03 | HARD_TO_FIND | Fixed | **WORKS** | J | Alignment inside «Griglia e misure»; «Avanti» 36 px from the click. Note: palette «allinea» finds nothing. |
| PR-05 | PARTIAL | Fixed | **WORKS** | J | ASCII name deletes «… — copia»; Ctrl+Z restores; menu closes outside. |
| PR-06 | HARD_TO_FIND | Fixed | **WORKS** | J | One list with folders, breadcrumb, search; tab count 5 = 5 rows. |
| PR-07 | HARD_TO_FIND | Fixed | **WORKS** | J+P | «Teatro della mente (senza mappa)»; palette «teatro»; no scale label at the Table. |
| PR-08 | HARD_TO_FIND | Fixed | **WORKS** | J | «Varianti» tab in the editor. |
| PR-09 | PARTIAL | Fixed | **WORKS** | J | Crypt at −3 m reached with «▼ Piano sotto». |
| PR-10 | HARD_TO_FIND | Fixed | **WORKS** | J | «Oggetti» tab in the editor. |
| PR-11 | HARD_TO_FIND | Fixed | **WORKS** | T | Prefab lock preserved (p7-scenes test). |
| PR-12 | PARTIAL | Fixed | **WORKS** | J | «Elenco della scena» with kind chips. |
| PR-13 | HARD_TO_FIND | Fixed | **WORKS** | J | Off-map staging with «Dal bestiario (SRD 5.2.1)». |
| PR-15 | HARD_TO_FIND | Fixed | **WORKS** | J+P | «Nuova scena › Importa Universal VTT»; 3 lights editable; palette «dd2vtt». |
| PR-16 | PARTIAL | Fixed | **WORKS** | J | Size and limit named; «Riduci e converti in WebP» → 844 KB. |
| PR-20 | PARTIAL | Fixed | **WORKS** | J | Door lock DC, key, cost; «Scassina (CD 14)». |
| PR-21 | PARTIAL | Fixed | **WORKS** | J | Wall chain; tool stays selected. |
| PR-22 | PARTIAL | Partly fixed | **PARTIAL** | J | Wall kinds chosen where walls are drawn; terrain/proximity kind still missing. |
| PR-23 | HARD_TO_FIND | Fixed | **WORKS** | J | Lights placed in Preparazione glow at the Table after activation; labelled phone controls. |
| PR-25 | PARTIAL | Fixed | **WORKS** | J | Scene follows narrative time (08:00 + 12 h → notte). |
| PR-29 | HARD_TO_FIND | Fixed | **WORKS** | J | Trap menu Esamina/Disinnesca; token does not move; blocked reason shown. |
| PR-31 | MISSING | Fixed | **WORKS** | J+P | «Condizioni della scena…» Bufera region over the map; palette «bufera». |
| PR-41 | HARD_TO_FIND | Fixed | **WORKS** | J+P | Palette «Crea PNG…». |
| BI-33 | PARTIAL | Fixed | **WORKS** | J | Dropped images become a token and an object at the drop point. |
| TV-29 | PARTIAL | Fixed | **WORKS** | J | Own tokens keep initial and name above darkness. |
| TV-30 | PARTIAL | Fixed | **WORKS** | J | Fog polygon closes on double-click with no leftover outline; panel folds. |

### P8 — Library, compendium, homebrew, adventures

| ID | Audit | Fixer said | Re-audit | How | What the re-audit saw |
| --- | --- | --- | --- | --- | --- |
| BI-01 | PARTIAL | FIXED | **WORKS** | J | «Dardo» in Disponibili finds Dardo di fuoco (SRD). |
| BI-09 | PARTIAL | FIXED | **WORKS** | M | Mago page: «Privilegi di classe» filled for levels 1–20. |
| BI-10 | PARTIAL | FIXED | **WORKS** | J | Rumours table rolls inside the note and the log. |
| BI-13 | PARTIAL | FIXED | **WORKS** | M | «Cosa è cambiato» on Fire Bolt. |
| BI-15 | HARD_TO_FIND | FIXED | **WORKS** | J+M | One structured editor, one «Salva», author reason beside the field. |
| BI-16 | BROKEN | FIXED | **WORKS** | J | Livia rev. 2 via «Rivedi aggiornamento» → Saggezza 13 and the activity. |
| BI-18 | PARTIAL | PARTIAL | **PARTIAL** | T | Skill targets and scaling exist; homebrew advantage is shown but not applied by the roll engine. |
| BI-20 | PARTIAL | FIXED | **WORKS** | T | Modifier durations covered by p8-modifiers tests. |
| BI-23 | HARD_TO_FIND | FIXED | **WORKS** | M | «Crea contenuto › Mostro · blocco statistiche» opens the creature editor with «Blocco statistiche». |
| BI-24 | PARTIAL | PARTIAL | **PARTIAL** | P | Palette «forgia» opens the Forge; a forged weapon's attack/damage bonus stays manual. |
| BI-26 | PARTIAL | FIXED | **WORKS** | M | SRD copy opens the structured editor; «Ripristina alla fonte» after an edit. |
| BI-28 | BROKEN | FIXED | **WORKS** | J | «rev. 2 · Automazione completa», «Livia (rev. 2)». |
| BI-40 | PARTIAL | FIXED | **WORKS** | M+P | Library › Avventure has «Universo»; palette «universo». |
| BI-41 | HARD_TO_FIND | FIXED | **WORKS** | M | «Crea campagna» offers «Parti da un’avventura: Il faro sommerso». |
| BI-44 | PARTIAL | FIXED | **WORKS** | M | «Importa documento…» in Library › Avventure. |
| CA-72 | HARD_TO_FIND | FIXED | **WORKS** | J | «Abilitata: rev. 1, 2» and campaign «Aggiungi contenuto». |
| CA-26 | PARTIAL | FIXED | **WORKS** | J | «Inserisci tiro» damage embed rolls in place (IT and EN phone). |

### P9 — Journal, sessions, search, preferences, integrations

| ID | Audit | Fixer said | Re-audit | How | What the re-audit saw |
| --- | --- | --- | --- | --- | --- |
| CA-12 | PARTIAL | FIXED | **WORKS** | J | @ in a World entry links an Archive page. |
| CA-13 | HARD_TO_FIND | FIXED | **WORKS** | J | Secret block revealed per block in Diario. |
| CA-14 | HARD_TO_FIND | FIXED | **WORKS** | J | Backlinks with context on a World entry. |
| CA-15 | HARD_TO_FIND | FIXED | **WORKS** | J | Unlinked mention linked only after «Collega». |
| CA-16 | HARD_TO_FIND | FIXED | **WORKS** | J | [[Bottega di Orvel]] creates a nested entry; «Sposta la selezione…». |
| CA-17 | PARTIAL | FIXED | **WORKS** | J+P | Kits, «Salva come modello»; palette «modello». |
| CA-19 | HARD_TO_FIND | FIXED | **WORKS** | J | «Nuova voce del mondo» with every type. |
| CA-20 | HARD_TO_FIND | FIXED | **WORKS** | J | Bookmark and shared tab bar across Mondo and Archivio. |
| CA-24 | HARD_TO_FIND | FIXED | **WORKS** | J | Saved cards view over World entries and Archive pages. |
| CA-82 | HARD_TO_FIND | FIXED | **WORKS** | J+P | «Cronologia» in the header with diff and «Ripristinata da…». |
| SV-05 | HARD_TO_FIND | FIXED | **WORKS** | J | Personal note: one press saves; «Elimina» on the page. |
| SV-37 | PARTIAL | FIXED (P9 scope) | **PARTIAL** | J | Cause and remedy beside P9's save buttons; disabled save buttons in other areas were not reviewed (fixer scope). |
| CA-43 | PARTIAL | FIXED | **WORKS** | J | Heatmap, totals, best date, «Proposta», names. |
| CA-47 | HARD_TO_FIND | FIXED | **WORKS** | J+P | «Aggiungi al calendario» and reminder bell; palette «promemoria». |
| CA-21 | PARTIAL | FIXED (Journal side) | **WORKS** | J | «Prepara bozza automatica» with play events only; Table end offers the draft (P10, not re-driven). |
| SV-39 | HARD_TO_FIND | FIXED | **WORKS** | J | Home «Prossimo appuntamento» offers «Aggiungi al calendario». |
| SV-02 | PARTIAL | FIXED | **WORKS** | J+P | Description synonyms match; settings indexed (tema, lingua, daltonismo). |
| SV-03 | PARTIAL | FIXED | **WORKS** | J | Grouped results, exact match first, removable chip. Residual: «costruttore di incontri» finds nothing (the label is «costruttore d’incontri»). |
| SV-04 | PARTIAL | FIXED | **WORKS** | J | Quick create for every type with «Apri». |
| SV-22 | PARTIAL | FIXED | **WORKS** | J | Tooltip delay preference; long press on touch. |
| CA-11 | HARD_TO_FIND | FIXED | **WORKS** | M+J | Header «Appunti personali» at the Table opens «Appunto rapido»; URL stays #table. |
| SV-38 | HARD_TO_FIND | PARTIAL | **PARTIAL** | M+P | Palette «discord» works; campaign Impostazioni still has no Discord link. |
| SV-41 | HARD_TO_FIND | FIXED | **WORKS** | J+P | API token in two steps; palette «token API». |
| SV-44 | PARTIAL | FIXED | **WORKS** | T | Recap excludes administrative events (p9-sessions tests). |

### P10 — Campaign governance

| ID | Audit | Fixer said | Re-audit | How | What the re-audit saw |
| --- | --- | --- | --- | --- | --- |
| CA-03 | PARTIAL | FIXED | **WORKS** | M | «Personalizza» offers «Elenco filtrato di voci», «Calendario delle sessioni», «Anteprima di una voce». |
| CA-07 | HARD_TO_FIND | FIXED | **WORKS** | J+P | Settings › Condivisione; palette «pagina pubblica». |
| CA-49 | HARD_TO_FIND | FIXED | **WORKS** | J+P | «Invita giocatori» → link in 3 interactions; ranked first for «invita». |
| CA-57 | PARTIAL | PARTIAL | **PARTIAL** | M | «Cedi il ruolo di DM per la sessione»; the dialog says combat order, scene activation and Preparazione stay with the DM; no entry on the Table roster. |
| CA-60 | HARD_TO_FIND | FIXED | **WORKS** | J | «Vedi come» on the member row. |
| CA-61 | PARTIAL | PARTIAL | **PARTIAL** | M | Permissions for DM creatures and token lock; token grouping and per-group permissions missing. |
| CA-66 | HARD_TO_FIND | FIXED | **WORKS** | M+J | Stop/Rallenta/Alza la mano on the map bar, one tap on phone; DM «Mani alzate» counter. |
| CA-68 | PARTIAL | FIXED | **WORKS** | M | Profile filter with «Sfuma le immagini…» and «Filtro delle parolacce». |
| CA-69 | PARTIAL | FIXED | **WORKS** | J+M | Preset picker; no census IDs. |
| CA-71 | PARTIAL | PARTIAL | **PARTIAL** | M+J | One «Cosa vedono i giocatori» tab (health, names, hit chance); DC visibility and failed passive checks missing. |
| CA-73 | PARTIAL | FIXED | **WORKS** | M | Fonti › «Homebrew, voce per voce» with revision and «mancante» rows (empty with the sample data). |
| CA-74 | PARTIAL | FIXED | **WORKS** | M | Scene and token defaults with «Applica alle esistenti». |
| CA-75 | PARTIAL | PARTIAL | **PARTIAL** | P | Check on JSON import and campaign entry; palette «dipendenze»; none when a player joins by link. |
| CA-84 | PARTIAL | FIXED | **WORKS** | J+P | Running campaign archived and restored. |
| CA-85 | PARTIAL | FIXED | **WORKS** | M+P | Palette «elimina campagna»; explicit step for the running campaign; normalised typed name. |
| CA-88 | PARTIAL | PARTIAL | **PARTIAL** | M+P | Palette opens the copy on «Dati della campagna». The creature token menu entry appears only when a second active campaign exists (not visible with the sample data, `campaign-data.mjs:1033`); handouts, entries, tables, decks and Library items have no entry in their own menus. |
| TV-76 | HARD_TO_FIND | FIXED | **WORKS** | P | Palette «probabilità» → campaign setting. |
| TV-112 | PARTIAL | FIXED | **WORKS** | M+P | «Gioca per un giocatore assente» → banner «Giochi per Livia». |
| TV-115 | PARTIAL | FIXED | **WORKS** | T | Ribbons covered by session-view tests; «Gruppo diviso» present. |
| TV-117 | PARTIAL | FIXED | **WORKS** | M | Screen diagonal/resolution and «Area della mappa mostrata». |
| TV-130 | HARD_TO_FIND | FIXED | **WORKS** | M+P | «Conto alla rovescia» on the DM map bar; palette «timer». |
| TV-131 | HARD_TO_FIND | FIXED | **WORKS** | M+P | «Orologi di progresso» on the map bar; palette «orologio». |
| SV-50 | MISSING | FIXED | **WORKS** | J | Pause overlay shows a tip or rule of the day. |

### Not packaged

| ID | Audit | Fixer said | Re-audit | How | What the re-audit saw |
| --- | --- | --- | --- | --- | --- |
| TV-146 | MISSING (escluso) | - | **MISSING** | - | Owner exclusion F-030 (external music); nothing to rebuild. |
| TV-147 | MISSING (escluso) | - | **MISSING** | - | Owner exclusion F-017 (voice and video); nothing to rebuild. |
| TV-148 | MISSING (escluso) | - | **MISSING** | - | Owner exclusion (no 3D environment); nothing to rebuild. |
| SV-54 | MISSING | - | **MISSING** | - | Excluded in the census (paid sessions). |
| SV-55 | MISSING | - | **MISSING** | - | Excluded in the census (AI as DM). |
| SV-28 | PARTIAL | - | **PARTIAL** | - | Owner decision pending: account age policy and parental consent. |
| TV-95 | PARTIAL | - | **PARTIAL** | - | Owner decision pending: real Bluetooth dice need hardware integration. |
| SV-42 | PARTIAL | - | **PARTIAL** | - | Owner decision pending: third-party code extensions. |
| SV-46 | PARTIAL | - | **PARTIAL** | - | Owner decision pending: local model endpoint (cost, privacy). |
| BI-45 | MISSING | - | **MISSING** | - | Owner decision pending: mechanics-only compatibility pack (content, licensing). |

## Still failing (not WORKS), with reason and pattern

Packaged rows first (29), then the 10 not-packaged rows. «Where» names the file that has to change and its package owner.

| ID | Status | Reason (what is still missing) | Pattern to copy | Where |
| --- | --- | --- | --- | --- |
| PG-06 | PARTIAL | «Sfoglia le classi…» picker with search, filters, preview; no raw revision ids. «Crea variante» does not come back with the new class/species/background selected. | Copy dnd5e Compendium Browser locked to the choice | P1/P8: builder-plus.mjs, homebrew-editor.mjs (typed return for class/species/background) |
| BI-22 | PARTIAL | Class picker has a Homebrew filter; homebrew subclasses are still not offered by the builder. | Copy Roll20 custom class in the builder | P1: builder-plus-domain.mjs (homebrew subclasses in the builder's subclass list, applied on level-up) |
| PG-85 | PARTIAL | «Collega alla campagna…» asks which campaign; the campaign Gruppo page still has no «Aggiungi un mio personaggio». | Copy DDB «Join with this character» with a campaign picker | P10: party.mjs renderPartySection: button «Aggiungi un mio personaggio» → openLinkToCampaign(ctx, campaignId) |
| CA-10 | PARTIAL | Two tabs: tab 1 keeps its text, save is blocked with «Qualcuno ha cambiato la voce…», «Ho confrontato: usa questa base…» saves A after B (ORIGINALE, B, A). «Modifica» still does not resume a pending draft. The fixer journey p1-cross-tab is stale (old label and two-step save). | Copy DDB editing lock and Foundry/LegendKeeper conflict detection | P9: campaign.mjs: «Riprendi la bozza / Nuova bozza» when a pending draft of the same person exists |
| PG-25 | PARTIAL | Sheet AC 13 with «12 base · Mantello della protezione +1»; «Correggi valori» has no AC field. But the campaign Gruppo summary still shows Livia's saves without the cloak (INT +5, DES +2 vs sheet +6, +3). | Copy DDB AC components with a note and the Roll20 per-section modal | P10: party.mjs Gruppo summary: read saves through sheet-plus-domain.statValue (item modifiers) instead of raw proficiency maths |
| PG-77 | PARTIAL | Sheet «Trasformati» → Lupo → Applica in 3 steps; token menu › Azioni › «Forma Selvatica…». No hotbar slot and the token art does not swap. | Copy BG3 Wild Shape in the hotbar and dnd5e Transformation with Revert on the token | P5/P6: quickbar-domain.mjs (feature slot kind for Wild Shape); table.mjs/media-table.mjs (token art of the active form) |
| PG-79 | MISSING | No generic transformation or mount; palette «cavalcatura», «trasformazione» find nothing. | Copy dnd5e transformation presets and Foundry/Roll20 mount attach | P2/P6: forms-companions.mjs (generic activeForm for non-druids: Polymorph keep/merge); table.mjs (rider coupled to mount) |
| PG-47 | PARTIAL | Bless d4 is rolled and named in the dice tray and Table tray; Table combat attacks and DM roll requests still do not add the rider die (fixer's own limit). | Copy Beyond20 per-character toggles and the AboveVTT buff menu | P5: combat.mjs attack resolution and roll-requests.mjs: add activeRiders dice (Bless/Bane) like the tray |
| TV-92 | PARTIAL | Request card with «Tira» works; the player's list still shows requests of DM creatures and «Effetti delle condizioni» titles a plain bonus (combat.mjs/combat-ui.mjs). | Copy the dnd5e request card with its roll button | P5: combat.mjs projectAttempts (exclude DM-creature requests from the player's list), combat-ui.mjs conditionReasonsHTML (plain bonus title) |
| TV-141 | PARTIAL | Log and requests use the disguise retroactively; combat attempt names in «Tiri e risultati» keep the true name (fixer's own limit, combat.mjs). | Copy the FG ID toggle and Foundry Anonymous | P5: combat.mjs: store/render attempt actor names through conditions.maskNames |
| TV-79 | PARTIAL | Concentration can be added by hand and damage asks the CON save DC 10; no sample caster can cast a concentration spell, so casting never sets it. | Copy dnd5e concentration request and the FG (C) effect | P1/P2: state.mjs seed or srd-sample.mjs: a sample caster (e.g. a Cleric) with Bless prepared, castable |
| PG-53 | PARTIAL | Source chips; legacy 2014 side by side still absent (no 2014 data, campaign blocks legacy). | Copy DDB «Manage Spells» source chips | P4 + owner: spells-plus.mjs; needs 2014 spell data and a campaign that allows legacy |
| PG-17 | PARTIAL | Palette «PE», «Inventario del gruppo» button and end-of-encounter bell work; the Gruppo page still has no award button. | Copy DDB «Manage Experience» and FG award XP from encounters | P10: party.mjs Gruppo page: «Assegna PE e monete» button (service loot-award) |
| TV-46 | PARTIAL | Roll all / NPCs / select all and one bonus source; players still cannot roll their own initiative. | Copy Foundry Roll All / Roll NPCs and DDB | P7/P5: preparation.recordInitiativeResult: accept player-controlled rolls; sheet/Table «Tira iniziativa» for players |
| PR-32 | PARTIAL | Sorted on start/join/correction, missing rolls named; the encounter builder and the scene's «Incontro preparato» are still two panels. | Copy every combat tracker (Foundry, Roll20 Turn Order) | P7/P5: preparation.mjs «Incontro preparato» + encounter-builder.mjs: one encounter panel |
| TV-52 | PARTIAL | Census codes removed from labels; no two identical goblins seeded (cultists used instead). | Copy Improved Initiative plain labels | P1: state.mjs: additive seed of two identical goblins (tests may need fixture updates) |
| TV-59 | PARTIAL | The house rule is explained; sample creatures still have no SRD attacks seeded. | Copy Mob Attack Tool | P1: state.mjs: additive SRD attacks for sample creatures |
| TV-89 | PARTIAL | Right-click/long press on action-bar attacks: vantaggio/svantaggio/normale. No «visibilità» (who sees) and no critical choice, which the triage asked for. | Copy DDB right-click on every roll | P5: combat-ui.mjs / table action bar menu: add «Chi vede» (audience) and critical options, reusing dice-tray menu |
| TV-83 | PARTIAL | «Aggiungi bonus» before the attack; no «Ispirazione: ritira» after an attack. | Copy BG3 «Add Bonus» and «Roll Again» | P5: combat.mjs resolution: hold step after the d20 so «Ispirazione: ritira» can reroll before damage |
| PR-22 | PARTIAL | Wall kinds chosen where walls are drawn; terrain/proximity kind still missing. | Copy Foundry wall restrictions in the wall panel | P6/P7: spatial.mjs vision engine: terrain/proximity wall rule, then the kind in the wall panel |
| BI-18 | PARTIAL | Skill targets and scaling exist; homebrew advantage is shown but not applied by the roll engine. | Copy the Roll20 Modifier Builder and DDB modifiers | P3: sheet-plus-domain.testConditions: read homebrew advantage/disadvantage modes |
| BI-24 | PARTIAL | Palette «forgia» opens the Forge; a forged weapon's attack/damage bonus stays manual. | Copy the FG Forge and dnd5e Enchant | P5: combat.mjs listActions: build attacks from inventory weapons with item modifiers |
| SV-37 | PARTIAL | Cause and remedy beside P9's save buttons; disabled save buttons in other areas were not reviewed (fixer scope). | Copy Roll20 errors that name cause and fix | all: every disabled save button outside P9: reason with cause and remedy next to it |
| SV-38 | PARTIAL | Palette «discord» works; campaign Impostazioni still has no Discord link. | Copy Foundry to Discord in the campaign settings | P10: campaign-settings.mjs: link to Integrazioni › Discord |
| CA-57 | PARTIAL | «Cedi il ruolo di DM per la sessione»; the dialog says combat order, scene activation and Preparazione stay with the DM; no entry on the Table roster. | Copy the Owlbear GM hand-off from the Table roster | P1/P5/P6/P7: app.mjs, combat.mjs, table.mjs, preparation.mjs role checks: accept the session runner; hand-off entry on the Table roster |
| CA-61 | PARTIAL | Permissions for DM creatures and token lock; token grouping and per-group permissions missing. | Copy DDB Game Settings and Owlbear per-level permissions | P6/P10: token-menu multi-selection grouping for players; per-group permissions |
| CA-71 | PARTIAL | One «Cosa vedono i giocatori» tab (health, names, hit chance); DC visibility and failed passive checks missing. | Copy BG3 DC and passive-roll toggles, FG health for public | P3/P5/P6: roll-requests.mjs, dice-tray.mjs, chat.mjs, combat-ui.mjs (DC display), knowledge.mjs (failed passives) read disclosureOf |
| CA-75 | PARTIAL | Check on JSON import and campaign entry; palette «dipendenze»; none when a player joins by link. | Copy the BG3 mod verification window | P10: join-by-link page: run dependencyCheck |
| CA-88 | PARTIAL | Palette opens the copy on «Dati della campagna». The creature token menu entry appears only when a second active campaign exists (not visible with the sample data, `campaign-data.mjs:1033`); handouts, entries, tables, decks and Library items have no entry in their own menus. | Copy the Roll20 Transmogrifier | P4/P8/P9/P10: menus of handouts, entries, tables, decks, Library items: «Copia in un’altra campagna…» |
| TV-146 | MISSING | Owner exclusion F-030 (external music); nothing to rebuild. | - | owner |
| TV-147 | MISSING | Owner exclusion F-017 (voice and video); nothing to rebuild. | - | owner |
| TV-148 | MISSING | Owner exclusion (no 3D environment); nothing to rebuild. | - | owner |
| SV-54 | MISSING | Excluded in the census (paid sessions). | - | owner |
| SV-55 | MISSING | Excluded in the census (AI as DM). | - | owner |
| SV-28 | PARTIAL | Owner decision pending: account age policy and parental consent. | - | owner |
| TV-95 | PARTIAL | Owner decision pending: real Bluetooth dice need hardware integration. | - | owner |
| SV-42 | PARTIAL | Owner decision pending: third-party code extensions. | - | owner |
| SV-46 | PARTIAL | Owner decision pending: local model endpoint (cost, privacy). | - | owner |
| BI-45 | MISSING | Owner decision pending: mechanics-only compatibility pack (content, licensing). | - | owner |

## Other observations from the re-audit

1. **Two save values for the same character (PG-25).** The campaign Gruppo summary shows Livia’s saves without the attuned Cloak of
   Protection (INT +5, DES +2, SAG +3) while the sheet, tray and Table show +6, +3, +4. One roll engine should feed every surface
   (DDB). File: `party.mjs` (P10).
2. **Palette gaps a new user will hit.** «allinea» / «allinea griglia» finds nothing (grid alignment lives only inside the scene
   editor, PR-03); «costruttore di incontri» finds nothing while «incontro» finds «Apri il costruttore d’incontri» (the elided «d’»
   breaks the word match, SV-03); «bastione» from the DM’s Home finds nothing (the command exists only with a level-5 character in
   context, PG-82). Fix: add the plain words to the commands’ descriptions or keywords (`command-palette.mjs`, `registry.mjs`, P9).
3. **Stale journeys for the coordinator:** `p1-cross-tab-journey.js` (label «Nuova voce del mondo» and the one-save flow),
   `fix-P2/journeys/p2-companion.js` (reset the example first, pick an allowed cell). The fixer reports list more older journeys
   that assert pre-fix behaviour (P1 §For the coordinator, P2 §Checks, P3 §Tests, P6, P7, P8 §Journeys, P9, P10).
4. **Four failing cross-cutting tests** (above) must be updated to the new structure; they are not product regressions.
5. No page error was recorded by any re-audit script; the fixer journeys report `errors: []`.
