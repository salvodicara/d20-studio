# B51 — Sessioni: ricorrenza, assenze, posti e presenze: prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`) · sessione browser
`d20-b51` · cartella delle prove `~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B51/`.

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B51 (CA-44, CA-45, CA-46, CA-48; conflitto C23).
Righe di mercato: `changes/interview-01/market-census/community-services.md` (SVC-009,
SVC-048, SVC-049, SVC-052, SVC-053, SVC-054, SVC-056, SVC-058, SVC-060, SVC-061, SVC-076),
`vtt-light.md` (VTL-054). Proposta B27: Stelle e desideri offerto a fine sessione.

## File

Nuovi (tutti dell'area):

- `design/blueprint/sessions-plus.mjs` — modulo d'ingresso, `register(registry)`: sezione di
  stato `sessions-plus` (`undo: "preserve"`), tre blocchi di campagna (sotto la barra di
  Sessioni, dentro ogni sessione, dentro il resoconto), notifiche B24, due comandi B23; rendering,
  finestre e gestori.
- `design/blueprint/sessions-plus-domain.mjs` — regole pure (nessun DOM, nessun registro). Non era
  elencato nella scheda: separa il dominio dall'interfaccia come le altre aree (`safety-domain`).
- `design/blueprint/sessions-plus.css` — solo classi `.sp-*`, più una regola che nasconde i due
  pulsanti del core «Cambia data» e «Annulla appuntamento» nelle sole date di una serie (vedi sotto).
- `design/blueprint/tests/sessions-plus.test.mjs` — 14 test.
- `changes/interview-01/blueprint-checks/sessions-plus-journey.js` — percorso nel browser.

File condivisi modificati: **uno, un'aggiunta**. `design/blueprint/campaign.mjs`, funzione
`sessionList`: un aiutante locale `areaBlocks(suffix, arg)` e due punti in cui rende i contributi
`campaign-section` con id che finisce in `.sessions` (una volta sotto la barra, argomento
`{kind: "sessions", rows}`) e `.session` (dentro ogni sessione, argomento = la riga proiettata).
È lo stesso schema già presente per `.entry` e `.editor` delle voci. Senza aree il markup del core
resta identico byte per byte (`tests/registry-shell.test.mjs` verde). Motivo: la sezione Sessioni
non aveva alcun punto in cui un'area potesse aggiungere contenuto senza sostituirla del tutto, e
sostituirla avrebbe duplicato il codice del core (sondaggi, bozze, cambi di data).
`campaign-sessions.mjs` **non** è stato toccato: le funzioni esistenti bastavano. `extensions.mjs`
elencava già `sessions-plus`.

## Scelta di fondo

Ogni data di una serie è una **sessione ordinaria** di Campagna → Sessioni, creata, spostata e
annullata con il servizio di bozze del core (`createSessionDraft` → `saveSessionDraft` →
`previewSessionDraft` → `applySessionDraft`, come fa B14 per la serata giocata). Quindi la vedono
senza lavoro aggiuntivo: Inizio e Panoramica («Il prossimo appuntamento»), l'editor del resoconto
(«Sessione collegata»), il centro notifiche B24 (nuova/spostata/annullata, promemoria su
richiesta), l'elenco campagne di B13 («Prossima sessione») e la serata al Tavolo di B14
(`todaysAppointment`). La sezione `sessions-plus` contiene solo ciò che il core non ha: serie,
risposte con posti e lista d'attesa, presenze, registro, modifiche correggibili.

## Dove si trova

| Superficie                                                                                                        | Percorso                                                                            | Distanza                                                           |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Campagna → Sessioni, blocco «Serie ricorrenti» (DM): nuova serie, schede delle serie, «Presenze da registrare»    | `#campaign?tab=sessions`                                                            | Inizio → campagna → Sessioni: 2 clic (dalla pagina campagna: 1)    |
| Campagna → Sessioni, blocco «La tua presenza» (giocatore): prossima sessione, «Salto la prossima», uscita a parte | stesso                                                                              | idem                                                               |
| Dentro ogni sessione: serie, posti, persone, tre pulsanti di risposta, azioni del DM, presenze, registro          | stesso, un blocco per sessione                                                      | idem                                                               |
| Resoconto collegato a una sessione: «Presenze della sessione»                                                     | `#campaign?tab=entry&id=…`                                                          | «Scrivi resoconto» dalla sessione, poi la voce                     |
| Campanella B24 (categoria «Sessioni»)                                                                             | notifiche `sessions-plus`                                                           | posto liberato, «Conferma di nuovo», salti dei giocatori per il DM |
| Palette B23                                                                                                       | «Salto la prossima sessione» (giocatore), «Nuova serie ricorrente di sessioni» (DM) | Ctrl/Cmd+K                                                         |

Nessun pulsante nuovo in testate o al Tavolo (regola B61): tutto sta nella pagina a cui appartiene.

## Capacità → percorso → prova

| Capacità (censimento)                                                  | Percorso e comandi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Esito verificato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Regola / fonte                                                                                                                                        | Pattern adottato (prodotto, ID)                                                                                                                                                                                                                                                                                                                                                                                                             | Prova                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CA-44** Ricorrenza e più date insieme                                | DM: Sessioni › «Nuova serie ricorrente…»: titolo, prima data, ora, fuso, frequenza (ogni settimana / ogni due settimane), quante date (1–10), posti per giocatori, ospiti; anteprima delle date che si aggiorna mentre si scrive; «Programma le date». Dentro una data: «Modifica…» con «Solo questa data» / «Questa e tutte le successive (n)»; «Annulla…» con la stessa scelta; scheda della serie: «Modifica tutte le prossime…», «Termina la serie…», «Annulla l’ultima modifica (…)»; data annullata: «Ripristina questa data» | 10 sessioni reali a una settimana di distanza, tutte alle 21:00 di Roma anche dopo il cambio d'ora del 25 ottobre (19:00Z → 20:00Z; il distintivo «cambio d’ora» segna solo la prima data dopo il cambio); la prima data nel passato, più di 10 date, «mensile» e posti 0 sono rifiutati; un'ora locale doppia (02:30 del 25/10) è rifiutata indicando la data. «Solo questa» sposta una data, le altre nove restano; «Questa e tutte le successive (8)» sposta le date 3–10 alle 20:30 (una nuova data sposta le altre degli stessi giorni), 1–2 invariate; «Annulla l’ultima modifica (orario di 8 date)» riporta le 21:00 come **correzione registrata** (entrambi i passi nella cronologia di ogni sessione); la correzione è rifiutata se una modifica successiva o l'editor del core hanno toccato le stesse date nel frattempo     | Batch fino a 10 solo settimanale o bisettimanale (StartPlaying); ora locale conservata col cambio d'ora; nessuna data nel passato per una nuova serie | StartPlaying cadenza alla creazione (SVC-048) e blocchi fino a 10, solo settimanali o bisettimanali (SVC-049); Discord eventi ricorrenti, modifica di tutte le future (SVC-056); Sesh ora locale costante col cambio d'ora (SVC-060); per la singola data il «Reschedule» di StartPlaying (SVC-053). La scelta «solo questa / questa e le successive» è la forma di Google Calendar: **non ha una riga nel censimento** (limite dichiarato) | test `a weekly batch of ten…`, `createSeries…`, `editing only one date…`, `editing this and following…`, `a correction refuses…`, `cancel one or all following…`, `UI: new-series dialog…`; percorso passi 1, 1b, 1c; `b51-01`, `b51-02`, `b51-07` |
| **CA-45** Salto distinto dall'uscita; dopo uno spostamento si richiede | Giocatore: «La tua presenza» › «Partecipo / Forse / Salto la prossima»; in ogni sessione «Partecipo / Forse / Salto questa»; «Scrivi al DM…»; «Esci dalla campagna…» porta a Membri (B13); palette «Salto la prossima sessione». DM: «Risposta per conto di…» con motivo obbligatorio                                                                                                                                                                                                                                               | Salto registrato; il giocatore resta membro con i suoi personaggi; «Esci dalla campagna…» apre Membri dove l'uscita è il passo separato di B13. Dopo lo spostamento della data 1 la risposta precedente diventa «Da riconfermare» (non conta), con avviso nella riga e notifica B24 «Conferma di nuovo: …»; un cambio del solo titolo non la annulla. **Tre ore prima** dell'inizio «Salto la prossima» è registrato (nessun blocco), con avviso «La sessione inizia fra 3 ore… il DM riceve un avviso» nella riga e nella scheda; il DM riceve in B24 «Giocatore · Livia, Mira salta «…» · A ridosso: mancavano 3 ore · Messaggio: …»; il salto si ritira con «Partecipo» fino all'inizio; dopo l'inizio non si risponde più (contano le presenze). Il messaggio al DM lo leggono solo l'autore e chi organizza, non gli altri giocatori | C23: avviso, non blocco (gruppo gratuito fra amici); una risposta vale solo per l'istante per cui è stata data                                        | StartPlaying «Skipping» separato da «Leave Campaign» (SVC-052) e DM che segna un'assenza (SVC-054); la trappola delle assenze trascinate dopo uno spostamento (SVC-053) è evitata richiedendo la risposta                                                                                                                                                                                                                                   | test `editing only one date…`, `skipping keeps the membership…`, `a message to the DM…`, `UI: answer buttons…`; percorso passi 2a, 2b, 2c; `b51-03`, `b51-04`                                                                                      |
| **CA-46** Posti limitati con lista d'attesa                            | Posti per giocatori nella serie o per data («Modifica…», o «Posti e ospiti…» per una data senza serie); ospiti invitati (Greta Lind, Tomas Ferri, sintetici, gli stessi di B59; «Nuovo ospite»); le loro risposte le registra il DM per conto loro                                                                                                                                                                                                                                                                                  | Con 2 posti occupati «Posti: 2 su 2 · completo»; «Partecipo» del giocatore va in lista d'attesa «(1°)» con avviso; un nuovo ospite si mette dietro, l'ordine non si cambia; quando Tomas «Salta» il posto va al primo in lista (il giocatore) con avviso al DM e notifica B24 «Si è liberato un posto: …» al giocatore; aumentare i posti promuove il successivo; ridurli non sposta chi c'è già. Il registro della sessione mostra ogni passo; i motivi del DM su altre persone non si vedono dal giocatore                                                                                                                                                                                                                                                                                                                              | Coda FIFO non riordinabile; «Forse» non occupa un posto; chi organizza non occupa posti                                                               | Sesh limite con lista d'attesa automatica e messaggio quando si libera un posto (SVC-058); Warhorn FIFO non riordinabile (SVC-009)                                                                                                                                                                                                                                                                                                          | test `seats fill…`, `UI: answer buttons…`; percorso passo 3; `b51-05`, `b51-06`                                                                                                                                                                    |
| **CA-48** Presenze registrate per sessione                             | Da quando la sessione è iniziata: «Presenze da registrare» nel blocco del DM e «Registra presenze…» nella sessione (Presente/Assente e nota per persona, suggeriti dalle risposte); «Correggi presenze…» con motivo obbligatorio; «Versioni precedenti»; «Scrivi resoconto» → il resoconto mostra «Presenze della sessione»                                                                                                                                                                                                         | Dopo 4 ore (orologio del browser spostato): il foglio propone assente chi aveva detto «Salto» e presente il DM; salvato; la correzione senza motivo è rifiutata, con motivo crea la versione 2 e conserva la 1; il resoconto condiviso col gruppo mostra presenti e assenti anche al giocatore, **senza** le note (solo per chi organizza)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Registrare prima dell'inizio è rifiutato; le correzioni non cancellano la versione precedente                                                         | Sesh registro delle risposte e delle modifiche (SVC-061); Quest Portal presenze nel racconto della sessione (VTL-054)                                                                                                                                                                                                                                                                                                                       | test `attendance is suggested…`, `UI: new-series dialog…` (resoconto); percorso passo 4; `b51-08`, `b51-09`, `b51-10`                                                                                                                              |
| **B27 (proposta)** Stelle e desideri a fine sessione                   | Nella sessione più recente già iniziata: DM «Chiedi stelle e desideri…» → Sicurezza › Stelle e desideri (il DM apre la raccolta con il pulsante di B27); poi «raccolta aperta, N risposte»; giocatore «Scrivi stelle e desideri»                                                                                                                                                                                                                                                                                                    | L'offerta compare solo se lo strumento «stelle» è fra quelli concordati (dati B27); la raccolta la apre B27 con i suoi controlli; la riga lo riflette; il giocatore arriva al pulsante di B27                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Facoltativo e anonimo (regole di B27)                                                                                                                 | StartPlaying Stars & Wishes (SVC-076) tramite B27                                                                                                                                                                                                                                                                                                                                                                                           | percorso passo 4; `b51-09`                                                                                                                                                                                                                         |

Trasversali verificati: italiano predefinito e inglese (telefono in EN, fuso di Londra con l'ora
concordata di Roma visibile); tastiera (Invio e Spazio sui pulsanti di risposta, `aria-pressed`,
fuoco che torna al pulsante premuto dopo il nuovo rendering, Ctrl+K); tocco (390×844, `isMobile`,
`hasTouch`); ogni controllo dell'area ≥ 40 px e nessuno scorrimento orizzontale a 1440 e 390; DM e
giocatore (il giocatore non ha i controlli di gestione); reload; senza rete (simulato) la risposta
è rifiutata con «Sei senza rete…» e nulla cambia; l'Undo di gioco non tocca le date (come le
sessioni del core: la sezione è `preserve`, i comandi sono `undoable: false`) e le correzioni sono
comandi espliciti (rispondere di nuovo, «Annulla l’ultima modifica», «Ripristina questa data»,
«Correggi presenze…»). Dadi fisici e digitali: nessun tiro in quest'area.

## Comandi eseguiti ed esito

```sh
cd ~/Workspace/Codex/d20-studio-interview-01
node --test design/blueprint/tests/sessions-plus.test.mjs
# 14 test, 14 pass
node --test design/blueprint/tests/*.test.mjs
# 1437 test, 1434 pass, 3 fail: factions / journal-plus / quests, tutti per
# SyntaxError in design/blueprint/journal-plus.mjs:1925 (area B43 in costruzione, non B51);
# rilanciato due volte con lo stesso esito. Verdi fra gli altri registry-shell, campaign-ui,
# campaign-sessions, notifications, session-view, safety.

cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B51
playwright-cli -s=d20-b51 open http://127.0.0.1:8879/
playwright-cli -s=d20-b51 --raw run-code \
  --filename=~/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/sessions-plus-journey.js
# {"passed": [13 voci], "errors": []}
```

Il percorso usa contesti nuovi (1440×900 Europe/Rome; 390×844 touch Europe/London), svuota lo
stato demo del proprio browser e installa l'orologio di Playwright per far passare 4 ore senza
attendere. Passi verificati (sintesi delle 13 voci restituite):

1. DM: Sessioni › «Nuova serie ricorrente…»: settimanale, 10 date in anteprima, create come
   sessioni ordinarie a una settimana di distanza alle 21:00; i pulsanti del core per la singola
   data non compaiono nelle date della serie.
2. Giocatore: «Salto la prossima sessione» dalla palette; risposte con clic, Invio e Spazio;
   `aria-pressed`; fuoco restituito; nessun controllo di gestione.
3. DM sposta solo la data 1: le altre nove restano; la risposta precedente del giocatore diventa
   «Da riconfermare» con avviso e notifica «Conferma di nuovo».
4. Giocatore «Salto la prossima» a 3 ore: registrato, avvisi, messaggio al DM; notifica al DM con
   «A ridosso: mancavano 3 ore»; «Esci dalla campagna…» apre Membri; il giocatore resta membro.
5. Posti 2: motivo obbligatorio per le risposte per conto d'altri (vuoto rifiutato nella
   finestra); lista d'attesa 1°; posto liberato → promozione FIFO, avviso e notifica; registro.
6. «Questa e tutte le successive (8)» alle 20:30 e «Annulla l’ultima modifica (orario di 8 date)».
7. Reload: tutto conservato.
8. Senza rete: risposta rifiutata, dati invariati.
9. +4 ore: «Presenze da registrare», foglio suggerito, salvataggio, correzione con motivo.
10. Stelle e desideri (B27) offerto, aperto da B27, riflesso nella riga, offerto al giocatore.
11. «Scrivi resoconto» → resoconto per il gruppo con le presenze; il giocatore non vede le note.
12. Desktop: controlli ≥ 40 px, nessun overflow.
13. Telefono EN 390: «Your attendance», «Skip the next one», «Leave campaign…», tocco su
    «Maybe», ora concordata di Roma, ≥ 40 px, nessun overflow.

Immagini (1440×900 salvo il telefono), controllate a vista:

- `b51-01-series-dialog-it-1440.png` — finestra della serie con le 10 date e il cambio d'ora.
- `b51-02-dm-series-it-1440.png` — scheda della serie e prima data con posti e persone.
- `b51-03-player-reask-bell-it-1440.png` — campanella con «Conferma di nuovo».
- `b51-04-player-late-skip-it-1440.png` — «La tua presenza» con l'avviso a 3 ore.
- `b51-05-player-waitlist-it-1440.png` — «In lista d’attesa (1°)», completo.
- `b51-06-player-seat-notice-it-1440.png` — «Si è liberato un posto».
- `b51-07-edit-following-dialog-it-1440.png` — «Questa e tutte le successive (8)».
- `b51-08-attendance-dialog-it-1440.png` — foglio delle presenze.
- `b51-09-attendance-stars-it-1440.png` — presenze corrette e offerta di Stelle e desideri.
- `b51-10-recap-attendance-it-1440.png` — resoconto con «Presenze della sessione».
- `b51-11-phone-en-390.png` — telefono EN.

## Limiti onesti

- **Notifiche di una serie.** B24 deriva una notifica «Nuova sessione» per ogni data: una serie di
  10 date produce 10 righe nella campanella (visibile in `b51-03`). Raggrupparle è lavoro di B24
  (`notifications.mjs`), non toccato qui.
- **Ospiti simulati.** Greta Lind e Tomas Ferri non hanno un'identità nella dimostrazione: le loro
  risposte le registra il DM per conto loro, con motivo. Un solo giocatore reale (`player`) più il
  DM: la riservatezza del messaggio al DM verso un altro giocatore è provata nei test con un
  membro simulato, non nel browser.
- **Nascondere i pulsanti del core.** Nelle date di una serie «Cambia data» e «Annulla
  appuntamento» del core sono nascosti con CSS (`:has()`) perché «Modifica…» e «Annulla…»
  chiedono l'ambito. Se si cambia comunque una data dall'editor del core (per esempio una data
  non in serie), le risposte vengono richieste di nuovo lo stesso (dipendono dall'istante) e la
  correzione della serie rileva il cambio e rifiuta di sovrascriverlo.
- **Scelta dell'ambito.** «Solo questa data / Questa e tutte le successive» è la forma di Google
  Calendar; nel censimento Discord (SVC-056) permette solo «tutte le future» e StartPlaying
  (SVC-053) solo la singola: la combinazione non ha una riga propria.
- **Orario.** Nessun vincolo ai :00/:30 di StartPlaying (SVC-048): l'ora è libera come negli
  appuntamenti del core. Frequenze mensili o personalizzate non sono in batch, come in StartPlaying
  (SVC-049).
- **Soglia di avviso.** L'avviso scatta sotto le 24 ore (la soglia di StartPlaying, SVC-052)
  e indica le ore rimaste; non blocca mai. Nessun promemoria o invio esterno: i promemoria su
  richiesta restano quelli di B24 (Sesh SVC-064), il feed calendario è di B55.
- **Presenze dal Tavolo.** Il foglio è suggerito dalle risposte, non dalla presenza «Qui/Assente»
  della serata di B14; la serata di B14 si collega comunque alla data di oggi della serie.
- **Stelle e desideri.** La raccolta la apre il DM nella sezione Sicurezza (un clic in più): B51
  non scrive nei dati di B27; la raccolta non è legata a una sessione precisa perché B27 non lo
  prevede.
- Nessun backend, sincronizzazione o autenticazione: tutto è locale a questo browser, come il
  resto della dimostrazione.

## Review and fixes

Revisione indipendente B51-rf · 24/09/2026 · stesso worktree · sessione browser `d20-b51-rf` ·
prove in `~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B51-rf/` (le immagini
`baseline-b51-*` sono il percorso del costruttore prima delle correzioni, `b51-*` e `b51-rf-*`
dopo). Ho verificato la scheda § B51 punto per punto nell'app in esecuzione (DM e giocatore, IT/EN,
tastiera, 390 px, senza rete, reload), le righe di mercato citate, i dati condivisi con Inizio,
B24, B14, B27 e B13, e la collocazione (Campagna → Sessioni, nessun pulsante al Tavolo o nelle
testate: conforme a B61). L'unica modifica condivisa del costruttore (`campaign.mjs`,
`areaBlocks`) è additiva e i test del guscio e della campagna restano verdi. **Io non ho toccato
file condivisi**: solo i file dell'incremento.

### Difetti trovati e corretti (prima il test che fallisce, poi la correzione)

| #   | Gravità | Difetto e riproduzione                                                                                                                                                                                                                                                                                                                                                                                                      | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Prova                                                                                                                                                                            |
| --- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | P2      | **Una data si poteva spostare nel passato.** «Modifica…» → Data di ieri → «Salva modifica»: accettato. La data risultava «iniziata»: risposte chiuse, presenze aperte per una serata mai giocata. Con «Questa e tutte le successive» tre date finivano a settembre, prima della data 1. Anche «Annulla l'ultima modifica» poteva riportare una data a un orario già passato.                                                | `editSessions` controlla ogni data prima di cambiare qualsiasi cosa e rifiuta quelle già passate («la nuova data è già passata. Scegli un momento futuro»). `revertBlocker` rifiuta la correzione se l'orario precedente è passato.                                                                                                                                                                                                                          | test `review: an edit never moves a date into the past…`; percorso, passo «Review: moving a date into the past…»                                                                 |
| R2  | P2      | **Una data ripristinata non richiedeva le risposte.** Il giocatore risponde «Partecipo», il DM annulla e poi «Ripristina questa data». Il messaggio diceva «le risposte si danno di nuovo», ma la vecchia risposta tornava a contare in silenzio: occupava un posto e non arrivava nessun avviso. B24 annuncia invece la data come «Nuova sessione». Lo stesso valeva per «Annulla l'ultima modifica» dopo un annullamento. | Ogni ripristino registra `sessionMeta.reaskAt`. Le risposte date prima non contano più (`why: "restored"`). Nella riga compare «La data era stata annullata ed è di nuovo in programma: conferma di nuovo», e B24 manda «Conferma di nuovo … prima dell'annullamento: rispondi di nuovo». La cronologia registra la nuova richiesta.                                                                                                                         | test `review: a restored date asks for answers again…`; percorso, passo «Review: the DM cancels a date…»; `b51-rf-01`                                                            |
| R3  | P2      | **Warhorn (SVC-009) copiato solo a metà.** A posti esauriti il pulsante diceva ancora «Partecipo». Dopo l'iscrizione in lista d'attesa restava premuto «Partecipo», mentre la riga diceva «In lista d'attesa (1°)». Warhorn invece cambia l'etichetta: «Sign Up To Play» diventa «Join Player Waitlist».                                                                                                                    | A posti esauriti il pulsante dice «Mettimi in lista d'attesa» / «Join the waitlist». Dopo l'iscrizione resta premuto e dice «In lista d'attesa (1°)» / «Waitlisted (#1)». Vale nella riga e nella scheda «La tua presenza».                                                                                                                                                                                                                                  | test `review: a full session offers the waitlist by name…` (IT/EN); percorso, passo sui posti; `b51-05`; telefono `b51-rf-03` (390 px, nessuno scorrimento orizzontale, ≥ 40 px) |
| R4  | P2      | **Le presenze ignoravano il Tavolo (B14).** La serata al Tavolo si collega alla data di oggi della serie e registra chi è presente o assente. Il racconto di B14, che finisce nel resoconto, poteva dire «presente» mentre il registro B51 diceva il contrario, e il foglio non leggeva quel dato.                                                                                                                          | `tablePresence` legge in sola lettura l'ultima serata di B14 collegata a quella data. La proposta segna assente chi aveva detto «Salto» oppure è rimasto assente al Tavolo per tutta la serata. Il foglio mostra per ogni membro «Al Tavolo: presente / assente per tutta la serata — messaggio» e lo dice in apertura. Gli ospiti non stanno al Tavolo: per loro contano solo le risposte. È lo stesso criterio del racconto di B14 (Quest Portal VTL-054). | test `review: the attendance sheet also reads the evening at the Table` (con le funzioni reali di B14); percorso, passo 4; `b51-rf-02`                                           |
| R5  | P3      | Il campo si chiama «Motivo (facoltativo, visibile al gruppo)», ma in Sessioni il giocatore non lo vedeva: il registro lo nascondeva e la riga non lo mostrava. B24 invece lo mostrava.                                                                                                                                                                                                                                      | La riga annullata mostra «Motivo dell’annullamento: …» a tutti i membri. Nel registro il motivo dell'annullamento è visibile a tutti. Gli altri motivi del DM sulle persone restano riservati.                                                                                                                                                                                                                                                               | test `review: a cancellation reason declared visible to the group…`; percorso                                                                                                    |
| R6  | P3      | **Il fuoco da tastiera finiva sul `body`.** Succedeva dopo ogni finestra dell'area (serie, modifica, annullamento, risposta per conto di, messaggio, presenze), dopo «Ripristina questa data» e dopo «Annulla l'ultima modifica»: misurato `document.activeElement` = `BODY`. Inoltre, se una risposta veniva rifiutata (senza rete), il fuoco restava in sospeso e sarebbe saltato al rendering successivo.                | I pulsanti d'azione hanno una chiave `data-sp-focus`. Dopo la chiusura della finestra il fuoco torna al pulsante che l'aveva aperta. Se quel pulsante non c'è più, va al pulsante corrispondente della data, poi alla riga, alla scheda o al blocco (tutti con `tabindex="-1"`). Se il comando viene rifiutato, il fuoco in sospeso si annulla.                                                                                                              | test `review: keyboard focus returns to the opener…`; percorso (risposta per conto di Tomas e ripristino, entrambi da tastiera)                                                  |
| R7  | P3      | La notifica B24 al DM diceva «mancavano 1 ore» o «0 ore».                                                                                                                                                                                                                                                                                                                                                                   | Ora dice «mancava 1 ora» e «mancava meno di un’ora» (e nel registro «a ridosso, mancava …»); in inglese «1 hour» e «less than an hour».                                                                                                                                                                                                                                                                                                                      | test `review: B24 wording of late hours…`                                                                                                                                        |
| R8  | P3      | La finestra della serie diceva sempre «Come alla sessione zero: venerdì sera, ogni due settimane», come testo fisso e qualunque cosa contenesse la traccia della sessione zero di B27.                                                                                                                                                                                                                                      | La finestra cita la nota vera di B27 («Dalla sessione zero · Frequenza e orario: «…»»), letta con i permessi di chi guarda. Se la nota manca, non afferma nulla.                                                                                                                                                                                                                                                                                             | test `review: the new-series dialog quotes the session zero schedule…`                                                                                                           |
| R9  | P3      | Se si annullava un ripristino, la serie restava «attiva» anche se prima era «terminata».                                                                                                                                                                                                                                                                                                                                    | Il ripristino registra lo stato della serie in `summary.seriesStatus`; la correzione lo riporta com'era.                                                                                                                                                                                                                                                                                                                                                     | test `review: a restored date asks for answers again; undoing the restore ends the series again`                                                                                 |
| R10 | P3      | Con SVC-054 il DM può registrare la risposta di un giocatore al suo posto, ma il giocatore non ne era avvisato: vedeva solo «(registrata da DM)» in grigio nella riga.                                                                                                                                                                                                                                                      | Nuova notifica B24 «Risposta registrata per te: «…»», con la risposta, il motivo e «Se non è così, rispondi tu dalla sessione». Resta finché il giocatore non risponde di persona.                                                                                                                                                                                                                                                                           | test `review: B24 wording…`; percorso; `b51-rf-01`                                                                                                                               |

### Non difetti o limiti che restano (con il motivo)

- **Scelta «Solo questa data / Questa e tutte le successive».** Nessuna riga del censimento la
  descrive: è la forma standard dei calendari. Qui unisce i due pattern citati, la modifica di
  tutte le date future di Discord (SVC-056) e lo spostamento di una sola sessione di StartPlaying
  (SVC-053). Non è un'interazione inventata. Suggerisco di aggiungere una riga al censimento
  (compito di chi lo cura).
- **«Nuova serie ricorrente…» è un pulsante a parte e non un campo «Ripeti»** nell'editor degli
  appuntamenti del core. È coerente con StartPlaying, dove si programmano più date insieme dal
  calendario dell'avventura (SVC-049). L'editor del core è un file condiviso.
- **Orari con minuti liberi invece dei soli :00/:30 di StartPlaying; nessun minimo di
  giocatori** (SVC-048). Il vincolo sui minuti è del marketplace e gli appuntamenti del core
  accettano qualunque minuto. Il minimo di giocatori non rientra nell'accettazione della scheda.
- **Uscita dalla campagna.** Se un membro esce (B13), il suo posto si libera. La lista d'attesa però
  avanza solo alla modifica successiva di quella data, perché B13 non emette un evento di uscita a
  cui agganciarsi (P3, limite).
- **Dieci notifiche «Nuova sessione» per una serie.** Il raggruppamento spetta a B24
  (`notifications.mjs`), non a quest'area: limite già dichiarato.
- **«Annulla l’ultima modifica» non chiede un motivo.** Il DM corregge un proprio cambio di
  calendario e la correzione resta registrata come modifica a sé. Il motivo è obbligatorio dove si
  corregge qualcosa che riguarda altri: risposte per conto di un giocatore, presenze.
- I pulsanti del core «Cambia data» e «Annulla appuntamento» sono nascosti con CSS sulle date di
  una serie. Il limite era già dichiarato; nessun file condiviso è cambiato.

### Comandi ed esiti

```sh
cd ~/Workspace/Codex/d20-studio-interview-01
node --test design/blueprint/tests/sessions-plus.test.mjs
# 22 test, 22 pass (14 del costruttore + 8 di revisione; gli 8 fallivano prima delle correzioni)
node --test design/blueprint/tests/*.test.mjs
# 1596 test, 1591 pass, 5 fail tutti in tests/projects.test.mjs (B54 in costruzione).
# Al primo giro i 6 fallimenti erano in tests/offline.test.mjs (revisione B52 in corso) e al
# secondo erano spariti. Area B51 e aree vicine (registry-shell, campaign*, notifications,
# session-view, safety): 252/252.

cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B51-rf
playwright-cli -s=d20-b51-rf --raw run-code \
  --filename=~/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/sessions-plus-journey.js
# {"passed": [15 voci], "errors": []}
```

Il percorso ora scrive in `B51-rf/` e parte con l'orologio fissato a giovedì 8/10/2026 alle 07:50
(Roma). Così la data spostata a 3 ore e la serata al Tavolo aperta 4 ore dopo cadono nello stesso
giorno: la serata B14 si collega a una data solo se è lo stesso giorno. Aggiunte al percorso:

- data nel passato rifiutata nella finestra;
- «Mettimi in lista d’attesa» → «In lista d’attesa (1°)»;
- fuoco di nuovo sul pulsante dopo la risposta per conto di Tomas e dopo il ripristino, entrambi da
  tastiera;
- il giocatore legge il motivo dell'annullamento; la data ripristinata richiede la risposta (riga
  e B24);
- «Risposta registrata per te» per il giocatore;
- al Tavolo il giocatore è assente («Febbre») e il DM avvia la serata, collegata alla data 1;
- il foglio presenze mostra «Al Tavolo: assente per tutta la serata — Febbre».

Controllo a parte a 390 px, sia IT sia EN: etichette della lista d'attesa a capo dentro il
pulsante, 105×83 px, nessuno scorrimento orizzontale (`b51-rf-03`).

File modificati in questa revisione: `design/blueprint/sessions-plus-domain.mjs`,
`design/blueprint/sessions-plus.mjs`, `design/blueprint/tests/sessions-plus.test.mjs`,
`changes/interview-01/blueprint-checks/sessions-plus-journey.js`, questo file.
`sessions-plus.css` non è cambiato. Formattazione Prettier verificata. Il percorso conserva
l'espressione senza punto e virgola finale richiesta dal CLI.
