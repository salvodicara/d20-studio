# Fix P7 — Preparation: one scene editor and list, walls and doors, lighting, fog, regions and traps

Date: 25/09/2026. Fixer session for package P7 of `triage.md`. Branch `codex/interview-01`, working
tree `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01` (uncommitted, nothing committed).
Evidence: `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P7/`
(screenshots `a*`–`l*` desktop 1440×900, `m*` phone 390×844 touch, `j*` English; journeys in
`journeys/`, regression copies of the area journeys in `regress/`).

## Summary

22 of 23 rows fixed, 1 partly fixed (PR-22: the terrain/proximity wall kind needs the vision
engine in `spatial.mjs`, P6). The separate «Scene avanzate» section is gone: its list, folders,
archive, objects, prefabs, off-map area, levels, variants, grid alignment and Universal VTT live in
the one scene list, the one scene editor and «Nuova scena».
New tests: `tests/p7-scenes.test.mjs` (18 tests: typed-name normalisation, scene-only Undo, one list, one editor, palette synonyms, negative level height ordering and «▼ Piano sotto», prefab lock preserved, bestiary off-map, oversize message, wall chain, wall kinds, door locks, map-wide conditions, Luci tab, narrative time, drop on the map, the one outliner). Owned tests updated: `tests/scene-assets.test.mjs`
(no preparation section), `tests/fog-vision.test.mjs` (the tool options are their own layer).

## Rows

| ID    | Result       | What changed (pattern copied) |
| ----- | ------------ | ----------------------------- |
| PR-03 | Fixed        | «Allinea la griglia alla mappa…» sits inside «Griglia e misure» of the scene editor (Owlbear: alignment next to the grid settings). It opens the three-step alignment on the scene being edited (also an image not saved yet); «Avanti» appears beside the chosen point on the map (checked: 36 px from the click); «Usa questa griglia» writes the draft, like «Calibra scala», and «Salva preparazione» keeps it. Root fix for PR-03/06/08/09/10/11/13/15: `scene-assets-prep.mjs` exports the list (`renderSceneBrowser`) and the editor tabs (`renderSceneTools`); `preparation.mjs` uses them; `scene-assets.mjs` no longer registers the preparation section. The old route `tab=scene-assets` opens the editor's Oggetti tab. |
| PR-05 | Fixed        | The typed name is compared normalised (`normalizeTypedName`/`sameTypedName`: typographic quotes and dashes, spaces, letter case — Foundry's typed title). «Elimina scena» stays disabled until the name matches and the line under the field says why. Deleting «Il cortile dell’osservatorio — copia» by typing `Il cortile dell'osservatorio - copia` works. The list shows «Annulla: Scena eliminata» only for a scene change (never «Riposo aggiornato»); Ctrl/Cmd+Z in the list and in the Oggetti/Livelli/Varianti tabs takes it back (command `scene-assets.undo`, context `preparation`; text fields keep their own undo). «Altre azioni» closes on an outside click, on Escape and when another menu opens. |
| PR-06 | Fixed        | One scene list (Roll20 Page Menu): breadcrumb, search in every folder, «Nuova cartella…», «Archivio (n)», drag a scene onto a folder, and each row's «Altre azioni» with Rivela, Attiva, Sposta in una cartella, Duplica con oggetti e varianti, Archivia, Elimina. Folders are titled groups with their scenes, so every scene stays in sight (Foundry's scene directory); a folder title opens it alone. The «Scene» tab count is the number of scenes (5 = 5 rows); the misleading section count on the other groups is gone. |
| PR-07 | Fixed        | «Nuova scena» offers every starting point: Griglia vuota (the old «Vuota / senza mappa» label is fixed), Dalla mia immagine, Cortile, Accampamento, «Teatro della mente (senza mappa)» (the handouts' map-less scene, name carried over), «Importa Universal VTT (.dd2vtt, .uvtt)». Palette: «Nuova scena di teatro della mente (senza mappa)…» with teatro, senza mappa, narrativa (D&D Beyond Theater of the Mind as a scene type). At the Table a map-less scene shows no «Scala … / casella» and its title moves clear of the map tools (CSS in `scene-assets.css`). The list marks it «Teatro della mente». |
| PR-08 | Fixed        | «Varianti» is a tab of the scene editor (Quest Portal variant selector in the editor). |
| PR-09 | Fixed        | Levels are the editor's «Livelli» tab. A basement at −3 m is listed under the ground floor («Cripta · -3 m») and at the Table «▲ Piano sopra» is disabled while «▼ Piano sotto» reaches the crypt (checked in the browser and in a test). The domain already accepted negative heights; the audit's «3 m» came from the entry path, now the editor. |
| PR-10 | Fixed        | «Oggetti» tab of the editor: sticker browser, library images, roofs, lock and visibility (DDB Sticker Browser inside the map editor). |
| PR-11 | Fixed        | `buildPrefab` keeps each object's lock; an inserted prefab keeps it (Owlbear Prefabs). Prefabs are in the Oggetti tab; editing a prefab returns to its scene. |
| PR-12 | Fixed        | «Elenco della scena» in the Oggetti tab lists objects, tokens, walls, doors and lights with kind chips and a search (Owlbear Outliner, Foundry Placeables Palette). Bulk actions fit the chosen kinds: hide/show (objects, tokens; walls and doors become secret), lock/unlock, light/put out, doors closed/open/locked, delete (`bulkEditElements`). Walls and doors change there only when the Modifica tab has no unsaved draft (it says so). |
| PR-13 | Fixed        | Off-map staging is in the Oggetti tab; «Metti una creatura fuori mappa (anche dal bestiario)…» has a «Dal bestiario (SRD 5.2.1)» group: the SRD block becomes an NPC waiting off the map, invisible to players (Roll20 GM off-page area). |
| PR-15 | Fixed        | «Nuova scena › Importa Universal VTT» opens the import; after it the editor opens on Modifica and its imported lights are in the «Luci» tab (3 of 3 editable). Palette synonyms dd2vtt, uvtt, df2vtt, Dungeondraft (Roll20/Foundry import from New Scene). |
| PR-16 | Fixed        | A map over the limit says «Il file «…» pesa 4,1 MB: il limite per una mappa è 1 MB» and offers «Riduci e converti in WebP» (canvas re-encoding, scaled until it fits: 844 KB, 1200 × 1200 px in the check) — Owlbear's size warning. Also in «Nuova scena › Dalla mia immagine». |
| PR-20 | Fixed        | A door's properties have «Serratura»: DC, check (Scasso o Forza, Scasso, Forza), the key item and the attempt cost (azione, azione bonus, nessuna) — BG3/DOS2 locks. At the Table a locked door within reach shows «CD 14 · chiave: … · costa un’azione» in the Creature panel with «Scassina (CD 14)», «Sfonda (Forza, CD 14)» and, with the key in the inventory, «Apri con «…»» (no roll). Rolls use the regions check engine and the Log; success leaves the door closed but unlocked; physical faces can be corrected. |
| PR-21 | Fixed        | Wall chains (Foundry): with Muro each click continues from the last point; a double-click, Escape or a click on the same point ends it; a dragged piece stands alone; Ctrl/Cmd+click chains walls and doors. The tool stays selected; the hint says how to finish. |
| PR-22 | Partly fixed | The wall kind is chosen where walls are drawn: «Tipo di muro» next to Muro (Muro, Finestra, Unidirezionale, Illusoria, Invisibile, with the one-line description) and «Tipo di barriera» in each wall's properties, «Su misura» keeps the boxes; one-way walls choose their side (Foundry wall restrictions in the wall panel). Not fixed: the terrain/proximity kind — the vision engine (`spatial.mjs`, P6) has no rule for it; a label without behaviour would be a fake control. |
| PR-23 | Fixed        | The editor's «Luci» tab places and edits lights while preparing (Foundry Lighting Layer): type, bright/dim, direction, colour, on/off, delete, drag to move, «Posa al centro»; a scene not at the Table keeps them to the DM («Le luci restano tue finché non attivi la scena»). Checked: a lantern prepared on «La radura dei goblin» glows at the Table after activation. Phone 390: the fog tools are named (Nebbia, Luci, Barriere), the options bar wraps inside the screen (280 px, 0 controls off screen, «Spegni» visible). Desktop and phone: «▾ Riduci», a tab above the options, folds them away so they never hide tokens (Owlbear's collapsible tool bar). |
| PR-25 | Fixed        | «Segue il tempo narrativo» in Scena › Visione (Foundry darkness linked to world time): the time of day comes from the campaign clock (05–07 alba, 07–18 giorno, 18–20 crepuscolo, else notte); checked: 08:00 + 12 h → notte by itself. A manual choice takes the scene off the clock. «Colore della notte» (5 presets) and «Intensità del buio» (50–150 %) change the veil (FG lighting presets); the SRD light levels still follow the time of day. |
| PR-29 | Fixed        | A found trap is a button on the map: it opens a menu at the point clicked with «Esamina» and «Disinnesca…» (Foundry/Roll20 click-to-interact); the token does not move (desktop and phone). «Disinnesca» picks the player's creature in reach and opens the roll; with a scene event open it says «La trappola è scattata e il DM sta decidendo…» instead of closing silently (also in the Creature panel). No edit to `table.mjs` was needed: the mark stops its own press, so the Table never starts a move; the DM's region tool keeps its clicks. |
| PR-31 | Fixed        | «Condizioni della scena…» (palette: ambientale, tempesta, bufera, clima, ogni turno…; buttons in Regioni e trappole and the DM's region tool): Bufera (1d4 freddo), Fumi tossici (TS Cos CD 12, 1d6 veleno) or Su misura, as a hazard covering the map with the «Inizio del turno dentro l’area» trigger (FG global effects). Presets are marked as authored examples, not SRD. |
| PR-41 | Fixed        | Palette «Crea PNG…» (PNG, png, nuovo PNG, crea png, NPC…) opens the NPC creator in the scene being edited or the scene at the Table (Foundry/Roll20 actors directory reached by name). |
| BI-33 | Fixed        | A token image dropped on the empty map becomes a neutral NPC token with that image at the drop point; a prop image becomes a scene object there (Owlbear import wheel). DM only; one change each (Undo takes it back). |
| TV-29 | Fixed        | Checked with nobody in the party having darkvision in the dark tower: the option drew discs without initials or names, because the Table hides area labels at points the viewer cannot see. The copies of the viewer's own tokens now keep initial and name visible (Roll20: own tokens always visible); turning the option off removes them. |
| TV-30 | Fixed        | The fog polygon closes on a double-click (event time, not redraw time) and leaves no dashed outline or «Punti: 3»; «Chiudi poligono» likewise. The tool options are their own map layer drawn last, so the door buttons stay under them, and the empty part of the HUD box never takes the pointer. «▾ Riduci» folds the fog panel. Area labels in the fog are already hidden by the Table (P6). |

## Shared edits

None. `table.mjs` (PR-29) was not edited: the trap mark handles its own press.

Also found and fixed while checking: after a click on the editor map the redraw dropped the
keyboard focus, so Escape did not cancel a started wall; the map now keeps the focus while a
gesture is open. The tool tabs (Oggetti, Livelli, Varianti, Luci) show «Annulla: …» for their
own changes. «▾ Riduci» is a tab above the fog/light options, so the options keep their size.

## Checks

- `node --test design/blueprint/tests/*.test.mjs` (final run): 2305 tests, 2301 pass, 4 fail.
  - **For the coordinator** (caused by the P7 root fix, cross-cutting tests not edited):
    `ia-consolidation.test.mjs:210` (expects a `scene-assets` preparation section in group
    `scenes`), `ia-consolidation.test.mjs:588` (expects `["scenes", "scene-assets", "regions",
    "special-moves"]`), `w2b2-integration.test.mjs:62` (expects `data-prep-section="scene-assets"`
    in the strip). The acceptance requires that «Scene avanzate» no longer exists as a separate
    place; the expected lists lose `scene-assets`.
  - Not P7: `ia-consolidation.test.mjs:625` (P2's PG-43, already reported in fix-P2.md).
- P7 journeys (session `d20-fix-p7`, each in its own browser context, `journeys/run-all.sh`):
  `p7-list`, `p7-delete-basement`, `p7-lights-newscene`, `p7-trap-menu` (desktop and phone),
  `p7-phone-lights`, `p7-phone-prep`, `p7-own-tokens-dark`, `p7-fog-polygon`, `p7-walls-doors`,
  `p7-mapless-table` (desktop and phone), `p7-editor-tools`, `p7-english`, `p7-time-of-day`,
  `p7-misc`: all ran to the end with the results quoted in the rows above; no page errors.
  Phone 390×844: list, «Nuova scena» and editor without horizontal overflow; editor tabs 49 px.
- Area journeys (copies in `regress/` with outputs redirected, one command each, `regress/run.sh`):
  - Pass: `preparation-journey`, `back-guard-journey`, `spatial-journey`, `media-journey`,
    `fog-vision-review-journey`, `p4-prep-journey`, `generators-journey`.
  - `fog-vision-journey`: 10 steps pass; it stops on the phone step because the fog group button
    is inside the Table's collapsed tool strip (P6's compact toolbar), not a P7 change.
  - `regions-journey`: the DM steps pass; it stops at «Livia steps on the plate» because it moves
    her with a click on the map, which P6's TV-01 turned off (a click never moves).
  - `spatial-mobile-journey`: stops at «Plan path» (a P6 Table control), after the door step.
  - `handouts-journey`: 11 steps pass; it then asserts the Table caption still shows «Scala: 1,5 m
    / casella» on a map-less scene, the opposite of PR-07. The owner of the journey should drop
    that assertion (the stage panel keeps the ruler note).
  - `scene-assets-journey`, `scene-assets-review-journey`: they click the removed «Scene
    avanzate» section and its `data-sa-tab` tabs. Copies with the new selectors
    (`regress/*-p7.copy.js`: `data-prep-view`, `data-prep-align`, `data-prep-group="scenes"`) pass
    the review journey's F1–F5 (undo keeps the saved view, right-click prefab menu, keyboard
    prefab and stair placement, floor steps, the player's stairs) until its last step, which opens
    the removed «Crea» menu; the main journey stops at its assertion that the section exists.
    These journeys need their navigation updated to the one list and editor.
