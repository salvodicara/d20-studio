# Fix P8: Library, compendium, homebrew editor, adventures and text embeds

Date: 26/09/2026. Fixer: P8 (Claude, subagent). Branch `codex/interview-01`, working tree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`, nothing committed. Browser
session `d20-fix-p8`; evidence in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P8/`.

## Summary in plain words (IT)

In Biblioteca una sola ricerca trova tutto ciò che si può usare, manuale base compreso
(«Dardo» trova Dardo di fuoco), con un filtro «Origine» e le stelline dei preferiti; ogni
scheda (Disponibili, Campagna…) tiene la sua ricerca. «Crea contenuto» apre un solo editor
strutturato con un solo «Salva»: se manca l’autore, il motivo compare sotto il campo e il
campo prende il fuoco; accanto a «Salva» ci sono «Condividi» e «Abilita in campagna». Una
creatura apre il creatore di mostri, un oggetto magico la Forgia; una copia da una voce SRD
apre lo stesso editor con «Ripristina alla fonte». La nuova versione di un talento arriva a
Livia dalla Biblioteca con le stesse regole dell’editor (Saggezza 13 e l’attività), la scheda
e la campanella avvisano «Aggiornamento disponibile» e il confronto mostra modificatori e
attività. La pagina Homebrew della campagna dice la revisione in gioco, il suo livello di
automazione e tutte le schede che la usano; «Aggiungi contenuto» abilita una revisione
precisa. Nelle note «Inserisci tiro» mette prove, TS, danni, ricompense e tabelle: si tira
dentro la nota. Le classi hanno i privilegi di ogni livello (tabelle SRD EN/IT), ogni voce
ha «Cosa è cambiato». Le avventure portano le voci del Mondo; il DM ha un «Universo»
condiviso tra le campagne e può importare un documento HTML o Markdown; «Crea campagna»
offre «Parti da un’avventura».

## Items

| ID | Result | What changed (market pattern) | Where |
| --- | --- | --- | --- |
| BI-01 | FIXED | DDB My Library «Owned & Shared»: «Disponibili» searches Library content and the SRD 5.2.1 (compendium `searchEntries`) in one field, with an «Origine» filter (Manuale base, Mie creazioni, Condivise con me, Della campagna, Preferiti) and a ☆/★ on every row (collection for Library content, the compendium's private bookmarks for SRD entries). Filters are kept per role and per collection (`d20-library-filters:<role>:<tab>`), so «Dardo» no longer leaks into «Campagna». | `library.mjs`, `library.css`, `compendium.mjs` (`entryBookmarked`, `toggleEntryBookmark`, `bookmarkedEntries`) |
| BI-09 | FIXED | dnd5e Class Summary: the «Privilegi di classe» column is filled for levels 2–20 of all 12 classes from the SRD 5.2.1 class tables, EN and IT, extracted from `SRD_CC_v5.2.1.pdf` / `IT_SRD_CC_v5.2.1.pdf` (two IT cells follow the class's own level heading: cleric 20 «Intervento divino superiore», rogue 20 «Colpo di fortuna»; the IT table cell reads «Pietra della buona fortuna»). A class row in the list opens the full page in one click. | `srd-compendium.mjs` (`CLASS_FEATURE_TABLE`), `compendium.mjs` |
| BI-10 | FIXED | dnd5e @Embed table rolled in place: «Tira sulla tabella» in a note rolls the die, follows a simple subtable, writes one line in the game log and shows «Ultimo tiro» under the table, without leaving the note. Limit: a table without replacement or with variables (seed «Incontri nella palude») keeps the random tables area's own draw, which tracks drawn rows and variables; the note says so. | `compendium.mjs` (`drawTableInPlace`) |
| BI-13 | FIXED | DDB errata per entry: every SRD entry has «Cosa è cambiato» (import revision, date, EN/IT pages, «nessuna errata successiva registrata») and every homebrew entry lists its revisions with the fields each one changed («rev. 2 · cambiati: Modificatori»). | `compendium.mjs`, `compendium.css`, `homebrew-editor.mjs`, `homebrew-editor-domain.mjs` (`changedFields`) |
| BI-15 | FIXED | DDB My Creations, one editor and one save: the Library's «Crea contenuto» runs the command `homebrew-editor.create` (one dialog: kind + starting template); Library «Crea nuova revisione» / «Usa come base» and drafts resumed from the Library open the structured editor too. The editor has one primary «Salva»; «Salva bozza» moved beside «Scarta bozza» and changing section keeps the draft. A refused save names the reason next to the field (`homebrew.mjs` reports `source.label` «Indica l’autore o la fonte…»), opens its section and focuses it. «Condividi con i giocatori» / «Abilita in campagna» beside «Salva» are applied by the same save. A sheet or builder context returns to the Library page that applies the saved revision. The Library's text editor stays for its sheet operations (add, update), imports, and as the fallback when the structured area is not built. | `library.mjs`, `homebrew-editor.mjs`, `homebrew-editor.css`, `homebrew.mjs` |
| BI-16 | FIXED | DDB «Create New Version»: after a Library add or update, the row's structured behaviour follows in the same change (`followLibraryRow`, registered through `homebrew-integration.setStructuredFollow`), exactly as «Applica a una scheda»: Livia's rev. 1 → rev. 2 gives Wisdom 12 → 13 and «Sguardo intimidatorio». The comparison lists the real modifier, activity, choice and prerequisite changes; the Library preview reads the revision's declared automation. The sheet's «Homebrew strutturato» box shows «Aggiornamento disponibile · rev. 1 → rev. 2» with «Rivedi aggiornamento», and the bell has the same notice. Choices that no longer fit are asked again on the sheet. | `homebrew.mjs`, `homebrew-integration.mjs`, `homebrew-editor-domain.mjs`, `homebrew-editor.mjs`, `library.mjs` |
| BI-18 | PARTIAL | Roll20 Modifier Builder / DDB modifiers: targets for each skill («Prove di Percezione»), each ability's checks and saves; modes «Vantaggio» / «Svantaggio» (validated to d20 targets); «Cresce con» fixed, × level, × half level, × Proficiency Bonus (applied to automated values). Not done: Advantage from homebrew is shown on the sheet and declared manual, the roll engine does not apply it by itself; that needs `sheet-plus-domain.testConditions` (P2/P3) to read homebrew modes, a shared edit not assigned to P8. | `homebrew-editor-domain.mjs`, `homebrew-editor.mjs` |
| BI-20 | FIXED | Foundry Active Effects durations with FG anchors as choices: a modifier's «Durata» is always on, N rounds, start/end of your next turn, end of this turn, short or long rest, or until removed. Timed modifiers start when one of the entry's activities is used or with «Attiva effetto» on the sheet, end inside the combat transaction (`combat.observeTurnPhases`) or right after a rest (`rest-completed`), and the sheet shows «Effetto attivo» / «Termina effetto». | `homebrew-editor-domain.mjs`, `homebrew-editor.mjs`, `homebrew-editor.css` |
| BI-23 | FIXED | DDB monster creator from one «Crea › Mostro»: the create dialog's «Mostro · blocco statistiche» opens the stat block creator (templates such as Orsogufo); the compendium copy of a creature carries its stat block. | `homebrew-editor.mjs`, `compendium.mjs` |
| BI-24 | PARTIAL | FG Forge / dnd5e Enchant: reachable from «Crea contenuto › Oggetto magico» and from a weapon or armor page («Forgia una versione magica (+1, +2, +3)…», base preselected). A forged armor's bonus is a structured item modifier, added to AC on the sheet and at the Table while worn (`activeItemModifiers`), declared «Automazione completa». Not done: a forged weapon's +1 to attack and damage stays manual, because the combat engine (`combat.mjs listActions`, P5) builds attacks only from the configured profile and the quarterstaff, not from inventory weapons. | `homebrew.mjs`, `homebrew-editor-domain.mjs`, `homebrew-editor.mjs`, `compendium.mjs` |
| BI-26 | FIXED | FG «copy from module» + Revert: «Crea una copia modificabile» from an SRD spell, creature, item or condition opens the structured editor; the copy keeps its structure (spell activity, stat block, weapon/armor data) and remembers the source, so each changed field and the whole copy have «Ripristina alla fonte». | `compendium.mjs`, `homebrew-editor-domain.mjs` (`structuredFromSrd`), `homebrew-editor.mjs` |
| BI-28 | FIXED | Roll20 list of fully automated books: the campaign Homebrew table shows the revision in play and its automation («rev. 2 · Automazione completa»), every sheet holding a copy whichever path added it («Livia (rev. 2)»); «Fonti e attribuzione» states the SRD source's automation per kind of entry, and each SRD entry states its own. | `homebrew-editor.mjs`, `homebrew-editor-domain.mjs` (`sheetsHolding`, `revisionAutomation`, `campaignContentIds`), `compendium.mjs` |
| BI-40 | FIXED | Alchemy Universe beside in-game content: adventures include World entries (places, factions, events, people, shops) as a package type; they import into the campaign in play private to the DM (a parked campaign shows them as «non disponibile», as the campaign journal serves the campaign in play). Library › Avventure has «Universo»: add an entry, take entries from the campaign World, «Usa in questa campagna» (tracked per campaign), remove. | `adventures.mjs`, `adventures.css` |
| BI-41 | FIXED | Roll20 «Create game with module»: «Crea campagna» offers «Parti da» (Campagna vuota / Parti da un’avventura: …) and runs the command `adventures.create-campaign` (`startCampaignFromAdventure`); an adventure that needs homebrew opens its «Nuova campagna» page with one action per entry and the name kept. Shared edit: `campaign-members.mjs openCreateDialog`. | `adventures.mjs`, `campaign-members.mjs` |
| BI-44 | FIXED | Shard import: «Importa documento…» (Library › Avventure) reads Markdown/text and HTML, including Word «Salva con nome › Pagina Web (.htm)», one entry per heading, into the campaign World or the Universe. Scripts, styles, images and links are read as text only; no new dependency. A .docx file is refused with the Word instruction. | `adventures.mjs` (`parseDocument`, `importDocument`) |
| CA-72 | FIXED | DDB Content Management / FG module Allow with version: the Library «Campagna» tab lists enabled content with «Abilitata: rev. N» and, for the DM, «Aggiungi contenuto alla campagna…»; the campaign Homebrew page has «Aggiungi contenuto…» (exact revision, shared with the players in the same step) and names the enabled revision; the editor's badge reads «Abilitata: rev. 1». | `library.mjs`, `homebrew-editor.mjs` |
| CA-26 | FIXED | dnd5e enrichers and Quest Portal buttons: `@Embed[damage:2d6+3:fire]` renders a damage roll button (rolled in place, «Ultimo tiro» under it, logged) and `@Embed[reward:xp:100]` a reward card whose «Assegna al gruppo» (DM) records the reward in the game log. `text-embeds.mjs` exports `openEmbedPicker` (check, save, ability check, damage, reward, random table) and `insertEmbed`. Shared edits: `campaign.mjs` (writing tools «Inserisci tiro…») and `journal-plus.mjs` (block toolbar «Inserisci tiro…»; Archive pages now render the markers). Limit: a reward is recorded, it does not change sheets' coins or experience. | `text-embeds.mjs`, `compendium.mjs`, `campaign.mjs`, `journal-plus.mjs` |

## Acceptance checks

- `node --test design/blueprint/tests/*.test.mjs`: see «Tests». New tests:
  `tests/p8-library-homebrew.test.mjs` (Library revision apply equals editor apply: Wisdom
  12 → 13 plus the activity; automation badge from the applied revision; campaign rows and
  «Aggiungi contenuto»; one save with the author reason beside the field; creature → stat
  block; SRD copy revert; forged armor AC; «Disponibili» search), `tests/p8-modifiers.test.mjs`,
  `tests/p8-embeds.test.mjs`, `tests/p8-compendium.test.mjs`, `tests/p8-adventures.test.mjs`
  and the shared `tests/p8-harness.mjs`.
- Running app, `changes/interview-01/blueprint-checks/p8-library-journey.js` (passes):
  «Dardo» in «Disponibili» finds Dardo di fuoco (SRD) and «Campagna» keeps its own search; a
  DM feat is created, shared and enabled with one «Salva», the missing «Autore o fonte»
  reason beside the field; Livia gets rev. 2 through «Rivedi aggiornamento» → Saggezza 13
  and «Sguardo intimidatorio»; the campaign Homebrew row reads «rev. 2 · Automazione
  completa», «Livia (rev. 2)», «Abilitata: rev. 1, 2»; a World entry gets «Inserisci tiro»
  damage 2d6 fire and the rumours table: both roll inside the note, the table adds one log
  line; phone 390×844 with touch in English: «Insert roll…» damage 1d8 cold renders
  «Damage 1d8 cold», no horizontal overflow. Screenshots `j01`–`j06`.
- Also checked in the browser (evidence `p8-*.png`): favourites filter and ★; create dialog
  kinds; monster creator from «Crea contenuto»; Forge opened from Chain Mail with the base
  selected; Fire Bolt copy with «Ripristina alla fonte»; Wizard page level 18 «Maestria
  negli incantesimi»; «Cosa è cambiato» on Fire Bolt; SRD automation table; document import
  (Markdown to the Universe, HTML to the World), «Usa in questa campagna»; «Crea campagna ›
  Parti da un’avventura» (the sample adventure needs homebrew: its page opens with one action
  per entry).

## Tests

`node --test design/blueprint/tests/*.test.mjs` (26/09, end of the P8 work): 2305 tests, 2301
pass, 4 fail. None of the 4 is in a P8 area or caused by a P8 change:
`ia-consolidation` «every area names where its commands live» and «Preparation: four groups…»
and `w2b2-integration` «the Preparation strip ends with one 'All sections' quick-jump» expect
the `scene-assets` Preparation section, which P7 removed («Scene avanzate» merged into the
scene editor); `ia-consolidation` «sheet: D&D Beyond's seven sections» lists P2's new
`sheet-plus-notes` tab (it also failed at the start of this work). During the work,
`campaign-settings` (P10 rule messages), `campaign-members` «Review 2 P1/P3» (P10 handover
label) and `integrations` (P9) failed and were not touched by P8.

P8 tests added: `p8-library-homebrew` (6), `p8-modifiers` (2), `p8-embeds` (3),
`p8-compendium` (3), `p8-adventures` (4), shared `p8-harness.mjs`. Owned tests changed:
`compendium.test.mjs` (the creature copy note now says the copy opens in the monster creator).

## Journeys

- New: `changes/interview-01/blueprint-checks/p8-library-journey.js` passes (desktop IT,
  phone 390×844 touch EN), evidence `j01`–`j06`.
- Existing journeys of the touched areas were run as copies whose evidence paths point into
  `fix-P8/rerun/` (old evidence untouched; a trailing `;`, which this CLI rejects, removed
  from the copy): `adventures-journey` passes; `campaign-world-journey` passes;
  `library-spell-recovery-journey` passes.
- Superseded by the intended P8 changes (for the coordinator, not edited):
  - `library-journey`, `library-builder-journey`, `library-mobile-journey`,
    `library-import-recovery-journey` (and `library-files-journey`, which needs
    `library-journey`'s fixture) create content through the Library's text editor
    (`#dialog [name=type]`, `[data-library-path=…]`, «Salva contenuto revisionato»). BI-15 makes
    «Crea contenuto» open the one structured editor; the new flow is in
    `p8-library-journey.js`.
  - `compendium-journey`, section «Library copy» (Scudo and the wolf through the text editor,
    note «blocco completo»): BI-26 opens the structured editor. A copy without that section
    passes every earlier step (browse, entries, sheet flow, reader, class page, legal page)
    and stops later at the note embed preview, which is inside the note editor's folded
    preview (`campaign.mjs`/`campaign.css` note layout, not P8).
  - `homebrew-editor-review-journey`, stale-entry section («AC changed before the effects
    followed», «i suoi effetti sono ancora quelli della precedente», «Aggiorna gli effetti»):
    BI-16 makes the effects follow the Library update in the same change, so Livia's AC is 14
    at once.
- Not caused by P8: `homebrew-editor-journey` stops when the DM's click on the map no longer
  moves the Sentinella before combat (it stays at 620,250, out of range of Livia's activity):
  Table movement belongs to P6. `campaign-members-journey` passes the create dialog and stops
  at «Affida le creature per questa sessione…» (P10 handover wording).

## Shared edits (minimal, additive)

- `campaign-members.mjs` `openCreateDialog`: «Parti da» select and a call to the command
  `adventures.create-campaign` (BI-41).
- `campaign.mjs`: import of `openEmbedPicker` / `insertEmbed`, the «Inserisci tiro…» button in
  `writingTools` and its binding (CA-26). The button has no icon: some tests' contexts have
  no `ctx.icon`.
- `journal-plus.mjs`: import from `text-embeds.mjs`, `renderBlocks` renders @Embed markers
  around the page's own [[links]], `bindCommon` binds them, and the block toolbar's
  «Inserisci tiro…» (CA-26).

## Not fixed or partly fixed

- BI-18: Advantage/Disadvantage from homebrew is shown and declared manual; making the roll
  engine apply it needs `sheet-plus-domain.testConditions` (P2/P3) to read homebrew roll modes.
- BI-24: a forged weapon's attack and damage bonus stays manual until the combat engine
  (`combat.mjs listActions`, P5) builds attacks from inventory weapons.
- BI-10 limit: tables without replacement or with variables keep their own draw panel.
- BI-40 limit: World entries import into the campaign in play; a parked or newly created
  campaign receives them when it is in play (the import plan says «non disponibile»).
- CA-26 limit: «Assegna al gruppo» records the reward in the game log; it does not change
  coins or experience on the sheets.
