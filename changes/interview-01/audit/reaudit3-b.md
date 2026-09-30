# Re-audit 3, part B: first-time-user checks (interview-01)

Date: 29/09/2026. Re-auditor B (read-only on source). Branch `codex/interview-01`, working tree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01` (no product file changed, nothing committed).
Browser: playwright-cli session `d20-reaudit-b` (closed at the end), server `http://127.0.0.1:8879/`, viewport 1440 × 900.
Evidence: `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/reaudit-b/`: one short script per
step (`<id><step>.src.js`, built with `lib.js` by `build.sh`), its output in `logs/<id><step>.log`, screenshots `<id>-*.png`.

Scope: TV-92, TV-141, TV-79, TV-46, PR-32, TV-52, TV-59, TV-89, TV-83, PR-22, TV-95 (definitions:
`docs/interview/CAPABILITY_CENSUS.md`; earlier status: `reaudit.md`; fixes: `fix2-R1`, `fix2-R2`, `fix2-R3`, `fix2-R4`,
`fix2-R5`, `handoffs.md`).

## In breve (IT)

Delle 11 capacità, **9 funzionano** e **2 sono parziali**; nessuna manca, nessuna è rotta o difficile da trovare.
Funzionano: la richiesta di tiro del DM con riepilogo (TV-92), l’identità nascosta dei PNG anche a ritroso (TV-141), la
concentrazione con tiro salvezza dopo il danno (TV-79), l’iniziativa tirata dai giocatori, digitale o fisica, con
correzione e registro (TV-46), l’incontro della scena in un solo pannello (PR-32), il menu del tiro con vantaggio, danno
critico e «Chi vede» (TV-89), l’Ispirazione eroica prima e dopo il tiro (TV-83), i nuovi tipi di muro con effetto reale
sulla vista (PR-22) e i dadi connessi simulati (TV-95).
Parziali: **TV-52**, perché due goblin uguali messi sulla mappa tirano sempre un solo dado e non c’è modo di separarli (lo
si può scegliere solo per le copie aggiunte dal catalogo); **TV-59**, perché se il DM attiva il «turno di gruppo» proprio
durante il turno del primo goblin, la finestra dice ancora che agisce solo lui e «Termina turno» salta anche il secondo
goblin, che perde il turno senza attaccare. Dal turno successivo l’attacco di gruppo funziona.
La suite Node passa: **2543 test su 2543**.

## Method

Every check starts from «Ripristina esempio» (local storage cleared) and uses only what a new user sees: navigation,
buttons, menus (right-click), dialogs, the command palette. Two identities are driven as two tabs of the same browser
(the role is per tab, the sample state is shared through local storage): tab 1 DM, tab 2 player. Source files were read
only to name a missing control (TV-52 switch, TV-83 Lucky), never to decide a status.

Status: **WORKS** (the whole capability works from the visible UI), **PARTIAL** (a named part is missing or wrong),
MISSING, BROKEN, HARD_TO_FIND. Verification: **M** = driven by hand in the browser; **T** = covered by a Node test only.

## Node suite

`node --test design/blueprint/tests/*.test.mjs` under a 600 s alarm, in the background:
**2543 tests, 2543 pass, 0 fail** (11.3 s; `reaudit-b/logs/node-suite.log`). The count is higher than the 2512 in the
task text because other sessions added tests meanwhile.

## Results

| ID     | Re-audit 1 | Fix claim                      | Now         | Ver.   | Short reason                                                                                                                                                      |
| ------ | ---------- | ------------------------------ | ----------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TV-92  | PARTIAL    | FIXED (R1)                     | **WORKS**   | M      | DM request card with per-row digital/physical roll and live summary; the player never sees rows or results of DM creatures; a plain bonus is titled «Bonus».      |
| TV-141 | PARTIAL    | FIXED (R1, hand-off)           | **WORKS**   | M      | «Nascondi identità» from the token menu; player views (map, order, «Tiri e risultati», history, Registro, start roll call) show only the disguise, retroactively. |
| TV-79  | PARTIAL    | FIXED (R4)                     | **WORKS**   | M      | Mira casts Faerie Fire from the sheet (slot spent, «(C)» chip); damage asks a CON save DC 10 at the Table. Sheet itself gives no hint (note 3).                   |
| TV-46  | PARTIAL    | Fixed (R4 C8, R5)              | **WORKS**   | M      | Roll call: the player rolls own initiative (physical or digital); the DM dialog updates live, sorts, corrects with reason; the log keeps every roll.              |
| PR-32  | PARTIAL    | Fixed (R5)                     | **WORKS**   | M      | Scene editor shows one «Incontro della scena» (the builder's editor); «Dalle pedine della scena», difficulty, «Aggiorna la scena», order, «Avvia combattimento…». |
| TV-52  | PARTIAL    | PARTIAL (R4) + DONE (hand-off) | **PARTIAL** | M      | Identical goblins merge into one start row with one d20, source cited; but placed identical tokens cannot be split: the switch exists only for catalogue copies.  |
| TV-59  | PARTIAL    | FIXED (R4)                     | **PARTIAL** | M      | «Attacco di gruppo» makes one attempt per goblin on the next group turn; enabling the house rule mid-turn makes goblin B lose its turn (repeated twice).          |
| TV-89  | PARTIAL    | FIXED (R1, hand-off)           | **WORKS**   | M      | Right-click on an action-bar attack: advantage, disadvantage, normal, «Danno critico», «Chi vede»; the preview mirrors every choice; audiences respected.         |
| TV-83  | PARTIAL    | FIXED (R1, R2 regression)      | **WORKS**   | M      | «Aggiungi bonus» before; with Heroic Inspiration the attack stops at «Usa Ispirazione eroica: ritira il d20» / «Continua»; reroll spends it, «Continua» keeps it. |
| PR-22  | PARTIAL    | Fixed (R3)                     | **WORKS**   | M (+T) | Barrier panel lists Muro, Finestra, Unidirezionale, Illusoria, Invisibile, Terreno (limitata), Prossimità; the vision effect was checked with «Vedi come Livia».  |
| TV-95  | PARTIAL    | FIXED (R2, R1 C6)              | **WORKS**   | M      | Simulated Pixels pairing, per-die method, tray roll and attack «Dado connesso» wait and land as a physical die named in the Registro (real Bluetooth: owner).     |

Counts: WORKS 9, PARTIAL 2, MISSING 0, BROKEN 0, HARD_TO_FIND 0.

## Journeys (clicks and evidence)

### TV-92 · DM roll request card with result summary: WORKS

1. DM, Table: «Tira i dadi» (bottom bar) opens the «Dadi» sidebar tab › «Richieste» › «Chiedi un tiro»: «Al gruppo»,
   Tiro salvezza, Destrezza, CD 13, «A chi»: Doran, Livia, Mira (checked) + Sentinella (creatura del DM) › «Invia la
   richiesta». The card lists each row «In attesa» with «Dadi digitali» / «Dadi fisici» (`t92-dm-sent.png`).
2. Player tab: bell badge 3; the bell lists «Tiro richiesto: Livia» and «Tiro richiesto: Mira» only (`t92-p2-bell.png`).
   «Dadi» › «Richieste» («2 da tirare»): same card; the DM creature appears only as «Creatura», no name, no dice
   (`t92-p2-req.png`). «Tiri e risultati» lists only Mira and Livia.
3. Livia «Dadi digitali» → «19 · Successo [16] +3 (Destrezza +2, Mantello della protezione +1) · dado digitale»;
   Mira «Dadi fisici», face 5, «Registra» → «7 · Fallimento … · dado fisico». DM tab updates live: «Successi 1 ·
   Fallimenti 1 · In attesa 2», «Concludi la richiesta» (`t92-dm-summary.png`).
4. Plain bonus title: player, «Dadi: Fisici», «Dardo di fuoco», «Aggiungi bonus al tiro per colpire» 2, click Esploratore
   › «Ho lanciato i dadi» › «Risolvi tiro»: the dialog reads «Bonus: Bonus aggiunto + 2», not «Effetti delle condizioni»
   (`t92-bonus-resolve.png`).

### TV-141 · Hidden NPC identity: WORKS

1. Player first attacks the Sentinella («Dardo di fuoco» › click token): «Tiri e risultati» reads «Sentinella · 3 danni».
2. DM: right-click the Sentinella › «Visibilità ›» › «Nascondi identità…» › dialog «Nome non identificato» (default
   «Figura incappucciata») › «Nascondi identità» (`t141-dialog.png`).
3. Player tab, without reload: map label «Figura incappucciata»; the page text contains no «Sentinella»; the earlier result
   now reads «Figura incappucciata · 3 danni», also in «Storico dei tiri» (`t141-p2-tiri.png`); the Registro shows no
   target name and not the DM's line «Identità nascosta: …» (`t141-p2-registro.png`); the start roll call and the running
   order show «F Figura incappucciata» (`t46-p2-rollcall.png`, `t46h.log`). The DM keeps «Figura incappucciata ·
   Sentinella» everywhere.

### TV-79 · Concentration on damage with a save: WORKS

1. Player: «Personaggi» › Mira «Apri scheda» › tab «Magie» › Luminescenza «Lancia ▾» › «1° · 3/4» › dialog (Slot di
   livello 1: 3 → 2) › «Lancia»: slots 2/4, chip «(C) Luminescenza ×» on the HP card, «Concentrazione: Luminescenza ·
   lanciata da questa scheda» (`t79-after-cast.png`).
2. Same sheet: type 5 › «Danno» → «5 danni · PF 12 → 7» (`t79-after-damage.png`). The sheet says nothing else.
3. Bell panel header: «Richieste in attesa · 1 richiesta attende una risposta al Tavolo · Apri tiri e risultati»
   (`t79-bell.png`). Table › «Tiri e risultati»: «Mira · Concentrazione · CD 10 · In attesa · Risolvi tiro» › dialog
   «Tiro salvezza di Costituzione · CD 10. Se fallisce, questo effetto termina.» › «Registra tiro» → «14 + 2 = 16»
   (`t79-resolve.png`, `t79-resolved.png`).

### TV-46 · Initiative digital or physical, sort, reroll, discard, undo, log: WORKS

1. DM, «Il cortile dell’osservatorio»: «Avvia combattimento» › dialog «I giocatori vedono «Tira l’iniziativa» sulle loro
   creature… Annulla l’avvio»; rows show «Aspetta il tiro di chi gioca Livia, oppure tira tu» (`t141-start-dlg.png`).
2. Player tab: map alert «Tira l’iniziativa di Livia.» with «Tira l’iniziativa», «Dado fisico…», «Più tardi»; Registro line
   «Il DM avvia il combattimento: tirate l’iniziativa» (`t46-p2-rollcall.png`). «Dado fisico…» › «d20 fisico» 17 ›
   «Registra»; the alert moves on to Mira › «Tira l’iniziativa» (digital).
3. DM dialog updates without closing: «Livia ha tirato 19 · puoi correggerlo scrivendo il d20», «Mira ha tirato 5»,
   «Aggiornato con le modifiche salvate in un’altra scheda.» «Tira PNG»; missing roll named: «Manca il tiro d’iniziativa
   di: Doran. Usa «Tira tutti» o scrivi il d20 fisico.»; typed 11 for Doran › «Inizia combattimento»: order 19/13/10/8/5
   (`t46-dm-started2.png`, `t46-dbg.png`).
4. DM tracker (sidebar «Combattimento») › row «⋯»: «Correggi iniziativa…», «Togli dal combattimento», «Segna sconfitta»…
   «Correggi iniziativa: Esploratore» (d20 fisico 19, Motivo) › «Registra la correzione»: Esploratore 21 moves first, the
   turn stays Livia's (`t46-corr.png`). Registro: «Livia tira l’iniziativa», «Mira tira l’iniziativa» and each DM roll,
   with «Dado fisico» / «Dado digitale» (`t46n.log`).

### PR-32 · Prepared encounter distinct from its start: WORKS

1. DM: «Campagne» › «Apri campagna» › «Preparazione» › «Agguato sulla strada» «Modifica»: the editor ends with one
   «Incontro della scena» (no «Incontro preparato» heading): «Nuovo incontro per questa scena», «Dalle pedine della
   scena», «Collega a questa scena».
2. «Dalle pedine della scena»: the builder's own editor in place: catalogue, party «Livia 3 · Doran 3 · Mira 3»,
   «Difficoltà 2024» (Facile 450, Media 675, Difficile 1.200: correct 2024 budgets for three level-3 characters), creature
   groups, «Al tavolo: Preparato · scena «Agguato sulla strada»», the scene's initiative order and «Avvia
   combattimento…» (`t32-enc.png`, `t32f.log`). «Apri in «Incontri»» opens the same encounter in the builder.
3. After adding creatures: «Le creature sono cambiate dopo la preparazione: +3 / −0» › «Aggiorna la scena» → «3 creature
   create · Pedine create (3)» (`t32-prepared.png`). Saving/preparing and starting stay separate buttons.

### TV-52 · Group initiative for identical NPCs as an option with source: PARTIAL

Works:

- DM: «Scene» › «Attiva per il gruppo · Agguato sulla strada» › «Avvia combattimento»: one row «Goblin guerriero A, B · PNG
  · Iniziativa +2» with one d20 (`t52-start.png`); «Tira tutti» gives both the same total; the order keeps them together.
- Source: scene order «Un solo tiro per un gruppo di creature identiche · SRD IT p. 14 · EN p. 13»; tracker settings «Base
  2024: un solo tiro d’iniziativa per un gruppo di creature identiche, ma ciascuna ha il suo turno … SRD 5.2.1 · IT 14»
  (`t59-house-rule.png`).
- Option: in the builder, a catalogue row with quantity 2 («Uno in più: Goblin tirapiedi») shows the switch «Iniziativa
  condivisa» ↔ «Iniziativa individuale» (tooltip «Acceso: un solo tiro per tutte le copie (regola SRD). Spento: ogni copia
  tira il suo d20.»); switched off, the scene order lists «Goblin tirapiedi 1» and «Goblin tirapiedi 2» separately
  (`t52i.log`, `t32n.log`).

Missing part: identical creatures placed as tokens (the seeded goblins, or any encounter made with «Dalle pedine della
scena») are always merged; neither the start dialog nor the encounter rows («Opzioni»: only «Lato» and «Rimuovi») offer
the switch, so the DM cannot let the two goblins roll separately. «Scollega» (unlink the stat block) does not split them
either (`t32k.log`). Inconsistency for a first-time user: two separate «Aggiungi» clicks on the same catalogue creature
give two rows marked «Iniziativa separata», while two tokens of the same creature are grouped. The source of the switch is
only in its tooltip. Copy DDB's per-group initiative toggle / Improved Initiative: offer the same switch on merged rows
(start dialog or encounter row).

### TV-59 · Attacks of several creatures with one command: PARTIAL

Works (round 2):

- Goblins have SRD attacks: selecting Goblin guerriero A shows «ARMI Arco corto, Scimitarra» (`t59b.log`).
- Tracker › «Attacco di gruppo…» on goblin A's turn explains the 2024 baseline: «Ora agisce solo Goblin guerriero A: nelle
  regole 2024 ogni creatura attacca nel proprio turno… serve la regola della casa «turno di gruppo» (come Mob Attack
  Tool). Attiva il turno di gruppo…» › tracker settings › «Turno di gruppo per creature uguali · regola della casa» › «Salva».
- Next goblin turn: «Turno di gruppo (regola della casa): ogni creatura usa la propria azione, un tiro ciascuna.
  Attaccanti Goblin guerriero A · Arco corto, Goblin guerriero B · Arco corto» › target Livia › «Attacca»: two attempts
  (23 hit, 11 miss), Livia's «Scudo» reaction offered for the hit (`t59-state.png`).

Wrong (reproduced twice, `t59g.log`, `t59l.log`): the dialog offers «Attiva il turno di gruppo…» during goblin A's turn.
After enabling it there, the tracker already shows «Goblin guerriero ×2 · Turno di gruppo», but «Attacco di gruppo…» still
says «Ora agisce solo Goblin guerriero A … serve la regola della casa», and «Termina turno» passes the whole group: the
next turn is Mira's (or Doran's, round 2), so goblin B loses its round-1 turn without acting. Expected (Mob Attack Tool,
SRD turn order): either the rule applies to the current group turn at once (both listed), or it starts at the next round
and this turn still passes to goblin B.

### TV-89 · Roll menu: advantage, disadvantage, flat, critical, visible alternative: WORKS

1. Player: right-click «Bastone ferrato» or «Dardo di fuoco» on the action bar → menu «Tira con vantaggio», «Tira con
   svantaggio», «Tira normale (un d20)», «Danno critico: i danni come colpo critico», «CHI VEDE: Tutti · Io e il DM · Solo il
   DM · Solo io» (`t89-menu.png`).
2. Each choice opens the preview and combines: «Circostanze dichiarate: Vantaggio», «Danno critico» checked with «Motivo del
   critico (lo legge il DM)», «Chi vede il risultato: Solo il DM» (`t89-preview-section.png`). The same controls are the
   visible alternative to the right-click.
3. Click the Sentinella: player card «Chi vede: Solo il DM · Danno critico dichiarato · Livia · Attacco: Risultato riservato
   al DM»; DM card «max(1, 8) + 5 = 13 … 4 + 8 + 0 = 12 … Critico (danno critico dichiarato)» (`t89-tiri-player.png`,
   `t89-tiri-dm.png`). Long press on touch was not driven.

### TV-83 · Pre-roll and post-roll bonus windows (Inspiration, Luck): WORKS

1. Pre-roll: every attack preview has «Aggiungi bonus al tiro per colpire» (TV-92 step 4).
2. Post-roll: player, «Tira i dadi» › switch «Ispirazione eroica» (Livia) › «Dardo di fuoco» › click Esploratore: «Tiri e
   risultati» opens by itself: «Scegli: ritira o continua … 18 + 5 = 23 · Hai l’Ispirazione eroica: puoi ritirare il d20 …
   Nulla colpisce né infligge danni prima della scelta. Usa Ispirazione eroica: ritira il d20 · Continua»
   (`t83-after.png`). «Usa…» → «7 + 5 = 12 · ritirato con Ispirazione eroica: 18 → 7», switch now off (`t83b.log`).
   «Continua» on a second run → resolved, inspiration still on (`t83c.log`).
3. Luck: the app has no Lucky feat (no «Fortunato»/«Lucky» string in the source); Lucky is not among the SRD 5.2.1 feats,
   so under I-236 its absence is not a gap.

### PR-22 · Barrier kinds: one-way, window, transparent, terrain, illusory: WORKS

1. DM, Table: left bar «Nebbia e visione» › «Barriere»; hint «clic su un muro per sceglierne il tipo (finestra,
   unidirezionale, illusoria, invisibile)». Click a wall: «Barriera 5/10 · Muro · Finestra · Unidirezionale · Illusoria ·
   Invisibile · Terreno (limitata) · Prossimità» with one explanation line each (terrain: «Blocca vista e luce solo se la
   linea ne attraversa due o più (erba alta, tende sottili). Si attraversa.»; proximity: «Vede attraverso chi è entro (m)»,
   «Blocca la vista, salvo a chi è entro la distanza indicata (una grata, una siepe fitta). Non si passa.»).
2. Effect: sidebar «Visione» › «Visione dinamica dai muri e dai sensi» on; «Strumenti del DM» › «Teletrasporta (DM)» the
   Esploratore into the north room; «Vedi come Livia». Wall between them set to Muro → room dark, Esploratore hidden;
   Terreno (limitata), one wall crossed → visible; Prossimità (default distance, Livia far) → hidden
   (`t22-view-strip.png`). Not driven: two terrain walls in a row and a viewer inside the proximity distance (covered by
   `tests/r3-walls.test.mjs` and the fixer's browser check).

### TV-95 · Smart Bluetooth dice: WORKS (simulated, I-233)

1. Player: «Tira i dadi» › «Impostazioni» › «Dadi connessi · simulazione» («Qui non c'è Bluetooth: dadi, batteria e lancio
   sono simulati.») › «Cerca dadi vicini»: five Pixels dice with type, signal, battery («Batteria scarica: ricaricalo
   presto.») › «Collega» (d20 Onice): «I tuoi dadi … Connesso · Batteria 86% · Simula il lancio · Fai lampeggiare ·
   Scollega · Dimentica · Rinomina»; «Come tiri ogni dado» d20 switches to «Dado connesso» (`t95-paired.png`).
2. «Tira» › «Tira 1d20»: «In attesa del dado connesso… Pixels d20 Onice · batteria 86%» › «Simula il lancio» → «20 [20] = 20
   fisico · Pixels d20 Onice» in «Ultimi tiri» (`t95-waiting.png`, `t95-landed.png`).
3. Attack (C6): «Dadi: Fisici», «Dardo di fuoco» › Esploratore › «Ho lanciato i dadi» › «Risolvi tiro»: «Dadi: Digitali ·
   Fisici · Dado connesso» › «Registra tiro» → «In attesa del dado connesso» › «Simula il lancio» → hit 21; Registro card
   «Dado fisico · Pixels d20 Onice» and «Dado connesso collegato (simulato): Pixels d20 Onice» (`t95-registro.png`).
4. Palette: «dadi bluetooth» and «dadi smart» both find «Dadi connessi (Pixels, Bluetooth)…». Real Bluetooth stays an owner
   and hardware decision.

## Findings for the coordinator

1. **TV-59 (PARTIAL, rules):** enabling «Turno di gruppo» from «Attacco di gruppo…» during the first goblin's turn makes the
   second goblin lose its turn; the dialog also contradicts the tracker («serve la regola della casa» while the rule is on).
   Likely `combat-tracker.mjs` group-attack dialog and `combat-tracker-domain.mjs` turn passing (the rule should apply to
   both or neither on the current turn).
2. **TV-52 (PARTIAL):** no «Iniziativa condivisa / individuale» choice for merged placed tokens (start dialog rows, encounter
   rows built «Dalle pedine della scena»); two «Aggiungi» rows of one catalogue creature say «Iniziativa separata» while two
   tokens of it are grouped. `encounter-builder.mjs` shows the switch only for `count > 1`.
3. **TV-79 (note, discoverability):** damage applied on the sheet leaves no hint there that a Concentration save is waiting;
   the bell badge number does not rise (it stayed 1, the unread invite) although the bell panel header lists the request.
   At the Table «Tiri e risultati · 1» does show it. Registry plan §5.2 rule 8 asks that a closed panel never hides a
   request.
4. **TV-46 (note, friction):** after «Tira tutti» / «Tira PNG» the 3D dice result card («Clic o Esc per chiudere») covers
   the start dialog's «Inizia combattimento» until dismissed; a click on the button hits the card instead.
5. **Copy (TV-141, PR-32):** internal census codes are shown to users: «Modello: Fantasy Grounds ID (R20-155), Foundry
   Anonymous (FVT-126), Beyond20 (VTL-223)» in «Nascondi identità», and «Fasce come Kobold+ (strategia 2024, CMP-106)» in
   the encounter difficulty. The scene order also labels a single row «Goblin tirapiedi ×1 · Goblin tirapiedi 3».
6. **Layout (PR-22):** in barrier mode the session strip («Stop · carta X (anonimo)», «Rallenta») sits over the top wall of
   the courtyard; a click meant for that wall sent an anonymous X-card Stop in this re-audit (sample state only, cleared by
   «Ripristina esempio»).

## Side effects

All actions changed only the sample data in this browser's local storage (reset at the start of every journey); the
session `d20-reaudit-b` is closed. One unintended action: the anonymous «Stop · carta X» of finding 6, in sample data.
No product file, test or shared document was edited; this report is the only file written in the working tree.
