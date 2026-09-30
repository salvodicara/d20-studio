# B30 — Inizio completo, primi passi, aiuto e novità: prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`) · sessione
browser `d20-b30` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B30/` (fuori dal checkout).

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B30 (IN-04, IN-06, IN-07, IN-08, IN-09,
IN-11, IN-12, SV-47, SV-48, SV-49, SV-51, SV-52). Righe di mercato lette:
`roll20-fgu.md` (R20-002, R20-003, R20-012, R20-036, R20-049, R20-199, R20-204),
`vtt-light.md` (VTL-002, VTL-003, VTL-004, VTL-005, VTL-215), `crpg.md` (CRP-001, CRP-005),
`foundry.md` (FVT-002, FVT-004, FVT-005, FVT-006, FVT-007), `dndbeyond.md` (DDB-005,
DDB-007, DDB-011, DDB-068, DDB-191, DDB-212, DDB-217), `community-services.md` (SVC-047,
SVC-152, SVC-178), `campaign-tools.md` (CMP-02, CMP-05, CMP-06). Contratto di pagina:
`docs/interview/pages/start.md`.

## File

Nuovi, tutti dell'area `home`:

- `design/blueprint/home.mjs` — modulo d'ingresso `register(registry)`: pagina `home` che
  sostituisce quella del core (`replaces: true`), riquadro `appointment` che sostituisce
  quello del core, tre riquadri di Inizio (`home-levelup`, `home-work`, `home-recent`),
  servizio «?» nell'intestazione (`home-help`), suggerimento nel Tavolo (`table-panel`
  `home-tip`) e nella scheda (`sheet-section` `home-tip-sheet`), impostazioni personali
  `home-tips` e `home-previews`, notifiche d'anteprima, ricerca, 8 comandi, eventi
  `navigate`/`role-changed`/`reset`/`language-changed`/`offline-changed`/`commit`. Sezione
  di stato `state.ext.home` v2 (solo l'esempio «Inizia qui»), `undo: "preserve"`.
- `design/blueprint/home-domain.mjs` — dominio puro (nessun DOM).
- `design/blueprint/home-ui.mjs` — pagina Inizio e riquadri.
- `design/blueprint/help.mjs` — novità, suggerimenti, tour, aiuto della pagina.
- `design/blueprint/home-support.mjs` — stato del servizio, diagnostica, segnalazione,
  installazione, anteprime.
- `design/blueprint/home.css` — solo classi `.home-*`, token esistenti.
- `design/blueprint/tests/home.test.mjs` (24 test), `tests/help.test.mjs` (10 test),
  `tests/home-harness.mjs` (ambiente di prova condiviso: store e registro veri, doppio
  DOM ad albero).
- `changes/interview-01/blueprint-checks/home-journey.js` — percorso browser (13 gruppi).
  La scheda indicava `home-help-journey.js`; il nome segue l'incarico ricevuto.

File condiviso modificato (aggiunta, nessuna firma cambiata): `design/blueprint/ui.mjs`,
una voce `help` nella mappa `paths` delle icone (il glifo «?» del pulsante d'aiuto FG
R20-012; senza, `icon("help")` ricadeva sul libro). Nessun'altra modifica a file
condivisi; `extensions.mjs` elencava già l'area.

## Modello e scelte

- **Dati personali, per identità, sul dispositivo.** Primi passi (`welcome`), novità lette,
  suggerimenti archiviati, avanzamento dei tour e segnalazioni preparate stanno nel
  «libro» personale del dispositivo (`localStorage` `d20-studio-home:v1`, `help.mjs`), per
  identità, come i segni di lettura di B24/B17: nessun commit, quindi nulla nel registro
  di gioco condiviso, funziona senza rete e l'Undo di gioco non lo tocca. Ognuno ha la sua
  correzione esplicita (non letta, Ripristina suggerimenti, Ricomincia/Ripristina tutti i
  tour, Mostra di nuovo i primi passi, Elimina la segnalazione). Solo l'esempio «Inizia
  qui», che crea record veri (nota, scheda, scena, PNG, handout), resta nello stato di
  gioco: `state.ext.home.identities[ruolo]` v2 con `starter` e `removed`, corretto da
  «Rimuovi l'esempio». L'altra identità non vede nulla di questi dati. I personaggi aperti di recente (DDB-068) sono dati del
  dispositivo (`localStorage` `d20-studio-home-recent`), per identità, azzerati da
  «Ripristina esempio».
- **Inizio del core conservato.** Titolo «La prossima avventura», blocchi `.resume-scene`
  (un solo «Entra al Tavolo», un solo «Apri campagna»), `.home-bottom` (Livia,
  resoconto), `.campaign-entry` e lo stato vuoto senza campagna hanno lo stesso markup;
  i riquadri di altre aree (B13, B29, B59…) sono resi con `registry.merge("home-widget")`
  e legati con `bindSlots`. I percorsi esistenti `core-journey`, `campaign-world-journey`,
  `campaign-members-journey` (ora «20:30» arriva dal riquadro sostituito) e
  `session-view-journey` passano nella mia sessione.
- **Nuova identità.** Le identità della dimostrazione sono due e hanno già contenuti.
  «Nuova» è quindi calcolata dai dati (`isNewIdentity`: nessuna scheda propria, nessuna
  campagna, nessuna nota o bozza): allora le tre strade sono il contenuto principale e non
  si nascondono. Per le identità d'esempio le stesse tre strade compaiono al primo
  arrivo come «Primi passi», chiudibili (Roll20 R20-002 «explicit close»).
- **Tasto d'aiuto: F1.** Il tasto «?» appartiene già alla guida alle scorciatoie della
  palette (B23, caricata prima): usarlo avrebbe prodotto un conflitto nel rapporto. F1 è
  il tasto d'aiuto convenzionale; il pulsante «?» resta nell'intestazione.
- **Suggerimenti come scheda BG3 non modale.** Il suggerimento è una scheda flottante
  (`aside`, regione `polite`, nessun furto del fuoco, Esc la chiude): nel Tavolo occupa
  l'angolo della mappa che non copre pedine né comandi (dopo la revisione 2), nella scheda
  del personaggio sta accanto all'intestazione; sul telefono è ancorata in basso. Non
  blocca il gioco: i clic arrivano alla mappa.
- **Livello 4, non 2.** La scheda cita «Mira può salire al livello 2»; nello stato Mira è
  druida di 3° livello, quindi il segnale coerente è «livello 4» (2.700 PE, SRD 5.2.1).

## Capacità → percorso → prova

| Capacità (ID) | Percorso nell'app | Comandi ed esito | Regola / fonte | Pattern adottato (prodotto, ID) | Prova |
| --- | --- | --- | --- | --- | --- |
| IN-07 Primo avvio con tre strade | Inizio › Primi passi (1 clic) | «Crea un personaggio» apre una bozza privata del builder; «Crea una campagna» esegue il comando B13 (dialogo di creazione); «Entra con un invito» → Campagne; DM con campagna: «Prepara una mappa» → Preparazione; «Prova l'esempio». «Nascondi i primi passi» → riaperti da Guide › «Mostra di nuovo i primi passi». Identità senza nulla: «Benvenuto in d20 Studio», non chiudibile | start.md «Primo uso senza contenuti» | Roll20 Quick Start a tre strade con chiusura esplicita (R20-002); Alchemy rapido/personalizzato (VTL-005); Foundry avventura iniziale (FVT-004/005) | test «first steps…», «new identity…»; percorso gruppi 1 e 11; `01-home-first-steps.png`, `15-new-identity.png` |
| IN-08 «Inizia qui» modificabile, mai condiviso | Primi passi › «Prova l'esempio» (1 clic, anche da tastiera) | Giocatore: nota «Inizia qui» (Solo io, senza campagna: guida rapida, modello di appunti di sessione, spiegazione dell'esempio, collegamento alla scheda) + scheda privata «Tessa (esempio)», premade scritta per la prova (guerriera umana di 1° livello, Soldato, righe SRD 5.2.1; mai copia di un'altra scheda), «Personale» anche nella libreria B21. DM: nota + scena di prova nascosta copiata dalla scena attiva, senza pedine. La nota si modifica con l'editor ordinario (revisione 2, sempre privata). Il DM non vede nota né scheda del giocatore; il giocatore non vede la scena del DM. «Rimuovi l'esempio» elenca prima le conseguenze e toglie solo ciò che è ancora esempio (una scheda collegata, una nota condivisa o in modifica restano) | ACL delle note (`campaign-content.mjs`), `character-access.mjs` | Owlbear GM Vault «Start Here» modificabile, nulla condiviso senza scelta (VTL-003); demo per ruolo Alchemy (VTL-004); vault/template d'esempio (CMP-02, CMP-06) | test «Start here (player/DM)», «Remove the example», «UI: Try the example…»; percorso gruppo 1; `02-start-here-ready.png`, `03-dm-home.png` |
| IN-04 Prossima sessione con conto alla rovescia | Inizio › «Prossimo appuntamento» (0 clic) | La sessione più vicina tra tutte le campagne dell'identità (corrente + parcheggiate da B13): «tra 2 giorni e 16 ore», ora locale con fuso («(la tua ora)»), ora concordata nel fuso di chi l'ha fissata; le altre campagne sotto, ciascuna con conto alla rovescia. Aggiornamento ogni 30 s. Giocatore: solo le campagne di cui è membro. Sessione annullata o passata: mai «prossima». Campagna parcheggiata: «Dettagli della campagna» | istante + fuso IANA di `campaign-sessions.mjs` | Foundry join page con data (FVT-002); Roll20 Next Game nel fuso del visitatore (R20-049, SVC-047) | test «next session across two campaigns», «countdown text»; percorso gruppo 2 (21:00 Roma; 19:00 New York mostrata come 01:00 locale); `04-next-sessions-two-campaigns.png` |
| IN-06 Lavoro incompleto con «Riprendi» | Inizio › «Da riprendere» (1 clic) | Bozze private dell'identità: builder (tipo, nome, **sezione**, «salvata questo minuto»), Biblioteca, note/voci, sessioni. «Riprendi» apre la bozza alla stessa sezione (`builder?id=…&tab=class`), dopo reload. Mai le bozze di un'altra identità; nessun riquadro vuoto | bozze private di `character-build`, `homebrew`, `campaign-content`, `campaign-sessions` | DDB bozza creata all'ingresso, autosalvataggio (DDB-011, DDB-217); Charactermancer riprendibile (R20-036) | test «work to resume…»; percorso gruppo 3; `06-resume-work.png` |
| IN-12 Segnale di livello e coda | Inizio › «Pronti a salire di livello» (1 clic) | Dopo «Assegna PE e monete» del DM (B26, 1.800 PE a testa): «Livia può salire al livello 4», «Mira può salire al livello 4», barra, «In coda: dopo Livia tocca a Mira». «Avanza» apre la bozza d'avanzamento privata; con bozza esistente diventa «Riprendi» (nessun duplicato). Il DM vede solo le proprie schede. Sulla scheda: suggerimento «Puoi salire di livello» | Avanzamento del personaggio, SRD 5.2.1 EN 23 / IT 25 (`XP_THRESHOLDS`); PE non registrati = soglia del livello | BG3 barra PE che cambia stato e Level Up in coda (CRP-005) | test «level-up queue…»; percorso gruppo 3; `05-levelup-queue.png` |
| IN-09 Novità in un pannello, non pop-up | Inizio › pannello laterale «Novità» (0 clic) | 7 voci datate (quelle di aree non costruite sono nascoste), 3 in vista e «Novità precedenti». Letta/non letta per voce, «Segna tutte come lette», conteggio sulla scheda; seguire una novità la segna letta e avvia il tour o apre la funzione. Nessuna finestra all'arrivo. Per identità, conservato al reload | — | Roll20 scheda Announcements al posto dei pop-up, tour su richiesta (R20-003); DDB What's New (DDB-007); Kobold+ News (CMP-05) | test «news…», «what's new…»; percorso gruppo 5; `07-whats-new.png` |
| IN-11 App installabile e personaggi recenti | Inizio › Supporto › «Installa l'app sul telefono»; Inizio › «Accesso rapido» | Istruzioni iPhone/iPad (Condividi › Aggiungi alla schermata Home), Android (⋮ › Installa app), computer; piattaforma preselezionata dal browser, pulsanti con `aria-pressed`; app già installata riconosciuta (`display-mode: standalone`). Le schede aperte su questo dispositivo compaiono in «Accesso rapido» e si riaprono; schede rimosse o non visibili escluse; elenco per identità | — | Roll20 Add to Home Screen (SVC-178); DDB widget dei recenti (DDB-068) | test «recent characters…», «install platform…»; percorso gruppi 4 e 7 |
| SV-47 Aiuto «?» per pagina | «?» nell'intestazione di ogni pagina, Tavolo compreso; tasto F1; comando della palette | Dialogo «Aiuto · Tavolo» (pagina, scheda, builder, campagne, campagna, appunti, preparazione, Tavolo, biblioteca; pagine d'area col loro nome): cosa si può fare, «Avvia il tour», «Tour e suggerimenti», «Segnala un problema». «Torna alla pagina», × o Esc: stessa URL, fuoco di nuovo su «?» | — | FG «?» che apre la pagina del manuale (R20-012) | test «page help…», «registration…»; percorso gruppo 6; `09-help-table.png` |
| SV-48 Suggerimenti alla prima occasione, archivio e ripristino | Tavolo (angolo libero della mappa) e scheda (accanto all'intestazione); archivio in Inizio › Guide | Tavolo, turni e iniziativa (combattimento attivo), tiri fisici/digitali (richiesta in sospeso per una tua pedina); scheda, condizioni, livello. Il più specifico vince; «Ho capito» archivia (toast «Inizio › Guide»); «Elenca anche quelli non ancora incontrati»; «Ripristina suggerimenti»; interruttore generale anche in Preferenze. Per identità | — | BG3 tutorial alla prima occorrenza, archivio nel diario con filtro, «Reset Tutorials» (CRP-001) | test «tips…», «roll tip…», «Guides panel…»; percorso gruppo 6; `08-table-tip.png`, `10b-guides-panel.png` |
| SV-49 Tour facoltativi ripristinabili | Inizio › Guide › Tour guidati; dall'aiuto della pagina; dalle novità; palette | Tour Inizio (5 passi), Scheda (5, serve una scheda propria), Tavolo (6). Ogni passo evidenzia un controllo reale (anello + contatore «Passo 2 di 6»), naviga alla pagina giusta; Esc/× o un cambio di pagina non richiesto mettono in pausa salvando il passo; «Riprendi» dal passo salvato, «Ricomincia», «Fine del tour» → Completato, «Ripristina tutti i tour». Telefono: scheda ancorata in basso | — | Foundry Tours con avanzamento e reset (FVT-006); tour Shard al posto del benvenuto (VTL-002); DDB «Watch Tour» (DDB-005) | test «tours…», «a page change…»; percorso gruppi 6 e 9; `10-tour-table.png`, `14-phone-en-tour.png` |
| SV-51 Stato, diagnostica, segnalazione | Inizio › Supporto (1 clic); comandi «Diagnostica» e «Segnala un problema» | Stato: sincronizzazione (simulata), salvataggio locale, aree (pronte/con errori), cronologia degli incidenti (avvisi circoscritti, periodi senza rete o senza salvataggio di questa visita). Diagnostica: archiviazione (byte usati, spazio stimato), rete simulata, versione dei dati e sezioni, versione dell'app, browser e schermo (solo famiglia e versione), riepilogo tecnico copiabile. Segnalazione: cosa è successo / cosa ti aspettavi / allega diagnostica, anteprima dal vivo; email, numeri, nomi degli account (attuali e precedenti), account collegati (Discord), etichette d'accesso e nomi dei membri delle campagne tolti, il modulo dice quali; funziona offline; resta privata nell'elenco, «Copia», «Elimina». Nulla viene inviato | — | DDB status page con cronologia (DDB-191, SVC-152); Roll20 Report a Bug (R20-199); FG log e diagnostica (R20-204); DDB self-help (DDB-212) | test «reports…», «service status…»; percorso gruppo 7; `10c-support-panel.png`, `11-diagnostics.png`, `12-report-preview.png` |
| SV-52 Anteprime facoltative | Inizio › Supporto › Anteprime; Preferenze › Personali | «Novità anche nel centro notifiche» (le non lette entrano nella campanella B24 come avvisi di sistema) e «Inizio compatto». Personali: il DM non le eredita; spente, tutto torna com'era | — | Quest Portal Feature Previews per utente (VTL-215) | test «feature previews…»; percorso gruppo 7 |

## Comandi eseguiti e risultati

Risultati della prima consegna (prima della revisione 2; i numeri attuali sono in
«Review fixes» in fondo).

- `node --test design/blueprint/tests/home.test.mjs design/blueprint/tests/help.test.mjs`
  → **26/26**.
- `node --test design/blueprint/tests/*.test.mjs` → primo passaggio 948/948. Passaggi
  successivi con altre aree in costruzione in parallelo: 1005/1008 (3 falliti in
  `table.mjs:606`, `b.getAttribute is not a function`, poi spariti) e, all'ultimo,
  1030/1032 (2 falliti in `character-library.test.mjs`, area B21 in corso). Nessun
  fallimento tocca file di B30.
- Browser, sessione `d20-b30`, cwd della cartella prove:
  `playwright-cli -s=d20-b30 --raw run-code --filename=…/blueprint-checks/home-journey.js`
  → **11 gruppi superati, 0 errori di pagina** (`home-journey.log`). Il percorso apre i
  propri contesti (IT 1440×900 Europe/Rome; EN 390×844 touch, `isMobile`) e li chiude.
- Regressioni nella stessa sessione: `core-journey.js` 13/13, `campaign-world-journey.js`
  2/2, `campaign-members-journey.js` superato (incluso «Home resume + 20:30
  appointment»), `session-view-journey.js` superato.
- Schermate 1440×900 ispezionate: `01`–`12`, `10b`, `10c`, `15`; telefono `13`
  (pagina intera) e `14`. Correzioni fatte dopo l'ispezione: «Apri sessioni» andava a capo,
  spazio tra stato vuoto e primi passi, spazio sotto il riquadro dell'appuntamento, testo
  della scorciatoia nell'aiuto, righe dei tour nel pannello laterale impilate.

## Per il coordinatore

- `registry-smoke-journey.js` si ferma già al controllo «Area stylesheet linked without a
  loaded area» (scritto quando nessuna area era costruita). Con B30 cambia anche un
  secondo presupposto: Inizio è ora una pagina d'area, quindi `#content > *` è il solo
  contenitore `[data-ext-slot="route:home"]`; l'ordine dei riquadri va letto da
  `#content [data-ext-slot="route:home"] .home-main > *`. I blocchi `.resume-scene` e
  `.home-bottom` restano uno ciascuno.
- `account-journey.js` si ferma a `button("Cerca")`: B23 ha rinominato il servizio di
  ricerca in «Cerca e comandi (Ctrl+K)». Non dipende da B30.
- Il suggerimento del Tavolo compare al primo ingresso di ogni identità in uno stato
  nuovo, anche nei percorsi di altre aree: è una scheda flottante in un angolo libero
  della mappa, non copre comandi né pedine e non riceve il fuoco.

## Limiti dichiarati

- Tutto è locale e simulato: nessun invio della segnalazione, nessuna pagina di stato
  reale, nessun canale di aggiornamento; lo stato del servizio riflette la rete simulata,
  il salvataggio del browser e le aree del registro.
- Il prototipo non ha un manifest d'app: le istruzioni d'installazione sono quelle dei
  sistemi operativi, ma l'icona apre la pagina nel browser (lo dice il pannello).
- Le novità sono scritte nel codice dell'area, non pubblicate da un servizio.
- Il suggerimento del Tavolo sceglie tra quattro angoli della mappa quello che copre meno
  pedine e comandi; se la mappa è piena ovunque ne copre il minimo possibile. Gli altri
  suggerimenti possibili (per ogni meccanica BG3) non sono ancora scritti: ce ne sono sei.
- L'avanzamento dei tour si salva quando il tour si chiude, si mette in pausa o finisce,
  non a ogni passo; un reload durante il tour riprende dall'ultimo passo salvato. Un
  cambio d'identità chiude il tour senza salvare per l'altra identità.
- Il segnale di livello conosce solo i PE registrati (anche corretti a mano dal B26); non
  esiste ancora un «avanzamento per traguardo» concesso dal DM.
- Il gruppo «nuova identità» del percorso usa una fixture esplicita (il giocatore senza
  schede né campagna), perché la dimostrazione ha due sole identità già attive.
- Rimuovere l'esempio cancella la nota solo se è rimasta privata e mai condivisa; la
  cancellazione generale delle note resta a B50 (cestino).

## Review fixes

24/09/2026 · revisione 2 di B30 (prove del revisore in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B30-review/r2/`). Ogni rilievo è stato
riprodotto prima della correzione (test rosso o script del revisore); nessuno è risultato
un non-difetto. Stessa sessione browser `d20-b30`, prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B30/review-fixes/`
(`verify.js`, `verify.log`, `join.js`, schermate `p1-…`, `p2-…`, `p3-…`).

| Rilievo | Riprodotto | Correzione | Prova |
| --- | --- | --- | --- |
| P1 — la scheda di prova «Tessa (esempio)» era una copia della scheda viva del DM (`doran`): un giocatore riceveva una scheda privata o modificata del DM | Sì: DM fa lasciare la campagna a Doran e scrive «Spia del Culto (segreto del DM)»; la Tessa del giocatore mostrava quella classe (`r2/n.js`) | `home-domain.mjs`: nessuna copia di schede vive. `makePracticeCharacter` costruisce una premade scritta (fonte `authored-demo`, revisione `blueprint-b30-tessa-1`): guerriera umana di 1° livello con background Soldato, solo righe SRD 5.2.1 del catalogo (capacità del guerriero di 1° livello, Stile Combattere con armi possenti, tratti umani, talento Aggressore selvaggio), array standard + Soldato (FOR 17, DES 13, COS 15, INT 8, SAG 12, CAR 10), 12 PF (10 + COS), CA 16 (Cotta di maglia), Recuperare Energie 2 usi con i recuperi del profilo di riposo, oggetti SRD dell'opzione A presenti nel catalogo (Cotta di maglia, Spadone, 8 Giavellotti). Stesso risultato se `doran` è privato o non esiste. Pattern: premade DDB/Roll20 | test «practice sheet is an authored premade (review P1)…»; `verify.js` P1 (DM segreto non visibile, `p1-tessa-authored.png`); percorso gruppo 1 (fonte, livello 1, niente `copiedFrom`) |
| P2 — dal pannello di Inizio, «Tour e suggerimenti» (aiuto), «Apri le novità» (palette), risultati di ricerca e riga della campanella non cambiavano pannello se ne era scelto un altro | Sì: Supporto scelto → «?» › «Tour e suggerimenti» lasciava Supporto (`r2/m.js`, `r2/c.js`) | `home.mjs`: una rotta verso Inizio che nomina un pannello (`tab`) azzera la scelta fatta a mano anche partendo da Inizio (`arrivedHome(payload)`); `home-ui.mjs` usa `vista.tab:vista.id` come chiave del fuoco d'arrivo | test «Home → Home with a different tab (review P2)…»; `verify.js` P2 ×3; percorso gruppo 6 (campanella da Inizio › Supporto, «?» › «Tour e suggerimenti» da Supporto) |
| P2 — una novità della campanella tra le «Novità precedenti» restava chiusa | Sì (`r2/c.js` C3) | `home-ui.mjs`: `?tab=news&id=…` apre la sezione precedente, porta la voce al centro e le dà il fuoco (`tabindex="-1"`, contorno `:focus`). `home.css`: il pannello laterale sticky scorre da sé (`max-height` + `overflow-y: auto`, come la barra laterale di Roll20): prima le voci in fondo erano irraggiungibili finché non finiva la colonna principale. Anche i risultati di ricerca delle novità portano l'`id` | stesso test; `verify.js` (voce in vista e a fuoco, `p2-older-news-from-bell.png`); percorso gruppo 6 |
| P2 — Tessa appariva «Solo campagna» in Personaggi e sull'intestazione | Sì (`r2/i.js`) | `home-domain.mjs`: con l'area B21 caricata la scheda nasce con la privacy della libreria `private` tramite l'API B21 `setPrivacy` (+ data di creazione); «Rimuovi l'esempio» toglie anche la riga della libreria; l'Undo di gioco la riporta con la scheda | test P1 (`privacyOf === "private"`, anche dopo Undo; nessuna riga dopo la rimozione); `verify.js` (stesso distintivo di Iria, oggi «Personale»; `p2-characters-tessa-private.png`); percorso gruppo 1 |
| P2 — prova browser non riproducibile e documento superato | Sì: il percorso si fermava al gruppo 6 e, saltato quello, al 9 | Rotta corretta (sopra); il gruppo 9 riparte da un esempio pulito prima della fixture; controlli nuovi nei gruppi 1, 1b, 5 e 6; questo documento corretto (libro del dispositivo, scheda flottante, conteggi) | `home-journey.js` → **13 gruppi superati, 0 errori** (`B30/home-journey.log`) |
| P3 — fuoco sul `body` dopo Esc/×/«Fine del tour» e dopo «Rimuovi l'esempio» | Sì (`r2/l.js` L1, L2, L6) | `help.mjs`: il tour ricorda il controllo che l'ha avviato; alla chiusura esplicita il fuoco torna lì, altrimenti alla riga del tour in Guide, altrimenti a «?». Un cambio di pagina che mette in pausa non sposta il fuoco. `home-ui.mjs`: chiusa la finestra, il fuoco va a «Prova l'esempio» | `verify.js` ×4 (Guide → riga; fine → riga; «?» del Tavolo → «?»; rimozione da tastiera → «Prova l'esempio»); percorso gruppo 5 |
| P3 — il suggerimento del Tavolo copriva la pedina Mira | Sì (`r2/j.js`) | `help.mjs`: scheda BG3 al bordo dell'area di gioco, nell'angolo della mappa (alto a destra, basso a destra, basso a sinistra, alto a sinistra) che copre meno pedine e comandi; telefono invariato (ancorata in basso) | `verify.js` (nessuna pedina o comando coperto, `p3-table-tip-corner.png`); percorso gruppo 1b |
| P3 — il risultato di ricerca «Aiuto su questa pagina» apriva Guide | Sì (`r2/o.js`) | `home.mjs`: tolto quel risultato; «aiuto» resta tra le parole di «Tour e suggerimenti»; l'aiuto della pagina è il comando «Apri l'aiuto di questa pagina» | test «Home small fixes (review P3)…»; `verify.js`, `p3-search-aiuto.png` |
| P3 — piccole incoerenze | Sì, tutte | (a) i primi passi non ripetono «Crea campagna»/«Ho un link d'invito» quando «Le tue campagne» (B13) li mostra già: la strada «campagna» rimanda lì (`data-home-campaign-path="above"`), quella del DM tiene «Prepara una mappa»; (b) «Entra con un invito», quando c'è, porta a Campagne con il fuoco su «Ho un link d'invito» (Invio apre «Apri un link d'invito»); (c) «Mago 4 · Livello 4» → «Mago 4» (etichette di classe del builder con il livello), anche in «Il tuo personaggio»; (d) «Il tuo personaggio» mostra una scheda della stessa identità (Doran per il DM), mai Livia al DM; (e) passo 1 del tour Inizio: sezioni e servizi letti dall'intestazione disegnata («Notifiche e richieste», «Account e profilo»…), titolo «Sezioni e servizi» | test «Home small fixes (review P3)…» e «Home tour step 1…»; `verify.js`; `join.js`; percorsi gruppi 1 e 2 |
| P3 — la segnalazione non toglieva nomi né account collegati; incidenti senza periodi offline | Sì: `custode_bruma` restava; «Nessun incidente» dopo offline/online | `home-support.mjs`: `knownNames(state)` = nomi visualizzati attuali e precedenti (B29), account collegati (Discord), etichette d'accesso, nomi dei membri delle campagne (core e B13), escluse le etichette di ruolo («DM», «Giocatore»); il modulo dice esattamente cosa viene tolto. Cronologia degli incidenti: periodi senza rete (evento `offline-changed`) o senza salvataggio (a ogni commit), con inizio, fine o «in corso» | test «reports remove members' names and linked handles…»; `verify.js` (`p3-incidents.png`) |

File cambiati, tutti di B30: `home.mjs`, `home-domain.mjs`, `home-ui.mjs`, `help.mjs`,
`home-support.mjs`, `home.css`, `tests/home.test.mjs`, `tests/help.test.mjs`,
`tests/home-harness.mjs` (opzione `library` per caricare B21),
`blueprint-checks/home-journey.js`. Nessun file condiviso modificato in questa revisione.
Nuove dipendenze in lettura: `character-library.mjs` (`sliceOf`, `setPrivacy`),
`rest-profile.mjs`, `srd-sample.mjs` (`getById`, `poundsToKg`).

Comandi e risultati:

- `node --test design/blueprint/tests/home.test.mjs design/blueprint/tests/help.test.mjs`
  → **34/34** (home 24, help 10).
- `node --test design/blueprint/tests/*.test.mjs` → 1308/1323; i 15 falliti sono in file di
  altre aree in modifica in parallelo: `command-palette.test.mjs` (test di revisione B23
  scritti prima dell'implementazione; alla riesecuzione successiva erano di più, sempre
  in quel file), `encounter-builder.test.mjs` (`sortParticipants is not defined` in
  `encounter-builder-domain.mjs` delle 08:50) e `annotations.test.mjs` (1). Rieseguito
  tre volte, anche file per file: nessun fallimento in file di B30.
- Browser `d20-b30`: `home-journey.js` **13 gruppi, 0 errori di pagina**;
  `review-fixes/verify.js` **17/17** + `join.js`; regressioni (copie con cartella prove
  `B30/regress/`): `core-journey` 13/13, `campaign-world-journey` 2/2,
  `campaign-members-journey` superato, `session-view-journey` superato,
  `character-library-journey` superato, `command-palette-journey` superato.
  `notifications-journey` (B24) si ferma al passo 5: dopo «Registra tiro», «Torna al gioco»
  lascia aperta la finestra «Tiri e risultati» (`regress/notifications-debug.log`,
  `zz-notif-1.png`). La finestra è di `combat-ui.mjs` (modificato alle 08:33, dopo l'ultimo
  passaggio di B24 alle 08:26); B30 non apre né riapre finestre di dialogo: da verificare
  da chi possiede quel file.

Per il coordinatore:

- `campaign-members.mjs` `createPremadeActor` (B13, «Crea da premade», Brenna) copia ancora
  la scheda viva `doran` senza controllare chi può leggerla: è lo stesso difetto P1 in
  un'altra area. La premade scritta di B30 (`makePracticeCharacter` in `home-domain.mjs`)
  è riutilizzabile.
- Con la revisione il distintivo di privacy B21 per le schede private si chiama
  «Personale»: i controlli di B30 confrontano Tessa con Iria, non con una parola fissa.
