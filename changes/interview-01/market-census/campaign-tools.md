# Market census — campaign management, worldbuilding and DM utilities

Access date: **2026-09-23**. Cluster: World Anvil, Kanka, LegendKeeper, Scabard,
Obsidian (core + TTRPG plugins), Notion templates, Campfire, Chartopia, donjon,
5e.tools, Tetra-cube, Watabou, Azgaar, Fantasy Calendar, Kobold+ Fight Club,
AideDD, Improved Initiative, Shieldmaiden, DiceCloud, Game Master 5e / Fight
Club 5e, Encounter+, Demiplane, Arkenforge, Dungeon Scrawl, Dungeondraft,
Inkarnate, Dungeon Alchemist, Lazy DM method. Read first and not redone:
[REFERENCE_COVERAGE](../../../docs/interview/REFERENCE_COVERAGE.md), the three
[reference audits](../../../docs/interview/reference-audits/),
[COVERAGE](../../../docs/interview/COVERAGE.md) and
[blueprint-campaign-research](../blueprint-campaign-research.md) (S1–S13 already
cover Kanka permissions/journals, LegendKeeper features, World Anvil reports,
Roll20, Obsidian Portal, WhenIsGood). Rows reusing those sources say so.

## Scope, method and access limits

- **Capability census, not runtime testing.** No logins, purchases, installs or
  private data. "Observed" is used only for public source code read on GitHub
  (Improved Initiative `development` branch, last commit 2026-09-08; Kobold+
  Fight Club `master`, last commit 2025-04-10; Tetra-cube statblock HTML).
- **Blocked or degraded sources.** World Anvil `learn`/Codex pages and Scabard
  return HTTP 403 to fetch: their rows rely on the official page text shown in
  search results (labelled *search snippet*) plus World Anvil's public blog.
  5e.tools returns 403 and `wiki.5e.tools` no longer resolves: rows use the
  official changelog in the public GitHub mirror, which is **historical
  (2018–2020 entries)**; current 2024-rules behaviour of 5e.tools is unverified.
  The javalent Obsidian plugin docs are JS-rendered: GitHub READMEs are used.
  Some Kanka doc URLs 404 on fetch; their content comes from search snippets.
- **Stale products are labelled.** Game Master 5e App Store version 3.9 is dated
  2020-09-24; Demiplane has **no D&D Nexus** (changelog to 2024-11 and the
  2026-01-23 campaigns post list other systems only) — used for patterns only.
- **Evidence kinds:** official docs; official docs (search snippet); release
  notes/changelog; product/store page; source code (observed); third-party
  article; community opinion (demand signal only). Inference is marked
  *(inference)*. Absence from this table does not prove absence in a product.
- **Coverage column:** `F-nnn` = family exists and the sub-capability is
  specified; `F-nnn PARTIAL` = family exists, this sub-capability or its UX is
  not yet defined; `NEW` = no family owns it. Boundaries already recorded in
  FEATURES are flagged as *conflict* instead of being reopened silently.
- No rules text reproduced. 2014 vs 2024 encounter math is identified by label
  only; any adoption must cite the official 2024 source per project rules.

## Census table

### Home

| ID | Product (layer) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMP-01 | Obsidian community vault (third-party template) | DM home dashboard of "what is ready" | Dataview "DM Screen" note lists NPCs by location and faction, recent sessions, ready encounters, party roster; opened as a normal note | https://vaultorial.com/dnd-campaign-vault/ (no version) | third-party product page (search snippet) | NAV-02/NAV-03, F-053 PARTIAL | Home |
| CMP-02 | Obsidian community vault (third-party) | Starter vault with sample 3-session mini-campaign | Downloadable vault pre-filled with sessions/NPCs/locations/encounters; user edits in place | https://vaultorial.com/dnd-campaign-vault/ | third-party product page (search snippet) | F-031 PARTIAL | Home |
| CMP-03 | LegendKeeper (core) | Project list filtering | Project filtering added to the projects home | https://www.legendkeeper.com/changelog/ (0.18.0.0, 2026-01-10) | release notes | NAV-01 PARTIAL | Home |
| CMP-04 | Dungeon Scrawl (core) | Start without account | Editor opens without signup or download; saving/sharing extras are Pro | https://www.dungeonscrawl.com/ (no version) | product page | F-031 PARTIAL | Home |
| CMP-05 | Kobold+ Fight Club (core) | In-app "what's new" feed | News slide-over panel component with a notification area *(behaviour inferred from component names NewsSlideover/NotificationArea)* | https://github.com/fantasycalendar/kobold-plus-fight-club (src/components, 2025-04-10) | source code (observed) | NEW | Home |
| CMP-06 | Notion Marketplace (third-party templates) | Prebuilt D&D DM dashboards | Duplicate a template into workspace; databases for characters, locations, items, sessions, initiative | https://www.notion.com/templates/dnd5e-campaign-database (no version) | store page | F-031/F-038 PARTIAL | Home |

### Characters

| ID | Product (layer) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMP-07 | DiceCloud (core) | Auditable real-time sheet | Equipment/feature changes recompute derived stats (HP, AC, saves) and the computation is inspectable | https://github.com/ThaumRystra/DiceCloud (develop) | official README | F-008/F-004 PARTIAL | Characters |
| CMP-08 | DiceCloud v2 (core) | Character as a tree of properties with slots | Each class level/background/feat is a folder; "slots" are holes filled from libraries on the character tab | https://www.patreon.com/posts/version-2-and-26326856 ; https://github.com/NappingPiglet/dicecloud-v2-guide | author post (snippet); community guide | F-008/F-009 PARTIAL | Characters |
| CMP-09 | DiceCloud (core) | Public REST API for sheets | Documented API consumed by third parties (Avrae, Character Sync) | https://dicecloud.com/docs | official docs (search snippet) | NEW (GAP-17) | Characters |
| CMP-10 | Fight Club 5e (core) | Offline character sheet with auto-calculation | Native app; enter choices, stats calculated; spellbook with prepared spells and slot tracking | https://apps.apple.com/us/app/fight-club-5th-edition/id901057473 | store page (search snippet) | F-008 PARTIAL | Characters |
| CMP-11 | Fight Club 5e (core) | Printable character PDF | Generate PDF from the sheet | same | store page (search snippet) | F-027 PARTIAL | Characters |
| CMP-12 | Fight Club 5e → Game Master 5e | Player sends character file to DM app | Export importable character file; DM imports into a campaign | https://apps.apple.com/us/app/game-master-5th-edition/id908176026 (v3.9, 2020-09-24) | store page | F-028/F-006 PARTIAL | Characters |
| CMP-13 | Demiplane (core, non-D&D systems) | Character sharing with permissions | Share toggle with permission levels on the character | https://www.demiplane.com/changelog (2023-05-23) | release notes | F-006/F-008 PARTIAL | Characters |
| CMP-14 | Demiplane (core) | QR-code character sharing | QR code generated for a character to share at the table | https://www.demiplane.com/changelog (2023-10-17) | release notes | NEW | Characters |
| CMP-15 | Demiplane (core) | PDF export of digital sheet | Export action on character tools | https://www.demiplane.com/changelog (2023-08-09) | release notes | F-027 PARTIAL | Characters |
| CMP-16 | Demiplane Campaigns (core) | GM views/edits permissioned players' sheets; import existing characters | Create group; GM views/edits sheets of permissioned players; import existing characters; GM chooses content sources available for creation | https://www.demiplane.com/blog/campaigns-have-arrived (2026-01-23) | release notes | F-006 PARTIAL (control ≠ note access, I-044) | Characters |
| CMP-17 | Shieldmaiden + Character Sync extension | One-click refresh of player stats from D&D Beyond/DiceCloud | Browser extension stores characters; link one to a Shieldmaiden player; players then updated with one click | https://shieldmaiden.app/tools/character-sync ; https://github.com/HarmlessKey/CharacterSync | product page (snippet); README title | F-028 PARTIAL (GAP-17) | Characters |
| CMP-18 | World Anvil Campaign Manager | GM edits a player's character sheet | "Edit Sheet" button on the player character in the campaign | https://www.worldanvil.com/learn/rpg/campaign-manager | official docs (search snippet) | F-006/F-008 PARTIAL | Characters |
| CMP-19 | Tetra-cube (core) | Random character generator | Single page generator for a full random character | https://tetra-cube.com/dnd/dnd-char-gen.html | product page | F-008 *conflict* (random full character not approved) | Characters |
| CMP-20 | Kanka (core) | Character entries with traits, goals, fears, motivations, secrets | Character entry form with narrative fields; secrets permissioned | https://docs.kanka.io/en/latest/overview.html (docs 1.0) | official docs | F-014 PARTIAL | Characters |

### Campaign

| ID | Product (layer) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMP-21 | Kanka (core) | Campaign dashboard widgets | "Dashboard setup" button → add widget block; types: entry list (filterable), entry preview, calendar (5 past/next events), text header, random entry, campaign header; drag to reorder (not on mobile) | https://docs.kanka.io/en/latest/guides/dashboard.html (docs 1.0) | official docs | NAV-03 PARTIAL | Campaign |
| CMP-22 | Kanka (premium) | Multiple dashboards per role | Dashboards permissioned by role; default chosen via Action → Player → Default | same | official docs | NEW | Campaign |
| CMP-23 | Kanka (core) | Typed world entries (characters, locations, families, organisations, items, quests, journals, events, calendars, timelines, abilities, maps, tags, notes, creatures, races) | Sidebar module list; each module has list + entry pages | https://kanka.io/features ; https://docs.kanka.io/en/latest/overview.html | product page; official docs | F-014 PARTIAL | Campaign |
| CMP-24 | Kanka (core) | Disable unused modules per campaign | Campaign settings: customise or disable unused categories | https://docs.kanka.io/en/latest/overview.html | official docs | NEW | Campaign |
| CMP-25 | Kanka (core) | @mentions linking entries in rich text | Type @ in editor → pick entry → link | same | official docs | F-014 PARTIAL | Campaign |
| CMP-26 | Kanka (core) | Posts: extra sections on an entry with own visibility; post templates | Add post on entry; set visibility; save a post as template to reuse on other entries | https://docs.kanka.io/en/latest/features/posts.html | official docs (search snippet; page 404 on fetch) | F-014/F-007 PARTIAL | Campaign |
| CMP-27 | Kanka (core) | Properties/abilities/inventory on any entry; Property Kits (renamed from Attribute Templates, early 2026) | Attributes tab on entry editor; pick a kit to pre-add fields on save | https://docs.kanka.io/en/latest/entries/attribute-templates.html ; https://kanka.io/features | official docs (search snippet); product page | F-014 PARTIAL | Campaign |
| CMP-28 | Kanka (core) | Attachments per entry with per-member visibility | Attach images/PDFs to an entry; each attachment has a visibility dropdown | https://docs.kanka.io/en/latest/overview.html ; https://docs.kanka.io/en/latest/features/permissions.html | official docs | F-065 PARTIAL | Campaign |
| CMP-29 | Kanka (core) | Relations between entries + visual web | Relations menu or entry → "+" to add; "View web" draws graph; click a line to edit relation; preview entry in place; bulk actions on list | https://docs.kanka.io/en/latest/features/relations.html | official docs | F-014 *conflict* (no visual graph approved), GAP-12 | Campaign |
| CMP-30 | Kanka (core) | Export relations web as PNG/PDF | Download button on web view | same | official docs | NEW | Campaign |
| CMP-31 | Kanka (premium) | Family trees | Visual family structure on Family entries | https://kanka.io/features | product page | NEW (GAP-12) | Campaign |
| CMP-32 | Kanka (core) | Quests with Elements subpage | Quest entry → Elements tab collects characters, locations, events, items, notes, journals | https://docs.kanka.io/en/latest/entities/quests.html | official docs (search snippet) | F-015 PARTIAL | Campaign |
| CMP-33 | Kanka (core) | Journals for session notes/recaps with point-of-view character | Journal entry linked to a character/author | https://docs.kanka.io/en/latest/entries/journals.html | official docs (reused S3) | F-029 | Campaign |
| CMP-34 | Kanka (core) | 30-minute prep path from last journal | Dashboard → last journal → linked people/places/quests → prep | https://kanka.io/learn/prep (2026-04-10) | official article (reused S4) | F-029/F-012 PARTIAL | Campaign |
| CMP-35 | Kanka (core) | Multiple world calendars with reminders on dates | Calendar entry; add reminder (event) to date; long events need several reminders; max 2-month span shown | https://docs.kanka.io/en/latest/entries/calendars.html | official docs | F-040 PARTIAL | Campaign |
| CMP-36 | Kanka (core) | Parent/child calendars inheriting reminders | Child calendar displays parent reminders; editing them edits parent | same | official docs | F-040 PARTIAL | Campaign |
| CMP-37 | Kanka (core) | Automatic date advance | "Advancing date" option increments current date daily at 00:00 UTC | same | official docs | F-040 *conflict* (world time is DM-advanced, I-087) | Campaign |
| CMP-38 | Kanka (core) | Custom date display format and huge year range | Format variables (day, month name/number, year, suffix); years ±2 billion | same | official docs | F-040 PARTIAL | Campaign |
| CMP-39 | Kanka (core) | Calendar keyboard navigation | Ctrl+←/→ previous/next month/year | https://docs.kanka.io/en/latest/advanced/keyboard-shortcuts.html | official docs (search snippet) | NAV-11 PARTIAL | Campaign |
| CMP-40 | Kanka (core) | Timelines of eras and elements | Timeline entry → eras → elements linked to events/entries or freeform text | https://docs.kanka.io/en/latest/entries/timelines.html | official docs | F-040/GAP-12 PARTIAL | Campaign |
| CMP-41 | Kanka (core) | Map Explorer canvas with no separate edit mode | Full-screen map; bottom toolbar creates pin, text label, circle (drag), area (click points, double-click close), path; details side panel then Save | https://docs.kanka.io/en/latest/entries/maps/explore.html ; https://docs.kanka.io/en/latest/entries/maps/markers.html | official docs | F-039 PARTIAL | Campaign |
| CMP-42 | Kanka (core) | Rapid marker placement | "Rapid" mode keeps the tool active after each save | https://docs.kanka.io/en/latest/entries/maps/explore.html | official docs | NEW | Campaign |
| CMP-43 | Kanka (core) | Map legend with search | List button top-left shows markers by group; search without panning | same | official docs | F-039 PARTIAL | Campaign |
| CMP-44 | Kanka (core) | Marker details panel actions | Select marker → panel shows description, linked entry, group, measurements; editors: center, duplicate, edit, remove | same | official docs | F-039 PARTIAL | Campaign |
| CMP-45 | Kanka (core) | Distance measuring on world map | Click waypoints; Esc or double-click ends; units from map settings | same | official docs | F-021/F-039 PARTIAL | Campaign |
| CMP-46 | Kanka (core) | Map settings (grid, zoom, units, initial position) | Map name menu → settings | same | official docs | F-039 PARTIAL | Campaign |
| CMP-47 | Kanka (core) | Draggable markers autosave position | Advanced option "Draggable"; editors drag on canvas; saved automatically | https://docs.kanka.io/en/latest/entries/maps/markers.html | official docs | F-039 PARTIAL | Campaign |
| CMP-48 | Kanka (core) | Per-marker visibility, groups and layers | Marker form: group, colour/opacity, visibility; separate Groups and Layers pages | same ; https://docs.kanka.io/en/latest/entries/maps.html | official docs | F-039 PARTIAL | Campaign |
| CMP-49 | Kanka (core) | Automatic tiling of large map images | Upload triggers tiling; map temporarily unavailable while processing; scoped to world maps, not tactical | https://docs.kanka.io/en/latest/entries/maps.html | official docs | F-039/F-013 PARTIAL | Campaign |
| CMP-50 | Kanka (core) | Role-based campaign permissions (Admin/Player/Public) with per-module grants | World → Roles; Player role starts with no permissions; creators can edit own entries | https://docs.kanka.io/en/latest/features/permissions.html | official docs (reused S2) | F-006/F-007 PARTIAL | Campaign |
| CMP-51 | Kanka (core) | Per-entry permissions and admin-only privacy flag | Permissions tab in entry editor (role/user grants); "private" checkbox; tab unavailable ≥10 members → entry view left menu | same | official docs | F-007 PARTIAL | Campaign |
| CMP-52 | Kanka (core) | Test permissions as a member ("view as") | Guide describes viewing campaign as a member/role | https://docs.kanka.io/en/latest/guides/testing-permissions.html | official docs (reused S2) | F-007 (blueprint-campaign-research S2) | Campaign |
| CMP-53 | Kanka (core) | Public campaigns | Public role with view-only permissions for non-members | https://docs.kanka.io/en/latest/features/permissions.html | official docs | NEW (public publication) | Campaign |
| CMP-54 | LegendKeeper (core) | Infinitely nested wiki | Page tree sidebar; create via bottom-left "Create"; drag-and-drop wiki shortcuts | https://www.legendkeeper.com/features/ ; https://www.legendkeeper.com/legendkeeper-101-the-basics-beyond/ (2022-02-15) | product page; official guide | F-014 PARTIAL | Campaign |
| CMP-55 | LegendKeeper (core) | Real-time co-editing with visible cursors | Collaborators edit same document simultaneously | https://www.legendkeeper.com/features/ | product page | GAP-11 PARTIAL | Campaign |
| CMP-56 | LegendKeeper (core) | Secret blocks inside a page | `/secret` inserts a block hidden from players; changelog snippets show editor visibility of secrets changed over versions and per-secret permissions were announced as upcoming | https://www.legendkeeper.com/legendkeeper-101-the-basics-beyond/ ; changelog pages | official guide; release notes (snippet) | F-007/F-014 PARTIAL | Campaign |
| CMP-57 | LegendKeeper (core) | Private-by-default projects, invites, visual permissions editor | Invite members; visual permissions editor | https://www.legendkeeper.com/features/ ; changelog (snippet) | product page; release notes (snippet) | F-006 PARTIAL | Campaign |
| CMP-58 | LegendKeeper (core) | Public URL sharing | Publish project/page to a public link | https://www.legendkeeper.com/features/ | product page | NEW (public publication) | Campaign |
| CMP-59 | LegendKeeper (core) | Auto-link recognised names | Editor underlines recognised element names and prompts to create links | https://www.legendkeeper.com/legendkeeper-101-the-basics-beyond/ | official guide | NEW | Campaign |
| CMP-60 | LegendKeeper (core) | Create nested page from text | `[[name]]` creates a new nested element; "Cut-to-New-Page" moves a selection into a new page | same ; https://www.legendkeeper.com/features/ | official guide; product page | NEW | Campaign |
| CMP-61 | LegendKeeper (core) | Page templates shareable with community | Create page from template; share templates | https://www.legendkeeper.com/features/ | product page | F-014 PARTIAL | Campaign |
| CMP-62 | LegendKeeper (core) | Tags, featured image, custom properties; infobox and properties blocks | Properties blocks for fast facts; infobox block | https://www.legendkeeper.com/changelog/ (0.19.1, 2026-08-18) | release notes | F-014 PARTIAL | Campaign |
| CMP-63 | LegendKeeper (core) | Meter block (progress bars, gauges, token pools, ratings) | Insert block in page | https://www.legendkeeper.com/changelog/ (0.17.2.0, 2025-12-02) | release notes | F-015/F-041 PARTIAL | Campaign |
| CMP-64 | LegendKeeper (core) | Nested maps world→region→town→dungeon | Map tab on element; pins link to other elements' maps | https://www.legendkeeper.com/features/ | product page | F-039 PARTIAL | Campaign |
| CMP-65 | LegendKeeper (core) | Right-click to drop a linked pin | Right-click map → pin → choose element | https://www.legendkeeper.com/legendkeeper-101-the-basics-beyond/ | official guide | F-039 PARTIAL | Campaign |
| CMP-66 | LegendKeeper (core) | Pin styling, label display mode, tag-filtered visibility | Pin editor in atlas: icon/colour/border; label hover/always/never; filter pins by tag | https://www.legendkeeper.com/features/ ; changelog (snippet) | product page; release notes (snippet) | F-039 PARTIAL | Campaign |
| CMP-67 | LegendKeeper (core) | Create wiki page directly from map | Command in atlas creates a page tied to the pin | https://www.legendkeeper.com/features/ | product page | F-039/F-014 PARTIAL | Campaign |
| CMP-68 | LegendKeeper (core) | Map tool with pins, regions, paths, labels, measuring, "fantasy navigation", multiplayer cursors | New map tool; live cursors of collaborators | https://www.legendkeeper.com/changelog/ (0.18.0.0, 2026-01-10; measure/navigation fixes 0.18.0.2, 2026-01-17) | release notes | F-039/F-021 PARTIAL | Campaign |
| CMP-69 | LegendKeeper (core) | Timelines with chronicle, Gantt and calendar views | Switch view on a timeline; events with rich text linked to pages; precision from eons to minutes | https://www.legendkeeper.com/features/ | product page | F-040/GAP-12 PARTIAL | Campaign |
| CMP-70 | LegendKeeper (core) | Custom calendar systems with moons | Calendar editor: months/days/weeks; moons with phases and colours | same ; changelog (0.17.1.0, 2025-11-06) | product page; release notes | F-040 PARTIAL | Campaign |
| CMP-71 | LegendKeeper (core) | Linked timelines across scales/regions | Timeline linking | https://www.legendkeeper.com/features/ | product page | GAP-12 NEW | Campaign |
| CMP-72 | LegendKeeper (core) | Boards (freeform canvases) | Board tab; page cards/board cards linking elements; uses: flowcharts, DM screens, pointcrawls | same ; 101 guide | product page; official guide | GAP-12 NEW | Campaign |
| CMP-73 | World Anvil (core) | 28 article templates with prompts | Choose template when creating an article; template-specific fields | https://www.worldanvil.com/learn/article-templates | official docs (search snippet) | F-014 PARTIAL | Campaign |
| CMP-74 | World Anvil (core) | Secrets inside articles and subscriber groups | Secrets element; worlds, articles, timelines, maps, pins, layers set public/private/restricted to subscriber groups | https://www.worldanvil.com/learn/access-rights/subscribers ; https://www.worldanvil.com/learn/beginner-tutorials/get-started-secrets (2025-01-01) | official docs (search snippet; S8 reused) | F-007/F-006 PARTIAL | Campaign |
| CMP-75 | World Anvil Campaign Manager | Schedule a session | Sessions section → "Schedule a new Session" form → appears on campaign home tab | https://www.worldanvil.com/learn/rpg/campaign-manager | official docs (search snippet) | F-011 PARTIAL | Campaign |
| CMP-76 | World Anvil Campaign Manager | Write session report after play | "Write report" button in Sessions after session | same ; S7 | official docs (search snippet; reused S7) | F-029 | Campaign |
| CMP-77 | World Anvil Campaign Manager | Player invitation link (account + PC required) | Invite link sent by GM | same | official docs (search snippet) | F-006 PARTIAL | Campaign |
| CMP-78 | World Anvil (core) | Interactive maps linking articles and other maps | Pins, labels, lines; marker groups; layers; draggable pins; per pin/layer visibility | https://www.worldanvil.com/learn/map-making/maps ; https://www.worldanvil.com/features/maps | official docs (search snippet) | F-039 PARTIAL | Campaign |
| CMP-79 | World Anvil (Master tier) | Chronicles: events on a timeline tied to map places | Right-click map → pin; right-click timeline → event; link event to marker; 4 parallel lanes; clicking a marker shows that place's event history; calendar presets or custom | https://blog.worldanvil.com/worldanvil/dev-news/map-your-worlds-history-through-time-place/ (2022-06-11) | release notes (blog) | GAP-12 NEW (F-039/F-040) | Campaign |
| CMP-80 | World Anvil (core) | Family trees, diplomacy webs, content trees | Dedicated visual tools for dynasties, faction relations, hierarchies | https://www.worldanvil.com/ | product page (search snippet) | F-042/GAP-12 NEW | Campaign |
| CMP-81 | World Anvil (core) | Whiteboards for mind-mapping/plotting | Free-form board with graphical items | same | product page (search snippet) | GAP-12 NEW | Campaign |
| CMP-82 | World Anvil (core) | Virtual handouts | Campaign manager handouts for players | https://www.worldanvil.com/learn/rpg/campaign-manager | official docs (search snippet) | GAP-05 PARTIAL | Campaign |
| CMP-83 | Scabard (core) | Connections incl. spoiler-free secret connections | Connections between pages; secret connections visible only to GM until revealed | https://www.scabard.com/world-building/learn-more | official page (search snippet) | F-014 PARTIAL | Campaign |
| CMP-84 | Scabard (core) | Proper Noun Detector | On saving a page, a window proposes creating linked pages for detected names | same | official page (search snippet) | NEW | Campaign |
| CMP-85 | Scabard (core) | Secret and GM Secret editors; secret pages | Separate secret fields in page editor; page-level secret flag | https://www.scabard.com/features (403; search snippet) | official page (search snippet) | F-007 PARTIAL | Campaign |
| CMP-86 | Scabard (core) | Maps attached to Places | Upload map image to a Place page | https://www.scabard.com/world-building/learn-more | official page (search snippet) | F-039 PARTIAL | Campaign |
| CMP-87 | Scabard (core) | Session logs, timeline, adventures | Campaign sections for logs and timeline | https://www.scabard.com/features (403; search snippet) | official page (search snippet) | F-029/F-040 PARTIAL | Campaign |
| CMP-88 | Obsidian (core) | Backlinks with linked and unlinked mentions | Right sidebar panel or in-document footer; filter, sort, context; open persistent backlinks tab via command palette | https://obsidian.md/help/plugins/backlinks | official docs | F-014/F-062 PARTIAL (unlinked mentions NEW) | Campaign |
| CMP-89 | Obsidian (core) | Local graph with depth slider | Ribbon "Open graph view"; local graph via command; groups coloured by search; filters (tags, orphans) | https://obsidian.md/help/plugins/graph | official docs | F-014 *conflict*, GAP-12 | Campaign |
| CMP-90 | Obsidian (core) | Canvas boards | Cards (text, note, media, web), labelled directional arrows (double-click line), groups, colours; zoom to fit/selection; JSON Canvas file | https://obsidian.md/help/plugins/canvas | official docs | GAP-12 NEW | Campaign |
| CMP-91 | Obsidian (core) | Bases: saved database views over notes | Table, list, cards, kanban, map views; filters, sorts, formulas; inline property editing; `.base` file or embedded block | https://obsidian.md/help/bases | official docs | F-014/F-062 PARTIAL | Campaign |
| CMP-92 | Obsidian Leaflet (third-party plugin, maintenance mode) | Image maps with note-linked markers | Markers link to notes/headings/blocks; marker types with icons; shift+right-click circle overlay; shift/alt-click distance; markers from note frontmatter; draw controller | https://github.com/javalent/obsidian-leaflet | official README | F-039 PARTIAL | Campaign |
| CMP-93 | Obsidian Calendarium (third-party plugin) | Fantasy calendars in vault | Plugin calendars; docs moved to plugins.javalent.com (not fetched) | https://github.com/javalent/calendarium | official README (limited) | F-040 PARTIAL | Campaign |
| CMP-94 | Obsidian community vault (third-party) | Post-session loop | Write recap, log which clues reached players, update NPC status frontmatter; "next time" block becomes prep list | https://vaultorial.com/dnd-campaign-vault/ | third-party product page (search snippet) | F-029/F-012 PARTIAL | Campaign |
| CMP-95 | Notion (core) | Two-way relations and rollups between databases | Relation property; "Show on related database" toggle; rollup property aggregates (count, sum, earliest date…) | https://www.notion.com/help/relations-and-rollups | official docs | F-014 PARTIAL | Campaign |
| CMP-96 | Notion (Sly Flourish template) | Tag-filtered gallery pages per entry type | One Campaign database; tags NPC/Location/Villain/Item; filtered gallery views on dedicated pages; @ links | https://slyflourish.com/lazy_dnd_with_notion.html (2020-07-06) | third-party article | F-014 PARTIAL | Campaign |
| CMP-97 | Campfire (core) | Modular worldbuilding (characters, maps & locations, species, timelines & calendars, conlang) | Enable modules individually; per-module pricing; desktop and mobile apps | https://www.campfirewriting.com/ | product page | F-014/F-037 PARTIAL (low relevance: writing tool) | Campaign |
| CMP-98 | Fantasy Calendar (core) | Full calendar engine | Months, variable weeks, leap-day rules, multiple moons, seasons, eras, cycles, custom hours/minutes | https://app.fantasy-calendar.com/ (2026 footer) | product page | F-040 PARTIAL | Campaign |
| CMP-99 | Fantasy Calendar (core) | Weather generated by custom climate | Weather varying through the year per location climate | same | product page | F-047 PARTIAL | Campaign |
| CMP-100 | Fantasy Calendar (core) | Conditional/recurring events to the minute | Event editor with conditions (e.g., celestial combinations) | same | product page | F-040 PARTIAL | Campaign |
| CMP-101 | Fantasy Calendar (core) | Invite players and co-GMs; embed; linked calendars | Share settings; embed code; link calendars for other societies/planets | same | product page | F-040/F-006 PARTIAL | Campaign |
| CMP-102 | 5e.tools DM Screen widget | In-game clock/calendar with browse mode, events and encounters | Clock/Calendar widget; adjust date/time; named years/eras; browse days | https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/changelog.json (v1.78.0 2019-07-14; v1.79.1 2019-08-08) | release notes (historical) | F-040/F-010 PARTIAL | Campaign |
| CMP-103 | 5e.tools DM Screen widget | Weather randomiser in calendar | Button in Clock/Calendar | same (v1.79.11, 2019-08-31) | release notes (historical) | F-047 PARTIAL | Campaign |
| CMP-104 | Azgaar Fantasy Map Generator (core) | Procedural world map with editors | Generate world; editors for burgs, states, cultures, religions, routes, markers, notes; save `.map`; web and desktop | https://github.com/Azgaar/Fantasy-Map-Generator | official README | F-039 PARTIAL (generation not adopted) | Campaign |
| CMP-105 | donjon (core) | World, town, inn generators; medieval demographics | Form → generate page | https://donjon.bin.sh/ | product page | F-014/F-043 PARTIAL | Campaign |

### Preparation

| ID | Product (layer) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMP-106 | Kobold+ Fight Club (core) | Selectable encounter-math strategy incl. 2024 | Strategy modal: "D&D5e 2014 Encounter Rules" (Easy/Medium/Hard/Deadly), "MCDM's Flee, Mortals!", "D&D5e 2024 Encounter Rules" (Low/Moderate/High); default 2024 | https://github.com/fantasycalendar/kobold-plus-fight-club (src/js/strategy.js, src/stores/encounter.js; 2025-04-10) | source code (observed) | F-012 PARTIAL | Preparation |
| CMP-107 | Kobold+ Fight Club (core) | Party panel with saved party groups | Party panel + party modal; players' levels | same (PartyPanel/PartyModal) | source code (observed) | F-012 PARTIAL | Preparation |
| CMP-108 | Kobold+ Fight Club (core) | Filterable monster table | Search box (Ctrl/Cmd+K), filters slide-over (Ctrl/Cmd+F) with CR slider and alignment grid; paging Ctrl+[ / Ctrl+] | same (hotkeys, FiltersSlideover, ChallengeRatingSlider, AlignmentGrid) | source code (observed) | F-012/F-033 PARTIAL | Preparation |
| CMP-109 | Kobold+ Fight Club (core) | Source selection | Sources modal to include/exclude books by type | same (SourcesModal) | source code (observed) | F-033 PARTIAL (DB-09) | Preparation |
| CMP-110 | Kobold+ Fight Club (core) | Generate random encounter at difficulty | Generate (Ctrl/Cmd+G); per issue discussion, picks a random encounter template and fills it with CR-appropriate monsters for the budget | same; https://github.com/fantasycalendar/kobold-plus-fight-club/issues/50 | source code (observed); issue (search snippet) | F-012 *conflict* (no automatic generation approved) | Preparation |
| CMP-111 | Kobold+ Fight Club (core) | Save encounter + generation history (browser storage) | Save (Ctrl/Cmd+S); saved encounters and history in localStorage | same (stores/encounter.js) | source code (observed) | F-012 PARTIAL | Preparation |
| CMP-112 | Kobold+ Fight Club (core) | Import custom monsters | Importer modal: Google Sheets, raw JSON, JSON file, CSV; downloadable example file | same (js/importer.js) | source code (observed) | F-009/F-028 PARTIAL | Preparation |
| CMP-113 | Kobold+ Fight Club (core) | Send encounter to a combat tracker | "Improved Initiative" button posts encounter to improvedinitiative.app/launchencounter in new tab | same (ImprovedInitiativeButton.vue) | source code (observed) | F-012→F-001 (internal hand-off) | Preparation |
| CMP-114 | Kobold Fight Club (original, third-party description) | XP budget readout and manual adjustment of HP/quantities | Party size/levels → recommended XP per difficulty and adjusted XP; manual HP and quantity adjustments; filters by type, terrain, alignment, CR | https://www.dungeonsolvers.com/features-and-functions-of-kobold-fight-club/ | third-party article | F-012 PARTIAL | Preparation |
| CMP-115 | donjon (core) | Encounter size calculator (2014 and 2024 tiers) | Choose PC levels and monster CR → recommended monster counts per difficulty | https://donjon.bin.sh/5e/calc/enc_size.html | product page | F-012 PARTIAL | Preparation |
| CMP-116 | AideDD (core) | Encounter builder with 2014/2024 difficulty and treasure | Add PCs by level; add monsters; outputs difficulty, shared XP, per-creature and hoard treasure; "Monster Manual only" filter | https://www.aidedd.org/dnd-encounter/index.php?l=1/ | product page | F-012/F-018 PARTIAL | Preparation |
| CMP-117 | 5e.tools Bestiary encounter builder | Auto-fill to a target difficulty | "Adjust to <Difficulty>" button populates randomly | changelog.json (v1.70.2, 2019-02-05) | release notes (historical; 2024 behaviour unverified) | F-012 *conflict* (generation) | Preparation |
| CMP-118 | 5e.tools Bestiary encounter builder | Save/load multiple encounters; load into initiative tracker | Encounter list in builder; tracker imports saved encounter | changelog.json (v1.73.1, 2019-03-17) | release notes (historical) | F-012 PARTIAL | Preparation |
| CMP-119 | Shieldmaiden (core) | Campaign → encounters structure with builder and difficulty | Campaign required; encounters grouped under it; builder calculates difficulty; custom monsters | https://shieldmaiden.app/documentation ; https://shieldmaiden.app/ | official docs; product page | F-012 PARTIAL | Preparation |
| CMP-120 | Shieldmaiden (core) | Encounter atmosphere and loot reminder | Encounter form: name, background image, loot reminder, players/NPCs | https://shieldmaiden.app/documentation | official docs | F-012/F-018 PARTIAL | Preparation |
| CMP-121 | Game Master 5e (core, stale 2020) | Campaign → adventures → characters & encounters; treasure items sent to players | Hierarchical lists; encounter builder with random enemies and difficulty analyzer; free tier 1 campaign/1 adventure/3 encounters | https://apps.apple.com/us/app/game-master-5th-edition/id908176026 (v3.9, 2020-09-24) | store page | F-012/F-018/F-038 PARTIAL | Preparation |
| CMP-122 | Game Master 5e (core) | Creature builder/scaler from a few stats | Enter CR, abilities, hit dice → generated creature; scale existing | same | store page | F-009 NEW (scaling) | Preparation |
| CMP-123 | Obsidian Initiative Tracker (third-party plugin) | Encounter defined inside a note | ```encounter``` code block; creatures by name, bestiary entry or dice quantity; group identical creatures; custom display names; XP by CR/level; multiple encounters per block; autosave | https://github.com/javalent/initiative-tracker | official README | F-012 PARTIAL | Preparation |
| CMP-124 | Lazy DM method (Sly Flourish) | Eight-step prep checklist | Review characters, strong start, potential scenes, secrets and clues, fantastic locations, important NPCs, relevant monsters, magic item rewards; brief entries | https://slyflourish.com/eight_steps_2023.html (2023-10-23) | author method article | F-012/F-034 PARTIAL; NEW as prep sheet | Preparation |
| CMP-125 | Lazy DM method | Minimal 3-step prep and "choose the steps you need" | Strong start + ~10 secrets/clues + 3 locations; 15–30 min full checklist | https://slyflourish.com/choosing_the_right_steps.html ; https://slyflourish.com/rotldm_template.html | author article (search snippet) | NEW | Preparation |
| CMP-126 | Lazy DM method | Carry forward unrevealed secrets | Review last session's secrets; bring forward still-relevant unrevealed ones | https://slyflourish.com/eight_steps_2023.html | author method article | NEW (F-029/F-015 link) | Preparation |
| CMP-127 | Lazy DM method | Secrets not tied to a location; reveal ~half | Clues abstracted from place, revealed wherever they fit | https://slyflourish.com/using_the_8_steps_at_the_table.html | author method article | NEW | Preparation |
| CMP-128 | Notion (Sly template) | One-click session prep page from template | "Generate Session Planning Template" button creates page with eight-step sections + monsters, battle maps, notes | https://slyflourish.com/lazy_dnd_with_notion.html (2020-07-06) | third-party article | F-012 PARTIAL | Preparation |
| CMP-129 | Chartopia (core) | Random table editor with implied dice ranges | New chart = d12, single "Result" column; blank rows inherit previous row and collapse into ranges on view | https://chartopia.d12dev.com/docs/editor-quick-start/ | official docs (search snippet) | F-043 PARTIAL | Preparation |
| CMP-130 | Chartopia (core) | Linked charts and rerolls | CHART and REROLL macros roll on other charts; name:value parameters | https://chartopia.d12dev.com/docs/domain-language/ | official docs (search snippet) | F-043 PARTIAL | Preparation |
| CMP-131 | Chartopia (core) | Roll only rows matching text in chosen columns | `filter` / `filter_cols` parameters | same | official docs (search snippet) | F-043 PARTIAL | Preparation |
| CMP-132 | Chartopia (core) | Input variables form before rolling | Dropdown (first value default) or free text shown before roll; values filter lookups and propagate to linked subcharts | https://chartopia.d12dev.com/docs/input-variables/ | official docs | F-043 PARTIAL | Preparation |
| CMP-133 | Chartopia (core) | Roll history with notes | Save rolls with contextual notes in "Roll history" | https://chartopia.d12dev.com/docs/features/ | official docs | F-043 PARTIAL | Preparation |
| CMP-134 | 5e.tools Loot generator | Per-item reroll | Reroll one generated item without rerolling the set | changelog.json (v1.68.1, 2018-12-21) | release notes (historical) | F-018/F-043 PARTIAL | Preparation |
| CMP-135 | donjon (core) | 5e random generator suite | Form with filters → results: encounters (PCs, level, difficulty, environment), traps by danger, treasure individual/hoard with rarity/type, NPCs, trinkets, art objects, magic items, wild magic, carousing/business downtime events | https://donjon.bin.sh/5e/random/ | product page | F-018/F-036/F-043 PARTIAL | Preparation |
| CMP-136 | donjon (core) | Random magic shop | Generator page | https://donjon.bin.sh/ | product page | F-019 PARTIAL | Preparation |
| CMP-137 | donjon (core) | Random dungeon generator with seed and options | Form: name, level, party size, motif, seed, size, layout, room layout/size, doors, corridors, dead-ends, stairs, map style, grid square/hex | https://donjon.bin.sh/5e/dungeon/ | product page | F-013 *conflict* (generation not adopted) | Preparation |
| CMP-138 | donjon (core) | Dungeon outputs | SVG map, unlabeled map, print-scaled map, TSV, self-contained HTML, PDF, JSON | same | product page | F-027/F-028 PARTIAL | Preparation |
| CMP-139 | donjon (core) | Five-room dungeon and random adventure generators | Generator pages | https://donjon.bin.sh/ | product page | NEW (not adopted) | Preparation |
| CMP-140 | Watabou One Page Dungeon (core) | Reroll and context menu | Enter or button to reroll; right-click menu for all options; notes positioned manually or auto-rearranged | https://watabou.itch.io/one-page-dungeon (v1.2.7, 2026-01-14) | product page | F-013 PARTIAL | Preparation |
| CMP-141 | Watabou One Page Dungeon (core) | Seeds and permalinks | Seed-based generation; share URL with parameters | same | product page | NEW | Preparation |
| CMP-142 | Watabou One Page Dungeon (core) | Export PNG/SVG/JSON/Markdown | Export menu | same | product page | F-027 PARTIAL | Preparation |
| CMP-143 | Dungeon Scrawl (core) | Fast dungeon drawing with shape tools and one-click styles | Shape tools for rooms/halls; style presets restyle whole map; image library props/markers + uploads | https://www.dungeonscrawl.com/ | product page | F-013 PARTIAL | Preparation |
| CMP-144 | Dungeon Scrawl (core) | Import random dungeons from generators | Import command | same | product page | F-028 PARTIAL | Preparation |
| CMP-145 | Dungeon Scrawl (core) | PNG and UVTT export; Roll20 sync | Export dialog; Roll20 integration keeps map synced | same | product page | F-027/F-028 PARTIAL | Preparation |
| CMP-146 | Dungeondraft (core) | Desktop map editor with smart tiling, object scattering, landscape painting, built-in lighting, dungeon/cave generator, object tags | Tool palette; offline, DRM-free | https://dungeondraft.net/ | product page | F-013 PARTIAL | Preparation |
| CMP-147 | Dungeondraft (core) | VTT integrations and printer-friendly export | Export to Foundry, Encounter+, D20Pro, Roll20, MapTool, Arkenforge, Fantasy Grounds Unity; print filter | same | product page | F-028 (supported map formats) PARTIAL | Preparation |
| CMP-148 | Dungeon Alchemist (core) | Auto-furnish drawn rooms | Draw room, pick theme/function → doors, walls, lights, furniture added; edit/move/scale objects | https://www.dungeonalchemist.com/ | product page | F-013 NEW (automatic furnishing) | Preparation |
| CMP-149 | Dungeon Alchemist (core) | Views and VTT export with walls/lights/doors; print by paper size | Orthographic/perspective/3D views; export; print dialog | same | product page | F-028 PARTIAL (3D excluded for play) | Preparation |
| CMP-150 | Inkarnate (core) | World/region map painting | Stamps, textures, line/shape tools; exports up to 8k | https://inkarnate.com/ | product page | F-039/F-013 PARTIAL | Preparation |
| CMP-151 | Arkenforge (core) | Map maker with animated assets and hex/iso grids | Import JPG/PNG/WEBP/GIF/MP4/WEBM; "infinite" map size | https://www.arkenforge.com/ | product page | F-013 PARTIAL | Preparation |
| CMP-152 | Tetra-cube (core) | Statblock generator with presets and legendary/mythic/lair/regional sections | Preset dropdown; toggles reveal sections; add ability rows; one/two-column layout | https://github.com/Tetra-cube/Tetra-cube.github.io/blob/master/dnd/dnd-statblock.html | source code (observed) | F-009 PARTIAL | Preparation |
| CMP-153 | Tetra-cube (core) | Save/load statblock JSON; printable block; print multiple; view image; view Markdown | Buttons under preview | same | source code (observed) | F-027/F-028 PARTIAL | Preparation |
| CMP-154 | Shieldmaiden (core) | Monster and spell creators | Tools pages | https://shieldmaiden.app/ | product page | F-009 PARTIAL | Preparation |

### Table

| ID | Product (layer) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMP-155 | Improved Initiative (core) | Encounter commands with default hotkeys | Toolbar + hotkeys: start alt+r, end shift+alt+r, next n, previous alt+n, reroll alt+shift+i, clean alt+del, clear alt+shift+del, quick add alt+q, roll dice d, player view alt+w, save alt+s, restore all PC HP alt+shift+t, settings ? | https://github.com/cynicaloptimist/improved-initiative (client/Commands/DefaultKeybindings.ts, BuildEncounterCommandList.ts; dev 2026-09-08) | source code (observed) | F-001 PARTIAL; NAV-11 | Table |
| CMP-156 | Improved Initiative (core) | Combatant commands with default hotkeys | damage t, healing l, temp HP alt+t, tag g, persistent notes y, remove del, rename f2, spent reaction r, hide/reveal in player view h, reveal AC alt+h, quick edit e, edit statblock shift+e, edit initiative alt+i, link initiative alt+l, move up/down alt+k/alt+j, select next/prev j/k, duplicate alt+d | same (BuildCombatantCommandList.ts) | source code (observed) | F-001 PARTIAL | Table |
| CMP-157 | Improved Initiative (core) | User-configurable toolbar and row buttons | Each command can show on action bar and/or combatant row; tooltips show description + key; command settings stored | same (Command.ts, Settings.ts) | source code (observed) | F-064 PARTIAL | Table |
| CMP-158 | Improved Initiative (core) | Initiative grouping options | Settings: auto-group initiative none / by name / side initiative; auto-reroll no/prompt/automatic; link initiative command | same (common/Settings.ts) | source code (observed) | F-001 PARTIAL (variants need rules source) | Table |
| CMP-159 | Improved Initiative (core) | HP rules toggles | Roll monster HP; boss and minion HP; allow negative HP | same | source code (observed) | F-001 PARTIAL | Table |
| CMP-160 | Improved Initiative (core) | Auto concentration check prompt | Setting on by default | same | source code (observed) | F-001 PARTIAL | Table |
| CMP-161 | Improved Initiative (core) | Tracker view options | Portraits, round counter, turn timer, difficulty, HP bar, combatant colour, reaction tracker, restore-combatants, post-combat stats (encounter/player/both) | same | source code (observed) | F-001 PARTIAL | Table |
| CMP-162 | Improved Initiative (core) | Player View with graded HP disclosure | Separate window (alt+w); monster and player HP each: actual / coloured label / monochrome label / damage taken / hide all; hide monsters outside encounter; active combatant on top | same (common/PlayerViewSettings.ts) | source code (observed) | F-050/F-016 PARTIAL | Table |
| CMP-163 | Improved Initiative (core) | Players suggest damage and tags from Player View | Settings "Allow player suggestions" and "Allow tag suggestions" *(DM acceptance step inferred)* | same | source code (observed) | F-001/F-002 PARTIAL (request flow) | Table |
| CMP-164 | Improved Initiative (core) | Player View styling | Dark mode, portraits/splash portraits, custom colours/font/background URL, custom CSS | same | source code (observed) | F-016 PARTIAL | Table |
| CMP-165 | Improved Initiative (core) | Persistent characters across encounters *(inference from command names)* | "Update Persistent Notes"; "Restore all Player Character HP" | same | source code (observed) | F-008/F-001 PARTIAL | Table |
| CMP-166 | Improved Initiative (core) | Tags (conditions/notes) on combatants | "Add Tag" command, shown in combatant row by default | same | source code (observed) | F-001 PARTIAL | Table |
| CMP-167 | Shieldmaiden (core) | Initiative entry and ordering rules | DM enters players' rolls; NPC roll adds DEX; grouped NPC roll uses lowest DEX; idle and hidden entities | https://shieldmaiden.app/documentation | official docs | F-001 PARTIAL | Table |
| CMP-168 | Shieldmaiden (core) | Mid-round joiners and downed lists | Added entity goes to idle list until next round; downed NPCs moved to separate list at round start | same | official docs | F-001 PARTIAL | Table |
| CMP-169 | Shieldmaiden (core) | Damage/healing with overkill/overheal, temp HP, crit dice doubling | Manual input dialog; overkill tracked | same | official docs | F-001 PARTIAL | Table |
| CMP-170 | Shieldmaiden (core) | Automatic death saves option | Downed player death-save tracking, automatable | same | official docs | F-001 PARTIAL | Table |
| CMP-171 | Shieldmaiden (core) | Transformations (e.g., Wild Shape) | Transform action on entity | same | official docs | F-024 PARTIAL | Table |
| CMP-172 | Shieldmaiden (core) | NPC attack rolls and damage application choice | Roll d20+mod with adv/dis; apply as hit / half / double | same | official docs | F-001/F-048 PARTIAL | Table |
| CMP-173 | Shieldmaiden (core) | Damage types with automatic resistance/vulnerability/immunity | Select damage type; defences applied | https://shieldmaiden.app/tools/combat-tracker | product page | F-001 PARTIAL | Table |
| CMP-174 | Shieldmaiden (core) | Multi-target actions | Select several targets, apply once | same | product page | F-048/TABLE_ACTIONS PARTIAL | Table |
| CMP-175 | Shieldmaiden (core) | Combat log with undo of last entry | Log of damage/healing stored in browser; undo last | https://shieldmaiden.app/documentation ; /tools/combat-tracker | official docs | F-001 (I-028 correction) PARTIAL | Table |
| CMP-176 | Shieldmaiden (core) | Reminders on events (e.g., concentration on damage) | Attach reminder to entity; notification when triggered | https://shieldmaiden.app/tools/combat-tracker | product page | F-001 PARTIAL | Table |
| CMP-177 | Shieldmaiden (core) | Live shared initiative screen | Separate public screen; every action updates instantly; setting hides death saves | same ; https://shieldmaiden.app/ | product page (search snippet) | F-016/F-050 PARTIAL | Table |
| CMP-178 | Shieldmaiden (paid extras) | Shared screen atmosphere and media | Background image or YouTube video; weather effects (rain, snow, fog, lightning); full-screen image/video/message to players | https://shieldmaiden.app/tools/dm-screen ; /pricing | product page | GAP-05 PARTIAL | Table |
| CMP-179 | Shieldmaiden (core) | Damage meters / leaderboards | Campaign-wide and post-combat damage/healing meters shown on campaign overview | https://shieldmaiden.app/ ; /documentation | product page; official docs | NEW | Table |
| CMP-180 | Shieldmaiden (core) | DM screen panels | Encounters panel; Players panel (HP, AC, passives, update several at once); Resources (SRD 5.1 rules, conditions, monsters, spells, items); soundboard of YouTube links | https://shieldmaiden.app/tools/dm-screen | product page | F-053/F-033 PARTIAL; soundboard F-030 out of scope | Table |
| CMP-181 | 5e.tools DM Screen | Modular grid of panels | Cells hold site content, tables, statblocks, videos, maps, widgets, external sites; embedded adventures with next/previous chapter | https://github.com/5etools/tracker/issues/580 (search snippet); changelog.json | official tracker (snippet); release notes (historical) | NEW (composable DM screen) | Table |
| CMP-182 | 5e.tools DM Screen initiative tracker | Rounds, player view page, checkbox columns reset each turn, lock, rename, split HP visibility | Tracker panel; separate "Initiative Tracker Player View" page connects to DM screen | changelog.json (v1.69.0 2019-01-22; v1.72.2 2019-03-09; v1.88.6 2019-11-15) | release notes (historical) | F-001/F-050 PARTIAL | Table |
| CMP-183 | 5e.tools DM Screen widget | Counter widget | Add Counter panel | changelog.json (v1.79.1, 2019-08-08) | release notes (historical) | F-008 (ad hoc counters I-160) PARTIAL | Table |
| CMP-184 | donjon (core) | Minimal initiative tracker without account | Add form (create N identical actors); Sort; click status icon to mark turn (gold star + pausable timer); Save to server returns ID; Load by ID | https://donjon.bin.sh/5e/initiative/ | product page | F-001 PARTIAL | Table |
| CMP-185 | Game Master 5e (core, stale 2020) | Combat tracker with statblocks and attack rolls; customizable DM screen with external links | Tracker screen; DM screen reference | https://apps.apple.com/us/app/game-master-5th-edition/id908176026 | store page | F-001/F-033 PARTIAL | Table |
| CMP-186 | Encounter+ (core + paid) | Initiative tracker plus battle map (walls, lighting, line of sight, fog, drawing, markers) | Base app free; Battle Map one-time purchase | https://encounter.plus/ | product page | F-001/F-005 PARTIAL | Table |
| CMP-187 | Encounter+ (premium) | Remote players via built-in web server; player screen via AirPlay/HDMI | Host device serves browser view; external display | same | product page | F-016 PARTIAL | Table |
| CMP-188 | Encounter+ (premium) | 3D dice themes, animated tiles/auras/effects, weather, party movement modes, hex overland maps | Premium subscription | same | product page | F-002/F-021/F-047 PARTIAL | Table |
| CMP-189 | Arkenforge (core) | In-person player display with fog; touch screen and physical minis linked to tokens | Plug-and-play second display (TV/projector) | https://www.arkenforge.com/ | product page | F-016 PARTIAL | Table |
| CMP-190 | Dungeon Scrawl (core) | Present live map while drawing elsewhere | "Tabletop view" shows clean live map to players; DM edits on another device | https://www.dungeonscrawl.com/ | product page | F-016/GAP-05 PARTIAL | Table |
| CMP-191 | World Anvil Campaign Manager | Storyteller screen in one tab | Notes, music, NPC creation, dice, statblocks and peek at PC sheets from a single tab | https://www.worldanvil.com/w/WorldAnvilCodex/a/dsts | official docs (search snippet) | F-053 PARTIAL; music F-030 out of scope | Table |
| CMP-192 | Demiplane Daggerheart Nexus (non-D&D) | GM-only section with secret rolls; players send secret rolls to GM; roll feed areas | Campaign page split shared vs GM-only | https://support.demiplane.com/hc/en-us/articles/25810842657687-Daggerheart-NEXUS-Frequently-Asked-Questions | official help (search snippet) | F-002 (I-031 secret rolls) PARTIAL | Table |
| CMP-193 | Obsidian Dice Roller (third-party plugin) | Inline dice with click-to-reroll | `dice:` inline formula renders result; click rerolls; flags hide formula/avg/label | https://github.com/javalent/dice-roller | official README | F-002 PARTIAL | Table |
| CMP-194 | Obsidian Dice Roller | Dice view side panel | Sidebar with preset d20 sets, advantage/disadvantage toggles, saved formulas | same | official README | F-002/F-064 PARTIAL | Table |
| CMP-195 | Obsidian Dice Roller | Roll on tables/lists/sections/tagged notes from notes | Reference block IDs; lookup tables match roll to row; persisted results with `dice+` | same | official README | F-043 PARTIAL | Table |

### Library

| ID | Product (layer) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMP-196 | Chartopia (core) | Chart toolbar actions | Fullscreen, printer-friendly view, edit (owner), embed iframe, add to folder, export CSV/Markdown, clone (with subcharts), like, report | https://chartopia.d12dev.com/docs/features/ | official docs | F-043/F-027 PARTIAL | Library |
| CMP-197 | Chartopia (core) | Folders (many-to-many) and published collections | Chart can be in many folders; collections with cover art | same | official docs | F-043/F-038 PARTIAL | Library |
| CMP-198 | Chartopia (core) | Public discovery with quick filters | Search + quick filters (NPCs, Locations, Encounters…) and roll from results | https://chartopia.d12dev.com/ | product page | F-033/F-043 PARTIAL | Library |
| CMP-199 | Obsidian Fantasy Statblocks (third-party plugin) | Bestiary and statblocks rendered in notes, multi-system | Statblock blocks in notes; bestiary shared with Initiative Tracker | https://github.com/javalent/fantasy-statblocks | official README | F-033/F-009 PARTIAL | Library |
| CMP-200 | Fight Club 5e / Game Master 5e (core) | Customizable compendium with file import and fan files | Import compendium files; SRD 5.1 default | https://apps.apple.com/us/app/fight-club-5th-edition/id901057473 ; GM5e store | store page (snippet) | F-028/F-033 PARTIAL | Library |
| CMP-201 | 5e.tools (core) | Content blocklist | Blocklist page; exclude sources; "Exclude All UA"; changes need Save | changelog.json (v1.60.0 2018-08-28; v1.97.0 2020-02-15) | release notes (historical) | F-033 PARTIAL (DB-09 is campaign-level) | Library |
| CMP-202 | 5e.tools (core) | Homebrew manager | Dedicated page to load/manage homebrew | changelog.json (v1.61.3, 2018-09-05) | release notes (historical) | F-009 PARTIAL | Library |
| CMP-203 | Improved Initiative (core) | Preloaded sources incl. SRD 2024 | Settings keep "wotc-srd" and "srd-2024" statblocks preloaded; library reference pane (alt+a) and manager (alt+shift+a) | https://github.com/cynicaloptimist/improved-initiative (common/Settings.ts) | source code (observed) | F-033 PARTIAL | Library |
| CMP-204 | Encounter+ (core) | Library/compendium with create/edit; modules and campaigns; import/export (modules, campaigns, systems, .dd2vtt/.uvtt, CSV, images) | Library tab; import menu | https://encounter.plus/ | product page | F-033/F-038/F-028 PARTIAL | Library |
| CMP-205 | Kanka (premium) | Marketplace of community plugins/themes/content | Marketplace install into campaign | https://kanka.io/features | product page | F-033 PARTIAL (community catalogue) | Library |
| CMP-206 | Inkarnate (core) | Clone community maps | Explore page → clone map into own account | https://inkarnate.com/ | product page | F-065/F-013 PARTIAL | Library |
| CMP-207 | LegendKeeper (core) | Asset library with folders; Unsplash/Pinterest import; map starter pack | Asset manager; import from services | https://www.legendkeeper.com/changelog/ (0.18.0.0) ; features | release notes; product page | F-065 PARTIAL | Library |
| CMP-208 | Kanka (core) | Gallery "used in" tracking | Images pasted in editor tracked in gallery usage list | Kanka docs/blog (search snippet; exact page not opened) | official (search snippet) | F-065 PARTIAL | Library |
| CMP-209 | donjon (core) | Quick reference, spell sheet, monster list, magic items | Reference pages | https://donjon.bin.sh/ | product page | F-033 | Library |

### Services/Settings

| ID | Product (layer) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMP-210 | Kanka (core) | Campaign export (once per day) and backups | Settings export; daily limit | https://docs.kanka.io/en/latest/overview.html | official docs | F-027/F-061 PARTIAL | Services/Settings |
| CMP-211 | Kanka (core) | Entry change history | Entry overview → "View changes" → full page with filters | https://docs.kanka.io/en/latest/features/history.html | official docs (search snippet) | F-061 / campaign revisions PARTIAL | Services/Settings |
| CMP-212 | Kanka (core) | Recovery of deleted entries and posts for 30 days | Settings → Recovery; filters; restore | https://docs.kanka.io/en/latest/features/campaigns/recovery.html | official docs (search snippet) | NEW (trash) / F-061 | Services/Settings |
| CMP-213 | Kanka (core/premium) | API; webhooks to Discord and others | API docs; webhook settings (premium) | https://app.kanka.io/api-docs/1.0/overview ; https://kanka.io/features | official docs; product page | GAP-17 NEW | Services/Settings |
| CMP-214 | Kanka (premium) | Campaign themes and custom CSS | Theme builder | https://kanka.io/features | product page | NEW (style phase) | Services/Settings |
| CMP-215 | Kanka (core) | Role permission to manage campaign bookmarks | Settings → Role → permission | Kanka docs/blog (search snippet) | official (search snippet) | NAV PARTIAL | Services/Settings |
| CMP-216 | LegendKeeper (core) | Daily version snapshots (keep 14) | Automatic snapshot once per day on change | LegendKeeper changelog/FAQ (search snippet; version not pinned) | release notes (snippet) | F-061 PARTIAL | Services/Settings |
| CMP-217 | LegendKeeper (core) | Export whole wiki HTML/JSON; daily server backups | Export command; FAQ | https://www.legendkeeper.com/faq/ (search snippet) | official FAQ (snippet) | F-027/F-061 PARTIAL | Services/Settings |
| CMP-218 | LegendKeeper (core) | Offline support with local change storage (upload limits) | Works offline; syncs later | https://www.legendkeeper.com/features/ | product page | F-026 PARTIAL | Services/Settings |
| CMP-219 | LegendKeeper (core) | Discord and passkey login | Login options | https://www.legendkeeper.com/changelog/ (0.19.0.0, 2026-06-24) | release notes | NEW (account) | Services/Settings |
| CMP-220 | World Anvil (core) | Whole-world export incl. drafts/private; per-article Print/Export | World Configuration → export (owner only); article edit → Print/Export | https://blog.worldanvil.com/worldanvil/dev-news/new-feature-world-exporting/ (2018-09-30) | release notes (blog) | F-027 PARTIAL | Services/Settings |
| CMP-221 | Obsidian (core) | File recovery snapshots with diff; restore or copy | Settings → File recovery → View snapshots; search file; "Show changes"; copy or restore; default ≥5 min apart, kept 7 days; device-local | https://obsidian.md/help/plugins/file-recovery | official docs | F-061 PARTIAL | Services/Settings |
| CMP-222 | Notion (core) | Per-page offline availability | Page ••• → "Available offline"; Settings → Offline lists pages; paid plans auto-download recents/favourites; databases: first 50 rows of first view | https://www.notion.com/help/use-pages-offline ; https://www.notion.com/releases/2025-08-19 (2.53) | official docs (snippet); release notes | F-026 PARTIAL | Services/Settings |
| CMP-223 | Encounter+ (core) | Offline local database | Native app works without network | https://encounter.plus/ | product page | F-026 PARTIAL | Services/Settings |
| CMP-224 | 5e.tools (core) | PWA with "Preload Offline Data" | Setting to preload content | changelog.json (v1.86.0, 2019-10-27) | release notes (historical) | F-026 PARTIAL | Services/Settings |
| CMP-225 | 5e.tools (core) | Save/load entire site state to file | Utilities → save/load state | changelog.json (v1.75.13, 2019-06-12) | release notes (historical) | F-061/F-027 PARTIAL | Services/Settings |
| CMP-226 | Improved Initiative (Epic tier) | Account sync across devices | Patreon tier enables sync | https://www.patreon.com/improvedinitiative | product page | F-026 PARTIAL | Services/Settings |
| CMP-227 | Kobold+ Fight Club (core) | Browser-only persistence | Saved encounters, history, strategy in localStorage | https://github.com/fantasycalendar/kobold-plus-fight-club (stores/encounter.js) | source code (observed) | F-026 (counter-example: no sync) | Services/Settings |
| CMP-228 | Scabard (core) | Players notified of GM changes except secrets | Automatic update notice between sessions | https://www.scabard.com/world-building/learn-more | official page (search snippet) | NEW (notifications) | Services/Settings |
| CMP-229 | Scabard (connector) | Foundry VTT connector | "Scabard Connect" Foundry package | https://foundryvtt.com/packages/scabardconnect | package listing (title only) | GAP-17 NEW | Services/Settings |
| CMP-230 | Scabard (core) | AI assistant "Ask Alejandro" feeding Proper Noun Detector | Generate content, then detector offers pages | https://www.scabard.com/features/ideation/ask-alejandro (search snippet) | official page (snippet) | GAP-18 (not adopted) | Services/Settings |
| CMP-231 | Fantasy Calendar (core) | Discord integration, embeds, import from donjon | Discord commands with image previews; embed; import | https://app.fantasy-calendar.com/ | product page | GAP-17/F-028 PARTIAL | Services/Settings |
| CMP-232 | Chartopia (core) | Discord bot "Twelves" and public API | Bot rolls charts in Discord; API quick start | https://chartopia.d12dev.com/docs/ | official docs | GAP-17 NEW | Services/Settings |
| CMP-233 | Kobold+ Fight Club (core) | Light/dark theme toggle | Ctrl/Cmd+Shift+\ | https://github.com/fantasycalendar/kobold-plus-fight-club (App.vue) | source code (observed) | NAV-11 PARTIAL | Services/Settings |
| CMP-234 | Watabou One Page Dungeon (core) | Colour-blind friendly palette, high-contrast mode, keyboard shortcuts, limited touch | Listed accessibility features; control location not stated | https://watabou.itch.io/one-page-dungeon | product page | NAV-11 PARTIAL | Services/Settings |
| CMP-235 | Dungeon Scrawl (core) | 15+ interface languages | 15+ languages listed on site | https://www.dungeonscrawl.com/ | product page | EN/IT baseline (NAV-11) | Services/Settings |
| CMP-236 | Shieldmaiden (core) | Freemium: core free, paid storage and QoL | Patreon-managed tiers | https://shieldmaiden.app/pricing | product page | N/A (no spending) | Services/Settings |

### Cross-cutting

| ID | Product (layer) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMP-237 | Kanka (core) | Global hotkeys | K focuses campaign search; N opens quick creator; ] toggles sidebar | https://docs.kanka.io/en/latest/advanced/keyboard-shortcuts.html | official docs (search snippet) | F-062/NAV-01 PARTIAL | Cross-cutting |
| CMP-238 | Kanka (core) | Quick creator | Hotkey/entry point creates any entry type with minimal fields | same | official docs (search snippet) | NEW | Cross-cutting |
| CMP-239 | Kobold+ Fight Club (core) | Keyboard help modal generated from registered shortcuts; Esc closes dialogs | Modal lists every visible hotkey with description | https://github.com/fantasycalendar/kobold-plus-fight-club (stores/hotkeys.js, KeyboardModal.vue) | source code (observed) | NAV-11 PARTIAL | Cross-cutting |
| CMP-240 | LegendKeeper (core) | Slash commands in editor | "/" menu (/secret, /layout, /help …) | https://www.legendkeeper.com/legendkeeper-101-the-basics-beyond/ | official guide | NEW (editor) | Cross-cutting |
| CMP-241 | LegendKeeper (core) | Global tag management | Manage tags across project | https://www.legendkeeper.com/changelog/ (0.18.0.0) | release notes | F-062 PARTIAL | Cross-cutting |
| CMP-242 | LegendKeeper (core) | Full-text search | Search across project | https://www.legendkeeper.com/features/ | product page | F-062 | Cross-cutting |
| CMP-243 | Kobold+ Fight Club (core) | Empty-state call-to-action buttons | EmptyStateButton component in empty lists *(behaviour inferred from name)* | https://github.com/fantasycalendar/kobold-plus-fight-club | source code (observed) | F-031 PARTIAL | Cross-cutting |
| CMP-244 | World Anvil / LegendKeeper / Watabou | Right-click to create at the pointer | Right-click on map/timeline creates pin/event (WA Chronicles, LK atlas); right-click menu for all options (Watabou) | CMP-65, CMP-79, CMP-140 sources | release notes; guides | NAV-08 PARTIAL | Cross-cutting |
| CMP-245 | Community (AlternativeTo) | Demand: Kanka and LegendKeeper judged interchangeable; Kanka preferred over World Anvil for TTRPG by some; World Anvil seen as broader but heavier | User comments on alternatives pages | https://alternativeto.net/software/legendkeeper ; https://alternativeto.net/software/world-anvil | community opinion | — | Cross-cutting |
| CMP-246 | Community (DungeonSolvers) | Demand: original Kobold Fight Club stopped working late 2024; Kobold+ adopted as successor | Article | https://www.dungeonsolvers.com/kobold-fight-club-balanced-encounters-on-the-fly/ | third-party article (search snippet) | F-012 (demand signal) | Cross-cutting |

Total: **246 rows** (CMP-01…CMP-246). Several rows describe the same product
feature at finer grain; this is not 246 unique new functions.

## Pattern notes

The most important patterns to copy, why they work, best implementer, and conflicts.

1. **One command registry → toolbar, row buttons, tooltip and hotkey** —
   Improved Initiative (CMP-155–157): every command has id, label, icon, default
   key; the user chooses whether it appears on the action bar or in each
   combatant row, and tooltips always show the key. Findable for novices,
   fast for experts, one source of truth. Pair with Kobold+'s generated
   keyboard help modal (CMP-239). Fits F-064/NAV-11 without a scripting language.
2. **Player projection with graded disclosure** — Improved Initiative's HP
   verbosity per side (actual / coloured label / monochrome label / damage taken /
   hidden) (CMP-162), 5e.tools split HP visibility (CMP-182), Shieldmaiden
   "hide death saves" (CMP-177). Best: Improved Initiative. Gives F-050 concrete
   options; monochrome label is an accessibility alternative to colour.
3. **Encounter builder layout: party panel + filterable monster table + live
   difficulty + save/history + hand-off to tracker** — Kobold+ (CMP-106–113),
   with AideDD adding treasure per encounter (CMP-116). Keep the 2024 labels
   Low/Moderate/High only for the baseline; Kobold+ proves strategies can be a
   swappable module. *Conflict:* auto-generation (CMP-110/117) is not adopted
   in F-012; offer it only as an explicit future decision. Kobold+ issue #50 is
   still open while the code ships a 2024 strategy: trust code, not the issue.
4. **Inline secrets inside shared pages** — LegendKeeper `/secret` blocks
   (CMP-56), World Anvil secrets with subscriber groups (CMP-74), Scabard
   Secret/GM Secret fields (CMP-85), Kanka posts with own visibility (CMP-26).
   Best: LegendKeeper for authoring speed; Kanka for per-section audience.
   *Uncertainty:* LK's rule for whether editors see secrets changed across
   versions and per-secret permissions were only announced; d20 Studio already
   separates editing from reading private content (I-044–I-051), so each block
   needs an explicit audience rather than an implicit "editors see all".
5. **Link suggestions from prose, confirmed by the user** — LegendKeeper
   auto-link underline (CMP-59), Scabard Proper Noun Detector on save (CMP-84),
   Obsidian unlinked mentions (CMP-88). Builds the world graph with near-zero
   effort. Best: Obsidian (non-intrusive side panel). *Conflict:* S3 records "no
   automatic extraction from prose"; the pattern is suggestion-only, so it needs
   an explicit adoption, not a silent reinterpretation.
6. **Map explorer without a separate edit mode** — Kanka bottom toolbar
   (pin/text/circle/area/path), details side panel, Rapid mode, searchable
   legend, measure with waypoints, Esc/double-click finishing (CMP-41–48);
   LegendKeeper right-click pins, nested maps, label display modes, tag filters
   (CMP-64–68). Best combined: Kanka's tool grammar + LK's nesting.
7. **Place history from map + timeline** — World Anvil Chronicles (CMP-79):
   click a marker to get its event history; parallel lanes for simultaneous
   events. Resolves GAP-12 elegantly without a separate "history" page.
8. **Calendar engine separate from real-world scheduling** — Fantasy Calendar
   (CMP-98–101), Kanka parent calendars and reminders (CMP-35–38), LK moons
   (CMP-70), 5e.tools clock with weather (CMP-102–103). *Conflict:* Kanka
   auto-advances the date daily in real time (CMP-37); d20 Studio's shared time
   is advanced by play/DM (I-087) — do not copy auto-advance.
9. **Random tables as composable generators** — Chartopia implied ranges,
   linked charts, column filters, input-variable form, roll history with notes,
   export/clone (CMP-129–133, 196–197); per-item reroll (CMP-134); seeds and
   permalinks for reproducible results (CMP-141). Best: Chartopia. Physical-dice
   entry and manual pick remain d20 Studio rules (F-043).
10. **Lazy DM prep sheet with carry-forward** — eight optional steps, minimal
    three, unrevealed secrets carried to next session, secrets not bound to a
    location (CMP-124–128); Obsidian loop "recap → next time → prep list"
    (CMP-94); Kanka 30-minute path from last journal (CMP-34). Best: Sly
    Flourish method + Notion one-click template. Candidate NEW Preparation
    object: session prep with checkable secrets linked to F-015/F-029.
11. **Composable DM screen** — 5e.tools grid of panels (content, tables,
    statblocks, maps, widgets, counters) (CMP-181–183), Shieldmaiden panels
    (CMP-180), World Anvil storyteller tab (CMP-191), Obsidian Dataview
    dashboard (CMP-01). Best: 5e.tools. Maps to Table side panels (NAV-08) and
    F-053, not a separate app.
12. **Combat log with undo and explicit damage application** — Shieldmaiden
    (CMP-169–176): hit/half/double, typed damage with automatic defences,
    multi-target, overkill, undo last. Aligns with I-028 visible corrections.
13. **Safety net layering** — per-entry change history (Kanka CMP-211), 30-day
    recovery bin (CMP-212), snapshots with diff and "restore as copy"
    (Obsidian CMP-221), daily snapshots (LK CMP-216), full export (CMP-210/217/220).
    Distinguish trash, revision history, backup (F-061) and export (F-027).
14. **Saved filtered views over structured entries** — Obsidian Bases
    (table/cards/kanban/map) (CMP-91), Notion relations/rollups and tag-filtered
    galleries (CMP-95–96), Kanka list widget with field filters (CMP-21).
    Lets one world archive serve NPC rosters, quest boards and faction lists.
15. **Boards/canvas for plotting and relations** — Obsidian Canvas (CMP-90),
    LegendKeeper Boards (CMP-72), World Anvil whiteboards (CMP-81), Kanka
    relation web with PNG/PDF export (CMP-29–30). *Conflict:* F-014 boundary
    "nessun grafo visuale" — GAP-12 already asks to synthesise; needs a delegated
    decision before the blueprint shows it.
16. **Present while editing** — Dungeon Scrawl tabletop view (CMP-190),
    Arkenforge player display with physical minis (CMP-189), Encounter+
    AirPlay/HDMI (CMP-187), Shieldmaiden media push (CMP-178). Supports F-016
    in-person screen and GAP-05 reveals.
17. **Map-maker interchange** — Dungeondraft, Dungeon Alchemist, Dungeon Scrawl
    export walls/lights/doors to VTT formats; Encounter+ imports .dd2vtt/.uvtt
    (CMP-145–149, 204). Already in F-028 scope; generation/3D stays outside.
18. **Local-first with honest offline scope** — Encounter+ local DB, Notion
    per-page "Available offline" with row limits, LK offline with upload limits,
    5e.tools preload, Kobold+ localStorage (CMP-218–227). Best: Notion — the user
    chooses what is offline and a settings page lists it. *Conflict:* Sly's 2020
    note "Notion has no offline mode" is superseded by Notion 2.53 (2025-08-19).
19. **Initiative variants as named, sourced options** — Improved Initiative
    group-by-name / side initiative / reroll each round (CMP-158), Shieldmaiden
    group roll with lowest DEX (CMP-167), mid-round joiners wait (CMP-168).
    Useful precedents, but each variant must cite its rules source; the 2024
    baseline stays default.

**Cross-product conflicts to keep visible:** LegendKeeper's features page still
lists regions/measuring as planned while 0.18.0.0 (2026-01-10) ships them;
LK's 2023 local-only snapshots (S6) vs later daily snapshots (version unpinned);
several DM tools still use 2014 difficulty (Game Master 5e 2020, 5e.tools
historical entries, Shieldmaiden unspecified) versus Kobold+/donjon/AideDD with
2024; public publication (Kanka public role, LK public URL, World Anvil public
worlds) has no d20 Studio family and touches privacy defaults — a genuine scope
question, not an ordinary UX choice.
