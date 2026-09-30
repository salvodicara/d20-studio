# B53 — Comandi personali e barra rapida: prove

24/09/2026 (cartella prove datata 2026-09-25 come da incarico). Worktree
`d20-studio-interview-01`, ramo `codex/interview-01`, lavoro non committato. Area costruita
tramite il registro (B11); due **aggiunte minime** a file condivisi, elencate sotto.

## File

Nuovi (tutti di B53):

- `design/blueprint/quickbar.mjs` — modulo d'ingresso `register(registry)`: sezioni di stato
  `quickbar` (barre, azioni personalizzate, esecuzioni; Undo a istantanea) e `quickbar-rolls`
  (facce accettate, `undo: "preserve"`); la riga della barra nella barra delle azioni del
  Tavolo; il riquadro «Azioni personalizzate» nella scheda Azioni; 15 comandi con tasto
  (1–0, Alt+1–5); la notifica della pagina condivisa; finestre di aggiunta, modifica, dadi
  fisici, correzione, interruzione, condivisione, testo e menu ⋯.
- `design/blueprint/quickbar-domain.mjs` — dominio puro: formule (validazione dal vivo),
  pagine e caselle, disponibilità, azioni personalizzate, passi, permessi per passo,
  esecuzioni, correzioni, condivisione come copia, testo.
- `design/blueprint/quickbar.css` — stili `.qb-*` collegati con `registerStyles`.
- `design/blueprint/tests/quickbar.test.mjs` — 18 test (dominio e gestori dell'interfaccia sul
  vero `createStore` e registro: seme, commit, Undo con prove conservate, reload).
- `changes/interview-01/blueprint-checks/quickbar-journey.js` — percorso nel browser.

Aggiunte a file condivisi (additive, firme e comportamenti esistenti invariati):

1. `design/blueprint/registry.mjs`, `CHECKS.placement`: nuovo valore `"dock-row"` per
   `table-panel` (commento B53). Durante il lavoro un'altra area (B40) ha aggiunto in parallelo
   `"dock"`, che mette pulsanti **dentro** la fila dei comandi; la barra rapida è una fila
   intera, quindi serve un posto distinto.
2. `design/blueprint/table.mjs`, `renderTable`: dopo la `.toolbar` della `.action-dock`,
   `panels("dock-row")` reso con `reg.slot(...)` (stessa forma dell'aggiunta B40). Il `bind`
   arriva dal `bindSlots(root, …, { points: ["map-layer", "table-panel"], args: [table] })` già
   presente. Senza contributi `dock-row` il markup è identico a prima.

Dati coerenti con lo stato esistente: Livia (Dardo di fuoco, Dardo incantato, Bastone ferrato
dalle azioni del Tavolo), Mira (Percezione +5, Natura +3 come i suoi `skillModifiers`), Doran
(TS Costituzione, Prova di Forza dalla scheda; «Attacco con spada» = Spada lunga SRD, +2 per
colpire con i suoi punteggi), Sentinella (Furtività +6). Nessuna riga aggiunta agli attori: le
azioni personalizzate stanno nella sezione dell'area e si leggono dalla scheda.

## Dove si trova (≤ 2–3 clic)

| Contesto                                  | Percorso                                                                                                                         | Chi                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Tavolo → barra delle azioni in basso      | visibile subito, riga sotto Muovi / Azioni della scheda / Tira i dadi (0 clic)                                                   | chi controlla la creatura selezionata; per le altre una riga di spiegazione                      |
| Personalizza (vassoio da trascinare)      | matita della barra (1 clic)                                                                                                      | idem                                                                                             |
| Menu ⋯ (pagine, condividi, testo, storia) | pulsante ⋯ o nome della pagina (1 clic)                                                                                          | idem                                                                                             |
| Scheda → Azioni → «Azioni personalizzate» | Personaggi → Apri scheda (scheda Azioni predefinita, 2 clic); dal Tavolo: matita → «Azioni personalizzate della scheda» (2 clic) | chi vede la scheda legge; chi la controlla crea, modifica, rimuove, «Aggiungi alla barra rapida» |
| Campana (B24)                             | «Copia di una pagina della barra rapida per Doran» → Tavolo con Doran selezionato                                                | chi gioca il personaggio che riceve                                                              |
| Palette (B23)                             | «Barra rapida: casella 1…0», «Barra rapida: pagina 1…5»                                                                          | sul Tavolo                                                                                       |

Collocazione B61: nessuna nuova scheda laterale, nessun pulsante in testate; la barra è una
fila della barra delle azioni (hotbar di BG3), come chiesto dalla scheda e dall'owner.

## Comandi eseguiti e risultato

- `node --test design/blueprint/tests/quickbar.test.mjs` → **18/18**.
- `node --test design/blueprint/tests/*.test.mjs` → **1887/1887** (suite completa, aree
  parallele incluse; prima esecuzione dopo le aggiunte condivise 1777/1777).
- Browser (Chromium, `playwright-cli`, sessione `d20-b53`, server `127.0.0.1:8879`), da
  `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B53/`:
  `playwright-cli -s=d20-b53 --raw run-code --filename=…/blueprint-checks/quickbar-journey.js`
  → **9 gruppi superati, `errors: []`** nelle ultime tre esecuzioni consecutive, l'ultima dopo
  la formattazione finale (`run-1.json`, `run-2.json`, `run-3.json` nella cartella prove). Immagini 1440×900 `b53-01` … `b53-11`, telefono 390
  `b53-12` … `b53-14`.
- Formattazione: Prettier del repository su tutti i file di B53 (il percorso resta senza punto
  e virgola finale, come richiesto dal README dei controlli).

## Capacità, percorso, prova

| Capacità (censimento)                                                               | Percorso e comandi                                                                                                                                                                                                   | Risultato                                                                                                                                                                                                                                                                           | Regola / fonte                                                                                                                              | Pattern adottato                                                                                                                                                       | Prova                                                                                                   |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| X-11 (1) «Attacco con spada» sulla barra; rinomina, colore, riordino anche al tocco | DM, Doran: matita → trascina «Attacco con spada» sulla casella 3 (mouse); «+» con Invio, radio già sulla spada, Tab, Invio; Maiusc+clic → «Spadata», rosso; clic destro e Maiusc+F10 aprono l'editor; trascina 3 → 1 | casella 3 aggiunta, doppione rimosso dall'editor, nome e colore salvati (modifica personale privata), scambio 1↔3; frecce muovono il fuoco; al telefono trascinamento al tocco scambia 1↔3                                                                                          | —                                                                                                                                           | Roll20 barra rapida (rinomina, colore, trascina, Maiusc+clic) R20-148; Dice+ riordino anche al tocco VTL-174; Let's Role «+» e clic destro VTL-184; BG3 hotbar CRP-098 | gruppo 4 e 9; test «bars: add, swap on move…»; `b53-04`, `b53-05`, `b53-12`                             |
| X-11 (2) tiro salvato validato, dado fisico o digitale                              | Livia: casella 5 vuota → «Tiro salvato» «Arcano», «1d20+» (rifiuto dal vivo) → «1d20+5» (valida); clic (digitale); «Dadi fisici» → faccia 14; «Correggi…» 11 con motivo; Annulla ultima modifica                     | digitale con carta nel registro, dadi B56 e `roll-accepted`; fisico 19; correzione 16 con faccia precedente conservata; Undo ritira il tiro (resta in cronologia «annullato») e lo stesso tentativo digitale riusa le facce una volta                                               | D20 Test, Vantaggio/Svantaggio SRD 5.2.1 EN 176/181 · IT 218/217; faccia digitale solo da `rollDie` (state.mjs); piani `srd-compendium.mjs` | Dice+ notazione validata dal vivo VTL-174; correzione motivata e ritiro come aree dadi/compendio (I-229)                                                               | gruppo 3; test «digital roll…», «physical roll and d20 advantage…»; `b53-03a`, `b53-03`, `b53-11`       |
| X-11 (3) sequenza con esito per passo e permessi; interruzione motivata             | Livia in combattimento (suo turno): «Doppia stretta» = Stretta ×2 (4 passi: colpire, danni, colpire, danni); poi «Agguato» con dadi fisici, passo 1 = 13, «Interrompi…» «Il goblin è fuggito»                        | passi 1–2 eseguiti, passo 3 bloccato «Azione già usata in questo turno», passo 4 non eseguito; Azione spesa (pallino del Tavolo spento); Undo la restituisce; «Agguato» interrotta con motivo nel pannello e nel registro                                                           | Azione bonus EN 177 · IT 205; Reazione EN 186 · IT 212; Incapacitato EN 184 · IT 208; Colpo critico EN 179 · IT 205 (danni doppi al 20)     | Alchemy azioni componibili con esiti concatenati VTL-028; confine F-064 «una scorciatoia non concede poteri o risorse»                                                 | gruppo 5; test «permissions per step…», «physical steps…», «sequence at the Table…»; `b53-06`, `b53-07` |
| X-11 (4) barra della pedina selezionata                                             | Tavolo: Livia → Mira → Sentinella → Livia                                                                                                                                                                            | barra di Livia (Dardo di fuoco…), di Mira (Percezione…); la Sentinella per il giocatore mostra solo la spiegazione; la casella «Dardo di fuoco» apre l'anteprima dell'azione del Tavolo                                                                                             | —                                                                                                                                           | azioni della pedina Roll20 R20-035/148; barra per personaggio BG3 CRP-098                                                                                              | gruppo 1; test «dock: the selected creature's bar…»; `b53-01`                                           |
| X-11 (5) pannello condiviso con Doran come copia                                    | Livia: ⋯ → «Condividi una copia…» → Doran (anteprima: si copiano Arcano, Agguato; restano le azioni della scheda e la sequenza con azioni personalizzate) → DM: campana → Tavolo su Doran → ›                        | pagina nuova sulla barra di Doran per chi lo gioca (qui il DM), bordo tratteggiato «copia da Livia»; la rinomina successiva «Arcano+» del giocatore non viaggia; «Agguato» usa la Destrezza di Doran (+2)                                                                           | —                                                                                                                                           | pannelli condivisibili Dice+ (a una persona, come copia, copia come testo) VTL-174                                                                                     | gruppo 6; test «sharing a page with Doran…», «sharing from the dialog notifies…»; `b53-08`, `b53-09`    |
| X-11 (6) pagine e tasti 1–0                                                         | ⋯ → «Nuova pagina», rinomina «Esplorazione»; tasto 1, Alt+1, tasto 5, tasto 0, Alt+2 dalla barra, ‹ ›                                                                                                                | 1 usa «Indagare» di pagina 2; Alt+1 apre pagina 1; 5 usa «Arcano+»; 0 spiega la casella vuota; Alt+2 dalla barra (dentro la barra letto anche dal codice del tasto, per Opzione+cifra del Mac: non provato con una vera tastiera Mac); ‹ › e reload conservano la pagina            | —                                                                                                                                           | Foundry hotbar 5 pagine × 10 caselle, tasti 1–0 FVT-194; righe di tutte le pagine (Monk's Hotbar Expansion, modulo) FVT-195                                            | gruppi 7–8; test «keys 1–0 and Alt pages…»; `b53-10`, `b53-11`                                          |
| PG-38 (7) azione personalizzata con tiro e danno creata dalla scheda                | Livia: scheda Azioni → «Nuova azione personalizzata» → «Parti da una voce SRD: Stretta folgorante» → anteprima → Salva → «Aggiungi alla barra rapida»                                                                | «Azione · +5 per colpire · 1d8 fulmine · SRD 5.2.1: Stretta folgorante» (INT +3, competenza +2); in casella 4; il DM la legge e la modifica solo se la politica della campagna (B20) gli lascia modificare la scheda; il giocatore legge «Attacco con spada» di Doran senza comandi | Stretta folgorante SRD 5.2.1 EN 162 · IT 192; Spada lunga EN 91 · IT 103 (1d8 taglienti, versatile, Fiaccare)                               | D&D Beyond «Manage Custom», «Display as attack» DDB-040; «Add to Token Bar» Roll20 R20-035; collocazione dei comandi Improved Initiative CMP-157                       | gruppo 2; test «custom actions…», «sheet section…»; `b53-02`, `b53-02b`                                 |
| Ruoli e privacy                                                                     | DM seleziona Livia                                                                                                                                                                                                   | il DM ha la sua barra (vuota) per Livia: la barra del giocatore non è leggibile dal DM; le modifiche della barra sono cambi locali privati (etichetta nel registro solo per chi li fa); tiri nascosti del DM (occhio) solo al DM                                                    | —                                                                                                                                           | barra per utente Foundry FVT-194; tiro nascosto al GM (Roll20/Dice+)                                                                                                   | gruppo 6; test «dock…», «sharing from the dialog…»                                                      |
| Offline                                                                             | Preferenze → senza rete: clic su un tiro; Maiusc+clic → colore                                                                                                                                                       | tiro della campagna rifiutato con motivo, nessuna faccia registrata; la modifica personale della barra si applica                                                                                                                                                                   | contratto `ctx.commit` (`local` ammesso offline)                                                                                            | —                                                                                                                                                                      | gruppo 8; test «add dialog…»                                                                            |
| EN, telefono, accessibilità                                                         | telefono 390 in inglese: tocco, pressione lunga, trascinamento al tocco in Personalizza, ⋯ → «Physical dice»                                                                                                         | «Livia's quick bar», nessuno scorrimento orizzontale della pagina (le caselle scorrono dentro la loro striscia), obiettivi ≥ 40 px, pressione lunga apre «Edit slot 2», fisico 20 + 5 = 25                                                                                          | —                                                                                                                                           | pressione lunga come clic destro al tocco (Dice+, BG3 su dispositivi touch)                                                                                            | gruppo 9; `b53-12`, `b53-13`, `b53-14`                                                                  |

## Controllo visivo (immagini ispezionate)

- 1440: la barra sta in una fila sotto i comandi della barra delle azioni (10 caselle da 64 px,
  pagina, +, matita, dadi, d20, ⋯; per il DM anche l'occhio dei tiri nascosti). Correzioni fatte
  dopo l'ispezione: il selettore «Chi vede» del DM mandava la fila a capo → ora è un pulsante
  a icona; i nomi delle prove erano troncati → nome breve sulla casella («TS Cos», «Prova
  For»), nome intero nel nome accessibile e nel suggerimento; pannello dei risultati e vassoio
  spingevano la pagina oltre i 900 px → ora galleggiano sopra la barra delle azioni; il
  vassoio a tre colonne lasciava vuoti → quattro colonne, con «Fatto» e i pulsanti in una testa
  fissa; nel menu ⋯ il pulsante Rinomina non era allineato.
- Un singolo tiro digitale non apre il pannello (come Dice+/Roll20: avviso, dadi B56, carta nel
  registro); il pannello compare per sequenze, attacco + danni, tiri fisici e interruzioni.
- 390: caselle in una striscia che scorre di lato sopra pagina e strumenti; dadi e d20 nel
  menu ⋯; pannello e vassoio galleggiano sopra la barra fissata.
- Sovrapposizioni viste e non di B53: il suggerimento B30 «Turni e iniziativa» compare sopra il
  pannello al primo combattimento; le notifiche B24 dei tiri altrui (positivo: il DM vede i tiri
  della barra del giocatore) e l'avviso dopo un Undo restano per qualche secondo.

## Limiti onesti

- Le azioni della scheda (Dardo di fuoco, Bastone ferrato…) si usano dalla barra ma **non
  entrano nelle sequenze**: servono bersaglio e conferma sulla mappa nel flusso del core. Nelle
  sequenze: tiri salvati, prove e tiri salvezza dalla scheda, azioni personalizzate.
- Le azioni personalizzate **non applicano danni né decidono il colpo**: mostrano il totale;
  il DM confronta con la CA (non rivelata al giocatore) e applica. Nessun aumento automatico
  dei trucchetti con il livello (Stretta folgorante resta 1d8 finché la si modifica).
- Prove e tiri salvezza usano il modificatore della scheda (`savingThrows` se registrati,
  altrimenti solo caratteristica, come la prova della scheda); nessuna competenza dedotta,
  nessun fallimento automatico per Privo di sensi. Il 20/1 naturale è segnalato, non risolto.
- Un'azione personalizzata spende Azione/Azione bonus/Reazione solo in combattimento per chi
  è nell'ordine dei turni; fuori combattimento le risorse non sono tracciate (come il core).
- Se si corregge un 20 naturale fisico dopo aver già tirato i danni critici, i danni restano
  quelli tirati: vanno corretti o ritirati a parte.
- Condivisione: copia locale nella stessa memoria del browser (dimostrazione a due identità),
  nessun invio reale; «Copia come testo» porta solo i tiri salvati. Il destinatario è chi gioca
  il personaggio (proprietario e controllori assegnati); qui Doran è giocato dall'identità DM.
- Tasti: 1–0 e Alt+1–5 come comandi del registro (contesto Tavolo, modificabili nella guida
  B23). Su macOS Opzione+cifra produce un simbolo: fuori dalla barra Alt+1–5 non scatta
  (dentro la barra sì, dal codice del tasto); i pulsanti ‹ › funzionano sempre. Nel percorso
  Chromium di Playwright Alt+1 dalla mappa è risultato funzionante.
- La chat (B17) mostra i tiri della barra come carte; per il tipo «check» mostra la parola
  inglese (limite della chat, non di B53). I dadi B56 mostrano il titolo generico «Tiro».
- Pagina aperta e modalità dei dadi sono preferenze di questo dispositivo per identità (come
  la barra laterale del Tavolo); «Ripristina esempio» le dimentica.
- Nessun linguaggio di script (C16/GAP-01 restano aperti per scelta): solo tiri salvati e
  sequenze di azioni esistenti.

## Revisione e correzioni (revisore indipendente, 24/09/2026)

Revisione di B53 contro la scheda del censimento (X-11, PG-38, accettazione 1–7) da una sessione
diversa da quella che l'ha costruita; lavoro non committato nello stesso worktree, quindi nessuno
SHA di candidato. Browser: `playwright-cli`, sessione `d20-b53-rf`, cartella prove
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B53-rf/`.

File toccati dalla revisione (tutti di B53; **nessun file condiviso**): `quickbar-domain.mjs`,
`quickbar.mjs` (esportata anche `deletePageDialog`, per il test), `quickbar.css` (vassoio a cinque
colonne), `tests/quickbar.test.mjs` (8 test «review: …»; il finto Tavolo del banco di prova non
finge più il selettore dei dadi del Tavolo), nuovo percorso
`blueprint-checks/quickbar-review-journey.js` (gruppi R1–R6), questa sezione.

### Risultati

| #   | Gravità | Problema e riproduzione                                                                                                                                                                                                                                                                                                                                                                                                             | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P2      | **Sequenza che perde un passo.** Livia: casella 5 «Arcano» `1d20+5`; casella 6 sequenza «Studio» (Arcano, Prova di Intelligenza); Maiusc+clic su Arcano → «Arcano+»; Maiusc+clic su Studio: Passo 1 mostra «—»; cambiare solo il colore → rifiuto «Una sequenza ha da 2 a 6 passi» (con 3+ passi il passo spariva in silenzio). Stesso effetto per un tiro rimosso dalla barra o nominato nell'altra lingua (etichette `{it, en}`). | Corretto: il passo attuale conserva la sua voce nel gruppo «Passo attuale»; i valori seguono la lingua della pagina. Test «review: a sequence keeps a step…»; percorso R1; `rf-r1-sequence-edit-it.png`.                                                                                                                                                                                                                                                 |
| 2   | P2      | **Critico non aggiornato dalla correzione.** Doran, «Attacco con spada» con dadi fisici: 20 naturale, «Correggi…» a 12 con motivo prima dei danni → «Registra passo 2» chiedeva ancora 2d8 «Colpo critico» (e un 19 corretto in 20 non diventava critico).                                                                                                                                                                          | Corretto: la correzione aggiorna naturale, totale e facce del passo della sequenza; il danno in attesa segue il 20 corretto (SRD 5.2.1 EN 179 / IT 205). Test «review: correcting a physical attack face…»; R3; `rf-r3-damage-after-correction-it.png`.                                                                                                                                                                                                  |
| 3   | P2      | **Tiri salvezza diversi dalla scheda.** La casella «TS Cos» di Doran tirava +2 mentre la sua scheda (Azioni › Tiri salvezza, «Gioco · valori effettivi») mostra +4 (competenza del Guerriero); Livia TS Intelligenza +3 contro +5.                                                                                                                                                                                                  | Corretto: tiri salvezza (e abilità) leggono il valore effettivo della scheda B37 (`statValue`: competenza di classe, modifiche motivate, forme); prove di caratteristica = modificatore come la scheda. Test «review: saves and skills read the sheet's effective values…» (uguaglianza su tutte le caratteristiche di Doran, Livia, Mira); R2 confronta tiro, editor («d20 +4») e scheda.                                                               |
| 4   | P2      | **Abilità assenti.** La barra accettava prove e tiri salvezza ma non le abilità, i tiri più usati della scheda (Percezione, Furtività): Mira aveva «Percezione» solo come formula fissa `1d20+5`, che non segue la scheda. Roll20 (R20-148: si trascina sulla barra qualsiasi pulsante di tiro della scheda) e Foundry (FVT-194) lo permettono.                                                                                     | Corretto: gruppo «Abilità» nel vassoio, nel «+» e nei passi delle sequenze; nome, caratteristica e bonus come nella scheda («Percezione · Sag · d20 + 5»), ordine alfabetico della lingua; nome completo «Prova di Saggezza (Percezione)» / «Wisdom (Perception) check»; condivisibile (legge la scheda di chi riceve). Test «review: saves and skills…», «review: skills are listed…»; R2, R6; `rf-r2-tray-skills-it.png`, `rf-r6-phone-skills-en.png`. |
| 5   | P2      | **Nomi non protetti nell'HTML.** Il nome di una creatura (anche un PNG nominato dal DM) nella nota «non è sotto il tuo controllo», il nome di pagina (arriva anche dalle copie condivise da un'altra identità) in «Elimina pagina» e il nome di un'azione personalizzata in «Rimuovi» entravano come HTML grezzo, contro il contratto dei moduli.                                                                                   | Corretto con `ctx.esc`. Test «review: names typed by another identity are escaped…».                                                                                                                                                                                                                                                                                                                                                                     |
| 6   | P3      | Con dadi fisici, un primo passo non permesso (Doran fuori dal suo turno) chiedeva comunque le facce, poi scartate dal blocco.                                                                                                                                                                                                                                                                                                       | Corretto: il permesso si controlla prima; nessuna finestra; la sequenza fermata resta nel pannello con il motivo, come con i dadi digitali. Test «review: a physical first step not permitted…»; R4; `rf-r4-physical-blocked-it.png`.                                                                                                                                                                                                                    |
| 7   | P3      | Una casella con un'azione della scheda (Dardo di fuoco) apriva l'azione del Tavolo con i dadi della barra di combattimento, ignorando «Dadi fisici» scelto sulla barra rapida.                                                                                                                                                                                                                                                      | Corretto: il selettore «Dadi» del Tavolo (visibile sopra la barra) segue la scelta della barra prima di aprire l'azione. Test «review: a sheet-action slot…»; R5; `rf-r5-action-slot-physical-it.png`.                                                                                                                                                                                                                                                   |
| 8   | P3      | Una pagina condivisa da una scheda personale (privata) portava il nome di quella scheda a chi riceve (avviso e «copia da …»).                                                                                                                                                                                                                                                                                                       | Corretto: da una scheda personale la copia non porta nome né id; si legge «Un giocatore» / «Il DM». Test «review: a page shared from a personal sheet…» (nel browser non provato: il campione non ha una scheda personale e crearla passa dal costruttore).                                                                                                                                                                                              |

Aggiornamento dei «Limiti onesti» sopra: il limite sulle prove («nessuna competenza dedotta»)
vale ora solo per le prove di caratteristica, che non hanno competenza nelle regole 2024; tiri
salvezza e abilità seguono la scheda (punti 3–4).

### Verificato senza difetti o fuori da B53 (con motivo)

- **Collocazione B61:** fila `dock-row` dentro la barra delle azioni, nessun pulsante in testata né
  scheda laterale; è il «proprio punto» che il piano del registro §5.1 riservava a quickbar. Le due
  aggiunte condivise restano additive (senza contributi `dock-row` il markup è identico); suite
  completa verde.
- **Trascinamento al tocco solo in «Personalizza»** (Dice+ lo permette sempre): a 390 px la
  striscia delle caselle scorre di lato e un trascinamento fuori da Personalizza la
  contrasterebbe; il tocco usa la casella, la pressione lunga la modifica. Scelta mantenuta.
- **Due selettori «Dadi»** (barra di combattimento per le azioni del Tavolo, barra rapida per i suoi
  tiri): dopo il punto 7 non sono più in disaccordo quando una casella apre un'azione del Tavolo;
  ogni area del prototipo ha la sua modalità (anche il vassoio B34). Unificarli è una scelta di
  prodotto, non un difetto di B53.
- **Condizioni → vantaggio/svantaggio automatico** sulle prove della barra: non applicato, come nel
  vassoio dei dadi B34; resta esplicito il selettore d20.
- **Fuori area, da segnalare:** il vassoio dei dadi B34 (`testModifier` in `dice-tray-domain.mjs`)
  calcola i tiri salvezza senza competenza di classe, come faceva B53 (Doran TS Cos +2 contro +4
  della scheda). I documenti condivisi (piano del registro §5.1: «da definire»; DEVELOPMENT.md,
  sezione B61) non elencano ancora i posti `dock` (B40) e `dock-row` (B53): per il coordinatore.
- **Etichette lunghe nelle caselle da 64 px** («Percezion/e»): estetica già presente; `hyphens:
auto` provato ma il Chromium di Playwright non ha il dizionario di sillabazione, quindi non
  verificabile: tolto.
- **Modello SRD «Competente» spuntato:** D&D Beyond lo chiede esplicitamente; la casella è visibile
  con anteprima dal vivo. Nessuna modifica.
- Ruoli e privacy (barra del giocatore invisibile al DM, tiri nascosti del DM filtrati da
  `rollVisibleTo`), offline (modifiche personali sì, tiri condivisi no), Undo con facce conservate,
  correzioni motivate, EN/IT, tastiera (1–0, Alt+1–5, frecce, Maiusc+F10), 390 px senza
  scorrimento orizzontale e obiettivi ≥ 40 px: confermati dal percorso del costruttore rieseguito.

### Controlli eseguiti

- `node --test design/blueprint/tests/quickbar.test.mjs` → **26/26** (18 del costruttore + 8 di
  revisione; ogni test di revisione è stato visto fallire prima della correzione).
- Suite completa `node --test design/blueprint/tests/*.test.mjs`: prima delle correzioni 1887/1888
  (`generators.test.mjs`: import di `preparation.mjs` in lavorazione da un'altra area); a metà
  1963/1969 (6 test di `damage-tray` e `regions`, file modificati da quelle aree nello stesso
  minuto); esecuzione finale **1983/1983**.
- Percorso del costruttore `quickbar-journey.js` → **9 gruppi, `errors: []`** prima e dopo le
  correzioni (rieseguito dalla sessione `d20-b53-rf`; riscrive le immagini `b53-*` nella cartella
  `2026-09-25/B53/`, ora con il vassoio a cinque colonne). Risultato in `B53-rf/builder-run.json`.
- Percorso di revisione `quickbar-review-journey.js` → **6 gruppi R1–R6, `errors: []`**
  (`B53-rf/review-run.json`), immagini `rf-r1` … `rf-r6` ispezionate.
- Prettier del repository su tutti i file toccati (il percorso resta senza punto e virgola finale).
