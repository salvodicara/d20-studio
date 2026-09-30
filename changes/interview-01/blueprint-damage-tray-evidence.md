# B33 — Danni, cure e registro dei PF · evidenza

24/09/2026 (cartella delle prove datata 2026-09-25 come da incarico). Area `damage-tray` (scheda
B33 di `docs/interview/CAPABILITY_CENSUS.md`, capacità TV-25, TV-68, TV-69, PG-22). Worktree
`d20-studio-interview-01`, branch `codex/interview-01`, lavoro non committato. Solo dati
sintetici: campagna `lanterns`, scena `old-watch`, Livia, Doran, la Sentinella e l’Esploratore,
più un **Fantasma** aggiunto dal compendio SRD (resistente al fuoco, immune a veleno e
necrotico: SRD 5.2.1 EN 287–288 / IT 334). Regole: SRD 5.2.1 EN/IT, PDF ufficiali verificati
per hash (EN `8974902d…`, IT `a7b88b0c…`) e pagine stampate.

## In breve, per il proprietario

- **Dove:** al Tavolo, scheda **Creatura** della barra laterale destra: in cima
  **«Da applicare»** (il vassoio dei danni di dnd5e, che sostituisce la lista semplice di B20),
  sotto **«Punti ferita»** della creatura selezionata (il riquadro PF di D&D Beyond). Lo stesso
  riquadro si apre dal **menu della pedina** («Punti ferita…»), dal **valore dei PF nel tracker**
  (B32) e, sulla **scheda**, sta dentro la casella dei PF (Cura · numero · Danno) con «Temporanei,
  massimo e registro…» che apre il pannello completo, come la barra laterale PF di D&D Beyond.
  Sulla mappa: anello rosso tratteggiato con goccia per **Sanguinante**, velo scuro con croce per
  **Morto**, e la pillola «N da applicare» con il danno **dopo** le difese.
- **Cosa fa:** (1) per ogni bersaglio di un attacco o incantesimo in automazione assistita il
  vassoio mostra danno, TS riuscito (metà), **chip** delle difese (resistenza, immunità,
  vulnerabilità: clic per spegnerle, immunità «declassabile» a resistenza con motivo
  obbligatorio), **moltiplicatori** ×0 ×¼ ×½ ×1 ×2 e il risultato sui PF (anche «Sanguinante» o
  «Morto»); **nulla cambia prima di «Applica»**; «Applica a tutti» è un solo passo di Annulla.
  In campagna «Automatica» le difese si applicano da sole (come Shieldmaiden). (2) Un solo
  controllo PF: importo tra **Cura** e **Danno**, tipo di danno con le stesse chip, PF
  temporanei (non si sommano: tieni o prendi i nuovi), **modifica del massimo con nota**,
  **Registro PF** della creatura con **Annulla solo questa voce** e **Riapplica** (Damage Log di
  Foundry), conseguenze dipendenti segnalate. (3) I giocatori **propongono** al DM danni, cure o
  una condizione (Improved Initiative): il DM accetta (anche con chip e moltiplicatore) o
  rifiuta con motivo; campana per entrambi. (4) Il DM decide in Preferenze se i giocatori vedono
  Sanguinante/Morto sulle sue creature (D&D Beyond).
- **Tutti i PF passano dal dominio delle condizioni** (incremento 10): `applyReadyOutcome` →
  `applyVitalityEvent` per il vassoio; `applyVitalityChange` per widget, proposte, annulli e
  riapplicazioni; `applyConditionChange` per le condizioni proposte. Nessuna scrittura diretta
  di `actor.hp`.
- **Verifica:** 14/14 test Node dell’area; suite completa **1887/1887**; percorso nel browser
  **10/10 gruppi**, due esecuzioni consecutive sul codice finale, `errors: []`; i percorsi di
  B20 (15/15) e B32 (19/19) rieseguiti in copia restano verdi con le mie modifiche.

## File

Nuovi (miei):

- `design/blueprint/damage-tray.mjs` — registrazione e interfaccia del vassoio, pannelli della
  scheda Creatura, voce del menu della pedina, riquadro della scheda, livelli della mappa
  (stati e pillola), notifiche, impostazioni di campagna, dialogo PF.
- `design/blueprint/hp-widget.mjs` — il widget PF unico (markup e gestori, uguali su ogni
  superficie), chip e moltiplicatori condivisi con il vassoio, registro PF, dialogo «Annulla una
  voce», proposte.
- `design/blueprint/damage-domain.mjs` — dominio puro (in più rispetto alla scheda, come B32):
  difese, ordine di applicazione, righe del vassoio, comandi PF, proposte, registro e annulli.
- `design/blueprint/damage.css` — stili con prefisso `.dt-` (più `.ct-hp-button` per il tracker).
- `design/blueprint/tests/damage-tray.test.mjs` — 14 test (dominio con il vero store, motore di
  combattimento, dominio delle condizioni e registro; interfaccia su un doppione minimo del DOM).
- `changes/interview-01/blueprint-checks/damage-tray-journey.js` — percorso nel browser (nome
  dall’incarico; la scheda del censimento diceva `damage-journey.js`).
- Questo rapporto.

Stato: sezione `state.ext["damage-tray"]` (Undo a istantanea): difese registrate dal DM, dettagli
delle voci inserite dal widget (tipo, difese, nota, superficie), annulli e riapplicazioni del
registro, modifiche del massimo con nota, proposte. Impostazioni di campagna (solo DM)
`damage-tray-policy.token-states` e `damage-tray-policy.suggestions`, entrambe accese di base.

### Modifiche condivise (solo aggiunte, firme e comportamento invariati)

| File | Modifica | Perché |
| --- | --- | --- |
| `combat.mjs` | `adjustDamageWith(adjuster)` e, in `applyDamage`, la chiamata all’adattatore se il danno non porta già una decisione (`extra.adjustment`) | difese del bersaglio applicate a ogni danno del motore (automatico e «Applica» semplice) nella stessa transazione; senza area registrata il danno resta quello tirato |
| `combat.mjs` | `applyReadyOutcome(state, attemptId, actorId, role, options = {})` con `options = {amount, adjustment, darts?}` | la decisione del vassoio (moltiplicatore, chip, declassamento) sostituisce le difese automatiche; senza `options` identico a prima |
| `characters.mjs` | in `renderVitals`, dentro la casella PF, gli slot `sheet-section` con pseudo-scheda `"vitals"` | il riquadro PF di D&D Beyond sta nella casella dei PF (DDB-032); il bind esistente di `sheet-section` li collega già |
| `combat-tracker.mjs` | `hpCell`: il valore PF diventa un pulsante se esiste la voce `token-menu` `damage-tray-hp`; gestore `[data-ct-hp]` che la esegue | DDB-142 «aperto dal valore PF nella lista»; senza l’area resta testo |
| `campaign-settings.mjs` | `when` del pannello `campaign-settings-ready` e `readyLayer` si fanno da parte se esiste il pannello `damage-tray` | un solo posto per applicare: il vassoio è la lista B20 con in più difese e moltiplicatori; conserva riga («Esploratore · 5 danni · da Livia»), «Apri la carta» e gli attributi `data-cs-ready`/`data-cs-apply-ready`/`data-cs-open-card` |

`extensions.mjs` elencava già l’area. `prettier --check` sui file toccati: conforme; l’unico
avviso residuo in `combat.mjs` (riga 503, `"long-range"`) è di un’altra area in costruzione.

## Capacità → percorso → prova

| Capacità (censimento) | Percorso nell’app | Comandi ed esito | Regola / fonte | Pattern adottato | Prova |
| --- | --- | --- | --- | --- | --- |
| **TV-68** Anteprima dei danni per bersaglio, difese attivabili, moltiplicatori | Tavolo → scheda Creatura → «Da applicare» (0 clic se la scheda Creatura è aperta; la pillola sulla mappa e la campana la segnalano) | Mani brucianti fisico 2+2+1 = 5 fuoco; TS Sentinella 5 fallito, Esploratore 20 riuscito, Fantasma 3 fallito → PF 7/9/45 invariati; carta «Mani brucianti · Livia · 5 danni da Fuoco», righe «Applica 5», «TS riuscito: metà · Applica 2», Fantasma chip «Resistenza · Fuoco» → «5 → resistenza 2 · PF 45 → 43» e «Applica 2»; Spazio spegne la chip (Applica 5, fuoco resta), Invio la riaccende; «Applica a tutti (3)» → 2/7/43, anello Sanguinante sulla Sentinella; «Apri la carta» apre la carta d’attacco | metà su TS riuscito EN 16 / IT 18; resistenza, vulnerabilità, niente cumulo, ordine (moltiplicatori → resistenza → vulnerabilità), immunità EN 17 / IT 19; Sanguinante EN 16, 177 / IT 18, 214 | vassoio dnd5e con chip e moltiplicatori (FVT-139) sulla carta con «Applica» di chi controlla il bersaglio (FVT-138); Shieldmaiden colpito/metà/doppio e tipi con difese automatiche (CMP-172, CMP-173); ×¼ di AboveVTT (VTL-164) | test «(1) Burning Hands…», «automatic campaigns…», «UI: tray chips…»; percorso 1; «Apri la carta» e «Applica» dal vassoio anche nel percorso B20 rieseguito in copia (15/15); `b33-01-tray-burning-hands-it-1440.png` |
| TV-68 · declassare un’immunità (accettazione 2) | Fantasma → Creatura → Punti ferita → Tipo «Veleno» | chip «Immunità · Veleno»; «Declassa a resistenza…» porta il fuoco al motivo obbligatorio; Danno senza motivo rifiutato sul posto (43 invariati); con «Veleno magico del drago» 10 → 5, PF 43 → 38, il fuoco torna all’importo; nel registro «Veleno 10 → 5 (resistenza) · immunità declassata a resistenza: Veleno magico del drago» | immunità EN 17 / IT 19; il declassamento è discrezione del DM registrata con motivo (I-028) | «downgrade an immunity to resistance» di dnd5e (FVT-139) | test «(2)…», «UI: widget handlers…»; percorso 2; `b33-02-downgrade-log-it-1440.png` |
| **PG-22** Un solo controllo PF identico ovunque (accettazione 3) | scheda (casella PF) · pedina (Creatura e menu «Punti ferita…») · tracker (valore PF) | stessi controlli nel dialogo da scheda, menu e tracker (verificato sugli attributi); Livia 5 temporanei, Danno 8 → «5 assorbiti dai temporanei (5 → 0) · PF 18 → 15»; Cura 4 → 19, «i temporanei restano 0»; massimo +5 nota «Aiuto (2° livello)» → 27 «(base 22)» con «Togli»; dal tracker Danno 3 → 16 e il dialogo si ridisegna | PF temporanei assorbono per primi, non si sommano (tieni o prendi), non sono cura EN 18 / IT 20; tetto della cura EN 17 / IT 19; massimo 0 = morte EN 17 / IT 19 (rifiutato) | riquadro PF di D&D Beyond su scheda, tracker e pedina (DDB-032, DDB-142); campo tra rosso e verde di Roll20 (R20-025); temporanei e overkill di Shieldmaiden (CMP-169) | test «(3)…», «UI: widget handlers…»; percorso 3; `b33-03-sheet-box-it-1440.png`, `b33-03b-sheet-hp-sidebar-it-1440.png`, `b33-04-tracker-dialog-it-1440.png` |
| Registro PF: annullare una voce e riapplicarla (accettazione 4; lega TV-66, X-03) | Punti ferita → «Registro PF (n)» | Fantasma: «Annulla» sulla voce **più vecchia** (Mani brucianti), non l’ultima → dialogo «PF: 38 → 40», «c’è un altro cambio di PF…», motivo precompilato → 40; voce «Annullata: Voce registrata per errore» con «Riapplica» → 38 «riapplicata»; Sentinella uccisa con 5 (velo e croce) → «Annulla» propone «ha causato «Morto»» (spuntato) → PF 2, viva; su telefono EN «HP: 7 → 10» | correzione motivata, mai spacciata per cura/resurrezione (dominio condizioni); una correzione non porta a 0 PF (rifiutata con il motivo) | Damage Log di Foundry: annulla o riapplica una voce (FVT-144); Shieldmaiden annulla l’ultima (CMP-175) | test «(4)…», «(4b)…»; percorso 4 e telefono; `b33-05-undo-entry-dialog-it-1440.png`, `b33-06-log-reapplied-it-1440.png`, `b33-06b-dead-visual-dm-crop.png` |
| **TV-69** I giocatori propongono danni o condizioni, il DM accetta (accettazione 5) | giocatore: Punti ferita → «Proponi al DM»; DM: «Da applicare» → «Proposte dei giocatori» e campana | Livia «Danno 6 «ho preso 6 danni dalla trappola»» → PF invariati, «in attesa del DM»; campana DM «Proposta: danno 6 a Livia», riga con nota, chip e moltiplicatori → «Accetta e applica 6» → 16 → 10, il giocatore legge «accettata: 6 applicati»; seconda proposta 4 → «Rifiuta…» con motivo → PF invariati, «rifiutata: Hai superato il TS: nessun danno»; sull’Esploratore (creatura del DM) il giocatore non ha Danno, solo «Proponi»: «Condizione › Prono» → DM «Accetta e applica Prono» → Prono registrato con origine «Proposta del giocatore: …» | la decisione resta al DM (I-028); condizioni SRD senza Indebolimento, che ha il suo comando a livelli | suggerimenti danno e tag del giocatore, accettati dal DM (Improved Initiative VTL-129, impostazione «Allow player suggestions» CMP-163) | test «(5)…», «(5b)…»; percorso 5, 5b e telefono (proposta accettata al tocco); `b33-07-proposal-dm-it-1440.png`, `b33-08-proposal-declined-player-it-1440.png`, `b33-12-phone-dm-tray-en-390.png` |
| **TV-25** Sanguinante/Morto visibili o nascosti secondo la politica (accettazione 6) | mappa del Tavolo; DM: Preferenze → «Danni e punti ferita» | anello rosso tratteggiato con goccia (Sanguinante), velo scuro con croce (Morto); il giocatore vede di base l’anello sulla Sentinella; il DM spegne «I giocatori vedono Sanguinante e Morto…» → il DM lo vede ancora, il giocatore no; l’anello di Livia (sua scheda) resta; con la regola B20 «Salute dei nemici: nascosta» sparisce comunque | Sanguinante: metà dei PF o meno EN 16, 177 / IT 18, 214 | effetto automatico a 50% e 0 PF nascondibile nelle impostazioni (DDB-143); stato Bloodied di dnd5e (FVT-125) | test «(6)…»; percorso 6; `b33-09-bloodied-player-crop.png`, `b33-10-policy-hidden-player-it-1440.png` |

Coerenza con il resto dell’app: stessi attori, campagna e scena; automazione dalla regola di
campagna di B20 (assistita/automatica); Fantasma dal compendio di B16 con il suo blocco SRD; le
difese copiate dal costruttore d’incontri (B19) sono lette; i danni dei tiri fisici e digitali
restano quelli del motore e della coda dei tiri esistenti (nessun secondo motore di dadi); ogni
cambio di PF finisce nel registro delle condizioni e quindi nel pannello «Condizioni e stato»;
morte, 0 PF, tiri contro la morte, concentrazione e riposi interrotti seguono i `followUps` del
dominio (`applyConditionFollowUps`, con `manual: true` per i danni inseriti a mano).

## Comandi ed esiti

- `node --test design/blueprint/tests/damage-tray.test.mjs` → **14/14**.
- `node --test design/blueprint/tests/*.test.mjs` → **1887/1887** (un giro precedente aveva 9
  fallimenti transitori in `sheet-plus.test.mjs` e altri file di aree in costruzione in parallelo;
  rieseguiti poco dopo, verdi; nessuno toccava quest’area).
- Percorso: sessione `d20-b33`, cwd
  `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B33/`, server
  `http://127.0.0.1:8879/`:
  `playwright-cli -s=d20-b33 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/damage-tray-journey.js`
  → **10/10 gruppi**, `errors: []`, due esecuzioni consecutive sul codice finale (esito in
  `run-final-2.json`). Contenuto: DM e giocatore IT a 1440 (clic, Spazio/Invio sulle chip, fuoco
  che torna all’importo, clic destro sulla pedina per il menu), reload, «Annulla ultima modifica»
  del core, contesto isolato EN 390 px con tocco (Livia dai ritratti del turno, Danno, Annulla
  voce, proposta accettata dal DM), nessuno scorrimento orizzontale, controlli del widget ≥ 40 px
  (per radio e caselle si misura l’etichetta che le contiene, l’area realmente toccabile).
- Regressione di aree toccate, in copia con le immagini dirottate in `B33/b20-regression/` e
  `B33/b32-regression/` (le prove di B20 e B32 non sono state sovrascritte):
  `campaign-settings-journey.js` → **15/15**, `errors: []`; `combat-tracker-journey.js` →
  **19/19**, `errors: []`.
- Immagini 1440×900 (ispezionate) in quella cartella: `b33-01-tray-burning-hands-it-1440.png`,
  `b33-02-downgrade-log-it-1440.png`, `b33-03-sheet-box-it-1440.png`,
  `b33-03b-sheet-hp-sidebar-it-1440.png`, `b33-04-tracker-dialog-it-1440.png`,
  `b33-05-undo-entry-dialog-it-1440.png`, `b33-06-log-reapplied-it-1440.png`,
  `b33-06b-dead-visual-dm-crop.png` (ritaglio con zoom), `b33-07-proposal-dm-it-1440.png`,
  `b33-08-proposal-declined-player-it-1440.png`, `b33-09-bloodied-player-crop.png` (ritaglio con
  zoom), `b33-10-policy-hidden-player-it-1440.png`; telefono `b33-11-phone-widget-en-390.png`,
  `b33-12-phone-dm-tray-en-390.png`.
- Correzioni fatte dopo l’ispezione delle immagini: sulla scheda il widget intero allungava le
  quattro caselle (PF, CA, Movimento, Risorse) → ora la casella PF ha solo Cura · numero · Danno
  e apre il pannello completo come la barra laterale PF di D&D Beyond; testo delle voci del
  registro ripetuto due volte → una sola spiegazione (attacco, difese, superficie, nota); titolo
  e importo della voce su righe diverse → stessa riga; errore del widget anche come avviso in
  basso → solo nel widget (`role="alert"`); «1 altri cambi» → «un altro cambio»; la pillola di
  B20 mostrava 5 dove il vassoio applicava 2 → pillola con il danno dopo le difese; etichetta
  «Modifica del massimo» che andava a capo → «Massimo ±».

## Limiti onesti

- **Segno ✝ «Morto» del core.** Il distintivo e l’attenuazione delle pedine morte di
  `table.mjs` (incremento 10) restano visibili ai giocatori; l’impostazione di B33 nasconde i
  propri effetti (anello, velo e croce) e la regola B20 le parole. Nascondere anche il segno del
  core è una decisione del coordinatore sul file del core.
- **Tre ingressi ai PF.** Restano il campo PF del menu della pedina di B12 (`-5`, `+3`, `=12`,
  Owlbear VTL-234) e i moduli Danno/Cura/Temporanei/Correzione del pannello «Condizioni e stato»
  (incremento 10). Tutti usano lo stesso dominio e compaiono nello stesso registro PF, ma PG-22
  chiede un solo controllo: accorparli è una decisione per chi possiede quei file.
- **Testo di B19 superato.** Il costruttore d’incontri scrive «Resistenze, immunità e
  vulnerabilità ai danni si applicano a mano: il Tavolo non le calcola» (`encounter-builder.mjs`):
  ora il Tavolo le calcola. Non è un file mio: va corretto da chi lo possiede.
- **Carta d’attacco.** La carta in «Tiri e risultati» mostra il danno applicato dopo le difese,
  non il dettaglio (resistenza, moltiplicatore): il dettaglio sta nel vassoio, nella pillola e
  nel registro PF.
- **Difese conosciute.** Da registrazione del DM (Punti ferita → «Difese ai danni»), dal blocco
  copiato dal costruttore d’incontri o dal blocco SRD del compendio; Pietrificato aggiunge
  resistenza a tutti i danni. Le creature d’esempio e i personaggi non ne hanno registrate (il
  vassoio lo dice); nessuna difesa ricavata da specie o privilegi del costruttore.
- **Tipo nascosto.** Se il giocatore non vede l’attaccante, il tipo di danno non gli viene
  rivelato: la sua riga applica le difese senza chip, con la nota «tipo non rivelato».
- **Annulla una voce** corregge i valori attuali (come Damage Log), non riscrive la storia:
  condizioni causate, concentrazione interrotta e riposo del knockout sono segnalati, non
  annullati; annullare una cura che porterebbe a 0 PF è rifiutato (una correzione non fa cadere
  a 0). «Riapplica» rifà lo stesso cambio sui valori attuali, con le conseguenze ricalcolate.
- **Scelte del vassoio** (chip spente, moltiplicatore, motivo in scrittura) vivono nel browser
  fino ad «Applica», come la carta di dnd5e; applicate, restano registrate con l’esito.
- **Massimo:** elenco di modifiche con nota (D&D Beyond); non alza i PF attuali (l’aumento dei PF
  attuali di Aiuto va registrato come cura). **Temporanei:** con temporanei già presenti si
  sceglie esplicitamente se tenerli o prendere i nuovi (SRD), mentre D&D Beyond sostituisce.
- **Proposte** e avvisi sono locali a questo browser (dimostrazione a due identità, nessuna
  rete); una condizione proposta è registrata con termine manuale. I giocatori non applicano
  danni a creature che non controllano (Effective Tray FVT-143 non adottato: passa dalla
  proposta).
- Pillole e anelli si sovrappongono quando le pedine sono vicine alla scala della mappa a 1440
  (come la pillola di B20). Solo Chromium tramite Playwright; nessun backend.

## Revisione e correzioni (B33-rf, 24/09/2026)

Revisore-correttore indipendente (non ha costruito l’area). Sessione `playwright-cli` `d20-b33-rf`,
cwd `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B33-rf/`, server
`http://127.0.0.1:8879/`. Metodo: lettura completa di `damage-tray.mjs`, `hp-widget.mjs`,
`damage-domain.mjs` e delle aggiunte condivise; percorso del costruttore rieseguito come base
(**10/10**, `errors: []`, immagini in `B33-rf/baseline/`); esplorazione nel browser; sonde Node sul
dominio con il vero store. Ogni correzione è stata scritta prima come test che falliva.

### In breve, per il proprietario

- **Annulla sulla carta d’attacco tornato.** Dopo «Applica» dal vassoio la carta in «Tiri e
  risultati» non offriva più «Annulla» (lo faceva con la lista di B20): ora sì.
- **Annullare una caduta a 0 PF toglie anche Privo di sensi e Prono.** Prima Livia tornava a 18 PF
  ma restava svenuta e a terra. Ora il dialogo lo propone (spuntato), come già per «Morto».
- **Il massimo dei PF e il suo elenco restano allineati.** Annullando «+5 Aiuto» dal registro il
  massimo tornava 22 ma «+5 · Aiuto» restava in elenco: «Togli» l’avrebbe portato a 17.
- **Piccole cose:** il numero scritto non si perde più a ogni clic; l’anteprima usa quel numero
  (non un 10 d’esempio); il giocatore non scopre le resistenze di un mostro dalla risposta del
  DM; «N oltre lo 0» quando si va sotto zero; Dardo incantato spiegato dardo per dardo; registro
  PF con «Mostra tutte le voci»; «Proponi al DM» solo dove la proposta è accettata; il fuoco resta
  sulla scheda Creatura dopo «Applica a tutti».

### Esiti

| # | Gravità | Problema e riproduzione | Esito |
| --- | --- | --- | --- |
| R1 | P2 | **Regressione B20: niente «Annulla» sulla carta dopo il vassoio.** Mani brucianti assistito → «Da applicare» → «Applica a tutti» → campana › «Tiri e risultati»: nessun `[data-undo-outcome]` (verificato nel browser, `explore3.js`). `undoControl` di `combat-ui.mjs` riconosce solo l’etichetta «Danni applicati», il vassoio usava «Danni applicati: Sentinella» / «…a tutti i bersagli». | **Corretto.** Il commit del vassoio usa esattamente «Danni applicati» (i nomi restano nell’avviso). La voce d’audit è privata solo se tutti i bersagli sono creature del DM: il danno al personaggio di un giocatore è registrato per tutti, come l’«Applica» di B20. Test «review: the tray's Apply keeps B20's commit label…»; percorso gruppo 1 (la carta mostra «Annulla»). |
| R2 | P2 | **Annullare la voce che ha portato a 0 PF lasciava Privo di sensi e Prono.** Livia 20 danni dal widget → 0 PF, Privo di sensi + Prono («Caduta a 0 PF») → Registro PF › Annulla → 18 PF ma ancora svenuta e prona; solo un avviso, due comandi in un altro pannello. | **Corretto.** `planRevert` offre l’opzione «Ha causato Privo di sensi, Prono: terminale con la stessa correzione» (spuntata, come «Morto»); `revertEntry` le termina nel dominio delle condizioni (`applyConditionChange`, `kind: "end"`, stesso motivo) nello stesso comando. Deselezionata, restano. L’Incosciente del knockout legato al suo riposo breve è escluso (resta l’avviso). Test «review: undoing the entry that dropped a creature to 0 HP…»; percorso gruppo «review» (`b33-13-undo-fall-conditions-it-1440.png`). |
| R3 | P2 | **Elenco delle modifiche al massimo non allineato al registro.** «Massimo +5 · Aiuto» → Registro PF › Annulla quella voce → massimo 22 ma «+5 · Aiuto [Togli]» e «(base 17)» restano; «Togli» avrebbe portato il massimo a 17. | **Corretto.** `syncMaxMod` tiene l’elenco al passo su annulla e riapplica (anche per la voce «Togli» e per le riapplicazioni). Test «review: undoing or reapplying a maximum entry…»; percorso gruppo «review» (`b33-14-max-reapplied-it-1440.png`). |
| R4 | P3 | **Il numero scritto si perdeva a ogni ridisegno** (clic su una difesa, tipo, «Declassa…», rifiuto): il percorso del costruttore lo riscriveva. Dopo un Danno riuscito il declassamento e il suo motivo restavano visibili (la pulizia avveniva dopo il ridisegno). | **Corretto.** Importo in `ui.amounts`, cancellato solo quando il cambio riesce (D&D Beyond); pulizia prima del ridisegno. Test «review: the typed amount survives…» (controlla ciò che il ridisegno mostra); percorso passo 2 (il 10 resta dopo il rifiuto). |
| R5 | P3 | **Anteprima inventata «Con 10 danni»** con un numero d’esempio fisso. | **Corretto.** Anteprima dal vivo sull’importo scritto («10 → immunità declassata 5»), come l’anteprima del vassoio dnd5e (FVT-139); senza importo, una frase che spiega che le difese si applicano da sole. Percorso passo 2. |
| R6 | P3 | **Privacy: la risposta rivelava le difese di un mostro.** Il giocatore propone 6 fuoco al Fantasma → il DM accetta → «accettata: 3 applicati» e campana «Il DM ha accettato: 3 a Fantasma» rivelano la resistenza. | **Corretto.** L’importo applicato compare solo dove il giocatore legge i PF (i suoi personaggi); altrimenti «accettata dal DM» e «Il DM ha accettato la proposta per Fantasma». Test «review: an accepted proposal on a DM creature…». |
| R7 | P3 | **Overkill mancante** (Shieldmaiden CMP-169, citato nella scheda). | **Corretto.** «· N oltre lo 0» nello stato del widget e nell’anteprima del vassoio. Test e percorso («PF 10 → 0 · 4 oltre lo 0»). |
| R8 | P3 | **Dardo incantato spiegato male:** con resistenza «9 → resistenza 4» mentre «Applica 3» (ogni dardo è un’istanza a sé). | **Corretto.** «9 → resistenza per dardo 1 + 1 + 1 = 3». Test. |
| R9 | P3 | **Registro PF fermo alle ultime 12 voci**, senza modo di vedere le altre (Damage Log le tiene tutte). | **Corretto.** «Mostra tutte le voci (n)» / «Mostra solo le ultime 12». Test. |
| R10 | P3 | **«Proponi al DM» con una regola diversa dal dominio:** il widget guardava solo la pedina, il dominio anche appartenenza alla campagna e disponibilità → proposta offerta e poi rifiutata. | **Corretto.** Il widget usa `D.observes`, la stessa regola dell’invio. Test. |
| R11 | P3 | **Fuoco perso dopo «Applica a tutti»:** il vassoio sparisce e il fuoco cade sulla pagina. | **Corretto.** Il fuoco va alla scheda «Creatura». Percorso gruppo 1. |

Non difetti o non corretti qui (con il motivo):

- **Moltiplicatore «cura» (−1) di dnd5e** (assorbimento, es. golem): non offerto; ×0 copre «nessun
  danno». Servirebbe un percorso di cura dentro `applyReadyOutcome` (file condiviso `combat.mjs`):
  P3 aperto, da decidere con chi possiede il motore.
- **Pulsanti invece del clic destro nel registro PF** (Damage Log FVT-144): stessi comandi,
  raggiungibili anche al tocco e da tastiera; non è un’interazione inventata.
- **Temporanei «tieni o prendi»** invece della sostituzione di D&D Beyond: prevale la regola SRD
  (EN 18 / IT 20); scelta del costruttore corretta.
- **Segno ✝ e attenuazione del core** visibili ai giocatori anche con l’impostazione spenta, **tre
  ingressi ai PF** (campo PF del menu della pedina B12, moduli di «Condizioni e stato») e **testo di
  B19** in `encounter-builder.mjs` («il Tavolo non le calcola», ora falso): file di altre aree,
  confermati come limiti per il coordinatore (vedi «Limiti onesti»).
- **«Improved Initiative» nominato nell’interfaccia:** coerente con la convenzione del blueprint che
  mostra il modello («Modello: BG3 …» nell’ispettore).
- **Collocazione B61:** vassoio e widget nella scheda Creatura della barra destra, voce nel menu
  della pedina, valore PF nel tracker, livelli della mappa, campana, Preferenze, casella PF della
  scheda: conforme; nessuna riga di pulsanti aggiunta a un’intestazione.
- Ruoli, offline, Undo: rifiuto offline senza cambi (test), Annulla del core in un passo (test
  R2 e percorso «reload»), il giocatore non applica danni alle creature del DM (solo proposta).

### File cambiati dal revisore

Solo file dell’area: `damage-tray.mjs`, `hp-widget.mjs`, `damage-domain.mjs`,
`tests/damage-tray.test.mjs` (8 test «review:» e `lastLabel` nell’imbracatura),
`blueprint-checks/damage-tray-journey.js` (controlli nel gruppo 1 e nel passo 2, gruppo «review»
in fondo) e questa sezione. Nessun file condiviso toccato. Lo script mantiene la cartella
immagini `2026-09-25/B33/` del costruttore; le esecuzioni del revisore usano una copia con le
immagini in `B33-rf/final/` (le prove del costruttore non sono state sovrascritte). Il punto e
virgola finale che `prettier` aggiunge allo script è stato tolto, come chiede il README dei
controlli.

### Comandi ed esiti (codice finale)

- `node --test design/blueprint/tests/damage-tray.test.mjs` → **22/22** (14 del costruttore + 8
  della revisione; gli 8 fallivano prima delle correzioni).
- `node --test design/blueprint/tests/*.test.mjs` → **1983/1983**. Un giro intermedio aveva 2
  fallimenti in `sheet-plus.test.mjs` (test «review:» di un’altra area in revisione in parallelo,
  senza legami con questa); il giro successivo era verde.
- Percorso: `playwright-cli -s=d20-b33-rf --raw run-code --filename=final-journey.js` (copia di
  `damage-tray-journey.js` con le immagini in `B33-rf/final/`) → **11/11 gruppi**, `errors: []`,
  tre esecuzioni consecutive (`run-final-1.json`, `run-final-2.json`, `run-final-3.json`).
- Regressione in copia: `campaign-settings-journey.js` (B20) → **15/15**, `combat-tracker-journey.js`
  (B32) → **19/19**, `errors: []` (immagini in `B33-rf/b20-regression/` e `B33-rf/b32-regression/`).
- Immagini ispezionate: `b33-02-downgrade-log-it-1440.png` (anteprima e declassamento azzerato dopo
  il Danno), `b33-13-undo-fall-conditions-it-1440.png` (opzione spuntata),
  `b33-14-max-reapplied-it-1440.png` (modifica tornata in elenco dopo «Riapplica»), oltre a
  `b33-01`, `b33-03`, `b33-04`, `b33-11`, `b33-12` della base.
