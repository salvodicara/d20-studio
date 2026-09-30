# Passaggio visivo 2 — Scheda del personaggio ed elenco dei personaggi

30/09/2026 · worktree `codex/interview-01` (lavoro non committato) · un solo scrittore
(Claude Code, Opus 5.5) · sessioni del browser `d20-visual2-sheet` (catture e percorsi) e
`d20-visual2-sheet-dbg` (sonde, misure, axe) · server `http://127.0.0.1:8879/` · solo dati
sintetici.

File riservati e cambiati (in `design/blueprint/`): `characters.mjs`, `characters.css`,
`sheet-plus.mjs`, `sheet-plus.css`, `character-library.mjs`, `character-library.css`,
`DESIGN.md` (solo la nuova sottosezione «Scheda» in coda al §4), il test nuovo
`tests/visual2-sheet.test.mjs` e questa nota. `conditions-ui.css` non è cambiato (le regole
del riquadro Condizioni nella scheda stanno in `characters.css`, sotto `.character-conditions`).
Percorsi del browser aggiornati al minimo (vedi «Percorsi aggiornati»): `sheet-plus-journey.js`,
`conditions-fixes-journey.js`, `p3-hp-journey.js`, `p3-roll-engine-journey.js`,
`inventory-plus-journey.js`.

Indicazione dell'owner (29/09): copiare i prodotti esistenti «a mani basse», un riferimento per
ogni scelta. Compito: scheda come la scheda desktop di D&D Beyond (fascia in alto, tre colonne,
striscia Iniziativa/CA/Difese/Condizioni sopra le sezioni), niente valori doppi, sul telefono
il modello della scheda mobile di D&D Beyond; elenco come «My Characters» con i collegamenti a
piè di card.

## In breve (prima → dopo)

| Superficie                           | Prima                                                                                                                                                                                                                                                                                                                                   | Dopo                                                                                                                                                                                                                                                                                                                                                                                              | Copiato da                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Scheda, 1440**                     | una colonna lunga: riquadri PF/CA/Movimento/Risorse (il PF alto 437 px, mezzo schermo vuoto a destra), poi un pannello con Gioco/Modifica, pillole CA/Iniziativa/Competenza/Percezione passiva/Velocità/Difese, caratteristiche, effetti e preferiti, poi le schede; TS, sensi e abilità erano la prima sezione delle Azioni (≈ y 1470) | fascia a 12 colonne alta 172 px (sei caratteristiche 97 px, Competenza, Movimento, Ispirazione eroica, Punti ferita 324 px); sotto, a sinistra Tiri salvezza + Sensi + Competenze e addestramento e accanto Abilità (y 559, 324 px ciascuna), a destra Gioco/Modifica e PE, Effetti, Preferiti, la striscia Iniziativa · CA (scudo) · Difese, il riquadro Condizioni largo, poi le schede (y 965) | D&D Beyond (scheda desktop)                              |
| **Valori doppi**                     | CA due volte (riquadro del core e pillola), Velocità due volte (riquadro e pillola), Percezione passiva due volte (pillola e Sensi), Difese due volte (pillola ed elenco nelle Azioni), velocità elencate anche nei Sensi                                                                                                               | un numero per valore sullo schermo (misurato: 1 CA visibile, 1 velocità visibile): CA = box dell'area nella striscia, Velocità = riquadro Movimento nella fascia, Percezione passiva = riga dei Sensi (ora apre le sue modifiche), Difese = box della striscia                                                                                                                                    | D&D Beyond (ogni numero in un posto)                     |
| **Risorse del turno, Indebolimento** | riquadro «Risorse del turno» con ●/○ accanto ai PF; Indebolimento e condizioni dentro il riquadro PF                                                                                                                                                                                                                                    | risorse in testa alla scheda Azioni con i simboli BG3 (cerchio, triangolo, stella; spesa = sagoma vuota); condizioni e Indebolimento nel riquadro Condizioni della striscia; a 0 PF il riepilogo con i tiri contro la morte torna nel riquadro PF                                                                                                                                                 | BG3 (hotbar), D&D Beyond (Conditions, Death Saves)       |
| **Intestazione**                     | «Maga · LIVELLO 3» sopra il nome, bottone «Ispirazione eroica» nell'intestazione                                                                                                                                                                                                                                                        | nome, poi «specie · classe · Livello», nota di controllo; l'Ispirazione è un box della fascia                                                                                                                                                                                                                                                                                                     | D&D Beyond (intestazione)                                |
| **Tablet (1024)**                    | la colonna lunga del desktop                                                                                                                                                                                                                                                                                                            | caratteristiche su una riga, poi Competenza/Movimento/Ispirazione/PF; colonna sinistra (316 px) accanto alla colonna delle sezioni (596 px)                                                                                                                                                                                                                                                       | D&D Beyond (tablet)                                      |
| **Telefono e cassetto del Tavolo**   | intestazione, schede, poi tutti i riquadri (PF, CA, Movimento, Risorse, barra) e il contenuto dopo ≈ 1500 px                                                                                                                                                                                                                            | intestazione, striscia delle sezioni con «Caratteristiche» e «Abilità» in testa, riquadri rapidi (PF + Ispirazione; Competenza, Movimento, Iniziativa, CA; Difese in una riga; Condizioni), poi una pagina: il contenuto della scheda Azioni parte a y 1196; lo stesso nel cassetto del Tavolo (724 px)                                                                                           | D&D Beyond mobile                                        |
| **Personaggi (elenco)**              | per card un bottone oro «Apri scheda», «Copia», «Elimina» contornato rosso, «Gestisci»; campagna come chip                                                                                                                                                                                                                              | «Campagna: …» come riga sotto la classe; a piè di card, sotto un filo, APRI SCHEDA · GESTISCI · COPIA · ELIMINA come collegamenti in maiuscoletto (Elimina rosso); l'unico bottone pieno della pagina resta «Crea personaggio»                                                                                                                                                                    | D&D Beyond «My Characters» (VIEW · EDIT · COPY · DELETE) |

## Riferimenti studiati (30/09/2026)

Immagini ufficiali salvate fuori dal repository in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual2/sheet/references/`:

- `ddb-desktop-sheet-dice.jpg` — articolo D&D Beyond «How to Customize Your Character Sheet»
  ([immagine](https://www.dndbeyond.com/attachments/9/531/character-sheet-customizations-desktop-dice.jpg)):
  intestazione (ritratto, nome, MANAGE, «Male Human Wizard 7», «Level 7», SHARE / SHORT REST),
  fascia STRENGTH…CHARISMA · PROFICIENCY BONUS · WALKING SPEED · INSPIRATION · HIT POINTS
  (HEAL / quantità / DAMAGE, CURRENT / MAX / TEMP), colonne SAVING THROWS · SENSES ·
  PROFICIENCIES & TRAINING a sinistra, SKILLS accanto, a destra INITIATIVE · ARMOR CLASS
  (scudo) · DEFENSES · CONDITIONS sopra ACTIONS / SPELLS / INVENTORY / FEATURES & TRAITS /
  DESCRIPTION / NOTES / EXTRAS e i filtri ALL / ATTACK / ACTION…
- `ddb-mobile-sheet.jpg` — stesso articolo
  ([immagine](https://www.dndbeyond.com/attachments/9/523/character-sheet-customizations-mobile.jpg)):
  intestazione con HIT POINTS e INSPIRATION a destra, riga PROFICIENCY · WALKING · INITIATIVE ·
  ARMOR CLASS con i bottoni DEFENSES e CONDITIONS, poi la pagina (caratteristiche 3 × 2, tiri
  salvezza) e il menu delle sezioni.
- «My Characters»: forum D&D Beyond (le opzioni di ogni personaggio sono View, Edit, Copy e
  Delete; «The delete word is colored red»); nessuna immagine ufficiale raggiungibile (la pagina
  di supporto risponde 403): le righe restano «conoscenza del prodotto».
- Già nel sistema: `2026-09-29/visual/system/references/ddb-sheet-desktop.jpg` e
  `ddb-underdark-mobile.jpg`, `bg3-resource-icons.png`.

Le scelte, una per riga con il prodotto copiato, stanno in
[DESIGN.md §4 «Scheda»](../../design/blueprint/DESIGN.md).

## Modifiche

- **`characters.mjs`**: la scheda è `.character-sheet > .character-layout` con
  `.character-band` (sezioni della pseudo-scheda nuova `band` + `.character-vitals` con
  Movimento, CA del core, Ispirazione, PF), `.character-body` (`.character-side` con le sezioni
  della pseudo-scheda nuova `side`; `.character-main` con `.character-summary` — sezioni
  `summary`, riquadro `.character-conditions`, avviso della pozione — poi la striscia delle
  sezioni, le sotto-schede e il contenuto). Pagine del telefono: `tab=abilities` e `tab=skills`
  (`SHEET_PAGES`), bottoni `.character-page-tab[data-character-page-tab]` nella striscia (non
  `data-character-tab`: le categorie contate dai percorsi restano le stesse), anche nel dialogo
  «Tutte» quando la striscia li mostra; `data-character-page` sulla scheda. `renderVitals`
  diventa `renderBand`, `hpCard`, `conditionsBox`, `turnResources`; `headingLine` usa
  `speciesOf` di `character-export.mjs`. La CA del core ha `hidden` quando c'è l'area della
  scheda (resta il ripiego senza di essa).
- **`sheet-plus.mjs`**: sezione nuova `sheet-plus-band` (pseudo-scheda `band`: sei
  caratteristiche e Competenza); `sheet-plus-derived` passa dalla scheda Azioni alla
  pseudo-scheda `side`; nella barra le pillole seguono l'ordine della striscia (Iniziativa, CA,
  Difese) dopo Effetti e Preferiti; Percezione passiva tolta dalla barra (è nei Sensi, come
  bottone `data-shp="stat" data-key="passive-perception"`); pillole del senso e della velocità
  con `hidden` (duplicati, vedi Scostamenti); `data-shp-stat` su ogni pillola; riquadro nuovo
  «Competenze e addestramento» (armi di `combatProfile.weaponProficiencies`, lingue di
  `knownLanguages`: niente dedotto dalla classe); dai Sensi tolti l'elenco delle velocità e delle
  difese (restano «Gestisci sensi» e «Gestisci velocità»); Escape spegne i tooltip anche della
  fascia (`.shp-band`).
- **`character-library.mjs`**: card con «Campagna: …» come riga (`p.clib-campaign`, stesso
  `data-clib-personal`), comandi `text-button clib-link` nell'ordine di D&D Beyond (Apri scheda,
  Gestisci, Copia, Elimina), stessi `data-*` e nomi accessibili; tolto `actButton`.
- **CSS**: griglia a 12 colonne condivisa da fascia e corpo; container query sulla scheda
  (`character-sheet`, soglie 1099 e 899 px), sulla colonna delle sezioni (`character-main`, 620
  px: «Tutte») e sulla colonna sinistra (`character-side`, 520 px: riquadri in pila); con testo o
  interfaccia ingranditi (`:root[data-pref-scaled="on"]`) la fascia usa le due righe del tablet
  (le container query misurano pixel CSS che la scala dell'interfaccia non ingrandisce). Nel
  modello a pagine i contenitori vanno in `display: contents` e una griglia a quattro colonne
  dispone i riquadri; i loro agganci restano nel DOM.

Agganci conservati: `data-character-action`, `data-character-tab`, `data-character-subtab`,
`data-character-tabs-all`, `.character-vitals .stat` (la CA è sempre il secondo `.stat`),
`.character-hp` e il suo primo `strong`, `data-character-ac`, `data-character-speed`,
`.shp-bar` con pillole, modalità, annulla, PE, effetti e preferiti, `.shp-derived` con
`data-shp-save`/`data-shp-skill`/`.shp-pinned`, `data-conditions-*`, `data-clib-*`,
`data-character-card`, «Apri scheda», «Gestisci personaggio» nella riga del breadcrumb.

## Verifiche

- **Suite Node**: `node --test design/blueprint/tests/*.test.mjs` → **2580/2580** (con i 6 test
  nuovi di `tests/visual2-sheet.test.mjs`: ordine di lettura fascia → colonne → striscia →
  schede, un solo numero per CA/velocità con i duplicati nascosti, risorse del turno solo nelle
  Azioni, Condizioni nella striscia e nel riquadro PF a 0 PF, pagine del telefono con un solo
  `aria-current`, piede delle card).
- **Percorsi del browser** (copie con la sola cartella d'uscita spostata in
  `visual2/sheet/journeys/out/`, uno per comando, `alarm 200`): **passano** `sheet-plus` (copia
  locale, vedi Consegne 1), `conditions-fixes`, `p3-hp` (con axe sul dialogo PF),
  `p3-roll-engine`, `conditions-mobile`, `character-library`, `character-library-review`,
  `b62-ia`, `b62-review-fixes`, `w2a2-shell`, `inventory-plus`, `damage-tray`, `token-menu`,
  `media`, `homebrew-editor`, `spells-plus`, `offline`, `rest-mobile-personal`, `rest-shared`,
  `p4-rest`, `projects`, `home`, `party`, `dice-tray-review`. **Falliscono fuori dalla scheda**
  (Tavolo, passaggio concorrente): `preferences` (passaggio del mouse sulla colonna degli
  attrezzi intercettato da `.table-party-portrait`), `w2b1-shell` (dock del combattimento del DM
  a 1440: «3 rows of dock commands») — la parte della scheda di `w2b1-shell` (nessuno
  scorrimento orizzontale sulle schede di Livia e Doran) passa dopo la correzione qui sotto.
- **Difetto trovato dai percorsi e corretto**: a 1440 la scheda di Doran vista dal DM scorreva di
  lato di 128 px (una nota «perché è spento» larga 759 px negli strumenti di un'azione, ora
  nella colonna di 664 px): gli strumenti dell'azione hanno ora una larghezza propria e la nota
  va a capo (`contain: inline-size`).
- **Sonda della scheda** (`scripts/sheet-sweep.js`, 138 visite: elenco e tutte le categorie e
  pagine, giocatore e DM, 1440 / 1024 / 800 / 390 e 150 % testo + 125 % interfaccia a 390 e 1440):
  0 px di scorrimento orizzontale; bersagli della scheda e delle card ≥ 40 px (prima del lotto:
  +13 px a 1440 ingrandito nel riquadro Condizioni e «Temporanei, massimo e registro…» alto 32 px:
  corretti). Risultato finale in `logs/sheet-sweep-final.log`.
- **axe-core 4.12.1** (installazione locale) su `#content`, WCAG 2 A/AA **con** contrasto:
  elenco e scheda, scuro e chiaro, 1440 e 390 (più le pagine Caratteristiche e Abilità): 0
  violazioni.
- **Tastiera** (1440): dall'intestazione il Tab passa per la fascia (FOR…CAR, Competenza,
  Movimento, Ispirazione, PF), poi la colonna sinistra (TS, Sensi, Abilità), poi la striscia e le
  schede: l'ordine del documento è quello della lettura; anello visibile su ogni fermata.
  Telefono: Invio su «Caratteristiche» apre la pagina (TS visibili, abilità e contenuto
  nascosti), il fuoco resta sulla scheda.
- **Contrasto dei colori nuovi** (WCAG sui token): collegamenti delle card 9,0:1 scuro / 6,9:1
  chiaro, Elimina 7,2 / 7,0; secondario sui riquadri 8,1 / 6,6; PF temporanei `--hp-temp` 5,3
  scuro, 4,2 chiaro → numero portato a 21 px grassetto (testo grande, soglia 3:1); stella
  dell'Ispirazione 4,6 / 4,5 (oggetto grafico); risorsa spesa: contorno in `--muted` (8,1 / 6,6;
  `--res-spent` dava 2,7 nel chiaro).
- **Misure** (`logs/measure.log`, 1440): fascia 172 px; caratteristiche 97 px; PF 324 px; TS e
  Abilità da y 559 (prima ≈ 1470); striscia da y 699; schede da y 965 (prima ≈ 1240); pagina
  4781 px (prima 5374).

## Percorsi aggiornati (minimo, senza togliere controlli)

1. `sheet-plus-journey.js`: il tooltip dell'Iniziativa si raggiunge con **Maiusc+Tab** dalla CA
   (la striscia di D&D Beyond mette l'Iniziativa prima della CA); sul telefono, prima di leggere
   «Play» e toccare Benedizione e il TS, un tocco su «Caratteristiche» (dove stanno Gioco /
   Modifica, effetti e tiri salvezza).
2. `conditions-fixes-journey.js`: l'unica voce «Danni, cure e condizioni» si cerca nel riquadro
   Condizioni (`.character-conditions`) invece che nel riquadro PF.
3. `p3-roll-engine-journey.js`: «+ Condizione», chip e Indebolimento nel riquadro Condizioni.
4. `p3-hp-journey.js`: voce del pannello e «+ Condizione» della concentrazione nel riquadro
   Condizioni; tiri contro la morte, «Riporta a 1 PF», «Morto» e il widget PF restano nel
   riquadro PF (a 0 PF il riepilogo torna lì).
5. `inventory-plus-journey.js`: prima dei due trascinamenti, la testa dello Zaino va 150 px sotto
   il bordo della finestra (prima del primo non c'era scorrimento, il secondo usava 250 px): nella
   colonna delle sezioni le righe sono più alte e l'origine usciva dalla finestra.

## Immagini

Cartella `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual2/sheet/`:

- `before/` e `after/` × `1440x900` / `390x844` × `dark` / `light`: per giocatore e DM `library`
  (e `library-full` sul telefono), `sheet-livia` e `sheet-livia-full`, per il DM anche
  `sheet-goblin-1(-full)`, `sheet-spells`; in `after/` anche `sheet-abilities` e
  `sheet-skills` sul telefono (le pagine nuove). 44 coppie in `compare/` (prima | dopo).
- `references/`, `scripts/` (modello di cattura, esecutori, sonde, axe, tastiera, misure),
  `journeys/` (copie eseguite; `out/` le loro immagini), `logs/`, `src-before/` (copie dei file
  prima del lavoro).

## Scostamenti dichiarati

- **Duplicati nascosti, non tolti**: i test esistenti (`p2-sheet.test.mjs` PG-25/PG-30/PG-70,
  `sheet-plus.test.mjs`) leggono sia il riquadro CA del core sia la pillola CA, e la pillola della
  velocità e del senso nel markup; restano nel DOM con `hidden` (fuori dall'albero accessibile).
  Toglierli richiede di aggiornare quei test (file non riservati).
- **Un solo «Riposa»** invece di Short Rest / Long Rest: il pannello dei riposi li contiene
  entrambi e `rest-shared-journey` cerca un solo bottone.
- **«Gestisci personaggio» resta nella riga del breadcrumb** (in alto a destra, con
  «Condividi»), non accanto al nome come MANAGE: `character-library.test.mjs` fissa quella
  posizione.
- **Riga della card «Maga · Livello 3 · Elfo»** invece di «Lvl 3 | Elf | Wizard»: l'ordine è
  fissato da test e percorsi.
- **Riquadro PF**: la quantità sopra Cura e Danno affiancati (D&D Beyond li impila con la
  quantità in mezzo): tre bottoni da 40 px in colonna allungavano la fascia a oltre 200 px.
- **Riquadro Condizioni largo sotto Iniziativa · CA · Difese** invece che quarto della stessa
  riga: il nostro riepilogo (stato, condizioni, «+ Condizione», Indebolimento 1–6, voce del
  pannello) è più ricco del «Add Active Conditions» di D&D Beyond; in un quarto di colonna era
  alto 260 px (la disposizione larga è quella del tablet di D&D Beyond).
- **Gioco / Modifica, PE, Effetti e Preferiti sopra la striscia**: nessun prodotto di
  riferimento li mette lì; sono i controlli della barra dell'area, nella colonna delle sezioni.
- **Telefono**: la pagina iniziale resta la categoria del percorso (Azioni), non «Abilities»
  come D&D Beyond: il percorso di default, il dialogo «Tutte» e `w2a2-shell` la segnano come
  aperta. Gioco / Modifica ed effetti stanno nella pagina «Caratteristiche». Il modello a pagine
  vale fino a 899 px di larghezza della scheda (anche tablet in verticale e cassetto del Tavolo).
- **Ordine visivo e DOM**: sul telefono i riquadri rapidi vengono prima della striscia delle
  sezioni nel documento ma dopo di essa sullo schermo (la striscia resta subito sotto
  l'intestazione e fissa, come prima); sul desktop l'ordine coincide.
- **Specie nell'intestazione** solo quando la scheda la registra (Livia non ha `speciesId`).
- **Competenze e addestramento** mostra solo armi e lingue registrate: armature e strumenti non
  sono nei dati delle schede di esempio.

## Consegne (fuori da questo passaggio)

1. **Tavolo** (passaggio concorrente): `sheet-plus-journey.js` passo J legge
   `.table-sidebar-panel` «12 m Movimento», che il pannello della creatura non scrive più (ora
   «In uso: Volare · movimento 12 m» nel riquadro dell'area): la copia locale `sheet-plus-tablefix`
   accetta anche quella frase e passa tutta; il file del repository va aggiornato da chi possiede
   il Tavolo. `preferences-journey` e `w2b1-shell` falliscono sul Tavolo (vedi Verifiche).
2. Test da aggiornare per togliere i duplicati nascosti (CA del core, pillole velocità e senso).
3. `damage.css`: «Cura»/«Danno» disabilitati poco leggibili nel tema chiaro (consegna già aperta).
4. Elenco di ripiego del core (`renderCharacters` senza l'area della libreria) tiene ancora il
   bottone oro «Apri scheda»: non è mai visibile nell'app.
5. Il riquadro PF resta alto 172 px (bottone dei numeri 44 px, «Temporanei, massimo e registro…»
   40 px): accorciarlo richiede di cambiare il widget di `damage.css` / `hp-widget.mjs`.
