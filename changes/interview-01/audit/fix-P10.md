# Fix P10: campaign governance, members, invitations, settings and rules, sources, data, dashboard, safety and DM session tools

Date: 26/09/2026. Fixer: P10 (Claude, subagent). Branch `codex/interview-01`, working tree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`, nothing committed. Browser
session `d20-fix-p10`; evidence in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P10/`
(`journey/` for the P10 journey, `shots/` for exploratory checks, `regress/` for the area
journeys re-run with their images redirected there).

## Summary in plain words (IT)

Il DM invita i giocatori dall’intestazione della Panoramica, dalla pagina Inizio o dalla ricerca:
«Invita giocatori» → «Crea link» → «Copia link», tre gesti. In Membri ogni riga ha «Vedi come» e,
per il proprietario, «Cedi il ruolo di DM…». Le Impostazioni hanno una scheda per ogni cosa:
Regole (preset Standard 2024, Narrativo, Tattico o Personalizzato, poi le singole regole con il
lucchetto dopo l’avvio, senza più codici interni), «Cosa vedono i giocatori» (salute dei nemici,
nomi, probabilità di colpire, schede dei mostri), Permessi (anche «muovere le creature del DM» e
«bloccare le proprie pedine»), Predefiniti di scene e pedine con «Applica alle esistenti», Fonti
voce per voce con lo stato «mancante», Condivisione (la pagina pubblica, ora anche con le pagine
dell’Archivio) e Storico. La campagna in corso si archivia (il Tavolo si chiude e si riapre con
«Ripristina») e si elimina dopo un passo esplicito; il nome da scrivere non bada a trattini,
virgolette e maiuscole. Si copia in un’altra campagna qualunque cosa: voce, creatura, dispensa,
tabella, mazzo, homebrew. Al Tavolo Stop, Rallenta e Alza la mano stanno sempre in alto sulla
mappa (un tocco, anche sul telefono) e il DM vede il contatore delle mani alzate senza aprire la
campanella; il filtro personale sfuma anche dispense e immagini della chat e maschera le
parolacce. Il DM trova timer e orologi con un tocco e nella ricerca, gioca per un giocatore
assente con la sua barra delle azioni, calibra lo schermo condiviso e sceglie l’area mostrata; in
pausa i giocatori leggono un consiglio o la regola del giorno.

## Items

| ID | Result | What changed (market pattern) | Where |
| --- | --- | --- | --- |
| CA-03 | FIXED | Kanka dashboard widgets: configurable tiles, several of each (`list:<n>`, `calendar:<n>`, `preview:<n>`): «Elenco filtrato di voci» (World, People, Places, Factions, Quests, Recaps + an optional word), «Calendario delle sessioni» (month grid, session days marked, next three dates), «Anteprima di una voce». Each shows only what the viewer may read, so the DM and the players’ dashboards stay separate. The add form shows only the fields of the chosen widget. | `party.mjs`, `party.css` |
| CA-07 | FIXED | Kanka public role / LegendKeeper public URL: Settings › «Condivisione» embeds the community area’s own public-page form (one source of truth, `community.renderPublicSharing`/`bindPublicSharing`); palette «Pagina pubblica della campagna» (pagina pubblica, link pubblico, sola lettura, condividi campagna). Archive pages (B43) that the whole party reads are publishable (`community-domain.publicArchivePages`: text blocks, secrets revealed to all, public properties; hidden quests and pages for some characters never). World entries were already eligible when campaign-wide. | `campaign-settings.mjs`, `community.mjs`, `community-domain.mjs` |
| CA-49 | FIXED | Roll20 «Invite players» / Owlbear «Share»: `campaign-members.openInvite` shows the active link to copy and creates a new one (role, expiry 7 days, 5 uses by default) → «Link d’invito pronto» with «Copia link» (3 interactions). Button in the Overview heading (party dashboard, which replaces the Overview, and the shared edit in `campaign.mjs overview()` + `bindCampaign`), on Home («Le tue campagne» row for the campaign in play) and palette «Invita giocatori» (invito, link d’invito, condividi). «invita» now ranks «Invita giocatori» first; «Invia Stop anonimo» still appears lower through the palette’s typo tolerance (P9’s `command-palette.mjs`). | `campaign-members.mjs`, `party.mjs`, `campaign.mjs` (shared edit) |
| CA-57 | PARTIAL | Owlbear GM hand-off: «Cedi il ruolo di DM per la sessione» from the member row (Members), the Manage tab and the palette (co-dm, cedi il ruolo, passa il ruolo di master). The recipient now also runs the session at the Table (`session-view.sessionRunner`/`runsSession`: start/end, pause, hidden scene, waiting message, countdown, clocks, shared screen, the Session panel) besides the creatures and sessions. Not done: combat order, scene activation and Preparation stay tied to the core DM identity (`app.mjs`, `table.mjs`, `combat.mjs`, `preparation.mjs` role checks, other packages); the dialog says so. «From the Table roster»: the Table’s «Gruppo» list is session-view’s presence list; the hand-off entry is in Members and the palette, not on that list. | `campaign-members.mjs`, `session-view.mjs` |
| CA-60 | FIXED | Kanka «View as» in the member menu: «Vedi come» on each player/observer row in Members (campaign in play) opens the member view; the settings header button is now «Anteprima della pagina giocatori»; palette «Vedi come un giocatore» (vedi come, come giocatore, player view); «Controlla: vedi come Livia» in «Cosa vedono i giocatori». | `campaign-members.mjs`, `campaign-settings.mjs` |
| CA-61 | PARTIAL | DDB Game Settings / Owlbear per-role permissions / Roll20 «controlled by all players»: Permissions lists, for the role Giocatore, the three B18 tool switches plus «I giocatori possono muovere e far agire le creature del DM» (adds the player as controller of every non-private campaign NPC, new ones included by the follow-up commit; withdrawn cleanly) and «I giocatori possono bloccare e sbloccare le proprie pedine» (a token-menu entry for players on tokens they control). Palette «Permessi dei giocatori». Not done: grouping tokens stays DM-only (token-menu’s multi-selection is P6’s); there are no per-group permissions and observers only watch (the demo has two identities). | `campaign-settings-domain.mjs`, `campaign-settings.mjs` |
| CA-66 | FIXED | Alchemy X-Card / Foundry Safety & Communication queue: Stop · carta X, Rallenta and Alza la mano (with «Ctrl+Maiusc+U» in its name) on the Table’s map bar for every member, one tap each (also with the interface hidden); for the DM a «Mani alzate: N» counter that opens the Safety panel, always on the map without the bell. Placed in the session-view map bar (registry `map-layer`) rather than a `table-tool` or `table-panel`: a tool would sit two taps away inside a toolbar group and a sidebar panel is hidden on phones. Pre-game reminder text now points there. Palette «Chiedi di rallentare», Stop with «carta x» keywords. | `safety-ui.mjs`, `safety.mjs`, `safety.css`, `session-view.mjs` |
| CA-68 | FIXED | BG3 content toggles and profanity filter: `safety-domain.filterFor(state, role)` (`enabled`, `profanity`, `images`, `text`, `markup`, `topicsFor`). The player’s own lines and veils show as included (checked, locked) in the profile; new switches «Sfuma le immagini condivise in chat» and «Filtro delle parolacce». The DM marks a handout like a map («Marca una dispensa»); the viewer’s filter veils it with «Mostra». Shared edits: `chat.mjs withDays` wraps each rendered item (`filterChatMarkup`), `handouts.mjs viewerBody` wraps the viewer (`filterHandoutMarkup`). Journal and World texts are not wrapped (not listed as shared edits). | `safety-domain.mjs`, `safety-ui.mjs`, `safety.css`, `chat.mjs`, `handouts.mjs` (shared edits) |
| CA-69 | FIXED | BG3 Custom Mode / Solasta presets: picker with Standard 2024, Narrativo, Tattico and Personalizzato (dialog lists the changes and the rules kept by their lock); catalogue grouped in Personaggi / Tavolo e automazione / Combattimento e avventura: multiclasse (locked after the start), automazione, colpi critici, bere una pozione, peso e ingombro, fiancheggiamento. Census IDs and «Modello: …» lines are gone from the UI. One settings place: the rules page players read links to it (unchanged «Modifica nelle impostazioni»). The new rules cite the SRD 5.2.1 rule by name without an invented page, or say «regola della casa»; the Table does not compute critical-hit max, potions as an action or flanking by itself: their «Dove si vede» says it is the group’s agreement (P5 can read `policy.criticals` etc.). | `campaign-settings-domain.mjs`, `campaign-settings.mjs`, `campaign-settings.css` |
| CA-71 | PARTIAL | BG3 / Fantasy Grounds: one «Cosa vedono i giocatori» tab with enemy health, creature names (with «Applica alle esistenti» and the count), chance to hit and the players’ bestiary; one getter `campaign-settings-domain.disclosureOf(state)` for other areas. Checked from the player’s Table (no health pill, «Creatura sconosciuta»). Not done: DC visibility and failed passive checks. DCs are drawn by `roll-requests.mjs`, `dice-tray.mjs`, `chat.mjs` (P3) and `combat-ui.mjs` (P5), passive checks by `knowledge.mjs` (P6); none is a listed P10 shared edit, and a switch no screen obeys would be a fake control, so none was added. | `campaign-settings-domain.mjs`, `campaign-settings.mjs` |
| CA-73 | FIXED | Roll20 Compendium Selection / Kobold+ Sources: Fonti keeps the three source rows and adds «Homebrew, voce per voce» grouped by type, a switch per content (the Library’s own enable), the revision in use («revisione 1 di 1»), and «mancante» rows with «Aggiungilo dalla Biblioteca». Palette «Fonti e homebrew della campagna». | `campaign-settings-domain.mjs`, `campaign-settings.mjs` |
| CA-74 | FIXED | Roll20 «Apply Default Settings»: «Predefiniti delle scene» (griglia visibile, aggancio alla griglia, scala 1,5/3 m, nebbia e visione, luce del giorno/crepuscolo/notte) and «Predefiniti delle pedine del DM» (visione delle creature); new scenes and creatures follow them (follow-up commit); «Applica alle esistenti…» shows how many scenes and creatures change and which fields, applies in one undoable commit. Names and health link to «Cosa vedono i giocatori». | `campaign-settings-domain.mjs`, `campaign-settings.mjs` |
| CA-75 | PARTIAL | BG3 mod verification with the adventures checker (`adventures.requirementStatus` via `campaign-settings-domain.dependencyCheck`, `campaign-data-domain.importDependencies`): the JSON import preview lists «Contenuti richiesti» one row each (pronto / mancante / altra revisione, «Aggiungilo dalla Biblioteca»); on import what the Library holds is enabled in the new campaign and the rest is remembered and shown «mancante» in Fonti; entering a campaign with missing homebrew raises a DM notification to Fonti; palette «Controlla le dipendenze della campagna». Not done: a check when a player joins by link (the join page is unchanged; homebrew reaches players through the campaign’s enablement). | `campaign-data-domain.mjs`, `campaign-data.mjs`, `campaign-settings*.mjs` |
| CA-84 | FIXED | Roll20 cold storage for any game: the campaign in play can be archived («Archivia…» lists what stays blocked and says the Table closes); the Table shows «Campagna archiviata» for everyone (a `table-panel` cover) with «Ripristina la campagna» for the owner. Palette «Archivia la campagna» (archivia campagna, chiudi la campagna) opens this, not the missions archive. | `campaign-members.mjs`, `campaign-data*.mjs` |
| CA-85 | FIXED | Foundry typed title (normalised) + Kanka 30-day recovery: `campaign-members.sameCampaignName` ignores case, extra spaces, dash kind and quotes (an em dash types as «-»); the campaign in play is deleted after the explicit step «È la campagna in corso: chiudila» (archive + trash in one command) and recovered from the trash; the definitive purge still needs another campaign in play. Palette «Elimina la campagna». | `campaign-members.mjs`, `campaign-data*.mjs` |
| CA-88 | PARTIAL | Roll20 Transmogrifier: «Copia in un’altra campagna» takes any item of the campaign in play (scene with its check, World/Journal entry, creature, handout, random table, card deck, enabled homebrew), warns when a copy is already there and never overwrites; copies start unseen/unshuffled; logged in the data activity; palette command. From the item itself: the DM creature’s token menu («Copia in un’altra campagna…»). Not done: menu entries on handouts, entries, tables, decks and Library items (their menus are other packages’ files with no registry point). | `campaign-data-domain.mjs`, `campaign-data.mjs` |
| TV-76 | FIXED | The chance to hit is in «Cosa vedono i giocatori» and the palette («Probabilità di colpire mostrata ai giocatori», keyword probabilità). It writes the knowledge area’s campaign setting `knowledge-policy.hit-chance`, which `knowledge.mjs` already reads from the campaign (not a personal preference), so no `knowledge.mjs` edit was needed. | `campaign-settings*.mjs` |
| TV-112 | FIXED | Roll20 Player View / Alchemy «play as»: «Gioca per Giocatore» in the Session panel and the palette selects the player’s character at the Table with the full hotbar, rolls and sheet, and a banner «Giochi per …» with «Smetti». «Vedi come» (read-only projection) stays. | `session-view.mjs`, `session-view.css` |
| TV-115 | FIXED | Roll20 party ribbons: while the party is split every group has a ribbon on the map (scene, «scena del gruppo», «al Tavolo», «tu», the characters); players see where the others are, and a scene they were not shown stays «un’altra scena». | `session-view.mjs`, `session-view.css` |
| TV-117 | FIXED | Foundry Lock View with calibration: in «Schermo condiviso» the density can come from the screen’s diagonal and resolution, and «Area della mappa mostrata»: tutta la scena / attorno ai personaggi / l’area che vedo ora al Tavolo; the spectator view draws that area at scale. | `session-view.mjs`, `session-view.css` |
| TV-130 | FIXED | Owlbear Ticker / AboveVTT `/timer`: «Conto alla rovescia» button on the DM’s map bar (opens the Session panel at the countdown and focuses it) and palette «Conto alla rovescia (timer)» (timer, conto alla rovescia, cronometro, /timer). | `session-view.mjs` |
| TV-131 | FIXED | Owlbear Count!: «Orologi di progresso» button on the map bar and palette (orologio, clock, count, spicchi); «Fissa ai giocatori» unchanged. | `session-view.mjs` |
| SV-50 | FIXED | D&D Beyond waiting-room tips: the pause overlay shows players «Nell’attesa» with a tip or the rule of the day (our own words on 2024 rules) and «Altro consiglio». | `session-view.mjs`, `session-view.css` |

## Shared edits (additive, made last on freshly read files)

- `campaign.mjs` (P9): import `{ inviteButton, openInvite }`; `overview()` heading gets `inviteButton(ctx)`;
  `bindCampaign` binds `[data-campaign-invite]`. (P9 edited the file meanwhile; the edit was re-applied on the fresh file.)
- `chat.mjs` (P3): import `filterChatMarkup`; `withDays` returns `sep + filterChatMarkup(ctx, itemHTML(ctx, item), item)`.
- `handouts.mjs` (P4): import `filterHandoutMarkup`; `viewerBody` returns its article through it.
- `knowledge.mjs` (P6): no edit needed (see TV-76).

## Contracts for other packages

- `campaign-settings-domain.disclosureOf(state)` → `{enemyHp, creatureName, hitChance, bestiary}`.
- `safety-domain.filterFor(state, role)` → `{enabled, profanity, images, text(v), markup(html), topicsFor(kind, id)}`; `safety-ui.filterChatMarkup(ctx, html, item)`, `filterHandoutMarkup(ctx, id, html)`.
- `campaign-members.openInvite(ctx)`, `inviteButton(ctx)`, `sameCampaignName(typed, name)`, `closedStatus(ctx)`.
- `session-view.sessionRunner(state)`, `runsSession(state, role)`, `playAs(ctx, memberId)`, `setDisplayRegion`, `displayRegion`.
- `campaign-settings-domain`: `PRESETS`, `applyPreset`, `PERMISSIONS`, `setPermission`, `setSceneDefault`, `applySceneDefaults`, `homebrewSources`, `setHomebrewSource`, `dependencyCheck`; rule values `policy.criticals|potions|encumbrance|flanking` for the engines.
- `campaign-data-domain`: `copyableItems`, `previewItemCopy`, `copyItemTo`, `importDependencies`, `missingDependencies`.

## Tests

- `node --test design/blueprint/tests/*.test.mjs` (final run, 7.3 s): **2312 tests, 2308 pass, 4 fail**. The 4
  failures are not P10’s and were already failing at the start (baseline 2267 / 8 fail): `ia-consolidation`
  «every area names where its commands live» (fails on `preparation-section scene-assets`, P7), «Preparation:
  four groups…» (P7), «sheet: D&D Beyond’s seven sections…» (P2) and `w2b2-integration` «the Preparation strip
  ends with one ‘All sections’ quick-jump» (P7). Log: `fix-P10/suite-final.log`.
- New test files: `tests/p10-settings.test.mjs` (preset apply and lock, preset picker UI without census IDs,
  «Cosa vedono i giocatori» and the knowledge setting it writes, permissions with new creatures and the
  player token lock, scene defaults with impact and new scenes, sources per item, «mancante» and
  `dependencyCheck`), `tests/p10-data.test.mjs` (typed-name normalisation, archive and restore of the
  campaign in play with its Table cover, delete after the explicit step and recovery, dependency check on
  JSON import, copy of handout / deck / table / creature / entry to another campaign),
  `tests/p10-table.test.mjs` (filterFor on chat and handouts, the map-bar Stop / Slow down / Raise hand and
  the DM counter, the hand-off runner, spectator area and calibration, countdown / clocks commands,
  «Gioca per», pause tips, Kanka widgets, invite dialog and «Vedi come» on the member row).
- Own tests updated for intended changes: `campaign-settings.test.mjs` (enemy health and names moved to
  «Cosa vedono i giocatori»; permission switches instead of fixed rows; flanking is now a rule),
  `campaign-members.test.mjs` (the running campaign is archivable; «Cedi il ruolo di DM»),
  `campaign-data.test.mjs` (`missing` in the slice seed; running campaign archivable),
  `safety.test.mjs` (filter shape), `session-view.test.mjs` (ribbons on the map).

## Browser checks

- `changes/interview-01/blueprint-checks/p10-governance-journey.js` (new), session `d20-fix-p10`, all steps pass,
  no page errors; images in `fix-P10/journey/`:
  1. DM, Overview heading: «Invita giocatori» → «Crea link» → «Copia link» (3 interactions, «Link copiato»).
  2. Members › row of Livia’s player › «Vedi come» → «Stai vedendo la campagna come Livia» → «Torna al mio utente».
  3. «Cosa vedono i giocatori»: salute «Nascosta», nomi «Solo il DM» + «Applica alle esistenti», probabilità
     «Sempre»; as the player at the Table: no health pill, «Creatura sconosciuta», no «Sentinella».
  4. Player at the Table: Stop in one click on the map bar; DM sees the X-card and «Mani alzate: 1» on the map
     bar with the bell closed; phone 390x844 touch context: Stop is 42x40 px and sends in one tap.
  5. Palette IT «pagina pubblica», «permessi», «timer», «probabilità», «invito», «archivia campagna»,
     «dipendenze», «co-dm», «orologio»; EN (Preferences › language) «public page», «permissions», «timer»,
     «chance», «invite»; the settings read «What players see» in English.
  6. Rules: preset «Tattico» from the picker, dialog lists the changes, badge «Tattico».
  7. Settings › Condivisione: public page on with the Archive page «Il sigillo spezzato», seen as a visitor.
  8. DM pauses; the player reads «Nell’attesa» with a tip or rule of the day.
  9. Dati della campagna: the campaign in play «Archivia…» (note that the Table closes) → Table shows
     «Campagna archiviata» → «Ripristina la campagna» → the Table is back, status active.
- Exploratory checks (`fix-P10/shots/`): every settings tab at 1440x900; Home «Le tue campagne» row with
  «Invita giocatori»; Kanka widgets added to the players’ dashboard and seen by the player (list, calendar);
  profile filter; copy of «Sentinella» to a new campaign «Rovine di Vetro» (dialog, data activity); chat: the DM
  writes a swear word, the player with the filter on reads «m••••», the DM the original.
- Area journeys re-run from scratch copies with images redirected to `fix-P10/regress/<name>/` (the originals
  write into older evidence folders; fixtures copied along). Pass: `campaign-members-journey`,
  `campaign-members-review2-journey`, `campaign-data-journey`, `safety-journey`, `party-journey`,
  `community-journey`, `chat-journey`, and `campaign-settings-journey` with its P2 sheet step («Correggi
  valori», changed by P2) left out of the scratch copy (`fix-P10/regress-settings.log`). Blocked by other
  packages’ changes before reaching P10 code: `session-view-journey` (Preparation «Duplica mappa e note…»,
  P7, after its first HUD step passed) and `handouts-journey` (map-less caption at the Table, P6/P7, after 11
  steps passed).
- Original journeys edited for the intended relabels/moves (reported for the coordinator):
  `campaign-members-journey.js`, `campaign-members-review2-journey.js` («Cedi il ruolo di DM per la sessione…»,
  «ha ceduto il ruolo di DM», «Riprendi il ruolo di DM»), `campaign-settings-journey.js` (enemy health and
  names in «Cosa vedono i giocatori», preset picker, permission switches, the phone step).

## Not fixed / partial, with the reason

- CA-57: combat order, scene activation and Preparation still follow the core DM identity (other packages’ role
  checks); the hand-off covers creatures, sessions and the session tools. Entry from the Table’s presence list not added.
- CA-61: grouping tokens for players and per-group permissions (token multi-selection is P6’s; two demo identities).
- CA-71: DC visibility and failed passive checks: their consumers are in P3/P5/P6 files without a listed shared edit;
  no switch was shown that nothing obeys. `disclosureOf` is ready to carry them.
- CA-75: no dependency check on joining by link.
- CA-88: «Copia in un’altra campagna» from the menus of handouts, entries, tables, decks and Library items (other
  packages’ menus, no registry point); creatures have it in their token menu.
- CA-49 detail: «invita» still lists «Invia Stop anonimo» below «Invita giocatori» (typo tolerance in P9’s palette).
- CA-66 placement: the buttons are on the session-view map bar (a `map-layer`), not a `table-tool`/`table-panel`
  (one tap and always visible on phones were the acceptance).
- The new rules «Colpi critici: massimo più un tiro», «Bere una pozione: Azione», «Fiancheggiamento» are recorded
  and shown to everyone but not computed by the combat engine (P5 can read `policy.<key>`).
