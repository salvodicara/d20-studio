# B32 — Tracker di combattimento completo · evidenza

24/09/2026 (cartella delle prove datata 2026-09-25 come da incarico). Area `combat-tracker`
(scheda B32 di `docs/interview/CAPABILITY_CENSUS.md`, capacità TV-48–TV-61 e TV-82). Worktree
`d20-studio-interview-01`, branch `codex/interview-01`, lavoro non committato. Solo dati
sintetici: campagna `lanterns`, scena `old-watch`, Livia, Mira, Doran, goblin guerrieri e
«Goblin capo» dal compendio SRD. Regole: SRD 5.2.1 EN/IT (PDF ufficiali, pagine stampate).

## In breve, per il proprietario

- **Dove:** al Tavolo, scheda **Combattimento** della barra laterale destra (icona a spade
  incrociate, 1 clic; sul telefono nella barra in basso accanto a «Incontro»). È il tracker di
  Foundry (scheda della barra laterale) con le regole di D&D Beyond Maps. Sulla mappa: anello
  tratteggiato sotto la creatura di turno e segno ✕ sulle pedine tolte dal combattimento. Nella
  barra strumenti del DM: «Attacco di gruppo». Nella scheda del personaggio (Azioni): riquadro
  **Reazioni** come in Baldur’s Gate 3.
- **Cosa fa:** ordine dei turni con iniziativa, PF (DM e propri; parole per i nemici secondo
  la regola B20), menu «⋯» per ogni creatura (anche clic destro): seleziona, nascondi/rivela,
  sconfitta, correggi iniziativa, leggendarie e ricarica, togli dal combattimento, elimina la
  pedina. Corsia d’attesa per chi arriva a metà scontro, voci personalizzate (conti alla
  rovescia, promemoria di round), turno successivo, timer, avvisi «tocca a te», azione
  preparata, attacco di gruppo, fine incontro con PE e bottino, Reimposta e Svuota.
- **Nascosti che non trapelano:** un goblin nascosto non compare nell’ordine, nel tracker, nel
  segnalino né negli avvisi del giocatore; al suo turno il giocatore resta sul precedente
  («Turno di Goblin C»). Rivelato, prende la lettera libera successiva («Goblin E»).
- **Correzione dalla scheda (come B19 per i goblin):** l’accettazione (4) presuppone che nel
  2024 ogni creatura tiri l’iniziativa da sola. Il SRD 5.2.1 dice il contrario: «per un gruppo
  di creature identiche il GM effettua un solo tiro», ma ognuna ha il suo turno e il GM decide
  i pareggi (EN p. 13 / IT p. 14). Quindi la base 2024 resta così (B19 già la applica) e la
  **regola della casa** è il **turno di gruppo** (le creature uguali agiscono insieme: GAP-07,
  Battle Board VTL-121, Improved Initiative CMP-158). Le impostazioni lo spiegano a schermo.
- **Verifica:** 21/21 test Node dell’area; suite completa 1631/1635 (i 4 falliti sono di
  `homebrew-editor.test.mjs`, area in costruzione in parallelo; nessuno tocca il tracker);
  percorso nel browser **19/19 gruppi**, quattro esecuzioni consecutive, nessun `pageerror`.

## File

Nuovi (miei):

- `design/blueprint/combat-tracker.mjs` — registrazione e interfaccia (pannello, livelli della
  mappa, strumento, riquadro della scheda, notifiche, avvisi, impostazione del dispositivo).
- `design/blueprint/combat-tracker-domain.mjs` — dominio puro, senza DOM (in più rispetto alla
  scheda, come `encounter-builder-domain.mjs`: tiene i test del dominio separati dall’interfaccia).
- `design/blueprint/combat-tracker.css` — stili con prefisso `.ct-`.
- `design/blueprint/tests/combat-tracker.test.mjs` — 21 test (dominio con il vero store,
  motore di combattimento e registro; interfaccia con un doppione minimo del DOM).
- `changes/interview-01/blueprint-checks/combat-tracker-journey.js` — percorso nel browser.
- Questo rapporto.

Stato: sezione `state.ext["combat-tracker"]` (Undo a istantanea) e sezione
`state.ext["combat-tracker-rolls"]` (`undo: "preserve"`: registro dei tiri di ricarica, mai
cancellato da Undo). Impostazione del dispositivo `combat-tracker-alerts.sound`.

### Modifiche condivise (solo aggiunte, firme e comportamento invariati)

| File | Modifica | Perché |
| --- | --- | --- |
| `combat.mjs` | `observeTurnPhases(fn)` e una riga in fondo a `expireTurnEffects` che chiama gli osservatori | l’«hook di inizio turno» già esistente: lettere, ricarica, leggendarie, conti alla rovescia, scadenza del Ready, salti e timer avvengono **nella stessa transazione** del «Termina turno» (un solo Annulla) |
| `combat.mjs` | `visibleTurnActor(state, canSee)` | DDB-138: il turno mostrato a chi non vede la creatura di turno |
| `combat.mjs` | `succeedFailedSave(state, attemptId, actorId, role)` | Resistenza leggendaria: il dominio del combattimento cambia l’esito di un TS fallito in attesa di «Applica» |
| `combat.mjs` | `shareCurrentTurn(predicate)` + funzione `actsNow` usata dal controllo del turno in `previewAction` e `beginMovement` | turno di gruppo: i membri si muovono e attaccano con i comandi del core mentre il capogruppo tiene il turno; senza predicati il controllo è identico a prima |
| `table.mjs` | import di `visibleTurnActor` e `id === shown` al posto di `id === current` nei ritratti dell’ordine | il giocatore resta sul precedente quando la creatura di turno è nascosta (prima non vedeva nessun turno attuale: anche quello era un indizio) |
| `ui.mjs` | icona `swords` | la scheda Incontro (B19) usa già `sword`: due icone uguali affiancate nella barra |

`extensions.mjs` elencava già l’area. `prettier --check` su `combat.mjs`, `table.mjs`, `ui.mjs`:
conforme.

## Capacità → percorso → prova

| Capacità (censimento) | Percorso nell’app | Comandi ed esito | Regola / fonte | Pattern adottato | Prova |
| --- | --- | --- | --- | --- | --- |
| TV-48 Nascosti che non trapelano | Tavolo → Combattimento; ritratti in alto; mappa | goblin nascosto: assente da ordine, righe, segnalino e avvisi del giocatore; al suo turno il giocatore vede «Turno di Goblin C» e il segnalino sotto Goblin C; il DM vede la riga tratteggiata «Nascosta»; ⋯ › Rivela → «Goblin E» | — (visibilità dell’app) | DDB «player view stays on the previous» (DDB-138); Foundry «mark hidden» (FVT-128); Monk’s «hidden until first turn» come opzione (FVT-133) | test «DDB letters…», «map layers…»; percorso gruppo 1; `b32-05-player-hidden-turn-it-1440.png` |
| TV-49 Lettere ai duplicati | automatico all’avvio, all’ingresso dalla corsia, alla rivelazione | «Goblin» ×3 visibili → Goblin A/B/C su pedina, ordine e tracker; il nascosto resta «Goblin»; il 5° entra come «Goblin D», il nascosto rivelato diventa «Goblin E»; i nomi nascosti con alias (B12) non ricevono lettere | — | DDB lettere A–Z a Start Combat e seguito per le aggiunte (DDB-139); Roll20 Enumerate (R20-134) | test «DDB letters…», «pending lane…»; percorso 2a/2b/1; `b32-01-dm-tracker-start-it-1440.png` |
| TV-50 Corsia d’attesa | pedina selezionata → «Aggiungi al combattimento: …» (o «Altre pedine sulla scena») | corsia «In attesa di entrare»: Vantaggio/Normale/Svantaggio, «Tira d20» (due facce con vantaggio), d20 fisico, «Stessa iniziativa di …» (un solo tiro per creature identiche), «Correggi con il dado fisico» con motivo, «Togli dall’attesa», «Aggiungi al combattimento (n)»: entra al suo posto, il turno in corso non cambia; tiri nel registro dell’iniziativa della Preparazione | iniziativa e pareggi EN 13 / IT 14 | DDB Pending lane (DDB-140); Shieldmaiden inattivi (CMP-168); `joinCombat` di B19 riusato | test «pending lane…», «interface…»; percorso 2b; `b32-04-pending-lane-it-1440.png` |
| TV-51 Togliere vs eliminare; sconfitto | ⋯ della riga | «Togli dal combattimento»: esce dall’ordine, la pedina resta con l’anello ✕; «Elimina la pedina…»: dialogo, via da mappa e ordine, la scheda resta e si apre; «Segna sconfitta» (barrata; automatico a 0 PF per i PNG); Annulla ripristina | — | DDB Remove From Combat vs delete (DDB-141); Foundry defeated (FVT-128); Monk’s auto-defeat (FVT-133) | test «remove from combat…»; percorso 3; `b32-10-remove-delete-it-1440.png`, `b32-10b-out-of-combat-marker.png` |
| TV-52 Gruppo di PNG come opzione con fonte | Combattimento › Impostazioni › «Turno di gruppo per creature uguali · regola della casa» | spento di base; acceso: testo della regola precompilato, registrato in Campagna › Impostazioni › regole della casa (autore, data, voce dello storico = fonte); il tracker mostra «Regola della casa» e il blocco «Goblin ×N · Turno di gruppo»; un solo «Termina turno» passa tutto il gruppo; i membri si muovono e attaccano nel turno del capogruppo; spegnerlo chiede il motivo e ritira la regola | base 2024: un tiro, turni separati (EN 13 / IT 14); variante GAP-07 | raggruppamento dnd5e (FVT-130); Battle Board/Clash! (VTL-121); Improved Initiative group-by-name (CMP-158); storico delle regole (CA-69, B20) | test «group turn is a house rule…», «members move and act…», «recorded in the campaign settings…»; percorso 4 |
| TV-53 «Tocca a te», «il prossimo è tuo», segnalino, suono | automatico al Tavolo; campana; casella «Suono quando tocca a me» | overlay in cima alla mappa «Tocca a te, Livia!» (resta finché «Ho capito»), «Il prossimo turno è tuo, Livia.» (sparisce da solo); stessi avvisi nella campana; anello tratteggiato animato sotto la pedina di turno (fermo con riduzione del movimento); suono breve per il dispositivo (`data-sound=played`); il DM può spegnere gli avvisi | — | Monk’s Combat Details (FVT-133); Foundry turn marker (FVT-129); BG3 notifica col nome (CRP-093); TTS suono (VTL-188) | test «turn alerts…», «map layers…»; percorso 5a/5b e telefono; `b32-01b-turn-marker-under-livia.png`, `b32-14-phone-player-alert-en-390.png` |
| TV-54 Azioni e resistenze leggendarie | ⋯ › «Leggendarie e ricarica…» (DM) | pallini «Azioni leggendarie ●○ 1/2» con «Usa» solo dopo il turno di un’altra creatura, mai nel proprio turno né se Incapacitato o a 0 PF; si ricaricano all’inizio del suo turno; «Resistenza leggendaria 1/1» con la riga «TS fallito: Mani brucianti (Livia) · n» e il pulsante «Usa resistenza leggendaria» → TS riuscito, danno dimezzato ancora da applicare | Legendary Actions EN 257 / IT 293; Legendary Resistance nei blocchi (es. EN 258 / IT 294) | dnd5e leggendarie e pulsante sul TS fallito (FVT-131); BG3 boss con azioni leggendarie (CRP-143); voci manuali DDB (DDB-147) | test «legendary actions…»; percorso 6a/6b; `b32-06-dm-recharge-legendary-it-1440.png`, `b32-08-failed-save-resistance-it-1440.png` |
| TV-55 Ricarica a inizio turno | stesso dialogo; riga della creatura | «Segna usata» → «in ricarica»; al suo turno: d6 digitale automatico (opzione) o «da tirare» con «Tira 1d6» (digitale o fisico); avviso al DM; storico «Tiri di ricarica»; un tiro annullato con Annulla resta «annullato, tiro conservato» e ripetendo lo stesso turno la faccia viene riusata; le ricariche scritte nel blocco SRD («Recharge 5–6») si precompilano | Recharge X–Y EN 257 / IT 293 | dnd5e ricarica automatica (FVT-132); regola «Undo non regala un nuovo tiro» (I-229) | test «recharge rolls…», «recharge prefill…»; percorso 6c |
| TV-56 Voci personalizzate | «Voce del tracker…» (anche prima del combattimento) | nome, conteggio d’iniziativa (a pari merito dopo le creature), conto alla rovescia o promemoria a ogni round, chi la vede; «Il soffitto crolla» creata al round 1 con 3 round: «fra 3/2 round», al round 4 «Ora!», overlay «Ora: Il soffitto crolla!» e notifica per chi la vede; ⋯ › un round in meno/in più, modifica, rimuovi | — | Roll20 custom item con formula per round (R20-141); DDB voci manuali (DDB-147) | test «custom entries…»; percorso setup e 7; `b32-09-countdown-fired-it-1440.png` |
| TV-57 Automatismi del turno | Impostazioni | salta sconfitti, salta nascosti, rivela i nascosti al loro primo turno, fermati a inizio round (il DM avvia il round: «Inizia il round»), avvisi ai giocatori, tiro di ricarica automatico | — | FG Options Combat (R20-165); Foundry skip defeated (FVT-128); Monk’s (FVT-133) | test «automation…» |
| TV-58 Reset vs Svuota e fine incontro | piede del tracker | «Concludi incontro…»: round giocati, sconfitti con GS e PE (Goblin guerriero 50), totale 100, «Assegna i PE divisi tra» (area Bottino B26: PE sulla scheda, riquadro Esperienza), «Prepara il bottino dei vinti» (pacchetti nascosti con l’equipaggiamento del blocco, nella scheda Bottino), togli le pedine dei vinti, riga nel registro, riepilogo nel tracker; «Reimposta…»: round 1, PF dei PNG vivi al massimo, usi e conti ripristinati, nuova identità d’incontro; «Svuota…»: nessuno nell’ordine e iniziativa preparata vuota, pedine sulla mappa | PE assegnati dal GM (EN 182 / IT 212); PE per GS (catalogo SRD) | Shard Finish encounter (VTL-155); Clash! Reset/Clear (VTL-117); `/award` di Foundry tramite B26 (FVT-051) | test «finish encounter…»; percorso 11a/11b; `b32-11-finish-dialog-it-1440.png`, `b32-12-cleared-it-1440.png` |
| TV-59 Più creature attaccano con un comando | intestazione del gruppo o strumento DM «Attacco di gruppo» | dialogo: attaccanti spuntati (chi non ha attacco o azione è disattivato col motivo), bersaglio, dadi digitali o fisici → un tentativo del motore per ciascuno, risultati distinti in «Tiri e risultati»; con dadi fisici il DM digita ogni d20 (15, 3, 16, 2 → due colpi, due mancati) | tiri e danni del motore (SRD) | Mob Attack Tool (FVT-137); Shard gruppi di selezione (VTL-123); Shieldmaiden multi-bersaglio (CMP-174) | test «mob attack…»; percorso 8; `b32-07-mob-attack-after-it-1440.png` |
| TV-60 Timer del turno | Impostazioni › «Timer del turno» | cronometro dall’inizio del turno nell’intestazione del tracker (si ferma nel round in attesa) | — | Improved Initiative (VTL-128, CMP-161); AboveVTT (VTL-166) | test «automation…»; percorso setup (0:00 → 0:06 nelle immagini) |
| TV-61 Politica delle reazioni | scheda del personaggio › Azioni › «Reazioni»; dal tracker «Cambia nella scheda» | per Scudo e Attacco di opportunità: «Attiva» + «Chiedi ogni volta» → Chiedi / Automatico / Disattivata; Livia: Scudo Chiedi (il giocatore riceve la richiesta e rinuncia senza spendere la reazione), Opportunità Automatico (usata subito con dadi digitali, nel registro «Reazione secondo la politica: Livia · Attacco di opportunità · automatico»); Disattivata rinuncia da sola | reazione: si spende solo usandola (TABLE_REACTIONS, I-022) | BG3 pannello Reazioni con «Ask» (CRP-138); prompt sempre (CRP-044) | test «reaction policy…», «policy box…»; percorso 9a/9b/9c; `b32-02-livia-reactions-sheet-it-1440.png` |
| TV-82 Azione preparata con innesco | riga della creatura di turno › «Prepara un’azione…» | scegli attacco o trucchetto (o muoverti fino alla Velocità) e l’innesco (entra nella mia portata, esce dal riparo, testo libero); l’azione si spende subito; badge «Pronta: Bastone ferrato · Una creatura entra nella mia portata»; «Innesco avvenuto…» → bersaglio → attacco del motore con la Reazione, turno invariato; «Ignora l’innesco»; scade all’inizio del suo turno successivo | Ready EN 186–187 / IT 211 | Solasta II Ready (CRP-141) | test «Ready…»; percorso 10a/10b; `b32-03-player-ready-it-1440.png` |

Coerenza con il resto dell’app: stessi attori e campagna; iniziativa nel registro della
Preparazione; attacchi, TS, danni e reazioni con il motore (`combat.mjs`) e la coda dei tiri
esistente; danni «da applicare» secondo la regola B20; PE su `actor.xp` e bottino nei pacchetti
di B26; regola della casa nello storico di B20; nascondi/rivela ed elimina con i comandi di B12;
creature dal compendio B16.

## Comandi ed esiti

- `node --test design/blueprint/tests/combat-tracker.test.mjs` → **21/21**.
- `node --test design/blueprint/tests/*.test.mjs` → **1631/1635**; falliti solo 4 test di
  `homebrew-editor.test.mjs` (area in costruzione in parallelo; nei giri precedenti fallivano
  invece `campaign-data`, `crafting`, `party`, `projects`, `journal-plus`, `quests-review`, poi
  passati: file in modifica da altri). Nessun fallimento nei test del core o del combattimento.
- Percorso: sessione `d20-b32`, cwd
  `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B32/`, server
  `http://127.0.0.1:8879/`:
  `playwright-cli -s=d20-b32 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/combat-tracker-journey.js`
  → **19/19 gruppi**, `errors: []`, quattro esecuzioni consecutive verdi sulla versione finale. Contenuto: DM e giocatore
  IT a 1440 (clic, tastiera ⋯/Invio/frecce/Esc, frecce + Invio per muovere un goblin), reload a
  metà combattimento, Annulla del «Termina turno» e dell’eliminazione, contesto isolato EN 390 px
  con tocco (scheda dalla barra in basso, ⋯ › Mark defeated, Next turn, avviso «It’s your turn,
  Livia!»), nessuno scorrimento orizzontale, controlli del tracker tutti ≥ 40 px.
- Immagini 1440×900 (ispezionate) in quella cartella: `b32-01-dm-tracker-start-it-1440.png`,
  `b32-01b-turn-marker-under-livia.png` (ritaglio), `b32-02-livia-reactions-sheet-it-1440.png`,
  `b32-03-player-ready-it-1440.png`, `b32-04-pending-lane-it-1440.png`,
  `b32-05-player-hidden-turn-it-1440.png`, `b32-06-dm-recharge-legendary-it-1440.png`,
  `b32-07-mob-attack-after-it-1440.png`, `b32-08-failed-save-resistance-it-1440.png`,
  `b32-09-countdown-fired-it-1440.png`, `b32-10-remove-delete-it-1440.png`,
  `b32-10b-out-of-combat-marker.png` (ritaglio), `b32-11-finish-dialog-it-1440.png`,
  `b32-12-cleared-it-1440.png`; telefono `b32-13-phone-dm-en-390.png`,
  `b32-14-phone-player-alert-en-390.png`. Correzioni fatte dopo l’ispezione: icona propria
  della scheda (era uguale a «Incontro»), aggiunta di pedine spostata sotto l’elenco, comandi
  delle voci nel menu ⋯, rientro delle righe, avviso sopra la mappa invece che sui comandi di
  scena (sul telefono sotto l’intestazione), anello più visibile sulle pedine tolte.

## Limiti onesti

- **Turno di gruppo:** all’inizio del turno di gruppo i membri riprendono azione, bonus,
  reazione e movimento; i loro effetti «all’inizio del turno» (condizioni, tiri contro la
  morte) si applicano quando il turno passa sulla loro posizione, cioè alla fine del turno di
  gruppo. Il gruppo è «stesso nome senza lettera» fra le creature del DM (Improved Initiative);
  attivarlo a metà round fa saltare i membri che non hanno ancora agito: va acceso a fine round
  (il percorso lo fa nel turno di Doran).
- **Attacco di gruppo:** solo gli attacchi in mischia che il motore conosce (profili SRD o
  scritti dal DM), un bersaglio; solo la creatura di turno o il suo turno di gruppo. Il dialogo
  rifiuta tutto il comando se un attaccante spuntato non è a portata.
- **Resistenza leggendaria:** cambia l’esito solo prima di «Applica» (automazione Assistita,
  C1). La campagna d’esempio gioca in «Automatico»: lì il danno è già applicato e il pulsante lo
  dice («annullalo prima»); il percorso passa a Assistito in Campagna › Impostazioni. Il motore
  registra l’effetto del successo solo per Mani brucianti (dimezza), l’unica azione con TS.
- **Azioni leggendarie e ricariche:** il tracker conta usi, finestre e ricariche; l’azione
  scelta la esegue il DM con gli strumenti esistenti (blocco, tiro libero). Il campione SRD non
  ha creature leggendarie: i valori del «Goblin capo» sono del DM e marcati come tali; le
  ricariche dei blocchi SRD (es. Drago verde giovane) si precompilano con la loro fonte. Nessun
  limite «una per fine turno»: il SRD dice «una alla volta».
- **Azione preparata:** attacchi e trucchetti senza slot, o movimento; gli incantesimi con slot
  trattenuti con concentrazione sono elencati come non ancora possibili. Il pulsante sta nella
  riga del tracker perché la barra delle azioni del core non ha ancora un punto d’estensione
  (lo porterà `quickbar`, B53).
- **Politica delle reazioni:** vale per le due reazioni del motore (Scudo, Attacco di
  opportunità). «Automatico» usa dadi digitali e lo slot più basso per Scudo, in una
  transazione di seguito non annullabile da sola: Annulla della mossa che l’ha scatenata toglie
  entrambe (i tiri restano nel registro, regola esistente).
- **Fermati a inizio round** è un punto di controllo del DM (avvisi e timer in attesa,
  «Inizia il round»), non blocca i comandi del core.
- **Avvisi e suono:** locali a questo browser (dimostrazione a due identità, nessuna rete);
  «già visto» per identità in `localStorage`; il suono è un breve tono WebAudio (nessun file).
  In italiano «Il prossimo turno è tuo» invece di «sei la prossima»: la scheda non registra il
  genere grammaticale.
- **Lettere:** rinominano la creatura (come i suffissi di DDB), visibili ovunque; restano dopo
  l’incontro. Il timer misura il tempo reale dall’inizio del turno, solo da leggere.
- Mappa piccola a 1440 (scala del core): segnalino e anello ✕ sono visibili ma piccoli; i
  controlli testuali restano nel tracker.
- Solo Chromium tramite Playwright; nessun backend, nessuna sicurezza reale oltre alle
  proiezioni locali per ruolo.

## Revisione e correzioni (revisione indipendente, 24/09/2026)

Revisore-correttore distinto dal costruttore · stesso worktree `d20-studio-interview-01`,
branch `codex/interview-01`, nessun commit · sessione browser `d20-b32-rf`, cwd
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B32-rf/` · server
`http://127.0.0.1:8879/` · regole verificate sul PDF ufficiale SRD 5.2.1 EN (Iniziativa p. 13,
Preparare pp. 186–187, Azioni leggendarie p. 257).

### In breve, per il proprietario

- Il tracker c’è e funziona: le 15 capacità della scheda B32 le ho riprovate nell’app vera
  (percorso del costruttore **19/19** con le correzioni, più il mio percorso **7/7**).
- Ho trovato **3 difetti seri (P2)** e li ho corretti:
  1. **Azione preparata «muoviti»**: Livia spendeva la Reazione ma poi non poteva muoversi
     («Attendi il turno di questa creatura»). Ora, dopo «Usa la Reazione», compare
     «Reazione: muovi Livia sulla mappa, fino a 9 m (un movimento)» e la muovi davvero, una
     volta, senza cambiare il turno. Azioni e Scatto restano vietati fuori turno.
  2. **Il turno di un nemico nascosto trapelava** al giocatore: quando toccava al goblin
     nascosto, Livia riceveva una seconda volta «Il prossimo turno è tuo», una nuova notifica
     nella campana e il timer ripartiva da 0:00. Ora per il giocatore non si muove niente.
  3. **Azione leggendaria subito dopo il proprio turno**: era permessa (e registrata «dopo il
     turno della Sentinella» stessa). Il SRD dice «solo dopo il turno di un’altra creatura».
     Ora il pulsante è spento e spiega il perché; dopo il turno di Doran si usa.
- Ho corretto anche **8 difetti minori (P3)**: il menu «⋯» che non si chiudeva cliccando
  altrove, i goblin nascosti che entravano nel turno di gruppo, la modifica di un conto alla
  rovescia che lo faceva ripartire, un’etichetta del registro che poteva nominare un
  nascosto, la riga «Le tue reazioni» spezzata, il costo delle reazioni come in BG3,
  «Termina turno» per il giocatore, i pulsanti non disponibili che sembravano attivi.
- Una cosa l’ho provata e **tolta di nuovo**: cancellare le lettere A/B/C a fine incontro
  (come fa D&D Beyond). Rompeva il Bottino: i due pacchetti diventavano «Bottino: Goblin» e
  «Bottino: Goblin». Le lettere restano, come aveva deciso il costruttore.

### Difetti trovati, riproduzione ed esito

| ID | Gravità | Riproduzione (prima della correzione) | Esito e prova |
| --- | --- | --- | --- |
| R-1 | P2 · controllo inerte | Livia (giocatore) › «Prepara un’azione…» › «Muoverti fino alla tua Velocità»; al turno della Sentinella «Innesco avvenuto…» › «Usa la Reazione»: Reazione spesa, movimento azzerato, ma ← ← Invio sulla mappa → toast «Attendi il turno di questa creatura» e la pedina non si muove (`probe-ready-move.js`, `probe-ready-move.png`) | **Corretto.** `resolveReady` apre una finestra «moving» (una mossa, chiusa al cambio di turno); il predicato `sharesTurn` la concede solo per il **movimento**. In `combat.mjs` `actsNow` riceve lo scopo (`"action"` predefinito, `"movement"` da `beginMovement`): aggiunta retrocompatibile. Riga del tracker con il badge. Test «review: a readied move…»; percorso D (x 250 → 150, seconda mossa rifiutata) e F (EN 390, «Reaction: move Livia on the map…»); `rf-03-readied-move-badge-it-1440.png`, `rf-04-phone-readied-move-en-390.png` |
| R-2 | P2 · privacy (DDB-138) | Esploratore nascosto dopo Doran, timer acceso. Al turno di Doran il giocatore riceve «Il prossimo turno è tuo, Livia.» e lo chiude; il DM passa al nascosto: il giocatore riceve **di nuovo** lo stesso avviso (chiave del turno nuova), una notifica nuova nella campana e il timer riparte (`probe-hidden-leak.js`) | **Corretto.** `shownTurn(state, role)` dà creatura, round e chiave del turno che il giocatore vede; avvisi e notifiche usano quella chiave; il timer usa `turnStarts[chiave]` (`turnStartedFor`); la sosta di inizio round non compare se il round è stato aperto da un nascosto. Il DM vede tutto come prima. Test «review: a hidden creature's turn…»; percorso C; `rf-02-player-hidden-turn-no-alert-it-1440.png` |
| R-3 | P2 · regola (SRD EN 257) | Sentinella con 2 azioni leggendarie: finito il **suo** turno, durante quello di Doran «Usa» era attivo e il registro scriveva `afterActorId: goblin-1` (`probe-legendary.js`). Il test del costruttore lo dava per giusto | **Corretto.** `legendaryState` rifiuta se l’ultimo turno finito è della creatura stessa: «Si usa dopo il turno di un’altra creatura, non subito dopo il proprio.» Test del costruttore aggiornato (uso dopo Goblin B); percorso B; `rf-01-legendary-after-own-turn-it-1440.png` |
| R-4 | P3 · pattern (FVT-128) | Menu «⋯» aperto: clic sull’intestazione, sulla mappa, Tab fuori dal menu → resta aperto (`probe-menu.js`) | **Corretto** come il menu contestuale di Foundry: si chiude al clic altrove e quando il fuoco esce; il clic che lo chiude arriva comunque al suo pulsante (un clic su «Impostazioni» chiude il menu e apre il dialogo). Percorso A e F (tocco) |
| R-5 | P3 · privacy | Regola della casa «turno di gruppo» accesa: un goblin nascosto entrava nel gruppo dei visibili; se era il primo, il blocco «Goblin ×N» risultava «di turno» mentre il giocatore vedeva il turno del precedente | **Corretto.** Un nascosto resta fuori dal gruppo e fa il suo turno nascosto; rivelato, entra. Test «review: hidden creatures stay out of a group turn» |
| R-6 | P3 · dati | «Il soffitto crolla» (3 round) al round 3 dice «fra 1 round»; ⋯ › Modifica… per aggiungere una nota → riparte da 3 | **Corretto.** Cambiare testo o nota conserva i round passati; cambiare durata o tipo lo fa ripartire. Test; percorso E |
| R-7 | P3 · privacy | «Usa resistenza leggendaria» scriveva nel registro condiviso il nome della creatura anche se nascosta (ogni altra etichetta del tracker lo evita) | **Corretto** con `privateFor`, come le altre. Verificato leggendo il codice; il gruppo 6b del percorso del costruttore passa |
| R-8 | P3 · aspetto | Giocatore, «Le tue reazioni»: il testo «: Scudo · Chiedi…» andava a capo da solo, con i due punti a inizio riga (`rf-player-tracker.png`) | **Corretto**: «Livia:» e l’elenco restano insieme. Percorso G |
| R-9 | P3 · pattern (CRP-138) | Il pannello Reazioni di BG3 mostra il costo di ogni reazione; il riquadro della scheda no | **Corretto**: Scudo «Reazione + slot di 1° livello o superiore», Attacco di opportunità «Reazione» (IT/EN). Test; percorso G; `rf-05-livia-reactions-costs-it.png` |
| R-10 | P3 · pattern (FVT-127) | Il giocatore, nel suo turno, leggeva «Turno successivo» (comando del GM in Foundry) | **Corretto**: «Termina turno» per il giocatore, «Turno successivo» per il DM (come la barra delle azioni). Test; percorso D |
| R-11 | P3 · aspetto | «Usa» delle leggendarie (e gli altri comandi `aria-disabled`) sembrava attivo quando non disponibile | **Corretto**: resta raggiungibile da tastiera (il clic spiega il motivo) ma appare spento. Percorso B |

### Verificato senza difetti (con motivo)

- **Scheda B32, capacità TV-48–61 e TV-82:** tutte attive nell’app, con dadi digitali e
  fisici dove c’è un tiro, Annulla, reload, ruoli, EN/IT, tastiera e telefono (percorso del
  costruttore, 19 gruppi, rieseguito con le correzioni).
- **Senza rete:** «Turno successivo», «Segna sconfitta», «Voce del tracker…» e l’interruttore
  del suono sono rifiutati con il messaggio del core; lo stato del tracker non cambia e il
  dialogo della voce resta aperto con quanto scritto (`probe-offline.js`).
- **Telefono 390:** nessuno scorrimento orizzontale nel tracker e nei dialoghi Impostazioni,
  Concludi incontro, Voce del tracker, Leggendarie e ricarica (`probe-phone.js`,
  `rf-phone-*.png`); pulsanti del tracker ≥ 40 px.
- **Posizione (B61):** tracker come scheda della barra laterale destra; «Attacco di gruppo»
  nel gruppo «Strumenti del DM» della barra a sinistra; segnalino e anello ✕ come livelli
  della mappa; avvisi sopra la mappa e nella campana; Reazioni come riquadro della scheda
  Azioni. Nessuna riga di pulsanti aggiunta a un’intestazione.
- **Correzione della scheda sull’iniziativa di gruppo:** confermata sul PDF: «For a group of
  identical creatures, the GM makes a single roll, so each member of the group has the same
  Initiative» e i pareggi li decide il GM (EN p. 13). Il turno condiviso resta regola della casa.
- **Numeri delle schede di mercato** mostrati nelle Impostazioni (es. «Monk’s FVT-133»): è la
  convenzione del blueprint (Impostazioni della campagna mostra «Modello: … (DDB-128)»).

### Non corretto, con motivo (da decidere altrove)

- **N-1 · Lettere dopo la fine (DDB-137).** D&D Beyond le toglie a «End Combat». Provato:
  il Bottino (B26) intitola i pacchetti con il nome attuale della creatura, quindi due
  pacchetti diventano «Bottino: Goblin» (il passo 11a del percorso del costruttore si è
  fermato). Tolta la modifica; test di guardia «review (non-defect): letters stay after
  Finish…». Per seguire DDB serve prima un nome proprio del pacchetto nel Bottino.
- **N-2 · Due «Concludi incontro».** Quello nell’intestazione del Tavolo (core, `table.mjs`)
  chiude soltanto; quello del tracker è la procedura di Shard (PE, bottino, riepilogo). Stessa
  parola, effetti diversi: al coordinatore decidere se l’intestazione debba aprire la
  procedura del tracker. Non è un file di quest’area.
- **N-3 · Numero del round con un nascosto in testa all’ordine.** L’intestazione del Tavolo
  (core) mostra il round reale: se il round si apre con una creatura nascosta, il giocatore
  vede «Round 2» mentre il turno resta sull’ultima creatura del round 1. Il tracker usa lo
  stesso numero per non contraddirla. Correzione proposta al proprietario di `table.mjs`:
  usare `shownTurn(state, role).round` (esportata da `combat-tracker-domain.mjs`) per i
  giocatori.
- **N-4 · «Prepara un’azione…» nella riga del tracker** e non nella barra delle azioni in
  basso: la barra è del core e non ha ancora un punto d’estensione (arriverà con `quickbar`,
  B53). Limite già dichiarato.
- **N-5 · Leggendaria subito prima del proprio turno.** Fine di un turno e inizio del
  successivo sono un solo comando, quindi dopo il turno della creatura che la precede non
  c’è un momento per usarla. dnd5e non controlla i tempi; qui resta un limite.

### Modifiche condivise del revisore

| File | Modifica | Perché |
| --- | --- | --- |
| `combat.mjs` | `actsNow(state, actorId, purpose = "action")` passa lo scopo ai predicati di `shareCurrentTurn`; `beginMovement` chiede `"movement"` | R-1: la mossa preparata condivide solo il movimento. Senza predicati, o con predicati che ignorano il terzo argomento, il comportamento è identico a prima |

File dell’area toccati: `combat-tracker.mjs`, `combat-tracker-domain.mjs`,
`combat-tracker.css`, `tests/combat-tracker.test.mjs` (27 test: +6 della revisione, 1
aggiornato). Nuovo: `changes/interview-01/blueprint-checks/combat-tracker-review-journey.js`.
Stato: nuovi campi `combat.turnStarts` (normalizzato a `{}`) e, nelle azioni preparate, lo
stato `moving` con `moveTurnKey`/`priorMoves`; dati salvati prima restano validi.

### Comandi ed esiti della revisione

- Prima delle correzioni: i 6 nuovi test fallivano per il motivo atteso (R-1, R-2, R-3, R-5,
  R-6 e il test del costruttore aggiornato per R-3); dopo: `node --test
  design/blueprint/tests/combat-tracker.test.mjs` → **27/27**. Il test del costo (R-9) è
  stato scritto subito dopo la modifica, non prima.
- `node --test design/blueprint/tests/*.test.mjs` → **1699/1699**.
- Percorso del costruttore (copia con cartella immagini `B32-rf/journey/`):
  `playwright-cli -s=d20-b32-rf --raw run-code --filename=…/journey-copy.js` → **19/19**,
  `errors: []`, quattro esecuzioni dopo le correzioni, l’ultima sul codice finale.
- Percorso della revisione:
  `playwright-cli -s=d20-b32-rf --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/combat-tracker-review-journey.js`
  → **7/7** (A menu, B leggendarie, C nascosto, D mossa preparata, E conto alla rovescia,
  G reazioni BG3, F telefono EN 390 a tocco), `errors: []`; verde in sei esecuzioni, le
  ultime due consecutive sul codice finale (la prima si era fermata perché Playwright non
  clicca un pulsante `aria-disabled`: il percorso ora lo clicca con `force`).
- `prettier --check` sui file toccati: conforme (i due percorsi lasciano volutamente senza il
  punto e virgola finale, come chiede il README dei controlli).
