# Browser checks — integrated blueprint

Run against the local static server on `http://127.0.0.1:8879/` with the
installed Playwright CLI. These scripts use **synthetic demo data** and reset
or change that browser's local state. Use a separate named browser, never a
real campaign browser. No package installation is required.

Evidence working directory used on 23/09/2026:
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence`.
Image output and invalid-file fixture paths are explicit in each script. The
`invalid-map.txt` fixture (plain text) stays in `2026-09-23/`; create it there
before the preparation check. Since 24/09 each script writes its images into a
dated subdirectory named in the script (for example `2026-09-24/maint/`,
`2026-09-24/inc10-closure/`, `2026-09-24/B11b-fix/`); create it before running.
Adjust paths when reproducing on another machine. Do not write artifacts to a
cloud folder.

Example from the evidence working directory, after opening the named browser:

```sh
playwright-cli -s=d20-blueprint open http://127.0.0.1:8879/
playwright-cli -s=d20-blueprint --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/core-journey.js
```

Run sequentially against the same named browser, not concurrently:

1. `core-journey.js`: state/HP/inventory/physical dice/undo/offline/keyboard.
2. `preparation-journey.js`: private scene, public reveal, activation, draft
   navigation, invalid upload, empty scene.
3. `gestures-and-views.js`: reset seed, mouse drag/cancel/budget/pan,
   EN inventory and isolated mobile touch navigation.
4. `back-guard-journey.js`: browser Back cancellation/discard of an editor draft.
5. `measure-journey.js`: measurement independent of remaining movement and no mutation.
6. `visual-fixes-journey.js`: one current local section; mobile control/token
   dimensions, correct label typography, touch selection and no page overflow.

7. `combat-journey.js`: initiative from actual preparation, physical attack,
   pending reload, critical, damage, correction, immutable roll history.
8. `area-journey.js`: actual scene token drag, aimed cone with allied target,
   fixed placement, common physical damage and individual saving throws.
9. `multi-self-journey.js`: repeated dart allocation, per-dart result, Dash
   destination and resource cost, no-roll actions, Dodge expiry.
10. `combat-mobile-journey.js`: separate touch context, English digital/physical
    combat, short ordinary movement through Dash, map/detail shortcuts,
    responsive palette and page/window errors including ResizeObserver.
11. `encounter-lifecycle.js`: stage/create/clone/remove NPC tokens, initiative
    digital/reroll/discard/undo, offline, physical save and actual start.

The first core/gesture scripts now prepare initiative through the same UI;
there is no obsolete “Start scenario” shortcut. New encounter check was first
run after removing the trailing semicolon around its outer arrow expression:
this CLI wraps the file as an expression. Keep that final semicolon absent
when formatting scripts. All edits and assertions are against synthetic data;
localStorage reads assert state but do not inject fixtures.

Scripts 4–11 were added after separate reviews and integration checks.
Wait for each command's completion. A hash-only navigation does not reload
modules; the regression scripts explicitly reload when fresh code is needed.
The CLI's upgrade banner is not a test failure or an instruction to install.

Screenshots are artifacts of asserted journeys, not a substitute for assertions.
This is partial coverage, not an exhaustive browser suite for the full contract.

Increment 3 adds four sequential journeys:

12. `reactions-journey.js`: configured melee, stop/reload, private opportunity,
    physical hit, Shield without premature damage, Escape, same-path resume.
13. `concentration-journey.js`: manual effect/cancel, no casting cost, decline,
    damage then pending CON, threshold/breakdown, reload, fail/change strategy.
14. `simultaneous-reactions-journey.js`: actual keyboard geometry, explicit
    order, EN mobile requests, sequential declines, no resource use on offers.
15. `new-npc-reaction-journey.js`: new NPC neutral default, explicit hostility,
    custom melee/save/start, actual opportunity and physical miss.

These disable module cache using routing for iterative source verification.
Coordinate reads follow any scheduled focus/scroll change before pointer
placement. Simultaneous geometry uses keyboard input to avoid sub-pixel
screen rounding changing whether two exits are actually simultaneous.

Increment 4 adds three journeys:

16. `spatial-journey.js`: create actual scene, cancel/draw/calibrate/save,
    initiative/start, closed door rejects, open/cost, editable waypoints,
    difficult terrain cost, undo, keyboard add/Escape. Leaves the fixture
    ready with an open door and full Livia movement/action.
17. `approach-journey.js`: run after spatial; melee preview, physical arrival
    without action spend, minimize/reload, Change, actual throw, distinct
    result/attempt undo, subsequent digital attack. Uses the actual prepared scene.
18. `spatial-mobile-journey.js`: run after spatial; copies that synthetic
    browser state into an isolated touch context, without changing its values.
    EN, Escape from action bar, door Utilize/undo, waypoint/cancel/offline,
    digital approach at touch target click, responsive error/overflow checks.
    Run it directly after 16, before 17: it requires Livia's full movement and
    action, which 17 spends (it stops with «Run spatial journey first»).

The CLI also rejects a **leading** semicolon before the arrow expression.
Formatter output may add it even with no-semi: remove that wrapper separator
before running, preserving semicolons inside the function. Current scripts
have neither a leading nor a trailing wrapper semicolon.

Increment 5 adds four journeys. Start in Italian using the visible Preferences
control if a preceding check left English selected. Run sequentially:

19. `builder-journey.js`: resets the synthetic fixture; creates Mira through
    actual choices, guards/save/reload, story edit, private offline resource
    correction, DM privacy and explicit campaign connection. Leaves Mira ready.
20. `builder-advance-journey.js`: run immediately after builder-journey. Applies
    fighter1→2 while current HP and story change on the live sheet; retains
    spent Second Wind, inventory and shared membership after reload.
21. `builder-reconstruction-journey.js`: reconstructs Iria wizard3 with known
    current/max/temp HP, consumed slots/Hit Dice, explicit partial-data
    acknowledgment and empty equipment; corrects a slot below spent uses.
22. `builder-dice-journey.js`: resets the fixture. Rejects overspent point buy
    and missing physical faces; persists physical/digital outcomes privately;
    protects saved draft on role switch. Ends in English at a 390px viewport.

These scripts read localStorage only to assert consequences of visible UI
commands; they do not manufacture the main journey state. The mobile builder
check is viewport/layout coverage, not a separate touch-input exercise.
All four passed against increment5; screenshots are external local artifacts.

23. `builder-recovery-journey.js`: resets the fixture and switches to player.
    Wizard→Fighter leaves an explicit removable stale spell/preparation;
    Criminal→Sage leaves the old DEX bonus correctable; a rejected physical
    roll retains6/5/3/empty and accepts only after filling the fourth face.
    Reacquires current controls after render; three browser groups passed.

Increment 6 adds six journeys; all passed against the final source snapshot.
Run 24–26 in order. The file recovery check also uses the export from26.
The touch check has its own browser context. All fixtures are synthetic.

24. `library-journey.js`: resets example; private creation, guarded departure,
    explicit sharing/enablement/assignment, revision comparison while unavailable,
    then update maximum3→4 keeping2 spent uses across reload. Three groups.
25. `library-builder-journey.js`: creates from a builder choice, returns to the
    same private draft, retries without duplicates and checks contextual type
    filtering versus consulting all types. Three groups.
26. `library-files-journey.js`: actual download, malformed JSON and wrong format,
    import preview and idempotent existing revision, private offline authoring
    versus blocked shared access mutation. Two groups. Before running, put
    `library-invalid.json` containing `{` and `library-wrong-format.json`
    containing `{"format":"wrong-app","version":1,"contents":[]}` in the
    evidence directory. The CLI code sandbox has no global `Buffer`; use files.
27. `library-mobile-journey.js`: isolated English touch context, authoring,
    revision choice, dirty departure/Escape and desktop/390px layout. Three groups.
28. `library-spell-recovery-journey.js`: constructs a synthetic two-grant setup
    through the domain API, then uses real builder controls to remove, reload
    and reselect the updated spell. Same instance,3 uses retained; the other
    grant keeps its original revision and2 uses. Two groups. This fixture setup
    is explicit and is not a claim to have built both grants through the UI.
29. `library-import-recovery-journey.js`: delays a real File.text promise,
    starts a different dirty editor and proves stale completion cannot replace
    it. Then imports from a builder choice, reloads and returns the chosen
    content to that draft. Two groups. Uses the downloaded file from26.

The six final runs reported15 named groups and no page/window errors. Scripts
assert persisted state in addition to reachable controls. Screenshots/logs and
exported files remain outside the repository. The increment6 manifest pins the
source; this is no attestation of the complete product or final visual style.

Increment7 adds six journeys. Run30–33 in order against the same synthetic
fixture;34–35 create isolated contexts. Root owns this browser exclusively.

30. `campaign-notes-journey.js`: resets fixture; Table note dirty guard/Escape,
    private save/reload/apply; DM direct/list/search non-disclosure; restore
    appends history without changing game state. Three groups.
31. `campaign-world-journey.js`: shared place with hidden section, linked recap,
    Home → recap → place → return → Table → campaign. Two groups.
32. `campaign-sessions-journey.js`: draft/direct date/change/cancel and optional
    poll/own response/withdraw/explicit organizer confirmation. Two groups.
33. `campaign-sharing-journey.js`: distinct ACL, private history and revocation;
    offline draft recovery; domain-generated stale revision, explicit rebase.
    Three groups. The fixture is not real multiplayer.
34. `campaign-mobile-journey.js`: isolated390px touch, English/New York versus
    Rome repeated/missing hour, personal note and dirty guard;1440px recheck.
    Two groups. Context closes after success.
35. `campaign-integration-journey.js`: domain-generated revoked-member fixture,
    new hub/shell/search privacy and own note access; actual builder/Library
    note trips preserve context after reload. Two groups. Context closes;
    script also closes earlier isolated contexts in this root-exclusive browser.

All14 groups and the updated core13 regression groups passed on increment7.
Use the explicit first Close control where both icon and footer match. Do not
add a second dialog auto-handler: the CLI already handles native dialogs.
Screenshots/logs remain external under the evidence directory. Local-time labels
were refreshed after the fix; earlier images are not current UI evidence.

Increment8 adds four isolated-context journeys; root exclusively owns the shared
browser session. Each script uses synthetic data and closes its context after
success. On failure the next rest script closes the prior isolated context.

36. `rest-shared-journey.js`: Table partial-party start, pure preview, DM clock,
    player completion, physical pending/Escape/reload/invalid input/known-face
    Undo; digital die, Arcane Recovery alias and sheet return. Three groups.
37. `rest-time-journey.js`: sleep conditions/concentration, actual prepared
    initiative interruption and immediate benefits, atomic Undo, long recovery,
    interval restriction, actual round clock/Undo. Three groups. Prepared
    initiative is fixture data; combat start/end-turn are actual UI commands.
38. `rest-mobile-personal-journey.js`:390px English touch, personal offline,
    explicit elapsed time, quick physical sequence/cap, reasoned correction,
    horizontal bounds, shared offline denial and private DM exclusion. Four groups.
39. `rest-reversed-journey.js`: five real Undo commands, then reload/reopen:
    removed rest leaves a known reversed face visible without an apply command.
    One group. This covers review R4 in the real mounted dialog.

Screenshots remain outside the checkout. Journey setup and state assertions do
not claim real multiplayer, a complete catalog or production security.

Increment9 adds five isolated-context journeys:

40. `companion-map-journey.js`: manual creation, genuine text-blur→profile
    click, Escape, free direct placement, shared identity/reload/sheet. Two groups.
41. `forms-journey.js`: free preview/Escape, one canonical Wild Shape use,
    effective movement/weapon availability, actual move, live HP correction,
    return/Undo/reload without resource or position refund. Two groups.
42. `familiar-journey.js`: real casting start, close/reload, shared hour through
    DM time controls, invalid map point/Escape, completion costs and free later
    placement, own sheet and no attacks. Three groups.
43. `forms-mobile-journey.js`:390px English touch, Wild Companion with selected
    spell-slot cost, keyboard appearance/placement, dismiss/reappear/Escape,
    shared offline denial and layout/window errors. Three groups.
44. `companion-personal-journey.js`: explicit personal-parent fixture, then UI
    creation, own-sheet connection/cancel/apply/reload, DM reads the creature
    without its private parent, later free placement. Two groups. Initial
    personal status is fixture setup, not a demonstrated unsharing workflow.

Wait for placement controls after route changes before sending Escape. Before
reading screen coordinates, a trial map click waits for stable geometry; this
avoids a scripted click racing shell layout. Assert resulting coordinates with
subpixel tolerance. Browser checks inspect actual commands, not injected outcomes.
The creation/advancement regressions now call their synthetic character Neris
and read the applied draft's actor ID, keeping it distinct from demo druid Mira.

Increment10 adds four journeys (24/09/2026, own browser `-s=d20-conditions-check`,
cwd = evidence directory). Run 45–47 in order against the same browser; 48 creates
and closes its own touch context. Logs: `increment10-<script>-final.log`; images
`conditions-{a,b,c,e}-*.png` and `dice-d-*.png` in the evidence directory.

45. `conditions-journey.js`: resets; sheet → Conditions and status, typed search,
    Poisoned from a stated origin with an end-of-next-turn term, preview without
    mutation, Apply; chip on sheet and Table inspector; Termina with reason, Undo;
    second origin (×2, one penalty) and ending only that origin; keyboard Exhaustion
    stepper (speed 9→6 m); Escape after preview and in-panel Cancel leave state
    identical; reload. Then resets for the Table group: DM Prone on an adjacent and a
    distant sentinel, melee Advantage / ranged Disadvantage reasons, Prone attacker
    Disadvantage, mouse drag crawling (1.5 m costs 3 m) and `Rialzati · 4,5 m`
    (6→1.5 m, action/Dash unchanged). Returns `findings` without failing.
46. `conditions-death-journey.js`: resets; five-creature initiative; panel damage to
    0 HP; one death save per real turn start in header `Richieste` (Tiri e risultati);
    physical typed face, then digital die checked against the rolled face (a natural
    20 branch re-drops Livia before the aid); Mira's Help with Medicine (physical 15)
    → Stable; healing ends Unconscious, Prone remains; Doran natural 1 + damage at
    0 HP → Dead on token/sheet, Cura disabled; reload keeps all of it.
47. `dice-correction-journey.js`: resets until a normal digital hit (≤8 fresh
    examples): declared Fire Bolt, digital attack and digital damage in the common
    dialog, two Undo, `Riapplica risultato noto` correction 20 with reason, 2d10
    damage keeps the known face and `Completa il tiro` asks only for die 2; history
    and reload. Group 2: a fully digital click-to-attack is two commits (attempt,
    then dice); one Undo keeps the attempt spent with known faces, a second
    withdraws it, and an identical retry reuses the same faces (`Riusato`).
48. `conditions-mobile-journey.js`: isolated 390×844 English touch context: tap
    entry, add/preview/apply, stepper, Close with a draft, Table inspector and 0 HP
    pips; overflow, ≥40 px targets (44 px shortfalls reported), page/window errors.

Digital dice are random: scripts assert the consequence of the face actually
recorded, not a fixed value. Regressions `core-journey.js` and `combat-journey.js`
passed in the same final pass. Only the known "Form submission canceled" console
warnings appeared; no page or window errors.

Increment 10 fixes and closure (24/09/2026) add two journeys. Since the closure,
`conditions-*`, `forms-journey.js` and `builder-*` write images to
`2026-09-24/inc10-closure/`. `forms-journey.js` and `builder-advance-journey.js`
now correct HP through the sheet entry and the **Condizioni e stato** panel
(`[data-conditions-entry]` → Correggi PF e stato → value and reason → Preview →
Apply → Close); the old direct HP dialog no longer exists.

49. `conditions-fixes-journey.js`: single HP entry on the sheet, Temporary HP
    keep/replace, field-level validation, potion refused while Incapacitated,
    return to the panel after a vital roll, Stand up disabled with a visible reason,
    private origin absent from the DOM after a role change (shared log line stays).
50. `conditions-badges-journey.js`: token status badges (Prone, Unconscious,
    dying, dead, several conditions) readable on the token rim at 1440 (DM, IT) and
    390 (player, EN, touch); inspector keeps the full list. The badge state is built
    in-page through the conditions domain (explicit fixture setup, not a UI path).
    Measures diameter, glyph, colour and overlap with the initial. Two groups.

Area registry B11 (24/09/2026). Both scripts open their own context, close earlier
isolated contexts and reset this browser's demo state. They need the local static
server on `127.0.0.1`: `?fixture=` loads test areas only on a local host.

51. `registry-smoke-journey.js` (rewritten by B61 for 22 built areas): without
    fixtures the report lists every planned area of `extensions.mjs` by status, 0
    failures, and every linked area stylesheet belongs to a ready area; with
    `?fixture=sample-extension` every extension point appears in place (page, header
    service, B23 search, B30 Home widget, campaign section, sheet tab, Library tab, table
    tool in the Ping group, layer, DM sidebar tab, preparation section, settings, B24
    bell notifications, commands, state slice with reload/Undo/Reset);
    `?fixture=failing-extension` and a module that fails to register stay contained;
    events, DM-only page, area draft guard; no overflow at 1440/390. 18 groups.
    Evidence: `2026-09-24/B61/registry-smoke/`. It fails by design if a real area
    module being built in parallel fails to load.
52. `b11b-inc10-fixes-journey.js`: review fixes for B11b and increment 10: area
    command refusals and offline refusal without warnings, report notice, failing
    Preferences write, reserved keys, table tool lifecycle, core-then-area draft
    guard, hidden campaign section, 390 px navigation and DM toolbar, death-save
    Undo reuse (`Riapplica`, `Riusato`), pending out-of-initiative save expiry at the
    turn start, Correct HP refusing 0 HP. 11 groups. Evidence: `2026-09-24/B11b-fix/`.
    Its two throwaway probe areas (`fix-probe`, `fix-keys`) exist only through
    `page.route` interception: the probes pass only with that interception.

Maintenance 24/09/2026 (session `d20-maint`, cwd `2026-09-24/maint/`, logs
`<script>.log`): `preparation-journey.js` now reads the revealed scene from the
campaign overview (`.campaign-row` with **Consulta mappa**, which replaced
`.shared-scenes .item-row` / **Consulta**); `measure-journey.js` expects the label
`Misura diretta:`; `gestures-and-views.js` expects the over-budget text
`… rosso oltre il movimento.` (replacing «supera il movimento»). Assertions are
otherwise unchanged; images go to `2026-09-24/maint/`. Results: preparation 9/9,
gestures-and-views 8/8, measure 2/2, no page errors.

Table structure B61 (24/09/2026, session `d20-b61`, cwd `2026-09-24/B61/`):

53. `b61-table-structure-journey.js`: at 1440 (IT) and 390 (touch, IT/EN), player and
    DM: header and Table top line without area buttons (DM 4 core commands, player 1);
    map toolbar groups inside the map, every tool reachable in ≤ 2 clicks; every sidebar
    tab opens in one click without overflow, DM-only tabs hidden; tablist keyboard
    (arrows, Home/End, Enter, focus kept); per-identity memory across a role switch and
    a reload; collapse; selecting a token keeps the tab; bottom bar resources and
    commands; an action preview opens the Creature tab; free-roll dice let a click
    through, the own practice save keeps the modal BG3 screen; phone tab bar pinned
    under the action bar with Map; Help in the App menu at the Table; first-visit tip
    off the map. 6 groups plus measurements. Evidence: `2026-09-24/B61/journey/`.
    Journeys updated for the new placement are listed in
    `changes/interview-01/blueprint-table-structure-evidence.md`.

B61 review and fixes (24/09/2026, session `d20-b61-rf`, cwd `2026-09-24/B61-rf/`):

54. `b61-review-fixes-journey.js`: findability audit of every wave-1 area entry point
    from its natural context, player and DM, at 1440 (mouse) and 390 (touch): header
    services, every sidebar tab, every area map tool, the token menu (right-click, long
    press, Creature tab), the B14 HUD, and from Home the character library, community,
    invitations, compendium, library files and every campaign section. A target counts
    only if no inner strip has to scroll sideways (or a rail vertically) to show it and
    nothing covers it; each entry point must take ≤ 2 clicks. Also: «Tutti i pannelli»
    by keyboard and in EN; the DM's 13 tabs inside a 1366 × 768 rail; on the phone the
    open tab, Map and All panels stay on screen; «Tutte le sezioni» on the campaign
    strip; the action bar keeps End turn, Undo and Cancel on screen in combat; at 125 %
    interface and text every tool of every toolbar group can be scrolled into view and
    pressed. 6 groups and a per-entry audit. Evidence: `2026-09-24/B61-rf/journey/`.

B61 regression (24/09/2026, session `d20-b61-regress`, cwd `2026-09-24/B61-regress/`): all
88 scripts of this folder, in this README's order (18 before 17), then the wave-1 area
journeys B12–B60 and `w1b-shell-journey.js`, as redirected copies (`scripts/prep.sh`,
`scripts/run.sh`, `scripts/order.txt`). Two scripts updated for placement drift, assertions
kept: `b11b-inc10-fixes-journey.js` (pages loading `fix-probe` answer B18 `annotations.mjs`
as not built, because B18 already replaces the core Measure tool the probe replaces; the
Log is checked as a sidebar tab at 390) and `w1b-shell-journey.js` (Help in the Home header;
at the Table on a phone, in the App menu). Report:
`changes/interview-01/blueprint-b61-regression.md`.

W2a1 integration (24/09/2026, session `d20-w2a1-integ`, cwd `2026-09-25/W2a1-integ/`):
`w2a1-shell-journey.js` checks the clean load, every page and Table tab of B32, B35, B39,
B42–B45 for both roles, «Cosa è pronto», header and top line density at 1440 and 390 (IT/EN),
the findability of the wave's entry points and the Table tab list's keyboard focus. Four
scripts follow the wave's seed and tabs: `character-library-journey.js` and
`campaign-settings-journey.js` read the token and scene counts from the stored scenes (B35
adds the Lantern tower), `session-view-journey.js` opens Preparation from the Table's «Scene»
when the one-scene shortcut is absent, and `b61-review-fixes-journey.js` audits the wave's
tabs too and returns `railOverflow` (tabs a rail cannot show, reached from All panels) instead
of requiring every DM tab inside a 1366 × 768 rail. `measure-journey.js` must follow
`gestures-and-views-journey.js` (after `preparation-journey.js` the active scene has no Livia).
Report: `changes/interview-01/blueprint-w2a1-integration.md`.

W2b2 integration (24/09/2026, session `d20-w2b2-integ`, cwd `2026-09-25/W2b2-integ/`):
`w2b2-shell-journey.js` checks the clean load, the pages and the Scene tab of B41, B46, B47,
B53, B57 and B58 for both roles, «Cosa è pronto», header, top line and action bar density at
1440 and 390 (IT/EN), and the findability of the wave's entry points (Regions in DM tools, Line
of sight in Measure, the Scene tab, the quick bar row, the Knowledge section, the token menu,
the Preparation sections with «Tutte le sezioni», Genera…, the Archive's «Elenco | Grafo», the
sheet's Custom actions). `w2b2-cross-journey.js` covers the two cross-area fixes: a passage to
an archived scene (B47 × B41) and the Preparation «Tutte le sezioni» by keyboard. In the
Preparation strip the quick-jump lists the sections as `[data-prep-section-jump]`, so a
`[data-prep-section]` locator still matches only the strip. `handouts-journey.js` picks the
courtyard's own row (B41 seeds «La cripta sotto il cortile», which also contains «cortile»).
Report: `changes/interview-01/blueprint-w2b2-integration.md`.

W2b1 integration (24–25/09/2026, sessions `d20-w2b1-integ` and `d20-w2b1-i3`, cwd
`2026-09-25/W2b1-integ/` then `2026-09-26/W2b1-integ/`): `w2b1-shell-journey.js` checks the
clean load, the pages and tabs of B33, B34, B36, B37, B38 and B40 for both roles, «Cosa è
pronto», header, top line and action bar density at 1440 and 390 (IT/EN, the dock one row in
combat) and the wave's entry points («Mosse» at the end of the combat action bar, pinned at the
strip's end on a phone). Scripts that followed the wave: «Tira i dadi» opens the Dadi tab (B34)
in `core`, `chat`, `chat-review-fixes`, `dice-3d`, `b61-table-structure` and
`b61-review-fixes` (the old one-die dialog stays their fallback); a tray roll is withdrawn with
«Ritira», not the gameplay Undo (`chat`, `chat-review-fixes`); B36's inventory rows are
`[data-invp-row]`/`.invp-row` and read «×4 · 0,25 kg» (`loot`, `loot-review`,
`chat-review-fixes`, `preferences`); B36 seeds Livia's purse, rations and engraved ring
(`loot`, `loot-review`, `loot-review2`); B40's fountain and B41's hidden plate lie on the
courtyard's straight line (`gestures-and-views`, `annotations`, `multi-self`, whose Dash target
is the whole screen pixel that maps back to 12 m). Report:
`changes/interview-01/blueprint-w2b1-integration.md`.

B62 information architecture (25–26/09/2026, sessions `d20-ia` for measurements and probes
and `d20-ia-sweep` for journeys, cwd `2026-09-26/IA/`): `b62-ia-journey.js` checks where
commands live once all 48 areas exist — the Table sidebar's nine DM / seven player tabs in
Foundry order inside a 1366 × 768 rail, sub-tabs with keyboard and memory, «Tutti i pannelli»
grouped with the per-identity «Nella barra» switch, the token menu's labelled submenus
(Foundry Token HUD, D&D Beyond token menu), one BG3 hotbar with its «Azioni | Barra rapida»
pages, one «Cerca» (SRD 5.2.1 Search) for hidden creatures, traps and search points, the
campaign rail's Kanka-style groups (remembered, the open section's group always open), the
Preparation groups, the sheet's D&D Beyond categories with sub-sections, no first-visit tip
by default, and the EN phone at 390 (map ≥ 60 % in view, pinned Chat sub-tabs, long-press
menu). `scripts/measure.js` in the evidence folder measures before/after at 1440 × 900,
1366 × 768 and 390 × 844. Scripts that follow the new placement (assertions kept) carry
small helpers at their top: `openTablePanel` (sidebar tab, then sub-tab), `toggleLog`
(Chat › Registro), `menuPick`/`menuItemById`/`revealMenuItem` (a token-menu command through
its submenu), `openCampaignSection` (unfold the group first), `openPrepSection` (group or
«Tutte»), `openSheetTab` (category, then sub-section) and `showQuickbar` (the hotbar's
second page). Report: `changes/interview-01/blueprint-ia-consolidation-evidence.md`.

B62 review and fixes (26/09/2026, session `d20-ia-rf`, cwd `2026-09-26/IA-rf/`):
`b62-review-fixes-journey.js` checks the review's fixes with the strict findability rule (a
control counts only if no strip, bar, menu or rail must scroll to show it and nothing covers
it; clicks on the control's centre): in combat at 1366 × 768 and 1440 × 900, player and DM,
every hotbar control is reachable and B40's «Mosse» stands in the pinned `.combat-dock` column,
the page does not scroll; on a 390 phone (touch, IT and EN) the long-press token menu shows all
its rows with no fold (DM on the Sentinel, player on Livia); the phone DM tools column starts at
the toolbar's top, none under the pinned hotbar; the keyboard focus stays on the chosen sheet
category, sub-section and «Tutte» jump, and on the Preparation group, section and «Tutte» jump;
the DM rail at 1366 × 768 in Foundry's order (Items before Journal). 5 groups. The per-entry
audit of all 48 areas (12 configurations) is `scripts/audit.js` in the evidence folder. Scripts
that follow the fixes: `b62-ia-journey.js` (rail order) and `w2b1-shell-journey.js` («Mosse»
read from `.combat-dock`). Report: `changes/interview-01/blueprint-ia-consolidation-evidence.md`,
«Revisione e correzioni».

IA regression after W2b1 and B62 (26/09/2026, session `d20-ia-regress`, cwd
`2026-09-26/IA-regress/`): all 133 scripts in `scripts/order.txt` (this README's order, 18
before 17, `measure` after `gestures-and-views`) as redirected copies, each bounded by a 240 s
alarm. Scripts that follow the seed data of W2b1/W2b2 (assertions kept): `homebrew-editor` drops
the Sentinella at (420, 300), off B41's hidden pressure plate (400–450 × 350–410), whose pending
event held its turn; `quests` expects the reward on top of Livia's seeded purse (30 + 50 gp);
`travel` counts all Livia's Rations rows (B36 seeds 4 more: 6 → 5, «5 giorni di cibo»); `party`
reads Iria's seeded 150 gp on the Bastion, then empties the purse with B26's «Correggi monete»
before the order refused at 0 gp; `integrations` rolls in the Dadi tray (B34, the one-die
dialog stays the fallback) and reopens the Creature tab before the inspector line (B61 remembers
the Dadi tab). Report: `changes/interview-01/blueprint-ia-regression.md`.

Audit journeys (round 1 P1–P10, 26/09/2026, and round 2 R1–R8 with the hand-offs, 27–29/09/2026).
Each package kept its evidence in `2026-09-26/fix-P<N>/` or `2026-09-27/fix2-R<N>/` (the hand-offs
in `2026-09-27/handoffs/`); the package reports are `changes/interview-01/audit/fix-P<N>.md`,
`fix2-R<N>.md` and `handoffs.md`. Run them after the journeys above, in this order (none needs
another's fixture: each resets this browser's demo state or opens its own context, except
`p1-foundry-import` and `p3-axe-hp`, which use the sample as the previous journey left it):

- P1 first use and characters: `p1-first-use` (tips off by default, «Prova senza account», folded
  «Primi passi», install card), `p1-resume-touch`, `p1-builder-phone`, `p1-leveling`,
  `p1-foundry-import` (reads `foundry-kael-synthetic*.json` from `fix-P1/`), `p1-dm-map`,
  `p1-cross-tab` (two tabs on one entry).
- P3 HP, privacy and the one roll engine: `p3-hp`, `p3-axe-hp` (axe-core from a local install),
  `p3-privacy`, `p3-roll-engine`.
- P4 campaign, inventory, preparation, rests, shared edits, shop: `p4-campaign`, `p4-inventory`,
  `p4-prep`, `p4-rest`, `p4-shared`, `p4-shop`.
- P5 combat and action bar: `p5-fix-journey`, `p5-fix-journey-2`.
- P6 the Table map: `p6-dm-table`, `p6-map-movement`, `p6-phone-map` (touch through CDP),
  `p6-table-extras`, `p6-table-more`.
- P8 `p8-library`; P9 `p9-journal`, `p9-palette`, `p9-services`, `p9-sessions`; P10
  `p10-governance`.
- R1 `r1-attack`, `r1-connected`, `r1-menu`, `r1-privacy`, `r1-rules`; R2 `r2-connected-dice`,
  `r2-disclosure`; R3 `r3-groups`, `r3-mount`, `r3-phone`, `r3-transform`, `r3-walls`; R5
  `r5-encounters`, `r5-initiative`; R6 `r6-builder-variant`, `r6-compat-packs` (reads
  `r6-compat-pack-sample.json` from `fix2-R6/`); R7 `r7-governance`; R8 `r8-copy`, `r8-filter`,
  `r8-local-model`, `r8-modules`, `r8-palette`; then `handoffs-journey.js`.

P2 and P7 kept their journeys in their evidence folders (`fix-P2/journeys/`, `fix-P7/journeys/`),
not here.

**Starting combat since R5 (PR-32).** The scene editor's «Incontro preparato» list
(`[data-prep-include]`, `[data-prep-initiative]`, «Ordina per iniziativa») is gone when the
encounter builder runs. A journey starts combat from the Table's «Avvia combattimento» (or the
scene editor's «Avvia incontro salvato…»), which opens the start dialog (Foundry roll call):
`[data-ct-start-dialog]`, one `[data-ct-start-include="<id>"]` box and one
`[data-ct-start-natural="<id>"]` d20 per row, then «Inizia combattimento». The Initiative bonus
comes from the sheet. `playwright-cli run-code` evaluates the file in a sandbox with no `require`
and no `import()` (probe of 29/09/2026: «A dynamic import callback was not specified»), so the
journeys cannot share a helper file: the 24 journeys the hand-offs migrated carry the same inline
block (only `naturals` differs; R3's and R5's own journeys have their equivalent steps):

```js
const naturals = { livia: 18, "goblin-1": 12 }; // who fights, and each typed d20
const startIds = await page
  .locator("[data-ct-start-include]")
  .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
for (const id of startIds) {
  const box = page.locator('[data-ct-start-include="' + id + '"]');
  if ((await box.isChecked()) !== Object.hasOwn(naturals, id)) await box.click();
}
for (const [id, natural] of Object.entries(naturals)) {
  const d20 = page.locator('[data-ct-start-natural="' + id + '"]');
  await d20.fill(String(natural));
  await d20.dispatchEvent("change");
}
```

Since the hand-offs (TV-52) creatures that share one Initiative roll are one row («Goblin
guerriero A, B») with `data-ct-start-group="<id> <id>"` and one d20, keyed by the first member:
count members, not rows (`r5-encounters`).

**Service worker.** Since P1 IN-11 the app registers a pass-through service worker (`sw.js`). A
request the service worker answers never reaches `page.route`/`context.route`, so a journey that
serves a throwaway area through `page.route` or guards outside requests with `context.route`
opens its context with `serviceWorkers: "block"` (`registry-smoke`, `b11b-inc10-fixes`,
`integrations`, `r8-local-model`); the Library journeys unregister it and answer `sw.js` with 404.

Round-2 regression (29/09/2026, sessions `d20-r2-regress` for the full runs and `d20-r2-probe` for
single reruns and probes, cwd `2026-09-27/r2-regress/`): all 186 scripts in `scripts/order.txt`
(this README's order, 18 before 17, `measure` after `gestures-and-views`, then the audit journeys
above) as redirected copies, each bounded by a 240 s alarm. Before each journey the runner accepts a
modal the previous one left open (a dirty editor's leave-page prompt); an empty answer, a CLI
refusal («does not handle the modal state») and a returned `{"result": "FAIL"}` count as failures
(the verdict used until then read the last one as a pass). Scripts that follow the intended changes
(assertions kept, each change commented in the file): `library-mobile` (P8 BI-15: «Crea contenuto»
opens the structured editor's create dialog, then the Library's own editor is served as in
`library-journey`), `chat-review-fixes` (P3 TV-87: a tray withdrawal reads «Ritirato: <motivo>» on
its card and no separate «Tiro ritirato» line remains), `conditions-badges` (P6 TV-06: on the phone
the whole scene opens with one-cell tokens; badges stay on the rim there and meet the old size
thresholds once «+» makes a cell 44 px), `integrations` (the example's «Il sigillo della torre» is
cancelled first, as in `sessions-plus`), `assistant` (the default review period is
`sampleDay("2026-09-17")`), `builder-plus` (P1: Kessa and a level-1 Wood Elf have no aspects to
verify left, so nothing asks to confirm; the confirmation gate is checked on Oren), `spells-plus`
(SV-37: a disabled toggle's reason is the visible sentence named by `aria-describedby`),
`r5-encounters` (TV-52: creatures sharing an Initiative roll are one start-dialog row,
`data-ct-start-group`; creatures are counted, not rows), `dice-tray-review` (PG-23: saves roll from
the sheet's own save list; the Cloak of Protection's +1; the sheet's roll window opens on the
remembered «Fisici», an app fix), `p1-dm-map` (starts from the sample, saves its new scene and
checks «Attiva al Tavolo…», so no dirty draft blocks the next journey), `b11b-inc10-fixes`,
`integrations` and `r8-local-model` (`serviceWorkers: "block"`, see above), `inventory-plus` (dead
loop on the removed include boxes), `r1-privacy` (the page's random source gives step 1's Fire Bolt
a hit of 15 and 1 damage, so the Sentinella lives for step 2's request; a digital 7+ killed it),
`p3-hp` (a digital death save of 20 regains 1 HP and leaves no death-save count: that branch now
checks «Recupera 1 PF» instead of reading a missing count). App fixes found by the journeys, test
first: the sheet's roll window opens on the remembered «Fisici» (`dice-tray-review`), and a Heroic
Inspiration reroll that lands on the same face is still logged (`r1-attack`). Node suite 2543/2543;
journeys: first run 178/186, then 184/186 and 185/186 (reds that a rare die face exposed:
`r1-attack`, an app fix, `r1-privacy` and `p3-hp`), final run 186/186 (1487 `passed`). Report:
`changes/interview-01/blueprint-round2-regression.md`.

Residuals of re-audit 3 (29/09/2026, single writer; evidence
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-29/residual/`):
`residuals-a-journey.js` (IT 1440: PG-53 2014-only spell list, X-A1 missing steps in «Applica a
una scheda…», BI-24 forged Longsword +1 at +3, X-A3 class variant saved at the first «Salva», CA-57
hand-off member «Livia, Mira · Giocatore») and `residuals-b-journey.js` (TV-52 «Un solo tiro per il
gruppo» switch, TV-59 group turn turned on mid-turn, BI-45 pack creature in the bestiary, Library
search and builder subclass, phone 390 EN touch start dialog). Report:
`changes/interview-01/audit/residuals.md`.

Visual regressions (30/09/2026, sessions `d20-visual-regress` and `d20-visual2-regress` for the
full runs, `d20-visual-probe` and `d20-visual2-probe` for reruns and probes; cwd
`2026-09-29/visual/regress/` and `2026-09-30/visual2/regress/`): all 188 scripts in
`scripts/order.txt` (this README's order, 18 before 17, `measure` after `gestures-and-views`, then
the audit journeys and `residuals-a`/`residuals-b`), one per command under a 200 s alarm; final
runs 188/188 (1519 `passed`) both times. App fixes found by the journeys, test first: a d20 the DM
types or rerolls in the start dialog is the one combat uses (`combat-tracker-domain.mergeSavedRolls`
takes the latest ledger roll; `encounter-lifecycle`); a door exactly at reach is in reach
despite pointer rounding (`REACH_TOLERANCE_METERS`, 1 cm; `spatial`, then `spatial-mobile` and
`approach`, which start from the state `spatial` leaves); on the phone, pinch and two-finger pan
read the map SVG's content box (`token-menu.mjs mapViewport`), because the phone Table pads the map
by 120 px at the bottom (`token-menu`). Scripts that follow the intended visual changes, each with
a dated comment: `spells-plus-review` (the preparation window's translucent tint: the contrast
check blends each translucent background over the ones beneath), `p1-cross-tab` (when the other
tab's save disables «Salva» between the check and the click, the click gives up after 2 s),
`residuals-b` (a goblin's hit on Livia leaves her Shield offer pending; the DM declines it, which
spends nothing), `conditions-death` and `sheet-plus` (HP and movement on the
hotbar), `registry-smoke` (the next session right after «Continua a giocare»), `chat` (the 340 px
sidebar), `p6-phone-map` (press «Mappa» before dragging on the phone), `r1-privacy` («Tiri e
risultati» beside the hotbar: the journey closes the token menu first). Reports:
`changes/interview-01/blueprint-visual-regression.md`, `blueprint-visual2-regression.md`.

Final review fixes (30/09/2026, single writer; evidence
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-10-01/fix/`):
`final-fixes-journey.js` (IT 1440: Surprise rolls two d20 and keeps the lower for Livia and Mira;
the «Sessione» menu above the turn order; the player's hotbar follows the turn to Mira; a new page
from the top and Back to the remembered position; HP arithmetic `=15`, `-2`, `+1`, `2+3` on the
sheet; Shift+F10 context menu on a spell row; Esc on «Ripristina predefiniti» back to Preferences;
prone Livia's target chip «Svantaggio: Prono»; a compendium creature dragged onto the map; the dice
tray popped out into its own window). Journeys updated to intended changes, each with a dated
«Final review» comment: `campaign-members`, `campaign-members-review` (a removed player no longer
reads Doran), `dice-tray-review`, `p3-roll-engine`, `sheet-plus`, `offline` (the tray's order, a
click on a number rolls), `inventory-plus`, `p4-inventory` (view options folded under
«Visualizzazione»), `chat` (small caps), `damage-tray` (compact HP box), `core` (the potion's dice
radios), `b61-review-fixes` (the sub-tab strip scrolls; eight player tabs), `b62-ia` (eight tabs with
«Consultazione», group «Documents»), `party` («Entra al Tavolo» in the campaign sidebar),
`preferences` («Annulla» on the reset confirmation reopens Preferences), `p3-hp` (the HP number opens
the HP management, «Correggi» is one of its sections), `notifications` (a level-up no longer asks
to confirm the sheet), `encounter-builder` (bands explained in words, no CMP-106 code). Run
`builder-advance` after `builder`. 70/70 touched-area journeys green on the last run. Report:
`changes/interview-01/final-fixes.md`.

Notes from the final fixes: `campaign-members` and `chat-review-fixes` read sample files from
their evidence folder (`not-an-image.txt`, `glass-ruins-cover.png`, `big-680kb.png`,
`noise0-3.png`); copy them there before running on another machine. `measure` read its label
right after the pointer moved and was red once in a long run, green alone and right after
`p4-prep`: a timing flake, not a behaviour change. The full order is now 189 scripts: add
`final-fixes-journey.js` after `residuals-b-journey.js`. A full run of all 189 after the final
fixes has not been done yet; the last full run (188/188) predates them.

Full run after the final fixes (single runner, one journey per command under a 200 s alarm;
evidence `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-10-01/regress/`,
`results-sweep1.txt`): 184/189 (1497 `passed`); red `rest-time`, `b61-table-structure`,
`spells-plus`, `spells-plus-review`, `w2a1-shell`.

Close review fixes (01/10/2026, single writer; evidence
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-10-01/close-fix/`): no new
journey script; the capabilities built that day are probed by `close-fix/scripts/cap-*.body.js`
outside the checkout. Journeys updated to intended changes, each with a dated «Close review»
comment: `fog-vision` and `fog-vision-review` (a creature under the fog is no longer drawn at all:
its elevation badge and distance row count 0, or are hidden in older builds). Six reds on the
first run, none fixed by editing a journey: four needed the sample files copied into the new
evidence folder (see the notes of the final fixes); in the app, the session chip's button became
«Avvia ora», so «Avvia sessione» names only the «Sessione» panel's button, and a double press now
needs the same identity and at most one map redraw between the presses, so `knowledge-journey`'s
two separate clicks on a token stay single clicks.
40/40 touched-area journeys green (`close-fix/logs/journeys.log`, with `builder-journey` before
`builder-advance-journey`). Rerun of the five reds of the full run after the close fixes
(`2026-10-01/feature-map/logs/journeys.log`, session `d20-featmap-j`): `b61-table-structure` and
`rest-time` green; `spells-plus` («closed message missing»), `spells-plus-review` («the player
is not told who can grant an exception») and `w2a1-shell` (at 1440 a campaign section is not in
the rail and `[data-campaign-sections]` is not visible there) still red, not yet diagnosed. A full
run of all 189 after the close fixes has not been done yet.

Close regression on the functional candidate (01/10/2026, single runner; session
`d20-close-regress` for the full runs, `d20-close-probe` for probes and for reruns against a staged
copy of the app with the fixes on port 8880 while the first run kept the candidate untouched;
evidence `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-10-01/close-regress/`):
Node suite 2659/2659 at the start and 2662/2662 at the end (three «close regression» tests in
`tests/close-fixes.test.mjs`); all 189 scripts of `scripts/order.txt`, one per command under a
200 s alarm: first run 183/189, final run 189/189 (1529 `passed`, no journey with fewer steps than
the full run after the final fixes). App fixes, test first: a press that became a drag no longer
starts the double press that opens the sheet (TV-14 of the close review; `gestures-and-views` and
`p6-map-movement` dragged the same token twice in a row and got the sheet instead of the move);
at 1440 × 900 «Tutte le sezioni» now leads the desktop campaign rail and a group unfolded near the
window's bottom scrolls its sections into view (`w2a1-shell`: with «Entra al Tavolo» above the rail
and two groups open, «Ambientazione» sat at y 909 and «Tutte le sezioni» existed only on the
phone). Journeys updated to intended changes or races, assertions kept, each with a dated «Close
regression» comment: `spells-plus` and `spells-plus-review` (a closed preparation window keeps its
rule behind «Perché?», UX F10 of the final review: open it, then read), `media-review2` («Apri» on a
use opens the material's viewer; wait for it and close it before leaving, instead of racing it on a
busy machine). Fresh load with cleared storage at 1440 and 390, player and DM: 0 page errors, 0
console errors, 0 warnings, no horizontal overflow. Report: `changes/interview-01/final-regression.md`.
