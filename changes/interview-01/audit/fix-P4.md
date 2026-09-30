# Fix P4: inventory, spells, loot and merchants, rests, travel and camp, generators, handouts and tables

Date: 26/09/2026. Fixer: P4 (Claude, subagent). Branch `codex/interview-01`, working tree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`, nothing committed. Browser
session `d20-fix-p4`; evidence in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P4/`.

## Summary in plain words (IT)

Nel negozio «Compra» mostra subito il carrello (barra «Nel carrello: 3 · Vedi carrello», il
segno sulla riga) e il giocatore può proporre un prezzo con una prova di Persuasione: il DM la
riceve nella campanella e accetta o rifiuta. «Aggiungi oggetto» nell'inventario apre un catalogo
con ricerca (SRD, homebrew attivato, scheda «Personalizzato»): un pugnale entra in tre gesti;
anche la Biblioteca aperta per una scheda ha «Aggiungi» su ogni riga. «Equipaggia» compare solo
su ciò che si impugna o si indossa; l'inventario si ordina e sceglie le colonne; «Cambia set»
ripone da solo ciò che blocca (lo scudo) e lo riprende al ritorno. La scorta è diventata
«Inventario del gruppo» con i ritratti di chi ha equipaggiato; lì e cercando «PE» il DM trova
«Assegna PE e monete», e alla fine di un incontro la campanella glielo propone. Le valute della
campagna si trovano cercando «valuta». Il riposo breve mostra i Dadi Vita dall'inizio, il DM
«Completa per tutti», il riepilogo dice i PF presi dai Dadi Vita; il riposo del DM parte con
tutto il gruppo; dopo il riposo lungo si propongono magie preparate e maestrie. Le capacità «si
ricarica all'alba» tornano quando il tempo passa l'alba. Il campo parte all'ora scelta (20:00) e
«Controlla la guardia» tira Percezione e l'eventuale incontro. «Genera…» ha il Tesoro per GS che
va nel bottino, il dungeon generato arriva arredato. La pedina a più facce apre subito la scelta
della tabella e il menu della pedina ha «Lati…». «Rivela aspetto» preseleziona l'immagine della
creatura e la condivide nello stesso passo. La bacchetta si usa dal Tavolo con il bersaglio,
anche dalla barra rapida («Usa un oggetto»).

## Items

| ID     | Result  | What changed (market pattern)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Where                                                                                     |
| ------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| PR-56  | FIXED   | DDB/BG3 immediate cart. Root cause: the cart was committed and visible, but rendered far below the fold of the Table drawer. A sticky `role=status` bar under the wares («Nel carrello: N · Vedi carrello», `data-loot-cart-bar`) and an «in carrello» badge on the row appear at once; «Vedi carrello» scrolls to it; a cart opened for another of the player's characters is listed too.                                                                                                                                                                                  | `merchants.mjs`, `loot.css`                                                               |
| TV-144 | FIXED   | BG3 haggling / GMG cart with DM price: «Proponi un prezzo…» (amount, note, optional Persuasion/Deception/Intimidation roll, digital or physical) → `proposeOffer`; DM bell notification «Offerta di X a Y» opens the shop; `answerOffer` accept/refuse with reason; any cart change voids the offer (`voidPrice`); checkout at the agreed price. Buyback already existed.                                                                                                                                                                                                   | `merchants.mjs`, `loot.mjs`, `loot.css`                                                   |
| PG-62  | FIXED   | DDB «+ Add Items»: «Aggiungi oggetto» opens a searchable catalogue (SRD plus campaign-enabled homebrew through the Library review) with «Aggiungi» per row, group filter, Enter adds the top match, the dialog stays open; «Personalizzato» tab; `isEquippable` limits «Equipaggia». Shared edit `compendium.mjs` (P8, additive): result rows get «Aggiungi» while «Scegli per <personaggio>» is active (opens the existing add-to-sheet confirmation); grid column rule in `inventory-plus.css`. Browser: dagger added to Livia in 3 interactions (IT 1440, EN 390 touch). | `inventory-plus.mjs`, `inventory-plus-domain.mjs`, `inventory-plus.css`, `compendium.mjs` |
| PG-64  | FIXED   | dnd5e columns + BG3 sort: sort by manual/name/weight/value/rarity, column chips (quantity, weight, value, charges), remembered per device.                                                                                                                                                                                                                                                                                                                                                                                                                                  | `inventory-plus.mjs`, `inventory-plus-domain.mjs`, `inventory-plus.css`                   |
| PG-72  | FIXED   | DDB campaign Party Inventory: the campaign «loot» section is now «Inventario del gruppo» (kept in the «Gioco» group because the campaign rail group is capped at seven by the IA rule), crumb back to «Gruppo», «Agisci come», holders with portraits, «equipaggiato da» badge with the holder's portrait.                                                                                                                                                                                                                                                                  | `party-stash.mjs`, `loot.mjs`, `loot.css`                                                 |
| PG-74  | FIXED   | BG3 one-button swap: `swapWeaponSet` stows hand blockers (Doran's shield), remembers them per set and takes them back on return; the log line names them; no refusal points to «Cambia set».                                                                                                                                                                                                                                                                                                                                                                                | `inventory-plus-domain.mjs`, `inventory-plus.mjs`                                         |
| PG-75  | FIXED   | Foundry dnd5e currency configuration: DM campaign section «Valute e monete della campagna» (group manage) + palette command (valuta, moneta, monete); custom coins in the container coins dialog, weighed in the container.                                                                                                                                                                                                                                                                                                                                                 | `inventory-plus.mjs`, `inventory-plus-domain.mjs`                                         |
| PG-17  | PARTIAL | DDB Manage Experience / Foundry /award / FG award from the combat tracker: command «Assegna PE e monete» (synonyms PE, punti esperienza, esperienza, ricompense, monete), button on «Inventario del gruppo», and after an encounter ends the DM's bell offers the award at the Table, prefilled with the defeated creatures and the SRD XP of known stat blocks. **Not done:** a button on the Gruppo page itself — it is `party.mjs` (P10) with no registry hook; one link there is needed (see coordinator notes).                                                        | `loot.mjs`                                                                                |
| PG-35  | FIXED   | dnd5e dawn recovery: the «Ricarica all'alba» re-render already worked (verified: it appears as soon as the clock passes 06:00); added dawn recovery for features: `rest-time.mjs` `dawnRows` restores features with `recovery: "dawn"` and profile recoveries with trigger `"dawn"` when time passes a dawn (preview and apply). Contract for P2 PG-34: mark a feature `recovery = "dawn"`.                                                                                                                                                                                 | `rest-time.mjs`                                                                           |
| PG-80  | FIXED   | Shard post-rest reselection / BG3: after a Long Rest the rest detail opens with «Riposo lungo concluso» for each character: «Cambia magie preparate» (preparation window) and the reselectable choices (Weapon Mastery) with save/keep.                                                                                                                                                                                                                                                                                                                                     | `rest-ui.mjs`, `rest-ui.css`, `spells-plus.mjs` (`openPreparedSpells`)                    |
| PG-81  | FIXED   | DDB Short Rest with clickable Hit Dice / Rest Recovery summary: the Hit Dice line shows from the start; personal quick short rest; in a campaign the player sees «il DM fa avanzare il tempo»; the summary reads «PF dai Dadi Vita: +N (a → b)».                                                                                                                                                                                                                                                                                                                            | `rest-ui.mjs`, `rest-ui.css`                                                              |
| CA-77  | FIXED   | dnd5e rest request: the DM's group rest preselects the whole party («Tutto il gruppo»); running rests stay on top; «Completa per tutti» advances missing time and completes; bell notices: DM «in attesa del tempo», player «Dadi Vita» request, long-rest choices. 390×844 touch verified.                                                                                                                                                                                                                                                                                 | `rest-ui.mjs`, `travel.mjs` (bell + route), `rest-ui.css`                                 |
| TV-133 | FIXED   | WotR camp / FG watch order: camp hour (default 20:00) sets the watch plan; «Controlla la guardia» runs Perception (passive or rolled) with an optional d6 encounter roll; the log keeps «Turno N (HH:MM–HH:MM): tranquillo/falso allarme · Percezione passiva: …».                                                                                                                                                                                                                                                                                                          | `camp.mjs`, `travel.mjs`, `exploration.css`                                               |
| PR-17  | FIXED   | Dungeon Alchemist auto-furnish: rooms get props by content (seeded, reproducible, «Arreda le stanze» option), shown on the preview; «Apri come bozza di scena» → «Salva preparazione» adds them as scene objects (scene-assets format).                                                                                                                                                                                                                                                                                                                                     | `generators.mjs`, `generators-domain.mjs`, `generators.css`                               |
| PR-55  | FIXED   | AideDD/donjon treasure by CR: «Genera…» › Tesoro (individual or hoard, CR, seed) → «Metti nel bottino» creates a hidden Treasure parcel on the active scene and opens it in Preparation › Tesori; command synonyms bottino, tesoro, gruzzolo, ricompensa; also «Genera tesoro per GS…» in Tesori. The coin/magic bands are an authored table labelled «modello AideDD/donjon, non SRD»; item values cite SRD 5.2.1 magic item prices. The sample catalogue has no very rare/legendary items: those draws fall back and are flagged.                                         | `generators-domain.mjs`, `generators.mjs`, `loot.mjs`                                     |
| PR-62  | FIXED   | Roll20 multi-sided token: the tool opens the table picker first (the choice arms the map click); the token menu (Aspetto) offers «Lati (pedina a più facce)…» to switch a creature's images.                                                                                                                                                                                                                                                                                                                                                                                | `random-tables.mjs`                                                                       |
| TV-109 | FIXED   | DDB «Reveal»: «Rivela aspetto» preselects the creature's own art (even a personal image) and shares it inline with prefilled provenance in one confirm, without leaving the Table.                                                                                                                                                                                                                                                                                                                                                                                          | `handouts.mjs`, `handouts-domain.mjs`, `handouts.css`                                     |
| TV-70  | FIXED   | dnd5e Activities + BG3 hotbar items: usable items listed in the Table's Creature tab («Armi, munizioni e oggetti») and used with targets (Magic Missile darts split among targets; a player's damage becomes a DM proposal, the DM's applies). Shared edit `quickbar.mjs` (P5, additive): a bag button «Usa un oggetto (N)» in the quick bar opens the item's use (inventory-plus export `usableItems`/`openItemUse`). «Inventario» from the creature panel now opens the sheet drawer over the Table (that button is in `table.mjs`, done by its owner).                   | `inventory-plus.mjs`, `quickbar.mjs`, `inventory-plus.css`                                |
| PG-53  | PARTIAL | DDB Manage Spells source chips: SRD 2024, campaign homebrew (enabled spells listed, «Aggiungi» through the Library), Legacy 2014 with the campaign's reason; when only the SRD is usable it is one line of text («Fonte: SRD 5.2.1 · 2024 · …»). **Not done:** legacy 2014 versions side by side — the catalogue has no 2014 data and the demo campaign policy excludes legacy content.                                                                                                                                                                                     | `spells-plus.mjs`, `spells-plus.css`                                                      |

## Tests

- New: `tests/p4-harness.mjs`, `p4-shop-cart` (cart-add visibility, haggle), `p4-party-inventory`
  (party inventory, award command, award after the encounter), `p4-inventory` (catalogue add,
  equippable, sort/columns, set swap auto-stow, currencies, usable items), `p4-rest` (Hit Dice
  summary, group rest, post-long-rest choices, dawn recovery for a feature), `p4-spells-sources`,
  `p4-camp`, `p4-generators`, `p4-tables`, `p4-handouts`, `p4-compendium-add`,
  `p4-quickbar-items`.
- Updated for the new behaviour: `tests/inventory-plus.test.mjs` (swap stows instead of
  refusing), `tests/travel-review.test.mjs` (watch log line with the hours),
  `tests/handouts.test.mjs` (own art preferred).
- Full suite `node --test design/blueprint/tests/*.test.mjs`: 2274 tests, 2268 pass, 6 fail — all
  outside P4 and moving under concurrent fixers: `ia-consolidation` 161/581 and
  `w2b2-integration` 56 (Preparation «scene-assets» section folded into the scene list, P7);
  `ia-consolidation` 605 (`sheet-plus-notes` in the notes category, sheet packages);
  `media` 491/1114 (journal entry page «Contenuto non disponibile», campaign content). Every P4
  test passes.

## Browser journeys (real clicks, keys and touch; IT 1440 and EN 390 touch)

New, all passing: `p4-shop-journey.js`, `p4-inventory-journey.js`, `p4-rest-journey.js`,
`p4-campaign-journey.js` (includes the award after an encounter), `p4-prep-journey.js` (treasure
IT/EN, furnished dungeon saved with objects, camp hour and watch check, multi-sided token picker
and «Lati…»), `p4-shared-journey.js` (Library row «Aggiungi», quick bar «Usa un oggetto»).

Existing journeys of the touched areas, run one per command: passing — `loot-journey`,
`loot-review-journey`, `loot-review2-journey`, `inventory-plus-journey`,
`inventory-plus-review-journey`, `rest-time-journey`, `rest-shared-journey`,
`rest-reversed-journey`, `rest-mobile-personal-journey`, `travel-journey`,
`travel-review-journey`, `generators-journey`, `random-tables-journey`, `spells-plus-journey`,
`spells-plus-review-journey`, `quickbar-journey`, `quickbar-review-journey`.
Adjusted to intended changes: `loot-journey` (the sheet now opens in a drawer over the Table),
`inventory-plus-journey` (sheet Movement wording «−3 m ingombro»; wait for the undo toast and
bring the Backpack into view before the second drag, the toolbar grew; PG-74 swap stows the
shield), `rest-shared-journey` (CA-77: unticks the others to keep Livia alone),
`handouts-journey` (scenes are in folders: search «cortile dell»).

## Not fixed / notes for the coordinator

- PG-17: `party.mjs` (P10) Gruppo page needs one link to «Inventario del gruppo» or the
  `loot-award` command; no registry hook exists there.
- PG-53: side-by-side legacy 2014 spells need 2014 data and a campaign policy that allows it.
- `handouts-journey` still fails at its phone step (19): in Preparation's folded scene list
  (P7) the row's «Altre azioni» menu runs past the right edge at 390 px and the activation does
  not return to the Table. Desktop steps pass (14 of them).
- `compendium-journey` (P8) fails on P8's own new markup (two `[data-library-scope="compendium"]`
  buttons, two `.compendium-legal table`), not on the additive row button.
- `encounter-builder-journey` still opens `[data-prep-open="old-watch"]` at the list's top
  level; with scene folders it needs the folder search too (not run here).
