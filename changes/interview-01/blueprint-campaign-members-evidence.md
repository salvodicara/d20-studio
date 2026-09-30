# B13 — Campagne: creazione, inviti, ingresso e membri: prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`) · sessione
browser `d20-b13` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B13/` (fuori dal checkout).

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B13 (CA-02, CA-49…CA-57, IN-03, IN-05).
Righe di mercato lette: `market-census/foundry.md` (FVT-001, FVT-003, FVT-046),
`roll20-fgu.md` (R20-001, R20-009, R20-045, R20-050, R20-051, R20-052, R20-069, R20-070),
`community-services.md` (SVC-013, SVC-025, SVC-028…SVC-031, SVC-035…SVC-039, SVC-044),
`dndbeyond.md` (DDB-071…DDB-075), `vtt-light.md` (VTL-005, VTL-007, VTL-025, VTL-036,
VTL-039, VTL-040, VTL-046), `campaign-tools.md` (CMP-03). Decisioni rispettate:
I-037/I-038 (co-DM e revoca), I-040 (più personaggi), I-125 (copie indipendenti non
obbligatorie), I-135 (osservatore senza personaggio), I-176 (nessun limite universale a
una campagna), I-177 (passaggio della gestione).

## File

Nuovi, tutti dell'area `campaign-members`:

- `design/blueprint/campaign-members.mjs` — modulo d'ingresso `register(registry)`:
  dominio puro esportato (campagne, link, richieste, ingressi, posti dei personaggi,
  ruoli, trasferimento, cessione di sessione, avvio), interfaccia, dialoghi, 6 contributi
  del registro (pagina `campaigns` che sostituisce quella del core, sezione di campagna
  «Membri», riquadro di Inizio, notifiche, ricerca, comando «Crea campagna»).
- `design/blueprint/campaign-members.css` — solo classi `.cm-*`, token esistenti.
- `design/blueprint/tests/campaign-members.test.mjs` — 23 test.
- `changes/interview-01/blueprint-checks/campaign-members-journey.js` — percorso browser.

File condiviso modificato (una riga additiva, firme invariate): `design/blueprint/app.mjs`,
in `commit()` dopo `store.commit`:
`if (options.newUndoVisit) store.history.length = 0;`. Motivo: il core ha un solo stato
per la campagna corrente e `store.undo` conserva `campaign.members/sessions/polls` della
campagna _attuale_ sopra l'istantanea ripristinata. Un Undo che attraversasse un cambio
di campagna mescolerebbe i membri di «Rovine di Vetro» dentro «Le lanterne di Bruma».
Avviare un'altra campagna (e i comandi di iscrizione che riscrivono schede) apre quindi
una nuova «visita» di Undo, come avviene lanciando un altro gioco in Roll20/Foundry.
`extensions.mjs` elencava già l'area (B13).

## Modello

- **Una campagna corrente alla volta** (Foundry FVT-001/003, un mondo avviato; Roll20
  R20-001 Launch): `state.campaign`, `scenes`, `activeSceneId`, `combat` sono della
  campagna in corso; le altre sono «parcheggiate» in `state.ext["campaign-members"].parked`.
  «Avvia» scambia i due insiemi, quindi Inizio, Campagna (barra laterale, sezioni, Sessioni)
  e Tavolo mostrano davvero la seconda campagna; tornare a «Le lanterne di Bruma» ritrova
  scene, pedine e combattimento identici (verificato con uguaglianza profonda nei test).
  Il cambio è rifiutato durante un combattimento o con tiri in sospeso.
- **Membri** nel record del core (`campaign.members`), così tutti i moduli esistenti
  (contenuti, sessioni, condizioni, riposi, forme) applicano la stessa appartenenza.
  Espellere o uscire toglie davvero l'accesso: Inizio mostra «Nessuna campagna accessibile».
- **Metadati dell'area** (proprietario, immagine, descrizione, etichette, regole fisse
  2024/SRD 5.2.1, approvazione, link, inviti, richieste, posti, ultimo accesso, notifiche,
  trasferimento, cessione, attività) in una sezione di stato `undo: "preserve"`: come il
  core per i membri, l'Undo di gioco non annulla l'amministrazione; le correzioni sono
  comandi espliciti (revoca, riporta a giocatore, riprendi, ripristina, ritira).
- **Stessa scheda in più campagne** (modello del core `campaignIds[]`, I-176/I-125): entrare
  con Mira la collega a «Rovine di Vetro» senza toglierla dalle Lanterne; l'anteprima lo dice.
  Alla creazione della seconda campagna l'appartenenza implicita delle schede d'esempio
  (`campaignIds` assente) viene scritta esplicitamente come `["lanterns"]`.
- **Posti** (chi gioca ogni scheda nella campagna): la scheda resta sempre del proprietario
  (DDB-075); assegnare o reclamare una scheda altrui aggiunge il controllo condiviso
  (`controllers`, I-041); «Disattiva» toglie la scheda da strumenti e mappe di quella
  campagna (le sue pedine lì vengono rimosse), «Riattiva» la riporta.

## Capacità → percorso → prova

| Capacità (censimento)                                               | Percorso nell'app (≤ 2–3 clic)                                                                                                    | Comandi e risultato                                                                                                                                                                                                                                                                                | Regola / fonte                                                                        | Pattern adottato (prodotto + ID)                                                                                              | Prova                                                                                                                                                               |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-02 Creare una campagna (nome, immagine, descrizione, 2024, data) | Campagne → «Crea campagna» (anche palette: comando `campaign-members.create`; riquadro di Inizio)                                 | Dialogo: nome (obbligatorio, 80), immagine PNG/JPG/WebP ≤ 1 MB (file non immagine rifiutato con motivo), descrizione, etichette, regole fisse, prossima sessione con fuso IANA → sessione reale programmata; scena iniziale vuota; il creatore è proprietario e DM                                 | D&D 2024, SRD 5.2.1 EN/IT fissati alla creazione; ora locale via `resolveSessionTime` | Foundry Create World con Next Session (FVT-001); profilo Roll20 (SVC-025); Alchemy crea poi invita (VTL-005)                  | Journey §1–2 (tastiera Invio/Esc, file errato, salvataggio); test «Create World…»; `01-create-dialog.png`, `02-details-invites-link.png`                            |
| IN-03 Elenco campagne attive/archiviate, ultimo accesso, etichette  | Campagne                                                                                                                          | Schede con immagine, ruolo, «In corso», prossima sessione, «Il tuo ultimo accesso», avatar e membri, etichette; filtri Attive/Archiviate/Eliminate (solo se usato), «Le mie etichette» con conteggi, ricerca istantanea                                                                            | —                                                                                     | Roll20 My Games (R20-001); DDB attive/inattive (DDB-071); filtro progetti (CMP-03); stella/cestino Foundry (FVT-003)          | Journey §4, §14; test «My Games…»; `03-my-games-list.png`, `13-phone-en-list.png`                                                                                   |
| Avvio e uso trasversale (Inizio, Campagna, Tavolo)                  | Scheda campagna → «Avvia»; Inizio → «Le tue campagne» → «Avvia»                                                                   | Il Tavolo apre «Scena iniziale»; Inizio mostra «Rovine di Vetro» e l'appuntamento 20:30 creato; barra laterale e «Membri»; ritorno alle Lanterne con 5 pedine intatte                                                                                                                              | —                                                                                     | Mondo avviato Foundry (FVT-001/003); Launch Roll20 (R20-001)                                                                  | Journey §7; test «Launch swaps…», «Real store…»; `07-home-rovine-current.png`                                                                                       |
| CA-49 Link con ruolo, scadenza, usi; cambia dopo l'espulsione       | Dettagli → Inviti                                                                                                                 | Ruolo Giocatore/Osservatore/Co-DM (co-DM: solo proprietario, forzato 1 uso e 48 h), scadenza 1 h–7 g/nessuna, usi 1/5/10/illimitati; URL `#campaigns?tab=join&id=XXXX-XXXX-XXXX` con «Copia»; «Revoca»; espulsione → link giocatore/osservatore sostituiti, i vecchi rifiutati                     | —                                                                                     | Kanka inviti con scadenza/usi/ruolo, mai admin (SVC-038); Roll20 link che cambia al kick e link GM monouso 48 h (SVC-028/029) | Journey §3, §6, §11; test «Invite links…», «Removal…»; `02-…`, `10-removed-unassigned.png`, `14-phone-en-invites.png`                                               |
| CA-50 Approvazione della richiesta d'ingresso                       | Inviti → «Approva ogni ingresso…»; richieste nella stessa scheda, nella campanella e in «Inviti e richieste»                      | Con approvazione l'ingresso resta in attesa (nessuna scheda collegata); «Approva» ricontrolla e applica; «Rifiuta…» con messaggio visibile al richiedente; «Ritira richiesta»                                                                                                                      | —                                                                                     | Owlbear richiesta e approvazione del creatore (VTL-036, SVC-035); chi è espulso deve richiedere di nuovo (SVC-037)            | Journey §8, §11 (approvazione); test «Approval…»; `08-request-denied-inbox.png`                                                                                     |
| CA-51 Pagina d'ingresso a quattro strade                            | Aprire il link (barra indirizzi o «Ho un link d'invito»)                                                                          | Crea (apre il costruttore reale; Inizio offre «Continua l'ingresso»), Da un personaggio pronto (copia indipendente e ricaricata), Reclama (schede non assegnate), Entra con un tuo personaggio; anteprima dei destinatari prima di confermare; secondo uso di un link a 1 uso rifiutato con motivo | —                                                                                     | DDB Join a Campaign a quattro strade (DDB-073, SVC-013); Alchemy riuso/pronti (VTL-025)                                       | Journey §5–6 (scelta Mira da tastiera), §15 (EN, Doran); test «Join page…», «Create from premade…», «UI: …builder…»; `04-…`, `05-…`, `06-…`, `15-phone-en-join.png` |
| CA-52 Personaggi non assegnati, «Reclama», più personaggi           | Dettagli → Personaggi; pagina d'ingresso → Reclama                                                                                | Espulsione → Mira «Non assegnato · prima: Giocatore»; «Riassegna» (DM), «Rendi non assegnato», «Reclama» (giocatore); secondo personaggio con un link a più usi                                                                                                                                    | —                                                                                     | DDB Unassign/Claim (DDB-074); FG più personaggi per giocatore (R20-045, I-040)                                                | Journey §11; test «Removal…», «Join page…» (Livia come secondo personaggio)                                                                                         |
| CA-53 Ruoli DM, co-DM con poteri, giocatore, osservatore            | Dettagli → Membri → «Promuovi a co-DM» (elenco dei poteri nel dialogo e in «Ruoli e poteri»)                                      | Co-DM: sessioni (`canOrganizeSessions`), voci riservate ai DM, inviti/approvazioni/espulsioni, posti; «Trasferisci», «Elimina», «Archivia», profilo, co-DM restano al proprietario; osservatore senza personaggio                                                                                  | —                                                                                     | Roll20 poteri co-GM pubblicati (SVC-030, R20-051); Foundry Assistant GM (SVC-044, FVT-046); TTS spettatore (VTL-046)          | Journey §9–10; test «Roles…»; `09-promote-co-dm-powers.png`                                                                                                         |
| CA-54 Espellere, uscire, disattivare, riassegnare                   | Membri → «Espelli…» (motivo) / «Esci dalla campagna…» (porta via le schede o lasciale); Personaggi → Disattiva/Riattiva/Riassegna | Espulso: perde l'accesso, riceve l'avviso col motivo, link sostituiti; il proprietario non può uscire senza trasferire; disattivare toglie la scheda da strumenti e pedine della campagna                                                                                                          | —                                                                                     | Roll20 Kick/Leave (SVC-031, R20-070); DDB Deactivate (DDB-075); Quest Portal rimuovi/esci (VTL-039); avviso Kanka (SVC-039)   | Journey §11; test «Removal…», «Seats…», «Leaving with sheets…»                                                                                                      |
| CA-55 Trasferire la proprietà con accettazione                      | Gestione → «Trasferisci la proprietà…»                                                                                            | In attesa con «Revoca il trasferimento»; il destinatario accetta o rifiuta da «Inviti e richieste» (e dalla campanella); il vecchio proprietario diventa co-DM e può uscire                                                                                                                        | —                                                                                     | Quest Portal transfer con stato in attesa e revoca (VTL-040); campanella (VTL-007); I-177                                     | Journey §12; test «Transfer…»; `11-transfer-incoming.png`                                                                                                           |
| CA-56 Membri con stato online e ordinamento                         | Dettagli → Membri; sezione di campagna «Membri»                                                                                   | In linea/non in linea (presenza simulata dichiarata), ultimo accesso (solo col consenso se esiste l'area account B29), data d'ingresso, personaggi giocati; ordina per DM prima, nome, ingresso, ultimo accesso                                                                                    | —                                                                                     | Owlbear roster online/offline (SVC-037); Roll20 ordinamento (R20-052); consenso Kanka (SVC-043)                               | Journey §7 (sezione), §10; test «UI: My Games…» (EN)                                                                                                                |
| CA-57 Cedere il ruolo di DM per una sessione                        | Gestione → «Cedi il ruolo di DM per questa sessione…» (solo nella campagna in corso)                                              | Il destinatario controlla davvero le creature della campagna al Tavolo e organizza le sessioni; «Riprendi il ruolo di DM» ripristina esattamente i controllori precedenti                                                                                                                          | —                                                                                     | Owlbear il creatore toglie il proprio ruolo GM (SVC-036)                                                                      | Journey §13 (il giocatore sposta il goblin da tastiera; dopo «Riprendi» «Non controlli questa creatura»); test «Session handover…»; `12-handover-banner.png`        |
| IN-05 Inviti in arrivo con Accetta/Rifiuta                          | Campagne → «Inviti e richieste»; campanella (B24, categoria Inviti); riquadro di Inizio                                           | Inviti di un DM a una persona dell'app (Inviti → «Invita una persona dell'app»), trasferimenti, esiti delle richieste, avviso di rimozione; «Accetta» apre la pagina d'ingresso, «Rifiuta» chiude l'invito; «Segna come letto»                                                                     | —                                                                                     | Quest Portal campanella con mittente e campagna (VTL-007); invito per nome (VTL-039)                                          | Journey §8, §12; test «Direct invitations…», «UI: in-app invitation…», «Notices and search…»                                                                        |

Trasversali: IT predefinito e EN (journey §15 in inglese); tastiera (Invio/Esc sul
dialogo, frecce tra i personaggi, Invio sul Tavolo); tocco a 390 px (tutti i controlli
dell'area ≥ 40 px, nessuno sconfinamento orizzontale a 390 e 1440); rete simulata assente:
ogni comando condiviso è rifiutato con motivo e nulla cambia (test «UI: offline…»);
privacy: un link revocato/scaduto/sostituito non rivela nome né descrizione della campagna
a chi non ne fa parte (test dedicato); il giocatore non vede la scheda Inviti; la ricerca
restituisce solo campagne di cui si è membri.

## Comandi eseguiti

```sh
node --test design/blueprint/tests/campaign-members.test.mjs   # 23/23
node --test design/blueprint/tests/*.test.mjs                   # 861/861, 0 falliti
cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B13
playwright-cli -s=d20-b13 open http://127.0.0.1:8879/
playwright-cli -s=d20-b13 --raw run-code --filename=<checkout>/changes/interview-01/blueprint-checks/campaign-members-journey.js
```

Il percorso restituisce 15 verifiche superate, nessun `pageerror`: (1) tastiera sul dialogo;
(2) creazione con immagine e prossima data, Lanterne invariate; (3) link 48 h/1 uso e Copia;
(4) elenco con filtri, etichette, ricerca e ultimo accesso; (5) ingresso del giocatore con
Mira dopo l'anteprima; (6) secondo uso rifiutato, reload; (7) avvio su Tavolo/Inizio/sezione
e ritorno; (8) approvazione, campanella del DM, rifiuto con messaggio; (9) Undo annulla lo
spostamento del goblin e conserva la promozione; (10) poteri del co-DM; (11) espulsione,
rotazione, vecchio link rifiutato, riassegna/libera/reclama con approvazione; (12)
trasferimento proposto, revocato, riproposto, accettato; (13) cessione della sessione con
controllo reale del goblin e ripresa; (14) archivia/ripristina, reload, niente
sconfinamenti a 1440; (15) EN 390 al tocco: elimina con nome errato poi esatto, Eliminate →
Ripristina, nuovo link, il DM entra con Doran, bersagli ≥ 40 px.

Fixture del percorso (nella cartella delle prove): `glass-ruins-cover.png` (immagine sintetica
generata) e `not-an-image.txt`.

Schermate 1440×900 ispezionate: `01-create-dialog`, `02-details-invites-link`,
`03-my-games-list`, `04-join-four-paths`, `05-join-recipient-preview`,
`06-second-use-refused`, `07-home-rovine-current`, `08-request-denied-inbox`,
`09-promote-co-dm-powers`, `10-removed-unassigned`, `11-transfer-incoming`,
`12-handover-banner`; a 390 (pagina intera): `13-phone-en-list`, `14-phone-en-invites`,
`15-phone-en-join`, `16-phone-en-characters`. Correzioni fatte dopo l'ispezione: pulsanti
singoli nei riquadri allineati a sinistra (non a tutta larghezza), numeri dei contatori in
carattere senza grazie, «Reclama» mostrato solo ai giocatori (i DM usano «Riassegna»),
approvazione non annunciata a chi gestisce la campagna.

## Limiti onesti

- **Identità**: solo le due identità del selettore «Visita come» (Giocatore, DM). La
  «seconda identità» della scheda è il Giocatore rispetto al DM che crea la campagna; non
  esiste una terza persona, quindi «Reclama» da parte di un giocatore diverso dal
  proprietario della scheda è provato solo nei test di dominio (controllo condiviso).
- **Ruoli di campagna e strumenti del core**: Preparazione, strumenti DM del Tavolo, badge
  della barra laterale («Dungeon Master» / «Giocatore · Livia») e «Il tuo personaggio» in
  Inizio seguono ancora l'identità del selettore, non il ruolo nella campagna. Dopo un
  trasferimento o per un co-DM, sessioni, voci riservate, inviti e posti seguono il ruolo;
  Tavolo e Preparazione no (dichiarato nell'elenco dei poteri). La cessione di sessione dà
  un effetto reale al Tavolo tramite il controllo delle creature, non l'intera interfaccia DM.
- **Una campagna corrente per tutto il browser**: nel prototipo lo stato è unico, quindi
  «Avvia» cambia la campagna in corso anche per l'altra identità (come un mondo Foundry). In
  un prodotto con server ognuno aprirebbe la propria. Il registro condiviso del Tavolo
  (`state.log`) resta unico per tutte le campagne.
- **Altre aree**: le sezioni di stato delle altre aree non sono separate per campagna; l'area
  emette `campaign-members:switched` `{from, to}` e chi conserva dati di campagna dovrebbe
  indicizzarli con `ctx.state.campaign.id`. La sezione del core «Impostazioni» dice ancora
  «amministrazione, inviti e trasferimento sono ancora da collegare»: è sostituibile e
  appartiene a B20; qui gli stessi comandi sono in «Membri» e in Campagne → Gestione.
- **Tavolo e appartenenza**: il Tavolo del core non verifica l'appartenenza; un membro
  espulso non ha più percorsi verso il Tavolo di quella campagna (Inizio e Campagna sono
  chiusi) ma un URL diretto `#table` mostrerebbe ancora la mappa corrente (limite preesistente
  del core).
- **Undo**: avviare un'altra campagna e i comandi che riscrivono schede (creazione, ingresso,
  approvazione, posti, espulsione, uscita, cessione) svuotano la pila di Undo della visita;
  i comandi solo amministrativi (link, promozioni, trasferimento, archivio) la lasciano
  intatta e non vengono annullati dall'Undo di gioco.
- **Personaggio pronto**: un solo modello, copia indipendente della scheda d'esempio di
  Doran (fonte `authored-demo`, non un personaggio pronto ufficiale); il catalogo completo è
  di B39. Riattivare una scheda disattivata non ripristina le pedine rimosse.
- **Simulazioni**: presenza «in linea» simulata (solo l'identità attiva); copia negli appunti
  con ripiego a selezione manuale; nessun invio reale di email/notifiche, nessuna scadenza
  che avanza da sola oltre l'orologio del browser, nessuna autorizzazione lato server.
- **Controlli di altre aree osservati, non corretti**: rieseguendo
  `campaign-integration-journey.js` (che passa per `#campaigns` dopo una revoca e non trova
  fughe su questa pagina) il passo successivo fallisce perché la ricerca della chat (B17,
  in costruzione) restituisce un messaggio con il nome riservato; `registry-smoke-journey.js`
  si aspetta l'elenco delle sezioni di campagna senza aree, che ora include anche «Membri»
  e le sezioni delle altre aree.

## Correzioni dopo la review (24/09/2026)

Review: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B13-review/` (script r1…r9).
Ogni rilievo è stato riprodotto (test o browser) prima della correzione. Dove questa
sezione contraddice le sezioni precedenti (file condivisi, Undo, «Limiti onesti» su
Tavolo e registro), vale questa.

| Rilievo                                                                                             | Esito                    | Cosa cambia per chi usa l'app                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Prova                                                                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| P1 · cambiando campagna si leggono chat, registro e materiali dell'altra                            | corretto                 | «Avvia» parcheggia con la campagna anche i suoi dati: chat e forum (B17), materiali, spilli e «visti» (B15), annotazioni (B18), menu pedina (B12), stato di sessione e storie (B14), incontri (B19), tabelle e storico (B25), scorta e bottino (B26), dadi animati (B56), tiri del compendio (B16), impostazioni con ambito «campagna»; e i record del Tavolo: registro con i tiri, riposi e tempo di gioco, tentativi, reazioni, movimenti, tiri d'iniziativa. Una campagna mai giocata parte vuota. Come un mondo Foundry o un gioco Roll20 | Test «Review P1: launching parks…», «real store — logs travel…»; percorso di review §7–8; `r-07-*.png` |
| P1 · chi è espulso o è uscito arriva ancora al Tavolo e alla Preparazione                           | corretto                 | Tavolo e Preparazione della campagna in corso mostrano «Non fai parte di questa campagna» a chi non ne è membro, da qualunque strada (indirizzo, ricerca, palette); nessuna mossa possibile. Vale anche per il DM che ha trasferito la proprietà ed è uscito                                                                                                                                                                                                                                                                                  | Percorso §6 (giocatore espulso, anche via ricerca) e §9 (ex DM); `r-06-*.png`, `r-09-*.png`            |
| P2 · l'Undo di gioco riportava il vecchio nome dopo una rinomina                                    | corretto                 | Il nome della campagna è amministrazione: un Undo annulla la mossa ma tiene il nome nuovo (hook di sezione `afterUndo` del registro, `reconcileAfterUndo`). Rinominare non svuota più l'Undo                                                                                                                                                                                                                                                                                                                                                  | Test «real store…» (mossa, rinomina, Undo); percorso §3                                                |
| P2 · il registro condiviso mostrava l'amministrazione di altre campagne, con il nome                | corretto                 | Ogni comando dell'area (creazione, link, approvazioni, ingressi, espulsioni, ruoli, avvio, accesso al Tavolo) scrive nel registro una riga privata di chi agisce; la storia completa resta in «Attività dei membri»                                                                                                                                                                                                                                                                                                                           | Test «real store…»; percorso §1 e §4 (il giocatore non vede «Campagna segreta del giovedì»)            |
| P2 · «Collega alla campagna» annullava la disattivazione decisa dal DM                              | corretto                 | Una scheda disattivata non si ricollega finché il DM non la riattiva: il comando la rifiuta con il motivo (anche dalla Libreria B21) e la scheda mostra il riquadro «Disattivato in questa campagna». Come DDB-075                                                                                                                                                                                                                                                                                                                            | Test «Review P2: a sheet the DM deactivated…»; percorso §5; `r-05-deactivated-connect-refused.png`     |
| P2 · co-DM, nuovo proprietario e DM di sessione non hanno gli strumenti DM di Tavolo e Preparazione | in parte · deviazione    | Tolta la voce non collegata («Preparare scene… condurre al Tavolo» con l'orologio) dall'elenco dei poteri e corretto il testo del link co-DM: l'elenco ora contiene solo poteri reali. Tavolo e Preparazione restano dell'identità «DM» del selettore: vedi sotto                                                                                                                                                                                                                                                                             | Test «Review P2: the co-DM power list…»                                                                |
| P2 · dopo l'avvio Tavolo e Inizio mostravano Livia, che non è nella campagna                        | corretto                 | Il Tavolo non seleziona mai una scheda fuori dalla campagna in corso: apre sul personaggio che giochi lì (Mira nelle Rovine), altrimenti sulla prima pedina visibile, altrimenti su una tua scheda della campagna. Inizio mostra «Il tuo personaggio» della campagna in corso (Mira; per il DM «la conduci»)                                                                                                                                                                                                                                  | Test «Review P2: Home shows…», «Review P1…» (apre su Mira); percorso §7; `r-07-table-rovine-dm.png`    |
| P3 · un osservatore poteva accettare la proprietà                                                   | corretto                 | Diventare osservatore revoca il trasferimento in attesa; accettare ricontrolla il ruolo                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Test «Review P3: an observer…»                                                                         |
| P3 · la cessione di sessione sopravviveva al cambio di campagna                                     | corretto                 | Avviare un'altra campagna chiude la cessione: le creature tornano ai controllori di prima, riga «ha ripreso il ruolo di DM» nell'attività                                                                                                                                                                                                                                                                                                                                                                                                     | Stesso test                                                                                            |
| P3 · nella campanella l'invito non si poteva rifiutare                                              | corretto con adattamento | La campanella B24 non ha azioni per riga (solo «Apri»): l'invito dice «apri per accettare o rifiutare» e apre la pagina d'ingresso, dove si accetta entrando e c'è «Rifiuta l'invito»                                                                                                                                                                                                                                                                                                                                                         | Test «Review P3: a personal invitation…»; percorso §10; `r-10-invite-decline.png`                      |
| P3 · scegliendo una strada da tastiera il focus tornava in cima                                     | corretto                 | Il focus resta sulla strada scelta; Tab porta alla scelta del personaggio                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Percorso §2                                                                                            |
| P3 · test e Undo                                                                                    | corretto                 | Un comando apre una nuova «visita» di Undo solo se ha davvero cambiato schede, mappe o campagna in corso (confronto prima/dopo); creare, rinominare, promuovere, invitare non toccano più l'Undo di nessuno. Nuovo test statico sulle righe condivise da cui l'area dipende e test sul vero `createStore` passando dai comandi dell'area                                                                                                                                                                                                      | Test «real store…», «the shell keeps the B13 hooks…»                                                   |

**Deviazione (P2 co-DM al Tavolo).** Nel core `ctx.role` è insieme l'identità
(proprietario di schede, destinatario di sussurri, appunti «Solo io», piani privati) e il
ruolo di gioco (`role === "dm"` in `table.mjs`, `preparation.mjs`, `table-spatial.mjs`,
`combat-ui.mjs`, `app.mjs`). Dare gli strumenti DM al Giocatore facendolo passare per
«dm» gli mostrerebbe i dati privati dell'identità DM; togliere gli strumenti al
proprietario durante la cessione mostrerebbe al DM le schede private del Giocatore. Tutte
e due le strade violano la regola sui dati privati. Serve una separazione nel core
(`identità` e `ruolo di gioco` distinti) fuori dall'area B13. Oggi funzionano per ruolo di
campagna: sessioni, voci riservate, inviti, approvazioni, espulsioni, posti; la cessione
dà il controllo reale delle creature al Tavolo.

**File condivisi toccati** (aggiunte piccole, firme invariate; la riga `newUndoVisit` di
`app.mjs` resta quella di prima):

- `app.mjs`, `commit()`: `options.afterCommit(store.state)` e `store.persist()` dopo gli
  eventi e prima del render. Serve all'avvio: dentro un commit il registro è in sola
  aggiunta (lo store lo ricostruisce), quindi lo scambio dei registri avviene subito dopo.
- `app.mjs`, `render()`: Tavolo e Preparazione chiusi a chi non è membro della campagna
  in corso (più la sola reindentazione, per Prettier, della catena che segue).
- `table.mjs`: import di `isCampaignActor` e selezione iniziale limitata alla campagna in
  corso.
- `character-access.mjs`, `connectCharacterToCampaign`: rifiuto con motivo se il posto è
  disattivato nella campagna.

**Nell'area**: `CAMPAIGN_SCOPED_SLICES`, `CAMPAIGN_SCOPED_CORE`, `completeLaunch`,
`playedBy`, `isDeactivated`, `reconcileAfterUndo`; widget di Inizio `summary`
(sostituisce il blocco del core solo quando Livia non è nella campagna in corso);
riquadro di scheda `campaign-members-deactivated`; percorso
`changes/interview-01/blueprint-checks/campaign-members-review-journey.js`.

**Comandi eseguiti**

```sh
node --test design/blueprint/tests/campaign-members.test.mjs   # 31/31
node --test design/blueprint/tests/*.test.mjs                   # 1174/1174
cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B13
playwright-cli -s=d20-b13 --raw run-code --filename=<checkout>/changes/interview-01/blueprint-checks/campaign-members-journey.js         # 15/15
playwright-cli -s=d20-b13 --raw run-code --filename=<checkout>/changes/interview-01/blueprint-checks/campaign-members-review-journey.js  # 11/11
```

La prima esecuzione della suite completa aveva 18 fallimenti in `handouts`, `help`,
`home`, `session-prep`, `token-menu`: file modificati da altri costruttori in quel
momento; la seconda esecuzione è pulita. Per le modifiche condivise a Tavolo e shell sono
stati rieseguiti anche `core-journey.js`, `gestures-and-views.js` e
`companion-map-journey.js` (copie in `B13/guard-core/` che salvano lì le schermate):
tutti superati, nessun `pageerror`.

Schermate 1440 ispezionate: `r-05-deactivated-connect-refused`,
`r-06-removed-player-table`, `r-07-table-rovine-dm`, `r-07-player-rovine-log` (Mira
selezionata, chat e registro vuoti nelle Rovine), `r-09-exdm-preparation`,
`r-10-invite-decline`; a 390: `r-11-phone-home-summary` (nessuno sconfinamento,
bersagli ≥ 40 px).

**Limiti che restano**

- L'elenco dei dati per campagna è in quest'area: un'area futura con dati di campagna
  non indicizzati per campagna va aggiunta a `CAMPAIGN_SCOPED_SLICES` (o indicizza per
  `campaign.id`; riceve comunque `campaign-members:switched`). Restano condivisi di
  proposito: libreria dei media (come l'archivio file di Foundry e gli asset di Owlbear),
  libreria dei personaggi, segnalibri e schermo del compendio, preferenze, account, Inizio,
  scorciatoie, e le aree già indicizzate per campagna (impostazioni, sicurezza, comunità,
  assistente).
- Una campagna corrente per tutto il browser: «Avvia» cambia la campagna anche per l'altra
  identità (dichiarato sopra).
- Il DM in una campagna nuova senza pedine né personaggi vede lo stato vuoto del core
  «Nessuna creatura visibile sulla scena»; prepara la scena da Campagna → Preparazione.
- Il badge della barra laterale «Giocatore · Livia» è ancora fisso nel core.
- «Collega alla campagna» resta visibile per una scheda disattivata (in `characters.mjs`
  e nella Libreria B21, non toccati): premendolo si riceve il rifiuto con il motivo, e la
  scheda lo spiega nel riquadro.

## Review fixes — seconda review (24/09/2026)

Review: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B13-review/round2/probe/`
(script p2, p4, p7, p9, p10–p13). Ogni rilievo è stato verificato leggendo i punti di
codice indicati e rifacendo i passi degli script della review nel nuovo percorso
`campaign-members-review2-journey.js` e nei test «Review 2 …». Dove questa sezione
contraddice le sezioni precedenti (righe CA-53 e CA-57, «Una campagna corrente per tutto il
browser», Undo, badge), vale questa.

| Rilievo                                                                           | Esito                                | Cosa cambia per chi usa l'app                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Prova                                                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 · posto e ruolo non contavano al Tavolo (osservatore o scheda «Non assegnato») | corretto                             | Nella campagna in corso una scheda giocabile si controlla solo dal suo posto: l'osservatore non controlla nessun personaggio (I-135), una scheda non assegnata aspetta «Reclama» (DDB-074) anche se è del suo proprietario. Il Tavolo non la muove più, la scheda dice «Consultazione» e spiega il motivo con «Reclama» quando serve; Inizio mostra «Segui questa campagna senza personaggio» o «Nessun personaggio assegnato a te»; il badge della barra laterale dice «Osservatore»                  | Test «Review 2 P1: an observer or an unassigned owner…»; percorso r2 §1; `r2-01-observer-table.png`, `r2-01-observer-sheet.png`               |
| P1 · «Cedi il ruolo di DM per una sessione» non cedeva il ruolo di DM             | non soddisfatto · comando rinominato | Accettazione (7) e CA-57 **non sono soddisfatte**. Il comando ora dice quello che fa: «Affida le creature per questa sessione…». Chi le riceve muove e fa agire le creature della campagna al Tavolo e organizza le sessioni; il dialogo, la sezione «Creature per la sessione» e il banner dicono che combattimento, scene e preparazione restano al DM; «Riprendi le creature» / «Restituisci le creature»; attività e badge «Muove le creature». Vedi la deviazione sotto                           | Test «Review 2 P1/P3: the owner entrusts creatures…»; percorso r2 §3 e percorso B13 §13; `r2-03-entrust-banner.png`, `12-handover-banner.png` |
| P1 · chi è espulso vedeva la mappa dalla vista spettatore `#session-view-display` | corretto                             | Anche la vista spettatore della campagna in corso (B14) è solo per i membri: chi è stato espulso o è uscito vede «Non fai parte di questa campagna», come su Tavolo e Preparazione (Roll20 SVC-031). Il DM continua a vederla                                                                                                                                                                                                                                                                          | Percorso r2 §6; `r2-06-removed-spectator.png`; test statico degli hook; percorso B14 rieseguito (13 blocchi)                                  |
| P2 · il co-DM non aveva i poteri da co-GM                                         | in parte · deviazione aperta         | Un co-DM (e il proprietario dopo un trasferimento) muove e fa agire le creature della campagna in corso al Tavolo (Roll20 SVC-030, Foundry Assistant GM SVC-044) e avvia la campagna; le creature private del DM restano private. L'elenco dei poteri lo dice. Preparazione e strumenti DM del Tavolo (combattimento, scene, schermo, sessione) restano dell'identità «DM»: **non contato come consegnato**, stessa causa della cessione                                                               | Test «Review 2 P2: a co-DM moves the campaign creatures…»; percorso r2 §2                                                                     |
| P2 · un giocatore poteva «Avvia» un'altra campagna per tutti                      | corretto                             | Solo il DM o un co-DM avvia una campagna (Foundry FVT-001/003: il GM avvia il mondo, i giocatori entrano in quello in corso); il comando rifiuta gli altri con il motivo. Giocatori e osservatori vedono «Non in corso: la avvia il DM, poi entri al Tavolo da qui» sulla scheda campagna e nel dettaglio, e «Dettagli» nel riquadro di Inizio; «Entra al Tavolo» resta sulla campagna in corso                                                                                                        | Test «Review 2 P2: only a DM or co-DM launches…» e «Review P1: launching parks…» (aggiornato); percorso r2 §5; `r2-05-player-waiting.png`     |
| P2 · chi è stato espulso continuava a modificare la scheda rimasta nella campagna | corretto (variante b)                | Una scheda che resta in una campagna da cui il proprietario è uscito o è stato espulso è in sola consultazione per lui: niente «Riposa», «Correggi valori», «Avanza di livello», nessuna riga nel registro condiviso; il riquadro spiega che il DM può riassegnarla o toglierla dalla campagna. Il DM non si prende mai la scheda (DDB-075): riassegnarla dà il controllo al nuovo giocatore; «Disattiva» la toglie dalla campagna e la restituisce intera al proprietario                             | Test «Review 2 P2: a removed owner cannot edit…»; percorso r2 §6; `r2-06-removed-sheet.png`                                                   |
| P2 · un comando di iscrizione svuotava l'Undo di tutti                            | corretto                             | Entrare, reclamare, assegnare, disattivare, espellere o creare una campagna non tolgono più l'Undo a nessuno: quello che il comando ha cambiato sulle schede (nuove schede, campagne, controllori, proprietario) e le pedine tolte dalla mappa vengono riapplicati alle istantanee dell'Undo. Esempio: il DM sposta il goblin, il giocatore entra nelle Rovine con Mira, il DM preme «Annulla ultima modifica»: il goblin torna indietro e Mira resta nelle Rovine. Solo «Avvia» apre una nuova visita | Test «Review 2 P2: membership commands keep everyone's Undo…», «…membership delta replays…»; percorso r2 §4                                   |
| P3 · senza rete la casella dell'approvazione restava spuntata                     | corretto                             | Se il cambio è rifiutato la casella torna com'era, con il messaggio                                                                                                                                                                                                                                                                                                                                                                                                                                    | Stesso test P1/P3; percorso r2 §7; `r2-07-offline-approval.png`                                                                               |
| P3 · badge fisso, focus dopo «Avvia», gruppo di scelte senza nome                 | corretto                             | Il badge della barra laterale nomina ruolo e personaggio della campagna in corso («Giocatore · Mira» nelle Rovine, «Osservatore», «Co-DM · Livia»); dopo «Avvia» o «Entra al Tavolo» il focus va al contenuto del Tavolo (`#content`); le scelte della pagina d'ingresso sono un gruppo con nome («I tuoi personaggi», «Personaggi da reclamare», «Personaggi pronti»)                                                                                                                                 | Percorso r2 §1, §4, §5                                                                                                                        |

**Deviazione aperta (accettazione 7, CA-57, e poteri del co-DM in CA-53).** Nel core
`ctx.role` è insieme l'identità (sussurri, appunti «Solo io», schede private) e il ruolo di
gioco (`role === "dm"` in circa 330 punti di 40 moduli: Tavolo, Preparazione, strumenti delle
aree). Una vera cessione in stile Owlbear (SVC-036: il creatore toglie a sé il ruolo GM) e
il co-DM completo di Roll20/Foundry richiedono una separazione nel core: un controllo di
gioco, per esempio `isGameMaster(ctx)` (proprietario, co-DM o destinatario della cessione)
esposto dal registro, usato da Tavolo, Preparazione e strumenti delle aree, mentre i dati
privati restano legati all'identità. È fuori dai file di B13 e resta da fare. Fino ad allora:
CA-57 non è soddisfatta, CA-53 è parziale (sessioni, voci riservate, inviti, posti, avvio e
creature al Tavolo sì; Preparazione e strumenti DM del Tavolo no).

**Perché non si sposta la proprietà (variante a del rilievo sulla scheda).** Spostare la
proprietà a chi reclama o riceve la scheda di un membro uscito contraddirebbe DDB-075 (il
DM non si prende la scheda) e toglierebbe la scheda anche dalle altre campagne in cui il
proprietario la gioca ancora (stessa scheda in più campagne, I-176). La regola scelta: il
posto decide nella campagna in corso; una scheda fuori dalla campagna in corso serve al
proprietario solo se ha un posto in una delle sue campagne. Esempio: il giocatore espulso
dalle Lanterne non modifica Livia (solo nelle Lanterne) in nessuna campagna; Mira, che è
anche nelle Rovine dove lui gioca, resta sua da giocare quando sono in corso le Rovine.

**File condivisi toccati** (aggiunte piccole, firme invariate):

- `character-access.mjs`: `canControlActor` richiede, per un personaggio giocabile e non
  privato, il posto nella campagna (`playsFromSeat`, `seatedIn`, letti dalla sezione di
  stato di B13 quando c'è; senza posti vale il proprietario membro); `canViewActor` e
  `canControlActor` danno le creature della campagna in corso a co-DM e proprietario
  (`runsCampaignCreature`). L'identità «dm» resta com'era.
- `app.mjs`: (1) dopo `newUndoVisit`, `options.rebaseHistory` applicato a ogni istantanea
  della pila (e commento aggiornato: la nuova visita è solo per il cambio di campagna);
  (2) il blocco «Non fai parte di questa campagna» vale anche per `session-view-display` e
  viene prima delle pagine delle aree (`outsider`, `routeSlot`); (3) `playerBadge()` per il
  badge della barra laterale.

**Nell'area**: `seatBlock`, `renderSeatNotice` e riquadro di scheda
`campaign-members-seat`; `launchControl` e rifiuto in `launchCampaign`;
`membershipDelta`/`applyMembershipDelta` e nuovo `shared()`; `focusTable`; etichette del
gruppo di scelte; testi della cessione; due poteri reali nell'elenco del co-DM;
`.cm-waiting` in `campaign-members.css`. Nuovo percorso
`changes/interview-01/blueprint-checks/campaign-members-review2-journey.js`; nel percorso
B13 il §13 usa i nuovi nomi dei pulsanti.

**Comandi eseguiti**

```sh
node --test design/blueprint/tests/campaign-members.test.mjs   # 38/38
node --test design/blueprint/tests/*.test.mjs                   # 1251/1251
cd ~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B13
playwright-cli -s=d20-b13 --raw run-code --filename=<checkout>/changes/interview-01/blueprint-checks/campaign-members-review2-journey.js  # 9/9
playwright-cli -s=d20-b13 --raw run-code --filename=<checkout>/changes/interview-01/blueprint-checks/campaign-members-journey.js          # 15/15
playwright-cli -s=d20-b13 --raw run-code --filename=<checkout>/changes/interview-01/blueprint-checks/campaign-members-review-journey.js   # 11/11
```

Per le modifiche a `character-access.mjs` e `app.mjs` sono stati rieseguiti anche
`core-journey.js`, `gestures-and-views.js`, `companion-map-journey.js` e
`session-view-journey.js` (copie in `B13/guard-core/` che salvano lì le schermate): tutti
superati, nessun `pageerror`. Le prime esecuzioni della suite completa avevano fallimenti
transitori in `notifications`, `decks` e `media`, file che altri costruttori stavano
modificando; l'ultima esecuzione è pulita.

Schermate ispezionate: a 1440 `r2-01-observer-table`, `r2-01-observer-sheet`,
`r2-03-entrust-banner`, `r2-05-player-waiting`, `r2-06-removed-sheet`,
`r2-06-removed-spectator`, `r2-07-offline-approval`; a 390 `r2-08-phone-sheet-notice`,
`r2-08-phone-list` (nessuno sconfinamento, bersagli ≥ 40 px).

**Limiti che restano**

- Deviazione identità/ruolo di gioco descritta sopra (CA-57 non soddisfatta, CA-53
  parziale).
- La Libreria B21 («Gestisci personaggio») offre ancora al proprietario uscito le azioni
  da proprietario sulla sua scheda rimasta nella campagna (lascia, rilascia, trasferisci,
  copia, elimina). Sono diritti di proprietà coerenti con DDB-075 e appartengono a B21; un
  suo comando condiviso finirebbe nel registro della campagna in corso.
- Il riquadro «Sola consultazione in questa campagna» compare tra le sezioni delle aree,
  sotto i blocchi del core; in cima la scheda dice già «Consultazione · modifiche riservate
  ai controllori».
- La riapplicazione all'Undo copre le schede e le pedine della campagna in corso, cioè
  quello che i comandi dell'area cambiano nello stato del core; membri, sezione dell'area e
  campagne parcheggiate erano già conservati.
