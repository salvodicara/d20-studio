# B61 — Struttura del Tavolo e dell'app dopo l'ondata 1: prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · sessione browser `d20-b61` (prove ad hoc in `d20-b61-probe`) · server
`http://127.0.0.1:8879/` senza cache · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B61/` (fuori dal checkout). Solo dati
sintetici. Scheda: [CAPABILITY_CENSUS «B61»](../../docs/interview/CAPABILITY_CENSUS.md).

Il problema, misurato dagli integratori dell'ondata 1: la barra in alto del Tavolo del DM
aveva 16 pulsanti (2 righe a 1440, 4 righe a 390), i cassetti delle aree erano pulsanti
nell'intestazione del Tavolo, l'intestazione del telefono andava su 3 righe, la barra
strumenti a sinistra era più alta della mappa e il suggerimento del primo ingresso copriva la
mappa a 390. B61 sposta i comandi dove li mettono i prodotti di riferimento; non decide
l'aspetto finale.

## In breve

- **In alto** restano solo il titolo della scena e i comandi di scena del core: il DM ne ha 4
  (Avvia combattimento, Scene, Riposi, Tempo), il giocatore 1 (Riposi). Nessun pulsante d'area.
  Sopra la mappa, a 390, il DM passa da 451 a 273 px e il giocatore da 363 a 223 px.
- **A sinistra** gli strumenti della mappa sono raggruppati: Seleziona e muovi, Misura e
  sagome, Disegna e annota, Segnala, Strumenti del DM (più «Nebbia e visione» quando B35
  registrerà uno strumento). Il gruppo attivo mostra i suoi strumenti in una colonna accanto.
  La barra passa da 13 a 5 pulsanti per il DM (da 595 a 234 px a 1440). Zoom e «Centra» sono
  in basso a destra della mappa.
- **A destra** una barra laterale a schede: prima la creatura selezionata, poi Registro, poi
  le 11 schede d'area (13 per il DM, 8 per il giocatore). Icona sulla scheda, nome al passaggio
  e per i lettori di schermo; comprimibile; ogni identità ritrova la sua ultima scheda.
- **In basso** la barra delle azioni della creatura controllata: risorse (Azione, Bonus,
  Reazione, Movimento), Muovi, Rialzati, Azioni della scheda, Tira i dadi, Esc, Annulla ultima
  modifica, Termina turno; sopra, la barra delle azioni di combattimento. Corre sotto mappa e
  pannello.
- **Telefono (390)**: il pannello segue la mappa; le schede sono una barra fissata in basso,
  sotto la barra delle azioni, con «Mappa» per prima. Intestazione del Tavolo su una riga (Aiuto
  nel menu App), fuori dal Tavolo su due righe con il solo simbolo d20.
- **Seguiti dell'ondata 1**: i dadi animati non trattengono più i clic, tranne la schermata BG3
  della prova con CD avviata da sé fuori dal combattimento (6a); il suggerimento del primo
  ingresso non copre più la mappa a 390 (6b); «Log» in inglese è una scheda da 58×52 px (6c);
  `registry-smoke-journey.js` è riscritto per 22 aree costruite (6d).
- **Test Node** 1343/1343 (due giri completi). **Percorsi**: vedi «Esecuzioni».

## Pattern adottati (censimento di mercato)

| Dove                                    | Pattern                                                                                                                                                                                              | Righe del censimento                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Strumenti a sinistra, raggruppati       | Foundry scene controls (gruppi e strumenti del gruppo attivo accanto), barra verticale di Roll20, strumenti a modalità di Owlbear, strumenti con tasto e memoria di D&D Beyond Maps                  | FVT-108, R20-127, VTL-231, DDB-121/122/123, DDB-126 (il gruppo torna all'ultimo strumento usato) |
| Barra laterale a schede                 | Schede della barra laterale di Foundry (chat, combattimento, attori, diario, tabelle, compendio), barra laterale destra di Roll20, pannello laterale di D&D Beyond Maps con la scheda della creatura | FVT-007, FVT-127, R20-003, R20-053, DDB-133, DDB-035                                             |
| Prima scheda = creatura selezionata     | Pannello del personaggio di D&D Beyond Maps; selezionare non cambia la scheda aperta come in Foundry                                                                                                 | DDB-133, FVT-108                                                                                 |
| Barra delle azioni in basso con risorse | Hotbar e barra delle risorse di BG3; HUD di combattimento Argon per Foundry                                                                                                                          | CRP-098, CRP-099, FVT-135                                                                        |
| Ordine dei turni in alto                | Ritratti in alto di BG3 e bandierine di D&D Beyond Maps (già presenti, invariati)                                                                                                                    | CRP-090, DDB-137                                                                                 |
| Zoom in basso a destra                  | Widget di zoom di D&D Beyond Maps e di Owlbear                                                                                                                                                       | DDB-120, VTL-209                                                                                 |
| Telefono: barra delle schede in basso   | Barra di navigazione in basso di Quest Portal (in sessione diventa barra di sessione), navigazione rapida mobile di D&D Beyond, Owlbear sul telefono                                                 | VTL-008, DDB-060, VTL-010                                                                        |
| Servizi come icone in alto a destra     | Azioni in alto di Owlbear; sul telefono ciò che non sta va nel menu App                                                                                                                              | VTL-231                                                                                          |
| Dadi che non bloccano                   | Dice So Nice, dadi 3D condivisi di D&D Beyond; la schermata BG3 resta per la prova con CD                                                                                                            | FVT-155, DDB-152, CRP-131                                                                        |
| Suggerimento agganciato                 | Carta X agganciata di B27, scheda tutorial di BG3 al bordo                                                                                                                                           | B27, CRP-131                                                                                     |

Non adottati: il pop-out delle finestre di Foundry (FVT-199) e la larghezza regolabile della
barra laterale di Roll20: richiedono decisioni di prodotto; la barra si comprime soltanto.

## Cosa cambia, per posto

### Tavolo (`table.mjs`, `styles.css`)

- Struttura `.table-layout`: riga del titolo, ordine dei turni, richieste in sospeso, mappa,
  pannello laterale e schede, barra delle azioni di combattimento, barra delle azioni. Sopra i
  720 px la mappa e il pannello stanno affiancati e le due barre in basso corrono sotto entrambi;
  le schede occupano tutta l'altezza al bordo destro. Larghezza del pannello: 380 px (420 da
  1600 px, 340 sotto 1280, 300 sotto 1000).
- **Scheda Creatura**: l'ispettore di sempre (stato, forme, percorso, anteprima dell'azione,
  CA e movimento, Scheda completa, Inventario, Riposa) più i pannelli `inspector` delle aree.
  Avviare l'anteprima di un'azione o un percorso pianificato riporta una volta la scheda
  Creatura: lì stanno dettagli e conferma. Selezionare una pedina non cambia scheda (lo Schermo
  del DM applica le condizioni alla selezione); la scheda Creatura porta il nome della
  selezionata («Creatura: Sentinella»).
- **Schede d'area**: il pannello aperto ha titolo e «Chiudi pannello», che torna a Creatura.
  Ogni controllo con `data-table-drawer="<id>"` apre la scheda (anche i pulsanti HUD di B14 sulla
  mappa); premuto a scheda aperta torna a Creatura, come il vecchio cassetto. Tastiera: le
  schede sono un `tablist` (frecce, Home, Fine; Invio o Spazio apre; il fuoco resta sulla
  scheda). La barra si comprime con il pulsante in cima; l'ultima scheda e lo stato compresso
  sono per identità su questo dispositivo; «Ripristina esempio» li dimentica.
- **Strumenti**: un gruppo con un solo strumento visibile mostra lo strumento stesso (per il
  giocatore Disegna e Puntatore); gli strumenti degli altri gruppi restano nel markup, nascosti,
  quindi le scorciatoie e i suggerimenti di B23 e i blocchi di B20 li trovano come prima.
- **Barra delle azioni**: Tira i dadi e Annulla ultima modifica passano dall'ispettore alla barra
  (restano raggiungibili da ogni scheda: il `/r` della chat li usa con il Registro aperto); sul
  telefono i due comandi mostrano solo l'icona, con il nome per i lettori di schermo.
- **Didascalia della mappa** alta 48 px sopra i 1000 px: un messaggio lungo su due righe non
  ridimensiona più la mappa durante un trascinamento (difetto trovato da
  `annotations-review-fixes`: la sagoma con Maiusc misurava 2,3 m invece di 2,7 m).

### Registro (`registry.mjs`) e aree (solo metadati di collocazione)

- `table-panel`: `placement: "sidebar-tab"` (scheda propria); `"drawer"` resta accettato come
  vecchio nome. Il Registro del core ha ordine 10.
- `table-tool`: nuovo campo `group`, validato su `TABLE_TOOL_GROUPS`; un sostituto eredita il
  gruppo del core, uno strumento senza gruppo va in «Altri strumenti».
- Registrazioni aggiornate (solo `placement`, `order`, `icon`, `group`): B14 Sessione (70),
  B15 Materiali (30, icona `scroll`) e Spillo (`draw`), B16 Schermo del DM (60) e Posiziona
  creatura (`dm`), B17 Registro (icona `chat`), B18 Annotazioni (80, `pen`), Disegna (`draw`),
  Sagoma (`measure`), B19 Incontro (20), B25 Tabelle e mazzi (40, `cards`) e Pedina a più facce
  (`dm`), B26 Bottino (50) e Bottega (51, `coins`), B27 Sicurezza (110), B28 Immagini e file
  (100, `image`), B56 Prova i dadi (90), B60 Assistente (120), B12 Seleziona più pedine
  (`select`). Nuove icone in `ui.mjs`: `shield`, `panel`, `chat`, `scroll`, `cards`, `coins`,
  `image`.
- Regola «dove mettere un comando» e posti nuovi: [piano del registro §5](blueprint-registry-plan.md#5-struttura-del-tavolo-e-dove-mettere-un-comando-b61-24092026).

### Adattamenti alle aree per il nuovo contenitore (nessun cambio di comportamento)

- La colonna del pannello è un contenitore `table-panel`: B56 (`dice-3d.css`), B26 (`loot.css`),
  B27 (`safety.css`) e B14 (`session-view.css`) ripetono lì le loro regole «telefono» con
  `@container table-panel (max-width: 600px)`; senza, Prova i dadi, Bottino, Bottega, Sicurezza
  e i nastri di Sessione erano schiacciati su due o tre colonne in 380 px.
- B17 (`chat.css`): il Registro riempie la sua scheda sopra i 900 px (prima era un pannello
  fisso che restringeva tutta l'app e la sua intestazione); sotto resta il foglio a tutto
  schermo. `chat.mjs`: l'avviso sul telefono si posa sopra la barra delle azioni anche con la
  barra delle schede sotto.
- B27 (`safety-ui.mjs`): all'apertura la scheda porta in vista le carte di segnale scorrendo
  dentro il pannello; la barra delle azioni conta solo dove copre davvero le carte.
- B22 (`preferences.css`): modalità «solo scheda» con il pannello al posto della mappa;
  «Vai alla mappa» nascosto senza mappa; tema chiaro per i nuovi elementi; dissolvenza anche
  dello zoom. B14 (`session-view.css`): «Nascondi interfaccia» nasconde anche pannello e schede.

### Intestazione dell'app (`app.mjs`, `styles.css`)

- Sotto i 420 px il marchio mostra solo il simbolo d20 (nome accessibile «d20 Studio»):
  fuori dal Tavolo l'intestazione passa da 3 righe (157 px) a 2 (109 px) e i sei servizi,
  Aiuto compreso, stanno sulla prima riga.
- Al Tavolo sul telefono «Torna alla campagna» mostra la freccia (nome invariato) e Aiuto passa
  nel menu App, che elenca ogni servizio che l'intestazione non mostra: una riga, 63 px (era
  109). Fuori dal Tavolo Aiuto resta nell'intestazione: con il solo simbolo c'è posto, e fuori
  dal Tavolo non esiste un menu App.
- «Torna al Tavolo» (sotto l'intestazione) ha il bersaglio di 40 px (era 28).

### Seguiti dell'ondata 1

- **6a, B56** (`dice-3d-domain.mjs`, `dice-3d.mjs`, `dice-3d.css`): la schermata modale BG3
  resta per la prova o il TS con CD che l'identità avvia da sé fuori dal combattimento (oggi
  «Prova i dadi»; domani le prove dalla scheda). Tutti gli altri tiri, compresi TS di
  combattimento, concentrazione, tiri contro la morte e i tiri visti da un altro, rotolano sul
  tavolo con `pointer-events: none`: il clic raggiunge la pagina e fa atterrare o chiudere i
  dadi; Esc salta e chiude come prima.
- **6b, B30** (`help.mjs`, `home.css`): al Tavolo il suggerimento diventa una riga agganciata
  (titolo, «Leggi», «Ho capito»), come la carta X agganciata di B27. Sul telefono sta sopra la
  barra delle azioni quando sotto la mappa c'è posto (giocatore: 645–694, mappa fino a 643);
  altrimenti sopra la barra delle schede, sotto la barra delle azioni (DM: 787–836, mappa fino a
  693). Sul computer, se nessun angolo della mappa è libero per la scheda intera, la riga cerca
  un punto libero lungo i bordi della mappa. «Leggi» apre la scheda intera per scelta.
- **6c**: il Registro è una scheda: a 390 in inglese 58×52 px (era 38 px di larghezza).
- **6d**: `registry-smoke-journey.js` riscritto: conta le aree pronte e da costruire dal piano
  in `extensions.mjs`, controlla che ogni foglio di stile collegato sia di un'area pronta, usa
  la campana di B24, la palette di B23, la Home di B30, la scheda laterale del pannello di prova
  e lo strumento di prova nel gruppo «Segnala»; resta la parte con fixture guasta e sonda.

## Misure prima e dopo

Sonda `scripts/probe.js` (contesti nuovi, dati di esempio ripristinati; 390 con tocco).
JSON: `before/probe.clean.json`, `after/probe.clean.json`.

| Misura                                               | Prima                                | Dopo                              |
| ---------------------------------------------------- | ------------------------------------ | --------------------------------- |
| Pulsanti nella riga del titolo del Tavolo, DM        | 16 (2 righe a 1440, 4 a 390)         | 4 (1 riga)                        |
| Pulsanti nella riga del titolo del Tavolo, giocatore | 8                                    | 1                                 |
| Riga del titolo, DM, 1440 / 390                      | 124 / 261 px                         | 86 / 129 px                       |
| Inizio della mappa, DM, 1440 / 390                   | 231 / 451 px                         | 193 / 273 px                      |
| Inizio della mappa, giocatore, 1440 / 390            | 193 / 363 px                         | 193 / 223 px                      |
| Barra strumenti della mappa, DM, 1440                | 13 pulsanti, 595 px (oltre la mappa) | 5 gruppi, 234 px                  |
| Barra strumenti della mappa, giocatore, 1440         | 11 pulsanti, 507 px                  | 4 gruppi, 189 px                  |
| Pulsanti della mappa sotto 40 px a 1440              | 11–13 (39×39)                        | 0                                 |
| Mappa a 1440 (larghezza × altezza)                   | 1160 × 378                           | 1004 × 370 (1384 × 370 compressa) |
| Intestazione fuori dal Tavolo, 390                   | 3 righe, 157 px                      | 2 righe, 109 px, solo simbolo     |
| Intestazione del Tavolo, 390                         | 2 righe, 109 px                      | 1 riga, 63 px                     |
| Intestazione a 1440                                  | 1 riga (81 / 63 px)                  | invariata                         |
| Suggerimento del primo ingresso sulla mappa, 390     | 94 279 px² coperti                   | 0 (giocatore e DM)                |
| «Log» EN a 390                                       | 38 px di larghezza                   | scheda 58×52 px                   |
| Schede laterali DM / giocatore                       | —                                    | 13 / 8, ognuna a 1 clic           |
| Scorrimento orizzontale a 1440 e 390                 | 0                                    | 0                                 |

Costo onesto: a 1440 la mappa è più stretta (1004 invece di 1160 px) perché il pannello (380 px
più 56 di schede) sostituisce l'ispettore da 280; comprimendo la barra la mappa arriva a 1384 px.

## Schermate

Tutte in `…/2026-09-24/B61/`:

- Prima: `before/home-{player,dm}-{1440,390}.png`, `before/table-{player,dm}-{1440,390}.png`,
  `…-firstvisit.png` (suggerimento), `…-full.png` (pagina intera).
- Dopo: stessi nomi in `after/`, più `after/table-dm-1440-tab-loot.png`,
  `after/table-dm-1440-tab-log.png`, `after/table-dm-1440-measure-group.png`,
  `after/table-dm-1440-collapsed.png`, `after/table-dm-390-tab-session.png`,
  `after/table-dm-390-map-link.png`, `after/table-dm-390-app-menu-help.png`.
- Dal percorso B61: `runs/b61-table-structure/journey/table-{player,dm}-{1440,390}.png` e
  `tip-{player,dm}-390.png`.

## Percorsi aggiornati

Solo selettori, attese e riferimenti di posto: nessuna asserzione tolta. Dove il comportamento
è cambiato per scelta (B56, 6a) l'asserzione ora prova il comportamento nuovo.

| Percorso                                                                             | Perché                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `b61-table-structure-journey.js`                                                     | nuovo: accettazione di B61 (sopra)                                                                                                                                                                                         |
| `registry-smoke-journey.js`                                                          | riscritto (6d)                                                                                                                                                                                                             |
| `dice-3d-journey.js`                                                                 | scheda «Prova i dadi» e «Registro» con `role="tab"`; passo 12: il TS di combattimento di Doran rotola sul tavolo e il clic apre il «Risolvi tiro» di Sentinella; passo 14: il tocco sui dadi raggiunge la pagina («Mappa») |
| `token-menu-journey.js`                                                              | strumenti nei gruppi (`pickTool`); Registro è una scheda                                                                                                                                                                   |
| `chat-journey.js`                                                                    | il Registro è nella colonna accanto alla mappa; nome della scheda «Registro»; scheda e distintivo trovati nella barra delle schede; la memoria per identità mostra i messaggi nel Registro aperto invece del distintivo    |
| `chat-review-fixes-journey.js`                                                       | distintivo letto da nome e numero; servizi raggiungibili sopra il Registro; tra 901 e 1279 px la mappa non si restringe all'apertura del Registro; la creatura selezionata letta dalla scheda Creatura                     |
| `annotations-journey.js`, `annotations-review-fixes-journey.js`                      | strumenti nei gruppi; scheda «Annotazioni»; due trascinamenti partono fuori dalla barra delle opzioni ora che la mappa è più piccola                                                                                       |
| `handouts-journey.js`                                                                | Spillo nel gruppo «Disegna e annota»; scheda «Materiali» aperta solo se chiusa; scheda Creatura per «Rivela aspetto» e «Scena senza mappa»                                                                                 |
| `loot-journey.js`, `loot-review-journey.js`                                          | «Chiudi pannello» ha `data-table-drawer-close`                                                                                                                                                                             |
| `encounter-builder-journey.js`, `compendium-journey.js`                              | la scheda ricordata non va richiusa con un secondo clic                                                                                                                                                                    |
| `safety-journey.js`                                                                  | scheda «Sicurezza» aperta solo se chiusa; le carte «in vista» contano la barra delle azioni solo dove la attraversa                                                                                                        |
| `session-view-journey.js`                                                            | scheda «Sessione» (anche dal pulsante HUD sul telefono, solo se chiusa); Disegna nel suo gruppo, Muovi dalla barra delle azioni; «Nascondi interfaccia» nasconde e ripristina la barra laterale                            |
| `campaign-settings-journey.js`, `media-review2-journey.js`, `preferences-journey.js` | scheda Creatura per i pannelli dell'ispettore; «Prova i dadi» è una scheda                                                                                                                                                 |
| `campaign-members-review-journey.js`, `assistant-review-fixes.js`                    | Registro e Sessione sono schede distinte                                                                                                                                                                                   |
| `account-journey.js`                                                                 | Misura nel gruppo «Misura e sagome»                                                                                                                                                                                        |
| `conditions-journey.js`                                                              | movimento confrontato al micrometro (5,999998 per la nuova scala)                                                                                                                                                          |
| `reactions-journey.js`                                                               | il punto cliccato cade entro 2 unità da x 450 (un pixel vale 1,75 unità accanto alla barra laterale) e il movimento ripreso deve finire esattamente lì                                                                     |
| `media-review-journey.js`                                                            | il pulsante «Risolvi» nella mappa misura 39,99997 px: tolleranza di un centesimo di pixel                                                                                                                                  |
| `measure-journey.js`                                                                 | Misura nel gruppo «Misura e sagome»                                                                                                                                                                                        |
| `approach-journey.js`                                                                | ricetta W1b per i dadi animati di B56 dopo «Registra tiro» (fallimento dell'ondata 1, non di B61: il percorso non era nei giri W1a/W1b)                                                                                    |
| `home-journey.js`                                                                    | il suggerimento del telefono è una riga fuori dalla mappa; si misurano i pulsanti visibili                                                                                                                                 |
| `visual-fixes-journey.js`                                                            | si misurano i controlli visibili della mappa                                                                                                                                                                               |

## Esecuzioni

Copie dei percorsi con le immagini reindirizzate in `runs/<percorso>/` (metodo degli
integratori W1a/W1b: `scripts/prep.sh`, `scripts/run.sh`, esito in `results-<giro>.txt`, JSON
per percorso in `runs/<percorso>/<giro>.json`). Le prove dei costruttori non sono state toccate.

| Giro                                                   | Percorsi (esiti `passed`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `final` (tutti in sequenza)                            | registry-smoke 18, core 13, combat 10, token-menu 19 gruppi, notifications 25, dice-3d 18, loot 12, encounter-builder 12, annotations 11, account 10, assistant 14, assistant-review-fixes 11, campaign-members 15, campaign-members-review 11, campaign-members-review2 9, campaign-settings 15, compendium 15, home 13, loot-review 7, loot-review2 6, media 13, media-review2 7, preferences 14, safety 17, visual-fixes 5, random-tables (testo, tutti i passi), area 8, combat-mobile 10, conditions-badges 2, conditions-death 7, dice-correction 7, rest-shared 3, command-palette (testo, tutti i passi) |
| `final2`/`final3`/`final4` (dopo le ultime correzioni) | b61-table-structure 6, registry-smoke 18, conditions 11, chat 13, handouts 15, annotations 11, annotations-review-fixes 10, chat-review-fixes 11, media-review 13, reactions 8, session-view 15, token-menu 19, account 10                                                                                                                                                                                                                                                                                                                                                                                       |
| `extra`/`extra2` (altri percorsi del Tavolo)           | forms 2, conditions-mobile 3, conditions-fixes 7, forms-mobile 3, rest-mobile-personal 4, gestures-and-views 8, multi-self 6, familiar 3, concentration 10, encounter-lifecycle 11, simultaneous-reactions 6, companion-map 2, companion-personal 2, new-npc-reaction 4, rest-time 3, rest-reversed 1, campaign-integration 2, library 3, character-library 17, community 22, measure 2, spatial 8, spatial-mobile 6 (dopo spatial), preparation 9, approach 7 (dopo spatial)                                                                                                                                    |

Tutti verdi, zero errori di pagina, tranne `b11b-inc10-fixes-journey.js` (vedi «Aperti»). I giri
intermedi (`sweep1`–`sweep3`) hanno trovato le rotture elencate sopra, corrette nei percorsi o,
dove erano del prodotto (didascalia che ridimensionava la mappa, barra delle azioni su una
colonna al 125 %, suggerimento sul telefono, carte di Sicurezza fuori vista, contenuti schiacciati
nella colonna), nel prodotto.

## Test Node

`node --test design/blueprint/tests/*.test.mjs`: **1343/1343**, due giri completi dopo l'ultima
modifica. In un giro precedente `INV-10 review` (`tests/loot.test.mjs`) è fallito una volta: il
test verifica che la riga di Livia non contenga `2d4`, e la riga contiene id casuali (un UUID può
contenere «2d4»). Tre esecuzioni isolate e i due giri completi sono verdi: è un test instabile
preesistente, non legato a B61. Test aggiornati: `registry-shell` (la scheda del pannello di prova
e il gruppo «Segnala»), `dice-3d` (regola 6a: tiri di combattimento sul tavolo, schermata BG3 per
la propria prova, un clic sui dadi che rotolano passa alla pagina), `media`, `safety`,
`session-view` (collocazione e icona). Fixture `sample-extension.mjs`: `placement: "sidebar-tab"`,
`group: "ping"`.

## File toccati

- Core: `design/blueprint/table.mjs`, `registry.mjs`, `app.mjs`, `ui.mjs`, `styles.css`,
  `DEVELOPMENT.md` (sezione «Table structure (B61)»).
- Metadati di collocazione delle aree (`register()`): `annotations.mjs`, `assistant.mjs`,
  `chat.mjs`, `compendium.mjs`, `dice-3d.mjs`, `encounter-builder.mjs`, `handouts.mjs`,
  `loot.mjs`, `media.mjs`, `random-tables.mjs`, `safety.mjs`, `session-view.mjs`,
  `token-menu.mjs`.
- Comportamento richiesto dai seguiti 6a/6b: `dice-3d-domain.mjs`, `dice-3d.mjs`, `dice-3d.css`,
  `help.mjs`, `home.css`.
- Adattamenti al nuovo contenitore: `chat.css`, `chat.mjs` (posizione dell'avviso sul
  telefono), `safety-ui.mjs`, `safety.css`, `loot.css`, `session-view.css`, `preferences.css`.
- Test: `tests/registry-shell.test.mjs`, `tests/dice-3d.test.mjs`, `tests/media.test.mjs`,
  `tests/safety.test.mjs`, `tests/session-view.test.mjs`, `tests/fixtures/sample-extension.mjs`.
- Percorsi: quelli della tabella «Percorsi aggiornati» (tutti in
  `changes/interview-01/blueprint-checks/`).
- Documenti: questo, [piano del registro §5](blueprint-registry-plan.md).

## Aperti e limiti

- **`b11b-inc10-fixes-journey.js`** si ferma al primo passo (Ctrl+Maiusc+J su Inizio non mostra
  l'avviso di rifiuto). Non tocca il Tavolo né i file di B61 e non era nei giri W1a/W1b: da
  verificare a parte (probabilmente un'interazione con B23/B24 sulla Home).
- **`approach-journey.js`** e **`spatial-mobile-journey.js`** richiedono prima
  `spatial-journey.js` (precondizione degli script): eseguiti in quell'ordine, verdi.
- **`tests/loot.test.mjs` «INV-10 review»** può fallire di rado per un id casuale che contiene
  «2d4» (vedi «Test Node»): da rendere deterministico nel suo incremento.
- Una modifica di sola formattazione a `campaign.mjs`: Prettier l'ha riformattato durante un
  comando su tutti i moduli; nessun cambiamento di significato (lo formatta Prettier stesso).
- Il pop-out e la larghezza regolabile della barra laterale restano scelte di prodotto.
- La barra delle azioni in basso è del core; l'area pianificata `quickbar` la estenderà con un
  punto proprio, ancora da definire.

## Revisione e correzioni (revisione indipendente, 24/09/2026)

Revisore-correttore distinto dal costruttore · stesso worktree, nessun commit · sessione
browser `d20-b61-rf` (sonde ad hoc in `d20-b61-rf-probe`) · server `http://127.0.0.1:8879/`
senza cache · prove in `~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B61-rf/` (fuori
dal checkout; le prove del costruttore non sono state toccate). Solo dati sintetici.

### Cosa ho controllato

Ogni punto d'ingresso delle 22 aree dell'ondata 1, dal suo contesto naturale, per DM e
giocatore, a 1440 con il mouse e a 390 con il tocco. Un comando conta come «trovato» solo se
nessuna striscia interna deve scorrere di lato (o una barra verticale verso il basso) per
mostrarlo e se niente lo copre; la pagina e il contenuto di un pannello possono scorrere.
Il nuovo percorso `b61-review-fixes-journey.js` fa questo conteggio da solo (6 gruppi, 0
errori di pagina) e ne salva l'esito in `B61-rf/journey/result.json`.

Il costruttore aveva provato «ogni scheda si apre con un clic», ma Playwright porta in vista
da solo un elemento prima di cliccarlo: un pulsante nascosto in fondo a una striscia passava
lo stesso. Le misure sotto sono prese senza quell'aiuto.

### Problemi trovati e corretti

| #   | Gravità                                         | Problema (prima della correzione)                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Correzione (pattern copiato)                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1 | P1 (regressione di B61)                         | Telefono: la barra delle azioni era una riga che scorreva di lato. Fuori combattimento «Annulla ultima modifica» (x 445–485) e «Esc · Annulla preparazione» (283–439) erano oltre il bordo di uno schermo da 390; in combattimento anche **«Termina turno»** (491–580), per DM e giocatore. Prima di B61 la barra andava a capo e si vedeva tutto.                                                                                                                                                    | La barra torna ad andare a capo. «Annulla preparazione» sul telefono mostra solo l'icona ✕, come «Tira i dadi» e «Annulla» (il nome per i lettori di schermo resta «Esc · Annulla preparazione»; sul computer resta il testo). Fuori combattimento sta in una riga (Annulla a 329–369); in combattimento «Termina turno» va sulla seconda riga (12–101). A 1440 la barra resta di una riga.                                                                 |
| R-2 | P2                                              | Telefono: la barra delle schede aveva 14 pulsanti in una striscia larga 922 px. Fuori schermo 8 schede su 13 per il DM e 4 su 8 per il giocatore, **Sicurezza compresa**, senza niente che lo dicesse. Anche «Mappa» scorreva via con la barra. Dopo la scelta la barra si ridisegnava dall'inizio: aprendo Sicurezza la scheda aperta non si vedeva più. I pattern citati non sono questi: Quest Portal ha 5 voci (VTL-008), D&D Beyond affianca alle sezioni un pulsante di salto rapido (DDB-060). | Il pulsante **«Tutti i pannelli»** apre l'elenco di tutte le schede, con icona e nome, e segna quella aperta: è il salto rapido di D&D Beyond (DDB-060) o il «…» di VS Code per le viste che non ci stanno. Scorrono solo le schede. Sul telefono «Mappa» resta fissa a sinistra e «Tutti» a destra; sul computer «Tutti» sta sotto «Comprimi». Dopo ogni scelta la scheda aperta resta in vista. Ogni scheda è a 1 tocco se è nella barra, altrimenti a 2. |
| R-3 | P2                                              | Portatile 1366 × 768 (la risoluzione più comune): la colonna delle 13 schede del DM scorreva dentro sé stessa (690/672 px) e Sicurezza era tagliata. A 1280 × 720 due schede stavano sotto il bordo della finestra.                                                                                                                                                                                                                                                                                   | Schede da 40 × 40 px, sempre ≥ 40, con 2 px tra l'una e l'altra: a 1366 × 768 si vedono tutte e 13. Dove non bastano (1280 × 720, finestre più basse), «Tutti i pannelli» in cima alla colonna le elenca.                                                                                                                                                                                                                                                   |
| R-4 | P2 (preesistente, dentro l'accettazione di B61) | Telefono, pagina della campagna: le sezioni erano una striscia di 1369 px (DM 17, giocatore 14). A 390 se ne vedevano 4: **Impostazioni (B20)**, Assistente (B60), Sicurezza (B27), Tesoro (B26), Allegati (B28), Materiali (B15), Archivio chat (B17) e Reclutamento (B59) erano fuori schermo. La sezione aperta usciva di vista dopo ogni navigazione. B61 chiede «ogni area raggiungibile in ≤ 2 clic dal suo contesto» anche fuori dal Tavolo.                                                   | Stesso pattern: **«Tutte le sezioni»** è fisso in fondo alla striscia, solo sotto i 720 px, ed elenca ogni sezione. La sezione aperta resta in vista. Sul computer la colonna delle sezioni non cambia.                                                                                                                                                                                                                                                     |
| R-5 | P2 (B61 insieme a B22)                          | Con l'interfaccia ingrandita (110 % o più, B22), la barra degli strumenti scorre dentro la mappa (`overflow-y: auto`). Gli strumenti del gruppo attivo stanno accanto alla barra, quindi quella casella li tagliava: a 110 % erano coperti Muovi, Pianifica percorso, Sposta vista e Seleziona più pedine, e aprendo «Misura e sagome» anche Misura e Sagoma (sonda `scripts/scaled-tools.js`, schermate `shots/scaled-ui*.png`). Chi ingrandisce l'interfaccia non poteva sceglierli con il mouse.   | Solo con l'interfaccia ingrandita gli strumenti del gruppo attivo stanno nella colonna, sotto il loro pulsante di gruppo, e scorrono con la barra (`preferences.css`). A 100 % la colonna accanto resta com'è, come in Foundry. Ogni strumento di ogni gruppo si porta in vista e si preme a 125 % di interfaccia e testo (percorso, gruppo 6).                                                                                                             |

Le correzioni sono state scritte partendo dai test. `tests/review-fixes-b61.test.mjs` ha 5 test,
falliti prima delle modifiche (manca `tablePanelsMenu`): la barra delle azioni va a capo e
Annulla ha la sua icona; «Tutti i pannelli» è nella barra ma fuori dalla striscia che scorre,
e l'elenco segna la scheda aperta; scegliere una voce apre la scheda e non la richiude mai;
dopo il disegno la scheda aperta viene portata in vista nella striscia; con l'interfaccia
ingrandita gli strumenti del gruppo stanno nella colonna (quest'ultimo è fallito prima della
regola in `preferences.css`). La parte sulla campagna vive in `app.mjs`, che Node non importa:
prima delle modifiche il percorso nuovo si fermava su `[data-campaign-sections]` («not
rendered», esito `runs/b61-review-fixes/red.json`), dopo passa (`green.json`).

### Conteggio dei clic dopo le correzioni

Clic o tocchi dal contesto naturale (percorso `b61-review-fixes`; «—» = non esiste per quel
ruolo o non misurato a quella larghezza). Tavolo: dal Tavolo. «(campagna)»: a 1440 da Inizio
(«Apri campagna», poi la sezione), a 390 dalla pagina della campagna.

| Area e punto d'ingresso                                    | Giocatore 1440 | DM 1440       | Giocatore 390    | DM 390           |
| ---------------------------------------------------------- | -------------- | ------------- | ---------------- | ---------------- |
| B12 menu della pedina (clic destro / pressione)            | 1              | 1             | 1                | 1                |
| B12 selezione multipla (gruppo, strumento)                 | 2              | 2             | —                | —                |
| B13 membri (campagna)                                      | 2              | 2             | 1                | 1                |
| B13 link d'invito (Campagne)                               | 2              | 2             | —                | —                |
| B14 sessione (scheda / pulsante sulla mappa)               | —              | 1 / 1         | —                | 2                |
| B15 materiali (scheda / campagna) · spillo                 | 1 / 2          | 1 / 2 · 2     | 1 / 2            | 1 / 2            |
| B16 compendio (Biblioteca) · Schermo del DM                | 2              | 2 · 1         | —                | — · 2            |
| B17 registro (scheda) · archivio chat (campagna)           | 1 · 2          | 1 · 2         | 1 · 2            | 1 · 2            |
| B18 annotazioni (scheda) · disegna · sagoma · segnala      | 1 · 1 · 2 · 1  | 1 · 2 · 2 · 1 | 2 · — · — · —    | 2 · — · — · —    |
| B19 costruttore d'incontri (scheda)                        | —              | 1             | —                | 1                |
| B20 impostazioni della campagna                            | —              | 2             | —                | 2                |
| B21 libreria dei personaggi                                | 1              | 1             | —                | —                |
| B22 preferenze · B23 palette · B24 notifiche · B29 account | 1              | 1             | 1                | 1                |
| B25 tabelle e mazzi (scheda) · pedina a più facce          | 1              | 1 · 1         | 2                | 2                |
| B26 bottino · bottega (schede) · tesoro (campagna)         | 2 (campagna)   | 1 · 1 · 2     | 2 (campagna)     | 2 · 2 · 2        |
| B27 sicurezza (scheda · campagna)                          | 1 · 2          | 1 · 2         | 2 · 2            | 2 · 2            |
| B28 immagini e file (scheda · Biblioteca · allegati)       | 1 · 2 · 2      | 1 · 2 · 2     | 2 · — · 2        | 2 · — · 2        |
| B30 Inizio · Aiuto                                         | 1 · 1          | 1 · 1         | — · 2 (menu App) | — · 2 (menu App) |
| B56 prova i dadi (scheda)                                  | 1              | 1             | 2                | 2                |
| B59 trova un tavolo (Inizio) · reclutamento                | 1              | 1 · 2         | —                | — · 2            |
| B60 assistente (campagna)                                  | 2              | 2             | 2                | 2                |

Il giocatore raggiunge il bottino anche da «Monete e scorta» nella scheda Creatura, con 1 clic.
La scheda dell'assistente al Tavolo esiste solo quando il DM lo attiva (`when`). Con
l'assistente attivo (sonda `B61-rf/scripts/assistant.js`) diventa la 14ª scheda del DM,
«Tutti i pannelli» la elenca e a 390 si apre con 2 tocchi; a 1366 × 768 la 14ª scheda supera
la colonna e si raggiunge dall'elenco. Palette anche con Ctrl+K. Tastiera: «Tutti i pannelli»
si apre con Invio; Invio su una voce apre la scheda e il fuoco arriva su di essa. Scegliere la
scheda già aperta la lascia aperta. In inglese: «All panels», «Table panels», «All».

### Verifica

- **Test Node**: `node --test design/blueprint/tests/*.test.mjs` passa 1348 su 1348 (1343 più
  i 5 nuovi), in due giri completi dopo l'ultima modifica.
- **Percorso della revisione**: `b61-review-fixes` passa 6 gruppi su 6, senza errori di pagina
  (`B61-rf/journey/result.json`, schermate in `B61-rf/journey/`).
- **Percorsi esistenti**: le copie con le immagini reindirizzate in `B61-rf/runs/<percorso>/`,
  con lo stesso metodo del costruttore (`B61-rf/scripts/prep.sh` e `run.sh`), sono state
  eseguite in sequenza nel giro `sweep1`. Sono 70 percorsi, tutti verdi e senza errori di
  pagina (`results-sweep1.txt`). Il giro comprende tutti quelli dei giri
  `final`/`final2–4`/`extra` del costruttore, tra cui `b61-table-structure` (6 gruppi) e
  `registry-smoke` (18); in più `campaign-mobile`, `campaign-world` e
  `assistant-review-fixes-2`, che toccano la striscia delle sezioni. `random-tables` e
  `command-palette` restituiscono un testo con tutti i passi (come nel giro del costruttore).
  La regola R-5 è arrivata a metà del giro, quindi dopo di essa sono stati rieseguiti
  `preferences` (14), `b61-table-structure` (6) e `b61-review-fixes` (6), tutti verdi
  (`results-sweep2.txt`).
- **Prima e dopo, a mano**: `B61-rf/shots/` contiene le schermate prima della correzione
  (`table-dm-390*.png`, `combat-*-390.png`, `campaign-dm-390.png`, `table-dm-1366x768.png`,
  `scaled-ui*.png`) e dopo (`after-*.png`). Tema chiaro: `light-*.png`.

### Aderenza ai pattern citati (verificata nell'app)

Confermati: gruppi di strumenti a sinistra con quelli del gruppo attivo accanto, che tornano
all'ultimo usato (Foundry FVT-108, Roll20, DDB-126); barra laterale a schede comprimibile con
la creatura per prima (Foundry FVT-007, Roll20, DDB-133); selezionare una pedina non cambia
scheda (Foundry); barra delle azioni in basso con risorse (BG3 CRP-098/099); ritratti dei turni
in alto; zoom in basso a destra (DDB-120, Owlbear); servizi come icone in alto a destra
(Owlbear VTL-231); nessuna fila di pulsanti d'area nell'intestazione né nella riga del titolo
a 1440 e 390. Corretto: la barra del telefono (R-2) ora segue davvero DDB-060 e VTL-008 citati
dal costruttore.

### Aperti (P3, non corretti)

- **B17 sul telefono**: il Registro è un foglio a tutto schermo e copre la barra delle schede.
  Per cambiare scheda si chiude (✕, in vista) e si sceglie: 2 tocchi. È il foglio di B17, non
  un cambio di B61.
- **B30 sul telefono**: il suggerimento del primo ingresso del DM (e quello del combattimento)
  si posa sopra la barra delle schede finché non si preme «Ho capito». Material mette gli avvisi
  sopra la barra di navigazione, non su di essa: da rivedere in B62.
- **Icona dell'assistente**: quando il DM lo attiva, la scheda usa la lente, la stessa di
  «Cerca». Un'icona propria spetta a B31.
- **Colonna degli strumenti sul telefono**: il gruppo «Seleziona e muovi» è aperto di default
  e la sua colonna copre circa 50 px del lato sinistro della mappa (è il pattern di Foundry).
  Da valutare in B31.
- **Finestre basse (1280 × 720 e meno)**: il Tavolo è più alto della finestra (803 px) e le
  ultime schede finiscono sotto il bordo. «Tutti i pannelli», in cima, le raggiunge. L'altezza
  della pagina era già così prima della revisione.

### File toccati nella revisione

- `design/blueprint/table.mjs`: aggiunti il pulsante «Tutti i pannelli», `tablePanelsMenu`,
  `showTab(…, toggle)` (una scelta dall'elenco non richiude la scheda), la scheda aperta
  tenuta in vista, e icona e `.dock-text` per Annulla preparazione.
- `design/blueprint/app.mjs`: «Tutte le sezioni» (`.campaign-sections`,
  `[data-campaign-sections]`), l'elenco delle sezioni e la sezione aperta tenuta in vista.
- `design/blueprint/ui.mjs`: `scrollIntoStrip` e l'icona `grid`.
- `design/blueprint/styles.css`: nella barra laterale scorrono solo le schede, che sono da
  40 px; la barra delle azioni del telefono va a capo; l'icona di Annulla si vede solo sul
  telefono; aggiunti lo stile dell'elenco e la striscia delle sezioni sul telefono.
- `design/blueprint/preferences.css`: con l'interfaccia ingrandita gli strumenti del gruppo
  stanno nella colonna che scorre (R-5).
- Test: `design/blueprint/tests/review-fixes-b61.test.mjs` (nuovo, 5 test).
- Percorso: `changes/interview-01/blueprint-checks/b61-review-fixes-journey.js` (nuovo). Voce
  54 nel README delle prove.
- Documenti: questa sezione; `DEVELOPMENT.md`, sezione «Table structure (B61)», punto «Review
  fixes»; [piano del registro §5.1](blueprint-registry-plan.md), punto «Telefono».
  `README.md` delle prove: Prettier ha tolto anche una riga vuota già presente.
