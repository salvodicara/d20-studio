# Fix P9: campaign journal and world, sessions and scheduling, search and quick create, preferences, integrations and assistant

Date: 25–26/09/2026. Fixer: P9 (Claude, subagent). Branch `codex/interview-01`, working tree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`, nothing committed. Browser
session `d20-fix-p9`; evidence in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P9/` (reruns of
older journeys write into its `rerun/` folder, never over earlier evidence).

## Summary in plain words (IT)

Diario, Mondo e appunti usano adesso lo stesso motore dell’Archivio. Scrivendo @ o [[ compare
l’elenco di voci, pagine dell’archivio, schede e regole che puoi leggere, e Invio mette il
collegamento. Ogni voce ha i collegamenti in entrata con il loro contesto, le menzioni non
collegate da confermare, i blocchi segreti con «Rivela…» uno per uno, le voci annidate da un
[[nome]] ancora da creare e «Sposta la selezione in una nuova voce». «Nuova voce del mondo» offre
Persona, Luogo, Fazione, Negozio, Evento, Elenco e «Da un modello o kit…»; ogni voce si salva
come modello. Le schede aperte, Indietro/Avanti e i segnalibri valgono per tutto il diario, e le
viste salvate (tabella o schede) mettono insieme Mondo e Archivio. «Cronologia» è nell’intestazione
di ogni voce, con le differenze fra le versioni e il segno «Ripristinata da…».

Un appunto si salva con un solo pulsante: la bozza si salva da sola e lo dice, l’errore falso
non compare più, e «Elimina» è sulla voce, nell’elenco e nel menu del clic destro. Quando non si
può salvare, accanto al pulsante c’è il perché e cosa fare.

Nelle Sessioni la raccolta delle disponibilità mostra la tabella di chi può, i totali, la data
migliore evidenziata, «Se necessario» e i nomi dei personaggi; le date sono «Proposta»; chi ha
detto «Disponibile» risulta già presente nella sessione confermata. Ogni sessione e la carta
«Prossimo appuntamento» in Inizio hanno «Aggiungi al calendario» (file .ics o link webcal) e la
campanella dei promemoria, che sono le stesse scelte di Preferenze › Notifiche (ora nella sua
navigazione). Il resoconto ha «Prepara bozza automatica» con presenze, durata, scene ed eventi di
gioco; l’assistente non riassume più impostazioni e integrazioni.

La ricerca trova i comandi anche per le parole della loro descrizione (PE, permessi, promemoria,
cronologia, tema, daltonismo, lingua…), raggruppa i risultati per tipo con la corrispondenza
esatta in cima, non «inventa» più per tre lettere, e la categoria è un’etichetta che si toglie
con × e non resta attaccata. Con ⌘K mentre scrivi inserisce un collegamento invece di cambiare
pagina. La creazione rapida (N) crea ogni tipo e il suo avviso ha «Apri». Al Tavolo l’icona degli
appunti (o J) apre un appunto rapido senza uscire. Discord e i token API si raggiungono dalla
ricerca e in due passi, senza codici interni in pagina. Un ritardo dei suggerimenti è in
Preferenze e sul telefono la pressione lunga mostra il suggerimento.

## Items

| ID | Result | What changed (market pattern) | Where |
| --- | --- | --- | --- |
| CA-12 | FIXED | One link syntax: `[[Title]]` resolves for the reader to an Archive page, a Journal/World entry (or own note), a visible character or an SRD rule; unreadable targets stay plain text (Roll20 `[Name]` respecting permissions). Typing `@` or `[[` in any Journal/World/notes editor (body and sections) and in the Archive block editor opens a listbox (arrows, Enter/Tab, Esc, tap) over every readable title, Archive pages included, with «Collega … (da creare)» for a new title (Kanka @mentions). `[[/…]]` is left to text embeds (P8 enrichers). Root fix: `journal-plus.mjs` now holds the engine for both stores (`linkTargets`, `resolveLink`, `linkSuggestions`, `linkedText`, `typedLink`/`completeLink`, `bindLinkSuggest`) and `campaign.mjs` renders entries with it. | `journal-plus.mjs`, `campaign.mjs`, `ui.mjs insertAtCaret` |
| CA-13 | FIXED | A section the author keeps narrower than the entry is a secret block: dashed purple frame, «Segreto · visibile solo ai DM / solo a te», «Rivela…» per block (whole group or chosen people) and «Nascondi di nuovo»; readers see «Rivelato». «Aggiungi blocco segreto» sits under the text. Each reveal is a new revision, so earlier versions never show the text (LegendKeeper `/secret`, Foundry secret block «Reveal»). | `campaign-content.mjs setCampaignSectionAccess`, `campaign.mjs`, `campaign.css` |
| CA-14 | FIXED | «Collegamenti in entrata (n)» with context snippets on every entry and on Archive pages, from both stores (text links, link refs, elements, nested parents) (Obsidian backlinks). | `journal-plus.mjs allBacklinks`, `journalLinksPanel` |
| CA-15 | FIXED | «Menzioni non collegate» on every entry for whoever can edit the source; «Collega» writes the link as a new revision (entries) or in the block (Archive), «Ignora» hides it; the Archive's suggestion setting governs both (Obsidian unlinked mentions, LegendKeeper auto-link as a proposal). | `journal-plus.mjs allUnlinkedMentions`, `campaign-content.mjs editCampaignText` |
| CA-16 | FIXED | An unresolved `[[nome]]` in an entry its editor may extend is a dashed link: «Crea la voce annidata» (type chosen, readers inherited from the parent unless secret) with a breadcrumb and «Voci annidate»; «Sposta la selezione in una nuova voce» under every text field of the entry editor (the Archive editor already had it) (LegendKeeper nesting and Cut-to-New-Page). | `journal-plus.mjs openCreateEntry`, `cutSelectionToEntry`; `campaign-content.mjs createCampaignEntryNow`, `parentId` |
| CA-17 | FIXED | Templates owned by their author (shareable by the DM): «Salva come modello» on entries (menu «Altro») and Archive pages; «Da un modello o kit…» in Mondo and Diario; «Kit o modello» + «Aggiungi i suoi campi» in the editor (fields become `Label: ` lines, DM-only kit fields a secret section); «Parti da un modello» in the Archive's new page dialog; commands «Nuova voce da un modello o kit» and «Salva questa voce come modello» (synonyms modello, template) (Kanka Property Kits, World Anvil templates). | `campaign-content.mjs` templates, `journal-plus.mjs`, `campaign.mjs`, `quests.mjs` |
| CA-19 | FIXED | World types extended to Monk's set (person, place, faction, shop, event, list/checklist, other). Mondo: «Nuova voce del mondo» (fixes «Nuovo voce») plus «Scegli il tipo…» with every type; the type sits next to the title; checklist lines `- [ ]` tick in the entry. Quick create offers the same types. | `campaign-content.mjs WORLD_TYPES`, `campaign.mjs`, `command-palette.mjs` |
| CA-20 | FIXED | The Archive's tabs now hold `e:<entry>` keys too: the tab bar, Back/Forward, «Apri in una nuova scheda» and bookmarks show on Diario/Mondo lists and entries and cross to the Archive and back (Monk's browser-like tabs). | `journal-plus.mjs journalTabsHTML`, `bindJournalTabs`, `visitEntry` |
| CA-24 | FIXED | Saved views run over Archive pages and entries (sources Tutto / Mondo / Diario / each type); entries' `Label: value` lines are columns; a views strip («Tutte le voci», saved views, «Nuova vista») in Mondo and Diario (Obsidian Bases, Notion galleries, Kanka lists). | `journal-plus.mjs runView`, `campaign.mjs viewsStrip` |
| CA-82 | FIXED | «Cronologia (n)» in every entry header opens the versions with what changed (line diff), markers «Ripristinata da …», «Sezione rivelata», «Collegamento aggiunto», «Leggi questa versione» and «Ripristina» in one confirmed step; command «Cronologia della voce» (Kanka «View changes»). | `campaign-content.mjs diffText`, `revisionText`, `restoreCampaignVersion`; `campaign.mjs` |
| SV-05 | FIXED | One save: «Salva contenuto per questi destinatari» saves the draft and applies it in one press; the private draft autosaves after 1.2 s keeping field, cursor and scroll, with «Bozza privata salvata alle hh:mm»; preview errors only after a save attempt (no false «Inserisci un titolo o del testo»); a private note's preview is folded. «Elimina…» on the entry («Altro»), in each list row and in the right-click/long-press menu (Apri, Apri in una nuova scheda, Modifica, Cronologia, Elimina). The button names were kept so other packages' journeys still find them. | `campaign.mjs`, `campaign-content.mjs deleteCampaignEntry` |
| SV-37 | FIXED (P9 scope) | Reasons with cause and remedy next to the save button (text missing, conflict, campaign needed, link gone, permission, member gone, parent gone); a blocked save is disabled with its reason (`aria-describedby`); autosave failures say what to do; «Scarica il feed (.ics)» disabled with «Nessuna sessione in programma: fissane una in Sessioni.» (Roll20 errors naming cause and fix). Other packages' buttons were not audited here. | `campaign.mjs`, `integrations.mjs` |
| CA-43 | FIXED | Poll heatmap (people × dates, ✓/~/✗/–), totals row, best date highlighted («Migliore», «Data migliore», confirm button primary), «Se necessario» instead of «Forse», dates labelled «Proposta», participants by name («Livia, Mira (Giocatore)» / «DM»); confirming copies the answers into the session so «Disponibile» shows as «Partecipa (dalla raccolta disponibilità)» until the date moves (Rallly totals, when2meet heatmap). | `campaign-sessions.mjs pollSummary`, confirm; `sessions-plus-domain.mjs answerOf`; `campaign.mjs`; `sessions-plus.mjs` |
| CA-47 | FIXED | Each upcoming session card: «Aggiungi al calendario» (the session's .ics or the personal webcal link, created on the spot) and a reminder bell showing the chosen leads; the bell writes the same `notifications.*` settings as Preferenze › Notifiche and Integrazioni (one setting, not duplicated). Preferences' jump list now names every settings group, «Notifiche» included. Commands «Promemoria delle sessioni» and «Aggiungi la prossima sessione al calendario» (synonyms promemoria, calendario, iCal…) and settings commands (Sesh, Roll20 «Next Game»). | `integrations.mjs` (campaign-section `integrations.session`, dialogs), `preferences.mjs` |
| CA-21 | FIXED (Journal side) | «Prepara bozza automatica» in the recap editor, and «Scrivi resoconto» on a session opens already filled: attendance (roll call, Table presence or RSVPs), duration and pauses, scenes, play events of the evening; administrative events excluded (Quest Portal Session Stories). Ending play at the Table already writes the story draft and offers «Apri la bozza» in P10's `session-view.mjs` (unchanged here). | `campaign-sessions.mjs autoRecap`, `isPlayEvent`; `campaign.mjs` |
| SV-39 | FIXED | «Aggiungi al calendario» on every session card (above) and on Home's «Prossimo appuntamento» through the service `integrations-add-to-calendar` (shared edit in P1's `home-ui.mjs renderAppointment`, one button) (Sesh `/link`, StartPlaying «Add to calendar»). | `integrations.mjs`, `home-ui.mjs` |
| SV-02 | FIXED | Commands match their description words and optional `keywords` (registry `POINTS.command` accepts `keywords`: strings or `{it,en}`); a short query must be a whole word of a description. ⌘K while writing (Quick Insert): «Stai scrivendo: Invio inserisce un collegamento…», Enter puts `[[Title]]` at the cursor, commands still run. Settings indexed as commands (tema, cambia tema, dimensione del testo, lingua, daltonismo/contrasto, dislessia, movimento, volume, unità, tooltip, notifiche/promemoria, apri le preferenze) opening Preferences on the control. Command subtitles use interface words (a place name map) instead of build titles (Foundry Quick Insert, Alchemy OmniSearch). | `registry.mjs`, `command-palette.mjs`, `preferences.mjs` |
| SV-03 | FIXED | Results grouped by type with «Corrispondenza esatta» first; text inside a word only from five letters and typos keep the first letter («ical», «api» no longer drift; «palla di fucoo» still works); one- and two-letter prefixes rank below whole words; the category is a removable chip (× or Backspace), never remembered; an empty filtered search offers «Cerca … in tutte le categorie»; overlapping providers merged into core categories (Missioni e archivio, Mondo with map/calendar, Regole with table rules, Scene with folders, Pagine e aiuto) (DDB/Alchemy grouped results, Quick Insert chips). | `command-palette.mjs` |
| SV-04 | FIXED | Quick create (N) groups every type: note, person, place, faction, shop, event, checklist, quest, recap (created at once, private) and item, monster, spell (homebrew draft named and opened), material (DM: handout editor with the title), session (organizer: session draft opened), character (builder opened with the name filled). The notice has «Apri» (hover/focus keeps it) (Kanka quick creator «Crea e apri»). | `command-palette.mjs`, `ui.mjs actionToast` |
| SV-22 | FIXED | Preferences › Lettura e colori › «Ritardo dei suggerimenti (tooltip)»: «Come il browser (predefinito)», Subito, 0,25 s, 0,5 s, 1 s. A chosen delay shows the app's tooltip (lent from `title`, given back after) on hover and keyboard focus; by touch a long press always shows it (the map keeps its own long press). The browser default keeps existing hover titles for everyone else (BG3 adjustable tooltip delay). | `ui.mjs installTooltips`, `preferences-domain.mjs`, `preferences.mjs`, `registry.css` |
| CA-11 | FIXED | Service `notes` replaced: at the Table the header «Appunti personali» opens «Appunto rapido» over the map (title optional, «Salva appunto», Table stays); J opens it anywhere; elsewhere the notes page opens with the same return as before (D&D Beyond Quick Jot). | `command-palette.mjs` |
| SV-38 | PARTIAL | «Discord: inoltra tiri e avvisi a un canale» from the palette (discord, webhook, canale…) opens Integrazioni › Discord; census and gap IDs removed from the integrations page (pattern lines keep the words). Not done: a link inside campaign «Impostazioni» — that page is P10's `campaign-settings.mjs`, not a listed shared edit (coordinator: one button there calling `ctx.navigate("campaign", {tab: "integrations", id: "discord"})`). | `integrations.mjs` |
| SV-41 | FIXED | «API e webhook» is always listed; «Crea token» works with an optional name; with the module off the DM confirms «Accendi e crea il token» and gets the token in the same step; a player is told only the DM can switch it on; command «Crea un token API» (Foundry/Kanka token page). | `integrations.mjs` |
| SV-44 | FIXED | Settings, preferences, integrations, account, drafts and similar events are never recap sources, moments or entities; a period with none says «Nessun evento di gioco…» (refusal) and a summary with only Table steps lists them instead of staying empty (Quest Portal recaps from play events). | `assistant-domain.mjs`, `campaign-sessions.mjs isPlayEvent` |

## Shared edit

- `home-ui.mjs` (P1) `renderAppointment`: one button «Aggiungi al calendario» (`data-service="integrations-add-to-calendar"`) when the next session belongs to the campaign in play and the integrations service is available. Made last, with `Edit` on the freshly read function.

## Tests

- New: `tests/p9-palette.test.mjs` (keywords in the registry, command matched by description synonym and keywords, settings commands, subtitles, typo tightening, grouping with exact match first, chip and unfilter, merged categories, Quick Insert and `insertAtCaret`), `tests/p9-journal.test.mjs` (@/[[ suggestion and link insertion, one link syntax with permissions, secret reveal per section, backlinks and unlinked mentions, nested entries, typed World entries, templates, views over entries, tabs over entries, delete, diff and restore marker), `tests/p9-sessions.test.mjs` (availability totals and best date, RSVP carry-over, play vs administrative events, automatic recap draft, assistant recap without administrative events).
- Updated (own files): `command-palette.test.mjs` (mid-word match from five letters; category not sticky), `campaign-ui.test.mjs` (history dialog, one-step restore with marker; poll «Proposal»), `integrations.test.mjs` (API tab always reachable).
- Final run (`node --test design/blueprint/tests/*.test.mjs`, 9.5 s): 2312 tests, 2308 pass, 4 fail.
  The 4 failures are outside P9 and were already present during this work: `ia-consolidation.test.mjs`
  «every area names where its commands live» (preparation-section `scene-assets`, P7), «Preparation: four
  groups…» (P7), «sheet: D&D Beyond's seven sections…» (P2), `w2b2-integration.test.mjs` «the Preparation
  strip ends with one 'All sections' quick-jump» (P7). Baseline at the start of P9: 2230 pass, 1 fail.

## Browser (playwright-cli, session `d20-fix-p9`, 1440×900 and 390×844 touch, IT and EN)

New journeys in `changes/interview-01/blueprint-checks/`: `p9-journal-journey.js`, `p9-sessions-journey.js`,
`p9-palette-journey.js`, `p9-services-journey.js`. Updated own journeys to the new behaviour:
`campaign-notes-journey.js` (Table notes open the jot; history dialog), `campaign-sharing-journey.js`
(versions checked in «Cronologia»), `command-palette-journey.js` (action notice; category not sticky),
`integrations-journey.js` (API tab listed), `quests-journey.js` (one links panel), `assistant-journey.js`
(text read from the editor), `assistant-review-fixes.js` («Nuova voce del mondo»).

Final regression, one journey per command in the same session (all pass): `p9-journal-journey`,
`p9-sessions-journey`, `p9-palette-journey`, `p9-services-journey`, `campaign-world-journey`,
`campaign-notes-journey`, `campaign-sharing-journey`, `campaign-mobile-journey`,
`campaign-integration-journey`, `campaign-sessions-journey`, `command-palette-journey`,
`integrations-journey`, `sessions-plus-journey`, `quests-journey`, `quests-review-journey`,
`relations-graph-journey`, `assistant-journey`, `assistant-review-fixes` (its check now looks for an
applied note instead of the old status words, because the draft saves itself),
`assistant-review-fixes-2`.

Screenshots: `j01…j05` (links, backlinks, secret block, history diff, world view), `s01…s04`
(heatmap, add to calendar, recap draft, phone), `p01…p03` (grouped palette, phone palette and
jot), `v01…v02` (API token, long-press tooltip).

## For the coordinator (outside P9)

- `p1-cross-tab-journey.js` (P1) clicks «Nuovo voce del mondo»: the label is now «Nuova voce del mondo» (CA-19 asked for the fix).
- SV-38: a link from campaign «Impostazioni» to Integrazioni › Discord needs a small edit in P10's `campaign-settings.mjs`.
- P8 (CA-26): roll enrichers written as `[[/…]]` are left untouched by the link syntax and reach the text embeds.
- Failures seen while rerunning journeys that are not P9's: `preferences-journey.js` expects an «iniziativa» gate that P5 changed and finds a 390 px overflow in P4's inventory (`invp-cols`); `registry-smoke-journey.js` stops at P7's Preparation «Scene» button and at a fixture probe in `extensions.mjs` (changed by another package); `home-journey.js` (P1) stops at its own first heading. The P9 steps of those journeys pass.
